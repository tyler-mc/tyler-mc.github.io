#!/usr/bin/env node
/* Lint for mascot/anim_root.js (the Wake Up root jump for the redesigned character, plus the ROOT_FX particle sprites).
   Run: node tools/lint_anim_root.mjs   (tools/test_mascot.mjs also calls lint()).
   The root frames use a TALL cell: 40x96 (ANIM_ROOT.cellH 96, every frame cellH:96), soleRow 59 (= atlas SOLE, the plain sprite's sole row), groundRow 60.
   On top of lintPoseFrames (closed 1 px body outline, light, face margin plain AND mirrored, canvas bounds, over/feet format) it checks:
   - 12 frames in the documented order (each carries its name), never baked, cellH 96;
   - drift guard: v, x0, y0, cy, tip, ctr are BODY[lv] variant bv exactly, fcx 20; feet are FEET[ft] exactly (dig: 1 row lower); so a body.js/feet.js change shows up
     here instead of as a pop when the game switches between the plain sprite and a root frame;
   - arms: [150,30] on burst and burst2, the resting [210,330] elsewhere; `sole` is the lowest shoe row; ground frames have ground 60 and soles on 59 (dig 60),
     air frames ground null and soles on 57..61;
   - the over layer never paints a body or shoe pixel (checked on the data), an arm nub, the stem, a hat or any leaf stage (checked through compose: the nub
     pixels and the count of stem/leaf/hat colours match the plain BODY level with the same look);
   - roots (a A e g G u in the over layer) are 8-connected to a shoe, at least MINROOT[name] px; the airborne frames have fresh green tips (G); no orphan root
     pixel (lone specks must be v or b), no free clump over 16 px (only clods, root bits and leaves fly free); roots reach at most 34 rows below the soles, and
     rise1, burst, burst2 and hang at least 20 (about a body height); fall has roots streaming up beside the body; ground frames reach into the ground (row > 60);
   - compose() renders every frame plain and flip:1 with the plain, scared, huh and gape faces, crown and party hats, leaf stages 0..4 and the
     leaf lag ll +-3: a 40x96 grid of known
     palette chars, every over pixel drawn as authored, and every body pixel identical to the plain BODY level composed with the same look;
   - ROOT_FX: piece (2 frames), leaf (3), crumbs (3), dust (4), lines (3); frames of one sprite are the same size, at most 12x10, rows of known palette chars;
     no pixel without an 8-neighbour except in crumbs (its specks are intended); lines are b only. */
