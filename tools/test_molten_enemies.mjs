// Molten enemies and the geyser chase (agent F, 2026-11-06): the ember sprite, the slag beetle, geyser vents and the
// Molten chase, in synthetic rooms only (the molten rooms come later). Vines and drills are faked with E's contract
// (S.vines boxes, S.drillNow [tx,ty] tiles). Plain node, no deps: node tools/test_molten_enemies.mjs
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const G=new URL('../game/',import.meta.url).href;
const {T,newState,snapshot,restore,persist,resume}=await import(G+'state.js');
const E=await import(G+'engine.js');
const {ROOMS,ORDER,CHASES,NEXT,parse}=await import(G+'rooms/index.js');
const P=await import(G+'player.js');
const CH=await import(G+'chases.js');
const GY=await import(G+'geysers.js');
const CI=await import(G+'cinders.js');
const ART=await import(G+'moltenart.js');
const {spawnEnemies}=await import(G+'enemies.js');
const FMT=await import(G+'dev/roomfmt.js');
let fails=0,passes=0;
const ok=(c,msg)=>{if(c){passes++;console.log('  ok  ',msg)}else{fails++;console.log('  FAIL',msg)}};
const note=msg=>console.log('  ..  ',msg);
const I=(o={})=>({l:0,r:0,u:0,d:0,j:0,jp:0,b:0,bp:0,drag:null,any:0,...o});
const PH=P.PH,PW=P.PW,MK=2;   /* MK: the Molten piece's index in S.pieces */
function playState(room,x,y,items={},assist=0){const S=newState();Object.assign(S,{lit:1,litT:60,match:1,mode:'play',assist});Object.assign(S.items,items);E.enterRoom(S,room,{x,y});return S}
const run=(S,n,f)=>{const evs=[];for(let i=0;i<n;i++)evs.push(...E.step(S,typeof f==='function'?f(i,S):f,[]));return evs};
const W=48,FLOOR=12*T;
/* rows: 0 rock, 1..11 air (walled), 12.. floor */
function grid(h=16,w=W){const g=[[...'#'.repeat(w)],...Array.from({length:11},()=>[...('#'+'.'.repeat(w-2)+'#')]),...Array.from({length:h-12},()=>[...'#'.repeat(w)])];
  return {g,set(x,y,c){g[y][x]=c;return this},rows(){return g.map(r=>r.join(''))}}}
const room=(id,at,gr,ents=[],biome='molten')=>{const src={id,name:id,biome,at,grid:gr.rows(),ents};ROOMS[id]=parse(src);if(!ORDER.includes(id))ORDER.push(id);return ROOMS[id]};
const idx=(S,k)=>S.ens.findIndex(e=>e.k===k);

/* creatures: embers at 20,8 (open air) and 30,10 (his height), an X wall at column 40 rows 6..11 with a beetle on its west face
   at 39,9 (reach 1), a floor beetle at 10,11 on X floor 9..11 (reach 1), a torch at 3,11 */
{const q=grid();for(let y=6;y<12;y++)q.set(40,y,'X');q.set(39,9,'K');for(let x=9;x<12;x++)q.set(x,12,'X');q.set(10,11,'K');q.set(20,8,'E').set(30,10,'E').set(3,11,'T');
  room('mxe',[7000,7000],q,[{at:[20,8],drift:12,amp:6,phase:30},{at:[30,10],drift:0,amp:0},{at:[39,9],reach:1},{at:[10,11],reach:1,dir:-1,pace:50}])}
/* vents: default (dormant) at 12,11, live at 24,11 (period 200, height 5), one under a ceiling 3 tiles up at 34,11 (height 6) */
{const q=grid();q.set(12,11,'V').set(24,11,'V').set(34,11,'V').set(34,8,'#').set(3,11,'T');
  room('mxv',[7100,7000],q,[{at:[24,11],live:1,period:200,height:5},{at:[34,11],live:1,period:200,phase:100,height:6}])}
/* the chase: mxa (west, the fragment at 6,11) and mxb (east) joined by a door at rows 9..11; vents every 6 tiles; torches
   at mxa 3 and 40, mxb 21; the safe line at mxb x 44 */
const VA=[12,18,24,30,36,44],VB=[4,10,16,27,33,38];
{const q=grid();for(let y=9;y<12;y++)q.set(W-1,y,'.');for(const x of VA)q.set(x,11,'V');q.set(6,11,'F').set(3,11,'T').set(40,11,'T');room('mxa',[8000,7000],q)}
{const q=grid();for(let y=9;y<12;y++)q.set(0,y,'.');for(const x of VB)q.set(x,11,'V');q.set(21,11,'T');room('mxb',[8048,7000],q)}
const C=CHASES.molten,ORIG={...C};
Object.assign(C,{kind:'geyser',dir:1,from:8006,beat:60,every:180,tel:48,erupt:54,gap:150,path:[[8006,3],[8092]]});
delete C.at;

