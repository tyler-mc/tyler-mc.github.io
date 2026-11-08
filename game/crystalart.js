/* Crystals art, all drawn in code (no image assets), called from render.js. The frozen cache of the OS: pale glass blue,
   white and a cold violet, brighter than the other spokes (AMB.crystals .6). Fixed meanings hold: red only for danger (the
   beam and the drifter's lens), yellow only for a pickup (the Undo item). Nothing here gives light and nothing glows: the
   beam is a thin crisp line, the Echo a dark dithered silhouette with only its eyes lit, the receiver a ring that fills.
   Mechanics are game/crystals.js and game/echo.js (pure reads only); the Undo fields are S.undo (game/undo.js).
   The art clock is the render clock t (like the other arts); nothing here changes S. Reduced motion: no shake, no
   flicker, no scanline sweep (a static desaturation), no rotation drift beyond the drifter's own state. */
import {T,VW,VH} from './state.js';
import {B4,sprite,CX,SOLE,WALK_LOOKS,IDLE_TURN,IDLE_LEAN} from './mascot.js';
import {FEEL} from './player.js';
import {shardState,rxFill,rxLatched,lockOpen,beamSeg} from './crystals.js';
import {echoPos,echoHarmless} from './echo.js';

const INK='#1A1716',RED='#FF3333',RED2='#B3121B',YEL='#FFD94A',YEL2='#F6B92B';
const bay=(x,y)=>(B4[(y&3)*4+(x&3)]+.5)/16;
const hash=(x,y)=>{let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296};
const rgb=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const px=(ctx,x,y,c,w=1,h=1)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h)};

/* the room palette (render.js PAL.crystals): every key the static layer, dust and strands read */
export const CPAL={bg:'#46528c',bg2:'#5662a0',rock:'#9aaee4',rockL:'#d3e1fb',rockD:'#6f7dbd',out:'#1b2040',top:'#f0f6ff',topL:'#ffffff',strand:'#8392cc'};
/* glass: ink, deep violet, violet, ice ramp, white; LK the cyan of every plate/gate link mark (render.js LINK) */
const G={k:'#141831',deep:'#2a3166',vD:'#5a4fa6',v:'#8b7fd8',vL:'#b9b0f0',iD:'#6f86c4',i:'#a9c4f0',iL:'#d9e7ff',w:'#ffffff',crk:'#1d2147'};
const LK={off:'#2c5a61',dim:'#3f8590',on:'#7fe8f4',hi:'#e6fdff'};

/* ---------- static layer (render.js buildLayer; put takes [r,g,b]) ---------- */
const SV=rgb('#8a80d4'),SE=rgb('#c4d5f6'),SW=rgb('#ffffff'),SD=rgb('#5c68aa'),COL=rgb('#6573b0'),COLE=rgb('#8b99d0');
/* glass rock: Voronoi facets (one point per jittered 20 px cell, world-anchored so rooms join), each facet a flat shade
   picked by its own hash, a pale ridge where two facets meet, a darker seam just under it, a rare white glint; the edges
   facing air as other rock */
