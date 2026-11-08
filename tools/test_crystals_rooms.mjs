// Crystals rooms (R1 K1-K5, 2026-11-07; R2 appends K6-K10): the tower's layout, the hub plug and its climb, the rooms by
// bot, the Undo and Echo locks, the leak proofs and the fairness invariant (CL6), on the real step.
// Contract: ~/.claude/plans/wake-up-crystals-beat-sheet.md sections 1, 4, 5, 6. Search: tools/crystals_reach.mjs (never with
// Undo owned; a rewind restores a past state, it never gives distance, so rewinds are scripted, not searched).
// Distance and claw leaks that are too big to exhaust are searched with a fixed budget steered at the target and labelled
// "evidence"; the gates are also proved by a tile flood fill (exact). Plain node, no deps: node tools/test_crystals_rooms.mjs
// QUICK=1 skips the slow leak searches and the fairness sweeps (QUICK=1 FAIR=1: the fairness sweeps only).
const G=new URL('../game/',import.meta.url).href;
const {T,PIECES,PERCH,snapshot,restore,newState}=await import(G+'state.js');
const E=await import(G+'engine.js');
const {ROOMS,ORDER,NEXT,parse,roomAtTile,perchOf}=await import(G+'rooms/index.js');
const U=await import(G+'undo.js');
const EC=await import(G+'echo.js');
const FMT=await import(G+'dev/roomfmt.js');
const fs=await import('node:fs');
const RK=await import('./crystals_reach.mjs');
const {reach,playState,I,go,waitGo,noUndo,hidden,at,toward,into,onPlate,solutionA}=RK;
await U.undoReady;
let fails=0,passes=0;
const ok=(c,msg)=>{if(c){passes++;console.log('  ok  ',msg)}else{fails++;console.log('  FAIL',msg)}};
const note=msg=>console.log('  ..  ',msg);
const QUICK=!!process.env.QUICK;
const PW=18,PH=24,MK=PIECES.indexOf('molten');
const ft=S=>S.p.y+PH,sec=n=>(n/60).toFixed(1);
const run=(S,n,f)=>{const evs=[];for(let i=0;i<n;i++)evs.push(...E.step(S,typeof f==='function'?f(i,S):f,[]));return evs};
const ALL={root:1,board:1,claws:1,forged:1};
const tm=()=>{const t=Date.now();return ()=>((Date.now()-t)/1000).toFixed(0)+' s'};
/* at, toward, into (standing on a row at a column; distances for the search's priority): tools/crystals_reach.mjs */

const IDS=['k1','k2','k3','k4','k5'],NAMES=['Quiet Gallery','Shard Steps','Rewind Walk','Echo Hall','Still Pool'];
const AT=[-19,-38,-57,-76,-95],FLOORH=[[4,8],[31,35],[4,8],[31,35],[4,8]],CEILH=[[31,35],[4,8],[31,35],[4,8],[31,35]];
const RM=IDS.map(id=>ROOMS[id]);
const SRC={};for(const id of IDS)SRC[id]=(await import(G+`rooms/crystals_${id}.js`)).default;
const span=(a,b)=>{const o=[];for(let x=a;x<=b;x++)o.push(x);return o};

