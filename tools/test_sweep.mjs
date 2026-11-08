// The Crystals delete sweep (agent A5, 2026-11-07): game/sweep.js (kind 'sweep') through game/chases.js. A synthetic tower
// of 10 stacked 40x19 rooms with a shaft through every floor and a safe room under it, so it does not depend on the Crystals
// room files. Start and beat, rate and stretches, touching the front, the restart gap, Assist, the safe line, deleted() and
// the engine's solid(), Undo's clamp (the real sweepClamp), saves, progress and nearness, events, determinism.
// Contract: ~/.claude/plans/wake-up-crystals-beat-sheet.md sections 3 and 7. Plain node, no deps: node tools/test_sweep.mjs
const G=new URL('../game/',import.meta.url).href;
const {T,newState,snapshot,persist,resume}=await import(G+'state.js');
const E=await import(G+'engine.js');
const {ROOMS,ORDER,CHASES,parse}=await import(G+'rooms/index.js');
const P=await import(G+'player.js');
const CH=await import(G+'chases.js');
const SW=await import(G+'sweep.js');
const U=await import(G+'undo.js');
await U.undoReady;
const fs=await import('node:fs');
let fails=0,passes=0;
const ok=(c,msg)=>{if(c){passes++;console.log('  ok  ',msg)}else{fails++;console.log('  FAIL',msg)}};
const note=msg=>console.log('  ..  ',msg);
const I=(o={})=>({l:0,r:0,u:0,d:0,j:0,jp:0,b:0,bp:0,z:0,zp:0,drag:null,any:0,...o});
const J=JSON.stringify,{PW,PH}=P,{SWEEP,SWEEP_EV}=SW;
const near=(a,b,e=1e-9)=>Math.abs(a-b)<=e;

/* ---------- the synthetic tower: tw0 (top) .. tw9, then twS (the safe room); 40 x 19 each, stacked at world x 30000 ---------- */
const X0=30000,Y0=40000,W=40,H=19,N=10,SH=[18,19,20,21];   /* SH: the shaft's columns */
function tower(){
  for(let i=0;i<=N;i++){
    const g=Array.from({length:H},(_,y)=>[...(y===0||y>=H-2?'#'.repeat(W):'#'+'.'.repeat(W-2)+'#')]);
    if(i>0)for(const x of SH)g[0][x]='.';            /* open to the room above */
    if(i<N)for(const x of SH){g[H-2][x]='.';g[H-1][x]='.'}   /* open to the room below (the safe room's floor is whole) */
    g[H-3][5]='T';                                   /* a torch on each floor, away from the shaft */
    const id=i<N?'tw'+i:'twS';ROOMS[id]=parse({id,name:id,biome:'crystals',at:[X0,Y0+i*H],grid:g.map(r=>r.join('')),ents:[]});
    if(!ORDER.includes(id))ORDER.push(id);
  }
}
tower();
const FROM=Y0*T,END=(Y0+N*H+H-2)*T;   /* the top of tw0; the safe room's floor */
const MID=(Y0+5*H)*T;                 /* a stretch starts at tw5's top */
CHASES.tsw={kind:'sweep',from:FROM,end:END,beat:60,rate:1.2,gap:180,path:[[FROM,1.2],[MID,2],[END]]};
const C=CHASES.tsw;
const torchOf=i=>({room:'tw'+i,tx:5,ty:H-3});
const torchY=i=>(Y0+i*H+H-3)*T;
function playState(room,x,y,it={}){const S=newState();Object.assign(S,{lit:1,litT:60,match:1,mode:'play'});Object.assign(S.items,it);E.enterRoom(S,room,{x,y});if(it.root)S.p.root=1;return S}
const atTorch=(i,it)=>{const S=playState('tw'+i,0,0,it),sp=E.spot(S,ROOMS['tw'+i],5,H-3);S.p.x=sp.x;S.p.y=sp.y;S.cp=torchOf(i);return S};
const wy=S=>ROOMS[S.room].at[1]*T+S.p.y;
const shaftX=SH[0]*T+(SH.length*T-PW)/2;

