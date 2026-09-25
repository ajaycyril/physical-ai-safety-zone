import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
// Stable DOM nodes keep graph animation and keyboard focus continuous.
const uiPath='public/room/observatory.js';let js=await fs.readFile(uiPath,'utf8');
function replaceOnce(from,to){if(js.includes(to))return;if(!js.includes(from))throw Error('Experience source marker not found: '+from.slice(0,75));js=js.replace(from,to);}
replaceOnce("if(ui.worldTab==='now'){c.innerHTML=graph();return;}","if(ui.worldTab==='now'){const svg=c.querySelector('#piSemanticGraph');if(!svg)c.innerHTML=graph();else for(const e of all()){const node=svg.querySelector('[data-entity-select=\"'+e.id+'\"]');if(node){node.querySelector('.pi-node-value').textContent=e.status.length>17?e.status.slice(0,16)+'…':e.status;node.setAttribute('data-basis',e.basis);}}return;}");
replaceOnce("if(ui.entity==='R-07')return'speed';","if(ui.entity==='CAM-01')return'people';if(ui.entity==='R-07')return'speed';");
replaceOnce('people:s.observations?.crossing?.people,','people:city?s.observations?.crossing?.people:s.observation?.people,');
replaceOnce('<div class="pi-pinned-count">${ui.pinned.length} pinned snapshots</div>','<button type="button" class="pi-pinned-count" data-open-pins>${ui.pinned.length} pinned snapshots ↗</button>');
replaceOnce('[data-pin],[data-references]','[data-pin],[data-open-pins],[data-references]');
const pinHandler=String.raw`if(b.hasAttribute('data-open-pins')){
 openModal('Pinned world states',ui.pinned.length?'<div class="pi-pins-grid">'+ui.pinned.map(p=>'<article>'+basis(p.basis)+'<h3>'+esc(p.id)+'</h3><time>'+new Date(p.at).toLocaleTimeString()+'</time>'+rows(p.rows)+'<p>'+esc(p.source)+'</p></article>').join('')+'</div>'+button('Export snapshots ↗','id="piExportPins"'):'<p>Pin an entity to preserve its values, source and time.</p>');
 const exportButton=document.getElementById('piExportPins');if(exportButton)exportButton.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({scope:'session snapshots',states:ui.pinned},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='world-state-snapshots.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};return;
 }
 if(b.dataset.pin){`;
replaceOnce('if(b.dataset.pin){',pinHandler);
await fs.writeFile(uiPath,js);
for(const filename of ['city','studio']){
 const path=`public/${filename}.html`;let html=await fs.readFile(path,'utf8');
 if(!html.includes('/room/observatory.css'))html=html.replace('</head>','<link rel="stylesheet" href="/room/observatory.css"></head>');
 if(!html.includes('/room/finishing.css'))html=html.replace('</head>','<link rel="stylesheet" href="/room/finishing.css"></head>');
 if(!html.includes('/room/observatory.js')){
  if(filename==='city'){
   const tag='<script type="module" src="/room/city-studio.js"></script>';
   if(!html.includes(tag))throw Error('City entry script not found');
   html=html.replace(tag,"<script type=\"module\">import '/room/render-upgrade.js'; import '/room/observatory.js'; await import('/room/city-studio.js');</script>");
  }else{
   const tag="import '/room/presentation.js';";
   if(!html.includes(tag))throw Error('Factory presentation script not found');
   html=html.replace(tag,tag+" import '/room/render-upgrade.js'; import '/room/observatory.js';");
  }
 }
 await fs.writeFile(path,html);
}
for(const [path,target,title]of [
 ['public/world-models.html','/city.html?view=world','World Model'],
 ['public/robotics-stack.html','/studio.html?view=robotics','Robotics Platform']
])await fs.writeFile(path,`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${target}"><title>${title} · Physical Intelligence</title><link rel="canonical" href="${target}"></head><body><a href="${target}">Open ${title}</a></body></html>`);
for(const f of ['observatory-data.js','render-upgrade.js','observatory.js'])execFileSync(process.execPath,['--check','public/room/'+f],{stdio:'inherit'});
console.log('Interactive world model and robotics views prepared.');
