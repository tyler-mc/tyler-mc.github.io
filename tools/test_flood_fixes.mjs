// Flood fixes (agent A, 2026-11-06): the dash buffer without the board, the board key at a perch, landing() and soft
// enemies, liquid under an out board as ground, currents that cannot skip a wall, the board keys, the board's pickup demo,
// and the hermit crab's tease. Own test rooms only (f1/f2 are being reshaped). Plain node, no deps: node tools/test_flood_fixes.mjs
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const G=new URL('../game/',import.meta.url).href;
const {T,newState,snapshot,restore,save,load,resume,PERCH}=await import(G+'state.js');
const E=await import(G+'engine.js');
const {ROOMS,parse}=await import(G+'rooms/index.js');
const P=await import(G+'player.js');
const B=await import(G+'board.js');
const F=await import(G+'fish.js');
const FMT=await import(G+'dev/roomfmt.js');
let fails=0,passes=0;
const ok=(c,msg)=>{if(c){passes++;console.log('  ok  ',msg)}else{fails++;console.log('  FAIL',msg)}};
const I=(o={})=>({l:0,r:0,u:0,d:0,j:0,jp:0,b:0,bp:0,drag:null,any:0,...o});
const PH=P.PH,PW=P.PW;
function playState(room,x,y,items={}){const S=newState();Object.assign(S,{lit:1,litT:60,match:1,mode:'play'});Object.assign(S.items,items);E.enterRoom(S,room,{x,y});if(items.root)S.p.root=1;if(items.board)S.p.dc=1;return S}
const run=(S,n,f)=>{const evs=[];for(let i=0;i<n;i++)evs.push(...E.step(S,typeof f==='function'?f(i,S):f,[]));return evs};
const mem=()=>({d:{},getItem(k){return this.d[k]??null},setItem(k,v){this.d[k]=String(v)},removeItem(k){delete this.d[k]}});
const W=46,FLOOR=12*T;
/* rows: 0 rock, 1..11 air (walled), 12.. floor; set(x,y,c) edits a cell */
function grid(h=16){const g=[[...'#'.repeat(W)],...Array.from({length:11},()=>[...('#'+'.'.repeat(W-2)+'#')]),...Array.from({length:h-12},()=>[...'#'.repeat(W)])];
  return {g,set(x,y,c){g[y][x]=c;return this},rows(){return g.map(r=>r.join(''))}}}
const room=(id,at,gr,ents=[])=>{ROOMS[id]=parse({id,name:id,biome:'flood',at,grid:gr.rows(),ents});return ROOMS[id]};
/* a pool: deep water x 6..34 rows 12..15, flush with the floor (as test_flood's tpool) */
{const q=grid(18);for(let y=12;y<16;y++)for(let x=6;x<35;x++)q.set(x,y,'~');q.set(2,10,'T');room('xpool',[6000,6000],q)}
/* a current room: water x 6..40 rows 12..15, a one-tile wall at x 20 from row 8 down through the water */
{const q=grid(18);for(let y=12;y<16;y++)for(let x=6;x<41;x++)q.set(x,y,'~');for(let y=8;y<16;y++)q.set(20,y,'#');q.set(2,10,'T');room('xwall',[6100,6000],q)}
/* a perch at 10,11 */
{const q=grid();q.set(10,11,'B').set(3,11,'T');room('xperch',[6200,6000],q)}
/* the board on the floor at 22,11, open both ways */
{const q=grid();q.set(22,11,'I').set(3,11,'T');room('xitem',[6300,6000],q,[{at:[22,11],item:'board'}])}
/* a teasing crab at 20,11 (fence 15..25), a plate at 26,11 and a gate at 40, rows 9..11; and the same crab without tease */
const crabRoom=(id,at,ent)=>{const q=grid();q.set(20,11,'H').set(26,11,'P').set(3,11,'T');for(let y=9;y<12;y++)q.set(40,y,'G');return room(id,at,q,[{at:[20,11],left:15,right:25,...ent}])};
crabRoom('xtease',[6400,6000],{tease:1});crabRoom('xcrab',[6500,6000],{});
/* a Mossback on the floor at 20,11 (the control for landing()) */
{const q=grid();q.set(20,11,'M').set(3,11,'T');room('xmoss',[6600,6000],q,[{at:[20,11],left:20,right:20,top:11,bottom:11}])}

console.log('1. a dash pressed in hit-stop without the board is not kept');
{ const S=playState('xpool',2*T,FLOOR-PH);run(S,5,I());S.hit=3;E.step(S,I({bp:1,b:1}),[]);run(S,30,I());
  ok(S.p.db===0,`no board: the dash buffer is clear after hit-stop (db ${S.p.db})`);
  S.items.board=1;S.p.dc=1;const ev=run(S,8,I());ok(!ev.includes('dash'),'picking up the board later does not fire a stale dash');
}

