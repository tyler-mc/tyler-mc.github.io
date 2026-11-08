/* The Echo (glyph Z, ent lag, default ECHO.lag): beat sheet section 4. Anchored: S.echo is never in the Undo buffer.
   S.echo = {on, log:[x,y,face, x,y,face, ...] (room px, one entry per live frame, never truncated), i (the entry it
   shows), lag, w (live frames since it woke), wrap (root-wrap frames left), gr (grace frames left after a wrap), h (extra
   harmless frames left, after a ram), rc (ram cooldown), pass, seams ([entry index] where a rewind joined the log), sj
   (live frames since it last crossed a seam: the one-frame jump, drawn as a flicker), ua (S.undo.ago last seen), sx/sy
   (his position on the first live frame in the room)}.
   Clock rule (exact): it advances only on live frames (crystalTouch, which the engine never runs on a rewind, hit-stop,
   death or intro frame), so during a rewind the log and i are frozen. Each live frame the log gains one entry and i gains
   1, so i === log.length/3 - lag until the first wrap or ram changes the offset: a root wrap freezes i (the log keeps
   growing) and a board ram moves i back ECHO.ram entries. After a rewind the log still holds the erased frames, so the
   Echo replays them, then jumps to his new path at the seam.
   It wakes when he first moves in the room, at the position he started from, and replays his path lag frames late
   (until then it waits at that start). It hurts on touch, is never solid (it goes through gates) except as a root-wrapped
   step, holds plates (echoHolds), rides platforms (it replays world positions). Harmless: its first ECHO.wake frames,
   ECHO.after frames after a rewind ends (S.undo.ago, game/undo.js), while wrapped and its grace, and ECHO.rh frames after
   a ram. Off in a chase: it never wakes while one runs. The engine's enterRoom resets S.echo (room change, death and
   respawn, warp, restore), so it sleeps again. Plain numbers; no randomness; no DOM. */
import {ov} from './engine.js';
import {FEEL} from './player.js';

/* lag: default frames late; wake/after: harmless frames after waking and after a rewind; wrap: frames a root wrap holds it
   (the engine's WRAP, 4 s); grace: harmless frames after; ram: log frames a ram pushes it back; rh: harmless frames
   after a ram; rc: frames before it can be rammed again (longer than a dash) */
export const ECHO={lag:120,wake:20,after:45,wrap:240,grace:30,ram:30,rh:20,rc:30};
const PW=18,PH=24;   /* player.js PW, PH (a cycle-free copy) */
const ins=(b,i)=>({x:b.x+i,y:b.y+i,w:b.w-2*i,h:b.h-2*i});

const E0=S=>S.echo||(S.echo={on:0,log:[],i:0});
const count=E=>(E.log.length/3)|0;
/* where it is now: {x,y,face} or null while asleep */
export function echoPos(S){
  const E=S.echo;if(!E||!E.on||!E.log.length)return null;
  const k=Math.max(0,Math.min(count(E)-1,Math.floor(E.i)));
  return {x:E.log[k*3],y:E.log[k*3+1],face:E.log[k*3+2]};
}
export function echoBox(S){const q=echoPos(S);return q&&{x:q.x,y:q.y,w:PW,h:PH}}
const sinceRewind=S=>S.undo&&Number.isFinite(S.undo.ago)?S.undo.ago:Infinity;
/* frames it stays harmless from now (0: it hurts). Render reads this for its look */
export function echoHarmless(S){
  const E=S.echo;if(!E||!E.on)return 0;
  const a=sinceRewind(S),w=Math.min(ECHO.after,2*((S.undo&&S.undo.rf)|0)),r=E.ua!==undefined&&a<=w?w-a+1:0;   /* a short tap buys a short grace, not 45 frames (see undoStep's p.inv) */
  return Math.max(r,ECHO.wake-E.w+1,E.wrap>0?E.wrap+E.gr:0,E.gr||0,E.h||0,0);
}
/* a plate rect held by it (engine touch(); a wrapped Echo too: its body is the weight) */
export const echoHolds=(S,r)=>{const b=echoBox(S);return !!b&&ov(b,r)};

/* one live frame (crystals.js crystalTouch, after his move). ram: his ram box this frame or null */
export function stepEcho(S,R,ev,ram){
  if(!R.echo)return;
  const E=E0(S),p=S.p;
  if(!E.on){
    if(S.chase&&S.chase.on)return;
    let now=0;if(E.sx===undefined){E.sx=p.x;E.sy=p.y;E.sf=p.face;if(!p.vx&&!p.vy)return;now=1}   /* moving on his first frame here: that frame is his start */
    else if(p.x===E.sx&&p.y===E.sy)return;
    /* the log starts with his last still frame (the start), unless he was moving from his first frame here */
    Object.assign(E,{on:1,lag:R.echo.lag>0?R.echo.lag:ECHO.lag,log:now?[]:[E.sx,E.sy,E.sf],w:0,wrap:0,gr:0,h:0,rc:0,pass:0,seams:[],sj:999,ua:sinceRewind(S)});
    E.i=count(E)-E.lag;ev.push('echo_wake');
  }
  /* a rewind ended since the last live frame: the seam is where the log goes on */
  const a=sinceRewind(S);if(E.ua!==undefined&&a<E.ua)E.seams.push(count(E));E.ua=a;
  E.log.push(Math.round(p.x*100)/100,Math.round(p.y*100)/100,p.face);
  const i0=E.i;
  if(E.wrap>0){if(--E.wrap===0)E.gr=ECHO.grace}else E.i++;
  if(!(E.wrap>0)&&E.gr>0)E.gr--;
  if(E.h>0)E.h--;if(E.rc>0)E.rc--;E.w++;
  if(E.seams.some(s=>i0<s&&E.i>=s)){E.sj=0;E.seams=E.seams.filter(s=>E.i<s)}else E.sj=Math.min(999,E.sj+1);
  const b=echoBox(S);if(!b)return;
  if(E.pass&&!ov(b,p))E.pass=0;
  /* the root burst (the engine's burst() box, its first 10 frames) wraps it: replay paused, a solid step */
  if(!(E.wrap>0))for(const r of S.roots||[]){if(r.t>10||r.ec)continue;const hw=8+r.t*.9;
    if(ov({x:r.x-hw,y:r.y-4,w:hw*2,h:6+r.t*3},b)){r.ec=1;E.wrap=ECHO.wrap;E.gr=0;E.pass=ov(b,p)?1:0;S.hit=Math.round(FEEL.HIT);S.cam.sh=3;ev.push('stun','echo_wrap');break}}
  /* a board ram pushes it back along its log */
  if(ram&&!(E.wrap>0)&&!E.rc&&ov(ram,b)){E.i-=ECHO.ram;E.rc=ECHO.rc;E.h=Math.max(E.h,ECHO.rh);S.hit=Math.round(FEEL.HIT);S.cam.sh=3;ev.push('echo_ram')}
}
/* after its step: does it hurt him this frame */
export function echoTouch(S){
  const E=S.echo,p=S.p;if(!E||!E.on||p.inv||p.dead||echoHarmless(S)>0)return false;
  const b=echoBox(S);return !!b&&ov(ins(p,3),ins(b,3));
}
