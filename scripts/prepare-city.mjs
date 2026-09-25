import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
await fs.mkdir('public/media',{recursive:true});
const sources={
 traffic:{id:854671,title:'Cars on highway',source:'https://www.pexels.com/video/cars-on-highway-854671/',credit:'Pixabay / Pexels',license:'CC0',file:'/media/city-traffic.mp4',binding:'CAM-T01 → illustrative junction demand',location:'UK stock footage, not Hyderabad'},
 crossing:{id:855565,title:'Tourist crossing the street',source:'https://www.pexels.com/video/tourist-crossing-the-street-855565/',credit:'Pixabay / Pexels',license:'CC0',file:'/media/city-crossing.mp4',binding:'CAM-P01 → illustrative pedestrian demand',location:'Stock footage, not Hyderabad'}
};
async function retrieve(url,dest){try{const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)return false;const b=new Uint8Array(await r.arrayBuffer());if(b.length<100000||b.length>70000000||new TextDecoder().decode(b.slice(4,8))!=='ftyp')return false;await fs.writeFile(dest,b);console.log('VIDEO',dest,b.length,url);return true;}catch{return false;}}
await Promise.all(Object.values(sources).map(async s=>{const dest='public'+s.file;try{s.available=(await fs.stat(dest)).size>100000;}catch{s.available=false;}const candidates=[];for(const fps of ['25','30','24'])for(const size of ['1280_720','1920_1080','960_540'])candidates.push(`https://videos.pexels.com/video-files/${s.id}/${s.id}-hd_${size}_${fps}fps.mp4`);for(const url of candidates){if(s.available)break;if(await retrieve(url,dest)){s.available=true;s.download=url;}}if(s.available){const b=await fs.readFile(dest);s.sha256=createHash('sha256').update(b).digest('hex');s.bytes=b.length;}}));
await fs.writeFile('public/media/city-manifest.json',JSON.stringify({sources,notice:'Recorded independent stock clips. Manually bound to an illustrative district; not synchronized Hyderabad cameras.'},null,2));
console.log('CITY MEDIA',JSON.stringify(sources));
if(!Object.values(sources).every(s=>s.available))throw Error('Required city sample video missing. Refusing a broken deployment.');
