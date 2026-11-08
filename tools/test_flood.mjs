// Flood (M3a) tests: the liquid sim, the board's dash and surf, the hermit crab, the clownfish, and scripted runs of
// f1 (Shallows) and f2 (Hermit Cove). Plain node, no deps: node tools/test_flood.mjs
const G=new URL('../game/',import.meta.url).href;
const {T,newState,snapshot,restore,persist,save,load,resume,VER}=await import(G+'state.js');
const E=await import(G+'engine.js');
const {ROOMS,parse}=await import(G+'rooms/index.js');
const P=await import(G+'player.js');
const L=await import(G+'liquid.js');
const B=await import(G+'board.js');
const F=await import(G+'fish.js');
let fails=0,passes=0;
const ok=(c,msg)=>{if(c){passes++;console.log('  ok  ',msg)}else{fails++;console.log('  FAIL',msg)}};
const I=(o={})=>({l:0,r:0,u:0,d:0,j:0,jp:0,b:0,bp:0,drag:null,any:0,...o});
const PH=P.PH,PW=P.PW;
function playState(room,x,y,items={}){const S=newState();Object.assign(S,{lit:1,litT:60,match:1,mode:'play'});Object.assign(S.items,items);E.enterRoom(S,room,{x,y});if(items.root)S.p.root=1;if(items.board)S.p.dc=1;return S}
const run=(S,n,f)=>{const evs=[];for(let i=0;i<n;i++)evs.push(...E.step(S,typeof f==='function'?f(i,S):f,[]));return evs};
const mem=()=>({d:{},getItem(k){return this.d[k]??null},setItem(k,v){this.d[k]=String(v)},removeItem(k){delete this.d[k]}});
/* a test pool: a floor at row 12 (top 144), deep water x 6..34 rows 12..15 flush with it */
const grid=['#'.repeat(46),...Array(11).fill('#'+'.'.repeat(44)+'#'),'######'+'~'.repeat(29)+'###########',...Array(3).fill('######'+'~'.repeat(29)+'###########'),'#'.repeat(46),'#'.repeat(46)];
grid[10]='#.T'+'.'.repeat(42)+'#';
ROOMS.tpool=parse({id:'tpool',name:'Test pool',biome:'flood',at:[4000,4000],grid,ents:[]});
ROOMS.tflow=parse({id:'tflow',name:'Test flow',biome:'flood',at:[4100,4000],grid,ents:[{at:[20,13],flow:-150}]});
const FLOOR=12*T;

console.log('liquid: the heightfield');
{ const S=playState('tpool',2*T,FLOOR-PH,{root:1});const Lq=S.liq;
  ok(Lq.s.length===1&&Lq.s[0].n===29*T/L.CW&&Object.keys(Lq.flow).length===0,`one surface of ${Lq.s[0].n} columns, no current`);
  L.disturb(Lq,20*T,FLOOR,4,16);const e0=L.energy(Lq);const es=[];for(let i=0;i<600;i++){L.stepLiquid(S,ROOMS.tpool,[]);if(i%60===59)es.push(L.energy(Lq))}
  ok(e0>0&&es.every((e,i)=>i===0?e<e0:e<=es[i-1]+1e-12),`a splash's energy dies away (${e0.toFixed(2)} -> ${es.map(e=>e.toFixed(3)).join(' ')})`);
  ok(es[es.length-1]===0,'...to exactly still water within 10 s');
  const spread=Lq.s[0];L.disturb(Lq,8*T,FLOOR,4,6);for(let i=0;i<40;i++)L.stepLiquid(S,ROOMS.tpool,[]);
  ok(Math.abs(spread.h[Math.round(4*T/L.CW)])>.01,'a ripple travels along the surface (it reaches 4 tiles away in 40 frames)');
  let nan=false,big=0;const S2=playState('tpool',2*T,FLOOR-PH,{root:1});for(let i=0;i<2000;i++){L.disturb(S2.liq,((i*37)%28+6)*T,FLOOR,(i%7)-3,(i%5)*4+2);L.stepLiquid(S2,ROOMS.tpool,[]);for(const s of S2.liq.s)for(let k=0;k<s.n;k++){if(!Number.isFinite(s.h[k])||!Number.isFinite(s.v[k]))nan=true;big=Math.max(big,Math.abs(s.h[k]))}}
  ok(!nan&&big<=9,`2000 frames of hard pokes: no NaN, the surface stays inside its clamp (max ${big.toFixed(2)} px)`);
  const F1=playState('tflow',2*T,FLOOR-PH);ok(Object.keys(F1.liq.flow).length===29*4&&Object.values(F1.liq.flow).every(v=>v===-1.5),'a flow ent sets its whole pool to that current (116 tiles at -1.5 px/frame)');
}
{ // determinism and snapshot/restore through the whole step, mascot splashing about
  const S=playState('tpool',2*T,FLOOR-PH,{root:1,board:1});run(S,3,I());
  const script=i=>I({r:i%200<150,l:i%200>=170,j:i%23<8,jp:i%23===0,bp:i%41===5});
  run(S,120,script);const snap=snapshot(S);run(S,800,script);const a=JSON.stringify(S);
  const S2=newState();restore(S2,JSON.parse(JSON.stringify(snap)));for(let i=0;i<800;i++)E.step(S2,script(i),[]);
  restore(S,snap);for(let i=0;i<800;i++)E.step(S,script(i),[]);
  ok(JSON.stringify(S)===a&&JSON.stringify(S2)===a,'same inputs from the same snapshot give the same world, water included, through a JSON round-trip');
  ok(snap.liq&&Array.isArray(snap.liq.s[0].h)&&snap.liq.s[0].h.some(h=>h!==0),'the snapshot carries the ripples (S.liq is plain arrays)');
  ok(!('liq' in persist(S)),'water is never saved (it resets on room entry)');
  E.enterRoom(S,'tpool',{x:2*T,y:FLOOR-PH});ok(S.liq.s[0].h.every(h=>h===0),'re-entering the room gives still water');
}
{ // the mascot disturbs the water: dropping in, wading, surfing
  const S=playState('tpool',20*T,FLOOR-PH-60);let ev=[];for(let i=0;i<60;i++)ev.push(...E.step(S,I(),[]));
  ok(ev.includes('splash')&&L.energy(S.liq)>0,'falling in splashes and ripples the surface');
}

console.log('swimming');
{ const S=playState('tpool',20*T,FLOOR-PH-40);run(S,300,I());
  const feet=S.p.y+PH-FLOOR;ok(!S.p.ground&&feet>10&&feet<22&&Math.abs(S.p.vy)<.05,`deep water floats him with his head out (feet ${feet.toFixed(1)} px under, still)`);
  const x0=S.p.x;run(S,60,I({r:1}));const v=(S.p.x-x0)/60;ok(v>.5&&v<1.1,`he swims slowly (${v.toFixed(2)} px/frame; running is ${P.FEEL.RUN})`);
  let out=-1;for(let i=0;i<400;i++){E.step(S,I({r:1,j:1,jp:i%15===0}),[]);if(S.p.ground&&S.p.y+PH<=FLOOR+.1&&S.p.x>34*T){out=i;break}}
  ok(out>=0,`a stroke beside a bank flush with the water climbs him out (${out} frames)`);
  const C=playState('tflow',30*T,FLOOR-PH-30);run(C,20,I());const c0=C.p.x;run(C,60,I());ok(C.p.x<c0-60,`a current carries him (${(C.p.x-c0).toFixed(0)} px in 1 s)`);
  const R1=playState('r1',34*T,192-PH);const b=snapshot(R1);run(R1,1,I());ok(R1.p.x===b.p.x&&R1.p.y===b.p.y,'no water: no change to standing in Roots');
}

console.log('the board: dash');
{ const S=playState('tpool',2*T,FLOOR-PH,{board:1});run(S,5,I());const x0=S.p.x;const ev=run(S,1,I({bp:1}));let n=1;while(S.p.dt>0){E.step(S,I(),[]);n++}
  const d=S.p.x-x0;ok(ev.includes('dash')&&d>=B.DASH.n*B.DASH.v-1&&d<=B.DASH.n*B.DASH.v+2,`a ground dash goes ${d.toFixed(1)} px (${(d/PW).toFixed(1)} of his widths) in ${n} frames`);
  const A=playState('tpool',2*T,FLOOR-PH,{board:1});run(A,5,I());run(A,1,I({j:1,jp:1}));run(A,6,I({j:1}));const y0=A.p.y,ea=run(A,1,I({bp:1}));let flat=true;for(let i=0;i<B.DASH.n-1;i++){E.step(A,I(),[]);if(Math.abs(A.p.y-y0)>.01)flat=false}
  ok(ea.includes('dash')&&flat,'in the air too, in a straight line (no gravity while it lasts)');
  run(A,4,I());const e2=run(A,1,I({bp:1}));ok(!e2.includes('dash')&&A.p.bo===1,'one per landing: a second air press does nothing, and the board stays out under him');
  let land=0;while(!A.p.ground&&land<200){E.step(A,I(),[]);land++}run(A,1,I());ok(A.p.bo===0&&A.p.dc===1,'landing puts the board away and recharges the dash');
  // buffered like the jump: pressed a few frames before landing, it fires on the ground
  for(const early of [2,5,6,9]){const D=playState('tpool',2*T,FLOOR-PH-40,{board:1});D.p.dc=0;const C=snapshot(D);let k=0;while(!C.p.ground&&k<200){E.step(C,I(),[]);k++}
    run(D,k-early,I());const evs=run(D,early+3,i=>I({bp:i===0?1:0}));ok(early<=B.DBUF?evs.includes('dash'):!evs.includes('dash'),`dash pressed ${early} frames before landing -> ${evs.includes('dash')?'dashes on landing':'nothing'}`)}
  const N=playState('tpool',2*T,FLOOR-PH);run(N,5,I());ok(!run(N,12,I({bp:1,b:1})).includes('dash'),'without the board, Shift does nothing');
  const H=playState('tpool',2*T,FLOOR-PH,{board:1});run(H,5,I());H.hit=3;E.step(H,I({bp:1}),[]);ok(run(H,4,I()).includes('dash'),'a dash pressed during hit-stop fires when it ends');
}

