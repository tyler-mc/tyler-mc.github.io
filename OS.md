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
- The hidden Wake Up game has its own funnel, each step once per session: `game_wake` → `game_torch` → `game_item_<name>` → `game_piece_<biome>` → `game_done`. `game_wake`: the visitor opened (or brought back) the game window from its desktop icon; the first open also counts as an `open` of `/os/game`. `game_torch`: the torch was lit and the desktop came back (not sent when a reload resumes in the light). `game_item_<name>`: an item was picked up (`game_item_root` is the root double jump, `game_item_board` the dash board, `game_item_forged` the heat-forged board and `game_item_claws` the vine claws). `game_piece_<biome>`: a door piece was taken (`roots`, `flood`, `molten`, `crystals`). `game_done`: the door opened and the OS rebooted home. The engine reports these through `mount(el, {onEvent})`; `os.js` maps them in `gameEvent`.
- `os_fallback`: the desktop was not ready within 4 s (the guard in `index.html` fired; it also fires on a very slow start that recovers later).
- Events are attached to the last window the visitor opened, not necessarily the one in front.

**Adding an event.** Call `TK.track('name', {small: 'values'})` (or `TK.discover('what')` for a one-off find) where it happens. Keep names under 50 characters and never send per-click events; the free tier is quota-limited.

**Your own visits.** Visit `/?notrack` once in each browser (sets `localStorage['umami.disabled']`); `/?track` undoes it. Tagged links for applications: `/?utm_source=application&utm_campaign=<studio>`.

## Wake Up (the hidden game)

