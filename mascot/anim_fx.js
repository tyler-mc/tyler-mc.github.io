/* Effect sprites for the mascot: small pixel stamps drawn by mascot/atlas.js compose() when look.fx=[[name,frame,x,y],...].
   ANIM_FX[name] is an array of frames; a frame is rows of palette chars ('.' clear). compose stamps the rows with their TOP-LEFT at absolute canvas (x,y),
   on top of everything (body, face, hat, sprout); pixels outside 32x48 are silently dropped, so keep every placement inside the canvas.
   All frames of one sprite are the same size (one fixed box). Growth and drift are drawn INSIDE that box, so the caller passes one fixed (x,y) per effect
   and only swaps the frame index; nothing jumps. Lint: tools/lint_anim_fx.mjs (frame size, palette, trim, no stray pixels, composes on blank and on the rest body).

   WIRING NOTE. "Anchor" = the box pixel that should sit on the named body point; the (x,y) after the colon is the box TOP-LEFT to pass in look.fx
   (so it already includes the anchor offset). Coordinates are for the rest body (cx 16, cy 31, head top row 20,
   right foot x 19..22 on rows 42..43); for another level shift them with the body. FX_SPOT below holds the same rest-body (x,y) per sprite.
   ms = hold per frame (setTimeout). still = the one frame to show under prefers-reduced-motion (show it for the effect's whole duration, then clear).
   compose does NOT mirror fx (flip only reaches the body), so the two side effects come pre-mirrored: dustL and speedL are dust and speed with every row reversed
   (literal rows, not computed, because tools/build_mascot.py concatenates every data file into one script scope; the lint checks they match).
     dust     8x5  anchor bottom-left (0,4) on the ground row, just outside the right foot: (cx+7, 39). dustL: bottom-right (7,4) outside the left foot: (1, 39).
              OS: landing after dropBuddy / hopOnto / a window hop, and a skid when a walk stops. Play both dust (right) and dustL (left) for a landing,
              one side for a skid. If the effect starts on a squash body (S1..S3, feet splayed wider), place the whole effect 2 px further out (dust x+2, dustL x-2).
              ms 70,70,90,110 then clear. still: 1. Frames: puff at the foot, cloud grows and slides out, breaks up, specks.
     z        10x10 anchor bottom-left (0,9) a little above and right of the head: (cx+5, 4). OS: napSteps (sleep). The one z drifts up and right inside
              the box, small ink z, ink Z, then a big teal Z that fades. ms 600,600,700 then loop. still: 1.
     sweat    5x9  anchor top-centre (2,0) on the right shoulder of the head: (cx+5, 18). OS: scare(), the scared pose in crashIgnored and the
              sweat:1 frames (replaces the 7 px teal flag drawn by look.sweat). Bead forms, swells, runs down, a droplet drips off.
              ms 120,120,140,160 then loop or clear. still: 1.
     sparkle  7x7  anchor centre (3,3) anywhere near the head, e.g. (cx+7, 12) and a second one at (1, 20) offset by one frame.
              OS: the awe sequence (face 'awe'), bloom, finding something good. ms 90 each, play 0,1,2,1,3 then clear. still: 2.
     drool    7x7  anchor left-middle (0,3) at the right corner of the mouth: (cx+2, cy+1) = (18,32). OS: napSteps, the nose bubble while asleep.
              Alternate 0 (in, 500 ms) and 1 (out, 700 ms) with the breath; 2 is the pop (90 ms) when he wakes, then clear. still: 1.
     shock    10x7 anchor bottom-centre (4..5,6) of the "!" above and right of the head, clear of hats and sprout: (cx+6, 8).
              OS: the first beat of scare() and of crashIgnored, any sudden fright. Alternate 0,1 at 80 ms for about 600 ms. still: 1.
     tear     3x8  anchor top-centre (1,0) under the right eye: (cx+4, cy) = (20,31). OS: hurt / ouch / sad faces (drag into the trash, ignored warning).
              ms 160,160,220 then loop. still: 1.
     speed    8x5  anchor right-middle (7,2) one pixel behind the body when he moves RIGHT: (0, cy-4). speedL (moving left): left-middle at (24, cy-4).
              OS: being flung or dragged fast, the dash of a window hop. ms 60 each, loop while moving. still: 0.
     impact   9x9  anchor centre (4,4) on the contact point (a bump on the head, a wall hit), e.g. (1,13) for the upper left of the head.
              OS: hitting a window edge, the crash in crashIgnored, a hop that bonks. ms 50,70,90 then clear. still: 1.
     note     7x7  anchor bottom-left (0,6) above and right of the head: (cx+8, 7). OS: dance(). Alternate 0 (single note) and 1 (beamed pair) on the beat,
              180 ms each; move it up 1 px per beat if wanted. still: 0.
     puff     8x6  anchor left-middle (0,4) beside the mouth or the crash point: (cx+7, cy-4). OS: a sneeze, the crash and reboot in crashIgnored / runBoot,
              landing in the trash. ms 80,140,120 then clear. still: 1.
     heart    5x8  anchor bottom-centre (2,7) above and right of the head: (cx+8, 9). A 5x5 heart rises 2 px per frame inside the box and pales (H to p).
              OS: bloom and dance (replaces the 3x3 look.heart hearts). ms 140,140,180 then clear. still: 1.
     question 4x6  anchor bottom-left (0,5) above and right of the head: (cx+8, 11). OS: replaces look.q (the 1 px dot was a stray pixel). One frame, static.
     spark    5x7  anchor centre (2,3) on the zapped spot, e.g. (cx+8, 12). OS: the crash in crashIgnored, the unreleased program in runUnr, touching the
              broken Mac. Bolt, flipped bolt, short crackle: ms 60,60,80 loop. still: 0. 
   RE-ANCHORED to the redesign cell (40x64): the sprites are unchanged; FX_SPOT is the old spot +4 columns and +16 rows (dust and speed lines moved out for the wider shoes) as a starting point for the rest body. */
