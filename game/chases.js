/* Chases. Lifting a biome's fragment wakes a wall of thorns: its front is a vertical line at world x S.chase.x that
   sweeps east along the chase's path (CHASES in rooms/index.js) at each stretch's speed. Touching it glitches him out;
   after the death the wall restarts a fair gap behind the torch he comes back at, never at the start of the long run.
   Everything lives in S.chase as plain numbers (no randomness), so saves, snapshots and replays keep it exact.
   A chase with dir:-1 runs west (Flood): its front is the eel's snout, and with a tide (game/tide.js) S.chase also holds
   y, the water's level (world px), and l, how far the water runs ahead of the snout (px); the eel reaches only tide.reach
   px above that level. No DOM: tools/test_game.mjs and tools/test_flood_chase.mjs run it under node. */
import {T} from './state.js';
import {ROOMS,CHASES} from './rooms/index.js';
import {tideCols,levelAt,stirTide} from './tide.js';
import {startGeyser,stepGeyser,resetGeyser,nearGeyser,progressGeyser} from './geysers.js';   /* Molten: kind 'geyser' (waves of eruptions, not a front) */
import {startSweep,stepSweep,resetSweep,nearSweep,progressSweep} from './sweep.js';   /* Crystals: kind 'sweep' (a front moving down the tower) */
const geyser=c=>c&&CHASES[c.id]&&CHASES[c.id].kind==='geyser';
const sweep=c=>c&&CHASES[c.id]&&CHASES[c.id].kind==='sweep';

export const WITHER=60,ASSIST_SPEED=.7,ASSIST_GAP=1.5,REST=20;
/* the eel's surge (Flood): a cycle of `surge` frames on the chase clock c.t (so it needs no state of its own, and stops
   while he glitches out). From `wind` it rears back with its jaw opening (the telegraph), at `snap` the jaw slams shut.
   Only the look, the sound and the shake follow it: the snout (c.x), its speed and its reach never change */
export const EEL={surge:96,wind:56,snap:86};
/* how high over the water (px) the eel's head reaches now: the tide's reach once it is up, less while it rises out of
   its lair (the beat, or the rest after a death). The art draws its head's top exactly here (floodart.js) */
export const reachOf=(c,C)=>C.tide.reach-(c.t<0?Math.min(1,-c.t/C.beat):0)*(C.tide.reach+24);
/* the surge's phase now, 0..EEL.surge-1, or -1 while the eel is not chasing */
export const surgeAt=c=>c&&c.on&&c.t>0?c.t%EEL.surge:-1;
/* the safe line, and the speed at a wall position (the last stretch that starts at or before it) */
export const endX=C=>C.path[C.path.length-1][0]*T;
export function speedAt(C,x){const d=C.dir||1;let v=C.path[0][1];for(const [tx,s] of C.path)if(s!==undefined&&(x-tx*T)*d>=0)v=s;return v}
/* his box's left edge (top edge) and the wall, in world px */
export const worldX=S=>ROOMS[S.room].at[0]*T+S.p.x;
export const worldY=S=>ROOMS[S.room].at[1]*T+S.p.y;

export function startChase(S,id,ev){const C=CHASES[id];if(C.kind==='geyser')return startGeyser(S,id,ev);if(C.kind==='sweep')return startSweep(S,id,ev);S.chase={id,on:1,x:C.from*T,t:-C.beat,w:0};if(C.tide){S.chase.y=C.tide.y0;S.chase.l=0}ev.push('chase_start')}

/* one frame. Returns true when the thorns (the eel) touch him (the engine then glitches him out). Then the tide's
   columns for his room (game/tide.js; none without a tide) */
export function stepChase(S,ev){if(geyser(S.chase))return stepGeyser(S,ev);if(sweep(S.chase))return stepSweep(S,ev);const hit=chase1(S,ev),c=S.chase,C=c&&CHASES[c.id],R=ROOMS[S.room];tideCols(S,R,C);
  if(C&&C.tide&&c.on&&!S.p.dead&&S.liq&&S.liq.tide)stirTide(S,R,c,C,surgeAt(c),surgeAt(c)===EEL.snap,reachOf({t:c.t-1},C),reachOf(c,C));   /* the eel churns the water (tide.js) */
  return hit}
