/* The mascot's pixels, shared by the OS desktop buddy (os.js, through mascot/atlas.classic.js) and, later, the Wake Up game.
   One 32x48 cell, one char per pixel ('.' clear, colours in MB). compose(look) returns the grid and touches no DOM, so node can test it;
   paint(ctx, grid) draws one. This is the OS drawBuddy moved out of os.js with no pixel changed (tools/test_mascot.mjs holds the proof).
   After editing, run: python3 tools/build_mascot.py */
import {BODY} from './body.js';
import {FEET} from './feet.js';
import {LEAN} from './lean.js';
import {HANDS} from './hands.js';
import {FACES,LIDS} from './faces.js';
import {ANIM_TRASH} from './anim_trash.js';
import {ANIM_DANCE} from './anim_dance.js';
import {ANIM_MAC} from './anim_mac.js';
import {ANIM_WALK} from './anim_walk.js';
import {ANIM_GROUND} from './anim_ground.js';
import {ANIM_SURF} from './anim_surf.js';
import {ANIM_ROOT} from './anim_root.js';
import {ANIM_FX} from './anim_fx.js';
export const INK='#1A1716';
export const W=32,H=48;
const LVMAP={idle:'rest',breath:'breath',squash:'S3',stretch:'T2',land:'S1',hop:'T3'};
export const grid=(w,h)=>Array.from({length:h},()=>Array(w).fill('.'));
export function stamp(g,pat,ox,oy){pat.forEach((r,y)=>{for(let x=0;x<r.length;x++){const c=r[x];if(c!=='.'&&g[oy+y]&&g[oy+y][ox+x]!==undefined)g[oy+y][ox+x]=c}})}
export const MB={B:'#F1E9D2',b:'#C9BFA5',Y:'#F6B92B',k:INK,r:'#FF3333',p:'#FF9A9A',R:'#B01E23',w:'#ffffff',m:'#7A0A12',n:'#0B5A55',T:'#3FC2B5',o:'#FFD94A',h:'#00393B',c:'#FF7A7A',H:'#FF2E88',u:'#CF9A62',U:'#965F34',v:'#6E4324',V:'#2B1B10',a:'#7A5030',A:'#A2744A',g:'#7D8A38',G:'#9FD45A',e:'#22160D'};
/* u U v V = the root shoe (light, body, shade, sole); a A = root (body, light); g G = olive and fresh green root tips; e = dark root outline (the game's SHOE_P and ROOT palettes) */
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
/* authored whole-sprite frames: s.pose='name:index' ('trash:2'), s.flip mirrors it. A frame is {x0,y0,v:[rows],feet:[[x,y,rows],..],fcx,cy} like a LEAN frame; baked:true
   means the face (and sprout, hat) are already drawn into the rows and compose adds nothing on top. See lintPoseFrames in tools/lint_mascot_body.mjs. */
