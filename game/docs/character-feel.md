# Character feel: research and design

Status: draft v2, 2026-11-05. v2 rechecks every derived number against the code and every Celeste claim against `Player.cs`. Owner: Tyler. Applies to: the mascot in `game/` (Wake Up).
Reproduce the numbers: `node game/docs/feel_envelope.mjs`. The script copies the constants from `player.js` as of 2026-11-05; it does not import them. Some rows in sections 4 and 5 (reversal frames, camera lag) appear in its output only as raw frame counts. Its "script tap" line (15.1 px) is an older test input and is not the minimum hop in 5.2. Celeste source used: `NoelFB/Celeste`, `Source/Player/Player.cs`.
Implementation plan: `game/docs/character-feel-plan.md`.

## 1. Summary

This document says what best-in-class 2D character feel needs, measures our mascot against it, and lists the changes in priority order.

The core jump is close to Celeste in tiles and in time: 3.26 tiles against 3.50, apex at frame 20 against 21.7, about 39 frames in the air for both. Relative to the body it is lower (1.63 body heights against 2.55). **We keep the jump arc (B1)** because every built room and the reach tests depend on it, not because the evidence shows it is the best arc for a 24 px body.

Five areas are far from best-in-class:

1. Air deceleration takes 23 frames to stop. Celeste takes 8.
2. A ground reversal takes 16 frames. Stopping takes 5. Celeste reverses in 11.
3. There is no ceiling corner correction. Celeste nudges the player up to 4 px sideways around a ceiling corner.
4. The body has two idle frames, one stretch frame and one squash frame. It has no dust, no run cycle, no skid, no edge pose and no response to impact speed.
5. The camera follows every jump vertically. The land sound has the same volume at every fall speed.

The renderer gets no events from the world step today, so effects need a per-step hook first (section 8.3).

Group A changes no movement constant, so it cannot change reach by design. It still needs small `player.js` edits (a landing-speed field and a lower `land` threshold, section 8.3), so the full test suite runs after it. Group B changes physics and needs the room tests re-run. Group C is camera and timing. Priority order:

1. Physics round 1: B3, B2, B5. B4 joins once the reach tests can reverse direction (section 8.2).
2. Visual round: A1 to A5 and A12, with the renderer hook.
3. Camera: C1 and C2.
4. Detail: A7 to A10 and A13.
5. Deferred: B6 to B9, A11, C3 to C7.

Rationale: the largest measured gaps are in control (section 7), and the Ori postmortem says to tune the controls first. Group A has no room risk, so it can ship between physics rounds.

## 2. Terms

Each term has one meaning in this document.

| Term | Meaning |
|---|---|
| Frame | One fixed step of 1/60 s. All speeds are px per frame unless stated. |
| Tile | 12 px (`T` in `state.js`). Celeste tile is 8 px (assumed, see section 3). |
| Jump envelope | The set of heights and distances the mascot can reach with jump held or tapped. |
| Reversal | A change from full speed in one direction to full speed in the other. |
| Coyote window | Frames after leaving a ledge in which a jump press still works. Code name `COY`. |
| Jump buffer | Frames before landing in which a jump press is remembered. Code name `BUF`. |
| Corner correction | A small sideways move that lets the mascot slide past the edge of a ceiling instead of stopping. |
| Apex hold | Reduced gravity near the top of a jump while jump is held. Code name `GH`. |
| Scale pulse | A short change of body width and height at an event (jump, land) that returns to normal over several frames. |
| Hit-stop | A pause of the world for a few frames on impact. Code name `S.hit`. Celeste calls it `Freeze`. |
| Dust puff | One small particle that fades in 12 to 20 frames. |

## 3. Evidence and how much to trust it

Every number in sections 4 to 6 has a grade.

| Grade | Meaning |
|---|---|
| V | Read in primary source text (the Celeste source file, or a named article) during this research. |
| D | Derived by calculation from V values or from our code. The method is in the text. |
| S | Secondary source only (blog, forum, wiki, summary). Use as a hint. |
| T | Design value chosen by us, to tune by eye and ear. No source. |

Source gaps, stated plainly:

- **Super Meat Boy has no published physics numbers.** The Game Developer article "Making Meat Boy Move" and the Team Meat postmortem give principles only. This document does not estimate SMB values.
- The Pittman GDC 2016 jump talk, Swink's book and the Vlambeer talk could not be read in full. Their numbers are not used. Section 6 marks which values are T.
- Celeste's 8 px tile and 320×180 resolution are not in `Player.cs`. The hitbox `new Hitbox(8, 11, -4, -11)` is V. We assume an 8 px tile. Every Celeste value in tiles depends on this assumption; values in px do not.
- Celeste's repo has only `Player.cs`, a PICO-8 folder and two readmes. The jump buffer length (Input class), dust particle size and lifetime (`Dust.cs`), trail fade (`TrailManager.cs`), hair segment count (`PlayerHair.cs`) and per-animation frame counts (`Sprites.xml`) are not available. This document does not state them.
- No source gives dust puff size, lifetime or speed, a land sound scaled by fall speed, or a rule for squash at a 24 px sprite. Those values are grade T.
- The two readme quotes (sections 4.1 and 11) were read in v1 and not rechecked in v2.

