/* Authored hands: round mittens that grow out of the body like the approved reference's (a big round hand, one body colour, the outline only around its outer edge). Lint: node tools/lint_anim_arms.mjs   (--craft also lists pixel notes)
   ARMS[angle] = {rows, ax, ay}. A look passes arms:[leftAngle, rightAngle] (degrees counterclockwise from the right: 0 right, 90 up (the head tip: never an arm), 180 left,
   270 down; false/null = no arm on that side; arms undefined = the resting pair [210,330]). compose (mascot/atlas.js) snaps each angle to the nearest bucket here, casts a
   ray from BODY[level].ctr to where it leaves the body, and draws the hand with its (ax,ay) pixel on that last body pixel P, after the body and shoes and before the face,
   hat, stem and leaf. A hand is a big oval that reaches 2 px INTO the body: compose draws a hand pixel only where the body has no fill, so the hand's fill covers the body's
   outline where they meet (no line between hand and body: it flows out of the body) and only its outer edge is ink. A hand that would leave the 40x64 cell slides inward.
   Every bucket is a screen-absolute sprite: the `p` highlight is at the top left of the fill and the optional `R` shade at its bottom right; a flipped look mirrors the
   whole grid, so the left-facing versions are the buckets 120..240 mirrored.
   Palette: k ink, r body red, p highlight, R shade. Size 7..11 x 7..11 with 14..45 fill px (about a third of it inside the body).
   The sprites are generated: ellipse, half-length 2.8..3.4 px and half-width 2.8..2.9 px along the bucket's direction, centre 1.6..2.6 px inside P, a 1 px ring.

   bucket  where it grows from on the rest body (P)              reads as
      0    right side, cheek height                                  arm straight out right
     30    right shoulder corner                                     arm out and up: hello, shrug
     60    right taper slope, under a hat brim                       arm raised; may hide behind a crown's brim
    120    left taper slope, under a hat brim                        arm raised (mirror of 60)
    150    left shoulder corner                                      arm out and up (mirror of 30)
    180    left side, cheek height                                   arm straight out left
    210    lower left side                                           THE RESTING LEFT HAND (a round mitten at the hip, merged into the body)
    240    lower-left belly corner, over the shoe                    hand down by the left shoe (planting, bracing)
    270    bottom centre, between the shoes                          one hand straight down (reach, pick up, dangle)
    300    lower-right belly corner, over the shoe                   hand down by the right shoe
    330    lower right side                                          THE RESTING RIGHT HAND
   (The resting hands changed with the redesign of the hands: they are no longer pixel-identical to the concept rest_v5 nubs.)

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
  0:{ax:3,ay:3,rows:[
      "..kkkkkk.",
      ".kprrrrkk",
      ".krrrrrrk",
      "krrrrrrrk",
      ".krrrrrRk",
      ".krrrrRkk",
      "..kkkkkk."
    ]},
  30:{ax:3,ay:4,rows:[
      "...kkkkk.",
      ".kkprrrkk",
      ".krrrrrrk",
      "kkrrrrrrk",
      "krrrrrrRk",
      ".krrrrRk.",
      ".kkrrrkk.",
      "..kkkk..."
    ]},
  60:{ax:3,ay:4,rows:[
      "..kkkk..",
      ".kprrkk.",
      "krrrrrk.",
      "krrrrrrk",
      "krrrrrRk",
      "krrrrRk.",
      "kkrrrkk.",
      ".kkkkk.."
    ]},
  120:{ax:4,ay:4,rows:[
      "..kkkk..",
      ".kkprrk.",
      ".krrrrrk",
      "krrrrrrk",
      "krrrrrrk",
      ".krrrrRk",
      ".kkrrRkk",
      "..kkkkk."
    ]},
  150:{ax:5,ay:4,rows:[
      ".kkkkk...",
      "kkprrrkk.",
      "krrrrrrk.",
      "krrrrrrkk",
      "krrrrrrRk",
      ".krrrrRk.",
      ".kkrrrkk.",
      "...kkkk.."
    ]},
  180:{ax:5,ay:3,rows:[
      ".kkkkkk..",
      "kkprrrrk.",
      "krrrrrrk.",
      "krrrrrrRk",
      "krrrrrrk.",
      "kkrrrrRk.",
      ".kkkkkk.."
    ]},
  210:{ax:5,ay:3,rows:[
      "...kkk...",
      "..kprrkk.",
      ".krrrrrk.",
      "kkrrrrrrk",
      "krrrrrrkk",
      "kkrrrrRk.",
      ".krrrRkk.",
      "..kkkk..."
    ]},
  240:{ax:4,ay:2,rows:[
      "..kkkk..",
      ".kprrrk.",
      "krrrrrkk",
      "krrrrrrk",
      "krrrrrkk",
      "krrrrRk.",
      ".kkrRk..",
      "..kkk..."
    ]},
  270:{ax:3,ay:2,rows:[
      ".kkkkk.",
      "kkprrkk",
      "krrrrrk",
      "krrrrrk",
      "krrrrRk",
      "kkrrRkk",
      ".kkkkk."
    ]},
  300:{ax:3,ay:2,rows:[
      "..kkkk..",
      ".kprrrk.",
      "kkrrrrrk",
      "krrrrrrk",
      "kkrrrrRk",
      ".krrrrRk",
      "..krrkk.",
      "...kkk.."
    ]},
  330:{ax:3,ay:3,rows:[
      "...kkk...",
      ".kkprrk..",
      ".krrrrrk.",
      "krrrrrrkk",
      "kkrrrrrRk",
      ".krrrrrkk",
      ".kkrrrRk.",
      "...kkkk.."
    ]}
};