console.log('1. constants agree with chases.js and undo.js');
ok(SWEEP.assist===CH.ASSIST_SPEED&&SWEEP.agap===CH.ASSIST_GAP&&SWEEP.wither===CH.WITHER&&SWEEP.rest===CH.REST,`Assist ${SWEEP.assist} and gap x${SWEEP.agap}, wither ${SWEEP.wither}, rest ${SWEEP.rest}: the same as the other chases`);
ok(SWEEP.above===U.UNDO.above,`the clamp's margin is undo.js's UNDO.above (${U.UNDO.above} px)`);
ok(J(Object.values(SWEEP_EV))===J(['chase_start','chase_done','sweep_rumble','sweep_edge']),'the events live in one place: SWEEP_EV');
{ const src=fs.readFileSync(new URL('sweep.js',G),'utf8');
  ok(!/Math\.random|Date\.now|performance\.now|new Date/.test(src),'sweep.js uses no randomness and no clock');
  ok(!/from '\.\/(engine|chases|undo|player)\.js'/.test(src),'sweep.js is a leaf (state.js and rooms/index.js only)');
}

console.log('2. start and the beat');
{ const S=atTorch(0),ev=[];CH.startChase(S,'tsw',ev);
  ok(ev.includes('chase_start')&&S.chase.id==='tsw'&&S.chase.on===1&&S.chase.y===FROM&&S.chase.t===-60&&S.chase.w===0,`startChase: {id,on:1,y:${FROM} (from),t:-60,w:0}, 'chase_start'`);
  ok(Number.isFinite(S.chase.x),'it carries a finite x (so state.js persist/resume keep it)');
  let moved=-1,rum=[];for(let i=1;i<=80;i++){const e=[];const y0=S.chase.y;CH.stepChase(S,e);if(moved<0&&S.chase.y!==y0)moved=i;if(e.includes('sweep_rumble'))rum.push(i)}
  ok(moved===61,`it waits its 60-frame beat at from, then moves (first moved on frame ${moved})`);
  ok(J(rum)==='[61]',`'sweep_rumble' once, as it first moves (frames ${J(rum)})`);
  ok(near(S.chase.y,FROM+20*1.2),`then ${C.rate} px a frame (${(S.chase.y-FROM).toFixed(2)} px after 20 moving frames)`);
  ok(CH.nearness(S)===SW.nearSweep(S)&&CH.progress(S)===SW.progressSweep(S),'chases.js nearness() and progress() hand the sweep to sweep.js');
}

console.log('3. rate and stretches');
{ ok(SW.speedAt(C,FROM)===1.2&&SW.speedAt(C,MID-1)===1.2&&SW.speedAt(C,MID)===2&&SW.speedAt(C,END)===2,'speedAt: 1.2 above tw5, 2 from its top on');
  ok(SW.speedAt({rate:.9},FROM)===.9&&SW.speedAt({},0)===SWEEP.rate,'no path: the entry\'s rate, else SWEEP.rate');
  const S=atTorch(9),ev=[];CH.startChase(S,'tsw',ev);S.chase.y=MID-1;S.chase.t=5;CH.stepChase(S,[]);ok(near(S.chase.y,MID+.2),'a frame that starts above the stretch moves at the old speed');
  CH.stepChase(S,[]);ok(near(S.chase.y,MID+2.2),'the next at the new one');
  S.chase.y=END-1;CH.stepChase(S,[]);ok(S.chase.y===END,'it never passes the safe line');
}

