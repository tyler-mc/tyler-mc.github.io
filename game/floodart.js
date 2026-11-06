/* Flood art, drawn in code: water (heightfield surface, depth dither, current streaks, droplets), the board (item, under
   his feet, HUD), the hermit crab and its shell, the clownfish and the lantern piranha, the chase's tide and its eel. Called
   from render.js. Fixed meanings: yellow = pickup (the board), red only inside the piranha's and the eel's mouths (danger);
   nothing here glows but the eel's pale lure. */
import {T,VW,VH,PIECES} from './state.js';
import {B4} from './mascot.js';
import {CW,isLiq,tideCol} from './liquid.js';
import {CHASES} from './rooms/index.js';
import {WITHER} from './chases.js';
import {CRAB,FISH} from './fish.js';
import {BDEMO} from './board.js';

const INK='#1A1716',YEL='#FFD94A',YEL2='#F6B92B';
const bay=(x,y)=>(B4[(y&3)*4+(x&3)]+.5)/16;
const hash=(x,y)=>{let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296};
function blit(ctx,rows,x,y,pal,flip){for(let j=0;j<rows.length;j++){const r=rows[j];for(let i=0;i<r.length;i++){const c=r[i];if(c==='.')continue;ctx.fillStyle=pal[c];ctx.fillRect(x+(flip?r.length-1-i:i),y+j,1,1)}}}

/* ---------- water ---------- */
const W={top:'#123e69',deep:'#0b2a4a',abyss:'#081d35',streak:'#2b6aa3',crest:'#8fd2ff',crestD:'#3f80b8',hi:'#d6f1ff',drop:'#bfe6ff'};
const surfOf=(S,tx,ty)=>S.liq&&S.liq.s.find(s=>s.ty===ty&&tx>=s.tx&&tx<s.tx+s.n*CW/T);
/* before the light pass (so the dark dithers it): bodies by depth, current streaks, and each surface's column line */
export function waterBody(ctx,S,R,ox,oy,t){
  const x0=Math.max(0,Math.floor(ox/T)),x1=Math.min(R.w-1,Math.floor((ox+VW)/T)),y0=Math.max(0,Math.floor(oy/T)),y1=Math.min(R.h-1,Math.floor((oy+VH)/T));
  for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){
    if(!isLiq(R.g[ty][tx]))continue;
    let d=0;while(d<3&&ty-d-1>=0&&isLiq(R.g[ty-d-1][tx]))d++;
    const x=tx*T-ox,y=ty*T-oy,top=d===0;
    if(top&&surfOf(S,tx,ty))continue;   /* drawn column by column below */
    ctx.fillStyle=d>=2?W.abyss:d?W.deep:W.top;ctx.fillRect(x,y,T,T);
    if(d===1){ctx.fillStyle=W.abyss;for(let j=0;j<T;j+=2)for(let i=(j>>1)&1;i<T;i+=4)if(bay(i,j)<j/T)ctx.fillRect(x+i,y+j,1,1)}
    if(top){ctx.fillStyle=W.crestD;for(let i=0;i<T;i++)ctx.fillRect(x+i,y+Math.round(1+Math.sin((tx*T+i)*.5+t*.08)),1,1)}   /* no sim (editor swatches) */
  }
  if(!S.liq)return;
  for(const s of S.liq.s){const by=(s.ty+1)*T-oy;if(by<0||s.ty*T-oy>VH)continue;
    for(let i=0;i<s.n;i++){const x=s.tx*T+i*CW-ox;if(x<-CW||x>VW)continue;const y=s.ty*T+Math.round(s.h[i])-oy;
      ctx.fillStyle=W.top;ctx.fillRect(x,y+1,CW,by-y-1)}}
  /* currents: short streaks drifting with the flow, two per tile at their own heights */
  for(const k in S.liq.flow){const f=S.liq.flow[k],tx=k%R.w,ty=(k/R.w)|0,x=tx*T-ox,y=ty*T-oy;if(x<-T||x>VW||y<-T||y>VH)continue;
    for(let n=0;n<2;n++){const hy=3+((hash(tx,ty*3+n)*7)|0),off=((hash(ty,tx+n*9)*T+t*f*.8)%T+T)%T;ctx.fillStyle=W.streak;
      for(let i=0;i<3;i++){const px=Math.floor(off+i*Math.sign(f));if(px>=0&&px<T)ctx.fillRect(x+px,y+hy,1,1)}}}
}
/* after the light pass: the surface line itself, so water reads in the dark (dim outside his light), and the droplets */
export function waterCrest(ctx,S,ox,oy,t,L,amb,reduce){
  if(!S.liq)return;
  for(const s of S.liq.s)for(let i=0;i<s.n;i++){const x=s.tx*T+i*CW-ox;if(x<-CW||x>=VW)continue;const h=s.h[i],y=s.ty*T+Math.round(h)-oy;if(y<0||y>=VH)continue;
    {const q=tideCol(S.liq,s.tx*T+i*CW);if(q&&q.top<s.ty*T)continue}   /* under a chase's tide: its line is the tide's */
    const lit=(L?L[y*VW+Math.max(0,Math.min(VW-1,x))]:1)+amb;
    ctx.fillStyle=lit>.55?W.crest:W.crestD;ctx.fillRect(x,y,CW,1);
    if(lit>.55&&((i+(t>>3))%9===0||h<-1.2)){ctx.fillStyle=W.hi;ctx.fillRect(x,y,1,1)}
    const v=s.v[i];if(!reduce&&v<-.7&&i%3===0){ctx.fillStyle=W.drop;ctx.fillRect(x,y-2-Math.round(-v*3),1,1);if(v<-1.4)ctx.fillRect(x+1,y-4-Math.round(-v*4),1,1)}}
}

