/* Molten art, drawn in code after the light pass (render.js), so every hazard reads in the dark without giving light:
   geyser vents (a cracked ash mound; the telegraph cracks it open, steams and shakes it; the eruption is a steam column
   flecked with spray), the ember sprite (a small flame with two dark eyes, smoke and a coal once smothered) and the slag
   beetle (a ridged slag shell on cracked rock; open, a flat shell ledge over its stunned body). Palette: ash greys, rust
   and a dull ember orange; nothing saturated red, nothing glows. Shapes, not colours, carry each state (the telegraph is
   cracks, steam and a shake; the ledge is flat with a pale lip). Per-pixel fillRects only (no sprite cache keys). No text. */
import {T,VW,VH} from './state.js';
import {B4} from './mascot.js';
import {ventBox} from './geysers.js';
import {EMBER,BEETLE,cinderLights} from './cinders.js';

const A={k:'#161210',d:'#2c2724',m:'#47403b',l:'#6b625a',h:'#958b80',rust:'#7a3f22',rustL:'#a0582e',emb:'#c8742e',embL:'#e3a15c',
  core:'#f6ead2',st:'#a9a39b',stL:'#d6d1c8',stD:'#6f6a64',und:'#a8927a'};
const bay=(x,y)=>(B4[(y&3)*4+(x&3)]+.5)/16;
const hash=(x,y)=>{let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296};
export const moltenLights=cinderLights;

export function drawMolten(ctx,S,R,e,ox,oy,t,reduce,flash){
  if(e.k==='vent')return vent(ctx,e,ox,oy,t,reduce,flash);
  if(e.k==='ember')return ember(ctx,e,ox,oy,t,reduce,flash);
  return beetle(ctx,e,ox,oy,t,reduce,flash);
}