console.log('4. touching the front');
{ const S=atTorch(0);E.step(S,I(),[]);CH.startChase(S,'tsw',[]);
  const bot=wy(S)+PH,R=ROOMS.tw0,fty=H-2;   /* his floor's tile row */
  let die=-1,before=null,floorAt=null,yAt=null;
  for(let i=1;i<=400&&die<0;i++){const s=snapshot(S),ev=E.step(S,I(),[]);if(ev.includes('die')){die=i;before=s;yAt=S.chase.y}}
  const want=60+Math.floor((bot+SWEEP.touch-FROM)/1.2)+1;
  ok(die>0&&Math.abs(die-want)<=1&&S.flash==='chase',`standing still on tw0's floor he glitches out (frame ${die}, front ${(yAt-bot).toFixed(2)} px past his box bottom; predicted ~${want})`);
  ok(before&&!SW.gone(before,R,fty)&&E.solid(before,R,5,fty),'on the frame before, the floor under his feet is still there (no free escape through it)');
  ok(before&&SW.gone(before,R,fty-2),'...while the tiles above his head are gone');
  ok(yAt-bot>SWEEP.touch&&yAt-bot<=SWEEP.touch+1.2+1e-9,`he dies when his box bottom is ${SWEEP.touch} px beyond the front, inside the band`);
  const y=S.chase.y;for(let i=0;i<10;i++)E.step(S,I(),[]);ok(S.chase.y===y||S.chase.t<=0,'the front waits while he glitches out');
}

console.log('5. the restart after a death');
{ const S=atTorch(0);CH.startChase(S,'tsw',[]);S.chase.y=wy(S)+PH+10;S.chase.t=100;
  let ev=[];for(let i=0;i<40&&!ev.includes('rez');i++)ev=E.step(S,I(),[]);
  ok(ev.includes('rez')&&S.room==='tw0','he comes back at his torch in tw0');
  const want=Math.max(FROM,torchY(0)-C.gap);
  ok(S.chase.on===1&&near(S.chase.y,want)&&S.chase.t===-SWEEP.rest,`the front restarts ${C.gap} px above his torch, never above from (y ${S.chase.y-FROM} px under from; t ${S.chase.t})`);
  const S5=atTorch(5);CH.startChase(S5,'tsw',[]);S5.chase.y=torchY(5)+50;S5.chase.t=500;CH.resetChase(S5);
  ok(near(S5.chase.y,torchY(5)-C.gap)&&S5.chase.t===-SWEEP.rest,`from tw5's torch: ${C.gap} px above it, after a ${SWEEP.rest}-frame rest (front behind it again: it moves back up)`);
  ok(wy(S5)+PH+SWEEP.touch<S5.chase.y===false&&wy(S5)-S5.chase.y>=C.gap-PH,'a fresh respawn is never inside the front');
  const S9=atTorch(0);CH.startChase(S9,'tsw',[]);C.gap=5000;CH.resetChase(S9);ok(S9.chase.y===FROM,'a gap reaching above the tower clamps to from');C.gap=180;
  C.at={'tw3:5,16':FROM+999};const S3=atTorch(3);CH.startChase(S3,'tsw',[]);CH.resetChase(S3);ok(S3.chase.y===FROM+999,'`at` pins a torch\'s restart y');delete C.at;
  const Sn=atTorch(2);Sn.cp=null;CH.startChase(Sn,'tsw',[]);Sn.chase.y=MID;CH.resetChase(Sn);ok(Sn.chase.y===FROM,'no torch: from');
  /* the front that killed him is still below his torch's rows when he comes back: he must stand where spot() puts him with no chase, not at the room's floor */
  for(const k of [3,6]){const Sd=atTorch(k);const R3=ROOMS['tw'+k],t=R3.torches[0];CH.startChase(Sd,'tsw',[]);
    const wantAt=(()=>{const c=Sd.chase;Sd.chase=null;const q=E.spot(Sd,R3,t.tx,t.ty);Sd.chase=c;return q})();
    Sd.chase.y=torchY(k)+PH+40;Sd.chase.t=100;Sd.p.dead=1;Sd.p.gl=1;let e2=[];for(let i=0;i<5&&!e2.includes('rez');i++)e2=E.step(Sd,I(),[]);
    ok(e2.includes('rez')&&Sd.room==='tw'+k&&near(Sd.p.x,wantAt.x,1)&&near(Sd.p.y,wantAt.y,1),`tw${k}: after a death with the front below his torch he is placed on the torch (${Sd.p.x.toFixed(0)},${Sd.p.y.toFixed(0)}; want ${wantAt.x.toFixed(0)},${wantAt.y.toFixed(0)}), not at the room's floor`)}
}

