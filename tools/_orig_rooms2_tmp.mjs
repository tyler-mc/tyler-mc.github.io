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

/* ---------------- the search: test_molten's best-first search over short macros on the real step, with a key that also
   holds the Crystals state (shard timers, receiver rings, latches, drifters, platforms, the plate, the Echo's index) ---------------- */
const MAC=o=>{const out=[];for(const d of [-1,0,1])for(const j of [0,1,2])out.push({d,j,b:0,dn:0});if(o.dash)for(const d of [-1,1])out.push({d,j:0,b:1,dn:0});if(o.drop)out.push({d:0,j:0,b:0,dn:1});return out};
const inputAt=(m,i)=>I({l:m.d<0?1:0,r:m.d>0?1:0,j:m.j?1:0,jp:m.j===2&&i===0?1:0,b:m.b&&i===0?1:0,bp:m.b&&i===0?1:0,d:m.dn});
function key(S,q,tq){const p=S.p,r=v=>Math.round(v/q);
  const v=(S.vines||[]).map(v=>[Math.round(v.by/8),Math.round(v.fx),Math.round(v.len/VINE.gap),Math.ceil((VINE.life-v.t)/tq)].join(',')).sort().join(';');
  const C=S.cr||{},qs=Object.entries(C.q||{}).map(([k,t])=>k+':'+(t<CR.CRY.delay?Math.floor(t/6):'g')).sort().join(';');
  const rx=Object.entries(C.rx||{}).map(([k,n])=>k+':'+Math.floor(n/5)).sort().join(';');
  const la=Object.keys(S.latch||{}).filter(k=>k===S.room||k.startsWith(S.room+':')).sort().join(';');
  const en=S.ens.map(e=>e.k==='prism'?[e.lens,e.wrap>0?Math.ceil(e.wrap/tq):0,e.grace>0?Math.ceil(e.grace/10):0,e.ret,Math.round(e.y/q),Math.round(e.x/q),e.per?Math.floor((e.t%e.per)/6):''].join(','):e.k==='plat'?[Math.round(e.u/q),e.dir,Math.ceil(e.wt/10)].join(','):'').join('/');
  const ec=S.echo&&S.echo.on?[S.echo.i,S.echo.wrap>0?Math.ceil(S.echo.wrap/tq):0].join(','):'';
  return [S.room,r(p.x),r(p.y),Math.round(p.vx),p.ground?0:Math.round(p.vy),p.ground,p.cl,p.root,p.sj,p.dc,p.bo,p.surf,p.burn>0?1:0,p.bd>0?1:0,
    p.wj?Math.round(p.wy/q):'',p.vc>0?Math.ceil(p.vc/tq):0,v,(S.drilled||[]).length,S.crack?Math.floor(S.crack[2]/6):'',S.gate>=.5?1:0,S.plate,qs,rx,la,en,ec,S.items.forged,S.items.claws].join('|')}
