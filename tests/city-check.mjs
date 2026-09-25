import {chromium} from 'playwright';
import fs from 'node:fs/promises';
await fs.mkdir('test-report',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});const result={errors};
const state=()=>page.evaluate(()=>window.__city?.state());
try{
 await page.goto((process.env.TEST_URL||'http://localhost:3000')+'/studio.html?scenario=city',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.__city?.state().ready,{},{timeout:120000});
 await page.waitForFunction(()=>window.__city?.state().observation?.fresh,{},{timeout:60000});
 result.initial=await state();result.manifest=await page.evaluate(()=>fetch('/media/city-manifest.json').then(r=>r.json()));
 result.desktop=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,layer:parseFloat(getComputedStyle(document.querySelector('.layer b')).fontSize),flow:parseFloat(getComputedStyle(document.querySelector('.flow-step b')).fontSize),intent:parseFloat(getComputedStyle(document.getElementById('intent')).fontSize)}));
 await page.screenshot({path:'test-report/city-01-overview.png'});
 await page.click('#architectureView');await page.waitForTimeout(500);await page.screenshot({path:'test-report/city-02-architecture.png'});await page.click('#traceTaskBtn');await page.waitForTimeout(2900);result.trace=await page.locator('#decisionTitle').innerText();await page.click('#liveView');
 await page.click('#runBtn');
 let approvalSeen=false,surveySeen=false;
 for(let i=0;i<100;i++){
  await page.waitForTimeout(1500);const s=await state();
  if(i%8===0)console.log('CITY_PROGRESS',JSON.stringify({status:s.status,phase:s.phase,drone:s.simulation.drone,signal:s.simulation.signal,people:s.simulation.pedestrians,queue:s.simulation.queue,obs:s.observation?.vehicles,events:s.events.slice(-2)}));
  if(s.phase===4&&!surveySeen){surveySeen=true;await page.screenshot({path:'test-report/city-03-survey.png'});}
  if(s.status==='AWAITING APPROVAL'){approvalSeen=true;result.approval=s;await page.screenshot({path:'test-report/city-04-approval.png'});await page.click('#approveBtn');}
  if(s.phase===6&&s.simulation.signal==='WALK')await page.screenshot({path:'test-report/city-05-protected-crossing.png'});
  if(['COMPLETE','BLOCKED','STOPPED'].includes(s.status)){result.final=s;break;}
 }
 result.final??=await state();await page.screenshot({path:'test-report/city-06-outcome.png'});
 await page.click('#forecastBtn');await page.screenshot({path:'test-report/city-07-forecast.png'});await page.click('#closeDialog');
 await page.click('#evidenceBtn');result.replay=await page.locator('#playCityReplay').count();if(result.replay){await page.click('#playCityReplay');await page.waitForTimeout(1200);result.replayStatus=(await state()).status;}await page.click('#resetBtn');await page.waitForTimeout(300);
 await page.click('#runBtn');await page.waitForTimeout(9000);await page.click('#stopBtn');await page.waitForTimeout(500);const a=await state();await page.waitForTimeout(1500);const b=await state();result.stopStable=a.simulation.t===b.simulation.t&&b.status==='STOPPED';
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-report/city-08-mobile.png',fullPage:true});result.mobile=await page.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth}));
 result.pass=result.final?.status==='COMPLETE'&&approvalSeen&&surveySeen&&result.initial.observation.fresh&&result.initial.observation.vehicles>0&&result.manifest.sources.traffic.available&&result.manifest.sources.crossing.available&&result.desktop.sh<=901&&result.desktop.sw<=1440&&result.desktop.layer>=13&&result.desktop.flow>=13&&result.stopStable&&result.mobile.sw<=result.mobile.w&&result.replay>0&&errors.length===0;
}catch(e){result.failure=String(e);try{result.final=await state();await page.screenshot({path:'test-report/city-failure.png'});}catch{}}
await fs.writeFile('test-report/city-report.json',JSON.stringify(result,null,2));console.log('CITY_RESULT',JSON.stringify(result,null,2));await browser.close();if(!result.pass)process.exitCode=1;
