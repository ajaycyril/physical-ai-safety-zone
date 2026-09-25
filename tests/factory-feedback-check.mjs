import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
await fs.mkdir('test-report',{recursive:true});
const report={errors:[],checks:{},started:new Date().toISOString()};
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
page.on('pageerror',e=>report.errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&!/INFO: Created TensorFlow Lite XNNPACK delegate|WebGL.*(warning|performance)|GL Driver Message/.test(m.text()))report.errors.push(m.text());});
const root=process.env.TEST_BASE_URL||'http://localhost:3000';
const state=()=>page.evaluate(()=>window.__room?.state());
try{
 await page.goto(root+'/studio.html',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.__room?.state().ready,null,{timeout:120000});
 await page.waitForFunction(()=>window.__room.state().observation?.fresh,null,{timeout:60000});
 report.initial=await state();assert.equal(report.initial.runtime,'MuJoCo');
 report.feedbackModule=await page.evaluate(async()=>{const {Facility}=await import('/room/facility.js');return typeof Facility.prototype.reach==='function';});assert.ok(report.feedbackModule,'Feedback module did not load');
 await page.screenshot({path:'test-report/01-factory.png'});
 await page.click('#runBtn');let approved=false;
 for(let i=0;i<240;i++){
  await page.waitForTimeout(1500);const s=await state();
  if(i%12===0)console.log('FACTORY',JSON.stringify({status:s.status,phase:s.phase,physics:s.physics}));
  if(s.status==='AWAITING APPROVAL'){assert.ok(!approved);await page.screenshot({path:'test-report/02-approval.png'});await page.click('#approveBtn');approved=true;}
  if(s.phase===6&&!report.action){await page.screenshot({path:'test-report/03-action.png'});report.action=true;}
  if(s.phase===7&&!report.verification){await page.screenshot({path:'test-report/04-verification.png'});report.verification=true;}
  if(['COMPLETE','BLOCKED','STOPPED'].includes(s.status)){report.final=s;break;}
 }
 report.final??=await state();await page.screenshot({path:'test-report/05-factory-complete.png'});
 assert.equal(report.final.status,'COMPLETE');assert.ok(approved);assert.ok(report.final.physics.valve>=1.45);assert.ok(report.final.physics.pressure<8);assert.ok(Math.hypot(report.final.physics.x+4.4,report.final.physics.y+2.8)<.3);assert.ok(report.final.sampleCount>20);report.checks.completeFactoryMission=true;
 await page.click('#evidenceBtn');assert.ok(await page.locator('#replayPlay').count());await page.screenshot({path:'test-report/06-factory-evidence.png'});await page.click('#closeDialog');
 await page.setViewportSize({width:1366,height:768});await page.waitForTimeout(400);report.laptop=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight}));await page.screenshot({path:'test-report/07-factory-laptop.png'});assert.ok(report.laptop.sw<=1366&&report.laptop.sh<=770);
 await page.setViewportSize({width:1440,height:900});await page.goto(root+'/city.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__city?.state().ready,null,{timeout:120000});report.city=await page.evaluate(()=>window.__city.state());await page.screenshot({path:'test-report/08-city.png'});assert.ok(report.city.observations.traffic.fresh||report.city.observations.crossing.fresh);report.checks.cityVideoAndScene=true;
 assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=e.stack||String(e);try{report.last=await state();await page.screenshot({path:'test-report/failure.png'});}catch{}console.error('FAILED',report.failure);}
finally{await fs.writeFile('test-report/feedback-acceptance.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,checks:report.checks,failure:report.failure,errors:report.errors}));await browser.close();}
if(!report.pass)process.exitCode=1;