console.log('2. the board key stands him up from a perch');
{ const sitDown=()=>{const S=playState('xperch',10*T+6-PW/2,FLOOR-PH);run(S,PERCH.wait+30,I());return S};
  const S=sitDown();ok(S.sit>0,`standing still on the perch he sits (${S.sit} frames)`);
  const e1=E.step(S,I({bp:1,b:1}),[]);ok(S.sit===0&&e1.includes('stand'),'pressing the board key (no board) stands him up');
  const H=sitDown();const e2=E.step(H,I({b:1}),[]);ok(H.sit===0&&e2.includes('stand'),'holding it does too');
  const Bd=sitDown();Bd.items.board=1;Bd.p.dc=1;const e3=E.step(Bd,I({bp:1,b:1}),[]);ok(Bd.sit===0&&e3.includes('stand')&&e3.includes('dash'),'with the board: he stands and dashes');
}

console.log('3a. landing(): soft enemies below do not spend the root');
{ const fall=(id,setup)=>{const S=playState(id,20*T-2,FLOOR-PH-12,{root:1});setup&&setup(S);S.p.vy=2;S.p.ground=0;const ev=E.step(S,I({j:1,jp:1}),[]);return {S,ev}};
  const c=fall('xcrab',S=>{const e=S.ens[0];e.x=S.p.x+2;e.dir=1;e.fence=[19,21]});
  ok(!c.ev.includes('root')&&c.S.p.root===1&&c.S.p.buf>0,'falling onto a crab with the ground 5 frames away: the press is buffered, the root kept');
  const m=fall('xmoss');
  ok(m.ev.includes('root')&&m.S.p.root===0,'a Mossback below still gets the root burst (a live enemy in its reach)');
  const f=playState('xpool',4*T,FLOOR-PH-12,{root:1});f.ens=[F.spawnFlood(ROOMS.xpool,{k:'C',tx:20,ty:12,left:8,right:32})];f.ens[0].x=f.p.x+3;f.ens[0].y=f.p.y+PH+2;f.p.vy=2;const ef=E.step(f,I({j:1,jp:1}),[]);
  ok(!ef.includes('root')&&f.p.root===1,'a clownfish in reach below does not either');
}

console.log('3b. liquid under an out board is ground: a jump pressed just before it lands is buffered');
{ const mk=()=>{const S=playState('xpool',20*T,FLOOR-PH-40,{root:1,board:1});S.p.bo=1;S.p.dc=0;S.p.root=1;S.p.vy=0;S.p.vx=2;S.p.ground=0;return S},R1=I({r:1});
  const C=mk();let L=-1;for(let i=1;i<200;i++){if(E.step(C,R1,[]).includes('surf')){L=i;break}}
  ok(L>6,`holding right, the board lands on the water on frame ${L}`);
  for(const k of [1,2,3,4,5,6]){const S=mk();run(S,L-k-1,R1);const ev=run(S,k+4,i=>I({r:1,j:1,jp:i===0?1:0}));
    ok(!ev.includes('root')&&ev.includes('surf')&&ev.includes('jump')&&S.p.root===1&&!S.p.surf&&S.p.vy<0,`pressed ${k} frame${k>1?'s':''} before: he jumps off the board as it lands, root kept`)}
  { const S=mk();run(S,L-13,R1);const ev=run(S,2,i=>I({r:1,j:1,jp:i===0?1:0}));ok(ev.includes('root'),'pressed 12 frames before: still the root (a mid-air save)')}
  { const S=mk();run(S,L+5,R1);ok(S.p.surf&&S.p.buf===0,'no press: he surfs, nothing buffered')}
  // a jump pressed during a dash onto the water fires as the dash ends on it, not later on the bank
  { const S=playState('xpool',3*T,FLOOR-PH,{board:1});run(S,5,I());const ev=[];let jf=-1,sf=-1;
    for(let i=0;i<40;i++){const e=E.step(S,I({r:1,j:i>=9?1:0,bp:i===6?1:0,jp:i===9?1:0}),[]);ev.push(...e);if(e.includes('surf')&&sf<0)sf=i;if(e.includes('jump')&&jf<0)jf=i}
    ok(sf>0&&jf===sf,`a jump pressed during the dash fires as the board meets the water (surf ${sf}, jump ${jf})`)}
}

