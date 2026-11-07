/* Lint for mascot/anim_fx.js (effect sprites): every sprite is a non-empty array of equal-size frames of known palette chars, at most 12x10, with no empty edge rows or
   columns across the union of its frames; every FX_SPOT places its sprite fully inside the 40x64 cell; each frame composes. */
import {ANIM_FX,FX_SPOT} from '../mascot/anim_fx.js';
import {compose,MB,W,H} from '../mascot/atlas.js';
export function lint(){
  const e=[];
  for(const [name,frames] of Object.entries(ANIM_FX)){
    if(!Array.isArray(frames)||!frames.length){e.push(`${name}: no frames`);continue}
    const h=frames[0].length,w=frames[0][0].length;
    if(w>12||h>10)e.push(`${name}: ${w}x${h} is over 12x10`);
    let minx=99,maxx=-1,miny=99,maxy=-1;
    frames.forEach((fr,i)=>{
      if(fr.length!==h||!fr.every(r=>r.length===w))e.push(`${name}[${i}]: frames must all be ${w}x${h}`);
      fr.forEach((r,y)=>[...r].forEach((c,x)=>{if(c==='.')return;if(!MB[c])e.push(`${name}[${i}]: unknown char '${c}'`);minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y)}))});
    if(maxx<0)e.push(`${name}: draws nothing`);else if(minx>0||miny>0||maxx<w-1||maxy<h-1)e.push(`${name}: the box is not trimmed to its pixels`);
    const sp=FX_SPOT[name];if(!sp){e.push(`${name}: no FX_SPOT`);continue}
    if(sp[0]<0||sp[1]<0||sp[0]+w>W||sp[1]+h>H)e.push(`${name}: its spot ${sp} puts it outside the ${W}x${H} cell`);
    frames.forEach((_,i)=>{const g=compose({fx:[[name,i,sp[0],sp[1]]],air:1,dir:[0,0],stage:0});if(g.length!==H)e.push(`${name}[${i}] does not compose`)});
  }
  return e;
}
