/* The mascot, copied from os.js (drawBuddy/drawMac, 32x48) and trimmed to what the game uses. Plus a glitch tear. */
export const B4=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
export const INK='#1A1716';
const MB={B:'#F1E9D2',b:'#C9BFA5',Y:'#F6B92B',k:INK,r:'#FF3333',p:'#FF9A9A',R:'#B01E23',w:'#ffffff',m:'#7A0A12',n:'#0B5A55',T:'#3FC2B5',o:'#FFD94A',h:'#00393B',c:'#FF7A7A',H:'#FF2E88'};
const grid=(w,h)=>Array.from({length:h},()=>Array(w).fill('.'));
function stamp(g,pat,ox,oy){pat.forEach((r,y)=>{for(let x=0;x<r.length;x++){const c=r[x];if(c!=='.'&&g[oy+y]&&g[oy+y][ox+x]!==undefined)g[oy+y][ox+x]=c}})}
const paint=(ctx,g)=>{ctx.clearRect(0,0,32,48);for(let y=0;y<48;y++)for(let x=0;x<32;x++){const c=g[y][x];if(c!=='.'){ctx.fillStyle=MB[c];ctx.fillRect(x,y,1,1)}}};

/* the old dead-Mac icon, still red: a little computer with a crossed-out face */
function drawMac(ctx){
  const W=32,H=48,g=grid(W,H),X0=6,Y0=16,BW=20,BH=26;
  for(let y=Y0;y<Y0+BH;y++)for(let x=X0;x<X0+BW;x++){
    const edge=x===X0||x===X0+BW-1||y===Y0||y===Y0+BH-1,corner=(x===X0||x===X0+BW-1)&&(y===Y0||y===Y0+BH-1);if(corner)continue;
    g[y][x]=edge?'k':(x===X0+1||y===Y0+1)?'p':(x===X0+BW-2||y===Y0+BH-2)?'R':'r'}
  const SX=X0+3,SY=Y0+3,SW=14,SH=12;
  for(let y=SY;y<SY+SH;y++)for(let x=SX;x<SX+SW;x++)g[y][x]=(x===SX||x===SX+SW-1||y===SY||y===SY+SH-1)?'k':'w';
  stamp(g,["k.k",".k.","k.k"],SX+2,SY+3);stamp(g,["k.k",".k.","k.k"],SX+9,SY+3);
  stamp(g,["..kkkk..",".k....k."],SX+3,SY+8);
  for(let x=X0+4;x<X0+BW-4;x++)g[Y0+BH-7][x]='k';
  for(let x=X0+13;x<X0+BW-3;x++)g[Y0+BH-4][x]='k';
  paint(ctx,g);
}
/* body frames [rx,ry,oy]: the feet are two 4x2 blocks at x 9 and 19 (dx 0), top row y 31+oy+ry */
export const FR={idle:[11,11,0],breath:[11,10,1],squash:[13,8,3],stretch:[10,12,-2],land:[12,10,1]};
function drawBuddy(ctx,s){
  if(s.mac){drawMac(ctx);return}
  const W=32,H=48,g=grid(W,H);
  const fr=s.f==='squash2'?'land':s.f;
  const [rx,ry,oy]=FR[fr]||FR.idle;
  const cx=16+(s.dx|0),cy=31+oy,ph=fr==='breath'?1.6:.5;
  const fy=cy+ry;for(const fx of [cx-7,cx+3])for(let i=0;i<4;i++)for(let j=0;j<2;j++)if(g[fy+j])g[fy+j][fx+i]='k';
  /* wobbly outline: the radius ripples with angle, and the ripple shifts each breath so the line boils */
  const ins=(x,y)=>{const dx=(x+.5-cx)/rx,dy=(y+.5-cy)/ry,r=1+.05*Math.sin(9*Math.atan2(dy,dx)+ph);return dx*dx+dy*dy<=r*r};
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(!ins(x,y))continue;
    if(!ins(x-1,y)||!ins(x+1,y)||!ins(x,y-1)||!ins(x,y+1)){g[y][x]='k';continue}
    const nx=(x+.5-cx)/rx,ny=(y+.5-cy)/ry;g[y][x]=Math.hypot(nx+.42,ny+.46)<.3?'p':Math.hypot(nx+.2,ny+.24)>.98?'R':'r'}
  /* sprout: grows once he carries the root seed. sp (A11): its lag in px; each row above his top leans k/3 of it */
  const st=s.stage|0,len=[0,3,5,7,8][st],top=cy-ry,sp=s.sp|0,ln=y=>Math.round(sp*Math.min(1,(top-y)/3));
  const lean=(pat,ox,oy)=>pat.forEach((r,j)=>stamp(g,[r],ox+ln(oy+j),oy+j));
  for(let i=1;i<=len;i++)g[top-i]&&(g[top-i][cx+ln(top-i)]='n');
  if(st>=1)lean(["kk...","kTTk.",".kTTk"],cx-5,top-3);
  if(st>=2)lean(["...kk",".kTTk","kTTk."],cx+1,top-5);
  /* eyes snap to 8 directions */
  const ey=cy-3,[dx,dy]=s.dir||[0,0];
  for(const ex of [cx-5,cx+4]){
    if(s.blink){for(let x=ex-2;x<=ex+1;x++)g[ey+1][x]='k';continue}
    for(let y=ey-3;y<=ey+3;y++)for(let x=ex-3;x<=ex+2;x++){const edge=y===ey-3||y===ey+3||x===ex-3||x===ex+2;const corner=(y===ey-3||y===ey+3)&&(x===ex-3||x===ex+2);if(corner)continue;g[y][x]=edge?'k':'w'}
    if(s.face==='scared'){g[ey][ex-1]=g[ey+1][ex-1]='k'}
    else if(s.face==='awe'){for(let y=ey-2;y<=ey+2;y++)for(let x=ex-2;x<=ex+1;x++)g[y][x]='k';g[ey-2][ex-1]='w';g[ey-1][ex-1]='w'}
    else if(s.face==='beg'){for(let y=ey-2;y<=ey+2;y++)for(let x=ex-2;x<=ex+1;x++)g[y][x]='k';g[ey-2][ex-2]=g[ey-2][ex-1]=g[ey-1][ex-2]='w';g[ey+1][ex+1]='w';g[ey+4]&&(g[ey+4][ex+1]='T')}   /* begging: big wet shining eyes */
    else{for(let y=0;y<2;y++)for(let x=0;x<2;x++)g[ey-1+dy+y][ex-1+dx+x]='k'}
  }
  g[cy+1][cx-9]=g[cy+1][cx-8]='c';g[cy+1][cx+7]=g[cy+1][cx+8]='c';
  const my=cy+3;
  if(s.face==='scared'){for(let yy=my-1;yy<=my+3;yy++)for(let xx=cx-3;xx<=cx+2;xx++)g[yy][xx]=(yy>my-1&&yy<my+3&&xx>cx-3&&xx<cx+2)?'m':'k'}
  else if(s.face==='huh'){g[my][cx-1]=g[my][cx]=g[my+1][cx-1]=g[my+1][cx]='k'}
  else if(s.face==='awe'){for(let yy=my-1;yy<=my+5;yy++)for(let xx=cx-3;xx<=cx+2;xx++){const e=yy===my-1||yy===my+5||xx===cx-3||xx===cx+2,c=(yy===my-1||yy===my+5)&&(xx===cx-3||xx===cx+2);if(c)continue;g[yy][xx]=e?'k':'m'}}
  else if(s.mouth){for(let yy=my-1;yy<=my+2;yy++)for(let xx=cx-2;xx<=cx+1;xx++)g[yy][xx]=(yy>=my&&yy<=my+1&&xx>=cx-1&&xx<=cx)?'m':'k'}
  else if(s.happy){g[my][cx-2]='k';g[my][cx-1]='m';g[my][cx]='m';g[my][cx+1]='k';g[my+1][cx-1]='k';g[my+1][cx]='k'}
  else if(s.face==='beg'){g[my][cx-1]=g[my][cx]='k';g[my+1][cx-2]=g[my+1][cx+1]='k'}
  else{g[my][cx-1]=g[my][cx]='k'}
  /* the OS's accessories (drawBuddy in os.js, same grids and offsets): skull mask, party hat, tiny crown, sunglasses */
  if(s.mask){
    for(let y=ey-4;y<=cy+8;y++)for(let x=cx-10;x<=cx+9;x++){if(!ins(x,y)||!ins(x-1,y)||!ins(x+1,y)||!ins(x,y-1)||!ins(x,y+1))continue;g[y][x]=x>cx+3?'b':'B'}
    for(const ex of [cx-5,cx+4])for(let y=ey-3;y<=ey+3;y++)for(let x=ex-3;x<=ex+2;x++){const a=(x+.5-ex+.5)/3.2,b=(y-ey)/3.6;if(a*a+b*b<=1)g[y][x]='k'}
    for(const ex of [cx-5,cx+4]){g[ey-1][ex-1]='B'}
    g[cy+1][cx-1]=g[cy+1][cx]='k';g[cy+2][cx-1]=g[cy+2][cx]='k';g[cy+3][cx-2]=g[cy+3][cx+1]='k';
    for(let x=cx-5;x<=cx+4;x++)g[cy+5][x]='k';for(let x=cx-5;x<=cx+4;x+=2)for(let y=cy+6;y<=cy+7;y++)if(g[y][x]==='B'||g[y][x]==='b')g[y][x]='k'}
  /* begging: hands pressed together under the chin */
  if(s.face==='beg')stamp(g,[".kkkkkk.","kppkkppk","kppkkppk","kpckkcpk",".kkkkkk."],cx-4,cy+5);
  if(s.hat==='party'||s.hat==='crown'){
    const topAt=xc=>{for(let y=0;y<H;y++)if(ins(xc,y))return y;return cy-ry};
    if(s.hat==='party')stamp(g,["....w....","...kok...","...kHk...","..kkokk..","..kHHHk..",".kkokokk.",".kHHHHHk.","kkkkkkkkk"],cx+1,topAt(cx+5)-6);
    else stamp(g,["k...k...k","kY.kYk.Yk","kYkkYkkYk","kYYYYYYYk","kYoYHYoYk","kkkkkkkkk"],cx-10,topAt(cx-6)-4)}
  if(s.hat==='shades'){for(const ex of [cx-5,cx+4]){for(let y=ey-2;y<=ey+2;y++)for(let x=ex-3;x<=ex+2;x++)g[y][x]='k';g[ey-1][ex-2]='w';g[ey-2][ex-1]='w'}g[ey-1][cx-2]=g[ey-1][cx-1]=g[ey-1][cx]='k';g[ey-1][cx-9]='k';g[ey-1][cx+7]='k'}
  paint(ctx,g);
}

