/* Authored sprout: ONE big swept leaf on a thin kinked stem rising from the head tip (n stem/underside, T blade, h dark edge; stage 4 adds a white flower: w/B petals,
   k outline, o/Y/r centre). Lint: node tools/lint_anim_head.mjs.
   LEAF.stem = the stem pixels relative to BODY[level].tip (the top-left pixel of the head's 4 px top cap): 3 px rising from the cap and kinking once; its top pixel is
   tip+(3,-3). LEAF.stages[i] = {rows, ox, oy}: rows are stamped with their top-left at (tip.x+ox, tip.y+oy-lift), lift = the hat's lift (0 bare-headed). Every stage
   joins the stem top: the leaf's base pixel sits on tip+(3,-4), so one hat lift works for all stages.
   (An optional per-stage `stem` override is NOT used: all stages share LEAF.stem, which is what compose reads today.)
   WIRING NOTE (os.js). compose() draws stage = min(4, look.stage + (look.sp>0 ? 1 : 0)). os.js stage() sets BS.stage from the seeds planted:
     0  6x5   a small curled bud leaf: no seeds yet (the default; he always has a leaf).
     1  8x5   a young leaf: 1+ seeds.
     2  10x7  a broad leaf with a pointed drooping tip: 10+ seeds.
     3  13x8  the approved concept leaf (rest_v5), unchanged: 40+ seeds.
     4  15x9  the approved leaf plus a flower blooming at the stem top, in front of the leaf's base: 100 seeds (the "You planted 100 seeds" alert draws stage 4).
   buddyPlant() (each seed planted) plays squash 70 ms / stretch 70 ms (sp:2) / squash2 70 ms (sp:1) / idle 260 ms: sp>0 previews the next stage for those frames.
   A stage change is otherwise a one-off swap, no tween. Wake Up game: not wired yet. Reduced motion: the same stage, static. Flip mirrors the leaf with the body. */
export const LEAF={
  stem:[[3,-3],[2,-2],[2,-1]],
  stages:[
    {ox:2,oy:-8,rows:[
      "..hhh.",
      ".hTTTh",
      "hTnnTh",
      "hnh.h.",
      ".h...."
    ]},
    {ox:2,oy:-8,rows:[
      "...hhh..",
      ".hhTTThh",
      "hTTnnTTh",
      "hnhhhhTh",
      ".h....h."
    ]},
    {ox:2,oy:-9,rows:[
      "....hhh...",
      "..hhTTThh.",
      ".hTTTTTTTh",
      "hTnnnTTTTh",
      "hnhhhhhnTh",
      ".h....hTh.",
      ".......h.."
    ]},
    {ox:2,oy:-11,rows:[
      ".....hhhh....",
      "...hhTTTThh..",
      "..hTTTTTTTThh",
      ".hTTTnnnTTTTh",
      ".hTnnTTTnnTTh",
      "hTnhhhhhhhnTh",
      "hnh......hTh.",
      ".h........h.."
    ]},
    {ox:0,oy:-11,rows:[
      ".......hhhh....",
      ".....hhTTTThh..",
      ".kk.kkTTTTTTThh",
      "kwwkwwknnnTTTTh",
      "kwoYowkTTTnnTTh",
      ".kYrYkhhhhhhnTh",
      "kwoYoBk....hTh.",
      "kwBkBBk.....h..",
      ".kk.kk........."
    ]}
  ],
};
