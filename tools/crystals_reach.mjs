// Crystals-aware reachability for room tests (R1, 2026-11-07): tools/test_molten.mjs's best-first search over short macro
// inputs on the REAL engine step, with the Crystals state in its key (which shard steps have started and whether each has
// fallen, the platforms' phases, the Echo's index and wrap, the gate, the latch count), so a search never merges a state where
// a step has fallen with one where it has not. Options as in molten_reach.mjs, plus loose:true (drop the platform phases and
// the Echo from the key: much faster, may miss routes, found routes are real), tb:n (a time bucket of n frames in the key,
// so a loose search can still wait), bad(ev,S) (prune as if he died; it may also mark the clone, as the K4 pit proof does) and
// xkey(S) (a string added to the key, for such a mark).
// Undo: never search with it owned (A1: every snapshot copies the 181-frame buffer). noUndo(S) gives a clone without it, and
// with the Undo item hidden so the search cannot re-pick it; go()/waitGo() are bot stages that search on such a clone and
// replay the inputs on the real state. A rewind is never searched: it restores a past state, so it gives no distance.
// Import it; it runs nothing on its own.
const G=new URL('../game/',import.meta.url).href;
const {snapshot,newState,T,PERCH}=await import(G+'state.js');
const E=await import(G+'engine.js');
const {VINE}=await import(G+'claws.js');
const {ROOMS}=await import(G+'rooms/index.js');
const CR=await import(G+'crystals.js');
const EC=await import(G+'echo.js');
const U=await import(G+'undo.js');
export const I=(o={})=>({l:0,r:0,u:0,d:0,j:0,jp:0,b:0,bp:0,z:0,zp:0,drag:null,any:0,...o});
export function playState(room,x,y,items={}){const S=newState();Object.assign(S,{lit:1,litT:60,match:1,mode:'play'});Object.assign(S.items,items);
  S.placed=[1,1,1,0];E.enterRoom(S,room,{x,y});if(items.root)S.p.root=1;if(items.board)S.p.dc=1;return S}
const MAC=o=>{const out=[];for(const d of [-1,0,1])for(const j of [0,1,2])out.push({d,j,b:0,dn:0});if(o.dash)for(const d of [-1,1])out.push({d,j:0,b:1,dn:0});if(o.drop)out.push({d:0,j:0,b:0,dn:1});return out};
export const inputAt=(m,i)=>I({l:m.d<0?1:0,r:m.d>0?1:0,j:m.j?1:0,jp:m.j===2&&i===0?1:0,b:m.b&&i===0?1:0,bp:m.b&&i===0?1:0,d:m.dn});
export function key(S,q,tq,loose){const p=S.p,r=v=>Math.round(v/q);
  const v=(S.vines||[]).map(v=>[Math.round(v.by/8),Math.round(v.fx),Math.round(v.len/VINE.gap),Math.ceil((VINE.life-v.t)/tq)].join(',')).sort().join(';');
  const qd=(ROOMS[S.room]&&ROOMS[S.room].qd)||{},cq=S.cr&&S.cr.q?Object.keys(S.cr.q).sort().map(k=>{const d=qd[k]>0?qd[k]:24,t=S.cr.q[k];return k+':'+(t>=d?'x':Math.ceil((d-t)/12))}).join(';'):'';
  const pl=loose?'':S.ens.map(e=>e.k==='plat'?Math.round(e.u/q)+(e.dir>0?'+':'-')+Math.ceil(e.wt/6):e.k==='prism'?Math.round(e.ph*10)+'.'+e.lens:'').join(',');
  const ec=loose?'':S.echo&&S.echo.on?Math.round(S.echo.i/6)+'w'+Math.ceil((S.echo.wrap||0)/12):'';
  return [S.room,r(p.x),r(p.y),Math.round(p.vx),p.ground?0:Math.round(p.vy),p.ground,p.cl,p.root,p.sj,p.dc,p.bo,p.surf,p.burn>0?1:0,p.bd>0?1:0,
    p.wj?Math.round(p.wy/q):'',p.vc>0?Math.ceil(p.vc/tq):0,v,(S.drilled||[]).length,S.gate>=.5?1:0,Object.keys(S.latch||{}).length,cq,pl,ec,S.items.undo?1:0].join('|')}
/* a search clone with Undo dropped (no buffer to copy) and the item it would re-pick hidden: noUndo(S) */
export function noUndo(S){const C=snapshot(S);C.items.undo=0;C.undo.buf=[];C.undo.demo=0;C.__hide=1;return C}
export function hidden(fn){const keep={};for(const id in ROOMS){if(ROOMS[id].items.some(i=>i.id==='undo')){keep[id]=ROOMS[id].items;ROOMS[id].items=ROOMS[id].items.filter(i=>i.id!=='undo')}}try{return fn()}finally{for(const id in keep)ROOMS[id].items=keep[id]}}
export function reach(S0,target,o={}){
  if(S0.__hide){const keep={};for(const id in ROOMS){if(ROOMS[id].items.some(i=>i.id==='undo')){keep[id]=ROOMS[id].items;ROOMS[id].items=ROOMS[id].items.filter(i=>i.id!=='undo')}}
    try{return reach0(S0,target,o)}finally{for(const id in keep)ROOMS[id].items=keep[id]}}
  return reach0(S0,target,o)}
