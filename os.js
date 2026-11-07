/* Tyler OS: the desktop. Hand-edited. Data comes from os-data.js (tools/build_os.py); project pages are fetched. */

(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
let reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
/* the mascot's cell (mascot/atlas.js): 40x64 art pixels, shoe soles on row SOLE, the head tip (where he is held and where the bubble points) on row TIPROW at rest */
const {W:CELL_W,H:CELL_H,SOLE}=window.MASCOT,TIPROW=32,TIPX=22;   /* the resting head tip's cap centre: column 22 (tip x 20 + 2), row 32 */
const isMobile=()=>matchMedia('(max-width:700px)').matches;
const canHover=matchMedia('(hover:hover)').matches;
const INK='#1A1716', RED='#FF3333';
const desk=$('#desk');
const B4=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const B8=[0,32,8,40,2,34,10,42,48,16,56,24,50,18,58,26,12,44,4,36,14,46,6,38,60,28,52,20,62,30,54,22,3,35,11,43,1,33,9,41,51,19,59,27,49,17,57,25,15,47,7,39,13,45,5,37,63,31,55,23,61,29,53,21];
const store={get(k){try{return sessionStorage.getItem(k)}catch(_){return null}},set(k,v){try{sessionStorage.setItem(k,v)}catch(_){}}};
let rs=11;const rnd=()=>(rs=(rs*16807)%2147483647)/2147483647;
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
/* analytics: analytics.js wraps Umami; the stub keeps the desktop working if that file did not load */
const NOP=()=>{};
const TK=window.TK||{landing:NOP,open:NOP,track:NOP,discover:NOP,trackOnce:NOP,quiet:f=>f(),onHide:NOP,log:[],debug:false};
let viaNext=null;
const reads=new Set();
/* how a window was opened, from the element that opened it (none: the menu, the mascot or the code) */
function viaOf(src){
  if(viaNext)return viaNext;
  if(!src||!src.classList)return 'sys';
  return src.closest('[data-p]')?'card':src.classList.contains('icon')||src.classList.contains('item')?'icon':src.closest('[data-slug]')||src.tagName==='A'?'link':'sys';
}
/* which icon was dragged: a project id, or the element's own id */
function itemKey(it){return (it&&(it.dataset.p||it.id||(it.dataset.mail!==undefined?'mail':'')))||'item'}

/* ================= pixel art: tiny painter -> crisp SVG ================= */
const PAL={N:'#0A66C2',Q:'#3DD16F',J:'#1F9D55',k:INK,w:'#FFFFFF',c:'#FBF6EA',g:'#C0C0C0',e:'#A4A4A4',G:'#999999',x:'#555555',y:'#FFE38A',Y:'#F6B92B',o:'#C77F0E',
  r:RED,R:'#B3121B',p:'#FF9A8E',D:'#6E0C12',t:'#7FE0D3',T:'#2FB3A6',q:'#0F766E',b:'#F08A5D',B:'#C8552E',n:'#7A2E14',
  l:'#CCCCFF',L:'#6F6FB0',v:'#000080',h:'#FFFFFF',f:'#C0C0C0',s:'#808080',a:INK,m:'#AAAAAA',u:'#CCCCCC'};
function art(w,h,fn){
  const g=Array.from({length:h},()=>Array(w).fill('.'));
  const P=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<w&&y<h)g[y][x]=c};
  const R=(x,y,ww,hh,c)=>{for(let j=0;j<hh;j++)for(let i=0;i<ww;i++)P(x+i,y+j,c)};
  const D=(cx,cy,r,c)=>{for(let y=0;y<h;y++)for(let x=0;x<w;x++){const dx=x+.5-cx,dy=y+.5-cy;if(dx*dx+dy*dy<=r*r)g[y][x]=c}};
  const get=(x,y)=>(g[y]||[])[x];
  const O=(c='k')=>{const add=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(g[y][x]==='.'&&[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>{const v=get(x+a,y+b);return v&&v!=='.'&&v!==c}))add.push([x,y]);add.forEach(([x,y])=>g[y][x]=c)};
  fn({P,R,D,get,O,w,h});return g.map(r=>r.join(''));
}
function paths(rows){const by={};rows.forEach((row,y)=>{let x=0;while(x<row.length){const c=row[x];if(c==='.'){x++;continue}let e=x;while(e<row.length&&row[e]===c)e++;(by[c]=by[c]||[]).push(`M${x} ${y}h${e-x}v1h${x-e}z`);x=e}});return by}
function svg(rows,scale=1,{cls='',classes=false,fill=null,xmlns=false}={}){
  const by=paths(rows),w=rows[0].length,h=rows.length;let o='';
  if(fill)o=`<path fill="${fill}" d="${Object.values(by).flat().join('')}"/>`;
  else for(const c in by)o+=classes?`<path class="p${c}" d="${by[c].join('')}"/>`:`<path fill="${PAL[c]}" d="${by[c].join('')}"/>`;
  return `<svg${xmlns?' xmlns="http://www.w3.org/2000/svg"':''} class="px ${cls}" viewBox="0 0 ${w} ${h}" width="${w*scale}" height="${h*scale}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${o}</svg>`;
}
const uri=s=>`url("data:image/svg+xml,${encodeURIComponent(s)}")`;
const svgU=(rows,scale=1)=>uri(svg(rows,scale,{xmlns:true}));
const T=rows=>rows[0].split('').map((_,x)=>rows.map(r=>r[x]).join(''));   /* transpose */

/* ---------- 32x32 desktop icons ---------- */
function folder(L,M,Dk,back,front){return art(32,32,a=>{const{P,R}=a;
  R(2,6,11,1,'k');R(1,7,1,21,'k');P(13,7,'k');R(14,8,16,1,'k');R(30,9,1,19,'k');R(1,28,30,1,'k');
  R(2,7,11,1,L);R(2,8,12,1,M);R(2,9,28,3,Dk);
  back&&back(a);
  R(1,12,30,1,'k');R(2,13,28,15,M);R(2,13,28,1,L);R(2,13,1,15,L);R(2,27,28,1,Dk);R(29,14,1,13,Dk);
  front&&front(a)})}
/* the Trash with its lid lifted and two eyes looking out of the dark (blink 'off': just the dark, no eyes, for when the mascot himself pops out) */
function trashArt(blink){return art(32,32,({R,P})=>{
  R(8,2,20,1,'k');R(7,3,1,3,'k');R(28,3,1,3,'k');R(8,6,20,1,'k');R(8,3,20,3,'g');R(8,3,20,1,'w');R(8,5,20,1,'G');
  R(7,8,18,4,'k');
  if(blink==='off'){}else if(blink){R(11,10,3,1,'w');R(18,10,3,1,'w')}else{R(11,9,3,3,'w');R(18,9,3,3,'w');P(12,11,'k');P(19,11,'k')}
  for(let y=12;y<=28;y++){const l=7+Math.floor((y-12)/9),r=24-Math.floor((y-12)/9);P(l,y,'k');P(r,y,'k');R(l+1,y,r-l-1,1,'g');
    for(let x=l+1;x<r;x++){const f=(x-l)/(r-l);if((f>.78&&(x+y)%2===0)||(f>.6&&f<=.78&&x%2===0&&y%2===0))P(x,y,'G')}
    if(y>13&&y<27){P(11,y,'G');P(12,y,'w');P(16,y,'G');P(17,y,'w')}}
  R(9,29,14,1,'k');P(8,28,'k');P(23,28,'k')})}
const ICON={
 work:folder('y','Y','o',null,({P})=>{for(let x=7;x<=24;x++){const yy=19+Math.round(Math.sin((x-7)/17*Math.PI*4)*2);P(x,yy,'r');P(x,yy+1,'R')}}),
 view:art(32,32,({R,P})=>{R(4,4,24,19,'k');R(5,5,22,17,'g');R(6,6,20,15,'k');R(7,7,18,13,'q');
   for(let y=8;y<19;y+=2)R(7,y,18,1,'T');R(9,9,5,1,'t');R(9,11,8,1,'t');R(9,13,6,1,'t');R(9,15,3,1,'y');R(5,5,22,1,'w');
   R(12,23,8,2,'k');R(13,23,6,1,'x');R(8,25,16,3,'k');R(9,25,14,2,'g');R(9,25,14,1,'w');P(23,26,'r')}),
 how:art(32,32,({R,P})=>{R(6,5,20,24,'k');R(7,6,18,22,'B');R(7,6,18,1,'b');R(7,6,1,22,'b');R(7,27,18,1,'n');R(24,7,1,20,'n');
   R(11,3,10,5,'k');R(12,4,8,3,'g');R(13,3,6,1,'G');
   R(9,9,14,17,'k');R(10,10,12,15,'c');
   for(let i=0;i<3;i++){const y=12+i*4;R(12,y,2,2,'r');P(12,y+1,'R');R(16,y,5,1,'x');R(16,y+1,3,1,'G')}}),
 worked:art(32,32,({R,P})=>{R(7,5,18,23,'k');R(8,6,16,21,'T');R(8,6,16,1,'t');R(8,6,1,21,'t');R(23,7,1,20,'q');R(8,26,16,1,'q');
   for(let r=0;r<3;r++)for(let c=0;c<3;c++){R(10+c*5,8+r*5,3,3,'k');R(10+c*5,8+r*5,3,3,(r+c)%2?'y':'Y');P(10+c*5,8+r*5,'w')}
   R(13,22,6,6,'k');R(14,23,4,5,'n');P(17,25,'Y');R(4,27,24,1,'k')}),
 simple:art(32,32,({R})=>{R(6,3,19,1,'k');R(5,4,1,25,'k');R(25,4,1,25,'k');R(6,29,19,1,'k');R(6,4,19,25,'w');R(26,5,1,25,'G');R(7,6,9,2,'r');
   R(7,10,17,1,'x');[13,16,19,22,25].forEach((y,i)=>R(7,y,i%2?13:17,1,'G'))}),
 v80:art(32,32,({R,P})=>{R(4,4,24,24,'k');R(5,5,22,22,'v');R(5,5,22,1,'L');R(5,5,1,22,'L');R(10,5,12,8,'g');R(11,6,10,6,'k');R(11,6,10,1,'x');R(17,7,3,4,'g');
   R(8,17,16,10,'w');R(10,19,12,1,'r');R(10,22,12,1,'G');R(10,24,8,1,'G');P(4,4,'.');P(5,4,'.');P(4,5,'.')}),
 contacts:art(32,32,({R,D})=>{R(4,6,24,20,'k');R(5,7,22,18,'c');R(5,7,22,4,'T');R(5,7,22,1,'t');D(11.5,16.5,2.4,'x');R(8,19,7,5,'x');
   R(18,14,7,1,'x');R(18,17,7,1,'G');R(18,20,6,1,'G');R(5,25,22,1,'G')}),
 linkedin:art(32,32,({R})=>{R(5,5,22,22,'k');R(6,6,20,20,'N');R(10,10,3,3,'w');R(10,15,3,8,'w');R(15,15,3,8,'w');R(18,15,6,2,'w');R(21,17,3,6,'w')}),
 compost:art(32,32,({R,P,O})=>{for(let y=15;y<=27;y++){const hw=Math.round(3+(y-15)*1.05);for(let x=16-hw;x<=15+hw;x++)P(x,y,(x*3+y)%7===0?'b':(y<19?'B':'n'))}
   O('k');R(15,8,2,8,'J');R(10,8,5,3,'Q');R(17,6,5,3,'Q');R(9,10,2,1,'J');R(21,8,2,1,'J');R(20,23,3,2,'y');R(9,24,3,1,'Y');R(14,20,2,2,'y')}),
 trashO0:trashArt(false),trashO1:trashArt(true),trashO2:trashArt('off'),
 about:art(32,32,({R,P,D,get})=>{
   R(3,6,26,1,'k');R(3,27,26,1,'k');R(2,7,1,20,'k');R(29,7,1,20,'k');R(3,7,26,20,'c');
   R(3,7,26,5,'T');R(3,7,26,1,'t');R(3,12,26,1,'k');R(5,9,2,1,'q');R(8,9,2,1,'q');
   D(10.5,19.5,5.5,'k');D(10.5,19.5,4.5,'r');
   for(let y=14;y<26;y++)for(let x=5;x<17;x++){if(get(x,y)!=='r')continue;const dx=x+.5-10.5,dy=y+.5-19.5;if(dx*.6+dy*.8>1.6)P(x,y,'R');if((y===18||y===21)&&(x+y)%3)P(x,y,'c')}
   P(8,16,'p');P(9,16,'p');P(8,17,'p');
   R(18,15,8,1,'x');R(18,18,6,1,'x');R(18,21,8,1,'x');R(18,24,5,1,'G');
   R(3,26,26,1,'g');R(28,13,1,13,'g')}),
 career:art(32,32,({R,P})=>{
   R(12,4,8,1,'k');P(11,5,'k');P(20,5,'k');R(11,6,1,3,'k');R(20,6,1,3,'k');R(12,5,8,1,'b');R(13,6,6,1,'k');R(12,6,1,3,'B');R(19,6,1,3,'B');
   R(3,9,26,1,'k');R(3,27,26,1,'k');R(2,10,1,17,'k');R(29,10,1,17,'k');
   R(3,10,26,17,'B');R(3,10,26,1,'b');R(3,10,1,17,'b');R(3,26,26,1,'n');R(28,11,1,15,'n');
   R(3,16,26,1,'n');R(4,17,24,1,'b');
   R(14,14,4,6,'k');R(15,15,2,4,'Y');P(15,15,'y')}),
 mail:art(32,32,({R,P})=>{
   R(3,8,26,1,'k');R(3,25,26,1,'k');R(2,9,1,16,'k');R(29,9,1,16,'k');R(3,9,26,16,'c');R(3,24,26,1,'g');R(28,10,1,14,'g');
   for(let i=0;i<=12;i++){const yy=9+Math.round(i*8/12);P(3+i,yy,'k');P(28-i,yy,'k')}
   for(let i=0;i<=8;i++){P(4+i,23-Math.round(i*4/8),'G');P(27-i,23-Math.round(i*4/8),'G')}
   R(20,10,8,8,'k');R(21,11,6,6,'r');R(21,11,6,1,'p');R(21,11,1,6,'p');R(22,16,5,1,'R');
   P(22,14,'c');P(23,13,'c');P(24,14,'c');P(25,13,'c')}),
 trash:art(32,32,({R,P})=>{
   R(19,1,1,6,'q');P(20,2,'T');R(21,1,2,1,'T');P(20,1,'t');R(16,3,3,1,'T');P(17,2,'t');P(16,2,'T');
   R(13,5,6,1,'k');P(12,6,'k');P(19,6,'k');
   R(6,7,20,1,'k');R(5,8,1,3,'k');R(26,8,1,3,'k');R(6,11,20,1,'k');R(6,8,20,3,'g');R(6,8,20,1,'w');R(6,10,20,1,'G');
   for(let y=12;y<=28;y++){const l=7+Math.floor((y-12)/9),r=24-Math.floor((y-12)/9);P(l,y,'k');P(r,y,'k');R(l+1,y,r-l-1,1,'g');
     for(let x=l+1;x<r;x++){const f=(x-l)/(r-l);   /* halftone shading, denser toward the right */
       if((f>.78&&(x+y)%2===0)||(f>.6&&f<=.78&&x%2===0&&y%2===0))P(x,y,'G')}
     if(y>13&&y<27){P(11,y,'G');P(12,y,'w');P(16,y,'G');P(17,y,'w')}}
   R(9,29,14,1,'k');P(8,28,'k');P(23,28,'k')}),
 readme:art(32,32,({R,P,D})=>{
   R(6,2,15,1,'k');R(5,3,1,27,'k');R(6,29,21,1,'k');R(26,8,1,21,'k');for(let i=0;i<6;i++)P(21+i,2+i,'k');R(21,3,1,5,'k');R(22,7,4,1,'k');
   R(6,3,15,26,'w');for(let i=0;i<5;i++)R(21,3+i+1,i+1,1,'w');for(let i=0;i<4;i++)R(22+i,3+i+1,1,4-i,'g');R(6,3,15,26,'w');R(21,8,5,21,'w');
   R(8,10,16,10,'k');R(9,11,14,8,'T');R(9,11,14,1,'t');D(16,15,3.2,'k');D(16,15,2.2,'r');
   R(8,22,16,1,'x');R(8,25,11,1,'x');R(25,9,1,20,'g')})
};
/* ---------- small 16px chrome glyphs ---------- */
const GL={
 wins:art(16,14,({R})=>{R(5,0,11,9,'k');R(6,1,9,7,'g');R(6,1,9,2,'e');R(0,4,11,10,'k');R(1,5,9,8,'w');R(1,5,9,2,'r')}),
 seed:art(14,14,({D,P,get})=>{D(7,7,7,'k');D(7,7,6,'r');for(let y=0;y<14;y++)for(let x=0;x<14;x++)if(get(x,y)==='r'){if((y===5||y===9)&&((x>>1)&1)===0)P(x,y,'c');if((y===6||y===10)&&((x>>1)&1)===1)P(x,y,'c')}}),
 icons:art(12,12,({R})=>{R(0,0,5,5,'k');R(7,0,5,5,'k');R(0,7,5,5,'k');R(7,7,5,5,'k')}),
 list:art(12,12,({R})=>{R(0,1,12,2,'k');R(0,5,12,2,'k');R(0,9,12,2,'k')}),
 tri:art(7,7,({R})=>{for(let i=0;i<4;i++)R(1+i,i,1,7-2*i,'k')}),
 back:art(8,12,({P})=>{for(let i=0;i<6;i++){P(5-i,i,'k');P(6-i,i,'k');P(5-i,11-i,'k');P(6-i,11-i,'k')}}),
 up:art(7,4,({R})=>{for(let i=0;i<4;i++)R(3-i,i,1+2*i,1,'k')}),
 down:art(7,4,({R})=>{for(let i=0;i<4;i++)R(3-i,3-i,1+2*i,1,'k')}),
 sm:art(8,8,({R})=>{R(0,0,8,8,'k');R(1,1,6,6,'.')}),
 lg:art(12,12,({R})=>{R(0,0,12,12,'k');R(1,1,10,10,'.')})
};
const gl=(k,s=1)=>svg(GL[k],s,{fill:'currentColor'});
/* window boxes, 13x13, recoloured by CSS for hover/pressed */
const box=g=>art(13,13,({R,P})=>{R(0,0,13,13,'k');R(1,1,11,11,'f');R(1,1,10,1,'h');R(1,1,1,10,'h');R(2,11,10,1,'s');R(11,2,1,10,'s');g&&g(R,P)});
const WB={
 close:box((R,P)=>{for(let i=0;i<5;i++){P(4+i,4+i,'a');P(8-i,4+i,'a')}}),
 zoom:box(R=>{R(3,3,7,1,'a');R(3,9,7,1,'a');R(3,3,1,7,'a');R(9,3,1,7,'a');R(3,6,4,1,'a');R(6,3,1,4,'a')}),
 shade:box(R=>{R(3,5,7,1,'a');R(3,7,7,1,'a')}),
 min:box(R=>{R(3,8,7,2,'a')})
};
const wb=k=>svg(WB[k],1,{classes:true});

/* ---------- generated chrome stylesheet: 9-slices, scrollbar, cursor, textures ---------- */
const BV_UP=['..kkk..','.khhhk.','kh...sk','kh...sk','kh...sk','.ksssk.','..kkk..'];
const BV_DN=['..kkk..','.ksssk.','ks...hk','ks...hk','ks...hk','.khhhk.','..kkk..'];
const BV_FC=['..vvv..','.vvvvv.','vv...vv','vv...vv','vv...vv','.vvvvv.','..vvv..'];
const RING=['...kkkkk...','.kkkkkkkkk.','.kkkkkkkkk.','kkkk...kkkk','kkk.....kkk','kkk.....kkk','kkk.....kkk','kkkk...kkkk','.kkkkkkkkk.','.kkkkkkkkk.','...kkkkk...'];
function arrow(dir,pr){const vert=dir==='u'||dir==='d';const F=pr?'e':'g',H=pr?'G':'w',S=pr?'w':'G';
  return art(16,16,({R})=>{R(0,0,16,16,'k');
    if(vert){R(1,1,15,14,F);R(1,1,14,1,H);R(1,1,1,13,H);R(1,14,15,1,S);R(15,1,1,14,S)}
    else{R(1,1,14,15,F);R(1,1,14,1,H);R(1,1,1,14,H);R(1,15,14,1,S);R(14,1,1,15,S)}
    for(let i=0;i<4;i++){if(dir==='u')R(7-i,6+i,2+2*i,1,'k');if(dir==='d')R(7-i,9-i,2+2*i,1,'k');if(dir==='l')R(6+i,7-i,1,2+2*i,'k');if(dir==='r')R(9-i,7-i,1,2+2*i,'k')}})}
const GRIP=art(10,13,({P})=>{for(let i=0;i<4;i++)for(let x=0;x<10;x++){const o=Math.round((1-Math.cos(x/10*Math.PI*2))/2);P(x,i*3+o,'L');P(x,i*3+o+1,'w')}});
const TRACK=art(2,2,({P})=>{P(0,0,'u');P(1,1,'u');P(1,0,'m');P(0,1,'m')});
const GROW=art(15,15,({P})=>{for(const k of [4,8,12])for(let i=0;i<=14-k;i++){P(k+i,14-i,'s');P(k+i+1,14-i,'w')}});
const THUMB=art(11,16,({R})=>{R(0,0,11,16,'k');R(1,1,9,14,'g');R(1,1,8,1,'w');R(1,1,1,13,'w');R(2,14,8,1,'s');R(9,2,1,13,'s');for(const y of [5,8,11]){R(3,y-1,5,1,'s');R(3,y,5,1,'w')}});
const WAVY=art(16,4,({P})=>{for(let x=0;x<16;x++)P(x,Math.round(1.5+1.5*Math.sin(x/16*Math.PI*2)),'r')});
const CUR=art(17,17,({P,D,get,O,R})=>{for(let y=0;y<17;y++)for(let x=0;x<17;x++){const dx=x+.5-8.5,dy=y+.5-8.5,d=Math.hypot(dx,dy),a=Math.atan2(dy,dx);const rr=6+Math.sin(a*6)*.9;if(Math.abs(d-rr)<.75)P(x,y,'w')}
  R(8,8,1,1,'w');R(7,8,3,1,'w');R(8,7,1,3,'w');O('k')});
function cv(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');const id=x.createImageData(w,h);fn(id.data,w,h);x.putImageData(id,0,0);return c.toDataURL()}
/* dither masks are SVG rects, so they stay crisp at any device pixel ratio */
const BLEED=svgU(art(128,4,({P})=>{for(let y=0;y<4;y++)for(let x=0;x<128;x++)if(B4[(y&3)*4+(x&3)]<Math.pow(1-x/128,1.3)*16)P(x,y,'k')}));
const DIAG=svgU(art(64,64,({P})=>{for(let y=0;y<64;y++)for(let x=0;x<64;x++)if(B4[(y&3)*4+(x&3)]<(1-(x+y)/76)*8)P(x,y,'k')}));
const GRAIN=cv(64,64,(d,w,h)=>{for(let i=0;i<w*h;i++){const r=rnd();if(r<.075){d[i*4]=0xE6;d[i*4+1]=0xE3;d[i*4+2]=0xD6;d[i*4+3]=255}else if(r<.09){d[i*4]=0xD8;d[i*4+1]=0xD3;d[i*4+2]=0xC4;d[i*4+3]=255}}});
/* the crumbled Unreleased (once Wake Up is unlocked): eaten away from the bottom, cracked through */
const CRUMB=svgU(art(24,24,({P})=>{for(let y=0;y<24;y++)for(let x=0;x<24;x++){const f=(y-9)/14+(x-12)/40;if(x-y<19&&B4[(y&3)*4+(x&3)]>=f*16)P(x,y,'k')}}));
const CRACK=svgU(art(24,24,({P})=>{const L=(a,b,c,d)=>{const n=Math.max(Math.abs(c-a),Math.abs(d-b));for(let i=0;i<=n;i++)P(a+(c-a)*i/n,b+(d-b)*i/n,'c')};
  L(13,0,11,4);L(11,4,14,8);L(14,8,10,13);L(10,13,12,18);L(14,8,20,11);L(10,13,4,15)}));
const sb='.wbody::-webkit-scrollbar';
document.head.insertAdjacentHTML('beforeend',`<style id="gen">
.bev{border-image:${svgU(BV_UP)} 3 / 3px stretch}
.bev:active,.bev[aria-pressed="true"],.stab.on{border-image:${svgU(BV_DN)} 3 / 3px stretch}
.bev:focus-visible{border-image:${svgU(BV_FC)} 3 / 3px stretch;outline:none}
.ring{border-image:${svgU(RING)} 5 / 5px stretch}
${sb}{width:16px;height:16px;background:#C0C0C0}
${sb}-track{background:${svgU(TRACK)}}
${sb}-track:vertical{box-shadow:inset 1px 0 0 #1A1716}
${sb}-track:horizontal{box-shadow:inset 0 1px 0 #1A1716}
${sb}-thumb{background:#CCCCFF ${svgU(GRIP)} center no-repeat;border:1px solid #1A1716;box-shadow:inset 1px 1px 0 #EEEEFF,inset -1px -1px 0 #808080}
${sb}-thumb:horizontal{background-image:${svgU(T(GRIP))}}
${sb}-thumb:active{background-color:#B8B8F2}
${sb}-button{display:none;width:16px;height:16px}
${sb}-button:vertical:start:decrement{display:block;background:${svgU(arrow('u'))}}
${sb}-button:vertical:end:increment{display:block;background:${svgU(arrow('d'))}}
${sb}-button:vertical:start:decrement:active{background:${svgU(arrow('u',1))}}
${sb}-button:vertical:end:increment:active{background:${svgU(arrow('d',1))}}
${sb}-button:horizontal:start:decrement{display:block;background:${svgU(arrow('l'))}}
${sb}-button:horizontal:end:increment{display:block;background:${svgU(arrow('r'))}}
${sb}-button:horizontal:start:decrement:active{background:${svgU(arrow('l',1))}}
${sb}-button:horizontal:end:increment:active{background:${svgU(arrow('r',1))}}
${sb}-corner{background:#C0C0C0}
.grow{background:${svgU(GROW)}}
input[type=range]::-webkit-slider-thumb{background:${svgU(THUMB)}}
input[type=range]:active::-webkit-slider-thumb{transform:translateY(1px)}
.wavy{background:${svgU(WAVY)} repeat-x 0 0}
.rm{background-image:url(${GRAIN})}
.grooves::before{-webkit-mask:${BLEED} 0 0/128px 4px repeat-y;mask:${BLEED} 0 0/128px 4px repeat-y}
.ico::before{-webkit-mask:${DIAG} 0 0/64px 64px no-repeat;mask:${DIAG} 0 0/64px 64px no-repeat}
.item.crumbled .app{-webkit-mask:${CRUMB} 0 0/100% 100% no-repeat;mask:${CRUMB} 0 0/100% 100% no-repeat}
.item.crumbled .app::after{background:${CRACK} 0 0/100% 100% no-repeat}
.pj-ban .wv::before{opacity:.35;-webkit-mask:${BLEED} 0 0/256px 8px repeat-y;mask:${BLEED} 0 0/256px 8px repeat-y}
#desk{cursor:default}
</style>`);
$$('[data-px]').forEach(e=>{e.outerHTML=svg(GL[e.dataset.px],1)});
$$('.ic').forEach(e=>{const r=ICON[e.dataset.ic];e.innerHTML=svg(r,2)+svg(r,2,{fill:'url(#ck)',cls:'selov'})});
$('#bx').innerHTML=wb('close');

/* ================= wavy marks: white PNG strokes, tinted on canvas, alpha-thresholded by #thr ================= */
const W=[];for(let i=1;i<=12;i++){const im=new Image();im.src='/images/WavyLineCircles/Wavy%20Line%20'+i+'.png';W.push(im)}
const whenImg=(im,fn)=>{if(im.complete&&im.naturalWidth)fn();else im.addEventListener('load',fn,{once:true})};
function tint(c,idx,color,{rot=0,after,bold=0}={}){
  const im=W[(idx%12+12)%12];
  whenImg(im,()=>{const x=c.getContext('2d');x.save();x.clearRect(0,0,c.width,c.height);x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';
    x.translate(c.width/2,c.height/2);x.rotate(rot);const k=bold;for(const[ox,oy]of(k?[[0,0],[k,0],[0,k],[k,k]]:[[0,0]]))x.drawImage(im,-c.width/2+ox-k/2,-c.height/2+oy-k/2,c.width,c.height);x.restore();
    x.globalCompositeOperation='source-in';x.fillStyle=color;x.fillRect(0,0,c.width,c.height);x.globalCompositeOperation='source-over';after&&after(x)});
  return c;
}
function mk(idx,color,size,{scale=1,rot=0,cls='thr'}={}){const c=document.createElement('canvas');c.width=c.height=size;c.style.width=c.style.height=size*scale+'px';if(cls)c.className=cls;return tint(c,idx,color,{rot})}
/* stepped red disc with a cycling wavy mark inside (logo, Read Me, boot) */
function discRows(n){return art(n,n,({D,P,get})=>{const c=n/2;D(c,c,c,'k');D(c,c,c-1,'r');
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(get(x,y)==='r'){const dx=x+.5-c,dy=y+.5-c;if(dx*.6+dy*.8>n*.24)P(x,y,'R');const hx=x+.5-(c-n*.2),hy=y+.5-(c-n*.22);if(hx*hx+hy*hy<(n*.12)**2)P(x,y,'p')}})}
const DM=[];
function discMark(el,n,s){el.style.width=el.style.height=n*s+'px';const m=n-4;
  el.innerHTML=svg(discRows(n),s)+`<canvas class="thr" width="${m}" height="${m}" style="left:${2*s}px;top:${2*s}px;width:${m*s}px;height:${m*s}px"></canvas>`;
  const c=el.querySelector('canvas');DM.push(c);return c}
function paintMark(c,idx,color='#FFF3E6'){const m=c.width,r=m/2-.5;tint(c,idx,color,{after:x=>{x.globalCompositeOperation='destination-in';x.fillStyle='#000';x.beginPath();
  for(let y=0;y<m;y++)for(let i=0;i<m;i++){const dx=i+.5-m/2,dy=y+.5-m/2;if(dx*dx+dy*dy<=r*r)x.rect(i,y,1,1)}x.fill();x.globalCompositeOperation='source-over'}})}

/* ================= data ================= */
const P=OSD.projects.map(p=>({id:p.id,slug:p.slug,name:p.name,role:p.role,studio:p.studio,blurb:p.blurb,year:p.year,img:p.thumb,full:p.banner,acc:p.acc,ink:p.ink==='INK'?INK:p.ink,flag:p.flag?1:undefined,lift:p.lift||'none'}));
const PB=Object.fromEntries(P.map(p=>[p.id,p]));
const CAREER=OSD.career;
const SUB=OSD.sub;
const NAME=OSD.name;
const ABOUT=OSD.about;
const UNR=OSD.unr;
const TAG=OSD.taglines[0];

/* ================= key art: half-res canvas, 2x pixelated, ordered dither (27 colours) by #dz; full colour dissolves in ================= */
const imgs={};
const loadImg=src=>imgs[src]||(imgs[src]=new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=src}));
const artHTML=p=>`<span class="art" data-src="${p.img}" data-lift="${p.lift||'none'}" aria-hidden="true"><canvas class="dz"></canvas><img class="full" src="${p.full||p.img}" alt="" decoding="async" draggable="false"></span>`;
async function renderArt(a){
  const im=await loadImg(a.dataset.src);if(!im)return;
  const Wd=a.clientWidth,Hd=a.clientHeight;if(Wd<4||Hd<4)return;
  const w=Math.ceil(Wd/2),h=Math.ceil(Hd/2);if(a._w===w&&a._h===h)return;a._w=w;a._h=h;
  const c=$('canvas',a);c.width=w;c.height=h;c.style.width=w*2+'px';c.style.height=h*2+'px';
  const x=c.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.filter=a.dataset.lift||'none';
  const s=Math.max(w/im.naturalWidth,h/im.naturalHeight),sw=w/s,sh=h/s;
  x.drawImage(im,(im.naturalWidth-sw)/2,(im.naturalHeight-sh)/2,sw,sh,0,0,w,h);x.filter='none';
}
const ro=new ResizeObserver(es=>es.forEach(e=>renderArt(e.target)));
function mountArt(root){$$('.art',root).forEach(a=>{ro.observe(a);renderArt(a)})}
const maskCache=[];
function maskURL(L){if(maskCache[L])return maskCache[L];let r='';for(let y=0;y<4;y++)for(let x=0;x<4;x++)if(B4[y*4+x]<L)r+=`M${x*2} ${y*2}h2v2h-2z`;
  return maskCache[L]=uri(`<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" shape-rendering="crispEdges"><path d="${r}"/></svg>`)}
function setLv(im,L){im._lv=L;if(!im.parentNode)return;im.parentNode.classList.toggle('clear',L>=16);if(L<=0){im.style.visibility='hidden';return}im.style.visibility='visible';const m=L>=16?'none':maskURL(L);im.style.webkitMaskImage=m;im.style.maskImage=m}
function dissolve(im,to,ms){clearTimeout(im._t);const from=im._lv||0;if(reduce||!ms||from===to){setLv(im,to);return}
  const N=8;let i=0;const tick=()=>{i++;setLv(im,Math.round(from+(to-from)*i/N));if(i<N)im._t=setTimeout(tick,ms/N)};tick()}
function reveal(host,on,ms){const im=host&&$('img.full',host);if(im)dissolve(im,on?16:0,ms??(on?240:160))}

/* ================= window manager ================= */
const WIN={}; let Z=20, topId=null; const order=[];
/* ================= D5: always-visible scrollbar for a window body (works the same in every browser) ================= */
function mountSb(el){
  const body=$('.wbody',el),bar=$('.vsb',el),thm=$('.thm',bar),trk=$('.trk',bar);
  if(!body||!bar)return;
  let raf=0;
  const upd=()=>{raf=0;const ch=body.clientHeight,sh=body.scrollHeight,max=sh-ch,th=trk.clientHeight;
    if(!ch||max<=1||!th){bar.classList.add('off');return}
    bar.classList.remove('off');
    const h=Math.max(20,Math.round(th*ch/sh)),y=Math.round((th-h)*body.scrollTop/max);
    thm.style.height=h+'px';thm.style.top=y+'px'};
  const q=()=>{if(!raf)raf=requestAnimationFrame(upd)};
  body.addEventListener('scroll',q,{passive:true});
  const ro=new ResizeObserver(q);ro.observe(body);ro.observe(trk);
  new MutationObserver(()=>{[...body.children].forEach(c=>{if(!c._ro){c._ro=1;ro.observe(c)}});q()}).observe(body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','style','class']});
  [...body.children].forEach(c=>{c._ro=1;ro.observe(c)});
  let hold=0,rep=0;
  const step=d=>{body.scrollTop+=d*48};
  $$('.sa',bar).forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();const d=b.classList.contains('up')?-1:1;step(d);hold=setTimeout(()=>{rep=setInterval(()=>step(d),60)},320);
    const up=()=>{clearTimeout(hold);clearInterval(rep);removeEventListener('pointerup',up);removeEventListener('pointercancel',up)};addEventListener('pointerup',up);addEventListener('pointercancel',up)}));
  thm.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();thm.setPointerCapture(e.pointerId);
    const sy=e.clientY,st=body.scrollTop,ratio=(body.scrollHeight-body.clientHeight)/Math.max(1,trk.clientHeight-thm.offsetHeight);
    const mv=ev=>{body.scrollTop=st+(ev.clientY-sy)*ratio};
    const up=()=>{thm.removeEventListener('pointermove',mv);thm.removeEventListener('pointerup',up);thm.removeEventListener('pointercancel',up)};
    thm.addEventListener('pointermove',mv);thm.addEventListener('pointerup',up);thm.addEventListener('pointercancel',up)});
  trk.addEventListener('pointerdown',e=>{if(e.target!==trk)return;e.preventDefault();const r=thm.getBoundingClientRect();body.scrollTop+=(e.clientY<r.top?-1:1)*(body.clientHeight-40)});
  q();
}

