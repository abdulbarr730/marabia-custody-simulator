/* ================= HARDWARE PARTS ================= */
const anchor=(parent,x,y,z)=>{const o=new THREE.Object3D();o.position.set(x,y,z);parent.add(o);return o;};
const PARTS=[
 {id:'anpr',n:1,emoji:'📷',name:'ANPR Camera',a:anchor(gantry,-66,6.3,-3.2),cam:[-59.6,6.8,3.4],tgt:[-66,5.2,-3.2],scen:'fake',
  analogy:'The Face-ID Guard',does:'It photographs the truck\'s number plate and reads it automatically. If that plate is not on today\'s order, the truck goes nowhere.',
  spec:'IP ANPR camera with IR illuminator for day and night reads. Plate OCR, event + photo pushed to the PLC gateway over Ethernet. Reference plate: KSA 4821 RSA.',
  risk:'Without this, a guard waves through whichever truck offers the best tip, and nobody has a photo to prove what entered.'},
 {id:'rfid',n:2,emoji:'📡',name:'UHF RFID Reader',a:anchor(gantry,-71,4.1,6.2),cam:[-65.6,4,12.6],tgt:[-71,2.8,6],scen:'clone',
  analogy:'The Digital Passport',does:'It reads a tamper-proof tag fixed to the truck chassis by radio. The tag must match the plate, so a copied plate alone is useless.',
  spec:'UHF RFID, EPC Gen2 / ISO 18000-6C. On-metal, tear-destruct chassis tag. Read range about 5 to 10 m. Reports to the PLC gateway for the ANPR + RFID dual match.',
  risk:'Without this, a printed fake plate is enough to steal a fill slot and another customer\'s water. Copying plate and tag together beats the gate too, so the onboard unit check backs it up.'},
 {id:'valve',n:3,emoji:'⚙️',name:'Motorized Butterfly Valve',a:anchor(gantry,GX,PIPE_Y+1.5,2.4),cam:[-54.4,10,7.2],tgt:[GX,PIPE_Y+.3,Z_VALVE],scen:'chute',
  analogy:'The Mechanical Bouncer',does:'It is the door on the water pipe, and only the PLC holds the key. It opens after every check passes and slams shut at the exact quota.',
  spec:'Motorized butterfly valve, electric actuator, wafer body in line with the header. Open/closed feedback to the PLC. Status ring: red = locked, green = open. Fails closed on signal loss.',
  risk:'Without this, a manual valve stays open as long as the driver likes, and overfill or free water becomes a daily habit.'},
 {id:'meter',n:4,emoji:'🌊',name:'TUF-2000B Ultrasonic Meter',a:anchor(gantry,GX,PIPE_Y+1.1,6.4),cam:[-54.8,9.8,9.2],tgt:[GX,PIPE_Y,Z_METER],scen:'strap',
  analogy:'The Cash Register',does:'It counts every litre by bouncing sound through the pipe wall, without ever touching the water. That count is the number you get billed on.',
  spec:'TUF-2000B clamp-on with TM-1 transducers, DN50 to DN700 mm, ±1% accuracy, RS-485 Modbus. Needs 10D upstream and 5D downstream of straight pipe. Silicone coupling pad + anti-tamper cage.',
  risk:'Without this, drivers bribe guards or loosen the strap to take unmeasured water. With it, a loose strap drops signal quality Q and the valve shuts.'},
 {id:'plc',n:5,emoji:'🧠',name:'PLC Edge Gateway',a:anchor(gantry,GX+3,3,Z_L+2.4),cam:[-52.4,3,13.6],tgt:[-57,1.6,10.4],scen:'strap',
  analogy:'The Supervisor Who Never Sleeps',does:'It listens to every sensor and decides, in milliseconds, whether the valve opens. It cannot be talked into anything and it logs every decision.',
  spec:'Industrial PLC + edge gateway. Modbus RTU master on RS-485 to the meter, digital I/O to valve and hatch sensor. Ethernet to ANPR and RFID. Buffers data and syncs by 4G/MQTT during outages.',
  risk:'Without this, every check becomes a human opinion, with no interlock, no audit trail and no automatic shut-off.'},
 {id:'chute',n:6,emoji:'🟢',name:'Top-Fill Drop Chute & Hatch Sensor',a:anchor(gantry,GX,6.7,-.6),cam:[-52,7.2,7.2],tgt:[GX,5.2,0],scen:'chute',
  analogy:'The Seat Belt',does:'A green fabric chute lowers into the truck\'s roof hatch. A sensor confirms it is seated. Until it clicks in, the water stays in the pipe.',
  spec:'Flexible fabric drop chute with powered raise/lower, collar proximity sensor wired into the PLC safety interlock. Works with the truck\'s magnetic manhole switch.',
  risk:'Without this, water sprays over the truck roof, wastes product and creates a slip hazard for anyone standing on the tank.'},
 {id:'gps',n:7,emoji:'🛰️',name:'Onboard GPS + TDS Purity Sensor',a:anchor(truck,4.2,5.2,.1),cam:[-1.4,7.6,8],tgt:[1,3.2,0],rel:true,scen:'salt',
  analogy:'The Flight Recorder + Taste Tester',does:'It reports where the truck is and how pure the water is, live, all the way to you. Stop somewhere odd, or change the water, and it shows.',
  spec:'GNSS + 4G telematics unit. Internal ultrasonic level probe plus conductivity-based TDS probe (reference 185 ppm). Roof manhole reed switch reports every lid opening with time and place.',
  risk:'Without this, water can be sold on the road and topped up with salty well water, and you would not know until your concrete or your people suffered.'},
 {id:'outlet',n:8,emoji:'🚰',name:'Geofenced Outlet Meter',a:anchor(truck,-6.3,2.5,0),cam:[-12.4,3,5],tgt:[-6.2,1.5,0],rel:true,scen:'salt',
  analogy:'The Smart Tap',does:'A locked tap at the back of the truck. It opens only inside your site\'s GPS ring with clean water on board, then counts what goes into your tank.',
  spec:'Rear discharge flow meter with solenoid lock. Unlock needs GPS geofence match + TDS in range + hatch history clean. Its total closes the 3-way mass balance.',
  risk:'Without this, the truck can unload anywhere, and the delivered figure on your invoice is only someone\'s word.'},
];

