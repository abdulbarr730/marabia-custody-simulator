/* ================= SOUND (all synthesised) ================= */
const Sound={ctx:null,on:true,master:null,
  init(){if(this.ctx){this.ctx.resume();return;}const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const c=this.ctx=new AC();
    this.master=c.createGain();this.master.gain.value=.85;this.master.connect(c.destination);
    // engine
    const eg=this.engineGain=c.createGain();eg.gain.value=0;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=320;
    this.eo=[c.createOscillator(),c.createOscillator()];this.eo[0].type='sawtooth';this.eo[1].type='square';this.eo.forEach(o=>{o.connect(lp);o.start();});lp.connect(eg);eg.connect(this.master);
    // water
    const len=c.sampleRate*2,b=c.createBuffer(1,len,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
    const n=c.createBufferSource();n.buffer=b;n.loop=true;const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=900;bp.Q.value=.5;const wg=this.waterGain=c.createGain();wg.gain.value=0;n.connect(bp);bp.connect(wg);wg.connect(this.master);n.start();
    // alarm
    const ag=this.alarmGain=c.createGain();ag.gain.value=0;const ao=this.alarmOsc=c.createOscillator();ao.type='square';ao.frequency.value=660;ao.connect(ag);ag.connect(this.master);ao.start();
    // music bed
    const mg=this.musicGain=c.createGain();mg.gain.value=0;const mlp=c.createBiquadFilter();mlp.type='lowpass';mlp.frequency.value=900;mlp.connect(mg);mg.connect(this.master);this.pad=[];
    [0,1,2,3].forEach(()=>{const o=c.createOscillator();o.type='triangle';const g=c.createGain();g.gain.value=.05;o.connect(g);g.connect(mlp);o.start();this.pad.push(o);});
    const dl=c.createDelay();dl.delayTime.value=.33;const fb=c.createGain();fb.gain.value=.34;dl.connect(fb);fb.connect(dl);dl.connect(mg);this.delay=dl;this.chord=0;this.nextChord=0;this.nextArp=0;this.arpI=0;
  },
  music(on){if(!this.ctx)return;this.musicOn=on;this.musicGain.gain.setTargetAtTime(on?.5:0,this.ctx.currentTime,1.2);},
  duck(on){if(!this.ctx||!this.musicOn)return;this.musicGain.gain.setTargetAtTime(on?.16:.5,this.ctx.currentTime,.2);},
  tickMusic(){if(!this.ctx||!this.musicOn)return;const t=this.ctx.currentTime;
    const CH=[[110,164.81,220,261.63],[87.31,130.81,174.61,261.63],[130.81,196,261.63,329.63],[98,146.83,196,293.66]];
    if(t>=this.nextChord){const ch=CH[this.chord++%4];this.pad.forEach((o,i)=>o.frequency.setTargetAtTime(ch[i],t,.5));this.cur=ch;this.nextChord=t+6;}
    if(t>=this.nextArp&&this.cur){const f=this.cur[[3,1,2,3,0,2][this.arpI++%6]]*2;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.09,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+.5);o.connect(g);g.connect(this.delay);g.connect(this.musicGain);o.start(t);o.stop(t+.55);this.nextArp=t+.5;}
  },
  tone(f,d=.12,type='sine',v=.25,at=0,glide){if(!this.ctx)return;const t=this.ctx.currentTime+at,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(glide)o.frequency.exponentialRampToValueAtTime(glide,t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+d+.02);},
  click(){this.tone(1200,.04,'square',.06);},
  scan(){this.tone(1400,.08,'square',.1);this.tone(1900,.1,'square',.1,.1);},
  ok(){this.tone(880,.1,'sine',.25);this.tone(1320,.18,'sine',.25,.1);},
  deny(){this.tone(180,.32,'sawtooth',.28);this.tone(140,.42,'sawtooth',.28,.26);},
  valve(){this.tone(220,.18,'square',.14,0,90);this.tone(90,.25,'sine',.45,.18);},
  slam(){this.tone(120,.35,'square',.32,0,40);this.tone(60,.5,'sine',.7,.02);},
  motor(d=1.2){this.tone(150,d,'sawtooth',.05,0,210);},
  ping(){this.tone(1660,.2,'sine',.09);},
  chime(){[523.25,659.25,783.99,1046.5,1318.5].forEach((f,i)=>this.tone(f,.7,'sine',.2,i*.12));},
  update(speed,flow,alarm){if(!this.ctx)return;const t=this.ctx.currentTime,m=this.on?1:0;
    this.master.gain.setTargetAtTime(m*.85,t,.05);
    const k=clamp(speed/18);this.engineGain.gain.setTargetAtTime(k>0?.05+.07*k:.035*(this.idle?1:0),t,.15);this.eo[0].frequency.setTargetAtTime(44+k*70,t,.15);this.eo[1].frequency.setTargetAtTime(66+k*105,t,.15);
    this.waterGain.gain.setTargetAtTime(flow?.11:0,t,.2);
    this.alarmGain.gain.setTargetAtTime(alarm?.055:0,t,.04);if(alarm)this.alarmOsc.frequency.setValueAtTime(Math.sin(t*8)>0?780:560,t);
    this.tickMusic();}
};

/* ================= STATE + TIME ================= */
const S={stage:-1,completed:-1,running:false,qty:15000,site:'Riyadh North Compound',order:null,status:'IDLE',
  vol:0,client:0,truckS:S_POS.staging,truckV:0,slosh:0,sloshV:0,valve:0,valveTarget:0,hatch:0,gate:0,outlet:false,fenceOn:false,
  tds:185,q:82,flow:0,filling:false,discharging:false,siphon:false,wellFlow:false,alarm:null,hmiMsg:'READY',hmiTone:'#9fb0ff',bayReady:false,plate:'KSA 4821 RSA',scenario:null,bigstat:false,
  chuteSeated:false,loaded:0,timeStart:null,lat:0,latV:0,manual:false,faultParts:[],immob:false};
