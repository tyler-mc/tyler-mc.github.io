// Logic tests for game/ (world step, rooms, save). Plain node, no deps: node tools/test_game.mjs
const G=new URL('../game/',import.meta.url).href;
const {T,newState,snapshot,restore,persist,save,load,resume}=await import(G+'state.js');
const E=await import(G+'engine.js');
const {ROOMS,ORDER,roomAtTile}=await import(G+'rooms/index.js');
const P=await import(G+'player.js');
let fails=0,passes=0;
const ok=(c,msg)=>{if(c){passes++;console.log('  ok  ',msg)}else{fails++;console.log('  FAIL',msg)}};
const I=(o={})=>({l:0,r:0,u:0,d:0,j:0,jp:0,drag:null,any:0,...o});
function playState(room,x,y,items={}){const S=newState();Object.assign(S,{lit:1,litT:60,match:1,mode:'play'});Object.assign(S.items,items);E.enterRoom(S,room,{x,y});if(items.root)S.p.root=1;return S}
const run=(S,n,f)=>{const evs=[];for(let i=0;i<n;i++)evs.push(...E.step(S,typeof f==='function'?f(i,S):f,[]));return evs};
const mem=()=>({d:{},getItem(k){return this.d[k]??null},setItem(k,v){this.d[k]=String(v)},removeItem(k){delete this.d[k]}});
const FLOOR=192,PH=P.PH;
/* Deep Roots: its seven ledges from the bottom, [top row, side, edge column]. A left ledge spans cols 0..edge, a right one edge..23 */
const R4L=[[30,'L',8],[26,'R',13],[21,'L',8],[17,'R',14],[12,'L',8],[9,'R',15],[6,'L',11]];
/* on that ledge: feet at or above its top, grounded, with at least 6 px of him over it (he can stand with a third of him past the edge) */
const r4on=([row,side,e])=>S=>S.p.on<0&&S.p.ground&&S.p.y+PH<=row*T+.1&&(side==='R'?S.p.x>=e*T-12:S.p.x<=(e+1)*T-6);
/* the lip of a ledge on the way to the next one: [direction, world px x to stand at] */
/* standing on that ledge now (feet at its top, over its span) */
const r4here=([row,side,e])=>S=>S.p.on<0&&S.p.ground&&Math.abs(S.p.y+PH-row*T)<1.5&&(side==='R'?S.p.x+P.PW>e*T:S.p.x<(e+1)*T);
const r4lip=([row,side,e])=>side==='L'?['r',(e+1)*T-P.PW-2]:['l',e*T+2];
/* walk to a lip with a run-up: back off `run` px (30; 14 going down, so he stays off the Mossback's patch) first if he is within that of it (landing leaves him moving the wrong way), then run at it */
const r4toLip=(S,rec,dir,lip,l,run=30)=>{const back=dir==='r'?'l':'r',near=dir==='r'?S.p.x>lip-run:S.p.x<lip+run;
  if(near&&!Bot.walk(S,rec,back,S=>dir==='r'?S.p.x<=lip-run:S.p.x>=lip+run,200,l))return false;
  return Bot.walk(S,rec,dir,S=>dir==='r'?S.p.x>=lip:S.p.x<=lip,400,l)};

console.log('rooms');
for(const id of ORDER){const R=ROOMS[id];
  ok(R.g.every(r=>r.length===R.w),`${id}: all rows ${R.w} wide`);
  for(const s of R.spawns.filter(s=>s.k==='M')){const n=[[0,1],[-1,0],[1,0],[0,-1]].some(([a,b])=>'#=G^X'.includes(E.tile(R,s.tx+a,s.ty+b)??'#'));ok(n,`${id}: Mossback at ${s.tx},${s.ty} touches a surface`)}
  ok(R.torches.length>0,`${id}: has a torch checkpoint`);
}
for(const id of ORDER){const R=ROOMS[id];
  const sides=[];for(let y=0;y<R.h;y++){sides.push([-1,y,0,y]);sides.push([R.w,y,R.w-1,y])}for(let x=0;x<R.w;x++){sides.push([x,-1,x,0]);sides.push([x,R.h,x,R.h-1])}
  let bad=0;for(const [ox,oy,ix,iy] of sides){const N=roomAtTile(R.at[0]+ox,R.at[1]+oy),inside=R.g[iy][ix];
    const insideOpen=!'#=GX'.includes(inside);if(insideOpen&&!N&&id!=='hub'){bad++;console.log('    opening to nowhere',id,ix,iy)}
    if(N){const nc=N.g[R.at[1]+oy-N.at[1]][R.at[0]+ox-N.at[0]];if(insideOpen!==!'#=GX'.includes(nc)){bad++;console.log('    mismatch',id,ix,iy,'vs',N.id,nc)}}}
  ok(!bad,`${id}: edges match neighbours`);
  for(const [side,len,get] of [['left',R.h,i=>R.g[i][0]],['right',R.h,i=>R.g[i][R.w-1]]]){let run=0,min=99;for(let i=0;i<=len;i++){const o=i<len&&!'#=GX'.includes(get(i));if(o)run++;else{if(run)min=Math.min(min,run);run=0}}if(min<99)ok(min>=3,`${id}: ${side} openings >= 3 tiles (min ${min})`)}
}
ok(!!ROOMS.hub.start,'hub has a start tile');

console.log('jump physics');
{ const S=playState('r1',34*T,FLOOR-PH);run(S,5,I());
  let top=S.p.y,y0=S.p.y,air=0;run(S,1,I({j:1,jp:1}));for(let i=0;i<120;i++){run(S,1,I({j:1}));top=Math.min(top,S.p.y);if(!S.p.ground)air++;else break}
  const H=y0-top;console.log('    full jump height',H.toFixed(1),'px, airtime',air,'frames');ok(H>38&&H<46,'full jump ~3.5 tiles');
  const S2=playState('r1',34*T,FLOOR-PH);run(S2,5,I());let t2=S2.p.y;run(S2,1,I({j:1,jp:1}));for(let i=0;i<60;i++){run(S2,1,I());t2=Math.min(t2,S2.p.y)}
  const h2=S2.p.y-t2;ok(h2<H*.5&&h2>8,`variable jump: a tap is a short hop (${h2.toFixed(1)} px)`);
  const S3=playState('r1',34*T,FLOOR-PH,{root:1});run(S3,5,I());let t3=S3.p.y;run(S3,1,I({j:1,jp:1}));
  let fired=false;for(let i=0;i<120;i++){const ev=run(S3,1,!fired&&S3.p.vy>=0?I({j:1,jp:1}):I({j:1}));if(ev.includes('root'))fired=true;t3=Math.min(t3,S3.p.y);if(S3.p.ground)break}
  const H3=y0-t3;ok(fired&&H3>H+28&&H3<H+40,`root jump adds ~2.5 tiles (${H3.toFixed(1)} px total)`);
}

console.log('feel numbers');
/* characterisation: frames for each speed change on the real step(), hub floor at x 36 (open air above, no wall in reach).
   count() steps until vx is within 1e-9 of `want` (repeated +.2 leaves vx 1e-16 short of 1.6, and that last step is not
   motion); it gives -1 if a frame leaves the hub, has the wrong ground/air state, or changes vx by more than `rate` (a wall
   hit zeroing vx). The pinned numbers are the pre-Stage-1 values. */
{ const F=P.FEEL;
  const count=(S,inp,want,air,rate,max=80)=>{const far=()=>Math.abs(S.p.vx-want)>1e-9;let n=0,good=true;while(far()&&n<max){const v=S.p.vx;E.step(S,inp,[]);n++;
    if(S.room!=='hub'||!!S.p.ground===air||Math.abs(S.p.vx-v)>rate+1e-9)good=false}return good&&!far()?n:-1};
  const rest=()=>{const S=playState('hub',3*T,FLOOR-PH);S.ens=[];run(S,5,I());return S};
  const full=()=>{const S=rest();run(S,20,I({r:1}));return S};
  const air=()=>{const S=full();run(S,1,I({r:1,j:1,jp:1}));return S};   // jump with the direction still held: the press frame uses ground rates
  const near=(n,want)=>n>=want-1&&n<=want+1;
  ok(full().p.vx===F.RUN,'setup: 20 frames of holding right reaches full speed on the ground');
  let n=count(rest(),I({r:1}),F.RUN,false,F.ACC);ok(near(n,8),`ground, rest -> full speed: ${n} frames (pre-Stage-1: 8, +-1)`);
  n=count(full(),I(),0,false,F.DEC);ok(near(n,6),`ground, full speed -> stop with no input: ${n} frames (pre-Stage-1: 6, +-1)`);
  n=count(full(),I({l:1}),-F.RUN,false,Math.max(F.ACC,F.DEC));ok(near(n,13),`ground, full speed -> full speed the other way: ${n} frames (Stage 1 B2: 13, was 16, +-1)`);
  n=count(air(),I({j:1}),0,true,F.ADEC);ok(near(n,12),`air, full speed -> stop with no input: ${n} frames (Stage 1 B3: 12, was 23, +-1)`);
  n=count(air(),I({l:1,j:1}),-F.RUN,true,Math.max(F.AACC,F.AREV));ok(near(n,22),`air, full speed -> full speed the other way: ${n} frames (Stage 1 B4: 22, was 25, +-1)`);
}

console.log('coyote time');
// r1 step block cols 6-7 rows 13-15, top 156: walk right off its right edge (x=96) onto the thorn strip
for(const late of [0,2,4,5,6,8]){
  const S=playState('r1',76,156-PH);S.ens=[];run(S,5,I());
  let f=0;while(S.p.x<=96&&f<200){run(S,1,I({r:1}));f++}
  let off=0;while(S.p.ground&&off<50){run(S,1,I({r:1}));off++}
  run(S,late-1,I({r:1}));const ev=run(S,1,I({r:1,j:1,jp:1}));
  const jumped=ev.includes('jump');
  ok(late+1<=P.COY?jumped:!jumped,`press on airborne frame ${late+1} -> ${jumped?'jump':'no jump'} (window ${P.COY})`);
}

console.log('jump buffer');
for(const early of [2,5,6,9]){
  const S=playState('r1',34*T,FLOOR-PH-40);
  const C=snapshot(S);let land=0;while(!S.p.ground&&land<200){run(S,1,I());land++}
  restore(S,C);run(S,land-early,I());const evs=run(S,early+3,(i)=>i===0?I({j:1,jp:1}):I({j:1}));
  const jumped=evs.includes('jump');
  ok(early<=P.BUF?jumped:!jumped,`press ${early} frames before landing -> ${jumped?'jump on landing':'no jump'}`);
}
// regression: with the root, a press just before landing is a buffered ground jump, not a spent root hop
for(const early of [2,5]){
  const S=playState('hub',60,100,{root:1});const C=snapshot(S);let land=0;for(let i=0;i<100;i++){E.step(C,I(),[]);if(C.p.ground){land=i;break}}
  const evs=[];let minY=1e9;
  for(let i=0;i<90;i++){evs.push(...E.step(S,I({j:i>=land-early?1:0,jp:i===land-early?1:0}),[]));if(i>=land)minY=Math.min(minY,S.p.y)}
  const rise=FLOOR-PH-minY;
  ok(evs.includes('jump')&&!evs.includes('root')&&rise>38,`with the root, press ${early}f before landing -> full ground jump (${rise.toFixed(1)} px), root kept`);
}
{ // ...but falling onto a live enemy, the press still fires the root (the burst can save him)
  const S=playState('r1',27*T,40,{root:1});S.p.inv=0;const e=S.ens[0];S.p.x=e.x+e.w/2-9;S.p.y=e.y-PH-14;S.p.vy=2.5;
  const ev=run(S,1,I({j:1,jp:1}));ok(ev.includes('root'),'falling onto a live Mossback, the press fires the root burst');
}

console.log('root jump rules');
{ const S=playState('r1',76,156-PH,{root:1});S.ens=[];run(S,5,I());while(S.p.ground)run(S,1,I({r:1}));
  const ev=run(S,1,I({r:1,j:1,jp:1}));ok(ev.includes('jump')&&!ev.includes('root')&&S.p.root===1,'press in coyote window = ground jump, root kept');
  run(S,10,I({r:1,j:1}));const ev2=run(S,1,I({r:1,j:1,jp:1}));ok(ev2.includes('root')&&S.p.root===0,'air press = root burst, spent');
  const ev3=run(S,1,I({r:1,j:1,jp:1}));ok(!ev3.includes('root')&&S.p.buf>0,'second air press buffers instead');
}
{ const S=playState('r1',34*T,FLOOR-PH,{root:1});run(S,3,I());run(S,1,I({j:1,jp:1}));run(S,12,I({j:1}));run(S,1,I({j:1,jp:1}));
  let n=0;while(!S.p.ground&&n<300){run(S,1,I());n++}run(S,1,I());ok(S.p.root===1,'root recharges on landing');
}
{ const S=playState('r1',34*T,FLOOR-PH);run(S,3,I());run(S,1,I({j:1,jp:1}));run(S,12,I({j:1}));const ev=run(S,1,I({j:1,jp:1}));ok(!ev.includes('root')&&S.p.buf>0,'no item: air press buffers');
}
{ const S=playState('r2',0,0,{root:1});S.ens=S.ens.filter(e=>e.cx===13);const m=S.ens[0];   // the pillar's near-side Mossback only
  Object.assign(m,{cx:13,cy:13,ncx:13,ncy:13,gx:-1,gy:0,ogx:-1,ogy:0,mx:0,my:1,omx:0,omy:1,p:0,len:0,wrap:240,w:8,h:12,x:13*T,y:13*T});
  S.p.x=13*T;S.p.y=13*T-PH-40;S.p.root=0;S.p.ground=0;
  let n=0;while(!S.p.ground&&n<100){run(S,1,I());n++}
  ok(S.p.on===0&&!S.p.dead,'mascot lands on the wrapped Mossback (a solid platform)');ok(S.p.root===1,'standing on a wrapped enemy recharges the root');
  while(S.ens[0].wrap>0)run(S,1,I());run(S,2,I());ok(S.p.on===-1&&!S.p.ground,'once the roots let go, the platform is gone');
}
{ // regression: a jump pressed during the 3-frame hit-stop is not lost
  const S=playState('r3',150,FLOOR-PH);run(S,3,I());S.hit=3;E.step(S,I({jp:1,j:1}),[]);let up=false;for(let i=0;i<10;i++){E.step(S,I({j:1}),[]);if(S.p.vy<-1)up=true}
  ok(up,'a jump pressed during hit-stop jumps when it ends');
}

