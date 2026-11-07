/* Authored faces for the mascot: whole-face expressions (FACES) and eyelids (LIDS). Lint: tools/lint_anim_faces.mjs (every face and lid on every body level,
   boil variant and lean frame, 1 px of body colour to the outline). Chars as in atlas.js MB; '.' leaves the body colour.

   HOW compose() DRAWS THEM (mascot/atlas.js)
   - look.face='<name>' with FACES[name]={eye,eyeR?,mouth:{rows,ox,oy}}: eye = 7 rows of 6 stamped on each 6x7 eye box (top-left ex-3,ey-3; ey=cy-3,
     ex=cx-5 and cx+4); eyeR replaces it for the right eye. mouth rows are stamped at (cx+ox, cy+3+oy). Every mouth here stays in columns cx-3..cx+2 and
     rows cy+2..cy+5 (the mouth box the body lint keeps clear). Verified on every BODY level and LEAN frame only. On other agents' pose frames the unflipped
     face box is guaranteed by lintPoseFrames, but on a flip:1 frame the face moves to 33-fcx and the 6-wide mouths (hurt strain smug yawn3 ouch, like scared)
     reach a column nothing checks: see the note for atlas.js below.
     A face replaces the eyes, the blink/sleep bar, the lid and the mouth, so while a face is set BS.blink and BS.lid do nothing.
     Faces are static: the pupils do not follow look.dir, and they are NOT mirrored by flip or a negative lean (ouch always shuts his left eye, smug always
     glances to the viewer's right). That is fine for the moments below; if a mirrored ouch/smug is ever wanted, add ouchL/smugL with eye and eyeR swapped and mirrored.
   - look.lid=1..4 with LIDS[n-1] = 5 rows of 4 stamped on the white interior (ex-2,ey-2) after the normal eye and its pupil:
       lid 1  upper quarter: a heavy ink lid line under the top of the box; the pupil still tracks look.dir (relaxed, content)
       lid 2  half: body colour, then the lid line with a centred 2 px pupil stub under it; ignores look.dir (a tracked pupil would vanish under it when looking up)
       lid 3  three quarters: lid line on the middle row with a centred 2 px pupil stub under it (like the pens eye); ignores look.dir
       lid 4  almost closed: a slit of white with a centred pupil stub under the lid line; ignores look.dir
     blink:1 (the 1 px bar) wins over a lid, so a lid can stay set while blink toggles.
     NEVER combine lid with face 'scared'/'love'/'awe' or pens: compose stamps the lid after those branches too (see the note for atlas.js below).

   WIRING (os.js; hold times in ms for play()/setTimeout; RESET should also clear lid: add lid:0 to RESET at os.js:1323)
   - Blink (the timer at os.js:2039, now blink:1 for 120 ms): lid 2 60 -> blink:1 60 -> lid 2 60 -> lid 0. Skip it while BS.face is one of these FACES
     (it would do nothing); scared/huh/awe/love still blink as today.
     Relaxed idle (no input for a while, perched): every few blinks rest on lid 1 for 1500..3000 ms, then lid 0.
   - Getting sleepy before the nap saver (ssNap, os.js:948): sleepy 900 -> yawn1 140 -> yawn2 140 -> yawn3 700 (hold the big yawn) -> yawn2 120 -> sleepy 600 ->
     lid 3 400 -> lid 4 400 -> then BS.sleep=1 as today. Pair yawn3 with lv:'T1' or 'T2' (a stretch) and yawn1/yawn2 with rest.
   - Waking (ssStop, was==='nap', os.js:960): lid 4 200 -> lid 3 160 -> lid 2 140 -> blink:1 80 -> lid 0 + the existing stretch hop (happy) 130 -> idle 220 -> RESET.
   - Dropped / landing (dropBuddy land(), os.js:1442): on the squash frame use face:'hurt' when the fall was long (far) else face:'relief',
     110 ms squash then 260 ms idle with the same face, then RESET. Landing on a window top after a hop (stand(), os.js:1474): relief on the S3 and S1
     frames (90, 70) and keep it 300 ms on idle instead of happy.
   - Hit by something / dragged roughly / poked while busy: face:'ouch' 400 ms, or hurt for a harder hit, then worry 600 ms, then RESET.
     The Trash fall (os.js:1579) and the "don't do it again" scold (os.js:1840) can open on ouch 300 before the existing scared face.
   - Effort: pushing or pulling something (dragging an icon, lifting the Compost scoop at os.js:861, the crouch before a window hop at os.js:1477):
     face:'strain' on every frame of the push (hold as long as the push lasts; 70..120 ms per body frame), then relief 300 on release.
   - Pleased with himself (a trick done, a seed planted, the 100-seed alert at os.js:2100): face:'smug' 700 ms after the bounce, then RESET.
   - Worried: the cursor heads for the Trash while carrying him (trashHot true), a window he stands on is about to close: face:'worry' while it lasts.
   REDUCED MOTION: play() shows only the last frame, so give each moment its key face as a single still held for its whole duration:
     nap = sleepy (instead of the sleep bar), hit = hurt, effort = strain, landing = relief; no blink and no lid stepping. The one still to show when only
     one is used: face:'sleepy' for the nap, otherwise the plain open eyes (lid 0).

   NOTES FOR atlas.js / lint_mascot_body.mjs (not edited here):
   - compose stamps look.lid after the scared/love/awe/pens branches as well as after the plain pupil. If lids should only ever apply to the plain eye,
     move the LIDS stamp into the final else (the plain pupil branch) of the eye loop.
   - lintPoseFrames checks the face box on the unflipped frame only; with flip:1 the face is drawn at 33-fcx, so mouth column cx+2 lands on the mirror of
     fcx-4, which nothing guarantees is body colour (the LEAN frames were fattened by hand there). It should also check the mirrored face, as lintLean's frames were drawn to. */
