#!/usr/bin/env node
/* Lint for the hand balls in mascot/hands.js (HANDS[name]={dy,ox,ay?,rows}, drawn by mascot/atlas.js compose() when look.hands is set).
   Run: node tools/lint_anim_hands.mjs   (tools/test_mascot.mjs runs lint() too; empty list = green).
   A hand is a little ball (no arm): a closed 1 px ink ring around a small fill with a highlight, sitting against the side of the body.
   The pattern itself must:
     - be at most 4x4, chars '.kprR', with something in its last column (the column on the body edge); ay (default 0) is the pattern row the edge is
       measured on (compose: row cy+dy+ay), 0 <= ay < height;
     - be ONE ball: its fill (r p R) is 4-connected and every fill pixel has ink or fill on all four sides inside the pattern (the ball's own outline closes it,
       nothing connects it to the body), every ink pixel touches the fill on a side (a ring: no stalks, stubs or tails), and it has a 'p' highlight in its top fill row.
   Then it is composed on the left, on the right and on both sides (look.hands='name', ['name',0], [0,'name']) over every body level
   (S3 S2 S1 rest T1 T2 T3 breath) and every boil variant, plus the hop (f:'stretch',hop:3: T3 lifted 6 px), with the plain face and with face:'scared',
   and with the crown and party hats, and must:
     - find a body edge on its row and stay inside the 32x48 canvas;
     - touch the body (a hand pixel on or 8-next to a body pixel);
     - leave the face alone: eyes, mouth (the wide scared box too) and cheeks are the same with and without the hand; a hat never draws over it;
     - be closed: no fill pixel (r p R) in or next to the hand touches clear on its 4 sides;
     - have no orphan pixels: every ink pixel of the hand has at least 2 ink 8-neighbours; a shade pixel has a shade 4-neighbour; a highlight pixel has a
       highlight 4-neighbour or sits inside the ball (all four sides are ball pixels: the 1 px highlight of a tiny ball);
     - keep a 1 px line where it meets the body: no new 2x2 ink block holding a hand pixel;
     - show: at least 4 of its pixels outside the body silhouette (2 for the tucked-in hands in OVER);
     - sit against the body, not in it: only its last two columns may lie over the body's fill (OVER hands may sit further in). */
import {HANDS} from '../mascot/hands.js';
import {compose} from '../mascot/atlas.js';
import {BODY} from '../mascot/body.js';
import {KEYS} from './lint_mascot_body.mjs';

/* hands meant to sit tucked in over the body edge: they may lie further over the body's fill and show less */
export const OVER=['shy'];
export const HAND_KEYS=['rest','reach','hold','wave1','wave2','wave3','pat','push','plant','cheer','grab','shy'];
const W=32,H=48,PAL='.BbYkrpRwmnTohcH',solid=c=>c!=='.'&&c!==undefined,fill=c=>c==='r'||c==='p'||c==='R';
const N4=[[1,0],[-1,0],[0,1],[0,-1]],N8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

/* the bodies a hand is tried on: every level and boil variant as posed with look.lv, and the hop (no lv: T3 drawn 6 px up, feet hidden) */
function cases(keys){const C=[];
  for(const lv of keys){const L=BODY[lv];if(L)for(let bv=0;bv<L.v.length;bv++)C.push({tag:`${lv} bv${bv}`,look:{lv,bv},L,bv,up:0})}
  const T=BODY.T3;if(T&&keys===KEYS)for(let bv=0;bv<T.v.length;bv++)C.push({tag:`hop bv${bv}`,look:{f:'stretch',hop:3,bv},L:T,bv,up:6});
  return C}
/* where compose() puts a hand: the same arithmetic as the hand block in atlas.js, on an authored body */
function handCells(Hd,{L,bv,up},side){
  const rows=L.v[bv%L.v.length],bw=rows[0].length,bh=rows.length,bx=16-bw/2,by=42-bh-up,cy=L.cy-up;
  const ins=(x,y)=>{const r=rows[y-by];return !!r&&r[x-bx]!==undefined&&r[x-bx]!=='.'};
  const yy=cy+(Hd.dy|0),ya=yy+(Hd.ay|0);let edge=-1;
  if(side<0){for(let x=0;x<W;x++)if(ins(x,ya)){edge=x;break}}else{for(let x=W-1;x>=0;x--)if(ins(x,ya)){edge=x;break}}
  if(edge<0)return {edge,cells:[],ins};
  const w=Hd.rows[0].length,ox=Hd.ox|0,x0=side<0?edge-w+1-ox:edge+ox,cells=[];
  Hd.rows.forEach((r,j)=>{for(let i=0;i<w;i++){const c=side<0?r[i]:r[w-1-i];if(c!=='.')cells.push([x0+i,yy+j,c])}});
  return {edge,cells,ins};
}

