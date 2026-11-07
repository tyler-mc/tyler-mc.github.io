/* The mascot in the game: a thin adapter over the shared atlas (mascot/atlas.js, also the OS desktop buddy's art). compose(look) -> grid -> a cached canvas.
   The cell is 40x64 with the soles on row SOLE; render.js draws it at (p.x+9-CX, p.y+PH-1-SOLE) so the soles land on the player box's last row.
   A look is the atlas's: {lv,ft,arms,face,blink,happy,mouth,dir,stage,hat,mask,pose,flip,dx,air,...} (see compose in mascot/atlas.js). */
import {compose,paint,W,H,CX,SOLE,INK} from '../mascot/atlas.js';
import {WALK_LOOKS,IDLE_TURN,IDLE_LEAN} from '../mascot/anim_walk.js';
import {FEET} from '../mascot/feet.js';
import {BODY} from '../mascot/body.js';
import {ANIM_ROOT} from '../mascot/anim_root.js';
import {ANIM_SURF} from '../mascot/anim_surf.js';
export {INK,W,H,CX,SOLE,WALK_LOOKS,IDLE_TURN,IDLE_LEAN,ANIM_ROOT};
export const B4=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];

/* the pulse (game/fx.js sy: 1 = rest, below = squashed, above = stretched) picks one authored body level */
const LV=[[.8,'S3'],[.88,'S2'],[.95,'S1'],[1.04,'rest'],[1.1,'T1'],[1.18,'T2'],[9,'T3']];
export const levelOf=sy=>{for(const [m,n] of LV)if(sy<m)return n;return 'T3'};
/* the shoe centres of a feet pose in the cell (x only, facing right; render.js mirrors them), for the root strands */
export const shoeX=(ft,flip)=>{const F=FEET[ft]||FEET.stand;return F.feet.map(f=>{const c=f[0]+f[2][0].length/2;return flip?W-c:c}).sort((a,b)=>a-b)};

/* the sprout's lag in screen px. Pose frames (surf, ground, root) are authored with the leaf close to the cell's right edge: only a TRAILING lag (behind the way he faces) fits */
const leafLag=s=>{const l=s.sp|0;if(!s.pose)return l;const u=s.flip?-l:l,t=Math.min(0,u);return s.flip?-t:t};
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const cache=new Map();
const KEYS=['lv','ft','arms','face','blink','happy','mouth','dir','stage','hat','mask','pose','flip','dx','air','lid','pens','sleep','gape','bv','hold','heart','q','fx','ll','forged','cling','turn','lean'];
/* a cached canvas for a look (the pose frame may be taller than 64 rows: the canvas follows the grid) */
export function sprite(s){
  const l=s.mac?{pose:'mac:0',air:1,dir:[0,0],stage:0}:{...s,ll:leafLag(s),sp:0,air:1},k=KEYS.map(n=>JSON.stringify(l[n])).join('|');
  let c=cache.get(k);
  if(!c){const g=compose(l);c=mk(g[0].length,g.length);const cx=c.getContext('2d',{willReadFrequently:true});paint(cx,g);
    if(l.forged&&l.pose&&/^surf:/.test(l.pose)){   /* the heat-forged board: its own pixels, still showing, go dark iron with an ember edge (floodart BPF) */
      const F=ANIM_SURF.frames[+l.pose.slice(5)],B=F&&F.board,col={k:'#5a1c0c',o:'#ff8a3a',Y:'#3a2e2a',B:'#241a17'};
      if(B)B.rows.forEach((r,j)=>{for(let i=0;i<r.length;i++){const ch=r[i];if(ch==='.'||!col[ch])continue;const x=l.flip?W-1-(B.x0+i):B.x0+i,y=B.y0+j;
        if(g[y]&&g[y][x]===ch){cx.fillStyle=col[ch];cx.fillRect(x,y,1,1)}}})}   /* glitch() reads these back */
    if(l.cling){   /* clinging (game/claws.js): hooked claws dug into the wall on his side, past the raised hands (the wall face is the player box edge) */
      const d=l.cling>0?1:-1,cy=BODY.T2.cy,wx=d>0?CX+11:CX-12;
      for(const y of [cy-5,cy+1]){for(const [x,yy,ch] of [[wx,y,'k'],[wx,y+1,'k'],[wx+d,y,'w'],[wx-d,y-1,'k']])if(g[yy]&&g[yy][x]==='.'||ch==='k'&&g[yy]&&g[yy][x]!==undefined){g[yy][x]=ch;cx.fillStyle=ch==='k'?INK:'#fff';cx.fillRect(x,yy,1,1)}}}
    if(cache.size>400)cache.clear();cache.set(k,c)}
  return c;
}

/* RGB split, row tears and a Bayer dropout over a sprite; returns a canvas 8 px wider (draw it 4 px left) */
let gc=null,gx=null;
export function glitch(src,k,seed){
  const w=src.width,h=src.height,ow=w+8;
  if(!gc||gc.width!==ow||gc.height!==h){gc=mk(ow,h);gx=gc.getContext('2d')}
  const s=src.getContext('2d').getImageData(0,0,w,h).data,out=gx.createImageData(ow,h),o=out.data;
  let r=(seed*7919+13)%2147483647||1;const rn=()=>(r=(r*16807)%2147483647)/2147483647;
  const sh=new Array(h).fill(0);
  for(let n=0;n<3+k*6;n++){const y0=rn()*h|0,len=2+(rn()*6|0),dx=Math.round((rn()-.5)*10*k);for(let y=y0;y<Math.min(h,y0+len);y++)sh[y]=dx}
  const sp=Math.max(1,Math.round(2*k));
  for(let y=0;y<h;y++)for(let x=0;x<ow;x++){
    const sx=x-4-sh[y],at=xx=>xx>=0&&xx<w?(y*w+xx)*4:-1,iR=at(sx-sp),iG=at(sx),iB=at(sx+sp);
    const a=Math.max(iR<0?0:s[iR+3],iG<0?0:s[iG+3],iB<0?0:s[iB+3]);
    if(!a||(B4[(y&3)*4+(x&3)]+.5)/16<k*.4)continue;
    const j=(y*ow+x)*4;o[j]=iR<0?0:s[iR];o[j+1]=iG<0?0:s[iG+1];o[j+2]=iB<0?0:s[iB+2];o[j+3]=255;
  }
  gx.putImageData(out,0,0);return gc;
}
