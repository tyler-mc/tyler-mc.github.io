/* Room editor. Dev only (localhost or ?qa); the dev panel's Editor button imports it lazily, so visitors never load it.
   Rooms are edited as raw module data ({id,name,biome,at,grid,ents} plus the header comment) and drawn with the game's
   own renderer, neighbours ghosted at their world positions. tools/dev_server.py validates, re-serializes and writes
   saves; without it the editor is read-only and copies the module text instead. Play-from-here runs the unsaved data. */
import {T,VW,VH,newState,restore} from './state.js';
import {ROOMS,ORDER,AMB,parse} from './rooms/index.js';
import {enterRoom,spot} from './engine.js';
import {createRenderer} from './render.js';
import {spawnEnemies} from './enemies.js';
import {sprite} from './mascot.js';
import {BIOMES,NAMES,RE,serialize,headerComment,check,problems} from './dev/roomfmt.js';

const DEV=/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)||/[?&]qa\b/.test(location.search);
const TILES='#=.~^LXQ',ENTS='STMOPGIFBHVEKWYRDZ',HIST=200,AUTOSAVE=1200;
const TOOLS=[['brush','Brush','B'],['rect','Rect','R'],['fill','Fill','F'],['erase','Erase','E'],['pick','Pick','I'],['select','Select','V'],['move','Move room','M']];
const FIELDS={'~':[['flow',-150,'current, px per frame x 100 (negative = west); the whole pool flows'],['fish',1,'a clownfish swims here']],H:[['dir',-1,'start direction, 1 or -1'],['left',0,'fence: westmost column'],['right',0,'fence: eastmost column'],['tease',1,'pulls into its shell once when he first lands within 10 tiles (before the board)']],O:[['amp',12,'bob height, px']],M:[['dir',-1,'start direction, 1 or -1']],I:[['item','root','item id']],B:[['lookx',0,'camera look while sitting, tiles right (negative = left)'],['looky',0,'camera look while sitting, tiles down (negative = up)']],
  V:[['height',4,'eruption height, tiles (1-16; a ceiling cuts it)'],['period',240,'outside the chase: frames between its steam puffs'],['phase',0,'outside the chase: frames into that rhythm'],['live',1,'erupts on that rhythm outside the chase too (default: harmless until the chase)']],
  E:[['drift',12,'figure-eight width, px each side'],['amp',6,'figure-eight height, px each way'],['pace',100,'speed, percent'],['phase',0,'start, frames into its path'],['ox',0,'px right of the tile (negative = left), to centre it in a gap'],['oy',0,'px down from the tile (negative = up)']],
  '=':[['opens','flood','a seal: solid until this biome\'s fragment is set in the door, then it crumbles for good']],
  K:[['reach',1,'tiles it crawls each way along the cracked face (0: it sits)'],['dir',1,'start direction, 1 or -1'],['pace',100,'crawl speed, percent']],
  /* Crystals (game/crystals.js, game/echo.js) */
  Q:[['delay',24,'frames after he stands on it before it falls (back when the room is re-entered)']],
  W:[['dx',4,'tiles it travels right (negative = left)'],['dy',0,'tiles it travels down (negative = up)'],['w',3,'width, tiles'],['sp',50,'speed, px per frame x100'],['pause',40,'frames it waits at each end'],['phase',0,'start, frames into its cycle']],
  Y:[['aim','r','beam direction: u, d, l or r'],['amp',12,'drift, px each way (across its beam)'],['sp',100,'drift speed, percent'],['beam',0,'beam on/off period, frames (0: always on)'],['phase',0,'start, frames into its drift']],
  R:[['id','a','its crystal lock (D) with the same id opens once every receiver of that id has been lit 30 frames']],
  D:[['id','a','opens once every receiver (R) with this id has latched']],
  Z:[['lag',120,'frames the Echo trails him']]};
const LOOK={f:'idle',dir:[1,0],blink:0,face:0,happy:0,mouth:0,dx:0,stage:0};
const clone=o=>JSON.parse(JSON.stringify(o)),clamp=(v,a,b)=>v<a?a:v>b?b:v;
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const ROOMS_URL=new URL('./rooms/',import.meta.url);

