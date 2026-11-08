/* What plays when: data only, read by vfx.js. Tyler's tuning levers are one-line edits here:
     slot     'emissive' (drawn after lightPass, keeps full colour in the dark) or 'lit' (drawn before it, so the room darkens it).
              Everything is 'emissive', as approved in the harness; fog and leaves are the likely first 'lit' candidates.
     noLight  true: the effect's light buffer never reaches the renderer's L map (enemies give no light; leaves, fog, bubbles
              and dash smoke are not light sources).
     o        upstream options, world units (2 per room px). vfx.js adds x, y, area, ground, seed and the no-op hooks.
   Wrapper-only options (vfx.js, never upstream): clip {h, fade} cuts the beam's back layer h room px above where it lands,
   with a Bayer fade over fade px; remap {from: to} swaps exact pixel colours (fireflies has no colour option).
   per: options scaled by the room against one view, 'area' (room area / view area) or 'w' (room width / view width);
   a trailing '#' rounds to a whole count. ground 'floor': the lowest floor in each column, not the room's bottom row. */

export const USE={
  /* one-shots, from vfx.js triggers() */
  stun:  {fx:'impact',     slot:'emissive',noLight:true, o:{kind:'hit',size:.75}},   /* root-jump stun: S.ens[i].wrap rises */
  root:  {fx:'power-up',   slot:'emissive',noLight:false,o:{size:.8}},   /* S.items.root: at his feet, follows him through the demo jump */
  item:  {fx:'pickup',     slot:'emissive',noLight:false,sprite:false,o:{wait:0,magnet:false}},   /* any other item (the board), on its tile */
  piece: {fx:'sparkle',    slot:'emissive',noLight:false,o:{size:15,flares:9}},   /* S.pieces[k]: the fragment lifted off its pedestal */
  place: {fx:'holy-light', slot:'emissive',noLight:false,o:{width:5,hold:.9,clip:{h:72,fade:20}}},   /* S.placed[k]: on its slot */
  door:  {fx:'holy-light', slot:'emissive',noLight:false,o:{width:10,hold:1.6,clip:{h:132,fade:28}}},   /* S.door: all four in */
  opened:{fx:'holy-light', slot:'emissive',noLight:false,o:{width:12,hold:2.13,clip:{h:150,fade:30}}},   /* 'opened' event */
  torch: {fx:'sparkle',    slot:'emissive',noLight:false,o:{size:8,flares:4}},   /* 'light' / 'cp': a new torch or checkpoint */
  /* UNWIRED (see UNWIRED below): staged for vfx.spawn() only */
  dash:  {fx:'movement',   slot:'emissive',noLight:true, o:{kind:'dash',distance:108,time:10/60}},
  blink: {fx:'movement',   slot:'emissive',noLight:false,o:{kind:'blink'}},
  /* ambient: made on room entry, room-sized areas so they stay put in the room while the camera moves */
  fireflies:{fx:'fireflies',     slot:'emissive',noLight:false,ambient:1,mask:1,ground:'floor',o:{grass:false,density:1,close:4},per:{density:'area',close:'w#'}},
  leaves:   {fx:'falling-leaves',slot:'emissive',noLight:true, ambient:1,mask:1,ground:'floor',o:{litter:false,leaves:24,drift:8},per:{leaves:'area#'}},
  fog:      {fx:'fog',           slot:'emissive',noLight:true, ambient:1,mask:1,o:{density:.3,layers:2,wind:10}},   /* density scales alpha and thickness */
  /* Molten: ash and cinders drifting up. The live ember is a creature (a small flame that lights the dark and glitches him on touch),
     so these never use its flame colours, never glow and never light: only the real ones do. heat:false drops the red shimmer. */
  embers:   {fx:'embers',        slot:'emissive',noLight:true, ambient:1,mask:1,o:{heat:false,density:.55},per:{density:'w'}},
  bubbles:  {fx:'bubbles',       slot:'emissive',noLight:true, ambient:1,mask:1,vent:96,o:{tint:false,caustics:false,surface:false,density:.6,specks:1},per:{specks:'area'}},
};

/* ambient per biome; ROOM_AMBIENT overrides a room by id (e.g. r5:[] for a quiet shrine). Fog is optional and off. */
export const AMBIENT={roots:['fireflies','leaves'],flood:['bubbles'],molten:['embers'],hub:[]};
export const ROOM_AMBIENT={};
export const FOG={on:false,biomes:['hub','roots']};

/* No engine hook yet: listed, not wired, no event names invented.
   dash: game/board.js (Flood's code, work in progress) now pushes a bare 'dash' (p.dt=DASH.n=10 frames at DASH.v=5.4 px a
   frame, so 54 px in 0.17 s, no wind-up, direction p.dd). The movement dash waits D0=0.12 s before it moves, then covers
   o.distance in o.time; the ghosts come from the Actor stub's silhouette(). UNVERIFIED against the real dash timing. */