const ANIMS={trash:ANIM_TRASH,dance:ANIM_DANCE,mac:ANIM_MAC,walk:ANIM_WALK,ground:ANIM_GROUND,surf:ANIM_SURF,root:ANIM_ROOT};
function poseFrame(p){const [n,i]=String(p).split(':'),A=ANIMS[n];return A&&A.frames&&A.frames[i|0]||null}
export function compose(s){
  if(s.mac)return composeMac();
  const PF0=s.pose?poseFrame(s.pose):null;   /* a pose frame may declare a taller cell (cellH, e.g. 72 for the root jump whose roots hang far below) */
  const W=32,H=(PF0&&PF0.cellH)||48,g=grid(W,H);
  const fr=s.hop>0?'hop':s.f==='squash2'?'land':s.f;
  /* s.lean = -3..3 hangs him leaning (mascot/lean.js: 12, 25 and 40 degrees to the right, negative = the mirror image, drawn here by flipping every row): the body and feet
     are the authored frame, the face is drawn upright at its anchor. 0 is the plain hang, which the caller poses as lv T2 with loose feet. */
  const ln=s.lean|0,PF=PF0,LF=PF||(ln?LEAN['l'+Math.abs(ln)]:null),mir=PF?!!s.flip:ln<0,flip=r=>[...r].reverse().join('');
  /* the body is an authored one from mascot/body.js (grounded: its last row is row 41): s.lv names it, else the old pose name f picks one (LVMAP), s.bv picks the boil variant.
     s.old forces the old computed ellipse (kept for tools/test_mascot.mjs, which proves the extraction against it). A 'hop' pose floats 6 px up with its feet hidden, as before. */
  const lk=s.old||LF?null:(s.lv||LVMAP[fr]||'rest'),lv=lk&&BODY[lk],rows=LF?LF.v[(s.bv|0)%LF.v.length].map(r=>mir?flip(r):r):lv&&lv.v[(s.bv|0)%lv.v.length],bw=rows?rows[0].length:0,bh=rows?rows.length:0,up=lv&&!s.lv&&fr==='hop'?6:0,by=LF?LF.y0:42-bh-up;
  const [rx,ry,oy]=LF?[bw/2,LF.cy-by,0]:lv?[bw/2,lv.cy-up-by,0]:{idle:[11,11,0],breath:[11,10,1],squash:[13,8,3],stretch:[10,12,-2],hop:[10,12,-6],land:[12,10,1]}[fr]||[11,11,0];
  const cx=LF?(mir?33-LF.fcx:LF.fcx)+(s.dx|0):16+(s.dx|0),cy=LF?LF.cy:lv?lv.cy-up:31+oy,ph=fr==='breath'?1.6:.5,bx=LF?(mir?32-LF.x0-bw:LF.x0)+(s.dx|0):cx-bw/2;
  if(!s.air)for(let y=43;y<48;y++)for(let x=3;x<29;x++){const dx=(x+.5-16)/12,dy=(y+.5-45.5)/2.4,e=dx*dx+dy*dy;if(e>1)continue;
    const p2=(y>>1)&1?2:0;if(y%2===1&&((x+p2)%4===0||(e<.5&&(x+p2)%4===1)))g[y][x]='h'}
  /* feet: s.ft names an authored pose in mascot/feet.js (rows of 'k' per foot, x from cx, y from the row under the body); without it the two fixed 4x2 blocks */
  const fy=lv?by+bh:cy+ry,fp=s.ft&&FEET[s.ft];
  if(LF)for(const [fx0,fy0,fr0] of LF.feet||[]){const w=fr0[0].length,x0=(mir?32-fx0-w:fx0)+(s.dx|0);fr0.forEach((r,j)=>{const rr=mir?flip(r):r;for(let i=0;i<w;i++)if(rr[i]==='k'&&g[fy0+j]&&g[fy0+j][x0+i]!==undefined)g[fy0+j][x0+i]='k'})}
  else if(fp)for(const [fx,fo,rows] of fp)rows.forEach((r,j)=>{for(let i=0;i<r.length;i++)if(r[i]==='k'&&g[fy+fo+j]&&g[fy+fo+j][cx+fx+i]!==undefined)g[fy+fo+j][cx+fx+i]='k'});
  else if(fr!=='hop')for(const fx of [cx-7,cx+3])for(let i=0;i<4;i++)for(let j=0;j<2;j++)if(g[fy+j])g[fy+j][fx+i]='k';
  /* wobbly outline: the radius ripples with angle, and the ripple shifts each breath so the line boils */
  const ins=rows?(x,y)=>{const r=rows[y-by];return !!r&&r[x-bx]!==undefined&&r[x-bx]!=='.'}
    :(x,y)=>{const dx=(x+.5-cx)/rx,dy=(y+.5-cy)/ry,r=1+.05*Math.sin(9*Math.atan2(dy,dx)+ph);return dx*dx+dy*dy<=r*r};
  if(rows)rows.forEach((r,y)=>{for(let x=0;x<bw;x++)if(r[x]!=='.'&&g[by+y]&&g[by+y][bx+x]!==undefined)g[by+y][bx+x]=r[x]});
  else for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(!ins(x,y))continue;
    if(!ins(x-1,y)||!ins(x+1,y)||!ins(x,y-1)||!ins(x,y+1)){g[y][x]='k';continue}
    const nx=(x+.5-cx)/rx,ny=(y+.5-cy)/ry;g[y][x]=Math.hypot(nx+.42,ny+.46)<.3?'p':Math.hypot(nx+.2,ny+.24)>.98?'R':'r'}
  /* a frame may carry an overlay (over:{x0,y0,rows}, any palette char): a face, a screen, a shadow drawn on top of the body rows; it is flipped with the frame */
  if(LF&&LF.over){const o=LF.over,w=o.rows[0].length;stamp(g,mir?o.rows.map(flip):o.rows,(mir?32-o.x0-w:o.x0)+(s.dx|0),o.y0)}
  if(LF&&LF.baked)return g;   /* a baked frame is the whole sprite */
  /* sprout grows with seeds planted */
  const st=s.stage,pop=s.sp|0,len=[0,3,5,7,8][st]+pop,top=LF?(()=>{for(let y=0;y<H;y++)if(ins(cx,y))return y;return by})():cy-ry;
  for(let i=1;i<=len;i++)g[top-i]&&(g[top-i][cx]='n');
  if(st>=1||pop)stamp(g,["kk...","kTTk.",".kTTk"],cx-5,top-3);
  if(st>=2)stamp(g,["...kk",".kTTk","kTTk."],cx+1,top-5);
  if(st>=3)stamp(g,["kk...","kTTk.",".kTTk"],cx-5,top-7);
  if(st>=4)stamp(g,[".kkk.","kpork","krork","krRRk",".kkk."],cx-2,top-len-4);
  /* eyes snap to 8 directions */
  const ey=cy-3,[dx,dy]=s.dir;
  /* the Unreleased program's pensive look (look.pens) used to be heavy lids and a side smirk, which read as smug: it is now the nervous 'worry' face (brows up and in, small eyes, a wobbly mouth) unless a face is named. look.old keeps the legacy drawing for the pixel-identity test. */
  const FA=FACES[s.face||(s.pens&&!s.old?'worry':'')];   /* an authored face (mascot/faces.js): eye box rows {eye,eyeR?} and mouth {rows,ox,oy} replace the drawn ones */
  for(const ex of [cx-5,cx+4]){
    if(FA&&FA.eye){const rr=(ex>cx&&FA.eyeR)||FA.eye;stamp(g,rr,ex-3,ey-3);continue}
    if(s.face==='yuck'){const L=ex<cx;for(let k=0;k<5;k++){const o=k<3?k:4-k;const xx=L?ex-2+o:ex+1-o,yy=ey-1+k;g[yy][xx]='k';g[yy][xx+(L?1:-1)]='k'}continue}
    if(s.blink||s.sleep){for(let x=ex-2;x<=ex+1;x++)g[ey+1][x]='k';continue}
    for(let y=ey-3;y<=ey+3;y++)for(let x=ex-3;x<=ex+2;x++){const edge=y===ey-3||y===ey+3||x===ex-3||x===ex+2;const corner=(y===ey-3||y===ey+3)&&(x===ex-3||x===ex+2);if(corner)continue;g[y][x]=edge?'k':'w'}
    if(s.face==='scared'){g[ey][ex-1]=g[ey+1][ex-1]='k'}
    else if(s.face==='love'){[".H.H.","HHHHH",".HHH.","..H.."].forEach((row,yy)=>{for(let xx=0;xx<5;xx++)if(row[xx]==='H')g[ey-1+yy][ex-2+xx]='H'})}
    else if(s.face==='awe'){/* enlarged pupils, not black eyes: the normal 2x2 pupil grown to 2x3 inside a white eye (the 4x5 white interior cannot hold a wider one without merging into the ink border) */
      for(let y=0;y<3;y++)for(let x=0;x<2;x++)g[ey-1+dy+y][ex-1+dx+x]='k'}
    else if(s.pens){for(let x=ex-2;x<=ex+1;x++){g[ey-2][x]='r';g[ey-1][x]='r';g[ey][x]='k'}g[ey+1][ex-1]=g[ey+1][ex]='k';
      const L=ex<cx;[[ex-2,L?ey-5:ey-6],[ex-1,L?ey-5:ey-6],[ex,L?ey-6:ey-5],[ex+1,L?ey-6:ey-5]].forEach(([a,b])=>{if(g[b])g[b][a]='k'})}
    else{for(let y=0;y<2;y++)for(let x=0;x<2;x++)g[ey-1+dy+y][ex-1+dx+x]='k'
      if(s.lid&&LIDS[s.lid-1])stamp(g,LIDS[s.lid-1],ex-2,ey-2)}   /* an eyelid (mascot/faces.js LIDS): rows over the 4x5 white interior, only over the plain pupil; '.' leaves the eye as drawn */
  }
  /* a pose frame may hide one cheek (hideCheek:-1 = the authored-left pair, +1 = the right; negated when flipped): the near cheek of a 3/4 turn */
  const hc=LF&&LF.hideCheek?(mir?-LF.hideCheek:LF.hideCheek):0;
  if(hc!==-1)g[cy+1][cx-9]=g[cy+1][cx-8]='c';if(hc!==1)g[cy+1][cx+7]=g[cy+1][cx+8]='c';
  const my=cy+3;
  if(FA&&FA.mouth)stamp(g,FA.mouth.rows,cx+(FA.mouth.ox|0),my+(FA.mouth.oy|0));
  else if(s.face==='scared'){for(let yy=my-1;yy<=my+3;yy++)for(let xx=cx-3;xx<=cx+2;xx++)g[yy][xx]=(yy>my-1&&yy<my+3&&xx>cx-3&&xx<cx+2)?'m':'k'}
  else if(s.face==='huh'){g[my][cx-1]=g[my][cx]=g[my+1][cx-1]=g[my+1][cx]='k'}
  else if(s.face==='yuck'){[[-3,1],[-2,0],[-1,1],[0,0],[1,1],[2,0]].forEach(([a,b])=>{g[my+b][cx+a]='k'});[[0,2],[1,2],[0,3]].forEach(([a,b])=>{g[my+b][cx+a]='T'});g[my+4]&&(g[my+4][cx]='k')}
  else if(s.face==='awe'){let bot=my+5;
    /* on a squashed authored body the tall mouth would reach the outline: shorten it until its whole box is body colour */
    if(rows)while(bot>my+2&&!(()=>{for(let yy=my-1;yy<=bot;yy++)for(let xx=cx-3;xx<=cx+2;xx++){if((yy===my-1||yy===bot)&&(xx===cx-3||xx===cx+2))continue;if(!g[yy]||!'rpR'.includes(g[yy][xx]))return false}return true})())bot--;
    for(let yy=my-1;yy<=bot;yy++)for(let xx=cx-3;xx<=cx+2;xx++){const e=yy===my-1||yy===bot||xx===cx-3||xx===cx+2,c=(yy===my-1||yy===bot)&&(xx===cx-3||xx===cx+2);if(c)continue;g[yy][xx]=e?'k':'m'}}
  else if(s.gape){let gw=Math.min(7,2+Math.round(s.gape*1.2)),gh=Math.min(6,1+Math.round(s.gape*1.2));
    /* an authored body is smaller and rounder than the ellipse: shrink the mouth until its box sits in body colour with the ink edge on it */
    if(rows){const fits=()=>{for(let yy=my-1;yy<=my+gh+1;yy++)for(let xx=cx-gw-1;xx<=cx+gw;xx++)if(!g[yy]||!'rpR'.includes(g[yy][xx]))return false;return true};
      while(!fits()&&(gh>1||gw>2))gh>1&&(gh>=gw-1||gw<=2)?gh--:gw--}
    for(let yy=my-1;yy<=my+gh+1;yy++)for(let xx=cx-gw-1;xx<=cx+gw;xx++){const e=yy===my-1||yy===my+gh+1||xx===cx-gw-1||xx===cx+gw;g[yy][xx]=e?'k':'m'}}
  else if(s.pens&&!s.face){for(let k=-2;k<=1;k++)g[my+1][cx+k]='k';g[my][cx+2]='k'}
  else if(s.mouth){for(let yy=my-1;yy<=my+2;yy++)for(let xx=cx-2;xx<=cx+1;xx++)g[yy][xx]=(yy>=my&&yy<=my+1&&xx>=cx-1&&xx<=cx)?'m':'k'}
  else if(s.happy){g[my][cx-2]='k';g[my][cx-1]='m';g[my][cx]='m';g[my][cx+1]='k';g[my+1][cx-1]='k';g[my+1][cx]='k'}
  else{g[my][cx-1]=g[my][cx]='k'}
  /* hand nubs (mascot/hands.js): s.hands = a name (both sides) or [left,right]. A hand is {dy,ox,rows}: drawn for the LEFT side, its last column on the body edge at row cy+dy
     (ox moves it outwards), mirrored for the right side. '.' leaves what is there. */
  if(s.hands){const hn=Array.isArray(s.hands)?s.hands:[s.hands,s.hands];
    for(const [nm,side] of [[hn[0],-1],[hn[1],1]]){const Hd=nm&&HANDS[nm];if(!Hd)continue;const yy=cy+(Hd.dy|0),ya=yy+(Hd.ay|0);let edge=-1;   /* ay: which pattern row sits on the body edge (default the first), so a raised hand can anchor on its bottom row and reach up past the shoulder */
      if(side<0){for(let x=0;x<W;x++)if(ins(x,ya)){edge=x;break}}else{for(let x=W-1;x>=0;x--)if(ins(x,ya)){edge=x;break}}
      if(edge<0)continue;const w=Hd.rows[0].length,ox=Hd.ox|0,x0=side<0?edge-w+1-ox:edge+ox;
      Hd.rows.forEach((r,j)=>{for(let i=0;i<w;i++){const c=r[i];   /* a hand is a ball, mirror-symmetric, so the right one is drawn as is and keeps its highlight at the top left */if(c!=='.'&&g[yy+j]&&g[yy+j][x0+i]!==undefined)g[yy+j][x0+i]=c}})}}
  if(s.hold)stamp(g,["kkkkk","krrrk","kkkkk"],(h=>lv?Math.max(0,Math.min(27,h)):h)(s.hold>0?cx+rx-2:cx-rx-2),cy-2);
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
    /* on a leaning head the top is sloped: slide the hat a few px and pick the row where it fits the head best (little brim in the air, little buried), starting from the usual spot */
    const HP=["....w....","...kok...","...kHk...","..kkokk..","..kHHHk..",".kkokokk.",".kHHHHHk.","kkkkkkkkk"],HC=["k...k...k","kY.kYk.Yk","kYkkYkkYk","kYYYYYYYk","kYoYHYoYk","kkkkkkkkk"];
    const pat=s.hat==='party'?HP:HC,hx=s.hat==='party'?cx+1:cx-10,hm=s.hat==='party'?cx+5:cx-6;
    let X=hx,B=topAt(hm)+1;   /* B = the row of the brim */
    if(LF){let best=1e9;for(let d=0;d<=4;d++)for(const sg of d?[-1,1]:[1]){const x0=hx+sg*d;if(x0<0||x0+9>W)continue;
      const tops=[];for(let x=x0;x<x0+9;x++)tops.push(topAt(x));
      for(let b=Math.min(...tops);b<=Math.max(...tops)+2;b++){let c=0;for(const t of tops)c+=Math.max(0,t-b)*2+Math.max(0,b-t-1);c+=d*.5;if(c<best){best=c;X=x0;B=b}}}}
    stamp(g,pat,X,B-(pat.length-1))}
  if(s.hat==='shades'){for(const ex of [cx-5,cx+4]){for(let y=ey-2;y<=ey+2;y++)for(let x=ex-3;x<=ex+2;x++)g[y][x]='k';g[ey-1][ex-2]='w';g[ey-2][ex-1]='w'}g[ey-1][cx-2]=g[ey-1][cx-1]=g[ey-1][cx]='k';g[ey-1][cx-9]='k';g[ey-1][cx+7]='k'}
  /* effect sprites (mascot/anim_fx.js): s.fx=[[name,frame,x,y],...] */
  if(s.fx)for(const [nm,fi,fx0,fy0] of s.fx){const sp=ANIM_FX[nm]&&ANIM_FX[nm][fi|0];if(sp)stamp(g,sp,fx0,fy0)}
  return g
}

export function paint(ctx,g){
  ctx.clearRect(0,0,W,H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const c=g[y][x];if(c!=='.'){ctx.fillStyle=MB[c];ctx.fillRect(x,y,1,1)}}
}
export const drawBuddy=(ctx,s)=>paint(ctx,compose(s));
