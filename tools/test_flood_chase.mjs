// Flood's fragment room and chase: Eel Grotto (b10) east of Hermit Cove, the Flood fragment on its pedestal, and the eel's
// rising tide that runs west through f2 and f1 to the safe line at Shallows' west door (game/chases.js, game/tide.js).
// Scripted bots: the way in, clean and hesitant runs, a run from every torch on the way, Assist, root only (reported),
// determinism, the end, and the walk home with no board. Plain node, no deps: node tools/test_flood_chase.mjs
const G=new URL('../game/',import.meta.url).href;
const {T,newState,snapshot,restore,persist,resume,PERCH}=await import(G+'state.js');
const E=await import(G+'engine.js');
const {ROOMS,ORDER,CHASES,NEXT,roomAtTile}=await import(G+'rooms/index.js');
const P=await import(G+'player.js');
const L=await import(G+'liquid.js');
const CH=await import(G+'chases.js');
const TD=await import(G+'tide.js');
const fs=await import('node:fs');
let fails=0,passes=0;
const ok=(c,msg)=>{if(c){passes++;console.log('  ok  ',msg)}else{fails++;console.log('  FAIL',msg)}};
const note=msg=>console.log('  ..  ',msg);
const I=(o={})=>({l:0,r:0,u:0,d:0,j:0,jp:0,b:0,bp:0,drag:null,any:0,...o});
const PH=P.PH,PW=P.PW,C=CHASES.flood,FT=1;   /* FT: the Flood piece's index in S.pieces */
function playState(room,x,y,items={}){const S=newState();Object.assign(S,{lit:1,litT:60,match:1,mode:'play'});Object.assign(S.items,items);E.enterRoom(S,room,{x,y});if(items.root)S.p.root=1;if(items.board)S.p.dc=1;return S}
const run=(S,n,f)=>{const evs=[];for(let i=0;i<n;i++)evs.push(...E.step(S,typeof f==='function'?f(i,S):f,[]));return evs};
const ft=S=>S.p.y+PH,wx=S=>CH.worldX(S),R20=Array.from({length:40},(_,i)=>i+1);

/* ---------------- the bot (as tools/test_flood.mjs): inputs recorded one code per frame, so a found run replays exactly ---------------- */
const enc=(l,r,j,jp,b)=>(l?1:0)|(r?2:0)|(j?4:0)|(jp?8:0)|(b?16:0),dec=c=>I({l:c&1,r:(c>>1)&1,j:(c>>2)&1,jp:(c>>3)&1,bp:(c>>4)&1,b:(c>>4)&1});
let LOG=null;   /* LOG(S,ev) after every frame the bot keeps (set by chaseRun) */
const keep=(S,rec,c,ev)=>{rec.push(c);if(LOG)LOG(S,ev)};
const Bot={
  walk(S,rec,dir,done,max=900){for(let i=0;i<max;i++){if(done(S))return true;const c=enc(dir==='l',dir==='r',0,0,0),ev=E.step(S,dec(c),[]);keep(S,rec,c,ev);if(S.p.dead||ev.includes('die'))return false}return done(S)},
  idle(S,rec,n){for(let i=0;i<n;i++){const ev=E.step(S,I(),[]);keep(S,rec,0,ev);if(S.p.dead||ev.includes('die'))return false}return true},
  /* every plan: idle w frames, hold dir h frames, jump pressed at frame j (0 none) and held, a second press r frames
     after it (the root), the board at frame d (0 none); won when he lands alive (any: as soon as) and target() holds */
  plan(S,rec,dir,target,{waits=[0],jumps=[0,1],roots=[0],dashes=[0],holds=[999],max=260,any=false}={}){
    for(const w of waits)for(const j of jumps)for(const r of roots)for(const d of dashes)for(const h of holds){
      const C0=snapshot(S),out=[];let dead=false,won=false,air=false;
      for(let i=0;i<w&&!dead;i++){out.push(0);if(E.step(C0,I(),[]).includes('die'))dead=true}
      for(let i=1;i<=max&&!dead;i++){const c=enc(dir==='l'&&i<h,dir==='r'&&i<h,j&&i>=j,i===j||(r&&i===j+r),i===d),ev=E.step(C0,dec(c),[]);out.push(c);
        if(ev.includes('die')||C0.p.dead){dead=true;break}if(any&&target(C0)){won=true;break}if(!C0.p.ground)air=true;else if(air&&target(C0)){won=true;break}}
      if(won){replay(S,rec,out);return true}
    }return false},
  /* hold dir with the jump held, pressed every k frames (0 once, -1 never) plus a second press r after each, until target() */
  go(S,rec,dir,target,{ks=[0,6,10,15,20,30,45],rs=[0,4,8,12,16,20,24,28],hs=[9999],max=900,any=true}={}){
    for(const k of ks)for(const r of rs)for(const h of hs){const C0=snapshot(S),out=[];let dead=false;
      for(let i=1;i<=max;i++){const jp=k<0?0:k?i%k===1:i===1,jp2=k>=0&&r&&(k?i%k===1+r:i===1+r),c=enc(dir==='l'&&i<h,dir==='r'&&i<h,1,jp||jp2,0),ev=E.step(C0,dec(c),[]);out.push(c);
        if(ev.includes('die')||C0.p.dead){dead=true;break}if((any||C0.p.ground)&&target(C0)){replay(S,rec,out);return true}}}
    return false},
  /* swim: hold dir and stroke every k frames until target() */
  swim(S,rec,dir,target,max=1200,k=15){for(let i=0;i<max;i++){if(target(S))return true;const c=enc(dir==='l',dir==='r',1,i%k===0,0),ev=E.step(S,dec(c),[]);keep(S,rec,c,ev);if(ev.includes('die')||S.p.dead)return false}return target(S)},
};
/* a found plan is replayed on the real state, so LOG sees every frame */
function replay(S,rec,out){for(const c of out){const ev=E.step(S,dec(c),[]);keep(S,rec,c,ev)}}

