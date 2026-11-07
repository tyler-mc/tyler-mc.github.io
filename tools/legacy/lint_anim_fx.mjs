#!/usr/bin/env node
/* Lint for mascot/anim_fx.js (ANIM_FX effect sprites and FX_SPOT). Run: node tools/lint_anim_fx.mjs   (tools/test_mascot.mjs runs lint() too; [] = green)
   For every sprite:
     - it is a non-empty array of frames with the expected frame count (SPEC below); dustL and speedL must equal dust and speed with every row reversed;
     - every frame is a non-empty array of equal-length strings of palette chars (.BbYkrpRwmnTohcH), at most 10x10, and draws at least one pixel;
     - all frames of one sprite share one box (so the caller swaps frames without the anchor moving) and that box is trimmed: the union of
       the frames touches all four edges (a single frame may leave edges empty, because growth and drift are drawn inside the shared box);
     - no stray pixels: every drawn pixel has a drawn 8-neighbour. Exempt only where the sprite is meant to break into specks, and only when its
       key line in the data file carries a `// specks` comment: dust/dustL frames 2..3 and every puff frame;
     - heart frames hold a 5x5 heart, question is one 4x6 frame;
     - it composes: stamped on a blank 32x48 grid (atlas.js grid+stamp) and through compose() on the rest body and on every body level
       (KEYS from lint_mascot_body.mjs) at the top-left and bottom-right corners and at its FX_SPOT, the grid is 32x48 of palette chars,
       every sprite pixel is there, and every other pixel equals the same look without fx. FX_SPOT keeps the whole box on the canvas. */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {compose,grid,stamp,MB} from '../mascot/atlas.js';
import {ANIM_FX,FX_SPOT} from '../mascot/anim_fx.js';
import {KEYS} from './lint_mascot_body.mjs';

const PAL='.BbYkrpRwmnTohcH';
export const SPEC={dust:4,z:3,sweat:4,sparkle:4,drool:3,shock:2,tear:3,speed:3,impact:3,note:2,puff:3,heart:3,question:1,spark:3,dustL:4,speedL:3};
const SPECKS={dust:[2,3],dustL:[2,3],puff:[0,1,2]};
const SRC=readFileSync(new URL('../mascot/anim_fx.js',import.meta.url),'utf8');
const hasSpecks=n=>new RegExp(`\\b${n}\\s*:\\s*\\[\\s*//\\s*specks`).test(SRC)||(n.endsWith('L')&&hasSpecks(n.slice(0,-1)));

const px=f=>{const p=[];f.forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.')p.push([x,y,r[x]])});return p};
function bbox(f){let x0=99,y0=99,x1=-1,y1=-1;for(const [x,y] of px(f)){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}return {x0,y0,x1,y1}}

function shape(n,F,E){
  if(!Array.isArray(F)||!F.length)return E('is not a non-empty array of frames'),false;
  if(SPEC[n]!==undefined&&F.length!==SPEC[n])E(`has ${F.length} frames, expected ${SPEC[n]}`);
  let ok=true;
  F.forEach((f,i)=>{
    if(!Array.isArray(f)||!f.length||!f.every(r=>typeof r==='string'&&r.length===f[0].length&&r.length)){E(`[${i}] rows must be non-empty strings of equal length`);ok=false;return}
    const w=f[0].length,h=f.length;
    if(w>10||h>10)E(`[${i}] is ${w}x${h}, max 10x10`);
    for(const r of f)for(const c of r)if(!PAL.includes(c)){E(`[${i}] unknown char '${c}'`);ok=false;return}
    if(!px(f).length)E(`[${i}] draws nothing`);
  });
  if(!ok)return false;
  const W=F[0][0].length,H=F[0].length;
  F.forEach((f,i)=>{if(f[0].length!==W||f.length!==H){E(`[${i}] is ${f[0].length}x${f.length}, frame 0 is ${W}x${H} (one box per sprite)`);ok=false}});
  if(!ok)return false;
  // trim: the union of all frames touches every edge of the box
  const u={x0:99,y0:99,x1:-1,y1:-1};
  for(const f of F){const b=bbox(f);u.x0=Math.min(u.x0,b.x0);u.y0=Math.min(u.y0,b.y0);u.x1=Math.max(u.x1,b.x1);u.y1=Math.max(u.y1,b.y1)}
  if(u.x0>0||u.y0>0||u.x1<W-1||u.y1<H-1)E(`box ${W}x${H} is not trimmed (all frames together use columns ${u.x0}..${u.x1}, rows ${u.y0}..${u.y1})`);
  // stray pixels (8-neighbour)
  F.forEach((f,i)=>{
    const at=(x,y)=>y>=0&&y<f.length&&x>=0&&x<f[y].length?f[y][x]:'.';
    const lone=px(f).filter(([x,y])=>{for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)if((a||b)&&at(x+a,y+b)!=='.')return false;return true});
    if(!lone.length)return;
    const exempt=(SPECKS[n]||[]).includes(i)&&hasSpecks(n);
    if(!exempt)E(`[${i}] stray pixel${lone.length>1?'s':''} at ${lone.slice(0,4).map(([x,y])=>x+','+y).join(' ')}${SPECKS[n]&&!hasSpecks(n)?' (no // specks comment on its key line)':''}`);
  });
  return true;
}

