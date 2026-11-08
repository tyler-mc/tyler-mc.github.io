// Crystals rooms K6..K10 and the delete chase (agent R2, 2026-11-07): Prism Gallery, Atrium, Vault Gate, Delete Hush,
// Delete Core, on the real step. Contract: ~/.claude/plans/wake-up-crystals-beat-sheet.md sections 5 and 7.
// Distance gates are proved by an exhausted search on a copy of the room parsed far away (solid edges), each with a control
// the same search solves; searches never own Undo (each snapshot would copy the 180-frame buffer) and strip the Echo
// (removing a hazard keeps an impossibility proof valid). Searches that hold the claws cannot always exhaust (vines grow
// and wither): those are labelled evidence, as in tools/test_molten.mjs. The Undo and Echo locks are proved by scripted
// bots that pass with Undo and fail without it. Bots search on an Undo-free copy and replay the inputs on the real state.
// Plain node, no deps: node --max-old-space-size=8000 tools/test_crystals_rooms2.mjs   (QUICK=1 skips the slow proofs;
// SECTIONS=layout,k6,k7,k8,k9,chase picks sections)
const G=new URL('../game/',import.meta.url).href;
const {T,newState,snapshot,restore,PIECES}=await import(G+'state.js');
const E=await import(G+'engine.js');
const {ROOMS,ORDER,CHASES,NEXT,AMB,parse,roomAtTile,perchOf}=await import(G+'rooms/index.js');
const {VINE}=await import(G+'claws.js');
const CR=await import(G+'crystals.js');
const EC=await import(G+'echo.js');
const SW=await import(G+'sweep.js');
const CH=await import(G+'chases.js');
const FMT=await import(G+'dev/roomfmt.js');
const fs=await import('node:fs');
let fails=0,passes=0;
const ok=(c,msg)=>{if(c){passes++;console.log('  ok  ',msg)}else{fails++;console.log('  FAIL',msg)}};
const note=msg=>console.log('  ..  ',msg);
const QUICK=!!process.env.QUICK;
const SEC=process.env.SECTIONS?process.env.SECTIONS.split(','):null,want=n=>!SEC||SEC.includes(n);
const I=(o={})=>({l:0,r:0,u:0,d:0,j:0,jp:0,b:0,bp:0,z:0,zp:0,drag:null,any:0,...o});
const PW=18,PH=24,CK=PIECES.indexOf('crystals');
const IDS=['k6','k7','k8','k9','k10'],NAMES=['Prism Gallery','Atrium','Vault Gate','Delete Hush','Delete Core'];
const ALL={root:1,board:1,forged:1,claws:1};
function playState(room,x,y,items={},assist=0){const S=newState();Object.assign(S,{lit:1,litT:60,match:1,mode:'play',assist});Object.assign(S.items,items);S.placed=[1,1,1,0];S.pieces=[1,1,1,0];E.enterRoom(S,room,{x,y});if(items.root)S.p.root=1;if(items.board)S.p.dc=1;return S}
const run=(S,n,f)=>{const evs=[];for(let i=0;i<n;i++)evs.push(...E.step(S,typeof f==='function'?f(i,S):f,[]));return evs};
const ft=S=>S.p.y+PH,wxp=S=>ROOMS[S.room].at[0]*T+S.p.x,wyp=S=>ROOMS[S.room].at[1]*T+S.p.y;
const sec=n=>(n/60).toFixed(1);
const on=(id,f)=>S=>S.room===id&&f(S);

/* the search (reachFine: test_molten's best-first search over short macros on the real step, with a key that also holds the
   Crystals state: shard timers, receiver rings, latches, drifters, platforms, the plate, the Echo's index), enc/dec and the
   bot (Bot, its per-room legs) are in tools/crystals_reach.mjs, shared with tools/test_crystals_chain.mjs */
const RK=await import('./crystals_reach.mjs');
const {reachFine:reach,enc,dec,Bot,k7trick,k7chamber,k8trick,k8,LANDING}=RK;
/* a copy of a room parsed far away (no neighbours, so its edges are solid); noZ strips the Echo */
const SRC={};for(const id of IDS)SRC[id]=(await import(G+`rooms/crystals_${id}.js`)).default;
let CN=0;
function copyRoom(id,{noZ=true,edit,noPulse=true,crop}={}){let grid=SRC[id].grid.slice();const [x0,y0,x1,y1]=crop||[0,0,grid[0].length-1,grid.length-1];if(noZ)grid=grid.map(r=>r.replace(/Z/g,'.'));
  /* pulsed drifters (an ent beam period) only add hazards and a clock to the key: a proof copy drops them */
  if(noPulse)for(const e of SRC[id].ents||[])if(e.beam>0&&grid[e.at[1]][e.at[0]]==='Y')grid[e.at[1]]=grid[e.at[1]].slice(0,e.at[0])+'.'+grid[e.at[1]].slice(e.at[0]+1);
  if(edit)grid=edit(grid);grid=grid.slice(y0,y1+1).map(r=>r.slice(x0,x1+1));
  const ents=(SRC[id].ents||[]).filter(e=>e.at[0]>=x0&&e.at[0]<=x1&&e.at[1]>=y0&&e.at[1]<=y1).map(e=>({...e,at:[e.at[0]-x0,e.at[1]-y0]}));
  const cid='c'+(CN++)+id;ROOMS[cid]=parse({id:cid,name:'copy of '+id,biome:'crystals',at:[70000+CN*300,70000],grid,ents});return cid}
function proof(label,S,target,o,ctrl,{evidence=false}={}){
  if(QUICK){note(`(QUICK) skipped: ${label}`);return}
  const t0=Date.now(),r=reach(S,target,{budget:evidence?60000:400000,...o});
  const c=ctrl?reach(ctrl.S,ctrl.target||target,{budget:200000,...o,...ctrl.o}):null;
  const how=r.exhausted?`search exhausted after ${r.nodes} nodes`:`not found in ${r.nodes} nodes steered toward it (evidence, not exhausted)`;
  ok(!r.found&&(r.exhausted||evidence)&&(!ctrl||c.found),`${label}: no route (${how})${ctrl?`; control ${ctrl.label}: ${c.found?'found in '+sec(c.frames)+' s':'NOT FOUND'}`:''} [${((Date.now()-t0)/1000).toFixed(0)} s]${r.found?' LEAK: found in '+sec(r.frames)+' s':''}`)}
const stand=(id,x0,x1,row)=>on(id,S=>S.p.ground&&S.p.x+PW>x0*T+2&&S.p.x<(x1+1)*T-2&&Math.abs(ft(S)-row*T)<.5);
const latchAll=S=>{for(const id of ORDER){const R=ROOMS[id];if(R.gates.length)S.latch[id]=1;for(const l of R.locks)S.latch[id+':D:'+l.id]=1;for(const r of R.rx)S.latch[CR.rxKey(R,r.tx,r.ty)]=1}};
const TIMES={},REC={};

