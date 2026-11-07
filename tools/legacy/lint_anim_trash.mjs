#!/usr/bin/env node
/* Lint for mascot/anim_trash.js (the head-first dive into the Trash). Run: node tools/lint_anim_trash.mjs   (tools/test_mascot.mjs also calls lint()).
   On top of lintPoseFrames (structure, outline, palette, bounds) it checks what a baked frame skips:
   - the baked face (eyes, brows, mouth) sits on body fill (r p R) with 1 px of body fill around it; the cheeks 'c' sit on fill; a sweat bead 'T' sits
     outside the body without touching it;
   - the stem 'n' sits outside the body, touches the outline, and is one connected run of 1 to 3 px;
   - two feet per frame, 2 to 6 px wide, 1 to 3 px from the body, not overlapping the body or each other;
   - the body stays inside the canvas and centred: its pixel centre within 2 px of column 15.5 and of row 29.5, so the dive rotates about the body centre;
   - kick A (4) and kick B (5) feet differ by at least 2 px, and so do the two rummage tilts (6, 7) in body and feet;
   - compose() renders every frame, plain and mirrored (flip:1), to a 32x48 grid of known palette chars, with every authored pixel landing on the canvas. */
import {lintPoseFrames} from './lint_mascot_body.mjs';
import {ANIM_TRASH} from '../mascot/anim_trash.js';
import {compose,MB} from '../mascot/atlas.js';
const N=8;
export function lint(){
  const F=ANIM_TRASH.frames,errs=lintPoseFrames('trash',F,{baked:true,anyLight:true,turnsMax:6,minFrames:N});
  if(F.length>N+2)errs.push(`trash: ${F.length} frames, the wiring note covers ${N} to ${N+2}`);
  const feetKey=f=>{const s=new Set();for(const [x,y,r] of f.feet||[])r.forEach((row,j)=>{for(let i=0;i<row.length;i++)if(row[i]==='k')s.add((y+j)*64+x+i)});return s};
  const bodyKey=f=>{const s=new Set();f.v[0].forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.')s.add((f.y0+y)*64+f.x0+x)});return s};
  const sd=(a,b)=>{let n=0;for(const k of a)if(!b.has(k))n++;for(const k of b)if(!a.has(k))n++;return n};
  F.forEach((f,fi)=>{
    const E=m=>errs.push(`trash[${fi}]: ${m}`);
    if(f.baked!==true)E('must be baked:true (the face is drawn into the frame)');
    if(!f.v||!f.v[0])return;
    for(const rows of f.v){
      const body=(x,y)=>{const r=rows[y-f.y0];return r&&x>=f.x0&&x<f.x0+r.length?r[x-f.x0]:'.'};
      const fill=(x,y)=>'rpR'.includes(body(x,y))&&body(x,y)!=='.';
      // centre
      let sx=0,sy=0,n=0;rows.forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.'){sx+=f.x0+x;sy+=f.y0+y;n++}});
      if(Math.abs(sx/n-15.5)>2||Math.abs(sy/n-29.5)>2)E(`body centre ${(sx/n).toFixed(1)},${(sy/n).toFixed(1)} drifts from 15.5,29.5 (the flip must rotate in place)`);
      // overlay: face on fill with a margin, stem on the outline
      const O=f.over;if(!O){E('needs an over (the baked face)');continue}
      const face=new Set(),stem=[],cheek=[],sweat=[];
      O.rows.forEach((r,j)=>{for(let i=0;i<r.length;i++){const c=r[i];if(c==='.')continue;const x=O.x0+i,y=O.y0+j;if(c==='n')stem.push([x,y]);else if(c==='c')cheek.push([x,y]);else if(c==='T')sweat.push([x,y]);else face.add(y*64+x)}});
      // a sweat bead flies off beside the head: outside the body, not touching it
      for(const [x,y] of sweat)if([[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>body(x+a,y+b)!=='.')){E(`sweat pixel ${x},${y} touches the body`);break}
      if(!face.size)E('the overlay has no face');
      const bad=new Set();
      for(const [x,y] of cheek)if(!fill(x,y))bad.add(`${x},${y}`);   // cheeks only need to sit on fill (as in compose, they may touch the outline)
      for(const k of face){const x=k%64,y=Math.floor(k/64);if(!fill(x,y))bad.add(`${x},${y}`);
        for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){if(face.has((y+b)*64+x+a))continue;if(!fill(x+a,y+b))bad.add(`${x+a},${y+b}`)}}
      if(bad.size)E(`face needs body fill under and 1 px around it; not fill: ${[...bad].slice(0,6).join(' ')}${bad.size>6?' ...':''}`);
      if(stem.length<1||stem.length>3)E(`stem is ${stem.length} px (want 1 to 3)`);
      else{
        if(stem.some(([x,y])=>body(x,y)!=='.'))E('the stem covers the body (it grows out of the head, outside the outline)');
        if(!stem.some(([x,y])=>[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>body(x+a,y+b)==='k')))E('the stem does not touch the outline');
        const st=new Set(stem.map(([x,y])=>y*64+x)),seen=new Set([stem[0][1]*64+stem[0][0]]),q=[stem[0]];
        while(q.length){const [x,y]=q.pop();for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const k=(y+b)*64+x+a;if(st.has(k)&&!seen.has(k)){seen.add(k);q.push([x+a,y+b])}}}
        if(seen.size!==stem.length)E('the stem is not one run');
      }
      // feet
      if(!Array.isArray(f.feet)||f.feet.length!==2){E('needs exactly two feet');continue}
      const boxes=[];
      f.feet.forEach(([fx,fy,fr],i)=>{const w=fr[0].length;if(w<2||w>6)E(`foot ${i} is ${w} px wide (want 2 to 6)`);
        for(let a=0;a<fr.length-1;a++)if(![...fr[a]].some((c,x)=>c==='k'&&fr[a+1][x]==='k'))E(`foot ${i} rows ${a} and ${a+1} do not touch`);
        let near=99;fr.forEach((r,yy)=>{for(let xx=0;xx<w;xx++)if(r[xx]==='k')rows.forEach((br,by)=>{for(let bx=0;bx<br.length;bx++)if(br[bx]!=='.')near=Math.min(near,Math.max(Math.abs(f.x0+bx-(fx+xx)),Math.abs(f.y0+by-(fy+yy))))})});
        if(near<1)E(`foot ${i} overlaps the body`);if(near>3)E(`foot ${i} floats ${near} px from the body (max 3)`);
        boxes.push([fx,fx+w-1,fy,fy+fr.length-1])});
      if(boxes.length===2){const [a,b]=boxes;if(a[0]<=b[1]+1&&b[0]<=a[1]+1&&a[2]<=b[3]+1&&b[2]<=a[3]+1)E('the feet touch or overlap each other')}
    }
  });
  if(F[4]&&F[5]&&sd(feetKey(F[4]),feetKey(F[5]))<2)errs.push('trash: kick A (4) and kick B (5) feet must differ');
  if(F[6]&&F[7]&&(sd(bodyKey(F[6]),bodyKey(F[7]))<8||sd(feetKey(F[6]),feetKey(F[7]))<2))errs.push('trash: the rummage tilts (6, 7) must differ in body and feet');
  // compose: plain and mirrored, 32x48, known chars, and every authored pixel lands on the canvas (compose crops silently)
  F.forEach((f,i)=>{for(const flip of [0,1]){let g;
    try{g=compose({pose:'trash:'+i,flip,dir:[0,0],stage:0,air:1})}catch(e){errs.push(`trash[${i}] flip ${flip}: compose throws ${e.message}`);continue}
    if(g.length!==48||g.some(r=>r.length!==32))errs.push(`trash[${i}] flip ${flip}: grid is not 32x48`);
    for(const r of g)for(const c of r)if(c!=='.'&&!MB[c]){errs.push(`trash[${i}] flip ${flip}: unknown char '${c}'`);break}
    let auth=0;for(const r of f.v[0])for(const c of r)if(c!=='.')auth++;
    let drawn=0;for(const r of g)for(const c of r)if(c!=='.')drawn++;
    if(drawn<auth)errs.push(`trash[${i}] flip ${flip}: ${auth-drawn} body pixels fall off the canvas`)}});
  return errs;
}
if(import.meta.url===`file://${process.argv[1]}`){const e=lint();console.log(e.length?e.length+' problem(s):\n  '+e.join('\n  '):'trash lint green');process.exit(e.length?1:0)}