function reach(S0,target,o={}){
  const k=o.k??4,q=o.q??4,tq=o.tq??30,budget=o.budget??60000,maxF=o.maxFrames??3600,bad=o.bad||(()=>false);
  const ms=MAC({dash:o.dash??!!S0.items.board,drop:o.drop??!!S0.items.claws}),score=o.prio||(S=>S.p.y);
  const heap=[],push=n=>{heap.push(n);let i=heap.length-1;while(i>0){const j=(i-1)>>1;if(heap[j].s<=n.s)break;heap[i]=heap[j];heap[j]=n;i=j}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){const a=2*i+1,b=a+1;let m=i;if(a<heap.length&&heap[a].s<heap[m].s)m=a;if(b<heap.length&&heap[b].s<heap[m].s)m=b;if(m===i)break;[heap[i],heap[m]]=[heap[m],heap[i]];i=m}}return top};
  const seen=new Set([key(S0,q,tq)]),nodes=[{snap:snapshot(S0),par:-1,m:null,f:0}];push({s:score(S0),id:0});let n=0;
  if(target(S0))return {found:true,exhausted:false,nodes:1,inputs:[],frames:0};
  while(heap.length&&n<budget){const {id}=pop(),nd=nodes[id];n++;if(nd.f>=maxF)continue;
    for(const m of ms){const C=snapshot(nd.snap);let dead=false,won=false;
      for(let i=0;i<k;i++){const ev=E.step(C,inputAt(m,i),[]);if(ev.includes('die')||C.p.dead||bad(ev,C)){dead=true;break}if(target(C)){won=true;break}}
      if(dead)continue;const kk=key(C,q,tq);if(!won&&seen.has(kk))continue;seen.add(kk);
      const nid=nodes.length;nodes.push({snap:won?null:C,par:id,m,f:nd.f+k});
      if(won){const path=[];for(let x=nid;nodes[x].par>=0;x=nodes[x].par)path.unshift(nodes[x].m);const inputs=[];for(const pm of path)for(let i=0;i<k;i++)inputs.push(inputAt(pm,i));
        const R=snapshot(S0);let used=0;for(const inp of inputs){E.step(R,inp,[]);used++;if(target(R))break}return {found:true,exhausted:false,nodes:n,inputs:inputs.slice(0,used),frames:used,state:R}}
      push({s:score(C)+nodes[nid].f*1e-3,id:nid})}
    nd.snap=null}
  return {found:false,exhausted:!heap.length,nodes:n};
}
const enc=i=>(i.l?1:0)|(i.r?2:0)|(i.j?4:0)|(i.jp?8:0)|(i.b?16:0)|(i.bp?32:0)|(i.d?64:0)|(i.z?128:0)|(i.zp?256:0);
const dec=c=>I({l:c&1,r:(c>>1)&1,j:(c>>2)&1,jp:(c>>3)&1,b:(c>>4)&1,bp:(c>>5)&1,d:(c>>6)&1,z:(c>>7)&1,zp:(c>>8)&1});
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
/* the bot: plays on S and records codes; leg() searches on an Undo-free copy (optionally with the Echo asleep) and replays */
function Bot(S){const B={S,rec:[],ok:true,marks:{},log:[]};
  B.play=ins=>{for(const i of ins){const ev=E.step(S,i,[]);B.rec.push(enc(i));if(ev.includes('die')){B.ok=false;B.log.push(`died (${S.flash}) in ${S.room} at ${(S.p.x/T).toFixed(1)},${(ft(S)/T).toFixed(1)}`);return false}}return true};
  B.idle=n=>B.play(Array(n).fill(I()));
  B.leg=(name,target,o={})=>{if(!B.ok)return false;const C=snapshot(S);C.items.undo=0;C.undo.buf=[];if(o.noEcho)C.echo={on:0,log:[],i:0};
    const r=reach(C,target,{budget:60000,bad:o.ram?()=>false:ev=>ev.includes('echo_ram')||ev.includes('echo_wrap'),...o});
    if(!r.found){B.ok=false;B.log.push(`stuck before ${name} in ${S.room} at ${(S.p.x/T).toFixed(1)},${(ft(S)/T).toFixed(1)} (${r.nodes} nodes)`);return false}
    B.marks[name]=B.rec.length;return B.play(r.inputs)};
  return B}
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
  const S=playState('k6',37*T,18*T-PH,ALL);run(S,3,I());const B=Bot(S);
  B.leg('up',on('k6',S=>S.p.ground&&ft(S)<=8*T+.1&&S.p.x>22*T),{prio:S=>S.p.y});B.leg('cross',on('k6',S=>S.p.ground&&ft(S)<=8*T+.1&&S.p.x<15*T),{prio:pr});
  B.leg('exit shelf',on('k6',S=>S.p.ground&&ft(S)<=3*T+.1&&S.p.x<11*T),{prio:S=>Math.abs(S.p.x-10*T)+Math.abs(S.p.y-T)});B.leg('k7',S=>S.room==='k7'&&S.p.ground,{prio:wyp});
  TIMES.k6=B.rec.length;ok(B.ok,`K6 by bot with the items he has (root, board, forged, claws), from the arrival to standing in K7: ${sec(B.rec.length)} s${B.ok?'':' '+B.log.join('; ')}`);
}

