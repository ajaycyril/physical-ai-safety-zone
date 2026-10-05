import * as T from 'three';
import {createEngineeringModel} from './engineering-models.js';
// Physical site and semantic layers: all geometry is rendered in real time.
export function createContextModel(kind,parent){
 const g=new T.Group();parent.add(g);const isWorld=kind==='world-context';
 const mats={stone:new T.MeshStandardMaterial({color:0xe6e9e3,roughness:.78}),white:new T.MeshStandardMaterial({color:0xf3f4ee,roughness:.42,metalness:.18}),metal:new T.MeshStandardMaterial({color:0x90a8a1,roughness:.31,metalness:.65}),ink:new T.MeshStandardMaterial({color:0x344c50,roughness:.48}),glass:new T.MeshStandardMaterial({color:0x95bcb2,transparent:true,opacity:.22,depthWrite:false,roughness:.22}),green:new T.MeshStandardMaterial({color:0x427c6a,roughness:.8}),trace:new T.MeshStandardMaterial({color:0x68ae97,emissive:0x2f6556,emissiveIntensity:.23,roughness:.38}),amber:new T.MeshStandardMaterial({color:0xbb8b52,roughness:.45})};
 const box=(p,s,m='white',par=g)=>{const o=new T.Mesh(new T.BoxGeometry(...s),mats[m]);o.position.set(...p);o.castShadow=true;o.receiveShadow=true;par.add(o);return o};
 const pipe=(a,b,r=.015,m='metal',par=g)=>{const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av);const o=new T.Mesh(new T.CylinderGeometry(r,r,d.length(),10),mats[m]);o.position.copy(av.add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());par.add(o);return o};
 const layer=new T.Group();g.add(layer);const recordLayer=new T.Group();g.add(recordLayer);const taskLayer=new T.Group();g.add(taskLayer);
 box([0,-.055,0],[5.2,.1,3.65],'stone');
 for(let i=-5;i<=5;i++)box([i*.46,.002,0],[.009,.008,3.5],'metal');
 for(let j=-3;j<=3;j++)box([0,.003,j*.48],[5,.008,.009],'metal');
 // The serviced production area: open frontage, realistic structural members and roof plant.
 box([.88,.1,-.65],[2.2,.2,1.43]);
 for(const x of [-.16,.9,1.95])for(const z of [-1.32,.05]){box([x,.68,z],[.065,1.16,.065],'metal');}
 box([.88,1.31,-.65],[2.25,.07,1.51]);box([.88,.78,-1.32],[2.12,1.03,.025],'glass');
 box([1.15,1.52,-.68],[.8,.38,.53],'metal');for(let k=0;k<10;k++)box([.81+k*.075,1.73,-.68],[.025,.06,.5],'ink');
 // Process line, equipment cabinets and two independent cooling branches.
 for(let k=0;k<4;k++){box([.12+k*.5,.44,-.54],[.31,.5,.42],'white');box([.12+k*.5,.72,-.53],[.25,.04,.37],'metal');}
 const duty=createEngineeringModel('pump',g);duty.g.scale.setScalar(.34);duty.g.position.set(-1.42,.11,.63);
 const standby=createEngineeringModel('pump',g);standby.g.scale.setScalar(.23);standby.g.position.set(-1.65,.12,-.5);
 box([-1.6,.09,-.7],[1.55,.16,1.22],'white');
 const rover=createEngineeringModel('ground',g);rover.g.scale.setScalar(.27);rover.g.position.set(.14,.03,1.2);rover.g.rotation.y=-.3;
 const computer=createEngineeringModel('edge',g);computer.g.scale.setScalar(.18);computer.g.position.set(1.85,.08,.98);
 for(const z of [-.63,.62]){pipe([-1.02,.34,z],[-.34,.34,z],.034,'trace');pipe([-.34,.34,z],[-.34,.34,-.1],.034,'trace');}pipe([-.34,.34,-.1],[.44,.34,-.1],.04,'trace');
 // Observed entity positions float above their physical anchors when the context layer is revealed.
 const nodes=[[-1.42,.57,.63],[-1.65,.52,-.5],[.88,1.56,-.65],[.14,.57,1.2],[1.85,.48,.98]];
 for(const [i,p]of nodes.entries()){
  const node=box(p,[.19,.065,.14],i<2?'amber':'trace',layer);node.userData.entity=i;
  pipe([p[0],.16,p[2]],p,.007,'metal',layer);
 }
 for(const i of [0,1,3,4])pipe(nodes[i],nodes[2],.009,'trace',layer);
 // Semantic volume denotes the production zone; not an invented physical structure.
 const volume=box([.88,.82,-.65],[2.12,1.18,1.35],'glass',layer);
 const edges=new T.LineSegments(new T.EdgesGeometry(volume.geometry),new T.LineBasicMaterial({color:0x659e89,transparent:true,opacity:.5}));edges.position.copy(volume.position);layer.add(edges);
 // Ordered episode records and task path are separate from authoritative observed geometry.
 const records=[];for(let i=0;i<3;i++){const node=box([-.95+i*.65,1.45,.94],[.46,.025,.27],'white',recordLayer);records.push(node);box([-.95+i*.65,1.47,.94],[.29,.014,.1],i===2?'trace':'metal',recordLayer);}
 for(let i=0;i<2;i++)pipe([-.69+i*.65,1.45,.94],[-.57+i*.65,1.45,.94],.009,'metal',recordLayer);
 const route=[new T.Vector3(.14,.065,1.2),new T.Vector3(-.35,.065,1.2),new T.Vector3(-.83,.065,.8),new T.Vector3(-1.23,.065,.74)];
 for(let i=1;i<route.length;i++)pipe(route[i-1].toArray(),route[i].toArray(),.012,'trace',taskLayer);
 const marker=new T.Mesh(new T.SphereGeometry(.04,12,8),mats.trace);taskLayer.add(marker);
 let depth=0;
 return {kind,g,update(t,active,state={}){
  depth=T.MathUtils.lerp(depth,T.MathUtils.clamp(state.contextProgress??0,0,1),.11);
  layer.position.y=depth*.48;recordLayer.position.y=depth*.72;taskLayer.position.y=depth*.13;
  layer.visible=depth>.03;recordLayer.visible=depth>.35;taskLayer.visible=depth>.65||state.running===true;
  records.forEach((r,i)=>r.position.y=1.45+Math.max(0,depth-.3)*(i*.15));
  duty.update(t,!!state.running,state);standby.update(t,state.standby>0,{flow:state.standby>0?58*state.standby:0,pressure:6.1,valve:state.standby??0});
  rover.update(t,!!state.running&&state.phase===2);
  computer.update(t,depth>.85);const p=(t*.18)%1;marker.position.copy(route[0]).lerp(route.at(-1),p);
  mats.trace.emissiveIntensity=state.expired?.04:.23;
  if(isWorld){g.rotation.y=-.1;volume.material.opacity=state.expired?.08:.22;}
 },dispose(){Object.values(mats).forEach(m=>m.dispose());edges.material.dispose();}};
}
