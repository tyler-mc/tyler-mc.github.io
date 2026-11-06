/* Liquids. Each surface (a run of liquid tiles open above) is a column heightfield with springs: per CW-px column an
   offset h (px, + is down) and a velocity v, so ripples travel and die away. Currents are a coarse per-tile flow layer
   (px per frame, + is east) from the room's ents: {at:[x,y],flow:-150} on a liquid tile sets its whole connected body
   to -1.5. Everything lives in S.liq as plain numbers (snapshot/restore, the Undo ring later), stepped at the fixed
   60 Hz with no randomness, and rebuilt on room entry (never saved). Gameplay reads the surface and the flow; splashes,
   droplets and current streaks are the renderer's. Liquid-agnostic: lava (M4) is another char in isLiq. No DOM. */
import {T} from './state.js';

export const CW=2,isLiq=c=>c==='~';
/* K: spring to rest, D: damping, SP: spread to neighbours per pass, MAXH: the clamp (px) */
const K=.03,D=.04,SP=.2,MAXH=9,EPS=1e-4;
const liqAt=(R,tx,ty)=>!!(R.g[ty]&&isLiq(R.g[ty][tx]));

/* S.liq for a room: {s:[{tx,ty,n,h,v}] surfaces, flow:{tile index:px per frame}, wet:his feet were under (0/1)} */
export function newLiquid(R,ents=[]){
  const s=[],flow={};
  for(let ty=0;ty<R.h;ty++)for(let tx=0;tx<R.w;){
    if(!liqAt(R,tx,ty)||liqAt(R,tx,ty-1)){tx++;continue}
    let e=tx;while(e<R.w&&liqAt(R,e,ty)&&!liqAt(R,e,ty-1))e++;
    const n=(e-tx)*T/CW;s.push({tx,ty,n,h:Array(n).fill(0),v:Array(n).fill(0)});tx=e;
  }
  for(const en of ents){if(!en.flow||!liqAt(R,en.at[0],en.at[1]))continue;
    const q=[[en.at[0],en.at[1]]],f=en.flow/100;
    while(q.length){const [x,y]=q.pop(),k=y*R.w+x;if(k in flow||!liqAt(R,x,y))continue;flow[k]=f;q.push([x+1,y],[x-1,y],[x,y+1],[x,y-1])}}
  return {s,flow,wet:0};
}

/* a chase's tide (game/tide.js fills L.tide while one runs): its column at room px x, {i,top,bot} (room px), else null;
   and whether room px (x,y) is in its water */
export const tideCol=(L,x)=>{const D=L&&L.tide;if(!D)return null;const i=Math.floor(x/CW);return i>=0&&i<D.n&&D.top[i]>=0?{i,top:D.top[i],bot:D.bot[i]}:null};
export const inTide=(L,x,y)=>{const q=tideCol(L,x);return !!q&&y>q.top&&y<q.bot};
/* the surface whose x span holds room px x and whose rest line lies between y0 and y1, else null (a tide's first; a
   pool under the tide has no surface of its own) */
export function surfAt(L,x,y0,y1){
  if(!L)return null;
  const q=tideCol(L,x);if(q&&q.top>=y0&&q.top<=y1)return {s:L.tide,i:q.i,top:q.top,y:q.top+L.tide.h[q.i]};
  for(const s of L.s){const top=s.ty*T;if(top<y0||top>y1||x<s.tx*T||x>=s.tx*T+s.n*CW||(q&&q.top<top))continue;
    const i=Math.min(s.n-1,Math.floor((x-s.tx*T)/CW));return {s,i,top,y:top+s.h[i]}}
  return null;
}
/* the current at room px (x,y): px per frame, + east */
export const flowAt=(L,R,x,y)=>L?L.flow[Math.floor(y/T)*R.w+Math.floor(x/T)]||0:0;

/* push the surface at room px x: amt px per frame (+ down) at the centre, fading to 0 at w px either side */
export function disturb(L,x,y,amt,w=8){
  const q=surfAt(L,x,y-T,y+T);if(!q)return;const {s}=q,c=(x-s.tx*T)/CW,r=w/CW;
  for(let i=Math.max(0,Math.ceil(c-r));i<=Math.min(s.n-1,Math.floor(c+r));i++)s.v[i]+=amt*(1-Math.abs(i-c)/(r+1));
}

/* what moves through the water makes ripples: his feet crossing the line (in or out, by how fast), a wake while he
   wades or swims, and anything else that swims near the top (the clownfish) */
function bodies(S,R,ev){
  const L=S.liq,p=S.p,fx=p.x+9,feet=p.y+p.h,q=surfAt(L,fx,feet-p.h,feet+T*3),wet=q&&!p.surf&&feet>q.top+1?1:0;
  if(q&&wet!==L.wet&&!p.dead&&Math.abs(p.vy)>.6){disturb(L,fx,q.top,Math.min(3,Math.abs(p.vy)*.8)*(wet?1:-1),12);if(wet&&p.vy>2)ev.push('splash')}
  else if(q&&wet&&Math.abs(p.vx)>.3&&p.y<q.top&&(S.t&3)===0)disturb(L,fx-Math.sign(p.vx)*8,q.top,.25,6);
  L.wet=wet;
  for(const e of S.ens){if(e.k!=='fish'||(S.t+e.x|0)%6)continue;const g=surfAt(L,e.x+e.w/2,e.y-T,e.y+2);if(g&&e.y-g.top<8)disturb(L,e.x+e.w/2,g.top,.35,5)}
}

export function stepLiquid(S,R,ev=[]){
  const L=S.liq;if(!L)return;
  bodies(S,R,ev);
  for(const s of L.tide?[...L.s,L.tide]:L.s){const h=s.h,v=s.v,n=s.n;
    for(let i=0;i<n;i++)v[i]+=-K*h[i]-D*v[i]+SP*((i?h[i-1]:h[i])+(i<n-1?h[i+1]:h[i])-2*h[i]);   /* ripples spread both ways */
    for(let i=0;i<n;i++){h[i]+=v[i];if(h[i]>MAXH)h[i]=MAXH;else if(h[i]<-MAXH)h[i]=-MAXH;if(Math.abs(h[i])<EPS&&Math.abs(v[i])<EPS){h[i]=0;v[i]=0}}
  }
}
/* the springs' energy (tests: it dies away) */
export const energy=L=>L.s.reduce((a,s)=>a+s.h.reduce((b,h,i)=>b+K*h*h+s.v[i]*s.v[i],0),0);