const FC=20,fpt=(i,j)=>[i*FC+3+hash(i,j*3+1)*14,j*FC+3+hash(i*5+2,j)*14];
export function crystalRock(put,C,tx,ty,up,dn,lf,rt){
  for(let j=0;j<T;j++)for(let i=0;i<T;i++){
    const x=tx*T+i,y=ty*T+j,ci=Math.floor(x/FC),cj=Math.floor(y/FC);let d1=1e9,d2=1e9,q=0;
    for(let b=-1;b<=1;b++)for(let a=-1;a<=1;a++){const [qx,qy]=fpt(ci+a,cj+b),d=Math.hypot(x-qx,y-qy);if(d<d1){d2=d1;d1=d;q=(ci+a)*977+(cj+b)}else if(d<d2)d2=d}
    const h=hash(q,7),e=d2-d1;
    let c=e<1?SE:e<2?SD:h<.42?C.rock:h<.7?C.rockD:h<.86?SV:C.rockL;
    if(hash(x,y)>.994)c=SW;
    if(up&&j===0)c=C.top;
    else if(up&&j===1)c=C.rockL;
    else if((dn&&j===T-1)||(lf&&i===0)||(rt&&i===T-1))c=C.out;
    else if((lf&&i===1)||(rt&&i===T-2)||(dn&&j===T-2))c=C.rockD;
    put(x,y,c);
  }
}
/* behind everything: tall dithered glass columns (the gallery's pillars), each with a lit left edge */
export function crystalBg(put,W,H,seed){
  for(let cx=24+((hash(seed,3)*40)|0);cx<W;cx+=56+((hash(cx,seed)*40)|0)){const w=6+((hash(cx,7)*6)|0);
    for(let y=0;y<H;y++)for(let i=0;i<w;i++){const x=cx+i;if(i===0){if(y&1)put(x,y,COLE)}else if(bay(x,y)<.34-i*.02)put(x,y,COL)}}
}
/* a hanging glass spike in place of a root strand: 2 px wide for its first third, then 1 px, a lit left side */
export function crystalSpike(put,C,sx,sy,len){
  const L=Math.max(3,len>>1);for(let k=0;k<L;k++){put(sx,sy+k,k<L-1?C.rockL:C.strand);if(k<L/3)put(sx+1,sy+k,C.strand)}
}

/* ---------- Q shard step (before the light pass) ---------- */
/* a glass slab (6 px) with teeth under it. Cracking: cracks run out from its middle and it trembles; falling: it breaks in
   three and drops, dithering away; gone: a faint dotted ghost of its top (a rewind can bring it back) */
const QTEETH=[[1,3,4],[5,7,3],[8,10,5]];
const QCRACK=[[[6,3],[5,2],[4,2],[3,1],[2,1],[1,0]],[[6,3],[7,4],[8,4],[9,5],[10,4],[11,4]],[[6,3],[6,4],[5,5],[6,6],[5,7],[5,8]],[[6,3],[7,2],[8,1],[8,0]]];
function shardPx(i,j){
  if(j<=6){if(i===0||i===T-1||j===6)return G.k;if(j===0)return G.w;if(j===1)return G.iL;if((i+j)%5===0)return G.iL;if((i-j+12)%7===0)return G.v;return j>3?G.iD:G.i}
  for(const [a,b,L] of QTEETH){const r=j-7;if(r>=L)continue;const w=r<1?b-a+1:r<L-1?Math.max(1,b-a-1):1,c0=Math.round((a+b)/2-(w-1)/2);if(i>=c0&&i<c0+w)return r===L-1?G.vD:i===c0?G.vL:G.v}
  return null;
}
export function drawShard(ctx,S,R,tx,ty,x,y,t,reduce){
  const s=shardState(S,R,tx,ty);
  if(s.st===3){for(let i=1;i<T-1;i+=3)px(ctx,x+i,y,G.deep);return}
  if(s.st===2){const k=s.k;
    for(let c=0;c<3;c++){const dx=Math.round((c-1)*k*5),dy=Math.round(s.dy*(1+(c===1?0:.2*c))),i0=c*4;
      for(let j=0;j<T;j++)for(let i=i0;i<i0+4;i++){const col=shardPx(i,j);if(!col)continue;const X=x+i+dx,Y=y+j+dy;if(bay(X,Y)<k*1.1)continue;px(ctx,X,Y,col)}}
    return}
  const jx=s.st===1&&!reduce&&s.k>.45&&(t&2)?((t&4)?1:-1):0;
  for(let j=0;j<T;j++)for(let i=0;i<T;i++){const c=shardPx(i,j);if(c)px(ctx,x+i+jx,y+j,c)}
  if(s.st===1){const n=Math.ceil(s.k*6);for(const cr of QCRACK)for(let m=0;m<Math.min(n,cr.length);m++)px(ctx,x+cr[m][0]+jx,y+cr[m][1],G.crk)}
}