- `game/` holds the game (vanilla ES modules, no build). `os.js` loads `/game/engine.js` with `import()` the first time the window opens and calls `mount(el, {keyTarget, isActive, onTorch, onEvent, onFx})`.
- Keys in `localStorage`: `tos_wake` (`on` once the crash has left the Wake Up icon, `done` after the ending), `tos_wake_seed` (`1` seed planted on the Trash shelf, `2` sprouted), `tos_wake_in` (`1` while the mascot is trapped in the game), `tos_wake_min` (`1` after the first minimize), `tos_wake_beg` (`1` the begging line is owed, `2` said), `tos_game` (the engine's own save; a lit torch makes a reload bring the window back minimized in the strip), `tos_game_mute`. The game also reads `tos_hat` and `tos_mask` (never saved in `tos_game`).
- **Trapped mascot.** The first Wake Up click spirals the desktop mascot into the icon (`suckIn`, about 1 s; reduced motion: he just goes), then the window opens black. From then until `finishGame`'s "Home." he is hidden (`buddy.hidden` plus `trapped`), so every mascot path that already checks `buddy.hidden` (speech, perch, welcome lines, feeding, Trash dives, the nap saver, `dropBuddy`) skips him; the Control Panel switch only changes `buddyGone`. A lit save from before this rule is treated as trapped on load.
- **First minimize / first restore.** The first minimize says "hey!" from the game's strip tab (`#gbub`, the mascot bubble's look; on phones from the Wake Up icon), once. The next restore, when lit, makes the in-game mascot beg "You gotta help me escape" (`game.say(text,{pose:'beg'})`), once.
- **His look in the game.** `mount(el,{look})` and `game.setLook({hat,mask})`; `setHat`/`setMask` forward changes to a mounted game. The accessories are the same pixel grids as `drawBuddy`, in `game/mascot.js`.
- **Edge bumps.** `game/bump.js`: dragged (dark) or walked (lit, grounded) into a solid for a moment, he sometimes says "oof"/"oww", and "I think I'm stuck in here" after four shoves inside 10 s; one line per 4 s at most, never over another line. Tested in `tools/test_game.mjs`.
- **The door and the disc.** `game/door.js` draws the hub door, the disc's four interlocking quarter fragments (0 roots NW, 1 flood NE, 2 molten SE, 3 crystals SW: empty recess, or carved stone with a thin inlay line in the biome colour) and the HUD's little four-part disc. The medallion wallpaper (`medWall`, `discFrag`) uses the same split. Until placing pieces exists (M6), the door shows a fragment as soon as its piece is carried (`S.placed`, if present, wins).
- Until the torch is lit the OS is covered by `.gdk` (one cover inside `#desk`, one over the menu bar; `#desk` is a stacking context, so a single cover cannot sit between the menu bar and the game window) and the window cannot be minimized.
- The OS reacts to the game through `osFx.set(name, level)` (the engine's `onFx`; the levels come from the pure `fxLevels(S)` in `game/engine.js`, tested in `tools/test_fx.mjs`). A new biome clears the last one's effects; minimizing hides them until the window comes back; the seed and the scorch stay. Nothing takes a pointer or covers a window; only Undo's scan lies faintly over the icons (and the sweep's erase hides them by design). With reduced motion every effect is the same picture held still.
  - Windows: `winFxMount` (in `makeWin`) gives every window a frame canvas (`canvas.fxm`, 2px pixels, 6px past the window on each side: moss, char and scorch on the edges) and a body layer (`.fxb`, inside `.wf`, placed over `.wbw` by script because `.wbw` is not positioned; no pointer: water, frost and soot as CSS, multiplied so the text stays ink). A `ResizeObserver` redraws a window the moment it opens, resizes or is shaded, so a window opened mid-effect has it. `#w-game` and `#w-crash` keep their bodies clear (the frame canvas is cut away over their `.wbw`, and the CSS skips them). The `.fxb` rules hang off root classes (`html.fxwet`, `html.fxcry`, `html.fxchr`), so no per-window state is needed.
  - Roots: `moss` (level 0.2 at the first torch is remapped so it already shows clearly; moss spills 2px past each icon, so its canvas is 36x36 at -4px). The same level moss the windows' frames (`mossWin`): thin on top so the title reads, deeper toward the bottom, tufts above the top edge, strands off the bottom. `seed` plants the sprout on the Trash shelf, drawn at 96x132 (twice the old 48x66). `shake`. `thorns` (0 outside the thorn chase, 0.25 at its start, then its progress in quarters; Roots only, never for the eel): thorns grow over the desktop's background on the `.fxd` canvas under the icons (`thornDraw`: vines climb from the bottom, creep in from the sides and hang from the top, paired barbs, a red tip, a slow sway; `thG` eases toward the level, growing slowly and withering faster; minimize or a clear removes them at once).
  - Flood: `wet` (1 in every Flood room): the Trash window fills with pale water from its items' middle down and the items bob at the surface (`#w-trash.wet`), every other window floods the same way (`html.fxwet`: a pale water layer in `.fxb`, its surface a seventh of the way down, `--sy`, set per window; items in every window bob; `#w-game` stays dry), and the Trash icon holds water, with drips and a puddle (`canvas.wet`). `slosh` (1 while he is in the water or surfing it): the game's tab sloshes with water behind its title; os.js holds it on 600 ms after the engine says 0 so a bob at the waterline does not flicker it. `flood` (the eel chase's tide, quarters): the tide rises up the desktop behind the icons (12% to 62% of its height), icons it covers float (`.icon.fl`), and the tab fills further; it drains when the chase ends and vanishes at once on a biome change or minimize.
  - Molten: `heat` (1 in every Molten room), `shimmer` (the geyser chase's progress, quarters) and `glow` (1 while a vent erupts) feed one heat haze (`hazeLv`): the wallpaper's bottom rows wobble sideways (copied from `#wall` with a sine offset), a dithered ember glow rises from the bottom edge and sparks drift up, faint while he explores, stronger through the chase, flaring on eruptions. `glow` also rings each desktop icon in warm orange, lit from below (`canvas.glow`); the mascot never glows. The tab holds the heat behind its title. `heat` also covers every desktop icon in magma (`canvas.mag`, `magmaFx`: thick on top, thinning toward the foot so each icon still reads, molten cells, embers and dark crust, drips off the lowest covered pixel, a slight flicker) and chars every window (`charWin`, `charSync`, `html.fxchr`): soot burns in from the frame's edges in ragged dithered steps, thin on top so the title reads, with a few ember cracks, and the body takes a dithered brown soot from its foot (`--fxsoot`). The char grows with the haze (0.5 to 1).
  - The game's tab is the strip tab on desktop and the game window's back bar on phones (the strip is hidden there and the game window covers the desktop), so the tab is the effect a phone sees during play. Its water and heat are a `::after` under the title (`html.fxw`/`.fxh`/`.fxg`, `--fxw`/`--fxh`), so `renderStrip()` rebuilding the tabs does not lose them; the strip title keeps a chip of its own ground, the back bar title a 1px halo.
  - The tide and the haze share one canvas (`.fxd`, inserted after `#wall`, under the plants, icons and windows), drawn 12 times a second while either shows and never on phones. The CSS tiles (wave crests, heat glow, sparks) are drawn once in code (`fxTiles`). `scorch` (1 in every biome once Molten is finished: its fragment in hand with its chase over, or placed; the engine sends it only then) leaves soot blotches with a rust edge on the buddy's perches: each window's top edge and the top line of its footer (`scorchWin`), and the strip's top edge in rust and ember (`canvas.fxsc`, since soot would not show on its ink). Unlike the other effects it is permanent: it is kept through a biome change, a minimize and the game's end, saved in `tos_wake_scorch` (so a reload shows it without the game running) and cleared by `__b.unwake()`.
  - Crystals: `crystal` (1 in every Crystals room): every desktop icon turns to crystal. Each gets a `canvas.crys` (36x36 at -4px, like the moss): the icon cut into a Voronoi of cold faces in the game's crystal palette (seeded across its own bounding box, so each cuts differently), with a white seam on each face's lit side and violet on its shaded side, the outline in the crystal's ink, and shards off its top edge and beside its foot (`cryIcon`, `cryShards`). The Trash keeps its own cut (the can's ribs, shards at its foot and lid); `trashFrame()` keeps every effect canvas through the buddy's rummage and redraws just the Trash's crystal for the lid frames. Every window is frosted the same way as the Trash's (`#w-trash.crys`, and `html.fxcry` for the rest: the pale facet tile `--fxcr` drawn once in `cryTiles`, multiplied over the body in `.fxb`). `erase` (the delete sweep's progress, quarters): the desktop icons dissolve in order, top first (ties left first), as the front comes down. Each icon's pixels drop out in a fixed dither (top first, ragged) through an inline CSS mask, with a dark edge on what is left (`canvas.ers`, a few pixels pale, re-picked every 140 ms), and then its label. It is not a fade, and the buttons keep their place and still work. `rewind` (1 while he holds Undo, sent in every biome once he owns it): the dissolved icons come back with the dither run in reverse, in about a third of a second. A faint scan rolls up the desktop (`.fxscan`, in `#desk` above the icons, under the windows and the mascot, no pointer). The game's tab gets scan lines (`html.fxr`, a `::before`, so it does not collide with the water and heat `::after`). On release the sweep takes the icons again. A 0 from minimize or a clear puts every icon back at once. The sweep ends on the hub floor, so the icons come back with the biome change, at once. The dither runs back on Undo, or when a death puts the front back higher. Reduced motion: the dissolve and its return are instant, the edge holds still, and the scan is static lines without the rolling band.