const CSS=`
.tge{position:fixed;inset:0;z-index:2147483000;display:grid;grid-template:auto minmax(0,1fr) auto/240px minmax(0,1fr) 272px;background:#0c0c10;color:#e4e4ea;font:13px/1.45 'IBM Plex Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased;outline:none}
.tge[hidden]{display:none}
.tge *{box-sizing:border-box}
.tge header{grid-column:1/-1;display:flex;align-items:center;gap:12px;padding:8px 12px;border-bottom:1px solid #26262e;background:#15151b;flex-wrap:wrap}
.tge .ttl{font:600 13px 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.02em}
.tge .grp{display:flex;gap:3px;align-items:center}
.tge .gap{flex:1}
.tge button{font:inherit;font-size:12px;color:#d8d8e0;background:#1f1f27;border:1px solid #34343f;border-radius:4px;padding:4px 9px;cursor:pointer;line-height:1.35;white-space:nowrap}
.tge button:hover{background:#2b2b35}
.tge button[aria-pressed=true]{background:#FFD94A;color:#1A1716;border-color:#FFD94A}
.tge button.pri{background:#2d5a9e;border-color:#4274c0;color:#fff}
.tge button.pri:hover{background:#3769b3}
.tge button:disabled{opacity:.4;cursor:default}
.tge kbd{font:11px 'IBM Plex Mono',ui-monospace,monospace;opacity:.55;margin-left:5px}
.tge button[aria-pressed=true] kbd{opacity:.7}
.tge .zv{font:12px 'IBM Plex Mono',ui-monospace,monospace;min-width:44px;text-align:center;color:#b8b8c4}
.tge aside{overflow:auto;background:#121217;border-right:1px solid #26262e}
.tge aside.r{border-right:0;border-left:1px solid #26262e}
.tge section{padding:10px 12px 12px;border-bottom:1px solid #22222a}
.tge h3{margin:0 0 6px;font:600 11px/1.4 'IBM Plex Mono',ui-monospace,monospace;text-transform:uppercase;letter-spacing:.08em;color:#8d8d9a;display:flex;gap:6px}
.tge h3 .n{margin-left:auto;text-transform:none;letter-spacing:0}
.tge label{display:block;margin:7px 0 0;color:#a9a9b5;font-size:12px}
.tge input,.tge select,.tge textarea{display:block;width:100%;margin-top:3px;font:13px 'IBM Plex Mono',ui-monospace,monospace;color:#f0f0f4;background:#0a0a0e;border:1px solid #34343f;border-radius:4px;padding:4px 6px}
.tge input:disabled{color:#777}
.tge input.bad{border-color:#ff5c5c}
.tge textarea{resize:vertical;font-size:12px;line-height:1.4;min-height:72px}
.tge .two{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.tge .row{display:flex;gap:4px;margin-top:8px;flex-wrap:wrap;align-items:center}
.tge .kv{margin-top:7px;font-size:12px;color:#a9a9b5}
.tge code{font:12px 'IBM Plex Mono',ui-monospace,monospace;color:#d8d8e0}
.tge ul{list-style:none;margin:0;padding:0}
.tge .rl li{display:flex;gap:6px;align-items:baseline;padding:4px 6px;border-radius:4px;cursor:pointer}
.tge .rl li:hover{background:#1c1c24}
.tge .rl li.on{background:#272734;box-shadow:inset 2px 0 #FFD94A}
.tge .rl .nm{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tge .rl .id{font:11px 'IBM Plex Mono',ui-monospace,monospace;color:#80808e}
.tge .dot{color:#FFD94A;font-size:11px}
.tge .cnt{font:11px 'IBM Plex Mono',ui-monospace,monospace;padding:0 4px;border-radius:3px;background:#3a2a10;color:#f0b429}
.tge .cnt.e{background:#3d1416;color:#ff7b7b}
.tge .pal{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:8px}
.tge .pal button{display:flex;align-items:center;gap:7px;padding:3px 6px 3px 3px;text-align:left}
.tge .pal canvas{width:24px;height:24px;image-rendering:pixelated;flex:none;border-radius:2px}
.tge .pal .g{font:600 12px 'IBM Plex Mono',ui-monospace,monospace;opacity:.5;margin-left:auto}
.tge .anc{display:grid;grid-template-columns:repeat(3,22px);gap:2px}
.tge .anc button{padding:0;height:22px;font-size:10px}
.tge main{position:relative;overflow:hidden;background:#08080b}
.tge main canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:crosshair}
.tge .hint{position:absolute;left:50%;top:10px;transform:translateX(-50%);padding:5px 10px;border-radius:4px;background:#FFD94A;color:#1A1716;font-weight:500;pointer-events:none}
.tge .hint:empty{display:none}
.tge .help{position:absolute;left:10px;bottom:8px;font:11px 'IBM Plex Mono',ui-monospace,monospace;color:#6c6c78;pointer-events:none}
.tge footer{grid-column:1/-1;display:flex;gap:18px;align-items:center;padding:5px 12px;border-top:1px solid #26262e;background:#15151b;font:12px 'IBM Plex Mono',ui-monospace,monospace;color:#a0a0ac}
.tge footer label{margin:0;display:flex;gap:5px;align-items:center;font:inherit}
.tge footer input{width:auto;margin:0}
.tge .ok{color:#7fd88f}.tge .warn{color:#ffcf5a}.tge .err{color:#ff7b7b}
.tge .vl li{display:flex;gap:7px;padding:4px 6px;border-radius:4px;cursor:pointer;font-size:12px;line-height:1.4}
.tge .vl li:hover{background:#1c1c24}
.tge .vl .lv{flex:none;width:8px;height:8px;margin-top:5px;border-radius:50%;background:#f0b429}
.tge .vl .lv.err{background:#ff5c5c}
.tge .vl .rid{font:11px 'IBM Plex Mono',ui-monospace,monospace;color:#80808e;margin-right:4px}
.tge .none{color:#7fd88f;font-size:12px}
.tge .ib{font-size:12px;color:#a9a9b5}
.tge .ib .f{display:grid;grid-template-columns:52px 1fr auto;gap:6px;align-items:center;margin-top:6px}
.tge .ib .f input{margin:0}
.tge .ib b{color:#e4e4ea;font-weight:600}
.tge-badge{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:2147483001;display:flex;gap:10px;align-items:center;padding:6px 8px 6px 12px;border-radius:6px;background:rgba(20,20,26,.92);color:#e4e4ea;font:12px/1.3 'IBM Plex Mono',ui-monospace,monospace;box-shadow:0 2px 10px rgba(0,0,0,.5)}
.tge-badge[hidden]{display:none}
.tge-badge button{font:inherit;padding:3px 8px;border-radius:4px;border:1px solid #4274c0;background:#2d5a9e;color:#fff;cursor:pointer}`;

let E=null;   /* the editor, created once per page and kept while hidden so its state survives play and close */

export async function open(api,groot){
  if(!DEV){console.warn('editor: dev only');return}
  if(!E){E=await create(api,groot)}
  show();
}

/* ---------- room records ---------- */
/* {file, src (raw module data), comment, saved (text as last saved), fresh (not on disk yet), hist, fut, live (id in ROOMS)} */
const rec=(file,src,comment,fresh)=>({file,src:clone(src),comment,saved:fresh?'':serialize(src,comment),fresh,hist:[],fut:[],live:fresh?null:src.id,key:'',img:null});
const dirty=r=>r.fresh||serialize(r.src,r.comment)!==r.saved;
const W_=r=>r.src.grid[0].length,H_=r=>r.src.grid.length;
const inRoom=(r,tx,ty)=>tx>=0&&ty>=0&&tx<W_(r)&&ty<H_(r);
const at=(r,tx,ty)=>r.src.grid[ty][tx];

async function loadAll(){
  const v='?v='+Date.now(),get=async u=>{const res=await fetch(new URL(u+v,ROOMS_URL),{cache:'no-store'});if(!res.ok)throw new Error(u+': '+res.status);return res.text()};
  const blk=/rooms:begin[^\n]*\n([\s\S]*?)\/\* rooms:end/.exec(await get('index.js'));
  if(!blk)throw new Error('rooms/index.js has no rooms:begin block');
  const files=[...blk[1].matchAll(/from '\.\/([a-z][a-z0-9_-]*)\.js'/g)].map(m=>m[1]);
  return Promise.all(files.map(async f=>{
    const text=await get(f+'.js'),src=(await import(new URL(f+'.js'+v,ROOMS_URL).href)).default,c=headerComment(text),r=rec(f,src,c);
    r.hand=serialize(src,c)!==text;   /* hand-formatted: the first save will rewrite it in the standard layout */
    return r;
  }));
}
async function ping(){
  try{const res=await fetch('/__room/ping',{cache:'no-store'});E.srv=res.ok&&(await res.json()).ok===true}catch(_){E.srv=false}
  E.ui=1;req();
}

/* ---------- drawing with the game's renderer ---------- */
let rend=null,rcv=null;
/* a whole room at the game's tile art: the renderer draws one 288x216 screen at a time, so step its camera over the room.
   Without light the biome's ambient is lifted to 1 for the call so nothing is dithered dark. */
function paint(R,light){
  if(!rend){rcv=mk(VW,VH);rend=createRenderer(rcv)}
  const W=R.w*T,H=R.h*T,c=mk(W,H),x=c.getContext('2d');
  const S={...newState(),mode:'play',edit:1,lit:1,litT:60,match:1,items:{},pieces:[],ens:spawnEnemies(R),
    torches:Object.fromEntries(R.torches.map(t=>[R.id+':'+t.tx+','+t.ty,1]))};
  S.p.hide=1;S.p.x=S.p.y=-9999;
  const had=R.biome in AMB,old=AMB[R.biome];if(!light)AMB[R.biome]=1;
  try{for(let y=0;y<H;y+=VH)for(let X=0;X<W;X+=VW){S.cam.x=X;S.cam.y=y;rend.draw(S,R);x.drawImage(rcv,X,y)}}
  finally{if(!light){if(had)AMB[R.biome]=old;else delete AMB[R.biome]}}
  return c;
}
function img(r){
  const k=r.src.id+'|'+r.src.biome+'|'+E.light+'|'+r.src.grid.join('')+JSON.stringify(r.src.ents);
  if(r.key!==k){r.img=paint(parse(r.src),E.light);r.key=k}
  return r.img;
}
const SW={};
function swatch(biome,ch){
  const k=biome+ch;if(SW[k])return SW[k];
  const c=mk(T,T),x=c.getContext('2d'),g=ch==='S'?'.':ch,under='^MPGFBHVLQ'.includes(ch)?'#':ch==='K'?'X':'.';
  x.drawImage(paint(parse({id:'swatch',name:'',biome,at:[99999,99999],grid:['...','.'+g+'.','.'+under+'.'],ents:[]}),false),T,T,T,T,0,0,T,T);
  if(ch==='S')x.drawImage(sprite(LOOK),8,16,24,48,1,0,10,20);
  return SW[k]=c;
}

