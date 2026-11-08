/* Wake Up: feeding. The OS lets a visitor drag the plants they grew on the desktop into the game (handle.drop(), engine.js).
   A dropped plant falls, lies on the ground, and is eaten when he walks over it:
     seed    he chews, spits it out ("Ptoo!") and it is gone;
     sprout  a second leaf grows on his sprout for FEED.hold frames;
     flower  a flower blooms from his sprout for FEED.hold frames.
   When the time is up the leaf or flower lets go, floats down and stays on the ground until the room is left (a shed piece is
   scenery and cannot be eaten). Everything here is room-local and anchored: it is not saved and Undo's frameOf() never holds
   it. Enemies (Roots: moss, puff) notice a plant near them, show a "!", go and eat it, then return to their path (feedMove, called from
   enemies.js): a seed wraps and stuns them as the roots do, a sprout or flower grows a leaf or flower on them (e.lf) and makes them harmless
   for the same FEED.hold frames. No randomness (tests step it): the flutter and the spit come from S.t. The renderer draws it (game/render.js drawFeed). */
import {T} from './state.js';
import {solid,tile,ov,move} from './engine.js';
import {isLiq,isLava} from './liquid.js';
import {WRAP} from './enemies.js';
import {CRAB} from './fish.js';
import {EMBER,BEETLE,beetleBox} from './cinders.js';

/* grow: frames to grow the leaf/flower (three steps); hold: frames it stays after; chew: frames before the effect (the seed's is its spit);
   tail: frames of the face after; cap: most plants on the ground at once (a drop beyond it is refused and replants on the desktop) */
export const FEED={grow:24,hold:300,chew:{seed:64,sprout:40,bloom:40},tail:{seed:8,sprout:16,bloom:44},cap:16,G:.26,MAXV:3.2,SPIT:26};
export const KINDS=['seed','sprout','bloom'];
export const newFeed=()=>({drops:[],shed:[],spit:[],pop:[],hearts:[],eat:null,head:null});
export const feedOf=S=>{const F=S.feed||(S.feed=newFeed());if(!F.hearts)F.hearts=[];return F};
const hash=n=>{let h=Math.imul(n|0,374761393)+668265263|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296};

/* put a plant into the room: x centre and y bottom, room px. Nudged up out of rock; false if it cannot be placed */
export function addDrop(S,R,kind,x,y,col){
  const F=feedOf(S);if(kind==='glow')kind='bloom';
  if(!KINDS.includes(kind)||F.drops.length>=FEED.cap)return false;
  x=Math.max(4,Math.min(R.w*T-4,x));
  for(let n=0;n<14&&solid(S,R,Math.floor(x/T),Math.floor((y-4)/T));n++)y-=T;
  if(solid(S,R,Math.floor(x/T),Math.floor((y-4)/T))||y<4)return false;
  F.drops.push({k:kind,x,y,vy:0,land:0,col:col||'#FFFFFF'});return true;
}

/* one falling step of o ({x,y,vy}) with gravity g and top speed mv: 0 still falling, 1 landed (on rock or on water), 2 lost (lava, or out of the room) */
function fall(S,R,o,g,mv){
  o.vy=Math.min(mv,o.vy+g);
  const n=Math.max(1,Math.ceil(o.vy)),d=o.vy/n,tx=Math.floor(o.x/T);
  for(let i=0;i<n;i++){
    const ny=o.y+d,ty=Math.floor(ny/T);
    if(solid(S,R,tx,ty)||tile(R,tx,ty)==='^'){o.y=ty*T;o.vy=0;return 1}   /* thorns are ground too (a crawler walks them) */
    const c=tile(R,tx,ty);
    if(isLava(c))return 2;
    if(isLiq(c)){o.y=ty*T+3;o.vy=0;return 1}
    o.y=ny;
  }
  return o.y>(R.h+6)*T?2:0;
}

