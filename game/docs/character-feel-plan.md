# Character feel: implementation plan

Status: draft v1, 2026-11-05. Owner: Tyler. Design basis: `game/docs/character-feel.md` (requirement IDs A1 to A13, B1 to B9, C1 to C7 and questions Q1 to Q7 refer to that document).

## 1. Summary

This plan makes the mascot's movement and look match the best-in-class targets in five stages. Each stage ends with something Tyler can play and a test result that can be measured.

The plan is a **feel pass between the Roots slice and M3 (Flood)** of the approved Wake Up plan. That plan already lists game feel as M1 acceptance and says it is "tuned before any levels are built". The measured gaps show the tuning is not finished, and the M3 board dash builds on the same controller. It does not block M2 (OS embed).

Order of work:

| Stage | Name | Changes movement? | Tyler decides first |
|---|---|---|---|
| 0 | Tests and live tuning | No | none |
| 1 | Control: air stop, reversal, corner correction | Yes | Q1 |
| 2 | Renderer hook and body pulse | No | Q3 |
| 3 | Camera | No | none |
| 4 | Detail: skid, walk cycle, sound, edge pose | No | Q6 |
| 5 | Deferred items and controller prep for M3 | Some | Q2, Q4, Q5 at M3 start |

Rationale for the order: the largest measured gaps are in control, and the Ori postmortem says to tune controls first. Stage 0 comes before any change because the current tests cannot see most Group B changes. Stage 2 comes before Stage 3 because the renderer hook is the largest code change and the camera work does not depend on it.

## 2. Ground rules

Process rules:

1. **One editor at a time.** A feel stage must not start while another `game/` edit is open. Tyler decides who holds the branch.
2. **One commit per stage, on branch `wake-up-game`, never on `main`.** The deploy workflow uploads the whole repo from `main` (Q7 in the design doc).
3. **Opus 5.5 writes the code, Sonnet 5.5 coordinates, Haiku 5.5 searches.** This follows the global model roles. The advisor checks the diff against the acceptance criteria before each commit.
4. **Physics values are tuned by playing, not by reading the doc.** The doc gives starting values. Tyler picks final values in the live panel (Stage 0).

Code rules:

1. **Name functions, not line numbers.** The files change often, so every step names a function (`stepPlayer`, `move`, `camera`, `look`, `drawBuddy`, `tick`).
2. **No hard-coded test count.** Stage 0 records the real number once the suite is green. Every later stage must pass that number or more.
3. **Every effect obeys `reduce`.** A stage is not done until the reduced-motion case is checked (A12).

## 3. Stage 0: tests and live tuning

Entry gate: `node tools/test_game.mjs` loads and passes with no open edits to `game/`. Record the count as **N**.

Steps, part 1 (tests):

1. Run the suite and the measurement scripts in `/Users/tmc/.claude/plans/wake-up-gdd-scripts/`. Save their output as the "before" record for Stage 1. If the suite fails to load or fails a check, stop and report to Tyler. Do not fix other people's in-flight work.
2. Add characterisation tests to `tools/test_game.mjs`. Each runs the real `step()` and counts frames:
   - frames from full speed to a stop on the ground (about 6 today)
   - frames from full speed to full speed the other way on the ground (16 to 17)
   - frames from full speed to a stop in the air with no input (about 23)
   - frames from full speed to full speed the other way in the air (about 25)
   - frames to full speed from rest on the ground (8 to 9)
   Measure each on the real `step()` first, then assert the measured value with a range of ±1 frame. The figures above come from the calculation script and may differ by one frame from the real loop. In later stages the range moves to the target. This pins the feel numbers so a change cannot slip in unseen.
3. Extend `canReach` in `tools/test_game.mjs` with an optional reversal: hold a direction for k frames, then the opposite direction for m frames, then release. Add one reversal run to each of the 10 negative checks ("needs the root"). All 10 must still pass.
Steps, part 2 (live tuning):