/* ---------- R receiver and D lock (after the light pass, so the rings always read; neither gives light) ---------- */
/* a ring of pixels round a centre, ordered clockwise from the top */
const ringPts=r=>{const o=[],seen=new Set();for(let a=0;a<720;a++){const an=a/720*Math.PI*2,x=Math.round(Math.sin(an)*r),y=Math.round(-Math.cos(an)*r),k=x+','+y;if(!seen.has(k)){seen.add(k);o.push([x,y])}}return o};
const RING4=ringPts(3.6),RING3=ringPts(2.6);
function ring(ctx,cx,cy,pts,f,latched,t,reduce){
  const n=Math.round(f*pts.length);
  pts.forEach(([x,y],i)=>px(ctx,cx+x,cy+y,latched?LK.hi:i<n?(i===n-1&&!reduce&&(t>>2)&1?LK.hi:LK.on):LK.off));
  if(latched){px(ctx,cx-1,cy-1,LK.hi,2,2)}
}
export function drawReceiver(ctx,S,R,tx,ty,x,y,t,reduce){
  /* a socket of dark glass in a pale frame */
  px(ctx,x,y,G.k,T,T);px(ctx,x+1,y+1,G.iD,T-2,T-2);px(ctx,x+1,y+1,G.iL,T-2,1);px(ctx,x+1,y+1,G.iL,1,T-2);
  px(ctx,x+2,y+2,G.deep,T-4,T-4);
  ring(ctx,x+6,y+6,RING4,rxFill(S,R,tx,ty),rxLatched(S,R,tx,ty),t,reduce);
}
/* the lock: violet glass bars; the top tile of each lock column carries the same ring as its receivers, filled as they
   are (the mean over every receiver with its id), so a ring lighting over there is seen filling here too */
export function drawLock(ctx,S,R,tx,ty,x,y,t,reduce){
  const id=R.lockAt&&R.lockAt[tx+','+ty];if(id!==undefined&&lockOpen(S,R,id))return;
  for(const bx of [1,5,9]){px(ctx,x+bx,y,G.k,3,T);px(ctx,x+bx,y,G.v,2,T);px(ctx,x+bx,y,G.vL,1,T)}
  px(ctx,x,y+2,G.k,T,1);px(ctx,x,y+T-3,G.k,T,1);
  if(R.g[ty-1]&&R.g[ty-1][tx]==='D')return;
  const rs=(R.rx||[]).filter(r=>r.id===id);const f=rs.length?rs.reduce((a,r)=>a+rxFill(S,R,r.tx,r.ty),0)/rs.length:0;
  px(ctx,x+2,y+2,G.k,8,8);px(ctx,x+3,y+3,G.deep,6,6);ring(ctx,x+6,y+6,RING3,f,false,t,reduce);
}

/* ---------- W platform (in the enemies pass) ---------- */
export function drawPlat(ctx,e,bx,by){
  const w=e.w,h=e.h;
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){let c;
    if(i===0||i===w-1||j===h-1)c=G.k;else if(j===0)c=G.w;else if(j===1)c=G.iL;else if(j===h-2)c=G.vD;else if((i+j*2)%9===0)c=G.iL;else if((i-j+40)%13===0)c=G.v;else c=j<4?G.i:G.iD;
    px(ctx,bx+i,by+j,c)}
  for(let i=3;i<w-3;i+=6){px(ctx,bx+i,by+h,G.vD,2,1);px(ctx,bx+i,by+h+1,G.vD)}   /* little teeth under it */
}

/* ---------- Y prism drifter and its beam (after the light pass) ---------- */
/* a hexagonal glass shard turning on its vertical axis (its own drift phase e.ph, never the clock), lit from the upper
   left; the lens on its aim side is a red eye (danger). Shattered: the lens is dark and chipped. Returns the pixel map the
   root bands wrap (render.js wrapped()), with the same key as render.js plot() */
