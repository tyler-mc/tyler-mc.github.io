// Claws-aware reachability for room tests (agent E, Molten engine). A best-first search over short macro inputs on the
// REAL engine step (E.step), so it knows everything the game knows: the cling and its slow slide, wall jumps and the rule
// that they never gain height, vines (max 2 alive, the cooldown, growth time, withering), flowers as one-way footholds,
// the root jump, the board's dash and surf, lava and its burn-and-save jump, thorns, enemies. It never hands out a skill
// the game lacks, so a "not found" with exhausted:true is a proof over the quantised state space it searched.
// Import it; it runs nothing on its own:
//   import {reach,playState} from './molten_reach.mjs';
//   const r=reach(playState('m6',x,y,{root:1,board:1,claws:1}),S=>S.p.ground&&S.p.y+24<=5*12);
//   r.found / r.exhausted / r.nodes / r.inputs (frame by frame, replayable with E.step) / r.state (where it won)
// Options: k frames per macro (6), q px of position quantisation (4), tq frames of vine/cooldown quantisation (30),
// budget nodes (60000), dash (default: if he owns the board), drop (hold down to fall through flowers; default true with
// the claws), maxFrames (a cap on any path, default 60 s).
const G=new URL('../game/',import.meta.url).href;
const {newState,snapshot,restore}=await import(G+'state.js');
const {VINE}=await import(G+'claws.js');
const E=await import(G+'engine.js');

export const I=(o={})=>({l:0,r:0,u:0,d:0,j:0,jp:0,b:0,bp:0,drag:null,any:0,...o});
/* a lit play state in a room, items granted with their charges (the root jump, the dash) */
export function playState(room,x,y,items={}){
  const S=newState();Object.assign(S,{lit:1,litT:60,match:1,mode:'play'});Object.assign(S.items,items);
  E.enterRoom(S,room,{x,y});if(items.root)S.p.root=1;if(items.board)S.p.dc=1;return S;
}
/* the macros: a direction (-1, 0, 1) with the jump not held, held, or pressed at the start and held; optionally a dash
   either way and a drop (down held) */
function macros(o){
  const out=[];
  for(const d of [-1,0,1])for(const j of [0,1,2])out.push({d,j,b:0,dn:0});
  if(o.dash)for(const d of [-1,1])out.push({d,j:0,b:1,dn:0});
  if(o.drop)out.push({d:0,j:0,b:0,dn:1});
  return out;
}
const inputAt=(m,i)=>I({l:m.d<0?1:0,r:m.d>0?1:0,j:m.j?1:0,jp:m.j===2&&i===0?1:0,b:m.b&&i===0?1:0,bp:m.b&&i===0?1:0,d:m.dn});
/* the quantised state: what decides where he can go next. Speeds to 1 px/frame, a vine by its root, how grown it is (to a
   flower) and how long it has left (tq frames) */
function key(S,q,tq){
  const p=S.p,r=v=>Math.round(v/q);
  const v=(S.vines||[]).map(v=>[Math.round(v.by/8),Math.round(v.fx),Math.round(v.len/VINE.gap),Math.ceil((VINE.life-v.t)/tq)].join(',')).sort().join(';');
  return [S.room,r(p.x),r(p.y),Math.round(p.vx),p.ground?0:Math.round(p.vy),p.ground,p.cl,p.root,p.sj,p.dc,p.bo,p.surf,p.burn>0?1:0,
    p.wj?Math.round(p.wy/q):'',p.vc>0?Math.ceil(p.vc/tq):0,v,(S.drilled||[]).length,S.gate>=.5?1:0].join('|');
}
export function reach(S0,target,o={}){
  const k=o.k??6,q=o.q??4,tq=o.tq??30,budget=o.budget??60000,maxF=o.maxFrames??3600;
  const ms=macros({dash:o.dash??!!S0.items.board,drop:o.drop??!!S0.items.claws});
  /* best first: higher up, then fewer frames (a binary heap on [score, id]) */
  const score=o.prio||(S=>S.p.y);
  const heap=[],push=n=>{heap.push(n);let i=heap.length-1;while(i>0){const j=(i-1)>>1;if(heap[j].s<=n.s)break;heap[i]=heap[j];heap[j]=n;i=j}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){const a=2*i+1,b=a+1;let m=i;if(a<heap.length&&heap[a].s<heap[m].s)m=a;if(b<heap.length&&heap[b].s<heap[m].s)m=b;if(m===i)break;[heap[i],heap[m]]=[heap[m],heap[i]];i=m}}return top};
  const seen=new Set([key(S0,q,tq)]),nodes=[{snap:snapshot(S0),par:-1,m:null,f:0}];
  push({s:score(S0),id:0});let n=0;
  if(target(S0))return {found:true,exhausted:false,nodes:1,inputs:[],state:snapshot(S0)};
  while(heap.length&&n<budget){
    const {id}=pop(),nd=nodes[id];n++;
    if(nd.f>=maxF)continue;
    for(const m of ms){
      const C=snapshot(nd.snap);let dead=false,won=false;
      for(let i=0;i<k;i++){const ev=E.step(C,inputAt(m,i),[]);if(ev.includes('die')||C.p.dead){dead=true;break}if(target(C)){won=true;break}}
      if(dead)continue;
      const kk=key(C,q,tq);if(!won&&seen.has(kk))continue;seen.add(kk);
      const nid=nodes.length;nodes.push({snap:won?null:C,par:id,m,f:nd.f+k});
      if(won){const path=[];for(let x=nid;nodes[x].par>=0;x=nodes[x].par)path.unshift(nodes[x].m);
        const inputs=[];for(const pm of path)for(let i=0;i<k;i++)inputs.push(inputAt(pm,i));
        /* the last macro may have won mid-way: replay to find the exact frame */
        const R=snapshot(S0);let used=0;for(const inp of inputs){E.step(R,inp,[]);used++;if(target(R))break}
        return {found:true,exhausted:false,nodes:n,inputs:inputs.slice(0,used),state:R,frames:used};}
      push({s:score(C)+nodes[nid].f*1e-3,id:nid});
    }
    nd.snap=null;   /* expanded: its children hold what is needed (keeps memory flat) */
  }
  return {found:false,exhausted:!heap.length,nodes:n};
}
/* replay a reach() result from its start state; true when it ends on the target alive */
export function replay(S0,r,target){const S=snapshot(S0);for(const inp of r.inputs){const ev=E.step(S,inp,[]);if(ev.includes('die'))return false}return target(S)}
