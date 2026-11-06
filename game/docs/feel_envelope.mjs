const G=.26,GH=.15,JV=4.6,CUT=2,RUN=1.6,MAXF=4.6;
const appr=(v,t,a)=>v<t?Math.min(t,v+a):Math.max(t,v-a);
// jump, real stepPlayer order; hold(f) is inp.j on step f (f=1 is press step)
function jump(hold,vx0=0,boost=0,airRate=(vx,dir)=>.13,dir=0){let y=0,vy=-JV,x=0,vx=vx0+boost*dir,top=0,apex=null,jc=1,f;
 for(f=1;f<300;f++){ if(f>1)vx=appr(vx,dir*RUN,airRate(vx,dir)); if(jc&&!hold(f)&&vy<-CUT)vy=-CUT; if(vy>=0)jc=0;
  vy=Math.min(MAXF,vy+(hold(f)&&Math.abs(vy)<.8?GH:G)); y+=vy; x+=vx; top=Math.min(top,y); if(apex===null&&vy>=0)apex=f; if(y>=0)break}
 return {h:+(-top).toFixed(2),apex,air:f,dx:+x.toFixed(2)}}
console.log('full',jump(()=>true));
console.log('release at once (j=0 on press step)',jump(()=>false));
console.log('test tap (j on press step only)',jump(f=>f<=1));
console.log('script tap (f<=2)',jump(f=>f<=2));
console.log('run-jump RUN, dir held',jump(()=>true,RUN,0,()=>.13,1));
console.log('run-jump + boost .71 decays at AACC',jump(()=>true,RUN,.711,()=>.13,1));
console.log('run-jump + boost .71 decays at .072 (Celeste RunReduce*AirMult)',jump(()=>true,RUN,.711,(vx,d)=>Math.abs(vx)>RUN&&Math.sign(vx)===d?.072:.13,1));
// reversal frames
function rev(v0,target,rateOpp,rateSame){let v=v0,f=0;while(v!==target&&f<200){const opp=Math.sign(v)!==Math.sign(target)&&v!==0;v=appr(v,target,opp?rateOpp:rateSame);f++}return f}
console.log('ground reverse now',rev(1.6,-1.6,.2,.2),'B2',rev(1.6,-1.6,.3,.2),'B2+B6',rev(1.6,-1.6,.3,.27));
console.log('air reverse now',rev(1.6,-1.6,.13,.13),'B4 .18 opposing',rev(1.6,-1.6,.18,.13),'.18 both',rev(1.6,-1.6,.18,.18));
console.log('air stop .07',Math.ceil(1.6/.07),'.13',Math.ceil(1.6/.13),'.18',Math.ceil(1.6/.18),'celeste-equal rate',(1.6/8.3).toFixed(3));
// Celeste air time full jump (continuous)
const cG=900,cJ=105,cH=40,mf=160;const rise=.2+(cJ-cH)/cG+cH/(cG*.5);const h=28.01;
let rem=h-cH*cH/(2*cG*.5);let t=cH/(cG*.5);const d2=(mf*mf-cH*cH)/(2*cG);t+=(mf-cH)/cG;rem-=d2;t+=rem/mf;
console.log('celeste rise s',rise.toFixed(3),'fall s',t.toFixed(3),'air frames',((rise+t)*60).toFixed(1),'run-jump px',(90*(rise+t)).toFixed(1),'tiles',(90*(rise+t)/8).toFixed(2),'boost extra px',(40*40/(2*260)).toFixed(2));
// camera steady lag when falling at v: c += (ty-c)*.12 per frame
for(const v of [2.6,4.6,6.9]){console.log('cam lag at',v,'px/f =',(v*(1-.12)/.12).toFixed(1),'px')}
// body heights / widths
console.log('ours jump bodies',(39.1/24).toFixed(2),'celeste',(28/11).toFixed(2),'run-jump body widths ours',(62.4/18).toFixed(2),'celeste',(59.8/8).toFixed(2));
console.log('arc ratio dist/height ours',(62.4/39.1).toFixed(2),'celeste',(59.8/28).toFixed(2));
console.log('speed body widths/s ours',(96/18).toFixed(2),'celeste',(90/8).toFixed(2),'screen widths/s ours',(96/288).toFixed(3),'celeste',(90/320).toFixed(3));
console.log('scale recovery celeste per frame',(1.75/60).toFixed(4),'0.4 ->',Math.ceil(.4/(1.75/60)),'0.6 ->',Math.ceil(.6/(1.75/60)));
console.log('celeste landing squash at maxfall 160:',(160/240).toFixed(3),'-> scale',(1+.6*160/240).toFixed(2),(1-.6*160/240).toFixed(2));
console.log('our vy0 range: drop 1 tile vy',Math.sqrt(2*G*12).toFixed(2),'full jump landing vy (falls 39px)',Math.min(MAXF,Math.sqrt(2*G*39.1)).toFixed(2));