const key=(x,y)=>(y+64)*4096+x+64;
const FACE=[G.vD,G.v,G.iD,G.i,G.iL,G.i],LENS={r:[3,0],l:[-4,0],d:[0,6],u:[0,-7]};
export function drawPrism(ctx,e,bx,by,t,col){
  const cx=Math.round(bx+e.w/2),cy=Math.round(by+e.h/2),rot=(e.ph||0)*2.2,m=new Map();let sx=0,sy=0;
  const put=(x,y,c,ch)=>{ctx.fillStyle=col(c,x,y);ctx.fillRect(x,y,1,1);m.set(key(x,y),ch);sx+=x;sy+=y};
  const HW=j=>{if(j<-10||j>9)return 0;const a=Math.abs(j+.5);return a<3.5?6:Math.max(1,Math.round(6-(a-3.5)*.95))};
  for(let j=-10;j<=9;j++){const a=Math.abs(j+.5),hw=HW(j),hu=HW(j-1),hd=HW(j+1);
    let last=-1;for(let i=-hw;i<hw;i++){const u=(i+.5)/hw,th=Math.asin(Math.max(-1,Math.min(1,u)))+rot,f=((Math.floor(th/(Math.PI/3))%6)+6)%6;
      let c=FACE[f];if(j<-4)c=f%3===0?G.i:f%3===1?G.iL:G.w;else if(j>3)c=f%2?G.vD:G.v;
      if(last>=0&&f!==last&&a<4.5)c=G.w;last=f;
      const edge=i===-hw||i===hw-1||i<-hu||i>=hu||i<-hd||i>=hd;
      put(cx+i,cy+j,edge?G.k:c,edge?'k':'b')}}
  /* the lens: a red eye set in the face it aims through, a dark red rim (paint, not light) */
  const L=LENS[e.aim]||LENS.r,lx=cx+L[0],ly=cy+L[1];
  if(e.lens){for(const [a,b] of [[0,-1],[-1,0],[1,0],[0,1]])put(lx+a,ly+b,'#7A0A12','e');put(lx,ly,RED,'e')}
  else{put(lx,ly,G.k,'k');put(lx+1,ly+1,G.crk,'k');put(lx-1,ly-1,G.crk,'k');put(lx+1,ly-1,G.deep,'k')}
  return {m,cx:sx/m.size,cy:sy/m.size,ux:0,uy:-1};
}
/* the beam: a 1 px white core between two 1 px red sides, crisp, no glow; a pale tick runs along it from the lens (held
   still under reduced motion); where it meets a wall or a receiver, a small white-red splash */
export function drawBeam(ctx,S,R,e,ox,oy,t,reduce,flash){
  const b=beamSeg(S,R,e);if(!b)return;
  const hor=b.y0===b.y1,a0=hor?b.x0:b.y0,a1=hor?b.x1:b.y1,d=Math.sign(a1-a0)||1,n=Math.round(Math.abs(a1-a0)),line=hor?b.y0:b.x0;
  const core=flash?'#fff':'#ffffff',side=flash?'#fff':RED,tick=flash?'#fff':'#FFC4B8',ph=reduce?0:(t>>1)%8;
  for(let s=0;s<n;s++){const a=Math.round(a0+d*s),c=(s-ph)%8===0?tick:core;
    if(hor){const X=a-ox,Y=line-oy;px(ctx,X,Y-1,side);px(ctx,X,Y,c);px(ctx,X,Y+1,side)}
    else{const X=line-ox,Y=a-oy;px(ctx,X-1,Y,side);px(ctx,X,Y,c);px(ctx,X+1,Y,side)}}
  const ex=(hor?a1:line)-ox,ey=(hor?line:a1)-oy,f=reduce?0:(t>>2)&1;
  px(ctx,ex-(hor?d:0),ey-(hor?0:d),core);
  if(hor){px(ctx,ex-d,ey-2-f,side);px(ctx,ex-d,ey+2+f,side)}else{px(ctx,ex-2-f,ey-d,side);px(ctx,ex+2+f,ey-d,side)}
}
/* how near he is to a live beam, 0..1 (audio beam_hum) */
export function beamNear(S,R){
  let v=0;const cx=S.p.x+9,cy=S.p.y+12;
  for(const e of S.ens){if(e.k!=='prism')continue;const b=beamSeg(S,R,e);if(!b)continue;
    const hor=b.y0===b.y1,lo=Math.min(hor?b.x0:b.y0,hor?b.x1:b.y1),hi=Math.max(hor?b.x0:b.y0,hor?b.x1:b.y1),along=hor?cx:cy,across=hor?cy-b.y0:cx-b.x0;
    const dd=Math.hypot(along<lo?lo-along:along>hi?along-hi:0,across);v=Math.max(v,Math.max(0,1-dd/72))}
  return v;
}