const pbox=p=>({x:p.x,y:p.y,w:p.w,h:p.h});
export function stepFeed(S,R,ev){
  const F=S.feed;if(!F)return;
  const p=S.p;
  if(p.dead){F.head=null;F.eat=null}   /* a death takes what he grew */
  /* plants on the ground */
  for(let i=F.drops.length-1;i>=0;i--){
    const d=F.drops[i];
    if(!d.land){const r=fall(S,R,d,FEED.G,FEED.MAXV);if(r===2){F.pop.push({x:d.x,y:d.y-4,t:0});F.drops.splice(i,1);continue}if(r===1)d.land=1}
    else if(S.mode==='play'&&!p.dead&&ov({x:d.x-4,y:d.y-8,w:8,h:8},pbox(p))){F.drops.splice(i,1);eat(S,F,d,ev)}
  }
  /* the chew, then the effect */
  if(F.eat){const e=F.eat;e.t++;
    if(e.t===FEED.chew[e.k])effect(S,F,e,ev);
    if(e.t>=FEED.chew[e.k]+FEED.tail[e.k])F.eat=null}
  /* what he grew: grows, holds, lets go */
  if(F.head){const h=F.head;h.t++;if(h.t>=FEED.grow+FEED.hold){
    F.shed.push({k:h.k==='leaf'?'leaf':'flower',x:p.x+p.w/2-p.face*2,y:p.y-6,vy:0,vx:(h.k==='leaf'?-p.face:p.face)*.4,ph:S.t&255,land:0,col:h.col});   /* the leaf drifts off the way it grew (left of the stem), the flower the other way: clear of his shoes */
    if(F.shed.length>20)F.shed.shift();
    F.head=null;ev.push('shed')}}
  /* a leaf or flower on an enemy: grows, holds (it is harmless meanwhile: engine touch()), lets go */
  for(const e of S.ens)if(e.lf&&++e.lf.t>=FEED.grow+FEED.hold){
    F.shed.push({k:e.lf.k==='flower'?'flower':'leaf',x:e.x+e.w/2,y:e.y,vy:0,vx:(e.lf.k==='flower'?1:-1)*.4,ph:S.t&255,land:0,col:e.lf.col});
    if(F.shed.length>20)F.shed.shift();
    e.lf=null;ev.push('shed')}
  /* shed pieces: a slow flutter down, then they lie there */
  for(let i=F.shed.length-1;i>=0;i--){
    const s=F.shed[i];if(s.land)continue;
    const dx=(s.vx||0)+Math.sin((S.t+s.ph)*.11)*.5;
    if(!solid(S,R,Math.floor((s.x+dx)/T),Math.floor((s.y-2)/T)))s.x+=dx;
    const r=fall(S,R,s,.03,.5);if(r===2){F.shed.splice(i,1);continue}if(r===1)s.land=1;
  }
  /* a spat-out seed arcs away and is gone in a puff */
  for(let i=F.spit.length-1;i>=0;i--){
    const q=F.spit[i];q.t++;q.x+=q.vx;q.y+=q.vy;q.vy+=.2;
    if(q.t>=FEED.SPIT||solid(S,R,Math.floor(q.x/T),Math.floor(q.y/T))){F.pop.push({x:q.x,y:q.y,t:0});F.spit.splice(i,1)}
  }
  for(let i=F.pop.length-1;i>=0;i--)if(++F.pop[i].t>=10)F.pop.splice(i,1);
  if(F.hearts)for(let i=F.hearts.length-1;i>=0;i--)if(++F.hearts[i].t>=HEART.life)F.hearts.splice(i,1);
}

function eat(S,F,d,ev){
  if(F.eat)effect(S,F,F.eat,ev);   /* the last mouthful is swallowed first */
  F.eat={k:d.k,t:0,col:d.col};ev.push('eat');
}
function effect(S,F,e,ev){
  const p=S.p;
  if(e.k==='seed'){
    F.spit.push({x:p.x+p.w/2+p.face*8,y:p.y+12,vx:p.face*(1.5+hash(S.t)*.8),vy:-2.6,t:0});
    ev.push('spit');
    if(!S.say)S.say={text:'Ptoo!',t:46,n:0};
  }else{
    const k=e.k==='bloom'?'flower':'leaf',h=F.head;
    if(h&&h.k===k)h.t=Math.min(h.t,FEED.grow);else{F.head={k,t:0,col:e.col};hearts(F,p.x+p.w/2,p.y-12)}   /* the same again: the clock runs from full size; the other: it changes over */
    ev.push(k==='flower'?'bloom':'sprout');
  }
  e.done=1;
  if(F.eat===e)e.t=Math.max(e.t,FEED.chew[e.k]);
}

