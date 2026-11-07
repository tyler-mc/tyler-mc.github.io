/* Lint for mascot/anim_surf.js: the Wake Up game's SURF frames (the redesigned mascot standing on the yellow board) and the SURF_FOAM particle sprites.
   Run: node tools/lint_anim_surf.mjs (tools/test_mascot.mjs also calls lint()). Checks, on top of lintPoseFrames (minFrames 11, turnsMax 6: closed 1 px body
   outline, no orphan p/R, highlight top left and shade bottom right, face margin for the plain AND the mirrored face, canvas bounds, shoe format):
   - the 11 frames in the documented order, each with its name; none baked; each carries tip, ctr and its recommended arms [left,right];
   - the head: the body's top row is exactly the 4 px cap at tip (the stem, leaf and hats attach there); each hat's brim stays above the eye margin
     (brim row < cy-7) and half or more of its brim columns rest on the head;
   - every frame has an over layer containing board pixels (o Y B) and a board field {x0,y0,rows} (the board alone): board chars k o Y B only, every board
     pixel shows in over as itself or under foam (w B b T), except on the off-board frames (launch, sink1, sink2) where it may pass behind the body or a shoe;
     the board is at most 34 px wide (column span) and at least 26 px long (its longest pixel-to-pixel distance, so a pitched or sinking board counts
     along its length; sink2 shows only the nose: 8+);
     the tail and nose anchors sit on a board pixel;
   - shoes on the deck: on every riding frame (all but launch, sink1, sink2: there he is in the air or in the water) each shoe's bottom pixel, column by
     column, is never below the deck top (no shoe buried in the board) and in at least 3 columns it is ON the deck's top ink row (shared outline) or right
     above it (gap 0 or 1): planted, not perched on a point;
   - the whole sprite stays inside the 40x64 cell, plain and flipped, computed from the stamp offsets (stamp() clips silently): body, shoes, over, the arms
     (the default pair [210,330] and the frame's recommended pair, by the same ray cast as compose), the stem, the party and crown hats with their stem
     lift, every leaf stage with a trailing leaf lag look.ll of 0..-3 (atlas.js slides the leaf sideways by ll; while surfing it trails behind the travel
     direction, so only ll <= 0 in the frame's own facing is checked: a forward lag of +3 would push the stage 3/4 leaf past column 39 where tip.x > 22);
   - compose() with plain, party hat + stage 4 + the recommended arms, crown + stage 3, and the scared face + recommended arms, plain and flip:1: a 40x64
     grid of known palette chars; the scared face's eyes and mouth keep 1 px of body colour around them (no arm, shoe, spray or outline touching);
   - wobble1 and wobble2 differ (body + shoes + board change 8..200 px) so alternating them shakes;
   - SURF_FOAM: spray 4 frames 8x8, wake 4 12x6, drops 3 8x6, splash 4 12x8, crest 3 8x4, cloud 4 (12..18 x 8..12); frames of one sprite are the same size,
     non-empty, chars . w B b T only, and every pixel has an 8-way neighbour in its frame, except in drops (flung specks, marked // specks). */
