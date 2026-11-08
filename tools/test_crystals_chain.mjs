// The Crystals tower in one carried run (Fixer A, 2026-11-07): one state, from the hub floor with the three earlier fragments
// placed and set (placed and pieces [1,1,1,0]) and the four earlier items (root, board, claws, forged), bot-walked
// hub -> K1 -> ... -> K10 and the fragment, on the real step. Nothing is re-seeded at a room boundary: every seam is the
// engine's own transition. The legs are the suites' own bots (tools/crystals_reach.mjs: climbR1 is R1's climb from
// test_crystals_rooms.mjs; k6Bot .. k10Frag are R2's legs from test_crystals_rooms2.mjs). R2 bots K8 as separate visits
// (each from a re-seeded torch); here it is carried: segment A (locks 3 and 1), out through the floor hole into K7 and
// straight back up (the engine's seams; see the K8 note below), the pit again, the Undo lock (lock 4), the moat (lock 2),
// back across it and up the shaft, out through the vault door.
// Plain node, no deps: node --max-old-space-size=8000 tools/test_crystals_chain.mjs
const G=new URL('../game/',import.meta.url).href;
const {T,PIECES}=await import(G+'state.js');
const {ROOMS}=await import(G+'rooms/index.js');
const RK=await import('./crystals_reach.mjs');
const FS=await import('node:fs');
const {ft,k8,PH,PW}=RK;
let fails=0,passes=0;
const ok=(c,msg)=>{if(c){passes++;console.log('  ok  ',msg)}else{fails++;console.log('  FAIL',msg)}};
const note=msg=>console.log('  ..  ',msg);
const sec=n=>(n/60).toFixed(1),CK=PIECES.indexOf('crystals');
const ALL={root:1,board:1,claws:1,forged:1};
const t0=Date.now(),wall=()=>((Date.now()-t0)/1000).toFixed(0)+' s';
const pos=S=>`${S.room} ${(S.p.x/T).toFixed(1)},${(ft(S)/T).toFixed(1)}`;

const S=RK.playState('hub',8*T,192-PH,{...ALL});S.pieces=[1,1,1,0];
/* every frame played on S (both bots call REC.tick after each real step): frames per room, seams, deaths */
const per={},seams=[],deaths=[];let total=0,last=S.room;
RK.REC.tick=(St,ev)=>{if(St!==S)return;total++;per[St.room]=(per[St.room]||0)+1;if(ev.includes('die'))deaths.push(`${pos(St)} (${St.flash}) frame ${total}`);
  if(St.room!==last){seams.push(`${last}>${St.room}@${total}`);last=St.room}};

console.log('the climb: hub to K6 (R1\'s bot, climbR1)');
const C1=RK.climbR1(S,{len:()=>total});
ok(C1.ok1&&C1.sat1,'hub up through the plug into K1, the seat, K1 into K2');
ok(C1.ok2&&C1.demo&&C1.demo.ok,`K2: the Undo item, its demo, into K3 (Undo owned: ${!!S.items.undo})`);
ok(C1.ok3,'K3: the platforms into K4');
ok(C1.ok4&&C1.rA&&C1.rA.latched,'K4: the plate, solution A, the vault into K5');
ok(C1.ok5&&S.room==='k6'&&S.p.ground,`K5: the seat, the ledges, into K6 (standing in ${pos(S)})`);

console.log('the join: R2\'s bots from where R1\'s climb left him in K6');
const B=RK.Bot(S);
/* DUMP=path: on a stop, the carried state is written there (a repro: JSON.parse it and go on with the legs) */
const step=(name,fn)=>{if(!B.ok)return false;const before=process.env.DUMP?JSON.stringify(S):null;const r=fn();if(!B.ok||r===false){note(`stopped at ${name}: ${B.log.join('; ')||'its check failed'} (${pos(S)}, frame ${total})`);
  if(before){const fs=require_fs();fs.writeFileSync(process.env.DUMP,before);note(`the state before ${name} written to ${process.env.DUMP}`)}return false}return true};
function require_fs(){return FS}
let go6=C1.ok5&&step('k6',()=>RK.k6Bot(B));
ok(go6&&S.room==='k7',`K6: up, across the drifter's beam, the exit shelf, into K7 (${pos(S)})`);
let tr7=null,go7=go6&&step('k7',()=>{const r=RK.k7Bot(B);tr7=r.tr;return r.tr.latched&&r.tr.gone&&r.tr.steps>0});
ok(go7&&S.room==='k8',`K7: two claw climbs, the shard bridge, the springboard trick (rewind ${tr7?tr7.steps:'-'} steps), the chamber, into K8 (${pos(S)})`);
/* K8, carried. Segment A as R2 bots it, but its legs may ram or wrap the Echo here (it follows him up from the arrival, and the
   drill's climb wraps it: the replay then runs 360 frames behind him, not 120, and the Undo lock's timing fails). So he
   then goes back east over the pit, drops into K7 and jumps straight back up (the engine's own seams: the room resets, a
   fresh Echo, runes 1 and 3 stay latched), crosses the pit again with no ram or wrap (the Echo stays 120 frames behind),
   does the Undo lock (rune 4), the moat (rune 2: the fourth rune opens the vault door), back across the moat, up the shaft */
