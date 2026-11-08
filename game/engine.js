/* Wake Up: engine. Fixed 60 Hz step, tile collision, camera, input, save. mount(el, opts) embeds the game anywhere.
   The world step (step, move, solid) touches no DOM, so it runs under node for tests. */
import {T,VW,VH,MUTE_KEY,ASSIST_KEY,PIECES,DOOR,STUCK,PERCH,newState,snapshot,restore,save,load,clearSave,resume,items} from './state.js';
import {ROOMS,ORDER,CHASES,NEXT,roomAtTile,perchOf} from './rooms/index.js';
import {startChase,stepChase,resetChase,nearness,progress} from './chases.js';
import {DISC,DX} from './door.js';
import {stepPlayer,PW,PH,FEEL} from './player.js';
import {spawnEnemies,stepEnemies,WRAP} from './enemies.js';
import {createRenderer} from './render.js';
import {createAudio} from './audio.js';
import {bumpStep} from './bump.js';
import {newLiquid,stepLiquid,isLiq,inTide} from './liquid.js';
import {stepVines,isDrilled} from './claws.js';   /* Molten: vines grow and wither; drilled cracked walls (game/claws.js) */
import {floodTouch} from './fish.js';
import {cinderTouch} from './cinders.js';   /* Molten: embers, slag beetles, geyser columns */
import {crySolid,cryBoxes,crystalTouch} from './crystals.js';   /* Crystals: shard steps, locks, receivers, platforms, drifters */
import {echoHolds} from './echo.js';   /* Crystals: the Echo */
import {beamNear} from './crystalart.js';
import {gone} from './sweep.js';   /* Crystals: the delete sweep's front (kind 'sweep', game/chases.js) */   /* Crystals: how near a live beam is, for its hum */
import {DBUF,BDEMO,boardDemo} from './board.js';
import {stepFeed,addDrop} from './feed.js';   /* feeding: plants dropped in from the OS desktop */
import {undoStep,undoRecord,undoClear,undoFill,undoDemo,undoDemoEnd} from './undo.js';   /* Crystals: Undo, the ring buffer and its meter */
export {T,VW,VH};

const STEP=1000/60,clamp=(v,a,b)=>v<a?a:v>b?b:v;
export const ov=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const ins=(b,i)=>({x:b.x+i,y:b.y+i,w:b.w-2*i,h:b.h-2*i});
const trect=(tx,ty)=>({x:tx*T,y:ty*T,w:T,h:T});

/* ---------- tiles and collision ---------- */
/* a tile, looking into the neighbouring room past the edge (null = nothing there) */
export function tile(R,tx,ty){
  if(tx>=0&&ty>=0&&tx<R.w&&ty<R.h)return R.g[ty][tx];
  const wx=R.at[0]+tx,wy=R.at[1]+ty,N=roomAtTile(wx,wy);
  return N?N.g[wy-N.at[1]][wx-N.at[0]]:null;
}
/* a seal (rubble with ent opens:<biome>, rooms/index.js R.seals) is open once fragment k is in the door, from DOOR.crumble
   frames after it lands (door() sends 'unseal' then). Read from S.placed, so old saves and restore() agree, and it never shuts again */
export const sealOpen=(S,b)=>{const k=PIECES.indexOf(b);return k>=0&&!!(S.placed&&S.placed[k])&&!(S.slot&&S.slot.k===k&&S.slot.t<DOOR.fly+DOOR.crumble)};   /* b: the biome in opens */
function sealed(S,R,tx,ty){
  let N=R,x=tx,y=ty;if(tx<0||ty<0||tx>=R.w||ty>=R.h){N=roomAtTile(R.at[0]+tx,R.at[1]+ty);if(!N)return true;x=R.at[0]+tx-N.at[0];y=R.at[1]+ty-N.at[1]}
  const k=N.seals?N.seals[x+','+y]:undefined;return k===undefined||!sealOpen(S,k);
}
export function solid(S,R,tx,ty){
  const out=tx<0||ty<0||tx>=R.w||ty>=R.h;
  if(out&&R.id==='hub'&&!S.lit)return true;
  if(S.chase&&gone(S,R,ty))return false;   /* Crystals: above the delete sweep's front the world is gone (game/sweep.js) */
  const c=tile(R,tx,ty);
  return c===null||c==='#'||(c==='='&&sealed(S,R,tx,ty))||(c==='G'&&(out||S.gate<.5))||(c==='X'&&(out||!isDrilled(S,tx,ty)))||((c==='Q'||c==='D'||c==='R')&&crySolid(S,R,tx,ty,c,out));   /* X: cracked rock, till drilled; Q D R: game/crystals.js */
}
function hits(S,R,b,boxes){
  const o=[],x0=Math.floor(b.x/T),x1=Math.ceil((b.x+b.w)/T)-1,y0=Math.floor(b.y/T),y1=Math.ceil((b.y+b.h)/T)-1;
  for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++)if(solid(S,R,tx,ty))o.push(trect(tx,ty));
  for(const q of boxes)if(q!==b&&ov(b,q))o.push(q);
  return o;
}
/* axis-separated move; returns which sides hit and the wrapped-enemy index stood on.
   corner (the player's own move only): a head bump slides up to that many px round a ceiling corner, left if dx <= 0,
   then right if dx >= 0, 1 px above the contact; it then counts as no hit, so vy is kept */
export function move(S,R,b,dx,dy,boxes=[],corner=0){
  const r={hx:0,hy:0,on:-1};
  if(dx){b.x+=dx;const h=hits(S,R,b,boxes);if(h.length){r.hx=Math.sign(dx);b.x=dx>0?Math.min(...h.map(o=>o.x))-b.w:Math.max(...h.map(o=>o.x+o.w))}}
  if(dy){b.y+=dy;const h=hits(S,R,b,boxes);if(h.length){r.hy=Math.sign(dy);
    if(dy>0){const top=Math.min(...h.map(o=>o.y));b.y=top-b.h;const q=h.find(o=>o.y===top&&o.i!==undefined);if(q)r.on=q.i}
    else{b.y=Math.max(...h.map(o=>o.y+o.h));
      for(let k=1;k<=corner&&r.hy;k++)for(const s of [dx<=0?-k:0,dx>=0?k:0])if(s&&r.hy&&!hits(S,R,{x:b.x+s,y:b.y-1,w:b.w,h:b.h},boxes).length){b.x+=s;b.y--;r.hy=0}}}}
  return r;
}
const solids=S=>[...S.ens.map((e,i)=>e.wrap>0&&!e.pass?{x:e.x,y:e.y,w:e.w,h:e.h,i}:null).filter(Boolean),...cryBoxes(S)];   /* + Crystals platforms and a wrapped Echo (no i: crystals.js carries him) */

