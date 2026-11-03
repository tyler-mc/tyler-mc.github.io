#!/usr/bin/env python3
"""Scope the case-study rules of styles.css to .rw so a project page can render inside a desktop window.

Writes rw.css next to styles.css. Run it from tools/build_os.py (or directly) whenever styles.css or a project page changes.
Only rules whose classes appear in a project page's <main> are kept; viewport media queries become container queries on .rw."""
import glob, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
css = open(os.path.join(ROOT, 'styles.css'), encoding='utf8').read()
css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
used = set()
for f in glob.glob(os.path.join(ROOT, 'projects', '*.html')):
    m = re.search(r'<main.*?</main>', open(f, encoding='utf8').read(), re.S)
    for c in re.findall(r'class="([^"]+)"', m.group(0) if m else ''): used.update(c.split())
def parse(s):
    out = []; i = 0; n = len(s)
    while i < n:
        while i < n and s[i].isspace(): i += 1
        if i >= n: break
        j = i
        while j < n and s[j] not in '{;': j += 1
        if j >= n: break
        if s[j] == ';': out.append((s[i:j].strip(), None)); i = j + 1; continue
        depth = 1; k = j + 1
        while k < n and depth:
            if s[k] == '{': depth += 1
            elif s[k] == '}': depth -= 1
            k += 1
        out.append((s[i:j].strip(), s[j+1:k-1])); i = k
    return out
def split_sel(sel):
    parts = []; d = 0; cur = ''
    for ch in sel:
        if ch in '([': d += 1
        elif ch in ')]': d -= 1
        if ch == ',' and d == 0: parts.append(cur.strip()); cur = ''
        else: cur += ch
    parts.append(cur.strip()); return [p for p in parts if p]
def uses_class(sel): return any(re.search(r'\.' + re.escape(c) + r'(?![\w-])', sel) for c in used)
def pure_element(sel):
    if re.search(r'[.#\[]', re.sub(r'\([^)]*\)', '', sel)): return False
    return not re.search(r'(^|[\s>+~])(html|body)\b|:root', sel)
def has_global(sel): return bool(re.search(r'(^|[\s>+~])(html|body)\b|:root|\.nav\b|\.footer\b', sel))
kept = []; vars_ = []; kf_needed = set(); mq_seen = set(); flags = []
def keep_rule(sel, body, ctx):
    ps = split_sel(sel)
    ok = [p for p in ps if not has_global(p) and (uses_class(p) or (ctx == 'top' and pure_element(p)))]
    if not ok: return None
    for m in re.finditer(r'animation(?:-name)?\s*:\s*([\w-]+)', body): kf_needed.add(m.group(1))
    if re.search(r'position\s*:\s*fixed|opacity\s*:\s*0\b|visibility\s*:\s*hidden|translateY', body): flags.append((sel[:60], re.findall(r'position\s*:\s*fixed|opacity\s*:\s*0\b|visibility\s*:\s*hidden', body)))
    sc = ', '.join('.rw ' + p if not p.startswith('@') else p for p in ok)
    return sc + '{' + body.strip() + '}'
for sel, body in parse(css):
    if body is None: continue
    if sel.startswith('@media') or sel.startswith('@supports'):
        inner = []
        for s2, b2 in parse(body):
            if b2 is None or s2.startswith('@'): continue
            r = keep_rule(s2, b2, 'media')
            if r: inner.append(r)
        if not inner: continue
        cond = sel
        if sel.startswith('@media'):
            mq_seen.add(sel)
            sel = sel.replace('(min-width: 1180px)', '(min-width: 840px)')
            if re.search(r'\((?:max|min)-(?:width|height)', sel) and 'print' not in sel:
                feats = re.findall(r'\(([^)]*)\)', sel)
                if all(re.match(r'\s*(max|min)-width', f) for f in feats):
                    cond = '@container ' + sel[len('@media'):].strip()
                elif any(re.match(r'\s*(max|min)-width', f) for f in feats):
                    cond = '@container ' + ' and '.join('(' + f + ')' for f in feats if re.match(r'\s*(max|min)-width', f))
        kept.append(cond + '{' + '\n'.join(inner) + '}')
    elif sel.startswith('@keyframes'): continue
    elif sel.startswith('@'): continue
    elif sel.strip() == ':root':
        vars_.append(body)
    else:
        r = keep_rule(sel, body, 'top')
        if r: kept.append(r)
kfs = []
for sel, body in parse(css):
    if sel.startswith('@keyframes') and sel.split()[1] in kf_needed: kfs.append(sel + '{' + body + '}')
out = '.rw{' + ''.join(vars_) + '}\n' + '\n'.join(kfs) + '\n' + '\n'.join(kept)
open(os.path.join(ROOT, 'rw.css'), 'w', encoding='utf8').write(out)
print('rw.css KB', round(len(out) / 1024), '| rules', len(kept), '| keyframes', len(kfs), '| vars blocks', len(vars_))
print('media seen:', sorted(mq_seen)[:20])
print('flags:', flags[:25])