/* over him (and the fish) once drawn: the water in front, a half-dither below the line, so a swimmer is in it, not on it */
export function waterFront(ctx,S,R,ox,oy,b){
  if(!S.liq)return;
  const x0=Math.floor(b.x)-2,x1=Math.ceil(b.x+b.w)+2;
  for(let x=x0;x<=x1;x+=1){const sx=x-ox;if(sx<0||sx>=VW)continue;
    for(const s of S.liq.s){if(x<s.tx*T||x>=s.tx*T+s.n*CW)continue;const top=s.ty*T+Math.round(s.h[Math.floor((x-s.tx*T)/CW)]);if(top>b.y+b.h+2||top+T*2<b.y)continue;
      for(let y=Math.max(top+1,Math.floor(b.y)-4);y<=Math.min(b.y+b.h+4,top+T*3);y++){const sy=y-oy;if(sy<0||sy>=VH||!isLiq(R.g[Math.floor(y/T)]?.[Math.floor(x/T)]??'#')&&y>top+2)continue;
        if((sx+sy)&1){ctx.fillStyle=y-top<3?W.crestD:W.top;ctx.fillRect(sx,sy,1,1)}}
      ctx.fillStyle=W.crest;ctx.fillRect(sx,top-oy,1,1)}}
}

/* ---------- the board ---------- */
const BP={k:INK,Y:YEL,y:YEL2,w:'#FFF6C8'};
const BOARD=['..kkkkkkkkkkkkkkkk..','.kYYYYYwwYYYYYYYYYk.','kYYYYYYwwYYYYYYYYYyk','.kyyyyyyyyyyyyyyyyk.','..kkkkkkkkkkkkkkkk..'];
const BOARD_UP=['..kk..','.kYYk.','kYwYyk','kYwYyk','kYYYyk','kYYYyk','kYwYyk','kYYYyk','kYYYyk','.kYyk.','..kk..'];
const BOARD_HUD=['.kkkkkkk.','kYYwYYYyk','.kkkkkkk.'];
export function boardItem(ctx,x,y,t){const b=Math.round(Math.sin(t*.06)*1.5);blit(ctx,BOARD_UP,x+3,y+b,BP);if((t>>3)%5===0){ctx.fillStyle='#fff';ctx.fillRect(x+2+((t>>3)%3)*3,y-2+b,1,1)}}
export const boardHud=(ctx,x,y)=>blit(ctx,BOARD_HUD,x,y,BP);
/* under his feet while it is out: a dash leaves three speed lines behind him. Just picked up (board.js boardDemo, before
   its dash) it slides in from behind his heel over 12 frames and waits under him (reduced motion: it is just there) */
