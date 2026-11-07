#!/usr/bin/env node
/* Lint for the authored shoe poses in mascot/feet.js (FEET[name] = {back, feet:[[x,y,rows],[x,y,rows]]}, feet[0] = the screen-left shoe). Run: node tools/lint_anim_feet.mjs
   tools/test_mascot.mjs calls lint() (an array of problems; empty = green). Checks:
   1. every required pose exists (compose falls back to `stand` for an unknown name, so a missing pose would fail silently) and has exactly two shoes;
   2. each shoe: equal-length rows of `.kuUvV`, one 8-connected blob, closed by its k outline (no fill pixel 4-touches clear or the rows' edge), a 1 px line (no 2x2 ink,
      no dead-end ink), no lone `u` or `V` pixel, a toe cap (u) and a sole (V), sized 8..14 wide x 4..9 tall, inside the 40x64 cell (and so inside it when flipped);
   3. `stand` is the approved shoe pair, unchanged;
   4. each shoe's lowest row matches SOLES (59 = on the ground; airborne poses state their rows relative to 59 there);
   5. composed on every BODY level, plain and flipped, with air:1: a 40x64 grid of known chars; a back:true pose changes no body, face or arm pixel; a back:false pose
      may cover only the lowest 6 body rows, never columns 17..22 and never the face box (rows cy-6..cy+9);
   6. the shoes READ: with no arms drawn, each shoe keeps at least MIN_VIS pixels on the rest body, and the pose shows at least 2 toe-cap (u) pixels
      (except kick, whose soles face the viewer). */
import {FEET} from '../mascot/feet.js';
import {BODY} from '../mascot/body.js';
import {compose,MB} from '../mascot/atlas.js';
import {KEYS} from './lint_mascot_body.mjs';

export const NAMES=['stand','together','tuck','loose','spread','splay','toeUp','walkA','walkB','walkC','walkD','kick','skid','dangle','dangleB','liftL','liftR','pigeon','sit','sleep'];
/* lowest shoe row [left, right]: 59 = the sole on the ground; e.g. 57 = two rows up, 61 = two rows lower (a hanging foot) */
export const SOLES={stand:[59,59],together:[59,59],tuck:[57,57],loose:[59,60],spread:[58,58],splay:[59,59],toeUp:[59,59],
  walkA:[58,59],walkB:[58,59],walkC:[57,59],walkD:[56,59],kick:[58,50],skid:[59,59],dangle:[61,61],dangleB:[61,57],
  liftL:[53,59],liftR:[59,53],pigeon:[59,59],sit:[59,59],sleep:[59,59]};
const AIR=new Set(['tuck','loose','spread','kick','dangle','dangleB']);
const STAND=[[4,53,["..kkkk......",".kuuuUkk....","kuuUUUUUkkk.","kuUUUUUUUUUk","kUUUUUUUUUvk",".kVVUUUUVVVk","..kkkkkkkkk."]],
  [24,53,["......kkkk..","....kkUuuuk.",".kkkUUUUUuuk","kUUUUUUUUUuk","kvUUUUUUUUUk","kVVVUUUUVVk.",".kkkkkkkkk.."]]];
const MIN_VIS=14,W=40,H=64;

function lintShoe(tag,f,E){
  if(!Array.isArray(f)||f.length!==3||!Number.isInteger(f[0])||!Number.isInteger(f[1])||!Array.isArray(f[2])||!f[2].length)return E(`${tag} must be [x, y, rows]`),false;
  const [fx,fy,rows]=f,w=rows[0].length,h=rows.length;
  if(!rows.every(r=>typeof r==='string'&&r.length===w&&/^[.kuUvV]+$/.test(r)))return E(`${tag} rows must be equal-length strings of .kuUvV`),false;
  const at=(x,y)=>y>=0&&y<h&&x>=0&&x<w?rows[y][x]:'.',solid=(x,y)=>at(x,y)!=='.';
  let x0=99,x1=-1,y0=99,y1=-1,n=0,start=null;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(solid(x,y)){n++;start=start||[x,y];x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}
  if(!n)return E(`${tag} is empty`),false;
  const bw=x1-x0+1,bh=y1-y0+1;
  if(bw<8||bw>14||bh<4||bh>9)E(`${tag} is ${bw}x${bh} (want 8..14 wide, 4..9 tall)`);
  if(fx+x0<0||fy+y0<0||fx+x1>=W||fy+y1>=H)E(`${tag} leaves the ${W}x${H} cell`);
  const seen=new Set([start+'']),st=[start];
  while(st.length){const [a,b]=st.pop();for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const k=[a+i,b+j]+'';if(solid(a+i,b+j)&&!seen.has(k)){seen.add(k);st.push([a+i,b+j])}}}
  if(seen.size!==n)E(`${tag} is not one 8-connected piece`);
  const N4=[[1,0],[-1,0],[0,1],[0,-1]];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=at(x,y);if(c==='.')continue;
    const edge=N4.some(([a,b])=>!solid(x+a,y+b));
    if(edge&&c!=='k')E(`${tag} fill '${c}' at ${x},${y} touches clear (the k outline must close the shoe)`);
    if(!edge&&c==='k')E(`${tag} ink at ${x},${y} is inside the shoe`);
    if(c==='k'){if(at(x+1,y)==='k'&&at(x,y+1)==='k'&&at(x+1,y+1)==='k')E(`${tag} 2x2 ink at ${x},${y}`);
      let n8=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)if((a||b)&&at(x+a,y+b)==='k')n8++;if(n8<2)E(`${tag} dead-end ink at ${x},${y}`)}
    if(c==='u'||c==='V'){let m=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)if((a||b)&&at(x+a,y+b)===c)m++;if(!m)E(`${tag} lone '${c}' at ${x},${y}`)}}
  const cnt=c=>rows.join('').split(c).length-1;
  if(cnt('u')<2)E(`${tag} has no toe cap (u)`);if(cnt('V')<2)E(`${tag} has no sole (V)`);if(cnt('U')<6)E(`${tag} has too little U fill`);
  return fy+y1;
}

