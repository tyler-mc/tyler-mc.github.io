// Undo (agent A1, 2026-11-07): the ring buffer, the meter, the rewind step, the anchored state, the pickup demo, the sweep
// clamp and the per-frame copy cost. Synthetic rooms only, so it does not depend on the Crystals room files.
// Contract: ~/.claude/plans/wake-up-crystals-beat-sheet.md section 3. Plain node, no deps: node tools/test_undo.mjs
const G=new URL('../game/',import.meta.url).href;
const st=await import(G+'state.js');
const {T,VER,newState,snapshot,restore,persist,save,load,resume,items}=st;
const E=await import(G+'engine.js');
const U=await import(G+'undo.js');
const {ROOMS,ORDER,CHASES,parse}=await import(G+'rooms/index.js');
const P=await import(G+'player.js');
await U.undoReady;   /* game/sweep.js's sweepClamp, if A5 has written it; else the local fallback */
let fails=0,passes=0;
const ok=(c,msg)=>{if(c){passes++;console.log('  ok  ',msg)}else{fails++;console.log('  FAIL',msg)}};
const I=(o={})=>({l:0,r:0,u:0,d:0,j:0,jp:0,b:0,bp:0,z:0,zp:0,drag:null,any:0,...o});
const run=(S,n,f)=>{const evs=[];for(let i=0;i<n;i++)evs.push(...E.step(S,typeof f==='function'?f(i,S):f,[]));return evs};
const mem=()=>({d:{},getItem(k){return this.d[k]??null},setItem(k,v){this.d[k]=String(v)},removeItem(k){delete this.d[k]}});
const {PW,PH}=P,{UNDO,KEEP,frameOf}=U;
const J=JSON.stringify;

/* ---------- synthetic rooms ---------- */
let AT=0;
function box(W,H){const g=Array.from({length:H},(_,y)=>[...(y===0||y>=H-2?'#'.repeat(W):'#'+'.'.repeat(W-2)+'#')]);
  return {g,set(x,y,c){g[y][x]=c;return this},fill(x0,y0,x1,y1,c){for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)g[y][x]=c;return this},rows(){return g.map(r=>r.join(''))}}}
const room=(id,b,ents=[],at)=>{ROOMS[id]=parse({id,name:id,biome:'crystals',at:at||[40000+(AT++)*200,40000],grid:b.rows(),ents});return ROOMS[id]};
function playState(id,x,y,it={}){const S=newState();Object.assign(S,{lit:1,litT:60,match:1,mode:'play'});Object.assign(S.items,it);
  E.enterRoom(S,id,{x,y});if(it.root)S.p.root=1;if(it.board)S.p.dc=1;return S}
const FL=H=>(H-2)*T;

/* a long room: floor row 16, a crawler (M), a plate at 20 with its gate at 34, spikes far right, a torch at 2, a wall to cling at 1 */
const b0=box(60,18);b0.set(2,15,'T').set(26,15,'M').set(20,15,'P').fill(34,10,34,15,'G').fill(50,15,52,15,'^');room('u1',b0);
const MOVE=i=>I({r:i%90<60,l:i%90>=75,j:i%37<8,jp:i%37===0});

console.log('1. state, save v6');
{ ok(VER===6,'the save is v6');
  const S=newState();
  ok(S.items.undo===0&&J(S.cr)==='{}'&&J(S.echo)==='{"on":0,"log":[],"i":0}','newState: items.undo 0, S.cr {}, S.echo {on:0,log:[],i:0}');
  ok(S.undo&&S.undo.m===1&&S.undo.q===UNDO.full&&S.undo.on===0&&S.undo.buf.length===0,'newState: S.undo full meter, not rewinding, empty buffer');
  S.lit=1;S.items.undo=1;S.items.board=1;const m=mem();save(S,m);const d=load(m);
  ok(d.v===6&&d.items.undo===1,'a v6 save carries items.undo');
  ok(!('undo' in d)&&!('cr' in d)&&!('echo' in d),'the meter, the buffer, S.cr and the Echo are never saved');
  ok(resume(newState(),d).items.undo===1,'...and it loads back');
  for(const v of [1,2,3,4,5]){m.setItem('tos_game',J({v,lit:1,items:v>=4?{root:1,board:1}:{root:1},pieces:[1,0,0,0],torches:{},cp:{room:'r1',tx:36,ty:14}}));const q=load(m);
    ok(q&&resume(newState(),q).items.root===1&&!resume(newState(),q).items.undo,`a v${v} save still loads (no undo)`)}
  m.setItem('tos_game',J({v:7,lit:1,items:{}}));ok(load(m)===null,'a save from a later version is refused (as before)');
  ok(items({board:0,forged:1,undo:1}).forged===0&&items({undo:1}).undo===1&&J(items({root:1}))===J({root:1}),'items(): forged still needs the board; undo passes through untouched');
}

