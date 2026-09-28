import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
// Last build step. One runtime per environment; no extra models or media downloads.
for(const entry of ['city','studio']){
 const path=`public/${entry}.html`;let html=await fs.readFile(path,'utf8');
 if(!html.includes('/room/finish.css'))html=html.replace('</head>','<link rel="stylesheet" href="/room/finish.css"></head>');
 if(!html.includes('/room/finish-layout.css'))html=html.replace('</head>','<link rel="stylesheet" href="/room/finish-layout.css"></head>');
 if(!html.includes('/room/site-detail.js'))html=html.replace('await import(', 'import "/room/site-detail.js";import "/room/command-ui.js";await import(');
 if(!html.includes('/room/render-budget.js'))html=html.replace('await import(', 'import "/room/render-budget.js";await import(');
 html=html.replace('<title>Physical Intelligence · Cognitive City</title>','<title>Fieldstack · Cognitive City</title>').replace('<title>Physical Intelligence / Ajay Cyril</title>','<title>Fieldstack · Factory</title>');
 await fs.writeFile(path,html);
}
const ui='public/room/unified.js';let s=await fs.readFile(ui,'utf8');
if(!s.includes('window.__siteDetail?.entities()'))s=s.replace('const wx=window.__abuDhabi?.entity();','all.push(...(window.__siteDetail?.entities()||[]));const wx=window.__abuDhabi?.entity();');
if(!s.includes("e?.type?.startsWith('Modeled')")){
 s=s.replace('function chooseSkills(e){',"function chooseSkills(e){if(e?.type?.startsWith('Modeled'))return['record'];");
 s=s.replace('function actionability(e,s){',"function actionability(e,s){if(e?.type?.startsWith('Modeled'))return['Scene context / read-only',e.status];");
}
await fs.writeFile(ui,s);
const wx='public/room/abu-dhabi.js';let w=await fs.readFile(wx,'utf8');
if(!w.includes('requestedGround='))w=w.replace('const state=snapshot(),decision=state.decision;','const state=snapshot(),requestedGround=window.__city?.state()?.plan?.groundOnly,decision=requestedGround?{...state.decision,mode:"ground",label:"Ground inspection requested",reasons:["Operator requested ground inspection",...state.decision.reasons]}:state.decision;');
await fs.writeFile(wx,w);
const cityPath='public/room/city-studio.js';let city=await fs.readFile(cityPath,'utf8');
if(!city.includes('async function currentEvidence(')){
 city="import {waitForEvidence} from './evidence-gate.mjs';\n"+city;
 const old="let observations=vision.all();if(!observations.traffic.fresh||!observations.crossing.fresh)throw Error('Fresh frames from both cameras are required.');";
 if(!city.includes(old))throw Error('Evidence integration marker missing');
 city=city.replace(old,'let observations=await currentEvidence(signal);').replace("await network(signal);observations=vision.all();","await network(signal);observations=await currentEvidence(signal);");
 city+="\nasync function currentEvidence(signal){return waitForEvidence(()=>vision.all(),{signal,onWait:()=>{scene.hold('dispatch-evidence',true);$('decisionDetail').textContent='Waiting for current frames from both cameras';event('PERCEPTION','Waiting for current camera evidence; freshness limits unchanged.');},onRelease:()=>scene.hold('dispatch-evidence',false)});}\n";
 await fs.writeFile(cityPath,city);
}
for(const p of ['site-detail.js','render-budget.js','command-ui.js','command-contract.mjs','evidence-gate.mjs'])execFileSync(process.execPath,['--check','public/room/'+p],{stdio:'inherit'});
console.log('Fieldstack finish: instanced site scenes, shared goal validation, bounded fresh-evidence gate.');
