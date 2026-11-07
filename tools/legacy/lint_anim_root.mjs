#!/usr/bin/env node
/* Lint for mascot/anim_root.js (the root launch, root double jump, airborne roots and landing, plus the ROOT_FX particle sprites).
   Run: node tools/lint_anim_root.mjs   (tools/test_mascot.mjs also calls lint()).
   The root frames use a TALL cell: ANIM_ROOT.cellH = 72 and every frame sets cellH:72 (compose returns 32x72, lintPoseFrames bounds-checks
   against it), with soleRow 35 and groundRow 36. On top of lintPoseFrames (closed 1 px body outline, light, face margin plain AND mirrored,
   canvas bounds, over/feet format) it checks:
   - 12 frames in the documented order (each carries its name), never baked, feet:[] (the boots live in the over layer), cellH 72;
   - boots: every frame names two tight boot boxes [x,y,w,h] on the canvas (top row has boot px, bottom row the sole); inside each box the
     over layer holds a whole boot (ink k, light u, body U, shade v, sole V); the boot's top row is within 1 row of the body's last row
     (shoeTop - bodyBottom in -1..1: tucked under the belly by at most its last two rows, never higher, never floating); `sole` is the
     frame's lowest sole (V) row;
   - ground frames (crouch, dig, landBurst, landSettle) have ground === groundRow (36) and both soles on soleRow (35), or 36 when dug in
     (dig); air frames have ground null and soles on rows 34..36 (a boot may dangle 1 px);
   - the over layer only covers body pixels with boot pixels on the body's last two rows: roots, dirt and leaves never paint the body;
   - roots: every frame has root pixels (a A e g G, and u outside the boot boxes) touching a boot, at least MINROOT[name]; the airborne and
     burst frames carry fresh green tips (G); no root reaches more than 40 rows below the soles, and rise1, burst, burst2 and hang reach at
     least 22 (about a body height); fall has roots above the boots (streaming up past the body); ground frames reach into the ground;
   - no orphan root pixel: every a A e g G (and u outside the boots) has an 8-neighbour that is root or boot. Lone dirt specks are v or b,
     which this rule ignores (they float on purpose). A root clump bigger than 16 px must touch a boot (only clods, root bits and leaves fly free);
   - compose() renders every frame plain and flip:1, with faces 'scared' and 'huh', hats 'crown' and 'party', sprout stages 0 and 3: a
     32x72 grid of known palette chars with every authored body-outline and over pixel drawn as authored; hats and the stage 3 sprout are
     drawn whole (same count of hat or sprout pixels as on the plain rest body, so nothing clips at row 0), the hat brim sits on the head
     (no column floats more than 1 px) and covers no eye;
   - ROOT_FX: piece (2 frames), leaf (3), crumbs (3), dust (4), lines (3); frames of one sprite are the same size, at most 12x10, rows of
     known palette chars; no pixel without an 8-neighbour except in crumbs (its specks are intended); lines are b only. */
