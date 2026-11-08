import {XLEAF} from '../mascot/xleaf.js';
/* Wake Up: the pixels of feeding (game/feed.js): plants lying in the room, a spat-out seed, a leaf or flower that has let go, and the puffs.
   They draw after the light pass like the enemies, so they read in any room. */
const PAL={b:'#7A4A1E',B:'#5A3410',h:'#C99A5A',g:'#4FA84A',G:'#2F7A35',l:'#8BD36A',s:'#3F8A3A',r:'#7A5230',y:'#F2C94C',o:'#E08A1E',
  k:'#1A1716',w:'#FFFFFF',Y:'#F6B92B',O:'#FFD94A',T:'#3FC2B5',n:'#0B5A55',d:'#00393B',u:'#E8DCC0',H:'#FF2E88',R:'#FF3333',W:'#F1E9D2'};
const HEART=['HH.HH','HHHHH','.HHH.','..H..'],HEART_S=['H.H','HHH','.H.'];
const EXCL=['kkk','kYk','kYk','kYk','kkk','kYk','kkk'];
/* the mascot's extra leaf and flower art (mascot/xleaf.js) in this file's letters: the atlas's dark edge 'h' is 'd' here, its yellow 'o' is 'O', its red 'r' is 'R' and its cream 'B' is 'W' */
const XL={};for(const k in XLEAF)XL[k]=XLEAF[k].map(a=>({dx:a.dx,dy:a.dy,rows:a.rows.map(r=>r.replace(/h/g,'d').replace(/o/g,'O').replace(/r/g,'R').replace(/B/g,'W'))}));
const SEED=["..bb..",".bhbB.","bhbbBB",".bbBB.","..BB.."];
const SPROUT=[".ll.ll.","lggGggl",".gGsGg.","...s...","...s...","..rsr..",".r.s.r."];
const BLOOM=[".ppppp.","ppyyypp","ppyoypp","ppyyypp",".ppppp.","...s...","...s...","..rsr..",".r.s.r."];
const LEAF_REST=[".dddd.","dTTnnd",".dddd."],LEAF_TALL=[".dd.","dTnd","dTnd",".dd."];
const FLOWER_REST=[".kkk.","kwYwk","kOYOk","kwYwk",".kkk."],FLOWER_THIN=[".k.","kYk","kOk","kYk",".k."];
const SPR={seed:SEED,sprout:SPROUT,bloom:BLOOM},FEED_GROW=24;   /* FEED.grow (game/feed.js; not imported, so this file stays free of the engine cycle) */

function blit(ctx,rows,x,y,col,flip){
  for(let j=0;j<rows.length;j++){const r=rows[j];for(let i=0;i<r.length;i++){const c=r[i];if(c==='.')continue;
    ctx.fillStyle=c==='p'?col:PAL[c];ctx.fillRect(x+(flip?r.length-1-i:i),y+j,1,1)}}
}

/* ox, oy: the camera. A plant on the ground twinkles now and then so it reads as something to walk into */
export function drawFeed(ctx,S,ox,oy,t,reduce){
  const F=S.feed;if(!F)return;
  const vis=(x,y)=>x>ox-16&&x<ox+304&&y>oy-16&&y<oy+232;
  for(const d of F.drops){
    if(!vis(d.x,d.y))continue;
    const rows=SPR[d.k],w=rows[0].length,x=Math.round(d.x)-(w>>1)-ox,y=Math.round(d.y)-rows.length-oy;
    blit(ctx,rows,x,y,d.col);
    if(d.land&&!reduce&&((t+(d.x|0))>>3)%14===0){ctx.fillStyle='#fff';ctx.fillRect(x+(w>>1),y-3,1,1);ctx.fillRect(x+(w>>1)-1,y-2,3,1);ctx.fillRect(x+(w>>1),y-1,1,1)}
  }
  for(const s of F.shed){
    if(!vis(s.x,s.y))continue;
    const flower=s.k==='flower',turn=!s.land&&!reduce&&(((t+s.ph)>>3)&1);
    const rows=flower?(turn?FLOWER_THIN:FLOWER_REST):(turn?LEAF_TALL:LEAF_REST),w=rows[0].length;
    blit(ctx,rows,Math.round(s.x)-(w>>1)-ox,Math.round(s.y)-rows.length-oy,'#fff',!s.land&&Math.sin((t+s.ph)*.11)<0);
  }
  /* enemies: a "!" while one has noticed a plant, and the leaf or flower it grew from one */
  for(const e of S.ens){
    if(e.k==='plat'||e.k==='vent'||!vis(e.x,e.y))continue;
    const cx=Math.round(e.x+e.w/2)-ox,top=Math.round(e.y)-oy;
    /* the leaf or flower grows on a stem: the stem first (1 px up every 6 frames, to 4), the growth steps on top of it */
    if(e.lf){const sh=Math.min(4,1+((e.lf.t/6)|0)),xs=e.lf.t<FEED_GROW/3?0:e.lf.t<FEED_GROW*2/3?1:2,a=XL[e.lf.k][xs];
      ctx.fillStyle=PAL.n;ctx.fillRect(cx,top-sh+1,1,sh+1);ctx.fillStyle=PAL.s;ctx.fillRect(cx,top-sh+1,1,1);
      if(e.lf.t>=4)blit(ctx,a.rows,cx+a.dx,top-sh+1+a.dy,'#fff')}
    if(e.fz>0){for(let i=0;i<3;i++){const a=(t*.12+i*2.1),sx=cx+Math.round(Math.cos(a)*6),sy=top-6+Math.round(Math.sin(a)*2);ctx.fillStyle=PAL.Y;ctx.fillRect(sx,sy,1,1);ctx.fillRect(sx-1,sy,3,1);ctx.fillRect(sx,sy-1,1,3)}}   /* a held fish: stars circle its head */
    if(e.fd&&e.fd.st==='alert'){const b=reduce?0:Math.abs(Math.sin(e.fd.t*.35))*2|0;blit(ctx,EXCL,cx-1,top-11-b,'#fff')}
  }
  /* hearts rise and thin out */
  for(const h of F.hearts||[]){if(h.t<0)continue;const k=h.t/54,x=Math.round(h.x+Math.sin(h.t*.2+h.x)*2)-ox,y=Math.round(h.y-k*20)-oy;if(!vis(h.x,h.y))continue;
    if(k>.75&&(h.t&1))continue;blit(ctx,k>.55?HEART_S:HEART,x-2,y,'#fff')}
  for(const q of F.spit)if(vis(q.x,q.y)){blit(ctx,SEED,Math.round(q.x)-3-ox,Math.round(q.y)-2-oy,'#fff',(q.t>>2)&1)}
  for(const q of F.pop){const r=1+(q.t>>1),a=q.t<6?'u':'h';ctx.fillStyle=PAL[a];
    for(const [dx,dy] of [[-1,-1],[1,-1],[-1,1],[1,1]])ctx.fillRect(Math.round(q.x)+dx*r-ox,Math.round(q.y)+dy*r-oy,1,1)}
}