/* ---------- the mascot's ghosts: the Echo and the pool's reflection ---------- */
/* a look from a logged position and the one before it: walking, in the air, or standing */
function ghostLook(x,y,face,x0,y0){
  const flip=face<0?1:0,s={lv:'rest',ft:'stand',turn:IDLE_TURN,lean:IDLE_LEAN,flip,dir:[face<0?-1:1,0],stage:1,blink:0,face:'',mouth:0,happy:0,dx:0};
  if(y0!==undefined&&Math.abs(y-y0)>.6){s.ft=y<y0?'tuck':'dangle';s.arms=y<y0?[150,30]:[180,0];s.dir[1]=y<y0?-1:1}
  else if(x0!==undefined&&Math.abs(x-x0)>.3){const w=WALK_LOOKS[Math.floor(x*(face<0?-1:1)/FEEL.STRIDE)&7];s.ft=w.ft;s.arms=w.arms;s.turn=w.turn;s.lean=w.lean;s.lv=w.lv||'rest'}
  return s;
}
/* a sprite's opaque pixels, once per canvas: [x,y,kind] with kind 0 body, 1 outline (dark), 2 eye white */
const PIX=new WeakMap();
function pixels(c){
  let o=PIX.get(c);if(o)return o;o=[];
  const d=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const j=(y*c.width+x)*4;if(d[j+3]<128)continue;const r=d[j],g=d[j+1],b=d[j+2];
    o.push([x,y,r>250&&g>250&&b>250?2:r+g+b<150?1:0,r,g,b])}
  PIX.set(c,o);return o;
}
/* the Echo: his own sprite as a dark violet silhouette, dithered so the glass shows through, only its eyes lit (pale,
   no glow). Harmless (just woken, after a rewind, wrapped): thinner. At the log seam (sj small) it flickers and tears
   sideways a pixel for a few frames (steady and faint under reduced motion). flash: white (it got him). Returns the
   pixel map the root bands wrap while it is a wrapped step */
const EC={k:'#07060f',b:'#15132a',B:'#26224a',eye:'#efeaff'};
export function drawEcho(ctx,S,R,ox,oy,t,reduce,flash){
  const E=S.echo,q=echoPos(S);if(!q)return null;
  const k=Math.max(0,Math.min((E.log.length/3|0)-1,Math.floor(E.i))),pv=k>0?[E.log[(k-1)*3],E.log[(k-1)*3+1]]:[];
  const c=sprite(ghostLook(q.x,q.y,q.face,pv[0],pv[1])),P=pixels(c);
  const harm=echoHarmless(S),seam=Number.isFinite(E.sj)&&E.sj<8;
  if(seam&&!reduce&&(t&1)&&!flash)return null;   /* the flicker: one frame on, one off */
  const sx=Math.round(q.x)+9-CX-ox,sy=Math.round(q.y)+23-SOLE-oy,thin=harm>0?(reduce?.45:.5):.22,tear=seam&&!reduce?((t>>1)&1?1:-1):0;
  const m=new Map();let ax=0,ay=0;
  for(const [x,y,kd] of P){const X=sx+x+(tear&&(y&2)?tear:0),Y=sy+y;if(X<0||Y<0||X>=VW||Y>=VH)continue;
    if(flash){px(ctx,X,Y,'#fff');continue}
    if(kd===2){px(ctx,X,Y,EC.eye);m.set(key(X,Y),'w');continue}
    if(kd===0&&bay(X,Y)<thin)continue;
    if(kd===1&&harm>0&&bay(X+1,Y)<thin*.6)continue;
    px(ctx,X,Y,kd===1?EC.k:bay(X,Y+1)<.5?EC.b:EC.B);m.set(key(X,Y),kd===1?'k':'b');ax+=X;ay+=Y}
  return m.size?{m,cx:ax/m.size,cy:ay/m.size,ux:0,uy:-1}:null;
}
/* the reflection's memory of him: his recent positions, one per live step, in the renderer (never in S). LAG: the
   Echo's own default lag, so the pool foreshadows it */