/* ---------------- layout ---------------- */
console.log('layout');
const RM=IDS.map(id=>ROOMS[id]);
if(want('layout')){
  ok(RM.every(Boolean)&&RM.map(R=>R.name).join(',')===NAMES.join(',')&&RM.every(R=>R.biome==='crystals'),`five rooms: ${IDS.map((id,i)=>id+' '+NAMES[i]).join(', ')}`);
  const AT={k6:-114,k7:-145,k8:-164,k9:-183,k10:-202},HT={k6:19,k7:31,k8:19,k9:19,k10:19};
  ok(RM.every(R=>R.at[0]===0&&R.at[1]===AT[R.id]&&R.w===40&&R.h===HT[R.id]),'the geometry contract: x 0, width 40, at y -114/-145/-164/-183/-202, heights 19/31/19/19/19');
  const FL={k6:[31,35],k7:[4,8],k8:[31,35],k9:[4,8],k10:[31,35]},CE={k6:[4,8],k7:[31,35],k8:[4,8],k9:[31,35]};
  const open=c=>!'#=GX'.includes(c);
  ok(RM.every(R=>{const [a,b]=FL[R.id];for(let x=a;x<=b;x++)if(!open(R.g[R.h-1][x])||!open(R.g[R.h-2][x]))return false;return true}),'every floor hole is open through both floor rows at the contract columns (K6 31-35, K7 4-8, K8 31-35, K9 4-8, K10 31-35)');
  ok(RM.every(R=>{const c=CE[R.id];if(!c)return !R.g[0].split('').some(open);for(let x=c[0];x<=c[1];x++)if(!open(R.g[0][x]))return false;return true}),'every ceiling hole is open at the contract columns; K10 has a closed top');
  /* the drop hatch (cols 18-20): Q at row h-2 with row h-1 open, so his box is clear of it at the seam; the slot over it */
  const hatch=R=>[18,19,20].every(x=>R.g[R.h-2][x]==='Q'&&R.g[R.h-1][x]==='.'),slot=R=>[18,19,20].every(x=>R.g[0][x]==='.');
  ok(hatch(ROOMS.k10)&&slot(ROOMS.k9)&&hatch(ROOMS.k7)&&slot(ROOMS.k6)&&hatch(ROOMS.k6),'the drop column (cols 18-20): K10 hatch -> K9 slot; K7 hatch -> K6 slot; K6 hatch -> K5 (Q at row h-2, row h-1 open)');
  ok(!hatch(ROOMS.k8)&&!slot(ROOMS.k8)&&!hatch(ROOMS.k9)&&[18,19,20].every(x=>ROOMS.k7.g[0][x]==='#'),'(deviation) K8 has no hatch and no slot: its moat and its pit need the full width; the chase leaves K9 by its floor hole and K8 by the contract hole');
  let clash=0;for(const R of RM)for(let y=0;y<R.h;y++)for(let x=0;x<R.w;x++)if(roomAtTile(R.at[0]+x,R.at[1]+y)!==R)clash++;
  ok(!clash,'no overlap with any room');
  let bad=[];for(const R of RM){const sides=[];for(let y=0;y<R.h;y++){sides.push([-1,y,0,y]);sides.push([R.w,y,R.w-1,y])}for(let x=0;x<R.w;x++){sides.push([x,-1,x,0]);sides.push([x,R.h,x,R.h-1])}
    for(const [ox,oy,ix,iy] of sides){const N=roomAtTile(R.at[0]+ox,R.at[1]+oy),io=open(R.g[iy][ix]);if(io&&!N)bad.push(R.id+' to nowhere '+ix+','+iy);
      if(N){const nc=N.g[R.at[1]+oy-N.at[1]][R.at[0]+ox-N.at[0]];if(io!==open(nc))bad.push(R.id+' '+ix+','+iy+' vs '+N.id)}}
    for(let y=0;y<R.h;y++)for(let x=0;x<R.w;x++)if((x===0||y===0||x===R.w-1||y===R.h-1)&&!'#.'.includes(R.g[y][x]))bad.push(R.id+' edge glyph '+R.g[y][x]+' '+x+','+y)}
  ok(!bad.length,`edges match their neighbours and hold only rock or air${bad.length?': '+bad.slice(0,4).join('; '):''}`);
  const srcs=[];for(const id of IDS){const text=fs.readFileSync(new URL(`rooms/crystals_${id}.js`,G),'utf8');srcs.push({text,mod:SRC[id]})}
  ok(srcs.every(({text,mod})=>FMT.serialize(mod,FMT.headerComment(text))===text&&!FMT.check(mod,FMT.headerComment(text))),"every file is in the editor's format byte for byte and passes the server's checks");
  const all=[];for(const id of ORDER){const f=fs.readdirSync(new URL('rooms/',G)).filter(f=>f.endsWith('.js')&&f!=='index.js').find(f=>new RegExp(`id:'${id}'`).test(fs.readFileSync(new URL('rooms/'+f,G),'utf8')));if(f)all.push((await import(G+'rooms/'+f)).default)}
  const pr=FMT.problems(all).filter(p=>IDS.includes(p.id));ok(!pr.length,`the editor's checks find nothing in K6-K10${pr.length?': '+pr.slice(0,3).map(p=>p.id+' '+p.msg).join('; '):''}`);
  const blk=/\/\* rooms:begin[^\n]*\*\/\n([\s\S]*?)\/\* rooms:end \*\//.exec(fs.readFileSync(new URL('rooms/index.js',G),'utf8'))[1];
  ok(IDS.every(id=>new RegExp(`import R_${id} from '\\./crystals_${id}\\.js';\\n`).test(blk))&&blk.includes(IDS.map(id=>'R_'+id).join(','))&&ORDER.indexOf('k10')<ORDER.indexOf('f1')&&ORDER.indexOf('k6')>ORDER.indexOf('m11'),"the registry lists crystals_k6.js .. crystals_k10.js between m11 and f1, in the dev server's format");
  ok(RM.every(R=>R.torches.length>=1)&&ROOMS.k9.perches.length===1&&ROOMS.k9.erase===.6&&!ROOMS.k9.spawns.length&&!ROOMS.k9.crys.length&&!ROOMS.k9.g.some(r=>/[\^LQ]/.test(r)),'every room has a torch; K9 is calm: a perch, the dissolved corners (erase .6), no creature, no hazard, no shard');
  const ped=ROOMS.k10.pedestals;ok(ped.length===1&&ped[0].piece==='crystals'&&IDS.slice(0,4).every(id=>!ROOMS[id].pedestals.length),'the Crystals fragment stands on K10\'s pedestal only');
  const nx=NEXT.find(n=>n.need==='piece:crystals');ok(nx&&nx.room==='k10'&&nx.tile[0]===ped[0].tx&&nx.tile[1]===ped[0].ty&&NEXT.findIndex(n=>n.need==='piece:crystals')>NEXT.findIndex(n=>n.need==='item:undo'),'the stuck hint points at the pedestal, after the Undo item');
  const K8=ROOMS.k8;ok(K8.rx.length===4&&K8.rx.every(r=>r.id==='v')&&K8.locks.length===5&&K8.locks.every(l=>l.id==='v')&&K8.echo,'K8: four receivers and the vault door (one lock id v), an Echo');
  /* cross-lighting: with every switch fallen, the cracked wall drilled and the gate open, each drifter lights only its own receiver */
  { const S=playState('k8',37*T,17*T-PH,ALL);S.cr.q={};for(let y=0;y<K8.h;y++)for(let x=0;x<K8.w;x++)if(K8.g[y][x]==='Q')S.cr.q[x+','+y]=999;S.drilled=[[38,2],[38,3]];S.gate=1;
    const lit=S.ens.filter(e=>e.k==='prism').map(e=>{const b=CR.beamSeg(S,K8,e);return [Math.floor(e.x/T),b&&b.rx?b.rx.join(','):null]});
    const own={'14':'14,1','29':'29,12','38':'38,4','6':'6,5'};
    ok(lit.length===4&&lit.every(([x,r])=>own[x]===r),`K8: each drifter lights exactly its own receiver (${lit.map(([x,r])=>x+'->'+r).join(', ')})`);
    const S0=playState('k8',37*T,17*T-PH,ALL),z=S0.ens.filter(e=>e.k==='prism').map(e=>CR.beamSeg(S0,K8,e));
    ok(z.every(b=>!b||b.rect.w*b.rect.h===0),'...and before any lock is solved every one of their beams is blocked at its lens (no light, no hazard)')}
}