console.log('layout (the geometry contract)');
{ ok(RM.every(Boolean)&&RM.map(R=>R.name).join(',')===NAMES.join(',')&&RM.every(R=>R.biome==='crystals'),`five rooms: ${IDS.map((id,i)=>id+' '+NAMES[i]).join(', ')}`);
  ok(RM.every((R,i)=>R.at[0]===0&&R.at[1]===AT[i]&&R.w===40&&R.h===19),`each at x 0, 40 x 19, at y ${AT.join(', ')}`);
  /* the openings in each room's bottom and top rows: the contract hole, the chase hatch (cols 18-20), nothing else */
  const opens=(R,y)=>span(0,39).filter(x=>!'#='.includes(R.g[y][x]));
  const want=(i,top)=>{const h=top?CEILH[i]:FLOORH[i],o=span(h[0],h[1]);if(top||i>0)o.push(18,19,20);return o.sort((a,b)=>a-b).join(',')};
  ok(RM.every((R,i)=>opens(R,0).join(',')===want(i,1)),`ceiling holes: ${RM.map((R,i)=>R.id+' '+CEILH[i].join('-')).join(', ')}, plus the hatch slot at cols 18-20`);
  ok(RM.every((R,i)=>i===0||opens(R,18).join(',')===want(i,0)),`floor holes: ${RM.slice(1).map((R,i)=>R.id+' '+FLOORH[i+1].join('-')).join(', ')}, plus the hatch at cols 18-20`);
  ok(opens(ROOMS.k1,18).length===0&&span(4,8).every(x=>ROOMS.k1.g[18][x]==='='),"K1's floor hole is the top of the hub plug: rubble at cols 4-8 (a seal, below)");
  ok(RM.every(R=>R.g.every((row,y)=>(y===0||y===18?[...row]:[row[0],row[39]]).every(c=>'#=.'.includes(c)))),"edge rows and columns hold only rock, rubble or air (Q, R, D on an edge read differently to test_game and roomfmt)");
  ok(RM.every(R=>R.g.every(row=>row[0]==='#'&&row[39]==='#')),'side walls closed (the tower touches Seedbed at x -1 and Tideshore only at its corners)');
  let clash=0;for(const R of RM)for(let y=0;y<R.h;y++)for(let x=0;x<R.w;x++)if(roomAtTile(R.at[0]+x,R.at[1]+y)!==R)clash++;
  ok(!clash,'no Crystals room overlaps any room');
  let bad=[];for(const R of RM){const sides=[];for(let y=0;y<R.h;y++){sides.push([-1,y,0,y]);sides.push([R.w,y,R.w-1,y])}for(let x=0;x<R.w;x++){sides.push([x,-1,x,0]);sides.push([x,R.h,x,R.h-1])}
    for(const [ox,oy,ix,iy] of sides){const N=roomAtTile(R.at[0]+ox,R.at[1]+oy),io=!'#=GX'.includes(R.g[iy][ix]);
      if(io&&!N)bad.push(R.id+' '+ix+','+iy+' to nowhere');
      if(N){const nc=N.g[R.at[1]+oy-N.at[1]][R.at[0]+ox-N.at[0]];if(io!==!'#=GX'.includes(nc))bad.push(R.id+' '+ix+','+iy+' vs '+N.id)}}}
  ok(!bad.length,`every edge matches its neighbour: an opening only where the room above or below opens too${bad.length?': '+bad.slice(0,4).join('; '):''}`);
  ok(RM.every(R=>R.torches.length>=1)&&ROOMS.k1.perches.length>=1&&ROOMS.k5.perches.length>=1,'every room has a torch; the calm rooms (K1, K5) a seat');
  const pool=R=>R.g.flat().join('').split('~').length-1;ok(pool(ROOMS.k1)>=20&&pool(ROOMS.k5)>=30,`still pools: K1 ${pool(ROOMS.k1)} water tiles (the reflection), K5 ${pool(ROOMS.k5)} (the surf lane)`);
  const inset=[];for(const R of RM)R.g.forEach((row,y)=>[...row].forEach((c,x)=>{if(c!=='~')return;const b=(R.g[y+1]||'#')[x],l=row[x-1]??'#',r=row[x+1]??'#',u=(R.g[y-1]||'')[x];if(!'#~'.includes(b)||!'#~'.includes(l)||!'#~'.includes(r))inset.push(R.id+':'+x+','+y)}));
  ok(!inset.length,`every water tile is inset (rock or water below and beside)${inset.length?': '+inset.join(' '):''}`);
  /* R19: no hazard within 3 tiles of a hole cell (where he comes in) */
  const near=[];for(const R of RM){const holes=[];for(const y of [0,18])for(let x=0;x<40;x++)if(!'#'.includes(R.g[y][x]))holes.push([x,y]);
    R.g.forEach((row,y)=>[...row].forEach((c,x)=>{if('^LYZ'.includes(c)&&c!=='Z'&&holes.some(([hx,hy])=>Math.abs(hx-x)<=3&&Math.abs(hy-y)<=3))near.push(R.id+':'+x+','+y)}))}
  ok(!near.length,`no thorn, lava or drifter within 3 tiles of a hole (R19)${near.length?': '+near.join(' '):''}`);
  ok(['k1','k5'].every(id=>!ROOMS[id].g.some((r,y)=>y>0&&/[\^LYW]/.test(r))&&!ROOMS[id].spawns.length&&!ROOMS[id].crys.length&&!ROOMS[id].echo),'the calm rooms (K1, K5) have no hazard, no platform, no drifter and no Echo');
  ok(ROOMS.k2.items.length===1&&ROOMS.k2.items[0].id==='undo'&&IDS.every(id=>id==='k2'||!ROOMS[id].items.length),'the Undo item lies only in Shard Steps (K2)');
  ok(ROOMS.k4.echo&&ROOMS.k4.echo.lag===120&&IDS.every(id=>id==='k4'||!ROOMS[id].echo)&&ROOMS.k4.plates.length===1&&ROOMS.k4.gates.length>=2,'the Echo (Z, lag 120), the plate and the gate are in Echo Hall (K4) only');
  ok(ROOMS.k3.crys.filter(c=>c.k==='W').length===3,'Rewind Walk has three moving platforms');
  ok(ROOMS.k5.locks.length>=1&&ROOMS.k5.rx.length>=1&&!ROOMS.k5.crys.some(c=>c.k==='Y'),'Still Pool: a crystal lock and its receiver, and no drifter to light it (the two-item tell, S5)');
  const srcs=IDS.map(id=>{const text=fs.readFileSync(new URL(`rooms/crystals_${id}.js`,G),'utf8');return {text,mod:SRC[id]}});
  ok(srcs.every(({text,mod})=>FMT.serialize(mod,FMT.headerComment(text))===text&&!FMT.check(mod,FMT.headerComment(text))),"every file is in the editor's format byte for byte and passes its checks");
  const all=[];for(const f of fs.readdirSync(new URL('rooms/',G)).filter(f=>f.endsWith('.js')&&f!=='index.js'))all.push((await import(G+'rooms/'+f)).default);
  const pr=FMT.problems(ORDER.map(id=>all.find(r=>r.id===id)).filter(Boolean)).filter(p=>IDS.includes(p.id));ok(!pr.length,`the editor's checks find nothing in K1-K5${pr.length?': '+pr.slice(0,3).map(p=>p.id+' '+p.msg).join('; '):''}`);
  const src=fs.readFileSync(new URL('rooms/index.js',G),'utf8'),blk=/\/\* rooms:begin[^\n]*\*\/\n([\s\S]*?)\/\* rooms:end \*\//.exec(src)[1];
  const lst=/const LIST=\[([^\]]*)\]/.exec(blk)[1].split(',');
  ok(IDS.every(id=>new RegExp(`import R_${id} from '\\./crystals_${id}\\.js';\\n`).test(blk))&&lst.indexOf('R_k1')===lst.indexOf('R_m11')+1&&IDS.every((id,i)=>lst.indexOf('R_'+id)===lst.indexOf('R_k1')+i)&&lst.indexOf('R_k5')<lst.indexOf('R_f1')&&lst[lst.length-1]==='R_b10',
    'the registry lists crystals_k1.js .. k5.js right after m11 and before f1 (b10 stays last)');
  const nx=n=>NEXT.find(e=>e.need===n),iu=nx('item:undo'),pm=nx('placed:molten');
  ok(iu&&iu.room==='k2'&&iu.tile[0]===ROOMS.k2.items[0].tx&&iu.tile[1]===ROOMS.k2.items[0].ty&&pm&&pm.room==='hub'&&NEXT.indexOf(pm)===NEXT.indexOf(nx('piece:molten'))+1&&NEXT.indexOf(iu)>NEXT.indexOf(pm),
    "the stuck hint: after the Molten fragment, the hub door (setting it opens the plug), then the Undo item's tile in K2");
}

