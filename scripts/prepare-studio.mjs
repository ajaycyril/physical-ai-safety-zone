import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
async function copy(from,to){await fs.mkdir(path.dirname(to),{recursive:true}); await fs.cp(from,to,{recursive:true});}
await copy('node_modules/three/build','public/vendor/three');
await copy('node_modules/three/examples/jsm/controls/OrbitControls.js','public/vendor/three/OrbitControls.js');
await fs.mkdir('public/vendor/mujoco',{recursive:true});
for(const name of await fs.readdir('node_modules/@mujoco/mujoco')) if(/\.(js|wasm|mjs)$/.test(name)) await copy('node_modules/@mujoco/mujoco/'+name,'public/vendor/mujoco/'+name);
await copy('node_modules/@mediapipe/tasks-vision/wasm','public/vendor/vision/wasm');
await copy('node_modules/@mediapipe/tasks-vision/vision_bundle.mjs','public/vendor/vision/vision_bundle.mjs');
await fs.mkdir('public/media',{recursive:true});
async function asset(url,dest,min=1000){try{if((await fs.stat(dest)).size>min)return true;}catch{} try{const r=await fetch(url,{signal:AbortSignal.timeout(22000)});if(!r.ok)return false;const a=new Uint8Array(await r.arrayBuffer());if(a.length<min || a.length>60e6)return false;await fs.writeFile(dest,a);console.log('asset',dest,a.length);return true;}catch(e){console.warn('asset unavailable',url,e.message);return false;}}
const model=await asset('https://storage.googleapis.com/mediapipe-tasks/object_detector/efficientdet_lite0_uint8.tflite','public/media/efficientdet.tflite',500000);
const sources={factory:{id:855091,source:'https://www.pexels.com/video/man-working-on-conveyor-machine-855091/',credit:'Pixabay / Pexels',license:'CC0',file:'/media/factory.mp4'},gauge:{id:2853796,source:'https://www.pexels.com/video/a-gauge-use-to-measure-quantity-and-weight-2853796/',credit:'K / Pexels',license:'Pexels License',file:'/media/gauge.mp4'}};
for(const [name,s] of Object.entries(sources)){
 const dest='public'+s.file; let ok=false;try{ok=(await fs.stat(dest)).size>100000;}catch{}
 let candidates=[];
 if(!ok){try{const r=await fetch(s.source,{signal:AbortSignal.timeout(12000)});const text=await r.text();candidates=(text.replaceAll('\\u0026','&').replaceAll('\\/','/').match(/https:\/\/[^\s"<>]+\.mp4(?:\?[^\s"<>]*)?/g)||[]).filter(x=>x.includes(String(s.id)));}catch{}}
 candidates.push(...(name==='factory'?['25','30','24']:['24','25','30']).flatMap(fps=>['1280_720','1920_1080'].map(size=>`https://videos.pexels.com/video-files/${s.id}/${s.id}-hd_${size}_${fps}fps.mp4`)));
 for(const url of [...new Set(candidates)].slice(0,8)){if(ok)break;ok=await asset(url,dest,100000);if(ok)s.download=url;}
 s.available=ok;
}
await fs.writeFile('public/media/manifest.json',JSON.stringify({model,sources},null,2));
console.log('studio assets',JSON.stringify({model,sources}));