/* ================= UI ================= */
const icons=()=>{if(window.lucide)lucide.createIcons();};
const setIcon=(el,name)=>{el.innerHTML=`<i data-lucide="${name}"></i>`;icons();};
const PRESETS=[
 {name:'Overview',p:[-14,84,158],t:[-6,0,8]},
 {name:'1. Gantry Entry (ANPR + RFID)',p:[-90,7.5,22],t:[-69,2.6,0]},
 {name:'2. Overhead Pipe (TUF-2000B + Valve)',p:[-48.5,11.2,15.5],t:[-60,8,4]},
 {name:'3. Top-Hatch Chute Filling',p:[-48,6.4,12],t:[-59.5,4.4,0]},
 {name:'4. Highway Transit (GPS + TDS)',p:[8,24,50],t:[16,0,-10]},
 {name:'5. Client Site Delivery',p:[58,24,62],t:[91,2,6]},
];
const UI={camMode:'orbit',fovTarget:40,scenarioDone:null,idleTimer:0,
  toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(this._t);this._t=setTimeout(()=>e.classList.remove('on'),2200);},
  bumpIdle(){if(Recorder.on){document.body.classList.add('idle');return;}document.body.classList.remove('idle');clearTimeout(this.idleTimer);if(filmOn)this.idleTimer=setTimeout(()=>{if(filmOn&&!document.querySelector('#inspector.on'))document.body.classList.add('idle');},2600);},
  clearPreset(){document.querySelectorAll('.preset').forEach(p=>p.classList.remove('on'));},
  setMode(m,silent){this.camMode=m;$('#modeOrbit').classList.toggle('on',m==='orbit');$('#modeFollow').classList.toggle('on',m==='follow');
    if(m==='follow'){setDirector(false);setFollow([-17,7.5,9],[1,2.4,0]);this.clearPreset();}else if(!silent){setDirector(false);}},
  sync(){
    // player
    const playing=autoplay&&!paused;setIcon($('#playBtn'),playing?'pause':'play');
    $('#resume').classList.toggle('on',filmOn&&!director&&S.running&&!S.scenario&&this.camMode==='orbit');
    const nb=$('#nextBtn');let nt;
    if(S.awaitConfirm){nt='Confirm delivery';nb.classList.remove('busy');}
    else if(S.manual&&ROLE!=='driver'){nt='Truck waiting for a driver: press 2';nb.classList.add('busy');}
    else if(S.scenario){nt=S.running?'Tamper running…':'Clear alarm to continue';nb.classList.add('busy');}
    else if(S.running){nt=S.stage>=0?`${S.stage+1}/8 ${STAGES[S.stage].short}`:'Running';nb.classList.add('busy');}
    else if(S.completed>=STAGES.length-1){nt='Replay journey';nb.classList.remove('busy');}
    else{const n=S.completed+1;nt=`Next: ${n+1}/8 ${STAGES[n].short}`;nb.classList.remove('busy');}
    $('#nextT').textContent=nt;
    this.renderTrack();
  },
  /* ---- drawer ---- */
  qty:15000,
  openDrawer(on=true){document.body.classList.toggle('drawer-open',on);$('#orderBtn').classList.toggle('on',on);if(on){this.closeLab();if(S.order&&(S.running||S.completed>=0)){if(!this.tracking)this.drawerToTrack();}else if(this.tracking||!$('#placeBtn'))this.drawerToOrder();}},
  tracking:false,
  drawerToOrder(){
    this.tracking=false;document.body.classList.remove('tracking');
    const PRICE={5000:95,10000:180,15000:255};
    $('#drBody').innerHTML=`<div class="o-scroll" id="oHome">
      <div class="o-loc"><i data-lucide="map-pin"></i><div><small>Deliver to</small><select id="siteSel" aria-label="Delivery site"><option>Riyadh North Compound</option></select></div></div>
      <div class="o-hero"><div><b>Clean water, delivered to your site</b><span>Track your tanker live, right to your tank.</span></div><span class="dr">🚚</span></div>
      <div class="o-h">How much water do you need?</div>
      <div class="qty2" id="qtyBox">${[[5000,'Small site'],[10000,'Medium site'],[15000,'Full tanker']].map(([q,t])=>`<button data-q="${q}" class="${q===this.qty?'on':''}"><span class="ic">💧</span><span><b>${q.toLocaleString('en-US')} L</b><small>${t}</small></span><em>SAR ${PRICE[q]}</em></button>`).join('')}</div>
      <div class="o-h">When?</div><div class="seg" id="whenBox"><button class="on">Now</button><button>Later today</button><button>Tomorrow</button></div>
      <div class="o-h">Payment</div><div class="o-pay"><i data-lucide="wallet"></i>Pay on delivery<em>Demo</em></div>
    </div>
    <div class="o-scroll" id="oPast" style="display:none"><div class="o-h" style="margin-top:6px">Your orders</div>
      <div class="o-past"><span class="ic">💧</span><div><b>10,000 L · Riyadh North Compound</b><small>Yesterday · SAR 180</small></div><em>Delivered</em></div>
      <div class="o-past"><span class="ic">💧</span><div><b>15,000 L · Riyadh North Compound</b><small>Last week · SAR 255</small></div><em>Delivered</em></div></div>
    <div class="o-foot" id="oFoot"><div class="o-sum"><span>Total (demo price)</span><b id="oTotal">SAR ${PRICE[this.qty]}</b></div><button class="cta" id="placeBtn">Place Order</button></div>
    <div class="ph-nav" id="phNav"><button class="on" data-v="home"><i data-lucide="home"></i>Home</button><button data-v="past"><i data-lucide="receipt"></i>Orders</button></div>`;icons();
    $('#qtyBox').onclick=e=>{const b=e.target.closest('button');if(!b)return;this.qty=+b.dataset.q;Sound.init();Sound.click();[...$('#qtyBox').children].forEach(c=>c.classList.toggle('on',c===b));$('#oTotal').textContent='SAR '+PRICE[this.qty];};
    $('#whenBox').onclick=e=>{const b=e.target.closest('button');if(!b)return;Sound.init();Sound.click();[...$('#whenBox').children].forEach(c=>c.classList.toggle('on',c===b));};
    $('#phNav').onclick=e=>{const b=e.target.closest('button');if(!b)return;const past=b.dataset.v==='past';$('#oHome').style.display=past?'none':'';$('#oPast').style.display=past?'':'none';$('#oFoot').style.display=past?'none':'';[...$('#phNav').children].forEach(c=>c.classList.toggle('on',c===b));};
    $('#placeBtn').onclick=()=>this.placeOrder();
  },
  placeOrder(){
    Sound.init();Sound.chime();if(S.manual)Driver.release();
    {ROLE='client';this.syncRoles();document.body.classList.add('client');}
    Ops.hero(null);Ops.pip(null);clearWorld();S.qty=this.qty;S.order=null;S.stage=-1;S.completed=-1;S.scenario=null;S.timeStart=new Date();ensureOrder();this.renderLab();this.drawerToTrack();
    autoplay=false;paused=false;setFilm(false);setDirector(false);runStage(0);this.toast('Order placed. Press Next (E) to move the journey on.');
  },
  drawerToTrack(){
    this.tracking=true;document.body.classList.add('tracking');Ops.notesDirty=true;
    $('#drBody').innerHTML=`<div class="tr-map"><canvas class="x-map"></canvas></div>
    <div class="tr-sheet x-sheet"><div class="tr-grab"></div>
      <b class="x-head"></b><span class="x-eta"></span>
      <ol class="st5"><li>Confirmed</li><li>Filling</li><li>On the way</li><li>Arrived</li><li>Delivered</li></ol>
      <div class="ph-confirm x-confirm"><b>Your tanker is here</b><span>Is your tank ready to receive the water?</span><button class="x-confirmBtn">Yes, start delivery</button></div>
      <div class="x-ltr"><span class="x-ltrT"></span><u><i class="x-ltrB"></i></u></div>
      <div class="drv x-driver"><span class="av">KA</span><div><b>Khalid A. · ★ 4.9</b><small>White M Arabia tanker · KSA 4821 RSA</small></div><div class="acts"><button id="phCall" aria-label="Call driver"><i data-lucide="phone"></i></button><button id="phChat" aria-label="Message driver"><i data-lucide="message-circle"></i></button></div></div>
      <div class="chips"><span class="chip ok x-qual"></span><span class="chip ok x-seal"></span></div>
      <div class="x-done"><p style="margin:2px 0;font-size:13px;font-weight:600">How was your delivery?</p><div class="stars" id="phStars">${[1,2,3,4,5].map(i=>`<button data-s="${i}" aria-label="${i} stars">★</button>`).join('')}</div>
        <div class="row2" style="position:static"><button class="cta alt x-rc" style="height:42px;font-size:13.5px">View receipt</button><button class="cta" id="phAgain" style="height:42px;font-size:13.5px">Order again</button></div></div>
      <ul class="x-notes"></ul>
    </div>`;icons();
    $('#phCall').onclick=()=>this.toast('Calling the driver (demo)');$('#phChat').onclick=()=>this.toast('Chat with the driver (demo)');
    $('.x-rc').onclick=()=>this.receipt();
    $('#phStars').onclick=e=>{const b=e.target.closest('button');if(!b)return;Sound.click();[...$('#phStars').children].forEach((c,i)=>c.classList.toggle('on',i<+b.dataset.s));};
    $('#phAgain').onclick=()=>{if(S.manual)Driver.release();clearWorld();S.order=null;S.stage=-1;S.completed=-1;S.scenario=null;autoplay=false;setFilm(false);setDirector(false);hideCaption();this.sync();this.drawerToOrder();};
  },
  renderTrack(){
    const box=$('#dSteps');if(!box)return;$('#dOrder').textContent=S.order?S.order.no:'-';
    [...box.children].forEach((li,i)=>{const done=i<=S.completed,now=i===S.stage&&S.running;li.classList.toggle('done',done&&!now);li.classList.toggle('now',now);li.querySelector('.d').textContent=done&&!now?'✓':i+1;li.querySelector('time').textContent=S.order?Ops.clock(CUM[i+1]):'';});
  },
  /* ---- inspector ---- */
  inspect(id){
    const p=PARTS.find(x=>x.id===id);if(!p)return;Sound.init();Sound.click();
    $('#insK').textContent=`${p.emoji} Part ${p.n} of 8`;$('#insH').textContent=p.name;$('#insA').textContent=`“${p.analogy}”`;$('#insD').textContent=p.does;$('#insS').textContent=p.spec;$('#insR').textContent=p.risk;
    const cur=S.running?S.stage:S.completed;$('#insJobs').innerHTML=JOBS.map((j,i)=>j[id]?`<li class="${i===cur?'now':''}"><b>${i+1}</b><span>${j[id]}</span></li>`:'').join('');
    $('#tamperPart span').textContent='Simulate Tamper on This Part';$('#tamperPart').onclick=()=>runScenario(p.scen);
    $('#inspector').classList.add('on');$('#inspector').scrollTop=0;setActive([id]);this.bumpIdle();
    if(this.camMode==='driver')return;setDirector(false);this.clearPreset();
    if(p.rel){this.camMode='follow';$('#modeFollow').classList.add('on');$('#modeOrbit').classList.remove('on');setFollow(p.cam,p.tgt);}
    else{if(this.camMode==='follow')this.setMode('orbit',true);flyTo(p.cam,p.tgt,1.5);}
  },
  closeInspector(){$('#inspector').classList.remove('on');setActive([]);},
  /* ---- lab ---- */
  openLab(on=true){document.body.classList.toggle('lab-open',on);$('#labBtn').classList.toggle('on',on);if(on){this.openDash(false);document.body.classList.remove('drawer-open');$('#orderBtn').classList.remove('on');this.renderLab();}},
  openDash(on=true){document.body.classList.toggle('dash-open',on);$('#dashBtn').classList.toggle('on',on);if(on){document.body.classList.remove('lab-open');$('#labBtn').classList.remove('on');Ops.logDirty=true;}},
  syncRoles(){document.querySelectorAll('.role[data-role]').forEach(b=>b.classList.toggle('on',b.dataset.role===ROLE));document.body.classList.toggle('client',ROLE==='client');document.body.classList.toggle('admin',ROLE==='admin');},
  closeLab(){this.openLab(false);},
  renderLab(){
    $('#labBody').innerHTML=Object.entries(SCEN).map(([k,s])=>`<div class="sc ${S.scenario===k?'on':''}"><b>${s.title}</b><p>${s.what}</p>
      <button data-s="${k}"><i data-lucide="zap"></i>${S.scenario===k&&S.running?'Running…':'Trigger'}</button>
      ${this.scenarioDone===k?`<div class="verdict"><b style="font-size:12.5px">How the system caught it</b>${s.verdict}</div>`:''}</div>`).join('');icons();
  },
  resetLab(){clearWorld();S.scenario=null;this.scenarioDone=null;S.stage=-1;S.completed=-1;setDirector(false);hideCaption();this.renderLab();this.sync();},
  /* ---- receipt ---- */
  receipt(){
    const now=new Date(),t=d=>d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    $('#rcOrder').textContent=`Order ${S.order.no} · ${now.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}, ${t(now)}`;
    $('#rcBody').innerHTML=`
      <div class="mini"><span>Delivered to</span><b>${S.site}</b></div>
      <div class="mini"><span>Tanker</span><b>KSA 4821 RSA</b></div>
      <div class="mini"><span>You ordered</span><b>${fmtL(S.qty)}</b></div>
      <div class="mini"><span>You received</span><b>${fmtL(S.qty)}</b></div>
      <div class="mini"><span>Water quality</span><b>Safe ✓</b></div>
      <div class="mini"><span>Tanker seal</span><b>Intact ✓</b></div>
      <div class="rc-eq">Every litre you ordered reached your tank.</div>
      <div class="row2" style="position:static"><button class="cta" id="rcReplay"><i data-lucide="rotate-ccw"></i>Replay</button><button class="cta alt" id="rcExplore">Done</button></div>
      <p style="margin:10px 0 0;font-size:11.5px;color:#68709c;text-align:center">Simulation receipt. Demo data only.</p>`;
    icons();$('#receiptWrap').classList.add('on');confetti();
    $('#rcReplay').onclick=()=>{$('#receiptWrap').classList.remove('on');restart();};
    $('#rcExplore').onclick=()=>{$('#receiptWrap').classList.remove('on');setDirector(false);};
  }
};