/* ---------------- K6 Prism Gallery: the drifter's beam rises out of the pit across the way west; three tools, three ways ---------------- */
console.log('K6 Prism Gallery');
if(want('k6')){
  const R=ROOMS.k6,Y=R.crys.find(c=>c.k==='Y');
  ok(Y&&Y.tx===17&&Y.ty===8&&Y.aim==='u'&&R.g[1][17]==='R'&&R.locks.every(l=>l.id==='a')&&R.g[8].slice(17,20)==='Y..'&&R.g[11][19]==='#',
    'the drifter sits in the pit (17,8) against its west wall, aiming up; its beam ends on the receiver in the ceiling (17,1); the exit lock (row 1 cols 4-8) is its lock');
  { const S=playState('k6',37*T,18*T-PH,ALL);run(S,40,I());ok(S.latch['k6:R:17,1']&&S.latch['k6:D:a']&&!E.solid(S,R,6,1),'met safely first: as he arrives the beam fills the ring and the exit lock opens (the grammar K8 uses)')}
  const c=copyRoom('k6'),tgt=on(c,S=>S.p.ground&&ft(S)<=8*T+.1&&S.p.x<15*T),pr=S=>Math.abs(S.p.x-12*T)+Math.abs(S.p.y-6*T);
  const sol={};
  for(const [n,it,evName] of [['root',{root:1},'stun'],['board',{board:1},'prism_shatter'],['claws',{claws:1},'vine']]){
    const S=playState(c,23*T,8*T-PH,it);run(S,3,I());const r=reach(S,tgt,{prio:pr,budget:150000});
    let ev=[],nulled=false;if(r.found){const P=playState(c,23*T,8*T-PH,it);run(P,3,I());for(const i of r.inputs){ev.push(...E.step(P,i,[]));const e=P.ens.find(e=>e.k==='prism');const b=CR.beamSeg(P,ROOMS[c],e);if(e.lens&&!(e.wrap>0)&&b&&b.rect.h===0&&P.vines.length)nulled=true}}
    sol[n]=r.found;
    ok(r.found&&ev.includes(evName)&&(n!=='claws'||nulled),`with only the ${n}${n==='root'?' (the burst wraps the drifter; it sinks, the beam is cut)':n==='board'?' (a dash rams it: the lens shatters)':' (a vine grown on the pit wall under the drifter, up past its lens, holds the beam to nothing)'} he crosses: ${r.found?sec(r.frames)+' s':'NOT FOUND'}`)}
  proof('with no item (root, board and claws all missing) the beam stops him',playState(c,23*T,8*T-PH,{}),tgt,{prio:pr},null);
  note('CL4 exception: K6 is the drifter\'s teaching room with three independent single-tool solutions (the explicit spec), so it cannot also require two tools');
  /* the whole room, from the arrival beside the floor hole to K7 */
  const S=playState('k6',37*T,18*T-PH,ALL);run(S,3,I());const B=Bot(S);RK.k6Bot(B);
  TIMES.k6=B.rec.length;ok(B.ok,`K6 by bot with the items he has (root, board, forged, claws), from the arrival to standing in K7: ${sec(B.rec.length)} s${B.ok?'':' '+B.log.join('; ')}`);
}

/* ---------------- K7 Atrium: two claw climbs, a shard bridge, the shard wall, a one-tile springboard under the trapdoor ---------------- */
console.log('K7 Atrium');
/* k7chamber, k7trick, k7Bot: tools/crystals_reach.mjs */
if(want('k7')){
  const R=ROOMS.k7;
  ok(R.g[7].slice(26,29)==='^Q^'&&R.crys.some(c=>c.k==='Y'&&c.tx===27&&c.ty===10&&c.aim==='u')&&R.g[4][27]==='R'&&R.g[3].slice(29,32)==='DDD'&&R.echo,
    'the springboard is one shard (27,7) with thorns either side; a drifter under it aims up through it at the receiver (27,4) that opens the trapdoor (cols 29-31); the Echo is here');
  /* the bot with Undo, from the entry, with the Echo behind him */
  const S=playState('k7',10*T,29*T-PH,{...ALL,undo:1});run(S,3,I());const B=Bot(S);
  const {k0,tr}=RK.k7Bot(B);
  TIMES.k7=B.rec.length;
  ok(B.ok&&tr.latched&&tr.gone&&tr.steps>0,`by bot with Undo: two claw climbs, the shard bridge, the springboard (it falls; its beam latches the trapdoor's receiver while he waits on the shard wall), a rewind of ${tr.steps} steps puts him back on the whole springboard, the trapdoor stays open (latched), up into K8: ${sec(B.rec.length)} s${B.ok?'':' '+B.log.join('; ')}`);
  REC.k7={rec:B.rec.slice(),k0};
  /* the same trick without Undo: he is stuck under the open trapdoor */
  const N=playState('k7',10*T,29*T-PH,ALL);run(N,3,I());const NB=Bot(N);for(const c of B.rec.slice(0,k0))if(!NB.play([dec(c)]))break;
  const tn=k7trick(NB);const r=NB.ok?reach((()=>{const C=snapshot(N);C.echo={on:0,log:[],i:0};return C})(),k7chamber('k7'),{prio:S=>S.p.y,budget:QUICK?2000:60000}):{found:false};
  ok(tn.latched&&tn.gone&&!r.found,`without Undo the same play leaves the trapdoor open and the springboard gone: no way up (${r.nodes} nodes)`);
  const c=copyRoom('k7');
  proof('no claws: from the floor he never gets above row 22',playState(c,10*T,29*T-PH,{root:1,board:1,forged:1}),on(c,S=>S.p.ground&&ft(S)<=22*T+.1),{prio:S=>S.p.y},{label:'with the claws',S:playState(c,10*T,29*T-PH,ALL)});
  proof('no root: from the shard wall\'s top he never reaches the springboard',playState(c,21*T,11*T-PH,{board:1,forged:1,claws:1}),on(c,S=>S.p.ground&&Math.abs(ft(S)-7*T)<.5&&S.p.x>25.5*T&&S.p.x<28.5*T),{prio:S=>Math.abs(S.p.x-27*T)+Math.abs(S.p.y-5*T)},
    {label:'with the root',S:playState(c,21*T,11*T-PH,ALL)},{evidence:true});
  { const S=playState(c,21*T,11*T-PH,ALL);run(S,3,I());S.latch[c+':R:27,4']=1;S.latch[c+':D:x']=1;S.cr.q={'27,7':99};
    const C=playState(c,21*T,11*T-PH,ALL);run(C,3,I());C.latch[c+':R:27,4']=1;C.latch[c+':D:x']=1;
    proof('no Undo: with the trapdoor open and the springboard gone, he never reaches the chamber',S,k7chamber(c),{prio:S=>S.p.y},{label:'springboard whole',S:C},{evidence:true})}
  /* the recovery without Undo: the latch is anchored, so leaving and coming back (the springboard returns with the room) works */
  { const S=playState('k7',21*T,11*T-PH,ALL);run(S,3,I());S.latch['k7:R:27,4']=1;S.latch['k7:D:x']=1;S.cr.q={'27,7':99};E.enterRoom(S,'k7',{x:21*T,y:11*T-PH});
    const r=reach(S,k7chamber('k7'),{prio:S=>S.p.y,budget:40000});ok(E.solid(S,R,27,7)&&r.found,`(the non-Undo alternative, reported) re-entering the room brings the springboard back and the trapdoor stays open: the chamber in ${r.found?sec(r.frames)+' s':'-'}`)}
}

