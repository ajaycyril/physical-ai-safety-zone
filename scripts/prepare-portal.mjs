import fs from 'node:fs/promises';
// Keep the existing factory entry compatible with the shared public portal.
const path='public/studio.html';let html=await fs.readFile(path,'utf8');
if(!html.includes('/room/readability.css'))html=html.replace('<link rel="stylesheet" href="/room/studio.css">','<link rel="stylesheet" href="/room/studio.css"><link rel="stylesheet" href="/room/readability.css">');
if(!html.includes('href="/city.html"'))html=html.replace('>Live system</button>','>Factory</button><a href="/city.html">Cognitive city</a>');
html=html.replace('How it works ↗','Inside the stack ↗');await fs.writeFile(path,html);
// Preserve more elapsed simulation time on low-frame-rate devices; MuJoCo still
// integrates at its fixed 5ms timestep rather than taking a large physics step.
const file='public/room/facility.js';let js=await fs.readFile(file,'utf8');js=js.replace('const dt=clamp((now-this.last)/1000,0,.05)','const dt=clamp((now-this.last)/1000,0,.12)').replace('while(this.acc>=.005&&n++<20)','while(this.acc>=.005&&n++<24)');await fs.writeFile(file,js);