console.log('2. the buffer: only while owned, one entry per live frame');
{ const N=playState('u1',6*T,FL(18)-PH,{root:1});run(N,240,MOVE);ok(N.undo.buf.length===0,'not owned: nothing is recorded');
  const ev=run(N,30,I({z:1,zp:1}));ok(!ev.includes('undo_start')&&N.undo.on===0,'not owned: the key does nothing');
  const S=playState('u1',6*T,FL(18)-PH,{root:1,undo:1});run(S,10,MOVE);ok(S.undo.buf.length===10,'owned: one entry per live frame');
  ok(S.undo.buf[9]===frameOf(S),'the newest entry is the current frame');
  run(S,400,MOVE);ok(S.undo.buf.length===UNDO.len+1,`it holds the current frame plus ${UNDO.len} of history (3 s)`);
  const n0=S.undo.buf.length,b0=S.undo.buf[0];S.hit=3;run(S,3,MOVE);ok(S.undo.buf.length===n0&&S.undo.buf[0]===b0,'hit-stop frames record nothing');
  const D=playState('u1',6*T,FL(18)-PH,{undo:1});D.mode='dark';run(D,20,I());ok(D.undo.buf.length===0,'in the dark nothing is recorded');
  const f=JSON.parse(S.undo.buf[S.undo.buf.length-1]);ok(J(Object.keys(f))===J(KEEP),`an entry holds exactly ${KEEP.join(', ')}`);
}

console.log('3. the rewind: exact, 2 frames per step, to the buffer start');
{ const S=playState('u1',6*T,FL(18)-PH,{root:1,undo:1,claws:1});const hist=[];
  // the script touches every rewound field: walk, jumps, the root (roots), the plate (plate, gate), the crawler (ens),
  // a drilled tile and S.cr written by hand (as crystals.js would)
  for(let i=0;i<260;i++){S.cr.k=i;if(i===150)S.drilled.push([5,5]);if(i===160)S.crack=[5,6,3];E.step(S,MOVE(i),[]);hist.push(frameOf(S))}
  const N=hist.length;ok(S.undo.buf.length===UNDO.len+1&&S.undo.buf[UNDO.len]===hist[N-1],'(the buffer matches the recorded frames)');
  const saw={};for(const k of KEEP)saw[k]=new Set(hist.slice(N-181).map(h=>J(JSON.parse(h)[k]))).size;
  console.log(`      (distinct values per field in the last 3 s of that run: ${KEEP.map(k=>k+' '+saw[k]).join(', ')})`);
  let exact=true,steps=0;const ev=[];
  let atStart=false;
  for(let k=1;k<=95;k++){const e=E.step(S,I({z:1,zp:k===1}),[]);ev.push(...e);if(!S.undo.on)break;steps++;if(frameOf(S)!==hist[N-1-2*k])exact=false;if(k===UNDO.len/UNDO.pop)atStart=frameOf(S)===hist[N-1-UNDO.len]&&S.undo.buf.length===1}
  ok(ev[0]==='undo_start'&&ev.filter(e=>e==='undo_start').length===1,'the first rewind frame sends undo_start, once');
  ok(exact,'each rewind step puts back exactly the frame 2 earlier (all of p, ens, roots, vines, drilled, crack, gate, plate, cr)');
  ok(steps===UNDO.len/UNDO.pop,`a full rewind is ${steps} steps (${UNDO.len} frames of history, 1.5 s of real time)`);
  ok(atStart,'it stops at the buffer start (the frame 3 s back, one entry left)');
  ok(ev.includes('undo_end')&&S.undo.lock===1,'holding on at the start: the rewind ends (undo_end) and the hold is locked');
  const e2=run(S,10,I({z:1}));ok(!e2.includes('undo_start')&&S.undo.on===0,'...still held: the world runs live, no re-rewind flicker');
}

