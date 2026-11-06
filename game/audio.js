/* Synthesized Web Audio only. Nothing plays until unlock() runs inside a user gesture. */
export function createAudio(muteKey){
  let ac=null,master=null,sfxBus=null,crk=null,rmb=null,rst=null,hush=null,ambs={},cur=null,muted=false,drip=0;
  try{muted=localStorage.getItem(muteKey)==='1'}catch(_){}
  const now=()=>ac.currentTime;
  function buf(sec,fill){const b=ac.createBuffer(1,Math.floor(ac.sampleRate*sec),ac.sampleRate),d=b.getChannelData(0);fill(d,ac.sampleRate);return b}
  const white=sec=>buf(sec,d=>{for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1});
  function src(b,loop){const s=ac.createBufferSource();s.buffer=b;s.loop=!!loop;return s}
  function env(g,t,a,peak,dec){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+dec)}
  function tone(type,f0,f1,dur,vol,t=now()){
    const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
    env(g,t,.005,vol,dur);o.connect(g).connect(sfxBus);o.start(t);o.stop(t+dur+.05);
  }
  function noise(dur,vol,type,f0,f1,q=1,t=now()){
    const s=src(NB),f=ac.createBiquadFilter(),g=ac.createGain();f.type=type;f.Q.value=q;f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(f1,t+dur);
    env(g,t,.005,vol,dur);s.connect(f).connect(g).connect(sfxBus);s.start(t,Math.random()*1.5);s.stop(t+dur+.05);
  }
  let NB=null;
  function unlock(){
    if(!ac){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      ac=new AC();master=ac.createGain();master.gain.value=muted?0:.6;master.connect(ac.destination);
      sfxBus=ac.createGain();sfxBus.gain.value=.9;sfxBus.connect(master);
      NB=white(2);
      /* crackle: sparse clicks of random size, looped through a band-pass; its gain follows torch distance */
      const cb=buf(3,(d,sr)=>{for(let i=0;i<d.length;i++){if(Math.random()<.0009){const a=(Math.random()**2)*.9,L=sr*(.0008+Math.random()*.003);for(let k=0;k<L&&i+k<d.length;k++)d[i+k]+=(Math.random()*2-1)*a*(1-k/L)}}});
      const cs=src(cb,true),cf=ac.createBiquadFilter(),cg=ac.createGain();cf.type='bandpass';cf.frequency.value=2400;cf.Q.value=.6;cg.gain.value=0;
      const hiss=src(NB,true),hf=ac.createBiquadFilter(),hg=ac.createGain();hf.type='lowpass';hf.frequency.value=500;hg.gain.value=.08;
      cs.connect(cf).connect(cg).connect(master);hiss.connect(hf).connect(hg).connect(cg);cs.start();hiss.start();crk=cg;
      /* the thorn wall: a low rumble (brown noise under 120 Hz plus a 38 Hz throb) and a dry rustle of thorns (band-passed
         clicks with a fast tremolo); both gains follow how close the wall is, the rustle opening up as it nears */
      {const rb=buf(4,d=>{let l=0;for(let i=0;i<d.length;i++){l=(l+.02*(Math.random()*2-1))/1.02;d[i]=l*3.5}});
        const s=src(rb,true),f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=120;rmb=ac.createGain();rmb.gain.value=0;
        const o=ac.createOscillator(),og=ac.createGain();o.type='triangle';o.frequency.value=38;og.gain.value=.25;
        s.connect(f).connect(rmb);o.connect(og).connect(rmb);rmb.connect(master);s.start();o.start();
        const cb=buf(2,(d,sr)=>{for(let i=0;i<d.length;i++)if(Math.random()<.004){const L=sr*.002;for(let k=0;k<L&&i+k<d.length;k++)d[i+k]+=(Math.random()*2-1)*(1-k/L)*.8}});
        const c=src(cb,true),cf2=ac.createBiquadFilter();cf2.type='bandpass';cf2.frequency.value=1800;cf2.Q.value=.7;rst=ac.createGain();rst.gain.value=0;
        const tr=ac.createGain();tr.gain.value=.6;const lo=ac.createOscillator(),lg=ac.createGain();lo.frequency.value=7;lg.gain.value=.4;lo.connect(lg).connect(tr.gain);
        c.connect(cf2).connect(tr).connect(rst);rst.connect(master);c.start();lo.start()}
      /* the hush: three sines (open fifths) with slow swells, silent until he sits on a perch (hush(v)) */
      {const hg=ac.createGain();hg.gain.value=0;hg.connect(master);
        [98,147,196].forEach((f,i)=>{const o=ac.createOscillator(),og=ac.createGain(),l=ac.createOscillator(),lg=ac.createGain();o.type='sine';o.frequency.value=f*(1+i*.002);og.gain.value=.5/(i+1);
          l.frequency.value=.07+i*.03;lg.gain.value=.25/(i+1);l.connect(lg).connect(og.gain);o.connect(og).connect(hg);o.start();l.start()});hush=hg}
      /* ambiences: cave = brown rumble + low drone; moss = soft band of air with a slow swell */
      const brown=buf(4,d=>{let l=0;for(let i=0;i<d.length;i++){l=(l+.02*(Math.random()*2-1))/1.02;d[i]=l*3.5}});
      const mk=(nodes)=>{const g=ac.createGain();g.gain.value=0;g.connect(master);nodes(g);return g};
      ambs.cave=mk(g=>{const s=src(brown,true),f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=260;s.connect(f).connect(g);s.start();
        const o=ac.createOscillator(),og=ac.createGain();o.frequency.value=55;og.gain.value=.05;o.connect(og).connect(g);o.start();
        const l=ac.createOscillator(),lg=ac.createGain();l.frequency.value=.08;lg.gain.value=.03;l.connect(lg).connect(og.gain);l.start()});
      ambs.moss=mk(g=>{const s=src(NB,true),f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=700;f.Q.value=.4;const sg=ac.createGain();sg.gain.value=.12;
        s.connect(f).connect(sg).connect(g);s.start();const l=ac.createOscillator(),lg=ac.createGain();l.frequency.value=.13;lg.gain.value=.07;l.connect(lg).connect(sg.gain);l.start();
        const b=src(brown,true),bf=ac.createBiquadFilter();bf.type='lowpass';bf.frequency.value=180;const bg=ac.createGain();bg.gain.value=.5;b.connect(bf).connect(bg).connect(g);b.start()});
      /* tide (Flood): low lapping water, a slow swell of filtered noise under a soft brown floor */
      ambs.tide=mk(g=>{const s=src(NB,true),f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=520;const sg=ac.createGain();sg.gain.value=.16;
        s.connect(f).connect(sg).connect(g);s.start();const l=ac.createOscillator(),lg=ac.createGain();l.frequency.value=.19;lg.gain.value=.12;l.connect(lg).connect(sg.gain);l.start();
        const b=src(brown,true),bf=ac.createBiquadFilter();bf.type='lowpass';bf.frequency.value=140;const bg=ac.createGain();bg.gain.value=.45;b.connect(bf).connect(bg).connect(g);b.start()});
    }
    if(ac.state==='suspended')ac.resume();
  }
  /* o: {lv, reduce} from tick(). vary: a random pitch factor within +-a (none under reduced motion, A12) */
  const vary=(o,a)=>o&&o.reduce?1:1+(Math.random()*2-1)*a;
  const FX={
    jump:o=>{const k=vary(o,.06);tone('square',260*k,520*k,.09,.08)},   /* A9: +-6% */
    root:()=>{noise(.28,.35,'lowpass',1400,120,1.5);tone('sine',110,40,.25,.35)},
    stun:()=>{tone('triangle',700,140,.16,.2);noise(.05,.15,'highpass',3000,2000)},
    unwrap:()=>noise(.18,.08,'bandpass',900,400,2),
    die:()=>{const t=now();for(let i=0;i<7;i++)tone('square',[880,220,660,110,990,330,70][i],[440,880,110,660,220,990,40][i],.04,.09,t+i*.035);noise(.3,.12,'highpass',4000,800)},
    rez:()=>{const t=now();[392,523,784].forEach((f,i)=>tone('sine',f,f,.12,.1,t+i*.05))},
    torch:()=>{noise(.9,.4,'bandpass',300,2600,.8);tone('sine',70,140,1.1,.25)},
    light:()=>noise(.4,.2,'bandpass',400,2200,.9),
    cp:()=>{},
    item:()=>{const t=now();[523,659,784,1047].forEach((f,i)=>tone('square',f,f,.1,.07,t+i*.08))},
    thud:()=>{tone('sine',90,35,.3,.5);noise(.15,.25,'lowpass',600,100)},
    fall:()=>tone('sine',600,180,.7,.04),
    glitch:()=>{const t=now();for(let i=0;i<10;i++)tone('square',100+Math.random()*1800,100+Math.random()*900,.03,.06,t+i*.05)},
    match:()=>{noise(.12,.25,'highpass',2000,5000);const t=now()+.12;noise(.5,.18,'bandpass',600,1500,.8,t)},
    /* A9: by fall speed. Up to 2.2 (the old threshold) a short soft tap; above, the old sound, growing louder, brighter and
       longer toward MAXF, with a low thump on the hardest */
    land:o=>{const lv=o&&Number.isFinite(o.lv)?o.lv:2.3;
      if(lv<=2.2){const u=Math.max(0,(lv-1)/1.2);noise(.03+.015*u,.025+.04*u,'lowpass',500+250*u,180);return}
      const u=Math.min(1,(lv-2.2)/2.4);noise(.06+.04*u,.1+.06*u,'lowpass',800+500*u,200);if(u>.5)tone('sine',100,40,.1,(u-.5)*.2)},
    footstep:o=>{const k=vary(o,.08);noise(.03,.035,'bandpass',1400*k,600*k,1.4)},   /* A10: +-8%, under the jump */
    swim:()=>noise(.15,.08,'bandpass',500,1200,2),
    plate:()=>tone('square',120,90,.08,.1),
    gateOpen:()=>{noise(.35,.15,'lowpass',500,150);tone('square',80,60,.3,.06)},
    gateShut:()=>{tone('sine',70,40,.2,.3);noise(.12,.2,'lowpass',400,100)},
    /* the fragment: lifted off its pedestal (a stone scrape and a low bell), the thorns tearing out of the rock behind */
    piece:()=>{const t=now();noise(.35,.25,'bandpass',300,900,1.2);[196,294,392].forEach((f,i)=>tone('sine',f,f,1.2,.09,t+.05+i*.06))},
    chase_start:()=>{const t=now()+.35;tone('sine',60,30,1.4,.5,t);noise(1.1,.4,'lowpass',900,80,1,t);noise(.6,.25,'bandpass',2200,700,1.5,t+.1)},
    chase_done:()=>{noise(1.4,.25,'bandpass',1400,200,1.2);tone('sine',90,45,1.2,.2)},
    /* the door: the fragment leaves his hands, then sets into its slot with a stone knock and a rising hum that pulses */
    lift:()=>{tone('sine',330,660,.5,.06);noise(.4,.06,'highpass',3000,6000)},
    place:()=>{const t=now();tone('sine',80,50,.25,.5,t);noise(.18,.3,'lowpass',700,120,1,t);
      for(let i=0;i<3;i++){const o=ac.createOscillator(),o2=ac.createOscillator(),g=ac.createGain(),a=t+.12+i*.5;o.type='sine';o2.type='sine';o.frequency.value=110;o2.frequency.value=165.5;
        g.gain.setValueAtTime(0,a);g.gain.linearRampToValueAtTime(.16-i*.04,a+.12);g.gain.exponentialRampToValueAtTime(.0001,a+.75);o.connect(g);o2.connect(g);g.connect(sfxBus);o.start(a);o2.start(a);o.stop(a+.8);o2.stop(a+.8)}},
    door:()=>{const t=now();tone('sine',55,40,2.5,.5,t);noise(2.4,.35,'lowpass',400,60,1,t)},
    /* Flood: the board's whoosh, a wave as it lands on water, a splash in; the crab's shell clack and pinch; the fish's
       bump, its swelling turn, the lunge and the calm after */
    dash:()=>{noise(.18,.22,'bandpass',900,3200,1.2);tone('sine',180,320,.12,.05)},
    surf:()=>{noise(.45,.3,'lowpass',1400,300,1);tone('sine',120,70,.3,.12)},
    splash:()=>noise(.3,.22,'lowpass',1800,250,1),
    shell:()=>{tone('square',520,260,.06,.12);tone('triangle',180,120,.12,.15)},
    emerge:()=>tone('triangle',300,500,.12,.07),
    pinch:()=>{tone('square',900,700,.03,.06);tone('square',1100,800,.03,.06,now()+.05)},
    ram:()=>noise(.15,.15,'bandpass',600,300,2),
    knock:()=>{tone('sine',420,300,.12,.12);noise(.08,.1,'lowpass',700,200)},
    turn:()=>{tone('sine',140,90,.5,.25);tone('square',70,55,.5,.08)},
    hunt:()=>noise(.4,.15,'lowpass',500,900,1),
    lunge:()=>{tone('square',200,60,.18,.18);noise(.12,.25,'lowpass',1200,200)},
    calm:()=>tone('sine',500,700,.15,.06),
  };
  return {
    unlock,
    muted:()=>muted,
    setMute(v){muted=v;try{localStorage.setItem(muteKey,v?'1':'0')}catch(_){}if(master)master.gain.setTargetAtTime(v?0:.6,now(),.02)},
    sfx(n,o){if(!ac||ac.state!=='running'||muted)return;const f=FX[n];f&&f(o)},
    crackle(v){if(crk)crk.gain.setTargetAtTime(v*.9,now(),.1)},
    /* v: how far the hush has swelled, 0..1 (0 = silent) */
    hush(v){if(hush)hush.gain.setTargetAtTime(v*.16,now(),.8)},
    /* v: the thorn wall's nearness 0..1 (0 = silent) */
    rumble(v){if(!rmb)return;rmb.gain.setTargetAtTime(v*.9,now(),.15);rst.gain.setTargetAtTime(v*v*.5,now(),.1)},
    amb(name){
      if(!ac)return;
      if(name!==cur){for(const k in ambs)ambs[k].gain.setTargetAtTime(k===name?(k==='cave'?.5:.35):0,now(),.6);cur=name}
      if(name==='moss'&&!muted&&ac.state==='running'&&now()>drip){drip=now()+1.5+Math.random()*4;tone('sine',1200+Math.random()*900,400,.12,.05)}
    },
    suspend(){if(ac&&ac.state==='running')ac.suspend()},
    resume(){if(ac&&ac.state==='suspended')ac.resume()},
    destroy(){if(ac)ac.close();ac=null},
  };
}