console.log('the hub plug: sealed until the Molten fragment is in the door');
const sealSet=id=>Object.keys(ROOMS[id].seals||{}).filter(k=>ROOMS[id].seals[k]==='molten').sort().join(' ');
{ ok(sealSet('hub')==='4,0 5,0 5,1 6,0 6,1 6,2 7,0 7,1 8,0'&&sealSet('k1')==='4,18 5,18 6,18 7,18 8,18',"the plug (hub row 0 cols 4-8, row 1 cols 5-7, row 2 col 6) and the row of Quiet Gallery's floor over it are seals with opens:'molten'");
  const pairs=[];for(let x=0;x<24;x++)pairs.push(x);
  const openCols=placed=>{const S=newState();S.lit=1;S.placed=placed.slice();return pairs.filter(x=>!E.solid(S,ROOMS.hub,x,0)&&!E.solid(S,ROOMS.k1,x,18))};
  const combos=[];for(let m=0;m<8;m++)combos.push([m&1,(m>>1)&1,0,(m>>2)&1]);
  ok(combos.every(c=>!openCols(c).length),'sealed: without the Molten fragment placed (any of the others), no column is open between the hub and Quiet Gallery');
  ok(combos.every(c=>openCols(c.map((v,i)=>i===MK?1:v)).join(',')==='4,5,6,7,8'),'placed: exactly cols 4-8 open, whatever else is placed');
  /* the climb from the hub floor (two small ledges: row 12 col 3, row 4 cols 2-3) */
  const climb=it=>{const S=playState('hub',8*T,192-PH,it);return reach(S,S=>S.room==='k1'&&S.p.ground,{budget:150000,prio:S=>S.room==='k1'?-1e6:S.p.y})};
  for(const it of [{root:1,claws:1},{root:1},{claws:1}]){const r=climb(it);ok(r.found,`with ${Object.keys(it).join(' + ')}: from the hub floor up through the open plug onto Quiet Gallery's floor (${r.found?sec(r.frames)+' s':'NOT FOUND'})`)}
  if(!QUICK){const r=climb({});ok(!r.found&&r.exhausted,`with no item there is no way up (search exhausted after ${r.nodes} nodes)`)}
  const N=playState('hub',8*T,192-PH,{root:1,claws:1});N.placed=[1,1,0,0];const rn=reach(N,S=>S.room==='k1',{budget:20000});ok(!rn.found,'with Molten not placed, the plug holds');
  /* the way back down (and the chase's last fall): walk off the plug's edge in K1 */
  const D=playState('k1',2*T,216-PH,ALL);const ev=run(D,240,i=>I({r:i<30}));
  ok(D.room==='hub'&&D.p.ground&&!ev.includes('die')&&!D.p.dead,`walking east off Quiet Gallery's west floor he drops through the plug and lands on the hub floor, alive (col ${(D.p.x/T).toFixed(0)}, feet ${ft(D)})`);
  const D2=playState('k1',19*T,150,ALL);const wet=S=>(ROOMS.k1.g[Math.floor((S.p.y+PH/2)/T)]||'')[Math.floor((S.p.x+PW/2)/T)]==='~';const ev2=run(D2,500,(i,S)=>I({l:1,j:wet(S)&&i%24<6,jp:wet(S)&&i%24===0}));
  ok(D2.room==='hub'&&D2.p.ground&&!ev2.includes('die'),`from K2's hatch landing in the pool he swims west, strokes out onto the bank, walks on and drops through the plug into the hub, alive (${D2.room})`);
}

