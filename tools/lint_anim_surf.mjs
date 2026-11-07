#!/usr/bin/env node
/* Lint for mascot/anim_surf.js (riding the board in the Wake Up game, plus the SURF_FOAM particle sprites). Run: node tools/lint_anim_surf.mjs
   (tools/test_mascot.mjs also calls lint()). On top of lintPoseFrames (structure, closed 1 px body outline, face margin for the plain AND the mirrored
   face, canvas bounds, foot format; anyLight, turnsMax 6) it checks:
   - the 11 frames are present in the documented order (each carries its name), none is baked;
   - every frame has an over layer (the board plus spray) and a separate board field {x0,y0,rows} (the board alone, also merged into over): the board is
     on the canvas plain and flipped, drawn in board colours (k o Y B), has a clean closed 1 px ink outline (every pixel on its edge is ink, no ink
     inside, no 2x2 ink block, no dead-end ink pixel), is 22 to 30 px long (its longest pixel-to-pixel distance, so a tilted board counts along its
     length; sink2 shows only the nose, 8 px or more), and every board pixel shows in over as itself or under foam (w B b T), except that on the
     off-board frames (launch, sink1, sink2) the board may pass behind the body and feet;
   - tail and nose anchors [x,y] sit on a board pixel (the game spawns SURF_FOAM there);
   - feet on the deck: on every riding frame (all but launch, sink1, sink2) each foot's lowest row touches or overlaps the board's top pixel in that
     foot's own columns (0 or 1 px above it), and no foot is buried more than 1 px into the board; the feet do not touch each other;
   - wobble1 and wobble2 animate into each other (body + feet silhouette change 8..80 px);
   - compose() renders every frame plain and flip:1, with the plain face, 'scared', hat 'crown', hat 'party', sprout stage 0 and 3: a 32x48 grid of
     known palette chars; every authored body, foot and over pixel is on the canvas; the faces only change pixels on body fill; the hat sits on the head
     (every brim column at most 1 px above the head, no hat pixel on the eye rows, the whole hat on the canvas); the stage 3 stem grows from a head
     pixel, not out of the dip between the bumps, and the whole sprout stays on the canvas;
   - SURF_FOAM: spray 4 frames, wake 4, drops 3, splash 4, crest 3; frames of one sprite are the same size, at most 12x8, non-empty, chars '.wBbT' only,
     and every pixel has a neighbour (8-way) in its frame, except in drops, whose isolated droplets are intended. */