let simClock=0,speedMul=1,paused=false,autoplay=false,director=false,filmOn=false,runId=0,stageT0=0,stageDur=1;
let waiters=[],anims=[];
const wait=s=>new Promise(res=>waiters.push({at:simClock+s,res}));
const anim=(dur,fn,ease=easeSoft)=>new Promise(res=>{anims.push({t:0,dur,fn,ease,res});});
function clearRun(){Voice.stop();runId++;waiters=[];anims=[];S.running=false;S.confirmRes=null;S.awaitConfirm=false;}
function processTime(dt){
  simClock+=dt;const hold=Voice.busy();
  for(let i=anims.length-1;i>=0;i--){const a=anims[i];a.t+=dt;const k=clamp(a.t/a.dur);a.fn(a.ease(k),k);if(k>=1&&!hold){anims.splice(i,1);a.res();}}
  for(let i=waiters.length-1;i>=0;i--){if(!hold&&simClock>=waiters[i].at){const w=waiters[i];waiters.splice(i,1);w.res();}}
}
const drive=(sTo,dur,ease=easeSoft)=>{if(S.manual)return Promise.resolve();const s0=S.truckS;return anim(dur,k=>{S.truckS=lerp(s0,sTo,k);},ease);};
const setValve=open=>{S.valveTarget=open?1:0;};

/* ---- director ---- */
let curShot=null;const _p=new V3(),_t=new V3();
function shot(o){
  curShot=Object.assign({t0:simClock,dur:5,ease:easeSoft,p1:o.p,t1:o.t,fov:38},o);
  curShot.fov1=o.fov1||curShot.fov;
  if(director&&o.cut!==false){const c=$('#cutFade');c.classList.remove('go');void c.offsetWidth;c.classList.add('go');}
}
function aheadPoint(dist,side,y){const u=clamp((S.truckS+dist)/PATH_LEN),p=pathCurve.getPointAt(u),t=pathCurve.getTangentAt(u);return [p.x-t.z*side,y,p.z+t.x*side];}
function applyShot(){
  const c=curShot,k=c.ease(clamp((simClock-c.t0)/c.dur));
  _p.set(lerp(c.p[0],c.p1[0],k),lerp(c.p[1],c.p1[1],k),lerp(c.p[2],c.p1[2],k));
  _t.set(lerp(c.t[0],c.t1[0],k),lerp(c.t[1],c.t1[1],k),lerp(c.t[2],c.t1[2],k));
  if(c.rel==='both'||c.rel==='p')truck.localToWorld(_p);
  if(c.rel==='both'||c.rel==='t')truck.localToWorld(_t);
  const n=performance.now()*.001;_p.x+=Math.sin(n*.7)*.035;_p.y+=Math.sin(n*1.1+1)*.03;_p.z+=Math.cos(n*.9)*.035;
  camera.position.copy(_p);controls.target.copy(_t);camera.lookAt(_t);
  const f=lerp(c.fov,c.fov1,k);if(Math.abs(camera.fov-f)>.01){camera.fov=f;camera.updateProjectionMatrix();}
}

/* ---- narrative helpers ---- */
const Voice={until:0,src:null,bufs:{},token:0,
  busy(){return !!this.src||performance.now()<this.until;},
  clip(text){
    if(this.bufs[text])return Promise.resolve(this.bufs[text]);
    const bin=atob(VOICE_CLIPS[text]),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
    return new Promise((ok,no)=>Sound.ctx.decodeAudioData(arr.buffer,ok,no)).then(b=>this.bufs[text]=b);
  },
  speak(text){
    this.halt();const tk=++this.token;
    if(Sound.ctx&&VOICE_CLIPS[text]){
      this.until=performance.now()+1500; // covers decoding
      this.clip(text).then(b=>{
        if(tk!==this.token)return;
        const n=Sound.ctx.createBufferSource(),g=Sound.ctx.createGain();n.buffer=b;n.playbackRate.value=Math.min(speedMul,1.5);g.gain.value=1.15;n.connect(g);g.connect(Sound.master);
        n.onended=()=>{if(this.src===n){this.src=null;this.until=0;Sound.duck(false);}};this.src=n;this.until=0;Sound.duck(true);n.start();
      }).catch(()=>{this.until=0;});
      return;
    }
    if(!window.speechSynthesis)return;
    const u=new SpeechSynthesisUtterance(text),rate=1.04*Math.min(speedMul,1.5);u.rate=rate;
    // safety net: some voices never report the end of a line
    this.until=performance.now()+(text.split(/\s+/).length/(2.1*rate)+2.5)*1000;
    u.onend=u.onerror=()=>{if(tk===this.token)this.until=0;};speechSynthesis.speak(u);
  },
  halt(){if(this.src){const n=this.src;this.src=null;n.onended=null;try{n.stop();}catch(e){}Sound.duck(false);}this.until=0;if(window.speechSynthesis)speechSynthesis.cancel();},
  stop(){this.token++;this.halt();},
};
const capEl=$('#caption');let captionsOn=true,voiceOn=true;
function say(kick,text){
  $('#capK').textContent=kick;$('#capT').textContent=text;capEl.classList.toggle('off',!captionsOn);
  if(voiceOn&&ROLE!=='client'&&ROLE!=='driver')Voice.speak(text);
}
function hideCaption(){capEl.classList.add('off');}
function ev(text,tone=''){Ops.addLog(text,tone);const f=$('#feed'),d=document.createElement('div');d.className='ev '+tone;d.textContent=text;f.appendChild(d);while(f.children.length>4)f.removeChild(f.firstChild);setTimeout(()=>{d.style.opacity=0;setTimeout(()=>d.remove(),500);},7000);}
let activeParts=[];function setActive(ids){activeParts=ids;}
function setBad(ids){PARTS.forEach(p=>p.el.classList.toggle('bad',ids.includes(p.id)));}
function setStatus(s){S.status=s;}
function hmi(msg,tone='#9fb0ff'){S.hmiMsg=msg;S.hmiTone=tone;}
function beamOn(from,to,color,dur=1.3){
  const d=to.clone().sub(from),len=d.length();G.beam.position.copy(from).addScaledVector(d,.5);G.beam.scale.set(.7,len,.7);G.beam.quaternion.setFromUnitVectors(UP,d.clone().normalize().negate());G.beamMat.color.setHex(color);
  anim(dur,(k,raw)=>{G.beamMat.opacity=Math.sin(raw*PI)*.5*(.7+.3*Math.sin(raw*40));},t=>t);
}
function plcBlink(){G.plcLeds.forEach((m,i)=>{if(i)m.emissive.setHex(0x35e0ff);});setTimeout(()=>G.plcLeds.forEach((m,i)=>{if(i)m.emissive.setHex(0x223355);}),420);}
function pktTo(name,color){packet(G.wires[name],color||0x8fe9ff,.75);setTimeout(plcBlink,520);}
const plateW=()=>truck.localToWorld(new V3(5.9,1.2,0));
const anprW=()=>G.anpr.localToWorld(new V3(-.5,0,0));