function makeWin(o){
  const el=document.createElement('section');
  el.className='win'+(o.noClose?' noclose':'')+(o.noResize?' norz':'');el.id='w-'+o.id;el.hidden=true;el.tabIndex=-1;
  el.setAttribute('role','dialog');el.setAttribute('aria-label',o.title);
  el.innerHTML=`<div class="wf"><div class="tbar"><div class="tab"><button class="wbtn wclose" data-act="close" aria-label="Close">${wb('close')}</button><span class="ttl">${esc(o.title)}</span></div><div class="grooves"></div>${o.minimizable?`<button class="wbtn wmin" data-act="min" aria-label="Minimize">${wb('min')}</button>`:''}<button class="wbtn" data-act="zoom" aria-label="Zoom">${wb('zoom')}</button><button class="wbtn wx" data-act="close" aria-label="Close window">${wb('close')}</button></div>`+
   `<div class="backbar"><button class="back bev" data-act="close">${gl('back')}Back</button>${o.minimizable?`<button class="back bev bmin" data-act="min">${gl('down')}Minimize</button>`:''}<span class="bt">${esc(o.title)}</span></div>`+
   (o.tool?`<div class="wtool">${o.tool}</div>`:'')+`<div class="wbw"><div class="wbody">${o.body}</div><div class="vsb" aria-hidden="true"><button class="sa up" tabindex="-1" aria-hidden="true"></button><div class="trk"><div class="thm"></div></div><button class="sa dn" tabindex="-1" aria-hidden="true"></button></div></div>`+(o.foot!=null?`<div class="wfoot">${o.foot}</div>`:'')+'<div class="grow" data-d="br" aria-hidden="true"></div><i class="rz r" data-d="r"></i><i class="rz l" data-d="l"></i><i class="rz b" data-d="b"></i><i class="rz bl" data-d="bl"></i>'+`</div>`;
  Object.assign(el.style,{left:o.x+'px',top:o.y+'px',width:o.w+'px'});if(o.h)el.style.height=o.h+'px';
  el.style.setProperty('--acc',o.acc||RED);el.style.setProperty('--acc-ink',o.ink||INK);
  desk.insertBefore(el,$('#strip'));
  const w=WIN[o.id]={id:o.id,el,title:o.title,acc:o.acc||RED,ink:o.ink||INK,base:[o.acc||RED,o.ink||INK],open:false,opener:null,onopen:o.onopen,onshown:o.onshown,onclose:o.onclose,keep:!!o.noClose,min:false,onmin:o.onmin,onrestore:o.onrestore};
  wire(w);if(o.init)o.init(el);mountArt(el);mountSb(el);return w;
}
function setAccent(id,acc,ink){const w=WIN[id];if(!w)return;w.acc=acc;w.ink=ink;w.el.style.setProperty('--acc',acc);w.el.style.setProperty('--acc-ink',ink);renderStrip()}
function resetAccent(id){const w=WIN[id];if(w)setAccent(id,w.base[0],w.base[1])}
function thunk(el){if(reduce)return;el.classList.remove('thunk');void el.offsetWidth;el.classList.add('thunk')}
function focusWin(id,{bump=false,focusEl=true}={}){
  const w=WIN[id];if(!w||!w.open||w.min)return;
  if(topId!==id||w.el.style.zIndex==='')w.el.style.zIndex=++Z;
  topId=id;for(const k in WIN)WIN[k].el.classList.toggle('focused',k===id);
  readSync();
  if(bump)thunk(w.el);
  if(focusEl&&!w.el.contains(document.activeElement))w.el.focus({preventScroll:true});
  renderStrip();
}
function clampWin(el){
  if(isMobile())return;
  const dw=desk.clientWidth,dh=desk.clientHeight;let w=el.offsetWidth;
  if(w>dw-16){el.style.width=(dw-16)+'px';w=dw-16}
  let x=Math.round(parseFloat(el.style.left)||0),y=Math.round(parseFloat(el.style.top)||0);
  x=Math.min(Math.max(x,8),Math.max(8,dw-w-8));y=Math.min(Math.max(y,16),Math.max(16,dh-60));
  el.style.left=x+'px';el.style.top=y+'px';
}
/* Mac zoom rects: integer-stepped outlines, 6 frames */
function zoomRects(a,b,done){
  if(reduce||!a){done&&done();return}
  const N=6,STEP=30,GAP=20;let fin=0;
  for(let j=0;j<3;j++){const d=document.createElement('div');d.className='zr';d.style.visibility='hidden';document.body.appendChild(d);let i=0;
    const st=()=>{if(i>N){d.remove();if(++fin===3&&done)done();return}const t=i/N,e=1-(1-t)*(1-t);
      Object.assign(d.style,{visibility:'visible',left:Math.round(a.left+(b.left-a.left)*e)+'px',top:Math.round(a.top+(b.top-a.top)*e)+'px',width:Math.round(a.width+(b.width-a.width)*e)+'px',height:Math.round(a.height+(b.height-a.height)*e)+'px'});i++;setTimeout(st,STEP)};
    setTimeout(st,j*GAP)}
}
function openWin(id,src){
  if(!WIN[id]){if(PB[id])projWin(PB[id]);else return}
  const w=WIN[id],el=w.el;
  if(el.classList.contains('shaded'))shade(id,false);
  if(w.open){if(w.min)restoreWin(id,src);else focusWin(id,{bump:true});return}
  w.open=true;w.opener=src&&src.focus?src:null;el.hidden=false;order.push(id);clampWin(el);
  TK.open(PB[id]?'/projects/'+PB[id].slug+'.html':'/os/'+id,w.title,id,viaOf(src));
  if(id==='trash')TK.discover('trash-open',{},'crash_trash_open');
  el.style.zIndex=++Z;
  if(w.onopen)w.onopen(el);
  const r=src&&src.getBoundingClientRect?src.getBoundingClientRect():src;
  const shown=()=>{if(!w.open)return;focusWin(id,{bump:true});mascotWelcome(id)};
  if(r&&!reduce&&!isMobile()){el.style.visibility='hidden';topId=id;renderStrip();
    zoomRects(r,el.getBoundingClientRect(),()=>{if(w.open&&w.onshown)w.onshown(el);el.style.visibility='';shown()})}
  else{if(w.onshown)w.onshown(el);shown()}
  updInd();
}
/* the front-most window that is open and not minimized */
function nextWin(){let next=null,z=-1;for(const k in WIN){const o=WIN[k];if(o.open&&!o.min&&+o.el.style.zIndex>z){z=+o.el.style.zIndex;next=k}}return next}
function closeWin(id){
  const w=WIN[id];if(!w||!w.open||w.keep)return;
  w.open=false;w.min=false;w.el.hidden=true;if(w.onclose)w.onclose(w.el);w.el.classList.remove('focused');order.splice(order.indexOf(id),1);
  const next=nextWin();
  topId=null;
  if(next)focusWin(next);else if(w.opener&&document.contains(w.opener))w.opener.focus({preventScroll:true});
  renderStrip();updInd();
}
/* a kept window (noClose) can only be closed after this */
function releaseWin(id){const w=WIN[id];if(!w)return;w.keep=false;w.el.classList.remove('noclose')}
/* minimize: the window stays open and in the strip (dimmed), but is hidden until its tab, its icon or openWin brings it back */
function minimizeWin(id){
  const w=WIN[id];if(!w||!w.open||w.min||w.el.classList.contains('gdark'))return;
  const a=w.el.getBoundingClientRect();
  w.min=true;w.el.hidden=true;w.el.classList.remove('focused');if(w.onmin)w.onmin(w.el);
  if(topId===id){topId=null;const next=nextWin();if(next)focusWin(next);else{if(w.el.contains(document.activeElement))document.activeElement.blur();renderStrip()}}else renderStrip();
  /* the outlines fly to its strip tab; with the strip collapsed, to its desktop icon (or the one that opened it), else the strip's grip */
  const vis=e=>e&&document.contains(e)&&e.getBoundingClientRect().width>0,to=[$(`.stab[data-id="${id}"]`),id==='game'&&$('#ic-wake .ic'),w.opener,$('#sgrip')].find(vis);
  if(to&&!isMobile())zoomRects(a,to.getBoundingClientRect());
}
function restoreWin(id,src){
  const w=WIN[id];if(!w||!w.min)return;
  w.min=false;w.el.hidden=false;clampWin(w.el);w.el.style.zIndex=++Z;if(w.onrestore)w.onrestore(w.el);
  const r=src&&src.getBoundingClientRect?src.getBoundingClientRect():null;
  if(r&&!isMobile())zoomRects(r,w.el.getBoundingClientRect());
  focusWin(id,{bump:true});
}
function zoomWin(id){
  const el=WIN[id].el;if(isMobile()||el.classList.contains('norz'))return;
  const a=el.getBoundingClientRect();
  if(el.dataset.prev){const p=JSON.parse(el.dataset.prev);Object.assign(el.style,p);delete el.dataset.prev}
  else{el.dataset.prev=JSON.stringify({left:el.style.left,top:el.style.top,width:el.style.width,height:el.style.height});
    Object.assign(el.style,{left:'16px',top:'24px',width:(desk.clientWidth-160)+'px',height:(desk.clientHeight-104)+'px'})}
  zoomRects(a,el.getBoundingClientRect());thunk(el);
}
function shade(id,force){
  const w=WIN[id],el=w.el;if(el.classList.contains('norz')&&force!==false)return;const on=force??!el.classList.contains('shaded');
  el.classList.toggle('shaded',on);const sbt=$('[data-act=shade]',el);if(sbt)sbt.setAttribute('aria-expanded',String(!on));renderStrip();
}
function wire(w){
  const el=w.el,id=w.id;
  el.addEventListener('pointerdown',()=>{if(topId!==id)focusWin(id,{bump:true,focusEl:false})},true);
  el.addEventListener('focusin',()=>{if(topId!==id)focusWin(id,{focusEl:false})});
  el.addEventListener('animationend',e=>{if(e.target===el)el.classList.remove('thunk')});
  el.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b||!el.contains(b))return;
    const a=b.dataset.act;if(a==='close')closeWin(id);else if(a==='zoom')zoomWin(id);else if(a==='shade')shade(id);else if(a==='min')minimizeWin(id)});
  const tb=$('.tbar',el);
  tb.addEventListener('dblclick',e=>{if(!e.target.closest('button'))shade(id)});
  tb.addEventListener('pointerdown',e=>{
    if(e.button!==0||e.target.closest('button')||isMobile())return;
    e.preventDefault();tb.setPointerCapture(e.pointerId);el.classList.add('pressing');
    const sx=e.clientX,sy=e.clientY,ox=parseFloat(el.style.left),oy=parseFloat(el.style.top);let moved=false;
    const mv=ev=>{const dx=Math.round(ev.clientX-sx),dy=Math.round(ev.clientY-sy);if(!moved&&Math.hypot(dx,dy)<3)return;moved=true;el.classList.add('dragging');
      const dw=desk.clientWidth,dh=desk.clientHeight,ww=el.offsetWidth;
      el.style.left=Math.round(Math.min(Math.max(ox+dx,-ww+96),dw-96))+'px';el.style.top=Math.round(Math.min(Math.max(oy+dy,8),dh-32))+'px';delete el.dataset.prev};
    const up=()=>{tb.removeEventListener('pointermove',mv);tb.removeEventListener('pointerup',up);tb.removeEventListener('pointercancel',up);el.classList.remove('pressing','dragging')};
    tb.addEventListener('pointermove',mv);tb.addEventListener('pointerup',up);tb.addEventListener('pointercancel',up);
  });
  $$('.grow,.rz',el).forEach(g=>{const dir=g.dataset.d||'br';
    g.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();g.setPointerCapture(e.pointerId);
      const sx=e.clientX,sy=e.clientY,ow=el.offsetWidth,oh=el.offsetHeight,ol=parseFloat(el.style.left)||0,ot=parseFloat(el.style.top)||0,MW=300,MH=180;
      const mv=ev=>{const dx=ev.clientX-sx,dy=ev.clientY-sy,dw=desk.clientWidth,dh=desk.clientHeight;let w=ow,h=oh,l=ol;
        if(dir.includes('r'))w=Math.min(Math.max(MW,ow+dx),Math.max(MW,dw-ol-4));
        if(dir.includes('l')){w=Math.max(MW,ow-dx);l=ol+(ow-w);if(l<0){w+=l;l=0}}
        el.style.width=Math.round(w)+'px';el.style.left=Math.round(l)+'px';
        if(dir.includes('b'))el.style.height=Math.round(Math.min(Math.max(MH,oh+dy),Math.max(MH,dh-ot-4)))+'px';
        delete el.dataset.prev};
      const up=()=>{g.removeEventListener('pointermove',mv);g.removeEventListener('pointerup',up);g.removeEventListener('pointercancel',up)};
      g.addEventListener('pointermove',mv);g.addEventListener('pointerup',up);g.addEventListener('pointercancel',up)})})
}

/* ================= control strip + indicators ================= */
function renderStrip(){
  $('#stabs').innerHTML=order.map(id=>{const w=WIN[id];return `<button class="stab bev${id===topId?' on':''}${w.el.classList.contains('shaded')?' shaded':''}${w.min?' min':''}" data-id="${id}" style="--a:${w.acc};--ai:${w.ink}" aria-pressed="${id===topId}"><i class="sw"></i><span class="stt">${esc(w.title)}</span></button>`}).join('');
}
$('#stabs').addEventListener('click',e=>{const b=e.target.closest('.stab');if(!b)return;const id=b.dataset.id;if(WIN[id].min){restoreWin(id,b);return}if(WIN[id].el.classList.contains('shaded'))shade(id,false);focusWin(id,{bump:true});WIN[id].el.focus({preventScroll:true})});
function updInd(){$('#nw').textContent=order.length}

function setStrip(c){const st=$('#strip');st.classList.toggle('collapsed',c);['#sgrip','#scap'].forEach(q=>{const b=$(q);b.setAttribute('aria-expanded',String(!c));b.setAttribute('aria-label',c?'Show the open windows list':'Collapse the open windows list')});store.set('stripC',c?'1':'0')}
['#sgrip','#scap'].forEach(q=>$(q).addEventListener('click',()=>setStrip(!$('#strip').classList.contains('collapsed'))));
if(store.get('stripC')==='1')setStrip(true);
/* ================= Read Me ================= */
const card=p=>`<button class="card" data-p="${p.id}" style="--pa:${p.acc}">${artHTML(p)}<span class="cap"><i class="sw"></i><span><span class="pt">${esc(p.name)}</span><span class="pm">${esc(p.role)} · ${esc(p.studio)}</span></span></span></button>`;
makeWin({id:'readme',title:'Read Me',x:48,y:32,w:880,acc:RED,ink:INK,
 body:`<div class="rm"><div class="rm-head"><span class="dm" id="rmdm" aria-hidden="true"></span><div><h1 class="name" id="name" aria-label="${NAME}"><span aria-hidden="true">${NAME}</span></h1><p class="role">Game Designer &amp; Director</p></div></div>
 <p class="sub">${SUB}</p>
 <div class="wavy" aria-hidden="true"></div>
 <ul class="ship"><li class="lbl" aria-hidden="true">Shipped</li><li>Pistol Whip</li><li>Bully</li><li>Resident Evil: Operation Raccoon City</li><li>SOCOM</li><li>Marvel: Dimension of Heroes</li><li>Journey to Foundation</li></ul>
 <div class="cards">${['pistol','journey','flourish'].map(i=>card(PB[i])).join('')}</div></div>`,
 foot:`<span class="tag">${TAG}</span>`,
 init(el){$('.ship',el).setAttribute('aria-label','Shipped')}});
function fitCards(){const ch=Math.max(208,Math.min(360,innerHeight-504));WIN.readme.el.style.setProperty('--rh',Math.floor((ch-16)/2)+'px')}

/* hover or focus a flagship: the window's accent tab takes the project colour and the art resolves */
function accentHover(root,winId){
  const on=c=>{const p=PB[c.dataset.p];setAccent(winId,p.acc,p.ink);reveal(c,true)};
  const off=c=>{resetAccent(winId);if(!c.classList.contains('sel'))reveal(c,false)};
  root.addEventListener('pointerover',e=>{const c=e.target.closest('[data-p]');if(c&&!c.contains(e.relatedTarget))on(c)});
  root.addEventListener('pointerout',e=>{const c=e.target.closest('[data-p]');if(c&&!c.contains(e.relatedTarget))off(c)});
  root.addEventListener('focusin',e=>{const c=e.target.closest('[data-p]');if(c)on(c)});
  root.addEventListener('focusout',e=>{const c=e.target.closest('[data-p]');if(c&&!c.contains(e.relatedTarget))off(c)});
  root.addEventListener('click',e=>{const c=e.target.closest('[data-p]');if(!c)return;
    $$('.sel',root).forEach(x=>{x.classList.remove('sel');if(x!==c)reveal(x,false)});c.classList.add('sel');reveal(c,true);openWin(c.dataset.p,c)});
}
accentHover(WIN.readme.el,'readme');

/* ================= Work ================= */
const appHTML=p=>`<span class="app"><i></i><img src="${p.img}" alt="" draggable="false" decoding="async"></span>`;
const icoHTML_old=p=>p.img?`<span class="ico" style="--pa:${p.acc}">${artHTML(p)}</span>`:`<span class="ico" style="--pa:${p.acc}" data-w="${p.w??''}"></span>`;
const cols=[['name','Name'],['role','Role'],['studio','Studio'],['year','Period'],['blurb','Summary']];
const yrOf=t=>{const m=String(t).match(/\d{4}/g);return m?+m[m.length-1]:0};
let sortK=null,sortD=1,view='icons';
makeWin({id:'work',title:'Work',x:184,y:64,w:680,h:560,grow:1,
 tool:`<div class="seg" role="group" aria-label="View"><button class="bev" data-view="icons" aria-pressed="true">${gl('icons')}Icons</button><button class="bev" data-view="list" aria-pressed="false">${gl('list')}List</button></div><label class="slide">${gl('sm')}<input type="range" min="0.75" max="1.5" step="0.25" value="1" aria-label="Icon size">${gl('lg')}</label>`,
 body:`<div class="iconview" id="iv"><div class="big">${P.filter(p=>p.flag).map(p=>`<button class="item" data-p="${p.id}"><span class="pic"><img src="${p.img}" alt="" draggable="false" decoding="async"></span><span class="nm">${esc(p.name)}</span><span class="rl">${esc(p.role)} · ${esc(p.studio)}</span><span class="bl">${esc(p.blurb||"")}</span></button>`).join('')}</div>
 <div class="wavy" aria-hidden="true"></div>
 <div class="small">${P.filter(p=>!p.flag).map(p=>`<button class="item" data-p="${p.id}">${appHTML(p)}<span class="nm">${esc(p.name)}</span></button>`).join('')}</div></div>
 <div class="tablewrap" id="lv" hidden><table class="list"><thead><tr>${cols.map(([k,l])=>`<th data-k="${k}"><button>${l}<span class="ar"></span></button></th>`).join('')}</tr></thead><tbody></tbody></table></div>`,
 foot:`<span>${P.length} items</span><span></span>`,
 onopen(el){$$("img",el).forEach(i=>i.decode&&i.decode().catch(()=>{}));fitWork(el)},onshown(el){ditherIn(el)},onclose(el){clearDither(el)},
 init(el){
   $$('.ico[data-w]',el).forEach(i=>{if(i.dataset.w!=='')i.appendChild(mk(+i.dataset.w,'#FFFFFF',48))});
   $('.small',el).previousElementSibling.style.margin='16px 0 0';
   accentHover($('.wbody',el),'work');
   $('.seg',el).addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)setView(b.dataset.view)});
   $('input[type=range]',el).addEventListener('input',e=>$('#iv').style.setProperty('--k',e.target.value));
   $('thead',el).addEventListener('click',e=>{const th=e.target.closest('th');if(!th)return;const k=th.dataset.k;sortD=sortK===k?-sortD:1;sortK=k;renderList()});
   renderList(el);
 }});
const HOPTOP=6;/* the least gap between the top of the desktop and the head of a mascot standing on a window */
/* the first time it opens: wide and tall enough to show every title, and low enough that the mascot can stand on top when the screen leaves room */
function fitWork(el){
  if(isMobile()||el.dataset.fit)return;el.dataset.fit='1';
  const dw=desk.clientWidth,dh=desk.clientHeight,body=$('.wbody',el);
  el.style.width=Math.min(800,dw-16)+'px';el.style.height='200px';
  const need=200-body.clientHeight+body.scrollHeight+4,roof=Math.ceil(buddy.offsetHeight*SOLE/CELL_H)+HOPTOP;
  const y=need<=dh-6-roof?roof:Math.max(16,Math.min(64,dh-6-need)),h=Math.min(need,dh-6-y);
  el.style.top=y+'px';el.style.height=h+'px';
  /* keep clear of the open-windows list in the bottom-left corner (it grows as windows open) */
  const sr=$('#strip').getBoundingClientRect(),dr=desk.getBoundingClientRect();
  if(y+h>sr.top-dr.top-4)el.style.left=Math.max(parseFloat(el.style.left)||0,272)+'px';
  clampWin(el);
}
function renderList(){
  const el=WIN.work.el;let rows=P.slice();
  if(sortK)rows.sort((a,b)=>{const A=sortK==='year'?yrOf(a.year):a[sortK].toLowerCase(),B=sortK==='year'?yrOf(b.year):b[sortK].toLowerCase();return (A>B?1:A<B?-1:0)*sortD});
  $('tbody',el).innerHTML=rows.map(p=>`<tr class="row" data-p="${p.id}"><td><button class="rb"><i class="sw" style="--pa:${p.acc}"></i>${esc(p.name)}</button></td><td>${esc(p.role)}</td><td>${esc(p.studio)}</td><td class="yr">${p.year}</td><td class="bl">${esc(p.blurb||"")}</td></tr>`).join('');
  $$('th',el).forEach(th=>{const on=th.dataset.k===sortK;on?th.setAttribute('aria-sort',sortD>0?'ascending':'descending'):th.removeAttribute('aria-sort');$('.ar',th).innerHTML=on?gl(sortD>0?'up':'down'):''});
}
function setView(v){
  if(v==='list')TK.discover('view-list');
  view=v;const el=WIN.work.el;
  $$('[data-view]',el).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===v)));
  $('#iv').hidden=v!=='icons';$('#lv').hidden=v!=='list';$('.slide',el).style.visibility=v==='icons'?'':'hidden';
}

/* ================= Career ================= */
makeWin({id:'career',title:'Career',x:200,y:56,w:760,grow:1,foot:`<span>${CAREER.length} positions</span><span></span>`,
 body:`<div class="tablewrap cv"><table class="list"><thead><tr><th></th><th><span>Years</span></th><th><span>Role</span></th><th><span>Company</span></th></tr></thead><tbody id="cvb"></tbody></table></div>`,
 init(el){
   const tb=$('#cvb',el);
   const row=(r,i)=>`<tr data-i="${i}"><td class="tg"><button class="ws" aria-expanded="false" aria-controls="cd${i}" aria-label="Details: ${esc(r[1])}, ${esc(r[2])}">${gl('tri')}</button></td><td class="yr">${esc(r[0])}</td><td style="font-weight:600">${esc(r[1])}</td><td>${esc(r[2])}</td></tr>
     <tr class="det" id="cd${i}" data-d="${i}" hidden><td></td><td colspan="3"><ul>${r[3].map(a=>`<li><strong>${esc(a[0])}</strong><span>${esc(a[1])}</span></li>`).join('')}</ul></td></tr>`;
   tb.innerHTML=CAREER.map(row).join('');
   tb.addEventListener('click',e=>{const tr=e.target.closest('tr[data-i]');if(!tr||String(getSelection()))return;
     const w=$('.ws',tr),o=w.getAttribute('aria-expanded')!=='true';w.setAttribute('aria-expanded',String(o));tr.classList.toggle('open',o);$('#cd'+tr.dataset.i,tb).hidden=!o});
 }});

/* ================= About, Mail, Press, Unreleased ================= */
/* a project window fetches the real page (see projWin) */
/* ================= windows with images: every image shows dithered for half a second (after the 250 ms folder-open zoom), then dissolves to the real image ================= */
let v80on=false;
const dzs=new Set();let dzRaf=0;
function dzPlace(cv){const img=cv._img;cv.style.left=img.offsetLeft+'px';cv.style.top=img.offsetTop+'px';cv.style.width=Math.ceil(img.clientWidth/2)*2+'px';cv.style.height=Math.ceil(img.clientHeight/2)*2+'px'}
function dzLoop(){dzRaf=0;dzs.forEach(cv=>{if(!cv._img.isConnected){cv.remove();dzs.delete(cv);return}dzPlace(cv)});if(dzs.size)dzRaf=requestAnimationFrame(dzLoop)}
function clearDither(el){$$('.dz2',el).forEach(c=>{clearTimeout(c._t);clearTimeout(c._t2);c._img._dz=null;dzs.delete(c);c.remove()})}
function ditherIn(el){
  if(reduce||v80on)return;
  const body=$('.wbody',el);
  $$('img',body).forEach(img=>{
    if(img.closest('.art'))return;
    const go=()=>{
      if(!img.isConnected||!img.naturalWidth||img.clientWidth<8||img.clientHeight<8)return;
      if(img._dz){clearTimeout(img._dz._t);clearTimeout(img._dz._t2);img._dz.remove();dzs.delete(img._dz)}
      const nw=img.naturalWidth,nh=img.naturalHeight,cw=Math.ceil(img.clientWidth/2),ch=Math.ceil(img.clientHeight/2);
      const cv=document.createElement('canvas');cv.className='dz2';cv.setAttribute('aria-hidden','true');cv.width=cw;cv.height=ch;
      const x=cv.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='low';
      if(getComputedStyle(img).objectFit==='cover'){const s=Math.max(cw/nw,ch/nh),sw=cw/s,sh=ch/s;x.drawImage(img,(nw-sw)/2,(nh-sh)/2,sw,sh,0,0,cw,ch)}else x.drawImage(img,0,0,cw,ch);
      cv.style.clipPath=getComputedStyle(img).clipPath;cv._img=img;cv._lv=16;img._dz=cv;dzs.add(cv);
      (img.offsetParent||body).appendChild(cv);dzPlace(cv);
      cv._t=setTimeout(()=>{dissolve(cv,0,220);cv._t2=setTimeout(()=>{cv.remove();dzs.delete(cv);img._dz=null},250)},280);
      if(!dzRaf)dzRaf=requestAnimationFrame(dzLoop)};
    if(img.complete&&img.naturalWidth)go();else img.addEventListener('load',go,{once:true});
  });
}
/* ================= D5: Trash holds the Unreleased program ================= */
const GLY='#%&@$*+=?<>/|{}~^;:';
const rg=()=>GLY[(Math.random()*GLY.length)|0];
makeWin({id:'trash',title:'Trash',x:420,y:110,w:420,h:300,
 body:`<div class="tr"><button class="item" data-open="unreleased" style="width:112px"><span class="app dk"><i></i><b class="gx"></b></span><span class="nm">Unreleased</span></button><button class="item" id="tr-compost" hidden style="width:112px"><span class="cmp" aria-hidden="true">${svg(ICON.compost,2)}</span><span class="nm">Compost</span></button><button class="item" id="tr-sprout" hidden style="width:112px"><span class="cmp" aria-hidden="true"><canvas class="spr" width="16" height="22"></canvas></span><span class="nm">Sprout</span></button></div>`,foot:'<span>1 item</span><span></span>',
 init(el){
   const gx=$('.gx',el);
   fillGx(gx);
   $('[data-open="unreleased"]',el).addEventListener('click',e=>{if(gameOn())return;$$('.item',el).forEach(x=>x.classList.toggle('sel',x===e.currentTarget));openWin('unreleased',e.currentTarget)});
   $$('#tr-compost,#tr-sprout',el).forEach(b=>b.addEventListener('click',e=>{$$('.item',el).forEach(x=>x.classList.toggle('sel',x===e.currentTarget))}));
 },
 onclose(el){$$('.item',el).forEach(x=>x.classList.remove('sel'))}});
makeWin({id:'unreleased',title:'Unreleased',x:360,y:60,w:640,h:560,grow:1,
 body:`<div class="unr" id="unr"><canvas class="nz" aria-hidden="true"></canvas><div class="tx">${UNR.map(t=>`<p>${t}</p>`).join('')}</div></div>`,foot:'<span>5 paragraphs</span><span></span>',
 init(el){
   const u=$('#unr',el);
   (function split(n){[...n.childNodes].forEach(c=>{if(c.nodeType===3){const f=document.createDocumentFragment();[...c.textContent].forEach(ch=>{if(/\s/.test(ch))f.appendChild(document.createTextNode(ch));else{const i=document.createElement('i');i.className='c';i.dataset.ch=ch;i.textContent=ch;i.style.fontStyle='normal';f.appendChild(i)}});c.replaceWith(f)}else if(c.nodeType===1)split(c)})})($('.tx',u));
   u._cs=$$('.c',u);
 },
 onopen(el){runUnr(el)},
 onclose(el){stopUnr(el)}});
function stopUnr(el){const u=$('#unr',el);clearInterval(u._t);u._t=0;u.classList.remove('glitch');el.classList.remove('gl');
  $$('.tx p',u).forEach(p=>p.style.transform='');const nz=$('.nz',u);nz.getContext('2d').clearRect(0,0,nz.width,nz.height);u._cs.forEach(c=>{c.textContent=c.dataset.ch})}
function runUnr(el){
  const u=$('#unr',el),cs=u._cs,nz=$('.nz',u),ctx=nz.getContext('2d'),ps=$$('.tx p',u);
  stopUnr(el);if(reduce)return;
  const W=Math.max(60,Math.ceil(u.clientWidth/3)),H=Math.max(60,Math.ceil(u.clientHeight/3));nz.width=W;nz.height=H;
  u.classList.add('glitch');el.classList.add('gl');
  cs.forEach(c=>{c.textContent=rg()});
  const PAL=['#1E3A3C','#008080','#0F5E60','#FF3333','#FFFFFF','#3BE0FF'];
  let t0=performance.now(),idx=0,prev=0,burst=0,fin=0;
  const done=()=>{stopUnr(el);el.removeEventListener('pointerdown',skip,true);el.removeEventListener('keydown',skip,true)};
  const skip=()=>done();
  el.addEventListener('pointerdown',skip,true);el.addEventListener('keydown',skip,true);
  u._t=setInterval(()=>{
    const t=performance.now()-t0;
    if(t>1700)idx=Math.min(cs.length,idx+15);
    for(let i=prev;i<idx;i++)cs[i].textContent=cs[i].dataset.ch;prev=idx;
    const span=Math.min(260,cs.length-idx);for(let k=0;k<60&&span>0;k++){cs[idx+((Math.random()*span)|0)].textContent=rg()}
    if(Math.random()<.07)burst=5;
    const d=burst>0?.55:Math.max(.04,.9-t/3200);if(burst>0)burst--;
    ctx.clearRect(0,0,W,H);
    if(t<1000){ctx.fillStyle='rgba(10,20,21,'+(.9-t/1200).toFixed(2)+')';ctx.fillRect(0,0,W,H)}
    const n=Math.floor(d*W*H*.05);for(let k=0;k<n;k++){ctx.fillStyle=PAL[(Math.random()*PAL.length)|0];ctx.fillRect((Math.random()*W)|0,(Math.random()*H)|0,1+((Math.random()*3)|0),1)}
    const bars=d>.3?3:1;for(let k=0;k<bars;k++){const y=(Math.random()*H)|0,h=1+((Math.random()*5)|0);ctx.fillStyle=PAL[(Math.random()*3)|0];ctx.fillRect(0,y,W,h)}
    ps.forEach(p=>{p.style.transform=(burst>0||t<1700)&&Math.random()<.5?`translateX(${((Math.random()*14)-7)|0}px)`:''});
    if(idx>=cs.length&&!fin){fin=1;setTimeout(done,350)}
  },80);
}
/* ================= D5: About with the full distill ================= */
function initDistill(el){
  const card=$('#glass',el),toggle=$('#pbtn',el);if(!card)return;
  const DWELL=0,FADE=1500,ps=$$('.abp',card);
  const ann=document.createElement('p');ann.className='vh';ann.setAttribute('aria-live','polite');card.appendChild(ann);
  let fadeT=null,poemT=null,active=false,mode=null,poem=null,clones=[],run=0;
  function lines(){const L={};$$('.kw',card).forEach(k=>{(L[k.dataset.line]=L[k.dataset.line]||[]).push(k)});
    return Object.keys(L).sort().map(n=>{let text='';const pieces=L[n].map(kw=>{let piece=kw.textContent.replace(/\s+/g,' ');if(!text||text.endsWith(' '))piece=piece.replace(/^ /,'');const start=text.length;text+=piece;return {kw,piece,start}});return {text:text.trim(),pieces}})}
  function start(m){
    if(active||fadeT||poemT)return;mode=m;TK.discover('distill-'+m);if(toggle)toggle.setAttribute('aria-pressed','true');
    const delay=m==='hover'?DWELL:0,len=reduce?0:(m==='hover'?FADE:900);
    fadeT=setTimeout(()=>{fadeT=null;card.classList.add('text-fading');poemT=setTimeout(()=>{poemT=null;active=true;card.classList.add('keywords-activated');toPoem()},len)},delay);
  }
  function reset(){
    run++;clearTimeout(fadeT);clearTimeout(poemT);fadeT=poemT=null;mode=null;if(toggle)toggle.setAttribute('aria-pressed','false');
    card.classList.remove('text-fading','keywords-activated','keywords-poem');card.style.height='';card.style.minHeight='';
    clones.forEach(c=>c.remove());clones=[];if(poem){poem.remove();poem=null}
    ps.forEach(p=>{p.style.display='';p.style.visibility=''});$$('.kw',card).forEach(k=>k.style.visibility='');ann.textContent='';active=false;
  }
  card.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')start('hover')});
  card.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch'&&mode==='hover')reset()});
  card.addEventListener('pointerup',e=>{if(e.pointerType!=='touch'||e.target.closest('.pbtn'))return;if(mode)reset();else start('toggle')});
  if(toggle)toggle.addEventListener('click',()=>{if(mode==='toggle')reset();else{reset();start('toggle')}});
  function toPoem(){
    TK.discover('distill-done');
    const my=run,L=lines(),cr=card.getBoundingClientRect();
    card.style.height=cr.height+'px';card.style.minHeight=cr.height+'px';
    poem=document.createElement('div');poem.className='poem-container';poem.setAttribute('aria-hidden','true');
    L.forEach(l=>{const d=document.createElement('div');d.className='poem-line';d.textContent=l.text;poem.appendChild(d)});
    const s=L.map(l=>l.text).join(' ');ann.textContent=s.charAt(0).toUpperCase()+s.slice(1)+'.';
    ps.forEach(p=>p.style.visibility='hidden');card.appendChild(poem);
    if(reduce){card.classList.add('keywords-poem');return}
    const els=[...poem.children];els.forEach(e=>e.style.animation='none');const rects=els.map(e=>e.getBoundingClientRect());poem.style.display='none';
    const fs=getComputedStyle(ps[0]).fontSize;
    const ms=document.createElement('span');ms.className='keyword-clone';ms.style.cssText='position:absolute;visibility:hidden;white-space:pre;font-size:'+fs;card.appendChild(ms);
    const wOf=t=>{ms.textContent=t;return ms.getBoundingClientRect().width};
    L.forEach((line,i)=>{const lr=rects[i],left=cr.left+(cr.width-wOf(line.text))/2;
      line.pieces.forEach(({kw,piece,start})=>{const from=kw.getBoundingClientRect(),c=document.createElement('span');c.className='keyword-clone';c.setAttribute('aria-hidden','true');c.textContent=piece;
        c.style.cssText=`position:absolute;left:${from.left-cr.left}px;top:${from.top-cr.top}px;font-size:${fs};`;
        c.dataset.left=`${left-cr.left+wOf(line.text.slice(0,start))}px`;c.dataset.top=`${lr.top-cr.top}px`;card.appendChild(c);clones.push(c);kw.style.visibility='hidden'})});
    ms.remove();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{if(my!==run)return;clones.forEach(c=>{c.style.left=c.dataset.left;c.style.top=c.dataset.top});setTimeout(()=>{if(my===run)card.classList.add('keywords-poem')},550)}));
  }
}
makeWin({id:'about',title:'About',x:300,y:56,w:640,grow:1,
 body:`<div class="ab"><div class="ab-h"><span class="dm" id="abdm" aria-hidden="true"></span><div class="ab-t"><b>${NAME}</b><span>Game Designer &amp; Director</span></div></div>
 <div class="etch"></div>
 <dl class="ab-facts"><dt>Experience</dt><dd>22+ years</dd><dt>Design teams led</dt><dd>12+</dd><dt>Shipped titles</dt><dd>15</dd></dl>
 <div class="ab-well"><div class="glass" id="glass"><button class="pbtn" id="pbtn" type="button" aria-pressed="false" aria-label="Distill this into one sentence">※</button><p class="abp">${ABOUT[0]}</p><p class="abp">${ABOUT[1]}</p></div></div>
 <div class="ab-foot">${TAG}</div></div>`,
 init(el){initDistill(el)}});
