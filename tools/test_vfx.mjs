#!/usr/bin/env node
/* Tests for game/vfx/vfx.js, the Sprite Fusion pixel VFX (staged in ~/.claude/plans/wake-up-vfx-spritefusion/port/).
   Pure modules, no browser: the real state.js, rooms and door.js, a fake S, and a fake canvas for the mk path.
   Run from any cwd: node tools/test_vfx.mjs (or node <port>/test_vfx.mjs while staged). WAKE_GAME=<dir> overrides game/. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const HERE=new URL('./',import.meta.url),STAGED=fs.existsSync(new URL('vfx.js',HERE));
const G=process.env.WAKE_GAME?pathToFileURL(process.env.WAKE_GAME.replace(/\/?$/,'/')).href:STAGED?'file:///Users/tmc/DesignPortfolio/game/':new URL('../game/',import.meta.url).href;
const V=STAGED?HERE.href:G+'vfx/';
const {T,VW,VH,PIECES,newState}=await import(G+'state.js');
const {ROOMS}=await import(G+'rooms/index.js');
const {fragCentre}=await import(G+'door.js');
const {newLiquid}=await import(G+'liquid.js');
const {createVfx,LIGHT_GAIN}=await import(V+'vfx.js');
const {USE,UNWIRED,FOG,ROOM_AMBIENT,FLY_ROOTS}=await import(V+'map.js');
const N=VW*VH;

let pass=0,fail=0;
function test(name,fn){try{fn();pass++;console.log('ok   '+name)}catch(e){fail++;console.log('FAIL '+name+'\n     '+(e&&e.message||e).split('\n').join('\n     '))}}
const rand=Math.random;Math.random=()=>{throw new Error('vfx called Math.random')};

/* a rig: one vfx, a fake lit S in a room, the renderer's L map */
function rig(room='hub',opts={}){
  const vfx=createVfx({rooms:ROOMS,PIECES,fragCentre,T,VW,VH,...opts}),S=newState(),R=ROOMS[room];
  S.mode='play';S.lit=1;S.litT=60;S.room=room;S.liq=newLiquid(R,R.flows);S.p.x=100;S.p.y=R.h*T-48;S.t=100;
  return {vfx,S,R,L:new Float32Array(N),ox:0,oy:0};
}
function go(r,id){const R=ROOMS[id];r.S.room=id;r.R=R;r.S.ens=[];r.S.liq=newLiquid(R,R.flows)}
function tick(r,ev=[],frozen=false){r.S.t++;r.vfx.step(r.S,ev,frozen);r.L.fill(0);r.vfx.light(r.L,r.ox,r.oy);r.vfx.render(r.ox,r.oy)}
const fnv=(h,a)=>{for(let i=0;i<a.length;i++){h^=a[i];h=Math.imul(h,16777619)>>>0}return h};
const hashOf=r=>{const f=r.vfx.frames;let h=2166136261;for(const a of [f.back,f.front,f.lit,f.light,new Uint32Array(r.L.buffer)])h=fnv(h,a);return h};
const nz=a=>{let n=0;for(let i=0;i<a.length;i++)if(a[i])n++;return n};
const moss=(x,y)=>({k:'moss',x,y,w:15,h:12,wrap:0,grace:0});

/* a fixed script through four rooms: stuns, the root pickup, a torch and checkpoint, a lift, the four placings, the door */
function script(r,log=null){
  const out=[],S=r.S;go(r,'r1');S.ens=[moss(200,180),moss(320,180)];
  for(let i=0;i<420;i++){
    const ev=[];
    if(i===6){S.ens[0].wrap=240;ev.push('stun')}
    if(i===40){S.ens[0].wrap=240;S.ens[1].wrap=240;ev.push('stun')}   /* a re-stun of a wrapped one, and a fresh one */
    if(i===60){S.items.root=1;ev.push('item')}
    if(i===90){S.torches['r1:'+ROOMS.r1.torches[0].tx+','+ROOMS.r1.torches[0].ty]=1;S.cp={room:'r1',tx:ROOMS.r1.torches[0].tx,ty:ROOMS.r1.torches[0].ty};ev.push('light','cp')}
    if(i===150)go(r,'r5');
    if(i===170){S.pieces[0]=1;ev.push('piece')}
    if(i===230)go(r,'hub');
    if(i===240){S.placed[0]=1;ev.push('place')}
    if(i===300){S.placed=[1,1,1,1];S.door=1;ev.push('place','door')}
    if(i===380)ev.push('opened');
    r.ox=Math.max(0,Math.min(r.R.w*T-VW,Math.round(S.p.x-VW/2+i*.5)));
    if(S.ens[0]&&S.ens[0].wrap>0)S.ens.forEach(e=>{if(e.wrap>0)e.wrap--});
    tick(r,ev);out.push(hashOf(r));if(log)log.push(i+':'+r.vfx.names().join(','));
  }
  return out;
}