export const UNWIRED={
  blink:'Undo rewind: no Undo ring and no event yet. When it exists: vfx.spawn("blink",feetX,feetY,{actor:true,to:toX*2})',
  dash:'Flood board dash: Flood owns it; staged as vfx.spawn("dash",feetX,feetY,{actor:true,facing:p.dd}). UNVERIFIED timing (D0 0.12 s wind-up)',
};

/* where a trigger plays, from render.js draw(): the seed on its item tile (blit at +2,+2, 7x8), the fragment above its
   pedestal (drawFragment at the tile's centre, (ty+1)*T - PED.length(16) - 13) and the torch flame (addLight at +6,+4) */
export const OFF={item:[6,6],piece:[6,-29],torch:[6,4]};
export const MAX=16;   /* one-shots alive at once; the oldest goes first */

/* colours per use, keyed by the room's biome (piece and place: the fragment's biome), 'any' as the fallback.
   Red is for danger only (thorns, enemy eyes): no default orange-red ramp in a neutral moment. */
const G7=['#ffffff','#eaffd0','#b8e886','#7fc044','#5a9a30','#3a6a22','#1f3a16'];   /* roots green, ACCENT[0] */
const B7=['#ffffff','#e8f6ff','#bfe2fa','#86c0ee','#4a9be6','#2a64a8','#173a66'];   /* flood blue, ACCENT[1] */
const STONE7=['#ffffff','#f6f4ff','#e4e0f4','#c6c0dc','#a29cba','#7a7492','#4a4658'];   /* the door's stone, pale */
export const FLY_ROOTS={'#c8ff5a':'#b8e86a','#6f8f2a':'#6a9a3c','#2a2418':'#24190f'};   /* fireflies' glow, dim, body toward PAL.roots */
const GOLD7=['#ffffff','#fffbe2','#fff0a6','#ffd94a','#e0bc48','#a08a3a','#5a4a20'];   /* torch yellows, no orange */
export const COLORS={
  stun:{any:{ramp:['#ffffff','#eef6ff','#c9e2f2','#9ec3dc','#6f93b4','#4a6488']}},   /* neutral, cool: not orange */
  root:{any:{palette:G7}},
  item:{flood:{palette:['#ffffff','#e0faff','#7fe0ff','#3a8ad5','#1d4aa8','#101a3e']},any:{palette:['#ffffff','#eaffd0','#a6e070','#6a9a3c','#3f6b2a','#1a2e10']}},
  piece:{roots:{warm:GOLD7,cool:['#ffffff','#eaffd0','#c8f09a','#9ad860','#7fc044','#4f8a2e','#2e5a1e','#16301a']},any:{warm:GOLD7}},
  place:{roots:{colors:G7},flood:{colors:B7},molten:{colors:['#ffffff','#fff6e0','#ffe2a8','#f8c070','#e0a050','#a8743a','#5a3e1e']},
    crystals:{colors:['#ffffff','#f6eeff','#e0ccfa','#c8a8f4','#b58af0','#7a5ab0','#40306a']},any:{colors:STONE7}},
  door:{any:{colors:STONE7}},
  opened:{any:{colors:STONE7}},
  torch:{any:{warm:GOLD7,cool:['#ffffff','#fffbe8','#fff4cc','#ffe9a0','#f0d890','#b8a470','#6a5a3a','#3a3020']}},
  /* flood rock; the skid's sparks are hard-coded SPARKS (hot, yellow, orange, tail): remapped to the flood blues */
  dash:{any:{colors:B7,groundColor:'#33475a',remap:{'#fff3a6':'#e8f6ff','#ffe26b':'#bfe2fa','#ff8a2a':'#86c0ee','#f2561d':'#4a9be6'}}},
  blink:{any:{colors:['#ffffff','#f0fbff','#d6f1ff','#a6dcf4','#7ab8e0','#4a7fb0','#2a4a70']}},
  fireflies:{},   /* upstream FLY colours (cream, lime, olive: no red), approved in the harness. To recolour: roots:{remap:FLY_ROOTS} (+~0.35 ms a frame) */
  leaves:{any:{colors:[['#8cc04a','#6a9a3c','#3f6b2a','#1f3a16'],['#b4b85a','#8a8a3a','#5e5e26','#2e2e12'],['#8a6440','#6b4a2b','#4a3322','#24190f']]}},   /* green, olive, brown */
  fog:{roots:{colors:['#1c2a1e','#2a3a2c','#405440']},flood:{colors:['#14222e','#1f3342','#33495c']},any:{colors:['#1b1a23','#2b2a33','#3b3843']}},
  bubbles:{any:{colors:['#ffffff','#c6f3f0','#86c0c4','#4a7f8c']}},
  /* embers hard-codes its colours: swapped exact pixel for pixel to moltenart's rust and ash (hot and yellow -> rustL, orange and
     deep orange -> rust, the red tail -> basalt grey; ash greys to its ash). The creature's emb/embL/core never appear. */
  embers:{any:{remap:{'#fff3a6':'#a0582e','#ffe26b':'#a0582e','#ff8a2a':'#7a3f22','#f2561d':'#7a3f22','#c9281f':'#47403b','#5a5160':'#6b625a','#3a3442':'#47403b'}}},
};