/* ================= D5: real project pages in windows ================= */
const SLUGID=Object.fromEntries(P.map(p=>[p.slug,p.id]));
let pjN=0;
/* a project window shows the real page: its <main> is fetched, then adapted for the window (ids prefixed, URLs made absolute) */
function adaptMain(html,slug){
  const doc=new DOMParser().parseFromString(html,'text/html'),main=doc.querySelector('main');if(!main)throw new Error('no main');
  const base=new URL('/projects/'+slug+'.html',location.origin),abs=u=>{try{return new URL(u,base).href}catch(_){return u}};
  const ids=new Map();$$('[id]',main).forEach(e=>ids.set(e.id,slug+'--'+e.id));
  const fix=v=>v.replace(/#([A-Za-z0-9_\-:.]+)/g,(m,x)=>ids.has(x)?'#'+ids.get(x):m);
  $$('*',main).forEach(e=>{for(const a of [...e.attributes]){
    if(['aria-labelledby','aria-controls','aria-describedby','for'].includes(a.name))e.setAttribute(a.name,a.value.split(/\s+/).map(x=>ids.get(x)||x).join(' '));
    else if(['href','xlink:href','fill','stroke','filter','clip-path','mask','marker-start','marker-end','marker-mid','style'].includes(a.name)&&a.value.includes('#'))e.setAttribute(a.name,fix(a.value))}});
  $$('[id]',main).forEach(e=>{e.id=ids.get(e.id)});
  $$('script,noscript',main).forEach(e=>e.remove());
  $$('img,source,video,audio,iframe',main).forEach(e=>{
    for(const a of ['src','poster']){const v=e.getAttribute(a);if(v&&!/^(data:|https?:|\/\/)/.test(v))e.setAttribute(a,abs(v))}
    const ss=e.getAttribute('srcset');if(ss)e.setAttribute('srcset',ss.split(',').map(c=>{const [u,...r]=c.trim().split(/\s+/);return [abs(u),...r].join(' ')}).join(', '))});
  $$('a[href]',main).forEach(a=>{const v=a.getAttribute('href');if(v&&!/^(#|data:|https?:|mailto:|tel:|\/\/)/.test(v))a.setAttribute('href',abs(v))});
  $$('img',main).forEach(i=>{i.removeAttribute('loading');i.decoding='async'});
  $$('video',main).forEach(v=>{v.setAttribute('data-auto','1');v.removeAttribute('autoplay');v.muted=true;v.preload='metadata'});
  return main;
}
function wireRw(el){
  if(el._w)return;el._w=1;
  const body=$('.wbody',el);
  const toId=h=>{const m=(h||'').match(/(?:^|\/)([\w-]+)\.html(?:#.*)?$/);return m&&SLUGID[m[1]]};
  el.addEventListener('click',e=>{const a=e.target.closest('a');if(!a||!el.contains(a)||!$('.rw',el).contains(a))return;const h=a.getAttribute('href')||'';
    if(h.startsWith('#')){e.preventDefault();const t=$('[id="'+h.slice(1)+'"]',el);if(t)body.scrollTop=t.getBoundingClientRect().top-body.getBoundingClientRect().top+body.scrollTop-12;return}
    const hm=h.match(/index\.html#([\w-]+)$/);if(hm){e.preventDefault();openHash(hm[1]);return}
    const id=toId(h);if(id){e.preventDefault();openWin(id,a);return}
    if(/^https?:/.test(h)){a.target='_blank';a.rel='noopener'}});
  const rl=$$('.cs-rail a',el);
  if(rl.length){const secs=rl.map(a=>$('[id="'+(a.getAttribute('href')||'').slice(1)+'"]',el)).filter(Boolean);let tk=0;
    const upd=()=>{tk=0;const line=body.getBoundingClientRect().top+body.clientHeight*.35;let cur=null;secs.forEach(s=>{if(s.getBoundingClientRect().top<=line)cur=s});rl.forEach(a=>a.classList.toggle('is-current',!!cur&&a.getAttribute('href')==='#'+cur.id))};
    body.addEventListener('scroll',()=>{if(!tk){tk=1;requestAnimationFrame(upd)}},{passive:true});upd()}
}
function loadRw(el){
  if(el._loaded){$$('video[data-auto]',el).forEach(v=>{if(!v._off&&!reduce)v.play().catch(()=>{})});return}
  el._loaded=1;
  $$('video[data-auto]',el).forEach(v=>{
    const fig=v.closest('figure');
    if(fig){fig.classList.add('has-video-toggle');const b=document.createElement('button');b.type='button';b.className='video-toggle';
      const sync=()=>{const pl=!v.paused;b.setAttribute('aria-label',pl?'Pause clip':'Play clip');b.setAttribute('aria-pressed',String(!pl))};
      b.addEventListener('click',()=>{if(v.paused){v._off=0;v.play().catch(()=>{});if(el._rd)el._rd.video()}else{v._off=1;v.pause()}});v.addEventListener('play',sync);v.addEventListener('pause',sync);sync();fig.appendChild(b)}
    if(!reduce)v.play().catch(()=>{});else v._off=1;
  });
}
function ensureProject(el,p){
  if(el._ld)return el._ld;
  const rw=$('.rw',el);
  return el._ld=fetch('/projects/'+p.slug+'.html').then(r=>{if(!r.ok)throw new Error(r.status);return r.text()}).then(t=>{
    rw.replaceChildren(adaptMain(t,p.slug));rw.removeAttribute('aria-busy');wireRw(el);
    $$('img',el).forEach(i=>i.decode&&i.decode().catch(()=>{}));
  }).catch(()=>{el._ld=null;rw.innerHTML='<p class="pad"><a href="/projects/'+p.slug+'.html">'+esc(p.name)+'</a></p>';rw.removeAttribute('aria-busy')});
}
/* reading a case study: how far down it got (0/25/50/75/100) and for how long. Time counts only while the window is the front one
   and the tab is visible, so stacked windows do not each claim the same minutes. Sent when the window closes or the tab is
   hidden; under 3 s is a glance and is dropped. */
function readTick(r,on){
  const now=performance.now();
  if(on&&r.t0===null)r.t0=now;
  else if(!on&&r.t0!==null){r.acc+=now-r.t0;r.t0=null}
}
function readSync(){const vis=!document.hidden;reads.forEach(r=>readTick(r,vis&&topId===r.id))}
function readBegin(r){r.t0=null;r.acc=0;r.max=0}
function readEnd(r){
  readTick(r,false);r.max=Math.max(r.max,r.bucket());
  const secs=Math.round(r.acc/1000);r.acc=0;
  if(secs>=3)TK.track('project_read',{slug:r.slug,depth:r.max,secs:Math.min(secs,1800)});
  r.max=0;
}
TK.onHide(()=>reads.forEach(readEnd));
document.addEventListener('visibilitychange',readSync);
function projWin(p){
  const n=pjN++%5;
  const rd={id:p.id,slug:p.slug,t0:null,acc:0,max:0,vid:0,body:null,ok:0,
    bucket(){const b=this.body;if(!b||!this.ok||!b.clientHeight)return 0;const m=b.scrollHeight-b.clientHeight;return m<=1?100:Math.min(100,Math.floor((b.scrollTop+b.clientHeight)/b.scrollHeight*4)*25)},
    video(){if(!this.vid){this.vid=1;TK.track('video',{slug:this.slug})}}};
  return makeWin({id:p.id,title:p.name,x:96+n*32,y:36+n*24,w:960,h:700,grow:1,acc:p.acc,ink:p.ink,
   body:'<div class="rw" aria-busy="true"></div>',
   foot:`<span>jtylermc.ca/projects/${p.slug}.html</span><span></span>`,
   init(el){
     el._rd=rd;rd.body=$('.wbody',el);
     rd.body.addEventListener('scroll',()=>{rd.max=Math.max(rd.max,rd.bucket())},{passive:true});
     /* a clip with its own controls: the visitor pressed play (the looping clips start by themselves, their button is handled in loadRw) */
     el.addEventListener('play',e=>{const v=e.target;if(v.tagName==='VIDEO'&&!v.hasAttribute('data-auto')&&!v.hasAttribute('autoplay'))rd.video()},true)},
   onopen(el){readBegin(rd);reads.add(rd);ensureProject(el,p).then(()=>{rd.ok=1;loadRw(el)})},
   onshown(el){ensureProject(el,p).then(()=>ditherIn(el))},
   onclose(el){readEnd(rd);reads.delete(rd);$$('video',el).forEach(v=>v.pause());clearDither(el)}});
}
/* ================= Contacts: one icon per way to reach him; Email opens the compose-style dialog ================= */
makeWin({id:'contacts',title:'Contacts',x:380,y:140,w:420,h:250,
 body:`<div class="ct"><p class="ml-h">Let's Work Together</p><div class="tr" style="padding:0">
  <button class="item" type="button" data-mail style="width:112px"><span class="cmp" aria-hidden="true">${svg(ICON.mail,2)}</span><span class="nm">Email</span></button>
  <a class="item" href="https://www.linkedin.com/in/jtylermc/" target="_blank" rel="noopener" style="width:112px"><span class="cmp" aria-hidden="true">${svg(ICON.linkedin,2)}</span><span class="nm">LinkedIn</span></a></div></div>`,
 foot:'<span>2 items</span><span></span>',
 init(el){$('[data-mail]',el).addEventListener('click',e=>{TK.track('contact',{method:'email-open'});$$('.item',el).forEach(x=>x.classList.toggle('sel',x===e.currentTarget));openWin('mail',e.currentTarget)})},
 onclose(el){$$('.item',el).forEach(x=>x.classList.remove('sel'))}});
makeWin({id:'mail',title:'Email',x:430,y:190,w:480,
 body:`<div class="ml"><span class="ml-ic" aria-hidden="true">${svg(ICON.mail,3)}</span>
  <div class="ml-c"><div class="ml-to"><span class="ml-l">To:</span><span class="ml-f" id="ml-addr" tabindex="0">jtylermc@gmail.com</span></div></div>
  <div class="etch ml-sep"></div>
  <div class="ml-btns"><button class="btn bev" type="button" id="ml-copy">Copy</button><span class="ring"><a class="btn bev" href="mailto:jtylermc@gmail.com">Compose</a></span></div></div>`,
 init(el){
   $('#ml-copy',el).addEventListener('click',async e=>{const b=e.currentTarget,t=$('#ml-addr',el);TK.track('contact',{method:'email-copy'});
     try{await navigator.clipboard.writeText(t.textContent)}catch(_){const r=document.createRange();r.selectNodeContents(t);const s=getSelection();s.removeAllRanges();s.addRange(r)}
     b.textContent='Copied';setTimeout(()=>{b.textContent='Copy'},1200)});
 }});
/* ================= achievements: counters, the secret panel, the logo-click progress bar and the ending ================= */
const LSM={};try{localStorage.removeItem('tos_stats');localStorage.removeItem('tos_ending')}catch(_){}
const LS={get(k){return LSM[k]==null?null:LSM[k]},set(k,v){LSM[k]=v}};
let ST={clicks:0,flowers:0,sprouts:0,drops:0};
try{Object.assign(ST,JSON.parse(LS.get('tos_stats')||'{}'))}catch(_){}
let endingDone=LS.get('tos_ending')==='1';
function renderAch(){const el=$('#w-achv');if(!el)return;$$('[data-st]',el).forEach(n=>{n.textContent=String(ST[n.dataset.st]|0)})}
function bump(k){ST[k]=(ST[k]|0)+1;LS.set('tos_stats',JSON.stringify(ST));renderAch()}
function starMark(c){const m=c.width,x=c.getContext('2d'),h=m/2;x.clearRect(0,0,m,m);x.fillStyle='#FFF3E6';
  for(let i=2;i<m-2;i++){x.fillRect(h-1,i,2,1);x.fillRect(i,h-1,1,2);x.fillRect(i,i,1,1);x.fillRect(m-1-i,i,1,1)}}
makeWin({id:'achv',title:'Achievements',x:420,y:100,w:380,
 body:`<div class="ach2"><div class="ach-h"><span class="dm" id="achdm" aria-hidden="true"></span><b>Achievements</b></div><div class="etch"></div>
  <div class="ach-list" role="list">
   <div class="ar" role="listitem"><span class="al">Mascot clicks</span><b class="av" data-st="clicks">0</b></div>
   <div class="ar" role="listitem"><span class="al">Flowers fed</span><b class="av" data-st="flowers">0</b></div>
   <div class="ar" role="listitem"><span class="al">Sprouts fed</span><b class="av" data-st="sprouts">0</b></div>
   <div class="ar" role="listitem"><span class="al">Drops</span><b class="av" data-st="drops">0</b></div>
  </div></div>`,
 onopen(){renderAch()},
 init(el){const c=discMark($('#achdm',el),40,2);starMark(c);renderAch()}});
/* --- the logo-click progress bar (from the live site): messages at milestones, a bar from 50 to 100 clicks, then the ending --- */
const LMSG={3:"...Oh? What you clicking this for?",15:"Curious one aren't you?",35:"Every click plants a seed... ",45:"wow, you've clicked 45 times...",65:"...what lies beyond the final seed?",95:"The final seed awaits..."};
const SCR='#%&@$*+=?<>/|{}~^;:';
let logoN=0,achEl=null,achFill=null,achLabelT=0;
function shake(power){if(reduce)return;const d=$('#desk');let n=0;const t=setInterval(()=>{n++;if(n>8){clearInterval(t);d.style.transform='';return}d.style.transform=`translate(${Math.round((Math.random()*2-1)*power)}px,${Math.round((Math.random()*2-1)*power)}px)`},38)}
function burstAt(x,y,count){if(reduce)return;for(let i=0;i<count;i++){const p=document.createElement('i');p.className='bp';const a=Math.PI*2*i/count+(Math.random()-.5)*.4,v=50+Math.random()*70;
  p.style.cssText=`left:${Math.round(x)}px;top:${Math.round(y)}px;--tx:${Math.round(Math.cos(a)*v)}px;--ty:${Math.round(Math.sin(a)*v)}px;background:${['#FF3333','#FFF3E6','#FFD36B'][i%3]}`;document.body.appendChild(p);setTimeout(()=>p.remove(),720)}}
function makeAchBar(){
  if(achEl)return;achEl=document.createElement('div');achEl.id='ach';achEl.className='achb';achEl.setAttribute('role','progressbar');achEl.setAttribute('aria-label','Achievement progress');
  achEl.setAttribute('aria-valuemin','0');achEl.setAttribute('aria-valuemax','100');achEl.setAttribute('aria-valuenow','0');
  achEl.innerHTML='<i class="af"></i><span class="at">Achievement Unlocked!</span>';$('#mbar').appendChild(achEl);achFill=$('.af',achEl);
  requestAnimationFrame(()=>achEl.classList.add('on'));achLabelT=setTimeout(()=>{const t=$('.at',achEl);t&&t.classList.add('fade')},3000);
}
function setAch(p){if(!achEl||!achFill)return;achFill.style.width=Math.round(p*100)+'%';achEl.setAttribute('aria-valuenow',String(Math.round(p*100)))}
function completeAch(){
  if(!achEl)return;TK.discover('ach-complete',{},'ach_complete');clearTimeout(achLabelT);const r=achEl.getBoundingClientRect();burstAt(r.left+r.width/2,r.top+r.height/2,30);
  setTimeout(()=>{achEl.classList.add('complete');achEl.setAttribute('role','button');achEl.removeAttribute('aria-valuenow');achEl.setAttribute('aria-label','Open the ending');achEl.tabIndex=0;const t=$('.at',achEl);t.classList.remove('fade');t.textContent='complete'},reduce?0:400);
  const go=()=>{if(achEl.classList.contains('complete'))openEnding()};
  achEl.addEventListener('click',go);achEl.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}});
}
/* the logo is just a logo again; the discovery now lives on the mascot: clicks are counted, milestone lines are spoken, the bar runs from 50 to 100, then the ending */
function logoClick(){if(!endingDone)cycleLogo()}
function discoveryClick(){
  if(endingDone)return false;logoN++;let said=false;
  if(LMSG[logoN]){const r=buddy.getBoundingClientRect(),p={3:4,15:6,35:9,65:12}[logoN]||6;shake(p);burstAt(r.left+r.width/2,r.top+r.height*.55,10+p*2);TK.discover('mascot-'+logoN)}
  if(logoN===50){makeAchBar();TK.discover('ach-bar',{},'ach_bar')}
  if(logoN>=50&&logoN<100)setAch((logoN-50)/50);
  if(logoN===100){setAch(1);completeAch()}
  return said;
}
/* --- the secret ending --- */
const END_LINES=["....","Wow.","","I didn't expect to see you here.","","Design and Interactions can be so simple","yet they can still captivate us,","drawn in by our curiosity we want to see what could possibly be next.","This desire connects us, makes us human.","We create to connect to others, to send a part of us out into the world.","","Thank you for engaging and spending a moment with me."];
const endEl=document.createElement('div');endEl.id='ending';endEl.setAttribute('role','dialog');endEl.setAttribute('aria-modal','true');endEl.setAttribute('aria-label','Thank you');
endEl.innerHTML='<canvas class="ec" aria-hidden="true"></canvas><button class="ex wbtn" type="button" aria-label="Close">'+wb('close')+'</button><div class="et"></div>';document.body.appendChild(endEl);
let endRun=0,endRaf=0,endRet=null;
function endStars(cv){
  const x=cv.getContext('2d'),W=cv.width=innerWidth,H=cv.height=innerHeight,C=['#FFFFFF','#F5F5F0','#FF3333'];
  const P=Array.from({length:150},()=>({x:Math.random()*W,y:Math.random()*H,s:1+((Math.random()*3)|0),vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,c:C[(Math.random()*3)|0],a:.5+Math.random()*.5}));
  const f=()=>{x.clearRect(0,0,W,H);P.forEach(p=>{p.x=(p.x+p.vx+W)%W;p.y=(p.y+p.vy+H)%H;x.globalAlpha=p.a;x.fillStyle=p.c;x.fillRect(Math.round(p.x),Math.round(p.y),p.s,p.s)});endRaf=requestAnimationFrame(f)};f();
}
function openEnding(){
  TK.discover('ending-open',{},'ach_ending');
  endRet=document.activeElement;const t=$('.et',endEl),run=++endRun;t.innerHTML='';
  const ps=END_LINES.map(l=>{const p=document.createElement('p');p.dataset.t=l;t.appendChild(p);return p});
  endEl.classList.add('on');if(!reduce)endStars($('.ec',endEl));
  setTimeout(()=>$('.ex',endEl).focus(),reduce?0:1000);
  if(reduce){ps.forEach(p=>{p.textContent=p.dataset.t});return}
  const typeP=i=>{if(run!==endRun||i>=ps.length)return;const p=ps[i],txt=p.dataset.t;
    if(!txt.trim()){setTimeout(()=>typeP(i+1),200);return}
    p.classList.add('typing');let k=0;const ch=()=>{if(run!==endRun)return;if(k<txt.length){p.textContent+=txt[k++];setTimeout(ch,30)}else{p.classList.remove('typing');setTimeout(()=>typeP(i+1),400)}};ch()};
  setTimeout(()=>typeP(0),1000);
}
function closeEnding(){
  endRun++;cancelAnimationFrame(endRaf);endEl.classList.remove('on');
  endingDone=true;TK.discover('ending-done');LS.set('tos_ending','1');showSpecialBar();paintMarks();
  if(endRet&&document.contains(endRet)&&endRet.focus)endRet.focus({preventScroll:true});
}
$('.ex',endEl).addEventListener('click',closeEnding);
/* --- returning visitors, and after the ending: the special bar opens the Achievements window --- */
function showSpecialBar(){
  clearTimeout(achLabelT);
  const n=document.createElement('div');n.id='ach';n.className='achb on special';n.setAttribute('role','button');n.setAttribute('aria-label','Open Achievements');n.tabIndex=0;n.innerHTML='<span class="at">Achievements</span>';
  if(achEl)achEl.remove();achEl=n;$('#mbar').appendChild(n);
  const go=()=>openWin('achv',n);n.addEventListener('click',go);n.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}});
}
if(endingDone)showSpecialBar();
/* ================= D6: How I Work, Who I've worked with, rotating taglines, info lines, 404 ================= */
const HOW=OSD.how,WORKED=OSD.worked,TAGS=OSD.taglines,UNRL=OSD.unrLine;
const pidOf=slug=>SLUGID[slug];
/* the status bar's left cell doubles as an info line: hover or focus a thing and it says what it is */
function footInfo(root,sel,textOf){
  const cell=$('.wfoot span',root.closest('.win')),rest=cell.textContent;
  const on=e=>{const t=e.target.closest(sel);if(!t||t.contains(e.relatedTarget))return;const s=textOf(t);if(s)cell.textContent=s};
  const off=e=>{const t=e.target.closest(sel);if(!t||t.contains(e.relatedTarget))return;cell.textContent=cell.dataset.rest||rest};
  root.addEventListener('pointerover',on);root.addEventListener('pointerout',off);root.addEventListener('focusin',on);root.addEventListener('focusout',off);
}
makeWin({id:'how',title:'How I Work',x:300,y:96,w:560,grow:1,
 body:`<div class="hw">${HOW.map((h,i)=>`<div class="hr" data-i="${i}"><button class="hb" type="button" aria-expanded="false" aria-controls="hp${i}"><span class="hn">${String(i+1).padStart(2,'0')}</span><span class="ht">${esc(h.title)}</span><span class="hg">${gl('tri')}</span></button><div class="hp" id="hp${i}" hidden><p>${h.proj?`<strong>${esc(h.proj)}</strong> — `:''}${esc(h.text)}</p><button class="btn bev" type="button" data-slug="${h.slug}">${esc(h.link.replace(/^\[\s*|\s*\]$/g,''))}</button></div></div>`).join('')}</div>`,
 foot:`<span>${HOW.length} principles</span><span></span>`,
 init(el){
   const hw=$('.hw',el);
   hw.addEventListener('click',e=>{
     const lk=e.target.closest('[data-slug]');if(lk){const id=pidOf(lk.dataset.slug);if(id)openWin(id,lk);return}
     const b=e.target.closest('.hb');if(!b)return;
     const o=b.getAttribute('aria-expanded')!=='true';b.setAttribute('aria-expanded',String(o));b.closest('.hr').classList.toggle('open',o);$('#'+b.getAttribute('aria-controls'),el).hidden=!o;
   });
 }});
makeWin({id:'worked',title:"Who I've Worked With",x:340,y:120,w:560,grow:1,
 body:`<div class="wk">${WORKED.map(c=>`<div class="wl ${c.cls}" tabindex="0" data-n="${esc(c.name)}"><img src="${c.src}" alt="${esc(c.name)}" style="--lh:${c.h}px" draggable="false" decoding="async"></div>`).join('')}</div>`,
 foot:`<span>${WORKED.length} companies</span><span></span>`,
 init(el){footInfo($('.wk',el),'.wl',t=>t.dataset.n)}});
/* Work and Trash: what each project or item is, in the status bar */
footInfo($('.wbody',WIN.work.el),'[data-p]',t=>{const p=P.find(x=>x.id===t.dataset.p);return p&&p.blurb?`${p.name}: ${p.blurb}`:''});
footInfo($('.wbody',WIN.trash.el),'.item',t=>t.id==='tr-compost'?compostInfo():t.id==='tr-skull'?'Skull: it fits the mascot':UNRL);
/* the Read Me tagline rotates through the four live lines: 5 s, stepped fade, paused while the pointer is over it, still when motion is calm */
(function(){
  const el=WIN.readme.el,tg=$('.tag',el);if(!tg||TAGS.length<2)return;
  let i=0,hov=false,busy=false;
  tg.parentElement.addEventListener('pointerenter',()=>{hov=true});tg.parentElement.addEventListener('pointerleave',()=>{hov=false});
  setInterval(()=>{
    if(reduce||hov||busy||document.hidden||!WIN.readme.open||el.hidden)return;
    busy=true;tg.classList.add('out');
    setTimeout(()=>{i=(i+1)%TAGS.length;tg.textContent=TAGS[i];tg.classList.remove('out');setTimeout(()=>{busy=false},400)},400);
  },5000);
})();
/* drag Compost out of the Trash: one scoop lands on the desktop as a heap you can plant a seed in */
(function(){
  const it=$('#tr-compost');
  it.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;const sx=e.clientX,sy=e.clientY;let ghost=null;it.setPointerCapture(e.pointerId);
    const mv=ev=>{if(!ghost){if(Math.hypot(ev.clientX-sx,ev.clientY-sy)<5)return;
        ghost=document.createElement('div');ghost.className='cghost';ghost.innerHTML=svg(ICON.compost,2);document.body.appendChild(ghost)}
      ghost.style.left=(ev.clientX-32)+'px';ghost.style.top=(ev.clientY-32)+'px'};
    const up=ev=>{it.removeEventListener('pointermove',mv);it.removeEventListener('pointerup',up);it.removeEventListener('pointercancel',up);
      if(!ghost)return;ghost.remove();
      const t=document.elementsFromPoint(ev.clientX,ev.clientY).find(n=>!n.closest('.cghost'));
      const k=['flower','sprout','seed'].find(q=>compost[q]);
      if(t===desk&&k){const dr=desk.getBoundingClientRect();compost[k]--;updCompost();makeHeap(ev.clientX-dr.left,ev.clientY-dr.top+24,k)}};
    it.addEventListener('pointermove',mv);it.addEventListener('pointerup',up);it.addEventListener('pointercancel',up);
  });
})();
/* ================= D6: View (Simple view, 80s version) and the 404 dialog ================= */
let sync80=()=>{};
function set80(on,keep=true){
  if(on&&keep)TK.discover('80s');
  v80on=on;document.documentElement.classList.toggle('v80',on);
  if(keep)try{on?localStorage.setItem('tos_v80','1'):localStorage.removeItem('tos_v80')}catch(_){}
  if(on)for(const k in WIN)if(WIN[k].open)clearDither(WIN[k].el);
  sync80();
}
makeWin({id:'view',title:'View',x:440,y:176,w:340,h:210,
 body:`<div class="tr"><button class="item" type="button" id="vw-simple" style="width:112px"><span class="cmp" aria-hidden="true">${svg(ICON.simple,2)}</span><span class="nm">Simple view</span></button>
  <button class="item" type="button" id="vw-80" aria-pressed="false" style="width:112px"><span class="cmp" aria-hidden="true">${svg(ICON.v80,2)}</span><span class="nm">80s version</span></button></div>`,
 foot:'<span>2 items</span><span></span>',
 init(el){
   $('#vw-simple',el).addEventListener('click',()=>openSimple());
   const c=$('#vw-80',el);c.addEventListener('click',()=>set80(!v80on));
   sync80=()=>{c.setAttribute('aria-pressed',String(v80on));c.classList.toggle('sel',v80on)};
 }});
try{if(localStorage.getItem('tos_v80')==='1')set80(true,false)}catch(_){}
/* 404: the OS error dialog, with the mascot */
const NF_TITLE='Nothing planted here',NF_TEXT="That page doesn't exist, or it has moved.",NF_BTN='Back to the work';
function show404(){showAlert(`<span class="a1">${NF_TITLE}</span><span class="a2">${NF_TEXT}</span>`,NF_BTN,()=>openWin('work',$('#logo')))}
/* the 404 dialog fires on #404 (plain hash, so it works inside the artifact) and from Special > Preview 404 */



/* ================= Control Panel: mascot, hat, screen saver (with a Preview button), wallpaper ================= */
function PREF(k,d){try{return localStorage.getItem(k)||d}catch(_){return d}}
function PSET(k,v){try{localStorage.setItem(k,v)}catch(_){}}
let syncMascotCP=()=>{};
function setHat(h,keep=true){if(keep&&h!=='none')TK.discover('hat:'+h);BS.hat=h==='none'?0:h;if(keep)PSET('tos_hat',h);bRender();gameLookSync()}
function setWall(k,keep=true){if(keep)TK.discover('wall:'+k);WALLK=k;if(keep)PSET('tos_wall',k);buildWall()}
/* other wallpapers: night garden (dithered sky, stars that twinkle), paper grid, plain teal */
let twT=0,stars=[];
function altWall(){
  const Wd=desk.clientWidth,Hd=desk.clientHeight;if(!Wd||!Hd)return;
  wall.width=Wd;wall.height=Hd;wall.style.width=Wd+'px';wall.style.height=Hd+'px';
  const x=wall.getContext('2d');clearInterval(twT);twT=0;stars=[];
  if(WALLK==='plain'){x.fillStyle='#008080';x.fillRect(0,0,Wd,Hd);return}
  if(WALLK==='medallion'){medWall(x,Wd,Hd);return}
  if(WALLK==='paper'){x.fillStyle='#F1EEE2';x.fillRect(0,0,Wd,Hd);
    for(let gx=0;gx<Wd;gx+=24){x.fillStyle=gx%120===0?'#A9BBD6':'#D6DDE7';x.fillRect(gx,0,1,Hd)}
    for(let gy=0;gy<Hd;gy+=24){x.fillStyle=gy%120===0?'#A9BBD6':'#D6DDE7';x.fillRect(0,gy,Wd,1)}return}
  const id=x.createImageData(Wd,Hd),d=id.data,A=[6,9,30],C=[28,46,104];
  for(let y=0;y<Hd;y++){const t=y/Math.max(1,Hd-1);for(let xx=0;xx<Wd;xx++){const c=t>(B8[(y&7)*8+(xx&7)]+.5)/64?C:A,k=(y*Wd+xx)*4;d[k]=c[0];d[k+1]=c[1];d[k+2]=c[2];d[k+3]=255}}
  x.putImageData(id,0,0);
  let sd=7;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;
  for(let i=0;i<Math.round(Wd*Hd/5200);i++){const sx=Math.floor(rnd()*Wd),sy=Math.floor(rnd()*Hd*.85),big=rnd()<.12;stars.push([sx,sy,big]);x.fillStyle=big?'#FFFFFF':'#9FB0E8';x.fillRect(sx,sy,big?2:1,big?2:1)}
  /* a small pixel moon */
  const mx=Math.round(Wd*.14),my=Math.round(Hd*.2);for(let yy=-16;yy<=16;yy++)for(let xx=-16;xx<=16;xx++){if(xx*xx+yy*yy>256)continue;if((xx+7)*(xx+7)+(yy-3)*(yy-3)<190)continue;x.fillStyle='#FFF3C0';x.fillRect(mx+xx,my+yy,1,1)}
  if(!reduce)twT=setInterval(()=>{for(let i=0;i<6;i++){const s=stars[(Math.random()*stars.length)|0];if(!s)continue;const on=Math.random()<.5;x.fillStyle=on?'#FFFFFF':'#2C3E86';x.fillRect(s[0],s[1],s[2]?2:1,s[2]?2:1)}},700);
}
/* Runic medallion (the Wake Up ending): the stone door's disc, completed, carved in teal stone at 2x pixels. Rings, a band of runes,
   notches cut through the rim, a cross boss, and the four fragments the door took, set back together: the disc is split along the
   vertical and horizontal axes into interlocking quarters (each with one knob into the next, clockwise), its seams visible, each
   fragment with a thin inlay line in its biome's colour (NW roots, NE flood, SE molten, SW crystals; same split as game/door.js frag) */
const RUNE=[[[1.5,0,1.5,6],[0,1,1.5,2.5],[3,1,1.5,2.5]],[[0,0,0,6],[0,0,3,1.5],[3,1.5,0,3],[0,3,3,4.5],[3,4.5,0,6]],[[3,0,0,3],[0,3,3,6]],
  [[0,0,0,6],[3,0,3,6],[0,0,3,6],[3,0,0,6]],[[0,0,0,6],[0,1,3,2.5],[3,2.5,0,4]],[[0,0,3,6],[3,0,0,6]],[[0,0,0,6],[3,0,3,6],[0,2,3,4]],
  [[0,6,1.5,0],[1.5,0,3,6],[.75,3,2.25,3]],[[0,0,0,6],[0,0,3,2]],[[0,0,0,6],[3,0,3,6],[0,0,3,3],[3,0,0,3]],[[1.5,0,1.5,6],[0,1.5,3,4.5]],
  [[1.5,0,3,2],[3,2,1.5,4],[1.5,4,0,2],[0,2,1.5,0],[0,6,1.5,4],[3,6,1.5,4]],[[1.5,0,1.5,6],[0,2,1.5,0],[3,2,1.5,0]],[[0,0,0,6],[0,0,3,0],[0,3,2,3]]];
const STONE=[[8,26,27],[20,52,52],[36,80,77],[58,110,103],[94,148,135],[160,200,184]],BGT=[[3,20,22],[5,30,33],[7,41,44],[9,52,54],[14,70,71]];
const INLAY=[['#2F4D17','#7FC044','#C2EC86'],['#1B4677','#4A9BE6','#A6D2FA'],['#86390C','#F08A34','#FFC488'],['#553286','#B58AF0','#E0CCFF']].map(g=>g.map(h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]));
/* which fragment a point belongs to (dx,dy from the centre, disc radius R): 0 NW, 1 NE, 2 SE, 3 SW; knobs on the seams at half radius */
function discFrag(dx,dy,R){const a=R*.5,o=R*.09,kr=R*.135;
  if(Math.hypot(dx-o,dy+a)<kr)return 0;if(Math.hypot(dx-a,dy-o)<kr)return 1;if(Math.hypot(dx+o,dy-a)<kr)return 2;if(Math.hypot(dx+a,dy+o)<kr)return 3;
  return dy<0?(dx<0?0:1):(dx<0?3:2)}
function medWall(x,Wd,Hd){
  const w=Math.ceil(Wd/2),h=Math.ceil(Hd/2),id=x.createImageData(Wd,Hd),d=id.data,mob=isMobile();
  const cx=mob?w/2:(w-60)/2,cy=mob?h*.64:h/2-4,R=Math.max(48,Math.min(mob?w*.44:(w-150)*.5,h*.42,190)),TAU=Math.PI*2,SEG=TAU/24;
  const hs=(i,j)=>{let q=Math.imul(i|0,374761393)+Math.imul(j|0,668265263)|0;q=Math.imul(q^(q>>>13),1274126177);return((q^(q>>>16))>>>0)/4294967296};
  /* runes are line segments in a 3x6 box, scaled to each ring; strokes are a distance test along the ring's curve */
  const ring=(r0,r1,n,skip)=>{const gh=(r1-r0)*R*.64,gw=gh*.56,sc=RUNE.map(g=>g.map(([a,b,c,e])=>[a*gw/3-gw/2,b*gh/6-gh/2,c*gw/3-gw/2,e*gh/6-gh/2]));
    return {m:(r0+r1)/2*R,n,skip,sc,hw:Math.max(.7,gh*.06),seq:Array.from({length:n},(_,i)=>(hs(i*7+n,n)*RUNE.length)|0)}};
  const outer=ring(.70,.885,24,6),inner=R>=110?ring(.405,.515,16,4):null;
  const sd=(px,py,s)=>{const vx=s[2]-s[0],vy=s[3]-s[1],t=Math.max(0,Math.min(1,((px-s[0])*vx+(py-s[1])*vy)/(vx*vx+vy*vy||1))),qx=s[0]+vx*t-px,qy=s[1]+vy*t-py;return qx*qx+qy*qy};
  const glyph=(rg,r,a)=>{const k=rg.n,f=((a+Math.PI/2)/TAU*k%k+k)%k,seg=Math.round(f)%k,u=(f-Math.round(f))*TAU/k*r,v=rg.m-r;
    if(seg%rg.skip===0)return false;
    if(Math.abs(Math.abs(f-Math.round(f))-.5)*TAU/k*r<.9&&Math.abs(v)<.9)return true;
    const g=rg.sc[rg.seq[seg]];for(const s of g)if(sd(u,-v,s)<rg.hw*rg.hw)return true;return false};
  const NW=Math.max(2.4,R*.034),FR=R*.885;
  /* a seam (2px): a pixel with a 4-neighbour in another fragment */
  const seam=(dx,dy)=>{const q=discFrag(dx,dy,FR);return q!==discFrag(dx+1,dy,FR)||q!==discFrag(dx,dy+1,FR)||q!==discFrag(dx-1,dy,FR)||q!==discFrag(dx,dy-1,FR)};
  const zig=(r,rn,a)=>{const t=((a/TAU*20)%1+1)%1,z=.535+.125*Math.abs(t*2-1),sl=.125*2*20*R/(TAU*r);return Math.abs(rn-z)*R/Math.hypot(1,sl)<.6};
  const near=(a,k)=>{let q=((a+Math.PI/2)/(Math.PI/2))%4;q=(q+4)%4;const i=Math.round(q)%4;return [i,(q-Math.round(q))*Math.PI/2]};
  /* engraved lines: ring grooves, rune strokes, spokes, a zigzag of rays, the notch walls, the slot outlines, the boss cross */
  const engr=(X,Y)=>{const dx=X+.5-cx,dy=Y+.5-cy,r=Math.hypot(dx,dy),rn=r/R,a=Math.atan2(dy,dx);if(rn>.99)return false;
    for(const q of [.885,.70,.675,.52,.395,.215,.13])if(Math.abs(r-q*R)<.6)return !(q===.885&&Math.abs(near(a)[1]*r)<NW);
    const [k,da]=near(a);
    if(rn>.13&&rn<.885&&seam(dx,dy))return true;
    if(rn>.885&&Math.abs(Math.abs(da*r)-NW)<.6)return true;
    if(rn>.70&&rn<.885)return glyph(outer,r,a);
    if(inner&&rn>.405&&rn<.515)return glyph(inner,r,a);
    if(rn>.215&&rn<(inner?.395:.52)){const f=(a/(TAU/8)%1+1)%1;return Math.min(f,1-f)*TAU/8*r<.6}
    if(rn>.52&&rn<.675)return zig(r,rn,a);
    if(rn<.13)return Math.abs(dx)<.6||Math.abs(dy)<.6;
    return false};
  const lt=(ux,uy)=>-(.6*ux+.8*uy);
  for(let Y=0;Y<h;Y++)for(let X=0;X<w;X++){
    const dx=X+.5-cx,dy=Y+.5-cy,r=Math.hypot(dx,dy),rn=r/R,ux=dx/(r||1),uy=dy/(r||1),ol=lt(ux,uy),th=(B4[(Y&3)*4+(X&3)]+.5)/16;let c;
    if(rn>=.995){
      /* ground: dark teal, vignetted, a soft dithered halo, faint ripples, the medallion's drop shadow */
      const vg=Math.hypot((X-w/2)/w,(Y-h/2)/h)*1.7;let t=3-vg*1.3;
      if(rn<1.24)t+=(1-(rn-1)/.24)*.9;
      if(rn>1.3){const m=((r-R*1.3)%22+22)%22;if(m<1.2)t+=Math.max(0,.9-(rn-1.3)*.5)}
      if(Math.hypot(dx-3,dy-4)<R)t=.6;
      t=Math.max(0,Math.min(4,t));const lo=Math.floor(t);c=BGT[Math.min(4,lo+(t-lo>th?1:0))];
    }else{
      const [k,da]=near(Math.atan2(dy,dx)),q=discFrag(dx,dy,FR);
      {
        let t;
        if(rn>.885&&Math.abs(da*r)<NW)t=.9+(rn>.95?.3:0);
        else if(rn>.955){const e=(rn-.955)/.04;t=3+(e>.5?ol*(e-.5)*3:-ol*(.5-e)*3);if(rn>.985)t=.5}
        else if(rn>.93){const ab=(Math.floor(Math.atan2(dy,dx)/TAU*72)+.5)*TAU/72,bx=dx-Math.cos(ab)*.9425*R,by=dy-Math.sin(ab)*.9425*R,br=Math.max(1.4,R*.012);
          t=Math.hypot(bx,by)<br?3+lt(bx/br,by/br)*1.8:1.2}
        else if(rn>.885)t=2.7;
        else if(rn>.70)t=1.9;
        else if(rn>.675)t=2.7;
        else if(rn>.215)t=2.35+(((r|0)%5===0)?-.3:0)+(rn<.3?.25:0);
        else if(rn>.13){const e=(rn-.13)/.085;t=3+(e>.5?ol*(e-.5)*2.6:-ol*(.5-e)*2.6)}
        else t=3.2+ol*1.3*rn/.13+(rn<.035?1.4:0);
        if(rn>.13&&rn<.885)t+=[.14,-.05,.07,-.14][q];   /* four stones, each its own shade */
        t+=(hs(X,Y)-.5)*.45;if(hs(Y+91,X)<.008)t=.6;
        const eg=engr(X,Y);
        if(eg)t=.25;else if(engr(X-1,Y-1))t=Math.min(5,t+1.5);else if(engr(X+1,Y+1))t-=.8;
        t=Math.max(0,Math.min(5,t));const lo=Math.floor(t);c=STONE[Math.min(5,lo+(t-lo>th?1:0))];
        /* the inlay: the zigzag groove is filled with the fragment's colour, stopping short of the seams */
        if(eg&&rn>.52&&rn<.675&&zig(r,rn,Math.atan2(dy,dx))){let ok=true;for(let j=-3;j<=3&&ok;j++)for(let i=-3;i<=3;i++)if(seam(dx+i,dy+j)){ok=false;break}
          if(ok){const g=INLAY[q],s=dx*.6+dy*.8;c=hs(X,Y)<.18?g[2]:s<0?g[1]:(th<.5?g[1]:g[0])}}
      }
    }
    for(let j=0;j<2;j++){const yy=Y*2+j;if(yy>=Hd)break;for(let i=0;i<2;i++){const xx=X*2+i;if(xx>=Wd)break;const q=(yy*Wd+xx)*4;d[q]=c[0];d[q+1]=c[1];d[q+2]=c[2];d[q+3]=255}}
  }
  x.putImageData(id,0,0);
}
/* screen saver: flying winged seeds, or a nap with a dimmed screen. Starts after a minute idle; Preview starts it now. */
let saverK=PREF('tos_saver','none'),ssOn=null,ssAt=0,ssRaf=0,ssT=0,nzT=0,napBr=0,lastXY=[0,0];
const ssEl=document.createElement('div');ssEl.id='ss';ssEl.hidden=true;ssEl.setAttribute('aria-hidden','true');ssEl.innerHTML='<canvas></canvas>';document.body.appendChild(ssEl);
const wingSeed=up=>art(16,12,({R})=>{R(6,4,4,6,'e');R(7,4,2,6,'B');R(7,3,2,1,'e');R(7,5,1,2,'b');
  if(up){R(0,0,6,3,'e');R(1,1,5,1,'w');R(10,0,6,3,'e');R(10,1,5,1,'w');R(2,3,4,1,'e');R(10,3,4,1,'e')}
  else{R(0,5,6,3,'e');R(1,6,5,1,'w');R(10,5,6,3,'e');R(10,6,5,1,'w')}});
