/* ================= ROLES + DRIVABLE TRUCK ================= */
let ROLE='film';const KEYS={};
const LIMIT_KMH=80,ADMIN_MSGS=['Return to the approved route now.','Slow down, you are over the limit.','Call the office at your next stop.'];
{ // cab interior for the driver's seat
  box(.5,.5,2.1,MAT.dark,truck,5.15,2.5,0,false);
  const wh=add(new THREE.TorusGeometry(.26,.03,8,24),MAT.rubber,truck,4.72,2.95,-.5,false);wh.rotation.y=PI/2;wh.rotation.x=.0;TR.wheelMesh=wh;
}
const Driver={v:0,view:'chase',gateMax:sFor(-71-5.95),exitMax:sFor(-44),seated:false,msg:'',stopT:0,warnAt:{},
  once(k,secs=8){const n=performance.now();if(n-(this.warnAt[k]||-1e9)<secs*1000)return false;this.warnAt[k]=n;return true;},
  fault(msg,parts,clientNote){setAlarm(msg);S.lockedOut=true;S.faultParts=parts;Sound.deny();if(clientNote)Ops.notify(clientNote,'bad');UI.sync();},
  clearAlarm(){
    if(S.scenario){UI.resetLab();UI.toast('Released. The tamper demo has ended and the world is reset.');Sound.ok();return;}
    if(S.tds>500){Sound.deny();UI.toast('This water failed the quality check, so it cannot be released. Use Reject load & reload.');return;}
    const wasImmob=S.immob;
    if(wasImmob){S.immob=false;$('#admImmob span').textContent='Immobilise truck';Ops.addLog('Office released the engine');}
    if(!S.alarm){if(wasImmob){Sound.ok();UI.toast('Engine released. The driver can move again.');}else UI.toast('Nothing is on hold right now');UI.sync();return;}
    if(S.hatch>.05){const h=S.hatch;anim(.8,k=>S.hatch=h*(1-k));ev('Roof hatch closed on office instruction','ok');}
    setAlarm(null);S.lockedOut=false;S.faultParts=[];ev('Office released the hold','ok');Ops.notify('All good. Your delivery is back on track.');Sound.ok();UI.toast(S.manual?'Released. Press 2 to carry on driving.':'Released.');UI.sync();
  },
  silence(){if(!S.alarm||S.silenced)return;S.silenced=true;document.body.classList.remove('alarm');Ops.addLog(`Alarm switched off from the ${ROLE==='admin'?'office':ROLE==='driver'?'driver seat':'simulator'}. Hold stays on.`,'bad');Sound.click();UI.sync();},
  rejectLoad(){
    if(S.scenario||!S.manual){UI.resetLab();return;}
    setAlarm(null);S.lockedOut=false;S.faultParts=[];S.tds=185;S.vol=0;S.loaded=0;S.client=0;S.hatch=0;S.truckS=S_POS.bay;S.lat=0;S.latV=0;this.v=0;S.stage=1;S.completed=1;S.running=false;S.pinging=false;S.fenceOn=false;S.chuteSeated=false;S.bayReady=false;
    FENCE.mat.color.setHex(COL.green);FENCE.fill.material.color.setHex(COL.green);FENCE.wall.material.color.setHex(COL.green);
    Ops.hist=[];setStatus('TO BAY');hmi('DRIVE TO BAY','#9fb0ff');ev('Office rejected the load. Tank drained, truck back at the gantry.','ok');Ops.notify('We are preparing a fresh load for you. Your updated arrival time will show shortly.');Sound.valve();UI.sync();
  },
  immobilise(){
    if(!S.manual){UI.toast('Immobilise works when a person is driving. Press 2 to take the wheel first.');return;}
    S.immob=!S.immob;ev(S.immob?'Office immobilised the truck remotely':'Office released the engine',S.immob?'bad':'ok');$('#admImmob span').textContent=S.immob?'Release engine':'Immobilise truck';Sound.valve();
  },
  message(i){this.msg=ADMIN_MSGS[i];Ops.addLog('Office to driver: '+this.msg);Sound.ping();UI.toast('Sent to the driver tablet');},
  takeover(){
    autoplay=false;paused=false;setFilm(false);hideCaption();
    const fresh=!S.order||S.scenario||S.completed>=STAGES.length-1,st=S.running?S.stage:S.completed+1,s=S.truckS;
    S.manual=true;
    if(fresh){S.scenario=null;UI.scenarioDone=null;clearWorld();S.order=null;S.stage=-1;S.completed=-1;ensureOrder();runStage(0);return;}
    if(st<=0){runStage(0);}
    else if(st===1){snapTo(1);}
    else if(st<=4){snapTo(st);runStage(st);}
    else if(st===5){snapTo(5);S.truckS=Math.max(s,S_POS.bay);S.stage=4;S.completed=4;}
    else if(st===6){snapTo(6);S.truckS=Math.max(s,S_POS.fence);S.fenceOn=true;}
    else runStage(7);
  },
  takeSeat(){
    if(!S.manual)this.takeover();
    if(S.scenario)this.takeover();
    this.seated=true;setDirector(false);camTween=null;UI.camMode='driver';controls.enabled=false;document.body.classList.add('driver');
    $('#modeOrbit').classList.remove('on');$('#modeFollow').classList.remove('on');this.setView(this.view);
  },
  leaveSeat(){this.seated=false;document.body.classList.remove('driver','driver-cab');this.showCab(true);if(UI.camMode==='driver'){UI.camMode='orbit';$('#modeOrbit').classList.add('on');controls.enabled=true;UI.fovTarget=40;}},
  release(){this.leaveSeat();S.manual=false;S.immob=false;this.v=0;S.lat=0;S.latV=0;this.msg='';ROLE='film';UI.syncRoles();},
  showCab(on){(TR.cabHide||[]).forEach(m=>m.visible=on);},
  setView(v){this.view=v;document.body.classList.toggle('driver-cab',v==='cab');this.showCab(v!=='cab');},
  stageDone(i){if(i===1)setStatus('TO BAY');if(i===2||i===3)runStage(i+1);else if(i===6)runStage(7);UI.sync();},
  align(s,dur=1){const s0=S.truckS,l0=S.lat;this.v=0;return anim(dur,k=>{S.truckS=lerp(s0,s,k);S.lat=lerp(l0,0,k);});},
  key(k){
    if(k==='c'){this.setView(this.view==='cab'?'chase':'cab');return;}
    if(k==='h')return this.toggleHatch();
    if(k==='f')return this.bayReady();
    if(k==='o')return this.outlet();
    if(k==='q')return this.well();
  },
  async bayReady(){
    if(S.completed!==1||S.running){UI.toast('Bay Ready works once you are parked under the chute');return;}
    if(Math.abs(S.truckS-S_POS.bay)>2||Math.abs(S.lat)>1.8||Math.abs(this.v)>.4){Sound.deny();ev('HMI refuses Bay Ready: truck not aligned on the marks','bad');return;}
    await this.align(S_POS.bay,.8);runStage(2);
  },
  toggleHatch(){
    const open=S.hatch<.5,atBay=S.completed>=1&&S.completed<4&&Math.abs(S.truckS-S_POS.bay)<2;
    if(S.chuteSeated){UI.toast('The chute is seated, so the hatch cannot move');return;}
    anim(.8,k=>S.hatch=open?k:1-k);Sound.valve();
    if(open&&!atBay){ev('Reed switch: roof hatch opened away from an approved site','bad');
      this.fault('HIGHWAY ALARM: roof hatch opened away from an approved site.',['gps','outlet'],'Your delivery is paused while we check something. We will update you shortly.');}
    else if(!open)Ops.addLog('Roof hatch closed');
  },
  async outlet(){
    const inFence=S.truckS>=S_POS.fence;
    if(!inFence){Sound.deny();ev('Outlet refused: truck is outside the client geofence','bad');return;}
    if(S.lockedOut){Sound.deny();ev('Outlet refused: load is on hold until the office releases it','bad');return;}
    if(S.completed!==5||S.running){UI.toast('Nothing to discharge right now');return;}
    if(Math.abs(S.truckS-S_POS.client)>6||Math.abs(this.v)>.4){UI.toast('Stop at the discharge point by the client tank first');return;}
    await this.align(S_POS.client,1);runStage(6);
  },
  async well(){
    const p=truck.position.distanceTo(WELL.position);
    if(p>22||Math.abs(this.v)>.4){UI.toast('You need to be stopped next to the roadside well');return;}
    if(S.tds>500||S.completed<4)return;
    Sound.valve();S.hatch=1;S.wellFlow=true;ev('Reed switch: hatch opened at unapproved location','bad');
    await anim(3.6,k=>S.tds=lerp(185,1450,k),t=>t);
    S.wellFlow=false;S.hatch=0;ev('TDS jumped from 185 to 1,450 ppm','bad');
    FENCE.mat.color.setHex(COL.red);FENCE.fill.material.color.setHex(COL.red);FENCE.wall.material.color.setHex(COL.red);
    this.fault('QUALITY ALARM: TDS 1,450 ppm. Client outlet locked out.',['gps','outlet'],'This load did not pass our quality check, so it will not be delivered. We are sending a replacement.');
  },
  tick(rdt){
    if(!S.manual)return;
    let th=0,st=0;const sh=KEYS.shift;
    if(this.seated&&ROLE==='driver'){th=(KEYS.w||KEYS.arrowup?1:0)-(KEYS.s||KEYS.arrowdown?1:0);st=(KEYS.d||KEYS.arrowright?1:0)-(KEYS.a||KEYS.arrowleft?1:0);}
    const busy=S.running&&S.stage!==5,locked=S.chuteSeated||busy||S.immob||S.discharging;
    if(locked&&th!==0&&this.once('lock',4)){Sound.deny();ev(S.immob?'Engine immobilised by the office':S.chuteSeated?'Brake interlock: truck cannot move while the chute is seated':'Please wait: the system is working','bad');}
    if(locked){th=0;this.v*=Math.exp(-rdt*7);}
    if(paused)return;
    if(!(this.seated&&ROLE==='driver'))this.v*=Math.exp(-rdt*2.5);
    if(th>0)this.v+=rdt*(this.v<0?6:2.8);else if(th<0)this.v-=rdt*(this.v>0?7.5:2.2);else this.v*=Math.exp(-rdt*.55);
    this.v=clamp(this.v,-3.5,sh?9.8:8.2);if(Math.abs(this.v)<.02)this.v=0;
    if(!locked||Math.abs(this.v)>.01){S.truckS+=this.v*rdt;}
    S.truckS=clamp(S.truckS,S_POS.staging-8,PATH_LEN-14);
    if(S.completed<1&&S.truckS>this.gateMax){if(this.v>3&&this.once('gate',3)){Sound.slam();ev('Barrier strike logged with camera photo','bad');}S.truckS=this.gateMax;this.v=0;}
    if(S.completed<4&&S.truckS>this.exitMax){S.truckS=this.exitMax;this.v=0;if(this.once('exit',4)){Sound.deny();ev('No load on record. Exit flagged to the office.','bad');}}
    // steering, with lane assist through the curves
    S.latV=lerp(S.latV,st*Math.min(Math.abs(this.v),5)*.55*Math.sign(this.v||1),clamp(rdt*5));S.lat+=S.latV*rdt;
    const inZone=truck.position.x<-36;S.lat=clamp(S.lat,inZone?-2.7:-15,inZone?2.7:15);
    if(!st&&Math.abs(S.lat)<.7)S.lat*=Math.exp(-rdt*1.4);
    if(Math.abs(S.lat)>4.6)this.v*=Math.exp(-rdt*.5);
    // system responses
    const onRoad=S.completed>=4&&S.truckS<S_POS.fence;
    if(S.completed===0&&!S.running&&S.truckS>=this.gateMax-6&&Math.abs(this.v)<.4)runStage(1);
    if(S.completed>=1&&S.gate>.9&&truck.position.x>-58){anim(1.2,k=>S.gate=1-k);G.gateLight.emissive.setHex(COL.red);S.gate=.89;}
    if(S.completed===4&&!S.running&&S.truckS>S_POS.bay+1){S.stage=5;S.running=true;stageDur=24;setStatus('IN TRANSIT');S.pinging=true;hmi('READY');Ops.notify('Your tanker is on the way.');ev('Truck left the bay with a sealed hatch','ok');UI.sync();}
    if(S.stage===5&&S.running){
      stageT0=simClock-clamp((S.truckS-S_POS.bay)/(S_POS.fence-S_POS.bay))*stageDur;
      if(S.truckS>=S_POS.fence){S.running=false;S.completed=5;S.pinging=false;setStatus('DELIVERING');S.fenceOn=true;pingRing(new V3(FENCE_C.x,.2,FENCE_C.z),COL.green,FENCE_R,1.5);Sound.ok();ev('GPS confirms: truck inside client geofence','ok');Ops.notify('Your tanker has entered your site.');UI.sync();}
    }
    if(onRoad){
      const kmh=Ops.speed();
      if(kmh>LIMIT_KMH&&this.once('speed',8)){ev(`Speeding: ${kmh} km/h in a ${LIMIT_KMH} zone. Logged against this trip.`,'bad');Sound.deny();}
      if(Math.abs(S.lat)>6.5&&this.once('dev',10)){ev('Off route: dispatch can see the deviation','bad');Ops.notify('Your tanker took a small detour. We are checking.');}
      if(Math.abs(S.lat)>13&&!S.alarm)this.fault('ROUTE DEVIATION: truck far off the approved corridor. Outlet locked.',['gps','outlet'],'Your delivery is paused while we check something. We will update you shortly.');
      if(S.running&&S.stage===5&&Math.abs(this.v)<.2){this.stopT+=rdt;if(this.stopT>7&&this.once('stop',20)){ev('Unscheduled stop on the highway logged','bad');}}else this.stopT=0;
    }
  },
  instr(){
    if(S.alarm){
      if(S.tds>500)return ['Contaminated load. The office must reject it (press 3 to be the Admin).','bad'];
      if(S.hatch>.05)return ['Close the roof hatch (H), or ask the office to release (press 3 to be the Admin).','bad'];
      return ['Hatch closed. The office must release the hold (press 3 to be the Admin).','bad'];
    }
    if(S.immob)return ['Engine immobilised by the office.','bad'];
    if(S.completed>=7)return ['Job complete. Choose Driver again for a new job.','ok'];
    if(S.running&&S.stage===0)return ['Dispatch is sending you the job…',''];
    if(S.running&&S.stage===1)return ['Hold still. Camera and radio reader are checking you.',''];
    if(S.running&&S.stage>=2&&S.stage<=4)return ['Stay parked. Loading is automatic and the brake is locked.',''];
    if(S.awaitConfirm)return ['Waiting for the client to confirm (press 1 to be the Client).',''];
    if(S.running&&S.stage===6)return ['Discharging. Stay parked.',''];
    if(S.running&&S.stage===7)return ['Reconciling the three meters…',''];
    if(S.completed===0)return ['Drive to the gate and stop at the barrier (hold W).',''];
    if(S.completed===1){if(Math.abs(S.truckS-S_POS.bay)<2&&Math.abs(this.v)<.4)return ['On the marks. Press F for Bay Ready.','ok'];return ['Drive under the gantry and stop in the yellow box.',''];}
    if(S.completed===4)return ['Loaded and sealed. Drive out onto the highway.','ok'];
    if(S.stage===5)return [`Follow the road to Riyadh North. Limit ${LIMIT_KMH} km/h. ${Ops.kmLeft().toFixed(1)} km left.`,''];
    if(S.completed===5){if(Math.abs(S.truckS-S_POS.client)<=6&&Math.abs(this.v)<.4)return ['At the discharge point. Press O to request the outlet.','ok'];return ['Inside the ring. Stop beside the client tank.',''];}
    return ['',''];
  },
  hud(){
    if(!this.seated)return;
    const kmh=Math.round(Math.abs(this.v)/((S_POS.fence-S_POS.bay)/24)*60),over=kmh>LIMIT_KMH;
    $('#drvSpd').textContent=kmh;$('#drvSpd').className=over?'bad':'';$('#drvGear').textContent=this.v<-.05?'R':kmh===0?'P':'D';
    const[t,tone]=this.instr();const e=$('#drvInstr');if(e.textContent!==t)e.textContent=t;e.className='glass '+tone;
    $('#dtOrder').textContent=S.order?S.order.no:'-';$('#dtQty').textContent=fmtL(S.qty);$('#dtVol').textContent=fmtL(S.vol);$('#dtMsg').textContent=this.msg||'No messages from the office.';$('#dtMsg').className=this.msg?'on':'';
    $('#dtView').textContent=this.view==='cab'?'Chase view':'Cab view';
  },
  camera(rdt){
    if(this.view==='cab'){_p.set(4.72,3.32,-.5);_t.set(30,2.6,S.latV*-2);truck.localToWorld(_p);truck.localToWorld(_t);camera.position.copy(_p);}
    else{_p.set(-21,8.2,4);_t.set(4,2.4,0);truck.localToWorld(_p);truck.localToWorld(_t);camera.position.lerp(_p,1-Math.exp(-rdt*4));}
    controls.target.lerp(_t,1-Math.exp(-rdt*8));camera.lookAt(controls.target);
    const f=this.view==='cab'?58:44;if(Math.abs(camera.fov-f)>.05){camera.fov=lerp(camera.fov,f,clamp(rdt*4));camera.updateProjectionMatrix();}
  },
};
function setRole(r){
  Sound.init();if($('#intro'))$('#intro').classList.add('out');
  if(ROLE==='driver'&&r!=='driver')Driver.leaveSeat();
  ROLE=r;UI.syncRoles();UI.closeInspector();
  if(r==='client'){Ops.hero(null);UI.openDash(false);UI.openDrawer(true);if(!director&&UI.camMode==='orbit')flyTo([-30,24,70],[-40,2,0],1.8);}
  if(r==='admin'){Ops.hero(null);UI.openDrawer(false);UI.openDash(true);Ops.tab('overview');if(!director&&UI.camMode==='orbit'&&!S.running)flyPreset(1);}
  if(r==='driver'){Ops.hero(null);UI.openDrawer(false);UI.openDash(false);UI.closeLab();Driver.takeSeat();}
  if(r==='film'){UI.openDrawer(false);UI.openDash(false);if(S.manual)Driver.release();ROLE='film';UI.syncRoles();startFilm();}
  UI.sync();
}
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();if(e.target.tagName==='SELECT')return;KEYS[k]=true;
  if(!document.querySelector('#intro.out'))return;
  if(k==='1')setRole('client');else if(k==='2')setRole('driver');else if(k==='3')setRole('admin');else if(k==='4')setRole('film');
  if(ROLE==='driver'){if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(!e.repeat)Driver.key(k);}
});
addEventListener('keyup',e=>{KEYS[e.key.toLowerCase()]=false;});
addEventListener('blur',()=>{for(const k in KEYS)KEYS[k]=false;});