/* ---------------- K8 Vault Gate: four locks, one per tool; four runes open the vault door under the exit ---------------- */
console.log('K8 Vault Gate');
function k8visit(items,latch,tx,ty){const S=playState('k8',0,0,items);Object.assign(S.latch,latch);S.cp={room:'k8',tx,ty};E.enterRoom(S,'k8',E.spot(S,ROOMS.k8,tx,ty));run(S,3,I());return S}
/* k8 (on('k8',..)), LANDING, the segments (k8A, k8Moat, k8Out) and the Undo lock (k8trick): tools/crystals_reach.mjs */
if(want('k8')){
  const R=ROOMS.k8;
  /* segment A, from the entry: up the hall, the cracked corner (lock 3), across the pit (lock 1) onto its switch */
  const SA=playState('k8',37*T,17*T-PH,{...ALL,undo:1});run(SA,3,I());const A=Bot(SA);RK.k8A(A);
  ok(A.ok&&SA.latch['k8:R:38,4']&&SA.latch['k8:R:14,1'],`lock 3 (claws: drill the cracked corner, the drifter's beam falls on its rune) and lock 1 (root + board: the 13-wide pit, then its switch) by bot from the entry: ${sec(A.rec.length)} s${A.ok?'':' '+A.log.join('; ')}`);
  /* the history at the plate stand on the way in from the room entry: the trick continues the same visit */
  { const C=snapshot(SA);const B=Bot(C);B.leg('to gate front',k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x>=9.5*T&&S.p.x<12.5*T),{prio:S=>Math.abs(S.p.x-11*T)});const r=k8trick(B);
    ok(B.ok&&r.plate&&A.rec.length+B.rec.length>=181&&r.hist===181&&r.gate&&r.r4,`lock 4 (Undo), the same visit: ${A.rec.length+r.toPlate} live frames from the room entry to the plate stand (history ${r.hist}); stand 20 frames, rewind ${r.steps} steps to the gate's front, the Echo replays the stand and holds the plate ${r.wait} frames later; through the gate (latched) to the switch; its rune lights (gate ${r.gate}, rune ${r.r4})${B.ok?'':' '+B.log.join('; ')}`)}
  /* segment B, a fresh visit from the landing torch: the moat (lock 2, forged) and back up the shaft is not needed */
  const L1={'k8:R:38,4':1,'k8:R:14,1':1};
  const SB=k8visit({...ALL,undo:1},L1,...LANDING),BB=Bot(SB);RK.k8Moat(BB);
  ok(BB.ok&&SB.latch['k8:R:29,12'],`lock 2 (the forged board): down the shaft, surf 16 tiles of lava under a roof three high to the walled-off far bank and its switch: ${sec(BB.rec.length)} s${BB.ok?'':' '+BB.log.join('; ')}`);
  /* segment C, a fresh visit from the landing torch: the Undo lock, and its control without the rewind */
  const L2={...L1,'k8:R:29,12':1};
  const SC=k8visit({...ALL,undo:1},L2,...LANDING),BC=Bot(SC),rc=k8trick(BC);
  ok(BC.ok&&rc.gate&&rc.r4&&rc.steps>0,`lock 4 (Undo) from the landing torch: the rewind lands at the gate's front, the gate opens ${rc.wait} frames later and latches as he walks in; its rune lights: ${sec(BC.rec.length)} s${BC.ok?'':' '+BC.log.join('; ')}`);
  /* without Undo: see the bound proof below (he cannot get back to the gate before the natural Echo lets it shut) */
  /* from every torch (Fixer C, 2026-11-07: the shaft-foot torch (3,15) is gone: it sat on the way to the plate, so every
     attempt re-checkpointed there and a death meant climbing the shaft with the Echo trailing) */
  ok(!R.torches.some(t=>t.ty>12&&t.tx<30),`no torch on the low tier west of the arrival (the shaft, the plate tunnel, the moat): the torches are ${R.torches.map(t=>t.tx+','+t.ty).join(' ')}`);
  const TORCH=R.torches.map(t=>[t.tx,t.ty]);
  for(const [tx,ty] of TORCH){const S=k8visit({...ALL,undo:1},L2,tx,ty),B=Bot(S);
    if(tx>30){B.leg('up',k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x>28*T),{prio:S=>S.p.y,ram:1});B.leg('takeoff',k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x<30*T&&S.p.x>27.5*T),{prio:S=>Math.abs(S.p.x-29*T)+Math.abs(S.p.y-7*T),ram:1});B.leg('pit',k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x<14*T),{prio:S=>S.p.x,budget:150000,ram:1,noEcho:1})}
    if(ty>12)B.leg('up the shaft',k8(S=>S.p.ground&&ft(S)<=5*T+.1&&S.p.x<10*T&&S.p.x>4*T),{prio:S=>S.p.y,k:4,budget:30000,ram:1,noEcho:1});
    B.leg('to gate front',k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x>=9.5*T&&S.p.x<12.5*T),{prio:S=>Math.abs(S.p.x-11*T)+Math.abs(S.p.y-7*T),budget:150000,ram:1});
    const r=k8trick(B);ok(B.ok&&r.gate&&r.r4,`the Undo lock from the torch at (${tx},${ty}): ${B.ok?(r.gate&&r.r4?'works':'gate '+r.gate+' rune '+r.r4)+' ('+sec(B.rec.length)+' s, history '+r.hist+' at the stand, rewind '+r.steps+' steps, gate open after '+r.wait+')':B.log.join('; ')}`)}
  /* segment D: all four runes lit, the vault door is open; out through it into K9 */
  const SD=k8visit(ALL,{...L2,k8:1},...LANDING);SD.latch['k8:R:6,5']=1;SD.latch['k8:D:v']=1;   /* crystalTouch sets the door's latch as the last rune latches (segment C did that) */
  ok(rc.r4&&[4,5,6,7,8].every(x=>!E.solid(SD,R,x,1))&&[4,5,6,7,8].every(x=>E.solid(k8visit(ALL,L2,...LANDING),R,x,1)),'the vault door (the lock under the exit) is open with four runes lit and shut with three');
  const BD=Bot(SD);RK.k8Out(BD);
  ok(BD.ok,`out through the vault door into Delete Hush: ${sec(BD.rec.length)} s`);
  TIMES.k8=A.rec.length+BB.rec.length+BC.rec.length+BD.rec.length;
  note(`K8 by segments: ${sec(A.rec.length)} + ${sec(BB.rec.length)} + ${sec(BC.rec.length)} + ${sec(BD.rec.length)} s (plus the walks between them a single visit needs: back up the shaft after the moat, about 3 s)`);
  /* leak proofs: each lock needs its tool */
  const c=copyRoom('k8');
  const land=on(c,S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x<14*T),fromTake=it=>playState(c,29*T,9*T-PH,it);
  proof('lock 1: with the root alone the pit stops him',fromTake({root:1,forged:1}),land,{prio:S=>S.p.x},{label:'root + board',S:fromTake({root:1,board:1,forged:1}),o:{budget:200000}});
  proof('lock 1: with the board alone (forged too) the pit stops him',fromTake({board:1,forged:1}),land,{prio:S=>S.p.x},null);
  proof('lock 1: root + claws (no board)',fromTake({root:1,claws:1}),land,{prio:S=>S.p.x},null,{evidence:true});
  proof('lock 1: board + forged + claws (no root)',fromTake({board:1,forged:1,claws:1}),land,{prio:S=>S.p.x},null,{evidence:true});
  /* the moat proofs run on the low tier alone (rows 11-18, cols 0-31): the far bank is closed but for the moat tunnel, which lies inside it */
  const cm=copyRoom('k8',{crop:[0,11,31,18]});
  const bank=on(cm,S=>S.p.ground&&S.p.x>=27.5*T&&S.p.x<30*T&&ft(S)<=5*T+.1&&ft(S)>=4*T),fromWest=it=>playState(cm,9*T,5*T-PH,it);
  proof('lock 2: without the forged board (root + board, burn and save jump included) the moat stops him',fromWest({root:1,board:1}),bank,{prio:S=>-S.p.x},{label:'forged',S:fromWest({root:1,board:1,forged:1}),o:{prio:S=>-S.p.x+Math.abs(S.p.y-14*T)}});
  proof('lock 2: root + board + claws, no forged board',fromWest({root:1,board:1,claws:1}),bank,{prio:S=>-S.p.x},null,{evidence:true});
  ok(ROOMS.k8.g.slice(13,16).every(r=>r[30]==='#')&&ROOMS.k8.g.slice(11,13).every(r=>r.slice(28,31)==='###'||r.slice(28,31)==='#R#'),'lock 2: the far bank (cols 28-29) is closed by rock above (the roof) and east (col 30): its only way in is the moat');
  if(0)proof('',playState(c,37*T,17*T-PH,{root:1,board:1,claws:1}),S=>S.room===c&&S.cr.q&&S.cr.q['29,16']!==undefined,{prio:S=>Math.abs(S.p.x-29*T)+Math.abs(S.p.y-14*T)},null,{evidence:true});
  { const S=playState(c,37*T,9*T-PH,{root:1,board:1,forged:1});const b=CR.beamSeg(S,ROOMS[c],S.ens.find(e=>e.k==='prism'&&e.aim==='d'));
    ok(R.g[2][38]==='X'&&R.g[3][38]==='X'&&R.g[4][38]==='R'&&R.g[1][37]==='#'&&(!b||b.rect.h===0),'lock 3: the corner drifter (38,1) is sealed above the cracked rock (38,2-3) that hides its rune (38,4); only a drill (the claws) opens its way')}
  /* lock 4: the natural Echo cannot do it (the fastest way from the plate back to the gate is longer than its hold) and the root cannot wrap it there */
  const plate=()=>{const S=playState(c,8*T-3,16*T-PH,{root:1,board:1,forged:1});run(S,2,I());return S},gateF=on(c,S=>S.p.ground&&Math.abs(ft(S)-9*T)<.5&&S.p.x>=10*T&&S.p.x<12.5*T);   /* standing at the gate's front, on the landing floor */
  /* the Echo reaches the plate 120 frames after he did and stands there as long as he did (s); the gate opens 5 frames into the hold
     and shuts 5 frames after it; so with no rewind he must reach the gate within 125 frames of leaving the plate */
  proof('lock 4: from the plate to the gate\'s front within 126 frames (the natural Echo holds it open till about 119 frames after he leaves the plate, and he needs about 6 more to step into the gate), root + board + forged',plate(),gateF,{prio:S=>Math.abs(wxp(S)-11*T)+Math.abs(S.p.y-7*T),maxFrames:126},null);
  { const S=playState(c,8*T-3,16*T-PH,ALL);run(S,2,I());const r=reach(S,gateF,{prio:S=>Math.abs(S.p.x-11*T)+Math.abs(S.p.y-7*T),budget:QUICK?2000:60000,maxFrames:126});
    ok(!r.found,`lock 4, with the claws too (evidence): no way found from the plate to the gate's front within 126 frames (${r.nodes} nodes${r.exhausted?', exhausted':''})`)}
  { /* a root burst over a plate-holding Echo: the tunnel's thorn ceiling forbids any jump near the plate */
    const P=ROOMS[cm].plates[0],echoes={x:P.tx*T+1-PW,y:(P.ty+1)*T-PH,w:T-2+2*PW,h:PH};   /* every Echo box that holds the plate */
    const rise=p=>p.vy<0?Math.min(p.vy*p.vy,4)/(2*.26):0;   /* the least he can still rise: a let-go jump is cut to 2 px/frame */
    const underThorns=p=>p.x+16>5*T&&p.x+2<12*T;
    const burstOnPlate=S=>S.roots.some(r=>{if(r.t>10)return false;const hw=8+r.t*.9;return E.ov({x:r.x-hw,y:r.y-4,w:hw*2,h:6+r.t*3},echoes)})&&!(underThorns(S.p)&&S.p.y-rise(S.p)+2<2*T+6);
    proof('lock 4: no root burst he survives can reach an Echo standing on the plate (a ceiling of thorns over the plate tunnel: any double jump under it rises into the spikes, and the death clears the Echo; root + board + forged)',playState(cm,4*T,5*T-PH,{root:1,board:1,forged:1}),burstOnPlate,{prio:S=>Math.abs(S.p.x-8*T),maxFrames:300},null)}
  { /* the fallen pit switch's beam is a curtain at the landing's edge; with the vault still shut, the west side must not be a dead end */
    const S=playState('k8',11*T,9*T-PH,{root:1,board:1,forged:1,claws:1});run(S,2,I());S.cr.q={'14,9':999};S.latch['k8:R:14,1']=1;
    const C=snapshot(S);C.echo={on:0,log:[],i:0};const r=reach(C,k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x>27.5*T),{prio:S=>-S.p.x,budget:QUICK?2000:150000});
    ok(r.found,`no soft lock: with the pit's switch fallen (its beam a curtain at the landing's edge) and the vault still shut, he still gets back east (${r.found?sec(r.frames)+' s':'NOT FOUND'})`)}
  note('the vault needs all four tools: without the root or the board the pit (rune 1) stays dark, without the forged board the moat (rune 2), without the claws the cracked corner (rune 3), without Undo the gate (rune 4); the door needs all four runes');
}

