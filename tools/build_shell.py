#!/usr/bin/env python3
"""Stamp the OS menu bar and window frame into the static pages (project pages, press kit, 404), between markers.

The first run replaces the old <nav> and wraps <main>; later runs only refresh the marked blocks, so the shared
markup lives here and is never hand-copied. Idempotent.

    python3 tools/build_shell.py
"""
import glob
import html as H
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
META = json.load(open(os.path.join(ROOT, 'tools', 'os_meta.json'), encoding='utf-8'))['projects']

def menubar(p):
    """p is '../' on project pages (relative links, so the page checker can follow them) and '/' where the page can be served from any path (404)."""
    home = p if p == '/' else p + 'index.html'
    return f'''<!-- os:menubar -->
  <header class="os-bar"><a class="os-disc" href="{home}" aria-label="Home"></a><nav class="os-menu" aria-label="Site"><a href="{home}#work">Work</a><a href="{home}#about">About</a><a href="{home}#experience">Career</a><a href="{home}#contact">Contact</a><a href="{p}simple.html">View</a></nav></header>
  <!-- /os:menubar -->'''


def frame_top(title, close, acc, ink):
    ink = '#1A1716' if ink == 'INK' else ink
    return f'''<!-- os:frame -->
  <div class="os-win" style="--acc:{acc};--acc-ink:{ink}"><div class="os-tbar"><span class="os-ttl">{H.escape(title)}</span><a class="os-x" href="{close}" aria-label="Close window"></a></div>
  <!-- /os:frame -->'''


FRAME_END = '<!-- os:frame-end --></div><!-- /os:frame-end -->'
SKIN_LINK = '<link rel="stylesheet" href="%sos-page.css">'


def stamp(path, title, close, acc, ink, prefix, frame=True):
    with open(path, encoding='utf-8') as f:
        s = f.read()
    # head: Tiny5 for the chrome, the skin after styles.css
    if 'family=Tiny5' not in s:
        s = re.sub(r'(fonts\.googleapis\.com/css2\?[^"]*?)&display=swap', r'\1&family=Tiny5&display=swap', s, count=1)
    if 'os-page.css' not in s:
        s = re.sub(r'(<link rel="stylesheet" href="[^"]*styles\.css[^"]*">)', r'\1\n    ' + SKIN_LINK % prefix, s, count=1)
    # menu bar: the marked block, or the old <nav>
    if '<!-- os:menubar -->' in s:
        s = re.sub(r'<!-- os:menubar -->.*?<!-- /os:menubar -->', lambda m: menubar(prefix), s, count=1, flags=re.S)
    else:
        s, n = re.subn(r'<nav class="nav" id="nav">.*?</nav>', lambda m: menubar(prefix), s, count=1, flags=re.S)
        if n == 0:  # a page with no old nav (press kit, 404): the bar goes right after <body>
            s, n = re.subn(r'(<body[^>]*>)', lambda m: m.group(1) + '\n  ' + menubar(prefix), s, count=1)
        assert n == 1, path + ': no place for the menu bar'
    # frame around <main>
    top = frame_top(title, close, acc, ink)
    if not frame:
        pass
    elif '<!-- os:frame -->' in s:
        s = re.sub(r'<!-- os:frame -->.*?<!-- /os:frame -->', lambda m: top, s, count=1, flags=re.S)
        s = re.sub(r'<!-- os:frame-end -->.*?<!-- /os:frame-end -->', lambda m: FRAME_END, s, count=1, flags=re.S)
    else:
        s, n = re.subn(r'(\n\s*)(<main\b)', lambda m: m.group(1) + top + m.group(1) + m.group(2), s, count=1)
        assert n == 1, path + ': no <main>'
        s, n = re.subn(r'(</main>)', lambda m: m.group(1) + '\n  ' + FRAME_END, s, count=1)
        assert n == 1
    with open(path, 'w', encoding='utf-8') as f:
        f.write(s)


def main():
    for p in sorted(glob.glob(os.path.join(ROOT, 'projects', '*.html'))):
        slug = os.path.basename(p)[:-5]
        t = re.search(r'<h1[^>]*class="case-study__title"[^>]*>(.*?)</h1>', open(p, encoding='utf-8').read(), re.S)
        title = re.sub(r'<[^>]+>', '', t.group(1)).strip() if t else slug
        m = META[slug]
        stamp(p, title, '../index.html#work', m['acc'], m['ink'], '../')
    stamp(os.path.join(ROOT, 'press-kit.html'), 'Press Kit', 'index.html#press', '#FF3333', '#fff', '')
    stamp(os.path.join(ROOT, '404.html'), '', '', '', '', '/', frame=False)
    print('stamped', len(glob.glob(os.path.join(ROOT, 'projects', '*.html'))), 'project pages, press-kit.html and 404.html')


if __name__ == '__main__':
    main()