## 4. What best-in-class characters do

### 4.1 Celeste (V unless marked)

Constants from `Player.cs`, converted to px per frame (px/s ÷ 60, px/s² ÷ 3600).

| Constant | Source value | Per frame | Meaning |
|---|---|---|---|
| Gravity | 900 px/s² | 0.250 | Applied every frame while airborne. |
| MaxFall | 160 px/s | 2.67 | Terminal speed. |
| FastMaxFall | 240 px/s | 4.00 | Terminal speed while holding down. |
| FastMaxAccel | 300 px/s² | 0.083 | Rate at which terminal speed moves toward FastMaxFall. Starts only once the player already falls at MaxFall. |
| HalfGravThreshold | 40 px/s | 0.67 | Gravity ×0.5 while `abs(vy)` is below this and jump is held (or `AutoJump` is set, as after a spring). |
| MaxRun | 90 px/s | 1.50 | Top ground speed. |
| RunAccel | 1000 px/s² | 0.278 | Ground accel, and also decel toward 0. |
| AirMult | 0.65 | | Multiplies accel in the air. Air accel is 0.181. |
| RunReduce | 400 px/s² | 0.111 | Used only when speed is above MaxRun and input matches. In the air it is 0.072. |
| JumpSpeed | -105 px/s | 1.75 | Launch speed. |
| JumpHBoost | 40 px/s | 0.67 | Added to horizontal speed in the input direction at launch, also from a standstill. |
| VarJumpTime | 0.2 s | 12 frames | While jump is held, vertical speed stays at the launch speed. |
| JumpGraceTime | 0.1 s | 6 frames | Coyote window. |
| UpwardCornerCorrection | 4 px | | Sideways search range when the head hits a ceiling corner. |
| Hitbox | 8×11 px | | Madeline's collision box. |

How the code behaves (read from source):

- **Variable jump** does not cut speed on release. While `varJumpTimer > 0` and jump is held, `Speed.Y = Math.Min(Speed.Y, varJumpSpeed)`. If the player lets go, the timer is set to 0 and gravity takes over.
- **Apex hold:** `mult = (abs(Speed.Y) < HalfGravThreshold && (jump held || AutoJump)) ? .5 : 1`. Gravity is `900 * mult`. The rule is the same on the way up and on the way down.
- **Horizontal movement** uses one rule for stop and start: `Speed.X` approaches `max * moveX` at `RunAccel * mult`, where `mult` is 1 on the ground and `AirMult` in the air. With no input, `moveX` is 0, so the character decelerates at the same rate it accelerates. A reversal uses the same rate the whole way.
- **Corner correction:** when `Speed.Y < 0` and the head hits a solid, the code tries offsets of 1 to 4 px sideways with 1 px up. If `Speed.X <= 0` it tries left. Then, if `Speed.X >= 0`, it tries right. At `Speed.X = 0` it tries both, left first. The first free offset wins, and speed and the variable jump continue. If no offset is free, a ceiling hit more than 0.05 s into the jump ends the variable jump.
- **Jump grace:** `jumpGraceTimer = JumpGraceTime` every frame on the ground, then it counts down in the air. Landing sets no input lock; the stumble below is an animation only.

What the character does visually at each event:

| Event | Scale pulse (x, y) | Dust | Other |
|---|---|---|---|
| Jump | (0.6, 1.4) | 4 puffs at the feet, moving up | Jump sound. |
| Wall jump | (0.6, 1.4) | 4 puffs on the wall side | Wall sound by surface. |
| Land | `squish = min(vy / 240, 1)`, from (1, 1) to (1.6, 0.4). A landing at MaxFall gives (1.4, 0.6). | 8 puffs only if `vy >= 80 px/s` (MaxFall / 2) | Light rumble. A fall of more than 50 px at full fall speed and full run speed plays a stumble animation. The land sound depends on the floor surface, not on fall speed. |
| Bounce up / sideways (`SuperBounce`, `SideBounce`) | (0.5, 1.5) / (1.5, 0.5) | | Directional shake 0.1 s. |
| Dash start | | None (8 for the red booster dash) | Freeze 0.05 s (3 frames; skipped at time rate 0.25 or less), directional shake 0.2 s. Trail snapshots at the start, 0.08 s later and at the end of the 0.15 s dash. Dash particles every 0.02 s. |
| Explode launch | | | Freeze 0.1 s (6 frames). |
| Ground dash-skid | | 1 puff every 0.02 s | Skid animation. |
| Standing still at a ledge edge | | | Edge animation when nearly the whole hitbox hangs over the drop (checks 1 px and 4 px out, 2 px down). |

The scale pulse returns to (1, 1) at 1.75 units per second, linearly, each axis on its own. That is 0.029 per frame. A pulse of 0.4 takes 14 frames to recover. A pulse of 0.6 takes 21 frames.

The sprite also plays a different animation for skid, flip (turn), slow run and fast run. Skid plays when input opposes velocity and speed is above MaxRun. Flip plays when input opposes velocity at lower speed. Jump and fall use separate slow and fast animations; the fast fall animation starts at `vy >= MaxFall`.

Three more facts about the look, all from the source:

- **Footsteps follow animation frames.** The run and walk sounds fire on frames 0 and 6 of the cycle (`Sprite.OnFrameChange`), not on a timer. The sound is chosen by floor surface.
- **The body has no hair in the sprite.** NoelFB's readme says the animation is "never more than a simple frame-by-frame sprite component". Hair is a separate chain drawn on top: `StepPerSegment = (0, 2)`, `StepInFacingPerSegment = 0.5`, `StepApproach = 64`. Per-animation metadata says where the hair attaches (the metadata statement is from a forum quote, grade S).
- **Squash changes the picture only.** The hitbox stays 8×11 (8×6 ducking) while the sprite scales.

Derived values (D), from the constants and the code above:

| Quantity | Value |
|---|---|
| Full jump height | 28.0 px = 3.50 tiles = 2.55 body heights |
| Frames to apex, jump held | 21.7 |
| Air time, full jump | about 40 frames (rise 21.7, fall 18.2) |
| Minimum hop (release after the press frame) | about 6.1 px = 0.77 tiles |
| Run-jump distance, full hold | about 60 px = 7.5 tiles (63 px with JumpHBoost). The script's 8.1 uses twice the rise time; the fall is shorter. |
| Frames to full run speed | 5.4 |
| Frames to stop from full speed on ground | 5.4 |
| Frames to reverse from full speed on ground | 10.8 |
| Frames to stop in the air | 8.3 |
| Frames to reverse in the air | 16.6 |

### 4.2 Super Meat Boy (principles only)

Sources: Game Developer, "Making Meat Boy Move"; Game Developer, Team Meat postmortem. Both are V for the claims below and contain no numbers.

- The movement set is run, jump and wall slide. Holding jump gives a leap and tapping gives a hop.
- A wall jump goes farther than running, so the wall is a speed tool.
- The designers aimed to reduce respawn time, and the replay of earlier deaths made failure watchable.

What we take from it: **fast restart is part of feel.** Our death removes control for 18 frames (0.3 s), then the mascot respawns at the checkpoint with a camera cut. The 12-frame rez fade after that is visual only; the player can move during it. A jump pressed during the 18 frames is dropped (C7). Do not lengthen the death.

### 4.3 Other games and theory

