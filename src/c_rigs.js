/* ================= GANTRY ================= */
const GX=-60, BEAM_Y=7.9, PIPE_Y=8.65, PIPE_R=.2, Z_ELBOW=9.2, Z_METER=5.2, Z_VALVE=3.2, Z_L=8, Z_R=-14;
const G={};
const gantry=new THREE.Group();scene.add(gantry);
{
  // A-frame legs + truss
  for(const z of [Z_L,Z_R]){
    strut([GX-3.4,0,z],[GX-1.2,9.4,z],.2,MAT.steel,gantry);strut([GX+3.4,0,z],[GX+1.2,9.4,z],.2,MAT.steel,gantry);
    strut([GX-2.65,3.2,z],[GX+2.65,3.2,z],.11,MAT.steelD,gantry);strut([GX-1.6,BEAM_Y-.2,z],[GX+1.6,BEAM_Y-.2,z],.11,MAT.steelD,gantry);
    strut([GX-2.65,3.2,z],[GX+1.6,BEAM_Y-.2,z],.07,MAT.steelD,gantry);strut([GX+2.65,3.2,z],[GX-1.6,BEAM_Y-.2,z],.07,MAT.steelD,gantry);
    box(8,.3,1,MAT.conc,gantry,GX,.15,z);
  }
  for(const sx of[-1.2,1.2]){
    for(const y of[BEAM_Y,9.4])strut([GX+sx,y,Z_L+.5],[GX+sx,y,Z_R-.5],.11,MAT.steel,gantry);
    for(let z=Z_R,i=0;z<Z_L;z+=2,i++){strut([GX+sx,BEAM_Y,z],[GX+sx,9.4,z],.045,MAT.steelD,gantry);strut([GX+sx,i%2?BEAM_Y:9.4,z],[GX+sx,i%2?9.4:BEAM_Y,z+2],.045,MAT.steelD,gantry);}
  }
  for(let z=Z_R;z<=Z_L;z+=4)strut([GX-1.2,9.4,z],[GX+1.2,9.4,z],.05,MAT.steelD,gantry);
  // crown signage, both faces
  const lt=lockupTex(800,160);
  const frame=box(.16,1.75,8.7,MAT.dark,gantry,GX,10.3,-5.6);
  for(const d of[-1,1]){const m=new THREE.Mesh(new THREE.PlaneGeometry(8.5,1.7),basic(lt));m.rotation.y=d*PI/2;m.position.set(GX+d*.1,10.3,-5.6);gantry.add(m);}

  // water line: reservoir -> pump -> 30D run -> riser -> header
  const P=(a,b,mat=MAT.pipe,r=PIPE_R)=>strut(a,b,r,mat,gantry,true);
  P([GX,1,27.5],[GX,1,23.2]);                       // reservoir feed
  G.pump=new THREE.Group();G.pump.position.set(GX,0,22);gantry.add(G.pump);
  box(2.2,.3,3.2,MAT.conc,G.pump,0,.15,0);
  const pv=add(new THREE.CylinderGeometry(.55,.55,1.1,20),MAT.blue,G.pump,0,1,0);pv.rotation.x=PI/2;
  const motor=add(new THREE.CylinderGeometry(.42,.42,1.3,18),M(0x2a2d38,{metalness:.4}),G.pump,1,.9,0);motor.rotation.z=PI/2;
  P([GX,1,21],[GX,1,Z_ELBOW+.1]);                   // 30D straight from pump
  P([GX,.95,Z_ELBOW],[GX,PIPE_Y+.02,Z_ELBOW]);      // riser
  add(new THREE.SphereGeometry(PIPE_R*1.02,14,10),MAT.pipe,gantry,GX,PIPE_Y,Z_ELBOW);
  add(new THREE.SphereGeometry(PIPE_R*1.02,14,10),MAT.pipe,gantry,GX,1,Z_ELBOW);
  P([GX,PIPE_Y,Z_ELBOW],[GX,PIPE_Y,-8]);            // header across both lanes
  add(new THREE.SphereGeometry(PIPE_R*1.02,14,10),MAT.pipe,gantry,GX,PIPE_Y,-8);
  for(const z of[7.6,-1.8,-6]){strut([GX-.3,BEAM_Y+.05,z],[GX-.3,PIPE_Y,z],.03,MAT.dark,gantry);strut([GX+.3,BEAM_Y+.05,z],[GX+.3,PIPE_Y,z],.03,MAT.dark,gantry);}
  for(const z of[7.6,-1.8,-6])strut([GX-1.2,BEAM_Y,z],[GX+1.2,BEAM_Y,z],.05,MAT.steelD,gantry);
  P([GX,PIPE_Y,0],[GX,BEAM_Y-.1,0]);                // drop to lane 1 chute
  P([GX,PIPE_Y,-8],[GX,BEAM_Y-.1,-8]);              // lane 2 spur
  const parked=add(new THREE.CylinderGeometry(.42,.5,1.1,16,1,false),M(COL.green,{roughness:.8}),gantry,GX,BEAM_Y-.65,-8);
  cyl(.5,.1,MAT.dark,gantry,GX,BEAM_Y-1.2,-8,16);

  // Butterfly valve
  G.valve=new THREE.Group();G.valve.position.set(GX,PIPE_Y,Z_VALVE);gantry.add(G.valve);
  const fl=(z)=>{const f=add(new THREE.CylinderGeometry(.34,.34,.08,20),MAT.steelD,G.valve,0,0,z);f.rotation.x=PI/2;return f;};
  fl(-.17);fl(.17);
  const vb=add(new THREE.CylinderGeometry(.3,.3,.28,20),MAT.dark,G.valve,0,0,0);vb.rotation.x=PI/2;
  box(.16,.5,.16,MAT.steelD,G.valve,0,.42,0);box(.52,.42,.52,M(0x2a48e8,{roughness:.4}),G.valve,0,.84,0);
  G.valveIndicator=new THREE.Group();G.valveIndicator.position.set(0,1.1,0);G.valve.add(G.valveIndicator);
  cyl(.2,.05,MAT.yellow,G.valveIndicator,0,0,0,18);box(.34,.06,.07,MAT.dark,G.valveIndicator,0,.03,0);
  G.valveRingMat=new THREE.MeshBasicMaterial({color:COL.red,toneMapped:false});
  G.valveRing=new THREE.Mesh(new THREE.TorusGeometry(.42,.035,10,40),G.valveRingMat);G.valve.add(G.valveRing);
  G.valveGlow=glow(COL.red,2.4,G.valve,0,0,0,.65);

  // TUF-2000B clamp-on section
  G.meter=new THREE.Group();G.meter.position.set(GX,PIPE_Y,Z_METER);gantry.add(G.meter);
  G.straps=[];G.xdcr=[];
  for(const dz of[-.55,.55]){
    const s=add(new THREE.TorusGeometry(PIPE_R+.012,.016,8,30),MAT.dark,G.meter,0,0,dz);G.straps.push(s);
    const t=new THREE.Group();t.position.set(0,PIPE_R+.09,dz);G.meter.add(t);
    box(.2,.17,.36,M(0x1e50ff,{roughness:.3}),t,0,0,0);box(.21,.018,.3,M(0xd8d9de),t,0,-.09,0,false);G.xdcr.push(t);
  }
  const cage=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(.92,.92,2)),new THREE.LineBasicMaterial({color:0xfcd34d}));G.meter.add(cage);G.cage=cage;
  for(let i=-2;i<=2;i++)for(const [sy,sx] of[[1,1],[1,-1],[-1,1],[-1,-1]])strut([sx*.46,sy*.46,i*.5-.0],[sx*.46,sy*.46,i*.5+.02],.012,MAT.yellow,G.meter);
  for(let i=-2;i<=2;i++){strut([-.46,.46,i*.5],[.46,.46,i*.5],.012,MAT.yellow,G.meter);strut([-.46,-.46,i*.5],[.46,-.46,i*.5],.012,MAT.yellow,G.meter);strut([.46,-.46,i*.5],[.46,.46,i*.5],.012,MAT.yellow,G.meter);strut([-.46,-.46,i*.5],[-.46,.46,i*.5],.012,MAT.yellow,G.meter);}
  box(.18,.2,.1,MAT.yellow,G.meter,.46,-.2,1.02);

  // 10D / 5D annotations
  const mark=(z0,z1,txt)=>{strut([GX+.62,PIPE_Y+.62,z0],[GX+.62,PIPE_Y+.62,z1],.012,MAT.white,gantry);for(const z of[z0,z1])strut([GX+.62,PIPE_Y+.5,z],[GX+.62,PIPE_Y+.74,z],.012,MAT.white,gantry);const s=textSprite(txt,.34);s.position.set(GX+.62,PIPE_Y+.86,(z0+z1)/2);gantry.add(s);return s;};
  G.notes=[mark(Z_METER+.5,Z_ELBOW,'10D straight'),mark(Z_METER-.5,Z_VALVE+.2,'5D')];

  // chute
  G.chute=new THREE.Group();G.chute.position.set(GX,BEAM_Y-.1,0);gantry.add(G.chute);
  const cg=new THREE.CylinderGeometry(.42,.52,1,18,14,true);cg.translate(0,-.5,0);
  {const p=cg.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),k=1+.05*Math.sin(y*PI*16);p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k);}cg.computeVertexNormals();}
  G.fabric=new THREE.Mesh(cg,new THREE.MeshStandardMaterial({color:0x18b878,roughness:.85,transparent:true,opacity:.66,side:THREE.DoubleSide,depthWrite:false}));G.fabric.castShadow=true;G.fabric.renderOrder=4;G.chute.add(G.fabric);
  G.rings=[];for(let i=0;i<6;i++){const t=add(new THREE.TorusGeometry(.46+i*.012,.022,6,24),M(0x0a7a52,{roughness:.6}),G.chute);t.rotation.x=PI/2;G.rings.push(t);}
  G.collar=cyl(.56,.14,MAT.dark,G.chute,0,-1,0,20);
  G.collarLedMat=emissive(COL.red,3);G.collarLed=add(new THREE.SphereGeometry(.07,10,8),G.collarLedMat,G.chute,.58,-1,0,false);
  G.setChute=len=>{G.chuteLen=len;G.fabric.scale.y=len;G.collar.position.y=-len;G.collarLed.position.y=-len;G.rings.forEach((r,i)=>r.position.y=-len*(i/(G.rings.length-1))*.96);};
  G.setChute(1.1);

  // instrument mast: HMI + TUF-2000B converter + PLC
  const MX=GX+3.0,MZ=Z_L;
  box(.34,7.4,.34,MAT.steel,gantry,MX,3.7,MZ);strut([MX,6.9,MZ],[GX+1.3,7.6,MZ],.06,MAT.steelD,gantry);box(1,.2,1,MAT.conc,gantry,MX,.1,MZ);
  // HMI
  G.hmiTex=canvasTex(512,360,()=>{});
  box(.12,1.62,2.3,MAT.dark,gantry,MX+.24,3.2,MZ);
  G.hmi=new THREE.Mesh(new THREE.PlaneGeometry(2.14,1.5),basic(G.hmiTex));G.hmi.rotation.y=PI/2;G.hmi.position.set(MX+.31,3.2,MZ);gantry.add(G.hmi);
  // converter
  G.lcdTex=canvasTex(420,300,()=>{});
  box(.26,1.34,1.1,M(0x123fd8,{roughness:.32}),gantry,MX+.3,5.5,MZ);
  G.lcd=new THREE.Mesh(new THREE.PlaneGeometry(.94,.68),basic(G.lcdTex));G.lcd.rotation.y=PI/2;G.lcd.position.set(MX+.44,5.73,MZ);gantry.add(G.lcd);
  for(let r=0;r<3;r++)for(let c=0;c<5;c++)box(.02,.07,.11,MAT.white,gantry,MX+.44,5.3-r*.12,MZ-.29+c*.145,false);
  // PLC cabinet
  G.plc=new THREE.Group();G.plc.position.set(MX,0,MZ+2.4);gantry.add(G.plc);
  box(1.2,.2,.8,MAT.conc,G.plc,0,.1,0);box(1.05,2.1,.62,M(0xd6dae3,{metalness:.25,roughness:.45}),G.plc,0,1.25,0);
  box(.02,1.9,.56,M(0xc4c9d4),G.plc,.53,1.25,0,false);
  G.plcLeds=[];for(let i=0;i<4;i++){const m=emissive(i==0?COL.green:0x223355,2);G.plcLeds.push(m);add(new THREE.SphereGeometry(.035,8,6),m,G.plc,.55,1.95,-.15+i*.1,false);}
  strut([.2,2.3,0],[.2,3.3,0],.015,MAT.dark,G.plc,true);
  const pb=new THREE.Mesh(new THREE.PlaneGeometry(.4,.2),basic(canvasTex(128,64,(g,w,h)=>{g.fillStyle='#0A24DA';g.fillRect(0,0,w,h);g.fillStyle='#fff';g.font='700 34px Saira';g.textAlign='center';g.textBaseline='middle';g.fillText('PLC',w/2,h/2);})));pb.rotation.y=PI/2;pb.position.set(.55,1.55,0);G.plc.add(pb);

  // cable tray to transducers
  const curveLine=(pts)=>new THREE.CatmullRomCurve3(pts.map(p=>new V3(...p)));
  G.wires={};
  const wire=(name,pts,color=0x1a1d26,r=.022)=>{const c=curveLine(pts);G.wires[name]=c;const m=new THREE.Mesh(new THREE.TubeGeometry(c,64,r,6,false),M(color,{roughness:.8}));gantry.add(m);return m;};
  wire('meter',[[GX,PIPE_Y+.26,Z_METER],[GX+.2,PIPE_Y+.6,Z_METER+.9],[GX+1.4,PIPE_Y-.3,Z_L-.4],[MX+.1,6.8,MZ],[MX+.3,6.2,MZ]],0x111533);
  wire('box',[[MX+.3,4.9,MZ+.2],[MX+.25,2.6,MZ+.5],[MX+.3,2.5,MZ+1.8],[MX+.1,2.2,MZ+2.4]]);
  wire('valve',[[GX,PIPE_Y+1,Z_VALVE],[GX+.8,PIPE_Y+.5,Z_VALVE+2],[GX+1.4,PIPE_Y-.5,Z_L-.5],[MX-.1,7,MZ+.1],[MX-.2,3,MZ+.6],[MX,2.2,MZ+2.2]]);
  wire('anpr',[[-66,.15,-5.2],[-66,.1,6],[-60,.1,10.5],[MX-.4,.1,MZ+2.4],[MX,.7,MZ+2.4]]);
  wire('rfid',[[-71,.15,6.4],[-68,.1,10.5],[-60,.1,11],[MX-.4,.12,MZ+2.2],[MX,.7,MZ+2.3]]);
  wire('hatch',[[GX,BEAM_Y-1,0],[GX+.6,BEAM_Y-.2,.4],[GX+1.2,BEAM_Y+.1,4],[GX+1.6,BEAM_Y-.2,Z_L-.6],[MX-.2,3.4,MZ+.5],[MX,2.3,MZ+2.2]],0x444a55,.016);

  // entry gate barrier
  G.gate=new THREE.Group();G.gate.position.set(-71,1.25,4.6);gantry.add(G.gate);
  box(.7,1.4,.7,MAT.yellow,gantry,-71,.7,4.6);
  G.boom=new THREE.Group();G.gate.add(G.boom);
  const seg=9;for(let i=0;i<seg;i++)box(.12,.16,1,i%2?MAT.red:MAT.white,G.boom,0,0,-.5-i);
  G.gateLight=emissive(COL.red,1.4);add(new THREE.SphereGeometry(.14,10,8),G.gateLight,gantry,-71,1.55,4.6,false);

  // ANPR camera
  strut([-66,0,-5.2],[-66,5.6,-5.2],.1,MAT.steelD,gantry,true);strut([-66,5.5,-5.2],[-66,5.5,-3.2],.05,MAT.steelD,gantry);
  G.anpr=new THREE.Group();G.anpr.position.set(-66,5.34,-3.2);gantry.add(G.anpr);
  box(.8,.32,.32,MAT.white,G.anpr,0,0,0);const lens=add(new THREE.CylinderGeometry(.12,.14,.1,14),MAT.dark,G.anpr,-.44,0,0);lens.rotation.z=PI/2;
  G.anprIr=glow(0xffffff,.5,G.anpr,-.5,0,0,.0);
  box(.3,.03,.42,MAT.white,G.anpr,-.1,.18,0);
  G.anpr.rotation.z=-.42;G.anpr.rotation.y=-.3;
  // scan beam
  G.beamMat=new THREE.MeshBasicMaterial({color:COL.green,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  G.beam=new THREE.Mesh(new THREE.ConeGeometry(1,1,20,1,true),G.beamMat);gantry.add(G.beam);

  // RFID reader
  strut([-71,0,6.4],[-71,3.4,6.4],.08,MAT.steelD,gantry,true);
  G.rfid=box(1.05,1.05,.14,MAT.white,gantry,-71,3.1,6);G.rfid.rotation.x=.32;
  const rf=new THREE.Mesh(new THREE.PlaneGeometry(.95,.95),basic(canvasTex(192,192,(g,w,h)=>{g.fillStyle='#0A24DA';g.fillRect(0,0,w,h);g.strokeStyle='#fff';g.lineWidth=7;for(const r of[24,46,68]){g.beginPath();g.arc(w/2,86,r,-2.5,-.64);g.stroke();}g.fillStyle='#fff';g.beginPath();g.arc(w/2,86,9,0,7);g.fill();g.font='700 30px Saira,sans-serif';g.textAlign='center';g.fillText('UHF RFID',w/2,150);})));rf.rotation.y=PI;rf.position.z=-.08;G.rfid.add(rf);
  G.rfidLedMat=emissive(0x2a48e8,2.5);add(new THREE.SphereGeometry(.07,8,6),G.rfidLedMat,G.rfid,.38,-.38,-.1,false);
  // beacons on crown
  G.beaconMat=emissive(0x551010,.6);for(const z of[Z_L,Z_R])add(new THREE.SphereGeometry(.2,12,8),G.beaconMat,gantry,GX,9.7,z,false);
}

/* ================= TRUCK ================= */
const TR={R:1.35,CY:2.6,X0:-6,X1:2.2};
const truck=new THREE.Group();scene.add(truck);
{
  const T=truck,R=TR.R,CY=TR.CY;
  box(11.6,.34,1.3,MAT.dark,T,-.4,1.02,0);
  // wheels
  TR.wheels=[];
  const wg=new THREE.CylinderGeometry(.56,.56,.46,22);wg.rotateX(PI/2);
  const rg=new THREE.CylinderGeometry(.3,.3,.48,14);rg.rotateX(PI/2);
  const hub=M(0xd5d9e0,{metalness:.8,roughness:.3});
  for(const x of[4.25,-3,-4.25,-5.5])for(const z of[1,-1]){const w=add(wg,MAT.rubber,T,x,.56,z*1.04);add(rg,hub,w);box(.56,.09,.5,MAT.steelD,w,0,0,0,false);TR.wheels.push(w);}
  // mudguards / skirts
  for(const z of[1,-1]){box(4.4,.14,.62,MAT.dark,T,-4.25,1.26,z*1.04);box(1.5,.12,.56,MAT.white,T,4.25,1.3,z*1.04);box(2.6,.56,.04,MAT.blue,T,-.6,.82,z*1.07);}
  // cab-over shell
  const sh=new THREE.Shape();[[2.85,1.05],[5.5,1.05],[5.72,1.5],[5.68,2.4],[5.3,3.72],[4.95,4.0],[2.85,4.0]].forEach((p,i)=>i?sh.lineTo(p[0],p[1]):sh.moveTo(p[0],p[1]));
  const eg=new THREE.ExtrudeGeometry(sh,{depth:2.3,bevelEnabled:true,bevelSize:.05,bevelThickness:.05,bevelSegments:2});eg.translate(0,0,-1.15);
  add(eg,MAT.white,T);
  const ws=box(.04,1.25,2.08,MAT.glassD,T,5.56,3.04,0,false);ws.rotation.z=.29;TR.cabHide=[ws];
  for(const z of[1.21,-1.21]){TR.cabHide.push(box(1.35,.92,.02,MAT.glassD,T,4.55,3.1,z,false));box(1.8,.22,.02,MAT.blue,T,3.95,1.9,z,false);}
  box(.04,.62,1.7,MAT.dark,T,5.73,1.86,0,false);for(let i=0;i<4;i++)box(.05,.05,1.6,MAT.chrome,T,5.75,1.62+i*.14,0,false);
  box(.3,.32,2.42,MAT.grey,T,5.72,1.2,0);
  TR.headMat=emissive(0xfff3d0,1.6);for(const z of[.9,-.9])add(new THREE.BoxGeometry(.05,.2,.42),TR.headMat,T,5.76,1.45,z,false);
  for(const z of[1.3,-1.3]){strut([5.1,3.4,z*.92],[5.1,3.4,z],.02,MAT.dark,T);box(.08,.5,.2,MAT.dark,T,5.1,3.25,z*1.04,false);}
  box(1.8,.42,2.1,MAT.blue,T,3.7,4.2,0);        // roof fairing
  cyl(.09,2.6,MAT.chrome,T,2.72,3.1,1.02,10);    // exhaust
  // door logo
  const dl=lockupTex(320,96);
  for(const z of[1.215,-1.215]){const m=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.45),basic(dl));m.position.set(3.72,2.46,z);if(z<0)m.rotation.y=PI;T.add(m);(TR.doorLogos=TR.doorLogos||[]).push(m);}
  // plate
  TR.plateTex=canvasTex(256,64,()=>{});
  TR.plate=new THREE.Mesh(new THREE.PlaneGeometry(1.15,.29),basic(TR.plateTex));TR.plate.rotation.y=PI/2;TR.plate.position.set(5.885,1.2,0);T.add(TR.plate);
  TR.plateGlow=glow(COL.green,2,T,5.92,1.2,0,0);
  TR.setPlate=(txt,bad)=>{const g=TR.plateTex.userData.g;g.fillStyle='#fff';g.fillRect(0,0,256,64);g.strokeStyle='#111';g.lineWidth=4;g.strokeRect(2,2,252,60);g.fillStyle=bad?'#b91c1c':'#101010';g.font='700 34px IBM Plex Mono,monospace';g.textAlign='center';g.textBaseline='middle';g.fillText(txt,128,34);TR.plateTex.needsUpdate=true;};
  // tank: white/blue with cut-away windows
  const WIN0=-5.0,WIN1=.6,sec=(x0,x1,start,len,mat,r=R)=>{const g=new THREE.CylinderGeometry(r,r,x1-x0,40,1,true,start*DEG,len*DEG);g.rotateZ(-PI/2);g.translate((x0+x1)/2,CY,0);const m=new THREE.Mesh(g,mat);m.castShadow=true;m.receiveShadow=true;T.add(m);return m;};
  const shellW=M(0xfbfcff,{roughness:.28,metalness:.08,side:THREE.DoubleSide}),shellB=M(COL.blue,{roughness:.3,side:THREE.DoubleSide});TR.shellB=shellB;TR.brand=[];
  sec(TR.X0,WIN0,0,360,shellW);sec(WIN1,TR.X1,0,360,shellW);
  sec(WIN0,WIN1,215,110,shellW);sec(WIN0,WIN1,35,110,shellB);
  for(const x of[TR.X0,TR.X1]){const c=new THREE.SphereGeometry(R,28,14);c.scale(.28,1,1);add(c,x<0?shellW:shellW,T,x,CY,0);}
  for(const x of[TR.X0+.35,TR.X1-.35]){sec(x-.12,x+.12,0,360,shellB,R+.012);}
  for(const x of[WIN0,WIN1]){const t=add(new THREE.TorusGeometry(R+.02,.05,8,44),MAT.grey,T,x,CY,0);t.rotation.y=PI/2;}
  for(const x of[-3.6,-2.2,-.8]){for(const[s,l]of[[215,110],[35,110]]){sec(x-.03,x+.03,s,l,MAT.steelD,R+.012);}}
  // window frames
  for(const z of[1,-1])for(const a of[35,-35]){const y=CY+R*Math.sin(a*DEG),zz=z*R*Math.cos(a*DEG);box(WIN1-WIN0,.06,.06,MAT.grey,T,(WIN0+WIN1)/2,y,zz,false);}
  TR.glassMat=new THREE.MeshStandardMaterial({color:0xd4ebff,transparent:true,opacity:.17,roughness:.05,metalness:.2,depthWrite:false,side:THREE.DoubleSide});
  [sec(WIN0,WIN1,-35,70,TR.glassMat),sec(WIN0,WIN1,145,70,TR.glassMat)].forEach(g=>{g.renderOrder=3;g.castShadow=false;});
  // level ticks on the window
  for(const z of[1,-1])for(let i=0;i<=4;i++){const a=-35+i*17.5,y=CY+(R+.01)*Math.sin(a*DEG),zz=z*(R+.01)*Math.cos(a*DEG);box(.34,.022,.022,MAT.dark,T,WIN1-.22,y,zz,false);}
  // water
  TR.clip=new THREE.Plane(new V3(0,-1,0),0);
  TR.waterMat=new THREE.MeshStandardMaterial({color:0x1879ff,emissive:0x0a3cff,emissiveIntensity:.28,roughness:.18,metalness:.05,transparent:true,opacity:.82,side:THREE.DoubleSide,clippingPlanes:[TR.clip]});
  const wgeo=new THREE.CylinderGeometry(R-.04,R-.04,TR.X1-TR.X0-.1,36);wgeo.rotateZ(PI/2);
  TR.water=new THREE.Mesh(wgeo,TR.waterMat);TR.water.position.set((TR.X0+TR.X1)/2,CY,0);TR.water.renderOrder=1;T.add(TR.water);
  TR.surfaceMat=new THREE.MeshStandardMaterial({color:0x62b6ff,emissive:0x1d6bff,emissiveIntensity:.4,roughness:.12,transparent:true,opacity:.9,side:THREE.DoubleSide});
  TR.surfaceG=new THREE.Group();TR.surfaceG.position.set((TR.X0+TR.X1)/2,CY,0);T.add(TR.surfaceG);
  TR.surface=new THREE.Mesh(new THREE.PlaneGeometry(TR.X1-TR.X0-.1,1),TR.surfaceMat);TR.surface.rotation.x=-PI/2;TR.surface.renderOrder=2;TR.surfaceG.add(TR.surface);
  // internal level + TDS probe
  cyl(.03,2.4,MAT.chrome,T,-3.2,CY+.15,0,8);TR.probeMat=emissive(0x35e0ff,2);add(new THREE.SphereGeometry(.07,10,8),TR.probeMat,T,-3.2,CY-1.06,0,false);
  cyl(.1,.14,MAT.dark,T,-3.2,CY+R+.05,0,10);
  // saddles
  for(const x of[-5,-1.9,1.2]){box(.2,.32,1.9,MAT.dark,T,x,1.3,0);}
  // manhole, lid, reed switch
  const HX=-1.5,HY=CY+R;
  cyl(.42,.25,MAT.steelD,T,HX,HY+.12,0,22);
  TR.hatchHinge=new THREE.Group();TR.hatchHinge.position.set(HX-.45,HY+.27,0);T.add(TR.hatchHinge);
  cyl(.46,.06,MAT.white,TR.hatchHinge,.45,.03,0,22);
  TR.reedMat=emissive(COL.green,3);box(.12,.1,.14,MAT.dark,T,HX,HY+.2,.48,false);add(new THREE.SphereGeometry(.05,8,6),TR.reedMat,T,HX,HY+.28,.48,false);
  // top rail
  for(const z of[.72,-.72]){strut([-5,HY-.1,z],[-5,HY+.55,z],.018,MAT.chrome,T,true);strut([1,HY-.1,z],[1,HY+.55,z],.018,MAT.chrome,T,true);strut([-3,HY-.1,z],[-3,HY+.55,z],.018,MAT.chrome,T,true);strut([-5,HY+.55,z],[1,HY+.55,z],.018,MAT.chrome,T,true);}
  // ladder
  for(let i=0;i<7;i++)strut([-6.42,.9+i*.42,-.28],[-6.42,.9+i*.42,.28],.012,MAT.chrome,T,true);for(const z of[-.28,.28])strut([-6.42,.8,z],[-6.1,3.6,z],.018,MAT.chrome,T,true);
  // logos on upper shell, both sides
  const tl=lockupTex(800,160,'#0A24DA');
  for(const z of[1,-1]){const m=new THREE.Mesh(new THREE.PlaneGeometry(3.7,.74),basic(tl));const a=52*DEG;m.position.set(-2.2,CY+(R+.045)*Math.sin(a),z*(R+.045)*Math.cos(a));m.rotation.order='YXZ';m.rotation.y=z>0?0:PI;m.rotation.x=-a*.98;T.add(m);TR.brand.push(m);}
  // RFID tag
  TR.tagMat=emissive(0x2f6bff,2);box(.34,.16,.04,TR.tagMat,T,2.2,1.05,.68,false);box(.34,.16,.04,TR.tagMat,T,2.2,1.05,-.68,false);
  // rear outlet + discharge meter
  strut([-5.6,1.28,0],[-6.65,1.28,0],.11,MAT.pipe,T,true);
  box(.5,.48,.5,M(0x123fd8),T,-6.2,1.28,0);
  TR.outletMat=emissive(COL.red,3);add(new THREE.SphereGeometry(.07,8,6),TR.outletMat,T,-6.2,1.58,.2,false);
  // tail lamps + beacon + GPS dome
  for(const z of[.9,-.9])add(new THREE.BoxGeometry(.05,.14,.34),emissive(COL.red,1.4),T,-6.1,.98,z,false);
  const gd=new THREE.SphereGeometry(.22,14,8,0,PI*2,0,PI/2);add(gd,MAT.white,T,4.2,4.41,.1);
  TR.gpsGlow=glow(0x60a5fa,.8,T,4.2,4.6,.1,.0);
  TR.beaconMat=emissive(0x551010,.5);add(new THREE.SphereGeometry(.13,10,8),TR.beaconMat,T,3,4.48,0,false);
  TR.beaconGlow=glow(COL.red,2.4,T,3,4.5,0,0);
}

