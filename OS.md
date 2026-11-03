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
