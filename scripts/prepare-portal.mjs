import fs from 'node:fs/promises';
const path='public/studio.html';let html=await fs.readFile(path,'utf8');
if(!html.includes('/room/readability.css'))html=html.replace('<link rel="stylesheet" href="/room/studio.css">','<link rel="stylesheet" href="/room/studio.css"><link rel="stylesheet" href="/room/readability.css">');
if(!html.includes('href="/city.html"'))html=html.replace('>Live system</button>','>Factory</button><a href="/city.html">Cognitive city</a>');
if(!html.includes('/room/feedback.js'))html=html.replace("import '/room/presentation.js';", "import '/room/feedback.js'; import '/room/presentation.js';");
html=html.replace('How it works ↗','Inside the stack ↗');await fs.writeFile(path,html);
// Keep fixed 5ms integration, but retain enough elapsed time on slower devices.
const file='public/room/facility.js';let js=await fs.readFile(file,'utf8');
js=js.replace('const dt=clamp((now-this.last)/1000,0,.05)','const dt=clamp((now-this.last)/1000,0,.12)').replace('while(this.acc>=.005&&n++<20)','while(this.acc>=.005&&n++<24)');await fs.writeFile(file,js);
// Await sensor feedback instead of assuming a fixed delay means a process settled.
const factory='public/room/studio.js';let f=await fs.readFile(factory,'utf8');
f=f.replace("await sim.wait(3000,signal);const after=sim.readGauge();", "let after=sim.readGauge();let settlingChecks=0;while((sim.state.valve<1.45||after.value>=7.8)&&settlingChecks++<70){await sim.wait(450,signal);after=sim.readGauge();$('decisionDetail').textContent='Waiting for feedback · '+after.value.toFixed(1)+' bar';}event('VERIFICATION','Pressure read-back sampled.',{checks:settlingChecks,pressure:after.value,simulated:true});");
f=f.replace("name:'World state'","name:'World model'");await fs.writeFile(factory,f);
const city='public/room/city-studio.js';let c=await fs.readFile(city,'utf8');
c=c.replace('room.phase=index;selectLayer(layer);',"room.phase=index;if(room.run)setStatus(['OBSERVING','GROUNDING','VALIDATING','PREDICTING','SURVEYING','AWAITING APPROVAL','EXECUTING','VERIFYING'][index]);selectLayer(layer);");
c=c.replace("function approval(signal){$('approval').hidden=false;","function approval(signal){architecture(false);$('approval').hidden=false;");await fs.writeFile(city,c);
const scene='public/room/city-scene.js';let s=await fs.readFile(scene,'utf8');s=s.replace('new T.Vector3(.1,-.45,.05)','new T.Vector3(.1,-.16,.05)');await fs.writeFile(scene,s);
