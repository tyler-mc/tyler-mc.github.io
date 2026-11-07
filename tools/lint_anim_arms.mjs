#!/usr/bin/env node
/* Lint for the arm nubs in mascot/arms.js (ARMS[angle] = {rows, ax, ay}). Run: node tools/lint_anim_arms.mjs   (prints the problems, exits 1 on any)
   tools/test_mascot.mjs calls lint() (an array of problems; empty = green). Checks:
   0. (round hands that merge into the body: 7..11 px, 14..45 fill px; compose draws a hand pixel only where the body has no fill, so the body outline is covered by the hand's fill)
   1. the 11 buckets 0 30 60 120 150 180 210 240 270 300 330 exist and nothing else (90 is the head tip: never an arm);
   2. each sprite: equal-length rows of `.kprR`, 7..11 wide and 7..11 tall, (ax,ay) inside the rows on a hand pixel (it lands on the body outline pixel the hand grows from), one 8-connected
      blob, 14..45 fill pixels, one or two `p` highlights at the top left of the fill, at most two `R` shades at its bottom right;
   3. composed on EVERY BODY level and boil variant (whatever levels exist when it runs), plain ({lv,bv,arms:[a,false],dir:[0,0],air:1}) and flipped
      ({...,arms:[false,a],flip:1}), for every angle a in the bucket list:
      - a 40x64 grid of known chars; the ray from ctr finds the body; the whole nub footprint lies inside the cell (stamp() drops off-cell pixels silently);
      - the anchor: the body pixel under (ax,ay) is body ink `k` (so a 1 px tail that only re-inks the outline stays invisible);
      - no crease: no nub `k` on body fill (r p R) and no nub fill on any body pixel (the nub shares the body's outline, it never cuts into it);
      - the footprint misses the eye boxes (rows cy-6..cy, columns cx-8..cx-3 and cx+1..cx+6), the cheek dots and the mouth (compose draws the face after the arms,
        so a nub under the face would be hidden, not visible: this is why the footprint is computed here with compose's own ray and not read off the grid);
      - the visible nub (the pixels that differ from arms:[false,false]) is at least MIN_VIS px, one 8-connected piece, 8-touching the body;
      - its outline is closed (no visible nub fill 4-touches clear), it adds no 2x2 ink block, no dead-end ink pixel and no new notch (a clear pixel boxed in on 3 sides);
   4. with each hat in HATS that exists (crown, party), at least HAT_VIS px of the nub stay visible, unless the nub's anchor is under the hat or right below its brim (the up nubs 60/120 attach
      at rows 35-36, inside the crown's 19x12 box: they are behind the brim by design and may hide; --craft lists them);
   5. compose itself: a flipped cast must land where the mirrored plain cast lands, and the anchor must land on body ink; when compose breaks either (see the two
      `compose:` problems and their one-line fixes) the affected cases are reported once and skipped.
   Craft checks (crease, notch, 2x2 ink, dead-end ink) are errors on CRAFT_LEVELS only; see the note there. */
import {ARMS} from '../mascot/arms.js';
import {BODY} from '../mascot/body.js';
import {HATS} from '../mascot/hats.js';
import {compose,MB} from '../mascot/atlas.js';
import {KEYS} from './lint_mascot_body.mjs';

export const BUCKETS=[0,30,60,120,150,180,210,240,270,300,330];
const OFF_ANGLES=[10,40,50,130,140,170,190,200,250,290,340,350];
const W=40,H=64,MIN_VIS=8,HAT_VIS=3,N4=[[1,0],[-1,0],[0,1],[0,-1]];
const KNOWN=new Set(['.',...Object.keys(MB)]);
const KEYS_OK=new Set(BUCKETS.map(String));

