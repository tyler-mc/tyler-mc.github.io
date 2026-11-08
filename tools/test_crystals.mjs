// Crystals mechanics (A2, 2026-11-07): shard steps Q, moving platforms W, prism drifters Y and their beams, receivers R,
// crystal locks D (game/crystals.js) and the Echo Z (game/echo.js), in synthetic rooms only (the Crystals rooms come
// later). The rewind is the real one (game/undo.js, the key held through E.step). Plain node, no deps:
// node tools/test_crystals.mjs
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const G=new URL('../game/',import.meta.url).href;
const {T,newState,snapshot}=await import(G+'state.js');
const E=await import(G+'engine.js');
const {ROOMS,ORDER,AMB,parse}=await import(G+'rooms/index.js');
const P=await import(G+'player.js');
const CR=await import(G+'crystals.js');
const EC=await import(G+'echo.js');
const {spawnEnemies}=await import(G+'enemies.js');
const {ov}=E;
const FMT=await import(G+'dev/roomfmt.js');
let fails=0,passes=0;
const ok=(c,msg)=>{if(c){passes++;console.log('  ok  ',msg)}else{fails++;console.log('  FAIL',msg)}};
const note=msg=>console.log('  ..  ',msg);
const I=(o={})=>({l:0,r:0,u:0,d:0,j:0,jp:0,b:0,bp:0,z:0,zp:0,drag:null,any:0,...o});
const PH=P.PH,PW=P.PW,FLOOR=12*T,STAND=FLOOR-PH;
function playState(room,x,y,items={}){const S=newState();Object.assign(S,{lit:1,litT:60,match:1,mode:'play'});Object.assign(S.items,items);E.enterRoom(S,room,{x,y});return S}
const run=(S,n,f)=>{const evs=[];for(let i=0;i<n;i++)evs.push(...E.step(S,typeof f==='function'?f(i,S):f,[]));return evs};
const W=48;
/* rows: 0 rock, 1..11 air (walled), 12.. floor */
function grid(h=16,w=W){const g=[[...'#'.repeat(w)],...Array.from({length:11},()=>[...('#'+'.'.repeat(w-2)+'#')]),...Array.from({length:h-12},()=>[...'#'.repeat(w)])];
  return {g,set(x,y,c){g[y][x]=c;return this},rows(){return g.map(r=>r.join(''))}}}
const room=(id,at,gr,ents=[])=>{const src={id,name:id,biome:'crystals',at,grid:gr.rows(),ents};ROOMS[id]=parse(src);if(!ORDER.includes(id))ORDER.push(id);return ROOMS[id]};
const prism=S=>S.ens.findIndex(e=>e.k==='prism');

/* kq: a shard floor at cols 10..12 (row 12) over a pit; one with delay 60 at col 20 */
{const q=grid(18);for(let x=10;x<13;x++){q.set(x,12,'Q');for(let y=13;y<17;y++)q.set(x,y,'.')}q.set(20,12,'Q').set(3,11,'T');room('kq',[9000,9000],q,[{at:[20,12],delay:60}])}
/* kw: a platform at 10,9 moving 6 tiles right; one at 30,10 moving 3 up */
{const q=grid();q.set(10,9,'W').set(30,10,'W').set(3,11,'T');room('kw',[9100,9000],q,[{at:[10,9],dx:6,dy:0,sp:100,pause:10,w:3},{at:[30,10],dx:0,dy:-3,sp:50,pause:20,w:2}])}
/* ky: a drifter at 10,8 aiming right at a receiver at 30,8 (id a); a lock D (id a) column at 40 rows 9..11 */
{const q=grid();q.set(10,8,'Y').set(30,8,'R').set(3,11,'T');for(let y=9;y<12;y++)q.set(40,y,'D');
  room('ky',[9200,9000],q,[{at:[10,8],aim:'r',amp:0},{at:[30,8],id:'a'},...[9,10,11].map(y=>({at:[40,y],id:'a'}))])}
/* kr: a drifter low at 20,10 aiming up (for the ram), two receivers id v for one lock (the vault rule) */
{const q=grid();q.set(20,10,'Y').set(3,11,'T').set(30,4,'R').set(34,4,'R').set(44,11,'D').set(8,8,'Y');
  room('kr',[9300,9000],q,[{at:[20,10],aim:'u',amp:0},{at:[30,4],id:'v'},{at:[34,4],id:'v'},{at:[44,11],id:'v'},{at:[8,8],aim:'l',amp:24,sp:100}])}
