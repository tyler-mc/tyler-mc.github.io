#!/usr/bin/env node
/* Pixel-art lint for the authored mascot bodies in mascot/body.js. Run: node tools/lint_mascot_body.mjs [--partial]   (prints a table, exits 1 on any error; --partial lints only the levels present)
   tools/test_mascot.mjs calls lintBody() too.

   BODY[level] = {cy, v:[rows, rows, ...]}  where rows = array of equal-length strings, one char per pixel:
     '.' clear   'k' ink outline   'r' body   'p' highlight (top left)   'R' shade (bottom right)
   Placement (mascot/atlas.js compose): centred on column 16 (x0 = 16 - width/2), grounded so the LAST row is row 41, so y0 = 42 - height.
   cy is the face anchor row (eyes sit on rows cy-6..cy, mouth on cy+2..cy+5) and the sprout, hat and mask key off the top row.
   Levels run squash to stretch: S3 S2 S1 rest T1 T2 T3, plus 'breath' (rest with one or two rows less). Each level has 2 to 4 boil variants:
   same size, a few edge pixels moved, drawn in turn so the outline shimmers by design. */
export const LEVELS=['S3','S2','S1','rest','T1','T2','T3'];
export const KEYS=[...LEVELS,'breath'];
const CX=20,GROUND=57,CW=40,CHGT=64;   // the cell is 40x64: centre column 20, body bottom row 57
const SPEC={
  maxAreaDev:.06,        // silhouette pixels within 6% of rest variant 0 ...
  tallAreaDev:.09,       // ... except T1..T3, which may be 9% over so a stretched body stays round (Tyler, 2026-11-06: a round tomato beats exact volume)
  boil:[8,50],           // silhouette pixels that differ between two variants of one level (a visible slosh, not a tremor)
  stepMax:80,            // silhouette pixels that differ between neighbouring levels (variant 0)
  elbowsMax:30,          // L-shaped ink corners (kk over .k): lumps need some, a ragged outline has many
  asym0:40, asymN:48,    // left-right mirror mismatch of the silhouette: variant 0 / other variants (lopsided on purpose: it is a creature, not a fruit)
  turnsMax:4,            // direction changes of each side edge (a lump is a turn)
  notchMax:2,            // widest dip (px) allowed in the top two or bottom two rows: a two-bump head, a drip
};

const MB_CHARS='BbYkrpRwmnTohcHuUvVaAgGe';
const solid=c=>c!=='.'&&c!==undefined;
const fillc=c=>c==='r'||c==='p'||c==='R';
function place(L,v){const rows=L.v[v],w=rows[0].length,h=rows.length;
  if(L.x0!==undefined)return {rows,w,h,x0:L.x0,y0:L.y0};  // a lean frame states where it sits
  return {rows,w,h,x0:CX-w/2,y0:GROUND+1-h}}
function sil(P){const s=new Set();P.rows.forEach((r,y)=>{for(let x=0;x<P.w;x++)if(solid(r[x]))s.add((P.y0+y)*64+P.x0+x)});return s}
function symdiff(a,b){let n=0;for(const k of a)if(!b.has(k))n++;for(const k of b)if(!a.has(k))n++;return n}
function reversals(a){let last=0,n=0;for(let i=1;i<a.length;i++){const d=Math.sign(a[i]-a[i-1]);if(!d)continue;if(last&&d!==last)n++;last=d}return n}