function reach0(S0,target,o={}){
  const k=o.k??4,q=o.q??4,tq=o.tq??30,budget=o.budget??60000,maxF=o.maxFrames??3600,bad=o.bad||(()=>false);
  const ms=MAC({dash:o.dash??!!S0.items.board,drop:o.drop??!!S0.items.claws}),score=o.prio||(S=>S.p.y);
  const heap=[],push=n=>{heap.push(n);let i=heap.length-1;while(i>0){const j=(i-1)>>1;if(heap[j].s<=n.s)break;heap[i]=heap[j];heap[j]=n;i=j}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){const a=2*i+1,b=a+1;let m=i;if(a<heap.length&&heap[a].s<heap[m].s)m=a;if(b<heap.length&&heap[b].s<heap[m].s)m=b;if(m===i)break;[heap[i],heap[m]]=[heap[m],heap[i]];i=m}}return top};
  const lo=!!o.loose,xk=o.xkey?S=>'|'+o.xkey(S):()=>'',seen=new Set([key(S0,q,tq,lo)+xk(S0)]),nodes=[{snap:snapshot(S0),par:-1,m:null,f:0}];push({s:score(S0),id:0});let n=0;
  if(target(S0))return {found:true,exhausted:false,nodes:1,inputs:[],frames:0};
  while(heap.length&&n<budget){const {id}=pop(),nd=nodes[id];n++;if(nd.f>=maxF)continue;
    for(const m of ms){const C=snapshot(nd.snap);let dead=false,won=false;
      for(let i=0;i<k;i++){const ev=E.step(C,inputAt(m,i),[]);if(o.dieOk&&(ev.includes('die')||C.p.dead)){won=true;break}if(ev.includes('die')||C.p.dead||bad(ev,C)){dead=true;break}if(target(C)){won=true;break}}
      if(dead)continue;const kk=key(C,q,tq,lo)+(o.tb?'|'+Math.floor((nd.f+k)/o.tb):'')+xk(C);if(!won&&seen.has(kk))continue;seen.add(kk);
      const nid=nodes.length;nodes.push({snap:won?null:C,par:id,m,f:nd.f+k});
      if(won)return won_(S0,nodes,nid,k,target,o,n)
      push({s:score(C)+nodes[nid].f*1e-3,id:nid})}
    nd.snap=null}
  return {found:false,exhausted:!heap.length,nodes:n};
}
/* the found path, replayed on a copy of the start (a death ends it when dieOk: a death is a respawn, never a soft lock) */
function won_(S0,nodes,nid,k,target,o,n){const path=[];for(let x=nid;nodes[x].par>=0;x=nodes[x].par)path.unshift(nodes[x].m);const inputs=[];for(const pm of path)for(let i=0;i<k;i++)inputs.push(inputAt(pm,i));
  const R=snapshot(S0);let used=0,died=false;for(const inp of inputs){const ev=E.step(R,inp,[]);used++;if(o.dieOk&&(ev.includes('die')||R.p.dead)){died=true;break}if(target(R))break}
  return {found:true,exhausted:false,nodes:n,inputs:inputs.slice(0,used),frames:used,state:R,died}}
export const trace=(S0,inputs)=>hidden(()=>{const C=snapshot(S0);const tr=[];inputs.forEach((inp,i)=>{const ev=E.step(C,inp,[]).filter(e=>e!=='footstep');if(i%12==0||ev.length)tr.push(`${i}:${(C.p.x/12).toFixed(1)},${((C.p.y+24)/12).toFixed(1)}${C.p.cl?'c':''}${ev.join('+')}${C.room}`)});return tr.join(' ')});
/* REC.on: an array to record every frame the bot stages below play on the real state, [input, items he had] (a stage may
   lend him fewer items), so the tests' fairness sweep can replay a run exactly: replayRec(S, rec, from, to) */
export const REC={on:null,tick:null};
const IT=['root','board','claws','forged'];
const rstep=(S,i)=>{if(REC.on)REC.on.push([i,IT.map(k=>S.items[k]?1:0).join('')]);const ev=E.step(S,i,[]);if(REC.tick)REC.tick(S,ev);return ev};
export function replayRec(S,rec,a=0,b=rec.length){const keep={...S.items},ev=[];
  try{for(let n=a;n<b;n++){const [i,it]=rec[n];IT.forEach((k,j)=>S.items[k]=+it[j]);ev.push(...E.step(S,i,[]))}}finally{for(const k of IT)S.items[k]=keep[k]}return ev}
export const play=(S,inputs)=>{const ev=[];for(const i of inputs)ev.push(...rstep(S,i));return ev};
export {E,snapshot};
/* a bot stage on the real state S (Undo owned or not): search on a clone with `items` overriding his items (default: as he
   is), replay the found inputs on S with the same items, then put his items back. Returns the frames used or -1 */
