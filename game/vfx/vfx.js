/* Pixel VFX: the Sprite Fusion effects in ./effects/ (MIT, Copyright (c) 2026 Hugo Duprez), played off world state.
   Lives OUTSIDE S, like fx.js. render.js keeps one vfx = createVfx({reduce,mk,rooms,PIECES,fragCentre}), calls
   vfx.step(S,ev,frozen) once per world step from rend.step, and in draw(): drawLit before the light block, light(L,ox,oy)
   after its addLight calls and before lightPass, drawBack after the light block (before enemies), drawFront after the
   mascot. map.js says what plays when and how it looks.
   Units: effects take world units, 2 per effect px, and one effect px is one room px: every position is room px x 2, and
   each Frame is VW x VH with ox, oy = the camera in room px, so effects scroll with the room.
   No document or window: mk(w,h) makes the offscreen canvases. Without mk the frames stay plain Uint32Arrays (vfx.frames,
   for node tests) and the draw calls do nothing. No Math.random: every effect gets a seed from the counter n (lowbias32,
   as fx.js), which keeps counting across clear(). Under reduce nothing plays at all (A12).
   Colour frames are ABGR words over an ImageData's bytes (little-endian RGBA), so nothing is copied; they are put into
   their own canvas and drawn over the scene with drawImage, never putImageData'd onto it (alpha 0 would wipe it). */
import sparkle from './effects/sparkle.js';
import pickup from './effects/pickup.js';
import powerUp from './effects/power-up.js';
import holyLight from './effects/holy-light.js';
import impact from './effects/impact.js';
import movement from './effects/movement.js';
import fireflies from './effects/fireflies.js';
import fallingLeaves from './effects/falling-leaves.js';
import fog from './effects/fog.js';
import bubbles from './effects/bubbles.js';
import embers from './effects/embers.js';
import {USE,COLORS,AMBIENT,ROOM_AMBIENT,FOG,OFF,MAX} from './map.js';

export const LIGHT_GAIN=1.6;   /* light-buffer luminance (0..1 a px) x this goes into the renderer's L; 1.6 was the harness's guess */
export const DT=1/60;          /* engine STEP */
const FX={sparkle,pickup,'power-up':powerUp,'holy-light':holyLight,impact,movement,fireflies,'falling-leaves':fallingLeaves,fog,bubbles,embers};
/* options these effects use already packed (their fallbacks are pre-mapped), so '#rrggbb' must be packed here */
const PACKED={'holy-light':['colors'],impact:['ramp'],movement:['colors','groundColor']};
const LAYERS=['back','front'],SOLID='#=';   /* rock and rubble (render.js solidCh, less the gate, which moves) */
const B4=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5],bay=(x,y)=>(B4[(y&3)*4+(x&3)]+.5)/16;
/* '#rrggbb' -> ABGR, as the effects' own rgb() */
export const pk=h=>{const v=parseInt(h.slice(1),16);return ((255<<24)|((v&255)<<16)|(v&0xff00)|((v>>16)&255))>>>0};
const pkAll=c=>Array.isArray(c)?c.map(pkAll):typeof c==='string'?pk(c):c;
/* per-channel saturating add, as the effects' own Px.add */
const addc=(d,c)=>{const r=Math.min(255,(d&255)+(c&255)),g=Math.min(255,((d>>>8)&255)+((c>>>8)&255)),b=Math.min(255,((d>>>16)&255)+((c>>>16)&255));return ((255<<24)|(b<<16)|(g<<8)|r)>>>0};
const BLANK={w:1,h:1,data:new Uint32Array(1)};   /* pickup's own sprite: the item is already gone when its trigger fires */
/* the Actor stub's silhouette: his 22 px body (FR idle, rx = ry = 11) on two shoes, INK rim, a mid fill, one highlight.
   Alpha is 255 everywhere it is set (movement's shade() skips anything else). Effect px, feet on the bottom row. */
const SIL=(()=>{const w=22,h=24,d=new Uint32Array(w*h),ink=pk('#1a1716'),mid=pk('#9a96a8'),hi=pk('#e8e6f0');
  for(let y=0;y<22;y++)for(let x=0;x<w;x++){const q=Math.hypot(x+.5-11,y+.5-11);if(q<11)d[y*w+x]=q>9.6?ink:Math.hypot(x-7,y-7)<2.5?hi:mid}
  for(const f of [5,14])for(let y=22;y<h;y++)for(let x=f;x<f+3;x++)d[y*w+x]=ink;
  return {w,h,data:d}})();

