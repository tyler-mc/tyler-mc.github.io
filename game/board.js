/* The air-surf board (item 'board'; Shift, X or K, or the band's board button). A short fixed dash on the ground or in the air,
   one per landing, buffered like the jump. The board stays out under him until he lands; landing on a liquid on it makes
   a wave and he surfs: holding the way he goes keeps a steady speed for as long as the liquid lasts, and a jump off keeps
   that speed in the air until he lands or lets go. Liquid-agnostic (game/liquid.js). Player fields, all plain numbers:
   dc dash charge, dt dash frames left, dd dash direction, db dash buffer, bo board out, surf, mo speed kept in the air. */
import {T} from './state.js';
import {move} from './engine.js';
import {surfAt,disturb,flowAt,isLiq} from './liquid.js';

/* dash: frames x px per frame (54 px, three of his widths). surf: steady speed, its pick-up and coast-down per frame,
   the speed under which a coasting board sinks, how much of a current it rides */
export const DASH={n:10,v:5.4},SURF={v:2.8,acc:.2,dec:.035,min:.9,flow:.5},DBUF=6;
const PW=18,PH=24,JV=4.6;   /* player.js's PW, PH, JV (a cycle-free copy) */
const appr=(v,t,a)=>v<t?Math.min(t,v+a):Math.max(t,v-a);
export const wetC=(R,p)=>{const r=R.g[Math.floor((p.y+PH/2)/T)];return !!r&&isLiq(r[Math.floor((p.x+PW/2)/T)])};
/* the liquid under his feet: its line between 2 px above them and 10 below (player.js landing() reads both) */
export const under=(S,p)=>surfAt(S.liq,p.x+PW/2,p.y+PH-10,p.y+PH+2);

/* the speed off a dash or a surf, kept while he holds that way in the air (stepPlayer calls it after the run block) */
export function carry(p,dir){if(p.ground||dir!==Math.sign(p.mo)){p.mo=0;return}if(Math.abs(p.vx)<Math.abs(p.mo))p.vx=p.mo}

function surfStart(S,p,ev){
  const v=Math.abs(p.vx)>.5?Math.sign(p.vx)*Math.max(Math.abs(p.vx),SURF.v*.8):0;
  p.surf=1;p.vx=Math.min(SURF.v*1.2,Math.max(-SURF.v*1.2,v));p.vy=0;p.dc=1;p.mo=0;p.jc=0;
  disturb(S.liq,p.x+PW/2,p.y+PH,2.6,14);S.cam.sh=Math.max(S.cam.sh,1);ev.push('surf');
  /* a jump pressed just before the board met the liquid (player.js landing() counts it as ground, so the press was
     buffered, not spent on the root), or during the dash onto it: he jumps off as it lands */
  if(p.buf>0){p.buf=0;p.surf=0;p.vy=-JV;p.jc=1;p.mo=p.vx;ev.push('jump');disturb(S.liq,p.x+PW/2,p.y+PH,2,12)}
}

/* the pickup demo (engine.js touch() sets p.bd=1, step() feeds this in place of his input): a beat while the board slides
   out under him (floodart.js boardUnder), then one dash the way he faces, then control back once he is down. Input
   during it is ignored. If the dash cannot fire (in water) it gives up after `wait` frames, nothing buffered.
   p.bd: 1..beat-1 the beat, beat.. waiting to fire, go.. after it fired. Plain numbers, so saves and restore() hold it;
   respawn clears it and a reload never has it (the save keeps items, not the player). */
export const BDEMO={beat:24,wait:60,end:40,go:1000};
export function boardDemo(p){
  const i={l:0,r:0,u:0,d:0,j:0,jp:0,b:0,bp:0,drag:null,any:0},k=++p.bd;
  if(k<BDEMO.go){
    if(k<BDEMO.beat)return i;
    if(p.dt>0)p.bd=BDEMO.go;   /* it fired last frame */
    else if(k>BDEMO.beat+BDEMO.wait){p.bd=0;p.db=0}
    else if(p.ground)i.b=i.bp=1;   /* no l/r: the dash goes the way he faces */
  }else if(!p.dt&&(p.ground||k>BDEMO.go+BDEMO.end))p.bd=0;
  return i;
}