{ /* K1: the cracked glass bridge (Q, cols 28-31 row 16) over a dip: standing on it, it gives way; the drop is harmless */
  const S=playState('k1',29*T,192-PH,{});const ev=run(S,80,I());const r=reach(S,at('k1',34,192,30),{budget:20000,prio:toward(34,192)});
  ok(ev.includes('shard_fall')&&ft(S)===216&&!ev.includes('die')&&r.found,`K1: the cracked bridge gives way under him, he lands two tiles down in the dip alive, and hops out with no item (${r.found?sec(r.frames)+' s':'stuck'})`)}

{ /* crystals.js fix (R1): a shard under only the last fraction of a pixel of his box cracks too. The old column range
     (x+1 .. x+w-1) missed it, so he could stand on a lone shard's edge pixel and it never fell */
  const q=Array.from({length:14},(_,y)=>y===0||y===13?'#'.repeat(40):'#'+'.'.repeat(38)+'#').map(r=>[...r]);q[8][10]='Q';
  ROOMS.kq1=parse({id:'kq1',name:'kq1',biome:'crystals',at:[71000,70000],grid:q.map(r=>r.join('')),ents:[]});
  const S=playState('kq1',120-PW+.2,8*T-PH,{});const ev=run(S,40,I());
  ok(ev.includes('shard_crack')&&ev.includes('shard_fall')&&!E.solid(S,ROOMS.kq1,10,8)&&S.p.y>8*T-PH,'a lone shard under only the last 0.2 px of his box cracks and falls with him (crystals.js shard columns now match the collision)');
  delete ROOMS.kq1}

/* ---------------- the climb by bot ---------------- */
console.log('the climb, room by room (bot; every frame recorded)');
RK.REC.on=[];const REC=RK.REC.on;
const B=playState('hub',8*T,192-PH,{...ALL});const start=snapshot(B);
/* the bot stages (the same searches, priorities and order as before) live in tools/crystals_reach.mjs climbR1, so the chain
   test (tools/test_crystals_chain.mjs) walks the same climb on one carried state */
const C1=RK.climbR1(B,{len:()=>REC.length}),marks=C1.marks,R2={root:1,board:1};
const {ok1,sat1,ok2,ok3,ok4,ok5,demo,plateF}=C1;
ok(ok1&&sat1,`K1 Quiet Gallery: up through the plug, sits on the seat by the pool, climbs the ledges (root jumps) and jumps up into Shard Steps`);
if(demo){const {drop,undoStart,back,pick,f}=demo;
  ok(drop>=T&&drop<=5*T,`the pickup demo: the doorway's shards give way and he drops one short step (${drop.toFixed(0)} px)`);
  ok(undoStart>0&&undoStart<=180&&back===pick,`the demo holds Undo and the room runs back to exactly the pickup frame, the shards whole again (rewind starts ${undoStart} frames after the pickup, inside the 180-frame buffer)`);
  ok(demo.done&&f<300,`then control is his (${f} frames, ${sec(f)} s)`)}