/* kz: the Echo room (Z at 2,11), a torch */
{const q=grid();q.set(2,11,'Z').set(3,11,'T');room('kz',[9400,9000],q)}
/* kp: the plate trick. Plate at 4,11; gate column at 22 rows 1..11; Z; torch at 14 */
{const q=grid();q.set(4,11,'P').set(30,11,'Z').set(14,11,'T');for(let y=1;y<12;y++)q.set(22,y,'G');room('kp',[9500,9000],q)}
/* kx: a drifter aimed right at a cracked wall X (col 20) that hides a receiver (col 25): the K8 claws lock */
{const q=grid();q.set(10,8,'Y').set(20,8,'X').set(25,8,'R').set(30,11,'D').set(3,11,'T');room('kx',[9700,9000],q,[{at:[10,8],aim:'r',amp:0},{at:[25,8],id:'c'},{at:[30,11],id:'c'}])}
/* kp0: the same room without the Echo (the control) */
{const q=grid();q.set(4,11,'P').set(14,11,'T');for(let y=1;y<12;y++)q.set(22,y,'G');room('kp0',[9600,9000],q)}

console.log('parse, validators, editor');
{ const R=ROOMS.ky,Z=ROOMS.kz;
  ok(R.g[8][10]==='Y'&&R.g[8][30]==='R'&&R.g[9][40]==='D','the glyphs stay in R.g (the renderer reads them)');
  ok(R.crys.length===1&&R.crys[0].k==='Y'&&R.crys[0].aim==='r'&&R.rx.length===1&&R.rx[0].id==='a'&&R.locks.length===3&&R.lockAt['40,10']==='a','Y parses into R.crys with its ents; R and D carry their ids');
  ok(ROOMS.kq.qd['20,12']===60&&ROOMS.kq.qd['10,12']===undefined&&ROOMS.kq.cry===1,'Q ent delay is kept per tile');
  ok(Z.echo&&Z.echo.lag===120&&Z.cry===1,'Z sets R.echo (lag 120 by default)');
  ok(ORDER.filter(id=>ROOMS[id].biome!=='crystals').every(id=>!ROOMS[id].cry&&!ROOMS[id].crys.length),'every existing room parses with no crystal things');
  ok(AMB.crystals===.6,'AMB.crystals is .6');
  const er=parse({id:'xe',name:'xe',biome:'crystals',at:[0,0],grid:['###','#T#','###'],ents:[{at:[0,0],erase:60}]});
  ok(er.erase===.6&&ROOMS.kz.erase===0&&FMT.problems([{id:'xe',name:'xe',biome:'crystals',at:[0,0],grid:['###','#T#','###'],ents:[{at:[0,0],erase:60}]}]).every(m=>!/does nothing/.test(m.msg)),'ent erase:60 (percent, any tile) gives R.erase .6 (K9 corners), with no false warning');
  const M=parse({id:'mix',name:'mix',biome:'crystals',at:[0,0],grid:['######','#MVWY#','######'],ents:[]}),en=spawnEnemies(M);
  ok(en[0].k==='moss'&&en[1].k==='vent'&&en[2].k==='plat'&&en[3].k==='prism'&&en[2].cr&&en[3].cr&&en[2].soft&&!en[3].soft,'platforms and drifters spawn after the vents (older indices hold); a platform is soft, a drifter is not');
  const r={id:'xc',name:'Crystals test',biome:'crystals',at:[0,0],grid:['########','#ZWY.R.#','#QQQQDT#','########'],ents:[{at:[1,1],lag:120},{at:[2,1],dx:3,dy:-1,sp:50,w:2,pause:30},{at:[3,1],aim:'r',amp:12,sp:100,beam:120},{at:[5,1],id:'a'},{at:[5,2],id:'a'},{at:[1,2],delay:30}]};
  ok(FMT.check(r)==='','the editor format check accepts Q W Y R D Z and their ent fields');
  let py='';try{py=execFileSync('python3',['-I','-c',`import sys,json;sys.path.insert(0,${JSON.stringify(new URL('.',import.meta.url).pathname)});import dev_server as d;print(json.dumps(d.clean(json.loads(sys.stdin.read()),'x')['grid']))`],{input:JSON.stringify(r),encoding:'utf8'}).trim()}catch(e){py='ERR '+String(e.stderr||e.message).slice(0,200)}
  ok(py===JSON.stringify(r.grid).replace(/","/g,'", "'),`the dev server's validator accepts the glyphs (${py.slice(0,80)})`);
  const msgs=FMT.problems([r]).map(m=>m.msg).join(' | ');
  ok(!/does nothing/.test(msgs)&&!/never opens/.test(msgs),`no false warnings on crystal ents (${msgs.slice(0,160)})`);
  const bad=FMT.problems([{id:'xd',name:'xd',biome:'crystals',at:[0,0],grid:['######','#DW.T#','######'],ents:[{at:[1,1],id:'b'}]}]).map(m=>m.msg).join(' | ');
  ok(/Crystal lock 'b' has no receiver/.test(bad)&&/never moves/.test(bad),'problems() flags a lock with no receiver and a platform with no travel');
}

