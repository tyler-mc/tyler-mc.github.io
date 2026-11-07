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
import {lintBody,lintFeet,lintLean} from './lint_mascot_body.mjs';
import {LEAN} from '../mascot/lean.js';
import {FEET} from '../mascot/feet.js';
import {BODY} from '../mascot/body.js';
import {ANIM_TRASH} from '../mascot/anim_trash.js';
import {ANIM_WALK} from '../mascot/anim_walk.js';
import {HANDS} from '../mascot/hands.js';
import {FACES,LIDS} from '../mascot/faces.js';
import {ANIM_FX} from '../mascot/anim_fx.js';

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
const SAME=i=>LOOKS[i].face!=='awe';   /* pens looks go through the legacy drawing here (look.old), so they stay in the check */
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

test('authored lean frames pass the lean lint (an empty placeholder table is allowed until they are drawn)',()=>{
  if(!Object.keys(LEAN).length)return;
  const e=lintLean(LEAN);assert.equal(e.length,0,e.slice(0,12).join('\n'));
});

test('on lean frames the open mouth and the hats stay on the body',()=>{
  for(const n of [1,2,3,-1,-2,-3]){
    const a=A.compose({lean:n,dir:[0,0],stage:0,air:1});
    for(const gp of [1,2,3,4,5,6]){const b=A.compose({lean:n,dir:[0,0],stage:0,air:1,gape:gp});
      for(let y=0;y<48;y++)for(let x=0;x<32;x++)if(a[y][x]==='.'&&b[y][x]!=='.')assert.fail(`gape ${gp} on lean ${n} draws outside the body at ${x},${y}`)}
    for(const hat of ['party','crown']){const h=A.compose({lean:n,dir:[0,0],stage:0,air:1,hat}),bare=a;
      /* every hat pixel's column must have body at or below the hat's lowest row in that column (nothing floats beside the head) */
      for(let x=0;x<32;x++){let low=-1;for(let y=0;y<48;y++)if(h[y][x]!=='.'&&bare[y][x]==='.')low=y;if(low<0)continue;
        let bodyBelow=false;for(let y=low+1;y<48&&y<=low+2;y++)if(bare[y][x]!=='.')bodyBelow=true;
        assert.ok(bodyBelow,`${hat} on lean ${n} floats at column ${x}`)}}
  }
});

/* the plumbing hooks the per-animation data files plug into, proven with throwaway data that is removed again afterwards */
test("compose hooks: pose frames (plain and baked, mirrored), hands, faces, lids, fx",()=>{
  const keep={frames:ANIM_TRASH.frames.slice(),hands:{...HANDS},faces:{...FACES},lids:LIDS.slice(),fx:{...ANIM_FX}};
  try{
    const blob=['..kkkk..','.krrrrk.','krrrrrrk','krrrrrrk','.krrrrk.','..kkkk..'];
    ANIM_TRASH.frames.length=0;   /* throwaway frames replace the real ones until the finally block puts them back */
    ANIM_TRASH.frames.push({x0:4,y0:10,v:[blob],fcx:8,cy:13,feet:[[5,16,['kkk']]]},{x0:6,y0:20,v:[blob],baked:true,feet:[[7,26,['kk']]],over:{x0:8,y0:22,rows:['wk','kw']}});
    const a=A.compose({pose:'trash:0',dir:[0,0],stage:0,air:1}),m=A.compose({pose:'trash:0',flip:1,dir:[0,0],stage:0,air:1});
    assert.equal(a[10][6],'k');assert.equal(a[16][5],'k','the frame feet are drawn');assert.equal(a[13-3].includes('w'),true,'a plain pose frame still gets the composed face');
    assert.equal(m[10][31-6],'k','flip mirrors the rows (x -> 31-x)');
    const b=A.compose({pose:'trash:1',face:'scared',hat:'crown',dir:[0,0],stage:3,air:1});
    assert.equal(b[20][8],'k');assert.equal(b[26][7],'k');assert.equal(b[22][8],'w','the overlay is drawn on top of a baked frame');assert.equal(b[22][9],'k');
    assert.equal(b.flat().filter(c=>c!=='.').length,blob.join('').replace(/\./g,'').length+2,'a baked frame adds nothing but its feet (the overlay sits on body pixels): no face, hat or sprout');
    const mb=A.compose({pose:'trash:1',flip:1,dir:[0,0],stage:0,air:1});assert.equal(mb[22][22],'k','the overlay flips with the frame (x0 32-8-2, rows reversed)');assert.equal(mb[22][23],'w');
    HANDS.test={dy:0,ox:0,rows:['kk','kr']};
    HANDS.tall={dy:-3,ay:3,ox:0,rows:['kk','kk','kk','kr']};
    const ha=A.compose({lv:'rest',hands:['tall',0],dir:[0,0],stage:0,air:1}),hb=A.compose({lv:'rest',hands:['test',0],dir:[0,0],stage:0,air:1});
    assert.ok(ha.flat().join('')!==hb.flat().join(''),'a hand with an attach row (ay) is placed by that row edge');
    const h=A.compose({lv:'rest',hands:['test',0],dir:[0,0],stage:0,air:1}),h0=A.compose({lv:'rest',dir:[0,0],stage:0,air:1});
    assert.ok(h.flat().join('')!==h0.flat().join(''),'a hand changes the sprite');
    FACES.test={eye:['.kkkk.','kwwwwk','kwkkwk','kwkkwk','kwwwwk','kwwwwk','.kkkk.'],mouth:{rows:['kkkk'],ox:-2,oy:0}};
    const f=A.compose({lv:'rest',face:'test',dir:[0,0],stage:0,air:1});assert.equal(f[27][10],'k','an authored eye box is drawn (pupil of the left eye)');assert.equal(f[27][9],'w');assert.equal(f[34][14],'k','an authored mouth is drawn');
    LIDS.push(['kkkk','kkkk','....','....','....']);
    const l=A.compose({lv:'rest',lid:1,dir:[0,0],stage:0,air:1});assert.ok(l.flat().join('')!==h0.flat().join(''),'an eyelid changes the eyes');
    ANIM_FX.dust=[['kk','kk']];const fx=A.compose({lv:'rest',fx:[['dust',0,1,1]],dir:[0,0],stage:0,air:1});assert.equal(fx[1][1],'k');assert.equal(fx[2][2],'k');
  }finally{
    ANIM_TRASH.frames.length=0;ANIM_TRASH.frames.push(...keep.frames);for(const k of Object.keys(HANDS))delete HANDS[k];Object.assign(HANDS,keep.hands);
    for(const k of Object.keys(FACES))delete FACES[k];Object.assign(FACES,keep.faces);LIDS.length=0;LIDS.push(...keep.lids);for(const k of Object.keys(ANIM_FX))delete ANIM_FX[k];Object.assign(ANIM_FX,keep.fx);
  }
});

