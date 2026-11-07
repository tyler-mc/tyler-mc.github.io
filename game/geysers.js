/* Molten: geyser vents ('V') and the geyser chase (CHASES.molten, kind 'geyser'; game/chases.js hands it here).
   A vent sits in an air cell on a floor. Each erupts a lethal column `height` tiles tall (ent, default GEYSER.h), clipped
   at the first solid tile above. Before every eruption it cracks and steams for GEYSER.tel frames (the telegraph, drawn
   in game/moltenart.js; nothing here glows). Outside a geyser chase a vent is dormant: never lethal, it only puffs a
   little steam on its own rhythm (ent period, frames, and phase, frames into it; default GEYSER.idle). Ent live:1 makes
   it erupt on that rhythm outside the chase too, with the same telegraph.
   The chase: lifting the Molten fragment starts waves of eruptions at world tile x `from`. Each wave runs toward the safe
   line along `path` ([world tile x, px per clock frame], ..., [safe x], as the other chases), and a new wave follows every
   `every` clock frames, so the vents in the chase's span fire in sequence, a wave at a time. tau(C,x) is when the first
   wave's crest reaches world px x; a vent there telegraphs from tau-tel and erupts from tau for `erupt`, then again each
   `every`. S.chase = {id,on,x (the first wave's crest, world px),t (the clock),n (frames since the start or the last
   restart), na (the same in clock units, so Assist changes mid-chase stay honest),w (frames since it was outrun)}. Assist runs the clock at ASSIST.rate (70%) and widens the telegraph by
   ASSIST.tel (in clock frames), and changes no layout. A cycle a vent did not see begin (he entered the room, or the
   chase restarted, after its telegraph started) never erupts, so no column ever comes without its warning.
   After a death the clock restarts so the first wave is `gap` px behind the torch he comes back at, after a short rest.
   Plain numbers only (no randomness, no wall clock); vents live in S.ens, so they reset on room entry. No DOM. */
import {T} from './state.js';
import {ROOMS,CHASES} from './rooms/index.js';
import {solid} from './engine.js';

/* tel: telegraph frames; erupt: eruption frames; rise/fall: frames the column takes to reach full height and to drop;
   h: default height (tiles); idle: a dormant vent's default puff rhythm (frames); every/gap/beat: the chase's defaults
   (frames between waves, restart gap px, frames before the first wave); rest: frames after a restart; wither: frames the
   chase lingers once outrun; near: the reach (px) of nearness() and of the sounds */
export const GEYSER={tel:48,erupt:54,rise:6,fall:8,h:4,maxH:16,idle:240,every:180,gap:150,beat:60,rest:20,wither:60,near:200,w:10};
export const ASSIST={rate:.7,tel:1.5,gap:1.5};

const dirOf=C=>C.dir||1;
export const endX=C=>C.path[C.path.length-1][0]*T;
const fromX=C=>C.from*T;
export const inSpan=(C,x)=>{const d=dirOf(C);return (x-fromX(C))*d>=0&&(endX(C)-x)*d>=0};
/* clock frames for the first wave's crest to reach world px x (piecewise by stretch; negative behind `from`) */
export function tau(C,x){
  const d=dirOf(C),P=C.path;let acc=0,s=P[0][1]||1;
  const u=(x-P[0][0]*T)*d;if(u<=0)return u/s;
  for(let i=0;i<P.length-1;i++){if(P[i][1]>0)s=P[i][1];const a=P[i][0]*T,b=P[i+1][0]*T,len=(b-a)*d,k=(x-a)*d;
    if(k<=len)return acc+k/s;acc+=len/s}
  return acc+((x-endX(C))*d)/s;
}
/* the first wave's crest at clock t (world px; `from` before it starts, the safe line once there) */
export function crest(C,t){
  const d=dirOf(C),P=C.path;if(t<=0)return fromX(C);let acc=0,s=P[0][1]||1;
  for(let i=0;i<P.length-1;i++){if(P[i][1]>0)s=P[i][1];const a=P[i][0]*T,len=(P[i+1][0]*T-a)*d,dt=len/s;
    if(t<=acc+dt)return a+d*(t-acc)*s;acc+=dt}
  return endX(C);
}
const cfg=(S,C)=>{const a=S.assist?1:0;return {rate:a?ASSIST.rate:1,tel:(C.tel??GEYSER.tel)*(a?ASSIST.tel:1),erupt:C.erupt??GEYSER.erupt,every:C.every??GEYSER.every}};
const geyserChase=S=>{const c=S.chase,C=c&&c.on&&CHASES[c.id];return C&&C.kind==='geyser'?C:null};

