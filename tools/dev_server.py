#!/usr/bin/env python3
"""Local dev server for the game: serves the repo root on 127.0.0.1:8766 (never deployed).
Usage: python3 tools/dev_server.py [port]   then open http://localhost:8766/game/

It also hosts the level editor's save endpoints (localhost only):
  GET  /__room/ping            -> {"ok":true}  (the editor uses this to detect a save server)
  POST /__room/save   {file, room:{id,name,biome,at,grid,ents}, comment}
  POST /__room/delete {file}
Rooms are validated and re-serialized here from data, so no editor-supplied text is ever written as code.
ROOMS_DIR overrides the rooms folder (used by tools/test_rooms.mjs)."""
import functools
import http.server
import json
import os
import re
import sys
import tempfile
import threading
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
ROOMS = os.path.realpath(os.environ.get('ROOMS_DIR') or os.path.join(ROOT, 'game', 'rooms'))
BAK = os.path.join(ROOMS, '.bak')

FILE_RE = re.compile(r'^[a-z][a-z0-9_-]{0,31}$')
ID_RE = re.compile(r'^[a-z][a-z0-9]{0,15}$')
NAME_RE = re.compile(r"^[A-Za-z0-9 .,!?:;()&-]{1,40}$")
KEY_RE = re.compile(r'^[a-z][A-Za-z]{0,11}$')
STR_RE = re.compile(r'^[A-Za-z0-9_-]{1,24}$')
BIOMES = ('hub', 'roots', 'flood', 'molten', 'crystals')
GLYPHS = set('#=.~^STPGIMOFBHLXVEK')
MAX_BODY = 256 * 1024
LOCK = threading.Lock()


class Bad(Exception):
    def __init__(self, code, msg):
        super().__init__(msg)
        self.code, self.msg = code, msg


def num(v, lo, hi, what):
    if isinstance(v, bool) or not isinstance(v, int) or not lo <= v <= hi:
        raise Bad(400, f'{what} must be an integer {lo}..{hi}')
    return v


def clean(r, file):
    if not isinstance(r, dict):
        raise Bad(400, 'room must be an object')
    rid, name, biome = r.get('id'), r.get('name'), r.get('biome')
    if not isinstance(rid, str) or not ID_RE.match(rid):
        raise Bad(400, 'room id must be 1-16 lowercase letters/digits starting with a letter')
    if not isinstance(name, str) or not NAME_RE.match(name):
        raise Bad(400, 'room name must be 1-40 characters from letters, digits, space and .,!?:;()&-')
    if biome not in BIOMES:
        raise Bad(400, 'biome must be one of ' + ', '.join(BIOMES))
    at = r.get('at')
    if not isinstance(at, list) or len(at) != 2:
        raise Bad(400, 'at must be [x,y]')
    at = [num(v, -5000, 5000, 'at') for v in at]
    grid = r.get('grid')
    if not isinstance(grid, list) or not 1 <= len(grid) <= 128 or not all(isinstance(s, str) for s in grid):
        raise Bad(400, 'grid must be 1-128 rows of strings')
    w = len(grid[0])
    if not 1 <= w <= 128 or any(len(s) != w for s in grid):
        raise Bad(400, 'grid rows must all have the same width, 1-128')
    for s in grid:
        if not set(s) <= GLYPHS:
            raise Bad(400, 'grid has an unknown tile character: ' + repr(''.join(sorted(set(s) - GLYPHS)))[:20])
    ents = r.get('ents', [])
    if not isinstance(ents, list) or len(ents) > 64:
        raise Bad(400, 'ents must be a list of at most 64')
    out = []
    for e in ents:
        if not isinstance(e, dict) or not isinstance(e.get('at'), list) or len(e['at']) != 2:
            raise Bad(400, 'each ent needs at:[x,y]')
        item = {'at': [num(e['at'][0], 0, w - 1, 'ent x'), num(e['at'][1], 0, len(grid) - 1, 'ent y')]}
        for k, v in e.items():
            if k == 'at':
                continue
            if not KEY_RE.match(k):
                raise Bad(400, 'bad ent key ' + repr(k)[:20])
            if isinstance(v, str):
                if not STR_RE.match(v):
                    raise Bad(400, 'bad ent value for ' + k)
            else:
                num(v, -1000, 1000, 'ent ' + k)   # a current of more than ~12 px a frame would skip a wall (liquid.js)
            item[k] = v
        out.append(item)
    return {'id': rid, 'name': name, 'biome': biome, 'at': at, 'grid': grid, 'ents': out}


def val(v):
    return "'" + v + "'" if isinstance(v, str) else str(v)


def serialize(room, comment):
    ents = ','.join('{' + ','.join(f'{k}:' + (f'[{v[0]},{v[1]}]' if k == 'at' else val(v)) for k, v in e.items()) + '}' for e in room['ents'])
    head = f'/* {comment} */\n' if comment else ''
    rows = ''.join(f"    '{s}',\n" for s in room['grid'])
    return (f"{head}export default {{\n  id:'{room['id']}',name:'{room['name']}',biome:'{room['biome']}',at:[{room['at'][0]},{room['at'][1]}],\n"
            f"  grid:[\n{rows}  ],\n  ents:[{ents}],\n}};\n")


