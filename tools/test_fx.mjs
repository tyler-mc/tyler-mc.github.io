#!/usr/bin/env node
/* Tests for game/fx.js, the renderer-side body pulse and dust (character-feel-plan.md Stage 2), and for engine.js
   fxLevels, the OS's fourth-wall levels sent through mount's onFx (os.js draws them).
   No browser. Run: node tools/test_fx.mjs */
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';

const ROOT=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FX=await import(pathToFileURL(path.join(ROOT,'game','fx.js')).href);
const FR={idle:[11,11,0],breath:[11,10,1],squash:[13,8,3],stretch:[10,12,-2],land:[12,10,1],cling:[9,12,-1]};   /* fx.js radii bases: the pulse maths is unchanged; the atlas picks a body level from sy (game/mascot.js levelOf) */
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

/* ---- the OS's fourth-wall levels (engine.js fxLevels, sent through mount's onFx): which keys each biome sends, and when ---- */
console.log('\nOS effects (engine.js fxLevels)');
const G=pathToFileURL(path.join(ROOT,'game')+'/').href;
const E=await import(G+'engine.js'),{newState,T}=await import(G+'state.js'),{ROOMS,parse}=await import(G+'rooms/index.js');
const CH=await import(G+'chases.js'),{PW,PH}=await import(G+'player.js');
const I=(o={})=>({l:0,r:0,u:0,d:0,j:0,jp:0,b:0,bp:0,drag:null,any:0,...o});
const play=(room,x,y,items={})=>{const S=newState();Object.assign(S,{lit:1,litT:60,match:1,mode:'play'});Object.assign(S.items,items);E.enterRoom(S,room,{x,y});return S};
const FLOODK=['wet','slosh','flood'],MOLTK=['heat','shimmer','glow'];
/* fxLevels may not read the clock either (Math.random is stubbed above) */
const lv=S=>{const dn=Date.now,pn=performance.now;Date.now=performance.now=()=>{throw new Error('fxLevels read the clock')};try{return E.fxLevels(S)}finally{Date.now=dn;performance.now=pn}};
/* a test pool: floor at row 12, deep water x 6..34 rows 12..15 */
const pg=['#'.repeat(46),...Array(11).fill('#'+'.'.repeat(44)+'#'),...Array(4).fill('######'+'~'.repeat(29)+'###########'),'#'.repeat(46),'#'.repeat(46)];
ROOMS.fxpool=parse({id:'fxpool',name:'Fx pool',biome:'flood',at:[5000,5000],grid:pg,ents:[]});

