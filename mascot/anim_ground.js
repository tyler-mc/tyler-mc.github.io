/* Authored mascot frames: GROUND (the redesign). Standing tilts and reactions in the 40x64 cell, NOT baked: compose() adds the usual upright face at (fcx,cy),
   the stem, the upright leaf and any hat at `tip`, and the arm nubs cast from `ctr` (the resting pair [210,330] unless the look says otherwise), so face,
   hat, stage and arms flags work as on any BODY level. Drawn with compose({pose:'ground:<i>', flip, ...}); flip:1 mirrors (x -> 39-x, face at 41-fcx).
   Lint: node tools/lint_anim_ground.mjs (lintPoseFrames plus the checks in its header).
   Each frame: v = the body (k/r/p/R only), feet = [left shoe, right shoe] in the feet.js shoe design (drawn behind the body), tip = the left pixel of the
   4 px head cap (the body's top row), ctr = where the arms are cast from.

   HOW THEY ARE DRAWN. Each body is an approved BODY level (rest, S1, S2, T1) bent about its base: its smooth outline is rotated about the base centre (20,58)
   and sheared further at the top (a bend, not a rigid turn), the level's own top three rows (the 4 px cap and the tip that curls right) are re-stamped level
   at the tilted tip so the stem and hats seat the same way in every frame, each side is kept one-humped with convex stair steps, and the outline, the
   upper-left highlight streak, the right rim shade and the base shade band are redrawn with the rules read off BODY.rest. One variant each (no boil).
   Every body is grounded (last row 57). Lean = the angle from the body's pixel centroid to the cap centre, minus the same on BODY.rest (which already
   curls about 8 deg right), so 0 = upright rest.

   FRAMES (index name  source  lean  face fcx,cy  tip  soles [left,right]: lowest shoe row, 59 = planted)
     0 lean1    rest  +7.4  21,46  23,32  59,59  standing lean to the right, shoes planted (stand).
     1 lean2    rest +12.5  22,46  25,32  59,59  further right, weight on the right shoe (flattened splay shoe); the left shoe stays planted, unweighted.
     2 recoil   S2   +11.6  21,48  24,36  57,59  poked from the LEFT: squashed, pushed over to the right; the left shoe lifted 2 rows, toe kicked up.
     3 recoil2  T1    -4.2  19,45  18,30  59,59  the rebound: taller, swaying back to the left, shoes planted.
     4 skid1    S1    -8.8  18,47  16,34  59,59  a hard stop while travelling RIGHT: leaning back (left), small squash, the back shoe dug in flat,
                                                 the front shoe pushed forward with its toe up.
     5 skid2    rest -13.0  17,46  14,32  59,59  the slide: leaning back further and taller (stretched along the lean), the front shoe further forward, both toes up
                                                 (rocked onto the heels).
     6 dizzy1   rest  -6.9  19,46  17,32  59,59  dizzy wobble tipped LEFT: the head's right side raised, weight sagging into the left (left shoe splayed).
     7 dizzy2   rest  +7.6  21,46  23,32  59,59  tipped RIGHT (right shoe splayed).
     8 edge1    rest  +9.5  21,46  24,32  59,61  balancing on a ledge whose end is on his RIGHT: leaning out, the left shoe planted, the right shoe
                                                 hanging off the end, toes down (below the ledge top: rows 54..61).
     9 edge2    rest +12.9  22,46  25,32  59,62  leaning out further, the hanging shoe one row lower.
   Related frames stay close (body silhouette px that differ): lean1-lean2 40, skid1-skid2 65, edge1-edge2 24; dizzy1 and dizzy2 differ from rest by 79 and 66 (the wobble
   passes through rest); recoil -> recoil2 is a deliberate snap (squash-right to stretch-left).
   The tips stay inside columns 10..25 so the party hat (tip.x-10..tip.x+8) and the stage-4 leaf (to tip.x+14) never clip, plain or flipped.

   WIRING NOTE (os.js: play([[look,ms],...]) poses by setTimeout, 60 to 180 ms; RESET clears pose and flip. Wake Up game: 60 Hz steps, not wired in this
   repo yet). A pose look is {pose:'ground:<i>', flip:0|1}; it replaces lv/ft/lean for the body; face, hat, stage, arms, fx still apply. Under reduced
   motion play() shows only the LAST frame, so a sequence ending in RESET shows nothing extra; the static poses below are for moments that should still read.
   - POKE, huh(px) (today: S2 'together' 110 ms -> T1 'stand' 150 ms -> idle 1550 ms). With the same flip rule (flip:1 when the click is right of his centre,
     so he always recoils away from the poke):
       play([[{...o,pose:'ground:2',arms:[150,30]},110],[{...o,pose:'ground:3',arms:[190,350]},150],[{pose:0,flip:0,face:'huh',f:'idle',arms:undefined},1550],[RESET,0]])
     Game: recoil 6-7 steps, recoil2 9 steps, then rest. Reduced motion: no pose change (the huh face only), as today.
   - SKID (the game's skid when he stops or turns at speed; an OS walk that stops): skid1 80 ms (game 5 steps) -> skid2 held while still sliding
     (OS 150-250 ms; game while |vx| is above the stop speed) -> skid1 70 ms (4 steps) -> rest. flip:1 when travelling LEFT. Pair it with the dust fx on
     the side of travel (anim_fx.js). Reduced motion: static skid1 for the slide, then rest.
   - DIZZY after a hard (far) fall: append to the far landing in dropBuddy -> land(true), after its squash/settle beats:
       [{pose:'ground:6',face:'worry'},150],[{pose:0,f:'idle'},90],[{pose:'ground:7'},150],[{pose:0},90]  x3 (about 1.4 s), then [RESET,0].
     Game: 9 / 5 / 9 / 5 steps. Never step straight from 6 to 7 (they differ by about 140 px): the wobble goes through upright rest.
     Reduced motion: static dizzy1 with the worry face for about 600 ms, then RESET.
   - EDGE BALANCE (perchTick, perched on a window's top edge near its end): the ledge's end must fall between the planted left shoe (it ends at art column
     15) and the hanging right shoe (it starts at column 27 on edge1, 28 on edge2); his centre is column 20, so he is 0 to 7 art px inside the end. With
     sc = buddy.offsetWidth/40:
       0 <= L.w - perch.dx <= 7*sc  -> {pose:'ground:8', flip:0, air:1, arms:[180,0]}   (the end is on his right)
       0 <= perch.dx <= 7*sc        -> {pose:'ground:8', flip:1, air:1, arms:[180,0]}   (the left end)
     (perchTick already drops him once his centre passes the end.) Arms out [180,0] (the arms.js balancing pair) is what sets the edge apart from the
     standing lean, whose body it shares within about 25 px. air:1 because the ground shadow would hang over the drop. Every 2 to 4 s wobble 8 -> 9 -> 8
     (180, 140, 180 ms; game 11/8/11 steps). Set the pose only when it changes, not every rAF tick; clear it (pose:0, air:0, arms:undefined) when he moves
     back from the end. Reduced motion: static edge1 with arms [180,0], no wobble.
   - STANDING LEAN (leaning toward something: the pointer resting near him, the window he is about to hop onto before hopOnto's anticipation squash,
     an alert that pops up beside him): lean1 90 ms -> lean2 held (up to about 1.5 s) -> lean1 90 ms -> RESET; flip:1 to lean left. Game: 6 / held / 6 steps.
     Reduced motion: static lean1 while it lasts.
   Static reduced-motion poses, in one line: poke none, skid 4, dizzy 6, edge 8, lean 0.
   ARMS: the default resting pair is checked on every frame (plain and flipped); posed arms (e.g. [150,30] on recoil) are cast from ctr like on any level.
   HATS ride on tip unrotated (the brim stays level on the level cap); the hat never covers the eye rows. Not drawn here: the cower and the soft/hard
   landings (built in code from S3/S2/S1, feet poses and arm angles). */
