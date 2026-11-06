/* Renderer: 288x216 canvas. Room tiles are pre-painted once per room; then dynamic bits, then a Bayer-dithered
   light pass (4 brightness steps); the mascot, enemies and plate/gate marks go on top so they always read. */
import {T,VW,VH} from './state.js';
import {AMB,ROOMS,perchOf} from './rooms/index.js';
import {sprite,glitch,B4,FR} from './mascot.js';
import {SLACK,GRACE} from './enemies.js';
import {paintDoor,drawFragments,drawHudPieces} from './door.js';
import {drawFragment,fragCentre,ACCENT} from './door.js';   /* M1b: pedestal, fly-in, slot pulse */
import {DOOR as RITE,BOB,PIECES} from './state.js';
import {WITHER} from './chases.js';
import {waterBody,waterCrest,waterFront,boardItem,boardHud,boardUnder,drawCrab,drawFish} from './floodart.js';   /* M3: water, the board, crab and fish */
import {createFx,stepFx,clearFx,radii,sprout} from './fx.js';   /* the body pulse, dust, skid and sprout lag, kept out of S */
import {MAXF,FEEL} from './player.js';
import {isLiq} from './liquid.js';
import {solid,tile} from './engine.js';   /* the edge pose's ground is collision's own (a cycle, used only at draw time) */

const PAL={
  hub:{bg:'#121118',bg2:'#1b1a23',rock:'#3b3843',rockL:'#5a5668',rockD:'#27252e',out:'#09080c',top:'#6e6984',topL:'#8b86a0',strand:'#1f1d26'},
  roots:{bg:'#0a120c',bg2:'#112016',rock:'#3a2a1d',rockL:'#56402c',rockD:'#251a11',out:'#070805',top:'#3f6b2a',topL:'#6a9a3c',strand:'#24190f'},
  flood:{bg:'#07111a',bg2:'#0e1f2c',rock:'#33475a',rockL:'#557089',rockD:'#202d38',out:'#05080b',top:'#5a8f99',topL:'#86c0c4',strand:'#15212a'},   /* wet slate, sea-green lips */
};
const RUB={rub:'#5c544c',rubL:'#80766a',rubD:'#3a342f'};
const DOOR={st:'#6a6676',stL:'#8a8698',stD:'#47444f',gr:'#24222b',fr:'#34313c'};
const SLOT=['#6a9a3c','#3a8ad5','#e0782a','#a477e0'];   /* roots, flood, molten, crystals */
const RED='#FF3333',RED2='#B3121B',YEL='#FFD94A',YEL2='#F6B92B',INK='#1A1716';
const hash=(x,y)=>{let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296};
const rgb=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const bay=(x,y)=>(B4[(y&3)*4+(x&3)]+.5)/16;
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};

/* pixel sprites: one char per pixel, '.' clear */
function blit(ctx,rows,x,y,pal,flip){
  for(let j=0;j<rows.length;j++){const r=rows[j];for(let i=0;i<r.length;i++){const c=r[i];if(c==='.')continue;ctx.fillStyle=pal[c];ctx.fillRect(x+(flip?r.length-1-i:i),y+j,1,1)}}
}
/* Enemies: hand-pixelled, INK outline, danger red in the thorns and eyes. 'w'/'e' are eye pixels (never covered
   by root bands). Mossback is drawn lying on a floor facing +x and turned to its surface; 4 walk frames step with
   the distance crawled, odd frames sit 1px lower on squashed legs; TURN grips an outer corner. */
const MOSS_P={k:INK,L:'#a6d264',M:'#5f9136',m:'#355a21',b:'#7a5532',B:'#4e331c',s:'#a07c4c',S:'#6e5132',w:'#ffffff',e:RED,r:RED,R:RED2};
const MOSS_B=[
  '....r....r.....',
  '...kRkkkkRk....',
  '..kLLLLMMMMk...',
  '.kLLLMMMMMmmk..',
  'kLLMMMMMMMmmmk.',
  'kLMMmMMMmMmmkkk',
  'kMMMMMmMMmmkwek',
  'kMmMMmMmmmmksSk',
  '.kbbbbbbbbBkkk.',
  '..kkkkkkkkk....'];
const MOSS_LEG=[['..kk.....kk.kk.','..kk.....kk.kk.'],['..kk...kk..kk..'],['...kk.kk....kk.','...kk.kk.....k.'],['..kk...kk..kk..']];
const MOSS=MOSS_LEG.map((l,f)=>f&1?['...............',...MOSS_B,...l]:[...MOSS_B,...l]);
const MOSS_TURN=[...MOSS_B,'....kkkkk......','.....kkk.......'];
/* Spore puff: a cream puffball under a violet spore cap; breathes in (wider) and out (squeezed, mouth open) */
const PUFF_P={k:INK,c:'#b07fc4',C:'#7d4a93',D:'#4f2b63',o:'#f3e7c8',B:'#ece4c6',b:'#b9ae88',h:'#ffffff',w:'#ffffff',e:RED,m:'#7A0A12'};
const PUFF_CAP=['.....kkkk.....','...kkcccCkk...','..kcoocCCoCk..','.kccooCCCCoDk.','.kcCCCCCoCCDk.','kCCoCCCCCCDDDk','kkDDDDDDDDDDkk'];
const PUFF=[[
  '..kBBBBBBbbk..','..khweBBwebk..','..kBeeBBeebk..','..kBBBkkBBbk..','..kBBBBBBbbk..','...kbbbbbbk...','....kkkkkk....'],[
  '.kBBBBBBBBbbk.','.khBweBBwebbk.','.kBBeeBBeebbk.','.kBBBBkkBBbbk.','.kBBBBBBBBbbk.','..kbbbbbbbbk..','...kkkkkkkk...'],null,[
  '...kBBBBBbk...','...kweBBwek...','...keeBBeek...','...kBkmmkbk...','...kBBkkBbk...','....kbbbbk....','.....kkkk.....']].map(b=>b&&[...PUFF_CAP,...b]);
PUFF[2]=PUFF[0];
/* the shrine's pedestal: a slab capital, a shaft carved with a winding root band, a stepped footing moss has crept over */
const PED=[
  '..kkkkkkkkkkkkkkkkkk..',
  '.kHHHHHHHHHHHHHHHHHHk.',
  '.kLLLLLLLLLLLLLLLLMDk.',
  '..kDDDDDDDDDDDDDDDDk..',
  '....kHLLLLLLLLLMDk....',
  '....kLLMMMMMMMMDDk....',
  '....kLgMMMgMMMgMDk....',
  '....kLMgMgMgMgMgDk....',
  '....kLMMgMMMgMMMDk....',
  '....kLLMMMMMMMMDDk....',
  '....kLLMMMMMMMMDDk....',
  '....kLLMMMMMMMMDDk....',
  '..kkkkkkkkkkkkkkkkkk..',
  '.kHLLLLLLLLLLLLLLLMDk.',
  'kLLLMMMMMMMMMMMMMMMDDk',
  'nkmDDDDDDDDDDDDDDDDmkn'];
