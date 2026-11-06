/* The Flood chase's tide (CHASES.flood.tide, rooms/index.js; stepped in game/chases.js). Lifting the Flood fragment wakes
   the eel in its lair: water swells over the lair's rim and runs west behind it as a shallow sheet. The sheet's leading
   edge runs S.chase.l px ahead of the eel's snout (S.chase.x, world px), never past the safe line; its surface is level at
   world px S.chase.y and curves down over its last `edge` px. Here the sheet is cut into his room as surface columns,
   S.liq.tide = {tx:0,n,h,v,top,bot}: per CW-px column the surface and the floor under it (room px, -1 where there is no
   water) and the surface's own ripples, rebuilt each step while a tide chase runs and dropped after. liquid.js, player.js
   and board.js read it like a pool, so he wades, floats, swims and surfs it. Plain numbers; S.liq is never saved. No DOM. */
import {T} from './state.js';
import {CW} from './liquid.js';

const hard=(S,c)=>c===undefined||c==='#'||c==='='||(c==='G'&&S.gate<.5);
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
      if(row&&!hard(S,row[tx])&&row[tx]!=='~'){let b=ty+1;while(b<R.h&&!hard(S,R.g[b][tx]))b++;top=y;bot=b*T}}
    D.top[i]=top;D.bot[i]=bot;if(top<0){D.h[i]=0;D.v[i]=0}
  }
}
