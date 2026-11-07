/* The walk and run set for the Wake Up game's player (data only; game/ adopts it later). Unlike the tilted animations this needs no whole-frame art: a walk is built from
   parts. WALK_LOOKS is one stride of 4 looks for compose(): the body bobs between `rest` and `breath` (1 row), the shoes follow the four authored walk poses
   (feet.js walkA contact, walkC down, walkB the other leg's contact, walkD down) and the arms swing in opposite phase (arms.js buckets). Faces right; flip:1 for left.
   WIRING NOTE: pick the look by distance travelled: i = floor(d / WALK_STRIDE_PX) % 4 with WALK_STRIDE_PX = 7 art pixels per look (one stride = 28 px), d reset when a run starts
   from standing, so the planted shoe moves back at the ground speed (no slide) at the game's walk speed; at run speed use the same looks at half the stride (3 or 4 px) with
   arms [150,30] held out. Start/stop: `WALK_START` (first 4 px: body T1 leaning is not drawn, hold walkA with arms back) and `WALK_STOP` (S1 squash with both shoes stood, 4 steps).
   Reduced motion / standing: the rest look. */
export const ANIM_WALK={frames:[]};
export const WALK_STRIDE_PX=7;
export const WALK_LOOKS=[
  {lv:'rest',ft:'walkA',arms:[150,330]},
  {lv:'breath',ft:'walkC',arms:[210,330]},
  {lv:'rest',ft:'walkB',arms:[210,30]},
  {lv:'breath',ft:'walkD',arms:[210,330]}
];
export const WALK_START={lv:'T1',ft:'walkA',arms:[210,30]};
export const WALK_STOP={lv:'S1',ft:'stand',arms:[190,350]};