export function go(S,target,o={},items=null,rec=true){const keep={...S.items};if(items){for(const k of ['root','board','claws','forged'])S.items[k]=items[k]?1:0}
  try{const C=S.items.undo?noUndo(S):snapshot(S);if(S.items.undo)C.__hide=1;const r=reach(C,target,o);if(!r.found)return -1;
    const rp=()=>{for(const i of r.inputs)rec?rstep(S,i):E.step(S,i,[])};if(S.items.undo)hidden(rp);else rp();return r.frames}finally{Object.assign(S.items,keep)}}
/* wait-then-search: idle w frames (w = 0, step, 2*step, ... max), then a short search; the first that works is played on S */
export function waitGo(S,target,o={},items=null,{step=4,max=480,stay=null}={}){
  for(let w=0;w<=max;w+=step){const C=snapshot(S);let ok=true;for(let i=0;i<w;i++){const ev=E.step(C,I(),[]);if(ev.includes('die')||(stay&&!stay(C))){ok=false;break}}if(!ok)break;
    const f=go(C,target,o,items,false);if(f>=0){for(let i=0;i<w;i++)rstep(S,I());const g=go(S,target,o,items);return g>=0?w+g:-1}}
  return -1}

/* ---------------- shared bot helpers (Fixer A, 2026-11-07): R1's climb (hub to K6) and R2's rooms (K6 to K10), factored
   out of test_crystals_rooms.mjs and test_crystals_rooms2.mjs so tools/test_crystals_chain.mjs can walk the whole tower on
   one carried state. Moved verbatim (same searches, same priorities, same order), so both suites' bots are unchanged ---------------- */
export const PW=18,PH=24;
export const ft=S=>S.p.y+PH,wyp=S=>ROOMS[S.room].at[1]*T+S.p.y,wxp=S=>ROOMS[S.room].at[0]*T+S.p.x;
export const on=(id,f)=>S=>S.room===id&&f(S);
/* standing on the tile row whose top is at feet f (room px), his middle within r px of column x (tiles) */
export const at=(id,x,f,r=8)=>S=>S.room===id&&S.p.ground&&Math.abs(ft(S)-f)<.5&&Math.abs(S.p.x+PW/2-x*T)<r;
export const toward=(x,f)=>S=>Math.hypot(S.p.x+PW/2-x*T,ft(S)-f);
export const into=(id,x,f)=>S=>S.room===id?-1e6:toward(x,f)(S);
const R2I={root:1,board:1};
/* K4 Echo Hall (Fixer C, 2026-11-07): the plate sits on a lone shard at the foot of a thorn-walled pit east of the gate's
   front. On the plate (pressed, standing on the shard), and solution A: stand s frames (the shard gives way after its delay),
   a full rewind, the Echo replays the stand and holds the gate, walk through it. K4GATE: the gate's front, pressed against the gate */
export const K4GATE=[10.6,84];
export const onPlate=S=>S.room==='k4'&&S.p.ground&&S.plate===1;
export function solutionA(S,s,play,{full=false}={}){const ev=[];const P=i=>{ev.push(...play(S,i))};for(let i=0;i<s&&!S.p.dead;i++)P(I());
  /* rewind till he stands on the rim again east of the pit (where he dropped in), then let go; full: to the buffer's start */
  let n=0;for(let i=0;i<100;i++){P(I({z:1,zp:i===0}));if(S.undo.on)n++;else if(i>2)break;if(!full&&i>4&&S.p.ground&&ft(S)<=8*T+.1&&S.p.x>12.5*T){P(I());break}}
  const t0=S.t;const g1=go(S,at('k4',K4GATE[0],K4GATE[1],5),{budget:20000,prio:S=>toward(...K4GATE)(S)+(ft(S)>8*T+.5?600:0),loose:1},{});   /* steered off the floors below the rim (the pit, the hall) */
  let w=0;while(S.gate<.5&&w<600&&!S.p.dead){P(I());w++}
  let k=0;while(!(S.latch&&S.latch.k4)&&k<60&&!S.p.dead){P(I({l:1}));k++}
  return {n,g1,w,latched:!!(S.latch&&S.latch.k4),dead:ev.includes('die')||!!S.p.dead,f:S.t-t0}}
/* R1's climb by bot on B (from the hub floor, all items but Undo) up to standing in K6. len(): frames played so far (marks
   per room are indexes in it). Returns what test_crystals_rooms.mjs asserts */