export const ANIM_GROUND={frames:[
  {name:"lean1",x0:9,y0:32,fcx:21,cy:46,tip:[23,32],ctr:[21,45],v:[[
      "..............kkkk......",
      "............kkrrrRk.....",
      "..........kkrrrrrRk.....",
      ".......kkkprrrrrrRk.....",
      ".....kkppprrrrrrrrRk....",
      "....krprrrrrrrrrrrRk....",
      "...krprrrrrrrrrrrrrRk...",
      "..krprrrrrrrrrrrrrrrRk..",
      ".krprrrrrrrrrrrrrrrrrRk.",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "kRrrrrrrrrrrrrrrrrrrrRRk",
      "kRrrrrrrrrrrrrrrrrrrrrRk",
      ".kRRrrrrrrrrrrrrrrrrRRk.",
      "..kRRRrrrrrrrrrrrrRRRk..",
      "...kRRRRRRRRRRRRRRRRk...",
      "....kRRRRRRRRRRRRRkk....",
      ".....kkkkkkkkkkkkk......"
    ]],
    feet:[[4,53,[
      "..kkkk......",
      ".kuuuUkk....",
      "kuuUUUUUkkk.",
      "kuUUUUUUUUUk",
      "kUUUUUUUUUvk",
      ".kVVUUUUVVVk",
      "..kkkkkkkkk."
    ]],[24,53,[
      "......kkkk..",
      "....kkUuuuk.",
      ".kkkUUUUUuuk",
      "kUUUUUUUUUuk",
      "kvUUUUUUUUUk",
      "kVVVUUUUVVk.",
      ".kkkkkkkkk.."
    ]]]},
  {name:"lean2",x0:9,y0:32,fcx:22,cy:46,tip:[25,32],ctr:[22,45],v:[[
      "................kkkk.....",
      "..............kkrrrRk....",
      "............kkrrrrrRk....",
      ".........kkkprrrrrrRk....",
      ".......kkppprrrrrrrRk....",
      ".....kkpprrrrrrrrrrRk....",
      "....krprrrrrrrrrrrrrRk...",
      "...krprrrrrrrrrrrrrrrRk..",
      "..krprrrrrrrrrrrrrrrrRk..",
      ".krprrrrrrrrrrrrrrrrrrrkk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "kRrrrrrrrrrrrrrrrrrrrrRRk",
      "kRrrrrrrrrrrrrrrrrrrrrRk.",
      ".kRRrrrrrrrrrrrrrrrrRRk..",
      "..kRRRrrrrrrrrrrrrRRRk...",
      "...kRRRRRRRRRRRRRRRRk....",
      "....kkRRRRRRRRRRRRRk.....",
      "......kkkkkkkkkkkkk......"
    ]],
    feet:[[4,53,[
      "..kkkk......",
      ".kuuuUkk....",
      "kuuUUUUUkkk.",
      "kuUUUUUUUUUk",
      "kUUUUUUUUUvk",
      ".kVVUUUUVVVk",
      "..kkkkkkkkk."
    ]],[25,55,[
      "......kkkkkk..",
      ".kkkkkUUuuuuk.",
      "kvUUUUUUUUUUuk",
      "kVVVUUUUUUVVVk",
      ".kkkkkkkkkkkk."
    ]]]},
  {name:"recoil",x0:7,y0:36,fcx:21,cy:48,tip:[24,36],ctr:[22,47],v:[[
      ".................kkkk........",
      "..............kkkrrrRk.......",
      "............kkrrrrrrrRk......",
      "........kkkkprrrrrrrrRk......",
      ".....kkkpppprrrrrrrrrrRk.....",
      "...kkppprrrrrrrrrrrrrrrrkk...",
      "..krprrrrrrrrrrrrrrrrrrrRk...",
      ".krprrrrrrrrrrrrrrrrrrrrrRk..",
      "krprrrrrrrrrrrrrrrrrrrrrrrRk.",
      "krrrrrrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrrrrrRk",
      "kRrrrrrrrrrrrrrrrrrrrrrrrrRRk",
      "kRrrrrrrrrrrrrrrrrrrrrrrrrrRk",
      ".kRRrrrrrrrrrrrrrrrrrrrrrrRRk",
      "..kRRRrrrrrrrrrrrrrrrrrrRRRk.",
      "...kkRRRRRRRRRRRRRRRRRRRRRk..",
      ".....kkkRRRRRRRRRRRRRRRRkk...",
      "........kkkkkkkkkkkkkkkk....."
    ]],
    feet:[[1,50,[
      ".kkkk.......",
      "kuuuUkk.....",
      "kuuUUUUkk...",
      "kuUUUUUUUkk.",
      "kVUUUUUUUUvk",
      ".kVVUUUUUUvk",
      "..kkVVVVVVVk",
      "....kkkkkkk."
    ]],[25,55,[
      "......kkkkkk..",
      ".kkkkkUUuuuuk.",
      "kvUUUUUUUUUUuk",
      "kVVVUUUUUUVVVk",
      ".kkkkkkkkkkkk."
    ]]]},
  {name:"recoil2",x0:7,y0:30,fcx:19,cy:45,tip:[18,30],ctr:[19,44],v:[[
      "...........kkkk.........",
      ".........kkrrrRk........",
      ".......kkrrrrrRk........",
      ".....kkprrrrrrrRk.......",
      "....krprrrrrrrrRk.......",
      "...krprrrrrrrrrrRk......",
      "..krprrrrrrrrrrrrRk.....",
      ".krprrrrrrrrrrrrrrRk....",
      "krprrrrrrrrrrrrrrrrRk...",
      "krrrrrrrrrrrrrrrrrrrrkk.",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      ".kRrrrrrrrrrrrrrrrrrrRRk",
      "..kRrrrrrrrrrrrrrrrrrrRk",
      "...kRRrrrrrrrrrrrrrrRRk.",
      "....kRRRrrrrrrrrrrRRRk..",
      ".....kRRRRRRRRRRRRRRk...",
      "......kRRRRRRRRRRRRk....",
      ".......kkkkkkkkkkkk....."
    ]],
    feet:[[4,53,[
      "..kkkk......",
      ".kuuuUkk....",
      "kuuUUUUUkkk.",
      "kuUUUUUUUUUk",
      "kUUUUUUUUUvk",
      ".kVVUUUUVVVk",
      "..kkkkkkkkk."
    ]],[24,53,[
      "......kkkk..",
      "....kkUuuuk.",
      ".kkkUUUUUuuk",
      "kUUUUUUUUUuk",
      "kvUUUUUUUUUk",
      "kVVVUUUUVVk.",
      ".kkkkkkkkk.."
    ]]]},
  {name:"skid1",x0:5,y0:34,fcx:18,cy:47,tip:[16,34],ctr:[18,46],v:[[
      "...........kkkk............",
      ".........kkrrrRk...........",
      ".......kkrrrrrRk...........",
      ".....kkprrrrrrrrkk.........",
      "....krprrrrrrrrrrrkk.......",
      "...krprrrrrrrrrrrrrRk......",
      "..krprrrrrrrrrrrrrrrRk.....",
      ".krprrrrrrrrrrrrrrrrrrkkk..",
      "krprrrrrrrrrrrrrrrrrrrrrRk.",
      "krrrrrrrrrrrrrrrrrrrrrrrRk.",
      "krrrrrrrrrrrrrrrrrrrrrrrRk.",
      "krrrrrrrrrrrrrrrrrrrrrrrRk.",
      "krrrrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrrrRk",
      "kRrrrrrrrrrrrrrrrrrrrrrrRRk",
      ".kRrrrrrrrrrrrrrrrrrrrrrRk.",
      "..kRRrrrrrrrrrrrrrrrrrRRk..",
      "...kRRRrrrrrrrrrrrrrRRRk...",
      "....kRRRRRRRRRRRRRRRRRk....",
      ".....kkRRRRRRRRRRRRRkk.....",
      ".......kkkkkkkkkkkkk......."
    ]],
    feet:[[6,53,[
      "..kkkk......",
      ".kuuuUkk....",
      "kuuUUUUUkkk.",
      "kuUUUUUUUUUk",
      "kUUUUUUUUUvk",
      ".kVVUUUUVVVk",
      "..kkkkkkkkk."
    ]],[26,52,[
      ".......kkkk.",
      ".....kkUuuuk",
      "...kkUUUUuuk",
      ".kkUUUUUUUuk",
      "kvUUUUUUUUVk",
      "kvUUUUUUVVk.",
      "kVVVVVVVkk..",
      ".kkkkkkk...."
    ]]]},
  {name:"skid2",x0:5,y0:32,fcx:17,cy:46,tip:[14,32],ctr:[17,45],v:[[
      ".........kkkk............",
      ".......kkrrrRk...........",
      ".....kkrrrrrRk...........",
      "....krprrrrrrrkk.........",
      "...krprrrrrrrrrRk........",
      "..krprrrrrrrrrrrRk.......",
      ".krprrrrrrrrrrrrrrkk.....",
      "krprrrrrrrrrrrrrrrrrkk...",
      "krprrrrrrrrrrrrrrrrrrRk..",
      "krrrrrrrrrrrrrrrrrrrrrRk.",
      "krrrrrrrrrrrrrrrrrrrrrRk.",
      "krrrrrrrrrrrrrrrrrrrrrRk.",
      "krrrrrrrrrrrrrrrrrrrrrRk.",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "kRrrrrrrrrrrrrrrrrrrrrRRk",
      ".kRrrrrrrrrrrrrrrrrrrrrRk",
      "..kRRrrrrrrrrrrrrrrrrrRRk",
      "...kRRRrrrrrrrrrrrrrRRRk.",
      "....kRRRRRRRRRRRRRRRRkk..",
      ".....kkRRRRRRRRRRRRkk....",
      ".......kkkkkkkkkkkk......"
    ]],
    feet:[[6,52,[
      ".kkkk.......",
      "kuuuUkk.....",
      "kuuUUUUkk...",
      "kuUUUUUUUkk.",
      "kVUUUUUUUUvk",
      ".kVVUUUUUUvk",
      "..kkVVVVVVVk",
      "....kkkkkkk."
    ]],[28,52,[
      ".......kkkk.",
      ".....kkUuuuk",
      "...kkUUUUuuk",
      ".kkUUUUUUUuk",
      "kvUUUUUUUUVk",
      "kvUUUUUUVVk.",
      "kVVVVVVVkk..",
      ".kkkkkkk...."
    ]]]},
  {name:"dizzy1",x0:7,y0:32,fcx:19,cy:46,tip:[17,32],ctr:[19,45],v:[[
      "..........kkkk..........",
      "........kkrrrRk.........",
      "......kkrrrrrRk.........",
      "....kkprrrrrrrrkk.......",
      "...krprrrrrrrrrrk.......",
      "..krprrrrrrrrrrrrkk.....",
      ".krprrrrrrrrrrrrrrrk....",
      "krprrrrrrrrrrrrrrrrrkk..",
      "krprrrrrrrrrrrrrrrrrrRk.",
      "krrrrrrrrrrrrrrrrrrrrRk.",
      "krrrrrrrrrrrrrrrrrrrrRk.",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "kRrrrrrrrrrrrrrrrrrrrRRk",
      "kRrrrrrrrrrrrrrrrrrrrrRk",
      ".kRRrrrrrrrrrrrrrrrrRRk.",
      "..kRRRrrrrrrrrrrrrRRRk..",
      "...kRRRRRRRRRRRRRRRRk...",
      "....kRRRRRRRRRRRRRkk....",
      ".....kkkkkkkkkkkkk......"
    ]],
    feet:[[1,55,[
      "..kkkkkk......",
      ".kuuuuUUkkkkk.",
      "kuUUUUUUUUUUvk",
      "kVVVUUUUUUVVVk",
      ".kkkkkkkkkkkk."
    ]],[24,53,[
      "......kkkk..",
      "....kkUuuuk.",
      ".kkkUUUUUuuk",
      "kUUUUUUUUUuk",
      "kvUUUUUUUUUk",
      "kVVVUUUUVVk.",
      ".kkkkkkkkk.."
    ]]]},
  {name:"dizzy2",x0:9,y0:32,fcx:21,cy:46,tip:[23,32],ctr:[21,45],v:[[
      "..............kkkk......",
      "............kkrrrRk.....",
      "..........kkrrrrrRk.....",
      ".......kkkprrrrrrRk.....",
      ".....kkppprrrrrrrRk.....",
      "....krprrrrrrrrrrRk.....",
      "...krprrrrrrrrrrrrRk....",
      "..krprrrrrrrrrrrrrrRk...",
      ".krprrrrrrrrrrrrrrrrRk..",
      "krrrrrrrrrrrrrrrrrrrrRk.",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrRk",
      "kRrrrrrrrrrrrrrrrrrrrRRk",
      "kRrrrrrrrrrrrrrrrrrrrrRk",
      ".kRRrrrrrrrrrrrrrrrrRRk.",
      "..kRRRrrrrrrrrrrrrRRRk..",
      "...kRRRRRRRRRRRRRRRRk...",
      "....kkRRRRRRRRRRRRRk....",
      "......kkkkkkkkkkkkk....."
    ]],
    feet:[[4,53,[
      "..kkkk......",
      ".kuuuUkk....",
      "kuuUUUUUkkk.",
      "kuUUUUUUUUUk",
      "kUUUUUUUUUvk",
      ".kVVUUUUVVVk",
      "..kkkkkkkkk."
    ]],[25,55,[
      "......kkkkkk..",
      ".kkkkkUUuuuuk.",
      "kvUUUUUUUUUUuk",
      "kVVVUUUUUUVVVk",
      ".kkkkkkkkkkkk."
    ]]]},
  {name:"edge1",x0:9,y0:32,fcx:21,cy:46,tip:[24,32],ctr:[22,45],v:[[
      "...............kkkk......",
      ".............kkrrrRk.....",
      "...........kkrrrrrRk.....",
      "........kkkprrrrrrRk.....",
      "......kkppprrrrrrrRk.....",
      "....kkpprrrrrrrrrrRk.....",
      "...krprrrrrrrrrrrrrRk....",
      "..krprrrrrrrrrrrrrrrRk...",
      ".krprrrrrrrrrrrrrrrrrRk..",
      "krrrrrrrrrrrrrrrrrrrrrRk.",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "kRrrrrrrrrrrrrrrrrrrrrRRk",
      "kRrrrrrrrrrrrrrrrrrrrrrRk",
      ".kRRrrrrrrrrrrrrrrrrrRRk.",
      "..kRRRrrrrrrrrrrrrrRRRk..",
      "...kRRRRRRRRRRRRRRRRkk...",
      "....kRRRRRRRRRRRRRkk.....",
      ".....kkkkkkkkkkkkk......."
    ]],
    feet:[[4,53,[
      "..kkkk......",
      ".kuuuUkk....",
      "kuuUUUUUkkk.",
      "kuUUUUUUUUUk",
      "kUUUUUUUUUvk",
      ".kVVUUUUVVVk",
      "..kkkkkkkkk."
    ]],[27,54,[
      ".kkkk....",
      "kvUUUkk..",
      "kvUUUUuk.",
      "kVvUUUuuk",
      "kVvUUUuuk",
      ".kVvUUUuk",
      "..kVVVVk.",
      "...kkkk.."
    ]]]},
  {name:"edge2",x0:9,y0:32,fcx:22,cy:46,tip:[25,32],ctr:[22,45],v:[[
      "................kkkk.....",
      "..............kkrrrRk....",
      "............kkrrrrrRk....",
      ".........kkkprrrrrrRk....",
      ".......kkppprrrrrrrRk....",
      ".....kkpprrrrrrrrrrRk....",
      "....krprrrrrrrrrrrrRk....",
      "...krprrrrrrrrrrrrrrRk...",
      "..krprrrrrrrrrrrrrrrrRk..",
      ".krprrrrrrrrrrrrrrrrrrRk.",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrrrrRk",
      "kRrrrrrrrrrrrrrrrrrrrrRRk",
      "kRrrrrrrrrrrrrrrrrrrrrRk.",
      "kRRrrrrrrrrrrrrrrrrrRRk..",
      ".kRRRrrrrrrrrrrrrrRRRk...",
      "..kkRRRRRRRRRRRRRRRRk....",
      "....kkRRRRRRRRRRRRkk.....",
      "......kkkkkkkkkkkk......."
    ]],
    feet:[[4,53,[
      "..kkkk......",
      ".kuuuUkk....",
      "kuuUUUUUkkk.",
      "kuUUUUUUUUUk",
      "kUUUUUUUUUvk",
      ".kVVUUUUVVVk",
      "..kkkkkkkkk."
    ]],[28,55,[
      ".kkkk....",
      "kvUUUkk..",
      "kvUUUUuk.",
      "kVvUUUuuk",
      "kVvUUUuuk",
      ".kVvUUUuk",
      "..kVVVVk.",
      "...kkkk.."
    ]]]}
]};