const PED_P={k:'#0b0a0f',H:'#aea7b4',L:'#8e8796',M:'#716a78',D:'#4a4452',g:'#221f28',m:'#4f8a2e',n:'#335f22'};
const SEED=['...g...','..gYg..','.YYYYY.','YYwYYYY','YwYYYYy','.YYYYy.','..YYy..','...o...'];
const SEED_P={g:'#6a9a3c',Y:YEL,y:YEL2,w:'#FFF6C8',o:'#8a6440'};

/* a thorn tile: three spikes grown from whichever side has rock; f(px,py,j) per pixel, j = 0 at the base .. 6 at the tip */
const THORN_TIP='#FFC4B8';
function thorn(R,tx,ty,f){
  const s=(a,b)=>solidCh(R,a,b),base=s(tx,ty+1)?'d':s(tx,ty-1)?'u':s(tx-1,ty)?'l':s(tx+1,ty)?'r':'d';
  for(let k=0;k<3;k++)for(let j=0;j<7;j++)for(let i=0;i<=Math.floor((6-j)/2);i++)for(const u of [k*4+2-i,k*4+2+i]){
    const v=T-1-j,[px,py]=base==='d'?[u,v]:base==='u'?[u,T-1-v]:base==='l'?[T-1-v,u]:[v,u];f(tx*T+px,ty*T+py,j)}
}

/* ---------- static room layer ---------- */
function solidCh(R,tx,ty){if(tx<0||ty<0||tx>=R.w||ty>=R.h){tx=Math.max(0,Math.min(R.w-1,tx));ty=Math.max(0,Math.min(R.h-1,ty))}const c=R.g[ty][tx];return c==='#'||c==='='||c==='G'}
function buildLayer(R){
  const P=PAL[R.biome]||PAL.roots,W=R.w*T,H=R.h*T,cv=mk(W,H),x=cv.getContext('2d'),img=x.createImageData(W,H),d=img.data,C={};
  for(const k in P)C[k]=rgb(P[k]);for(const k in RUB)C[k]=rgb(RUB[k]);for(const k in DOOR)C[k]=rgb(DOOR[k]);
  const put=(px,py,c)=>{if(px<0||py<0||px>=W||py>=H)return;const j=(py*W+px)*4;d[j]=c[0];d[j+1]=c[1];d[j+2]=c[2];d[j+3]=255};
  /* background: dithered blotches of a lighter tone */
  const nz=(px,py)=>{const gx=px/24,gy=py/24,x0=Math.floor(gx),y0=Math.floor(gy),fx=gx-x0,fy=gy-y0,
    a=hash(x0,y0),b=hash(x0+1,y0),c=hash(x0,y0+1),e=hash(x0+1,y0+1);return (a+(b-a)*fx)*(1-fy)+(c+(e-c)*fx)*fy};
  for(let py=0;py<H;py++)for(let px=0;px<W;px++)put(px,py,nz(px,py)*.55>bay(px,py)?C.bg2:C.bg);
  /* hanging roots / stalactite strands from ceilings */
  for(let ty=0;ty<R.h-1;ty++)for(let tx=0;tx<R.w;tx++){
    if(!solidCh(R,tx,ty)||solidCh(R,tx,ty+1)||hash(tx,ty+99)>.45)continue;
    const sx=tx*T+(hash(tx,ty)*10|0),len=6+(hash(ty,tx)*22|0);
    for(let i=0;i<len;i++)put(sx+Math.round(Math.sin(i*.35+tx)*1.2),(ty+1)*T+i,C.strand);
  }
  if(R.id==='hub')paintDoor(put);   /* game/door.js */
  for(let ty=0;ty<R.h;ty++)for(let tx=0;tx<R.w;tx++){
    const ch=R.g[ty][tx];
    if(ch==='#'){
      const up=!solidCh(R,tx,ty-1),dn=!solidCh(R,tx,ty+1),lf=!solidCh(R,tx-1,ty),rt=!solidCh(R,tx+1,ty);
      for(let j=0;j<T;j++)for(let i=0;i<T;i++){
        const px=tx*T+i,py=ty*T+j,h=hash(px,py);let c=h<.07?C.rockD:h>.95?C.rockL:C.rock;
        if((py+((px/5)|0)*3)%11===0&&h<.6)c=C.rockD;
        const mossD=1+(hash(px,ty)*3|0);
        if(up&&j===0)c=R.biome==='roots'?C.topL:C.top;
        else if(up&&R.biome==='roots'&&j<=mossD)c=C.top;
        else if(up&&j===1)c=C.rockL;
        else if((dn&&j===T-1)||(lf&&i===0)||(rt&&i===T-1))c=C.out;
        else if((lf&&i===1)||(rt&&i===T-2)||(dn&&j===T-2))c=C.rockD;
        put(px,py,c);
      }
      /* moss drips under ledges in the Roots */
      if(R.biome==='roots'&&dn)for(let i=1;i<T-1;i++)if(hash(tx*T+i,ty*7)<.18){const L=1+(hash(i,ty)*3|0);for(let k=0;k<L;k++)put(tx*T+i,(ty+1)*T+k,C.top)}
    }else if(ch==='='){
      for(let k=0;k<4;k++){const cx=tx*T+3+(k&1)*6+(hash(tx*4+k,ty)*2|0),cy=ty*T+3+(k>>1)*6+(hash(ty*4+k,tx)*2|0),r=3.2+hash(k,tx+ty)*.8;
        for(let j=-4;j<=4;j++)for(let i=-4;i<=4;i++){const q=(i*i+j*j)/(r*r);if(q>1)continue;put(cx+i,cy+j,q>.7?C.out:i+j<-2?C.rubL:i+j>2?C.rubD:C.rub)}}
    }else if(ch==='^'){const TC=[C.rockD,C.rockD,C.rockD,rgb(RED2),rgb(RED2),rgb(RED),rgb(THORN_TIP)];thorn(R,tx,ty,(px,py,j)=>put(px,py,TC[j]))}
  }
  x.putImageData(img,0,0);
  return cv;
}

