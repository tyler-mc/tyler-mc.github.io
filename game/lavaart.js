/* Molten art for the engine's own tiles and the claws, drawn in code: lava, cracked walls, vines and their flowers, the
   rubble of a drill, the claws pickup and HUD mark. Called from render.js. Nothing here gives light (no glow, Tyler's
   rule): lava reads by its shape and motion, not only its colour, so it never looks like water to a colour-blind eye.
   Lava is a crust of dark plates with bright seams that creeps sideways, under a lumpy line where slow bubbles swell and
   pop; water is flat bands, current streaks and a thin rippling line. Reduced motion: the crust and bubbles hold still. */
import {T,VW,VH} from './state.js';
import {B4} from './mascot.js';
import {CW,tideCol} from './liquid.js';
import {VINE,CLAW,flowers,isDrilled} from './claws.js';

const INK='#1A1716';
const bay=(x,y)=>(B4[(y&3)*4+(x&3)]+.5)/16;
const hash=(x,y)=>{let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296};
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const px=(ctx,x,y,c,w=1,h=1)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h)};

/* ---------- lava ---------- */
const LV={crust:'#2a0d07',plate:'#45160a',plateL:'#5e2210',seam:'#b8380c',seamH:'#ff7a1c',deep:'#1a0705',crest:'#ffb04a',crestD:'#8a3310',bub:'#ffcf73',bubD:'#c2501a',pop:'#ffe7a8'};
/* a 48 px tileable crust: Voronoi plates (dark, lighter to their upper left) parted by seams of molten rock */
const TEX=48;let tex=null;
function lavaTex(){
  if(tex)return tex;tex=[];
  const pts=[];for(let k=0;k<9;k++)pts.push([hash(k,3)*TEX,hash(k,7)*TEX]);
  for(let f=0;f<2;f++){const c=mk(TEX+T,TEX+T),x=c.getContext('2d');   /* padded by a tile, so a tile-sized window never wraps */
    for(let j0=0;j0<TEX+T;j0++)for(let i0=0;i0<TEX+T;i0++){const i=i0%TEX,j=j0%TEX;let d1=1e9,d2=1e9,q=0;
      for(let k=0;k<pts.length;k++)for(const [ox,oy] of [[0,0],[TEX,0],[-TEX,0],[0,TEX],[0,-TEX],[TEX,TEX],[-TEX,-TEX],[TEX,-TEX],[-TEX,TEX]]){
        const d=Math.hypot(i-pts[k][0]-ox,j-pts[k][1]-oy);if(d<d1){d2=d1;d1=d;q=k}else if(d<d2)d2=d}
      const e=d2-d1;let col=e<1.1?(f&&hash(i,j)<.5?LV.seamH:LV.seam):e<2.2?LV.crust:LV.plate;
      if(col===LV.plate&&hash(q,i>>2)<.25&&e>4)col=LV.plateL;
      px(x,i0,j0,col)}
    tex.push(c)}
  return tex;
}
/* before the light pass (the dark dithers it): every lava tile in view, the crust creeping east 1 px every 8 frames.
   A surface tile starts at its line (S.liq's columns; the editor has no sim, so a flat line 2 px down) */
export function lavaBody(ctx,S,R,ox,oy,t,reduce){
  const x0=Math.max(0,Math.floor(ox/T)),x1=Math.min(R.w-1,Math.floor((ox+VW)/T)),y0=Math.max(0,Math.floor(oy/T)),y1=Math.min(R.h-1,Math.floor((oy+VH)/T));
  let any=false;for(let ty=y0;ty<=y1&&!any;ty++)if(R.g[ty].slice(x0,x1+1).includes('L'))any=true;
  if(!any)return;
  const tx2=lavaTex(),f=reduce?0:(t>>4)&1,sh=reduce?0:(t>>3)%TEX,src=tx2[f];
  for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){
    if(R.g[ty][tx]!=='L')continue;
    const top=!(R.g[ty-1]&&R.g[ty-1][tx]==='L'),x=tx*T-ox,y=ty*T-oy,dy=top?2:0;
    const u=((tx*T-sh)%TEX+TEX)%TEX,v=(ty*T+dy)%TEX;
    ctx.drawImage(src,u,v,T,T-dy,x,y+dy,T,T-dy);
    if(!top&&!(R.g[ty-2]&&R.g[ty-2][tx]==='L')){ctx.fillStyle=LV.deep;for(let j=0;j<T;j+=2)for(let i=(j>>1)&1;i<T;i+=3)if(bay(i,j)<j/T*.6)ctx.fillRect(x+i,y+j,1,1)}   /* it darkens with depth */
    else if(!top){ctx.fillStyle=LV.deep;for(let j=0;j<T;j++)for(let i=j&1;i<T;i+=2)ctx.fillRect(x+i,y+j,1,1)}
  }
}
/* after the light pass: the line (lumpy, 1 px higher on every third column) and its bubbles, so lava reads in the dark;
   dim outside his light. A bubble swells over its 64-frame life at its own spot and pops into two specks */
