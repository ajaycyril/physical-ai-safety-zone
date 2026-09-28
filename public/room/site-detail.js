import * as T from 'three';
import {Facility} from './facility.js';
import {CityScene} from './city-scene.js';
// Ancillary equipment is procedural context, not another physical/OEM connection.
// The original MuJoCo model and interlocked junction controller remain authoritative.
let active;
const palettes={floor:0x687583,steel:0xb9c4cf,dark:0x263340,teal:0x568f91,mint:0x8dd6ba,amber:0xd6ab64,blue:0x5d809c};
function kit(root){
 const batches=new Map(),materials=new Map(),geometries={box:new T.BoxGeometry(1,1,1),cyl:new T.CylinderGeometry(1,1,1,12),sphere:new T.SphereGeometry(1,10,8)};
 const matrix=new T.Matrix4(),q=new T.Quaternion(),euler=new T.Euler(),scale=new T.Vector3(),pos=new T.Vector3();
 const material=color=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.65,metalness:.2}));return materials.get(color);};
 function shape(type,color,xyz,dims,rot=[0,0,0],parent){
  if(parent){const m=new T.Mesh(geometries[type],material(color));m.position.set(...xyz);m.scale.set(...dims);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  const key=type+':'+color;if(!batches.has(key))batches.set(key,{type,color,items:[]});q.setFromEuler(euler.set(...rot));matrix.compose(pos.set(...xyz),q,scale.set(...dims));batches.get(key).items.push(matrix.clone());
 }
 const box=(x,y,z,w,h,d,c=palettes.steel,parent)=>shape('box',c,[x,y,z],[w,h,d],[0,0,0],parent);
 const cylinder=(x,y,z,r,h,c=palettes.steel,parent)=>shape('cyl',c,[x,y,z],[r,h,r],[0,0,0],parent);
 function pipe(a,b,r,c=palettes.teal){const from=new T.Vector3(...a),to=new T.Vector3(...b),delta=to.clone().sub(from);q.setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());euler.setFromQuaternion(q);shape('cyl',c,from.add(to).multiplyScalar(.5).toArray(),[r,delta.length(),r],euler.toArray().slice(0,3));}
 function finish(){for(const{type,color,items}of batches.values()){const m=new T.InstancedMesh(geometries[type],material(color),items.length);items.forEach((a,j)=>m.setMatrixAt(j,a));m.instanceMatrix.needsUpdate=true;m.castShadow=true;m.receiveShadow=true;m.computeBoundingSphere();root.add(m);}return[...batches.values()].reduce((n,b)=>n+b.items.length,0);}
 return{box,cylinder,pipe,shape,finish,material,geometries};
}
function plate(root,text,x,z,width=3.6){const c=document.createElement('canvas');c.width=768;c.height=112;const g=c.getContext('2d');g.fillStyle='#273b48';g.fillRect(0,0,768,112);g.fillStyle='#91bbbe';g.fillRect(0,0,8,112);g.fillStyle='#e0eef2';g.font='500 36px monospace';g.fillText(text,28,70);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;const mesh=new T.Mesh(new T.PlaneGeometry(width,width*112/768),new T.MeshBasicMaterial({map:tx,side:T.DoubleSide}));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.036,z);root.add(mesh);return mesh;}
function fence(k,x,z,w,d){for(const y of[0,.9]){k.box(x,y+.22,z-d/2,w,.032,.032,palettes.amber);k.box(x,y+.22,z+d/2,w,.032,.032,palettes.amber);}for(const px of[x-w/2,x+w/2]){k.box(px,.63,z,.035,1.2,d,palettes.dark);for(let i=0;i<6;i++)k.box(px,.68,z-d/2+i*d/5,.04,1.15,.04,palettes.amber);}for(let i=0;i<11;i++){k.box(x-w/2+i*w/10,.68,z-d/2,.014,1.0,.014,0x64717a);k.box(x-w/2+i*w/10,.68,z+d/2,.014,1.0,.014,0x64717a);}}
function manipulator(k,root,x,z){const g=new T.Group();g.position.set(x,0,z);root.add(g);k.box(0,.1,0,.66,.2,.66,palettes.dark,g);k.cylinder(0,.35,0,.22,.45,palettes.steel,g);const base=new T.Group();base.position.y=.62;g.add(base);const shoulder=new T.Group();base.add(shoulder);k.box(0,.42,0,.19,.88,.2,palettes.teal,shoulder);k.cylinder(0,0,0,.19,.15,palettes.dark,shoulder).rotation.z=Math.PI/2;const elbow=new T.Group();elbow.position.y=.83;shoulder.add(elbow);k.box(.46,0,0,.92,.14,.16,palettes.steel,elbow);k.cylinder(0,0,0,.13,.2,palettes.dark,elbow).rotation.z=Math.PI/2;k.box(.99,-.14,0,.17,.24,.22,palettes.dark,elbow);for(const z0 of[-.14,.14])k.box(.99,-.29,z0,.08,.18,.05,palettes.amber,elbow);return{base,shoulder,elbow};}
function factory(i){
 const root=new T.Group();root.name='Factory site context / simulated dependencies';root.rotation.x=Math.PI/2;i.scene.add(root);const k=kit(root);const{box,cylinder,pipe}=k;
 box(0,-.23,-1.35,20,.34,15.6,0x606c7a);
 for(let x=-10;x<=10;x++)box(x,-.046,-1.35,.014,.011,15.4,0x93a0ab);
 for(let z=-9;z<=6;z++)box(0,-.045,z,19.8,.01,.014,0x93a0ab);
 box(0,.07,-6.85,11,.1,4.1,0x778894);fence(k,-2.65,-6.8,4.1,2.8);fence(k,2.4,-6.8,4.1,2.8);
 const arms=[manipulator(k,root,-3.25,-6.65),manipulator(k,root,2,-6.65)];
 for(const x of[-2.55,2.5]){box(x,.7,-7.55,3.5,.14,.68,palettes.dark);for(let n=0;n<18;n++)k.shape('cyl',palettes.steel,[x-1.65+n*.185,.8,-7.55],[.065,.65,.065],[Math.PI/2,0,0]);for(const px of[x-1.4,x+1.4])for(const zz of[-7.75,-7.35])box(px,.38,zz,.07,.75,.07,palettes.dark);box(x+.95,1.55,-7.55,.12,1.5,.13,palettes.dark);box(x+.95,2.3,-7.55,.45,.14,.38,palettes.steel);box(x+.94,2.19,-7.55,.2,.015,.21,palettes.mint);}
 // Steel racks, pallet bins and service corridor.
 for(const x of[-8.6,8.6])for(const z of[-6.8,-3.7,.1]){for(const px of[x-.7,x+.7])for(const pz of[z-1.15,z+1.15])box(px,1.42,pz,.075,2.84,.075,palettes.blue);for(let l=0;l<3;l++){const y=.23+l*.86;box(x,y,z,1.6,.085,2.5,palettes.amber);for(let p=0;p<3;p++){box(x,y+.32,z-.8+p*.8,1.12,.57,.64,(l+p)%2?0x839ca8:0xbda77b);for(const xx of[-.39,.39])box(x+xx,y+.33,z-.8+p*.8,.045,.57,.655,0x3c5463);}}}
 // Utility headers, cable trays and instrument drops.
 for(const x of[-5.9,0,5.9]){box(x,1.98,-8.4,.14,4,.14,palettes.dark);box(x,1.98,-4.75,.14,4,.14,palettes.dark);}for(const z of[-8.4,-4.75])box(0,4.05,z,12.1,.16,.16,palettes.dark);
 for(let j=0;j<4;j++)pipe([-5.8,3.55+j*.15,-4.95],[5.75,3.55+j*.15,-4.95],j===0?.085:.047,[palettes.teal,0xc8ba90,0x94a0b7,0x677d96][j]);
 for(let n=0;n<30;n++)box(-5.8+n*.4,3.15,-4.95,.035,.045,.62,palettes.steel);for(const z of[-5.25,-4.65])box(0,3.17,z,11.8,.06,.055,palettes.steel);
 for(const x of[-5.3,5.1]){pipe([x,3.55,-4.95],[x,.52,-4.95],.08,palettes.teal);for(let n=0;n<7;n++)cylinder(x,.6+n*.39,-4.95,.113,.048,palettes.steel);box(x,.5,-4.6,.53,.8,.36,palettes.blue);}
 for(let n=0;n<2;n++){const x=6.6,z=-6.9+n*2.05;box(x,.5,z,1.55,.9,1.5,0x9bb1b8);for(let f=0;f<12;f++)box(x-.65+f*.12,.98,z,.04,.08,1.32,palettes.dark);cylinder(x,1.16,z,.39,.18,palettes.dark);for(let a=0;a<6;a++)k.shape('box',palettes.steel,[x,1.27,z],[.67,.022,.08],[0,a*Math.PI/3,0]);pipe([x,.4,z],[5.1,.4,-4.95],.054,palettes.teal);}
 for(const x of[-5.5,-4.65,-3.8]){box(x,.94,-8.6,.7,1.85,.4,palettes.steel);box(x,1.25,-8.375,.48,.36,.02,palettes.dark);box(x,1.27,-8.353,.4,.25,.018,0x79b6b0);box(x+.25,.65,-8.36,.045,.25,.018,palettes.dark);}
 for(const x of[-6.65,6.65]){box(x,.01,-.8,.038,.025,9.1,palettes.amber);for(let z=-4.7;z<3.3;z+=.7)box(x+.24,.016,z,.05,.015,.26,palettes.amber);}
 box(-7,.04,4.4,3.1,.07,1.7,0x3c555f);for(let j=0;j<3;j++)box(-8+j*.8,.13,4.4,.55,.13,1.12,palettes.dark);
 const agv=new T.Group();root.add(agv);box(0,.22,0,.8,.32,1.18,palettes.blue,agv);box(0,.43,0,.64,.09,.95,palettes.steel,agv);box(0,.67,0,.56,.41,.76,0xbcaa80,agv);for(const x of[-.42,.42])for(const z of[-.4,.4])cylinder(x,.16,z,.135,.1,palettes.dark,agv).rotation.z=Math.PI/2;box(0,.29,-.61,.6,.07,.02,palettes.mint,agv);
 for(const[text,x,z,w]of[['01 / COOLING & RECOVERY',2.5,3.65,4.2],['02 / ASSEMBLY',-2.8,-5.18,3.4],['03 / VISION QA',2.5,-5.18,3.5],['SERVICE ACCESS',-6.25,3.7,2.6]])plate(root,text,x,z,w);
 for(let j=0;j<20;j++)k.shape('box',j%2?0x39434e:palettes.amber,[-5.5+j*.25,.023,-4.35],[.19,.012,.12],[0,-.7,0]);
 for(const x of[-5.9,0,5.9])for(const z of[-8.4,-4.75]){box(x,.065,z,.4,.11,.4,palettes.steel);for(const dx of[-.13,.13])for(const dz of[-.13,.13])cylinder(x+dx,.135,z+dz,.025,.04,palettes.dark);}
 const cartons=[];for(let j=0;j<8;j++){const g=new T.Group();root.add(g);box(0,.16,0,.36,.3,.48,0xbaa580,g);box(0,.32,0,.055,.013,.48,0xe1d8bd,g);cartons.push(g);}
 const lamps=[];for(const x of[-4.45,.75]){box(x,1.24,-5.7,.055,2.5,.055,palettes.dark);const m=new T.Mesh(new T.SphereGeometry(.075,10,8),new T.MeshBasicMaterial({color:palettes.amber}));m.position.set(x,2.54,-5.7);root.add(m);lamps.push(m);}
 i.fs={kind:'factory',root,arms,agv,cartons,lamps,clock:0,cycle:0,lastT:0,permit:false,pieces:0,count:k.finish(),mode:'site'};
 i.scene.fog=new T.Fog(0x101019,32,66);i.camera.position.set(-15.2,-18.6,17.3);i.controls.target.set(0,1.1,.3);i.controls.maxDistance=38;
 i.fs.targets={site:[[-15.2,-18.6,17.3],[0,1.1,.3]],process:[[-7.6,-8.1,7.8],[1,.4,.6]],assembly:[[-9,-4,10.5],[0,6.1,.7]]};root.traverse(o=>o.layers.enable(1));
}
function city(i){
 const root=new T.Group();root.name='District infrastructure / illustrative assets';i.scene.add(root);const k=kit(root),{box,cylinder}=k;
 box(0,-.36,-2,42,.38,39,0x505f6c);box(0,-.15,-16.4,40,.12,3.1,0x293744);box(16.6,-.14,-1.5,3.1,.12,29,0x293744);
 for(let x=-19;x<=19;x+=1.8)box(x,-.073,-16.4,.85,.012,.044,0xb9b5a5);for(let z=-14;z<=12;z+=1.8)box(16.6,-.065,z,.044,.012,.85,0xb9b5a5);
 // Elevated transit is timetable context, not a connected railway feed.
 for(let x=-18;x<=18;x+=4.5){box(x,1.9,-18.2,.45,4,.58,0xa4b3ba);box(x,3.9,-18.2,1.15,.35,2.2,0xc6cece);}
 box(0,4.14,-18.2,41,.34,2.25,0x86969f);for(const z of[-18.85,-17.55])box(0,4.36,z,41,.09,.067,palettes.steel);for(let x=-20;x<20;x+=.65)box(x,4.31,-18.2,.09,.07,1.64,palettes.dark);
 box(6,4.29,-20.0,9,.16,1.85,0xaabbbf);for(const x of[2,4.6,7.3,10]){box(x,5.45,-20.7,.07,2.6,.07,palettes.steel);box(x,6.7,-19.9,.065,.055,2.05,palettes.steel);}box(6,6.78,-19.9,9.5,.12,2.3,0x859da7);for(let j=0;j<8;j++)box(2+j*1.15,4.65,-19.15,.9,.56,.03,0x697f8d);
 for(const[x,z,w,d,h]of[[-18,-9,3.6,6,3.7],[19,-9,3.5,5.3,5.2],[19,1.2,3.2,6.5,4.5],[19,9,3.1,5,2.7],[-17,8,4,5,2.4],[-8,-21,4.1,2.4,5],[0,-21,3.7,2.8,6.2]]){
  box(x,h/2-.04,z,w,h,d,0x97a9b7);box(x,h+.03,z,w+.18,.13,d+.18,0xc2cfd0);
  for(let l=0;l<Math.floor(h/.55);l++)for(let j=0;j<Math.floor(w/.48);j++)box(x-w*.44+j*.48,.42+l*.55,z+d/2+.01,.33,.32,.022,(j+l)%7===0?0xb4d9d0:0x486678);
  for(let l=0;l<Math.floor(h/.55);l++)for(let j=0;j<Math.floor(d/.58);j++)box(x-w/2-.015,.42+l*.55,z-d*.44+j*.58,.022,.32,.41,0x4a6579);
  box(x-w*.28,h+.35,z,.54,.58,d*.45,palettes.dark);for(let j=0;j<3;j++){box(x+.43,h+.3,z-d*.22+j*.67,.82,.43,.54,0x6a7e8c);cylinder(x+.43,h+.54,z-d*.22+j*.67,.18,.04,palettes.dark);}
 }
 for(let n=0;n<13;n++){const z=-12+n*1.65;box(14.6,-.015,z,.4,.018,1.15,0x709c98);box(18.7,.03,z,.025,.023,.82,0xf0e7ce);}
 for(const x of[-14.9,14.7])for(const z of[-11,-5,1,7,12]){cylinder(x,1.8,z,.045,3.6,palettes.dark);box(x+.3,3.58,z,.68,.07,.19,0xbdc9cd);box(x+.5,3.53,z,.24,.012,.13,0xfbe9ba);}
 for(const[x,z]of[[-14.9,3.4],[14.8,-8]]){box(x,.48,z,.7,.85,3.0,0x405561);box(x,1.25,z,.07,1.5,3.1,palettes.steel);box(x,2.05,z,1.3,.1,3.8,0x87aab0);for(let n=0;n<3;n++)box(x+.35,.5,z-.9+n*.9,.52,.07,.58,0xb0c1bc);}
 box(-16.7,.03,-.6,4,.09,4.7,0x334452);for(let j=0;j<6;j++){box(-18.1+j*.57,.78,-.6,.025,1.5,4.6,0x7a929b);box(-18.1+j*.57,1.55,-.6,.52,.04,4.6,0x3c5f78);}for(const z of[-2.5,1.5])for(const x of[-18.1,-15.2])box(x,.8,z,.07,1.6,.07,palettes.steel);
 box(-17.4,.05,-14.1,5,.16,2.4,0x607785);for(const x of[-19,-17.6,-16.2]){box(x,.65,-14.1,1.05,1.1,1.6,0xa5bbbd);for(let n=0;n<8;n++)box(x-.46+n*.13,1.27,-14.1,.055,.09,1.45,palettes.dark);cylinder(x,1.47,-14.1,.32,.25,0x719097);}
 for(const[text,x,z,w]of[['TRANSIT / T-01',5,-16,6],['DISTRICT UTILITIES',-17.4,-12.55,4.1],['SERVICE / CHARGING',-16.7,2.1,3.8]])plate(root,text,x,z,w);
 const train=new T.Group();root.add(train);for(let j=0;j<4;j++){const x=-j*2;box(x,.35,0,1.85,.56,1.13,0xc0d6d5,train);box(x,.81,0,1.77,.42,.98,0x8faeb3,train);for(let w=0;w<3;w++){box(x-.56+w*.55,.83,.505,.4,.24,.024,0x223f54,train);box(x-.56+w*.55,.83,-.505,.4,.24,.024,0x223f54,train);}box(x,.05,0,1.5,.15,.83,palettes.dark,train);box(x,.25,.58,1.8,.065,.025,palettes.mint,train);}
 const satellites=[];for(let j=0;j<5;j++){const car=new T.Group();root.add(car);box(0,.27,0,1.05,.36,.57,[0x809aa8,0xbeaa8e,0x77a39a][j%3],car);box(-.05,.55,0,.6,.22,.51,0x405869,car);satellites.push(car);}
 i.fs={kind:'city',root,train,satellites,count:k.finish(),mode:'site',clock:0};
 i.scene.fog.density=.008;i.camera.position.set(-30,29,34);i.controls.target.set(0,.6,-2.3);i.camera.far=180;i.camera.updateProjectionMatrix();i.controls.maxDistance=72;
 i.fs.targets={site:[[-30,29,34],[0,.6,-2.3]],process:[[-17,17,19],[0,.6,0]],assembly:[[-7,17,-2],[3,3,-17]]};
}
function update(i){const f=i.fs;if(!f)return;const s=i.replay||i.viewOverride||(f.kind==='city'?i.model:i.state),t=s.t||0;f.clock=t;
 if(f.kind==='factory'){
  const dt=Math.max(0,Math.min(.1,t-f.lastT));if(t<f.lastT){f.cycle=0;f.pieces=0;}f.lastT=t;f.permit=(i.process?.flow||0)>45&&!i.holds.size;f.cycle+=dt*(f.permit?1:0);f.pieces=Math.floor(f.cycle/7)*2;
  for(let j=0;j<f.arms.length;j++){const a=f.arms[j],v=f.cycle*.6+j*2;a.base.rotation.y=Math.sin(v)*.45;a.shoulder.rotation.z=-.4+Math.sin(v+.6)*.32;a.elbow.rotation.z=-.4+Math.cos(v)*.25;}
  for(let j=0;j<f.cartons.length;j++){const lane=j<4?0:1;f.cartons[j].position.set((lane?2.5:-2.55)-1.65+((f.cycle*.22+(j%4)*.83)%3.3),.9,-7.55);}
  f.agv.position.set(-6.9,.04,Math.sin(t*.075)*3.3-.7);f.agv.rotation.y=Math.cos(t*.075)>0?Math.PI:0;for(const m of f.lamps)m.material.color.setHex(f.permit?palettes.mint:palettes.amber);
 }else{const cycle=t%65,head=cycle<42?-19+cycle*.74:12;f.train.position.set(head,4.48,-18.2);for(let j=0;j<f.satellites.length;j++)f.satellites[j].position.set(-20+((t*.7+j*8.5)%40),0,-16.7);}
}
function entities(i){const f=i?.fs;if(!f)return[];const t=f.clock||0;
 if(f.kind==='factory')return[
 {id:'LINE-A',label:'Assembly / cooling dependency',type:'Modeled production',basis:'SIMULATED',status:f.permit?'Producing':'Cooling interlock',source:'Scene dependency model / process.flow',rows:[['Cooling supply',(i.process?.flow||0).toFixed(1)+' L/min'],['Release threshold','>45 L/min'],['Cell state',f.permit?'Cycle enabled':'Inhibited'],['Completed units',f.pieces]],note:'Procedural production cells are coupled to modeled cooling flow. They are not additional MuJoCo or OEM robot connections.'},
 {id:'LOG-01',label:'Logistics service corridor',type:'Modeled context',basis:'SIMULATED',status:'Scheduled service route',source:'Scene-local deterministic shuttle',rows:[['Axis position',f.agv.position.z.toFixed(2)+' m'],['Linked evidence','CAM-L02'],['Command access','Read only'],['Clock',t.toFixed(1)+' s']],note:'Independent recorded loading footage constrains R-07 routing, not this visual shuttle. No cross-camera identity is inferred.'}
 ];return[
 {id:'T-01',label:'Transit / district context',type:'Modeled context',basis:'SIMULATED',status:t%65<42?'In transit':'Station dwell',source:'Scene-local timetable',rows:[['Train head',f.train.position.x.toFixed(1)+' m'],['Train consist','4 modeled cars'],['Dwell',t%65<42?'Not at station':Math.ceil(65-t%65)+' s'],['Authority','Read only / no rail adapter']],note:'Illustrative transit context. No railway feed or signaling connection. J-01 remains the executable traffic target.'},
 {id:'UTIL-01',label:'District utilities',type:'Modeled asset',basis:'SIMULATED',status:'Registered context',source:'Authored asset inventory',rows:[['Location','Western service compound'],['Equipment','3 heat-rejection units'],['Region','WX-AD external weather'],['Authority','Read only']],note:'Authored district assets provide spatial/operational context, not live municipal telemetry.'}
 ];}
