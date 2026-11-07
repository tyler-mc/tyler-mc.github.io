/* Lint for mascot/anim_lean.js (the three hanging-swing lean frames, 12 / 25 / 40 degrees to the right; flip:1 gives the left leans).
   - lintPoseFrames rules (closed 1 px outline, no orphan p/R, highlight top left, shade bottom right, edge turns <= 6, face margin plain and mirrored).
     EXCEPTION: lintPoseFrames still carries the old-design foot rule ("foot N rows must be 1 to 3 equal-length strings with one run of k"), which rejects every
     brown shoe (the redesign's feet are 7-9 row shoes in k/u/U/v/V). That one message is dropped here and replaced by the shoe checks below.
   - the head's top row is exactly the 4 px cap at tip (the stem, leaf and hats attach there and the OS pins the pointer to its centre), nothing above it.
   - the lean angle (hold point = cap centre (tip.x+2, tip.y+.5) to the body's pixel centroid, from straight down) is in 6..20, 20..34, 34..50 degrees and grows.
   - the body area stays within 9% of BODY.T3 (the upright hang it swings from).
   - two shoes (k/u/U/v/V), each within 3 px of the body and at least 12 px of it showing (they tuck behind the body).
   - the whole sprite (body, shoes, default arms and the hang arms [250,290], every hat with its stem lift and every leaf stage) stays in the 40x64 cell, plain
     and flipped, computed from the stamp offsets (stamp() clips silently, so the composed grid alone cannot show it).
   - each hat sits on the head over the tip: it covers the cap, half its brim or more rests on body pixels, and the brim stays above the eyes.
   - compose() with the plain, party/crown + stage 4, and scared looks, plain and flipped: a 40x64 grid of known palette chars; the scared face's eyes and
     mouth keep 1 px of body colour around them (no arm, shoe or outline touching). */