const wingFlower=up=>art(16,12,({R,D})=>{D(8,6,3.4,'e');D(8,6,2.4,'r');R(7,5,2,2,'Y');
  if(up){R(0,0,5,3,'e');R(1,1,4,1,'w');R(11,0,5,3,'e');R(11,1,4,1,'w')}else{R(0,6,5,3,'e');R(1,7,4,1,'w');R(11,6,5,3,'e');R(11,7,4,1,'w')}});
const SSPR=[[wingSeed(true),wingSeed(false)],[wingFlower(true),wingFlower(false)]];
function blit(x,rows,sx,sy,s){for(let j=0;j<rows.length;j++)for(let i=0;i<rows[j].length;i++){const c=rows[j][i];if(c==='.')continue;x.fillStyle=PAL[c];x.fillRect(sx+i*s,sy+j*s,s,s)}}
function ssFlying(){
  const cv=$('canvas',ssEl),W=cv.width=innerWidth,H=cv.height=innerHeight,x=cv.getContext('2d');x.imageSmoothingEnabled=false;
  const mk=(init)=>{const s=[2,3,4][(Math.random()*3)|0];return{k:(Math.random()*2)|0,s,x:init?Math.random()*(W+200):W+Math.random()*300,y:init?Math.random()*H:-60-Math.random()*H*.6,vx:-(70+Math.random()*80)*(s/3),vy:(45+Math.random()*50)*(s/3),f:Math.random()*2}};
  const es=Array.from({length:Math.max(8,Math.round(W/90))},()=>mk(true));let last=performance.now();
  const draw=()=>{x.fillStyle='#000';x.fillRect(0,0,W,H);for(const e of es)blit(x,SSPR[e.k][(e.f|0)%2],Math.round(e.x),Math.round(e.y),e.s)};
  if(reduce){draw();return}
  const f=t=>{const dt=Math.min(.05,(t-last)/1000);last=t;for(let i=0;i<es.length;i++){const e=es[i];e.x+=e.vx*dt;e.y+=e.vy*dt;e.f+=dt*5;if(e.x<-80||e.y>H+40)es[i]=mk(false)}draw();ssRaf=requestAnimationFrame(f)};
  ssRaf=requestAnimationFrame(f);
}
let napT=[];
/* [[look, ms], ...] one after the other while the nap is still on; done() after the last */
function napSteps(steps,done){let i=0;const go=()=>{if(ssOn!=='nap')return;if(i>=steps.length){done&&done();return}const [lk,ms]=steps[i++];Object.assign(BS,lk);bRender();napT.push(setTimeout(go,ms))};go()}
function ssNap(){
  ssEl.classList.add('nap');BS.f='idle';buddy.classList.add('nap');hideBub();
  const zz=()=>{const r=buddy.getBoundingClientRect(),z=document.createElement('i');z.className='zz';z.textContent=['z','Z','Z'][(Math.random()*3)|0];
    z.style.left=Math.round(r.right-r.width*.25+Math.random()*10)+'px';z.style.top=Math.round(r.top+r.height*.1)+'px';ssEl.appendChild(z);setTimeout(()=>z.remove(),2700)};
  const sleepNow=()=>{Object.assign(BS,{sleep:1,face:0,lid:0,mouth:0,lv:'S3',ft:'sleep',arms:[250,290]});bRender();zz();if(!reduce){nzT=setInterval(zz,1100);napBr=setInterval(()=>{BS.lv=BS.lv==='S3'?'S2':'S3';BS.fx=[fxAt('drool',BS.lv==='S3'?0:1)];bRender()},900)}};
  /* drowsy, a yawn that opens in three steps, the eyelids sink, then asleep (mascot/faces.js) */
  if(reduce){sleepNow();return}
  napSteps([[{face:'sleepy'},900],[{face:'yawn1'},140],[{face:'yawn2'},140],[{face:'yawn3'},700],[{face:'yawn2'},120],[{face:'sleepy'},600],[{face:0,lid:3},400],[{lid:4},400]],sleepNow);
}
function ssStart(kind){
  if(ssOn||carry||bdrag||diving)return;stopDance();let k=kind||saverK;if(k==='none')return;if(k==='nap'&&buddy.hidden)k='seeds';
  ssOn=k;ssAt=performance.now();hideBub();(k==='nap'?desk:document.body).appendChild(ssEl);ssEl.hidden=false;ssEl.classList.remove('nap');ssEl.className=k==='nap'?'nap':'';
  if(k==='nap')ssNap();else ssFlying();
}
function ssStop(){
  if(!ssOn)return;const was=ssOn;ssOn=null;cancelAnimationFrame(ssRaf);clearInterval(nzT);clearInterval(napBr);ssEl.hidden=true;ssEl.className='';$$('.zz',ssEl).forEach(n=>n.remove());
  if(was==='nap'){napT.forEach(clearTimeout);napT=[];BS.sleep=0;BS.f='idle';buddy.classList.remove('nap');
    /* waking: the lids open in steps, one blink, then the stretch */
    play([[{face:0,lid:4,blink:0,fx:[fxAt('drool',2)]},90],[{fx:0},110],[{lid:3},160],[{lid:2},140],[{lid:0,blink:1},80],[{blink:0,f:'stretch',hop:3,happy:1},130],[{f:'idle',hop:0},220],[RESET,0]])}
  lastAct=performance.now();
}
let lastAct=performance.now();
['pointermove','pointerdown','keydown','wheel','touchstart'].forEach(t=>addEventListener(t,e=>{
  if(!ssOn){lastAct=performance.now();if(e.clientX!=null)lastXY=[e.clientX,e.clientY];return}
  if(performance.now()-ssAt<700)return;
  if(e.type==='pointermove'&&Math.hypot(e.clientX-lastXY[0],e.clientY-lastXY[1])<8)return;
  if(e.type==='pointerdown'||e.type==='keydown'){e.stopPropagation();e.preventDefault()}
  ssStop();
},true));
setInterval(()=>{if(!ssOn&&saverK!=='none'&&!document.hidden&&!gameFront()&&performance.now()-lastAct>60000)ssStart()},1000);

const radio=(g,v,label,on)=>`<button class="mi" role="radio" aria-checked="${on}" data-g="${g}" data-v="${v}"><span class="tk" aria-hidden="true"></span><span>${label}</span></button>`;
const HATS=[['none','None'],['party','Party hat'],['crown','Tiny crown'],['shades','Sunglasses']],SAVERS=[['none','None'],['seeds','Flying seeds'],['nap','Nap']],WALLS=[['teal','Teal rings'],['night','Night garden'],['paper','Paper grid'],['plain','Plain teal'],['medallion','Runic medallion']];
const hat0=PREF('tos_hat','none'),wall0=PREF('tos_wall','teal');
makeWin({id:'cpanel',title:'Control Panel',x:380,y:96,w:300,
 body:`<div class="cp2"><div class="mi-in" role="group" aria-label="Control Panel">
  <div class="mt">Mascot</div>
  <button class="mi" role="checkbox" aria-checked="true" id="cp-m"><span class="tk" aria-hidden="true"></span><span>Show the mascot</span></button>
  <button class="mi" role="checkbox" aria-checked="false" id="cp-mask" hidden><span class="tk" aria-hidden="true"></span><span>Skull mask</span></button>
  <div class="mt" id="cph">Hat</div><div role="radiogroup" aria-labelledby="cph">${HATS.map(([v,l])=>radio('hat',v,l,v===hat0)).join('')}</div>
  <div class="msep" role="separator"></div>
  <div class="mt" id="cps">Screen saver</div><div role="radiogroup" aria-labelledby="cps">${SAVERS.map(([v,l])=>radio('saver',v,l,v===saverK)).join('')}</div>
  <div class="cp-btn"><button class="btn bev" type="button" id="cp-prev">Preview</button></div>
  <div class="msep" role="separator"></div>
  <div class="mt" id="cpw">Wallpaper</div><div role="radiogroup" aria-labelledby="cpw">${WALLS.map(([v,l])=>radio('wall',v,l,v===wall0)).join('')}</div>
 </div></div>`,
 init(el){
   const m=$('#cp-m',el),set=(b,on)=>b.setAttribute('aria-checked',String(on)),prev=$('#cp-prev',el);
   const dim=()=>prev.setAttribute('aria-disabled',String(saverK==='none'));
   m.addEventListener('click',()=>{const on=m.getAttribute('aria-checked')!=='true';if(!on)TK.discover('mascot-off');setMascot(on)});
   $('#cp-mask',el).addEventListener('click',()=>setMask(!BS.mask));
   el.addEventListener('click',e=>{
     const b=e.target.closest('[data-g]');if(!b)return;
     $$('[data-g="'+b.dataset.g+'"]',el).forEach(x=>set(x,x===b));
     if(b.dataset.g==='hat')setHat(b.dataset.v);
     else if(b.dataset.g==='wall')setWall(b.dataset.v);
     else{saverK=b.dataset.v;PSET('tos_saver',saverK);if(saverK!=='none')TK.discover('saver:'+saverK);dim()}});
   prev.addEventListener('click',()=>{if(saverK!=='none')ssStart()});
   dim();
   syncMascotCP=()=>set(m,store.get('buddyGone')!=='1');
   if(store.get('buddyGone')==='1')set(m,false);
 }});
/* ================= D6: Simple view: the plain-page fallback, with the press kit folded in ================= */
const sv=document.createElement('div');sv.id='simple';sv.hidden=true;sv.setAttribute('role','dialog');sv.setAttribute('aria-label','Simple view');
sv.innerHTML='<div class="sv"><button class="sb" id="svb" type="button">Back to the desktop</button><div id="svc" class="plain"></div></div>';
document.documentElement.appendChild(sv);
/* the Simple view is the real simple.html: fetched once, its content shown over the desktop */
let svLoad=null;
function loadSimple(){
  return svLoad||(svLoad=fetch('/simple.html').then(r=>{if(!r.ok)throw new Error(r.status);return r.text()}).then(t=>{
    const p=new DOMParser().parseFromString(t,'text/html').querySelector('.plain');$('#svc',sv).innerHTML=p.innerHTML;
    $$('.pl-nav a[href="/"]',sv).forEach(a=>a.remove());
    $$('[id]',sv).forEach(e=>{if(e.id!=='svb'&&e.id!=='svc')e.id='sv-'+e.id});$$('a[href^="#"]',sv).forEach(a=>a.setAttribute('href','#sv-'+a.getAttribute('href').slice(1)));
  }).catch(()=>{svLoad=null;$('#svc',sv).innerHTML='<p><a href="/simple.html">Simple view</a></p>'}));
}
sv.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;const h=a.getAttribute('href')||'';
  if(h.startsWith('#')){e.preventDefault();const t=$('[id="'+h.slice(1)+'"]',sv);if(t)sv.scrollTop=t.getBoundingClientRect().top-sv.getBoundingClientRect().top+sv.scrollTop-12;return}
  const m=h.match(/^\/?projects\/([\w-]+)\.html$/);if(m&&SLUGID[m[1]]){e.preventDefault();closeSimple();openWin(SLUGID[m[1]])}});

let svRet=null;
function openSimple(){TK.open('/simple.html','Simple view','simple',viaOf());TK.discover('simple-view');closeMenu(false);svRet=document.activeElement;loadSimple();sv.hidden=false;sv.scrollTop=0;$('#svb',sv).focus()}
function closeSimple(){sv.hidden=true;if(svRet&&document.contains(svRet))svRet.focus({preventScroll:true})}
$('#svb',sv).addEventListener('click',closeSimple);
addEventListener('keydown',e=>{if(e.key==='Escape'&&!sv.hidden)closeSimple()});

/* ================= desktop icons ================= */
function selIcon(b){$$('.icon.sel').forEach(x=>x.classList.remove('sel'));if(b)b.classList.add('sel')}
$$('.icon').forEach(b=>b.addEventListener('click',()=>{selIcon(b);openWin(b.dataset.open,b)}));

/* ================= wallpaper: Win98 teal Bayer gradient, red wavy rings dithered out, halftone corner ================= */
const wall=$('#wall');let WP=null,phase=0,WALLK=PREF('tos_wall','teal');
const DESK=[[0,128,128],[0,104,106],[0,76,80]];
function buildWall(){
  if(WALLK!=='teal'){WP=null;altWall();return}
  clearInterval(twT);twT=0;
  const Wd=desk.clientWidth,Hd=desk.clientHeight;if(!Wd||!Hd)return;
  wall.width=Wd;wall.height=Hd;wall.style.width=Wd+'px';wall.style.height=Hd+'px';
  const ctx=wall.getContext('2d'),id=ctx.createImageData(Wd,Hd),d=id.data;
  for(let y=0;y<Hd;y++){const t=y/Math.max(1,Hd-1)*2,i0=Math.min(1,Math.floor(t)),f=t-i0,A=DESK[i0],C=DESK[i0+1];
    for(let x=0;x<Wd;x++){const c=f>(B8[(y&7)*8+(x&7)]+.5)/64?C:A,k=(y*Wd+x)*4;d[k]=c[0];d[k+1]=c[1];d[k+2]=c[2];d[k+3]=255}}
  /* halftone dots in the bottom-right corner */
  const HR=isMobile()?200:340;
  for(let gy=0;gy*8<Hd+8;gy++)for(let gx=0;gx*8<Wd+8;gx++){const cx=gx*8+4+((gy&1)?4:0),cy=gy*8+4,dd=Math.hypot(Wd-cx,Hd-cy),r=3.2*(1-dd/HR);if(r<.8)continue;
    for(let y=Math.floor(cy-r);y<=cy+r;y++)for(let x=Math.floor(cx-r);x<=cx+r;x++){if(x<0||y<0||x>=Wd||y>=Hd)continue;const dx=x+.5-cx,dy=y+.5-cy;if(dx*dx+dy*dy<=r*r){const k=(y*Wd+x)*4;d[k]=0;d[k+1]=58;d[k+2]=60}}}
  const cx=isMobile()?Wd-42:Wd-179,cy=Hd-26,R=isMobile()?380:560;
  const x0=Math.max(0,Math.floor(cx-R)),x1=Math.min(Wd,Math.ceil(cx+R)),y0=Math.max(0,Math.floor(cy-R)),y1=Math.min(Hd,Math.ceil(cy+R));
  const bw=x1-x0,bh=y1-y0,rv=new Float32Array(bw*bh),cov=new Float32Array(bw*bh);
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const dx=x+.5-cx,dy=y+.5-cy,dd=Math.hypot(dx,dy),i=(y-y0)*bw+(x-x0);
    rv[i]=dd+3*Math.sin(Math.atan2(dy,dx)*7+dd*.015);cov[i]=dd<64||dd>R?0:Math.pow(1-dd/R,1.25)*.8}
  WP={ctx,id,base:new Uint8ClampedArray(d),Wd,x0,y0,bw,bh,rv,cov};drawRings();
}
function drawRings(){
  if(!WP)return;const{ctx,id,base,Wd,x0,y0,bw,bh,rv,cov}=WP,d=id.data;d.set(base);
  for(let j=0;j<bh;j++){const y=y0+j;for(let i=0;i<bw;i++){const n=j*bw+i,c=cov[n];if(c<=0)continue;const x=x0+i;
    const m=((rv[n]-phase)%26+26)%26;if(m>=2.6)continue;if(c<=(B8[(y&7)*8+(x&7)]+.5)/64)continue;
    const k=(y*Wd+x)*4;if(c>.5){d[k]=0xB8;d[k+1]=0x1C;d[k+2]=0x26}else{d[k]=0x86;d[k+1]=0x16;d[k+2]=0x22}}}
  ctx.putImageData(id,0,0);
}

/* ================= seeds ================= */
/* ================= seeds: real seeds that plant into the desktop, sprout, bloom, and can be fed to the mascot ================= */
function burst(x,y,s){[.6,1.2,1.7].forEach((k,i)=>setTimeout(()=>{const b=document.createElement('i');b.className='zr';const z=Math.round(s*k),r=desk.getBoundingClientRect();
  Object.assign(b.style,{left:Math.round(r.left+x-z/2)+'px',top:Math.round(r.top+y-z/2)+'px',width:z+'px',height:z+'px'});document.body.appendChild(b);setTimeout(()=>b.remove(),45)},i*45))}
let seeds=0;
const PETAL=['#FF3333','#FFD36B','#7FE0D3','#CCCCFF','#FF9A8E','#FFFFFF'];
const plants=new Set();
const PW=16,PH=22,PX=3;
function drawPlant(cv,st,fr,col,pulled,kind){
  if(st==='glow'||st==='glowgrow'){drawGlow(cv,fr,pulled,kind);return}
  const x=cv.getContext('2d');x.clearRect(0,0,PW,PH);
  const R=(a,b,w,h,c)=>{x.fillStyle=c;x.fillRect(a,b,w,h)};
  const soil=()=>{R(3,16,10,2,'#3A2414');R(4,15,8,1,'#5A3A1E');R(5,14,6,1,'#5A3A1E');R(6,14,2,1,'#7A5230');R(11,16,1,1,'#241608')};
  const roots=()=>{const c='#E8D6A8',d='#B79F6E';R(7,15,2,3,c);R(7,18,1,1,c);R(8,18,1,2,d);R(5,16,2,1,c);R(4,17,1,2,c);R(3,19,1,2,d);R(9,16,3,1,c);R(11,17,1,2,c);R(12,19,1,2,d);R(6,17,1,3,c);R(6,20,1,1,d);R(9,18,1,2,d);R(10,20,1,1,d)};
  const mound=()=>pulled?roots():soil();
  const stem=h=>{R(7,15-h,2,h,'#1F9D55');R(8,15-h,1,h,'#157A41')};
  const leaf=(side,y)=>{if(side<0){R(4,y,3,2,'#3DD16F');R(3,y+1,1,1,'#3DD16F');R(5,y+2,2,1,'#2BB05A')}else{R(9,y,3,2,'#3DD16F');R(12,y+1,1,1,'#3DD16F');R(9,y+2,2,1,'#2BB05A')}};
  if(st==='heap'){
    R(2,16,12,2,'#2A180C');R(3,15,10,1,'#3F2814');R(4,14,8,1,'#3F2814');R(5,13,6,1,'#4A2F18');R(6,12,4,1,'#4A2F18');
    R(5,15,1,1,'#7FBF5A');R(9,14,1,1,'#E0B040');R(7,13,1,1,'#7FBF5A');R(11,16,1,1,'#C66A2A');R(4,17,1,1,'#7FBF5A');R(7,12,2,1,'#1E1006');return}
  if(st==='wither'){
    const h=Math.max(2,(kind==='bloom'?9:8)-fr*2),T='#8A6A2E',T2='#6A4F1E',L='#A5803A';soil();R(7,15-h,2,h,T);R(8,15-h,1,h,T2);
    if(kind==='bloom'){const hy=15-h-1;R(5+fr,hy+fr,5,3,'#8A7A5A');R(6+fr,hy+fr+1,3,1,'#B59A4A');R(4,13-fr,3,1,L);R(9,12-fr,3,1,L)}
    else{R(4,15-h+fr,3,1,L);R(9,15-h+1+fr,3,1,L)}
    return}
  if(st==='crumble'){
    const S='#7A4A1E',D='#5A3410',K='#241608',M='#3A2414';
    if(fr===0){soil();R(6,11,4,3,S);R(7,10,2,1,S);R(5,12,1,2,D);R(10,12,1,2,D);R(8,11,1,2,K);R(7,13,1,1,K)}
    else if(fr===1){R(3,16,10,2,M);R(5,15,6,1,'#5A3A1E');R(4,10,2,2,S);R(10,9,2,2,S);R(7,12,2,2,D);R(8,10,1,1,K)}
    else if(fr===2){R(4,16,8,2,M);R(3,13,1,1,S);R(12,12,1,1,S);R(6,15,1,1,D);R(9,14,1,1,S);R(7,11,1,1,D)}
    else if(fr===3){R(5,17,6,1,M);R(4,15,1,1,D);R(11,15,1,1,S);R(8,16,1,1,D)}
    return
  }
  if(st==='seed'){
    // falls from above (frames 0-2), puffs (3), then sits half-buried (4)
    const seedAt=y=>{R(6,y+1,4,5,'#7A4A1E');R(7,y,2,1,'#7A4A1E');R(7,y+5,2,1,'#5A3410');R(7,y+1,1,2,'#C99A5A');R(5,y+2,1,3,'#5A3410');R(10,y+2,1,3,'#5A3410')};
    if(fr<=2){seedAt([-8,0,6][fr]);if(fr===2)R(5,16,6,2,'#3A2414')}
    else if(fr===3){mound();R(2,14,2,1,'#7A5230');R(12,13,2,1,'#7A5230');seedAt(7)}
    else if(pulled)seedAt(7);else{mound();R(6,11,4,3,'#7A4A1E');R(7,10,2,1,'#7A4A1E');R(7,11,1,2,'#C99A5A');R(5,12,1,2,'#5A3410');R(10,12,1,2,'#5A3410')}
  }else if(st==='sprout'){
    mound();const h=[2,4,6,8][Math.min(fr,3)];stem(h);if(fr>=2)leaf(-1,15-h+1);if(fr>=3)leaf(1,15-h+3);
  }else{
    mound();const h=9;stem(h);leaf(-1,10);leaf(1,8);
    const hy=15-h-1,cx=8;
    if(fr===0){R(cx-1,hy-1,3,3,col);R(cx,hy-2,1,1,'#157A41')}
    else if(fr===1){R(cx-2,hy-2,5,5,col);R(cx-1,hy-1,3,3,'#FFD94A')}
    else{R(cx-3,hy-1,7,3,col);R(cx-1,hy-3,3,7,col);R(cx-2,hy-2,5,5,col);R(cx-1,hy-1,3,3,'#FFD94A');R(cx-3,hy-1,1,1,'#00000022')}
  }
}
const GW=24,GH=40,GR=34;
function drawGlow(cv,fr,pulled,phase){
  if(cv.width!==GW)cv.width=GW;if(cv.height!==GH)cv.height=GH;
  const x=cv.getContext('2d');x.clearRect(0,0,GW,GH);const ph=phase|0;
  const R=(a,b,w,h,c)=>{x.fillStyle=c;x.fillRect(a,b,w,h)};
  if(fr>=3)for(let yy=0;yy<GH;yy++)for(let xx=0;xx<GW;xx++){const d=Math.hypot(xx+.5-12,yy+.5-12);if(d<7.5||d>11.5)continue;
    if(d<9.5?(xx+yy+ph)%2===0:(xx+yy*2+ph)%4===0)R(xx,yy,1,1,'#FFF3A8')}
  if(pulled){R(10,33,4,3,'#E8D6A8');R(8,35,2,3,'#E8D6A8');R(14,35,2,3,'#E8D6A8');R(11,36,2,3,'#B79F6E');R(6,37,2,2,'#B79F6E');R(16,37,2,2,'#B79F6E')}
  else{R(4,35,16,2,'#2A180C');R(5,34,14,1,'#3F2814');R(7,33,10,1,'#4A2F18');R(9,32,6,1,'#4A2F18');R(8,34,1,1,'#7FBF5A');R(15,34,1,1,'#E0B040');R(11,33,1,1,'#7FBF5A')}
  const h=[5,11,16,20][Math.min(fr,3)],top=33-h;R(11,top,2,h,'#1F9D55');R(12,top,1,h,'#157A41');
  if(fr>=1){R(7,33-Math.round(h*.45),4,2,'#3DD16F');R(13,33-Math.round(h*.6),4,2,'#3DD16F')}
  if(fr>=2){R(6,34-Math.round(h*.45),1,1,'#3DD16F');R(17,34-Math.round(h*.6),1,1,'#3DD16F')}
  if(fr===2){R(10,top-3,4,3,'#7FE0D3');R(11,top-4,2,1,'#BFFFF5')}
  if(fr>=3){const cx=12,cy=12,A='#BFFFF5',B='#7FE0D3';
    R(cx-3,cy-3,7,7,A);R(cx-1,cy-6,3,13,A);R(cx-6,cy-1,13,3,A);
    for(const[a,b]of[[-4,-4],[2,-4],[-4,2],[2,2]])R(cx+a,cy+b,3,3,A);
    R(cx-1,cy-6,3,1,B);R(cx-1,cy+6,3,1,B);R(cx-6,cy-1,1,3,B);R(cx+6,cy-1,1,3,B);
    R(cx-1,cy-1,3,3,'#FFE066');R(cx,cy,1,1,'#FFFFFF');
    [[3,3],[20,5],[2,16],[21,15],[5,22],[19,21]].forEach(([a,b],i)=>{if((i+ph)%2===0)R(a,b,1,1,'#FFFFFF')})}
}
function plantEl(p){p.el.style.left=Math.round(p.x-(p.pw||PW)*PX/2)+'px';p.el.style.top=Math.round(p.y-(p.gr||16)*PX)+'px'}
function steps(p,st,n,ms,col,done){let i=0;const tick=()=>{drawPlant(p.el,st,i,col);i++;if(i<n)p.t=setTimeout(tick,ms);else{p.t=0;done&&done()}};if(reduce){drawPlant(p.el,st,n-1,col);done&&done();return}tick()}
/* no planting on top of another seed; half of all seeds crumble away instead of sprouting */
const crowd=(x,y,self)=>{for(const q of plants){if(q===self)continue;if(Math.abs(q.x-x)<36&&Math.abs(q.y-y)<22)return q}return null};
function nudge(q){if(reduce)return;let k=0;const t=setInterval(()=>{q.el.style.transform=(k%2)?'translateX(2px)':'translateX(-2px)';if(++k>5){clearInterval(t);q.el.style.transform=''}},45)}
function freeSpot(p){if(!crowd(p.x,p.y,p))return;const dw=desk.clientWidth;for(let k=1;k<14;k++)for(const s of [1,-1]){const nx=p.x+s*k*38;if(nx<14||nx>dw-14)continue;if(!crowd(nx,p.y,p)){p.x=nx;plantEl(p);return}}}
const mkBag=(a,b)=>{let bag=[];return()=>{if(!bag.length)bag=Math.random()<.5?[a,b]:[b,a];return bag.shift()}};
const nextFate=mkBag('sprout','crumble'),sproutFate=mkBag('keep','wither'),flowerFate=mkBag('keep','wither');
const compost={seed:0,sprout:0,flower:0};
function crumble(p){if(!plants.has(p)||p.st!=='seed')return;if(p.pulled){p.g=setTimeout(()=>crumble(p),1500);return}p.st='crumble';if(reduce){dropPlant(p);return}steps(p,'crumble',5,140,p.col,()=>dropPlant(p))}
function plant(x,y){
  const crowded=crowd(x,y);if(crowded){nudge(crowded);return null}
  TK.discover('plant');
  const el=document.createElement('canvas');el.width=PW;el.height=PH;el.className='pl';
  const p={el,x,y,st:'seed',col:PETAL[(Math.random()*PETAL.length)|0],t:0,g:0,fate:nextFate()};
  plantEl(p);$('#seeds').appendChild(el);plants.add(p);
  steps(p,'seed',5,110,p.col,()=>p.el.classList.add('act'));
  p.g=setTimeout(()=>p.fate==='crumble'?crumble(p):sprout(p),(reduce?2500:5000)+Math.random()*5000);
  if(!reduce)burst(x,y,28);
  seeds++;setCount();buddyPlant();
  if(!reduce){phase+=4;drawRings()}
  if(seeds===100){TK.discover('100-seeds');setTimeout(showAlert,380)}
  return p;
}
function sprout(p){if(!plants.has(p)||p.st!=='seed')return;if(p.pulled){p.g=setTimeout(()=>sprout(p),1500);return}
  p.st='sprout';steps(p,'sprout',4,130,p.col,()=>{p.el.classList.add('act')});
  if(sproutFate()==='wither')p.w=setTimeout(()=>wither(p),(reduce?3000:7000)+Math.random()*8000)}
function bloom(p){if(p.st!=='sprout')return;clearTimeout(p.w);p.w=0;p.st='bloom';TK.discover('bloom');steps(p,'bloom',3,120,p.col);
  if(flowerFate()==='wither')p.w=setTimeout(()=>wither(p),(reduce?3000:8000)+Math.random()*8000)}
/* half of the sprouts and half of the flowers droop, crumble and go, like the seeds do */
function wither(p){
  if(!plants.has(p)||(p.st!=='sprout'&&p.st!=='bloom'))return;
  if(p.pulled){p.w=setTimeout(()=>wither(p),1500);return}
  const kind=p.st;p.st='wither';p.el.classList.remove('act');clearTimeout(p.t);
  if(reduce){dropPlant(p);return}
  let i=0;const tick=()=>{if(!plants.has(p))return;if(i<3){drawPlant(p.el,'wither',i,p.col,false,kind);i++;p.t=setTimeout(tick,170)}else{p.st='crumble';steps(p,'crumble',5,140,p.col,()=>dropPlant(p))}};tick();
}
function makeHeap(x,y,unit){
  const el=document.createElement('canvas');el.width=PW;el.height=PH;el.className='pl act';
  TK.discover('heap');
  const p={el,x,y,st:'heap',col:'#FFFFFF',t:0,g:0,w:0,unit};plantEl(p);$('#seeds').appendChild(el);plants.add(p);drawPlant(el,'heap',0,p.col,false);freeSpot(p);
  if(!reduce)burst(p.x,p.y,24);return p;
}
/* a seed planted in compost grows into a larger glowing flower */
function sowHeap(p,fromSeed){
  if(!plants.has(p)||p.st!=='heap')return;
  TK.discover('glow-flower');
  p.st='glowgrow';p.el.classList.remove('act');clearTimeout(p.t);
  const cv=p.el;$('#glows').appendChild(cv);cv.width=GW;cv.height=GH;cv.style.width=GW*PX+'px';cv.style.height=GH*PX+'px';p.pw=GW;p.gr=GR;plantEl(p);
  if(!fromSeed){seeds++;setCount();buddyPlant()}
  let i=0;const tick=()=>{if(!plants.has(p))return;drawGlow(cv,i,false,0);i++;
    if(i<4)p.t=setTimeout(tick,reduce?0:650);
    else{p.st='glow';cv.classList.add('act');let ph=0;if(!reduce)p.gt=setInterval(()=>{if(!p.pulled)drawGlow(cv,3,false,ph^=1)},450)}};
  tick();
}
function dropPlant(p){clearInterval(p.gt);clearTimeout(p.t);clearTimeout(p.g);clearTimeout(p.w);p.el.remove();plants.delete(p)}
function setCount(){const b=$('#ns');b.textContent=seeds;$('#ind-s').classList.toggle('zero',seeds===0);b.classList.remove('pop');void b.offsetWidth;if(!reduce)b.classList.add('pop');stage()}
function clearSeeds(){[...plants].forEach(dropPlant);seeds=0;setCount()}
function overBuddy(e){if(buddy.hidden)return false;const r=buddy.getBoundingClientRect();return e.clientX>r.left-10&&e.clientX<r.right+10&&e.clientY>r.top-10&&e.clientY<r.bottom+10}
const SWG=2600;
function Swing(L,damp,max=1.3){return {th:0,om:0,step(dt,ax){const a=-(SWG/L)*Math.sin(this.th)-(ax/L)*Math.cos(this.th)-damp*this.om;this.om+=a*dt;this.th+=this.om*dt;
  if(this.th>max){this.th=max;this.om*=-.3}if(this.th<-max){this.th=-max;this.om*=-.3}return this.th}}}
const rotQ=th=>Math.round(-th*180/Math.PI/3)*3;
function eat(p){
  const kind=p.st;dropPlant(p);bump(kind==='sprout'?'sprouts':'flowers');
  TK.discover(kind==='glow'?'glow-eat':kind==='bloom'?'eat-flower':'eat-sprout');
  if(kind==='glow'){eatGlow();return}
  const chomp=[[{f:'squash',mouth:1,happy:0,face:0},110],[{f:'idle',mouth:0},90],[{f:'squash',mouth:1},110]];
  const reset=[{face:0,dx:0,heart:0,happy:0,hop:0,mouth:0,f:'idle'},0];
  if(reduce){BS.face=kind==='bloom'?'love':'yuck';bRender();setTimeout(()=>{Object.assign(BS,reset[0]);bRender()},1400);return}
  sayOnce(kind==='bloom'?'bloom':'sprout',kind==='bloom'?'Aww, for me? Thanks!':'Blegh. Too leafy.',2200);
  if(kind==='bloom')play([...chomp,[{f:'stretch',mouth:0,face:'love',happy:1,hop:3,heart:1},130],[{f:'idle',hop:0,heart:2},120],[{f:'stretch',hop:3,heart:3},130],[{f:'idle',hop:0,heart:1},120],[{f:'stretch',hop:3,heart:2},130],[{f:'idle',hop:0,heart:0},1100],reset]);
  else play([...chomp,[{f:'idle',mouth:0,face:'yuck',happy:0,dx:-1},100],[{dx:1},100],[{dx:-1},100],[{dx:1},100],[{dx:-1},100],[{dx:1},100],[{dx:0},1100],reset]);
}
/* a seed fed to the mascot: he chews, makes a face, and spits it out; it lands nearby and replants */
function spit(p){
  TK.discover('spit-seed');
  const r=buddy.getBoundingClientRect(),dr=desk.getBoundingClientRect(),el=p.el;
  const mx=r.left+r.width/2-dr.left,my=r.top+r.height*.62-dr.top,side=Math.random()<.5?-1:1;
  const land=Math.max(24,Math.min(desk.clientWidth-140,mx+side*(110+Math.random()*80))),ly=Math.min(desk.clientHeight-12,Math.max(60,r.top-dr.top+FEET()-4));
  p.pulled=true;el.classList.remove('act');
  const done=()=>{el.style.transform='';p.x=land;p.y=ly;p.pulled=false;freeSpot(p);drawPlant(el,'seed',4,p.col,false);el.style.visibility='';el.classList.add('act');if(!reduce)burst(p.x,p.y,22)};
  if(reduce){sayOnce('spit','Ptoo!',1100);done();return}
  el.style.visibility='hidden';
  const chew=[[{f:'squash',mouth:1,happy:0,face:0},110],[{f:'idle',mouth:0},90],[{f:'squash',mouth:1},110],[{f:'idle',mouth:0},90],[{f:'squash',mouth:1},110],[{f:'idle',mouth:0,face:'yuck',dx:-1},140],[{dx:1},100]];
  play([...chew,[{f:'stretch',mouth:1,face:0,dx:0},300],[RESET,0]]);
  setTimeout(()=>{
    sayOnce('spit','Ptoo!',1100);drawPlant(el,'seed',4,p.col,true);p.x=mx;p.y=my;plantEl(p);el.style.visibility='';
    const t0=performance.now(),D=560,f=t=>{const k=Math.min(1,(t-t0)/D);p.x=mx+(land-mx)*k;p.y=my+(ly-my)*k-4*90*k*(1-k);plantEl(p);el.style.transform='rotate('+Math.round(k*720)+'deg)';
      if(k<1)requestAnimationFrame(f);else done()};
    requestAnimationFrame(f);
  },chew.reduce((a,c)=>a+c[1],0));
}
const AWE_LINE='Sometimes even discarded ideas can become something even greater with the right care and time';
/* the glowing flower: eyes dilate, mouth drops, a line, and about two seconds later he dances for five */
function eatGlow(){
  const chomp=[[{f:'squash',mouth:1,happy:0,face:0},110],[{f:'idle',mouth:0},90],[{f:'squash',mouth:1},110]];
  const awe=[{f:'stretch',face:'awe',mouth:0,happy:0,hop:0,dx:0,heart:0},0];
  if(reduce){Object.assign(BS,awe[0]);bRender();sayOnce('awe',AWE_LINE,6000);setTimeout(()=>{Object.assign(BS,RESET);bRender()},4000);return}
  play([...chomp,awe]);
  setTimeout(()=>{sayOnce('awe',AWE_LINE,3200)},330);
  setTimeout(()=>dance(5200),330+AWE_LINE.length*15+2000);
}
const finalFrame=p=>p.st==='bloom'?2:p.st==='seed'?4:p.st==='heap'?0:3;
/* what is under the pointer: the Trash icon or an open Trash window (not the thing being dragged) */
function overTrash(pt){for(const n of document.elementsFromPoint(pt.clientX,pt.clientY)){if(n.closest('.pl,#buddy,#bub'))continue;return n.closest('#ic-trash,#w-trash')}return null}
const trashHot=on=>{$('#ic-trash').classList.toggle('hot',!!on);$('#w-trash').classList.toggle('hot',!!on)};
/* the dragged mascot's drawn body (any opaque pixel of his canvas) against the Trash icon and an open Trash window: the Trash it touches, or null */
function bodyOverTrash(){
  const rs=[$('#ic-trash .ic').getBoundingClientRect()],w=WIN.trash;if(w&&w.open&&!w.min)rs.push(w.el.getBoundingClientRect());
  const r=bcv.getBoundingClientRect(),k=r.width/bcv.width,d=bctx.getImageData(0,0,bcv.width,bcv.height).data;
  for(const t of rs){let n=0,sx=0,sy=0;
    for(let y=0;y<bcv.height;y++)for(let x=0;x<bcv.width;x++){if(d[(y*bcv.width+x)*4+3]<128)continue;
      const px=r.left+(x+.5)*k,py=r.top+(y+.5)*k;if(px>=t.left&&px<=t.right&&py>=t.top&&py<=t.bottom){n++;sx+=px;sy+=py}}
    if(n){const o=overTrash({clientX:sx/n,clientY:sy/n});if(o)return o}}
  return null}