{ // a death mid-dash: nothing of the dash or the board carries over to the torch
  const S=playState('r1',12*T,192-PH-30,{board:1});S.ens=[];S.cp={room:'r1',tx:21,ty:14};let ev=[];for(let i=0;i<120&&!ev.includes('die');i++)ev=E.step(S,I({r:1}),[]);
  S.p.dt=5;S.p.dd=1;S.p.bo=1;S.p.surf=1;S.p.mo=2;S.p.db=3;let rz=[];for(let i=0;i<60&&!rz.includes('rez');i++)rz=E.step(S,I(),[]);const x0=S.p.x,evs=run(S,10,I());
  ok(rz.includes('rez')&&!evs.includes('dash')&&S.p.bo===0&&!S.p.surf&&Math.abs(S.p.x-x0)<.01,'respawned after a death mid-dash: no dash finishes, no board, no drift');
}
console.log('the board: surf');
{ const S=playState('tpool',3*T,FLOOR-PH,{board:1});run(S,5,I());let ev=[];for(let i=0;i<24;i++)ev.push(...E.step(S,I({r:1,bp:i===6?1:0}),[]));
  ok(ev.includes('dash')&&ev.includes('surf')&&S.p.surf===1,'dashing off the bank onto deep water: he lands on the board and surfs');
  ok(L.energy(S.liq)>1,'the landing makes a wave');
  const x0=S.p.x;run(S,60,I({r:1}));const v=(S.p.x-x0)/60;ok(Math.abs(v-B.SURF.v)<.05&&S.p.surf,`holding the way he goes keeps a steady ${v.toFixed(2)} px/frame (running: ${P.FEEL.RUN})`);
  ok(Math.abs(S.p.y+PH-FLOOR)<=3,`riding the line (feet ${(S.p.y+PH-FLOOR).toFixed(1)} px from rest)`);
  let n=0;while(S.p.surf&&n<400){E.step(S,I({r:1}),[]);n++}run(S,3,I({r:1}));ok(S.p.ground&&S.p.x>=34*T&&S.p.y+PH<=FLOOR+.1,`no distance cap: he surfs till the water ends and runs out onto the bank (${((S.p.x-x0)/T).toFixed(0)} tiles)`);
  const J=playState('tpool',3*T,FLOOR-PH,{board:1});run(J,5,I());for(let i=0;i<50;i++)E.step(J,I({r:1,bp:i===6?1:0}),[]);
  const ej=run(J,1,I({r:1,j:1,jp:1}));const vs=[];for(let i=0;i<28;i++){E.step(J,I({r:1,j:1}),[]);vs.push(J.p.vx)}
  ok(ej.includes('jump')&&!J.p.surf&&vs.every(v=>Math.abs(v-B.SURF.v)<.01),`jumping off keeps the speed in the air (${vs[0].toFixed(2)} .. ${vs[27].toFixed(2)})`);
  const K=playState('tpool',3*T,FLOOR-PH,{board:1});run(K,5,I());for(let i=0;i<40;i++)E.step(K,I({r:1,bp:i===6?1:0}),[]);let co=0;while(K.p.surf&&co<300){E.step(K,I(),[]);co++}
  ok(co>20&&co<120&&!K.p.surf&&K.p.bo===0,`letting go, the board coasts ${co} frames and sinks; he is swimming`);
  const Q=playState('tflow',3*T,FLOOR-PH,{board:1});run(Q,5,I());for(let i=0;i<60;i++)E.step(Q,I({r:1,bp:i===6?1:0}),[]);const q0=Q.p.x;run(Q,60,I({r:1}));const vq=(Q.p.x-q0)/60;
  ok(Q.p.surf&&vq>1.5&&vq<B.SURF.v-.5,`against a current he still surfs, slower (${vq.toFixed(2)} px/frame)`);
}

console.log('hermit crab');
{ const S=playState('f2',17*T,192-PH,{root:1,board:1});const c=S.ens.find(e=>e.k==='crab');run(S,3,I());
  ok(c&&c.soft&&!c.wrap,'f2 has a hermit crab');
  c.x=S.p.x+24;c.dir=-1;let ev=[];for(let i=0;i<80&&!ev.includes('pinch');i++)ev.push(...E.step(S,I(),[]));
  ok(ev.includes('pinch')&&!ev.includes('die')&&S.p.vx<-1,'walking into him, its pinch knocks him back, harmless');
  const D=playState('f2',14*T,192-PH,{root:1,board:1});const d=D.ens.find(e=>e.k==='crab');run(D,3,I());d.x=D.p.x+40;d.dir=-1;
  const er=run(D,20,i=>I({r:1,bp:i===0?1:0}));ok(er.includes('shell')&&d.wrap>0&&!er.includes('die'),'a board ram pulls it into its shell');
  const x0=d.x;run(D,60,I({r:1}));ok(d.x>x0+30&&D.p.x+PW<=d.x+1.01,`walking into the shell pushes it along, him behind it (${(d.x-x0).toFixed(0)} px in 1 s)`);
  const top=snapshot(D);top.p.x=d.x-1;top.p.y=d.y-PH-6;top.p.vy=0;top.p.ground=0;restore(D,top);const dd=D.ens.find(e=>e.k==='crab');run(D,12,I());ok(D.p.on>=0&&D.p.ground&&dd.wrap>0,'the shell is solid: he can stand on it');
  let n=0;while(dd.wrap>0&&n<400){E.step(D,I(),[]);n++}const ee=run(D,40,I());ok(ee.includes('emerge')||n<400,`it comes back out after ${((n+12+60)/60).toFixed(1)} s`);
  ok(!dd.wrap&&D.p.on<0,'and it is a crab again (not solid)');
  const R=playState('f2',14*T,192-PH,{root:1,board:1});const r=R.ens.find(e=>e.k==='crab');run(R,3,I());r.x=R.p.x+4;r.y=192-r.h;R.p.y-=40;R.roots.push({x:R.p.x+9,y:R.p.y+PH,t:0,g:0,hit:[]});run(R,8,I());
  ok(!r.wrap,'roots slide off its shell (only the board withdraws it)');
}
{ // outside its fence (its shell pushed onto the plate, then it climbs out), it walks home instead of flipping on the spot
  const S=playState('f2',10*T,192-PH,{root:1,board:1});const c=S.ens.find(e=>e.k==='crab');c.x=27*T;c.dir=1;let flips=0,d0=c.dir;const x0=c.x;
  for(let i=0;i<90;i++){E.step(S,I(),[]);if(c.dir!==d0){flips++;d0=c.dir}}ok(flips<=1&&c.x<x0-20,`a crab outside its fence walks back toward it (${flips} turn, ${(c.x-x0).toFixed(0)} px)`);
  const Q=playState('tpool',2*T,FLOOR-PH);Q.ens=[F.spawnFlood(ROOMS.tpool,{k:'C',tx:24,ty:13,left:8,right:15,dir:1})];const f=Q.ens[0];let ff=0,fd=f.dir;const fx=f.x;
  for(let i=0;i<90;i++){E.step(Q,I(),[]);if(f.dir!==fd){ff++;fd=f.dir}}ok(ff<=1&&f.x<fx-20,`a clownfish shoved past its fence swims back (${ff} turn, ${(f.x-fx).toFixed(0)} px)`);
}

console.log('clownfish');
{ /* a fish in the test pool, him floating beside it */
  const mk=()=>{const S=playState('tpool',18*T,FLOOR-PH+16,{root:1,board:1});S.ens=[F.spawnFlood(ROOMS.tpool,{k:'C',tx:21,ty:13,left:8,right:32})];run(S,30,I());return S};
  const S=mk(),f=S.ens[0];const knock=()=>{f.cd=0;f.x=S.p.x+PW-4;f.y=S.p.y+8;return run(S,1,I())};
  const k1=knock();ok(k1.includes('knock')&&!k1.includes('die')&&f.n===1&&f.m===0,'bumping it knocks him back, harmless; it puffs up (knock 1)');
  ok(Math.abs(S.p.vx)>2,`  ...he is pushed away (${S.p.vx.toFixed(1)} px/frame)`);
  run(S,50,I());knock();ok(f.n===2&&f.m===0,'knock 2: bigger and darker, still a clownfish');
  run(S,50,I());const k3=knock();ok(k3.includes('turn')&&f.m===1,'knock 3 turns it into the lantern piranha (a tell first)');
  const ev=[];let hit=-1,t0=S.t;for(let i=0;i<400;i++){ev.push(...E.step(S,I(),[]));if(ev.includes('die')&&hit<0){hit=S.t-t0;break}}
  ok(ev.includes('hunt')&&ev.includes('lunge')&&hit>0,`it chases and its chomp glitches him out (${(hit/60).toFixed(1)} s after the turn)`);
  // a miss: he climbs out; one chomp attempt, then it is a clownfish again with its count reset
  const M=mk(),g=M.ens[0];g.n=2;g.cd=0;g.x=M.p.x+PW-4;g.y=M.p.y+8;run(M,1,I());M.p.x=39*T;M.p.y=FLOOR-PH;M.p.vx=0;M.p.vy=0;
  const evm=[];for(let i=0;i<400&&g.m!==0;i++)evm.push(...E.step(M,I(),[]));
  ok(evm.includes('lunge')&&!evm.includes('die')&&g.m===0&&g.n===0&&evm.includes('calm'),'missed (he is on the bank): after its one chomp it is a clownfish again, count reset');
  // a ram sends a clownfish away without counting; the piranha cannot be pushed
  const Rm=playState('tpool',3*T,FLOOR-PH,{board:1});Rm.ens=[F.spawnFlood(ROOMS.tpool,{k:'C',tx:12,ty:12,left:8,right:32})];const h=Rm.ens[0];run(Rm,5,I());
  let er=[];for(let i=0;i<120&&!er.includes('ram');i++){er.push(...E.step(Rm,I({r:1,bp:i===4?1:0}),[]));h.y=12*T+1;h.cd=0;if(h.pv)break}
  ok(h.pv>0&&h.n===0&&!er.includes('knock'),`surfing or dashing into it, the board sends it away (no knock): shove ${h.pv.toFixed(1)}`);
  const Pr=playState('tpool',3*T,FLOOR-PH,{board:1});Pr.ens=[F.spawnFlood(ROOMS.tpool,{k:'C',tx:12,ty:12,left:8,right:32})];const pz=Pr.ens[0];run(Pr,5,I());pz.m=2;pz.t=999;
  const xs=[];for(let i=0;i<30;i++){E.step(Pr,I({r:1,bp:i===4?1:0}),[]);xs.push(pz.pv)}ok(xs.every(v=>v===0),'a ram cannot push the piranha');
  const A=mk();A.assist=1;const ga=A.ens[0];ga.n=2;ga.cd=0;ga.x=A.p.x+PW-4;ga.y=A.p.y+8;run(A,1,I());const tA=ga.t;
  const B0=mk();const gb=B0.ens[0];gb.n=2;gb.cd=0;gb.x=B0.p.x+PW-4;gb.y=B0.p.y+8;run(B0,1,I());run(A,FISH_RUN(),I());run(B0,FISH_RUN(),I());
  ok(JSON.stringify(ga)===JSON.stringify(gb),'Assist does not soften the piranha');
  const Re=playState('f2',35*T,192-PH,{root:1,board:1});const fz=Re.ens.find(e=>e.k==='fish');fz.n=2;E.enterRoom(Re,'f2',{x:35*T,y:192-PH});ok(Re.ens.find(e=>e.k==='fish').n===0,'leaving and re-entering the room resets its knock count');
}
function FISH_RUN(){return 90}

