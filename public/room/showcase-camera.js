import * as T from 'three';
import {CityScene} from './city-scene.js';
import {Facility} from './facility.js';
let current=null,view='auto',last=0,report=null,initialized=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function update(i,kind,now){if(!document.body.classList.contains('presenter-mode'))return;const city=kind==='city',host=i.host,pin=document.getElementById('plExecutorPin');if(!i.camera||!host.clientHeight)return;current=i;
 if(!initialized){initialized=true;i.controls.addEventListener('start',()=>{view='manual';});i.controls.minDistance=city?6:3;i.controls.enableDamping=true;i.controls.dampingFactor=.075;}
 const dt=last?Math.min(.1,(now-last)/1000):.016;last=now;const raw=(city?window.__city:window.__room)?.state(),phase=raw?.phase??-1;
 const executor=city?i.drone.position.clone():new T.Vector3(i.state.x,i.state.y,.9);
 if(view==='auto'){
  i.piTransition=null;i.piMotion=false;i.controls.autoRotate=false;i.autoFocus=false;i.actionFocus=null;i.controls.enabled=true;
  let target,offset;if(city){i.view='overview';const moving=i.droneState!=='Docked';target=moving?executor.clone().multiplyScalar(.75).add(new T.Vector3(0,.4,0)):new T.Vector3(-3.5,1.8,3.4);offset=moving?new T.Vector3(-10,12,13):new T.Vector3(-18,19,21);}
  else{i.cameraMode='overview';const close=phase>=4&&raw?.status!=='COMPLETE';target=close?executor.clone().lerp(new T.Vector3(2.6,.8,1),.3):new T.Vector3(0,1.2,.6);offset=close?new T.Vector3(-6.4,-7.3,6):new T.Vector3(-11.8,-13.2,12.3);}
  const blend=reduced?1:1-Math.exp(-2.6*dt);i.camera.position.lerp(target.clone().add(offset),blend);i.controls.target.lerp(target,blend);
 }
 // Project the actual executor; the label does not move or fabricate the device.
 i.camera.updateMatrixWorld();const p=executor.clone().add(city?new T.Vector3(0,.65,0):new T.Vector3(0,0,.5)).project(i.camera);const w=host.clientWidth,h=host.clientHeight,onScreen=p.z>-1&&p.z<1&&Math.abs(p.x)<.95&&Math.abs(p.y)<.93;
 if(pin){pin.hidden=!onScreen;pin.style.left=Math.max(12,Math.min(w-190,(p.x+1)*w/2+16))+'px';pin.style.top=Math.max(58,Math.min(h-75,(1-p.y)*h/2-18))+'px';const text=city?'D-01 · '+i.droneState:'R-07 · '+(i.state.speed>.03?'Moving':phase===4?'Inspecting':'On site');if(pin.textContent!==text)pin.textContent=text;}
 report={kind,view,onScreen,position:executor.toArray(),camera:i.camera.position.toArray(),width:w,height:h,phase};
}
for(const [proto,kind,name]of[[CityScene.prototype,'city','frame'],[Facility.prototype,'factory','animate']]){const original=proto[name];proto[name]=function(now){if(!this.disposed)update(this,kind,now);return original.call(this,now);};}
window.__showcaseCamera={set:mode=>{view=mode==='manual'?'manual':'auto';},state:()=>report};
