/* Crystals mechanics (beat sheet section 4). Plain numbers only, no randomness, no wall clock, and no timing from S.t:
   every clock is a counter in S.cr or in an S.ens entry, so the Undo buffer (game/undo.js, which copies p, ens, roots,
   vines, drilled, crack, gate, plate and cr each live frame) rewinds them all consistently. No DOM.
   Tiles (rooms/index.js parse() keeps the glyphs in R.g):
   - Q shard step: solid. He stands on it and it cracks; ent delay frames later (default CRY.delay) it falls out of the
     world (no longer solid). It returns when the room is re-entered; a rewind restores it. S.cr.q = {'tx,ty': frames
     since he first stood on it}; only tiles that have started are listed.
   - R receiver: a wall tile (always solid), ent id. Lit by a beam it fills a ring, 1 per frame; unlit it drains 1 per
     frame (so a drifter's bob does not reset it). Full (CRY.ring frames) it latches for good: S.latch['<room>:R:tx,ty'].
     S.cr.rx = {'tx,ty': fill} for rings that are filling.
   - D crystal lock: ent id. Solid until every receiver in the room with the same id has latched; then
     S.latch['<room>:D:<id>'] is set and it never shuts again (read from S.latch only, since S.cr is rewound).
   Entities in S.ens (spawned by enemies.js spawnEnemies after the vents, so older indices hold; e.cr is set on both):
   - W moving platform (k 'plat', soft): ents dx, dy (tiles), sp (px per frame x100, default CRY.sp), w (tiles, default 3),
     pause (frames at each end, default CRY.pause), phase (frames into its cycle). It moves between its tile and
     tile+(dx,dy) and back. A box CRY.ph px tall whose top is the tile's top. Solid through cryBoxes() (engine solids());
     he is carried by its move here (not through p.on). A platform moving into him pushes him.
   - Y prism drifter (k 'prism', not soft: touching it hurts, and the root burst wraps it): ents aim (u d l r, default r),
     amp (px, default CRY.amp), sp (percent of CRY.drift), beam (an on/off period in frames, on for its first half; 0 or
     absent: always on), phase (frames into its drift). It drifts on a sine across its beam (aim l/r drifts up and down,
     aim u/d side to side). Its lens casts a beam along its row or column to the first solid tile (tiles only, inside the
     room) or the first live vine (a vine blocks a beam like a wall). The beam hurts him (a 2 px line: beamSeg()).
     A root wrap sinks it (like the spore puff) and cuts its beam until it unwraps. A board ram (dash, or a fast surf)
     shoves it half a tile along the ram, shatters its lens (no beam until the room is re-entered or a rewind) and gives
     it CRY.grace harmless frames. e.lens 1 whole, 0 shattered; e.t its own clock (beam period); e.ph its drift phase.
   The Echo (Z) lives in game/echo.js (anchored, S.echo). */
import {T} from './state.js';
import {ov,solid,move} from './engine.js';
import {FEEL} from './player.js';
import {stepEcho,echoTouch,echoBox} from './echo.js';

/* delay: default shard frames; fall: frames a fallen shard takes to drop out of sight; ring: receiver frames to latch;
   sp/pause/ph: platform default speed (px per frame x100), end pause (frames), thickness (px); amp/drift: drifter bob (px)
   and phase speed (radians per frame at sp 100); w: drifter box; shove: px a ram moves it; grace: harmless frames after a
   ram or an unwrap; sink/ret: wrapped fall accel and the return speed (px per frame); ram: surf speed that rams */
export const CRY={delay:24,fall:40,ring:30,sp:50,pause:40,ph:8,amp:12,drift:.03,w:12,shove:6,grace:30,sink:.2,ret:.8,ram:2.2};
const AIM={r:[1,0],l:[-1,0],d:[0,1],u:[0,-1]};
const key=(tx,ty)=>tx+','+ty;
export const rxKey=(R,tx,ty)=>R.id+':R:'+tx+','+ty;
export const lockKey=(R,id)=>R.id+':D:'+id;