console.log('seed: the root hop shows itself');
{ const R=ROOMS.r1,it=R.items[0];const S=playState('r1',it.tx*T+T+4,FLOOR-PH);S.ens=[];run(S,3,I());
  const evs=[];let f=0;for(;f<200&&!evs.includes('root');f++)evs.push(...run(S,1,I({l:f<12?1:0})));
  ok(evs.includes('item')&&evs.includes('jump')&&evs.includes('root'),`picking up the seed plays one jump + root hop on its own (${f} frames)`);
  let n=0;while(S.p.demo&&n<300){run(S,1,I());n++}ok(S.p.ground&&!S.p.demo&&S.p.root===1,'then he lands, control returns, root recharged');
}
{ // with the room's real Mossbacks: hop in from the hub side at every moss phase; the demo must never get him killed
  let got=0,died=0;
  for(let wait=0;wait<640;wait+=10){const S=playState('r1',36*T,FLOOR-PH);run(S,wait,I());let ev=[];
    for(let i=0;i<400&&!S.p.dead&&!ev.includes('item');i++)ev=run(S,1,I({l:1,j:1,jp:S.p.ground?1:0}));
    if(!ev.includes('item'))continue;got++;for(let i=0;i<300&&S.p.demo;i++){run(S,1,I());if(S.p.dead){died++;break}}}
  ok(got>0&&died===0,`the seed demo never walks him into the room's Mossbacks (${got} pickups, ${died} deaths)`);
}

console.log('snapshot / restore / save');
{ const S=playState('r3',30*T,96-PH,{root:1});run(S,30,I());
  const snap=snapshot(S);const script=i=>I({l:i%90<60,r:i%90>=70,j:(i%37)<12,jp:i%37===0});
  run(S,1000,script);const a=JSON.stringify(S);
  restore(S,snap);ok(JSON.stringify(S)===JSON.stringify(snap),'restore() gives back the identical state');
  run(S,1000,script);ok(JSON.stringify(S)===a,'re-running 1000 scripted frames after restore is identical (no hidden state)');
  const S2=newState();restore(S2,JSON.parse(JSON.stringify(snap)));ok(JSON.stringify(S2)===JSON.stringify(snap),'snapshot survives a JSON string round-trip');
  const m=mem();S.cp={room:'r3',tx:33,ty:7};S.pieces[1]=1;S.latch={r3:1};save(S,m);const L=load(m);ok(JSON.stringify(L)===JSON.stringify(persist(S)),'save/load round-trips torch, items, checkpoint, pieces, latches');
  m.setItem('tos_game','{bad json');ok(load(m)===null,'corrupt save is ignored');
  m.setItem('tos_game',JSON.stringify({v:1,lit:1,items:{root:1},pieces:[0,0,0,0],torches:{'r1:36,14':1},cp:{room:'r1',tx:36,ty:14}}));
  const d=load(m),S3=resume(newState(),d||{});ok(d&&S3.items.root===1&&S3.cp.room==='r1'&&JSON.stringify(S3.latch)==='{}','a v1 save (no latch field) still loads');
}

console.log('landing speed and the renderer hook (feel Stage 2)');
/* 'land' fires on every landing faster than vy 1.0 (was 2.2). The expected count is worked out here from the vy before
   the step plus this step's gravity (open hub floor, no enemies), not from p.lv. The run mixes drops of 1 to 40 px with
   taps and full jumps, so it has landings under 1.0 (no event), between 1.0 and 2.2 (new) and above 2.2. */
{ const S=playState('hub',3*T,FLOOR-PH);S.ens=[];run(S,5,I());
  let want=0,got=0,mid=0,soft=0,lvBad=0;
  const go=inp=>{const p=S.p,air=!p.ground;let v=p.jc&&!inp.j&&p.vy<-P.CUT?-P.CUT:p.vy;v=Math.min(P.MAXF,v+(inp.j&&Math.abs(v)<.8?P.GH:P.G));
    const ev=E.step(S,inp,[]),n=ev.filter(e=>e==='land').length;
    if(air&&p.ground){if(v>1){want++;if(v<=2.2)mid++}else soft++}
    got+=n;if(n&&!(Number.isFinite(p.lv)&&Math.abs(p.lv-v)<1e-9))lvBad++};
  for(const h of [1,2,3,5,8,12,20,40]){S.p.y=FLOOR-PH-h;S.p.vy=0;S.p.ground=0;for(let i=0;i<60;i++)go(I())}
  for(const hold of [0,1,4,8,14,30])for(let i=0;i<120;i++)go(I({j:i<=hold,jp:i===0}));
  ok(want>0&&got===want,`land events (${got}) = landings faster than vy 1.0 (${want})`);
  ok(mid>0&&soft>0,`the run has landings between 1.0 and 2.2 (${mid}, new events) and under 1.0 (${soft}, no event)`);
  ok(!lvBad&&Number.isFinite(S.p.lv)&&JSON.parse(JSON.stringify(S.p)).lv===S.p.lv,`p.lv is the landing's fall speed, a finite JSON-safe number (${S.p.lv.toFixed(2)})`);
}
/* the renderer's pulse and dust live outside S: rend.step (called by tick() after each step()) needs no DOM, never writes S,
   and a snapshot/restore round trip leaves no visual-state key in S */
{ const {createRenderer}=await import(G+'render.js');
  const cv={getContext:()=>({})},rend=createRenderer(cv),S=playState('r1',34*T,FLOOR-PH,{root:1}),S2=playState('r1',34*T,FLOOR-PH,{root:1});
  ok(typeof rend.step==='function','the renderer has a step() for tick()');
  const script=i=>I({r:i%120<70,l:i%120>=90,j:(i%41)<10,jp:i%41===0||i%41===16});
  let thrown='';for(let i=0;i<900;i++){const fz=S.hit>0,ev=E.step(S,script(i),[]);try{rend.step(S,ev,fz)}catch(e){thrown=e.message;break}E.step(S2,script(i),[])}
  ok(!thrown&&JSON.stringify(S)===JSON.stringify(S2),`900 frames with rend.step after each step() give the same S as without it${thrown?' (threw: '+thrown+')':''}`);
  const keys=o=>o&&typeof o==='object'?Object.entries(o).flatMap(([k,v])=>[k,...keys(v)]):[];
  restore(S,snapshot(S));try{rend.step(S,E.step(S,script(0),[]),false)}catch(e){thrown=e.message}
  const bad=keys(S).filter(k=>['sx','sy','px','py','puffs'].includes(k));
  ok(!thrown&&!bad.length,`after snapshot/restore S holds no pulse or dust keys (sx, sy, px, py, puffs)${bad.length?': '+bad.join():''}`);
}

console.log('skid, footsteps, edge pose, sprout lag, sound (feel Stage 4)');
/* hub floor, no enemies. 'skid' and 'footstep' are step() events with no physics; the poses come from rend.look(S) */
{ const n=(evs,k)=>evs.filter(e=>e===k).length,flat=()=>{const S=playState('hub',3*T,FLOOR-PH);S.ens=[];run(S,5,I());return S};
  { const S=flat(),A=run(S,20,I({r:1})),B=run(S,20,I({l:1})),C=run(S,20,I({r:1}));
    ok(!n(A,'skid')&&n(B,'skid')===1&&n(C,'skid')===1,`A7: one 'skid' per turn at full speed, not one per frame (right ${n(A,'skid')}, turn left ${n(B,'skid')}, turn back ${n(C,'skid')})`)}
  { const S=flat(),evs=[];for(let i=0;i<60;i++)evs.push(...run(S,1,I({l:i%4<2,r:i%4>=2})));
    const W=flat(),ev2=[...run(W,2,I({r:1})),...run(W,10,I({l:1}))];
    ok(!n(evs,'skid')&&!n(ev2,'skid'),`no skid standing (left/right taps from rest) or turning below SKID ${P.SKID} px/frame`)}
  { const S=flat();S.p.y-=2;S.p.ground=0;S.p.vx=P.RUN;S.p.face=1;let at=-1;for(let i=0;i<10;i++){const g=S.p.ground,ev=run(S,1,I({l:1}));if(ev.includes('skid')){at=at<0&&!g?i:-2}}
    ok(at>=0,`landing into a turn already held is one skid, on the landing frame (${at})`)}
  { const S=flat(),x0=S.p.x,evs=[];let odd=0;for(let i=0;i<120;i++){const ev=run(S,1,I({r:1}));evs.push(...ev);if(ev.includes('footstep')&&Math.floor(S.p.x/P.STRIDE)&3)odd++}
    const want=Math.floor(S.p.x/(4*P.FEEL.STRIDE))-Math.floor(x0/(4*P.FEEL.STRIDE));
    ok(n(evs,'footstep')===want&&want>=7&&!odd,`A10: a 2 s walk (${(S.p.x-x0).toFixed(0)} px) gives ${n(evs,'footstep')} footsteps, one per ${4*P.FEEL.STRIDE} px (${want}), each on the contact look of the walk cycle`)}
  { const F=P.FEEL,s0=F.STRIDE,S=flat(),x0=S.p.x;F.STRIDE=9;const evs=run(S,120,I({r:1})),want=Math.floor(S.p.x/36)-Math.floor(x0/36);F.STRIDE=s0;
    ok(P.STRIDE===6&&s0===6&&n(evs,'footstep')===want&&want<6,`FEEL.STRIDE is live (default 6): at 9 the same walk gives ${n(evs,'footstep')} footsteps, one per 36 px`)}
  { const S=flat(),evs=[...run(S,60,I()),...run(S,1,I({j:1,jp:1})),...run(S,20,I({j:1}))];
    ok(!n(evs,'footstep')&&!n(evs,'skid'),'no footsteps standing still or in a standing jump')}
  { const S=flat();run(S,20,I({r:1}));S.hit=3;const evs=[...run(S,1,I({l:1})),...run(S,1,I({l:1})),...run(S,1,I({l:1}))];
    ok(evs.length===0,`hit-stop: no events at all while frozen, none of them skid or footstep (${evs.join()||'none'})`)}
  { const S=newState();Object.assign(S,{mode:'dark',match:1});S.intro.land=0;S.p.x=60;S.p.y=FLOOR-PH-30;run(S,30,I());
    const evs=[];for(let i=0;i<60;i++)evs.push(...run(S,1,I({drag:{x:60+i*2,y:FLOOR-PH-2}})));
    ok(!n(evs,'footstep')&&!n(evs,'skid'),'dragged along the floor in the dark: no footsteps, no skid')}
  /* the renderer: rend.look() is what draw() hands sprite(). Skid frame, stride by distance, edge pose, sprout lag */
  const {createRenderer}=await import(G+'render.js'),FX=await import(G+'fx.js');
  const rig=(reduce,S)=>{const rend=createRenderer({getContext:()=>({})},{reduce});return {rend,go:(k,inp)=>{const looks=[];for(let i=0;i<k;i++){const fz=S.hit>0,ev=E.step(S,inp,[]);rend.step(S,ev,fz);looks.push({...rend.look(S),x:S.p.x,ev})}return looks}}};
  for(const reduce of [false,true]){const S=flat(),{go}=rig(reduce,S);go(20,I({r:1}));const L=go(20,I({l:1})),sk=L.findIndex(l=>l.ev.includes('skid')),k=L.slice(sk).findIndex(l=>l.f!=='land');
    if(!reduce)ok(sk>=0&&k>=FX.SKID_MIN&&L[sk].dx===1&&L[sk].dir[0]===-1,`A7: the skid frame (land, 1 px lean into the slide, eyes the new way) holds ${k} frames (>= ${FX.SKID_MIN})`);
    else ok(sk>=0&&L.every(l=>l.f!=='land'&&!l.dx),'reduce: no skid frame')}
  for(const reduce of [false,true]){const S=flat(),{go}=rig(reduce,S),L=go(90,I({r:1})).filter(l=>S.p.walk&&!/^p/.test(l.f)).slice(10);
    const by=L.every(l=>l.f===(!reduce&&Math.floor(l.x/P.FEEL.STRIDE)&1?'breath':'idle')),ch=L.filter((l,i)=>i&&l.f!==L[i-1].f).length;
    ok(L.length>40&&by&&(reduce?!ch:ch>20),reduce?'reduce: walking holds the idle frame (no stride squash)':`A8: the walk frame steps with x, one per ${P.FEEL.STRIDE} px (${ch} changes over ${L.length} frames)`)}
  /* A13 against collision's own ground: a test room with rock under cols 0-4 (top 120) and, under cols 5-6, whatever the
     case puts there. He stands still at x 59, so only his box's last px is over col 4 and both feet are over col 5 */
  { const {parse}=await import(G+'rooms/index.js'),id='edgeT';
    const pose=(cell,floor,o={},po={})=>{const g=[...Array(9)].map(()=>'#'+'.'.repeat(18)+'#');g.push('#....'+cell+'.'.repeat(14)+'#','#####'+floor+'.'.repeat(13)+'#','#'.repeat(20));
      ROOMS[id]=parse({id,name:'t',biome:'roots',at:[9900,9900],grid:g,ents:[]});const S=playState(id,59,120-PH);S.ens=[];
      Object.assign(S.p,{ground:1,vx:0,vy:0,walk:0,on:-1},po);Object.assign(S,o);const l=createRenderer({getContext:()=>({})}).look(S);return l.face==='huh'||l.dir[1]===1};
    const W={wrap:240,pass:0,x:60,y:120,w:12,h:12};
    const on=pose('.','..'),cases={'perch slab (not yet sitting)':pose('B','##',{sit:0}),'pressure plate':pose('P','##'),'shut gate (gate 0)':pose('.','GG',{gate:0}),
      'gate half open (.5, collision lets him through)':pose('.','GG',{gate:.5},{ground:0}),'wrapped enemy (p.on set)':pose('.','..',{ens:[W]},{on:0}),
      'wrapped enemy box with p.on unset':pose('.','..',{ens:[W]}),'liquid tile':pose('.','~~'),'board (p.surf)':pose('.','..',{},{surf:1})};
    delete ROOMS[id];ok(on,'A13 probe: 1 px of rock, both feet over air: the edge pose shows');
    for(const [k,v] of Object.entries(cases))ok(!v,`A13 probe: no edge pose standing on a ${k}`)}
  { const at=(x,o={})=>{const S=playState('r1',x,156-PH);S.ens=[];const {go,rend}=rig(false,S);go(5,I());Object.assign(S,o);return rend.look(S)};   // set after: entering a room clears the hint
    const R1=at(95),L1=at(55),M=at(84),H=at(95,{hint:{x:0,y:0,k:0}}),Q=at(95,{say:{text:'hi',t:99,n:0,pose:''}});
    ok(R1.dir.join()==='1,1'&&R1.face==='huh'&&L1.dir.join()==='-1,1'&&L1.face==='huh',`A13: 1 px of ledge under him, he looks down at the drop (right edge ${R1.dir}, left edge ${L1.dir})`);
    ok(M.dir[1]===0&&!M.face&&H.face!=='huh'&&Q.dir.join()==='1,1'&&!Q.face,'...not with a foot on rock, not under a hint; talking, his eyes look but the mouth stays his')}
  for(const reduce of [false,true]){const S=playState('hub',3*T,FLOOR-PH,{root:1});S.ens=[];const {go}=rig(reduce,S);go(5,I());
    const run1=go(60,I({r:1})),stop=go(40,I()),all=[...run1,...stop],sp=all.map(l=>l.sp|0);
    if(!reduce)ok(sp.every(v=>Number.isInteger(v)&&v>=-2&&v<=2)&&run1.slice(-10).every(l=>l.sp===-2)&&sp.some(v=>v>0)&&!stop[stop.length-1].sp,
      `A11: running right the sprout trails 2 px, springs past 0 when he stops, then settles (${[...new Set(sp)].join(' ')})`);
    else ok(sp.every(v=>v===0),'reduce: no sprout lag')}
  { const S=playState('hub',3*T,FLOOR-PH);S.ens=[];const {go}=rig(false,S);go(5,I());const L=go(40,I({r:1}));ok(L.every(l=>!l.sp),'no sprout (stage 0): no lag in the look, so no extra sprite keys')}
  /* audio.js under a stub AudioContext: the new sounds build, pitch varies inside its range, reduce holds it, mute is silent */
  { const C={osc:0,src:0,f:[]},prm=t=>({value:0,setValueAtTime(v){if(t)C.f.push([t,v])},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}});
    const N=t=>({connect:x=>x,start(){},stop(){},gain:prm(),frequency:prm(t),Q:prm(),type:'',buffer:null,loop:false});
    class AC{constructor(){this.currentTime=0;this.state='running';this.sampleRate=4000;this.destination=N()}createGain(){return N()}createOscillator(){C.osc++;return N('o')}
      createBiquadFilter(){return N('b')}createBuffer(c,len){const d=new Float32Array(len);return {getChannelData:()=>d}}createBufferSource(){C.src++;return N()}resume(){}suspend(){}close(){}}
    const w0=globalThis.window;globalThis.window={AudioContext:AC};
    const au=(await import(G+'audio.js')).createAudio('k');au.unlock();
    const fr=(n,o,t)=>{C.f.length=0;au.sfx(n,o);return C.f.filter(q=>q[0]===t).map(q=>q[1])[0]};
    const J=Array.from({length:300},()=>fr('jump',{},'o')/260),F=Array.from({length:300},()=>fr('footstep',{},'b')/1400);
    const inR=(a,d)=>a.every(v=>v>=1-d-1e-9&&v<=1+d+1e-9)&&Math.max(...a)-Math.min(...a)>d;
    ok(inR(J,.06)&&inR(F,.08),`A9/A10: jump pitch varies within +-6% (${Math.min(...J).toFixed(3)}..${Math.max(...J).toFixed(3)}), footsteps within +-8%`);
    ok(fr('jump',{reduce:true},'o')===260&&fr('footstep',{reduce:true},'b')===1400&&fr('jump',undefined,'o')>0,'reduce: no pitch variation; sfx() with no options still plays');
    const L=lv=>{C.osc=C.src=0;C.f.length=0;au.sfx('land',{lv});return {src:C.src,osc:C.osc,f:C.f.filter(q=>q[0]==='b').map(q=>q[1])[0]}};
    const a=L(1.2),b=L(2.3),c=L(4.6);
    ok(a.src===1&&b.src===1&&b.f>=800&&c.f>b.f&&a.f<b.f&&c.osc===1&&!b.osc,`A9: soft land at vy 1.2 (cutoff ${a.f|0}), the old one from 2.2 (${b.f|0}), brighter with a thump at MAXF (${c.f|0})`);
    au.setMute(true);C.osc=C.src=0;for(const e of ['jump','land','footstep','skid','stun'])au.sfx(e,{lv:4});
    ok(C.osc===0&&C.src===0,'muted: no sound is built');globalThis.window=w0}
}