/* ---------- rooms, checkpoints, respawn ---------- */
/* where to stand for a torch: centred on it, dropped to the floor, nudged out of walls */
export function spot(S,R,tx,ty){
  let fy=ty;while(fy<R.h-1&&!solid(S,R,tx,fy+1))fy++;
  const b={x:tx*T+T/2-PW/2,y:(fy+1)*T-PH,w:PW,h:PH};
  for(const d of [0,-3,3,-6,6,-9,9,-12,12])if(!hits(S,R,{...b,x:b.x+d},[]).length)return {x:b.x+d,y:b.y};
  return {x:b.x,y:b.y};
}
export function enterRoom(S,id,pos){
  const R=ROOMS[id],p=S.p;
  S.room=id;S.ens=spawnEnemies(R);S.liq=newLiquid(R,R.flows);S.gate=S.latch&&S.latch[id]?1:0;S.plate=0;S.roots=[];S.flash=-1;S.sit=0;S.still=0;
  S.vines=[];S.drilled=[];S.drillNow=[];S.crack=null;p.cl=0;p.cv=0;   /* Molten: vines and drilled walls are this visit's */
  S.cr={};S.echo={on:0,log:[],i:0};undoClear(S);if(S.feed){S.feed.drops=[];S.feed.shed=[];S.feed.spit=[];S.feed.pop=[]}   /* Crystals: room-local state, the Echo asleep, no rewind across a seam (game/undo.js) */
  if(pos){p.x=pos.x;p.y=pos.y;p.vx=0;p.vy=0}
  p.on=-1;camera(S,R,1);
}
const hubTorch=()=>{const t=ROOMS.hub.torches[0];return {room:'hub',tx:t.tx,ty:t.ty}};
function respawn(S,ev){
  const cp=S.cp||hubTorch(),R=ROOMS[cp.room],p=S.p;
  resetChase(S);   /* a running chase restarts a fair gap behind this torch (game/chases.js); before spot(), or a sweep front still above the torch deletes the rows it is looking for */
  enterRoom(S,cp.room,spot(S,R,cp.tx,cp.ty));
  p.dead=0;p.rez=12;p.inv=45;p.ground=0;p.coy=0;p.buf=0;p.carry=0;p.demo=0;p.jq=0;p.dt=0;p.surf=0;p.bo=0;p.mo=0;p.db=0;p.bd=0;p.sj=0;p.burn=0;p.cl=0;p.cv=0;p.vc=0;p.wj=0;ev.push('rez');   /* no dash, surf, burn, cling or board demo carries over */
}
function die(S,ev,src){const p=S.p;if(p.dead||p.inv)return;p.dead=18;if(S.feed){S.feed.head=null;S.feed.eat=null}   /* a death takes the leaf or flower he grew (game/feed.js) */p.gl=18;p.vx=0;p.vy=0;S.flash=src;ev.push('die');
  undoClear(S);undoDemoEnd(S);S.echo={on:0,log:[],i:0}}   /* no rewind across a death; the Echo sleeps */
/* the camera follows him; sitting on a perch it drifts slowly (4% a frame) toward the perch's look, PERCH.drift frames in.
   Vertically it aims at c.gy, his ground height, not at him (C1, C2). c.gt counts frames on the ground. */
function camera(S,R,snap){
  const p=S.p,c=S.cam,q=S.sit?perchOf(R,p):null,k=q?Math.min(1,S.sit/PERCH.drift):0;
  /* window: his top from c.gy up to 44 px above it (a full jump is 39) holds still; lower (any fall) follows him as before,
     higher pushes the window's top. One continuous value, so a new higher ground is reached by easing, never by a jump.
     Feet in water: he floats and never lands, so it follows him as before */
  if(snap||c.gy==null){c.gy=p.y;c.gt=0}
  else{const wet=isLiq(tile(R,Math.floor((p.x+PW/2)/T),Math.floor((p.y+PH-1)/T)));
    c.gy=wet||p.y>c.gy?p.y:Math.min(c.gy,p.y+44);c.gt=p.ground?Math.min(c.gt+1,7):0;
    if(c.gt>6)c.gy=Math.abs(p.y-c.gy)<.5?p.y:c.gy+(p.y-c.gy)*.06}   /* 6 frames on the ground, then ease 6% a frame to him */
  const lead=FEEL.LEAD?clamp(p.vx*8,-16,16):p.face*12,
    tx=clamp(p.x+PW/2-VW/2+lead+(q?q.lookx*T*k:0),0,R.w*T-VW),ty=clamp(c.gy+PH/2-VH/2-8+(q?q.looky*T*k:0),0,R.h*T-VH),e=q?.04:.12;
  if(snap){c.x=tx;c.y=ty}else{c.x+=(tx-c.x)*e;c.y+=(ty-c.y)*e}
}
/* the perch: stand still on a seat for PERCH.wait frames and he sits (S.sit counts the frames sitting); any input, a
   chase, a death or leaving the seat stands him up. Nothing makes him sit and nothing keeps him there. */
function perch(S,R,inp,ev){
  const p=S.p,q=S.mode==='play'&&p.ground&&!p.dead&&!(S.chase&&S.chase.on)&&Math.abs(p.vx)<.05?perchOf(R,p):null;
  const idle=!(inp.l||inp.r||inp.u||inp.d||inp.j||inp.jp||inp.b||inp.bp||inp.z||inp.drag);
  if(q&&idle){if(S.still<PERCH.wait)S.still++;else{if(!S.sit)ev.push('sit');S.sit++}}
  else{if(S.sit)ev.push('stand');S.still=0;S.sit=0}
}
const say=(S,text,t)=>{S.say={text,t,n:0}};