export function createVfx({reduce=false,mk,rooms=null,PIECES=[],fragCentre=null,T=12,VW=288,VH=216,isLiq=c=>c==='~'}={}){
  const N=VW*VH,light=new Uint32Array(N),junk=new Uint32Array(N),sc=new Uint32Array(N),sl=new Uint32Array(N);
  /* v: n seed counter, list live effects, at the step they were made for, prev the state the triggers compare with,
     S/R the last step's, sol the room's solid tiles, rk/rx/ry the step and camera the frames were last drawn for */
  const v={n:0,k:0,list:[],at:{room:null,t:NaN},prev:null,S:null,R:null,sol:null,rk:-1,rx:0,ry:0,err:0};
  const slot=k=>{const s={k,on:0,cv:null,cx:null,img:null,color:null};
    if(mk)try{s.cv=mk(VW,VH);s.cx=s.cv.getContext('2d');s.img=s.cx.createImageData(VW,VH);s.color=new Uint32Array(s.img.data.buffer)}
    catch(_){s.cv=s.cx=s.img=null}   /* no DOM (node tests build a renderer on a fake canvas): plain arrays, draws do nothing */
    if(!s.color)s.color=new Uint32Array(N);
    return s};
  const SL={lit:slot('lit'),back:slot('back'),front:slot('front')};
  const frame=(color,l)=>({w:VW,h:VH,ox:0,oy:0,color,light:l});
  const FL={},FJ={},SCR=frame(sc,sl),FRAMES=[SCR];   /* FL: light reaches L; FJ: noLight, its glow goes to junk */
  for(const k in SL){FL[k]=frame(SL[k].color,light);FJ[k]=frame(SL[k].color,junk);FRAMES.push(FL[k],FJ[k])}
  const now=globalThis.performance?()=>performance.now():null,cost={ms:new Float32Array(120),i:0};

  /* shake, flash, ripple, cue, darken: no-ops unless set on vfx.hooks; never throw into an effect; no flash under reduce.
     Camera shake is engine state (S.cam.sh), and stun already shakes, so leave shake unset. */
  const hooks={},hook=k=>(...a)=>{const f=hooks[k];if(typeof f!=='function'||(k==='flash'&&reduce))return;try{f(...a)}catch(_){v.err++}};
  const HOOKS={shake:hook('shake'),flash:hook('flash'),ripple:hook('ripple'),cue:hook('cue'),darken:hook('darken')};

  /* small integer hash (lowbias32) of the counter, never 0 (the effects' Rng treats 0 as 1) */
  function seed(){let h=(v.n++ +1)>>>0;h^=h>>>16;h=Math.imul(h,0x7feb352d)>>>0;h^=h>>>15;h=Math.imul(h,0x846ca68b)>>>0;h^=h>>>16;return (h>>>0)||1}

  /* the mascot as an effect Actor: feet() and head() in world units, silhouette() in effect px, all read live from the
     last step's S.p (the root pickup starts his demo jump, so he leaves the spot) */
  const actor=()=>({
    feet:()=>{const p=v.S.p;return [(p.x+p.w/2)*2,(p.y+p.h)*2]},
    head:()=>{const p=v.S.p;return [(p.x+p.w/2)*2,(p.y+p.h-22)*2]},
    silhouette:()=>{const p=v.S.p;return {x:Math.round(p.x+p.w/2)-11,y:Math.round(p.y+p.h)-SIL.h,w:SIL.w,h:SIL.h,data:SIL.data}}});

  /* one effect for a use in map.js (or a bare effect name), colours for key (a biome) */
  function add(name,o={},key){
    const u=USE[name]||(FX[name]&&{fx:name,slot:'emissive'});if(!u||!FX[u.fx])return null;
    const C=COLORS[name],pal=C&&(C[key]||C.any)||{};
    const {clip,remap,...opt}={...u.o,...pal,...o,seed:seed(),...HOOKS};
    for(const k of PACKED[u.fx]||[])if(opt[k]!=null)opt[k]=pkAll(opt[k]);
    if(u.sprite===false&&opt.item===undefined)opt.item=BLANK;
    let fx;try{fx=FX[u.fx](opt)}catch(_){v.err++;return null}
    const e={name,u,fx,amb:!!u.ambient,dead:0,
      clip:clip&&Number.isFinite(opt.y)?{top:opt.y/2-clip.h,fade:Math.max(1,clip.fade|0)}:null,   /* room px */
      remap:remap?new Map(Object.entries(remap).map(([a,b])=>[pk(a),pk(b)])):null};
    if(!e.amb){const one=v.list.filter(x=>!x.amb);if(one.length>=MAX)v.list.splice(v.list.indexOf(one[0]),1)}
    v.list.push(e);
    return {name,stop(){try{fx.stop&&fx.stop()}catch(_){v.err++}},done:()=>!v.list.includes(e)};
  }

  /* ---------- room facts (rebuilt when the room changes) ---------- */
  const solidOf=R=>{const s=new Uint8Array(R.w*R.h);for(let ty=0;ty<R.h;ty++)for(let tx=0;tx<R.w;tx++)s[ty*R.w+tx]=SOLID.includes(R.g[ty][tx])?1:0;return s};
  const solid=(R,tx,ty)=>tx>=0&&ty>=0&&tx<R.w&&ty<R.h&&SOLID.includes(R.g[ty][tx]);
  const liq=(R,tx,ty)=>!!(R.g[ty]&&isLiq(R.g[ty][tx]));
  /* the first rock at or below room px (x,y), room px; the room's bottom if none */
  const floorBelow=(R,x,y)=>{const tx=Math.floor(x/T);for(let ty=Math.max(0,Math.floor(y/T));ty<R.h;ty++)if(solid(R,tx,ty))return ty*T;return R.h*T};
  /* ground(x) for leaves and fireflies: the lowest floor in each column (up from the bottom past rock), world units */
  function floorFn(R){
    const col=new Float32Array(R.w);
    for(let tx=0;tx<R.w;tx++){let ty=R.h-1;while(ty>=0&&solid(R,tx,ty))ty--;col[tx]=(ty+1)*T*2}
    return x=>col[Math.max(0,Math.min(R.w-1,Math.floor(x/2/T)))];
  }
  /* map.js per: scale counts and densities by the room against one view */
  function scaled(u,o,A){
    for(const k in u.per||{}){const m=u.per[k],w=m[0]==='w',base=(u.o&&u.o[k])??1,f=w?A.w/(VW*2):A.w*A.h/(VW*VH*4);
      o[k]=m.endsWith('#')?Math.max(1,Math.round(base*f)):Math.max(.05,base*f)}
    return o;
  }
  /* bubbles: one per liquid surface in S.liq (game/liquid.js): x from its first tile to the end of its run, the top at its
     rest line ty*T, the ground each column's pool floor; vents spread every ~u.vent px (each paints a 9x3 vent sprite) */
  function pools(S,R,u){
    for(const s of (S.liq&&S.liq.s)||[]){
      let e=s.tx;while(e<R.w&&liq(R,e,s.ty)&&!liq(R,e,s.ty-1))e++;
      if(e<=s.tx)continue;
      const top=s.ty*T,bot=[];let deep=top+T;
      for(let tx=s.tx;tx<e;tx++){let ty=s.ty;while(ty<R.h&&liq(R,tx,ty))ty++;bot.push(ty*T*2);deep=Math.max(deep,ty*T)}
      const x0=s.tx*T,w=(e-s.tx)*T,A={x:x0*2,y:top*2,w:w*2,h:(deep-top)*2},nv=Math.max(1,Math.round(w/(u.vent||96)));
      const ground=x=>{const i=Math.floor(x/2/T)-s.tx;return bot[i<0?0:i>=bot.length?bot.length-1:i]};
      add('bubbles',scaled(u,{area:A,ground,vents:Array.from({length:nv},(_,i)=>(x0+(i+.5)*w/nv)*2)},A),R.biome);
    }
  }
  function ambient(S,R){
    const names=[...(ROOM_AMBIENT[R.id]??AMBIENT[R.biome]??[])];
    if(FOG.on&&FOG.biomes.includes(R.biome))names.push('fog');
    for(const n of names){const u=USE[n];if(!u)continue;
      if(u.fx==='bubbles'){pools(S,R,u);continue}
      const A={x:0,y:0,w:R.w*T*2,h:R.h*T*2},o={area:A};   /* room-sized, so nothing slides with the camera */
      if(u.ground==='floor')o.ground=floorFn(R);
      add(n,scaled(u,o,A),R.biome);
    }
  }

  /* ---------- triggers: state that just turned on, against the last step (engine events carry no position) ---------- */
  const cpKey=c=>c?c.room+':'+c.tx+','+c.ty:'';
  const snap=S=>({wrap:S.ens.map(e=>e.wrap|0),items:{...S.items},pieces:S.pieces.slice(),placed:S.placed.slice(),door:S.door,torches:{...S.torches},cp:cpKey(S.cp)});
  function triggers(S,R,ev){
    const P=v.prev,b=R.biome,at=(n,x,y,key,o)=>add(n,{x:x*2,y:y*2,...o},key);
    /* stun: wrap only counts down, so any rise is a (re-)stun; the enemy's centre, no light */
    S.ens.forEach((e,i)=>{if((e.wrap|0)>(P.wrap[i]|0))at('stun',e.x+e.w/2,e.y+e.h/2,b)});
    for(const id in S.items)if(S.items[id]&&!P.items[id]){const p=S.p;
      if(id==='root')at('root',p.x+p.w/2,p.y+p.h,b,{actor:actor()});
      else{const it=R.items.find(q=>q.id===id);if(it)at('item',it.tx*T+OFF.item[0],it.ty*T+OFF.item[1],b);else at('item',p.x+p.w/2,p.y+p.h/2,b)}}
    S.pieces.forEach((on,k)=>{if(!on||P.pieces[k])return;const f=R.pedestals.find(q=>PIECES.indexOf(q.piece)===k);
      if(f)at('piece',f.tx*T+OFF.piece[0],(f.ty+1)*T+OFF.piece[1],f.piece)});
    /* the fourth fragment and the door turn on in one step: the door's beam stands for both */
    const door=S.door&&!P.door;
    if(fragCentre){
      if(!door)S.placed.forEach((on,k)=>{if(on&&!P.placed[k]){const c=fragCentre(k);at('place',c.x,c.y,PIECES[k])}});
      if(door||ev.includes('opened')){let x=0,y=0;for(let k=0;k<4;k++){const c=fragCentre(k);x+=c.x/4;y+=c.y/4}
        at(door?'door':'opened',x,floorBelow(R,x,y),b)}
    }
    /* a torch lit ('light') and a checkpoint set ('cp') usually come together: one sparkle per torch */
    const tt=new Set();
    for(const k in S.torches)if(S.torches[k]&&!P.torches[k]&&k.startsWith(R.id+':'))tt.add(k.slice(R.id.length+1));
    if(S.cp&&S.cp.room===R.id&&cpKey(S.cp)!==P.cp)tt.add(S.cp.tx+','+S.cp.ty);
    for(const s of tt){const [tx,ty]=s.split(',').map(Number);if(Number.isFinite(tx)&&Number.isFinite(ty))at('torch',tx*T+OFF.torch[0],ty*T+OFF.torch[1],b)}
  }

  /* once per world step (R: ROOMS[S.room], looked up in rooms when left out) */
  function step(S,ev=[],frozen,R0){
    const R=R0||(rooms&&rooms[S.room])||null;
    v.k++;v.S=S;
    if(reduce){v.list.length=0;v.prev=null;v.at.room=S.room;v.at.t=S.t;return}   /* A12: no effects at all */
    if(R!==v.R){v.R=R;v.sol=R?solidOf(R):null}
    /* a new room, an S.t that does not follow (warp, restore(), Undo) or a respawn ('rez': new enemies) clears everything */
    if(S.room!==v.at.room||S.t!==v.at.t+1||ev.includes('rez'))clear();
    v.at.room=S.room;v.at.t=S.t;
    const run=!(frozen??S.hit>0);   /* hit-stop holds them, as fx.js */
    let j=0;
    for(const e of v.list){
      if(run&&!e.dead){try{e.fx.update(DT);if(e.fx.done())e.dead=1}catch(_){e.dead=1;v.err++}}
      if(!e.dead)v.list[j++]=e;
    }
    v.list.length=j;
    if(!R){v.err++;return}   /* no room: createVfx needs rooms (or step R); show it in vfx.err rather than do nothing silently */
    /* after a clear the current state is the baseline: nothing that was already on fires */
    if(!v.prev){v.prev=snap(S);ambient(S,R);return}
    triggers(S,R,ev);
    v.prev=snap(S);
  }
  function clear(){v.list.length=0;v.prev=null;v.rk=-1}

  /* ---------- drawing ---------- */
  /* an effect drawn alone into the scratch frame, then merged: remap swaps exact colours, clip drops the back layer's rows
     above clip.top (room px) and Bayer-fades the next clip.fade rows; the scratch is left zeroed */
  function merge(e,dst,nl,layer,ox,oy){
    const m=e.remap,c=layer==='back'?e.clip:null;
    for(let y=0,i=0;y<VH;y++){
      const wy=y+oy,keep=!c||wy>=c.top+c.fade?1:wy<c.top?0:(wy-c.top)/c.fade;
      for(let x=0;x<VW;x++,i++){
        const a=sc[i],b=sl[i];
        if(a){sc[i]=0;if(keep>=1||keep>bay(x+ox,wy))dst[i]=m?(m.get(a)??a):a}
        if(b){sl[i]=0;if(!nl&&keep>0)light[i]=addc(light[i],b)}
      }
    }
  }
  function draw1(e,ox,oy){
    const nl=!!e.u.noLight,lit=e.u.slot==='lit';
    for(const layer of LAYERS){
      const s=lit?SL.lit:SL[layer],iso=e.remap||(e.clip&&layer==='back');s.on=1;
      try{e.fx.draw(iso?SCR:nl?FJ[s.k]:FL[s.k],layer)}catch(_){e.dead=1;v.err++;if(iso){sc.fill(0);sl.fill(0)}return}
      if(iso)merge(e,s.color,nl,layer,ox,oy);
    }
  }
  /* ambient that must stay out of the rock: its pixels over solid tiles go (drawn first, so later one-shots keep theirs) */
  function mask(s,ox,oy){
    const R=v.R,c=s.color,so=v.sol;
    for(let y=0,i=0;y<VH;y++,i+=VW){const ty=Math.floor((y+oy)/T);if(ty<0||ty>=R.h)continue;const row=ty*R.w;
      for(let x=0;x<VW;x++){if(!c[i+x])continue;const tx=Math.floor((x+ox)/T);if(tx>=0&&tx<R.w&&so[row+tx])c[i+x]=0}}
  }
  /* every live effect's back and front layer into the frames, once per step and camera (light, drawLit, drawBack and
     drawFront all ask; the first one draws) */
  function render(ox,oy){
    if(v.rk===v.k&&v.rx===ox&&v.ry===oy)return;
    const t0=now&&now();
    v.rk=v.k;v.rx=ox;v.ry=oy;
    for(const k in SL)if(SL[k].on){SL[k].color.fill(0);SL[k].on=0}
    light.fill(0);
    for(const f of FRAMES){f.ox=ox;f.oy=oy}
    let m=0;
    for(const e of v.list)if(e.u.mask&&!e.dead){draw1(e,ox,oy);m=1}
    if(m&&v.sol)for(const k in SL)if(SL[k].on)mask(SL[k],ox,oy);
    for(const e of v.list)if(!e.u.mask&&!e.dead)draw1(e,ox,oy);
    if(now){cost.ms[cost.i%cost.ms.length]=now()-t0;cost.i++}
  }
  /* the live effects' light luminance into the renderer's L (VW*VH), before lightPass; only ever adds, never below 0 */
  function addLightTo(L,ox,oy){
    if(!v.list.length)return;render(ox,oy);
    const g=LIGHT_GAIN/765;
    for(let i=0;i<N;i++){const l=light[i];if(l)L[i]+=((l&255)+((l>>>8)&255)+((l>>>16)&255))*g}
  }
  const blit=(ctx,s)=>{if(!s.on||!s.cx||!ctx)return;s.cx.putImageData(s.img,0,0);ctx.drawImage(s.cv,0,0)};
  const drawer=k=>(ctx,ox,oy)=>{if(!v.list.length)return;render(ox,oy);blit(ctx,SL[k])};

  /* dev and manual use: a use from map.js (or an effect name) at room px x, y; opts are upstream options in world units,
     actor:true gives it the mascot. Ambient names default to the room's area. Returns {stop(), done()} or null. */
  function spawn(name,x,y,opts={}){
    if(reduce)return null;
    const u=USE[name]||(FX[name]&&{fx:name}),o={...opts};if(!u)return null;
    if(o.actor===true)o.actor=v.S?actor():undefined;
    if(x!=null)o.x=x*2;if(y!=null)o.y=y*2;
    if(u.ambient&&!o.area&&v.R){const R=v.R;o.area={x:0,y:0,w:R.w*T*2,h:R.h*T*2};if(u.ground==='floor'&&!o.ground)o.ground=floorFn(R)}
    return add(name,o,(v.R&&v.R.biome)||'any');
  }

  return {step,clear,spawn,render,actor,hooks,cost,
    light:addLightTo,drawLit:drawer('lit'),drawBack:drawer('back'),drawFront:drawer('front'),
    live:()=>v.list.length,
    names:()=>v.list.map(e=>e.name),   /* for tests and the dev panel */
    frames:{lit:SL.lit.color,back:SL.back.color,front:SL.front.color,light},
    get err(){return v.err},get n(){return v.n}};
}