console.log('shard steps (Q)');
{ const S=playState('kq',10*T+3,STAND),evs=[];let fell=-1,gone=-1;
  for(let f=1;f<=60&&fell<0;f++){evs.push(...E.step(S,I(),[]));if(gone<0&&!E.solid(S,ROOMS.kq,11,12))gone=f;if(S.p.y>STAND+2)fell=f}
  ok(evs.includes('shard_crack')&&evs.includes('shard_fall'),'standing on it cracks it, then it falls (shard_crack, shard_fall)');
  ok(gone===24||gone===25,`it stops being solid 24 frames after he stands on it (frame ${gone})`);
  ok(fell>=gone&&fell<=gone+5,`and he drops with it (frame ${fell})`);
  ok(E.solid(S,ROOMS.kq,20,12)&&S.cr.q['20,12']===undefined,'a shard he never stood on is untouched (only started shards are kept in S.cr.q)');
  ok(CR.shardState(S,ROOMS.kq,11,12).st>=2&&CR.shardState(S,ROOMS.kq,20,12).st===0,'shardState: falling/gone vs intact');
  E.enterRoom(S,'kq',{x:10*T+3,y:STAND});ok(E.solid(S,ROOMS.kq,11,12)&&JSON.stringify(S.cr)==='{}','re-entering the room brings it back');
  const S2=playState('kq',20*T+3,STAND);let g2=-1;for(let f=1;f<=80;f++){E.step(S2,I(),[]);if(g2<0&&!E.solid(S2,ROOMS.kq,20,12))g2=f}
  ok(g2===60||g2===61,`ent delay 60 holds it 60 frames (frame ${g2})`);
  ok(E.solid(S,ROOMS.kq,9,12)&&E.solid({...S,cr:{q:{'0,12':999}}},ROOMS.ky,-1,12),'a tile seen past the room edge stays solid');
}
console.log('shard steps and the rewind');
{ const S=playState('kq',10*T+3,STAND,{undo:1});run(S,40,I());
  ok(!E.solid(S,ROOMS.kq,11,12)&&S.p.y>STAND,'stood on, it falls and he falls');
  const evs=run(S,25,I({z:1,zp:0}));
  ok(evs.includes('undo_start')&&E.solid(S,ROOMS.kq,11,12)&&S.p.y<=STAND+1e-6,'holding Undo restores the shard step under him (S.cr is in the buffer)');
}

console.log('moving platforms (W)');
{ const S=playState('kw',10*T+8,9*T-PH),R=ROOMS.kw,pl=()=>S.ens.filter(e=>e.k==='plat');
  run(S,2,I());ok(S.p.ground&&Math.abs(S.p.y+PH-9*T)<.01,'he stands on the platform (cryBoxes in the engine\'s solids)');
  const x0=S.p.x,px0=pl()[0].x;run(S,40,I());const d=pl()[0].x-px0;
  ok(d>20&&Math.abs((S.p.x-x0)-d)<.01&&S.p.ground,`it carries him: platform moved ${d.toFixed(1)} px, he moved ${(S.p.x-x0).toFixed(1)}`);
  /* the cycle: 10 pause, 72 px at 1 px/frame, 10 pause, back */
  const e=spawnEnemies(R).find(e=>e.k==='plat'),xs=[];const S0={p:{dead:1},ens:[e]};for(let f=0;f<200;f++){CR.stepCrystal(S0,R,e,[]);xs.push(e.x)}
  ok(Math.max(...xs)===16*T&&xs.filter(x=>x===16*T).length>=10&&xs[199]<16*T,'it runs to tile+dx, pauses there, and comes back');
  const U=playState('kw',30*T+2,10*T-PH),u=()=>U.ens.find(e=>e.k==='plat'&&e.hx===30*T);run(U,2,I());const y0=U.p.y;run(U,80,I());
  ok(U.p.ground&&U.p.y<y0-20&&Math.abs(U.p.y+PH-u().y)<.01,`a rising platform lifts him (${(y0-U.p.y).toFixed(1)} px up)`);
  ok(CR.platRects(S).length===2&&CR.platRects(S)[0].h===CR.CRY.ph,'platRects for the renderer');
}