export const LAG=120;
export const newTrail=()=>({room:null,t:NaN,q:[]});
export function stepTrail(tr,S){
  if(S.room!==tr.room||S.t!==tr.t+1)tr.q=[];
  tr.room=S.room;tr.t=S.t;const p=S.p;
  tr.q.push([p.x,p.y,p.face,p.hide||p.dead?1:0]);if(tr.q.length>LAG+2)tr.q.shift();
}
/* before the light pass, over the water body: him LAG steps ago, mirrored in the surface, tinted into the water and
   dithered at half. Clipped to the water under each surface. Until LAG steps have passed it shows where he came in */
const RT=new WeakMap();
export function drawReflection(ctx,S,R,tr,ox,oy,t,reduce){
  if(!S.liq||!tr.q.length||tr.room!==S.room)return;
  const n=tr.q.length,a=tr.q[Math.max(0,n-1-LAG)],b=tr.q[Math.max(0,n-2-LAG)];if(a[3])return;
  const c=sprite(ghostLook(a[0],a[1],a[2],b[0],b[1])),P=pixels(c),sx=Math.round(a[0])+9-CX-ox,sy=Math.round(a[1])+23-SOLE-oy;
  for(const s of S.liq.s){if(s.lava)continue;
    const L=s.tx*T-ox,Rr=s.tx*T+s.n*2-ox;if(sx+c.width<L||sx>Rr)continue;
    let dep=0;while(R.g[s.ty+dep]&&R.g[s.ty+dep][s.tx]==='~')dep++;
    const top=s.ty*T-oy,bot=(s.ty+dep)*T-oy,m=top+Math.round(s.h[0]||0);   /* the mirror line: the still surface */
    for(const [x,y,kd,r,g,bb] of P){const X=sx+x,Y=2*m-(sy+y)+1;if(X<L||X>=Rr||Y<=m+1||Y>=bot||Y<0||Y>=VH||X<0||X>=VW)continue;
      const w=Y-m;if(bay(X,Y)<.3+Math.min(.4,w/80))continue;
      const rx=reduce||w<5?0:Math.round(Math.sin(Y*.6+t*.05)*.6);
      ctx.fillStyle=kd===2?'#c9dcff':kd===1?'#0d1c36':`rgb(${(r*.45+40)|0},${(g*.45+70)|0},${(bb*.45+120)|0})`;ctx.fillRect(X+rx,Y,1,1)}}
}

/* ---------- Undo: the rewind look and the meter ring ---------- */
const U0={on:0,m:1,flash:0,ago:999,demo:0};
export const undoOf=S=>S.undo?{...U0,...S.undo}:U0;
/* the whole view, after the world and him: colours drain toward a cold grey; while it runs, scanlines scroll upward
   through a dither and a torn band rolls up the screen (time running back). It fades over 10 steps after the rewind.
   Reduced motion: the static desaturation only */
