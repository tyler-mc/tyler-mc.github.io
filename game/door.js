/* The hub's stone double door, the disc of four fragments on it, and the HUD's fragment icons. Drawn in code.
   The disc is split along the door's centre seam and the horizontal axis into four interlocking quarters, each
   with one knob that fits the next one's socket (clockwise). Piece index = quarter: 0 roots NW, 1 flood NE,
   2 molten SE, 3 crystals SW (the same split and order as the medallion wallpaper in os.js, medWall).
   No DOM at import time (tools/test_game.mjs imports the engine under node). */
import {B4} from './mascot.js';

export const ACCENT=['#7fc044','#4a9be6','#f08a34','#b58af0'];   /* roots, flood, molten, crystals: the thin inlay line */
const hash=(x,y)=>{let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296};
const bay=(x,y)=>(B4[(y&3)*4+(x&3)]+.5)/16;
const rgb=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];

/* which quarter a point (relative to the disc centre, radius R) belongs to; the knobs sit on the seams at half radius */
export function frag(dx,dy,R){
  const a=R*.5,o=R*.09,kr=R*.135;
  if(Math.hypot(dx-o,dy+a)<kr)return 0;   /* N seam: NW's knob reaches into NE */
  if(Math.hypot(dx-a,dy-o)<kr)return 1;   /* E seam: NE's knob reaches into SE */
  if(Math.hypot(dx+o,dy-a)<kr)return 2;   /* S seam: SE's knob reaches into SW */
  if(Math.hypot(dx+a,dy+o)<kr)return 3;   /* W seam: SW's knob reaches into NW */
  return dy<0?(dx<0?0:1):(dx<0?3:2);
}

/* stone ramps: cool cave stone, and the same steps warmed by the torch (it stands to the door's right) */
const S=['#0b0a0f','#16141c','#221f28','#312d38','#433e4b','#58525f','#716a78','#8e8796','#aea7b4'].map(rgb);
const W=['#0d0a0b','#1b1515','#2b221f','#3e312b','#54433a','#6d574a','#8a6e5b','#a98a70','#c9a988'].map(rgb);
const IRON=['#0e0e12','#1e1e25','#33333d','#4f4e5c','#7d7a8a'].map(rgb);
const MOSS=['#1f3a17','#335f22','#4f8a2e','#7cb847'].map(rgb),ROOT=['#2a1d13','#45311f','#5f4630'].map(rgb);
const TORCH=[270,168];

/* the door's frame */
export const DISC={x:144,y:126,r:28};
const CX=144,AY=100,RI=46,RO=64,FL=192,SEAM=143;
/* 5x7 runes (rows of bits, MSB left) carved up the pillars and round the arch */
const RUNES=[[4,4,21,14,4,4,4],[16,24,20,18,17,16,16],[17,10,4,10,17,0,0],[4,10,17,4,4,4,4],[31,16,30,16,31,0,0],[17,17,31,17,17,4,4],[14,17,1,6,4,0,4],[4,6,5,4,12,20,4],[17,27,21,17,17,0,0],[4,14,21,4,4,10,17]];
const rune=(n,i,j)=>i>=0&&i<5&&j>=0&&j<7&&(RUNES[n%RUNES.length][j]>>(4-i))&1;

const inPillar=(x,y,l)=>{const u=l?x-74:214-x;   /* u: 0 at the pillar's outer side */
  if(y>=96&&y<=108)return u>=-4&&u<=24;            /* capital */
  if(y>=170&&y<=181)return u>=-2&&u<=25;           /* base */
  return y>108&&y<170&&u>=2&&u<=21};
const inOpen=(x,y)=>y<FL-11&&(y<AY?Math.hypot(x+.5-CX,y+.5-AY)<RI:x>=98&&x<=190);
const inLeaf=(x,y)=>y<FL-11&&(y<AY?Math.hypot(x+.5-CX,y+.5-AY)<RI-3:x>=101&&x<=187)&&x!==SEAM&&x!==SEAM+1;
const leafOf=x=>x<=SEAM?0:1;
const sameLeaf=(x,y,l)=>inLeaf(x,y)&&leafOf(x)===l;