/* ---------------- K9 Delete Hush and K10 Delete Core ---------------- */
console.log('K9 Delete Hush, K10 Delete Core');
if(want('k9')){
  const S=playState('k8',7*T,4*T-PH,ALL);S.latch['k8:D:v']=1;run(S,3,I());const B=Bot(S);
  const {sat}=RK.k9Bot(B);
  TIMES.k9=B.marks['up to k10']!==undefined?B.rec.length:0;
  ok(B.ok&&sat,`K9 by bot: up from the vault, sits on the seat (the hush), climbs to the top and into Delete Core: ${sec(B.rec.length)} s${B.ok?'':' '+B.log.join('; ')}`);
  const K=B.S,n0=B.rec.length;RK.k10Frag(B,CK);const n=B.rec.length-n0;
  const evs=[];for(let i=0;i<2;i++)evs.push(...E.step(K,I(),[]));if(K.chase&&K.chase.on)evs.push('chase_start');
  TIMES.k10=n;
  ok(K.pieces[CK]===1&&evs.includes('chase_start')&&K.chase&&K.chase.id==='crystals'&&K.chase.y===CHASES.crystals.from&&K.echo&&!K.echo.on,`K10: walking into the fragment lifts it and the delete starts at the top of the room (${sec(n)} s from the room's floor)`);
}