{ // every rewound field on its own: a hand-made value per frame, so each one is seen to come back
  const S=playState('u1',30*T,FL(18)-PH,{undo:1});U.undoClear(S);
  const put=i=>{S.p.x=100+i;S.ens=[{k:'M',x:i,y:0,w:12,h:12}];S.roots=[{x:i,y:0,t:i,g:0,hit:[]}];S.vines=[{x:i,y:0,w:10,h:i,t:i}];
    S.drilled=[[i,1]];S.crack=i%4?[1,2,i]:null;S.gate=i/20;S.plate=i%2;S.cr={q:{[i+',3']:i},k:i}};
  const want=[];for(let i=0;i<=10;i++){put(i);U.undoRecord(S);want.push(frameOf(S))}
  U.undoStep(S,I({z:1,zp:1}),[]);const a=frameOf(S)===want[8];U.undoStep(S,I({z:1}),[]);const b=frameOf(S)===want[6];
  ok(a&&b&&S.p.x===106&&S.gate===6/20&&S.plate===0&&S.crack[2]===6&&S.cr.k===6&&S.vines[0].t===6&&S.roots[0].t===6&&S.drilled[0][0]===6&&S.ens[0].x===6,
    'each of p, ens, roots, vines, drilled, crack, gate, plate and cr comes back on its own (2 frames per step)');
  const p0=S.p;U.undoStep(S,I({z:1}),[]);ok(S.p===p0,'the player object is restored in place (step() holds S.p)');
}

console.log('4. the meter');
{ const S=playState('u1',6*T,FL(18)-PH,{root:1,undo:1});run(S,300,MOVE);
  ok(UNDO.full/UNDO.drain===90,'a full meter is 90 rewind steps');
  S.undo.q=40;S.undo.m=40/UNDO.full;let n=0,lo=1e9;const ev=[];for(let k=0;k<30;k++){const e=E.step(S,I({z:1,zp:k===0}),[]);ev.push(...e);if(S.undo.on)n++;lo=Math.min(lo,S.undo.q)}
  ok(n===10&&lo===0,`40/360 of a meter is ${n} steps (drains 1/90 per step), down to ${lo}`);
  ok(ev.includes('undo_empty')&&S.undo.lock===1,'the meter runs dry mid-hold: undo_empty (the click) and the hold ends');
  run(S,2,I());S.undo.q=UNDO.drain-1;const e3=run(S,1,I({z:1,zp:1}));ok(e3.includes('undo_empty')&&!e3.includes('undo_start')&&S.undo.flash===UNDO.flash,'a press on an empty meter does nothing but click, and the ring flashes');
  ok(run(S,5,I({z:1})).filter(e=>e==='undo_empty').length===0,'held on, the click does not repeat every frame');
  room('uq',box(30,18).set(2,15,'T'));const Q=playState('uq',20*T,FL(18)-PH,{undo:1});Q.undo.q=0;let fr=0;while(Q.undo.q<UNDO.full&&fr<1000){E.step(Q,I(),[]);fr++}
  ok(fr===360,`from empty it refills in ${fr} frames (6 s)`);
  ok(Math.abs(Q.undo.m-1)<1e-12&&Number.isInteger(Q.undo.q),'the meter is an exact integer (q), m = q/360 for the renderer');
  const Tq=playState('u1',5*T,FL(18)-PH,{undo:1});Tq.undo.q=8;Tq.undo.m=8/360;run(Tq,60,I({l:1}));ok(Tq.undo.q===UNDO.full,'a torch fills it at once');
  ok(UNDO.full===360&&U.UNDO.inv===20,'(numbers: full 360, inv 20)');
}

