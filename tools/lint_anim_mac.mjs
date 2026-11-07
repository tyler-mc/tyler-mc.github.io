/* Lint for mascot/anim_mac.js (the dead Mac icon frames, re-anchored to the 40x64 cell): the body silhouette passes the structural rules, the overlay stays in the cell,
   and every frame composes (plain and flipped) to a valid grid. */
import {ANIM_MAC} from '../mascot/anim_mac.js';
import {compose,W,H} from '../mascot/atlas.js';
import {lintPoseFrames} from './lint_mascot_body.mjs';
export function lint(){
  const e=lintPoseFrames('mac',ANIM_MAC.frames,{baked:true,anyLight:true,turnsMax:6,minFrames:9});
  ANIM_MAC.frames.forEach((f,i)=>{for(const flip of [0,1]){const g=compose({pose:'mac:'+i,flip,air:1,dir:[0,0],stage:0});
    if(g.length!==H||g[0].length!==W)e.push(`mac[${i}] flip ${flip}: grid is ${g[0].length}x${g.length}`);
    if(!g.some(r=>r.some(c=>c!=='.')))e.push(`mac[${i}] flip ${flip}: draws nothing`)}});
  return e;
}
