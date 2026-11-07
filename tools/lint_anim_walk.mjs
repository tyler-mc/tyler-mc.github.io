#!/usr/bin/env node
/* Lint for mascot/anim_walk.js (the Wake Up player's locomotion set). Run: node tools/lint_anim_walk.mjs  (prints the feet table, exits 1 on a problem).
   tools/test_mascot.mjs calls lint(), which returns a list of problems (empty = green). Rules:
   - the structural pose-frame rules of lintPoseFrames on every frame (it also checks the face drawn on the mirrored frame, flip:1), at least 10 frames;
   - every body variant is grounded: its last row is row 41;
   - two feet per frame, 1 to 3 px from the body, not touching it or each other. A planted foot is 2 rows on rows 42..43; a lifted foot ends on row 41 or 42
     (lifted at most 2 px) and starts no higher than row 40. Every frame has a planted foot; the contact frames (0, 3) and stopSettle (7) have both planted;
   - the cycle (frames 0..5, feet[0] = foot A, feet[1] = foot B in every cycle frame) does not slide: whenever a foot is planted in two consecutive frames
     (5 -> 0 included) its box x moves back by exactly WALK_STRIDE_PX, and each foot is planted in 4 frames in a row (contact, down, pass, the other contact)
     and lifted in the other 2; planted cycle feet are 4 px wide (the box x is the heel of a heel strike and the toe of a toe-off, so the pivot does not slide);
   - the bob: downA/downB are 1 row shorter than their contact frame, passA/passB 1 row taller;
   - contactB is its own drawing, not contactA or its mirror (silhouettes differ by 8 px or more both ways);
   - every frame composes (atlas.js compose) to a 32x48 grid of known palette chars, flipped or not, with sprout stages 0..4, both hats, and face 'scared';
     the head top leaves room for sprout stage 4 and a hat (row 13 or lower) and 1 px of canvas on each side;
   - composed with face:'scared' and a crown or party hat (flip 0 and 1), every pixel in the 1 px ring around the face (eye boxes and the scared mouth) is
     body colour or cheek, and the hat sits on the head: most of its bottom row rests on (or 1 px into) the body, and no hat pixel lands on the face or its ring. */
