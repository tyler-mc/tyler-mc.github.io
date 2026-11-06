/* Room file format and level checks for the editor. No DOM, so tools/test_rooms.mjs runs it under node.
   serialize() writes byte-for-byte what tools/dev_server.py writes; check() mirrors the server's limits;
   problems() is the editor's live validation list. */
export const GLYPHS='#=.~^STPGIMOFBH',BIOMES=['hub','roots','flood','molten','crystals'],MAXG=128;
export const NAMES={'#':'Rock','=':'Rubble','.':'Air','~':'Water','^':'Thorns',S:'Start',T:'Torch',P:'Pressure plate',G:'Gate',I:'Item',M:'Mossback',O:'Spore puff',F:'Fragment pedestal',B:'Perch',H:'Hermit crab'};
export const RE={file:/^[a-z][a-z0-9_-]{0,31}$/,id:/^[a-z][a-z0-9]{0,15}$/,name:/^[A-Za-z0-9 .,!?:;()&-]{1,40}$/,key:/^[a-z][A-Za-z]{0,11}$/,str:/^[A-Za-z0-9_-]{1,24}$/};
const isInt=(v,lo,hi)=>Number.isInteger(v)&&v>=lo&&v<=hi;

/* the text between the leading "/* " and " *\/" of a room file ('' when there is none) */
export const headerComment=text=>{const m=/^\/\* ([\s\S]*?) \*\/\n/.exec(text);return m?m[1]:''};

const val=v=>typeof v==='string'?`'${v}'`:String(v);
export function serialize(r,comment){
  const ents=(r.ents||[]).map(e=>'{'+[['at',e.at],...Object.entries(e).filter(([k])=>k!=='at')]
    .map(([k,v])=>k+':'+(k==='at'?`[${v[0]},${v[1]}]`:val(v))).join(',')+'}').join(',');
  return (comment?`/* ${comment} */\n`:'')+`export default {\n  id:'${r.id}',name:'${r.name}',biome:'${r.biome}',at:[${r.at[0]},${r.at[1]}],\n`+
    `  grid:[\n${r.grid.map(s=>`    '${s}',\n`).join('')}  ],\n  ents:[${ents}],\n};\n`;
}