/* ---------------- layout ---------------- */
console.log('Eel Grotto (b10)');
const B=ROOMS.b10,F2=ROOMS.f2,F1=ROOMS.f1,FL=[B,F2,F1];
{ ok(B&&B.name==='Eel Grotto'&&B.biome==='flood'&&B.w===80&&B.h===32&&B.at[0]===F2.at[0]+F2.w&&B.at[1]===F2.at[1],`b10 Eel Grotto, 80 x 32, joins Hermit Cove's east edge (at ${B&&B.at})`);
  const door=[13,14,15];ok(door.every(y=>F2.g[y][F2.w-1]!=='#'&&B.g[y][0]!=='#')&&B.g.every((r,y)=>door.includes(y)||r[0]==='#')&&F2.g.every((r,y)=>door.includes(y)||r[F2.w-1]==='#'),"f2's east wall opens at rows 13-15 onto b10's west door, on the cove's floor (row 16), and nowhere else");
  let clash=0;for(let y=0;y<B.h;y++)for(let x=0;x<B.w;x++)if(roomAtTile(B.at[0]+x,B.at[1]+y)!==B)clash++;
  ok(!clash,'b10 overlaps no room (roomAtTile finds it on every one of its tiles)');
  ok(B.at[0]>=24&&B.at[0]+B.w-1<=470&&B.at[1]>=0&&B.at[1]+B.h-1<=40,`b10 lies in the Flood box of the planning map (x 24..470, y 0..40): x ${B.at[0]}..${B.at[0]+B.w-1}, y ${B.at[1]}..${B.at[1]+B.h-1}; Roots is x < 0, the hub 0..24`);
  ok(B.pedestals.length===1&&B.pedestals[0].piece==='flood'&&B.torches.length>=2,`one pedestal (the Flood fragment) and ${B.torches.length} torches`);
  ok(B.spawns.length===0&&!B.plates.length,'nothing hostile in b10 before the chase (the eel sleeps in its lair)');
  const src=fs.readFileSync(new URL('rooms/index.js',G),'utf8'),blk=/\/\* rooms:begin[^\n]*\*\/\n([\s\S]*?)\/\* rooms:end \*\//.exec(src)[1];
  ok(/import R_b10 from '\.\/flood_b10\.js';\n/.test(blk)&&/const LIST=\[[^\]]*R_f2,R_b10\];/.test(blk)&&ORDER.includes('b10'),"the registry block lists flood_b10.js as R_b10 (the dev server's format), so the warp list has it");
  ok(NEXT.some(n=>n.need==='item:board'&&n.room==='f1')&&NEXT.some(n=>n.need==='piece:flood'&&n.room==='b10'),'the stuck hint knows the board (f1) and the Flood piece (b10)');
  const fmt=await import(G+'dev/roomfmt.js'),text=fs.readFileSync(new URL('rooms/flood_b10.js',G),'utf8'),mod=(await import(G+'rooms/flood_b10.js')).default;
  ok(fmt.serialize(mod,fmt.headerComment(text))===text&&!fmt.check(mod,fmt.headerComment(text)),"b10's file is in the editor's format byte for byte and passes the server's checks");
}

/* ---------------- the tide's static guarantees ---------------- */
console.log('the tide: fairness by construction');
const end=CH.endX(C);
{ ok(C.dir===-1&&C.path[0][0]===C.from&&C.path[C.path.length-1].length===1&&C.from*T>end,`CHASES.flood runs west (dir -1) from x ${C.from} to the safe line at x ${C.path[C.path.length-1][0]} (Shallows' west door)`);
  ok(end===(F1.at[0]+1)*T&&[11,12,13].every(y=>F1.g[y][0]!=='#'),"the safe line is one tile inside Shallows' west door (rows 11-13 of f1 col 0)");
  /* the eel and its level through a whole run at full speed (chases.js's rules, no one in the way): per world tile column,
     the level as the snout reaches it, and the highest level while the snout is still east of it */
  const atX={},before={};
  { const c={x:C.from*T,y:C.tide.y0,t:-C.beat};for(let i=0;i<20000&&c.x>end;i++){const g=TD.levelAt(C,c.x);c.y=c.y>g?Math.max(g,c.y-C.tide.rise):Math.min(g,c.y+C.tide.rise);
      if(++c.t>0)c.x=Math.max(end,c.x-CH.speedAt(C,c.x));const X=Math.floor(c.x/T);if(!(X in atX))atX[X]=c.y;for(let k=X+1;k<=X+12;k++)before[k-12]=Math.min(before[k-12]??1e9,c.y)}}
  /* every floor he can stand on between the lair and the safe line lies inside the eel's reach when its snout passes, and
     is dry to his middle (12 px over his feet) while the snout is still east of it: no safe perch, and no step is a trap */
  const bad=[],wet=[];let n=0;
  for(const R of FL)for(let ty=2;ty<R.h;ty++)for(let tx=0;tx<R.w;tx++){
    const hard=c=>c==='#'||c==='='||c==='G',c=R.g[ty][tx],up=R.g[ty-1][tx],up2=R.g[ty-2][tx];if(!hard(c)||hard(up)||hard(up2)||up==='~')continue;
    const X=R.at[0]+tx;if(X*T>C.from*T||X*T+T<end)continue;n++;
    const feet=(R.at[1]+ty)*T,lv=atX[X]??atX[X+1]??atX[X-1];if(lv===undefined||feet-3<=lv-C.tide.reach)bad.push(`${R.id}:${tx},${ty}`);
    const pit=R.id==='f1'&&tx>=14&&tx<=25;if(!pit&&before[X]!==undefined&&feet-12>before[X])wet.push(`${R.id}:${tx},${ty}`)}
  ok(n>80&&!bad.length,`no safe perch: all ${n} standable floor tiles on the way are inside the eel's reach (${C.tide.reach} px over the water) when it passes${bad.length?': '+bad.slice(0,6).join(' '):''}`);
  ok(!wet.length,`ahead of the snout every floor but Shallows' pit stays dry to his middle (the sheet is shallow): ${wet.length?'wet at '+wet.slice(0,6).join(' '):'levels '+C.tide.lv.map(l=>l[1]).join(', ')}`);
  ok(FL.every(R=>R.torches.length>0),`a torch in every chase room (b10 ${B.torches.length}, f2 ${F2.torches.length}, f1 ${F1.torches.length})`);
}

