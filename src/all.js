const VOICE_CLIPS={};
'use strict';
if(!window.THREE||!THREE.OrbitControls){document.getElementById('fatal').style.display='flex';throw new Error('THREE failed to load');}
{const raw=THREE.Color.prototype.setHex;THREE.Color.prototype.setHex=function(h){raw.call(this,h);return this.convertSRGBToLinear();};} // brand hexes are sRGB
const $=s=>document.querySelector(s);
const V3=THREE.Vector3, UP=new V3(0,1,0), PI=Math.PI, DEG=PI/180;
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,k)=>a+(b-a)*k;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
const easeIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const easeOut=t=>1-Math.pow(1-t,3);
const easeSoft=t=>t*t*(3-2*t);
const fmtL=v=>Math.round(v).toLocaleString('en-US')+' L';
const COL={blue:0x0A24DA,red:0xEF4444,green:0x10B981,white:0xffffff};

/* ---------------- renderer + scene ---------------- */
const canvas=$('#stage');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.setSize(innerWidth,innerHeight);
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.02;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.localClippingEnabled=true;

const scene=new THREE.Scene();
const HORIZON=0xF0CFA6;
scene.fog=new THREE.Fog(0,170,620);scene.fog.color.setRGB(.941,.812,.651); // r128 applies fog after encoding, so it stays in display space
const camera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,.3,1600);
camera.position.set(-30,70,120);
const controls=new THREE.OrbitControls(camera,canvas);
controls.enableDamping=true;controls.dampingFactor=.08;
controls.maxPolarAngle=PI*.492;controls.minDistance=3;controls.maxDistance=330;
controls.target.set(-5,0,5);

const SUN_DIR=new V3(-.62,.5,.62).normalize();
scene.add(new THREE.HemisphereLight(0xcfe2ff,0xc99b6a,1.05));
const sun=new THREE.DirectionalLight(0xfff0d8,3.1);
sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-55;sun.shadow.camera.right=55;sun.shadow.camera.top=55;sun.shadow.camera.bottom=-55;
sun.shadow.camera.near=10;sun.shadow.camera.far=340;sun.shadow.bias=-.0006;sun.shadow.normalBias=.04;
scene.add(sun,sun.target);
const alarmLight=new THREE.PointLight(COL.red,0,70,1.6);scene.add(alarmLight);

