#!/usr/bin/env node
/* Tests for game/fx.js, the renderer-side body pulse and dust (character-feel-plan.md Stage 2).
   Pure module, no browser. Run: node tools/test_fx.mjs */
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';

const ROOT=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FX=await import(pathToFileURL(path.join(ROOT,'game','fx.js')).href);
const {FR}=await import(pathToFileURL(path.join(ROOT,'game','mascot.js')).href);
const {createFx,stepFx,clearFx,radii,REC}=FX;
const MAXF=4.6,IDLE=[11,11,0];
const O=(o={})=>Object.freeze({hit:false,reduce:false,lv:MAXF,MAXF,feetX:100,feetY:200,...o});

let pass=0,fail=0;
function test(name,fn){try{fn();pass++;console.log('ok   '+name)}catch(e){fail++;console.log('FAIL '+name+'\n     '+(e&&e.message||e).split('\n').join('\n     '))}}

const rand=Math.random;Math.random=()=>{throw new Error('fx.js called Math.random')};

/* a fixed script: jumps, landings of several speeds, a hit-stop and idle frames */
const SCRIPT=[[['jump']],[[]],[[]],[['land'],{lv:4.6}],[[]],[['jump']],[[],{hit:true}],[[],{hit:true}],[[]],[['land'],{lv:1.5}],
  [['root']],[[]],[['land'],{lv:2.3}],...Array(25).fill([[]]),[['jump']],[[]],[['rez']],[['land'],{lv:3}]];
const run=(fx=createFx(),script=SCRIPT)=>{const out=[];for(const [ev,o] of script){stepFx(fx,ev,O(o));out.push(JSON.stringify(fx))}return out};

test('createFx is plain rest state',()=>{
  const fx=createFx();
  assert.equal(fx.sx,1);assert.equal(fx.sy,1);assert.deepEqual(fx.puffs,[]);
  assert.deepEqual(radii(fx,IDLE),{rx:11,ry:11,oy:0});
});

test('jump: stretch on the jump frame, exactly 1 after 12 more steps',()=>{
  const fx=createFx();stepFx(fx,['jump'],O());
  assert.equal(fx.sx,0.91);assert.equal(fx.sy,1.18);
  assert.deepEqual(radii(fx,IDLE),{rx:10,ry:13,oy:-2});
  for(let i=1;i<=REC;i++){stepFx(fx,[],O());if(i<REC)assert.ok(fx.sx<1&&fx.sy>1,'still pulsing at step '+i)}
  assert.equal(fx.sx,1);assert.equal(fx.sy,1);assert.equal(fx.k,0);
  assert.deepEqual(radii(fx,IDLE),{rx:11,ry:11,oy:0});
});

test('root jump: stretch, no dust',()=>{
  const fx=createFx();stepFx(fx,['root'],O());
  assert.equal(fx.sx,0.91);assert.equal(fx.sy,1.18);assert.equal(fx.puffs.length,0);
});

test('land at MAXF: full squash (1.27, 0.73), radii 14x8, recovers in 12',()=>{
  const fx=createFx();stepFx(fx,['land'],O({lv:MAXF}));
  assert.ok(Math.abs(fx.sx-1.27)<1e-12&&Math.abs(fx.sy-0.73)<1e-12,`got ${fx.sx},${fx.sy}`);
  assert.deepEqual(radii(fx,IDLE),{rx:14,ry:8,oy:3});
  for(let i=0;i<REC;i++)stepFx(fx,[],O());
  assert.equal(fx.sx,1);assert.equal(fx.sy,1);
});

test('land squash scales with lv: vy 1.0 is none, higher is deeper, missing lv is full',()=>{
  const sq=lv=>{const fx=createFx();stepFx(fx,['land'],O({lv}));return fx.sy};
  assert.equal(sq(1),1);
  assert.ok(sq(1.5)>sq(2.3)&&sq(2.3)>sq(3.5)&&sq(3.5)>sq(MAXF),'squash grows with speed');
  assert.ok(Math.abs(sq(9)-0.73)<1e-12,'clamped above MAXF');
  const fx=createFx();stepFx(fx,['land'],Object.freeze({MAXF}));assert.ok(Math.abs(fx.sy-0.73)<1e-12);
  const g=createFx();stepFx(g,['land'],O({lv:NaN}));assert.ok(Math.abs(g.sy-0.73)<1e-12,'NaN lv counts as MAXF');
});