test('(a) determinism: the same script twice gives byte-identical frames and light',()=>{
  const a=script(rig()),b=script(rig());
  assert.equal(a.length,b.length);
  const d=a.findIndex((h,i)=>h!==b[i]);assert.equal(d,-1,'first differing step '+d);
  assert.ok(new Set(a).size>50,'the frames actually change ('+new Set(a).size+' distinct)');
});

test('(g) no Math.random: Math.random throws throughout, and two different Math.random streams give the same frames',()=>{
  let s=1;Math.random=()=>(s=(s*16807)%2147483647)/2147483647;const a=script(rig());
  Math.random=()=>.5;const b=script(rig());
  Math.random=()=>{throw new Error('vfx called Math.random')};
  assert.deepEqual(a,b);
});

test('triggers fire once each, from state turning on, deduped, nothing invented',()=>{
  const log=[],r=rig();script(r,log);
  const at=i=>log[i].split(':')[1].split(',').filter(Boolean),born=(i,n)=>at(i).filter(x=>x===n).length-(i?at(i-1).filter(x=>x===n).length:0);
  assert.deepEqual(at(0).sort(),['fireflies','leaves'],'r1: Roots ambient on entry, no one-shot from the baseline');
  assert.equal(born(6,'stun'),1);assert.equal(born(40,'stun'),2,'re-stun and fresh stun');
  assert.equal(born(60,'root'),1,'root -> power-up');
  assert.equal(born(90,'torch'),1,"'light' and 'cp' on one torch: one sparkle");
  assert.ok(!at(150).some(n=>!['fireflies','leaves'].includes(n)),'room change clears the one-shots');
  assert.equal(born(170,'piece'),1,'lift -> sparkle at r5\'s pedestal');
  assert.deepEqual(at(230),[],'hub: no ambient');
  assert.equal(born(240,'place'),1);
  assert.equal(born(300,'door'),1);assert.equal(born(300,'place'),0,'the door beam stands for the fourth place');
  assert.equal(born(380,'opened'),1);
  for(const n of Object.keys(UNWIRED))assert.ok(!log.some(l=>l.split(':')[1].split(',').includes(n)),n+' is unwired');
});

test('(b) reduce: no live effects, nothing written, no canvas calls',()=>{
  const C=fakeCanvas(),r=rig('hub',{reduce:true,mk:C.mk}),S=r.S;
  go(r,'r1');S.ens=[moss(200,180)];
  for(let i=0;i<120;i++){
    if(i===5){S.ens[0].wrap=240}if(i===10)S.items.root=1;
    tick(r,[]);r.vfx.drawLit(C.ctx,0,0);r.vfx.drawBack(C.ctx,0,0);r.vfx.drawFront(C.ctx,0,0);
    assert.equal(r.vfx.live(),0);
  }
  assert.equal(r.vfx.spawn('torch',100,100),null);
  const f=r.vfx.frames;for(const a of [f.back,f.front,f.lit,f.light])assert.equal(nz(a),0);
  assert.equal(nz(new Uint32Array(r.L.buffer)),0,'L untouched');
  assert.equal(C.calls.draw+C.calls.put,0);
});