/* ---------- renderer ---------- */
export function createRenderer(cv,{reduce=false}={}){
  cv.width=VW;cv.height=VH;
  const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;
  const N=VW*VH,L=new Float32Array(N),BT=new Float32Array(N),layers=new WeakMap();
  for(let y=0;y<VH;y++)for(let x=0;x<VW;x++)BT[y*VW+x]=bay(x,y);
  const layer=R=>{let c=layers.get(R);if(!c){c=buildLayer(R);layers.set(R,c)}return c};

  function addLight(m,lx,ly,r,k){
    if(r<=0)return;
    const x0=Math.max(0,Math.floor(lx-r)),x1=Math.min(VW-1,Math.ceil(lx+r)),y0=Math.max(0,Math.floor(ly-r)),y1=Math.min(VH-1,Math.ceil(ly+r));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const d=Math.hypot(x+.5-lx,y+.5-ly);if(d<r)m[y*VW+x]+=Math.min(1,(1-d/r)*1.7)*k}
  }
  function lightPass(amb){
    const img=ctx.getImageData(0,0,VW,VH),d=img.data;
    for(let i=0,j=0;i<N;i++,j+=4){
      const l=L[i]+amb;let k=1;
      if(l<1){const q=(l*3+BT[i])|0;k=q>=3?1:q/3}
      d[j]*=k;d[j+1]*=k;d[j+2]*=k;
    }
    ctx.putImageData(img,0,0);
  }

  function look(S){
    const p=S.p,t=S.t,s={f:'idle',dir:[0,0],blink:(t%197)<6?1:0,face:0,happy:0,mouth:0,dx:0,stage:S.items.root?1:0};
    if(p.mac)return {mac:1};
    const seat=S.sit>=14&&S.mode==='play'?perchOf(ROOMS[S.room],p):null;
    if(seat){s.f=(t>>6)&1?'land':'squash';s.dir=[Math.sign(seat.lookx)||p.face,seat.looky<0?-1:0]}   /* sitting: low, looking where the camera drifts, a slow breath */
    else if(!p.ground&&S.mode!=='intro')s.f='idle';   /* the jump stretch and the landing squash come from the pulse below */
    else if(p.walk)s.f=!reduce&&Math.floor(p.x/FEEL.STRIDE)&1?'breath':'idle';   /* A8: a stride frame per STRIDE px walked, as Mossback */
    else if(((t>>5)&3)===0)s.f='breath';
    if(S.mode!=='intro')s.dir=[p.face,p.vy<-1?-1:p.vy>2?1:0];
    else{const k=S.intro.t-S.intro.land;if(S.intro.land>=0&&k>225&&k<370)s.dir=[(k>>5)&1?1:-1,0]}
    /* A7: skidding, squat and lean 1 px into the slide, eyes already the new way */
    if(!seat&&p.ground&&live(S)&&fx.sk){s.f='land';s.dx=Math.sign(p.vx)}
    /* A13: still on a ledge with neither foot over ground, he looks down at the drop. Hit-stop, a seat, a hint and begging come
       first; never on a wrapped enemy, on the board (or during its pickup demo, board.js) or in liquid */
    else if(!seat&&S.mode!=='intro'&&p.ground&&p.on<0&&!p.surf&&!p.bd&&!p.walk&&!p.dead&&!S.hit&&!S.hint&&Math.abs(p.vx)<.05){const e=ledge(S,p);if(e){s.dir=[e,1];if(!S.say)s.face='huh'}}
    if(S.mode==='dark'&&S.idle>720){const tt=hubTorch();s.dir=[Math.sign(tt.x-p.x-9),Math.sign(tt.y-p.y-12)]}
    /* the stuck hint (engine stuck()): standing still, his eyes go toward what's next, then his head leans after them;
       a beat later, and every BOB frames after, a tiny bob that way */
    if(S.hint&&S.mode==='play'&&p.ground&&!p.walk&&!p.dead){
      const at=ROOMS[S.room].at,dx=S.hint.x-(at[0]*T+p.x+9),dy=S.hint.y-(at[1]*T+p.y+8),sx=Math.abs(dx)>8?Math.sign(dx):0,k=S.hint.k;
      s.dir=[sx,Math.abs(dy)>Math.abs(dx)*.5?Math.sign(dy):0];
      if(!reduce&&k>=14){s.dx=sx;const b=(k-90)%BOB;if(k>=90&&b<18){s.f=b<6?'squash':b<12?'stretch':'land';s.dx=sx*(b>=6&&b<12?2:1)}}
    }
    if(p.carry){s.face='scared';s.blink=0}
    if(S.say&&S.say.n<S.say.text.length*2)s.mouth=(S.say.n>>2)&1;
    if(p.land>0&&S.mode==='intro')s.face='huh';
    if(S.say&&S.say.pose==='beg'){const n=S.say.n;s.face='beg';s.blink=0;s.dir=[0,0];s.dx=reduce?0:((n>>4)&1?1:-1);s.f=reduce?'idle':(n>>2)&1?'breath':'idle'}   /* begging: rocks and bobs for the line */
    if(s.stage&&live(S)){const o=sprout(fx);if(o)s.sp=o}   /* A11: the sprout trails his speed (only drawn from stage 1) */
    if(LOOK.hat&&LOOK.hat!=='none')s.hat=LOOK.hat;if(LOOK.mask)s.mask=1;   /* the OS Control Panel's hat and skull mask */
    /* the pulse (A1-A4) scales a rest frame to whole-pixel radii; the face keeps its size. Each shape is an FR entry named
       by its radii (drawBuddy reads FR[s.f]), so the sprite key holds them and the feet stay on row 42 (oy = 11 - ry) */
    if(fx.k&&live(S)&&(s.f==='idle'||s.f==='breath')){const b=FR[s.f],r=radii(fx,b);
      if(r.rx!==b[0]||r.ry!==b[1]){const n='p'+r.rx+'x'+r.ry;if(!FR[n])FR[n]=[r.rx,r.ry,r.oy];s.f=n}}
    return s;
  }
  /* pulse and dust (game/fx.js): one fixed step per world step, from tick(). Not in S, so Undo and saves never hold them.
     A new room, or an S.t that does not follow the last step (warp, reset, restore()), clears them; draw() shows them only
     while S is still at the step they were made for. frozen: the world spent this step on hit-stop. */
  const fx=createFx(),at={room:null,t:NaN};
  const live=S=>S.room===at.room&&S.t===at.t;
  function step(S,ev,frozen){
    const p=S.p,R=ROOMS[S.room];
    if(S.room!==at.room||S.t!==at.t+1)clearFx(fx);
    at.room=S.room;at.t=S.t;
    const fx0=p.x+p.w/2,fy0=p.y+p.h,wet=R&&R.g[Math.floor((fy0-1)/T)]&&isLiq(R.g[Math.floor((fy0-1)/T)][Math.floor(fx0/T)]);
    /* a jump has already moved him up by vy this step, so its dust goes where his feet left the ground; no dust under water */
    stepFx(fx,wet?ev.filter(e=>e!=='land'):ev,{hit:frozen??S.hit>0,reduce,lv:p.lv,MAXF,feetX:fx0,feetY:fy0-(ev.includes('jump')?p.vy:0),
      ground:!!p.ground,skid:!!p.ground&&p.face*p.vx<-.2,vx:p.dead||p.carry?0:p.vx});
  }
  /* a ledge under only the box's outer px (his feet are at x+2..5 and x+12..15): the side of the drop, 1 or -1, else 0.
     Ground is what collision stands him on (engine solid(): rock, rubble, a shut gate, past the edge the next room) plus a
     wrapped enemy's box; liquid in his cell or under his feet is never a ledge (he floats, or the board holds him) */
  function ledge(S,p){
    const R=ROOMS[S.room],fy=p.y+p.h,ty=Math.floor(fy/T),x=Math.round(p.x),liq=(a,y)=>isLiq(tile(R,Math.floor(a/T),Math.floor(y/T)));
    if(liq(x+9,fy-1)||liq(x+9,fy))return 0;
    const on=a=>solid(S,R,Math.floor(a/T),ty)||S.ens.some(e=>e.wrap>0&&!e.pass&&a>=e.x&&a<e.x+e.w&&Math.abs(e.y-fy)<1);
    if(on(x+2)||on(x+5)||on(x+12)||on(x+15))return 0;
    return on(x)||on(x+1)?1:on(x+16)||on(x+17)?-1:0;
  }
  const hubTorch=()=>{const h=ROOMS.hub.torches[0];return {x:h.tx*T+6,y:h.ty*T+6}};
  let LOOK={};

  function draw(S,R){
    const p=S.p,t=S.t,lay=layer(R),sh=reduce?0:S.cam.sh;
    const ox=Math.round(S.cam.x+(sh?(Math.random()-.5)*2*sh:0)),oy=Math.round(S.cam.y+(sh?(Math.random()-.5)*2*sh:0));
    const torchKey=tt=>S.torches[R.id+':'+tt.tx+','+tt.ty];
    ctx.fillStyle='#000';ctx.fillRect(0,0,VW,VH);
    ctx.drawImage(lay,-ox,-oy);
    const X=v=>Math.round(v)-ox,Y=v=>Math.round(v)-oy,vis=(x,y,m=24)=>x>ox-m&&x<ox+VW+m&&y>oy-m&&y<oy+VH+m;
    waterBody(ctx,S,R,ox,oy,t);   /* liquid surfaces from S.liq (game/floodart.js) */
    /* dynamic tiles */
    for(let ty=0;ty<R.h;ty++)for(let tx=0;tx<R.w;tx++){
      const c=R.g[ty][tx];if(c==='.'||c==='#')continue;
      const x=tx*T-ox,y=ty*T-oy;if(x<-T||y<-T||x>VW||y>VH)continue;
      if(c==='~'){}   /* drawn above by waterBody */
      else if(c==='G'){const hgt=Math.round(T*(1-S.gate));if(hgt>0){for(const bx of [1,5,9]){ctx.fillStyle='#6b4a2b';ctx.fillRect(x+bx,y,2,hgt);ctx.fillStyle='#8a6440';ctx.fillRect(x+bx,y,1,hgt)}ctx.fillStyle='#3a2a1d';if(hgt>6)ctx.fillRect(x,y+4,T,2)}}
      else if(c==='P'){const down=S.plate;ctx.fillStyle='#47444f';ctx.fillRect(x,y+T-2,T,2);ctx.fillStyle='#8a8698';ctx.fillRect(x+1,y+(down?T-3:T-5),T-2,down?1:3);if(!down){ctx.fillStyle='#6a6676';ctx.fillRect(x+1,y+T-4,T-2,2)}ctx.fillStyle=down?'#dff7ff':'#5b6a70';ctx.fillRect(x+5,y+(down?T-3:T-5),2,1)}
      else if(c==='T'){
        const lit=torchKey({tx,ty}),dark=R.id==='hub'&&!S.lit;
        ctx.fillStyle='#2b2a30';ctx.fillRect(x+3,y+9,6,2);ctx.fillStyle='#6b4a2b';ctx.fillRect(x+5,y+4,2,6);
        if(lit||(R.id==='hub'&&S.lit)){const f=(t>>2)%3;ctx.fillStyle='#F08A2A';ctx.fillRect(x+4,y+1-f%2,4,4);ctx.fillStyle=YEL;ctx.fillRect(x+5,y+(f===1?0:1),2,3);ctx.fillStyle='#fff6c8';ctx.fillRect(x+5+(f&1),y+3,1,1)}
        else if(!dark){ctx.fillStyle=(t>>4)&1?'#8a3a10':'#6e2c0c';ctx.fillRect(x+5,y+3,2,1)}
      }
      else if(c==='B'){   /* a perch: a flat root slab set in the floor, moss on its lip */
        ctx.fillStyle='#4a3322';ctx.fillRect(x,y+8,T,4);ctx.fillStyle='#7a5a3a';ctx.fillRect(x,y+8,T,1);ctx.fillStyle='#2e1f14';ctx.fillRect(x+1,y+11,T-2,1);
        ctx.fillStyle='#3f7a3a';ctx.fillRect(x+2,y+7,3,1);ctx.fillRect(x+8,y+7,2,1);ctx.fillRect(x+3,y+6,1,1);
      }
      else if(c==='I'){const it=R.items.find(o=>o.tx===tx&&o.ty===ty);if(it&&it.id==='board'&&!S.items.board)boardItem(ctx,x,y,t);else if(it&&!S.items[it.id]){const b=Math.round(Math.sin(t*.06)*1.5);blit(ctx,SEED,x+2,y+2+b,SEED_P);if((t>>3)%5===0){ctx.fillStyle='#fff';ctx.fillRect(x+1+((t>>3)%3)*4,y-1+b,1,1)}}}
    }
    /* the shrine's carved pedestal (F), its biome's fragment standing on it until he lifts it */
    for(const f of R.pedestals){const cx=f.tx*T+T/2-ox,fy=(f.ty+1)*T-oy;if(cx<-40||cx>VW+40||fy<-60||fy>VH+20)continue;
      blit(ctx,PED,cx-11,fy-PED.length,PED_P);
      const k=PIECES.indexOf(f.piece);if(k>=0&&!S.pieces[k])drawFragment(ctx,k,cx,fy-PED.length-13,{mk});}
    if(R.id==='hub')drawFragments(ctx,S,ox,oy,mk);   /* the disc's four fragment recesses (game/door.js) */
    /* light */
    const amb=R.id==='hub'?(S.lit?Math.min(1,S.litT/60):0):(AMB[R.biome]??.4);
    if(amb<1){
      L.fill(0);
      const pcx=p.x+9-ox,pcy=p.y+14-oy;
      if(S.mode==='dark'||S.mode==='intro'){
        let r=28*S.match+(S.match>=1?Math.sin(t*.37)*.8+(Math.random()<.08?-1.5:0):0),lx=pcx+p.face*8,ly=pcy-2;
        if(S.mode==='dark'&&S.idle>720){const tt=hubTorch(),dx=tt.x-p.x-9,dy=tt.y-p.y-12,dd=Math.hypot(dx,dy)||1,pu=(Math.sin(t*.15)+1)*4;lx+=dx/dd*pu;ly+=dy/dd*pu;r+=Math.random()*3}
        addLight(L,lx,ly,r,1);
      }else addLight(L,pcx,pcy,58,1);
      for(const tt of R.torches){const lit=torchKey(tt)||(R.id==='hub'&&S.lit),x=tt.tx*T+6-ox,y=tt.ty*T+4-oy;if(lit)addLight(L,x,y,86+Math.sin(t*.21)*2,1);else if(!(R.id==='hub'))addLight(L,x,y,12,.6)}
      for(const it of R.items)if(!S.items[it.id])addLight(L,it.tx*T+6-ox,it.ty*T+6-oy,26,.9);
      for(const f of R.pedestals)addLight(L,f.tx*T+6-ox,f.ty*T-6-oy,S.pieces[PIECES.indexOf(f.piece)]?18:44,.85);
      for(const q of R.perches)addLight(L,q.tx*T+6-ox,q.ty*T+2-oy,S.sit&&perchOf(R,S.p)===q?46:24,.7);   /* a seat is lit, so it reads as a place to stop */   /* a shaft of light on the shrine */
      /* enemies and thorns give no light (Tyler): their red lives in the sprite art; enemies draw after this pass */
      lightPass(amb);
      /* the dark room's window edge: a faint dithered frame wherever the light comes near it */
      if(R.id==='hub'&&!S.lit){
        const edge=(x,y,d)=>{let l=0;for(let k=0;k<=14;k+=2){const i=(y+d[1]*k)*VW+x+d[0]*k;if(L[i]>l)l=L[i]}return l};
        for(const [x0,y0,dx,dy,n,nx,ny] of [[0,0,1,0,VW,0,1],[0,VH-1,1,0,VW,0,-1],[0,0,0,1,VH,1,0],[VW-1,0,0,1,VH,-1,0]])
          for(let i=0;i<n;i++){const x=x0+dx*i,y=y0+dy*i,l=edge(x,y,[nx,ny]);if(l<=.05)continue;
            if(l*1.6>BT[y*VW+x]){ctx.fillStyle=(i&1)?'#8c8c8c':'#5a5a5a';ctx.fillRect(x,y,1,1)}
            if(l>.3&&(i&1)&&l>BT[y*VW+x]){ctx.fillStyle='#3a3a3a';ctx.fillRect(x+nx,y+ny,1,1)}}
      }
    }

    waterCrest(ctx,S,ox,oy,t,amb<1?L:null,amb,reduce);   /* the surface line reads in the dark */
    if(R.plates.length)links(ctx,S,R,ox,oy,t,reduce);
    /* the thorn that got him flashes white like an enemy would (steady under reduced motion) */
    const blinkOn=reduce||(t>>1)&1;
    if(p.dead&&Array.isArray(S.flash)&&blinkOn){ctx.fillStyle='#fff';thorn(R,S.flash[0],S.flash[1],(px,py)=>ctx.fillRect(px-ox,py-oy,1,1))}
    /* enemies: drawn after the light so they always read. k: colour amount (1 full, 0 grey while wrapped, -1 flash) */
    S.ens.forEach((e,i)=>{
      if(!vis(e.x,e.y))return;
      const fl=p.dead&&S.flash===i&&blinkOn,jit=e.grace&&!reduce?((t>>1)&1?1:-1):0,bx=X(e.x)+jit,by=Y(e.y);
      if(e.soft)return (e.k==='crab'?drawCrab:drawFish)(ctx,e,bx,by,t,fl?-1:1,reduce);   /* Flood (game/floodart.js) */
      const k=fl?-1:!e.wrap?1:e.wrap<SLACK?1-e.wrap/SLACK:0,M=(e.k==='moss'?drawMoss:drawPuff)(ctx,e,bx,by,t,k);
      if(fl)return;
      if(e.wrap)wrapped(ctx,M,e,t,reduce);
      else if(e.grace)snapped(ctx,M,e);
      else if(e.k==='puff'&&!reduce)spores(ctx,e,bx,by);
    });
    /* M1b: the thorn wall over everything but him; the fragment's ghost in its recess, its flight there, the slot's pulse */
    if(S.chase)thornWall(ctx,S,R,ox,oy,t,reduce,p.dead&&S.flash==='chase'&&blinkOn);
    if(R.id==='hub')slotFx(ctx,S,ox,oy,t,reduce);
    /* root strands run from his shoes to their tips every frame */
    const st0=look(S),sx=Math.round(p.x)-7-ox,sy=Math.round(p.y)-20-oy,fr=FR[st0.f]||FR.idle,fy=sy+31+fr[2]+fr[1];
    const feet=[[sx+10,fy+2],[sx+20,fy+2]];
    /* dust at his feet (A5, A6), behind him: specks in the room's light rock tones, a 3 px one rounded, dithering away with age */
    if(live(S)&&fx.puffs.length){const P=PAL[R.biome]||PAL.roots;
      for(const q of fx.puffs){const x=X(q.x-q.w/2),y=Y(q.y)-q.w,a=q.t/q.life;if(bay(x,y)<a)continue;ctx.fillStyle=a<.4?P.topL:P.rockL;
        if(q.w>2){ctx.fillRect(x+1,y,1,3);ctx.fillRect(x,y+1,3,1)}else ctx.fillRect(x,y,q.w,q.w)}}
    if(!p.dead&&!p.hide)strands(ctx,S,R,feet,ox,oy,t);

    /* the mascot */
    /* reduced motion: no mac/buddy flicker, no glitch, and steady dimming in place of the death and invulnerable blinks */
    if(!p.hide&&!(!reduce&&p.inv>0&&!p.rez&&(p.inv>>2)&1)){
      let st=st0,x=sx,y=sy,c,k=0;
      if(p.gl>0&&S.mode==='intro'&&!reduce)st=(t>>2)&1?{mac:1}:look({...S,p:{...p,mac:0}}),k=.35+((t*7)%5)/10;
      else if(p.dead)k=reduce?0:.6+(18-p.dead)/18*.4;
      else if(p.rez>0)k=reduce?0:p.rez/12*.9;
      if(st.mac)y+=2;
      if(reduce)ctx.globalAlpha=p.dead?.35:p.inv>0?.6:1;
      if(k){c=glitch(sprite(st),k,t);x-=4}
      else c=sprite(st);
      ctx.drawImage(c,x,y);
      if(!k&&!st.mac)shoes(ctx,S,feet,fy,p.face);
      boardUnder(ctx,S,ox,oy,t,reduce);
      if(!p.surf)waterFront(ctx,S,R,ox,oy,p);   /* swimming: the water in front of him */
      ctx.globalAlpha=1;
      if(S.mode==='dark'&&!p.dead&&S.match>0){
        const hx=Math.round(p.x+(p.face>0?20:-3))-ox,hy=Math.round(p.y+8)-oy,f=(t>>2)%3;
        ctx.fillStyle='#c9a36a';ctx.fillRect(hx,hy+2,1,5);ctx.fillStyle='#F08A2A';ctx.fillRect(hx-1,hy-1+(f&1),3,3);ctx.fillStyle=YEL;ctx.fillRect(hx,hy+(f===2?0:1),1,2);
      }
    }
    /* HUD: what he carries */
    if(S.lit){
      let hx=4;
      if(S.items.root){blit(ctx,SEED,hx,4,SEED_P);hx+=11}
      if(S.items.board){boardHud(ctx,hx,6);hx+=12}
      drawHudPieces(ctx,S.pieces,hx,3,mk);   /* quarter-disc fragments, hollow until carried (game/door.js) */
    }
  }
  return {draw,step,look,setLook(l){LOOK={...(l||{})}}};   /* look: for node tests */
}