export function climbR1(B,{len=()=>0,log=console.log}={}){
  const marks={},out={marks};
  const stage=(name,fn)=>{if(B.room&&marks[B.room]===undefined)marks[B.room]=len();const r=fn();if(r<0||B.p.dead){log(`    bot stuck at ${name} (${B.room} ${(B.p.x/T).toFixed(1)},${(ft(B)/T).toFixed(1)})`);return false}if(marks[B.room]===undefined)marks[B.room]=len();return true};
  const idle=n=>play(B,Array(n).fill(I()));
  const perch=(id,tx)=>stage(id+' perch',()=>go(B,at(id,tx+.5,(ROOMS[id].perches[0].ty+1)*T,2),{budget:40000,prio:toward(tx+.5,(ROOMS[id].perches[0].ty+1)*T)},{root:1,board:1}))&&(idle(PERCH.wait+PERCH.drift+10),B.sit>0);
  const onW=n=>S=>{if(S.room!=='k3')return false;const e=S.ens.filter(e=>e.k==='plat')[n];return S.p.ground&&Math.abs(ft(S)-e.y)<1&&S.p.x+PW>e.x&&S.p.x<e.x+e.w};
  const wd=n=>S=>{if(S.room!=='k3')return 1e9;const e=S.ens.filter(e=>e.k==='plat')[n];return Math.hypot(S.p.x-e.x,ft(S)-e.y)};
  const legs=(id,list,items=R2I,next)=>list.every(([x,f])=>stage(`${id} ${x},${f}`,()=>go(B,at(id,x,f),{budget:40000,prio:toward(x,f)},items)))&&
    (!next||stage(id+' exit',()=>go(B,S=>S.room===next&&S.p.ground,{budget:60000,prio:into(next,next==='k2'||next==='k4'||next==='k6'?33:6,-12)},items)));
  let ok1=stage('hub',()=>go(B,S=>S.room==='k1'&&S.p.ground,{budget:150000,prio:S=>S.room==='k1'?-1e6:S.p.y},{root:1}));
  out.sat1=ok1&&perch('k1',12);
  out.ok1=ok1=ok1&&legs('k1',[[26.5,156],[33.5,120],[30,84],[35,36]],R2I,'k2');
  /* K2: the item, its demo, the vault */
  let ok2=ok1&&stage('k2 item',()=>go(B,S=>S.items.undo===1,{budget:100000,prio:S=>Math.hypot(S.p.x-16*T,S.p.y-10*T)},R2I));
  out.demo=null;
  if(ok2){const pick=U.frameOf(B),y0=B.p.y;let drop=0,back=null,f=0,ev=[],undoStart=-1,minM=1;
    while(B.undo.demo&&f<400){const e=play(B,[I()]);ev.push(...e);f++;drop=Math.max(drop,B.p.y-y0);if(e.includes('undo_start'))undoStart=f;if(B.undo.on&&B.undo.buf.length===1)back=U.frameOf(B);minM=Math.min(minM,B.undo.m)}
    out.demo={f,drop,ok:back===pick,back,pick,undoStart,done:!B.undo.demo}}
  out.ok2=ok2=ok2&&legs('k2',[[13,144],[9.5,96],[4,36]],R2I,'k3');
  /* K3: the platforms (root) */
  out.ok3=ok2&&stage('k3 W1',()=>go(B,onW(2),{budget:60000,prio:S=>Math.abs(S.p.x-10*T)+Math.abs(S.p.y-120),loose:1},{root:1}))&&
    stage('k3 W2',()=>waitGo(B,onW(1),{budget:15000,prio:wd(1)},{root:1},{stay:onW(2)}))&&
    stage('k3 W3',()=>waitGo(B,onW(0),{budget:15000,prio:wd(0)},{root:1},{stay:onW(1)}))&&
    stage('k3 exit',()=>waitGo(B,S=>S.room==='k4'&&S.p.ground,{budget:20000,prio:into('k4',33,-12)},{root:1},{stay:onW(0)}));
  /* K4: the Echo Hall, solution A */
  let ok4=out.ok3&&legs('k4',[[23.5,168],[28.5,132],[24.5,96],[22,96],[14.5,84]],{})&&stage('k4 plate',()=>go(B,onPlate,{budget:20000,prio:toward(12.5,192),loose:1},{}));
  out.plateF=-1;out.rA=null;
  if(ok4){out.plateF=len()-marks.k4;const r=out.rA=solutionA(B,16,(S,i)=>play(S,[i]));
    ok4=r.latched&&!r.dead&&stage('k4 exit',()=>go(B,S=>S.room==='k5'&&S.p.ground,{budget:60000,prio:into('k5',6,-12),loose:1},{root:1}))}
  out.ok4=ok4;
  out.ok5=ok4&&perch('k5',14)&&legs('k5',[[20,192],[27,156],[33,120],[31,84],[34.5,36]],R2I,'k6');
  return out}

/* R2's search (test_crystals_rooms2.mjs): the same best-first search with a finer key (shard timers, receiver rings, this
   room's latches, every drifter's lens, wrap, grace and pulse, the platforms, the plate, the Echo's exact index). Its leak
   proofs' "exhausted" claims rest on this key, so it is kept apart from key() above */
