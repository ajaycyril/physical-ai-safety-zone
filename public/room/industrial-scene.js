import * as T from 'three';
// Architectural context is visual geometry. Only the original runtime assets actuate.
export function industrialContext(i,kind){
 i.controls.autoRotate=false;i.piMotion=false;
 i.scene.background=new T.Color(0x09121a);i.scene.fog=new T.FogExp2(0x09121a,kind==='city'?.006:.016);
 i.scene.traverse(o=>{if(o.isLight){o.intensity*=.68;o.color?.setHex(0xc9d8e0);if(o.groundColor)o.groundColor.setHex(0x25333d);}if(o.isMesh&&o.material?.color){const h={};o.material.color.getHSL(h);o.material.color.setHSL(.56,.14,Math.min(h.l,.39));o.material.roughness=.77;}});
 const steel=new T.MeshStandardMaterial({color:0x374c57,metalness:.5,roughness:.7}),roof=new T.MeshStandardMaterial({color:0x243842,metalness:.3,roughness:.8}),concrete=new T.MeshStandardMaterial({color:0x172630,roughness:1});
 const box=(x,y,z,w,h,d,mat=steel)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.receiveShadow=true;i.scene.add(m);return m;};
 if(kind==='city'){
  box(0,-.45,0,78,.25,78,concrete);
  for(const x of [-26,-18,18,26])for(const z of [-26,-18,18,26]){const h=3+((Math.abs(x*7+z*3))%7);box(x,h/2,z,5,h,5,roof);box(x,h+.12,z,5.2,.2,5.2);for(let floor=.7;floor<h;floor+=.65){box(x,floor,z+2.51,4.6,.08,.03);box(x-2.51,floor,z,.03,.08,4.6);}for(const dx of [-1,1])box(x+dx,h+.35,z,.8,.4,.9);}
  for(const axis of [-15.5,15.5]){box(axis,-.27,0,2.4,.02,70,roof);box(0,-.26,axis,70,.02,2.4,roof);}
  for(let p=-32;p<33;p+=2.4){for(const z of [-15.5,15.5])box(p,-.23,z,.9,.01,.03,steel);for(const x of [-15.5,15.5])box(x,-.23,p,.03,.01,.9,steel);}
  i.camera.position.set(-29,33,32);i.controls.maxDistance=90;
 }else{
  // Factory uses Z-up coordinates; create a surrounding utility yard and pipe racks.
  box(0,0,-.3,29,22,.2,concrete);
  for(const x of [-10,-7,7,10])for(const y of [6,8]){const m=new T.Mesh(new T.CylinderGeometry(.8,.8,2.8,32),steel);m.rotation.x=Math.PI/2;m.position.set(x,y,1.1);i.scene.add(m);for(const z of [.2,1,2]){const r=new T.Mesh(new T.TorusGeometry(.81,.025,6,32),roof);r.position.set(x,y,z);i.scene.add(r);}}
  for(const y of [-7,6]){box(0,y,2.6,23,.15,.15);for(let x=-11;x<=11;x+=2.2)box(x,y,1.3,.12,.12,2.6);for(let p=0;p<3;p++)box(0,y+p*.18,2.8,23,.09,.09,roof);}
  for(let x=-10;x<=10;x+=2.3){box(x,-8,.5,1.6,1.4,1,roof);for(let k=0;k<4;k++)box(x-.65+k*.4,-8,1.05,.06,1.4,.05);}
  for(let y=-5;y<=4;y+=1.2){box(-10,y,.18,2,.8,.3,roof);box(10,y,.18,2,.8,.3,roof);}
  i.camera.position.set(-16,-18,17);i.controls.maxDistance=48;
 }
}