/* ---------------- states ---------------- */
const full={root:1,board:1};
function chaseBase(items=full,assist=0){const S=newState();Object.assign(S,{lit:1,litT:60,match:1,mode:'play',assist});Object.assign(S.items,items);S.latch.f2=1;S.p.root=items.root?1:0;S.p.dc=items.board?1:0;return S}
const pedX=(B.pedestals[0].tx)*T,pedFeet=(B.pedestals[0].ty+1)*T;
function atPedestal(items=full,assist=0){const S=chaseBase(items,assist),t=B.torches.find(t=>t.tx===57)||B.torches[B.torches.length-1];E.enterRoom(S,'b10',{x:pedX+T+4,y:pedFeet-PH});S.cp={room:'b10',tx:t.tx,ty:t.ty};S.torches['b10:'+t.tx+','+t.ty]=1;run(S,3,I());return S}
function atTorch(room,tx,ty,items=full,assist=0){const S=chaseBase(items,assist);S.pieces[FT]=1;S.chase={id:'flood',on:1,x:0,t:0,w:0};S.cp={room,tx,ty};E.enterRoom(S,room,E.spot(S,ROOMS[room],tx,ty));CH.resetChase(S);E.step(S,I(),[]);return S}

console.log('the fragment and the start of the chase');
{ const S=atPedestal();const ev=run(S,30,I({l:1}));
  ok(S.pieces[FT]===1&&ev.includes('piece')&&ev.includes('chase_start'),'walking into the pedestal lifts the Flood fragment and wakes the chase');
  ok(S.chase&&S.chase.id==='flood'&&S.chase.on===1&&Number.isFinite(S.chase.y)&&Number.isFinite(S.chase.l),'chase state is plain numbers: '+JSON.stringify(S.chase));
  /* the 2 s beat: the eel does not move, the water swells over the lair's rim and spreads */
  const T0=atPedestal();run(T0,1,I({l:1}));while(!T0.chase)run(T0,1,I({l:1}));const x0=T0.chase.x;let moved=false;const rimY=pedFeet;
  const tops=[];while(T0.chase.t<0){run(T0,1,I());if(T0.chase.x!==x0)moved=true;const D=T0.liq.tide;tops.push(D?D.top.filter(y=>y>=0&&y<rimY).length:0)}
  ok(!moved&&tops.length>=C.beat-2,`for its ${(C.beat/60).toFixed(0)} s beat the eel waits in its lair`);
  const k1=tops.findIndex(n=>n>0);ok(k1>0&&k1<C.beat*.75&&tops[tops.length-1]>tops[k1],`...while the tide visibly swells over the rim: water above it after ${(k1/60).toFixed(1)} s, ${tops[tops.length-1]} columns by the end`);
  run(T0,60,I());ok(T0.chase.x<x0-30,`then it comes west (${((x0-T0.chase.x)/60).toFixed(2)} px/frame)`);
  ok(run(S,30,I({l:1})).filter(e=>e==='piece').length===0&&S.pieces[FT]===1,'the pedestal is empty after: lifting happens once');
  const gapT=C.from-B.at[0]-B.pedestals[0].tx;ok(gapT>=6,`the fragment stands ${gapT} tiles west of the eel's snout in its lair, so lifting it never touches the eel`);
}

/* ---------------- the eel and the water ---------------- */
console.log('the eel and its tide');
{ /* its snout kills, inside its reach; he can jump clear above it only into its back */
  const S=atTorch('f2',35,15);S.p.inv=0;run(S,5,I());S.chase.x=wx(S)+S.p.w+10;S.chase.t=0;let ev=[];for(let i=0;i<30&&!ev.includes('die');i++)ev=E.step(S,I(),[]);
  ok(ev.includes('die')&&S.flash==='chase','the eel touching him glitches him out');
  let rz=[];for(let i=0;i<60&&!rz.includes('rez');i++)rz=E.step(S,I(),[]);
  const back=(F2.at[0]+35)*T+T/2+C.gap;ok(rz.includes('rez')&&S.room==='f2'&&Math.abs(S.chase.x-back)<=2*C.path[0][1]+1e-9&&S.chase.on,`  ...he is back at the f2 torch and the eel restarted ${((S.chase.x-wx(S))/T).toFixed(1)} tiles east of him (gap ${C.gap} px), not at the lair`);
  ok(S.chase.y===TD.levelAt(C,S.chase.x)&&S.chase.l===C.tide.lip,'  ...with the tide back at its level there');
  /* ahead of it, in its water: not lethal, he floats and swims in a pool under the tide */
  const W=atTorch('f2',35,15);W.p.inv=0;W.chase.t=-1e6;W.p.x=44*T;W.p.y=17*T;W.chase.x=wx(W)+W.p.w+60;run(W,1,I());
  let dead=false,wet=0;for(let i=0;i<180;i++){const e=E.step(W,I(),[]);if(e.includes('die'))dead=true;if(L.inTide(W.liq,W.p.x+PW/2,W.p.y+PH/2))wet++}
  ok(!dead&&wet>100&&!W.p.ground,`in the tide ahead of the eel he floats (${wet} of 180 frames under its line), and lives`);
  /* the board surfs the sheet over a floor */
  const U=atTorch('f2',35,15);U.chase.t=-1e6;U.p.x=28*T;U.p.y=16*T-PH;U.chase.x=wx(U)+U.p.w+16;run(U,20,I());
  const q0=L.tideCol(U.liq,U.p.x+PW/2);let surf=0;const ue=[];for(let i=0;i<40;i++){ue.push(...E.step(U,I({l:1,bp:i===2?1:0}),[]));if(U.p.surf&&L.tideCol(U.liq,U.p.x+PW/2))surf++}
  ok(q0&&q0.top>U.p.y+PH-10&&ue.includes('dash')&&ue.includes('surf')&&surf>5,`standing in the sheet (${(16*T-q0.top).toFixed(0)} px deep), a dash lands the board on the tide and he surfs it`);
  /* never past the safe line */
  const N=atTorch('f1',3,15);N.chase.x=end;let lead=1e9;for(let i=0;i<200;i++){E.step(N,I(),[]);if(N.chase)lead=Math.min(lead,TD.leadX(N.chase,C))}
  ok(lead>=end&&lead>=ROOMS.b7.at[0]*T+ROOMS.b7.w*T,`the water never runs past the safe line into Undertow (its edge at least x ${(lead/T).toFixed(1)})`);
}

