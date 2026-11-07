#!/usr/bin/env node
/* Lint for mascot/faces.js (FACES and LIDS). Run: node tools/lint_anim_faces.mjs   (tools/test_mascot.mjs runs lint() too; [] = green)
   Every face and every lid is composed (mascot/atlas.js compose) on every body: the levels S3 S2 S1 rest T1 T2 T3 breath with boil variants 0..2,
   and the hanging lean frames -3..3 with their variants. For each one it checks:
     - the grid is 32x48 and uses only palette chars;
     - the silhouette (non-clear pixels) is the same as the same look without the face or lid: nothing is drawn outside the body;
     - every pixel the face or lid draws lands on body colour (r p R) of the raw body, with 1 px of body colour all round it
       (never on or touching the ink outline), and is really there in the composed grid;
     - eyes are 6x7 boxes, each with some ink, the two at the same height (ink centres within 2 rows); the mouth sits under the eyes
       (from row cy+1) in the mouth columns cx-3..cx+2, between the eyes;
     - mouths stay in rows cy+2..cy+5 and columns cx-3..cx+2, the mouth box every body and every non-baked pose frame guarantees;
     - LIDS: four 5x4 lids over the white interior: body colour from the top down to a full ink lid line, each line lower than the last,
       drawn with the pupil looking in all nine directions; in every direction some pupil still shows under every lid. */
import {compose,MB} from '../mascot/atlas.js';
import {BODY} from '../mascot/body.js';
import {LEAN} from '../mascot/lean.js';
import {FACES,LIDS} from '../mascot/faces.js';
import {KEYS} from './lint_mascot_body.mjs';