/* ================= THE 8 STAGES ================= */
const L=()=>fmtL(S.qty);
const fillDur=()=>6+10*S.qty/15000;
const STAGES=[
 {name:'Order Created & Quota Locked',short:'Order created, quota locked',cam:0,dur:()=>filmOn?12:5,async run(){
   setStatus('IDLE');setActive([]);
   shot({p:[-178,58,118],p1:[-112,26,58],t:[-60,3,0],t1:[-66,3,0],dur:12,fov:34,cut:false});
   if(filmOn){ // the story opens on the client's phone
     Ops.hero('phone');UI.drawerToOrder();Ops.notes=[];Ops.notesDirty=true;
     say('It starts on your phone','You need water on site. Open the app, choose how much, and tap once.');
     await wait(1.6);const q=$(`#qtyBox button[data-q="${S.qty}"]`);if(q)q.click();
     await wait(1.6);const b=$('#placeBtn');if(b)b.classList.add('tap');Sound.click();
     await wait(.35);UI.drawerToTrack();Sound.chime();
   }
   Ops.notify(`Order confirmed. ${L()} reserved for you.`);ev(`Order ${S.order.no} created for ${S.site}`);
   await wait(filmOn?1.6:1.7);
   Ops.hero('dash','overview');if(filmOn)say('In the M Arabia office','The same second, the order lands on the admin dashboard, and a tanker is assigned.');
   ev(`Quota locked: ${L()}`,'ok');hmi('QUOTA LOCKED','#5ff0c2');pktTo('box',0xfff3a0);pingRing(new V3(GX,.2,0),0xffffff,14,1.6);Sound.scan();
   await wait(filmOn?3.6:3);Ops.hero(null);
   await wait(filmOn?2.5:.2);
 }},
 {name:'Truck Enters Gantry ➔ ANPR + UHF RFID Dual Match',short:'ANPR + RFID dual match',cam:1,dur:()=>14,async run(){
   setStatus('AUTHENTICATING');Sound.idle=true;
   say('Behind the scenes · Identity','Two checks must agree: the camera reads the plate, the radio reader reads the hidden tag.');
   shot({p:[12,1.0,6.8],p1:[3.2,1.5,7],t:[3,2.1,0],t1:[1,2.6,0],rel:'both',dur:5,fov:36});
   await drive(S_POS.gate,5);
   setActive(['anpr']);shot({p:[-64.6,5.9,-1.8],p1:[-65,5.6,-1.9],t:plateW().toArray(),t1:plateW().toArray(),dur:2,fov:26});
   beamOn(anprW(),plateW(),COL.green,1.4);Sound.scan();TR.plateGlow.material.opacity=.8;
   await wait(.9);ev(`ANPR reads plate ${S.plate}: on today's order`,'ok');pktTo('anpr');Sound.ok();
   await wait(1);TR.plateGlow.material.opacity=0;
   setActive(['rfid']);shot({p:[-67.6,2.5,-7.4],p1:[-68.4,2.7,-7],t:[-71.6,2.5,5],t1:[-72.2,2.3,4],fov:32,dur:2.4});
   const rp=new V3(-71,3.1,5.4);for(let i=0;i<3;i++)setTimeout(()=>pingRing(rp,0x60a5fa,3.2,1,false),i*260);Sound.scan();G.rfidLedMat.emissive.setHex(COL.green);
   await wait(1.2);ev('UHF RFID tag matches the same truck','ok');pktTo('rfid');Sound.ok();
   await wait(.9);ev('Dual match confirmed. Gate opens.','ok');
   setActive([]);G.gateLight.emissive.setHex(COL.green);Sound.motor(1.2);
   shot({p:[-82,3.4,12],p1:[-70,5,14],t:[-68,3,0],t1:[-58,4,0],dur:5.2,fov:38});
   anim(1.2,k=>S.gate=k);await wait(.6);
   await drive(S_POS.bay,4.4);
   if(!S.manual){anim(1.2,k=>S.gate=1-k);G.gateLight.emissive.setHex(COL.red);}hmi(S.manual?'DRIVE TO BAY':'TRUCK IN BAY','#9fb0ff');
 }},
 {name:'Chute Seated in Top Hatch ➔ PLC Opens Motorized Valve',short:'Chute seated, valve opens',cam:3,dur:()=>7.6,async run(){
   setStatus('FILLING');setActive(['chute']);
   say('Behind the scenes · Safety','The chute seats in the roof hatch, and a sensor confirms it. No seal, no water.');
   shot({p:[-51,7.3,8],p1:[-52,6.2,6.6],t:[GX,5.4,0],t1:[GX,4.8,0],dur:5,fov:32});
   Sound.valve();await anim(1,k=>S.hatch=k);ev('Roof hatch opened');
   Sound.motor(2.2);const l0=G.chuteLen;await anim(2.2,k=>G.setChute(lerp(l0,3.5,k)));
   S.chuteSeated=true;S.bayReady=true;G.collarLedMat.emissive.setHex(COL.green);hmi('BAY READY','#5ff0c2');ev('Hatch sensor: chute fully seated','ok');ev('Onboard unit confirms this truck is at the gantry','ok');pktTo('hatch');Sound.ok();
   await wait(1);
   setActive(['valve','plc']);shot({p:[-54,9.8,8],p1:[-54.6,9.4,7],t:[GX,PIPE_Y+.3,Z_VALVE],t1:[GX,PIPE_Y+.3,Z_VALVE],dur:3.4,fov:28});
   await wait(.5);pktTo('valve',0x7dffc4);setValve(true);Sound.valve();ev('PLC opens the motorized valve','ok');
   await wait(1.2);
 }},
 {name:'TUF-2000B Counts Liters',short:'TUF-2000B counts liters',cam:2,dur:fillDur,async run(){
   setStatus('FILLING');setActive(['meter']);S.filling=true;S.bigstat=true;$('#bsL').textContent='TUF-2000B metered volume';hmi('FILLING','#49c6ff');
   say('Behind the scenes · Metering','Water flows. The clamp-on meter counts every litre as the tank rises.');
   const d=fillDur(),q=S.qty*.96;
   anim(1.2,k=>S.flow=lerp(0,120,k));
   anim(d,k=>S.vol=q*k,t=>t);
   shot({p:[-63.5,2.7,7.3],p1:[-60,2.7,6.5],t:[-60.7,2.6,0],t1:[-60.7,2.6,0],dur:d*.42,fov:46});
   await wait(d*.42);
   say('Behind the scenes · Metering','Sound pulses cross the pipe. A straight pipe run keeps the reading accurate.');
   S.bigstat=false;shot({p:[-52.4,6.4,11.4],p1:[-53.4,6,10],t:[-56.7,5.6,8],t1:[-56.7,5.6,8],dur:d*.3,fov:30});
   await wait(d*.3);S.bigstat=true;
   shot({p:[-37,1.3,17],p1:[-42,2.4,16],t:[-59,5,2],t1:[-59,4.6,1],dur:d*.28,fov:36});
   await wait(d*.28);
 }},
 {name:'Exact Quota Reached ➔ Valve Auto-Slams Shut',short:'Quota hit, valve slams shut',cam:2,dur:()=>7,async run(){
   setStatus('FILLING');setActive(['valve']);S.filling=true;S.bigstat=true;
   say('Behind the scenes · Exact quota',`At exactly ${L()}, the valve slams shut by itself. No driver, no argument.`);
   shot({p:[-53.5,9.6,7.8],p1:[-54.2,9.2,6.8],t:[GX,PIPE_Y+.2,Z_VALVE],t1:[GX,PIPE_Y+.2,Z_VALVE],dur:3,fov:28});
   const v0=S.vol;anim(2.4,k=>{S.vol=lerp(v0,S.qty,k);S.flow=lerp(120,24,k);},t=>t);
   await wait(2.4);S.vol=S.qty;S.loaded=S.qty;S.filling=false;S.flow=0;setValve(false);Sound.slam();pktTo('valve',0xffb4b4);hmi('QUOTA REACHED','#5ff0c2');ev(`${L()} reached. Valve shut.`,'ok');
   await wait(.8);S.bigstat=false;setActive(['chute']);S.chuteSeated=false;S.bayReady=false;
   shot({p:[-51.5,6.6,7.4],p1:[-52,7,7],t:[GX,5.6,0],t1:[GX,5,0],dur:3.8,fov:32});
   Sound.motor(1.9);const l0=G.chuteLen;G.collarLedMat.emissive.setHex(COL.red);await anim(1.9,k=>G.setChute(lerp(l0,1.1,k)));
   Sound.valve();await anim(.9,k=>S.hatch=1-k);ev('Hatch closed and magnetically sealed','ok');hmi('RELEASE TRUCK','#9fb0ff');
   await wait(.8);
 }},
 {name:'Highway Transit ➔ GPS + TDS 185 ppm + Hatch Locked',short:'GPS, TDS 185 ppm, hatch locked',cam:4,dur:()=>24,async run(){
   setStatus('IN TRANSIT');setActive(['gps']);S.hmiMsg='READY';
   say('On the road','Your phone shows the tanker moving live, with an arrival time that updates.');
   shot({p:[-20,5,8],p1:[-17,6,7.4],t:[0,2.4,0],t1:[1,2.4,0],rel:'both',dur:5,fov:36});
   drive(S_POS.fence,24,t=>easeSoft(t)*.55+t*.45);
   S.pinging=true;
   await wait(5);
   shot({p:[12,23,36],p1:[-10,17,31],t:[0,1,0],t1:[3,1,0],rel:'both',dur:6,fov:34});
   say('On the road','You see a truck and an arrival time. The engineering stays with our team.');
   ev('GPS fix: on approved route','ok');
   await wait(6);
   setActive(['gps']);say('Behind the scenes · Purity','A probe checks the water all the way: 185 ppm. Any tampering shows up.');
   shot({p:[-2,2.9,6.8],p1:[-2.4,2.9,5.6],t:[-3,2.5,0],t1:[-3,2.5,0],rel:'both',dur:4.5,fov:32});
   ev('TDS probe: 185 ppm, potable','ok');
   await wait(4.5);
   shot({p:aheadPoint(34,-7,.9),t:[1,2,0],t1:[-3,2.2,0],rel:'t',dur:4.5,fov:30,ease:t=>t});
   ev('Top hatch: locked, no opening events','ok');
   await wait(4.5);
   Ops.notify('Halfway there. Everything is on track.');
   shot({p:[-13,8,-9],p1:[-11,6,-8],t:[4,2,0],t1:[6,2,0],rel:'both',dur:4,fov:36});
   Ops.hero('dash','fleet');say('In the office','The admin sees far more: speed, purity, seal status and every alarm, for every truck.');
   await wait(4);Ops.hero(null);
 }},
 {name:'Enters Client Geofence ➔ Outlet Unlocks ➔ Water Pumped In',short:'Geofence, outlet unlocks, pump',cam:5,dur:()=>23,async run(){
   setStatus('DELIVERING');S.pinging=false;setActive(['outlet']);
   say('Arriving','The tanker is close. Its tap only unlocks inside this green ring.');
   shot({p:[52,26,60],p1:[66,20,52],t:[88,1,12],t1:[92,2,8],dur:5,fov:36});
   S.fenceOn=true;pingRing(new V3(FENCE_C.x,.2,FENCE_C.z),COL.green,FENCE_R,1.5);Sound.ok();ev('GPS confirms: truck inside client geofence','ok');
   await drive(S_POS.client,5);
   ev('TDS still 185 ppm: quality gate passed','ok');ev('Hatch history clean: no openings since gantry','ok');
   Ops.hero('phone');Ops.notify('Your tanker has arrived.');Sound.chime();
   say('Your go-ahead',autoplay?'The app asks if your tank is ready. You can tap yes, or the film will do it for you.':'The app asks if your tank is ready. Tap yes on the phone, or press Next.');
   shot({p:[66,9,34],p1:[70,8,32],t:[90,2,14],t1:[90,2,14],dur:autoplay?4:12,fov:32});
   S.awaitConfirm=true;UI.sync();await new Promise(res=>{S.confirmRes=res;if(autoplay)waiters.push({at:simClock+3.6,res});});UI.sync();S.awaitConfirm=false;S.confirmRes=null;
   Ops.notify('Thanks. Your delivery is starting.');ev('Client confirmed site ready','ok');
   Ops.hero(null);Ops.pip('phone');S.outlet=true;Sound.valve();ev('Outlet valve unlocked','ok');say('Delivery','Water moves into your tank, and you watch the litres climb on your phone.');
   shot({p:[80,2.6,20],p1:[81,2.2,19],t:[87.6,1.2,11],t1:[87.6,1.2,10],dur:3.4,fov:32});
   const a=truck.localToWorld(new V3(-6.65,1.28,0));buildHose(a,CLIENT.inlet);
   await wait(.8);S.discharging=true;S.flow=96;
   const q=S.qty;anim(10.5,k=>{S.vol=q*(1-k);S.client=q*k;},t=>t);
   await wait(2.6);
   S.bigstat=true;$('#bsL').textContent='Delivered, outlet meter';
   shot({p:[97,3.4,26],p1:[93,3.6,24],t:[88,4,-1],t1:[87,4,-1],dur:4,fov:40});
   await wait(4);
   shot({p:[80,3.3,27],p1:[83,3.1,26],t:[89,2.6,14],t1:[90,2.6,14],dur:3.9,fov:32});
   await wait(3.9);
   S.vol=0;S.client=q;S.discharging=false;S.flow=0;S.outlet=false;hose.visible=false;S.bigstat=false;Sound.valve();ev(`Delivered: ${L()}`,'ok');Ops.notify(`Delivered: ${L()} in your tank.`);
   await wait(.3);
 }},
 {name:'3-Way Mass Balance Reconciled ➔ Digital Receipt',short:'3-way balance, receipt',cam:5,dur:()=>filmOn?10:6.4,async run(){
   setStatus('COMPLETED');setActive([]);S.fenceOn=false;
   Ops.hero('dash','recon');say('In the office',`Three separate instruments, one answer: ${L()} loaded, ${L()} carried, ${L()} delivered.`);
   shot({p:[126,34,66],p1:[58,42,76],t:[92,2,6],t1:[92,2,6],dur:7,fov:36});
   const box=$('#balance');box.classList.add('on');
   ['b1','b2','b3'].forEach((b,i)=>setTimeout(()=>{if(S.stage!==7)return;$('#'+b).style.width='100%';$('#'+b+'v').textContent=L();Sound.scan();},300+i*900));
   await wait(3.6);ev('Variance: 0 L. Custody transfer closed.','ok');Sound.chime();
   await wait(2.6);box.classList.remove('on');Ops.hero('phone');say('On your phone','Delivered, with a simple receipt. That is all you need to see.');await wait(filmOn?3.6:.2);Ops.hero(null);
 }}
];