/* ---- labels DOM ---- */
PARTS.forEach(p=>{
  const el=document.createElement('button');el.className='tag';el.innerHTML=`<span class="pill"><span class="num">${p.n}</span><span class="txt">${p.emoji} ${p.n}. ${p.name}</span></span><span class="stem"></span><span class="dot"></span>`;
  el.setAttribute('aria-label',`Inspect ${p.name}`);el.onclick=()=>UI.inspect(p.id);$('#labels').appendChild(el);p.el=el;p.w=new V3();p._x=0;
});
const _v=new V3();
function updateLabels(){
  const W=innerWidth,H=innerHeight;
  PARTS.forEach(p=>{
    p.a.getWorldPosition(p.w);_v.copy(p.w).project(camera);
    if(_v.z>1||_v.x<-1.15||_v.x>1.15||_v.y<-1.15||_v.y>1.15){p.el.style.opacity=0;p.el.style.pointerEvents='none';return;}
    const d=camera.position.distanceTo(p.w),act=activeParts.includes(p.id);
    p.el.style.opacity='';p.el.style.pointerEvents='';
    p.el.classList.toggle('compact',d>46&&!act);p.el.classList.toggle('active',act);
    const x=(_v.x*.5+.5)*W,y=(-_v.y*.5+.5)*H;
    p.el.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
  });
}