/* plate -> gate: the same cyan marks on the plate, on a socket over the gate, and on a vein through the floor between
   them (when they share a floor). Held (or latched open), the marks light and a pulse runs along the vein to the gate. */
const LINK={off:'#2c5a61',dim:'#3f8590',on:'#7fe8f4',hi:'#e6fdff'};
function links(ctx,S,R,ox,oy,t,reduce){
  const on=S.plate||(S.latch&&S.latch[R.id]),beat=!S.plate||reduce?0:(t>>3)&1,mark=on?(beat?LINK.hi:LINK.on):LINK.dim;
  const px=(x,y,c,w=1,h=1)=>{ctx.fillStyle=c;ctx.fillRect(x-ox,y-oy,w,h)};
  const cols={};for(const g of R.gates){const c=cols[g.tx]||(cols[g.tx]={top:g.ty,bot:g.ty});c.top=Math.min(c.top,g.ty);c.bot=Math.max(c.bot,g.ty)}
  for(const {tx,ty} of R.plates){
    const x=tx*T,y=ty*T;px(x+3,y+(S.plate?T-3:T-5),mark,6,1);
    for(const gx in cols){const g=cols[gx];if(g.bot!==ty)continue;
      const a=Math.min(+gx*T+T,x),b=Math.max(+gx*T,x+T),vy=(ty+1)*T+3;
      for(let vx=a;vx<b;vx+=2){const d=(((x-vx)*(+gx*T<x?1:-1)-(t*1.5|0))%48+48)%48,run=on&&!reduce&&S.plate&&d<8;px(vx,vy,on?(run?LINK.hi:LINK.on):LINK.off)}}
  }
  const hgt=Math.round(T*(1-S.gate));
  for(const gx in cols){const x=+gx*T,y=cols[gx].top*T;px(x+2,y-4,INK,8,4);px(x+3,y-3,mark,6,2);if(on&&!beat)px(x+4,y-3,LINK.hi,2,1);
    if(hgt>6)for(let ty=cols[gx].top;ty<=cols[gx].bot;ty++)px(x+5,ty*T+4,mark,2,2)}
}