- `/?qa`: `__b.wake()` unlocks the icon without the crash, `__b.openGame()` opens it (the first time with the spiral; `__b.suckMs` sets its length), `__b.untrap()` lets the mascot out, `__b.trapped`, `__b.heyBub()`, `__b.begNow()`, `__b.finishGame()` runs the ending, `__b.osFx`, `__b.unwake()` (clears all `tos_wake*` keys; reload after). `__game.say(text,'beg')` and `__game.look({hat,mask})` on the game side. Inside the window `__game` has `warp`, `grant`, `piece`, `reset` (and the dev panel shows) under `?qa` only.

## Deploy notes (wake-up-game)

`.github/workflows/static.yml` uploads the whole repo (`path: '.'`). Before this branch is merged to `main`:

- Exclude or gate: `game/index.html` (the standalone page; it shows the dev panel on any localhost), `game/dev/` (warp, grant and reset panel), `game/editor.js` (level editor), `tools/dev_server.py` (the editor's save endpoint, local only). In the embedded game the dev panel only loads under `?qa`, but the files are still fetchable if deployed.
- `tools/bump_assets.py` does not know `game/`: the modules are fetched by `import()` with no `?v=` hash, and the engine's own `import` lines cannot carry one, so a visitor can get a stale mix after a deploy. Add the game files to the bump (or version the `import('/game/engine.js?v=…')` URL and the imports inside `game/`) before shipping.
- The M2a stub (`gameStub`) is gone; `os.js` now needs `game/` to be deployed alongside it or opening Wake Up logs an import error.

