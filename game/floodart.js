/* Flood art, drawn in code: water (heightfield surface, depth dither, current streaks, droplets), the board (item, under
   his feet, HUD), the hermit crab and its shell, the clownfish and the lantern piranha, the chase's tide and its eel. Called
   from render.js. Fixed meanings: yellow = pickup (the board), red only inside the piranha's and the eel's mouths (danger);
   nothing here glows (the eel and the piranha read by their shapes; the piranha's lure is pale paint, not a light). */
import {T,VW,VH,PIECES} from './state.js';
import {B4} from './mascot.js';
import {CW,isLiq,tideCol} from './liquid.js';
import {CHASES,ROOMS} from './rooms/index.js';
import {WITHER,EEL as EEL_T,surgeAt,reachOf} from './chases.js';
import {leadX} from './tide.js';
import {CRAB,FISH} from './fish.js';
import {BDEMO,BURN} from './board.js';

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
    if(R.g[ty][tx]!=='~')continue;   /* water only: lava is game/lavaart.js's */
    let d=0;while(d<3&&ty-d-1>=0&&R.g[ty-d-1][tx]==='~')d++;
    const x=tx*T-ox,y=ty*T-oy,top=d===0;
    if(top&&surfOf(S,tx,ty))continue;   /* drawn column by column below */
    ctx.fillStyle=d>=2?W.abyss:d?W.deep:W.top;ctx.fillRect(x,y,T,T);
    if(d===1){ctx.fillStyle=W.abyss;for(let j=0;j<T;j+=2)for(let i=(j>>1)&1;i<T;i+=4)if(bay(i,j)<j/T)ctx.fillRect(x+i,y+j,1,1)}
    if(top){ctx.fillStyle=W.crestD;for(let i=0;i<T;i++)ctx.fillRect(x+i,y+Math.round(1+Math.sin((tx*T+i)*.5+t*.08)),1,1)}   /* no sim (editor swatches) */
  }
  if(!S.liq)return;
  for(const s of S.liq.s){const by=(s.ty+1)*T-oy;if(s.lava||by<0||s.ty*T-oy>VH)continue;
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
  for(const s of S.liq.s)if(!s.lava)for(let i=0;i<s.n;i++){const x=s.tx*T+i*CW-ox;if(x<-CW||x>=VW)continue;const h=s.h[i],y=s.ty*T+Math.round(h)-oy;if(y<0||y>=VH)continue;
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
    for(const s of S.liq.s){if(s.lava||x<s.tx*T||x>=s.tx*T+s.n*CW)continue;const top=s.ty*T+Math.round(s.h[Math.floor((x-s.tx*T)/CW)]);if(top>b.y+b.h+2||top+T*2<b.y)continue;
      for(let y=Math.max(top+1,Math.floor(b.y)-4);y<=Math.min(b.y+b.h+4,top+T*3);y++){const sy=y-oy;if(sy<0||sy>=VH||!isLiq(R.g[Math.floor(y/T)]?.[Math.floor(x/T)]??'#')&&y>top+2)continue;
        if((sx+sy)&1){ctx.fillStyle=y-top<3?W.crestD:W.top;ctx.fillRect(sx,sy,1,1)}}
      ctx.fillStyle=W.crest;ctx.fillRect(sx,top-oy,1,1)}}
}

/* ---------- the board ---------- */
const BP={k:INK,Y:YEL,y:YEL2,w:'#FFF6C8'};
/* heat-forged (Molten): the same board in dark iron with an ember edge (no glow); burnt: black, then gone */
const BPF={k:'#5a1c0c',Y:'#3a2e2a',y:'#241a17',w:'#ff8a3a'},BPB={k:'#000',Y:'#161210',y:'#0b0908',w:'#2c1a12'};
const BOARD=['..kkkkkkkkkkkkkkkk..','.kYYYYYwwYYYYYYYYYk.','kYYYYYYwwYYYYYYYYYyk','.kyyyyyyyyyyyyyyyyk.','..kkkkkkkkkkkkkkkk..'];
const BOARD_UP=['..kk..','.kYYk.','kYwYyk','kYwYyk','kYYYyk','kYYYyk','kYwYyk','kYYYyk','kYYYyk','.kYyk.','..kk..'];
const BOARD_HUD=['.kkkkkkk.','kYYwYYYyk','.kkkkkkk.'];
export function boardItem(ctx,x,y,t,forged){const b=Math.round(Math.sin(t*.06)*1.5);blit(ctx,BOARD_UP,x+3,y+b,forged?BPF:BP);if((t>>3)%5===0){ctx.fillStyle='#fff';ctx.fillRect(x+2+((t>>3)%3)*3,y-2+b,1,1)}}
export const boardHud=(ctx,x,y,forged)=>blit(ctx,BOARD_HUD,x,y,forged?BPF:BP);
/* under his feet while it is out: a dash leaves three speed lines behind him. Just picked up (board.js boardDemo, before
   its dash) it slides in from behind his heel over 12 frames and waits under him (reduced motion: it is just there) */
