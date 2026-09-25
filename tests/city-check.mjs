import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {CityModel} from '../public/room/city-model.js';
const out='test-report';await fs.mkdir(out,{recursive:true});
const report={started:new Date().toISOString(),errors:[],checks:{}};
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
page.on('pageerror',e=>report.errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&!/INFO: Created TensorFlow Lite XNNPACK delegate|WebGL.*(warning|performance)|GL Driver Message/.test(m.text()))report.errors.push(m.text());});
const root=process.env.TEST_BASE_URL||'http://localhost:3000';
const state=()=>page.evaluate(()=>window.__city?.state());
const fit=()=>page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight}));
const capture=name=>page.screenshot({path:`${out}/${name}.png`});
try{
 const m=new CityModel();m.setDemand(6,3);m.requestPlan();let sawWalk=false,sawEW=false;
 for(let i=0;i<1800;i++){m.tick(.05);const s=m.snapshot();if(s.signal==='WALK')sawWalk=true;if(s.policy==='adaptive'&&s.signal==='EW')sawEW=true;assert.ok(!(s.pedestrians>0&&['NS','EW'].includes(s.signal)),'Signal released into pedestrian phase');}
 assert.ok(sawWalk&&sawEW);report.checks.interlocks=true;report.projection=m.projection();assert.notEqual(report.projection.fixedWait,report.projection.adaptiveWait);report.checks.rolloutComputation=true;
 await page.goto(root+'/city.html',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.__city?.state().ready,null,{timeout:120000});
 await page.waitForFunction(()=>window.__city.state().observations.traffic.fresh&&window.__city.state().observations.crossing.fresh,null,{timeout:60000});
 report.initial=await state();report.media=await page.evaluate(()=>fetch('/media/city-manifest.json').then(r=>r.json()));
 report.desktop=await fit();assert.ok(report.desktop.sh<=902&&report.desktop.sw<=1440,'Desktop layout overflow');
 report.fonts=await page.evaluate(()=>Object.fromEntries(['.stack-layer b','#decisionTitle','#activeSkill','#cityFlow b'].map(q=>[q,getComputedStyle(document.querySelector(q)).fontSize])));
 assert.ok(parseFloat(report.fonts['.stack-layer b'])>=14);report.checks.readableType=true;
 const firstTimes=await page.evaluate(()=>[document.querySelector('#trafficVideo').currentTime,document.querySelector('#crossingVideo').currentTime]);await page.waitForTimeout(2500);
 const secondTimes=await page.evaluate(()=>[document.querySelector('#trafficVideo').currentTime,document.querySelector('#crossingVideo').currentTime]);assert.ok(firstTimes.some((v,i)=>Math.abs(v-secondTimes[i])>.2));report.checks.realVideoPlayback=true;
 let foundVehicles=false,foundPeople=false;
 for(let i=0;i<16;i++){const s=await state();foundVehicles||=s.observations.traffic.vehicles>0;foundPeople||=s.observations.crossing.people>0;if(foundVehicles&&foundPeople)break;await page.waitForTimeout(750);}
 report.checks.actualVideoDetections={vehicles:foundVehicles,people:foundPeople};assert.ok(foundVehicles&&foundPeople,'Missing neural detections from real videos');
 await capture('01-city-overview');
 await page.click('#archButton');await page.waitForTimeout(800);await capture('02-city-architecture');await page.click('#traceArchitecture');const title1=await page.locator('#decisionTitle').innerText();await page.waitForTimeout(3200);assert.notEqual(await page.locator('#decisionTitle').innerText(),title1);report.checks.animatedArchitecture=true;await page.click('#archButton');
 await page.click('#runCity');let approved=false;
 for(let i=0;i<180;i++){
  await page.waitForTimeout(1500);const s=await state();
  if(i%10===0)console.log('CITY',s.status,s.phase,s.scene.signal,s.scene.drone.state,s.scene.t.toFixed(1));
  if(s.phase===3&&!report.predictionShot){await capture('03-plan-comparison');report.predictionShot=true;}
  if(s.phase===4&&!report.droneShot&&s.scene.drone.position[1]>5){await capture('04-drone-survey');report.droneShot=true;}
  if(s.status==='AWAITING APPROVAL'){assert.ok(!approved);await capture('05-scoped-approval');report.approval=s;await page.click('#approveCity');approved=true;}
  if(s.phase===6&&!report.executionShot&&s.scene.signal==='EW'){await capture('06-signal-response');report.executionShot=true;}
  if(['COMPLETE','BLOCKED','STOPPED'].includes(s.status)){report.final=s;break;}
 }
 report.final??=await state();await capture('07-city-outcome');assert.equal(report.final.status,'COMPLETE','City mission did not complete');assert.ok(approved);assert.equal(report.final.scene.drone.state,'Docked');assert.equal(report.final.scene.field.state,'At junction');assert.ok(report.final.scene.ewPassed>report.approval.scene.ewPassed,'No traffic response');assert.ok(report.final.samples>20);report.checks.cityEndToEnd=true;
 await page.click('#evidenceCity');report.replayAvailable=await page.locator('#replayRun').count();
 if(report.replayAvailable){await page.click('#replayRun');await page.waitForTimeout(800);assert.ok((await state()).replaying);await capture('08-recorded-replay');}
 else{report.evidenceText=await page.locator('#detailBody').innerText();await page.click('#closeDetails');}
 await page.click('#resetCity');await page.waitForTimeout(500);
 const dl=page.waitForEvent('download');await page.click('#exportCity');await(await dl).saveAs(out+'/city-episode.json');
 await page.click('#runCity');await page.waitForTimeout(7500);await page.click('#stopCity');await page.waitForTimeout(500);const stop=await state();await page.waitForTimeout(1700);const stable=await state();assert.equal(stable.status,'STOPPED');assert.deepEqual(stable.scene.drone.position,stop.scene.drone.position);assert.equal(stable.scene.t,stop.scene.t);report.checks.stopStable=true;await page.click('#resetCity');
 await page.setViewportSize({width:1366,height:768});await page.waitForTimeout(700);report.laptop=await fit();await capture('09-city-laptop');assert.ok(report.laptop.sw<=1366&&report.laptop.sh<=770,'Laptop layout overflow');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(700);report.mobile=await fit();await page.screenshot({path:out+'/10-city-mobile.png',fullPage:true});assert.ok(report.mobile.sw<=390,'Mobile horizontal overflow');
 await page.setViewportSize({width:1440,height:900});await page.goto(root+'/studio.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__room?.state().ready,null,{timeout:120000});
 await page.waitForFunction(()=>window.__room.state().observation?.kind==='occupancy'&&window.__room.state().observation.fresh,null,{timeout:60000});report.factoryInitial=await page.evaluate(()=>window.__room.state());assert.equal(report.factoryInitial.runtime,'MuJoCo');await capture('11-factory-overview');
 report.factoryFit=await fit();assert.ok(report.factoryFit.sw<=1440&&report.factoryFit.sh<=902);
 await page.click('#architectureView');await page.waitForTimeout(500);await capture('12-factory-architecture');await page.click('#liveView');await page.click('#runBtn');
 for(let i=0;i<220;i++){await page.waitForTimeout(1500);const s=await page.evaluate(()=>window.__room.state());if(i%15===0)console.log('FACTORY',s.status,s.phase,s.physics.x.toFixed(2),s.physics.y.toFixed(2));if(s.status==='AWAITING APPROVAL'){await capture('13-factory-approval');await page.click('#approveBtn');}if(s.phase===6&&!report.factoryActionShot){await capture('14-factory-action');report.factoryActionShot=true;}if(['COMPLETE','BLOCKED','STOPPED'].includes(s.status)){report.factoryFinal=s;break;}}
 report.factoryFinal??=await page.evaluate(()=>window.__room.state());await capture('15-factory-outcome');assert.equal(report.factoryFinal.status,'COMPLETE');report.checks.factoryEndToEnd=true;
 await page.setViewportSize({width:1366,height:768});await page.waitForTimeout(300);report.factoryLaptop=await fit();await capture('16-factory-laptop');assert.ok(report.factoryLaptop.sw<=1366&&report.factoryLaptop.sh<=770);
 assert.equal(report.errors.length,0,'Unexpected browser errors');report.pass=true;
}catch(e){report.failure=e.stack||String(e);try{report.last=await state();await capture('failure');}catch{}console.error('ACCEPTANCE FAILURE',report.failure);}
finally{await fs.writeFile(out+'/acceptance.json',JSON.stringify(report,null,2));console.log('ACCEPTANCE',JSON.stringify({pass:report.pass,checks:report.checks,failure:report.failure,errors:report.errors}));await browser.close();}
if(!report.pass)process.exitCode=1;
