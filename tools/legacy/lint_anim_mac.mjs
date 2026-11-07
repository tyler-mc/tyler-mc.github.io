#!/usr/bin/env node
/* Lint for mascot/anim_mac.js (the dead old Mac falling, cracking and smoking in the crash sequence). Run: node tools/lint_anim_mac.mjs   (tools/test_mascot.mjs also calls lint()).
   On top of lintPoseFrames (closed 1 px outline, no orphan p/R, no 2x2 ink, palette, canvas bounds) it checks:
   - every frame is baked:true with an over layer, and the over layer stays on the 32x48 canvas;
   - the casing is rotated about the Mac's centre (16,29): its bounding-box centre is within 1 px of it, so the caller keeps one anchor;
   - the screen (the over's white 'w' pixels, at least 40) sits on the casing fill;
   - frame 0 composes to exactly the old composeMac icon (look.mac=1);
   - compose() renders every frame, plain and mirrored (flip:1), to a 32x48 grid of known palette chars, and every authored pixel lands on the canvas. */
import {lintPoseFrames} from './lint_mascot_body.mjs';
import {ANIM_MAC} from '../mascot/anim_mac.js';
import {compose,MB} from '../mascot/atlas.js';
const N=9;
export function lint(){
  const F=ANIM_MAC.frames,errs=lintPoseFrames('mac',F,{baked:true,anyLight:true,turnsMax:6,minFrames:N});
  if(F.length!==N)errs.push(`mac: ${F.length} frames, the wiring note covers ${N}`);
  F.forEach((f,fi)=>{
    const E=m=>errs.push(`mac[${fi}]: ${m}`);
    if(f.baked!==true)E('must be baked:true (the screen and face are drawn into the frame)');
    if(!f.v||!f.v[0])return;
    const rows=f.v[0],w=rows[0].length,h=rows.length;
    const body=(x,y)=>{const r=rows[y-f.y0];return r&&x>=f.x0&&x<f.x0+w?r[x-f.x0]:'.'};
    const cx=f.x0+w/2,cy=f.y0+h/2;
    if(Math.abs(cx-16)>1||Math.abs(cy-29)>1)E(`casing centre ${cx},${cy} is not on the rotation centre 16,29`);
    const O=f.over;if(!O||!Array.isArray(O.rows)||!O.rows.length){E('needs an over layer (screen, face, shadow)');return}
    const ow=O.rows[0].length;
    if(O.x0<0||O.y0<0||O.x0+ow>32||O.y0+O.rows.length>48)E(`over ${O.x0},${O.y0} ${ow}x${O.rows.length} leaves the 32x48 canvas`);
    let white=0;const off=[];
    O.rows.forEach((r,j)=>{for(let i=0;i<r.length;i++){const c=r[i];if(c==='.')continue;const x=O.x0+i,y=O.y0+j;
      if(x<0||y<0||x>31||y>47)off.push(`${x},${y}`);
      if(c==='w'){white++;if(body(x,y)==='.'||body(x,y)==='k')off.push(`screen ${x},${y} not on the casing fill`)}}});
    if(off.length)E(`over pixels misplaced: ${off.slice(0,6).join(' ')}`);
    if(white<40)E(`screen has only ${white} white px`);
    for(const flip of [0,1]){
      let g;try{g=compose({pose:'mac:'+fi,flip,dir:[0,0],stage:0,air:1})}catch(e){E(`compose throws${flip?' (flipped)':''}: ${e.message}`);continue}
      if(g.length!==48||g.some(r=>r.length!==32))E(`compose${flip?' (flipped)':''} is not 32x48`);
      for(const r of g)for(const c of r)if(c!=='.'&&!MB[c]){E(`compose${flip?' (flipped)':''} drew unknown char '${c}'`);break}
      // every authored pixel lands: count solid pixels in the composed grid against the union of body and over
      const want=new Set();rows.forEach((r,y)=>{for(let x=0;x<w;x++)if(r[x]!=='.')want.add((f.y0+y)*64+(flip?31-(f.x0+x):f.x0+x))});
      O.rows.forEach((r,j)=>{for(let i=0;i<r.length;i++)if(r[i]!=='.')want.add((O.y0+j)*64+(flip?31-(O.x0+i):O.x0+i))});
      let got=0;g.forEach((r,y)=>r.forEach((c,x)=>{if(c!=='.')got++}));
      if(got!==want.size)E(`compose${flip?' (flipped)':''} drew ${got} px, the frame has ${want.size}`);
    }
  });
  // frame 0 is the old composeMac icon, pixel for pixel, so the swap from look.mac to pose 'mac:0' shows no jump
  if(F[0]){const a=compose({pose:'mac:0',dir:[0,0],stage:0,air:1}).map(r=>r.join('')).join('\n'),b=compose({mac:1}).map(r=>r.join('')).join('\n');if(a!==b)errs.push('mac[0]: does not match composeMac pixel for pixel')}
  return errs;
}
if(import.meta.url===`file://${process.argv[1]}`){const e=lint();if(e.length){console.log(e.length+' problem(s):\n  '+e.join('\n  '));process.exit(1)}console.log('mac lint green')}