export function lintHand(name,Hd,keys=KEYS){
  const out=[],E=m=>out.push(`hand ${name}: ${m}`);
  if(!Hd)return [`hand ${name}: missing`];
  if(!Number.isInteger(Hd.dy)||(Hd.ox!==undefined&&!Number.isInteger(Hd.ox))||(Hd.ay!==undefined&&!Number.isInteger(Hd.ay)))E('dy, ox and ay must be integers');
  const R=Hd.rows,w=R&&R[0]&&R[0].length;
  if(!Array.isArray(R)||!R.length||!R.every(r=>typeof r==='string'&&r.length===w))return E('rows must be equal-length strings'),out;
  if(w>4||R.length>4)E(`is ${w}x${R.length}, max 4x4`);
  if((Hd.ay|0)<0||(Hd.ay|0)>=R.length)E(`ay ${Hd.ay} is not a row of the pattern`);
  for(const r of R)for(const c of r)if(!'.kprR'.includes(c))return E(`unknown char '${c}' (hands use . k r p R)`),out;
  if(!R.some(r=>r[w-1]!=='.'))E('the last column (the one on the body edge) is empty');
  if(out.length)return out;
  {// one ball: closed fill, ink only as its ring, a highlight on top
    const at=(x,y)=>R[y]&&R[y][x]||'.',F=[];for(let y=0;y<R.length;y++)for(let x=0;x<w;x++)if(fill(at(x,y)))F.push([x,y]);
    if(!F.length)E('has no fill: a hand is a ball with body-red fill');
    for(const [x,y] of F)if(N4.some(([a,b])=>at(x+a,y+b)==='.')){E(`fill ${x},${y} is not closed by the ball's own outline (nothing may connect it to the body)`);break}
    const seen=new Set([F[0]&&F[0].join()]),st=F.length?[F[0]]:[];while(st.length){const [x,y]=st.pop();for(const [a,b] of N4){const q=[x+a,y+b];if(fill(at(...q))&&!seen.has(q.join())){seen.add(q.join());st.push(q)}}}
    if(F.length&&seen.size!==F.length)E('the fill is in more than one piece');
    for(let y=0;y<R.length;y++)for(let x=0;x<w;x++)if(at(x,y)==='k'&&!N4.some(([a,b])=>fill(at(x+a,y+b)))){E(`ink ${x},${y} is not part of the ball's ring (no stalks or stubs)`);y=99;break}
    const top=F.length?Math.min(...F.map(f=>f[1])):0;if(!F.some(([x,y])=>y===top&&at(x,y)==='p'))E("needs a 'p' highlight in its top fill row");
  }
  if(out.length)return out;
  const keep=HANDS[name];HANDS[name]=Hd;   // compose() draws HANDS[name]: lint exactly the hand given
  try{
  for(const C of cases(keys)){const {L,bv}=C;
    for(const [face,hat] of [[undefined,undefined],['scared',undefined],[undefined,'crown'],[undefined,'party']])for(const [tag,hands,sides] of [['L',[name,0],[-1]],['R',[0,name],[1]],['both',name,[-1,1]]]){
      const where=`${C.tag}${face?' '+face:''}${hat?' '+hat:''} ${tag}`,F=m=>out.push(`hand ${name} (${where}): ${m}`);
      const look={dir:[0,0],stage:0,...C.look,face},g0=compose(look),g=compose({...look,hands});
      if(hat){const gn=compose({...look,hat}),gh=compose({...look,hat,hands});
        for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(g[y][x]!==g0[y][x]&&gh[y][x]!==g[y][x]&&gh[y][x]===gn[y][x]&&gn[y][x]!==g0[y][x]){F(`the ${hat} hat draws over the hand at ${x},${y}`);y=H;break}
        continue}
      if(g.length!==H||g.some(r=>r.length!==W))F('compose did not return 32x48');
      for(const r of g)for(const c of r)if(!PAL.includes(c)){F(`unknown palette char '${c}'`);break}
      const at=(x,y)=>g[y]&&g[y][x],own=new Set();let bad=false;
      for(const side of sides){const {edge,cells,ins}=handCells(Hd,C,side);
        if(edge<0){const a=(Hd.dy|0)+(Hd.ay|0);F(`no body on row cy${a>=0?'+':''}${a} to hang the ${side<0?'left':'right'} hand on`);bad=true;continue}
        for(const [x,y] of cells)if(x<0||y<0||x>=W||y>=H){F(`${side<0?'left':'right'} hand pixel ${x},${y} leaves the canvas`);bad=true;break}
        if(!cells.some(([x,y])=>ins(x,y)||N8.some(([a,b])=>ins(x+a,y+b))))F(`${side<0?'left':'right'} hand does not touch the body`);
        for(const [x,y] of cells)own.add(y*64+x)}
      if(bad)continue;
      // only hand cells may change
      for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(g[y][x]!==g0[y][x]&&!own.has(y*64+x)){F(`pixel ${x},${y} changed outside the hand`);y=H;break}
      // the face is untouched: eye boxes, the wide mouth box, cheeks
      const cx=16,cy=L.cy-C.up,fz=[];
      for(const [a,b] of [[cx-8,cx-3],[cx+1,cx+6]])for(let y=cy-6;y<=cy;y++)for(let x=a;x<=b;x++)fz.push([x,y]);
      for(let y=cy+2;y<=cy+6;y++)for(let x=cx-3;x<=cx+2;x++)fz.push([x,y]);
      for(const x of [cx-9,cx-8,cx+7,cx+8])fz.push([x,cy+1]);
      for(const [x,y] of fz)if(g[y][x]!==g0[y][x]){F(`covers the face at ${x},${y}`);break}
      // closed: no fill in or next to the hand touches clear
      const near=new Set(own);for(const k of own){const x=k%64,y=Math.floor(k/64);for(const [a,b] of N8)near.add((y+b)*64+x+a)}
      for(const k of near){const x=k%64,y=Math.floor(k/64);if(!fill(at(x,y)))continue;
        if(N4.some(([a,b])=>!solid(at(x+a,y+b)))){F(`fill pixel ${x},${y} ('${at(x,y)}') is open to the outside`);break}}
      // no orphans: ink has 2+ ink neighbours, no single R, a single p only inside the ball
      for(const k of own){const x=k%64,y=Math.floor(k/64),c=at(x,y);
        if(c==='k'){if(N8.filter(([a,b])=>at(x+a,y+b)==='k').length<2){F(`dead-end ink pixel at ${x},${y}`);break}}
        else if(c==='R'&&!N4.some(([a,b])=>at(x+a,y+b)===c)){F(`orphan 'R' pixel at ${x},${y}`);break}
        else if(c==='p'&&!N4.some(([a,b])=>at(x+a,y+b)==='p')&&!N4.every(([a,b])=>own.has((y+b)*64+x+a))){F(`orphan 'p' pixel at ${x},${y}`);break}}
      // 1 px line weight where the hand meets the body: no new 2x2 ink block that holds a hand pixel
      blk:for(const k of own){const x=k%64,y=Math.floor(k/64);for(const [a,b] of [[0,0],[-1,0],[0,-1],[-1,-1]]){const q=[[0,0],[1,0],[0,1],[1,1]].map(([i,j])=>[x+a+i,y+b+j]);
        if(q.every(([i,j])=>at(i,j)==='k')&&!q.every(([i,j])=>g0[j]&&g0[j][i]==='k')){F(`thick ink (2x2) where the hand meets the body at ${x+a},${y+b}`);break blk}}}
      // the ball shows: at least 4 of its pixels outside the body silhouette (2 for a tucked-in hand)
      const need=(OVER.includes(name)?2:4)*sides.length;
      if([...own].filter(k=>g0[Math.floor(k/64)][k%64]==='.').length<need)F(`the ball hardly shows (fewer than ${need/sides.length} pixels outside the body)`);
      // it sits against the body, not in it: only its last two columns may lie over the body's fill (it overlaps the outline by about a pixel; where
      // the edge steps out a pixel on a lower row the overlap there is one more), except the tucked-in ones (OVER)
      if(!OVER.includes(name))for(const side of sides){const {cells,edge}=handCells(Hd,C,side),ox=Hd.ox|0,lastX=side<0?edge-ox:edge+ox;
        for(const [x,y] of cells)if(Math.abs(x-lastX)>1&&'rpRc'.includes(g0[y][x])){F(`sits too far into the body at ${x},${y}`);break}}
    }}
  }finally{if(keep===undefined)delete HANDS[name];else HANDS[name]=keep}
  return out;
}

export function lint(){
  const out=[];
  for(const k of HAND_KEYS)out.push(...lintHand(k,HANDS[k]));
  for(const k of Object.keys(HANDS))if(!HAND_KEYS.includes(k))out.push(...lintHand(k,HANDS[k]));
  return out;
}

if(import.meta.url===`file://${process.argv[1]}`){
  const p=lint();
  if(p.length){console.log(p.length+' problem'+(p.length>1?'s':'')+':\n  '+p.slice(0,60).join('\n  ')+(p.length>60?'\n  ...':''));process.exit(1)}
  console.log(`hands lint green (${HAND_KEYS.length} balls x ${KEYS.length} levels + hop x boil variants x plain/scared/crown/party x 3 side combos)`);
}