/* every tools/lint_anim_<name>.mjs exports lint() -> list of problems for its own mascot/anim_<name>.js (or hands.js, faces.js): all of them run here */
for(const f of fs.readdirSync(path.join(ROOT,'tools')).filter(n=>/^lint_anim_.*\.mjs$/.test(n)).sort()){
  const M=await import(pathToFileURL(path.join(ROOT,'tools',f)).href);
  test(`${f}: the authored data passes its lint`,()=>{const e=M.lint();assert.equal(e.length,0,e.slice(0,12).join('\n')+(e.length>12?'\n... '+(e.length-12)+' more':''))});
}

test('the pensive look (look.pens) is the nervous worry face, never the old smirk',()=>{
  for(const k of Object.keys(BODY))for(let v=0;v<BODY[k].v.length;v++){
    const p=A.compose({lv:k,bv:v,pens:1,dir:[0,0],stage:0,air:1}),w=A.compose({lv:k,bv:v,face:'worry',dir:[0,0],stage:0,air:1});
    assert.deepEqual(p,w,`pens on ${k} v${v} is not the worry face`)}
  const legacy=A.compose({f:'idle',pens:1,old:1,dir:[0,0],stage:0,air:1}),worry=A.compose({f:'idle',face:'worry',old:1,dir:[0,0],stage:0,air:1});
  assert.notDeepEqual(legacy,worry,'the legacy path keeps its old pens drawing');
});

test('a pose frame with hideCheek draws one cheek pair only, and the flip hides the other side',()=>{
  const WK=ANIM_WALK.frames.findIndex(f=>f.hideCheek);if(WK<0)return;
  const f=ANIM_WALK.frames[WK],cheeks=(g,cy)=>g[cy+1].reduce((n,c)=>n+(c==='c'?1:0),0);
  const a=A.compose({pose:'walk:'+WK,dir:[0,0],stage:0,air:1}),m=A.compose({pose:'walk:'+WK,flip:1,dir:[0,0],stage:0,air:1}),n=A.compose({pose:'walk:0',dir:[0,0],stage:0,air:1});
  assert.equal(cheeks(a,f.cy),2,'one cheek pair on the hide-cheek frame');assert.equal(cheeks(m,f.cy),2,'one cheek pair when flipped');assert.equal(cheeks(n,ANIM_WALK.frames[0].cy),4,'both cheek pairs on a normal frame');
  const lx=g=>g[f.cy+1].findIndex(c=>c==='c'),mx=lx(m),ax=lx(a);assert.ok((ax<16)!==(mx<16),'the flip hides the opposite side');
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