/* a petroglyph on each upper panel: a figure reaching up toward the disc. fx: distance from the seam side of the panel */
function figure(fx,fy){
  const seg=(x0,y0,x1,y1,w)=>{const vx=x1-x0,vy=y1-y0,t=Math.max(0,Math.min(1,((fx-x0)*vx+(fy-y0)*vy)/(vx*vx+vy*vy))),dx=x0+vx*t-fx,dy=y0+vy*t-fy;return dx*dx+dy*dy<=w*w};
  return Math.hypot(fx,fy+7)<2.6||seg(0,-4,0,3,1.25)||seg(0,-3,-6,-9,.75)||seg(0,-3,5,-8,.75)||seg(0,3,-3,8.5,.75)||seg(0,3,3,8.5,.75);
}

/* the door into the room layer: put(px,py,[r,g,b]) */
export function paintDoor(put){
  /* a few weathering cracks: short random walks */
  const crack=new Set();
  for(let n=0;n<9;n++){let x=78+(hash(n,3)*136|0),y=60+(hash(n,9)*110|0);for(let k=0;k<10+(hash(n,5)*16|0);k++){crack.add(x+','+y);y+=1;x+=hash(n,k)<.33?-1:hash(n,k)>.66?1:0}}
  const col=(L,x,y,w)=>{const i=Math.max(0,Math.min(8,Math.floor(L+bay(x,y))));return (w*w*1.6>bay(y*3+1,x*5+2)?W:S)[i]};
  for(let y=26;y<FL;y++)for(let x=64;x<224;x++){
    const tw=Math.max(0,1-Math.hypot(x-TORCH[0],y-TORCH[1])/200),lit=tw*1.5-(1-y/FL)*.7+(hash(x,y)-.5)*.15;   /* torch on the right, dimmer up high */
    const r=Math.hypot(x+.5-CX,y+.5-AY),a=Math.atan2(y+.5-AY,x+.5-CX),dr=Math.hypot(x+.5-DISC.x,y+.5-DISC.y);
    let L=null,c=null;
    /* steps: a worn threshold and one step, behind him and darker than the floor's top */
    if(y>=181){
      const s2=y<=185&&x>=82&&x<=206,s1=y>=186&&x>=74&&x<=214;
      if(s2||s1){const top=s2?181:186,k=y-top,x0=s2?82:74,x1=s2?206:214;
        L=k===0?5.2:k===1?4:3.1-k*.25;if(x===x0||x===x1)L=1.6;if(k===0&&Math.abs(x-144)<34)L-=.9*(1-Math.abs(x-144)/34);
        if(hash(x,y)<.07)L-=1.4;if(s1&&y===186&&x>=82&&x<=206)L=1.3;   /* step 2's shadow on the threshold */
        const ed=Math.max(0,(Math.abs(x-144)-40)/30);   /* moss gathers at the ends, where no one walks */
        if(k<=1&&hash(x,top*7)<ed*.7)c=MOSS[k===0?(hash(x,1)<.4?2:1):0];
        if(k>=2&&hash(x>>1,y)<.04*ed)c=MOSS[0]}
    }
    /* the two pillars: capital, fluted shaft with a rune channel, base; roots and moss creep up from the floor */
    if(L===null)for(const l of [1,0])if(inPillar(x,y,l)){
      const u=l?x-74:214-x;
      if(y<=108){const k=y-96;L=k===0?6:k<=3?5-k*.2:k===4?1.8:k<=8?4.4:k===9?1.8:3.4;if(u===-4||u===24)L=Math.min(L,2.2);if(u===-3&&k>0)L+=.5}
      else if(y>=170){const k=y-170;L=k===0?1.8:k<=3?4.4:k===4?5.6:3.9-k*.05;if(u===-2||u===25)L=2}
      else{const v=(u-2)/19;L=2.6+2*Math.sin(v*Math.PI)+(l?-.3:.3)*(v-.5)*2;if(u===2||u===21)L=1.5;
        if(Math.abs(v-.18)<.03||Math.abs(v-.82)<.03)L-=1.3;
        /* the rune channel */
        if(u>=8&&u<=15){L=2.4+(u===8?-.8:u===15?.9:0);const gy=y-114,n=Math.floor(gy/10),i=u-9,j=gy-n*10;
          if(gy>=0&&n<5&&rune(n*3+(l?0:5),i,j))L=.2;else if(gy>=0&&n<5&&rune(n*3+(l?0:5),i-1,j-1))L=5.4}}
      if(crack.has(x+','+y))L-=1.6;
      /* roots up the bases */
      if(y>=150&&hash(u,9+l)<.12){const sx=Math.round(Math.sin(y*.35+u)*1.2);if(hash(u+sx,y>>2)<.8&&y>=150+(hash(u,l)*20|0))c=ROOT[(y+u)%3]}
      if(y>=177&&hash(x,y)<.3)c=MOSS[hash(y,x)<.6?0:1];
      break}
    /* the arch: voussoirs with runes, a keystone, a moulding, its shadow on the rock */
    if(L===null&&y<AY+1&&r>=RI&&r<=RO+3&&!inOpen(x,y)){
      const deg=(a*180/Math.PI+360)%360,key=Math.abs(deg-270)<7.5;
      if(r>RO){const k=r-RO;L=k<1.2?5.6:k<2.2?4.2:1.2}
      else{const st=Math.floor((deg-180)/15),fd=((deg-180)/15)%1,arc=Math.min(fd,1-fd)*15*Math.PI/180*r;
        L=r<RI+1.3?2.2:r>RO-1.3?5.4:4.1+(hash(st,1)-.5)*.6;
        if(arc<.8)L=1.1;else if(arc<1.8)L+=.8;
        /* a rune in the middle of each voussoir, set along the curve */
        const ri=Math.round((fd*15*Math.PI/180*r)-((15*Math.PI/180*r)-5)/2),rj=Math.round(r-(RI+RO)/2+3.5);
        if(!key&&rune(st+2,ri,6-rj))L=.3;else if(!key&&rune(st+2,ri-1,6-rj+1))L=Math.min(L+1.3,6.2)}
      if(crack.has(x+','+y))L-=1.4;
      void key}
    /* keystone: proud of the arch, with the disc carved small on it */
    {const deg=(a*180/Math.PI+360)%360;if(y<AY&&Math.abs(deg-270)<8.5&&r>=RI-4&&r<=RO+6){
      const e=Math.abs(deg-270)>7.2||r<RI-2.8||r>RO+4.8;L=e?(x>CX?2:5.6):5+(hash(x,y)-.5)*.5;
      const kd=Math.hypot(x+.5-CX,y+.5-(AY-55));if(Math.abs(kd-3.6)<.7||(kd<2.5&&(Math.abs(x+.5-CX)<.6||Math.abs(y+.5-(AY-55))<.6)))L=1.2;c=null}}
    /* the opening: a deep reveal round the leaves */
    if(L===null&&inOpen(x,y)&&!inLeaf(x,y)){L=.7;if(x===SEAM||x===SEAM+1)L=.3}
    /* the leaves */
    if(L===null&&inLeaf(x,y)){
      const l=leafOf(x),lx=l?x-(SEAM+2):SEAM-1-x;   /* lx: 0 at the seam, 41 at the hinge side */
      let d=9,side=0;
      for(let k=1;k<=6&&d===9;k++)for(const [ix,iy,s] of [[-k,0,1],[0,-k,1],[k,0,-1],[0,k,-1]])if(!sameLeaf(x+ix,y+iy,l)){d=k;side=s;break}
      if(d===1)L=side>0?5.6:1.8;else if(d<=4)L=4.5-(d===4?.4:0);else if(d===5)L=1.7;else L=3.7;
      if(d>5){
        /* upper relief panel (arched top), lower carved panel */
        const up=y<=86&&Math.hypot(x+.5-CX,y+.5-AY)<RI-9&&lx>=6&&lx<=34,lo=y>=167&&y<=175&&lx>=6&&lx<=34;
        if(up||lo){const inP=(xx,yy)=>{const lxx=l?xx-(SEAM+2):SEAM-1-xx;return lxx>=6&&lxx<=34&&(up?yy<=86&&Math.hypot(xx+.5-CX,yy+.5-AY)<RI-9:yy>=167&&yy<=175)};
          const tl=!inP(x-1,y)||!inP(x,y-1),br=!inP(x+1,y)||!inP(x,y+1);
          L=tl?1.2:br?5.2:up?2.5:3.1;
          if(up&&!tl&&!br){const fx=(l?1:-1)*(lx-21),fy=y-76,f=figure(fx,fy);if(f)L=5.6;else if(figure(fx-1,fy-1))L=1.2}
          if(lo&&!tl&&!br&&(y+Math.round(2*Math.sin(lx*.45)))%4===0)L=1.9}
        /* iron straps with rivets, from the hinges toward the disc */
        for(const by of [89,160])if(y>=by&&y<by+6&&lx>=3&&dr>DISC.r+7){const k=y-by;c=IRON[k===0?3:k===5?0:k===4?1:2];
          if((lx-4)%7===0&&k>=2&&k<=3)c=IRON[k===2?4:3];if(lx===3||(lx===4&&(k===0||k===5)))c=IRON[1]}
      }
      if(crack.has(x+','+y)&&d>1)L-=1.5;
      if(hash(x*3,y)<.035)L-=1;
    }
    /* hinge knuckles on the jambs */
    for(const by of [88,159])if(y>=by&&y<by+8&&((x>=96&&x<=101)||(x>=187&&x<=192))){const k=y-by,e=x===96||x===192;c=IRON[e||k===7?0:k===0?4:k<3?3:2]}
    /* the disc's frame: two grooves and a band of rune ticks round the four recesses, and the boss in the middle */
    if(dr<DISC.r+6&&(inLeaf(x,y)||dr<5.2)){
      if(dr>=DISC.r){c=null;const da=Math.atan2(y+.5-DISC.y,x+.5-DISC.x),f=((da/(Math.PI*2)*32)%1+1)%1,e=dr-DISC.r;
        L=e<1?1.2:e>4.2&&e<5?1.3:e>=5?5.4:4.6;
        if(e>=1.6&&e<=3.6&&Math.min(f,1-f)*Math.PI*2/32*dr<.6&&(Math.round(da/(Math.PI*2)*32)&1||e<=2.6))L=1.2}
      else if(dr<5.2){c=null;const nx=(x+.5-DISC.x)/5,ny=(y+.5-DISC.y)/5;L=dr>4.4?.6:5.4-(nx+ny)*1.8;if(dr<1.2)L=1}
      else{c=null;L=1}
    }
    if(c){put(x,y,c);continue}
    if(L!==null)put(x,y,col(L+lit*(L>1?1:.3),x,y,tw));
  }
}

