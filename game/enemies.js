/* Roots enemies. Mossback crawls cell to cell around any surface; Spore puff bobs on a sine.
   Wrapped (rooted) enemies are solid, harmless, and a wrapped puff loses buoyancy and falls. */
import {T} from './state.js';
import {move,solid,tile,ov} from './engine.js';
import {feedMove} from './feed.js';   /* a plant on the ground: the Roots enemies go for it (game/feed.js) */
import {spawnFlood,stepFlood} from './fish.js';   /* Flood: the hermit crab and the clownfish */
import {spawnCinder,stepCinder,spawnVent} from './cinders.js';   /* Molten: ember sprite, slag beetle, geyser vents (after the others, so their indices hold) */
import {spawnCrystal,stepCrystal} from './crystals.js';   /* Crystals: moving platforms and prism drifters (after the vents, so older indices hold) */

export const WRAP=240,SLACK=60,GRACE=30;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;

/* thorns are ground to a Mossback: it walks over them and they never hurt it */
const hard=c=>c===null||c==='#'||c==='='||c==='G'||c==='^'||c==='X';
/* on a floor of thorns it settles 4px down onto the tips (its top stays above them) */
const sink=(R,x,y,gy)=>gy===1&&R.g[y+1]&&R.g[y+1][x]==='^'?4:0;
/* left/top/right/bottom (room ents, optional): the cells it never leaves, so a room can fence a patrol without thorns.
   pace (optional, whole percent): its crawl speed against the usual one, since room ents hold whole numbers only */
function moss(R,s){
  const g=[[0,1],[-1,0],[1,0],[0,-1]].find(([a,b])=>hard(tile(R,s.tx+a,s.ty+b)))||[0,1],d=s.dir||1,k=sink(R,s.tx,s.ty,g[1]);
  const fence=['left','top','right','bottom'].some(n=>s[n]!==undefined)?[s.left??-1e3,s.top??-1e3,s.right??1e3,s.bottom??1e3]:null;
  const e={k:'moss',cx:s.tx,cy:s.ty,ncx:s.tx,ncy:s.ty,gx:g[0],gy:g[1],mx:g[1]*d,my:-g[0]*d,ogx:g[0],ogy:g[1],omx:g[1]*d,omy:-g[0]*d,
    p:0,len:0,sp:(s.sp||.35)*(s.pace>0?s.pace/100:1),x:0,y:0,w:12,h:8,wrap:0,grace:0,pass:0,dx:0,dy:0,s0:k,s1:k,fence};
  box(e);return e;
}
const puff=s=>({k:'puff',x:s.tx*T,y:s.ty*T,w:12,h:12,hx:s.tx*T,hy:s.ty*T,amp:s.amp??12,ph:0,sp:s.sp||.035,
  vy:0,ret:0,wrap:0,grace:0,pass:0,dx:0,dy:0});
export const spawnEnemies=R=>[...R.spawns.map(s=>s.k==='M'?moss(R,s):s.k==='O'?puff(s):s.k==='E'||s.k==='K'?spawnCinder(R,s):spawnFlood(R,s)),...(R.vents||[]).map(v=>spawnVent(R,v)),...(R.crys||[]).map(c=>spawnCrystal(R,c))];

/* the crawler's box hugs the surface on its g side. An outer corner is a straight run, a quarter turn of
   radius 4 round the block's corner, and a straight run (og/om: the g and m the move started with). */