console.log('puff -> plate -> gate (r3)');
const go=(wait,at)=>{const S=playState('r3',20*T,96-PH,{root:1});run(S,wait,I());let ev=[];
  for(let i=0;i<70;i++){ev.push(...run(S,1,I({l:1,j:i>=at,jp:i===at})));if(S.p.dead||ev.includes('stun'))break}return {S,ev}};
let found=null;
{ let tries=0,hits=0;
  for(let wait=0;wait<240;wait+=6)for(let at=8;at<40;at++){tries++;const {S,ev}=go(wait,at);if(ev.includes('stun')&&!S.p.dead){hits++;if(!found)found={wait,at}}}
  ok(!!found,`dropping off the ledge, a root burst wraps the spore puff (${hits}/${tries} timings work)`);
  if(found){const {S}=go(found.wait,found.at);let landed=-1,opened=-1,crossed=-1;
    for(let i=0;i<300;i++){run(S,1,I({l:1}));if(landed<0&&S.plate)landed=i;if(opened<0&&S.gate>=.5)opened=i;if(S.room==='r4'||S.p.x<4*T-P.PW){crossed=i;break}if(S.p.dead)break}
    ok(landed>=0,`wrapped puff sank onto the plate (${landed} frames)`);ok(opened>=0,'gate opened while the plate was held');
    ok(crossed>=0,`holding left gets through the gate before it shuts (${crossed} frames after the wrap)`);
    const {S:S3}=go(found.wait,found.at);run(S3,5,I());const e=S3.ens[0];ok(e.wrap>0&&e.dy>0,'a wrapped puff loses buoyancy and falls');
  }
  const N=playState('r3',8*T,FLOOR-PH);let through=false;for(let i=0;i<200;i++){run(N,1,I({l:1}));if(N.p.x<4*T)through=true}ok(!through,'without the plate held (never passed), the gate blocks the way');
}
{ // regression (soft-lock): once walked through, the gate latches open, across death in r4 and a reload
  const {S}=go(found.wait,found.at);const evs=[];for(let i=0;i<400&&S.room==='r3';i++)evs.push(...run(S,1,I({l:1})));
  ok(S.room==='r4'&&S.latch.r3===1&&evs.includes('latch'),'walking through the open gate latches it (saved data)');
  let n=0;while(S.cp?.room!=="r4"&&n<300){run(S,1,I({l:1}));n++}
  ok(S.cp?.room==="r4",'the r4 torch beside the entrance becomes the checkpoint');
  S.p.inv=0;const mb=S.ens.find(e=>e.k==='moss');
  S.p.x=mb.x+mb.w/2-9;S.p.y=mb.y-PH+4;S.p.vy=0;const dv=run(S,60,I());ok(dv.includes('die')&&dv.includes('rez')&&S.room==='r4','dies in r4 and respawns at the r4 torch');
  const m=mem();save(S,m);const S2=resume(newState(),load(m));E.enterRoom(S2,S2.cp.room,E.spot(S2,ROOMS[S2.cp.room],S2.cp.tx,S2.cp.ty));
  ok(S2.room==='r4'&&S2.latch.r3===1,'reloaded save puts him in r4 with the latch kept');
  for(let i=0;i<400&&!(S2.room==='r3'&&S2.p.x>6*T);i++)run(S2,1,I({r:1}));
  ok(S2.room==='r3'&&S2.p.x>6*T&&!S2.p.dead,'holding right walks back through the gate into r3 (no plate held)');
}
{ // regression: a wrapped puff falling onto him sinks through, it never lifts him
  const S=playState('r3',176,168,{root:1});S.p.inv=0;run(S,2,I());const e=S.ens.find(q=>q.k==='puff'&&q.hx===15*T);e.wrap=240;e.vy=0;e.y=120;e.x=S.p.x+3;e.pass=0;
  let y0=S.p.y,moved=0;for(let i=0;i<40;i++){run(S,1,I());moved=Math.max(moved,Math.abs(S.p.y-y0))}
  ok(moved<.01&&!S.p.dead,`a wrapped puff landing on him does not move him (max ${moved.toFixed(1)} px)`);
}

console.log('hazards and respawn');
{ const S=playState('r1',12*T,FLOOR-PH-30);S.ens=[];S.cp={room:'r1',tx:21,ty:14};let died=-1,back=-1;
  for(let i=0;i<120;i++){const ev=run(S,1,I({r:1}));if(died<0&&ev.includes('die')){died=i;ok(Array.isArray(S.flash),'a thorn death records which thorn to flash')}if(died>=0&&ev.includes('rez')){back=i;break}}
  ok(died>=0,'thorns glitch the mascot out');ok(back>=0&&(back-died)/60<1,`respawned in ${((back-died)/60).toFixed(2)} s at the last torch`);
  ok(S.room==='r1'&&Math.abs(S.p.x+9-(21*T+6))<4,'respawn position is the checkpoint torch');
}
{ const S=playState('r1',27*T,FLOOR-PH-60);S.p.inv=0;
  S.ens=[{...S.ens[0]}];const e=S.ens[0];S.p.x=e.x-3;S.p.y=e.y-PH+4;const ev=run(S,1,I());ok(ev.includes('die'),'touching a Mossback glitches out');
  const S2=playState('r1',27*T,FLOOR-PH-60);const e2=S2.ens[0];e2.wrap=100;S2.p.x=e2.x-3;S2.p.y=e2.y-PH+4;const ev2=run(S2,1,I());ok(!ev2.includes('die'),'a wrapped Mossback is harmless');
}

console.log('Mossback patrols');
const PATROL={r1:[['23,15','24,15'],['25,15','26,13','28,12','30,15']],r2:[[],['13,10','13,15']],r4:[[],['1,20','5,20']]};
for(const id of ['r1','r2','r4']){const S=playState(id,0,0);S.p.x=-999;S.p.y=-999;S.p.inv=1e9;let okb=true;const cells=new Set();
  const R=ROOMS[id];for(let i=0;i<8000;i++){E.step(S,I(),[]);S.p.x=-999;S.p.y=-999;for(const e of S.ens.filter(e=>e.k==='moss')){cells.add(e.cx+','+e.cy);if(e.x<0||e.y<0||e.x>R.w*T||e.y>R.h*T)okb=false;
    const tx=Math.floor((e.x+e.w/2)/T),ty=Math.floor((e.y+e.h/2)/T);if('#='.includes(R.g[ty]?.[tx]))okb=false}}
  ok(okb,`${id}: Mossbacks stay in open cells inside the room (${cells.size} cells visited)`);
  const [never,must]=PATROL[id];ok(must.every(c=>cells.has(c))&&!never.some(c=>cells.has(c)),`${id}: fenced patrols keep their old ground`);
}
{ // the r1 strip beetles (one by each bank, M1b: the lesson made easy) walk their stretch of thorns, sitting on the tips
  const S=playState('r1',0,0);S.p.x=-999;S.p.y=-999;S.p.inv=1e9;const [b2,b1]=[S.ens[1],S.ens[2]],x1=new Set(),x2=new Set();let low=0;
  for(let i=0;i<2400;i++){E.step(S,I(),[]);S.p.x=-999;S.p.y=-999;x1.add(b1.cx);x2.add(b2.cx);for(const b of [b1,b2])if(b.cx>8&&b.cx<20)low=Math.max(low,b.y+b.h)}
  ok(x1.has(17)&&x1.has(19)&&[...x1].every(x=>x>=17&&x<=19),'r1: the near beetle walks cols 17-19 of the thorn strip, by the hub-side bank');
  ok(x2.has(10)&&x2.has(11)&&[...x2].every(x=>x>=10&&x<=11),'r1: the far beetle walks cols 10-11, by the step (the way back)');
  ok(low>FLOOR&&low<FLOOR+6,`r1: on thorns they sit down on the tips (bottom at ${low})`);
}

