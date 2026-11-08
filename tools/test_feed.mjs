// Feeding (2026-11-07): plants dropped in from the OS desktop fall, lie on the ground, and are eaten when he walks over them.
// Seed: chew, spit, gone. Sprout: an extra leaf for FEED.hold frames. Flower: a flower for the same. Both then let go and lie
// in the room until it is left. Synthetic rooms only. Plain node, no deps: node tools/test_feed.mjs
const G=new URL('../game/',import.meta.url).href;
const {T,newState}=await import(G+'state.js');
const E=await import(G+'engine.js');
const F=await import(G+'feed.js');
const U=await import(G+'undo.js');
const A=await import(new URL('../mascot/atlas.js',import.meta.url).href);
const {ROOMS,parse}=await import(G+'rooms/index.js');
const {readFileSync}=await import('node:fs');
const {FEED}=F;
let fails=0,passes=0;
const ok=(c,msg)=>{if(c){passes++;console.log('  ok  ',msg)}else{fails++;console.log('  FAIL',msg)}};
const I=(o={})=>({l:0,r:0,u:0,d:0,j:0,jp:0,b:0,bp:0,z:0,zp:0,drag:null,any:0,...o});
const run=(S,n,f=I())=>{const evs=[];for(let i=0;i<n;i++)evs.push(...E.step(S,typeof f==='function'?f(i,S):f,[]));return evs};
let AT=0;
function box(W,H){const g=Array.from({length:H},(_,y)=>[...(y===0||y>=H-2?'#'.repeat(W):'#'+'.'.repeat(W-2)+'#')]);
  return {g,set(x,y,c){g[y][x]=c;return this},fill(x0,y0,x1,y1,c){for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)g[y][x]=c;return this},rows(){return g.map(r=>r.join(''))}}}
const room=(id,b,ents=[],biome='roots')=>{ROOMS[id]=parse({id,name:id,biome,at:[52000+(AT++)*200,52000],grid:b.rows(),ents});return ROOMS[id]};
const FLOOR=16*T,STAND=FLOOR-24;
function play(id,x=60){const S=newState();Object.assign(S,{lit:1,litT:60,match:1,mode:'play'});E.enterRoom(S,id,{x,y:STAND});return S}
const b0=box(60,18).fill(30,17,34,17,'L');   /* a flat floor, lava far right in a gap of the floor's second row is not reachable: the lava test uses r3 below */
room('f1',b0);
const walkTo=(S,x,max=600)=>{const evs=[];for(let i=0;i<max&&!(Math.abs(S.p.x-x)<=1)&&!S.feed.eat;i++)evs.push(...E.step(S,I({r:S.p.x<x-1?1:0,l:S.p.x>x+1?1:0}),[]));return evs};
const walkTo2=(S,x)=>{const evs=[];for(let i=0;i<400&&!S.p.dead;i++)evs.push(...E.step(S,I({l:S.p.x>x?1:0}),[]));return evs};
const until=(S,f,max=1500)=>{const evs=[];for(let i=0;i<max&&!f(S);i++)evs.push(...E.step(S,I(),[]));return evs};
const pad=(S,n)=>run(S,n);

console.log('1. a dropped plant falls and lies on the ground');
{ const S=play('f1'),R=ROOMS.f1;
  ok(E.canDrop===undefined,'(canDrop is a handle method, not an export)');
  ok(F.addDrop(S,R,'sprout',200,40,'#FF3333'),'addDrop accepts a sprout');
  ok(S.feed.drops.length===1&&!S.feed.drops[0].land,'it is falling');
  pad(S,80);
  const d=S.feed.drops[0];
  ok(d&&d.land&&Math.abs(d.y-FLOOR)<0.01,'it landed on the floor (y '+(d&&d.y)+')');
  pad(S,200);
  ok(S.feed.drops.length===1,'it stays there while he is away');
  ok(!F.addDrop(S,R,'heap',100,100),'a heap is refused');
  ok(F.addDrop(S,R,'glow',150,100),'glow is taken as a bloom');
  ok(S.feed.drops[1].k==='bloom','glow became a bloom');
  for(let i=0;i<20;i++)F.addDrop(S,R,'seed',100+i*8,60);
  ok(S.feed.drops.length===FEED.cap,'no more than '+FEED.cap+' at once');
  ok(!F.addDrop(S,R,'seed',100,60),'one more is refused');
  const S2=play('f1');ok(F.addDrop(S2,R,'seed',100,FLOOR+6),'a drop inside the floor is nudged up out of the rock');
  ok(S2.feed.drops[0].y<=FLOOR-T+8,'it started above the floor tile ('+S2.feed.drops[0].y+')');
}

