// Reusable, instanced architectural detail. Authored geometry, not surveyed geography.
export function urbanDetail(T,root,buildings=[]){
 const batches=new Map(),geo=new T.BoxGeometry(1,1,1),mats=new Map(),dummy=new T.Object3D();
 const mat=(color,metal=0)=>{const key=color+':'+metal;if(!mats.has(key))mats.set(key,new T.MeshStandardMaterial({color,roughness:metal?.3:.78,metalness:metal}));return mats.get(key);};
 function box(x,y,z,w,h,d,color,metal=0,rotation=0){const key=color+':'+metal;dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.rotation.set(0,rotation,0);dummy.updateMatrix();if(!batches.has(key))batches.set(key,[]);batches.get(key).push(dummy.matrix.clone());mat(color,metal);}
 // Four-sided facade systems, floor slabs, roof services and entrances.
 for(const b of buildings){const x=b.x??b.g.position.x,z=b.z??b.g.position.z,w=b.w||2.4,d=b.d||2.7,h=b.h,round=b.round;const floors=Math.floor(h/.62);
 if(round){for(let l=1;l<floors;l++)for(let n=0;n<20;n++){const a=n*Math.PI/10;box(x+Math.cos(a)*w*.51,.65+l*.6,z+Math.sin(a)*w*.51,.28,.43,.035,(l+n)%9===0?0xa5b6b7:0x526779,.5,Math.PI/2-a);}}
 else{for(let l=1;l<floors;l++){for(let j=0;j<Math.floor(w/.5);j++)for(const side of[-1,1])box(x-w*.39+j*.48,.67+l*.6,z+side*(d/2+.015),.35,.4,.03,(l+j)%9===0?0xa4b2aa:0x546b7d,.55);for(let j=0;j<Math.floor(d/.5);j++)for(const side of[-1,1])box(x+side*(w/2+.015),.67+l*.6,z-d*.38+j*.48,.03,.4,.35,0x5b7080,.5);box(x,.5+l*.6,z,w+.045,.045,d+.045,0xb0b5b6);}}
 box(x,h+.6,z,w+.12,.16,d+.12,0xaeb4b4);box(x-w*.2,h+.97,z,.55,.62,.8,0x879391);box(x+w*.25,h+.83,z-.3,.6,.38,.6,0x788987);
 for(let i=0;i<7;i++)box(x+w*.25-.23+i*.075,h+1.03,z-.3,.025,.06,.53,0x3d5055);
 box(x,.8,z+d*.5+.16,.85,.6,.24,0x556c77,.35);box(x,.44,z+d*.5+.5,1.35,.14,.75,0xc0bdb7);
 }
 // Road paint, curbs, lane arrows, street drainage and bollards.
 for(let x=-11;x<16;x+=1.3){box(x,.19,.4,.65,.012,.055,0xd3d1c4);box(x,.19,3.65,.65,.012,.055,0xd3d1c4);for(const z of[-.12,4.13])box(x,.25,z,1.2,.18,.22,0xaaa8a0);}
 for(let z=-10;z<9;z+=1.2){box(5,.19,z,.06,.013,.6,0xdad2bd);}
 for(let x=-10;x<16;x+=2.8){for(const z of[-.35,4.4]){box(x,.42,z,.07,.7,.07,0x576365);box(x,.72,z,.078,.09,.078,0xdfd7c1);}box(x,.19,3.45,.48,.014,.25,0x444c4e);for(let n=0;n<4;n++)box(x-.18+n*.11,.2,3.45,.022,.02,.25,0x899195);}
 // Service-yard equipment and realistic parked vehicles.
 for(let n=0;n<5;n++){const x=-10+n*2;box(x,.37,8.3,1.3,.18,1.6,0xaaa8a0);box(x,.94,8.1,.67,1,.48,0x7f8f91);box(x,1.11,8.36,.5,.32,.025,0x283b47,.25);}
 for(const[x,z]of[[-9,-10],[-5,-12],[10,-12],[15,7]]){box(x,.45,z,2,.65,1.1,0x687b81);box(x,.9,z-.08,1.1,.42,.9,0x3e5868,.6);box(x+.98,.49,z,.035,.09,.8,0xcebb8e);for(const d of[-.65,.65])for(const s of[-.58,.58])box(x+d,.31,z+s,.36,.38,.12,0x283037);}
 let count=0;for(const[key,matrices]of batches){const m=new T.InstancedMesh(geo,mats.get(key),matrices.length);matrices.forEach((v,i)=>m.setMatrixAt(i,v));m.castShadow=true;m.receiveShadow=true;m.computeBoundingSphere();root.add(m);count+=matrices.length;}
 return count;
}
export function surfaceTexture(T,type='concrete'){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');let seed=17;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const base=type==='asphalt'?78:177;const pixels=ctx.createImageData(256,256);for(let i=0;i<pixels.data.length;i+=4){const v=base+Math.floor(rand()*22)-11;pixels.data[i]=v;pixels.data[i+1]=v+2;pixels.data[i+2]=v+4;pixels.data[i+3]=255;}ctx.putImageData(pixels,0,0);
 if(type!=='asphalt'){ctx.strokeStyle='#85888866';ctx.lineWidth=1;for(let i=0;i<256;i+=64){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,256);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(256,i);ctx.stroke();}}
 const map=new T.CanvasTexture(canvas);map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(8,8);map.colorSpace=T.SRGBColorSpace;return map;
}