export function lavaCrest(ctx,S,ox,oy,t,L,amb,reduce){
  if(!S.liq)return;
  for(const s of S.liq.s){if(!s.lava)continue;const y0=s.ty*T-oy;if(y0<-8||y0>VH+4)continue;
    for(let i=0;i<s.n;i++){const x=s.tx*T+i*CW-ox;if(x<-CW||x>=VW)continue;
      {const q=tideCol(S.liq,s.tx*T+i*CW);if(q&&q.top<s.ty*T)continue}
      const h=Math.round(s.h[i]),lump=((i+(reduce?0:t>>5))%3===0)?1:0,y=y0+h+1-lump;if(y<0||y>=VH)continue;
      const lit=(L?L[y*VW+Math.max(0,Math.min(VW-1,x))]:1)+amb;
      px(ctx,x,y,lit>.55?LV.crest:LV.crestD,CW,1);px(ctx,x,y+1,lit>.55?LV.seam:LV.crust,CW,1)}
    if(reduce)continue;
    const nb=Math.max(1,Math.round(s.n*CW/40));
    for(let k=0;k<nb;k++){const per=64+((hash(s.tx+k,s.ty)*60)|0),a=(t+((hash(k,s.ty+s.tx)*per)|0))%per,cyc=Math.floor((t+((hash(k,s.ty+s.tx)*per)|0))/per);
      const bx=s.tx*T+Math.floor(hash(k*13+cyc,s.ty)*(s.n*CW-6))+3-ox,by=y0+1;if(bx<-4||bx>VW+4)continue;
      if(a<48){const r=a<12?0:a<28?1:2;   /* swelling: a dome on the line */
        for(let j=-r;j<=0;j++)for(let i=-r;i<=r;i++){if(i*i+j*j>r*r+r)continue;px(ctx,bx+i,by+j-1,j===-r||Math.abs(i)===r?LV.bubD:LV.bub)}}
      else if(a<56){const u=a-48;px(ctx,bx-1-(u>>1),by-3-u,LV.pop);px(ctx,bx+1+(u>>1),by-4-u,LV.pop)}   /* popped */
    }
  }
}

/* ---------- cracked wall (X) ---------- */
/* drawn per tile before the light pass, so it lies in the dark like rock; the static layer leaves its cell open, so a
   drilled one is simply gone. Chunks of the room's rock parted by deep cracks, pale grit in them; while being drilled the
   tile shakes and new cracks run out from the claws as the drill goes on (S.crack: [tx,ty,frames]) */
const XT=new Map();
function crackTile(P,v){
  const k=P.rock+v;if(XT.has(k))return XT.get(k);
  const c=mk(T,T),x=c.getContext('2d');
  const cut=(i,j)=>{const a=(i+j*.6+v*3)%7,b=(j-i*.45+v*5+20)%6;return a<1||b<1};
  for(let j=0;j<T;j++)for(let i=0;i<T;i++){const h=hash(i+v*17,j);let col=cut(i,j)?INK:h<.12?P.rockD:h>.9?P.rockL:P.rock;
    if(!cut(i,j)&&(cut(i-1,j)||cut(i,j-1)))col=P.rockL;if(cut(i,j)&&h<.18)col='#c9b79a';
    if(i===0||j===0||i===T-1||j===T-1)col=cut(i,j)?INK:P.rockD;px(x,i,j,col)}
  XT.set(k,c);return c;
}
export function crackedTile(ctx,S,R,P,tx,ty,x,y,t,reduce){
  if(isDrilled(S,tx,ty))return;
  const c=S.crack,on=c&&c[0]===tx&&c[1]===ty,k=on?c[2]/CLAW.drill:0,jx=on&&!reduce&&(t&2)?1:0;
  ctx.drawImage(crackTile(P,(tx*7+ty*3)&1),x+jx,y);
  if(on){const n=Math.ceil(k*5);for(let m=0;m<n;m++){const sx=x+jx+2+((hash(tx,m)*8)|0),sy=y+((hash(ty,m)*T)|0),L=3+((hash(m,tx+ty)*5)|0);
    for(let i=0;i<L;i++)px(ctx,sx+(i>>1)*(m&1?1:-1),sy+i-(L>>1),INK)}}
}

/* ---------- vines ---------- */
const VC={stem:'#3d7a2c',stemD:'#24481a',leaf:'#69a83c',pet:'#f0907a',petL:'#ffd0b8',petD:'#b4504a',core:'#ffd94a',dry:'#6b5a3a',dryD:'#3e3222'};
/* after the light pass, like the enemies, so his footholds always read. A stem up the wall face from its base, a curled
   growing tip, a leaf every 6 px; each flower a flat bloom VINE.w px out from the wall (its top row is the foothold).
   In its last VINE.fade frames it browns and dithers away */