/* ---------------- the route, leg by leg (tagged by room, so a run can start at any torch) ---------------- */
const HOLD=(S,rec,dir,t,max=900)=>Bot.walk(S,rec,dir,t,max);
const LEGS=[
  ['b10',(S,r)=>S.pieces[FT]||Bot.walk(S,r,'l',S=>S.pieces[FT],120)],
  /* the grotto pool: from its east bank, dash, surf west with the current, onto the west floor */
  /* up the steps from the shrine to the pool's east floor */
  ['b10',(S,r)=>S.p.x<38*T||Bot.go(S,r,'l',S=>S.p.ground&&S.p.x<38*T&&ft(S)<=20*T+.1,{max:1500,any:false})],
  /* the grotto pool: from its east bank, dash, surf west with the current, onto the west floor */
  ['b10',(S,r,o)=>S.p.x<16*T||(Bot.walk(S,r,'l',S=>S.p.x<=33*T,600)&&(o.board?Bot.plan(S,r,'l',S=>S.p.surf,{dashes:[1,2,3,4,6],any:true}):Bot.walk(S,r,'l',S=>!S.p.ground,60))&&
    (o.board?HOLD(S,r,'l',S=>S.p.ground&&S.p.x<18*T,400):Bot.swim(S,r,'l',S=>S.p.ground&&S.p.x<18*T,900)))],
  ['b10',(S,r)=>Bot.go(S,r,'l',S=>S.room==='f2',{max:900})],
  /* the cove pool (it flows west): from its east bank, dash and surf, onto the gate side */
  ['f2',(S,r,o)=>S.p.x<36*T||(Bot.walk(S,r,'l',S=>S.p.x<=52*T,300)&&(o.board?Bot.plan(S,r,'l',S=>S.p.surf,{dashes:[1,2,3,4,6],any:true}):Bot.walk(S,r,'l',S=>!S.p.ground,60))&&
    (o.board?HOLD(S,r,'l',S=>S.p.ground&&S.p.x<35*T,400):Bot.swim(S,r,'l',S=>S.p.ground&&S.p.x<35*T,900)))],
  /* through the open gate, over the crab, up the two steps, out west */
  ['f2',(S,r)=>Bot.go(S,r,'l',S=>S.room==='f1',{max:1200})],
  /* Shallows: off the shelf onto the lane (the board), across, then the pit under the low ceiling, and out at the door */
  ['f1',(S,r,o)=>S.p.x<30*T||(o.board?(S.p.y+PH<=144.1?Bot.walk(S,r,'l',S=>!S.p.ground&&S.p.x<50*T,300):true)&&Bot.plan(S,r,'l',S=>S.p.surf,{dashes:[1,2,4,6,8,10,14],any:true})&&HOLD(S,r,'l',S=>S.p.ground&&S.p.x<=29*T,600):
    Bot.walk(S,r,'l',S=>!S.p.ground,200)&&Bot.walk(S,r,'',S=>S.p.ground||ft(S)>13*T,200)&&Bot.swim(S,r,'l',S=>S.p.ground&&S.p.x<=29*T&&ft(S)<=192.1))],
  ['f1',(S,r,o)=>S.p.x<14*T||(Bot.walk(S,r,'l',S=>S.p.x<=26*T+1,200)&&(o.board?
    Bot.plan(S,r,'l',S=>S.p.surf,{dashes:[1,2,3],any:true})&&Bot.plan(S,r,'l',S=>S.p.ground&&S.p.x<14*T&&ft(S)<=192.1,{jumps:R20.map(i=>i*2),roots:[10,14,18,22,26,30],max:200}):
    Bot.walk(S,r,'l',S=>!S.p.ground,60)&&Bot.walk(S,r,'',S=>S.p.ground||S.liq.wet||ft(S)>21*T,200)&&Bot.swim(S,r,'l',S=>S.p.ground&&S.p.x<17*T,900)&&Bot.go(S,r,'l',S=>S.p.ground&&S.p.x<14*T&&ft(S)<=192.1,{max:400,any:false})))],
  ['f1',(S,r)=>Bot.go(S,r,'l',S=>!S.chase||!S.chase.on,{max:600})],
];
/* pause: frames he stands and looks as he enters each room (the hesitant bot). Returns the recorded inputs, whether he
   crossed the safe line with no death, the closest the eel came per room (px), and when he touched each torch */
