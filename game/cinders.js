/* Molten creatures (and the vents' step, game/geysers.js). Both are soft (the root burst slides off them, as off Flood's)
   and mol (enemies.js, render.js and fish.js hand them here); touching a live one glitches him out (cinderTouch).
   Ember sprite ('E'): a small flame drifting on a figure-eight round its tile: drift px side to side, amp px up and down
   (ents; pace: whole percent of its speed; phase: frames into the path; ox, oy: px its round sits off the tile, so it
   can centre in a gap between tiles). It lights the dark a little (render.js light
   pass, game/moltenart.js). Any live vine box in S.vines that overlaps it smothers it to smoke; it relights EMBER.relight
   frames after the last vine has left it (never while he is inside it), sparking for its last EMBER.warn frames.
   Slag beetle ('K'): an air cell beside cracked rock ('X'). It lives in that rock: its burrow is the X tile beside its
   cell (below, left, right, then above, the first that is X). It crawls `reach` tiles each way along that face (ent,
   default 0: it sits) while the tile behind it stays X, `pace` percent of BEETLE.sp. Drilling its burrow, or the X tile
   behind it (any tile in S.drillNow), knocks it out of its shell: stunned, and the shell is a solid ledge for BEETLE.shell
   frames (its last BEETLE.wob frames a wobble), standable like the hermit crab's; then it closes and, after BEETLE.grace
   harmless frames, is live again. If the burrow itself is gone (a real drill crumbles the whole cracked patch,
   S.drilled), there is no rock to close on: the shell stays a ledge until the room is re-entered.
   Contracts read from game/claws (agent E): S.vines, an array of boxes {x,y,w,h} in room px (or {box:{x,y,w,h}}); one
   with dead, gone or alive===0/false set does not count. S.drillNow, the tiles drilled this frame, as [tx,ty], {tx,ty}
   or 'tx,ty' entries (an array, or an object keyed 'tx,ty'). Both are read after his move (engine step, cinderTouch), so
   either may be rebuilt in his step. Plain numbers only; no randomness. No DOM. */
import {T} from './state.js';
import {ov,tile,solid} from './engine.js';
import {spawnVent,stepVent,ventBox} from './geysers.js';
import {FEEL} from './player.js';

/* ember: path speed (radians per frame), default drift and amp (px), relight frames, sparking frames before it, light
   radius lit (px) and while sparking. beetle: crawl speed (px per frame), shell frames, wobble frames, grace frames */
export const EMBER={sp:.03,drift:12,amp:6,relight:300,warn:60,r:22,rw:8},BEETLE={sp:.3,shell:300,wob:60,grace:30};
export {spawnVent};

/* ---------- the contracts ---------- */
const box=v=>v&&(v.box||v);
const alive=v=>v&&!v.dead&&!v.gone&&v.alive!==0&&v.alive!==false;
export const vinesOver=(S,e)=>Array.isArray(S.vines)&&S.vines.some(v=>{const b=box(v);return alive(v)&&b&&Number.isFinite(b.x)&&ov(b,e)});
const tileKey=q=>Array.isArray(q)?q[0]+','+q[1]:typeof q==='string'?q:q&&Number.isFinite(q.tx)?q.tx+','+q.ty:'';
export function drilledNow(S,tx,ty){
  const D=S.drillNow,k=tx+','+ty;if(!D)return false;
  if(Array.isArray(D))return D.some(q=>tileKey(q)===k);
  return typeof D==='object'&&!!D[k];
}