export function boardUnder(ctx,S,ox,oy,t,reduce){
  const p=S.p,demo=p.bd>0&&p.bd<BDEMO.go;if(!(p.bo||demo)||p.dead||p.hide)return;
  const k=demo&&!reduce?Math.max(0,1-p.bd/12):0,sl=-p.face*Math.round(16*k*k);
  const x=Math.round(p.x+9)-10-ox+sl,y=Math.round(p.y+p.h)-2-oy;blit(ctx,BOARD,x,y,BP,p.face<0);
  if(p.dt>0&&!reduce){ctx.fillStyle='#e8f6ff';for(let n=0;n<3;n++){const yy=Math.round(p.y)+5+n*6-oy,len=6+((t+n*3)%4)*2,bx=p.face>0?Math.round(p.x)-3-len-ox:Math.round(p.x+p.w)+3-ox;
    for(let i=0;i<len;i+=1)if(bay(bx+i,yy)<1-i/len*(p.face>0?-1:1)*.5)ctx.fillRect(bx+i,yy,1,1)}}
}

/* ---------- hermit crab ---------- */
const CR={k:INK,s:'#e8d5b0',S:'#b89a70',l:'#7a5a3a',b:'#3aa6a0',B:'#23736f',w:'#ffffff',o:'#2a1d14'};
/* the spiral shell: a dome, the whorl drawn as an Archimedean line; open: the dark mouth at its front */
function shell(ctx,cx,by,face,open,k){
  for(let j=-9;j<=0;j++)for(let i=-7;i<=7;i++){const r=Math.hypot(i/7,(j+.5)/9.5);if(r>1)continue;
    const a=Math.atan2(j,i*face),rr=Math.hypot(i,j*.8),sp=((rr-a*1.1)%3.4+3.4)%3.4;
    let c=r>.86?CR.k:sp<.9?CR.l:(i*face<0&&j<-5)?CR.s:i*face>3||j>-2?CR.S:CR.s;
    if(open&&i*face>2&&j>-4&&r<.86)c=CR.o;
    ctx.fillStyle=k<0?'#fff':c;ctx.fillRect(cx+i,by+j,1,1)}
}
export function drawCrab(ctx,e,bx,by,t,k,reduce){
  const cx=bx+7,b=by+e.h-1,face=e.dir,fl=k<0;
  if(e.wrap>0){   /* withdrawn: the shell alone; its last second it rocks and the eyes peek out */
    const wob=e.wrap<CRAB.wob&&!reduce?((t>>2)&1?1:0):0;shell(ctx,cx+wob,b,face,1,fl?-1:1);
    if(e.wrap<CRAB.wob&&(t>>3)&1){ctx.fillStyle='#fff';ctx.fillRect(cx+face*4+wob,b-4,1,1);ctx.fillStyle=INK;ctx.fillRect(cx+face*5+wob,b-4,1,1)}
    return;
  }
  const step=(Math.floor(e.x/2)&1)&&!e.grace;
  ctx.fillStyle=fl?'#fff':INK;for(let n=0;n<3;n++){const lx=cx+face*(1+n*2)-(face<0?0:0);ctx.fillRect(lx,b-(step^(n&1)?1:0),1,2)}
  shell(ctx,cx-face*2,b-2,face,0,fl?-1:1);
  /* body, eye stalks and the two claws out front */
  const fx=cx+face*5;ctx.fillStyle=fl?'#fff':CR.b;ctx.fillRect(fx-1,b-5,3,4);ctx.fillStyle=fl?'#fff':CR.B;ctx.fillRect(fx-1,b-2,3,1);
  ctx.fillStyle=fl?'#fff':CR.B;ctx.fillRect(fx,b-8,1,3);ctx.fillRect(fx+face*2,b-8,1,3);ctx.fillStyle='#fff';ctx.fillRect(fx,b-9,1,1);ctx.fillRect(fx+face*2,b-9,1,1);
  const pinch=e.cd>30;ctx.fillStyle=fl?'#fff':CR.b;for(const [dx,dy] of [[3,-4],[4,-2]]){const x=fx+face*dx,y=b+dy;ctx.fillRect(x-1,y-1,3,2);ctx.fillStyle=fl?'#fff':INK;ctx.fillRect(x+face*(pinch?2:1),y-1,1,1);ctx.fillStyle=fl?'#fff':CR.b}
}