test('hit-stop freezes the pulse and the puffs',()=>{
  const fx=createFx();stepFx(fx,['jump'],O());stepFx(fx,[],O());
  const snap=JSON.stringify(fx);
  for(let i=0;i<5;i++)stepFx(fx,[],O({hit:true}));
  assert.equal(JSON.stringify(fx),snap);
  for(let i=0;i<REC-1;i++)stepFx(fx,[],O());
  assert.equal(fx.sx,1);assert.equal(fx.sy,1);
});

test('reduce: pulse stays 1 and no puffs spawn, also mid-pulse',()=>{
  const fx=createFx();
  for(const ev of [['jump'],['land'],['root'],[]]){stepFx(fx,ev,O({reduce:true}));assert.equal(fx.sx,1);assert.equal(fx.sy,1);assert.equal(fx.puffs.length,0)}
  stepFx(fx,['land'],O());assert.ok(fx.puffs.length&&fx.sx>1);
  stepFx(fx,[],O({reduce:true}));assert.equal(fx.sx,1);assert.equal(fx.sy,1);assert.equal(fx.puffs.length,0);
});

test('puff counts: jump 4, hard land 8, soft land 3, gate at MAXF*0.5',()=>{
  const n=(ev,lv)=>{const fx=createFx();stepFx(fx,ev,O({lv}));return fx.puffs.length};
  assert.equal(n(['jump']),4);
  assert.equal(n(['land'],MAXF),8);
  assert.equal(n(['land'],MAXF*0.5),8);
  assert.equal(n(['land'],MAXF*0.5-0.01),3);
  assert.equal(n(['land'],1.2),3);
  assert.equal(n(['stun','die','swim','thud']),0);
});

test('puffs: 2-3 px, life 12-20, spawn at the feet, rise and slow',()=>{
  const fx=createFx();
  for(let i=0;i<40;i++)stepFx(fx,['jump','land'],O({feetX:100+i,feetY:200}));
  for(const p of fx.puffs){
    assert.ok(p.w===2||p.w===3,'width '+p.w);
    assert.ok(Number.isInteger(p.life)&&p.life>=12&&p.life<=20,'life '+p.life);
    assert.ok(p.vy<0,'rises');
  }
  const lives=new Set(fx.puffs.map(p=>p.life));assert.ok(lives.size>=5,'life varies: '+[...lives]);
  const g=createFx();stepFx(g,['jump'],O());
  for(const p of g.puffs)assert.ok(Math.abs(p.x-100)<=10&&Math.abs(p.y-200)<=1,'near the feet');
  const p0=g.puffs[0],y0=p0.y,vy0=p0.vy;stepFx(g,[],O());
  assert.ok(p0.y<y0&&Math.abs(p0.vy)<Math.abs(vy0),'moves up and slows');
});

test('puff removal: each puff lives exactly its life, all gone after 20 steps',()=>{
  const fx=createFx();stepFx(fx,['land'],O());
  const lives=fx.puffs.map(p=>p.life);
  for(let s=1;s<=20;s++){
    stepFx(fx,[],O());
    assert.equal(fx.puffs.length,lives.filter(l=>l>s).length,'alive at step '+s);
  }
  assert.equal(fx.puffs.length,0);
});

test('radii: integers inside the face limits for every FR base and pulse state',()=>{
  const bases=[...Object.values(FR),{rx:11,ry:11},[16,16,0],[6,6,0]];
  const fx=createFx();let checked=0;
  const scales=[];for(let i=0;i<=40;i++)for(let j=0;j<=40;j++)scales.push([0.7+i*0.0175,0.7+j*0.0175]);
  for(const [sx,sy] of scales)for(const b of bases){
    fx.sx=sx;fx.sy=sy;const r=radii(fx,b);checked++;
    assert.ok(Number.isInteger(r.rx)&&Number.isInteger(r.ry)&&Number.isInteger(r.oy),JSON.stringify(r));
    assert.ok(r.rx>=10&&r.rx<=14&&r.ry>=8&&r.ry<=13,JSON.stringify(r));
    assert.equal(r.oy,11-r.ry);
  }
  /* and along real scripted runs */
  const g=createFx();for(const [ev,o] of SCRIPT){stepFx(g,ev,O(o));for(const b of Object.values(FR)){const r=radii(g,b);assert.ok(r.rx>=10&&r.rx<=14&&r.ry>=8&&r.ry<=13&&r.oy===11-r.ry)}}
  assert.ok(checked>1000);
});