console.log('room flow');
{ const S=playState('hub',3*T,FLOOR-PH);let n=0;while(S.room==='hub'&&n<200){run(S,1,I({l:1}));n++}ok(S.room==='a1','walking left out of the lit hub enters Seedbed');
  const D=newState();D.mode='dark';D.match=1;D.p.x=2*T;D.p.y=FLOOR-PH;D.p.hide=0;run(D,200,I({l:1}));ok(D.room==='hub'&&D.p.x>=0,'before the torch the dark room cannot be left');
  const D2=newState();D2.mode='dark';D2.match=1;D2.p.x=150;D2.p.y=FLOOR-PH;let ev=[];for(let i=0;i<300&&!D2.lit;i++)ev.push(...run(D2,1,I({r:1})));
  ok(D2.lit===1&&ev.includes('torch')&&D2.mode==='play','walking into the hidden torch lights the room and fires torch');
  const D3=newState();D3.mode='dark';D3.match=1;D3.p.x=150;D3.p.y=FLOOR-PH;run(D3,5,I());run(D3,10,I({drag:{x:150,y:40}}));ok(D3.p.carry&&D3.p.y<60,'dragging lifts the mascot');
  run(D3,5,I({drag:{x:-200,y:40}}));ok(D3.p.x>=T-1,'dragging cannot pull him through the wall');run(D3,90,I());ok(D3.p.ground&&!D3.p.carry,'released, he drops with gravity');
  const D5=newState();D5.mode='dark';D5.match=1;D5.p.x=150;D5.p.y=FLOOR-PH;run(D5,5,I());const y5=D5.p.y;run(D5,1,I({drag:{x:150,y:40,cap:6}}));
  ok(Math.abs(D5.p.y-y5-(-6))<.01,'a touch away from him pulls him toward the finger at the capped speed');run(D5,40,I({drag:{x:150,y:40,cap:6}}));ok(Math.abs(D5.p.y-40)<.01,'...until he reaches it');
  const D4=newState();D4.mode='dark';D4.match=1;D4.p.x=150;D4.p.y=FLOOR-PH;run(D4,730,I());ok(D4.idle>720,'idle counter reaches the 12 s nudge');
  const N=newState();let evs=[];for(let i=0;i<500;i++)evs.push(...E.step(N,I(),[]));ok(N.mode==='dark'&&['thud','glitch','match'].every(e=>evs.includes(e)),'intro: fall, thud, glitch, speech, match, then dark phase');
}

console.log('solvability (scripted)');
/* rev [k,m]: instead of the hold-then-release runs, hold dir for k frames (the jump frame counts), then the opposite
   direction for m frames, then release */
function canReach(room,x,y,items,dir,target,{noEns=false,rev=null}={}){
  const back=dir==='l'?'r':'l',holds=rev?[rev]:[999,8,14,20];
  for(let rootAt=0;rootAt<45;rootAt++)for(const hold of holds){
    const S=playState(room,x,y,items);if(noEns)S.ens=[];run(S,3,I());
    run(S,1,I({[dir]:1,j:1,jp:1}));
    for(let i=1;i<160;i++){const key=rev?(i<rev[0]?dir:i<rev[0]+rev[1]?back:''):(i<hold?dir:'');
      run(S,1,I({...(key?{[key]:1}:{}),j:1,jp:rootAt&&i===rootAt}));if(S.p.dead)break;if(S.p.ground&&target(S))return {rootAt,hold}}
  }return null;
}
/* the reversal sweep for the negative checks: every k x m must leave the target out of reach */
const REV=[6,10,14].flatMap(k=>[4,8,12].map(m=>[k,m]));
const revReach=(room,x,y,items,dir,target,o={})=>REV.filter(rev=>canReach(room,x,y,items,dir,target,{...o,rev}));
{ const tgt=S=>S.p.y+PH<=96.1&&S.p.x<72;
  ok(!canReach('r1',76,156-PH,{},'l',tgt),'r1: high ledge is out of reach from the step without the root');
  const rv=revReach('r1',76,156-PH,{},'l',tgt);ok(!rv.length,`r1: ...also with an air reversal (${REV.length} k x m runs${rv.length?', reached with '+rv.join(' '):''})`);
  ok(!!canReach('r1',76,156-PH,{root:1},'l',tgt),'r1: high ledge is reachable from the step with jump + root');
  let ph=0;for(let wait=0;wait<640;wait+=20){const S=playState('r1',36*T,FLOOR-PH);run(S,wait,I());   // hop left over the thorn and the pillar's Mossback
    for(let i=0;i<300&&!S.p.dead&&S.p.x>=24*T;i++)run(S,1,I({l:1,j:1,jp:S.p.ground?1:0}));if(!S.p.dead&&S.p.x<24*T)ph++}
  ok(ph>0,`r1: from the hub side the seed is reachable without the root (${ph}/32 Mossback phases by plain hopping)`);
}
{ // r1 lesson: the thorn strip (cols 9-19, x 108..240) cannot be crossed from its right edge without the beetle
  const left=S=>S.p.x<108-2;
  ok(!canReach('r1',20*T+1,FLOOR-PH,{root:1},'l',left,{noEns:true}),'r1: without the beetle, jump + root cannot cross the thorn strip');
  const rv=revReach('r1',20*T+1,FLOOR-PH,{root:1},'l',left,{noEns:true});ok(!rv.length,`r1: ...also with an air reversal (${REV.length} k x m runs${rv.length?', crossed with '+rv.join(' '):''})`);
  // with it: wait on the edge, jump at it and burst, land on the wrapped beetle, then jump + root to the step
  let wins=0,phases=0;const ph=new Set();
  for(let wait=0;wait<900;wait+=15){phases++;let won=false;
    for(let at=1;at<36&&!won;at+=1)for(const hold of [999,6,12,18,26,36]){if(won)break;   /* hold lengths: the air stop got quicker (ADEC .13), so a release coasts less far and the bot tries longer holds, as a person steers */
      const S=playState('r1',20*T+1,FLOOR-PH,{root:1});S.p.inv=0;S.ens.splice(0,1);run(S,wait,I());
      run(S,1,I({l:1,j:1,jp:1}));let on=false,ev=[];
      for(let i=1;i<120;i++){ev.push(...run(S,1,I({l:i<hold?1:0,j:1,jp:i===at})));if(S.p.dead)break;if(S.p.ground&&S.p.on>=0){on=true;break}if(S.p.ground&&S.p.on<0&&i>3)break}
      if(!on||!ev.includes('stun'))continue;
      for(let at2=1;at2<45&&!won;at2+=2){const C=snapshot(S);run(C,2,I());run(C,1,I({l:1,j:1,jp:1}));
        for(let i=1;i<160;i++){run(C,1,I({l:1,j:1,jp:i===at2}));if(C.p.dead)break;if(C.p.ground&&left(C)&&C.p.on<0){won=true;break}}}
    }
    if(won){wins++;ph.add(wait)}}
  // the winning-line measure: of 60 moments to start (every 15 frames), how many have a jump + wrap + jump that crosses
  ok(wins>=45,`r1 lesson is forgiving: ${wins}/${phases} beetle timings give a winning line (need >= 45)`);
  console.log('    beetle phases that work:',[...ph].join(','));
}
{ // ...and the way back (left to right, after the chase): from the step, wrap the far beetle and hop to the hub-side bank
  let wins=0,phases=0;
  for(let wait=0;wait<900;wait+=15){phases++;let won=false;
    for(let at=1;at<50&&!won;at++)for(const hold of [999,4,8,12,16,20,26,32,40,52]){if(won)break;   /* longer holds too: see the lesson test above */
      const S=playState('r1',76,156-PH,{root:1});S.p.inv=0;S.ens.splice(0,1);run(S,wait,I());if(!S.p.ground)break;
      run(S,1,I({r:1,j:1,jp:1}));let on=false;
      for(let i=1;i<140;i++){run(S,1,I({r:i<hold?1:0,j:1,jp:i===at}));if(S.p.dead)break;if(S.p.ground){on=S.p.on>=0;break}}
      if(!on)continue;
      for(let at2=1;at2<45&&!won;at2+=2){const C=snapshot(S);run(C,2,I());run(C,1,I({r:1,j:1,jp:1}));
        for(let i=1;i<160;i++){run(C,1,I({r:1,j:1,jp:i===at2}));if(C.p.dead)break;if(C.p.ground&&C.p.x>222&&C.p.on<0){won=true;break}}}}
    if(won)wins++}
  ok(wins>=45,`r1 way back: ${wins}/${phases} timings cross from the step to the hub-side bank on the far beetle`);
}
{ // Deep Roots: each climb, from the lip of one ledge to the next (the floor to the first). The root jump makes every one;
  // without it the climbs of 4 or more are out of reach, with an air reversal too. Rise and gap vary from climb to climb.
  const steps=R4L.map((lg,i)=>{const up=lg,lo=i?R4L[i-1]:null;
    const [dir,x]=lo?r4lip(lo):['l',11*T],y=(lo?lo[0]:34)*T-PH,rise=(lo?lo[0]:34)-lg[0];
    const gap=lo?(lo[1]==='L'?lg[2]-lo[2]-1:lo[2]-lg[2]-1):0;return {dir,x,y,rise,gap,lg}});
  for(const {dir,x,y,rise,gap,lg} of steps){const tgt=r4on(lg),name=`${rise} up across ${gap}, to the ledge at row ${lg[0]}`;
    ok(!!canReach('r4',x,y,{root:1},dir,tgt,{noEns:true}),`r4: reach ${name}`);
    if(rise>=4){ok(!canReach('r4',x,y,{},dir,tgt,{noEns:true}),`r4: ${name} needs the root`);
      const rv=revReach('r4',x,y,{},dir,tgt,{noEns:true});ok(!rv.length,`r4: ...${name} also with an air reversal (${REV.length} k x m runs${rv.length?', reached with '+rv.join(' '):''})`)}}
  ok(new Set(steps.map(s=>s.rise)).size>=3&&new Set(steps.map(s=>s.gap)).size>=4,'r4: the climbs vary in rise (at least 3 different) and in gap (at least 4 different), not seven copies');
  // no shaft: no run of 2 or more columns stays open from the top ledge to the floor, so a miss lands on a ledge, not the floor
  const R4=ROOMS.r4;let clear=0,run1=0;for(let x=1;x<R4.w-1;x++){let open=true;for(let y=6;y<34;y++)if('#='.includes(R4.g[y][x])){open=false;break}run1=open?run1+1:0;clear=Math.max(clear,run1)}
  ok(clear<=1,`r4: no open shaft: at most ${clear} column wide stays clear from the top ledge to the floor (he is 1.5 tiles wide)`);
}
{ const tgt=S=>S.p.y+PH<=96.1&&S.p.x<72;
  let r=null;for(let rootAt=1;rootAt<45&&!r;rootAt++){const C=playState('r2',18*T,96-PH,{root:1});C.ens=[];run(C,3,I());run(C,1,I({l:1,j:1,jp:1}));for(let i=1;i<160;i++){run(C,1,I({l:1,j:1,jp:i===rootAt}));if(C.p.dead)break;if(C.p.ground&&tgt(C)){r=1;break}}}
  ok(!r,'r2: the left ledge is out of reach from the right ledge without a stepping stone');
  const rv=revReach('r2',18*T,96-PH,{root:1},'l',tgt,{noEns:true});ok(!rv.length,`r2: ...also with an air reversal (${REV.length} k x m runs${rv.length?', reached with '+rv.join(' '):''})`);
  let r2=null;for(let rootAt=1;rootAt<45&&!r2;rootAt++){const C=playState('r2',0,0,{root:1});C.ens=C.ens.filter(e=>e.cx===13);const m=C.ens[0];Object.assign(m,{cx:13,cy:10,ncx:13,ncy:10,gx:-1,gy:0,ogx:-1,ogy:0,mx:0,my:1,omx:0,omy:1,p:0,len:0,wrap:240});
    m.w=8;m.h=12;m.x=13*T;m.y=10*T;C.p.x=m.x-2;C.p.y=m.y-PH;run(C,2,I());if(C.p.on!==0)continue;
    run(C,1,I({l:1,j:1,jp:1}));for(let i=1;i<160;i++){run(C,1,I({l:1,j:1,jp:i===rootAt}));if(C.p.dead)break;if(C.p.ground&&tgt(C)){r2=rootAt;break}}}
  ok(!!r2,'r2: standing on the wrapped Mossback at the pillar top, jump + root reaches the left ledge');
  let w=null;for(let wait=0;wait<400&&!w;wait+=4)for(let rootAt=4;rootAt<40&&!w;rootAt+=2)for(const hold of [12,20,30,99]){if(w)break;const C=playState('r2',18*T,96-PH,{root:1});run(C,wait,I());
    run(C,1,I({l:1,j:1,jp:1}));for(let i=1;i<90;i++){const ev=run(C,1,I({l:i<hold,j:1,jp:i===rootAt}));if(C.p.dead)break;if(ev.includes('stun')){w={wait,rootAt};break}}}
  ok(!!w,'r2: the Mossback can be wrapped from the right ledge'+(w?` (wait ${w.wait}, root +${w.rootAt})`:''));
}
{ ok(!!canReach('r3',11*T,FLOOR-PH,{root:1},'r',S=>S.p.y+PH<=144.1&&S.p.x>198),'r3: floor -> step needs only jump + root');
  let up=null;for(let rootAt=1;rootAt<45&&!up;rootAt++)for(const hold of [0,6,12,20]){const C=playState('r3',209,144-PH,{root:1});run(C,3,I());run(C,1,I({j:1,jp:1}));
    for(let i=1;i<160;i++){run(C,1,I({r:i>=hold,j:1,jp:i===rootAt}));if(C.p.dead)break;if(C.p.ground&&C.p.y+PH<=96.1&&C.p.x>=219){up={rootAt,hold};break}}if(up)break}
  ok(!!up,'r3: step -> entry ledge is reachable (no soft-lock on the floor)');
}
// ---- edge bump speech (game/bump.js; story/art pass) ----
console.log('edge bump speech');
{ const B=await import(G+'bump.js');
  const dark=()=>{const S=newState();Object.assign(S,{mode:'dark',match:1});S.intro.land=0;const st=ROOMS.hub.start;S.p.x=st.tx*T+T/2-P.PW/2;S.p.y=(st.ty+1)*T-PH;return S};
  const lines=[...B.OUCH,B.STUCK];
  // drag him hard into the left window edge, release, repeat: bumps register, lines are rate-limited and never stack
  { const S=dark();let said=[],bumps=0,last=-1e9,minGap=1e9;
    for(let r=0;r<12;r++){
      for(let i=0;i<20;i++){const ev=E.step(S,I({drag:{x:-60,y:S.p.y}}),[]);if(ev.includes('bump'))bumps++;
        if(S.say&&S.say.n===0&&lines.includes(S.say.text)){said.push(S.say.text);minGap=Math.min(minGap,S.t-last);last=S.t}}
      for(let i=0;i<10;i++)E.step(S,I({drag:{x:S.p.x+20,y:S.p.y}}),[]);
      for(let i=0;i<40;i++)E.step(S,I(),[]);
    }
    ok(bumps>=10,`dragging into the window edge registers bumps (${bumps})`);
    ok(said.length>=1&&said.every(t=>lines.includes(t)),`he says something (${said.join(' / ')})`);
    ok(said.length<bumps,'not every bump gets a line');
    ok(minGap>=B.BUMP.CD,`lines at least ${B.BUMP.CD} frames apart (min ${minGap===1e9?'-':minGap})`);
    ok(said.includes(B.STUCK)&&said.indexOf(B.STUCK)>0,'"stuck" comes only after earlier bumps');
  }
  // a drag that never meets a wall says nothing
  { const S=dark();let n=0;for(let i=0;i<300;i++){E.step(S,I({drag:{x:S.p.x+(i%60<30?1:-1),y:S.p.y-1}}),[]);if(S.say)n++}
    ok(n===0,'free dragging says nothing'); }
  // never over the intro's lines: the intro returns before any bump logic, and an existing line is never replaced
  { const S=newState();let bad=0;for(let i=0;i<700&&S.mode==='intro';i++){E.step(S,I({drag:{x:-60,y:0}}),[]);if(S.say&&lines.includes(S.say.text))bad++}
    ok(!bad,'no bump line during the intro');
    const S2=dark();S2.say={text:'wait, where am I?',t:999,n:0};for(let i=0;i<60;i++)E.step(S2,I({drag:{x:-60,y:S2.p.y}}),[]);
    ok(S2.say&&S2.say.text==='wait, where am I?','a line in progress is never replaced'); }
  // lit room: walking into a wall long enough can bump; state is plain data (JSON round-trip)
  { const S=playState('hub',20*T,FLOOR-PH);run(S,30,I());let bumps=0;for(let i=0;i<200;i++){if(E.step(S,I({r:1}),[]).includes('bump'))bumps++}
    ok(bumps===1,`lit: holding into a wall is one bump, not one per frame (${bumps})`);
    ok(JSON.stringify(snapshot(S).bump)===JSON.stringify(S.bump),'bump state survives a snapshot'); }
}
// ---- M1b: the Roots fragment, the thorn chase, the door slot, the stuck hint ----
const st=await import(G+'state.js'),CH=await import(G+'chases.js'),{CHASES,NEXT}=await import(G+'rooms/index.js');
/* a tiny bot. Inputs are recorded one code per frame (bit 0 l, 1 r, 2 j held, 3 j pressed), so a run found by search
   replays exactly from the same start. hop(): from a grounded state, try waits x jump x root frame x hold; it succeeds
   when he lands alive (after leaving the ground) and target() holds. */
