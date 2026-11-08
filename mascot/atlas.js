/* The mascot's pixels (the REDESIGN: a red teardrop with a swept leaf, big brown shoes and little round nub arms), shared by the OS desktop buddy (os.js, through
   mascot/atlas.classic.js) and the Wake Up game. One 40x64 cell, one char per pixel ('.' clear, colours in MB). compose(look) returns the grid and touches no DOM, so
   node can test it; paint(ctx, grid) draws one. Centre column CX=20 (mirror x -> W-1-x), body bottom row 57, soles on row 59, ground shadow rows 59..63.
   The sprite is PARTS: a body level (BODY), feet (FEET), arm nubs cast around the body at an angle (ARMS), a leaf that grows (LEAF), a hat over the head tip (HATS),
   the face (drawn here: faces.js overrides) and effects (anim_fx.js); whole-frame authored art (ANIM_*) is used only for tilted or turned poses.
   After editing, run: python3 tools/build_mascot.py */
import {BODY} from './body.js';
import {FEET} from './feet.js';
import {ARMS} from './arms.js';
import {LEAF} from './leaf.js';
import {XLEAF} from './xleaf.js';
import {HATS,GEAR} from './hats.js';
import {FACES,LIDS} from './faces.js';
import {ANIM_TRASH} from './anim_trash.js';
import {ANIM_DANCE} from './anim_dance.js';
import {ANIM_MAC} from './anim_mac.js';
import {ANIM_WALK} from './anim_walk.js';
import {ANIM_GROUND} from './anim_ground.js';
import {ANIM_SURF} from './anim_surf.js';
import {ANIM_ROOT} from './anim_root.js';
import {ANIM_LEAN} from './anim_lean.js';
import {ANIM_FX} from './anim_fx.js';
export const INK='#1A1716';
export const W=40;   /* the cell: 40x64, centre column CX, soles on row SOLE (one export per line: the classic build reads one name per line) */
export const H=64;
export const CX=20;
export const SOLE=59;
const LVMAP={idle:'rest',breath:'breath',squash:'S3',stretch:'T2',land:'S1',hop:'T3'};
export const grid=(w,h)=>Array.from({length:h},()=>Array(w).fill('.'));
export function stamp(g,pat,ox,oy){pat.forEach((r,y)=>{for(let x=0;x<r.length;x++){const c=r[x];if(c!=='.'&&g[oy+y]&&g[oy+y][ox+x]!==undefined)g[oy+y][ox+x]=c}})}
export const MB={B:'#F1E9D2',b:'#C9BFA5',Y:'#F6B92B',k:INK,r:'#FF3333',p:'#FF9A9A',R:'#B01E23',w:'#ffffff',m:'#7A0A12',n:'#0B5A55',T:'#3FC2B5',o:'#FFD94A',h:'#00393B',c:'#FF7A7A',H:'#FF2E88',u:'#CF9A62',U:'#965F34',v:'#6E4324',V:'#2B1B10',a:'#7A5030',A:'#A2744A',g:'#7D8A38',G:'#9FD45A',e:'#22160D'};
/* u U v V = the shoe (light, body, shade, sole); a A = root (body, light); g G = olive and fresh green root tips; e = dark root outline (the game's SHOE_P and ROOT palettes) */
/* authored whole-sprite frames: s.pose='name:index' ('trash:2'), s.flip mirrors it. A frame is {x0,y0,v:[rows],feet:[[x,y,rows],..],fcx,cy,tip,ctr} (absolute cell coordinates);
   baked:true means the face, sprout and hat are already drawn into the rows and compose adds nothing on top; over:{x0,y0,rows} is drawn on top of the body rows (any palette
   char); cellH makes a taller cell; hideCheek hides one cheek pair. See lintPoseFrames in tools/lint_mascot_body.mjs. */