console.log('items, save');
{ const R=ROOMS.f1,it=R.items.find(i=>i.id==='board');ok(!!it,'Shallows holds the board (I tile, item:board)');
  const S=playState('f1',it.tx*T-30,192-PH,{root:1});run(S,3,I());const ev=run(S,60,I({r:1}));
  ok(S.items.board===1&&ev.includes('item')&&!S.p.demo,'walking into it picks up the board (no root demo plays)');
  const m=mem();save(S,m);const d=load(m);ok(d.v===VER&&VER>=4&&d.items.board===1,'the save carries the board (v4 and later)');
  for(const v of [1,2,3]){m.setItem('tos_game',JSON.stringify({v,lit:1,items:{root:1},pieces:[1,0,0,0],torches:{},cp:{room:'r1',tx:36,ty:14}}));const S3=resume(newState(),load(m));ok(S3.items.root===1&&S3.items.board===0,`a v${v} save still loads (no board)`)}
}

/* ---------------- the bot ---------------- */
const enc=(l,r,j,jp,b)=>(l?1:0)|(r?2:0)|(j?4:0)|(jp?8:0)|(b?16:0),dec=c=>I({l:c&1,r:(c>>1)&1,j:(c>>2)&1,jp:(c>>3)&1,bp:(c>>4)&1,b:(c>>4)&1});
const Bot={
  walk(S,rec,dir,done,max=900){for(let i=0;i<max;i++){if(done(S))return true;const c=enc(dir==='l',dir==='r',0,0,0),ev=E.step(S,dec(c),[]);rec.push(c);if(S.p.dead||ev.includes('die'))return false}return done(S)},
  /* try every plan: idle w frames, then hold dir for h frames with the jump pressed at frame j (0 = none) and held, a
     second press r frames after it (the root), the board at frame d (0 = none); won when he lands alive and target() holds */
  plan(S,rec,dir,target,{waits=[0],jumps=[0,1],roots=[0],dashes=[0],holds=[999],max=260,any=false}={}){
    for(const w of waits)for(const j of jumps)for(const r of roots)for(const d of dashes)for(const h of holds){
      const C=snapshot(S),out=[];let dead=false,won=false,air=false;
      for(let i=0;i<w&&!dead;i++){out.push(0);if(E.step(C,I(),[]).includes('die'))dead=true}
      for(let i=1;i<=max&&!dead;i++){const c=enc(dir==='l'&&i<h,dir==='r'&&i<h,j&&i>=j,i===j||(r&&i===j+r),i===d),ev=E.step(C,dec(c),[]);out.push(c);
        if(ev.includes('die')||C.p.dead){dead=true;break}if(any&&target(C)){won=true;break}if(!C.p.ground)air=true;else if(air&&target(C)){won=true;break}}
      if(won){restore(S,C);rec.push(...out);return true}
    }return false},
};
/* swim: hold dir and stroke every k frames until target() (he climbs out beside a low bank) */
Bot.swim=(S,rec,dir,target,max=1200,k=15)=>{for(let i=0;i<max;i++){if(target(S))return true;const c=enc(dir==='l',dir==='r',1,i%k===0,0),ev=E.step(S,dec(c),[]);rec.push(c);if(ev.includes('die'))return false}return target(S)};
const R20=Array.from({length:40},(_,i)=>i+1);

console.log('f1 Shallows');
{ const R=ROOMS.f1,U=ROOMS.b7;ok(R.biome==='flood'&&R.at[0]===U.at[0]+U.w&&R.at[1]+11===U.at[1]+1,`f1 joins Undertow's east edge, its west opening (rows 11-13) on Undertow's top lane (at ${R.at}; moved for the pre-board rooms)`);
  { const S=playState('b7',38*T,48-PH);run(S,3,I());const r=[];const won=Bot.plan(S,r,'r',S=>S.room==='f1',{jumps:R20.map(i=>i*5),max:400,any:true});
    ok(won&&S.room==='f1','walking east off Undertow\'s far ledge enters Shallows');
    const B2=playState('f1',4*T,192-PH);run(B2,3,I());ok(Bot.plan(B2,[],'l',S=>S.room==='b7',{jumps:R20.map(i=>i*5),max:400,any:true}),'...and back west, up the rock step, into Undertow');
    const D=newState();D.mode='dark';D.match=1;D.p.x=64*T;D.p.y=192-PH;run(D,300,I({r:1,j:1,jp:1}));ok(D.room==='hub','before the torch the dark hub still cannot be left east');}
  ok(R.spawns.length===0&&R.torches.length>=2,'no enemies in the teaching room; torches at both lessons');
}
const farFloor=S=>S.room==='f1'&&S.p.ground&&S.p.x+PW>26*T+2&&S.p.y+PH<=192.1&&S.p.x<30*T;
const shelf=S=>S.room==='f1'&&S.p.ground&&S.p.x>=50*T&&S.p.y+PH<=144.1;
function f1Run(S,rec){
  const L1=(n,f)=>{const r=f();if(!r)console.log('    f1 bot stuck at',n,S.room,S.p.x.toFixed(0),S.p.y.toFixed(0));return r};
  return L1('board',()=>Bot.walk(S,rec,'r',S=>S.items.board&&S.p.ground,400))&&
    L1('pit edge',()=>Bot.walk(S,rec,'r',S=>S.p.x+PW>=14*T-1,400))&&
    L1('dash gate',()=>Bot.plan(S,rec,'r',S=>S.p.surf,{jumps:[0,1],dashes:[1,2,3,4,6,8],any:true})&&Bot.plan(S,rec,'r',farFloor,{jumps:R20.map(i=>i*2),roots:[10,14,18,22,26,30],holds:[999],max:200}))&&
    L1('lane edge',()=>Bot.walk(S,rec,'r',S=>S.p.x+PW>=30*T-1,400))&&
    L1('surf lane',()=>Bot.plan(S,rec,'r',shelf,{jumps:Array.from({length:50},(_,i)=>60+i*3),roots:[0,14,18,22,26],dashes:[1,4],max:400}))&&
    L1('exit',()=>Bot.walk(S,rec,'r',S=>S.room==='f2',600));
}
{ const S=playState('f1',3*T,192-PH,{root:1});const rec=[],start=snapshot(S);
  ok(f1Run(S,rec),`with the board the bot crosses Shallows into Hermit Cove (${(rec.length/60).toFixed(1)} s of play)`);
  restore(S,start);let died=0;for(const c of rec)if(E.step(S,dec(c),[]).includes('die'))died++;ok(!died&&S.room==='f2'&&S.items.board,'replayed from the start: no deaths, board in hand, in f2');
}

/* the exhaustive no-board sweep: hold dir (always, or for h frames), press jump every k frames from frame 1 (0 = once),
   and one extra press at frame r (the root burst); any pattern that reaches target() is a leak */
function leak(S0,dir,target,{ks=[0,4,6,10,15,20,30],rs=[0,...Array.from({length:30},(_,i)=>i*2+2)],holds=[999,8,16,30],waits=[0],ds=[0],max=320}={}){
  for(const w of waits)for(const k of ks)for(const r of rs)for(const h of holds)for(const d of ds){   /* d: the board pressed at frame d (0 = never) */
    const C=snapshot(S0);let air=false;for(let i=0;i<w;i++)E.step(C,I(),[]);
    for(let i=1;i<=max;i++){const jp=(k?i%k===1||k===1:i===1)||i===r;E.step(C,I({l:dir==='l'&&i<h,r:dir==='r'&&i<h,j:1,jp,bp:i===d?1:0}),[]);
      if(C.p.dead)break;if(!C.p.ground)air=true;else if(air&&target(C))return {w,k,r,h,d}}}
  return null;
}
const at=(room,x,y,items)=>{const S=playState(room,x,y,items);run(S,4,I());return S};
const drop=(room,x,y,items)=>{const S=playState(room,x,y,items);run(S,200,I());return S};   /* fallen in, floating */
/* f1's dash pit: the stair up its west wall (a step of 1 off the bank, then 2 and 2 to the lip) and the bank, flush with
   the water so a swimmer climbs out onto it. Every cell he can stand on in the pit, each tile's west and east end */