import {ANIM_WALK,WALK_STRIDE_PX} from '../mascot/anim_walk.js';
import {compose,MB} from '../mascot/atlas.js';
import {lintPoseFrames} from './lint_mascot_body.mjs';
const NAMES=['contactA','downA','passA','contactB','downB','passB','startLean','stopSettle','turn1','turn2'];
const BODYC='kprR',FILL='rpR';
const planted=([,fy,rows])=>fy===42&&rows.length===2;
function bodyCells(F){const s=new Set();F.v.forEach(rows=>rows.forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.')s.add((F.y0+y)*64+F.x0+x)}));return s}
const mirrorRows=rows=>rows.map(r=>[...r].reverse().join(''));
function sil(rows,x0,y0){const s=new Set();rows.forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.')s.add((y0+y)*64+x0+x)});return s}
const symdiff=(a,b)=>{let n=0;for(const k of a)if(!b.has(k))n++;for(const k of b)if(!a.has(k))n++;return n};
export function feetTable(){return ANIM_WALK.frames.map((F,i)=>`${String(i).padStart(2)} ${(NAMES[i]||'?').padEnd(10)} body rows ${F.y0}..${F.y0+F.v[0].length-1}  fcx ${F.fcx} cy ${F.cy}  feet ${(F.feet||[]).map(f=>`${planted(f)?'P':'L'}@${f[0]},${f[1]}`).join('  ')}`)}
export function lint(){
  const FR=ANIM_WALK.frames,errors=[];
  if(!Array.isArray(FR))return ['walk: frames must be an array'];
  if(WALK_STRIDE_PX!==6)errors.push(`walk: WALK_STRIDE_PX is ${WALK_STRIDE_PX}; the game advances one frame per 6 px`);
  errors.push(...lintPoseFrames('walk',FR,{minFrames:10}));
  FR.forEach((F,i)=>{const E=m=>errors.push(`walk[${i}] ${NAMES[i]||''}: ${m}`);if(!F.v||!F.v[0])return;
    for(const rows of F.v){const last=F.y0+rows.length-1;if(last!==41)E(`body's last row is ${last}, want 41`)}
    const w=F.v[0][0].length,xs=[F.x0,F.x0+w-1,...(F.feet||[]).flatMap(([x,,r])=>[x,x+r[0].length-1])];
    if(Math.min(...xs)<1||Math.max(...xs)>30)E('needs 1 px of canvas left and right');
    if(F.y0<13)E(`the head top (row ${F.y0}) leaves no room for sprout stage 4 or a hat (row 13 or lower)`);
    if(!Array.isArray(F.feet)||F.feet.length!==2){E('needs exactly two feet');return}
    const body=bodyCells(F),ext=[];
    F.feet.forEach(([fx,fy,rows],k)=>{const end=fy+rows.length-1;
      if(planted([fx,fy,rows])){}else if(end===43)E(`foot ${k} reaches row 43 but is not a 2-row foot on rows 42..43`);
      else if(end<41||end>42||fy<40)E(`foot ${k} is on rows ${fy}..${end}: a lifted foot ends on row 41 or 42 and starts on row 40 or lower`);
      let near=99;rows.forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]==='k')for(const c of body)near=Math.min(near,Math.max(Math.abs(c%64-(fx+x)),Math.abs(Math.floor(c/64)-(fy+y))))});
      if(near<1)E(`foot ${k} overlaps the body`);if(near>3)E(`foot ${k} floats ${near} px from the body (max 3)`);
      ext.push([fx,fx+rows[0].length-1,fy,end])});
    if(ext.length===2){const [a,b]=ext;if(a[0]<=b[1]+1&&b[0]<=a[1]+1&&a[2]<=b[3]+1&&b[2]<=a[3]+1)E('the feet touch or overlap')}
    if(!F.feet.some(planted))E('no planted foot');
    if((i===0||i===3||i===7)&&!F.feet.every(planted))E('both feet must be planted');
    // composes, every option
    for(const flip of [0,1])for(const stage of [0,1,2,3,4])for(const hat of [0,'crown','party'])for(const face of [0,'scared']){
      const g=compose({pose:'walk:'+i,flip,dir:[0,0],stage,hat,face});
      if(g.length!==48||g.some(r=>r.length!==32||r.some(c=>c!=='.'&&!MB[c]))){E(`compose(flip ${flip}, stage ${stage}, hat ${hat}, face ${face}) is not a 32x48 grid of palette chars`);return}}
    // face margin and hat, composed
    for(const flip of [0,1]){const cx=flip?33-F.fcx:F.fcx,cy=F.cy,face=new Set();
      for(const [a,b] of [[cx-8,cx-3],[cx+1,cx+6]])for(let y=cy-6;y<=cy;y++)for(let x=a;x<=b;x++)face.add(y*64+x);
      for(let y=cy+2;y<=cy+6;y++)for(let x=cx-3;x<=cx+2;x++)face.add(y*64+x);   // the scared mouth box (the widest mouth); the cheeks are lintPoseFrames' job
      const ring=new Set();for(const k of face){const y=Math.floor(k/64),x=k%64;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const q=(y+b)*64+x+a;if(!face.has(q))ring.add(q)}}
      const plain=compose({pose:'walk:'+i,flip,dir:[0,0],stage:0,face:'scared'});
      for(const hat of [0,'crown','party']){const g=hat?compose({pose:'walk:'+i,flip,dir:[0,0],stage:0,face:'scared',hat}):plain;
        const bad=[...ring].filter(q=>!(FILL+'c').includes(g[Math.floor(q/64)][q%64]));
        if(bad.length)E(`flip ${flip}${hat?' hat '+hat:''}: the scared face has no body colour around it at ${bad.slice(0,4).map(q=>`${q%64},${Math.floor(q/64)}`).join(' ')}`);
        if(!hat)continue;
        const hp=[];for(let y=0;y<48;y++)for(let x=0;x<32;x++)if(g[y][x]!==plain[y][x])hp.push([x,y]);
        if(!hp.length){E(`flip ${flip}: the ${hat} hat is not drawn`);continue}
        if(hp.some(([x,y])=>face.has(y*64+x)||ring.has(y*64+x)))E(`flip ${flip}: the ${hat} hat lands on the face`);
        const B=Math.max(...hp.map(p=>p[1])),x0=Math.min(...hp.map(p=>p[0])),x1=Math.max(...hp.map(p=>p[0])),brim=[];for(let x=x0;x<=x1;x++)brim.push([x,B]);   // both hats have a full-width bottom row
        const on=brim.filter(([x,y])=>BODYC.includes(plain[y][x])||BODYC.includes(plain[y+1][x]));
        if(on.length*2<brim.length)E(`flip ${flip}: the ${hat} hat floats (${on.length} of ${brim.length} brim px rest on the head)`)}}
  });
  // the cycle
  if(FR.length>=6){
    for(let i=0;i<6;i++){const a=FR[i],b=FR[(i+1)%6];if(!a.feet||!b.feet||a.feet.length!==2||b.feet.length!==2)continue;
      for(const k of [0,1]){const fa=a.feet[k],fb=b.feet[k];
        if(planted(fa)&&fa[2][0].length!==4)errors.push(`walk[${i}]: planted foot ${k} is ${fa[2][0].length} px wide, want 4 in the cycle`);
        if(planted(fa)&&planted(fb)&&fb[0]!==fa[0]-WALK_STRIDE_PX)errors.push(`walk ${i}->${(i+1)%6}: planted foot ${k} moves ${fb[0]-fa[0]} px, want -${WALK_STRIDE_PX} (no foot slide)`)}}
    for(const k of [0,1]){const p=[0,1,2,3,4,5].map(i=>FR[i].feet&&FR[i].feet[k]&&planted(FR[i].feet[k])?1:0),n=p.reduce((s,v)=>s+v,0);
      const runs=[0,1,2,3,4,5].filter(i=>p[i]&&!p[(i+5)%6]).length;
      if(n!==4||runs!==1)errors.push(`walk cycle: foot ${k} is planted in frames ${p.map((v,i)=>v?i:'').join('')}; want 4 frames in a row`)}
    for(const [c,d,s] of [[0,1,2],[3,4,5]]){const h=i=>FR[i].v[0].length;
      if(h(d)!==h(c)-1)errors.push(`walk: ${NAMES[d]} is ${h(d)} rows, want ${h(c)-1} (1 px below ${NAMES[c]})`);
      if(h(s)!==h(c)+1)errors.push(`walk: ${NAMES[s]} is ${h(s)} rows, want ${h(c)+1} (1 px above ${NAMES[c]})`)}
    {const A=FR[0],B=FR[3],sa=sil(A.v[0],A.x0,A.y0),sb=sil(B.v[0],B.x0,B.y0),wa=A.v[0][0].length,sm=sil(mirrorRows(A.v[0]),32-A.x0-wa,A.y0);
      if(symdiff(sa,sb)<8)errors.push('walk: contactB is (nearly) contactA; draw it lopsided');
      if(symdiff(sm,sb)<8)errors.push('walk: contactB is (nearly) the mirror of contactA; draw it lopsided')}
  }
  return errors;
}
if(import.meta.url===`file://${process.argv[1]}`){
  console.log(feetTable().join('\n'));
  const e=lint();if(e.length){console.log('\n'+e.length+' problem'+(e.length>1?'s':'')+':\n  '+e.join('\n  '));process.exit(1)}
  console.log('\nlint green');
}
