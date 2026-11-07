// Molten engine (agent E, 2026-11-06): lava, the plain board's burn-and-save jump, the heat-forged board, cracked walls (X)
// and the vine claws (cling, vines, flowers, wall jump, drill). Synthetic rooms only, so it does not depend on the Molten
// room files. The claws-aware reachability search lives in tools/molten_reach.mjs (importable by the rooms stage).
// Plain node, no deps: node tools/test_molten_engine.mjs
const G=new URL('../game/',import.meta.url).href;
const {T,VER,newState,snapshot,restore,persist,save,load,resume,items}=await import(G+'state.js');
const E=await import(G+'engine.js');
const {ROOMS,parse}=await import(G+'rooms/index.js');
const P=await import(G+'player.js');
const B=await import(G+'board.js');
const C=await import(G+'claws.js');
const L=await import(G+'liquid.js');
const FMT=await import(G+'dev/roomfmt.js');
const {reach,replay,I,playState}=await import('./molten_reach.mjs');
let fails=0,passes=0;
const ok=(c,msg)=>{if(c){passes++;console.log('  ok  ',msg)}else{fails++;console.log('  FAIL',msg)}};
const run=(S,n,f)=>{const evs=[];for(let i=0;i<n;i++)evs.push(...E.step(S,typeof f==='function'?f(i,S):f,[]));return evs};
const mem=()=>({d:{},getItem(k){return this.d[k]??null},setItem(k,v){this.d[k]=String(v)},removeItem(k){delete this.d[k]}});
const {PW,PH,JV}=P;
const f1=v=>v.toFixed(1),tl=v=>(v/T).toFixed(2);

/* ---------- synthetic rooms: W x H, rock border, floor two rows thick; at() far from the real map ---------- */
let AT=0;
function box(W,H){const g=Array.from({length:H},(_,y)=>[...(y===0||y>=H-2?'#'.repeat(W):'#'+'.'.repeat(W-2)+'#')]);
  return {g,W,H,set(x,y,c){g[y][x]=c;return this},fill(x0,y0,x1,y1,c){for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)g[y][x]=c;return this},rows(){return g.map(r=>r.join(''))}}}
const room=(id,b,ents=[])=>{ROOMS[id]=parse({id,name:id,biome:'molten',at:[20000+(AT++)*200,20000],grid:b.rows(),ents});return ROOMS[id]};
const src=(id,b,ents=[])=>({id,name:id,biome:'molten',at:[20000+(AT++)*200,20000],grid:b.rows(),ents});
const FLOOR=H=>(H-2)*T;

/* a lava room: floor at row 14 (y 168), a lava pool x 10..(10+w-1) rows 14..15 inset in it, torch at 3,13 */
const LF=14*T;   /* the lava rooms' floor */
function lavaRoom(id,w,{water=0,ch='L'}={}){const b=box(40,18);b.fill(1,14,38,15,'#');b.fill(10,14,10+w-1,15,ch);if(water)b.fill(10-water,14,9,15,'~');b.set(3,13,'T');return room(id,b)}

console.log('1. cracked rock (X) is solid everywhere');
{ const b=box(30,16);b.fill(15,1,15,13,'X');b.set(3,13,'T');const R=room('xsolid',b);
  const S=playState('xsolid',10*T,FLOOR(16)-PH,{});run(S,240,I({r:1}));
  ok(S.p.x+PW<=15*T+.01&&S.p.x+PW>15*T-2,`walking into a cracked wall stops him at its face (x+w ${f1(S.p.x+PW)}, face ${15*T})`);
  ok(E.solid(S,R,15,8)&&!E.solid(S,R,14,8),'engine solid(): X is solid, air is not');
  S.drilled=[[15,8]];ok(!E.solid(S,R,15,8)&&E.solid(S,R,15,9),'a drilled X is open; its neighbour still solid');
  S.drilled=[];
  // the hardC copy in player.js (banks for a swimmer) and spikeRect: a thorn on X faces away from it
  const fs=await import('node:fs'),rd=n=>fs.readFileSync(new URL(n,G),'utf8');
  ok(/hardC=c=>[^\n]*c==='X'/.test(rd('player.js')),'player.js hardC lists X');
  ok(/c==='X'&&\(out\|\|!isDrilled/.test(rd('engine.js'))&&/return c===null\|\|c==='#'\|\|c==='='\|\|c==='X'\}/.test(rd('engine.js')),'engine.js solid() and spikeRect() list X');
  ok(/c==='G'\|\|c==='X'\}/.test(rd('render.js'))&&/c==='G'&&S.gate<.5\)\|\|c==='X'/.test(rd('tide.js'))&&/c==='G'\|\|c==='X';/.test(rd('fish.js'))&&/c==='\^'\|\|c==='X';/.test(rd('enemies.js')),'render solidCh, tide, fish and enemies list X');
  // the editor's lint: X is rock for ceilings and room edges
  const lint=FMT.problems([src('xl1',box(8,6).set(3,3,'S').set(3,2,'X').set(2,3,'T'))]);
  ok(lint.some(o=>/Start is under a ceiling/.test(o.msg)),'lint: a Start under X is under a ceiling');
  const e1=box(8,6).set(2,3,'T').set(0,3,'X');const le=FMT.problems([src('xl2',e1)]);
  ok(le.some(o=>/Cracked rock on a room edge/.test(o.msg))&&!le.some(o=>/left edge is open/.test(o.msg)),'lint: X on a room edge is flagged, and is not an opening');
  const lq=FMT.problems([src('xl3',box(10,6).set(2,3,'T').fill(4,4,6,4,'L').set(7,4,'X'))]);ok(lq.some(o=>/beside water or lava/.test(o.msg)),'lint: X beside lava is flagged (drilled, the lava would hang)');
  const lp=FMT.problems([src('xl4',box(10,7).set(2,4,'T').set(5,4,'P').set(5,5,'X').set(7,4,'G'))]);ok(lp.some(o=>/Pressure plate stands on cracked rock/.test(o.msg)),'lint: a plate on X is flagged');
  // ledge(): the edge pose treats X as ground; drilled, as air
  const {createRenderer}=await import(G+'render.js');const rend=createRenderer({getContext:()=>({})});
  const b2=box(30,16);b2.fill(11,14,28,15,'.');b2.fill(11,14,14,14,'X');b2.set(3,13,'T');room('xledge',b2);
  const pose=dr=>{const Q=playState('xledge',11*T-1,FLOOR(16)-PH,{});Object.assign(Q.p,{ground:1,vx:0,vy:0,walk:0,on:-1});Q.drilled=dr;const l=rend.look(Q);return l.face==='huh'&&l.dir[1]===1};
  ok(!pose([])&&pose([[11,14],[12,14],[13,14],[14,14]]),'render ledge(): standing over X is no ledge; once it is drilled, it is');
}