/* ---------- enemies ---------- */
/* a wrapped enemy goes a cold grey so the green roots read; k is how much colour is back (Bayer-dithered in) */
const GREY=new Map();
function shade(c,x,y,k){
  if(k>=1||(k>0&&bay(x,y)<k))return c;
  let g=GREY.get(c);
  if(!g){const [r,gg,b]=rgb(c),l=(r*.3+gg*.59+b*.11)*.5+(c===INK?0:62);g=`rgb(${l*.88|0},${l*.93|0},${Math.min(255,l*1.1)|0})`;GREY.set(c,g)}
  return g;
}
/* plot a char grid pixel by pixel; at(i,j) gives the screen pixel. k: 1 colour, 0 grey, -1 white (the death flash).
   Returns the silhouette (key -> char) and its centre, which the root bands are clipped to. */
const key=(x,y)=>(y+64)*4096+x+64;
function plot(ctx,rows,pal,at,k){
  const m=new Map();let sx=0,sy=0;
  for(let j=0;j<rows.length;j++){const r=rows[j];for(let i=0;i<r.length;i++){const c=r[i];if(c==='.')continue;
    const [x,y]=at(i,j);ctx.fillStyle=k<0?'#fff':shade(pal[c],x,y,k);ctx.fillRect(x,y,1,1);m.set(key(x,y),c);sx+=x;sy+=y}}
  return {m,cx:sx/m.size,cy:sy/m.size};
}
/* Mossback, turned to match its surface g and heading m; the sprite's last row sits on the surface */
function drawMoss(ctx,e,bx,by,t,k){
  const arc=e.len>T&&e.p>=6&&e.p<6+Math.PI*2,rows=arc?MOSS_TURN:MOSS[e.wrap||e.grace?1:e.len?(e.p/3|0)&3:(t>>5)&1];
  const W=rows[0].length,H=rows.length,cx=bx+e.w/2,cy=by+e.h/2,h=!(e.len>T&&e.p>=6+Math.PI);
  const gx=h?e.ogx:e.gx,gy=h?e.ogy:e.gy,mx=h?e.omx:e.mx,my=h?e.omy:e.my;
  const M=plot(ctx,rows,MOSS_P,(i,j)=>{const u=i+.5-W/2,v=j+.5-H/2+(8-H)/2;return [Math.floor(cx+u*mx+v*gx),Math.floor(cy+u*my+v*gy)]},k);
  M.ux=-gx;M.uy=-gy;return M;
}
/* Spore puff: breath frame from its bob phase (in on the way up, out at the top) */
function drawPuff(ctx,e,bx,by,t,k){
  const f=e.wrap||e.grace?0:((e.ph/(Math.PI*2))%1)*4|0,M=plot(ctx,PUFF[f],PUFF_P,(i,j)=>[bx-1+i,by-2+j],k);
  M.ux=0;M.uy=-1;return M;
}
/* spores puffed out on the breath out, drifting down and thinning */
function spores(ctx,e,bx,by){
  const a=((e.ph/(Math.PI*2))%1+.25)%1;if(a>.7)return;
  for(let n=0;n<4;n++){const x=Math.round(bx+6+(n-1.5)*(1+a*7)),y=Math.round(by+9+a*(8+n%2*4));if(bay(x,y)<a*1.3)continue;
    ctx.fillStyle=n&1?PUFF_P.c:PUFF_P.o;ctx.fillRect(x,y,1,1)}
}
/* Root bands, wound like rope: thick bright front bands on one diagonal over darker back bands on the other,
   inside the body's INK outline and out over a 1px rim where they wrap round it, each front band casting an INK edge;
   eyes stay clear.
   The last second (wrap<SLACK) is the warning: bands slide and wobble, break, dull and hang loose while the colour
   and the red glow creep back in. */