console.log('prism drifter (Y), beams, receivers, locks (R, D)');
{ const R=ROOMS.ky,S=playState('ky',3*T,STAND),i=prism(S);
  const b=CR.beamSeg(S,R,S.ens[i]);
  ok(b&&b.y0===b.y1&&b.y0===8*T+6&&b.x1===30*T&&b.rx&&b.rx[0]===30,'its beam runs along its row to the first solid tile, the receiver');
  ok(E.solid(S,R,40,10),'the lock is shut');
  let lat=-1;const evs=[];for(let f=1;f<=40;f++){const e=E.step(S,I(),[]);evs.push(...e);if(lat<0&&e.includes('receiver_lock'))lat=f}
  ok(lat===30,`the receiver latches after 30 frames lit (frame ${lat})`);
  ok(S.latch['ky:R:30,8']===1&&S.latch['ky:D:a']===1&&evs.includes('latch')&&evs.includes('lock_open')&&!E.solid(S,R,40,10)&&CR.rxFill(S,R,30,8)===1,'its lock opens for good (S.latch keys, the latch event saves it)');
  /* the beam hurts him */
  const H=playState('ky',20*T,8*T-6);run(H,1,I());ok(H.p.dead>0&&H.flash===prism(H),'standing in the beam glitches him out (flash: the drifter)');
  /* a vine blocks it */
  const V=playState('ky',3*T,STAND);V.vines=[{x:200,by:130,max:48,t:90,len:48,y:82,w:10,h:51,s:1,fx:200}];
  run(V,40,I());const bv=CR.beamSeg(V,R,V.ens[prism(V)]);
  ok(bv&&bv.x1===200&&!bv.rx&&!V.latch['ky:R:30,8']&&!V.cr.rx['30,8'],'a live vine across the beam stops it at the vine; the receiver stays dark');
  V.vines[0].dead=1;ok(CR.beamSeg(V,R,V.ens[prism(V)]).x1===30*T,'a dead vine does not');
  /* a root wrap cuts the beam and sinks it */
  const W2=playState('ky',3*T,STAND),k=prism(W2),y0=W2.ens[k].y;W2.ens[k].wrap=240;run(W2,30,I());
  ok(!CR.beamSeg(W2,R,W2.ens[k])&&W2.ens[k].y>y0+10&&!W2.cr.rx['30,8'],'wrapped, it sinks and its beam is cut');
  run(W2,330,I());ok(W2.ens[k].wrap===0&&W2.ens[k].ret===0&&Math.abs(W2.ens[k].y-y0)<1e-9&&CR.beamSeg(W2,R,W2.ens[k]),'it unwraps, floats back to its line and the beam returns');
  /* pulse */
  const pz={...S.ens[i],per:60,t:0};ok(CR.beamOn({...pz,t:10})&&!CR.beamOn({...pz,t:40}),'ent beam: an on/off period on its own clock');
}
{ const R=ROOMS.kr,S=playState('kr',15*T,STAND,{board:1}),k=S.ens.findIndex(e=>e.k==='prism'&&e.aim==='u');S.p.dc=1;S.p.face=1;
  const b0=CR.beamSeg(S,R,S.ens[k]);ok(b0&&b0.x0===20*T+6&&b0.y1===T,'an up-aimed beam runs up its column to the ceiling');
  const hx=S.ens[k].hx,evs=run(S,70,f=>I({r:f<50?1:0,b:f===0,bp:f===0}));
  ok(evs.includes('dash')&&evs.includes('prism_shatter'),'a dash into it rams it (prism_shatter)');
  ok(S.ens[k].lens===0&&S.ens[k].hx===hx+6&&!CR.beamSeg(S,R,S.ens[k]),'the ram shoves it half a tile and shatters its lens: no beam');
  ok(!S.p.dead&&!evs.includes('die'),'and he does not die ramming it (grace)');
  E.enterRoom(S,'kr',{x:15*T,y:STAND});ok(S.ens[k].lens===1&&S.ens[k].hx===hx,'re-entering the room restores the lens');
  /* the vault rule: a lock opens only when every receiver of its id has latched */
  const V=playState('kr',3*T,STAND);V.latch['kr:R:30,4']=1;run(V,2,I());ok(E.solid(V,R,44,11),'one of two receivers latched: the lock stays shut');
  V.cr.rx={'34,4':29};const sw=V.ens.findIndex(e=>e.k==='prism'&&e.aim==='l');
  /* move the swinging drifter onto row 4, east of the first receiver, aimed at the second */
  V.ens[sw].hy=4*T-6+3;V.ens[sw].hx=32*T;V.ens[sw].aim='r';V.ens[sw].amp=0;V.ens[sw].ph=0;run(V,3,I());
  ok(V.latch['kr:R:34,4']&&V.latch['kr:D:v']&&!E.solid(V,R,44,11),'the last receiver of its id latches and the lock opens');
  /* drift: a drifter aimed right bobs up and down on its own phase */
  const D=playState('kr',30*T,STAND),e=D.ens[sw],ys=[];for(let f=0;f<240;f++){E.step(D,I(),[]);ys.push(e.y)}
  ok(Math.max(...ys)-Math.min(...ys)>40&&ys.every((y,j)=>Math.abs(y-(8*T+Math.sin(e.sp*(j+1))*24))<1e-6),'an aim-l drifter drifts up and down (amp 24)');
}