| Source | Claim | Grade |
|---|---|---|
| TASVideos and Data Crystal (community notes) | Super Mario Bros. applies different gravity for rise and fall, chosen by the last jump. | S |
| Ori postmortem (Moon Studios) | Tune the controls first and only continue "when that already feels fun". | V |
| Hollow Knight | Variable height is a jump cancel (community devlog). | S |
| GMTK Platformer Toolkit devlog | Parameters named: jump height, time to apex, downward multiplier (applied while falling, for a snappier landing), jump cutoff (gravity multiplier on early release), max speed, accel, air accel, deceleration, turn speed. | V (names), no values |
| GMTK Platformer Toolkit devlog | Coyote time is "a number set by the developer". Jump buffer is "a few frames before hitting the ground". | V |
| Itay Keren, "Scroll Back" | Camera window: scroll only when the player pushes the edge. Per Keren, Super Mario Bros. catches up at about 25% off center, Sonic and Rastan use a vertical window as tall as a standard jump so small jumps do not move the camera, and Rayman gently snaps when he lands. | V (Keren's analysis) |
| Keren | Visual and vestibular conflict from camera motion can cause nausea. | V |
| Fiedler, "Fix Your Timestep" | Fixed step with an accumulator, clamp the frame time, and interpolate with `alpha = accumulator / dt` when the display rate differs from the step. | V |
| MDN, `requestAnimationFrame` | Callbacks follow the display refresh (60, 75, 120, 144 Hz are common). Use the timestamp. | V |
| Claypool and Claypool (2006) via Normoyle | About 100 ms is the maximum delay for fast, precise games. | S |

### 4.4 Principles

These are our reading of the evidence, in order of how much they matter for feel.

Control:

1. **Input changes motion in the same frame.** No wind-up before a jump or a turn, and no lock after a landing.
2. **Start and stop are fast and about equal.** Celeste reaches full speed in 5.4 frames and stops in 5.4.
3. **Air control is about two thirds of ground control.** Celeste's air accel is 65% of ground accel, for stopping and reversing too.
4. **Jump height is the player's choice.** Hold for 3.5 tiles, tap for under 1.
5. **The game forgives timing and position.** Coyote 6 frames, a jump buffer, 4 px of corner correction. The player never sees these.

Feedback:

6. **Physics events have a visual and a sound.** In Celeste, jump, wall jump, landing, springs and ducking set a scale pulse. Jump, wall jump, hard landings and the dash-skid add dust. Only the landing squash scales with speed. Sounds follow the floor surface, not speed.
7. **Big moments stop the world.** Celeste freezes 3 frames at dash start and 6 at an explosive launch. It does not freeze on landings.
8. **The camera does not fight the jump.** It leads the movement and ignores small vertical motion (Keren).

## 5. Our character now

### 5.1 Physics (`game/player.js`, units px per frame, T = 12, body 18×24)

| Constant | Value | Role |
|---|---|---|
| `G` / `GH` | 0.26 / 0.15 | Gravity / gravity near apex with jump held (when `abs(vy) < 0.8`). |
| `JV` / `RJV` | 4.6 / 4.1 | Jump / root-jump launch speed. |
| `CUT` | 2 | Upward speed is capped to this when jump is released. |
| `MAXF` | 4.6 | Terminal fall speed. |
| `RUN` | 1.6 | Top ground speed. |
| `ACC` / `DEC` | 0.2 / 0.3 | Ground accel with input / decel with no input. |
| `AACC` / `ADEC` | 0.13 / 0.07 | Air accel with input / decel with no input. |
| `COY` / `BUF` | 6 / 6 | Coyote window / jump buffer, frames. |

Already at best-in-class parity (D, from the code):

- Coyote window (6 frames, same as Celeste) and jump buffer (6 frames; Celeste's length is not in `Player.cs`).
- Variable jump (cut at `CUT`) and apex hold (threshold 0.067 tiles/frame vs 0.083 in Celeste).
- Hit-stop of 3 frames on stun (same as Celeste's dash freeze), with the jump press stored during it. The buffer logic in `landing()` also keeps a root press from being spent when a ground jump is about to happen.
- No landing lag: `p.land` changes only the sprite.
- Forgiving hurtboxes: enemy contact uses the body inset by 3 px (12×18), and thorns use the body inset by 2 px against a thorn box smaller than the tile.

### 5.2 Envelope compared with Celeste (D)

| Quantity | Ours | Celeste | Note |
|---|---|---|---|
| Full jump height | 39.1 px = 3.26 tiles = 1.63 body heights | 3.50 tiles = 2.55 body heights | Keep (B1). |
| Minimum hop (release before the next step) | 6.7 px = 0.56 tiles | 0.77 tiles | The test's tap (held on the press step only) is 11.1 px. Keep. |
| Frames to apex / air time | 20 / 39 | 21.7 / about 40 | Keep. |
| Run-jump distance, full hold | 62.4 px = 5.2 tiles = 3.5 body widths | about 60 px = 7.5 tiles = 7.5 body widths | Same in px. See Q2. |
| Arc shape (distance ÷ height) | 1.6 | 2.1 | Ours is steeper. |
| Top speed | 8.0 tiles/s = 0.33 screens/s | 11.3 tiles/s = 0.28 screens/s | Slower in tiles, faster in screens. |
| Time to cross one screen | 180 frames (288 px, 24 tiles) | 213 frames (320 px, 40 tiles) | Ours takes 16% less time. |
| Frames to full speed, ground | 8.0 | 5.4 | Ours is slower. |
| Frames to stop, ground | 5.3 | 5.4 | Parity. |
| Frames to reverse, ground | 16.0 | 10.8 | Ours reverses slowly. |
| Frames to full speed, air | 12.3 | 8.3 | |
| Frames to stop, air | 22.9 | 8.3 | Largest gap. |
| Frames to reverse, air | 24.6 | 16.6 | |

Why reversing is slow: in `player.js:24` the code uses `ACC` whenever input is held, even when input opposes velocity. `DEC` (0.3) is used only with no input. A reversal therefore takes three times as long as a stop.

### 5.3 Look and sound

| Area | Now | File |
|---|---|---|
| Body frames | `idle`, `breath`, `squash`, `stretch`, `land` as fixed ellipse radii `[rx, ry, oy]`. `land` is never selected. | `mascot.js:24` |
| Jump | `stretch` while `vy < 0`. A step change with no ease. | `render.js:133` |
| Land | `squash` for 8 frames (10 in the intro) if the fall speed was above 2.2. Same shape at every speed. The `land` event carries no speed. | `player.js:36`, `render.js:132` |
| Walk | Alternates `idle` and `breath` every 8 frames of time. Not tied to distance. | `render.js:134` |
| Dust, skid, edge pose | None. | |
| Eyes | Look along facing and up or down by `vy`. Blink for 6 frames every 197. | `render.js:136` |
| Sprout | Static. Grows with stage. | `mascot.js:38` |
| Screenshake | Random jitter, picked per draw. The `reduce` flag removes it. Used on stun and intro thud. | `render.js:150` |
| Camera | Position eases 12% per frame to the target. Look-ahead is `face * 12` px. Vertical offset is fixed at -8 px. In an open fall at terminal speed the camera lags 34 px, so about 54 px (12 frames of fall) shows below the feet. | `engine.js` `camera()` |
| Jump sound | Square wave 260 to 520 Hz, 90 ms. Same every time. | `audio.js:43` |
| Land sound | Low-pass noise, 60 ms. Same at every fall speed. | `audio.js:57` |
| Footsteps | None. | |

## 6. Requirements

Words: **must** is required. **should** is a strong recommendation that may be deferred with a stated reason. **may** is optional.
"Room risk" means the change can make a room reachable or unreachable. Every change with room risk must pass `node tools/test_game.mjs` (132 tests on 2026-11-05) before it merges.

### Group A: visual and audio only (no room risk)

| ID | Requirement | Starting value | Grade |
|---|---|---|---|
| A1 | The renderer must replace the fixed `squash`/`stretch` frames with a scale pulse. Pulse state is two numbers, `sx` and `sy`, that return to 1 linearly. | Recovery in 12 frames. | T (Celeste recovery is 14 to 21 frames) |
| A2 | A jump must set the pulse to a stretch. | `sx 0.91, sy 1.18` (rx 10, ry 13). Celeste uses 0.6, 1.4 on an 8×11 sprite; our face does not fit that (A4). | T |
| A3 | A landing must set a squash that scales with landing speed. | Map `vy` 1.0 to `MAXF` onto 0 to 3 px of height loss (ry 11 to 8, rx 11 to 14). Celeste divides by FastMaxFall, so its normal terminal landing gets 2/3 of the maximum. | T for amounts, V for the scaling rule |
| A4 | The pulse must give whole-pixel radii inside the face limits: `rx` 10 to 14, `ry` 8 to 13, with `oy = 11 - ry` so the feet stay on row 42. `shoes()` and `strands()` must read the same radii as `drawBuddy`. | | D (see 8.1) |
| A5 | The game must spawn dust puffs at jump and landing. | Jump: 4 puffs at the feet. Land: 8 puffs if `vy >= MAXF * 0.5`, else 3. Celeste counts are V (4 and 8; no dust below the gate). | V counts, T size, life and the 3 |
| A6 | Each dust puff should be 2 to 3 px wide and live 12 to 20 frames. It rises and slows. | | T |
| A7 | While input opposes velocity on the ground, the mascot should show a skid frame for at least 4 frames and spawn 1 puff every 2 frames. | With B2 the opposing phase lasts about 5 frames. | T (Celeste: flip animation) |
| A8 | The walk cycle must step with distance walked, not with time. One stride frame per 6 px. | `render.js` already does this for Mossback. | T (idiom exists in `render.js:27`) |
| A9 | The land sound should scale in volume and pitch with landing speed. The jump sound should vary its pitch by ±6% on each play. Celeste does neither; this goes beyond the reference. | | T |
| A10 | Footsteps must fire on alternate stride frames of the distance-based walk cycle (A8), not on a timer, as Celeste does (frames 0 and 6). Use ±8% pitch variation and a volume below the jump. | | V for frame-tied rule, T for values |
| A11 | The sprout (stage 1 and above) should lag behind horizontal motion by up to 2 px and spring back, as Madeline's hair does on her hairless body. | | V (Celeste design), T (values) |
| A12 | Every effect in A1 to A13 must have a `reduce` behaviour: no pulse, no dust, no pitch variation, no camera motion beyond today's. Sources: Game Accessibility Guidelines ("avoid any sudden unexpected movement", camera motion off) and WCAG 2.3.3. | | V (guidelines), T |
| A13 | When the mascot stands still and neither foot is over a solid tile, it should show an edge pose: eyes down toward the drop. | | V (Celeste edge animations), T (pose) |

Rationale for A1 to A4: the body is already a computed ellipse, so a pulse changes two radii and needs no new art. The cost is cache entries (8.1) and a limit from the face: eyes, cheeks and mouth sit at fixed offsets from the centre, so `rx` below 10 puts the cheeks on the outline and `ry` below 8 puts the eyes on it (Q3).

Rationale for A13: the box is 18 px wide and the sprite 22 px, so the mascot can stand on 1 px of ledge with both feet over the drop. The pose makes that state read as deliberate.

### Group B: physics changes (room risk)

No Group B change may add a landing lock or an input delay.

| ID | Requirement | Change | Room risk | Grade |
|---|---|---|---|---|
| B1 | The jump arc must not change: `G`, `GH`, `JV`, `RJV`, `CUT`, `COY`, `BUF` stay. | None | None | D |
| B2 | A ground move must use `DEC`, not `ACC`, while input opposes velocity. | Reversal 16 to 13.3 frames (11.3 with B6). | Low. No test presses the opposite direction, so the tests cannot detect it. | D |
| B3 | Air deceleration with no input must be faster. | `ADEC` 0.07 to 0.13: air stop 22.9 to 12.3 frames. Try up to 0.18 (8.9 frames; Celeste 8.3) after playtest. | Medium. Shortens drift after release. It changes every test that releases input in the air (section 8.2). | D |
| B4 | An air move should use a higher rate than `AACC` while input opposes velocity. | 0.18 while opposing, `AACC` after zero: air reversal 24.6 to 21.2 frames. 17.8 frames needs `AACC` 0.18 as well, which changes reach. | Medium. No test exercises it (section 8.2). | D |
| B5 | Ceiling corner correction must exist for the player's own move. When the upward move hits a solid tile or wrapped-enemy box, test from the snapped contact position, because `move()` moves up to 4.6 px at once where Celeste moves 1 px at a time. Try x offsets of 1 to 4 px with y -1 px: left if `vx <= 0`, then right if `vx >= 0`. Take the first free one and keep `vy`. | 4 px, as Celeste. | Low to medium. It makes some ceiling lips passable. | V |
| B6 | Ground accel should be raised so full speed arrives in 6 frames. | `ACC` 0.2 to 0.27. | Low. | D |
| B7 | A ground jump may add a horizontal boost in the input direction. The root jump must not, unless the tests pass with it. `jump()` serves both, so the boost goes in the ground-jump branch. | 0.44 × `RUN` = 0.7 px/frame. With today's `appr()` the boost decays at `AACC` and adds 2.3 px to the longest run-jump. Celeste's decay (0.072) would add 3.9 px. | Medium. It widens the longest gap and adds speed to standing jumps. A boosted root jump would test "r1 thorn strip without the beetle". | D (ratio 40/90 and decay), T (choice of decay) |
| B8 | Fast fall may exist (hold down: terminal speed ×1.5). | `MAXF` 4.6 to 6.9 while down is held, after `vy` reaches `MAXF`, ramp 0.083 px/frame². | None for reach. Affects descents and later items. Touch has no down button, and the camera shows only 5 frames of fall below the feet at 6.9 (C1). | V ratio and ramp |
| B9 | A ledge pop may exist. When the mascot moves sideways into a wall whose top is at most 3 px above its feet, lift it onto the wall top. | 3 px. Celeste uses this only when swimming. | Medium. It adds up to 3 px of reach height; a 3-tile ledge has 3.1 px of margin today. | V (Celeste precedent), T (use on land) |

Rationale for B1: changing the arc would re-open every room. The evidence does not show the arc is right for our body: it is 1.63 body heights against 2.55, and our terminal fall equals our launch speed where Celeste's is 1.5 times it. A fall-gravity multiplier (GMTK's "downward multiplier") is the one arc change worth a later playtest. It keeps apex height but shortens air time, so it changes every run-jump distance.

Rationale for B2 to B4: our hypothesis is that the looseness comes from drift after release and slow reversals, not from gravity, because the arc matches Celeste and the horizontal numbers do not. B3 is the first playtest of that hypothesis.

Risk: B3 can make a room built around the long drift harder. B4, B5, B7 and B9 make the mascot stronger and can break the "needs the root" tests (section 8.2).

### Group C: camera and timing

| ID | Requirement | Value | Grade |
|---|---|---|---|
| C1 | The camera must ignore vertical motion inside a window above the last ground height. Below the window, and in every fall, it must follow at least as fast as today (12% per frame). | Window from 0 to 44 px above the last ground height, taller than one full jump (39 px). | V idea (Keren), T value |
| C2 | The camera should ease to the player's height after landing, not snap. | 6% per frame once grounded for 6 frames. | T |
| C3 | Horizontal look-ahead should follow velocity, not only facing. | `clamp(vx * 8, -16, 16)` px. | T |
| C4 | The renderer may interpolate between fixed steps. Defer until tested on a 120 or 144 Hz display. | `alpha = acc / STEP` | V (Fiedler) |
| C5 | A hit-stop of 3 frames must remain the value for stun. Heavier events may use 6 (Celeste's explode launch). All hit-stops must have a cap. Today `S.hit` is set, not added, so hits in one step give 3 frames, but a burst that hits enemies on 3 different frames freezes 9. Sakurai's Famitsu column describes the same cap rule (fan translation). | Cap: 6 frames in any 30. | V (Celeste), S (Sakurai), T (cap) |
| C6 | Screenshake on impact may become directional (along the impact direction), 6 to 12 frames. | | V idea, T value |
| C7 | A jump pressed in the last 6 frames of a death should be kept: `respawn()` sets `p.buf = BUF`, so the press becomes a ground jump once he touches the floor. Replaying it as `jp` would not work: `respawn()` sets `p.ground = 0`, so with the root item the press would fire a root burst. | 6 frames | T |

## 7. Gap table

| Behaviour | Best-in-class | Ours | Gap size | Group | Room risk |
|---|---|---|---|---|---|
| Air stop | 8 frames | 23 | Large | B3 | Medium |
| Ground reverse | 11 frames | 16 | Medium | B2 | Low |
| Air reverse | 17 frames | 25 | Medium | B4 | Medium |
| Ground start | 5 frames | 8 | Small | B6 | Low |
| Ceiling corner correction | 4 px | none | Large | B5 | Low |
| Jump pulse | scale 0.6, 1.4, ease 14 frames | 1-frame step | Large | A1, A2 | None |
| Land pulse by speed | yes | single shape | Large | A3 | None |
| Dust | jump 4, land 8 | none | Large | A5 | None |
| Run cycle by distance | yes | 2 frames by time | Medium | A8 | None |
| Skid / turn frame | yes | none | Medium | A7 | None |
| Edge pose | yes | none | Small | A13 | None |
| Land sound by speed | Celeste: none (sound follows the floor) | constant | Small, beyond reference | A9 | None |
| Footsteps | tied to animation frames 0 and 6 | none | Medium | A10 | None |
| Secondary motion (hair / sprout) | separate chain on hairless body | static sprout | Medium | A11 | None |
| Camera vertical window | yes (Keren) | follows every jump | Medium | C1 | None |
| Hit-stop | 3 frames | 3 frames | None | | |
| Coyote, buffer, apex hold, no landing lag | yes | yes | None | | |

## 8. Constraints from the code

### 8.1 Sprite cache and rendering

- `drawBuddy` draws the mascot into a 32×48 grid. The `sprite()` cache key joins `f`, eye direction, blink, face, happy, mouth, `dx`, stage, hat and mask. The cache clears completely above 300 entries (`mascot.js:84`).
- `drawBuddy` takes its radii from `FR[f]` and falls back to `idle` for an unknown name. A pulse must either add its radii to `FR` under new names or pass `[rx, ry, oy]` in the look and add them to the key. Do not scale the finished canvas, because that breaks the pixel grid.
- Cache size (D): in play, `look()` gives 6 eye directions (facing ±1, vertical -1, 0, 1), 2 blink states and one stage (0 or 1, never 2 to 4). A2 and A3 add about 8 shapes to the 5 frames: about 13 × 6 × 2 = 156 entries. Speech doubles that through `mouth` to about 312, which causes one full clear. A miss costs one 1,536-cell `drawBuddy`, so measure frame time during speech and jumps, not hit rate.
- Rounding (D, from `render.js`): `draw()` rounds the camera once, shake included, and uses that offset for the room layer, tiles, enemies, mascot, shoes and strands. Each sprite position is rounded with `Math.round`, so tiles and sprites never disagree by 1 px. The mascot can still step 1 px against the view edge while the camera eases. Physics positions are never rounded.

### 8.2 Tests and rooms

- `tools/test_game.mjs` has 132 passing checks. `canReach(room, x, y, items, dir, target)` runs the real `step()` and is called 18 times: r1 high ledge (2), r1 thorn strip (1), r4 ledge rows (14) and r3 floor to step (1). Hand-written loops cover the r1 seed hop, the r1 beetle crossing, r2 and the r3 entry ledge. The hub has no reach test.
- Ten reach checks are negative: r1 high ledge without the root, r1 thorn strip without the beetle, r2 left ledge without a stepping stone, and 7 r4 rows without the root. They fail if a Group B change makes the mascot too strong.
- `canReach` holds one direction for 999, 8, 14 or 20 frames, then releases. No test presses the opposite direction, so the tests cannot see B2 or B4. A passing negative test does not prove a human cannot make the jump. Before B4 merges, `canReach` must also try runs that reverse in the air.
- B3 changes every test that releases input in the air: the `canReach` hold-then-release runs, the r1 beetle and r2 loops, and the two seed-demo tests ("plays one jump + root hop", "the demo must never get him killed"). `demo()` gives no direction, so the demo hop drifts on `ADEC` and B3 moves where it lands.
- Any Group B change must keep all tests passing. If a test fails, either revert the value or move the room geometry, and write the choice in the plan.
- The direct jump checks are vertical only: full jump 38 to 46 px (today 39.1, so 1.1 px of margin), tap hop between 8 px and half of full (today 11.1), root jump +28 to 40 px, `COY` and `BUF`. B2 to B4, B6 and B7 do not change them.

### 8.3 State, events and Undo

- `state.js` says the whole world is one JSON-safe object, so Undo can snapshot it. Pulse and dust state must **not** live in `S`, or Undo would rewind the squash and the dust.
- Today the renderer gets no events. `tick()` in `engine.js` sends each event to `au.sfx()`, `save()` and the torch hook only. `frame()` runs 0 to 5 ticks per animation frame, then calls `draw(S, R)` once with `S` alone.
- Therefore `tick()` must call a new `rend.step(S, ev)` after each `step()`. `rend.step` advances pulse, dust and the trail by one fixed step; `draw()` only reads them. Effects then run at 60 Hz on 120 and 144 Hz displays. `rend.step` should not advance effects while `S.hit > 0`. `S.t` keeps counting during hit-stop, so effect timing must not use it.
- Events stay plain strings, because `tick()`, `au.sfx()` and the tests compare names. The landing speed goes in `S.p` (for example `p.lv`, set next to `p.land`). A3 needs landings from `vy > 1.0`, so the `land` threshold moves from 2.2 to 1.0, and audio gates the land sound by `p.lv`. New event names: `skid` and `footstep`. Do not name an event `step`, because `step()` is the world step.
- `rend.step` must clear dust and the trail on `rez`, on a room change (coordinates shift on a transition) and after `restore()`.

### 8.4 Input

- Phones use a button band with left, right and jump only. Input is digital. No requirement depends on analog stick values. B8 needs a down input, which the band does not have.
- Input is read once per fixed step. A press arriving between steps is held as `jp` until the next step. This costs up to 16.7 ms and is not worth changing.

### 8.5 Frame timing

- `frame()` in `engine.js` runs up to 5 fixed steps per animation frame and draws once. On a 60 Hz display this is exact. On 120 Hz each state draws twice. On 144 Hz the pattern is uneven. Screenshake picks a new random offset per draw, so it shakes faster on fast displays. Fiedler's article is the reference. See C4.

### 8.6 Reduced motion

- The `reduce` flag already removes screenshake and some glitch effects. Requirement A12 extends it.

## 9. What later items need from the controller

The root double jump is built. The air-surf board dash, vine claws and Undo are next. The base controller must not need a rewrite for them.

| Need | Why | Where |
|---|---|---|
| A named locomotion state (`p.mode`: ground, air, surf, climb) | Dash and claws change which rules apply. Today the rules are inline `if` branches in `stepPlayer`. | `player.js` |
| One function for "set velocity with a rule" | The dash needs to override the run accel for a few frames. | `player.js` |
| One press buffer for every action | Jump has `BUF` and the hit-stop store (`p.jq`). Dash and claw presses need the same buffer and the same store during hit-stop and death. | `player.js`, `engine.js` `step()` |
| Corner correction usable in any direction | Celeste has `DashCornerCorrection = 4` for dashes. `move()` is shared with enemies, the drag and the wrapped-enemy ride, so correction must be an option only the player's own move turns on. | `engine.js` `move()` |
| A shared hit-stop call | `S.hit` already exists. Dash start in Celeste uses a 3-frame freeze. | `engine.js` `step()` |
| The event list as the one bridge to sound and visuals | New items add events, not new render calls. | `step()` returns `ev`; `tick()` passes it on (8.3) |
| Afterimage trail from a position history | Celeste's dash adds a trail snapshot at the start, 0.08 s later (about 5 frames) and at the end of the dash. The surf item can copy this. `rend.step` records the positions, not `draw()` and not `S`. | `render.js` |

## 10. Open questions

| # | Question | Owner | Needed by |
|---|---|---|---|
| Q1 | How tight should air control be? Choose `ADEC` 0.13 (12 frames) or 0.18 (9 frames; Celeste is 8.3). | Tyler | Start of the first physics round |
| Q2 | Which unit should gap widths follow? In px and screens per second we already match or beat Celeste; we are slower only in tiles (8 vs 11.3 tiles/s) and body widths. Raising `RUN` to 2.0 (10 tiles/s) flattens the arc but crosses a screen in 2.4 s and changes every room. | Tyler | Before any room is added |
| Q3 | Should the face scale with the pulse? Without that, the pulse stops at about (0.91, 1.18) and (1.27, 0.73), well short of Celeste's (0.6, 1.4). | Tyler | During the visual round |
| Q4 | Does the stun hit-stop stay at 3 frames, or does the root burst get a longer one? | Tyler | Before the next biome |
| Q5 | Do we want fast fall? It changes descents and fits the surf item, but touch has no down button and the camera would need to lead falls. | Tyler | With the surf item |
| Q6 | Should the sprout lag (A11) ship, given the mascot design is a blob with a stem? | Tyler | During the visual round |
| Q7 | `game/` is untracked. Memory says the standalone page stays out of the deploy, and `static.yml` uploads the whole repo. How will this folder (and this doc) be excluded? | Tyler | Before merge to main |

Decided 2026-11-05 (full table in the plan, section 9): Q1 start at 0.13; Q2 keep `RUN` 1.6; Q3 face stays fixed; Q4 try 4 frames in the panel; Q5 defer; Q6 yes, ship the sprout lag; Q7 still open. The feel pass finishes before M3.

## 11. Sources

Verified (read in this research):

- Celeste source, `Source/Player/Player.cs`: https://raw.githubusercontent.com/NoelFB/Celeste/master/Source/Player/Player.cs
- Celeste player readme (says the physics are "very similar to TowerFall's"): https://raw.githubusercontent.com/NoelFB/Celeste/master/Source/Player/Readme.md
- Game Developer, "Making Meat Boy Move": https://www.gamedeveloper.com/design/making-meat-boy-move
- Game Developer, Team Meat postmortem: https://www.gamedeveloper.com/audio/postmortem-team-meat-s-i-super-meat-boy-i-
- Game Developer, Ori postmortem: https://gamedeveloper.com/audio/postmortem-moon-studios-heartfelt-i-ori-and-the-blind-forest-i-
- GMTK Platformer Toolkit, "Behind the code": https://gmtk.itch.io/platformer-toolkit/devlog/395523/behind-the-code
- Itay Keren, "Scroll Back": https://www.gamedeveloper.com/design/scroll-back-the-theory-and-practice-of-cameras-in-side-scrollers
- Glenn Fiedler, "Fix Your Timestep!": https://gafferongames.com/post/fix_your_timestep/
- MDN, `requestAnimationFrame`: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame

Also read (V for the stated claim only):

- Game Accessibility Guidelines: https://gameaccessibilityguidelines.com/full-list/
- WCAG 2.3.3, animation from interactions: https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html
- MDN, `prefers-reduced-motion`: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion

Secondary (hints only):

- TASVideos, Super Mario Bros. notes: https://tasvideos.org/7094S
- Data Crystal, Super Mario Bros. notes: https://datacrystal.tcrf.net/wiki/Super_Mario_Bros.:Notes
- Hit-stop frame ranges for pixel combat (light 2 to 4 frames, heavy 6 to 10): https://gamineai.com/blog/pixel-art-combat-fx-hitstop-smear-frames-impact-timing-2026
- Sakurai on hit-stop caps (fan translation): https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/
- Pixel-art rounding advice: https://forum.kirupa.com/t/how-do-you-stop-pixel-art-sprites-from-jittering-when-the-camera-moves-slowly/680432
- Generic frame-count ranges (idle 2 to 4, walk 4 to 6, run 6 to 8, jump 3 to 5): https://www.sprite-ai.art/fr/blog/pixel-art-animation
- Hollow Knight jump cancel devlog: https://ludonauta.itch.io/platformer-essentials/devlog/1069670/hollow-knight-inspired-movement-with-the-moving-character-recipe
- Claypool latency figure, via https://ntnu.no/ojs/index.php/nikt/article/view/5252

Not read: Pittman GDC 2016 (abstract only), Swink "Game Feel", Vlambeer "Art of Screenshake", Jonasson and Purho "Juice it or Lose it", Thorson's Medium post on Celeste and TowerFall physics (blocked).