/* ---------- clownfish and lantern piranha ---------- */
/* knocks darken it (n 0, 1, 2) and puff it up; the piranha is near-black with a pale lure, a giant mouth and teeth */
const CF=[{o:'#ff8a2a',d:'#c45d16',w:'#fff4e6'},{o:'#cf5f1e',d:'#8f3d12',w:'#d6c6b4'},{o:'#8c3a1c',d:'#5a2412',w:'#a39282'}];
const PIR={b:'#1f2638',d:'#121726',f:'#2f3a55',t:'#f2f2f2',m:'#7A0A12',M:'#B3121B',lure:'#bff4ff',stalk:'#4b5a7a'};
function ellipse(ctx,cx,cy,rx,ry,fn){for(let j=-Math.ceil(ry);j<=Math.ceil(ry);j++)for(let i=-Math.ceil(rx);i<=Math.ceil(rx);i++){const q=(i*i)/(rx*rx)+(j*j)/(ry*ry);if(q<=1){const c=fn(i,j,q);if(c){ctx.fillStyle=c;ctx.fillRect(cx+i,cy+j,1,1)}}}}
export function drawFish(ctx,e,bx,by,t,k,reduce){
  const cx=bx+6,cy=by+5,f=e.dir,fl=k<0;
  if(e.m===0){
    const n=Math.min(2,e.n),C=CF[n],rx=6+n*1.5,ry=3.5+n*1.6,sw=reduce?0:Math.round(Math.sin(t*.25+e.x*.1));
    /* tail, then body with two white bands, an outline, spines once it is at its puffiest */
    for(let j=-2;j<=2;j++)for(let i=0;i<3-Math.abs(j)+1;i++){ctx.fillStyle=fl?'#fff':Math.abs(j)===2||i===3-Math.abs(j)?INK:C.o;ctx.fillRect(cx-f*(rx+1+i),cy+j+sw,1,1)}
    ellipse(ctx,cx,cy,rx,ry,(i,j,q)=>fl?'#fff':q>.72?INK:Math.abs(i*f+rx*.15)<1.2||Math.abs(i*f-rx*.55)<1?C.w:j>ry*.4?C.d:C.o);
    if(n>=2)for(const [i,j] of [[-2,-1],[1,-1],[3,0],[-2,1],[1,1]]){ctx.fillStyle=fl?'#fff':INK;ctx.fillRect(cx+Math.round(i*rx/3),cy+j*(Math.ceil(ry)+1),1,1)}
    const ex=cx+f*Math.round(rx*.6);ctx.fillStyle='#fff';ctx.fillRect(ex,cy-1,2,2);ctx.fillStyle=INK;ctx.fillRect(ex+(f>0?1:0),cy-1,1,1);
    ctx.fillStyle=fl?'#fff':INK;ctx.fillRect(cx+f*Math.round(rx)-(f>0?1:0),cy+1,1,1);   /* a small mouth */
    return;
  }
  /* the piranha: swelling during the tell, mouth gaping as it closes in, snapping on the lunge */
  const g=e.m===1?1-e.t/FISH.tell:1,rx=7+g*5,ry=5+g*4,open=e.m===3?((e.t>>2)&1?.9:.15):e.m===2?.75:g*.5,sh=e.m===1&&!reduce?((t>>1)&1):0;
  const mx=cx+f*rx*.35,top=-(ry*open);
  ellipse(ctx,cx+sh,cy,rx,ry,(i,j,q)=>{
    const a=i*f-rx*.1,inMouth=a>0&&j>top*(a/rx)-1&&j<ry*open*(a/rx)*.9+1;
    if(fl)return '#fff';
    if(inMouth&&q<.97)return a>rx*.75?null:(j>-1&&j<2?PIR.M:PIR.m);
    if(inMouth&&q>=.97)return null;
    return q>.8?INK:j>ry*.3?PIR.d:(i*f<-rx*.3&&j<0)?PIR.f:PIR.b});
  /* teeth along both jaws */
  if(!fl)for(let a=2;a<rx*.8;a+=2){const x=cx+sh+f*Math.round(a+rx*.1),ju=Math.round(top*((a+rx*.1)/rx)),jl=Math.round(ry*open*((a+rx*.1)/rx)*.9);ctx.fillStyle=PIR.t;ctx.fillRect(x,cy+ju,1,2);ctx.fillRect(x,cy+jl-1,1,2)}
  /* tail fin, eye (white rim, tiny pupil) and the lure on its stalk */
  for(let j=-3;j<=3;j++){ctx.fillStyle=fl?'#fff':Math.abs(j)===3?INK:PIR.f;ctx.fillRect(cx+sh-f*(rx+1),cy+j,1,1);if(Math.abs(j)<2)ctx.fillRect(cx+sh-f*(rx+2),cy+j*2,1,1)}
  const ex=cx+sh+f*Math.round(rx*.2),ey=cy-Math.round(ry*.55);ctx.fillStyle='#fff';ctx.fillRect(ex-1,ey-1,3,3);ctx.fillStyle=INK;ctx.fillRect(ex+(f>0?1:-1),ey,1,1);
  const lx=cx+sh+f*Math.round(rx*.9),ly=cy-Math.round(ry+4)+(reduce?0:Math.round(Math.sin(t*.2))),sx=cx+sh+f*Math.round(rx*.15),sy=cy-Math.round(ry);
  ctx.fillStyle=PIR.stalk;for(let s=0;s<=6;s++){const u=s/6;ctx.fillRect(Math.round(sx+(lx-sx)*u),Math.round(sy+(ly-sy)*u-Math.sin(u*Math.PI)*2),1,1)}
  ctx.fillStyle=PIR.lure;ctx.fillRect(lx-1,ly-1,2,2);
}