const CORNER=12+Math.PI*2;
function box(e){
  let cx=e.cx*T+6+e.ogx*2,cy=e.cy*T+6+e.ogy*2;const s=e.p;
  if(e.len===CORNER){
    const px=e.cx*T+6+(e.omx+e.ogx)*6,py=e.cy*T+6+(e.omy+e.ogy)*6;
    if(s<6){cx+=e.omx*s;cy+=e.omy*s}
    else if(s<6+Math.PI*2){const a=(s-6)/4;cx=px-e.ogx*4*Math.cos(a)+e.omx*4*Math.sin(a);cy=py-e.ogy*4*Math.cos(a)+e.omy*4*Math.sin(a)}
    else{const k=s-6-Math.PI*2;cx=px+e.omx*4+e.ogx*k;cy=py+e.omy*4+e.ogy*k}
  }else{const f=e.len?s/e.len:0;cx+=(e.ncx-e.cx)*T*f;cy+=(e.ncy-e.cy)*T*f+e.s0+(e.s1-e.s0)*f}
  const gy=e.len===CORNER&&s>=6+Math.PI?e.gy:e.ogy;
  e.w=gy?12:8;e.h=gy?8:12;e.x=cx-e.w/2;e.y=cy-e.h/2;
}
/* pick the next cell: inner corner turns in place, outer corner wraps diagonally, water/room edge/its box reverse */
function plan(S,R,e){
  const out=(x,y)=>x<0||y<0||x>=R.w||y>=R.h,sol=(x,y)=>!out(x,y)&&(solid(S,R,x,y)||R.g[y][x]==='^'),bad=(x,y)=>out(x,y)||R.g[y][x]==='~'||R.g[y][x]==='L',
    b=e.fence,fence=(x,y)=>b&&(x<b[0]||y<b[1]||x>b[2]||y>b[3]),rev=()=>{e.mx=-e.mx;e.my=-e.my};
  for(let i=0;i<6;i++){
    const ax=e.cx+e.mx,ay=e.cy+e.my;
    if(sol(ax,ay)){[e.gx,e.gy,e.mx,e.my]=[e.mx,e.my,-e.gx,-e.gy];continue}
    if(bad(ax,ay)||fence(ax,ay)){rev();continue}
    if(sol(ax+e.gx,ay+e.gy)||out(ax+e.gx,ay+e.gy)){e.ncx=ax;e.ncy=ay;e.len=T;e.ogx=e.gx;e.ogy=e.gy;e.omx=e.mx;e.omy=e.my;e.s1=sink(R,ax,ay,e.gy);return}
    const bx=ax+e.gx,by=ay+e.gy;
    if(bad(bx,by)||fence(bx,by)){rev();continue}
    e.ncx=bx;e.ncy=by;e.ogx=e.gx;e.ogy=e.gy;e.omx=e.mx;e.omy=e.my;[e.gx,e.gy,e.mx,e.my]=[-e.mx,-e.my,e.gx,e.gy];e.len=CORNER;e.s0=e.s1=0;return;
  }
  e.len=0;e.ogx=e.gx;e.ogy=e.gy;e.omx=e.mx;e.omy=e.my;e.s1=e.s0;
}
function crawl(S,R,e){
  if(e.p>=e.len){e.cx=e.ncx;e.cy=e.ncy;e.p=0;e.s0=e.s1;plan(S,R,e)}
  if(e.len)e.p=Math.min(e.len,e.p+e.sp);
  box(e);
}

export function stepEnemies(S,R,ev){
  for(const e of S.ens){
    const ox=e.x,oy=e.y;
    if(!(e.wrap>0)&&!(e.grace>0)&&feedMove(S,R,e,ev)){}   /* alerted by a plant, or going for one, flying home from one, or held by a seed (game/feed.js) */
    else if(e.mol)stepCinder(S,R,e,ev);
    else if(e.cr)stepCrystal(S,R,e,ev);   /* Crystals (game/crystals.js): its own wrap, grace and drift */
    else if(e.soft)stepFlood(S,R,e,ev);
    else if(e.wrap>0){
      if(--e.wrap===0){e.grace=GRACE;e.ret=1;ev.push('unwrap')}
      else if(e.k==='puff'){e.vy=Math.min(3,e.vy+.2);if(move(S,R,e,0,e.vy,[]).hy)e.vy=0;if(ov(e,S.p))e.pass=1}   /* sinks through him, never lifts him */
    }else if(e.grace>0)e.grace--;
    else if(e.k==='moss'){crawl(S,R,e);if(e.fd&&e.fd.st==='go')crawl(S,R,e)}   /* going for a plant: twice as fast */
    else{
      const ty=e.hy+Math.sin(e.ph)*e.amp,d=ty-e.y;
      if(e.x!==e.hx)move(S,R,e,clamp(e.hx-e.x,-.9,.9),0,[]);   /* a puff that was wrapped away from its post drifts back */
      if(e.ret){if(Math.abs(d)<=.8){e.y=ty;e.ret=0}else e.y+=Math.sign(d)*.8}
      else{e.ph+=e.sp;e.y=e.hy+Math.sin(e.ph)*e.amp}
    }
    e.dx=e.x-ox;e.dy=e.y-oy;
    if(e.pass&&!ov(e,S.p))e.pass=0;
  }
}
