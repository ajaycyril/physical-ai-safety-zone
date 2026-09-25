import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
await fs.mkdir('public/media',{recursive:true});
const sources={
 traffic:{id:854671,name:'Cars on highway',source:'https://www.pexels.com/video/cars-on-highway-854671/',credit:'Pixabay / Pexels',license:'CC0',file:'/media/city-traffic.mp4',binding:'CAM-T01 → junction approach',location:'UK stock footage; not Hyderabad'},
 crossing:{id:855565,name:'Tourist crossing the street',source:'https://www.pexels.com/video/tourist-crossing-the-street-855565/',credit:'Pixabay / Pexels',license:'CC0',file:'/media/city-crossing.mp4',binding:'CAM-P01 → pedestrian approach',location:'Stock footage; not Hyderabad'}
};
async function retrieve(url,dest){
 try{const r=await fetch(url,{signal:AbortSignal.timeout(16000)});if(!r.ok)return false;const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length<100000||bytes.length>70000000||new TextDecoder().decode(bytes.slice(4,8))!=='ftyp')return false;await fs.writeFile(dest,bytes);console.log('CITY ASSET',dest,bytes.length,url);return true;}catch(e){console.log('CITY ASSET MISS',url,e.message);return false;}
}
await Promise.all(Object.values(sources).map(async s=>{
 const dest='public'+s.file;try{s.available=(await fs.stat(dest)).size>100000;}catch{s.available=false;}
 const candidates=[];
 try{const r=await fetch(s.source,{signal:AbortSignal.timeout(12000)});const text=await r.text();const urls=text.replaceAll('\\u0026','&').replaceAll('\\/','/').match(/https:\/\/[^\s"<>]+\.mp4(?:\?[^\s"<>]*)?/g)||[];candidates.push(...urls.filter(u=>u.includes(String(s.id))).sort((a,b)=>(a.includes('1280_720')?-1:1)-(b.includes('1280_720')?-1:1)));}catch{}
 for(const fps of ['25','30','24'])for(const size of ['1280_720','1920_1080','960_540'])candidates.push(`https://videos.pexels.com/video-files/${s.id}/${s.id}-hd_${size}_${fps}fps.mp4`);
 for(const url of [...new Set(candidates)].slice(0,12)){if(s.available)break;if(await retrieve(url,dest)){s.available=true;s.download=url;}}
 if(s.available){const bytes=await fs.readFile(dest);s.sha256=createHash('sha256').update(bytes).digest('hex');s.bytes=bytes.length;}
}));
await fs.writeFile('public/media/city-manifest.json',JSON.stringify({sources,notice:'Independent recorded samples, manually bound to an illustrative district. Not synchronized Hyderabad cameras.',preparedAt:new Date().toISOString()},null,2));
console.log('CITY MANIFEST',JSON.stringify(sources));
