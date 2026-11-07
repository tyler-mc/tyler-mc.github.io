/* Vine claws (item 'claws', Molten). Passive: no key, no button. In the air, falling or at the top of a jump, against a
   wall (what engine solid() stands him on: rock, rubble, cracked rock, a shut gate; never thorns, liquid or an enemy) and
   holding toward it, he clings: he slides down it at FEEL.CLING px per frame (player.js). Each cling grows one vine up the
   wall from his feet, if fewer than VINE.max are alive and VINE.cd frames have passed since the last: it takes VINE.grow
   frames to reach VINE.len px (less where the wall ends or a ceiling closes over it), and a flower every VINE.gap px along
   it above its root (none at the root, so the cling holds while it grows) is a one-way foothold under his feet' pixels
   (stand on it from above, jump from it; hold down to drop through). A
   vine lives VINE.life frames, withering over the last VINE.fade. A jump from a cling is a wall jump: CLAW.wjx out, CLAW.wjy
   up. Until he next stands, a wall jump never lets him cling higher than his feet were when he made it, so wall jumps
   alone gain no height (two facing walls are no ladder); the vines' flowers are the climb.
   Drill: clinging to a cracked wall tile ('X') for CLAW.drill frames crumbles it and the cracked tiles joined to it in the
   rows his body covers (a tunnel his height through any thickness of cracked rock, up to CLAW.blob tiles), for this visit: S.drilled lists them (engine solid() lets him through), S.drillNow those of this step.
   All plain numbers in S and S.p (snapshot, saves, Undo); no randomness; reset on room entry. No DOM. */
import {T} from './state.js';
import {move,solid} from './engine.js';

/* reach: px between his box and the wall that still counts as touching (3 px, GDD R11), wjx/wjy the wall jump, drill
   frames to crumble, a crack tick every `tick`, blob: most tiles one drill crumbles */
export const CLAW={reach:4,wjx:2.2,wjy:4.6,drill:30,tick:10,blob:16};
/* vine: full length (px), frames to grow it, life, the withering at its end, the cooldown, how many alive, flower spacing,
   how far a flower sticks out of the wall, its thickness */
export const VINE={len:48,grow:90,life:300,fade:60,cd:60,max:2,gap:16,w:10,fh:3};
const PW=18,PH=24;   /* player.js's PW, PH (a cycle-free copy) */

const wallCol=(p,s)=>Math.floor((s>0?p.x+PW-1+CLAW.reach:p.x-CLAW.reach)/T);
/* a wall on side s (1 east, -1 west) beside his middle */
export const wallAt=(S,R,p,s)=>solid(S,R,wallCol(p,s),Math.floor((p.y+PH/2)/T));
export const isDrilled=(S,tx,ty)=>!!S.drilled&&S.drilled.some(d=>d[0]===tx&&d[1]===ty);

/* a vine's flowers, base first: [{x,y,w}] (y the top he stands on) */
export function flowers(v){const o=[];for(let k=1;k*VINE.gap<=v.len+1e-9;k++)o.push({x:v.x,y:v.by-k*VINE.gap,w:VINE.w});return o}
/* his feet: the box columns his two shoes cover (x+2..5, x+12..15, as render.js ledge()) */
const onFoot=(x,f)=>(x+2<f.x+f.w&&x+6>f.x)||(x+12<f.x+f.w&&x+16>f.x);
/* the top of the first flower his feet cross going down from f0 to f1 with a foot over it, else null */
export function footAt(S,x,f0,f1){
  let best=null;
  for(const v of S.vines||[])for(const f of flowers(v))if(onFoot(x,f)&&f0<=f.y+1e-6&&f1>=f.y&&(best===null||f.y<best))best=f.y;
  return best;
}
/* after his own move: a flower crossed stands him on it (m.hy becomes a landing) */
export function foothold(S,p,f0,m,inp){
  if(m.hy>0||(inp&&inp.d)||!S.vines||!S.vines.length)return;const f1=p.y+PH;if(f1<=f0)return;
  const y=footAt(S,p.x,f0,f1);if(y===null)return;p.y=y-PH;m.hy=1;m.on=-1;
}