4. Move the movement constants (`ACC`, `DEC`, `AACC`, `ADEC`, `RUN`, and a new `CORNER`) out of the module-level `const` list in `player.js` into one exported object, `FEEL`. `stepPlayer` reads `FEEL.ACC` and so on. Default values stay as they are today. The tests import `FEEL`. **`player.js` must keep exporting `PW, PH, G, GH, JV, RJV, CUT, COY, BUF` by name with the same values.** The GDD scripts in `/Users/tmc/.claude/plans/wake-up-gdd-scripts/` import these names and call `stepPlayer` through `engine.step`. Only the five movement constants that Stage 1 changes (`ACC`, `DEC`, `AACC`, `ADEC`, `RUN`) move into `FEEL`.
5. Add a "Feel" section to `game/dev/panel.js` (localhost and `?qa` only, like the rest of the panel). It shows one slider for each `FEEL` value (including the stun hit-stop in frames, for Q4), with the current value beside it, and a "Copy values" button that writes the object as text for pasting into `player.js`. Slider changes apply on the next step. Values are not saved.
6. Measure the baseline draw time: run `draw()` 600 times with the mascot jumping, using `performance.now()`, and record the median and the 95th percentile. Stage 2 compares against it.

Acceptance:

- The suite passes with N checks, and the 5 new characterisation tests pass at today's values.
- Moving a slider in the panel changes the mascot's behaviour on the next step without a reload.
- With all `FEEL` values at default, the 10 negative checks and every `canReach` check give the same result as before the change.

Rollback: revert the commit. No behaviour changed.

Estimated effort: one Opus session.

**Status (2026-11-05, not committed):** steps 1 to 5 are done except the hit-stop slider.

- **N = 204** checks in `tools/test_game.mjs` (188 before plus 16 new). `tools/test_rooms.mjs` has 29. Both pass.
- The four GDD scripts give byte-identical output to the "before" run.
- Measured characterisation values on the real `step()`: ground stop 6, ground reversal 16, ground start 8, air stop 23, air reversal 25 frames.
- With `ADEC` at 0.13 the air stop is **13 frames**, not 12 (the 12.3 in the design doc is continuous, the loop counts whole frames). Q1's "12 frames" means 13 in the game.
- The reversal sweep (k in {6, 10, 14}, m in {4, 8, 12}) leaves all 10 negative checks out of reach on today's physics. With the root, r4 row 30 is reachable at two combinations; that is expected.
- `ACC, DEC, AACC, ADEC, RUN` are still exported by name but hold the defaults only. Code that needs the live value reads `FEEL`.
- **Open:** (a) the hit-stop slider, because the value lives in `engine.js`; do it at the start of Stage 1; (b) step 6, the draw-time baseline, which needs a browser and has not been measured; (c) the panel UI has not been opened in a browser.
- **Stage 1 note:** when B4 adds an air-reversal rate (`AREV`), the air-reversal characterisation guard (it allows `F.AACC`) must be widened, or that test returns -1 instead of a frame count.
- **Commit:** `game/` is untracked and holds the other session's uncommitted chase work. A stage commit would include their files. Tyler decides whether to commit the whole `game/` folder together or leave it uncommitted for now.

## 4. Stage 1: control

Entry gate: Q1 is decided: start at `ADEC` 0.13 (air stop in 12 frames). Tyler may raise it toward 0.18 (9 frames) in the Stage 0 panel before the value is fixed. Hold a short co-design round with Tyler at the start, as the Wake Up plan requires for a milestone.

Steps (requirement IDs in brackets):

1. [B3] Set `FEEL.ADEC` to Tyler's value. Update the air-stop characterisation test to the new frame count.
2. [B2] In `stepPlayer`, when the player is on the ground and input opposes `vx`, use `DEC` instead of `ACC`. Update the ground-reversal test to 13 frames (±1).
3. [B5] Add corner correction as an **option of `move()` that only the player's own move turns on**. When the upward move hits a solid tile or a wrapped-enemy box, test x offsets of 1 to `FEEL.CORNER` px (start 4) with y -1 px from the snapped contact position, left if `vx <= 0`, then right if `vx >= 0`. Keep `vy`. Enemies, the drag in `step()` and the wrapped-enemy ride must call `move()` without the option.
4. [B1] Do not touch `G`, `GH`, `JV`, `RJV`, `CUT`, `COY`, `BUF`.
5. Add tests:
   - a head-bump scenario: a ceiling lip 3 px wide, a jump from below it, and an assertion that the mascot passes and `vy` is unchanged
   - the same scenario with a lip of 5 px, which must still block
   - an enemy standing under the same lip: its `move()` result is the same as before
6. [B4] Apply B4 with `FEEL.AREV` 0.18 for opposing input only, then re-run the 10 negative checks with the reversal runs from Stage 0. If any check flips to reachable, revert B4 and record it as a Stage 5 item. If none flips, update the air-reversal test.

Acceptance:

- All N checks pass, plus the new tests. All 10 negative checks still pass with the reversal runs.
- The five characterisation tests show the new targets: ground stop 6 ±1, ground reversal 13 ±1, air stop at Tyler's choice ±1.
- The direct jump checks are unchanged: full jump 39.1 px, root jump +28 to 40 px.
- `gapcheck.mjs` is re-run. Its level-design limits today are: widest pit 7 tiles with no item and 11 with the root jump, rise 3.26 and 5.84 tiles. B1 keeps the rise values. B3, B2 and B5 can change the pit widths, because they change drift and head-bump behaviour. If a limit moves, Tyler or the level-design session gets the new values before any room is built or changed, and the result is written in this plan.
- The chase completability bot test passes, and the measurement scripts in `/Users/tmc/.claude/plans/wake-up-gdd-scripts/` (`camcheck.mjs`, `gapcheck.mjs`, `measure2.mjs`, `r1check.mjs`) are re-run and their results compared with the pre-change results. The chase speeds and the r1 beetle lesson timings were tuned against today's feel, so a shift here means a room or chase needs retuning, and Tyler decides which.
- Manual: Tyler plays rooms r1 to r4 and the hub for 10 minutes and answers one question: "Does stopping and turning in the air feel controlled?"

Risks: B3 moves where the seed-demo hop lands, so the two demo tests may fail. If they fail, the fix is to give `demo()` a direction or to widen the landing check, and the plan records which one Tyler chose. B5 could open a gap in a built room; the `canReach` negatives are the guard.

Rollback: revert the commit, or set `FEEL` values back to the Stage 0 defaults.

Estimated effort: one Opus session plus one playtest.

## 5. Stage 2: renderer hook and body pulse

Entry gate: Q3 is decided. The face stays fixed and the pulse is limited to (0.91, 1.18) and (1.27, 0.73).

Steps:

1. In `engine.js`, `tick()` calls a new `rend.step(S, ev)` after each `step()`. `draw()` stays once per animation frame and only reads renderer state.
2. In `player.js`, add the landing-speed field `p.lv` next to `p.land`. Lower the `land` event threshold from 2.2 to 1.0. Check every test and every use of `p.land` and the `land` event, because it now fires on more landings.
3. In `render.js`, add `rend.step`. It holds the pulse (`sx`, `sy`) and the dust list **outside `S`**. It does not advance while `S.hit > 0`. It clears on the `rez` event, on a room change, and after `restore()`.
4. [A1, A2, A3, A4] Replace the fixed `squash` and `stretch` frames in `look()` with a pulse. The pulse sets whole-pixel radii inside the face limits (`rx` 10 to 14, `ry` 8 to 13, `oy = 11 - ry`). `drawBuddy`, `shoes()` and `strands()` read the same radii. The pulse returns to 1 in 12 frames. The cache key includes the quantised radii.
5. [A5, A6] Add dust: 4 puffs at a jump, 8 at a landing with `lv >= MAXF * 0.5`, else 3. Puffs are 2 to 3 px and live 12 to 20 frames.
6. [A12] With `reduce`, the pulse is off and dust is off.

Acceptance:

- All N checks pass, including the new `land` event threshold. A test counts `land` events over a scripted run of jumps and asserts the count matches the number of landings with `vy > 1.0`.
- `p.lv` is JSON-safe, and `snapshot()` followed by `restore()` leaves the pulse and dust state untouched (a test checks that `S` has no `sx`, `sy` or dust key).
- In a 60-second scripted run with speech and jumps, the sprite cache clears at most once.
- Median and 95th percentile draw time stay within 1.5 times the Stage 0 baseline.
- Manual checklist, in a browser with `reduce` off and on: the stretch shows on the jump frame, a short hop and a long fall give different landing squashes, dust appears at the feet, nothing appears with `reduce` on.

Risks: the hook is the largest code change in the plan. The renderer can drift from the world step if `rend.step` is skipped during hit-stop by mistake. The test for `S` containing no visual state is the guard.

Rollback: revert the commit.

Estimated effort: one Opus session plus a review pass.

## 6. Stage 3: camera

Entry gate: none.

Steps:

1. [C1] In `camera()`, keep the vertical target still while the player stands inside a window from 0 to 44 px above the last ground height. Below the window, and in every fall, follow at 12% per frame as today.
2. [C2] After 6 grounded frames, ease the vertical target to the player's height at 6% per frame.
3. [C3, optional] Replace the look-ahead `face * 12` with `clamp(vx * 8, -16, 16)`. Ship only if Tyler prefers it in the panel.
4. Test in node: `camera()` is a pure function of `S`, so a scripted full jump from flat ground must leave `cam.y` unchanged. A fall of 100 px must lead to the same `cam.y` as before within 1 px after 40 frames.