export const FACE_NAMES=['hurt','sleepy','strain','smug','relief','yawn1','yawn2','yawn3','worry','ouch'];
const PAL='.'+Object.keys(MB).join(''),FILL='rpR';
const DIRS=[[0,0],[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];

/* every body the face must fit: {tag, look, raw(x,y) -> body char or '.', cx, cy} (placement as in compose) */
function bodies(){
  const out=[];
  for(const k of KEYS){const L=BODY[k];if(!L)continue;
    for(let bv=0;bv<3;bv++){const rows=L.v[bv%L.v.length],w=rows[0].length,h=rows.length,x0=16-w/2,y0=42-h;
      out.push({tag:`${k} bv${bv}`,look:{lv:k,bv},rows,x0,y0,cx:16,cy:L.cy})}}
  for(let ln=-3;ln<=3;ln++){if(!ln)continue;const LF=LEAN['l'+Math.abs(ln)];if(!LF)continue;const mir=ln<0;
    for(let bv=0;bv<3;bv++){const r0=LF.v[bv%LF.v.length],rows=mir?r0.map(r=>[...r].reverse().join('')):r0,w=rows[0].length;
      out.push({tag:`lean ${ln} bv${bv}`,look:{lean:ln,bv},rows,x0:mir?32-LF.x0-w:LF.x0,y0:LF.y0,cx:mir?33-LF.fcx:LF.fcx,cy:LF.cy})}}
  for(const b of out)b.raw=(x,y)=>{const r=b.rows[y-b.y0];return r&&x>=b.x0&&x<b.x0+r.length?r[x-b.x0]:'.'};
  return out;
}
const sil=g=>{const s=new Set();g.forEach((r,y)=>r.forEach((c,x)=>{if(c!=='.')s.add(y*64+x)}));return s};
function gridProblems(g){
  if(!Array.isArray(g)||g.length!==48||!g.every(r=>r.length===32))return ['grid is not 32x48'];
  for(const r of g)for(const c of r)if(!PAL.includes(c))return [`unknown palette char '${c}'`];
  return [];
}
/* the pixels a stamp draws: [x,y,char] for every non-'.' char */
const stampPx=(rows,ox,oy)=>{const p=[];rows.forEach((r,j)=>{for(let i=0;i<r.length;i++)if(r[i]!=='.')p.push([ox+i,oy+j,r[i]])});return p};

function checkPixels(E,b,g,px,what){
  const bad=[],edge=[],miss=[];
  for(const [x,y,c] of px){
    if(x<0||x>31||y<0||y>47){bad.push(`${x},${y} off canvas`);continue}
    if(!FILL.includes(b.raw(x,y)))bad.push(`${x},${y}`);
    else for(let a=-1;a<=1;a++)for(let d=-1;d<=1;d++)if(!FILL.includes(b.raw(x+a,y+d)))edge.push(`${x},${y}`);
    if(g[y][x]!==c)miss.push(`${x},${y}`);
  }
  if(bad.length)E(`${what} lands off the body colour at ${[...new Set(bad)].slice(0,4).join(' ')}`);
  else if(edge.length)E(`${what} has no 1 px body-colour margin to the outline at ${[...new Set(edge)].slice(0,4).join(' ')}`);
  if(miss.length)E(`${what} is not drawn (covered or clipped) at ${miss.slice(0,4).join(' ')}`);
}

export function lint(){
  const errors=[],base={dir:[0,0],stage:0,air:1};
  // shapes
  if(typeof FACES!=='object'||!FACES)return ['FACES must be an object'];
  for(const n of FACE_NAMES)if(!FACES[n])errors.push(`FACES.${n} is missing`);
  for(const [n,F] of Object.entries(FACES)){const E=m=>errors.push(`FACES.${n}: ${m}`);
    for(const key of ['eye','eyeR']){const e=F[key];if(e===undefined&&key==='eyeR')continue;
      if(!Array.isArray(e)||e.length!==7||!e.every(r=>typeof r==='string'&&r.length===6))E(`${key} must be 7 rows of 6 chars`);
      else{if(e.join('').split('').some(c=>!PAL.includes(c)))E(`${key} has an unknown palette char`);
        if(e.join('').split('').filter(c=>c==='k').length<3)E(`${key} has almost no ink`)}}
    const M=F.mouth;
    if(!M||!Array.isArray(M.rows)||!M.rows.length||!M.rows.every(r=>typeof r==='string'&&r.length===M.rows[0].length))E('mouth must be {rows,ox,oy} with equal-length rows');
    else{const w=M.rows[0].length,ox=M.ox|0,oy=M.oy|0;
      if(M.rows.join('').split('').some(c=>!PAL.includes(c)))E('mouth has an unknown palette char');
      if(ox<-3||ox+w-1>2)E(`mouth columns cx${ox}..cx+${ox+w-1} leave cx-3..cx+2`);
      if(oy<-1||oy+M.rows.length>3)E(`mouth rows cy+${3+oy}..cy+${2+oy+M.rows.length} leave cy+2..cy+5 (the mouth box every body and pose frame guarantees)`);}
  }
  if(errors.length)return errors;
  const eyeInk=e=>{const p=stampPx(e,0,0).filter(q=>q[2]==='k');return [p.reduce((s,q)=>s+q[0],0)/p.length,p.reduce((s,q)=>s+q[1],0)/p.length]};
  for(const [n,F] of Object.entries(FACES)){const [lx,ly]=eyeInk(F.eye),[rx,ry]=eyeInk(F.eyeR||F.eye);
    if(Math.abs(ly-ry)>2)errors.push(`FACES.${n}: the eyes are at different heights (ink centres ${ly.toFixed(1)} and ${ry.toFixed(1)} rows into the box)`);
    const mp=stampPx(F.mouth.rows,F.mouth.ox|0,0),mx=mp.reduce((s,q)=>s+q[0],0)/mp.length;   // relative to cx
    if(!(mx>-5-3+lx&&mx<4-3+rx))errors.push(`FACES.${n}: the mouth is not between the eyes`)}
  // lids
  if(!Array.isArray(LIDS)||LIDS.length!==4)errors.push('LIDS must hold 4 lids (look.lid 1..4)');
  else{let last=-1;LIDS.forEach((L,i)=>{const E=m=>errors.push(`LIDS[${i}] (lid ${i+1}): ${m}`);
    if(!Array.isArray(L)||L.length!==5||!L.every(r=>typeof r==='string'&&r.length===4)){E('must be 5 rows of 4 chars');return}
    if(L.join('').split('').some(c=>!PAL.includes(c))){E('unknown palette char');return}
    const line=L.indexOf('kkkk');   // the lid line: body colour above it, the eye (or a drawn pupil stub and white) below it
    if(line<0){E('needs a full ink lid line kkkk');return}
    if(L.slice(0,line).some(r=>![...r].every(c=>'rpR'.includes(c))))E('everything above the lid line must be body colour');
    if(line<=last)E('its lid line must sit lower than the lid before it');last=line})}
  if(errors.length)return errors;
  // fit on every body
  for(const b of bodies()){
    const E0=m=>errors.push(`${b.tag}: ${m}`);
    const g0=compose({...base,...b.look}),s0=sil(g0);
    const gp=gridProblems(g0);if(gp.length){gp.forEach(E0);continue}
    // placement cross-check: the raw body outline is where compose drew it
    let off=0;b.rows.forEach((r,j)=>{for(let i=0;i<r.length;i++)if(r[i]==='k'&&g0[b.y0+j][b.x0+i]!=='k')off++});
    if(off){E0(`raw body placement does not match compose (${off} outline px)`);continue}
    const ey=b.cy-3,my=b.cy+3,EX=[b.cx-5,b.cx+4];
    const cmp=(tag,g,px)=>{const E=m=>errors.push(`${b.tag} ${tag}: ${m}`);
      const p=gridProblems(g);if(p.length)return p.forEach(E);
      const s=sil(g),out=[...s].filter(k=>!s0.has(k)),gone=[...s0].filter(k=>!s.has(k));
      if(out.length||gone.length)E(`silhouette changes (${out.length} px added, ${gone.length} removed) e.g. ${[...out,...gone].slice(0,3).map(k=>(k%64)+','+(k>>6)).join(' ')}`);
      checkPixels(E,b,g,px,tag)};
    for(const [n,F] of Object.entries(FACES)){
      const g=compose({...base,...b.look,face:n});
      const px=[...stampPx(F.eye,EX[0]-3,ey-3),...stampPx(F.eyeR||F.eye,EX[1]-3,ey-3)];
      const mp=stampPx(F.mouth.rows,b.cx+(F.mouth.ox|0),my+(F.mouth.oy|0));
      cmp('face '+n,g,[...px,...mp]);
    }
    LIDS.forEach((L,i)=>{for(const dir of DIRS){const g=compose({...base,...b.look,dir,lid:i+1});
      cmp(`lid ${i+1} dir ${dir}`,g,[...stampPx(L,EX[0]-2,ey-2),...stampPx(L,EX[1]-2,ey-2)]);
      for(const ex of EX){const line=L.indexOf('kkkk');let n=0;   // whichever way he looks, some pupil shows under the lid
        for(let y=ey-2+line+1;y<=ey+2;y++)for(let x=ex-2;x<=ex+1;x++)if(g[y][x]==='k')n++;
        if(!n)errors.push(`${b.tag} lid ${i+1} dir ${dir}: no pupil shows under the lid (the eye reads as rolled back)`)}
    }});
  }
  return errors;
}

if(import.meta.url===`file://${process.argv[1]}`){
  const t=Date.now(),errors=lint();
  if(errors.length){console.log(errors.length+' problem'+(errors.length>1?'s':'')+':\n  '+errors.slice(0,60).join('\n  ')+(errors.length>60?'\n  ...':''));process.exit(1)}
  console.log(`faces lint green (${Object.keys(FACES).length} faces, ${LIDS.length} lids, ${Date.now()-t} ms)`);
}
