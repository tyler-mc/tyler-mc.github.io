/* Chases. Lifting a biome's fragment wakes a wall of thorns: its front is a vertical line at world x S.chase.x that
   sweeps east along the chase's path (CHASES in rooms/index.js) at each stretch's speed. Touching it glitches him out;
   after the death the wall restarts a fair gap behind the torch he comes back at, never at the start of the long run.
   Everything lives in S.chase as plain numbers (no randomness), so saves, snapshots and replays keep it exact.
   A chase with dir:-1 runs west (Flood): its front is the eel's snout, and with a tide (game/tide.js) S.chase also holds
   y, the water's level (world px), and l, how far the water runs ahead of the snout (px); the eel reaches only tide.reach
   px above that level. No DOM: tools/test_game.mjs and tools/test_flood_chase.mjs run it under node. */
import {T} from './state.js';
import {ROOMS,CHASES} from './rooms/index.js';
import {tideCols,levelAt} from './tide.js';

export const WITHER=60,ASSIST_SPEED=.7,ASSIST_GAP=1.5,REST=20;
/* the safe line, and the speed at a wall position (the last stretch that starts at or before it) */
export const endX=C=>C.path[C.path.length-1][0]*T;
export function speedAt(C,x){const d=C.dir||1;let v=C.path[0][1];for(const [tx,s] of C.path)if(s!==undefined&&(x-tx*T)*d>=0)v=s;return v}
/* his box's left edge (top edge) and the wall, in world px */
export const worldX=S=>ROOMS[S.room].at[0]*T+S.p.x;
export const worldY=S=>ROOMS[S.room].at[1]*T+S.p.y;

export function startChase(S,id,ev){const C=CHASES[id];S.chase={id,on:1,x:C.from*T,t:-C.beat,w:0};if(C.tide){S.chase.y=C.tide.y0;S.chase.l=0}ev.push('chase_start')}

/* one frame. Returns true when the thorns (the eel) touch him (the engine then glitches him out). Then the tide's
   columns for his room (game/tide.js; none without a tide) */
export function stepChase(S,ev){const hit=chase1(S,ev),c=S.chase;tideCols(S,ROOMS[S.room],c&&CHASES[c.id]);return hit}
function chase1(S,ev){
  const c=S.chase;if(!c)return false;
  if(!c.on){const C=CHASES[c.id];if(C&&C.tide)c.y+=C.tide.drain;if(++c.w>=WITHER)S.chase=null;return false}   /* outrun: the thorns wither where they stopped (the tide drains) */
  const C=CHASES[c.id];if(!C){S.chase=null;return false}
  if(S.p.dead)return false;                                /* the wall waits while he glitches out */
  const end=endX(C),wx=worldX(S),d=C.dir||1;
  if((wx+S.p.w/2-end)*d>=0){c.on=0;c.w=0;ev.push('chase_done');return false}   /* his middle over the safe line (rooms change there too) */
  if(C.tide){const D=C.tide,g=levelAt(C,c.x);c.y=c.y>g?Math.max(g,c.y-D.rise):Math.min(g,c.y+D.rise);c.l=Math.min(D.lip,c.l+D.lip/C.beat)}   /* the water swells, then runs ahead */
  if(++c.t>0){const v=speedAt(C,c.x)*(S.assist?ASSIST_SPEED:1);c.x=d>0?Math.min(end,c.x+v):Math.max(end,c.x-v)}
  if(d>0)return wx+3<c.x-2;                                /* his hitbox (3px in) reaches past the thorn tips */
  const up=C.tide?C.tide.reach-(c.t<0?Math.min(1,-c.t/C.beat):0)*(C.tide.reach+24):0;   /* rising out of its lair (the beat, a rest) it reaches less high, as drawn (floodart.js) */
  return wx+S.p.w-3>c.x+2&&(!C.tide||worldY(S)+S.p.h-3>c.y-up);   /* west: past the snout, and low enough for the eel */
}

/* after a death: back to the checkpoint torch's restart point, a short rest, then on again */
export function resetChase(S){
  const c=S.chase;if(!c||!c.on)return;
  const C=CHASES[c.id],cp=S.cp,key=cp&&cp.room+':'+cp.tx+','+cp.ty,R=cp&&ROOMS[cp.room];
  const d=C.dir||1,x=C.at&&key in C.at?C.at[key]*T:R?(R.at[0]+cp.tx)*T+T/2-d*C.gap*(S.assist?ASSIST_GAP:1):C.from*T;
  c.x=d>0?Math.max(C.from*T,x):Math.min(C.from*T,x);c.t=-REST;
  if(C.tide){c.y=levelAt(C,c.x);c.l=C.tide.lip}   /* the tide comes back with him, at its level there */
}

/* how close the wall is, 0 (far) .. 1 (on him); the OS shake gets it in quarters */
export function nearness(S){
  const c=S.chase;if(!c||!c.on)return 0;
  const C=CHASES[c.id],d=C&&C.dir<0?c.x-(worldX(S)+S.p.w):worldX(S)-c.x;return d<=0?1:Math.max(0,1-d/200);
}
/* how far the front has come, 0 (its start) .. 1 (the safe line); the OS 'flood' level gets it in quarters */
export function progress(S){
  const c=S.chase,C=c&&CHASES[c.id];if(!C||!c.on)return 0;
  const a=C.from*T,b=endX(C);return b===a?1:Math.max(0,Math.min(1,(c.x-a)/(b-a)));
}
