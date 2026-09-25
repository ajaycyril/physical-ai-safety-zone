import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const scenario=process.env.DEMO_CASE||'recovery',city=scenario==='city',root=process.env.TEST_BASE_URL||'http://localhost:3000';
await fs.mkdir('test-report',{recursive:true});
const report={scenario,started:new Date().toISOString(),errors:[],checks:{}};
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
page.on('pageerror',e=>report.errors.push(e.message));
const state=()=>page.evaluate(c=>c?window.__city?.state():window.__room?.state(),city);
const screenshot=n=>page.screenshot({path:'test-report/'+scenario+'-'+n+'.png'});
async function layout(label){const result=await page.evaluate(c=>{const sel=c?'#stackList .stack-layer':'#layerList .layer';const rows=[...document.querySelectorAll(sel)].map(el=>{const r=el.getBoundingClientRect();return{top:r.top,bottom:r.bottom,height:r.height};});const d=document.querySelector(c?'.decision':'.decision-card').getBoundingClientRect();return{w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,rows,decision:{top:d.top,bottom:d.bottom},tabs:document.querySelectorAll('.pi-tabs').length};},city);report[label]=result;assert.equal(result.tabs,0);assert.ok(result.sw<=result.w+1,'Horizontal overflow');if(result.w>=1200){assert.ok(result.sh<=result.h+2,'Page exceeds viewport');assert.ok(result.rows.at(-1).bottom<=result.decision.top+1,'Stack row collides with decision');for(let i=1;i<result.rows.length;i++)assert.ok(result.rows[i-1].bottom<=result.rows[i].top+1,'Stack rows collide');}}
try{
 await page.goto(root+(city?'/city.html':'/studio.html'),{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(c=>(c?window.__city?.state().ready:window.__room?.state().ready)&&window.__console?.state().entities.length>3,city,{timeout:120000});
 if(!city){await page.waitForFunction(()=>window.__room.state().observation?.fresh,null,{timeout:120000});assert.equal((await state()).runtime,'MuJoCo');}
 report.initial=await state();await page.waitForTimeout(1200);await screenshot('01-live');await layout('desktop');
 const list=city?'#stackList [data-layer]':'#layerList [data-layer]';await page.locator(list).nth(2).click();await page.waitForTimeout(400);assert.ok(await page.locator('#uDialog').isVisible());await screenshot('02-stack-contract');await page.locator('[data-u-close]').click();
 await page.locator('#uEntitySelect').selectOption(city?'D-01':'R-07');await page.waitForTimeout(250);assert.ok(await page.locator(city?'#cityScene canvas':'#scene canvas').isVisible());await screenshot('03-world-and-robot');
 await page.locator('#uLiveSignals').click();await page.waitForTimeout(400);await screenshot('04-live-signals');assert.ok((await page.locator('#uTelemetry').innerText()).length>70);await page.locator('[data-u-close]').click();
 await page.locator('#uEntitySelect').selectOption(city?'J-01':'P-204');await page.locator('#uPinEntity').click();assert.ok((await page.evaluate(()=>window.__console.state().pinned))>0);
 await page.locator('[data-u-action="predict"]').click();await screenshot('05-world-rollouts');await page.locator('[data-u-close]').click();
 await page.setViewportSize({width:1366,height:768});await page.waitForTimeout(700);await screenshot('06-laptop');await layout('laptop');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(700);await screenshot('07-mobile');await layout('mobile');
 await page.setViewportSize({width:1440,height:900});
 if(!city&&scenario!=='recovery'){await page.locator('#industrialScenario').selectOption(scenario);await page.waitForTimeout(500);}
 await page.locator(city?'#runCity':'#runBtn').click();let approvals=0,serviceSeen=false,maxJoint=0;const started=Date.now();
 while(Date.now()-started<470000){await page.waitForTimeout(1300);const s=await state();if(s.status==='AWAITING APPROVAL'){approvals++;await screenshot('approval-'+approvals);await page.locator(city?'#approveCity':'#approveBtn').click();}
  if(!city){maxJoint=Math.max(maxJoint,...s.physics.joints.map((v,i)=>Math.abs(v-report.initial.physics.joints[i])));if(s.physics.serviceState==='Replacing strainer'&&!serviceSeen){serviceSeen=true;await screenshot('08-service-handoff');}}
  if(!report.moving&&(city?s.scene?.drone?.state!=='Docked':s.physics?.speed>.05)){report.moving=true;await screenshot('09-action');}
  if(Math.round((Date.now()-started)/1000)%15<2)console.log('RUN',scenario,s.status,s.phase,city?s.scene?.drone?.state:{pose:[s.physics.x,s.physics.y],valve:s.physics.valve,process:s.physics.process});
  if(['COMPLETE','BLOCKED','STOPPED'].includes(s.status)){report.final=s;break;}
 }
 report.final??=await state();report.approvals=approvals;report.maxJointChange=maxJoint;await screenshot('10-outcome');
 if(scenario==='stiction'){assert.equal(report.final.status,'BLOCKED');assert.ok(report.final.physics.valve<1.45);assert.ok(/did not close|V-12/.test(report.final.result?.reason));assert.ok(!report.final.physics.process.repaired);report.checks.feedbackFailureHeld=true;}
 else {assert.equal(report.final.status,'COMPLETE');if(city){assert.ok(report.final.result?.droneHome);assert.ok(report.final.result?.vehiclesCleared>0);assert.equal(approvals,1);report.checks.cityComplete=true;}
 else {assert.ok(report.final.result?.robotDocked);assert.ok(maxJoint>.7);assert.ok(report.final.sampleCount>20);
  if(scenario==='drift'){assert.equal(approvals,0);assert.equal(report.final.result.actuated,false);assert.ok(report.final.physics.valve<.12);assert.equal(report.final.diagnosis.winner,'transmitter-disagreement');assert.ok(report.final.physics.process.transmitter-report.final.physics.process.pressure>4);report.checks.noUnnecessaryIsolation=true;}
  else {assert.equal(approvals,2);assert.equal(report.final.result.outcome,'recovered');assert.ok(report.final.physics.process.flow>27);assert.ok(report.final.physics.process.pressure<7.4);assert.ok(report.final.result.goodCycles>=3);assert.equal(report.final.physics.process.workOrder.state,'CLOSED');report.checks.fullRecovery=true;}
 }
 }
 if(!city){await page.locator('#evidenceBtn').click();await screenshot('11-evidence');assert.ok(await page.locator('#replayPlay').count());await page.locator('#replayPlay').click();await page.waitForTimeout(1400);assert.equal((await state()).replaying,true);report.checks.recordedReplay=true;}
 assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=e.stack||String(e);try{report.last=await state();await screenshot('failure');}catch{}console.error(report.failure);}
finally{await fs.writeFile('test-report/'+scenario+'-acceptance.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({scenario,pass:report.pass,checks:report.checks,failure:report.failure,errors:report.errors}));}
if(!report.pass)process.exitCode=1;
