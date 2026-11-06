/* Flood creatures: puzzle pieces first. Both are soft (touching them never glitches him out, and roots slide off them).
   Hermit crab ('H'): walks its floor and pinches him back. A board ram pulls it into its shell for SHELL frames: the shell
   is a solid, pushable block (a step, or a weight on a plate), then the crab climbs back out. Ent tease:1 (optional): the
   first time he lands within CRAB.tease px of it, before he owns the board, it pulls into its shell once on its own for
   the usual SHELL frames, so he sees it turn into a block. That shell is solid but neither pushable nor a plate weight
   (no gate without the board); it never teases again that visit (re-entering the room re-arms it).
   Clownfish (ent fish:1 on a water tile): swims its pool; bumping it knocks him back harmlessly, and each knock puffs it up
   and darkens it. The third knock turns it into a lantern piranha: a tell, a short chase, then one chomp (that one glitches
   him out); hit or miss, it then turns back into a clownfish. A ram sends a clownfish away (no knock) but cannot move the
   piranha. Knocks reset when the room is re-entered (enemies respawn). Plain numbers only; no randomness. No DOM. */
import {T} from './state.js';
import {move,ov} from './engine.js';
import {isLiq,surfAt} from './liquid.js';
import {FEEL} from './player.js';

/* crab: shell frames, the last of them a wobble, push speed, walk speed, a tease's reach (centre to centre). fish: swim speed, knocks to turn, piranha tell,
   chase and lunge frames, chase speed, lunge speed, the reach that starts a lunge, and the rest after it */
export const CRAB={shell:300,wob:60,push:1,sp:.35,tease:120},FISH={sp:.45,knocks:3,tell:40,chase:150,lunge:16,cv:1.15,lv:3.4,reach:24,rest:60};
const hard=c=>c===null||c==='#'||c==='='||c==='G';
const at=(R,x,y)=>{const r=R.g[Math.floor(y/T)];return r?r[Math.floor(x/T)]??null:null};
const wetPt=(R,x,y)=>isLiq(at(R,x,y));

export function spawnFlood(R,s){
  if(s.k==='H')return {k:'crab',soft:1,x:s.tx*T-1,y:(s.ty+1)*T-10,w:14,h:10,dir:s.dir||-1,sp:CRAB.sp*(s.pace>0?s.pace/100:1),
    fence:[s.left??-1e3,s.right??1e3],vx:0,vy:0,wrap:0,grace:0,pass:0,dx:0,dy:0,cd:0,
    tz:s.tease?1:0,pg:1};   /* tz: the tease, 0 none or done, 1 waiting, 2 in its shell; pg: he was on the ground last step */
  return {k:'fish',soft:1,x:s.tx*T,y:s.ty*T+1,w:12,h:10,hy:s.ty*T+1,dir:s.dir||1,ph:s.tx*.7,
    fence:[s.left??-1e3,s.right??1e3],n:0,m:0,t:0,lx:0,ly:0,pv:0,wrap:0,grace:0,pass:0,dx:0,dy:0,cd:0};
}

/* the crab: walk, turn at walls, drops, water and its fence; as a shell, slide and fall, then wobble back out */
function crab(S,R,e,ev){
  if(e.cd>0)e.cd--;
  if(e.wrap>0){
    if(--e.wrap===0){e.grace=24;if(e.tz===2)e.tz=0;ev.push('emerge')}
    e.vx=Math.abs(e.vx)<.05?0:e.vx*.86;
    if(e.vx){const m=move(S,R,e,e.vx,0,shells(S,e));if(m.hx)e.vx=0}
    e.vy=Math.min(wetPt(R,e.x+e.w/2,e.y+e.h/2)?1:3,e.vy+.25);if(move(S,R,e,0,e.vy,shells(S,e)).hy)e.vy=0;
    if(ov(e,S.p)&&S.p.on<0)e.pass=1;
    return;
  }
  if(e.grace>0){e.grace--;return}
  const fx=e.dir>0?e.x+e.w+1:e.x-1,ftx=Math.floor(fx/T);
  if(hard(at(R,fx,e.y+e.h-2))||!hard(at(R,fx,e.y+e.h+2))||isLiq(at(R,fx,e.y+e.h-2))||out(e,ftx))e.dir=-e.dir;
  else e.x+=e.dir*e.sp;
  e.vy=Math.min(3,e.vy+.25);if(move(S,R,e,0,e.vy,[]).hy)e.vy=0;
}
/* heading further out of its fence (pushed or shoved outside it, it walks back in rather than turning on the spot) */
const out=(e,tx)=>(e.dir<0&&tx<e.fence[0])||(e.dir>0&&tx>e.fence[1]);
const shells=(S,me)=>S.ens.filter(o=>o!==me&&o.k==='crab'&&o.wrap>0);