/* ---------- the chase's tide and the eel (game/tide.js, game/chases.js) ----------
   The tide is water like a pool's: the same depth colours under the light pass, its line over it (so it reads in the dark),
   foam where its edge runs. The eel draws after the light, like the thorns, so it always reads: a near-black head with a
   lighter rim, a giant red mouth and white teeth at the front (the snout is the line that glitches him out), its neck down
   into the water (it strikes up to tide.reach px over the line), the humps of its back trailing behind. Its pale cyan lure
   is the one light it gives (lureAt; render.js adds it to the light pass). Asleep in its lair before the chase, only the
   lure glints. Reduced motion: no bob, no gape, no foam flicker. */
const EEL={b:'#141a29',d:'#0b0f19',f:'#27324d',rim:'#4f5f80',eye:'#e8f6ff',m:'#7A0A12',M:'#B3121B',t:'#f2f2f2',lure:'#bff4ff',stalk:'#4b5a7a'};
export function tideBody(ctx,S,R,ox,oy){
  const D=S.liq&&S.liq.tide;if(!D)return;
  const band=(x,a,b,c)=>{if(b>a){ctx.fillStyle=c;ctx.fillRect(x,a,CW,b-a)}};
  for(let i=Math.max(0,Math.floor(ox/CW));i<=Math.min(D.n-1,Math.ceil((ox+VW)/CW));i++){const top=D.top[i];if(top<0)continue;
    const x=i*CW-ox,y=Math.round(top+D.h[i])-oy,b=Math.min(VH,D.bot[i]-oy),y0=Math.max(0,y+1);
    band(x,y0,Math.min(b,y+12),W.top);band(x,Math.max(y0,y+12),Math.min(b,y+24),W.deep);band(x,Math.max(y0,y+24),b,W.abyss)}
}
export function tideCrest(ctx,S,ox,oy,t,L,amb,reduce){
  const D=S.liq&&S.liq.tide;if(!D)return;
  for(let i=Math.max(0,Math.floor(ox/CW));i<=Math.min(D.n-1,Math.ceil((ox+VW)/CW));i++){const top=D.top[i];if(top<0)continue;
    const x=i*CW-ox,y=Math.round(top+D.h[i])-oy;if(y<1||y>=VH||x<0||x>=VW)continue;
    const lit=(L?L[y*VW+x]:1)+amb,edge=(i>0&&D.top[i-1]<0)||(i<D.n-1&&D.top[i+1]<0);
    ctx.fillStyle=lit>.55?W.crest:W.crestD;ctx.fillRect(x,y,CW,1);
    if(edge){ctx.fillStyle=W.hi;ctx.fillRect(x,y-1-(reduce?0:((t>>2)+i)&1),CW,1)}   /* foam where it runs or laps */
    else if(lit>.55&&(i+(t>>3))%9===0){ctx.fillStyle=W.hi;ctx.fillRect(x,y,1,1)}}
}
/* over him: the tide in front of his feet (waterFront's dither) */
export function tideFront(ctx,S,ox,oy,b){
  const D=S.liq&&S.liq.tide;if(!D)return;
  for(let x=Math.floor(b.x)-2;x<=Math.ceil(b.x+b.w)+2;x++){const i=Math.floor(x/CW),sx=x-ox;if(i<0||i>=D.n||D.top[i]<0||sx<0||sx>=VW)continue;
    const top=Math.round(D.top[i]+D.h[i]);if(top>b.y+b.h+2||top<b.y-4)continue;
    for(let y=top+1;y<=Math.min(b.y+b.h+2,D.bot[i]-1);y++){const sy=y-oy;if(sy>=0&&sy<VH&&(sx+sy)&1){ctx.fillStyle=y-top<3?W.crestD:W.top;ctx.fillRect(sx,sy,1,1)}}
    ctx.fillStyle=W.crest;ctx.fillRect(sx,top-oy,1,1)}
}
/* where the lure hangs (room px) and its light's radius, or null */
export function lureAt(S,R,t,reduce){
  const c=S.chase,C=c?CHASES[c.id]:CHASES[R.biome];if(!C||!C.tide)return null;
  const b=-(C.dir||1),ax=R.at[0]*T,ay=R.at[1]*T,bob=reduce?0:Math.round(Math.sin(t*.2)*1.5);
  if(!c){const k=PIECES.indexOf(R.biome);if(k<0||S.pieces[k]||!R.pedestals.length)return null;   /* asleep in its lair */
    const x=C.from*T-ax,y=C.tide.lv[0][1]-ay+30;return x<0||x>=R.w*T?null:{x:x-b*6,y:y+Math.round(bob*.7),r:16,sleep:1}}
  const g=eelPose(c,C),sx=c.x-ax;return {x:sx-b*10,y:g.top-ay+6+bob,r:32};
}
/* the head's top (world px y), from the level, the strike reach, the rise out of the lair (the beat) and the sinking once outrun */
function eelPose(c,C){const D=C.tide,rise=c.on&&c.t<0?Math.min(1,-c.t/C.beat):0,wk=c.on?0:Math.min(1,c.w/WITHER);return {top:c.y-D.reach+Math.round((rise+wk)*(D.reach+24)),wk}}
export function drawEel(ctx,S,R,ox,oy,t,reduce,flash){
  const lu=lureAt(S,R,t,reduce);if(!lu)return;
  const c=S.chase,C=c?CHASES[c.id]:CHASES[R.biome],f=C.dir||1,b=-f,ax=R.at[0]*T,ay=R.at[1]*T,tt=reduce?0:t;
  const lure=()=>{const x=Math.round(lu.x)-ox,y=Math.round(lu.y)-oy;ctx.fillStyle=flash?'#fff':EEL.lure;ctx.fillRect(x-1,y-1,3,3);ctx.fillStyle='#fff';ctx.fillRect(x,y,1,1)};
  if(lu.sleep){   /* a dark shape deep in the lair, the lure glinting before it */
    const cx=Math.round(lu.x+b*16)-ox,cy=Math.round(lu.y+4)-oy;
    for(let j=-5;j<=5;j++)for(let i=-14;i<=14;i++)if((i*i)/196+(j*j)/25<=1&&bay(cx+i,cy+j)<.45){ctx.fillStyle=EEL.d;ctx.fillRect(cx+i,cy+j,1,1)}
    if(!reduce&&(t%150)<6)return;lure();return}
  const g=eelPose(c,C),sx=Math.round(c.x-ax)-ox,top=Math.round(g.top-ay)-oy,wy=Math.round(c.y-ay)-oy,wk=g.wk;
  if(sx+b*140<-20&&sx<-20||sx+b*140>VW+20&&sx>VW+20)return;
  const put=(x,y,col)=>{if(x<0||y<0||x>=VW||y>=VH||(wk&&bay(x+3,y+1)<wk))return;ctx.fillStyle=flash?'#fff':col;ctx.fillRect(x,y,1,1)};
  /* the humps of its back behind it, rising out of the water */
  for(let k=2;k>=0;k--){const u=48+k*30,w=12-k*2,h=Math.round((20-k*6)*(1+(reduce?0:.15*Math.sin(tt*.06+k*1.7)))*(1-wk)),cx=sx+b*u;
    for(let j=-h;j<=1;j++)for(let i=-w;i<=w;i++){const q=(i*i)/(w*w)+(j*j)/Math.max(1,h*h);if(q>1)continue;put(cx+i,wy+j,q>.7&&j<0?EEL.rim:j>-3?EEL.d:EEL.b)}}
  /* the neck, from under the head down into the water; a paler throat at the front, a row of fin spines at the back */
  for(let y=top+16;y<=wy+3;y++){const k=y-top,wav=reduce?0:Math.round(1.5*Math.sin(k*.09+tt*.05)),x0=6+wav,x1=31+wav;
    for(let u=x0;u<=x1;u++)put(sx+b*u,y,u===x0?EEL.rim:u<x0+4?EEL.f:u>x1-2?EEL.d:EEL.b);
    if((k>>2)%2===0&&y<wy-2)put(sx+b*(x1+1+((k>>1)&1)),y,EEL.f)}
  /* the head: lower jaw gaping (red inside, white teeth), an eye with a white rim, the rim of its brow */
  const rx=19,ry=12,hx=sx+b*19,hy=top+13,o=reduce?.5:.45+.25*Math.sin(tt*.07);
  for(let j=-ry;j<=ry;j++)for(let i=-rx;i<=rx;i++){const q=(i*i)/(rx*rx)+(j*j)/(ry*ry);if(q>1)continue;
    const a=i*f+rx*.1,mouth=a>0&&j>-o*ry*(a/rx)*.6&&j<o*ry*(a/rx)*1.1+1;
    if(mouth){if(q<.93&&a<rx*.92)put(hx+i,hy+j,Math.abs(j-1)<2?EEL.M:EEL.m);continue}
    put(hx+i,hy+j,q>.8?(j<0?EEL.rim:EEL.d):j>ry*.4?EEL.f:EEL.b)}
  for(let a=3;a<rx*.85;a+=3){const x=hx+f*Math.round(a-rx*.1),ju=Math.round(-o*ry*(a/rx)*.6),jl=Math.round(o*ry*(a/rx)*1.1);put(x,hy+ju,EEL.t);put(x,hy+ju+1,EEL.t);put(x,hy+jl,EEL.t);put(x,hy+jl-1,EEL.t)}
  const ex=hx-f*3,ey=hy-6;for(const [i,j] of [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]])put(ex+i,ey+j,EEL.eye);put(ex,ey,'#1A1716');
  /* the lure on its stalk, arching forward from the brow */
  const lx=Math.round(lu.x)-ox,ly=Math.round(lu.y)-oy,bx=hx+b*4,by=top+1;
  for(let s=0;s<=8;s++){const u=s/8;put(Math.round(bx+(lx-bx)*u),Math.round(by+(ly-by)*u-Math.sin(u*Math.PI)*6),EEL.stalk)}
  if(!wk)lure();
}