import {lintPoseFrames} from './lint_mascot_body.mjs';
import {ANIM_ROOT,ROOT_FX} from '../mascot/anim_root.js';
import {compose,MB} from '../mascot/atlas.js';
export const NAMES=['crouch','dig','push','rise1','rise2','burst','burst2','hang','fall','retract','landBurst','landSettle'];
const GROUNDED=new Set(['crouch','dig','landBurst','landSettle']),GREEN=new Set(['rise1','rise2','burst','burst2','hang','fall','retract']);
const MINROOT={crouch:20,dig:200,push:150,rise1:300,rise2:200,burst:350,burst2:400,hang:250,fall:200,retract:100,landBurst:150,landSettle:20};
const LONG=new Set(['rise1','burst','burst2','hang']);
const FXSPEC={piece:2,leaf:3,crumbs:3,dust:4,lines:3};
const ROOTC='aAegG',SHOEC='kuUvV';
export function lint(){
  const F=ANIM_ROOT.frames,errs=lintPoseFrames('root',F,{minFrames:NAMES.length,turnsMax:6});
  if(F.length!==NAMES.length)errs.push(`root: ${F.length} frames, the wiring note documents ${NAMES.length}`);
  if(ANIM_ROOT.soleRow!==35||ANIM_ROOT.groundRow!==36||ANIM_ROOT.cellH!==72)errs.push('root: the cell is 32x72 with soleRow 35 and groundRow 36 (the wiring note offsets the cell by them)');
  const known=new Set(['.',...Object.keys(MB)]);
  /* reference hat and sprout pixel counts on the plain rest body */
  const cnt=(g,set)=>g.reduce((s,r)=>s+r.filter(c=>set.includes(c)).length,0);
  const REF={crown:cnt(compose({lv:'rest',dir:[0,0],stage:0,air:1,hat:'crown'}),'YoH'),party:cnt(compose({lv:'rest',dir:[0,0],stage:0,air:1,hat:'party'}),'YoHw'),
    sprout:cnt(compose({lv:'rest',dir:[0,0],stage:3,air:1}),'nT')};
  F.forEach((f,fi)=>{
    const E=m=>errs.push(`root[${fi}] ${f.name}: ${m}`),CH=f.cellH||48;
    if(f.cellH!==ANIM_ROOT.cellH)E(`cellH is ${f.cellH}, every root frame uses the ${ANIM_ROOT.cellH}-row cell`);
    if(f.name!==NAMES[fi])E(`must be named '${NAMES[fi]}'`);
    if(f.baked)E('must not be baked: compose draws the face, sprout and hat');
    if(!Array.isArray(f.feet)||f.feet.length)E('feet must be [] (the shoes are in the over layer)');
    if(!f.v||!f.v[0]||!f.over||!f.over.rows)return E('needs body rows and an over layer');
    const rows=f.v[0],h=rows.length,bb=f.y0+h-1,body=(x,y)=>{const r=rows[y-f.y0];return r&&x>=f.x0&&x<f.x0+r.length?r[x-f.x0]:'.'};
    const O=f.over,ov=(x,y)=>{const r=O.rows[y-O.y0];return r&&x>=O.x0&&x<O.x0+r.length?r[x-O.x0]:'.'};
    // shoes
    if(!Array.isArray(f.shoes)||f.shoes.length!==2)return E('needs two shoe boxes [x,y,w,h]');
    const inShoe=(x,y)=>f.shoes.some(([sx,sy,sw,sh])=>x>=sx&&x<sx+sw&&y>=sy&&y<sy+sh);
    let sole=-1;
    f.shoes.forEach(([sx,sy,sw,sh],i)=>{
      if(sx<0||sy<0||sx+sw>32||sy+sh>CH)return E(`shoe ${i} box leaves the canvas`);
      const n={};let top=99,vlow=-1;
      for(let y=sy;y<sy+sh;y++)for(let x=sx;x<sx+sw;x++){const c=ov(x,y);if(SHOEC.includes(c)){n[c]=(n[c]||0)+1;top=Math.min(top,y)}if(c==='V')vlow=Math.max(vlow,y)}
      if(![...Array(sw).keys()].some(i=>SHOEC.includes(ov(sx+i,sy)))||![...Array(sw).keys()].some(i=>ov(sx+i,sy+sh-1)==='V'))E(`shoe ${i} box [${sx},${sy},${sw},${sh}] is not tight (top row needs shoe px, bottom row the sole)`);
      if(!(n.k>=12&&n.u>=2&&n.U>=8&&n.v>=2&&n.V>=4))E(`shoe ${i} is not a whole shoe (k ${n.k|0}, u ${n.u|0}, U ${n.U|0}, v ${n.v|0}, V ${n.V|0})`);
      if(top-bb<-1||top-bb>1)E(`shoe ${i} top row ${top} must be within 1 row of the body's last row ${bb}`);
      sole=Math.max(sole,vlow);
      if(GROUNDED.has(f.name)&&vlow!==(f.name==='dig'?36:35))E(`shoe ${i} sole row ${vlow}, a ground frame stands on ${f.name==='dig'?36:35}`);
    });
    if(f.sole!==sole)E(`sole is ${f.sole}, the lowest sole (V) row is ${sole}`);
    if(GROUNDED.has(f.name)?f.ground!==ANIM_ROOT.groundRow:f.ground!==null)E(`ground must be ${GROUNDED.has(f.name)?ANIM_ROOT.groundRow:'null'}`);
    if(!GROUNDED.has(f.name)&&(sole<34||sole>36))E(`air frame sole row ${sole} outside 34..36`);
    // the over layer never paints the body, except the shoes over its bottom outline
    for(let y=0;y<CH;y++)for(let x=0;x<32;x++){const c=ov(x,y);if(c==='.'||body(x,y)==='.')continue;
      if(!(inShoe(x,y)&&SHOEC.includes(c)&&y>=bb-1)){E(`over '${c}' paints the body at ${x},${y}`);break}}
    // roots
    const isRoot=(x,y)=>{const c=ov(x,y);return ROOTC.includes(c)||(c==='u'&&!inShoe(x,y))},isShoe=(x,y)=>inShoe(x,y)&&SHOEC.includes(ov(x,y));
    const seen=new Set(),comps=[];
    for(let y=0;y<CH;y++)for(let x=0;x<32;x++){if(!isRoot(x,y)||seen.has(y*64+x))continue;
      const st=[[x,y]],cells=[];let shoe=false;seen.add(y*64+x);
      while(st.length){const [a,b]=st.pop();cells.push([a,b]);for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){if(!i&&!j)continue;const X=a+i,Y=b+j;
        if(isShoe(X,Y))shoe=true;if(isRoot(X,Y)&&!seen.has(Y*64+X)){seen.add(Y*64+X);st.push([X,Y])}}}
      comps.push({cells,shoe})}
    for(const c of comps){if(c.cells.length===1)E(`orphan root pixel '${ov(...c.cells[0])}' at ${c.cells[0].join(',')} (lone specks must be v or b)`);
      else if(!c.shoe&&c.cells.length>16)E(`a root clump of ${c.cells.length} px at ${c.cells[0].join(',')} floats free of the shoes`)}
    const attached=comps.filter(c=>c.shoe).flatMap(c=>c.cells);
    if(attached.length<MINROOT[f.name])E(`${attached.length} root px touch the shoes, want at least ${MINROOT[f.name]}`);
    if(GREEN.has(f.name)&&attached.filter(([x,y])=>ov(x,y)==='G').length<2)E('needs fresh green tips (G) on its roots');
    const deep=Math.max(...attached.map(c=>c[1]))-sole;
    if(deep>40)E(`roots reach ${deep} rows below the soles (max 40)`);
    if(LONG.has(f.name)&&deep<22)E(`roots reach only ${deep} rows below the soles, want 22..40 (about a body height)`);
    if(f.name==='fall'&&!attached.some(([x,y])=>y<f.shoes[0][1]-4))E('the roots must stream up past the body');
    if(GROUNDED.has(f.name)&&!attached.some(([x,y])=>y>ANIM_ROOT.groundRow))E('the roots must reach into the ground');
    // compose
    for(const flip of [0,1])for(const [tag,extra] of [['plain',{}],['scared',{face:'scared'}],['huh',{face:'huh'}],['crown',{hat:'crown'}],['party',{hat:'party'}],['stage0',{stage:0}],['sprout',{stage:3}]]){
      const look={pose:'root:'+fi,flip,dir:[0,0],stage:0,air:1,...extra},g=compose(look),T=`${tag}${flip?' flipped':''}`;
      if(g.length!==CH||g.some(r=>r.length!==32)){E(`${T}: compose is not 32x${CH}`);continue}
      if(g.some(r=>r.some(c=>!known.has(c)))){E(`${T}: unknown char`);continue}
      const X=x=>flip?31-x:x;
      // every authored pixel is drawn (the face, sprout and hat may only cover body fill)
      let lost=0;for(let y=0;y<CH;y++)for(let x=0;x<32;x++){const o=ov(x,y),b=body(x,y),want=o!=='.'?o:b;if(want==='.')continue;const got=g[y][X(x)];if(got!==want&&!'rpR'.includes(want)&&!(tag==='crown'||tag==='party'||tag==='sprout'))lost++}
      if(lost)E(`${T}: ${lost} authored outline/over px are not drawn as authored`);
      if(tag==='crown'||tag==='party'){const set=tag==='crown'?'YoH':'YoHw',n=cnt(g,set);if(n!==REF[tag])E(`${T}: the hat draws ${n} px, whole is ${REF[tag]} (clipped?)`);
        const a=compose({...look,hat:undefined}),hc=[];for(let y=0;y<CH;y++)for(let x=0;x<32;x++)if(a[y][x]!==g[y][x])hc.push([x,y]);
        const brim=Math.max(...hc.map(c=>c[1])),xs=[...new Set(hc.map(c=>c[0]))],gaps=xs.map(x=>{for(let y=0;y<CH;y++)if(a[y][x]!=='.')return y-brim-1;return CH});
        if(Math.max(...gaps)>1)E(`${T}: the hat floats (brim ${brim})`);
        if(hc.some(([x,y])=>y>=f.cy-6&&y<=f.cy))E(`${T}: the hat covers the eyes`)}
      if(tag==='sprout'){const n=cnt(g,'nT');if(n!==REF.sprout)E(`${T}: the stage 3 sprout draws ${n} px, whole is ${REF.sprout} (clipped?)`)}
    }
  });
  // FX sprites
  for(const [k,nf] of Object.entries(FXSPEC)){const S=ROOT_FX[k],E=m=>errs.push(`ROOT_FX.${k}: ${m}`);
    if(!Array.isArray(S)||S.length!==nf){E(`needs ${nf} frames`);continue}
    const dims=new Set(S.map(fr=>fr.length+'x'+(fr[0]||'').length));if(dims.size!==1)E(`frames differ in size (${[...dims].join(', ')})`);
    S.forEach((fr,i)=>{const w=fr[0].length,h=fr.length;
      if(!fr.every(r=>typeof r==='string'&&r.length===w))return E(`frame ${i} rows must be equal-length strings`);
      if(w>12||h>10)E(`frame ${i} is ${w}x${h}, max 12x10`);
      let px=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=fr[y][x];if(c==='.')continue;px++;
        if(!known.has(c))E(`frame ${i} unknown char '${c}'`);
        if(k==='lines'&&c!=='b')E(`frame ${i} lines are b only, found '${c}'`);
        if(k!=='crumbs'){let nb=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)if((a||b)&&fr[y+b]&&fr[y+b][x+a]&&fr[y+b][x+a]!=='.')nb++;if(!nb)E(`frame ${i} orphan pixel at ${x},${y}`)}}
      if(!px)E(`frame ${i} is empty`)})}
  for(const k of Object.keys(ROOT_FX))if(!(k in FXSPEC))errs.push(`ROOT_FX.${k}: not documented`);
  return errs;
}
if(import.meta.url===`file://${process.argv[1]}`){const e=lint();if(e.length){console.log(e.length+' problem'+(e.length>1?'s':'')+':\n  '+e.join('\n  '));process.exit(1)}console.log('root lint green: '+ANIM_ROOT.frames.length+' frames, '+Object.keys(ROOT_FX).length+' fx sprites')}