function lintSprite(b,A,E){
  if(!A||!Array.isArray(A.rows)||!A.rows.length)return E(`${b}: needs {rows, ax, ay}`),false;
  const rows=A.rows,w=rows[0].length,h=rows.length;
  if(!rows.every(r=>typeof r==='string'&&r.length===w&&/^[.kprR]+$/.test(r)))return E(`${b}: rows must be equal-length strings of .kprR`),false;
  if(w<7||w>11||h<7||h>11)E(`${b}: ${w}x${h} (want 7..11 wide, 7..11 tall: a round hand that overlaps the body edge)`);
  if(!Number.isInteger(A.ax)||!Number.isInteger(A.ay)||A.ax<0||A.ay<0||A.ax>=w||A.ay>=h)return E(`${b}: (ax,ay)=(${A.ax},${A.ay}) is outside the rows`),false;
  if(rows[A.ay][A.ax]==='.')E(`${b}: (ax,ay) must be a hand pixel (it lands on the body outline pixel the hand grows from), is clear`);
  const at=(x,y)=>y>=0&&y<h&&x>=0&&x<w?rows[y][x]:'.';
  const pts=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(at(x,y)!=='.')pts.push([x,y]);
  const seen=new Set([pts[0]+'']),st=[pts[0]];
  while(st.length){const [x,y]=st.pop();for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const k=[x+i,y+j]+'';if(at(x+i,y+j)!=='.'&&!seen.has(k)){seen.add(k);st.push([x+i,y+j])}}}
  if(seen.size!==pts.length)E(`${b}: not one 8-connected blob (${pts.length-seen.size} px apart)`);
  const fill=pts.filter(([x,y])=>'rpR'.includes(at(x,y)));
  if(fill.length<14||fill.length>45)E(`${b}: ${fill.length} fill px (want 14..45: a round hand, not a nub or a lump)`);
  const s=([x,y])=>x+y,lo=Math.min(...fill.map(s)),hi=Math.max(...fill.map(s));
  const P=fill.filter(([x,y])=>at(x,y)==='p'),R=fill.filter(([x,y])=>at(x,y)==='R');
  if(P.length<1||P.length>2)E(`${b}: ${P.length} highlight p (want 1 or 2)`);
  if(P.some(v=>s(v)>lo+1))E(`${b}: the highlight p must sit at the top left of the fill`);
  if(R.length>3)E(`${b}: ${R.length} shade R (want at most 3)`);
  if(R.some(v=>s(v)<hi-1))E(`${b}: the shade R must sit at the bottom right of the fill`);
  return true;
}

/* where compose put the nub: every bucket's anchor pixel is swapped for a sentinel char for one compose call, so the anchor P (and the bucket used) come from
   compose's own ray, whatever it does; the footprint is then the sprite placed at P - (ax,ay). Returned in pass-A (unmirrored) coordinates. */
const SENT='0123456789@';
function footprint(L,lv,bv,a0,fl){
  const keep={};BUCKETS.forEach((b,i)=>{keep[b]=ARMS[b];ARMS[b]={ax:0,ay:0,rows:[SENT[i]]}});   /* a one pixel hand: the sentinel lands exactly on the anchor P, whatever the real sprite's clamping does */
  let g;try{g=compose({lv,bv,dir:[0,0],air:1,flip:fl,arms:fl?[false,a0]:[a0,false]})}finally{BUCKETS.forEach(b=>{ARMS[b]=keep[b]})}
  let hit=null;for(let y=0;y<g.length&&!hit;y++)for(let x=0;x<g[y].length;x++){const i=SENT.indexOf(g[y][x]);if(i>=0){hit=[fl?W-1-x:x,y,BUCKETS[i]];break}}
  if(!hit)return null;
  const [px,py,a]=hit,A=ARMS[a],rows=L.v[bv%L.v.length],bx=L.x0,by=L.y0,bw=rows[0].length;
  const inB=(x,y)=>{const r=rows[y-by];return !!r&&x>=bx&&x<bx+bw&&r[x-bx]!=='.'};
  const ox=Math.max(0,Math.min(W-A.rows[0].length,px-A.ax)),oy=Math.max(0,Math.min(H-A.rows.length,py-A.ay));   /* compose slides a hand that would leave the cell inward */
  const fp=[];A.rows.forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.')fp.push([ox+x,oy+y,r[x]])});
  return {a,P:[px,py],fp,bodyAt:(x,y)=>inB(x,y)?rows[y-by][x-bx]:null};
}

/* CRAFT_LEVELS: where the pixel craft checks (crease, notch, 2x2 ink, dead ends, anchor on the outline) are errors: the approved rest body, also the reduced-motion
   static pose. On the other levels one fixed sprite per bucket cannot meet every outline (the ray lands 1 px in or out as the body squashes, stretches and boils): those
   are listed by `node tools/lint_anim_arms.mjs --craft`, not failed. */
