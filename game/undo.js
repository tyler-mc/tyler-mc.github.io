/* Undo (item 'undo'; L or Z held, or the band's undo button). The beat sheet's section 3 is the contract.
   A ring buffer of the last UNDO.len live frames of room-local state, one entry per live frame (not while dead, in
   hit-stop, in the dark or rewinding). Holding the key pops UNDO.pop frames per step, so the world runs backward at double
   speed; it stops at the buffer's start. Each entry is one JSON string of exactly KEEP (nothing else is ever copied), so
   it lives in S.undo.buf as plain data: a snapshot/restore mid-rewind replays exactly, and a save never holds it
   (state.js persist() has no undo).
   Anchored (never rewound): items, pieces, placed, torches, latch, cp, seen, chase, echo, the meter, say, the camera.
   The meter is an integer q, 0..UNDO.full: a rewind step costs UNDO.drain (a full meter is 90 steps, 1.5 s of real time,
   3 s of history), a frame not rewinding gives 1 back (full again in 360 frames, 6 s), a torch fills it at once.
   S.undo: on 1 on a rewind frame; m the meter 0..1 (q/full, for the renderer); flash frames left of the empty-meter flash;
   ago frames since a rewind last ended (0 while rewinding, 1 on the first live frame after, capped at 999); lock 1 once a
   hold has ended (buffer start, empty meter, the sweep clamp) until the key is let go; demo/dp/dk the pickup demo.
   Events: 'undo_start' (a hold starts rewinding), 'undo_end' (it stopped), 'undo_empty' (the key with an empty meter).
   No DOM, no clock, no randomness. */
import {T,newUndo} from './state.js';
import {ROOMS,CHASES} from './rooms/index.js';
import {sweepClamp} from './sweep.js';

/* len: history frames kept (3 s); pop: frames per rewind step; full/drain: the meter; inv: frames he is safe after a
   rewind ends; flash: the empty ring's flash; above: px his box top must stay below a sweep's front */
export const UNDO={len:180,pop:2,full:360,drain:4,inv:20,flash:24,above:60};
/* the exact rewound subset (beat sheet section 3) */
export const KEEP=['p','ens','roots','vines','drilled','crack','gate','plate','cr'];
export {newUndo};
export const meterOf=S=>S.undo?S.undo.m:1;
const U0=S=>S.undo||(S.undo=newUndo());

/* one frame's entry: a single stringify of the subset */
export const frameOf=S=>JSON.stringify({p:S.p,ens:S.ens,roots:S.roots,vines:S.vines,drilled:S.drilled,crack:S.crack,gate:S.gate,plate:S.plate,cr:S.cr});
/* the buffer is room-local and life-local: engine enterRoom() and die() clear it */
export function undoClear(S){const U=U0(S);U.buf=[];U.on=0}
/* end of a live step: keep this frame (only while he owns Undo, so a search or an old test pays nothing) */
export function undoRecord(S){
  if(!S.items.undo||S.mode!=='play'||S.p.dead)return;
  const b=U0(S).buf;b.push(frameOf(S));if(b.length>UNDO.len+1)b.shift();   /* the current frame plus len of history */
}
/* put an entry back: the player in place (step() holds S.p), the rest replaced */
function apply(S,f){
  const p=S.p;for(const k of Object.keys(p))if(!(k in f.p))delete p[k];Object.assign(p,f.p);
  S.ens=f.ens;S.roots=f.roots;S.vines=f.vines;S.drilled=f.drilled;S.crack=f.crack??null;S.gate=f.gate;S.plate=f.plate;S.cr=f.cr||{};
  if(S.latch&&S.latch[S.room])S.gate=1;   /* a latched gate is anchored: a rewind never shuts it, not even for a frame */
  if(S.drillNow&&S.drillNow.length)S.drillNow=[];
}

/* the sweep clamp: A5's sweepClamp(S) (game/sweep.js; it imports only state.js and rooms/index.js, so no cycle). Called
   with S.p set to the candidate frame's player; true stops the rewind there, as if the buffer had ended. clampFallback is
   the same rule, kept for tests; undoReady stays for callers that awaited the old lazy load */
