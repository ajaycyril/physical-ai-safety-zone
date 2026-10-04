import fs from 'node:fs/promises';
// Keep bounded simulation catch-up independent of the quality of the graphics device.
for(const [file,from,to] of [
 ['public/room/facility.js','clamp((now-this.last)/1000,0,.12)','clamp((now-this.last)/1000,0,.3)'],
 ['public/room/city-scene.js','Math.min(.12,this.last?(now-this.last)/1000:.016)','Math.min(.3,this.last?(now-this.last)/1000:.016)']
]){const s=await fs.readFile(file,'utf8');if(!s.includes(from)&&!s.includes(to))throw Error('Simulation clock hook missing: '+file);await fs.writeFile(file,s.replace(from,to));}
const file='public/room/render-budget.js';let s=await fs.readFile(file,'utf8');
if(!s.includes('adaptive-software-budget-v1')){
 const hook='function budget(i){';if(!s.includes(hook))throw Error('Render budget hook missing');
 s=s.replace(hook,`// adaptive-software-budget-v1
function budget(i){
 const gl=i.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
 const rendererName=debug?String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)):'';
 const software=/SwiftShader|llvmpipe|Software Rasterizer/i.test(rendererName);
 const simpleMaterials=new WeakMap();
 function simplifyMaterials(){i.scene.traverse(o=>{if(!o.material)return;const convert=m=>{if(!m?.isMeshStandardMaterial)return m;if(simpleMaterials.has(m))return simpleMaterials.get(m);const n=new T.MeshLambertMaterial({color:m.color,map:m.map,emissive:m.emissive,emissiveIntensity:m.emissiveIntensity,transparent:m.transparent,opacity:m.opacity,side:m.side,depthWrite:m.depthWrite,vertexColors:m.vertexColors});simpleMaterials.set(m,n);return n;};o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);});}
`);
 s=s.replace("const perf={mode:'full'","const perf={software,mode:software?'perception-priority':'full'");
 s=s.replace('pixelRatio:Math.min(devicePixelRatio,1.25)','pixelRatio:Math.min(devicePixelRatio,software?.6:1.25)');
 s=s.replace('i.renderer.setPixelRatio(perf.pixelRatio);i.resize();i.renderer.shadowMap.autoUpdate=false;',"if(software){i.renderer.shadowMap.enabled=false;simplifyMaterials();}\n i.renderer.setPixelRatio(perf.pixelRatio);i.resize();i.renderer.shadowMap.autoUpdate=false;");
 s=s.replace('perf.pixelRatio=Math.min(devicePixelRatio,.8)','perf.pixelRatio=Math.min(devicePixelRatio,.65)');
 s=s.replace("perf.mode='perception-priority';perf.pixelRatio", "perf.mode='perception-priority';simplifyMaterials();perf.pixelRatio");
 s=s.replace('if(perf.rendered>25)','if(perf.rendered>8)').replace('if(perf.slowFrames>=8)','if(perf.slowFrames>=4)');
 s=s.replace("if(perf.mode==='perception-priority'&&perf.fastFrames>=90)","if(!software&&perf.mode==='perception-priority'&&perf.fastFrames>=90)");
 await fs.writeFile(file,s);
}
console.log('Adaptive graphics budget and bounded fixed-step catch-up prepared.');