/* ---------- tiles ---------- */
/* shard frames since he stood on it (-1: intact, never stood on) */
const shardT=(S,tx,ty)=>{const q=S.cr&&S.cr.q,v=q&&q[key(tx,ty)];return v===undefined?-1:v};
const delayOf=(R,tx,ty)=>{const d=R.qd&&R.qd[key(tx,ty)];return d>0?d:CRY.delay};
/* {st: 0 intact, 1 cracking, 2 falling, 3 gone, k: 0..1 through that state, dy: px it has fallen} */
export function shardState(S,R,tx,ty){
  const t=shardT(S,tx,ty),d=delayOf(R,tx,ty);
  if(t<0)return {st:0,k:0,dy:0};
  if(t<d)return {st:1,k:t/d,dy:0};
  const f=t-d;if(f<CRY.fall)return {st:2,k:f/CRY.fall,dy:.15*f*f};
  return {st:3,k:1,dy:.15*CRY.fall*CRY.fall};
}
export const lockOpen=(S,R,id)=>!!(S.latch&&S.latch[lockKey(R,id)]);
/* a receiver's ring: 0..1, 1 once latched */
export const rxFill=(S,R,tx,ty)=>S.latch&&S.latch[rxKey(R,tx,ty)]?1:Math.min(1,((S.cr&&S.cr.rx&&S.cr.rx[key(tx,ty)])||0)/CRY.ring);
export const rxLatched=(S,R,tx,ty)=>!!(S.latch&&S.latch[rxKey(R,tx,ty)]);
/* engine solid() for c in Q, D, R. A tile seen past the room's edge is solid (as G and X are) */
export function crySolid(S,R,tx,ty,c,out){
  if(out)return true;
  if(c==='Q')return shardT(S,tx,ty)<delayOf(R,tx,ty);
  if(c==='D'){const id=R.lockAt&&R.lockAt[key(tx,ty)];return id===undefined||!lockOpen(S,R,id)}
  return true;   /* R: a receiver is a wall */
}

/* ---------- entities ---------- */
const num=(v,d)=>Number.isFinite(v)?v:d;
export function spawnCrystal(R,s){
  if(s.k==='W'){
    const w=Math.max(1,Math.min(16,num(s.w,3)|0)),ex=num(s.dx,0)*T,ey=num(s.dy,0)*T,sp=Math.max(1,num(s.sp,CRY.sp))/100;
    const e={k:'plat',cr:1,soft:1,x:s.tx*T,y:s.ty*T,w:w*T,h:CRY.ph,hx:s.tx*T,hy:s.ty*T,ex,ey,L:Math.hypot(ex,ey),u:0,dir:1,
      wt:Math.max(0,num(s.pause,CRY.pause)|0),pause:Math.max(0,num(s.pause,CRY.pause)|0),sp,wrap:0,grace:0,pass:0,dx:0,dy:0};
    for(let i=Math.max(0,num(s.phase,0)|0)%100000;i>0;i--)platAdvance(e);platPlace(e);return e;
  }
  const aim=AIM[s.aim]?s.aim:'r',e={k:'prism',cr:1,x:s.tx*T,y:s.ty*T,w:CRY.w,h:CRY.w,hx:s.tx*T,hy:s.ty*T,aim,
    amp:num(s.amp,CRY.amp),sp:CRY.drift*Math.max(0,num(s.sp,100))/100,ph:0,per:Math.max(0,num(s.beam,0)|0),t:0,lens:1,
    vy:0,ret:0,wrap:0,grace:0,pass:0,dx:0,dy:0};
  e.ph=e.sp*Math.max(0,num(s.phase,0));prismPlace(e);return e;
}
/* the platform's own counter: u px along its path, dir, wt frames of pause left */
function platAdvance(e){
  if(!e.L)return;
  if(e.wt>0){e.wt--;return}
  e.u+=e.dir*e.sp;
  if(e.u>=e.L){e.u=e.L;e.dir=-1;e.wt=e.pause}else if(e.u<=0){e.u=0;e.dir=1;e.wt=e.pause}
}
function platPlace(e){const f=e.L?e.u/e.L:0;e.x=e.hx+e.ex*f;e.y=e.hy+e.ey*f}
const prismAt=e=>{const s=Math.sin(e.ph)*e.amp;return e.aim==='l'||e.aim==='r'?[e.hx,e.hy+s]:[e.hx+s,e.hy]};
function prismPlace(e){[e.x,e.y]=prismAt(e)}