export function drawVines(ctx,S,ox,oy,t,reduce){
  for(const v of S.vines||[]){
    const left=VINE.life-v.t,wk=left<VINE.fade?1-left/VINE.fade:0,s=v.s,fx=Math.round(v.fx)-ox,by=Math.round(v.by)-oy,len=Math.round(v.len);
    const put=(x,y,c)=>{if(x<0||y<0||x>=VW||y>=VH||(wk&&bay(x+1,y)<wk))return;ctx.fillStyle=wk>.4&&c!==INK?(c===VC.stemD||c===VC.petD?VC.dryD:VC.dry):c;ctx.fillRect(x,y,1,1)};
    const sx=s>0?fx-2:fx;
    for(let j=0;j<=len;j++){const w=(reduce?0:Math.round(Math.sin((v.by-j)*.35)*.6)),x=sx+w;put(x,by-j,VC.stem);put(x+1,by-j,VC.stemD);
      if(j%6===3){const lx=s>0?x-1:x+2;put(lx,by-j,VC.leaf);put(lx+(s>0?-1:1),by-j-1,VC.leaf)}}
    if(len<v.max-.5){const tx=sx-(s>0?1:-1);put(tx,by-len-1,VC.leaf);put(tx-(s>0?1:-1),by-len,VC.leaf)}   /* the growing tip curls */
    for(const f of flowers(v)){const x=Math.round(f.x)-ox,y=Math.round(f.y)-oy;
      for(let i=0;i<VINE.w;i++){put(x+i,y,i===0||i===VINE.w-1?VC.petD:(i&1)?VC.pet:VC.petL);put(x+i,y+1,(i&1)?VC.petD:VC.pet)}
      put(x+(s>0?VINE.w-3:2),y+2,VC.stemD);const cx=x+(VINE.w>>1);put(cx,y-1,VC.core);put(cx-1,y-1,VC.pet)}
  }
}

/* ---------- a drill's rubble (renderer-side, not in S) ---------- */
export const newRubble=()=>({room:null,q:[]});
export function stepRubble(rb,S,ev,P){
  if(rb.room!==S.room){rb.room=S.room;rb.q=[]}
  if(ev.includes('drill'))for(const [tx,ty] of S.drillNow||[])for(let n=0;n<7;n++)rb.q.push({x:tx*T+2+hash(tx*7+n,ty)*8,y:ty*T+2+hash(ty*5+n,tx)*8,vx:(hash(n,tx+ty)-.5)*2.4,vy:-1-hash(tx+n,ty*3)*1.6,t:0,c:n%3});
  if(ev.includes('crack')&&S.crack){const [tx,ty]=S.crack;for(let n=0;n<2;n++)rb.q.push({x:tx*T+6+(hash(S.t,n)-.5)*8,y:ty*T+3+hash(n,S.t)*6,vx:(hash(S.t+n,1)-.5)*.6,vy:.2,t:0,c:3})}
  for(const r of rb.q){r.t++;r.vy=Math.min(3,r.vy+.18);r.x+=r.vx;r.y+=r.vy}
  rb.q=rb.q.filter(r=>r.t<(r.c===3?24:44));
}
export function drawRubble(ctx,rb,S,P,ox,oy){
  if(rb.room!==S.room)return;
  for(const r of rb.q){const x=Math.round(r.x)-ox,y=Math.round(r.y)-oy;if(x<0||y<0||x>=VW||y>=VH)continue;
    if(r.c===3){px(ctx,x,y,'#c9b79a');continue}
    px(ctx,x,y,r.c?P.rock:P.rockL,2,2);if(r.c===2)px(ctx,x+1,y+1,P.rockD)}
}

/* ---------- the claws: pickup and HUD ---------- */
/* a green claw glove: three hooked claws over a vine cuff (yellow tips: a pickup) */
const CLAWS=['.k..k..k.','kYk.kYk.k','kGk.kGkYk','kGGkkGGGk','kGGGGGGGk','.kVVVVVk.','.kvVvVvk.','..kkkkk..'];
const CLAWS_P={k:INK,Y:'#FFD94A',G:'#69a83c',V:'#3d7a2c',v:'#24481a'};
const CLAW_HUD=['k.k.k','YkYkY','GGGGG','.VVV.'];
function blit(ctx,rows,x,y,pal){for(let j=0;j<rows.length;j++)for(let i=0;i<rows[j].length;i++){const c=rows[j][i];if(c!=='.')px(ctx,x+i,y+j,pal[c])}}
export function clawsItem(ctx,x,y,t){const b=Math.round(Math.sin(t*.06)*1.5);blit(ctx,CLAWS,x+1,y+2+b,CLAWS_P);if((t>>3)%5===0)px(ctx,x+2+((t>>3)%3)*3,y-1+b,'#fff')}
export const clawsHud=(ctx,x,y)=>blit(ctx,CLAW_HUD,x,y,CLAWS_P);
