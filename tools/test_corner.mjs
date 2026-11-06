#!/usr/bin/env node
/* Tests for B5, the player-only ceiling corner correction (game/docs/character-feel.md B5, character-feel-plan.md
   section 4 step 3). Written before the correction existed; the two "passes the lip" cases failed until B5 landed.
   Everything goes through the public stepPlayer() and move() on a small hand-built room, so the tests do not
   depend on the name of the future move() option. Run: node tools/test_corner.mjs */
import assert from 'node:assert/strict';
const G=new URL('../game/',import.meta.url).href;
const {T,newState,newPlayer}=await import(G+'state.js');
const E=await import(G+'engine.js');
const P=await import(G+'player.js');
const {PW,PH}=P,CORNER=P.FEEL.CORNER??4;

let pass=0,fail=0;
async function test(name,fn){try{await fn();pass++;console.log('ok   '+name)}catch(e){fail++;console.log('FAIL '+name+'\n     '+(e&&e.message||e).split('\n').join('\n     '))}}

/* Geometry. T=12, the head box is PW=18 wide. engine.js hits() checks tile columns floor(x/T) .. ceil((x+PW)/T)-1.
   Room: 10 x 14 tiles, walled. Floor is row 12 (top 144), so standing y = 144-PH = 120. The ceiling is row 8:
   LIP_TOP = 96, LIP_BOT = 108. A full jump rises ~42 px (to y ~78), so a head that gets past the lip clears LIP_TOP.
   Lip on the LEFT: row 8 solid in columns 0..3 (right edge x=48), columns 4..9 open. For an overlap of k px the head's
     left edge sits k px inside column 3: x = 48-k. k=3 -> x=45 (columns 3..5; 45..48 is the 3 px in the solid).
     Moving right by k puts x at 48 (columns 4..5, free). Moving left only adds overlap.
   Lip on the RIGHT: row 8 solid in columns 6..9 (left edge x=72), columns 0..5 open. The head's right edge sits k px
     inside column 6: x+PW = 72+k -> x = 54+k. k=3 -> x=57 (columns 4..6). Moving left by k puts x at 54 (columns 4..5).
   The blocking case uses k = CORNER+1 (5 px today): the largest nudge, CORNER px, still leaves 1 px in the solid. */
const W=10,H=14,FLOOR_ROW=12,LIP_ROW=8,LIP_TOP=LIP_ROW*T,LIP_BOT=(LIP_ROW+1)*T,STAND_Y=FLOOR_ROW*T-PH;
function room(lip){   // lip: 'left' | 'right' | 'full' | 'none'
  const g=[];
  for(let y=0;y<H;y++){let r='';for(let x=0;x<W;x++){
    let c=x===0||x===W-1||y===0||y>=FLOOR_ROW?'#':'.';
    if(y===LIP_ROW&&(lip==='full'||(lip==='left'&&x<=3)||(lip==='right'&&x>=6)))c='#';
    r+=c}g.push(r)}
  /* at: far from every real room, so roomAtTile() finds nothing and tiles outside count as solid */
  return {id:'corner_test',w:W,h:H,at:[100000,100000],g,spawns:[],torches:[],items:[],pedestals:[],plates:[],gates:[]};
}
const xFor=(lip,k)=>lip==='left'?4*T-k:6*T-PW+k;
const I=(o={})=>({l:0,r:0,u:0,d:0,j:0,jp:0,b:0,bp:0,drag:null,any:0,...o});
function setup(lip,x){
  const S=newState();Object.assign(S,{lit:1,litT:60,match:1,mode:'play',ens:[],liq:null});
  S.p=newPlayer(x,STAND_Y);const R=room(lip);
  for(let i=0;i<5;i++)P.stepPlayer(S,R,I(),[],[]);   // settle on the floor
  assert.ok(S.p.ground&&S.p.y===STAND_Y&&S.p.x===x,`setup: standing at x ${x}, y ${STAND_Y} (got x ${S.p.x}, y ${S.p.y}, ground ${S.p.ground})`);
  return {S,R};
}
/* a straight-up full jump (jump held, no direction, so vx stays 0 and both search directions are allowed).
   Returns the first airborne frame at or above the lip's bottom (the bump frame), the highest y, and the x then. */