const enc=(l,r,j,jp)=>(l?1:0)|(r?2:0)|(j?4:0)|(jp?8:0),dec=c=>I({l:c&1,r:(c>>1)&1,j:(c>>2)&1,jp:(c>>3)&1});
const Bot={
  walk(S,rec,dir,done,max=900,log){for(let i=0;i<max;i++){if(done(S))return true;const ev=E.step(S,dec(enc(dir==='l',dir==='r',0,0)),[]);rec.push(enc(dir==='l',dir==='r',0,0));log&&log(S,ev);if(S.p.dead||ev.includes('die'))return false}return done(S)},
  idle(S,rec,n,log){for(let i=0;i<n;i++){const ev=E.step(S,I(),[]);rec.push(0);log&&log(S,ev);if(ev.includes('die'))return false}return true},
  hop(S,rec,dir,target,{waits=[0],jump=[1],roots=null,holds=[999,4,8,12,16,20,26,32],max=200}={},log){
    const rs=roots||[0,...Array.from({length:45},(_,i)=>i+1)];
    for(const w of waits)for(const jm of jump)for(const ra of rs)for(const h of holds){
      const C=snapshot(S),r=[];let ok=true,won=false,air=false;
      for(let i=0;i<w&&ok;i++){r.push(0);if(E.step(C,I(),[]).includes('die'))ok=false}
      if(!ok)continue;
      for(let i=0;i<max;i++){const c=enc(dir==='l'&&i<h,dir==='r'&&i<h,1,(jm&&i===0)||(ra&&i===ra));const ev=E.step(C,dec(c),[]);r.push(c);
        if(ev.includes('die')||C.p.dead)break;if(!C.p.ground)air=true;else if(air){won=target(C);break}}
      if(won){if(log){const D=snapshot(S);for(const c of r)log(D,E.step(D,dec(c),[]))}restore(S,C);rec.push(...r);return true}
    }
    return false},
  /* walk dir, hop when blocked (hold the jump while rising, root burst 14 frames in): for rooms with no puzzle in the way */
  go(S,rec,dir,done,max=1500,log){
    let stuck=0,lastx=S.p.x,air=-1;
    for(let i=0;i<max;i++){
      if(done(S))return true;
      const blocked=S.p.ground&&Math.abs(S.p.x-lastx)<.01;stuck=blocked?stuck+1:0;lastx=S.p.x;
      let jp=0,jh=0;
      if(stuck>=2&&S.p.ground){jp=1;jh=1;air=0}
      else if(!S.p.ground&&air>=0){air++;jh=1;if(air===14)jp=1}
      else if(S.p.ground)air=-1;
      const c=enc(dir==='l',dir==='r',jh||S.p.vy<0,jp),ev=E.step(S,dec(c),[]);rec.push(c);log&&log(S,ev);
      if(S.p.dead||ev.includes('die'))return false}
    return done(S)},
  /* the puff step of Puff Drift, played like a person: run to the lip (world px x `lip`), jump toward the puff hanging in the
     pit, root-burst when it is under him, steer onto it as it sinks to its stone. Returns {C,rec} when he stands on it */
  puffStep(S,dir,w,lip,burstDx=20){
    const C=snapshot(S),rec=[];
    for(let i=0;i<w;i++){if(E.step(C,I(),[]).includes('die'))return null;rec.push(0)}
    const pf=()=>C.ens.filter(e=>e.k==='puff').sort((a,b)=>Math.abs(a.hx-C.p.x)-Math.abs(b.hx-C.p.x))[0];
    const steer=tx=>{const p=C.p,aim=tx-(p.x+P.PW/2)-p.vx*p.vx/(2*P.FEEL.ADEC)*Math.sign(p.vx);return aim>2?{r:1}:aim<-2?{l:1}:{}};
    let burst=false,jumped=-1;
    for(let i=0;i<400;i++){
      const f=pf(),tx=f.hx+6,dx=tx-(C.p.x+P.PW/2),above=C.p.y+PH<f.y+2&&f.y-(C.p.y+PH)<38;
      let st,jp=0;
      if(jumped<0){st={[dir]:1};if(C.p.ground&&(dir==='l'?C.p.x<=lip:C.p.x>=lip)){jp=1;jumped=i}}
      else{st=i-jumped<6?{[dir]:1}:steer(tx);if(!burst&&!C.p.ground&&i-jumped>4&&Math.abs(dx)<burstDx&&above&&C.p.root){jp=1;burst=true}}
      const code=enc(st.l,st.r,jumped>=0||jp,jp),ev=E.step(C,dec(code),[]);rec.push(code);
      if(ev.includes('die')||C.p.dead)return null;
      if(jumped>=0&&C.p.ground&&i-jumped>3)return C.p.on>=0?{C,rec}:null}
    return null},
  /* the whole pit: the puff step, then the jump out of the far side onto the floor `tgt` names */
  puffCross(S,rec,dir,lip,tgt,waits=Array.from({length:30},(_,i)=>i*6)){
    for(const w of waits){const r=Bot.puffStep(S,dir,w,lip);if(!r)continue;const out=[];
      if(Bot.hop(r.C,out,dir,tgt)){restore(S,r.C);rec.push(...r.rec,...out);return true}}
    return false},
  /* idle w frames, then drive(C,i) gives each frame's code until ok(C) */
  search(S,rec,waits,drive,ok,max=400){
    for(const w of waits){const C=snapshot(S),r=[];let dead=false;
      for(let i=0;i<w&&!dead;i++){r.push(0);if(E.step(C,I(),[]).includes('die'))dead=true}
      for(let i=0;i<max&&!dead;i++){const c=drive(C,i);const ev=E.step(C,dec(c),[]);r.push(c);if(ev.includes('die')||C.p.dead)dead=true;else if(ok(C))break}
      if(!dead&&ok(C)){restore(S,C);rec.push(...r);return true}}
    return false},
};
const W10=n=>Array.from({length:n},(_,i)=>i*10),wx=S=>ROOMS[S.room].at[0]*T+S.p.x;
const far2=S=>S.p.x+P.PW>217&&S.p.y+PH<=96.1&&S.p.on<0;
/* the chase route, leg by leg, each tagged with its room so a run can start at any torch on the path */
const CHASE_LEGS=[
  ['r5',(S,r,l)=>S.pieces[0]||Bot.walk(S,r,'l',S=>S.pieces[0],60,l)],
  ['r5',(S,r,l)=>Bot.walk(S,r,'r',S=>S.room==='a5',600,l)],
  ['a5',(S,r,l)=>Bot.walk(S,r,'r',S=>S.room==='r4',600,l)],
  ['r4',(S,r,l)=>{   /* down the ledges, from wherever he stands (the top, his torch on a ledge, the floor): walk to the lip, hop to the next one down, then out east */
    for(let k=0;k<10&&S.room==='r4';k++){
      if(S.p.y+PH>=34*T-1){return Bot.walk(S,r,'r',S=>S.room==='r3',900,l)}
      if(!S.p.ground&&!Bot.walk(S,r,'',S=>S.p.ground,200,l))return false;
      const at=R4L.findIndex(lg=>r4here(lg)(S));if(at<0)return false;
      const [dir,lip]=r4lip(R4L[at]),next=at?r4on(R4L[at-1]):S=>S.p.ground&&S.p.y+PH>=34*T-1;
      if(!r4toLip(S,r,dir,lip,l,14))return false;
      if(!Bot.hop(S,r,dir,next,{jump:[0,1],roots:[0,...Array.from({length:50},(_,i)=>i+1)],holds:[4,8,12,16,20,26,32,40,60,999],max:300},l))return false}
    return S.room!=='r4'||Bot.walk(S,r,'r',S=>S.room==='r3',900,l)}],
  ['r3',(S,r,l)=>S.p.y<150||Bot.walk(S,r,'r',S=>S.p.x>=196,400,l)],
  ['r3',(S,r,l)=>S.p.y<150||Bot.hop(S,r,'r',S=>S.p.y+PH<=144.1&&S.p.x>198,{waits:[0,10,20,30,45,60,80,100,120]},l)],
  ['r3',(S,r,l)=>S.p.y<100||Bot.hop(S,r,'r',S=>S.p.y+PH<=96.1&&S.p.x>211,{holds:[0,4,8,12,16,20,999]},l)],
  ['r3',(S,r,l)=>Bot.walk(S,r,'r',S=>S.room==='a4',600,l)],
  /* Puff Drift eastbound: down the west steps, the lethal west pit by its puff, then the safe east pit by dropping in and climbing its step */
  ['a4',(S,r,l)=>S.p.x>=9*T||Bot.go(S,r,'r',S=>S.p.x>=9*T&&S.p.ground,600,l)],
  ['a4',(S,r,l)=>S.p.x>=24*T||Bot.puffCross(S,r,'r',11.5*T,S=>S.p.on<0&&S.p.ground&&S.p.x>=24*T)],
  ['a4',(S,r,l)=>Bot.go(S,r,'r',S=>S.room==='a3',1500,l)],
];
/* pause: frames he stands and looks at each room as he enters it (the hesitant bot). Returns the recorded inputs, whether
   he got out with no death, and the closest the wall came in each room (px) */
function chaseRun(S,pause=0){
  const rec=[],near={};let died=0,last=null,ok=true;
  const log=(S,ev)=>{if(ev.includes('die'))died++;if(S.chase&&S.chase.on)near[S.room]=Math.min(near[S.room]??1e9,wx(S)-S.chase.x)};
  for(const [room,leg] of CHASE_LEGS){if(S.room!==room)continue;
    if(pause&&S.room!==last&&!Bot.idle(S,rec,pause,log)){ok=false;break}last=S.room;
    if(!leg(S,rec,log)){ok=false;break}}
  return {ok:ok&&!died&&S.room==='a3',rec,near,died,S};
}
const chaseState=(assist=0)=>{const S=newState();Object.assign(S,{lit:1,litT:60,match:1,mode:'play',assist});S.items.root=1;S.latch.r3=1;S.p.root=1;return S};
const atPedestal=(assist=0)=>{const S=chaseState(assist),R=ROOMS.r5,f=R.pedestals[0],t=R.torches[0];E.enterRoom(S,'r5',{x:f.tx*T+T+2,y:f.ty*T+T-PH});S.cp={room:'r5',tx:t.tx,ty:t.ty};return S};
const atTorch=(room,tx,ty,assist=0)=>{const S=chaseState(assist);S.pieces[0]=1;S.chase={id:'roots',on:1,x:0,t:0,w:0};S.cp={room,tx,ty};E.enterRoom(S,room,E.spot(S,ROOMS[room],tx,ty));CH.resetChase(S);return S};
/* closest approach per room in seconds: px / the wall's speed in that stretch (mid-room) / 60 */
const secs=near=>Object.entries(near).map(([k,d])=>`${k} ${(d/CH.speedAt(CHASES.roots,(ROOMS[k].at[0]+ROOMS[k].w/2)*T)/60).toFixed(1)}s`).join(', ');