for(const[proto,kind,start,frame]of[[Facility.prototype,'factory','makeScene','animate'],[CityScene.prototype,'city','init','frame']]){
 const originalStart=proto[start];if(kind==='city')proto[start]=async function(...a){const v=await originalStart.apply(this,a);city(this);active=this;enablePicking(this);return v;};else proto[start]=function(...a){const v=originalStart.apply(this,a);factory(this);active=this;enablePicking(this);return v;};
 const originalFrame=proto[frame];proto[frame]=function(...a){if(!this.disposed)update(this);return originalFrame.apply(this,a);};
 const originalSnap=proto.snapshot;proto.snapshot=function(){const s=originalSnap.call(this);if(this.fs)s.siteContext={basis:'SIMULATED',assets:entities(this).map(e=>({id:e.id,state:e.status})),pieces:this.fs.pieces??null};return s;};
}
function focus(mode){const i=active,f=i?.fs;if(!f)return;const target=f.targets[mode];if(!target)return;i.piMotion=false;i.controls.autoRotate=false;i.controls.enabled=true;if(f.kind==='city')i.view='overview';else{i.cameraMode='overview';i.autoFocus=false;i.actionFocus=null;}i.piTransition={start:performance.now(),from:i.camera.position.clone(),to:new T.Vector3(...target[0]),lookFrom:i.controls.target.clone(),lookTo:new T.Vector3(...target[1])};f.mode=mode;}
function enablePicking(i){const c=i.renderer.domElement;let down;const ray=new T.Raycaster(),pointer=new T.Vector2();c.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});c.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>4)return;const rect=c.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);ray.setFromCamera(pointer,i.camera);const hit=ray.intersectObject(i.fs.root,true)[0];if(!hit)return;const p=hit.point;const id=i.fs.kind==='factory'?(p.y>4.65&&Math.abs(p.x)<5.8?'LINE-A':p.x< -6?'LOG-01':null):(p.z< -16.5?'T-01':p.x< -14&&p.z< -11?'UTIL-01':null);if(id)window.__console?.pick(id);});}
window.__siteDetail={entities:()=>entities(active),focus,info:()=>({kind:active?.fs?.kind,instances:active?.fs?.count||0,mode:active?.fs?.mode,render:active?.renderer?.info.render,context:'Modeled site context; the original controller remains authoritative.'})};
