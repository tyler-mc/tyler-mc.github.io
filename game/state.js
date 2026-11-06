/* World state: one plain, JSON-safe object. Everything that changes lives here (no class instances, no hidden
   module state), so snapshot() serves both save/resume and the later Undo ring buffer. */
export const T=12,VW=288,VH=216,VER=3,SAVE_KEY='tos_game',MUTE_KEY='tos_game_mute',ASSIST_KEY='tos_assist';
/* door pieces, in quarter order (index into S.pieces / S.placed): 0 roots NW, 1 flood NE, 2 molten SE, 3 crystals SW */
export const PIECES=['roots','flood','molten','crystals'];
/* the door ritual (engine door(), render): zone: px either side of the disc's centre where a press sets a carried
   fragment; dwell: frames standing still there that set it too (phones); fly: frames from his hands to the slot;
   pulse: the slot's hum and glow after; open: the door's opening once all four are in, then onDone */
export const DOOR={zone:26,dwell:45,fly:36,pulse:90,open:150};
/* the stuck hint: frames without progress before he looks toward what's next, and between his little bobs */
export const STUCK=3*60*60,BOB=20*60;

export const newPlayer=(x=0,y=0)=>({x,y,w:18,h:24,vx:0,vy:0,face:1,ground:0,coy:0,buf:0,root:0,jc:0,on:-1,
  carry:0,dead:0,rez:0,inv:0,gl:0,mac:0,hide:0,land:0,walk:0,demo:0,jq:0});

export const newState=()=>({v:VER,mode:'intro',t:0,room:'hub',lit:0,litT:0,match:0,idle:0,
  items:{root:0},pieces:[0,0,0,0],torches:{},cp:null,latch:{},
  /* placed: fragments set into the door (same order as pieces); door: 1 once all four are in; seen: rooms entered.
     chase: null or {id,on,x (wall front, world px),t,w (withering frames once outrun)}; slot: the fragment flying in.
     assist: the visitor's Assist preference (slower chases, wider checkpoints), set by the host, never saved.
     stuck: frames without progress (the stuck hint), hint: where he looks then (world px) */
  placed:[0,0,0,0],door:0,doorT:0,seen:{},chase:null,slot:null,dwell:0,assist:0,stuck:0,hint:null,
  p:newPlayer(VW/2-9,VH/2-12),ens:[],roots:[],gate:0,plate:0,hit:0,flash:-1,say:null,
  cam:{x:0,y:0,sh:0},intro:{t:0,land:-1}});

export const snapshot=S=>JSON.parse(JSON.stringify(S));
export function restore(S,snap){for(const k of Object.keys(S))delete S[k];return Object.assign(S,snapshot(snap))}

/* the saved subset: torch lit, items, last checkpoint, door pieces, gates latched open (v2), and since v3 the placed
   fragments, the open door, rooms seen and a running chase (a v1/v2 save loads with none of these) */
export const persist=S=>({v:VER,lit:S.lit,items:{...S.items},pieces:S.pieces.slice(),torches:{...S.torches},cp:S.cp&&{...S.cp},latch:{...S.latch},
  placed:S.placed.slice(),door:S.door,seen:{...S.seen},chase:S.chase&&S.chase.on?{id:S.chase.id,on:1,x:S.chase.x}:null});
export function save(S,ls=globalThis.localStorage){try{ls.setItem(SAVE_KEY,JSON.stringify(persist(S)))}catch(_){}}
export function load(ls=globalThis.localStorage){try{const d=JSON.parse(ls.getItem(SAVE_KEY));return d&&d.v>=1&&d.v<=VER?d:null}catch(_){return null}}
/* a loaded save's data merged into a fresh lit state (the caller then places him at S.cp) */
export function resume(S,d){
  const four=a=>Array.isArray(a)?[0,1,2,3].map(i=>a[i]?1:0):[0,0,0,0];
  return Object.assign(S,{lit:1,litT:60,match:1,mode:'play',items:{...S.items,...d.items},pieces:four(d.pieces),
    torches:{...d.torches},cp:d.cp||null,latch:{...d.latch},placed:four(d.placed),door:d.door?1:0,doorT:d.door?999:0,seen:{...d.seen},
    chase:d.chase&&d.chase.on&&typeof d.chase.id==='string'&&Number.isFinite(d.chase.x)?{id:d.chase.id,on:1,x:d.chase.x,t:0,w:0}:null});
}
export function clearSave(ls=globalThis.localStorage){try{ls.removeItem(SAVE_KEY)}catch(_){}}