import {lintPoseFrames} from './lint_mascot_body.mjs';
import {ANIM_SURF,SURF_FOAM} from '../mascot/anim_surf.js';
import {compose,MB,W,H} from '../mascot/atlas.js';
import {ARMS} from '../mascot/arms.js';
import {LEAF} from '../mascot/leaf.js';
import {HATS} from '../mascot/hats.js';
export const NAMES=['ride','rideFast','brake','noseUp','noseDown','wobble1','wobble2','mount','launch','sink1','sink2'];
const OFFBOARD=new Set(['launch','sink1','sink2']);
export const FOAM_SPEC={spray:[4,8,8],wake:[4,12,6],drops:[3,8,6],splash:[4,12,8],crest:[3,8,4],cloud:[4,[12,18],[8,12]]};
const cells=(rows,x0,y0,keep=c=>c!=='.')=>{const s=new Map();rows.forEach((r,j)=>{for(let i=0;i<r.length;i++)if(keep(r[i]))s.set((y0+j)*64+x0+i,r[i])});return s};
const sd=(a,b)=>{let n=0;for(const k of a.keys())if(!b.has(k))n++;for(const k of b.keys())if(!a.has(k))n++;return n};
const ok2=a=>Array.isArray(a)&&a.length===2&&a.every(Number.isInteger);
function lintFoam(errs){
  const F=SURF_FOAM||{};
  for(const k of Object.keys(F))if(!(k in FOAM_SPEC))errs.push(`SURF_FOAM.${k}: not a documented sprite`);
  for(const [k,[n,ww,hh]] of Object.entries(FOAM_SPEC)){const S=F[k],E=m=>errs.push(`SURF_FOAM.${k}: ${m}`);
    if(!Array.isArray(S)){E('missing');continue}
    if(S.length!==n)E(`has ${S.length} frames, want ${n}`);
    const dims=new Set(),inR=(v,r)=>Array.isArray(r)?v>=r[0]&&v<=r[1]:v===r;
    S.forEach((fr,fi)=>{if(!Array.isArray(fr)||!fr.length||!fr.every(r=>typeof r==='string'&&r.length===fr[0].length)){E(`frame ${fi} must be equal-length rows`);return}
      const h=fr.length,w=fr[0].length;dims.add(w+'x'+h);if(!inR(w,ww)||!inR(h,hh))E(`frame ${fi} is ${w}x${h} (want ${ww}x${hh})`);
      const at=(x,y)=>y>=0&&y<h&&x>=0&&x<w?fr[y][x]:'.';let n=0;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=fr[y][x];if(c==='.')continue;n++;
        if(!'wBbT'.includes(c))E(`frame ${fi} has char '${c}' at ${x},${y} (want . w B b T)`);
        if(k!=='drops'){let m=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)if((a||b)&&at(x+a,y+b)!=='.')m++;if(!m)E(`frame ${fi} has an orphan pixel at ${x},${y}`)}}
      if(!n)E(`frame ${fi} is empty`)});
    if(dims.size>1)E(`frames differ in size (${[...dims].join(', ')})`)}
}
export function lint(){
  const F=ANIM_SURF.frames,errs=lintPoseFrames('surf',F,{minFrames:NAMES.length,turnsMax:6});
  if(F.length!==NAMES.length)errs.push(`surf: ${F.length} frames, the wiring note documents ${NAMES.length}`);
  const armKeys=Object.keys(ARMS).map(Number),top=LEAF.stem.reduce((m,p)=>p[1]<m[1]?p:m,LEAF.stem[0]);
  const shapes=[];
  F.forEach((f,fi)=>{
    const E=m=>errs.push(`surf[${fi}] ${f.name}: ${m}`);
    if(f.name!==NAMES[fi])E(`must be named '${NAMES[fi]}'`);
    if(f.baked)E('must not be baked: compose draws the face, sprout and hat');
    if(!ok2(f.tip)||!ok2(f.ctr)){E('tip and ctr must be [x,y] integers');return}
    if(!Array.isArray(f.arms)||f.arms.length!==2||!f.arms.every(a=>Number.isFinite(a)))E('needs its recommended arms [left,right] in degrees');
    if(!f.v||!f.v[0])return;
    const rows=f.v[0],bw=rows[0].length,bh=rows.length,[tx,ty]=f.tip;
    const body=(x,y)=>{const r=rows[y-f.y0];return r&&x>=f.x0&&x<f.x0+bw?r[x-f.x0]:'.'},solid=(x,y)=>body(x,y)!=='.';
    // the cap
    if(f.y0!==ty)E(`the body's top row ${f.y0} must be the tip row ${ty}`);
    for(let x=f.x0;x<f.x0+bw;x++){const want=x>=tx&&x<=tx+3;if(solid(x,ty)!==want){E(`row ${ty} must be exactly the 4 px cap at x ${tx}..${tx+3}`);break}}
    // over and board
    const O=f.over,B=f.board;
    if(!O||!Array.isArray(O.rows)){E('needs an over layer (the board)');return}
    const ov=cells(O.rows,O.x0,O.y0);
    if(![...ov.values()].some(c=>'oYB'.includes(c)))E('over has no board pixels (o Y B)');
    if(!B||!Number.isInteger(B.x0)||!Number.isInteger(B.y0)||!Array.isArray(B.rows)){E('needs a board field {x0,y0,rows}');return}
    const bp=cells(B.rows,B.x0,B.y0);
    if(![...bp.values()].some(c=>'oY'.includes(c)))E('the board has no yellow (o Y) pixels');
    const shoeAt=new Set();for(const [fx,fy,fr] of f.feet||[])for(const k of cells(fr,fx,fy).keys())shoeAt.add(k);
    for(const [k,c] of bp){const x=k%64,y=Math.floor(k/64);
      if(!'koYB'.includes(c)){E(`board pixel ${x},${y} is '${c}', want k o Y B`);break}
      const o=ov.get(k)||'.';if(o!==c&&!'wBbT'.includes(o)&&!(OFFBOARD.has(f.name)&&(solid(x,y)||shoeAt.has(k)))){E(`board pixel ${x},${y} ('${c}') is not in over (has '${o}')`);break}}
    {const P=[...bp.keys()].map(k=>[k%64,Math.floor(k/64)]);let len=0;for(const a of P)for(const b of P)len=Math.max(len,Math.hypot(a[0]-b[0],a[1]-b[1]));len=Math.round(len)+1;
      const xs=P.map(p=>p[0]),span=Math.max(...xs)-Math.min(...xs)+1,lo=f.name==='sink2'?8:26;
      if(len<lo)E(`the board is ${len} px long (want ${lo}+${f.name==='sink2'?': only its nose shows':''})`);if(span>34)E(`the board is ${span} px wide (max 34)`)}
    for(const nm of ['tail','nose']){const a=f[nm];if(!ok2(a)||!bp.has(a[1]*64+a[0]))E(`${nm} anchor ${JSON.stringify(a)} is not on a board pixel`)}
    // shoes on the deck
    if(!Array.isArray(f.feet)||f.feet.length!==2)E('needs exactly two shoes');
    else if(!OFFBOARD.has(f.name))f.feet.forEach(([fx,fy,fr],i)=>{
      const deckTop=x=>{for(let y=0;y<H;y++)if(bp.has(y*64+x))return y;return null};
      let minGap=99,buried=null,planted=0;
      for(let a=0;a<fr[0].length;a++){let bot=-1;fr.forEach((r,j)=>{if(r[a]!=='.')bot=fy+j});if(bot<0)continue;
        const dt=deckTop(fx+a);if(dt===null)continue;const gap=dt-bot;   // 0: the sole's ink row IS the deck's top ink row; 1: right on top of it
        if(gap<0&&buried===null)buried=[fx+a,bot,dt];if(gap>=0&&gap<=1)planted++;minGap=Math.min(minGap,Math.max(gap,0))}
      if(minGap===99)E(`shoe ${i} is not over the board`);
      else if(buried)E(`shoe ${i} is buried in the board at column ${buried[0]} (sole row ${buried[1]}, deck top ${buried[2]})`);
      else if(minGap>1)E(`shoe ${i} floats ${minGap-1} px above the deck`);
      else if(planted<3)E(`shoe ${i} touches the deck in only ${planted} column(s) (want 3+: planted, not perched)`)});
    // the extent of everything stamped, plain and flipped
    const ext=[[f.x0,f.y0,f.x0+bw-1,f.y0+bh-1],[O.x0,O.y0,O.x0+O.rows[0].length-1,O.y0+O.rows.length-1]];
    for(const [fx,fy,fr] of f.feet||[])ext.push([fx,fy,fx+fr[0].length-1,fy+fr.length-1]);
    for(const [sx0,sy0] of LEAF.stem)ext.push([tx+sx0,ty+sy0,tx+sx0,ty+sy0]);
    for(const hn of [null,'party','crown']){const hat=hn&&HATS[hn],lift=hat?hat.lift|0:0;
      if(hat){const hx=tx-hat.ax,hy=ty-hat.ay,hw=hat.rows[0].length,by=hy+hat.rows.length-1;ext.push([hx,hy,hx+hw-1,by]);
        let on=0;for(let x=hx;x<hx+hw;x++)if(solid(x,by)||solid(x,by+1))on++;
        if(on*2<hw)E(`hat ${hn}: only ${on} of ${hw} brim columns rest on the head`);
        if(by>=f.cy-7)E(`hat ${hn}: the brim (row ${by}) reaches the eye margin (row ${f.cy-7})`)}
      if(lift)ext.push([tx+top[0],ty+top[1]-lift,tx+top[0],ty+top[1]-1]);
      for(const S of LEAF.stages)for(const ll of [-3,0])ext.push([tx+S.ox+ll,ty+S.oy-lift,tx+S.ox+ll+S.rows[0].length-1,ty+S.oy-lift+S.rows.length-1])}
    const arm=(a0,fl)=>{const ang=fl?180-a0:a0;let best=null,bd=1e9;for(const k of armKeys){const d=Math.abs(((ang-k)%360+540)%360-180);if(d<bd){bd=d;best=k}}
      const A=ARMS[best],rad=ang*Math.PI/180;let px=-1,py=-1;
      for(let t=0;t<48;t+=.5){const x=Math.round(f.ctr[0]+t*Math.cos(rad)),y=Math.round(f.ctr[1]-t*Math.sin(rad));if(solid(x,y)){px=x;py=y}else if(px>=0)break}
      if(px<0){E(`arm ${a0} (flip ${fl}) finds no body`);return null}
      return [px-A.ax,py-A.ay,px-A.ax+A.rows[0].length-1,py-A.ay+A.rows.length-1]};
    for(const fl of [0,1]){const all=[...ext,...[210,330,...(f.arms||[])].map(a=>arm(a,fl)).filter(Boolean)].map(([a,b,c,d])=>fl?[W-1-c,b,W-1-a,d]:[a,b,c,d]);
      const bad=all.filter(([a,b,c,d])=>a<0||b<0||c>=W||d>=H);
      if(bad.length)E(`${fl?'flipped: ':''}the sprite leaves the ${W}x${H} cell (${bad.map(r=>r.join(',')).slice(0,3).join(' / ')})`)}
    // compose
    for(const fl of [0,1])for(const [nm,lk] of [['plain',{}],['party',{hat:'party',stage:4,arms:f.arms}],['crown',{hat:'crown',stage:3}],['scared',{face:'scared',arms:f.arms}]]){
      const g=compose({pose:'surf:'+fi,flip:fl,air:1,dir:[1,0],stage:0,...lk}),T=`${nm}${fl?' flipped':''}`;
      if(g.length!==H||g.some(r=>r.length!==W)){E(`${T}: grid is not ${W}x${H}`);continue}
      if(g.some(r=>r.some(c=>c!=='.'&&!MB[c])))E(`${T}: unknown palette char`);
      if(nm==='scared'){const cx=fl?W+1-f.fcx:f.fcx,cy=f.cy,face=new Set(),bad=[];
        for(const [x0,x1] of [[cx-8,cx-3],[cx+1,cx+6]])for(let y=cy-6;y<=cy;y++)for(let x=x0;x<=x1;x++)face.add(y*64+x);
        for(let y=cy+2;y<=cy+6;y++)for(let x=cx-3;x<=cx+2;x++)face.add(y*64+x);
        const cheek=new Set([cx-9,cx-8,cx+7,cx+8].map(x=>(cy+1)*64+x));
        for(const k of face){const y=Math.floor(k/64),x=k%64;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const q=(y+b)*64+x+a;if(face.has(q)||cheek.has(q))continue;const c=g[y+b]&&g[y+b][x+a];if(!'rpR'.includes(c||'.'))bad.push(`${x+a},${y+b}`)}}
        if(bad.length)E(`${T}: the face needs 1 px of body colour around it: ${[...new Set(bad)].slice(0,5).join(' ')}`)}}
    const sh=cells(rows,f.x0,f.y0);for(const [fx,fy,fr] of f.feet||[])for(const [k,c] of cells(fr,fx,fy))sh.set(k,c);for(const [k,c] of bp)sh.set(k,c);shapes[fi]=sh;
  });
  {const a=NAMES.indexOf('wobble1'),b=NAMES.indexOf('wobble2');if(shapes[a]&&shapes[b]){const d=sd(shapes[a],shapes[b]);if(d<8||d>200)errs.push(`surf: wobble1 to wobble2 changes ${d} px (want 8..200)`)}}
  lintFoam(errs);
  return errs;
}
if(import.meta.url===`file://${process.argv[1]}`){
  const e=lint();
  if(e.length){console.log(e.length+' problem'+(e.length>1?'s':'')+':\n  '+e.join('\n  '));process.exit(1)}
  console.log('lint_anim_surf: green ('+ANIM_SURF.frames.length+' frames, '+Object.keys(SURF_FOAM).length+' foam sprites)');
}