console.log('the Echo (Z)');
{ const R=ROOMS.kz,S=playState('kz',4*T,STAND),pos=[],evs=[];
  for(let f=0;f<150;f++){evs.push(...E.step(S,I({r:f<100?1:0}),[]));pos.push([S.p.x,S.p.y])}
  const Ech=S.echo,n=Ech.log.length/3;
  ok(evs.includes('echo_wake')&&Ech.on===1&&Ech.lag===120,'it wakes when he first moves (echo_wake)');
  ok(Ech.i===n-Ech.lag,`its index is log length - lag (${Ech.i} = ${n} - 120)`);
  const q=EC.echoPos(S),k=pos.length-120;ok(q&&Math.abs(q.x-pos[k][0])<.01&&Math.abs(q.y-pos[k][1])<.01,'it shows the log entry lag frames back (where he was 120 live frames before the newest entry)');
  ok(n===151||n===150,`the log has one entry per live frame (${n})`);
  /* he stopped at frame 100: the Echo walks into him and it hurts */
  let died=-1;for(let f=0;f<200&&died<0;f++){E.step(S,I(),[]);if(S.p.dead)died=f}
  ok(died>0&&S.flash==='echo','standing still, his Echo catches him and glitches him out (flash: echo)');
  ok(!S.echo.on&&S.echo.log.length===0,'a death clears the log (it sleeps)');
  /* harmless for its first 20 frames: one step away from the start and stand */
  const H=playState('kz',4*T,STAND);let hd=-1;for(let f=0;f<60&&hd<0;f++){E.step(H,I({r:f===0?1:0}),[]);if(H.p.dead)hd=f}
  ok(hd>=20&&hd<=22,`harmless in its first 20 frames after waking, then it hurts (died at frame ${hd})`);
  /* the root wrap: a burst on it pauses its replay and makes it a solid step for 240 frames */
  const Wr=playState('kz',4*T,STAND);run(Wr,140,f=>I({r:f<130?1:0}));const b=EC.echoBox(Wr);
  Wr.roots.push({x:b.x+9,y:b.y+PH,t:0,g:0,hit:[]});Wr.p.inv=999;const ew=run(Wr,1,I()),i0=Wr.echo.i;
  ok(ew.includes('echo_wrap')&&Wr.echo.wrap===240,'a root burst on it wraps it');
  run(Wr,100,I());ok(Wr.echo.i===i0&&Wr.echo.log.length/3>i0+100,'wrapped, its replay pauses (the log keeps growing)');
  const wb=EC.echoBox(Wr);ok(CR.cryBoxes(Wr).some(q=>q.x===wb.x&&q.y===wb.y&&q.w===PW),'and it is a solid box in the engine\'s solids');
  ok(EC.echoHarmless(Wr)>0&&EC.echoHolds(Wr,{x:b.x,y:b.y+20,w:10,h:4}),'it is harmless while wrapped and still a plate weight');
  run(Wr,150,I());ok(Wr.echo.wrap===0&&Wr.echo.i>i0,'240 live frames later (hit-stop frames do not count) it unwraps and replays on');
  /* the board ram: back 30 log frames, once per dash */
  const Rm=playState('kz',4*T,STAND);run(Rm,200,f=>I({r:f<180?1:0}));const ib=Rm.echo.i,bx=EC.echoBox(Rm);
  EC.stepEcho(Rm,R,[],{x:bx.x,y:bx.y,w:PW,h:PH});ok(Rm.echo.i===ib+1-30,'a ram pushes it back 30 log frames');
  EC.stepEcho(Rm,R,[],{x:bx.x,y:bx.y,w:PW,h:PH});ok(Rm.echo.i===ib+1-30+1,'once per dash (cooldown)');
  /* off in a chase */
  const C=playState('kz',4*T,STAND);C.chase={id:'crystals',on:1,y:0,t:0,w:0};C.echo.sx=undefined;
  for(let f=0;f<30;f++)EC.stepEcho(C,R,[],null),C.p.x+=1;ok(!C.echo.on,'it never wakes while a chase runs');
}