/* the four fragments: an empty, fragment-shaped recess each, or the piece in it (carved stone with its inlay line) */
let FR=null;
function buildFrags(mk){
  const R=DISC.r,N=R*2+2,own=(x,y)=>{const dx=x+.5-R-1,dy=y+.5-R-1,r=Math.hypot(dx,dy);return r<R-.3&&r>5.6?frag(dx,dy,R):-1};
  const st=['#38343f','#4b4653','#615b69','#7a7482','#97909e'];
  const empty=['#09080c','#110f15','#1a1720','#625b6b','#26222b'];
  FR=[0,1,2,3].map(i=>{
    const c=[mk(N,N),mk(N,N)],xe=c[0].getContext('2d'),xf=c[1].getContext('2d'),ac=rgb(ACCENT[i]),acD=`rgb(${ac[0]*.55|0},${ac[1]*.55|0},${ac[2]*.55|0})`;
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){if(own(x,y)!==i)continue;
      const o=(a,b)=>own(x+a,y+b)===i,tl=!o(-1,0)||!o(0,-1),br=!o(1,0)||!o(0,1),tl2=!o(-2,0)||!o(0,-2),r=Math.hypot(x+.5-R-1,y+.5-R-1);
      /* empty: a stone lip lit on the far side, a deep shadow under the near edge */
      xe.fillStyle=br?empty[3]:tl?empty[0]:tl2?empty[1]:Math.abs(r-R*.76)<.55?empty[4]:(bay(x,y)<.25?empty[1]:empty[2]);xe.fillRect(x,y,1,1);   /* the bare inlay groove waits in the floor */
      /* placed: a carved stone piece, bevelled, a fine groove on its shadow side, and the inlay line */
      let k=br?0:tl?4:2+((hash(x,y)<.12)?-1:hash(x,y)>.93?1:0)+(bay(x,y)<(1-r/R)*.5?1:0);
      xf.fillStyle=st[Math.max(0,Math.min(4,k))];
      const near=!o(-2,0)||!o(2,0)||!o(0,-2)||!o(0,2);
      if(!tl&&!br&&!near&&Math.abs(r-R*.76)<.55)xf.fillStyle=ACCENT[i];
      else if(!tl&&!br&&!near&&Math.abs(r-(R*.76+1))<.5)xf.fillStyle=acD;
      xf.fillRect(x,y,1,1)}
    return c});
}
export function drawFragments(ctx,S,ox,oy,mk){
  if(!FR)buildFrags(mk);
  const set=S.placed||S.pieces,R=DISC.r;
  for(let i=0;i<4;i++)ctx.drawImage(FR[i][set&&set[i]?1:0],DISC.x-R-1-ox,DISC.y-R-1-oy);
}