/* the look keys for the atlas (game/render.js look()): the growth step of the extra leaf or flower, and the chewing face */
export function feedLook(S,s){
  const F=S.feed;if(!F)return;
  const h=F.head;
  if(h){s.xl=h.k;s.xs=h.t<FEED.grow/3?0:h.t<FEED.grow*2/3?1:2}
  const e=F.eat;
  if(e){
    const c=FEED.chew[e.k];
    if(e.t<c){s.mouth=(e.t>>3)&1;if(!s.pose&&s.f==='idle'&&(e.t>>3)&1)s.f='squash';if(e.k==='seed'&&e.t>c-24)s.face='yuck'}
    else if(e.k==='seed'){s.mouth=1;s.face=0}
    else if(e.k==='bloom'){s.face='love';s.happy=1}
    else s.happy=1;
  }
}

/* ---------- enemies and plants ---------- */
/* every creature in S.ens takes part (moss, puff, crab, clownfish, ember, beetle, prism drifter); platforms and vents are not creatures.
   r: how far (centre to centre, px) a plant is noticed; alert: frames of "!"; giveup: frames of an errand, or without getting closer (90) before it quits;
   cool: frames before it tries again; speed: px per frame of a flyer or swimmer, crab: of a crab, ground: of a beetle's crawl */
export const NOTICE={r:176,alert:30,giveup:420,cool:240,speed:.9,crab:.8,beetle:.75};
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const ecx=e=>e.x+e.w/2,ecy=e=>e.y+e.h/2;
const itemBox=d=>({x:d.x-4,y:d.y-8,w:8,h:8});
const same=(q,f)=>q.land&&Math.abs(q.x-f.x)<.5&&Math.abs(q.y-f.y)<.5;
const at=(R,x,y)=>{const r=R.g[Math.floor(y/T)];return r?r[Math.floor(x/T)]??null:null};
/* nothing solid between two points (sampled every 4 px) */
function sees(S,R,x0,y0,x1,y1){const n=Math.ceil(Math.hypot(x1-x0,y1-y0)/4);for(let i=1;i<n;i++){const t=i/n;if(solid(S,R,Math.floor((x0+(x1-x0)*t)/T),Math.floor((y0+(y1-y0)*t)/T)))return false}return true}
const fenced=(e,d)=>{const f=e.fence;if(!f)return true;const tx=Math.floor(d.x/T);   /* moss: [left,top,right,bottom] cells; crab and fish: [left,right] columns */
  if(f.length===4){const ty=Math.floor((d.y-4)/T);return !(tx<f[0]||tx>f[2]||ty<f[1]||ty>f[3])}
  return tx>=f[0]&&tx<=f[1]}
/* a walker reaches a plant along its floor: same level, floor under every column between (thorns count), nothing in the way */
function floorTo(S,R,e,d,row){
  for(let tx=Math.floor(Math.min(ecx(e),d.x)/T);tx<=Math.floor(Math.max(ecx(e),d.x)/T);tx++)if(!solid(S,R,tx,row)&&tile(R,tx,row)!=='^')return false;
  return sees(S,R,ecx(e),ecy(e),d.x,d.y-4);
}
const wetBox=(R,x,y,w,h)=>[[2,2],[w-2,2],[2,h-2],[w-2,h-2]].every(([a,b])=>{const c=at(R,x+a,y+b);return isLiq(c)&&!isLava(c)});
/* a flyer's step toward (tx,ty), collision on; the state it was in does not matter */
const fly=(S,R,e,tx,ty,v)=>{const dx=tx-ecx(e),dy=ty-ecy(e);move(S,R,e,clamp(dx,-v,v),clamp(dy,-v,v),[])};
const wrapIt=(S,e,ev)=>{e.wrap=WRAP;e.grace=0;e.vy=0;e.ret=0;if(ov(e,S.p))e.pass=1;ev.push('stun')};   /* as a root burst does, without its freeze or shake */

/* what each creature does. can(e): it is free to go (beyond the caller's not wrapped, no grace); wants(S,R,e,d): it would go for this plant;
   go(S,R,e,d): one step toward it, 1 if that used the step (0: the usual step still runs: a crawler's, twice); back(S,R,e): a step home
   after (1 while still going); stun(S,e,ev): a seed on it; leave(e,f): what to do when the errand ends; reach: px added round it to count as touching */