/* ---------- view ---------- */
const V={x:0,y:0,z:2};
function fit(){
  const r=E.cur,cw=E.cv.clientWidth||800,ch=E.cv.clientHeight||600,w=W_(r)*T,h=H_(r)*T;
  let z=Math.min((cw-48)/w,(ch-48)/h);z=z>=1?Math.floor(z*2)/2:Math.max(.25,z);
  V.z=z;V.x=r.src.at[0]*T+w/2-cw/2/z;V.y=r.src.at[1]*T+h/2-ch/2/z;req();
}
function zoomAt(mx,my,f){const wx=mx/V.z+V.x,wy=my/V.z+V.y;V.z=clamp(V.z*f,.25,16);V.x=wx-mx/V.z;V.y=wy-my/V.z;req()}
const req=()=>{if(E&&!E.raf)E.raf=requestAnimationFrame(render)};

function render(){
  E.raf=0;if(E.el.hidden)return;
  const cv=E.cv,dpr=devicePixelRatio||1,cw=cv.clientWidth,ch=cv.clientHeight;
  if(cv.width!==Math.round(cw*dpr)||cv.height!==Math.round(ch*dpr)){cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr)}
  const x=E.ctx,z=V.z,cur=E.cur,[ax,ay]=cur.src.at,X=wx=>Math.round((wx-V.x)*z),Y=wy=>Math.round((wy-V.y)*z);
  const tX=tx=>X((ax+tx)*T),tY=ty=>Y((ay+ty)*T),ts=Math.max(1,Math.round(T*z));
  x.setTransform(dpr,0,0,dpr,0,0);x.imageSmoothingEnabled=false;
  x.fillStyle='#08080b';x.fillRect(0,0,cw,ch);
  x.font="12px 'IBM Plex Mono',ui-monospace,monospace";x.textBaseline='top';
  /* every room at its world position; the one being edited at full strength; neighbour labels go on top of all rooms */
  const labels=[];
  for(const r of [...E.rooms.filter(q=>q!==cur),cur]){
    const x0=X(r.src.at[0]*T),y0=Y(r.src.at[1]*T),x1=X((r.src.at[0]+W_(r))*T),y1=Y((r.src.at[1]+H_(r))*T);
    if(x0>cw||y0>ch||x1<0||y1<0)continue;
    x.globalAlpha=r===cur?1:.32;x.drawImage(img(r),x0,y0,x1-x0,y1-y0);x.globalAlpha=1;
    x.strokeStyle=r===cur?'#FFD94A':'rgba(255,255,255,.28)';x.lineWidth=1;x.strokeRect(x0-.5,y0-.5,x1-x0+1,y1-y0+1);
    if(r!==cur)labels.push([`${r.src.name} · ${r.src.id}`,x0,y0,x1,y1]);
  }
  for(const [t,x0,y0,x1,y1] of labels){const w=x.measureText(t).width,lx=clamp(x0+4,4,Math.max(4,Math.min(x1,cw)-w-14)),ly=clamp(y0+4,4,Math.max(4,Math.min(y1,ch)-23));
    x.fillStyle='rgba(8,8,11,.85)';x.fillRect(lx,ly,w+10,19);x.fillStyle='#c8c8d2';x.fillText(t,lx+5,ly+3)}
  /* grid, with a stronger line every screen (24x18 tiles) */
  if(E.grid&&T*z>=5){
    const w=W_(cur),h=H_(cur);x.lineWidth=1;
    for(let i=0;i<=w;i++){x.strokeStyle=i%(VW/T)?'rgba(255,255,255,.09)':'rgba(255,217,74,.35)';x.beginPath();x.moveTo(tX(i)+.5,tY(0));x.lineTo(tX(i)+.5,tY(h));x.stroke()}
    for(let j=0;j<=h;j++){x.strokeStyle=j%(VH/T)?'rgba(255,255,255,.09)':'rgba(255,217,74,.35)';x.beginPath();x.moveTo(tX(0),tY(j)+.5);x.lineTo(tX(w),tY(j)+.5);x.stroke()}
  }
  /* markers the game does not draw: the start (as the mascot), puff bob ranges, tiles carrying ent data */
  const g=cur.src.grid;
  g.forEach((row,ty)=>[...row].forEach((c,tx)=>{
    if(c==='S'){x.globalAlpha=.9;x.drawImage(sprite(LOOK),X((ax+tx)*T-14),Y((ay+ty)*T-48),Math.round(40*z),Math.round(64*z));x.globalAlpha=1}
    if(c==='O'){const e=cur.src.ents.find(e=>e.at[0]===tx&&e.at[1]===ty),amp=e&&Number.isInteger(e.amp)?e.amp:12,cx=X((ax+tx)*T+6);
      x.strokeStyle='rgba(176,127,196,.9)';x.setLineDash([3,3]);x.beginPath();x.moveTo(cx+.5,Y((ay+ty)*T-amp));x.lineTo(cx+.5,Y((ay+ty)*T+12+amp));x.stroke();x.setLineDash([])}
  }));
  for(const e of cur.src.ents){x.fillStyle='#FFD94A';x.fillRect(tX(e.at[0])+ts-Math.max(3,ts/5),tY(e.at[1]),Math.max(3,ts/5),Math.max(3,ts/5))}
  /* problems on this room's tiles */
  for(const p of E.probs)if(p.id===cur.src.id&&p.tx!=null){x.strokeStyle=p.lv==='err'?'#ff5c5c':'#f0b429';x.lineWidth=2;x.strokeRect(tX(p.tx)+1,tY(p.ty)+1,ts-2,ts-2)}
  /* tool previews */
  const d=E.drag,h=E.hover;
  if(d&&d.k==='rect'){const [a,b,c,e]=[Math.min(d.a.tx,d.b.tx),Math.min(d.a.ty,d.b.ty),Math.max(d.a.tx,d.b.tx),Math.max(d.a.ty,d.b.ty)];
    x.globalAlpha=.6;for(let j=b;j<=e;j++)for(let i=a;i<=c;i++)if(inRoom(cur,i,j)&&(!d.outline||i===a||i===c||j===b||j===e))x.drawImage(swatch(cur.src.biome,E.glyph),tX(i),tY(j),ts,ts);
    x.globalAlpha=1;x.strokeStyle='#FFD94A';x.lineWidth=1;x.strokeRect(tX(a)+.5,tY(b)+.5,tX(c+1)-tX(a)-1,tY(e+1)-tY(b)-1)}
  if(d&&d.k==='ent'&&(d.b.tx!==d.a.tx||d.b.ty!==d.a.ty)&&inRoom(cur,d.b.tx,d.b.ty)){x.globalAlpha=.75;x.drawImage(swatch(cur.src.biome,at(cur,d.a.tx,d.a.ty)),tX(d.b.tx),tY(d.b.ty),ts,ts);x.globalAlpha=1}
  if(h&&h.in&&!d&&!E.space){
    if(E.tool==='brush'||E.tool==='erase'){x.globalAlpha=.55;x.drawImage(swatch(cur.src.biome,E.tool==='erase'?'.':E.glyph),tX(h.tx),tY(h.ty),ts,ts);x.globalAlpha=1}
    x.strokeStyle=E.arm?'#7fd88f':'#ffffff';x.lineWidth=1;x.strokeRect(tX(h.tx)+.5,tY(h.ty)+.5,ts-1,ts-1);
  }
  if(E.sel&&inRoom(cur,E.sel.tx,E.sel.ty)){x.strokeStyle='#FFD94A';x.lineWidth=2;x.strokeRect(tX(E.sel.tx)-1,tY(E.sel.ty)-1,ts+2,ts+2)}
  if(E.ui){E.ui=0;refreshUI()}
  E.zv.textContent=Math.round(z*100)+'%';
}