function chaseRun(S,{pause=0,board=1}={}){
  const rec=[],near={},cps=[];let died=0,last=null,ok=true,t0=S.t,done=-1;
  LOG=(S,ev)=>{if(ev.includes('die'))died++;if(ev.includes('cp'))cps.push([S.room+':'+S.cp.tx,S.t-t0]);if(ev.includes('chase_done'))done=S.t-t0;
    if(S.chase&&S.chase.on&&S.chase.t>0)near[S.room]=Math.min(near[S.room]??1e9,S.chase.x-(wx(S)+S.p.w))};
  try{for(const [room,leg] of LEGS){if(S.room!==room)continue;
    if(pause&&S.room!==last&&S.pieces[FT]){if(!Bot.idle(S,rec,pause)){ok=false;break}last=S.room}
    const had=S.pieces[FT];if(!leg(S,rec,{board})){ok=false;break}
    if(pause&&!had&&S.pieces[FT]){if(!Bot.idle(S,rec,pause)){ok=false;break}last=S.room}}}finally{LOG=null}   /* at the pedestal: the pause comes after the lift */
  return {ok:ok&&!died&&done>=0&&S.chase&&!S.chase.on,rec,near,died,S,cps,secs:done/60,stuck:ok?'':S.room+' x '+(S.p.x/T).toFixed(1)};
}
const secs=near=>Object.entries(near).map(([k,d])=>`${k} ${(d/T).toFixed(1)} tiles (${(d/(CH.speedAt(C,(ROOMS[k].at[0]+ROOMS[k].w/2)*T)*60)).toFixed(1)} s)`).join(', ');

console.log('caught by the water at a step');
{ /* at the foot of every step on the way, with the eel 5 tiles behind him (its water already round his feet), he climbs to
     the next floor alive: with the root, and with the root alone (no board is pressed here) */
  const STEPS=[['b10',55,27,25],['b10',49,25,23],['b10',39,23,20],['b10',16.5,20,18],['b10',10.5,18,16],['f2',9.5,16,14],['f2',8.2,14,12],['f1',1.6,16,14],['f1',16.1,21,16]];
  const notes=[];let all=true,wetN=0;
  for(const [room,tx,feet,up] of STEPS)for(const items of [full,{root:1}]){
    const S=chaseBase(items);S.pieces[FT]=1;S.chase={id:'flood',on:1,x:0,t:0,w:0};S.cp={room,tx:Math.floor(tx),ty:feet-1};E.enterRoom(S,room,{x:tx*T-PW/2,y:feet*T-PH});CH.resetChase(S);run(S,2,I());
    S.chase.x=wx(S)+S.p.w+60;S.chase.y=TD.levelAt(C,S.chase.x);S.chase.t=0;run(S,1,I());const inWater=!!L.tideCol(S.liq,S.p.x+PW/2);
    const r=[],won=Bot.go(S,r,'l',S=>S.room!==room||(S.p.ground&&ft(S)<=up*T+.1&&S.p.x<tx*T-PW),{max:400,any:false});
    if(!won)all=false;if(inWater)wetN++;notes.push(`${room}:${tx}${items.board?'':' (root only)'} ${won?(r.length/60).toFixed(1)+'s':'CAUGHT'}${inWater?' in water':' (dry: the snout is a floor lower)'}`)}
  ok(all&&wetN>=6,`from the foot of each step, the eel 5 tiles behind (its water round his feet where it has reached his floor), he gets up the step alive: ${notes.join('; ')}`);
}

console.log('the chase with the board and the root');
let CLEAN=null;
{ const A=chaseRun(atPedestal());CLEAN=A;
  ok(A.ok,`a clean run from the pedestal outruns the eel to the safe line in ${A.secs.toFixed(1)} s (R10: 30-45 s)${A.ok?'':' STUCK '+A.stuck}; closest: ${secs(A.near)}`);
  const B0=atPedestal();let died=0,done=0,lo=1e9;for(const c of A.rec){const ev=E.step(B0,dec(c),[]);if(ev.includes('die'))died++;if(ev.includes('chase_done'))done++;if(B0.chase&&B0.chase.on)lo=Math.min(lo,B0.chase.x-(wx(B0)+B0.p.w))}
  ok(!died&&done===1&&B0.room==='f1'&&lo>0,`replaying the recorded inputs: no death, chase_done once, in Shallows, closest ${lo.toFixed(0)} px`);
  const gaps=A.cps.map((c,i)=>(c[1]-(i?A.cps[i-1][1]:0))/60);
  ok(A.ok&&Math.max(...gaps,A.secs-(A.cps.length?A.cps[A.cps.length-1][1]/60:0))<=12,`checkpoint torches about every 10 s of the run: ${A.cps.map((c,i)=>c[0]+' at '+(c[1]/60).toFixed(1)+' s').join(', ')} (longest stretch ${Math.max(...gaps).toFixed(1)} s)`);
  run(B0,CH.WITHER+5,I());ok(B0.chase===null&&!B0.liq.tide,'outrun, the eel sinks and the tide drains away (chase and tide cleared)');
  const H=chaseRun(atPedestal(),{pause:60});
  ok(H.ok,`a hesitant bot (1 s still in every room, the pedestal included) still clears it (${H.secs.toFixed(1)} s)${H.ok?'':' STUCK '+H.stuck}; closest: ${secs(H.near)}`);
}
{ /* from every torch on the way, after a death there, clean and hesitant */
  const notes=[];let all=true;
  for(const R of FL)for(const t of R.torches)for(const pause of [0,60]){const r=chaseRun(atTorch(R.id,t.tx,t.ty),{pause});if(!r.ok)all=false;
    notes.push(`${R.id}:${t.tx},${t.ty}${pause?'+1s':''} ${r.ok?r.secs.toFixed(1)+'s, closest '+(Math.min(...Object.values(r.near))/T).toFixed(1)+' tiles':'FAIL '+r.stuck}`)}
  ok(all,`restarted at every torch (and hesitating 1 s per room) he clears it: ${notes.join('; ')}`);
}
console.log('Assist');
{ const v=(it,s)=>{const S=atPedestal(it,s);run(S,1,I({l:1}));while(!S.chase)run(S,1,I({l:1}));S.p.inv=1e6;while(S.chase.t<0)run(S,1,I());const x0=S.chase.x;run(S,60,I());return (x0-S.chase.x)/60};
  const n=v(full,0),a=v(full,1);ok(Math.abs(a/n-CH.ASSIST_SPEED)<.01,`Assist slows the eel to 70% (${n.toFixed(3)} -> ${a.toFixed(3)} px/frame)`);
  const S=atTorch('f2',35,15,full,1),g=S.chase.x-((F2.at[0]+35)*T+T/2);ok(Math.abs(g-C.gap*CH.ASSIST_GAP)<1e-9,`...and restarts it further behind the torch (${g} px, not ${C.gap})`);
  const A=chaseRun(atPedestal(full,1));ok(A.ok,`with Assist the clean run clears it too (${A.secs.toFixed(1)} s)`);
  ok(JSON.stringify(ROOMS.b10.g)===JSON.stringify((await import(G+'rooms/flood_b10.js')).default.grid),'Assist changes no layout');
}

