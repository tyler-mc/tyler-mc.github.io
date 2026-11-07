#!/usr/bin/env node
/* Tests for mascot/atlas.js, the shared sprite (the redesign: 40x64 cell, parts model). No browser. Run: node tools/test_mascot.mjs
   1. mascot/atlas.classic.js (what os.js really runs) is current and draws the same pixels as atlas.js.
   2. Frame rules: every look composes to a 40x64 grid of known palette chars, deterministic, no DOM, no Math.random, nothing off the cell.
   3. The authored bodies pass tools/lint_mascot_body.mjs; the compose hooks (pose frames, baked, over, cellH, hideCheek, faces, lids, fx, arms, hats, leaf) work.
   4. Every tools/lint_anim_<name>.mjs (one per authored data file) exports lint() and is run here. */
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {looks,mockCtx} from './mascot_looks.mjs';
import {lintBody} from './lint_mascot_body.mjs';
import {BODY} from '../mascot/body.js';
import {FEET} from '../mascot/feet.js';
import {ARMS} from '../mascot/arms.js';
import {LEAF} from '../mascot/leaf.js';
import {HATS,GEAR} from '../mascot/hats.js';
import {FACES,LIDS} from '../mascot/faces.js';
import {ANIM_TRASH} from '../mascot/anim_trash.js';
import {ANIM_FX} from '../mascot/anim_fx.js';

const ROOT=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const A=await import(pathToFileURL(path.join(ROOT,'mascot','atlas.js')).href);
let pass=0,fail=0;
function test(name,fn){try{fn();pass++;console.log('ok   '+name)}catch(e){fail++;console.log('FAIL '+name+'\n     '+(e&&e.message||e).split('\n').join('\n     '))}}
const LOOKS=looks(600);
const base={dir:[0,0],stage:0,air:1};
const px=g=>g.flat().filter(c=>c!=='.').length;
const classic=(()=>{const src=fs.readFileSync(path.join(ROOT,'mascot','atlas.classic.js'),'utf8'),win={};vm.runInNewContext(src,{window:win});return win.MASCOT})();

test('atlas.classic.js is current (run python3 tools/build_mascot.py)',()=>{
  const out=fs.readFileSync(path.join(ROOT,'mascot','atlas.classic.js'),'utf8');
  assert.equal(out,execFileSync('python3',[path.join(ROOT,'tools','build_mascot.py'),'--print'],{encoding:'utf8'}));
});
test('atlas.classic.js draws the same pixels as atlas.js',()=>{
  for(const s of LOOKS.slice(0,200)){const a=mockCtx(A.W,A.H),b=mockCtx(A.W,A.H);A.drawBuddy(a,s);classic.drawBuddy(b,s);assert.deepEqual(a.px,b.px,JSON.stringify(s))}
});
test('every look composes to a 40x64 grid of known palette chars',()=>{
  for(const s of LOOKS){const g=A.compose(s);assert.equal(g.length,A.H);
    for(const row of g){assert.equal(row.length,A.W);for(const c of row)assert.ok(c==='.'||A.MB[c],'unknown char '+c+' in '+JSON.stringify(s))}}
});
test('compose is deterministic and never calls Math.random',()=>{
  const r=Math.random;Math.random=()=>{throw new Error('atlas called Math.random')};
  try{for(const s of LOOKS.slice(0,200))assert.deepEqual(A.compose(s),A.compose(s))}finally{Math.random=r}
});
test('paint draws the whole grid (sized from the grid, not a constant)',()=>{
  const c=mockCtx(A.W,A.H),g=A.compose(base);A.paint(c,g);assert.equal(c.px.filter(Boolean).length,px(g));
  const tall=mockCtx(40,72);A.paint(tall,Array.from({length:72},(_,y)=>Array(40).fill(y===71?'k':'.')));assert.equal(tall.px.filter(Boolean).length,40);
});
test('the character always has arms, feet, a body and a leaf (even at sprout stage 0)',()=>{
  const g=A.compose(base),has=ch=>g.some(r=>r.includes(ch));
  assert.ok(has('r')&&has('k')&&has('U')&&has('T'),'rest needs red, ink, shoe brown and leaf teal');
  assert.ok(px(A.compose({...base,arms:[false,false]}))<px(g),'arms:[false,false] removes the arms');
});
test('the leaf grows with the sprout stage and mirrors with flip',()=>{
  const tx=g=>{let m=-1;g.forEach(r=>r.forEach((c,x)=>{if(c==='T')m=Math.max(m,x)}));return m};
  const a=A.compose(base),f=A.compose({...base,flip:1});
  assert.ok(tx(a)>A.CX,'the leaf sweeps to the right');assert.ok(tx(f)<A.CX+2,'flipped, the leaf sweeps to the left');
});
test('a flipped sprite is the mirror image of the body (the face is re-placed, not mirrored)',()=>{
  const a=A.compose({...base,face:'huh'}),f=A.compose({...base,face:'huh',flip:1});
  let diff=0;for(let y=0;y<A.H;y++)for(let x=0;x<A.W;x++)if((a[y][x]==='.')!==(f[y][A.W-1-x]==='.'))diff++;
  assert.equal(diff,0,'silhouettes mirror exactly');
});

