#!/usr/bin/env node
/* Lint for mascot/anim_ground.js (standing leans and reactions). Run: node tools/lint_anim_ground.mjs   (tools/test_mascot.mjs also calls lint()).
   On top of lintPoseFrames (structure, closed 1 px outline, light, face margin for the plain AND the mirrored face, canvas bounds, foot format) it checks:
   - 14 frames, in the documented order (each frame carries its name);
   - grounded: every frame's last body row is row 41 (no frame is meant to be off the ground);
   - feet: exactly two per frame, 3 to 6 px wide, rows inside 42..43, not overlapping the body and at most 2 px from it, not touching each
     other. Exception: the edge frames (12, 13) hang their right foot over the drop, so that foot sits on rows 43..46 and must reach below row 43;
   - lean direction: the head-over-base offset (mean column of the top third of body rows minus that of the bottom third) leans the documented way, and the
     second frame of each pair leans further than the first (lean2 > lean1, skid2 < skid1, edge2 > edge1); dizzy1 and dizzy2 lean opposite ways;
   - related frames animate into each other: silhouette difference (body + feet) at most 80 px (BODY stepMax) for 0-1, 4-5, 6-7, 10-11, 12-13,
     and the cower shiver 6-7 differs by 4..40 px. Not checked: recoil to recoil2 (about 210 px: the rebound is a deliberate snap from squashed-right to
     stretched-left, like the OS's squash-to-stretch hops) and landSoft/landHard (alternatives for a near or a far fall, never played one after the other);
   - compose() renders every frame plain, flip:1, faces 'scared', 'huh', 'yuck', 'love', hat 'crown', hat 'party' and sprout stage 3 (each also mirrored) to a
     32x48 grid of known palette chars, with every authored body and foot pixel on the canvas; the four built-in faces (eyes, mouth, cheeks, love's second cheek
     row) change only pixels that sit on body fill. ('awe' is not checked: compose shortens its mouth only on BODY levels, so on cy 34 frames it reaches the feet);
   - hats do not float: with hat 'crown' or 'party' (plain and mirrored) every column of the brim is at most 1 px above the head (the approved lean.js frames
     measure the same), and no hat pixel lands on the eyes (rows cy-6..cy);
   - the sprout (stage 3) grows from a head pixel: the stem's lowest pixel sits right on the top outline, not in the dip between the bumps, plain and mirrored. */
import {lintPoseFrames} from './lint_mascot_body.mjs';
import {ANIM_GROUND} from '../mascot/anim_ground.js';
import {compose,MB} from '../mascot/atlas.js';
export const NAMES=['lean1','lean2','recoil','recoil2','skid1','skid2','cower','cower2','landSoft','landHard','dizzy1','dizzy2','edge1','edge2'];
/* +1 leans right (head right of the base), -1 left */
const DIR={lean1:1,lean2:1,recoil:1,recoil2:-1,skid1:-1,skid2:-1,edge1:1,edge2:1};
const PAIRS=[[0,1],[4,5],[6,7],[10,11],[12,13]],EDGE=new Set([12,13]);
export function lean(f){const r=f.v[0],h=r.length,n=Math.floor(h/3),cx=rows=>{let s=0,k=0;rows.forEach(row=>{for(let x=0;x<row.length;x++)if(row[x]!=='.'){s+=x;k++}});return f.x0+s/k};
  return cx(r.slice(0,n))-cx(r.slice(h-n))}