// sky dome
{
  const m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{sunDir:{value:SUN_DIR}},
    vertexShader:'varying vec3 d;void main(){d=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 d;uniform vec3 sunDir;
      void main(){vec3 n=normalize(d);float h=max(n.y,0.);
      vec3 zen=vec3(.20,.42,.80),mid=vec3(.60,.76,.93),hor=vec3(.941,.812,.651);
      vec3 c=mix(hor,mid,smoothstep(0.,.22,h));c=mix(c,zen,smoothstep(.16,.75,h));
      float s=max(dot(n,sunDir),0.);c+=vec3(1.,.82,.55)*pow(s,10.)*.32+vec3(1.,.92,.75)*pow(s,420.)*1.2;
      if(n.y<0.)c=hor;gl_FragColor=vec4(c,1.);}`});
  const s=new THREE.Mesh(new THREE.SphereGeometry(1200,32,18),m);s.renderOrder=-10;scene.add(s);
}

/* ---------------- mesh helpers ---------------- */
const M=(color,o={})=>new THREE.MeshStandardMaterial(Object.assign({color,roughness:.62,metalness:.05},o));
const MAT={
  steel:M(0xe7e9ee,{metalness:.35,roughness:.42}),steelD:M(0x8d939e,{metalness:.5,roughness:.45}),
  pipe:M(0x1136e6,{metalness:.25,roughness:.34}),pipeBare:M(0xb9c0cc,{metalness:.7,roughness:.3}),
  white:M(0xf7f8fb,{roughness:.32,metalness:.05}),blue:M(COL.blue,{roughness:.36}),dark:M(0x1a1d26,{roughness:.72}),
  rubber:M(0x15161a,{roughness:.92}),glassD:M(0x0e1f3c,{roughness:.08,metalness:.65}),
  conc:M(0xbdb7aa,{roughness:.95}),yellow:M(0xf6b90f,{roughness:.55}),red:M(COL.red,{roughness:.45}),
  grey:M(0x6f7682,{roughness:.6,metalness:.25}),chrome:M(0xd9dde4,{roughness:.2,metalness:.92}),
};
function add(geo,mat,parent,x=0,y=0,z=0,cast=true){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=true;(parent||scene).add(m);return m;}
const box=(w,h,d,mat,p,x,y,z,c)=>add(new THREE.BoxGeometry(w,h,d),mat,p,x,y,z,c);
const cyl=(r,h,mat,p,x,y,z,seg=20)=>add(new THREE.CylinderGeometry(r,r,h,seg),mat,p,x,y,z);
function strut(a,b,r,mat,parent,round){
  const A=new V3(...a),B=new V3(...b),len=A.distanceTo(B);
  const g=round?new THREE.CylinderGeometry(r,r,len,14):new THREE.BoxGeometry(r*2,len,r*2);
  const m=new THREE.Mesh(g,mat);m.position.copy(A).add(B).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(UP,B.clone().sub(A).normalize());m.castShadow=true;m.receiveShadow=true;(parent||scene).add(m);return m;
}
function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;t.userData={g,c};return t;}
function basic(map,o={}){return new THREE.MeshBasicMaterial(Object.assign({map,toneMapped:false},o));}
const glowTex=canvasTex(128,128,(g)=>{const r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.3,'rgba(255,255,255,.55)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,128,128);});
function glow(color,size,parent,x=0,y=0,z=0,opacity=.8){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));s.scale.set(size,size,1);s.position.set(x,y,z);(parent||scene).add(s);return s;}
function emissive(color,int=2){return new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:int,roughness:.4});}
function textSprite(text,size=1,bg='rgba(10,36,218,.92)'){
  const t=canvasTex(256,72,(g,w,h)=>{g.fillStyle=bg;g.beginPath();g.roundRect?g.roundRect(4,8,w-8,h-16,14):g.rect(4,8,w-8,h-16);g.fill();g.fillStyle='#fff';g.font='700 38px Saira,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,w/2,h/2+1);});
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,toneMapped:false}));s.scale.set(3.56*size,size,1);return s;
}

/* logo images, drawn onto 3D signage once decoded */
const logoBadge=new Image(),logoWord=new Image();
function lockupTex(w,h,bg='#0A24DA'){
  const t=canvasTex(w,h,()=>{});
  const paint=()=>{const g=t.userData.g;g.fillStyle=bg;g.fillRect(0,0,w,h);const H=h*.8,y=(h-H)/2,bx=h*.14;
    if(logoBadge.complete&&logoBadge.naturalWidth){g.save();g.beginPath();g.arc(bx+H/2,h/2,H/2,0,7);g.clip();g.drawImage(logoBadge,bx,y,H,H);g.restore();}
    if(logoWord.complete&&logoWord.naturalWidth){const wh=H*.92,ww=wh*logoWord.naturalWidth/logoWord.naturalHeight;g.drawImage(logoWord,bx+H+h*.1,(h-wh)/2,ww,wh);}
    t.needsUpdate=true;};
  logoBadge.addEventListener('load',paint);logoWord.addEventListener('load',paint);paint();return t;
}

/* ---------------- route ---------------- */
const ROUTE=[[-135,0],[-100,0],[-60,0],[-45,0],[-28,-2],[-6,-13],[20,-16],[44,-3],[60,9],[76,14],[94,14],[116,14]];
const pathCurve=new THREE.CatmullRomCurve3(ROUTE.map(([x,z])=>new V3(x,0,z)),false,'centripetal');
pathCurve.arcLengthDivisions=1200;
const PATH_LEN=pathCurve.getLength();
const SAMPLES=pathCurve.getSpacedPoints(500);
const sFor=x=>{let lo=0,hi=PATH_LEN;for(let i=0;i<30;i++){const m=(lo+hi)/2;pathCurve.getPointAt(m/PATH_LEN).x<x?lo=m:hi=m;}return (lo+hi)/2;};
const X_STAGING=-118,X_GATE=-78.6,X_BAY=-58.5,X_FENCE=73,X_CLIENT=94;
const S_POS={staging:sFor(X_STAGING),gate:sFor(X_GATE),bay:sFor(X_BAY),fence:sFor(X_FENCE),client:sFor(X_CLIENT),mid:sFor(20),well:sFor(44)};
const FENCE_C=new V3(94,0,14),FENCE_R=22;
const PADS=[[-104,-36,-24,46],[62,136,-26,40]];

/* ---------------- terrain ---------------- */
function dunes(x,z){
  return 3.4*Math.sin(x*.019+1.3)*Math.cos(z*.024)+2.0*Math.sin(x*.043+z*.029)+.8*Math.sin(x*.11-z*.085+2)+.22*Math.sin(x*.33+z*.27)+3.2;
}
function flatDist(x,z){
  let d=1e9;for(let i=0;i<SAMPLES.length;i+=3){const p=SAMPLES[i],dx=p.x-x,dz=p.z-z,q=dx*dx+dz*dz;if(q<d)d=q;}d=Math.sqrt(d);
  for(const [a,b,c,e] of PADS){const dx=Math.max(a-x,0,x-b),dz=Math.max(c-z,0,z-e);d=Math.min(d,Math.hypot(dx,dz));}
  return d;
}
function terrainH(x,z){const d=flatDist(x,z);const far=1+smooth(120,360,Math.hypot(x,z))*3.2;return -.08+smooth(5,34,d)*dunes(x,z)*far;}
{
  const g=new THREE.PlaneGeometry(1100,860,230,180);g.rotateX(-PI/2);g.translate(0,0,10);
  const pos=g.attributes.position,col=new Float32Array(pos.count*3);
  for(let i=0;i<pos.count;i++){pos.setY(i,terrainH(pos.getX(i),pos.getZ(i)));}
  g.computeVertexNormals();
  const a=new THREE.Color(0xe8b983),b=new THREE.Color(0xc98f58),c=new THREE.Color();
  for(let i=0;i<pos.count;i++){const n=g.attributes.normal.getY(i),h=pos.getY(i);c.copy(b).lerp(a,clamp((n-.86)*7)*.7+clamp(h/9)*.3);col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  const noise=canvasTex(256,256,(x,w,h)=>{const d=x.createImageData(w,h);for(let i=0;i<d.data.length;i+=4){const v=226+Math.random()*29;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;}x.putImageData(d,0,0);});
  noise.wrapS=noise.wrapT=THREE.RepeatWrapping;noise.repeat.set(90,70);
  const t=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,map:noise,roughness:1,metalness:0}));t.receiveShadow=true;scene.add(t);
}
// far ranges
{
  const m=new THREE.MeshStandardMaterial({color:0xb98d6f,roughness:1,flatShading:true});
  for(let i=0;i<46;i++){const a=i/46*PI*2+Math.random()*.1,R=470+Math.random()*90,r=50+Math.random()*80,h=26+Math.random()*50;
    const c=new THREE.Mesh(new THREE.ConeGeometry(r,h,5+(i%3)),m);c.position.set(Math.cos(a)*R,h/2-6,Math.sin(a)*R);c.rotation.y=Math.random()*3;scene.add(c);}
}

/* ---------------- road + pads ---------------- */
{
  const tex=canvasTex(128,256,(g,w,h)=>{g.fillStyle='#34353b';g.fillRect(0,0,w,h);
    for(let i=0;i<1600;i++){const v=40+Math.random()*50;g.fillStyle=`rgba(${v},${v},${v+4},.45)`;g.fillRect(Math.random()*w,Math.random()*h,1.5,1.5);}
    g.fillStyle='#f4f1e6';g.fillRect(5,0,4,h);g.fillRect(w-9,0,4,h);g.fillStyle='#f5c63a';g.fillRect(w/2-2.5,20,5,110);});
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  const N=SAMPLES.length,pos=new Float32Array(N*6),uv=new Float32Array(N*4),idx=[],W=3.9;
  for(let i=0;i<N;i++){const p=SAMPLES[i],t=pathCurve.getTangentAt(i/(N-1)),nx=-t.z,nz=t.x;
    pos.set([p.x+nx*W,.035,p.z+nz*W,p.x-nx*W,.035,p.z-nz*W],i*6);uv.set([0,i/(N-1)*PATH_LEN/9,1,i/(N-1)*PATH_LEN/9],i*4);
    if(i<N-1){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  const r=new THREE.Mesh(g,new THREE.MeshStandardMaterial({map:tex,roughness:.92,side:THREE.DoubleSide}));r.receiveShadow=true;scene.add(r);
  // reflector posts along the road give the transit a sense of speed
  const posts=new THREE.InstancedMesh(new THREE.BoxGeometry(.12,.8,.12),M(0xf5f5f5),Math.ceil(PATH_LEN/8)*2);let k=0;const d=new THREE.Object3D();
  for(let s=4;s<PATH_LEN-4;s+=8){const u=s/PATH_LEN,p=pathCurve.getPointAt(u),t=pathCurve.getTangentAt(u);
    if((p.x>-104&&p.x<-36)||p.x>62)continue;
    for(const sd of[-1,1]){d.position.set(p.x-t.z*sd*5,.4,p.z+t.x*sd*5);d.updateMatrix();posts.setMatrixAt(k++,d.matrix);}}
  posts.count=k;posts.castShadow=true;scene.add(posts);
}
function padPlane(x0,x1,z0,z1,color){
  const t=canvasTex(512,512,(g,w,h)=>{g.fillStyle=color;g.fillRect(0,0,w,h);for(let i=0;i<5000;i++){const a=Math.random()*.05;g.fillStyle=Math.random()>.5?`rgba(255,255,255,${a})`:`rgba(0,0,0,${a})`;g.fillRect(Math.random()*w,Math.random()*h,2,2);}
    g.strokeStyle='rgba(0,0,0,.07)';g.lineWidth=2;for(let i=1;i<8;i++){g.beginPath();g.moveTo(i*64,0);g.lineTo(i*64,h);g.moveTo(0,i*64);g.lineTo(w,i*64);g.stroke();}});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0,z1-z0),new THREE.MeshStandardMaterial({map:t,roughness:.96}));m.rotation.x=-PI/2;m.position.set((x0+x1)/2,.01,(z0+z1)/2);m.receiveShadow=true;scene.add(m);return m;
}
PADS.forEach((p,i)=>padPlane(...p,i?'#b7a68a':'#c4c1b9'));
const paint=(x,z,w,d,color=0xf6f4ea,y=.05)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshStandardMaterial({color,roughness:.8}));m.rotation.x=-PI/2;m.position.set(x,y,z);m.receiveShadow=true;scene.add(m);return m;};
paint(-60,-8,40,7.2,0x34353b,.03);                         // lane 2
paint(-60,-8+3.5,40,.14);paint(-60,-8-3.5,40,.14);
for(let i=0;i<8;i++)paint(-56.5+(i-4)*1.0,4.45,.5,.24,0xf6b90f); // bay stop box
paint(-57,4.05,15,.14,0xf6b90f);paint(-57,-4.05,15,.14,0xf6b90f);paint(-64.4,0,.14,8.1,0xf6b90f);paint(-49.6,0,.14,8.1,0xf6b90f);

/* ---------------- station scenery ---------------- */
// palm
function palm(x,z,h=7){
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  const trunk=M(0x8a6a48,{roughness:1}),frond=M(0x4c7a3a,{roughness:.9,side:THREE.DoubleSide});
  add(new THREE.CylinderGeometry(.17,.3,h,8),trunk,g,0,h/2,0);
  for(let i=0;i<9;i++){const a=i/9*PI*2,fg=new THREE.ConeGeometry(.42,3.4,4);fg.scale(1,1,.16);fg.translate(0,1.7,0);const f=add(fg,frond,g,0,h,0);f.rotation.set(0,-a,PI*.36+(i%2)*.14,'YXZ');}
}
[[-96,18],[-96,-16],[-40,32],[-42,-20],[-78,40],[126,-20],[70,-20],[70,34],[128,34]].forEach(p=>palm(p[0],p[1],6+Math.random()*2.6));
// lamp masts
for(const [x,z] of [[-80,12],[-44,14],[-44,-16]]){strut([x,0,z],[x,12,z],.12,MAT.steelD,null,true);box(1.8,.18,.5,MAT.dark,null,x,12.1,z);}
// control room
{
  box(11,3.6,6,MAT.white,null,-86,1.8,16);box(11.5,.3,6.5,MAT.blue,null,-86,3.75,16);
  for(let i=0;i<4;i++)box(1.5,1.2,.06,MAT.glassD,null,-90+i*2.6,2.1,12.98);
  const s=new THREE.Mesh(new THREE.PlaneGeometry(5.2,1.04),basic(lockupTex(640,128)));s.position.set(-86,4.6,12.9);box(5.4,1.2,.1,MAT.dark,null,-86,4.6,12.82);scene.add(s);
}
// reservoir + pump
{
  cyl(8,11,MAT.white,null,-60,5.5,35,40);cyl(8.05,1,MAT.blue,null,-60,8.2,35,40);cyl(8.05,.3,MAT.blue,null,-60,1,35,40);
  add(new THREE.ConeGeometry(8.2,1.4,40),MAT.white,null,-60,11.7,35);
  const s=new THREE.Mesh(new THREE.PlaneGeometry(7.6,1.52),basic(lockupTex(640,128)));s.position.set(-60,5,43.1);scene.add(s);
  const s2=s.clone();s2.position.set(-60,5,26.92);s2.rotation.y=PI;scene.add(s2);
}

/* ---------------- geofence + client compound ---------------- */
const FENCE={ring:null,fill:null,pulse:null,mat:null};
{
  FENCE.mat=new THREE.MeshBasicMaterial({color:COL.green,toneMapped:false});
  FENCE.ring=new THREE.Mesh(new THREE.RingGeometry(FENCE_R-.35,FENCE_R,96),FENCE.mat);FENCE.ring.rotation.x=-PI/2;FENCE.ring.position.set(FENCE_C.x,.12,FENCE_C.z);scene.add(FENCE.ring);
  FENCE.fill=new THREE.Mesh(new THREE.CircleGeometry(FENCE_R,64),new THREE.MeshBasicMaterial({color:COL.green,transparent:true,opacity:.1,depthWrite:false,toneMapped:false}));FENCE.fill.rotation.x=-PI/2;FENCE.fill.position.set(FENCE_C.x,.1,FENCE_C.z);scene.add(FENCE.fill);
  FENCE.pulse=new THREE.Mesh(new THREE.RingGeometry(.96,1,96),new THREE.MeshBasicMaterial({color:COL.green,transparent:true,opacity:.6,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}));FENCE.pulse.rotation.x=-PI/2;FENCE.pulse.position.set(FENCE_C.x,.14,FENCE_C.z);scene.add(FENCE.pulse);
  // light wall on the geofence edge
  const wg=new THREE.CylinderGeometry(FENCE_R,FENCE_R,3,96,1,true);
  const wt=canvasTex(8,64,(g,w,h)=>{const r=g.createLinearGradient(0,0,0,h);r.addColorStop(0,'rgba(255,255,255,0)');r.addColorStop(1,'rgba(255,255,255,1)');g.fillStyle=r;g.fillRect(0,0,w,h);});
  FENCE.wall=new THREE.Mesh(wg,new THREE.MeshBasicMaterial({map:wt,color:COL.green,transparent:true,opacity:.4,side:THREE.DoubleSide,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}));FENCE.wall.position.set(FENCE_C.x,1.5,FENCE_C.z);scene.add(FENCE.wall);
}
const CLIENT={};
{
  const C=new THREE.Group();scene.add(C);
  // receiving tank with a cutaway gauge window facing the road
  const tx=86,tz=-3,R=7,H=9.5;
  const shell=add(new THREE.CylinderGeometry(R,R,H,48,1,true,24*DEG,312*DEG),M(0xdfe3ea,{metalness:.3,roughness:.42,side:THREE.DoubleSide}),C,tx,H/2,tz);
  cyl(R+.05,.45,MAT.blue,C,tx,H-1,tz,48);
  add(new THREE.ConeGeometry(R+.2,1.3,48),MAT.steel,C,tx,H+.65,tz);
  cyl(R,.25,MAT.steelD,C,tx,.13,tz,48);
  const glass=new THREE.Mesh(new THREE.CylinderGeometry(R-.02,R-.02,H-1.25,20,1,true,-24*DEG,48*DEG),new THREE.MeshStandardMaterial({color:0xcfe6ff,transparent:true,opacity:.2,roughness:.08,depthWrite:false,side:THREE.DoubleSide}));glass.position.set(tx,(H-1.25)/2,tz);glass.renderOrder=3;C.add(glass);
  CLIENT.water=new THREE.Mesh(new THREE.CylinderGeometry(R-.15,R-.15,1,40),new THREE.MeshStandardMaterial({color:0x1E7BFF,emissive:0x0a3cff,emissiveIntensity:.3,transparent:true,opacity:.86,roughness:.2}));CLIENT.water.position.set(tx,.2,tz);CLIENT.water.scale.y=.001;CLIENT.water.renderOrder=1;C.add(CLIENT.water);
  CLIENT.H=H-1.7;CLIENT.base=.25;
  box(.14,H-1.3,.14,MAT.dark,C,tx+R*Math.sin(24*DEG),(H-1.3)/2,tz+R*Math.cos(24*DEG));box(.14,H-1.3,.14,MAT.dark,C,tx-R*Math.sin(24*DEG),(H-1.3)/2,tz+R*Math.cos(24*DEG));
  // inlet stand
  CLIENT.inlet=new V3(88,1.1,tz+R+.9);
  strut([88,1.1,tz+R-.2],[88,1.1,tz+R+1.2],.16,MAT.pipe,C,true);cyl(.24,.1,MAT.dark,C,88,1.1,tz+R+1.2).rotation.x=PI/2;
  box(.8,1.1,.3,MAT.steelD,C,88,.55,tz+R+.6);
  // perimeter fence
  const fm=M(0x8d939e,{metalness:.45});const pts=[];
  for(let x=64;x<=134;x+=3.5){pts.push([x,-24]);pts.push([x,38]);}
  for(let z=-24;z<=38;z+=3.5){if(Math.abs(z-14)>6.5)pts.push([64,z]);pts.push([134,z]);}
  const inst=new THREE.InstancedMesh(new THREE.BoxGeometry(.1,2.2,.1),fm,pts.length);const d=new THREE.Object3D();pts.forEach((p,i)=>{d.position.set(p[0],1.1,p[1]);d.updateMatrix();inst.setMatrixAt(i,d.matrix);});inst.castShadow=true;C.add(inst);
  const rail=(a,b)=>{strut([a[0],2.1,a[1]],[b[0],2.1,b[1]],.035,fm,C);strut([a[0],1.1,a[1]],[b[0],1.1,b[1]],.035,fm,C);};
  rail([64,-24],[134,-24]);rail([64,38],[134,38]);rail([134,-24],[134,38]);rail([64,-24],[64,7.5]);rail([64,20.5],[64,38]);
  // site gate + board
  strut([64,0,7.4],[64,6,7.4],.16,MAT.blue,C);strut([64,0,20.6],[64,6,20.6],.16,MAT.blue,C);
  box(.3,1.4,13.6,MAT.blue,C,64,6,14);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(13,1.2),basic(canvasTex(1024,96,(g,w,h)=>{g.fillStyle='#0A24DA';g.fillRect(0,0,w,h);g.fillStyle='#fff';g.font='700 56px Saira,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('RIYADH NORTH COMPOUND',w/2,h/2+2);})));
  sign.rotation.y=-PI/2;sign.position.set(63.8,6,14);C.add(sign);
  // site office
  box(9,3,3.4,M(0x2a48e8),C,120,1.5,-14);box(9,3,3.4,MAT.white,C,120,1.5,-10.2);box(9,3,3.4,MAT.white,C,120,4.5,-14);
  // concrete frame under construction
  const col=M(0xa9a59b,{roughness:.95});
  for(let i=0;i<5;i++)for(let j=0;j<4;j++){box(.6,12,.6,col,C,104+i*5.5,6,24+j*3.4+(j?0:0));}
  for(let f=1;f<=3;f++)box(23.5,.4,11,col,C,115,f*4,29);
  // tower crane
  const cr=M(0xf6b90f,{metalness:.2});const cx=122,cz=6;
  box(.9,24,.9,cr,C,cx,12,cz);box(3,.6,3,MAT.conc,C,cx,.3,cz);box(1.3,1.5,1.3,MAT.white,C,cx,24.5,cz+.2);
  strut([cx-24,25.4,cz],[cx+8,25.4,cz],.22,cr,C);strut([cx,29,cz],[cx-20,25.5,cz],.04,MAT.dark,C);strut([cx,29,cz],[cx+7,25.5,cz],.04,MAT.dark,C);strut([cx,25,cz],[cx,29,cz],.2,cr,C);
  box(2.4,1.2,1.2,MAT.conc,C,cx+6.6,24.5,cz);strut([cx-15,25.2,cz],[cx-15,12,cz],.03,MAT.dark,C);box(1.8,.5,1.8,MAT.steelD,C,cx-15,11.8,cz);
}
// well + power poles + road signs
const WELL=new THREE.Group();{
  const p=pathCurve.getPointAt(S_POS.well/PATH_LEN),t=pathCurve.getTangentAt(S_POS.well/PATH_LEN);
  WELL.position.set(p.x-t.z*-10,0,p.z+t.x*-10);scene.add(WELL);
  cyl(1.1,.8,MAT.conc,WELL,0,.4,0,14);cyl(.5,1.4,MAT.steelD,WELL,0,1.1,0,12);
  strut([-1,0,-1],[0,3.2,0],.06,MAT.grey,WELL);strut([1,0,-1],[0,3.2,0],.06,MAT.grey,WELL);strut([0,0,1.2],[0,3.2,0],.06,MAT.grey,WELL);
  WELL.visible=true;
}
{
  let prev=null;const w=M(0x2a2520,{roughness:1});
  for(let s=70;s<PATH_LEN-40;s+=18){const u=s/PATH_LEN,p=pathCurve.getPointAt(u),t=pathCurve.getTangentAt(u);const x=p.x+t.z*-11,z=p.z+t.x*11;if(x>58)break;
    const top=[x,9.2,z];strut([x,0,z],top,.1,M(0x6d543c,{roughness:1}),null,true);strut([x,8.7,z-1],[x,8.7,z+1],.05,w);
    if(prev)strut(prev,top,.012,w,null,true);prev=top;}
  const sg=new THREE.Group();sg.position.set(-22,0,8);scene.add(sg);
  box(.16,4,.16,MAT.steelD,sg,-1.8,2,0);box(.16,4,.16,MAT.steelD,sg,1.8,2,0);
  const pl=new THREE.Mesh(new THREE.PlaneGeometry(4.8,1.9),basic(canvasTex(384,152,(g,w,h)=>{g.fillStyle='#0f7a4d';g.fillRect(0,0,w,h);g.strokeStyle='#fff';g.lineWidth=4;g.strokeRect(6,6,w-12,h-12);g.fillStyle='#fff';g.font='700 36px Saira,sans-serif';g.fillText('Riyadh North',26,66);g.font='600 28px Saira,sans-serif';g.fillText('Compound  ➜',26,114);})));pl.position.set(0,3.6,.1);pl.rotation.y=-.5;sg.add(pl);
}
// scattered rock + scrub
{
  const rock=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:0xa98560,roughness:1,flatShading:true}),170);
  const scrub=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:0x8a8a58,roughness:1,flatShading:true}),190);
  const d=new THREE.Object3D();
  const scatter=(inst,n,sMin,sMax)=>{let k=0,tries=0;while(k<n&&tries++<4000){const x=-210+Math.random()*440,z=-160+Math.random()*340;if(flatDist(x,z)<9)continue;const s=sMin+Math.random()*(sMax-sMin);d.position.set(x,terrainH(x,z)+s*.1,z);d.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);d.scale.set(s,s*.62,s*.9);d.updateMatrix();inst.setMatrixAt(k++,d.matrix);}inst.count=k;inst.castShadow=true;inst.receiveShadow=true;scene.add(inst);};
  scatter(rock,170,.3,1.5);scatter(scrub,190,.3,.8);
}

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

