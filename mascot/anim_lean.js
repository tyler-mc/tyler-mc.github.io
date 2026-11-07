/* Authored lean frames: the buddy HANGING from the pointer by the top of his head (the head tip, where the stem rises) and swinging like a pendulum. The OS picks
   one of these by the swing angle instead of rotating the canvas. Three RIGHT swings (the body swung out to the right under the hold point); flip:1 mirrors a
   frame for the matching LEFT swing. Lint: node tools/lint_anim_lean.mjs (lintPoseFrames rules plus the checks in its header).
   Each frame is a non-baked pose frame in the 40x64 cell: v = the body only (k/r/p/R), feet = the two limp dangling shoes (the feet.js 'dangle' shoes, drawn
   behind the body, hanging below it and trailing back toward the vertical), fcx,cy = where compose() draws the usual UPRIGHT face, tip = the top-left pixel of
   the 4 px head cap (the stem, the upright leaf of every stage and the hats attach there; the cap is the body's top row), ctr = where the arms are cast from.
   Drawn from BODY.T3 (the stretched hang) swung about the cap and redrawn by hand: the cap stays level on top (the stem pulls it up), the teardrop keeps its
   taper and the convex slope, the round end swings out lower right, highlight upper left of the world, shade on the right rim and the base. The upright hang
   (angle 0) is not a frame: it is BODY.T3 with FEET.dangle.
     index  swing  measured*  tip      hold pixel plain / flipped   face (fcx,cy)  area (T3 531)
     0      12     11.7       [18,26]  (20, 26.5) / (20, 26.5)      24,45          545
     1      25     24.2       [14,26]  (16, 26.5) / (24, 26.5)      24,44          562
     2      40     39.3       [10,26]  (12, 26.5) / (28, 26.5)      25,43          538
   * the angle from the hold point to the body's pixel centroid, from straight down (BODY.T3 itself measures -6.7 from its own cap centre: its tip curls right).
   WIRING NOTE (os.js grab/carry: carryPose, neckAt, carryPlace; today they read the old mascot/legacy lean.js l1..l3 with nx,ny):
   - Draw with compose({pose:'lean:'+(Math.abs(n)-1), flip:n<0?1:0, air:1, ...}) for lean n = +-1..3 (leanFor()). Clear `arms` for the lean frames (leave it
     undefined so the default resting pair [210,330] hangs at the sides); the carry's [250,290] pair lands under the body among the shoes on frames 1 and 2.
   - HOLD POINT: pin the pointer to the CAP CENTRE, art coordinates (tip.x+2, tip.y+0.5) plain and (38-tip.x, tip.y+0.5) flipped, i.e. the table above. So
     neckAt(n) returns n>0 ? [tip.x+2, tip.y+.5] : n<0 ? [38-tip.x, tip.y+.5] : the upright's, and carryPlace keeps left = pointer.x - ax*scale, top =
     pointer.y - ay*scale (snapped to whole art pixels). Every tip row is 26 (= BODY.T3.tip row), so a frame change never moves him vertically. For the upright
     T3 hang the same rule gives (22, 26.5) (its cap is 20..23); using it there too keeps the cap still under the pointer across every pose change.
   - SWING THRESHOLDS: frame 0 from |th| >= 6 deg, frame 1 from 18.5, frame 2 from 32.5, with about 2 deg of hysteresis on the way down (os.js LEANUP
     [.105,.32,.57] / LEANDN [.075,.29,.54] rad already match). No hold times: the frame follows the swing every animation frame.
   - Reduced motion: no swing, the upright hang only (BODY.T3 + FEET.dangle), as os.js does today.
   - Hats and leaf ride on tip unrotated (the leaf stays upright); with a hat the brim overhangs the lifted side of the head in the air on frames 1 and 2. */