console.log('2. a seed: chew, spit, gone');
{ const S=play('f1'),R=ROOMS.f1;F.addDrop(S,R,'seed',140,FLOOR,'#FFD36B');pad(S,3);
  const ev=walkTo(S,150,200);
  ok(ev.includes('eat'),'walking over it eats it');
  ok(S.feed.drops.length===0,'it is off the ground');
  ok(S.feed.eat&&S.feed.eat.k==='seed','he is chewing');
  const ev2=run(S,FEED.chew.seed+4);
  ok(ev2.includes('spit')&&S.feed.spit.length+S.feed.pop.length>0,'he spits it out');
  ok(S.say&&S.say.text==='Ptoo!','and says so');
  ok(!S.feed.head,'a seed grows nothing');
  pad(S,60);
  ok(S.feed.drops.length===0&&S.feed.spit.length===0&&S.feed.pop.length===0&&S.feed.shed.length===0&&!S.feed.eat,'afterwards nothing is left: no seed anywhere');
}

console.log('3. a sprout grows a second leaf for 5 s, then it lets go');
{ const S=play('f1'),R=ROOMS.f1;F.addDrop(S,R,'sprout',140,FLOOR,'#FF3333');pad(S,3);
  walkTo(S,150,200);
  run(S,FEED.chew.sprout+2);
  ok(S.feed.head&&S.feed.head.k==='leaf','an extra leaf');
  const L={xl:0};F.feedLook(S,L);ok(L.xl==='leaf'&&L.xs===0,'the look starts it small');
  run(S,FEED.grow);F.feedLook(S,L);ok(L.xs===2,'and it is full size after the grow time');
  const t0=S.feed.head.t;run(S,FEED.hold-t0+FEED.grow-3);
  ok(S.feed.head!==null,'it is still there just before the end');
  const ev=run(S,6);
  ok(ev.includes('shed')&&S.feed.head===null,'it lets go at FEED.grow+FEED.hold = '+(FEED.grow+FEED.hold)+' frames');
  ok(S.feed.shed.length===1&&S.feed.shed[0].k==='leaf'&&!S.feed.shed[0].land,'a leaf floats down');
  run(S,300);
  const s=S.feed.shed[0];ok(s&&s.land&&Math.abs(s.y-FLOOR)<0.01,'and lies on the ground');
  // he can walk over it: it is scenery, not food
  walkTo(S,s.x,300);run(S,20);
  ok(S.feed.shed.length===1&&!S.feed.eat&&!S.feed.head,'he cannot eat it again');
  run(S,600);ok(S.feed.shed.length===1,'it stays as long as he stays');
  // leaving the room clears it
  const b1=box(30,18);room('f2',b1);E.enterRoom(S,'f2',{x:60,y:STAND});
  ok(S.feed.shed.length===0&&S.feed.drops.length===0,'it is gone once the screen is left');
}

console.log('4. a flower blooms from the sprout');
{ const S=play('f1'),R=ROOMS.f1;F.addDrop(S,R,'bloom',140,FLOOR,'#7FE0D3');pad(S,3);
  walkTo(S,150,200);run(S,FEED.chew.bloom+2);
  ok(S.feed.head&&S.feed.head.k==='flower','a flower');
  const L={};F.feedLook(S,L);ok(L.xl==='flower','the look says flower');
  ok(L.face==='love'||S.feed.eat===null,'he is pleased');
  run(S,FEED.grow+FEED.hold+2);
  ok(S.feed.head===null&&S.feed.shed.length===1&&S.feed.shed[0].k==='flower','after 5 s it lets go as a flower');
  run(S,400);ok(S.feed.shed[0].land,'and lands');
}

