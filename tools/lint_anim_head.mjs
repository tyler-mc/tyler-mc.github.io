#!/usr/bin/env node
/* Lint for the things on the head: the growing leaf (mascot/leaf.js LEAF) and the hats and face gear (mascot/hats.js HATS, GEAR). Run: node tools/lint_anim_head.mjs
   tools/test_mascot.mjs calls lint() (an array of problems; empty = green). Checks:
   1. LEAF.stem: integer [x,y] pairs relative to the head tip, one 8-connected chain, all above the tip.
   2. LEAF.stages[0..4]: equal-length rows of `.nThwBoHYrkp`, one 8-connected blob, no orphan pixel, teal blade (T) and dark edge (h); bounding area grows strictly
      stage to stage; stage 3 is the approved concept leaf, unchanged; stage 4 carries the flower (white w/B petals around a red or yellow centre); every stage
      touches the stem top (so the leaf never floats).
   3. HATS: equal-length rows of palette chars, 14..22 wide and 8..20 tall, (ax,ay) an opaque pixel inside the rows, lift an integer 0..16.
      Composed on BODY.rest with every stage, plain and flipped: the hat, stem extension and leaf stay inside the 40x64 cell (checked from the placement rectangles,
      because stamp() drops off-cell pixels silently; also with the 6-row hop); every head pixel down to the brim row is under the hat; the brim (bottom row) is
      wider than the head row beneath it on both sides; the brim lies 4 to 6 rows below the tip; no hat pixel is painted over by the stem or leaf; leaf teal (T)
      and stem (n) show ABOVE the hat's top row.
   4. GEAR.shades: composed with hat:'shades', plain and flipped: every pixel of both 6x7 eye boxes (cut corners included) is a shades pixel, and the shades
      change no body outline pixel and nothing outside the body.
   5. GEAR.mask: composed with mask:1, plain and flipped, over several faces: every mask pixel lands on body fill (never on the outline or off the body; checked on
      every BODY level present, since the stretched levels are narrower), so the
      outline stays whole around it; it covers the eye boxes, cheeks and the wide-mouth box; the face still composes underneath (without the mask the eyes show).
   6. Every combination (hat x mask x stage x flip) composes to a 40x64 grid of known palette chars. */
import {LEAF} from '../mascot/leaf.js';
import {HATS,GEAR} from '../mascot/hats.js';
import {BODY} from '../mascot/body.js';
import {compose,MB} from '../mascot/atlas.js';
import {KEYS} from './lint_mascot_body.mjs';

const W=40,H=64,HOP=6;
const LEAF_PAL='.nThwBoHYrkp',MB_CHARS=Object.keys(MB).join('');
/* the approved concept leaf (rest_v5): stage 3 must stay exactly this */
export const APPROVED_LEAF=[".....hhhh....","...hhTTTThh..","..hTTTTTTTThh",".hTTTnnnTTTTh",".hTnnTTTnnTTh","hTnhhhhhhhnTh","hnh......hTh.",".h........h.."];
const N8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