const STAGE_PIP=[null,'dash','dash','phone','dash','phone','phone',null];
/* ---- running ---- */
async function runStage(i){
  const my=++runId;waiters=[];anims=[];
  S.stage=i;S.running=true;stageT0=simClock;stageDur=STAGES[i].dur();resetBalance();
  if(!S.timeStart)S.timeStart=new Date();
  Ops.lastSample=-1;Ops.hero(null);Ops.pip(STAGE_PIP[i]);if(i>0&&!UI.tracking)UI.drawerToTrack();const nt=i>0?NOTES[i]:null;if(nt)Ops.notify(nt(L()));
  UI.sync();
  await STAGES[i].run();
  if(my!==runId)return;
  S.running=false;S.completed=i;UI.sync();
  if(i===STAGES.length-1){finishJourney();return;}
  if(S.manual){Driver.stageDone(i);return;}
  if(autoplay){await wait(.35);if(my===runId)runStage(i+1);}
  else{hideCaption();}
}
function resetBalance(){['b1','b2','b3'].forEach(b=>{$('#'+b).style.width='0';$('#'+b+'v').textContent='0 L';});$('#balance').classList.remove('on');}
function finishJourney(){Recorder.filmEnded();Ops.pip(null);Ops.hero(null);autoplay=false;setFilm(false);setDirector(false);hideCaption();UI.sync();UI.receipt();}
function ensureOrder(){
  if(!S.order){S.order={no:'MA-'+(100000+Math.floor(Math.random()*899999)),at:new Date(),qty:S.qty,site:S.site};Ops.orders.unshift(S.order);}
}
function clearWorld(){
  clearRun();
  Object.assign(S,{vol:0,client:0,truckS:S_POS.staging,truckV:0,valveTarget:0,valve:0,hatch:0,gate:0,outlet:false,fenceOn:false,tds:185,q:82,flow:0,filling:false,discharging:false,siphon:false,wellFlow:false,hmiMsg:'READY',hmiTone:'#9fb0ff',bayReady:false,chuteSeated:false,pinging:false,bigstat:false,plate:'KSA 4821 RSA',loaded:0,lockedOut:false});
  G.setChute(1.1);G.collarLedMat.emissive.setHex(COL.red);G.gateLight.emissive.setHex(COL.red);G.rfidLedMat.emissive.setHex(0x2a48e8);
  G.straps.forEach(s=>s.scale.set(1,1,1));G.xdcr.forEach(x=>{x.rotation.set(0,0,0);x.position.y=PIPE_R+.09;x.position.x=0;});
  TR.setPlate(S.plate);TR.setClone(false);S.ghost=null;TR.plateGlow.material.opacity=0;hose.visible=false;G.beamMat.opacity=0;
  setAlarm(null);setBad([]);setActive([]);resetBalance();FENCE.mat.color.setHex(COL.green);FENCE.fill.material.color.setHex(COL.green);FENCE.wall.material.color.setHex(COL.green);
  $('#feed').innerHTML='';$('#receiptWrap').classList.remove('on');Ops.reset();Ops.pip(null);Ops.hero(null);S.lat=0;S.latV=0;S.faultParts=[];S.immob=false;Driver.v=0;
}
function snapTo(i){
  clearWorld();S.stage=i-1;S.completed=i-1;
  if(i>=2){S.truckS=S_POS.bay;}
  if(i===3||i===4){S.hatch=1;G.setChute(3.5);S.chuteSeated=true;S.bayReady=true;G.collarLedMat.emissive.setHex(COL.green);S.valve=S.valveTarget=1;hmi(i===3?'BAY READY':'FILLING','#5ff0c2');}
  if(i===4){S.vol=S.qty*.96;S.flow=120;S.filling=true;}
  if(i>=5){S.vol=S.qty;S.loaded=S.qty;}
  if(i===6){S.truckS=S_POS.fence;}
  if(i===7){S.truckS=S_POS.client;S.vol=0;S.client=S.qty;S.loaded=S.qty;}
  Ops.backfill(i);
}
function seek(i,opts={}){
  if(S.manual){UI.toast('You are driving. Choose Film to jump between chapters.');return;}
  ensureOrder();snapTo(i);
  if(filmOn&&UI.camMode==='orbit')setDirector(true);
  runStage(i);
}
function advance(){
  if(S.awaitConfirm&&S.confirmRes){const r=S.confirmRes;S.confirmRes=null;S.awaitConfirm=false;Sound.ok();r();return;}
  ensureOrder();
  if(S.manual){UI.toast('A driver is at the wheel. Press 2 to take over, or 4 for the film.');return;}
  if(S.alarm){UI.toast('Clear the alarm first, using the Tamper Lab reset');return;}
  if(S.running){UI.toast('This stage is still running');return;}
  if(S.completed>=STAGES.length-1){restart();return;}
  runStage(S.completed+1);
}
function restart(){S.timeStart=new Date();S.order=null;ensureOrder();seek(0);}
function startFilm(){
  Sound.init();Sound.music(true);UI.closeInspector();if(S.manual){Driver.release();clearWorld();S.stage=-1;S.completed=-1;}
  if(S.alarm||S.scenario)UI.resetLab();
  autoplay=true;paused=false;setFilm(true);UI.setMode('orbit',true);setDirector(true);
  ensureOrder();
  if(S.running){UI.sync();return;}
  if(S.completed>=STAGES.length-1||S.completed<0){S.timeStart=new Date();seek(0);}
  else runStage(S.completed+1);
}
function setFilm(on){filmOn=on;Sound.music(on);document.body.classList.toggle('film',on);if(!on)document.body.classList.remove('idle');UI.bumpIdle();}
function setDirector(on){director=on;document.body.classList.toggle('director',on);UI.sync();if(on){UI.clearPreset();controls.enabled=false;}else{controls.enabled=true;if(camera.fov!==40){UI.fovTarget=40;}}}