/* ---------------- the delete chase: K10 down to the hub ---------------- */
console.log('the delete chase');
const NEXTR={k10:'k9',k9:'k8',k8:'k7',k7:'k6',k6:'k5',k5:'k4',k4:'k3',k3:'k2',k2:'k1',k1:'hub'};
const CHROUTE=Object.keys(NEXTR);
/* stages per room: [target, priority, skip] (skip: already past it, as after a restart at a torch further on) */
const STG={k8:[[on('k8',S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x<14*T),S=>Math.abs(S.p.x-12*T)+S.p.y*.2,S=>S.p.x>14*T||ft(S)>10*T],
    [on('k8',S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x>27.5*T),S=>-S.p.x,S=>S.p.x>27.5*T||ft(S)>10*T]],
  k7:[[on('k7',S=>S.p.y>20*T),S=>-S.p.y+Math.abs(S.p.x-30*T)*.2,S=>S.p.y>20*T]],
  k6:[[on('k6',S=>S.p.ground&&ft(S)<=8*T+.1&&S.p.x<15*T),S=>Math.abs(S.p.x-10*T)+Math.abs(S.p.y-6*T),S=>S.p.x<15*T||S.p.y>9*T],[on('k6',S=>S.p.y>10*T),S=>-S.p.y+Math.abs(S.p.x-7*T)*.3,S=>S.p.y>9*T]],
  k1:[[on('k1',S=>S.p.x<10*T),S=>S.p.x+S.p.y*.2,()=>false]],
  /* Fixer B's room edits (2026-11-07): K10's drop column, K9's way round its middle, K5's west ledge */
  k10:[[on('k10',S=>S.p.x>16.5*T&&S.p.x+PW<22.5*T&&S.p.y>12*T),S=>Math.abs(S.p.x+PW/2-19.5*T)+Math.abs(S.p.y-10*T)*.5,S=>S.p.y>12*T&&S.p.x>16*T&&S.p.x<22*T]],
  k9:[[on('k9',S=>S.p.x+PW<15*T||S.p.x>24*T),S=>Math.abs(S.p.x+PW-15*T)+S.p.y*.3,S=>S.p.y>10*T]],
  k5:[[on('k5',S=>S.p.x+PW<16*T&&S.p.y+PH<8.5*T),S=>Math.abs(S.p.x+PW/2-15*T)+Math.abs(S.p.y+PH-3*T)*.5,S=>S.p.y>9*T||S.p.x+PW<16*T]]};
/* ---- */
function chaseState(room,tx,ty,assist=0){const S=playState(room,0,0,ALL,assist);latchAll(S);S.cp={room,tx,ty};E.enterRoom(S,room,E.spot(S,ROOMS[room],tx,ty));run(S,2,I());return S}
/* at the pedestal's side, as he walks up to it (his torch is K10's) */
const chaseLift=(assist=0)=>{const S=chaseState('k10',37,17,assist);S.p.x=25.5*T;S.p.y=17*T-PH;run(S,2,I());return S};
function chaseRun(S,{pause=0,budget=80000}={}){
  const rec=[],per={},echoOn=[];let t0=-1,done=-1;
  const cps=[];const step=i=>{const ev=E.step(S,i,[]);rec.push(enc(i));if(ev.includes('cp')&&S.chase&&S.chase.on)cps.push(S.cp.room+':'+S.cp.tx+','+S.cp.ty);if(ev.includes('chase_start'))t0=rec.length;if(ev.includes('chase_done'))done=rec.length;if(S.echo&&S.echo.on)echoOn.push(S.room);return ev};
  for(let k=0;k<300&&!S.chase;k++)step(I({l:S.p.x>ROOMS[S.room].pedestals[0].tx*T?1:0,r:S.p.x<ROOMS[S.room].pedestals[0].tx*T-PW?1:0}));
  if(t0<0)t0=0;
  while(S.chase&&S.chase.on){const id=S.room,nx=NEXTR[id],e0=rec.length;if(!nx)return {ok:false,why:'in '+id,rec,per};
    for(let k=0;k<90&&(!S.p.ground||S.p.y<6)&&S.chase&&S.chase.on&&S.room===id;k++)step(I());if(S.room!==id)continue;
    for(let k=0;k<pause&&S.chase&&S.chase.on;k++)if(step(I()).includes('die'))return {ok:false,why:'died pausing in '+id,rec,per};
    const legs=[...(STG[id]||[]).filter(([,,skip])=>!skip(S)).map(([t,p])=>[t,p]),[nx==='hub'?S=>S.room==='hub'&&!(S.chase&&S.chase.on):S=>S.room===nx,S=>-wyp(S)+(id==='k9'?wxp(S)*.3:0)+(id==='k6'?Math.abs(wxp(S)-19*T)*.3:0)+(id==='k8'?Math.abs(S.p.x-36*T):0)+(id==='k1'?wxp(S)*.5:0)+(['k5','k4','k3','k2','k10','k7'].includes(id)?Math.abs(wxp(S)+PW/2-19.5*T)*.5:0)]];
    for(const [t,p] of legs){if(!(S.chase&&S.chase.on))break;const r=reach(S,t,{prio:p,budget,maxFrames:900});if(!r.found)return {ok:false,why:'stuck in '+id+' at '+(S.p.x/T).toFixed(1)+','+(ft(S)/T).toFixed(1),rec,per};
      for(const i of r.inputs)if(step(i).includes('die'))return {ok:false,why:'died in '+id,rec,per}}
    per[id]=(per[id]||0)+rec.length-e0}
  return {ok:done>0,rec,per,secs:(done-t0)/60,echoOn,cps};
}
/* the lead: frames until the front, at its speed now, reaches the line 3 px under his feet (where it glitches him out) */
function leads(start,rec,assist){const S=snapshot(start);S.assist=assist;const per={};let died=false;
  for(const c of rec){const ev=E.step(S,dec(c),[]);if(ev.includes('die')){died=true;break}const ch=S.chase;if(!ch||!ch.on||ch.t<=0)continue;
    const v=SW.speedAt(CHASES.crystals,ch.y)*(assist?SW.SWEEP.assist:1),l=(wyp(S)+PH+SW.SWEEP.touch-ch.y)/v/60;if(!(S.room in per)||l<per[S.room])per[S.room]=l}
  return {per,died}}