export function keyFine(S,q,tq){const p=S.p,r=v=>Math.round(v/q);
  const v=(S.vines||[]).map(v=>[Math.round(v.by/8),Math.round(v.fx),Math.round(v.len/VINE.gap),Math.ceil((VINE.life-v.t)/tq)].join(',')).sort().join(';');
  const C=S.cr||{},qs=Object.entries(C.q||{}).map(([k,t])=>k+':'+(t<CR.CRY.delay?Math.floor(t/6):'g')).sort().join(';');
  const rx=Object.entries(C.rx||{}).map(([k,n])=>k+':'+Math.floor(n/5)).sort().join(';');
  const la=Object.keys(S.latch||{}).filter(k=>k===S.room||k.startsWith(S.room+':')).sort().join(';');
  const en=S.ens.map(e=>e.k==='prism'?[e.lens,e.wrap>0?Math.ceil(e.wrap/tq):0,e.grace>0?Math.ceil(e.grace/10):0,e.ret,Math.round(e.y/q),Math.round(e.x/q),e.per?Math.floor((e.t%e.per)/6):''].join(','):e.k==='plat'?[Math.round(e.u/q),e.dir,Math.ceil(e.wt/10)].join(','):'').join('/');
  const ec=S.echo&&S.echo.on?[S.echo.i,S.echo.wrap>0?Math.ceil(S.echo.wrap/tq):0].join(','):'';
  return [S.room,r(p.x),r(p.y),Math.round(p.vx),p.ground?0:Math.round(p.vy),p.ground,p.cl,p.root,p.sj,p.dc,p.bo,p.surf,p.burn>0?1:0,p.bd>0?1:0,
    p.wj?Math.round(p.wy/q):'',p.vc>0?Math.ceil(p.vc/tq):0,v,(S.drilled||[]).length,S.crack?Math.floor(S.crack[2]/6):'',S.gate>=.5?1:0,S.plate,qs,rx,la,en,ec,S.items.forged,S.items.claws].join('|')}
export function reachFine(S0,target,o={}){
  const k=o.k??4,q=o.q??4,tq=o.tq??30,budget=o.budget??60000,maxF=o.maxFrames??3600,bad=o.bad||(()=>false);
  const ms=MAC({dash:o.dash??!!S0.items.board,drop:o.drop??!!S0.items.claws}),score=o.prio||(S=>S.p.y);
  const heap=[],push=n=>{heap.push(n);let i=heap.length-1;while(i>0){const j=(i-1)>>1;if(heap[j].s<=n.s)break;heap[i]=heap[j];heap[j]=n;i=j}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){const a=2*i+1,b=a+1;let m=i;if(a<heap.length&&heap[a].s<heap[m].s)m=a;if(b<heap.length&&heap[b].s<heap[m].s)m=b;if(m===i)break;[heap[i],heap[m]]=[heap[m],heap[i]];i=m}}return top};
  const xk=o.xkey?S=>'|'+o.xkey(S):()=>'',seen=new Set([keyFine(S0,q,tq)+xk(S0)]),nodes=[{snap:snapshot(S0),par:-1,m:null,f:0}];push({s:score(S0),id:0});let n=0;
  if(target(S0))return {found:true,exhausted:false,nodes:1,inputs:[],frames:0};
  while(heap.length&&n<budget){const {id}=pop(),nd=nodes[id];n++;if(nd.f>=maxF)continue;
    for(const m of ms){const C=snapshot(nd.snap);let dead=false,won=false;
      for(let i=0;i<k;i++){const ev=E.step(C,inputAt(m,i),[]);if(o.dieOk&&(ev.includes('die')||C.p.dead)){won=true;break}if(ev.includes('die')||C.p.dead||bad(ev,C)){dead=true;break}if(target(C)){won=true;break}}
      if(dead)continue;const kk=keyFine(C,q,tq)+xk(C);if(!won&&seen.has(kk))continue;seen.add(kk);
      const nid=nodes.length;nodes.push({snap:won?null:C,par:id,m,f:nd.f+k});
      if(won)return won_(S0,nodes,nid,k,target,o,n);
      push({s:score(C)+nodes[nid].f*1e-3,id:nid})}
    nd.snap=null}
  return {found:false,exhausted:!heap.length,nodes:n};
}
export const enc=i=>(i.l?1:0)|(i.r?2:0)|(i.j?4:0)|(i.jp?8:0)|(i.b?16:0)|(i.bp?32:0)|(i.d?64:0)|(i.z?128:0)|(i.zp?256:0);
export const dec=c=>I({l:c&1,r:(c>>1)&1,j:(c>>2)&1,jp:(c>>3)&1,b:(c>>4)&1,bp:(c>>5)&1,d:(c>>6)&1,z:(c>>7)&1,zp:(c>>8)&1});
/* R2's bot: plays on S and records codes; leg() searches (reachFine) on an Undo-free copy (optionally with the Echo asleep) and replays */
export function Bot(S){const B={S,rec:[],ok:true,marks:{},log:[]};
  B.play=ins=>{for(const i of ins){const ev=E.step(S,i,[]);B.rec.push(enc(i));if(REC.tick)REC.tick(S,ev);if(ev.includes('die')){B.ok=false;B.log.push(`died (${S.flash}) in ${S.room} at ${(S.p.x/T).toFixed(1)},${(ft(S)/T).toFixed(1)}`);return false}}return true};
  B.idle=n=>B.play(Array(n).fill(I()));
  B.leg=(name,target,o={})=>{if(!B.ok)return false;const C=snapshot(S);C.items.undo=0;C.undo.buf=[];if(o.noEcho)C.echo={on:0,log:[],i:0};
    const r=(o.coarse?reach:reachFine)(C,target,{budget:60000,bad:o.ram?()=>false:ev=>ev.includes('echo_ram')||ev.includes('echo_wrap'),...o});   /* coarse: key() (with loose:1, the Echo out of it), for a leg where the Echo's index in the key starves the search */
    if(!r.found){B.ok=false;B.log.push(`stuck before ${name} in ${S.room} at ${(S.p.x/T).toFixed(1)},${(ft(S)/T).toFixed(1)} (${r.nodes} nodes)`);return false}
    B.marks[name]=B.rec.length;return B.play(r.inputs)};
  return B}