/* ---------- vents ---------- */
export function spawnVent(R,v){
  const hgt=Math.max(1,Math.min(GEYSER.maxH,v.height|0||GEYSER.h))*T,per=v.period>0?Math.max(v.period,GEYSER.tel+GEYSER.erupt+12):0;
  return {k:'vent',mol:1,soft:1,tx:v.tx,ty:v.ty,x:v.tx*T+1,y:(v.ty+1)*T-hgt,w:GEYSER.w,h:hgt,hgt,top:(v.ty+1)*T-hgt,
    per,ph:v.phase|0,live:v.live?1:0,t:0,st:0,q:0,wx:(R.at[0]+v.tx)*T+T/2,wrap:0,grace:0,pass:0,dx:0,dy:0};
}
/* the vent's state now, a pure function of its frame count (e.t), the chase clock and the ents: st 0 quiet, 1 telegraph,
   2 erupting, 3 a dormant puff (harmless steam); q how far through that state (0..1); left: clock frames to its next
   eruption (Infinity when none is coming). It also latches the hand-off: e.cm is who rules the vent now (1 the chase's
   waves, 0 its own rhythm) and e.ho the frame (e.t) that last changed; its own rhythm only shows a cycle that began at or
   after e.ho, so a live vent never erupts untelegraphed as a chase ends or hands it back (plain numbers, saved with S.ens) */
export function ventPhase(S,e){
  const C=geyserChase(S),c=S.chase,sp=C&&inSpan(C,e.wx);
  const s0=sp?c.t-tau(C,e.wx)+cfg(S,C).tel:-1,m=s0>=0?1:0;if(e.cm!==undefined&&e.cm!==m)e.ho=e.t;e.cm=m;
  if(sp){const k=cfg(S,C),s=s0;   /* clock since the first wave's telegraph began here */
    if(s>=0){const u=s%k.every,age=Math.min(e.tc??e.t-1,c.na??(c.n||0)),left=u<k.tel?k.tel-u:k.every-u+k.tel;
      if(u>age+1e-9)return {st:0,q:0,left};                          /* this cycle began before he could see it */
      if(u<k.tel)return {st:1,q:u/k.tel,left:k.tel-u};
      if(u<k.tel+k.erupt)return {st:2,q:(u-k.tel)/k.erupt,left:0};
      return {st:0,q:0,left}}
  }
  const per=e.per||GEYSER.idle,tel=GEYSER.tel,er=GEYSER.erupt,u=(e.t+e.ph)%per,seen=e.t-u>=Math.max(1,e.ho|0);   /* its cycle began after spawn and after the hand-off */
  if(!e.live){const a=u-tel;return a>=0&&a<er&&seen?{st:3,q:a/er,left:Infinity}:{st:0,q:0,left:Infinity}}
  if(!seen)return {st:0,q:0,left:per-u+tel};   /* a cycle seen from its first frame only */
  if(u<tel)return {st:1,q:u/tel,left:tel-u};
  if(u<tel+er)return {st:2,q:(u-tel)/er,left:0};
  return {st:0,q:0,left:per-u+tel};
}
/* the lethal column now (room px), or null: it rises over GEYSER.rise and drops over GEYSER.fall frames */
export function ventBox(e){
  if(e.st!==2)return null;
  const er=GEYSER.erupt,f=e.q*er,k=Math.min(1,f/GEYSER.rise,(er-f)/GEYSER.fall),fl=(e.ty+1)*T,h=Math.max(2,Math.round((fl-e.top)*Math.max(0,k)));
  return {x:e.tx*T+1,y:fl-h,w:GEYSER.w,h};
}
/* one frame: its clock, the ceiling over it (drilled walls and gates change), its state; sounds only near him */
export function stepVent(S,R,e,ev){
  e.t++;
  let top=e.ty;while(top>0&&(e.ty+1-top)*T<e.hgt&&!solid(S,R,e.tx,top-1))top--;e.top=Math.max(top*T,(e.ty+1)*T-e.hgt);
  const as=S.assist?1:0;if(e.as!==undefined&&e.as!==as)e.tc=0;e.as=as;   /* Assist flipped: the telegraph length moved, so every cycle already running counts as unseen */
  const g=ventPhase(S,e),near=Math.abs(e.tx*T+T/2-S.p.x-S.p.w/2)<GEYSER.near+60;
  if(near&&g.st!==e.st){if(g.st===1)ev.push('geyser_crack');else if(g.st===2)ev.push('geyser_erupt');else if(g.st===3)ev.push('geyser_puff')}
  e.st=g.st;e.q=g.q;
  e.tc=(e.tc??e.t-1)+(geyserChase(S)?cfg(S,geyserChase(S)).rate:1);   /* clock units he has watched it, so an Assist change mid-chase cannot age a cycle he did not see */
}

