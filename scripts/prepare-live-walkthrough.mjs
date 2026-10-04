import fs from 'node:fs/promises';
const file='public/room/demo-director.js';
let s=await fs.readFile(file,'utf8');
if(!s.includes('// nonmodal-live-guide-v1')){
 const replace=(a,b)=>{if(!s.includes(a))throw Error('Live guide hook changed: '+a.slice(0,90));s=s.replace(a,b);};
 replace("import {renderBridge}","import {updateWalkthrough} from './live-walkthrough.js';\nimport {renderBridge}");
 replace(";hold();set('walkthroughNumber'",";set('walkthroughNumber'");
 replace('if(!d.open)d.showModal();','if(!d.open)d.show();');
 replace("const approval=stage===5&&state()?.status==='AWAITING APPROVAL';closePopup();releaseHold();", "const approval=stage===5&&state()?.status==='AWAITING APPROVAL';releaseHold();");
 replace("else finishGate();renderKey='';}","else finishGate();renderKey='';refresh();}");
 s='// nonmodal-live-guide-v1\n'+s;
 replace("if(pace==='auto'){await new Promise", "if(pace==='auto'){showExplanation(index);await new Promise");
 replace("updateMetrics(s);\n}","updateMetrics(s);updateWalkthrough({kind,stage,dialogStage,waiting:!!pending,active,finished},s);\n}");
 replace("document.body.append(dialog);", "card.insertBefore(dialog,card.querySelector('.demo-narrative-body'));");
 s=s.replaceAll('Execution is paused. Nothing advances until you continue.','Next action is waiting. Scene and observations stay live.').replaceAll('The simulation is paused while you read.','The guide reads the running simulation without pausing it.').replaceAll('keep this checkpoint paused','keep the next action waiting');
 await fs.writeFile(file,s);
}
for(const name of ['factory','city']){const file='public/pages/'+name+'.html';let h=await fs.readFile(file,'utf8');if(!h.includes('/room/live-walkthrough.css'))h=h.replace('</head>','<link rel="stylesheet" href="/room/live-walkthrough.css"></head>');await fs.writeFile(file,h);}
let release=JSON.parse(await fs.readFile('public/release.json','utf8'));release.release='2026-10-04.4';release.features=[...new Set([...release.features,'nonmodal-live-guide','live-state-bound-explanations','uninterrupted-observation'])];await fs.writeFile('public/release.json',JSON.stringify(release));
console.log('Live evidence guide: nonmodal, docked, source-bound, with action gates retained.');