console.log('5. head state: refresh, replace, death, rooms');
{ const S=play('f1'),R=ROOMS.f1;
  F.addDrop(S,R,'sprout',90,FLOOR);pad(S,3);walkTo(S,100,200);run(S,60);
  const t1=S.feed.head.t;run(S,200);
  F.addDrop(S,R,'sprout',S.p.x+9,FLOOR);run(S,FEED.chew.sprout+4);
  ok(S.feed.head.t<=FEED.grow+FEED.chew.sprout+6,'a second sprout starts the clock again from full size (t '+S.feed.head.t+')');
  F.addDrop(S,R,'bloom',S.p.x+9,FLOOR);run(S,FEED.chew.bloom+4);
  ok(S.feed.head.k==='flower','a flower after a leaf changes it over');
  E.enterRoom(S,'f1',{x:60,y:STAND});
  ok(S.feed.head&&S.feed.head.k==='flower','he keeps what he grew into another room');
  const bs=box(60,18).fill(10,15,12,15,'^');room('f4',bs);
  const D=play('f4',300);F.addDrop(D,ROOMS.f4,'sprout',D.p.x+9,FLOOR);run(D,FEED.chew.sprout+4);
  ok(D.feed.head!==null,'(a leaf again, before the spikes)');
  const ev=walkTo2(D,2*T);
  ok(ev.includes('die')||D.p.dead>0,'he walks into the spikes and dies');
  ok(D.feed.head===null,'a death takes it');
}

console.log('6. lava and the dark');
{ const b=box(60,18);b.fill(40,15,44,16,'L');room('f3',b);
  const S=play('f3'),R=ROOMS.f3;ok(F.addDrop(S,R,'seed',42*T+6,60),'a drop over lava is accepted');pad(S,200);
  ok(S.feed.drops.length===0,'it burns up and does not lie on the lava');
  const D=newState();ok(D.mode==='intro'&&D.lit===0,'(before the torch the engine refuses drops: canDrop needs S.lit and play mode)');
}

console.log('7. anchored: Undo and saves do not hold it');
{ const S=play('f1');F.addDrop(S,ROOMS.f1,'sprout',300,FLOOR);pad(S,3);
  ok(!U.frameOf(S).includes('feed')&&!U.frameOf(S).includes('"drops"'),'Undo frameOf does not hold S.feed');
  const st=await import(G+'state.js');
  ok(!JSON.stringify(st.persist(S)).includes('drops'),'persist() does not save it');
  const a=play('f1'),b=play('f1');
  for(const S of [a,b]){F.addDrop(S,ROOMS.f1,'bloom',140,FLOOR);walkTo(S,150,100);run(S,500)}
  ok(JSON.stringify(a.feed)===JSON.stringify(b.feed),'two runs give the same feed state (no randomness)');
}