def clean_comment(c):
    if c in (None, ''):
        return ''
    if not isinstance(c, str) or len(c) > 800 or '*/' in c or '/*' in c or not all(ch == '\n' or 32 <= ord(ch) < 127 for ch in c):
        raise Bad(400, 'comment must be printable ASCII, under 800 characters, without comment markers')
    return c


def path_for(file):
    if not isinstance(file, str) or not FILE_RE.match(file) or file == 'index':
        raise Bad(400, 'bad room file name')
    p = os.path.join(ROOMS, file + '.js')
    if os.path.islink(p) or os.path.dirname(os.path.realpath(p)) != ROOMS:
        raise Bad(400, 'refusing that path')
    return p


def atomic(path, text):
    fd, tmp = tempfile.mkstemp(prefix='.tmp-', suffix='.js', dir=ROOMS)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(text)
        os.chmod(tmp, 0o644)  # mkstemp makes 0600; keep room files readable like the rest of the repo
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def backup(path):
    if not os.path.exists(path):
        return
    os.makedirs(BAK, exist_ok=True)
    base = os.path.basename(path)[:-3]
    with open(path, 'rb') as f:
        data = f.read()
    with open(os.path.join(BAK, f'{base}.{int(time.time() * 1000)}.js'), 'wb') as f:
        f.write(data)
    old = sorted(n for n in os.listdir(BAK) if n.startswith(base + '.'))
    for n in old[:-5]:
        os.unlink(os.path.join(BAK, n))


def room_id(file):
    with open(os.path.join(ROOMS, file + '.js'), encoding='utf-8') as f:
        m = re.search(r"id:'([a-z][a-z0-9]*)'", f.read())
    return m.group(1) if m else None


def registry(add=None, drop=None):
    idx = os.path.join(ROOMS, 'index.js')
    with open(idx, encoding='utf-8') as f:
        src = f.read()
    m = re.search(r'(/\* rooms:begin[^\n]*\*/\n)(.*?)(/\* rooms:end \*/)', src, re.S)
    if not m:
        raise Bad(500, 'index.js has no rooms:begin/rooms:end markers')
    files = re.findall(r"from '\./([a-z][a-z0-9_-]*)\.js'", m.group(2))
    if add and add not in files:
        files.append(add)
    if drop in files:
        files.remove(drop)
    ids = [room_id(f) for f in files]
    block = ''.join(f"import R_{i} from './{f}.js';\n" for f, i in zip(files, ids)) + 'const LIST=[' + ','.join('R_' + i for i in ids) + '];\n'
    new = src[:m.start(2)] + block + src[m.end(2):]
    if new != src:
        atomic(idx, new)
    return ids


def save(data):
    file = data.get('file')
    path = path_for(file)
    room = clean(data.get('room'), file)
    text = serialize(room, clean_comment(data.get('comment')))
    for f in sorted(n[:-3] for n in os.listdir(ROOMS) if n.endswith('.js') and n != 'index.js' and not n.startswith('.')):
        if f != file and room_id(f) == room['id']:
            raise Bad(409, f"room id '{room['id']}' is already used by {f}.js")
    backup(path)
    atomic(path, text)
    return {'ok': True, 'file': file, 'id': room['id'], 'registry': registry(add=file)}


def delete(data):
    file = data.get('file')
    path = path_for(file)
    if not os.path.exists(path):
        raise Bad(404, 'no such room file')
    if file == 'hub':
        raise Bad(400, 'the hub cannot be deleted')
    ids = registry(drop=file)
    backup(path)
    os.unlink(path)
    return {'ok': True, 'file': file, 'registry': ids}


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.mjs': 'text/javascript'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def reply(self, code, obj):
        b = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def local(self):
        host = (self.headers.get('Host') or '').rsplit(':', 1)[0]
        origin = self.headers.get('Origin')
        return host in ('localhost', '127.0.0.1') and (not origin or re.match(r'^http://(localhost|127\.0\.0\.1)(:\d+)?$', origin))

    def do_GET(self):
        if self.path == '/__room/ping':
            return self.reply(200, {'ok': True}) if self.local() else self.reply(403, {'ok': False, 'error': 'local requests only'})
        super().do_GET()

    def do_POST(self):
        routes = {'/__room/save': save, '/__room/delete': delete}
        fn = routes.get(self.path)
        if not fn:
            return self.reply(404, {'ok': False, 'error': 'not found'})
        try:
            if not self.local():
                raise Bad(403, 'local requests only')
            if (self.headers.get('Content-Type') or '').split(';')[0].strip() != 'application/json':
                raise Bad(415, 'send application/json')
            n = int(self.headers.get('Content-Length') or 0)
            if not 0 < n <= MAX_BODY:
                raise Bad(413, 'body must be 1 byte to 256 KB')
            try:
                data = json.loads(self.rfile.read(n))
            except ValueError:
                raise Bad(400, 'body is not valid JSON')
            if not isinstance(data, dict):
                raise Bad(400, 'body must be an object')
            with LOCK:
                self.reply(200, fn(data))
        except Bad as e:
            self.reply(e.code, {'ok': False, 'error': e.msg})
        except Exception as e:  # keep the server alive on any other failure
            self.reply(500, {'ok': False, 'error': type(e).__name__ + ': ' + str(e)})


if __name__ == '__main__':
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(Handler, directory=ROOT))
    print(f'Serving {ROOT} at http://localhost:{PORT}/game/')
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
