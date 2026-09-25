import { chromium } from 'playwright';
import fs from 'node:fs/promises';
await fs.mkdir('test-report',{recursive:true});
await fs.cp('public','test-report/site',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const result={errors};
const state=()=>page.evaluate(()=>window.__room?.state());
try{
 await page.goto('http://localhost:3000/studio.html',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.__room?.state().ready,{},{timeout:120000});
 await page.waitForTimeout(9000);
 result.initial=await state();result.manifest=await page.evaluate(()=>fetch('/media/manifest.json').then(r=>r.json()));
 result.desktop=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight}));
 await page.screenshot({path:'test-report/01-studio.png'});
 await page.click('#architectureView');await page.waitForTimeout(700);await page.screenshot({path:'test-report/02-architecture.png'});await page.click('#liveView');
 await page.click('#runBtn');
 for(let i=0;i<75;i++){
  await page.waitForTimeout(2000);const s=await state();
  if(i%5===0)console.log('PROGRESS',JSON.stringify({phase:s.phase,status:s.status,x:s.physics.x,y:s.physics.y,j:s.physics.joints,p:s.physics.pressure,events:s.events.slice(-2),obs:s.observation}));
  if(i===6)await page.screenshot({path:'test-report/03-navigation.png'});
  if(s.status==='AWAITING APPROVAL'){result.approval=s;await page.screenshot({path:'test-report/04-approval.png'});await page.click('#approveBtn');}
  if(['COMPLETE','BLOCKED','STOPPED'].includes(s.status)){result.final=s;break;}
 }
 result.final??=await state();await page.screenshot({path:'test-report/05-outcome.png'});
 await page.selectOption('#sourceSelect','gauge');await page.waitForTimeout(1500);result.gauge=await state();await page.screenshot({path:'test-report/06-gauge.png'});
 await page.setViewportSize({width:1366,height:768});result.laptop=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight}));await page.screenshot({path:'test-report/07-laptop.png'});
 await page.setViewportSize({width:390,height:844});result.mobile=await page.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth}));await page.screenshot({path:'test-report/08-mobile.png',fullPage:true});
 result.pass=result.final?.status==='COMPLETE'&&result.initial?.runtime==='MuJoCo'&&result.desktop.sh<=result.desktop.h+1&&result.desktop.sw<=result.desktop.w;
}catch(e){result.failure=String(e);try{result.final=await state();await page.screenshot({path:'test-report/failure.png'});}catch{}}
await fs.writeFile('test-report/report.json',JSON.stringify(result,null,2));
console.log('RESULT',JSON.stringify({...result,initial:{...result.initial,events:undefined},final:{...result.final,samples:undefined}},null,2));
await browser.close();
if(!result.pass)process.exitCode=1;