/* one frame (from enemies.js stepEnemies, before his move) */
export function stepCrystal(S,R,e,ev){
  if(e.k==='plat')return stepPlat(S,R,e);
  e.t++;
  if(e.wrap>0){   /* wrapped: it sinks (never lifts him) and its beam is cut */
    if(--e.wrap===0){e.grace=CRY.grace;e.ret=1;ev.push('unwrap')}
    else{e.vy=Math.min(3,e.vy+CRY.sink);if(move(S,R,e,0,e.vy,[]).hy)e.vy=0;if(ov(e,S.p))e.pass=1}
    return;
  }
  if(e.grace>0){e.grace--;return}
  if(e.ret){const [tx,ty]=prismAt(e),ax=tx-e.x,ay=ty-e.y;
    e.x+=Math.abs(ax)<=CRY.ret?ax:Math.sign(ax)*CRY.ret;e.y+=Math.abs(ay)<=CRY.ret?ay:Math.sign(ay)*CRY.ret;
    if(e.x===tx&&e.y===ty)e.ret=0;return}
  e.ph+=e.sp;prismPlace(e);
}
function stepPlat(S,R,e){
  const p=S.p,ride=!p.dead&&p.ground&&Math.abs(p.y+p.h-e.y)<1&&p.x<e.x+e.w&&p.x+p.w>e.x,ox=e.x,oy=e.y;
  platAdvance(e);platPlace(e);
  const dx=e.x-ox,dy=e.y-oy;if(!dx&&!dy)return;
  if(ride){move(S,R,p,dx,0);move(S,R,p,0,dy);return}   /* carried (tiles stop him, never the platform) */
  if(p.dead||!ov(p,e))return;
  /* it moved into him: rising under his feet lifts him onto it, else it shoves him along its move */
  if(dy<0&&p.y+p.h-e.y<=-dy+1){move(S,R,p,0,e.y-p.h-p.y);if(Math.abs(p.y+p.h-e.y)<1){p.ground=1;p.vy=Math.min(p.vy,0)}}
  else if(dx)move(S,R,p,dx>0?e.x+e.w-p.x:e.x-p.x-p.w,0);
  else if(dy>0)move(S,R,p,0,e.y+e.h-p.y);
}
/* the crystal boxes his move collides with (engine solids()): platforms, and the Echo while root-wrapped. No `i`, so
   p.on never points at them. A platform he is inside (a shove that failed) does not count until he is out */
export function cryBoxes(S){
  const o=[],p=S.p;
  for(const e of S.ens)if(e.k==='plat'&&!ov(e,p))o.push({x:e.x,y:e.y,w:e.w,h:e.h});
  const E=S.echo;if(E&&E.on&&E.wrap>0&&!E.pass){const b=echoBox(S);if(b&&!ov(b,p))o.push(b)}   /* inside it after a rewind: not solid until he is out, like a platform */
  return o;
}

/* ---------- beams ---------- */
/* the same vine contract as game/cinders.js (vinesOver): {x,y,w,h} or {box}, not dead/gone/alive 0 */
const vbox=v=>v&&(v.box||v),alive=v=>v&&!v.dead&&!v.gone&&v.alive!==0&&v.alive!==false;
export const beamOn=e=>e.k==='prism'&&e.lens&&!(e.wrap>0)&&(!e.per||(e.t%e.per)<e.per/2);
/* the beam now: {x0,y0,x1,y1 (room px; the line is the integer row or column y0===y1 or x0===x1), rx:[tx,ty] the receiver
   it lights or null, rect: the 2 px box that hurts him}, or null. Pure (reads S, R, e) */
export function beamSeg(S,R,e){
  if(!beamOn(e))return null;
  const [ax,ay]=AIM[e.aim],cx=e.x+e.w/2,cy=e.y+e.h/2,hor=ay===0,line=Math.round(hor?cy:cx);
  let tx=Math.floor(cx/T),ty=Math.floor(cy/T),hit=null;
  if(tx<0||ty<0||tx>=R.w||ty>=R.h||solid(S,R,tx,ty))return null;   /* the lens is inside rock */
  for(;;){const nx=tx+ax,ny=ty+ay;if(nx<0||ny<0||nx>=R.w||ny>=R.h){tx=nx;ty=ny;break}
    if(solid(S,R,nx,ny)){tx=nx;ty=ny;hit=R.g[ny][nx]==='R'?[nx,ny]:null;break}tx=nx;ty=ny}
  const s0=hor?cx+ax*e.w/2:cy+ay*e.h/2;let s1=hor?(ax>0?tx*T:(tx+1)*T):(ay>0?ty*T:(ty+1)*T);
  /* a live vine across the line stops it at the vine's near face */
  for(const v of S.vines||[]){const b=vbox(v);if(!alive(v)||!b||!Number.isFinite(b.x))continue;
    const across=hor?b.y<=line&&b.y+b.h>line-1:b.x<=line&&b.x+b.w>line-1;if(!across)continue;
    const a=hor?b.x:b.y,z=hor?b.x+b.w:b.y+b.h,d=hor?ax:ay;
    if(d>0&&z>s0&&a<s1){s1=Math.max(s0,a);hit=null}else if(d<0&&a<s0&&z>s1){s1=Math.min(s0,z);hit=null}}
  const lo=Math.min(s0,s1),len=Math.abs(s1-s0);
  const rect=hor?{x:lo,y:line-1,w:len,h:2}:{x:line-1,y:lo,w:2,h:len};
  return hor?{x0:s0,y0:line,x1:s1,y1:line,rx:hit,rect}:{x0:line,y0:s0,x1:line,y1:s1,rx:hit,rect};
}
/* the platforms' boxes now (render) */
export const platRects=S=>S.ens.filter(e=>e.k==='plat').map(e=>({x:e.x,y:e.y,w:e.w,h:e.h}));