function checkVariant(name,L,vi,out,lean=false,opts={}){
  const P=place(L,vi),{rows,w,h}=P,E=m=>out.push(`${name}[${vi}] ${m}`);
  if(!Array.isArray(rows)||!rows.every(r=>typeof r==='string'&&r.length===w))return E('rows must be strings of equal length'),null;
  if(!lean&&w%2)E(`width ${w} is odd (must be even so the mirror axis stays on the frame centre)`);
  if(w<(lean?14:18)||w>(lean?CW:34))E(`width ${w} outside ${lean?'14..'+CW:'18..34'}`);
  if(h<15||h>(lean?CHGT:36))E(`height ${h} outside 15..${lean?CHGT:36}`);
  const at=(x,y)=>y>=0&&y<h&&x>=0&&x<w?rows[y][x]:'.';
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(!'.kprR'.includes(rows[y][x])){E(`unknown char '${rows[y][x]}' at ${x},${y}`);return null}
  // rows and columns are one run each: no holes, no notches
  for(let y=0;y<h;y++){const s=rows[y].replace(/^\.+|\.+$/g,'');if(!s.length)E(`row ${y} is empty`);
    else if(s.includes('.')){const gaps=s.match(/\.+/g),ok=(y<2||y>=h-2)&&gaps.length===1&&gaps[0].length<=SPEC.notchMax;if(!ok)E(`row ${y} has a gap (only one dip of up to ${SPEC.notchMax} px, in the top or bottom two rows, is allowed)`)}}
  for(let x=0;x<w;x++){let col='';for(let y=0;y<h;y++)col+=rows[y][x];const s=col.replace(/^\.+|\.+$/g,'');if(s.includes('.')){const gaps=s.match(/\.+/g),ok=(x<2||x>=w-2)&&gaps.length===1&&gaps[0].length<=SPEC.notchMax;if(!ok)E(`column ${x} has a gap`)}}
  // closed outline: every silhouette edge cell is ink, and no fill is reachable from outside
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=at(x,y);if(!solid(c))continue;
    const edge=![[1,0],[-1,0],[0,1],[0,-1]].every(([a,b])=>solid(at(x+a,y+b)));
    if(edge&&c!=='k')E(`edge pixel ${x},${y} is '${c}', must be ink`);
    if(!edge&&c==='k')E(`ink pixel ${x},${y} is inside the body`)}
  // 1 px line: no 2x2 ink block, no dead-end ink pixel
  let elbows=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(at(x,y)!=='k')continue;
    if(at(x+1,y)==='k'&&at(x,y+1)==='k'&&at(x+1,y+1)==='k')E(`2x2 ink block at ${x},${y}`);
    let n8=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)if((a||b)&&at(x+a,y+b)==='k')n8++;
    if(n8<2)E(`dead-end ink pixel at ${x},${y}`);
    const hz=at(x-1,y)==='k'||at(x+1,y)==='k',vt=at(x,y-1)==='k'||at(x,y+1)==='k';
    const n4=[[1,0],[-1,0],[0,1],[0,-1]].filter(([a,b])=>at(x+a,y+b)==='k').length;
    if(n4===2&&hz&&vt)elbows++}
  // no orphan highlight or shade pixels; highlight top left, shade bottom right
  const seen=new Set(),comp={p:[],R:[]};
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=at(x,y);if((c!=='p'&&c!=='R')||seen.has(y*64+x))continue;
    const st=[[x,y]],cells=[];seen.add(y*64+x);
    while(st.length){const [a,b]=st.pop();cells.push([a,b]);for(const [i,j] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const q=(b+j)*64+a+i;   // 8-neighbour: the approved shading runs down the slopes as diagonal streaks
      if(at(a+i,b+j)===c&&!seen.has(q)){seen.add(q);st.push([a+i,b+j])}}}
    if(cells.length<2)E(`orphan '${c}' pixel at ${x},${y}`);comp[c].push(...cells)}
  const cxm=(w-1)/2,cym=(h-1)/2,mean=(a,i)=>a.reduce((s,p)=>s+p[i],0)/a.length;
  if(comp.p.length<6||comp.p.length>45)E(`highlight is ${comp.p.length} px (want 6..45; the approved concept has 8)`);
  else if(!opts.anyLight&&(mean(comp.p,0)>=cxm||mean(comp.p,1)>=cym))E('highlight is not in the top left');
  if(comp.R.length<12||comp.R.length>90)E(`shade is ${comp.R.length} px (want 12..90)`);
  else if(!opts.anyLight&&(mean(comp.R,0)<=cxm||mean(comp.R,1)<=cym))E('shade is not in the bottom right');
  // edge profile: a convex blob turns once on each side; the left and right edges must agree
  const lx=[],rx=[];for(let y=0;y<h;y++){const r=rows[y];lx.push(r.search(/[^.]/));rx.push(r.length-1-[...r].reverse().findIndex(c=>c!=='.'))}
  const Lr=reversals(lx),Rr=reversals(rx);
  const TM=opts.turnsMax||SPEC.turnsMax;
  if(Lr>TM)E(`left edge changes direction ${Lr} times (max ${TM})`);
  if(Rr>TM)E(`right edge changes direction ${Rr} times (max ${TM})`);
  if(elbows>SPEC.elbowsMax)E(`${elbows} L-shaped ink corners (max ${SPEC.elbowsMax})`);
  let asym=0;for(let y=0;y<h;y++)for(let x=0;x<w/2;x++)if(solid(at(x,y))!==solid(at(w-1-x,y)))asym++;asym*=2;
  const aMax=vi?SPEC.asymN:SPEC.asym0;if(!lean&&asym>aMax)E(`silhouette is ${asym} px off mirror-symmetric (max ${aMax})`);
  if(!opts.skipFace){
  // face: eyes (cx-8..cx-3, cx+1..cx+6, rows cy-6..cy) and the normal mouth (cx-2..cx+1, rows cy+2..cy+5) sit in body colour with 1 px to spare;
  // the wider scared and open mouths (cx-3..cx+2, rows cy+2..cy+6) and the cheeks (row cy+1, cx-9..cx-8 and cx+7..cx+8) must still be body colour
  const FC=lean?L.fcx:CX,cy=L.cy,face=new Set(),wide=[],X=x=>x-P.x0,Y=y=>y-P.y0;
  // (the four corners of an eye box are not drawn, but they count as face: they stay body colour and need no margin of their own)
  for(const [x0,x1] of [[FC-8,FC-3],[FC+1,FC+6]])for(let y=cy-6;y<=cy;y++)for(let x=x0;x<=x1;x++)face.add(y*64+x);
  for(let y=cy+2;y<=cy+5;y++)for(let x=FC-2;x<=FC+1;x++)face.add(y*64+x);
  const bad=[];
  for(const k of face){const y=Math.floor(k/64),x=k%64;
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){if(face.has((y+b)*64+x+a))continue;const c=at(X(x+a),Y(y+b));if(!fillc(c))bad.push(`${x+a},${y+b} ('${c}')`)}}
  if(bad.length)E(`face needs 1 px of body colour around it; not body colour: ${[...new Set(bad)].slice(0,6).join(' ')}${bad.length>6?' ...':''}`);
  for(let y=cy+2;y<=cy+6;y++)for(let x=FC-3;x<=FC+2;x++)wide.push([x,y]);
  for(const x of [FC-9,FC-8,FC+7,FC+8])wide.push([x,cy+1]);
  for(const [x,y] of wide)if(!fillc(at(X(x),Y(y)))){E(`wide mouth or cheek pixel ${x},${y} is '${at(X(x),Y(y))}', must be body colour`);break}
  }
  return {P,area:sil(P).size,elbows,asym,Lr,Rr,hl:comp.p.length,sh:comp.R.length};
}