const ext=sweepClamp;
export const undoReady=Promise.resolve();
export const clampSource=()=>'sweep.js';
export function clampFallback(S){
  const c=S.chase,C=c&&c.on&&CHASES[c.id];if(!C||C.kind!=='sweep'||!Number.isFinite(c.y))return false;
  return ROOMS[S.room].at[1]*T+S.p.y<c.y+UNDO.above;
}
function blocked(S,fp){const c=S.chase;if(!c||!c.on)return false;const p0=S.p;S.p=fp;try{return !!(ext||clampFallback)(S)}finally{S.p=p0}}

/* one step of the key (engine step(), after hit-stop and death, before anything moves). True: this was a rewind frame
   (the caller then runs only the anchored things: the chase, the camera). False: a live frame */
export function undoStep(S,inp,ev){
  const U=U0(S),p=S.p;
  if(U.flash>0)U.flash--;
  if(!inp.z)U.lock=0;
  const can=S.items.undo&&S.mode==='play'&&!p.dead&&!p.demo&&!p.bd&&!S.slot;   /* not over the seed's or the board's demo, nor the door */
  if(can&&inp.z&&!U.lock){
    if(U.q<UNDO.drain){if(inp.zp||U.on){ev.push('undo_empty');U.flash=UNDO.flash}U.lock=1}
    else{
      const b=U.buf;let n=0,f=null;
      while(n<UNDO.pop&&b.length>1){const c=JSON.parse(b[b.length-2]);if(blocked(S,c.p)){U.lock=1;break}b.pop();f=c;n++}
      if(n){apply(S,f);U.q-=UNDO.drain;U.m=U.q/UNDO.full;if(!U.on){ev.push('undo_start');U.rf=0}U.rf+=n;U.on=1;U.ago=0;return true}
      U.lock=1;   /* at the buffer's start (or clamped): the hold is over till the key is let go */
    }
  }
  if(U.on){U.on=0;p.inv=Math.max(p.inv,Math.min(UNDO.inv,U.rf|0)+1);ev.push('undo_end')}   /* +1: step() counts inv down this same frame. Safe for no longer than the hold rewound (U.rf frames, up to inv): else a tap every 19 frames would be endless immunity (the meter refills 1 a frame, a tap costs 4) */
  if(U.q<UNDO.full)U.q++;
  U.m=U.q/UNDO.full;if(U.ago<999)U.ago++;
  return false;
}
/* a torch fills the meter at once (engine touch()) */
export function undoFill(S){const U=U0(S);U.q=UNDO.full;U.m=1}

/* the pickup demo (engine touch() sets S.undo.demo=1; step() feeds this in place of his input). No text: his input is held
   still while whatever is under him gives way (the shard steps' own timer, game/crystals.js); once he has dropped and
   landed, a beat, then the demo holds the key till the buffer's start (the pickup frame: the buffer starts empty when
   he picks it up), so the room runs back and he stands where he took it; a beat with the meter ring refilling, then
   control back. If nothing gives way within `wait` frames of standing it ends. dp: 0 waiting, 1 falling, 2 the beat, 3 rewinding,
   4 the beat after. Anchored in S.undo (a rewind must not rewind its own script). */
export const UDEMO={wait:60,fall:150,beat:20,hold:120,after:20};
export function undoDemo(S){
  const U=U0(S),p=S.p,k=++U.demo,i={l:0,r:0,u:0,d:0,j:0,jp:0,b:0,bp:0,z:0,zp:0,drag:null,any:0};
  if(U.dp===0){   /* dk: the frame he first stood (a pickup in mid-jump lands first; that landing is no collapse) */
    if(p.ground){if(!U.dk)U.dk=k;else if(k-U.dk>UDEMO.wait)undoDemoEnd(S)}
    else if(U.dk){U.dp=1;U.dk=k}else if(k>UDEMO.fall)undoDemoEnd(S)}
  else if(U.dp===1){if(p.ground){U.dp=2;U.dk=k}else if(k-U.dk>UDEMO.fall)undoDemoEnd(S)}
  else if(U.dp===2){if(k-U.dk>=UDEMO.beat){U.dp=3;U.dk=k;i.z=i.zp=1}}
  else if(U.dp===3){if((U.lock&&!U.on)||k-U.dk>UDEMO.hold){U.dp=4;U.dk=k}else i.z=1}
  else if(k-U.dk>=UDEMO.after)undoDemoEnd(S);
  return i;
}
export function undoDemoEnd(S){const U=U0(S);U.demo=0;U.dp=0;U.dk=0}