const KIND={
  moss:{
    wants(S,R,e,d){if(e.gy!==1||e.ogy!==1||e.gx!==0||Math.abs(d.y-4-ecy(e))>8)return false;return floorTo(S,R,e,d,e.cy+1)},
    go(S,R,e,d){if(e.p>=e.len){const dir=Math.sign(d.x-ecx(e));if(dir){e.mx=dir;e.my=0}}return 0},   /* enemies.js crawls it, twice as fast */
    stun:wrapIt,
    leave(e,f){if(f&&f.h){e.mx=f.h[0];e.my=f.h[1]}},
  },
  puff:{
    wants(S,R,e,d){return sees(S,R,ecx(e),ecy(e),d.x,d.y-4)},
    go(S,R,e,d){fly(S,R,e,d.x,d.y-6,NOTICE.speed);return 1},
    back(S,R,e){const ty=e.hy+Math.sin(e.ph)*e.amp,dx=e.hx-e.x,dy=ty-e.y;
      if(Math.abs(dx)<=NOTICE.speed&&Math.abs(dy)<=NOTICE.speed){e.x=e.hx;e.y=ty;e.ret=0;return 0}
      move(S,R,e,clamp(dx,-NOTICE.speed,NOTICE.speed),clamp(dy,-NOTICE.speed,NOTICE.speed),[]);return 1},
    stun:wrapIt,
  },
  crab:{
    can:e=>e.tz!==2,
    wants(S,R,e,d){return Math.abs(d.y-(e.y+e.h))<=6&&floorTo(S,R,e,d,Math.floor((e.y+e.h+1)/T))},
    go(S,R,e,d){const dir=Math.sign(d.x-ecx(e))||e.dir;e.dir=dir;move(S,R,e,dir*NOTICE.crab,0,[]);e.vy=Math.min(3,e.vy+.25);if(move(S,R,e,0,e.vy,[]).hy)e.vy=0;return 1},
    stun(S,e,ev){e.wrap=CRAB.shell;e.vx=0;e.vy=0;e.cd=0;e.pass=ov(e,S.p)?1:0;ev.push('shell')},   /* pulls into its shell */
  },
  fish:{
    can:e=>e.m===0,
    wants(S,R,e,d){const c=at(R,d.x,d.y+1);return isLiq(c)&&!isLava(c)},   /* only a plant floating on its water */
    go(S,R,e,d){
      const dx=clamp(d.x-ecx(e),-NOTICE.speed,NOTICE.speed),dy=clamp(d.y+4-ecy(e),-NOTICE.speed,NOTICE.speed);
      if(Math.abs(dx)>.01)e.dir=dx<0?-1:1;
      if(dx&&wetBox(R,e.x+dx,e.y,e.w,e.h))e.x+=dx;
      if(dy&&wetBox(R,e.x,e.y+dy,e.w,e.h))e.y+=dy;
      return 1},
    stun(S,e,ev){e.fz=WRAP;ev.push('stun')},   /* a fish has no shell: it hangs still */
  },
  ember:{
    can:e=>e.st===0,
    wants(S,R,e,d){return sees(S,R,ecx(e),ecy(e),d.x,d.y-4)},
    go(S,R,e,d){fly(S,R,e,d.x,d.y-6,NOTICE.speed);return 1},
    back(S,R,e){const tx=e.hx+e.dr*Math.sin(e.ph),ty=e.hy+e.amp*Math.sin(e.ph*2),dx=tx-e.x,dy=ty-e.y;
      if(Math.abs(dx)<=NOTICE.speed&&Math.abs(dy)<=NOTICE.speed){e.x=tx;e.y=ty;return 0}
      e.x+=clamp(dx,-NOTICE.speed,NOTICE.speed);e.y+=clamp(dy,-NOTICE.speed,NOTICE.speed);return 1},
    stun(S,e,ev){e.st=1;e.t=EMBER.relight;ev.push('stun')},   /* smothered to smoke, as a vine does */
  },
  beetle:{
    reach:10,
    wants(S,R,e,d){const u=beetleU(e,d);if(u===null)return false;return true},
    go(S,R,e,d){const u=beetleU(e,d);if(u===null)return 0;const k=u-e.u;e.u+=clamp(k,-NOTICE.beetle,NOTICE.beetle);beetleBox(e);return 1},
    stun(S,e,ev){e.st=1;e.wrap=BEETLE.shell;e.grace=0;beetleBox(e);e.pass=ov(e,S.p)?1:0;ev.push('beetle_open')},   /* knocked out of its shell, as a drill does */
  },
  prism:{
    can:e=>!!e.lens&&!e.ret,
    wants(S,R,e,d){return sees(S,R,ecx(e),ecy(e),d.x,d.y-4)},
    go(S,R,e,d){fly(S,R,e,d.x,d.y-6,NOTICE.speed);return 1},
    stun:wrapIt,
    leave(e){e.ret=1},   /* its own return to the drift (crystals.js) */
  },
};
/* a beetle works only along its own face (u px from its cell, lo..hi): the u that puts it nearest the plant, if the plant is within a tile and a half of that spot */
function beetleU(e,d){
  const cx=e.hx*T+T/2+e.gx*2,cy=e.hy*T+T/2+e.gy*2;
  if(e.ax){const u=clamp(d.x-cx,e.lo,e.hi);return Math.abs(d.x-(cx+u))<=8&&Math.abs(d.y-4-cy)<=T*1.6?u:null}
  const u=clamp(d.y-4-cy,e.lo,e.hi);return Math.abs(d.y-4-(cy+u))<=8&&Math.abs(d.x-cx)<=T*1.6?u:null;
}
const wantsAny=(S,R,e,d,K)=>{
  const dx=d.x-ecx(e),dy=d.y-4-ecy(e);
  if(!d.land||Math.hypot(dx,dy)>NOTICE.r||!fenced(e,d)||(K.can&&!K.can(e)))return false;
  return K.wants(S,R,e,d);
};
function consume(S,F,e,d,ev,K){
  F.drops.splice(F.drops.indexOf(d),1);F.pop.push({x:d.x,y:d.y-4,t:0});
  const f=e.fd;
  if(d.k==='seed'){K.stun(S,e,ev);e.fd=null;if(K.leave)K.leave(e,f)}
  else{
    e.lf={k:d.k==='bloom'?'flower':'leaf',t:0,col:d.col};ev.push(d.k==='bloom'?'bloom':'sprout');
    hearts(S.feed,ecx(e),e.y-8);
    e.fd=K.back?{st:'back',t:0}:null;if(K.leave)K.leave(e,f);
  }
}
/* called from enemies.js for each creature that is neither wrapped nor in its grace: 1 = it has used this step (alerted, flying, frozen), 0 = carry on as usual */
export function feedMove(S,R,e,ev){
  const K=KIND[e.k];if(!K)return 0;
  const F=S.feed;if(!F)return 0;
  if(e.fc>0)e.fc--;
  if(e.fz>0){e.fz--;return 1}   /* a seed's hold on a fish */
  let f=e.fd;
  if(f&&f.st==='back'){   /* flying home to its path */
    if(++f.t>NOTICE.giveup){e.fd=null;return 0}
    if(!K.back(S,R,e)){e.fd=null;return 1}
    return 1;
  }
  if(f){
    const d=F.drops.find(q=>same(q,f));
    if(!d||e.lf||(K.can&&!K.can(e))){e.fd=K.back&&d===undefined?{st:'back',t:0}:null;if(K.leave)K.leave(e,f);return 0}   /* the mascot got there first (or it is fed): back to its path */
    if(f.st==='alert'){if(++f.t>=NOTICE.alert){f.st='go';f.t=0;f.best=1e9;f.s=0}return 1}
    const rb=K.reach||0;
    if(ov(itemBox(d),{x:e.x-rb,y:e.y-rb,w:e.w+rb*2,h:e.h+rb*2})){consume(S,F,e,d,ev,K);return 0}
    const dist=Math.hypot(d.x-ecx(e),d.y-6-ecy(e));
    if(dist<f.best-.5){f.best=dist;f.s=0}
    if(++f.t>NOTICE.giveup||++f.s>90){e.fc=NOTICE.cool;e.fd=K.back?{st:'back',t:0}:null;if(K.leave)K.leave(e,f);return 0}   /* no way through: it gives up */
    return K.go(S,R,e,d)?1:0;
  }
  if(e.lf||e.fc>0||!F.drops.length||(K.can&&!K.can(e)))return 0;
  let best=null,bd=1e9;
  for(const d of F.drops){if(!wantsAny(S,R,e,d,K))continue;const m=Math.hypot(d.x-ecx(e),d.y-4-ecy(e));if(m<bd){bd=m;best=d}}
  if(!best)return 0;
  e.fd={st:'alert',t:0,x:best.x,y:best.y,h:e.k==='moss'?[e.mx,e.my]:null};ev.push('alert');
  return 1;
}

/* ---------- hearts ---------- */
/* three small hearts rise from where a leaf or flower has just appeared (the mascot's head or an enemy's), a few frames apart */
export const HEART={life:54,rise:20};
export function hearts(F,x,y){if(!F)return;for(let i=0;i<3;i++)F.hearts.push({x:x+(i-1)*6,y,t:-i*8})}