/* ---------- the vent ---------- */
function vent(ctx,e,ox,oy,t,reduce,flash){
  const fy=(e.ty+1)*T-oy;let cx=e.tx*T+6-ox;
  if(cx<-24||cx>VW+24||fy<-8||fy-e.hgt>VH+8)return;
  const px=(x,y,c,w=1,h=1)=>{ctx.fillStyle=flash?'#fff':c;ctx.fillRect(x,y,w,h)};
  const tel=e.st===1,q=e.q;
  if(tel&&q>.55&&!reduce)cx+=(t>>1)&1?1:-1;   /* the last of the telegraph: the mound shakes */
  /* the eruption, behind the mound: a column of steam, a pale core, spray flecks, a cap that throws droplets */
  if(e.st===2){const b=ventBox(e);if(b){const y0=b.y-oy,tt=reduce?0:t;
    for(let y=y0;y<fy-2;y+=2){const r=(y-y0)>>1,w=8+((hash(r+(tt>>1),e.tx)*3)|0),j=reduce?0:((hash(r,tt>>2)*3)|0)-1;
      px(cx-(w>>1)+j,y,y-y0<4?A.stL:A.st,w,2);px(cx-2+j,y,A.stL,4,2);if(((r+(tt>>1))&3)===0)px(cx-1+j,y,A.core,2,2)}
    for(let k=0;k<b.h/6;k++){const y=y0+((k*11+tt*3)%Math.max(1,b.h)),x=cx-3+((k*5)%7);px(x,y,k&1?A.rustL:A.emb)}
    for(let i=-7;i<7;i++)for(let j=-3;j<=1;j++){const x=cx+i,y=y0+j;if(i*i/49+j*j/9>1||bay(x,y)<.25+(j<-1?.3:0))continue;px(x,y,(i+j+(tt>>2))&3?A.st:A.stL)}
    if(b.h>T)for(let k=0;k<4;k++){const a=((tt+k*7)%20)/20,s=k<2?-1:1;px(Math.round(cx+s*(3+a*6+(k&1)*2)),Math.round(y0-2-a*(1-a)*28+a*a*10),k&1?A.emb:A.rustL)}}}
  /* the mound: a low cone of ash rock round a fissure, always cracked; the telegraph opens the fissure and its cracks */
  const fis=tel?(q<.35?A.rust:q<.7?A.rustL:A.emb):A.k;
  px(cx-2,fy-4,A.k,4,1);
  px(cx-4,fy-3,A.k,1,1);px(cx-3,fy-3,A.l,2,1);px(cx+1,fy-3,A.m,2,1);px(cx+3,fy-3,A.k,1,1);
  px(cx-5,fy-2,A.k,1,1);px(cx-4,fy-2,A.l,2,1);px(cx-2,fy-2,A.m,1,1);px(cx+1,fy-2,A.m,3,1);px(cx+4,fy-2,A.k,1,1);
  px(cx-6,fy-1,A.k,1,1);px(cx-5,fy-1,A.m,4,1);px(cx+1,fy-1,A.d,4,1);px(cx+5,fy-1,A.k,1,1);
  px(cx-1,fy-4,fis,2,1);px(cx-1,fy-3,fis,2,1);px(cx-1,fy-2,fis,2,1);px(cx-1,fy-1,tel&&q>.35?fis:A.k,2,1);
  px(cx-3,fy-2,A.k);px(cx+2,fy-1,A.k);   /* its old cracks */
  if(tel){const L=1+Math.round(q*5);   /* fresh cracks run out over the mound and the floor, zigzag */
    for(let i=1;i<=L;i++){const z=(i*7+3)&1;px(cx-1-i-1,fy-1+z-(i<3?1:0),i<L?A.k:fis);px(cx+i+1,fy-1+(1-z)-(i<3?1:0),i<L?A.k:fis)}
    /* steam: more puffs, rising higher and faster, as the eruption nears */
    const n=1+Math.floor(q*4),P=Math.round(26-q*12);
    for(let k=0;k<n;k++){const a=((t+k*9)%P)/P,y=Math.round(fy-5-a*(8+q*20)),x=Math.round(cx-1+Math.sin(k*2.1+a*3)*(1+a*2));if(bay(x,y)<a*.85)continue;
      px(x,y,a<.4?A.stL:A.st,a<.5?2:1,a<.5?2:1)}}
  else if(e.st===3){const a=q,y=Math.round(fy-5-a*12),x=cx-1+Math.round(Math.sin(a*4)*1.5);if(bay(x,y)>=a)px(x,y,A.stD,2,1)}   /* a dormant puff */
}

/* ---------- the ember sprite ---------- */
const HW=[0,1,1,2,2,3,3,4,4,4,3,2];
function ember(ctx,e,ox,oy,t,reduce,flash){
  const bx=Math.round(e.x)-ox,by=Math.round(e.y)-oy;if(bx<-24||bx>VW+24||by<-24||by>VH+24)return;
  const px=(x,y,c,w=1,h=1)=>{ctx.fillStyle=flash?'#fff':c;ctx.fillRect(x,y,w,h)},cx=bx+5;
  if(e.st===0){
    const f=reduce?0:(t>>3)%3,sway=[0,1,-1][f],blink=!reduce&&(t%211)<5;
    for(let j=0;j<12;j++){const hw=HW[j],s=j<5?Math.round(sway*(5-j)/5):0,y=by-2+j;if(!hw){px(cx-1+s,y,A.k);continue}
      for(let i=-hw;i<hw;i++){const a=Math.abs(i+.5);let c;
        if(i===-hw||i===hw-1||j===11)c=A.k;else if(a>hw-1.6)c=A.rustL;else if(j<5)c=A.emb;else if(a<hw-2.4&&j>=6&&j<=10)c=A.core;else c=A.emb;
        if(j===8&&(i===-2||i===1)&&!blink)c=A.k;   /* two dark eyes */
        px(cx+i+s,y,c)}}
    if(!reduce){const k=(t>>2)%9;if(k<5)px(cx+((t>>5)%3)-1,by-4-k,A.embL)}
    return;
  }
  /* smothered: a dull coal under rising smoke; it sparks before it relights */
  const cy=by+8;px(cx-2,cy,A.k,4,1);px(cx-2,cy+1,A.rust,4,1);px(cx-1,cy,A.d,2,1);
  for(let k=0;k<3;k++){const a=(((reduce?k*13:t*.5)+k*13)%40)/40,y=Math.round(cy-2-a*14),x=Math.round(cx-1+Math.sin(k*2+a*4)*2);if(bay(x,y)<a)continue;px(x,y,a<.5?A.st:A.stD,a<.4?2:1,a<.4?2:1)}
  if(e.t<EMBER.warn&&(reduce||(t>>2)&1)){px(cx-1,cy,A.emb);px(cx+1,cy-1,A.embL);if(e.t<EMBER.warn/2)px(cx,cy-3,A.emb)}
}