console.log('5. anchored: never rewound');
{ const S=playState('u1',6*T,FL(18)-PH,{root:1,undo:1});run(S,200,MOVE);
  Object.assign(S,{pieces:[1,0,1,0],placed:[1,0,0,0],torches:{'u1:2,15':1},cp:{room:'u1',tx:2,ty:15},latch:{x:1},seen:{u1:1},say:{text:'hi',t:500,n:0}});
  S.echo={on:1,log:[1,2,1,3,4,1],i:2};S.cam.sh=2;CHASES.__tsw={kind:'sweep'};S.chase={id:'__tsw',on:1,y:-1e9,t:5,w:0};
  const A=['items','pieces','placed','torches','latch','cp','seen','chase','echo','say','liq'],before=J(A.map(k=>S[k])),cam=J(S.cam),t0=S.t;
  const q0=S.undo.q;for(let k=0;k<20;k++)U.undoStep(S,I({z:1,zp:k===0}),[]);
  ok(J(A.map(k=>S[k]))===before&&J(S.cam)===cam&&S.t===t0,`the rewind step itself touches none of ${A.join(', ')}, the camera, S.t`);
  ok(S.undo.q===q0-20*UNDO.drain,'the meter is anchored: it only drains');
  delete CHASES.__tsw;
  // in the full step: items and latched gates never come back shut
  const L=playState('u1',17*T,FL(18)-PH,{undo:1});run(L,10,I());L.latch.u1=1;L.gate=1;run(L,40,I({r:1}));
  let shut=0;for(let k=0;k<30;k++){E.step(L,I({z:1}),[]);if(L.gate<.5)shut++}
  ok(shut===0,'a latched gate never shuts during a rewind, not even for a frame');
  const It=playState('u1',6*T,FL(18)-PH,{undo:1});run(It,60,MOVE);It.items.claws=1;It.pieces[3]=1;run(It,30,I({z:1}));ok(It.items.claws===1&&It.pieces[3]===1,'items and pieces gained mid-buffer stay after a rewind');
}

console.log('6. the buffer is cleared on room change, death, respawn, warp');
{ // room change: two rooms side by side (registered in ORDER so roomAtTile finds them)
  const a=box(30,18),b=box(30,18);a.fill(29,10,29,15,'.');b.fill(0,10,0,15,'.');a.set(3,15,'T');b.set(26,15,'T');
  room('ua',a,[],[50000,40000]);room('ub',b,[],[50030,40000]);ORDER.push('ua','ub');
  const S=playState('ua',24*T,FL(18)-PH,{undo:1});let moved=-1;for(let i=0;i<200;i++){E.step(S,I({r:1}),[]);if(S.room==='ub'){moved=i;break}}
  ok(moved>0&&S.undo.buf.length===1,`walking through a doorway into the next room: the buffer starts again (${S.undo.buf.length} entry, the new room's first frame)`);
  const first=S.undo.buf[0];run(S,40,I({r:1}));
  let back=true,n=0,atFirst=false;for(let i=0;i<40;i++){E.step(S,I({z:1,zp:i===0}),[]);if(S.undo.on)n++;if(S.room!=='ub')back=false;if(S.undo.on&&S.undo.buf.length===1)atFirst=S.undo.buf[0]===first&&frameOf(S)===first}
  ok(n===20&&back&&S.p.x+PW/2>=0,`walk on, then hold Undo: ${n} steps back to the doorway, and never into the old room (his middle stays in this one)`);
  ok(atFirst,'...it stops at the room\'s first frame (no rewind across the seam)');
  ORDER.splice(ORDER.indexOf('ua'),2);
  // death: spikes at 50-52
  const D=playState('u1',46*T,FL(18)-PH,{undo:1});const de=[];for(let i=0;i<120&&!de.includes('die');i++)de.push(...E.step(D,I({r:1}),[]));
  ok(de.includes('die')&&D.undo.buf.length===0,'a death clears the buffer');
  const re=run(D,30,I({z:1,zp:1}));ok(re.includes('rez')&&!re.includes('undo_start')&&D.undo.buf.length<=12,'dead and respawned: no rewind back across the death');
  // respawn / warp both go through enterRoom; a save resume too
  const W=playState('u1',6*T,FL(18)-PH,{undo:1});run(W,50,MOVE);E.enterRoom(W,'u1',{x:6*T,y:FL(18)-PH});ok(W.undo.buf.length===0&&J(W.cr)==='{}'&&W.echo.log.length===0,'enterRoom (room change, respawn, warp, a save resume) clears the buffer, S.cr and the Echo');
  // snapshot/restore (the tests' and reach()'s replay tool) keeps it, so a rewind replays exactly
  const R1=playState('u1',6*T,FL(18)-PH,{undo:1,root:1});run(R1,120,MOVE);run(R1,7,I({z:1,zp:1}));
  const R2=newState();restore(R2,snapshot(R1));const sc=i=>i<20?I({z:1}):MOVE(i);run(R1,200,sc);run(R2,200,sc);
  ok(J(R1)===J(R2),'a JSON snapshot taken mid-rewind replays the same 200 frames (the buffer is plain data in S.undo)');
}