/* ---- camera moves ---- */
let camTween=null;
function flyTo(p,t,dur=1.8){
  camTween={c0:camera.position.clone(),t0:controls.target.clone(),c1:new V3(...p),t1:new V3(...t),k:0,dur,fov0:camera.fov};
  controls.enabled=false;
}
function flyPreset(i){setDirector(false);if(UI.camMode==='follow')UI.setMode('orbit',true);const P=PRESETS[i];flyTo(P.p,P.t,2);UI.clearPreset();document.querySelectorAll('.preset')[i].classList.add('on');}
const FO={p:new V3(),t:new V3(),blend:1,c0:new V3(),t0:new V3(),lastPos:new V3(),lastH:0};
function setFollow(p,t){FO.p.set(...p);FO.t.set(...t);FO.blend=0;FO.c0.copy(camera.position);FO.t0.copy(controls.target);camTween=null;}
const _dp=new V3(),_dt=new V3(),_off=new V3();
function updateCamera(rdt){
  if(UI.camMode==='driver'){Driver.camera(rdt);return;}
  if(director&&curShot){applyShot();return;}
  if(Math.abs(camera.fov-UI.fovTarget)>.05){camera.fov=lerp(camera.fov,UI.fovTarget,clamp(rdt*3));camera.updateProjectionMatrix();}
  if(camTween){
    const c=camTween;c.k=clamp(c.k+rdt/c.dur);const k=easeIO(c.k);
    camera.position.lerpVectors(c.c0,c.c1,k);camera.position.y+=Math.sin(k*PI)*c.c0.distanceTo(c.c1)*.1;
    controls.target.lerpVectors(c.t0,c.t1,k);camera.lookAt(controls.target);
    if(c.k>=1){camTween=null;controls.enabled=true;controls.update();}
    return;
  }
  if(UI.camMode==='follow'){
    if(FO.blend<1){FO.blend=clamp(FO.blend+rdt/1.3);const k=easeIO(FO.blend);
      _dp.copy(FO.p);truck.localToWorld(_dp);_dt.copy(FO.t);truck.localToWorld(_dt);
      camera.position.lerpVectors(FO.c0,_dp,k);controls.target.lerpVectors(FO.t0,_dt,k);camera.lookAt(controls.target);controls.enabled=FO.blend>=1;
    }else{
      const dh=truck.rotation.y-FO.lastH;
      _off.copy(camera.position).sub(FO.lastPos).applyAxisAngle(UP,dh);camera.position.copy(truck.position).add(_off);
      _off.copy(controls.target).sub(FO.lastPos).applyAxisAngle(UP,dh);controls.target.copy(truck.position).add(_off);
      controls.update();
    }
    FO.lastPos.copy(truck.position);FO.lastH=truck.rotation.y;return;
  }
  controls.update();
}
function userTookCamera(){if(camTween){camTween=null;controls.enabled=true;}if(director){setDirector(false);}UI.clearPreset();}
canvas.addEventListener('pointerdown',userTookCamera,true);
canvas.addEventListener('wheel',userTookCamera,{capture:true,passive:true});

/* ---- wiring ---- */
$('#pills').innerHTML=PRESETS.map((p,i)=>`<button class="preset ${i===0?'on':''}" data-i="${i}"><i class="b"></i>${p.name}</button>`).join('');
$('#pills').onclick=e=>{const b=e.target.closest('.preset');if(!b)return;Sound.init();Sound.click();UI.closeInspector();flyPreset(+b.dataset.i);};
$('#modeOrbit').onclick=()=>{Sound.init();Sound.click();UI.setMode('orbit');};
$('#modeFollow').onclick=()=>{Sound.init();Sound.click();UI.setMode('follow');};
$('#filmBtn').onclick=()=>{if(S.completed>=STAGES.length-1)S.completed=-1;setRole('film');};
$('#orderBtn').onclick=()=>{Sound.init();Sound.click();UI.openDrawer(!document.body.classList.contains('drawer-open'));};
$('#recBtn').onclick=()=>Recorder.ask();$('#introRec').onclick=()=>Recorder.ask();$('#recNo').onclick=()=>$('#recWrap').classList.remove('on');$('#recGo').onclick=()=>Recorder.start();
$('#drClose').onclick=()=>{ROLE='free';UI.syncRoles();UI.openDrawer(false);};
$('#dashBtn').onclick=()=>{Sound.init();Sound.click();UI.openDash(!document.body.classList.contains('dash-open'));};
$('#dashClose').onclick=()=>{ROLE='free';UI.syncRoles();UI.openDash(false);};
document.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>setRole(b.dataset.role));
document.addEventListener('click',e=>{if(e.target.closest('.x-silence'))Driver.silence();else if(e.target.closest('.x-release'))Driver.clearAlarm();else if(e.target.closest('.x-reject'))Driver.rejectLoad();});
$('#admLab').onclick=()=>{UI.openDash(false);UI.openLab(true);};
$('#admImmob').onclick=()=>Driver.immobilise();
$('#admMsg').onchange=e=>{if(e.target.value!==''){Driver.message(+e.target.value);e.target.value='';}};
$('#drvTab').onclick=e=>{const b=e.target.closest('[data-k]');if(b)Driver.key(b.dataset.k);};
document.querySelectorAll('#drvPad button').forEach(b=>{const k=b.dataset.p;b.addEventListener('pointerdown',()=>KEYS[k]=true);['pointerup','pointerleave'].forEach(n=>b.addEventListener(n,()=>KEYS[k]=false));});
$('#labBtn').onclick=()=>{Sound.init();Sound.click();UI.openLab(!document.body.classList.contains('lab-open'));};
$('#labClose').onclick=()=>UI.closeLab();
$('#labReset').onclick=()=>UI.resetLab();
$('#labBody').onclick=e=>{const b=e.target.closest('button[data-s]');if(b)runScenario(b.dataset.s);};
$('#insClose').onclick=()=>UI.closeInspector();
$('#resume').onclick=()=>{UI.setMode('orbit',true);setDirector(true);};
function togglePlay(){
  Sound.init();
  if(S.manual){UI.toast('A driver is at the wheel. Press 4 for the film.');return;}
  if(S.scenario){UI.toast('Clear the alarm first, using the Tamper Lab reset');return;}
  if(autoplay&&!paused){paused=true;if(Sound.ctx)Sound.ctx.suspend();if(window.speechSynthesis)speechSynthesis.pause();UI.sync();return;}
  if(paused&&autoplay){paused=false;if(Sound.ctx)Sound.ctx.resume();if(window.speechSynthesis)speechSynthesis.resume();UI.sync();return;}
  paused=false;startFilm();
}
$('#playBtn').onclick=togglePlay;
$('#nextBtn').onclick=()=>{Sound.init();autoplay=false;paused=false;if(filmOn){setFilm(false);setDirector(false);Ops.hero(null);Ops.pip(null);}advance();};
const SPEEDS=[1,1.5,2,.5];let spI=0;
$('#speedBtn').onclick=()=>{spI=(spI+1)%SPEEDS.length;speedMul=SPEEDS[spI];$('#speedBtn').textContent=speedMul+'×';};
$('#ccBtn').onclick=e=>{captionsOn=!captionsOn;e.currentTarget.classList.toggle('on',captionsOn);if(!captionsOn)hideCaption();};
$('#voiceBtn').onclick=e=>{voiceOn=!voiceOn;e.currentTarget.classList.toggle('on',voiceOn);if(!voiceOn)Voice.stop();UI.toast(voiceOn?'Spoken narration on':'Spoken narration off');};
function toggleSound(){Sound.init();Sound.on=!Sound.on;const b=$('#soundBtn');b.classList.toggle('on',Sound.on);setIcon(b,Sound.on?'volume-2':'volume-x');}
$('#soundBtn').onclick=toggleSound;
function toggleFs(){if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen();}
$('#fsBtn').onclick=toggleFs;
$('#chapters').innerHTML=STAGES.map((s,i)=>`<button class="ch" data-i="${i}" aria-label="Jump to stage ${i+1}"><u><i></i></u><em>${i+1}. ${s.short}</em></button>`).join('');
$('#chapters').onclick=e=>{const b=e.target.closest('.ch');if(!b)return;Sound.init();if(S.scenario){S.scenario=null;UI.scenarioDone=null;UI.renderLab();}seek(+b.dataset.i);};
addEventListener('keydown',e=>{
  if(e.key==='Escape'&&Recorder.on){Recorder.stop();return;}
  if(e.target.tagName==='SELECT'||!$('#intro').classList.contains('out'))return;const k=e.key.toLowerCase();if(ROLE==='driver'&&k!=='escape')return;
  if(k==='e'){e.preventDefault();$('#nextBtn').click();}
  else if(k===' '){e.preventDefault();togglePlay();}
  else if(k==='m')toggleSound();
  else if(k==='f')toggleFs();
  else if(k==='escape'){UI.closeInspector();UI.openDrawer(false);UI.closeLab();UI.openDash(false);$('#receiptWrap').classList.remove('on');}
});
addEventListener('pointermove',()=>UI.bumpIdle(),{passive:true});
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();sizeGrain();sizeConfetti();});
$('#introFilm').onclick=()=>{$('#intro').classList.add('out');setRole('film');};
$('#introExplore').onclick=()=>{Sound.init();Sound.music(false);ROLE='free';UI.syncRoles();$('#intro').classList.add('out');flyPreset(0);};