const RB={hi:'#e4ff9c',g:'#8fe04a',d:'#3f9a2e',D:'#2a6a22'},RS={hi:'#cfd27a',g:'#a3ad48',d:'#66702c',D:'#4a5020'};
function wrapped(ctx,M,e,t,reduce){
  const left=e.wrap,slack=left<SLACK,L=slack?1-left/SLACK:0,P=6,C=slack?RS:RB,o=slack?Math.round(L*2.5+(reduce?0:Math.sin(t*.4)*L*1.5)):0;
  const all=new Map(M.m);
  for(const q of M.m.keys())for(const d of [1,-1,4096,-4096])if(!all.has(q+d))all.set(q+d,null);
  const x0=Math.round(M.cx),y0=Math.round(M.cy);
  for(const [q,c] of all){
    if(c==='w'||c==='e'||c==='k')continue;
    const x=q%4096-64,y=(q/4096|0)-64,i=x-x0,j=y-y0,w=slack&&!reduce?Math.round(Math.sin(t*.3+j*.9)*L*1.4):0;
    const d1=((i+j+o+w)%P+P)%P,d2=((i-j-o+w+1)%P+P)%P,f1=d1<2,b2=d2<2;
    if(slack&&(f1||b2)&&hash(x>>1,(y>>1)+(reduce?0:t>>4))<L*.5)continue;
    let f=null;
    if(c===null){if(f1||b2)f=f1?C.d:C.D;
      if(slack&&(f1||b2)&&M.m.has(q-4096)){const n=1+Math.round(L*5);for(let s=1;s<=n;s++){ctx.fillStyle=s===n?C.g:C.d;ctx.fillRect(x+Math.round(Math.sin(t*.15+x)*L*s*.4),y+s,1,1)}}}
    else if(f1)f=d1===0?C.hi:C.g;else if(b2)f=C.d;else if(d1===2)f=INK;
    if(f){ctx.fillStyle=f;ctx.fillRect(x,y,1,1)}
  }
  /* stun mark: two sparks circling over its head until the roots start to give */
  if(!slack){const cx=M.cx+M.ux*8,cy=M.cy+M.uy*8,px=-M.uy,py=M.ux;
    for(let n=0;n<2;n++){const a=(reduce?0:t*.12)+n*Math.PI,c=Math.cos(a)*4,s=Math.sin(a)*1.5,x=Math.round(cx+px*c-M.ux*s),y=Math.round(cy+py*c-M.uy*s);
      ctx.fillStyle=Math.sin(a)>0?'#ffffff':'#9db0a8';ctx.fillRect(x,y,1,1);if(Math.sin(a)>0){ctx.fillStyle=RB.g;ctx.fillRect(x-1,y,1,1);ctx.fillRect(x+1,y,1,1);ctx.fillRect(x,y-1,1,1);ctx.fillRect(x,y+1,1,1)}}}
}
/* just let go: snapped root bits fly off while it shakes itself free */
function snapped(ctx,M,e){
  const a=GRACE-e.grace;if(a>22)return;
  for(let n=0;n<6;n++){const an=n*1.05+.5,x=Math.round(M.cx+Math.cos(an)*(4+a*.8)),y=Math.round(M.cy+Math.sin(an)*(3+a*.5)+a*a*.03);
    if(bay(x,y)<a/22)continue;ctx.fillStyle=n&1?RS.g:RS.d;ctx.fillRect(x,y,2,1)}
}

