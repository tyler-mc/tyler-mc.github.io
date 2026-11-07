/* The look matrix shared by tools/test_mascot.mjs and tools/make_mascot_golden.mjs: a fixed seed, so every run sees the same looks. */
export function looks(n=1500){
  let r=20261106;const rnd=()=>(r=(r*16807)%2147483647)/2147483647,pick=a=>a[Math.floor(rnd()*a.length)];
  const out=[{mac:1},{f:'idle',dir:[0,0],stage:0},{f:'idle',dir:[0,-1],happy:1,stage:4,hop:0}];
  for(const f of ['idle','breath','squash','stretch','land','squash2'])for(const dir of [[0,0],[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]])out.push({f,dir,stage:1});
  while(out.length<n){
    const s={f:pick(['idle','breath','squash','stretch','land','squash2']),dir:[pick([-1,0,1]),pick([-1,0,1])],stage:pick([0,1,2,3,4])};
    if(rnd()<.2)s.blink=1;if(rnd()<.1)s.sleep=1;if(rnd()<.35)s.face=pick(['scared','huh','yuck','love','awe']);
    if(rnd()<.3)s.happy=1;if(rnd()<.2)s.mouth=1;if(rnd()<.15)s.gape=1+Math.floor(rnd()*6);if(rnd()<.1)s.pens=1;
    if(rnd()<.15)s.hold=pick([-1,1]);if(rnd()<.15)s.heart=1+Math.floor(rnd()*3);if(rnd()<.15)s.sweat=1;if(rnd()<.1)s.q=1;
    if(rnd()<.15)s.mask=1;if(rnd()<.25)s.hat=pick(['party','crown','shades']);if(rnd()<.3)s.sp=Math.floor(rnd()*3);
    if(rnd()<.3)s.hop=pick([2,3,4,6]);if(rnd()<.2)s.air=1;if(rnd()<.2)s.dx=pick([-1,1,2]);
    out.push(s);
  }
  return out;
}
/* a 32x48 recording canvas: draw calls land in px (a color string or null per pixel) */
export function mockCtx(){
  const px=new Array(32*48).fill(null);
  return {px,fillStyle:'',clearRect(){px.fill(null)},fillRect(x,y,w,h){for(let j=0;j<h;j++)for(let i=0;i<w;i++)px[(y+j)*32+x+i]=this.fillStyle}};
}
