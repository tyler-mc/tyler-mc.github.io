#!/usr/bin/env python3
"""Build the files the desktop (os.js) and the plain pages need from the site's real content.

Sources of truth, all hand-edited HTML:
  index.html          the #plain block (between the plain:start and plain:end markers): hero, work list, about,
                      how I work, logos, career, the unreleased text, contact
  press-kit.html      stats, bios, achievements, studios
  projects/*.html     role, studio, period and the banner of each project (the window loads the page itself)
  tools/os_meta.json  per-project accent colours and ids for the desktop, and the rotating taglines

Writes:
  os-data.js          window.OSD, read by os.js
  simple.html         the plain page: the #plain content plus the press kit, at its own indexed URL
  rw.css              styles.css scoped for a project page inside a window (tools/scope_css.py)

    python3 tools/build_os.py
"""
import html as H
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(p):
    with open(os.path.join(ROOT, p), encoding='utf-8') as f:
        return f.read()


def write(p, s):
    with open(os.path.join(ROOT, p), 'w', encoding='utf-8') as f:
        f.write(s)


def clean(t):
    return re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', '', t))).strip()


def esc(t):
    return H.escape(t, quote=True)


def absurl(u):
    """Root-absolute URL for a path found in a page (the desktop never depends on the document's base URL)."""
    u = u.strip()
    if re.match(r'(https?:|data:|//)', u):
        return u
    u = u.replace('../', '')
    return '/' + u.lstrip('/')


idx = read('index.html')
m = re.search(r'<!-- plain:start -->(.*?)<!-- plain:end -->', idx, re.S)
if not m:
    sys.exit('index.html has no plain:start / plain:end markers')
plain = m.group(1)
meta = json.load(open(os.path.join(ROOT, 'tools', 'os_meta.json'), encoding='utf-8'))


def section(sid):
    mm = re.search(r'<section id="%s">(.*?)</section>' % sid, plain, re.S)
    if not mm:
        sys.exit('plain block has no section #' + sid)
    return mm.group(1)


# ---- projects: list order, thumb and blurb from #plain; role, studio, period and banner from the page itself
projects = []
for li in re.findall(r'<li data-slug="([\w-]+)">(.*?)</li>', section('work'), re.S):
    slug, body = li
    page = read(f'projects/{slug}.html')
    items = {clean(a): clean(b).replace(clean(a), '', 1).strip()
             for a, b in re.findall(r'<span class="case-study__meta-label">(.*?)</span>(.*?)</div>', page, re.S)}
    banner = re.search(r'<img\s+src="([^"]+)"[^>]*class="case-study__image"', page) or re.search(r'class="case-study__image"[^>]*src="([^"]+)"', page)
    thumb = re.search(r'<img src="([^"]+)"', body).group(1)
    pm = meta['projects'][slug]
    projects.append({
        'id': pm['id'], 'slug': slug, 'name': clean(re.search(r'<b>(.*?)</b>', body).group(1)),
        'role': items.get('Role', ''), 'studio': items.get('Studio', ''), 'year': items.get('Period', ''),
        'blurb': clean(re.search(r'<p class="pl-blurb">(.*?)</p>', body, re.S).group(1)),
        'thumb': absurl(thumb), 'banner': absurl(banner.group(1)) if banner else absurl(thumb),
        'acc': pm['acc'], 'ink': pm['ink'], 'lift': pm['lift'], 'flag': pm['flag'],
    })
assert projects, 'no projects in the #plain work list'

career = []
for li in re.findall(r'<li><h3>(.*?)</ul></li>', section('experience'), re.S):
    t = clean(re.search(r'^(.*?)</h3>', li, re.S).group(1))
    c = clean(re.search(r'<p class="pl-co">(.*?)</p>', li, re.S).group(1))
    y = clean(re.search(r'<p class="pl-yrs">(.*?)</p>', li, re.S).group(1))
    acc = [[clean(a), clean(b)] for a, b in re.findall(r'<li><strong>(.*?)</strong>\s*<span>(.*?)</span></li>', li, re.S)]
    career.append([y, t, c, acc])
assert career, 'no career entries'


def kw(t):
    return re.sub(r'\s+', ' ', re.sub(r'<span\s+class="about-keyword"\s+data-line="(\d)"\s*>', r'<span class="kw" data-line="\1">', t)).strip()


about = [kw(p) for p in re.findall(r'<p>(.*?)</p>', section('about'), re.S)]
assert about, 'no about paragraphs'
unr = [re.sub(r'\s+', ' ', p).strip() for p in re.findall(r'<p>(.*?)</p>', re.search(r'<div class="pl-unr">(.*?)</div>', section('unreleased'), re.S).group(1), re.S)]
assert unr, 'no unreleased paragraphs'

how = []
for summ, text, slug, link in re.findall(r'<details><summary>(.*?)</summary><p>(.*?)</p><a href="projects/([\w-]+)\.html">(.*?)</a></details>', section('approach'), re.S):
    txt = clean(text)
    mm = re.match(r'(.+?) — (.*)', txt)
    how.append({'title': clean(summ), 'proj': mm.group(1) if mm else '', 'text': mm.group(2) if mm else txt, 'slug': slug, 'link': clean(link)})
assert how, 'no how-I-work entries'

worked = []
for cls, h, src, alt in re.findall(r'<li class="pl-logo([^"]*)" data-h="(\d+)"><img src="([^"]+)" alt="([^"]*)"', section('companies')):
    worked.append({'name': H.unescape(alt), 'cls': cls.strip(), 'h': int(h), 'src': absurl(src)})