/* ---------- root strands and shoes ---------- */
/* how far a burst's strands have drawn back into the shoes: from t 18, or fast once he lands (0..1) */
const back=b=>Math.max(b.t>18?(b.t-18)/10:0,(b.g||0)/5);
/* six strands fan down and out inside the burst's hit box (engine burst(): 8+t*.9 each side, 6+t*3 deep). A tip that
   meets ground, or an enemy the burst hit, holds there while he rises, so the strand stretches from his foot; a loose
   tip hangs from the foot and trails behind as he flies up. */
const FAN=[[-1,.4],[-.6,1],[.6,1],[1,.4]];
function strands(ctx,S,R,feet,ox,oy,t){
  const p=S.p,all=[];
  for(const b of S.roots){
    const r=back(b);if(r>=1)continue;
    const n=Math.min(b.t,10),hw=8+n*.9,hh=6+n*3;
    const tips=FAN.map(([fx,fy],k)=>{const wx=b.x+fx*hw,wy=b.y-4+fy*hh,dx=wx-b.x,dy=wy-b.y,d=Math.hypot(dx,dy);let g=null;
      for(let s=3;s<=d;s++){const x=b.x+dx*s/d,y=b.y+dy*s/d;if(solidCh(R,Math.floor(x/T),Math.floor(y/T))){g=[x,y];break}}
      return {k,wx,wy,g,e:null}});
    for(const i of b.hit){const e=S.ens[i];if(!e)continue;const ex=e.x+e.w/2,ey=e.y+e.h/2,dd=q=>Math.hypot(q.wx-ex,q.wy-ey);
      tips.filter(q=>!q.e).sort((a,c)=>dd(a)-dd(c)).slice(0,2).forEach(q=>q.e=e)}
    for(const q of tips){const [fx,fy]=feet[q.k<FAN.length/2?0:1],e=q.e,cl=(v,a,b)=>v<a?a:v>b?b:v;
      /* a held enemy is gripped at the near edge of its box, so the strand meets its bands without hiding it */
      const hold=r>0?null:e?[cl(fx+ox,e.x+2,e.x+e.w-2),cl(fy+oy,e.y+1,e.y+e.h-1)]:q.g;
      const tx=hold?hold[0]-ox:fx+q.wx-b.x,ty=hold?hold[1]-oy:fy+q.wy-b.y+4+Math.max(0,-p.vy)*1.2+Math.max(0,b.t-10)*.4;
      /* drawing back: the whole strand shrinks into the sole, so the tip keeps its curl */
      const v=1-r,sx0=fx+1,sy0=fy-1;all.push(curve(sx0,sy0,sx0+(tx-sx0)*v,sy0+(ty-sy0)*v,q.k,t,!!hold))}
  }
  /* thin earthy roots, secondary to the shoes: a 1px shadow, brown from the sole, greening to the tip */
  for(const pts of all)for(const [x,y,w] of pts){ctx.fillStyle=ROOT.out;ctx.fillRect(x+1,y+1,w,w);ctx.fillRect(x-1,y,1,w)}
  for(const pts of all)for(const [x,y,w,u] of pts){ctx.fillStyle=u>.86?ROOT.tip:u>.7?ROOT.olive:(x+y)%4?ROOT.b:ROOT.hi;ctx.fillRect(x,y,w,w)}
}
const ROOT={out:'#22160d',b:'#7a5030',hi:'#a2744a',olive:'#7d8a38',tip:'#9fd45a'};
/* foot to tip: a gently sagging quadratic that stops a little short and curls over at the end (a loose tip curls
   outward, a gripping one hooks round its hold) */
function curve(x0,y0,x1,y1,k,t,hold){
  const dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy)||1,wv=Math.sin(k*1.9+t*.2)*(hold?.8:1.6),sag=hold?Math.min(5,len*.1):1;
  const f=hold?.92:.8,ex=x0+dx*f,ey=y0+dy*f,cx=(x0+ex)/2-dy/len*wv,cy=(y0+ey)/2+dx/len*wv+sag,pts=[];
  const qn=Math.ceil(len*f*1.5);for(let s=0;s<=qn;s++){const u=s/qn,a=(1-u)*(1-u),m=2*u*(1-u),c=u*u;pts.push([a*x0+m*cx+c*ex,a*y0+m*cy+c*ey])}
  /* the curl: carry on from the end's heading round a shrinking circle, turning away from the body */
  let hx=ex-cx,hy=ey-cy;const hl=Math.hypot(hx,hy)||1;hx/=hl;hy/=hl;
  const s=dx>=0?-1:1,R0=(hold?1.6:2.6)*Math.min(1,len/16),sweep=hold?Math.PI:Math.PI*1.5,nx=-hy*s,ny=hx*s,ccx=ex+nx*R0,ccy=ey+ny*R0,ph=Math.atan2(-ny,-nx);
  for(let i=1;i<=10;i++){const th=sweep*i/10,r=R0*(1-.55*i/10),a=ph+s*th;pts.push([ccx+Math.cos(a)*r,ccy+Math.sin(a)*r])}
  const out=[],N=pts.length-1;let lx,ly;
  for(let i=0;i<=N;i++){const x=Math.round(pts[i][0]),y=Math.round(pts[i][1]);if(x===lx&&y===ly)continue;lx=x;ly=y;out.push([x,y,i<N*.15?2:1,i/N])}
  return out;
}
/* root shoes: brown leather, on for good once he has the seed (from the saved item, so they survive rooms and reloads);
   the toe points the way he faces. The roots shoot out of their soles. */