import {lintPoseFrames} from './lint_mascot_body.mjs';
import {ANIM_ROOT,ROOT_FX} from '../mascot/anim_root.js';
import {compose,MB,W,SOLE} from '../mascot/atlas.js';
import {BODY} from '../mascot/body.js';
import {FEET} from '../mascot/feet.js';
export const NAMES=['crouch','dig','push','rise1','rise2','burst','burst2','hang','fall','retract','landBurst','landSettle'];
const GROUNDED=new Set(['crouch','dig','landBurst','landSettle']),GREEN=new Set(['push','rise1','rise2','burst','burst2','hang','fall','retract']);
const MINROOT={crouch:20,dig:150,push:120,rise1:250,rise2:150,burst:250,burst2:300,hang:180,fall:120,retract:60,landBurst:120,landSettle:12};
const LONG=new Set(['rise1','burst','burst2','hang']),RAISED=new Set(['burst','burst2']);
const FXSPEC={piece:2,leaf:3,crumbs:3,dust:4,lines:3};
const ROOTC='aAegGu',HEADC='nThYoHwB',CH=96;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function lint(){
  const F=ANIM_ROOT.frames,errs=lintPoseFrames('root',F,{minFrames:NAMES.length});
  if(F.length!==NAMES.length)errs.push(`root: ${F.length} frames, the wiring note documents ${NAMES.length}`);
  if(ANIM_ROOT.soleRow!==SOLE||ANIM_ROOT.soleRow!==59||ANIM_ROOT.groundRow!==60||ANIM_ROOT.cellH!==CH)errs.push('root: the cell is 40x96 with soleRow 59 (= atlas SOLE) and groundRow 60 (the wiring note places the cell by them)');
  const known=new Set(['.',...Object.keys(MB)]);
  const cnt=(g,set)=>g.reduce((s,r)=>s+r.filter(c=>set.includes(c)).length,0);
  F.forEach((f,fi)=>{
    const E=m=>errs.push(`root[${fi}] ${f.name}: ${m}`);
    if(f.name!==NAMES[fi])E(`must be named '${NAMES[fi]}'`);
    if(f.cellH!==CH)E(`cellH is ${f.cellH}, every root frame uses the ${CH}-row cell`);
    if(f.baked)E('must not be baked: compose draws the face, leaf and hat');
    const L=BODY[f.lv];if(!L||!L.v[f.bv|0])return E(`lv '${f.lv}' bv ${f.bv} is not a BODY level`);
    if(!f.v||f.v.length!==1||!same(f.v[0],L.v[f.bv|0]))E(`v is not BODY.${f.lv} variant ${f.bv|0} (body.js changed? regenerate)`);
    for(const k of ['x0','y0','cy','tip','ctr'])if(!same(f[k],L[k]))E(`${k} ${JSON.stringify(f[k])} differs from BODY.${f.lv} ${JSON.stringify(L[k])}`);
    if(f.fcx!==20)E('fcx must be 20 (the plain face column)');
    const FT=FEET[f.ft],dy=f.name==='dig'?1:0;
    if(!FT)return E(`ft '${f.ft}' is not a FEET pose`);
    if(!same(f.feet,FT.feet.map(([x,y,r])=>[x,y+dy,r])))E(`feet are not FEET.${f.ft}${dy?' one row lower':''} (feet.js changed? regenerate)`);
    if(!same(f.arms,RAISED.has(f.name)?[150,30]:[210,330]))E(`arms must be ${RAISED.has(f.name)?'[150,30]':'[210,330]'}`);
    if(!f.over||!f.over.rows)return E('needs an over layer (the roots)');
    // occupancy
    const body=new Set(),shoe=new Set(),K=(x,y)=>y*64+x;
    f.v[0].forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.')body.add(K(f.x0+x,f.y0+y))});
    let sole=-1,shoeTop=99;for(const [x0,y0,rows] of f.feet)rows.forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.'){shoe.add(K(x0+x,y0+y));sole=Math.max(sole,y0+y);shoeTop=Math.min(shoeTop,y0+y)}});
    if(f.sole!==sole)E(`sole is ${f.sole}, the lowest shoe row is ${sole}`);
    if(GROUNDED.has(f.name)){if(f.ground!==ANIM_ROOT.groundRow)E(`ground must be ${ANIM_ROOT.groundRow}`);if(sole!==(f.name==='dig'?60:59))E(`a ground frame stands on row ${f.name==='dig'?60:59}, the soles are on ${sole}`)}
    else{if(f.ground!==null)E('ground must be null (air frame)');if(sole<57||sole>61)E(`air frame sole row ${sole} outside 57..61`)}
    const O=f.over,ov=(x,y)=>{const r=O.rows[y-O.y0];return r&&x>=O.x0&&x<O.x0+r.length?r[x-O.x0]:'.'};
    for(let y=0;y<CH;y++)for(let x=0;x<W;x++){const c=ov(x,y);if(c==='.')continue;if(body.has(K(x,y))||shoe.has(K(x,y))){E(`over '${c}' paints the ${body.has(K(x,y))?'body':'shoe'} at ${x},${y}`);break}}
    // roots
    const isRoot=(x,y)=>ROOTC.includes(ov(x,y)),isShoe=(x,y)=>shoe.has(K(x,y));
    const seen=new Set(),comps=[];
    for(let y=0;y<CH;y++)for(let x=0;x<W;x++){if(!isRoot(x,y)||seen.has(K(x,y)))continue;
      const st=[[x,y]],cells=[];let sh=false;seen.add(K(x,y));
      while(st.length){const [a,b]=st.pop();cells.push([a,b]);for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){if(!i&&!j)continue;const X=a+i,Y=b+j;
        if(isShoe(X,Y))sh=true;if(isRoot(X,Y)&&!seen.has(K(X,Y))){seen.add(K(X,Y));st.push([X,Y])}}}
      comps.push({cells,sh})}
    for(const c of comps){if(c.cells.length===1)E(`orphan root pixel '${ov(...c.cells[0])}' at ${c.cells[0].join(',')} (lone specks must be v or b)`);
      else if(!c.sh&&c.cells.length>16)E(`a root clump of ${c.cells.length} px at ${c.cells[0].join(',')} floats free of the shoes`)}
    const att=comps.filter(c=>c.sh).flatMap(c=>c.cells);
    if(att.length<MINROOT[f.name])E(`${att.length} root px touch the shoes, want at least ${MINROOT[f.name]}`);
    if(GREEN.has(f.name)&&att.filter(([x,y])=>ov(x,y)==='G').length<4)E('needs fresh green tips (G) on its roots');
    const deep=Math.max(...att.map(c=>c[1]))-ANIM_ROOT.soleRow;
    if(deep>34)E(`roots reach ${deep} rows below the soles (max 34)`);
    if(LONG.has(f.name)&&deep<20)E(`roots reach only ${deep} rows below the soles, want 20..34 (about a body height)`);
    if(f.name==='fall'&&!att.some(([x,y])=>y<shoeTop-8))E('the roots must stream up beside the body');
    if(GROUNDED.has(f.name)&&!att.some(([x,y])=>y>ANIM_ROOT.groundRow))E('the roots must reach into the ground');
    // compose
    for(const flip of [0,1])for(const [tag,extra] of [['plain',{}],['scared',{face:'scared'}],['huh',{face:'huh'}],['gape',{gape:3}],['crown',{hat:'crown',stage:3}],['party',{hat:'party',stage:4}],
        ...[0,1,2,3,4].map(s=>['stage'+s,{stage:s}]),['lag+3',{hat:'party',stage:4,ll:3}],['lag-3',{hat:'crown',stage:4,ll:-3}]]){
      const look={dir:[0,0],stage:0,air:1,arms:f.arms,flip,...extra},g=compose({...look,pose:'root:'+fi}),T=`${tag}${flip?' flipped':''}`;
      if(g.length!==CH||g.some(r=>r.length!==W)){E(`${T}: compose is not ${W}x${CH}`);continue}
      if(g.some(r=>r.some(c=>!known.has(c)))){E(`${T}: unknown char`);continue}
      const ref=compose({...look,lv:f.lv,bv:f.bv|0,ft:f.ft}),X=x=>flip?W-1-x:x;
      let lostO=0,bodyD=0;
      for(let y=0;y<CH;y++)for(let x=0;x<W;x++){const o=ov(x,y);if(o!=='.'&&g[y][X(x)]!==o)lostO++;
        if(y<64&&body.has(K(x,y))&&g[y][X(x)]!==ref[y][X(x)])bodyD++}
      if(lostO)E(`${T}: ${lostO} over px are not drawn as authored`);
      if(bodyD)E(`${T}: ${bodyD} body px differ from BODY.${f.lv} composed with the same look`);
      // arm nubs: every pixel the arms change on the plain level must look the same here
      const noArm=compose({...look,lv:f.lv,bv:f.bv|0,ft:f.ft,arms:[false,false]});let armD=0;
      for(let y=0;y<64;y++)for(let x=0;x<W;x++)if(ref[y][x]!==noArm[y][x]&&g[y][x]!==ref[y][x])armD++;
      if(armD)E(`${T}: ${armD} arm nub px are covered`);
      const n=cnt(g,HEADC),n0=cnt(ref,HEADC);if(n!==n0)E(`${T}: ${n} stem/leaf/hat px, the plain BODY.${f.lv} has ${n0} (the over layer covers head gear?)`);
    }
  });
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