test('fxLevels: biome is the first key, and hub and Roots send no Flood or Molten keys',()=>{
  for(const id of ['hub','r1']){const S=play(id,...(id==='hub'?[200,100]:[40,100]));const L=lv(S);
    assert.equal(Object.keys(L)[0],'biome');assert.equal(L.biome,ROOMS[id].biome);
    for(const k of [...FLOODK,...MOLTK])assert.ok(!(k in L),`${id} sends no ${k}`)}
  assert.ok('moss' in lv(play('r1',40,100)),'Roots still sends moss');
});
test('fxLevels Flood: wet from the first room, slosh 0 on dry ground, flood 0 with no chase',()=>{
  const S=play('fxpool',2*T,12*T-PH);E.step(S,I(),[]);const L=lv(S);
  assert.deepEqual([L.wet,L.slosh,L.flood],[1,0,0]);for(const k of MOLTK)assert.ok(!(k in L),'no '+k);
  const B=play('b1',40,40);assert.equal(lv(B).wet,1,'b1 (Tideshore) is wet');
});
test('fxLevels Flood: slosh 1 while he is in the water (wading at the line or deep under it) and while he surfs',()=>{
  const S=play('fxpool',20*T,12*T-PH+8);for(let i=0;i<4;i++)E.step(S,I(),[]);assert.equal(lv(S).slosh,1,'wading at the line');
  const D=play('fxpool',20*T,14*T);for(let i=0;i<2;i++)E.step(D,I(),[]);assert.equal(lv(D).slosh,1,'deep under the surface');
  const W=play('fxpool',2*T,12*T-PH);E.step(W,I(),[]);assert.equal(lv(W).slosh,0);W.p.surf=1;assert.equal(lv(W).slosh,1,'surfing');
  const out=play('fxpool',20*T,12*T-PH+8);E.step(out,I(),[]);out.p.x=2*T;out.p.y=12*T-PH;E.step(out,I(),[]);assert.equal(lv(out).slosh,0,'out of the water again');
});
test('fxLevels Flood: the tide level grows in quarters during the eel chase, the tide sloshes him, 0 outside it',()=>{
  const B=ROOMS.b10,t=B.torches[B.torches.length-1],S=newState();Object.assign(S,{lit:1,litT:60,match:1,mode:'play'});Object.assign(S.items,{root:1,board:1});
  S.pieces[1]=1;S.chase={id:'flood',on:1,x:0,t:0,w:0};S.cp={room:'b10',tx:t.tx,ty:t.ty};E.enterRoom(S,'b10',E.spot(S,B,t.tx,t.ty));CH.resetChase(S);
  /* he stands by his torch (invulnerable) while the tide comes up over him */
  let prev=0,sl=0;for(let i=0;i<1500;i++){S.p.inv=1e9;E.step(S,I(),[]);if(!S.chase)break;const L=lv(S),v=L.flood;
    assert.ok(v>=prev&&v<=1&&v*4===Math.round(v*4),'a growing quarter: '+v);prev=v;sl=Math.max(sl,L.slosh)}
  assert.ok(prev>=.5,'the tide came on ('+prev+')');assert.equal(sl,1,'standing in the tide sloshes');
  S.chase=null;assert.equal(lv(S).flood,0);
});
test('fxLevels Molten: heat 1 from the first room, shimmer 0 outside the chase, glow 1 only while a vent erupts',()=>{
  const S=play('m1',40,40);const L=lv(S);
  assert.deepEqual([L.heat,L.shimmer,L.glow],[1,0,0]);for(const k of FLOODK)assert.ok(!(k in L),'no '+k);
  const v=S.ens.find(e=>e.k==='vent');assert.ok(v,'m1 has a vent');const st=v.st;
  v.st=2;assert.equal(lv(S).glow,1);v.st=st===2?0:st;assert.equal(lv(S).glow,0);
});
/* Crystals: a synthetic room (no crystals_k* rooms are needed) and a synthetic sweep, so these hold whatever the real tower is */
const CRYK=['crystal','erase'],{CHASES}=await import(G+'rooms/index.js');
ROOMS.fxcry=parse({id:'fxcry',name:'Fx crystal',biome:'crystals',at:[6000,6000],grid:['#'.repeat(30),...Array(10).fill('#'+'.'.repeat(28)+'#'),'#'.repeat(30)],ents:[]});
CHASES.fxsweep={kind:'sweep',from:6000*T,end:6000*T+800,beat:60,rate:2,gap:150};
const q4=v=>Math.round(v*4)/4;
test('fxLevels: hub, Roots, Flood and Molten send no crystal or erase',()=>{
  for(const [id,x,y] of [['hub',200,100],['r1',40,100],['b1',40,40],['m1',40,40]]){const L=lv(play(id,x,y));for(const k of CRYK)assert.ok(!(k in L),`${id} sends no ${k}`)}
});
test('fxLevels Crystals: crystal 1 in every Crystals room, erase 0 with no chase, no Flood or Molten keys',()=>{
  const S=play('fxcry',2*T,10*T-PH);E.step(S,I(),[]);const L=lv(S);
  assert.equal(L.biome,'crystals');assert.equal(L.crystal,1);assert.equal(L.erase,0);
  for(const k of [...FLOODK,...MOLTK])assert.ok(!(k in L),'no '+k);
});
test('fxLevels Crystals: erase is the sweep\'s progress in quarters, growing with the front, 0 once it is over or for another kind',()=>{
  const S=play('fxcry',2*T,10*T-PH),C=CHASES.fxsweep;CH.startChase(S,'fxsweep',[]);
  assert.equal(S.chase.id,'fxsweep');let prev=0,seen=new Set();
  for(let k=0;k<=20;k++){S.chase.y=C.from+(C.end-C.from)*k/20;S.chase.t=1;const L=lv(S),p=CH.progress(S);
    assert.ok(Number.isFinite(L.erase)&&L.erase*4===Math.round(L.erase*4),'a quarter: '+L.erase);
    assert.equal(L.erase,q4(p),'erase follows progress');assert.ok(L.erase>=prev,'never shrinks as the front comes down');prev=L.erase;seen.add(L.erase)}
  assert.deepEqual([...seen].sort(),[0,.25,.5,.75,1],'every quarter shows on the way down');
  S.chase.y=C.from+(C.end-C.from)*.6;assert.equal(lv(S).erase,.5);
  S.chase.on=0;assert.equal(lv(S).erase,0,'outrun: 0 (the icons come back)');
  S.chase=null;assert.equal(lv(S).erase,0,'no chase: 0');
  S.chase={id:'roots',on:1,x:0,t:0,w:0};assert.equal(lv(S).erase,0,'a thorn chase in Crystals does not erase');
  S.chase={id:'fxsweep',on:1,y:NaN,t:0,w:0,x:0};assert.equal(lv(S).erase,0,'a front with no y yet: 0, never NaN');
});
test('fxLevels: rewind only once he owns Undo (in every biome), 1 while it runs back, else 0',()=>{
  for(const [id,x,y] of [['fxcry',2*T,10*T-PH],['hub',200,100],['r1',40,100]]){
    assert.ok(!('rewind' in lv(play(id,x,y))),id+': no rewind without Undo');
    const S=play(id,x,y,{undo:1});E.step(S,I(),[]);assert.equal(lv(S).rewind,0,id+': 0 when not held');
    S.undo.on=1;assert.equal(lv(S).rewind,1,id+': 1 while rewinding');S.undo.on=0;assert.equal(lv(S).rewind,0)}
});
test('fxLevels Crystals teardown: leaving for the hub drops crystal and erase (the host clears them on the new biome)',()=>{
  const S=play('fxcry',2*T,10*T-PH,{undo:1});CH.startChase(S,'fxsweep',[]);S.chase.y=CHASES.fxsweep.from+400;const A=lv(S);
  assert.equal(A.crystal,1);assert.ok(A.erase>0);
  E.enterRoom(S,'hub',{x:200,y:100});S.chase=null;const B=lv(S);
  assert.equal(B.biome,'hub');for(const k of CRYK)assert.ok(!(k in B),'hub sends no '+k);assert.equal(B.rewind,0,'rewind still sent, at 0');
});
test('fxLevels Roots: thorns 0 outside the thorn chase, 0.25 at its start, growing in quarters to 1; never in other biomes or other chases',()=>{
  const S=play('r1',40,100);assert.equal(lv(S).thorns,0,'no chase: 0');
  const C=CHASES.roots,a=C.from*T;S.chase={id:'roots',on:1,x:a,t:-C.beat,w:0};
  assert.equal(lv(S).thorns,.25,'the start of the chase already shows');
  let prev=0;for(let k=0;k<=20;k++){S.chase.x=a+(CH.endX?CH.endX(C)-a:12000)*k/20;const v=lv(S).thorns;
    assert.ok(v>=prev&&v<=1&&v*4===Math.round(v*4),'a growing quarter: '+v);prev=v}
  S.chase.on=0;assert.equal(lv(S).thorns,0,'outrun: 0');
  S.chase={id:'flood',on:1,x:0,t:0,w:0};assert.equal(lv(S).thorns,0,'the eel chase does not grow thorns');
  for(const [id,x,y] of [['hub',200,100],['b1',40,40],['m1',40,40]]){const H=play(id,x,y);H.chase={id:'roots',on:1,x:a,t:0,w:0};assert.ok(!('thorns' in lv(H)),id+' sends no thorns')}
});
test('fxLevels: scorch once Molten is finished (fragment in hand with its chase over, or placed), in every biome, never before',()=>{
  const mk=2,rooms=[['hub',200,100],['r1',40,100],['b1',40,40],['m1',40,40],['fxcry',2*T,10*T-PH]];
  for(const [id,x,y] of rooms)assert.ok(!('scorch' in lv(play(id,x,y))),id+': no scorch yet');
  for(const [id,x,y] of rooms){const S=play(id,x,y);S.pieces[mk]=1;CH.startChase(S,'molten',[]);
    assert.equal(S.chase.on,1,'the real geyser chase is on');assert.ok(!('scorch' in lv(S)),id+': not while the Molten chase runs');
    S.cp={room:'m1',tx:2,ty:2};CH.resetChase(S);assert.equal(S.chase.on,1,'a death does not end the chase');assert.ok(!('scorch' in lv(S)),id+': nor after a death mid-chase');
    S.chase.on=0;assert.equal(lv(S).scorch,1,id+': scorched once the chase is done (outrun)');
    S.chase=null;assert.equal(lv(S).scorch,1,id+': and after the thorns have withered');
    const P=play(id,x,y);P.placed[mk]=1;assert.equal(lv(P).scorch,1,id+': placed counts too');
    const O=play(id,x,y);O.pieces[0]=1;O.pieces[1]=1;assert.ok(!('scorch' in lv(O)),id+': other fragments do not scorch')}
});
test('os.js has an effect for every key fxLevels sends (osFx.set drops unknown names silently)',()=>{
  const src=fs.readFileSync(path.join(ROOT,'os.js'),'utf8'),m=src.match(/const FX=\{([\s\S]*?)\};/);
  assert.ok(m,'the FX table');const names=new Set([...m[1].matchAll(/([a-z]+):/g)].map(a=>a[1]));
  const S=play('fxcry',2*T,10*T-PH,{undo:1,root:1});CH.startChase(S,'fxsweep',[]);
  const R=play('r1',40,100);R.chase={id:'roots',on:1,x:CHASES.roots.from*T,t:0,w:0};const M=play('m1',40,40);M.pieces[2]=1;
  const keys=new Set();for(const T0 of [S,R,M,play('r1',40,100),play('b1',40,40),play('m1',40,40)])for(const k of Object.keys(lv(T0)))if(k!=='biome')keys.add(k);
  for(const k of keys)assert.ok(names.has(k),'os.js FX has '+k);
});
test('fxLevels is a pure function of the state: same state, same levels, nothing in it changes',()=>{
  const S=play('m10',40,40);for(let i=0;i<90;i++)E.step(S,I({r:i%2}),[]);const snap=JSON.stringify(S);
  assert.deepEqual(lv(S),lv(S));assert.equal(JSON.stringify(S),snap);
});

Math.random=rand;
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