/* ---- grain + confetti ---- */
const grainCv=$('#grain');let grainPat=null;
function sizeGrain(){grainCv.width=Math.ceil(innerWidth/1.5);grainCv.height=Math.ceil(innerHeight/1.5);}
{const t=document.createElement('canvas');t.width=t.height=256;const g=t.getContext('2d'),d=g.createImageData(256,256);for(let i=0;i<d.data.length;i+=4){const v=Math.random()*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;}g.putImageData(d,0,0);grainPat=t;sizeGrain();}
function drawGrain(){const g=grainCv.getContext('2d');const pat=g.createPattern(grainPat,'repeat');g.save();g.translate(-Math.random()*256,-Math.random()*256);g.fillStyle=pat;g.fillRect(0,0,grainCv.width+256,grainCv.height+256);g.restore();}
const cfCv=$('#confetti');function sizeConfetti(){cfCv.width=innerWidth;cfCv.height=innerHeight;}sizeConfetti();
function confetti(){
  const g=cfCv.getContext('2d'),C=['#0A24DA','#EF4444','#10B981','#FFFFFF','#49c6ff','#F5B83D'],P=Array.from({length:190},()=>({x:innerWidth/2+(Math.random()-.5)*160,y:innerHeight*.42,vx:(Math.random()-.5)*15,vy:-5-Math.random()*13,r:Math.random()*6,s:5+Math.random()*7,c:C[Math.floor(Math.random()*6)],w:Math.random()*.3}));
  const t0=performance.now();(function f(n){g.clearRect(0,0,cfCv.width,cfCv.height);const a=clamp((5200-(n-t0))/1100);if(a<=0)return;g.globalAlpha=a;
    P.forEach(p=>{p.vy+=.28;p.vx*=.992;p.x+=p.vx;p.y+=p.vy;p.r+=p.w;g.save();g.translate(p.x,p.y);g.rotate(p.r);g.fillStyle=p.c;g.fillRect(-p.s/2,-p.s/3,p.s,p.s*.6);g.restore();});requestAnimationFrame(f);})(t0);
}

