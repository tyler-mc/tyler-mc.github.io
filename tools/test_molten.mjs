// Molten rooms (agent G, 2026-11-06): the spoke m1..m11, its gates, its chase and its pacing, on the real step.
// Bots: each room is crossed by a staged search on the real engine (tools/molten_reach.mjs's method), with exactly the items
// he has there (root + board on arrival, the forged board from Steam Lake, the claws from Cinder Pit); the found inputs are
// recorded frame by frame and replayed, so every run is exact. Leak proofs search a copy of the room parsed far away (its
// edges are solid), so the search can finish ("exhausted": no reachable state was left unexplored at its quantisation),
// each paired with a control that the same search solves. Plain node, no deps: node tools/test_molten.mjs
// QUICK=1 skips the slow proofs (the exhausted leak searches).
const G=new URL('../game/',import.meta.url).href;
const {T,newState,snapshot,restore,persist,PERCH,PIECES}=await import(G+'state.js');
const E=await import(G+'engine.js');
const {ROOMS,ORDER,CHASES,NEXT,AMB,parse,roomAtTile,perchOf}=await import(G+'rooms/index.js');
const {VINE}=await import(G+'claws.js');
const GY=await import(G+'geysers.js');
const CH=await import(G+'chases.js');
const FMT=await import(G+'dev/roomfmt.js');
const fs=await import('node:fs');
let fails=0,passes=0;
const ok=(c,msg)=>{if(c){passes++;console.log('  ok  ',msg)}else{fails++;console.log('  FAIL',msg)}};
const note=msg=>console.log('  ..  ',msg);
const QUICK=!!process.env.QUICK;
const SEC=process.env.SECTIONS?process.env.SECTIONS.split(','):null,want=n=>!SEC||SEC.includes(n);   /* SECTIONS=bots,lesson,gate,claws,chase,vent,climb,home,time */
const I=(o={})=>({l:0,r:0,u:0,d:0,j:0,jp:0,b:0,bp:0,drag:null,any:0,...o});
const PW=18,PH=24,MK=PIECES.indexOf('molten');
const IDS=['m1','m2','m3','m4','m5','m6','m7','m8','m9','m10','m11'];
const NAMES=['Ember Ridge','Ashfall','Steam Lake','Forge Run','Sprout Hush','Cinder Pit','Vine Bridges','Slag Tunnel','Magma Lake','Cinder Hush','Geyser Core'];
const B={root:1,board:1},F={...B,forged:1},A={...F,claws:1};
const ITEMS={m1:B,m2:B,m3:B,m4:F,m5:F,m6:F,m7:A,m8:A,m9:A,m10:A,m11:A};
function playState(room,x,y,items={},assist=0){const S=newState();Object.assign(S,{lit:1,litT:60,match:1,mode:'play',assist});Object.assign(S.items,items);E.enterRoom(S,room,{x,y});if(items.root)S.p.root=1;if(items.board)S.p.dc=1;return S}
const run=(S,n,f)=>{const evs=[];for(let i=0;i<n;i++)evs.push(...E.step(S,typeof f==='function'?f(i,S):f,[]));return evs};
const ft=S=>S.p.y+PH,wxp=S=>ROOMS[S.room].at[0]*T+S.p.x,wyp=S=>ROOMS[S.room].at[1]*T+S.p.y;
const sec=n=>(n/60).toFixed(1);

/* ---------------- the search (molten_reach.mjs's best-first search over short macros, with two additions for proofs:
   bad(ev,S) prunes a branch on an event as if it were a death, and the key also holds the board demo, a drill under way,
   the creatures and the items, so a search never stalls on the demo's frozen frames or on a drill's slow progress) ---------------- */
const MAC=o=>{const out=[];for(const d of [-1,0,1])for(const j of [0,1,2])out.push({d,j,b:0,dn:0});if(o.dash)for(const d of [-1,1])out.push({d,j:0,b:1,dn:0});if(o.drop)out.push({d:0,j:0,b:0,dn:1});return out};
const inputAt=(m,i)=>I({l:m.d<0?1:0,r:m.d>0?1:0,j:m.j?1:0,jp:m.j===2&&i===0?1:0,b:m.b&&i===0?1:0,bp:m.b&&i===0?1:0,d:m.dn});
function key(S,q,tq){const p=S.p,r=v=>Math.round(v/q);
  const v=(S.vines||[]).map(v=>[Math.round(v.by/8),Math.round(v.fx),Math.round(v.len/VINE.gap),Math.ceil((VINE.life-v.t)/tq)].join(',')).sort().join(';');
  const en=S.ens.map(e=>e.k==='beetle'?(e.wrap?'o':''):e.k==='ember'?e.st:'').join('');   /* open or not, lit or not: their drift stays out (it would make every state new) */
  return [S.room,r(p.x),r(p.y),Math.round(p.vx),p.ground?0:Math.round(p.vy),p.ground,p.cl,p.root,p.sj,p.dc,p.bo,p.surf,p.burn>0?1:0,p.bd>0?1:0,
    p.wj?Math.round(p.wy/q):'',p.vc>0?Math.ceil(p.vc/tq):0,v,(S.drilled||[]).length,S.crack?Math.floor(S.crack[2]/6):'',S.gate>=.5?1:0,en,S.items.forged,S.items.claws,S.pieces[MK]].join('|')}
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
        const R=snapshot(S0);let used=0;for(const inp of inputs){E.step(R,inp,[]);used++;if(target(R))break}return {found:true,exhausted:false,nodes:n,inputs:inputs.slice(0,used),frames:used}}
      push({s:score(C)+nodes[nid].f*1e-3,id:nid})}
    nd.snap=null}
  return {found:false,exhausted:!heap.length,nodes:n};
}
/* inputs <-> one code per frame */
const enc=i=>(i.l?1:0)|(i.r?2:0)|(i.j?4:0)|(i.jp?8:0)|(i.b?16:0)|(i.bp?32:0)|(i.d?64:0),dec=c=>I({l:c&1,r:(c>>1)&1,j:(c>>2)&1,jp:(c>>3)&1,b:(c>>4)&1,bp:(c>>5)&1,d:(c>>6)&1});
/* the bot: a log of codes; each helper plays on S and appends what it played, false when it got nowhere */
const Bot={
  play(S,rec,codes){for(const c of codes){const ev=E.step(S,dec(c),[]);rec.push(c);if(ev.includes('die'))return false}return true},
  idle(S,rec,n){return Bot.play(S,rec,Array(n).fill(0))},
  /* search to target (room-local predicates); on success play the found inputs on S */
  to(S,rec,name,target,o={}){const r=reach(S,target,o);if(!r.found){console.log(`    bot stuck before ${name} (${S.room} ${(S.p.x/T).toFixed(1)},${(ft(S)/T).toFixed(1)}; ${r.nodes} nodes${r.exhausted?', exhausted':''})`);if(process.env.DUMP)fs.writeFileSync(process.env.DUMP,JSON.stringify(S));return false}
    return Bot.play(S,rec,r.inputs.map(enc))},
  walk(S,rec,dir,done,max=900){for(let i=0;i<max;i++){if(done(S))return true;if(!Bot.play(S,rec,[enc(I({l:dir==='l',r:dir==='r'}))]))return false}return done(S)},
  /* walk onto a seat (centred within 3 px) and sit till the camera has drifted to its look */
  perch(S,rec,tx){const c=tx*T+T/2;if(!Bot.walk(S,rec,S.p.x+PW/2<c?'r':'l',S=>Math.abs(S.p.x+PW/2-c)<3&&S.p.ground,400))return false;
    Bot.idle(S,rec,PERCH.wait+PERCH.drift+10);return S.sit>=PERCH.drift},
};
const on=(id,f)=>S=>S.room===id&&f(S);
const stand=(id,x0,x1,row)=>on(id,S=>S.p.ground&&S.p.x+PW>x0*T+2&&S.p.x<(x1+1)*T-2&&Math.abs(ft(S)-row*T)<.5);
const towardW=S=>wxp(S),towardE=S=>-wxp(S);