const ANIMS={trash:ANIM_TRASH,dance:ANIM_DANCE,mac:ANIM_MAC,walk:ANIM_WALK,ground:ANIM_GROUND,surf:ANIM_SURF,root:ANIM_ROOT,lean:ANIM_LEAN};
function poseFrame(p){const [n,i]=String(p).split(':'),A=ANIMS[n];return A&&A.frames&&A.frames[i|0]||null}
const flipRow=r=>[...r].reverse().join('');
const ARM_KEYS=Object.keys(ARMS).map(Number);
const nearestArm=a=>{let best=null,bd=1e9;for(const k of ARM_KEYS){const d=Math.abs(((a-k)%360+540)%360-180);if(d<bd){bd=d;best=k}}return best};   /* nearest authored bucket by circular distance */
export function compose(s){
  const PF=s.pose?poseFrame(s.pose):null,fl=!!s.flip,Hh=(PF&&PF.cellH)||H,g=grid(W,Hh),bv=s.bv|0;
  const fr=s.hop>0?'hop':s.f==='squash2'?'land':s.f;
  /* ---- pass A: everything except the face, drawn facing right, then mirrored when s.flip ---- */
  let rows,bx,by,cyA,fcxA,tip=null,ctr=null,feetList=null,feetBack=true;
  const up=PF||s.lv||fr!=='hop'?0:6;   /* a 'hop' pose floats 6 rows up with its feet hidden (os.js poses it so) */
  if(PF){const v=PF.v[bv%PF.v.length];rows=v;bx=PF.x0;by=PF.y0;cyA=PF.cy;fcxA=PF.fcx;tip=PF.tip||null;ctr=PF.ctr||[PF.x0+v[0].length/2,PF.y0+v.length*.6];feetList=PF.feet||[]}
  else{const L=BODY[s.lv||LVMAP[fr]||'rest']||BODY.rest,ln=Math.max(-3,Math.min(3,s.lean|0));   /* s.lean (px, facing right; mirrored with flip): the body, leaf, arms and face slide over the shoes, which stay put */
    rows=L.v[bv%L.v.length];bx=L.x0+ln;by=L.y0-up;cyA=L.cy-up;fcxA=CX+ln;tip=[L.tip[0]+ln,L.tip[1]-up];ctr=[L.ctr[0]+ln,L.ctr[1]-up];
    if(fr!=='hop'||s.lv){const F=FEET[s.ft]||FEET.stand;feetList=F.feet;feetBack=F.back!==false}}
  const bw=rows[0].length,bh=rows.length,inB=(x,y)=>{const r=rows[y-by];return !!r&&x>=bx&&x<bx+bw&&r[x-bx]!=='.'};
  if(!s.air)for(let y=SOLE;y<H;y++)for(let x=CX-13;x<CX+13;x++){const dx=(x+.5-CX)/12,dy=(y+.5-(SOLE+2.5))/2.4,e=dx*dx+dy*dy;if(e>1)continue;
    const p2=(y>>1)&1?2:0;if(y%2===1&&((x+p2)%4===0||(e<.5&&(x+p2)%4===1)))g[y][x]='h'}
  /* each foot is [x,y,rows] or [x,y,rows,back]: back (default: the pose's back flag) draws that shoe behind the body, false in front of it, so one shoe can pass in front while the other stays behind */
  const putFeet=front=>{if(feetList)for(const [fx,fy,fr0,fb] of feetList){const b=fb===undefined?feetBack:fb;if(b!==front)stamp(g,fr0,fx,fy)}};
  putFeet(false);
  stamp(g,rows,bx,by);
  putFeet(true);
  /* arms: s.arms=[left,right] screen angles in degrees (0 right, 90 up, 180 left, 270 down); each is cast from the body's ctr to where the ray leaves the silhouette and the
     nearest authored nub (ARMS) is attached there; a falsy entry means no arm on that side. (When flipped the angle is mirrored here and the grid is mirrored below.) */
  const armsA=PF&&PF.baked?false:s.arms===undefined?(PF&&PF.arms)||[210,330]:s.arms;   /* he always has arms: the resting pair unless a look says otherwise (false/null = none) */
  if(armsA&&ARM_KEYS.length)for(const a0 of armsA){if(a0===undefined||a0===null||a0===false)continue;
    const ang=((fl?180-a0:a0)%360+360)%360,a=nearestArm(ang),A=ARMS[a],rad=a*Math.PI/180;let px=-1,py=-1;   /* cast at the BUCKET angle, so an in-between angle lands exactly where its bucket does */
    for(let t=0;t<48;t+=.5){const x=Math.round(ctr[0]+t*Math.cos(rad)),y=Math.round(ctr[1]-t*Math.sin(rad));if(inB(x,y)){px=x;py=y}else if(px>=0)break}
    /* the ray can leave the body through a diagonal gap in the outline and stop on fill: move the anchor to the neighbouring outline pixel on the ray's side */
    if(px>=0&&rows[py-by][px-bx]!=='k'){let bd=-1e9,q=null;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const r=rows[py+j-by];if((i||j)&&r&&r[px+i-bx]==='k'){const d=i*Math.cos(rad)-j*Math.sin(rad);if(d>bd){bd=d;q=[px+i,py+j]}}}if(q){px=q[0];py=q[1]}}
    if(px>=0){const ox=Math.max(0,Math.min(W-A.rows[0].length,px-A.ax)),oy=Math.max(0,Math.min(Hh-A.rows.length,py-A.ay)),body=(x,y)=>{const r=rows[y-by];return r?r[x-bx]||'.':'.'};
      /* a round hand that overlaps the body's edge: it covers the body's outline (so the hand flows out of the body with no line between them) and draws no ink and no
         shading of its own over the body's fill, only outside it; its ink is the hand's outer edge */
      A.rows.forEach((r,j)=>{for(let i=0;i<r.length;i++){const c=r[i];if(c==='.')continue;const x=ox+i,y=oy+j;
        if(g[y]&&g[y][x]!==undefined&&!'rpR'.includes(body(x,y)))g[y][x]=c}})}}
  /* sprout and hat: the leaf grows with the seeds planted (stage 0 is a small bud leaf: he always has one); a hat sits OVER the head tip and the stem and leaf poke out above it */
  if(tip&&!(PF&&PF.baked)){
    const ll=Math.max(-3,Math.min(3,fl?-(s.ll|0):(s.ll|0))),st=Math.min(4,(s.stage|0)+((s.sp|0)>0?1:0)),   /* ll: the leaf's lag in px (the game's sprout trailing his speed): the leaf slides sideways on the stem top */
      hat=s.hat&&HATS[s.hat],lift=hat?hat.lift|0:0,LS=LEAF.stages[st];
    for(const [sx,sy] of LEAF.stem)if(g[tip[1]+sy])g[tip[1]+sy][tip[0]+sx]='n';
    if(hat)stamp(g,hat.rows,tip[0]-hat.ax,tip[1]-hat.ay);
    const top=LEAF.stem.reduce((m,p)=>p[1]<m[1]?p:m,LEAF.stem[0]);
    for(let i=1;i<=lift;i++){const y=tip[1]+top[1]-i;if(g[y])g[y][tip[0]+top[0]]='n'}
    const XS=s.xl&&XLEAF[s.xl]&&XLEAF[s.xl][Math.max(0,Math.min(2,s.xs|0))],xs=()=>stamp(g,XS.rows,tip[0]+3+XS.dx,tip[1]-3-lift+XS.dy);   /* the game's extra leaf (under the main one) or flower (over it): mascot/xleaf.js */
    if(XS&&s.xl==='leaf')xs();
    if(LS)stamp(g,LS.rows,tip[0]+LS.ox+ll,tip[1]+LS.oy-lift);
    if(XS&&s.xl==='flower')xs()}
  if(PF&&PF.over)stamp(g,PF.over.rows,PF.over.x0,PF.over.y0);
  if(fl)for(let y=0;y<Hh;y++)g[y].reverse();
  if(PF&&PF.baked){shiftX(g,s.dx|0);if(s.fx)putFx(g,s.fx);return g}
  /* ---- pass B: the face and the things around the head, on the final (possibly mirrored) grid ---- */
  const turn=Math.max(0,Math.min(4,s.turn|0)),cx=(fl?W+1-fcxA:fcxA)+(fl?-turn:turn),cy=cyA,ey=cy-3,[dx,dy]=s.dir||[0,0],tipX=tip?(fl?W-1-tip[0]-3:tip[0]):cx,tipY=tip?tip[1]:cy-26;
  const FA=FACES[s.face||(s.pens?'worry':'')];   /* an authored face (mascot/faces.js): eye box rows {eye,eyeR?} and mouth {rows,ox,oy} replace the drawn ones; look.pens is the nervous worry face */
  for(const ex of [cx-5,cx+4]){
    if(FA&&FA.eye){const rr=(ex>cx&&FA.eyeR)||FA.eye;stamp(g,rr,ex-3,ey-3);continue}
    if(s.face==='yuck'){const L=ex<cx;for(let k=0;k<5;k++){const o=k<3?k:4-k;const xx=L?ex-2+o:ex+1-o,yy=ey-1+k;g[yy][xx]='k';g[yy][xx+(L?1:-1)]='k'}continue}
    if(s.blink||s.sleep){for(let x=ex-2;x<=ex+1;x++)g[ey+1][x]='k';continue}
    for(let y=ey-3;y<=ey+3;y++)for(let x=ex-3;x<=ex+2;x++){const edge=y===ey-3||y===ey+3||x===ex-3||x===ex+2;const corner=(y===ey-3||y===ey+3)&&(x===ex-3||x===ex+2);if(corner)continue;g[y][x]=edge?'k':'w'}
    if(s.face==='scared'){g[ey][ex-1]=g[ey+1][ex-1]='k'}
    else if(s.face==='love'){[".H.H.","HHHHH",".HHH.","..H.."].forEach((row,yy)=>{for(let xx=0;xx<5;xx++)if(row[xx]==='H')g[ey-1+yy][ex-2+xx]='H'})}
    else if(s.face==='awe'){/* enlarged pupils: 2 wide by 4 tall (the plain pupil is 2x3), clamped to stay inside the white */
      const y0=ey-2+Math.max(0,dy);for(let y=0;y<4;y++)for(let x=0;x<2;x++)g[y0+y][ex-1+dx+x]='k'}
    else if(s.pens){for(let x=ex-2;x<=ex+1;x++){g[ey-2][x]='r';g[ey-1][x]='r';g[ey][x]='k'}g[ey+1][ex-1]=g[ey+1][ex]='k'}
    else{for(let y=0;y<3;y++)for(let x=0;x<2;x++)g[ey-1+dy+y][ex-1+dx+x]='k'   /* the plain pupil: 2 wide by 3 tall */
      if(s.lid&&LIDS[s.lid-1])stamp(g,LIDS[s.lid-1],ex-2,ey-2)}   /* an eyelid (mascot/faces.js LIDS): rows over the 4x5 white interior, only over the plain pupil; '.' leaves the eye as drawn */
  }
  /* a pose frame may hide one cheek (hideCheek:-1 = the authored-left pair, +1 = the right; negated when flipped): the near cheek of a 3/4 turn */
  const hc=PF&&PF.hideCheek?(fl?-PF.hideCheek:PF.hideCheek):0;
  /* s.turn (px, 0..4): the face slides that far toward the way he faces, as a 3/4 turn: a cheek that would land on the outline is clipped to the body */
  const cheek=(x,y)=>{if(!turn||g[y]&&'rpR'.includes(g[y][x]))g[y][x]='c'};
  if(hc!==-1){cheek(cx-9,cy+1);cheek(cx-8,cy+1)}if(hc!==1){cheek(cx+7,cy+1);cheek(cx+8,cy+1)}
  const my=cy+3;
  const fits=(x0,x1,y0,y1)=>{for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++)if(!g[yy]||!'rpR'.includes(g[yy][xx]))return false;return true};
  if(FA&&FA.mouth)stamp(g,FA.mouth.rows,cx+(FA.mouth.ox|0),my+(FA.mouth.oy|0));
  else if(s.face==='scared'){for(let yy=my-1;yy<=my+3;yy++)for(let xx=cx-3;xx<=cx+2;xx++)g[yy][xx]=(yy>my-1&&yy<my+3&&xx>cx-3&&xx<cx+2)?'m':'k'}
  else if(s.face==='huh'){g[my][cx-1]=g[my][cx]=g[my+1][cx-1]=g[my+1][cx]='k'}
  else if(s.face==='yuck'){[[-3,1],[-2,0],[-1,1],[0,0],[1,1],[2,0]].forEach(([a,b])=>{g[my+b][cx+a]='k'});[[0,2],[1,2],[0,3]].forEach(([a,b])=>{g[my+b][cx+a]='T'});g[my+4]&&(g[my+4][cx]='k')}
  else if(s.face==='awe'){let bot=my+5;
    /* on a squashed body the tall mouth would reach the outline: shorten it until its whole box is body colour */
    while(bot>my+2&&!(()=>{for(let yy=my-1;yy<=bot;yy++)for(let xx=cx-3;xx<=cx+2;xx++){if((yy===my-1||yy===bot)&&(xx===cx-3||xx===cx+2))continue;if(!g[yy]||!'rpR'.includes(g[yy][xx]))return false}return true})())bot--;
    for(let yy=my-1;yy<=bot;yy++)for(let xx=cx-3;xx<=cx+2;xx++){const e=yy===my-1||yy===bot||xx===cx-3||xx===cx+2,c=(yy===my-1||yy===bot)&&(xx===cx-3||xx===cx+2);if(c)continue;g[yy][xx]=e?'k':'m'}}
  else if(s.gape){let gw=Math.min(7,2+Math.round(s.gape*1.2)),gh=Math.min(6,1+Math.round(s.gape*1.2));
    /* the open mouth shrinks until its box sits in body colour with the ink edge on it */
    while(!fits(cx-gw-1,cx+gw,my-1,my+gh+1)&&(gh>1||gw>2))gh>1&&(gh>=gw-1||gw<=2)?gh--:gw--;
    for(let yy=my-1;yy<=my+gh+1;yy++)for(let xx=cx-gw-1;xx<=cx+gw;xx++){const e=yy===my-1||yy===my+gh+1||xx===cx-gw-1||xx===cx+gw;g[yy][xx]=e?'k':'m'}}
  else if(s.pens&&!s.face){for(let k=-2;k<=1;k++)g[my+1][cx+k]='k';g[my][cx+2]='k'}
  else if(s.mouth){for(let yy=my-1;yy<=my+2;yy++)for(let xx=cx-2;xx<=cx+1;xx++)g[yy][xx]=(yy>=my&&yy<=my+1&&xx>=cx-1&&xx<=cx)?'m':'k'}
  else if(s.happy){g[my][cx-2]='k';g[my][cx-1]='m';g[my][cx]='m';g[my][cx+1]='k';g[my+1][cx-1]='k';g[my+1][cx]='k'}
  else{g[my][cx-1]=g[my][cx]='k'}
  if(s.hold){const lx=fl?W-bx-bw:bx,x0=Math.max(0,Math.min(W-5,s.hold>0?lx+bw-3:lx-2));stamp(g,["kkkkk","krrrk","kkkkk"],x0,cy-2)}
  if(s.face==='love'){g[cy+2][cx-9]=g[cy+2][cx-8]=g[cy+2][cx+7]=g[cy+2][cx+8]='c'}
  if(s.heart){const hp=(hx,hy)=>["H.H","HHH",".H."].forEach((row,yy)=>{for(let xx=0;xx<3;xx++)if(row[xx]==='H'&&g[hy+yy]&&g[hy+yy][hx+xx]!==undefined)g[hy+yy][hx+xx]='H'});
    const hy=Math.max(0,tipY+8-s.heart*3);hp(cx+12,hy);hp(cx-15,hy+6)}
  if(s.q){[".XX.","X..X","..X.",".X..","....",".X.."].forEach((row,yy)=>{for(let xx=0;xx<4;xx++)if(row[xx]==='X'){const Y=Math.max(0,tipY+4)+yy,X=cx-16+xx;if(g[Y]&&g[Y][X]!==undefined)g[Y][X]='o'}})}
  if(s.mask&&GEAR.mask)stamp(g,GEAR.mask.rows,cx+GEAR.mask.ox,cy+GEAR.mask.oy);
  if(s.hat==='shades'&&GEAR.shades)stamp(g,GEAR.shades.rows,cx+GEAR.shades.ox,cy+GEAR.shades.oy);
  shiftX(g,s.dx|0);
  if(s.fx)putFx(g,s.fx);
  return g
}
/* slide the whole grid sideways by dx whole pixels (pixels pushed off the edge are lost) */
function shiftX(g,dx){if(!dx)return;for(const row of g){if(dx>0){row.splice(row.length-dx,dx);row.unshift(...Array(dx).fill('.'))}else{row.splice(0,-dx);row.push(...Array(-dx).fill('.'))}}}
/* effect sprites (mascot/anim_fx.js): s.fx=[[name,frame,x,y],...] absolute cell coordinates */
function putFx(g,fx){for(const [nm,fi,fx0,fy0] of fx){const sp=ANIM_FX[nm]&&ANIM_FX[nm][fi|0];if(sp)stamp(g,sp,fx0,fy0)}}

export function paint(ctx,g){
  const h=g.length,w=g[0].length;ctx.clearRect(0,0,w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=g[y][x];if(c!=='.'){ctx.fillStyle=MB[c];ctx.fillRect(x,y,1,1)}}
}
export const drawBuddy=(ctx,s)=>paint(ctx,compose(s));