function rowsOk(tag,rows,pal,E){
  if(!Array.isArray(rows)||!rows.length||typeof rows[0]!=='string'||!rows[0].length)return E(`${tag}: rows must be a non-empty array of strings`),false;
  const w=rows[0].length;
  if(!rows.every(r=>typeof r==='string'&&r.length===w))return E(`${tag}: rows must be equal-length strings`),false;
  for(const r of rows)for(const c of r)if(!pal.includes(c))return E(`${tag}: unknown palette char '${c}'`),false;
  return true;
}
const opaque=rows=>{const s=[];rows.forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.')s.push([x,y])});return s};
function blobs(cells){const key=([x,y])=>x+','+y,set=new Set(cells.map(key)),seen=new Set();let n=0;
  for(const c of cells){if(seen.has(key(c)))continue;n++;const st=[c];seen.add(key(c));
    while(st.length){const [x,y]=st.pop();for(const [a,b] of N8){const k=(x+a)+','+(y+b);if(set.has(k)&&!seen.has(k)){seen.add(k);st.push([x+a,y+b])}}}}
  return n}
function orphans(rows){const out=[],at=(x,y)=>rows[y]&&rows[y][x]||'.';
  rows.forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.'&&N8.every(([a,b])=>at(x+a,y+b)==='.'))out.push(`${x},${y}`)});return out}
const gridOk=(g,tag,E)=>{if(g.length!==H||g.some(r=>r.length!==W))return E(`${tag}: grid is not ${W}x${H}`),false;
  for(const r of g)for(const c of r)if(c!=='.'&&!MB_CHARS.includes(c))return E(`${tag}: unknown char '${c}' in the grid`),false;return true};
const stemTop=()=>LEAF.stem.reduce((m,p)=>p[1]<m[1]?p:m,LEAF.stem[0]);
/* body silhouette (absolute cells) of a body level, plain or mirrored: Map key -> char */
function bodyCells(L,flip){const m=new Map(),rows=L.v[0];rows.forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.'){const X=flip?W-1-(L.x0+x):L.x0+x;m.set(X+','+(L.y0+y),r[x])}});return m}

function lintLeaf(E){
  const S=LEAF.stem;
  if(!Array.isArray(S)||!S.length||!S.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isInteger)))return E('LEAF.stem must be a list of integer [x,y] pairs'),false;
  if(S.some(p=>p[1]>=0))E('LEAF.stem: every stem pixel must sit above the tip (y < 0)');
  if(blobs(S)!==1)E('LEAF.stem: the stem pixels must form one 8-connected chain');
  const ST=LEAF.stages;
  if(!Array.isArray(ST)||ST.length!==5)return E('LEAF.stages must have 5 stages (0..4)'),false;
  const top=stemTop();let prevArea=0,ok=true;
  ST.forEach((s,i)=>{const tag=`LEAF.stages[${i}]`;
    if(!s||!Number.isInteger(s.ox)||!Number.isInteger(s.oy)){E(`${tag}: ox and oy must be integers`);ok=false;return}
    if(!rowsOk(tag,s.rows,LEAF_PAL,E)){ok=false;return}
    const cells=opaque(s.rows),w=s.rows[0].length,h=s.rows.length,area=w*h;
    if(blobs(cells)!==1)E(`${tag}: must be one 8-connected blob`);
    const orph=orphans(s.rows);if(orph.length)E(`${tag}: orphan pixel(s) at ${orph.slice(0,4).join(' ')}`);
    const txt=s.rows.join('');if(!txt.includes('T')||!txt.includes('h'))E(`${tag}: needs teal blade (T) and dark edge (h)`);
    if(area<=prevArea)E(`${tag}: ${w}x${h} = ${area} px is not bigger than the stage before (${prevArea})`);prevArea=area;
    /* the leaf joins the stem: some leaf pixel 8-touches (or covers) the stem top */
    const touch=cells.some(([x,y])=>Math.abs(s.ox+x-top[0])<=1&&Math.abs(s.oy+y-top[1])<=1);
    if(!touch)E(`${tag}: no leaf pixel touches the stem top (${top}) relative to the tip: the leaf would float`);
  });
  if(ST[3]&&Array.isArray(ST[3].rows)&&ST[3].rows.join('|')!==APPROVED_LEAF.join('|'))E('LEAF.stages[3] must be the approved concept leaf, unchanged');
  if(ST[4]&&Array.isArray(ST[4].rows)){const t=ST[4].rows.join('');if(!t.includes('w')||!/[rYo]/.test(t))E('LEAF.stages[4] needs the flower: white petals (w) around a red or yellow centre')}
  return ok;
}

function lintHats(E,leafOk){
  const names=Object.keys(HATS);
  if(!names.includes('crown')||!names.includes('party'))E('HATS needs crown and party');
  if(names.includes('shades'))E('shades belongs in GEAR, not HATS (compose would also stamp it as a hat)');
  const rest=BODY.rest;if(!rest)return E('BODY.rest is missing');
  const tip=rest.tip,top=stemTop(),restBody=bodyCells(rest,false);
  const span=(y,m)=>{let a=1e9,b=-1;for(const k of m.keys()){const [x,yy]=k.split(',').map(Number);if(yy===y){a=Math.min(a,x);b=Math.max(b,x)}}return b<0?null:[a,b]};
  for(const n of names){const Ht=HATS[n],tag=`HATS.${n}`;
    if(!Ht||!rowsOk(tag,Ht.rows,MB_CHARS+'.',E))continue;
    const w=Ht.rows[0].length,h=Ht.rows.length;
    if(w<14||w>22||h<8||h>20)E(`${tag}: ${w}x${h} outside 14..22 wide x 8..20 tall`);
    if(!Number.isInteger(Ht.ax)||!Number.isInteger(Ht.ay)||Ht.ax<0||Ht.ay<0||Ht.ax>=w||Ht.ay>=h){E(`${tag}: (ax,ay) must be a pixel inside the rows`);continue}
    if(Ht.rows[Ht.ay][Ht.ax]==='.')E(`${tag}: the anchor pixel (${Ht.ax},${Ht.ay}) is clear; it must be hat (it covers the head tip)`);
    if(!Number.isInteger(Ht.lift)||Ht.lift<0||Ht.lift>16)E(`${tag}: lift must be an integer 0..16`);
    const orph=orphans(Ht.rows);if(orph.length)E(`${tag}: orphan pixel(s) at ${orph.slice(0,4).join(' ')}`);
    if(blobs(opaque(Ht.rows))!==1)E(`${tag}: must be one 8-connected blob`);
    /* placement arithmetic on every body level present (stamp drops off-cell pixels silently), also hopping 6 rows up */
    for(const k of KEYS){const L=BODY[k];if(!L||!L.tip)continue;
      for(const up of [0,HOP]){const tx=L.tip[0],ty=L.tip[1]-up,hx=tx-Ht.ax,hy=ty-Ht.ay,where=`${tag} on ${k}${up?' hopping':''}`;
        if(hx<0||hx+w>W||hy<0||hy+h>H)E(`${where}: the hat leaves the cell (x ${hx}..${hx+w-1}, y ${hy}..${hy+h-1})`);
        if(ty+top[1]-Ht.lift<0)E(`${where}: the stem extension leaves the cell`);
        if(leafOk)LEAF.stages.forEach((s,i)=>{const lx=tx+s.ox,ly=ty+s.oy-Ht.lift,lw=s.rows[0].length,lh=s.rows.length;
          if(lx<0||lx+lw>W||ly<0||ly+lh>H)E(`${where} stage ${i}: the leaf leaves the cell (x ${lx}..${lx+lw-1}, y ${ly}..${ly+lh-1})`)})}}
    /* geometry on the rest body */
    const hx=tip[0]-Ht.ax,hy=tip[1]-Ht.ay,brim=hy+h-1,hatTop=hy+Ht.rows.findIndex(r=>/[^.]/.test(r));
    if(brim-tip[1]<4||brim-tip[1]>6)E(`${tag}: the brim row ${brim} is ${brim-tip[1]} rows below the tip (want 4..6)`);
    for(const [kk] of restBody){const [x,y]=kk.split(',').map(Number);if(y>brim)continue;const c=Ht.rows[y-hy]&&Ht.rows[y-hy][x-hx];
      if(!c||c==='.'){E(`${tag}: head pixel ${x},${y} above the brim is not under the hat`);break}}
    const b=Ht.rows[h-1],bl=hx+b.search(/[^.]/),br=hx+b.length-1-[...b].reverse().findIndex(c=>c!=='.'),below=span(brim+1,restBody);
    if(below&&!(bl<below[0]&&br>below[1]))E(`${tag}: the brim (${bl}..${br}) is not wider than the head row beneath it (${below[0]}..${below[1]})`);
    if(!leafOk)continue;
    for(const flip of [0,1])for(let st=0;st<5;st++){const g=compose({lv:'rest',dir:[0,0],hat:n,stage:st,flip}),t2=`${tag} stage ${st}${flip?' flipped':''}`;
      if(!gridOk(g,t2,E))continue;
      const X=x=>flip?W-1-x:x;let bad=0;
      Ht.rows.forEach((r,y)=>{for(let x=0;x<w;x++)if(r[x]!=='.'&&g[hy+y][X(hx+x)]!==r[x])bad++});
      if(bad)E(`${t2}: ${bad} hat pixel(s) are painted over (by the stem, leaf or face)`);
      const above=c=>g.slice(0,hatTop).some(r=>r.includes(c));
      if(!above('T'))E(`${t2}: no leaf teal (T) shows above the hat's top row ${hatTop}`);
      const sx=X(tip[0]+top[0]);if(!g.slice(0,hatTop).some(r=>r[sx]==='n'))E(`${t2}: the stem does not show above the hat's top row ${hatTop}`);
    }
  }
}

function lintGear(E){
  const rest=BODY.rest;if(!rest)return;
  for(const n of ['shades','mask']){const G=GEAR[n],tag=`GEAR.${n}`;
    if(!G){E(`${tag} is missing`);continue}
    if(!Number.isInteger(G.ox)||!Number.isInteger(G.oy)){E(`${tag}: ox and oy must be integers`);continue}
    if(!rowsOk(tag,G.rows,MB_CHARS+'.',E))continue;
    const orph=orphans(G.rows);if(orph.length)E(`${tag}: orphan pixel(s) at ${orph.slice(0,4).join(' ')}`);
  }
  if(!GEAR.shades||!GEAR.mask)return;
  /* the mask sits on body fill on every level present (the stretched levels are narrower), plain and flipped */
  for(const k of KEYS){const L=BODY[k];if(!L||k==='rest')continue;
    for(const flip of [0,1]){const body=bodyCells(L,!!flip),cx=flip?W+1-20:20,M=GEAR.mask;let bad=null;
      M.rows.forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.'&&!bad){const X=cx+M.ox+x,Y=L.cy+M.oy+y,b=body.get(X+','+Y);if(!b||b==='k')bad=`${X},${Y}`}});
      if(bad)E(`GEAR.mask on ${k}${flip?' flipped':''}: pixel ${bad} lands on ${'the body outline or off the body'}; it must sit on body fill`)}}
  for(const flip of [0,1]){
    const body=bodyCells(rest,!!flip),cx=flip?W+1-20:20,cy=rest.cy,F=flip?' flipped':'';
    const eyes=[];for(const x0 of [cx-8,cx+1])for(let y=cy-6;y<=cy;y++)for(let x=x0;x<=x0+5;x++){eyes.push([x,y])}
    const inGear=(G,x,y)=>{const r=G.rows[y-cy-G.oy];const c=r&&r[x-cx-G.ox];return !!c&&c!=='.'};
    const placedOk=(G,tag)=>{const gw=G.rows[0].length,gx=cx+G.ox,gy=cy+G.oy;if(gx<0||gy<0||gx+gw>W||gy+G.rows.length>H)E(`${tag}${F}: leaves the cell`)};
    /* shades */
    placedOk(GEAR.shades,'GEAR.shades');
    const plain=compose({lv:'rest',dir:[0,0],stage:3,flip}),sh=compose({lv:'rest',dir:[0,0],stage:3,flip,hat:'shades'});
    if(gridOk(sh,'shades'+F,E)){
      for(const [x,y] of eyes)if(!inGear(GEAR.shades,x,y)){E(`GEAR.shades${F}: eye pixel ${x},${y} is not covered`);break}
      for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(sh[y][x]!==plain[y][x]){const b=body.get(x+','+y);
        if(!b){E(`GEAR.shades${F}: pixel ${x},${y} is drawn outside the body`);y=H;break}
        if(b==='k'){E(`GEAR.shades${F}: covers body outline pixel ${x},${y}`);y=H;break}}
    }
    /* mask */
    placedOk(GEAR.mask,'GEAR.mask');
    const M=GEAR.mask;M.rows.forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.'){const X=cx+M.ox+x,Y=cy+M.oy+y,b=body.get(X+','+Y);
      if(!b||b==='k')E(`GEAR.mask${F}: pixel ${X},${Y} lands on ${b?'the body outline':'no body'}; it must sit on body fill`)}});
    const need=[...eyes,[cx-9,cy+1],[cx-8,cy+1],[cx+7,cy+1],[cx+8,cy+1]];for(let y=cy+2;y<=cy+6;y++)for(let x=cx-3;x<=cx+2;x++)need.push([x,y]);
    for(const [x,y] of need)if(!inGear(M,x,y)){E(`GEAR.mask${F}: face pixel ${x},${y} is not covered`);break}
    for(const face of [{},{face:'awe'},{gape:4},{happy:1},{face:'love'},{blink:1}]){
      const g=compose({lv:'rest',dir:[0,0],stage:2,flip,mask:1,...face}),g0=compose({lv:'rest',dir:[0,0],stage:2,flip,...face});
      if(!gridOk(g,'mask'+F,E))continue;
      if(!eyes.some(([x,y])=>g0[y][x]!==body.get(x+','+y)))E(`mask${F} ${JSON.stringify(face)}: without the mask no face is drawn under it`);
      M.rows.forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.'&&g[cy+M.oy+y][cx+M.ox+x]!==r[x]){E(`GEAR.mask${F} ${JSON.stringify(face)}: mask pixel ${x},${y} is painted over`);y=1e9;break}});
    }
  }
}