/* K6 Prism Gallery: from the arrival beside the floor hole up, across the drifter's beam, the exit shelf, into K7 */
export function k6Bot(B){const pr=S=>Math.abs(S.p.x-12*T)+Math.abs(S.p.y-6*T);
  B.leg('up',on('k6',S=>S.p.ground&&ft(S)<=8*T+.1&&S.p.x>22*T),{prio:S=>S.p.y});B.leg('cross',on('k6',S=>S.p.ground&&ft(S)<=8*T+.1&&S.p.x<15*T),{prio:pr});
  B.leg('exit shelf',on('k6',S=>S.p.ground&&ft(S)<=3*T+.1&&S.p.x<11*T),{prio:S=>Math.abs(S.p.x-10*T)+Math.abs(S.p.y-T)});B.leg('k7',S=>S.room==='k7'&&S.p.ground,{prio:wyp});return B.ok}
/* K7 Atrium */
export const k7chamber=id=>on(id,S=>S.p.ground&&ft(S)<=3*T+.1);
export function k7trick(B,id='k7'){   // from the shard wall's top: onto the springboard, back to the wall, wait for the latch, rewind onto the springboard, up
  const S=B.S;
  B.leg('onto springboard',on(id,S=>S.p.ground&&Math.abs(ft(S)-7*T)<.5&&S.p.x>25.5*T&&S.p.x<28.5*T),{prio:S=>Math.abs(S.p.x-27*T)+Math.abs(S.p.y-5*T),ram:1});
  B.leg('back to the wall',on(id,S=>(S.p.ground||S.p.cl)&&S.p.x<24*T&&ft(S)<=12*T),{prio:S=>Math.abs(S.p.x-21*T)+Math.abs(S.p.y-9*T),ram:1});
  let w=0;while(B.ok&&!S.latch[id+':D:x']&&w<240){B.play([I(S.p.cl?{l:S.p.cl<0?1:0,r:S.p.cl>0?1:0}:{})]);w++}
  const latched=!!S.latch[id+':D:x'],gone=!E.solid(S,ROOMS[id],27,7);
  let n=0;if(S.items.undo)for(;n<100&&B.ok;n++){B.play([I({z:1,zp:n===0})]);if(!S.undo.on)break;if(S.p.ground&&Math.abs(ft(S)-7*T)<.5&&S.p.x>25.5*T&&S.p.x<28.5*T&&E.solid(S,ROOMS[id],27,7)){B.play([I()]);break}}
  return {latched,gone,steps:n};
}
/* the climbs from K7's entry to the shard wall's top (k0: the frame the trick starts), the trick, the chamber, into K8 */
export function k7Approach(B){
  B.leg('B1',on('k7',S=>S.p.ground&&Math.abs(ft(S)-22*T)<.5&&S.p.x>11*T&&S.p.x<15*T),{prio:S=>S.p.y+Math.abs(S.p.x-12*T)*.2,k:6,ram:1});
  B.leg('B2',on('k7',S=>S.p.ground&&Math.abs(ft(S)-15*T)<.5&&S.p.x>14*T&&S.p.x<18*T),{prio:S=>S.p.y+Math.abs(S.p.x-16*T)*.2,k:6,ram:1});
  B.leg('shard wall top',on('k7',S=>S.p.ground&&Math.abs(ft(S)-11*T)<.5&&S.p.x>20*T&&S.p.x<23*T),{prio:S=>Math.abs(S.p.x-21*T)+Math.abs(S.p.y-9*T),ram:1});
  return B.rec.length}
export function k7Bot(B){const k0=k7Approach(B),tr=k7trick(B);
  B.leg('chamber',k7chamber('k7'),{prio:S=>S.p.y,ram:1});B.leg('k8',S=>S.room==='k8'&&S.p.ground,{prio:wyp,ram:1});return {k0,tr}}
/* K8 Vault Gate */
export const k8=f=>on('k8',f);
export const LANDING=[10,8];
/* segment A, from the entry: up the hall, the cracked corner (lock 3), across the pit (lock 1) onto its switch */
export function k8A(A,{ram=0}={}){   /* ram:1 lets the legs ram or wrap the Echo (a carried visit, where it follows him up from the arrival) */
  const R=ram?{ram:1}:{};
  A.leg('up',k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x>28*T),{prio:S=>S.p.y,...R});
  A.leg('X drill',S=>!!S.latch['k8:R:38,4'],{prio:S=>-S.p.x+S.p.y,...R});
  A.leg('takeoff',k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x<30*T&&S.p.x>27.5*T),{prio:S=>Math.abs(S.p.x-29*T)+Math.abs(S.p.y-7*T),...R});
  A.leg('pit',k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x<14*T),{prio:S=>S.p.x,budget:150000,...R});
  A.leg('Q1',S=>S.cr.q&&S.cr.q['14,9']!==undefined,{prio:S=>-S.p.x,...R});
  A.leg('off Q1',k8(S=>S.p.ground&&S.p.x<12*T&&ft(S)<=9*T+.1),{prio:S=>S.p.x,...R});A.idle(80);return A.ok}
