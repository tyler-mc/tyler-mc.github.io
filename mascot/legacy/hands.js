/* Authored hands: little balls. He has no arms (art director, Nov 2026: no stalks, no stubs, no arm shapes). A hand is a tiny version of his own body:
   a round ball with a 1 px ink outline, body-red fill and a 1 px 'p' highlight at the top left, sitting against the side of the body, touching it or
   overlapping its outline by a pixel, with nothing connecting it. Drawn by mascot/atlas.js compose() when look.hands is set:
   look.hands='name' puts the same ball on both sides, ['left','right'] picks each side (0 or '' leaves that side bare).
   A hand is {dy,ox,rows,ay?}: rows are drawn for the LEFT side from row cy+dy down; the last column sits on the body edge measured on pattern row ay
   (default 0; compose finds the leftmost body pixel on row cy+dy+ay); ox moves it outwards (-1 = the ball overlaps the outline by a pixel, 0 = its right
   rim is the outline, 1 = it sits just outside). The right hand is the same rows mirrored, so its highlight lands top right (compose mirrors every char).
   tools/lint_anim_hands.mjs is the spec: each hand is one closed ball (no stalk), at most 4x4, on every level and boil variant, the hop, both sides,
   plain and scared faces, crown and party hats.

   The ball shapes: B = 4x4 round (2x2 fill, highlight top left), G = B with a shaded underside (grab), O = 4x3 squashed oval (shy), N = 3x4 narrow bean
   (push, pressed flat; cheer, high). Why the placements are what they are:
   - S3 is 28 px wide in a 32 px canvas: from cy-6 to cy+4 there are only 2 px of canvas beside it, so a 4-wide ball there must overlap the outline (ox -1).
     Only low (cy+2 down) can a round ball sit with its rim on the outline (ox 0), 1 px further out. That is why wave3 is not 1 px further out than wave1:
     at mid height there is no room on S3. wave3 is mid height at the same x.
   - Raised balls attach on the shoulder (wave2: attach cy-6, ball rows cy-8..cy-5) or above it (cheer: attach cy-7, ball rows cy-10..cy-7, the bean
     standing free beside the head top). Elsewhere above cy-5 the edge steps out 1 to 4 px per row, differently on each level, and a ball floats or sinks.

   WIRING NOTE (for os.js; nothing is wired yet). Every play() step that sets hands needs the next step to clear them: add hands:0 to RESET in os.js.
   Do not combine a hand with dx on S3 or S2 (f:'squash' / land): with a 2 px canvas margin a 1 px shift clips the ball (dx on stretch and idle is fine).
   Hands are linted on the BODY levels and the hop only, not on lean or anim_* pose frames: keep them off carried, swing and dance frames unless re-linted.
   Hold times below are per pose, in the 60..180 ms the OS already uses. Use the 'side' the item is on: hold>0 (right) -> [0,'name'], hold<0 -> ['name',0].
   - rest    a ball low at each side. The neutral hand: the first/last frame when hands come or go, and THE STATIC POSE UNDER REDUCED MOTION
             (prefers-reduced-motion: show hands:'rest' or the single named ball held, never a loop).
   - wave1, wave2, wave3   ONLY the hello when he first appears on the desktop (once per visit, after his first landing; NOT when windows open: leave
             mascotWelcome() as it is). The same ball bobbing beside him, a 3-frame loop at ~110 ms each: wave1 low (rows cy+4..cy+7), wave2 high up by the
             head (cy-8..cy-5), wave3 mid height (cy-2..cy+1). One side: hands:[0,'wave1'], or ['wave1',0] with the party hat (the high ball
             touches the party hat on the right and the crown on the left; neither hat draws over it, but it reads cleaner apart),
             2 loops (about 660 ms) with happy:1, then [RESET,0]. os.js has no first-appearance hello yet: add one after the first dropBuddy() landing.
             Reduced motion: hold [0,'wave2'] for the length of the hello line.
   - plant   a ball low near the ground (rows cy+5..cy+8, rim on the outline). buddyPlant() (a seed planted): on the squash frames,
             {f:'squash',happy:1,sp:0,hands:'plant'} 70 ms and {f:'squash2',sp:1,hands:'plant'} 70 ms, 'rest' on the stretch between, cleared on idle.
   - hold    a ball right under a held thing (rows cy+1..cy+4; the s.hold box is cy-2..cy). The icon-dropped-on-the-mascot dive (pose({f:'idle',hold:side,...}),
             os.js ~1734..1745) on the item's side, the other side 'rest'. Also for anything he carries.
   - grab    the same ball with a shaded underside at chest height (rows cy+1..cy+4). Eating: the chomp frames in eat() and the gape/gulp frames of the dive
             ({f:'squash',mouth:1,hands:'grab'} 110 ms), both sides.
   - pat     a ball at the belly, rim on the outline (rows cy+4..cy+7). After eating: the happy frames in eat() and the last 'idle,happy,hop' frame of the dive,
             alternating hands:['pat',0] / hands:[0,'pat'] at ~140 ms, two or three pats.
   - push    a narrow ball pressed flat on the edge at chest height (rows cy-1..cy+2). Pushing against a window edge or the screen edge, or shoving an icon
             (no OS sequence yet; on the side he pushes, held as long as he pushes, 'rest' on release).
   - reach   a ball 1 px further out and 1 px higher than rest (rows cy+2..cy+5, rim on the outline). When an item is dragged over/near him
             (buddy.classList 'hot' in the drag code) on that side; and the frame before hold when he takes the item.
   - cheer   both balls raised high above the shoulders, near the head-top line (rows cy-10..cy-7). "I'm back!" in setMascot(on) on the stretch/hop frames
             (hands:'cheer' 110 ms, 'rest' on the idle frames), the bloom hearts in eat(), and the glow dance. Under a hat one ball touches the brim.
   - shy     a small squashed ball tucked in on the chest edge, overlapping the outline (rows cy+1..cy+3), both sides. The crash dialog: in the crash-open code
             on {f:'stretch',face:'scared',sweat:1,hands:'shy'} and the {f:'idle',face:'scared',...} pose after the hop; crashIgnored() clears it. Also scare(true).
   Hands that use ay: reach, wave2, wave3, pat, push, plant, cheer. */
const B=[".kk.","kprk","krrk",".kk."],    /* the ball: a tiny copy of his body, highlight top left */
      G=[".kk.","kprk","kRRk",".kk."],    /* the ball clenched: shade along the underside */
      O=[".kk.","kprk",".kk."],           /* the ball squashed small */
      N=[".k.","kpk","krk",".k."];        /* the ball narrow: pressed flat, or seen high and small */
export const HANDS={
  rest:{dy:3,ox:-1,rows:B},
  reach:{dy:2,ay:3,ox:0,rows:B},
  hold:{dy:1,ox:-1,rows:B},
  wave1:{dy:4,ox:-1,rows:B},
  wave2:{dy:-8,ay:2,ox:-1,rows:B},
  wave3:{dy:-2,ay:1,ox:-1,rows:B},
  pat:{dy:4,ay:1,ox:0,rows:B},
  push:{dy:-1,ay:1,ox:0,rows:N},
  plant:{dy:5,ay:1,ox:0,rows:B},
  cheer:{dy:-10,ay:3,ox:1,rows:N},
  grab:{dy:1,ox:-1,rows:G},
  shy:{dy:1,ox:-1,rows:O},
};
