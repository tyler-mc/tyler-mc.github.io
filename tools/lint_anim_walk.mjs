/* Lint for mascot/anim_walk.js: the walk is built from parts, so check that every look names an existing body level, shoe pose and arm bucket, that the four walk poses are
   all different drawings, that every look composes (plain and flipped) to a valid grid inside the cell with both shoes and a body, and that the body bob between looks is one row. */
import {WALK_LOOKS,WALK_START,WALK_STOP,WALK_STRIDE_PX} from '../mascot/anim_walk.js';
import {BODY} from '../mascot/body.js';
import {FEET} from '../mascot/feet.js';
import {ARMS} from '../mascot/arms.js';
import {compose,W,H} from '../mascot/atlas.js';
export function lint(){
  const e=[],all=[...WALK_LOOKS,WALK_START,WALK_STOP],snap=a=>Object.keys(ARMS).map(Number).some(k=>Math.abs(((a-k)%360+540)%360-180)<=15);
  if(WALK_LOOKS.length!==4)e.push('a stride is 4 looks');if(!(WALK_STRIDE_PX>=4&&WALK_STRIDE_PX<=10))e.push('WALK_STRIDE_PX out of range');
  all.forEach((l,i)=>{if(!BODY[l.lv])e.push(`look ${i}: no body level ${l.lv}`);if(!FEET[l.ft])e.push(`look ${i}: no feet pose ${l.ft}`);for(const a of l.arms||[])if(a!==false&&!snap(a))e.push(`look ${i}: arm ${a} is not near an authored bucket`)});
  const grids=WALK_LOOKS.map(l=>compose({...l,air:0,dir:[0,0],stage:0}));
  const key=g=>g.map(r=>r.join('')).join('/');
  if(new Set(grids.map(key)).size!==4)e.push('the four walk looks must all be different drawings');
  const bob=WALK_LOOKS.map(l=>BODY[l.lv].tip[1]);if(Math.max(...bob)-Math.min(...bob)>1)e.push('the body bob across a stride is more than 1 row');
  for(const l of all)for(const flip of [0,1]){const g=compose({...l,flip,air:0,dir:[0,0],stage:0});
    if(g.length!==H||g[0].length!==W)e.push(`${l.ft} flip ${flip}: grid is ${g[0].length}x${g.length}`);
    if(!g.some(r=>r.includes('U')))e.push(`${l.ft} flip ${flip}: no shoes drawn`)}
  return e;
}