console.log('7. after a rewind he is safe for 20 frames');
{ const S=playState('u1',6*T,FL(18)-PH,{undo:1});run(S,100,MOVE);run(S,10,I({z:1,zp:1}));
  const e=E.step(S,I(),[]);ok(e.includes('undo_end')&&S.p.inv===UNDO.inv,`the frame it ends: undo_end, p.inv = ${S.p.inv}`);
  // drop him into the spikes on that same frame's state: he must survive exactly 20 frames of touching
  const K=playState('u1',6*T,FL(18)-PH,{undo:1});run(K,100,MOVE);run(K,10,I({z:1,zp:1}));
  let n=0,died=-1;for(let i=0;i<40;i++){const ev=E.step(K,I(),[]);if(i===0){K.p.x=50*T;K.p.y=FL(18)-PH;K.p.vy=0}if(ev.includes('die')){died=i;break}n++}
  ok(died===UNDO.inv,`stood in spikes from the end frame on, he dies on frame ${died} after it (safe for frames 0..${UNDO.inv-1})`);
  /* immunity is no longer than the rewind took back (a lead's review, 2026-11-07: a tap every 19 frames was endless immunity) */
  const H=playState('u1',6*T,FL(18)-PH,{undo:1});run(H,100,MOVE);run(H,1,I({z:1,zp:1}));E.step(H,I(),[]);ok(H.p.inv>=1&&H.p.inv<=3,`a one-step tap rewinds 2 frames and buys ${H.p.inv} frames of safety, not ${UNDO.inv}`);
  const T2=playState('u1',6*T,FL(18)-PH,{undo:1});run(T2,100,MOVE);let tdie=-1;
  for(let i=0;i<400&&tdie<0;i++){const ev=E.step(T2,i%19===0?I({z:1,zp:1}):I(),[]);if(i===30){T2.p.x=50*T;T2.p.y=FL(18)-PH;T2.p.vy=0}if(ev.includes('die'))tdie=i}
  ok(tdie>0,`tapping Undo every 19 frames while standing in spikes still kills him (frame ${tdie})`);
}

console.log('8. determinism');
{ const sc=i=>{const m=MOVE(i);if(i%200>=120&&i%200<150)return I({z:1,zp:i%200===120});return m};
  const A=playState('u1',6*T,FL(18)-PH,{root:1,undo:1,board:1}),B=playState('u1',6*T,FL(18)-PH,{root:1,undo:1,board:1});
  const ea=run(A,1200,sc),eb=run(B,1200,sc);
  ok(J(A)===J(B)&&J(ea)===J(eb),`two runs with rewinds (6 holds in 1200 frames) give the same world and the same events (${ea.filter(e=>e==='undo_start').length} rewinds)`);
  const fs=await import('node:fs');const src=fs.readFileSync(new URL('undo.js',G),'utf8');
  ok(!/Math\.random|Date\.now|performance\.now/.test(src),'undo.js uses no Math.random and no clock');
}