/* ---------- edits ---------- */
const snap=r=>JSON.stringify({src:r.src,comment:r.comment});
function mark(r){r.hist.push(snap(r));if(r.hist.length>HIST)r.hist.shift();r.fut.length=0}
function unmark(r){r.hist.pop()}
function apply(r,s){const o=JSON.parse(s);r.src=o.src;r.comment=o.comment;if(r.fresh)r.file=r.src.id;changed(r,1)}
function undo(){const r=E.cur;if(!r.hist.length)return msg('Nothing to undo');r.fut.push(snap(r));apply(r,r.hist.pop())}
function redo(){const r=E.cur;if(!r.fut.length)return msg('Nothing to redo');r.hist.push(snap(r));apply(r,r.fut.pop())}
function changed(r,props){E.ui=1;if(props)E.props=1;req();autosave()}
/* one tile; a new glyph drops that tile's ent data, and a new start replaces the old one */
function put(r,tx,ty,ch){
  if(!inRoom(r,tx,ty)||at(r,tx,ty)===ch)return 0;
  const g=r.src.grid;
  if(ch==='S')g.forEach((row,y)=>{const x=row.indexOf('S');if(x>=0)g[y]=row.slice(0,x)+'.'+row.slice(x+1)});
  g[ty]=g[ty].slice(0,tx)+ch+g[ty].slice(tx+1);
  r.src.ents=r.src.ents.filter(e=>e.at[0]!==tx||e.at[1]!==ty);
  return 1;
}
function line(r,a,b,ch){let n=0,x=a.tx,y=a.ty;const dx=Math.abs(b.tx-x),dy=-Math.abs(b.ty-y),sx=x<b.tx?1:-1,sy=y<b.ty?1:-1;let e=dx+dy;
  for(;;){n+=put(r,x,y,ch);if(x===b.tx&&y===b.ty)break;const e2=2*e;if(e2>=dy){e+=dy;x+=sx}if(e2<=dx){e+=dx;y+=sy}}return n}
function flood(r,tx,ty,ch){
  const from=at(r,tx,ty);if(from===ch)return 0;
  const st=[[tx,ty]];let n=0;
  while(st.length){const [x,y]=st.pop();if(!inRoom(r,x,y)||at(r,x,y)!==from)continue;n+=put(r,x,y,ch);st.push([x+1,y],[x-1,y],[x,y+1],[x,y-1])}
  return n;
}
/* resize keeping the anchored side fixed in the world: content shifts, at moves the other way; new cells are rock */
function resize(r,W,H,ax,ay){
  const g=r.src.grid,w0=g[0].length,h0=g.length,dx=Math.round((W-w0)*ax),dy=Math.round((H-h0)*ay);
  r.src.grid=Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>{const ox=x-dx,oy=y-dy;return ox>=0&&oy>=0&&ox<w0&&oy<h0?g[oy][ox]:'#'}).join(''));
  r.src.ents=r.src.ents.map(e=>({...e,at:[e.at[0]+dx,e.at[1]+dy]})).filter(e=>e.at[0]>=0&&e.at[1]>=0&&e.at[0]<W&&e.at[1]<H);
  r.src.at=[r.src.at[0]-dx,r.src.at[1]-dy];
}
function moveEnt(r,a,b){
  const ch=at(r,a.tx,a.ty),e=r.src.ents.find(e=>e.at[0]===a.tx&&e.at[1]===a.ty);
  put(r,a.tx,a.ty,'.');put(r,b.tx,b.ty,ch);
  if(e)r.src.ents.push({...e,at:[b.tx,b.ty]});
}

/* ---------- live rooms: what the running game sees ---------- */
function setLive(r,src){
  if(r.live&&r.live!==src.id)delete ROOMS[r.live];
  ROOMS[src.id]=parse(src);r.live=src.id;
}
/* ORDER follows the editor's list; rooms renamed or deleted leave ROOMS; the player is moved off a room that is gone */
function syncLive(){
  const ids=E.rooms.map(r=>r.live).filter(id=>id&&ROOMS[id]);
  ORDER.splice(0,ORDER.length,...ids);
  for(const k of Object.keys(ROOMS))if(!ids.includes(k))delete ROOMS[k];
  const S=E.api.state();
  if(S.cp&&!ROOMS[S.cp.room])S.cp=null;
  if(!ROOMS[S.room]&&ROOMS.hub){const R=ROOMS.hub,t=R.torches[0]||R.start||{tx:1,ty:1};enterRoom(S,'hub',spot(S,R,t.tx,t.ty))}
}

/* ---------- save ---------- */
async function post(path,body){
  const res=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  let j;try{j=await res.json()}catch(_){throw new Error(`${path}: HTTP ${res.status}`)}
  if(!j.ok)throw new Error(j.error||`HTTP ${res.status}`);
  return j;
}
let saveT=0;
function autosave(){clearTimeout(saveT);if(E.auto&&E.srv)saveT=setTimeout(()=>E.drag?autosave():saveAll(false),AUTOSAVE)}
async function saveAll(manual){
  if(!E.srv){if(manual){await ping();if(!E.srv)return msg('Read-only: no save server. Use Copy module, or run python3 tools/dev_server.py','warn')}else return}
  if(E.saving){E.again=1;return}
  const list=E.rooms.filter(dirty);
  if(!list.length){if(manual)msg('All rooms saved','ok');return}
  E.saving=1;E.ui=1;req();
  let n=0;
  try{
    for(const r of list){
      const err=check(r.src,r.comment)||(E.rooms.some(q=>q!==r&&(q.src.id===r.src.id||q.file===r.file))?`id or file '${r.src.id}' is used twice`:'');
      if(err)throw new Error(`${r.src.id}: ${err}`);
      const room=clone(r.src),comment=r.comment,text=serialize(room,comment),res=await post('/__room/save',{file:r.file,room,comment});
      r.saved=text;r.fresh=false;n++;
      await hot(r,room);
    }
    E.err='';msg(`Saved ${n} room${n>1?'s':''}`,'ok');
  }catch(e){E.err=e.message;msg('Save failed: '+e.message,'err');if(e instanceof TypeError)ping()}
  finally{E.saving=0;E.ui=1;req();if(E.again){E.again=0;autosave()}}
}
/* hot reload: import the written file fresh, check it reads back as sent, and swap it into the running game */
async function hot(r,sent){
  const src=(await import(new URL(`${r.file}.js?v=${Date.now()}`,ROOMS_URL).href)).default;
  if(serialize(src,'')!==serialize(sent,''))throw new Error(`${r.file}.js reads back differently from what was sent`);
  setLive(r,src);syncLive();
}