/* ---------- spawning ---------- */
const hardC=c=>c===null||c==='#'||c==='='||c==='X';
export function spawnCinder(R,s){
  const pace=s.pace>0?s.pace/100:1;
  if(s.k==='E'){const e={k:'ember',mol:1,soft:1,hx:s.tx*T+1+(Number.isFinite(s.ox)?s.ox:0),hy:s.ty*T+1+(Number.isFinite(s.oy)?s.oy:0),x:0,y:0,w:10,h:10,ph:(s.phase|0)*EMBER.sp*pace,sp:EMBER.sp*pace,
      dr:Number.isFinite(s.drift)?s.drift:EMBER.drift,amp:Number.isFinite(s.amp)?s.amp:EMBER.amp,st:0,t:0,wrap:0,grace:0,pass:0,dx:0,dy:0};emberAt(e);return e}
  /* the beetle: its burrow side g, the face it crawls along (a), and how far it may go each way (px from its cell) */
  const N=[[0,1],[-1,0],[1,0],[0,-1]],g=N.find(([a,b])=>tile(R,s.tx+a,s.ty+b)==='X')||N.find(([a,b])=>hardC(tile(R,s.tx+a,s.ty+b)))||[0,1];
  const ax=g[1]?1:0,ay=g[0]?1:0,reach=Math.max(0,Math.min(8,s.reach|0)),run=d=>{let k=0;
    while(k<reach){const x=s.tx+ax*d*(k+1),y=s.ty+ay*d*(k+1),c=tile(R,x,y);if(hardC(c)||c==='^'||tile(R,x+g[0],y+g[1])!=='X')break;k++}return k*T};
  const e={k:'beetle',mol:1,soft:1,hx:s.tx,hy:s.ty,gx:g[0],gy:g[1],ax,ay,lo:-run(-1),hi:run(1),u:0,dir:s.dir<0?-1:1,sp:BEETLE.sp*pace,
    st:0,x:0,y:0,w:0,h:0,wrap:0,grace:0,pass:0,dx:0,dy:0};
  beetleBox(e);return e;
}
function emberAt(e){e.x=e.hx+e.dr*Math.sin(e.ph);e.y=e.hy+e.amp*Math.sin(e.ph*2)}
/* closed: 14 px along its face, 8 px deep, flush on it. Open on a wall: a ledge 14 px out from the wall, 6 px tall */
function beetleBox(e){
  const cx=e.hx*T+T/2+e.ax*e.u+e.gx*2,cy=e.hy*T+T/2+e.ay*e.u+e.gy*2;
  if(e.st===1&&e.gx){e.w=14;e.h=6;e.x=e.gx>0?(e.hx+1)*T-14:e.hx*T;e.y=Math.round(cy)-3;return}
  e.w=e.ax?14:8;e.h=e.ax?8:14;e.x=cx-e.w/2;e.y=cy-e.h/2;
}
/* the X tiles it is weak at: its burrow, and the one behind its middle now */
const weak=e=>{const cx=e.hx+Math.round(e.ax*e.u/T),cy=e.hy+Math.round(e.ay*e.u/T);return [[e.hx+e.gx,e.hy+e.gy],[cx+e.gx,cy+e.gy]]};

/* ---------- one frame (from stepEnemies, before his move) ---------- */
export function stepCinder(S,R,e,ev){
  if(e.k==='vent')return stepVent(S,R,e,ev);
  if(e.k==='ember'){
    if(e.st===1){if(vinesOver(S,e))e.t=EMBER.relight;else if(e.t>1)e.t--;
      else{const p=S.p;if(!ov({x:p.x+3,y:p.y+3,w:p.w-6,h:p.h-6},e)){e.st=0;e.t=0;ev.push('ember_lit')}}   /* never relights inside him */
      return}
    e.ph+=e.sp;emberAt(e);return;
  }
  /* the beetle */
  if(e.wrap>0){if(!solid(S,R,e.hx+e.gx,e.hy+e.gy)){e.wrap=BEETLE.shell;return}   /* its burrow drilled away: no rock to close on, so the shell stays a ledge this visit */
    if(--e.wrap===0){e.st=0;e.grace=BEETLE.grace;beetleBox(e);ev.push('beetle_shut')}return}
  if(e.grace>0){e.grace--;return}
  e.u+=e.dir*e.sp;if(e.u>=e.hi){e.u=e.hi;e.dir=-1}else if(e.u<=e.lo){e.u=e.lo;e.dir=1}
  beetleBox(e);
}

/* after his move: vines smother embers, drills open beetles; then a live ember, a closed beetle or an eruption touching
   him. Returns the S.ens index of what got him (the engine glitches him out), else -1 */
export function cinderTouch(S,R,ev){
  const p=S.p;if(p.dead||!S.ens.length)return -1;
  const hb={x:p.x+3,y:p.y+3,w:p.w-6,h:p.h-6};let hit=-1;
  S.ens.forEach((e,i)=>{
    if(!e.mol)return;
    if(e.k==='ember'){if(e.st===0&&vinesOver(S,e)){e.st=1;e.t=EMBER.relight;ev.push('ember_out');return}
      if(e.st===0&&hit<0&&!p.inv&&ov(hb,{x:e.x+1,y:e.y+1,w:e.w-2,h:e.h-2}))hit=i;return}
    if(e.k==='beetle'){
      if(!e.wrap&&S.drillNow&&weak(e).some(([x,y])=>drilledNow(S,x,y))){e.st=1;e.wrap=BEETLE.shell;e.grace=0;beetleBox(e);e.pass=ov(e,p)?1:0;
        S.hit=Math.round(FEEL.HIT);S.cam.sh=3;ev.push('beetle_open');return}
      if(!e.wrap&&!e.grace&&hit<0&&!p.inv&&ov(hb,{x:e.x+1,y:e.y+1,w:e.w-2,h:e.h-2}))hit=i;return}
    if(e.k==='vent'){const b=ventBox(e);if(b&&hit<0&&!p.inv&&ov(hb,b))hit=i}
  });
  return hit;
}

/* the light they give (render.js light pass): a lit ember a small warm circle, a sparking one a glint. Vents give none */
export function cinderLights(S,add){
  for(const e of S.ens){if(e.k!=='ember')continue;const x=e.x+e.w/2,y=e.y+e.h/2-1;
    if(e.st===0)add(x,y,EMBER.r,.75);else if(e.t<EMBER.warn)add(x,y,EMBER.rw,.5)}
}