console.log('Roots fragment and the thorn chase');
{ const R=ROOMS.r5,f=R.pedestals[0];
  ok(R.pedestals.length===1&&f.piece==='roots','r5 (Root Shrine) holds the Roots fragment on a pedestal');
  const S=atPedestal();const ev=run(S,60,I({l:1}));
  ok(S.pieces[0]===1&&ev.includes('piece')&&ev.includes('chase_start'),'walking into the pedestal lifts the fragment and wakes the chase');
  ok(S.chase&&S.chase.on===1&&S.chase.id==='roots','chase state is plain data: '+JSON.stringify(S.chase));
  const n=ev.filter(e=>e==='piece').length;run(S,30,I({l:1}));ok(n===1&&S.pieces[0]===1,'the pedestal is empty after: lifting happens once');
}
{ // determinism: the same inputs from the same snapshot give the same chase, frame for frame, through JSON
  const S=atPedestal();run(S,10,I({l:1}));const snap=snapshot(S),script=i=>I({r:i%50<40,j:i%31<9,jp:i%31===0});
  const tr=[];for(let i=0;i<600;i++){E.step(S,script(i),[]);if(S.chase)tr.push(S.chase.x)}
  const S2=newState();restore(S2,JSON.parse(JSON.stringify(snap)));const tr2=[];for(let i=0;i<600;i++){E.step(S2,script(i),[]);if(S2.chase)tr2.push(S2.chase.x)}
  ok(tr.length>100&&JSON.stringify(tr)===JSON.stringify(tr2)&&JSON.stringify(S)===JSON.stringify(S2),`chase is deterministic (${tr.length} frames, wall ${tr[0]}..${tr[tr.length-1].toFixed(1)})`);
  ok(tr.every(Number.isFinite),'wall position is always a finite number');
}
{ // speed and Assist
  const C=CHASES.roots,S=atPedestal();run(S,1,I({l:1}));while(S.chase.t<0)run(S,1,I());const x0=S.chase.x;run(S,60,I());const v=(S.chase.x-x0)/60;
  const A=atPedestal(1);run(A,1,I({l:1}));while(A.chase.t<0)run(A,1,I());const a0=A.chase.x;run(A,60,I());const va=(A.chase.x-a0)/60;
  ok(Math.abs(v-C.path[0][1])<1e-9,`the wall advances at the path's speed (${v.toFixed(3)} px/frame)`);
  ok(Math.abs(va/v-CH.ASSIST_SPEED)<1e-9,`Assist slows it to ${Math.round(va/v*100)}%`);
}
{ // death: the wall restarts gap px behind the torch he comes back at (wider with Assist; pinned for the mid ledge)
  const C=CHASES.roots;
  for(const [room,tx,ty,assist] of [['r4',4,5,0],['r3',33,7,0],['r4',4,5,1],['r4',20,16,0],['r5',19,16,0],['a4',26,15,0]]){
    const S=atTorch(room,tx,ty,assist);run(S,60,I());S.p.inv=0;S.chase.x=wx(S)+30;S.chase.t=0;   /* the thorns catch him */
    const evs=run(S,40,I());const want=C.at[room+':'+tx+','+ty]!==undefined?C.at[room+':'+tx+','+ty]*T:(ROOMS[room].at[0]+tx)*T+T/2-C.gap*(assist?CH.ASSIST_GAP:1);
    ok(evs.includes('die')&&evs.includes('rez')&&S.flash!==undefined,`${room}:${tx},${ty}${assist?' (Assist)':''}: the thorns glitch him out, he is back at his torch`);
    const back=Math.max(C.from*T,want);
    ok(S.room===room&&Math.abs(S.chase.x-back)<=2*C.path[0][1]+1e-9&&S.chase.on,`  ...and the wall restarted ${(wx(S)-S.chase.x).toFixed(0)} px behind him, not at the start of the run`);
  }
}
{ // completable by script with the root jump only: record a run, replay it, the wall never catches him
  const v=CHASES.roots.path[0][1],A=chaseRun(atPedestal());
  ok(A.ok,`from the pedestal a recorded run outruns the wall (${A.rec.length} frames, closest per room: ${secs(A.near)})`);
  const B=atPedestal();let died=0,done=0,minGap=1e9;for(const c of A.rec){const ev=E.step(B,dec(c),[]);if(ev.includes('die'))died++;if(ev.includes('chase_done'))done++;if(B.chase&&B.chase.on)minGap=Math.min(minGap,wx(B)-B.chase.x)}
  ok(!died&&done===1&&B.room==='a3'&&minGap>0,`replaying the recorded inputs: no death, chase_done once, closest ${minGap.toFixed(0)} px`);
  run(B,CH.WITHER+5,I());ok(B.chase===null,'outrun, the thorns wither away (chase cleared)');
  const H=chaseRun(atPedestal(),60);
  ok(H.ok,`a hesitant run (1 s standing still in every room) still makes it at full speed (closest: ${secs(H.near)})`);
  let all=true;const notes=[];
  for(const id of ['r5','a5','r4','r3','a4'])for(const t of ROOMS[id].torches){const r=chaseRun(atTorch(id,t.tx,t.ty),60);if(!r.ok)all=false;notes.push(`${id}:${t.tx},${t.ty} ${r.ok?Math.min(...Object.values(r.near)).toFixed(0)+'px':'FAIL'}`)}
  ok(all,'respawned at any torch on the path, the hesitant run still makes it: '+notes.join(', '));
  ok(['r5','a5','r4','r3','a4'].every(id=>ROOMS[id].torches.length>0),'every room on the chase path has a torch');
  { // R18: the chase ends as he enters Mossy Hush, a calm room; the wall is gone and its perch works at once
    const E1=chaseRun(atPedestal()).S;ok(E1.room==='a3'&&E1.chase&&!E1.chase.on,'the chase ends in Mossy Hush (a3): the wall has stopped');
    E.enterRoom(E1,'a3',{x:44*T+T/2-9,y:16*T-PH});run(E1,5,I());E1.still=0;E1.sit=0;run(E1,st.PERCH.wait+5,I());
    ok(E1.sit>0,'...and right after the chase he can sit on that room\'s perch (a calm room follows the chase)')}
}
{ // save: the fragment is kept at once; a chase saved mid-run resumes behind his torch; old saves load
  const S=atPedestal();const m=mem();const ev=run(S,30,I({l:1}));save(S,m);const d=load(m);
  ok(d.v===st.VER&&d.v>=3&&d.pieces[0]===1&&d.chase&&d.chase.on===1,`the save carries the fragment and the running chase (v3+, now v${st.VER})`);
  const S2=resume(newState(),d);E.enterRoom(S2,S2.cp.room,E.spot(S2,ROOMS[S2.cp.room],S2.cp.tx,S2.cp.ty));CH.resetChase(S2);
  ok(S2.pieces[0]===1&&S2.chase.on===1&&S2.chase.x<=wx(S2)-100,'reloaded mid-chase: the wall starts again a fair way behind his torch');
  m.setItem('tos_game',JSON.stringify({v:2,lit:1,items:{root:1},pieces:[1,0,0,0],torches:{},cp:{room:'r1',tx:36,ty:14},latch:{r3:1}}));
  const S3=resume(newState(),load(m));ok(S3.pieces[0]===1&&JSON.stringify(S3.placed)==='[0,0,0,0]'&&S3.chase===null&&S3.door===0,'a v2 save loads (no placed, door or chase fields)');
  ok(JSON.stringify(st.persist(S3)).length<2000&&!('assist' in st.persist(S3)),'Assist is a preference, never part of the save');
}

console.log('the door slot');
{ const door=(pieces=[1,0,0,0])=>{const S=playState('hub',144-P.PW/2,FLOOR-PH,{root:1});S.pieces=pieces.slice();run(S,3,I());return S};
  const S=door();const ev=run(S,1,I({j:1,jp:1}));
  ok(ev.includes('lift')&&!ev.includes('jump')&&S.slot&&S.slot.k===0,'at the door a jump/Up press sets the fragment off (no jump)');
  const x0=S.p.x,ev2=run(S,st.DOOR.fly-1,I({r:1}));const still=S.p.x===x0;ev2.push(...run(S,1,I()));
  ok(S.placed[0]===1&&ev2.includes('place')&&still,'it flies into its slot while he stands and watches; placed.roots = 1');
  run(S,st.DOOR.pulse,I());ok(S.slot===null&&!S.door,'the slot pulses, then the ritual ends; one piece does not open the door');
  const m=mem();save(S,m);const S2=resume(newState(),load(m));ok(S2.placed[0]===1,'placed fragments are saved');
  const D=door();D.dwell=0;let n=0;while(!D.slot&&n<200){run(D,1,I());n++}ok(D.slot&&n===st.DOOR.dwell,`standing still at the door ${n} frames sets it too (phones)`);
  const N=door([0,0,0,0]);const ev3=run(N,1,I({j:1,jp:1}));run(N,80,I());ok(ev3.includes('jump')&&!N.slot,'without a fragment, a press at the door is just a jump');
  const F=playState('hub',40,FLOOR-PH,{root:1});F.pieces=[1,0,0,0];run(F,80,I());ok(!F.slot,'away from the door nothing happens');
  const A=door([1,1,1,1]);A.placed=[0,1,1,1];const evs=[];run(A,1,I({j:1,jp:1}));for(let i=0;i<st.DOOR.fly+st.DOOR.pulse+st.DOOR.open+5;i++)evs.push(...E.step(A,I(),[]));
  ok(A.door===1&&evs.includes('door')&&evs.filter(e=>e==='opened').length===1,'the fourth fragment opens the door (door: 1), then "opened" fires once (the host\'s onDone)');
}

console.log('the stuck hint');
{ const S=playState('r1',34*T,FLOOR-PH);S.seen={r1:1};run(S,st.STUCK-2,I());ok(!S.hint,`no hint before ${st.STUCK/3600} minutes`);
  run(S,2,I());ok(S.hint&&S.hint.room==='r1'&&S.hint.x===(ROOMS.r1.at[0]+23)*T+T/2,'after 3 minutes without progress he looks toward the seed (NEXT table)');
  S.items.root=1;run(S,1,I());ok(S.hint&&S.hint.room==='r5','with the root jump the next goal is the shrine');
  S.pieces[0]=1;run(S,1,I());ok(S.hint&&S.hint.room==='hub','with the fragment, the door');
  const ev=run(S,300,I({r:1}));ok(ev.includes('room')&&S.stuck<300&&!S.hint,'entering a new room is progress: the timer resets');
  const L=playState('r1',34*T,FLOOR-PH);L.seen={r1:1};run(L,st.STUCK+10,I());const lit=L.torches;L.p.x=21*T;L.p.y=FLOOR-PH-1;run(L,2,I());
  ok(!L.hint&&L.stuck<5,'lighting a torch is progress too');
  const D=newState();D.mode='dark';D.match=1;D.p.x=150;D.p.y=FLOOR-PH;run(D,st.STUCK+10,I());ok(D.stuck===0&&!D.hint,'never in the dark before the torch (that has its own nudge)');
  const C=atTorch('r3',33,7);C.chase.t=-1e6;C.seen={r3:1};run(C,st.STUCK+10,I());ok(!C.hint,'never during a chase');
  ok(NEXT.every(n=>ROOMS[n.room]),'every goal in the NEXT table names a real room');
}