function chase1(S,ev){
  const c=S.chase;if(!c)return false;
  if(!c.on){const C=CHASES[c.id];if(C&&C.tide)c.y+=C.tide.drain;if(++c.w>=WITHER)S.chase=null;return false}   /* outrun: the thorns wither where they stopped (the tide drains) */
  const C=CHASES[c.id];if(!C){S.chase=null;return false}
  if(S.p.dead)return false;                                /* the wall waits while he glitches out */
  const end=endX(C),wx=worldX(S),d=C.dir||1;
  if((wx+S.p.w/2-end)*d>=0){c.on=0;c.w=0;ev.push('chase_done');return false}   /* his middle over the safe line (rooms change there too) */
  if(C.tide){const D=C.tide,g=levelAt(C,c.x);c.y=c.y>g?Math.max(g,c.y-D.rise):Math.min(g,c.y+D.rise);c.l=Math.min(D.lip,c.l+D.lip/C.beat)}   /* the water swells, then runs ahead */
  const up0=C.tide?reachOf(c,C):0;
  if(++c.t>0){const v=speedAt(C,c.x)*(S.assist?ASSIST_SPEED:1);c.x=d>0?Math.min(end,c.x+v):Math.max(end,c.x-v)}
  if(d>0)return wx+3<c.x-2;                                /* his hitbox (3px in) reaches past the thorn tips */
  const up=C.tide?reachOf(c,C):0;   /* rising out of its lair (the beat, a rest) it reaches less high, as drawn (floodart.js) */
  if(C.tide)eelBeats(S,c,up0,up,ev);
  return wx+S.p.w-3>c.x+2&&(!C.tide||worldY(S)+S.p.h-3>c.y-up);   /* west: past the snout, and low enough for the eel */
}

/* the eel's beats as events, all from the chase clock: 'eel_breach' as its head breaks the water (in the beat, never after a
   rest), and while it is near him (nearness) 'eel_wind' as it rears for a lunge and 'eel_snap' as its jaw slams shut. The
   breach and a close snap shake the view (S.cam.sh; the renderer skips it under reduced motion) */
function eelBeats(S,c,up0,up,ev){
  if(up0<0&&up>=0){ev.push('eel_breach');const R=ROOMS[S.room];if(c.x>=R.at[0]*T&&c.x<(R.at[0]+R.w)*T)S.cam.sh=Math.max(S.cam.sh,3)}
  const p=surgeAt(c);if(p!==EEL.wind&&p!==EEL.snap)return;
  const k=nearness(S);if(k<=0)return;
  if(p===EEL.wind)ev.push('eel_wind');else{ev.push('eel_snap');if(k>.25)S.cam.sh=Math.max(S.cam.sh,Math.round(k*12)/4)}
}

/* after a death: back to the checkpoint torch's restart point, a short rest, then on again */
export function resetChase(S){
  const c=S.chase;if(!c||!c.on)return;if(geyser(c))return resetGeyser(S);if(sweep(c))return resetSweep(S);
  const C=CHASES[c.id],cp=S.cp,key=cp&&cp.room+':'+cp.tx+','+cp.ty,R=cp&&ROOMS[cp.room];
  const d=C.dir||1,x=C.at&&key in C.at?C.at[key]*T:R?(R.at[0]+cp.tx)*T+T/2-d*C.gap*(S.assist?ASSIST_GAP:1):C.from*T;
  c.x=d>0?Math.max(C.from*T,x):Math.min(C.from*T,x);c.t=-REST;
  if(C.tide){c.y=levelAt(C,c.x);c.l=C.tide.lip}   /* the tide comes back with him, at its level there */
}

/* how close the wall is, 0 (far) .. 1 (on him); the OS shake gets it in quarters */
export function nearness(S){
  const c=S.chase;if(!c||!c.on)return 0;if(geyser(c))return nearGeyser(S);if(sweep(c))return nearSweep(S);
  const C=CHASES[c.id],d=C&&C.dir<0?c.x-(worldX(S)+S.p.w):worldX(S)-c.x;return d<=0?1:Math.max(0,1-d/200);
}
/* how far the front has come, 0 (its start) .. 1 (the safe line); the OS 'flood' level gets it in quarters */
export function progress(S){
  const c=S.chase,C=c&&CHASES[c.id];if(!C||!c.on)return 0;if(C.kind==='geyser')return progressGeyser(S);if(C.kind==='sweep')return progressSweep(S);
  const a=C.from*T,b=endX(C);return b===a?1:Math.max(0,Math.min(1,(c.x-a)/(b-a)));
}