console.log('9. the sweep clamp');
{ CHASES.__sw={kind:'sweep'};
  // he rises 3 tiles up a stair over 3 s; then rewinds with a front that leaves no room above 60 px under it
  const b=box(40,24);b.fill(10,19,39,21,'#').fill(16,16,39,18,'#').fill(22,13,39,15,'#').set(3,21,'T');room('usw',b);
  const S=playState('usw',2*T,FL(24)-PH,{undo:1,root:1});const sc=i=>I({r:1,j:i%20<10,jp:i%20===0});
  const hist=[];for(let i=0;i<180;i++){E.step(S,sc(i),[]);hist.push(S.p.y)}
  const top=ROOMS.usw.at[1]*T,front=top+Math.min(...hist)-UNDO.above+30;   /* 30 px above the front would cut the climb short */
  S.chase={id:'__sw',on:1,y:front,t:0,w:0};
  const oky=y=>top+y>=front+UNDO.above;
  let ever=true,n=0;for(let k=0;k<95;k++){const r=U.undoStep(S,I({z:1,zp:k===0}),[]);if(!r)break;n++;if(!oky(S.p.y))ever=false}
  const firstBad=(()=>{for(let k=hist.length-2;k>=0;k--)if(!oky(hist[k]))return hist.length-1-k;return -1})();
  ok(ever,`a rewind never puts his box top above the front + ${UNDO.above} px (clamp: ${U.clampSource()})`);
  /* the last allowed frame is firstBad-1 back; whole steps of 2 reach floor((firstBad-1)/2) steps, and a half step (1 frame) one more */
  ok(firstBad>1&&n===Math.ceil((firstBad-1)/UNDO.pop)&&oky(S.p.y),`it stops on the first frame that would break it (${firstBad} frames back; ${n} steps taken)`);
  ok(S.undo.lock===1,'...as if the buffer had ended (the hold locks)');
  ok(U.clampFallback({chase:{id:'__sw',on:1,y:0},room:'usw',p:{y:-1e6}})===true&&U.clampFallback({chase:{id:'__sw',on:0,y:0},room:'usw',p:{y:-1e6}})===false&&U.clampFallback({chase:null,room:'usw',p:{y:-1e6}})===false,'the fallback: only a running sweep clamps');
  const Ro=playState('usw',2*T,FL(24)-PH,{undo:1});run(Ro,120,sc);Ro.chase={id:'roots',on:1,x:-1e9,t:0,w:0};let rn=0;for(let k=0;k<95;k++)if(U.undoStep(Ro,I({z:1,zp:k===0}),[]))rn++;
  ok(rn>=59,`another chase kind does not clamp (${rn} steps)`);
  delete CHASES.__sw;
}

