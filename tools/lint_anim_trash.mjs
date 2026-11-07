#!/usr/bin/env node
/* Lint for mascot/anim_trash.js (the head-first dive into the Trash, the redesigned 40x64 character). Run: node tools/lint_anim_trash.mjs   (tools/test_mascot.mjs also calls lint()).
   On top of lintPoseFrames (structure, closed 1 px outline, kprR body, world light allowed anywhere, bounds) it checks what a baked frame skips:
   - face: every eye, brow, pupil and mouth pixel ('k','w','m' in the over layer inside the frame's face box) sits on body fill (r p R), with a 1 px ring of body fill
     around it that nothing else in the over layer covers; cheeks 'c' sit on fill; both eyes are whole (at least 2 x 20 white pixels);
   - sweat bead (frames 0..3): a small T/h blob with no stem 'n', clear of the body by at least 1 px;
   - leaf: a T/h/n blob whose stem 'n' touches the body outline;
   - shoes: at least two visible shoe blobs (u U v V), each within 3 px of the body; nubs: two red blobs in the over layer, each touching the body;
   - the body centre (pixel centroid of v) stays within 2 px of the rotation centre, the centroid of BODY.T2 (19.6, 43.7), so the turn happens in place;
   - frame 0 is compose({lv:'T2',ft:'together',stage:3}) pixel for pixel outside its face box and the sweat bead, so swapping into it does not jump;
   - kick A (4) and kick B (5) shoes differ; the rummage tilts (6, 7) differ in body and shoes;
   - compose() renders every frame, plain and flip:1, to a 40x64 grid of known palette chars, and every authored pixel lies on the canvas. */
import {lintPoseFrames} from './lint_mascot_body.mjs';
import {ANIM_TRASH} from '../mascot/anim_trash.js';
import {BODY} from '../mascot/body.js';
import {compose,MB} from '../mascot/atlas.js';
const N=8,W=40,H=64;
const k8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
function blobs(set){const seen=new Set(),out=[];for(const key of set){if(seen.has(key))continue;const b=[],q=[key];seen.add(key);
  while(q.length){const k=q.pop();b.push(k);const x=k%W,y=Math.floor(k/W);for(const [a,c] of k8){const n=(y+c)*W+x+a;if(x+a>=0&&x+a<W&&set.has(n)&&!seen.has(n)){seen.add(n);q.push(n)}}}out.push(b)}return out}