/* ---------- the world step ---------- */
function intro(S,R,ev){
  const I=S.intro,p=S.p;I.t++;
  if(I.t<40){p.hide=1;return}
  if(I.t===40){p.hide=0;p.mac=1;p.x=VW/2-PW/2;p.y=VH/2-PH/2;p.vy=0;ev.push('fall')}
  if(I.land<0){p.vy=Math.min(4.6,p.vy+.26);if(move(S,R,p,0,p.vy).hy>0){I.land=I.t;p.vy=0;p.land=10;p.ground=1;S.cam.sh=2;ev.push('thud')}return}
  const k=I.t-I.land;
  if(p.land>0)p.land--;
  if(p.gl>0)p.gl--;
  if(k===50){p.gl=36;ev.push('glitch')}
  if(k===68)p.mac=0;
  if(k===110)say(S,"I'm baa...",100);
  if(k===225)say(S,'wait, where am I?',140);
  if(k===380){S.mode='dark';S.match=0;ev.push('match')}
}
function burst(S,ev){
  for(const b of S.roots){
    b.t++;if(S.p.ground)b.g++;   /* g: frames since landing, only so the strands can draw back into the shoes */
    if(b.t>10)continue;
    const hw=8+b.t*.9,box={x:b.x-hw,y:b.y-4,w:hw*2,h:6+b.t*3};
    S.ens.forEach((e,i)=>{if(e.soft||b.hit.includes(i)||!ov(box,e))return;b.hit.push(i);   /* roots slide off Flood's shells and scales */
      e.wrap=WRAP;e.grace=0;e.vy=0;e.ret=0;if(ov(e,S.p))e.pass=1;S.hit=Math.round(FEEL.HIT);S.cam.sh=3;ev.push('stun')});
  }
  S.roots=S.roots.filter(b=>b.t<30);
}
/* the seed shows its move: a beat to sprout, one jump, and the root hop at its peak (p.demo counts frames) */
function demo(p){
  const i={l:0,r:0,u:0,d:0,j:0,jp:0,drag:null,any:0},k=++p.demo;
  if(k<100){if(k===24&&!p.ground)p.demo=23;else if(k===24)i.j=i.jp=1;else if(k>24){i.j=1;if(p.vy>-.5){i.jp=1;p.demo=100}}}
  else{i.j=p.vy<0?1:0;if((p.ground&&k>101)||k>240)p.demo=0}
  return i;
}
function spikeRect(R,tx,ty){
  const s=(x,y)=>{const c=tile(R,x,y);return c===null||c==='#'||c==='='||c==='X'},x=tx*T,y=ty*T;
  return s(tx,ty+1)?{x:x+1,y:y+6,w:10,h:6}:s(tx,ty-1)?{x:x+1,y,w:10,h:6}:s(tx-1,ty)?{x,y:y+1,w:6,h:10}:s(tx+1,ty)?{x:x+6,y:y+1,w:6,h:10}:{x:x+2,y:y+2,w:8,h:8};
}
export const LAVA=3;
export const pedRect=f=>({x:f.tx*T-4,y:f.ty*T-24,w:T+8,h:T+24});
function touch(S,R,ev){
  const p=S.p;
  for(const t of R.torches){
    if(!ov(p,trect(t.tx,t.ty)))continue;
    const key=R.id+':'+t.tx+','+t.ty;
    if(R.id==='hub'&&!S.lit){S.lit=1;S.litT=0;S.mode='play';ev.push('torch')}
    if(!S.torches[key]){S.torches[key]=1;ev.push('light')}
    undoFill(S);   /* a torch fills the Undo meter at once */
    if(!S.cp||S.cp.room!==R.id||S.cp.tx!==t.tx||S.cp.ty!==t.ty){S.cp={room:R.id,tx:t.tx,ty:t.ty};ev.push('cp')}
  }
  for(const it of R.items)if(!S.items[it.id]&&ov(p,trect(it.tx,it.ty))&&!(it.id==='forged'&&!S.items.board)){S.items[it.id]=1;if(it.id==='root'){p.root=1;p.demo=1}else if(it.id==='undo'){undoFill(S);S.undo.demo=1;S.undo.dp=0}else{p.dc=1;if(it.id==='board'||it.id==='forged')p.bd=1}ev.push('item')}   /* each shows its move (demo(), board.js boardDemo, undo.js undoDemo); the forged board waits for the board */
  /* a fragment on its pedestal (it rests above the tile): walking into it lifts it, and its biome's chase wakes */
  for(const f of R.pedestals){const k=PIECES.indexOf(f.piece);if(k<0||S.pieces[k]||!ov(p,pedRect(f)))continue;
    S.pieces[k]=1;S.cam.sh=3;ev.push('piece');if(CHASES[f.piece]&&!(S.chase&&S.chase.on))startChase(S,f.piece,ev)}
  if(R.plates.length){
    const held=R.plates.some(({tx,ty})=>{const r={x:tx*T+1,y:ty*T+8,w:T-2,h:4};return ov(p,r)||S.ens.some(e=>e.wrap>0&&e.tz!==2&&ov(e,r))||echoHolds(S,r)});   /* not a teasing crab's shell (fish.js) */
    if(held&&!S.plate)ev.push('plate');
    S.plate=held?1:0;
    /* a gate he has walked through latches open for good (saved), so the far side can never trap him */
    const L=S.latch||(S.latch={}),g0=S.gate,cx=p.x+PW/2;
    if(held||L[R.id])S.gate=Math.min(1,S.gate+.1);
    else if(!R.gates.some(g=>ov(p,trect(g.tx,g.ty))))S.gate=Math.max(0,S.gate-.1);
    if((g0<.5)!==(S.gate<.5))ev.push(S.gate<.5?'gateShut':'gateOpen');
    if(S.gate>=.5&&!L[R.id]&&R.gates.some(g=>cx>=g.tx*T&&cx<g.tx*T+T&&ov(p,trect(g.tx,g.ty)))){L[R.id]=1;ev.push('latch')}
  }
  if(p.inv)return;
  const hb=ins(p,3);
  S.ens.forEach((e,i)=>{if(!e.soft&&!e.wrap&&!e.grace&&!e.lf&&ov(hb,ins(e,1)))die(S,ev,i)});   /* Flood's soft ones: floodTouch */
  if(p.dead)return;
  const x0=Math.floor(p.x/T),x1=Math.floor((p.x+p.w)/T),y0=Math.floor(p.y/T),y1=Math.floor((p.y+p.h)/T);
  for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++)if(R.g[ty]&&R.g[ty][tx]==='^'&&ov(ins(p,2),spikeRect(R,tx,ty)))return die(S,ev,[tx,ty]);
  /* lava: touching it glitches him out, from LAVA px under its line (a forged board's surf rides above that) */
  if(!(p.surf&&S.items.forged&&S.items.board))for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++)if(R.g[ty]&&R.g[ty][tx]==='L'){const top=R.g[ty-1]&&R.g[ty-1][tx]==='L'?0:LAVA;
    if(ov(ins(p,2),{x:tx*T,y:ty*T+top,w:T,h:T-top}))return die(S,ev,'lava')}
}
function transition(S,R){
  const p=S.p,cx=p.x+PW/2,cy=p.y+PH/2;
  if(cx>=0&&cy>=0&&cx<R.w*T&&cy<R.h*T)return;
  const N=roomAtTile(R.at[0]+Math.floor(cx/T),R.at[1]+Math.floor(cy/T));
  if(!N||N===R){p.x=clamp(p.x,-PW/2,R.w*T-PW/2);p.y=clamp(p.y,-PH/2,R.h*T-PH/2);return}
  p.x+=(R.at[0]-N.at[0])*T;p.y+=(R.at[1]-N.at[1])*T;p.wy+=(R.at[1]-N.at[1])*T;
  enterRoom(S,N.id);
}
/* ---------- the door: a carried fragment flies into its slot ---------- */
/* timings in DOOR (state.js) */
function door(S,R,inp,ev){
  const p=S.p,sl=S.slot;
  if(sl){
    if(++sl.t===DOOR.fly){S.placed[sl.k]=1;S.cam.sh=2;ev.push('place');if(S.placed.every(Boolean)&&!S.door){S.door=1;S.doorT=0;ev.push('door')}}
    if(sl.t===DOOR.fly+DOOR.crumble&&ORDER.some(id=>ROOMS[id].seals&&Object.values(ROOMS[id].seals).includes(PIECES[sl.k]))){S.cam.sh=3;ev.push('unseal')}   /* the rubble it seals crumbles (sealOpen) */
    if(sl.t>=DOOR.fly+DOOR.pulse)S.slot=null;
    if(sl.t<DOOR.fly)return {...inp,l:0,r:0,j:0,jp:0};   /* he stands and watches it go */
  }
  if(S.door){if(!S.slot&&S.doorT<DOOR.open&&++S.doorT===DOOR.open)ev.push('opened');return inp}
  if(R.id!=='hub'||S.slot){S.dwell=0;return inp}
  const k=S.pieces.findIndex((v,i)=>v&&!S.placed[i]);
  if(k<0||!p.ground||Math.abs(p.x+PW/2-DISC.x-DX)>DOOR.zone){S.dwell=0;return inp}
  S.dwell=inp.l||inp.r||inp.j?0:S.dwell+1;
  if(!inp.jp&&S.dwell<DOOR.dwell)return inp;
  S.slot={k,t:0};S.dwell=0;ev.push('lift');
  return {...inp,j:0,jp:0};
}

/* ---------- the stuck hint: minutes without progress, and he looks toward what's next (NEXT in rooms/index.js) ---------- */
export {STUCK,DOOR};
const PROGRESS=['torch','light','item','piece','place','latch','room'];
export function goal(S){
  for(const n of NEXT){
    const [kind,name]=n.need.split(':'),i=PIECES.indexOf(name),R=ROOMS[n.room];
    if(!R||(kind==='item'?S.items[name]:kind==='piece'?S.pieces[i]:kind==='placed'?S.placed[i]:1))continue;
    const [tx,ty]=n.tile||[R.w>>1,R.h>>1];return {room:n.room,x:(R.at[0]+tx)*T+T/2,y:(R.at[1]+ty)*T+T/2};
  }
  return null;
}
/* counted in frames inside the step, so a paused or minimized game never counts; never in the dark or a chase */
function stuck(S,ev){
  if(ev.some(e=>PROGRESS.includes(e))){S.stuck=0;S.hint=null}
  if(S.mode!=='play'||!S.lit||(S.chase&&S.chase.on)||S.slot||S.door)return;
  if(++S.stuck>=STUCK){const g=goal(S);S.hint=g&&{...g,k:S.stuck-STUCK}}   /* k: frames since he started looking */
}

