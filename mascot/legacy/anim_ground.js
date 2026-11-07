/* Authored mascot frames: ground. Standing leans and reactions: feet planted (or sliding) on the ground, NOT baked: compose() draws the usual upright face at
   (fcx,cy), the sprout and any hat on top, so the caller adds face:'scared'/'huh'/..., hat and stage as usual. Format: lintPoseFrames in tools/lint_mascot_body.mjs;
   tools/lint_anim_ground.mjs has the extra rules. Drawn with compose({pose:'ground:<i>', flip, ...}).

   HOW THEY ARE DRAWN. Each frame starts from an approved body level (rest, S1, S2, S3 or T1) bent by hand the way mascot/lean.js bends T2: the head bumps,
   shoulder ledge, left nub, belly bulge, roll and droop travel with the pose, the highlight stays upper left and the shade lower right, one variant each (no boil).
   Every frame is grounded: its last body row is row 41, as on BODY (none is meant to be off the ground). Feet sit on rows 42..43 (recoil's left foot too: it
   lifts by hooking its toe up, '..kk' over 'kkk.'), except the edge frames' right foot, which hangs over the drop on rows 44..45.
   Authored facing / leaning RIGHT; flip:1 mirrors (x -> 31-x, face at 33-fcx). Both faces fit every frame with the 1 px body margin, including the wide scared mouth.
   The head dip sits at fcx-1 (as on rest) so the sprout grows from the right bump, plain and flipped.
   A tilt this small on a 22 px body moves the outline only 2 to 5 px, and the upright face pins a 19x9 block of fill, so the lean is carried by the head (shifted
   and tipped: one bump a row higher), the sloping sides and the base; the nub and roll become concave steps where the lint's column rule forbids a notch (lean.js
   does the same on l2/l3).

   FRAMES (index name: what; body rows / face):
     0  lean1     standing lean right, about 6 degrees, feet planted (rest bent: head +3, base unmoved).               rows 20..41, face 18,31
     1  lean2     about 12 to 15 degrees: left bump a row higher, the weight bulges low on the right.                     rows 20..41, face 19,31
     2  recoil    poked from the LEFT: squashed (S2 height), leaning right about 10 degrees, left toe hooked up.            rows 23..41, face 19,33
     3  recoil2   the rebound: stretched (T1 height), leaning left about 5 degrees, raised right bump.                  rows 19..41, face 15,30
     4  skid1     hard stop while travelling RIGHT: leans back (left) about 10 degrees, feet pushed forward, small squash. rows 21..41, face 15,32
     5  skid2     the slide: leans back further, body stretched along the lean, feet further forward.                   rows 20..41, face 15,30
     6  cower     hunched very low (S3 height), head sunk into raised shoulders, curled away from a threat on his RIGHT,
                  feet tucked together, toes in.                                                                         rows 25..41, face 15,34
     7  cower2    cower with the upper body shivered 1 px right (face 1 px right too); base and feet stay put.          rows 25..41, face 16,34
     8  landSoft  gentle landing squash: weight spread low (pear), feet splayed 1 px each side.                         rows 23..41, face 16,33
     9  landHard  deep landing splat: 31 px wide at the base, head pressed flat, feet splayed wide.                      rows 25..41, face 16,34
    10  dizzy1    dizzy wobble, tipped left: right bump raised, weight in the left sag.                                 rows 20..41, face 15,31
    11  dizzy2    tipped right: left bump raised, weight in the right bulge.                                            rows 20..41, face 17,31
    12  edge1     balancing on a ledge, leaning out right about 8 degrees (T1 height); right foot hangs off the edge.   rows 19..41, face 18,30
    13  edge2     leaning out further, about 14 degrees.                                                                rows 19..41, face 19,30
   Frame-to-frame silhouette change stays at or under 80 px for 0-1, 4-5, 6-7, 10-11, 12-13. recoil -> recoil2 is a deliberate snap (about 210 px, like the
   OS's squash -> stretch hops); landSoft and landHard are alternatives, never played one after the other.

   WIRING NOTE (os.js; poses are played with play([[look,ms],...]) / setTimeout; RESET already clears pose and flip). Pose looks are {pose:'ground:<i>', flip:0|1};
   they replace f/lv/ft/lean for the body, face flags still apply. Under reduced motion play() shows only the LAST frame, so the static poses below are what to
   Object.assign + bRender directly where a moment should still show something.
   - Poke (huh(), the click handler): today [[{f:'stretch',face:'huh',hop:3},110],[{f:'idle',hop:0},1700],[RESET,0]]. Suggested, with flip:0 when the click is
     left of his centre (he recoils right) and flip:1 when it is right of it:
       play([[{pose:'ground:2',flip,face:'huh',hop:0},90],[{pose:'ground:3',flip},110],[{pose:'ground:0',flip:flip^1},90],[{pose:0,flip:0,f:'idle'},1600],[RESET,0]])
     (the third beat is lean1 leaning back toward the poke, 90 ms; drop it for a snappier poke). Reduced motion: no pose change (huh face only).
   - Scared at the close button (scare(on)): today face 'scared', sweat, f:'stretch' and a 70 ms setInterval flipping dx between -1 and 1. Instead set
     BS.pose='ground:6', BS.face='scared', BS.sweat=1, flip:1 when the close button is to his LEFT (the authored frame shrinks away from a threat on his right),
     and let the 70 ms interval alternate pose 'ground:6' / 'ground:7' (no dx). scare(false) -> RESET as today. Reduced motion: static ground:6, no interval.
   - Landing (dropBuddy -> land(far)): near fall (today [[{f:'squash',air:0},110],[{f:'idle'},120],[RESET,0]]):
       [[{pose:'ground:8',air:0},110],[{pose:0,f:'idle'},120],[RESET,0]]
     far fall (today [[{f:'squash',face:'hurt',air:0},110],[{f:'idle',face:'worry'},260],[RESET,0]]):
       [[{pose:'ground:9',face:'hurt',air:0},130], ...dizzy below (straight from landHard, never through landSoft)..., [RESET,0]]
     flip may follow the sideways drift of the drop (the splats are lopsided, either way reads). Reduced motion: static ground:8 for ~300 ms, then RESET.
   - Dizzy after a big fall (append to the far landing): [{pose:'ground:10',face:'worry'},150],[{pose:'ground:11'},150] repeated 3 times (900 ms), then
     [{pose:0,f:'idle'},200]. Reduced motion: static ground:10 for ~600 ms.
   - Edge balance (perchTick): the ledge's end must fall between the planted foot (ends at column 12) and the hanging one (starts at column 20), so his centre is
     at most 4 art px inside the end. With sc=bcv.offsetWidth/32: 0 <= L.w-perch.dx <= 4*sc -> {pose:'ground:12', flip:0, air:1} (drop on his right);
     0 <= perch.dx <= 4*sc -> the same with flip:1 (left end). air:1 because the ground shadow would hang over the drop. Every 2 to 4 s wobble
     12 -> 13 -> 12 (180, 140, 180 ms). Set the pose only when it changes, not every rAF tick. Reduced motion: static ground:12.
   - Leans (lean1/lean2): a standing lean toward something (the pointer resting near him, the window he is about to hop onto): lean1 90 ms -> lean2 held,
     back through lean1 90 ms -> RESET; flip:1 to lean left. Reduced motion: static ground:1.
   - Skid (the Wake Up game, and any OS walk that stops): skid1 80 ms -> skid2 held while sliding -> skid1 70 ms -> RESET; flip:1 when travelling LEFT.
     Reduced motion: static ground:4.
   Static reduced-motion poses, in one line: poke none, scared 6, landing 8, dizzy 10, edge 12, lean 1, skid 4.
   FACES: scared, huh, yuck and love (and the plain face) fit every frame, plain and flipped (the lint composes them). Not 'awe': compose() shortens the awe mouth
   only on BODY levels (if(lv)), so on the cy-34 frames (cower, cower2, landHard) it runs through the base into the feet; avoid awe on those until atlas.js
   gates that shrink on rows, as gape already does. faces.js hurt/worry/relief/ouch also land on body fill on every frame (checked by hand, not linted). */
