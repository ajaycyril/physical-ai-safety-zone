import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
for(const filename of ['city','studio']){
 const path=`public/${filename}.html`;let html=await fs.readFile(path,'utf8');
 if(!html.includes('/room/observatory.css'))html=html.replace('</head>','<link rel="stylesheet" href="/room/observatory.css"></head>');
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
// Existing deep links now open the interactive views, not a second text-heavy site.
for(const [path,target,title]of [
 ['public/world-models.html','/city.html?view=world','World Model'],
 ['public/robotics-stack.html','/studio.html?view=robotics','Robotics Platform']
])await fs.writeFile(path,`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${target}"><title>${title} · Physical Intelligence</title><link rel="canonical" href="${target}"></head><body><a href="${target}">Open ${title}</a></body></html>`);
for(const f of ['observatory-data.js','render-upgrade.js','observatory.js'])execFileSync(process.execPath,['--check','public/room/'+f],{stdio:'inherit'});
console.log('Interactive world model and robotics views prepared.');