test('(c) a room change, an S.t jump and a respawn clear everything; the seed counter keeps counting',()=>{
  const r=rig('hub');tick(r);
  r.vfx.spawn('torch',100,100);r.vfx.spawn('stun',120,100);tick(r);assert.equal(r.vfx.live(),2);
  const n0=r.vfx.n;r.S.t+=5;tick(r);assert.equal(r.vfx.live(),0,'S.t discontinuity (restore, Undo)');
  r.vfx.spawn('torch',100,100);tick(r);assert.equal(r.vfx.live(),1);
  tick(r,['rez']);assert.equal(r.vfx.live(),0,"'rez'");
  r.vfx.spawn('torch',100,100);tick(r);go(r,'r2');tick(r);
  assert.deepEqual(r.vfx.names().sort(),['fireflies','leaves'],'room change: only the new room\'s ambient');
  assert.ok(r.vfx.n>n0);
});

test('(d) frozen steps do not advance (frozen flag, and S.hit when frozen is left out)',()=>{
  const r=rig('hub');tick(r);r.vfx.spawn('piece',144,120);r.vfx.spawn('stun',100,120);
  for(let i=0;i<4;i++)tick(r);
  const h=hashOf(r);
  for(let i=0;i<12;i++){tick(r,[],true);assert.equal(hashOf(r),h,'frozen step '+i)}
  r.S.hit=3;r.S.t++;r.vfx.step(r.S,[]);r.L.fill(0);r.vfx.light(r.L,0,0);assert.equal(hashOf(r),h,'S.hit>0');r.S.hit=0;
  tick(r);assert.notEqual(hashOf(r),h,'runs again after');
});

/* every use: it draws something, finishes and is removed (ambient once stopped) */
const ONE=Object.keys(USE).filter(n=>!USE[n].ambient),AMB=Object.keys(USE).filter(n=>USE[n].ambient);
const place=(r,n)=>{const p=r.S.p,o=n==='root'||n==='dash'||n==='blink'?{actor:true}:{};return r.vfx.spawn(n,p.x+p.w/2,n==='stun'||n==='piece'||n==='torch'||n==='item'?p.y:p.y+p.h,o)};
test('(e) every effect draws, finishes (done) and is removed; live()===0 afterwards',()=>{
  const bad=[];
  for(const n of [...ONE,...AMB]){
    const r=rig('hub');tick(r);
    const h=n==='bubbles'?r.vfx.spawn(n,null,null,{area:{x:0,y:240,w:VW*2,h:160}}):USE[n].ambient?r.vfx.spawn(n):place(r,n);
    if(!h){bad.push(n+': spawn failed');continue}
    let px=0,steps=0;
    for(;steps<3600&&r.vfx.live();steps++){
      if(USE[n].ambient&&steps===240)h.stop();
      tick(r);px=Math.max(px,nz(r.vfx.frames.back)+nz(r.vfx.frames.front)+nz(r.vfx.frames.lit));
    }
    if(!px)bad.push(n+': never drew a pixel');
    if(r.vfx.live()||!h.done())bad.push(n+': still live after '+steps+' steps');
    if(r.vfx.err)bad.push(n+': '+r.vfx.err+' caught errors');
    console.log('     '+n.padEnd(10)+(USE[n].fx).padEnd(15)+'max px '+String(px).padStart(5)+'  done after '+(steps/60).toFixed(2)+' s');
  }
  assert.deepEqual(bad,[]);
});

test('(f) light(): nothing from noLight effects, and only ever adds',()=>{
  for(const n of Object.keys(USE).filter(n=>USE[n].noLight)){
    const r=rig('hub');tick(r);n==='bubbles'?r.vfx.spawn(n,null,null,{area:{x:0,y:240,w:VW*2,h:160}}):USE[n].ambient?r.vfx.spawn(n):place(r,n);
    for(let i=0;i<120;i++){tick(r);assert.equal(nz(new Uint32Array(r.L.buffer)),0,n+' added light at step '+i)}
  }
  const r=rig('hub');tick(r);r.vfx.spawn('torch',144,120);let lit=0;
  for(let i=0;i<120;i++){r.S.t++;r.vfx.step(r.S,[]);r.L.fill(.25);r.vfx.light(r.L,0,0);
    for(let j=0;j<N;j++){assert.ok(r.L[j]>=.25,'L went down at '+j);if(r.L[j]>.25)lit++}}
  assert.ok(lit>0,'a lit effect does add light');
  assert.equal(LIGHT_GAIN,1.6);
});