assert worked, 'no logos'

sub = clean(re.search(r'<p class="pl-sub">(.*?)</p>', plain, re.S).group(1))
name = clean(re.search(r'<h1>(.*?)</h1>', plain, re.S).group(1))
unr_line = 'Unreleased: ' + clean(re.search(r'<p class="pl-blurb">(.*?)</p>', section('unreleased'), re.S).group(1))

# ---- press kit
pk = read('press-kit.html')
mm = re.search(r'<main.*?</main>', pk, re.S).group(0)
stats = [[clean(a), clean(b)] for a, b in re.findall(r'<div class="stat-number">(.*?)</div>\s*<div class="stat-label">(.*?)</div>', mm, re.S)]
bios = [[clean(l), [clean(x) for x in re.findall(r'<p>(.*?)</p>', body, re.S)]]
        for l, body in re.findall(r'<div class="bio-label">(.*?)</div>(.*?)</div>', mm, re.S)]
ul = re.findall(r'<ul>(.*?)</ul>', mm, re.S)
achievements = [clean(x) for x in re.findall(r'<li>(.*?)</li>', ul[0], re.S)]
studios = [clean(x) for x in re.findall(r'<li>(.*?)</li>', ul[1], re.S)]
assert len(stats) == 3 and len(bios) == 3 and len(achievements) == 6 and len(studios) == 8

osd = {'name': name, 'sub': sub, 'taglines': meta['taglines'], 'projects': projects, 'career': career,
       'about': about, 'unr': unr, 'unrLine': unr_line, 'how': how, 'worked': worked}
write('os-data.js', '/* generated by tools/build_os.py from index.html (#plain), the project pages and tools/os_meta.json. Do not edit. */\nwindow.OSD=' + json.dumps(osd, ensure_ascii=False, separators=(',', ':')) + ';\n')

# ---- simple.html: the #plain content with the press kit folded in, at its own address
head_html = re.search(r'<header class="pl-head">.*?</header>', plain, re.S).group(0)
head_html = re.sub(r'<nav class="pl-nav".*?</nav>', '<nav class="pl-nav" aria-label="Sections"><a href="#press">Press kit</a><a href="#work">Work</a><a href="#about">About</a><a href="#approach">How I Work</a><a href="#companies">Worked With</a><a href="#experience">Career</a><a href="#contact">Contact</a><a href="/">Desktop</a></nav>', head_html, flags=re.S)
main_inner = re.search(r'<main id="main">(.*?)</main>', plain, re.S).group(1)
press = '''    <section id="press">
      <h2>Quick Stats</h2>
      <div class="pl-stats">%s</div>
      <h2>Bio</h2>
%s
      <h2>Notable Achievements</h2>
      <ul class="pl-list">
%s
      </ul>
    </section>''' % (
    ''.join(f'<div class="pl-stat"><b>{esc(a)}</b><span>{esc(b)}</span></div>' for a, b in stats),
    '\n'.join(f'      <h3>{esc(l)}</h3>\n' + '\n'.join(f'      <p>{esc(t)}</p>' for t in ts) for l, ts in bios),
    '\n'.join(f'        <li>{esc(a)}</li>' for a in achievements))
studios_html = '''    <section id="studios">
      <h2>Studios</h2>
      <ul class="pl-list">
%s
      </ul>
    </section>''' % '\n'.join(f'        <li>{esc(s)}</li>' for s in studios)
main_inner = main_inner.replace('    <section id="contact">', studios_html + '\n    <section id="contact">', 1)
description = 'Tyler McCulloch, Game Designer and Director: press kit, selected work, career and contact in one plain page.'
simple = f'''<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Simple View | Tyler McCulloch | Game Designer &amp; Director</title>
  <meta name="description" content="{esc(description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://jtylermc.ca/simple.html">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://jtylermc.ca/simple.html">
  <meta property="og:title" content="Simple View | Tyler McCulloch | Game Designer &amp; Director">
  <meta property="og:description" content="{esc(description)}">
  <meta property="og:image" content="https://jtylermc.ca/images/og-cover.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#F7F6F0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap">
  <link rel="stylesheet" href="/plain.css">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/images/favicon-32.png" type="image/png" sizes="32x32">
  <link rel="apple-touch-icon" href="/images/apple-touch-icon.png">
</head>

<body class="plain-page">
<!-- generated by tools/build_os.py: do not edit -->
<div class="plain" id="plain-page">
  {head_html}
  <main id="main">
{press}
{main_inner}
  </main>
  <footer class="pl-foot"><p>© 2026 Tyler McCulloch</p></footer>
</div>
<script src="/analytics.js"></script>
<script defer src="https://cloud.umami.is/script.js" data-website-id="0f6eb15d-dcd5-46dd-8fc6-24269aaa06a9" data-domains="jtylermc.ca,www.jtylermc.ca" data-do-not-track="true" data-exclude-hash="true"></script>
</body>
</html>
'''
write('simple.html', simple)

subprocess.check_call([sys.executable, os.path.join(ROOT, 'tools', 'scope_css.py')], stdout=subprocess.DEVNULL)
print(f'os-data.js {os.path.getsize(os.path.join(ROOT, "os-data.js")) // 1024} KB | simple.html {len(simple) // 1024} KB | rw.css {os.path.getsize(os.path.join(ROOT, "rw.css")) // 1024} KB')
print(f'{len(projects)} projects, {len(career)} jobs, {len(about)} about paragraphs, {len(how)} principles, {len(worked)} logos, {len(unr)} unreleased paragraphs')
