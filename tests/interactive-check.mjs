import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='test-report';await fs.mkdir(out,{recursive:true});
const r={started:new Date().toISOString(),checks:{},errors:[],layouts:[]};
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
page.on('pageerror',e=>r.errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&!/INFO: Created TensorFlow Lite XNNPACK delegate|WebGL.*(warning|performance)|GL Driver Message/.test(m.text()))r.errors.push(m.text());});
const root=process.env.TEST_BASE_URL||'http://localhost:3000';
const shot=name=>page.screenshot({path:`${out}/${name}.png`});
const fit=async name=>{const f=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight}));r.layouts.push({name,...f});assert.ok(f.scrollWidth<=f.width+1,'Horizontal overflow '+name);if(f.width>1100)assert.ok(f.scrollHeight<=f.height+2,'Vertical overflow '+name);};
async function mode(name){await page.click(`.pi-tabs [data-mode="${name}"]`);await page.waitForTimeout(450);assert.equal(await page.evaluate(()=>window.__experience.state().mode),name);}
const state=city=>page.evaluate(c=>c?window.__city.state():window.__room.state(),city);
async function open(city){await page.goto(root+(city?'/city.html':'/studio.html'),{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(c=>window.__experience&&(c?window.__city?.state().ready:window.__room?.state().ready),city,{timeout:120000});}
async function views(city){const p=city?'city':'factory';
 await mode('architecture');await shot(p+'-02-architecture');await fit(p+' architecture');
 const boxes=await page.locator('.pi-stack-row').evaluateAll(els=>els.map(e=>{const b=e.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height,transform:getComputedStyle(e).transform,font:parseFloat(getComputedStyle(e.querySelector('b')).fontSize)};}));assert.equal(boxes.length,7);assert.ok(boxes.every(b=>b.transform==='none'&&b.font>=14));for(let i=1;i<boxes.length;i++)assert.ok(boxes[i].y>=boxes[i-1].y+boxes[i-1].h,'Stack row overlap');
 await page.click('#piTraceTask');const cap=await page.locator('#piTraceCaption').innerText();await page.waitForTimeout(2200);assert.notEqual(await page.locator('#piTraceCaption').innerText(),cap);r.checks[p+'ArchitectureTrace']=true;
 await mode('world');await shot(p+'-03-world');await fit(p+' world');const id=city?'CAM-T01':'CAM-01';await page.click(`.pi-entity-list [data-entity-select="${id}"]`);assert.equal(await page.locator('#piEntityDetail h3').innerText(),id);await page.click('#piEntityDetail [data-evidence-for]');assert.ok(await page.locator('#piDialog').isVisible());assert.ok((await page.locator('#piDialog').innerText()).includes('OBSERVED'));await shot(p+'-04-evidence');await page.click('#piDialog .pi-dialog-close');
 await page.click('#piEntityDetail [data-pin]');assert.equal(await page.evaluate(()=>window.__experience.state().pinned),1);
 await page.click('.pi-subtabs [data-world-tab="history"]');await page.waitForTimeout(1400);await shot(p+'-05-memory');assert.ok(await page.locator('#piWorldCanvas .pi-chart').count());
 await page.click('.pi-subtabs [data-world-tab="predict"]');await page.click('#piComputePrediction');await page.waitForTimeout(400);const prediction=await page.evaluate(()=>window.__experience.state().projection);assert.ok(prediction?.fixedTrace.length>5&&prediction.adaptiveTrace.length>5);r[p+'Prediction']={horizon:prediction.horizon,method:prediction.method};await shot(p+'-06-prediction');
 await mode('robotics');await shot(p+'-07-robotics');await fit(p+' robotics');assert.equal(await page.locator('.pi-fleet-card').count(),3);await page.click('.pi-skill-grid [data-skill="actuate"]');await shot(p+'-08-skill-contract');assert.ok((await page.locator('#piDialog').innerText()).includes('Current parameters'));await page.click('#piDialog .pi-dialog-close');
 await mode('live');await page.click('#piSignalsButton');const before=await page.locator('#piDrawerBody').innerText();await page.waitForTimeout(2400);assert.notEqual(await page.locator('#piDrawerBody').innerText(),before);await shot(p+'-09-signals');await page.click('[data-close-drawer]');r.checks[p+'LiveTelemetry']=true;
 await page.setViewportSize({width:1366,height:768});await fit(p+' laptop live');await shot(p+'-10-laptop');for(const v of ['architecture','world','robotics']){await mode(v);await fit(p+' laptop '+v);await shot(p+'-10-laptop-'+v);}
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(450);await fit(p+' mobile robotics');await page.screenshot({path:out+'/'+p+'-11-mobile.png',fullPage:true});await mode('architecture');await fit(p+' mobile architecture');await mode('live');await fit(p+' mobile live');await page.setViewportSize({width:1440,height:900});
 r.checks[p+'InteractiveViews']=true;
}
async function mission(city){const prefix=city?'city':'factory';await page.click(city?'#resetCity':'#resetBtn');await page.waitForTimeout(500);await page.click(city?'#runCity':'#runBtn');let approved=false,action=false;for(let i=0;i<(city?190:265);i++){await page.waitForTimeout(1400);const s=await state(city);if(i%20===0)console.log('RUN',prefix,s.status,s.phase);if(s.status==='AWAITING APPROVAL'){assert.ok(!approved,'Repeated approval');await shot(prefix+'-12-approval');await page.click(city?'#approveCity':'#approveBtn');approved=true;}
 if(s.phase===6&&!action){await page.click('#piSignalsButton');await page.waitForTimeout(500);await shot(prefix+'-13-executing-signals');await page.click('[data-close-drawer]');action=true;}
 if(['COMPLETE','BLOCKED','STOPPED'].includes(s.status)){r[prefix+'Final']={status:s.status,phase:s.phase,physics:s.physics,scene:s.scene,result:s.result,samples:s.samples??s.sampleCount,events:s.events.map(e=>({layer:e.layer,text:e.text}))};break;}}
 const end=await state(city);await shot(prefix+'-14-complete');assert.equal(end.status,'COMPLETE');assert.ok(approved);if(city){assert.equal(end.scene.drone.state,'Docked');assert.equal(end.scene.field.state,'At junction');}else{assert.equal(end.runtime,'MuJoCo');assert.ok(end.physics.valve>=1.45);assert.ok(end.physics.pressure<8);assert.ok(Math.hypot(end.physics.x+4.4,end.physics.y+2.8)<.3);}
 r.checks[prefix+'FullMission']=true;
}
try{
 await open(true);await page.waitForFunction(()=>window.__city.state().observations.traffic.fresh&&window.__city.state().observations.crossing.fresh,null,{timeout:60000});await shot('city-01-live');await views(true);await mission(true);
 await page.click('#resetCity');await page.waitForTimeout(350);await page.click('#runCity');await page.waitForTimeout(1800);await page.click('#stopCity');await page.waitForTimeout(400);const stopped=await state(true);await page.waitForTimeout(1200);const after=await state(true);assert.equal(after.status,'STOPPED');assert.deepEqual(stopped.scene.drone.position,after.scene.drone.position);assert.equal(stopped.scene.t,after.scene.t);r.checks.cityStopStable=true;
 await open(false);await page.waitForFunction(()=>window.__room.state().observation?.fresh,null,{timeout:60000});await shot('factory-01-live');await views(false);await mission(false);
 await mode('world');await page.click('.pi-entity-list [data-entity-select="V-12"]');await shot('factory-15-verified-world');assert.ok((await page.locator('#piEntityValues').innerText()).includes('90')||(await page.locator('#piEntityValues').innerText()).includes('89'));
 assert.equal(r.errors.length,0,'Browser errors');r.pass=true;
}catch(e){r.failure=e.stack||String(e);try{r.last=await page.evaluate(()=>({ui:window.__experience?.state(),city:window.__city?.state(),factory:window.__room?.state()}));await shot('failure');}catch{}console.error('FAIL',r.failure);}
finally{await fs.writeFile(out+'/interactive-acceptance.json',JSON.stringify(r,(k,v)=>k==='thumbnail'?undefined:v,2));console.log('SUMMARY',JSON.stringify({pass:r.pass,checks:r.checks,failure:r.failure,errors:r.errors}));await browser.close();}
if(!r.pass)process.exitCode=1;