export function lintBody(BODY,{complete=true}={}){
  const errors=[],rows=[];
  const info={};
  for(const k of KEYS){
    const L=BODY[k];
    if(!L){if(complete)errors.push(`${k}: missing`);continue}
    if(!Number.isInteger(L.cy))errors.push(`${k}: cy must be an integer`);
    if(!Array.isArray(L.v)||L.v.length<1||L.v.length>4){errors.push(`${k}: needs 1 to 4 boil variants`);continue}
    info[k]=L.v.map((_,i)=>checkVariant(k,L,i,errors));
    const dims=new Set(L.v.map(r=>r.length+'x'+r[0].length));
    if(dims.size>1)errors.push(`${k}: variants differ in size (${[...dims].join(', ')})`);
    if(info[k].every(Boolean)){
      const S=info[k].map(r=>sil(r.P));
      for(let i=0;i<S.length;i++)for(let j=i+1;j<S.length;j++){const d=symdiff(S[i],S[j]);
        if(d<SPEC.boil[0]||d>SPEC.boil[1])errors.push(`${k}: variants ${i} and ${j} differ by ${d} px (boil wants ${SPEC.boil[0]}..${SPEC.boil[1]})`)}
    }
  }
  const rest=info.rest&&info.rest[0];
  if(rest){
    const A0=rest.area;
    for(const k of KEYS)for(const [i,r] of (info[k]||[]).entries())if(r){const dev=(r.area-A0)/A0;
      const lim=k[0]==='T'||k==='breath'?SPEC.tallAreaDev:SPEC.maxAreaDev;
      if(Math.abs(dev)>lim)errors.push(`${k}[${i}]: area ${r.area} is ${(dev*100).toFixed(1)}% from rest (${A0}), max ${lim*100}%`)}
    if(rest.P.w<24||rest.P.w>26||rest.P.h<24||rest.P.h>28)errors.push(`rest is ${rest.P.w}x${rest.P.h}; the approved concept is 24x26 (24..26 wide, 24..28 tall)`);
    const br=info.breath&&info.breath[0];
    if(br&&(br.P.h<rest.P.h-2||br.P.h>rest.P.h-1||Math.abs(br.P.w-rest.P.w)>1))errors.push('breath must be rest with one or two rows less (width within 1)');
  }
  // the ladder: taller each step, never wider, neighbours close enough to animate between
  for(let i=1;i<LEVELS.length;i++){const a=info[LEVELS[i-1]]&&info[LEVELS[i-1]][0],b=info[LEVELS[i]]&&info[LEVELS[i]][0];if(!a||!b)continue;
    if(b.P.h<=a.P.h)errors.push(`${LEVELS[i]} (${b.P.h} rows) must be taller than ${LEVELS[i-1]} (${a.P.h})`);
    if(b.P.h-a.P.h>3)errors.push(`${LEVELS[i-1]} to ${LEVELS[i]} jumps ${b.P.h-a.P.h} rows (max 3)`);
    if(b.P.w>a.P.w)errors.push(`${LEVELS[i]} (${b.P.w} wide) must not be wider than ${LEVELS[i-1]} (${a.P.w})`);
    const d=symdiff(sil(a.P),sil(b.P));if(d>SPEC.stepMax)errors.push(`${LEVELS[i-1]} to ${LEVELS[i]} changes ${d} px (max ${SPEC.stepMax})`)}
  for(const k of KEYS)for(const [i,r] of (info[k]||[]).entries())if(r)rows.push(`${k.padEnd(6)} v${i}  ${r.P.w}x${r.P.h}  area ${String(r.area).padStart(3)}  dev ${rest?((r.area-rest.area)/rest.area*100).toFixed(1).padStart(5):'  n/a'}%  edge turns L${r.Lr} R${r.Rr}  elbows ${String(r.elbows).padStart(2)}  asym ${String(r.asym).padStart(2)}  hl ${r.hl} sh ${r.sh}`);
  return {errors,table:rows};
}

