import fs from 'node:fs/promises';
const directorPath='public/room/demo-director.js';
let director=await fs.readFile(directorPath,'utf8');
const patches=[
 ["pace=value==='auto'?'auto':'step';const u=new URL(location.href);","pace=value==='auto'?'auto':'step';if($('demoPace'))$('demoPace').value=pace;const u=new URL(location.href);"],
 ["if(active&&s.status==='AWAITING APPROVAL'){","if(active&&s.status==='AWAITING APPROVAL'&&document.body.classList.contains('demo-guided')){"]
];
for(const [before,after]of patches){if(director.includes(after))continue;if(!director.includes(before))throw Error('Walkthrough release hook changed');director=director.replace(before,after);}
await fs.writeFile(directorPath,director);
// The guided explanation is the primary panel. Automatic technical-tab changes
// must not hide Continue, Stop or Reset. Manual tab selection stays available.
const intelligencePath='public/room/live-intelligence.js';
let intelligence=await fs.readFile(intelligencePath,'utf8');
const before="if(follow&&marker!==previousPhase&&window.__demoDirector?.state().active){";
const after="if(follow&&marker!==previousPhase&&window.__demoDirector?.state().active&&!document.body.classList.contains('demo-guided')){";
if(!intelligence.includes(after)){if(!intelligence.includes(before))throw Error('Intelligence follow hook changed');intelligence=intelligence.replace(before,after);await fs.writeFile(intelligencePath,intelligence);}
for(const name of await fs.readdir('public/pages')){if(!name.endsWith('.html'))continue;const path='public/pages/'+name;let html=await fs.readFile(path,'utf8');if(!html.includes('/room/release-ui.js'))html=html.replace('</head>','<link rel="stylesheet" href="/room/release-ui.css"><script type="module" src="/room/release-ui.js"></script></head>');await fs.writeFile(path,html);}
await fs.writeFile('public/release.json',JSON.stringify({release:'2026-10-04.2',name:'Physical Ops Lab',commit:process.env.VERCEL_GIT_COMMIT_SHA||process.env.GITHUB_SHA||'local',features:['eight-stage-checkpoints','manual-approval','automatic-playback','neutral-branding','viewport-fit','evidence-export','persistent-step-explanation']}));
console.log('Final presentation release prepared.');