/* ---------- rooms: new, duplicate, delete, switch ---------- */
function uniq(base){
  base=base.replace(/[^a-z0-9]/g,'').replace(/^[^a-z]+/,'')||'room';base=base.slice(0,13);
  const used=new Set(E.rooms.flatMap(r=>[r.src.id,r.file]));
  for(let i=1;;i++){const id=base+(i>1||used.has(base)?i:'');if(!used.has(id))return id}
}
function place(){const x=Math.max(...E.rooms.map(r=>r.src.at[0]+W_(r)))+2;return [x,E.cur.src.at[1]]}
function addRoom(src){
  const r=rec(src.id,src,'',true);E.rooms.push(r);switchTo(r);changed(r,1);
}
function newRoom(){
  const w=24,h=18,id=uniq('room');
  const grid=Array.from({length:h},(_,y)=>y===0||y>=h-2?'#'.repeat(w):'#'+(y===h-3?'..T':'...')+'.'.repeat(w-5)+'#');
  addRoom({id,name:'New Room',biome:E.cur.src.biome==='hub'?'roots':E.cur.src.biome,at:place(),grid,ents:[]});
}
function dupRoom(){
  const from=E.cur,s=clone(from.src);
  addRoom({...s,id:uniq(s.id),name:(s.name+' copy').slice(0,40),at:place(),grid:s.grid.map(row=>row.replace(/S/g,'.'))});
  E.cur.comment=from.comment;
}
async function delRoom(){
  const r=E.cur;
  if(r.src.id==='hub'||r.file==='hub')return msg('The hub cannot be deleted','warn');
  if(!confirm(`Delete room "${r.src.name}" (${r.file}.js)?${r.fresh?'':' The file is removed; a copy stays in game/rooms/.bak.'}`))return;
  if(!r.fresh){
    if(!E.srv)return msg('Read-only: no save server, so nothing was deleted','warn');
    try{await post('/__room/delete',{file:r.file})}catch(e){return msg('Delete failed: '+e.message,'err')}
  }
  E.rooms.splice(E.rooms.indexOf(r),1);if(r.live)delete ROOMS[r.live];syncLive();
  switchTo(E.rooms[0]);msg(`Deleted ${r.file}.js`,'ok');
}
function switchTo(r){if(!r)return;E.cur=r;E.sel=null;E.props=1;E.ui=1;fit()}

/* ---------- play from here ---------- */
function play(r,tx,ty){
  const bad=E.rooms.find(q=>check(q.src)),dup=E.rooms.find(q=>E.rooms.some(o=>o!==q&&o.src.id===q.src.id));
  if(bad||dup)return msg(`Cannot play: ${bad?bad.src.id+': '+check(bad.src):'id '+dup.src.id+' is used twice'}`,'err');
  for(const q of E.rooms)setLive(q,clone(q.src));
  syncLive();
  const S=E.api.state(),keep={items:{...S.items},pieces:S.pieces.slice(),torches:{...S.torches},cp:S.cp};
  restore(S,newState());
  Object.assign(S,{items:keep.items,pieces:keep.pieces,torches:keep.torches,cp:keep.cp,lit:1,litT:60,match:1,mode:'play'});
  const R=ROOMS[r.src.id];enterRoom(S,R.id,spot(S,R,tx,ty));
  E.playing=1;E.el.hidden=true;E.badge.querySelector('span').textContent=`Playing ${r.src.name} from the editor (unsaved edits included)`;E.badge.hidden=false;
  E.api.pause(false);
}
function stopPlay(){E.playing=0;E.badge.hidden=true;E.api.pause(true);E.el.hidden=false;E.el.focus({preventScroll:true});E.ui=1;req()}
function show(){E.el.hidden=false;E.badge.hidden=true;E.playing=0;E.api.pause(true);E.el.focus({preventScroll:true});ping();E.props=1;E.ui=1;req()}
function close(){E.el.hidden=true;E.arm=0;E.api.pause(false)}

