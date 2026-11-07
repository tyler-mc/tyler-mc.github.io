/* Debug panel (localhost or ?qa only): warp, item and piece grants, reset save, room editor. */
import {ROOMS,ORDER} from '../rooms/index.js';
import {FEEL,ACC,DEC,AACC,ADEC,AREV,RUN,CORNER,HIT,LEAD,STRIDE} from '../player.js';
const CSS=`.tg-dev{position:absolute;left:4px;bottom:4px;z-index:9;font:11px/1.4 ui-monospace,Menlo,monospace;color:#ddd}
.tg-dev>button{font:inherit;padding:1px 6px;background:#222;color:#aaa;border:1px solid #444;opacity:.6;cursor:pointer}
.tg-dev>button:hover{opacity:1}
.tg-dev .b{display:none;margin-bottom:4px;padding:6px 8px;background:rgba(10,10,12,.92);border:1px solid #444;max-width:220px;max-height:calc(100vh - 44px);overflow-y:auto;overscroll-behavior:contain}
.tg-dev.open .b{display:block}
.tg-dev .b button{font:inherit;margin:0 3px 3px 0;padding:1px 5px;background:#333;color:#eee;border:1px solid #555;cursor:pointer}
.tg-dev .b button:hover{background:#555}
.tg-dev h4{margin:4px 0 2px;font:inherit;color:#888;text-transform:uppercase;letter-spacing:.05em}
.tg-dev .wl h5{margin:5px 0 2px;font:inherit;color:#7a9;letter-spacing:.04em}
.tg-dev .f{display:flex;align-items:center;gap:4px;margin:0}
.tg-dev .f span{width:3.8em}.tg-dev .f input{flex:1;min-width:0;margin:0}.tg-dev .f output{width:2.6em;text-align:right}
.tg-dev label{margin-right:6px;white-space:nowrap}`;
const PIECES=['Roots','Flood','Molten','Crystals'];