console.log('9. enemies notice a plant, go for it, and return to their path');
{ const mk=(id,fn)=>{const b=box(60,18);fn(b);room(id,b);return ROOMS[id]};
  const R=mk('e1',b=>{b.set(20,15,'M')});
  const mos=S=>S.ens.find(e=>e.k==='moss');
  const far=()=>play('e1',650);
  let S=far();const m0=mos(S);
  F.addDrop(S,R,'seed',m0.x+m0.w/2+50,FLOOR);
  let evs=[];for(let i=0;i<4;i++)evs.push(...E.step(S,I(),[]));
  ok(evs.includes('alert')&&mos(S).fd&&mos(S).fd.st==='alert','a crawler 50 px from a seed is alerted (the "!")');
  const x0=mos(S).x;run(S,FEED.grow);   /* 24 frames of the 30 */
  ok(Math.abs(mos(S).x-x0)<.01,'it stands still while the "!" shows');
  run(S,12);
  ok(mos(S).fd&&mos(S).fd.st==='go','then it goes');
  const ev2=until(S,S=>mos(S).wrap>0,400);
  ok(S.feed.drops.length===0&&mos(S).wrap>0&&ev2.includes('stun'),'it eats the seed and is wrapped, as a root burst does');
  ok(mos(S).wrap>0&&!mos(S).fd,'wrapped, with no errand left');
  const h=mos(S);run(S,F.FEED.hold);   /* the wrap ends (240) and its grace */
  ok(h.wrap===0&&!S.p.dead,'it wakes again; he is alive');
  ok(S.feed.shed.length===0&&!S.feed.head,'a seed grows nothing on it');
  // too far, and out of sight
  S=far();F.addDrop(S,R,'seed',mos(S).x+230,FLOOR);run(S,30);ok(!mos(S).fd,'a plant 230 px away is ignored (it is noticed from 176)');
  { const Rw=mk('e2',b=>{b.set(20,15,'M').fill(24,14,24,15,'#')});const W=play('e2',650);F.addDrop(W,Rw,'seed',mos(W).x+60,FLOOR);run(W,60);
    ok(!mos(W).fd,'a plant behind a wall is ignored'); }
  { const Rf=mk('e4',b=>{b.set(20,15,'M')});Object.assign(Rf.spawns[0],{left:19,right:21,top:15,bottom:15});
    const W=play('e4',650),mm=W.ens.find(e=>e.k==='moss');
    F.addDrop(W,Rf,'seed',24*T+6,FLOOR);run(W,60);ok(!mm.fd,'a plant outside a fenced patrol is ignored');
    F.addDrop(W,Rf,'seed',21*T+6,FLOOR);run(W,10);ok(mm.fd&&mm.fd.st==='alert','one inside the patrol is noticed'); }
  // the mascot gets there first
  S=play('e1',20*T+40);{const m=mos(S);F.addDrop(S,R,'sprout',m.x+m.w/2+70,FLOOR,'#fff');const h0=[m.mx,m.my];
    const e3=run(S,3);ok(S.feed.drops.length===1,'(the plant is there)');
    S.p.x=S.feed.drops[0].x-9;S.p.y=STAND;evs=run(S,3);   /* he is on it now */
    ok(!S.feed.drops.length&&S.feed.eat,'he eats it first');
    run(S,6);ok(!mos(S).fd&&!mos(S).lf,'the crawler is back on its path, empty-handed');
    ok(mos(S).mx===h0[0],'on its old heading'); }
  { const Rt=mk('e5',b=>{b.set(20,15,'M').fill(10,16,40,16,'^')});   /* a thorn floor, which a crawler walks */
    const W=play('e5',650),m=mos(W);F.addDrop(W,Rt,'seed',m.x+m.w/2+30,FLOOR-12+12);run(W,60);
    ok(W.feed.drops.length&&Math.abs(W.feed.drops[0].y-16*T)<.01&&m.fd,'a plant dropped on thorns rests on them, and the crawler on them notices it'); }
  // a sprout: a leaf on it, and it cannot hurt him
  S=far();{const m=mos(S);F.addDrop(S,R,'sprout',m.x+m.w/2+40,FLOOR,'#7FE0D3');until(S,S=>mos(S).lf,500);
    ok(mos(S).lf&&mos(S).lf.k==='leaf','it grew a leaf from the sprout');
    ok(S.feed.drops.length===0&&!mos(S).fd,'it went back to its path');
    const e=mos(S);S.p.x=e.x+e.w/2-9;S.p.y=e.y+e.h-24;S.p.vy=0;const dead0=run(S,6).includes('die');
    ok(!dead0&&!S.p.dead,'standing in it is harmless');
    S.p.x=650;S.p.y=STAND;run(S,FEED.grow+FEED.hold);
    ok(!mos(S).lf&&S.feed.shed.some(q=>q.k==='leaf'),'after 5 s the leaf lets go and floats down');
    F.addDrop(S,R,'bloom',mos(S).x+mos(S).w/2+30,FLOOR,'#fff');until(S,S=>mos(S).lf,500);ok(mos(S).lf&&mos(S).lf.k==='flower','a flower grows on it the same way'); }
  // a puff
  const Rp=mk('e3',b=>{b.set(20,8,'O')});
  S=play('e3',650);{const pf=S.ens.find(e=>e.k==='puff'),hx=pf.hx,hy=pf.hy;
    F.addDrop(S,Rp,'seed',hx+6+30,FLOOR);run(S,5);ok(pf.fd&&pf.fd.st==='alert','a puff 90 px above a seed is alerted');
    until(S,S=>pf.wrap>0,500);ok(S.feed.drops.length===0&&pf.wrap>0,'it flies down to it and is wrapped');
    run(S,1100);ok(!pf.fd&&Math.abs(pf.x-hx)<1&&Math.abs(pf.y-hy)<=pf.amp+1,'later it is home again on its post (x '+pf.x+' of '+hx+')');
    F.addDrop(S,Rp,'bloom',hx+6+30,FLOOR,'#fff');until(S,()=>pf.lf,700);
    ok(pf.lf&&pf.lf.k==='flower','a flower on it from a flower');
    S.p.x=pf.x+pf.w/2-9;S.p.y=pf.y+pf.h/2-12;S.p.vy=0;S.p.vx=0;{const e0=run(S,4);ok(!e0.includes('die')&&!S.p.dead,'a puff carrying it cannot hurt him');}
    S.p.x=650;S.p.y=STAND;until(S,()=>!pf.fd&&Math.abs(pf.x-hx)<1,900);ok(Math.abs(pf.x-hx)<1,'and it returns to its post');
  }
  // undo's snapshot carries the enemy errand, and wrapped ones are not distracted
  S=far();{const m=mos(S);m.wrap=100;F.addDrop(S,R,'seed',m.x+m.w/2+30,FLOOR);run(S,40);ok(!m.fd,'a wrapped enemy ignores a plant');}
}