/* ---------- after his move (engine step, live frames only) ---------- */
/* shard steps, rams, beams, receivers and locks, then the Echo. Returns -1, the S.ens index of the drifter whose beam
   got him, or 'echo' (the engine glitches him out) */
export function crystalTouch(S,R,ev){
  const p=S.p;if(p.dead||S.mode!=='play')return -1;
  if(!R.cry&&!(S.cr&&S.cr.q&&Object.keys(S.cr.q).length))return -1;   /* nothing crystal here */
  const C=S.cr||(S.cr={});if(!C.q)C.q={};if(!C.rx)C.rx={};
  /* shard steps: the ones under his feet start (every column engine hits() stands him on, so a shard under only his box's
     last pixel cracks too; R1 2026-11-07: with x+1..x+w-1 he could stand on a shard's edge pixel forever); all started ones count on */
  if(p.ground){const fy=Math.floor((p.y+p.h+.5)/T),row=R.g[fy];
    if(row)for(let tx=Math.floor(p.x/T);tx<=Math.ceil((p.x+p.w)/T)-1;tx++)if(row[tx]==='Q'&&C.q[key(tx,fy)]===undefined&&Math.abs(p.y+p.h-fy*T)<1){C.q[key(tx,fy)]=0;ev.push('shard_crack')}}
  for(const k in C.q){const [tx,ty]=k.split(',').map(Number),d=delayOf(R,tx,ty);if(C.q[k]<d+CRY.fall){C.q[k]++;if(C.q[k]===d)ev.push('shard_fall')}}
  /* rams: a dash (or a fast surf skimming over it) */
  const dash=p.dt>0,skim=p.surf&&Math.abs(p.vx)>CRY.ram,ram=dash?{x:p.x+(p.dd>0?4:-4),y:p.y,w:p.w,h:p.h}:skim?{x:p.x,y:p.y+4,w:p.w,h:p.h+4}:null,rd=dash?p.dd:Math.sign(p.vx)||1;
  if(ram)S.ens.forEach(e=>{if(e.k!=='prism'||e.wrap>0||e.grace||!ov(ram,e))return;
    const x0=e.x;move(S,R,e,rd*CRY.shove,0,[]);e.hx+=e.x-x0;e.lens=0;e.grace=CRY.grace;
    S.hit=Math.round(FEEL.HIT);S.cam.sh=3;ev.push('prism_shatter')});
  /* beams: what they light, and him */
  const hb={x:p.x+3,y:p.y+3,w:p.w-6,h:p.h-6},lit={};let hit=-1;
  S.ens.forEach((e,i)=>{if(e.k!=='prism')return;const b=beamSeg(S,R,e);if(!b)return;
    if(b.rx)lit[key(b.rx[0],b.rx[1])]=1;
    if(hit<0&&!p.inv&&!e.lf&&ov(hb,b.rect))hit=i});   /* a prism carrying a leaf or flower (game/feed.js) cannot burn him */
  /* receivers fill while lit and drain while not; full, they latch for good, and a lock opens once all of its id have */
  const L=S.latch||(S.latch={});
  for(const r of R.rx||[]){const k=key(r.tx,r.ty);if(L[rxKey(R,r.tx,r.ty)]){delete C.rx[k];continue}
    const n=(C.rx[k]||0)+(lit[k]?1:-1);
    if(n>=CRY.ring){delete C.rx[k];L[rxKey(R,r.tx,r.ty)]=1;ev.push('receiver_lock','latch');
      if(!L[lockKey(R,r.id)]&&R.rx.every(o=>o.id!==r.id||L[rxKey(R,o.tx,o.ty)])){L[lockKey(R,r.id)]=1;ev.push('lock_open')}}
    else if(n>0)C.rx[k]=n;else delete C.rx[k]}
  /* the Echo (anchored, game/echo.js): its live-frame step, the root wrap and the ram, then its touch */
  stepEcho(S,R,ev,ram);
  if(hit<0&&echoTouch(S))hit='echo';
  return hit;
}
