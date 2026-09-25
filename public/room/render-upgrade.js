import * as T from 'three';
import {CityScene} from './city-scene.js';
import {Facility} from './facility.js';
import {CityVision} from './city-vision.js';
let active=null;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clone=v=>v==null?null:JSON.parse(JSON.stringify(v));
export const renderBridge={
 info(){if(!active)return{};const i=active.instance;return{kind:active.kind,target:clone(i.target),droneTarget:i.droneTarget?.toArray()||null,holds:[...(i.holds||[])],motion:!!i.piMotion};},
 predict(){return active?.kind==='city'?active.instance.model.projection():null;},
 focus(id){if(active)focus(active.instance,active.kind,id);},
 motion(on){if(active){active.instance.piMotion=on;active.instance.controls.autoRotate=on&&!reduced;}},
};
function anchor(i,kind,id){
 if(kind==='city'){if(id==='D-01')return i.drone.position.clone().add(new T.Vector3(0,.55,0));if(id==='F-01')return i.van.position.clone().add(new T.Vector3(0,1.1,0));return new T.Vector3(0,.8,0);}
 if(id==='R-07')return new T.Vector3(i.state.x,i.state.y,1.2);if(id==='V-12')return new T.Vector3(2.78,.05,1.22);return new T.Vector3(3.05,1.55,2.1);
}
function focus(i,kind,id){const p=anchor(i,kind,id);i.piMotion=false;i.controls.autoRotate=false;i.controls.enabled=true;if(kind==='city')i.view='overview';else{i.cameraMode='overview';i.autoFocus=false;i.actionFocus=null;}i.piTransition={start:performance.now(),from:i.camera.position.clone(),to:p.clone().add(kind==='city'?new T.Vector3(-7,6,8):new T.Vector3(-3.8,-4.2,3)),lookFrom:i.controls.target.clone(),lookTo:p};i.piSelected=id;}
function install(i,kind){
 active={instance:i,kind};i.piMotion=!reduced;i.controls.autoRotate=!reduced;i.controls.autoRotateSpeed=.16;i.piLastLabels=0;
 i.controls.addEventListener('start',()=>{i.piMotion=false;i.controls.autoRotate=false;i.piTransition=null;});
 const host=i.host;const overlay=document.createElement('div');overlay.className='pi-entity-pins';overlay.setAttribute('aria-label','Inspect scene entities');host.parentElement.append(overlay);i.piPins=[];
 for(const id of kind==='city'?['J-01','D-01','F-01']:['P-204','R-07','V-12']){const b=document.createElement('button');b.type='button';b.className='pi-entity-pin';b.dataset.entity=id;b.setAttribute('aria-label','Inspect '+id);b.innerHTML='<i></i><b>'+id+'</b><span>↗</span>';b.onclick=()=>{focus(i,kind,id);window.dispatchEvent(new CustomEvent('pi:inspect',{detail:{id}}));};overlay.append(b);i.piPins.push({id,b});}
 const color=kind==='city'?0x95dece:0xc1a8f5;
 i.piRing=new T.Mesh(new T.RingGeometry(kind==='city'?1.1:.68,kind==='city'?1.14:.71,48),new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:true,opacity:.45,depthWrite:false}));if(kind==='city')i.piRing.rotation.x=-Math.PI/2;i.scene.add(i.piRing);
 if(kind==='city'){
  const curves=[new T.QuadraticBezierCurve3(new T.Vector3(-6.8,2.25,-2.8),new T.Vector3(-3,4.8,-1.4),new T.Vector3(0,.3,0)),new T.QuadraticBezierCurve3(new T.Vector3(2.85,2.25,5),new T.Vector3(2,4.2,2),new T.Vector3(0,.3,0))];
  i.piSignals=curves.map(curve=>{const line=new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(48)),new T.LineBasicMaterial({color,transparent:true,opacity:.16}));i.scene.add(line);const dots=[];for(let n=0;n<3;n++){const d=new T.Mesh(new T.SphereGeometry(.055,8,6),new T.MeshBasicMaterial({color}));i.scene.add(d);dots.push(d);}return{curve,line,dots};});
 }
}
function update(i,kind,now){
 if(!i.piPins)return;
 if(i.piTransition){const t=Math.min(1,(now-i.piTransition.start)/1100),s=t*t*(3-2*t);i.camera.position.lerpVectors(i.piTransition.from,i.piTransition.to,s);i.controls.target.lerpVectors(i.piTransition.lookFrom,i.piTransition.lookTo,s);if(t>=1)i.piTransition=null;}
 const overview=kind==='city'?i.view==='overview':i.cameraMode==='overview';i.controls.autoRotate=overview&&i.piMotion&&!reduced&&!i.piTransition;
 const p=anchor(i,kind,i.piSelected||(kind==='city'?'J-01':'R-07'));if(kind==='city')i.piRing.position.set(p.x,.075,p.z);else i.piRing.position.set(p.x,p.y,.02);i.piRing.material.color.setHex(i.holds.size?0xe6b87e:kind==='city'?0x95dece:0xc1a8f5);i.piRing.scale.setScalar(1+(reduced?0:.05*Math.sin(now*.002)));
 for(const signal of i.piSignals||[])signal.dots.forEach((d,n)=>{d.visible=!document.body.classList.contains('pi-exploring');d.position.copy(signal.curve.getPoint((now*.00012+n/3)%1));});
 if(now-i.piLastLabels<130)return;i.piLastLabels=now;
 const w=i.host.clientWidth,h=i.host.clientHeight,placed=[];
 for(const pin of i.piPins){const a=anchor(i,kind,pin.id).project(i.camera);if(a.z<0||a.z>1||Math.abs(a.x)>1.2||Math.abs(a.y)>1.2||w<220||h<210){pin.b.hidden=true;continue;}
  let x=(a.x+1)*w/2,y=(1-a.y)*h/2;const labelW=96,labelH=30;let found=null;
  const blocked=[{x:0,y:0,w:Math.min(w,320),h:115},{x:Math.max(0,w-215),y:h-245,w:215,h:245},{x:0,y:h-72,w,h:72}];
  for(const [ox,oy]of [[-48,-35],[10,-35],[-106,-35],[-48,12],[10,12],[-106,12]]){const r={x:Math.max(10,Math.min(w-labelW-10,x+ox)),y:Math.max(50,Math.min(h-labelH-76,y+oy)),w:labelW,h:labelH};if(![...placed,...blocked].some(b=>r.x<b.x+b.w&&r.x+r.w>b.x&&r.y<b.y+b.h&&r.y+r.h>b.y)){found=r;break;}}
  pin.b.hidden=!found;if(found){pin.b.style.transform=`translate(${found.x}px,${found.y}px)`;pin.b.classList.toggle('selected',i.piSelected===pin.id);placed.push(found);}
 }
}
for(const [proto,kind,start,frame]of [[CityScene.prototype,'city','init','frame'],[Facility.prototype,'factory','makeScene','animate']]){
 const label=proto.label;proto.label=function(...args){const s=label.apply(this,args);s.visible=false;return s;};
 const init=proto[start];if(kind==='city')proto[start]=async function(...args){const r=await init.apply(this,args);install(this,kind);return r;};else proto[start]=function(...args){const r=init.apply(this,args);install(this,kind);return r;};
 const originalFrame=proto[frame];proto[frame]=function(now){if(!this.disposed)update(this,kind,now);return originalFrame.call(this,now);};
 const view=proto.setView;proto.setView=function(v,...args){const pos=this.camera.position.clone(),look=this.controls.target.clone();this.piTransition=null;const r=view.call(this,v,...args);if(v==='overview'&&!reduced){this.piTransition={start:performance.now(),from:pos,to:this.camera.position.clone(),lookFrom:look,lookTo:this.controls.target.clone()};this.camera.position.copy(pos);this.controls.target.copy(look);}return r;};
}
// Keep detection annotations inside the video and suppress overlapping labels.
CityVision.prototype.draw=function(s,w,h){const canvas=s.overlay;canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');c.lineWidth=2.5;c.font='24px sans-serif';const occupied=[];let labels=0;for(const d of [...s.tracks].sort((a,b)=>b.score-a.score)){const b=d.box,color=d.label==='person'?'#f4c88c':'#9deacf';c.strokeStyle=color;c.strokeRect(b.x,b.y,b.w,b.h);if(labels>=2)continue;const text=d.label+' '+Math.round(d.score*100)+'%',tw=c.measureText(text).width+18;const x=Math.max(4,Math.min(w-tw-4,b.x)),y=Math.max(4,Math.min(h-62,b.y<35?b.y+8:b.y-34));const r={x,y,w:tw,h:32};if(occupied.some(q=>r.x<q.x+q.w&&r.x+r.w>q.x&&r.y<q.y+q.h&&r.y+r.h>q.y))continue;c.fillStyle='#0b1520ee';c.fillRect(x,y,tw,32);c.fillStyle=color;c.fillText(text,x+9,y+24);occupied.push(r);labels++;}};