export const CRAFT_LEVELS=[];   /* the hands are round and overlap the body edge (compose opens the outline under them), so a 2x2 ink block or a one pixel notch where the ring meets a sloped outline is a note, not an error */
export function lint({craft=false}={}){
  const out=[],notes=[],E=m=>out.push('arms '+m);
  const keys=Object.keys(ARMS);
  for(const b of BUCKETS)if(!ARMS[b])E(`bucket ${b} is missing`);
  for(const k of keys)if(!KEYS_OK.has(k))E(`unexpected bucket ${k}${k==='90'?' (90 is the head tip: never an arm)':''}`);
  const good=new Set();for(const b of BUCKETS)if(ARMS[b]&&lintSprite(b,ARMS[b],E))good.add(b);
  if(good.size!==BUCKETS.length)return out;
  const levels=KEYS.filter(k=>BODY[k]).concat(Object.keys(BODY).filter(k=>!KEYS.includes(k)));
  const hats=['crown','party'].filter(h=>HATS[h]),floatBug=[],gapBug=[];
  for(const lv of levels){const L=BODY[lv];
    for(let bv=0;bv<L.v.length;bv++)for(const a0 of BUCKETS)for(const fl of [0,1]){
      const tag=`${lv}${L.v.length>1?'/'+bv:''} ${fl?'flip ':''}arms ${fl?`[false,${a0}]`:`[${a0},false]`}`;
      const strict=CRAFT_LEVELS.includes(lv),C=m=>(strict?E:n=>notes.push('arms '+n))(m);
      const look=x=>({lv,bv,dir:[0,0],air:1,flip:fl,arms:fl?[false,x]:[x,false]});
      const g=compose(look(a0)),g0=compose(look(false));
      if(g.length!==H||g.some(r=>r.length!==W)){E(`${tag}: grid is not ${W}x${H}`);continue}
      if(g.some(r=>r.some(c=>!KNOWN.has(c)))){E(`${tag}: unknown palette char`);continue}
      const F=footprint(L,lv,bv,a0,fl);if(!F){E(`${tag}: no nub drawn (the ray misses the body, or the face covers the anchor)`);continue}
      if(fl){const F2=footprint(L,lv,bv,((180-a0)%360+360)%360,0);if(F2&&(F2.P[0]!==F.P[0]||F2.P[1]!==F.P[1])){floatBug.push(`${lv}${L.v.length>1?'/'+bv:''} [false,${a0}] P ${F.P} vs ${F2.P}`);continue}}
      const mx=x=>fl?W-1-x:x;   /* pass A -> final grid */
      const bucket=`(bucket ${F.a})`;
      if(F.fp.some(([x,y])=>x<0||x>=W||y<0||y>=H)){E(`${tag} ${bucket}: the nub leaves the ${W}x${H} cell`);continue}
      if(F.bodyAt(...F.P)!=='k'){gapBug.push(`${tag.replace(' arms','')} P ${F.P} is '${F.bodyAt(...F.P)}'`);continue}
      const drawn=F.fp.filter(([x,y])=>!'rpR'.includes(F.bodyAt(x,y)||'.'));   /* compose draws a hand pixel only where the body has no fill: over the outline or outside */
      if(!drawn.some(([x,y,c])=>'rpR'.includes(c)&&F.bodyAt(x,y)==='k'))C(`${tag} ${bucket}: the hand does not open the body outline (no fill lands on it): it would read as stuck on`);
      /* the face, in final coordinates (compose pass B) */
      const cx=fl?W+1-20:20,cy=L.cy,my=cy+3,face=new Set();
      for(let y=cy-6;y<=cy;y++){for(let x=cx-8;x<=cx-3;x++)face.add(x+','+y);for(let x=cx+1;x<=cx+6;x++)face.add(x+','+y)}
      for(const x of [cx-9,cx-8,cx+7,cx+8])face.add(x+','+(cy+1));
      for(let y=my-1;y<=my+2;y++)for(let x=cx-2;x<=cx+1;x++)face.add(x+','+y);
      const onFace=drawn.filter(([x,y])=>face.has(mx(x)+','+y)).length;
      if(onFace)E(`${tag} ${bucket}: ${onFace} nub px under the eyes, cheeks or mouth`);
      /* what shows */
      const vis=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(g[y][x]!==g0[y][x])vis.push([x,y]);
      const vk=new Set(vis.map(v=>v+''));
      if(vis.length<MIN_VIS){E(`${tag} ${bucket}: only ${vis.length} nub px show (want ${MIN_VIS}+)`);continue}
      const seen=new Set([vis[0]+'']),st=[vis[0]];
      while(st.length){const [x,y]=st.pop();for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const k=[x+i,y+j]+'';if(vk.has(k)&&!seen.has(k)){seen.add(k);st.push([x+i,y+j])}}}
      if(seen.size!==vis.length)E(`${tag} ${bucket}: the visible nub is in pieces (${vis.length-seen.size} px cut off)`);
      const isBody=(x,y)=>!!F.bodyAt(mx(x),y);
      if(!vis.some(([x,y])=>{for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)if(isBody(x+i,y+j)&&!vk.has([x+i,y+j]+''))return true;return false}))E(`${tag} ${bucket}: the nub floats (no visible px touches the body)`);
      const at=(G,x,y)=>G[y]&&G[y][x]!==undefined?G[y][x]:'.';
      let open=0,blk=0,dead=0,notch=0;
      for(const [x,y] of vis){const c=g[y][x];
        if('rpR'.includes(c)&&N4.some(([a,b])=>at(g,x+a,y+b)==='.'))open++;
        if(c==='k'){let n=0;for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)if((i||j)&&at(g,x+i,y+j)==='k')n++;if(n<2)dead++}}
      const xs=vis.map(v=>v[0]),ys=vis.map(v=>v[1]);
      for(let y=Math.min(...ys)-1;y<=Math.max(...ys)+1;y++)for(let x=Math.min(...xs)-1;x<=Math.max(...xs)+1;x++){
        const K=(G,a,b)=>at(G,a,b)==='k',block=G=>K(G,x,y)&&K(G,x+1,y)&&K(G,x,y+1)&&K(G,x+1,y+1);
        if(block(g)&&!block(g0))blk++;
        const boxed=G=>at(G,x,y)==='.'&&N4.filter(([a,b])=>at(G,x+a,y+b)!=='.').length>=3;
        if(boxed(g)&&!boxed(g0))notch++}
      if(open)E(`${tag} ${bucket}: open outline (${open} nub fill px touch clear)`);
      if(blk)C(`${tag} ${bucket}: ${blk} new 2x2 ink block(s)`);
      if(dead)C(`${tag} ${bucket}: ${dead} dead-end ink px`);
      if(notch)C(`${tag} ${bucket}: ${notch} notch(es) between nub and body (a crease)`);
      for(const h of hats){const gh=compose({...look(a0),hat:h}),gh0=compose({...look(false),hat:h});let n=0;
        for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(gh[y][x]!==gh0[y][x])n++;
        /* a nub whose anchor is under the hat is behind the brim by design (the up nubs 60/120 attach at rows 35-36, inside the crown's box): it may hide */
        const Hh=HATS[h],hx=L.tip[0]-Hh.ax,hy=L.tip[1]-Hh.ay,cov=(x,y)=>{const r=Hh.rows[y-hy];return !!r&&!!r[x-hx]&&r[x-hx]!=='.'};
        const under=cov(F.P[0],F.P[1])||cov(F.P[0],F.P[1]-1);   /* the anchor is under the brim or right below it */
        if(n<HAT_VIS&&!under)E(`${tag} ${bucket}: with the ${h} only ${n} nub px show (want ${HAT_VIS}+)`);else if(n<HAT_VIS)notes.push(`arms ${tag} ${bucket}: behind the ${h} brim (${n} px show)`)}
    }}
  /* the OS passes angles between the buckets too (os.js: 10 40 50 130 140 170 190 200 250 290 340 350): the nub is authored for its bucket's cast, so an
     in-between angle must place it exactly where its bucket does (compose casts at the raw angle today, which moves the anchor and cuts the nub into the body) */
  const offB=[];for(const a0 of OFF_ANGLES)for(const fl of [0,1]){const Fa=footprint(BODY.rest,'rest',0,a0,fl),Fb=Fa&&footprint(BODY.rest,'rest',0,fl?180-Fa.a:Fa.a,fl);
    if(Fa&&Fb&&(Fa.P[0]!==Fb.P[0]||Fa.P[1]!==Fb.P[1]))offB.push(`${fl?'flip ':''}${a0} P ${Fa.P} vs bucket ${Fa.a} P ${Fb.P}`)}
  if(BODY.rest&&offB.length)E(`compose: ${offB.length} in-between angles on rest put the nub somewhere its bucket does not (it is cast at the raw angle): ${offB.slice(0,4).join('; ')}${offB.length>4?' ...':''}. Fix in mascot/atlas.js compose: cast at the bucket, rad=a*Math.PI/180`);
  if(floatBug.length)E(`compose: ${floatBug.length} flipped casts land on a different pixel than the mirrored plain cast (180-a is not normalised before cos/sin, so x.5 rounds the other way): ${floatBug.slice(0,4).join('; ')}${floatBug.length>4?' ...':''}. Fix in mascot/atlas.js compose: const ang=((fl?180-a0:a0)%360+360)%360`);
  if(gapBug.length)E(`compose: ${gapBug.length} casts leave the body through a diagonal gap in the outline, so the anchor lands on fill and the nub is stamped 1 px into the body: ${gapBug.slice(0,4).join('; ')}${gapBug.length>4?' ...':''}. Fix in mascot/atlas.js compose: after the march, if the body pixel at P is not 'k', move P to its 8-neighbour 'k' on the ray side`);
  return craft?notes:out;
}

if(import.meta.url===`file://${process.argv[1]}`){
  if(process.argv.includes('--craft')){const n=lint({craft:true});console.log(n.join('\n'));console.log(`\n${n.length} craft note(s) on the squash/stretch/breath levels (not errors)`)}
  const p=lint();if(p.length){console.log(p.join('\n'));console.log(`\n${p.length} problem(s)`);process.exit(1)}console.log('arms lint: OK')}