/* inp: {l,r,u,d,j,jp,b,bp,z,zp,drag:{x,y}|null,any} (z/zp: Undo held / pressed this frame) */
export function step(S,inp,ev=[]){
  let R=ROOMS[S.room];const p=S.p;
  S.t++;
  if(S.drillNow&&S.drillNow.length)S.drillNow=[];   /* a drill's tiles show for the one step it lands (game/claws.js) */
  if(S.say){S.say.n++;if(--S.say.t<=0)S.say=null}
  if(S.cam.sh>0)S.cam.sh=Math.max(0,S.cam.sh-.25);
  if(S.mode==='intro'){intro(S,R,ev);return ev}
  if(S.hit>0){S.hit--;if(inp.jp)p.jq=1;if(inp.bp)p.db=DBUF;return ev}   /* hit-stop: a jump (or dash) pressed now still counts after it */
  if(S.match<1)S.match=Math.min(1,S.match+1/30);
  if(S.lit&&S.litT<60)S.litT++;
  if(p.gl>0)p.gl--;
  if(p.dead){if(--p.dead===0)respawn(S,ev);camera(S,ROOMS[S.room]);return ev}
  /* Undo (game/undo.js): the pickup demo holds the key; a rewind frame restores the room-local subset from the buffer and
     runs only the anchored things (the chase does not wait, the camera follows), so nothing else steps or records */
  if(S.mode==='play'&&S.undo&&S.undo.demo)inp=undoDemo(S);
  if(undoStep(S,inp,ev)){if(S.sit)ev.push('stand');S.sit=0;S.still=0;if(stepChase(S,ev))die(S,ev,'chase');camera(S,R);return ev}   /* the key stands him up off a perch */
  if(p.rez>0)p.rez--;
  if(p.inv>0)p.inv--;
  stepEnemies(S,R,ev);
  if(p.on>=0){const e=S.ens[p.on];if(e&&e.wrap>0&&!e.pass)move(S,R,p,e.dx,e.dy);else p.on=-1}
  if(S.mode==='play')inp=door(S,R,inp,ev);   /* at the door a press sets a fragment instead of jumping */
  if(S.mode==='dark'&&inp.drag){
    p.carry=1;p.vx=0;p.vy=0;p.ground=0;p.on=-1;
    /* cap: a finger that lands away from him pulls him over at that many px per frame */
    let dx=inp.drag.x-p.x,dy=inp.drag.y-p.y;const c=inp.drag.cap,dd=Math.hypot(dx,dy);if(c&&dd>c){dx*=c/dd;dy*=c/dd}
    const n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/6));
    let bh=0;for(let i=0;i<n;i++){const m=move(S,R,p,dx/n,dy/n);if(m.hx||m.hy)bh=1}
    bumpStep(S,bh&&Math.hypot(inp.drag.x-p.x,inp.drag.y-p.y)>3,'drag',ev);   /* dragged into a wall or the window's edge (game/bump.js) */
  }else{
    if(p.carry){p.carry=0;p.vx=0;p.vy=0}
    stepPlayer(S,R,p.demo?demo(p):p.bd?boardDemo(p):p.jq&&!inp.jp?{...inp,jp:1}:inp,ev,solids(S));
    stepVines(S);   /* Molten: vines grow and wither (game/claws.js) */
    {const wd=inp.l&&!inp.r?-1:inp.r&&!inp.l?1:0;bumpStep(S,!!(wd&&p.ground&&!p.dead&&!p.demo&&!p.bd&&hits(S,R,{x:p.x+wd,y:p.y,w:p.w,h:p.h},[]).length),'walk',ev)}   /* walked into one */
  }
  p.jq=0;
  stepFeed(S,ROOMS[S.room],ev);   /* plants dropped in from the desktop: fall, get eaten, grow his leaf (game/feed.js) */
  perch(S,R,inp,ev);
  burst(S,ev);
  if(S.mode==='dark')S.idle=inp.any||inp.drag?0:S.idle+1;
  {const c=floodTouch(S,R,inp,ev);if(c>=0)die(S,ev,c)}   /* rams, pinches, knocks, a piranha's chomp, shell pushes (game/fish.js) */
  {const c=cinderTouch(S,R,ev);if(c>=0)die(S,ev,c)}   /* vines smother embers, drills open beetles; an ember, a beetle or an eruption (game/cinders.js) */
  {const c=crystalTouch(S,R,ev);if(c!==-1)die(S,ev,c)}   /* Crystals: shard steps, beams, receivers, rams, the Echo (game/crystals.js, echo.js) */
  touch(S,R,ev);
  stepLiquid(S,R,ev);   /* ripples (game/liquid.js) */
  if(!p.dead)transition(S,R);
  if(S.mode==='play'&&!S.seen[S.room]){S.seen[S.room]=1;ev.push('room')}
  if(stepChase(S,ev))die(S,ev,'chase');   /* game/chases.js */
  stuck(S,ev);
  undoRecord(S);   /* this live frame into the Undo buffer (only while he owns it; never dead) */
  camera(S,ROOMS[S.room]);
  return ev;
}

