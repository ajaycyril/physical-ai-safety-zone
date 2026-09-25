import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
// Runs after the existing asset/experience preparation. No controller is duplicated.
for(const name of ['city','studio']){
 const path='public/'+name+'.html';let html=await fs.readFile(path,'utf8');
 html=html.replace(/<link rel="stylesheet" href="\/room\/(observatory|finishing)\.css">/g,'');
 if(!html.includes('/room/unified.css'))html=html.replace('</head>','<link rel="stylesheet" href="/room/unified.css"></head>');
 html=html.replace(/<script type="module"[^>]*>[\s\S]*?<\/script>/g,(tag)=>tag.includes('studio.js')?name==='city'?'<script type="module">import "/room/render-upgrade.js";import "/room/unified.js";await import("/room/city-studio.js");</script>':'<script type="module">import "/room/feedback.js";import "/room/presentation.js";import "/room/render-upgrade.js";import "/room/process-runtime.js";import "/room/unified.js";await import("/room/studio.js");</script>':tag);
 if(name==='city')html=html.replace('<script type="module" src="/room/city-studio.js"></script>','<script type="module">import "/room/render-upgrade.js";import "/room/unified.js";await import("/room/city-studio.js");</script>');
 if(name==='studio')html=html.replace('Authorize valve isolation?','Authorize the recovery?').replace('V-12 · 90° close · cooling skid only','V-12 close + SB-02 start. Isolate the duty circuit, then verify standby flow. Simulation only.');
 await fs.writeFile(path,html);
}
let f=await fs.readFile('public/room/studio.js','utf8');
const replace=(a,b)=>{if(f.includes(b))return;if(!f.includes(a))throw Error('Factory integration marker missing: '+a);f=f.replace(a,b);};
replace("function openDetails(html){$('dialogBody').innerHTML=html;$('detailDialog').showModal();}","function openDetails(html){window.dispatchEvent(new CustomEvent('uc:details',{detail:{html}}));}");
replace("scope:'V-12:close'","scope:'V-12:close + SB-02:start'");
replace("event('APPROVAL','V-12 isolation approved for this mission only.'","event('APPROVAL','Duty isolation and standby start approved for this mission only.'");
replace("phase(5,1,'Request physical authority','V-12 close · one mission · explicit approval.'","phase(5,1,'Request scoped recovery','V-12 close + standby start · one mission.'");
replace("phase(6,5,'Execute the isolation skill'","phase(6,5,'Isolate and restore supply'");
replace("window.__room={state:","window.__factoryOps={reset,replay:()=>{showEvidence();document.getElementById('replayPlay')?.click();}};window.addEventListener('plant:event',e=>event(e.detail.layer,e.detail.text,e.detail.detail));\nwindow.__room={state:");
replace("room.plan=plan;room.routeAvoid=plan.route.avoidCentralAisle;", "room.plan=plan;room.routeAvoid=plan.route.avoidCentralAisle;const loadingBay=window.__console?.state().loadingVideo;if(loadingBay?.fresh&&loadingBay.activity>5){room.routeAvoid=true;event('ROUTER','Loading-bay activity adds a conservative route constraint.',{source:'CAM-L02',frame:loadingBay.frame,activity:loadingBay.activity,mapping:'Independent recorded view manually bound to service access'});}");
await fs.writeFile('public/room/studio.js',f);
let c=await fs.readFile('public/room/city-studio.js','utf8');
c=c.replace("function openDetails(html){$('detailBody').innerHTML=html;$('details').showModal();}","function openDetails(html){window.dispatchEvent(new CustomEvent('uc:details',{detail:{html}}));}");
if(!c.includes('window.__cityOps='))c=c.replace('window.__city={state:',"window.__cityOps={reset,replay:()=>{evidence();document.getElementById('replayRun')?.click();}};window.__city={state:");
await fs.writeFile('public/room/city-studio.js',c);
// Provenance-aware self-hosted input. Missing footage stays explicitly unavailable.
const metadata={id:6194507,title:'Forklift in a warehouse',credit:'Andi Farruku / Pexels',license:'Pexels License',licenseUrl:'https://www.pexels.com/license/',source:'https://www.pexels.com/video/forklift-in-a-warehouse-6194507/',file:'/media/warehouse.mp4',analytics:'Temporal luma change in decoded frames. Not forklift recognition.',available:false};
const dest='public'+metadata.file;
try{metadata.available=(await fs.stat(dest)).size>100000;}catch{}
if(!metadata.available&&process.env.SKIP_REMOTE_ASSETS!=='1'){
 const urls=['https://videos.pexels.com/video-files/6194507/6194507-hd_1280_720_30fps.mp4','https://videos.pexels.com/video-files/6194507/6194507-hd_1920_1080_30fps.mp4','https://videos.pexels.com/video-files/6194507/6194507-uhd_3840_2160_30fps.mp4'];
 for(const url of urls){try{const r=await fetch(url,{signal:AbortSignal.timeout(18000)});if(!r.ok)continue;const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length<100000||bytes.length>95000000||new TextDecoder().decode(bytes.slice(4,8))!=='ftyp')continue;await fs.writeFile(dest,bytes);metadata.available=true;metadata.download=url;break;}catch{}}
}
if(metadata.available){const bytes=await fs.readFile(dest);metadata.sha256=createHash('sha256').update(bytes).digest('hex');metadata.bytes=bytes.length;}
await fs.writeFile('public/media/warehouse-manifest.json',JSON.stringify(metadata,null,2));
console.log('Unified console prepared; loading-bay clip available:',metadata.available);

for(const [p,t] of [['world-models.html','/city.html?inspect=J-01'],['robotics-stack.html','/studio.html?inspect=R-07']])await fs.writeFile('public/'+p,`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${t}"><title>Physical Intelligence</title></head><body><a href="${t}">Open the unified console</a></body></html>`);