Acceptance: all N checks pass; the two camera tests pass; Tyler plays r4 (the tall room) and confirms the camera still shows the landing area on the way down.

Rollback: revert the commit.

Estimated effort: part of one session.

## 7. Stage 4: detail

Entry gate: Q6 is decided: the sprout lag (A11) ships.

Steps:

1. [A7] Skid frame and puffs while input opposes velocity on the ground. Needs the `skid` event.
2. [A8, A10] Walk cycle by distance (one stride frame per 6 px), as `render.js` already does for Mossback. Footsteps fire on alternate stride frames through a `footstep` event. Pitch varies ±8%.
3. [A9] Land sound scales with `p.lv`. Jump sound varies ±6%.
4. [A13] Edge pose when neither foot is over a solid tile and the mascot stands still.
5. [A11] Sprout lag, only if Q6 is yes.

Acceptance: all N checks pass; the new events appear in the event list tests; each effect is off or silent with `reduce` and with mute; Tyler plays for 10 minutes and names anything that feels busy or wrong.

Rollback: each item is a separate commit inside the stage, so one can be reverted alone.

Estimated effort: one session.

## 8. Stage 5: deferred items and controller prep for M3

These items wait for a reason, not for a date.

| Item | Waits for | Trigger |
|---|---|---|
| B6 ground accel 0.27 | Stage 1 playtest | Tyler says starting feels slow |
| B7 jump boost | Stage 1 playtest | Tyler says jumps feel flat |
| B8 fast fall | **Q5** | M3 co-design (touch has no down button) |
| B9 ledge pop | Stage 1 playtest | Tyler reports missed ledges |
| Fall-gravity multiplier | Stage 1 playtest | Tyler says the descent floats; changes all run-jump distances |
| C4 render interpolation | Test on a 120 or 144 Hz display | Visible judder |
| C5, C6 hit-stop cap, directional shake | Stage 2 | New hit sources appear |
| C7 keep a jump pressed during death | Any time | Small; do with Stage 4 if wanted |
| Run speed (Q2) | Before any new room | Tyler decides which unit gaps follow |

Controller prep for the board dash (M3), done at the start of M3 and not before:

1. A named locomotion state in `stepPlayer` (`p.mode`).
2. One press buffer for every action, replacing `p.buf` and `p.jq` as separate cases.
3. A velocity-override function with a duration, for the dash.
4. Corner correction in any direction, for the dash (`DashCornerCorrection` is 4 px in Celeste).
5. A trail recorded in `rend.step`, copying Celeste's three snapshots (start, +5 frames, end).

## 9. Decisions

Tyler decided on 2026-11-05. Tyler accepted all recommendations.

| Question | Decision | Effect on the plan |
|---|---|---|
| **Q8** Feel pass before M3? | Yes. | The whole pass (Stages 0 to 4) finishes before M3 starts. |
| **Q1** Air stop in 12 or 9 frames | Start at `ADEC` 0.13 (12 frames). | Tyler may move it up toward 0.18 in the Stage 0 panel if it still floats. |
| **Q3** Scale the face with the body | No. Keep the face fixed. | Stage 2 pulse stays at about (0.91, 1.18) and (1.27, 0.73). Revisit only if it reads too weak. |
| **Q6** Sprout lag (A11) | Yes. | Stage 4 includes A11. |
| **Q2** Run speed and gap widths | Keep `RUN` 1.6. | No room changes from speed. |
| **Q4** Longer hit-stop for the root burst | Try 4 frames in the panel before deciding. | Add a hit-stop slider to the Stage 0 panel. |
| **Q5** Fast fall | Defer. | B8 waits for M3 co-design. |
| **Q7** How `game/` stays out of the deploy | Open. Settle before M2 lands. | Not a feel-pass task; nothing merges to `main` until it is settled. |

Open item: the stages have not started. Stage 0 waits for the session building the Roots chase to open a write window and send the green test counts (ground rule 1). Stage 0 must keep every default value identical.

## 10. Done means

The pass is done when:

1. Stages 0 to 4 are committed on `wake-up-game`, each with the suite at N or more checks.
2. The five characterisation tests show the targets Tyler chose.
3. Tyler has played rooms r1 to r4 and the hub and has said the movement feels controlled in the air and on turns.
4. The design doc's gap table (section 7) has been re-measured and no row marked "Large" remains.