console.log('2. lava');
{ lavaRoom('lv1',6);
  const S=playState('lv1',3*T,LF-PH,{});run(S,3,I());
  const ev=[];for(let i=0;i<200&&!ev.includes('rez');i++)ev.push(...E.step(S,I({r:1}),[]));ok(ev.includes('die')&&ev.includes('rez'),'walking into lava glitches him out and he comes back');
  ok(S.p.x<5*T&&S.room==='lv1'&&S.cp&&S.cp.room==='lv1',`...at the last torch (x ${tl(S.p.x)} tiles)`);
  const D=playState('lv1',4*T,LF-PH,{});run(D,3,I());D.p.x=10*T-PW;const e2=run(D,60,I());ok(!e2.includes('die'),'standing on the bank right beside it is safe');
  const F=playState('lv1',12*T,LF-PH-1,{});F.p.vy=0;F.p.ground=0;let fr=-1;for(let i=0;i<30;i++){if(E.step(F,I(),[]).includes('die')){fr=i;break}}
  ok(fr>=1,`dropped 1 px over it, he dies once his feet are ${E.LAVA}+ px under the line (frame ${fr})`);
  ok(L.isLiq('L')&&L.isLava('L')&&!L.isLava('~'),'lava is a liquid (liquid.js isLiq)');
  const Lq=playState('lv1',4*T,LF-PH,{}).liq;ok(Lq.s.length===1&&Lq.s[0].lava===1,'its pool is one surface, tagged lava');
  lavaRoom('lvmix',4,{water:4});const M=playState('lvmix',3*T,LF-PH,{}).liq;ok(M.s.length===2&&M.s.filter(s=>s.lava).length===1,'water beside lava: two surfaces, never one');
  const W0=playState('lvmix',3*T,LF-PH,{});ok(JSON.stringify(Object.keys(W0.liq.s.find(s=>!s.lava)).sort())==='["h","n","tx","ty","v"]','a water surface carries no new field (water snapshots unchanged)');
  // inset lint (the editor's checks and the same rule test_game applies to water)
  const inset=FMT.problems([src('li1',box(12,6).set(2,3,'T').fill(5,4,7,4,'L'))]);ok(!inset.some(o=>/Lava/.test(o.msg)),'lint: lava sunk into the floor passes');
  const fl=FMT.problems([src('li2',box(12,6).set(2,3,'T').fill(5,3,7,3,'L'))]);ok(fl.filter(o=>/Lava is not inset/.test(o.msg)).length===2,'lint: lava lying on the floor is flagged (both ends of the stretch)');
}