/* ================= RUNTIME UPDATES ================= */
function levelH(f,R){ // liquid height in a horizontal cylinder for a given fill fraction
  if(f<=0)return 0;if(f>=1)return 2*R;let a=0,b=2*PI;for(let i=0;i<20;i++){const m=(a+b)/2;((m-Math.sin(m))/(2*PI)<f)?a=m:b=m;}return R*(1-Math.cos((a+b)/4));
}
const cleanW=new THREE.Color(0x1879ff),salty=new THREE.Color(0x8c8038),cleanS=new THREE.Color(0x62b6ff),saltyS=new THREE.Color(0xb7a653);
let lastS=S.truckS;const _q=new V3(),_n=new V3();
function updateTruck(rdt,dt){
  const u=clamp(S.truckS/PATH_LEN),p=pathCurve.getPointAt(u),t=pathCurve.getTangentAt(u);
  truck.position.copy(p);truck.position.x-=t.z*S.lat;truck.position.z+=t.x*S.lat;if(Math.abs(S.lat)>4.5)truck.position.y=Math.max(0,terrainH(truck.position.x,truck.position.z));truck.rotation.y=Math.atan2(-t.z,t.x)-(S.manual?Math.atan2(S.latV,Math.abs(Driver.v)+1.5):0);truck.updateMatrixWorld();
  const ds=S.truckS-lastS;lastS=S.truckS;const v=rdt>0?ds/Math.max(rdt,.001):0,acc=(v-S.truckV);S.truckV=v;
  if(Math.abs(ds)<20)TR.wheels.forEach(w=>w.rotation.z-=ds/.56);
  // slosh spring
  {const h=Math.min(rdt,.04);S.sloshV+=(-S.slosh*14-S.sloshV*2.2-clamp(acc,-6,6)*.5)*h;S.slosh+=S.sloshV*h;}S.slosh=clamp(S.slosh,-.11,.11);
  TR.hatchHinge.rotation.z=S.hatch*1.95;
  if(!S.alarm||!['hatch'].includes(S.scenario))TR.reedMat.emissive.setHex(S.hatch>.05?COL.red:COL.green);
  TR.outletMat.emissive.setHex(S.outlet?COL.green:COL.red);
  // water
  const R=TR.R-.04,f=clamp(S.vol/15000),h=levelH(f,R),y=TR.CY-R+h;
  const vis=f>.002;TR.water.visible=TR.surface.visible=vis;
  if(vis){
    TR.surfaceG.position.y=y;TR.surfaceG.rotation.z=S.slosh+Math.sin(performance.now()*.004)*(S.filling||S.discharging?.008:.002);
    TR.surface.scale.y=Math.max(.01,2*Math.sqrt(Math.max(0,R*R-(h-R)*(h-R))));
    TR.surfaceG.updateMatrixWorld();TR.surfaceG.getWorldPosition(_q);
    _n.set(Math.sin(TR.surfaceG.rotation.z),-Math.cos(TR.surfaceG.rotation.z),0).applyQuaternion(truck.quaternion);
    TR.clip.setFromNormalAndCoplanarPoint(_n,_q);
    const k=clamp((S.tds-185)/1265);TR.waterMat.color.copy(cleanW).lerp(salty,k);TR.surfaceMat.color.copy(cleanS).lerp(saltyS,k);TR.waterMat.emissive.setHex(k>.3?0x3a3010:0x0a3cff);TR.surfaceMat.emissive.setHex(k>.3?0x4a4018:0x1d6bff);
  }
  // client tank
  const cf=clamp(S.client/15000);CLIENT.water.visible=cf>.002;CLIENT.water.scale.y=Math.max(.001,cf*CLIENT.H);CLIENT.water.position.y=CLIENT.base+cf*CLIENT.H/2;
}
const flash=()=>Math.sin(performance.now()*.012)>0;
let pingT=0,dustI=0;const dustAge=new Float32Array(FX.dust.n).fill(9);
function updateRigs(rdt,dt){
  // valve
  S.valve+=(S.valveTarget-S.valve)*clamp(rdt*(S.valveTarget?2.6:12));
  G.valveIndicator.rotation.y=S.valve*PI/2;
  const open=S.valve>.5,col=open?COL.green:COL.red;G.valveRingMat.color.setHex(col);G.valveGlow.material.color.setHex(col);G.valveGlow.material.opacity=.55+.2*Math.sin(performance.now()*.004);
  // gate
  G.boom.rotation.x=S.gate*84*DEG;
  // geofence
  const pk=(performance.now()*.00035)%1;FENCE.pulse.scale.setScalar(pk*FENCE_R);FENCE.pulse.material.opacity=(1-pk)*.5;
  FENCE.wall.material.opacity=S.fenceOn?.75+.2*Math.sin(performance.now()*.006):.3;FENCE.fill.material.opacity=S.fenceOn?.2:.08;
  // alarm visuals
  const alarm=!!S.alarm&&!S.silenced,on=alarm&&flash();
  G.beaconMat.emissive.setHex(on?COL.red:0x551010);G.beaconMat.emissiveIntensity=on?5:.5;
  const truckAlarm=alarm&&(S.scenario==='hatch'||S.scenario==='salt'||S.manual);
  TR.beaconMat.emissive.setHex(truckAlarm&&on?COL.red:0x551010);TR.beaconMat.emissiveIntensity=truckAlarm&&on?5:.5;TR.beaconGlow.material.opacity=truckAlarm&&on?.9:0;
  if(alarm){const near=truckAlarm||S.manual?truck.position:(S.scenario==='fake'?new V3(-71,4,0):new V3(GX,8,6));alarmLight.position.copy(near).setY(near.y+6);alarmLight.intensity=on?7:.8;}else alarmLight.intensity=0;
  G.notes.forEach(n=>n.visible=camera.position.distanceTo(n.getWorldPosition(_v))<34);
  // GPS pings
  if(S.pinging&&!paused){pingT+=dt;if(pingT>1.7){pingT=0;const q=truck.localToWorld(new V3(4.2,4.5,.1));pingRing(q,0x60a5fa,5,1.3);Sound.ping();TR.gpsGlow.material.opacity=1;}}
  TR.gpsGlow.material.opacity*=.95;
  // rings
  for(let i=ringPool.length-1;i>=0;i--){const r=ringPool[i];r.t+=rdt;const k=r.t/r.dur;if(k>=1){scene.remove(r.m);r.m.geometry.dispose();r.m.material.dispose();ringPool.splice(i,1);continue;}r.m.scale.setScalar(.2+k*r.R);r.m.material.opacity=(1-k)*.9;if(!r.flat)r.m.quaternion.copy(camera.quaternion);}
  // packets
  for(let i=packets.length-1;i>=0;i--){const q=packets[i];q.t+=rdt/q.dur;if(q.t>=1){gantry.remove(q.s);q.s.material.dispose();packets.splice(i,1);continue;}q.curve.getPoint(q.t,q.s.position);}
  particles(rdt,dt);
}
const _a=new V3(),_b=new V3();
function particles(rdt,dt){
  const T=performance.now()*.001;
  // fall stream into tank
  const F=FX.fall;F.o.visible=S.filling&&!paused||S.filling;if(F.o.visible){const top=BEAM_Y-.2,bot=TR.surfaceG.position.y+.02,rng=top-bot;for(let i=0;i<F.n;i++){const s=F.seed[i],k=(T*(1.1+s[0]*.5)+s[1])%1;const r=.1+s[2]*.2,a=s[0]*20;F.p[i*3]=GX+Math.cos(a)*r;F.p[i*3+1]=top-k*k*rng;F.p[i*3+2]=Math.sin(a)*r;}F.g.attributes.position.needsUpdate=true;}
  const SP=FX.splash;SP.o.visible=S.filling;if(SP.o.visible){const base=TR.surfaceG.position.y;for(let i=0;i<SP.n;i++){const s=SP.seed[i],k=(T*1.6+s[1])%1,a=s[0]*20,r=.2+k*.7;SP.p[i*3]=GX+Math.cos(a)*r;SP.p[i*3+1]=base+Math.sin(k*PI)*(.2+s[2]*.45);SP.p[i*3+2]=Math.sin(a)*r;}SP.g.attributes.position.needsUpdate=true;}
  const H=FX.header;H.o.visible=S.filling;if(H.o.visible){for(let i=0;i<H.n;i++){HEADER_PATH.getPoint((T*.32+i/H.n)%1,_a);H.p.set([_a.x,_a.y,_a.z],i*3);}H.g.attributes.position.needsUpdate=true;}
  const D=FX.dis;D.o.visible=S.discharging;if(D.o.visible){D.o.material.depthTest=false;for(let i=0;i<D.n;i++){const s=D.seed[i];hoseCurve.getPoint((T*.7+i/D.n)%1,_a);D.p.set([_a.x+(s[0]-.5)*.1,_a.y+(s[1]-.5)*.1,_a.z+(s[2]-.5)*.1],i*3);}D.g.attributes.position.needsUpdate=true;}
  const SI=FX.siphon;SI.o.visible=S.siphon;if(SI.o.visible){_a.set(-1.5,4.3,.4);truck.localToWorld(_a);_b.set(-1.5,0,3.2);truck.localToWorld(_b);for(let i=0;i<SI.n;i++){const s=SI.seed[i],k=(T*1.2+s[0])%1;SI.p[i*3]=lerp(_a.x,_b.x,k)+(s[1]-.5)*.14;SI.p[i*3+1]=Math.max(.05,_a.y+Math.sin(k*PI*.5)*.5-k*k*_a.y*1.3);SI.p[i*3+2]=lerp(_a.z,_b.z,k)+(s[2]-.5)*.14;}SI.g.attributes.position.needsUpdate=true;}
  const WF=FX.well;WF.o.visible=S.wellFlow;if(WF.o.visible){_a.set(WELL.position.x,2,WELL.position.z);_b.set(-1.5,4.3,0);truck.localToWorld(_b);for(let i=0;i<WF.n;i++){const s=WF.seed[i],k=(T*.8+i/WF.n)%1;WF.p[i*3]=lerp(_a.x,_b.x,k)+(s[1]-.5)*.1;WF.p[i*3+1]=lerp(_a.y,_b.y,k)+Math.sin(k*PI)*2.2;WF.p[i*3+2]=lerp(_a.z,_b.z,k)+(s[2]-.5)*.1;}WF.g.attributes.position.needsUpdate=true;}
  // dust
  const Du=FX.dust,sp=Math.abs(S.truckV);Du.o.visible=true;
  if(sp>3&&Math.random()<sp*.05){const i=dustI++%Du.n;_a.set(-6.2,.5,(Math.random()-.5)*2.2);truck.localToWorld(_a);Du.p.set([_a.x,_a.y,_a.z],i*3);dustAge[i]=0;}
  for(let i=0;i<Du.n;i++){dustAge[i]+=rdt;if(dustAge[i]>2.6){Du.p[i*3+1]=-20;continue;}Du.p[i*3+1]+=rdt*.55;Du.p[i*3]+=Du.seed[i][0]*rdt*.5;}Du.g.attributes.position.needsUpdate=true;
}