test('clearFx and the rez event reset pulse and puffs',()=>{
  const fx=createFx();stepFx(fx,['land'],O());
  clearFx(fx);
  assert.equal(fx.sx,1);assert.equal(fx.sy,1);assert.equal(fx.k,0);assert.equal(fx.puffs.length,0);
  assert.deepEqual(radii(fx,IDLE),{rx:11,ry:11,oy:0});
  stepFx(fx,['jump'],O());stepFx(fx,['rez'],O());
  assert.equal(fx.sx,1);assert.equal(fx.sy,1);assert.equal(fx.puffs.length,0);
  stepFx(fx,['rez','jump'],O());assert.equal(fx.sx,0.91,'events after rez in the same step still apply');
});

test('JSON round-trip: a parsed copy steps identically',()=>{
  const a=createFx();run(a,SCRIPT.slice(0,6));
  const b=JSON.parse(JSON.stringify(a));
  assert.deepEqual(b,a);
  assert.deepEqual(run(b),run(a));
});

test('determinism: two runs give identical state, opts are not mutated',()=>{
  const o=O({lv:3});stepFx(createFx(),['land'],o);   /* frozen opts would throw in strict mode on write */
  assert.deepEqual(run(),run());
});

/* Stage 4: the skid hold and its puffs (A7), the sprout lag (A11) */
test('skid: holds at least SKID_MIN frames, a puff every 2, ends with the slide or off the ground',()=>{
  const fx=createFx(),o=o2=>O({ground:true,vx:1,...o2});
  stepFx(fx,['skid'],o({skid:true}));assert.equal(fx.sk,1);assert.equal(fx.puffs.length,1);assert.ok(fx.puffs[0].vx>0,'kicked the way he slides');
  for(let i=2;i<=FX.SKID_MIN;i++){stepFx(fx,[],o({skid:false}));assert.equal(fx.sk,i,'held at '+i)}
  assert.equal(fx.puffs.length,2,'puffs on skid frames 1 and 3');
  stepFx(fx,[],o({skid:false}));assert.equal(fx.sk,0,'ends once the slide is over');
  const g=createFx();stepFx(g,['skid'],o({skid:true}));for(let i=0;i<10;i++)stepFx(g,[],o({skid:true}));assert.equal(g.sk,11);
  stepFx(g,[],o({skid:true,ground:false}));assert.equal(g.sk,0,'a jump ends it');
  const h=createFx();stepFx(h,['skid'],o({skid:true}));for(let i=0;i<99;i++)stepFx(h,[],o({skid:true}));assert.equal(h.sk,0,'capped at SKID_MAX');
});

test('sprout lag: whole px in -2..2, trails vx, springs back, frozen by hit-stop, off with reduce and clearFx',()=>{
  const fx=createFx(),seen=new Set();
  for(let i=0;i<40;i++){stepFx(fx,[],O({vx:1.6}));seen.add(FX.sprout(fx))}
  assert.equal(FX.sprout(fx),-2);
  const snap=JSON.stringify(fx);for(let i=0;i<5;i++)stepFx(fx,[],O({vx:0,hit:true}));assert.equal(JSON.stringify(fx),snap);
  for(let i=0;i<60;i++){stepFx(fx,[],O({vx:0}));seen.add(FX.sprout(fx))}
  assert.equal(FX.sprout(fx),0);assert.equal(fx.so,0);assert.ok(seen.has(1),'overshoots past 0');
  for(const v of seen)assert.ok(Number.isInteger(v)&&v>=-2&&v<=2,'px '+v);
  for(let i=0;i<9;i++)stepFx(fx,[],O({vx:-9}));assert.equal(FX.sprout(fx),2,'clamped');
  clearFx(fx);assert.equal(FX.sprout(fx),0);
  stepFx(fx,[],O({vx:1.6}));stepFx(fx,['skid'],O({vx:1.6,reduce:true,ground:true,skid:true}));assert.equal(fx.so,0);assert.equal(fx.sk,0);
});

Math.random=rand;
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