export function rewindLook(ctx,S,t,reduce){
  const u=undoOf(S),k=u.on?1:u.ago<10?1-u.ago/10:0;if(k<=0)return;
  const img=ctx.getImageData(0,0,VW,VH),d=img.data,src=reduce?null:new Uint8ClampedArray(d),band=reduce?-99:VH-((t*4)%(VH+40))+20;
  for(let y=0;y<VH;y++){const sl=!reduce&&((y+t)&3)===0,inB=!reduce&&Math.abs(y-band)<5,sh=inB?((y&1)?2:-2):0;
    for(let x=0;x<VW;x++){const j=(y*VW+x)*4,s=sh?(y*VW+Math.max(0,Math.min(VW-1,x-sh)))*4:j;
      let r=src?src[s]:d[s],g=src?src[s+1]:d[s+1],b=src?src[s+2]:d[s+2];const l=r*.3+g*.59+b*.11,a=.8*k;
      r+=(l-r)*a;g+=(l-g)*a;b+=(l+14-b)*a;
      if(sl&&bay(x,y)<.6*k){r*=.6;g*=.6;b*=.66}
      if(inB&&bay(x,y)<.3){r+=(235-r)*.35;g+=(240-g)*.35;b+=(255-b)*.35}
      d[j]=r;d[j+1]=g;d[j+2]=b}}
  ctx.putImageData(img,0,0);
}
/* a ring of 20 pixels round him: lit pixels are the meter (counter-clockwise from the top, like the arrow), drained ones
   are dark. Shown while he rewinds, while it refills, and a moment after; an empty press flashes it. Only once he owns Undo */
const MR=[...Array(20)].map((_,i)=>{const a=-i/20*Math.PI*2;return [Math.round(Math.sin(a)*17)-1,Math.round(-Math.cos(a)*17)-1]});
export function undoRing(ctx,S,ox,oy,t,reduce){
  if(!S.items||!S.items.undo||S.p.dead||S.p.hide||S.mode!=='play')return;
  const u=undoOf(S),full=u.m>=.999,show=u.on||!full||u.flash>0||u.ago<40||u.demo>0;if(!show)return;
  const fade=!u.on&&full&&u.flash<=0&&!u.demo?Math.max(0,(u.ago-20)/20):0;
  const cx=Math.round(S.p.x+9)-ox,cy=Math.round(S.p.y+11)-oy,n=Math.round(u.m*MR.length),fl=u.flash>0&&(reduce||((u.flash>>2)&1));
  MR.forEach(([x,y],i)=>{const X=cx+x,Y=cy+y;if(fade&&bay(X,Y)<fade)return;
    px(ctx,X-1,Y-1,G.k,4,4);
    if(fl){px(ctx,X,Y,'#ffffff',2,2);return}
    const on=i<n;px(ctx,X,Y,on?(u.on&&i===n-1&&!reduce?LK.hi:LK.on):'#3a4270',2,2)});
}

/* ---------- the sweep's void (CHASES.crystals, game/sweep.js): above S.chase.y the world is gone ---------- */
/* black above the front, and a 24 px band of dissolving pixels over it: the nearer the front, the fewer pixels left; at
   the edge a few pale and violet specks flicker as they come apart (no glow). Reduced motion: the band holds still */
export function sweepVoid(ctx,S,R,ox,oy,t,reduce){
  const c=S.chase;if(!c||c.id!=='crystals'||!c.on||!Number.isFinite(c.y))return;
  const fy=c.y-R.at[1]*T-oy;if(fy<=0)return;
  const top=Math.floor(fy-24);if(top>0)px(ctx,0,0,'#000',VW,Math.min(VH,top));
  const tt=reduce?0:t>>2;
  const y0=Math.max(0,top),y1=Math.min(VH,Math.ceil(fy));if(y1<=y0)return;
  const img=ctx.getImageData(0,y0,VW,y1-y0),d=img.data,A=[232,241,255],V=rgb(G.v);   /* one read and one write for the band */
  for(let y=y0;y<y1;y++){const q=(fy-y)/24,wy=y+oy+R.at[1]*T,e=q*1.15-.08;
    for(let x=0;x<VW;x++){const h=hash((x>>1)+tt*7,(wy>>1)+tt*3),j=((y-y0)*VW+x)*4;
      if(h<e){d[j]=d[j+1]=d[j+2]=0}else if(h<e+.05&&q>.15){const c=(x+y+tt)&1?A:V;d[j]=c[0];d[j+1]=c[1];d[j+2]=c[2]}}}
  ctx.putImageData(img,0,y0);
}

