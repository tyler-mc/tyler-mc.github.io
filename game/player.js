/* Mascot physics. Units: px and frames at 60 Hz. */
import {T} from './state.js';
import {move,ov} from './engine.js';
import {board,carry,under,wetC} from './board.js';
import {flowAt} from './liquid.js';

export const PW=18,PH=24,G=.26,GH=.15,MAXF=4.6,JV=4.6,RJV=4.1,CUT=2,COY=6,BUF=6;
/* run and turn feel, read by stepPlayer on every step so the dev panel can tune it live. Not saved.
   AREV: air rate while input opposes vx. CORNER: px a head bump slides round a ceiling corner. HIT: hit-stop frames on
   a stun (engine.js). LEAD: camera look-ahead, 0 = face*12, 1 = clamp(vx*8,-16,16) (engine.js camera). STRIDE: px walked
   per walk-cycle frame (render.js); a footstep every two. */
export const FEEL={ACC:.2,DEC:.3,AACC:.13,ADEC:.13,AREV:.18,RUN:1.6,CORNER:4,HIT:3,LEAD:0,STRIDE:6};
/* the defaults, by their old names (the panel's Reset uses them). These do not follow later FEEL changes. */
export const {ACC,DEC,AACC,ADEC,AREV,RUN,CORNER,HIT,LEAD,STRIDE}=FEEL;
const appr=(v,t,a)=>v<t?Math.min(t,v+a):Math.max(t,v-a);
/* the vx rate this step: input against vx brakes at DEC on the ground, AREV in the air */
const rate=(F,ground,dir,vx)=>{const turn=dir*vx<0;return ground?(dir&&!turn?F.ACC:F.DEC):(turn?F.AREV:dir?F.AACC:F.ADEC)};
/* feel Stage 4 events, no physics: 'skid' once as a ground turn starts above SKID px/frame (A7); 'footstep' each 2*FEEL.STRIDE
   px of x walked under input, so it falls on alternate stride frames of the renderer's walk cycle (floor(x/STRIDE), A8, A10) */
export const SKID=.5;

function jump(p,v,ev,name){p.vy=-v;p.jc=1;p.ground=0;p.coy=0;p.buf=0;p.on=-1;ev.push(name)}
const wetAt=(R,p)=>{const tx=Math.floor((p.x+PW/2)/T),ty=Math.floor((p.y+PH/2)/T);return R.g[ty]&&R.g[ty][tx]==='~'};
/* falling with ground (or a wrapped enemy) within BUF frames below: a press then means "jump when I land", so it is
   buffered instead of spending the root, unless a live enemy sits in the burst's reach below him. Flood's soft ones (crab,
   fish) do not count: the burst slides off them. With the board out, liquid it would land on (board.js) counts as ground,
   and surfStart() takes the buffered press as a jump off the board */
function landing(S,R,p,boxes){
  if(p.vy<=0||S.ens.some(e=>!e.wrap&&!e.soft&&ov({x:p.x-8,y:p.y+PH-4,w:PW+16,h:40},e)))return false;
  const q={x:p.x,y:p.y,w:p.w,h:p.h},out=S.items.board&&p.bo&&!p.surf;let v=p.vy;
  for(let i=0;i<BUF;i++){v=Math.min(MAXF,v+G);if(move(S,R,q,0,v,boxes).hy>0||(out&&under(S,q)&&!wetC(R,q)))return true}
  return false;
}
/* Flood: in deep water, off the floor, he floats (buoyancy lifts him till his head is out, the water damps him), a stroke
   toward a low bank climbs him onto it, and a current carries him. A pool one tile deep never lifts him (he stands). */
const hardC=c=>c==='#'||c==='='||c==='G';
function float(S,R,p,dir,stroke,boxes){
  const cx=p.x+PW/2,tx=Math.floor(cx/T);let ty=Math.floor((p.y+PH/2)/T);
  while(ty>0&&R.g[ty-1][tx]==='~')ty--;
  if(!p.ground){const d=p.y+PH/2-(ty*T-2);if(d>0)p.vy-=Math.min(.3,d*.03);p.vy*=.92;
    const bx=Math.floor((cx+dir*(PW/2+3))/T);if(stroke&&dir&&R.g[ty-2]&&hardC(R.g[ty][bx])&&!hardC(R.g[ty-1][bx])&&!hardC(R.g[ty-2][bx]))p.vy=-3.4}
  /* the current, in sub-moves of at most 6 px so a strong one cannot carry him through a one-tile wall */
  const fl=flowAt(S.liq,R,cx,p.y+PH/2);if(fl){const n=Math.ceil(Math.abs(fl)/6);for(let i=0;i<n;i++)if(move(S,R,p,fl/n,0,boxes).hx)break}
}

/* inp: l r (held), j (jump held), jp (jump pressed since last step), b/bp (board held/pressed). boxes: solid wrapped enemies. */
export function stepPlayer(S,R,inp,ev,boxes){
  if(board(S,R,inp,ev,boxes))return;   /* the board's dash and surf own the frame (game/board.js) */
  const p=S.p,wet=wetAt(R,p),dir=(inp.r?1:0)-(inp.l?1:0),g0=p.ground,x0=p.x,f0=p.face;
  if(dir)p.face=dir;
  const F=FEEL;p.vx=appr(p.vx,dir*F.RUN*(wet?.6:1),rate(F,p.ground,dir,p.vx));
  if(p.mo)carry(p,dir);
  if(inp.jp){
    if(wet){p.vy=-2.4;p.jc=0;ev.push('swim')}
    else if(p.ground||p.coy>0)jump(p,JV,ev,'jump');
    else if(S.items.root&&p.root&&!landing(S,R,p,boxes)){jump(p,RJV,ev,'root');p.root=0;S.roots.push({x:p.x+PW/2,y:p.y+PH,t:0,g:0,hit:[]})}
    else p.buf=BUF;
  }else if(p.buf>0){p.buf--;if(p.ground)jump(p,JV,ev,'jump')}
  if(p.jc&&!inp.j&&p.vy<-CUT)p.vy=-CUT;
  if(p.vy>=0)p.jc=0;
  p.vy=Math.min(wet?1.2:MAXF,p.vy+(wet?G*.35:inp.j&&Math.abs(p.vy)<.8?GH:G));
  if(wet)float(S,R,p,dir,inp.jp,boxes);
  const vy0=p.vy,m=move(S,R,p,p.vx,p.vy,boxes,F.CORNER);
  if(m.hx)p.vx=0;
  /* land: any landing faster than 1.0 (the renderer's squash scales with lv, the fall speed; audio gates on it) */
  if(m.hy>0){if(!p.ground&&vy0>1){p.land=8;p.lv=vy0;ev.push('land')}p.ground=1;p.vy=0;p.on=m.on}
  else{if(m.hy<0)p.vy=0;p.ground=0;p.on=-1}
  if(p.ground){p.coy=COY;if(S.items.root)p.root=1}else if(p.coy>0)p.coy--;
  if(p.land>0)p.land--;
  p.walk=p.ground&&Math.abs(p.vx)>.3?p.walk+1:0;
  /* a skid starts on the ground as he turns against his speed: the turn press itself, or landing into a turn already held */
  if(p.ground&&!wet&&dir*p.vx<-SKID&&(f0!==dir||!g0))ev.push('skid');
  if(g0&&p.ground&&!wet&&dir*p.vx>0&&Math.floor(p.x/(F.STRIDE*2))!==Math.floor(x0/(F.STRIDE*2)))ev.push('footstep');
}