const leaveDown=S=>{if(S.room!=='k8')return -1e6;const x=S.p.x+PW/2,f=ft(S);if(x>=28*T&&f<=10.5*T)return 2000+Math.max(0,37*T-x);return (19*T-f)+Math.abs(x-(f>=13.5*T?33.5:37.5)*T)*.5};
let go8=go7&&step('k8 A',()=>RK.k8A(B,{ram:1})&&S.latch['k8:R:38,4']&&S.latch['k8:R:14,1']);
ok(go8,`K8 segment A: the cracked corner (rune 3) and the pit (rune 1) (${pos(S)}; the Echo ${S.echo.on?S.echo.log.length/3-S.echo.i:'-'} frames behind)`);
go8=go8&&step('k8 out and back',()=>{
  B.leg('back east',k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x>27.5*T),{prio:S=>-S.p.x,budget:150000,ram:1});
  B.leg('down into k7',S=>S.room==='k7',{prio:leaveDown,ram:1,coarse:1,loose:1});   /* the full key starves here (the Echo's index) */
  B.leg('up into k8',S=>S.room==='k8'&&S.p.ground,{prio:RK.wyp});return B.ok&&S.latch['k8:R:38,4']&&S.latch['k8:R:14,1']});
ok(go8,`K8: back east over the pit, down the floor hole into K7 and straight back up; runes 1 and 3 still lit (${pos(S)})`);
go8=go8&&step('k8 pit again',()=>{
  B.leg('up',k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x>28*T),{prio:S=>S.p.y});
  B.leg('takeoff',k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x<30*T&&S.p.x>27.5*T),{prio:S=>Math.abs(S.p.x-29*T)+Math.abs(S.p.y-7*T)});
  B.leg('pit',k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x<14*T),{prio:S=>S.p.x,budget:150000});
  B.leg('to gate front',k8(S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x>=9.5*T&&S.p.x<12.5*T),{prio:S=>Math.abs(S.p.x-11*T)+Math.abs(S.p.y-7*T),budget:150000,ram:1});return B.ok});
ok(go8,`K8: up the hall and over the pit again, no ram or wrap (the Echo ${S.echo.on?S.echo.log.length/3-S.echo.i:'-'} frames behind), to the gate's front (${pos(S)})`);
let r4=null;go8=go8&&step('k8 trick',()=>{r4=RK.k8trick(B);return r4.gate&&r4.r4});
ok(go8,`K8 the Undo lock (rune 4): history ${r4?r4.hist:'-'} at the plate, rewind ${r4?r4.steps:'-'} steps, the gate open after ${r4?r4.wait:'-'} frames, its rune lit (${pos(S)})`);
go8=go8&&step('k8 moat',()=>RK.k8Moat(B,{ram:1})&&S.latch['k8:R:29,12']);
ok(go8&&S.latch['k8:D:v'],`K8 the moat: over the closet roof, down the shaft, surf to the far bank, its switch (rune 2, the fourth: the vault door latches) (${pos(S)})`);
go8=go8&&step('k8 back',()=>{
  B.leg('back across the moat',k8(S=>S.p.ground&&ft(S)>=16*T-.1&&S.p.x<12*T),{prio:S=>S.p.x+Math.abs(S.p.y-14*T)*.2,ram:1,budget:150000});
  B.leg('shaft foot',k8(S=>S.p.ground&&ft(S)>=16*T-.1&&S.p.x<4*T),{prio:S=>S.p.x,ram:1});
  B.leg('up the shaft',k8(S=>S.p.ground&&ft(S)<=5*T+.1&&S.p.x<10*T&&S.p.x>4*T),{prio:S=>S.p.y+Math.abs(S.p.x-2*T)*.2,budget:150000,ram:1});   /* the Echo in the search (noEcho's plan dies on the col-4 thorns when replayed) */
  return B.ok});
ok(go8,`K8: back west across the moat and up the shaft onto the closet roof (${pos(S)})`);
go8=go8&&step('k8 out',()=>RK.k8Out(B,{ram:1}));
ok(go8&&S.room==='k9',`K8: over the closet roof, out through the vault door into K9 (${pos(S)})`);
let sat9=false,go9=go8&&step('k9',()=>{sat9=RK.k9Bot(B).sat;return B.ok});
ok(go9&&sat9&&S.room==='k10',`K9: the seat (the hush), up into K10 (${pos(S)})`);
const go10=go9&&step('k10',()=>RK.k10Frag(B,CK));
ok(go10&&S.pieces[CK]===1,`K10: walks into the Crystals fragment and lifts it (${pos(S)})`);
RK.REC.tick=null;

console.log('the run');
ok(!deaths.length,`no death on the way${deaths.length?': '+deaths.join('; '):''}`);
const ROUTE=['hub','k1','k2','k3','k4','k5','k6','k7','k8','k9','k10'];
/* the rooms in the order he first entered them (a jump back across a seam, as at the plug or K3/K4, is the engine's own too) */
const first=[ROUTE[0]];for(const sm of seams){const id=sm.split('>')[1].split('@')[0];if(!first.includes(id))first.push(id)}
ok(first.join(',')===ROUTE.join(','),`one carried state, every seam the engine's own (no re-seeding), rooms first entered in tower order: ${seams.join(' ')}`);
note(`bot time per room: ${ROUTE.filter(id=>per[id]).map(id=>`${id} ${sec(per[id])} s`).join(', ')}; total ${sec(total)} s [${wall()} wall]`);
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails?1:0);
