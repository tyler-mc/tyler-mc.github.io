#!/usr/bin/env node
/* Lint for mascot/anim_ground.js (the redesign's standing tilts and reactions). Run: node tools/lint_anim_ground.mjs   (tools/test_mascot.mjs also calls lint()).
   On top of lintPoseFrames (structure, closed 1 px outline, light, face margin for the plain AND the mirrored face, canvas bounds, shoe palette) it checks:
   - 10 frames in the documented order, each carrying its name; none baked;
   - the head: the body's top row is exactly one 4 px cap 'kkkk' whose left pixel is `tip` (the stem, leaf and hats attach there); `ctr` lies inside the body fill;
   - grounded: every body's last row is row 57; two shoes per frame, and each shoe's lowest row matches SOLES below (59 = planted on the ground; the lifted
     and hanging shoes are listed); a hanging shoe reaches row 61 or lower and its right end passes the right end of the body's base (it hangs past the ledge);
   - lean: the angle from the body's pixel centroid to the cap centre (tip.x+2, tip.y+.5), minus the same angle on BODY.rest (the approved teardrop already
     curls right by about 8 degrees), leans the documented way by at least 2 degrees, and the second frame of each pair goes further (lean2 > lean1,
     skid2 < skid1, edge2 > edge1);
   - related frames stay close (silhouette pixels that differ: the body at most 80, the BODY stepMax; body + shoes at most 120): lean1-lean2, skid1-skid2,
     edge1-edge2; the dizzy wobble passes through the upright rest pose, so dizzy1 and dizzy2 are each checked against BODY.rest + FEET.stand.
     recoil -> recoil2 is a deliberate snap (squashed-right to stretched-left) and is not checked;
   - compose() renders every frame plain and flip:1 with the plain face, 'scared', 'huh', 'love', 'worry' (the dizzy face), hat 'party' + stage 4, hat 'crown' + stage 3 to a 40x64 grid of
     known palette chars; the faces only change pixels that are body fill; no hat pixel lands on the eye rows (cy-6..cy);
   - nothing is clipped: with hat 'party', leaf stage 4 (the party lift), the scared face and the default arms [210,330], plain and flipped, every hat, leaf,
     stem, arm-nub, shoe and body pixel lies inside the 40x64 cell (computed from the data: compose's stamp() clips silently), and both arm rays find the body
     (the cast is compose's: bucket angle, last body pixel, snapped onto the outline); every other ARMS bucket also finds the body and stays on the canvas. */
import {lintPoseFrames} from './lint_mascot_body.mjs';
import {ANIM_GROUND} from '../mascot/anim_ground.js';
import {compose,MB,W,H} from '../mascot/atlas.js';
import {BODY} from '../mascot/body.js';
import {FEET} from '../mascot/feet.js';
import {ARMS} from '../mascot/arms.js';
import {LEAF} from '../mascot/leaf.js';
import {HATS} from '../mascot/hats.js';
export const NAMES=['lean1','lean2','recoil','recoil2','skid1','skid2','dizzy1','dizzy2','edge1','edge2'];
/* lowest row of [left shoe, right shoe]: 59 = planted */
export const SOLES={lean1:[59,59],lean2:[59,59],recoil:[57,59],recoil2:[59,59],skid1:[59,59],skid2:[59,59],dizzy1:[59,59],dizzy2:[59,59],edge1:[59,61],edge2:[59,62]};
const HANG={edge1:1,edge2:1};   /* index of the shoe hanging over the drop */
const DIR={lean1:1,lean2:1,recoil:1,recoil2:-1,skid1:-1,skid2:-1,dizzy1:-1,dizzy2:1,edge1:1,edge2:1};   /* +1 leans right, -1 left */
const PAIRS=[[0,1],[4,5],[8,9]];
const DEG=180/Math.PI;
function measure(x0,y0,rows,tip){let s=0,t=0,n=0;rows.forEach((r,j)=>{for(let i=0;i<r.length;i++)if(r[i]!=='.'){s+=x0+i+.5;t+=y0+j+.5;n++}});
  return Math.atan2(tip[0]+2-s/n,t/n-tip[1]-.5)*DEG}
const REST0=measure(BODY.rest.x0,BODY.rest.y0,BODY.rest.v[0],BODY.rest.tip);
export const lean=f=>measure(f.x0,f.y0,f.v[0],f.tip)-REST0;
function cells(x0,y0,rows,feet){const s=new Set();rows.forEach((r,j)=>{for(let i=0;i<r.length;i++)if(r[i]!=='.')s.add((y0+j)*64+x0+i)});
  for(const [x,y,fr] of feet||[])fr.forEach((r,j)=>{for(let i=0;i<r.length;i++)if(r[i]!=='.')s.add((y+j)*64+x+i)});return s}