TR.setClone=on=>{TR.shellB.color.setHex(on?0x5b616b:COL.blue);TR.brand.concat(TR.doorLogos).forEach(m=>m.visible=!on);};
/* hose for delivery */
const hoseCurve=new THREE.QuadraticBezierCurve3(new V3(),new V3(),new V3());
const hose=new THREE.Mesh(new THREE.BufferGeometry(),M(0x0f172a,{roughness:.8}));hose.castShadow=true;hose.visible=false;scene.add(hose);
function buildHose(a,b){hoseCurve.v0.copy(a);hoseCurve.v2.copy(b);hoseCurve.v1.set((a.x+b.x)/2,.1,(a.z+b.z)/2);hose.geometry.dispose();hose.geometry=new THREE.TubeGeometry(hoseCurve,24,.085,8,false);hose.visible=true;}

/* ================= PARTICLES / FX ================= */
function pointsSys(n,color,size,opts={}){
  const g=new THREE.BufferGeometry(),p=new Float32Array(n*3);g.setAttribute('position',new THREE.BufferAttribute(p,3));
  const m=new THREE.PointsMaterial(Object.assign({color,size,map:glowTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,sizeAttenuation:true},opts));
  const o=new THREE.Points(g,m);o.frustumCulled=false;o.visible=false;o.renderOrder=5;scene.add(o);
  return {o,p,g,n,seed:Array.from({length:n},()=>[Math.random(),Math.random(),Math.random()])};
}
const FX={
  fall:pointsSys(240,0x7cc8ff,.2),header:pointsSys(70,0x8fdcff,.34,{depthTest:false}),
  dis:pointsSys(120,0x7cc8ff,.2),siphon:pointsSys(100,0x7cc8ff,.16),
  dust:pointsSys(70,0xd9b17e,1.9,{blending:THREE.NormalBlending,opacity:.28}),splash:pointsSys(40,0xc0e6ff,.14),
  well:pointsSys(90,0xc9b56a,.2),
};
const HEADER_PATH=new THREE.CatmullRomCurve3([new V3(GX,1,21),new V3(GX,1,Z_ELBOW),new V3(GX,PIPE_Y,Z_ELBOW),new V3(GX,PIPE_Y,0),new V3(GX,BEAM_Y,0)],false,'catmullrom',.01);
// expanding rings
const ringPool=[];
function pingRing(pos,color,R=4,dur=1.2,flat=true){
  const m=new THREE.Mesh(new THREE.RingGeometry(.92,1,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));
  m.position.copy(pos);if(flat)m.rotation.x=-PI/2;scene.add(m);ringPool.push({m,t:0,dur,R,flat});
}
// signal packets running along wires
const packets=[];
function packet(curve,color=0x8fe9ff,dur=.8,rev=false){const s=glow(color,.7,gantry,0,0,0,1);s.material.depthTest=false;packets.push({s,curve,t:0,dur,rev});}