function updCompost(){
  const n=compost.seed+compost.sprout+compost.flower,it=$('#tr-compost');if(!it)return;
  it.hidden=!n;updTrashCount();
}
function updTrashCount(){const n=$$('.item:not([hidden])',WIN.trash.el).length,cell=$('.wfoot span',WIN.trash.el);cell.textContent=n+(n===1?' item':' items');cell.dataset.rest=cell.textContent}
function compostInfo(){const a=[['seed','seed'],['sprout','sprout'],['flower','flower']].filter(([k])=>compost[k]).map(([k,w])=>compost[k]+' '+w+(compost[k]>1?'s':''));return 'Compost: '+(a.join(', ')||'empty')}
function toCompost(p){
  const k=p.st==='bloom'||p.st==='glow'?'flower':p.st==='heap'?p.unit:p.st;dropPlant(p);compost[k]++;updCompost();TK.discover('compost');
  const ic=$('#ic-trash .ic');if(ic&&!reduce){ic.classList.remove('pop2');void ic.offsetWidth;ic.classList.add('pop2')}
  if(!reduce)burst(p.x,p.y,18);
}
const plantDown=e=>{
  const el=e.target.closest('.pl.act');if(!el||e.button!==0)return;
  const p=[...plants].find(q=>q.el===el);if(!p||!['seed','sprout','bloom','heap','glow'].includes(p.st))return;
  e.preventDefault();e.stopPropagation();el.setPointerCapture(e.pointerId);
  const r0=el.getBoundingClientRect(),gx=e.clientX-r0.left,gy=e.clientY-r0.top;
  const sx=e.clientX,sy=e.clientY,ox=p.x,oy=p.y;let moved=false,raf=0,sw=null,pvx=0,px0=ox,lt=0;
  const sway=t=>{const dt=Math.min(.05,(t-lt)/1000)||.016;lt=t;const vx=(p.x-px0)/Math.max(dt,.001);const ax=Math.max(-9000,Math.min(9000,(vx-pvx)/Math.max(dt,.001)));pvx=vx;px0=p.x;
    let rem=dt;while(rem>0){const h=Math.min(rem,.008);sw.step(h,ax);rem-=h}
    el.style.transform=`rotate(${rotQ(sw.th)}deg)`;raf=requestAnimationFrame(sway)};
  const mv=ev=>{const dx=ev.clientX-sx,dy=ev.clientY-sy;
    if(!moved){if(Math.hypot(dx,dy)<5)return;
      // pulled out of the ground: no soil, roots showing
      moved=true;clearTimeout(p.t);p.pulled=true;drawPlant(el,p.st,finalFrame(p),p.col,true);
      el.classList.add('drag');el.style.transformOrigin=gx+'px '+gy+'px';sw=Swing(46,2.4);lt=performance.now();raf=requestAnimationFrame(sway)}
    const dw=desk.clientWidth,dh=desk.clientHeight;
    p.x=Math.min(Math.max(ox+dx,12),dw-12);p.y=Math.min(Math.max(oy+dy,56),dh-8);plantEl(p);buddy.classList.toggle('hot',['seed','sprout','bloom','glow'].includes(p.st)&&overBuddy(ev));trashHot(overTrash(ev))};
  const up=ev=>{el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);
    cancelAnimationFrame(raf);el.classList.remove('drag');el.style.transform='';el.style.transformOrigin='';buddy.classList.remove('hot');trashHot(false);
    if(!moved){if(p.st==='sprout')bloom(p);else if(p.st==='heap')sowHeap(p);return}
    if(overTrash(ev)){toCompost(p);return}
    if(p.st==='seed'&&overBuddy(ev)){spit(p);return}
    if(['sprout','bloom','glow'].includes(p.st)&&overBuddy(ev)){eat(p);return}
    const hp=p.st==='seed'?[...plants].find(q=>q!==p&&q.st==='heap'&&Math.abs(q.x-p.x)<36&&Math.abs(q.y-p.y)<34):null;
    if(hp){dropPlant(p);sowHeap(hp,true);return}
    // let go: it replants itself where it was dropped
    p.pulled=false;freeSpot(p);drawPlant(el,p.st,finalFrame(p),p.col,false);if(!reduce)burst(p.x,p.y,22)};
  el.addEventListener('pointermove',mv);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
};
['#seeds','#glows'].forEach(q=>$(q).addEventListener('pointerdown',plantDown));
let down=null,skipPlant=false;
desk.addEventListener('pointerdown',e=>{
  if(skipPlant||e.target!==desk||e.button!==0){skipPlant=false;down=null;return}
  down={x:e.clientX,y:e.clientY};selIcon(null);
});
desk.addEventListener('pointerup',e=>{
  if(!down||e.target!==desk)return;const d=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;
  if(d>4)return;const r=desk.getBoundingClientRect();plant(e.clientX-r.left,e.clientY-r.top);
});

/* ================= mascot: 34x44 pixel sprite, frames stepped at low fps ================= */
const buddy=$('#buddy'),bcv=$('#bcv'),bctx=bcv.getContext('2d');
const BC={ink:INK,hi:'#FF9A8E',base:'#FF3333',tex:'#E2262C',sh:'#B3121B',eye:'#FFFFFF',cheek:'#FF8A92',mouth:'#6E0C12',stem:'#0F766E',leaf:'#3DCBB9',leaf2:'#2FB3A6',fc:'#FFD36B',shadow:'#032A2C'};
const BS={f:'idle',blink:0,dir:[0,0],happy:0,stage:0,hop:0,sleep:0,hat:(h=>h==='none'?0:h)(PREF('tos_hat','none'))};
/* the sprite itself (grid, colours, drawMac, drawBuddy) lives in mascot/atlas.js; mascot/atlas.classic.js (tools/build_mascot.py) sets window.MASCOT before this file runs */
const {drawBuddy}=window.MASCOT;
let trapped=PREF('tos_wake_in','')==='1'&&PREF('tos_wake','')==='on';
let gone=store.get('buddyGone')==='1';if(gone||trapped)buddy.hidden=true;
const bRender=()=>drawBuddy(bctx,BS);
function stage(){BS.stage=seeds>=100?4:seeds>=40?3:seeds>=10?2:seeds>=1?1:0;bRender()}
let seq=[],seqT=0;
function play(frames){if(reduce){Object.assign(BS,frames[frames.length-1][0]);bRender();return}clearTimeout(seqT);seq=frames.slice();step()}
function step(){const f=seq.shift();if(!f)return;Object.assign(BS,f[0]);bRender();seqT=setTimeout(step,f[1])}
/* effect sprites (mascot/anim_fx.js), anchored where FX_SPOT says on the rest body; on the wide squashed body the dust starts 1 px further out */
const fxAt=(n,i,dx=0)=>{const S=window.MASCOT.FX_SPOT[n]||[0,0];return [n,i,S[0]+dx,S[1]]};   /* effect sprites return re-anchored to the new cell; until then a missing spot stamps nothing */
const dustFx=(i,wide)=>[fxAt('dust',i,wide?1:0),fxAt('dustL',i,wide?-1:0)];
function buddyPlant(){play([[{f:'squash',happy:1,sp:0,arms:[240,300]},70],[{f:'stretch',sp:2},70],[{f:'squash2',sp:1},70],[{f:'idle',sp:0},260],[{happy:0,arms:undefined},0]])}
/* ================= mascot: speech bubbles, click reactions, scared at the close button, hang and drop ================= */
const bub=$('#bub');let bubT=0,bubI=0,clickN=0,clickAt=-1e9,BUBBLE_P=.2,waitShown=false,speakN=0,waitSeen=false,oofSeen=false;
function hideBub(){clearTimeout(bubT);clearInterval(bubI);bub.className='';buddy.classList.remove('talk')}
function speak(text,ms=2400,force,scr){
  if(buddy.hidden||carry)return false;if(!force&&Math.random()>=BUBBLE_P)return false;hideBub();speakN++;
  bub.innerHTML='<span class="bg"></span><span class="bt"></span>';const g=$('.bg',bub),t=$('.bt',bub);g.textContent=text;
  bub.className='on';buddy.classList.add('talk');
  const r=buddy.getBoundingClientRect(),dr=desk.getBoundingClientRect(),w=bub.offsetWidth,h=bub.offsetHeight,mid=r.left+r.width/2;
  let dx=0;if(mid-w/2<dr.left+8)dx=dr.left+8-(mid-w/2);if(mid+w/2>dr.right-8)dx=dr.right-8-(mid+w/2);
  bub.style.setProperty('--bx',Math.round(dx)+'px');
  bub.classList.toggle('below',r.top+bcv.offsetHeight*TIPROW/CELL_H-h-16<dr.top+28);
  if(reduce){t.textContent=text}
  else if(scr){let f=0;const F=15;bubI=setInterval(()=>{f++;const k=Math.floor(f/F*text.length);t.textContent=text.split('').map((c,i)=>i<k||c===' '?c:SCR[(Math.random()*SCR.length)|0]).join('');if(f>=F){clearInterval(bubI);t.textContent=text}},40)}
  else{let i=0;bubI=setInterval(()=>{i+=2;t.textContent=text.slice(0,i);if(i>=text.length)clearInterval(bubI)},30)}
  bubT=setTimeout(hideBub,ms+(reduce?0:text.length*30));return true;
}
/* each line the mascot says for something he is given is said once per page load; after that he just reacts */
const saidOnce=new Set();
function sayOnce(key,text,ms){if(saidOnce.has(key))return false;if(!speak(text,ms,true))return false;saidOnce.add(key);return true}
const clampBuddy=()=>{if(!buddy.style.left)return;const dw=desk.clientWidth,dh=desk.clientHeight,bw=buddy.offsetWidth,bh=buddy.offsetHeight;
  buddy.style.left=Math.round(Math.min(Math.max(parseFloat(buddy.style.left),-bw*.3),dw-bw*.7))+'px';buddy.style.top=Math.round(Math.min(Math.max(parseFloat(buddy.style.top),24),dh-bh*.6))+'px'};
const saveBuddy=()=>store.set('buddyPos',JSON.stringify({l:buddy.style.left,t:buddy.style.top}));
try{const bp=JSON.parse(store.get('buddyPos')||'null');if(bp){buddy.style.right='auto';buddy.style.bottom='auto';buddy.style.left=bp.l;buddy.style.top=bp.t;clampBuddy()}}catch(_){}
const RESET={face:0,dx:0,heart:0,happy:0,hop:0,mouth:0,q:0,sweat:0,air:0,hold:0,gape:0,lv:0,ft:0,lean:0,pose:0,flip:0,lid:0,fx:0,sw:0,arms:undefined,f:'idle'};   /* arms: screen angles [left,right] in degrees (0 right, 90 up, 180 left, 270 down); undefined = the resting pair, [false,false] = none */
/* clicked, not dragged */
function huh(px){
  bump('clicks');const said=discoveryClick();const now=performance.now();
  /* the four click lines are spaced out (at least 6 s apart), each is said once, and then it stays quiet */
  const L=["Huh? Oh, it's you again.","Careful. I'm a seed, not a stress ball.","That's one way to say hello.","Keep it up and I'll start charging per poke."];
  if(!said&&clickN<L.length&&now-clickAt>6000&&speak(L[clickN])){clickN++;clickAt=now}
  /* a poke: he squashes away from the side he was poked on, rebounds, then stands with the huh look (mascot/anim_ground.js 2, 3; flip when poked from the right) */
  const r=buddy.getBoundingClientRect(),o={flip:px!=null&&px>r.left+r.width/2?1:0,face:'huh',happy:0,hop:0,air:0,bv:0};
  play([[{...o,pose:'ground:2',arms:[150,30]},110],[{...o,pose:'ground:3',arms:[190,350]},150],[{face:'huh',pose:0,lv:0,ft:0,flip:0,f:'idle',arms:undefined},1550],[RESET,0]]);
}
/* dancing (after the glowing flower): about five seconds of hops, shuffles and hearts */
let danceRaf=0;
function stopDance(){cancelAnimationFrame(danceRaf);danceRaf=0;bcv.style.transform=''}
function dance(ms=5200){
  stopDance();if(buddy.hidden||carry||bdrag)return;
  /* eight hand-drawn frames (mascot/anim_dance.js): plant, crouch, hop, peak, land, hop, peak, settle: a 1080 ms loop of bounce and sway; no canvas rotation or sliding */
  const base={flip:0,happy:1,face:0,mouth:0,hop:0,dx:0,air:0,bv:0};
  /* a bounce-and-sway built from parts: body levels (squash, stretch), feet poses (lifting alternately) and arms swinging all around the body (mascot/arms.js) */
  const BEAT=[{lv:'rest',ft:'stand',arms:[210,330]},{lv:'S2',ft:'together',arms:[240,300]},{lv:'T2',ft:'tuck',arms:[150,30]},{lv:'T1',ft:'liftL',arms:[150,30]},{lv:'S2',ft:'splay',arms:[180,0]},{lv:'T2',ft:'tuck',arms:[150,30]},{lv:'T1',ft:'liftR',arms:[150,30]},{lv:'S1',ft:'stand',arms:[190,350]}];
  if(reduce){Object.assign(BS,base,BEAT[0],{heart:1});bRender();setTimeout(()=>{Object.assign(BS,RESET);bRender()},Math.min(ms,2400));return}
  const D=[150,120,120,150,130,120,150,140],frames=[];
  for(let t=0;t<ms;t+=1080)D.forEach((h,i)=>frames.push([{...base,...BEAT[i],fx:i>=3&&i<=5?[fxAt('heart',i-3)]:[fxAt('note',i%2)]},h]));
  frames.push([RESET,0]);play(frames);
}
/* re-enabled: happy for a moment */
function setMascot(on){
  buddy.hidden=!on||trapped;store.set('buddyGone',on?'0':'1');syncMascotCP();
  if(!on||trapped){hideBub();return}
  clearBye();nudgeLogo(false);
  requestAnimationFrame(()=>{clampBuddy();speak("I'm back!");
    play([[{f:'squash',happy:1},90],[{f:'stretch',hop:4,happy:1,arms:[150,30]},110],[{f:'idle',hop:0,happy:1,arms:[150,30]},110],[{f:'stretch',hop:4,arms:[150,30]},110],[{f:'idle',hop:0,heart:1,arms:undefined},700],[RESET,0]])});
}
/* holding the close button: scared */
const bx=$('#bx');let scT=0,holdX=false;
function scare(on){clearInterval(scT);scT=0;
  if(on){let k=0;Object.assign(BS,{face:'scared',sw:1,lv:'S3',ft:'pigeon',arms:[250,290],flip:0,air:0,bv:0});bRender();if(!reduce)scT=setInterval(()=>{BS.bv=(k++%2)?1:0;BS.dx=(k%2)?1:-1;bRender()},70)}   /* the cower and its shiver (mascot/anim_ground.js 6, 7) */
  else{Object.assign(BS,RESET);bRender()}}
bx.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.stopPropagation();holdX=true;scare(true);waitShown=speak('Wait, wait, wait!',60000,!waitSeen);waitSeen=true});
['pointerleave','pointercancel'].forEach(t=>bx.addEventListener(t,()=>{if(!holdX)return;holdX=false;scare(false);if(waitShown)speak('Phew!',1000,true);waitShown=false}));
bx.addEventListener('click',()=>{holdX=false;waitShown=false;scare(false);const at=buddy.getBoundingClientRect();setMascot(false);TK.discover('mascot-off');if(PREF('tos_bye','')!=='1'){PSET('tos_bye','1');goodbye(at)}});
/* the first time the mascot is dismissed: his last line stays where he stood, and the seed logo blinks, because that is where Control Panel lives */
const bye=document.createElement('div');bye.id='bye';bye.setAttribute('role','status');desk.appendChild(bye);let byeT=0,byeI=0,nudgeT=0;
function clearBye(){clearTimeout(byeT);clearInterval(byeI);bye.className=''}
function nudgeLogo(on){const lg=$('#logo');clearTimeout(nudgeT);lg.classList.toggle('nudge',on)}
function goodbye(at){
  const text='You turned me off? How could you!?';clearBye();
  bye.innerHTML='<span class="bg"></span><span class="bt"></span>';const g=$('.bg',bye),t=$('.bt',bye);g.textContent=text;bye.className='on';
  const dr=desk.getBoundingClientRect(),w=bye.offsetWidth,h=bye.offsetHeight,mid=at.left+at.width/2;
  let dx=0;if(mid-w/2<dr.left+8)dx=dr.left+8-(mid-w/2);if(mid+w/2>dr.right-8)dx=dr.right-8-(mid+w/2);
  bye.style.setProperty('--bx',Math.round(dx)+'px');bye.style.left=Math.round(mid-dr.left)+'px';
  bye.style.top=Math.round(Math.max(at.top+at.height*.38-dr.top,h+30))+'px';
  if(reduce)t.textContent=text;else{let i=0;byeI=setInterval(()=>{i+=2;t.textContent=text.slice(0,i);if(i>=text.length)clearInterval(byeI)},30)}
  byeT=setTimeout(clearBye,6500+(reduce?0:text.length*30));
  const lg=$('#logo');nudgeLogo(true);
  const stop=()=>{nudgeLogo(false);lg.removeEventListener('pointerdown',stop);lg.removeEventListener('animationend',fin)};
  const fin=e=>{if(e.target===lg)stop()};
  lg.addEventListener('pointerdown',stop);
  if(reduce)nudgeT=setTimeout(stop,10000);else lg.addEventListener('animationend',fin);
}
/* grab: hangs by its head from the cursor and swings; no ground shadow while it is in the air */
let bdrag=null,carry=null,diving=false;
/* hanging from the pointer: the swing angle picks one of the authored lean frames (mascot/lean.js: 12, 25, 40 degrees, negative = mirrored) instead of rotating the canvas.
   th > 0 swings the body to the right. The thresholds sit midway between the frames and have a gap each way (hysteresis) so a damped swing hovering at a threshold does not flicker. */
const LEANUP=[.105,.32,.57],LEANDN=[.075,.29,.54];
function leanFor(th,cur){const a=Math.abs(th);let n=Math.abs(cur);while(n<3&&a>=LEANUP[n])n++;while(n>0&&a<LEANDN[n-1])n--;return n&&th<0?-n:n}
function carryPose(n){Object.assign(BS,n?{pose:'lean:'+(Math.abs(n)-1),flip:n<0?1:0,lv:0,ft:0,arms:undefined}:{pose:0,flip:0,lv:'T3',ft:'dangle',arms:undefined});bRender()}
/* where the hold point (the neck) sits on the canvas, in art pixels: the upright hang holds it at the centre of pixel (16,19); each lean frame states its own pixel; all are pixel centres, so a pose change never shifts it */
function neckAt(n){const a=Math.abs(n),M=window.MASCOT;   /* the hold point is the head tip's cap centre (tip.x+2, tip.y+.5); mirrored: W-(tip.x+2) */
  if(!a||!M.ANIM_LEAN.frames[a-1]){const t=M.BODY.T3.tip;return[t[0]+2,t[1]+.5]}
  const t=M.ANIM_LEAN.frames[a-1].tip;return n<0?[CELL_W-(t[0]+2),t[1]+.5]:[t[0]+2,t[1]+.5]}
function carryPlace(c,dr){const sc=bcv.offsetWidth/CELL_W,[ax,ay]=neckAt(c.lean),snap=v=>Math.round(v/sc)*sc;
  buddy.style.left=snap(c.px-ax*sc-dr.left)+'px';buddy.style.top=snap(c.py-ay*sc-dr.top)+'px'}
function carryLoop(t){
  const c=carry;if(!c)return;
  const dt=Math.min(.05,(t-c.last)/1000)||.016;c.last=t;const dr=desk.getBoundingClientRect();
  const k=Math.min(1,dt*16),tx=Math.min(Math.max(c.cx,dr.left+8),dr.right-8),ty=Math.min(Math.max(c.cy,dr.top+30),dr.bottom-8);
  const nx=c.px+(tx-c.px)*k,ny=c.py+(ty-c.py)*k,vx=(nx-c.px)/Math.max(dt,.001);
  c.ax=c.ax*.6+Math.max(-12000,Math.min(12000,(vx-c.vx)/Math.max(dt,.001)))*.28;c.vx=vx;c.px=nx;c.py=ny;
  let rem=dt;while(rem>0){const h=Math.min(rem,.008);c.sw.step(h,c.ax);rem-=h}
  const n=reduce||window.MASCOT.ANIM_LEAN.frames.length<3?0:leanFor(c.sw.th,c.lean);   /* no swing under reduced motion: the upright hang only */if(n!==c.lean){c.lean=n;carryPose(n)}
  carryPlace(c,dr);trashHot(bodyOverTrash()||overTrash({clientX:c.cx,clientY:c.cy-4}));
  c.raf=requestAnimationFrame(carryLoop);
}
/* standing: on a window's top edge, on the status bar at a window's foot, on the bottom bar, or on the floor */
let perch=null,fallStart=0;
const FEET=()=>buddy.offsetHeight*SOLE/CELL_H;
function ledges(cx,feetY){
  const dr=desk.getBoundingClientRect(),out=[];
  if(!isMobile())order.forEach(id=>{const w=WIN[id];if(!w||!w.open||w.min)return;const el=w.el,r=el.getBoundingClientRect();
    if(!(cx>r.left-dr.left&&cx<r.right-dr.left))return;
    out.push({y:r.top-dr.top,host:id,kind:'top',x0:r.left-dr.left});
    if(!el.classList.contains('shaded')){const f=$('.wfoot',el);out.push({y:(f?f.getBoundingClientRect().top:r.bottom-10)-dr.top,host:id,kind:'foot',x0:r.left-dr.left})}});
  const sr=$('#strip').getBoundingClientRect();if(cx>sr.left-dr.left&&cx<sr.right-dr.left)out.push({y:sr.top-dr.top,host:'strip',kind:'strip',x0:sr.left-dr.left});
  return out.filter(p=>p.y>=feetY-6).sort((a,b)=>a.y-b.y);
}
function ledgeNow(p){
  const dr=desk.getBoundingClientRect();
  if(p.host==='strip'){const sr=$('#strip').getBoundingClientRect();return {y:sr.top-dr.top,x0:sr.left-dr.left,w:sr.width,z:''}}
  const w=WIN[p.host];if(!w||!w.open||w.min)return null;const el=w.el,r=el.getBoundingClientRect();
  if(p.kind==='foot'){if(el.classList.contains('shaded'))return null;const f=$('.wfoot',el);return {y:(f?f.getBoundingClientRect().top:r.bottom-10)-dr.top,x0:r.left-dr.left,w:r.width,z:(+el.style.zIndex||20)+1}}
  return {y:r.top-dr.top,x0:r.left-dr.left,w:r.width,z:(+el.style.zIndex||20)+1};
}
/* stays attached while its support moves; falls if the support goes away */
function perchTick(){
  requestAnimationFrame(perchTick);
  if(buddy.classList.contains('falling')&&performance.now()-fallStart>4000){buddy.classList.remove('falling');BS.air=0;bRender()}
  if(!perch||buddy.hidden||carry||buddy.classList.contains('falling'))return;
  const L=ledgeNow(perch);
  if(!L||perch.dx<0||perch.dx>L.w){perch=null;buddy.style.zIndex='';dropBuddy();return}
  const bw=buddy.offsetWidth;buddy.style.right='auto';buddy.style.bottom='auto';
  buddy.style.left=Math.round(L.x0+perch.dx-bw/2)+'px';buddy.style.top=Math.round(L.y-FEET())+'px';
  buddy.style.zIndex=buddy.classList.contains('talk')?'':String(L.z);
}
requestAnimationFrame(perchTick);
/* let go: no swinging on, it drops at once and lands on the highest thing under it */
function dropBuddy(){
  if(buddy.hidden)return;
  const dr=desk.getBoundingClientRect(),bw=buddy.offsetWidth,bh=buddy.offsetHeight,fo=FEET();
  let top=parseFloat(buddy.style.top)||0;const cx=(parseFloat(buddy.style.left)||0)+bw/2,from=top;
  let floor=dr.height-8-bh+fo,target=null;
  const c=ledges(cx,top+fo);if(c.length&&c[0].y<floor){floor=c[0].y;target=c[0]}
  buddy.style.zIndex='';buddy.classList.add('falling');fallStart=performance.now();perch=null;
  const land=far=>{buddy.classList.remove('falling');BS.air=0;bRender();saveBuddy();
    if(target)perch={host:target.host,kind:target.kind,dx:cx-target.x0};
    play(far?[[{lv:'S3',ft:'splay',face:'hurt',happy:0,air:0,bv:0,arms:[190,350],fx:dustFx(0,1)},70],[{fx:dustFx(1,1)},70],[{lv:'S2',ft:'stand',face:'worry',arms:[210,330],fx:dustFx(2)},120],[{lv:'T1',fx:dustFx(3),arms:[200,340]},120],[{lv:'S1',fx:0},120],[{pose:'ground:6',face:'worry',air:1,arms:undefined,flip:0},150],[{pose:0,lv:0,ft:0,f:'idle',air:0,face:'worry'},90],[{pose:'ground:7',face:'worry',air:1,arms:undefined,flip:0},150],[{pose:0,lv:0,ft:0,f:'idle',air:0,face:'worry'},90],[{lv:0,ft:0,f:'idle',face:'worry',arms:undefined},220],[RESET,0]]:[[{lv:'S2',ft:'splay',happy:0,air:0,bv:0,arms:[190,350],fx:dustFx(0,1)},70],[{lv:'S1',ft:'stand',arms:undefined,fx:dustFx(1,1)},70],[{lv:0,ft:0,f:'idle',fx:dustFx(2)},90],[{fx:dustFx(3)},110],[RESET,0]]);const first=!oofSeen;oofSeen=true;if(first)speak('Oof!',900,true);else if(far)speak('Oof!',900)};
  if(reduce){buddy.style.top=Math.round(floor-fo)+'px';land(false);return}
  let vy=0,last=performance.now();
  /* the landing animation (squash, dust) starts on the first ground contact: no little rebound first, the squash is the rebound */
  const step=t=>{const dt=Math.min(.04,(t-last)/1000)||.016;last=t;vy+=3800*dt;top+=vy*dt;
    if(top+fo>=floor){top=floor-fo;buddy.style.top=Math.round(top)+'px';land(top-from>150);return}
    buddy.style.top=Math.round(top)+'px';requestAnimationFrame(step)};
  requestAnimationFrame(step);
}
/* hops up onto the top edge of a window and stands there; false when there is no room above it */
async function hopOnto(id){
  const w=WIN[id];
  if(!w||!w.open||isMobile()||buddy.hidden||carry||bdrag||diving||buddy.classList.contains('falling'))return false;
  const L=ledgeNow({host:id,kind:'top'}),bw=buddy.offsetWidth,fo=FEET();
  if(!L||L.y-fo<HOPTOP)return false;
  const dr=desk.getBoundingClientRect(),br=buddy.getBoundingClientRect(),sx=br.left-dr.left,sy=br.top-dr.top;
  const cx=Math.min(Math.max(sx+bw/2,L.x0+bw/2+24),L.x0+L.w-bw/2-24),tx=cx-bw/2,ty=L.y-fo;
  stopDance();hideBub();perch=null;buddy.style.right='auto';buddy.style.bottom='auto';buddy.style.left=Math.round(sx)+'px';buddy.style.top=Math.round(sy)+'px';
  const d0=[...BS.dir],sc=bcv.offsetWidth/CELL_W,snap=v=>Math.round(v/sc)*sc;  /* the art is drawn sc screen px per art px: move in whole art pixels */
  const stand=()=>{perch={host:id,kind:'top',dx:cx-L.x0};buddy.classList.remove('falling');saveBuddy();
    if(reduce){play([[{f:'squash',happy:1,hop:0,air:0},110],[{f:'idle',happy:1},300],[RESET,0]]);return}
    play([[{lv:'S3',ft:'splay',bv:0,dir:[0,0],happy:1,air:0,arms:[190,350],fx:dustFx(0,1)},70],[{lv:'S1',ft:'stand',bv:0,arms:undefined,fx:dustFx(1,1)},70],[{fx:dustFx(2)},90],[{lv:0,ft:0,f:'idle',face:'relief',dir:d0,fx:dustFx(3)},110],[{fx:0},190],[RESET,0]])};
  if(reduce){buddy.style.left=Math.round(tx)+'px';buddy.style.top=Math.round(ty)+'px';stand();return true}
  /* a ballistic hop: up to a peak 56 px above the higher of the two spots, then down onto the ledge. The rise and the fall each ease like gravity (out, then in),
     so the speed is zero at the peak and the top is held there; the time split follows the two distances (t ~ sqrt(distance)), and a longer climb takes longer.
     It is posed by phase (mascot/feet.js, mascot/body.js): crouch, push off, rise, hold at the top, fall, reach, then the landing in stand(). */
  const peak=Math.min(sy,ty)-56,rise=sy-peak,fall=ty-peak,kp=Math.sqrt(rise)/(Math.sqrt(rise)+Math.sqrt(fall)),dur=Math.round(Math.min(900,Math.max(480,260+20*Math.sqrt(rise+fall))));
  const POSES=[{lv:'T2',ft:'together',dir:[0,-1],arms:[150,30]},{lv:'T3',ft:'tuck',dir:[0,-1],arms:[150,30]},{lv:'rest',ft:'loose',dir:[0,0],arms:[170,10]},{lv:'T1',ft:'spread',dir:[0,1],arms:[150,30]},{lv:'T2',ft:'spread',dir:[0,1],arms:[150,30]}];
  const phase=k=>{if(k<kp){const u=k/kp;return u<.12?0:u<.80?1:2}const q=(k-kp)/(1-kp);return q<.18?2:q<.72?3:4};
  let pi=-1;
  buddy.classList.add('falling');play([[{lv:'S2',ft:'together',bv:0,dir:[0,-1],happy:1,air:0,arms:[240,300]},90]]);
  await wait(90);
  await anim(dur,k=>{if(carry||bdrag)return;
    const i=phase(k);if(i!==pi){pi=i;Object.assign(BS,POSES[i],{bv:0,air:1,happy:1});bRender()}
    const y=k<kp?lerp(sy,peak,1-(1-k/kp)**2):lerp(peak,ty,((k-kp)/(1-kp))**2),x=lerp(sx,tx,k*k*(3-2*k));
    if(k>=1){buddy.style.left=Math.round(tx)+'px';buddy.style.top=Math.round(ty)+'px'}else{buddy.style.left=snap(x)+'px';buddy.style.top=snap(y)+'px'}});
  if(carry||bdrag){buddy.classList.remove('falling');Object.assign(BS,{lv:0,ft:0,dir:d0});return false}
  if(!w.open||w.min){Object.assign(BS,{lv:0,ft:0,dir:d0});dropBuddy();return true}
  stand();return true;
}
bcv.addEventListener('pointerdown',e=>{if(e.button!==0||diving)return;e.preventDefault();bcv.setPointerCapture(e.pointerId);bdrag={sx:e.clientX,sy:e.clientY,moved:false}});
bcv.addEventListener('pointermove',e=>{if(!bdrag)return;
  if(!bdrag.moved){if(Math.hypot(e.clientX-bdrag.sx,e.clientY-bdrag.sy)<4)return;
    bdrag.moved=true;stopDance();hideBub();perch=null;buddy.style.zIndex='';buddy.classList.add('carried');
    /* measure him BEFORE his right/bottom anchoring is dropped, and pin left/top to where he stands: otherwise the first drag of a visit starts from the desk's top-left corner */
    const r=buddy.getBoundingClientRect(),dr0=desk.getBoundingClientRect(),tp=bcv.offsetHeight*TIPROW/CELL_H;
    buddy.style.left=Math.round(r.left-dr0.left)+'px';buddy.style.top=Math.round(r.top-dr0.top)+'px';buddy.style.right='auto';buddy.style.bottom='auto';
    carry={px:r.left+TIPX*(r.width/CELL_W),py:r.top+(TIPROW+.5)*(r.width/CELL_W),cx:e.clientX,cy:e.clientY+4,vx:0,ax:0,tp,lean:0,sw:Swing(112,2.2,.85),last:performance.now(),raf:0};
    play([[{lv:'T3',ft:'dangle',arms:undefined,pose:0,flip:0,lean:0,bv:0,happy:0,mouth:0,hop:0,face:0,air:1},0]]);carry.raf=requestAnimationFrame(carryLoop)}
  carry.cx=e.clientX;carry.cy=e.clientY+4});
const endDrag=()=>{if(!bdrag)return;const m=bdrag.moved,px0=bdrag.sx;bdrag=null;
  if(m&&carry){bump('drops');TK.discover('mascot-drag');const pt={clientX:carry.cx,clientY:carry.cy-4};cancelAnimationFrame(carry.raf);
    carry.lean=0;carryPlace(carry,desk.getBoundingClientRect());Object.assign(BS,{lean:0,pose:0,flip:0,lv:'T3',ft:'dangle',arms:undefined,f:'stretch',air:1});bRender();   /* upright again with the neck where it was held: no jump */
    carry=null;buddy.classList.remove('carried');buddy.style.transform='';buddy.style.transformOrigin='';
    const ot=bodyOverTrash()||overTrash(pt);trashHot(false);if(ot)trashDive();else dropBuddy()}
  else huh(px0)};
bcv.addEventListener('pointerup',endDrag);bcv.addEventListener('pointercancel',endDrag);bcv.addEventListener('lostpointercapture',endDrag);
addEventListener('pointerup',endDrag,true);addEventListener('blur',endDrag);addEventListener('pointermove',e=>{if(bdrag&&bdrag.moved&&e.buttons===0)endDrag()},true);
addEventListener('resize',()=>{if(!carry)clampBuddy()});
/* dragged into the Trash: it drops in, the lid lifts, two eyes peek out and blink, then it hops back out */
const lerp=(a,b,k)=>a+(b-a)*k,wait=ms=>new Promise(r=>setTimeout(r,ms));
const anim=(ms,fn)=>new Promise(res=>{const t0=performance.now();const f=t=>{const k=Math.min(1,(t-t0)/ms);fn(k);k<1?requestAnimationFrame(f):res()};requestAnimationFrame(f)});
const trashFrame=k=>{const ic=$('#ic-trash .ic');if(!ic)return;const m=$('canvas.moss',ic);ic.innerHTML=svg(ICON[k],2)+svg(ICON[k],2,{fill:'url(#ck)',cls:'selov'});if(m)ic.appendChild(m)};
/* the dive's hand-drawn frames (mascot/anim_trash.js): 0 ready, 1..3 turning, 4/5 upside down kicking, 6/7 rummage tilts, 8..11 the same four seen from behind (in the can); fl=1 mirrors (turning on past 180 for the climb out) */
const trashPose=(i,fl=0)=>{Object.assign(BS,{pose:'trash:'+i,flip:fl,air:1,face:0,happy:0,mouth:0,hop:0,bv:0});bRender()};
async function trashDive(){
  TK.discover('mascot-trash');
  if(reduce){dropBuddy();return}
  diving=true;perch=null;hideBub();
  const icn=$('#ic-trash .ic'),dr=desk.getBoundingClientRect(),r=icn.getBoundingClientRect(),bw=buddy.offsetWidth,bh=buddy.offsetHeight;
  const cx=r.left+r.width/2-dr.left-bw/2,rimY=r.top-dr.top+r.height*.3,hoverY=rimY-bh*.8,sx=parseFloat(buddy.style.left)||0,sy=parseFloat(buddy.style.top)||0;
  const clip=t=>{const vis=Math.max(0,rimY-t);buddy.style.clipPath='inset(0 0 '+Math.max(0,Math.round(bh-vis))+'px 0)'};
  /* over the can, a flip with the whole sprite above the rim (nothing clipped), then head first through the rim, feet kicking */
  buddy.style.zIndex='6';trashPose(0);const flipY=rimY-bh;   /* the turning frames reach the bottom row of the cell, so the whole cell sits above the rim */
  await anim(150,k=>{buddy.style.left=Math.round(lerp(sx,cx,k))+'px';buddy.style.top=Math.round(lerp(sy,flipY,k))+'px'});
  let fi=-1;
  await anim(220,k=>{const i=Math.min(4,Math.floor(k*5));if(i!==fi){fi=i;trashPose(i)}buddy.style.top=Math.round(flipY-16*4*k*(1-k))+'px'});
  fi=-1;
  await anim(280,k=>{const i=4+(Math.floor(k*280/90)%2);if(i!==fi){fi=i;trashPose(i)}const t=lerp(flipY,rimY,k*k);buddy.style.top=Math.round(t)+'px';clip(t)});
  buddy.style.visibility='hidden';buddy.style.clipPath='';Object.assign(BS,RESET);bRender();
  for(let i=0;i<5;i++){icn.style.transform='translateX('+(i%2?2:-2)+'px)';await wait(55)}icn.style.transform='';
  await wait(250);trashFrame('trashO0');await wait(800);
  trashFrame('trashO1');await wait(140);trashFrame('trashO0');await wait(520);
  trashFrame('trashO1');await wait(140);trashFrame('trashO0');await wait(760);
  /* it pops out of the can and over to the side, then falls to whatever is below */
  trashFrame('trashO2');   /* the eyes in the can were the mascot looking out: once he shows himself the can has none */
  buddy.style.left=Math.round(cx)+'px';buddy.style.visibility='';play([[{f:'stretch',air:0,hop:3,happy:1},120],[{f:'idle',hop:0},400],[RESET,0]]);
  const upY=rimY-bh*.55;
  await anim(200,k=>{const t=lerp(rimY,upY,k);buddy.style.top=Math.round(t)+'px';clip(t)});
  buddy.style.clipPath='';trashFrame('trash');const ex=Math.max(8,cx-140);
  await anim(340,k=>{buddy.style.left=Math.round(lerp(cx,ex,k))+'px';buddy.style.top=Math.round(upY-4*70*k*(1-k))+'px'});
  trashFrame('trash');diving=false;dropBuddy();
}