export const ANIM_FX={
  dust:[ // specks
    ["........","........",".kk.....","kwwk....",".kkk...."],
    ["........",".kk.....","kwwkkk..","kwwwwwk.",".kkkkk.."],
    ["...kk...","..kwwkk.","..kwwwwk","...kkkk.","k......."],
    ["........","......k.","....kk..","k......k",".k......"]],
  z:[
    ["..........","..........","..........","..........","..........","..........","kkkk......","..k.......",".k........","kkkk......"],
    ["..........","..........","..........","..kkkkk...",".....k....","....k.....","...k......","..kkkkk...","..........",".........."],
    ["....TTTTTT","........T.",".......T..","......T...",".....T....","....TTTTTT","..........","..........","..........",".........."]],
  sweat:[
    [".....","..k..",".kTk.",".kkk.",".....",".....",".....",".....","....."],
    ["..k..",".kTk.","kTTTk","kwTTk",".kkk.",".....",".....",".....","....."],
    [".....",".....","..k..",".kTk.",".kTk.","kTTTk","kwTTk",".kkk.","....."],
    [".....",".....",".....",".....",".....","..k..",".kTk.",".kwk.","..k.."]],
  sparkle:[
    [".......",".......","...Y...","..YoY..","...Y...",".......","......."],
    [".......","...Y...","...o...",".YowoY.","...o...","...Y...","......."],
    ["...Y...","...o...","..ooo..","YoowooY","..ooo..","...o...","...Y..."],
    [".......",".......","..Y.Y..","...o...","..Y.Y..",".......","......."]],
  drool:[
    [".......",".......",".TT....","TwBT...",".TT....",".......","......."],
    ["..TTT..",".TwBBT.","TwBBBBT","TBBBBBT","TBBBBBT",".TBBBT.","..TTT.."],
    ["T.....T",".T...T.",".......",".......",".......",".T...T.","T.....T"]],
  shock:[
    [".k..kk..k.","..k.kk.k..","....kk....",".kk.kk.kk.","..........","....kk....","....kk...."],
    ["k...kk...k",".k..kk..k.","....kk....","kk..kk..kk","..........","....kk....","....kk...."]],
  tear:[
    [".T.","TTT","...","...","...","...","...","..."],
    [".T.",".T.",".T.","TTT","wTT",".T.","...","..."],
    ["...","...","...",".T.","TTT","wTT","TTT",".T."]],
  speed:[
    ["kkkkk...","........","...kkkkk","........","kkkk...."],
    [".kkkk...","........","kkkkkk..","........","..kkkkkk"],
    ["...kkkkk","........","kkkk....","........","kkkkk..."]],
  impact:[
    [".........",".........","....Y....","...YoY...","..YowoY..","...YoY...","....Y....",".........","........."],
    ["....k....",".k..k..k.","..k.Y.k..","...YoY...","kkYowoYkk","...YoY...","..k.Y.k..",".k..k..k.","....k...."],
    ["k...k...k",".k..k..k.",".........",".........","kk.....kk",".........",".........",".k..k..k.","k...k...k"]],
  note:[
    ["..k....","..kk...","..k.k..","..k.k..","..k....","kkk....","kkk...."],
    ["..kkkkk","..kkkkk","..k...k","..k...k","..k...k","kkk.kkk","kkk.kkk"]],
  puff:[ // specks
    ["........","........","..kk....",".kwwk...","kwwwwk..",".kkkk..."],
    ["..kk.kk.",".kwwkwwk","kwwwwwwk","kwwwwwBk",".kwwwBBk","..kkkkk."],
    ["..k.....",".kwk..k.","..k..kwk","......k.","k.......","..k..k.."]],
  heart:[
    [".....",".....",".....","HH.HH","HwHHH","HHHHH",".HHH.","..H.."],
    [".....","HH.HH","HwHHH","HHHHH",".HHH.","..H..",".....","....."],
    ["pp.pp","pwppp","ppppp",".ppp.","..p..",".....",".....","....."]],
  question:[[".kk.","k..k","..kk",".kk.","....",".kk."]],
  spark:[
    ["...YY","..YY.",".YY..","YYYYY","..YY.",".YY..","YY..."],
    ["YY...",".YY..","..YY.","YYYYY",".YY..","..YY.","...YY"],
    [".....",".....","..YY.",".YYYY","..YY.",".YY..","....."]],
  dustL:[ // specks (dust mirrored)
    ["........","........",".....kk.","....kwwk","....kkk."],
    ["........",".....kk.","..kkkwwk",".kwwwwwk","..kkkkk."],
    ["...kk...",".kkwwk..","kwwwwk..",".kkkk...",".......k"],
    ["........",".k......","..kk....","k......k","......k."]],
  speedL:[ // speed mirrored
    ["...kkkkk","........","kkkkk...","........","....kkkk"],
    ["...kkkk.","........","..kkkkkk","........","kkkkkk.."],
    ["kkkkk...","........","....kkkk","........","...kkkkk"]],
};

/* the rest-body (x,y) for each sprite's box top-left, as in the wiring note (tools/lint_anim_fx.mjs composes every frame there) */
export const FX_SPOT={dust:[32,56],dustL:[0,56],z:[25,20],sweat:[25,34],sparkle:[27,28],drool:[22,48],shock:[26,24],tear:[24,47],speed:[0,43],speedL:[32,43],impact:[5,29],note:[28,23],puff:[27,43],heart:[28,25],question:[28,27],spark:[28,28]};