console.log('10. the pickup demo');
{ // the item on a ledge of cracked rock over a short drop: the test opens the rock under him 10 frames after the pickup
  // (drilled tiles are rewound, as Crystals' shard steps will be), so the demo has something to undo
  const b=box(40,18);b.fill(1,12,39,12,'#').fill(12,12,16,12,'X').set(14,11,'I').set(3,11,'T');room('ud',b,[{at:[14,11],item:'undo'}]);
  /* demo(S,room): walk right (pressing jump too: the demo must ignore it) into the item; returns what happened. collapse(S,i):
     the test's own collapse, or none for real Q steps */
  const demo=(id,collapse)=>{const S=playState(id,8*T,12*T-PH,{root:1});const o={S,pick:-1,first:null,ev:[],drop:0,minM:1,back:null};
    for(let i=0;i<500;i++){if(collapse&&o.pick>=0&&i===o.pick+10)collapse(S);
      const k=o.pick>=0?i:1;const e=E.step(S,I({r:1,j:k%11<5,jp:k%11===0}),[]);o.ev.push(...e);   /* jump presses only once he has it */
      if(e.includes('item')&&o.pick<0){o.pick=i;o.first=frameOf(S);o.y=S.p.y}
      if(o.pick>=0){o.drop=Math.max(o.drop,S.p.y-o.y);o.minM=Math.min(o.minM,S.undo.m)}
      if(S.undo.on&&S.undo.buf.length===1)o.back=frameOf(S);   /* the last rewind frame: the buffer's start */
      if(o.pick>=0&&!S.undo.demo&&i>o.pick+5)break}
    return o};
  const d=demo('ud',S=>S.drilled.push([12,12],[13,12],[14,12],[15,12],[16,12]));const S=d.S;
  ok(d.pick>=0&&S.items.undo===1&&d.ev.includes('item'),'walking into the item: picked up (item event; the OS hears it through onEvent item {name:undo})');
  ok(d.drop>=T,`the rock gives way and he drops (${d.drop.toFixed(0)} px)`);
  ok(d.ev.includes('undo_start')&&d.ev.includes('undo_end'),'the demo holds the key: the room runs back');
  ok(d.back!==null&&d.back===d.first,'it runs back to exactly the pickup frame (he stands where he took it, the rock whole again)');
  ok(d.minM<1&&d.minM>.5,`the meter drained a little (lowest ${d.minM.toFixed(2)})`);
  const after=S.undo.m;run(S,30,I());ok(S.undo.m>after,'...and refills after');
  const x0=S.p.x;run(S,30,I({l:1}));ok(S.undo.demo===0&&S.p.x<x0-10,'then control is his again');
  room('ud0',box(40,18).set(3,15,'T'));const N=playState('ud0',20*T,FL(18)-PH,{});run(N,3,I());N.items.undo=1;N.undo.demo=1;const e2=run(N,U.UDEMO.wait+3,I({r:1}));
  ok(N.undo.demo===0&&!e2.includes('undo_start'),'nothing gives way under him: the demo times out quietly (no rewind)');
  const A=playState('ud0',20*T,FL(18)-PH-30,{});A.items.undo=1;A.undo.demo=1;const e3=run(A,U.UDEMO.wait+40,I());
  ok(A.undo.demo===0&&!e3.includes('undo_start'),'picked up in mid-jump: the landing is not taken for a collapse');
  // with A2's real shard steps (Q): a stair of them under the item (he walks onto the first ones just before it)
  const q=box(40,18);q.fill(1,12,39,12,'#').fill(12,12,17,12,'Q').set(14,11,'I').set(3,11,'T');room('udq',q,[{at:[14,11],item:'undo'}]);
  const dq=demo('udq',null);
  if(dq.drop>=T)ok(dq.ev.includes('undo_start')&&dq.back===dq.first,`real Q steps: they collapse under him (${dq.drop.toFixed(0)} px drop), the demo rewinds to the pickup frame, the steps are back`);
  else console.log(`  (pending) real Q steps did not collapse under him in this room (drop ${dq.drop.toFixed(0)} px): crystals.js's shard timer`);
}