const PIT_CELLS=[['the high step',14*T+.5,18*T-PH],['the high step edge',15*T-1,18*T-PH],['the low step',15*T+.5,20*T-PH],['the low step edge',16*T-1,20*T-PH],
  ['the bank',16*T+.5,21*T-PH],['the bank edge',17*T-1,21*T-PH]];
const PIT_WATER=[17,18,19,20,21,22,23,24,24.4];   /* tile x of drop points in its water (24.4: against the far wall) */
{ const RT={root:1};
  for(const x of [96,120,140,150]){const l=leak(at('f1',x,192-PH,RT),'r',farFloor);ok(!l,`f1 dash pit: no board, from the corridor at x ${x} jump + root never reach the far side${l?' LEAK '+JSON.stringify(l):''}`)}
  for(const [n,x,y] of PIT_CELLS){const l=leak(at('f1',x,y,RT),'r',farFloor);ok(!l,`f1 dash pit: no board, from ${n} in the pit the far side is out of reach${l?' LEAK '+JSON.stringify(l):''}`)}
  ok(PIT_CELLS.every(([,x,y])=>{const S=at('f1',x,y,{});return S.room==='f1'&&S.p.ground&&Math.abs(S.p.y-y)<.01&&Math.abs(S.p.x-x)<.01}),`every stand point in the pit (feet ${PIT_CELLS.map(c=>c[2]+PH).join(', ')}) starts grounded where it says`);
  ok(PIT_WATER.every(x=>{const S=drop('f1',x*T,19*T,{});return S.room==='f1'&&!S.p.ground&&S.p.y+PH>21*T&&S.p.x+PW<=26*T}),`every drop point in the pit (x ${PIT_WATER.join(', ')}) floats in its water`);
  for(const x of [18,22,24.4]){const l=leak(drop('f1',x*T,19*T,RT),'r',farFloor);ok(!l,`f1 dash pit: no board, swimming in the pit at x ${x} never climbs the far wall${l?' LEAK '+JSON.stringify(l):''}`)}
  { const S=drop('f1',19*T,19*T,{root:1,board:1}),r=[];
    const won=Bot.plan(S,r,'l',S=>S.p.ground&&S.p.x<17*T&&S.p.y+PH<=21*T+.1,{jumps:[0,1,...Array.from({length:30},(_,i)=>i*4+2)],max:400})&&Bot.walk(S,r,'l',S=>S.p.x<=16*T+1,60)&&
      Bot.plan(S,r,'r',S=>S.p.surf,{dashes:[1,2,3],any:true})&&Bot.plan(S,r,'r',farFloor,{jumps:R20.map(i=>i*2),roots:[10,14,18,22,26,30],max:200});
    ok(won,`f1 dash pit: a miss costs a few seconds: from the water he climbs onto the bank, dashes, surfs and jumps out (${(r.length/60).toFixed(1)} s)`)}
  for(const x of [26*T,28*T,29*T]){const l=leak(at('f1',x,192-PH,RT),'r',shelf);ok(!l,`f1 surf lane: no board, from the floor at x ${x/T} the shelf is out of reach${l?' LEAK '+JSON.stringify(l):''}`)}
  for(const x of [44,47,48]){const l=leak(drop('f1',x*T,14*T,RT),'r',shelf,{waits:[0,20]});ok(!l,`f1 surf lane: no board, swimming at x ${x} strokes + root never reach the shelf${l?' LEAK '+JSON.stringify(l):''}`)}
  { const S=drop('f1',40*T,14*T,RT),r=[];ok(Bot.plan(S,r,'l',S=>S.p.ground&&S.p.x+PW<=30*T+1&&S.p.y+PH<=192.1,{jumps:[0,...Array.from({length:40},(_,i)=>i*6+2)],max:900}),`f1 surf lane: a miss costs a swim back to the near floor (${(r.length/60).toFixed(1)} s)`)}
}
{ // no root: the board alone never climbs the far side (a surf jump rises about 3.4 tiles, the far rim is 5 up)
  const BD={board:1},DS=[0,1,4,8,15,30];
  for(const x of [96,120,150]){const l=leak(at('f1',x,192-PH,BD),'r',farFloor,{ds:DS});ok(!l,`no root: with the board, from the corridor at x ${x} the far side is out of reach${l?' LEAK '+JSON.stringify(l):''}`)}
  for(const [n,x,y] of PIT_CELLS){const l=leak(at('f1',x,y,BD),'r',farFloor,{ds:DS});ok(!l,`no root: with the board, from ${n} the far side is out of reach${l?' LEAK '+JSON.stringify(l):''}`)}
  for(const x of [18,22,24.4]){const l=leak(drop('f1',x*T,19*T,BD),'r',farFloor,{ds:DS,waits:[0,20]});ok(!l,`no root: with the board, from the water at x ${x} the far side is out of reach${l?' LEAK '+JSON.stringify(l):''}`)}
}
/* no items: fallen into the pit (walked in from the hub, open by design, with no root), he climbs the stair back to the
   corridor and leaves for the hub. Stages, each skipped when he already stands that high: the bank (out of the water),
   the low step, the high step, the corridor */
const feetY=S=>S.p.y+PH;
const OUT=[['the bank',S=>S.p.ground&&S.p.x<17*T&&feetY(S)<=21*T+.1],['the low step',S=>S.p.ground&&S.p.x<16*T&&feetY(S)<=20*T+.1],
  ['the high step',S=>S.p.ground&&S.p.x<15*T&&feetY(S)<=18*T+.1],['the corridor',S=>S.room==='f1'&&S.p.ground&&S.p.x+PW<=14*T+.5&&feetY(S)<=16*T+.1]];
function climbOut(S,rec){
  const L3=(n,f)=>{const r=f();if(!r)console.log('    pit bot stuck at',n,S.room,S.p.x.toFixed(0),S.p.y.toFixed(0));return r};
  if(!L3('the bank',()=>Bot.swim(S,rec,'l',OUT[0][1],1200)))return false;
  for(const [n,t] of OUT.slice(1))if(!t(S)&&!L3(n,()=>Bot.plan(S,rec,'l',t,{jumps:[1,2,4,6,8,12,16,20],max:200})))return false;
  return L3('Undertow',()=>Bot.plan(S,rec,'l',S=>S.room==='b7',{jumps:R20.map(i=>i*5),max:500,any:true}));
}
{ const NO={};
  for(const [n,x,y] of PIT_CELLS){const S=at('f1',x,y,NO),r=[];ok(climbOut(S,r)&&!S.items.root,`no items: from ${n} he climbs out of the pit and walks back west into Undertow (${(r.length/60).toFixed(1)} s)`)}
  for(const x of PIT_WATER){const S=drop('f1',x*T,19*T,NO),r=[];ok(climbOut(S,r),`no items: fallen into the water at x ${x}, he swims to the bank, climbs out and walks back west into Undertow (${(r.length/60).toFixed(1)} s)`)}
  for(const x of [18,22,24.4]){const S=drop('f1',x*T,19*T,{board:1}),r=[];ok(climbOut(S,r),`no root, board in hand: from the water at x ${x} he gets out the same way (${(r.length/60).toFixed(1)} s)`)}
  // a fresh player from Undertow (moved from the hub with the pre-board rooms): no root, he picks up the board on the way, then walks, jumps or dashes into the pit
  for(const how of ['walks','jumps','dashes']){
    const S=playState('b7',38*T,48-PH,NO);run(S,3,I());const r=[];
    const won=Bot.plan(S,r,'r',S=>S.room==='f1',{jumps:R20.map(i=>i*5),max:400,any:true})&&Bot.walk(S,r,'r',S=>S.p.x+PW>=14*T-1,600)&&
      (how==='walks'?Bot.walk(S,r,'r',S=>feetY(S)>16*T+6,120):Bot.plan(S,r,'r',S=>feetY(S)>16*T+6,{jumps:how==='jumps'?[1]:[0],dashes:how==='dashes'?[1]:[0],any:true}))&&
      Bot.walk(S,r,'',S=>S.p.ground||S.p.surf||S.liq.wet,200);
    ok(won&&S.items.board&&!S.items.root&&climbOut(S,r),`no root: a fresh player who ${how} into the pit from Undertow gets back out to Undertow (${(r.length/60).toFixed(1)} s)`);
  }
  { // no items at all: from Undertow he hops over the board, walks off the lip, and still gets out
    const S=playState('b7',38*T,48-PH,NO);run(S,3,I());const r=[];
    const won=Bot.plan(S,r,'r',S=>S.room==='f1',{jumps:R20.map(i=>i*5),max:400,any:true})&&Bot.walk(S,r,'r',S=>S.p.x+PW>=7*T,300)&&
      Bot.plan(S,r,'r',S=>S.p.x>9*T,{jumps:[1,2,4,6,8],max:120})&&Bot.walk(S,r,'r',S=>feetY(S)>16*T+6,300)&&Bot.walk(S,r,'',S=>S.p.ground||S.liq.wet,200);
    const bare=won&&!S.items.board&&!S.items.root;
    ok(bare&&climbOut(S,r),`no items: a player who hops the board and walks into the pit from Undertow gets back out to Undertow (${(r.length/60).toFixed(1)} s)`);
  }
}