console.log('the Echo clock rule through a real rewind');
{ const R=ROOMS.kz,S=playState('kz',4*T,STAND,{undo:1});run(S,200,f=>I({r:f<190?1:0}));
  const n0=S.echo.log.length,i0=S.echo.i,tail=S.echo.log.slice(n0-120*3);
  let fr=0,frozen=true;for(let f=0;f<90;f++){E.step(S,I({z:1,zp:f===0}),[]);if(S.undo.on){fr++;if(S.echo.log.length!==n0||S.echo.i!==i0)frozen=false}}
  ok(fr===90&&frozen,`during the rewind (${fr} frames) the log and its index are frozen`);
  ok(S.echo.log.length===n0,'the log is never truncated: it still holds the erased frames');
  const evs=run(S,1,I());ok(evs.includes('undo_end')&&S.undo.ago===1,'the rewind ends (the key let go)');
  ok(S.echo.i===S.echo.log.length/3-120,'after the rewind the lag is still exactly 120');
  ok(EC.echoHarmless(S)>0,'harmless right after the rewind');
  run(S,44,I());ok(EC.echoHarmless(S)>0,'still harmless 45 frames after it');run(S,1,I());
  ok(EC.echoHarmless(S)===0,'and hurts again on frame 46');
  /* it replays the erased tail, then jumps at the seam */
  const S2=playState('kz',4*T,STAND,{undo:1});run(S2,200,f=>I({r:f<190?1:0}));const nn=S2.echo.log.length/3,er=S2.echo.log.slice();
  run(S2,90,f=>I({z:1,zp:f===0}));const seen=[];let sj=-1;
  for(let f=0;f<130;f++){E.step(S2,I({l:1}),[]);seen.push(EC.echoPos(S2));if(sj<0&&S2.echo.sj===0)sj=f}
  const k=nn-120;ok(seen.slice(0,110).every((q,j)=>q.x===er[(k+1+j)*3]),'it replays the erased frames (the last 120 before the rewind) in order');
  ok(sj>=110&&sj<=121,`then it crosses the seam onto his new path (sj 0 at frame ${sj}: the flicker)`);
}