export default function devPanel(root,api){
  if(!document.getElementById('tg-dev-css')){const s=document.createElement('style');s.id='tg-dev-css';s.textContent=CSS;document.head.appendChild(s)}
  const d=document.createElement('div');d.className='tg-dev';
  /* warp list read from the live registry each time the panel opens, so rooms the editor adds or renames show up */
  /* grouped by biome in registry order (a new room lands under its biome with no code change); the panel scrolls, so a long list stays reachable */
  const warps=()=>{const btn=([id,n])=>`<button data-w="${id}">${n}</button>`,groups=new Map([['story',[['intro','Intro'],['dark','Dark'],['chase','Chase']]]]);
    for(const id of ORDER){const R=ROOMS[id];if(!R)continue;if(!groups.has(R.biome))groups.set(R.biome,[]);groups.get(R.biome).push([id,`${R.name} · ${id}`])}
    return [...groups].map(([g,l])=>`<h5>${g}</h5>${l.map(btn).join('')}`).join('')};
  d.innerHTML=`<div class="b"><h4>Warp</h4><div class="wl">${warps()}</div>
<h4>Items</h4><label><input type="checkbox" data-i="root"> root jump</label><label><input type="checkbox" data-i="board"> board</label><label><input type="checkbox" data-i="forged"> forged board</label><label><input type="checkbox" data-i="claws"> vine claws</label>
<h4>Pieces</h4>${PIECES.map((n,i)=>`<label><input type="checkbox" data-p="${i}"> ${n}</label>`).join('')}
<h4>In the door</h4>${PIECES.map((n,i)=>`<label><input type="checkbox" data-d="${i}"> ${n}</label>`).join('')}
<h4>Fairness</h4><label><input type="checkbox" data-a> Assist (slower chases)</label><button data-s>Stuck hint now</button>
<h4>Save</h4><button data-r>Reset save</button>
<h4>Rooms</h4><button data-ed>Editor</button></div><button type="button" class="t">dev</button>`;
  root.appendChild(d);
  /* room debug name: always on the dev button, logged on every room change, and __rooms() prints the table */
  const tag=d.querySelector('.t'),nm=id=>ROOMS[id]?`${ROOMS[id].name} · ${id}`:String(id);
  let seen=null;
  const show=()=>{const r=api.state().room;if(r===seen)return;seen=r;tag.textContent='dev · '+nm(r);console.info('%c[room] '+nm(r),'color:#7c7;font-weight:bold',ROOMS[r]?{biome:ROOMS[r].biome,at:ROOMS[r].at,size:[ROOMS[r].w,ROOMS[r].h]}:'')};
  const loop=()=>{if(!d.isConnected)return;show();requestAnimationFrame(loop)};loop();
  window.__rooms=()=>console.table(ORDER.filter(id=>ROOMS[id]).map(id=>({id,name:ROOMS[id].name,biome:ROOMS[id].biome,at:ROOMS[id].at.join(','),w:ROOMS[id].w,h:ROOMS[id].h,here:id===api.state().room?'<<':''})));
  const sync=()=>{const S=api.state();d.querySelectorAll('[data-i]').forEach(c=>c.checked=!!S.items[c.dataset.i]);d.querySelectorAll('[data-p]').forEach(c=>c.checked=!!S.pieces[+c.dataset.p]);
    d.querySelectorAll('[data-d]').forEach(c=>c.checked=!!S.placed[+c.dataset.d]);d.querySelector('[data-a]').checked=!!S.assist};
  d.querySelector('.t').addEventListener('click',()=>{d.classList.toggle('open');d.querySelector('.wl').innerHTML=warps();sync()});
  d.addEventListener('click',e=>{
    const w=e.target.closest('[data-w]');if(w){api.warp(w.dataset.w);sync()}
    if(e.target.closest('[data-ed]')){d.classList.remove('open');import(new URL('../editor.js',import.meta.url).href).then(m=>m.open(api,root)).catch(e=>console.warn('editor',e))}
    if(e.target.closest('[data-r]')&&confirm('Reset the game save?')){api.reset();sync()}
    if(e.target.closest('[data-s]')){api.stuck();d.classList.remove('open')}
  });
  d.addEventListener('change',e=>{const c=e.target;if(c.dataset.i)api.grant(c.dataset.i,c.checked);if(c.dataset.p)api.piece(+c.dataset.p,c.checked);
    if(c.dataset.d)api.place(+c.dataset.d,c.checked);if(c.dataset.a!==undefined)api.assist(c.checked);sync()});
  /* Feel: live sliders for the run, turn, corner, hit-stop, camera-lead and walk-stride numbers in player.js FEEL. A change writes FEEL at once,
     so it applies on the next step; nothing is saved. Reset puts back the defaults; Copy values gives the object as text
     for player.js. */
  const FK={ACC:[.05,.6,.01,ACC],DEC:[.05,.8,.01,DEC],AACC:[.02,.4,.01,AACC],ADEC:[.01,.4,.01,ADEC],AREV:[.02,.4,.01,AREV],RUN:[.8,3,.05,RUN],CORNER:[0,6,1,CORNER],HIT:[0,8,1,HIT],LEAD:[0,1,1,LEAD],STRIDE:[3,12,1,STRIDE]};
  d.querySelector('.b').insertAdjacentHTML('beforeend',`<h4>Feel</h4>${Object.entries(FK).map(([k,[a,b,s]])=>`<label class="f"><span>${k}</span><input type="range" data-f="${k}" min="${a}" max="${b}" step="${s}"><output></output></label>`).join('')}<button data-fr>Reset</button><button data-fc>Copy values</button>`);
  const fnum=v=>String(+v.toFixed(3)).replace(/^(-?)0\./,'$1.');
  const fsync=()=>d.querySelectorAll('[data-f]').forEach(c=>{c.value=FEEL[c.dataset.f];c.nextElementSibling.textContent=fnum(FEEL[c.dataset.f])});fsync();
  d.addEventListener('input',e=>{const k=e.target.dataset.f;if(k){FEEL[k]=+e.target.value;e.target.nextElementSibling.textContent=fnum(FEEL[k])}});
  d.addEventListener('click',e=>{if(e.target.closest('.t'))fsync();
    if(e.target.closest('[data-fr]')){for(const k in FK)FEEL[k]=FK[k][3];fsync()}
    const b=e.target.closest('[data-fc]');if(b){const t=`{${Object.keys(FK).map(k=>k+':'+fnum(FEEL[k])).join(',')}}`,done=()=>{b.textContent='Copied';setTimeout(()=>b.textContent='Copy values',900)};
      try{navigator.clipboard.writeText(t).then(done,()=>console.log('[feel]',t))}catch{console.log('[feel]',t)}}});
  /* keep keyboard focus on the game after using the panel */
  d.addEventListener('pointerdown',e=>e.stopPropagation());
  d.addEventListener('click',()=>root.focus({preventScroll:true}));
}
