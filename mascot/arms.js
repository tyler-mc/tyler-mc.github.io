/* Authored arm nubs: cute round mittens, one per screen-angle bucket. Lint: node tools/lint_anim_arms.mjs   (--craft also lists pixel notes on the squash/stretch levels)
   ARMS[angle] = {rows, ax, ay}. A look passes arms:[leftAngle, rightAngle] (degrees counterclockwise from the right: 0 right, 90 up (the head tip: never an arm), 180 left,
   270 down; false/null = no arm on that side; arms undefined = the resting pair [210,330]). compose (mascot/atlas.js) snaps each angle to the nearest bucket here, casts a
   ray from BODY[level].ctr to where it leaves the body, and stamps the nub with its (ax,ay) pixel on that last body pixel P, after the body and shoes and before the face,
   hat, stem and leaf. (ax,ay) is always an ink `k` that lands on the body outline: the nub SHARES the body's 1 px outline there (no gap, no double line, no ink inside the
   body), exactly like the approved concept's resting nubs. Every bucket is a screen-absolute sprite: the `p` highlight is at the top left of the fill and the optional `R`
   shade at its bottom right; a flipped look mirrors the whole grid, so the left-facing versions are the buckets 120..240 mirrored.
   Palette: k ink, r body red, p highlight, R shade. Size 4..6 x 4..6 with 4..9 fill px: the round end points out along the bucket, the narrow end sits on the body.

   bucket  size  fill  where it attaches on rest (P)                     reads as
      0    5x4    6    right side, cheek height (31,45)                  arm straight out right (a horizontal oval, its left end on the side)
     30    5x4    6    right shoulder corner (30,40)                     arm out and up: hello, shrug
     60    6x6    9    right taper slope (25,36), under a hat brim      arm raised (a mitten leaning up-right); hidden by the crown's box
    120    6x5    8    left taper slope (14,35), under a hat brim       arm raised (leaning up-left); hidden by the crown's box
    150    5x4    6    left shoulder corner (10,39)                      arm out and up (mirror of 30)
    180    5x4    6    left side, cheek height (8,45)                    arm straight out left
    210    5x6    5    left side, rows 47..51 (P = (9,52), the tail px)  THE RESTING LEFT NUB: pixel-identical to the approved concept rest_v5
    240    6x5    6    lower-left belly corner (13,56), over the shoe   hand down by the left shoe (planting, bracing)
    270    4x4    4    bottom centre (20,57), between the shoes          one hand straight down (reach, pick up, dangle); lowest row 60
    300    5x5    6    lower-right belly corner (27,56), over the shoe  hand down by the right shoe
    330    4x5    5    right side, rows 47..51 (P = (31,51))             THE RESTING RIGHT NUB: pixel-identical to the approved concept rest_v5
   (210's 1 px tail at its bottom right is its anchor: P is body ink, so the tail only re-inks the outline and the nub lands on the concept's pixels.)

   WIRING NOTE: which pair for which moment. OS = os.js setTimeout poses (hold times in ms); game = Wake Up 60 Hz steps. An arm pose rides on the body level and feet of the
   same frame: hold it as long as that frame.
     idle / rest            [210,330]  (the default; also the REDUCED-MOTION static pose).                                             held
                            Breathing (rest <-> breath) keeps these pixels only once BODY.breath.ctr is [20,45] like rest (body.js); with
                            today's [20,46] the 330 ray hits the belly corner and the right nub shifts 1 px into the body on every breath.
     cheer, jump air, yay   [120,60]   T1..T3 (take-off and the top of a hop), the seed sprout "yay", the dance's up beat.                 OS 110-180 ms; game 4-8 steps
     arms out, land, wobble [180,0]    S2/S3 landing impact, balancing (surf), a big "ta-da"; os.js 190/350 and 170/10 snap here.        OS 70-150 ms;  game 3-6 steps
     hello, shrug, poke     [150,30]   hello / "what?" with the huh face; os.js 140/40 snaps here.                                       OS 120-200 ms; game 6-10 steps
     one-arm wave           [210,60] <-> [210,30]   alternate every 110-150 ms, 3 to 4 times (game 8 steps per frame); mirrored with flip.
     plant, hands down      [240,300]  planting seeds (squash), the crouch before a jump, scared/cower (os.js 250/290 snap here).        OS 70-260 ms;  game 4-12 steps
     reach, pick up         [210,270] or [270,false]: one hand down between the shoes. Never [270,270]: both entries snap to one bucket and
                            one ray, so they stamp a single nub on the same pixels; for two hands down use [240,300].
     walk arm swing         [210,300] <-> [240,330] in step with the feet (walkA/walkB...): OS 120-160 ms per step; game 8-10 steps.
     jump                   anticipation S2/S3 [240,300] -> take-off T1 [150,30] -> air T2/T3 [120,60] -> landing S3 [180,0] -> settle S1 [210,330].
     surf (on the board)    [180,0] balance, nudging to [150,330] / [210,30] as the board tilts.
     hurt / tip over        [150,0] or [180,30] (arms thrown out on the side he falls from).
   Hats: the crown (19x12) and the party hat cover rows up to 37 on rest, so the up nubs 60/120 (anchored on rows 35-36) are BEHIND the brim and may not show; every
   other bucket stays visible with a hat. Prefer [150,30] over [120,60] for a cheer while a crown is worn.
   compose today casts the ray at the raw angle (an in-between angle like 190 moves the anchor and cuts the nub into the body), does not normalise 180-a for flips, and
   can slip through a diagonal outline gap: the lint reports these three as `compose:` problems with the fix (cast at the bucket angle, normalise, snap P to the
   outline). Until then pass bucket angles exactly. */
export const ARMS={
  0:{ax:0,ay:1,rows:[
      ".kkk.",
      "kprrk",
      "krrRk",
      ".kkk."
    ]},
  30:{ax:2,ay:3,rows:[
      ".kkk.",
      "kprrk",
      "krrRk",
      ".kkk."
    ]},
  60:{ax:1,ay:5,rows:[
      "...kk.",
      "..kprk",
      ".krrrk",
      "krrRk.",
      ".krk..",
      ".kk..."
    ]},
  120:{ax:3,ay:4,rows:[
      "..kk..",
      ".kprk.",
      "krrrk.",
      ".krrRk",
      "..kkk."
    ]},
  150:{ax:4,ay:2,rows:[
      ".kkk.",
      "kprrk",
      "krrRk",
      ".kkk."
    ]},
  180:{ax:4,ay:1,rows:[
      ".kkk.",
      "kprrk",
      "krrRk",
      ".kkk."
    ]},
  210:{ax:4,ay:5,rows:[
      "..kk.",
      ".kpk.",
      "kprk.",
      "krRk.",
      ".kkk.",
      "....k"
    ]},
  240:{ax:5,ay:3,rows:[
      ".k....",
      "kpk...",
      "krrk..",
      "krRrkk",
      ".kkk.."
    ]},
  270:{ax:2,ay:0,rows:[
      ".kk.",
      "kprk",
      "krRk",
      ".kk."
    ]},
  300:{ax:0,ay:3,rows:[
      "...k.",
      "..kpk",
      ".krrk",
      "krRrk",
      ".kkk."
    ]},
  330:{ax:0,ay:4,rows:[
      "kk..",
      "kpk.",
      "krrk",
      "kRrk",
      "kkk."
    ]},
};