const T2=BODY.T2;let cx0=0,cy0=0,n0=0;T2.v[0].forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.'){cx0+=T2.x0+x;cy0+=T2.y0+y;n0++}});cx0/=n0;cy0/=n0;
export function lint(){
  const F=ANIM_TRASH.frames,errs=lintPoseFrames('trash',F,{baked:true,anyLight:true,turnsMax:6,minFrames:N});
  if(F.length!==N)errs.push(`trash: ${F.length} frames, the wiring note covers ${N}`);
  const info=[];
  F.forEach((f,fi)=>{
    const E=m=>errs.push(`trash[${fi}]: ${m}`);
    if(f.baked!==true)E('must be baked:true (the whole sprite is drawn into the frame)');
    if(!f.v||!f.v[0]||!f.over)return E('needs v and over');
    const B=new Map(),O=new Map();
    f.v[0].forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.')B.set((f.y0+y)*W+f.x0+x,r[x])});
    f.over.rows.forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.')O.set((f.over.y0+y)*W+f.over.x0+x,r[x])});
    for(const k of [...B.keys(),...O.keys()]){const x=k%W,y=Math.floor(k/W);if(x<0||x>=W||y<0||y>=H){E('a pixel leaves the 40x64 cell');break}}
    const body=k=>B.get(k)||'.',fill=k=>'rpR'.includes(body(k))&&body(k)!=='.';
    // centre
    let sx=0,sy=0;for(const k of B.keys()){sx+=k%W;sy+=Math.floor(k/W)}sx/=B.size;sy/=B.size;
    if(Math.hypot(sx-cx0,sy-cy0)>2)E(`body centre ${sx.toFixed(1)},${sy.toFixed(1)} is more than 2 px from the turn centre ${cx0.toFixed(1)},${cy0.toFixed(1)}`);
    // face
    const fb=f.face;if(!Array.isArray(fb)||fb.length!==4){E('needs face:[x0,y0,x1,y1] (the box the baked face lies in)');return}
    const inBox=k=>{const x=k%W,y=Math.floor(k/W);return x>=fb[0]&&x<=fb[2]&&y>=fb[1]&&y<=fb[3]};
    const face=new Set();let whites=0;const bad=new Set();
    const nubInk=k=>{const x=k%W,y=Math.floor(k/W);return k8.some(([a,c])=>'rpR'.includes(O.get((y+c)*W+x+a)||'.'))};   // a nub's outline is not face
    for(const [k,c] of O){if(!inBox(k))continue;if('kwm'.includes(c)&&!(c==='k'&&nubInk(k))){face.add(k);if(c==='w')whites++}else if(c==='c'){if(!fill(k))bad.add(k)}}
    if(whites<24)E(`the face has ${whites} white eye pixels (two open eyes have at least 24)`);
    for(const k of face){if(!fill(k))bad.add(k);const x=k%W,y=Math.floor(k/W);
      for(const [a,c] of k8){const n=(y+c)*W+x+a;if(face.has(n))continue;if(!fill(n)||(O.has(n)&&O.get(n)!=='c'))bad.add(n)}}
    if(bad.size)E(`face needs body fill under it and a clear 1 px ring of fill around it; not so at: ${[...bad].slice(0,6).map(k=>`${k%W},${Math.floor(k/W)}`).join(' ')}${bad.size>6?' ...':''}`);
    // leaf and sweat bead
    const teal=new Set([...O].filter(([k,c])=>'Thn'.includes(c)).map(([k])=>k)),tb=blobs(teal);
    const leaf=tb.filter(b=>b.some(k=>O.get(k)==='n')),beads=tb.filter(b=>!b.some(k=>O.get(k)==='n'));
    const touchesInk=k=>{const x=k%W,y=Math.floor(k/W);return [[1,0],[-1,0],[0,1],[0,-1]].some(([a,c])=>body((y+c)*W+x+a)==='k')};
    if(leaf.length!==1)E(`wants one leaf with its stem (found ${leaf.length})`);
    else if(!leaf[0].some(k=>O.get(k)==='n'&&touchesInk(k)))E('the stem does not grow out of the body outline');
    if(fi<=3){if(beads.length!==1)E(`wants one sweat bead beside the head (found ${beads.length})`);
      else{const b=beads[0];if(b.length>8)E(`sweat bead is ${b.length} px (max 8)`);
        if(b.some(k=>{const x=k%W,y=Math.floor(k/W);return [[0,0],...k8].some(([a,c])=>B.has((y+c)*W+x+a))}))E('the sweat bead touches the body')}}
    else if(beads.length)E('no sweat bead once he is upside down');
    // shoes
    const shoeSet=new Set([...O].filter(([k,c])=>'uUvV'.includes(c)).map(([k])=>k)),sb=blobs(shoeSet).filter(b=>b.length>=4);
    if(sb.length<2)E(`wants two visible shoes (found ${sb.length})`);
    const dist=k=>{const x=k%W,y=Math.floor(k/W);let d=99;for(const q of B.keys())d=Math.min(d,Math.max(Math.abs(q%W-x),Math.abs(Math.floor(q/W)-y)));return d};
    sb.forEach((b,i)=>{const d=Math.min(...b.map(dist));if(d>3)E(`shoe ${i} is ${d} px from the body (max 3)`)});
    // nubs
    const nubSet=new Set([...O].filter(([k,c])=>'rpR'.includes(c)).map(([k])=>k)),nb=blobs(nubSet);
    if(nb.length!==2)E(`wants two arm nubs (found ${nb.length} red blobs in the over layer)`);
    nb.forEach((b,i)=>{if(Math.min(...b.map(dist))>2)E(`nub ${i} floats off the body`)});
    info[fi]={B,shoes:shoeSet};
  });
  const sd=(a,b)=>{let n=0;for(const k of a)if(!b.has(k))n++;for(const k of b)if(!a.has(k))n++;return n};
  if(info[4]&&info[5]&&sd(info[4].shoes,info[5].shoes)<6)errs.push('trash: kick A (4) and kick B (5) shoes must differ');
  if(info[6]&&info[7]&&(sd(new Set(info[6].B.keys()),new Set(info[7].B.keys()))<8||sd(info[6].shoes,info[7].shoes)<6))errs.push('trash: the rummage tilts (6, 7) must differ in body and shoes');
  // frame 0 = the upright stretch pose with the shoes together, outside the face and the bead
  if(F[0]&&F[0].face){const a=compose({pose:'trash:0',air:1}),b=compose({lv:'T2',ft:'together',stage:3,air:1}),fb=F[0].face;let d=0;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(x>=fb[0]&&x<=fb[2]&&y>=fb[1]&&y<=fb[3])continue;if(a[y][x]!==b[y][x]&&!('Th'.includes(a[y][x])&&b[y][x]==='.'))d++}
    if(d)errs.push(`trash[0]: ${d} pixels differ from compose({lv:'T2',ft:'together',stage:3}) outside the face and the bead (frame 0 must not jump)`)}
  // compose: plain and mirrored, 40x64, known chars, nothing lost
  F.forEach((f,i)=>{for(const flip of [0,1]){let g;
    try{g=compose({pose:'trash:'+i,flip,air:1})}catch(e){errs.push(`trash[${i}] flip ${flip}: compose throws ${e.message}`);continue}
    if(g.length!==H||g.some(r=>r.length!==W)){errs.push(`trash[${i}] flip ${flip}: grid is not ${W}x${H}`);continue}
    for(const r of g)for(const c of r)if(c!=='.'&&!MB[c]){errs.push(`trash[${i}] flip ${flip}: unknown char '${c}'`);break}
    let bad=0;f.v[0].forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.'){const X=flip?W-1-(f.x0+x):f.x0+x,Y=f.y0+y;if(!g[Y]||g[Y][X]==='.')bad++}});
    if(bad)errs.push(`trash[${i}] flip ${flip}: ${bad} body pixels missing from the composed grid`)}});
  return errs;
}
if(import.meta.url===`file://${process.argv[1]}`){const e=lint();console.log(e.length?e.length+' problem(s):\n  '+e.join('\n  '):'trash lint green');process.exit(e.length?1:0)}