console.log('f2 Hermit Cove');
const crabOf=S=>S.ens.find(e=>e.k==='crab'),fishOf=S=>S.ens.find(e=>e.k==='fish');
{ const R=ROOMS.f2;ok(R.at[0]===ROOMS.f1.at[0]+ROOMS.f1.w&&R.at[1]===ROOMS.f1.at[1],`f2 joins f1's east edge (at ${R.at})`);
  ok(R.spawns.some(s=>s.k==='H')&&R.spawns.some(s=>s.k==='C')&&R.plates.length===1&&R.gates.length===3,'a hermit crab, a clownfish, a plate and a 3-tile gate');
  ok(Object.keys(playState('f2',2*T,144-PH).liq.flow).length>0,'the cove pool flows (a current)');
}
function f2Run(S,rec){
  const L2=(n,f)=>{const r=f();if(!r)console.log('    f2 bot stuck at',n,S.room,S.p.x.toFixed(0),S.p.y.toFixed(0));return r};
  return L2('beach',()=>Bot.walk(S,rec,'r',S=>S.p.ground&&S.p.y+PH>=192-.1&&S.p.x>=11*T,400))&&
    L2('ram',()=>Bot.plan(S,rec,'r',S=>crabOf(S).wrap>0,{waits:Array.from({length:40},(_,i)=>i*6),dashes:[1,6,12,20,30],holds:[999,6,12],any:true,max:120}))&&
    L2('push',()=>Bot.walk(S,rec,'r',S=>S.gate>=.5,300))&&
    L2('hop',()=>Bot.plan(S,rec,'r',S=>S.p.ground&&S.p.on<0&&S.p.x>crabOf(S).x+14,{jumps:[1],max:120}))&&
    L2('gate',()=>Bot.walk(S,rec,'r',S=>S.latch.f2===1&&S.p.x>34*T,300))&&
    L2('pool edge',()=>Bot.walk(S,rec,'r',S=>S.p.x+PW>=36*T-1,200))&&
    L2('surf',()=>Bot.plan(S,rec,'r',S=>S.p.surf,{dashes:[1,2,3],any:true}))&&
    L2('far bank',()=>Bot.walk(S,rec,'r',S=>S.p.ground&&S.p.x>=52*T&&S.p.y+PH<=192.1,600))&&
    L2('torch',()=>Bot.walk(S,rec,'r',S=>S.cp&&S.cp.room==='f2'&&S.cp.tx===54,200));
}
{ const S=playState('f2',2*T,144-PH,{root:1,board:1});const rec=[],start=snapshot(S);
  ok(f2Run(S,rec),`with the board the bot rams the crab, pushes its shell onto the plate, passes the gate and surfs the current (${(rec.length/60).toFixed(1)} s)`);
  restore(S,start);let died=0;const evs={};for(const c of rec){const ev=E.step(S,dec(c),[]);for(const e of ev)evs[e]=(evs[e]||0)+1;if(ev.includes('die'))died++}
  ok(!died&&evs.shell>=1&&evs.latch===1&&S.cp.tx===54,'replayed: no deaths, one shell, the gate latched, at the far torch');
}
{ // without the board the crab never shells, so nothing holds the plate and the gate stays shut
  const past=S=>S.p.x>34*T;
  for(const x of [20,26,27,30]){const l=leak(at('f2',x*T,192-PH,{root:1}),'r',past,{waits:[0,60,150]});ok(!l,`f2: no board, from x ${x} he never gets past the gate${l?' LEAK '+JSON.stringify(l):''}`)}
  const S=at('f2',22*T,192-PH,{root:1});const c=crabOf(S);c.x=27*T-1;c.dir=1;c.fence=[26,28];run(S,200,I());ok(S.gate<.5,'a crab walking over the plate does not hold it (only its shell)');
}
{ // the way back west (after Flood is done, or a chase later): the shelf, the lane, the pit, to the board's hall
  const S=playState('f1',56*T,144-PH,{root:1,board:1});run(S,4,I());const r=[];
  const won=Bot.walk(S,r,'l',S=>!S.p.ground,200)&&Bot.walk(S,r,'',S=>S.p.ground||S.p.y+PH>13*T,200)&&Bot.swim(S,r,'l',S=>S.p.ground&&S.p.x<=29*T&&S.p.y+PH<=192.1)&&
    Bot.walk(S,r,'l',S=>S.p.x<=26*T+1,200)&&Bot.plan(S,r,'l',S=>S.p.surf,{dashes:[1,2,3],any:true})&&Bot.plan(S,r,'l',S=>S.p.ground&&S.p.x<14*T&&S.p.y+PH<=192.1,{jumps:R20.map(i=>i*2),roots:[10,14,18,22,26,30],max:200});
  ok(won,`f1 the way back west: drop from the shelf, cross the lane, dash and surf the pit, jump out (${(r.length/60).toFixed(1)} s)`);
}
{ // one whole run: Shallows from the hub side, the board, both lessons, Hermit Cove to its far torch
  const S=playState('f1',3*T,192-PH,{root:1});const rec=[],start=snapshot(S);
  const won=f1Run(S,rec)&&f2Run(S,rec);ok(won,`whole slice by script: f1 + f2 in ${(rec.length/60).toFixed(1)} s of bot play`);
  restore(S,start);let died=0;for(const c of rec)if(E.step(S,dec(c),[]).includes('die'))died++;ok(won&&!died&&S.room==='f2'&&S.cp.tx===54,'replayed exactly from the start, no deaths');
}

/* ---------------- the pre-board Flood rooms (b1-b7): the board is found only in f1, after them ---------------- */
console.log('pre-board Flood (b1 to b7)');
const {PERCH,VW}=await import(G+'state.js'),{ORDER,perchOf}=await import(G+'rooms/index.js');
const PRE=['b1','b2','b3','b4','b5','b6','b7'];
/* go: hold dir with the jump held, pressed every k frames (0: once, at frame 1; -1: never) plus a second press r frames
   after each; stop as soon as target() holds (any frame, or only on the ground with any:false). First plan that works */
Bot.go=(S,rec,dir,target,{ks=[0,6,10,15,20,30,45],rs=[0,4,8,12,16,20,24,28],hs=[9999],max=900,any=true}={})=>{
  for(const k of ks)for(const r of rs)for(const h of hs){const C=snapshot(S),out=[];let dead=false;
    for(let i=1;i<=max;i++){const jp=k<0?0:k?i%k===1:i===1,jp2=k>=0&&r&&(k?i%k===1+r:i===1+r),c=enc(dir==='l'&&i<h,dir==='r'&&i<h,1,jp||jp2,0),ev=E.step(C,dec(c),[]);out.push(c);
      if(ev.includes('die')||C.p.dead){dead=true;break}if((any||C.p.ground)&&target(C)){restore(S,C);rec.push(...out);return true}}}
  return false};