const sd=(a,b)=>{let n=0;for(const k of a)if(!b.has(k))n++;for(const k of b)if(!a.has(k))n++;return n};
const ARM_KEYS=Object.keys(ARMS).map(Number);
const nearestArm=a=>{let best=null,bd=1e9;for(const k of ARM_KEYS){const d=Math.abs(((a-k)%360+540)%360-180);if(d<bd){bd=d;best=k}}return best};
export function lint(){
  const F=ANIM_GROUND.frames,errs=lintPoseFrames('ground',F,{minFrames:NAMES.length,turnsMax:6});
  if(F.length!==NAMES.length)errs.push(`ground: ${F.length} frames, the wiring note documents ${NAMES.length}`);
  const known=new Set(['.',...Object.keys(MB)]);
  F.forEach((f,fi)=>{
    const E=m=>errs.push(`ground[${fi}] ${f.name}: ${m}`);
    if(f.name!==NAMES[fi])E(`must be named '${NAMES[fi]}'`);
    if(f.baked)E('must not be baked: compose draws the face, leaf and hat');
    if(!f.v||!f.v[0]||!Array.isArray(f.tip)||!Array.isArray(f.ctr))return E('needs v, tip and ctr');
    const rows=f.v[0],h=rows.length,w=rows[0].length,body=(x,y)=>{const r=rows[y-f.y0];return r&&x>=f.x0&&x<f.x0+w?r[x-f.x0]:'.'};
    // head cap and arm centre
    const t0=rows[0].replace(/\.+$/,''),a0=t0.search(/[^.]/);
    if(t0.slice(a0)!=='kkkk')E(`top row must be one 4 px cap 'kkkk' (is '${t0.slice(a0)}')`);
    else if(f.tip[0]!==f.x0+a0||f.tip[1]!==f.y0)E(`tip must be [${f.x0+a0},${f.y0}] (the cap's left pixel), is [${f.tip}]`);
    if(!'rpR'.includes(body(f.ctr[0],f.ctr[1])))E(`ctr [${f.ctr}] is not inside the body fill`);
    // grounded body and shoes
    if(f.y0+h-1!==57)E(`last body row is ${f.y0+h-1}, must be 57 (grounded)`);
    if(!Array.isArray(f.feet)||f.feet.length!==2)E('needs exactly two shoes [left, right]');
    else{const want=SOLES[f.name]||[59,59];
      f.feet.forEach(([fx,fy,fr],i)=>{const low=fy+fr.length-1;if(low!==want[i])E(`shoe ${i} lowest row is ${low}, SOLES says ${want[i]}`);
        if(HANG[f.name]===i){if(low<61)E(`the hanging shoe must reach row 61 or lower (reaches ${low})`);
          const baseR=f.x0+rows[h-1].lastIndexOf('k');if(fx+fr[0].length-1<=baseR)E('the hanging shoe must reach past the right end of the base')}
        else if(low>59)E(`shoe ${i} goes below the soles row 59`)})}
    // lean
    const L=lean(f),d=DIR[f.name];if(d&&(Math.sign(L)!==d||Math.abs(L)<2))E(`leans ${L.toFixed(1)} deg from rest, want ${d>0?'right':'left'} by 2 or more`);
    // compose: renders, faces on body fill, hats off the eyes
    for(const flip of [0,1]){
      const base=compose({pose:'ground:'+fi,flip,dir:[0,0],stage:0,blink:1});
      for(const [tag,extra] of [['plain',{}],['scared',{face:'scared'}],['huh',{face:'huh'}],['love',{face:'love'}],['worry',{face:'worry'}],['party',{hat:'party',stage:4}],['crown',{hat:'crown',stage:3}]]){
        const g=compose({pose:'ground:'+fi,flip,dir:[0,0],stage:0,...extra}),T=`${tag}${flip?' flipped':''}`;
        if(g.length!==H||g.some(r=>r.length!==W)){E(`${T}: compose is not ${W}x${H}`);continue}
        if(g.some(r=>r.some(c=>!known.has(c))))E(`${T}: unknown palette char`);
        if(['plain','scared','huh','love','worry'].includes(tag)){const bad=[];
          for(let y=0;y<H;y++)for(let x=0;x<W;x++){const X=flip?W-1-x:x;if(g[y][x]!==base[y][x]&&!'rpR'.includes(body(X,y)))bad.push(`${x},${y}`)}
          if(bad.length)E(`${T}: the face draws off the body fill at ${bad.slice(0,4).join(' ')}`)}
        if(tag==='party'||tag==='crown'){const a=compose({pose:'ground:'+fi,flip,dir:[0,0],stage:extra.stage});
          let n=0;for(let y=f.cy-6;y<=f.cy;y++)for(let x=0;x<W;x++)if(a[y][x]!==g[y][x])n++;if(n)E(`${T}: the hat covers ${n} px of the eye rows`)}
      }
    }
    // nothing clipped: party hat + leaf stage 4 + default arms + shoes + body, from the data (stamp() clips silently)
    const out=[],box=(nm,x,y,pat)=>{pat.forEach((r,j)=>{for(let i=0;i<r.length;i++)if(r[i]!=='.'){const X=x+i,Y=y+j;if(X<0||X>=W||Y<0||Y>=H){out.push(nm);return}}})};
    const hat=HATS.party,LS=LEAF.stages[4],lift=hat.lift|0;
    box('party hat',f.tip[0]-hat.ax,f.tip[1]-hat.ay,hat.rows);
    box('leaf stage 4',f.tip[0]+LS.ox,f.tip[1]+LS.oy-lift,LS.rows);
    const top=LEAF.stem.reduce((m,p)=>p[1]<m[1]?p:m,LEAF.stem[0]);
    for(const [sx,sy] of LEAF.stem)box('stem',f.tip[0]+sx,f.tip[1]+sy,['n']);box('stem',f.tip[0]+top[0],f.tip[1]+top[1]-lift,['n']);
    for(const [x,y,fr] of f.feet||[])box('shoe',x,y,fr);
    box('body',f.x0,f.y0,rows);
    const inB=(x,y)=>body(x,y)!=='.';
    /* the arm cast, as compose does it: snap to the bucket, cast from ctr at the bucket angle, keep the last body pixel, snap it onto the outline */
    const armAt=(a0,flip)=>{const ang=((flip?180-a0:a0)%360+360)%360,a=nearestArm(ang),A=ARMS[a],rad=a*Math.PI/180;let px=-1,py=-1;
      for(let t=0;t<48;t+=.5){const x=Math.round(f.ctr[0]+t*Math.cos(rad)),y=Math.round(f.ctr[1]-t*Math.sin(rad));if(inB(x,y)){px=x;py=y}else if(px>=0)break}
      if(px>=0&&body(px,py)!=='k'){let bd=-1e9,q=null;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){if((i||j)&&body(px+i,py+j)==='k'){const d=i*Math.cos(rad)-j*Math.sin(rad);if(d>bd){bd=d;q=[px+i,py+j]}}}if(q){px=q[0];py=q[1]}}
      return px<0?null:[A,px,py]};
    for(const flip of [0,1])for(const a0 of [210,330]){const r=armAt(a0,flip);
      if(!r)E(`arm ${a0}${flip?' flipped':''}: the ray from ctr finds no body`);else box(`arm ${a0}`,r[1]-r[0].ax,r[2]-r[0].ay,r[0].rows)}
    /* every other authored bucket must land on the body too and stay on the canvas (posed arms such as the poke's [150,30]) */
    for(const k of ARM_KEYS){const r=armAt(k,0);if(!r)E(`arm bucket ${k}: the ray from ctr finds no body`);else box(`arm bucket ${k}`,r[1]-r[0].ax,r[2]-r[0].ay,r[0].rows)}
    if(out.length)E(`clipped at the cell edge (party hat, stage 4, default arms): ${[...new Set(out)].join(', ')}`);
  });
  // related frames stay close
  const B=F.map(f=>f&&f.v?cells(f.x0,f.y0,f.v[0]):null),C=F.map(f=>f&&f.v?cells(f.x0,f.y0,f.v[0],f.feet):null);
  const near=(nm,b1,b2,c1,c2)=>{const db=sd(b1,b2),dc=sd(c1,c2);if(db>80)errs.push(`ground: ${nm}: the body changes ${db} px (max 80)`);if(dc>120)errs.push(`ground: ${nm}: body + shoes change ${dc} px (max 120)`)};
  for(const [a,b] of PAIRS)if(C[a]&&C[b])near(`${NAMES[a]} to ${NAMES[b]}`,B[a],B[b],C[a],C[b]);
  const RB=cells(BODY.rest.x0,BODY.rest.y0,BODY.rest.v[0]),RC=cells(BODY.rest.x0,BODY.rest.y0,BODY.rest.v[0],FEET.stand.feet);
  for(const i of [6,7])if(C[i])near(`${NAMES[i]} to rest (the dizzy wobble goes through rest)`,B[i],RB,C[i],RC);
  const lv=i=>F[i]&&F[i].v?lean(F[i]):0;
  if(F[1]&&!(lv(1)>lv(0)))errs.push('ground: lean2 must lean further right than lean1');
  if(F[5]&&!(lv(5)<lv(4)))errs.push('ground: skid2 must lean further back (left) than skid1');
  if(F[9]&&!(lv(9)>lv(8)))errs.push('ground: edge2 must lean further out than edge1');
  return errs;
}
if(import.meta.url===`file://${process.argv[1]}`){
  const e=lint(),F=ANIM_GROUND.frames;
  console.log(F.map((f,i)=>`${String(i).padStart(2)} ${(f.name||'').padEnd(8)} ${f.v[0][0].length}x${f.v[0].length} at ${f.x0},${f.y0}  face ${f.fcx},${f.cy}  tip ${f.tip}  ctr ${f.ctr}  lean ${lean(f).toFixed(1)} deg  soles ${(f.feet||[]).map(([x,y,r])=>y+r.length-1).join(',')}`).join('\n'));
  if(e.length){console.log(`\n${e.length} problem${e.length>1?'s':''}:\n  `+e.join('\n  '));process.exit(1)}
  console.log('\nlint_anim_ground green');
}