/* ---------------- layout ---------------- */
console.log('layout');
const RM=IDS.map(id=>ROOMS[id]);
{ ok(RM.every(Boolean)&&RM.map(R=>R.name).join(',')===NAMES.join(',')&&RM.every(R=>R.biome==='molten'),`eleven Molten rooms in walking order: ${IDS.map((id,i)=>id+' '+NAMES[i]).join(', ')}`);
  ok(RM.every(R=>R.w>=40&&R.w<=64),`every room is 40 to 64 tiles wide (${RM.map(R=>R.w).join(', ')})`);
  let clash=0;for(const R of RM)for(let y=0;y<R.h;y++)for(let x=0;x<R.w;x++)if(roomAtTile(R.at[0]+x,R.at[1]+y)!==R)clash++;
  ok(!clash,'no Molten room overlaps any room (roomAtTile finds each on every one of its tiles)');
  ok(RM.every(R=>R.id==='m1'||R.at[1]>=24&&!(R.at[0]+R.w-1>=24&&R.at[1]<=40))&&ROOMS.m1.at[1]===18&&ROOMS.m1.g.slice(0,6).every(r=>/^#{25}/.test(r))&&ROOMS.m1.at[0]+ROOMS.m1.w-1===23,
    'clear of the planning boxes: Roots x -430..0 y -40..23, Flood x 24..447 y 0..40 (every room lies at y 24 or lower; only Ember Ridge reaches up to y 18, under the hub, and its part inside the Roots box is rock)');
  /* each seam: the doorway rows open on both sides, nothing else */
  const seam=(a,b,side)=>{const A_=ROOMS[a],B_=ROOMS[b],rows=[];for(let y=0;y<A_.h;y++){const wy=A_.at[1]+y,ax=side==='w'?0:A_.w-1,bx=side==='w'?B_.w-1:0,by=wy-B_.at[1];
      if(by<0||by>=B_.h)continue;const ao=!'#=GX'.includes(A_.g[y][ax]),bo=!'#=GX'.includes(B_.g[by][bx]);if(ao!==bo)return null;if(ao)rows.push(wy)}return rows};
  const SEAMS=[['m1','m2','w'],['m2','m3','w'],['m3','m4','w'],['m4','m5','e'],['m5','m6','e'],['m6','m7','e'],['m7','m8','e'],['m8','m9','w'],['m9','m10','w'],['m10','m11','w']];
  const doors=SEAMS.map(([a,b,s])=>[a,b,seam(a,b,s)]);
  ok(doors.every(([,,r])=>r&&r.length>=3&&r.every((y,i)=>!i||y===r[i-1]+1)),`every seam opens on one doorway at least 3 tiles tall, the same rows on both sides: ${doors.map(([a,b,r])=>`${a}>${b} y ${r&&r[0]}..${r&&r[r.length-1]}`).join(', ')}`);
  ok(RM.every(R=>R.torches.length>=1)&&['m1','m5','m10'].every(id=>ROOMS[id].perches.length>=1),'every room has a torch; the calm rooms (Ember Ridge, Sprout Hush, Cinder Hush) each have a seat');
  ok(['m1','m5','m10'].every(id=>!ROOMS[id].spawns.length&&!ROOMS[id].g.some(r=>/[L^]/.test(r.slice(1)))||id==='m1'),'the calm rooms have no creature; Sprout Hush and Cinder Hush have no lava or thorns at all');
  { const R=ROOMS.m1,lake=[];for(let y=0;y<R.h;y++)for(let x=0;x<R.w;x++)if(R.g[y][x]==='L')lake.push([x,y]);
    const span=R.g[16].split('').every(c=>c==='#');ok(lake.length&&span&&lake.every(([x,y])=>y>=22),`Ember Ridge: its lava lake (${lake.length} tiles) lies sealed under a solid rock span (row 16), so it is seen and never reached`)}
  const before=IDS.slice(0,5),after=IDS.slice(6);
  ok(before.every(id=>!ROOMS[id].g.some(r=>/[XEK]/.test(r))),'before the claws (m1 to m5) no cracked rock, ember or beetle: nothing there needs the claws or a drill');
  ok(ROOMS.m6.items.length===1&&ROOMS.m6.items[0].id==='claws'&&ROOMS.m3.items.length===1&&ROOMS.m3.items[0].id==='forged'&&IDS.filter(id=>!['m3','m6'].includes(id)).every(id=>!ROOMS[id].items.length),'the forged board lies only in Steam Lake (m3), the claws only in Cinder Pit (m6, room 6 of 11)');
  ok(ROOMS.m11.pedestals.length===1&&ROOMS.m11.pedestals[0].piece==='molten'&&IDS.slice(0,10).every(id=>!ROOMS[id].pedestals.length),'the Molten fragment stands in Geyser Core (m11) only');
  ok(ROOMS.m8.spawns.some(s=>s.k==='E')&&ROOMS.m8.spawns.some(s=>s.k==='K')&&IDS.every(id=>id==='m8'||!ROOMS[id].spawns.length),'the ember sprite and the slag beetle live in Slag Tunnel (m8), after the claws');
  /* vents: at least 3 tiles apart, none within 3 tiles of a torch, on a floor */
  const vbad=[];for(const R of RM){for(const v of R.vents){if(R.torches.some(t=>Math.abs(t.tx-v.tx)<=3&&Math.abs(t.ty-v.ty)<=3))vbad.push(R.id+':'+v.tx+' torch');if(R.vents.some(w=>w!==v&&w.ty===v.ty&&Math.abs(w.tx-v.tx)<3))vbad.push(R.id+':'+v.tx+' close');if(!'#X'.includes(R.g[v.ty+1][v.tx]))vbad.push(R.id+':'+v.tx+' floor')}}
  ok(!vbad.length,`every vent stands on rock, at least 3 tiles from the next and from any torch (${RM.reduce((a,R)=>a+R.vents.length,0)} vents)${vbad.length?': '+vbad.join(' '):''}`);
  /* R19: no hazard within 3 tiles of a doorway */
  const nearDoor=[];for(const R of RM){const edge=[];for(let y=0;y<R.h;y++){if(!'#=GX'.includes(R.g[y][0]))edge.push([0,y]);if(!'#=GX'.includes(R.g[y][R.w-1]))edge.push([R.w-1,y])}
    for(let y=0;y<R.h;y++)for(let x=0;x<R.w;x++)if('L^'.includes(R.g[y][x])&&edge.some(([ex,ey])=>Math.abs(ex-x)<=3&&Math.abs(ey-y)<=3))nearDoor.push(R.id+':'+x+','+y)}
  ok(!nearDoor.length,`no lava or thorn within 3 tiles of a doorway (R19)${nearDoor.length?': '+nearDoor.slice(0,4).join(' '):''}`);
  /* inset: every water and lava tile lies in the ground like a pool (the repo-wide lint covers lava once test_game's edit lands) */
  const bad=[];for(const R of RM)R.g.forEach((row,y)=>[...row].forEach((c,x)=>{if(c!=='~'&&c!=='L')return;const b=(R.g[y+1]||'#')[x],l=row[x-1]??'#',r=row[x+1]??'#';if(!'#~L'.includes(b)||!'#~L'.includes(l)||!'#~L'.includes(r))bad.push(R.id+':'+x+','+y)}));
  ok(!bad.length,`every water and lava tile is inset (rock or liquid below and beside)${bad.length?': '+bad.slice(0,4).join(' '):''}`);
  /* the editor's lint and format */
  const srcs=[];for(const id of IDS){const text=fs.readFileSync(new URL(`rooms/molten_${id}.js`,G),'utf8'),mod=(await import(G+`rooms/molten_${id}.js`)).default;srcs.push({text,mod})}
  ok(srcs.every(({text,mod})=>FMT.serialize(mod,FMT.headerComment(text))===text&&!FMT.check(mod,FMT.headerComment(text))),"every file is in the editor's format byte for byte and passes the server's checks (header comments ASCII, under 800 characters)");
  const all=[];for(const id of ORDER){const f=fs.readdirSync(new URL('rooms/',G)).filter(f=>f.endsWith('.js')).find(f=>{const t=fs.readFileSync(new URL('rooms/'+f,G),'utf8');return f!=='index.js'&&new RegExp(`id:'${id}'`).test(t)});all.push((await import(G+'rooms/'+f)).default)}
  const pr=FMT.problems(all).filter(p=>IDS.includes(p.id));ok(!pr.length,`the editor's checks find nothing in the Molten rooms${pr.length?': '+pr.slice(0,3).map(p=>p.id+' '+p.msg).join('; '):''}`);
  const src=fs.readFileSync(new URL('rooms/index.js',G),'utf8'),blk=/\/\* rooms:begin[^\n]*\*\/\n([\s\S]*?)\/\* rooms:end \*\//.exec(src)[1];
  ok(IDS.every(id=>new RegExp(`import R_${id} from '\\./molten_${id}\\.js';\\n`).test(blk))&&blk.includes(IDS.map(id=>'R_'+id).join(',')),"the registry block lists molten_m1.js .. molten_m11.js in the dev server's format (the warp list groups them under molten)");
  ok(AMB.molten>0&&AMB.molten<AMB.flood,`Molten's ambient light (${AMB.molten}) is darker than Flood's (${AMB.flood})`);
  const nx=n=>NEXT.find(e=>e.need===n);
  ok(nx('item:forged').room==='m3'&&ROOMS.m3.items[0].tx===nx('item:forged').tile[0]&&nx('item:claws').room==='m6'&&ROOMS.m6.items[0].tx===nx('item:claws').tile[0]&&nx('piece:molten').room==='m11'&&ROOMS.m11.pedestals[0].tx===nx('piece:molten').tile[0],'the stuck hint points at the forged board (m3), the claws (m6) and the fragment (m11) tiles');
}
console.log('the hub\'s way down: sealed until the Flood fragment is in the door');
const FK=PIECES.indexOf('flood');
const sealSet=id=>Object.keys(ROOMS[id].seals||{}).sort().join(' ');
{ const H=ROOMS.hub,M1=ROOMS.m1;
  ok(H.g[16]==='###################====='&&H.g[17]==='####################===#'&&sealSet('hub')==='20,16 20,17 21,16 21,17 22,16 22,17'&&Object.values(H.seals).every(b=>b==='flood'),
    "the hub's bottom funnel keeps its rubble and its shape; its middle (cols 20-22, rows 16-17) is a seal (ents opens:'flood'), its lips (19,16) and (23,16) plain rubble");
  ok(ORDER.filter(id=>ROOMS[id].seals).sort().join(',')==='hub,m1'&&sealSet('m1')==='41,0 42,0 43,0 44,0 45,0 46,0'&&M1.g[0].slice(41,47)==='======',"the only seals in the world: the hub's funnel and the row of Ember Ridge under it (cols 41-46, world x 17-22)");
  /* who borders whom: list every room past a Molten room's edge that is not Molten */
  const out={};for(const R of RM){const add=(x,y)=>{const N=roomAtTile(R.at[0]+x,R.at[1]+y);if(N&&N.biome!=='molten')(out[R.id+'>'+N.id]=out[R.id+'>'+N.id]||[]).push([x,y])};
    for(let y=0;y<R.h;y++)for(const x of [-1,R.w])add(x,y);for(let x=0;x<R.w;x++)for(const y of [-1,R.h])add(x,y)}   /* edges only: a corner touches nothing he can cross */
  ok(Object.keys(out).sort().join(',')==='m1>a1,m1>hub',`a Molten room borders only Molten rooms, but for Ember Ridge's top edge, which runs under the hub and Seedbed (${Object.keys(out).sort().join(', ')})`);
  /* the leak proof: he changes room only when his middle crosses an edge, so his box (2 tiles tall, 1.5 wide) must overlap
     both cells of some pair across it. If one cell of every pair is solid, no item, jump, dash, vine or drill takes him
     across (solid() reads no item; a drill opens only X and a plate only G, and no X or G lies on these edges) */
  const pairs=[];for(const R of RM){for(let x=0;x<R.w;x++)for(const [y,oy] of [[0,-1],[R.h-1,R.h]]){const N=roomAtTile(R.at[0]+x,R.at[1]+oy);if(N&&N.biome!=='molten')pairs.push([R,x,y,x,oy])}
    for(let y=0;y<R.h;y++)for(const [x,ox] of [[0,-1],[R.w-1,R.w]]){const N=roomAtTile(R.at[0]+ox,R.at[1]+y);if(N&&N.biome!=='molten')pairs.push([R,x,y,ox,y])}}
  const noXG=pairs.every(([R,x,y,x2,y2])=>!'XG'.includes(E.tile(R,x,y))&&!'XG'.includes(E.tile(R,x2,y2)));
  const openPairs=placed=>{const S=newState();S.lit=1;S.placed=placed.slice();Object.assign(S.items,{root:1,board:1,forged:1,claws:1});return pairs.filter(([R,x,y,x2,y2])=>!E.solid(S,R,x,y)&&!E.solid(S,R,x2,y2)).map(([R,x])=>R.at[0]+x)};
  const combos=[];for(let m=0;m<8;m++)combos.push([m&1,0,(m>>1)&1,(m>>2)&1]);
  ok(noXG&&combos.every(c=>!openPairs(c).length),`sealed: with the Flood fragment not in the door (all ${combos.length} combinations of the other three placed, any items), every one of the ${pairs.length} cell pairs across Molten's border to the hub and Seedbed has a solid side: there is no way between them`);
  const op=openPairs([1,1,0,0]);ok(op.join(',')==='20,21,22'&&combos.every(c=>openPairs(c.map((v,i)=>i===FK?1:v)).join(',')==='20,21,22'),`open: with it placed, exactly the funnel's three columns (world x ${op.join(', ')}) open between the hub and Ember Ridge, whatever else is placed`);
  { const H=newState();Object.assign(H.items,{root:1,board:1});H.pieces=[1,1,0,0];H.placed=[1,0,0,0];const g1=E.goal(H);H.placed=[1,1,0,0];const g2=E.goal(H);
    ok(g1&&g1.room==='hub'&&g2&&g2.room==='m3','the stuck hint: carrying the Flood fragment he looks toward the door (Molten is sealed till it is set); once it is set, toward the forged board')}
  ok(ROOMS.m1.torches[ROOMS.m1.torches.length-1].tx===42&&ROOMS.m1.torches[ROOMS.m1.torches.length-1].ty===15,'the dev warp lands on Ember Ridge\'s arrival torch (42,15), the last in its list');
  /* the real door: carrying the Flood fragment, he sets it; the seal holds while it flies and for DOOR.crumble frames after
     it lands, then crumbles ('unseal', once) and stays open: through the slot's end, a JSON snapshot, a save and a reload */
  const st=await import(G+'state.js'),DO=st.DOOR;
  const S=playState('hub',144-PW/2,192-PH,{root:1,board:1});S.pieces=[1,1,0,0];S.placed=[1,0,0,0];run(S,3,I());
  const shaft=S=>[20,21,22].every(x=>!E.solid(S,ROOMS.hub,x,16)&&!E.solid(S,ROOMS.hub,x,17)&&!E.solid(S,ROOMS.m1,x+24,0));
  const shut=S=>[20,21,22].every(x=>E.solid(S,ROOMS.hub,x,16)&&E.solid(S,ROOMS.hub,x,17)&&E.solid(S,ROOMS.m1,x+24,0));
  let tPlace=-1,tUn=-1,nUn=0,always=true,f=0;const evs=[];
  for(;f<DO.fly+DO.pulse+30;f++){const ev=E.step(S,f===0?I({j:1,jp:1}):I(),[]);evs.push(...ev);if(ev.includes('place'))tPlace=f;if(ev.includes('unseal')){tUn=f;nUn++}
    if(tUn<0&&!shut(S))always=false}
  ok(tPlace>=0&&S.placed[FK]===1&&tUn===tPlace+DO.crumble&&nUn===1&&always&&shaft(S),`setting the Flood fragment: 'place' at frame ${tPlace}, the funnel holds ${DO.crumble} frames more, then 'unseal' (once; a shake, its rubble falls) and the shaft is open`);
  const J=newState();restore(J,JSON.parse(JSON.stringify(snapshot(S))));const mem={d:{},getItem(k){return this.d[k]??null},setItem(k,v){this.d[k]=String(v)}};st.save(S,mem);const L=st.resume(newState(),st.load(mem));
  const old={v:3,lit:1,items:{root:1},pieces:[1,1,0,0],torches:{},cp:null,latch:{},placed:[1,1,0,0],door:0,seen:{}};mem.setItem(st.SAVE_KEY,JSON.stringify(old));const O=st.resume(newState(),st.load(mem));
  ok(shaft(J)&&shaft(L)&&shaft(O)&&shut(st.resume(newState(),{v:5,lit:1,placed:[1,0,0,0]})),'it stays open: a JSON snapshot, a save and reload, and an old v3 save with Flood placed all have the shaft open; a save without it has it shut');
  /* walking east past the open funnel he drops through it to Ember Ridge, alive */
  { const W=newState();restore(W,J);W.slot=null;W.p.x=17*T;W.p.y=192-PH;W.p.vx=0;W.p.vy=0;let ev=[];for(let i=0;i<300&&W.room==='hub';i++)ev.push(...E.step(W,I({r:W.p.x<20.5*T}),[]));for(let i=0;i<120;i++)ev.push(...E.step(W,I(),[]));
    ok(W.room==='m1'&&!ev.includes('die')&&W.p.ground,`with it open, walking east off the hub floor at the funnel drops him down the shaft into Ember Ridge, alive (lands at col ${(W.p.x/T).toFixed(0)}, row ${(ft(W)/T).toFixed(0)})`)}
}

const COPY={};let CN=0;
/* a copy of a room (or of its tiles x0..x1, y0..y1) parsed far away: no neighbours, so its edges are solid */
function copyRoom(id,{x0=0,y0=0,x1,y1,edit}={}){const R=ROOMS[id],src=(await_src(id));x1??=R.w-1;y1??=R.h-1;
  let grid=src.grid.slice(y0,y1+1).map(r=>r.slice(x0,x1+1));if(edit)grid=edit(grid);
  const ents=(src.ents||[]).filter(e=>e.at[0]>=x0&&e.at[0]<=x1&&e.at[1]>=y0&&e.at[1]<=y1).map(e=>({...e,at:[e.at[0]-x0,e.at[1]-y0]}));
  const cid='c'+(CN++)+id;ROOMS[cid]=parse({id:cid,name:'copy of '+id,biome:'molten',at:[60000+CN*300,60000],grid,ents});COPY[cid]={id,x0,y0};return cid}
const SRC={};for(const id of IDS)SRC[id]=(await import(G+`rooms/molten_${id}.js`)).default;
function await_src(id){return SRC[id]}
/* a proof: no path from S to target (exhausted), and a control that finds one */
/* with the claws (vines grow, wither and stack) the state space of a big room is too large to exhaust in a test run: those
   searches (evidence:true) get a fixed budget and steer toward the target, so "not found" is strong evidence, not a proof,
   as in tools/test_molten_engine.mjs section 9; the label says which */
function proof(label,S,target,o,ctrl,{evidence=false}={}){
  if(QUICK){note(`(QUICK) skipped: ${label}`);return}
  const t0=Date.now(),r=reach(S,target,{budget:evidence?60000:400000,...o});
  const c=ctrl?reach(ctrl.S,ctrl.target||target,{budget:200000,...o,...ctrl.o}):null;
  const how=r.exhausted?`search exhausted after ${r.nodes} nodes`:`not found in ${r.nodes} nodes steered toward it (evidence, not exhausted)`;
  ok(!r.found&&(r.exhausted||evidence)&&(!ctrl||c.found),`${label}: no route (${how})${ctrl?`; control ${ctrl.label}: ${c.found?'found in '+sec(c.frames)+' s':'NOT FOUND'}`:''} [${((Date.now()-t0)/1000).toFixed(0)} s]${r.found?' LEAK: found in '+sec(r.frames)+' s':''}`)}

/* ---------------- the spoke by bot, room by room ---------------- */
console.log('the spoke by bot');
const STAGES={
  m1:(S,r)=>Bot.perch(S,r,24)&&Bot.to(S,r,'m2',S=>S.room==='m2',{prio:towardW}),
  m2:(S,r)=>Bot.to(S,r,'the strip',stand('m2',40,46,10),{prio:towardW})&&Bot.to(S,r,'the open pool',stand('m2',22,27,10),{prio:towardW})&&Bot.to(S,r,'the roofed stretch',S=>S.room==='m3',{prio:towardW,budget:150000}),
  m3:(S,r)=>Bot.to(S,r,'the gate',on('m3',S=>S.p.ground&&S.p.x<29*T&&ft(S)<=11*T+.1),{prio:towardW,budget:150000})&&Bot.to(S,r,'the forged board',S=>S.items.forged===1,{prio:towardW})&&Bot.idle(S,r,24)&&Bot.walk(S,r,'',S=>!S.p.bd,400)&&
    Bot.to(S,r,'the lane',S=>S.room==='m4',{prio:towardW}),
  m4:(S,r)=>Bot.to(S,r,'lane A',stand('m4',20,35,10),{prio:towardW})&&Bot.to(S,r,'the landing',stand('m4',1,6,24),{prio:S=>wxp(S)-wyp(S)})&&
    Bot.to(S,r,'lane B and the step',stand('m4',27,33,22),{prio:towardE})&&Bot.to(S,r,'lane C',S=>S.room==='m5',{prio:towardE}),
  m5:(S,r)=>Bot.to(S,r,'the pool',stand('m5',29,31,10),{prio:towardE,dash:false})&&Bot.perch(S,r,32)&&Bot.to(S,r,'m6',S=>S.room==='m6',{prio:towardE}),
  m6:(S,r)=>Bot.to(S,r,'the claws',S=>S.items.claws===1,{prio:towardE})&&Bot.to(S,r,'the climb out',S=>S.room==='m7',{prio:S=>-wxp(S)*.5+wyp(S)*.3,k:6}),
  m7:(S,r)=>Bot.to(S,r,'the wall',stand('m7',8,17,5),{prio:wyp})&&Bot.to(S,r,'the channel',stand('m7',28,41,5),{prio:towardE,budget:200000})&&Bot.to(S,r,'the plug',S=>S.room==='m8',{prio:towardE}),
  m8:(S,r)=>Bot.to(S,r,'basin A',stand('m8',14,27,13),{prio:towardE})&&Bot.walk(S,r,'r',S=>S.p.x>=29.2*T,200)&&m8chimney(S,r)&&
    Bot.walk(S,r,'r',stand('m8',37,42,12),300)&&m8plug(S,r)&&Bot.to(S,r,'m9',S=>S.room==='m9',{prio:S=>wxp(S)-wyp(S)}),
  m9:(S,r)=>Bot.to(S,r,'the lake bank',stand('m9',52,55,18),{prio:S=>-wyp(S)})&&Bot.to(S,r,'lake 1 and its wall',on('m9',S=>S.p.x<30*T&&ft(S)<=12*T),{prio:S=>wxp(S)+wyp(S),budget:150000})&&
    Bot.to(S,r,'lake 2 and its wall',S=>S.room==='m10',{prio:S=>wxp(S)+wyp(S),budget:150000}),
  m10:(S,r)=>Bot.to(S,r,'the hall',stand('m10',30,39,10),{prio:towardW})&&Bot.perch(S,r,34)&&Bot.to(S,r,'m11',S=>S.room==='m11',{prio:towardW}),
  m11:(S,r)=>Bot.to(S,r,'the fragment',S=>S.pieces[MK]===1,{prio:towardW}),
};
/* the ember: from basin A at the chimney's foot, jump and cling to W under the flame, hold till the vine has smothered it, then climb */
function m8chimney(S,r){for(let w=0;w<240;w+=12){const C=snapshot(S),out=[];let dead=false;
    for(let i=0;i<w&&!dead;i++){out.push(0);if(E.step(C,I(),[]).includes('die'))dead=true}
    for(let i=0;i<150&&!dead;i++){const c=enc(I({r:1,j:i<20,jp:i===0}));out.push(c);const ev=E.step(C,dec(c),[]);if(ev.includes('die'))dead=true}
    if(dead||C.ens.find(e=>e.k==='ember').st!==1)continue;
    const g=reach(C,stand('m8',32,36,5),{prio:S=>S.p.y});if(!g.found)continue;Bot.play(S,r,out);return Bot.play(S,r,g.inputs.map(enc))}
  console.log('    bot stuck at the ember');return false}
/* the beetle: stand at the plug's foot, wait till it has crawled high, jump and hold toward the plug till it crumbles */
function m8plug(S,r){if(!Bot.walk(S,r,'r',S=>S.p.x>=41.4*T,120))return false;
  for(let w=0;w<480;w+=6){const C=snapshot(S),out=[];let dead=false,open=false;
    for(let i=0;i<w&&!dead;i++){out.push(enc(I({r:1})));if(E.step(C,I({r:1}),[]).includes('die'))dead=true}
    for(let i=0;i<120&&!dead;i++){const c=enc(I({r:1,j:i<20,jp:i===0}));out.push(c);const ev=E.step(C,dec(c),[]);if(ev.includes('die'))dead=true;if(ev.includes('beetle_open'))open=true;if(C.p.x>=45*T&&C.p.ground)break}
    if(!dead&&open&&C.p.x>=43*T){Bot.play(S,r,out);return true}}
  console.log('    bot stuck at the beetle');return false}
/* where each bot starts: the previous room's last stretch, so it enters through the doorway */
const START={m1:['m1',42*T,16*T-PH],m2:['m1',4*T,16*T-PH],m3:['m2',3*T,10*T-PH],m4:['m3',2*T,10*T-PH],m5:['m4',60*T,32*T-PH],m6:['m5',44*T,10*T-PH],m7:['m6',36*T,10*T-PH],
  m8:['m7',52*T,5*T-PH],m9:['m8',2*T,24*T-PH],m10:['m9',3*T,4*T-PH],m11:['m10',2*T,10*T-PH]};
const NEXT_ROOM=id=>IDS[IDS.indexOf(id)+1];
const TIMES={},REC={};
const ONLY=process.env.ONLY?process.env.ONLY.split(','):want('bots')?IDS:[];
for(const id of IDS.filter(id=>ONLY.includes(id))){const [r0,x,y]=START[id],S=playState(r0,x,y,ITEMS[id]);run(S,3,I());const rec=[],start=snapshot(S);
  const won=(r0===id||Bot.to(S,rec,id,S=>S.room===id,{prio:id==='m5'||id==='m6'||id==='m7'||id==='m8'?towardE:towardW}))&&STAGES[id](S,rec);
  const enter=rec.length;TIMES[id]=rec.length/60;REC[id]={start,rec};
  restore(S,start);let died=0;for(const c of rec)if(E.step(S,dec(c),[]).includes('die'))died++;
  const end=id==='m11'?S.pieces[MK]===1&&S.room==='m11':S.room===NEXT_ROOM(id);
  ok(won&&!died&&end,`${id} ${ROOMS[id].name}: with ${Object.keys(ITEMS[id]).filter(k=>ITEMS[id][k]).join(' + ')} the bot crosses it${id==='m11'?' to the fragment':' into '+NEXT_ROOM(id)}, replayed with no deaths (${sec(rec.length)} s incl. the way in)`)}


/* ---------------- the whole spoke in one run: the items come from their rooms, the replay is exact ---------------- */
const ALL=ONLY.length===IDS.length&&want('spoke');
const SPOKE={};
if(ALL){console.log('the whole spoke in one run');
  const S=playState('m1',42*T,16*T-PH,B);run(S,3,I());const rec=[],start=snapshot(S),enter={};let won=true;
  for(const id of IDS){if(!won)break;enter[id]=rec.length;won=STAGES[id](S,rec)}enter.end=rec.length;
  ok(won&&S.room==='m11'&&S.pieces[MK]===1&&S.items.forged===1&&S.items.claws===1,`from Ember Ridge to the fragment by bot, picking up the forged board and the claws on the way (${sec(rec.length)} s of play)`);
  const final=JSON.stringify(S);restore(S,start);let died=0,fAt=-1,cAt=-1;const evs={};const rooms=[];
  for(let i=0;i<rec.length;i++){const ev=E.step(S,dec(rec[i]),[]);for(const e of ev)evs[e]=(evs[e]||0)+1;if(ev.includes('die'))died++;if(S.items.forged&&fAt<0)fAt=i;if(S.items.claws&&cAt<0)cAt=i;if(rooms[rooms.length-1]!==S.room)rooms.push(S.room)}
  ok(won&&!died&&JSON.stringify(S)===final,`replayed from the start: no deaths, the same world to the last field (rooms ${rooms.join(' > ')})`);
  ok(fAt>=enter.m3&&fAt<enter.m4&&cAt>=enter.m6&&cAt<enter.m7,`the forged board first in hand in Steam Lake, the claws in Cinder Pit`);
  ok(evs.burn>=1&&evs.savejump>=1&&evs.surf>=1&&evs.cling>=1&&evs.vine>=1&&evs.drill>=2&&evs.ember_out>=1&&evs.beetle_open===1&&evs.sit>=3,`every mechanic of the spoke is used: ${['burn','savejump','surf','cling','vine','walljump','drill','ember_out','beetle_open','sit'].map(k=>k+' '+(evs[k]||0)).join(', ')}`);
  /* a snapshot mid-spoke (entering Vine Bridges, mid-climb state included), through JSON, replays the rest exactly */
  restore(S,start);for(let i=0;i<enter.m7+30;i++)E.step(S,dec(rec[i]),[]);const mid=JSON.parse(JSON.stringify(snapshot(S))),S2=newState();restore(S2,mid);
  for(let i=enter.m7+30;i<rec.length;i++){E.step(S,dec(rec[i]),[]);E.step(S2,dec(rec[i]),[])}
  ok(JSON.stringify(S)===final&&JSON.stringify(S2)===final,'a JSON snapshot taken in Vine Bridges and restored replays the rest of the spoke to the same world (determinism, save/Undo safe)');
  for(const id of IDS)SPOKE[id]=((id==='m11'?enter.end:enter[IDS[IDS.indexOf(id)+1]])-enter[id])/60;
  REC.spoke={start,rec,enter};
}

/* ---------------- the lava lesson (Ashfall) ---------------- */
console.log('the lava lesson (Ashfall)');
if(want('lesson')){ const bank=()=>{const S=playState('m2',41.6*T,10*T-PH,B);S.p.face=-1;run(S,3,I());return S};   /* on the torch (col 42), facing the pool */
  /* the open pool (cols 28-39), its torch at col 42: a dash from the bank ends over the lava */
  const D=bank();let ev=[],burnAt=-1;for(let i=0;i<200&&!ev.includes('rez');i++){const e=E.step(D,I({b:i===0,bp:i===0}),[]);ev.push(...e);if(e.includes('burn')&&burnAt<0)burnAt=i}
  ok(ev.includes('dash')&&ev.includes('burn')&&ev.includes('die')&&ev.includes('rez')&&D.room==='m2'&&D.cp.tx===42&&Math.abs(D.p.x+PW/2-(42*T+6))<10,`a dash from the bank ends over the pool: the board burns; with no jump he sinks, glitches out and is back at the torch beside the pool`);
  let save=null;for(let k=0;k<=16&&!save;k+=2)for(const r of [0,8,12,16,20,24,28,32]){const S=bank();let b=-1,dead=false,e2=[];
    for(let i=0;i<300;i++){const e=E.step(S,I({l:b>=0,b:i===0,bp:i===0,j:b>=0,jp:b>=0&&(i===b+k||(r&&i===b+k+r))}),[]);e2.push(...e);if(e.includes('burn')&&b<0)b=i;if(e.includes('die')){dead=true;break}if(b>=0&&S.p.ground&&i>b+4)break}
    if(!dead&&S.p.ground&&S.p.x<28*T&&e2.includes('savejump')){save={k,r,root:e2.includes('root')};break}}
  ok(!!save,`...and a jump while it sinks is the save jump: he gets over to the far bank${save?` (pressed ${save.k} frames into the burn${save.root?', then the root':''})`:''}`);
  /* the roofed stretch (cols 10-21 under a roof 5 high): 12 tiles, the size of the open pool he has just crossed. 17 was
     beyond a human (Tyler's playtest, 2026-11-06): the bot's best with the plain board is about 16 (18 with the root). From
     its torch (col 25), the lesson's own move crosses it: dash from the bank, the board burns, the save jump (and the root) */
  const R2=ROOMS.m2;ok(R2.g[10].slice(10,22)==='L'.repeat(12)&&R2.g[11].slice(10,22)==='L'.repeat(12)&&/^#{10}$/.test(R2.g[10].slice(0,10))&&R2.g[4].slice(3,24)==='#'.repeat(21)&&R2.torches.some(t=>t.tx===25&&t.ty===9)&&['#','#','#'].every((c,i)=>R2.g[7+i][0]!=='#'),
    'Ashfall\'s roofed stretch: 12 tiles of lava (cols 10-21) under a roof 5 high, rock floor west of it to the door (rows 7-9 open), its torch at col 25');
  const roof=()=>{const S=playState('m2',25*T+3-PW/2,10*T-PH,B);S.p.face=-1;run(S,3,I());return S};
  /* a human's margin: run from the torch, jump, dash in the air; the board lands on the lava and burns, then the save jump
     and the root. Over a grid of timings (jump frame, dash delay, save jump delay, root delay), count the crossings */
  let wins=0,tried=0;for(const jf of [6,10,14,18,22,26])for(const df of [4,8,12,16,20,24,28])for(const sk of [0,4,8,12])for(const rr of [0,8,12,16,20,24]){
    const S=roof();let b=-1,dead=false,e2=[];tried++;
    for(let i=0;i<400;i++){const jp=i===jf||(b>=0&&(i===b+sk||(rr&&i===b+sk+rr)));const e=E.step(S,I({l:1,j:i>=jf,jp,b:i===jf+df,bp:i===jf+df}),[]);e2.push(...e);
      if(e.includes('burn')&&b<0)b=i;if(e.includes('die')){dead=true;break}if(S.room==='m3'||(S.p.ground&&S.p.x<9*T&&i>jf+2))break}
    if(!dead&&(S.room==='m3'||S.p.x<9*T)&&e2.includes('burn')&&e2.includes('savejump'))wins++}
  ok(wins>=tried/2,`...and the lesson's move crosses it with room to spare: a run from the torch, a jump, a dash in the air; the board lands on the lava and burns, the save jump and the root carry him over in ${wins} of ${tried} timings (${Math.round(100*wins/tried)}%)`);
  if(!QUICK){const dry=reach(playState(copyRoom('m2'),23*T,10*T-PH,B),S=>S.p.ground&&S.p.x<9*T&&ft(S)<=10*T+.1,{prio:S=>S.p.x,bad:ev=>ev.includes('burn'),budget:150000});
    note(`Ashfall's roofed stretch without ever letting the board burn: ${dry.found?'crossable ('+sec(dry.frames)+' s; a run, jump, root and air dash): the burn is taught by the open pool before it, and this stretch repeats it':'no route found'}`)}
}

/* ---------------- the surf gate and the forged board (Steam Lake) ---------------- */
console.log('the surf gate and the forged board (Steam Lake)');
const cS=copyRoom('m3'),onBoard=S=>S.p.x<23*T&&S.p.x+PW>22*T&&S.p.y<10*T&&S.p.y+PH>9*T;
if(want('gate')){ /* surfing, never jumping: the thorn on the rim gets him */
  const S=playState('m3',59*T,10*T-PH,B);S.p.face=-1;run(S,3,I());let ev=[];for(let i=0;i<300&&!ev.includes('rez');i++)ev.push(...E.step(S,I({l:1,b:i===2,bp:i===2}),[]));
  ok(ev.includes('surf')&&ev.includes('die')&&ev.includes('rez')&&S.cp&&S.cp.tx===60,'surfing to the end of the pool without a jump, the thorny rim glitches him out; he is back at the torch by the door');
  ok(ROOMS.m3.g[9][45]==='^'&&ROOMS.m3.g[10][45]==='#'&&ROOMS.m3.g[10].slice(29,45)==='L'.repeat(16)&&ROOMS.m3.g[10].slice(46,58)==='~'.repeat(12),'the gate: 12 tiles of water, a one-tile rim with a thorn, then 16 tiles of lava, every top flush at row 10');
  /* the surf is the way the room shows; a search also finds a harder board route that never surfs (swim to the rim, dash out
     of the water, burn and save jump twice, landing back on the rim's edge between them). It still needs the dash board */
  if(!QUICK){const r=reach(playState(cS,60*T,10*T-PH,B),S=>S.p.ground&&S.p.x<29*T&&ft(S)<=11*T+.1,{prio:S=>S.p.x,bad:ev=>ev.includes('surf'),budget:200000});
    note(`Steam Lake gate without ever surfing (board and root): ${r.found?'a route exists ('+sec(r.frames)+' s: a swim, a dash out of the water, two burns with a stop on the rim) - the board is still required':'no route'}`)}
  const cL=copyRoom('m3',{x1:28,edit:g=>g.map(r=>r.replace('I','.'))});   /* the lane and its two banks, without the forged board on the east one: a smaller space, so it exhausts sooner */
  proof('Steam Lake lane (18 tiles of lava under a roof 3 high): the plain board never crosses it, burn and save jump and root included',playState(cL,23*T,10*T-PH,B),S=>S.p.ground&&S.p.x<4*T,{prio:S=>S.p.x},
    {label:'with the forged board',S:playState(cL,23*T,10*T-PH,F)});
  /* no board, no forged board: every set without the dash board, from both ways in */
  for(const [name,it] of [['the root',{root:1}],['the root and the claws',{root:1,claws:1}],['the claws',{claws:1}],['no items',{}]])
    for(const [where,x] of [['the east door',60],['the west door',1]])
      proof(`the forged board without the dash board: with ${name}, from ${where}, he never reaches it`,playState(cS,x*T,10*T-PH,it),onBoard,{prio:S=>Math.abs(S.p.x-22*T)},
        name==='the root'&&where==='the east door'?{label:'with the board',S:playState(cS,60*T,10*T-PH,B)}:null,{evidence:!!it.claws&&where==='the east door'});
  const cA=copyRoom('m2');
  for(const [name,it] of [['the root',{root:1}],['the root and the claws',{root:1,claws:1}]])
    proof(`Ashfall without the dash board (${name}): the lava stops him before Steam Lake`,playState(cA,53*T,10*T-PH,it),S=>S.p.x<5*T,{prio:S=>S.p.x},null,{evidence:!!it.claws});
  const W=playState('m3',25*T,10*T-PH,{root:1,claws:1});run(W,3,I());const we=run(W,40,I({l:1}));ok(!we.includes('item')&&!W.items.forged&&!W.p.bd&&W.p.x<21.5*T,'(the engine agrees: walking west over the forged board on the bank without the board does nothing: no pickup, no demo)');
  /* its pickup demo (board.js boardDemo): a beat, one dash the way he faces; landing on the lava lane he surfs it, the demo
     holding his way (a let-go surf sinks), and control comes back only once he stands on the far bank. Facing east, the
     dash ends on the bank. Every way he can come onto it: walking west at any speed, standing on it facing either way */
  const demo=[];for(const [how,x,face,walk] of [['walking in from the east',26*T,-1,1],['walking in slowly',23.4*T,-1,1],['from the bank\'s east end',27.4*T,-1,1],['standing on it facing west',21.5*T,-1,0],['standing on it facing east',21.5*T,1,0],['at its west edge facing east',20.6*T+4,1,0]]){
    const S=playState('m3',x,10*T-PH,F);S.items.forged=0;S.p.face=face;let ev=[],got=-1,k=0;
    for(;k<900;k++){const e=E.step(S,I(got<0&&walk?{l:1}:{}),[]);ev.push(...e);if(e.includes('item')&&got<0)got=k;if(got>=0&&!S.p.bd&&k>got+2)break;if(S.p.dead)break}
    demo.push({how,ok:got>=0&&S.items.forged===1&&!ev.includes('die')&&!S.p.bd&&S.p.ground&&ft(S)<=10*T+.1&&(face>0||ev.includes('surf')&&S.p.x<4*T),surf:ev.includes('surf'),x:S.p.x/T,f:k-got})}
  ok(demo.every(d=>d.ok),`the forged board's pickup demo always ends with him standing safe, control back: ${demo.map(d=>`${d.how} ${d.ok?'':'FAIL '}${d.surf?'surfs the lane to col '+d.x.toFixed(0):'stays on the bank'} (${sec(d.f)} s)`).join('; ')}`);
}

/* ---------------- nothing before the claws needs them; nothing after bypasses them ---------------- */
console.log('the claws gates');
if(want('claws')){ const cP=copyRoom('m6',{edit:g=>g.map(r=>r.replace('I','.'))});   /* the copy without the claws on the floor */
  proof('Cinder Pit: from the pit floor with the root, the board and the forged board, he never gets out (walls 7 tiles high)',playState(cP,20*T,17*T-PH,F),S=>S.p.ground&&ft(S)<=10*T+.1,{},{label:'with the claws',S:playState(cP,20*T,17*T-PH,A)});
  const c7=copyRoom('m7');
  proof('Vine Bridges: without the claws the first wall stops him',playState(c7,3*T,12*T-PH,F),S=>ft(S)<=6*T,{},{label:'with the claws',S:playState(c7,3*T,12*T-PH,A)});
  /* the channel is the claws' second use, not a gate: under its low roof a run, a flat dash and a late root jump also get
     over (found by search), so the room's gates are the first wall and the cracked plug */
  { const r=reach(playState(c7,12*T,5*T-PH,F),S=>S.p.x>=28*T&&ft(S)<=5*T+.1,{prio:S=>-S.p.x,budget:QUICK?1:60000});if(!QUICK)note(`Vine Bridges channel without the claws: ${r.found?'crossable by a dash and a late root jump ('+sec(r.frames)+' s): a second use of the claws (the wall jump), not a gate':'no route found'}`)}
  const c8=copyRoom('m8',{x1:37,y1:14});
  const upper=S=>ft(S)<=5*T+.1&&S.p.x>=16*T;   /* on the slab or on W, above the ember */
  proof('Slag Tunnel: without the claws he never climbs out of the ember\'s basin',playState(c8,24*T,13*T-PH,F),upper,{});
  proof('Slag Tunnel: with every item but never smothering the ember, neither the chimney nor the hole in the slab (5 tiles from the nearest wall he can climb below it) gets him up',playState(c8,24*T,13*T-PH,A),upper,{bad:ev=>ev.includes('ember_out'),prio:S=>S.p.y},
    null,{evidence:true});
  ok(ROOMS.m7.g.slice(2,5).every(r=>r.slice(42,44)==='XX')&&ROOMS.m7.g[1].slice(42,44)==='##'&&ROOMS.m7.g[5].slice(42,44)==='##',"Vine Bridges: its cracked plug (cols 42-43, rows 2-4) closes the corridor from rock to rock, so the way on needs the drill");
  /* the plug runs down to the floor and its east face is cracked only in rows 8-11, so a tunnel drilled from the east (going
     home) can always be taken down to row 11, under the beetle's lowest shell */
  ok(ROOMS.m8.g.slice(5,12).every(r=>r[43]==='X')&&ROOMS.m8.g.slice(8,12).every(r=>r[44]==='X')&&ROOMS.m8.g.slice(1,8).every(r=>r[44]==='#')&&ROOMS.m8.g.slice(1,5).every(r=>r[43]==='#')&&ROOMS.m8.g[12].slice(43,45)==='##',"Slag Tunnel: the cracked plug (col 43 rows 5-11, col 44 rows 8-11) closes the shaft's east side from rock to rock, so without a drill there is no way east (X is solid till drilled)");
  const c9=copyRoom('m9');
  proof('Magma Lake: without the claws, the first wall (7 tiles out of the lava) stops him',playState(c9,53*T,18*T-PH,F),S=>S.p.x<30*T&&ft(S)<=12*T,{prio:S=>S.p.x},{label:'with the claws',S:playState(c9,53*T,18*T-PH,A)});
  proof('Magma Lake: without the forged board, the claws and the plain board never cross the first lake (18 tiles under a roof)',playState(c9,53*T,18*T-PH,{root:1,board:1,claws:1}),S=>S.p.x<30*T&&ft(S)<=12*T,{prio:S=>S.p.x},null,{evidence:true});
}

/* ---------------- the geyser chase: Geyser Core (m11) and Cinder Hush (m10) ---------------- */
console.log('the geyser chase');
const C=CHASES.molten,SAFE=GY.endX(C),wcx=S=>wxp(S)+PW/2;
const VENTS=['m11','m10'].flatMap(id=>ROOMS[id].vents.filter(v=>!v.live).map(v=>(ROOMS[id].at[0]+v.tx)*T+T/2)).sort((a,b)=>a-b);   /* the chase's vents (the live one in Cinder Hush lies past the safe line) */
const ped=ROOMS.m11.pedestals[0],PEDX=(ROOMS.m11.at[0]+ped.tx)*T+T/2;
{ ok(C.kind==='geyser'&&C.dir===1&&C.from===ROOMS.m11.at[0]+ped.tx&&C.path.length===2&&C.path[0][0]===C.from&&C.path[1].length===1,`CHASES.molten runs east (dir 1) from the pedestal (world x ${C.from}) to the safe line at world x ${C.path[1][0]}, waves at ${C.path[0][1]} px/frame`);
  const lastVent=Math.max(...ROOMS.m10.vents.filter(v=>!v.live).map(v=>v.tx)),seat=ROOMS.m10.perches[0].tx,sl=C.path[1][0]-ROOMS.m10.at[0];
  ok(sl>lastVent+2&&sl<seat,`the safe line lies in Cinder Hush between its last vent (col ${lastVent}) and the seat (col ${seat}), at col ${sl}`);
  ok(VENTS.every(x=>GY.inSpan(C,x))&&IDS.filter(id=>!['m10','m11'].includes(id)).every(id=>ROOMS[id].vents.every(v=>!GY.inSpan(C,(ROOMS[id].at[0]+v.tx)*T+T/2))),`all ${VENTS.length} dormant vents of the two rooms lie in the sweep; no other Molten vent does (theirs only ever puff)`);
}
/* the bot's legs: to the middle of each gap between vents (and onto the shelf), then past the safe line */
const SH0=(ROOMS.m11.at[0]+27)*T,SH1=(ROOMS.m11.at[0]+34)*T;   /* the shelf in Geyser Core, cols 27-33, four tiles up */
const STOPS=[...VENTS.slice(0,-1).flatMap((x,i)=>{const y=VENTS[i+1];return x<SH0&&y>SH1?[SH0-1.5*T,(SH0+SH1)/2,SH1+1.5*T]:[(x+y)/2-T/2]}),SAFE+T].sort((a,b)=>a-b);
const JUMPS=[[0,0],[1,0],[1,14],[1,20],[1,26],[4,18],[8,22],[12,18],[16,22]];
function leg(S,rec,stop,pause,log){
  for(let w=0;w<=540;w+=6)for(const [j,r] of JUMPS){const C0=snapshot(S),out=[];let dead=false,won=false;
    for(let k=0;k<w+pause&&!dead;k++){out.push(0);if(E.step(C0,I(),[]).includes('die'))dead=true}
    for(let k=1;k<=600&&!dead;k++){const c=enc(I({r:1,j:j&&k>=j,jp:j&&(k===j||(r&&k===j+r))}));out.push(c);const ev=E.step(C0,dec(c),[]);if(ev.includes('die')||C0.p.dead){dead=true;break}
      if((wcx(C0)>=stop&&C0.p.ground)||(C0.chase&&!C0.chase.on)){won=true;break}}
    if(won){for(const c of out){const ev=E.step(S,dec(c),[]);rec.push(c);log(S,ev)}return true}}
  return false}
function chaseRun(S,{pause=0}={}){
  const rec=[],cps=[];let died=0,done=-1,t0=S.t,okk=true,last=S.room,near=0,start=-1,erupted=new Set();
  const log=(S,ev)=>{if(ev.includes('die'))died++;if(ev.includes('cp'))cps.push([S.room+':'+S.cp.tx,S.t-t0]);if(ev.includes('chase_start'))start=S.t-t0;if(ev.includes('chase_done'))done=S.t-t0;near=Math.max(near,CH.nearness(S));for(const e of S.ens)if(e.k==='vent'&&e.st===2)erupted.add(S.room+e.tx)};
  if(!S.pieces[MK]){for(let k=0;k<400&&!S.pieces[MK];k++){const ev=E.step(S,I({l:1}),[]);rec.push(enc(I({l:1})));log(S,ev)}for(let k=0;k<pause;k++){log(S,E.step(S,I(),[]));rec.push(0)}}
  for(const stop of STOPS){if(wcx(S)>=stop)continue;if(!S.chase||!S.chase.on)break;const p=pause&&S.room!==last?pause:0;last=S.room;if(!leg(S,rec,stop,p,log)){okk=false;break}}
  return {ok:okk&&!died&&done>=0&&S.chase&&!S.chase.on,rec,died,done,secs:(done-Math.max(0,start))/60,S,cps,near,erupted:erupted.size,stuck:okk?'':S.room+' x '+(S.p.x/T).toFixed(1)};
}
const atPedestal=(assist=0)=>{const S=playState('m11',ped.tx*T+3*T,10*T-PH,A,assist);run(S,3,I());S.cp={room:'m11',tx:7,ty:9};S.torches['m11:7,9']=1;return S};
function atTorch(room,tx,ty,assist=0){const S=playState(room,0,0,A,assist);S.pieces[MK]=1;S.chase={id:'molten',on:1,x:0,t:0,n:0,w:0};S.cp={room,tx,ty};E.enterRoom(S,room,E.spot(S,ROOMS[room],tx,ty));CH.resetChase(S);E.step(S,I(),[]);return S}
if(want('chase')){ const S=atPedestal();const pre=new Set();for(let k=0;k<600;k++){E.step(S,I(),[]);for(const e of S.ens)pre.add(e.st)}
  ok(!pre.has(1)&&!pre.has(2)&&!S.chase,'before the fragment is lifted, Geyser Core\'s vents are dormant for 10 s (they puff, never crack or erupt): the room reads first');
  const M=playState('m10',30*T,10*T-PH,A);const pm=new Set();for(let k=0;k<600;k++){E.step(M,I(),[]);for(const e of M.ens)if(!e.live)pm.add(e.st)}ok(!pm.has(1)&&!pm.has(2),'...and so are Cinder Hush\'s field vents on the way in (its one live vent, under the shelf, is tested below)');
  const R=chaseRun(atPedestal());
  ok(R.ok,`lifting the fragment starts the sweep; the bot runs it east to the safe line with no death, ${R.secs.toFixed(1)} s from the lift (${R.erupted} vents erupted in his rooms)${R.ok?'':' STUCK '+R.stuck}`);
  ok(R.near>=.5,`...the eruptions come close (nearness up to ${R.near.toFixed(2)})`);
  const T2=atPedestal();let died=0,done=0;for(const c of R.rec){const ev=E.step(T2,dec(c),[]);if(ev.includes('die'))died++;if(ev.includes('chase_done'))done++}
  ok(!died&&done===1&&T2.room==='m10'&&wcx(T2)>=SAFE,'replayed: no death, chase_done once, past the safe line in Cinder Hush');
  ok(T2.chase&&!T2.chase.on&&CH.progress(T2)===0&&CH.nearness(T2)===0,'past the safe line it is over (no progress, no shake)');
  run(T2,GY.GEYSER.wither+2,I());ok(T2.chase===null&&T2.ens.every(e=>e.k!=='vent'||e.live||(e.st!==1&&e.st!==2)),'a second later it is gone, the vents behind him dormant again, and the hush is calm');
  /* torches on the way: about every 10 s of travel */
  const cpT=R.cps.filter(([k])=>k!=='m11:7');const gaps=[];let prev=Math.max(0,R.done-R.secs*60);for(const [,t] of cpT){gaps.push((t-prev)/60);prev=t}gaps.push((R.done-prev)/60);
  ok(gaps.every(g=>g<=12),`torches on the way (${R.cps.map(c=>c[0]).join(', ')}): the gaps between them on a clean run are ${gaps.map(g=>g.toFixed(1)).join(', ')} s (about every 10 s)`);
  const H=chaseRun(atPedestal(),{pause:60});ok(H.ok,`a hesitant bot (1 s still after the lift and on entering each room) clears it too (${H.secs.toFixed(1)} s)${H.ok?'':' STUCK '+H.stuck}`);
  const notes=[];let all=true;for(const [room,tx,ty] of [['m11',7,9],['m11',30,5],['m10',2,9]])for(const pause of [0,60]){const r=chaseRun(atTorch(room,tx,ty),{pause});if(!r.ok)all=false;notes.push(`${room}:${tx}${pause?'+1s':''} ${r.ok?r.secs.toFixed(1)+' s':'FAIL '+r.stuck}`)}
  ok(all,`restarted at every torch on the way (and hesitating 1 s per room) he clears it: ${notes.join('; ')}`);
  const As=chaseRun(atPedestal(1));ok(As.ok,`with Assist (70% speed, a longer telegraph) the clean run clears it (${As.secs.toFixed(1)} s)`);
  const Ah=chaseRun(atTorch('m11',30,5,1),{pause:60});ok(Ah.ok,`with Assist, from the shelf torch, hesitant (${Ah.secs.toFixed(1)} s)`);
  const g1=JSON.stringify(ROOMS.m11.g)+JSON.stringify(ROOMS.m10.g),a0=atPedestal(0),a1=atPedestal(1);ok(JSON.stringify(a0.ens.map(e=>[e.tx,e.ty,e.hgt]))===JSON.stringify(a1.ens.map(e=>[e.tx,e.ty,e.hgt]))&&g1===JSON.stringify(ROOMS.m11.g)+JSON.stringify(ROOMS.m10.g),'Assist changes no layout (the same vents, heights and grids)');
  /* a real death in the sweep: back at his torch, the waves restart behind it, nothing erupts by the torch as he comes back */
  const D=atPedestal();for(let k=0;k<400&&!D.chase;k++)E.step(D,I({l:1}),[]);D.p.x=(ROOMS.m11.vents[1].tx)*T+T/2-PW/2;D.p.y=10*T-PH;let ev=[];for(let k=0;k<900&&!ev.includes('die');k++)ev=E.step(D,I(),[]);
  let rz=[];for(let k=0;k<60&&!rz.includes('rez');k++)rz=E.step(D,I(),[]);let bad=false;for(let k=0;k<20;k++){E.step(D,I(),[]);if(D.ens.some(e=>e.k==='vent'&&e.st===2&&Math.abs(e.tx*T-D.p.x)<4*T))bad=true}
  ok(ev.includes('die')&&rz.includes('rez')&&D.chase&&D.chase.on&&!bad,`standing on a vent in the sweep an eruption gets him; he is back at ${D.cp.room}:${D.cp.tx}, the chase still on, and no vent beside him erupts as he comes back`);
  const Dr=chaseRun(D);ok(Dr.ok,`...and he clears it from there (${Dr.secs.toFixed(1)} s)`);
  /* the chase needs only what the spoke taught: the shelf takes the root jump (or the claws) */
  const lowItems=[];for(const [n,it] of [['root',{root:1}],['claws',{claws:1}],['board',{board:1}]]){const S=playState('m11',ped.tx*T+3*T,10*T-PH,it);run(S,3,I());S.cp={room:'m11',tx:7,ty:9};lowItems.push(n+': '+(chaseRun(S).ok?'clears it':'not by this bot'))}
  note(`which items the chase bot needs: ${lowItems.join('; ')} (all four are owned and used before it)`);
  REC.chase=R;
}

/* ---------------- the live vent: a safe eruption to watch on the way to the core ---------------- */
console.log('the live vent (Cinder Hush)');
if(want('vent')){
  const LV=ORDER.flatMap(id=>ROOMS[id].vents.filter(v=>v.live).map(v=>({id,...v}))),v=LV[0],RV=ROOMS.m10,vwx=(RV.at[0]+v.tx)*T+T/2;
  ok(LV.length===1&&v.id==='m10'&&!GY.inSpan(C,vwx)&&RV.at[0]+v.tx>C.path[1][0]+3,`one live vent in the spoke: Cinder Hush (${v.tx},${v.ty}), world x ${RV.at[0]+v.tx}, east of the safe line (x ${C.path[1][0]}) and outside the chase span (${C.from}..${C.path[1][0]}), so no wave ever drives it`);
  const dT=Math.min(...RV.torches.map(t=>Math.max(Math.abs(t.tx-v.tx),Math.abs(t.ty-v.ty))));
  ok(dT>3&&dT<=10&&RV.g[4].slice(44,56)==='#'.repeat(12)&&RV.g.slice(5,10).every(r=>r.slice(45,52)==='.'.repeat(7)||r.slice(45,52).includes('V'))&&RV.g.slice(8,10).every(r=>r.slice(40,45)==='.'.repeat(5))&&RV.g[7].slice(40,44)==='####',
    `it stands in a chamber under the shelf he arrives on (cols 45-51, rows 5-9), reached only by a low passage east of the torch; its nearest torch is ${dT} tiles away (more than 3, near enough to restart at)`);
  /* in the real engine: he stands on the shelf right above it for 20 s */
  const S=playState('m10',47*T,4*T-PH,A);run(S,3,I());const e=S.ens.find(e=>e.live);let prev=0,tel=0,bad=0,on=0,minY=1e9,box=true,died=0;const evs=new Set();
  for(let k=0;k<1200;k++){const ev=E.step(S,I(),[]);for(const x of ev)evs.add(x);if(ev.includes('die'))died++;
    if(e.st===1)tel++;if(e.st===2&&prev!==2){on++;if(prev!==1||tel<GY.GEYSER.tel-1)bad++}if(e.st!==1)tel=0;prev=e.st;
    const b=GY.ventBox(e);if(b){minY=Math.min(minY,b.y);if(b.x<45*T||b.x+b.w>52*T||b.y<5*T)box=false}}
  ok(on>=3&&!bad&&!died&&box&&evs.has('geyser_crack')&&evs.has('geyser_erupt'),`watched from the shelf above it for 20 s: it cracks and steams for ${GY.GEYSER.tel} frames before each of its ${on} eruptions (with their sounds), the column stays in its chamber (top at row ${(minY/T).toFixed(0)}, under the shelf's rock), and he is never touched`);
  /* never where he walks: the bot's way through Cinder Hush never enters the passage or the chamber */
  if(REC.m10){const W=newState();restore(W,REC.m10.start);let inside=0;for(const c of REC.m10.rec){E.step(W,dec(c),[]);if(W.room==='m10'&&W.p.x+PW>40*T&&W.p.y+PH>8*T&&W.p.y<10*T)inside++}
    ok(!inside,'the way through Cinder Hush (the bot\'s route) never enters its passage or chamber')}
  /* the hand-off (the latent bug): a live vent that a chase can drive (one put in the span) never erupts without its
     telegraph when the chase starts or ends, at any frame of its rhythm; nor does the real one */
  let fails=0,cases=0;for(const st of [100,133,171,200])for(const end of [400,413,450,477,500,550,590,640]){cases++;
    const H=playState('m10',47*T,4*T-PH,A);run(H,2,I());const x=GY.spawnVent(ROOMS.m10,{tx:20,ty:9,live:1,period:240});H.ens.push(x);const real=H.ens.find(e=>e.live&&e!==x);
    const seen=new Map([[x,[0,0]],[real,[0,0]]]);
    for(let k=0;k<1100;k++){if(k===st)H.chase={id:'molten',on:1,x:C.from*T,t:0,n:0,na:0,w:0};if(k===end&&H.chase)H.chase.on=0;E.step(H,I(),[]);if(H.chase&&!H.chase.on&&H.chase.w>5)H.chase=null;
      for(const [q,m] of seen){if(q.st===2&&m[0]!==2&&(m[0]!==1||m[1]<GY.GEYSER.tel-1))fails++;m[1]=q.st===1?m[1]+1:0;m[0]=q.st}}}
  ok(!fails,`a chase handing a live vent over (started and ended at ${cases} pairs of frames across its rhythm): no eruption without its telegraph (geysers.js latches the hand-off frame)`);
}

/* ---------------- the ember gate (Slag Tunnel): centred in its chimney ---------------- */
console.log('the ember gate');
{ const S=playState('m8',24*T,13*T-PH,A);const em=S.ens.find(e=>e.k==='ember'),src=SRC.m8.ents.find(e=>e.at[0]===30&&e.at[1]===6);
  const cx0=29*T,cx1=31*T-PW;let lo=1e9;for(let x=cx0;x<=cx1;x++){const a=x+3,b=x+PW-3,c=em.hx+1,d=em.hx+em.w-1;lo=Math.min(lo,Math.min(b,d)-Math.max(a,c))}
  const CI=await import(G+'cinders.js'),bad=CI.spawnCinder(ROOMS.m8,{k:'E',tx:30,ty:6,ox:'x',oy:null});
  ok(src.ox===-6&&em.hx===355&&lo>=6&&bad.hx===361&&bad.hy===73,`the ember sits off its tile by ox -6 (x ${em.hx}, centred in the chimney's cols 29-30), so his hitbox overlaps it by at least ${lo} px anywhere across the chimney (it was 1 px); a non-number offset is ignored`);
}

/* ---------------- the climb home: Ember Ridge up to the hub ---------------- */
console.log('the climb home');
const CLIMB={};
if(want('climb')){
  const up=(it,placed=[1,1,0,0])=>{const S=playState('m1',40*T,16*T-PH,it);S.pieces=[1,1,1,0];S.placed=placed.slice();run(S,3,I());return S};
  const home=S=>S.room==='hub'&&S.p.ground;
  for(const [name,it] of [['the items he comes back with (root, board, forged, claws)',A],['only the root and the board (his first way down)',B],['only the root',{root:1}]]){
    const S0=up(it),r=reach(S0,home,{prio:wyp,budget:100000});let died=0,end=null;
    if(r.found){const S=up(it);for(const c of r.inputs.map(enc))if(E.step(S,dec(c),[]).includes('die'))died++;end=S}
    ok(r.found&&!died&&end&&home(end),`from Ember Ridge's arrival torch, with ${name}, he climbs the chimney into the hub: ${r.found?sec(r.frames)+' s':'NOT FOUND'}, replayed with no deaths`);
    CLIMB[name]=r.frames}
  const nr=reach(up({board:1,claws:1}),home,{prio:wyp,budget:QUICK?1:60000});if(!QUICK)note(`without the root (board and claws only): ${nr.found?'climbable ('+sec(nr.frames)+' s)':'no route in '+nr.nodes+' nodes'}; he always has the root by then`);
  proof('sealed from below: with the Flood fragment not yet placed, the root and the board never get him from Ember Ridge into the hub',up(B,[1,0,0,0]),home,{prio:wyp},{label:'placed',S:up(B)},{evidence:true});
}

/* ---------------- the way home: from the end of the chase back to Ember Ridge and up to the hub, no soft-lock ---------------- */
console.log('the way home');
if(!QUICK&&want('home')){
  /* each room against its forward direction, from the door he came out of to the one he came in by; stages where the way
     home climbs. Vines and drilled walls reset at every room seam, so the plugs are drilled again from their far side */
  const UP=wyp,EAST=S=>-wxp(S),WEST=wxp;
  const BACK=[['m10',[['Cinder Hush: up onto the shelf',stand('m10',44,55,4),{prio:UP}],['m9',S=>S.room==='m9',{prio:EAST}]]],
    ['m9',[['Magma Lake: the upper lake east',stand('m9',30,33,11),{prio:EAST}],['the lower lake east',stand('m9',52,55,18),{prio:EAST}],['up the two ledges',S=>S.room==='m8',{prio:S=>wyp(S)-wxp(S)*.3}]]],
    ['m8',[['Slag Tunnel: up to the corridor',stand('m8',4,10,17),{prio:UP,dash:false}],['along it',stand('m8',38,44,17),{prio:EAST,dash:false}],['to the foot of the drop',stand('m8',45,46,17),{prio:EAST,dash:false}],
      ['clinging high on the plug\'s far face',S=>S.room==='m8'&&S.p.cl===-1&&S.p.x>=44.9*T&&ft(S)<=10*T+2&&ft(S)>=9*T,{prio:S=>S.p.y}],
      ['through the plug',S=>S.room==='m8'&&S.p.x<43*T&&ft(S)<=12*T+.1,{prio:WEST,dash:false,drop:false}],['into the shaft',stand('m8',37,42,12),{prio:WEST}],['up onto W',stand('m8',31,36,5),{prio:UP}],['over the chimney onto the slab',stand('m8',22,27,5),{prio:WEST,dash:false,drop:false}],['down the hole in it',null,{walk:[['l',S=>!S.p.ground&&S.p.x<22*T],['',S=>S.p.ground]]}],['up to the door',S=>S.room==='m7',{prio:S=>wxp(S)+wyp(S)*.5}]]],
    ['m7',[['Vine Bridges: through the plug',S=>S.room==='m7'&&S.p.x<41*T,{prio:WEST}],['the channel',stand('m7',8,17,5),{prio:WEST}],['down and out',S=>S.room==='m6',{prio:WEST}]]],
    ['m6',[['Cinder Pit',S=>S.room==='m5',{prio:S=>wxp(S)+wyp(S)*.3}]]],['m5',[['Sprout Hush',S=>S.room==='m4',{prio:WEST}]]],
    ['m4',[['Forge Run: lane C west to the step',stand('m4',27,33,22),{prio:WEST}],['lane B west',stand('m4',1,6,24),{prio:WEST}],['to the ledge\'s foot',null,{walk:[['r',S=>S.p.x>=3.5*T]]}],['up to the ledge',stand('m4',7,24,17),{prio:UP,dash:false,drop:false}],['under the bank\'s edge',null,{walk:[['r',S=>S.p.x>=18.3*T]]}],['up to the bank',stand('m4',20,35,10),{prio:UP,dash:false,drop:false}],['lane A east',S=>S.room==='m3',{prio:EAST}]]],
    ['m3',[['Steam Lake east',S=>S.room==='m2',{prio:EAST}]]],['m2',[['Ashfall east',S=>S.room==='m1',{prio:EAST}]]],
    ['m1',[['Ember Ridge east to the chimney',stand('m1',37,43,16),{prio:EAST}],['up the chimney to the hub',S=>S.room==='hub'&&S.p.ground,{prio:UP}]]]];
  const homeS=()=>{const S=playState('m10',38*T,10*T-PH,A);S.pieces=[1,1,1,0];S.placed=[1,1,0,0];run(S,3,I());return S};   /* Flood is in the door, or he could not have come down */
  const S=homeS();const rec=[];let won=true;const legs=[];
  for(const [id,stages] of BACK){if(!won)break;const n0=rec.length;for(const [name,t,o] of stages){if(!won)break;won=o.walk?o.walk.every(([d,done])=>Bot.walk(S,rec,d,done,600)):Bot.to(S,rec,name,t,{budget:150000,...o})}legs.push(`${id} ${won?sec(rec.length-n0)+' s':'stuck'}`)}
  ok(won&&S.room==='hub',`after the chase, with the items he holds, he walks home from Cinder Hush through Ember Ridge and up into the hub: ${legs.join(', ')} (${sec(rec.length)} s)`);
  if(won){const S2=homeS();let died=0;for(const c of rec)if(E.step(S2,dec(c),[]).includes('die'))died++;ok(!died&&S2.room==='hub','...replayed with no deaths')}
}else note('(QUICK) skipped: the way home');

/* ---------------- time: bot floor and the R24 geometry estimate ---------------- */
console.log('time');
if(ALL){ const BEATS={m1:2,m2:3,m3:3,m4:3,m5:2,m6:2,m7:3,m8:2,m9:2,m10:2,m11:2},TYPE={m1:'calm',m5:'calm',m10:'calm',m2:'teach',m3:'teach',m4:'reinforce',m6:'teach',m7:'reinforce',m8:'teach',m9:'teach',m11:'frag'};
  const A_={calm:20,reinforce:25,teach:32,frag:25};
  /* route length: the bot's own path through the room, in tiles walked or climbed */
  const route={};if(REC.spoke){const S=newState();restore(S,REC.spoke.start);let last=null,cur=null;for(const c of REC.spoke.rec){E.step(S,dec(c),[]);if(S.room!==cur){cur=S.room;last=null}const p=[wxp(S)/T,wyp(S)/T];if(last)route[cur]=(route[cur]||0)+Math.abs(p[0]-last[0])+Math.abs(p[1]-last[1]);last=p}}
  const rows=IDS.map(id=>{const b=SPOKE[id]??TIMES[id],len=route[id]??ROOMS[id].w,g=len/6+8*BEATS[id];return {id,b,len,g,a:A_[TYPE[id]]}});
  for(const r of rows)note(`${r.id} ${ROOMS[r.id].name.padEnd(13)} ${TYPE[r.id].padEnd(9)} bot ${r.b.toFixed(1).padStart(5)} s | route ${r.len.toFixed(0).padStart(4)} tiles, ${BEATS[r.id]} beats -> R24 ${r.g.toFixed(0)} s | type ${r.a} s`);
  const sb=rows.reduce((a,r)=>a+r.b,0),sg=rows.reduce((a,r)=>a+r.g,0),sa=rows.reduce((a,r)=>a+r.a,0),ch=REC.chase?REC.chase.secs:0;
  note(`spoke: bot ${sb.toFixed(0)} s + chase ${ch.toFixed(0)} s; R24 geometry ${sg.toFixed(0)} s (${(sg/60).toFixed(1)} min) + chase; fixed times by type ${sa} s (${(sa/60).toFixed(1)} min). The bot is a floor: it dashes everywhere and never hesitates`);
  const lo=Math.min(sg,sa)/60;ok(lo>=4.5&&lo<=5.5,`R24: the lower of the two estimates (${lo.toFixed(1)} min before the chase; geometry ${(sg/60).toFixed(1)}, fixed times ${(sa/60).toFixed(1)}) lies in the 4.5 to 5.5 minute target`);
}
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails?1:0);