/* the Undo lock: from the gate's front, over the closet, down the shaft to the plate, stand s, rewind, wait at the gate, in to Q4, out */
export function k8trick(B,{s=20,undo=true}={}){
  const S=B.S,g0=B.rec.length;B.idle(10);   /* a beat at the gate's front (where the rewind should bring him back) */
  /* no ram on the way to the plate (Fixer A, after the engine's ram fix: a ram now pushes a waiting Echo back too, lag never
     under 120, so every ram on the way delays the Echo's replay of the stand past the window) */
  B.leg('closet roof',k8(S=>S.p.ground&&ft(S)<=5*T+.1&&S.p.x<10*T&&S.p.x>4*T),{prio:S=>S.p.y+S.p.x*.1});
  B.leg('shaft',k8(S=>S.p.ground&&ft(S)>=16*T-.1&&S.p.x<5*T),{prio:S=>-S.p.y+Math.abs(S.p.x-2*T)*.3});
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
    if(q&&S.echo.i>=0&&!EC.echoHarmless(S)&&Math.abs(q.y-S.p.y)<20&&Math.abs(q.x-S.p.x)<40&&S.p.dc){   /* never a waiting one (i<0): it stands still at his start */const d=q.x<S.p.x?{l:1}:{r:1};B.play([I({...d,b:1,bp:1})]);for(let i=0;i<12&&B.ok;i++)B.play([I(d)]);w+=13;continue}
    if(S.p.ground&&(S.p.x<11.5*T||S.p.x>13.5*T)){B.play([I(S.p.x<11.5*T?{r:1}:{l:1})]);w++;continue}
    B.play([I()]);w++}res.wait=w;
  let k=0;while(B.ok&&(S.gate>=.5||S.latch.k8)&&!(S.cr.q&&S.cr.q['6,9']!==undefined)&&k<120){B.play([I({l:1})]);k++}
  res.gate=!!S.latch.k8;
  let b=0;while(B.ok&&res.gate&&S.p.x<7.5*T&&b<60){B.play([I({r:1})]);b++}   /* off the switch before it falls */
  for(let i=0;i<60&&B.ok;i++)B.play([I()]);
  res.r4=!!S.latch['k8:R:6,5'];return res;
}
/* segment B: over the closet roof, down the shaft, surf the lava moat to the walled-off far bank, on its switch and off */
export function k8Moat(BB,{ram=0}={}){const SB=BB.S,R=ram?{ram:1}:{};
  BB.leg('closet roof',k8(S=>S.p.ground&&ft(S)<=5*T+.1&&S.p.x<10*T&&S.p.x>4*T),{prio:S=>S.p.y+S.p.x*.1,...R});
  BB.leg('shaft',k8(S=>S.p.ground&&ft(S)>=16*T-.1&&S.p.x<5*T),{prio:S=>-S.p.y+Math.abs(S.p.x-2*T)*.3,...R});
  BB.leg('moat',k8(S=>S.p.ground&&S.p.x>=27.5*T&&ft(S)<=16*T+.1),{prio:S=>-S.p.x,ram:1});
  {let m=0;while(BB.ok&&!(SB.cr.q&&SB.cr.q['29,16']!==undefined)&&m<30){BB.play([I({r:1})]);m++}m=0;while(BB.ok&&SB.p.x>27.9*T&&m<40){BB.play([I({l:1})]);m++}BB.idle(70)}   /* on the switch, then back off it before it falls */
  return BB.ok}
/* segment D: the vault door open, over the closet roof and out into K9 */
export function k8Out(BD,{ram=0}={}){const R=ram?{ram:1}:{};BD.leg('closet roof',k8(S=>S.p.ground&&ft(S)<=5*T+.1&&S.p.x<10*T&&S.p.x>4*T),{prio:S=>S.p.y+S.p.x*.1,...R});BD.leg('k9',S=>S.room==='k9'&&S.p.ground,{prio:wyp,...R});return BD.ok}
/* K9 Delete Hush: in from below, the seat (the hush), up into K10 */
export function k9Bot(B){const S=B.S;
  B.leg('into k9',S=>S.room==='k9'&&S.p.ground,{prio:wyp});
  const seat=ROOMS.k9.perches[0];B.leg('to the seat',on('k9',S=>S.p.ground&&Math.abs(S.p.x+PW/2-(seat.tx*T+T/2))<3&&Math.abs(ft(S)-(seat.ty+1)*T)<.5),{prio:S=>Math.abs(S.p.x+PW/2-(seat.tx*T+T/2))+Math.abs(S.p.y-(seat.ty-1)*T)});
  B.idle(140);const sat=S.sit>0;
  B.leg('up to k10',S=>S.room==='k10'&&S.p.ground,{prio:S=>wyp(S)+(S.room==='k9'?Math.abs(S.p.x-30*T)*.2:0)});
  return {sat}}