/* ================= TAMPER SCENARIOS ================= */
function setAlarm(msg){S.alarm=msg;S.silenced=false;document.body.classList.toggle('alarm',!!msg);if(msg){$('#alarmT').textContent=msg;}}
const SCEN={
 fake:{title:'Fake Plate / Cloned RFID Tag',what:'A rogue truck shows up with a copied tag and a borrowed plate.',verdict:'Plate and tag do not match any open order. The gate stays down and the valve never receives an open command.',parts:['anpr','rfid'],
   async run(){
     S.plate='KSA 7777 XXX';TR.setPlate(S.plate,true);setStatus('AUTHENTICATING');say('Tamper · Identity','A rogue truck arrives with a cloned tag and a borrowed plate.');
     shot({p:[12,1,6.8],p1:[3.2,1.5,7],t:[3,2.1,0],t1:[1,2.6,0],rel:'both',dur:4,fov:36});
     S.truckS=S_POS.gate-22;await drive(S_POS.gate,4);
     shot({p:[-64.6,5.9,-1.8],p1:[-65,5.6,-1.9],t:plateW().toArray(),t1:plateW().toArray(),dur:2.4,fov:26});
     beamOn(anprW(),plateW(),COL.red,1.3);Sound.scan();await wait(1);ev('ANPR reads KSA 7777 XXX: no open order','bad');Sound.deny();pktTo('anpr',0xff9090);
     await wait(1.2);shot({p:[-67.6,2.5,-7.4],p1:[-68.4,2.7,-7],t:[-71.6,2.5,5],t1:[-72.2,2.3,4],fov:32,dur:2.4});
     const rp=new V3(-71,3.1,5.4);for(let i=0;i<3;i++)setTimeout(()=>pingRing(rp,COL.red,3.2,1,false),i*260);G.rfidLedMat.emissive.setHex(COL.red);
     await wait(1.2);ev('RFID tag ID does not match the plate: clone suspected','bad');pktTo('rfid',0xff9090);
     await wait(.8);setAlarm('ACCESS DENIED: identity mismatch. Gate and valve stay locked.');hmi('ACCESS DENIED','#ff8a8a');
     shot({p:[-82,3,10],p1:[-79,3.4,10],t:[-71,1.4,0],t1:[-71,1.4,0],dur:5,fov:36});ev('Security alerted with plate photo','bad');
   }},
 clone:{title:'Same Plate + Same RFID Tag on Another Truck',what:'A different truck arrives wearing a copied plate and a copied tag, so the gate cannot tell it apart.',verdict:'The gate is fooled, as expected. Before opening the valve, the PLC asks the real truck\'s onboard unit to confirm it is here, and it reports from the highway. The valve stays locked and no water is lost. This onboard check is a recommended upgrade to build into the real system.',parts:['gps','plc'],
   async run(){
     TR.setClone(true);S.ghost={x:20,z:-16};setStatus('AUTHENTICATING');say('Tamper · Clone','A different truck arrives wearing a copied plate and a copied tag.');
     shot({p:[12,1,6.8],p1:[3.2,1.5,7],t:[3,2.1,0],t1:[1,2.6,0],rel:'both',dur:4,fov:36});
     S.truckS=S_POS.gate-22;await drive(S_POS.gate,4);
     shot({p:[-64.6,5.9,-1.8],p1:[-65,5.6,-1.9],t:plateW().toArray(),t1:plateW().toArray(),dur:2.4,fov:26});
     beamOn(anprW(),plateW(),COL.green,1.3);Sound.scan();await wait(1);ev('ANPR reads KSA 4821 RSA: on the order','ok');Sound.ok();pktTo('anpr');
     await wait(1.2);shot({p:[-67.6,2.5,-7.4],p1:[-68.4,2.7,-7],t:[-71.6,2.5,5],t1:[-72.2,2.3,4],fov:32,dur:2.4});
     const rp=new V3(-71,3.1,5.4);for(let i=0;i<3;i++)setTimeout(()=>pingRing(rp,0x60a5fa,3.2,1,false),i*260);Sound.scan();G.rfidLedMat.emissive.setHex(COL.green);
     await wait(1.2);ev('RFID tag matches the same plate','ok');pktTo('rfid');Sound.ok();
     await wait(.8);say('Tamper · Clone','Both checks pass, because both were copied. The gate is fooled and opens.');G.gateLight.emissive.setHex(COL.green);Sound.motor(1.2);
     shot({p:[-82,3.4,12],p1:[-70,5,14],t:[-68,3,0],t1:[-58,4,0],dur:5.2,fov:38});
     anim(1.2,k=>S.gate=k);await wait(.6);await drive(S_POS.bay,4.4);anim(1.2,k=>S.gate=1-k);G.gateLight.emissive.setHex(COL.red);hmi('TRUCK IN BAY','#9fb0ff');
     shot({p:[-51,7.3,8],p1:[-52,6.2,6.6],t:[GX,5.4,0],t1:[GX,4.8,0],dur:5,fov:32});
     Sound.valve();await anim(.8,k=>S.hatch=k);Sound.motor(1.6);const l0=G.chuteLen;await anim(1.6,k=>G.setChute(lerp(l0,3.5,k)));S.chuteSeated=true;G.collarLedMat.emissive.setHex(COL.green);ev('Hatch sensor: chute fully seated','ok');
     say('Tamper · Clone','Before opening the valve, the PLC asks this truck for its onboard unit.');pktTo('hatch');
     await wait(2);ev('Real onboard unit reports from the highway, 18 km away','bad');Sound.deny();hmi('TRUCK MISMATCH','#ff8a8a');
     setAlarm('TRUCK MISMATCH: real KSA 4821 RSA is 18 km away. Valve stays locked.');S.lockedOut=true;Ops.notify('Your delivery is paused while we check something. We will update you shortly.','bad');ev('Valve stays locked. No water released.','bad');
     shot({p:[-54,9.8,8],p1:[-54.6,9.4,7],t:[GX,PIPE_Y+.3,Z_VALVE],t1:[GX,PIPE_Y+.3,Z_VALVE],dur:3,fov:28});
     await wait(3);ev('ANPR photo shows an unbranded truck. Security alerted.','bad');
     shot({p:[-44,3.2,14],p1:[-46,3.6,13],t:[-58,2.6,0],t1:[-58,2.6,0],dur:6,fov:36});
   }},
 chute:{title:'Chute Not Seated in Hatch',what:'The driver is in a hurry and the chute stops short of the hatch.',verdict:'No seat signal, no valve. Water never leaves the pipe, so there is no roof flood and no loss.',parts:['chute','valve'],
   async run(){
     setStatus('FILLING');say('Tamper · Interlock','The chute stops short of the hatch. Starting the pump now would flood the truck roof.');
     shot({p:[-50.5,6.6,7.5],p1:[-52,6.2,6.2],t:[GX,5,0],t1:[GX,4.7,0],dur:6,fov:30});
     Sound.valve();await anim(.9,k=>S.hatch=k);Sound.motor(1.5);const l0=G.chuteLen;await anim(1.5,k=>G.setChute(lerp(l0,2.4,k)));
     await wait(.6);ev('Hatch sensor: chute NOT seated','bad');Sound.deny();pktTo('hatch',0xff9090);
     await wait(1);hmi('CHUTE NOT SEATED','#ff8a8a');ev('Driver presses Bay Ready: refused','bad');
     setAlarm('SAFETY INTERLOCK: chute not seated. Valve refused to open.');
     shot({p:[-54,9.8,8],p1:[-54.6,9.4,7],t:[GX,PIPE_Y+.3,Z_VALVE],t1:[GX,PIPE_Y+.3,Z_VALVE],dur:5,fov:28});
   }},
 strap:{title:'Loosen TUF-2000B Sensor Strap',what:'Someone slackens the strap so the meter under-counts and free water flows.',verdict:'Signal quality collapses, and the PLC treats a bad reading as no reading. The valve slams shut before any unmetered water can pass.',parts:['meter','plc'],
   async run(){
     S.hatch=1;G.setChute(3.5);S.chuteSeated=true;S.valve=S.valveTarget=1;S.vol=S.qty*.4;S.filling=true;S.flow=120;setStatus('FILLING');hmi('FILLING','#49c6ff');G.collarLedMat.emissive.setHex(COL.green);
     const fq=anim(30,k=>S.vol=S.qty*(.4+.12*k),t=>t);
     say('Tamper · Meter','Mid-fill, someone loosens the sensor strap, hoping the meter under-counts and the extra water goes unbilled.');
     shot({p:[-54.8,9.8,9],p1:[-55.6,9.5,8.2],t:[GX,PIPE_Y,Z_METER],t1:[GX,PIPE_Y,Z_METER],dur:6,fov:24});
     await wait(2.6);ev('Sensor strap loosened','bad');Sound.deny();
     await anim(1.6,k=>{G.straps.forEach(s=>s.scale.set(1+k*.75,1+k*.75,1));G.xdcr.forEach(x=>{x.rotation.z=k*.55;x.position.y=PIPE_R+.09+k*.1;x.position.x=k*.1;});S.q=lerp(82,9,k);});
     ev(`Signal quality fell to Q ${Math.round(S.q)}`,'bad');pktTo('box',0xff9090);
     anims=anims.filter(a=>a.res===undefined);
     S.filling=false;S.flow=0;setValve(false);Sound.slam();pktTo('valve',0xff9090);hmi('SIGNAL LOST','#ff8a8a');
     setAlarm(`METER SIGNAL LOST: PLC slammed the valve at ${fmtL(S.vol)}.`);ev('PLC slammed the valve within a second','bad');
     shot({p:[-52.4,6.4,11.4],p1:[-53.4,6,10],t:[-56.7,5.6,8],t1:[-56.7,5.6,8],dur:5,fov:30});
   }},
 hatch:{title:'Driver Opens Roof Hatch on Highway',what:'The driver pulls over to siphon water from the top of the tank.',verdict:'The reed switch reports the lid instantly and the level probe shows the drop. Dispatch sees where and how much, and the outlet stays locked until it is resolved.',parts:['gps'],
   async run(){
     S.vol=S.qty;S.loaded=S.qty;setStatus('IN TRANSIT');S.truckS=S_POS.mid-30;S.pinging=true;
     Ops.notify('Your tanker is on the way.');say('Tamper · Highway','Far from the gantry, the driver pulls over and climbs up to siphon some water to sell on the side.');
     shot({p:[-17,6,8],p1:[-12,6,8],t:[0,2.4,0],t1:[0,2.4,0],rel:'both',dur:5,fov:36});
     await drive(S_POS.mid,5);
     shot({p:[-1,6.4,5.4],p1:[-2,6,5],t:[-1.5,4,0],t1:[-1.5,3.9,0],rel:'both',dur:7,fov:30});
     Sound.valve();await anim(1,k=>S.hatch=k);TR.reedMat.emissive.setHex(COL.red);ev('Manhole reed switch: lid opened outside a gantry','bad');Sound.deny();
     setAlarm('HIGHWAY ALARM: roof hatch opened away from an approved site.');S.lockedOut=true;Ops.notify('Your delivery is paused while we check something. We will update you shortly.','bad');
     S.siphon=true;await wait(1);const v0=S.vol,drop=Math.min(900,S.qty*.1);
     await anim(4.5,k=>S.vol=v0-drop*k,t=>t);S.siphon=false;
     ev(`Level probe: ${fmtL(drop)} missing since the gantry`,'bad');ev('Dispatch alerted. Outlet locked at client site.','bad');
     shot({p:[20,26,34],p1:[10,22,30],t:[0,1,0],t1:[0,1,0],rel:'both',dur:6,fov:34});
   }},
 salt:{title:'Driver Adds Salty Well Water',what:'The driver tops the load up with cheap salty well water and hopes nobody can tell.',verdict:'Volume looks right, but purity does not. TDS leaps to 1,450 ppm, so the client outlet locks out and the contaminated load never reaches your tank.',parts:['gps','outlet'],
   async run(){
     S.vol=S.qty*.9;S.loaded=S.qty;setStatus('IN TRANSIT');S.truckS=S_POS.well-34;S.pinging=true;
     Ops.notify('Your tanker is on the way.');say('Tamper · Quality','The driver sold part of the load, and now stops at a roadside well to top the tank back up with salty water.');
     shot({p:[-18,7,9],p1:[-14,7,10],t:[0,2,0],t1:[0,2,0],rel:'both',dur:5,fov:36});
     await drive(S_POS.well,5);
     shot({p:[-3,3.2,8],p1:[-2.8,3,6.4],t:[-2.4,2.8,-2],t1:[-2.4,2.8,-2],rel:'both',dur:6,fov:34});
     S.hatch=1;S.wellFlow=true;const v0=S.vol;
     await anim(4.5,k=>{S.vol=lerp(v0,S.qty,k);S.tds=lerp(185,1450,k);},t=>t);
     S.wellFlow=false;S.hatch=0;ev('TDS jumped from 185 to 1,450 ppm','bad');Sound.deny();
     say('Tamper · Quality','The volume looks perfect, but the taste does not. The probe reports 1,450 ppm. Now watch what happens at your gate.');
     shot({p:[52,24,56],p1:[66,18,48],t:[88,1,12],t1:[92,2,8],dur:6,fov:36});
     S.pinging=false;S.truckS=S_POS.fence-12;
     await drive(S_POS.client,6);
     FENCE.mat.color.setHex(COL.red);FENCE.fill.material.color.setHex(COL.red);FENCE.wall.material.color.setHex(COL.red);
     S.lockedOut=true;Ops.notify('This load did not pass our quality check, so it will not be delivered. We are sending a replacement.','bad');setStatus('DELIVERING');setAlarm('QUALITY LOCKOUT: TDS 1,450 ppm. Client discharge valve locked.');ev('Outlet valve refuses to unlock','bad');Sound.deny();
     shot({p:[80,3.3,27],p1:[83,3.1,26],t:[88,1.6,14],t1:[88,1.6,14],dur:6,fov:32});
   }},
};
async function runScenario(key){
  const sc=SCEN[key];Sound.init();Sound.music(false);autoplay=false;setFilm(false);UI.closeInspector();$('#receiptWrap').classList.remove('on');
  Driver.release();if(!UI.tracking)UI.drawerToTrack();clearWorld();ensureOrder();S.stage=-1;S.completed=-1;S.scenario=key;Ops.scenT0=simClock;Ops.addLog('Tamper simulation started: '+sc.title,'bad');Ops.pip(key==='hatch'||key==='salt'?'phone':'dash');UI.setMode('orbit',true);setDirector(true);setBad(sc.parts);S.running=true;UI.openLab(true);UI.sync();UI.renderLab();
  const my=++runId;await sc.run();if(my!==runId)return;
  S.running=false;UI.scenarioDone=key;UI.renderLab();UI.sync();
}
