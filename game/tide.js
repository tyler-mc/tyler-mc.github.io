/* The Flood chase's tide (CHASES.flood.tide, rooms/index.js; stepped in game/chases.js). Lifting the Flood fragment wakes
   the eel in its lair: water swells over the lair's rim and runs west behind it as a shallow sheet. The sheet's leading
   edge runs S.chase.l px ahead of the eel's snout (S.chase.x, world px), never past the safe line; its surface is level at
   world px S.chase.y and curves down over its last `edge` px. Here the sheet is cut into his room as surface columns,
   S.liq.tide = {tx:0,n,h,v,top,bot}: per CW-px column the surface and the floor under it (room px, -1 where there is no
   water) and the surface's own ripples, rebuilt each step while a tide chase runs and dropped after. liquid.js, player.js
   and board.js read it like a pool, so he wades, floats, swims and surfs it. Plain numbers; S.liq is never saved. No DOM. */
import {T} from './state.js';
import {CW,isLiq} from './liquid.js';

const hard=(S,c)=>c===undefined||c==='#'||c==='='||(c==='G'&&S.gate<.5)||c==='X';
const endOf=C=>C.path[C.path.length-1][0]*T;
/* the leading edge, world px x (the water lies on the eel's side of it) */
export function leadX(c,C){const d=C.dir||1,e=endOf(C),l=c.l??C.tide.lip;return d<0?Math.max(e,c.x-l):Math.min(e,c.x+l)}
/* the sheet's surface at world px x (world px y), or null where it has not come */
export function tideY(c,C,x){
  const D=C.tide,u=(leadX(c,C)-x)*(C.dir||1);if(u<0||c.y==null)return null;
  return c.y+(u<D.edge?D.drop*(1-u/D.edge)**2:0);
}
/* the stretch's level (world px y) where the eel's snout is: the last entry of tide.lv it has reached */
export function levelAt(C,x){const d=C.dir||1;let v=C.tide.lv[0][1];for(const [tx,y] of C.tide.lv)if((x-tx*T)*d>=0)v=y;return v}

/* the eel stirs the water it drives (called by chases.js after tideCols while the chase runs; no randomness, only the chase
   clock, so snapshots replay it exactly). Velocity kicks on the surface columns (liquid.js's springs carry them on):
   in its lair, before its head breaks the water, the surface over it swells up; at the breach a heavy splash; while it
   chases, a churn round its neck, a bow wave lifting ahead of its snout and a pulse each time its jaw snaps (p: the surge
   phase, chases.js EEL; snap: its jaw shuts this frame); and a chop on the sheet's leading edge. up0, up: its reach (px over the water) last frame and now */
export const STIR={swell:.1,splash:2.4,churn:.16,bow:.12,snap:1.4,chop:.2,front:36};
export function stirTide(S,R,c,C,p,snap,up0,up){
  const L=S.liq,D=L.tide,ox=R.at[0]*T,oy=R.at[1]*T,sx=c.x-ox,b=-(C.dir||1),t=c.t;
  /* kick px per frame (+ down) on the tide's columns, else on the pool surface nearest the water's level there */
  const kick=(x,amt,pool)=>{const i=Math.floor(x/CW);if(i>=0&&i<D.n&&D.top[i]>=0){D.v[i]+=amt;return}if(!pool)return;
    let best=null,bd=3*T;for(const s of L.s){if(s.lava||x<s.tx*T||x>=s.tx*T+s.n*CW)continue;const d=Math.abs(s.ty*T-(c.y-oy));if(d<bd){bd=d;best=s}}
    if(best)best.v[Math.min(best.n-1,Math.floor((x-best.tx*T)/CW))]+=amt};
  const span=(u0,u1,f,pool)=>{for(let u=u0;u<=u1;u+=CW)kick(sx+b*u,f(u),pool)};
  if(up<0){if((t&3)===0)span(4,40,u=>-STIR.swell*(1+up/24)*Math.sin(Math.PI*(u-4)/36),1);return}   /* the swell over its rising head */
  if(up0<0){span(6,34,()=>STIR.splash,1);span(-14,0,()=>-STIR.splash*.5,1);span(40,54,()=>-STIR.splash*.5,1);return}   /* the breach */
  if(p>=0){
    if((t&1)===0)span(4,30,u=>STIR.churn*Math.sin(u*.55+t*.35));
    if((t&3)===0)span(-12,-2,()=>-STIR.bow);
    if(snap)span(2,30,u=>STIR.snap*(1-Math.abs(u-16)/16));
  }
  if((t&1)===0&&c.l>0){const e=leadX(c,C)-ox;for(let u=0;u<=STIR.front;u+=CW)kick(e+b*u,STIR.chop*Math.sin(u*.85+t*.45))}   /* the bore's chop */
}

/* S.liq.tide for room R (C: the running chase's entry, or none) */
export function tideCols(S,R,C){
  const L=S.liq,c=S.chase;if(!L)return;
  if(!c||!C||!C.tide||c.y==null){if(L.tide)L.tide=null;return}
  const n=R.w*T/CW,ox=R.at[0]*T,oy=R.at[1]*T;
  let D=L.tide;if(!D||D.n!==n)D=L.tide={tx:0,n,h:Array(n).fill(0),v:Array(n).fill(0),top:Array(n).fill(-1),bot:Array(n).fill(-1)};
  for(let i=0;i<n;i++){
    const x=i*CW+CW/2,ys=tideY(c,C,ox+x);let top=-1,bot=-1;
    if(ys!==null&&ys>oy){const y=ys-oy,tx=Math.floor(x/T),ty=Math.floor(y/T),row=R.g[ty];
      /* a surface in rock, or under a pool's own surface, is none; else the water runs down to the first rock */
      if(row&&!hard(S,row[tx])&&!isLiq(row[tx])){let b=ty+1;while(b<R.h&&!hard(S,R.g[b][tx]))b++;top=y;bot=b*T}}
    D.top[i]=top;D.bot[i]=bot;if(top<0){D.h[i]=0;D.v[i]=0}
  }
}