if(want('chase')){
  const C=CHASES.crystals;
  ok(C.kind==='sweep'&&C.from===ROOMS.k10.at[1]*T&&C.end===(ROOMS.hub.at[1]+16)*T&&C.path.length>=2&&C.path.every((s,i)=>!i||s[0]>C.path[i-1][0]),`CHASES.crystals: a sweep from K10's top (${C.from}) to the hub floor (${C.end}), stretches ${C.path.map(s=>s.length>1?s[0]/T+':'+s[1]:s[0]/T).join(' ')} (rows:px per frame)`);
  const start=chaseLift(),s0=snapshot(start);
  const R=chaseRun(start);
  ok(R.ok,`a clean bot outruns it from the lift to the hub floor: ${R.ok?R.secs.toFixed(1)+' s':R.why} (${Object.entries(R.per).map(([k,v])=>k+' '+sec(v)).join(', ')})`);
  if(R.ok){
    note(`chase length ${R.secs.toFixed(1)} s against the 30 to 40 s target: short by ${(30-R.secs).toFixed(1)} s; K10, K9 and K5 to K2 are falls with no tool obstacle yet (K8's pit needs the root and the board, K7's pulsed beam a wait on the shard wall, K6's prism one of root, board or claws)`);
    const ln=leads(s0,R.rec,0),la=leads(s0,R.rec,1);
    ok(!ln.died&&CHROUTE.every(k=>!(k in ln.per)||ln.per[k]>=2),`normal speed: his lead never drops under 2 s in any room (${Object.entries(ln.per).map(([k,v])=>k+' '+v.toFixed(1)).join(', ')})`);
    ok(!la.died&&CHROUTE.every(k=>!(k in la.per)||la.per[k]>=2),`Assist (70%): the same run's lead (${Object.entries(la.per).map(([k,v])=>k+' '+v.toFixed(1)).join(', ')})`);
    ok(!R.echoOn.length,'the Echo never wakes in the chase (K8 and K7 have one)');
  }
  const H=chaseRun(chaseLift(),{pause:60});ok(H.ok,`a hesitant bot (1 s still on entering every room) clears it too: ${H.ok?H.secs.toFixed(1)+' s':H.why}`);
  const HA=chaseRun(chaseLift(1),{pause:60});ok(HA.ok,`...and with Assist: ${HA.ok?HA.secs.toFixed(1)+' s':HA.why}`);
  /* restarted at every torch on the way: the front comes back `gap` px above it */
  note(`torches the chase passes (its checkpoints): ${[...new Set([...(R.cps||[]),...(H.cps||[])])].join(' ')}`);
  /* the restart list (lead, 2026-11-07): one torch per room on the way, plus K10's arrival torch. K3's (19,16) hangs in the
     hatch shaft: the restart is mid-air and falls into K2 */
  const passed='k10:25,16 k9:19,8 k8:31,8 k7:33,2 k6:13,16 k5:19,7 k3:19,16 k1:11,15 k10:37,17'.split(' ').map(k=>{const [id,xy]=k.split(':');const [tx,ty]=xy.split(',').map(Number);return {id,tx,ty}});
  const bad=[],okk=[];for(const {id,tx,ty} of passed)for(const as of [0,1]){const t={tx,ty};
    const S=chaseState(id,t.tx,t.ty,as);S.pieces[CK]=1;S.chase={id:'crystals',on:1,y:0,t:0,w:0,x:0,m:1};CH.resetChase(S);const r=chaseRun(S);(r.ok?okk:bad).push(`${id}:${t.tx},${t.ty}${as?'A':''}${r.ok?' '+r.secs.toFixed(1):' '+r.why}`)}
  ok(!bad.length&&okk.length>=2,`restarted at every torch he passes on the way (normal and Assist) he clears it: ${bad.length?'FAILED '+bad.join('; '):okk.length+' starts'}`);
  /* deleted walls and beams: beams trace through solid(), so a wall above the front no longer stops them; no beam may
     reach below the front further than it does with no chase */
  const leaks=[];for(const id of CHROUTE.filter(k=>k!=='hub')){const Rm=ROOMS[id];if(!Rm.crys.some(c=>c.k==='Y'))continue;
    for(let fy=Rm.at[1]*T;fy<=(Rm.at[1]+Rm.h)*T;fy+=6){const S=playState(id,0,0,ALL);latchAll(S);S.cr.q={};for(let y=0;y<Rm.h;y++)for(let x=0;x<Rm.w;x++)if(Rm.g[y][x]==='Q')S.cr.q[x+','+y]=999;S.drilled=[];for(let y=0;y<Rm.h;y++)for(let x=0;x<Rm.w;x++)if(Rm.g[y][x]==='X')S.drilled.push([x,y]);
      const base=S.ens.filter(e=>e.k==='prism').map(e=>CR.beamSeg(S,Rm,e));S.chase={id:'crystals',on:1,y:fy,t:1,w:0,x:0,m:1};
      S.ens.filter(e=>e.k==='prism').forEach((e,i)=>{const b=CR.beamSeg(S,Rm,e),b0=base[i];if(!b)return;const below=Math.max(0,b.rect.y+b.rect.h-(fy-Rm.at[1]*T));
        const ok0=b0&&b.rect.x===b0.rect.x&&b.rect.w===b0.rect.w&&b.rect.y+b.rect.h<=b0.rect.y+b0.rect.h+.01;const allow=2*60*SW.speedAt(CHASES.crystals,fy);if(below>allow&&!ok0)leaks.push(id+' drifter '+Math.floor(e.hx/T)+','+Math.floor(e.hy/T)+' front '+fy)})}}
  ok(!leaks.length,`deleted walls never let a beam reach further below the front than the 2-s lead (2 s of the front's travel) where it would not reach with no chase (every drifter on the way, the front stepped through its room)${leaks.length?': '+leaks.slice(0,3).join('; '):''}`);
}

