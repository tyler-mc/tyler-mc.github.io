/* The mascot's pixels, shared by the OS desktop buddy (os.js, through mascot/atlas.classic.js) and, later, the Wake Up game.
   One 32x48 cell, one char per pixel ('.' clear, colours in MB). compose(look) returns the grid and touches no DOM, so node can test it;
   paint(ctx, grid) draws one. This is the OS drawBuddy moved out of os.js with no pixel changed (tools/test_mascot.mjs holds the proof).
   After editing, run: python3 tools/build_mascot.py */
export const INK='#1A1716';
export const W=32,H=48;
export const grid=(w,h)=>Array.from({length:h},()=>Array(w).fill('.'));
export function stamp(g,pat,ox,oy){pat.forEach((r,y)=>{for(let x=0;x<r.length;x++){const c=r[x];if(c!=='.'&&g[oy+y]&&g[oy+y][ox+x]!==undefined)g[oy+y][ox+x]=c}})}
export const MB={B:'#F1E9D2',b:'#C9BFA5',Y:'#F6B92B',k:INK,r:'#FF3333',p:'#FF9A9A',R:'#B01E23',w:'#ffffff',m:'#7A0A12',n:'#0B5A55',T:'#3FC2B5',o:'#FFD94A',h:'#00393B',c:'#FF7A7A',H:'#FF2E88'};
/* the old dead-Mac icon, still red: a little computer with a crossed-out face */
function composeMac(){
  const W=32,H=48,g=grid(W,H),X0=6,Y0=16,BW=20,BH=26;
  for(let y=44;y<48;y++)for(let x=4;x<28;x++){const dx=(x+.5-16)/12,dy=(y+.5-45.5)/2.4;if(dx*dx+dy*dy>1)continue;if(y%2===1&&(x%4===0))g[y][x]='h'}
  for(let y=Y0;y<Y0+BH;y++)for(let x=X0;x<X0+BW;x++){
    const edge=x===X0||x===X0+BW-1||y===Y0||y===Y0+BH-1,corner=(x===X0||x===X0+BW-1)&&(y===Y0||y===Y0+BH-1);if(corner)continue;
    g[y][x]=edge?'k':(x===X0+1||y===Y0+1)?'p':(x===X0+BW-2||y===Y0+BH-2)?'R':'r'}
  const SX=X0+3,SY=Y0+3,SW=14,SH=12;
  for(let y=SY;y<SY+SH;y++)for(let x=SX;x<SX+SW;x++)g[y][x]=(x===SX||x===SX+SW-1||y===SY||y===SY+SH-1)?'k':'w';
  stamp(g,["k.k",".k.","k.k"],SX+2,SY+3);stamp(g,["k.k",".k.","k.k"],SX+9,SY+3);
  stamp(g,["..kkkk..",".k....k."],SX+3,SY+8);
  for(let x=X0+4;x<X0+BW-4;x++)g[Y0+BH-7][x]='k';
  for(let x=X0+13;x<X0+BW-3;x++)g[Y0+BH-4][x]='k';
  return g
}
export function compose(s){
  if(s.mac)return composeMac();
  const W=32,H=48,g=grid(W,H);
  const fr=s.hop>0?'hop':s.f==='squash2'?'land':s.f;
  const [rx,ry,oy]={idle:[11,11,0],breath:[11,10,1],squash:[13,8,3],stretch:[10,12,-2],hop:[10,12,-6],land:[12,10,1]}[fr]||[11,11,0];
  const cx=16+(s.dx|0),cy=31+oy,ph=fr==='breath'?1.6:.5;
  if(!s.air)for(let y=43;y<48;y++)for(let x=3;x<29;x++){const dx=(x+.5-16)/12,dy=(y+.5-45.5)/2.4,e=dx*dx+dy*dy;if(e>1)continue;
    const p2=(y>>1)&1?2:0;if(y%2===1&&((x+p2)%4===0||(e<.5&&(x+p2)%4===1)))g[y][x]='h'}
  const fy=cy+ry;if(fr!=='hop')for(const fx of [cx-7,cx+3])for(let i=0;i<4;i++)for(let j=0;j<2;j++)if(g[fy+j])g[fy+j][fx+i]='k';
  /* wobbly outline: the radius ripples with angle, and the ripple shifts each breath so the line boils */
  const ins=(x,y)=>{const dx=(x+.5-cx)/rx,dy=(y+.5-cy)/ry,r=1+.05*Math.sin(9*Math.atan2(dy,dx)+ph);return dx*dx+dy*dy<=r*r};
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(!ins(x,y))continue;
    if(!ins(x-1,y)||!ins(x+1,y)||!ins(x,y-1)||!ins(x,y+1)){g[y][x]='k';continue}
    const nx=(x+.5-cx)/rx,ny=(y+.5-cy)/ry;g[y][x]=Math.hypot(nx+.42,ny+.46)<.3?'p':Math.hypot(nx+.2,ny+.24)>.98?'R':'r'}
  /* sprout grows with seeds planted */
  const st=s.stage,pop=s.sp|0,len=[0,3,5,7,8][st]+pop,top=cy-ry;
  for(let i=1;i<=len;i++)g[top-i]&&(g[top-i][cx]='n');
  if(st>=1||pop)stamp(g,["kk...","kTTk.",".kTTk"],cx-5,top-3);
  if(st>=2)stamp(g,["...kk",".kTTk","kTTk."],cx+1,top-5);
  if(st>=3)stamp(g,["kk...","kTTk.",".kTTk"],cx-5,top-7);
  if(st>=4)stamp(g,[".kkk.","kpork","krork","krRRk",".kkk."],cx-2,top-len-4);
  /* eyes snap to 8 directions */
  const ey=cy-3,[dx,dy]=s.dir;
  for(const ex of [cx-5,cx+4]){
    if(s.face==='yuck'){const L=ex<cx;for(let k=0;k<5;k++){const o=k<3?k:4-k;const xx=L?ex-2+o:ex+1-o,yy=ey-1+k;g[yy][xx]='k';g[yy][xx+(L?1:-1)]='k'}continue}
    if(s.blink||s.sleep){for(let x=ex-2;x<=ex+1;x++)g[ey+1][x]='k';continue}
    for(let y=ey-3;y<=ey+3;y++)for(let x=ex-3;x<=ex+2;x++){const edge=y===ey-3||y===ey+3||x===ex-3||x===ex+2;const corner=(y===ey-3||y===ey+3)&&(x===ex-3||x===ex+2);if(corner)continue;g[y][x]=edge?'k':'w'}
    if(s.face==='scared'){g[ey][ex-1]=g[ey+1][ex-1]='k'}
    else if(s.face==='love'){[".H.H.","HHHHH",".HHH.","..H.."].forEach((row,yy)=>{for(let xx=0;xx<5;xx++)if(row[xx]==='H')g[ey-1+yy][ex-2+xx]='H'})}
    else if(s.face==='awe'){for(let y=ey-2;y<=ey+2;y++)for(let x=ex-2;x<=ex+1;x++)g[y][x]='k';g[ey-2][ex-1]='w';g[ey-1][ex-1]='w'}
    else if(s.pens){for(let x=ex-2;x<=ex+1;x++){g[ey-2][x]='r';g[ey-1][x]='r';g[ey][x]='k'}g[ey+1][ex-1]=g[ey+1][ex]='k';
      const L=ex<cx;[[ex-2,L?ey-5:ey-6],[ex-1,L?ey-5:ey-6],[ex,L?ey-6:ey-5],[ex+1,L?ey-6:ey-5]].forEach(([a,b])=>{if(g[b])g[b][a]='k'})}
    else{for(let y=0;y<2;y++)for(let x=0;x<2;x++)g[ey-1+dy+y][ex-1+dx+x]='k'}
  }
  g[cy+1][cx-9]=g[cy+1][cx-8]='c';g[cy+1][cx+7]=g[cy+1][cx+8]='c';
  const my=cy+3;
  if(s.face==='scared'){for(let yy=my-1;yy<=my+3;yy++)for(let xx=cx-3;xx<=cx+2;xx++)g[yy][xx]=(yy>my-1&&yy<my+3&&xx>cx-3&&xx<cx+2)?'m':'k'}
  else if(s.face==='huh'){g[my][cx-1]=g[my][cx]=g[my+1][cx-1]=g[my+1][cx]='k'}
  else if(s.face==='yuck'){[[-3,1],[-2,0],[-1,1],[0,0],[1,1],[2,0]].forEach(([a,b])=>{g[my+b][cx+a]='k'});[[0,2],[1,2],[0,3]].forEach(([a,b])=>{g[my+b][cx+a]='T'});g[my+4]&&(g[my+4][cx]='k')}
  else if(s.face==='awe'){for(let yy=my-1;yy<=my+5;yy++)for(let xx=cx-3;xx<=cx+2;xx++){const e=yy===my-1||yy===my+5||xx===cx-3||xx===cx+2,c=(yy===my-1||yy===my+5)&&(xx===cx-3||xx===cx+2);if(c)continue;g[yy][xx]=e?'k':'m'}}
  else if(s.gape){const gw=Math.min(7,2+Math.round(s.gape*1.2)),gh=Math.min(6,1+Math.round(s.gape*1.2));for(let yy=my-1;yy<=my+gh+1;yy++)for(let xx=cx-gw-1;xx<=cx+gw;xx++){const e=yy===my-1||yy===my+gh+1||xx===cx-gw-1||xx===cx+gw;g[yy][xx]=e?'k':'m'}}
  else if(s.pens&&!s.face){for(let k=-2;k<=1;k++)g[my+1][cx+k]='k';g[my][cx+2]='k'}
  else if(s.mouth){for(let yy=my-1;yy<=my+2;yy++)for(let xx=cx-2;xx<=cx+1;xx++)g[yy][xx]=(yy>=my&&yy<=my+1&&xx>=cx-1&&xx<=cx)?'m':'k'}
  else if(s.happy){g[my][cx-2]='k';g[my][cx-1]='m';g[my][cx]='m';g[my][cx+1]='k';g[my+1][cx-1]='k';g[my+1][cx]='k'}
  else{g[my][cx-1]=g[my][cx]='k'}
  if(s.hold)stamp(g,["kkkkk","krrrk","kkkkk"],s.hold>0?cx+rx-2:cx-rx-2,cy-2);
  if(s.face==='love'){g[cy+2][cx-9]=g[cy+2][cx-8]=g[cy+2][cx+7]=g[cy+2][cx+8]='c'}
  if(s.heart){const hp=(hx,hy)=>["H.H","HHH",".H."].forEach((row,yy)=>{for(let xx=0;xx<3;xx++)if(row[xx]==='H'&&g[hy+yy]&&g[hy+yy][hx+xx]!==undefined)g[hy+yy][hx+xx]='H'});
    const by=Math.max(0,cy-ry-3-s.heart*3);hp(cx+8,by);hp(cx-11,by+6)}
  if(s.sweat){[[8,0],[9,0],[8,1],[9,1],[8,2],[9,2],[9,3]].forEach(([a,b])=>{const yy=cy-ry+2+b,xx=cx+a;if(g[yy]&&g[yy][xx]!==undefined)g[yy][xx]='T'})}
  if(s.q){[".XX.","X..X","..X.",".X..","....",".X.."].forEach((row,yy)=>{for(let xx=0;xx<4;xx++)if(row[xx]==='X'){const Y=Math.max(0,cy-ry-9)+yy,X=cx+7+xx;if(g[Y]&&g[Y][X]!==undefined)g[Y][X]='o'}})}
  if(s.mask){
    for(let y=ey-4;y<=cy+8;y++)for(let x=cx-10;x<=cx+9;x++){if(!ins(x,y)||!ins(x-1,y)||!ins(x+1,y)||!ins(x,y-1)||!ins(x,y+1))continue;g[y][x]=x>cx+3?'b':'B'}
    for(const ex of [cx-5,cx+4])for(let y=ey-3;y<=ey+3;y++)for(let x=ex-3;x<=ex+2;x++){const a=(x+.5-ex+.5)/3.2,b=(y-ey)/3.6;if(a*a+b*b<=1)g[y][x]='k'}
    for(const ex of [cx-5,cx+4]){g[ey-1][ex-1]='B'}
    g[cy+1][cx-1]=g[cy+1][cx]='k';g[cy+2][cx-1]=g[cy+2][cx]='k';g[cy+3][cx-2]=g[cy+3][cx+1]='k';
    for(let x=cx-5;x<=cx+4;x++)g[cy+5][x]='k';for(let x=cx-5;x<=cx+4;x+=2)for(let y=cy+6;y<=cy+7;y++)if(g[y][x]==='B'||g[y][x]==='b')g[y][x]='k'}
  if(s.hat==='party'||s.hat==='crown'){
    const topAt=xc=>{for(let y=0;y<H;y++)if(ins(xc,y))return y;return cy-ry};
    if(s.hat==='party')stamp(g,["....w....","...kok...","...kHk...","..kkokk..","..kHHHk..",".kkokokk.",".kHHHHHk.","kkkkkkkkk"],cx+1,topAt(cx+5)-6);
    else stamp(g,["k...k...k","kY.kYk.Yk","kYkkYkkYk","kYYYYYYYk","kYoYHYoYk","kkkkkkkkk"],cx-10,topAt(cx-6)-4)}
  if(s.hat==='shades'){for(const ex of [cx-5,cx+4]){for(let y=ey-2;y<=ey+2;y++)for(let x=ex-3;x<=ex+2;x++)g[y][x]='k';g[ey-1][ex-2]='w';g[ey-2][ex-1]='w'}g[ey-1][cx-2]=g[ey-1][cx-1]=g[ey-1][cx]='k';g[ey-1][cx-9]='k';g[ey-1][cx+7]='k'}
  return g
}

export function paint(ctx,g){
  ctx.clearRect(0,0,W,H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const c=g[y][x];if(c!=='.'){ctx.fillStyle=MB[c];ctx.fillRect(x,y,1,1)}}
}
export const drawBuddy=(ctx,s)=>paint(ctx,compose(s));