console.log('Undo against crystal things (rewound vs anchored)');
{ /* a ram's shattered lens comes back with a rewind */
  const S=playState('kr',15*T,STAND,{board:1,undo:1}),k=S.ens.findIndex(e=>e.k==='prism'&&e.aim==='u');S.p.dc=1;S.p.face=1;
  run(S,20,f=>I({r:1,b:f===0,bp:f===0}));const shat=S.ens[k].lens===0;run(S,6,f=>I({z:1,zp:f===0}));
  ok(shat&&S.ens[k].lens===1&&CR.beamSeg(S,ROOMS.kr,S.ens[k]),'Undo re-forms a shattered lens (S.ens is rewound)');
}
{ /* a latched receiver and its open lock are anchored; a ring part-filled is rewound */
  const S=playState('ky',3*T,STAND,{undo:1});run(S,40,I());run(S,30,f=>I({z:1,zp:f===0}));
  ok(S.latch['ky:R:30,8']&&S.latch['ky:D:a']&&!E.solid(S,ROOMS.ky,40,10),'a rewind never shuts a latched receiver or its lock (S.latch is anchored)');
  const U=playState('ky',3*T,STAND,{undo:1});run(U,20,I());const n=U.cr.rx['30,8'];run(U,6,f=>I({z:1,zp:f===0}));
  ok(n===20&&U.cr.rx['30,8']===n-12&&!U.latch['ky:R:30,8'],`a filling ring rewinds with S.cr (${n} -> ${U.cr.rx['30,8']})`);
}
{ /* a rewound platform runs backward */
  const S=playState('kw',3*T,STAND,{undo:1}),pl=()=>S.ens.find(e=>e.k==='plat'&&e.hx===10*T),xs=[];
  for(let f=0;f<60;f++){E.step(S,I(),[]);xs.push(pl().x)}const back=[];
  for(let f=0;f<10;f++){E.step(S,I({z:1,zp:f===0}),[]);back.push(pl().x)}
  ok(back.every((x,j)=>x===xs[59-2*(j+1)]),`a rewound platform runs back along its path, two frames a step (${xs[59]} -> ${back[9]})`);
}
{ /* K4 solution B through the engine: root-wrap the Echo while it replays the plate stand; its body is the weight */
  const S=playState('kp',14*T,STAND,{root:1}),R=ROOMS.kp;S.p.root=1;
  /* walk onto the plate, stand 60 frames, step west off it (turning back east would walk into his Echo) */
  for(let f=0;f<400&&!(S.p.x<=4*T+1);f++)E.step(S,I({l:1}),[]);
  run(S,60,I());run(S,14,I({l:1}));
  let on=-1;for(let f=0;f<200&&on<0;f++){E.step(S,I(),[]);const b=EC.echoBox(S);if(b&&Math.abs(b.x-4*T)<2&&S.echo.i>0&&S.plate&&!ov(S.p,b))on=f}
  /* the root burst on it (the box engine burst() makes at his feet; the double jump itself is the player's) */
  const b=EC.echoBox(S);S.roots.push({x:b.x+9,y:b.y+PH,t:0,g:0,hit:[]});run(S,4,I());
  ok(on>=0&&S.echo.wrap>0,`the root burst wraps the Echo on the plate (x ${(b.x/T).toFixed(2)} tiles)`);
  /* jump over it and run to the gate: the wrapped Echo holds the plate the whole way */
  const evs=run(S,200,f=>I({r:1,j:f<16?1:0,jp:f===0?1:0}));
  ok(!evs.includes('die')&&S.latch.kp===1&&S.echo.wrap>0,'it holds the plate while he runs to the gate, and the gate latches (solution B)');
  /* stand on the wrapped Echo: it is a step, and the root recharges there */
  const q=EC.echoBox(S);S.p.inv=999;S.p.x=q.x;S.p.y=q.y-PH-6;S.p.vy=0;S.p.root=0;S.p.inv=999;run(S,10,I());
  ok(S.p.ground&&Math.abs(S.p.y+PH-q.y)<.01&&S.p.root===1,'he can stand on the wrapped Echo, and the root jump recharges there');
}
{ /* K8 claws lock: the beam stops at cracked rock; drilled, it reaches the hidden receiver */
  const S=playState('kx',3*T,STAND),R=ROOMS.kx,e=S.ens[prism(S)];
  const b0=CR.beamSeg(S,R,e);ok(b0.x1===20*T&&!b0.rx,'the beam stops at the cracked wall');
  S.drilled.push([20,8]);const b1=CR.beamSeg(S,R,e);ok(b1.x1===25*T&&b1.rx&&b1.rx[0]===25,'drilled, the beam reaches the receiver behind it');
  run(S,31,I());ok(S.latch['kx:D:c']&&!E.solid(S,R,30,11),'and its lock opens');
}
{ /* a real dash into the Echo: it is pushed back 30 log frames (along his dash), harmless 20 frames; he dashes through */
  const S=playState('kz',4*T,STAND,{board:1}),evs=[];S.p.dc=1;run(S,150,f=>I({r:f<140?1:0}));
  let f=0;for(;f<200;f++){const b=EC.echoBox(S);if(b&&S.p.x-(b.x+PW)<30)break;E.step(S,I(),[])}
  const i0=S.echo.i;for(let g=0;g<120;g++)evs.push(...E.step(S,I({l:1,b:g===0,bp:g===0}),[]));
  ok(evs.includes('dash')&&evs.includes('echo_ram'),'a dash into the Echo rams it (echo_ram)');
  ok(!evs.includes('die'),'and he dashes through it and runs on without dying');
}