console.log('6. Assist');
{ const S=atTorch(0);S.assist=1;CH.startChase(S,'tsw',[]);for(let i=0;i<60+20;i++)CH.stepChase(S,[]);
  ok(near(S.chase.y,FROM+20*1.2*.7),`70% speed (${(S.chase.y-FROM).toFixed(2)} px in 20 moving frames)`);
  const A=atTorch(5);A.assist=1;CH.startChase(A,'tsw',[]);CH.resetChase(A);
  ok(near(A.chase.y,torchY(5)-C.gap*1.5),`a gap half again as wide (${torchY(5)-A.chase.y} px)`);
  ok(J(ROOMS.tw5.g)===J(parse({id:'x',name:'x',biome:'crystals',at:[0,0],grid:ROOMS.tw5.g,ents:[]}).g),'no layout change');
}

console.log('7. the safe line: a fall down the shaft');
{ const run1=as=>{const S=playState('tw0',shaftX,(H-3)*T-PH,{});S.assist=as;S.cp=torchOf(0);E.step(S,I(),[]);const ev0=[];CH.startChase(S,'tsw',ev0);
    const evs=[...ev0];let n=0,lead=1e9,dead=0;for(;n<3000&&S.chase&&S.chase.on;n++){const e=E.step(S,I(),[]);evs.push(...e);if(e.includes('die'))dead++;if(S.chase&&S.chase.on)lead=Math.min(lead,wy(S)-S.chase.y)}
    return {S,evs,n,lead,dead}};
  const r=run1(0);
  ok(r.S.room==='twS'&&!r.dead&&r.evs.includes('chase_done')&&r.S.chase&&r.S.chase.on===0,`he falls through all 10 rooms into the safe room; 'chase_done' (${r.n} frames, closest ${r.lead.toFixed(0)} px under the front)`);
  ok(near(wy(r.S)+PH,END),'chase_done as his box bottom reaches the safe line (the floor)');
  const edges=r.evs.filter(e=>e==='sweep_edge').length;ok(edges>=1,`'sweep_edge' while it dissolves the rows over him (${edges} in the run)`);
  let k=0;while(r.S.chase&&k<100){E.step(r.S,I(),[]);k++}ok(!r.S.chase&&k===SWEEP.wither,`outrun, it lingers ${k} frames then is gone`);
  const ra=run1(1);ok(ra.S.room==='twS'&&!ra.dead&&ra.evs.includes('chase_done'),`with Assist too (${ra.n} frames, closest ${ra.lead.toFixed(0)} px)`);
  const a=run1(0),b=run1(0);ok(J(a.S)===J(b.S)&&J(a.evs)===J(b.evs),'deterministic: two runs give the same world and events');
  note(`free fall through the synthetic tower: ${r.n} frames (${(r.n/60).toFixed(1)} s); the front at ${C.rate} px/frame would need ${((END-FROM)/C.rate/60).toFixed(1)} s`);
}