console.log('4. a current never carries him through a wall');
{ const mk=x=>{const S=playState('xwall',x,9*T);run(S,200,I());return S};
  const S=mk(23*T);ok(!S.p.ground&&S.p.x>21*T,`floating east of the wall (x ${(S.p.x/T).toFixed(1)} tiles)`);
  for(const f of [-10,-40]){const C=snapshot(S);for(const k in C.liq.flow)C.liq.flow[k]=f;for(let y=12;y<16;y++)for(let x=6;x<41;x++)if(x!==20)C.liq.flow[y*W+x]=f;
    let minX=1e9;for(let i=0;i<120;i++){E.step(C,I(),[]);minX=Math.min(minX,C.p.x)}
    ok(minX>=21*T-.01,`a current of ${f} px/frame pins him against the one-tile wall (min x ${minX.toFixed(1)}, wall's east face ${21*T})`)}
  const O=snapshot(S);O.p.x=30*T;for(let y=12;y<16;y++)for(let x=6;x<41;x++)if(x!==20)O.liq.flow[y*W+x]=-10;const x0=O.p.x;E.step(O,I(),[]);
  ok(O.p.x-x0<-9,`in open water a 10 px/frame current still moves him its full push (${(O.p.x-x0).toFixed(1)} px in a frame)`);
}

console.log('6. board keys');
{ ok(['ShiftLeft','ShiftRight','KeyX','KeyK'].every(c=>E.keyOf(c)==='b'),'Shift, X and K all press the board');
  ok(E.keyOf('Space')==='j'&&E.keyOf('KeyA')==='l'&&E.keyOf('KeyL')===undefined&&E.keyOf('KeyM')===undefined,'the other keys are unchanged; L and M stay free (Undo, map)');
}

console.log('7. the board shows itself on pickup');
{ const pick=(dir,during=I())=>{const x=dir>0?19*T:25*T;const S=playState('xitem',x,FLOOR-PH,{root:1});run(S,3,I());
    let n=0;while(!S.items.board&&n<200){E.step(S,I(dir>0?{r:1}:{l:1}),[]);n++}return S};
  for(const dir of [1,-1]){const S=pick(dir);const x0=S.p.x;
    ok(S.items.board&&S.p.bd>0&&S.p.dc===1,`picked up walking ${dir>0?'right':'left'}: the demo starts`);
    const ev=[];let back=-1,dash=-1,dd=0;for(let i=0;i<200;i++){const e=E.step(S,I(dir>0?{l:1,jp:i%7===0?1:0,j:1}:{r:1,bp:i%5===0?1:0,b:1}),[]);ev.push(...e);if(e.includes('dash')&&dash<0){dash=i;dd=S.p.dd}if(!S.p.bd){back=i;break}}
    ok(dash>=0&&dd===dir&&Math.sign(S.p.x-x0)===dir&&Math.abs(S.p.x-x0)>=B.DASH.n*B.DASH.v-2,`he dashes on his own the way he faces (${(S.p.x-x0).toFixed(0)} px), whatever is pressed`);
    ok(ev.filter(e=>e==='dash').length===1&&!ev.includes('jump')&&!ev.includes('root'),'one dash, no jumps: the input is ignored during it');
    ok(back>0&&back<B.BDEMO.beat+B.BDEMO.end+B.DASH.n+4&&S.p.ground&&S.p.db===0&&S.p.dc===1,`control comes back on the ground after ${back} frames, nothing buffered, the dash recharged`);
    const e2=run(S,4,i=>I({bp:i===0?1:0,b:i===0?1:0}));ok(e2.includes('dash'),'then the key dashes as usual');
  }
  { const S=pick(1);run(S,B.BDEMO.beat-6,I());ok(S.p.bd>0&&S.p.bd<B.BDEMO.beat,'mid-demo (still the beat)');
    const snap=snapshot(S),A=snapshot(S);for(let i=0;i<120;i++)E.step(A,I({l:i%3===0}),[]);const S2=newState();restore(S2,JSON.parse(JSON.stringify(snap)));for(let i=0;i<120;i++)E.step(S2,I({l:i%3===0}),[]);
    ok(JSON.stringify(A)===JSON.stringify(S2),'a JSON round-trip mid-demo replays the same');
    const D=snapshot(snap);restore(S,D);S.cp={room:'xitem',tx:3,ty:11};S.p.dead=1;const er=run(S,90,I());
    ok(er.includes('rez')&&!er.includes('dash')&&S.p.bd===0&&S.p.bo===0,'a death mid-demo: he comes back without it, no dash');
    const m=mem();save(snap,m);const R2=resume(newState(),load(m));ok(R2.items.board===1&&R2.p.bd===0,'a reload never replays it (the save keeps the board, not the demo)');
    E.enterRoom(R2,'xitem',{x:10*T,y:FLOOR-PH});ok(!run(R2,90,I()).includes('dash'),'...and nothing dashes after it');
  }
  { const S=playState('xpool',20*T,FLOOR-PH-40,{board:1});run(S,200,I());S.p.bd=1;const ev=run(S,300,I());
    ok(S.p.bd===0&&S.p.db===0&&!ev.includes('dash'),'picked up while swimming (no dash in water): it gives up, no stuck state, nothing buffered');
    const H=pick(1);run(H,3,I());H.hit=4;run(H,200,I());ok(H.p.bd===0,'hit-stop in the middle does not hang it');
  }
  { const S=playState('xitem',25*T,FLOOR-PH);S.p.face=-1;run(S,3,I());S.p.bd=1;S.items.board=1;S.p.dc=1;S.p.x=4*T;run(S,200,I());
    ok(S.p.bd===0&&S.p.ground,'against a wall (the dash cut short) it still ends')}
}

