/* ================= CLIENT APP + ADMIN DASHBOARD ================= */
const STAGE_MIN=[2,6,3,7,1,24,12,2],CUM=[0];STAGE_MIN.forEach((m,i)=>CUM.push(CUM[i]+m));
const ROUTE_KM=24,SERIES={tank:'#3F5FF0',loaded:'#B45F06',delivered:'#0D9488'};
const HW_SHORT={anpr:'ANPR',rfid:'RFID',valve:'Valve',meter:'TUF-2000B',plc:'PLC',chute:'Chute',gps:'GPS + TDS',outlet:'Outlet'};
const JOBS=[
 {plc:'Receives the order over 4G and stores the quota as the fill limit.',gps:'Reports the truck ready in the staging lane.'},
 {anpr:'Photographs the plate and sends the number to the PLC.',rfid:'Reads the hidden chassis tag by radio.',plc:'Compares plate and tag with the order. Both match, so it lifts the gate.',gps:'Logs arrival at the station.'},
 {chute:'Lowers into the hatch. Collar sensor reports "seated".',plc:'Checks every interlock, then commands the valve to open.',valve:'Rotates open on the PLC command. Ring turns green.',gps:'Confirms this truck really is at the gantry, and logs the permitted hatch opening.'},
 {meter:'Times sound pulses across the pipe and reports litres over RS-485.',plc:'Compares the total to the quota and watches signal quality Q.',valve:'Held open while every check stays healthy.',chute:'Stays seated. Any lift stops the flow.',gps:'Level probe rises, giving a second opinion on the meter.'},
 {meter:'Reports the exact quota has been reached.',plc:'Sends the close command in the same instant.',valve:'Slams shut. Ring turns red.',chute:'Raises only after flow reads zero.',gps:'Arms the hatch seal and records the loaded level.'},
 {gps:'Sends position, speed, TDS, level and hatch state to dashboard and app.',outlet:'Stays locked. Outside the geofence it ignores every request.',plc:'Closes the loading record and uploads it.'},
 {gps:'Confirms the truck is inside the ring and TDS is in range.',outlet:'Unlocks after client confirmation, then counts every litre out.'},
 {meter:'Supplies figure 1: litres loaded.',gps:'Supplies figure 2: litres carried, from the level probe.',outlet:'Supplies figure 3: litres delivered.',plc:'Uploads the sealed batch record for the receipt.'},
];
// client-facing words only: no engineering on the phone
const NOTES=[
 q=>`Order confirmed. ${q} reserved for you.`,
 ()=>'Your tanker has arrived at the filling station.',
 null,
 ()=>'Your tanker is being filled.',
 ()=>'Filled and sealed. Getting ready to leave.',
 ()=>'Your tanker is on the way.',
 null,
 ()=>'Your receipt is ready.',
];
const SCEN_MIN={clone:7,fake:2,chute:9,strap:13,hatch:30,salt:36};
const DEMO_ORDERS=[{no:'MA-481207',site:'Al Malqa Tower Site',qty:10000,state:'DELIVERED',truck:'KSA 1907 RSA'},{no:'MA-481166',site:'Exit 9 Logistics Park',qty:15000,state:'DELIVERED',truck:'KSA 3360 RSA'}];
const Ops={orders:[],log:[],notes:[],hist:[],logDirty:true,notesDirty:true,pipKind:null,heroKind:null,scenT0:0,lastSample:-1,hover:null,curTab:'overview',views:new WeakMap(),
  mins(){
    if(S.scenario)return SCEN_MIN[S.scenario]+(simClock-this.scenT0)*.2;
    if(S.stage<0)return 0;
    if(S.running&&S.stage>=0)return CUM[S.stage]+clamp((simClock-stageT0)/stageDur)*STAGE_MIN[S.stage];
    return CUM[S.completed+1];
  },
  clock(m){const at=S.order?S.order.at:new Date();return new Date(at.getTime()+m*60000).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});},
  addLog(text,tone=''){this.log.unshift({t:this.clock(this.mins()),text,tone});if(this.log.length>80)this.log.pop();this.logDirty=true;},
  notify(text,tone=''){this.notes.unshift({t:this.clock(this.mins()),text,tone});this.notesDirty=true;},
  reset(){this.log=[];this.notes=[];this.hist=[];this.lastSample=-1;this.logDirty=this.notesDirty=true;},
  backfill(i){
    const q=S.qty,fmt=fmtL(q);this.hist=[];
    const P=[[0,0,0,0],[CUM[3],0,0,0],[CUM[4],.96,.96,0],[CUM[5],1,1,0],[CUM[6],1,1,0],[CUM[7],1,0,1]];
    P.forEach(p=>{if(p[0]<=CUM[i])this.hist.push({m:p[0],l:p[1]*q,t:p[2]*q,d:p[3]*q});});
    for(let j=0;j<i;j++){const n=NOTES[j];if(n)this.notes.unshift({t:this.clock(CUM[j]+.5),text:n(fmt),tone:''});this.log.unshift({t:this.clock(CUM[j+1]),text:`Stage ${j+1} complete: ${STAGES[j].short}`,tone:'ok'});}
    this.logDirty=this.notesDirty=true;
  },
  sample(){
    if(!S.order||S.stage<0&&!S.scenario)return;const m=this.mins();if(m-this.lastSample<.12)return;this.lastSample=m;
    this.hist.push({m,l:S.filling?S.vol:S.loaded,t:S.vol,d:S.client});if(this.hist.length>600)this.hist.shift();
  },
  pip(k){if(k&&!director&&!S.scenario)k=null;this.pipKind=k;const c=document.body.classList;c.toggle('phone-pip',k==='phone');$('#pipDash').classList.toggle('on',k==='dash');c.toggle('pip-on',!!k);},
  hero(k,tab){ // film only: bring a screen full-frame for a moment
    const c=document.body.classList;if(k&&!(filmOn&&director&&ROLE==='film'))return;
    c.toggle('hero-phone',k==='phone');c.toggle('hero-dash',k==='dash');
    if(k==='dash'){UI.openDash(true);this.tab(tab||'overview');this.heroDash=true;}
    else if(this.heroDash){this.heroDash=false;if(ROLE!=='admin')UI.openDash(false);}
    this.heroKind=k||null;
  },
  tab(t){this.curTab=t;document.querySelectorAll('.d-tab').forEach(b=>b.classList.toggle('on',b.dataset.t===t));document.querySelectorAll('[data-sec]').forEach(s=>s.classList.toggle('on',s.dataset.sec===t));const b=$('.d-b');if(b)b.scrollTop=0;this.logDirty=true;this._ok=null;},
  faulty(id){return (S.scenario?SCEN[S.scenario].parts:S.faultParts||[]).includes(id);},
  hwState(id){
    if(S.alarm&&this.faulty(id))return['FAULT','bad'];
    if(S.running&&S.stage>=0&&JOBS[S.stage][id])return['ACTIVE','act'];
    return['STANDBY',''];
  },
  hwJob(id){
    if(S.alarm&&this.faulty(id))return S.alarm;
    const st=S.running?S.stage:S.completed;return (st>=0&&JOBS[st][id])||'Standing by. Health check passing.';
  },
  hwRead(id){
    switch(id){
      case'anpr':return'Plate '+S.plate;case'rfid':return S.plate==='KSA 4821 RSA'?'Tag matched to plate':'Tag mismatch';
      case'valve':return S.valveTarget?'OPEN':'LOCKED';case'meter':return`Q ${Math.round(S.q)} · ${S.flow.toFixed(0)} m³/h`;
      case'plc':return S.alarm?'Interlock tripped':'Interlocks healthy';case'chute':return S.chuteSeated?'SEATED':'RAISED';
      case'gps':return`${Math.round(S.tds).toLocaleString('en-US')} ppm · ${this.speed()} km/h`;case'outlet':return S.outlet?`OPEN · ${fmtL(S.client)}`:'LOCKED';
    }
  },
  speed(){const v=Math.abs(S.truckV)/((S_POS.fence-S_POS.bay)/24)*60;return Math.round(Math.min(v,110));},
  kmLeft(){if(S.truckS>=S_POS.fence)return 0;if(S.truckS<=S_POS.bay)return ROUTE_KM;return ROUTE_KM*(1-(S.truckS-S_POS.bay)/(S_POS.fence-S_POS.bay));},
  init(){
    $('#hwGrid').innerHTML=PARTS.map(p=>`<button class="hw" data-id="${p.id}"><span class="hw-t"><span class="num">${p.n}</span><b>${p.name}</b><em class="hw-s"></em></span><span class="hw-j"></span><code class="hw-r"></code></button>`).join('');
    $('#hwGrid').onclick=e=>{const b=e.target.closest('.hw');if(b){UI.inspect(b.dataset.id);}};
    $('#matrix').innerHTML=`<thead><tr><th>Stage</th>${PARTS.map(p=>`<th title="${p.name}">${HW_SHORT[p.id]}</th>`).join('')}</tr></thead><tbody>${STAGES.map((s,i)=>`<tr data-i="${i}"><td>${i+1}. ${s.short}</td>${PARTS.map(p=>JOBS[i][p.id]?`<td title="${p.name}: ${JOBS[i][p.id]}"><i></i></td>`:'<td></td>').join('')}</tr>`).join('')}</tbody>`;
    $('#matrix').onclick=e=>{const r=e.target.closest('tr[data-i]');if(r){Sound.init();seek(+r.dataset.i);}};
    $('#pipDash .pd-chips').innerHTML=PARTS.map(p=>`<span data-id="${p.id}"><i>${p.n}</i>${HW_SHORT[p.id]}</span>`).join('');
    $('#dTabs').onclick=e=>{const b=e.target.closest('.d-tab');if(b)this.tab(b.dataset.t);};
    document.addEventListener('click',e=>{const c=e.target.closest('.x-confirmBtn');if(c&&S.confirmRes){const r=S.confirmRes;S.confirmRes=null;S.awaitConfirm=false;Sound.ok();r();}
      if(e.target.closest('#pipDash'))setRole('admin');if(document.body.classList.contains('phone-pip')&&!document.body.classList.contains('drawer-open')&&e.target.closest('#drawer'))setRole('client');});
    const cv=$('#dashChart');
    cv.addEventListener('mousemove',e=>{const r=cv.getBoundingClientRect();this.hover=(e.clientX-r.left)/r.width;});cv.addEventListener('mouseleave',()=>{this.hover=null;$('#chartTip').style.opacity=0;});
    this.tab('overview');
  },
  setAll(sel,fn){document.querySelectorAll(sel).forEach(fn);},
  update(){
    this.sample();
    const m=this.mins(),st=S.running?S.stage:Math.max(S.completed,S.stage),done=S.completed>=STAGES.length-1&&!S.scenario,hold=!!S.alarm;
    /* ---- phone ---- */
    let head='Order placed',sub='',step=0;
    if(S.order&&(st>=0||S.scenario)){
      const left=Math.max(1,Math.round(CUM[6]-m)),arr=this.clock(CUM[6]);
      if(st<=0){head='Order confirmed';sub=`Arrives around ${arr}`;step=0;}
      else if(st===1){head='Your tanker is at the station';sub=`Arrives around ${arr}`;step=1;}
      else if(st<=4){head=st===4?'Filled and sealed':'Filling your tanker';sub=`Arrives around ${arr}`;step=1;}
      else if(st===5){head=`Arriving in ${left} min`;sub=`${this.kmLeft().toFixed(1)} km away · on time`;step=2;}
      else if(st===6){const full=S.client>=S.qty;head=full?'All water delivered':S.discharging?'Filling your tank':'Your tanker is here';sub=full?'Preparing your receipt':S.discharging?'Sit tight, nearly done':'At your site';step=3;}
      else{head='Delivered';sub=`Completed at ${this.clock(CUM[8])}`;step=4;}
      if(S.scenario&&!hold){head='On its way to you';sub='Tracking live';step=2;}
      if(done){head='Delivered';step=4;}
    }
    if(hold){head='Delivery paused';sub='We are checking something. No action needed from you.';}
    this.setAll('.x-sheet',e=>e.classList.toggle('hold',hold));
    this.setAll('.x-head',e=>{if(e.textContent!==head)e.textContent=head;});this.setAll('.x-eta',e=>{if(e.textContent!==sub)e.textContent=sub;});
    this.setAll('.st5',e=>[...e.children].forEach((c,i)=>{c.classList.toggle('done',i<step||done);c.classList.toggle('now',i===step&&!done);}));
    const showBar=st>=2&&st<=4||st===6,pct=st===6||done?S.client/S.qty:S.vol/S.qty;
    this.setAll('.x-ltr',e=>e.style.display=showBar&&!hold?'block':'none');
    this.setAll('.x-ltrT',e=>e.textContent=st===6?`${fmtL(S.client)} of ${fmtL(S.qty)} in your tank`:`${fmtL(S.vol)} of ${fmtL(S.qty)} loaded`);
    this.setAll('.x-ltrB',e=>e.style.width=clamp(pct)*100+'%');
    const bad=S.tds>500;
    this.setAll('.x-qual',e=>{e.textContent=bad?'Water quality: Failed check':'Water quality: Safe';e.className='chip x-qual '+(bad?'bad':'ok');});
    const sealBad=hold&&S.lockedOut&&!bad;this.setAll('.x-seal',e=>{e.textContent=sealBad?'Tanker seal: Being checked':'Tanker seal: Intact';e.className='chip x-seal '+(sealBad?'bad':'ok');});
    this.setAll('.x-confirm',e=>e.classList.toggle('on',!!S.awaitConfirm));
    this.setAll('.x-driver',e=>e.style.display=done?'none':'flex');
    this.setAll('.x-done',e=>e.style.display=done?'block':'none');
    if(this.notesDirty){this.notesDirty=false;
      this.setAll('.x-notes',e=>e.innerHTML=this.notes.length?this.notes.slice(0,6).map(n=>`<li class="${n.tone}"><span>${n.text}</span><time>${n.t}</time></li>`).join(''):'<li><span>Your updates will appear here.</span></li>');
      const n=this.notes[0];if(n&&n!==this._lastNote){this._lastNote=n;const t=$('#phToast');if(t){t.innerHTML=`<img alt="" src="${$('.brand .badge').src}"><span><b>M Arabia Water</b>${n.text}</span>`;t.classList.remove('go');void t.offsetWidth;t.classList.add('go');}}
    }
    document.querySelectorAll('.x-map').forEach(c=>{if(c.offsetParent!==null)this.drawMap(c,false,st,done);});
    /* ---- dashboard ---- */
    const dashOpen=document.body.classList.contains('dash-open');
    if(dashOpen||this.pipKind==='dash'){
      const set=(id,v)=>this.setAll(id,e=>e.textContent=v);
      set('.k-qty',S.order?fmtL(S.qty):'-');set('.k-load',fmtL(S.filling?S.vol:S.loaded));set('.k-tank',fmtL(S.vol));set('.k-del',fmtL(S.client));set('.k-now',S.order?this.clock(m):'--:--');
      const missing=S.loaded>0&&(st>=5||S.scenario)?Math.round(S.loaded-S.vol-S.client):0;
      this.setAll('.k-var',e=>{e.textContent=fmtL(Math.abs(missing));e.className='k-var '+(Math.abs(missing)>0?'bad':'ok');});
    }
    if(dashOpen){
      const T=this.curTab;
      const aT=S.alarm?(S.silenced?'Alarm off, hold still on. ':'')+S.alarm:'All clear. No active alarms.';this.setAll('.x-alarmT',e=>{if(e.textContent!==aT)e.textContent=aT;});this.setAll('.x-alarmBox',e=>{e.classList.toggle('bad',!!S.alarm&&!S.silenced);e.classList.toggle('acked',!!S.alarm&&!!S.silenced);});
      this.setAll('#dash .x-silence',e=>e.style.display=S.alarm&&!S.silenced?'':'none');this.setAll('.x-release',e=>e.classList.toggle('dim',!S.alarm&&!S.immob||S.tds>500));this.setAll('.x-reject',e=>e.style.display=S.alarm&&S.tds>500?'inline-flex':'none');
      $('#dAlertN').textContent=S.alarm?'1':'';$('#dAlertN').style.display=S.alarm?'':'none';
      const rows=[...(this.orders.map(o=>{const cur=o===S.order,lbl=!cur?'DELIVERED':S.alarm?'ON HOLD':S.completed>=7?'DELIVERED':S.status==='IDLE'?'CONFIRMED':S.status;return{...o,truck:'KSA 4821 RSA',state:lbl,drv:cur?(S.manual?'You':'Khalid A.'):'Khalid A.',eta:cur&&S.completed<5?this.clock(CUM[6]):'-',live:cur};})),...DEMO_ORDERS.map(o=>({...o,drv:'Demo',eta:'-'}))];
      const ok=rows.map(o=>`<tr class="${o.live?'live':''}"><td><code>${o.no}</code></td><td>${o.site}</td><td><code>${fmtL(o.qty)}</code></td><td><code>${o.truck}</code></td><td>${o.drv}</td><td><code>${o.eta}</code></td><td><span class="chipS ${o.state==='ON HOLD'?'bad':o.state==='DELIVERED'?'done':''}">${o.state}</span></td></tr>`).join('');
      if(this._ok!==ok){this._ok=ok;const h='<thead><tr><th>Order</th><th>Client site</th><th>Quantity</th><th>Tanker</th><th>Driver</th><th>ETA</th><th>Status</th></tr></thead><tbody>'+ok+'</tbody>';this.setAll('.x-orders',e=>e.innerHTML=h);}
      $('#kToday').textContent=(rows.filter(r=>r.state==='DELIVERED').reduce((a,r)=>a+r.qty,0)).toLocaleString('en-US')+' L';$('#kActive').textContent=S.order&&S.completed<7?'1':'0';
      if(T==='hardware'){
        document.querySelectorAll('#hwGrid .hw').forEach(b=>{const id=b.dataset.id,s=this.hwState(id),sEl=b.querySelector('.hw-s'),j=this.hwJob(id),r=this.hwRead(id);
          if(sEl.textContent!==s[0]){sEl.textContent=s[0];b.className='hw '+s[1];}
          const jEl=b.querySelector('.hw-j');if(jEl.textContent!==j)jEl.textContent=j;const rEl=b.querySelector('.hw-r');if(rEl.textContent!==r)rEl.textContent=r;});
        [...$('#matrix tbody').children].forEach((r,i)=>r.classList.toggle('now',i===S.stage&&S.running&&!S.scenario));
      }
      if(this.logDirty){this.logDirty=false;const html=this.log.length?this.log.map(l=>`<li class="${l.tone}"><time>${l.t}</time><span>${l.text}</span></li>`).join(''):'<li><span>No events yet.</span></li>';this.setAll('.x-audit',e=>e.innerHTML=html);}
      this.setAll('.x-fleet',c=>{if(c.offsetParent!==null)this.drawMap(c,true,st,done);});
      this.setAll('.x-chart',c=>{if(c.offsetParent!==null)this.drawChart(c,c.id==='dashChart');});
      this.setAll('.x-truckS',e=>e.textContent=hold?'ALARM':S.status);this.setAll('.x-truckV',e=>e.textContent=`${this.speed()} km/h · ${Math.round(S.tds)} ppm · hatch ${S.hatch>.05?'open':'sealed'}`);
    }
    if(this.pipKind==='dash'){
      this.drawChart($('#pipChart'),false);
      const act=PARTS.filter(p=>this.hwState(p.id)[1]);
      document.querySelectorAll('#pipDash .pd-chips span').forEach(s=>{s.className=this.hwState(s.dataset.id)[1];});
      const html=act.slice(0,3).map(p=>`<li><b>${p.n}. ${HW_SHORT[p.id]}</b> ${this.hwJob(p.id)}</li>`).join('');
      if(this._pdj!==html){this._pdj=html;$('#pipDash .pd-jobs').innerHTML=html;}
    }
  },
  /* live 3D view tile: copied right after the WebGL render */
  copyCam(){const c=$('#dashCam');if(!c||c.offsetParent===null)return;const g=c.getContext('2d'),s=renderer.domElement,ar=c.width/c.height,sw=Math.min(s.width,s.height*ar),sh=sw/ar;g.drawImage(s,(s.width-sw)/2,(s.height-sh)/2,sw,sh,0,0,c.width,c.height);},
  city:null,
  buildCity(){
    const K=8,W=260*K,H=130*K,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
    g.fillStyle='#F1EEE7';g.fillRect(0,0,W,H);
    // blocks and parks
    for(let i=0;i<46;i++){const x=rnd()*W,y=rnd()*H,w=60+rnd()*210,h=50+rnd()*150;g.fillStyle=i%7===0?'#D8EBC9':i%3===0?'#E9E5DB':'#ECE8DF';g.fillRect(x,y,w,h);}
    // street grid
    g.lineCap='round';
    const streets=(step,lw,col)=>{g.strokeStyle=col;g.lineWidth=lw;for(let x=step*.5;x<W;x+=step){const j=(rnd()-.5)*step*.35;g.beginPath();g.moveTo(x+j,0);g.bezierCurveTo(x+j+20,H*.33,x+j-20,H*.66,x+j+8,H);g.stroke();}for(let y=step*.5;y<H;y+=step){const j=(rnd()-.5)*step*.35;g.beginPath();g.moveTo(0,y+j);g.bezierCurveTo(W*.33,y+j-18,W*.66,y+j+18,W,y+j);g.stroke();}};
    streets(84,5,'#FFFFFF');streets(252,11,'#FFFFFF');streets(504,17,'#FBE9B7');
    const X=x=>(x+130)*K,Z=z=>(z+65)*K;
    // highway under the route
    g.strokeStyle='#FBE9B7';g.lineWidth=22;g.beginPath();SAMPLES.forEach((p,i)=>{if(i%3)return;i?g.lineTo(X(p.x),Z(p.z)):g.moveTo(X(p.x),Z(p.z));});g.stroke();
    // area names
    g.fillStyle='#8A8778';g.font='600 30px Saira,sans-serif';g.textAlign='center';[['Industrial Area',-78,-34],['North District',18,28],['Ring Road',20,-42],['Riyadh North',104,-30]].forEach(([t,x,z])=>g.fillText(t,X(x),Z(z)));
    this.city=c;this.cityK=K;
  },
  drawMap(c,admin,st,done){
    if(!this.city)this.buildCity();
    const r=c.getBoundingClientRect();if(!r.width)return;const dpr=Math.min(devicePixelRatio,2),W=Math.round(r.width*dpr),H=Math.round(r.height*dpr);if(c.width!==W||c.height!==H){c.width=W;c.height=H;}
    const g=c.getContext('2d'),w=W/dpr,h=H/dpr;g.setTransform(dpr,0,0,dpr,0,0);
    const tp=truck.position,fit=Math.min(w/250,h/110);
    let tx=-5,tz=6,tz0=fit;
    if(!admin){
      if(st===5||S.scenario){tx=tp.x;tz=tp.z+6;tz0=fit*2.5;}
      else if(st>=6){tx=FENCE_C.x-4;tz=FENCE_C.z;tz0=fit*3.2;}
    }
    let v=this.views.get(c);if(!v){v={x:tx,z:tz,k:tz0};this.views.set(c,v);}
    v.x=lerp(v.x,tx,.07);v.z=lerp(v.z,tz,.07);v.k=lerp(v.k,tz0,.05);
    const SX=x=>w/2+(x-v.x)*v.k,SY=z=>h*(admin?.5:.46)+(z-v.z)*v.k;
    g.fillStyle='#F1EEE7';g.fillRect(0,0,w,h);g.imageSmoothingEnabled=true;g.drawImage(this.city,SX(-130),SY(-65),260*v.k,130*v.k);
    const pts=SAMPLES.filter((p,i)=>i%3===0&&p.x>-104&&p.x<=FENCE_C.x);
    const path=(from,col,lw)=>{g.strokeStyle=col;g.lineWidth=lw;g.lineCap='round';g.lineJoin='round';g.beginPath();let on=false;pts.forEach(p=>{if(p.x<from)return;on?g.lineTo(SX(p.x),SY(p.z)):(g.moveTo(SX(p.x),SY(p.z)),on=true);});g.stroke();};
    const atStation=st<5&&!S.scenario&&S.order;const from=Math.max(tp.x,-60);
    if(S.order&&!done){path(from,'#FFFFFF',8);path(from,S.alarm?'#EF4444':'#0A24DA',4.5);}
    if(admin){g.beginPath();g.arc(SX(FENCE_C.x),SY(FENCE_C.z),FENCE_R*v.k,0,7);g.fillStyle=S.lockedOut?'rgba(239,68,68,.16)':'rgba(16,185,129,.16)';g.fill();g.strokeStyle=S.lockedOut?'#EF4444':'#10B981';g.lineWidth=2;g.setLineDash([6,4]);g.stroke();g.setLineDash([]);
      g.font='600 11px Saira,sans-serif';g.fillStyle='#0b1240';g.textAlign='center';g.fillText('Client geofence',SX(FENCE_C.x),SY(FENCE_C.z-FENCE_R)-6);g.fillText('M Arabia gantry',SX(GX),SY(-16));
      [[-82,14,'KSA 1907 RSA'],[-82,20,'KSA 3360 RSA']].forEach(([x,z,t])=>{g.fillStyle='#7a81a6';g.beginPath();g.arc(SX(x),SY(z),4,0,7);g.fill();});
    }
    if(admin&&S.ghost){const gx=SX(S.ghost.x),gy=SY(S.ghost.z);g.fillStyle='#B45F06';g.beginPath();g.arc(gx,gy,6,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=2;g.stroke();g.font='600 11px Saira,sans-serif';g.fillStyle='#0b1240';g.textAlign='center';g.fillText('Real KSA 4821 RSA',gx,gy-11);}
    // origin
    g.fillStyle='#0b1240';g.beginPath();g.arc(SX(GX),SY(0),5,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(SX(GX),SY(0),2,0,7);g.fill();
    // destination pin
    const dx=SX(FENCE_C.x),dy=SY(FENCE_C.z);g.fillStyle='#EF4444';g.beginPath();g.arc(dx,dy-16,10,PI,0);g.quadraticCurveTo(dx+10,dy-8,dx,dy);g.quadraticCurveTo(dx-10,dy-8,dx-10,dy-16);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(dx,dy-16,4,0,7);g.fill();
    // tanker marker
    const px=SX(tp.x),py=SY(tp.z),pu=(performance.now()*.0009)%1,col=S.alarm?'#EF4444':'#0A24DA';
    g.beginPath();g.arc(px,py,14+pu*22,0,7);g.strokeStyle=col;g.globalAlpha=(1-pu)*.7;g.lineWidth=2;g.stroke();g.globalAlpha=1;
    g.save();g.translate(px,py);g.rotate(-truck.rotation.y);g.shadowColor='rgba(0,0,30,.4)';g.shadowBlur=6;g.shadowOffsetY=2;
    g.fillStyle='#fff';const rr=(x,y,a,b,q)=>{g.beginPath();g.moveTo(x+q,y);g.arcTo(x+a,y,x+a,y+b,q);g.arcTo(x+a,y+b,x,y+b,q);g.arcTo(x,y+b,x,y,q);g.arcTo(x,y,x+a,y,q);g.fill();};
    rr(-15,-7,23,14,6);g.shadowBlur=0;g.shadowOffsetY=0;g.fillStyle=col;rr(9,-6.5,8,13,2.5);g.fillStyle='#BFD4FF';g.fillRect(14,-5,1.8,10);g.fillStyle=col;g.fillRect(-11,-1,15,2);g.restore();
    // ETA bubble
    if(!admin&&S.order&&st===5&&!S.alarm){const t=Math.max(1,Math.round(CUM[6]-this.mins()))+' min';g.font='700 12px Saira,sans-serif';const bw=g.measureText(t).width+14;g.fillStyle='#0b1240';g.beginPath();g.moveTo(px-bw/2+6,py-32);g.arcTo(px+bw/2,py-32,px+bw/2,py-14,6);g.arcTo(px+bw/2,py-14,px-bw/2,py-14,6);g.arcTo(px-bw/2,py-14,px-bw/2,py-32,6);g.arcTo(px-bw/2,py-32,px+bw/2,py-32,6);g.fill();g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.fillText(t,px,py-23);g.textBaseline='alphabetic';}
    if(admin){g.font='600 11px IBM Plex Mono,monospace';g.fillStyle='#0b1240';g.textAlign='center';g.fillText('KSA 4821 RSA',px,py-16);}
  },
  drawChart(c,withHover){
    const r=c.getBoundingClientRect();if(!r.width)return;const dpr=Math.min(devicePixelRatio,2),W=Math.round(r.width*dpr),H=Math.round(r.height*dpr);if(c.width!==W||c.height!==H){c.width=W;c.height=H;}
    const dark=c.id==='pipChart',ink=dark?'rgba(255,255,255,.66)':'#5b638f',gridC=dark?'rgba(255,255,255,.1)':'#e3e6f2';
    const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);const w=r.width,h=r.height,L=38,Rr=10,T=8,B=20;g.clearRect(0,0,w,h);
    const top=Math.max(S.qty,5000),X=m=>L+m/CUM[8]*(w-L-Rr),Y=v=>h-B-(v/top)*(h-T-B);
    g.font='500 10.5px IBM Plex Mono,monospace';g.textBaseline='middle';
    for(let i=0;i<=3;i++){const v=top*i/3,y=Y(v);g.strokeStyle=gridC;g.lineWidth=1;g.beginPath();g.moveTo(L,y);g.lineTo(w-Rr,y);g.stroke();g.fillStyle=ink;g.textAlign='right';g.fillText((v/1000).toFixed(v%1000?1:0)+'k',L-6,y);}
    g.textAlign='left';[[CUM[1],'Gate'],[CUM[3],'Fill'],[CUM[5],'Transit'],[CUM[6],'Deliver']].forEach(([m,t])=>{g.fillStyle=ink;g.fillText(t,X(m),h-8);});
    const H0=this.hist;if(H0.length<2)return;
    const col=dark?{tank:'#9fb0ff',loaded:'#F5B83D',delivered:'#2DD4BF'}:SERIES;
    const line=(k,cl,dash)=>{g.strokeStyle=cl;g.lineWidth=2;g.lineJoin='round';g.setLineDash(dash||[]);g.beginPath();H0.forEach((p,i)=>i?g.lineTo(X(p.m),Y(p[k])):g.moveTo(X(p.m),Y(p[k])));g.stroke();g.setLineDash([]);};
    line('t',col.tank);line('d',col.delivered);line('l',col.loaded,[6,4]);
    if(withHover&&this.hover!=null){
      const m=clamp((this.hover*w-L)/(w-L-Rr))*CUM[8];let best=H0[0];for(const p of H0)if(Math.abs(p.m-m)<Math.abs(best.m-m))best=p;
      const x=X(best.m);g.strokeStyle='#8a90b5';g.lineWidth=1;g.beginPath();g.moveTo(x,T);g.lineTo(x,h-B);g.stroke();
      [['t',col.tank],['d',col.delivered],['l',col.loaded]].forEach(([k,cl])=>{g.beginPath();g.arc(x,Y(best[k]),4,0,7);g.fillStyle=cl;g.fill();g.strokeStyle='#fff';g.lineWidth=2;g.stroke();});
      const tip=$('#chartTip');tip.style.opacity=1;tip.style.left=Math.min(x+10,w-150)+'px';tip.innerHTML=`<b>${this.clock(best.m)}</b><br>Loaded ${fmtL(best.l)}<br>In tanker ${fmtL(best.t)}<br>Delivered ${fmtL(best.d)}`;
    }
  }
};