import {ANIM_LEAN} from '../mascot/anim_lean.js';
import {compose,MB,W,H} from '../mascot/atlas.js';
import {ARMS} from '../mascot/arms.js';
import {LEAF} from '../mascot/leaf.js';
import {HATS} from '../mascot/hats.js';
import {BODY} from '../mascot/body.js';
import {lintPoseFrames} from './lint_mascot_body.mjs';
const ANG=[[6,20],[20,34],[34,50]];
const OLD_FOOT_RULE=/^lean\[\d\]: foot \d rows must be 1 to 3 equal-length strings with one run of k$/;
const area=rows=>rows.reduce((n,r)=>n+[...r].filter(c=>c!=='.').length,0);
export function lint(){
  const F=ANIM_LEAN.frames,e=lintPoseFrames('lean',F,{anyLight:false,turnsMax:6,minFrames:3}).filter(m=>!OLD_FOOT_RULE.test(m));
  if(F.length!==3)e.push(`lean: needs exactly 3 frames (12, 25, 40 degrees), has ${F.length}`);
  const A0=area(BODY.T3.v[0]),arms0=Object.keys(ARMS).map(Number);
  let lastAng=-1;
  F.forEach((L,i)=>{const E=m=>e.push(`lean[${i}]: ${m}`);
    const ok2=a=>Array.isArray(a)&&a.length===2&&a.every(Number.isInteger);
    if(!ok2(L.tip)||!ok2(L.ctr)){E('tip and ctr must be [x,y] integers');return}
    const rows=L.v[0],bw=rows[0].length,bh=rows.length,[tx,ty]=L.tip;
    const solid=(x,y)=>{const r=rows[y-L.y0];return !!r&&x>=L.x0&&x<L.x0+bw&&r[x-L.x0]!=='.'};
    // the cap
    if(L.y0!==ty)E(`the body's top row ${L.y0} must be the tip row ${ty}`);
    for(let x=L.x0;x<L.x0+bw;x++){const want=x>=tx&&x<=tx+3;if(solid(x,ty)!==want){E(`row ${ty} must be exactly the 4 px cap at x ${tx}..${tx+3}`);break}}
    for(let x=tx;x<=tx+3;x++)if(!solid(x,ty+1)){E(`the cap does not sit on the head (x ${x}, row ${ty+1} is empty)`);break}
    // the angle and the area
    let n=0,sx=0,sy=0;rows.forEach((r,y)=>{for(let x=0;x<bw;x++)if(r[x]!=='.'){n++;sx+=L.x0+x+.5;sy+=L.y0+y+.5}});
    const ang=Math.atan2(sx/n-(tx+2),sy/n-(ty+.5))*180/Math.PI;
    if(ANG[i]&&(ang<ANG[i][0]||ang>ANG[i][1]))E(`hangs at ${ang.toFixed(1)} degrees from the hold point, want ${ANG[i][0]}..${ANG[i][1]}`);
    if(ang<=lastAng)E('each frame must lean further than the one before');lastAng=ang;
    if(Math.abs(n-A0)/A0>.09)E(`area ${n} is ${((n-A0)/A0*100).toFixed(1)}% from T3 (${A0}), max 9%`);
    // shoes
    if(!Array.isArray(L.feet)||L.feet.length!==2){E('needs two shoes');return}
    const ext=[];   // [x0,y0,x1,y1] of everything stamped, for the cell bounds
    ext.push([L.x0,L.y0,L.x0+bw-1,L.y0+bh-1]);
    L.feet.forEach(([fx,fy,fr],j)=>{const w=fr[0].length;
      if(!fr.every(r=>r.length===w&&/^[.kuUvV]+$/.test(r)))E(`shoe ${j}: rows must be equal-length strings of . k u U v V`);
      ext.push([fx,fy,fx+w-1,fy+fr.length-1]);
      let near=99,shows=0;fr.forEach((r,yy)=>{for(let xx=0;xx<w;xx++)if(r[xx]!=='.'){const X=fx+xx,Y=fy+yy;if(!solid(X,Y))shows++;
        for(let y=0;y<bh;y++)for(let x=0;x<bw;x++)if(rows[y][x]!=='.')near=Math.min(near,Math.max(Math.abs(L.x0+x-X),Math.abs(L.y0+y-Y)))}});
      if(near>3)E(`shoe ${j} hangs ${near} px from the body (max 3)`);
      if(shows<12)E(`shoe ${j}: only ${shows} px show below the body (want 12+)`)});
    // arms (the same ray cast as compose), default pair and the OS hang pair, both flips
    const arm=(a0,fl)=>{const ang=fl?180-a0:a0;let best=null,bd=1e9;for(const k of arms0){const d=Math.abs(((ang-k)%360+540)%360-180);if(d<bd){bd=d;best=k}}
      const A=ARMS[best],rad=ang*Math.PI/180;let px=-1,py=-1;
      for(let t=0;t<48;t+=.5){const x=Math.round(L.ctr[0]+t*Math.cos(rad)),y=Math.round(L.ctr[1]-t*Math.sin(rad));if(solid(x,y)){px=x;py=y}else if(px>=0)break}
      if(px<0){E(`arm ${a0} (flip ${fl}) finds no body`);return null}
      const hx=Math.max(0,Math.min(W-A.rows[0].length,px-A.ax)),hy=Math.max(0,Math.min(H-A.rows.length,py-A.ay));return [hx,hy,hx+A.rows[0].length-1,hy+A.rows.length-1]};   /* compose slides a hand that would leave the cell inward */
    const armExt=fl=>[[210,330],[250,290]].flatMap(p=>p.map(a=>arm(a,fl))).filter(Boolean);
    // stem, hats and leaves
    const top=LEAF.stem.reduce((m,p)=>p[1]<m[1]?p:m,LEAF.stem[0]);
    for(const hn of [null,...Object.keys(HATS)]){const hat=hn&&HATS[hn],lift=hat?hat.lift|0:0;
      for(const [sx0,sy0] of LEAF.stem)ext.push([tx+sx0,ty+sy0,tx+sx0,ty+sy0]);
      if(hat)ext.push([tx-hat.ax,ty-hat.ay,tx-hat.ax+hat.rows[0].length-1,ty-hat.ay+hat.rows.length-1]);
      if(lift)ext.push([tx+top[0],ty+top[1]-lift,tx+top[0],ty+top[1]-1]);
      for(const S of LEAF.stages)ext.push([tx+S.ox,ty+S.oy-lift,tx+S.ox+S.rows[0].length-1,ty+S.oy-lift+S.rows.length-1]);
      if(hat){const by=ty-hat.ay+hat.rows.length-1,bx0=tx-hat.ax,bx1=bx0+hat.rows[0].length-1;let on=0;
        for(let x=bx0;x<=bx1;x++)if(solid(x,by+1)||solid(x,by))on++;
        if(on*2<bx1-bx0+1)E(`hat ${hn}: only ${on} of ${bx1-bx0+1} brim columns rest on the head`);
        for(let x=tx;x<=tx+3;x++)if(hat.rows[hat.ay]&&hat.rows[hat.ay][hat.ax+x-tx]==='.'){E(`hat ${hn} does not cover the cap`);break}
        if(by>=L.cy-7)E(`hat ${hn}: the brim (row ${by}) reaches the eyes (top row ${L.cy-6})`)}}
    for(const fl of [0,1]){const all=[...ext,...armExt(fl)].map(([a,b,c,d])=>fl?[W-1-c,b,W-1-a,d]:[a,b,c,d]);
      const bad=all.filter(([a,b,c,d])=>a<0||b<0||c>=W||d>=H);
      if(bad.length)E(`${fl?'flipped: ':''}the sprite leaves the ${W}x${H} cell (${bad.map(r=>r.join(',')).slice(0,3).join(' / ')})`)}
    // compose every look, plain and flipped
    for(const fl of [0,1])for(const [nm,lk] of [['plain',{}],['party',{hat:'party',stage:4}],['crown',{hat:'crown',stage:4}],['scared',{face:'scared'}],['hang arms',{arms:[250,290]}]]){
      const g=compose({pose:'lean:'+i,flip:fl,air:1,dir:[0,0],stage:0,...lk}),T=`${nm}${fl?' flipped':''}`;
      if(g.length!==H||g.some(r=>r.length!==W)){E(`${T}: grid is not ${W}x${H}`);continue}
      if(g.some(r=>r.some(c=>c!=='.'&&!MB[c])))E(`${T}: unknown palette char`);
      if(nm==='scared'){const cx=fl?W+1-L.fcx:L.fcx,cy=L.cy,face=new Set(),bad=[];
        for(const [x0,x1] of [[cx-8,cx-3],[cx+1,cx+6]])for(let y=cy-6;y<=cy;y++)for(let x=x0;x<=x1;x++)face.add(y*64+x);
        for(let y=cy+2;y<=cy+6;y++)for(let x=cx-3;x<=cx+2;x++)face.add(y*64+x);
        const cheek=new Set([cx-9,cx-8,cx+7,cx+8].map(x=>(cy+1)*64+x));   // the cheeks only need body colour under them (lintPoseFrames), no margin
        for(const k of face){const y=Math.floor(k/64),x=k%64;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const q=(y+b)*64+x+a;if(face.has(q)||cheek.has(q))continue;const c=g[y+b]&&g[y+b][x+a];if(!'rpR'.includes(c||'.'))bad.push(`${x+a},${y+b}`)}}
        if(bad.length)E(`${T}: the face needs 1 px of body colour around it: ${[...new Set(bad)].slice(0,5).join(' ')}`)}}
  });
  return e;
}
if(import.meta.url===`file://${process.argv[1]}`){const e=lint();console.log(e.length?e.join('\n'):'lint_anim_lean: green');
  for(const [i,L] of ANIM_LEAN.frames.entries()){let n=0,sx=0,sy=0;L.v[0].forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.'){n++;sx+=L.x0+x+.5;sy+=L.y0+y+.5}});
    console.log(`lean[${i}] tip ${L.tip} angle ${(Math.atan2(sx/n-(L.tip[0]+2),sy/n-(L.tip[1]+.5))*180/Math.PI).toFixed(1)} area ${n} face ${L.fcx},${L.cy} ctr ${L.ctr}`)}
  process.exit(e.length?1:0)}