/* ---------- UI ---------- */
function msg(t,kind='info'){E.msg={t,kind};E.ui=1;req()}
function refreshUI(){
  const cur=E.cur;
  E.probs=problems(E.rooms.map(r=>r.src));
  const pc=id=>{const ps=E.probs.filter(p=>p.id===id),e=ps.filter(p=>p.lv==='err').length;return ps.length?`<span class="cnt${e?' e':''}">${ps.length}</span>`:''};
  E.$('.rl').innerHTML=E.rooms.map((r,i)=>`<li data-i="${i}" class="${r===cur?'on':''}"><span class="nm">${esc(r.src.name)}</span><span class="id">${esc(r.src.id)}</span>${pc(r.src.id)}${dirty(r)?'<span class="dot" title="unsaved">●</span>':''}</li>`).join('');
  const ps=[...E.probs].sort((a,b)=>(b.id===cur.src.id)-(a.id===cur.src.id));
  E.$('.val .n').textContent=E.probs.length?String(E.probs.length):'';
  E.$('.vl').innerHTML=ps.length?ps.map(p=>`<li data-p="${E.probs.indexOf(p)}"><span class="lv ${p.lv}"></span><span><span class="rid">${esc(p.id)}${p.tx!=null?` ${p.tx},${p.ty}`:''}</span>${esc(p.msg)}</span></li>`).join(''):'<li class="none">No problems found</li>';
  if(E.props){E.props=0;refreshProps()}
  refreshInsp();
  E.$$('[data-t]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.t===E.tool));
  E.$$('[data-g]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.g===E.glyph));
  E.$('[data-a=grid]').setAttribute('aria-pressed',!!E.grid);E.$('[data-a=light]').setAttribute('aria-pressed',!!E.light);
  E.$('[data-a=play]').setAttribute('aria-pressed',!!E.arm);
  E.$('[data-a=undo]').disabled=!cur.hist.length;E.$('[data-a=redo]').disabled=!cur.fut.length;
  E.$('[data-a=del]').disabled=cur.src.id==='hub';
  E.$('[data-a=save]').disabled=E.srv===false;
  E.$('.hint').textContent=E.arm?'Click a tile to play from there · Esc cancels':'';
  const un=E.rooms.filter(dirty);
  E.$('.srv').innerHTML=E.srv==null?'checking save server…':E.srv?'<span class="ok">save server on</span>':'<span class="warn">read-only: no save server</span>';
  E.$('.st').innerHTML=E.srv===false?(un.length?`<span class="warn">unsaved: ${un.map(r=>esc(r.src.id)).join(', ')} (Copy module to keep)</span>`:'no edits'):E.saving?'saving…':E.err?`<span class="err">error: ${esc(E.err)}</span>`:un.length?`<span class="warn">unsaved: ${un.map(r=>esc(r.src.id)).join(', ')}</span>`:'<span class="ok">all saved</span>';
  E.$('.msg').innerHTML=E.msg?`<span class="${E.msg.kind}">${esc(E.msg.t)}</span>`:'';
  if(E.swB!==cur.src.biome){E.swB=cur.src.biome;E.$$('[data-g]').forEach(b=>{const c=b.querySelector('canvas');c.getContext('2d').drawImage(swatch(cur.src.biome,b.dataset.g),0,0)})}
}
function refreshProps(){
  const r=E.cur,s=r.src,f=E.$('.props'),a=document.activeElement,set=(k,v)=>{const i=f.querySelector(`[data-p=${k}]`);if(i!==a)i.value=v;i.classList.remove('bad')};
  set('name',s.name);set('id',s.id);set('biome',s.biome);set('ax',s.at[0]);set('ay',s.at[1]);set('w',W_(r));set('h',H_(r));set('comment',r.comment);
  f.querySelector('[data-p=id]').disabled=s.id==='hub';
  f.querySelector('.fn').textContent=`game/rooms/${r.file}.js${r.fresh?' (new)':''}`;
  f.querySelector('.hand').hidden=!r.hand;
  E.$$('.anc button').forEach((b,i)=>b.setAttribute('aria-pressed',i===E.anc));
}
function refreshInsp(){
  const r=E.cur,s=E.sel,ib=E.$('.ib');
  if(!s||!inRoom(r,s.tx,s.ty)){if(ib.dataset.k!=='-'){ib.dataset.k='-';ib.innerHTML='Pick the <b>Select</b> tool (V) and click a tile to inspect it. Drag an entity to move it.'}return}
  const ch=at(r,s.tx,s.ty),e=r.src.ents.find(e=>e.at[0]===s.tx&&e.at[1]===s.ty)||{},k=s.tx+','+s.ty+ch+JSON.stringify(e);
  if(ib.dataset.k===k)return;
  ib.dataset.k=k;
  const fs=Object.entries(e).filter(([n])=>n!=='at'),sug=(FIELDS[ch]||[]).filter(([n])=>!(n in e));
  ib.innerHTML=`<div><b>${esc(NAMES[ch])}</b> <code>'${esc(ch)}'</code> at ${s.tx},${s.ty}</div>`+
    fs.map(([n,v])=>`<div class="f"><code>${esc(n)}</code><input data-f="${esc(n)}" value="${esc(v)}"><button data-x="${esc(n)}" title="Remove field">×</button></div>`).join('')+
    (sug.length?`<div class="row">${sug.map(([n,v,t])=>`<button data-add="${n}" data-v="${v}" title="${t}">+ ${n}</button>`).join('')}</div>`:'')+
    `<div class="f"><input data-nk placeholder="field"><input data-nv placeholder="value"><button data-a="addf">Add</button></div>`+
    `<div class="kv">Fields are whole numbers or short words.</div>`;
}
function setField(r,tx,ty,k,raw){
  const v=/^-?\d+$/.test(raw)?+raw:raw;
  if(!RE.key.test(k))return msg('Field names: a lowercase letter, then letters (e.g. amp)','err');
  if(typeof v==='string'?!RE.str.test(v):Math.abs(v)>1000)return msg('Values: a whole number -1000..1000 or a word of letters, digits, _ or -','err');
  mark(r);let e=r.src.ents.find(e=>e.at[0]===tx&&e.at[1]===ty);
  if(!e){e={at:[tx,ty]};r.src.ents.push(e)}
  e[k]=v;changed(r);
}
function delField(r,tx,ty,k){
  const e=r.src.ents.find(e=>e.at[0]===tx&&e.at[1]===ty);if(!e)return;
  mark(r);delete e[k];if(Object.keys(e).length===1)r.src.ents.splice(r.src.ents.indexOf(e),1);changed(r);
}
function setTool(t){if(t==='pick'&&E.tool!=='pick')E.prev=E.tool;E.tool=t;E.arm=0;E.ui=1;req()}
async function copyModule(){
  const r=E.cur,t=serialize(r.src,r.comment);
  try{await navigator.clipboard.writeText(t)}catch(_){const ta=document.createElement('textarea');ta.value=t;E.el.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}
  msg(`Copied ${r.file}.js (${t.length} bytes): paste it over game/rooms/${r.file}.js${r.fresh?' and add it to rooms/index.js':''}`,'ok');
}

/* ---------- build ---------- */
async function create(api,groot){
  if(!document.getElementById('tge-css')){const s=document.createElement('style');s.id='tge-css';s.textContent=CSS;document.head.appendChild(s)}
  const el=document.createElement('div');el.className='tge';el.tabIndex=-1;el.setAttribute('aria-label','Room editor');
  const pal=s=>[...s].map(c=>`<button data-g="${c}" title="${NAMES[c]}"><canvas width="${T}" height="${T}"></canvas>${NAMES[c]}<span class="g">${c}</span></button>`).join('');
  el.innerHTML=`<header><span class="ttl">Room editor</span>
<div class="grp">${TOOLS.map(([t,n,k])=>`<button data-t="${t}" title="${n} (${k})">${n}<kbd>${k}</kbd></button>`).join('')}</div>
<div class="grp"><button data-a="undo" title="Undo (⌘Z)">Undo</button><button data-a="redo" title="Redo (⇧⌘Z)">Redo</button></div>
<div class="grp"><button data-a="grid" title="Grid (G)">Grid<kbd>G</kbd></button><button data-a="light" title="Preview the game's lighting (L)">Light<kbd>L</kbd></button></div>
<div class="grp"><button data-a="zout" title="Zoom out (-)">−</button><span class="zv"></span><button data-a="zin" title="Zoom in (+)">+</button><button data-a="fit" title="Fit room (0)">Fit</button></div>
<span class="gap"></span>
<button data-a="play" class="pri" title="Click a tile to play from it, or press P over a tile">▶ Play here<kbd>P</kbd></button>
<button data-a="save" class="pri" title="Save all rooms (⌘S)">Save</button>
<button data-a="copy" title="Copy this room's module text">Copy module</button>
<button data-a="close" title="Close the editor">Close</button></header>
<aside class="l"><section><h3>Rooms</h3><ul class="rl"></ul>
<div class="row"><button data-a="new">New</button><button data-a="dup">Duplicate</button><button data-a="del">Delete</button></div></section>
<section class="props"><h3>Room</h3>
<label>Name<input data-p="name" maxlength="40"></label>
<div class="two"><label>Id<input data-p="id" maxlength="16"></label><label>Biome<select data-p="biome">${BIOMES.map(b=>`<option>${b}</option>`).join('')}</select></label></div>
<div class="kv">File <code class="fn"></code></div>
<div class="kv warn hand" hidden>Hand-formatted file: saving rewrites it in the standard layout.</div>
<div class="two"><label>World x<input type="number" data-p="ax"></label><label>World y<input type="number" data-p="ay"></label></div>
<div class="two"><label>Width<input type="number" data-p="w" min="1" max="128"></label><label>Height<input type="number" data-p="h" min="1" max="128"></label></div>
<div class="row"><div class="anc" title="Anchor: the side that stays put">${'↖↑↗←•→↙↓↘'.split('').map(c=>`<button>${c}</button>`).join('')}</div><button data-a="resize">Resize</button></div>
<label>Header comment<textarea data-p="comment" rows="5"></textarea></label></section></aside>
<main><canvas></canvas><div class="hint"></div><div class="help">space-drag or middle-drag: pan · ⌘/ctrl-wheel or pinch: zoom · right-click: pick tile · double-click a dim room: edit it</div></main>
<aside class="r"><section><h3>Tiles</h3><div class="pal">${pal(TILES)}</div><h3>Entities</h3><div class="pal">${pal(ENTS)}</div></section>
<section class="insp"><h3>Inspector</h3><div class="ib"></div></section>
<section class="val"><h3>Problems<span class="n"></span></h3><ul class="vl"></ul></section></aside>
<footer><span class="srv"></span><span class="st"></span><label><input type="checkbox" data-a="auto" checked> autosave</label><span class="msg"></span><span class="gap"></span><span class="pos"></span></footer>`;
  const badge=document.createElement('div');badge.className='tge-badge';badge.hidden=true;badge.innerHTML='<span></span><button type="button">Back to editor (Esc)</button>';
  document.body.append(el,badge);
  const cv=el.querySelector('main canvas');
  E={api,groot,el,badge,cv,ctx:cv.getContext('2d'),rooms:[],cur:null,tool:'brush',prev:'brush',glyph:'#',grid:1,light:0,auto:1,anc:4,
    srv:null,saving:0,err:'',msg:null,probs:[],sel:null,hover:null,drag:null,space:0,arm:0,playing:0,raf:0,ui:1,props:1,
    $:s=>el.querySelector(s),$$:s=>el.querySelectorAll(s),zv:el.querySelector('.zv')};
  el.hidden=true;
  try{E.rooms=await loadAll()}catch(e){el.remove();badge.remove();E=null;throw e}
  E.cur=E.rooms[0];
  window.__editor={E,V};   /* QA hook, like window.__game */
  bind();
  new ResizeObserver(()=>req()).observe(cv);
  requestAnimationFrame(fit);
  return E;
}

function bind(){
  const {el,cv}=E;
  const tileAt=e=>{const b=cv.getBoundingClientRect(),wx=(e.clientX-b.left)/V.z+V.x,wy=(e.clientY-b.top)/V.z+V.y,X=Math.floor(wx/T),Y=Math.floor(wy/T),r=E.cur;
    return {X,Y,tx:X-r.src.at[0],ty:Y-r.src.at[1],in:inRoom(r,X-r.src.at[0],Y-r.src.at[1])}};
  const roomAt=(X,Y)=>E.rooms.find(r=>inRoom(r,X-r.src.at[0],Y-r.src.at[1]));
  const pick=p=>{E.glyph=at(E.cur,p.tx,p.ty);msg(`Picked ${NAMES[E.glyph]}`);E.ui=1};
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  cv.addEventListener('pointerdown',e=>{
    el.focus({preventScroll:true});
    const p=tileAt(e),r=E.cur;cv.setPointerCapture(e.pointerId);
    if(e.button===1||(e.button===0&&E.space)){e.preventDefault();E.drag={k:'pan',x:e.clientX,y:e.clientY,vx:V.x,vy:V.y};cv.style.cursor='grabbing';return}
    if(e.button===2){if(p.in)pick(p);req();return}
    if(e.button!==0)return;
    if(E.arm){E.arm=0;E.ui=1;if(p.in)play(r,p.tx,p.ty);else msg('Pick a tile inside the room','warn');return}
    const t=E.tool;
    if(t==='move'){mark(r);E.drag={k:'move',r,a:p,at:r.src.at.slice()};return}
    if(!p.in){if(t==='select'){const o=roomAt(p.X,p.Y);if(o)switchTo(o)}return}
    if(t==='brush'||t==='erase'){mark(r);const ch=t==='erase'?'.':E.glyph;E.drag={k:'paint',r,last:p,ch,n:put(r,p.tx,p.ty,ch)};if(ENTS.includes(ch))E.sel={tx:p.tx,ty:p.ty};changed(r)}
    else if(t==='rect')E.drag={k:'rect',a:p,b:p,outline:e.shiftKey};
    else if(t==='fill'){mark(r);if(flood(r,p.tx,p.ty,E.glyph))changed(r);else unmark(r)}
    else if(t==='pick'){pick(p);setTool(E.prev||'brush')}
    else if(t==='select'){E.sel={tx:p.tx,ty:p.ty};if(ENTS.includes(at(r,p.tx,p.ty)))E.drag={k:'ent',a:p,b:p};E.ui=1}
    req();
  });
  cv.addEventListener('pointermove',e=>{
    const p=tileAt(e),d=E.drag;E.hover=p;
    E.$('.pos').textContent=`room ${p.tx},${p.ty}${p.in?' '+JSON.stringify(at(E.cur,p.tx,p.ty)):''} · world ${p.X},${p.Y}`;
    if(d&&d.k==='pan'){V.x=d.vx-(e.clientX-d.x)/V.z;V.y=d.vy-(e.clientY-d.y)/V.z}
    else if(d&&d.k==='paint'){d.n+=line(d.r,d.last,p,d.ch);d.last=p;if(d.n)changed(d.r)}
    else if(d&&(d.k==='rect'||d.k==='ent'))d.b=p;
    else if(d&&d.k==='move'){const nx=d.at[0]+p.X-d.a.X,ny=d.at[1]+p.Y-d.a.Y;if(nx!==d.r.src.at[0]||ny!==d.r.src.at[1]){d.r.src.at=[nx,ny];E.props=1;changed(d.r)}}
    req();
  });
  const up=()=>{
    const d=E.drag,r=E.cur;E.drag=null;cv.style.cursor=E.space?'grab':'';if(!d)return;
    if(d.k==='paint'&&!d.n)unmark(d.r);
    if(d.k==='move'&&d.r.src.at[0]===d.at[0]&&d.r.src.at[1]===d.at[1])unmark(d.r);
    if(d.k==='rect'){mark(r);let n=0;const [a,b,c,f]=[Math.min(d.a.tx,d.b.tx),Math.min(d.a.ty,d.b.ty),Math.max(d.a.tx,d.b.tx),Math.max(d.a.ty,d.b.ty)];
      for(let j=b;j<=f;j++)for(let i=a;i<=c;i++)if(!d.outline||i===a||i===c||j===b||j===f)n+=put(r,i,j,E.glyph);n?changed(r):unmark(r)}
    if(d.k==='ent'&&(d.a.tx!==d.b.tx||d.a.ty!==d.b.ty)&&d.b.in){mark(r);moveEnt(r,d.a,d.b);E.sel={tx:d.b.tx,ty:d.b.ty};changed(r)}
    req();
  };
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  cv.addEventListener('pointerleave',()=>{E.hover=null;req()});
  cv.addEventListener('dblclick',e=>{const p=tileAt(e);if(p.in)return;const o=roomAt(p.X,p.Y);if(o)switchTo(o)});
  cv.addEventListener('wheel',e=>{e.preventDefault();const b=cv.getBoundingClientRect();
    if(e.ctrlKey||e.metaKey)zoomAt(e.clientX-b.left,e.clientY-b.top,Math.exp(-clamp(e.deltaY*(e.deltaMode?33:1),-50,50)*.01));
    else{V.x+=e.deltaX/V.z;V.y+=e.deltaY/V.z;req()}},{passive:false});

  el.addEventListener('click',e=>{
    const b=e.target.closest('button,li');if(!b||!el.contains(b))return;
    if(b.dataset.t)return setTool(b.dataset.t);
    if(b.dataset.g){E.glyph=b.dataset.g;if(!['brush','rect','fill'].includes(E.tool))setTool('brush');E.ui=1;return req()}
    if(b.closest('.anc')){E.anc=[...b.parentNode.children].indexOf(b);E.props=1;E.ui=1;return req()}
    if(b.dataset.i)return switchTo(E.rooms[+b.dataset.i]);
    if(b.dataset.p&&b.tagName==='LI'){const p=E.probs[+b.dataset.p],r=p&&E.rooms.find(q=>q.src.id===p.id);if(!r)return;if(r!==E.cur)switchTo(r);
      if(p.tx!=null){E.sel={tx:p.tx,ty:p.ty};V.x=(r.src.at[0]+p.tx+.5)*T-cv.clientWidth/2/V.z;V.y=(r.src.at[1]+p.ty+.5)*T-cv.clientHeight/2/V.z;E.ui=1;req()}return}
    if(b.dataset.x!==undefined&&E.sel)return delField(E.cur,E.sel.tx,E.sel.ty,b.dataset.x);
    if(b.dataset.add&&E.sel)return setField(E.cur,E.sel.tx,E.sel.ty,b.dataset.add,b.dataset.v);
    const a=b.dataset.a,r=E.cur;
    if(a==='addf'&&E.sel){const k=E.$('[data-nk]').value.trim(),v=E.$('[data-nv]').value.trim();if(k&&v)setField(r,E.sel.tx,E.sel.ty,k,v)}
    else if(a==='undo')undo();else if(a==='redo')redo();
    else if(a==='grid'){E.grid=!E.grid;E.ui=1;req()}
    else if(a==='light'){E.light=E.light?0:1;E.ui=1;req()}
    else if(a==='zin')zoomAt(cv.clientWidth/2,cv.clientHeight/2,1.5);else if(a==='zout')zoomAt(cv.clientWidth/2,cv.clientHeight/2,1/1.5);else if(a==='fit')fit();
    else if(a==='play'){E.arm=!E.arm;E.ui=1;req()}
    else if(a==='save')saveAll(true);else if(a==='copy')copyModule();else if(a==='close')close();
    else if(a==='new')newRoom();else if(a==='dup')dupRoom();else if(a==='del')delRoom();
    else if(a==='resize'){const w=+E.$('[data-p=w]').value,h=+E.$('[data-p=h]').value;
      if(!(Number.isInteger(w)&&Number.isInteger(h)&&w>=1&&h>=1&&w<=128&&h<=128))return msg('Size: whole numbers 1-128','err');
      if(w===W_(r)&&h===H_(r))return;mark(r);resize(r,w,h,(E.anc%3)/2,(E.anc/3|0)/2);E.sel=null;changed(r,1);fit()}
  });
  el.addEventListener('change',e=>{
    const t=e.target,k=t.dataset.p,r=E.cur,v=t.value;
    if(t.dataset.a==='auto'){E.auto=t.checked;autosave();return}   /* autosave() also cancels a pending save */
    if(t.dataset.f!==undefined&&E.sel)return setField(r,E.sel.tx,E.sel.ty,t.dataset.f,v.trim());
    if(!k||k==='w'||k==='h')return;
    const bad=m=>{t.classList.add('bad');msg(m,'err')},set=f=>{mark(r);f();changed(r,1)};
    if(k==='name'){if(!RE.name.test(v))return bad('Name: 1-40 letters, digits, spaces or .,!?:;()&-');set(()=>r.src.name=v)}
    else if(k==='id'){if(!RE.id.test(v))return bad('Id: 1-16 lowercase letters or digits, starting with a letter');
      if(E.rooms.some(q=>q!==r&&(q.src.id===v||(r.fresh&&q.file===v))))return bad(`'${v}' is already used`);set(()=>{r.src.id=v;if(r.fresh)r.file=v})}
    else if(k==='biome')set(()=>r.src.biome=v);
    else if(k==='ax'||k==='ay'){const n=+v;if(!Number.isInteger(n)||Math.abs(n)>5000)return bad('World position: whole numbers -5000..5000');set(()=>r.src.at[k==='ax'?0:1]=n)}
    else if(k==='comment'){const c=v.replace(/\r/g,'');if(check({...r.src},c))return bad(check({...r.src},c));set(()=>r.comment=c)}
  });
  E.$('.ib').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset.nv!==undefined)E.$('[data-a=addf]').click()});
  E.badge.querySelector('button').addEventListener('click',stopPlay);

  const typing=t=>/INPUT|TEXTAREA|SELECT/.test(t.tagName);
  addEventListener('keydown',e=>{
    if(!E)return;
    if(E.playing){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();stopPlay()}return}
    if(el.hidden)return;
    const mod=e.metaKey||e.ctrlKey,k=e.key.toLowerCase();
    if(mod&&k==='s'){e.preventDefault();e.stopPropagation();saveAll(true);return}
    if(typing(e.target)){if(e.key==='Escape')el.focus({preventScroll:true});return}
    e.stopPropagation();   /* keys meant for the editor never reach the game (the OS listens on window) */
    if(mod&&k==='z'){e.preventDefault();e.shiftKey?redo():undo();return}
    if(mod&&k==='y'){e.preventDefault();redo();return}
    if(mod||e.altKey)return;
    if(e.code==='Space'){e.preventDefault();if(!E.space){E.space=1;cv.style.cursor='grab';req()}return}
    const t=TOOLS.find(t=>t[2].toLowerCase()===k);if(t)return setTool(t[0]);
    if(k==='g'){E.grid=!E.grid;E.ui=1;req()}
    else if(k==='l'){E.light=E.light?0:1;E.ui=1;req()}
    else if(k==='0')fit();
    else if(k==='='||k==='+')zoomAt(cv.clientWidth/2,cv.clientHeight/2,1.5);
    else if(k==='-')zoomAt(cv.clientWidth/2,cv.clientHeight/2,1/1.5);
    else if(k==='p'){const h=E.hover;if(h&&h.in)play(E.cur,h.tx,h.ty);else{E.arm=1;E.ui=1;req()}}
    else if(k==='escape'){E.arm=0;E.sel=null;E.ui=1;req()}
    else if((k==='delete'||k==='backspace')&&E.sel){const r=E.cur;mark(r);put(r,E.sel.tx,E.sel.ty,'.')?changed(r):unmark(r)}
  },true);
  addEventListener('keyup',e=>{if(E&&e.code==='Space'&&E.space){E.space=0;cv.style.cursor='';req()}},true);
  addEventListener('beforeunload',e=>{if(E&&E.rooms.some(dirty)){e.preventDefault();e.returnValue=''}});
}