/* HUD: the four fragments as a small disc, each quarter in its place (knob out on one straight edge, socket in the
   other); hollow until carried, then filled with its colour. Drawn for NW and turned clockwise for the others */
let HI=null;
const HN=12,HC=10;
export function drawHudPieces(ctx,pieces,x0,y0,mk){
  if(!HI){
    const nw=(x,y)=>{const dx=x+.5-HC,dy=y+.5-HC;
      if(dx>=0&&dx<1.4&&dy>-5.4&&dy<-2.6)return true;     /* knob, east */
      if(dy<0&&dy>-1.4&&dx>-5.4&&dx<-2.6)return false;    /* socket, south */
      return dx<0&&dy<0&&Math.hypot(dx,dy)<8.9};
    HI=[0,1,2,3].map(i=>{
      const own=(x,y)=>{if(x<0||y<0||x>=HN||y>=HN)return false;for(let k=0;k<i;k++)[x,y]=[y,HN-1-x];return nw(x,y)};
      return [0,1].map(f=>{const cv=mk(HN,HN),g=cv.getContext('2d');
        for(let y=0;y<HN;y++)for(let x=0;x<HN;x++){
          const o=own(x,y),edge=o&&(!own(x-1,y)||!own(x+1,y)||!own(x,y-1)||!own(x,y+1));
          const s=!o?null:edge?(f?'#000000':'#8e8796'):f?((!own(x-1,y-1)&&own(x+1,y+1))?'#ffffff':ACCENT[i]):'#100f14';
          if(s){g.fillStyle=s;g.fillRect(x,y,1,1)}}
        return cv})})}
  /* x0,y0: the top-left of the little disc; quarters meet round its centre with a 1px gap */
  const X=x0+HC,Y=y0+HC,F=HN-HC,at=[[X-HC,Y-HC],[X-F+1,Y-HC],[X-F+1,Y-F+1],[X-HC,Y-F+1]];
  pieces.forEach((v,i)=>ctx.drawImage(HI[i][v?1:0],at[i][0],at[i][1]));
}

/* ONE fragment on its own, the placed carved stone (with its inlay line), centred on screen px (x,y): the shrine's
   pedestal and the fly-in to the door (render.js). opts: {mk (canvas factory, required the first time), alpha}.
   TODO(door art owner): placeholder added by the M1b chase/door slice; it only reuses the slot canvases above (FR,
   quarter k's box centre on x,y). Replace the body freely, keeping the signature and "centred on x,y". */
export const fragCentre=k=>{const s=[[-1,-1],[1,-1],[1,1],[-1,1]][k];return {x:DISC.x+s[0]*DISC.r/2,y:DISC.y+s[1]*DISC.r/2}};   /* its slot, room px */
export function drawFragment(ctx,k,x,y,opts={}){
  if(!FR)buildFrags(opts.mk);
  const R=DISC.r,c=fragCentre(k),a=ctx.globalAlpha;
  if(opts.alpha!==undefined)ctx.globalAlpha=a*opts.alpha;
  ctx.drawImage(FR[k][1],Math.round(x-(c.x-DISC.x+R+1)),Math.round(y-(c.y-DISC.y+R+1)));
  ctx.globalAlpha=a;
}