/* ---------------- fairness (CL6): rewind 3 s at many frames of the solution run, and the room is still solvable from there ---------------- */
console.log('fairness (CL6)');
if(want('fair')&&!QUICK){
  /* The bar (Fixer A, 2026-11-07; tools/crystals_reach.mjs escapeClass): replay the bot to frame f, hold Undo, and from that
     exact rewound state (the Echo awake wherever it is, the meter as the rewind left it) he must reach the next room, or
     leave the room (the arrival or the hatch: the room resets when he comes back, and the meter refills on the way), or
     die (a respawn at the last torch, never a soft lock). Only "stuck alive" fails. Each point tries, in order: the run's
     own inputs from the rewound frame, a search to the next room, a search out of the room, a search to a death; all on an
     Undo-free clone. Sampled every 30 frames of the run, plus the earlier sweep's frames */
  const hold=(S,B)=>{const L0=S.undo.buf.length;let n=0;for(;n<95&&B.ok;n++){B.play([I({z:1,zp:n===0})]);if(!S.undo.on)break}return L0-S.undo.buf.length+1};   /* +1: the hold's last frame is a live one */
  const fairNotes=(id,res)=>{for(const {f,r,where} of res)note(`${id} f${f} (at ${where}): ${r.cls}${r.how?' by '+r.how:''}${r.to?' to '+r.to:''}${r.frames!==undefined?' in '+sec(r.frames)+' s':''}${r.nodes?' ('+r.nodes+' nodes)':''}${r.tries&&r.tries.length?' ['+r.tries.join('; ')+']':''}`);
    const c=k=>res.filter(x=>x.r.cls===k).length;return {c,line:`reaches the next room (${c('route')}), leaves the room alive (${c('leave')}) or only dies (${c('dies')}); stuck alive at ${c('stuck')}${c('stuck')?': f'+res.filter(x=>x.r.cls==='stuck').map(x=>x.f).join(' f'):''}`}};
  const whereOf=(S,extra)=>`${(S.p.x/T).toFixed(1)},${(ft(S)/T).toFixed(1)}${S.p.ground?'':' air'}${S.echo&&S.echo.on?' echo '+(EC.echoBox(S).x/T).toFixed(1)+','+((EC.echoBox(S).y+PH)/T).toFixed(1):' echo asleep'}${extra?' '+extra:''}`;
  if(!REC.k7)note('(run with SECTIONS including k7 for the K7 samples)');
  else{const {rec,k0}=REC.k7,res=[],t0=Date.now();
    const F=new Set([380]);for(let f=30;f<rec.length-30;f+=30)F.add(f);for(let f=k0-60;f<rec.length-30;f+=45)F.add(f);
    const leave7=S=>S.room!=='k7'?-1e6:(31*T-ft(S))+Math.min(Math.abs(S.p.x+PW/2-6.5*T),Math.abs(S.p.x+PW/2-19.5*T))*.5;
    for(const f of [...F].sort((a,b)=>a-b)){if(f>=rec.length)continue;
      const S=playState('k7',10*T,29*T-PH,{...ALL,undo:1});run(S,3,I());const B=Bot(S);for(let i=0;i<f&&B.ok;i++)B.play([dec(rec[i])]);
      if(!B.ok||S.room!=='k7'){res.push({f,r:{cls:B.ok?'skip':'stuck',how:B.ok?'not in k7':'died in the replay before the rewind',tries:[]},where:'-'});continue}
      const back=f-hold(S,B),R0=snapshot(S);
      const replay=C=>{const ev=[];for(let i=Math.max(0,back);i<rec.length;i++){ev.push(...E.step(C,dec(rec[i]),[]));if(C.room!=='k7'||C.p.dead)break}return ev};
      const r=RK.escapeClass(R0,{id:'k7',next:'k8',routePrio:wyp,leavePrio:leave7,replay});
      res.push({f,r,where:whereOf(R0,`${R0.latch['k7:D:x']?'trapdoor latched':'trapdoor shut'}, springboard ${E.solid(R0,ROOMS.k7,27,7)?'whole':'gone'}`)})}
    const R7=res.filter(x=>x.r.cls!=='skip'),{c,line}=fairNotes('k7',R7);
    ok(R7.length>=8&&!c('stuck'),`K7: rewound at ${R7.length} frames of the solution run (every 30, plus the earlier sweep's), the Echo awake wherever it is: from each exact rewound state he ${line} [${((Date.now()-t0)/1000).toFixed(0)} s]`)}
  /* K8's Undo lock: replay segment C (from the landing torch, runes 1-3 lit) to frame f, rewind; the run's own inputs, then
     (if rune 4 lit) a search out through the vault door, count as the route */
  { const L2={'k8:R:38,4':1,'k8:R:14,1':1,'k8:R:29,12':1},S0=k8visit({...ALL,undo:1},L2,...LANDING),B0=Bot(S0);k8trick(B0);const rec=B0.rec.slice(),res=[],t0=Date.now();
    const F=new Set();for(let f=30;f<rec.length-20;f+=30)F.add(f);for(let f=30;f<rec.length-20;f+=40)F.add(f);
    const route8=S=>wyp(S)+(S.room==='k8'?Math.abs(S.p.x+PW/2-6.5*T)*.3:0);
    const leave8=S=>{if(S.room!=='k8')return -1e6;const x=S.p.x+PW/2,f=ft(S);
      if(x>=28*T&&f<=10.5*T)return 2000+Math.max(0,37*T-x);   /* the takeoff ledge (rows 9-10 cols 28-35 are rock): east to the drop at cols 36-38 */
      if(x>=30*T)return (19*T-f)+Math.abs(x-(f>=13.5*T?33.5:37.5)*T)*.5;   /* down the east side: the ledge at row 13, then west into the floor hole (cols 31-35) */
      if(f>12.5*T)return 6000+f+Math.abs(x-2*T)*.3;   /* the low tier (rows 13-15: the shaft's foot, the moat, the far bank): up the shaft (the pit's air, rows 9-11, stays below) */
      return 3000+(30*T-x)+Math.abs(f-9*T)*.3};   /* west of the pit at the landing's height: east over it */
    for(const f of [...F].sort((a,b)=>a-b)){const S=k8visit({...ALL,undo:1},L2,...LANDING),B=Bot(S);for(let i=0;i<f&&B.ok;i++)B.play([dec(rec[i])]);
      if(!B.ok){res.push({f,r:{cls:'stuck',how:'died in the replay before the rewind',tries:[]},where:'-'});continue}
      const back=f-hold(S,B),R0=snapshot(S);
      const replay=C=>{const ev=[];for(let i=Math.max(0,back);i<rec.length;i++){ev.push(...E.step(C,dec(rec[i]),[]));if(C.room!=='k8'||C.p.dead)break}return ev};
      const after=C=>C.latch['k8:R:6,5']?reach(RK.noUndo(C),S=>S.room==='k9',{budget:30000,prio:route8}):null;
      const r=RK.escapeClass(R0,{id:'k8',next:'k9',routePrio:route8,leavePrio:leave8,replay,after});
      res.push({f,r,where:whereOf(R0,`gate ${R0.latch.k8?'latched':R0.gate>=.5?'open':'shut'}, rune 4 ${R0.latch['k8:R:6,5']?'lit':'dark'}`)})}
    const {c,line}=fairNotes('k8',res);
    ok(res.length>=10&&!c('stuck'),`K8's Undo lock: rewound at ${res.length} frames of its solution run (every 30 and every 40), the Echo awake wherever it is: from each exact rewound state he ${line} [${((Date.now()-t0)/1000).toFixed(0)} s]`)}
  { const S=playState('k8',10*T,9*T-PH,{...ALL,undo:1});S.latch.k8=1;S.gate=1;run(S,30,I());let shut=0;for(let k=0;k<60;k++){E.step(S,I({z:1,zp:k===0}),[]);if(E.solid(S,ROOMS.k8,9,6))shut++}
    ok(!shut,'a latched gate never shuts during a rewind (no rewind can lock the gate)')}
}

/* ---------------- time ---------------- */
console.log('time');
for(const [id,f] of Object.entries(TIMES))note(`${id} ${ROOMS[id].name.padEnd(13)} bot ${sec(f)} s`);
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails?1:0);