export const ANIM_GROUND={frames:[
  /* 0 lean1 */
  {name:'lean1',x0:5,y0:20,fcx:18,cy:31,
    v:[[
      "........kkkk.kkkkk......",
      "........kpppkrrrrrk.....",
      ".......kpppprrrrrrrk....",
      "....kkkppprrrrrrrrrrk...",
      "...kppprrrrrrrrrrrrrrk..",
      "..kpprrrrrrrrrrrrrrrrrk.",
      "..kpprrrrrrrrrrrrrrrrrk.",
      "..kprrrrrrrrrrrrrrrrrrk.",
      "..krrrrrrrrrrrrrrrrrrrk.",
      "..krrrrrrrrrrrrrrrrrrrk.",
      ".krrrrrrrrrrrrrrrrrrRRk.",
      ".krrrrrrrrrrrrrrrrrrRRk.",
      ".krrrrrrrrrrrrrrrrrrRRk.",
      ".krrrrrrrrrrrrrrrrrrRRRk",
      "krrrrrrrrrrrrrrrrrrRRRk.",
      "krrrrrrrrrrrrrrrrrRRRk..",
      "krrrrrrrrrrrrrrrrRRRk...",
      "krrrrrrrrrrrrrrRRRRRk...",
      ".kRRRRRrrrrrrrRRRRkk....",
      "..kkkRRRRRRRRRRRkk......",
      ".....kkkRRRRRRRk........",
      "........kkkkkkk........."]],
    feet:[[9, 42, ["kkkk", "kkkk"]], [19, 42, ["kkkk", "kkkk"]]]},
  /* 1 lean2 */
  {name:'lean2',x0:5,y0:20,fcx:19,cy:31,
    v:[[
      ".........kkkk............",
      "........kpppk.kkkkkkk....",
      ".......kpppprkrrrrrrrkk..",
      ".....kkppprrrrrrrrrrrrrk.",
      "....kppprrrrrrrrrrrrrrrk.",
      "...kpprrrrrrrrrrrrrrrrrrk",
      "...kpprrrrrrrrrrrrrrrrrrk",
      "...kprrrrrrrrrrrrrrrrrrrk",
      "...krrrrrrrrrrrrrrrrrrrrk",
      "...krrrrrrrrrrrrrrrrrrrrk",
      "..krrrrrrrrrrrrrrrrrrrRRk",
      "..krrrrrrrrrrrrrrrrrrrRRk",
      "..krrrrrrrrrrrrrrrrrrrRRk",
      ".krrrrrrrrrrrrrrrrrrrRRRk",
      ".krrrrrrrrrrrrrrrrrrRRRkk",
      "krrrrrrrrrrrrrrrrrrRRRk..",
      "krrrrrrrrrrrrrrrrrRRRk...",
      "krrrrrrrrrrrrrrRRRRRk....",
      ".kRRRRRrrrrrrrRRRRkk.....",
      "..kkkRRRRRRRRRRRkk.......",
      ".....kkkRRRRRRRk.........",
      "........kkkkkkk.........."]],
    feet:[[9, 42, ["kkkk", "kkkk"]], [19, 42, ["kkkk", "kkkk"]]]},
  /* 2 recoil */
  {name:'recoil',x0:4,y0:23,fcx:19,cy:33,
    v:[[
      "..........kkkk.kkkkkk......",
      ".........kppprkrrrrrrk.....",
      "......kkkpppprrrrrrrrrkk...",
      ".....kppprrrrrrrrrrrrrrrk..",
      "....kppprrrrrrrrrrrrrrrrrk.",
      "...kpprrrrrrrrrrrrrrrrrrrk.",
      "...kpprrrrrrrrrrrrrrrrrrrrk",
      "...kprrrrrrrrrrrrrrrrrrrrrk",
      "...krrrrrrrrrrrrrrrrrrrrrrk",
      "..krrrrrrrrrrrrrrrrrrrrrRRk",
      "..krrrrrrrrrrrrrrrrrrrrrRRk",
      "..krrrrrrrrrrrrrrrrrrrrrRRk",
      ".krrrrrrrrrrrrrrrrrrrrrRRRk",
      ".krrrrrrrrrrrrrrrrrrrrRRRk.",
      "krrrrrrrrrrrrrrrrrrrrRRRk..",
      "krrrrrrrrrrrrrrrrrrRRRRRk..",
      "kkRRRRRRrrrrrrrrrRRRRRkk...",
      "..kkkkRRRRRRRRRRRRRkkk.....",
      "......kkkkkkkkkkkkk........"]],
    feet:[[5, 42, ["..kk", "kkk."]], [20, 42, ["kkkk", "kkkk"]]]},
  /* 3 recoil2 */
  {name:'recoil2',x0:4,y0:19,fcx:15,cy:30,
    v:[[
      "...........kkkk......",
      ".....kkkkk.krrrk.....",
      "....kppprrkrrrrrk....",
      "..kkpppprrrrrrrrrkk..",
      ".kppprrrrrrrrrrrrrrk.",
      "kppprrrrrrrrrrrrrrrrk",
      "kpprrrrrrrrrrrrrrrrrk",
      "kpprrrrrrrrrrrrrrrrrk",
      ".kprrrrrrrrrrrrrrrrrk",
      ".krrrrrrrrrrrrrrrrrrk",
      "krrrrrrrrrrrrrrrrrRRk",
      "krrrrrrrrrrrrrrrrrRRk",
      "krrrrrrrrrrrrrrrrrRRk",
      "krrrrrrrrrrrrrrrrRRRk",
      "krrrrrrrrrrrrrrrrRRRk",
      ".krrrrrrrrrrrrrrrRRRk",
      ".krrrrrrrrrrrrrrrrRk.",
      ".krrrrrrrrrrrrrrrRRRk",
      "..krrrrrrrrrrrrRRRRRk",
      "..kRRRRRrrrrrrrRRRRk.",
      "...kkRRRRRRRRRRRRRk..",
      ".....kkkkRRRRRRRkk...",
      ".........kkkkkkk....."]],
    feet:[[9, 42, ["kkkk", "kkkk"]], [19, 42, ["kkkk", "kkkk"]]]},
  /* 4 skid1 */
  {name:'skid1',x0:3,y0:21,fcx:15,cy:32,
    v:[[
      ".....kkkk.kkkk...........",
      "....kppprkrrrrkk.........",
      "...kpppprrrrrrrrkk.......",
      ".kkppprrrrrrrrrrrrkk.....",
      "kppprrrrrrrrrrrrrrrrkk...",
      "kpprrrrrrrrrrrrrrrrrrrk..",
      "kpprrrrrrrrrrrrrrrrrrrk..",
      ".kprrrrrrrrrrrrrrrrrrrk..",
      ".krrrrrrrrrrrrrrrrrrrrrk.",
      ".krrrrrrrrrrrrrrrrrrrrrk.",
      ".krrrrrrrrrrrrrrrrrrrRRk.",
      ".krrrrrrrrrrrrrrrrrrrRRk.",
      ".krrrrrrrrrrrrrrrrrrrRRk.",
      ".krrrrrrrrrrrrrrrrrrrRRRk",
      "..krrrrrrrrrrrrrrrrrrRRRk",
      "...krrrrrrrrrrrrrrrrrrRk.",
      "...krrrrrrrrrrrrrrrrrRRRk",
      "....krrrrrrrrrrrrrrRRRRRk",
      ".....kkRRRRRrrrrrrRRRRkk.",
      ".......kkkRRRRRRRRRRkk...",
      "..........kkkkkkkkkk....."]],
    feet:[[12, 42, ["kkkk", "kkkk"]], [20, 42, ["kkkk.", "kkkkk"]]]},
  /* 5 skid2 */
  {name:'skid2',x0:2,y0:20,fcx:15,cy:30,
    v:[[
      ".....kkkk.kkkkk...........",
      "...kkppprkrrrrrkk.........",
      ".kkpppprrrrrrrrrrkkkk.....",
      "kppprrrrrrrrrrrrrrrrrk....",
      "kppprrrrrrrrrrrrrrrrrrk...",
      "kpprrrrrrrrrrrrrrrrrrrk...",
      ".kpprrrrrrrrrrrrrrrrrrk...",
      ".kprrrrrrrrrrrrrrrrrrrk...",
      "..krrrrrrrrrrrrrrrrrrrk...",
      "..krrrrrrrrrrrrrrrrrrRRk..",
      "..krrrrrrrrrrrrrrrrrrRRk..",
      "..krrrrrrrrrrrrrrrrrrRRk..",
      "..krrrrrrrrrrrrrrrrrrRRRk.",
      "...krrrrrrrrrrrrrrrrrRRRk.",
      "....krrrrrrrrrrrrrrrrrRRRk",
      ".....krrrrrrrrrrrrrrrrrRk.",
      ".....krrrrrrrrrrrrrrrrRRRk",
      "......krrrrrrrrrrrrrRRRRRk",
      ".......kRRRRRrrrrrrrrRRRRk",
      "........kkRRRRRRRRRRRRRRk.",
      "..........kkkRRRRRRRRRkk..",
      ".............kkkkkkkkk...."]],
    feet:[[14, 42, ["kkkk", "kkkk"]], [22, 42, ["kkkk.", "kkkkk"]]]},
  /* 6 cower */
  {name:'cower',x0:2,y0:25,fcx:15,cy:34,
    v:[[
      ".......kkkkk.kkkk.........",
      "....kkkppprrkrrrrkkkk.....",
      "..kkpppprrrrrrrrrrrrrkk...",
      ".kppprrrrrrrrrrrrrrrrrrk..",
      ".kppprrrrrrrrrrrrrrrrrrk..",
      "kpprrrrrrrrrrrrrrrrrrrrk..",
      "kpprrrrrrrrrrrrrrrrrrrrrk.",
      ".kprrrrrrrrrrrrrrrrrrrrrk.",
      ".krrrrrrrrrrrrrrrrrrrrrrrk",
      ".krrrrrrrrrrrrrrrrrrrrrRRk",
      ".krrrrrrrrrrrrrrrrrrrrRRk.",
      "..krrrrrrrrrrrrrrrrrRRRkk.",
      "..krrrrrrrrrrrrrrrrrRRk...",
      "...kkrrrrrrrrrrrrRRRRkk...",
      ".....kkRRRRrrrrRRRRkk.....",
      ".......kRRRRRRRRRkk.......",
      "........kkkkkkkkk........."]],
    feet:[[10, 42, ["kkkk", ".kkk"]], [15, 42, ["kkkk", "kkk."]]]},
  /* 7 cower2 */
  {name:'cower2',x0:3,y0:25,fcx:16,cy:34,
    v:[[
      ".......kkkkk.kkkk.........",
      "....kkkppprrkrrrrkkkk.....",
      "..kkpppprrrrrrrrrrrrrkk...",
      ".kppprrrrrrrrrrrrrrrrrrk..",
      ".kppprrrrrrrrrrrrrrrrrrk..",
      "kpprrrrrrrrrrrrrrrrrrrrk..",
      "kpprrrrrrrrrrrrrrrrrrrrrk.",
      ".kprrrrrrrrrrrrrrrrrrrrrk.",
      ".krrrrrrrrrrrrrrrrrrrrrrrk",
      "krrrrrrrrrrrrrrrrrrrrrRRk.",
      "krrrrrrrrrrrrrrrrrrrrRRk..",
      ".krrrrrrrrrrrrrrrrrRRRkk..",
      ".krrrrrrrrrrrrrrrrrRRk....",
      "..kkrrrrrrrrrrrrRRRRkk....",
      "....kkRRRRrrrrRRRRkk......",
      "......kRRRRRRRRRkk........",
      ".......kkkkkkkkk.........."]],
    feet:[[10, 42, ["kkkk", ".kkk"]], [15, 42, ["kkkk", "kkk."]]]},
  /* 8 landSoft */
  {name:'landSoft',x0:1,y0:23,fcx:16,cy:33,
    v:[[
      "..........kkkk.kkkkk........",
      ".........kppprkrrrrrk.......",
      "......kkkpppprrrrrrrrkk.....",
      ".....kppprrrrrrrrrrrrrrk....",
      "....kppprrrrrrrrrrrrrrrrk...",
      "....kpprrrrrrrrrrrrrrrrrk...",
      "...kpprrrrrrrrrrrrrrrrrrrk..",
      "...kprrrrrrrrrrrrrrrrrrrrk..",
      "...krrrrrrrrrrrrrrrrrrrrrk..",
      "...krrrrrrrrrrrrrrrrrrrrRRk.",
      "..krrrrrrrrrrrrrrrrrrrrrRRk.",
      "..krrrrrrrrrrrrrrrrrrrrrRRk.",
      ".krrrrrrrrrrrrrrrrrrrrrrRRRk",
      ".krrrrrrrrrrrrrrrrrrrrrrrRk.",
      "krrrrrrrrrrrrrrrrrrrrrrrRRRk",
      "krrrrrrrrrrrrrrrrrrrrrRRRRRk",
      ".kkRRRRRRrrrrrrrrrrrRRRRRkk.",
      "...kkkkRRRRRRRRRRRRRRRkkk...",
      ".......kkkkkkkkkkkkkkk......"]],
    feet:[[8, 42, ["kkkk", "kkkk"]], [20, 42, ["kkkk", "kkkk"]]]},
  /* 9 landHard */
  {name:'landHard',x0:0,y0:25,fcx:16,cy:34,
    v:[[
      "...........kkkk.kkkkk..........",
      ".......kkkkppprkrrrrrkkkk......",
      ".....kkpppprrrrrrrrrrrrrrk.....",
      "....kppprrrrrrrrrrrrrrrrrrk....",
      "...kppprrrrrrrrrrrrrrrrrrrrk...",
      "...kpprrrrrrrrrrrrrrrrrrrrrk...",
      "..kpprrrrrrrrrrrrrrrrrrrrrrrk..",
      "..kprrrrrrrrrrrrrrrrrrrrrrrrk..",
      "..krrrrrrrrrrrrrrrrrrrrrrrRRk..",
      ".krrrrrrrrrrrrrrrrrrrrrrrrrRRk.",
      ".krrrrrrrrrrrrrrrrrrrrrrrrrRRk.",
      "krrrrrrrrrrrrrrrrrrrrrrrrrrRRRk",
      "krrrrrrrrrrrrrrrrrrrrrrrrrrrRk.",
      "krrrrrrrrrrrrrrrrrrrrrrrrRRRRRk",
      "kkRRRRRRrrrrrrrrrrrrrrrrrRRRRRk",
      "..kkkRRRRRRRRRRRRRRRRRRRRRRkkk.",
      ".....kkkkkkkkkkkkkkkkkkkkkk...."]],
    feet:[[3, 42, ["..kkkk", "kkkkkk"]], [23, 42, ["kkkk.", "kkkkk"]]]},
  /* 10 dizzy1 */
  {name:'dizzy1',x0:4,y0:20,fcx:15,cy:31,
    v:[[
      "........kkkk..........",
      "...kkkk.krrrk.........",
      "..kppppkrrrrrkk.......",
      "kkppprrrrrrrrrrkkkk...",
      "kppprrrrrrrrrrrrrrrkk.",
      "kpprrrrrrrrrrrrrrrrrk.",
      "kpprrrrrrrrrrrrrrrrrk.",
      "kprrrrrrrrrrrrrrrrrrk.",
      ".krrrrrrrrrrrrrrrrrrk.",
      ".krrrrrrrrrrrrrrrrrrrk",
      "krrrrrrrrrrrrrrrrrrRRk",
      "krrrrrrrrrrrrrrrrrrRRk",
      "krrrrrrrrrrrrrrrrrrRRk",
      "krrrrrrrrrrrrrrrrrRRRk",
      "krrrrrrrrrrrrrrrrRRRk.",
      "krrrrrrrrrrrrrrrrrRk..",
      "krrrrrrrrrrrrrrrrRRRk.",
      ".krrrrrrrrrrrrrRRRRRk.",
      ".kRRRRRrrrrrrrRRRRkk..",
      "..kkkRRRRRRRRRRRRk....",
      ".....kkkRRRRRRRkk.....",
      "........kkkkkkk......."]],
    feet:[[9, 42, ["kkkk", "kkkk"]], [19, 42, ["kkkk", "kkkk"]]]},
  /* 11 dizzy2 */
  {name:'dizzy2',x0:5,y0:20,fcx:17,cy:31,
    v:[[
      ".......kkkk............",
      "......kpppk.kkkkk......",
      "......kppppkrrrrrkk....",
      "...kkkppprrrrrrrrrrk...",
      ".kkppprrrrrrrrrrrrrrk..",
      "kpprrrrrrrrrrrrrrrrrk..",
      "kpprrrrrrrrrrrrrrrrrk..",
      "kprrrrrrrrrrrrrrrrrrk..",
      ".krrrrrrrrrrrrrrrrrrk..",
      ".krrrrrrrrrrrrrrrrrrrk.",
      "krrrrrrrrrrrrrrrrrrrRRk",
      "krrrrrrrrrrrrrrrrrrrRRk",
      "krrrrrrrrrrrrrrrrrrrRRk",
      "krrrrrrrrrrrrrrrrrrRRRk",
      "krrrrrrrrrrrrrrrrrRRRk.",
      "krrrrrrrrrrrrrrrrrrRk..",
      "krrrrrrrrrrrrrrrrRRRk..",
      "krrrrrrrrrrrrrrRRRRRk..",
      "kRRRRRrrrrrrrrRRRRkk...",
      ".kkkRRRRRRRRRRRRkk.....",
      "....kkkRRRRRRRRk.......",
      ".......kkkkkkkk........"]],
    feet:[[8, 42, ["kkkk", "kkkk"]], [18, 42, ["kkkk", "kkkk"]]]},
  /* 12 edge1 */
  {name:'edge1',x0:6,y0:19,fcx:18,cy:30,
    v:[[
      "............kkkk.......",
      ".......kkkk.krrrkk.....",
      "......kppprkrrrrrrkk...",
      "...kkkpppprrrrrrrrrrkk.",
      "..kppprrrrrrrrrrrrrrrrk",
      ".kppprrrrrrrrrrrrrrrrrk",
      "kpprrrrrrrrrrrrrrrrrrrk",
      "kpprrrrrrrrrrrrrrrrrrrk",
      ".kprrrrrrrrrrrrrrrrrrrk",
      ".krrrrrrrrrrrrrrrrrrrrk",
      "krrrrrrrrrrrrrrrrrrrRRk",
      "krrrrrrrrrrrrrrrrrrrRRk",
      "krrrrrrrrrrrrrrrrrrrRRk",
      "krrrrrrrrrrrrrrrrrRRRk.",
      "krrrrrrrrrrrrrrrrrRRRk.",
      "krrrrrrrrrrrrrrrrRRRk..",
      "krrrrrrrrrrrrrrrRRRk...",
      "krrrrrrrrrrrrrrrRRRk...",
      "krrrrrrrrrrrrrRRRRRk...",
      "kkRRRRRrrrrrrRRRRkkk...",
      "..kRRRRRRRRRRRRRk......",
      "...kkkkRRRRRRRkk.......",
      ".......kkkkkkk........."]],
    feet:[[9, 42, ["kkkk", "kkkk"]], [20, 44, ["kkk.", ".kkk"]]]},
  /* 13 edge2 */
  {name:'edge2',x0:6,y0:19,fcx:19,cy:30,
    v:[[
      ".............kkkkk......",
      "........kkkk.krrrrkk....",
      ".......kppprkrrrrrrrkk..",
      "....kkkpppprrrrrrrrrrrk.",
      "...kppprrrrrrrrrrrrrrrrk",
      "...kppprrrrrrrrrrrrrrrrk",
      "..kpprrrrrrrrrrrrrrrrrrk",
      "..kpprrrrrrrrrrrrrrrrrrk",
      "..kprrrrrrrrrrrrrrrrrrrk",
      "..krrrrrrrrrrrrrrrrrrrrk",
      "..krrrrrrrrrrrrrrrrrrRRk",
      ".krrrrrrrrrrrrrrrrrrrRRk",
      ".krrrrrrrrrrrrrrrrrrrRRk",
      ".krrrrrrrrrrrrrrrrrrRRRk",
      ".krrrrrrrrrrrrrrrrrRRRk.",
      "krrrrrrrrrrrrrrrrrRRRk..",
      "krrrrrrrrrrrrrrrrRRRk...",
      "krrrrrrrrrrrrrrrrRRRk...",
      "krrrrrrrrrrrrrrRRRRRk...",
      ".kRRRRRrrrrrrrRRRRkk....",
      "..kkRRRRRRRRRRRRkk......",
      "....kkkRRRRRRRkk........",
      ".......kkkkkkk.........."]],
    feet:[[9, 42, ["kkkk", "kkkk"]], [21, 44, ["kkk.", ".kkk"]]]},
]};
