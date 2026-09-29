import * as T from 'three';
import {kit,plate} from './site-detail.js';
import {surfaceTexture} from '../urban-detail.js';
export function enrichSite(i,kind){
 if(i.realism)return;
 const root=new T.Group();root.name='Detailed site infrastructure';if(kind==='factory')root.rotation.x=Math.PI/2;i.scene.add(root);
 const k=kit(root),{box,cylinder,pipe}=k,steel=0xaeb9bb,dark=0x34464e,light=0xc4c8c2,blue=0x657d86,sand=0xb5aa93;
 const slab=new T.Mesh(new T.BoxGeometry(kind==='factory'?32:66,.18,kind==='factory'?28:59),new T.MeshStandardMaterial({color:0xc1c6c3,map:surfaceTexture(T),roughness:.95}));slab.position.set(0,-.46,-2);slab.receiveShadow=true;root.add(slab);
 const asphalt=new T.MeshStandardMaterial({color:0x818c90,map:surfaceTexture(T,'asphalt'),roughness:1});
 function road(x,z,w,d){const m=new T.Mesh(new T.BoxGeometry(w,.045,d),asphalt);m.position.set(x,-.33,z);m.receiveShadow=true;root.add(m);}
 function railing(x,z,w,d){for(const y of[.55,1.05]){box(x,y,z,w,.035,.035,steel);box(x,y,z+d,w,.035,.035,steel);}for(let n=0;n<=Math.ceil(w/.75);n++){box(x-w/2+n*.75,.55,z,.045,1.1,.045,dark);box(x-w/2+n*.75,.55,z+d,.045,1.1,.045,dark);}}
 function finUnit(x,z,w=1.3){box(x,.67,z,w,1.3,1.4,blue);for(let n=0;n<10;n++)box(x-w*.44+n*w*.095,1.37,z,.04,.1,1.32,dark);cylinder(x,1.62,z,.38,.4,steel);cylinder(x,1.84,z,.3,.04,dark);pipe([x,.45,z],[x-1.3,.45,z],.09,blue);}
 function parked(x,z,color=light,turn=0){const g=new T.Group();g.position.set(x,-.23,z);g.rotation.y=turn;root.add(g);box(0,.34,0,1.7,.43,.78,color,g);box(-.08,.68,0,.88,.34,.71,0x45616d,g);for(const a of[-.55,.55])for(const b of[-.43,.43]){const w=cylinder(a,.22,b,.22,.1,dark,g);w.rotation.z=Math.PI/2;}return g;}
 const rotors=[];
 if(kind==='factory'){
  road(0,9.4,31,4.2);road(13.5,-1.4,4,23);road(-13.5,-1.4,4,23);
  for(let x=-14;x<15;x+=1.4)box(x,-.3,9.4,.7,.02,.07,0xe1d7ad);
  // Northern pipe bridge, process vessels and six-cell heat rejection train.
  for(let x=-12;x<=12;x+=4){box(x,2.1,-11,.2,4.7,.22,dark);box(x,4.3,-11,.45,.14,2.1,steel);}
  for(let n=0;n<6;n++)pipe([-12,3.7+n*.16,-11.8+n*.3],[12,3.7+n*.16,-11.8+n*.3],n<2?.105:.05,n<2?blue:steel);
  for(let j=0;j<4;j++){const x=-8+j*2.2,z=-12.5;cylinder(x,1.5,z,.68,3,steel);cylinder(x,3.05,z,.54,.14,light);cylinder(x,3.3,z,.16,.5,blue);for(const y of[.4,1.4,2.4])cylinder(x,y,z,.715,.075,dark);pipe([x,3.5,z],[x,3.5,-11],.07,blue);for(let n=0;n<10;n++){box(x+.76,.3+n*.28,z,.05,.03,.4,dark);box(x+.76,.3+n*.28,z-.22,.05,.28,.035,steel);box(x+.76,.3+n*.28,z+.22,.05,.28,.035,steel);}}
  for(let j=0;j<3;j++){const x=5+j*2.5,z=-12.4;box(x,.9,z,2.1,1.8,2.4,blue);for(let n=0;n<12;n++)box(x-.94+n*.17,.95,z+1.215,.06,1.55,.035,dark);cylinder(x,1.95,z,.83,.22,steel);const fan=new T.Group();fan.position.set(x,2.08,z);root.add(fan);for(let n=0;n<5;n++){const blade=box(0,0,0,1.4,.035,.12,steel,fan);blade.rotation.y=n*Math.PI/5;}rotors.push(fan);pipe([x,.3,z],[x,.3,-10],.11,blue);}
  // Loading apron, dock doors, trailers and pallet marshalling.
  for(let j=0;j<3;j++){const x=-7+j*4;box(x,1.45,5.6,3.1,2.9,.14,light);box(x,1.25,5.49,2.4,2.4,.035,dark);for(let n=0;n<12;n++)box(x,.2+n*.18,5.46,2.33,.12,.025,steel);for(const dx of[-1.4,1.4])cylinder(x+dx,.42,5.1,.085,.85,0xb29b5c);box(x,.58,6.5,2.1,.22,1.8,steel);}
  for(let j=0;j<2;j++){const x=-7+j*4;box(x,.85,8.7,2.1,1.3,3.1,0xb2bcb9);box(x,.48,10.7,2.05,.8,.8,blue);for(const dx of[-1.06,1.06])for(const z of[7.7,9.5]){k.shape('cyl',dark,[x+dx,.16,z],[.29,.13,.29],[0,0,Math.PI/2]);}}
  // Electrical compound with transformers, busbars and safety perimeter.
  for(let j=0;j<3;j++){const x=10.2,z=-5+j*3;box(x,.66,z,1.6,1.3,1.5,steel);for(let n=0;n<10;n++)box(x-.87,.6,z-.65+n*.14,.15,1,.045,dark);for(const a of[-.4,.4]){cylinder(x+a,1.62,z,.09,.65,0x8c766b);pipe([x+a,1.95,z],[x+a,2.9,z],.025,0x74695c);}pipe([x-.4,2.9,z],[x+.4,2.9,z],.035,steel);}railing(10.2,-6.2,2.7,8.4);
  // Maintenance annex with glass frontage, stairs and roof services.
  box(-10.5,1.4,-2.5,2.4,2.8,7.1,light);for(let j=0;j<8;j++)box(-9.28,1.5,-5.5+j*.8,.025,1.2,.55,0x425d6b);for(let j=0;j<3;j++){finUnit(-10.5,-4+j*2,.75);}for(let j=0;j<6;j++)box(-8.9+j*.18,.08+j*.08,1.1,.25,.1,1.1,steel);
  plate(root,'U2 / PROCESS + HEAT REJECTION',2,-10,6);plate(root,'L1 / LOADING APRON',-3,7,4);plate(root,'E1 / ELECTRICAL',10.2,3.3,3.4);
  i.fs.targets.site=[[-22,-25,23],[0,1,.6]];i.camera.position.set(...i.fs.targets.site[0]);i.controls.target.set(...i.fs.targets.site[1]);
 }else{
  road(0,19.2,63,5.8);road(-24,0,4,48);road(24,0,4,48);road(0,-27,63,4);
  // Multiple street blocks with glazing, floor slabs, balconies, services and setbacks.
  const blocks=[[-29,-18,4,5,6],[-29,-9,3.8,5,9],[-29,2,4.5,6,5],[-29,11,5,4,7],[29,-17,5,5,12],[29,-8,4,5,8],[29,1,5,5,10],[29,11,4,4,6],[-15,25,5,4,7],[-6,25,5,5,10],[5,25,5,4,8],[15,25,5,5,12]];
  for(const[x,z,w,d,h]of blocks){box(x,h/2-.3,z,w,h,d,0xb8beb9);box(x,h-.15,z,w+.22,.22,d+.22,light);for(let l=0;l<h/.7;l++){for(let j=0;j<w/.65;j++)for(const sign of[-1,1])box(x-w*.42+j*.63,.5+l*.65,z+sign*(d/2+.025),.42,.43,.035,(l+j)%8===0?0x9caaa7:0x48616e);for(let j=0;j<d/.7;j++)for(const sign of[-1,1])box(x+sign*(w/2+.025),.5+l*.65,z-d*.4+j*.66,.035,.43,.44,0x526b77);}for(let j=0;j<3;j++){box(x-w*.3+j*w*.3,h+.18,z,.8,.4,1.1,blue);cylinder(x-w*.3+j*w*.3,h+.45,z,.24,.08,dark);}box(x,.22,z+d/2+.9,w+1,.25,1.8,0xb7b5aa);}
  for(let x=-28;x<29;x+=1.6){box(x,-.29,19.2,.9,.015,.06,0xdddbc6);for(const z of[16.15,22.25])box(x,-.18,z,1.5,.18,.24,0xc3c1b5);}
  for(const x of[-20,-11,0,11,20]){for(let j=0;j<6;j++)box(x-1.3+j*.5,-.28,19.3,.3,.015,5.1,0xd9d6c3);}
  for(let j=0;j<12;j++){const x=-28+j*5,z=15.5;cylinder(x,1.5,z,.055,3.6,dark);box(x+.4,3.3,z,.9,.09,.24,steel);box(x+.65,3.25,z,.23,.02,.14,0xe8d9b5);cylinder(x,.5,z-.5,.075,1.5,dark);box(x,.85,z-.5,.18,.52,.2,dark);}
  for(let j=0;j<7;j++)parked(-17+j*5.2,20.5,[0xb6bdb9,0x677e87,0xaaa69c][j%3],Math.PI/2);
  // A coastal edge, palms, promenade furniture and service cameras.
  const water=new T.Mesh(new T.PlaneGeometry(12,59),new T.MeshStandardMaterial({color:0x506f7c,roughness:.32,metalness:.3}));water.rotation.x=-Math.PI/2;water.position.set(-39.5,-.42,0);root.add(water);road(-32.5,0,1.6,51);
  for(let z=-22;z<25;z+=4){cylinder(-31.8,1.25,z,.1,3,0x8b8069);for(let j=0;j<8;j++){const a=j*Math.PI/4;k.shape('box',0x596e5a,[-31.8+Math.cos(a)*.45,2.85,z+Math.sin(a)*.45],[1.3,.035,.24],[.16,a,.18]);}box(-33,.3,z,.45,.5,1.4,sand);cylinder(-32,1.7,z,.04,3.8,dark);box(-31.8,3.5,z,.38,.16,.15,light);}
  plate(root,'CORNICHE / ILLUSTRATIVE WATERFRONT',-27,10,6);plate(root,'DISTRICT CONNECTOR / LOCAL SIMULATION',0,16.1,9);
  i.fs.targets.site=[[-40,35,43],[0,1.1,0]];i.camera.position.set(...i.fs.targets.site[0]);i.controls.target.set(...i.fs.targets.site[1]);
 }
 const count=k.finish();i.fs.count+=count;
 root.traverse(o=>{o.layers.set(1);});i.camera.layers.enable(1);
 const known=kind==='factory'?['U2','E1','L1']:['DISTRICT','COAST'];
 i.realism={root,count,rotors,entities:()=>known.map(id=>({id,label:({U2:'Process & heat rejection',E1:'Electrical compound',L1:'Loading apron',DISTRICT:'Connected street blocks',COAST:'Waterfront infrastructure'})[id],type:'Site infrastructure',basis:'SIMULATED',status:id==='U2'?((i.process?.flow||0)>45?'Cooling enabled':'Cooling demand'):id==='L1'?'Loading schedule':'Registered context',source:'Authored site geometry / local state',rows:[['Geometry',count+' instanced components'],['State basis','Local model'],['Regional context',window.__environment?.weather?.basis||'Connecting'],['Authority','Read only context']],note:'Named site infrastructure, not a surveyed asset or a live municipal / plant connection.'}))};
 const canvas=i.renderer.domElement,ray=new T.Raycaster(),v=new T.Vector2();let down;
 canvas.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);canvas.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const r=canvas.getBoundingClientRect();v.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(v,i.camera);ray.layers.enable(1);const hit=ray.intersectObject(root,true)[0];if(!hit)return;const p=root.worldToLocal(hit.point.clone());const id=kind==='factory'?(p.z< -9?'U2':p.x>8?'E1':p.z>5?'L1':null):(p.x< -31.5?'COAST':Math.abs(p.x)>22||p.z>16?'DISTRICT':null);if(id)window.__console?.pick(id);});
 i.realism.update=dt=>{for(const fan of rotors)fan.rotation.y+=dt*((i.process?.flow||0)>45?5:.5);};
}
