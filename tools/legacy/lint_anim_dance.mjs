#!/usr/bin/env node
/* Lint for mascot/anim_dance.js (the hand-drawn dance loop). Run: node tools/lint_anim_dance.mjs  (prints the beat table, exits 1 on a problem).
   tools/test_mascot.mjs calls lint(), which returns a list of problems (empty = green). Rules:
   - the structural pose-frame rules of lintPoseFrames (closed 1 px outline, fill, highlight top left, shade bottom right, face margin), on every frame AND on its
     mirror image (so the caller may also play the whole dance flipped);
   - exactly 8 frames; frames 0,1,4,7 are planted (body's last row 41, feet end on row 43), frames 2,3,5,6 are in the air (body's last row 40 or 39,
     feet end on row 41 or 42, below the body);
   - each foot sits 1 to 3 px from the body (never on it) and the two feet do not overlap;
   - small steps: silhouette+feet change at most 60 px on the beats that are not a take-off or a landing (0>1, 2>3, 5>6, 7>0) and at most 320 px on a take-off or landing (the approved
     squash-to-stretch step S2 to T2 alone is 155 px, plus the 2 px lift and the swing to the other side),
     and the face anchor moves at most 1 px on those small steps;
   - 1 px of room left and right (dx -1..1 stays on the canvas), room above the head for sprout stage 4 and both hats, and every frame composes (atlas.js compose) to a 32x48 grid of known palette chars with every
     sprout stage, both hats, the happy mouth, and flipped. */
import {ANIM_DANCE} from '../mascot/anim_dance.js';
import {compose,MB} from '../mascot/atlas.js';
import {lintPoseFrames} from './lint_mascot_body.mjs';
const AIR=new Set([2,3,5,6]),SMALL=new Set(['0>1','2>3','5>6','7>0']),SMALL_MAX=60,HOP_MAX=320;
const flipFrame=F=>{const w=F.v[0][0].length;return {...F,x0:32-F.x0-w,fcx:33-F.fcx,v:F.v.map(rows=>rows.map(r=>[...r].reverse().join(''))),
  feet:(F.feet||[]).map(([x,y,r])=>[32-x-r[0].length,y,r.map(s=>[...s].reverse().join(''))])}};
function cells(F){const body=new Set(),feet=new Set();F.v[0].forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.')body.add((F.y0+y)*64+F.x0+x)});
  for(const [fx,fy,rows] of F.feet||[])rows.forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]==='k')feet.add((fy+y)*64+fx+x)});return {body,feet}}
const symdiff=(a,b)=>{let n=0;for(const k of a)if(!b.has(k))n++;for(const k of b)if(!a.has(k))n++;return n};
export function stats(){
  const F=ANIM_DANCE.frames,out=[];
  for(let i=0;i<F.length;i++){const j=(i+1)%F.length,a=cells(F[i]),b=cells(F[j]);
    const sil=symdiff(new Set([...a.body,...a.feet]),new Set([...b.body,...b.feet]));
    const ga=compose({pose:'dance:'+i,dir:[0,0],stage:1,happy:1}),gb=compose({pose:'dance:'+j,dir:[0,0],stage:1,happy:1});let px=0;for(let y=0;y<48;y++)for(let x=0;x<32;x++)if(ga[y][x]!==gb[y][x])px++;
    out.push({pair:i+'>'+j,sil,px,dfcx:F[j].fcx-F[i].fcx,dcy:F[j].cy-F[i].cy})}
  return out}
export function lint(){
  const F=ANIM_DANCE.frames,errors=[];
  if(!Array.isArray(F)||F.length!==8)return ['dance: needs exactly 8 frames'];
  errors.push(...lintPoseFrames('dance',F,{minFrames:8}));
  errors.push(...lintPoseFrames('dance(flipped)',F.map(flipFrame),{minFrames:8,anyLight:true}));
  F.forEach((L,i)=>{const E=m=>errors.push(`dance[${i}]: ${m}`);if(!L.v||!L.v[0])return;
    const h=L.v[0].length,last=L.y0+h-1,air=AIR.has(i);
    if(air?(last<39||last>40):last!==41)E(`body's last row is ${last}, want ${air?'39 or 40 (in the air)':'41 (planted)'}`);
    {const w=L.v[0][0].length,xs=[L.x0,L.x0+w-1,...(L.feet||[]).flatMap(([x,,r])=>[x,x+r[0].length-1])];if(Math.min(...xs)-1<0||Math.max(...xs)+1>31)E('needs 1 px of room on each side so the caller may pass dx -1..1')}
    if(L.y0<13)E(`the head top (row ${L.y0}) leaves no room for sprout stage 4 or a hat (need row 13 or lower)`);
    if(!Array.isArray(L.feet)||L.feet.length!==2){E('needs exactly two feet');return}
    const {body}=cells(L),ext=[];
    for(const [k,[fx,fy,rows]] of L.feet.entries()){const end=fy+rows.length-1;
      if(air?(end<41||end>42||fy<=last):end!==43)E(`foot ${k} ends on row ${end}, want ${air?'41 or 42, under the body':'43 (planted)'}`);
      let near=99;rows.forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]==='k')for(const c of body)near=Math.min(near,Math.max(Math.abs(c%64-(fx+x)),Math.abs(Math.floor(c/64)-(fy+y))))});
      if(near<1)E(`foot ${k} overlaps the body`);if(near>3)E(`foot ${k} floats ${near} px from the body (max 3)`);
      ext.push([fx,fx+rows[0].length-1,fy,end])}
    if(ext.length===2){const [a,b]=ext;if(a[0]<=b[1]+1&&b[0]<=a[1]+1&&a[2]<=b[3]&&b[2]<=a[3])E('the feet touch or overlap')}
    for(const flip of [0,1])for(const stage of [0,1,2,3,4])for(const hat of [0,'crown','party']){const g=compose({pose:'dance:'+i,flip,dir:[0,0],stage,hat,happy:1,air:AIR.has(i)?1:0});
      if(g.length!==48||g.some(r=>r.length!==32||r.some(c=>c!=='.'&&!MB[c]))){E(`compose(flip ${flip}, stage ${stage}, hat ${hat}) is not a 32x48 grid of palette chars`);break}}
  });
  for(const s of stats()){const small=SMALL.has(s.pair),max=small?SMALL_MAX:HOP_MAX;
    if(s.sil>max)errors.push(`dance ${s.pair}: changes ${s.sil} px of silhouette+feet (max ${max}${small?', not a take-off or landing':''})`);
    if(small&&(Math.abs(s.dfcx)>1||Math.abs(s.dcy)>1))errors.push(`dance ${s.pair}: the face jumps (fcx ${s.dfcx}, cy ${s.dcy}); max 1 px on a small step`)}
  return errors;
}
if(import.meta.url===`file://${process.argv[1]}`){
  for(const s of stats())console.log(`${s.pair}  silhouette+feet ${String(s.sil).padStart(3)}  composed px ${String(s.px).padStart(3)}  face ${s.dfcx>=0?'+':''}${s.dfcx},${s.dcy>=0?'+':''}${s.dcy}${SMALL.has(s.pair)?'  (small step)':''}`);
  const e=lint();if(e.length){console.log('\n'+e.length+' problem'+(e.length>1?'s':'')+':\n  '+e.join('\n  '));process.exit(1)}
  console.log('\nlint green');
}