console.log('3. the plain board burns on lava: one save jump');
{ lavaRoom('lv2',7);   /* bank x <10, lava 10..16, bank 17.. */
  const mk=(items={board:1})=>{const S=playState('lv2',8*T-PW,LF-PH,items);run(S,3,I());return S};
  { const S=mk();const ev=run(S,60,i=>I({r:1,b:i===0,bp:i===0}));
    ok(ev.includes('dash')&&ev.includes('burn')&&!ev.includes('surf'),'a dash that ends over lava: the board burns (no surf)');
    ok(ev.includes('die'),'...and with no press he sinks in and glitches out');}
  let saved=null;
  { const S=mk();const ev=[];let burnF=-1;for(let i=0;i<120;i++){const e=E.step(S,I({r:1,b:i===0,bp:i===0,j:burnF>=0,jp:burnF>=0&&i===burnF+6}),[]);ev.push(...e);if(e.includes('burn')&&burnF<0)burnF=i;if(e.includes('die'))break}
    ok(ev.includes('savejump')&&!ev.includes('die')&&S.p.ground&&S.p.x>=17*T-PW,`a jump during the burn is the save jump: across 7 tiles of lava to the far bank (x ${tl(S.p.x)})`);saved=S}
  { const S=mk();const ev=[];let burnF=-1,n=0;for(let i=0;i<120;i++){const air=burnF>=0;const e=E.step(S,I({r:0,b:i===0,bp:i===0,j:1,jp:air&&(i===burnF+4||i===burnF+20)}),[]);ev.push(...e);if(e.includes('burn')&&burnF<0)burnF=i;if(e.includes('die'))break}
    n=ev.filter(e=>e==='savejump').length;ok(n===1&&ev.includes('die'),`the save jump is one: a second press in the air gives nothing (${n} save jump, then into the lava)`);}
  { const S=mk({board:1,root:1});S.p.root=1;const ev=[];let burnF=-1;for(let i=0;i<160;i++){const e=E.step(S,I({r:1,b:i===0,bp:i===0,j:1,jp:burnF>=0&&(i===burnF+4||i===burnF+26)}),[]);ev.push(...e);if(e.includes('burn')&&burnF<0)burnF=i;if(e.includes('die')||(S.p.ground&&i>burnF+10))break}
    ok(ev.indexOf('savejump')>=0&&ev.indexOf('root')>ev.indexOf('savejump'),'with the root: the first press is the save jump, the second the root');}
  { // pressed just before the board meets the lava (dash): it fires as it burns
    const S=mk();const ev=run(S,40,i=>I({r:1,b:i===0,bp:i===0,j:i>=6,jp:i===6}));ok(ev.includes('burn')&&ev.includes('savejump')&&ev.indexOf('savejump')>=ev.indexOf('burn')&&!ev.includes('die'),'a jump pressed during the dash fires as the board burns');}
  { // an out board falling onto lava burns too
    const S=playState('lv2',12*T,LF-PH-40,{board:1});S.p.bo=1;S.p.dc=0;S.p.vy=0;S.p.ground=0;const ev=run(S,30,I());ok(ev.includes('burn'),'an out board landing on lava burns');
    ok(S.p.bo===0&&S.p.dc===0,'...gone, and no dash left (it is back on landing)');}
  { // surfing water onto lava
    lavaRoom('lv3',6,{water:6});const S=playState('lv3',2*T,LF-PH,{board:1});run(S,3,I());const ev=run(S,90,i=>I({r:1,b:i===2,bp:i===2}));
    ok(ev.includes('surf')&&ev.includes('burn'),'surfing off water onto lava: the board burns as it meets the lava');}
  { // it is back once he lands
    const S=saved;ok(S.p.dc===1&&S.p.sj===0&&S.p.burn===0,'landed: the dash is back, no save jump left over');}
  { // no board: lava just kills; root alone never gets a save jump
    const S=playState('lv2',12*T,LF-PH-30,{root:1});S.p.root=1;const ev=run(S,40,i=>I({j:1,jp:i===2}));ok(!ev.includes('savejump')&&!ev.includes('burn'),'no board: no burn, no save jump');}
}