console.log('8. the hermit crab teases once');
{ const drop=(id,dx,items={})=>{const S=playState(id,20*T+dx,FLOOR-PH-40,items);const c=S.ens[0];return {S,c}};
  const landed=S=>{for(let i=0;i<120;i++){const e=E.step(S,I(),[]);if(S.p.ground)return e}return null};
  { const {S,c}=drop('xtease',60);ok(c.k==='crab'&&c.tz===1,'a crab with tease:1 waits');
    const e=landed(S);const ev=[...e,...run(S,2,I())];ok(c.wrap>0&&c.tz===2&&ev.includes('shell')&&S.hit===0,'he lands 60 px from it: it pulls into its shell (a clack, no hit-stop)');
    const x0=c.x;run(S,60,I({l:1}));ok(Math.abs(c.x-x0)<.01&&S.p.x>=c.x+c.w-.5,`its shell is a solid block (he walks into it and stops; it does not move: ${(c.x-x0).toFixed(2)} px)`);
    const mid=snapshot(S),A=snapshot(S),Bm=newState();restore(Bm,JSON.parse(JSON.stringify(mid)));run(A,400,I({r:1}));run(Bm,400,I({r:1}));
    ok(JSON.stringify(A)===JSON.stringify(Bm),'snapshot and JSON restore mid-tease replay the same');
    let n=0,em=[];while(c.wrap>0&&n<400){em.push(...E.step(S,I(),[]));n++}em.push(...run(S,30,I()));
    ok(em.includes('emerge')&&c.tz===0&&!c.wrap&&n+62>=F.CRAB.shell-2,`it climbs back out after the usual ${(F.CRAB.shell/60).toFixed(0)} s`);
    S.p.x=c.x+40;S.p.y=FLOOR-PH-40;S.p.vy=0;S.p.ground=0;landed(S);run(S,3,I());ok(!c.wrap&&c.tz===0,'he lands near it again: no second tease this visit');
    E.enterRoom(S,'xtease',{x:20*T+60,y:FLOOR-PH-40});const c2=S.ens[0];landed(S);run(S,2,I());ok(c2.wrap>0,'re-entering the room, it teases again');
  }
  { const {S,c}=drop('xtease',150);landed(S);run(S,3,I());ok(!c.wrap&&c.tz===1,'landing 150 px away: nothing (the reach is ~120 px)')}
  { const S=playState('xtease',20*T+60,FLOOR-PH);const c=S.ens[0];run(S,60,I());ok(!c.wrap,'walking in on the ground is no landing: nothing')}
  { const {S,c}=drop('xtease',60,{board:1});landed(S);run(S,3,I());ok(!c.wrap&&c.tz===1,'with the board in hand it never teases (he rams it instead)')}
  { const {S,c}=drop('xcrab',60);landed(S);run(S,3,I());ok(!c.wrap&&!c.tz,'a crab without tease ignores his landing')}
  { const {S,c}=drop('xtease',-30);c.x=26*T-1;c.fence=[25,27];landed(S);run(S,30,I());ok(c.wrap>0&&S.plate===0&&S.gate<.5,'a teased shell on the plate does not hold it (no gate without the board)')}
  { const r={id:'xtease',name:'Tease',biome:'flood',at:[0,0],grid:['#####','#.H.#','#####'],ents:[{at:[2,1],tease:1}]};
    ok(FMT.check(r)==='','the editor format check accepts tease:1');
    let py='';try{py=execFileSync('python3',['-I','-c',`import sys,json;sys.path.insert(0,${JSON.stringify(new URL('.',import.meta.url).pathname)});import dev_server as d;print(json.dumps(d.clean(json.loads(sys.stdin.read()),'x')['ents']))`],{input:JSON.stringify(r),encoding:'utf8'}).trim()}catch(e){py='ERR '+String(e.stderr||e.message).slice(0,200)}
    ok(py==='[{"at": [2, 1], "tease": 1}]',`the dev server's validator accepts it (${py})`);
    ok(/\['tease',1,/.test(readFileSync(new URL('../game/editor.js',import.meta.url),'utf8')),'the editor lists tease among the crab fields');
  }
}

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails?1:0);