export const ANIM_LEAN={frames:[
  {x0:13,y0:26,fcx:24,cy:45,tip:[18,26],ctr:[23,47],v:[[
      ".....kkkk.............",
      "....krrrrkk...........",
      "...krprrrrrk..........",
      "...krprrrrrRk.........",
      "..krprrrrrrrRk........",
      "..krprrrrrrrrRk.......",
      "..krprrrrrrrrrRk......",
      "..krprrrrrrrrrrRk.....",
      ".krprrrrrrrrrrrrRk....",
      ".krprrrrrrrrrrrrrRk...",
      ".krrrrrrrrrrrrrrrRk...",
      "krrrrrrrrrrrrrrrrrRk..",
      "krrrrrrrrrrrrrrrrrRk..",
      "krrrrrrrrrrrrrrrrrrRk.",
      "krrrrrrrrrrrrrrrrrrRk.",
      "krrrrrrrrrrrrrrrrrrRk.",
      "krrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrRk",
      "krrrrrrrrrrrrrrrrrrrRk",
      ".krrrrrrrrrrrrrrrrrrRk",
      ".krrrrrrrrrrrrrrrrrrRk",
      ".krrrrrrrrrrrrrrrrrrRk",
      "..krrrrrrrrrrrrrrrrRk.",
      "..kRrrrrrrrrrRRRRRRRk.",
      "...kRRRRRRRRRRRRRRRk..",
      "....kRRRRRRRRRRRRkk...",
      ".....kkRRRRRRkkkk.....",
      ".......kkkkkk........."
    ]],
    feet:[[9,54,[
      "....kkkk.",
      "..kkUUUvk",
      ".kuUUUUvk",
      "kuuUUUvVk",
      "kuuUUUvVk",
      "kuUUUvVk.",
      ".kVVVVk..",
      "..kkkk..."
    ]],[28,53,[
      ".kkkk....",
      "kvUUUkk..",
      "kvUUUUuk.",
      "kVvUUUuuk",
      "kVvUUUuuk",
      ".kVvUUUuk",
      "..kVVVVk.",
      "...kkkk.."
    ]]]},
  {x0:11,y0:26,fcx:24,cy:44,tip:[14,26],ctr:[23,46],v:[[
      "...kkkk..................",
      "..krrrrkkk...............",
      "..krprrrrrkk.............",
      ".krprrrrrrrrkk...........",
      ".krprrrrrrrrrrkk.........",
      ".krprrrrrrrrrrrrk........",
      "krprrrrrrrrrrrrrRk.......",
      "krprrrrrrrrrrrrrrRk......",
      "krprrrrrrrrrrrrrrrRk.....",
      "krprrrrrrrrrrrrrrrrRk....",
      "krrrrrrrrrrrrrrrrrrRk....",
      "krrrrrrrrrrrrrrrrrrrRk...",
      "krrrrrrrrrrrrrrrrrrrrRk..",
      ".krrrrrrrrrrrrrrrrrrrRk..",
      ".krrrrrrrrrrrrrrrrrrrRk..",
      ".krrrrrrrrrrrrrrrrrrrrRk.",
      ".krrrrrrrrrrrrrrrrrrrrRk.",
      "..krrrrrrrrrrrrrrrrrrrrRk",
      "..krrrrrrrrrrrrrrrrrrrrRk",
      "..krrrrrrrrrrrrrrrrrrrrRk",
      "..krrrrrrrrrrrrrrrrrrrrRk",
      "...krrrrrrrrrrrrrrrrrrrRk",
      "...krrrrrrrrrrrrrrrrrrrRk",
      "....krrrrrrrrrrrrrrrrrrRk",
      "....kRrrrrrrrrrrrrrrrrrRk",
      ".....kRrrrrrrrrrrrrrRRRk.",
      ".....kRrrrrrrrrrrrrRRRk..",
      "......kRRRRRRRRRRRRRkk...",
      ".......kRRRRRRRRRRRk.....",
      "........kkRRRRRRRkk......",
      "..........kkkkkkk........"
    ]],
    feet:[[14,54,[
      "....kkkk.",
      "..kkUUUvk",
      ".kuUUUUvk",
      "kuuUUUvVk",
      "kuuUUUvVk",
      "kuUUUvVk.",
      ".kVVVVk..",
      "..kkkk..."
    ]],[29,52,[
      ".kkkk....",
      "kvUUUkk..",
      "kvUUUUuk.",
      "kVvUUUuuk",
      "kVvUUUuuk",
      ".kVvUUUuk",
      "..kVVVVk.",
      "...kkkk.."
    ]]]},
  {x0:9,y0:26,fcx:25,cy:43,tip:[10,26],ctr:[25,46],v:[[
      ".kkkk........................",
      ".krrrkkkk....................",
      "krrprrrrrkkkk................",
      "krprrrrrrrrrrkkk.............",
      "krprrrrrrrrrrrrrkk...........",
      "krprrrrrrrrrrrrrrrkk.........",
      ".krprrrrrrrrrrrrrrrrk........",
      ".krprrrrrrrrrrrrrrrrRk.......",
      ".krprrrrrrrrrrrrrrrrrRk......",
      "..krrrrrrrrrrrrrrrrrrrRk.....",
      "..krrrrrrrrrrrrrrrrrrrrRk....",
      "..krrrrrrrrrrrrrrrrrrrrRk....",
      "...krrrrrrrrrrrrrrrrrrrrRk...",
      "...krrrrrrrrrrrrrrrrrrrrrRk..",
      "...krrrrrrrrrrrrrrrrrrrrrRk..",
      "....krrrrrrrrrrrrrrrrrrrrrRk.",
      "....krrrrrrrrrrrrrrrrrrrrrRk.",
      ".....kRrrrrrrrrrrrrrrrrrrrRk.",
      ".....kRrrrrrrrrrrrrrrrrrrrrRk",
      "......kRrrrrrrrrrrrrrrrrrrrRk",
      ".......kRrrrrrrrrrrrrrrrrrRk.",
      ".......kRrrrrrrrrrrrrrrrrrRk.",
      "........kRrrrrrrrrrrrrrrrrRk.",
      ".........kRrrrrrrrrrrrrrrRk..",
      "..........kRRrrrrrrrrrrRRRk..",
      "...........kRRRRRRRRRRRRkk...",
      "............kRRRRRRRRRRk.....",
      ".............kkkRRRRRkk......",
      "................kkkkk........"
    ]],
    feet:[[17,52,[
      "....kkkk.",
      "..kkUUUvk",
      ".kuUUUUvk",
      "kuuUUUvVk",
      "kuuUUUvVk",
      "kuUUUvVk.",
      ".kVVVVk..",
      "..kkkk..."
    ]],[27,51,[
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
