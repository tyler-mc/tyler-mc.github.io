/* Renderer-side feel state: the body pulse and dust puffs (character-feel-plan.md Stage 2, A1-A6, A12).
   Lives OUTSIDE S. render.js keeps one fx object, calls stepFx(fx, ev, opts) once per world step() from rend.step,
   and reads radii(fx, FR[frame]) and fx.puffs when it draws. Nothing here reads or writes S; opts is read only.
   fx is plain JSON-safe data: {sx, sy, px, py, k, n, sk, so, sv, puffs[]}.
     sx, sy  current body scale (1 = rest)
     px, py  peak scale of the current pulse; the pulse runs back to 1 linearly over REC frames
     k       frames left in the pulse (sx = 1 + (px-1)*k/REC, so k = 0 is exactly 1)
     n       counter for the seeded hash that jitters the puffs (no Math.random, so runs repeat)
     sk      frames into the current skid (0 = none); the skid frame shows while sk > 0 (Stage 4, A7)
     so, sv  the sprout's lag behind his speed, px, and its spring speed (A11); sprout(fx) gives whole px
     puffs   {x, y, vx, vy, w, t, life}: world px, px per frame, width 2-3 px, age, lifetime 12-20 frames
   Events are the engine's strings: 'jump' (ground jump), 'root' (mid-air root jump), 'land', 'skid', 'rez'. */

export const REC=12;                       /* A1: pulse recovery frames */
export const JUMP=[0.91,1.18];             /* A2: stretch (rx 10, ry 13 on the 11x11 body) */
export const LAND=[1.27,0.73];             /* A3: full squash (rx 14, ry 8) */
export const LIM={rx:[10,14],ry:[8,13]};   /* A4: face limits; oy = 11 - ry keeps the feet on row 42 */
export const SKID_MIN=4,SKID_MAX=30;       /* A7: the skid frame holds at least 4 frames, a puff every 2 */
export const LAG={max:2,k:.25,damp:.78,gain:1.25};   /* A11: sprout lag up to 2 px behind vx*gain, a damped spring */
const MAXF0=4.6,DRAG=0.82;

export function createFx(){return {sx:1,sy:1,px:1,py:1,k:0,n:0,sk:0,so:0,sv:0,puffs:[]}}

/* rez, room change, restore(): drop the pulse, the skid, the sprout lag and the dust. n keeps counting so later puffs still vary. */
export function clearFx(fx){fx.sx=1;fx.sy=1;fx.px=1;fx.py=1;fx.k=0;fx.sk=0;fx.so=0;fx.sv=0;fx.puffs.length=0;return fx}

/* small integer hash (lowbias32) of the counter, 0..2^32-1 */
function hash(fx){let h=(fx.n++ +1)>>>0;h^=h>>>16;h=Math.imul(h,0x7feb352d)>>>0;h^=h>>>15;h=Math.imul(h,0x846ca68b)>>>0;h^=h>>>16;return h>>>0}

function pulse(fx,x,y){fx.px=x;fx.py=y;fx.k=REC;fx.sx=x;fx.sy=y}

/* count puffs at the feet. side: puffs alternate left and right, drifting out and up, then slow (A6); a skid's go one way */
function dust(fx,count,x,y,spread,side){
  for(let i=0;i<count;i++){
    const h=hash(fx),s=side||(i&1?1:-1);
    const ox=(h&7)/7,vx=(0.25+((h>>>3)&7)/7*0.45)*spread,vy=-(0.15+((h>>>6)&7)/7*0.35);
    fx.puffs.push({x:x+s*(2+ox*6),y:y-((h>>>9)&1),vx:s*vx,vy,w:2+((h>>>10)&1),t:0,life:12+((h>>>11)%9)});
  }
}

const name=e=>typeof e==='string'?e:e&&(e.name||e.type)||'';

/* opts: {hit, reduce, lv, MAXF, feetX, feetY, ground, skid, vx}. lv = landing speed (p.lv); missing lv counts as MAXF.
   skid: he still slides against his facing on the ground; vx: his speed, which the sprout trails. */
export function stepFx(fx,ev,opts={}){
  if(opts.reduce){clearFx(fx);return fx}   /* A12: no pulse, no dust, also when reduce turns on mid-pulse */
  if(!opts.hit){
    /* advance first, so an event on this frame shows at full strength */
    if(fx.k>0){fx.k--;fx.sx=fx.k?1+(fx.px-1)*fx.k/REC:1;fx.sy=fx.k?1+(fx.py-1)*fx.k/REC:1}
    let j=0;
    for(const p of fx.puffs){p.t++;p.x+=p.vx;p.y+=p.vy;p.vx*=DRAG;p.vy*=DRAG;if(p.t<p.life)fx.puffs[j++]=p}
    fx.puffs.length=j;
    if(fx.sk)fx.sk=opts.ground&&(opts.skid||fx.sk<SKID_MIN)&&fx.sk<SKID_MAX?fx.sk+1:0;
    if(fx.sk&1)dust(fx,1,+opts.feetX||0,+opts.feetY||0,.5,Math.sign(opts.vx)||1);
    const t=0-Math.max(-LAG.max,Math.min(LAG.max,(+opts.vx||0)*LAG.gain));   /* 0-: never -0, so a JSON copy deep-equals */
    fx.sv=(fx.sv+(t-fx.so)*LAG.k)*LAG.damp;fx.so+=fx.sv;if(Math.abs(fx.so-t)<.01&&Math.abs(fx.sv)<.01){fx.so=t;fx.sv=0}
  }
  const M=opts.MAXF>0?opts.MAXF:MAXF0,x=+opts.feetX||0,y=+opts.feetY||0;
  for(const e of ev||[]){
    const n=name(e);
    if(n==='rez')clearFx(fx);
    else if(n==='jump'){pulse(fx,JUMP[0],JUMP[1]);dust(fx,4,x,y,0.6)}
    else if(n==='root')pulse(fx,JUMP[0],JUMP[1]);   /* mid-air: stretch, no ground for dust */
    else if(n==='skid'){fx.sk=1;dust(fx,1,x,y,.5,Math.sign(opts.vx)||1)}
    else if(n==='land'){
      const lv=Number.isFinite(opts.lv)?opts.lv:M,u=Math.max(0,Math.min(1,(lv-1)/(M-1)));   /* A3: vy 1..MAXF -> 0..full */
      pulse(fx,1+(LAND[0]-1)*u,1+(LAND[1]-1)*u);
      dust(fx,lv>=M*0.5?8:3,x,y,1);
    }
  }
  return fx;
}

/* the sprout's lag in whole px, -2..2 (0 at rest) */
export function sprout(fx){const o=Math.round(fx.so);return o<-LAG.max?-LAG.max:o>LAG.max?LAG.max:o|0}

/* whole-pixel body radii for drawBuddy, shoes() and strands(). base is an FR frame [rx, ry, oy] or {rx, ry}. */
export function radii(fx,base){
  const b0=Array.isArray(base)?base[0]:base&&base.rx,b1=Array.isArray(base)?base[1]:base&&base.ry;
  const cl=(v,[a,b])=>v<a?a:v>b?b:v;
  const rx=cl(Math.round((b0||11)*fx.sx),LIM.rx),ry=cl(Math.round((b1||11)*fx.sy),LIM.ry);
  return {rx,ry,oy:11-ry};
}