test('authored bodies pass the pixel-art lint (tools/lint_mascot_body.mjs prints the table)',()=>{
  const {errors}=lintBody(BODY,{complete:false});assert.equal(errors.length,0,errors.slice(0,12).join('\n')+(errors.length>12?'\n... '+(errors.length-12)+' more':''));
});
test('every authored body composes with the default face and the eye whites show',()=>{
  for(const k of Object.keys(BODY))for(let v=0;v<BODY[k].v.length;v++){const g=A.compose({lv:k,bv:v,...base}),cy=BODY[k].cy;
    assert.ok(g[cy-3].includes('w'),k+' v'+v+' has no eye whites on row cy-3')}
});
test('the plain pupil is 2 wide by 3 tall inside a white eye; awe is 2x4 and stays inside the white',()=>{
  const g=A.compose(base),cy=BODY.rest.cy,ey=cy-3;
  for(const ex of [15,24]){let ink=0;for(let y=ey-2;y<=ey+2;y++)for(let x=ex-2;x<=ex+1;x++)if(g[y][x]==='k')ink++;assert.equal(ink,6,'plain pupil px at ex '+ex)}
  const a=A.compose({...base,face:'awe'});for(const ex of [15,24]){let ink=0;for(let y=ey-3;y<=ey+3;y++)for(let x=ex-3;x<=ex+2;x++){const edge=y===ey-3||y===ey+3||x===ex-3||x===ex+2;if(!edge&&a[y][x]==='k')ink++}assert.equal(ink,8,'awe pupil px at ex '+ex)}
});
test('the pensive look (look.pens) is the nervous worry face',()=>{
  assert.deepEqual(A.compose({...base,pens:1}),A.compose({...base,face:'worry'}));
});
test('open mouths (gape 1..6) and the awe mouth never draw outside the body',()=>{
  for(const k of Object.keys(BODY))for(const extra of [{face:'awe'},...[1,2,3,4,5,6].map(gape=>({gape}))]){
    const a=A.compose({lv:k,...base}),b=A.compose({lv:k,...base,...extra});
    for(let y=0;y<A.H;y++)for(let x=0;x<A.W;x++)if(a[y][x]==='.'&&b[y][x]!=='.')assert.fail(JSON.stringify(extra)+' on '+k+' draws outside the body at '+x+','+y)}
});
test('authored arms attach to the body (touch it, stay inside the cell) for every authored bucket, both sides',()=>{
  for(const a of Object.keys(ARMS).map(Number))for(const fl of [0,1]){
    const none=A.compose({...base,flip:fl,arms:[false,false]}),one=A.compose({...base,flip:fl,arms:[a,false]}),diff=[];
    for(let y=0;y<A.H;y++)for(let x=0;x<A.W;x++)if(one[y][x]!==none[y][x])diff.push([x,y]);
    assert.ok(diff.length>=4,`arm ${a} flip ${fl} draws ${diff.length} px`);
    assert.ok(diff.some(([x,y])=>[[1,0],[-1,0],[0,1],[0,-1]].some(([i,j])=>{const c=none[y+j]&&none[y+j][x+i];return c&&'krpR'.includes(c)})),`arm ${a} flip ${fl} does not touch the body`)}
});