/* the fish: inside its water only (a lunge may break the surface) */
function inWater(R,e,x,y){return wetPt(R,x+2,y+2)&&wetPt(R,x+e.w-2,y+2)&&wetPt(R,x+2,y+e.h-2)&&wetPt(R,x+e.w-2,y+e.h-2)}
function swimTo(R,e,dx,dy){if(dx&&inWater(R,e,e.x+dx,e.y))e.x+=dx;else if(dx)return 1;if(dy&&inWater(R,e,e.x,e.y+dy))e.y+=dy;return 0}
function fish(S,R,e,ev){
  if(e.cd>0)e.cd--;
  const p=S.p,px=p.x+9,py=p.y+12,cx=e.x+6,cy=e.y+5;
  if(e.m===0){   /* a clownfish: back and forth, a gentle bob, a ram's shove dying away */
    e.ph+=.05;
    if(e.pv){if(swimTo(R,e,e.pv,0))e.pv=0;e.pv=Math.abs(e.pv)<.05?0:e.pv*.92}
    const tx=Math.floor((e.dir>0?e.x+e.w+2:e.x-2)/T);
    if(swimTo(R,e,e.dir*FISH.sp,0)||out(e,tx))e.dir=-e.dir;
    const ty=e.hy+Math.sin(e.ph)*3;swimTo(R,e,0,Math.max(-.4,Math.min(.4,ty-e.y)));
  }else if(e.m===1){if(--e.t<=0){e.m=2;e.t=FISH.chase;ev.push('hunt')}}   /* the tell: it swells and turns where it is */
  else if(e.m===2){   /* the chase: straight at him through its water */
    const dx=px-cx,dy=py-cy,d=Math.hypot(dx,dy)||1;e.dir=dx<0?-1:1;
    swimTo(R,e,dx/d*FISH.cv,dy/d*FISH.cv);
    if(d<FISH.reach||--e.t<=0){e.m=3;e.t=FISH.lunge;e.lx=dx/d*FISH.lv;e.ly=dy/d*FISH.lv;ev.push('lunge')}
  }else if(e.m===3){   /* the chomp: one lunge; then, hit or miss, a clownfish again */
    const nx=e.x+e.lx,ny=e.y+e.ly;if(!hard(at(R,nx+e.w/2,ny+e.h/2))&&wetPt(R,nx+e.w/2,ny+e.h/2+8)){e.x=nx;e.y=ny}else e.t=1;   /* it can break the surface, never leave the pool */
    if(--e.t<=0){e.m=0;e.n=0;e.cd=FISH.rest;e.lx=e.ly=0;ev.push('calm')}
  }
  if(e.m===0&&!inWater(R,e,e.x,e.y)){const g=surfAt(S.liq,cx,e.y-T*2,e.y+T*2);if(g)e.y=Math.min(e.y+2,Math.max(e.y,g.top+2))}   /* back under after a lunge */
}

export function stepFlood(S,R,e,ev){(e.k==='crab'?crab:fish)(S,R,e,ev)}

/* after he moves: the board ram (a dash, or a fast surf skimming over it), the crab's pinch, a fish's knock or chomp, and
   pushing a shell. Returns the index of a piranha whose chomp got him (the engine glitches him out), else -1 */
const RAM=2.2;
export function floodTouch(S,R,inp,ev){
  const p=S.p;if(p.dead)return -1;
  const dash=p.dt>0,skim=p.surf&&Math.abs(p.vx)>RAM,ram=dash?{x:p.x+(p.dd>0?4:-4),y:p.y,w:p.w,h:p.h}:skim?{x:p.x,y:p.y+4,w:p.w,h:p.h+4}:null;
  const hb={x:p.x+3,y:p.y+3,w:p.w-6,h:p.h-6},away=e=>p.x+9<e.x+e.w/2?-1:1;
  let hit=-1;
  S.ens.forEach((e,i)=>{
    if(!e.soft)return;
    if(e.k==='crab'){
      if(e.tz===1&&!e.wrap){const land=p.ground&&!e.pg;e.pg=p.ground?1:0;   /* the tease: his first landing near it, no board yet */
        if(land&&!S.items.board&&Math.hypot(p.x+9-e.x-e.w/2,p.y+12-e.y-e.h/2)<CRAB.tease){e.tz=2;e.wrap=CRAB.shell;e.vx=0;e.vy=0;e.cd=0;e.pass=ov(e,p)?1:0;ev.push('shell');return}}
      if(e.wrap>0||e.grace)return;
      if(ram&&ov(ram,e)){e.wrap=CRAB.shell;e.vx=(dash?p.dd:Math.sign(p.vx))*1.2;e.vy=0;e.cd=0;e.pass=ov(e,p)?1:0;S.hit=Math.round(FEEL.HIT);S.cam.sh=3;ev.push('shell');return}
      if(!e.cd&&ov(hb,e)){const a=away(e);p.vx=a*2.6;p.vy=Math.min(p.vy,-2);p.ground=0;p.coy=0;p.mo=0;e.cd=40;e.dir=-a;ev.push('pinch')}
      return;
    }
    if(e.m===3){if(!p.inv&&ov(hb,{x:e.x-3,y:e.y-3,w:e.w+6,h:e.h+6}))hit=i;return}
    if(e.m!==0||e.cd)return;
    if(ram&&ov(ram,e)){e.pv=(dash?p.dd:Math.sign(p.vx))*3;e.cd=30;ev.push('ram');return}
    if(ov(hb,e)){const a=away(e);p.vx=a*2.4;p.vy=Math.min(p.vy,-1.6);p.ground=0;p.mo=0;e.pv=-a*1.5;e.cd=45;e.n++;S.cam.sh=Math.max(S.cam.sh,1.5);
      if(e.n>=FISH.knocks){e.m=1;e.t=FISH.tell;e.pv=0;ev.push('turn')}else ev.push('knock')}
  });
  /* walking into a shell pushes it, and him with it (not a teasing one: that only shows the block) */
  const dir=(inp.r?1:0)-(inp.l?1:0);
  if(dir&&!p.dt&&!p.surf)for(const e of S.ens){
    if(e.k!=='crab'||e.wrap<=0||e.tz===2||p.y+p.h<=e.y+2||p.y>=e.y+e.h)continue;
    const gap=dir>0?e.x-(p.x+p.w):p.x-(e.x+e.w);if(gap<-1||gap>.6)continue;
    const x0=e.x;move(S,R,e,dir*CRAB.push,0,shells(S,e));const d=e.x-x0;if(d)move(S,R,p,d,0);
    e.pass=0;break;
  }
  return hit;
}