console.log('4. the heat-forged board');
{ lavaRoom('lw',12,{ch:'~'});lavaRoom('ll',12);
  const surf=(id,items)=>{const S=playState(id,8*T-PW,LF-PH,items);run(S,3,I());const vx=[],ys=[];const ev=[];
    for(let i=0;i<70;i++){const e=E.step(S,I({r:1,b:i===0,bp:i===0}),[]);ev.push(...e);vx.push(+S.p.vx.toFixed(6));ys.push(S.p.surf)}return {S,ev,vx,ys}};
  const w=surf('lw',{board:1}),l=surf('ll',{board:1,forged:1});
  ok(l.ev.includes('surf')&&!l.ev.includes('burn')&&!l.ev.includes('die'),'forged: the dash lands on lava and surfs it');
  ok(JSON.stringify(w.vx)===JSON.stringify(l.vx),`the same speeds as on water, frame by frame (top ${Math.max(...l.vx).toFixed(2)} px/frame; SURF.v ${B.SURF.v})`);
  { // letting go of the direction: the board coasts, then sinks, as on water; on lava that is a death (flagged for Tyler)
    lavaRoom('llw',26);const S=playState('llw',8*T-PW,LF-PH,{board:1,forged:1});run(S,3,I());const ev=run(S,200,i=>I({r:i<20,b:i===0,bp:i===0}));
    ok(ev.includes('surf')&&ev.includes('die'),'forged: let go mid-lava and the board coasts, sinks, and he glitches out (water would let him swim)');}
  const nf=surf('ll',{forged:1});ok(!nf.ev.includes('surf')&&!nf.ev.includes('dash'),'forged without the board: no dash, no surf (inert)');
  const n2=playState('ll',12*T,LF-PH-30,{forged:1});ok(run(n2,60,I()).includes('die'),'...and lava still kills him');
  // the pickup: only with the board in hand
  const b=box(30,16);b.set(15,13,'I').set(3,13,'T');room('xforge',b,[{at:[15,13],item:'forged'}]);
  const pick=it=>{const S=playState('xforge',12*T,FLOOR(16)-PH,it);run(S,3,I());const ev=[];for(let i=0;i<60&&!S.items.forged;i++)ev.push(...E.step(S,I({r:1}),[]));return {S,ev}};
  const a=pick({root:1});ok(!a.S.items.forged&&!a.ev.includes('item')&&a.S.p.bd===0,'no board: walking over the forged board does nothing (it stays, no demo, no event)');
  const c=pick({board:1});ok(c.S.items.forged===1&&c.ev.includes('item')&&c.S.p.bd>0,'with the board: picked up, and its demo plays (the board demo, now forged)');
  const d=run(c.S,200,I());ok(d.includes('dash')&&c.S.p.bd===0,'...the demo dashes once, then hands control back');
  // never forged without the board: save, load, grant
  ok(items({board:0,forged:1}).forged===0&&items({board:1,forged:1}).forged===1,'state.js items(): forged needs the board');
  const S=newState();S.items.forged=1;ok(persist(S).items.forged===0,'a save never writes forged without the board');
  const m=mem();m.setItem('tos_game',JSON.stringify({v:5,lit:1,items:{root:1,forged:1},pieces:[0,0,0,0],torches:{},cp:null}));ok(resume(newState(),load(m)).items.forged===0,'a save with forged and no board loads without it (normalised)');
  ok(/grant\(k,v\)\{[^\n]*S\.items=items\(S\.items\)/.test((await import('node:fs')).readFileSync(new URL('engine.js',G),'utf8')),'the dev grant normalises too (forged off without the board, also when the board is revoked)');
}

console.log('5. claws: inert without them');
{ const b=box(30,24);b.set(3,21,'T');room('wall',b);
  const fall=items=>{const S=playState('wall',1*T+2,FLOOR(24)-PH-120,items);const ev=run(S,20,I({l:1}));return {S,ev}};
  const n=fall({});ok(!n.ev.includes('cling')&&!n.S.vines.length&&n.S.p.cl===0&&n.S.p.vy>2,`no claws: falling against a wall holding toward it, he just falls (vy ${f1(n.S.p.vy)})`);
  const y=fall({claws:1});ok(y.ev.includes('cling')&&y.S.vines.length===1,'with the claws: he clings and a vine grows');
}

console.log('6. cling, vines, flowers');
{ const b=box(30,24);b.set(3,21,'T');room('wall2',b);const FL=FLOOR(24);
  // clinging with no vine left to grow: the slow slide
  const S=playState('wall2',1*T+2,FL-PH-150,{claws:1});S.p.vc=999;run(S,30,I({l:1}));const y0=S.p.y;run(S,30,I({l:1}));
  ok(S.p.cl===-1&&Math.abs((S.p.y-y0)/30-P.FEEL.CLING)<1e-9,`clinging, he slides down at FEEL.CLING (${P.FEEL.CLING} px/frame)`);
  ok(P.FEEL.ACC===P.ACC&&P.FEEL.RUN===1.6&&P.JV===4.6&&P.G===.26,'the old FEEL defaults and jump constants are unchanged');
  const ev=run(S,5,I());ok(S.p.cl===0&&S.p.vy>.5,'letting go of the direction, he drops');
  // the vine: grows to VINE.len in VINE.grow frames, a flower at his feet and every VINE.gap px
  const V=playState('wall2',1*T+2,FL-PH-150,{claws:1});run(V,1,I({l:1}));const v=V.vines[0];
  ok(v&&v.s===-1&&v.fx===T&&Math.abs(v.by-(V.p.y+PH))<1,`the vine roots at the wall face (x ${v.fx}) at his feet`);
  run(V,44,I({l:1}));const half=v.len;run(V,45,I({l:1}));
  ok(Math.abs(half-C.VINE.len/2)<1&&v.len===C.VINE.len,`it takes ${C.VINE.grow} frames (${(C.VINE.grow/60).toFixed(1)} s) to reach ${C.VINE.len} px (${half.toFixed(1)} px at half time)`);
  ok(C.flowers(v).length===C.VINE.len/C.VINE.gap&&v.x===T&&v.w===C.VINE.w&&v.y===v.by-v.len&&v.h===v.len+C.VINE.fh,`${C.flowers(v).length} flowers, ${C.VINE.gap} px apart above its root; the box {x,y,w,h} holds stem and flowers (${v.x},${f1(v.y)},${v.w},${f1(v.h)})`);
  ok(V.p.cl===-1&&!V.p.ground,'with a vine growing he keeps clinging (no flower at its root to stand him)');
  // footholds: drop onto a flower from above, jump from it, hold down to fall through
  const top=C.flowers(v)[2];V.p.x=T;V.p.y=top.y-PH-20;V.p.vy=0;V.p.ground=0;run(V,30,I());
  ok(V.p.ground&&Math.abs(V.p.y+PH-top.y)<1e-6,`a flower holds him (feet at ${f1(V.p.y+PH)}, flower ${top.y})`);
  const ej=run(V,1,I({j:1,jp:1}));ok(ej.includes('jump')&&V.p.vy<0,'he jumps from a flower like from the ground');
  run(V,60,I());ok(V.p.ground&&V.p.y+PH<=top.y+1e-6,'...and lands on the flowers again');
  run(V,20,I({d:1}));ok(V.p.y+PH>top.y+C.VINE.gap,'holding down drops him through them');
  const up=playState('wall2',1*T,0,{claws:1});up.vines=[{x:T,y:100,w:10,h:51,t:100,s:-1,fx:T,by:150,max:48,len:48}];up.p.y=160;up.p.vy=-3;up.p.ground=0;run(up,6,I());
  ok(!up.p.ground,'one-way: rising through a flower from below does not stop him');
  // withering: gone at VINE.life
  run(V,C.VINE.life,I());ok(V.vines.length===0,`a vine is gone after ${(C.VINE.life/60).toFixed(0)} s`);
  { // the default case, a vine free to grow: he clings the whole time he holds, and a jump is a wall jump
    const D=playState('wall2',1*T+2,FL-PH-150,{claws:1});let held=0;for(let i=0;i<20;i++){E.step(D,I({l:1}),[]);if(D.p.cl===-1)held++}
    const ej=E.step(D,I({l:1,j:1,jp:1}),[]);ok(held===20&&D.vines.length===1&&ej.includes('walljump'),`a vine growing, he clings all ${held} frames and a jump pushes him off the wall`)}
  { // a flower holds him only under his shoes (box columns x+2..5, x+12..15), not by its last px
    const Fz=playState('wall2',1*T,0,{claws:1});Fz.vines=[{x:T,y:100,w:10,h:51,t:100,s:-1,fx:T,by:150,max:48,len:48}];const fy=134;
    const drop=x=>{Fz.p.x=x;Fz.p.y=fy-PH-6;Fz.p.vy=0;Fz.p.ground=0;run(Fz,12,I());return Fz.p.ground&&Math.abs(Fz.p.y+PH-fy)<1e-6};
    ok(drop(T+6)&&!drop(T+9),'a flower holds him under a shoe, not by the edge of his box')}
  // max 2 alive, the cooldown
  const M=playState('wall2',1*T+2,FL-PH-180,{claws:1});const t0=[];
  const cling=()=>{M.p.y-=40;M.p.vy=0;M.p.ground=0;M.p.cl=0;return E.step(M,I({l:1}),[])};
  let e=cling();t0.push(e.includes('vine'));run(M,10,I());e=cling();t0.push(e.includes('vine'));
  run(M,C.VINE.cd,I());e=cling();t0.push(e.includes('vine'));run(M,C.VINE.cd,I());e=cling();t0.push(e.includes('vine'));
  ok(JSON.stringify(t0)==='[true,false,true,false]'&&M.vines.length===2,`a second cling inside the ${C.VINE.cd}-frame cooldown grows nothing; after it a second vine; a third is refused while two live (${t0})`);
  // a vine stops where the wall stops or a ceiling closes over it
  const b2=box(30,24);b2.fill(1,8,10,8,'#');b2.set(3,21,'T');room('ceil',b2);const Q=playState('ceil',1*T+2,9*T+6,{claws:1});run(Q,1,I({l:1}));run(Q,120,I());
  ok(Q.vines[0]&&Q.vines[0].len<C.VINE.len&&Q.vines[0].y>=9*T-1e-6,`under a ceiling it stops short (${f1(Q.vines[0].len)} px)`);
  // reset on room entry
  E.enterRoom(M,'wall2',{x:5*T,y:FL-PH});ok(M.vines.length===0&&M.drilled.length===0&&M.p.cl===0,'re-entering the room: no vines, nothing drilled');
}

console.log('7. the wall jump');
{ const b=box(40,24);b.set(3,21,'T');room('wj',b);const FL=FLOOR(24);
  { const W=playState('wj',1*T+2,FL-PH-160,{claws:1});run(W,10,I({l:1}));const e=run(W,1,I({l:1,j:1,jp:1}));ok(W.vines.length===1&&e.includes('walljump')&&W.p.vx===C.CLAW.wjx,'with its vine growing, the same wall jump')}
  const S=playState('wj',1*T+2,FL-PH-160,{claws:1});S.p.vc=999;run(S,10,I({l:1}));const x0=S.p.x,y0=S.p.y;
  const ev=run(S,1,I({l:1,j:1,jp:1}));ok(ev.includes('walljump')&&S.p.vx===C.CLAW.wjx&&S.p.vy<0,`a jump from a cling pushes him off (${C.CLAW.wjx} px/frame out, ${C.CLAW.wjy} up)`);
  let mx=0,top=1e9,land=null;for(let i=0;i<120;i++){E.step(S,I({r:1,j:1}),[]);mx=Math.max(mx,Math.abs(S.p.vx));top=Math.min(top,S.p.y);if(S.p.ground){land=S.p.x;break}}
  ok(mx<=C.CLAW.wjx+1e-9,`bounded: never faster than ${C.CLAW.wjx} px/frame (max ${mx.toFixed(2)})`);
  console.log(`      wall jump (holding away): rises ${f1(y0-top)} px (${tl(y0-top)} tiles)`);
  // holding back toward the wall he cannot cling higher than he jumped from
  const H=playState('wj',1*T+2,FL-PH-160,{claws:1});H.p.vc=999;run(H,10,I({l:1}));const hy=H.p.y;run(H,1,I({l:1,j:1,jp:1}));let minCl=1e9;
  for(let i=0;i<200;i++){E.step(H,I({l:1,j:1}),[]);if(H.p.cl)minCl=Math.min(minCl,H.p.y)}
  ok(minCl>=hy-1e-6,`back on the same wall he clings no higher than where he jumped (${f1(hy-minCl)} px gained)`);
  // a chimney: two walls 3 tiles apart, wall jumps only (vines off: cooldown held) never climb it
  for(const gap of [2,3,4,5]){const c=box(10+gap,30);c.fill(1,1,4,27,'#');c.fill(5+gap,1,8+gap,27,'#');c.set(5,27,'T');room('ch'+gap,c);
    const Q=playState('ch'+gap,5*T+1,20*T,{claws:1,root:1});Q.p.root=1;let best=Q.p.y,side=-1;
    for(let i=0;i<900;i++){Q.p.vc=999;const e=E.step(Q,I({l:side<0,r:side>0,j:1,jp:Q.p.cl?1:0}),[]);if(e.includes('walljump'))side=-side;best=Math.min(best,Q.p.y);if(Q.p.ground)break}
    ok(20*T-best<=60,`chimney ${gap} tiles wide, wall jumps only: no climb (best ${f1(20*T-best)} px over the start)`)}
}

console.log('8. the drill');
{ const b=box(30,24);b.fill(10,1,11,21,'#');b.fill(10,12,10,14,'X');b.set(3,21,'T');const R=room('dr',b);const FL=FLOOR(24);
  const at=y=>{const S=playState('dr',10*T-PW-1,y,{claws:1});S.p.vc=999;return S};
  const S=at(12*T);const fr=[];let ev=[],rows=null;for(let i=0;i<60;i++){const e=E.step(S,I({r:1}),[]);ev.push(...e);if(e.includes('drill')){fr.push(i);rows=[Math.floor(S.p.y/T),Math.floor((S.p.y+PH-1)/T)]}}
  ok(fr.length===1&&fr[0]>=C.CLAW.drill-1&&fr[0]<=C.CLAW.drill+1,`clinging to cracked rock, holding toward it: it crumbles after ${fr[0]} frames (~${(C.CLAW.drill/60).toFixed(1)} s)`);
  ok(ev.filter(e=>e==='crack').length>=2,`it ticks as it cracks (${ev.filter(e=>e==='crack').length} ticks)`);
  { const want=[];for(let y=Math.max(12,rows[0]);y<=Math.min(14,rows[1]);y++)want.push('10,'+y);
    ok(JSON.stringify(S.drilled.map(String).sort())===JSON.stringify(want)&&E.solid(S,R,10,11)&&E.solid(S,R,11,13),`it opens the cracked tiles in the rows his body covers (rows ${rows[0]}-${rows[1]}: ${want.join(' ')}); the rock around stays`)}
  { const b2=box(30,24);b2.fill(10,1,13,21,'#');b2.fill(10,12,12,13,'X');b2.fill(10,16,12,17,'X');b2.fill(10,14,10,15,'X');b2.set(3,21,'T');const R2=room('dr2',b2);
    const Q=playState('dr2',10*T-PW-1,11*T+8,{claws:1});Q.p.vc=999;let qr=null;for(let i=0;i<40;i++){if(E.step(Q,I({r:1}),[]).includes('drill'))qr=[Math.floor(Q.p.y/T),Math.floor((Q.p.y+PH-1)/T)]}
    const want=[];if(qr)for(let y=qr[0];y<=qr[1];y++)for(let x=10;x<=12;x++)if(R2.g[y][x]==='X'&&(y<14||x===10))want.push(x+','+y);
    ok(qr&&JSON.stringify(Q.drilled.map(String).sort())===JSON.stringify(want.sort())&&!E.solid(Q,R2,12,13)&&E.solid(Q,R2,13,13)&&E.solid(Q,R2,10,15)&&E.solid(Q,R2,11,16),'a cracked wall 3 thick: one drill opens a tunnel his height through it; cracked rock joined below his feet stays (a beetle face there is untouched)')}
  const D=at(12*T);let now=null,after=null;for(let i=0;i<60;i++){const e=E.step(D,I({r:1}),[]);if(e.includes('drill')){now=D.drillNow.map(String);E.step(D,I({r:1}),[]);after=D.drillNow.length;break}}
  ok(now&&now.length===S.drilled.length&&after===0,`S.drillNow holds the drilled tiles for the step they open (${now}), then is cleared`);
  const H=at(6*T);const eh=run(H,90,I({r:1}));ok(!eh.includes('drill')&&H.p.cl===1&&H.drilled.length===0,'on plain rock nothing drills');
  const Rl=at(12*T);run(Rl,20,I({r:1}));run(Rl,3,I());ok(Rl.crack===null&&Rl.drilled.length===0,'let go before it crumbles: nothing drilled, the crack resets');
  E.enterRoom(S,'dr',{x:5*T,y:FL-PH});ok(E.solid(S,R,10,13)&&S.drilled.length===0,'re-entering the room, the cracked wall is back');
  const N=playState('dr',10*T-PW-1,12*T,{});const en=run(N,90,I({r:1}));ok(!en.includes('drill')&&N.drilled.length===0,'no claws: no drill');
}

const NUM={};
console.log('9. no skips: vines under a roof (the search on the real step)');
{ /* a shaft 2n+2 tiles wide, both walls climbable; a roof at row 8 with a 2-tile hole in its middle, n tiles from each wall.
     The search runs the real step; "not found" within its budget is strong evidence, not a proof (the space is too big to
     exhaust here), so each is paired with a control the same search does solve */
  const shaft=n=>{const b=box(2*n+4,24);b.fill(1,8,2*n+2,8,'#');b.fill(1+n,8,2+n,8,'.');b.set(1+n,21,'T');return room('sh'+n,b).id};
  const above=S=>S.p.y+PH<=8*T+.01&&!S.p.dead;
  const go=(n,items,budget=150000)=>{const id=shaft(n);return {id,r:reach(playState(id,(1+n)*T,FLOOR(24)-PH,items),above,{budget})}};
  { const {id,r}=go(2,{claws:1});ok(r.found&&replay(playState(id,3*T,FLOOR(24)-PH,{claws:1}),r,above),`control: a hole 2 tiles out from the walls, the claws climb 14 tiles and get through (${(r.frames/60).toFixed(1)} s); the input replays`)}
  { const {r}=go(2,{root:1});ok(!r.found&&r.exhausted,`control: the same room without the claws (root only): out of reach, search exhausted (${r.nodes} nodes)`)}
  { const {r}=go(3,{claws:1});ok(!r.found,`a hole 3 tiles out: the claws alone never get through (${r.nodes} nodes searched${r.exhausted?', exhausted':''})`);NUM.roofClaws=3}
  { const {r}=go(4,{claws:1,root:1});ok(r.found,`a hole 4 tiles out: claws + root DO get through (a jump off a flower pinned under the roof, then the root; ${(r.frames/60).toFixed(1)} s)`)}
  { const {r}=go(5,{claws:1,root:1});ok(!r.found,`a hole 5 tiles out: claws + root never get through (${r.nodes} nodes searched${r.exhausted?', exhausted':''})`);NUM.roofClawsRoot=5}
}

console.log('10. numbers for the rooms stage');
{ // wall jump reach: from a cling on the left wall, the farthest ledge (same height as his feet) he lands on
  const far=(items,ledgeDy)=>{let best=0;for(let gx=3;gx<=14;gx++){const b=box(32,24);b.fill(1+gx,14+ledgeDy,30,21,'#');b.set(3,21,'T');const id=`wr${gx}_${ledgeDy}_${items.root?1:0}`;room(id,b);
      const S=playState(id,1*T+2,14*T-PH,items);S.p.vc=999;if(items.root)S.p.root=1;run(S,3,I({l:1}));if(!S.p.cl)continue;
      const r=reach(snapshot(S),Q=>Q.p.ground&&Q.p.x>=(1+gx)*T-2&&Q.p.y+PH<=(14+ledgeDy)*T+.01,{budget:4000,drop:false,maxFrames:150,prio:Q=>-Q.p.x});if(r.found)best=gx}return best};
  NUM.wjFlat=far({claws:1},0);NUM.wjFlatRoot=far({claws:1,root:1},0);NUM.wjUp2=far({claws:1},-2);
  console.log(`      wall jump from a cling (feet level with the ledge top) across a pit: a gap of ${NUM.wjFlat} tiles (${NUM.wjFlatRoot} with the root); to a ledge 2 tiles above his feet: ${NUM.wjUp2} tiles`);
  ok(NUM.wjFlat>=3,'wall-jump reach measured');
  // the sustained climb rate up a tall wall (no ceiling), claws alone and with the root
  const tall=box(14,60);tall.fill(9,1,12,57,'#');tall.set(4,57,'T');room('tall',tall);
  const climb=items=>{const S=playState('tall',4*T,FLOOR(60)-PH,items);const r=reach(S,Q=>Q.p.y+PH<=FLOOR(60)-30*T,{budget:60000,tq:30});return r};
  const c1=climb({claws:1}),c2=climb({claws:1,root:1});
  NUM.rate=c1.found?30/(c1.frames/60):0;NUM.rateRoot=c2.found?30/(c2.frames/60):0;
  ok(c1.found,`a tall bare wall: the claws climb 30 tiles in ${c1.found?(c1.frames/60).toFixed(1):'-'} s (${NUM.rate.toFixed(2)} tiles/s; with the root ${c2.found?(c2.frames/60).toFixed(1):'-'} s, ${NUM.rateRoot.toFixed(2)} tiles/s): height is not bounded, only the rate`);
  // burn-and-save: the widest lava pool crossed from a run on the plain board (dash, burn, save jump), alone and with the root
  const wid=(items,extra)=>{let best=0;for(let w=4;w<=20;w++){const id=`bw${w}${items.root?'r':''}`;lavaRoom(id,w);
      const S=playState(id,4*T,LF-PH,items);if(items.root)S.p.root=1;run(S,3,I());
      const r=reach(S,Q=>Q.p.ground&&Q.p.x>=(10+w)*T-PW/2,{budget:items.root?20000:6000,k:4,prio:Q=>-Q.p.x});if(r.found)best=w}return best};
  NUM.burn=wid({board:1});NUM.burnRoot=wid({board:1,root:1});
  ok(NUM.burn>=5,`plain board over lava (run, jump, air dash, the burn's drift, save jump): ${NUM.burn} tiles of lava; with the root ${NUM.burnRoot} (a search, so a floor on the true reach)`);
  // surfing: a pool's far end at floor level, then a dry pit: widest pit crossed by a jump off the surf (and + root)
  const pit=(items)=>{let best=0;for(let w=4;w<=20;w++){const b=box(70,18);b.fill(1,14,68,15,'#');b.fill(8,14,37,15,'~');b.fill(38,14,37+w,15,'.');b.fill(38,16,37+w,16,'^');b.set(3,13,'T');const id=`sp${w}${items.root?'r':''}`;room(id,b);
      const S=playState(id,4*T,LF-PH,items);if(items.root)S.p.root=1;run(S,3,I());
      const r=reach(S,Q=>Q.p.ground&&Q.p.x>=(38+w)*T-2&&Q.p.y+PH<=14*T+.01,{budget:items.root?20000:8000,k:4,prio:Q=>-Q.p.x});if(r.found)best=w}return best};
  NUM.surfPit=pit({board:1});NUM.surfPitRoot=pit({board:1,root:1});
  ok(NUM.surfPit>=6,`jump off a surf at full speed (${B.SURF.v} px/frame): a dry pit ${NUM.surfPit} tiles wide after the pool (${NUM.surfPitRoot} with the root)`);
  // dash then surf: the widest dry gap between a bank and a pool a dash from the bank lands across (board out, surf on)
  const dgap=()=>{let best=0;for(let w=2;w<=18;w++){const b=box(50,18);b.fill(1,14,48,15,'#');b.fill(10,14,9+w,15,'.');b.fill(10,16,9+w,16,'^');b.fill(10+w,14,40,15,'~');b.set(3,13,'T');const id=`dg${w}`;room(id,b);
      const S=playState(id,4*T,LF-PH,{board:1});run(S,3,I());const r=reach(S,Q=>Q.p.surf&&Q.p.x>=(10+w)*T,{budget:3000,k:4,prio:Q=>-Q.p.x});if(r.found)best=w}return best};
  NUM.dashGap=dgap();console.log(`      a dash (with a run and a jump) lands on a pool across a dry gap of ${NUM.dashGap} tiles`);
}

console.log('11. save v5, snapshot, determinism');
{ ok(VER===5,'the save is v5');
  const S=newState();S.lit=1;S.items.board=1;S.items.forged=1;S.items.claws=1;const m=mem();save(S,m);const d=load(m);
  ok(d.v===5&&d.items.claws===1&&d.items.forged===1&&d.items.board===1,'a v5 save carries the claws and the forged board');
  const R=resume(newState(),d);ok(R.items.claws===1&&R.items.forged===1,'...and they load back');
  for(const v of [1,2,3,4]){m.setItem('tos_game',JSON.stringify({v,lit:1,items:v>=4?{root:1,board:1}:{root:1},pieces:[1,0,0,0],torches:{},cp:{room:'r1',tx:36,ty:14}}));const q=resume(newState(),load(m));
    ok(q.items.root===1&&!q.items.claws&&!q.items.forged,`a v${v} save still loads (no claws, no forged board)`)}
  const p=persist(S);ok(!('vines' in p)&&!('drilled' in p)&&!('crack' in p),'vines and drilled walls are never saved (they reset on room entry)');
  // snapshot / restore mid-cling, mid-vine, mid-drill, mid-burn: a JSON round trip replays identically
  const b=box(30,24);b.fill(10,1,11,21,'#');b.fill(10,12,10,13,'X');b.set(3,21,'T');room('det',b);
  const script=i=>I({r:i%120<70,l:i%120>=90,j:i%17<6,jp:i%17===0,d:i%200===150});
  const A=playState('det',8*T,12*T,{claws:1,root:1,board:1});A.p.root=1;run(A,15,script);
  ok(A.p.cl||A.vines.length||A.crack,'(mid-cling or with a vine alive)');
  const snap=snapshot(A),A2=newState();restore(A2,JSON.parse(JSON.stringify(snap)));run(A,600,script);run(A2,600,script);
  ok(JSON.stringify(A)===JSON.stringify(A2),'a JSON round trip mid-claws replays the same 600 frames');
  const D1=newState(),D2=newState();restore(D1,snap);restore(D2,snap);const sc2=i=>I({r:1,j:i%31<10,jp:i%31===0});run(D1,900,sc2);run(D2,900,sc2);
  ok(JSON.stringify(D1)===JSON.stringify(D2),'same inputs, same world (deterministic: no Math.random, no clock)');
  lavaRoom('detl',7);const Bn=playState('detl',8*T-PW,LF-PH,{board:1});run(Bn,3,I());let k=0;while(!Bn.p.burn&&k<40){E.step(Bn,I({r:1,b:k===0,bp:k===0}),[]);k++}
  const bs=snapshot(Bn),B2=newState();restore(B2,JSON.parse(JSON.stringify(bs)));const sb=i=>I({r:1,j:1,jp:i===5});run(Bn,120,sb);run(B2,120,sb);
  ok(bs.p.burn>0&&JSON.stringify(Bn)===JSON.stringify(B2),'a JSON round trip mid-burn replays the same');
}

console.log('12. drawing (a stub canvas): lava, cracked rock, vines, the burn, the cling pose');
{ const mkCtx=(w,h)=>{const px=new Map();return {w,h,px,fillStyle:'',globalAlpha:1,globalCompositeOperation:'source-over',imageSmoothingEnabled:false,
    fillRect(x,y,a,b){for(let j=0;j<b;j++)for(let i=0;i<a;i++)px.set((y+j)*1000+(x+i),this.fillStyle)},clearRect(){px.clear()},drawImage(){},
    getImageData(x,y,a,b){return {data:new Uint8ClampedArray(a*b*4),width:a,height:b}},putImageData(){},createImageData(a,b){return {data:new Uint8ClampedArray(a*b*4),width:a,height:b}}}};
  const canv=()=>{const c={width:32,height:48,_c:null,getContext(){return c._c||(c._c=mkCtx(c.width,c.height))}};return c};
  globalThis.document={createElement:()=>canv(),getElementById:()=>null};
  const {createRenderer}=await import(G+'render.js'),M=await import(G+'mascot.js');
  const cv=canv();cv.width=288;cv.height=216;const rend=createRenderer(cv);
  const b=box(40,20);b.fill(10,16,16,17,'L');b.fill(20,4,20,15,'X');b.fill(1,1,1,17,'#');b.set(3,15,'T');room('drw',b);
  const S=playState('drw',1*T+2,5*T,{claws:1,board:1});S.p.vc=0;let threw=null;
  try{for(let i=0;i<200;i++){const ev=E.step(S,I({l:i<150}),[]);rend.step(S,ev,false);rend.draw(S,ROOMS.drw)}
    S.p.burn=10;S.p.y=15*T;rend.draw(S,ROOMS.drw);S.crack=[20,8,15];rend.draw(S,ROOMS.drw);
    const ed=newState();ed.liq=null;ed.items={};ed.p.hide=1;rend.draw(ed,ROOMS.drw);   /* the editor draws with no liquid sim */
  }catch(e){threw=e}
  ok(!threw,`a room with lava, cracked rock, vines and a burning board draws without error${threw?': '+threw.stack.split('\n').slice(0,3).join(' | '):''}`);
  // the cling pose: one fixed sprite per side, no per-frame variants in the look key
  const C2=playState('drw',1*T+2,5*T,{claws:1});const keys=new Set();
  for(let i=0;i<40;i++){E.step(C2,I({l:1}),[]);rend.step(C2,[],false);const l=rend.look(C2);if(C2.p.cl)keys.add([l.f,l.dir.join(),l.face,l.dx|0,l.sp|0,l.happy|0].join('|'))}
  ok(keys.size===1&&[...keys][0].startsWith('cling|-1,-1||0|0'),`clinging, the look is one fixed pose (${[...keys]})`);
  ok(M.FR.cling&&M.FR.cling[2]+M.FR.cling[1]===11,'its frame keeps his feet on row 42 like every other');
  // an ASCII proof of the pose (eyes up toward the wall, claws in the wall)
  const sp=M.sprite({f:'cling',dir:[1,-1],blink:0,face:'',stage:1});const g=sp._c.px,pal={'#1A1716':'k','#ffffff':'w','#FF3333':'r','#FF9A9A':'p','#B01E23':'R','#FF7A7A':'c','#0B5A55':'n','#3FC2B5':'T'};
  const rows=[];for(let y=12;y<46;y++){let s='';for(let x=0;x<32;x++){const c=g.get(y*1000+x);s+=c?(pal[c]||'?'):'.'}rows.push(s)}
  console.log(rows.map(r=>'      '+r).join('\n'));
  ok(rows.some(r=>r[25]==='k')&&rows.some(r=>r[26]==='w'),'its claws reach past his body into the wall (x 25-26 of 32 on the right side)');
}

console.log('\nnumbers: '+JSON.stringify(NUM));
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails?1:0);
