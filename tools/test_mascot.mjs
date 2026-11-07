#!/usr/bin/env node
/* Tests for mascot/atlas.js, the shared sprite. No browser. Run: node tools/test_mascot.mjs
   1. The OS sprite moved out of os.js with no pixel changed: 1500 looks, drawn through the legacy path (look.old=1, the computed ellipse body), hash to the digests
      recorded from the original os.js code (tools/mascot_golden.json). The OS now draws authored bodies by default, so this guards the legacy path only. The awe face
      was redrawn on purpose and is skipped. If the legacy path is deleted, retire this check and tools/mascot_golden.json with it.
   2. mascot/atlas.classic.js (what os.js really runs) is the same sprite as mascot/atlas.js and is up to date with it.
   3. Basic frame rules: 32x48, known palette chars only, no DOM, no Math.random.
   4. The authored bodies in mascot/body.js pass tools/lint_mascot_body.mjs (closed 1 px outline, no orphans, area within 6% of rest, feet, face fit, boil budget). */
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {looks,mockCtx} from './mascot_looks.mjs';
import {lintBody,lintFeet} from './lint_mascot_body.mjs';
import {FEET} from '../mascot/feet.js';
import {BODY} from '../mascot/body.js';

const ROOT=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const A=await import(pathToFileURL(path.join(ROOT,'mascot','atlas.js')).href);
const golden=JSON.parse(fs.readFileSync(path.join(ROOT,'tools','mascot_golden.json'),'utf8'));
let pass=0,fail=0;
function test(name,fn){try{fn();pass++;console.log('ok   '+name)}catch(e){fail++;console.log('FAIL '+name+'\n     '+(e&&e.message||e).split('\n').join('\n     '))}}
const dg=ctx=>crypto.createHash('sha256').update(ctx.px.map(c=>c||'.').join(',')).digest('hex').slice(0,10);
const LOOKS=looks(golden.n);

const classic=(()=>{
  const src=fs.readFileSync(path.join(ROOT,'mascot','atlas.classic.js'),'utf8'),win={};
  vm.runInNewContext(src,{window:win});return win.MASCOT;
})();

/* the awe face was redrawn on purpose (wide pupil in a white eye instead of a solid black eye), so its looks are no longer in the lossless check */
const SAME=i=>LOOKS[i].face!=='awe';
test('atlas.js draws every recorded look exactly as the original os.js did (except the redrawn awe face)',()=>{
  const bad=[];LOOKS.forEach((s,i)=>{if(!SAME(i))return;const c=mockCtx();A.drawBuddy(c,{...s,old:1});if(dg(c)!==golden.digests[i])bad.push(i)});
  assert.equal(bad.length,0,bad.length+' looks differ, first: '+JSON.stringify(LOOKS[bad[0]]));
});
test('atlas.classic.js draws the same pixels as atlas.js',()=>{
  const bad=[];LOOKS.forEach((s,i)=>{if(!SAME(i))return;const c=mockCtx();classic.drawBuddy(c,{...s,old:1});if(dg(c)!==golden.digests[i])bad.push(i)});
  assert.equal(bad.length,0,bad.length+' looks differ');
});
test('atlas.classic.js is current (run python3 tools/build_mascot.py)',()=>{
  const out=fs.readFileSync(path.join(ROOT,'mascot','atlas.classic.js'),'utf8');
  assert.equal(out,execFileSync('python3',[path.join(ROOT,'tools','build_mascot.py'),'--print'],{encoding:'utf8'}));
});
test('compose returns a 32x48 grid of known palette chars for every look',()=>{
  for(const s of LOOKS){const g=A.compose(s);assert.equal(g.length,48);
    for(const row of g){assert.equal(row.length,32);for(const c of row)assert.ok(c==='.'||A.MB[c],'unknown char '+c+' in '+JSON.stringify(s))}}
});
test('compose is deterministic',()=>{
  const r=Math.random;Math.random=()=>{throw new Error('atlas called Math.random')};
  try{for(const s of LOOKS.slice(0,200))assert.deepEqual(A.compose(s),A.compose(s))}finally{Math.random=r}
});

test('authored bodies pass the pixel-art lint (partial while the creature redraw is under review) (node tools/lint_mascot_body.mjs prints the table)',()=>{
  const {errors}=lintBody(BODY,{complete:false});assert.equal(errors.length,0,errors.slice(0,12).join('\n')+(errors.length>12?'\n... '+(errors.length-12)+' more':''));
});
test('every authored body composes with the default face and keeps the face off the outline',()=>{
  for(const k of Object.keys(BODY))for(let v=0;v<BODY[k].v.length;v++){const g=A.compose({lv:k,bv:v,dir:[0,0],stage:0}),cy=BODY[k].cy;
    assert.equal(g.length,48);assert.ok(g[41].some(c=>c==='k'),k+' has no ink on row 41');
    assert.ok(g[cy-3].includes('w'),k+' v'+v+' has no eye whites on row cy-3')}
});

test('an open mouth (gape 1..6) never draws outside an authored body',()=>{
  for(const k of Object.keys(BODY))for(let v=0;v<BODY[k].v.length;v++)for(let gp=1;gp<=6;gp++){
    const a=A.compose({lv:k,bv:v,dir:[0,0],stage:0}),b=A.compose({lv:k,bv:v,dir:[0,0],stage:0,gape:gp});
    for(let y=0;y<48;y++)for(let x=0;x<32;x++)if(a[y][x]==='.'&&b[y][x]!=='.')assert.fail(`gape ${gp} on ${k} v${v} draws outside the body at ${x},${y}`)}
});

test('awe pupils are enlarged (2x3) inside a white eye, never a black eye',()=>{
  const g=A.compose({face:'awe',dir:[0,0],stage:0,f:'idle'}),cy=31,ey=cy-3;
  for(const ex of [11,20]){let ink=0,white=0;for(let y=ey-2;y<=ey+2;y++)for(let x=ex-2;x<=ex+1;x++){if(g[y][x]==='k')ink++;if(g[y][x]==='w')white++}
    assert.equal(ink,6,'pupil is '+ink+' px at ex '+ex);assert.equal(white,14,'white round the pupil: '+white+' px at ex '+ex)}
});

test('the awe mouth never draws outside an authored body',()=>{
  for(const k of Object.keys(BODY))for(let v=0;v<BODY[k].v.length;v++){
    const a=A.compose({lv:k,bv:v,dir:[0,0],stage:0}),b=A.compose({lv:k,bv:v,dir:[0,0],stage:0,face:'awe'});
    for(let y=0;y<48;y++)for(let x=0;x<32;x++)if(a[y][x]==='.'&&b[y][x]!=='.')assert.fail(`awe on ${k} v${v} draws outside the body at ${x},${y}`);
    const cy=BODY[k].cy;for(let x=14;x<=17;x++)assert.notEqual(b[cy+3-1][x],'r','awe mouth missing on '+k)}
});

test('authored feet poses pass the feet lint (an empty placeholder table is allowed until they are drawn)',()=>{
  if(!Object.keys(FEET).length)return;
  const e=lintFeet(FEET);assert.equal(e.length,0,e.join('\n'));
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