/* ---------- the chase (called through game/chases.js) ---------- */
const worldX=S=>ROOMS[S.room].at[0]*T+S.p.x;
export function startGeyser(S,id,ev){const C=CHASES[id];S.chase={id,on:1,x:fromX(C),t:-(C.beat??GEYSER.beat),n:0,na:0,w:0};ev.push('chase_start')}
/* one frame; the vents do the harm (game/cinders.js), so it never reports a hit */
export function stepGeyser(S,ev){
  const c=S.chase,C=CHASES[c.id];
  if(!c.on){if(++c.w>=GEYSER.wither)S.chase=null;return false}
  if(S.p.dead)return false;
  if((worldX(S)+S.p.w/2-endX(C))*dirOf(C)>=0){c.on=0;c.w=0;ev.push('chase_done');return false}   /* his middle over the safe line */
  const rate=cfg(S,C).rate;c.t+=rate;c.n=(c.n||0)+1;c.na=(c.na??c.n-1)+rate;c.x=crest(C,c.t);
  return false;
}
/* after a death (and on reload): the first wave `gap` px behind his torch (`at` pins one: 'room:tx,ty' -> world tile x),
   never behind `from`, after a short rest */
export function resetGeyser(S){
  const c=S.chase,C=CHASES[c.id],cp=S.cp,key=cp&&cp.room+':'+cp.tx+','+cp.ty,R=cp&&ROOMS[cp.room],d=dirOf(C);
  let x=C.at&&key in C.at?C.at[key]*T:R?(R.at[0]+cp.tx)*T+T/2-d*(C.gap??GEYSER.gap)*(S.assist?ASSIST.gap:1):fromX(C);
  if((x-fromX(C))*d<0)x=fromX(C);
  c.t=tau(C,x)-(C.rest??GEYSER.rest);c.n=0;c.na=0;c.w=0;c.x=crest(C,c.t);
}
/* 0 (nothing near) .. 1: how close a cracking (half) or erupting vent in his room is; the OS shake gets it in quarters */
export function nearGeyser(S){
  const p=S.p,cx=p.x+p.w/2;let v=0;
  for(const e of S.ens){if(e.k!=='vent'||(e.st!==1&&e.st!==2))continue;const d=Math.abs(e.tx*T+T/2-cx);v=Math.max(v,Math.max(0,1-d/GEYSER.near)*(e.st===2?1:.5))}
  return v;
}
/* how far he has come from `from` toward the safe line, 0..1 (the OS 'shimmer' gets it in quarters) */
export function progressGeyser(S){
  const C=CHASES[S.chase.id],a=fromX(C),b=endX(C);return b===a?1:Math.max(0,Math.min(1,(worldX(S)+S.p.w/2-a)/(b-a)));
}
