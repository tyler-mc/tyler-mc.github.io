#!/usr/bin/env python3
"""Structural checks for case-study pages. Run it on one or more pages:

    python3 tools/check_pages.py projects/bully.html projects/form.html

With no arguments it checks every page in projects/. It reports duplicate ids,
rail links that point nowhere, local images or links that do not exist,
skipped heading levels, images without alt text, and a few template rules.
Exit status is 1 when anything is wrong.
"""
import glob
import os
import re
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def check(path):
    problems = []
    with open(path, encoding='utf-8') as f:
        html = f.read()
    base = os.path.dirname(path)

    ids = re.findall(r'\sid="([^"]+)"', html)
    for i in sorted({i for i in ids if ids.count(i) > 1}):
        problems.append(f'duplicate id "{i}"')

    for target in re.findall(r'href="#([^"]+)"', html):
        if target not in ids:
            problems.append(f'in-page link #{target} has no target')

    for m in re.finditer(r'\sposter="([^"]+)"', html):
        if not os.path.exists(os.path.normpath(os.path.join(base, m.group(1)))):
            problems.append(f'missing poster {m.group(1)}')

    for attr in ('src', 'href'):
        for m in re.finditer(r'\s' + attr + r'="([^"#?][^"]*)"', html):
            u = m.group(1)
            if re.match(r'(https?:|mailto:|tel:|data:|//)', u):
                continue
            rel = urllib.parse.unquote(u.split('#')[0].split('?')[0])
            if rel and not os.path.exists(os.path.normpath(os.path.join(base, rel))):
                problems.append(f'missing file {u}')

    body = re.search(r'<main.*?</main>', html, re.S)
    body = body.group(0) if body else html
    levels = [int(x) for x in re.findall(r'<h([1-4])[\s>]', body)]
    for prev, cur in zip(levels, levels[1:]):
        if cur - prev > 1:
            problems.append(f'heading level jumps from h{prev} to h{cur}')
    if levels.count(1) != 1:
        problems.append(f'expected one h1, found {levels.count(1)}')

    for img in re.findall(r'<img\b[^>]*>', body):
        if 'alt=' not in img:
            problems.append('image without alt: ' + img[:70])

    for need in ('case-study--deep', 'cs-layout', 'cs-rail', 'case-study__nav', 'id="skills"'):
        if need not in html:
            problems.append(f'template piece missing: {need}')

    for bad in ('TODO', 'lorem', 'main highlight', 'open-source PC tool'):
        if bad.lower() in html.lower():
            problems.append(f'unwanted text: {bad}')

    # Source links and publication credits are not used on case studies
    for u in re.findall(r'<a [^>]*href="https?://[^"]*"[^>]*>', body):
        problems.append('external link in page body: ' + u[:70])
    if re.search(r'<cite\b|\u2197|Source:', body):
        problems.append('source attribution text (cite, arrow or "Source:")')
    if '\u2014' in body:
        problems.append('em dash in page body')

    for u in re.findall(r'<a [^>]*target="_blank"[^>]*>', body):
        if 'rel="noopener"' not in u:
            problems.append('external link without rel="noopener": ' + u[:70])

    return problems


def main():
    files = sys.argv[1:] or sorted(glob.glob(os.path.join(ROOT, 'projects', '*.html')))
    bad = 0
    for f in files:
        probs = check(f)
        name = os.path.relpath(f, ROOT)
        if probs:
            bad += 1
            print(name)
            for p in probs:
                print('  -', p)
        else:
            print(name, 'ok')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