/* ---------- the slag beetle ---------- */
/* lying on a floor, head toward +x (its heading); turned to its face like a Mossback. b: underside, e: its eye */
const KB=['...kkkkkkk....','..khlllmmmkk..','.khllmmmmmmdk.','.klmmrmmmmrdkk','kmmrmmmmmrmdke','kddddddddddkkk','.kbbbbbbbbbbk.'];
const KL=['..k.k..k..k...','...k.k..k..k..'];
const KP={k:A.k,h:A.h,l:A.l,m:A.m,d:A.d,r:A.rust,b:A.rust,e:A.embL};
function beetle(ctx,e,ox,oy,t,reduce,flash){
  const bx=e.x-ox,by=e.y-oy;if(bx<-24||bx>VW+24||by<-24||by>VH+24)return;
  const px=(x,y,c,w=1,h=1)=>{ctx.fillStyle=flash?'#fff':c;ctx.fillRect(x,y,w,h)};
  if(e.wrap>0){   /* open: the shell a flat ledge (pale lip on top), its stunned body tucked under, sparks circling */
    const wob=e.wrap<BEETLE.wob,j=wob&&!reduce?((t>>1)&1?1:-1):0,x=Math.round(bx)+j,y=Math.round(by),w=e.w,h=e.h;
    px(x,y,A.h,w,1);px(x,y+1,A.l,w,1);for(let r=2;r<h-1;r++)px(x,y+r,A.m,w,1);px(x,y+h-1,A.k,w,1);px(x,y,A.k,1,h);px(x+w-1,y,A.k,1,h);
    for(let i=3;i<w-2;i+=4)px(x+i,y+2,A.rust,1,Math.max(1,h-3));
    if(wob)for(let i=2;i<w-2;i+=5)px(x+i+((t>>4)&1),y+1,A.k);   /* it starts to crack shut */
    const ux=e.gx?(e.gx>0?x+w-5:x):x+(w>>1)-2,uy=e.gx?y+h:e.gy<0?y-3:y-3;
    if(e.gx||e.gy<0){px(ux,uy,A.k,5,3);px(ux+1,uy,A.und,3,2)}
    if(!reduce||!wob)for(let n=0;n<2;n++){const a=(reduce?0:t*.12)+n*Math.PI,sx=Math.round(x+w/2+Math.cos(a)*4),sy=Math.round(y-3+Math.sin(a)*1.5);px(sx,sy,Math.sin(a)>0?A.stL:A.st)}
    return;
  }
  const W=14,H=8,cx=e.x+e.w/2-ox+(e.grace&&!reduce?((t>>1)&1?1:-1):0),cy=e.y+e.h/2-oy,mx=e.ax*e.dir,my=e.ay*e.dir;
  const rows=[...KB,KL[reduce?0:(Math.floor(Math.abs(e.u)/3)&1)]];
  for(let j=0;j<H;j++){const r=rows[j];for(let i=0;i<W;i++){const c=r[i];if(c==='.')continue;const u=i+.5-W/2,v=j+.5-H/2;
    px(Math.floor(cx+u*mx+v*e.gx),Math.floor(cy+u*my+v*e.gy),KP[c])}}
}
