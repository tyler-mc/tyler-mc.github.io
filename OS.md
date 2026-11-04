# The desktop (OS) version of the site

jtylermc.ca is a 90s-style desktop. Everything on it is also a real page at its own address, so search engines, no-JS visitors and direct links keep working.

## What lives where

| Address | What it is |
|---|---|
| `/` (`index.html`) | The desktop. If JavaScript fails or `os.js` has not started within 4 s, the plain `#plain` block in the same file shows instead. |
| `/simple.html` | Simple view: the whole portfolio plus the press kit as one plain page (generated). |
| `/press-kit.html` | Press kit. |
| `/projects/*.html` | The 17 case studies. A desktop window fetches the page and shows its `<main>`; opened directly, the page shows the same content in a static window frame. |
| `/404.html` | The "Nothing planted here" dialog. |
| `/spin.html` | Unlisted landing page, unchanged. |

Old anchors still work on the desktop: `/#work`, `/#about`, `/#experience`, `/#contact`, `/#approach`, `/#companies`, `/#press`, and `/#<project-slug>` open the matching window.

## Files

- `index.html`: SEO head, the desktop shell, and the **`#plain` block between the `plain:start` / `plain:end` markers. That block is the hand-edited source of the site's text** (hero, work list, about, how I work, logos, career, the unreleased text, contact). Edit it directly.
- `os.css`, `os.js`: the desktop. Hand-edited. Open `/?qa` to expose `window.__b` for testing (not present otherwise).
- `os-data.js`, `simple.html`, `rw.css`: **generated, do not edit.**
- `plain.css`: styles for the plain pages. `os-page.css`: the window frame and menu bar for the static pages.
- `tools/os_meta.json`: per-project desktop id, accent colour, hover lift, and the rotating taglines.
- `images/os/mascot-alert.png`: the mascot on the 404 page.
- `analytics.js`: the analytics wrapper (see Analytics below).

## Workflow

After editing the `#plain` block, `press-kit.html`, a project page, `styles.css`, `tools/os_meta.json` or `tools/build_shell.py`:

```
python3 tools/build_os.py      # os-data.js, simple.html, rw.css (reads #plain, press-kit.html, projects/*.html)
python3 tools/build_shell.py   # menu bar and window frame on the static pages (between os: markers)
python3 tools/bump_assets.py   # cache-busting ?v= hashes
python3 tools/check_pages.py   # case-study structure checks
```

To add a project: write `projects/<slug>.html`, add an `<li data-slug="<slug>">` to the work list in `#plain`, add its entry to `tools/os_meta.json`, and add a first-open line for its id to the `WELCOME` map in `os.js`, and update the hard-coded Work line there ("Seventeen projects. Take your pick."). Then run the workflow.

## Notes

- `os.js` and `os-data.js` use root-absolute URLs (`/images/…`, `/projects/…`), so the site must be served from the domain root. `fetch` needs http: run `python3 -m http.server` from the repo root; `file://` will not work.
- The desktop's Simple view and project windows fetch `/simple.html` and `/projects/<slug>.html`; there is one source for each.
- `script.js` and `styles.css` are still used by `spin.html` (and `styles.css` by the project pages); `rw.css` is `styles.css` scoped for the windows.

## Analytics

Umami Cloud (cookieless, no personal data, no banner) next to the older Cloudflare Web Analytics beacon, which stays for web vitals. Website ID `0f6eb15d-dcd5-46dd-8fc6-24269aaa06a9`, limited to `jtylermc.ca` and `www.jtylermc.ca`, honours Do Not Track.

**Where the tag lives.** Static pages (projects, press kit, 404): the `os:analytics` block stamped by `tools/build_shell.py`. `simple.html`: the template in `tools/build_os.py`. `index.html` and `spin.html`: hand-written. Static pages let Umami send their own pageview; `index.html` sets `data-auto-track="false"` and `analytics.js` (with `data-landing`) sends it, because the desktop never changes URL.

**`analytics.js`** exposes `window.TK`; `os.js` has a no-op stub if it fails to load, and every call is harmless when Umami is blocked. `TK.open` (a visitor opened a window), `TK.track`, `TK.discover`, `TK.trackOnce`, `TK.quiet`, `TK.onHide`. Nothing is sent from localhost or under `?qa`; calls are kept in `TK.log` there.

**What is recorded**
- Landing: `/` plus the query string (so `utm_*` survive), hash dropped. The external referrer is on this pageview only; later ones name the previous virtual page.
- Every visitor-opened window is a virtual pageview and an `open` event `{win, via}`. Projects use `/projects/<slug>.html` (same as a direct visit), other windows `/os/<id>`, the Simple view `/simple.html`. `via` is `icon`, `card`, `link`, `hash` or `sys` (menu, mascot, code). The Read Me that opens by itself is not counted (`TK.quiet`).
- `contact` `{method}`: `email-open`, `email-copy`, `email-compose` (any `mailto:`), `linkedin`. `outbound` `{host, to}`: any other external link.
- `project_read` `{slug, depth, secs}`: depth is 0/25/50/75/100 (how far down the bottom edge got), secs counts only while that window is the front one and the tab is visible, under 3 s dropped. Sent on close and when the tab is hidden. Direct case-study pages send it from `page.js` with `direct: 1`. `video` `{slug}`: first time a visitor presses play on a clip.
- `discover` `{what, n, t}`: once per session per `what` (`plant`, `bloom`, `eat-flower`, `compost`, `glow-flower`, `mascot-3`, `icon-to-trash`, `hat:crown`, `80s`, `view-list`, `simple-view`, `distill-done`, ...). `n` is how many things have been found, `t` seconds since load. Steps of the two long paths have their own event names so Umami funnels can chart them: `crash_trash_open` → `crash_unreleased_out` → `crash_open` → `crash_retry` → `crash_skull`, and `ach_bar` → `ach_complete` → `ach_ending`.
- `os_fallback`: the desktop was not ready within 4 s (the guard in `index.html` fired; it also fires on a very slow start that recovers later).
- Events are attached to the last window the visitor opened, not necessarily the one in front.

**Adding an event.** Call `TK.track('name', {small: 'values'})` (or `TK.discover('what')` for a one-off find) where it happens. Keep names under 50 characters and never send per-click events; the free tier is quota-limited.

**Your own visits.** Visit `/?notrack` once in each browser (sets `localStorage['umami.disabled']`); `/?track` undoes it. Tagged links for applications: `/?utm_source=application&utm_campaign=<studio>`.
