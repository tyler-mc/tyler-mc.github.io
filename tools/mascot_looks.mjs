/* The look matrix shared by tools/test_mascot.mjs: a fixed seed, so every run sees the same looks (random combinations of every look flag compose() reads). */
export function looks(n=600){
  let r=20261106;const rnd=()=>(r=(r*16807)%2147483647)/2147483647,pick=a=>a[Math.floor(rnd()*a.length)];
  const out=[{dir:[0,0],stage:0},{f:'idle',dir:[0,-1],happy:1,stage:4}];
  while(out.length<n){
    const s={f:pick(['idle','breath','squash','stretch','land','squash2']),dir:[pick([-1,0,1]),pick([-1,0,1])],stage:pick([0,1,2,3,4])};
    if(rnd()<.2)s.blink=1;if(rnd()<.1)s.sleep=1;if(rnd()<.35)s.face=pick(['scared','huh','yuck','love','awe']);
    if(rnd()<.3)s.happy=1;if(rnd()<.2)s.mouth=1;if(rnd()<.15)s.gape=1+Math.floor(rnd()*6);if(rnd()<.1)s.pens=1;
    if(rnd()<.15)s.hold=pick([-1,1]);if(rnd()<.15)s.heart=1+Math.floor(rnd()*3);if(rnd()<.1)s.q=1;
    if(rnd()<.25)s.hat=pick(['party','crown','shades']);if(rnd()<.3)s.sp=Math.floor(rnd()*3);
    if(rnd()<.3)s.hop=pick([2,3,4,6]);if(rnd()<.2)s.air=1;if(rnd()<.2)s.dx=pick([-1,1,2]);
    if(rnd()<.3)s.arms=[pick([210,180,150,false,120,240]),pick([330,0,30,false,60,300])];if(rnd()<.3)s.flip=1;if(rnd()<.2)s.bv=pick([0,1]);
    out.push(s);
  }
  return out;
}
/* a recording canvas the size of the grid: draw calls land in px (a color string or null per pixel) */
export function mockCtx(w=40,h=64){
  const px=new Array(w*h).fill(null);
  return {px,w,h,fillStyle:'',clearRect(){px.fill(null)},fillRect(x,y,ww,hh){for(let j=0;j<hh;j++)for(let i=0;i<ww;i++)px[(y+j)*w+x+i]=this.fillStyle}};
}
