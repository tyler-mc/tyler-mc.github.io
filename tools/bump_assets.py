#!/usr/bin/env python3
"""Refresh the ?v= cache-busting hash on styles.css, script.js and page.js in
every HTML page. Run it after editing any of those files:

    python3 tools/bump_assets.py
"""
import glob
import hashlib
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = ['styles.css', 'script.js', 'page.js']

hashes = {}
for name in ASSETS:
    with open(os.path.join(ROOT, name), 'rb') as f:
        hashes[name] = hashlib.md5(f.read()).hexdigest()[:8]

pages = [os.path.join(ROOT, name) for name in ('index.html', 'press-kit.html', '404.html')]
pages += sorted(glob.glob(os.path.join(ROOT, 'projects', '*.html')))

changed = 0
for page in pages:
    with open(page, encoding='utf-8') as f:
        html = f.read()
    updated = html
    for name, digest in hashes.items():
        updated = re.sub(re.escape(name) + r'\?v=[0-9a-f]{8}', f'{name}?v={digest}', updated)
    if updated != html:
        with open(page, 'w', encoding='utf-8') as f:
            f.write(updated)
        changed += 1

print('hashes:', ', '.join(f'{n} {h}' for n, h in hashes.items()))
print(f'updated {changed} of {len(pages)} pages')