console.log('11. engine wiring');
{ ok(E.keyOf('KeyL')==='z'&&E.keyOf('KeyZ')==='z'&&E.keyOf('KeyM')===undefined,'L and Z are Undo; M stays free (map)');
  const S=playState('u1',6*T,FL(18)-PH,{});ok(!('rewind' in E.fxLevels(S)),'fxLevels: no rewind key before he owns Undo');
  S.items.undo=1;run(S,40,MOVE);ok(E.fxLevels(S).rewind===0,'owned: rewind 0');E.step(S,I({z:1,zp:1}),[]);ok(S.undo.on===1&&E.fxLevels(S).rewind===1,'while the world runs back: rewind 1');
  const fs=await import('node:fs'),src=fs.readFileSync(new URL('engine.js',G),'utf8');
  ok(/data-k="z" aria-label="Undo" hidden/.test(src)&&/undoB\.hidden=h/.test(src)&&/z:px\(/.test(src),'the band has an Undo button with its own pictogram, hidden until he owns it');
  ok(/grant\(k,v\)\{[^\n]*k==='undo'/.test(src)&&/data-i="undo"/.test(fs.readFileSync(new URL('dev/panel.js',G),'utf8')),'the dev panel grants undo');
  ok(/onEvent\('item'|emit\('item',\{name:k\}\)/.test(src),'the OS hears the pickup through the existing item event');
  // sitting on a perch: the key stands him up (no hush or perch camera kept through a rewind)
  room('upr',box(30,18).set(12,15,'B').set(3,15,'T'));const Pr=playState('upr',8*T,FL(18)-PH,{undo:1});run(Pr,40,I({r:1}));Pr.p.x=12*T+T/2-PW/2;Pr.p.vx=0;
  run(Pr,120,I());const sat=Pr.sit>0;const es=run(Pr,1,I({z:1,zp:1}));
  ok(sat&&Pr.undo.on===1&&Pr.sit===0&&Pr.still===0&&es.includes('stand'),`sitting on a perch, Undo stands him up (sat ${sat}, then stand)`);
  // the demo blocks: no rewind during the seed's or the board's pickup demo
  const B2=playState('u1',6*T,FL(18)-PH,{undo:1,board:1});run(B2,40,MOVE);B2.p.bd=1;const eb=run(B2,1,I({z:1,zp:1}));ok(!eb.includes('undo_start'),'no rewind while the board\'s pickup demo runs');
}

console.log('12. the per-frame copy cost (phone budget)');
{ // a busy Crystals-like frame: 8 enemies, 2 vines, roots, a dozen drilled tiles, S.cr with 40 shard steps, 6 platform
  // phases, 4 receiver rings and 6 lens states (more than any planned room)
  const S=playState('u1',6*T,FL(18)-PH,{root:1,undo:1,claws:1});run(S,60,MOVE);
  for(let i=0;i<7;i++)S.ens.push({...S.ens[0],x:100+i*30});
  S.vines=[{x:12,y:100,w:10,h:51,t:100,s:-1,fx:12,by:150,max:48,len:48},{x:600,y:60,w:10,h:51,t:30,s:1,fx:600,by:110,max:48,len:20}];
  S.roots=[{x:80,y:180,t:12,g:3,hit:[0]}];S.drilled=Array.from({length:12},(_,i)=>[30+i,8]);
  S.cr={q:Object.fromEntries(Array.from({length:40},(_,i)=>[`${i},14`,i*3])),plat:Array.from({length:6},(_,i)=>({t:i*17,d:1})),rx:{'5,5':12,'9,5':0,'20,3':29,'30,7':4},lens:[1,1,0,1,1,1]};
  S.echo={on:1,log:Array.from({length:3*900},(_,i)=>i%7),i:0};   /* 15 s of Echo log: anchored, never copied */
  const fr=frameOf(S),bytes=Buffer.byteLength(fr);
  const N=20000;for(let i=0;i<2000;i++)U.undoRecord(S);   /* warm up */
  let t0=process.hrtime.bigint();for(let i=0;i<N;i++)U.undoRecord(S);const rec=Number(process.hrtime.bigint()-t0)/1e6/N;
  t0=process.hrtime.bigint();for(let i=0;i<N;i++)JSON.parse(fr);const par=Number(process.hrtime.bigint()-t0)/1e6/N;
  t0=process.hrtime.bigint();for(let i=0;i<2000;i++)snapshot(S);const snap=Number(process.hrtime.bigint()-t0)/1e6/2000;
  const P0=playState('u1',6*T,FL(18)-PH,{root:1,undo:1});run(P0,200,MOVE);const plain=Buffer.byteLength(frameOf(P0));
  const st0=playState('u1',6*T,FL(18)-PH,{root:1}),st1=playState('u1',6*T,FL(18)-PH,{root:1,undo:1});
  t0=process.hrtime.bigint();run(st0,3000,MOVE);const live0=Number(process.hrtime.bigint()-t0)/1e6/3000;
  t0=process.hrtime.bigint();run(st1,3000,MOVE);const live1=Number(process.hrtime.bigint()-t0)/1e6/3000;
  console.log(`      a busy frame: ${bytes} bytes (a plain room's frame: ${plain} bytes); buffer of ${UNDO.len+1}: ${((bytes*(UNDO.len+1))/1024).toFixed(0)} KB (plain ${((plain*(UNDO.len+1))/1024).toFixed(0)} KB)`);
  console.log(`      record (one stringify): ${(rec*1000).toFixed(1)} us/frame; a rewind step (2 parses): ${(2*par*1000).toFixed(1)} us; a full snapshot(S) for comparison: ${(snap*1000).toFixed(1)} us`);
  console.log(`      the whole step in u1: ${(live0*1000).toFixed(1)} us without Undo, ${(live1*1000).toFixed(1)} us with it (node, this machine; a phone is ~5-10x slower)`);
  ok(rec<0.2&&bytes<12000,`the copy is cheap: ${rec.toFixed(4)} ms and ${bytes} bytes per frame for a busy room (budget 16.7 ms a frame)`);
}

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails?1:0);