import {lintPoseFrames} from './lint_mascot_body.mjs';
import {ANIM_SURF,SURF_FOAM} from '../mascot/anim_surf.js';
import {compose,MB} from '../mascot/atlas.js';
export const NAMES=['ride','rideFast','brake','noseUp','noseDown','wobble1','wobble2','mount','launch','sink1','sink2'];
const OFFBOARD=new Set(['launch','sink1','sink2']);
export const FOAM_SPEC={spray:4,wake:4,drops:3,splash:4,crest:3};
const cellsOf=f=>{const s=new Set();f.v[0].forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.')s.add((f.y0+y)*64+f.x0+x)});for(const [x,y,rows] of f.feet||[])rows.forEach((r,j)=>{for(let i=0;i<r.length;i++)if(r[i]==='k')s.add((y+j)*64+x+i)});return s};
const sd=(a,b)=>{let n=0;for(const k of a)if(!b.has(k))n++;for(const k of b)if(!a.has(k))n++;return n};
const onCanvas=(x,y)=>x>=0&&x<32&&y>=0&&y<48;
function lintBoard(f,E,hidden){
  const B=f.board;
  if(!B||!Number.isInteger(B.x0)||!Number.isInteger(B.y0)||!Array.isArray(B.rows)||!B.rows.length){E('needs a board field {x0,y0,rows}');return null}
  const w=B.rows[0].length;if(!B.rows.every(r=>typeof r==='string'&&r.length===w)){E('board rows must be equal-length strings');return null}
  const px=new Map();B.rows.forEach((r,j)=>{for(let i=0;i<w;i++)if(r[i]!=='.')px.set((B.y0+j)*64+B.x0+i,r[i])});
  const at=(x,y)=>px.get(y*64+x)||'.';
  let x0=99,x1=-1;
  for(const [k,c] of px){const x=k%64,y=Math.floor(k/64);x0=Math.min(x0,x);x1=Math.max(x1,x);
    if(!'koYB'.includes(c))E(`board pixel ${x},${y} is '${c}', want board colours k o Y B`);
    if(!onCanvas(x,y))E(`board pixel ${x},${y} is off the canvas`);
    const edge=[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>at(x+a,y+b)==='.');
    if(edge&&c!=='k')E(`board edge pixel ${x},${y} is '${c}', must be ink`);
    if(!edge&&c==='k')E(`board ink pixel ${x},${y} is inside the board`);
    if(c==='k'){if(at(x+1,y)==='k'&&at(x,y+1)==='k'&&at(x+1,y+1)==='k')E(`board has a 2x2 ink block at ${x},${y}`);
      let n=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)if((a||b)&&at(x+a,y+b)==='k')n++;if(n<2)E(`board has a dead-end ink pixel at ${x},${y}`)}}
  // length: the longest distance between two board pixels (a tilted or upended board counts along its length); sink2 shows only the nose
  const P=[...px.keys()].map(k=>[k%64,Math.floor(k/64)]);let len=0;for(const a of P)for(const b of P)len=Math.max(len,Math.hypot(a[0]-b[0],a[1]-b[1]));len=Math.round(len)+1;
  const [lo,hi]=f.name==='sink2'?[8,28]:[22,30];if(len<lo||len>hi)E(`board is ${len} px long (want ${lo}..${hi})`);
  // the board shows in over
  const O=f.over;if(O&&Array.isArray(O.rows)){const oa=(x,y)=>{const r=O.rows[y-O.y0];return r&&x>=O.x0&&x<O.x0+r.length?r[x-O.x0]:'.'};
    for(const [k,c] of px){const x=k%64,y=Math.floor(k/64),o=oa(x,y);if(o!==c&&!'wBbT'.includes(o)&&!(hidden&&hidden(x,y))){E(`board pixel ${x},${y} ('${c}') is not in over (has '${o}')`);break}}}
  for(const nm of ['tail','nose']){const a=f[nm];if(!Array.isArray(a)||a.length!==2||!px.has(a[1]*64+a[0]))E(`${nm} anchor ${JSON.stringify(a)} is not on a board pixel`)}
  return {px,at};
}
function lintFoam(errs){
  const F=SURF_FOAM||{};
  for(const k of Object.keys(F))if(!(k in FOAM_SPEC))errs.push(`SURF_FOAM.${k}: not a documented sprite`);
  for(const [k,n] of Object.entries(FOAM_SPEC)){const S=F[k],E=m=>errs.push(`SURF_FOAM.${k}: ${m}`);
    if(!Array.isArray(S)){E('missing');continue}
    if(S.length!==n)E(`has ${S.length} frames, want ${n}`);
    const dims=new Set();
    S.forEach((fr,fi)=>{if(!Array.isArray(fr)||!fr.length||!fr.every(r=>typeof r==='string'&&r.length===fr[0].length)){E(`frame ${fi} must be equal-length rows`);return}
      const h=fr.length,w=fr[0].length;dims.add(w+'x'+h);if(w>12||h>8)E(`frame ${fi} is ${w}x${h} (max 12x8)`);
      const at=(x,y)=>y>=0&&y<h&&x>=0&&x<w?fr[y][x]:'.';let n=0;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=fr[y][x];if(c==='.')continue;n++;
        if(!'wBbT'.includes(c))E(`frame ${fi} has char '${c}' at ${x},${y} (want . w B b T)`);
        if(k!=='drops'){let m=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)if((a||b)&&at(x+a,y+b)!=='.')m++;if(!m)E(`frame ${fi} has an orphan pixel at ${x},${y}`)}}
      if(!n)E(`frame ${fi} is empty`)});
    if(dims.size>1)E(`frames differ in size (${[...dims].join(', ')})`)}
}
export function lint(){
  const F=ANIM_SURF.frames,errs=lintPoseFrames('surf',F,{minFrames:NAMES.length,anyLight:true,turnsMax:6});
  if(F.length<NAMES.length)errs.push(`surf: ${F.length} frames, the wiring note documents ${NAMES.length}`);
  const known=new Set(['.',...Object.keys(MB)]);
  F.forEach((f,fi)=>{
    const E=m=>errs.push(`surf[${fi}] ${f.name}: ${m}`);
    if(fi<NAMES.length&&f.name!==NAMES[fi])E(`must be named '${NAMES[fi]}'`);
    if(f.baked)E('must not be baked: compose draws the face, sprout and hat');
    if(!f.v||!f.v[0])return;
    const rows=f.v[0],h=rows.length,body=(x,y)=>{const r=rows[y-f.y0];return r&&x>=f.x0&&x<f.x0+r.length?r[x-f.x0]:'.'};
    if(!f.over)E('needs an over layer (the board)');
    else{const O=f.over;O.rows.forEach((r,j)=>{for(let i=0;i<r.length;i++)if(r[i]!=='.'&&!onCanvas(O.x0+i,O.y0+j))E(`over pixel ${O.x0+i},${O.y0+j} is off the canvas`)})}
    rows.forEach((r,j)=>{for(let i=0;i<r.length;i++)if(r[i]!=='.'&&!onCanvas(f.x0+i,f.y0+j))E('the body leaves the canvas')});
    const footAt=(x,y)=>(f.feet||[]).some(([fx,fy,fr])=>fr[y-fy]&&fr[y-fy][x-fx]==='k');
    const Bd=lintBoard(f,E,OFFBOARD.has(f.name)?(x,y)=>body(x,y)!=='.'||footAt(x,y):null);
    // feet
    if(!Array.isArray(f.feet)||f.feet.length!==2)E('needs exactly two feet');
    else{const boxes=[];
      f.feet.forEach(([fx,fy,fr],i)=>{const w=fr[0].length,y1=fy+fr.length-1;boxes.push([fx,fx+w-1,fy,y1]);
        fr.forEach((r,j)=>{for(let a=0;a<w;a++)if(r[a]==='k'&&!onCanvas(fx+a,fy+j))E(`foot ${i} leaves the canvas`)});
        if(Bd&&!OFFBOARD.has(f.name)){
          // the lowest foot row against the board's top pixel in the same columns
          let top=99;for(let a=0;a<w;a++){if(!fr.some(r=>r[a]==='k'))continue;for(let y=0;y<48;y++)if(Bd.at(fx+a,y)!=='.'){top=Math.min(top,y);break}}
          const low=y1,gap=top-low;
          if(top===99)E(`foot ${i} is not over the board`);
          else if(gap>1)E(`foot ${i} floats ${gap-1} px above the deck (lowest row ${low}, deck ${top})`);
          else if(gap<0)E(`foot ${i} is buried ${-gap} px into the board (lowest row ${low}, deck ${top})`)}});
      if(boxes.length===2){const [a,b]=boxes;if(a[0]<=b[1]+1&&b[0]<=a[1]+1&&a[2]<=b[3]+1&&b[2]<=a[3]+1)E('the feet touch or overlap each other')}}
    // compose
    for(const flip of [0,1])for(const [tag,extra] of [['plain',{}],['scared',{face:'scared'}],['crown',{hat:'crown'}],['party',{hat:'party'}],['sprout0',{stage:0}],['sprout3',{stage:3}]]){
      const look={pose:'surf:'+fi,flip,dir:[1,0],air:1,stage:0,...extra},g=compose(look),T=`${tag}${flip?' flipped':''}`;
      if(g.length!==48||g.some(r=>r.length!==32)){E(`${T}: compose is not 32x48`);continue}
      let bad=0;for(const r of g)for(const c of r)if(!known.has(c))bad++;if(bad)E(`${T}: unknown palette chars`);
      if(tag==='plain'||tag==='scared'){const a=compose({...look,blink:1,face:undefined}),off=[];
        for(let y=0;y<48;y++)for(let x=0;x<32;x++){const X=flip?31-x:x;if(g[y][x]!==a[y][x]&&!'rpR'.includes(body(X,y)))off.push(`${x},${y}`)}
        if(off.length)E(`${T}: the face draws off the body fill at ${off.slice(0,4).join(' ')}`)}
      if(tag==='crown'||tag==='party'){
        const a=compose({...look,hat:undefined}),hc=[];for(let y=0;y<48;y++)for(let x=0;x<32;x++)if(a[y][x]!==g[y][x])hc.push([x,y]);
        const want=(tag==='party'?["....w....","...kok...","...kHk...","..kkokk..","..kHHHk..",".kkokokk.",".kHHHHHk.","kkkkkkkkk"]:["k...k...k","kY.kYk.Yk","kYkkYkkYk","kYYYYYYYk","kYoYHYoYk","kkkkkkkkk"]).join('').replace(/\./g,'').length;
        if(!hc.length){E(`${T}: no hat drawn`);continue}
        if(hc.length<want-6)E(`${T}: the hat is cut off (${hc.length} of ${want} px changed)`);
        const brim=Math.max(...hc.map(c=>c[1])),xs=[...new Set(hc.filter(c=>c[1]===brim).map(c=>c[0]))];
        const gaps=xs.map(x=>{for(let y=0;y<48;y++)if(a[y][x]!=='.')return y-brim-1;return 48});
        if(Math.max(...gaps)>1)E(`${T}: the hat floats (brim row ${brim}, gaps ${gaps.join(',')})`);
        if(hc.some(([x,y])=>y>=f.cy-6&&y<=f.cy))E(`${T}: the hat covers the eyes`)}
      if(tag==='sprout3'){const cx=flip?33-f.fcx:f.fcx;let top=-1,n=0;for(let y=0;y<48;y++)if(g[y][cx]==='n'){top=y;n++}
        if(top<0||'kprR'.indexOf(g[top+1]&&g[top+1][cx])<0)E(`${T}: the stem does not grow from the head at column ${cx}`);
        else if('rpR'.includes(g[top+1][cx-1])&&'rpR'.includes(g[top+1][cx+1]))E(`${T}: the stem grows out of the head dip at column ${cx}`);
        if(n<7||top-6<0)E(`${T}: the sprout is cut off at the top of the canvas`)}
    }
  });
  // wobble pair
  {const a=NAMES.indexOf('wobble1'),b=NAMES.indexOf('wobble2');if(F[a]&&F[b]&&F[a].v&&F[b].v){const d=sd(cellsOf(F[a]),cellsOf(F[b]));if(d<8||d>80)errs.push(`surf: wobble1 to wobble2 changes ${d} px (want 8..80)`)}}
  lintFoam(errs);
  return errs;
}
if(import.meta.url===`file://${process.argv[1]}`){
  const e=lint();
  if(e.length){console.log(e.length+' problem'+(e.length>1?'s':'')+':\n  '+e.join('\n  '));process.exit(1)}
  console.log('surf lint green: '+ANIM_SURF.frames.length+' frames, '+Object.keys(SURF_FOAM).length+' foam sprites');
}