console.log('8. sweep_edge as the front crosses a room');
{ const S=atTorch(9);CH.startChase(S,'tsw',[]);S.p.x=shaftX;S.chase.t=1;S.chase.m=1;S.chase.y=(Y0+H)*T-.5;const e=[];CH.stepChase(S,e);
  ok(e.includes('sweep_edge'),'crossing from tw0 into tw1 at his column');
  const e2=[];S.chase.t=2;CH.stepChase(S,e2);ok(!e2.includes('sweep_edge'),'not on the next frame in the same room');
  let cnt=0;for(let i=0;i<90;i++){const q=[];CH.stepChase(S,q);if(q.includes('sweep_edge'))cnt++}ok(cnt===2,`every ${SWEEP.edge} moving frames while its row holds tiles (${cnt} in 90)`);
}

console.log('9. deleted() and the engine\'s solid()');
{ const S=atTorch(3);CH.startChase(S,'tsw',[]);S.chase.y=FROM+100;const R=ROOMS.tw0;
  ok(SW.deleted(S,FROM+99.9)&&!SW.deleted(S,FROM+100)&&!SW.deleted(S,FROM+200),'deleted(S,wy): above the front only');
  ok(SW.gone(S,R,7)&&!SW.gone(S,R,8)&&!SW.gone(S,R,9),'gone(S,R,ty): a tile goes once its bottom pixel row is above the front (y 100: rows 0..7)');
  const off=s=>{const Q=snapshot(S);Object.assign(Q,s);return Q};
  ok(!SW.deleted(off({chase:null}),0)&&!SW.deleted(off({chase:{...S.chase,on:0}}),FROM)&&!SW.deleted(off({chase:{id:'flood',on:1,x:0,y:1e12,t:0,w:0}}),FROM),'nothing is deleted with no chase, an outrun one, or a flood tide with a y');
  if(/gone\(S,R,ty\)/.test(fs.readFileSync(new URL('engine.js',G),'utf8'))){
    ok(!E.solid(S,R,0,5)&&E.solid(S,R,0,9)&&!E.solid(S,R,5,7),'engine solid(): the wall above the front is gone, below it stays');
    const Q=atTorch(0);CH.startChase(Q,'tsw',[]);Q.chase.y=wy(Q)+PH+2;Q.chase.t=10;for(let i=0;i<3;i++)E.step(Q,I(),[]);
    ok(Q.p.dead||Q.p.ground,'his floor holds until he dies (no fall through on the touching frame)');
  }else note('engine.js solid() has no sweep hook yet (A1): only deleted()/gone() checked');
}

console.log('10. Undo: the real sweepClamp');
{ ok(U.clampSource()==='sweep.js','undo.js runs sweep.js\'s sweepClamp, not its fallback');
  const S=atTorch(3);CH.startChase(S,'tsw',[]);const top=wy(S);
  S.chase.y=top-60.5;ok(SW.sweepClamp(S)===false,'box top 60.5 px under the front: no clamp');
  S.chase.y=top-59.5;ok(SW.sweepClamp(S)===true,'59.5 px: clamp');
  S.chase.on=0;ok(SW.sweepClamp(S)===false,'an outrun sweep never clamps');S.chase.on=1;
  S.chase.id='roots';ok(SW.sweepClamp(S)===false,'another kind never clamps');S.chase.id='tsw';
  S.chase.y=NaN;ok(SW.sweepClamp(S)===false,'a front with no y never clamps');
  ok(SW.sweepClamp({chase:{id:'tsw',on:1,y:0},room:'tw0',p:{y:-1e7}})===U.clampFallback({chase:{id:'tsw',on:1,y:0},room:'tw0',p:{y:-1e7}}),'the same rule as undo.js\'s fallback');
  // a real hold: he hops on tw3's floor for 100 frames, then the front comes within reach of his hop's top
  const Q=atTorch(3,{undo:1});const hop=i=>I({j:i%50<20,jp:i%50===0});for(let i=0;i<120;i++)E.step(Q,hop(i),[]);
  for(let i=0;i<5;i++)E.step(Q,I(),[]);   /* standing */
  const fy=wy(Q);CH.startChase(Q,'tsw',[]);Q.chase.y=fy-70;Q.chase.t=1;Q.chase.m=1;
  let n=0,good=true,mono=true;for(let k=0;k<95;k++){const y0=Q.chase.y,ev=E.step(Q,I({z:1,zp:k===0}),[]);if(!Q.undo.on)break;n++;if(wy(Q)<y0+SWEEP.above)good=false;if(Q.chase.y<y0)mono=false}
  ok(n>0&&good,`a rewind (${n} steps) never puts his box top less than ${SWEEP.above} px under the front`);
  ok(mono&&Q.chase.y>fy-70,'the front is anchored: it kept moving down through the rewind');
  ok(Q.undo.lock===1&&Q.undo.buf.length>1,'the clamp ended the hold before the buffer\'s start');
}