console.log('parse, validators, editor');
{ const R=ROOMS.mxe,V=ROOMS.mxv;
  ok(R.spawns.filter(s=>s.k==='E').length===2&&R.spawns.filter(s=>s.k==='K').length===2&&R.vents.length===0,'E and K parse into spawns');
  const e=R.spawns.find(s=>s.k==='E'&&s.tx===20);ok(e.drift===12&&e.amp===6&&e.phase===30&&!('at' in e&&e.at),'ember ent fields come through (drift, amp, phase)');
  ok(V.vents.length===3&&V.vents[1].live===1&&V.vents[1].period===200&&V.vents[1].height===5&&V.spawns.length===0,'V parses into R.vents with its fields (live, period, height)');
  const S=playState('mxv',3*T,FLOOR-PH);ok(S.ens.length===3&&S.ens.every(e=>e.k==='vent'&&e.mol&&e.soft),'vents spawn into S.ens (soft, mol), so they reset on room entry');
  const M=parse({id:'mix',name:'mix',biome:'molten',at:[0,0],grid:['#####','#MV.#','#####'],ents:[]}),en=spawnEnemies(M);
  ok(en[0].k==='moss'&&en[1].k==='vent','the room\'s other enemies keep their S.ens indices (vents come after them)');
  ok(ROOMS.r1.vents&&ROOMS.r1.vents.length===0&&ROOMS.r1.spawns.every(s=>s.k!=='E'&&s.k!=='K'),'existing rooms parse as before (no vents)');
  const r={id:'xm',name:'Molten test',biome:'molten',at:[0,0],grid:['#######','#V.EK.#','#####X#'],ents:[{at:[1,1],height:6,period:240,phase:30,live:1},{at:[3,1],drift:12,amp:6,pace:80,phase:10},{at:[4,1],reach:1,dir:-1,pace:50}]};
  ok(FMT.check(r)==='','the editor format check accepts V/E/K and their ent fields');
  let py='';try{py=execFileSync('python3',['-I','-c',`import sys,json;sys.path.insert(0,${JSON.stringify(new URL('.',import.meta.url).pathname)});import dev_server as d;print(json.dumps(d.clean(json.loads(sys.stdin.read()),'x')['ents']))`],{input:JSON.stringify(r),encoding:'utf8'}).trim()}catch(e){py='ERR '+String(e.stderr||e.message).slice(0,200)}
  ok(py===JSON.stringify(r.ents).replace(/,"/g,', "').replace(/":/g,'": ').replace(/\],\{/g,'], {').replace(/\},\{/g,'}, {').replace(/,(\d|-)/g,', $1'),`the dev server's validator accepts them (${py.slice(0,120)})`);
  const msgs=FMT.problems([{id:'xp',name:'xp',biome:'molten',at:[0,0],grid:['#########','#T......#','#V.K..E.#','##.######'],ents:[{at:[1,2],height:3},{at:[3,2],reach:1},{at:[6,2],amp:20}]}]).map(m=>m.msg);
  ok(msgs.some(m=>/Geyser vent floats/.test(m))===false&&msgs.some(m=>/Slag beetle has no cracked rock/.test(m))&&msgs.some(m=>/Ember sprite drifts into rock/.test(m))&&!msgs.some(m=>/Ent data on a '[VEK]'/.test(m)),
    `problems(): a beetle with no X and an ember that drifts into rock warn; ent data on V/E/K is not "nothing" (${msgs.filter(m=>/Geyser|Slag|Ember|Ent data/.test(m)).join('; ')})`);
  const m2=FMT.problems([{id:'xq',name:'xq',biome:'molten',at:[0,0],grid:['#####','#T..#','#.V.#','#...#','#####'],ents:[]}]).map(m=>m.msg);
  ok(m2.some(m=>/Geyser vent floats/.test(m)),'problems(): a vent with no floor warns');
  const m3=FMT.problems([{id:'xr',name:'xr',biome:'molten',at:[0,0],grid:['#####','#T..#','#.V.#','##X##','#####'],ents:[]}]).map(m=>m.msg);
  ok(m3.some(m=>/Geyser vent stands on cracked rock/.test(m))&&!m3.some(m=>/Geyser vent floats/.test(m)),'problems(): a vent on cracked rock warns that a drill would leave it floating');
  ok(FMT.NAMES.V==='Geyser vent'&&FMT.NAMES.E==='Ember sprite'&&FMT.NAMES.K==='Slag beetle','roomfmt NAMES V, E, K');
  const ed=readFileSync(new URL('../game/editor.js',import.meta.url),'utf8');
  ok(/V:\[\['height',/.test(ed)&&/E:\[\['drift',/.test(ed)&&/K:\[\['reach',/.test(ed),'the editor lists the V, E and K fields');
}

console.log('ember sprite');
{ const S=playState('mxe',3*T,FLOOR-PH),i=S.ens.findIndex(e=>e.k==='ember'&&e.hx===20*T+1),e=S.ens[i];
  const tr=[];for(let k=0;k<420;k++){run(S,1,I());tr.push([e.x,e.y])}
  const S2=playState('mxe',3*T,FLOOR-PH),e2=S2.ens[i],tr2=[];for(let k=0;k<420;k++){run(S2,1,I());tr2.push([e2.x,e2.y])}
  ok(JSON.stringify(tr)===JSON.stringify(tr2),'its drift is deterministic (two fresh runs, 420 frames, same path)');
  const dx=Math.max(...tr.map(p=>Math.abs(p[0]-e.hx))),dy=Math.max(...tr.map(p=>Math.abs(p[1]-e.hy)));
  ok(dx<=12+1e-9&&dx>11&&dy<=6+1e-9&&dy>5,`a figure-eight inside its drift and amp (${dx.toFixed(1)} px across, ${dy.toFixed(1)} px up/down)`);
  const per=Math.round(2*Math.PI/CI.EMBER.sp);ok(Math.hypot(tr[per][0]-tr[0][0],tr[per][1]-tr[0][1])<.5,`it comes round again every ${per} frames (${(per/60).toFixed(1)} s)`);
  /* lethal when lit */
  const L=playState('mxe',30*T+6-PW/2,FLOOR-PH),li=L.ens.findIndex(e=>e.k==='ember'&&e.hx===30*T+1);let ev=[];for(let k=0;k<60&&!ev.includes('die');k++)ev=E.step(L,I(),[]);
  ok(ev.includes('die')&&L.flash===li,'a lit ember touching him glitches him out (S.flash is its index)');
  /* smothered by a fake vine (E's shape, full grown), then relights */
  const V=playState('mxe',3*T,FLOOR-PH),vi=V.ens.findIndex(e=>e.k==='ember'&&e.hx===30*T+1),ve=V.ens[vi];run(V,2,I());
  const vine=()=>({x:ve.x-2,y:ve.y-30,w:10,h:51,t:90,s:1,fx:ve.x,by:ve.y+21,max:48,len:48});
  V.vines=[vine()];const sm=run(V,1,I());
  ok(ve.st===1&&sm.includes('ember_out'),'a vine box over it smothers it (ember_out)');
  V.p.x=30*T+6-PW/2;V.p.y=FLOOR-PH;V.p.inv=0;const safe=run(V,20,I());ok(!safe.includes('die'),'smoke never hurts him (he stands in it 20 frames)');
  V.p.x=3*T;run(V,1,I());
  let held=0;for(let k=0;k<400;k++){V.vines=[vine()];E.step(V,I(),[]);if(ve.st===1)held++}ok(held===400,'it stays out while a vine still covers it (400 frames)');
  V.vines=[];const ev2=[];let lit=-1;for(let k=1;k<=400;k++){const e=E.step(V,I(),[]);ev2.push(...e);if(e.includes('ember_lit')&&lit<0)lit=k}
  ok(lit===CI.EMBER.relight,`it relights ${lit} frames after the last vine left it (EMBER.relight ${CI.EMBER.relight}, ${(CI.EMBER.relight/60).toFixed(0)} s)`);
  const D=playState('mxe',3*T,FLOOR-PH),de=D.ens[vi];run(D,2,I());D.vines=[{...vine(),dead:1},{x:-50,y:-50,w:5,h:5}];run(D,3,I());
  ok(de.st===0,'a dead vine, or one elsewhere, does not');
  /* never relights inside him */
  const N=playState('mxe',3*T,FLOOR-PH),ne=N.ens[vi];run(N,2,I());N.vines=[{x:ne.x-2,y:ne.y-30,w:10,h:51,t:90,s:1,fx:ne.x,by:ne.y+21,max:48,len:48}];run(N,1,I());N.vines=[];
  N.p.x=ne.x+5-PW/2;N.p.y=FLOOR-PH;let die=false;for(let k=0;k<CI.EMBER.relight+60;k++){N.p.inv=1;if(E.step(N,I(),[]).includes('die'))die=true}
  ok(ne.st===1&&!die,'standing in its smoke when the time is up, it waits; it relights once he steps out');
  N.p.x=3*T;N.p.inv=0;run(N,2,I());ok(ne.st===0,'...and then it is lit again');
  /* its light */
  const lights=[];CI.cinderLights(V,(x,y,r,k)=>lights.push(r));ok(lights.includes(CI.EMBER.r)&&lights.every(r=>r<=CI.EMBER.r),`lit embers give a small light (radius ${CI.EMBER.r} px), no more`);
  const L2=[];CI.cinderLights(N,(x,y,r)=>L2.push(r));N.ens[vi].st=1;N.ens[vi].t=999;const L3=[];CI.cinderLights(N,(x,y,r)=>L3.push(r));ok(L3.length===L2.length-1,'a smothered one gives none (a glint only while it sparks)');
  /* snapshot round trip */
  const A=playState('mxe',3*T,FLOOR-PH);run(A,50,I({r:1}));A.vines=[vine()];const snap=snapshot(A),B=newState();restore(B,JSON.parse(JSON.stringify(snap)));
  const script=k=>I({r:k%90<40,l:k%90>60,j:k%31<6,jp:k%31===0});run(A,300,script);run(B,300,script);
  ok(JSON.stringify(A)===JSON.stringify(B),'snapshot and JSON restore replay the creatures exactly (300 frames)');
}

console.log('slag beetle');
{ const S=playState('mxe',3*T,FLOOR-PH),bi=S.ens.findIndex(e=>e.k==='beetle'&&e.hx===39),b=S.ens[bi];
  ok(b.gx===1&&b.gy===0&&b.lo===-T&&b.hi===T,`it lives in the cracked wall east of it (burrow ${b.hx+b.gx},${b.hy+b.gy}) and crawls a tile each way along it`);
  const ys=[];for(let k=0;k<300;k++){run(S,1,I());ys.push(b.y)}
  ok(Math.max(...ys)-Math.min(...ys)>=2*T-1&&b.x===39*T+T/2+2-4,`it crawls up and down its face (${(Math.max(...ys)-Math.min(...ys)).toFixed(0)} px), flush to it`);
  const f=S.ens.find(e=>e.k==='beetle'&&e.hx===10);ok(f.gy===1&&f.w===14&&f.h===8&&Math.abs(f.y+f.h-FLOOR)<1e-9,'one on a cracked floor sits on it (14 x 8)');
  /* lethal closed */
  const L=playState('mxe',39*T-8,FLOOR-PH),li=L.ens.findIndex(e=>e.k==='beetle'&&e.hx===39);L.ens[li].lo=L.ens[li].hi=L.ens[li].u=T;
  let ev=[];for(let k=0;k<30&&!ev.includes('die');k++)ev=E.step(L,I({r:1}),[]);
  ok(ev.includes('die')&&L.flash===li,'touching it closed glitches him out');
  /* a drill elsewhere: nothing */
  const D=playState('mxe',3*T,FLOOR-PH),de=D.ens[bi];run(D,5,I());D.drillNow=[[40,6]];const e0=[];CI.cinderTouch(D,ROOMS.mxe,e0);
  ok(!de.wrap&&!e0.includes('beetle_open'),'drilling a cracked tile that is neither its burrow nor behind it does nothing');
  /* drilled at its burrow: open, a ledge */
  D.drillNow=[[40,9]];const e1=[];CI.cinderTouch(D,ROOMS.mxe,e1);
  ok(de.wrap===CI.BEETLE.shell&&de.st===1&&e1.includes('beetle_open'),`drilling its burrow (S.drillNow [[40,9]]) knocks it open for ${CI.BEETLE.shell} frames`);
  ok(de.w===14&&de.h===6&&de.x+de.w===40*T,'its shell is a ledge 14 px out from the wall, 6 px tall');
  const D2=playState('mxe',3*T,FLOOR-PH),d2=D2.ens[bi];run(D2,40,I());const behind=[d2.hx+Math.round(d2.u/T)+1,d2.hy+Math.round(d2.u/T)];
  D2.drillNow=['40,'+(d2.hy+Math.round(d2.u/T))];const e3=[];CI.cinderTouch(D2,ROOMS.mxe,e3);ok(d2.wrap>0,`the X tile behind it now counts too (here ${behind}; the 'tx,ty' form)`);
  /* he stands on the ledge */
  D.p.x=40*T-PW;D.p.y=de.y-PH-20;D.p.vy=0;D.p.ground=0;let on=0,land=-1;for(let k=0;k<120;k++){E.step(D,I(),[]);if(D.p.ground&&D.p.on===bi){on++;if(land<0)land=k}}
  ok(on>60&&Math.abs(D.p.y+PH-de.y)<1e-9,`dropped onto it he lands and stands on the shell (${on} frames on it)`);
  /* it re-forms: a wobble, then shut, then grace */
  let wob=-1,shut=-1;const ev2=[];for(let k=0;k<CI.BEETLE.shell+40;k++){const e=E.step(D,I({l:shut>=0&&k-shut<40}),[]);ev2.push(...e);if(wob<0&&de.wrap>0&&de.wrap<CI.BEETLE.wob)wob=k;if(shut<0&&e.includes('beetle_shut'))shut=k}
  ok(shut>0&&ev2.includes('beetle_shut')&&!ev2.includes('die')&&de.st===0,`it closes again after its shell time; he drops off unhurt in its grace (${CI.BEETLE.grace} frames) and walks away`);
  ok(wob>0&&shut-wob>=CI.BEETLE.wob-2,`it wobbles for ${shut-wob} frames before it closes`);
  /* re-entry resets it */
  const R2=playState('mxe',3*T,FLOOR-PH);run(R2,3,I());R2.drillNow=[[40,9]];CI.cinderTouch(R2,ROOMS.mxe,[]);ok(R2.ens[bi].wrap>0,'(open)');
  E.enterRoom(R2,'mxe',{x:3*T,y:FLOOR-PH});ok(R2.ens[bi].wrap===0&&R2.ens[bi].st===0,'re-entering the room, it is closed again');
  const snap=snapshot(D),Bq=newState();restore(Bq,JSON.parse(JSON.stringify(snap)));const sc=k=>I({l:k%50<20});run(D,200,sc);run(Bq,200,sc);
  ok(JSON.stringify(D)===JSON.stringify(Bq),'snapshot round trip with a beetle (200 frames)');
  /* the real drill (game/claws.js, agent E), reported only: claws, cling on the far face of a 1-tile X wall with a beetle on the near one */
  try{const q=grid();for(let y=5;y<12;y++)q.set(30,y,'X');q.set(31,9,'K').set(3,11,'T');room('mxd',[7200,7000],q,[{at:[31,9]}]);
    const S3=playState('mxd',30*T-PW-1,7*T,{claws:1});S3.p.vy=1;const bk=idx(S3,'beetle');let opened=-1;for(let k=0;k<200;k++){const e=E.step(S3,I({r:1,d:1}),[]);if(e.includes('beetle_open')&&opened<0)opened=k}
    note(opened>=0?`real claws: clinging to the cracked wall's west face and drilling opens the beetle on its east face (frame ${opened})`:`real claws: no beetle_open in 200 frames (E's drill or this setup; not counted)`);
    if(opened>=0){let shut=false,die=false;for(let k=0;k<CI.BEETLE.shell+CI.BEETLE.grace+120;k++){const e=E.step(S3,I(),[]);if(e.includes('beetle_shut'))shut=true;if(e.includes('die'))die=true}
      note(`...its burrow crumbled with the wall (${S3.drilled.length} tiles), so ${!shut&&S3.ens[bk].wrap>0&&!die?'the shell stays a ledge for the visit (no beetle re-forms in the gap)':'IT RE-FORMED in the gap'}`)}}catch(err){note('real claws check skipped: '+err.message)}
  /* its burrow drilled away (S.drilled, E's contract): no rock to close on, so the shell stays a ledge till re-entry */
  { const Q=playState('mxe',3*T,FLOOR-PH),q=Q.ens[bi];run(Q,3,I());Q.drilled=[[40,9]];Q.drillNow=[[40,9]];const eq=[];CI.cinderTouch(Q,ROOMS.mxe,eq);
    let shut=false;for(let k=0;k<CI.BEETLE.shell*2;k++)if(E.step(Q,I(),[]).includes('beetle_shut'))shut=true;
    ok(eq.includes('beetle_open')&&!shut&&q.wrap===CI.BEETLE.shell,`with its burrow drilled out (S.drilled) it never closes again this visit (${CI.BEETLE.shell*2} frames, no wobble)`);
    E.enterRoom(Q,'mxe',{x:3*T,y:FLOOR-PH});ok(Q.ens[bi].wrap===0&&Q.drilled.length===0,'re-entering resets both the wall and the beetle');
  }
  /* a real vine (game/claws.js) smothering an ember beside a wall he clings to, reported only */
  try{const q=grid();for(let y=1;y<12;y++)q.set(30,y,'#');q.set(29,6,'E').set(3,11,'T');room('mxw',[7300,7000],q,[{at:[29,6],drift:0,amp:4}]);
    const S4=playState('mxw',30*T-PW-1,92,{claws:1});S4.p.vy=1;const ek=idx(S4,'ember');let out=-1,died=false;
    for(let k=0;k<120;k++){const e=E.step(S4,I({r:1,d:1}),[]);if(e.includes('ember_out')&&out<0)out=k;if(e.includes('die'))died=true}
    note(out>=0?`real claws: a vine grown below an ember on the same wall smothers it (frame ${out}${died?', but he died':''}); vines are ${'10 px strips flush to the wall'}, so only an ember within ~10 px of a climbable wall can be smothered`:`real claws: the vine did not reach the ember (not counted)${died?'; he died':''}`)}catch(err){note('real vine check skipped: '+err.message)}
}

console.log('geyser vents outside the chase');
{ const S=playState('mxv',3*T,FLOOR-PH),[d,lv,cl]=S.ens;
  const st={d:new Set(),lv:new Set()};let tel=0,minTel=1e9,run1=0;
  for(let k=0;k<2400;k++){E.step(S,I(),[]);st.d.add(d.st);st.lv.add(lv.st);if(lv.st===1)run1++;else{if(lv.st===2&&run1)minTel=Math.min(minTel,run1);if(lv.st!==2)run1=0}}
  ok(!st.d.has(2)&&!st.d.has(1)&&st.d.has(3),'a default vent outside the chase is dormant: it only puffs steam, never cracks or erupts (40 s)');
  ok(st.lv.has(2)&&minTel>=40,`a live:1 vent erupts on its own rhythm, each time after ${minTel} telegraph frames (>= 40)`);
  const M=playState('mxv',12*T+6-PW/2,FLOOR-PH);let die=false;for(let k=0;k<1200;k++){M.p.inv=0;if(E.step(M,I(),[]).includes('die'))die=true}
  ok(!die,'standing on a dormant vent for 20 s is safe');
  const K=playState('mxv',24*T+6-PW/2,FLOOR-PH),ki=1;let ev=[];for(let k=0;k<400&&!ev.includes('die');k++)ev=E.step(K,I(),[]);
  ok(ev.includes('die')&&K.flash===ki,'an eruption glitches him out (S.flash is the vent\'s index)');
  let hmax=0,hcl=0;const H=playState('mxv',3*T,FLOOR-PH);for(let k=0;k<400;k++){E.step(H,I(),[]);const b=GY.ventBox(H.ens[1]),c=GY.ventBox(H.ens[2]);if(b)hmax=Math.max(hmax,b.h);if(c)hcl=Math.max(hcl,c.h)}
  ok(hmax===5*T&&hcl===3*T,`columns are their height (${hmax/T} tiles), and a ceiling cuts one short (${hcl/T} of 6 tiles)`);
  const ev3=run(playState('mxv',22*T,FLOOR-PH),400,I());ok(ev3.includes('geyser_crack')&&ev3.includes('geyser_erupt')&&ev3.includes('geyser_puff'),'sounds: geyser_crack, geyser_erupt, geyser_puff near him');
}

/* ---------------- the chase ---------------- */
const RA=ROOMS.mxa,RB=ROOMS.mxb,vx=(R,x)=>(R.at[0]+x)*T+T/2;
const VW_=[...VA.map(x=>vx(RA,x)),...VB.map(x=>vx(RB,x))],SAFE=GY.endX(C);
const wcx=S=>CH.worldX(S)+PW/2;
/* the legs: to the middle of each gap between vents (and the pedestal side), then past the safe line */
const STOPS=[...VW_.slice(0,-1).map((x,i)=>(x+VW_[i+1])/2),SAFE+T];
function chaseBase(assist=0){const S=newState();Object.assign(S,{lit:1,litT:60,match:1,mode:'play',assist});return S}
function atPedestal(assist=0){const S=chaseBase(assist);E.enterRoom(S,'mxa',{x:2*T,y:FLOOR-PH});S.cp={room:'mxa',tx:3,ty:11};S.torches['mxa:3,11']=1;run(S,2,I());return S}
function atTorch(room,tx,ty,assist=0){const S=chaseBase(assist);S.pieces[MK]=1;S.chase={id:'molten',on:1,x:0,t:0,n:0,w:0};S.cp={room,tx,ty};E.enterRoom(S,room,E.spot(S,ROOMS[room],tx,ty));CH.resetChase(S);E.step(S,I(),[]);return S}
/* one leg: wait w frames (searched), then run right to the stop; replayed on S once a wait works */
function leg(S,rec,stop,pause){
  for(let w=0;w<=360;w+=6){const C0=snapshot(S),out=[];let dead=false,won=false;
    for(let k=0;k<w+pause&&!dead;k++){out.push(0);if(E.step(C0,I(),[]).includes('die'))dead=true}
    for(let k=0;k<900&&!dead;k++){const ev=E.step(C0,I({r:1}),[]);out.push(1);if(ev.includes('die')||C0.p.dead){dead=true;break}if(wcx(C0)>=stop||(C0.chase&&!C0.chase.on)){won=true;break}}
    if(won){for(const c of out){const ev=E.step(S,c?I({r:1}):I(),[]);rec.push(c);LOG&&LOG(S,ev)}return true}}
  return false;
}
let LOG=null;
function chaseRun(S,{pause=0}={}){
  const rec=[],cps=[];let died=0,done=-1,t0=S.t,okk=true,last=S.room,near=0;
  LOG=(S,ev)=>{if(ev.includes('die'))died++;if(ev.includes('cp'))cps.push([S.room+':'+S.cp.tx,S.t-t0]);if(ev.includes('chase_done'))done=S.t-t0;near=Math.max(near,CH.nearness(S))};
  try{if(!S.pieces[MK]){for(let k=0;k<200&&!S.pieces[MK];k++){const ev=E.step(S,I({r:1}),[]);rec.push(1);LOG(S,ev)}if(pause){for(let k=0;k<pause;k++){LOG(S,E.step(S,I(),[]));rec.push(0)}}}
    for(const stop of STOPS){if(wcx(S)>=stop)continue;if(!S.chase||!S.chase.on)break;const p=pause&&S.room!==last?pause:0;last=S.room;if(!leg(S,rec,stop,p)){okk=false;break}}}finally{LOG=null}
  return {ok:okk&&!died&&done>=0&&S.chase&&!S.chase.on,rec,died,done,secs:done/60,S,cps,near,stuck:okk?'':S.room+' x '+(S.p.x/T).toFixed(1)};
}

console.log('the geyser chase: start');
{ const S=atPedestal();const pre=new Set();for(let k=0;k<600;k++){E.step(S,I(),[]);for(const e of S.ens)pre.add(e.st)}
  ok(!pre.has(2)&&!pre.has(1)&&!S.chase,'before the fragment is lifted, the room\'s vents are dormant (10 s): the room reads first');
  const ev=run(S,80,I({r:1}));
  ok(S.pieces[MK]===1&&ev.includes('piece')&&ev.includes('chase_start')&&S.chase&&S.chase.id==='molten'&&S.chase.on===1,'walking into the pedestal lifts the Molten fragment and wakes the geyser chase');
  ok(Object.values(S.chase).every(v=>typeof v==='string'||Number.isFinite(v))&&JSON.stringify(JSON.parse(JSON.stringify(S.chase)))===JSON.stringify(S.chase),'its state is plain numbers: '+JSON.stringify(S.chase));
  /* the sweep, seen from a safe spot: each vent's first eruption comes later the further east it is, a wave */
  const W1=atPedestal();run(W1,1,I({r:1}));while(!W1.chase)run(W1,1,I({r:1}));W1.p.inv=1e9;const first={},tel={},run1={};
  for(let k=0;k<700;k++){E.step(W1,I(),[]);W1.ens.forEach((e,i)=>{if(e.k!=='vent')return;if(e.st===1)run1[i]=(run1[i]||0)+1;if(e.st===2&&!(i in first)){first[i]=k;tel[i]=run1[i]}if(e.st!==1)run1[i]=e.st===2?run1[i]:0})}
  const fs=Object.keys(first).map(Number).sort((a,b)=>W1.ens[a].tx-W1.ens[b].tx).map(i=>first[i]);
  ok(fs.length===VA.length&&fs.every((v,i)=>!i||v>fs[i-1]),`the vents fire in sequence west to east (first eruptions at frames ${fs.join(', ')})`);
  const tels=Object.values(tel);ok(tels.every(v=>v>=40)&&Math.min(...tels)===C.tel,`each first eruption comes after ${Math.min(...tels)} telegraph frames (>= 40)`);
  ok(fs.length>1&&Math.abs((fs[1]-fs[0])-6*T/C.path[0][1])<=1,`the wave crosses 6 tiles in ${fs[1]-fs[0]} frames (${C.path[0][1]} px/frame; he runs ${P.FEEL.RUN})`);
}
console.log('the geyser chase: telegraphs, rhythm, Assist');
const watch=(assist)=>{const S=atPedestal(assist);run(S,1,I({r:1}));while(!S.chase)run(S,1,I({r:1}));S.p.inv=1e9;const runs=[],ers=[],gaps=[];let r1={},r2={},last={};
  for(let k=0;k<1500;k++){E.step(S,I(),[]);S.ens.forEach((e,i)=>{if(e.k!=='vent')return;
    if(e.st===1)r1[i]=(r1[i]||0)+1;if(e.st===2){if(r1[i]){runs.push(r1[i]);if(i in last)gaps.push(k-last[i]);last[i]=k}r1[i]=0;r2[i]=(r2[i]||0)+1}else{if(r2[i])ers.push(r2[i]);r2[i]=0;if(e.st!==1)r1[i]=0}})}
  return {S,runs,ers,gaps}};
{ const n=watch(0),a=watch(1);
  ok(n.runs.length>10&&Math.min(...n.runs)>=40,`every eruption in the chase follows a telegraph of at least 40 frames (${n.runs.length} eruptions, min ${Math.min(...n.runs)})`);
  ok(Math.min(...n.ers)>=C.erupt-1&&Math.max(...n.ers)<=C.erupt+1&&n.gaps.every(g=>Math.abs(g-C.every)<=1),`eruptions last ${Math.max(...n.ers)} frames, and each vent fires every ${n.gaps[0]} frames`);
  ok(Math.min(...a.runs)>=Math.floor(C.tel*GY.ASSIST.tel/GY.ASSIST.rate)&&a.gaps.every(g=>Math.abs(g-C.every/GY.ASSIST.rate)<=1),`Assist: the rhythm slows to 70% (a vent every ${a.gaps[0]} frames) and the telegraph widens to ${Math.min(...a.runs)} frames`);
  const v=as=>{const S=atPedestal(as);run(S,1,I({r:1}));while(!S.chase)run(S,1,I({r:1}));S.p.inv=1e9;while(S.chase.t<0)run(S,1,I());const x0=S.chase.x;run(S,30,I());return (S.chase.x-x0)/30};
  const sn=v(0),sa=v(1);ok(Math.abs(sa/sn-.7)<.01,`Assist: the waves travel at 70% (${sn.toFixed(2)} -> ${sa.toFixed(2)} px/frame)`);
  ok(JSON.stringify(n.S.ens.map(e=>[e.tx,e.ty,e.hgt]))===JSON.stringify(a.S.ens.map(e=>[e.tx,e.ty,e.hgt]))&&JSON.stringify(ROOMS.mxa.g)===JSON.stringify(parse({id:'mxa',name:'mxa',biome:'molten',at:[8000,7000],grid:ROOMS.mxa.g,ents:[]}).g),'Assist changes no layout (same vents, same heights, same grid)');
}

console.log('the geyser chase: crossing it');
let CLEAN=null;
{ const A=chaseRun(atPedestal());CLEAN=A;
  ok(A.ok,`a scripted bot crosses the sweep from the pedestal to the safe line in ${A.secs.toFixed(1)} s with no death${A.ok?'':' STUCK '+A.stuck}`);
  ok(A.near>.5,`...the eruptions come close (nearness up to ${A.near.toFixed(2)}; the OS shake gets it in quarters)`);
  const B=atPedestal();let died=0,done=0;for(const c of A.rec){const ev=E.step(B,c?I({r:1}):I(),[]);if(ev.includes('die'))died++;if(ev.includes('chase_done'))done++}
  ok(!died&&done===1&&B.room==='mxb','replaying the recorded inputs: no death, chase_done once');
  ok(B.chase&&!B.chase.on&&CH.nearness(B)===0&&CH.progress(B)===0,'past the safe line the chase is over (nearness and progress 0)');
  run(B,GY.GEYSER.wither+2,I());ok(B.chase===null&&B.ens.every(e=>e.st!==2&&e.st!==1),'a second later it is gone and the vents are dormant again');
  const H=chaseRun(atPedestal(),{pause:60});ok(H.ok,`a hesitant bot (1 s still after the lift and in each room) crosses too (${H.secs.toFixed(1)} s)${H.ok?'':' STUCK '+H.stuck}`);
  const notes=[];let all=true;
  for(const [room,tx] of [['mxa',3],['mxa',40],['mxb',21]])for(const pause of [0,60]){const r=chaseRun(atTorch(room,tx,11),{pause});if(!r.ok)all=false;notes.push(`${room}:${tx}${pause?'+1s':''} ${r.ok?r.secs.toFixed(1)+'s':'FAIL '+r.stuck}`)}
  ok(all,`restarted at every torch (and hesitating 1 s per room) he crosses it: ${notes.join('; ')}`);
  const As=chaseRun(atPedestal(1));ok(As.ok,`with Assist the clean run crosses too (${As.secs.toFixed(1)} s)`);
  const Ha=chaseRun(atTorch('mxa',40,11,1),{pause:60});ok(Ha.ok,`with Assist, from the mid torch, hesitant (${Ha.secs.toFixed(1)} s)`);
}
{ /* a real death: he walks into the sweep, comes back at his torch, the waves restart a fair gap behind it */
  const S=atPedestal();run(S,1,I({r:1}));while(!S.chase)run(S,1,I({r:1}));S.p.x=40*T;run(S,2,I());S.p.x=44*T+6-PW/2;
  let ev=[];for(let k=0;k<600&&!ev.includes('die');k++)ev=E.step(S,I(),[]);const vi=S.flash;
  ok(ev.includes('die')&&typeof vi==='number'&&S.ens[vi].k==='vent',`standing on a vent in the sweep, an eruption gets him (vent at ${S.ens[vi]&&S.ens[vi].tx})`);
  let rz=[];for(let k=0;k<60&&!rz.includes('rez');k++)rz=E.step(S,I(),[]);
  const xt=vx(ROOMS[S.cp.room],S.cp.tx),exp=GY.crest(C,GY.tau(C,xt-C.gap)-GY.GEYSER.rest);
  ok(rz.includes('rez')&&S.chase.on&&Math.abs(S.chase.x-exp)<1e-6&&S.chase.n<=1,`he is back at ${S.cp.room}:${S.cp.tx} and the first wave restarted ${((xt-S.chase.x)/T).toFixed(1)} tiles behind it (gap ${C.gap} px, then a ${GY.GEYSER.rest}-frame rest)`);
  const nearT=S.ens.filter(e=>e.k==='vent'&&Math.abs(vx(ROOMS[S.room],e.tx)-xt)<3*T);let bad=false;for(let k=0;k<20;k++){E.step(S,I(),[]);if(S.ens.some(e=>e.k==='vent'&&e.st===2&&Math.abs(vx(ROOMS[S.room],e.tx)-xt)<3*T))bad=true}
  ok(!bad,'no vent by his torch erupts as he comes back');
  const r=chaseRun(S);ok(r.ok,`...and from there the bot crosses (${r.secs.toFixed(1)} s)`);
  const A=atTorch('mxb',21,11,1),xa=vx(RB,21);ok(Math.abs(A.chase.x-GY.crest(C,GY.tau(C,xa-C.gap*GY.ASSIST.gap)-GY.GEYSER.rest)+(A.chase.t>-GY.GEYSER.rest?0:0))<4,`Assist restarts it further behind the torch (${((xa-A.chase.x)/T).toFixed(1)} tiles)`);
}

console.log('determinism, snapshots, saves');
{ const S=atPedestal();const script=k=>I({r:k%170<120,l:k%170>=150,j:k%29<6,jp:k%29===0});for(let k=0;k<120;k++){S.p.inv=1e9;E.step(S,script(k),[])}
  const snap=snapshot(S),tr=[];for(let k=0;k<600;k++){S.p.inv=1e9;E.step(S,script(k),[]);if(S.chase)tr.push(S.chase.t,S.chase.x,S.ens.map(e=>e.st).join(''))}
  const S2=newState();restore(S2,JSON.parse(JSON.stringify(snap)));const tr2=[];for(let k=0;k<600;k++){S2.p.inv=1e9;E.step(S2,script(k),[]);if(S2.chase)tr2.push(S2.chase.t,S2.chase.x,S2.ens.map(e=>e.st).join(''))}
  ok(tr.length>300&&JSON.stringify(tr)===JSON.stringify(tr2)&&JSON.stringify(S)===JSON.stringify(S2),`the sweep is deterministic through a JSON snapshot round trip (${tr.length/3} frames)`);
  const F=atPedestal(),F2=atPedestal();for(let k=0;k<700;k++){E.step(F,script(k),[]);E.step(F2,script(k),[])}ok(JSON.stringify(F)===JSON.stringify(F2),'two fresh runs of the same inputs end identical');
  const M=atPedestal();run(M,1,I({r:1}));while(!M.chase)run(M,1,I({r:1}));run(M,100,I());const d=persist(M);
  ok(d.chase&&d.chase.id==='molten'&&Number.isFinite(d.chase.x),'the save keeps the running chase (id, x)');
  const R2=resume(newState(),JSON.parse(JSON.stringify(d)));R2.cp={room:'mxa',tx:40,ty:11};E.enterRoom(R2,'mxa',E.spot(R2,RA,40,11));CH.resetChase(R2);
  ok(R2.chase.on&&Number.isFinite(R2.chase.t)&&R2.chase.n===0&&Object.values(R2.chase).every(v=>typeof v==='string'||Number.isFinite(v)),'reloaded mid-chase, it restarts behind his torch (plain numbers again)');
  const r=chaseRun(R2);ok(r.ok,`...and the bot crosses from there (${r.secs.toFixed(1)} s)`);
  const Q=atPedestal();run(Q,1,I({r:1}));while(!Q.chase)run(Q,1,I({r:1}));let lo=1,hi=0,okq=true;
  for(let k=0;k<400;k++){Q.p.inv=1e9;E.step(Q,I({r:k%3!==0}),[]);const v=CH.progress(Q),n=CH.nearness(Q);if(v<0||v>1||n<0||n>1)okq=false;lo=Math.min(lo,v);hi=Math.max(hi,v)}
  ok(okq&&hi>lo,`progress() (the OS 'shimmer', in quarters) and nearness() stay in 0..1 and grow as he goes (${lo.toFixed(2)}..${hi.toFixed(2)})`);
}

console.log('the other chases are untouched');
{ ok(CHASES.roots&&!CHASES.roots.kind&&CHASES.flood&&!CHASES.flood.kind&&CHASES.flood.tide,'roots and flood keep their entries (no kind)');
  ok(ORIG.kind==='geyser'&&ORIG.path.length>=2&&Number.isFinite(ORIG.from),`CHASES.molten (placeholder until the rooms exist): from ${ORIG.from}, ${ORIG.path.map(p=>p.join('@')).join(' -> ')}`);
  ok(NEXT.every(n=>ROOMS[n.room]),'NEXT names only real rooms (the Molten entries name m3, m6, m11)');
  const src=readFileSync(new URL('../game/rooms/index.js',import.meta.url),'utf8');
  ok(/need:'item:forged',room:'m3'/.test(src)&&/need:'item:claws',room:'m6'/.test(src)&&/need:'piece:molten',room:'m11'/.test(src)&&src.indexOf("need:'item:forged'")>src.indexOf("need:'piece:flood'"),'the Molten goals follow Flood\'s in the table (forged, claws, piece)');
}

console.log('art (a stand-in canvas)');
{ let n=0,bad=0;const ctx={set fillStyle(v){if(typeof v!=='string')bad++},fillRect(x,y,w,h){n++;if(![x,y,w,h].every(Number.isFinite))bad++}};
  const S=atPedestal();run(S,1,I({r:1}));while(!S.chase)run(S,1,I({r:1}));S.p.inv=1e9;let maxN=0;
  for(let k=0;k<400;k++){E.step(S,I(),[]);for(const e of S.ens){n=0;ART.drawMolten(ctx,S,RA,e,S.cam.x,S.cam.y,S.t,false,k%7===0);if(e.st===2)maxN=Math.max(maxN,n);ART.drawMolten(ctx,S,RA,e,S.cam.x,S.cam.y,S.t,true,false)}}
  const X=playState('mxe',3*T,FLOOR-PH);X.drillNow=[[40,9]];CI.cinderTouch(X,ROOMS.mxe,[]);X.vines=[{x:X.ens[1].x,y:X.ens[1].y,w:10,h:10}];run(X,3,I());
  for(let k=0;k<320;k++){E.step(X,I(),[]);for(const e of X.ens)ART.drawMolten(ctx,X,ROOMS.mxe,e,0,0,X.t,!!(k&1),k%9===0)}
  ok(!bad&&maxN>0&&maxN<400,`every state draws with whole fills only, no NaN (an erupting vent is ${maxN} fills at most)`);
  const m=readFileSync(new URL('../game/moltenart.js',import.meta.url),'utf8');ok(!/sprite\(|Math\.random|Date\.now|performance\.now/.test(m),'the art never touches the mascot\'s sprite cache, randomness or the clock');
  const all=['geysers.js','cinders.js','moltenart.js'].map(f=>readFileSync(new URL('../game/'+f,import.meta.url),'utf8')).join('');ok(!/Math\.random|Date\.now|performance\.now/.test(all),'no randomness or wall clock in the Molten modules');
}

Object.assign(CHASES.molten,ORIG);
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails?1:0);