/* ================= an icon dragged out of a window into the Trash: the mascot rummages, then everything in there flies back out ================= */
const bin={items:[],out:new Set(),ghosts:new Set(),run:false,until:0,p:Promise.resolve()};
const nextFrame=()=>new Promise(r=>requestAnimationFrame(r));
function makeGhost(item){
  const r=item.getBoundingClientRect(),el=document.createElement('div');el.className='dgh item';
  /* an icon whose window has closed has no size, so it keeps the last one it had */
  if(r.width)item._gw=r.width;el.style.width=(r.width||item._gw||200)+'px';el.style.setProperty('--k',(getComputedStyle(item).getPropertyValue('--k')||'1').trim()||'1');
  for(const n of item.children){if(!n.matches('.rl,.bl'))el.appendChild(n.cloneNode(true))}
  const a=item.querySelectorAll('canvas'),b=el.querySelectorAll('canvas');a.forEach((c,i)=>{try{b[i].getContext('2d').drawImage(c,0,0)}catch(_){}});
  document.body.appendChild(el);const G={el,w:el.offsetWidth,h:el.offsetHeight,cx:r.left+r.width/2,cy:r.top+r.height/2};G.s=Math.min(1,104/G.w);bin.ghosts.add(G);return G;
}
function putGhost(G,cx,cy,sc=1,rot=0){G.el.style.transform=`translate(${Math.round(cx-G.w/2)}px,${Math.round(cy-G.h/2)}px) rotate(${rot}deg) scale(${sc})`}
function dropGhost(G){G.el.remove();bin.ghosts.delete(G)}
const trashPt=()=>{const r=$('#ic-trash .ic').getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height*.4,r}};
function showItem(item){item.style.visibility='';item.classList.remove('lifted')}
/* every hidden icon comes back, whatever happened */
function binRestore(){for(const rec of [...bin.items,...bin.out])showItem(rec.item);bin.items.length=0;bin.out.clear();for(const G of [...bin.ghosts])dropGhost(G)}
/* the icon is let go over the Trash: it shrinks into the can and joins whatever is already in there */
function binFeed(item,G,from){
  TK.discover('icon-to-trash',{item:itemKey(item)});
  bin.items.push({item});item.classList.remove('lifted');item.style.visibility='hidden';
  const t=trashPt();bin.until=Math.max(bin.until,performance.now()+1100);
  const ic=$('#ic-trash .ic');if(ic&&!reduce){ic.classList.remove('pop2');void ic.offsetWidth;ic.classList.add('pop2')}
  anim(reduce?1:240,k=>putGhost(G,lerp(from.cx,t.x,k),lerp(from.cy,t.y,k)-26*4*k*(1-k),lerp(from.sc,.25,k),from.rot*(1-k))).then(()=>dropGhost(G));
  if(!bin.run)bin.p=binRun();
}
async function binRun(){
  bin.run=true;
  try{await binShow()}catch(err){console.error(err)}
  finally{binRestore();bin.run=false;bin.until=0;const ic=$('#ic-trash .ic');if(ic)ic.style.transform='';trashFrame('trash')}
}
async function binShow(){
  const icn=$('#ic-trash .ic');
  if(reduce){await wait(900);return}
  while(diving||buddy.classList.contains('falling')||carry||bdrag)await wait(100);
  const mascot=!buddy.hidden;diving=true;
  const shake=async()=>{for(let i=0;i<4;i++){icn.style.transform='translateX('+(i%2?2:-2)+'px)';await wait(55)}icn.style.transform=''};
  let ejected=null;
  try{
    if(!mascot){
      bin.until=Math.max(bin.until,performance.now()+1500);await shake();while(performance.now()<bin.until){await shake();await wait(120)}
      trashFrame('trashO0');
      do{await binEject(0)}while(bin.items.length);
      trashFrame('trashO1');await wait(140);
      return;
    }
    const dr=desk.getBoundingClientRect(),bw=buddy.offsetWidth,bh=buddy.offsetHeight,fo=FEET(),br=buddy.getBoundingClientRect();
    const sx=br.left-dr.left,sy=br.top-dr.top;
    stopDance();hideBub();perch=null;buddy.classList.remove('falling');buddy.style.right='auto';buddy.style.bottom='auto';buddy.style.left=Math.round(sx)+'px';buddy.style.top=Math.round(sy)+'px';buddy.style.zIndex='6';
    /* surprised: a jump, wide eyes, a line */
    play([[{f:'stretch',face:'scared',hop:3,sw:1,happy:0,mouth:0},0]]);
    await anim(240,k=>{buddy.style.top=Math.round(sy-34*4*k*(1-k))+'px'});
    await wait(850);hideBub();
    /* over to the Trash in three hops */
    const t=trashPt(),cx=t.x-dr.left-bw/2,rimY=t.r.top-dr.top+t.r.height*.3,topIn=rimY-bh;
    const x0=Math.round(sx);
    play([[{f:'stretch',face:0,hop:3,happy:1,sw:0,fx:0},0]]);
    await anim(620,k=>{const e=k*k*(3-2*k);buddy.style.left=Math.round(lerp(x0,cx,e))+'px';buddy.style.top=Math.round(lerp(sy,topIn-30,e)-26*Math.abs(Math.sin(k*Math.PI*3)))+'px'});
    /* flip and go in headfirst with hand-drawn frames (mascot/anim_trash.js), no CSS rotation. The frames turn about the body centre, so upside down the body sits 12 art rows
       lower than a canvas turned about its middle: top - off keeps the rim line where it was, and the part under the rim is the bottom of the canvas now. */
    const off=23*bh/CELL_H,clip=d=>{const n=Math.max(0,Math.round(d-off));buddy.style.clipPath=n?'inset(0 0 '+n+'px 0)':''};
    trashPose(0);let fi=-1;
    await anim(220,k=>{const i=Math.min(4,Math.floor(k*5));if(i!==fi){fi=i;trashPose(i)}buddy.style.top=Math.round(lerp(topIn-30,topIn,k)-18*4*k*(1-k)-off*k)+'px'});
    trashPose(8);   /* going in, he turns his back on us: the rest of the rummage is seen from behind */
    await anim(300,k=>{const d=fo*.68*k*k;buddy.style.top=Math.round(topIn+d-off)+'px';clip(d)});
    /* rummage until nothing else has been dropped for a moment: kick A, tilt, kick B, tilt (from behind, head well down in the can) */
    const t0=performance.now();let lastB=t0,lastS=t0;bin.until=Math.max(bin.until,t0+2300);fi=-1;
    while(performance.now()<bin.until){
      const now=performance.now(),tm=now-t0,d=fo*(.68+.12*Math.sin(tm*.011)),i=[8,10,9,11][Math.floor(tm/110)%4];
      if(i!==fi){fi=i;trashPose(i)}
      buddy.style.top=Math.round(topIn+d-off)+'px';buddy.style.left=Math.round(cx+4*Math.sin(tm*.017))+'px';clip(d);
      if(now-lastS>110){lastS=now;icn.style.transform='translateX('+(Math.random()<.5?-2:2)+'px)'}
      if(now-lastB>520){lastB=now;burstAt(t.x,t.r.top+t.r.height*.28,6)}
      await nextFrame();
    }
    icn.style.transform='';
    /* the icons shoot out, the mascot climbs out after them */
    ejected=(async()=>{do{await binEject(0)}while(bin.items.length)})();
    trashPose(4);
    await anim(220,k=>{const d=fo*.8*(1-k);buddy.style.top=Math.round(topIn+d-off)+'px';buddy.style.left=Math.round(cx)+'px';clip(d)});
    buddy.style.clipPath='';buddy.style.visibility='';
    const ex=Math.max(8,cx-140);fi=-1;
    /* out and over to the left, the turn carrying on past 180 degrees (the mirrored frames), then upright */
    await anim(380,k=>{const i=k<.3?3:k<.6?2:k<.85?1:0;if(i!==fi){fi=i;trashPose(i,1)}buddy.style.left=Math.round(lerp(cx,ex,k))+'px';buddy.style.top=Math.round(topIn-4*60*k*(1-k)-off*(1-k))+'px'});
    Object.assign(BS,{pose:0,flip:0});play([[{f:'stretch',air:0,hop:3,happy:1},120],[{f:'idle',hop:0},400],[RESET,0]]);
    await ejected;ejected=null;
  }finally{
    if(ejected)await ejected.catch(()=>{});
    buddy.style.clipPath='';buddy.style.transform='';buddy.style.transformOrigin='';buddy.style.visibility='';icn.style.transform='';
    trashFrame('trash');
    diving=false;if(mascot){Object.assign(BS,RESET);bRender();dropBuddy()}
  }
}
/* everything in the can leaves it in an arc, lands on the desktop, blinks out and reappears where it came from */
async function binEject(){
  const jobs=[];let i=0;
  while(bin.items.length){const rec=bin.items.shift();bin.out.add(rec);jobs.push(binFly(rec,i++));await wait(reduce?0:130)}
  await Promise.all(jobs);
}
async function binFly(rec,i){
  const G=makeGhost(rec.item),t=trashPt(),col=i%5,row=(i/5)|0;
  const lx=Math.max(60,t.x-120-col*86-Math.random()*14),ly=Math.min(innerHeight-70,t.r.bottom-18)-row*96,spin=(i%2?1:-1)*(300+Math.random()*120);
  await anim(560,k=>putGhost(G,lerp(t.x,lx,k),lerp(t.y,ly,k)-190*4*k*(1-k),lerp(.25,G.s,Math.min(1,k*2.5)),spin*k));
  burstAt(lx,ly+G.h*G.s*.4,6);
  await anim(190,k=>putGhost(G,lx,ly-26*4*k*(1-k),G.s,spin%360));
  await anim(120,k=>putGhost(G,lx,ly-9*4*k*(1-k),G.s,spin%360));
  await wait(650);
  for(let b=0;b<3;b++){G.el.style.visibility='hidden';await wait(70);G.el.style.visibility='';await wait(70)}
  dropGhost(G);bin.out.delete(rec);showItem(rec.item);
  if(!reduce){rec.item.classList.add('back');setTimeout(()=>rec.item.classList.remove('back'),320)}
}
/* picking an icon up out of any window except the Trash itself. A mouse or pen drags it; a finger grabs it with a sideways drag or a hold (up and down still scroll the window).
   On a phone the windows cover the desktop, so they step aside while the icon is carried and the source window closes when the icon is dropped on the Trash or the mascot */
let peekN=0;
const peekOn=()=>{peekN++;document.body.classList.add('peek')};
const peekOff=()=>{peekN=Math.max(0,peekN-1);if(!peekN)document.body.classList.remove('peek')};
(function(){
  let block=false,held=false,grabbing=false;
  desk.addEventListener('click',e=>{if(block){e.preventDefault();e.stopPropagation()}},true);
  desk.addEventListener('dragstart',e=>{if(e.target.closest&&e.target.closest('.win .item'))e.preventDefault()});
  desk.addEventListener('contextmenu',e=>{if(held&&e.target.closest&&e.target.closest('.win .item'))e.preventDefault()});
  /* once an icon is in hand the page must not scroll under the finger (needs a listener that is allowed to cancel) */
  document.addEventListener('touchmove',e=>{if(grabbing&&e.cancelable)e.preventDefault()},{passive:false});
  desk.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    const item=e.target.closest('.win .item');if(!item||item.closest('#w-trash'))return;
    const touch=e.pointerType==='touch',pid=e.pointerId,sx=e.clientX,sy=e.clientY;
    let G=null,raf=0,t0=0,px=sx,py=sy,lpx=sx,rot=0,off=null,cur=null,hold=0,armed=false,phone=false,srcWin=null;
    const draw=t=>{
      const sc=lerp(1,G.s,Math.min(1,(t-t0)/140));rot+=(Math.max(-10,Math.min(10,(px-lpx)*.7))-rot)*.25;lpx=px;
      cur={cx:px+off.x*sc,cy:py+off.y*sc,sc,rot};putGhost(G,cur.cx,cur.cy,sc,rot);raf=requestAnimationFrame(draw)};
    const grab=()=>{
      clearTimeout(hold);hold=0;armed=false;
      G=makeGhost(item);off={x:G.cx-sx,y:G.cy-sy};item.classList.add('lifted');document.body.classList.add('dgdrag');t0=performance.now();raf=requestAnimationFrame(draw);
      if(touch){grabbing=true;try{item.releasePointerCapture(pid)}catch(_){}if(navigator.vibrate)navigator.vibrate(12);
        phone=isMobile();if(phone){srcWin=item.closest('.win');peekOn()}}};
    const mv=ev=>{
      if(ev.pointerId!==pid)return;
      if(ev.buttons===0&&!touch){end(ev,true);return}
      px=ev.clientX;py=ev.clientY;
      if(!G){
        const dx=px-sx,dy=py-sy,d=Math.hypot(dx,dy);
        if(touch){if(d<8)return;
          /* held first: it is grabbed once it moves. Otherwise mostly sideways is a grab and mostly vertical is the window scrolling */
          if(armed||(Math.abs(dx)>=10&&Math.abs(dx)>Math.abs(dy)*1.3))grab();else{clearTimeout(hold);hold=0;return}}
        else{if(d<5)return;grab()}}
      const ob=mawReady()&&overBuddy(ev);buddy.classList.toggle('hot',ob);trashHot(!ob&&overTrash(ev))};
    let done=false;
    const end=async(ev,cancel)=>{if(done||(ev&&ev.pointerId!==undefined&&ev.pointerId!==pid&&ev.type!=='blur'))return;done=true;
      clearTimeout(hold);held=false;grabbing=false;armed=false;
      removeEventListener('pointermove',mv);removeEventListener('pointerup',up);removeEventListener('pointercancel',cx);removeEventListener('blur',cx);cancelAnimationFrame(raf);
      if(!G)return;document.body.classList.remove('dgdrag');trashHot(false);buddy.classList.remove('hot');block=true;setTimeout(()=>{block=false},80);
      /* dropped on a target: the window it came from closes, the others stay out of the way until the show is over */
      const drop=()=>{if(!phone)return;const id=srcWin&&Object.keys(WIN).find(k=>WIN[k].el===srcWin);if(id)closeWin(id)};
      if(!cancel&&mawReady()&&overBuddy(ev)){drop();const r=mawEat(item,G,cur);if(phone)r.finally(peekOff);return}
      if(!cancel&&overTrash(ev)){drop();binFeed(item,G,cur);if(phone)bin.p.finally(peekOff);return}
      if(phone)peekOff();
      const f=cur;await anim(reduce?1:160,k=>putGhost(G,lerp(f.cx,G.cx,k),lerp(f.cy,G.cy,k),lerp(f.sc,1,k),f.rot*(1-k)));dropGhost(G);item.classList.remove('lifted')};
    const up=ev=>end(ev,false),cx=ev=>end(ev,true);
    /* a hold keeps the window from scrolling; the icon lifts when the finger then moves. A hold that is let go without moving is just a slow tap */
    if(touch){held=true;hold=setTimeout(()=>{hold=0;if(!G&&!done){armed=true;grabbing=true}},500)}
    addEventListener('pointermove',mv);addEventListener('pointerup',up);addEventListener('pointercancel',cx);addEventListener('blur',cx);
  });
})();


/* ================= an icon dropped on the mascot: he holds it up, has a thought about it, opens wide, swallows it, and it comes back ================= */
const mawReady=()=>!buddy.hidden&&!diving&&!carry&&!bdrag&&!buddy.classList.contains('falling')&&!bin.run;
const MAWL={pistol:"Yum! One of the most successful VR titles of all-time!",journey:"Mmm, highly ambitious this one",flourish:"Creative AND Helpful!",proximity:"Wow, WAY ahead of its time!",horizon:"Dozens of innovative mini-games!",marvel:"Delicious Marvel Characters!",form:"A beautiful and innovative experience, tasty!",'petras-planet':"Making learning fun!? yum!",'citizen-grim':"This has a really loyal fanbase? wow!",'whore-of-the-orient':"Not enough time in the oven, but these ingredients are delicious!",'resident-evil-orc':"mm, itchy... tasty...",'star-wars-battlefront':"One challenge on this was Darth Vader wasn't allowed to run!",'socom-fireteam-bravo-3':"mm, they packed so much into such a small morsel",'socom-confrontation':"The MOST popular PS3 game on release, yum!",'socom-tactical-strike':"Delicious Real-time tactics!",bully:"The team fought hard so that you could kiss boys and girls equally, a first on PS2!",'max-payne-2':"Moody Noir is always delicious",
  mail:"Ohh, a vintage communication method!",linkedin:"I'll eat it... but my tummy won't agree with it after",simple:"you know if you click on this I go away, haha",v80:"hmm, smells a little plain"};
/* [key, line] for an icon; a project with no written line falls back to its own blurb */
function mawLine(item){
  const p=item.dataset.p&&P.find(q=>q.id===item.dataset.p);
  const k=p?p.id:item.matches('[data-mail]')?'mail':item.matches('a[href*="linkedin"]')?'linkedin':item.id==='vw-simple'?'simple':item.id==='vw-80'?'v80':'';
  if(MAWL[k])return['m:'+k,MAWL[k]];
  if(p)return['m:'+p.id,'Hm, '+p.name+'. '+p.blurb];
  return['m:'+(item.id||'?'),'Hm, '+(($('.nm',item)||{}).textContent||'this')+'.'];
}
const pose=o=>{clearTimeout(seqT);seq=[];Object.assign(BS,o);bRender()};
async function mawEat(item,G,from){
  TK.discover('icon-to-mascot',{item:itemKey(item)});
  item.classList.remove('lifted');item.style.visibility='hidden';diving=true;
  let holding=false;
  try{
    stopDance();hideBub();const [key,line]=mawLine(item),fresh=!saidOnce.has(key);
    if(reduce){dropGhost(G);if(fresh)sayOnce(key,line,2600);await wait(fresh?2800:600);return}
    const dr=desk.getBoundingClientRect(),side=buddy.getBoundingClientRect().left+buddy.offsetWidth/2<dr.left+dr.width/2?1:-1;
    const hs=Math.min(1,72/G.w),hp=(r,t=0)=>({x:r.left+r.width/2+side*(r.width*.5+G.w*hs*.5-4),y:r.top+r.height*.5+Math.sin(t*.006)*4});
    /* he reaches out and takes it */
    pose({f:'stretch',hold:side,happy:1,face:0,mouth:0});
    {const r=buddy.getBoundingClientRect(),h=hp(r);await anim(240,k=>putGhost(G,lerp(from.cx,h.x,k),lerp(from.cy,h.y,k)-20*4*k*(1-k),lerp(from.sc,hs,k),from.rot*(1-k)))}
    /* holds on to it and says what he makes of it */
    holding=true;const t0=performance.now();
    (async()=>{while(holding){const t=performance.now()-t0,h=hp(buddy.getBoundingClientRect(),t);putGhost(G,h.x,h.y,hs,Math.sin(t*.004)*6);await nextFrame()}})();
    pose({f:'idle',hold:side,happy:1});
    const hold=fresh?Math.min(7000,Math.max(2400,line.length*45+600)):900;if(fresh)sayOnce(key,line,hold);
    await wait(hold*.5);pose({f:'stretch',hold:side,happy:0});await wait(hold*.25);pose({f:'idle',hold:side,happy:1});await wait(hold*.25);hideBub();
    /* the mouth grows to take the whole thing */
    holding=false;await nextFrame();
    const r=buddy.getBoundingClientRect(),h0=hp(r,performance.now()-t0),m={x:r.left+r.width/2,y:r.top+r.height*.76};
    await anim(620,k=>{const e=k*k,gape=Math.round(1+k*5);if(gape!==BS.gape)pose({f:'stretch',hold:side,gape,happy:0,mouth:0});
      putGhost(G,lerp(h0.x,m.x,e),lerp(h0.y,m.y,e),lerp(hs,.1,Math.max(0,(k-.35)/.65)),0)});
    dropGhost(G);await wait(120);
    /* gulp */
    pose({f:'stretch',gape:3,hold:0});await wait(90);pose({f:'squash',gape:0,mouth:0,happy:0});await wait(130);
    pose({f:'stretch',gape:0,happy:0});await wait(120);pose({f:'squash',happy:1});await wait(140);
    showItem(item);item.classList.add('back');setTimeout(()=>item.classList.remove('back'),320);
    {const ir=item.getBoundingClientRect().width?item.getBoundingClientRect():buddy.getBoundingClientRect();burstAt(ir.left+ir.width/2,ir.top+ir.height/2,8)}
    pose({f:'idle',happy:1,hop:3});await wait(160);pose({hop:0});await wait(500);
  }finally{
    holding=false;dropGhost(G);showItem(item);Object.assign(BS,RESET);bRender();diving=false;
  }
}

/* ================= Unreleased pulled out of the Trash: it sits on the desktop, glitching, and the mascot does not like it ================= */
const UNRL_LINE="Gee, I don't know if that's a good idea...";
const unr={on:false,el:null,t:0};
function fillGx(gx){[[2,'#FF3B3B',-2,0],[2,'#3BE0FF',2,0],[2,'#FFFFFF',0,0]].forEach(([i,c,dx,dy])=>{const cv=mk(i,c,40,{});cv.style.marginLeft=dx+'px';cv.style.marginTop=dy+'px';gx.appendChild(cv)})}
const unrApp=()=>{const a=document.createElement('span');a.className='app dk';a.innerHTML='<i></i><b class="gx"></b>';fillGx($('.gx',a));return a};
function shakeAll(power){if(reduce)return;const els=[$('#desk'),$('#mbar')];let n=0;const t=setInterval(()=>{n++;const end=n>10;els.forEach(d=>{d.style.transform=end?'':`translate(${Math.round((Math.random()*2-1)*power)}px,${Math.round((Math.random()*2-1)*power)}px)`});if(end)clearInterval(t)},38)}
/* every 5 s a ring leaves the icon and rattles the whole screen */
function unrPulse(){
  if(!unr.on||reduce||!unr.el)return;
  const r=unr.el.getBoundingClientRect();
  [0,140].forEach((d,i)=>setTimeout(()=>{const w=document.createElement('i');w.className='pw'+(i?' pw2':'');w.style.left=(r.left+r.width/2)+'px';w.style.top=(r.top+r.height/2-8)+'px';document.body.appendChild(w);setTimeout(()=>w.remove(),1000)},d));
  shakeAll(7);
}
function unrOut(x,y){
  if(unr.on||gameOn())return;unr.on=true;TK.discover('unreleased-out',{},'crash_unreleased_out');
  const b=document.createElement('button');b.type='button';b.className='icon unrd';b.id='ic-unr';
  b.appendChild(unrApp());b.insertAdjacentHTML('beforeend','<span class="lb">Unreleased</span>');
  const dw=desk.clientWidth,dh=desk.clientHeight;
  b.style.left=Math.round(Math.min(Math.max(x-48,4),dw-100))+'px';b.style.top=Math.round(Math.min(Math.max(y-40,36),dh-110))+'px';desk.appendChild(b);unr.el=b;
  $('[data-open="unreleased"]',WIN.trash.el).hidden=true;updTrashCount();
  stopDance();BS.pens=1;bRender();speak(UNRL_LINE,3400,true);
  clearInterval(unr.t);unr.t=setInterval(unrPulse,5000);
  let block=false;
  b.addEventListener('click',()=>{if(!block)unrOpen()});
  b.addEventListener('pointerdown',e=>{
    if(e.button!==0||crash.on)return;const r0=b.getBoundingClientRect(),gx=e.clientX-r0.left,gy=e.clientY-r0.top,sx=e.clientX,sy=e.clientY;let moved=false;
    const mv=ev=>{if(!moved){if(Math.hypot(ev.clientX-sx,ev.clientY-sy)<5)return;moved=true;b.classList.add('drag');b.style.pointerEvents='none';document.body.classList.add('dgdrag')}
      const dr=desk.getBoundingClientRect();b.style.left=Math.round(Math.min(Math.max(ev.clientX-dr.left-gx,0),desk.clientWidth-96))+'px';b.style.top=Math.round(Math.min(Math.max(ev.clientY-dr.top-gy,0),desk.clientHeight-88))+'px';trashHot(overTrash(ev))};
    const end=(ev,cancel)=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);removeEventListener('pointercancel',cx);removeEventListener('blur',cx);
      if(!moved)return;b.classList.remove('drag');b.style.pointerEvents='';document.body.classList.remove('dgdrag');trashHot(false);block=true;setTimeout(()=>{block=false},80);
      if(!cancel&&overTrash(ev))unrIn()};
    const up=ev=>end(ev,false),cx=ev=>end(ev,true);
    addEventListener('pointermove',mv);addEventListener('pointerup',up);addEventListener('pointercancel',cx);addEventListener('blur',cx);
  });
}
/* back in the Trash: it drops in, and he can breathe again */
async function unrIn(){
  if(!unr.on)return;const b=unr.el;clearInterval(unr.t);unr.t=0;unr.on=false;unr.el=null;
  const t=trashPt(),r=b.getBoundingClientRect(),fx=r.left,fy=r.top;b.style.pointerEvents='none';
  await anim(reduce?1:240,k=>{b.style.left=Math.round(lerp(fx-desk.getBoundingClientRect().left,t.x-48-desk.getBoundingClientRect().left,k))+'px';b.style.top=Math.round(lerp(fy-desk.getBoundingClientRect().top,t.y-60-desk.getBoundingClientRect().top,k))+'px';b.style.transform='scale('+(1-k*.8)+')'});
  b.remove();
  $('[data-open="unreleased"]',WIN.trash.el).hidden=false;crumbleUnr();updTrashCount();
  const ic=$('#ic-trash .ic');if(ic&&!reduce){ic.classList.remove('pop2');void ic.offsetWidth;ic.classList.add('pop2')}
  BS.pens=0;if(!buddy.hidden&&!diving&&!carry){play([[{f:'squash',happy:1},110],[{f:'stretch',hop:3,happy:1},140],[{f:'idle',hop:0,happy:1},500],[RESET,0]])}else bRender();
  speak('Phew!',1800,true);
}
/* drag it out of the Trash window onto the empty desktop */
(function(){
  const it=$('[data-open="unreleased"]',WIN.trash.el);let block=false;
  it.addEventListener('click',e=>{if(block){e.stopImmediatePropagation();e.preventDefault()}},true);
  it.addEventListener('pointerdown',e=>{
    if(e.button!==0||unr.on||gameOn())return;const sx=e.clientX,sy=e.clientY;let ghost=null,phone=false;it.setPointerCapture(e.pointerId);
    const mv=ev=>{if(!ghost){if(Math.hypot(ev.clientX-sx,ev.clientY-sy)<5)return;
        ghost=document.createElement('div');ghost.className='cghost ug';ghost.appendChild(unrApp());document.body.appendChild(ghost);
        if(isMobile()){phone=true;peekOn()}}
      ghost.style.left=(ev.clientX-36)+'px';ghost.style.top=(ev.clientY-36)+'px'};
    const up=ev=>{it.removeEventListener('pointermove',mv);it.removeEventListener('pointerup',up);it.removeEventListener('pointercancel',up);
      if(!ghost)return;ghost.remove();block=true;setTimeout(()=>{block=false},80);
      const t=document.elementsFromPoint(ev.clientX,ev.clientY).find(n=>!n.closest('.cghost'));
      if(phone)peekOff();
      if(t===desk){const dr=desk.getBoundingClientRect();unrOut(ev.clientX-dr.left,ev.clientY-dr.top);if(phone)closeWin('trash')}};
    it.addEventListener('pointermove',mv);it.addEventListener('pointerup',up);it.addEventListener('pointercancel',up);
  });
})();

/* ================= opening it from the desktop: the screen tears for a moment, then the application quits unexpectedly ================= */
ICON.skull=art(32,32,({R,P,D,get})=>{
  D(16,14,11,'k');D(16,14,10,'c');R(10,22,12,7,'k');R(11,22,10,6,'c');
  for(let y=3;y<25;y++)for(let x=16;x<28;x++)if(get(x,y)==='c'&&(x-16)*(x-16)+(y-14)*(y-14)>70)P(x,y,'g');
  D(11.5,15,3.2,'k');D(20.5,15,3.2,'k');P(10,14,'x');P(19,14,'x');
  P(15,19,'k');P(16,19,'k');R(15,20,2,1,'k');
  R(11,25,10,1,'k');for(let x=12;x<=20;x+=2)R(x,25,1,3,'k');R(11,28,10,1,'k');
  R(15,0,2,3,'q');R(17,0,3,2,'T');R(12,1,3,1,'T')});
ICON.bomb=art(32,32,({R,P,D})=>{D(14,19,10,'k');D(14,19,9,'x');D(11,16,4,'s');R(9,15,3,1,'w');R(10,14,2,1,'w');R(17,7,2,3,'k');R(19,5,3,2,'o');P(22,4,'y');P(23,3,'r');P(21,3,'y');P(24,5,'y')});
makeWin({id:'crash',title:'Unreleased',x:0,y:0,w:400,
 body:`<div class="crash"><span class="cr-ic" aria-hidden="true">${svg(ICON.bomb,2)}</span><div class="cr-tx"><p><b>Sorry, the application “Unreleased” has unexpectedly quit.</b></p><p>Ignore keeps the system running. Try again starts it over.</p></div><div class="cr-btns"><button class="btn bev" type="button" data-cr="ignore">Ignore</button><span class="ring"><button class="btn bev" type="button" data-cr="again">Try again</button></span></div></div>`,
 init(el){el.addEventListener('click',e=>{const b=e.target.closest('[data-cr]');if(!b)return;if(b.dataset.cr==='ignore')closeWin('crash');else unrTryAgain()})},
 onclose(){if(!crash.go)crashIgnored()}});
const crash={on:false,go:false,hop:null};
function screenGlitch(ms){
  return new Promise(res=>{
    if(!ms){res();return}
    const cv=document.createElement('canvas');cv.className='glo';cv.width=Math.ceil(innerWidth/4);cv.height=Math.ceil(innerHeight/4);document.body.appendChild(cv);
    const x=cv.getContext('2d'),W=cv.width,H=cv.height,els=[$('#desk'),$('#mbar')],PAL=['#0A1415','#0F5E60','#1E3A3C','#008080'],NZ=['#0A1415','#FF3333','#3BE0FF','#FFFFFF'],t0=performance.now();
    let iv=0,lastB=-1e9;
    const tick=()=>{const t=performance.now()-t0;
      if(t>ms){clearInterval(iv);cv.remove();els.forEach(e=>{e.style.transform='';e.style.filter=''});res();return}
      /* the wide bands change a few times a second at most; only the tearing and the specks move faster */
      if(t-lastB>340){lastB=t;x.clearRect(0,0,W,H);for(let k=0,n=3+((Math.random()*6)|0);k<n;k++){x.globalAlpha=.5+Math.random()*.35;x.fillStyle=PAL[(Math.random()*PAL.length)|0];x.fillRect(0,(Math.random()*H)|0,W,1+((Math.random()*H*.07)|0))}}
      x.globalAlpha=1;for(let k=0,n=W*H*.006;k<n;k++){x.fillStyle=NZ[(Math.random()*NZ.length)|0];x.fillRect((Math.random()*W)|0,(Math.random()*H)|0,1+((Math.random()*4)|0),1)}
      els.forEach(e=>{e.style.transform=Math.random()<.6?`translate(${((Math.random()*2-1)*18)|0}px,${((Math.random()*2-1)*4)|0}px)`:'';e.style.filter=''})};
    iv=setInterval(tick,70);tick();
  });
}
async function unrOpen(){
  if(!unr.on||crash.on||diving||gameOn())return;
  crash.on=true;crash.hop=null;clearInterval(unr.t);unr.t=0;TK.discover('crash-open',{},'crash_open');
  await screenGlitch(reduce?0:720);
  const w=WIN.crash.el;w.style.left=Math.round((desk.clientWidth-400)/2)+'px';w.style.top=Math.round(Math.max(150,desk.clientHeight*.36-60))+'px';
  openWin('crash',unr.el);
  if(!buddy.hidden&&!carry&&!bdrag){
    BS.pens=0;play([[{f:'stretch',face:'scared',sw:1,arms:[250,290],happy:0},0]]);
    crash.hop=hopOnto('crash');await crash.hop;if(!crash.on||crash.go)return;
    play([[{f:'idle',face:'scared',sw:1,arms:[240,300],happy:0},0]]);speak("Just ignore, don't do it again!",4600,true);
  }
}
/* Ignore: the dialog goes, the icon stays out, and so does the pulse */
function crashIgnored(){
  TK.discover('crash-ignore');
  crash.on=false;hideBub();
  if(unr.on){clearInterval(unr.t);unr.t=setInterval(unrPulse,5000);BS.pens=1}
  if(!buddy.hidden&&!diving)play([[RESET,0]]);bRender();
}