/* Pose frames for tools/lint_anim_<name>.mjs (mascot/anim_<name>.js = {frames:[...]}): each frame is {x0,y0,v:[rows,...],feet?:[[x,y,rows],..],fcx,cy,nx?,ny?,baked?}
   with the same meaning as a LEAN frame (absolute 32x48 coordinates, body rows only unless baked). opts: baked (the face, sprout and hat are drawn into the rows: no face
   anchor needed, no face-margin check), anyLight (frames rotated or flipped, so the highlight need not be top left), turnsMax (edge direction changes per side, default 4),
   minFrames. Returns a list of problems. Runs every structural rule that applies to a body: closed 1 px outline, no orphan p/R, no 2x2 ink, canvas bounds, feet rules. */
export function lintPoseFrames(name,frames,opts={}){
  const errors=[];
  if(!Array.isArray(frames)){return [`${name}: frames must be an array`]}
  if(frames.length<(opts.minFrames||1))errors.push(`${name}: needs at least ${opts.minFrames||1} frame(s), has ${frames.length}`);
  frames.forEach((L,fi)=>{
    const tag=`${name}[${fi}]`,E=m=>errors.push(`${tag}: ${m}`),CH=L.cellH||CHGT;   // a frame may declare a taller cell (cellH)
    for(const f of ['x0','y0'])if(!Number.isInteger(L[f]))E(`${f} must be an integer`);
    if(!opts.baked)for(const f of ['fcx','cy'])if(!Number.isInteger(L[f]))E(`${f} must be an integer (where the face is drawn)`);
    if(!Array.isArray(L.v)||L.v.length<1||L.v.length>3){E('needs 1 to 3 body variants in v');return}
    const probs=[];const infos=L.v.map((_,i)=>checkVariant(tag,L,i,probs,true,{skipFace:!!opts.baked,anyLight:!!opts.anyLight,turnsMax:opts.turnsMax}));probs.forEach(m=>errors.push(m));
    if(!infos.every(Boolean))return;
    const P=infos[0].P;
    if(new Set(L.v.map(r=>r.length+'x'+r[0].length)).size>1)E('variants differ in size');
    if(P.x0<0||P.y0<0||P.x0+P.w>CW||P.y0+P.h>CH)E(`the body leaves the ${CW}x${CH} canvas`);
    if(!opts.baked&&Number.isInteger(L.fcx)){   // flip:1 mirrors the body (x -> 31-x) and draws the face at 33-fcx: the mirrored face must fit too
      const M={...L,x0:CW-L.x0-P.w,fcx:CW+1-L.fcx,v:L.v.map(r=>r.map(x=>[...x].reverse().join('')))};
      const pm=[];L.v.forEach((_,i)=>checkVariant(tag+' flipped',M,i,pm,true,{anyLight:true,turnsMax:opts.turnsMax}));pm.forEach(m=>errors.push(m));
    }
    if(L.over!==undefined){   // an overlay drawn on top of the body rows: any palette char, so faces, screens and shadows can live there
      const O=L.over;
      if(!O||!Number.isInteger(O.x0)||!Number.isInteger(O.y0)||!Array.isArray(O.rows)||!O.rows.length)E('over must be {x0,y0,rows}');
      else{const w=O.rows[0].length;
        if(!O.rows.every(r=>typeof r==='string'&&r.length===w))E('over rows must be equal-length strings');
        else{for(const r of O.rows)for(const c of r)if(c!=='.'&&!MB_CHARS.includes(c))E(`over has unknown palette char '${c}'`);
          if(O.x0<0||O.y0<0||O.x0+w>CW||O.y0+O.rows.length>CH)E(`over leaves the ${CW}x${CH} canvas`)}}
    }
    if(L.feet!==undefined){
      if(!Array.isArray(L.feet))E('feet must be an array of [x,y,rows]');
      else L.feet.forEach((f,i)=>{
        if(!Array.isArray(f)||f.length!==3||!Number.isInteger(f[0])||!Number.isInteger(f[1])||!Array.isArray(f[2])){E(`foot ${i} must be [x, y, rows]`);return}
        const [fx,fy,rows]=f,w=rows[0]&&rows[0].length;
        if(!rows.length||rows.length>9||!rows.every(r=>typeof r==='string'&&r.length===w&&/^[.kuUvV]+$/.test(r)&&/[kuUvV]/.test(r)))E(`foot ${i} rows must be 1 to 9 equal-length strings of shoe palette chars .kuUvV`);
        else if(w<3||w>14)E(`foot ${i} is ${w} px wide (want 3 to 14)`);
        else if(fx<0||fy<0||fx+w>CW||fy+rows.length>CH)E(`foot ${i} leaves the canvas`);
      });
    }
  });
  return errors;
}

if(import.meta.url===`file://${process.argv[1]}`){
  const {BODY}=await import('../mascot/body.js');
  const {errors,table}=lintBody(BODY,{complete:!process.argv.includes('--partial')});
  console.log(table.join('\n'));
  if(errors.length){console.log('\n'+errors.length+' problem'+(errors.length>1?'s':'')+':\n  '+errors.join('\n  '));process.exit(1)}
  console.log('\nlint green');
}