const cellsOf=f=>{const s=new Set();f.v[0].forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.')s.add((f.y0+y)*64+f.x0+x)});for(const [x,y,rows] of f.feet||[])rows.forEach((r,j)=>{for(let i=0;i<r.length;i++)if(r[i]==='k')s.add((y+j)*64+x+i)});return s};
const sd=(a,b)=>{let n=0;for(const k of a)if(!b.has(k))n++;for(const k of b)if(!a.has(k))n++;return n};
export function lint(){
  const F=ANIM_GROUND.frames,errs=lintPoseFrames('ground',F,{minFrames:NAMES.length,turnsMax:4});
  if(F.length!==NAMES.length)errs.push(`ground: ${F.length} frames, the wiring note documents ${NAMES.length}`);
  const known=new Set(['.',...Object.keys(MB)]);
  F.forEach((f,fi)=>{
    const E=m=>errs.push(`ground[${fi}] ${f.name}: ${m}`);
    if(f.name!==NAMES[fi])E(`must be named '${NAMES[fi]}'`);
    if(f.baked)E('must not be baked: compose draws the face, sprout and hat');
    if(!f.v||!f.v[0])return;
    const rows=f.v[0],h=rows.length,body=(x,y)=>{const r=rows[y-f.y0];return r&&x>=f.x0&&x<f.x0+r.length?r[x-f.x0]:'.'};
    if(f.y0+h-1!==41)E(`last body row is ${f.y0+h-1}, must be 41 (grounded)`);
    // feet
    if(!Array.isArray(f.feet)||f.feet.length!==2)E('needs exactly two feet');
    else{const boxes=[];
      f.feet.forEach(([fx,fy,fr],i)=>{const w=fr[0].length,y1=fy+fr.length-1;
        if(w<3||w>6)E(`foot ${i} is ${w} px wide (want 3 to 6)`);
        for(let a=0;a<fr.length-1;a++)if(![...fr[a]].some((c,x)=>c==='k'&&fr[a+1][x]==='k'))E(`foot ${i} rows ${a} and ${a+1} do not touch`);
        const hang=EDGE.has(fi)&&i===1;
        if(hang){if(fy<43||y1>46||y1<44)E(`hanging foot spans rows ${fy}..${y1}, want inside 43..46 and below 43`);if(fx+w-1<=f.x0+rows[h-1].lastIndexOf('k'))E('the hanging foot must reach past the right end of the base')}
        else if(fy<42||y1>43)E(`foot ${i} spans rows ${fy}..${y1}, must stay on 42..43`);
        let near=99;fr.forEach((r,yy)=>{for(let xx=0;xx<w;xx++)if(r[xx]==='k')rows.forEach((br,by)=>{for(let bx=0;bx<br.length;bx++)if(br[bx]!=='.')near=Math.min(near,Math.max(Math.abs(f.x0+bx-(fx+xx)),Math.abs(f.y0+by-(fy+yy))))})});
        if(near<1)E(`foot ${i} overlaps the body`);if(near>(hang?3:2))E(`foot ${i} floats ${near} px from the body (max ${hang?3:2})`);
        boxes.push([fx,fx+w-1,fy,y1])});
      if(boxes.length===2){const [a,b]=boxes;if(a[0]<=b[1]+1&&b[0]<=a[1]+1&&a[2]<=b[3]+1&&b[2]<=a[3]+1)E('the feet touch or overlap each other')}}
    // lean
    const L=lean(f),d=DIR[f.name];if(d&&Math.sign(L)!==d)E(`leans ${L.toFixed(1)} px, want ${d>0?'right':'left'}`);
    // compose
    for(const flip of [0,1])for(const [tag,extra] of [['plain',{}],['scared',{face:'scared'}],['huh',{face:'huh'}],['yuck',{face:'yuck'}],['love',{face:'love'}],['crown',{hat:'crown'}],['party',{hat:'party'}],['sprout',{stage:3}]]){
      const g=compose({pose:'ground:'+fi,flip,dir:[0,0],stage:0,...extra}),T=`${tag}${flip?' flipped':''}`;
      if(g.length!==48||g.some(r=>r.length!==32)){E(`${T}: compose is not 32x48`);continue}
      for(const r of g)for(const c of r)if(!known.has(c)){E(`${T}: unknown char '${c}'`);break}
      if(['scared','huh','yuck','love'].includes(tag)){const a=compose({pose:'ground:'+fi,flip,dir:[0,0],stage:0,blink:1}),bad=[];
        for(let y=0;y<48;y++)for(let x=0;x<32;x++){const X=flip?31-x:x;if(g[y][x]!==a[y][x]&&!'rpR'.includes(body(X,y)))bad.push(`${x},${y}`)}
        if(bad.length)E(`${T}: the face draws off the body fill at ${bad.slice(0,4).join(' ')}`)}
      if(tag==='crown'||tag==='party'){
        const a=compose({pose:'ground:'+fi,flip,dir:[0,0],stage:0}),hc=[];for(let y=0;y<48;y++)for(let x=0;x<32;x++)if(a[y][x]!==g[y][x])hc.push([x,y]);
        if(!hc.length){E(`${T}: no hat drawn`);continue}
        const brim=Math.max(...hc.map(c=>c[1])),xs=[...new Set(hc.map(c=>c[0]))];
        const gaps=xs.map(x=>{for(let y=0;y<48;y++)if(a[y][x]!=='.')return y-brim-1;return 48});
        if(Math.max(...gaps)>1)E(`${T}: the hat floats (brim ${brim}, gaps ${gaps.join(',')})`);
        if(hc.some(([x,y])=>y>=f.cy-6&&y<=f.cy))E(`${T}: the hat covers the eyes`)}
      if(tag==='sprout'){const cx=flip?33-f.fcx:f.fcx;let top=-1;for(let y=0;y<48;y++)if(g[y][cx]==='n')top=y;
        if(top<0||'kprR'.indexOf(g[top+1]&&g[top+1][cx])<0)E(`${T}: the stem does not grow from the head at column ${cx}`);
        else if('rpR'.includes(g[top+1][cx-1])&&'rpR'.includes(g[top+1][cx+1]))E(`${T}: the stem grows out of the head dip at column ${cx} (put the dip at fcx-1, as on rest)`)}
    }
    // authored pixels on the canvas
    if(f.x0<0||f.y0<0||f.x0+rows[0].length>32||f.y0+h>48)E('the body leaves the canvas');
  });
  // pairs
  for(const [a,b] of PAIRS){if(!F[a]||!F[b])continue;const d=sd(cellsOf(F[a]),cellsOf(F[b]));
    if(d>80)errs.push(`ground: ${NAMES[a]} to ${NAMES[b]} changes ${d} px (max 80)`);
    if(a===6&&(d<4||d>40))errs.push(`ground: the cower shiver (6 to 7) changes ${d} px (want 4..40)`)}
  const lv=i=>F[i]?lean(F[i]):0;
  if(F[1]&&!(lv(1)>lv(0)))errs.push('ground: lean2 must lean further right than lean1');
  if(F[5]&&!(lv(5)<lv(4)))errs.push('ground: skid2 must lean further back than skid1');
  if(F[13]&&!(lv(13)>lv(12)))errs.push('ground: edge2 must lean further out than edge1');
  if(F[11]&&!(lv(10)<0&&lv(11)>0))errs.push(`ground: dizzy1 must lean left and dizzy2 right (${lv(10).toFixed(1)}, ${lv(11).toFixed(1)})`);
  return errs;
}
if(import.meta.url===`file://${process.argv[1]}`){
  const e=lint();
  console.log(ANIM_GROUND.frames.map((f,i)=>`${String(i).padStart(2)} ${(f.name||'').padEnd(9)} ${f.v[0][0].length}x${f.v[0].length} at ${f.x0},${f.y0}  face ${f.fcx},${f.cy}  lean ${lean(f).toFixed(1)} px`).join('\n'));
  if(e.length){console.log(`\n${e.length} problem${e.length>1?'s':''}:\n  `+e.join('\n  '));process.exit(1)}
  console.log('\nlint_anim_ground green');
}