/* ================= Try again: the mascot dies, the screen is pulled into a black hole, and the system reboots ================= */
const SKULL_KEY='tos_skull';
const vxInline=el=>({el,attr:el.getAttribute('style')});
function vxCollect(){
  const out=[],hide=[],shards=[],wins=$$('.win:not([hidden])');
  const inl=el=>getComputedStyle(el).display==='inline';
  const leaf=(el,clipR)=>{
    const r=el.getBoundingClientRect();if(r.width<1||r.height<1)return;
    const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')return;
    if(clipR&&(r.right<clipR.left||r.left>clipR.right||r.bottom<clipR.top||r.top>clipR.bottom)){hide.push(vxInline(el));return}
    const kids=[...el.children].filter(k=>k.getBoundingClientRect().width>0),text=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
    if(!kids.length||text||(r.width<=150&&r.height<=150)||kids.every(inl)||el.matches('svg,canvas,img')){out.push({...vxInline(el),x:r.left+r.width/2,y:r.top+r.height/2});return}
    paint(el);kids.forEach(k=>leaf(k,clipR));
  };
  /* a container that paints something (a card, a scrollbar track) breaks into shards of its own colour so nothing is left hanging in the air */
  const paint=el=>{
    if(el.matches('.wf,.wbw,.wbody,.win,#mbar'))return;
    const cs=getComputedStyle(el),bg=cs.backgroundColor,hasBg=bg&&!/^rgba\(0, 0, 0, 0\)$|^transparent$/.test(bg),bi=cs.backgroundImage!=='none',bd=parseFloat(cs.borderTopWidth)||parseFloat(cs.borderLeftWidth)||parseFloat(cs.borderBottomWidth)||parseFloat(cs.borderRightWidth);
    if(!hasBg&&!bi&&!bd&&cs.boxShadow==='none')return;
    const r=el.getBoundingClientRect();if(r.width<6||r.height<6||shards.length>380)return;
    hide.push(vxInline(el));el.style.cssText+=';background:transparent!important;border-color:transparent!important;box-shadow:none!important';
    const host=el.offsetParent||document.body,hr=host.getBoundingClientRect(),cols=Math.min(5,Math.ceil(r.width/120)),rows=Math.min(5,Math.ceil(r.height/120)),cw=r.width/cols,ch=r.height/rows;
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const d=document.createElement('i');d.className='vsh vsh2';const x=r.left+i*cw,y=r.top+j*ch;
      d.style.cssText=`left:${(x-hr.left-host.clientLeft+host.scrollLeft).toFixed(1)}px;top:${(y-hr.top-host.clientTop+host.scrollTop).toFixed(1)}px;width:${(cw+.5).toFixed(1)}px;height:${(ch+.5).toFixed(1)}px;background:${hasBg?bg:'var(--plat)'}`;
      host.appendChild(d);shards.push(d);out.push({el:d,attr:null,x:x+cw/2,y:y+ch/2})}
  };
  const shard=(host,r,cols,rows,paper)=>{
    const hr=host.getBoundingClientRect(),cw=r.width/cols,ch=r.height/rows;
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const d=document.createElement('i');d.className='vsh';
      const x=r.left+i*cw,y=r.top+j*ch;d.style.cssText=`left:${(x-hr.left).toFixed(1)}px;top:${(y-hr.top).toFixed(1)}px;width:${(cw+.5).toFixed(1)}px;height:${(ch+.5).toFixed(1)}px;background:var(--${paper&&paper(x+cw/2,y+ch/2)?'paper':'plat'})`;
      host.appendChild(d);shards.push(d);out.push({el:d,attr:null,x:x+cw/2,y:y+ch/2})}
  };
  wins.forEach(w=>{const wr=w.getBoundingClientRect(),bw=$('.wbw',w),br=bw?bw.getBoundingClientRect():null;
    shard(w,wr,4,3,(x,y)=>br&&x>br.left&&x<br.right&&y>br.top&&y<br.bottom);
    [...$('.wf',w).children].forEach(k=>leaf(k,wr))});
  const bar=$('#mbar');shard(bar,bar.getBoundingClientRect(),8,1);[...bar.querySelectorAll('.mb-l>*,.mb-r>*')].forEach(k=>leaf(k));
  const st=$('#strip');if(st.getBoundingClientRect().width>0){const sin=$('.sin',st);paint(st);paint(sin);[...sin.children].forEach(k=>leaf(k))}
  $$('#icons .icon,.unrd').forEach(i=>leaf(i));
  $$('#seeds .pl,#glows .pl').forEach(i=>leaf(i));
  return {pieces:out,hide,shards};
}
/* where a piece is at time t: it waits, shivers, then is pulled round and into the middle */
function vxPlace(pc,C,t,fx){
  const r0=Math.hypot(pc.x-C.x,pc.y-C.y),a0=Math.atan2(pc.y-C.y,pc.x-C.x);
  if(!pc.d){pc.d=fx.d+Math.min(1000,r0*.9)+Math.random()*750;pc.D=1900+Math.random()*1500;pc.sg=Math.random()<.1?-1:1;pc.rj=Math.random()*360;pc.tw=(Math.random()-.5)*14}
  let dx=0,dy=0,rot=0,sc=1;
  if(t<pc.d){const rip=t>pc.d-320,m=rip?7:(t>200?2:0);dx=((Math.random()*2-1)*m);dy=((Math.random()*2-1)*m);rot=rip?pc.tw*(Math.random()<.5?1:0):0}
  else{const p=Math.min(1,(t-pc.d)/pc.D),q=Math.pow(p,1.35),R=r0*(1-q),th=pc.sg*q*(2.2*Math.PI+r0/260),px=C.x+R*Math.cos(a0+th),py=C.y+R*Math.sin(a0+th);
    dx=px-pc.x;dy=py-pc.y;rot=q*(540+pc.rj*.5)+pc.tw;sc=Math.max(.02,1-q*q*.98)}
  pc.el.style.transform=`translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${sc.toFixed(3)})`;
  if(t>=pc.d+pc.D)pc.el.style.visibility='hidden';
}
async function unrTryAgain(){
  if(crash.go||!crash.on||gameOn())return;
  crash.go=true;TK.discover('crash-retry',{},'crash_retry');clearInterval(unr.t);unr.t=0;
  const lock=document.createElement('div');lock.id='vxlock';document.body.appendChild(lock);
  /* let a hop onto the dialog, a Trash rummage or a feed finish before the mascot is taken over */
  try{await crash.hop}catch(_){}
  while(diving||bin.run)await wait(100);
  diving=true;stopDance();hideBub();
  const mascot=!buddy.hidden,bSave=buddy.getAttribute('style'),dr=desk.getBoundingClientRect(),dbg=desk.style.background,bbg=document.body.style.background,wallOp=$('#wall').style.opacity;
  let col=null,hole=null,black=null,flash=null,word=null;
  try{
    if(mascot){
      const br=buddy.getBoundingClientRect();perch=null;buddy.classList.remove('falling');buddy.style.right='auto';buddy.style.bottom='auto';buddy.style.zIndex='8600';   /* the Mac icon draws over every window (they stack from 20 up; the crash dialog is 8500) */
      buddy.style.left=Math.round(br.left-dr.left)+'px';buddy.style.top=Math.round(br.top-dr.top)+'px';
      /* he pops into the old dead-Mac icon at once */
      BS.pens=0;Object.assign(BS,RESET,{pose:'mac:0',air:1,flip:0});bRender();   /* frame 0 of mascot/anim_mac.js is the old Mac icon, pixel for pixel */
    }
    if(!reduce){
      await wait(1000);
      closeWin('crash');
      if(mascot){
        /* and drops to the bottom of the screen, tumbling onto his side: hand-drawn tilts (mascot/anim_mac.js: 0 upright, 1 ~18, 2 ~45, 3 ~72 degrees, 4 on its side), picked by how far it has turned, no CSS rotation.
           The lying Mac sits 3 art rows higher in its cell than an upright one, so it lands that much lower. It lands and cracks on the first contact, with no rebound. */
        const bh=buddy.offsetHeight,sc=bcv.offsetWidth/CELL_W,top0=parseFloat(buddy.style.top),land=dr.height-8-(CELL_H-14.5)*sc+3*sc;   /* the Mac's feet row (57 of 64) lands where the old 32x48 formula put its row 41 */let vy=0,top=top0,last=performance.now(),rot=0,fi=-1;
        const macPose=i=>{if(i===fi)return;fi=i;Object.assign(BS,{pose:'mac:'+i,air:1,flip:0});bRender()};
        await new Promise(res=>{const f=t=>{const dt=Math.min(.04,(t-last)/1000)||.016;last=t;vy+=3800*dt;top+=vy*dt;rot=Math.min(90,rot+dt*260);
          if(top>=land){top=land;buddy.style.top=Math.round(top)+'px';macPose(4);res();return}
          buddy.style.top=Math.round(top)+'px';macPose(rot<9?0:rot<32?1:rot<58?2:rot<81?3:4);requestAnimationFrame(f)};requestAnimationFrame(f)});
        /* the thud, then it cracks and smokes */
        await wait(150);
        for(const [i,ms] of [[5,150],[6,200],[7,250]]){macPose(i);await wait(ms)}
      }
      /* the vortex */
      $('#desk').style.transform='';$('#mbar').style.transform='';
      col=vxCollect();document.body.classList.add('vx');
      hole=document.createElement('div');hole.id='bhole';hole.innerHTML='<div class="bh-t"></div><div class="bh-b"></div>';document.body.appendChild(hole);
      const C={x:innerWidth/2,y:innerHeight/2},T=5200,t0=performance.now(),bp=mascot?(()=>{const r=buddy.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,d:3500,D:1500,sg:1,rj:200,tw:0}})():null;
      const mac=bp&&{el:buddy,...bp};
      await new Promise(res=>{
        const f=now=>{const t=now-t0,k=Math.min(1,t/T);
          const gw=Math.round(lerp(110,280,Math.min(1,t/3800))),gh=Math.round(gw*.76),m=((t/90)|0)%2?1:0;
          hole.style.cssText=`width:${gw}px;height:${gh}px;left:${C.x-gw/2+(t<500?m*2:0)}px;top:${C.y-gh/2}px;opacity:${t<350?(((t/70)|0)%2?1:.4):1}`;
          for(const pc of col.pieces)vxPlace(pc,C,t,{d:0});
          if(mac){mac.dd=mac.d;const p=Math.max(0,Math.min(1,(t-mac.d)/mac.D)),q=Math.pow(p,1.35),r0=Math.hypot(mac.x-C.x,mac.y-C.y),a0=Math.atan2(mac.y-C.y,mac.x-C.x),R=r0*(1-q),th=q*(2.2*Math.PI+r0/260);
            buddy.style.transform=`translate(${(C.x+R*Math.cos(a0+th)-mac.x).toFixed(1)}px,${(C.y+R*Math.sin(a0+th)-mac.y).toFixed(1)}px) rotate(${Math.round(q*8)*90}deg) scale(${Math.max(.02,1-q*q*.98).toFixed(3)})`;if(p>=1)buddy.style.visibility='hidden'}
          const dk=Math.min(1,Math.max(0,(t-1200)/3800));desk.style.background=document.body.style.background=`rgb(0,${Math.round(128*(1-dk))},${Math.round(128*(1-dk))})`;$('#wall').style.opacity=String(1-dk);
          if(t<T)requestAnimationFrame(f);else res()};requestAnimationFrame(f)});
    }
    /* dark, then a flash of the mascot's skull */
    black=document.createElement('div');black.id='vxblack';document.body.appendChild(black);
    if(hole)hole.remove();
    await wait(reduce?300:600);
    if(!reduce){flash=document.createElement('div');flash.id='vxskull';flash.innerHTML=svg(ICON.skull,Math.max(6,Math.floor(Math.min(innerWidth,innerHeight)*.5/32)));document.body.appendChild(flash);await wait(420);flash.remove();flash=null;await wait(450)}
    /* then three words, a beat of 300 ms each (a short buzz with each on touch devices), before the system comes back */
    const buzz=matchMedia('(pointer:coarse)').matches&&navigator.vibrate;
    for(const w of ['I','design','experiences.']){word=document.createElement('div');word.id='vxword';word.textContent=w;document.body.appendChild(word);if(buzz)try{navigator.vibrate(18)}catch(_){}await wait(300);word.remove();word=null}
  }finally{
    /* put everything back exactly, behind the black, then reboot */
    if(col){document.body.classList.remove('vx');col.shards.forEach(d=>d.remove());
      [...col.pieces,...col.hide].forEach(o=>{if(!o.el.isConnected)return;if(o.attr===null||o.attr===undefined)o.el.removeAttribute('style');else o.el.setAttribute('style',o.attr)})}
    if(hole)hole.remove();if(flash)flash.remove();if(word)word.remove();
    desk.style.background=dbg;document.body.style.background=bbg;$('#wall').style.opacity=wallOp;
    if(bSave===null)buddy.removeAttribute('style');else buddy.setAttribute('style',bSave);
    BS.mac=0;BS.pens=0;Object.assign(BS,RESET);bRender();
    /* the dead Mac is left behind on the desktop as Wake Up; it is first seen when the reboot finishes */
    if(!gameOn())PSET(GAME_KEY,'on');addWakeIcon(true);
    unrReset();unlockSkull();
    crash.on=false;crash.go=false;
    restart();
    lock.remove();if(black)black.remove();
    diving=false;if(mascot){perch=null;dropBuddy()}
  }
}
/* the program is back in the Trash after the reboot */
function unrReset(){
  clearInterval(unr.t);unr.t=0;if(unr.el)unr.el.remove();unr.el=null;unr.on=false;
  $('[data-open="unreleased"]',WIN.trash.el).hidden=false;crumbleUnr();updTrashCount();
}
function unlockSkull(){TK.discover('skull',{},'crash_skull');PSET(SKULL_KEY,'1');syncSkull()}
const MASK_KEY='tos_mask';
function setMask(on,keep=true){
  if(on&&keep)TK.discover('mask');
  BS.mask=on?1:0;if(keep)PSET(MASK_KEY,on?'1':'0');bRender();syncSkull();gameLookSync();
}
/* the skull lives in the Trash once the system has crashed; worn, it sits on the mascot and is off the Trash shelf */
function syncSkull(){
  const got=PREF(SKULL_KEY,'')==='1',row=$('#cp-mask');
  if(row){row.hidden=!got;row.setAttribute('aria-checked',String(!!BS.mask))}
  if(!got)return;
  let it=$('#tr-skull');
  if(!it){
    it=document.createElement('button');it.id='tr-skull';it.type='button';it.className='item';it.style.width='112px';
    it.innerHTML=`<span class="cmp" aria-hidden="true">${svg(ICON.skull,2)}</span><span class="nm">Skull</span>`;$('.tr',WIN.trash.el).appendChild(it);
    let block=false;
    it.addEventListener('click',e=>{if(block)return;$$('.item',WIN.trash.el).forEach(x=>x.classList.toggle('sel',x===it))});
    it.addEventListener('pointerdown',e=>{
      if(e.button!==0)return;const sx=e.clientX,sy=e.clientY;let ghost=null,phone=false;it.setPointerCapture(e.pointerId);
      const mv=ev=>{if(!ghost){if(Math.hypot(ev.clientX-sx,ev.clientY-sy)<5)return;ghost=document.createElement('div');ghost.className='cghost';ghost.innerHTML=svg(ICON.skull,2);document.body.appendChild(ghost);if(isMobile()){phone=true;peekOn()}}
        ghost.style.left=(ev.clientX-32)+'px';ghost.style.top=(ev.clientY-32)+'px';buddy.classList.toggle('hot',mawReady()&&overBuddy(ev))};
      const up=ev=>{it.removeEventListener('pointermove',mv);it.removeEventListener('pointerup',up);it.removeEventListener('pointercancel',up);buddy.classList.remove('hot');
        if(!ghost)return;ghost.remove();block=true;setTimeout(()=>{block=false},80);if(phone)peekOff();
        if(mawReady()&&overBuddy(ev)){setMask(true);if(phone)closeWin('trash');if(!reduce){burstAt(ev.clientX,ev.clientY,10);play([[{f:'squash',happy:1},100],[{f:'stretch',hop:3,happy:1},140],[{f:'idle',hop:0,happy:1},400],[RESET,0]])}}};
      it.addEventListener('pointermove',mv);it.addEventListener('pointerup',up);it.addEventListener('pointercancel',up);
    });
  }
  it.hidden=!!BS.mask;updTrashCount();
}

/* ================= Wake Up: the crash leaves the dead Mac on the desktop; it opens the hidden game ================= */
const GAME_KEY='tos_wake',SEED_KEY='tos_wake_seed';   /* '' none, 'on' icon unlocked, 'done' finished. The engine keeps its own save in tos_game */
const gameState=()=>PREF(GAME_KEY,'');
function gameOn(){return gameState()!==''}
/* once the game is unlocked the Unreleased program is left crumbled in the Trash: no opening it, no dragging it out */
function crumbleUnr(){if(!gameOn())return;const it=$('[data-open="unreleased"]',WIN.trash.el);it.classList.add('crumbled');it.disabled=true;it.classList.remove('sel')}
ICON.wake=art(32,32,({R,P})=>{
  const X=6,Y=3,W=20,H=26,SX=X+3,SY=Y+3,st=(pat,ox,oy)=>pat.forEach((r,y)=>[...r].forEach((c,x)=>{if(c!=='.')P(ox+x,oy+y,c)}));
  R(X+1,Y,W-2,1,'k');R(X+1,Y+H-1,W-2,1,'k');R(X,Y+1,1,H-2,'k');R(X+W-1,Y+1,1,H-2,'k');
  R(X+1,Y+1,W-2,H-2,'r');R(X+W-2,Y+2,1,H-3,'R');R(X+2,Y+H-2,W-3,1,'R');R(X+1,Y+1,W-2,1,'p');R(X+1,Y+1,1,H-2,'p');
  R(SX,SY,14,12,'k');R(SX+1,SY+1,12,10,'w');
  st(['k.k','.k.','k.k'],SX+2,SY+3);st(['k.k','.k.','k.k'],SX+9,SY+3);st(['..kkkk..','.k....k.'],SX+3,SY+8);
  R(X+4,Y+H-7,W-8,1,'k');R(X+13,Y+H-4,W-16,1,'k')});
let wakeNew=false;
function addWakeIcon(fresh){
  let b=$('#ic-wake');
  if(!b){
    b=document.createElement('button');b.type='button';b.className='icon';b.id='ic-wake';
    b.innerHTML=`<span class="ic">${svg(ICON.wake,2)+svg(ICON.wake,2,{fill:'url(#ck)',cls:'selov'})}</span><span class="lb">Wake Up</span>`;
    $('#icons').insertBefore(b,$('#ic-trash'));
    b.addEventListener('click',()=>{selIcon(b);openGame(b)});
  }
  if(fresh)wakeNew=true;
  return b;
}
/* the first time it is seen (after the reboot): it glitches twice and sends out one ring */
function wakePulse(){
  const b=$('#ic-wake');if(!b||reduce)return;
  b.classList.remove('wk-new');void b.offsetWidth;b.classList.add('wk-new');setTimeout(()=>b.classList.remove('wk-new'),1700);
  setTimeout(()=>{const r=$('.ic',b).getBoundingClientRect();const w=document.createElement('i');w.className='pw';w.style.left=(r.left+r.width/2)+'px';w.style.top=(r.top+r.height/2)+'px';document.body.appendChild(w);setTimeout(()=>w.remove(),1000)},200);
}
function syncWake(){
  if(gameState()==='on'){addWakeIcon(false);if(gameLit()){gameWin(true);if(!trapped)trapNow()}}
  const s=PREF(SEED_KEY,'');if(s)showSprout(s==='2');
  crumbleUnr();syncWallCP();
}
/* the game window: un-closable, fixed size, minimizable, and black until the torch is lit. The engine loads on first open */
const GMW=288,GMH=216,QA=/[?&]qa\b/.test(location.search);
let game=null,gload=null,gdk=null,homeNew=false;
const gameSrc=()=>import('/game/engine.js');
/* the engine's own save (tos_game): a lit torch means a reload resumes in the light */
function gameLit(){try{const d=JSON.parse(localStorage.getItem('tos_game'));return !!(d&&d.lit)}catch(_){return false}}
function gameScale(){return isMobile()?1:Math.max(1,Math.min(3,Math.floor((desk.clientWidth-40)/GMW),Math.floor((desk.clientHeight-96)/GMH)))}
function gameFront(){const w=WIN.game;return !!(w&&w.open&&!w.min&&topId==='game')}
/* keys go to the game only while its window is in front and nothing else wants them (menu, alert, boot, saver, Simple view, its own buttons) */
function gameKeys(){if(!gameFront()||bootOn||ssOn||curMenu||!alertW.hidden||!sv.hidden)return false;const a=document.activeElement;return !(a&&a.closest&&a.closest('input,textarea,select,#w-game [data-act]'))}
function gameFit(el){
  const k=gameScale(),gm=$('#gm',el);el.style.width='';el.style.height='';
  if(isMobile()){gm.style.width=gm.style.height='';return k}
  gm.style.width=GMW*k+'px';gm.style.height=GMH*k+'px';
  el.style.left=Math.max(8,Math.round((desk.clientWidth-el.offsetWidth)/2))+'px';el.style.top=Math.max(16,Math.round((desk.clientHeight-el.offsetHeight)/2-16))+'px';
  return k;
}
function gameMount(el){
  if(game||gload)return;
  gload=gameSrc().then(m=>{gload=null;
    game=m.mount($('#gm',el),{dev:QA,keyTarget:window,isActive:gameKeys,onTorch:gameTorch,onEvent:gameEvent,onFx:(n,v)=>osFx.set(n,v),look:gameLook()});
    if(!WIN.game.open||WIN.game.min)game.pause();else if(PREF(BEG_KEY,'')==='1')begSoon()}).catch(err=>{gload=null;console.error(err)});
}
function gameWin(parked){
  if(!WIN.game){
    makeWin({id:'game',title:'Wake Up',x:40,y:32,w:GMW*3,noClose:true,noResize:true,minimizable:true,acc:INK,ink:'#FFFFFF',
      body:'<div class="gm" id="gm"></div>',
      onopen(el){gameFit(el);if(!gameLit())gameDark();gameMount(el)},
      onmin(){if(game)game.pause();osFx.suspend();if(PREF(MIN_KEY,'')===''){PSET(MIN_KEY,'1');PSET(BEG_KEY,'1');setTimeout(heyBub,reduce?0:380)}},
      onrestore(el){hideGBub();if(!game&&!gload){gameFit(el);gameMount(el)}else if(game){game.resume();if(PREF(BEG_KEY,'')==='1')begSoon()}osFx.resume()}});
    /* focus that lands on the window (a strip tab, a window closing) goes on to the game */
    WIN.game.el.addEventListener('focus',()=>{const r=$('.tg',WIN.game.el);if(r&&gameFront())r.focus({preventScroll:true})});
  }
  const w=WIN.game;
  /* after a reload with the torch lit, the window is back in the strip, minimized; the game loads when it is restored */
  if(parked&&!w.open){w.open=true;w.min=true;w.el.hidden=true;order.push('game');renderStrip();updInd()}
  return w;
}
function openGame(src){
  if(gameState()==='done'||suckGo)return;
  /* the first launch: the OS mascot is pulled into the icon first, then the window opens black */
  if(!trapped&&!buddy.hidden){suckGo=true;suckIn(src).then(()=>{suckGo=false;openGame(src)});return}
  if(!trapped)trapNow();
  TK.trackOnce('game_wake');gameWin();openWin('game',src);
}
/* ---- the trapped mascot: tos_wake_in keeps him out of the OS (reload, minimize, every OS event) until finishGame's "Home." ---- */
const TRAP_KEY='tos_wake_in',MIN_KEY='tos_wake_min',BEG_KEY='tos_wake_beg';   /* BEG_KEY: '1' owed after the first minimize, '2' said */
let suckGo=false,suckMs=1000;
function trapNow(){trapped=true;PSET(TRAP_KEY,'1');stopDance();hideBub();perch=null;buddy.hidden=true;if(ssOn&&ssEl.classList.contains('nap'))ssStop()}
function untrap(){trapped=false;PSET(TRAP_KEY,'');buddy.hidden=store.get('buddyGone')==='1'}
/* the vortex idiom from unrTryAgain, small: he spirals into the Wake Up icon (or the window's centre) and shrinks away */
async function suckIn(src){
  PSET(TRAP_KEY,'1');   /* a reload mid-spiral keeps him in */
  for(let n=0;n<40&&(diving||bin.run||carry||bdrag||buddy.classList.contains('falling'));n++)await wait(100);
  if(reduce||buddy.hidden){trapNow();return}
  diving=true;stopDance();hideBub();perch=null;
  const bSave=buddy.getAttribute('style'),dr=desk.getBoundingClientRect(),br=buddy.getBoundingClientRect();
  buddy.classList.remove('falling','talk');buddy.style.right='auto';buddy.style.bottom='auto';buddy.style.zIndex='6';
  buddy.style.left=Math.round(br.left-dr.left)+'px';buddy.style.top=Math.round(br.top-dr.top)+'px';buddy.style.transformOrigin='50% 50%';
  const ic=src&&src.getBoundingClientRect?($('.ic',src)||src).getBoundingClientRect():null;
  const C=ic&&ic.width?{x:ic.left+ic.width/2,y:ic.top+ic.height/2}:{x:innerWidth/2,y:innerHeight/2},m={x:br.left+br.width/2,y:br.top+br.height/2};
  const r0=Math.hypot(m.x-C.x,m.y-C.y),a0=Math.atan2(m.y-C.y,m.x-C.x),T=suckMs;
  Object.assign(BS,RESET,{f:'stretch',face:'scared',sweat:1,air:1});bRender();
  try{
    /* a beat of resisting (pulled toward it, wobbling), then the spiral */
    await anim(T*.18,k=>{buddy.style.transform=`translate(${(Math.cos(a0+Math.PI)*-6*k).toFixed(1)}px,${(Math.sin(a0+Math.PI)*-6*k).toFixed(1)}px) rotate(${(Math.sin(k*28)*8).toFixed(1)}deg)`});
    /* drawn in along the line to it, whirling round it in a tightening loop, spinning and shrinking (kept on screen) */
    const ro=Math.min(90,r0*.3),cl=(v,a,b)=>Math.max(a,Math.min(b,v));
    await anim(T*.82,k=>{const q=Math.pow(k,1.25),bx=C.x+(m.x-C.x)*Math.pow(1-q,1.3),by=C.y+(m.y-C.y)*Math.pow(1-q,1.3),rr=ro*Math.sin(Math.PI*Math.min(1,q*1.15)),ph=a0+q*3*Math.PI;
      const px=cl(bx+rr*Math.cos(ph),16,innerWidth-16),py=cl(by+rr*Math.sin(ph),40,innerHeight-16);
      buddy.style.transform=`translate(${(px-m.x).toFixed(1)}px,${(py-m.y).toFixed(1)}px) rotate(${(q*720).toFixed(1)}deg) scale(${Math.max(.02,1-q*q*.98).toFixed(3)})`});
    if(src&&src.classList&&!reduce){src.classList.remove('press');void src.offsetWidth;src.classList.add('press');setTimeout(()=>src.classList.remove('press'),400)}
  }finally{
    if(bSave===null)buddy.removeAttribute('style');else buddy.setAttribute('style',bSave);
    Object.assign(BS,RESET);bRender();diving=false;trapNow();
  }
}
/* his look (hat, skull mask) follows him into the game */
const gameLook=()=>({hat:BS.hat||'none',mask:BS.mask?1:0});
function gameLookSync(){if(game&&game.setLook)game.setLook(gameLook())}
/* the first minimize: a "hey!" from the strip tab (on phones, where the strip is hidden, from the Wake Up icon); said once */
const gbub=document.createElement('div');gbub.id='gbub';gbub.setAttribute('role','status');gbub.innerHTML='<span class="bg"></span><span class="bt"></span>';document.body.appendChild(gbub);let gbT=0;
function hideGBub(){clearTimeout(gbT);gbub.className=''}
function heyBub(){
  const vis=e=>e&&e.getBoundingClientRect().width>0,a=[$('.stab[data-id="game"]'),$('#ic-wake .ic')].find(vis);if(!a)return;
  const r=a.getBoundingClientRect(),t='hey!';$('.bg',gbub).textContent=t;$('.bt',gbub).textContent=reduce?t:'';gbub.className='on';
  const w=gbub.offsetWidth,mid=r.left+r.width/2;let dx=0;if(mid-w/2<8)dx=8-(mid-w/2);if(mid+w/2>innerWidth-8)dx=innerWidth-8-(mid+w/2);
  gbub.style.left=Math.round(mid)+'px';gbub.style.top=Math.round(r.top+4)+'px';gbub.style.setProperty('--bx',Math.round(dx)+'px');
  if(!reduce){let i=0;const ty=setInterval(()=>{i++;$('.bt',gbub).textContent=t.slice(0,i);if(i>=t.length)clearInterval(ty)},45)}
  clearTimeout(gbT);gbT=setTimeout(hideGBub,2500);
}
addEventListener('pointerdown',()=>{if(gbub.className)hideGBub()},true);
/* the first restore after that: he begs, inside the game (only when lit and past the intro; the engine says whether it could) */
let begT=0;
function begSoon(){clearTimeout(begT);begT=setTimeout(()=>{if(PREF(BEG_KEY,'')==='1'&&game&&game.say&&gameFront()&&game.say('You gotta help me escape',{pose:'beg'}))PSET(BEG_KEY,'2')},reduce?60:520)}
/* the dark: until the torch is lit the OS is covered (desktop and menu bar), the game window's chrome is black, and only the match shows */
function gameDark(){
  if(gdk)return;WIN.game.el.classList.add('gdark','gtop');
  gdk=[document.createElement('canvas'),document.createElement('canvas')];gdk.forEach(c=>c.setAttribute('aria-hidden','true'));
  gdk[0].className='gdk';desk.appendChild(gdk[0]);gdk[1].className='gdk gdk-mb';document.body.appendChild(gdk[1]);
}
/* the torch: the dark burns back from the game window in Bayer steps over a second, an ember edge leading */
function gameReveal(fade){
  const g=gdk,el=WIN.game&&WIN.game.el;gdk=null;if(!g)return;
  if(el)el.classList.remove('gdark');
  const end=()=>{g.forEach(c=>c.remove());if(el)el.classList.remove('gtop')};
  if(!fade||reduce||!el){end();return}
  const r=el.getBoundingClientRect(),ox=r.left+r.width/2,oy=r.top+r.height/2,D=Math.hypot(Math.max(ox,innerWidth-ox),Math.max(oy,innerHeight-oy)),B=.24;
  const cs=g.map(c=>{const b=c.getBoundingClientRect(),w=Math.max(1,Math.ceil(b.width/2)),h=Math.max(1,Math.ceil(b.height/2));c.width=w;c.height=h;c.style.background='none';
    const x=c.getContext('2d'),im=x.createImageData(w,h);return {x,im,u:new Uint32Array(im.data.buffer),w,h,l:b.left,t:b.top}});
  const t0=performance.now();
  const f=t=>{const k=Math.min(1,(t-t0)/1000),fr=(1-(1-k)*(1-k))*(1+B);
    for(const c of cs){const{u,w,h}=c;for(let y=0;y<h;y++){const dy=c.t+y*2+1-oy;for(let x=0;x<w;x++){const v=(Math.hypot(c.l+x*2+1-ox,dy)/D-fr+B)/B*16,th=B4[(y&3)*4+(x&3)]+.5;u[y*w+x]=v>th?(v-th<2.5&&v<16?0xFF08142A:0xFF000000):0}}c.x.putImageData(c.im,0,0)}
    if(k<1)requestAnimationFrame(f);else end()};
  requestAnimationFrame(f);
}
function gameTorch(i){gameReveal(!i.restored);if(!i.restored&&!i.warp)TK.trackOnce('game_torch')}
function gameEvent(n,d={}){
  if(n==='torch')TK.trackOnce('game_torch');
  else if(n==='item')TK.trackOnce('game_item_'+d.name);
  else if(n==='piece')TK.trackOnce('game_piece_'+d.biome);
  else if(n==='done')finishGame();
}

/* ================= Wake Up: the OS reacts to the game. The engine calls onFx(name, level 0..1); a new biome clears the last one's ================= */
const FX={moss:mossFx,seed:seedFx,shake:shakeFx,wet:wetFx,slosh:sloshFx,flood:floodFx,
  heat:v=>hazeFx('heat',v),shimmer:v=>hazeFx('shimmer',v),glow:v=>{glowFx(v);hazeFx('glow',v)},scorch:NOP,erase:NOP,crystal:NOP};
const fxLv={};let fxBio='';
const osFx={
  set(n,v){if(n==='biome'){if(v!==fxBio){osFx.clear();fxBio=v}return}if(!FX[n])return;v=+v||0;if(fxLv[n]===v)return;fxLv[n]=v;if(n==='seed'||!(WIN.game&&WIN.game.min))FX[n](v)},
  clear(){for(const n in fxLv)if(n!=='seed'){if(fxLv[n])FX[n](0);delete fxLv[n]}fxBio=''},
  suspend(){for(const n in fxLv)if(n!=='seed'&&fxLv[n])FX[n](0)},
  resume(){for(const n in fxLv)if(n!=='seed'&&fxLv[n])FX[n](fxLv[n])}
};
/* Roots: moss creeps up the desktop icons, on the icon's own pixels, bottom and edges first, spilling 1-2px past the outline,
   with tufts on top edges, highlight specks and strands hanging below. The engine's level (0.2 at the first torch .. 1) is
   remapped so even the first torch shows clearly; the interior stays mostly clear so every icon still reads */
const MOSS=['#0C2209','#173F11','#25601A','#3A8526','#62B13A','#A6E05C','#E4F79A'];
function mossFx(v){
  const e=v?.42+.58*Math.min(1,v):0,P=2,N=32+P*2;
  $$('#icons .icon').forEach((b,n)=>{
    const ic=$('.ic',b);let c=$('canvas.moss',ic);
    if(!v){if(c)c.remove();return}
    const rows=ICON[ic.dataset.ic||(b.id==='ic-wake'?'wake':'')];if(!rows)return;
    if(!c){c=document.createElement('canvas');c.className='moss';c.width=N;c.height=N;c.setAttribute('aria-hidden','true');ic.appendChild(c)}
    const x=c.getContext('2d');x.clearRect(0,0,N,N);
    const H=(i,j)=>{let h=Math.imul(i*31+n*977,374761393)+Math.imul(j+n,668265263)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296};
    const on=(i,j)=>i>=0&&j>=0&&i<32&&j<32&&rows[j][i]!=='.';
    let top=32,bot=0;for(let j=0;j<32;j++)for(let i=0;i<32;i++)if(on(i,j)){top=Math.min(top,j);bot=Math.max(bot,j)}
    const ht=Math.max(1,bot-top);
    const edge=(i,j)=>{for(let b=-2;b<=2;b++)for(let a=-2;a<=2;a++)if(Math.abs(a)+Math.abs(b)<=2&&!on(i+a,j+b))return true;return false};
    /* the mask (canvas coords): 1 moss on the icon, 2 moss spilling past it */
    const M=new Uint8Array(N*N),at=(i,j)=>i<0||j<0||i>=N||j>=N?0:M[j*N+i];
    for(let j=0;j<32;j++)for(let i=0;i<32;i++){if(!on(i,j))continue;
      const y=(bot-j)/ht,ed=edge(i,j),g=e*(ed?1.25:.56)-y*(ed?1:1.15)+(H(i,j)-.5)*.42;
      if(g>0&&H(j+40,i)<(ed?.97:.34+.22*e-y*.25))M[(j+P)*N+i+P]=1}
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){if(M[j*N+i]||on(i-P,j-P))continue;
      const nb=(at(i-1,j)===1)+(at(i+1,j)===1)+(at(i,j-1)===1)+(at(i,j+1)===1);
      if(nb&&H(i+3,j+11)<.3+.45*e)M[j*N+i]=2}
    const C=(i,j,k)=>{x.fillStyle=MOSS[k];x.fillRect(i,j,1,1)};
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){const m=at(i,j);if(!m)continue;const h=H(i+7,j+3),up=!at(i,j-1),dn=!at(i,j+1),up2=!at(i,j-2);
      let k=up?(h<.55?5:4):up2?4:h<.12?1:h<.7?2:3;
      if(dn)k=Math.min(k,1);if(!at(i-1,j)&&!up)k=Math.min(6,k+1);if(m===2)k=up?3:dn?0:1;
      C(i,j,k);
      /* tufts: little blades standing on top edges, a bright tip */
      if(up&&!on(i-P,j-P-1)&&H(i,j+29)<.3+.4*e){const L=1+(H(j,i+5)*(1+2*e)|0);for(let t=1;t<=L;t++)if(j-t>=0&&!at(i,j-t))C(i,j-t,t===L?(H(i,t)<.5?6:5):4)}
      /* strands hanging off the bottom */
      if(dn&&!on(i-P,j-P+1)&&H(i,j+9)<.25+.35*e){const L=1+(H(i,j+5)*(2+3*e)|0);for(let t=1;t<=L&&j+t<N;t++)C(i,j+t,t===L?3:0)}
      /* specks of light */
      if(!up&&!dn&&H(j+77,i)<.035+.05*e)C(i,j,6)}
  });
}
/* Roots: the root jump plants a seed on the Trash shelf; it sprouts while the Trash is open (now or later), and stays */
function showSprout(grown){const it=$('#tr-sprout',WIN.trash.el);it.hidden=false;updTrashCount();drawPlant($('canvas',it),grown?'sprout':'seed',grown?3:4,null,false)}
function growSprout(){
  if(PREF(SEED_KEY,'')!=='1')return;PSET(SEED_KEY,'2');const cv=$('#tr-sprout canvas',WIN.trash.el);
  if(reduce){drawPlant(cv,'sprout',3);return}
  let f=0;const t=setInterval(()=>{drawPlant(cv,'sprout',f);if(++f>3)clearInterval(t)},280);
}
WIN.trash.onshown=()=>setTimeout(growSprout,350);
function seedFx(v){if(!v||PREF(SEED_KEY,''))return;PSET(SEED_KEY,'1');showSprout(false);if(WIN.trash.open&&!WIN.trash.min)setTimeout(growSprout,500)}
/* Roots: the thorn chase trembles the desktop in short pulses and flickers the game's strip tab */
let shkT=0;
function shakeFx(v){
  clearInterval(shkT);shkT=0;const els=[$('#wall'),$('#icons'),$('#mbar'),buddy];els.forEach(e=>e.style.translate='');$('#strip').classList.remove('flk');
  if(!v||reduce)return;
  const p=Math.max(1,Math.round(v*3));let n=0;
  shkT=setInterval(()=>{n=(n+1)%14;const on=n<4,j=()=>Math.round((Math.random()*2-1)*p);els.forEach(e=>e.style.translate=on?j()+'px '+j()+'px':'');$('#strip').classList.toggle('flk',on&&!(n&1))},45);
}
/* ---- Flood and Molten. The game's tab (the strip tab; on phones, where the strip is hidden, the game window's back bar)
   holds water or heat behind its title; the desktop takes the tide or the heat haze on one canvas between the wallpaper
   and the icons; icons and the Trash react on their own pixels. FXL is what shows (all 0 while the game is minimized).
   Nothing here takes a pointer or covers an icon, a label or a window. Reduced motion: the same pictures, held still. ---- */
const FXL={wet:0,slosh:0,flood:0,heat:0,shimmer:0,glow:0};
const WTR={crest:'#8fd2ff',crestD:'#3f80b8',top:'#123e69',deep:'#0b2a4a',abyss:'#081d35',streak:'#2b6aa3',hi:'#d6f1ff',pale:'#bfe6ff'};   /* the game's water (game/floodart.js) */
const HOT={rust:'#7a3f22',emb:'#c8742e',embL:'#e3a15c',crest:'#ffb04a',pop:'#ffe7a8'};   /* Molten's embers and lava crest (game/moltenart.js, lavaart.js) */
const fxHash=(a,b)=>{let h=Math.imul(a|0,374761393)+Math.imul(b|0,668265263)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296};
/* the CSS tiles, drawn once in code at 1x and shown at 2x: a water crest (line, light, dither into the body) for the tab and
   for the Trash window (paler, under ink labels), and the heat: a dithered warm glow, dense at the bottom, and rising sparks */