/* ---------- mounting ---------- */
const CSS=`
.tg{position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;outline:none;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
.tg-view{position:relative;flex:none}
.tg-view canvas{display:block;width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none}
.tg-bub{position:absolute;left:0;top:0;display:none;width:max-content;max-width:210px;padding:8px 10px;background:#fff;color:#1A1716;border:1px solid #1A1716;box-shadow:2px 2px 0 #1A1716;pointer-events:none;z-index:2;transform:translate(calc(-50% + var(--bx,0px)),calc(-100% - 14px));font:16px/16px 'Tiny5',ui-monospace,monospace;font-synthesis:none;-webkit-font-smoothing:none;letter-spacing:0;white-space:nowrap}
.tg-bub.on{display:block}
.tg-bub .bg{display:block;visibility:hidden}
.tg-bub .bt{position:absolute;left:10px;top:8px;right:10px}
.tg-bub::after{content:"";position:absolute;left:calc(50% - var(--bx,0px) - 7px);bottom:-9px;border:7px solid transparent;border-top:8px solid #1A1716;border-bottom:0}
.tg-bub::before{content:"";position:absolute;left:calc(50% - var(--bx,0px) - 5px);bottom:-6px;border:5px solid transparent;border-top:7px solid #fff;border-bottom:0;z-index:1}
/* held against the ceiling: the line goes under him so the window's top edge never cuts it */
.tg-bub.below{transform:translate(calc(-50% + var(--bx,0px)),14px)}
.tg-bub.below::after{bottom:auto;top:-9px;border-top:0;border-bottom:8px solid #1A1716}
.tg-bub.below::before{bottom:auto;top:-6px;border-top:0;border-bottom:7px solid #fff}
.tg-mute{position:absolute;right:0;top:0;width:44px;height:44px;padding:0;border:0;background:none;color:#8a8a8a;opacity:.45;z-index:3;cursor:pointer}
.tg-mute:hover,.tg-mute:focus-visible{opacity:1}
.tg-mute svg{display:block;margin:auto}
.tg-band{flex:none;display:none;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px;box-sizing:border-box;opacity:0;transition:opacity .8s steps(4,end);touch-action:none}
.tg.touch .tg-band{display:flex}
.tg-band.on{opacity:1}
.tg-band:not(.on){pointer-events:none}
.tg-band .gp{display:flex;gap:12px}
.tg-band button{width:60px;height:56px;min-width:48px;padding:0;border:3px solid #808080;background:#C0C0C0;color:#1A1716;touch-action:none;clip-path:polygon(0 2px,1px 2px,1px 1px,2px 1px,2px 0,calc(100% - 2px) 0,calc(100% - 2px) 1px,calc(100% - 1px) 1px,calc(100% - 1px) 2px,100% 2px,100% calc(100% - 2px),calc(100% - 1px) calc(100% - 2px),calc(100% - 1px) calc(100% - 1px),calc(100% - 2px) calc(100% - 1px),calc(100% - 2px) 100%,2px 100%,2px calc(100% - 1px),1px calc(100% - 1px),1px calc(100% - 2px),0 calc(100% - 2px))}
.tg-band button[aria-pressed="true"]{background:#A4A4A4}
.tg-band button[hidden]{display:none}
.tg-band svg{display:block;margin:auto;image-rendering:pixelated}
`;
const px=(d,w=14)=>`<svg width="${w*2}" height="${w*2}" viewBox="0 0 ${w} ${w}" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="${d}"/></svg>`;
const ICON={l:px('M3 7h1V6h1V5h1V4h1V3h1v8H7v-1H6V9H5V8H4V7z'),r:px('M6 3h1v1h1v1h1v1h1v1h1v1h-1v1H9v1H8v1H7v1H6z'),
  j:px('M7 2h1v1h1v1h1v1h1v1H9v6H6V6H4V5h1V4h1V3h1z'),b:px('M1 3h4v1H1zM2 5h3v1H2zM3 9h8v-1h2v1h1v1h-1v1h-1v1H3v-1H2v-2h1z'),
  z:px('M4 0h1v1h-1zM3 1h3v1h-3zM2 2h7v1h-7zM1 3h9v1h-9zM2 4h3v1h-3zM8 4h3v1h-3zM3 5h1v1h-1zM9 5h3v1h-3zM10 6h2v1h-2zM0 7h2v1h-2zM11 7h2v1h-2zM0 8h2v1h-2zM11 8h2v1h-2zM1 9h2v1h-2zM10 9h2v1h-2zM1 10h3v1h-3zM9 10h3v1h-3zM2 11h9v1h-9zM3 12h7v1h-7z'),   /* Undo: a counter-clockwise arrow (the same drawing as crystalart.js UNDO_PATH: band, HUD, pickup) */
  on:px('M2 5h2l3-3h1v10H7L4 9H2zM10 4h1v1h1v4h-1v1h-1V9h1V5h-1z'),off:px('M2 5h2l3-3h1v10H7L4 9H2zM9 5h1v1h1V5h1v1h-1v1h1v1h-1v1h-1V8H9V7h1V6H9z')};
