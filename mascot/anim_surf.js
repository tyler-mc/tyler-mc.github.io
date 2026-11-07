/* Authored mascot frames: SURF. Riding the board in the Wake Up game (the Flood biome's surf), drawn as OUR creature in the pose of the art director's
   reference: a low forward crouch leaning into travel, a wide stance planted on the deck, the board under the feet and foam trailing off the tail.
   Format: lintPoseFrames in tools/lint_mascot_body.mjs; tools/lint_anim_surf.mjs has the extra rules. Drawn with compose({pose:'surf:<i>', flip, dir, air:1, ...}).
   NOT baked: compose() draws the usual upright face at (fcx,cy), the sprout and any hat, so face/hat/stage work as usual. Authored facing and travelling RIGHT;
   flip:1 mirrors everything (x -> 31-x). Always pass air:1 (the ground shadow would sit under the board).

   HOW THEY ARE DRAWN. ride, rideFast, noseUp and noseDown are new hand-drawn silhouettes (started from ground:2 recoil's lean and pushed further); wobble1/2
   are BODY.S2 leaned 1 px each way by sliding its top rows. The rest are approved bodies REUSED AS DRAWN, only lifted onto the board: brake = ground:5 skid2,
   mount = ground:9 landHard, launch = BODY.T2, sink1/sink2 = BODY.rest (one row apart). All: 1 px ink outline, highlight upper left, shade lower right, one variant each. Feet are ink-only (as in mascot/feet.js; the 3-row ones are the 'spread' legs). The board and the foam live in the
   over layer: the board is the game's board in our palette (outline k, body o, cream stripe B, underside Y) 26 px long with an upturned nose; foam is
   w / B / b with a touch of T. Each frame also carries data compose ignores: name, board {x0,y0,rows} (the board alone, also merged into over, so the game
   can redraw or recolour it, e.g. the heat-forged board), and the foam anchors tail [x,y] (back end of the board, its bottom row there) and nose [x,y]
   (the front tip). All coordinates are cell coordinates of the RIGHT-facing frame; mirror x -> 31-x when flipped.

   FRAMES (index name: use; body rows; board rows; feet lowest row)
     0  ride      steady surfing. Low crouch (S2 height) leaning ~20 deg into travel, head forward, wide A stance, tail foam.  body 21..39, board 41..47, feet 42
     1  rideFast  fast: lower (flat S3 head), stretched further forward, longer stance, nose lifted, taller plume.        body 23..39, board 40..47, feet 42
     2  brake     braking / turning round: leans back (skid2), feet braced, board carving nose-up, spray fan in front.     body 18..39, board 38..47
     3  noseUp    climbing a wave face: board pitched ~14 deg nose-up, body tipped back, weight on the low back foot.     body 20..39, board 35..47
     4  noseDown  dropping down a wave face: board pitched nose-down, body tipped forward, spray flung off the nose.       body 18..37, board 39..46
     5  wobble1   losing the wave: the S2 crouch tipped back 1 px, back foot thrown wide, front foot pulled in.            body 21..39, board 41..47
     6  wobble2   tipped forward 1 px, front foot thrown wide, back foot in; the board shaken 1 px forward. Alternate 5/6. body 21..39, board 41..47
     7  mount     landing on the board (board summoned / dropping onto it): the landHard splat, feet splayed, splash.      body 25..41, board 41..47, feet 42
     8  launch    jumping off: T2 stretch high in the cell, feet tucked, the board kicked away behind (passes behind him).  body 12..35, board 27..47
     9  sink1     the board stalls and sinks tail first behind him: upright, treading water, a ring of foam at the tail.    body 19..40, board 30..47
    10  sink2     going under: a row lower, feet kicking the other way, only the board's nose still up, foam ring.         body 20..41, board 30..44 (stub)

   WIRING NOTE (game/render.js + game/floodart.js; nothing in os.js uses these yet, there is no surf in the OS).
   - Where the cell goes: draw the surf cell ONE ROW HIGHER than the normal sprite: at (round(p.x)-7-ox, round(p.y)-21-oy) instead of (..., round(p.y)-20-oy).
     Then the deck's top outline (cell row 43) lands on p.y+p.h-2, exactly where boardUnder() draws today's board top (x = p.x+9-10, y = p.y+p.h-2), the board's
     bottom row (47) on p.y+p.h+2 as today. While surfing board.js holds p.y+PH on the liquid's top (w.top, plus up to 3 px of wave), so the surface is
     about cell row 45 and the lower 3 board rows sit in it. (game/mascot.js sprite() is the same 32x48 compose() grid, so these are sprite pixels.) On ride the board spans
     cell columns 3..28, centred on 15.5 like today's 20 px board (columns 6..25). The feet stand ON the deck (lowest foot row 42 = p.y+p.h-3) instead of inside it.
   - While a surf pose is shown, skip boardUnder()'s plain board (it is in the cell). The forged board: draw frame.board's rows over the cell with floodart's BPF
     colours (k o Y B -> its k Y y w). The burnt board keeps boardUnder's own code (it sinks without him).
   - shoes(): today it stamps root shoes at fixed cell x 10 and 20 on the feet row. On surf poses read the feet from frame.feet ([x,y,rows], each foot's lowest
     row is y+rows.length-1; mirror x -> 31-x-w+1 when flipped), remembering the -21 offset.
   - Facing: flip = p.face<0 ? 1 : 0, dir = [p.face, 0] (eyes look ahead). Faces that fit every frame plain and flipped: plain, scared (linted), worry, hurt, huh,
     yuck, awe, ouch, relief (checked with a compose script, not in the lint). Avoid 'love' (its second cheek row lands 1 px off the body on frames 0, 1, 3, 4, 8). Hats and sprout 0..3 are linted.
   - Which frame when (board.js names; SURF={v:2.8,acc:.2,dec:.035,min:.9,flow:.5}):
       mount     the frame surfStart() fires ('surf' event: the board dash or a falling board meets a liquid): mount ~100 ms (2 ticks), then ride.
       ride      steady surf: |p.vx| around SURF.v with the way held.
       rideFast  while |p.vx| > SURF.v + 0.15 (the dash carries in up to 1.2 x SURF.v, and a current adds SURF.flow) or a dash is running; back to ride below
                 SURF.v (hysteresis, so it does not flicker).
       brake     while the held way is against p.vx (turning round) or p.vx is falling by more than SURF.acc a tick; hold it at least 120 ms.
       noseUp / noseDown  from the step's vertical move (ty - p.y in surf()): rising more than 0.5 px -> noseUp, falling more than 0.5 -> noseDown; go back
                 through ride, never straight from one to the other.
       wobble1/2 losing the wave: nothing held and |p.vx| coasting under 1.5 (it sinks at SURF.min 0.9), or the liquid about to end: alternate every 90 ms.
       launch    the jump off (inp.jp in surf(): 'jump' event) for the rising part of the jump (vy < 0), then the normal hop/fall poses. The board can keep
                 falling behind him as its own sprite (frame.board) if the game wants it to drift.
       sink1/2   the let-go sink (|p.vx| < SURF.min sets surf=0, bo=0): sink1 150 ms, sink2 200 ms, then the swimming state (waterFront again).
                 face:'worry' suits both.
   - Foam particles (SURF_FOAM): each sprite is an array of frames, '.' clear, authored for travel to the RIGHT (mirror each row when flipped). Spawn them in
     world space at the cell anchors (cell x + anchor, mirrored when flipped) and leave them behind (they do not follow him):
       wake   every 12 px travelled (or every 4 ticks) on ride/rideFast/noseUp/noseDown/wobble: top-left at (tail.x-12, surface-4), so its 5th row lies on the
              water and its T speckle under it; cycle frames 0..3 every 3 ticks (it scrolls backward), dither out after ~24 ticks.
       spray  off the tail: top-left (tail.x-8, tail.y-10); play 0..3 at 4 ticks each; every 16 ticks on ride, every 8 on rideFast and noseDown.
       drops  top-left (tail.x-10, tail.y-18) on rideFast and noseDown (with the spray), at the tail on launch; 0..2 at 4 ticks, then gone.
       crest  on the water at the nose: bottom row on the surface, left column at nose.x-3; cycle 0..2 every 6 ticks while |vx| > 0.
       splash centred under him (cell x 10..21), bottom row on the surface, on mount (frame 0 on touchdown) and sink1; at the tail on launch; 0..3 at 4 ticks.
       On brake spawn spray and drops at the NOSE instead (the fan goes forward); frame 2 already draws the fan.
     Every frame also draws a little foam of its own (tail foam, the fan, the splash, the rings), so a still frame never looks bare.
   - Reduced motion: show ride (0) the whole time on the board (rideFast/brake/noseUp/noseDown/wobble collapse to it), no particles (the frame's own tail foam
     stays); mount, launch and sink jump straight to ride / the hop / the swim. */