console.log('11. saves');
{ const S=atTorch(5);S.torches['tw5:5,16']=1;CH.startChase(S,'tsw',[]);S.chase.y=torchY(5)+30;S.chase.t=900;
  const d=JSON.parse(J(persist(S)));ok(d.chase&&d.chase.id==='tsw'&&d.chase.on===1,'a sweep saved mid-run is in the save');
  const R=newState();resume(R,d);ok(R.chase&&R.chase.id==='tsw','...and survives resume()');
  E.enterRoom(R,R.cp.room,E.spot(R,ROOMS[R.cp.room],R.cp.tx,R.cp.ty));CH.resetChase(R);   /* as mount() does */
  ok(near(R.chase.y,torchY(5)-C.gap)&&R.chase.t===-SWEEP.rest&&R.chase.on===1,`on reload it restarts ${C.gap} px above his torch, after a rest`);
  for(let i=0;i<30;i++)E.step(R,I(),[]);ok(R.chase&&R.chase.on&&!R.p.dead&&R.chase.y>torchY(5)-C.gap,'and runs on');
  const B=atTorch(5);B.chase={id:'tsw',on:1,t:0,w:0};CH.stepChase(B,[]);
  ok(B.chase&&near(B.chase.y,torchY(5)-C.gap),'a sweep with no front y (an older save) restarts behind his torch, never NaN');
}

console.log('12. progress and nearness');
{ const S=atTorch(5);CH.startChase(S,'tsw',[]);const top=wy(S);
  ok(CH.progress(S)===0,'progress 0 at from');S.chase.y=(FROM+END)/2;ok(near(CH.progress(S),.5),'.5 halfway to the safe line');S.chase.y=END;ok(CH.progress(S)===1,'1 at the safe line');
  S.chase.on=0;ok(CH.progress(S)===0&&CH.nearness(S)===0,'0 for both once outrun');S.chase.on=1;
  S.chase.y=top-300;ok(CH.nearness(S)===0,'nearness 0 with the front 300 px over his head');
  S.chase.y=top-100;ok(near(CH.nearness(S),.5),'.5 at 100 px');S.chase.y=top;ok(CH.nearness(S)===1,'1 on his head');
  const fx=E.fxLevels?E.fxLevels(S):null;if(fx&&'erase' in fx)ok(fx.erase===Math.round(CH.progress(S)*4)/4&&fx.shake===Math.round(CH.nearness(S)*4)/4,`fxLevels erase from progress (${fx.erase}) and shake from nearness (${fx.shake})`);else note('fxLevels has no erase key yet');
}

console.log('13. the real CHASES.crystals');
{ const K=CHASES.crystals;
  if(K){ok(K.kind==='sweep'&&K.from===-202*T&&Number.isFinite(K.rate)&&K.rate>0&&K.gap>SWEEP.above&&Number.isFinite(SW.endY(K)),`kind sweep, from ${K.from} (K10's top), rate ${K.rate}, gap ${K.gap}, end ${SW.endY(K)}`);
    ok(SW.endY(K)===(ROOMS.hub.at[1]+16)*T,'its safe line is the hub floor');}
  else note('CHASES.crystals not registered yet (A2)');
}

delete CHASES.tsw;
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails?1:0);
