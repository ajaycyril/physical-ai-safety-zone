const section=document.querySelector('.physical-story');
if(section) startStory(section);
async function startStory(section){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),stage=section.querySelector('.story-stage'),host=section.querySelector('.story-scene');
 const tabs=[...section.querySelectorAll('[data-chapter]')],chapters=[...section.querySelectorAll('.story-chapter')];
 const initial=Number(section.dataset.start)||0;let chosen=initial,progress=initial/2,visible=true,raf=0,manual=false;
 function choose(index){chosen=index;tabs.forEach((t,i)=>{t.setAttribute('aria-selected',String(i===index));t.tabIndex=i===index?0:-1;chapters[i].hidden=i!==index;chapters[i].classList.toggle('is-current',i===index);});}
 function navigation(index){manual=true;choose(index);progress=index/2;}
 tabs.forEach((t,i)=>{t.onclick=()=>navigation(i);t.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;navigation(next);tabs[next].focus();};});
 function scroll(){if(reduced.matches||manual)return;const rect=section.getBoundingClientRect(),range=section.offsetHeight-stage.offsetHeight;
 if(rect.top<=0&&rect.bottom>=stage.offsetHeight){manual=false;progress=Math.max(0,Math.min(1,-rect.top/Math.max(range,1)));const chapter=Math.min(2,Math.floor(progress*3));if(chapter!==chosen)choose(chapter);}
 }
 addEventListener('wheel',()=>{manual=false;},{passive:true});addEventListener('touchmove',()=>{manual=false;},{passive:true});addEventListener('keydown',e=>{if(['PageDown','PageUp','ArrowDown','ArrowUp',' '].includes(e.key))manual=false;});addEventListener('scroll',scroll,{passive:true});choose(initial);
 let T,renderer;try{T=await import('/vendor/three/three.module.js');renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch{section.dataset.render='fallback';return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x000000,0);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;host.append(renderer.domElement);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(37,1,.1,140);scene.fog=new T.Fog(0xdcc0d1,48,95);
 scene.add(new T.HemisphereLight(0xffeeee,0xaca0ba,2.7));const sun=new T.DirectionalLight(0xffe2dd,3);sun.position.set(-10,22,12);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:1,far:75});sun.shadow.bias=-.0005;sun.shadow.normalBias=.04;scene.add(sun);
 const white=new T.MeshStandardMaterial({color:0xe2dde4,roughness:.8,metalness:.04}),side=new T.MeshStandardMaterial({color:0xc9c1d0,roughness:.82}),dark=new T.MeshStandardMaterial({color:0x8e829b,roughness:.6}),glow=new T.MeshStandardMaterial({color:0xffc4c6,emissive:0xffa6b5,emissiveIntensity:.8,roughness:.45});
 const world=new T.Group();scene.add(world);
 function mesh(geo,mat,x,y,z,parent=world){const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function box(w,h,d,x,y,z,mat=white,parent=world){return mesh(new T.BoxGeometry(w,h,d),mat,x,y,z,parent);}
 function cylinder(r,h,x,y,z,mat=white,parent=world,n=32){return mesh(new T.CylinderGeometry(r,r,h,n),mat,x,y,z,parent);}
 const ground=mesh(new T.PlaneGeometry(90,65,24,18),new T.MeshStandardMaterial({color:0xcfc5d4,roughness:1}),0,-.1,-8);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
 const dots=new T.InstancedMesh(new T.CircleGeometry(.019,5),new T.MeshBasicMaterial({color:0xb19bac}),1100),dummy=new T.Object3D();let count=0;for(let x=-20;x<24;x+=1.1)for(let z=-20;z<10;z+=1.1){if(count>=1100)break;dummy.position.set(x,.006,z);dummy.rotation.x=-Math.PI/2;dummy.updateMatrix();dots.setMatrixAt(count++,dummy.matrix);}dots.count=count;world.add(dots);
 const city=new T.Group();world.add(city);
 box(28,.18,20,2,.04,-2,side,city);
 box(28,.015,3.5,2,.15,2,new T.MeshStandardMaterial({color:0xbdb0c4,roughness:1}),city);
 box(3.5,.018,20,5,.16,-2,new T.MeshStandardMaterial({color:0xbdb0c4,roughness:1}),city);
 for(let i=0;i<8;i++)box(.5,.023,2.5,-.5+i*.85,.18,2,glow,city);
 const buildings=[];
 function tower(x,z,w,d,h,round=false){const g=new T.Group();g.position.set(x,0,z);city.add(g);box(w+.5,.35,d+.5,0,.32,0,white,g);const m=round?cylinder(w/2,h,0,h/2+.5,0,white,g):box(w,h,d,0,h/2+.5,0,white,g);const edge=new T.LineSegments(new T.EdgesGeometry(m.geometry),new T.LineBasicMaterial({color:0xffd1d0,transparent:true,opacity:.75}));m.add(edge);g.scale.y=reduced.matches?1:.04;buildings.push({g,h});return g;}
 tower(-6,-5,2.3,2.7,9);tower(-3.2,-6,2.9,3.4,12);tower(-8.7,-5,2.1,2.5,6.8);tower(9,-6,2.3,2.3,12,true);tower(13,-5.2,2.7,2.7,9.2,true);tower(16,-9,2.4,3.6,5);tower(-.1,-10,3,2.5,4);
 for(const x of [-10,-7,-4,9,12,15]){const tree=new T.Group();city.add(tree);tree.position.set(x,0,6.5);cylinder(.065,1.5,0,.75,0,side,tree,8);mesh(new T.IcosahedronGeometry(.65,0),white,0,1.75,0,tree);mesh(new T.IcosahedronGeometry(.48,0),side,.25,2.25,0,tree);}
 for(const x of [-1,8])for(const z of[-1,4.5]){cylinder(.042,2.3,x,1.2,z,white,city,8);box(.9,.06,.08,x+.42,2.35,z,glow,city);box(.18,.26,.13,x+.8,2.2,z,dark,city);}
 function person(x,z){const g=new T.Group();g.position.set(x,0,z);city.add(g);cylinder(.12,.48,0,.65,0,white,g,8);mesh(new T.SphereGeometry(.13,10,8),white,0,.99,0,g);for(const d of[-.08,.08])box(.08,.42,.09,d,.22,0,white,g);return g;}
 const people=[person(1.2,1.6),person(2.4,2.1),person(4,1.8),person(7,3.6),person(-2,4)];
 function vehicle(x,z){const g=new T.Group();city.add(g);g.position.set(x,.15,z);box(.9,.28,1.7,0,.35,0,white,g);box(.72,.35,.9,0,.61,-.1,side,g);for(const a of[-.43,.43])for(const b of[-.5,.5]){const wheel=cylinder(.17,.1,a,.2,b,dark,g,12);wheel.rotation.z=Math.PI/2;}box(.65,.06,.04,0,.37,.86,glow,g);return g;}
 const car=vehicle(5,7),car2=vehicle(12,2);car2.rotation.y=Math.PI/2;
 const robot=new T.Group();robot.position.set(1,.2,9);world.add(robot);box(1.4,.4,1.8,0,.35,0,white,robot);box(1.2,.13,1.6,0,.62,0,side,robot);for(const x of[-.73,.73])for(const z of[-.5,.5]){const wheel=cylinder(.24,.15,x,.22,z,dark,robot,16);wheel.rotation.z=Math.PI/2;}cylinder(.14,.75,0,1,0,white,robot);const arm=box(.24,.9,.24,.2,1.5,0,white,robot);arm.rotation.z=-.45;box(.7,.18,.2,.58,1.91,0,white,robot);cylinder(.13,.16,.98,1.82,0,glow,robot);mesh(new T.SphereGeometry(.1,12,8),glow,0,.75,.65,robot);
 const routePoints=[new T.Vector3(-11,.24,9),new T.Vector3(-5,.24,9),new T.Vector3(1,.24,9),new T.Vector3(6,.24,7),new T.Vector3(7,.24,3)];
 const routeCurve=new T.CatmullRomCurve3(routePoints);mesh(new T.TubeGeometry(routeCurve,90,.035,6,false),glow,0,0,0);const pulse=mesh(new T.SphereGeometry(.13,12,8),glow,-11,.3,9);
 const graph=new T.Group();world.add(graph);const nodes=[];for(const [x,y,z]of[[-5,8,-1],[2,11,-4],[10,8,-1],[6,4,6],[-2,3,6],[13,4,-7]])nodes.push(mesh(new T.IcosahedronGeometry(.32,1),glow,x,y,z,graph));
 const lineMat=new T.LineBasicMaterial({color:0xffc4d6,transparent:true,opacity:.85});for(const [a,b]of[[0,1],[1,2],[2,3],[3,4],[4,0],[1,5],[5,2],[0,3]])graph.add(new T.Line(new T.BufferGeometry().setFromPoints([nodes[a].position,nodes[b].position]),lineMat));
 graph.visible=initial===1;
 let w=1,h=1;function resize(){w=host.clientWidth;h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();camera.position.set(w<600?24:27,w<600?20:17,w<600?32:27);camera.lookAt(w<600?3:1,3,0);request();}
 const observer=new ResizeObserver(resize);observer.observe(host);
 const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)request();},{rootMargin:'100px'});intersection.observe(section);
 let last=0,smoothed=initial/2;
 function frame(t){raf=0;if(!visible||document.hidden)return;if(t-last<32){request();return;}last=t;
 smoothed+= (progress-smoothed)*(reduced.matches?1:.07);
 const wave=reduced.matches?0:Math.sin(t*.00035)*.03;
 world.rotation.y=(smoothed-.5)*.16+wave;
 buildings.forEach(({g},index)=>{g.scale.y+=(1-g.scale.y)*(reduced.matches?1:.025+index*.002);});
 graph.visible=chosen===1;
 graph.position.y=reduced.matches?0:Math.sin(t*.0006)*.18;
 robot.scale.setScalar(chosen===2?1.3:1);
 if(!reduced.matches){const v=routeCurve.getPoint((t*.00004)%1);pulse.position.copy(v);if(chosen===2){robot.position.copy(routeCurve.getPoint((t*.000012)%1));robot.position.y=.2;}else{robot.position.set(1,.2,9);}car.position.z=6+(Math.sin(t*.0002)*1.5);people.forEach((p,i)=>p.position.y=Math.sin(t*.001+i)*.012);}
 renderer.render(scene,camera);section.classList.add('story-ready');section.dataset.chapter=String(chosen);section.dataset.render='webgl';
 if(!reduced.matches)request();
 }
 function request(){if(!raf)raf=requestAnimationFrame(frame);}
 tabs.forEach(t=>t.addEventListener('click',request));section.addEventListener('keydown',request);addEventListener('scroll',request,{passive:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)request();});reduced.addEventListener('change',()=>{progress=chosen/2;request();});resize();
 addEventListener('pagehide',()=>{cancelAnimationFrame(raf);observer.disconnect();intersection.disconnect();renderer.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});},{once:true});
}