/* Wrap Steps: the three walls, [wall's west column, where he stands east of it]; the top of a wall (row 10) */
const WALLS=[[46,53],[30,38],[14,22]],topOf=w=>S=>S.p.on<0&&S.p.y+PH<=10*T+.1&&S.p.x+P.PW>w*T&&S.p.x<(w+3)*T;
/* Puff Drift: the pits going west, [where he stands east of the pit, the floor beyond it], and going east back home */
const PITS=[[42*T,S=>S.p.on<0&&S.p.y+PH<=192.1&&S.p.x+P.PW<=30*T+2],[24*T,S=>S.p.on<0&&S.p.y+PH<=192.1&&S.p.x+P.PW<=12*T+2]];
console.log('the perch (the engine hold)');
{ const seat=(room,tx,ty)=>{const S=playState(room,tx*T+T/2-9,(ty+1)*T-PH,{});run(S,3,I());S.still=0;S.sit=0;return S};
  const R=ROOMS.a1,q=R.perches.find(p=>p.tx===38),hi=R.perches.find(p=>p.tx===22);
  ok(R.perches.length===2&&q.ty===15&&q.lookx===-8&&q.looky===0&&hi.ty===10&&hi.lookx===-10,'a1 has two perches: 38,15 by the torch (look -8,0) and 22,10 on the high ledge (look -10,0), read from the ents');
  ok(ROOMS.a3.perches.length===1&&ROOMS.a5.perches.length===1,'the other calm rooms (a3, a5) have a perch each; no other room has one');
  const S=seat('a1',38,15);const ev=run(S,st.PERCH.wait-1,I());
  ok(!S.sit&&!ev.includes('sit'),`standing still on the perch for ${st.PERCH.wait-1} frames does not sit him yet`);
  const ev2=run(S,2,I());ok(S.sit>0&&ev2.filter(e=>e==='sit').length===1,`after ${st.PERCH.wait} still frames he sits (the event fires once)`);
  const x0=S.cam.x;run(S,st.PERCH.drift+120,I());
  const stand=playState('a1',38*T+T/2-9,16*T-PH,{});run(stand,3,I());stand.sit=0;stand.p.face=1;run(stand,0,I());
  ok(S.cam.x<x0-40,`sitting, the camera drifts toward the perch's look: ${(x0-S.cam.x).toFixed(0)} px west of where it started`);
  const ev3=run(S,1,I({r:1}));ok(!S.sit&&ev3.includes('stand'),'any input stands him up at once');
  ok(S.still===0,'...and the wait starts over');
  const W=seat('a1',38,15);W.p.x=36*T;run(W,60,I());ok(!W.sit,'standing still next to the perch (not on it) does not sit him');
  const M=seat('a1',33,13);let sat=0;for(let i=0;i<60;i++){run(M,1,I({r:1}));if(M.sit)sat=1}ok(!sat,'walking over the perch without stopping does not sit him');
  const A=seat('a1',38,15);run(A,100,I());ok(A.sit>0,'(sitting again)');const snap=snapshot(A),B=newState();restore(B,JSON.parse(JSON.stringify(snap)));
  ok(B.sit===A.sit&&B.still===A.still,'sitting is plain data: it survives a snapshot');
  const m=mem();save(A,m);ok(!('sit' in JSON.parse(m.d.tos_game)),'sitting is never written to the save');
  const C=seat('a1',38,15);for(let i=0;i<100;i++){C.chase={id:'roots',on:1,x:-9999,t:-1e6,w:0};E.step(C,I(),[])}ok(!C.sit&&!C.still,'during a chase he never sits');
  const D=seat('a1',38,15);run(D,100,I());D.p.inv=0;D.p.dead=0;E.step(D,I({j:1,jp:1}),[]);ok(!D.sit,'a jump press stands him up (no ground jump while sitting is kept)');
  const F=playState('r1',34*T,FLOOR-PH,{});run(F,200,I());ok(!F.sit&&!F.still,'a room with no perch never sits him');
}
console.log('the paced Roots rooms (a1 to a5)');
{ // layout lint: the editor's own checks over every room file, plus the Roots box of the world plan
  const fsx=await import('node:fs'),{problems}=await import(G+'dev/roomfmt.js'),dir=new URL('rooms/',G);
  const files=fsx.readdirSync(dir).filter(f=>f.endsWith('.js')&&f!=='index.js'),srcs=[];
  for(const f of files)srcs.push((await import(dir.href+f)).default);
  const list=ORDER.map(id=>srcs.find(r=>r.id===id)),out=problems(list);
  ok(list.every(Boolean)&&!out.length,`the editor's checks find nothing in any room (${out.length} findings${out.length?': '+out.slice(0,3).map(o=>o.id+' '+o.msg).join('; '):''})`);
  { // water and lava sit inside the ground like a pool: rock under every such tile, and rock (or more of the liquid) at both ends of each stretch
    const bad=[];for(const r of list)r.grid.forEach((row,y)=>[...row].forEach((c,x)=>{if(c!=='~'&&c!=='L')return;
      const below=(r.grid[y+1]||'#')[x],left=row[x-1]??'#',right=row[x+1]??'#';
      if(!'#~L'.includes(below)||!'#~L'.includes(left)||!'#~L'.includes(right))bad.push(`${r.id}:${x},${y}`)}));
    ok(!bad.length,`every water or lava tile is inset in the ground (rock below, rock or liquid beside)${bad.length?': '+bad.slice(0,4).join(' '):''}`)}
  const BOX=[-430,-40,0,23],inBox=r=>r.biome!=='roots'||(r.at[0]>=BOX[0]&&r.at[1]>=BOX[1]&&r.at[0]+r.grid[0].length-1<=BOX[2]&&r.at[1]+r.grid.length-1<=BOX[3]);
  ok(list.every(inBox),'every Roots room lies inside the Roots box of the world plan (x -430..0, y -40..23)');
}
{ // the calm rooms pass both ways by walking and hopping. Seedbed comes before the seed, so it needs no root jump at all
  for(const [room,x,y,dir,goal,name,items] of [['a1',46*T,FLOOR-PH,'l','r1','Seedbed west',{}],['a1',1*T,FLOOR-PH,'r','hub','Seedbed east',{}],['a3',54*T,8*T-PH,'l','a4','Mossy Hush west',{root:1}],['a3',1*T,FLOOR-PH,'r','r2','Mossy Hush east',{root:1}],['a5',34*T,17*T-PH,'l','r5','Root Cathedral west',{root:1}],['a5',1*T,17*T-PH,'r','r4','Root Cathedral east',{root:1}]]){
    const S=playState(room,x,y,items);run(S,3,I());const rec=[];ok(Bot.go(S,rec,dir,S=>S.room===goal,1500)&&!S.p.dead,`${name}: crossed by walking and hopping${items.root?'':', no root jump'} (${(rec.length/60).toFixed(1)} s)`)}
}
{ // Seedbed's high ledge (row 11, cols 20 to 27, 5 tiles over the pool): a gate he sees on the way in, a prize once Rootway gives him the root jump
  const onLedge=S=>S.p.on<0&&S.p.ground&&S.p.y+PH<=11*T+.1&&S.p.x+P.PW>20*T&&S.p.x<28*T;
  for(const [name,x,y,dir] of [['the west bank',15*T-P.PW,16*T-PH,'r'],['the east bank',29*T,16*T-PH,'l'],['the 2-tall hump',33*T,14*T-PH,'l']]){
    ok(!!canReach('a1',x,y,{root:1},dir,onLedge,{noEns:true}),`a1: with the root jump the ledge is reachable from ${name}`);
    ok(!canReach('a1',x,y,{},dir,onLedge,{noEns:true}),`a1: without it the ledge is out of reach from ${name}`);
    const rv=revReach('a1',x,y,{},dir,onLedge,{noEns:true});ok(!rv.length,`a1: ...also with an air reversal (${REV.length} runs${rv.length?', reached with '+rv.join(' '):''})`)}
  const T1=ROOMS.a1.torches.length,Pe=ROOMS.a1.perches.some(p=>p.ty===10);ok(T1===2&&Pe,'a1: the ledge carries a torch and a perch (a lit prize that shows from the floor)');
}
{ // Wrap Steps: each wall is 6 tiles; the root jump reaches 5.84, so only a wrapped Mossback makes the step
  for(const [w,sx] of WALLS){
    ok(!canReach('a2',sx*T,FLOOR-PH,{root:1},'l',topOf(w),{noEns:true}),`a2: the wall at column ${w} is out of reach of the root jump alone`);
    const rv=revReach('a2',sx*T,FLOOR-PH,{root:1},'l',topOf(w),{noEns:true});ok(!rv.length,`a2: ...also with an air reversal (${REV.length} runs${rv.length?', reached with '+rv.join(' '):''})`);
    let n=0;for(const wait of W10(60)){const S=playState('a2',sx*T,FLOOR-PH,{root:1});run(S,3,I());
      if(Bot.hop(S,[],'l',S=>S.p.on>=0&&Bot.hop(snapshot(S),[],'l',topOf(w)),{waits:[wait]}))n++}
    ok(n>=20,`a2: wrapping the Mossback at column ${w} and climbing works from ${n}/60 Mossback timings (need >= 20)`);
    const E1=playState('a2',(w-6)*T,FLOOR-PH,{root:1});run(E1,3,I());
    ok(!!Bot.go(E1,[],'r',S=>S.p.x>(w+3)*T,300),`a2: the way back east over the wall at column ${w} needs only hops (shelf then wall)`)}
  /* the launch pads: every place he can set off from westbound must be out of root-jump reach of the next wall top,
     or he skips the Mossback. A pad 3 or 4 tiles up reaches a 6-tile wall only across 8 tiles or less (measured) */
  for(const [name,px,row,w] of [['the east step',59,12,46],['the east terrace',63,8,46],['the shelf of wall 46',43,13,30],['the shelf of wall 30',27,13,14],['the top of wall 46',46,10,30],['the top of wall 30',30,10,14]]){
    const at=(px+.01)*T,r=canReach('a2',at,row*T-PH,{root:1},'l',topOf(w),{noEns:true});
    ok(!r,`a2: from ${name} the wall at column ${w} is out of reach of the root jump alone`);
    const rv=revReach('a2',at,row*T-PH,{root:1},'l',topOf(w),{noEns:true});ok(!rv.length,`a2: ...also with an air reversal (${REV.length} runs${rv.length?', reached with '+rv.join(' '):''})`)}
}
{ // Puff Drift: a pit is 12 wide, the root jump crosses 11; a puff turns it into two short hops
  const tW=[S=>S.p.on<0&&S.p.ground&&S.p.x+P.PW<=30*T+2,S=>S.p.on<0&&S.p.ground&&S.p.x+P.PW<=12*T+2],tE=[S=>S.p.on<0&&S.p.ground&&S.p.x>=24*T,S=>S.p.on<0&&S.p.ground&&S.p.x>=42*T];
  for(const [name,x,dir,tgt] of [['pit 1 going west',42*T,'l',tW[0]],['pit 2 going west',24*T,'l',tW[1]],['pit 2 going east',11.5*T,'r',tE[0]]]){
    ok(!canReach('a4',x,FLOOR-PH,{root:1},dir==='l'?'l':'r',tgt,{noEns:true}),`a4 ${name}: the root jump alone does not cross`);
    const rv=revReach('a4',x,FLOOR-PH,{root:1},dir,tgt,{noEns:true});ok(!rv.length,`a4 ${name}: ...also with an air reversal`);
    let n=0,n0=0;for(let w=0;w<180;w+=6){const S=playState('a4',x+(dir==='l'?24:-24),FLOOR-PH,{root:1});run(S,3,I());if(Bot.puffStep(S,dir,w,x))n++;
      const Z=playState('a4',x,FLOOR-PH,{root:1});run(Z,3,I());if(Bot.puffStep(Z,dir,w,x))n0++}
    ok(n>=27,`a4 ${name}: running up to the lip, a person-like bot lands on the puff from ${n}/30 puff phases (need >= 27; a standing jump from the lip: ${n0}/30)`)}
  { // the east pit is the safe beat: a miss is a climb, not a death. Going west only the puff stone gets him out the far side
    const S=playState('a4',41*T-4,FLOOR-PH,{root:1});run(S,3,I());S.p.inv=0;let died=0;for(let i=0;i<200;i++){if(run(S,1,I({l:1})).includes('die'))died++;if(S.p.x<36*T)break}
    run(S,60,I());ok(!died&&!S.p.dead&&S.p.y+PH>=22*T-1,'the east pit: falling in lands him alive on its rock floor, 6 tiles under the rim');
    const out=Bot.go(S,[],'r',S=>S.p.x>=42*T&&S.p.ground,900);ok(out&&!S.p.dead,'...and the 3-tall step in its east wall climbs him back out to retry');
    const T2=playState('a4',41*T-4,FLOOR-PH,{root:1});run(T2,3,I());T2.p.inv=0;T2.ens=[];run(T2,200,I({l:1}));
    ok(!Bot.go(T2,[],'l',S=>S.p.x+P.PW<=30*T+2&&S.p.y+PH<=FLOOR+.1,600),'from its floor the far (west) side is out of reach: 6 tiles is more than the root jump rises');
    const L=playState('a4',23*T-4,FLOOR-PH+T,{root:1});run(L,3,I());L.p.inv=0;const dv=run(L,200,I({l:1}));ok(dv.includes('die'),'the west pit still kills: its floor is thorns');
  }
  { // the way home across pit 2 starts from the west step and terrace: neither may reach the far floor without the puff
    for(const [name,x,row] of [['the west step',6.4,12],['the west terrace',2.4,8]])
      ok(!canReach('a4',x*T,row*T-PH,{root:1},'r',tE[0],{noEns:true}),`a4: from ${name} the far floor of pit 2 is out of reach of the root jump alone`)}
  for(const back of [12,24,48]){let n=0;for(let w=0;w<180;w+=6){const S=playState('a4',42*T+back,FLOOR-PH,{root:1});run(S,3,I());if(Bot.puffStep(S,'l',w,42*T))n++}
    ok(n>=27,`a4: with a run-up of ${back} px the puff step works from ${n}/30 phases (need >= 27)`)}
}
console.log('a whole run, by script: hub -> seed -> lesson -> ... -> shrine -> chase -> home -> door');
/* Hollow going east (the old chase legs): the near ledge, the pillar's Mossback, the far ledge, out */
const HOME_R2=[
  (S,r)=>S.p.x>150||Bot.walk(S,r,'r',S=>S.p.x>=46,200),
  (S,r)=>S.p.x>150||Bot.hop(S,r,'r',S=>S.p.on>=0&&Bot.hop(snapshot(S),[],'r',far2),{waits:[0,10,20,30,40,60,80,100,130,160,200]}),
  (S,r)=>S.p.x>150||Bot.hop(S,r,'r',far2,{}),
  (S,r)=>Bot.walk(S,r,'r',S=>S.room==='a2',300),
];
{ const S=newState();Object.assign(S,{lit:1,litT:60,match:1,mode:'play'});const t=ROOMS.hub.torches[0];S.cp={room:'hub',tx:t.tx,ty:t.ty};S.torches['hub:'+t.tx+','+t.ty]=1;
  E.enterRoom(S,'hub',E.spot(S,ROOMS.hub,t.tx,t.ty));
  const rec=[],start=snapshot(S);let fail='';
  const L=(n,f)=>{const r=f();if(!r)fail=n+' in '+S.room;return r};
  const ok1=
    L('hub',()=>Bot.go(S,rec,'l',S=>S.room==='a1',600))&&L('seedbed',()=>Bot.go(S,rec,'l',S=>S.room==='r1',900))&&L('r1 in',()=>Bot.walk(S,rec,'l',S=>S.p.x<=36*T,200))&&
    L('seed',()=>Bot.search(S,rec,W10(64),C=>enc(1,0,1,C.p.ground),C=>C.items.root))&&L('demo',()=>Bot.walk(S,rec,'',S=>!S.p.demo&&S.p.ground,400))&&
    L('bank',()=>Bot.walk(S,rec,'l',S=>S.p.x<=20*T+1,200))&&
    L('lesson',()=>Bot.hop(S,rec,'l',S=>S.p.on>=0&&Bot.hop(snapshot(S),[],'l',S=>S.p.x<106&&S.p.on<0),{waits:W10(60)}))&&L('lesson 2',()=>Bot.hop(S,rec,'l',S=>S.p.x<106&&S.p.on<0))&&
    L('step',()=>Bot.hop(S,rec,'l',S=>S.p.y+PH<=156.1&&S.p.x<95,{waits:[0,5,10,20]}))&&L('high ledge',()=>Bot.hop(S,rec,'l',S=>S.p.y+PH<=96.1&&S.p.x+P.PW<73,{waits:[0,5,10,20]}))&&
    L('r1 out',()=>Bot.walk(S,rec,'l',S=>S.room==='a2',300))&&
    WALLS.every(([w,sx])=>L('a2 to '+w,()=>Bot.go(S,rec,'l',S=>S.p.x<=sx*T&&S.p.ground,600))&&
      L('a2 wrap '+w,()=>Bot.hop(S,rec,'l',S=>S.p.on>=0&&Bot.hop(snapshot(S),[],'l',topOf(w)),{waits:W10(70)}))&&L('a2 top '+w,()=>Bot.hop(S,rec,'l',topOf(w))))&&
    L('a2 out',()=>Bot.go(S,rec,'l',S=>S.room==='r2',600))&&L('r2 edge',()=>Bot.walk(S,rec,'l',S=>S.p.x<=206,300))&&
    L('r2 cross',()=>Bot.hop(S,rec,'l',S=>S.p.on>=0&&Bot.hop(snapshot(S),[],'l',S=>S.p.y+PH<=96.1&&S.p.x<71&&S.p.on<0),{waits:W10(40)}))&&L('r2 cross 2',()=>Bot.hop(S,rec,'l',S=>S.p.y+PH<=96.1&&S.p.x<71&&S.p.on<0))&&
    L('r2 out',()=>Bot.walk(S,rec,'l',S=>S.room==='a3',300))&&L('hush',()=>Bot.go(S,rec,'l',S=>S.room==='a4',1200))&&
    PITS.every(([lip,tgt])=>L('a4 pit '+lip,()=>Bot.puffCross(S,rec,'l',lip,tgt)))&&
    L('a4 out',()=>Bot.go(S,rec,'l',S=>S.room==='r3',900))&&L('r3 ledge',()=>Bot.walk(S,rec,'l',S=>S.p.x<=20*T,300))&&
    L('r3 puff',()=>{for(const w of W10(24))for(let at=8;at<40;at++){const C=snapshot(S),r=[];let bad=false,stun=false;
      for(let i=0;i<w;i++){r.push(0);if(E.step(C,I(),[]).includes('die'))bad=true}if(bad)continue;
      for(let i=0;i<70;i++){const c=enc(1,0,i>=at,i===at),ev=E.step(C,dec(c),[]);r.push(c);if(C.p.dead){bad=true;break}if(ev.includes('stun')){stun=true;break}}
      if(bad||!stun)continue;
      for(let i=0;i<400&&C.room==='r3';i++){E.step(C,dec(1),[]);r.push(1);if(C.p.dead){bad=true;break}}
      if(!bad&&C.room==='r4'){restore(S,C);rec.push(...r);return true}}return false})&&
    L('r4 in',()=>Bot.walk(S,rec,'l',S=>S.p.x<=12*T,300))&&
    R4L.every((lg,i)=>L('r4 ledge '+lg[0],()=>{let dir='l';if(i){const [d,lip]=r4lip(R4L[i-1]);dir=d;if(!r4toLip(S,rec,d,lip))return false}
      return Bot.hop(S,rec,dir,r4on(lg),{waits:W10(30)})}))&&
    L('r4 out',()=>Bot.walk(S,rec,'l',S=>S.room==='r5',400))&&L('dais',()=>Bot.walk(S,rec,'l',S=>S.p.x<=11*T+2,300))&&L('dais up',()=>Bot.hop(S,rec,'l',S=>S.p.y+PH<=144.1+4*T||S.pieces[0],{roots:[0]}))&&
    L('chase',()=>{const r=chaseRun(S);rec.push(...r.rec);return r.ok})&&
    L('a3 home',()=>Bot.go(S,rec,'r',S=>S.room==='r2',1200))&&
    L('r2 home',()=>HOME_R2.every(f=>f(S,rec)))&&L('a2 home',()=>Bot.go(S,rec,'r',S=>S.room==='r1',900))&&
    L('r1 edge',()=>Bot.walk(S,rec,'r',S=>S.p.x>=50,100))&&L('r1 drop',()=>Bot.hop(S,rec,'r',S=>S.p.y+PH>150&&S.p.y+PH<=156.1,{jump:[0],roots:[0],holds:[1,2,4,6,8,10,12,14,16]}))&&
    L('r1 back',()=>Bot.hop(S,rec,'r',S=>S.p.on>=0&&Bot.hop(snapshot(S),[],'r',S=>S.p.x>222&&S.p.on<0),{waits:W10(60)}))&&L('r1 back 2',()=>Bot.hop(S,rec,'r',S=>S.p.x>222&&S.p.on<0))&&
    L('pillar',()=>Bot.walk(S,rec,'r',S=>S.p.x>=22*T,300))&&L('r1 exit',()=>Bot.search(S,rec,W10(64),C=>enc(0,1,1,C.p.ground),C=>C.room==='a1',600))&&L('home',()=>Bot.go(S,rec,'r',S=>S.room==='hub',900))&&
    L('door',()=>Bot.walk(S,rec,'r',S=>S.p.x+P.PW/2>=134,400))&&L('place',()=>{rec.push(enc(0,0,1,1));E.step(S,dec(enc(0,0,1,1)),[]);return Bot.idle(S,rec,140)&&S.placed[0]===1});
  ok(ok1,`the bot finds a whole run with the root jump only (${(rec.length/60).toFixed(0)} s of play)${fail?' FAILED at '+fail:''}`);
  restore(S,start);const evs={};let died=0;for(const c of rec){const ev=E.step(S,dec(c),[]);for(const e of ev)evs[e]=(evs[e]||0)+1;if(ev.includes('die'))died++}
  ok(!died&&S.placed[0]===1&&evs.chase_done===1&&evs.place===1&&S.seen.r5,`replayed from the start: no deaths, chase outrun, Roots fragment in the door (${Object.keys(S.seen).length} rooms seen)`);
  if(process.env.GAME_SCRIPT_OUT){const fs=await import('node:fs');fs.writeFileSync(process.env.GAME_SCRIPT_OUT,JSON.stringify(rec));console.log('    wrote',process.env.GAME_SCRIPT_OUT)}
}