/* runs first in stepPlayer; true when the dash or the surf has moved him this frame */
export function board(S,R,inp,ev,boxes){
  const p=S.p;
  if(!S.items.board){p.bo=p.surf=p.dt=p.mo=p.db=0;return false}   /* db: a press in hit-stop (engine.js) must not wait for the board */
  if(p.ground){p.dc=1;p.bo=0;p.mo=0}
  const dir=(inp.r?1:0)-(inp.l?1:0);
  if(inp.bp)p.db=DBUF;
  if(p.db>0&&p.dc&&!p.dt&&!wetC(R,p)){
    p.dc=0;p.db=0;p.dt=DASH.n;p.dd=dir||p.face;p.face=p.dd;p.bo=1;p.surf=0;p.mo=0;p.vy=0;p.jc=0;p.ground=0;p.coy=0;p.on=-1;ev.push('dash');
  }else if(p.db>0&&!inp.bp)p.db--;   /* pressed early, it waits DBUF frames for a landing */
  if(p.dt>0){   /* the dash: a straight line, no gravity, cut short by a wall */
    if(inp.jp)p.buf=6;
    p.dt--;const m=move(S,R,p,p.dd*DASH.v,0,boxes);p.vx=p.dd*DASH.v;p.walk=0;
    const w=under(S,p);if(w)disturb(S.liq,p.x+PW/2-p.dd*10,w.top,.6,8);
    if(m.hx)p.dt=0;
    if(!p.dt){p.vx=p.dd*1.6;if(w)surfStart(S,p,ev)}
    return true;
  }
  if(!p.surf){
    if(p.bo&&!p.ground&&p.vy>=0){const w=under(S,p);if(w&&!wetC(R,p)){p.y=w.top-PH;surfStart(S,p,ev)}}
    if(!p.surf)return false;
  }
  /* surfing: feet on the line, riding its waves a little */
  const w=surfAt(S.liq,p.x+PW/2,p.y+PH-12,p.y+PH+12);
  if(!w){p.surf=0;p.mo=p.vx;return false}   /* the liquid ran out under him: on with the speed */
  const fl=flowAt(S.liq,R,p.x+PW/2,w.top+2);
  if(inp.jp){p.surf=0;p.vy=-JV;p.jc=1;p.mo=p.vx;p.ground=0;ev.push('jump');disturb(S.liq,p.x+PW/2,w.top,2,12);move(S,R,p,p.vx,p.vy,boxes);return true}
  if(dir)p.vx=appr(p.vx,dir*SURF.v+fl*SURF.flow,SURF.acc);
  else{p.vx=appr(p.vx,fl,SURF.dec);if(Math.abs(p.vx)<SURF.min){p.surf=0;p.bo=0;return false}}   /* let go: it coasts, then sinks */
  if(p.vx)p.face=Math.sign(p.vx);
  const ty=w.top+Math.max(-3,Math.min(3,w.s.h[w.i]*.6))-PH;
  move(S,R,p,0,ty-p.y,boxes);
  let m=move(S,R,p,p.vx,0,boxes);
  if(m.hx){const y0=p.y;move(S,R,p,0,-5,boxes);m=move(S,R,p,p.vx,0,boxes);if(m.hx)p.y=y0}   /* a wave under him: step up onto a flush bank */
  if(m.hx){p.surf=0;p.bo=0;p.vx=0}
  else disturb(S.liq,p.x+PW/2-Math.sign(p.vx)*9,w.top,.12*Math.abs(p.vx),8);   /* the wake */
  p.vy=0;p.ground=0;p.coy=0;p.walk=0;
  return true;
}