const mir=rows=>rows.map(r=>[...r].reverse().join(''));
/* eyes, left box (6x7); mir() makes the right one where they are not symmetric */
const SHUT_GT=["......","kk....","..kk..","....kk","..kk..","kk....","......"];   // > squeezed shut (hurt, ouch)
const HEAVY  =["......","......","......","kkkkkk","kwkkwk","kwwwwk",".kkkk."];   // the bottom half of the eye under a flat lid, pupil hanging from it (sleepy, yawn1)
const SQUINT =["......","kkk...","...kkk","......","kkkkkk",".kkkk.","......"];   // brow pulled down to the nose over an eye pressed into a thick line (strain)
const GLANCE =["......","......","kkkkkk","kwwkkk","kwwkkk","kwwwwk",".kkkk."];   // half lid, pupil pushed to the viewer's right (smug)
const ARC_UP =["......","......",".kkkk.","k....k","......","......","......"];   // happy closed arcs (relief)
const SLIT   =["......","......","......","......","kkkkkk","kwwwwk",".kkkk."];   // a sliver of white under a low lid (yawn2)
const ARC_DN =["......","......","......","k....k",".kkkk.","......","......"];   // closed, sagging (yawn3)
const BROWS  =["......","...kkk","kkk...","......",".kkkk.","kwkkwk",".kkkk."];   // brow up toward the nose over a small eye (worry)
const WIDE   =[".kkkk.","kwwwwk","kwwwwk","kwkwwk","kwkwwk","kwwwwk",".kkkk."];   // the open eye with a thin, shocked pupil (ouch)
export const FACES={
  hurt:  {eye:SHUT_GT,eyeR:mir(SHUT_GT),mouth:{rows:["..kk..",".k..k.","k....k"],ox:-3,oy:0}},          // > <  and a wince
  sleepy:{eye:HEAVY,mouth:{rows:["kkkk","kmmk",".kk."],ox:-2,oy:0}},                                    // heavy lids, slack mouth hanging open a little
  strain:{eye:SQUINT,eyeR:mir(SQUINT),mouth:{rows:["kkkkkk","kwkwwk","kkkkkk"],ox:-3,oy:0}},           // squint and gritted teeth
  smug:  {eye:GLANCE,mouth:{rows:[".....k","k...kk",".kkkk."],ox:-3,oy:-1}},                           // sideways look, grin pulled up on one side
  relief:{eye:ARC_UP,mouth:{rows:["k..k",".kk."],ox:-2,oy:0}},                                         // ^ ^ and a soft smile
  yawn1: {eye:HEAVY,mouth:{rows:[".kk.","kmmk",".kk."],ox:-2,oy:0}},                                   // the yawn starts: small o
  yawn2: {eye:SLIT,mouth:{rows:[".kk.","kmmk","kmmk",".kk."],ox:-2,oy:-1}},                            // taller o, eyes nearly shut
  yawn3: {eye:ARC_DN,mouth:{rows:[".kkkk.","kmmmmk","kmRRmk",".kkkk."],ox:-3,oy:-1}},                  // wide open with a tongue, eyes shut
  worry: {eye:BROWS,eyeR:mir(BROWS),mouth:{rows:[".kk.k","k..k."],ox:-3,oy:0}},                        // brows up and in, wobbly mouth
  ouch:  {eye:SHUT_GT,eyeR:WIDE,mouth:{rows:["kkkkk.","kwkwkk",".kkkk."],ox:-3,oy:0}},                 // left eye shut, right eye wide, lopsided grimace
};
/* eyelids: 5 rows of 4 over the eye's white interior; index = look.lid - 1 */
export const LIDS=[
  ["kkkk","....","....","....","...."],   // 1 upper quarter
  ["rrrr","kkkk","wkkw","wwww","wwww"],   // 2 half, pupil stub under the lid
  ["rrrr","rrrr","kkkk","wkkw","wwww"],   // 3 three quarters, pupil stub under the lid
  ["rrrr","rrrr","rrrr","kkkk","wkkw"],   // 4 almost closed slit
];