const SHOE=['.kkkk...','khhBBkk.','kBBBBBBk','kdddddBk','kSSSSSSk'];
const SHOE_P={k:INK,h:'#cf9a62',B:'#965f34',d:'#6e4324',S:'#2b1b10'};
function shoes(ctx,S,feet,fy,face){
  if(!S.items.root)return;
  for(const [x] of feet)blit(ctx,SHOE,x-(face<0?4:2),fy-3,SHOE_P,face<0);
}

/* ---------- the thorn wall (game/chases.js) ----------
   A tangle of dark vines whose front edge writhes; thorns stick out of the front and off the outer strands, dark at the
   base and red only at the tips. Behind the front the tangle sinks into shadow through a Bayer dither: no light of its
   own. Outrun, it withers: the front sags back and the tangle dithers away. flash: the thorn tips go white (his death). */
const TWC=Object.fromEntries(Object.entries({gap:'#120c09',d:'#24180f',m:'#3a2818',l:'#553b22',hi:'#76552f',moss:'#2c3d1d',mossL:'#41592a',deep:'#070505'}).map(([k,v])=>[k,rgb(v)]));
const TRED=rgb(RED),TRED2=rgb(RED2),TWHT=[255,255,255];
function thornWall(ctx,S,R,ox,oy,t,reduce,flash){
  const c=S.chase,w=c.on?0:Math.min(1,c.w/WITHER),bx=R.at[0]*T,by=R.at[1]*T,tt=reduce?0:t;
  const front=c.x-bx-ox-w*36;
  if(front<-16)return;
  const W=Math.min(VW,Math.ceil(front+14));if(W<=0)return;
  const img=ctx.getImageData(0,0,W,VH),d=img.data,y0=Math.max(0,-oy),y1=Math.min(VH,R.h*T-oy);
  for(let y=y0;y<y1;y++){
    const wy=y+oy+by,edge=front+5*Math.sin(wy*.083+tt*.031)+3*Math.sin(wy*.21-tt*.047)+2*Math.sin(wy*.47+tt*.023);
    /* a thorn every 7 rows: 3 rows thick, 4-8 px long, pointing east */
    const s=Math.floor(wy/7),sy=s*7+3,L=4+Math.floor(hash(s,7)*5),dy=Math.abs(wy-sy),spike=dy<=1?edge+L*(1-dy/2):-1e9;
    const xe=Math.min(W-1,Math.ceil(Math.max(edge,spike)));
    for(let x=0;x<=xe;x++){
      let col=null;
      if(x>edge){if(x<=spike){const k=spike-x;col=k<1?(flash?TWHT:TRED):k<2.2?(flash?TWHT:TRED2):TWC.l}}
      else{
        const dd=edge-x;
        if(dd>44)col=TWC.deep;
        else{
          /* three families of vines: wiggling near-vertical stems and two crossing diagonals, all warped by a slow wobble */
          const wx=x+ox+bx,q=Math.sin(wy*.045+wx*.02)*1.6,
            v1=Math.sin(wx*.16+wy*.27+q+tt*.02),v2=Math.sin(wx*.13-wy*.24-q-tt*.017),v3=Math.sin(wx*.31+Math.sin(wy*.07+wx*.01)*2.2),
            a1=Math.abs(v1),a2=Math.abs(v2),a3=Math.abs(v3);
          if(a3<.28)col=v3>0?(a3<.1?TWC.hi:TWC.l):TWC.m;
          else if(a1<.36)col=v1>0?(a1<.12?TWC.hi:TWC.l):TWC.m;
          else if(a2<.34)col=v2>0?TWC.m:TWC.d;
          else{const h=hash(wx>>1,wy>>1);col=h<.07?TWC.mossL:h<.2?TWC.moss:TWC.gap}
          if(dd<1.2&&col===TWC.gap)col=TWC.d;   /* the front reads as one mass */
          /* barbs on the outer strands, red at the point */
          if(dd<14&&a1>=.36&&a1<.44&&hash(wx>>1,wy>>1)<.18)col=flash?TWHT:hash(wx,wy)<.5?TRED2:TRED;
          const k=(dd-8)/36;if(k>0&&bay(x,y)<k)col=TWC.deep;   /* the shadow side */
        }
      }
      if(col&&w>0&&bay(x+3,y+1)<w)col=null;   /* withering */
      if(col){const j=(y*W+x)*4;d[j]=col[0];d[j+1]=col[1];d[j+2]=col[2];d[j+3]=255}
    }
  }
  ctx.putImageData(img,0,0);
}

/* ---------- the door ritual (engine door()) ----------
   Carrying a fragment not yet set, its ghost breathes in its recess (stronger while he stands there). Set off, it flies
   from his hands in an arc into the slot; set, the slot pulses in its inlay colour, a ring and a brightening per hum. */
function slotFx(ctx,S,ox,oy,t,reduce){
  const p=S.p,sl=S.slot;
  if(!sl){const k=S.pieces.findIndex((v,i)=>v&&!S.placed[i]);if(k<0||S.door||!S.lit)return;
    const c=fragCentre(k),a=(reduce?.3:.2+.1*Math.sin(t*.08))+.45*Math.min(1,S.dwell/RITE.dwell);
    drawFragment(ctx,k,c.x-ox,c.y-oy,{mk,alpha:a});return}
  const c=fragCentre(sl.k);
  if(sl.t<RITE.fly){const u=sl.t/RITE.fly,e=u*u*(3-2*u),x0=p.x+9,y0=p.y-8;
    drawFragment(ctx,sl.k,x0+(c.x-x0)*e-ox,y0+(c.y-y0)*e-Math.sin(u*Math.PI)*(reduce?0:20)-oy,{mk});return}
  const q=sl.t-RITE.fly;
  if(!reduce)for(let n=0;n<3;n++){const a=q-n*30;if(a<0||a>36)continue;const r=8+a*.8,fade=a/36;ctx.fillStyle=ACCENT[sl.k];
    for(let i=0;i<96;i++){const an=i/96*Math.PI*2,x=Math.round(c.x+Math.cos(an)*r)-ox,y=Math.round(c.y+Math.sin(an)*r)-oy;if(bay(x,y)>=fade)ctx.fillRect(x,y,1,1)}}
  const g=reduce?Math.max(0,1-q/RITE.pulse)*.5:Math.max(0,1-(q%30)/24)*.55;
  if(g>0){ctx.globalCompositeOperation='lighter';drawFragment(ctx,sl.k,c.x-ox,c.y-oy,{mk,alpha:g});ctx.globalCompositeOperation='source-over'}
}