ok(ok2,'K2 Shard Steps: up the shard stair, the Undo item in the vault doorway, the demo, the shard step in the vault and the launch ledge into Rewind Walk');
ok(ok3,'K3 Rewind Walk: onto W1, a root jump to the lift W2, W3, and up past the ceiling to the exit shelf into Echo Hall');
if(C1.rA){const r=C1.rA;ok(r.latched&&!r.dead&&r.n===90,`K4 solution A: on the plate (${plateF} live frames after he came in, so the buffer is full), a full 3 s rewind (${r.n} steps), the Echo replays the stand and holds the gate; he walks through and it latches ${r.f} frames after the rewind`)}
ok(ok4,'K4 Echo Hall: stair, bridge, the drop to the plate, solution A, the vault climb into Still Pool');
ok(ok5,'K5 Still Pool: the seat by the pool, ledges over the surf lane, and up into Prism Gallery (K6)');
RK.REC.on=null;
{ const ids=['k1','k2','k3','k4','k5','k6'],tt=[];for(let i=0;i<5;i++){const a=marks[ids[i]],b=marks[ids[i+1]];if(a!==undefined&&b!==undefined)tt.push(`${ids[i]} ${sec(b-a)} s`)}
  note(`bot time per room (entry to the next room's floor, perches included): ${tt.join(', ')}; total ${sec(REC.length)} s from the hub floor`)}
/* the run replays exactly from its recording (the fairness sweep below depends on it) */
{ const C=snapshot(start);const ev=RK.replayRec(C,REC);ok(ok5&&C.room==='k6'&&!ev.includes('die')&&JSON.stringify(C.p)===JSON.stringify(B.p),'the recorded run replays exactly (same end state)')}