function grow(S,R,p,s,ev){
  const fx=s>0?p.x+PW:p.x,by=p.y+PH,wc=s>0?Math.floor(fx/T):Math.floor((fx-1)/T),sc=s>0?Math.floor((fx-1)/T):Math.floor(fx/T);
  /* it climbs only while there is wall beside it and air in front: from his middle up */
  let top=by;for(let ty=Math.floor((p.y+PH/2)/T);ty>=-1;ty--){if(solid(S,R,wc,ty)&&!solid(S,R,sc,ty))top=ty*T;else break}
  const max=Math.max(0,Math.min(VINE.len,by-top)),x=s>0?fx-VINE.w:fx;
  S.vines.push({x,y:by,w:VINE.w,h:VINE.fh,t:0,s,fx,by,max,len:0});p.cv=1;p.vc=VINE.cd;ev.push('vine');
}
/* the cracked tile beside him: the one being drilled while it still lies beside him, else the one at his middle, else any */
function crackAt(S,R,p,s){
  const tx=wallCol(p,s),y0=Math.floor(p.y/T),y1=Math.floor((p.y+PH-1)/T),mid=Math.floor((p.y+PH/2)/T),X=ty=>R.g[ty]&&R.g[ty][tx]==='X'&&!isDrilled(S,tx,ty);
  const c=S.crack;if(c&&c[0]===tx&&c[1]>=y0&&c[1]<=y1&&X(c[1]))return c;
  for(const ty of [mid,...Array.from({length:y1-y0+1},(_,i)=>y0+i)])if(X(ty))return [tx,ty,0];
  return null;
}
function crumble(S,R,p,tx,ty){
  const q=[[tx,ty]],seen=new Set(),y0=Math.floor(p.y/T),y1=Math.floor((p.y+PH-1)/T);let n=0;
  while(q.length&&n<CLAW.blob){const [x,y]=q.shift(),k=y*R.w+x;if(seen.has(k))continue;seen.add(k);
    if(x<0||y<y0||y>y1||x>=R.w||y>=R.h||R.g[y][x]!=='X'||isDrilled(S,x,y))continue;
    S.drilled.push([x,y]);S.drillNow.push([x,y]);n++;q.push([x,y-1],[x,y+1],[x-1,y],[x+1,y])}
}

/* stepPlayer calls this (only with the claws) after the run block; true when the cling owns the frame. F: player.js FEEL */
export function claws(S,R,p,inp,dir,wet,ev,boxes,F){
  if(p.ground)p.wj=0;
  const s=p.cl||dir;
  const can=!p.ground&&!wet&&!p.surf&&!p.dt&&!p.burn&&!p.dead&&s!==0&&dir===s&&(p.cl||p.vy>=0)&&(!p.wj||p.y+PH>=p.wy-1e-6)&&wallAt(S,R,p,s);
  if(!can){if(p.cl){p.cl=0;p.cv=0}S.crack=null;return false}
  if(!p.cl){p.cl=s;p.cv=0;p.bo=0;p.mo=0;move(S,R,p,s*CLAW.reach,0,boxes);ev.push('cling')}
  p.face=s;p.vx=0;p.coy=0;p.buf=0;p.walk=0;p.on=-1;
  if(inp.jp){   /* the wall jump */
    p.cl=0;p.cv=0;S.crack=null;p.wj=1;p.wy=p.y+PH;p.vx=-s*CLAW.wjx;p.vy=-CLAW.wjy;p.jc=1;p.face=-s;ev.push('walljump');
    move(S,R,p,p.vx,p.vy,boxes);return true;
  }
  if(!p.cv&&!p.vc&&S.vines.length<VINE.max)grow(S,R,p,s,ev);
  /* the drill */
  const c=crackAt(S,R,p,s);
  if(!c)S.crack=null;
  else{S.crack=c;c[2]++;
    if(c[2]>=CLAW.drill){crumble(S,R,p,c[0],c[1]);S.crack=null;S.cam.sh=Math.max(S.cam.sh,2);ev.push('drill')}
    else if(c[2]%CLAW.tick===0)ev.push('crack')}
  /* the slow slide, flush to the wall; a flower or the floor under him stands him there */
  const f0=p.y+PH;p.vy=F.CLING;move(S,R,p,s,0,boxes);const m=move(S,R,p,0,p.vy,boxes);foothold(S,p,f0,m,inp);
  if(m.hy>0){p.ground=1;p.vy=0;p.on=m.on;p.cl=0;p.cv=0;S.crack=null;p.wj=0}
  return true;
}

/* every step (engine.js), with or without the claws: vines grow and wither, the cooldown runs */
export function stepVines(S){
  const p=S.p;if(p.vc>0)p.vc--;
  if(!S.vines||!S.vines.length)return;
  for(const v of S.vines){v.t++;v.len=Math.min(v.max,VINE.len*v.t/VINE.grow);v.y=v.by-v.len;v.h=v.len+VINE.fh}
  S.vines=S.vines.filter(v=>v.t<VINE.life);
}