export function lint(){
  const errors=[],E=m=>errors.push(m);
  const leafOk=lintLeaf(E);
  lintHats(E,leafOk);
  lintGear(E);
  /* every combination composes */
  for(const hat of [undefined,'crown','party','shades'])for(const mask of [0,1])for(let stage=0;stage<5;stage++)for(const flip of [0,1]){
    const g=compose({lv:'rest',dir:[0,0],hat,mask,stage,flip});gridOk(g,`compose ${hat||'no hat'} mask ${mask} stage ${stage} flip ${flip}`,E);
    const h=compose({dir:[0,0],hat,mask,stage,flip,hop:3,air:1});gridOk(h,`compose hop ${hat||'no hat'} stage ${stage}`,E)}
  return errors;
}

if(import.meta.url===`file://${process.argv[1]}`){
  const e=lint(),tip=BODY.rest&&BODY.rest.tip;
  if(tip){const top=stemTop();
    for(const [n,Ht] of Object.entries(HATS)){const hy=tip[1]-Ht.ay,brim=hy+Ht.rows.length-1;
      const leafTop=Math.min(...LEAF.stages.map(s=>tip[1]+s.oy-Ht.lift));
      console.log(`${n.padEnd(6)} ${Ht.rows[0].length}x${Ht.rows.length}  rows ${hy}..${brim} (brim ${brim-tip[1]} below the tip)  lift ${Ht.lift}  stem top row ${tip[1]+top[1]-Ht.lift}  leaf top row ${leafTop} (headroom ${leafTop} at rest, ${leafTop-HOP} hopping)`)}
    LEAF.stages.forEach((s,i)=>console.log(`stage ${i}  ${s.rows[0].length}x${s.rows.length}  at tip+(${s.ox},${s.oy})  rows ${tip[1]+s.oy}..${tip[1]+s.oy+s.rows.length-1}`));
    for(const [n,G] of Object.entries(GEAR))console.log(`${n.padEnd(6)} ${G.rows[0].length}x${G.rows.length}  at face+(${G.ox},${G.oy}) = x ${20+G.ox}..${20+G.ox+G.rows[0].length-1}, rows ${BODY.rest.cy+G.oy}..${BODY.rest.cy+G.oy+G.rows.length-1}`)}
  if(e.length){console.log('\n'+e.length+' problem'+(e.length>1?'s':'')+':\n  '+e.join('\n  '));process.exit(1)}
  console.log('\nlint green');
}
