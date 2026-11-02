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