test('compose hooks: pose frames (plain and baked, mirrored), over, cellH, hideCheek, faces, lids, fx, arms, hats',()=>{
  const keep={frames:ANIM_TRASH.frames.slice(),faces:{...FACES},lids:LIDS.slice(),fx:{...ANIM_FX},hats:{...HATS},gear:{...GEAR},arms:{...ARMS}};
  try{
    const blob=['..kkkk..','.krrrrk.','krrrrrrk','krrrrrrk','.krrrrk.','..kkkk..'];
    ANIM_TRASH.frames.length=0;
    ANIM_TRASH.frames.push({x0:6,y0:20,v:[blob],fcx:10,cy:23,tip:[8,14],ctr:[10,23]},{x0:8,y0:30,v:[blob],baked:true,over:{x0:10,y0:32,rows:['wk','kw']},feet:[[9,36,['UU']]]},{x0:8,y0:60,v:[blob],cellH:80,fcx:12,cy:63,hideCheek:-1});
    const a=A.compose({pose:'trash:0',...base}),m=A.compose({pose:'trash:0',flip:1,...base});
    assert.equal(a[20][8],'k');assert.equal(m[20][A.W-1-8],'k','flip mirrors the rows (x -> W-1-x)');assert.ok(a[23-3].includes('w'),'a plain pose frame still gets the composed face');
    assert.ok(a.some(r=>r.includes('T')),'a pose frame with a tip gets the leaf');
    const b=A.compose({pose:'trash:1',face:'scared',hat:'crown',stage:3,air:1});
    assert.equal(b[30][10],'k');assert.equal(b[32][10],'w','the overlay is drawn on top of a baked frame');assert.equal(b[36][9],'U','baked feet are drawn');assert.ok(!b.some(r=>r.includes('T')),'a baked frame adds nothing: no leaf, face or hat');
    const mb=A.compose({pose:'trash:1',flip:1,air:1});assert.equal(mb[32][A.W-1-10],'w','the overlay flips with the frame');assert.equal(mb[32][A.W-1-11],'k');
    const tall=A.compose({pose:'trash:2',air:1});assert.equal(tall.length,80,'cellH makes a taller grid');
    assert.equal(tall[64][3],'.','hideCheek:-1 hides the authored-left cheek pair');assert.equal(tall[64][19],'c','the other cheek pair stays');
    FACES.test={eye:['.kkkk.','kwwwwk','kwkkwk','kwkkwk','kwwwwk','kwwwwk','.kkkk.'],mouth:{rows:['kkkk'],ox:-2,oy:0}};
    const f=A.compose({lv:'rest',face:'test',...base}),cy=BODY.rest.cy;assert.equal(f[cy-3-3+2][15-3+2],'k','an authored eye box is drawn');assert.equal(f[cy+3][18],'k','an authored mouth is drawn');
    const h0=A.compose({lv:'rest',...base});LIDS.push(['kkkk','kkkk','....','....','....']);assert.notDeepEqual(A.compose({lv:'rest',lid:1,...base}),h0,'an eyelid changes the eyes');
    ANIM_FX.dust=[['kk','kk']];const fx=A.compose({lv:'rest',fx:[['dust',0,1,1]],...base});assert.equal(fx[1][1],'k');assert.equal(fx[2][2],'k');
    HATS.test={ax:2,ay:3,lift:2,rows:['..kk..','.kYYk.','kYYYYk','kkkkkk']};const hp=A.compose({lv:'rest',hat:'test',...base}),tp=BODY.rest.tip;
    assert.equal(hp[tp[1]][tp[0]-2],'k','the hat sits over the head tip');assert.equal(hp[tp[1]-3-2][tp[0]+LEAF.stem[0][0]],'n','the stem is extended above the hat by its lift');
    ARMS[0]={ax:0,ay:1,rows:['kk','kr','kk']};assert.notDeepEqual(A.compose({lv:'rest',arms:[0,false],...base}),A.compose({lv:'rest',arms:[false,false],...base}),'a new arm bucket is used');
  }finally{
    ANIM_TRASH.frames.length=0;ANIM_TRASH.frames.push(...keep.frames);for(const [o,k] of [[FACES,'faces'],[ANIM_FX,'fx'],[HATS,'hats'],[GEAR,'gear'],[ARMS,'arms']]){for(const x of Object.keys(o))delete o[x];Object.assign(o,keep[k])}
    LIDS.length=0;LIDS.push(...keep.lids);
  }
});

/* every tools/lint_anim_<name>.mjs exports lint() -> list of problems for its own mascot/<file>.js: all of them run here */
for(const f of fs.readdirSync(path.join(ROOT,'tools')).filter(n=>/^lint_anim_.*\.mjs$/.test(n)).sort()){
  const M=await import(pathToFileURL(path.join(ROOT,'tools',f)).href);
  test(`${f}: the authored data passes its lint`,()=>{const e=M.lint();assert.equal(e.length,0,e.slice(0,12).join('\n')+(e.length>12?'\n... '+(e.length-12)+' more':''))});
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