function jump(lip,x){
  const {S,R}=setup(lip,x),p=S.p;let bump=null,top=p.y,xTop=p.x,air=0;
  for(let i=0;i<120;i++){
    P.stepPlayer(S,R,i===0?I({j:1,jp:1}):I({j:1}),[],[]);
    if(!p.ground)air++;else if(air)break;
    if(!bump&&p.y<=LIP_BOT)bump={i,x:p.x,y:p.y,vy:p.vy};
    if(p.y<top){top=p.y;xTop=p.x}
  }
  return {bump,top,xTop,H:STAND_Y-top};
}
const fmt=r=>`bump frame ${r.bump?`x ${r.bump.x} y ${r.bump.y} vy ${r.bump.vy.toFixed(2)}`:'none'}; highest y ${r.top.toFixed(1)} at x ${r.xTop} (lip top ${LIP_TOP}, bottom ${LIP_BOT})`;

/* 1. a 3 px lip is passed: vy kept at the bump and the head ends above the lip's top, nudged away from it */
for(const lip of ['left','right']){
  await test(`3 px lip on the ${lip}: the mascot slides past it`,()=>{
    const x=xFor(lip,3),r=jump(lip,x);console.log('     '+fmt(r));
    assert.ok(r.bump,'never reached the lip');
    assert.ok(r.bump.vy<0,`vy was zeroed at the bump (vy ${r.bump.vy}, y ${r.bump.y})`);
    assert.ok(r.top<LIP_TOP,`head never got above the lip top ${LIP_TOP} (highest y ${r.top})`);
    assert.ok(lip==='left'?r.xTop>x:r.xTop<x,`not pushed away from the lip (x ${x} -> ${r.xTop})`);
    assert.ok(Math.abs(r.xTop-x)<=CORNER,`pushed ${Math.abs(r.xTop-x)} px, more than CORNER ${CORNER}`);
  });
}
/* 2. a lip wider than CORNER still blocks */
for(const lip of ['left','right']){
  await test(`${CORNER+1} px lip on the ${lip}: still blocks, the head stops under it`,()=>{
    const x=xFor(lip,CORNER+1),r=jump(lip,x);console.log('     '+fmt(r));
    assert.ok(r.bump,'never reached the lip');
    assert.equal(r.bump.y,LIP_BOT,'head not snapped to the lip bottom');
    assert.equal(r.bump.vy,0,'vy not zeroed at the bump');
    assert.equal(r.top,LIP_BOT,'head went past the lip');
    assert.equal(r.xTop,x,'x moved');
  });
}
/* 3. a full-width ceiling blocks: nothing to slide round */
await test('full-width ceiling: blocks, no correction',()=>{
  const x=xFor('left',3),r=jump('full',x);console.log('     '+fmt(r));
  assert.ok(r.bump&&r.bump.y===LIP_BOT&&r.bump.vy===0,'not blocked at the ceiling');
  assert.equal(r.top,LIP_BOT,'head went past the ceiling');
  assert.equal(r.xTop,x,'x moved');
});
/* 4. the plain move() (no option) never corrects. Enemies call it as move(S,R,e,dx,dy,[]) (enemies.js, the wrapped
   puff); the drag and the wrapped-enemy ride in engine.step() call it on the player's box the same way. The expected
   values are hand-derived literals, not a second run of move(), so a correction leaking into the default call fails. */
for(const lip of ['left','right'])for(const [who,w,h] of [['enemy 12x12',12,12],['player box via plain move()',PW,PH]]){
  await test(`plain move(), ${who}, 3 px under the ${lip} lip: blocked, unchanged`,()=>{
    const S=newState();Object.assign(S,{lit:1,mode:'play',ens:[]});const R=room(lip);
    const x=lip==='left'?4*T-3:6*T-w+3,b={x,y:LIP_BOT+2,w,h};
    const m=E.move(S,R,b,0,-4.6,[]);
    console.log(`     hx ${m.hx} hy ${m.hy} on ${m.on}; box x ${b.x} y ${b.y}`);
    assert.deepEqual({...m,x:b.x,y:b.y},{hx:0,hy:-1,on:-1,x,y:LIP_BOT});
  });
}
/* 5. sanity guard: with no lip the standing full jump matches tools/test_game.mjs ("full jump ~3.5 tiles", 38 < H < 46) */
await test('no lip: standing full jump height unchanged (38 < H < 46 px, as test_game.mjs)',()=>{
  const r=jump('none',xFor('left',3));console.log(`     full jump height ${r.H.toFixed(1)} px`);
  assert.ok(r.H>38&&r.H<46,`H ${r.H}`);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