test('ambient stays out of the rock (mask) and in the room (room-sized areas scroll with the camera)',()=>{
  const r=rig('hub');go(r,'a2');tick(r);
  let px=0;
  for(let i=0;i<240;i++){r.ox=Math.round(i*2)%(r.R.w*T-VW);tick(r);
    for(const a of [r.vfx.frames.back,r.vfx.frames.front])for(let j=0;j<N;j++){if(!a[j])continue;px++;
      const tx=Math.floor((j%VW+r.ox)/T),ty=Math.floor(((j/VW|0)+r.oy)/T);assert.ok(!'#='.includes(r.R.g[ty][tx]),'ambient pixel over rock at tile '+tx+','+ty)}}
  assert.ok(px>0);
  /* the same step drawn from two cameras: a world-anchored pixel moves by exactly the camera's shift */
  const f=r.vfx.frames,a=f.back.slice();r.vfx.render(r.ox+5,0);let same=0,tot=0;
  for(let y=0;y<VH;y++)for(let x=5;x<VW;x++){const c=a[y*VW+x];if(!c)continue;tot++;if(f.back[y*VW+x-5]===c)same++}
  assert.ok(tot>0&&same/tot>.95,'scrolls with the room ('+same+'/'+tot+')');
});

test('holy-light beam is clipped to clip.h above where it lands, not full frame',()=>{
  const r=rig('hub');tick(r);r.vfx.spawn('door',144,192);const top=192-USE.door.o.clip.h;let px=0,hi=VH;
  for(let i=0;i<200&&r.vfx.live();i++){tick(r);const a=r.vfx.frames.back;for(let j=0;j<N;j++)if(a[j]){px++;hi=Math.min(hi,j/VW|0)}}
  assert.ok(px>0);assert.ok(hi>=top,'back pixel at row '+hi+', above the clip top '+top);
});

test('bubbles: one per liquid surface in S.liq, inside the pool',()=>{
  const r=rig('hub');go(r,'f1');tick(r);
  assert.equal(r.vfx.names().filter(n=>n==='bubbles').length,r.S.liq.s.length);
  go(r,'r1');tick(r);assert.ok(!r.vfx.names().includes('bubbles'));
});

test('mk path: frames are views over ImageData; layers go through their own canvas, never putImageData on the scene',()=>{
  const C=fakeCanvas(),r=rig('hub',{mk:C.mk});tick(r);
  assert.equal(r.vfx.frames.back.buffer,C.imgs[1].data.buffer);
  r.vfx.drawBack(C.ctx,0,0);assert.equal(C.calls.draw,0,'nothing live, nothing drawn');
  r.vfx.spawn('torch',144,120);tick(r);r.vfx.drawLit(C.ctx,0,0);r.vfx.drawBack(C.ctx,0,0);r.vfx.drawFront(C.ctx,0,0);
  assert.equal(C.calls.draw,2,'back and front, no lit (nothing is lit by default)');assert.equal(C.calls.scenePut,0);
});

test('hooks: no-ops by default; one that throws is caught',()=>{
  const r=rig('hub');tick(r);let n=0;r.vfx.hooks.shake=()=>{n++;throw new Error('boom')};
  r.vfx.spawn('door',144,192);for(let i=0;i<60;i++)tick(r);
  assert.ok(n>0&&r.vfx.err>=n&&r.vfx.live()===1);
});