console.log('the camera (feel Stage 3)');
/* test rooms 30x50 tiles (600 px tall, so cam.y is not clamped): walls, a floor at row 30 (top 360) and solid boxes
   [col0,col1,row0,row1]. Only in ROOMS (not ORDER), removed at the end. old() is the pre-Stage-3 camera, written out here. */
{ const {parse}=await import(G+'rooms/index.js'),VW=E.VW,VH=E.VH,cl=(v,a,b)=>v<a?a:v>b?b:v,made=[];
  const box=(id,rects,ents=[],put={})=>{const g=[];for(let y=0;y<50;y++){let r='';for(let x=0;x<30;x++)r+=put[x+','+y]||(x===0||x===29||y>=48||y===30||rects.some(([a,b,c,d])=>x>=a&&x<=b&&y>=c&&y<=d)?'#':'.');g.push(r)}
    made.push(id);return ROOMS[id]=parse({id,name:'t',biome:'roots',at:[9000+made.length*40,9000],grid:g,ents})};
  const oldT=(S,R,q=null,k=0)=>{const p=S.p;return {x:cl(p.x+P.PW/2-VW/2+p.face*12+(q?q.lookx*T*k:0),0,R.w*T-VW),y:cl(p.y+PH/2-VH/2-8+(q?q.looky*T*k:0),0,R.h*T-VH)}};
  const old=(S,R,cy,e=.12)=>cy+(oldT(S,R).y-cy)*e;
  const R=box('camflat',[]),S=playState('camflat',150,360-PH);run(S,300,I());
  const y0=S.cam.y;run(S,1,I());
  ok(S.cam.y===y0&&y0>0&&y0<R.h*T-VH&&S.cam.gy===S.p.y,`setup: settled on flat ground the camera holds (cam.y ${y0.toFixed(1)}, not clamped) and aims at his own height`);
  let top=S.p.y,dev=0;run(S,1,I({j:1,jp:1}));for(let i=0;i<120&&!S.p.ground;i++){run(S,1,I({j:1}));top=Math.min(top,S.p.y);dev=Math.max(dev,Math.abs(S.cam.y-y0))}
  run(S,30,I());dev=Math.max(dev,Math.abs(S.cam.y-y0));
  ok(360-PH-top>38&&dev===0,`C1: a full standing jump (${(360-PH-top).toFixed(1)} px) leaves cam.y unchanged (max change ${dev} px)`);
  for(const rows of [8,9]){   // walk off a ledge and drop 96 or 108 px to the floor
    const id='camfall'+rows,R2=box(id,[[1,8,30-rows,30-rows]]),F=playState(id,5*T,(30-rows)*T-PH);run(F,300,I());
    let oy=F.cam.y,n=0,worst=0;while(F.p.ground&&n<60){run(F,1,I({r:1}));oy=old(F,R2,oy);n++}
    for(let i=0;i<40;i++){run(F,1,I({r:1}));oy=old(F,R2,oy);worst=Math.max(worst,Math.abs(F.cam.y-oy))}
    ok(F.p.ground&&F.p.y===360-PH&&worst<1,`C1: a ${rows*T} px fall: 40 frames on, cam.y ${F.cam.y.toFixed(2)} vs the old ${oy.toFixed(2)} (worst gap ${worst.toFixed(3)} px, limit 1)`);
  }
  for(const [rows,root] of [[3,0],[4,1]]){   // jump onto a box 36 px up (inside the window) or 48 px up (above it: the root jump)
    const id='camstep'+rows,R3=box(id,[[12,20,30-rows,29]]),C=playState(id,124,360-PH,root?{root:1}:{});run(C,300,I());
    const c0=C.cam.y,up=(30-rows)*T-PH;let held=1,fired=0;run(C,1,I({r:1,j:1,jp:1}));
    for(let i=0;i<120&&!(C.p.ground&&C.p.y===up);i++){const ev=run(C,1,root&&!fired&&C.p.vy>=0?I({r:1,j:1,jp:1}):I({r:1,j:1}));if(ev.includes('root'))fired=1;if(C.cam.y!==c0)held=0}
    const g=C.cam.gy-C.p.y,N=6+(g>.5?Math.ceil(Math.log(2*g)/-Math.log(.94)):0)+3;   // 6 frames' wait, then 12% chasing 6%: gap ~2g*.94^n
    for(let i=0;i<5;i++){run(C,1,I());if(C.cam.y!==c0)held=0}   // the landing frame is ground frame 1
    run(C,N-5,I());const miss=Math.abs(C.cam.y-oldT(C,R3).y);
    if(!root)ok(C.p.y===up&&held,`C1, C2: jumping onto a box 36 px up, the camera holds through the jump and for 6 frames on the box`);
    ok(C.p.y===up&&miss<1,`C2: landed ${rows*T} px up (ground ref ${g.toFixed(1)} px below him on landing), ${N} frames later the camera is centred on him (${miss.toFixed(3)} px off, limit 1)`);
  }
  { const p=S.p;S.cam.gy=9999;S.cam.gt=5;S.cam.x=-50;S.cam.y=-50;E.enterRoom(S,'camflat',{x:200,y:300});const t=oldT(S,R);
    ok(S.cam.x===t.x&&S.cam.y===t.y&&S.cam.gy===p.y&&S.cam.gt===0,'a room entry still snaps the camera to the old target and resets the ground memory');
    const a=JSON.stringify(S.cam);ok(JSON.stringify(snapshot(S).cam)===a&&Object.values(S.cam).every(v=>typeof v==='number'),'the camera memory is plain numbers (snapshot-safe)')}
  { const D=newState();D.mode='dark';D.match=1;D.intro.land=0;run(D,120,I());ok(Number.isFinite(D.cam.x)&&Number.isFinite(D.cam.y)&&D.cam.gy===D.p.y,'a fresh state (no snap yet, dark mode) gets its ground memory on the first step');}
  { const L=box('camlead',[]),A=playState('camlead',150,360-PH);A.p.face=1;run(A,200,I());const x12=A.cam.x;
    P.FEEL.LEAD=1;run(A,300,I());const x0=A.cam.x;P.FEEL.LEAD=0;run(A,300,I());
    ok(P.LEAD===0&&Math.abs(x12-oldT(A,L).x)<1e-6&&Math.abs(x0-(x12-12))<1e-6&&Math.abs(A.cam.x-x12)<1e-6,`C3: LEAD 0 is face*12; LEAD 1 standing still leads by vx*8 = 0 (cam.x ${x12.toFixed(1)} -> ${x0.toFixed(1)}); default 0`)}
  { // a perch in a tall room with a vertical look: the drift matches the old camera frame for frame
    const Rp=box('camperch',[],[{at:[10,29],looky:-4}],{'10,29':'B'}),Q=playState('camperch',10*T+T/2-9,360-PH);run(Q,3,I());Q.still=0;Q.sit=0;
    let oy=Q.cam.y,ox=Q.cam.x,worst=0;
    for(let i=0;i<st.PERCH.wait+st.PERCH.drift+150;i++){E.step(Q,I(),[]);const q=Q.sit?Rp.perches[0]:null,k=q?Math.min(1,Q.sit/st.PERCH.drift):0,t=oldT(Q,Rp,q,k),e=q?.04:.12;
      ox+=(t.x-ox)*e;oy+=(t.y-oy)*e;worst=Math.max(worst,Math.abs(Q.cam.y-oy),Math.abs(Q.cam.x-ox))}
    ok(Q.sit>0&&Q.cam.y<y0-30&&worst<1e-9,`perch: the look drifts the camera ${(y0-Q.cam.y).toFixed(0)} px up, the same as the old camera (worst gap ${worst})`)}
  { // a swim up the f2 pool (bottom to surface, a stroke every 15 frames), then floating: never on the ground, so in water it follows as before
    const R5=ROOMS.f2,W=playState('f2',43*T,21*T-PH);W.ens=[];let oy=W.cam.y,worst=0;
    for(let i=0;i<500;i++){E.step(W,i<120&&i%15===0?I({j:1,jp:1}):I(),[]);oy+=(oldT(W,R5).y-oy)*.12;worst=Math.max(worst,Math.abs(W.cam.y-oy))}
    ok(!W.p.ground&&W.p.y<200&&worst<1e-9,`swimming up and floating at the surface, the camera matches the old one (worst gap ${worst}; he sits ${(W.p.y-W.cam.y).toFixed(0)} px down)`)}
  for(const id of made)delete ROOMS[id];
}
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails?1:0);