/* the server's rules: returns a message, or '' when the room would save */
export function check(r,comment=''){
  if(!RE.id.test(r.id||''))return 'id must be 1-16 lowercase letters/digits, starting with a letter';
  if(!RE.name.test(r.name||''))return "name must be 1-40 characters: letters, digits, space and .,!?:;()&-";
  if(!BIOMES.includes(r.biome))return 'unknown biome';
  if(!r.at||!isInt(r.at[0],-5000,5000)||!isInt(r.at[1],-5000,5000))return 'at must be whole numbers -5000..5000';
  const g=r.grid,w=g[0]?g[0].length:0;
  if(!g.length||g.length>MAXG||!w||w>MAXG||g.some(s=>s.length!==w))return 'grid must be 1-128 rows of equal width 1-128';
  if(g.some(s=>[...s].some(c=>!GLYPHS.includes(c))))return 'grid has an unknown tile';
  if((r.ents||[]).length>64)return 'at most 64 ents';
  for(const e of r.ents||[]){
    if(!e.at||!isInt(e.at[0],0,w-1)||!isInt(e.at[1],0,g.length-1))return 'an ent sits outside the grid';
    for(const [k,v] of Object.entries(e))if(k!=='at'&&(!RE.key.test(k)||(typeof v==='string'?!RE.str.test(v):!isInt(v,-1000,1000))))return `ent field ${k} must be a whole number or a short word`;
  }
  if(comment&&(comment.length>800||/\/\*|\*\//.test(comment)||/[^\n\x20-\x7e]/.test(comment)))return 'comment must be plain ASCII under 800 characters, without comment markers';
  return '';
}

/* ---------- live validation ---------- */
const open=c=>c!=='#'&&c!=='=';
const solid=c=>c==='#'||c==='='||c==='G';
const runs=xs=>{const o=[];for(const x of xs.sort((a,b)=>a-b)){const l=o[o.length-1];if(l&&x===l[1]+1)l[1]=x;else o.push([x,x])}return o};
const span=([a,b])=>a===b?`${a}`:`${a}-${b}`;
/* rooms: [{id,name,biome,at,grid,ents}] in registry order. Returns [{lv:'err'|'warn',id,tx,ty,msg}] (tx,ty room-local) */
export function problems(rooms){
  const out=[],add=(lv,r,tx,ty,msg)=>out.push({lv,id:r.id,tx,ty,msg});
  const box=r=>({x:r.at[0],y:r.at[1],w:r.grid[0].length,h:r.grid.length});
  const at=(wx,wy)=>{for(const r of rooms){const b=box(r);if(wx>=b.x&&wy>=b.y&&wx<b.x+b.w&&wy<b.y+b.h)return [r,r.grid[wy-b.y][wx-b.x]]}return [null,null]};
  const ids=new Map();
  rooms.forEach((r,i)=>{
    const e=check(r);if(e)add('err',r,null,null,e);
    if(ids.has(r.id))add('err',r,null,null,`id '${r.id}' is used twice`);ids.set(r.id,1);
    if(e&&/grid/.test(e))return;
    const g=r.grid,H=g.length,W=g[0].length,c=(x,y)=>x<0||y<0||x>=W||y>=H?'#':g[y][x],count={};
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const ch=g[y][x];count[ch]=(count[ch]||0)+1;
      if(ch==='S'&&solid(c(x,y-1)))add('warn',r,x,y,'Start is under a ceiling (the mascot is 2 tiles tall)');
      if(ch==='T'&&solid(c(x,y-1))&&solid(c(x,y+1))&&solid(c(x-1,y))&&solid(c(x+1,y)))add('warn',r,x,y,'Torch is walled in: nowhere to respawn');
      if(ch==='M'&&![[0,1],[0,-1],[1,0],[-1,0]].some(([a,b])=>solid(c(x+a,y+b))||c(x+a,y+b)==='^'))add('warn',r,x,y,'Mossback has no surface to crawl on');
      if(ch==='P'&&!solid(c(x,y+1)))add('warn',r,x,y,'Pressure plate floats: no floor under it');
      if(ch==='F'&&!solid(c(x,y+1)))add('warn',r,x,y,'Fragment pedestal floats: no floor under it');
      if(ch==='B'&&!solid(c(x,y+1)))add('warn',r,x,y,'Perch floats: no floor under it');
      if(ch==='H'&&!solid(c(x,y+1)))add('warn',r,x,y,'Hermit crab floats: no floor under it');
      if(ch==='B'&&solid(c(x,y-1)))add('warn',r,x,y,'Perch is under a ceiling (the mascot is 2 tiles tall)');
      if(ch==='F'&&!BIOMES.slice(1).includes(r.biome))add('warn',r,x,y,'Fragment pedestal outside a biome: it holds that biome\'s fragment');
      if(ch==='O'){const e=(r.ents||[]).find(e=>e.at[0]===x&&e.at[1]===y),amp=e&&Number.isInteger(e.amp)?e.amp:12;
        for(let yy=Math.floor((y*12-amp)/12);yy<=Math.floor((y*12+11+amp)/12);yy++)if(solid(c(x,yy))){add('warn',r,x,y,`Spore puff bobs into rock (amp ${amp})`);break}}
    }
    if(i===0&&!count.S)add('err',r,null,null,'No start (S) in the first room');
    if(i>0&&count.S)add('warn',r,null,null,'Start (S) outside the first room is ignored');
    if(i===0&&count.S>1)add('warn',r,null,null,'More than one start (S)');
    if(!count.T)add('err',r,null,null,'Torch missing: warps and respawns need one');
    if(count.G&&!count.P)add('err',r,null,null,'Gate without a pressure plate: it never opens');
    if(count.P&&!count.G)add('warn',r,null,null,'Pressure plate without a gate');
    for(const e of r.ents||[]){const ch=c(e.at[0],e.at[1]);if(!'MOIBH~'.includes(ch))add('warn',r,e.at[0],e.at[1],`Ent data on a '${ch}' tile does nothing`)}
    /* edges: every open edge tile must meet an open tile in the room next door */
    const b=box(r),bad={},touch=new Set(),note=(side,k,n,v)=>{const key=side+'|'+k+'|'+(n?n.id:'');(bad[key]=bad[key]||{side,k,n,v:[]}).v.push(v)};
    const edge=(side,tx,ty,wx,wy,v)=>{const ch=g[ty][tx],[n,nc]=at(wx,wy);if(n)touch.add(n.id);if(!open(ch))return;
      if(!n)note(side,'none',null,v);else if(!open(nc))note(side,'shut',n,v)};
    for(let y=0;y<H;y++){edge('left',0,y,b.x-1,b.y+y,y);edge('right',W-1,y,b.x+W,b.y+y,y)}
    for(let x=0;x<W;x++){edge('top',x,0,b.x+x,b.y-1,x);edge('bottom',x,H-1,b.x+x,b.y+H,x)}
    for(const {side,k,n,v} of Object.values(bad))for(const s of runs(v)){
      const [tx,ty]=side==='left'?[0,s[0]]:side==='right'?[W-1,s[0]]:side==='top'?[s[0],0]:[s[0],H-1],what=side==='left'||side==='right'?'rows':'columns';
      if(k==='none')add('warn',r,tx,ty,`${side} edge is open at ${what} ${span(s)} but no room is there`);
      else add('warn',r,tx,ty,`${side} edge is open at ${what} ${span(s)} but ${n.id} is rock there`);
    }
    if(rooms.length>1&&!touch.size)add('warn',r,null,null,'Touches no other room');
    for(const q of rooms.slice(i+1)){const a=box(q);
      if(b.x<a.x+a.w&&b.x+b.w>a.x&&b.y<a.y+a.h&&b.y+b.h>a.y)add('err',r,null,null,`Overlaps ${q.id}`)}
  });
  return out;
}