console.log('determinism, snapshots, saves');
{ const S=atPedestal();const script=i=>I({l:i%170<140,r:i%170>=150,j:i%23<8,jp:i%23===0,bp:i%37===5});
  run(S,200,script);const snap=snapshot(S);const tr=[];for(let i=0;i<500;i++){E.step(S,script(i),[]);if(S.chase)tr.push(S.chase.x,S.chase.y)}
  const S2=newState();restore(S2,JSON.parse(JSON.stringify(snap)));const tr2=[];for(let i=0;i<500;i++){E.step(S2,script(i),[]);if(S2.chase)tr2.push(S2.chase.x,S2.chase.y)}
  ok(tr.length>200&&JSON.stringify(tr)===JSON.stringify(tr2)&&JSON.stringify(S)===JSON.stringify(S2),`the chase and its tide are deterministic through a JSON snapshot round trip (${tr.length/2} frames, eel ${(tr[0]/T).toFixed(1)}..${(tr[tr.length-2]/T).toFixed(1)}, level ${tr[1]}..${tr[tr.length-1]})`);
  ok(snap.liq&&snap.liq.tide&&Array.isArray(snap.liq.tide.top)&&snap.liq.tide.top.some(y=>y>=0),'the snapshot carries the tide\'s columns (plain arrays in S.liq)');
  const d=persist(S);ok(d.chase&&d.chase.id==='flood'&&!('liq' in d),'the save keeps the running chase (id, x), never the water');
  const R2=resume(newState(),JSON.parse(JSON.stringify(d)));R2.cp={room:'f2',tx:35,ty:15};CH.resetChase(R2);
  ok(R2.chase.on&&R2.chase.y===TD.levelAt(C,R2.chase.x)&&R2.chase.x===(F2.at[0]+35)*T+T/2+C.gap,'reloaded mid-chase, the eel and its tide restart behind his torch');
  const Q=atTorch('f2',35,15);let prev=-1,mono=true,q4=true;for(let i=0;i<1200&&Q.chase&&Q.chase.on;i++){if(E.step(Q,I(),[]).includes('die'))break;const v=CH.progress(Q);if(v<prev-1e-9)mono=false;prev=v;if(Math.round(v*4)/4<0||Math.round(v*4)/4>1)q4=false}
  ok(mono&&q4&&prev>0,`progress() (the OS 'flood' level, in quarters) only grows while the tide comes on (${prev.toFixed(2)} when it caught him)`);
}

console.log('the end of the chase and the way home');
{ const S=CLEAN.S;ok(S.room==='f1'&&S.chase&&!S.chase.on&&S.p.x<3*T,'the chase ends at the safe line, by Shallows\' west door');
  run(S,CH.WITHER+5,I());ok(!S.chase&&!S.liq.tide,'a second later the eel and its water are gone');
  S.items.board=0;S.p.dc=0;   /* the long walk home needs no board */
  const rec=[];const st=(n,f)=>{const r=f();if(!r)note('way home stuck at '+n+' '+S.room+' '+(S.p.x/T).toFixed(1)+','+(ft(S)/T).toFixed(1));return r};
  const won=st('b7',()=>Bot.go(S,rec,'l',S=>S.room==='b7'))&&st('b7 down',()=>Bot.go(S,rec,'l',S=>ft(S)>=12*T-.1&&S.p.ground,{ks:[-1],any:false}))&&st('b7 west',()=>Bot.go(S,rec,'l',S=>S.p.ground&&S.p.x<10*T&&ft(S)<=12*T+.1,{any:false}))&&
    st('b7 up 1',()=>Bot.go(S,rec,'l',S=>S.p.ground&&ft(S)<=9*T+.1,{any:false,max:200}))&&st('b7 up 2',()=>Bot.go(S,rec,'r',S=>S.p.ground&&ft(S)<=6*T+.1,{any:false,max:200}))&&st('b7 up 3',()=>Bot.go(S,rec,'r',S=>S.p.ground&&ft(S)<=4*T+.1&&S.p.x>=14*T,{any:false,max:200}))&&
    st('b7 hole',()=>Bot.go(S,rec,'r',S=>S.p.x>=18*T+3,{ks:[-1],max:200}))&&st('b6',()=>Bot.go(S,rec,'r',S=>S.room==='b6'&&S.p.ground,{ks:[0],rs:Array.from({length:30},(_,i)=>i+1),hs:[1,4,8,12,16,9999],max:150,any:false}))&&
    st('b6 1',()=>Bot.go(S,rec,'r',S=>S.p.ground&&ft(S)<=13*T+.1,{any:false,max:200}))&&st('b6 2',()=>Bot.go(S,rec,'r',S=>S.p.ground&&S.p.x>=19*T&&ft(S)<=14*T+.1,{any:false}))&&st('b6 3',()=>Bot.go(S,rec,'r',S=>S.p.ground&&ft(S)<=11*T+.1,{any:false,max:200}))&&
    st('b6 4',()=>Bot.go(S,rec,'l',S=>S.p.ground&&ft(S)<=7*T+.1,{any:false,max:200}))&&st('b6 5',()=>Bot.go(S,rec,'l',S=>S.p.ground&&ft(S)<=4*T+.1,{any:false,max:200}))&&
    ['b5','b4','b3','b2','b1','hub'].every(n=>st(n,()=>Bot.go(S,rec,'l',S=>S.room===n,{max:1800})));
  ok(won&&S.room==='hub'&&S.pieces[FT]===1,`no softlock: with no board, from the safe line through Undertow, up Tidefall and west to the hub with the fragment (${(rec.length/60).toFixed(1)} s; the stages are tools/test_flood.mjs's way home)`);
}