/* ---------- (h) cost ---------- */
const q=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(p*s.length))]};
function measure(r,frames,warm=0){
  const d=[],l=[];
  for(let i=0;i<warm;i++){r.S.t++;r.vfx.step(r.S,[])}
  for(let i=0;i<frames&&r.vfx.live();i++){
    r.S.t++;r.vfx.step(r.S,[]);
    const t0=performance.now();r.vfx.render(r.ox,r.oy);const t1=performance.now();r.L.fill(0);r.vfx.light(r.L,r.ox,r.oy);d.push(t1-t0);l.push(performance.now()-t1);
  }
  return {d,l};
}
const BUDGET=2,LIMIT=2*BUDGET;   /* ms p95: BUDGET marks OVER in the table (a guess, of a 16.7 ms frame); LIMIT is asserted, with headroom for a busy machine */
test('(h) draw cost per effect, 288x216 frame, and fog and bubbles room-sized on the widest room (a2)',()=>{
  const rows=[],run=(label,mk,frames,warm)=>{const r=mk();const {d,l}=measure(r,frames,warm);rows.push({label,n:d.length,med:q(d,.5),p95:q(d,.95),max:Math.max(...d),lum:q(l,.5)})};
  const hub=()=>{const r=rig('hub');tick(r);return r};
  for(let k=0;k<2;k++)for(const n of ONE){const r=hub();place(r,n);measure(r,400)}   /* JIT warm-up */
  for(const n of ONE)run(n+' ('+USE[n].fx+')',()=>{const r=hub();place(r,n);return r},600,0);
  const a2=(alone)=>{if(alone)ROOM_AMBIENT.a2=[];const r=rig('hub');go(r,'a2');r.ox=(r.R.w*T-VW)/2;tick(r);delete ROOM_AMBIENT.a2;return r};
  const A2={x:0,y:0,w:ROOMS.a2.w*T*2,h:ROOMS.a2.h*T*2},solo=(n,o)=>()=>{const r=a2(1);r.vfx.spawn(n,null,null,o);return r};
  run('roots ambient a2 (fireflies+leaves)',()=>a2(0),180,120);
  run('fireflies alone, a2',solo('fireflies'),180,120);
  run('fireflies alone, a2, FLY_ROOTS remap',solo('fireflies',{remap:FLY_ROOTS}),180,120);
  run('leaves alone, a2',solo('leaves'),180,120);
  run('fog a2 room-sized ('+ROOMS.a2.w*T+'x'+ROOMS.a2.h*T+')',solo('fog',{area:A2}),180,120);
  run('fog a2 room-sized, 1 layer',solo('fog',{area:A2,layers:1}),180,120);
  run('fog a2, lower third only',solo('fog',{area:{...A2,y:A2.h*2/3,h:A2.h/3}}),180,120);
  run('fog a2, upstream defaults (density 1, 3 layers)',solo('fog',{area:A2,density:1,layers:3}),180,120);
  run('bubbles a2 room-sized',solo('bubbles',{area:A2}),180,120);
  run('bubbles a2, upstream tint+caustics on',solo('bubbles',{area:A2,tint:true,caustics:true}),180,120);
  run('bubbles f1 pools (ambient)',()=>{const r=rig('hub');go(r,'f1');r.ox=30*T-VW/2;r.oy=r.R.h*T-VH;tick(r);return r},180,120);
  console.log('     '+'case'.padEnd(40)+'frames'.padStart(7)+'  median'.padStart(9)+'     p95'.padStart(9)+'     max'.padStart(9)+'  L pass'.padStart(9));
  for(const x of rows)console.log('     '+x.label.padEnd(40)+String(x.n).padStart(7)+x.med.toFixed(3).padStart(9)+x.p95.toFixed(3).padStart(9)+x.max.toFixed(3).padStart(9)+x.lum.toFixed(3).padStart(9)+(x.p95>BUDGET?'  OVER '+BUDGET+' ms':''));
  /* the upstream-default rows are for comparison; fog counts only once map.js turns it on (FOG.on) */
  const over=rows.filter(x=>x.p95>LIMIT&&!/upstream/.test(x.label)&&(FOG.on||!/^fog/.test(x.label)));
  if(!FOG.on&&rows.some(x=>/^fog/.test(x.label)&&!/upstream/.test(x.label)&&x.p95>BUDGET))console.log('     NOTE fog is over the '+BUDGET+' ms budget; not asserted while FOG.on is false (map.js)');
  assert.deepEqual(over.map(x=>x.label+' p95 '+x.p95.toFixed(2)+' ms'),[]);
});

function fakeCanvas(){
  const calls={draw:0,put:0,scenePut:0},imgs=[];
  const mk=(w,h)=>({width:w,height:h,getContext:()=>({createImageData:(w,h)=>{const i={width:w,height:h,data:new Uint8ClampedArray(w*h*4)};imgs.push(i);return i},putImageData:()=>calls.put++})});
  return {mk,calls,imgs,ctx:{drawImage:()=>calls.draw++,putImageData:()=>calls.scenePut++}};
}

Math.random=rand;
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