/* ---------- the Undo item (yellow: a pickup) and its HUD mark; the band's pictogram ---------- */
/* a counter-clockwise arrow: a ring open at its upper left, the head on top pointing left */
const ARROW9=['..#......','.#####...','#######..','.##..###.','......##.','##....##.','##...###.','.######..','..####...'];
const outline=rows=>{const h=rows.length+2,w=rows[0].length+2,g=[...Array(h)].map(()=>Array(w).fill('.'));
  rows.forEach((r,j)=>[...r].forEach((c,i)=>{if(c==='#')g[j+1][i+1]='Y'}));
  for(let j=0;j<h;j++)for(let i=0;i<w;i++)if(g[j][i]==='.'&&[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>g[j+b]&&g[j+b][i+a]==='Y'))g[j][i]='k';
  for(let j=0;j<h;j++)for(let i=0;i<w;i++)if(g[j][i]==='Y'&&(j+1>=h||g[j+1][i]!=='Y'))g[j][i]='y';
  return g.map(r=>r.join(''))};
const UNDO_IT=outline(ARROW9),UP={k:INK,Y:YEL,y:YEL2};
function blit(ctx,rows,x,y,pal){for(let j=0;j<rows.length;j++)for(let i=0;i<rows[j].length;i++){const c=rows[j][i];if(c!=='.')px(ctx,x+i,y+j,pal[c])}}
export function undoItem(ctx,x,y,t){const b=Math.round(Math.sin(t*.06)*1.5);blit(ctx,UNDO_IT,x,y+b,UP);if((t>>3)%5===0)px(ctx,x+1+((t>>3)%3)*4,y-2+b,'#fff')}
export const undoHud=(ctx,x,y)=>blit(ctx,UNDO_IT,x,y,UP);
/* the band button's 14x14 pictogram (engine.js px(): one path, crispEdges), the same arrow larger */
export const UNDO_ICON=['....#.........','...###........','..#######.....','.#########....','..###...###...','...#.....###..','..........##..','##.........##.','##.........##.','.##.......##..','.###.....###..','..#########...','...#######....','..............'];
export const UNDO_PATH=UNDO_ICON.map((r,y)=>{let o='';for(let x=0;x<r.length;){if(r[x]!=='#'){x++;continue}let e=x;while(r[e]==='#')e++;o+=`M${x} ${y}h${e-x}v1h-${e-x}z`;x=e}return o}).join('');

/* ---------- editor-only and hush details ---------- */
/* Z (the Echo's start) is invisible in play; the room editor (S.edit) shows it as a faint standing silhouette */
export function echoMarker(ctx,R,ox,oy){
  if(!R.echo)return;const c=sprite(ghostLook(0,0,1)),P=pixels(c),sx=R.echo.tx*T+6-CX-ox,sy=(R.echo.ty+1)*T-1-SOLE-oy;
  for(const [x,y,kd] of P){const X=sx+x,Y=sy+y;if(X<0||Y<0||X>=VW||Y>=VH)continue;if(kd===0&&bay(X,Y)<.5)continue;px(ctx,X,Y,kd===2?EC.eye:kd===1?EC.k:EC.B)}
}
/* K9's hush before the core: the first pixels of the world are already missing in the room's corners (R.erase, 0..1: how
   far in they reach). Room-anchored dithered black, a few pale specks at its ragged edge; still under reduced motion */
export function voidCorners(ctx,R,ox,oy,t,reduce){
  const k=R.erase;if(!(k>0))return;const r=Math.round(28+k*60),W=R.w*T,H=R.h*T,tt=reduce?0:t>>3;
  for(const [cx,cy] of [[0,0],[W,0],[0,H],[W,H]]){
    const x0=Math.max(0,Math.min(cx,cx-r)-ox),x1=Math.min(VW,Math.max(cx,cx+r)-ox),y0=Math.max(0,Math.min(cy,cy-r)-oy),y1=Math.min(VH,Math.max(cy,cy+r)-oy);
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const d=Math.hypot(x+ox-cx,y+oy-cy)/r;if(d>=1)continue;const h=hash((x+ox)>>1,(y+oy)>>1),q=(1-d)*1.3;
      if(h<q-.15)px(ctx,x,y,'#000');else if(h<q-.1&&((x+y+tt)&3)===0)px(ctx,x,y,'#e8f1ff')}}
}