/* the board: Shift, X or K; Undo: L or Z (held); M is kept for the map */
export const keyOf=c=>({ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r',ArrowUp:'u',KeyW:'u',ArrowDown:'d',KeyS:'d',Space:'j',ShiftLeft:'b',ShiftRight:'b',KeyX:'b',KeyK:'b',KeyL:'z',KeyZ:'z'})[c];

/* The OS's fourth-wall levels for this frame (pure; no clock, no randomness): {biome, ...} with only the biome's own keys.
   Every level is coarse (0/1 or quarters) so the host restarts its effects rarely. mount() sends each one through
   onFx when it changes. Crystals sends 'crystal' (1 in every Crystals room) and 'erase' (the sweep chase's progress,
   quarters, 0 outside it); 'rewind' goes out in every biome once he owns Undo. */
const RT=ORDER.filter(id=>ROOMS[id].biome==='roots').flatMap(id=>ROOMS[id].torches.map(t=>id+':'+t.tx+','+t.ty));
export function fxLevels(S){
  const R=ROOMS[S.room],bio=R.biome,o={biome:bio},q=v=>Math.round(v*4)/4;
  if(S.items.root)o.seed=1;
  if(S.items.undo)o.rewind=S.undo&&S.undo.on?1:0;   /* Crystals: 1 while he holds Undo and the world runs back (sent in every biome once he owns it) */
  if(bio==='roots'){
    o.moss=Math.round(Math.max(.2,RT.filter(k=>S.torches[k]).length/Math.max(1,RT.length))*20)/20;
    o.thorns=S.chase&&S.chase.on&&S.chase.id==='roots'?Math.max(.25,q(progress(S))):0;   /* the thorn chase grows thorns over the desktop's background as it goes */
  }
  const mk=PIECES.indexOf('molten');   /* Molten is finished when its chase is over with the fragment in hand (or placed): the OS's perches stay scorched from then on, in every biome */
  if(mk>=0&&(S.pieces[mk]&&!(S.chase&&S.chase.on)||S.placed&&S.placed[mk]))o.scorch=1;
  o.shake=q(nearness(S));   /* a chase trembles the desktop harder as the thorns close in */
  if(bio==='flood'){
    const p=S.p,cx=p.x+PW/2,cy=p.y+PH/2,c=(R.g[Math.floor(cy/T)]||'')[Math.floor(cx/T)];
    o.wet=1;   /* the Trash is full of water from the first Flood room */
    o.slosh=p.surf||(S.liq&&S.liq.wet)||inTide(S.liq,cx,cy)||c==='~'?1:0;   /* in the water or surfing it: the game's tab sloshes */
    o.flood=S.chase&&S.chase.id==='flood'?q(progress(S)):0;   /* the tide fills the desktop */
  }
  if(bio==='molten'){
    o.heat=1;   /* a faint heat haze from the first Molten room */
    o.shimmer=S.chase&&S.chase.on&&CHASES[S.chase.id]&&CHASES[S.chase.id].kind==='geyser'?q(progress(S)):0;
    o.glow=S.ens.some(e=>e.k==='vent'&&e.st===2)?1:0;
  }
  if(bio==='crystals'){
    o.crystal=1;   /* the Trash turns to crystal from the first Crystals room */
    const sw=S.chase&&S.chase.on&&CHASES[S.chase.id]&&CHASES[S.chase.id].kind==='sweep',pr=sw?progress(S):0;
    o.erase=Number.isFinite(pr)?q(pr):0;   /* the delete sweep's front, quarters: the desktop icons dissolve in order as it passes */
  }
  return o;
}

/* opts: dev, keyTarget, isActive(), look, assist (bool; default the tos_assist pref), onTorch({restored,warp}),
   onEvent(name,data): 'torch', 'item' {name}, 'piece' {biome}, 'place' {biome}, 'chase_start', 'chase_done', 'door' (all four set),
   onFx(name,level), from fxLevels(): 'biome', 'moss', 'seed', 'rewind' (once he owns Undo: 1 while the world runs back, else 0),
   'shake' (0..1 in quarters while thorns or the eel chase him), in Roots 'thorns' (0, or 0.25..1 in quarters while the thorn
   chase runs: thorns grow over the desktop's background), 'scorch' (1 in every biome once Molten is finished: the buddy's perches stay scorched),
   in Flood 'wet' (1: the Trash fills with water), 'slosh' (1 while he is in the water or surfing it, else 0) and 'flood'
   (how far the eel's tide has come, 0..1 in quarters, 0 once it is over), and in Molten 'heat' (1: a faint heat haze),
   'shimmer' (how far he has come through the geyser chase, 0..1 in quarters, 0 outside it; the haze grows with it) and
   'glow' (1 while a vent in his room erupts, else 0: the desktop icons glow, the haze flares). A new 'biome' means the
   host clears every effect but the seed and the scorch; keys a biome does not send are 0 there.
   'shake' in the geyser chase is how near a cracking or erupting vent is,
   onDone({restored}): once, after the door has finished opening (or on mount when a save has it open already); the host
   runs the ending from there (os.js: finishGame). The game never fires onEvent('done') itself. */
export function mount(el,opts={}){
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DEV=opts.dev??(/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)||/[?&]qa\b/.test(location.search));
  if(!document.getElementById('tg-css')){const s=document.createElement('style');s.id='tg-css';s.textContent=CSS;document.head.appendChild(s)}
  const root=document.createElement('div');root.className='tg';root.tabIndex=0;root.setAttribute('aria-label','Wake Up (game)');
  root.innerHTML=`<div class="tg-view"><canvas width="${VW}" height="${VH}"></canvas><div class="tg-bub"><span class="bg"></span><span class="bt"></span></div><button class="tg-mute" type="button"></button></div>
<div class="tg-band"><div class="gp"><button type="button" data-k="l" aria-label="Left">${ICON.l}</button><button type="button" data-k="r" aria-label="Right">${ICON.r}</button></div><div class="gp"><button type="button" data-k="z" aria-label="Undo" hidden>${ICON.z}</button><button type="button" data-k="b" aria-label="Board" hidden>${ICON.b}</button><button type="button" data-k="j" aria-label="Jump">${ICON.j}</button></div></div>`;
  el.appendChild(root);
  const $=s=>root.querySelector(s),cv=$('canvas'),view=$('.tg-view'),bub=$('.tg-bub'),band=$('.tg-band'),muteB=$('.tg-mute'),boardB=$('[data-k="b"]'),undoB=$('[data-k="z"]');
  const rend=createRenderer(cv,{reduce}),au=createAudio(MUTE_KEY);
  /* his look (hat, skull mask) is the OS Control Panel's preference (tos_hat, tos_mask), never part of the save */
  const prefLook=()=>{try{return {hat:localStorage.getItem('tos_hat')||'none',mask:localStorage.getItem('tos_mask')==='1'?1:0}}catch(_){return {}}};
  rend.setLook(opts.look||prefLook());
  /* the Wake Up double-click that mounted us is a gesture, so the intro can sound (skipped when the page has none yet) */
  if(!navigator.userActivation||navigator.userActivation.hasBeenActive)au.unlock();

  /* state: a lit save resumes at the last torch; anything earlier replays the intro */
  let S=newState();
  /* Assist (slower chases, wider checkpoints): opts.assist, else the tos_assist pref; handle.setAssist() changes it live */
  let assist=opts.assist!==undefined?(opts.assist?1:0):(()=>{try{return localStorage.getItem(ASSIST_KEY)==='1'?1:0}catch(_){return 0}})();
  S.assist=assist;
  const d=load();
  if(d&&d.lit){
    resume(S,d);if(!S.cp)S.cp=hubTorch();
    const R=ROOMS[S.cp.room]?ROOMS[S.cp.room]:ROOMS.hub;if(R.id!==S.cp.room)S.cp=hubTorch();
    enterRoom(S,S.cp.room,spot(S,ROOMS[S.cp.room],S.cp.tx,S.cp.ty));S.p.mac=0;S.p.hide=0;
    if(S.chase&&!CHASES[S.chase.id])S.chase=null;resetChase(S);   /* a chase saved mid-run starts again behind his torch */
    queueMicrotask(()=>{opts.onTorch&&opts.onTorch({restored:true});if(S.door&&opts.onDone)opts.onDone({restored:true})});
  }

  /* input */
  const K={l:0,r:0,u:0,d:0,j:0,b:0,z:0},B={l:0,r:0,j:0,b:0,z:0};let jq=0,bq=0,zq=0,drag=null,touchUI=matchMedia('(pointer:coarse)').matches||/[?&]touch\b/.test(location.search);
  const active=()=>!opts.isActive||opts.isActive();
  const gesture=()=>au.unlock();
  const kd=e=>{const k=keyOf(e.code);if(!k||e.metaKey||e.ctrlKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||!active())return;e.preventDefault();gesture();if(k==='j'&&!K.j&&!e.repeat)jq=1;if(k==='u'&&!K.u&&!e.repeat)jq=1;if(k==='b'&&!K.b&&!e.repeat)bq=1;if(k==='z'&&!K.z&&!e.repeat)zq=1;K[k]=1};
  const ku=e=>{const k=keyOf(e.code);if(k)K[k]=0};
  const clearKeys=()=>{for(const k in K)K[k]=0;for(const k in B)B[k]=0;drag=null;ptr.clear();paintBand()};
  /* opts.keyTarget (the OS passes window) lets keys reach the game wherever focus sits; opts.isActive then decides */
  const kt=opts.keyTarget||root;kt.addEventListener('keydown',kd);kt.addEventListener('keyup',ku);root.addEventListener('blur',clearKeys);
  root.addEventListener('pointerdown',e=>{root.focus({preventScroll:true});gesture();if(e.pointerType==='touch'&&!touchUI){touchUI=true;fit()}});
  /* a touch only counts as a gesture for audio on its way up (iOS/Android), so unlock there too */
  for(const t of ['pointerup','touchend','click'])root.addEventListener(t,gesture);
  /* dark phase: pick the mascot up and drop him. A mouse must grab him; a finger anywhere on the black pulls him to it */
  const toRoom=e=>{const r=cv.getBoundingClientRect();return {x:(e.clientX-r.left)*VW/r.width+S.cam.x,y:(e.clientY-r.top)*VH/r.height+S.cam.y}};
  root.addEventListener('pointerdown',e=>{
    if(S.mode!=='dark'||S.p.dead||!(e.target===cv||e.target===root||band.contains(e.target)))return;
    const q=toRoom(e),p=S.p,touch=e.pointerType!=='mouse',sl=touch?20:8,hit=!(q.x<p.x-sl||q.x>p.x+p.w+sl||q.y<p.y-sl-8||q.y>p.y+p.h+sl);
    if(!hit&&(!touch||e.target!==cv&&!touchUI))return;
    e.preventDefault();root.setPointerCapture(e.pointerId);
    drag=hit?{id:e.pointerId,ox:q.x-p.x,oy:q.y-p.y,x:p.x,y:p.y}:{id:e.pointerId,ox:PW/2,oy:PH/2,x:q.x-PW/2,y:q.y-PH/2,cap:6};
  });
  root.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const q=toRoom(e);drag.x=q.x-drag.ox;drag.y=q.y-drag.oy});
  const drop=e=>{if(drag&&e.pointerId===drag.id)drag=null};
  root.addEventListener('pointerup',drop);root.addEventListener('pointercancel',drop);
  /* touch band: each finger maps to the button under it, so move + jump work together and a finger can slide L<->R */
  const ptr=new Map();
  const under=e=>{const t=document.elementFromPoint(e.clientX,e.clientY);return t&&band.contains(t)&&t.closest('[data-k]')?t.closest('[data-k]').dataset.k:null};
  function paintBand(){const n={l:0,r:0,j:0,b:0,z:0};for(const k of ptr.values())if(k)n[k]=1;if(n.j&&!B.j)jq=1;if(n.b&&!B.b)bq=1;if(n.z&&!B.z)zq=1;Object.assign(B,n);
    band.querySelectorAll('[data-k]').forEach(b=>b.setAttribute('aria-pressed',B[b.dataset.k]?'true':'false'))}
  band.addEventListener('pointerdown',e=>{e.preventDefault();gesture();band.setPointerCapture(e.pointerId);ptr.set(e.pointerId,under(e));paintBand()});
  band.addEventListener('pointermove',e=>{if(ptr.has(e.pointerId)){ptr.set(e.pointerId,under(e));paintBand()}});
  for(const t of ['pointerup','pointercancel','lostpointercapture'])band.addEventListener(t,e=>{if(ptr.delete(e.pointerId))paintBand()});
  band.addEventListener('contextmenu',e=>e.preventDefault());
  /* mute */
  const paintMute=()=>{muteB.innerHTML=au.muted()?ICON.off:ICON.on;muteB.setAttribute('aria-label',au.muted()?'Sound off':'Sound on')};
  muteB.addEventListener('click',e=>{e.stopPropagation();au.unlock();au.setMute(!au.muted());paintMute();root.focus({preventScroll:true})});
  muteB.addEventListener('pointerdown',e=>e.stopPropagation());
  paintMute();

  /* layout: integer device-pixel scale; on touch screens, fit the width unless an integer scale fills 85% of it */
  let scale=1,fill=false;   /* fill: the host's full screen takes the fractional scale too, so the game grows into the space instead of stopping at a whole number */
  function fit(){
    root.classList.toggle('touch',touchUI);
    const dpr=devicePixelRatio||1,bh=touchUI?band.offsetHeight||76:0,W=root.clientWidth,H=root.clientHeight-bh;
    const kd=Math.max(.05,Math.min(W*dpr/VW,H*dpr/VH)),ki=Math.floor(kd),k=kd<1||fill?kd:!touchUI||ki/kd>=.85?ki:kd;
    scale=k/dpr;view.style.width=VW*scale+'px';view.style.height=VH*scale+'px';band.style.width=Math.max(VW*scale,240)+'px';
    /* mute (44px target) sits beside the view's top-right corner, else above it, else just inside it */
    const rg=(W-VW*scale)/2>=48,tg=!rg&&(root.clientHeight-VH*scale-bh)/2>=48;
    muteB.style.right=rg?'-48px':'0';muteB.style.top=tg?'-48px':'0';
  }
  const ro=new ResizeObserver(fit);ro.observe(root);fit();

  /* loop */
  let raf=0,last=0,acc=0,userPaused=false,hidden=document.hidden,lastBub='',bHid=null,bDem=false,zHid=null,zDem=false;
  function tick(){
    const inp={l:K.l||B.l,r:K.r||B.r,u:K.u,d:K.d,j:K.j||K.u||B.j,jp:jq,b:K.b||B.b,bp:bq,z:K.z||B.z,zp:zq,drag:drag&&{x:drag.x,y:drag.y,cap:drag.cap},any:0};
    inp.any=inp.l||inp.r||inp.u||inp.d||inp.j||jq||inp.b||bq||inp.z||zq;jq=0;bq=0;zq=0;
    /* frozen: step() spends this frame on hit-stop, so the renderer's pulse and dust hold too (read before step() counts it down) */
    const lit0=S.lit,frozen=S.hit>0&&S.mode!=='intro',ev=step(S,inp,[]);
    if(rend.step)rend.step(S,ev,frozen);   /* one fixed step of pulse and dust (render.js); draw() only reads them */
    for(const e of ev){
      au.sfx(e,{lv:S.p.lv,reduce});   /* lv: the land sound scales with the fall (A9); reduce: no pitch variation (A12) */
      if(e==='cp'||e==='item'||e==='torch'||e==='latch'||e==='piece'||e==='place'||e==='chase_start'||e==='chase_done'||e==='room')save(S);
      if(e==='torch'&&!lit0){opts.onTorch&&opts.onTorch({restored:false});emit('torch')}
      if(e==='chase_start'||e==='chase_done'||e==='door')emit(e,{});
      if(e==='place')emit('place',{biome:PIECE[S.slot?S.slot.k:0]});
      if(e==='opened'&&opts.onDone)opts.onDone({restored:false});   /* the door has finished opening (the ending is the host's) */
    }
  }
  /* host hooks: onEvent(name,data) for item/piece/torch, onFx(name,level) for the OS's fourth-wall effects; each sent only when it changes */
  const PIECE=['roots','flood','molten','crystals'],emit=(n,d={})=>opts.onEvent&&opts.onEvent(n,d);
  let seenI={...S.items},seenP=S.pieces.slice();const fxS={};
  const fx=(n,v)=>{if(fxS[n]!==v){fxS[n]=v;opts.onFx&&opts.onFx(n,v)}};
  function hooks(){
    for(const k in S.items)if(S.items[k]&&!seenI[k])emit('item',{name:k});
    S.pieces.forEach((v,i)=>{if(v&&!seenP[i])emit('piece',{biome:PIECE[i]})});
    seenI={...S.items};seenP=S.pieces.slice();
    if(!opts.onFx||!S.lit)return;
    const L=fxLevels(S);if(fxS.biome!==L.biome)for(const k in fxS)if(k!=='seed'&&k!=='scorch')delete fxS[k];
    for(const k in L)fx(k,L[k]);   /* 'biome' first (object order), so os.js clears the last biome's effects before the new ones */
  }
  function sound(){
    const R=ROOMS[S.room];
    au.amb(S.mode==='intro'||!S.lit?null:R.biome==='hub'?'cave':R.biome==='flood'?'tide':R.biome==='crystals'?'glass':'moss');
    au.hush(S.sit?clamp((S.sit-20)/PERCH.hush,0,1):0);   /* sitting on a perch: a soft pad of open fifths swells in */
    let v=0;const p=S.p,cx=p.x+PW/2,cy=p.y+PH/2;
    for(const t of R.torches){const lit=S.torches[R.id+':'+t.tx+','+t.ty],dd=Math.hypot(t.tx*T+6-cx,t.ty*T+6-cy);
      if(S.mode==='dark')v=Math.max(v,Math.pow(clamp(1-dd/300,0,1),1.6));else if(lit)v=Math.max(v,.3*clamp(1-dd/160,0,1))}
    au.crackle(S.mode==='intro'?0:v);
    au.hum(R.biome==='crystals'&&S.mode==='play'&&!S.p.dead?beamNear(S,R):0);   /* a prism beam hums only when he is near it */
    au.rumble(S.chase?(S.chase.on?Math.max(.15,nearness(S)):Math.max(0,.15*(1-S.chase.w/30))):0);   /* the thorn wall: low rumble + rustle */
  }
  function bubble(){
    const s=S.say;
    if(!s){if(lastBub){bub.className='tg-bub';lastBub=''}return}
    const shown=s.text.slice(0,reduce?s.text.length:Math.min(s.text.length,s.n>>1));
    if(lastBub!==s.text){bub.querySelector('.bg').textContent=s.text;bub.className='tg-bub on';lastBub=s.text}
    bub.querySelector('.bt').textContent=shown;
    const p=S.p,x=(p.x+PW/2-S.cam.x)*scale,y=(p.y-4-S.cam.y)*scale,w=bub.offsetWidth,vw=VW*scale;
    let dx=0;if(x-w/2<4)dx=4-(x-w/2);if(x+w/2>vw-4)dx=vw-4-(x+w/2);
    const lo=y-bub.offsetHeight-14<2;bub.classList.toggle('below',lo);
    bub.style.left=x+'px';bub.style.top=(lo?(p.y+PH+2-S.cam.y)*scale:y)+'px';bub.style.setProperty('--bx',Math.round(dx)+'px');
  }
  function frame(now){
    raf=requestAnimationFrame(frame);
    if(userPaused||hidden){last=0;return}
    if(!last)last=now;
    acc+=Math.min(100,now-last);last=now;
    let n=0;while(acc>=STEP&&n<5){tick();acc-=STEP;n++}
    if(n>=5)acc=0;
    rend.draw(S,ROOMS[S.room]);
    band.classList.toggle('on',!!S.lit);
    {const h=!S.items.board;if(h!==bHid){bHid=h;boardB.hidden=h}}   /* the band shows only tools he owns (written on change) */
    /* the board's pickup demo dash: its button shows pressed, so a phone player sees which one does that */
    {const d=S.p.bd>=BDEMO.go&&S.p.dt>0;if(d!==bDem){bDem=d;boardB.setAttribute('aria-pressed',d||B.b?'true':'false')}}
    /* Undo: shown once he owns it; during its pickup demo the button shows pressed while the demo holds the key */
    {const h=!S.items.undo;if(h!==zHid){zHid=h;undoB.hidden=h}}
    {const d=!!(S.undo&&S.undo.demo&&S.undo.dp===3);if(d!==zDem){zDem=d;undoB.setAttribute('aria-pressed',d||B.z?'true':'false')}}
    bubble();sound();hooks();
  }
  raf=requestAnimationFrame(frame);
  const onVis=()=>{hidden=document.hidden;if(hidden){clearKeys();au.suspend()}else if(!userPaused){last=0;acc=0;au.resume()}};
  document.addEventListener('visibilitychange',onVis);
  root.focus({preventScroll:true});

  /* debug panel: localhost or ?qa only */
  const api={
    rooms:ORDER.map(id=>({id,name:ROOMS[id].name})),
    state:()=>S,
    /* id: a room, 'intro', 'dark', or 'chase' (the shrine, the Roots fragment back on its pedestal, gates latched) */
    warp(id){
      const keep={items:{...S.items},pieces:S.pieces.slice(),placed:S.placed.slice(),seen:{...S.seen},torches:{...S.torches},cp:S.cp,latch:{...S.latch}},lit0=S.lit;
      restore(S,newState());Object.assign(S,{items:keep.items,pieces:keep.pieces,placed:keep.placed,assist});
      if(id==='intro')return;
      if(id==='dark'){S.mode='dark';S.match=1;S.intro.land=0;const st=ROOMS.hub.start;S.p.x=st.tx*T+T/2-PW/2;S.p.y=(st.ty+1)*T-PH;return}
      Object.assign(S,{lit:1,litT:60,match:1,mode:'play',torches:keep.torches,cp:keep.cp,latch:keep.latch,seen:keep.seen});
      if(id==='chase'){id='r5';S.items.root=1;S.p.root=1;S.pieces[0]=0;S.placed[0]=0;S.latch.r3=1}
      const R=ROOMS[id],t=R.torches[R.torches.length-1];enterRoom(S,id,spot(S,R,t.tx,t.ty));
      if(!lit0&&opts.onTorch)opts.onTorch({restored:false,warp:true});
    },
    grant(k,v){S.items[k]=v?1:0;if(v&&k==='root')S.p.root=1;if(v&&k==='board')S.p.dc=1;if(k==='undo'){undoClear(S);undoFill(S)}S.items=items(S.items);save(S)},   /* no forged board without the board */   /* the item's charge: the root jump, the dash */
    piece(i,v){S.pieces[i]=v?1:0;if(!v)S.placed[i]=0;save(S)},
    place(i,v){S.placed[i]=v?1:0;if(v)S.pieces[i]=1;S.door=S.placed.every(Boolean)?1:0;S.doorT=S.door?999:0;save(S)},
    assist(v){setAssist(v)},
    stuck(){S.stuck=STUCK-1},   /* the stuck hint, now */
    reset(){clearSave();restore(S,newState());S.assist=assist},
    say(text,pose){S.say={text,t:Math.max(160,text.length*7+80),n:0,pose:pose||''}},
    look(l){rend.setLook(l||prefLook())},
    pause(v){clearKeys();if(v){userPaused=true;au.suspend()}else if(userPaused){userPaused=false;last=0;acc=0;if(!hidden)au.resume();root.focus({preventScroll:true})}},
  };
  function setAssist(v){assist=v?1:0;S.assist=assist;try{localStorage.setItem(ASSIST_KEY,assist?'1':'0')}catch(_){}}
  if(DEV){
    import(new URL('./dev/panel.js',import.meta.url).href).then(m=>m.default(root,api)).catch(e=>console.warn('dev panel',e));
    window.__game=api;
  }

  return {
    pause(){userPaused=true;clearKeys();au.suspend()},
    resume(){if(!userPaused)return;userPaused=false;last=0;acc=0;if(!hidden)au.resume();root.focus({preventScroll:true})},
    destroy(){cancelAnimationFrame(raf);ro.disconnect();kt.removeEventListener('keydown',kd);kt.removeEventListener('keyup',ku);document.removeEventListener('visibilitychange',onVis);au.destroy();root.remove();if(window.__game===api)delete window.__game},
    getState:()=>snapshot(S),
    /* feeding (game/feed.js): the host drops a desktop plant in. canDrop: lit and playing. drop(kind, clientX, clientY, col): kind seed|sprout|bloom (glow counts as bloom);
       the point is where the plant's base is on the page: over the view it lands there, anywhere else (the window's frame, the Wake Up icon) it falls just ahead of him. False if refused */
    canDrop:()=>S.lit&&S.mode==='play'&&!S.p.dead?true:false,
    drop(kind,cx,cy,col){
      if(!(S.lit&&S.mode==='play'&&!S.p.dead))return false;
      const R=ROOMS[S.room],p=S.p,r=cv.getBoundingClientRect();
      if(r.width&&cx>=r.left&&cx<=r.right&&cy>=r.top&&cy<=r.bottom){const q=toRoom({clientX:cx,clientY:cy});if(addDrop(S,R,kind,q.x,q.y,col))return true}
      for(const s of [p.face,-p.face,0])if(addDrop(S,R,kind,p.x+p.w/2+s*34,p.y-6,col))return true;
      return false;
    },
    setLook(l){rend.setLook(l)},
    /* Assist (Control Panel): chases at 70% speed and restart further behind each torch. Also written to tos_assist */
    setAssist(v){setAssist(v)},
    getAssist:()=>!!assist,
    /* sound (the Wakeup menu's Options, same switch as the corner button) */
    setMute(v){au.setMute(!!v);paintMute()},
    getMute:()=>au.muted(),
    setFill(v){fill=!!v;fit()},
    /* a line from the host (pose 'beg' pleads); only once he is in the light and nothing else is being said. True if said */
    say(text,o={}){if(!S.lit||S.mode!=='play'||S.say||S.p.dead)return false;S.say={text,t:o.t||Math.max(160,text.length*7+80),n:0,pose:o.pose||''};return true},
    /* the host calls this inside its own gesture handler (Safari only starts audio there) */
    unlockAudio(){au.unlock()},
  };
}
