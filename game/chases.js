/* Chases. Lifting a biome's fragment wakes a wall of thorns: its front is a vertical line at world x S.chase.x that
   sweeps east along the chase's path (CHASES in rooms/index.js) at each stretch's speed. Touching it glitches him out;
   after the death the wall restarts a fair gap behind the torch he comes back at, never at the start of the long run.
   Everything lives in S.chase as plain numbers (no randomness), so saves, snapshots and replays keep it exact.
   No DOM: tools/test_game.mjs runs it under node. */
import {T} from './state.js';
import {ROOMS,CHASES} from './rooms/index.js';

export const WITHER=60,ASSIST_SPEED=.7,ASSIST_GAP=1.5,REST=20;
/* the safe line, and the speed at a wall position (the last stretch that starts at or before it) */
export const endX=C=>C.path[C.path.length-1][0]*T;
export function speedAt(C,x){let v=C.path[0][1];for(const [tx,s] of C.path)if(s!==undefined&&x>=tx*T)v=s;return v}
/* his box's left edge and the wall, in world px */
export const worldX=S=>ROOMS[S.room].at[0]*T+S.p.x;

export function startChase(S,id,ev){const C=CHASES[id];S.chase={id,on:1,x:C.from*T,t:-C.beat,w:0};ev.push('chase_start')}

/* one frame. Returns true when the thorns touch him (the engine then glitches him out) */
export function stepChase(S,ev){
  const c=S.chase;if(!c)return false;
  if(!c.on){if(++c.w>=WITHER)S.chase=null;return false}   /* outrun: the thorns wither where they stopped */
  const C=CHASES[c.id];if(!C){S.chase=null;return false}
  if(S.p.dead)return false;                                /* the wall waits while he glitches out */
  const end=endX(C),wx=worldX(S);
  if(wx+S.p.w/2>=end){c.on=0;c.w=0;ev.push('chase_done');return false}   /* his middle over the safe line (rooms change there too) */
  if(++c.t>0)c.x=Math.min(end,c.x+speedAt(C,c.x)*(S.assist?ASSIST_SPEED:1));
  return wx+3<c.x-2;                                       /* his hitbox (3px in) reaches past the thorn tips */
}

/* after a death: back to the checkpoint torch's restart point, a short rest, then on again */
export function resetChase(S){
  const c=S.chase;if(!c||!c.on)return;
  const C=CHASES[c.id],cp=S.cp,key=cp&&cp.room+':'+cp.tx+','+cp.ty,R=cp&&ROOMS[cp.room];
  const x=C.at&&key in C.at?C.at[key]*T:R?(R.at[0]+cp.tx)*T+T/2-C.gap*(S.assist?ASSIST_GAP:1):C.from*T;
  c.x=Math.max(C.from*T,x);c.t=-REST;
}

/* how close the wall is, 0 (far) .. 1 (on him); the OS shake gets it in quarters */
export function nearness(S){
  const c=S.chase;if(!c||!c.on)return 0;
  const d=worldX(S)-c.x;return d<=0?1:Math.max(0,1-d/200);
}