console.log('the plate trick (K4/K8 rule): stand on the plate, rewind 3 s, walk to the gate');
function plateRun(id,rewind){
  const R=ROOMS[id],S=playState(id,14*T,STAND,{undo:1}),evs=[];
  /* walk west to the plate (10 tiles, ~80 frames), then stand on it */
  for(let f=0;f<400&&!(S.p.x<=4*T+1);f++)evs.push(...E.step(S,I({l:1}),[]));
  evs.push(...run(S,105,I()));   /* 80 walking + 105 standing: a full 180-frame buffer, and under 120 on the plate (the Echo would reach him) */
  const plate0=S.plate;
  let steps=0;if(rewind)for(let f=0;f<95;f++){evs.push(...E.step(S,I({z:1,zp:f===0}),[]));if(S.undo.on)steps++}
  const x0=S.p.x;let latched=-1;
  for(let f=0;f<240;f++){evs.push(...E.step(S,I({r:1}),[]));if(latched<0&&S.latch[id])latched=f;if(S.p.x>40*T)break}
  return {S,evs,plate0,x0,latched,steps,dead:evs.includes('die')};
}
{ const A=plateRun('kp',1);
  ok(A.plate0===1,'standing on the plate holds it');
  ok(A.steps===90,`the rewind is a full 3 s: 90 steps of 2 frames (${A.steps})`);
  ok(A.x0>11*T,`the rewind drops him back near where he started (x ${(A.x0/T).toFixed(1)} tiles)`);
  ok(A.latched>0&&A.S.latch.kp===1,`his Echo holds the plate while he walks to the gate, and it latches (frame ${A.latched} after the rewind)`);
  ok(!A.dead&&!A.S.p.dead&&A.S.p.x>30*T,'he does not die, and he is through');
  const B=plateRun('kp',0);ok(B.latched<0&&!B.S.latch.kp,'control: without the rewind the gate shuts before he gets there');
  const C=plateRun('kp0',1);ok(C.latched<0&&!C.S.latch.kp0,'control: the rewind alone (no Echo) does not open it');
}

console.log('determinism and the clock rule (no S.t)');
{ const script=f=>I({r:f%200<120?1:0,l:f%200>=150?1:0,j:f%97===5?1:0,jp:f%97===5?1:0});
  const go=(t0,id)=>{const S=playState(id,4*T,STAND);S.t=t0;run(S,400,script);return JSON.stringify({cr:S.cr,ens:S.ens,echo:S.echo,p:S.p})};
  for(const id of ['kq','kw','ky','kr','kz'])ok(go(0,id)===go(0,id)&&go(0,id)===go(123457,id),`${id}: the same input gives the same state, whatever S.t is`);
  const src=readFileSync(new URL('../game/crystals.js',import.meta.url),'utf8')+readFileSync(new URL('../game/echo.js',import.meta.url),'utf8');
  ok(!/Math\.random|Date\.|performance\.now|S\.t\b/.test(src.replace(/\/\*[\s\S]*?\*\//g,'')),'crystals.js and echo.js use no Math.random, no wall clock and no S.t');
  const S=playState('kz',4*T,STAND);run(S,200,f=>I({r:f<150?1:0}));ok(JSON.stringify(snapshot(S).echo)===JSON.stringify(S.echo)&&JSON.stringify(snapshot(S).cr)===JSON.stringify(S.cr),'S.cr and S.echo are plain JSON');
}

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails?1:0);
