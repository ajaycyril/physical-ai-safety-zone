import * as T from 'three';
import {CityScene} from './city-scene.js';
import {Facility} from './facility.js';
import {lanePose} from './city-model.js';
// Optimize rendering only. No change to controller dynamics, evidence freshness,
// authority checks or mission timing. Geometry remains visible and inspectable.
function materialKey(m){return JSON.stringify([m.type,m.color?.getHex(),m.emissive?.getHex(),m.emissiveIntensity,m.roughness,m.metalness,m.map?.uuid,m.side,m.transparent,m.opacity,m.depthWrite]);}
function batchStatic(parent,excluded=new Set()){
 const groups=new Map();parent.updateMatrixWorld(true);
 for(const m of [...parent.children]){
  if(!m.isMesh||m.isInstancedMesh||excluded.has(m)||!m.visible||m.material.transparent||Array.isArray(m.material))continue;
  if(!m.geometry?.attributes.position||!m.geometry.attributes.normal||!m.geometry.attributes.uv)continue;
  const key=materialKey(m.material);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);
 }
 let before=0,after=0;
 for(const objects of groups.values()){
  if(objects.length<3)continue;
  const geometries=objects.map(m=>{m.updateMatrix();const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrix);return g;});
  const geometry=new T.BufferGeometry();
  for(const [name,size]of[['position',3],['normal',3],['uv',2]]){const count=geometries.reduce((n,g)=>n+g.attributes[name].array.length,0),buffer=new Float32Array(count);let offset=0;for(const g of geometries){buffer.set(g.attributes[name].array,offset);offset+=g.attributes[name].array.length;}geometry.setAttribute(name,new T.BufferAttribute(buffer,size));}
  geometry.computeBoundingSphere();const merged=new T.Mesh(geometry,objects[0].material);merged.name='Batched static site geometry';merged.castShadow=objects.some(m=>m.castShadow);merged.receiveShadow=true;parent.add(merged);
  objects.forEach(m=>parent.remove(m));geometries.forEach(g=>g.dispose());before+=objects.length;after++;
 }
 return{before,after};
}
const district=CityScene.prototype.buildDistrict;CityScene.prototype.buildDistrict=function(){const r=district.call(this);this.renderBatch=batchStatic(this.scene,new Set([this.scan,this.scanRing,...this.lights.flatMap(l=>l.bulbs)]));return r;};
const factory=Facility.prototype.makeScene;Facility.prototype.makeScene=function(){const r=factory.call(this);this.renderBatch=batchStatic(this.scene,new Set([this.gaugeMesh,this.routeZone,this.scanPlane,this.piRing]));budget(this);return r;};
const cityInit=CityScene.prototype.init;CityScene.prototype.init=async function(){const r=await cityInit.call(this);budget(this);batchStatic(this.fs?.train||new T.Group());return r;};
function budget(i){
 i.renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));i.resize();i.renderer.shadowMap.autoUpdate=false;i.renderer.shadowMap.needsUpdate=true;i.lastShadow=0;
 for(const light of i.scene.children.filter(o=>o.isLight&&o.shadow))light.shadow.mapSize.set(1024,1024);
 const primary=i.renderer.render.bind(i.renderer);i.renderer.render=function(...args){const now=performance.now();if(!i.lastShadow||now-i.lastShadow>250){i.renderer.shadowMap.needsUpdate=true;i.lastShadow=now;}primary(...args);};
 const feed=i.feedRenderer.render.bind(i.feedRenderer);i.feedRenderer.render=function(...args){const now=performance.now();if(i.lastBudgetFeed&&now-i.lastBudgetFeed<240)return;i.lastBudgetFeed=now;feed(...args);};
 // Keep static distant context in the overview, but exclude it from the small
 // close-up robot/drone camera. The physical area and all controlled bodies stay.
 i.fs?.root.traverse(o=>o.layers.set(1));i.camera.layers.enable(1);
}
const colors=[0x91b1d9,0xe7ded0,0x83b6a4,0xaaa7c7,0xc28f99],capacity=160;
function trafficPool(i){
 const geo={body:new T.BoxGeometry(1.06,.3,.49),cabin:new T.BoxGeometry(.55,.27,.44),glass:new T.BoxGeometry(.028,.16,.37),wheel:new T.CylinderGeometry(.12,.12,.08,12),lamp:new T.BoxGeometry(.03,.055,.08)};
 geo.wheel.rotateX(Math.PI/2);const defs=[['body',0xffffff,1],['cabin',0x4a627a,1],['glass',0x304758,1],['wheel',0x14202d,4],['lamp',0xfcf2cb,2]];
 i.trafficPool={};
 for(const[name,color,n]of defs){const mesh=new T.InstancedMesh(geo[name],new T.MeshStandardMaterial({color,roughness:.7,metalness:.08}),capacity*n);mesh.count=0;mesh.frustumCulled=false;mesh.castShadow=name==='body';mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);i.scene.add(mesh);i.trafficPool[name]=mesh;}
 i.trafficPool.matrix=new T.Matrix4();i.trafficPool.car=new T.Matrix4();i.trafficPool.local=new T.Matrix4();i.trafficPool.pos=new T.Vector3();i.trafficPool.scale=new T.Vector3();i.trafficPool.q=new T.Quaternion();i.trafficPool.up=new T.Vector3(0,1,0);i.trafficPool.color=new T.Color();
}
CityScene.prototype.updateVehicles=function(s,dt){
 if(!this.trafficPool)trafficPool(this);const p=this.trafficPool;
 const cars=s.carStates.slice(0,capacity);let n=0;
 for(const c of cars){const xy=lanePose(c);p.q.setFromAxisAngle(p.up,xy.yaw);p.car.compose(p.pos.set(xy.x,.025,xy.z),p.q,p.scale.set(c.kind==='bus'?1.5:1,1,1));
  function at(name,index,x,y,z){p.local.makeTranslation(x,y,z);p.matrix.multiplyMatrices(p.car,p.local);p[name].setMatrixAt(index,p.matrix);}
  at('body',n,0,.31,0);p.body.setColorAt(n,p.color.setHex(colors[c.tone%5]));at('cabin',n,-.07,.59,0);at('glass',n,.21,.6,0);
  let j=0;for(const x of[-.34,.35])for(const z of[-.27,.27])at('wheel',n*4+j++,x,.2,z);
  at('lamp',n*2,.55,.34,-.15);at('lamp',n*2+1,.55,.34,.15);n++;
 }
 for(const[name,multiple]of[['body',1],['cabin',1],['glass',1],['wheel',4],['lamp',2]]){p[name].count=n*multiple;p[name].instanceMatrix.needsUpdate=true;}if(p.body.instanceColor)p.body.instanceColor.needsUpdate=true;
 const ids=new Set(s.crossers.map(c=>c.id));for(const[id,mesh]of this.pedMeshes)if(!ids.has(id)){this.scene.remove(mesh);this.pedMeshes.delete(id);this.disposeObject(mesh);}
 for(const c of s.crossers){let mesh=this.pedMeshes.get(c.id);if(!mesh){mesh=this.makePed();this.pedMeshes.set(c.id,mesh);this.scene.add(mesh);}mesh.position.set(c.p,.1,3.7+c.id*.18);mesh.rotation.y=-Math.PI/2;mesh.userData.legs.forEach((l,j)=>l.rotation.x=Math.sin(s.t*8+j*Math.PI)*.5);}
 for(const light of this.lights){const green=s.signal===light.axis&&!s.hazard;light.bulbs.forEach((b,j)=>{const on=j===0?!green:j===2?green:false,color=[0xee677a,0xebc482,0x78e8bc][j];b.material.color.setHex(on?color:0x263444);b.material.emissive.setHex(on?color:0);b.material.emissiveIntensity=on?.8:0;});}
 this.renderCapacity={vehicles:cars.length,capacity,drawGroups:5,source:'Original car-following states'};
};
// Render at most 30 fps; physics uses elapsed time at the unchanged fixed step.
for(const[proto,key]of[[CityScene.prototype,'frame'],[Facility.prototype,'animate']]){const original=proto[key];proto[key]=function(now){if(this.disposed)return;if(this.lastBudgetFrame&&now-this.lastBudgetFrame<32){this.raf=requestAnimationFrame(t=>this[key](t));return;}this.lastBudgetFrame=now;return original.call(this,now);};}
