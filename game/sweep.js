/* Crystals: the delete sweep (CHASES.crystals, kind 'sweep'; game/chases.js hands it here). Lifting the Crystals fragment
   (K10, the top of the tower) starts a front at world px y `from` that moves DOWN the tower toward the hub. Everything
   above the front is deleted: deleted(S,wy) says so for a world px row, and the engine's solid() asks it with a tile's
   bottom pixel row, so a tile goes non-solid only once it is wholly above the front (the renderer draws the void there,
   game/crystalart.js sweepVoid: black, with a 24 px dissolving band over the front).
   CHASES.crystals, all in WORLD PX (not tiles, unlike the thorns' path):
     {kind:'sweep', from:<y of K10's top>, end:<the safe line, the hub floor>, beat:<frames before it moves>,
      rate:<px per frame>, path:[[y,rate],...] (optional; the last stretch whose y is at or above the front sets its speed),
      gap:<px above his torch after a death>, at:{'room:tx,ty':y} (optional; pins a torch's restart y)}
   S.chase = {id,on,y (the front, world px),t (frames: -beat .. 0 waits, then counts moving frames),w (frames since
   outrun),x:0,m}. x is a constant 0 only so state.js persist()/resume() (which keep a chase with a finite x) keep it
   across a reload; resetSweep() rebuilds y from his torch. m: 1 once the front has moved (the rumble's one-shot).
   He touches the front when his box bottom is SWEEP.touch px beyond it (inside the dissolving band): the engine glitches
   him out; after the death the front restarts `gap` px above the torch he comes back at (never above `from`), after a
   short rest. The front is anchored: Undo never rewinds it, and sweepClamp() stops a rewind 60 px under it.
   Assist: 70% speed and a gap half again as wide; no layout change. Plain numbers, no randomness, no clock, no DOM.
   A leaf module (state.js and rooms/index.js only), so undo.js's lazy import and engine.js's solid() can both use it. */
import {T} from './state.js';
import {ROOMS,CHASES,roomAtTile} from './rooms/index.js';

/* beat/rest/wither: frames (the same as chases.js's REST and WITHER); assist/gap: Assist's speed and gap factors (the same as
   chases.js ASSIST_SPEED and ASSIST_GAP); touch: px his box bottom must pass the front to die; above: px his box top must
   stay under the front on a rewind (undo.js UNDO.above); edge: frames between 'sweep_edge' while it dissolves tiles; near:
   the reach (px) of nearness(); rate/gap: defaults when the entry has none */
export const SWEEP={beat:60,rest:20,wither:60,assist:.7,agap:1.5,touch:3,above:60,edge:45,near:200,rate:1.2,gap:150};
/* the sweep's events, in one place: the engine saves on and the host gets the first two; A3's art and audio read the rest */
export const SWEEP_EV={start:'chase_start',done:'chase_done',rumble:'sweep_rumble',edge:'sweep_edge'};

const kindOf=c=>c&&CHASES[c.id]&&CHASES[c.id].kind==='sweep'?CHASES[c.id]:null;
/* the running sweep's entry, or null */
const live=S=>{const c=S.chase;return c&&c.on&&Number.isFinite(c.y)?kindOf(c):null};
const fromY=C=>C.from??0;
export const endY=C=>C.end??(C.path&&C.path.length?C.path[C.path.length-1][0]:0);
/* the front's speed (px/frame) at world px y, before Assist */
export function speedAt(C,y){let v=C.rate??SWEEP.rate;for(const [py,s] of C.path||[])if(s!==undefined&&y>=py)v=s;return v}
/* his box in world px */
const worldY=S=>ROOMS[S.room].at[1]*T+S.p.y;
const worldX=S=>ROOMS[S.room].at[0]*T+S.p.x;

/* ---------- the hooks others read ---------- */
/* true when world px row wy is deleted (above the running sweep's front). Hot: solid() calls it */
export function deleted(S,wy){const c=S.chase;if(!c||!c.on)return false;return wy<c.y&&!!live(S)}
/* tile row ty of room R is wholly above the front (its bottom pixel row is deleted): the engine's solid() hook */
export const gone=(S,R,ty)=>deleted(S,(R.at[1]+ty+1)*T-1);
/* Undo's clamp (undo.js, CONTRACT): called with S.p set to a candidate history frame's player; true stops the rewind there,
   when his box top would be less than `above` px under the running sweep's front */