/* ================= DOWNLOADABLE FILM ================= */
const Recorder={on:false,rec:null,chunks:[],stream:null,comp:null,
  mime(){return ['video/mp4;codecs=avc1.640028,mp4a.40.2','video/mp4;codecs=avc1,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(m=>window.MediaRecorder&&MediaRecorder.isTypeSupported(m))||'';},
  ask(){if(this.on){this.stop();return;}if(!window.MediaRecorder){UI.toast('This browser cannot record video. Please use Chrome or Edge.');return;}$('#recWrap').classList.add('on');},
  async start(){
    $('#recWrap').classList.remove('on');Sound.init();let tabOK=false;
    if(navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia){
      try{this.stream=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:30,displaySurface:'browser'},audio:false,preferCurrentTab:true,selfBrowserSurface:'include',surfaceSwitching:'exclude'});tabOK=true;}
      catch(e){if(e&&e.name==='NotAllowedError'){UI.toast('Recording cancelled. Nothing was saved.');return;}}
    }
    if(!tabOK){this.stream=this.canvasStream();UI.toast('Screen capture unavailable, so this saves the 3D view with captions only.');}
    Sound.ctx.resume();Sound.on=true;$('#soundBtn').classList.add('on');setIcon($('#soundBtn'),'volume-2');voiceOn=true;$('#voiceBtn').classList.add('on');paused=false;
    this.dest=Sound.ctx.createMediaStreamDestination();Sound.master.connect(this.dest);
    this.stream=new MediaStream([...this.stream.getVideoTracks(),...this.dest.stream.getAudioTracks()]);
    this.chunks=[];this.rec=null;this.wc=await this.setupWC();
    if(!this.wc){ // browsers without WebCodecs keep the plain recorder
      const mime=this.mime();this.rec=new MediaRecorder(this.stream,Object.assign({videoBitsPerSecond:12000000},mime?{mimeType:mime}:{}));
      this.rec.ondataavailable=e=>{if(e.data&&e.data.size)this.chunks.push(e.data);};
      this.rec.onstop=()=>this.save(mime);
    }
    this.stream.getVideoTracks()[0].addEventListener('ended',()=>this.stop());
    // begin the film from the top with a clean slate
    if(S.manual)Driver.release();UI.closeInspector();UI.closeLab();clearWorld();S.order=null;S.stage=-1;S.completed=-1;S.scenario=null;speedMul=1;spI=0;$('#speedBtn').textContent='1×';
    if(document.activeElement)document.activeElement.blur();
    if(document.querySelector('#intro:not(.out)'))$('#intro').classList.add('out');
    this.on=true;document.body.classList.add('recording','idle');await new Promise(r=>setTimeout(r,tabOK?700:100));
    if(this.wc)this.wc.begin();else this.rec.start(1000);setRole('film');document.body.classList.add('idle');
  },
  filmEnded(){if(this.on)setTimeout(()=>this.stop(),3500);},
  /* standard MP4 (H.264 + AAC, steady 30 fps, single piece) that WhatsApp and phones accept */
  async setupWC(){
    if(!window.Mp4Muxer||!window.VideoEncoder||!window.AudioEncoder||!window.MediaStreamTrackProcessor)return null;
    const vt=this.stream.getVideoTracks()[0],at=this.stream.getAudioTracks()[0],st=vt.getSettings();
    const sw=st.width||Math.round(innerWidth*devicePixelRatio),sh=st.height||Math.round(innerHeight*devicePixelRatio),k=Math.min(1,1920/sw,1080/sh);
    const W=Math.round(sw*k/2)*2,H=Math.round(sh*k/2)*2,sr=Sound.ctx.sampleRate,VBR=4000000;
    let codec=null;
    try{
      for(const c of ['avc1.4d0028','avc1.42e028']){if((await VideoEncoder.isConfigSupported({codec:c,width:W,height:H,bitrate:VBR,framerate:30})).supported){codec=c;break;}}
      if(!codec||!(await AudioEncoder.isConfigSupported({codec:'mp4a.40.2',sampleRate:sr,numberOfChannels:2,bitrate:128000})).supported)return null;
    }catch(e){return null;}
    const target=new Mp4Muxer.ArrayBufferTarget(),mux=new Mp4Muxer.Muxer({target,fastStart:'in-memory',firstTimestampBehavior:'offset',video:{codec:'avc',width:W,height:H,frameRate:30},audio:{codec:'aac',numberOfChannels:2,sampleRate:sr}});
    let failed=null;
    const venc=new VideoEncoder({output:(c,m)=>mux.addVideoChunk(c,m),error:e=>{failed=e;}});
    venc.configure({codec,width:W,height:H,bitrate:VBR,framerate:30,avc:{format:'avc'},latencyMode:'quality'});
    const aenc=new AudioEncoder({output:(c,m)=>mux.addAudioChunk(c,m),error:e=>{failed=e;}});
    aenc.configure({codec:'mp4a.40.2',sampleRate:sr,numberOfChannels:2,bitrate:128000});
    const off=new OffscreenCanvas(W,H),g=off.getContext('2d');
    const vr=new MediaStreamTrackProcessor({track:vt}).readable.getReader(),ar=new MediaStreamTrackProcessor({track:at}).readable.getReader();
    let latest=null,started=false,done=false,timer=0,last=-1,frames=0,t0=0;
    (async()=>{for(;;){const{value,done:d}=await vr.read();if(d||done){if(value)value.close();break;}if(latest)latest.close();latest=value;}})().catch(()=>{});
    (async()=>{for(;;){const{value,done:d}=await ar.read();if(d||done){if(value)value.close();break;}if(started&&!failed&&aenc.state==='configured')aenc.encode(value);value.close();}})().catch(()=>{});
    return {
      begin(){timer=setInterval(()=>{
        if(!latest||failed||venc.state!=='configured')return;
        if(!started){started=true;t0=performance.now();}
        const n=Math.floor((performance.now()-t0)/(1000/30));if(n<=last||venc.encodeQueueSize>8)return;last=n;
        g.drawImage(latest,0,0,W,H);const f=new VideoFrame(off,{timestamp:Math.round(n*1e6/30),duration:Math.round(1e6/30)});venc.encode(f,{keyFrame:frames++%60===0});f.close();
      },12);},
      async finish(){
        done=true;clearInterval(timer);vr.cancel().catch(()=>{});ar.cancel().catch(()=>{});
        if(latest){latest.close();latest=null;}
        if(!frames||failed)throw failed||new Error('no frames');
        await venc.flush();await aenc.flush();venc.close();aenc.close();mux.finalize();return target.buffer;
      }
    };
  },
  stop(){
    if(this.wc){
      const w=this.wc;this.wc=null;this.on=false;document.body.classList.remove('recording');UI.toast('Finishing your video…');
      w.finish().then(buf=>{this.chunks=[buf];this.save('video/mp4');}).catch(e=>{console.error('Video save failed:',e);UI.toast('The video could not be saved. Please try again.');});
      this.stream.getTracks().forEach(t=>{if(t.kind==='video')t.stop();});try{Sound.master.disconnect(this.dest);}catch(e){}this.comp=null;UI.bumpIdle();return;
    }
    if(!this.rec||this.rec.state==='inactive')return;this.on=false;document.body.classList.remove('recording');this.rec.stop();this.stream.getVideoTracks().forEach(t=>t.stop());try{Sound.master.disconnect(this.dest);}catch(e){}this.comp=null;UI.bumpIdle();},
  save(mime){
    const type=(mime||'video/webm').split(';')[0],blob=new Blob(this.chunks,{type}),a=document.createElement('a');
    this.lastSize=blob.size;this.lastBlob=blob;if(!blob.size){UI.toast('Nothing was recorded.');return;}
    a.href=URL.createObjectURL(blob);a.download='M-Arabia-Custody-Transfer-Film.'+(type==='video/mp4'?'mp4':'webm');document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),60000);
    UI.toast('Film saved to your Downloads folder');
  },
  canvasStream(){ // fallback: the 3D canvas plus letterbox and captions, composited
    const s=renderer.domElement,c=document.createElement('canvas');c.width=s.width;c.height=s.height;this.comp=c;
    return c.captureStream(30);
  },
  frame(){
    if(!this.comp||!this.on)return;const c=this.comp,g=c.getContext('2d'),W=c.width,H=c.height;
    g.drawImage(renderer.domElement,0,0,W,H);g.fillStyle='#02030f';const b=H*.075;g.fillRect(0,0,W,b);g.fillRect(0,H-b,W,b);
    const say=$('#capT').textContent;if(say&&!$('#caption').classList.contains('off')){g.font=`600 ${Math.round(H*.028)}px Saira,sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff';g.shadowColor='#000';g.shadowBlur=10;g.fillText(say,W/2,H-b-H*.05,W*.92);g.shadowBlur=0;}
  },
};