Bot.sit=(S,rec)=>{for(let i=0;i<PERCH.wait+PERCH.drift;i++){E.step(S,I(),[]);rec.push(0)}return S.sit>=PERCH.drift-5};
/* walk onto the seat at tile x tx (centred within 3 px), then sit */
Bot.perch=(S,rec,tx)=>{const c=tx*T+T/2,d=S.p.x+PW/2<c?'r':'l';return Bot.walk(S,rec,d,S=>Math.abs(S.p.x+PW/2-c)<3,300)&&Bot.sit(S,rec)};
const ft=S=>S.p.y+PH,onPerch=S=>S.p.ground&&!!perchOf(ROOMS[S.room],S.p);
/* each room's route with the root and no board, from wherever he enters to the next room; perch: sit on the seat first */
const ROUTE={
  b1:(S,rec,perch)=>(!perch||Bot.go(S,rec,'r',S=>S.p.ground&&S.p.x>=33*T&&ft(S)<=13*T+.1,{any:false})&&Bot.perch(S,rec,36))&&Bot.go(S,rec,'r',S=>S.room==='b2'),
  b2:(S,rec)=>Bot.go(S,rec,'r',S=>S.room==='b3'),
  /* b3: the current carries him east to the island; the tunnel takes him back west over the pool to the ledge; up onto the roof, east, down the stair */
  b3:(S,rec)=>Bot.go(S,rec,'r',S=>S.room==='b3'&&S.p.ground&&S.p.x>=28*T&&ft(S)<=12*T+.1,{any:false})&&Bot.walk(S,rec,'',S=>S.p.ground&&!S.p.buf,60)&&Bot.walk(S,rec,'r',S=>S.p.x>=29.4*T,120)&&
    Bot.plan(S,rec,'l',S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x<28*T,{jumps:[4,6,8,10,12],max:200})&&Bot.go(S,rec,'l',S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x<=11.5*T,{ks:[-1],any:false,max:600})&&
    Bot.go(S,rec,'r',S=>S.p.ground&&ft(S)<=6*T+.1,{any:false,max:200})&&Bot.go(S,rec,'r',S=>S.room==='b4',{max:600}),
  b4:(S,rec)=>Bot.go(S,rec,'r',S=>S.room==='b5'),
  /* b5: the seat is at the tunnel mouth (13,7), past the block; from it he goes back up onto the block, then the slab */
  b5:(S,rec,perch)=>(!perch||Bot.go(S,rec,'r',S=>S.p.ground&&S.p.x>=11.5*T&&Math.abs(ft(S)-8*T)<.5,{any:false})&&Bot.walk(S,rec,'',S=>S.p.ground&&!S.p.buf,120)&&Bot.perch(S,rec,13)&&
    Bot.go(S,rec,'l',S=>S.p.ground&&ft(S)<=6*T+.1,{any:false,max:300}))&&Bot.go(S,rec,'r',S=>S.room==='b6'),
  b6:(S,rec)=>Bot.go(S,rec,'r',S=>S.p.x>16*T)&&Bot.go(S,rec,'r',S=>ft(S)>=11*T-.1,{ks:[-1],any:false})&&Bot.go(S,rec,'l',S=>S.p.x<=8*T+1,{ks:[-1],max:600})&&
    Bot.go(S,rec,'l',S=>S.p.ground&&ft(S)<=13*T+.1,{ks:[0],rs:[2,4,6,8,10],max:120,any:false})&&Bot.go(S,rec,'l',S=>S.room==='b7',{ks:[-1],max:300}),
  /* b7: the slab hangs low over the undertow from col 12, so he walks off the pit ledge into the water and swims it from there */
  b7:(S,rec)=>Bot.go(S,rec,'l',S=>S.p.x<8*T,{ks:[-1],any:false})&&Bot.walk(S,rec,'r',S=>S.liq.wet,200)&&Bot.go(S,rec,'r',S=>S.p.x>=32*T&&ft(S)<=12*T+.1,{max:1500,any:false})&&
    Bot.go(S,rec,'r',S=>ft(S)<=9*T+.1,{any:false,hs:[9999,10,20,30]})&&Bot.go(S,rec,'r',S=>ft(S)<=5*T+.1,{any:false,hs:[9999,10,20,30]})&&Bot.go(S,rec,'r',S=>S.room==='f1'),
};
const stage=(id,f)=>{const ok=f();if(!ok)console.log('    route stuck in',id);return ok};
{ // layout: ids, names, places, and the hub exit
  ok(PRE.every(id=>ROOMS[id]&&ROOMS[id].biome==='flood')&&PRE.map(id=>ROOMS[id].name).join(', ')==='Tideshore, Swim Steps, Current Run, Clownfish Pools, Glass Reach, Tidefall, Undertow',
    `seven pre-board rooms: ${PRE.map(id=>id+' '+ROOMS[id].name).join(', ')}`);
  const nb=(a,b)=>ROOMS[b].at[0]===ROOMS[a].at[0]+ROOMS[a].w;
  ok(ROOMS.b1.at[0]===ROOMS.hub.at[0]+ROOMS.hub.w&&ROOMS.b1.at[1]===0&&nb('b1','b2')&&nb('b2','b3')&&nb('b3','b4')&&nb('b4','b5')&&nb('b5','b6')&&ROOMS.b7.at[1]===ROOMS.b6.at[1]+ROOMS.b6.h&&nb('b7','f1')&&nb('f1','f2'),
    'b1 to b6 run east along the top from the hub, b7 lies under b5 and b6, f1 and f2 run east from b7 (not mirrored)');
  const fl=ORDER.filter(id=>ROOMS[id].biome==='flood');
  ok(fl.every(id=>{const R=ROOMS[id];return R.at[0]>=48&&R.at[1]>=0&&R.at[0]+R.w-1<=494&&R.at[1]+R.h-1<=40}),`every Flood room lies in the Flood box of the world plan (x 48..494, y 0..40): ${fl.map(id=>id+' '+ROOMS[id].at).join(' ')}`);
  ok(PRE.every(id=>!ROOMS[id].items.length),'no item in b1 to b7 (the board waits in f1)');
  const H=ROOMS.hub,col=H.g.map(r=>r[71]).join('').slice(0,16);
  ok(!col.includes('=')&&col.slice(11,14)==='...'&&H.g[14][71]==='~'&&ROOMS.b1.g[14][0]==='~',`the hub's east exit has no rubble (rubble means sealed; the rubble below row 15 is the Molten funnel): an open way over a rock step with water sunk in its top, the tide that runs on into Tideshore (col 71, rows 0-15: ${col})`);
  ok(ROOMS.b1.perches.length===1&&ROOMS.b5.perches.length===1,'the calm rooms (b1 Tideshore, b5 Glass Reach) each have a seat');
  ok(ROOMS.b1.spawns.length===0&&!ROOMS.b1.plates.length,'Tideshore has nothing hostile');
  for(const [id,tx,ty] of [['b1',36,12],['b5',13,7]]){const S=at(id,tx*T+T/2-PW/2,(ty+1)*T-PH,{root:1});run(S,PERCH.wait+PERCH.drift,I());ok(S.sit>=PERCH.drift-5&&onPerch(S),`${id}: standing still on the seat he sits (${S.sit} frames) and the camera drifts toward its look`)}
}
const TIMES={};
{ // each room with the root and no board: from its way in to the next room, then replayed exactly
  const starts={b1:['hub',36*T,192-PH],b2:['b1',44*T,168-PH],b3:['b2',33*T,144-PH],b4:['b3',37*T,144-PH],b5:['b4',41*T,96-PH],b6:['b5',33*T,48-PH],b7:['b6',3*T-3,204-PH-6]};
  for(const id of PRE){const [r0,x,y]=starts[id],S=playState(r0,x,y,{root:1});run(S,3,I());const rec=[],start=snapshot(S);
    const won=Bot.go(S,rec,r0==='b6'?'':'r',S=>S.room===id,{ks:r0==='b6'?[-1]:undefined,max:600})&&stage(id,()=>ROUTE[id](S,rec,false));
    TIMES[id]=rec.length/60;
    restore(S,start);let died=0;for(const c of rec)if(E.step(S,dec(c),[]).includes('die'))died++;
    const nxt=id==='b7'?'f1':PRE[PRE.indexOf(id)+1];
    ok(won&&!died&&S.room===nxt&&!S.items.board,`${id} ${ROOMS[id].name}: root, no board, from ${r0} through to ${nxt}, replayed with no deaths (${(rec.length/60).toFixed(1)} s incl. the way in)`)}
}
{ // no items at all: the first three rooms go through, and from anywhere in b1 to b4 he can walk (or swim) back west
  const S=playState('hub',36*T,192-PH,{});run(S,3,I());const rec=[];
  const won=Bot.go(S,rec,'r',S=>S.room==='b1')&&ROUTE.b1(S,rec)&&ROUTE.b2(S,rec)&&ROUTE.b3(S,rec);
  ok(won&&S.room==='b4'&&!S.items.root,`no items: from the hub through Tideshore, Swim Steps and Current Run into b4 (${(rec.length/60).toFixed(1)} s)`);
  const back={b1:'hub',b2:'b1',b3:'b2',b4:'b3'};
  const spots=[['b1',46*T,168-PH,'the far end'],['b1',10*T,13*T,'tide A'],['b1',27*T,13*T,'tide B'],['b2',34*T,144-PH,'the far end'],['b2',8*T,13*T,'pool 1'],['b2',15*T,13*T,'the stone pool'],['b2',21.5*T,13*T,'the slot by the stone'],['b2',28*T,11*T,'pool 3'],
    ['b3',38*T,144-PH,'the far end'],['b3',10*T,11*T,'pool A'],['b3',29*T,144-PH,'the island'],['b3',15*T,9*T-PH,'the tunnel'],['b3',11.2*T,9*T-PH,'the ledge'],['b3',20*T,6*T-PH,'the roof'],['b4',34*T,144-PH,'the foot of the wall'],['b4',11*T,11*T,'pool 1'],['b4',25*T,11*T,'pool 2']];
  for(const [id,x,y,n] of spots){const S=playState(id,x,y,{});if(id==='b4')S.ens=[];run(S,60,I());const r=[];
    ok(Bot.go(S,r,'l',S=>S.room===back[id],{max:2400})&&!S.p.dead,`no items: from ${n} of ${id} he gets back west into ${back[id]} (${(r.length/60).toFixed(1)} s${id==='b4'?', fish removed: geometry only':''})`)}
  for(const x of [30,32,33,34.4]){const l=leak(at('b4',x*T,144-PH,{}),'r',S=>S.room!=='b4'||(S.p.ground&&ft(S)<=8*T+.1));ok(!l,`no root: from x ${x} under b4's wall (4 tiles) he never gets up to the way on${l?' LEAK '+JSON.stringify(l):''}`)}
}
{ // b2: the second pool's far bank is a wall three tiles above the water, so no stroke climbs it; the stone in the pool, flush with the water, is the one way up
  const R=ROOMS.b2,top=S=>S.room==='b2'&&S.p.ground&&S.p.x+PW>23*T+2&&ft(S)<=11*T+.1,onStone=S=>S.p.ground&&Math.abs(ft(S)-14*T)<.5&&S.p.x+PW>19*T+2&&S.p.x<21*T-2;
  ok([11,12,13].every(y=>R.g[y][23]==='#')&&R.g[10][23]!=='#'&&R.g[14][22]==='~'&&[14,15,16].every(y=>R.g[y].slice(19,21)==='##')&&R.g[13].slice(19,21)==='..'&&R.g[14][18]==='~'&&R.g[14][21]==='~',
    "b2: the second pool (surface row 14) ends at a wall 3 tiles up (col 23, top row 11); a 2-wide stone flush with the water stands two tiles out from it (cols 19-20)");
  ok(R.g[14][12]==='#'&&R.g[13][12]!=='#'&&R.g[14][3]==='#'&&R.g[14][11]==='#'&&R.g[12][24]==='#'&&R.g[11][24]!=='#'&&R.g[12][32]==='#'&&R.g[11][32]!=='#','b2: every other bank of the three pools is flush with its water (a stroke climbs out)');
  ROOMS.b2ns=parse({id:'b2ns',name:'b2 without its stone',biome:'flood',at:[4200,4000],grid:R.g.map((r,y)=>y>=14&&y<=16?r.slice(0,19)+'~~'+r.slice(21):r),ents:[]});
  for(const x of [15,18,21.5]){const l=leak(drop('b2ns',x*T,13*T,{root:1}),'r',top,{waits:[0,20]});ok(!l,`b2 without the stone: swimming at x ${x}, strokes + root never climb the wall${l?' LEAK '+JSON.stringify(l):''}`)}
  for(const x of [11,12.4]){const l=leak(at('b2ns',x*T,14*T-PH,{root:1}),'r',top);ok(!l,`b2 without the stone: from the bank at x ${x} the low roof stops any jump at the wall${l?' LEAK '+JSON.stringify(l):''}`)}
  { const S=drop('b2',15*T,13*T,{}),r=[];ok(Bot.go(S,r,'r',onStone,{max:600,any:false})&&Bot.go(S,r,'r',top,{max:300,any:false}),`b2: no items, from the water he strokes onto the stone and jumps up the wall (${(r.length/60).toFixed(1)} s)`)}
  { const S=drop('b2',21.5*T,13*T,{}),r=[];ok(Bot.go(S,r,'l',onStone,{max:600,any:false})&&Bot.go(S,r,'r',top,{max:300,any:false}),`b2: no items, a jump that falls short lands in the slot by the wall; he strokes back onto the stone and tries again (${(r.length/60).toFixed(1)} s)`)}
}
{ // b3: the fish's pool is crossed twice: east in its water (the current carries him to an island walled off from the way on), then back west on a tunnel floor right over it, then the roof east
  const R=ROOMS.b3,F0=playState('b3',1*T,144-PH).liq.flow,pool=[];for(let y=12;y<17;y++)for(let x=4;x<28;x++)pool.push(R.g[y][x]==='~'&&F0[y*R.w+x]>0);
  const fish=R.spawns.find(s=>s.k==='C');
  ok(pool.every(Boolean)&&R.g.join('').split('~').length-1===pool.length&&fish&&fish.left>=4&&fish.right<=27&&R.g[fish.ty][fish.tx]==='~',`b3: one pool (cols 4-27, rows 12-16) flowing east, the clownfish fenced inside it (${fish&&fish.left}-${fish&&fish.right}); no other water`);
  const S=playState('b2',33*T,144-PH,{root:1});run(S,3,I());const rec=[],start=snapshot(S);const won=Bot.go(S,rec,'r',S=>S.room==='b3',{max:600})&&ROUTE.b3(S,rec);
  restore(S,start);const legs=[];let cur=null;
  for(const c of rec){E.step(S,dec(c),[]);if(S.room!=='b3')continue;const cx=(S.p.x+PW/2)/T,k=S.liq.wet?'water':S.p.ground&&Math.abs(ft(S)-9*T)<.5&&cx>11&&cx<28?'tunnel':S.p.ground&&Math.abs(ft(S)-6*T)<.5?'roof':null;
    if(!k)continue;if(!cur||cur.k!==k){cur={k,a:cx,b:cx};legs.push(cur)}else cur.b=cx}
  const water=legs.find(l=>l.k==='water'&&l.a<8&&l.b>26),tun=legs.find(l=>l.k==='tunnel'&&l.a>26&&l.b<13),roof=legs.find(l=>l.k==='roof'&&l.a<15&&l.b>31);
  ok(won&&water&&tun&&roof&&legs.indexOf(water)<legs.indexOf(tun)&&legs.indexOf(tun)<legs.indexOf(roof),`b3: the route crosses the pool east in the water (cols ${water&&water.a.toFixed(0)}-${water&&water.b.toFixed(0)}), back west on the tunnel floor over it (${tun&&tun.a.toFixed(0)}-${tun&&tun.b.toFixed(0)}), then east on the roof (${roof&&roof.a.toFixed(0)}-${roof&&roof.b.toFixed(0)})`);
  const up=S=>S.room==='b4'||(S.room==='b3'&&S.p.ground&&ft(S)<=9*T+.1);
  for(const x of [1,2.4]){const l=leak(at('b3',x*T,144-PH,{root:1}),'r',up);ok(!l,`b3: from the door floor at x ${x} the low roof stops any jump: jump + root never reach the tunnel, the ledge or the roof${l?' LEAK '+JSON.stringify(l):''}`)}
  for(const x of [6,9.5,20]){const l=leak(drop('b3',x*T,11*T,{root:1}),'r',up,{waits:[0,20]});ok(!l,`b3: swimming at x ${x}, strokes + root never climb to the tunnel or the ledge (3 tiles over the water)${l?' LEAK '+JSON.stringify(l):''}`)}
  const out=S=>S.room==='b4'||(S.room==='b3'&&S.p.ground&&(ft(S)<=6*T+.1||S.p.x>=33*T));
  for(const d of ['l','r']){const l=leak(at('b3',29.4*T,144-PH,{root:1}),d,out);ok(!l,`b3: from the island (holding ${d}) the roof and the stair are out of reach: it is walled off from the way on${l?' LEAK '+JSON.stringify(l):''}`)}
  { const S=at('b3',11.2*T,9*T-PH,{}),r=[];ok(Bot.walk(S,r,'l',S=>S.liq.wet,200)&&Bot.go(S,r,'r',S=>S.p.ground&&S.p.x>=28*T&&ft(S)<=12*T+.1,{any:false,max:900}),`b3: no items, walking off the ledge drops him in the pool; the current carries him back to the island (${(r.length/60).toFixed(1)} s)`)}
}
{ // b4: the stakes. Three knocks and the clownfish turns; its chomp glitches him out and he is back at a b4 torch
  const S=playState('b4',1*T,144-PH,{root:1});run(S,3,I());Bot.walk(S,[],'r',S=>S.p.x>=7*T,200);const f=S.ens.find(e=>e.k==='fish'&&e.fence[0]===6);
  ok(f&&S.cp&&S.cp.room==='b4','walking in he lights the torch before the first pool');
  run(S,20,I());f.n=2;f.cd=0;f.m=0;f.x=S.p.x+PW-4;f.y=12*T+1;const ev=[];ev.push(...run(S,1,I()));
  let died=-1,rez=-1;for(let i=0;i<500;i++){const e=E.step(S,I(),[]);ev.push(...e);if(e.includes('die')&&died<0)died=i;if(e.includes('rez')){rez=i;break}}
  ok(ev.includes('turn')&&ev.includes('hunt')&&ev.includes('lunge')&&died>=0,`the third knock turns it, it hunts him in the shallow pool and its chomp glitches him out (${(died/60).toFixed(1)} s)`);
  ok(rez>=0&&S.room==='b4'&&ROOMS.b4.torches.some(t=>t.tx===S.cp.tx&&t.ty===S.cp.ty)&&!S.p.dead,`he is back at the b4 torch ${S.cp.tx},${S.cp.ty} in ${((rez-died)/60).toFixed(2)} s`);
  ok(ROOMS.b4.spawns.filter(s=>s.k==='C').length===2&&ROOMS.b4.spawns.every(s=>ROOMS.b4.g[s.ty+1][s.tx]==='#'&&ROOMS.b4.g[s.ty][s.tx]==='~'),'b4: two clownfish, each in a pool one tile deep (he stands in it and bumps them on foot)');
}
{ // b5: the dash gate (Shallows' pit in small) and the crab on the far shelf
  const RT={root:1},shelf=S=>S.room==='b5'&&S.p.ground&&S.p.x+PW>31*T+2&&ft(S)<=8*T+.1&&ft(S)>=8*T-.5;
  ok(ROOMS.b5.spawns.some(s=>s.k==='H'&&s.tx>=31),'b5: a hermit crab on the shelf beyond the pit');
  for(const x of [12,15,17,18.4]){const l=leak(at('b5',x*T,96-PH,RT),'r',shelf);ok(!l,`b5: no board, from the tunnel floor at x ${x} jump + root never reach the crab's shelf${l?' LEAK '+JSON.stringify(l):''}`)}
  const cells=[['the high step',19*T+.5,10*T-PH],['the high step edge',20*T-1,10*T-PH],['the low step',20*T+.5,12*T-PH],['the low step edge',21*T-1,12*T-PH],['the bank',21*T+.5,13*T-PH],['the bank edge',22*T-1,13*T-PH]];
  for(const [n,x,y] of cells){const l=leak(at('b5',x,y,RT),'r',shelf);ok(!l,`b5: no board, from ${n} in the pit the shelf is out of reach${l?' LEAK '+JSON.stringify(l):''}`)}
  for(const x of [23,27,30.4]){const l=leak(drop('b5',x*T,11*T,RT),'r',shelf,{waits:[0,20]});ok(!l,`b5: no board, swimming at x ${x} strokes + root never reach the shelf${l?' LEAK '+JSON.stringify(l):''}`)}
  for(const [n,x,y] of cells){const S=at('b5',x,y,{}),r=[];ok(Bot.go(S,r,'l',S=>S.p.ground&&S.p.x+PW<=19*T+.5&&ft(S)<=8*T+.1,{max:600,any:false}),`b5: no items, from ${n} he climbs back to the tunnel floor (${(r.length/60).toFixed(1)} s)`)}
  { const S=drop('b5',26*T,11*T,{}),r=[];ok(Bot.go(S,r,'l',S=>S.p.ground&&S.p.x+PW<=19*T+.5&&ft(S)<=8*T+.1,{max:1500,any:false}),`b5: no items, fallen in the water he swims to the bank and climbs out (${(r.length/60).toFixed(1)} s)`)}
  let w=null;for(const d of [1,2,3,4])for(let j=20;j<160&&!w;j+=2)for(const r of [10,14,18,22,26]){const S=at('b5',17*T,96-PH,{root:1,board:1});let air=false,good=false;
    for(let i=1;i<300;i++){E.step(S,I({r:1,j:1,bp:i===d+8,jp:i===j||i===j+r}),[]);if(S.p.dead)break;if(!S.p.ground)air=true;else if(air&&i>12){good=shelf(S);break}}if(good){w={d,j,r};break}}
  ok(!!w,`b5: with the board and the root the shelf can be reached (a gate for later, not a wall)${w?' '+JSON.stringify(w):''}`);
  { // the seat's view: standing at the tunnel mouth the crab is off screen; sitting, the camera drifts east until the pit, its still water and the crab's shelf (cols 19-34) are all in view
    const S=at('b5',13*T+T/2-PW/2,8*T-PH,{root:1}),seen=S=>S.cam.x<=19*T&&S.cam.x+VW>=35*T,c0=S.cam.x+VW,stood=seen(S);run(S,PERCH.wait+PERCH.drift,I());
    ok(!stood&&S.sit>0&&seen(S)&&ROOMS.b5.perches[0].tx===13,`b5: the seat at the tunnel mouth shows the pit and the crab only once he sits (view to col ${(c0/T).toFixed(1)} standing, cols ${(S.cam.x/T).toFixed(1)}-${((S.cam.x+VW)/T).toFixed(1)} sitting)`)}
}
{ // b6: the root gets him out of the second pool, west; without it he swims back east and climbs out (no trap)
  const S=playState('b6',9*T,13*T,{});run(S,200,I({l:1}));const l=leak(snapshot(S),'l',S=>S.room==='b7'||(S.p.ground&&ft(S)<=13*T+.1),{waits:[0,20]});
  ok(!l,`b6: no root, the pool's west bank (a tile above the water) is out of reach${l?' LEAK '+JSON.stringify(l):''}`);
  const r=[];ok(Bot.go(S,r,'r',S=>S.p.ground&&S.p.x>=19*T&&ft(S)<=14*T+.1,{max:1500,any:false}),`b6: ...and he swims back east and climbs out onto the flush bank (${(r.length/60).toFixed(1)} s)`);
  ok(Object.values(playState('b6',1*T,48-PH).liq.flow).some(v=>v>0)&&Object.values(playState('b6',1*T,48-PH).liq.flow).some(v=>v<0),'b6: the top pool flows east, the bottom pool west');
}
{ // b7: the tease on the drop in, and the crab's gate that bars the straight way without the board
  const S=playState('b6',3*T-3,204-PH-6,{root:1});const ev=[];for(let i=0;i<90;i++)ev.push(...E.step(S,I(),[]));const c=S.ens.find(e=>e.k==='crab');
  ok(S.room==='b7'&&ev.includes('shell')&&c&&c.wrap>0&&ROOMS.b7.spawns.some(s=>s.k==='H'&&s.tease===1),'b7: dropping in from Tidefall, the hermit crab (tease:1) pulls into its shell once');
  let shut=true;for(let i=0;i<300;i++){E.step(S,I(),[]);if(S.gate>=.5)shut=false}ok(shut,'...the gate stays shut while it sits in its shell (no board: no weight on the plate)');
  const past=S=>S.room==='f1'||(S.room==='b7'&&S.p.x>30*T+2&&ft(S)<=4*T+.1),fail=S=>S.room!=='b7'||ft(S)>5*T;
  for(const x of [16,19,22,24,27,29]){const l=leak(at('b7',x*T,48-PH,{root:1}),'r',past,{waits:[0,60,150],fail});ok(!l,`b7: no board, from x ${x} on the top lane he never gets past the gate${l?' LEAK '+JSON.stringify(l):''}`)}
  ok(Object.values(playState('b7',19*T,48-PH).liq.flow).every(v=>v<0),'b7: the undertow flows west, against him');
  { // the slab hangs low over the undertow (rows 8-9 rock over cols 12-27, two tiles of air above the water): no jump carries him out over it
    let far=0;for(const sx of [6,7,8,8.5])for(const r of [0,...R20.map(i=>i+1)])for(const j of [1,2,4,6]){const S=at('b7',sx*T,(sx<8?9:12)*T-PH,{root:1});
      for(let i=1;i<400;i++){E.step(S,I({r:1,j:1,jp:i===j||i===j+r}),[]);if(S.liq.wet||ft(S)>12*T+2){far=Math.max(far,S.p.x/T);break}}}
    ok(far<11.5&&[8,9].every(y=>ROOMS.b7.g[y].slice(12,28)==='#'.repeat(16))&&[10,11].every(y=>ROOMS.b7.g[y].slice(12,28)==='.'.repeat(16)),`b7: the slab hangs two tiles over the undertow from col 12 to 27, so jump + root from the pit's ledge or bank never get him further out than col ${far.toFixed(1)} before he is in the water`);
    const S=playState('b6',3*T-3,204-PH-6,{root:1});run(S,3,I());const rec=[],st=snapshot(S);const won=Bot.go(S,rec,'',S=>S.room==='b7',{ks:[-1],max:600})&&ROUTE.b7(S,rec);
    restore(S,st);let wet=0,x0=99,x1=0;for(const c of rec){E.step(S,dec(c),[]);if(S.room==='b7'&&S.liq.wet){wet++;x0=Math.min(x0,S.p.x/T);x1=Math.max(x1,S.p.x/T)}}
    ok(won&&wet>=150&&x0<11&&x1>30,`b7: the root bot swims the undertow from col ${x0.toFixed(1)} to ${x1.toFixed(1)} (${wet} frames in the water)`)}
}
{ // the whole slice by script: hub, the seven pre-board rooms (sitting on both seats), Shallows and its board, Hermit Cove
  const S=playState('hub',36*T,192-PH,{root:1});run(S,3,I());const rec=[],start=snapshot(S),enter={};
  let won=Bot.go(S,rec,'r',S=>S.room==='b1');enter.b1=rec.length;
  for(const id of PRE){if(!won)break;won=stage(id,()=>ROUTE[id](S,rec,true));enter[id==='b7'?'f1':PRE[PRE.indexOf(id)+1]]=rec.length}
  won=won&&f1Run(S,rec)&&f2Run(S,rec);
  ok(won,`whole Flood by script: hub to b7 with the root only, then the board in f1 and Hermit Cove (${(rec.length/60).toFixed(1)} s of bot play)`);
  restore(S,start);let died=0,firstBoard=-1;const seen=[];for(let i=0;i<rec.length;i++){const ev=E.step(S,dec(rec[i]),[]);if(ev.includes('die'))died++;if(S.items.board&&firstBoard<0)firstBoard=i;if(seen[seen.length-1]!==S.room)seen.push(S.room)}
  ok(won&&!died&&S.room==='f2'&&S.cp.tx===54&&firstBoard>=enter.f1,`replayed exactly: no deaths, rooms ${seen.join(' > ')}, the board first in hand in f1`);
  const secs=PRE.map(id=>[id,(enter[id==='b7'?'f1':PRE[PRE.indexOf(id)+1]]-enter[id])/60]);
  console.log('    bot crossing times (s, the perch sit of '+((PERCH.wait+PERCH.drift)/60).toFixed(1)+' s included in b1 and b5): '+secs.map(([id,s])=>`${id} ${s.toFixed(1)}`).join(', ')+`; b1-b7 total ${secs.reduce((a,[,s])=>a+s,0).toFixed(1)} s`);
}
{ // the way home (f2 is a dead end east for now): from Shallows back to the hub with the root and the board
  const S=playState('f1',3*T,192-PH,{root:1,board:1});run(S,3,I());const rec=[];
  const won=Bot.go(S,rec,'l',S=>S.room==='b7')&&Bot.go(S,rec,'l',S=>ft(S)>=12*T-.1&&S.p.ground,{ks:[-1],any:false})&&Bot.go(S,rec,'l',S=>S.p.ground&&S.p.x<10*T&&ft(S)<=12*T+.1,{any:false})&&
    Bot.go(S,rec,'l',S=>S.p.ground&&ft(S)<=9*T+.1,{any:false,max:200})&&Bot.go(S,rec,'r',S=>S.p.ground&&ft(S)<=6*T+.1,{any:false,max:200})&&Bot.go(S,rec,'r',S=>S.p.ground&&ft(S)<=4*T+.1&&S.p.x>=14*T,{any:false,max:200})&&
    Bot.go(S,rec,'r',S=>S.p.x>=18*T+3,{ks:[-1],max:200})&&Bot.go(S,rec,'r',S=>S.room==='b6'&&S.p.ground,{ks:[0],rs:Array.from({length:30},(_,i)=>i+1),hs:[1,4,8,12,16,9999],max:150,any:false})&&
    Bot.go(S,rec,'r',S=>S.p.ground&&ft(S)<=13*T+.1,{any:false,max:200})&&Bot.go(S,rec,'r',S=>S.p.ground&&S.p.x>=19*T&&ft(S)<=14*T+.1,{any:false})&&Bot.go(S,rec,'r',S=>S.p.ground&&ft(S)<=11*T+.1,{any:false,max:200})&&
    Bot.go(S,rec,'l',S=>S.p.ground&&ft(S)<=7*T+.1,{any:false,max:200})&&Bot.go(S,rec,'l',S=>S.p.ground&&ft(S)<=4*T+.1,{any:false,max:200})&&['b5','b4','b3','b2','b1','hub'].every(n=>Bot.go(S,rec,'l',S=>S.room===n,{max:1800}));
  ok(won&&S.room==='hub',`the way home: from Shallows back through Undertow, up Tidefall and west along the top to the hub (${(rec.length/60).toFixed(1)} s)`);
}

console.log('swimming: the dash button surfs');
{ const mk=(items,face=1)=>{const S=playState('b1',27*T,14*T+10,items);S.p.face=face;run(S,60,I());return S};
  const S=mk({root:1,board:1});ok(S.liq.wet===1&&!S.p.surf,'he floats in Tideshore\'s deep pool');
  const ev=run(S,1,I({r:1,b:1,bp:1,any:1}));ok(S.p.surf===1&&ev.includes('surf')&&ev.indexOf('dash')<0&&Math.abs(S.p.y+PH-S.liq.s[0].ty*T)<4,'a dash press in the water lifts him onto the surface and he surfs');
  ok(S.p.vx>1.5,`...the way he holds (vx ${S.p.vx.toFixed(2)})`);
  const L=mk({root:1,board:1},-1);run(L,1,I({b:1,bp:1,any:1}));ok(L.p.surf===1&&L.p.vx<-1.5,'with no way held he surfs the way he faces');
  const N=mk({root:1});run(N,1,I({r:1,b:1,bp:1,any:1}));ok(!N.p.surf,'without the board the button does nothing in the water');
}

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails?1:0);