export function sweepClamp(S){
  const c=S.chase,C=c&&c.on&&CHASES[c.id];if(!C||C.kind!=='sweep'||!Number.isFinite(c.y))return false;
  return worldY(S)<c.y+SWEEP.above;
}

/* ---------- the chase (called through game/chases.js) ---------- */
export function startSweep(S,id,ev){const C=CHASES[id];S.chase={id,on:1,y:fromY(C),t:-(C.beat??SWEEP.beat),w:0,x:0,m:0};ev.push(SWEEP_EV.start)}
/* one frame. True when the front touches him (the engine then glitches him out) */
export function stepSweep(S,ev){
  const c=S.chase,C=CHASES[c.id];
  if(!c.on){if(++c.w>=SWEEP.wither)S.chase=null;return false}   /* outrun: it lingers, then is gone */
  if(S.p.dead)return false;                                    /* the front waits while he glitches out */
  const end=endY(C),wy=worldY(S),bot=wy+S.p.h;
  if(bot>=end){c.on=0;c.w=0;ev.push(SWEEP_EV.done);return false}   /* his box on the safe line (the hub floor) */
  if(!Number.isFinite(c.y))resetSweep(S);   /* a chase from an old save: behind his torch */
  if(++c.t>0){
    const y0=c.y,v=speedAt(C,c.y)*(S.assist?SWEEP.assist:1);c.y=Math.min(end,c.y+v);
    if(!c.m){c.m=1;ev.push(SWEEP_EV.rumble)}   /* once, as it first moves after the opening beat */
    edgeEv(S,c,y0,ev);
  }
  return bot+SWEEP.touch<c.y;   /* his box bottom 3 px beyond the front: inside the dissolving band */
}
/* 'sweep_edge': as the front crosses into another room (at his column), and every SWEEP.edge moving frames while its row
   holds tiles to dissolve. Stateless: the rows before and after this frame's move, and the chase clock */
const HARD='#=XQDRG';
function edgeEv(S,c,y0,ev){
  const col=Math.floor((worldX(S)+S.p.w/2)/T),a=roomAtTile(col,Math.floor(y0/T)),b=roomAtTile(col,Math.floor(c.y/T));
  if(b&&a!==b){ev.push(SWEEP_EV.edge);return}
  if(!b||c.t%SWEEP.edge)return;
  const row=b.g[Math.floor(c.y/T)-b.at[1]];if(row&&[...row].some(ch=>HARD.includes(ch)))ev.push(SWEEP_EV.edge);
}
/* after a death (and on reload): `gap` px above his torch's tile (`at` pins one: 'room:tx,ty' -> world px y), never above
   `from` nor below the safe line, after a short rest */
export function resetSweep(S){
  const c=S.chase;if(!c||!c.on)return;const C=CHASES[c.id],cp=S.cp,key=cp&&cp.room+':'+cp.tx+','+cp.ty,R=cp&&ROOMS[cp.room];
  const y=C.at&&key in C.at?C.at[key]:R?(R.at[1]+cp.ty)*T-(C.gap??SWEEP.gap)*(S.assist?SWEEP.agap:1):fromY(C);
  c.y=Math.min(endY(C),Math.max(fromY(C),y));c.t=-SWEEP.rest;c.w=0;c.x=0;
}
/* how close the front is to his box top, 0 (SWEEP.near px or more) .. 1 (on him); the OS shake and the rumble get it */
export function nearSweep(S){
  const c=S.chase;if(!c||!c.on||!Number.isFinite(c.y))return 0;const d=worldY(S)-c.y;return d<=0?1:Math.max(0,1-d/SWEEP.near);
}
/* how far the front has come, 0 (`from`) .. 1 (the safe line); the OS 'erase' level gets it in quarters */
export function progressSweep(S){
  const c=S.chase,C=kindOf(c);if(!C||!c.on||!Number.isFinite(c.y))return 0;const a=fromY(C),b=endY(C);return b===a?1:Math.max(0,Math.min(1,(c.y-a)/(b-a)));
}
export {nearSweep as nearness,progressSweep as progress};