let fxTl=0;
function fxTiles(){
  if(fxTl)return;fxTl=1;const r=document.documentElement.style;
  const mk=(w,h,f)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');f((i,j,col)=>{x.fillStyle=col;x.fillRect(i,j,1,1)});return `url(${c.toDataURL()})`};
  const wave=(P,body)=>mk(16,8,p=>{for(let i=0;i<16;i++){const s=Math.round(1.5+1.5*Math.sin(i/16*Math.PI*2));
    for(let j=s;j<8;j++){const d=j-s;p(i,j,d===0?P[0]:d===1?P[1]:d<4&&(i+j)&1?P[1]:body)}if(i===3||i===4)p(i,s,P[2])}});
  r.setProperty('--fxww',wave([WTR.crest,WTR.crestD,WTR.hi],WTR.top));r.setProperty('--fxwb',WTR.top);
  r.setProperty('--fxtw',wave([WTR.crestD,WTR.crest,'#FFFFFF'],WTR.pale));r.setProperty('--fxtb',WTR.pale);
  r.setProperty('--fxhg',mk(16,32,p=>{for(let j=0;j<32;j++)for(let i=0;i<16;i++){const v=j/31;if(v*v*.9>(B4[(j&3)*4+(i&3)]+.5)/16)p(i,j,v>.85?HOT.embL:v>.6?HOT.emb:HOT.rust)}}));
  r.setProperty('--fxht',mk(16,16,p=>{for(let k=0;k<4;k++){const i=(k*5+2)%16,j=(k*9+3)%16;p(i,j,HOT.crest);p(i,(j+1)%16,HOT.emb)}}));
}
/* the haze's strength: a faint floor while he is in Molten, rising with the geyser chase, flaring while a vent erupts */
function hazeLv(){const b=Math.max(FXL.heat?.35:0,FXL.shimmer?.35+.65*FXL.shimmer:0);return b?Math.min(1,b+(FXL.glow?.35:0)):0}
/* the tabs: water to slosh in (in the water or surfing), filled by the tide; or heat rising from the game tab's foot */
function tabSync(){
  const r=document.documentElement,w=Math.max(FXL.slosh?.5:0,FXL.flood?.4+.4*FXL.flood:0),hz=hazeLv(),h=hz&&!w?.3+.45*hz:0;
  if(w||h)fxTiles();
  r.classList.toggle('fxw',w>0);r.style.setProperty('--fxw',w.toFixed(2));
  r.classList.toggle('fxh',h>0);r.style.setProperty('--fxh',h.toFixed(2));r.classList.toggle('fxg',!!(h&&FXL.glow));
}
/* the engine says 0 the moment his feet clear the line, so the water lingers a beat before it drains; a clear or a
   minimize (osFx still holds the level when it calls with 0) drains it at once */
let slT=0;
function sloshFx(v){clearTimeout(slT);if(v||fxLv.slosh){FXL.slosh=v?1:0;tabSync();return}slT=setTimeout(()=>{FXL.slosh=0;tabSync()},600)}
/* Flood: the eel's tide fills the desktop from the bottom (behind the icons, which float once it is over them) and the tab */
function floodFx(v){if(!v&&fxLv.flood)tideH=0;   /* cleared or minimized: gone at once (the chase ending drains it) */
  FXL.flood=v;tabSync();deskFx();tideFloat(reduce?tideTo():tideH);
}
/* the icons the tide's surface is over float (re-checked as it rises or drains past them) */
let flH=-1;
function tideFloat(h){if(Math.abs(h-flH)<6&&h)return;flH=h;const lim=desk.getBoundingClientRect().bottom-h;
  $$('#icons .icon').forEach(b=>{const q=b.getBoundingClientRect();b.classList.toggle('fl',h>0&&!isMobile()&&q.height>0&&q.top+q.height*.45>lim)})}
const tideTo=()=>FXL.flood>0?Math.round(desk.clientHeight*(.12+.5*FXL.flood)):0;
/* Molten: the heat haze (heat, shimmer and glow all feed it) */
function hazeFx(n,v){FXL[n]=v;tabSync();deskFx()}
/* the desktop canvas: tide and haze, 12 frames a second while either shows; none on phones, where windows cover the desktop */
let fxC=null,fxRaf=0,fxT0=0,fxLast=0,tideH=0,hzImg=null;
function deskFx(){
  const on=FXL.flood>0||hazeLv()>0||tideH>=1;
  if(!on||isMobile()){if(fxC){fxC.remove();fxC=null}cancelAnimationFrame(fxRaf);fxRaf=0;tideH=0;return}
  if(!fxC){fxC=document.createElement('canvas');fxC.className='fxd';fxC.setAttribute('aria-hidden','true');wall.after(fxC)}
  if(reduce){deskDraw(0);return}
  if(!fxRaf){fxT0=performance.now();fxRaf=requestAnimationFrame(deskTick)}
}
function deskTick(t){fxRaf=0;if(!fxC)return;if(isMobile()){deskFx();return}if(t-fxLast>=80){fxLast=t;if(!deskDraw((t-fxT0)/1000))return}fxRaf=requestAnimationFrame(deskTick)}
function deskDraw(t){
  const W=desk.clientWidth,Hd=desk.clientHeight,hz=hazeLv(),to=tideTo();
  const d=to-tideH;tideH=reduce||Math.abs(d)<3?to:tideH+(d<0?Math.min(-3,Math.max(-10,d*.1)):Math.max(1,Math.min(6,d*.1)));   /* the tide comes in slowly, drains faster */
  const bh=hz?Math.round(Hd*(.16+.44*hz)):0,H=Math.max(tideH>=1?Math.ceil(tideH)+8:0,bh);
  if(!H||!W){if(fxC){fxC.remove();fxC=null}tideH=0;tideFloat(0);return false}
  if(fxC.width!==W||fxC.height!==H){fxC.width=W;fxC.height=H;fxC.style.width=W+'px';fxC.style.height=H+'px'}
  const x=fxC.getContext('2d');x.clearRect(0,0,W,H);
  if(bh)hazeDraw(x,W,H,Hd,bh,hz,t);
  if(tideH>=1)tideDraw(x,W,H,tideH,t);
  tideFloat(tideH>=1?tideH:0);
  return true;
}
/* the tide: a stepped surface of two travelling waves in 2px pixels, the crest line, a dithered band, the body darkening with depth */
let tidePat=null;
function tideDraw(x,W,H,h,t){
  const top=H-h,n=Math.ceil(W/2)+1,sy=new Int16Array(n);
  for(let i=0;i<n;i++)sy[i]=Math.round((top+(reduce?0:2.5*Math.sin(i*.09+t*2.4)+1.5*Math.sin(i*.031-t*1.3)))/2)*2;
  const fill=(off,st)=>{x.fillStyle=st;x.beginPath();x.moveTo(0,H);for(let i=0;i<n;i++){x.lineTo(i*2,sy[i]+off);x.lineTo(i*2+2,sy[i]+off)}x.lineTo(W,H);x.closePath();x.fill()};
  if(!tidePat||tidePat.h!==H){const c=document.createElement('canvas');c.width=4;c.height=H;const g=c.getContext('2d');
    for(let j=0;j<H;j+=2)for(let i=0;i<4;i+=2){const v=j/H,th=(B4[((j>>1)&3)*4+((i>>1)&3)]+.5)/16;g.fillStyle=v>.66?(v-.66)*3>th?WTR.abyss:WTR.deep:v*1.5>th?WTR.deep:WTR.top;g.fillRect(i,j,2,2)}
    const k=document.createElement('canvas');k.width=k.height=4;const kg=k.getContext('2d');kg.fillStyle=WTR.crestD;kg.fillRect(0,0,4,4);kg.fillStyle=WTR.top;kg.fillRect(0,0,2,2);kg.fillRect(2,2,2,2);
    tidePat={h:H,body:x.createPattern(c,'repeat-x'),band:x.createPattern(k,'repeat')}}
  fill(0,WTR.crest);fill(2,tidePat.band);fill(6,tidePat.body);
  x.fillStyle=WTR.hi;const k=reduce?0:Math.floor(t*3);for(let i=0;i<n;i++)if(fxHash(i,k)<.03)x.fillRect(i*2,sy[i],2,2);
  /* streaks drifting in the body */
  x.fillStyle=WTR.streak;for(let s=0;s<Math.round(W/90);s++){const yy=top+12+fxHash(s,7)*(h-20),xx=((fxHash(s,9)*W+(reduce?0:t*(10+fxHash(s,3)*14)))%(W+12))-6;if(yy<H-4)x.fillRect(Math.round(xx/2)*2,Math.round(yy/2)*2,6,2)}
}
/* the haze: the wallpaper's bottom rows wobble sideways (real refraction of what is there), a dithered warm glow rises from
   the bottom edge, and sparks drift up through it */
function hazeDraw(x,W,H,Hd,bh,hz,t){
  const y0=H-bh,A=reduce?0:1+2*hz;
  if(A&&wall.width===W&&wall.height===Hd)for(let y=0;y<bh;y+=2){const f=y/bh,dx=Math.round(A*Math.pow(f,.8)*Math.sin((Hd-bh+y)*.13+t*3.3+Math.sin(y*.037-t*1.1)*2));
    if(dx)x.drawImage(wall,0,Hd-bh+y,W,2,dx,y0+y,W,2)}
  const key=W+','+bh+','+Math.round(hz*8);
  if(!hzImg||hzImg.key!==key){const c=document.createElement('canvas');c.width=W;c.height=bh;const g=c.getContext('2d'),id=g.createImageData(W,bh),u=new Uint32Array(id.data.buffer);
    const col=[HOT.rust,HOT.emb,HOT.embL,HOT.crest].map(h=>{const n=parseInt(h.slice(1),16);return 0xFF000000|(n&0xFF)<<16|(n&0xFF00)|(n>>16)});
    for(let j=0;j<bh;j+=2){const f=Math.pow(j/bh,2.2),g=Math.sqrt(hz);for(let i=0;i<W;i+=2){   /* sqrt: the faint floor still reads */
      const v=g*f*(.7+.3*Math.sin(i*.011+Math.sin(i*.0037)*3)),th=(B4[((j>>1)&3)*4+((i>>1)&3)]+.5)/16;if(v*.9<=th)continue;
      const c=col[v>.85?3:v>.65?2:v>.4?1:0];for(let b=0;b<2&&j+b<bh;b++)for(let a=0;a<2&&i+a<W;a++)u[(j+b)*W+i+a]=c}}
    g.putImageData(id,0,0);hzImg={key,c}}
  x.drawImage(hzImg.c,0,y0);
  const N=Math.round((6+34*hz)*W/1200);
  for(let k=0;k<N;k++){const sp=14+22*fxHash(k,1),yy=bh-((t*sp+fxHash(k,2)*bh)%bh),f=yy/bh,xx=fxHash(k,3)*W+Math.sin(t*1.6+k)*5;
    if(fxHash(k,Math.floor(t*5))>f*1.8)continue;   /* thin out as they rise */
    x.fillStyle=f>.6?HOT.crest:f>.3?HOT.embL:HOT.emb;x.fillRect(Math.round(xx/2)*2,y0+Math.round(yy/2)*2,2,2)}
}
/* Molten: a vent erupts and the desktop icons glow warm orange: a ring round each icon's own silhouette, lit from below */
function glowFx(v){
  $$('#icons .icon').forEach(b=>{
    const ic=$('.ic',b);let c=$('canvas.glow',ic);
    if(!v){if(c)c.remove();return}
    const rows=ICON[ic.dataset.ic||(b.id==='ic-wake'?'wake':'')];if(!rows||c)return;
    c=document.createElement('canvas');c.className='glow';c.width=c.height=36;c.setAttribute('aria-hidden','true');ic.appendChild(c);
    const x=c.getContext('2d'),on=(i,j)=>i>=0&&j>=0&&i<32&&j<32&&rows[j][i]!=='.',C=(i,j,k)=>{x.fillStyle=k;x.fillRect(i+2,j+2,1,1)};
    let top=32,bot=0;for(let j=0;j<32;j++)for(let i=0;i<32;i++)if(on(i,j)){top=Math.min(top,j);bot=Math.max(bot,j)}
    for(let j=-2;j<34;j++)for(let i=-2;i<34;i++){
      if(on(i,j)){if(!on(i,j+1)&&j>(top+bot)/2)C(i,j,HOT.embL);continue}   /* rim light on his lower edges */
      const d1=on(i-1,j)||on(i+1,j)||on(i,j-1)||on(i,j+1),d2=!d1&&(on(i-2,j)||on(i+2,j)||on(i,j-2)||on(i,j+2)||on(i-1,j-1)||on(i+1,j-1)||on(i-1,j+1)||on(i+1,j+1));
      const lo=(j-top)/Math.max(1,bot-top);
      if(d1)C(i,j,lo>.5?HOT.crest:HOT.embL);else if(d2&&((i+j)&1))C(i,j,lo>.5?HOT.emb:HOT.rust)}
  });
}
/* Flood: the Trash fills with water. Its window: water from the items' middle down, the items bobbing at the surface; its
   desktop icon: water inside the can, drips down its sides and a puddle at its foot */
function wetFx(v){
  FXL.wet=v?1:0;if(v)fxTiles();WIN.trash.el.classList.toggle('wet',!!v);
  const ic=$('#ic-trash .ic');let c=ic&&$('canvas.wet',ic);
  if(!v){if(c)c.remove();return}
  if(!ic||c||!ICON.trash)return;
  c=document.createElement('canvas');c.className='wet';c.width=c.height=36;c.setAttribute('aria-hidden','true');ic.appendChild(c);
  const rows=ICON.trash,x=c.getContext('2d'),on=(i,j)=>i>=0&&j>=0&&i<32&&j<32&&rows[j][i]!=='.',C=(i,j,k)=>{x.fillStyle=k;x.fillRect(i+2,j+2,1,1)};
  for(let j=17;j<=28;j++)for(let i=0;i<32;i++){if(!on(i,j)||rows[j][i]==='k')continue;
    C(i,j,j===17?WTR.hi:j===18?WTR.crest:j<21&&(i+j)&1?WTR.crest:j<24?WTR.crestD:(i+j)&1&&j<26?WTR.crestD:WTR.streak)}
  for(let j=28;j<=33;j++)for(let i=-2;i<34;i++){const dx=(i+.5-16)/13,dy=(j+.5-30.5)/2.2;if(dx*dx+dy*dy>1||on(i,j))continue;
    C(i,j,j<=29?WTR.crest:(i+j)&1?WTR.crestD:WTR.streak)}
  [[6,16],[6,19],[25,15],[25,21],[25,22]].forEach(([i,j])=>{if(!on(i,j))C(i,j,WTR.crestD)});C(6,20,WTR.crest);C(25,23,WTR.crest);
}

/* ================= Wake Up: the ending. The window finally closes, the OS reboots home, the icon goes, the door's medallion is the wallpaper ================= */
function finishGame(){
  if(gameState()!=='on')return;
  TK.trackOnce('game_done');osFx.clear();
  if(game){game.destroy();game=null}
  gameReveal(false);
  PSET(GAME_KEY,'done');const ic=$('#ic-wake');if(ic)ic.remove();
  /* he is out: visible again (unless he was switched off) for homeLand's "Home." */
  untrap();PSET(MIN_KEY,'');PSET(BEG_KEY,'');hideGBub();
  if(WIN.game&&WIN.game.open){releaseWin('game');closeWin('game')}
  closeWin('readme');setWall('medallion',false);PSET('tos_wall','medallion');syncWallCP();
  homeNew=true;restart();
}
/* home: after the boot logo the mascot drifts down to the middle of the desktop and lands softly */
function homeLand(){
  if(buddy.hidden)return;
  perch=null;buddy.style.zIndex='';
  const dw=desk.clientWidth,dh=desk.clientHeight,bw=buddy.offsetWidth,bh=buddy.offsetHeight,y1=dh-8-bh,y0=-bh-20;
  buddy.style.left=Math.round((dw-bw)/2)+'px';
  const land=()=>{buddy.style.top=y1+'px';buddy.classList.remove('falling');BS.air=0;bRender();saveBuddy();
    play([[{f:'squash',happy:1},140],[{f:'stretch',hop:2,happy:1},160],[{f:'idle',hop:0,happy:1},900],[RESET,0]]);setTimeout(()=>speak('Home.',2600,true),reduce?0:450)};
  if(reduce){land();return}
  buddy.style.top=y0+'px';buddy.classList.add('falling');BS.air=1;bRender();
  anim(1500,k=>{buddy.style.top=Math.round(y0+(y1-y0)*(1-Math.pow(1-k,3)))+'px'}).then(land);
}
function syncWallCP(){const el=WIN.cpanel.el,md=$('[data-g="wall"][data-v="medallion"]',el);if(md)md.hidden=gameState()!=='done';$$('[data-g="wall"]',el).forEach(b=>b.setAttribute('aria-checked',String(b.dataset.v===WALLK)))}

if(buddy.style.left&&!buddy.hidden)setTimeout(()=>{if(!carry&&!perch)dropBuddy()},1700);

/* ================= first time each window or app opens: a line (always shown) ================= */
const WELCOME={
 readme:"Oh Hello!",work:"Seventeen projects. Take your pick.",about:"So that's who's behind all this.",career:"That's a lot of studios.",
 contacts:"Go on, say hello.",view:"Plainer, or older? Your call.",how:"Four ideas, each with proof.",worked:"Some familiar names in here.",trash:"The Trash? What's in there?",unreleased:"Uh oh. That thing looks haunted.",cpanel:"Ooh, my settings!",achv:"Look at all that poking.",
 pistol:"Pistol Whip! Shoot to the beat.",journey:"Asimov, in VR. Fancy.",flourish:"Flourish! Physio, but a game.",proximity:"Chatting with an AI, in VR. Neat.",
 horizon:"Little games for Meta's VR world.",marvel:"Marvel! On a Lenovo headset, no less.",form:"FORM. Puzzles with a surreal twist.",'petras-planet':"Petra's Planet. A world for kids to learn in.",
 'citizen-grim':"Citizen Grim. Wave after wave.",'whore-of-the-orient':"Shanghai, 1920s. Sadly cancelled.",'resident-evil-orc':"Resident Evil, but with a squad.",
 'star-wars-battlefront':"A Star Wars shooter that never launched.",'socom-fireteam-bravo-3':"Fireteam Bravo 3. Squad tactics.",'socom-confrontation':"Confrontation. SOCOM, online.",
 'socom-tactical-strike':"Tactical Strike. Strategy meets shooter.",bully:"Bully! A brawler at Rockstar.",'max-payne-2':"Max Payne 2. The first Rockstar job."
};
const welcomed=new Set();
function mascotWelcome(id){
  const line=WELCOME[id];if(!line||welcomed.has(id)||buddy.hidden||carry||bdrag)return;
  welcomed.add(id);
  const say=()=>setTimeout(()=>{if(buddy.hidden||carry)return;speak(line,2600,true);
    /* only the very first hello (the Read Me that opens at the start) gets a wave: one arm raised, bobbing between the up-right buckets, the other resting; with a party hat the left arm waves instead */
    if(id==='readme'){const left=BS.hat==='party',W=a=>left?[180-a,330]:[210,a];
      play([[{f:'stretch',hop:3,happy:1},110],...[0,30,0,30,0,30].map(a=>[{f:'idle',hop:0,happy:1,arms:W(a)},110]),[{arms:undefined},150],[RESET,0]])}
    else play([[{f:'stretch',hop:3,happy:1},110],[{f:'idle',hop:0},260],[RESET,0]])},350);
  /* the first time Work opens, the mascot hops up onto it first (when there is room) */
  if(id==='work')hopOnto(id).then(say);else say();
}


if(!reduce){
  /* a sweat drop that forms, swells, runs and drips (mascot/anim_fx.js) while a scared moment has BS.sw set */
  let swI=0;setInterval(()=>{if(!BS.sw||buddy.hidden)return;swI=(swI+1)%4;BS.fx=[fxAt('sweat',swI)];bRender()},150);
  /* idle: calm and subtle, he is on screen while people read. No breathing in and out; every IDLE_MS the outline just settles into the next of two close boil variants
     (about 4% of his pixels change, mascot/body.js). The nap keeps its own slow breathing. */
  const IDLE_MS=2200;
  setInterval(()=>{if(seq.length||buddy.hidden||buddy.classList.contains('falling')||buddy.classList.contains('carried'))return;if(BS.f==='breath')BS.f='idle';BS.bv=((BS.bv|0)+1)%2;bRender()},IDLE_MS);
  /* perched with his centre within 7 art px of a ledge end he leans out over it, a shoe hanging, and wobbles back (mascot/anim_ground.js 8, 9; flip:1 at the left end) */
  setInterval(()=>{if(!perch||seq.length||buddy.hidden||BS.sleep||BS.pose||BS.hold||BS.hat==='shades'||buddy.classList.contains('falling')||buddy.classList.contains('carried')||diving)return;
    const L=ledgeNow(perch);if(!L)return;const k=buddy.offsetWidth/CELL_W,fl=perch.dx<=7*k?1:L.w-perch.dx<=7*k?0:-1;if(fl<0)return;
    const o={pose:'ground:8',flip:fl,air:1,arms:[180,0]};play([[o,800],[{...o,pose:'ground:9'},900],[o,700],[RESET,0]])},3200);
  /* a blink is a lid coming down: half, shut, half, open (mascot/faces.js LIDS); skipped asleep and while an authored face is up */
  (function blink(){setTimeout(()=>{if(BS.sleep||window.MASCOT.FACES[BS.face]){blink();return}
    BS.lid=2;bRender();setTimeout(()=>{BS.lid=0;BS.blink=1;bRender();setTimeout(()=>{BS.blink=0;BS.lid=2;bRender();setTimeout(()=>{BS.lid=0;bRender();blink()},60)},60)},60)},2400+Math.random()*3000)})();
}
let mx=0,my=0,raf=0;
addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY;if(!raf)raf=requestAnimationFrame(look)});
function look(){raf=0;if(buddy.hidden)return;const r=bcv.getBoundingClientRect();const cx=r.left+r.width/2,cy=r.top+r.height*.55;
  const dx=mx-cx,dy=my-cy;let d=[0,0];
  if(Math.hypot(dx,dy)>28){const a=Math.round(Math.atan2(dy,dx)/(Math.PI/4));d=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]][(a+8)%8]}
  if(d[0]!==BS.dir[0]||d[1]!==BS.dir[1]){BS.dir=d;bRender()}}

/* ================= marks: logo cycling ================= */
let logoIdx=Math.floor(Math.random()*12);
const logoC=discMark($('#logodm'),18,1),rmC=discMark($('#rmdm'),64,1),abC=discMark($('#abdm'),64,1),gripC=discMark($('#gripdm'),18,1),bootC=discMark($('#bootm'),56,2);
/* at 14px the PNG marks fall below one pixel, so the small discs carry pixel renditions of the same twelve marks */
const PAT=[(x,y)=>x%3===1&&(y+(x>>2))%3===1,(x,y)=>(y+Math.round(Math.sin(x*.9)))%3===0,(x,y)=>(x+y)%4===0||(x-y+40)%4===0,(x,y,d)=>Math.round(d)%3===0,
 (x,y)=>(y+Math.abs(x%4-2))%4===0,(x,y)=>y%3===1,(x,y,d,a)=>Math.round(d)%3===0&&((a*4/Math.PI+8)|0)%2===0,(x,y)=>(x+y)%3===0,
 (x,y)=>(y+(((x%6)-3)**2>>2))%4===0,(x,y)=>y%2===0,(x,y)=>((x*7+y*13+x*y)%5)===0,(x,y)=>(x+Math.round(Math.sin(y*.9)))%3===0];
function patMark(c,idx,color='#FFF3E6'){const m=c.width,x=c.getContext('2d'),r=m/2-.5,f=PAT[(idx%12+12)%12];x.clearRect(0,0,m,m);x.fillStyle=color;x.beginPath();
  for(let j=0;j<m;j++)for(let i=0;i<m;i++){const dx=i+.5-m/2,dy=j+.5-m/2,d=Math.hypot(dx,dy);if(d<=r&&f(i,j,d,Math.atan2(dy,dx)))x.rect(i,j,1,1)}x.fill()}
function paintMarks(){[logoC,gripC].forEach(c=>endingDone&&c===logoC?starMark(c):patMark(c,logoIdx));[rmC,abC].forEach(c=>paintMark(c,logoIdx))}
function cycleLogo(){logoIdx=(logoIdx+1)%12;paintMarks();const l=$('#logo');if(!reduce){l.classList.add('spin');setTimeout(()=>l.classList.remove('spin'),90)}}

/* ================= menus ================= */
const menuEl=$('#menu');let curMenu=null;
const MENUS={
 seed:()=>[['About J Tyler McCulloch',()=>openWin('about',$('#logo'))],'-',['Read Me',()=>openWin('readme',$('#logo'))],['Contacts',()=>openWin('contacts',$('#logo'))],'-',['Control Panel',()=>openWin('cpanel',$('#logo'))],...(endingDone?[['Achievements',()=>openWin('achv',$('#logo'))]]:[]),'-',['View',()=>openWin('view',$('#logo'))],['Restart',restart]],
 file:()=>[['Read Me',()=>openWin('readme')],['Work',()=>openWin('work')],['Career',()=>openWin('career')],['How I Work',()=>openWin('how')],["Who I've Worked With",()=>openWin('worked')],'-',['Close Window',()=>topId&&closeWin(topId),'Esc',!topId||WIN[topId].keep]],
 view:()=>[['as Icons',()=>{setView('icons');openWin('work')},null,false,view==='icons'],['as List',()=>{setView('list');openWin('work')},null,false,view==='list'],'-',['Simple view',openSimple],['80s version',()=>set80(!v80on),null,false,v80on]],
 window:()=>order.length?order.map(id=>[WIN[id].title,()=>{if(WIN[id].min){restoreWin(id);return}shade(id,false);focusWin(id,{bump:true})},null,false,id===topId]):[['Read Me',()=>openWin('readme')]],
 special:()=>[['Clear Seeds',clearSeeds,null,seeds===0],['Preview 100 seeds',showAlert,'C'],['Preview 404',show404]]
};
function openMenu(btn,focusFirst){
  closeMenu(false);curMenu=btn;btn.setAttribute('aria-expanded','true');
  const items=MENUS[btn.dataset.menu]();
  menuEl.innerHTML='<div class="mi-in"></div>';const box=menuEl.firstChild;menuEl.setAttribute('aria-label',btn.textContent.trim()||'Seed menu');
  items.forEach(it=>{if(it==='-'){const s=document.createElement('div');s.className='msep';s.setAttribute('role','separator');box.appendChild(s);return}
    const [label,fn,key,dis,chk]=it;const b=document.createElement('button');b.className='mi';
    b.setAttribute('role',chk!==undefined?'menuitemradio':'menuitem');if(chk!==undefined)b.setAttribute('aria-checked',String(!!chk));
    b.innerHTML=`<span>${esc(label)}</span>${key?`<kbd>${key}</kbd>`:''}`;
    if(dis)b.setAttribute('aria-disabled','true');
    b.addEventListener('click',()=>{if(dis)return;closeMenu(false);fn()});box.appendChild(b)});
  const r=btn.getBoundingClientRect();menuEl.style.left=Math.round(Math.min(r.left,innerWidth-224))+'px';menuEl.style.top=Math.round(r.bottom)+'px';menuEl.hidden=false;
  if(focusFirst)$('.mi',menuEl).focus();
}
function closeMenu(refocus){if(!curMenu)return;curMenu.setAttribute('aria-expanded','false');menuEl.hidden=true;if(refocus)curMenu.focus();curMenu=null}
$$('#mbar [data-menu]').forEach(b=>{
  b.addEventListener('click',e=>{if(b.id==='logo')logoClick();if(curMenu===b)closeMenu(false);else openMenu(b,e.detail===0)});
  b.addEventListener('pointerenter',()=>{if(curMenu&&curMenu!==b)openMenu(b,false)});
  b.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();openMenu(b,true)}});
});
menuEl.addEventListener('keydown',e=>{
  const its=$$('.mi',menuEl),i=its.indexOf(document.activeElement);
  if(e.key==='ArrowDown'){e.preventDefault();its[(i+1)%its.length].focus()}
  else if(e.key==='ArrowUp'){e.preventDefault();its[(i-1+its.length)%its.length].focus()}
  else if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const bs=$$('#mbar [data-menu]').filter(x=>x.offsetParent);const j=bs.indexOf(curMenu);openMenu(bs[(j+(e.key==='ArrowRight'?1:-1)+bs.length)%bs.length],true)}
  else if(e.key==='Tab'){closeMenu(false)}
});
document.addEventListener('pointerdown',e=>{if(curMenu&&!menuEl.contains(e.target)&&!e.target.closest('#mbar [data-menu]')){closeMenu(false);skipPlant=e.target===desk}},true);

/* ================= alert ================= */
const alertW=$('#alertw');let alertRet=null;
const alC=$('#alc').getContext('2d');
let alertOk=null;function showAlert(txt,btn,ok){closeMenu(false);alertRet=document.activeElement;const at=$('#alt');if(typeof txt==='string')at.innerHTML=txt;else at.textContent='You planted 100 seeds.';$('#alok').textContent=typeof btn==='string'?btn:'OK';alertOk=typeof ok==='function'?ok:null;drawBuddy(alC,{f:'idle',blink:0,dir:[0,-1],happy:1,stage:4,hop:0});alertW.hidden=false;$('#alok').focus();BS.stage=4;play([[{f:'squash',happy:1},60],[{f:'stretch',hop:3},60],[{hop:6},90],[{f:'idle',hop:3},60],[{f:'squash',hop:0},60],[{f:'idle'},240],[{happy:0},0]])}
function hideAlert(){alertW.hidden=true;stage();const f=alertOk;alertOk=null;if(alertRet&&document.contains(alertRet))alertRet.focus({preventScroll:true});if(f)f()}
$('#alok').addEventListener('click',hideAlert);
alertW.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();$('#alok').focus()}if(e.key==='Enter'){e.preventDefault();hideAlert()}});

/* ================= keyboard ================= */
addEventListener('keydown',e=>{if(crash.go){e.stopImmediatePropagation();e.preventDefault()}},true);
/* with the game in front, a game key pressed while focus sits elsewhere (an icon, the menu bar) moves focus into the game first */
const GKEY=/^(Arrow(Left|Right|Up|Down)|Key[WASD]|Space)$/;
addEventListener('keydown',e=>{if(GKEY.test(e.code)&&gameKeys()&&!WIN.game.el.contains(document.activeElement)){const r=$('.tg',WIN.game.el);if(r)r.focus({preventScroll:true})}},true);
document.addEventListener('keydown',e=>{
  if(bootOn){finishBoot();return}
  if(e.key==='Escape'){
    if(!alertW.hidden){hideAlert();return}
    if(curMenu){closeMenu(true);return}
    if(topId){closeWin(topId);return}
  }
  if(!alertW.hidden||gameFront())return;
  if((e.key==='c'||e.key==='C')&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName))showAlert();
});

/* ================= name decode (once, ends legible) ================= */
const AZ='ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghkmnopqrstuvwxyz';
function decode(){
  const h=$('#name'),span=h.firstElementChild;
  if(reduce){span.textContent=NAME;return}
  span.innerHTML=[...NAME].map(c=>`<span class="ch">${c===' '?'&nbsp;':c}</span>`).join('');
  const chs=$$('.ch',span);chs.forEach(s=>{s.style.width=s.getBoundingClientRect().width+'px'});
  const t0=performance.now(),at=chs.map((_,i)=>140+i*48+Math.random()*60);
  (function step(t){let done=true;chs.forEach((s,i)=>{if(NAME[i]===' ')return;if(t-t0>=at[i]){s.textContent=NAME[i]}else{done=false;s.textContent=AZ[Math.floor(Math.random()*AZ.length)]}});
    if(!done)setTimeout(()=>requestAnimationFrame(step),45);else span.textContent=NAME})(t0);
}

/* ================= clock ================= */
function tick(){const d=new Date();let h=d.getHours(),m=d.getMinutes();const ap=h<12?'AM':'PM';h=h%12||12;$('#clock').textContent=`${h}:${String(m).padStart(2,'0')} ${ap}`}
tick();setInterval(tick,15000);

/* ================= touch: flagships resolve when mostly in view ================= */
if(!canHover&&'IntersectionObserver' in window){
  const io=new IntersectionObserver(es=>es.forEach(en=>reveal(en.target,en.intersectionRatio>.6)),{threshold:[0,.6,1]});
  $$('.card,.big .item').forEach(c=>io.observe(c));
}

/* ================= boot ================= */
const boot=$('#boot');let bootOn=false,bootTimers=[];
function startDesktop(fromBoot){
  if(wakeNew){wakeNew=false;wakePulse()}
  if(homeNew){homeNew=false;fitCards();homeLand();return}
  const r=fromBoot?$('#bootm').getBoundingClientRect():null;
  fitCards();
  /* on a phone, or where Read Me would fill the whole screen, the desktop shows first and Read Me waits for a tap */
  const rm=WIN.readme.el;let full=isMobile();
  if(!full&&!WIN.readme.open){rm.hidden=false;full=rm.offsetWidth>=desk.clientWidth-40||rm.offsetHeight>=desk.clientHeight-40;rm.hidden=true}
  if(full&&!WIN.readme.open)return;
  /* Read Me opens as if its desktop icon had just been clicked: the icon is selected and dips, and the window zooms out of it */
  const ric=$('#ic-readme');
  if(WIN.readme.open)focusWin('readme',{bump:true});
  else if(ric){selIcon(ric);if(!reduce){ric.classList.remove('press');void ric.offsetWidth;ric.classList.add('press');setTimeout(()=>ric.classList.remove('press'),400)}TK.quiet(()=>openWin('readme',ric))}
  else TK.quiet(()=>openWin('readme',r));
  (document.fonts?document.fonts.ready:Promise.resolve()).then(()=>setTimeout(decode,reduce?0:200));
}
function finishBoot(){
  if(!bootOn)return;bootOn=false;bootTimers.forEach(clearTimeout);bootTimers=[];
  startDesktop(true);routeHash();boot.classList.add('done');setTimeout(()=>{boot.hidden=true;boot.classList.remove('done','go')},60);
}
function runBoot(){
  if(reduce){boot.hidden=true;startDesktop(false);routeHash();return}
  boot.hidden=false;boot.classList.remove('done','go');void boot.offsetWidth;boot.classList.add('go');bootOn=true;
  let k=logoIdx;paintMark(bootC,k,'#FFF3E6');
  const cyc=()=>{if(!bootOn)return;k=(k+1)%12;paintMark(bootC,k,'#FFF3E6');bootTimers.push(setTimeout(cyc,110))};bootTimers.push(setTimeout(cyc,110));
  bootTimers.push(setTimeout(finishBoot,1250));
}
boot.addEventListener('pointerdown',finishBoot);
function restart(){for(const k in WIN)if(WIN[k].open&&k!=='readme')closeWin(k);runBoot()}

let rzT=0;
addEventListener('resize',()=>{for(const k in WIN)if(WIN[k].open&&!WIN[k].min)clampWin(WIN[k].el);fitCards();if(fxC||FXL.flood||FXL.heat)deskFx()});
let wsz='';new ResizeObserver(()=>{const k=desk.clientWidth+'x'+desk.clientHeight;if(k===wsz)return;wsz=k;clearTimeout(rzT);rzT=setTimeout(buildWall,wall.width?120:0)}).observe(desk);

paintMarks();stage();renderStrip();updInd();BS.mask=PREF(MASK_KEY,'0')==='1'?1:0;bRender();syncSkull();syncWake();runBoot();
if(/[?&]qa\b/.test(location.search))window.__b={setHat,setWall,ssStart,ssStop,makeHeap,sowHeap,dance,wither,get compost(){return compost},get bin(){return bin},get unr(){return unr},setMask,syncSkull,vxCollect,get crash(){return crash},unrOut,unrIn,unrOpen,unrTryAgain,binFeed,mawEat,get BS(){return BS},toCompost,trashDive,sproutFate,set80,show404,get v80on(){return v80on},plant,plants,sprout,bloom,eat,crumble,bubbleP:v=>{BUBBLE_P=v},get perch(){return perch},ditherIn,clearDither,get bubbles(){return speakN},dropBuddy,hopOnto,logoClick,discoveryClick,get logoN(){return logoN},get ST(){return ST},get endingDone(){return endingDone},plant:plant,showAlert,openWin,closeWin,setView,get carry(){return carry},get seeds(){return seeds},get top(){return topId},
  /* Wake Up: unlock the icon without the crash, let the game window be closed, or forget the unlock (reload after) */
  wake(){if(unr.on)unrReset();if(WIN.crash.open)closeWin('crash');if(PREF(GAME_KEY,'')==='')PSET(GAME_KEY,'on');addWakeIcon(true);crumbleUnr();wakeNew=false;wakePulse()},
  releaseGame:()=>releaseWin('game'),unwake:()=>{PSET(GAME_KEY,'');PSET(SEED_KEY,'');PSET(TRAP_KEY,'');PSET(MIN_KEY,'');PSET(BEG_KEY,'')},openGame,
  untrap(){untrap();syncMascotCP();if(!buddy.hidden){clampBuddy();dropBuddy()}},get trapped(){return trapped},set suckMs(v){suckMs=v},heyBub,
  begNow(){PSET(BEG_KEY,'1');begSoon()},finishGame,osFx,gameReveal,get gdk(){return gdk},minimizeWin,restoreWin,releaseWin,restart,get WIN(){return WIN},get game(){return game}};
/* the site's old anchors still work: index.html#work, #about, #experience, #contact, and #<project-slug> open the matching window */
const HASHWIN={work:'work',about:'about',experience:'career',career:'career',contact:'contacts',contacts:'contacts',approach:'how',skills:'how',how:'how',companies:'worked',unreleased:'trash',press:'view',view:'view'};
function openHash(h){const id=HASHWIN[h]||SLUGID[h];if(id&&(WIN[id]||PB[id]))openWin(id)}
function routeHash(){const h=decodeURIComponent(location.hash.slice(1));if(h){viaNext='hash';try{openHash(h)}finally{viaNext=null}}}
addEventListener('hashchange',routeHash);

/* the desktop is up: this is what the 4 s guard in index.html waits for (it also brings the desktop back if the load was only slow) */
window.__osBoot=1;document.documentElement.classList.add('os');
})();