/* ---- in-world screens ---- */
let hmiKey='',lcdKey='';
function drawScreens(){
  const k=`${Math.round(S.vol)}|${S.hmiMsg}|${S.bayReady}|${S.qty}`;
  if(k!==hmiKey){hmiKey=k;const g=G.hmiTex.userData.g,w=512,h=360;
    g.fillStyle='#050a2c';g.fillRect(0,0,w,h);g.fillStyle='#0A24DA';g.fillRect(0,0,w,50);g.fillStyle='#fff';g.font='700 26px Saira,sans-serif';g.textBaseline='middle';g.textAlign='left';g.fillText('M ARABIA  ·  BAY 01',16,26);
    g.textAlign='right';g.font='600 18px IBM Plex Mono,monospace';g.fillText(S.plate,w-14,26);
    g.textAlign='left';g.fillStyle='#8fa2ff';g.font='600 21px Saira,sans-serif';g.fillText('LOADED',20,84);
    g.fillStyle='#fff';g.font='600 74px IBM Plex Mono,monospace';g.fillText(Math.round(S.vol).toLocaleString('en-US'),18,138);g.fillStyle='#8fa2ff';g.font='600 30px Saira,sans-serif';g.textAlign='right';g.fillText('L',w-20,146);
    g.fillStyle='#1a2356';g.fillRect(20,184,w-40,20);g.fillStyle='#49c6ff';g.fillRect(20,184,(w-40)*clamp(S.vol/Math.max(S.qty,1)),20);
    g.textAlign='left';g.fillStyle='#8fa2ff';g.font='500 19px Saira,sans-serif';g.fillText('Quota '+S.qty.toLocaleString('en-US')+' L',20,224);
    g.fillStyle=S.hmiTone;g.font='700 34px Saira,sans-serif';g.fillText(S.hmiMsg,20,266);
    g.fillStyle=S.bayReady?'#10B981':'#3a2a35';g.fillRect(20,296,w-40,50);g.fillStyle=S.bayReady?'#fff':'#a58a96';g.font='700 26px Saira,sans-serif';g.textAlign='center';g.fillText(S.bayReady?'● BAY READY':'○ BAY NOT READY',w/2,322);
    G.hmiTex.needsUpdate=true;}
  const k2=`${S.flow.toFixed(1)}|${Math.round(S.vol)}|${Math.round(S.q)}|${S.filling}`;
  if(k2!==lcdKey){lcdKey=k2;const g=G.lcdTex.userData.g,w=420,h=300;
    g.fillStyle='#a7c78d';g.fillRect(0,0,w,h);g.fillStyle='#142408';g.font='700 26px IBM Plex Mono,monospace';g.textAlign='left';g.textBaseline='middle';
    const f=S.flow>0?(S.flow+Math.sin(performance.now()*.01)*.7):0;
    g.fillText('TUF-2000B',16,28);g.font='600 25px IBM Plex Mono,monospace';g.fillText('FLOW '+f.toFixed(1)+' m3/h',16,88);g.fillText('NET+ '+Math.round(S.vol)+' L',16,146);
    g.fillText('Q='+Math.round(S.q)+'  S='+(S.q>40?'82,80':'11,07'),16,204);g.fillStyle=S.q>40?'#142408':'#9c1212';g.font='700 26px IBM Plex Mono,monospace';g.fillText(S.q>40?'*R  SIGNAL OK':'*E  LOW SIGNAL',16,262);
    G.lcdTex.needsUpdate=true;}
}