console.log('the way in (board + root)');
const farFloor=S=>S.room==='f1'&&S.p.ground&&S.p.x+PW>26*T+2&&ft(S)<=192.1&&S.p.x<30*T,shelf=S=>S.room==='f1'&&S.p.ground&&S.p.x>=50*T&&ft(S)<=144.1,crabOf=S=>S.ens.find(e=>e.k==='crab');
const IN={
  f1:(S,rec)=>Bot.walk(S,rec,'r',S=>S.items.board&&S.p.ground,400)&&Bot.walk(S,rec,'r',S=>S.p.x+PW>=14*T-1,400)&&Bot.plan(S,rec,'r',S=>S.p.surf,{jumps:[0,1],dashes:[1,2,3,4,6,8],any:true})&&
    Bot.plan(S,rec,'r',farFloor,{jumps:R20.map(i=>i*2),roots:[10,14,18,22,26,30],max:200})&&Bot.walk(S,rec,'r',S=>S.p.x+PW>=30*T-1,400)&&
    Bot.plan(S,rec,'r',shelf,{jumps:Array.from({length:50},(_,i)=>60+i*3),roots:[0,14,18,22,26],dashes:[1,4],max:400})&&Bot.walk(S,rec,'r',S=>S.room==='f2',600),
  f2:(S,rec)=>Bot.walk(S,rec,'r',S=>S.p.ground&&ft(S)>=192-.1&&S.p.x>=11*T,400)&&Bot.plan(S,rec,'r',S=>crabOf(S).wrap>0,{waits:Array.from({length:40},(_,i)=>i*6),dashes:[1,6,12,20,30],holds:[999,6,12],any:true,max:120})&&
    Bot.walk(S,rec,'r',S=>S.gate>=.5,300)&&Bot.plan(S,rec,'r',S=>S.p.ground&&S.p.on<0&&S.p.x>crabOf(S).x+14,{jumps:[1],max:120})&&Bot.walk(S,rec,'r',S=>S.latch.f2===1&&S.p.x>34*T,300)&&
    Bot.walk(S,rec,'r',S=>S.p.x+PW>=36*T-1,200)&&Bot.plan(S,rec,'r',S=>S.p.surf,{dashes:[1,2,3],any:true})&&Bot.walk(S,rec,'r',S=>S.p.ground&&S.p.x>=52*T&&ft(S)<=192.1,600)&&Bot.walk(S,rec,'r',S=>S.room==='b10',300),
  /* the grotto pool against its current: dash and surf east (slower), onto the east floor, on to the pedestal */
  b10:(S,rec)=>Bot.walk(S,rec,'r',S=>S.p.ground&&S.p.x+PW>=18*T-1&&ft(S)>=20*T-.1,600)&&Bot.plan(S,rec,'r',S=>S.p.surf,{dashes:[1,2,3,4],any:true})&&Bot.walk(S,rec,'r',S=>S.p.ground&&S.p.x>=32*T,600)&&Bot.walk(S,rec,'r',S=>S.pieces[FT]===1,900),
};
{ const S=playState('f1',3*T,192-PH,{root:1});run(S,3,I());const rec=[],start=snapshot(S);
  const won=IN.f1(S,rec)&&IN.f2(S,rec)&&IN.b10(S,rec);
  ok(won&&S.pieces[FT]===1&&S.chase&&S.chase.id==='flood',`from Shallows' west door: the board, Hermit Cove, Eel Grotto, the fragment lifted and the chase awake (${(rec.length/60).toFixed(1)} s of bot play)`);
  restore(S,start);let died=0,seen=[];for(const c of rec){if(E.step(S,dec(c),[]).includes('die'))died++;if(seen[seen.length-1]!==S.room)seen.push(S.room)}
  ok(won&&!died&&S.pieces[FT]===1,`replayed exactly: no deaths, rooms ${seen.join(' > ')}`);
  const W=playState('b10',3*T,16*T-PH,{root:1}),r=[];W.latch.f2=1;run(W,3,I());   /* no board: the grotto pool by swimming against its current */
  const sw=Bot.walk(W,r,'r',S=>S.liq.wet||!S.p.ground&&S.p.x>=17*T,900)&&Bot.swim(W,r,'r',S=>S.p.ground&&S.p.x>=32*T,2400)&&Bot.walk(W,r,'r',S=>S.pieces[FT]===1,900);
  ok(sw,`without the board the grotto pool is a slow swim against its current, then the pedestal (${(r.length/60).toFixed(1)} s): the fragment room never needs an item to see`);
}
{ /* from the hub, the whole Flood chain (b1-b7 with the root only, as tools/test_flood.mjs, which other work is reshaping) */
  const COPY={
    b1:(S,rec)=>Bot.go(S,rec,'r',S=>S.room==='b2'),b2:(S,rec)=>Bot.go(S,rec,'r',S=>S.room==='b3'),
    b3:(S,rec)=>Bot.go(S,rec,'r',S=>S.room==='b3'&&S.p.ground&&S.p.x>=28*T&&ft(S)<=12*T+.1,{any:false})&&Bot.walk(S,rec,'',S=>S.p.ground&&!S.p.buf,60)&&Bot.walk(S,rec,'r',S=>S.p.x>=29.4*T,120)&&
      Bot.plan(S,rec,'l',S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x<28*T,{jumps:[4,6,8,10,12],max:200})&&Bot.go(S,rec,'l',S=>S.p.ground&&ft(S)<=9*T+.1&&S.p.x<=11.5*T,{ks:[-1],any:false,max:600})&&
      Bot.go(S,rec,'r',S=>S.p.ground&&ft(S)<=6*T+.1,{any:false,max:200})&&Bot.go(S,rec,'r',S=>S.room==='b4',{max:600}),
    b4:(S,rec)=>Bot.go(S,rec,'r',S=>S.room==='b5'),b5:(S,rec)=>Bot.go(S,rec,'r',S=>S.room==='b6'),
    b6:(S,rec)=>Bot.go(S,rec,'r',S=>S.p.x>16*T)&&Bot.go(S,rec,'r',S=>ft(S)>=11*T-.1,{ks:[-1],any:false})&&Bot.go(S,rec,'l',S=>S.p.x<=8*T+1,{ks:[-1],max:600})&&
      Bot.go(S,rec,'l',S=>S.p.ground&&ft(S)<=13*T+.1,{ks:[0],rs:[2,4,6,8,10],max:120,any:false})&&Bot.go(S,rec,'l',S=>S.room==='b7',{ks:[-1],max:300}),
    b7:(S,rec)=>Bot.go(S,rec,'l',S=>S.p.x<8*T,{ks:[-1],any:false})&&Bot.go(S,rec,'r',S=>S.p.x>=32*T&&ft(S)<=12*T+.1,{max:1500,any:false})&&
      Bot.go(S,rec,'r',S=>ft(S)<=9*T+.1,{any:false,hs:[9999,10,20,30]})&&Bot.go(S,rec,'r',S=>ft(S)<=5*T+.1,{any:false,hs:[9999,10,20,30]})&&Bot.go(S,rec,'r',S=>S.room==='f1'),
  };
  /* the live routes from tools/test_flood.mjs (other work is reshaping b1-b7), else the copy above */
  let ROUTE=null;try{const src=fs.readFileSync(new URL('./test_flood.mjs',import.meta.url),'utf8'),m=/\nconst ROUTE=(\{[\s\S]*?)\n\};/.exec(src);if(m)ROUTE=new Function('Bot','T','ft','return '+m[1]+'\n}')(Bot,T,ft)}catch(e){note('could not read ROUTE from tools/test_flood.mjs: '+e.message)}
  if(!ROUTE||!['b1','b2','b3','b4','b5','b6','b7'].every(k=>typeof ROUTE[k]==='function'))ROUTE=COPY;else note('b1-b7 routes read live from tools/test_flood.mjs');
  const S=playState('hub',12*T,192-PH,{root:1});run(S,3,I());const rec=[];let at='hub',won=Bot.go(S,rec,'r',S=>S.room==='b1');
  for(const id of ['b1','b2','b3','b4','b5','b6','b7']){if(!won)break;at=id;won=ROUTE[id](S,rec)}
  if(won){at='f1';won=IN.f1(S,rec)}if(won){at='f2';won=IN.f2(S,rec)}if(won){at='b10';won=IN.b10(S,rec)}
  ok(won&&S.pieces[FT]===1&&S.chase&&S.chase.on,`from the hub by script: b1-b7 with the root, the board in f1, f2, b10 and the fragment (${(rec.length/60).toFixed(1)} s)${won?'':' STUCK in '+at+' at '+S.room+' '+(S.p.x/T).toFixed(1)+','+(ft(S)/T).toFixed(1)+' (b1-b7 routes from test_flood.mjs; if those rooms are mid-edit, re-run)'}`);
  if(won){const r=chaseRun(S);ok(r.ok,`...and straight on, the chase from there (${r.secs.toFixed(1)} s)`)}
}

console.log('root only (reported, not required)');
{ const A=chaseRun(atPedestal({root:1}),{board:0});note(`root only, from the pedestal: ${A.ok?'clears it in '+A.secs.toFixed(1)+' s, closest '+secs(A.near):'caught ('+A.stuck+'; '+A.died+' death)'}`);
  const notes=[];for(const R of FL)for(const t of R.torches){const r=chaseRun(atTorch(R.id,t.tx,t.ty,{root:1}),{board:0});notes.push(`${R.id}:${t.tx},${t.ty} ${r.ok?r.secs.toFixed(1)+'s':'caught in '+r.stuck}`)}
  note('root only, from each torch: '+notes.join('; '));
  const H=chaseRun(atPedestal({root:1},1),{board:0});note(`root only with Assist, from the pedestal: ${H.ok?'clears it in '+H.secs.toFixed(1)+' s':'caught ('+H.stuck+')'}`);
}

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails?1:0);
