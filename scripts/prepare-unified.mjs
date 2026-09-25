import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
for(const name of ['city','studio']){
 const path=`public/${name}.html`;let h=await fs.readFile(path,'utf8');
 h=h.replace(/<link[^>]*href="\/room\/(observatory|finishing)\.css"[^>]*>/g,'');
 if(!h.includes('/room/unified.css'))h=h.replace('</head>','<link rel="stylesheet" href="/room/unified.css"></head>');
 const script=name==='city'?"<script type=\"module\">import '/room/render-upgrade.js'; import '/room/unified.js'; await import('/room/city-studio.js');</script>":"<script type=\"module\">import '/room/feedback.js'; import '/room/presentation.js'; import '/room/render-upgrade.js'; import '/room/unified.js'; await import('/room/factory-ops.js');</script>";
 h=h.replace(/<script type="module"(?: src="\/room\/(?:city-studio|studio)\.js")?>[\s\S]*?<\/script>/g,script);
 h=h.replace('HYDERABAD-INSPIRED SCENARIO','COGNITIVE DISTRICT / WORKING SCENARIO');
 if(name==='studio')h=h.replace('COOLING SKID / MISSION 01','INDUSTRIAL INCIDENT / CLOSED-LOOP RECOVERY');
 await fs.writeFile(path,h);
}
for(const [path,target,title]of [['world-models.html','/city.html?entity=J-01','World State'],['robotics-stack.html','/studio.html?entity=R-07','Robotics Execution'],['live-system.html','/studio.html','Live Factory']]){
 await fs.writeFile('public/'+path,`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${target}"><title>${title}</title></head><body><a href="${target}">Open the unified workspace</a></body></html>`);
}
for(const file of ['industrial-model.js','industrial-scene.js','factory-ops.js','unified.js'])execFileSync(process.execPath,['--check','public/room/'+file]);
console.log('Unified workspace and industrial recovery scenarios prepared.');