function composes(n,F,E){
  const W=F[0][0].length,H=F[0].length,spot=FX_SPOT&&FX_SPOT[n];
  const inside=!!spot&&spot[0]>=0&&spot[1]>=0&&spot[0]+W<=32&&spot[1]+H<=48;
  if(!spot)E('has no FX_SPOT');
  else if(!inside)E(`FX_SPOT ${spot} puts the ${W}x${H} box off the canvas`);
  const spots=[[0,0],[32-W,48-H],...(inside?[spot]:[])];
  const looks=[{lv:'rest',bv:0},...KEYS.map(k=>({lv:k,bv:1})),{lv:'rest',bv:0,hat:'party',stage:3}];
  F.forEach((f,i)=>{
    // blank grid
    for(const [x,y] of spots){const g=grid(32,48);stamp(g,f,x,y);
      const miss=px(f).filter(([a,b,c])=>(g[y+b]&&g[y+b][x+a])!==c);if(miss.length)E(`[${i}] at ${x},${y} on a blank grid is clipped`)}
    // through compose
    for(const lk of looks)for(const [x,y] of spots){
      const base={dir:[0,0],stage:0,air:1,...lk},g0=compose(base),g=compose({...base,fx:[[n,i,x,y]]}),tag=`[${i}] at ${x},${y} on ${lk.lv}${lk.hat?' '+lk.hat:''}`;
      if(!Array.isArray(g)||g.length!==48||!g.every(r=>r.length===32)){E(`${tag}: grid is not 32x48`);continue}
      if(g.some(r=>r.some(c=>!(c in MB)&&c!=='.'))){E(`${tag}: unknown palette char`);continue}
      const own=new Map(px(f).map(([a,b,c])=>[(y+b)*32+x+a,c]));
      let miss=0,other=0;
      for(let yy=0;yy<48;yy++)for(let xx=0;xx<32;xx++){const k=yy*32+xx;if(own.has(k)){if(g[yy][xx]!==own.get(k))miss++}else if(g[yy][xx]!==g0[yy][xx])other++}
      if(miss)E(`${tag}: ${miss} sprite pixels not drawn`);
      if(other)E(`${tag}: ${other} pixels outside the sprite changed`);
    }
  });
}

export function lint(){
  const errors=[];
  for(const n of Object.keys(SPEC))if(!ANIM_FX[n])errors.push(`fx ${n}: missing`);
  for(const [n,F] of Object.entries(ANIM_FX)){const E=m=>errors.push(`fx ${n}${m.startsWith('[')?'':' '}${m}`);
    if(!shape(n,F,E))continue;
    if(n==='heart')F.forEach((f,i)=>{const b=bbox(f);if(b.x1-b.x0!==4||b.y1-b.y0!==4)E(`[${i}] heart is ${b.x1-b.x0+1}x${b.y1-b.y0+1}, expected 5x5`)});
    if(n==='question'&&(F.length!==1||F[0][0].length!==4||F[0].length!==6))E('must be one 4x6 frame');
    composes(n,F,E);
  }
  for(const [m,n] of [['dustL','dust'],['speedL','speed']])if(ANIM_FX[m]&&ANIM_FX[n]&&JSON.stringify(ANIM_FX[m])!==JSON.stringify(ANIM_FX[n].map(f=>f.map(r=>[...r].reverse().join('')))))errors.push(`fx ${m}: is not ${n} mirrored row by row`);
  for(const n of Object.keys(FX_SPOT||{}))if(!ANIM_FX[n])errors.push(`FX_SPOT ${n}: no such sprite`);
  return errors;
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const e=lint();
  console.log(e.length?e.join('\n'):`anim_fx: ${Object.keys(ANIM_FX).length} sprites, ${Object.values(ANIM_FX).reduce((a,F)=>a+F.length,0)} frames, all green`);
  process.exit(e.length?1:0);
}