/* ---------------- locks and leak proofs ---------------- */
console.log('locks and leaks');
const in2=(ev,S)=>S.room!=='k2'&&S.room!=='k3';
{ /* K2: the item is on every way to the exit (R2) */
  if(!QUICK){const t=tm(),S=playState('k2',37*T,216-PH,{...ALL});const r=reach(S,S=>S.room==='k3',{budget:150000,bad:(ev,S)=>ev.includes('item')||in2(ev,S),prio:toward(4,36)});
    ok(!r.found,`K2: no way to the exit that does not pass the Undo item (all items; ${r.exhausted?'exhausted':'evidence, '+r.nodes+' nodes'}) [${t()}]`)}
  const vault=ROOMS.k2;ok(span(1,9).every(y=>vault.g[y][14]==='#')&&vault.g[10][14]==='.'&&vault.g[11][14]==='.'&&span(1,13).every(x=>vault.g[12][x]==='#')&&ROOMS.k2.items[0].tx===16&&ROOMS.k2.items[0].ty===10,
    "K2's vault is closed (east wall col 14 rows 1-9, floor row 12) but for its doorway (col 14 rows 10-11); the item hangs at head height over the doorway's floor, so any box that comes in passes it");
  /* the gap only a rewind closes: on the vault floor after the shard step has fallen */
  const S=playState('k2',8*T,144-PH,{...ALL,undo:1});const sQ=S=>S.cr&&S.cr.q&&S.cr.q['9,8'];
  const g=go(S,at('k2',9.5,96,10),{budget:40000,prio:toward(9.5,96)},R2);let f=0;while(f<200){RK.play(S,[I()]);f++;if(S.p.ground&&ft(S)===144&&f>10)break}
  ok(g>0&&sQ(S)>=24&&!E.solid(S,vault,9,8)&&ft(S)===144,`K2: he stands on the vault's one shard step, it falls, he is back on the vault floor (${f} frames)`);
  if(!QUICK){const t=tm(),r=reach(noUndo(S),S=>S.room==='k3',{budget:300000,bad:in2,prio:toward(4,36)});
    ok(!r.found,`K2 without Undo: from the vault floor no route reaches the exit in this visit (all items; ${r.exhausted?'exhausted':'evidence, '+r.nodes+' nodes'}) [${t()}]`);
    const t2=tm(),r2=reach(noUndo(S),S=>S.room==='k3'||(S.p.ground&&ft(S)<=36),{budget:600000,bad:(ev,S)=>S.room!=='k2'||S.p.x>14*T,prio:toward(4,36)});
    ok(!r2.found,`K2: inside the vault (pruned at the doorway) nothing reaches the launch ledge (${r2.exhausted?'search exhausted after '+r2.nodes+' nodes':'evidence, '+r2.nodes+' nodes'}) [${t2()}]`)}
  const C=snapshot(S);let n=0;for(let i=0;i<100;i++){RK.play(C,[I({z:1,zp:i===0})]);if(C.undo.on)n++;else if(i>2)break;const q=sQ(C);if(q===undefined||q<=2)break}RK.play(C,[I()]);
  const e=go(C,S=>S.room==='k3'&&S.p.ground,{budget:60000,prio:into('k3',6,-12)},{root:1});
  ok(n>0&&E.solid(C,vault,9,8)&&e>0,`K2 with Undo: ${n} rewind steps bring the step back under him, and he climbs out (${sec(e)} s)`);
}
{ /* K3: W1 to W2 needs the root or the board */
  const W=parse({id:'kj',name:'kj',biome:'crystals',at:[70000,70000],grid:['#'.repeat(40),...Array.from({length:12},()=>'#'+'.'.repeat(38)+'#'),'#'.repeat(40)],ents:[]});ROOMS.kj=W;
  let far=0;for(let gt=4;gt<=9;gt++){const d=gt*T,g=W.g.map(r=>[...r]);for(let x=1;x<=6;x++)g[10][x]='#';const x2=7+gt;for(let x=x2;x<=x2+3;x++)g[9][x]='#';
    ROOMS.kj=parse({id:'kj',name:'kj',biome:'crystals',at:[70000,70000],grid:g.map(r=>r.join('')),ents:[]});
    const S=playState('kj',2*T,10*T-PH,{});const r=reach(S,S=>S.p.ground&&ft(S)===9*T,{budget:20000,prio:toward(x2+1,9*T)});if(r.found)far=d}
  ok(far>0&&far<96,`with no root and no board, the widest gap a running jump crosses to a ledge one row higher is ${far} px; W1's east end to W2 is 96 px`);
  delete ROOMS.kj;
  if(!QUICK)for(const it of [{claws:1},{}]){const t=tm(),S=playState('k3',2*T,216-PH,it);const r=reach(S,S=>S.room==='k4',{budget:200000,bad:(ev,S)=>S.room!=='k3'&&S.room!=='k4',prio:into('k4',33,-12)});
    ok(!r.found,`K3 with ${Object.keys(it).join(' + ')||'no item'}: no way up to the exit (${r.exhausted?'exhausted':'evidence, '+r.nodes+' nodes'}) [${t()}]`)}
  /* the board alone: a jump from W1's east end and a dash at its top lands on W2 */
  const S0=playState('k3',9*T,144-PH,{board:1});E.step(S0,I(),[]);const Wp=(S,n)=>S.ens.filter(e=>e.k==='plat')[n];let hit=null;
  const onW=n=>S=>{if(S.room!=='k3')return false;const e=Wp(S,n);return S.p.ground&&Math.abs(ft(S)-e.y)<1&&S.p.x+PW>e.x&&S.p.x<e.x+e.w};
  for(let wait=0;wait<500&&!hit;wait+=4)for(const da of [8,10,12,14]){const S=snapshot(S0);run(S,wait,I());let j=0,dd=0;
    for(let f=0;f<160;f++){const w1=Wp(S,2),edge=S.p.x+PW>=w1.x+w1.w-1;let inp=I({r:1});if(!j&&edge&&S.p.ground){inp=I({r:1,j:1,jp:1});j=f||1}else if(j&&!dd&&f-j>=da){inp=I({r:1,j:1,b:1,bp:1});dd=1}else if(j)inp=I({r:1,j:1});E.step(S,inp,[]);if(j&&f>j+3&&S.p.ground)break}
    if(onW(1)(S)){hit={wait,da};break}}
  ok(!!hit,`with the board alone: a jump off W1's east end and a dash at its top lands on W2 (after ${hit&&hit.wait} frames on W1)`);
}
{ /* K4: the gate is the only way into the vault (a tile flood fill, exact) */
  const R=ROOMS.k4,fill=open=>{const S=newState();S.lit=1;S.gate=open?1:0;const seen=new Set(['36,17']),q=[[36,17]];while(q.length){const [x,y]=q.pop();for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+a,ny=y+b;if(nx<0||ny<0||nx>=R.w||ny>=R.h||seen.has(nx+','+ny)||E.solid(S,R,nx,ny))continue;seen.add(nx+','+ny);q.push([nx,ny])}}return seen};
  const shut=fill(0),open=fill(1);ok(!shut.has('8,1')&&!shut.has('8,0')&&open.has('8,0'),'K4: with the gate shut no open tile joins the arrival to the vault or its ceiling hole; with it open they join');
  const D=snapshot(B);   /* unused end state; rebuild the plate state */
  const S=playState('k4',37*T,216-PH,{...ALL,undo:1});
  const reachPlate=S=>legs4(S);function legs4(S){for(const [x,f] of [[23.5,168],[28.5,132],[24.5,96],[22,96]])if(go(S,at('k4',x,f),{budget:20000,prio:toward(x,f),loose:1},{})<0)return false;return go(S,onPlate,{budget:20000,prio:toward(17.5,204),loose:1},{})>=0}
  ok(reachPlate(S),'K4: the bot walks in, up the stair, along the bridge and drops to the plate');
  const atP=snapshot(S),win=[];
  for(const s of [40,50,60,70,80,90,100,110]){const A=snapshot(atP);const r=solutionA(A,s,(S,i)=>{const ev=[];for(const x of i?[i]:[])ev.push(...E.step(S,x,[]));return ev});if(r.latched&&!r.dead)win.push(s)}
  ok(win.length===8,`K4 solution A works for every stand on the plate from 40 to 110 frames (latched for ${win.join(', ')})`);
  { const A=snapshot(atP);run(A,60,I());go(A,at('k4',17.6,96,5),{budget:20000,prio:toward(17.6,96),loose:1},{});let lat=false;for(let i=0;i<300;i++){E.step(A,I({l:1}),[]);if(A.latch.k4){lat=true;break}}
    ok(!lat,'K4 control: the same stand with no rewind, then the walk back up to the gate: it is shut, it never latches')}
  { const A=noUndo(atP);run(A,40,I());for(const k of ['board','claws','forged'])A.items[k]=0;A.p.dc=0;const t=tm();const r=reach(A,S=>!!(S.latch&&S.latch.k4),{budget:60000,prio:toward(16.5,96),loose:1,tb:6});
    let wrap=false;if(r.found){const C=snapshot(A);hidden(()=>{for(const i of r.inputs)if(E.step(C,i,[]).includes('echo_wrap'))wrap=true})}
    ok(r.found&&wrap,`K4 solution B (no Undo, the root only): the root burst wraps his Echo on the plate and its body holds the gate while he climbs back to it (${r.found?sec(r.frames)+' s':'NOT FOUND'}) [${t()}]`)}
  if(!QUICK)for(const it of [{},{board:1},{claws:1,board:1}]){const A=noUndo(atP);run(A,40,I());for(const k of ['root','board','claws','forged'])A.items[k]=it[k]?1:0;A.p.root=0;A.p.dc=it.board?1:0;const t=tm();
    const r=reach(A,S=>!!(S.latch&&S.latch.k4),{budget:60000,prio:toward(16.5,96),loose:1,tb:6});
    ok(!r.found,`K4 with no Undo and no root (${Object.keys(it).join(' + ')||'no item'}): the gate cannot be reached while the Echo holds the plate (evidence, ${r.nodes} nodes) [${t()}]`)}
}