/* ---------------- K7 Atrium: two claw climbs, a shard bridge, the shard wall, a one-tile springboard under the trapdoor ---------------- */
console.log('K7 Atrium');
const k7chamber=id=>on(id,S=>S.p.ground&&ft(S)<=3*T+.1);
function k7trick(B,id='k7'){   // from the shard wall's top: onto the springboard, back to the wall, wait for the latch, rewind onto the springboard, up
  const S=B.S;
  B.leg('onto springboard',on(id,S=>S.p.ground&&Math.abs(ft(S)-7*T)<.5&&S.p.x>25.5*T&&S.p.x<28.5*T),{prio:S=>Math.abs(S.p.x-27*T)+Math.abs(S.p.y-5*T),ram:1});
  B.leg('back to the wall',on(id,S=>(S.p.ground||S.p.cl)&&S.p.x<24*T&&ft(S)<=12*T),{prio:S=>Math.abs(S.p.x-21*T)+Math.abs(S.p.y-9*T),ram:1});
  let w=0;while(B.ok&&!S.latch[id+':D:x']&&w<240){B.play([I(S.p.cl?{l:S.p.cl<0?1:0,r:S.p.cl>0?1:0}:{})]);w++}
  const latched=!!S.latch[id+':D:x'],gone=!E.solid(S,ROOMS[id],27,7);
  let n=0;if(S.items.undo)for(;n<100&&B.ok;n++){B.play([I({z:1,zp:n===0})]);if(!S.undo.on)break;if(S.p.ground&&Math.abs(ft(S)-7*T)<.5&&S.p.x>25.5*T&&S.p.x<28.5*T&&E.solid(S,ROOMS[id],27,7)){B.play([I()]);break}}
  return {latched,gone,steps:n};
}
if(want('k7')){
  const R=ROOMS.k7;
  ok(R.g[7].slice(26,29)==='^Q^'&&R.crys.some(c=>c.k==='Y'&&c.tx===27&&c.ty===10&&c.aim==='u')&&R.g[4][27]==='R'&&R.g[3].slice(29,32)==='DDD'&&R.echo,
    'the springboard is one shard (27,7) with thorns either side; a drifter under it aims up through it at the receiver (27,4) that opens the trapdoor (cols 29-31); the Echo is here');
  /* the bot with Undo, from the entry, with the Echo behind him */
  const S=playState('k7',10*T,29*T-PH,{...ALL,undo:1});run(S,3,I());const B=Bot(S);
  B.leg('B1',on('k7',S=>S.p.ground&&Math.abs(ft(S)-22*T)<.5&&S.p.x>11*T&&S.p.x<15*T),{prio:S=>S.p.y+Math.abs(S.p.x-12*T)*.2,k:6,ram:1});
  B.leg('B2',on('k7',S=>S.p.ground&&Math.abs(ft(S)-15*T)<.5&&S.p.x>14*T&&S.p.x<18*T),{prio:S=>S.p.y+Math.abs(S.p.x-16*T)*.2,k:6,ram:1});
  B.leg('shard wall top',on('k7',S=>S.p.ground&&Math.abs(ft(S)-11*T)<.5&&S.p.x>20*T&&S.p.x<23*T),{prio:S=>Math.abs(S.p.x-21*T)+Math.abs(S.p.y-9*T),ram:1});
  const k0=B.rec.length,tr=k7trick(B);
  B.leg('chamber',k7chamber('k7'),{prio:S=>S.p.y,ram:1});B.leg('k8',S=>S.room==='k8'&&S.p.ground,{prio:wyp,ram:1});
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
const k8=f=>on('k8',f);
const LANDING=[10,8];
function k8visit(items,latch,tx,ty){const S=playState('k8',0,0,items);Object.assign(S.latch,latch);S.cp={room:'k8',tx,ty};E.enterRoom(S,'k8',E.spot(S,ROOMS.k8,tx,ty));run(S,3,I());return S}
/* the Undo lock: from the gate's front, over the closet, down the shaft to the plate, stand s, rewind, wait at the gate, in to Q4, out */
function k8trick(B,{s=20,undo=true}={}){
  const S=B.S,g0=B.rec.length;B.idle(10);   /* a beat at the gate's front (where the rewind should bring him back) */
  B.leg('closet roof',k8(S=>S.p.ground&&ft(S)<=5*T+.1&&S.p.x<10*T&&S.p.x>4*T),{prio:S=>S.p.y+S.p.x*.1,ram:1});
  B.leg('shaft',k8(S=>S.p.ground&&ft(S)>=16*T-.1&&S.p.x<5*T),{prio:S=>-S.p.y+Math.abs(S.p.x-2*T)*.3,ram:1});
  {let n=0;while(B.ok&&!S.plate&&n<200){B.play([I({r:1})]);n++}let m=0;while(B.ok&&Math.abs(S.p.vx)>.01&&m<20){B.play([I()]);m++}}
  const res={plate:S.plate===1,toPlate:B.rec.length-g0,hist:S.undo.buf.length};
  B.idle(s);
  let steps=0;if(undo)for(let k=0;k<100&&B.ok;k++){B.play([I({z:1,zp:k===0})]);if(!S.undo.on)break;steps++;if(k>8&&S.p.ground&&S.p.x>=9.5*T&&S.p.x<12.5*T&&ft(S)<=9*T+.1){B.play([I()]);break}}
  res.steps=steps;
  if(!undo)B.leg('back to the gate',k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x>=9.5*T&&S.p.x<12.5*T),{prio:S=>Math.abs(S.p.x-11*T)+Math.abs(S.p.y-7*T),ram:1,budget:20000});
  /* wait a step east of where the rewind left him (the Echo comes back to that spot at the seam, 120 frames on), then into the gate as it opens */
  if(!(S.p.ground&&ft(S)<=9*T+.1&&S.p.x>=12*T&&S.p.x<13.5*T))B.leg('beside the gate',k8(S=>S.p.ground&&Math.abs(ft(S)-9*T)<.5&&S.p.x>=12*T&&S.p.x<13.5*T),{prio:S=>Math.abs(S.p.x-12.5*T)+Math.abs(S.p.y-7*T),ram:1,noEcho:1,budget:20000});
  {let m=0;while(B.ok&&Math.abs(S.p.vx)>.01&&m<20){B.play([I()]);m++}}
  /* wait for the gate; his own Echo (replaying the way he went) may walk into him while he waits: ram it (a dash pushes it back
     along its log and leaves it harmless a moment), then step back to the gate's side */
  let w=0;while(B.ok&&S.gate<.5&&w<400){const q=EC.echoBox(S);
    if(q&&!EC.echoHarmless(S)&&Math.abs(q.y-S.p.y)<20&&Math.abs(q.x-S.p.x)<40&&S.p.dc){const d=q.x<S.p.x?{l:1}:{r:1};B.play([I({...d,b:1,bp:1})]);for(let i=0;i<12&&B.ok;i++)B.play([I(d)]);w+=13;continue}
    if(S.p.ground&&(S.p.x<11.5*T||S.p.x>13.5*T)){B.play([I(S.p.x<11.5*T?{r:1}:{l:1})]);w++;continue}
    B.play([I()]);w++}res.wait=w;
  let k=0;while(B.ok&&(S.gate>=.5||S.latch.k8)&&!(S.cr.q&&S.cr.q['6,9']!==undefined)&&k<120){B.play([I({l:1})]);k++}
  res.gate=!!S.latch.k8;
  let b=0;while(B.ok&&res.gate&&S.p.x<7.5*T&&b<60){B.play([I({r:1})]);b++}   /* off the switch before it falls */
  for(let i=0;i<60&&B.ok;i++)B.play([I()]);
  res.r4=!!S.latch['k8:R:6,5'];return res;
}
if(want('k8')){
  const R=ROOMS.k8;
  /* segment A, from the entry: up the hall, the cracked corner (lock 3), across the pit (lock 1) onto its switch */
  const SA=playState('k8',37*T,17*T-PH,{...ALL,undo:1});run(SA,3,I());const A=Bot(SA);
  A.leg('up',k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x>28*T),{prio:S=>S.p.y});
  A.leg('X drill',S=>!!S.latch['k8:R:38,4'],{prio:S=>-S.p.x+S.p.y});
  A.leg('takeoff',k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x<30*T&&S.p.x>27.5*T),{prio:S=>Math.abs(S.p.x-29*T)+Math.abs(S.p.y-7*T)});
  A.leg('pit',k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x<14*T),{prio:S=>S.p.x,budget:150000});
  A.leg('Q1',S=>S.cr.q&&S.cr.q['14,9']!==undefined,{prio:S=>-S.p.x});
  A.leg('off Q1',k8(S=>S.p.ground&&S.p.x<12*T&&ft(S)<=9*T+.1),{prio:S=>S.p.x});A.idle(80);
  ok(A.ok&&SA.latch['k8:R:38,4']&&SA.latch['k8:R:14,1'],`lock 3 (claws: drill the cracked corner, the drifter's beam falls on its rune) and lock 1 (root + board: the 13-wide pit, then its switch) by bot from the entry: ${sec(A.rec.length)} s${A.ok?'':' '+A.log.join('; ')}`);
  /* the history at the plate stand on the way in from the room entry: the trick continues the same visit */
  { const C=snapshot(SA);const B=Bot(C);B.leg('to gate front',k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x>=9.5*T&&S.p.x<12.5*T),{prio:S=>Math.abs(S.p.x-11*T)});const r=k8trick(B);
    ok(B.ok&&r.plate&&A.rec.length+B.rec.length>=181&&r.hist===181&&r.gate&&r.r4,`lock 4 (Undo), the same visit: ${A.rec.length+r.toPlate} live frames from the room entry to the plate stand (history ${r.hist}); stand 20 frames, rewind ${r.steps} steps to the gate's front, the Echo replays the stand and holds the plate ${r.wait} frames later; through the gate (latched) to the switch; its rune lights (gate ${r.gate}, rune ${r.r4})${B.ok?'':' '+B.log.join('; ')}`)}
  /* segment B, a fresh visit from the landing torch: the moat (lock 2, forged) and back up the shaft is not needed */
  const L1={'k8:R:38,4':1,'k8:R:14,1':1};
  const SB=k8visit({...ALL,undo:1},L1,...LANDING),BB=Bot(SB);
  BB.leg('closet roof',k8(S=>S.p.ground&&ft(S)<=5*T+.1&&S.p.x<10*T&&S.p.x>4*T),{prio:S=>S.p.y+S.p.x*.1});
  BB.leg('shaft',k8(S=>S.p.ground&&ft(S)>=16*T-.1&&S.p.x<5*T),{prio:S=>-S.p.y+Math.abs(S.p.x-2*T)*.3});
  BB.leg('moat',k8(S=>S.p.ground&&S.p.x>=27.5*T&&ft(S)<=16*T+.1),{prio:S=>-S.p.x,ram:1});
  {let m=0;while(BB.ok&&!(SB.cr.q&&SB.cr.q['29,16']!==undefined)&&m<30){BB.play([I({r:1})]);m++}m=0;while(BB.ok&&SB.p.x>27.9*T&&m<40){BB.play([I({l:1})]);m++}BB.idle(70)}   /* on the switch, then back off it before it falls */
  ok(BB.ok&&SB.latch['k8:R:29,12'],`lock 2 (the forged board): down the shaft, surf 16 tiles of lava under a roof three high to the walled-off far bank and its switch: ${sec(BB.rec.length)} s${BB.ok?'':' '+BB.log.join('; ')}`);
  /* segment C, a fresh visit from the landing torch: the Undo lock, and its control without the rewind */
  const L2={...L1,'k8:R:29,12':1};
  const SC=k8visit({...ALL,undo:1},L2,...LANDING),BC=Bot(SC),rc=k8trick(BC);
  ok(BC.ok&&rc.gate&&rc.r4&&rc.steps>0,`lock 4 (Undo) from the landing torch: the rewind lands at the gate's front, the gate opens ${rc.wait} frames later and latches as he walks in; its rune lights: ${sec(BC.rec.length)} s${BC.ok?'':' '+BC.log.join('; ')}`);
  /* without Undo: see the bound proof below (he cannot get back to the gate before the natural Echo lets it shut) */
  /* from every torch but the shaft's foot: from there his own Echo follows him up the shaft and meets him coming back down for
     the plate (a dead end with the Echo: ram or wrap it; reported, not botted) */
  const TORCH=R.torches.map(t=>[t.tx,t.ty]).filter(([x,y])=>!(x===3&&y===15));
  for(const [tx,ty] of TORCH){const S=k8visit({...ALL,undo:1},L2,tx,ty),B=Bot(S);
    if(tx>30){B.leg('up',k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x>28*T),{prio:S=>S.p.y,ram:1});B.leg('takeoff',k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x<30*T&&S.p.x>27.5*T),{prio:S=>Math.abs(S.p.x-29*T)+Math.abs(S.p.y-7*T),ram:1});B.leg('pit',k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x<14*T),{prio:S=>S.p.x,budget:150000,ram:1,noEcho:1})}
    if(ty>12)B.leg('up the shaft',k8(S=>S.p.ground&&ft(S)<=5*T+.1&&S.p.x<10*T&&S.p.x>4*T),{prio:S=>S.p.y,k:4,budget:30000,ram:1,noEcho:1});
    B.leg('to gate front',k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x>=9.5*T&&S.p.x<12.5*T),{prio:S=>Math.abs(S.p.x-11*T)+Math.abs(S.p.y-7*T),budget:150000,ram:1});
    const r=k8trick(B);ok(B.ok&&r.gate&&r.r4,`the Undo lock from the torch at (${tx},${ty}): ${B.ok?(r.gate&&r.r4?'works':'gate '+r.gate+' rune '+r.r4)+' ('+sec(B.rec.length)+' s, history '+r.hist+' at the stand, rewind '+r.steps+' steps, gate open after '+r.wait+')':B.log.join('; ')}`)}
  /* segment D: all four runes lit, the vault door is open; out through it into K9 */
  const SD=k8visit(ALL,{...L2,k8:1},...LANDING);SD.latch['k8:R:6,5']=1;SD.latch['k8:D:v']=1;   /* crystalTouch sets the door's latch as the last rune latches (segment C did that) */
  ok(rc.r4&&[4,5,6,7,8].every(x=>!E.solid(SD,R,x,1))&&[4,5,6,7,8].every(x=>E.solid(k8visit(ALL,L2,...LANDING),R,x,1)),'the vault door (the lock under the exit) is open with four runes lit and shut with three');
  const BD=Bot(SD);BD.leg('closet roof',k8(S=>S.p.ground&&ft(S)<=5*T+.1&&S.p.x<10*T&&S.p.x>4*T),{prio:S=>S.p.y+S.p.x*.1});BD.leg('k9',S=>S.room==='k9'&&S.p.ground,{prio:wyp});
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
  B.leg('into k9',S=>S.room==='k9'&&S.p.ground,{prio:wyp});
  const seat=ROOMS.k9.perches[0];B.leg('to the seat',on('k9',S=>S.p.ground&&Math.abs(S.p.x+PW/2-(seat.tx*T+T/2))<3&&Math.abs(ft(S)-(seat.ty+1)*T)<.5),{prio:S=>Math.abs(S.p.x+PW/2-(seat.tx*T+T/2))+Math.abs(S.p.y-(seat.ty-1)*T)});
  B.idle(140);const sat=S.sit>0;
  B.leg('up to k10',S=>S.room==='k10'&&S.p.ground,{prio:S=>wyp(S)+(S.room==='k9'?Math.abs(S.p.x-30*T)*.2:0)});
  TIMES.k9=B.marks['up to k10']!==undefined?B.rec.length:0;
  ok(B.ok&&sat,`K9 by bot: up from the vault, sits on the seat (the hush), climbs to the top and into Delete Core: ${sec(B.rec.length)} s${B.ok?'':' '+B.log.join('; ')}`);
  const P=ROOMS.k10.pedestals[0],K=B.S,n0=B.rec.length;B.leg('the fragment',S=>S.pieces[CK]===1,{prio:S=>Math.abs(S.p.x-P.tx*T)+S.p.y*.2});const n=B.rec.length-n0;
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
  k1:[[on('k1',S=>S.p.x<10*T),S=>S.p.x+S.p.y*.2,()=>false]]};
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
  const passed=[...new Set([...(R.cps||[]),...(H.cps||[]),'k10:37,17'])].map(k=>{const [id,xy]=k.split(':');const [tx,ty]=xy.split(',').map(Number);return {id,tx,ty}});
  note(`torches the chase passes (its checkpoints): ${passed.map(t=>t.id+':'+t.tx+','+t.ty).join(' ')}`);
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
  /* K7: replay the bot to frame f, hold Undo (a full meter), then solve from wherever that leaves him */
  if(!REC.k7)note('(run with SECTIONS including k7 for the K7 samples)');
  else{const {rec,k0}=REC.k7,res=[];
    for(let f=k0-60;f<rec.length-30;f+=45){const S=playState('k7',10*T,29*T-PH,{...ALL,undo:1});run(S,3,I());const B=Bot(S);for(let i=0;i<f&&B.ok;i++)B.play([dec(rec[i])]);if(!B.ok){res.push(f+':died in replay');continue}
      let n=0;for(;n<95;n++){B.play([I({z:1,zp:n===0})]);if(!S.undo.on)break}S.echo={on:0,log:[],i:0};
      for(let k=0;k<400&&B.ok&&S.undo.q<240;k++)B.play([I()]);   /* the rewind emptied the meter: a beat while it refills (a torch would fill it at once) */
      const springOk=()=>E.solid(S,ROOMS.k7,27,7);
      if(S.latch['k7:D:x']&&!springOk())E.enterRoom(S,'k7',{x:S.p.x,y:S.p.y});   /* the recovery when it is gone: leave and come back (the latch holds) */
      if(!(S.latch['k7:D:x']&&springOk()&&ft(S)<=12*T)){if(ft(S)>15*T){B.leg('B1',on('k7',S=>S.p.ground&&ft(S)<=22*T+.1&&S.p.x>11*T),{prio:S=>S.p.y,k:6,ram:1});B.leg('B2',on('k7',S=>S.p.ground&&ft(S)<=15*T+.1&&S.p.x>14*T),{prio:S=>S.p.y,k:6,ram:1})}
        B.leg('wall top',on('k7',S=>S.p.ground&&Math.abs(ft(S)-11*T)<.5&&S.p.x>20*T&&S.p.x<23*T),{prio:S=>Math.abs(S.p.x-21*T)+Math.abs(S.p.y-9*T),ram:1});if(!S.latch['k7:D:x'])k7trick(B);
        else B.leg('onto springboard',on('k7',S=>S.p.ground&&Math.abs(ft(S)-7*T)<.5&&S.p.x>25.5*T&&S.p.x<28.5*T),{prio:S=>Math.abs(S.p.x-27*T)+Math.abs(S.p.y-5*T),ram:1})}
      else if(!(S.p.ground&&Math.abs(ft(S)-7*T)<.5&&S.p.x>25.5*T&&S.p.x<28.5*T))B.leg('onto springboard',on('k7',S=>S.p.ground&&Math.abs(ft(S)-7*T)<.5&&S.p.x>25.5*T&&S.p.x<28.5*T),{prio:S=>Math.abs(S.p.x-27*T)+Math.abs(S.p.y-5*T),ram:1});
      B.leg('chamber',k7chamber('k7'),{prio:S=>S.p.y,ram:1});res.push(f+(B.ok?':ok':':'+B.log.join(',')))}
    ok(res.every(r=>r.endsWith(':ok')),`K7 (the Echo put to sleep after each rewind: a hazard he rams or wraps; the latches, the gate and the springboard are what the rewind must not lock): rewound at ${res.length} frames of the solution run (every 45 frames through the springboard trick), he still reaches the chamber each time${res.some(r=>!r.endsWith(':ok'))?': '+res.filter(r=>!r.endsWith(':ok')).join('; '):''}`)}
  /* K8's Undo lock: replay segment C to frame f, rewind, solve the lock again from there */
  { const L2={'k8:R:38,4':1,'k8:R:14,1':1,'k8:R:29,12':1},S0=k8visit({...ALL,undo:1},L2,...LANDING),B0=Bot(S0);k8trick(B0);const rec=B0.rec.slice(),res=[];
    for(let f=30;f<rec.length-20;f+=40){const S=k8visit({...ALL,undo:1},L2,...LANDING),B=Bot(S);for(let i=0;i<f&&B.ok;i++)B.play([dec(rec[i])]);if(!B.ok){res.push(f+':died in replay');continue}
      let n=0;for(;n<95;n++){B.play([I({z:1,zp:n===0})]);if(!S.undo.on)break}S.echo={on:0,log:[],i:0};
      for(let k=0;k<400&&B.ok&&S.undo.q<240;k++)B.play([I()]);   /* the rewind emptied the meter: a beat while it refills (a torch would fill it at once) */
      if(!S.latch['k8:R:6,5']){if(!S.latch.k8){B.leg('to gate front',k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x>=9.5*T&&S.p.x<12.5*T),{prio:S=>Math.abs(S.p.x-11*T)+Math.abs(S.p.y-7*T),budget:150000,ram:1});k8trick(B)}
        else{B.leg('Q4',S=>S.room==='k8'&&S.cr.q&&S.cr.q['6,9']!==undefined,{prio:S=>Math.abs(S.p.x-6*T)+Math.abs(S.p.y-7*T),ram:1});B.leg('out',k8(S=>S.p.x>9.5*T),{prio:S=>-S.p.x,ram:1});B.idle(40)}}
      res.push(f+(B.ok&&S.latch['k8:R:6,5']?':ok':':'+B.log.join(',')))}
    ok(res.every(r=>r.endsWith(':ok')),`K8's Undo lock: rewound at ${res.length} frames of its solution run, he still lights its rune each time${res.some(r=>!r.endsWith(':ok'))?': '+res.filter(r=>!r.endsWith(':ok')).join('; '):''}`)}
  { const S=playState('k8',10*T,9*T-PH,{...ALL,undo:1});S.latch.k8=1;S.gate=1;run(S,30,I());let shut=0;for(let k=0;k<60;k++){E.step(S,I({z:1,zp:k===0}),[]);if(E.solid(S,ROOMS.k8,9,6))shut++}
    ok(!shut,'a latched gate never shuts during a rewind (no rewind can lock the gate)')}
}

/* ---------------- time ---------------- */
console.log('time');
for(const [id,f] of Object.entries(TIMES))note(`${id} ${ROOMS[id].name.padEnd(13)} bot ${sec(f)} s`);
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails?1:0);