export function boardUnder(ctx,S,ox,oy,t,reduce){
  const p=S.p,demo=p.bd>0&&p.bd<BDEMO.go;
  if(p.burn>0&&!p.dead&&!p.hide){   /* burnt on lava (board.js): black, sinking under him, crumbling away */
    const x=Math.round(p.x+9)-10-ox,y=Math.round(p.y+p.h)-2-oy,u=1-p.burn/BURN.hold,PB=BPB;
    for(let j=0;j<BOARD.length;j++)for(let i=0;i<BOARD[j].length;i++){const c=BOARD[j][p.face<0?BOARD[j].length-1-i:i];if(c==='.'||bay(x+i,y+j)<u*.9)continue;ctx.fillStyle=PB[c];ctx.fillRect(x+i,y+j+Math.round(u*2),1,1)}
    return}
  if(!(p.bo||demo)||p.dead||p.hide)return;
  const k=demo&&!reduce?Math.max(0,1-p.bd/12):0,sl=-p.face*Math.round(16*k*k);
  const x=Math.round(p.x+9)-10-ox+sl,y=Math.round(p.y+p.h)-2-oy;blit(ctx,BOARD,x,y,S.items.forged&&S.items.board?BPF:BP,p.face<0);
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
   The tide is water like a pool's, inset where it runs: the same depth colours under the light pass, dithered darker
   toward its floor, with a current dragging west through it; its line over the light (so it reads in the dark), foam
   riding it, a churn round the eel, and at its leading edge a breaking bore: a foam lip over the level, foam down its
   face, spray thrown ahead and bits of debris tumbling in it. The ripples are the sim's (tide.js stirTide); spray,
   foam and debris are drawn from the clock only, so nothing here is state.
   The eel draws after the light, like the thorns, and gives none: it reads by its shape and by his light on its belly. A
   rearing neck with a pale scaled belly toward him and a finned back, a long head with a huge hinged jaw (red only inside
   the mouth, white needle teeth), a pale slit eye, gill slits; behind it a segmented back that undulates in humps
   through the water with a dorsal ridge, under the water a dithered shadow. Honest to the hit (chases.js): its head's
   top is exactly reachOf() over the water, nothing is drawn above it, and its snout is drawn 0..4 px behind S.chase.x,
   so it always touches him where it kills him and nowhere it does not. Its surge (chases.js EEL, from the chase clock):
   cruising jaw half open, then it rears back with the jaw gaping (the telegraph), then the snap: snout to the line, jaw
   shut, spray. Asleep in its lair: a coiled shadow under the water, an eye that opens now and then, bubbles.
   Cost: the head is one cached sprite per jaw opening (lazily built), the body is horizontal and vertical runs, about
   1-2k fillRect a frame up close. Reduced motion: no surge, sway, spray or flicker. */
const EEL={ink:'#06080d',dk:'#0d121c',b:'#1b2332',m:'#273247',rim:'#55688a',rimL:'#8197b8',bel:'#5f6858',belL:'#868e7a',belD:'#2c3240',
  fin:'#22304a',finR:'#4f6283',eye:'#e4ead2',gum:'#9c1c26',mo:'#6a0c16',deep:'#33050b',t:'#efeadb',tD:'#a59f8c',sh:'#03050a'};
const FOAM={hi:'#e8f7ff',lo:'#9fcbe8',dim:'#4f86b4',deb:'#5a4630',shell:'#c9b79a'};
/* a 50% checker of colour c, as a pattern (anchored to the canvas, so dithers stay put on screen); one per context */
const PATS=new WeakMap();
function pat(ctx,c){let m=PATS.get(ctx);if(!m)PATS.set(ctx,m={});if(m[c])return m[c];
  const k=document.createElement('canvas');k.width=k.height=2;const x=k.getContext('2d');x.fillStyle=c;x.fillRect(0,0,1,1);x.fillRect(1,1,1,1);if(c===EEL.sh)x.fillRect(1,0,1,1);return m[c]=ctx.createPattern(k,'repeat')}   /* the eel's shadow is 3/4 dense, so it reads in the dark water */
const ease=k=>k*k*(3-2*k);
export function tideBody(ctx,S,R,ox,oy){
  const D=S.liq&&S.liq.tide;if(!D)return;const t=S.t;
  const band=(x,a,b,c)=>{if(b>a){ctx.fillStyle=c;ctx.fillRect(x,a,CW,b-a)}};
  for(let i=Math.max(0,Math.floor(ox/CW));i<=Math.min(D.n-1,Math.ceil((ox+VW)/CW));i++){const top=D.top[i];if(top<0)continue;
    const x=i*CW-ox,y=Math.round(top+D.h[i])-oy,b=Math.min(VH,D.bot[i]-oy),y0=Math.max(0,y+1),cl=(a,c)=>Math.max(y0,Math.min(b,y+a));
    /* depth: the top water, a dithered step to the deep, another to the abyss at its floor */
    band(x,y0,cl(9),W.top);band(x,cl(9),cl(13),W.top);band(x,cl(13),cl(22),W.deep);band(x,cl(22),b,W.abyss);
    ctx.fillStyle=pat(ctx,W.deep);ctx.fillRect(x,cl(9),CW,cl(13)-cl(9));ctx.fillStyle=pat(ctx,W.abyss);ctx.fillRect(x,cl(18),CW,cl(22)-cl(18));
  }
  /* the current it drags west: short streaks at hashed depths in its top water, per 12 px of it */
  for(let i=Math.max(0,Math.floor(ox/T)*6);i<=Math.min(D.n-1,Math.ceil((ox+VW)/CW));i+=6){if(D.top[i]<0)continue;
    const top=Math.round(D.top[i]+D.h[i]),dep=D.bot[i]-top;
    for(let n=0;n<2;n++){const hy=3+((hash(i,n*5)*Math.min(18,dep-4))|0);if(hy>=dep-2)continue;const off=((hash(n,i)*T-t*1.3)%T+T)%T,y=top+hy-oy;
      ctx.fillStyle=W.streak;ctx.fillRect(i*CW+Math.floor(off)-ox,y,Math.min(3,T-Math.floor(off)),1)}}
}
export function tideCrest(ctx,S,ox,oy,t,L,amb,reduce){
  const D=S.liq&&S.liq.tide;if(!D)return;
  const c=S.chase,C=c&&CHASES[c.id],R=ROOMS[S.room],rx=R?R.at[0]*T:0,b=C?-(C.dir||1):1;
  const sn=c&&C?c.x-rx:-1e9,lead=c&&C&&C.tide?leadX(c,C)-rx:-1e9,edge=C&&C.tide?C.tide.edge:24;
  const tt=reduce?0:t;
  for(let i=Math.max(0,Math.floor(ox/CW));i<=Math.min(D.n-1,Math.ceil((ox+VW)/CW));i++){const top=D.top[i];if(top<0)continue;
    const wx=i*CW,x=wx-ox,y=Math.round(top+D.h[i])-oy;if(y<1||y>=VH||x<0||x>=VW)continue;
    const lit=(L?L[y*VW+x]:1)+amb,on=lit>.55,end=(i>0&&D.top[i-1]<0)||(i<D.n-1&&D.top[i+1]<0);
    const u=(wx-lead)*b,v=(wx-sn)*b;   /* u: px behind the bore's front; v: px behind the eel's snout */
    ctx.fillStyle=on?W.crest:W.crestD;ctx.fillRect(x,y,CW,1);
    const fo=on?FOAM.hi:FOAM.dim,fl=on?FOAM.lo:W.crestD;
    if(u>=0&&u<edge+14){   /* the bore: foam thick on its face, a lip standing over the level behind it */
      const k=u<edge?1:1-(u-edge)/12,v2=u-edge+5,hl=v2>=0&&v2<19?Math.round((v2<5?8*v2/5:8*(1-(v2-5)/14))+(reduce?0:hash(i,tt>>2)*1.5)):0;   /* the lip: steep in front, long behind */
      if(hl>0){ctx.fillStyle=on?W.top:W.deep;ctx.fillRect(x,y-hl+1,CW,hl);ctx.fillStyle=on?W.crest:W.crestD;ctx.fillRect(x,y-hl,CW,1)}
      if(v2<9){ctx.fillStyle=fo;ctx.fillRect(x,y-hl-(v2<5?1:0),CW,v2<5?3:1)}   /* foam capping its front */
      if(v2>=0&&v2<3&&!reduce){ctx.fillStyle=fl;ctx.fillRect(x-b*(3-v2)*CW,y-hl+2+v2,CW,2)}   /* the curl tumbling over in front */
      {const h=Math.min(Math.round(2+3*k),D.bot[i]-oy-y-1);if(h>0){ctx.fillStyle=pat(ctx,fo);ctx.fillRect(x,y+1,CW,h)}}
      if(u<edge&&!reduce&&hash(i>>1,(tt>>2)+i)<.5){const h=Math.min(Math.round(4+6*hash(i,tt>>3)),D.bot[i]-oy-y-4);if(h>0){ctx.fillStyle=pat(ctx,fl);ctx.fillRect(x,y+3,CW,h)}}   /* foam pouring down the face */
      continue}
    if(end){ctx.fillStyle=W.hi;ctx.fillRect(x,y-1-(reduce?0:((t>>2)+i)&1),CW,1);continue}   /* foam where it laps a wall */
    const near=v>-18&&v<60,dens=near?.55:.14;
    if(hash(Math.floor((wx+tt*.6)/4),near?3:7)<dens){ctx.fillStyle=fo;ctx.fillRect(x,y-(near&&hash(i,tt>>2)<.4?1:0),CW,1);if(near){ctx.fillStyle=pat(ctx,fl);ctx.fillRect(x,y+1,CW,2)}}
    else if(on&&(i+(t>>3))%9===0){ctx.fillStyle=W.hi;ctx.fillRect(x,y,1,1)}
  }
  if(reduce||!c||!C||!C.tide||lead<-1e8)return;
  /* spray thrown ahead off the lip, and debris tumbling in the face (clock-only arcs) */
  const yAt=wx=>{const q=tideCol(S.liq,wx);return q?Math.round(q.top+D.h[q.i])-oy:null};
  const ly=yAt(lead+b*edge);if(ly===null)return;
  for(let k=0;k<9;k++){const p=(t+k*11)%30,x=Math.round(lead+b*(edge-2-p*(.7+hash(k,1)*.6)))-ox,y=Math.round(ly-6-p*(1.3+hash(k,2))+p*p*.075);
    if(y>=ly+4||x<0||x>=VW||y<0)continue;ctx.fillStyle=p<8?FOAM.hi:FOAM.lo;ctx.fillRect(x,y,1,1)}
  for(let k=0;k<2;k++){const u=5+k*10+Math.round(Math.sin(t*.09+k*2)*2),wx=lead+b*u,y0=yAt(wx);if(y0===null)continue;const x=Math.round(wx)-ox,y=y0+4+k*2+((t>>4)&1);
    ctx.fillStyle=k?FOAM.shell:FOAM.deb;if((t>>3)&1)ctx.fillRect(x,y,3,1);else ctx.fillRect(x+1,y-1,1,3)}
}
/* over him: the tide in front of his feet (waterFront's dither) */
export function tideFront(ctx,S,ox,oy,b){
  const D=S.liq&&S.liq.tide;if(!D)return;
  for(let x=Math.floor(b.x)-2;x<=Math.ceil(b.x+b.w)+2;x++){const i=Math.floor(x/CW),sx=x-ox;if(i<0||i>=D.n||D.top[i]<0||sx<0||sx>=VW)continue;
    const top=Math.round(D.top[i]+D.h[i]);if(top>b.y+b.h+2||top<b.y-4)continue;
    for(let y=top+1;y<=Math.min(b.y+b.h+2,D.bot[i]-1);y++){const sy=y-oy;if(sy>=0&&sy<VH&&(sx+sy)&1){ctx.fillStyle=y-top<3?W.crestD:W.top;ctx.fillRect(sx,sy,1,1)}}
    ctx.fillStyle=W.crest;ctx.fillRect(sx,top-oy,1,1)}
}

/* the head, facing west: snout tip at x 0, crown at y 0; the lower jaw hinged at (HX,HY), open by g 0..1. mode 0 lit,
   1 white (his death's flash), 2 the dithered shadow it casts under the water. Built once per (g step, mode) */
const HX=30,HY=17,JL=31,HW=52,HH=46,GN=9,HEADS={};
const lerpPts=(P,x)=>{for(let k=1;k<P.length;k++)if(x<=P[k][0]){const [x0,y0]=P[k-1],[x1,y1]=P[k];return y0+(y1-y0)*(x-x0)/(x1-x0)}return P[P.length-1][1]};
const TOP=[[0,10],[6,7],[14,4],[22,1],[26,0],[38,0],[46,3],[52,8]],LIP=[[0,15],[2,14],[30,17]],THROAT=[[30,17],[40,23],[52,26]];
const UPT=[[2,5],[5,3],[8,6],[11,3],[14,4],[17,2],[21,3],[25,2]],LOT=[[3,2],[7,3],[11,2],[15,4],[19,2],[24,3],[28,5]];
function headSprite(gi,mode){
  const key=gi*3+mode;if(HEADS[key])return HEADS[key];
  const c=document.createElement('canvas');c.width=HW;c.height=HH;const x2=c.getContext('2d'),img=x2.createImageData(HW,HH),d=img.data;
  const g=gi/(GN-1),th=g*.6,cs=Math.cos(th),sn=Math.sin(th);
  const cols={};const rgb=h=>cols[h]||(cols[h]=[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]);
  const put=(x,y,h,keep)=>{if(x<0||y<0||x>=HW||y>=HH)return;if(mode===2&&!keep&&((x+y)&1))return;const [r,gg,b]=rgb(mode===1?'#ffffff':mode===2&&!keep?EEL.sh:h),o=(y*HW+x)*4;d[o]=r;d[o+1]=gg;d[o+2]=b;d[o+3]=255};
  const jaw=(x,y)=>{const dx=HX-x,dy=y-HY,s=dx*cs+dy*sn,n=-dx*sn+dy*cs,tk=7-s*.13;if(s<-2||s>JL||n<0||n>tk)return null;if(s>JL-3&&n>tk*(JL-s)/3)return null;return {s,n,tk}};
  for(let y=0;y<HH;y++)for(let x=0;x<HW;x++){
    const yt=lerpPts(TOP,x),yl=x<=HX?lerpPts(LIP,x):lerpPts(THROAT,x);
    if(y>=Math.round(yt)&&y<=yl){   /* the skull and upper jaw */
      const dt=y-Math.round(yt),dl=yl-y;if(mode===2&&dt<1){put(x,y,W.streak,1);continue}let h=dt<1?(hash(x,3)<.25&&x>8?EEL.rimL:EEL.rim):dt<3?EEL.m:EEL.b;
      if(x<=HX&&dl<2)h=EEL.dk;if(x>HX&&dl<3)h=(x+y)&1?EEL.b:EEL.belD;if(dt>=3&&hash(x,y)<.07)h=EEL.m;put(x,y,h);continue}
    const j=jaw(x,y);
    if(j){put(x,y,j.n<1&&g>.12?EEL.gum:j.n>j.tk-1?((x+y)&1?EEL.bel:EEL.belD):j.n>j.tk-2?EEL.dk:j.n<2.5?EEL.m:EEL.b);continue}   /* the lower jaw: a pale underside line */
    if(x>=1&&x<=HX+1&&y>yl){const dx=HX-x,dy=y-HY,n=-dx*sn+dy*cs;if(n<0&&g>.05)put(x,y,y-yl<1.2||n>-1.2?EEL.gum:x<HX-12?EEL.mo:EEL.deep)}   /* inside the mouth */
  }
  /* brow ridge over the slit eye, gill slits behind */
  for(let x=19;x<=29;x++){put(x,4,EEL.ink);put(x,3,x&1?EEL.dk:EEL.m)}
  for(const [x,y] of [[22,5],[23,5],[24,5],[21,6],[22,6],[23,6],[24,6],[25,6],[22,7],[23,7],[24,7]])put(x,y,EEL.eye);for(const y of [5,6,7])put(23,y,EEL.ink);for(let x=21;x<=25;x++)put(x,8,EEL.dk);put(20,6,EEL.dk);put(26,6,EEL.dk);
  for(const gx of [36,40,44])for(let k=0;k<7;k++){const y=7+k,x=gx+(k>>2);if(y<lerpPts(THROAT,x)-1){put(x,y,EEL.ink);put(x+1,y,EEL.m)}}
  /* teeth: needles down from the upper jaw, up from the lower; the two long ones near the tip */
  for(const [tx,len] of UPT){const y0=Math.floor(lerpPts(LIP,tx))+1;for(let k=0;k<len;k++){put(tx,y0+k,k===len-1?EEL.tD:EEL.t);if(len>=5&&k<2)put(tx+1,y0+k,EEL.t)}}
  for(const [s,len] of LOT){const px=HX-s*cs,py=HY+s*sn;for(let k=1;k<=len;k++)put(Math.round(px-sn*k),Math.round(py-cs*k),k===len?EEL.tD:EEL.t)}
  x2.putImageData(img,0,0);return HEADS[key]=c;
}
/* the surge's look at a chase: back (px the snout is drawn behind the line, 0..4), the jaw's opening, coil (rearing) */
function surgeLook(c,C,t,reduce){
  if(reduce)return {back:2,gape:.35,coil:0};
  if(!c.on)return {back:2,gape:.15,coil:0};
  if(c.t<=0)return {back:2,gape:.6+.3*Math.sin(t*.16),coil:.5};   /* rising out of the lair, it roars */
  const p=surgeAt(c),W0=EEL_T.wind,SN=EEL_T.snap,ST=SN-2;
  if(p<W0)return {back:2,gape:.3+.1*Math.sin(p*.2),coil:0};
  if(p<ST){const k=ease((p-W0)/(ST-W0));return {back:2+2*k,gape:.3+.7*k,coil:k}}   /* the telegraph: rearing back, the jaw gaping */
  if(p<=SN)return {back:0,gape:p===SN?0:p===ST?.75:.35,coil:.4};   /* the snap */
  const k=(p-SN)/(EEL_T.surge-SN);return {back:2*k,gape:.3*k,coil:0};
}
/* the eel's head top (world px y): the hit's reach over the water, then sinking away once outrun */
function eelTop(c,C){const wk=c.on?0:Math.min(1,c.w/WITHER);return {top:c.y-reachOf(c,C)+wk*(C.tide.reach+24),wk}}
export const eelGeom=(c,C)=>eelTop(c,C);   /* tests: the drawn head's top */
const hardT=(S,c)=>c===undefined||c==='#'||c==='='||c==='X'||(c==='G'&&S.gate<.5);
/* clip to the open tiles in a screen box, so the eel never draws over rock */
function clipOpen(ctx,S,R,ox,oy,x0,y0,x1,y1){
  ctx.beginPath();const tx0=Math.floor((x0+ox)/T),tx1=Math.floor((x1+ox)/T),ty0=Math.floor((y0+oy)/T),ty1=Math.floor((y1+oy)/T);
  for(let ty=ty0;ty<=ty1;ty++){let a=-1;for(let tx=tx0;tx<=tx1+1;tx++){const open=tx<=tx1&&(ty<0||ty>=R.h||tx<0||tx>=R.w||!hardT(S,R.g[ty][tx]));
    if(open&&a<0)a=tx;else if(!open&&a>=0){ctx.rect(a*T-ox,ty*T-oy,(tx-a)*T,T);a=-1}}}
  ctx.clip();
}
/* the visible water line (room px y) at room px x near level y: the tide's there, else a pool surface above it */
function waterAt(S,x,y){let w=y;const L=S.liq;if(!L)return w;const q=tideCol(L,x);if(q)return Math.min(w,q.top);
  for(const s of L.s)if(!s.lava&&x>=s.tx*T&&x<s.tx*T+s.n*CW&&s.ty*T<w&&s.ty*T>y-3*T)w=s.ty*T;return w}
export function drawEel(ctx,S,R,ox,oy,t,reduce,flash){
  const c=S.chase,C=c?CHASES[c.id]:CHASES[R.biome];if(!C||!C.tide)return;
  const f=C.dir||1,b=-f,ax=R.at[0]*T,ay=R.at[1]*T;
  if(!c)return lair(ctx,S,R,C,ax,ay,ox,oy,t,reduce,b);
  const g=eelTop(c,C),sx=Math.round(c.x-ax)-ox,top=Math.round(g.top-ay)-oy,wy=Math.round(waterAt(S,c.x-ax+(-(C.dir||1))*16,c.y-ay))-oy,wk=g.wk,tt=reduce?0:t;   /* wy: the water it rises from (a pool over the tide's level, in the lair) */
  const X0=Math.min(sx,sx+b*230),X1=Math.max(sx,sx+b*230);if(X1<-4||X0>VW+4||top>VH)return;
  const L=surgeLook(c,C,t,reduce),bk=Math.round(L.back),col=h=>h;   /* his death's flash whitens only its head, the part that got him */
  const X=u=>sx+b*u,run=(u0,u1,y,h,n=1)=>{if(u1<u0)return;const a=X(u0),z=X(u1);ctx.fillStyle=h;ctx.fillRect(Math.min(a,z),y,Math.abs(z-a)+1,n)};
  const vrun=(u,y0,y1,h)=>{if(y1<y0)return;ctx.fillStyle=h;ctx.fillRect(X(u),y0,1,y1-y0+1)};
  const SH=pat(ctx,EEL.sh);
  ctx.save();clipOpen(ctx,S,R,ox,oy,X0-4,Math.max(0,top-72),X1+4,Math.min(VH,wy+48));   /* room for the spray over its head */
  /* the back: a segmented body behind the neck, long humps travelling back through the water (the swim), a finned ridge */
  const em=Math.max(0,Math.min(1,reachOf(c,C)/C.tide.reach))*(1-wk),u0=bk+12,len=200,lam=78,A=17*em*(1+.3*L.coil),om=(reduce?0:t*.07)+(c.on?0:c.w*.05);   /* em: how far it has come up out of the water */
  const spine=k=>{const q=k/len,env=k<24?k/24:q>.7?1-(q-.7)*1.4:1;return wy+9+(1-em)*16-A*env*Math.sin((k-6)*2*Math.PI/lam-om)};
  for(let k=0;k<=len;k++){const u=u0+k,q=k/len,yc=spine(k),th=Math.max(5,19*(1-.7*q)),yt=Math.max(top,Math.round(yc-th/2)),yb=Math.round(yc+th/2),x=X(u);if(x<-1||x>VW||yb<yt)continue;   /* never over its head's top: the reach line */
    if(yb>wy){vrun(u,Math.max(yt,wy+1),yb,SH);if(yt>wy+1)vrun(u,yt,yt,W.streak)}if(yt>wy)continue;   /* under the water: its shadow, its back catching the light */
    const ya=Math.min(yb,wy),sg=k%8;
    vrun(u,yt,ya,col(EEL.b));vrun(u,yt+1,Math.min(ya,yt+3),col(sg<2?EEL.rim:EEL.m));vrun(u,yt,yt,col(sg===7?EEL.m:EEL.rim));   /* a lit ridge, brighter on each segment's lead */
    if(sg===0&&yt+4<ya)vrun(u,yt+4,ya,col(EEL.dk));   /* the ring between segments */
    if(ya===yb)vrun(u,yb,yb,col(EEL.dk));
    const fh=k>8?Math.round((3+1.5*Math.sin(k*.33-om*2))*th/19*(1-wk)):0;   /* the dorsal fin: a membrane with a lit edge */
    if(fh>0&&yt-fh>=top){vrun(u,yt-fh,yt-1,col(EEL.fin));vrun(u,yt-fh,yt-fh,col(EEL.finR))}
    if(yt<wy&&yb>=wy&&!reduce&&hash(k,t>>2)<.45){ctx.fillStyle=FOAM.hi;ctx.fillRect(x,wy-(hash(k,(t>>2)+1)<.3?1:0),1,1)}   /* foam where it breaks the water */
  }
  /* the tail fan at its end, mostly under the water */
  {const u=u0+len,yc=spine(len);for(let j=-8;j<=8;j++){const w=Math.round(8-Math.abs(j)*.55+(reduce?0:Math.sin(t*.2+j*.5)*1.2)),y=Math.round(yc+j);if(y>=top)run(u,u+w,y,y>wy?SH:col(Math.abs(j)>6?EEL.finR:EEL.fin))}}
  /* the neck: a thick chest out of the water tapering up to the head, rows from under the head to just below the line;
     its front (toward him, in his light) a pale plated belly, its back dark under a fin with a lit edge */
  const nh=Math.max(1,wy-top);
  let fl=wy+1;{const tx=Math.floor((c.x-ax+b*8)/T);while(fl<wy+120&&!hardT(S,R.g[Math.floor((fl+oy)/T)]?.[tx]))fl++}   /* the floor under its snout: the hit reaches all the way down */
  for(let y=top+10;y<fl;y++){const rel=Math.min(1,(y-top)/nh),sw=reduce?0:Math.max(0,1.2+1.2*Math.sin((y-top)*.08-t*.05));
    const uf=bk+1+Math.round(5*(1-rel)*(1-rel)+sw*(1-rel)),ub=bk+Math.round(30+18*(1-rel)**3+10*rel*rel+L.coil*5*Math.sin(Math.PI*rel));   /* a thick nape under the skull's back, a waist, a broad base */
    if(y>wy){const ue=Math.max(uf+14,ub-Math.round((y-wy)*.6));run(uf,ue,y,SH);if(y===wy+1)run(uf,ub,y,W.streak);continue}   /* under the water its shadow, its front still on the line */
    run(uf,ub,y,col(EEL.b));run(uf,uf,y,col(EEL.rim));
    const r4=(y-top)&3,bw=4+Math.round(3*rel);run(uf+1,uf+bw,y,col(r4===0?EEL.belD:r4===1?EEL.belL:EEL.bel));   /* belly plates, each lit on its upper edge */
    if((y+X(uf+bw+1))&1)run(uf+bw+1,uf+bw+1,y,EEL.bel);
    run(uf+bw+3,uf+bw+4,y,col(EEL.m));run(ub-2,ub,y,col(EEL.dk));
    if(y>top+18){const fw=Math.max(1,Math.round(3+2*Math.sin((y-top)*.19-(reduce?0:t*.05))));run(ub+1,ub+fw,y,col(EEL.fin));run(ub+fw+1,ub+fw+1,y,col(EEL.finR))}
  }
  /* the head, its crown on the reach line; under the water only its shadow */
  {const gi=Math.round(Math.max(0,Math.min(1,L.gape))*(GN-1)),hx=b>0?sx+bk:sx-bk-HW+1;
    const one=(mode,y0,y1)=>{if(y1<=y0)return;ctx.save();ctx.beginPath();ctx.rect(hx-1,y0,HW+2,y1-y0);ctx.clip();
      if(b>0)ctx.drawImage(headSprite(gi,mode),hx,top);else{ctx.translate(hx+HW,top);ctx.scale(-1,1);ctx.drawImage(headSprite(gi,mode),0,0)}ctx.restore()};
    one(flash?1:0,top-1,wy+1);one(2,wy+1,top+HH+1)}
  /* the water at its neck: a foam collar, bow spray ahead of it, a burst at each snap and at the breach */
  if(top<wy){const a=bk+Math.round(17-15),z=bk+34;for(let u=a-3;u<=z;u++)if(reduce||hash(u,t>>2)<.6){ctx.fillStyle=hash(u,(t>>2)+5)<.5?FOAM.hi:FOAM.lo;ctx.fillRect(X(u),wy-(hash(u,t>>1)<.25?1:0),1,1)}}
  if(!reduce&&c.on&&c.t<0&&top>=wy-2){for(let k=0;k<5;k++){const p=(t+k*13)%40,y=Math.min(top+4,wy+30)-p;if(y>wy+1){ctx.fillStyle='#8fc3e6';ctx.fillRect(X(bk+8+k*7+Math.round(Math.sin(p*.2+k))),y,1,1)}}}   /* bubbles off its rising head */
  if(!reduce&&c.on&&top<wy){
    for(let k=0;k<6;k++){const p=(t+k*7)%22,x=X(bk+1-Math.round(p*(.5+hash(k,4)*.5))),y=wy-Math.round(p*(1.3+hash(k,5))-p*p*.08);if(y<wy){ctx.fillStyle=p<6?FOAM.hi:FOAM.lo;ctx.fillRect(x,y,1,1)}}
    const sp=surgeAt(c),q=sp<0?99:(sp-EEL_T.snap+EEL_T.surge)%EEL_T.surge,bt=c.t-BREACH(C);
    const burst=(tau,n,u0,u1,vy,sp2)=>{for(let k=0;k<n;k++){const u=u0+hash(k,11)*(u1-u0),vx=(hash(k,12)-.6)*sp2,v=vy*(.5+hash(k,13)*.7),y=wy-Math.round(v*tau-.11*tau*tau),x=X(Math.round(u+vx*tau));
      if(y<wy){ctx.fillStyle=tau<6||k%3===0?FOAM.hi:FOAM.lo;ctx.fillRect(x,y,k%4===0?2:1,k%4===0?2:1)}}};
    if(q<26)burst(q,14,bk,bk+30,3.2,1.6);
    if(bt>=0&&bt<50){burst(bt,40,bk-8,bk+48,5,2.6);burst(Math.max(0,bt-6),18,bk+4,bk+30,3.4,1.2);   /* the breach: a column of water thrown up, a second wave of it */
      if(bt<16)for(let u=bk-8;u<=bk+46;u++){const h=Math.round((12-bt*.75)*Math.sin(Math.PI*(u-bk+8)/54)*(.55+.45*hash(u,bt>>1)));if(h>0){ctx.fillStyle=FOAM.lo;ctx.fillRect(X(u),wy-h,1,h);ctx.fillStyle=FOAM.hi;ctx.fillRect(X(u),wy-h,1,Math.min(h,2))}}}   /* a dome of white water where it broke through */
  }
  ctx.restore();
}
const BREACH=C=>-Math.floor(C.beat*C.tide.reach/(C.tide.reach+24));   /* the chase clock frame its head breaks the water (chases.js eelBeats) */
/* asleep in its lair, before the chase: a coiled shadow under the water, its eye opening now and then, bubbles rising */
function lair(ctx,S,R,C,ax,ay,ox,oy,t,reduce,b){
  const k=PIECES.indexOf(R.biome);if(k<0||S.pieces[k]||!R.pedestals.length)return;
  const x=C.from*T-ax-ox;if(x<-80||x>VW+80)return;
  const pool=S.liq&&S.liq.s.find(s=>!s.lava&&C.from*T-ax>=s.tx*T&&C.from*T-ax<s.tx*T+s.n*CW),sy=pool?pool.ty*T-oy:C.tide.lv[0][1]-ay-oy,y=sy+20;
  const br=reduce?0:Math.sin(t*.03);
  ctx.fillStyle=pat(ctx,EEL.sh);
  for(const [u,dy,rx,ry] of [[14,2,15,6],[32,6,13,5],[46,0,9,4],[4,-1,8,4]]){const cx=x+b*u,cy=Math.round(y+dy+br*(u&1?1:-1));
    for(let j=-ry;j<=ry;j++){const w=Math.round(rx*Math.sqrt(1-(j*j)/(ry*ry)));ctx.fillRect(cx-w,cy+j,2*w+1,1)}}
  if(reduce||(t%320)<150){ctx.fillStyle='#9aa890';ctx.fillRect(x-b*2,y-2,2,1);ctx.fillStyle=EEL.ink;ctx.fillRect(x-b*2+(b>0?0:1),y-2,1,1)}
  if(!reduce)for(let n=0;n<3;n++){const p=(t+n*97)%170,bx=Math.round(x+b*(10+n*13)+Math.sin(p*.15+n)*1.5),by=Math.round(y-4-p*.22);if(by>sy+1){ctx.fillStyle='#8fc3e6';ctx.fillRect(bx,by,1,1)}}
}