/* ---------------- fairness (CL6): every room is solvable from any state one 3 s rewind reaches ---------------- */
console.log('fairness (CL6): rewind 3 s at many frames of the run, then solve again');
const rewind=S=>{let n=0;for(let i=0;i<100;i++){E.step(S,I({z:1,zp:i===0}),[]);if(S.undo.on)n++;else if(i>2)break}E.step(S,I(),[]);return n};
if((!QUICK||process.env.FAIR)&&ok5){
  /* K2 (after the demo) and K3: no Echo, so a rewound state is an earlier state of the run (the meter and inv aside): replaying
     the run's own inputs from there must reach the next room alive */
  const at0=snapshot(start);const stateAt=n=>{const C=snapshot(start);RK.replayRec(C,REC,0,n);return C};
  const demoEnd=(()=>{const C=snapshot(start);for(let n=0;n<REC.length;n++){RK.replayRec(C,REC,n,n+1);if(C.room==='k2'&&C.items.undo&&!C.undo.demo)return n+1}return -1})();
  for(const [id,a,b] of [['k2',demoEnd,marks.k3],['k3',marks.k3,marks.k4]]){const bad=[];let tried=0;
    for(let f=a+10;f<b;f+=id==='k2'?6:15){const C=stateAt(f);if(C.room!==id)continue;tried++;
      /* hold Undo for n steps, short of the buffer's start, so the next frame is a live one with the run's own input */
      U.undoFill(C);   /* one full 3 s rewind's meter (anchored: it changes nothing rewound) */
      const n=Math.min(89,Math.floor((C.undo.buf.length-2)/2));let on=0;for(let i=0;i<n;i++){E.step(C,I({z:1,zp:i===0}),[]);if(C.undo.on)on++}const back=f-2*n;if(on!==n){bad.push((f-a)+':rewind');continue}
      /* from the rewound state, the recorded inputs from frame `back` on */
      const ev=RK.replayRec(C,REC,back,b+30);if(ev.includes('die')||C.p.dead||ORDER.indexOf(C.room)<=ORDER.indexOf(id))bad.push(f-a)}
    ok(tried>5&&!bad.length,`${id}: rewound (up to 3 s) at ${tried} points of the run, the run's own inputs from the rewound frame still reach the next room alive${bad.length?' (fails at '+bad.join(',')+')':''}`)}
  /* K4: the Echo is anchored, so a rewind leaves it somewhere new. The bar (Fixer A, 2026-11-07; tools/crystals_reach.mjs
     escapeClass): from the exact rewound state he must reach K5, or leave the room (through the floor hole or the hatch
     under the plate into K3: the room resets when he comes back, and the meter refills on the way), or die (a respawn at
     the last torch, never a soft lock). Only "stuck alive" fails. Each point tries, in order: the run's own inputs from the
     rewound frame, a search to K5, a search out of the room, a search to a death; all on an Undo-free clone */
  const F4=new Set();for(let f=marks.k4+30;f<marks.k5;f+=30)F4.add(f);for(const d of [930,960])if(marks.k4+d<marks.k5)F4.add(marks.k4+d);
  const leave4=S=>S.room!=='k4'?-1e6:Math.min(toward(33.5,19*T)(S),toward(19.5,19*T)(S));
  const res4=[],t4=tm();
  for(const f of [...F4].sort((a,b)=>a-b)){const C=stateAt(f);if(C.room!=='k4')continue;
    const L0=C.undo.buf.length;rewind(C);const back=f-(L0-C.undo.buf.length)-2,R0=snapshot(C);   /* -2: rewind() ends on two live frames (the hold's last, an idle one) */
    const r=RK.escapeClass(R0,{id:'k4',next:'k5',routePrio:into('k5',6,-12),leavePrio:leave4,replay:C=>RK.replayRec(C,REC,Math.max(0,back),marks.k5+30)});
    res4.push({d:f-marks.k4,r,where:`${(R0.p.x/T).toFixed(1)},${(ft(R0)/T).toFixed(1)}${R0.latch.k4?' latched':''}`})}
  const cls4=k=>res4.filter(x=>x.r.cls===k).length;
  for(const {d,r,where} of res4)note(`k4 +${d} (at ${where}): ${r.cls}${r.how?' by '+r.how:''}${r.to?' to '+r.to:''}${r.frames!==undefined?' in '+sec(r.frames)+' s':''}${r.nodes?' ('+r.nodes+' nodes)':''}${r.tries.length?' ['+r.tries.join('; ')+']':''}`);
  ok(res4.length>=8&&!cls4('stuck'),`k4: rewound at ${res4.length} points of the run (every 30 frames in the room, with +930 and +960), the Echo replaying wherever it was: from each exact rewound state he reaches K5 (${cls4('route')}), leaves the room alive (${cls4('leave')}) or only dies (${cls4('dies')}); stuck alive at ${cls4('stuck')}${cls4('stuck')?': +'+res4.filter(x=>x.r.cls==='stuck').map(x=>x.d).join(' +'):''} [${t4()}]`);
  /* after the room's own things have fallen (K2's shards gone for this visit): out through the hatch or the arrival, and back */
  const S=playState('k2',8*T,144-PH,{...ALL,undo:1});go(S,at('k2',9.5,96,10),{budget:40000,prio:toward(9.5,96)},R2);run(S,300,I());
  const back=go(S,S=>S.room==='k1',{budget:60000,prio:S=>S.room==='k1'?-1e6:-S.p.y+Math.abs(S.p.x-20*T)},R2)>=0&&go(S,S=>S.room==='k2'&&S.p.ground,{budget:150000,prio:into('k2',33,-12)},R2)>=0;
  const fresh=back&&!(S.cr.q&&S.cr.q['9,8'])&&E.solid(S,ROOMS.k2,9,8);
  ok(fresh&&go(S,S=>S.room==='k3'&&S.p.ground,{budget:150000,prio:into('k3',6,-12)},R2)>=0,'K2 with the vault step gone and no rewind left: down through the hatch into K1, back up, and the room is whole again; he climbs out');
}

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails?1:0);