export const ANIM_SURF={frames:[
  /* 0 ride: the base surf pose: low crouch leaning into travel about 20 degrees, head forward, wide A stance on the deck */
  {name:'ride',x0:2,y0:21,fcx:20,cy:31,
    v:[[
      ".............kkkk.kkkkkk.....",
      "............kppprkrrrrrrk....",
      ".........kkkpppprrrrrrrrrk...",
      "........kppprrrrrrrrrrrrrrk..",
      ".......kppprrrrrrrrrrrrrrrrk.",
      "......kpprrrrrrrrrrrrrrrrrrk.",
      "......kpprrrrrrrrrrrrrrrrrrrk",
      ".....krrrrrrrrrrrrrrrrrrrrrrk",
      ".....krrrrrrrrrrrrrrrrrrrrrk.",
      "....krrrrrrrrrrrrrrrrrrrrrrrk",
      "....krrrrrrrrrrrrrrrrrrrrrRRk",
      "...krrrrrrrrrrrrrrrrrrrrrRRk.",
      "..krrrrrrrrrrrrrrrrrrrrrRRk..",
      ".krrrrrrrrrrrrrrrrrrrrRRRkk..",
      ".krrrrrrrrrrrrrrrrrrrRRRk....",
      "krrrrrrrrrrrrrrrrrrrRRRk.....",
      "kkrrrrrrrrrrrrrrrRRRRRkk.....",
      "..kkkkRRRRRRRRRRRkkkkk.......",
      "......kkkkkkkkkkk............"]],
    feet:[[4,40,["...kk", "..kkk", "kkkk."]],[17,40,["kk...", "kkk..", ".kkkk"]]],
    over:{x0:0,y0:38,rows:[
      ".ww..........................",
      "wwBw.........................",
      ".wbB.........................",
      "..........................kkk",
      ".ww.....................kkook",
      "wwBwkkkkkkkkkkkkkkkkkkkkoooYk",
      "wBBwwoooooooooooooooooooooYk.",
      "wbBBwoBBBBBBBBBBBBBBBBBooYk..",
      ".wbbwYYYYYYYYYYYYYYYYYYYYk...",
      "..wwkkkkkkkkkkkkkkkkkkkkk...."]},
    board:{x0:3,y0:41,rows:[".......................kkk",".....................kkook",".kkkkkkkkkkkkkkkkkkkkoooYk","kooooooooooooooooooooooYk.","kooBBBBBBBBBBBBBBBBBooYk..","kYYYYYYYYYYYYYYYYYYYYYk...",".kkkkkkkkkkkkkkkkkkkkk...."]},
    tail:[3, 46],nose:[28, 41]
  },
  /* 1 rideFast: lower (flat S3 head) and stretched further forward, longer stance, the nose lifted, a taller plume off the tail */
  {name:'rideFast',x0:1,y0:23,fcx:21,cy:32,
    v:[[
      "...............kkkk.kkkkkk....",
      "...........kkkkppprkrrrrrrkk..",
      "..........kpppprrrrrrrrrrrrrk.",
      ".........kppprrrrrrrrrrrrrrrrk",
      "........kppprrrrrrrrrrrrrrrrrk",
      ".......kpprrrrrrrrrrrrrrrrrrrk",
      "......kpprrrrrrrrrrrrrrrrrrrk.",
      ".....krrrrrrrrrrrrrrrrrrrrrrrk",
      ".....krrrrrrrrrrrrrrrrrrrrrRRk",
      "....krrrrrrrrrrrrrrrrrrrrrrRRk",
      "...krrrrrrrrrrrrrrrrrrrrrrrRRk",
      "..krrrrrrrrrrrrrrrrrrrrrrRRRk.",
      ".krrrrrrrrrrrrrrrrrrrrrrRRRk..",
      ".krrrrrrrrrrrrrrrrrrrrrRRRk...",
      "krrrrrrrrrrrrrrrrrrrRRRRRk....",
      "kkkkRRRRRRrrrrrrrrRRRRRkk.....",
      "....kkkkkkkkkkkkkkkkkkk......."]],
    feet:[[3,40,["...kk", "..kkk", "kkkk."]],[19,40,["kk...", "kkk..", ".kkkk"]]],
    over:{x0:0,y0:32,rows:[
      ".ww...........................",
      "wwBw..........................",
      "wBBw..........................",
      ".bB...........................",
      "..............................",
      "ww............................",
      "wBw...........................",
      ".b............................",
      "............................kk",
      "..........................kkok",
      "ww......................kkoook",
      "wBw.kkkkkkkkkkkkkkkkkkkkooooYk",
      "wBBwoooooooooooooooooooooooYk.",
      "wbBBwoBBBBBBBBBBBBBBBBBBoYYk..",
      ".wbbwYYYYYYYYYYYYYYYYYYYYkk...",
      "..wwkkkkkkkkkkkkkkkkkkkkk....."]},
    board:{x0:3,y0:40,rows:[".........................kk",".......................kkok",".....................kkoook",".kkkkkkkkkkkkkkkkkkkkooooYk","koooooooooooooooooooooooYk.","kooBBBBBBBBBBBBBBBBBBoYYk..","kYYYYYYYYYYYYYYYYYYYYYkk...",".kkkkkkkkkkkkkkkkkkkkk....."]},
    tail:[3, 46],nose:[29, 40]
  },
  /* 2 brake: leaning back (skid2 lifted), feet braced on a board carving nose-up, a fan of spray thrown up in front */
  {name:'brake',x0:0,y0:18,fcx:13,cy:28,
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
    feet:[[9,39,["..kk", ".kkk", "kkk."]],[14,40,["kkkk", ".kkk"]]],
    over:{x0:3,y0:27,rows:[
      ".........................ww..",
      "........................wBBw.",
      ".........................bw..",
      ".............................",
      ".......................ww..ww",
      "......................wwBw.wB",
      "......................wBb...b",
      ".......................b.....",
      "........................ww...",
      ".......................wBBw..",
      "......................wwBbw..",
      "......................wBBw...",
      ".......................wbk...",
      ".....................kkoYk...",
      "................kkkkkoook....",
      "........kkkkkkkkoooooook.....",
      ".kkkkkkkooooooooBBBBooYk.....",
      "koooooooBBBBBBBBYYYYYYk......",
      "kooBBBBBYYYYYYYYkkkkkk.......",
      "kYYYYYYYkkkkkkkk.............",
      ".kkkkkkk....................."]},
    board:{x0:3,y0:38,rows:["........................kk",".......................kok",".....................kkoYk","................kkkkkoook.","........kkkkkkkkoooooook..",".kkkkkkkooooooooBBBBooYk..","koooooooBBBBBBBBYYYYYYk...","kooBBBBBYYYYYYYYkkkkkk....","kYYYYYYYkkkkkkkk..........",".kkkkkkk.................."]},
    tail:[3, 46],nose:[28, 38]
  },
  /* 3 noseUp: climbing a wave face: board pitched nose-up about 14 degrees, body tipped back, the weight on the low back foot */
  {name:'noseUp',x0:1,y0:20,fcx:14,cy:31,
    v:[[
      ".............kkkkk......",
      ".......kkkkk.kppprk.....",
      ".....kkpppprkrrrrrrk....",
      "...kkpppprrrrrrrrrrrk...",
      "..kppprrrrrrrrrrrrrrrk..",
      ".kppprrrrrrrrrrrrrrrrrk.",
      ".kpprrrrrrrrrrrrrrrrrrk.",
      "kpprrrrrrrrrrrrrrrrrrrk.",
      "krrrrrrrrrrrrrrrrrrrrrrk",
      "krrrrrrrrrrrrrrrrrrrrrrk",
      "krrrrrrrrrrrrrrrrrrrrRRk",
      ".krrrrrrrrrrrrrrrrrrrRRk",
      "..krrrrrrrrrrrrrrrrrRRk.",
      "..krrrrrrrrrrrrrrrrRRk..",
      "..krrrrrrrrrrrrrrRRRk...",
      "..krrrrrrrrrrrrrRRRk....",
      "..krrrrrrrrrrRRRRkk.....",
      "...kRRRRrrrrRRRRk.......",
      "....kkrrRRRRkkkk........",
      "......kkkkkk............"]],
    feet:[[5,40,["..kk", "kkkk"]],[18,37,["kk..", "kkkk"]]],
    over:{x0:2,y0:35,rows:[
      "........................kk",
      ".......................kok",
      ".....................kkoYk",
      "....................koook.",
      "................kkkkoook..",
      "............kkkkooooooYk..",
      "........kkkkooooBBBBYYk...",
      "....kkkkooooBBBBYYYYkk....",
      ".kkkooooBBBBYYYYkkkk......",
      "koooBBBBYYYYkkkk..........",
      "kooBYYYYkkkk..............",
      "kYYYkkkk..................",
      ".kkk......................"]},
    board:{x0:2,y0:35,rows:["........................kk",".......................kok",".....................kkoYk","....................koook.","................kkkkoook..","............kkkkooooooYk..","........kkkkooooBBBBYYk...","....kkkkooooBBBBYYYYkk....",".kkkooooBBBBYYYYkkkk......","koooBBBBYYYYkkkk..........","kooBYYYYkkkk..............","kYYYkkkk..................",".kkk......................"]},
    tail:[2, 46],nose:[27, 35]
  },
  /* 4 noseDown: dropping down a wave face: board pitched nose-down, body tipped forward over the low front foot, spray flung up off the nose */
  {name:'noseDown',x0:3,y0:18,fcx:20,cy:28,
    v:[[
      "............kkkk.kkkkkk.....",
      "...........kppprkrrrrrrk....",
      "........kkkpppprrrrrrrrrk...",
      ".......kppprrrrrrrrrrrrrrk..",
      "......kppprrrrrrrrrrrrrrrrk.",
      ".....kpprrrrrrrrrrrrrrrrrrk.",
      ".....kpprrrrrrrrrrrrrrrrrrrk",
      "....krrrrrrrrrrrrrrrrrrrrrrk",
      "....krrrrrrrrrrrrrrrrrrrrrk.",
      "...krrrrrrrrrrrrrrrrrrrrrrrk",
      "...krrrrrrrrrrrrrrrrrrrrrRRk",
      "..krrrrrrrrrrrrrrrrrrrrrRRk.",
      ".krrrrrrrrrrrrrrrrrrrrrRRk..",
      "krrrrrrrrrrrrrrrrrrrrRRRkk..",
      "krrrrrrrrrrrrrrrrrrrRRRk....",
      "krrrrrrrrrrrrrrrrrrrRRRk....",
      ".kkkrrrrrrrrrrrrrrRRRRk.....",
      "....kkkkRRRRrrrrrRRRRRk.....",
      "........kkkkrrrRRRRRkk......",
      "............kkkkkkkk........"]],
    feet:[[5,36,["..kk", ".kkk", "kkk."]],[18,38,["kkk.", "kkkk", ".kkk"]]],
    over:{x0:3,y0:31,rows:[
      ".........................ww..",
      "........................wBBw.",
      ".........................bw..",
      ".............................",
      ".......................ww....",
      ".......................wBw..w",
      "........................b..wB",
      "...........................b.",
      ".kkkkk...................ww..",
      "koooookkkkkk............wBBw.",
      "kooBBBooooookkkkkk.....wwbBw.",
      "kYYYYYBBBBBBooooookkkkkkwbb..",
      ".kkkkkYYYYYYBBBBBBoooooook...",
      "......kkkkkkYYYYYYBBoooYYk...",
      "............kkkkkkYYYYYkk....",
      "..................kkkkk......"]},
    board:{x0:3,y0:39,rows:[".kkkkk....................","koooookkkkkk..............","kooBBBooooookkkkkk........","kYYYYYBBBBBBooooookkkkkkkk",".kkkkkYYYYYYBBBBBBoooooook","......kkkkkkYYYYYYBBoooYYk","............kkkkkkYYYYYkk.","..................kkkkk..."]},
    tail:[3, 42],nose:[28, 42]
  },
  /* 5 wobble1: losing the wave: the S2 crouch tipped back (top 2 px behind the base), back foot thrown out wide, front foot pulled in */
  {name:'wobble1',x0:2,y0:21,fcx:15,cy:31,
    v:[[
      "........kkkk.kkkkk.........",
      ".......kppprkrrrrrk........",
      "....kkkpppprrrrrrrrkk......",
      "..kkppprrrrrrrrrrrrrrkk....",
      "kkppprrrrrrrrrrrrrrrrrrk...",
      "kpprrrrrrrrrrrrrrrrrrrrrk..",
      "kpprrrrrrrrrrrrrrrrrrrrrk..",
      ".kprrrrrrrrrrrrrrrrrrrrrk..",
      ".krrrrrrrrrrrrrrrrrrrrrrrk.",
      ".krrrrrrrrrrrrrrrrrrrrrrRRk",
      ".krrrrrrrrrrrrrrrrrrrrrrRRk",
      ".krrrrrrrrrrrrrrrrrrrrrRRk.",
      ".krrrrrrrrrrrrrrrrrrrrRRRk.",
      ".krrrrrrrrrrrrrrrrrrrrrRk..",
      ".krrrrrrrrrrrrrrrrrrRRRRRk.",
      ".kRRRRRRrrrrrrrrrrrrRRRRRk.",
      "..kkRRRRRRRRRRRRRRRRRRRkk..",
      "....kkkkRRRRRRRRRRRRkkk....",
      "........kkkkkkkkkkkk......."]],
    feet:[[6,40,["..kk", ".kkk", "kkk."]],[19,41,["kkk", "kkk"]]],
    over:{x0:0,y0:41,rows:[
      "..........................kkk",
      ".ww.....................kkook",
      "wwBwkkkkkkkkkkkkkkkkkkkkoooYk",
      "wBBwwoooooooooooooooooooooYk.",
      "wbBBwoBBBBBBBBBBBBBBBBBooYk..",
      ".wbbwYYYYYYYYYYYYYYYYYYYYk...",
      "..wwkkkkkkkkkkkkkkkkkkkkk...."]},
    board:{x0:3,y0:41,rows:[".......................kkk",".....................kkook",".kkkkkkkkkkkkkkkkkkkkoooYk","kooooooooooooooooooooooYk.","kooBBBBBBBBBBBBBBBBBooYk..","kYYYYYYYYYYYYYYYYYYYYYk...",".kkkkkkkkkkkkkkkkkkkkk...."]},
    tail:[3, 46],nose:[28, 41]
  },
  /* 6 wobble2: tipped forward (top 2 px ahead of the base), front foot thrown wide, back foot in; the board shaken 1 px forward */
  {name:'wobble2',x0:3,y0:21,fcx:17,cy:31,
    v:[[
      ".........kkkk.kkkkk.......",
      "........kppprkrrrrrk......",
      ".....kkkpppprrrrrrrrkk....",
      "...kkppprrrrrrrrrrrrrrkk..",
      ".kkppprrrrrrrrrrrrrrrrrrk.",
      ".kpprrrrrrrrrrrrrrrrrrrrrk",
      ".kpprrrrrrrrrrrrrrrrrrrrrk",
      "..kprrrrrrrrrrrrrrrrrrrrrk",
      ".krrrrrrrrrrrrrrrrrrrrrrrk",
      "krrrrrrrrrrrrrrrrrrrrrrRRk",
      "krrrrrrrrrrrrrrrrrrrrrrRRk",
      "krrrrrrrrrrrrrrrrrrrrrRRk.",
      "krrrrrrrrrrrrrrrrrrrrRRRk.",
      "krrrrrrrrrrrrrrrrrrrrrRk..",
      "krrrrrrrrrrrrrrrrrrRRRRRk.",
      "kRRRRRRrrrrrrrrrrrrRRRRRk.",
      ".kkRRRRRRRRRRRRRRRRRRRkk..",
      "...kkkkRRRRRRRRRRRRkkk....",
      ".......kkkkkkkkkkkk......."]],
    feet:[[10,41,["kkk", "kkk"]],[20,40,["kk..", "kkk.", ".kkk"]]],
    over:{x0:1,y0:41,rows:[
      "..........................kkk",
      ".ww.....................kkook",
      "wwBwkkkkkkkkkkkkkkkkkkkkoooYk",
      "wBBwwoooooooooooooooooooooYk.",
      "wbBBwoBBBBBBBBBBBBBBBBBooYk..",
      ".wbbwYYYYYYYYYYYYYYYYYYYYk...",
      "..wwkkkkkkkkkkkkkkkkkkkkk...."]},
    board:{x0:4,y0:41,rows:[".......................kkk",".....................kkook",".kkkkkkkkkkkkkkkkkkkkoooYk","kooooooooooooooooooooooYk.","kooBBBBBBBBBBBBBBBBBooYk..","kYYYYYYYYYYYYYYYYYYYYYk...",".kkkkkkkkkkkkkkkkkkkkk...."]},
    tail:[4, 46],nose:[29, 41]
  },
  /* 7 mount: landing on the board from above: the deep landHard splat, feet splayed flat on the deck, a splash off both ends */
  {name:'mount',x0:0,y0:25,fcx:16,cy:34,
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
    feet:[[4,42,["kkkkk"]],[22,42,["kkkkkk"]]],
    over:{x0:0,y0:38,rows:[
      ".w............................w.",
      "wBw..........................wBw",
      "wB............................Bw",
      ".bw..........................wb.",
      "wBBw........................wBBw",
      "wbBwkkkkkkkkkkkkkkkkkkkkkkkkwBbw",
      ".wboooooooooooooooooooooooooobw.",
      "..kooBBBBBBBBBBBBBBBBBBBooook...",
      "..kYYYYYYYYYYYYYYYYYYYYYYYYYk...",
      "...kkkkkkkkkkkkkkkkkkkkkkkkk...."]},
    board:{x0:2,y0:41,rows:["...........................k","..........................kk",".kkkkkkkkkkkkkkkkkkkkkkkkkok","kooooooooooooooooooooooooook","kooBBBBBBBBBBBBBBBBBBBooook.","kYYYYYYYYYYYYYYYYYYYYYYYYYk.",".kkkkkkkkkkkkkkkkkkkkkkkkk.."]},
    tail:[2, 46],nose:[29, 41]
  },
  /* 8 launch: jumping off: the T2 stretch high in the cell, feet tucked, the board kicked away behind him and flipping up */
  {name:'launch',x0:9,y0:12,fcx:20,cy:24,
    v:[[
      "...........kkkk.......",
      "......kkkk.krrrk......",
      ".....kppprkrrrrrk.....",
      "....kpppprrrrrrrrk....",
      "..kkppprrrrrrrrrrrk...",
      ".kppprrrrrrrrrrrrrrk..",
      "kpprrrrrrrrrrrrrrrrrk.",
      "kpprrrrrrrrrrrrrrrrrk.",
      ".kprrrrrrrrrrrrrrrrrk.",
      ".krrrrrrrrrrrrrrrrrrk.",
      "krrrrrrrrrrrrrrrrrrrrk",
      "krrrrrrrrrrrrrrrrrrRRk",
      "krrrrrrrrrrrrrrrrrRRk.",
      "krrrrrrrrrrrrrrrrrRRk.",
      ".krrrrrrrrrrrrrrrRRRk.",
      ".krrrrrrrrrrrrrrrRRRk.",
      ".krrrrrrrrrrrrrrrrRk..",
      ".krrrrrrrrrrrrrrrRRRk.",
      ".krrrrrrrrrrrrrrrRRRk.",
      ".krrrrrrrrrrrrRRRRRk..",
      ".kRRRRRRrrrrrrRRRRk...",
      "..kkRRRRRRRRRRRRRk....",
      "....kkkkRRRRRRRkk.....",
      "........kkkkkkk......."]],
    feet:[[15,36,["kkk", ".kk"]],[21,36,["kkk", "kk."]]],
    over:{x0:0,y0:35,rows:[
      "............kkoBo",
      "...........kooB..",
      ".........kkoBBYk.",
      "........kooBYYk..",
      "......kkoBBYkk...",
      ".....kooBYYk.....",
      "...kkoBBYkk......",
      "..kooBYYk........",
      ".kwwBYkk.........",
      "kwBBwk...........",
      "wwbBww...........",
      "wBbbBw...........",
      ".wwww............"]},
    board:{x0:0,y0:27,rows:[".....................k","....................kk","...................kok","..................kok.",".................kook.",".................kok..","...............kkoYk..","..............koook...","............kkoBok....","...........kooBYYk....",".........kkoBBYkk.....","........kooBYYk.......","......kkoBBYkk........",".....kooBYYk..........","...kkoBBYkk...........","..kooBYYk.............",".koBBYkk..............","kooYYk................","koYkk.................","kYk...................",".k...................."]},
    tail:[0, 46],nose:[21, 27]
  },
  /* 9 sink1: the board stalls and sinks tail first behind him: upright (rest), treading water, splash where the tail goes under */
  {name:'sink1',x0:8,y0:19,fcx:19,cy:30,
    v:[[
      "......kkkk.kkkk.......",
      ".....kppprkrrrrk......",
      ".....kpppprrrrrrk.....",
      "..kkkppprrrrrrrrrkk...",
      ".kppprrrrrrrrrrrrrrkk.",
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
      "..kkkRRRRRRRRRRRkk....",
      ".....kkkRRRRRRRk......",
      "........kkkkkkk......."]],
    feet:[[12,41,["..kk", ".kkk", "kkk."]],[22,41,["kkkk", ".kk."]]],
    over:{x0:0,y0:39,rows:[
      "........kkooB...",
      "......kkooBBYYkk",
      "....kkooBBYYkk..",
      "..kkooBBYYkk....",
      ".wwoBBwwkk......",
      "wBBwwwBBw.......",
      "wbBbwbBbw.......",
      "kwwbwbww........",
      ".k.ww..........."]},
    board:{x0:0,y0:30,rows:["......................kk",".....................kok","....................koYk","...................kook.","..................kook..","................kkooYk..","..............kkooook...","............kkooBBYk....","..........kkooBBYYkk....","........kkooBBYYkk......","......kkooBBYYkk........","....kkooBBYYkk..........","..kkooBBYYkk............",".kooBBYYkk..............","kooBYYkk................","koYYkk..................","kYkk....................",".k......................"]},
    tail:[0, 46],nose:[23, 30]
  },
  /* 10 sink2: going under: lower in the water, feet kicking the other way, only the nose of the board still up, a ring of foam */
  {name:'sink2',x0:8,y0:20,fcx:19,cy:31,
    v:[[
      "......kkkk.kkkk.......",
      ".....kppprkrrrrk......",
      ".....kpppprrrrrrk.....",
      "..kkkppprrrrrrrrrkk...",
      ".kppprrrrrrrrrrrrrrkk.",
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
      "..kkkRRRRRRRRRRRkk....",
      ".....kkkRRRRRRRk......",
      "........kkkkkkk......."]],
    feet:[[12,42,["kkk.", ".kkk"]],[22,42,[".kk", "kkk", "kk."]]],
    over:{x0:0,y0:32,rows:[
      ".......k......",
      ".......k......",
      "......ko......",
      ".....kok......",
      ".....kok......",
      "....kok.......",
      "...kook.......",
      "..kook........",
      ".koBYk........",
      ".koYk.........",
      "koYk..........",
      "kYww......ww..",
      "kwBBw.ww.wBBw.",
      "wwbBwwBBwwbBww",
      ".wbbwwbbwwbbw.",
      "..ww..ww..ww.."]},
    board:{x0:0,y0:30,rows:[".........k","........kk",".......kok",".......kk.","......kok.",".....kok..",".....kok..","....kok...","...kook...","..kook....",".koBYk....",".koYk.....","koYk......","kYk.......","kk........"]},
    tail:[0, 44],nose:[9, 30]
  }
]};
export const SURF_FOAM={
  /* spray: a curl of foam lifting off the tail and falling back, 8x8; drawn for travel to the RIGHT (mirror each row when flipped) */
  spray:[
    ["........","........","........","........","........","....ww..","...wBBw.","..wwbBw."],
    ["........","........","....ww..","...wBBw.","..wBb...","..wB....","...ww...","........"],
    ["..ww....",".wBBw...",".wb.ww..","....wBw.",".....b..","........","........","........"],
    ["........","........",".ww.....","wBBw....",".bw..ww.",".....wB.","........","........"]
  ],
  /* wake: a puffy foam trail segment, 12x6, tiles sideways; each frame is the last scrolled 3 px, so cycling 0-3 rolls the foam backward */
  wake:[
    ["..ww.....ww.",".wBBw...wBBw","wwBBwwwwwBBw","wBbbBwwBbbBw","wbbbbwwbbbbw",".bTT...bTT.."],
    ["w.....ww...w","Bw...wBBw.wB","BwwwwwBBwwwB","bBwwBbbBwwBb","bbwwbbbbwwbb","T...bTT...bT"],
    ["...ww...ww..","..wBBw.wBBw.","wwwBBwwwBBww","wBbbBwwBbbBw","wbbbbwwbbbbw",".bTT...bTT.."],
    ["ww...ww.....","BBw.wBBw...w","BBwwwBBwwwww","bBwwBbbBwwBb","bbwwbbbbwwbb","T...bTT...bT"]
  ],
  /* drops: flung droplets, 8x6, isolated pixels on purpose */
  drops:[
    ["......w.","...w....",".....B..",".w......","....w...","........"],   // specks
    ["....w...",".w...B..","........","...w....",".B....w.","........"],   // specks
    ["........","..w.....",".....w..",".B......","....B...","......b."]   // specks
  ],
  /* splash: a crown splash for mount and sink, 12x8, bottom row on the water line */
  splash:[
    ["............","............","............","............","............","...w....w...","..wBwwwwBw..",".wwbbbbbbww."],
    ["............","............","..w......w..","..wB....Bw..","...w.ww.w...","..wBwwwwBw..",".wBbbBBbbBw.","wwbbbbbbbbww"],
    [".w........w.",".wB......Bw.","..w..ww..w..","..wB.BB.Bw..","...w.bb.w...","...wBwwBw...","..wBbbbbBw..",".wwbbbbbbww."],
    ["............",".w........w.",".B........B.","............","...w.ww.w...","..wBwBBwBw..",".wBbbbbbbBw.","wwbbbbbbbbww"]
  ],
  /* crest: a small foam cap riding the water at the nose, 8x4, bottom row on the water line */
  crest:[
    ["...ww...","..wBBw..",".wwbBww.","TTwbbwTT"],
    ["..ww....",".wBBww..","wwbBBww.","TwbbbwTT"],
    ["....ww..","..wwBBw.",".wwBbBww","TTwbbwwT"]
  ]
};