/* ---- radar ---- */
const rCv=$('#radarCv');rCv.width=600;rCv.height=292;const rg=rCv.getContext('2d');const trail=[];let trailT=0;
const RX=x=>22+(x+140)/280*556,RZ=z=>146+(z-4)*1.99;
function drawRadar(){
  const g=rg,w=600,h=292;g.clearRect(0,0,w,h);g.fillStyle='#040a24';g.fillRect(0,0,w,h);
  g.strokeStyle='rgba(120,150,255,.09)';g.lineWidth=1;for(let x=0;x<w;x+=40){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}for(let y=0;y<h;y+=40){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
  const zone=(x0,x1,z0,z1,c,a,b)=>{const X=RX(x0),Y=RZ(z0),W=RX(x1)-X,H=RZ(z1)-Y;g.fillStyle=c+'22';g.strokeStyle=c+'aa';g.lineWidth=2;g.fillRect(X,Y,W,H);g.strokeRect(X,Y,W,H);g.fillStyle='#fff';g.font='700 20px Saira,sans-serif';g.textAlign='left';g.textBaseline='top';g.fillText(a,X+8,Y+6);g.fillStyle='rgba(255,255,255,.72)';g.font='500 18px Saira,sans-serif';g.fillText(b,X+8,Y+28);};
  zone(-104,-36,-30,46,'#3550FF','Zone A','Gantry Bay');zone(62,136,-30,40,'#10B981','Zone C','Client Site');
  g.fillStyle='#fff';g.font='700 20px Saira,sans-serif';g.textAlign='center';g.fillText('Zone B',RX(14),RZ(10));g.fillStyle='rgba(255,255,255,.72)';g.font='500 18px Saira,sans-serif';g.fillText('Desert Highway',RX(14),RZ(10)+22);
  g.beginPath();SAMPLES.forEach((p,i)=>i%6===0&&(i?g.lineTo(RX(p.x),RZ(p.z)):g.moveTo(RX(p.x),RZ(p.z))));g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=5;g.lineCap='round';g.stroke();
  g.beginPath();g.arc(RX(FENCE_C.x),RZ(FENCE_C.z),FENCE_R*1.99,0,7);g.strokeStyle=S.lockedOut?'#EF4444':'#10B981';g.lineWidth=2.5;g.setLineDash([7,5]);g.stroke();g.setLineDash([]);
  // trail
  g.strokeStyle='rgba(73,198,255,.8)';g.lineWidth=4;g.beginPath();trail.forEach((p,i)=>i?g.lineTo(RX(p[0]),RZ(p[1])):g.moveTo(RX(p[0]),RZ(p[1])));g.stroke();
  if(S.ghost){const gx=RX(S.ghost.x),gy=RZ(S.ghost.z);g.fillStyle='#F5B83D';g.beginPath();g.arc(gx,gy,8,0,7);g.fill();g.font='600 18px Saira,sans-serif';g.textAlign='center';g.fillStyle='#fff';g.fillText('Real truck',gx,gy-30);}
  const x=RX(truck.position.x),y=RZ(truck.position.z),bad=!!S.alarm,c=bad?'#EF4444':'#49c6ff',pul=(performance.now()*.001)%1;
  g.beginPath();g.arc(x,y,8+pul*22,0,7);g.strokeStyle=c;g.globalAlpha=1-pul;g.lineWidth=2.5;g.stroke();g.globalAlpha=1;
  g.shadowColor=c;g.shadowBlur=20;g.fillStyle='#fff';g.beginPath();g.arc(x,y,7,0,7);g.fill();g.fillStyle=c;g.beginPath();g.arc(x,y,4.5,0,7);g.fill();g.shadowBlur=0;
}
const tdsEl=$('#tTds');
function updateHud(){
  $('#rVol').textContent=fmtL(S.vol);$('#rBar').style.width=(S.vol/15000*100)+'%';
  const st=$('#rStatus');const txt=S.alarm?'ALARM':S.status;st.textContent=txt;st.className='status '+(S.alarm?'bad':txt==='COMPLETED'?'ok':txt==='IDLE'?'':'run');
  $('#tFlow').textContent=(S.flow>0?S.flow+Math.sin(performance.now()*.008)*.7:0).toFixed(1);
  const q=$('#tQ');q.textContent='Q '+Math.round(S.q);q.className=S.q>40?'ok':'bad';
  const vv=$('#tValve'),opn=S.valveTarget>0;vv.textContent=opn?'OPEN':'LOCKED';vv.className=opn?'ok':'bad';
  const hh=$('#tHatch'),ho=S.hatch>.05;hh.textContent=ho?'OPEN':'SEALED';hh.className=ho&&S.scenario?'bad':ho?'':'ok';
  tdsEl.textContent=Math.round(S.tds).toLocaleString('en-US')+' ppm';tdsEl.className=S.tds>500?'bad':'ok';
  const oo=$('#tOut');oo.textContent=S.outlet?'OPEN':'LOCKED';oo.className=S.outlet?'ok':'bad';
  const bs=$('#bigstat');bs.classList.toggle('on',S.bigstat&&filmOn|| S.bigstat&&director);$('#bsV').textContent=fmtL(S.stage===6?S.client:S.vol);
  if($('#dVol')){$('#dVol').textContent=fmtL(S.vol);$('#dCli').textContent=fmtL(S.client);}
  // chapters
  const ch=$('#chapters').children;let total=0,el=0;for(let i=0;i<STAGES.length;i++){const d=STAGES[i].dur();total+=d;let k=0;if(!S.scenario){if(i<=S.completed&&!(i===S.stage&&S.running))k=1;else if(i===S.stage&&S.running)k=clamp((simClock-stageT0)/stageDur);}ch[i].querySelector('i').style.width=(k*100)+'%';el+=k*d;}
  const f=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0');$('#clock').textContent=f(el)+' / '+f(total);
}

/* ================= MAIN LOOP ================= */
const clock=new THREE.Clock();let frame=0,viewShift=0,grainT=0,sunSize=55;
function tick(){
  requestAnimationFrame(tick);
  const rdt=Math.min(clock.getDelta(),.2),dt=paused?0:rdt*speedMul; // keeps film length steady on slower PCs
  processTime(dt);Driver.tick(rdt);
  updateTruck(paused?0:rdt*speedMul,dt);updateRigs(rdt,dt);updateCamera(rdt);
  // keep subject centred when the drawer takes the right side
  const cl=document.body.classList,wantShift=innerWidth<=760?0:(cl.contains('drawer-open')?200:0)-0;viewShift=lerp(viewShift,wantShift,clamp(rdt*5));
  camera.setViewOffset(innerWidth,innerHeight,viewShift,0,innerWidth,innerHeight);
  // shadows follow the focus
  const dist=camera.position.distanceTo(controls.target),want=clamp(dist*.85,38,170);
  if(Math.abs(want-sunSize)>4){sunSize=want;const c=sun.shadow.camera;c.left=-want;c.right=want;c.top=want;c.bottom=-want;c.updateProjectionMatrix();}
  sun.target.position.copy(controls.target).setY(0);sun.position.copy(sun.target.position).addScaledVector(SUN_DIR,170);
  Sound.update(paused?0:Math.abs(S.truckV)*2,!paused&&(S.filling||S.discharging),!!S.alarm&&!S.silenced);
  if(frame%3===0){drawRadar();drawScreens();updateHud();Ops.update();Driver.hud();}
  if(trailT++%10===0&&S.status!=='IDLE'){trail.push([truck.position.x,truck.position.z]);if(trail.length>300)trail.shift();}
  if(S.truckS<=S_POS.staging+.01)trail.length=0;
  if(filmOn&&(grainT+=rdt)>.09){grainT=0;drawGrain();}
  renderer.render(scene,camera);Recorder.frame();if(frame%3===0&&document.body.classList.contains('dash-open'))Ops.copyCam();updateLabels();frame++;
}
TR.setPlate(S.plate);
logoBadge.src=$('.brand .badge').src;logoWord.src=$('.brand .word').src;
Ops.init();UI.drawerToOrder();UI.renderLab();icons();UI.sync();
camera.position.set(-138,40,92);controls.target.set(-60,4,0);controls.update();
tick();
// attract: slow drift behind the title card
(function attract(){let a=0;const id=setInterval(()=>{if($('#intro').classList.contains('out')){clearInterval(id);return;}a+=.0016;camera.position.set(-60+Math.cos(a+2.2)*118,38,Math.sin(a+2.2)*118);controls.target.set(-60,4,0);},16);})();
window.__MA={Recorder,Driver,setRole,Ops,KEYS,S,seek,runScenario,startFilm,camera,controls,get director(){return director},flyPreset,UI,setDirector,get speedMul(){return speedMul},set speedMul(v){speedMul=v},renderer};
