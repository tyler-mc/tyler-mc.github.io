/* World state: one plain, JSON-safe object. Everything that changes lives here (no class instances, no hidden
   module state), so snapshot() serves both save/resume and the Undo ring buffer (game/undo.js). */
export const T=12,VW=288,VH=216,VER=6,SAVE_KEY='tos_game',MUTE_KEY='tos_game_mute',ASSIST_KEY='tos_assist';
/* door pieces, in quarter order (index into S.pieces / S.placed): 0 roots NW, 1 flood NE, 2 molten SE, 3 crystals SW */
export const PIECES=['roots','flood','molten','crystals'];
/* the door ritual (engine door(), render): zone: px either side of the disc's centre where a press sets a carried
   fragment; dwell: frames standing still there that set it too (phones); fly: frames from his hands to the slot;
   pulse: the slot's hum and glow after; open: the door's opening once all four are in, then onDone; crumble: frames after
   a fragment lands before the rubble it seals (ents opens:<biome>, engine sealOpen()) crumbles open */
export const DOOR={zone:26,dwell:45,fly:36,pulse:90,open:150,crumble:24};
/* the stuck hint: frames without progress before he looks toward what's next, and between his little bobs */
export const STUCK=3*60*60,BOB=20*60;
/* the perch (engine perch()): frames standing still on it before he sits, then frames sitting before the camera has drifted
   all the way to its look and the hush has swelled */
export const PERCH={wait:40,drift:90,hush:150};

/* lv: the fall speed of the last landing (stepPlayer). The board (game/board.js): dc dash charge, dt dash frames, dd its direction, db dash buffer, bo board out, surf, mo speed kept, bd its pickup demo (frames; board.js boardDemo).
   Molten: sj the burn-and-save jump left (board.js burn), burn its frames; cl cling side (1 wall right, -1 left, 0 none), cv
   this cling grew its vine, vc vine cooldown frames, wj/wy a wall jump since he last stood and its feet height (game/claws.js) */
export const newPlayer=(x=0,y=0)=>({x,y,w:18,h:24,vx:0,vy:0,face:1,ground:0,coy:0,buf:0,root:0,jc:0,on:-1,
  carry:0,dead:0,rez:0,inv:0,gl:0,mac:0,hide:0,land:0,lv:0,walk:0,demo:0,jq:0,dc:0,dt:0,dd:1,db:0,bo:0,surf:0,mo:0,bd:0,
  sj:0,burn:0,cl:0,cv:0,vc:0,wj:0,wy:0});

/* Undo (game/undo.js): the meter q 0..360 and m 0..1, on (rewinding), flash, ago, lock, the pickup demo, the ring buffer */
export const newUndo=()=>({on:0,m:1,q:360,flash:0,ago:999,lock:0,demo:0,dp:0,dk:0,buf:[]});
export const newState=()=>({v:VER,mode:'intro',t:0,room:'hub',lit:0,litT:0,match:0,idle:0,
  items:{root:0,board:0,claws:0,forged:0,undo:0},pieces:[0,0,0,0],torches:{},cp:null,latch:{},
  /* placed: fragments set into the door (same order as pieces); door: 1 once all four are in; seen: rooms entered.
     chase: null or {id,on,x (wall front, world px),t,w (withering frames once outrun)}, plus y and l for a tide (its level,
     world px y, and how far it runs ahead, game/tide.js); slot: the fragment flying in.
     assist: the visitor's Assist preference (slower chases, wider checkpoints), set by the host, never saved.
     stuck: frames without progress (the stuck hint), hint: where he looks then (world px).
     liq: the room's liquid surfaces and currents (game/liquid.js), rebuilt on entry, never saved.
     Molten (game/claws.js), reset on room entry, never saved: vines alive {x,y,w,h (room px box, flowers included),t,...};
     drilled: [tx,ty] cracked-wall tiles drilled out this visit; drillNow: those drilled this step (cleared as the next
     step starts); crack: the drill under way [tx,ty,frames] or null.
     Crystals: cr all room-local Crystals state (game/crystals.js; rewound by Undo, reset on room entry); echo the Echo
     {on,log:[x,y,face,...],i} (game/echo.js; anchored, reset on room entry and death); undo the Undo meter, flags and
     its ring buffer (game/undo.js; anchored, never saved); feed the plants the OS dropped in, what he is chewing and the extra
     leaf or flower he grew (game/feed.js; anchored, never saved; the plants on the ground are reset on room entry) */
  placed:[0,0,0,0],door:0,doorT:0,seen:{},chase:null,slot:null,dwell:0,assist:0,stuck:0,hint:null,
  sit:0,still:0,p:newPlayer(VW/2-9,VH/2-12),ens:[],roots:[],liq:null,gate:0,plate:0,hit:0,flash:-1,say:null,
  vines:[],drilled:[],drillNow:[],crack:null,cr:{},echo:{on:0,log:[],i:0},undo:newUndo(),feed:{drops:[],shed:[],spit:[],pop:[],hearts:[],eat:null,head:null},
  cam:{x:0,y:0,sh:0},intro:{t:0,land:-1}});

export const snapshot=S=>JSON.parse(JSON.stringify(S));
export function restore(S,snap){for(const k of Object.keys(S))delete S[k];return Object.assign(S,snapshot(snap))}

/* the saved subset: torch lit, items, last checkpoint, door pieces, gates latched open (v2), and since v3 the placed
   fragments, the open door, rooms seen and a running chase (a v1/v2 save loads with none of these). v4: items.board
   (a v1-v3 save loads without it). v5: items.claws and items.forged (the heat-forged board); forged never stands
   without the board (items() drops it, on save, on load and in a grant), and a v1-v4 save loads without them.
   v6: items.undo (a v1-v5 save loads without it; the Undo buffer and meter are never saved) */
export const items=o=>{const i={...o};if(i.forged&&!i.board)i.forged=0;return i};
export const persist=S=>({v:VER,lit:S.lit,items:items(S.items),pieces:S.pieces.slice(),torches:{...S.torches},cp:S.cp&&{...S.cp},latch:{...S.latch},
  placed:S.placed.slice(),door:S.door,seen:{...S.seen},chase:S.chase&&S.chase.on?{id:S.chase.id,on:1,x:S.chase.x}:null});
export function save(S,ls=globalThis.localStorage){try{ls.setItem(SAVE_KEY,JSON.stringify(persist(S)))}catch(_){}}
export function load(ls=globalThis.localStorage){try{const d=JSON.parse(ls.getItem(SAVE_KEY));return d&&d.v>=1&&d.v<=VER?d:null}catch(_){return null}}
/* a loaded save's data merged into a fresh lit state (the caller then places him at S.cp) */
export function resume(S,d){
  const four=a=>Array.isArray(a)?[0,1,2,3].map(i=>a[i]?1:0):[0,0,0,0];
  return Object.assign(S,{lit:1,litT:60,match:1,mode:'play',items:items({...S.items,...d.items}),pieces:four(d.pieces),
    torches:{...d.torches},cp:d.cp||null,latch:{...d.latch},placed:four(d.placed),door:d.door?1:0,doorT:d.door?999:0,seen:{...d.seen},
    chase:d.chase&&d.chase.on&&typeof d.chase.id==='string'&&Number.isFinite(d.chase.x)?{id:d.chase.id,on:1,x:d.chase.x,t:0,w:0}:null});
}
export function clearSave(ls=globalThis.localStorage){try{ls.removeItem(SAVE_KEY)}catch(_){}}
