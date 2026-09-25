import * as T from 'three';
import { OrbitControls } from '/vendor/three/OrbitControls.js';
import { CityModel, lanePose, clamp } from './city-model.js';
const C={mint:0x93e1cb,violet:0xc3b2f2,asphalt:0x26303d};
const mix=(a,b,t)=>a+(b-a)*t;
export class CityScene {
 constructor(host,feed,onState){Object.assign(this,{host,feed,onState,model:new CityModel(),holds:new Set(),last:0,jobs:new Set(),carMeshes:new Map(),pedMeshes:new Map(),lights:[],view:'overview',droneState:'Docked',vanState:'Ready',disposed:false,lastReport:0,scanning:false,mode:'Junction dynamics',replay:null});}
 mat(c,extra={}){return new T.MeshStandardMaterial({color:c,roughness:.7,metalness:.08,...extra});}
 box(w,h,d,c,x=0,y=0,z=0,parent=this.scene,extra={}){const m=new T.Mesh(new T.BoxGeometry(w,h,d),this.mat(c,extra));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 cylinder(r,h,c,x,y,z,parent=this.scene){const m=new T.Mesh(new T.CylinderGeometry(r,r,h,16),this.mat(c));m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
 label(text,x,y,z,width=2.8){const c=document.createElement('canvas');c.width=640;c.height=96;const g=c.getContext('2d');g.fillStyle='#0e1821ef';g.beginPath();g.roundRect(0,0,640,96,16);g.fill();g.strokeStyle='#8cc9c577';g.lineWidth=3;g.stroke();g.fillStyle='#deebee';g.font='31px monospace';g.textAlign='center';g.fillText(text,320,62);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const sp=new T.Sprite(new T.SpriteMaterial({map:tex,depthWrite:false}));sp.position.set(x,y,z);sp.scale.set(width,width*96/640,1);this.scene.add(sp);return sp;}
 async init(){
  this.scene=new T.Scene();this.scene.background=new T.Color(0x10131d);this.scene.fog=new T.FogExp2(0x10131d,.012);
  this.renderer=new T.WebGLRenderer({antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.22;this.host.replaceChildren(this.renderer.domElement);
  this.camera=new T.PerspectiveCamera(42,1,.1,120);this.camera.position.set(-23,23,25);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,.7,0);this.controls.enableDamping=true;this.controls.maxPolarAngle=1.3;this.controls.minDistance=11;this.controls.maxDistance=60;
  this.feedRenderer=new T.WebGLRenderer({canvas:this.feed,antialias:true});this.feedRenderer.setSize(384,216,false);this.feedRenderer.outputColorSpace=T.SRGBColorSpace;this.feedRenderer.toneMapping=T.ACESFilmicToneMapping;this.feedRenderer.toneMappingExposure=1.2;this.feedCamera=new T.PerspectiveCamera(66,16/9,.1,100);
  this.scene.add(new T.HemisphereLight(0xe0e9ff,0x536166,2.4));const sun=new T.DirectionalLight(0xfff3df,3.5);sun.position.set(-8,25,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-20,right:20,top:20,bottom:-20});sun.shadow.bias=-.0005;this.scene.add(sun);
  this.buildDistrict();this.drone=this.makeDrone();this.drone.position.set(-8,3.2,7.4);this.scene.add(this.drone);this.van=this.makeCar(0,true);this.van.position.set(-11,.04,4.45);this.scene.add(this.van);
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(this.host);this.resize();this.frame(0);return this;
 }
 building(x,z,w,d,h,c){
  this.box(w,h,d,c,x,h/2,z);this.box(w+.13,.15,d+.13,0x677d88,x,h+.07,z);
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const g=canvas.getContext('2d');g.fillStyle='#526676';g.fillRect(0,0,256,256);for(let i=0;i<8;i++)for(let j=0;j<8;j++){g.fillStyle=(i+j)%5===0?'#bdd5d2':'#7896aa';g.fillRect(i*32+5,j*32+6,20,19);}const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
  const f=new T.Mesh(new T.PlaneGeometry(w-.16,h-.25),this.mat(0xffffff,{map:tex}));f.position.set(x,h/2,z+d/2+.012);this.scene.add(f);const side=f.clone();side.geometry=new T.PlaneGeometry(d-.16,h-.25);side.rotation.y=-Math.PI/2;side.position.set(x-w/2-.012,h/2,z);this.scene.add(side);
  this.box(.7,.35,.65,0xaab6bc,x+w*.2,h+.3,z-d*.2);
 }
 tree(x,z,s=1){this.cylinder(.075*s,.8*s,0x857868,x,.4*s,z);const c=new T.Mesh(new T.IcosahedronGeometry(.51*s,1),this.mat(0x609187));c.position.set(x,1.12*s,z);c.castShadow=true;this.scene.add(c);}
 signal(x,z,axis){this.cylinder(.05,2.4,0xa5b4c0,x,1.2,z);this.box(.4,.98,.25,0x18222e,x,2.45,z);const bulbs=[];for(let i=0;i<3;i++){const b=new T.Mesh(new T.SphereGeometry(.105,12,10),this.mat(0x263342,{emissive:0x000000}));b.position.set(x,2.74-i*.28,z+.14);this.scene.add(b);bulbs.push(b);}this.lights.push({axis,bulbs});}
 buildDistrict(){
  this.box(29,.32,29,0x607280,0,-.18,0);this.box(5.2,.04,29,C.asphalt,0,.005,0);this.box(29,.04,5.2,C.asphalt,0,.006,0);
  for(const x of [-8.9,8.9])for(const z of [-8.9,8.9])this.box(11.5,.15,11.5,0x9babb1,x,.07,z);
  for(let p=-14;p<=14;p+=1.35){if(Math.abs(p)<3)continue;this.box(.055,.02,.7,0xd7d8cd,0,.035,p);this.box(.7,.02,.055,0xd7d8cd,p,.035,0);}
  for(const s of [-1,1]){for(let n=0;n<7;n++){this.box(.2,.024,3.8,0xe4e6dd,s*(3.1+n*.25),.038,0);this.box(3.8,.024,.2,0xe4e6dd,0,.038,s*(3.1+n*.25));}this.box(.08,.03,4.5,0xe9e6d1,s*5.15,.04,0);this.box(4.5,.03,.08,0xe9e6d1,0,.04,s*5.15);}
  this.building(-10,-9,3.7,4.4,5.5,0xa1b3bd);this.building(-6.1,-10,2.6,3.3,3.7,0xc0c5c6);this.building(-9.4,-5,4.7,2,2.4,0x9eb3c2);
  this.building(9,-10,5.7,3.5,4.4,0xc2c6be);this.building(10,-5.6,3.7,3,2.9,0x9aafb9);this.building(5.2,-6.7,2.3,5.1,3.2,0xbcb3cb);
  this.building(10,8.7,4,5.3,4.5,0xb5aec5);this.building(5.6,10.6,3.3,2.4,2.8,0x9cbab5);this.building(-9,9.5,5,3,2.65,0xadbcc4);
  this.box(3.2,.06,2.3,0x324759,-8,2.79,7.4);const pad=new T.Mesh(new T.RingGeometry(.66,.73,36),this.mat(C.mint,{side:T.DoubleSide}));pad.rotation.x=-Math.PI/2;pad.position.set(-8,2.835,7.4);this.scene.add(pad);this.box(.76,.02,.1,C.mint,-8,2.84,7.4);for(const x of [-8.27,-7.73])this.box(.1,.02,.65,C.mint,x,2.84,7.4);
  for(let p=-12;p<13;p+=2.6){if(Math.abs(p)<5)continue;this.tree(p,3.02,.8);this.tree(-3.02,p,.8);this.tree(p,-3.02,.7);}
  for(const v of [[-3,-2.6,'EW'],[3,2.6,'EW'],[2.6,-3,'NS'],[-2.6,3,'NS']])this.signal(...v);
  this.box(.42,.8,.45,0x6b9c92,-3.4,.5,4.9);this.label('J-01 · MOBILITY',0,1.05,0,3.4);this.label('D-01 / DRONE PORT',-8,3.75,7.4,3.4);this.label('CONTROL CENTRE',10,5.2,8.7,3.4);
  for(const [x,z,name] of [[-6.8,-2.8,'CAM-T01'],[2.85,5,'CAM-P01']]){this.cylinder(.04,2.1,0xaac4cd,x,1.05,z);this.box(.3,.15,.13,0xc6e7df,x,2.17,z);this.label(name,x,2.65,z,1.9);const ring=new T.Mesh(new T.RingGeometry(.32,.38,32),new T.MeshBasicMaterial({color:C.mint,side:T.DoubleSide,transparent:true,opacity:.7}));ring.rotation.x=-Math.PI/2;ring.position.set(x,.12,z);this.scene.add(ring);}
  this.scan=new T.Mesh(new T.ConeGeometry(2.9,6.5,40,1,true),new T.MeshBasicMaterial({color:C.mint,transparent:true,opacity:.055,side:T.DoubleSide,depthWrite:false}));this.scan.visible=false;this.scene.add(this.scan);
  this.scanRing=new T.Mesh(new T.RingGeometry(2.6,2.7,50),new T.MeshBasicMaterial({color:C.mint,transparent:true,opacity:.7,side:T.DoubleSide}));this.scanRing.rotation.x=-Math.PI/2;this.scanRing.position.y=.09;this.scanRing.visible=false;this.scene.add(this.scanRing);
 }
 makeCar(tone=0,van=false){const g=new T.Group(),colors=[0x91b1d9,0xe7ded0,0x83b6a4,0xaaa7c7,0xc28f99];this.box(van?1.35:1.06,.3,.49,van?0xc4dfde:colors[tone%5],0,.31,0,g);this.box(van?.9:.55,.27,.44,van?0xb3d4d5:0x4a627a,van?-.16:-.07,.59,0,g);this.box(.028,.16,.37,0x304758,van?.3:.21,.6,0,g);g.userData.wheels=[];for(const x of [-.34,.35])for(const z of [-.27,.27]){const w=new T.Mesh(new T.CylinderGeometry(.12,.12,.08,12),this.mat(0x14202d));w.rotation.x=Math.PI/2;w.position.set(x,.2,z);g.add(w);g.userData.wheels.push(w);}for(const z of [-.15,.15])this.box(.03,.055,.08,0xfcf2cb,van?.69:.55,.34,z,g,{emissive:0x988869});if(van){this.box(.3,.04,.45,0x63868d,-.18,.75,0,g);this.box(.18,.07,.14,0x7ee3d8,.07,.81,0,g,{emissive:0x26b9a4});}return g;}
 makeDrone(){const g=new T.Group();this.box(.55,.18,.37,0xd7e2e9,0,0,0,g);this.box(.3,.08,.25,0xa293ce,0,.12,0,g);g.userData.props=[];for(const x of [-.5,.5])for(const z of [-.4,.4]){const a=this.box(.72,.04,.055,0x94a2b1,x/2,0,z/2,g);a.rotation.y=-Math.atan2(z,x);this.cylinder(.075,.16,0x505d73,x,.045,z,g);const blade=this.box(.64,.013,.06,0xb6c6d5,x,.15,z,g);g.userData.props.push(blade);const guard=new T.Mesh(new T.TorusGeometry(.34,.014,6,30),this.mat(0x93a7b8));guard.rotation.x=-Math.PI/2;guard.position.set(x,.1,z);g.add(guard);}this.cylinder(.095,.18,0x526b7b,.16,-.18,0,g);this.box(.56,.03,.04,0xd2dee5,0,-.28,.16,g);this.box(.56,.03,.04,0xd2dee5,0,-.28,-.16,g);return g;}
 makePed(){const g=new T.Group();const head=new T.Mesh(new T.SphereGeometry(.105,12,10),this.mat(0xc5a98d));head.position.y=.84;g.add(head);this.box(.19,.3,.13,0xc1afd6,0,.59,0,g);g.userData.legs=[];for(const x of [-.055,.055]){const leg=this.box(.06,.29,.065,0x3b435b,x,.28,0,g);g.userData.legs.push(leg);}return g;}
 resize(){const w=Math.max(1,this.host.clientWidth),h=Math.max(1,this.host.clientHeight);this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 setView(v){this.view=v;this.controls.enabled=v==='overview';if(v==='overview'){this.camera.position.set(-23,23,25);this.controls.target.set(0,.7,0);}}
 path(points){if(this.route){this.scene.remove(this.route);this.route.geometry.dispose();this.route.material.dispose();}this.route=new T.Line(new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p))),new T.LineDashedMaterial({color:C.mint,dashSize:.3,gapSize:.25,transparent:true,opacity:.65}));this.route.computeLineDistances();this.scene.add(this.route);}
 hold(reason,on){if(on)this.holds.add(reason);else this.holds.delete(reason);}
 wait(seconds,signal){const target=this.model.t+seconds;return this.until(()=>this.model.t>=target,signal);}
 until(test,signal,timeout=180){return new Promise((resolve,reject)=>{if(signal?.aborted)return reject(Error('Cancelled'));const job={test,resolve,reject,started:this.model.t,timeout};const abort=()=>{this.jobs.delete(job);reject(Error('Cancelled'));};job.cleanup=()=>signal?.removeEventListener('abort',abort);signal?.addEventListener('abort',abort,{once:true});this.jobs.add(job);});}
 async fly(points,signal){this.path([this.drone.position.toArray(),...points]);for(const p of points){this.droneTarget=new T.Vector3(...p);await this.until(()=>this.drone.position.distanceTo(this.droneTarget)<.1,signal,60);}this.droneTarget=null;}
 async survey(signal){this.droneState='Taking off';await this.fly([[-8,7.5,7.4],[-4,7.5,3.5],[0,7.5,0]],signal);this.droneState='Scanning junction';this.scanning=true;await this.wait(4,signal);this.scanning=false;this.droneState='Holding position';return{pose:this.drone.position.toArray(),source:'simulated survey camera',result:'Survey waypoints completed'};}
 async returnDrone(signal){this.droneState='Returning';await this.fly([[-4,7.5,4],[-8,7.5,7.4],[-8,3.2,7.4]],signal);this.droneState='Docked';}
 async dispatch(signal){this.vanState='Dispatching';this.vanTarget=new T.Vector3(-4.5,.04,4.45);await this.until(()=>this.van.position.distanceTo(this.vanTarget)<.08,signal,40);this.vanTarget=null;this.vanState='At junction';}
 updateVehicles(s,dt){const ids=new Set(s.carStates.map(c=>c.id));for(const[id,m]of this.carMeshes){if(!ids.has(id)){this.scene.remove(m);this.carMeshes.delete(id);this.disposeObject(m);}}
  for(const c of s.carStates){let mesh=this.carMeshes.get(c.id);if(!mesh){mesh=this.makeCar(c.tone);if(c.kind==='bus')mesh.scale.x=1.5;this.carMeshes.set(c.id,mesh);this.scene.add(mesh);}const p=lanePose(c);mesh.position.set(p.x,.025,p.z);mesh.rotation.y=p.yaw;for(const w of mesh.userData.wheels)w.rotation.z-=c.v*dt*6;}
  const pids=new Set(s.crossers.map(p=>p.id));for(const[id,m]of this.pedMeshes){if(!pids.has(id)){this.scene.remove(m);this.pedMeshes.delete(id);this.disposeObject(m);}}
  for(const p of s.crossers){let mesh=this.pedMeshes.get(p.id);if(!mesh){mesh=this.makePed();this.pedMeshes.set(p.id,mesh);this.scene.add(mesh);}mesh.position.set(p.p,.1,3.7+p.id*.18);mesh.rotation.y=-Math.PI/2;mesh.userData.legs.forEach((l,i)=>l.rotation.x=Math.sin(s.t*8+i*Math.PI)*.5);}
  for(const light of this.lights){const green=s.signal===light.axis&&!s.hazard;light.bulbs.forEach((b,i)=>{const on=i===0?!green:i===2?green:false;const color=[0xee677a,0xebc482,0x78e8bc][i];b.material.color.setHex(on?color:0x263444);b.material.emissive.setHex(on?color:0);b.material.emissiveIntensity=on?.8:0;});}
 }
 snapshot(){return{...this.model.snapshot(),drone:{position:this.drone.position.toArray(),rotation:this.drone.rotation.toArray().slice(0,3),state:this.droneState},field:{position:this.van.position.toArray(),state:this.vanState},held:this.holds.size>0,scan:this.scanning};}
 frame(now){if(this.disposed)return;const dt=Math.min(.12,this.last?(now-this.last)/1000:.016);this.last=now;
  if(!this.holds.size&&!this.replay){for(let left=dt;left>0;left-=.02)this.model.tick(Math.min(.02,left));if(this.droneTarget){const dir=this.droneTarget.clone().sub(this.drone.position),distance=dir.length();this.drone.position.addScaledVector(dir.normalize(),Math.min(distance,dt*3));this.drone.rotation.z=mix(this.drone.rotation.z,-dir.x*.12,.08);this.drone.rotation.x=mix(this.drone.rotation.x,dir.z*.12,.08);}else{this.drone.rotation.x*=.9;this.drone.rotation.z*=.9;}
   if(this.vanTarget){const d=this.vanTarget.clone().sub(this.van.position);this.van.position.addScaledVector(d.normalize(),Math.min(this.van.position.distanceTo(this.vanTarget),dt*1.8));this.van.userData.wheels.forEach(w=>w.rotation.z-=dt*10);}
   for(const job of [...this.jobs]){if(job.test()){this.jobs.delete(job);job.cleanup();job.resolve();}else if(this.model.t-job.started>job.timeout){this.jobs.delete(job);job.cleanup();job.reject(Error('Execution timed out'));}}
  }
  const s=this.replay||this.snapshot();if(this.replay){this.drone.position.fromArray(s.drone.position);this.van.position.fromArray(s.field.position);}
  this.updateVehicles(s,this.holds.size?0:dt);if(s.drone.state!=='Docked'&&!this.holds.size)for(const p of this.drone.userData.props)p.rotation.y+=dt*85;
  this.scan.visible=this.scanRing.visible=s.scan;if(s.scan){this.scan.position.set(this.drone.position.x,this.drone.position.y-3.3,this.drone.position.z);this.scanRing.position.set(this.drone.position.x,.09,this.drone.position.z);this.scanRing.scale.setScalar(1+.09*Math.sin(now*.006));}
  if(this.view==='follow'){this.camera.position.lerp(this.drone.position.clone().add(new T.Vector3(-9,6,11)),.035);this.controls.target.lerp(this.drone.position.clone().multiplyScalar(.5),.05);}else if(this.view==='junction'){this.camera.position.lerp(new T.Vector3(-11,11,12),.04);this.controls.target.lerp(new T.Vector3(0,.4,0),.04);}
  this.controls.update();this.renderer.render(this.scene,this.camera);if(!this.lastFeed||now-this.lastFeed>140){this.feedCamera.position.copy(this.drone.position).add(new T.Vector3(.1,-.45,.05));this.feedCamera.lookAt(new T.Vector3(0,.05,0));this.drone.visible=false;this.feedRenderer.render(this.scene,this.feedCamera);this.drone.visible=true;this.lastFeed=now;}
  if(now-this.lastReport>160){this.lastReport=now;this.onState(s);}this.raf=requestAnimationFrame(n=>this.frame(n));
 }
 cancel(reason='Stopped'){this.droneTarget=null;this.vanTarget=null;this.scanning=false;for(const j of this.jobs){j.cleanup();j.reject(Error(reason));}this.jobs.clear();}
 preview(s){this.replay=s;}
 live(){this.replay=null;}
 reset(){this.cancel('Reset');this.model.reset();this.holds.clear();this.replay=null;this.drone.position.set(-8,3.2,7.4);this.van.position.set(-11,.04,4.45);this.droneState='Docked';this.vanState='Ready';this.setView('overview');}
 disposeObject(o){o.traverse(n=>{n.geometry?.dispose();if(n.material){for(const m of Array.isArray(n.material)?n.material:[n.material]){m.map?.dispose();m.dispose();}}});}
 dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.cancel('Closed');this.resizeObserver.disconnect();this.controls.dispose();this.disposeObject(this.scene);this.renderer.dispose();this.feedRenderer.dispose();}
}