export function lint(){
  const out=[];
  for(const name of NAMES)if(!FEET[name])out.push(`${name}: missing`);
  for(const name of Object.keys(FEET))if(!NAMES.includes(name))out.push(`${name}: not a known pose (add it to NAMES and SOLES)`);
  const levels=KEYS.filter(k=>BODY[k]);
  FEET.__nofeet__={back:true,feet:[]};
  try{
  for(const name of NAMES){const F=FEET[name];if(!F)continue;const E=m=>out.push(`${name}: ${m}`);
    if(typeof F.back!=='boolean')E('back must be true or false');
    if(!Array.isArray(F.feet)||F.feet.length!==2){E('needs exactly two shoes');continue}
    const low=F.feet.map((f,i)=>lintShoe(i?'right shoe':'left shoe',f,E));
    if(low.some(v=>v===false))continue;
    const want=SOLES[name];if(want&&(low[0]!==want[0]||low[1]!==want[1]))E(`lowest shoe rows are ${low} (SOLES says ${want})`);
    if(!AIR.has(name)&&!low.includes(59))E('a grounded pose needs a sole on row 59');
    if(!AIR.has(name)&&low.some(v=>v>59))E('a grounded pose has a shoe below the ground row 59');
    for(const lv of levels){const L=BODY[lv];
      for(const flip of [0,1]){const s={dir:[0,0],stage:1,lv,air:1,flip},g=compose({...s,ft:name}),g0=compose({...s,ft:'__nofeet__'});
        if(g.length!==H||g.some(r=>r.length!==W||r.some(c=>c!=='.'&&!MB[c]))){E(`${lv}${flip?' flipped':''}: bad grid`);continue}
        const rows=L.v[0],by=L.y0,bottom=by+rows.length-1,cy=L.cy;
        let bad=0;
        for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(g0[y][x]==='.'||g[y][x]===g0[y][x])continue;
          const xa=flip?W-1-x:x;   /* the authored (unflipped) column */
          if(F.back||y<bottom-5||(xa>=17&&xa<=22)||(y>=cy-6&&y<=cy+9&&xa>=CXm(cy)-10&&xa<=CXm(cy)+9))bad++}
        if(bad)E(`${lv}${flip?' flipped':''}: the shoes change ${bad} body/face/arm pixel(s)`)}
      /* visibility on this level with no arms */
      const g=compose({dir:[0,0],stage:1,lv,air:1,ft:name,arms:[false,false]});let u=0;
      F.feet.forEach(([fx,fy,rws],i)=>{let vis=0;
        rws.forEach((r,y)=>{for(let x=0;x<r.length;x++){const c=r[x];if(c==='.')continue;
          const later=F.feet.slice(i+1).some(([gx,gy,gr])=>gr[fy+y-gy]&&gr[fy+y-gy][fx+x-gx]&&gr[fy+y-gy][fx+x-gx]!=='.');
          if(!later&&g[fy+y][fx+x]===c){vis++;if(c==='u')u++}}});
        if(lv==='rest'&&vis<MIN_VIS)E(`${i?'right':'left'} shoe shows only ${vis} px on the rest body (min ${MIN_VIS})`)});
      if(lv==='rest'&&name!=='kick'&&u<2)E(`only ${u} toe-cap pixel(s) show on the rest body`)}
  }
  }finally{delete FEET.__nofeet__}
  const S=FEET.stand;
  if(S&&JSON.stringify(S.feet)!==JSON.stringify(STAND))out.push('stand: must stay the approved shoe pair');
  if(S&&S.back!==true)out.push('stand: must be back:true');
  return out;
}
const CXm=()=>20;

if(import.meta.url===`file://${process.argv[1]}`){
  const p=lint();
  console.log(p.length?p.length+' problem(s):\n  '+p.join('\n  '):'feet lint green ('+NAMES.length+' poses)');
  process.exit(p.length?1:0);
}
