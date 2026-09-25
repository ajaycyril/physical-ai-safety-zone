import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const base=process.env.BASE_URL||'http://127.0.0.1:3000';
await fs.mkdir('test-report',{recursive:true});
const report={date:new Date().toISOString(),scope:'Final presentation/component checks; complete real missions run in unified-check.mjs',checks:[],errors:[]};
const check=(condition,name,detail)=>{report.checks.push({name,pass:!!condition,...(detail?{detail}:{})});if(!condition)throw Error(name);};
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
page.on('pageerror',e=>report.errors.push(String(e)));
try{
 for(const city of [true,false]){
  const name=city?'city':'factory';
  await page.goto(base+(city?'/city.html':'/studio.html'),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(c=>c?window.__city?.state().ready:window.__room?.state().ready,city,{timeout:150000});
  await page.waitForFunction(()=>window.__console?.state().unified,null,{timeout:20000});
  for(const [w,h]of [[1440,900],[1366,768]]){
   await page.setViewportSize({width:w,height:h});await page.waitForTimeout(200);
   check(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+2&&document.documentElement.scrollWidth<=innerWidth+1),name+' fits '+w+'x'+h);
   await page.locator('[data-layer="2"]').first().click();
   check(await page.locator('#ucPopover').isVisible(),name+' layer uses a compact inspector');
   const popup=await page.evaluate(c=>{const p=document.querySelector('#ucPopover').getBoundingClientRect(),s=document.querySelector(c?'.stage':'.world-panel').getBoundingClientRect(),css=getComputedStyle(document.querySelector('#ucPopover'));return{clear:p.left>=s.right-1,opacity:css.opacity,animation:css.animationName};},city);
   check(popup.clear&&popup.opacity==='1'&&popup.animation==='none',name+' popup is opaque and outside the live render',popup);
   await page.screenshot({path:'test-report/'+name+'-final-inspector-'+w+'.png'});
   await page.locator('[data-close]').click();
   // Show the approval component directly to test its very first painted frame.
   // This is not consent and does not dispatch any physical action.
   await page.evaluate(()=>document.getElementById('approval').hidden=false);
   const approval=await page.evaluate(c=>{const a=document.getElementById('approval'),r=a.getBoundingClientRect(),s=document.querySelector(c?'.stage':'.world-panel').getBoundingClientRect(),css=getComputedStyle(a);return{opacity:css.opacity,animation:css.animationName,background:css.backgroundColor,clear:r.left>=s.right-1,contentHidden:getComputedStyle(document.querySelector('.uc-inspector-content')).visibility==='hidden'};},city);
   check(approval.opacity==='1'&&approval.animation==='none'&&approval.contentHidden&&approval.clear,name+' approval never blends with telemetry or covers the scene',approval);
   await page.screenshot({path:'test-report/'+name+'-final-approval-component-'+w+'.png'});
   await page.evaluate(()=>document.getElementById('approval').hidden=true);
   check(await page.evaluate(()=>getComputedStyle(document.querySelector('.uc-inspector-content')).visibility==='visible'),name+' live inspector restores after consent panel closes');
  }
  if(!city){
   await page.locator('#runBtn').click();
   await page.waitForTimeout(1400);
   check(await page.locator('#ucCase').isDisabled(),'Scenario cannot change during an active mission');
   await page.locator('#stopBtn').click();
   await page.waitForTimeout(800);
   check(!(await page.locator('#ucCase').isDisabled()),'Scenario selector recovers after a stop');
  }
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' mobile width remains within viewport');
 }
 check(report.errors.length===0,'No uncaught errors in final presentation checks');report.pass=true;
}catch(e){report.pass=false;report.failure=String(e);process.exitCode=1;try{await page.screenshot({path:'test-report/clarity-failure.png'});}catch{}console.error(e);}
finally{await fs.writeFile('test-report/clarity-verification.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({pass:report.pass,checks:report.checks.length,failure:report.failure},null,2));}