const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const cache=new Map();
/* a cached 32x48 canvas for a look {f,dir,blink,face,happy,mouth,mac,dx,stage,sp} */
export function sprite(s){
  const k=s.mac?'mac':[s.f,s.dir&&s.dir.join(),s.blink|0,s.face||'',s.happy|0,s.mouth|0,s.dx|0,s.stage|0,s.hat||'',s.mask|0,s.sp|0].join('|');
  let c=cache.get(k);
  if(!c){c=mk(32,48);drawBuddy(c.getContext('2d',{willReadFrequently:true}),s);   /* glitch() reads these back */if(cache.size>300)cache.clear();cache.set(k,c)}
  return c;
}

/* RGB split, row tears and a Bayer dropout over a 32x48 sprite; returns a 40x48 canvas (draw 4px left) */
let gc=null,gx=null;
export function glitch(src,k,seed){
  if(!gc){gc=mk(40,48);gx=gc.getContext('2d')}
  const w=32,h=48,s=src.getContext('2d').getImageData(0,0,w,h).data,out=gx.createImageData(40,h),o=out.data;
  let r=(seed*7919+13)%2147483647||1;const rn=()=>(r=(r*16807)%2147483647)/2147483647;
  const sh=new Array(h).fill(0);
  for(let n=0;n<3+k*6;n++){const y0=rn()*h|0,len=2+(rn()*6|0),dx=Math.round((rn()-.5)*10*k);for(let y=y0;y<Math.min(h,y0+len);y++)sh[y]=dx}
  const sp=Math.max(1,Math.round(2*k));
  for(let y=0;y<h;y++)for(let x=0;x<40;x++){
    const sx=x-4-sh[y],at=xx=>xx>=0&&xx<w?(y*w+xx)*4:-1,iR=at(sx-sp),iG=at(sx),iB=at(sx+sp);
    const a=Math.max(iR<0?0:s[iR+3],iG<0?0:s[iG+3],iB<0?0:s[iB+3]);
    if(!a||(B4[(y&3)*4+(x&3)]+.5)/16<k*.4)continue;
    const j=(y*40+x)*4;o[j]=iR<0?0:s[iR];o[j+1]=iG<0?0:s[iG+1];o[j+2]=iB<0?0:s[iB+2];o[j+3]=255;
  }
  gx.putImageData(out,0,0);return gc;
}