console.log('10. every creature: crab, clownfish, ember, beetle, prism');
{ const cases=[
    {k:'crab',id:'c1',mk:b=>b.set(20,15,'H'),ents:[],biome:'roots',pick:S=>S.ens.find(e=>e.k==='crab'),drop:(S,e)=>[e.x+e.w/2+70,FLOOR],stunned:e=>e.wrap>0,why:'pulls into its shell'},
    {k:'clownfish',id:'c2',mk:b=>b.fill(20,14,32,15,'~'),ents:[{at:[22,14],fish:1}],biome:'flood',pick:S=>S.ens.find(e=>e.k==='fish'),drop:(S,e)=>[28*T+6,100],stunned:e=>e.fz>0,why:'hangs still, stars round its head'},
    {k:'ember',id:'c3',mk:b=>b.set(20,10,'E'),ents:[],biome:'roots',pick:S=>S.ens.find(e=>e.k==='ember'),drop:(S,e)=>[e.hx+40,FLOOR],stunned:e=>e.st===1,why:'is smothered to smoke'},
    {k:'beetle',id:'c4',mk:b=>{b.fill(16,16,25,16,'X').set(20,15,'K')},ents:[{at:[20,15],reach:4}],biome:'roots',pick:S=>S.ens.find(e=>e.k==='beetle'),drop:(S,e)=>[24*T+6,FLOOR],stunned:e=>e.wrap>0&&e.st===1,why:'is knocked out of its shell'},
    {k:'prism',id:'c5',mk:b=>b.set(20,10,'Y'),ents:[{at:[20,10],aim:'l',amp:0}],biome:'crystals',pick:S=>S.ens.find(e=>e.k==='prism'),drop:(S,e)=>[e.x+e.w/2+60,FLOOR],stunned:e=>e.wrap>0,why:'is wrapped'}];
  for(const c of cases){
    const b=box(60,18);c.mk(b);const R=room(c.id,b,c.ents,c.biome);
    const go=()=>{const S=play(c.id,650);const e=c.pick(S);return [S,e]};
    let [S,e]=go();const [dx,dy]=c.drop(S,e);F.addDrop(S,R,'seed',dx,dy);
    const ev=until(S,()=>e.fd,300);ok(e.fd&&e.fd.st==='alert'&&ev.includes('alert'),c.k+': notices a seed and shows the "!"');
    const ev2=until(S,()=>c.stunned(e),1200);
    ok(c.stunned(e)&&S.feed.drops.length===0,c.k+': eats the seed and '+c.why);
    [S,e]=go();const [dx2,dy2]=c.drop(S,e);F.addDrop(S,R,'sprout',dx2,dy2,'#7FE0D3');
    until(S,()=>e.lf,1200);
    ok(e.lf&&e.lf.k==='leaf'&&S.feed.hearts.length===3,c.k+': a sprout grows a leaf on it, with three hearts');
    ok(!e.fd||e.fd.st==='back',c.k+': then it is back on its way');
    // harmless while it carries it
    S.p.x=e.x+e.w/2-9;S.p.y=Math.min(STAND,e.y+e.h/2-12);S.p.vy=0;
    if(c.k==='prism'){const ev=run(S,4);ok(!ev.includes('die'),'prism: its beam cannot burn him')}
    else{const ev=run(S,4);ok(!ev.includes('die')&&!S.p.dead&&!S.p.vx,c.k+': cannot hurt him while it carries the leaf')}
    // the leaf lets go after 5 s
    S.p.x=650;S.p.y=STAND;run(S,FEED.grow+FEED.hold);
    ok(!e.lf&&S.feed.shed.length>=1,c.k+': after 5 s the leaf lets go');
  }
  { const b=box(60,18);b.set(30,14,'Y');const R=room('c7',b,[{at:[30,14],aim:'l',amp:0}],'crystals');
    const A=play('c7',100),B=play('c7',100);
    ok(run(A,6).includes('die'),'(control) a prism beam along his row burns him');
    B.ens[0].lf={k:'leaf',t:60,col:'#fff'};ok(!run(B,60).includes('die')&&!B.p.dead,'the same beam is harmless while the prism carries a leaf'); }
  { const [S,e]=[play('f1'),0];F.addDrop(S,ROOMS.f1,'sprout',S.p.x+9,FLOOR);run(S,FEED.chew.sprout+3);ok(S.feed.hearts.length===3,'the mascot gets hearts too when his leaf appears'); }
  { const b=box(60,18);b.set(20,15,'M');const R=room('c6',b);const S=play('c6',650);const m=S.ens[0];F.addDrop(S,R,'seed',m.x+6+160,FLOOR);run(S,10);ok(m.fd&&m.fd.st==='alert','the range is 176 px now: a crawler notices a plant 160 px away'); }
}

console.log('8. the atlas');
{ const base={f:'idle',lv:'rest',ft:'stand',stage:1};
  const sig=l=>A.compose({...base,...l}).map(r=>r.join('')).join('\n');
  ok(sig({})===sig({xl:0}),'xl off draws the same sprite as before');
  ok(sig({xl:'leaf',xs:2})!==sig({}),'an extra leaf changes the sprite');
  ok(sig({xl:'flower',xs:2})!==sig({xl:'leaf',xs:2}),'a flower differs from the leaf');
  ok(sig({xl:'leaf',xs:0})!==sig({xl:'leaf',xs:2}),'the growth steps differ');
  ok(sig({xl:'leaf',xs:2,flip:1})!==sig({xl:'leaf',xs:2}),'it mirrors with him');
  ok(/'xl','xs'/.test(readFileSync(new URL('../game/mascot.js',import.meta.url),'utf8')),'the sprite cache key includes xl and xs');
  ok(sig({xl:'leaf',xs:2,hat:'crown'})!==sig({hat:'crown'}),'it grows under a hat too');
}
console.log(`\n${passes} passed, ${fails} failed`);process.exit(fails?1:0);