/* K10 Delete Core: walk into the fragment (piece index ck) */
export function k10Frag(B,ck){const P=ROOMS.k10.pedestals[0];B.leg('the fragment',S=>S.pieces[ck]===1,{prio:S=>Math.abs(S.p.x-P.tx*T)+S.p.y*.2});return B.ok}

/* ---------------- fairness (CL6), the escape bar (Fixer A, 2026-11-07) ----------------
   A rewound state is fair if from that exact state he can reach the next room, or leave the room any other way (the hatch or
   the arrival: the room resets when he comes back, and the meter refills meanwhile, so this also stands for "Undo again
   once the meter refills"), or die (a death respawns him at the last torch with the room reset: never a soft lock). Only
   "stuck alive" fails. Every search runs on an Undo-free clone (noUndo; a snapshot of a full buffer costs ~1.5 ms), from
   the exact rewound state R0. Classes, tried in this order with their own steered searches:
     route   the run's own inputs from the rewound frame (replay) or a search reach the next room alive
     leave   a search leaves the room alive (to the previous room through the hatch or the arrival)
     dies    only a death was found (the replay's death counts: the Echo is anchored and sits somewhere new)
     stuck   none of them, even on the re-check (3x budget, steered at the hatch and at the door, both keys) */
export const hazardPrio=id=>{const R=ROOMS[id],hz=[];R.g.forEach((row,y)=>[...row].forEach((c,x)=>{if('^L'.includes(c))hz.push([x*T+T/2,y*T+T/2])}));
  return S=>{if(S.room!==id)return 1e6;const cx=S.p.x+PW/2,cy=S.p.y+PH/2;let d=1e5;for(const [x,y] of hz)d=Math.min(d,Math.hypot(x-cx,y-cy));
    const b=EC.echoBox(S);if(b)d=Math.min(d,Math.hypot(b.x-S.p.x,b.y-S.p.y)+(EC.echoHarmless(S)?EC.echoHarmless(S)*2:0));return d}};
export function escapeClass(R0,{id,next,routePrio,leavePrio,diePrio=hazardPrio(id),budget=30000,routeBudget=12000,leaveBudget=60000,replay=null,after=null}){
  const out={tries:[]};let replayDied=false;
  if(replay){const C=snapshot(R0);const ev=replay(C);const died=ev.includes('die')||C.p.dead;
    if(!died&&C.room===next)return {...out,cls:'route',how:'replay'};
    if(!died&&after){const r=after(C);if(r&&r.found)return {...out,cls:'route',how:'replay+search',frames:r.frames}}
    replayDied=died;out.tries.push(died?'replay dies':'replay ends in '+C.room)}
  const nu=()=>noUndo(R0);
  const r1=reach(nu(),S=>S.room===next,{budget:routeBudget,prio:routePrio,loose:1,tb:12});if(r1.found)return {...out,cls:'route',how:'search',frames:r1.frames,nodes:r1.nodes};   /* loose (the Echo out of the key) and short: a found route is real, a miss only moves the point on to the leave search */
  out.tries.push(`route ${r1.nodes}${r1.exhausted?'x':''}`);
  /* leave: loose first (the Echo's index out of the key, so waiting in a local minimum of the priority does not starve the
     search; a found route is real), then the full key */
  for(const lo of [1,0]){const r2=reach(nu(),S=>S.room!==id,{budget:leaveBudget,prio:leavePrio,loose:lo});if(r2.found)return {...out,cls:'leave',to:r2.state.room,frames:r2.frames,nodes:r2.nodes};
    out.tries.push(`leave${lo?' loose':''} ${r2.nodes}${r2.exhausted?'x':''}`)}
  if(replayDied)return {...out,cls:'dies',how:'replay'};
  const r3=reach(nu(),S=>!!S.p.dead,{budget,prio:diePrio,dieOk:1});if(r3.found)return {...out,cls:'dies',how:'search',frames:r3.frames,src:r3.state.flash};
  out.tries.push(`die ${r3.nodes}${r3.exhausted?'x':''}`);
  /* the re-check: 3x the budget, any escape, steered at the hatch (leavePrio) and at the door (routePrio), coarse and fine keys */
  const any=S=>S.room!==id;
  for(const [nm,R] of [['coarse',reach],['fine',reachFine]])for(const [pn,pr] of [['hatch',leavePrio],['door',routePrio]]){
    const r=R(nu(),any,{budget:3*leaveBudget,prio:pr,dieOk:1});if(r.found)return {...out,cls:r.died?'dies':r.state.room===next?'route':'leave',how:`re-check ${nm} ${pn}`,frames:r.frames};
    out.tries.push(`${nm} ${pn} ${r.nodes}${r.exhausted?'x':''}`)}
  return {...out,cls:'stuck'}}
