import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.BASE_URL||'http://localhost:3003';
await fs.mkdir('test-report',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const results=[];
try{
 for(const kind of ['factory','city'])for(const pace of ['step','auto']){
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/demos/${kind}?mode=${pace}`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('demoPlay')?.disabled===false,{}, {timeout:100000});
  assert.equal(await page.locator('#demoPace').inputValue(),pace);
  assert.equal(await page.locator('[data-demo-step]').count(),8);
  assert(!/\b(?:analog|hive)\b/i.test(await page.locator('body').innerText()));
  await page.screenshot({path:`test-report/${kind}-${pace}-ready.png`});
  await page.locator('#demoPlay').click();
  const started=Date.now(),seen=new Set();let finished=null,reviewTested=false;
  while(Date.now()-started<240000){
   const data=await page.evaluate(()=>({d:window.__demoDirector.state(),s:(window.__city||window.__room).state()}));
   if(data.d.finished){finished=data;break;}
   if(['STOPPED','BLOCKED','ERROR','FAILED'].includes(data.s.status))throw Error(kind+' '+pace+' stopped: '+JSON.stringify(data.s.events.slice(-4)));
   if(pace==='step'&&await page.locator('#walkthroughDialog').isVisible()){
    const n=data.d.stage;seen.add(n);
    assert.equal(data.s.paused,true,'A step popup must hold execution');
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(()=>window.__demoDirector.state().stage),n,'A checkpoint must not silently advance');
    if(n===1&&!reviewTested){
     assert.match(await page.locator('#walkthroughMeaning').innerText(),/shared notebook/);
     await page.locator('#walkthroughBack').click();
     assert.equal(await page.evaluate(()=>window.__demoDirector.state().stage),1,'Review is not a rewind');
     await page.locator('#walkthroughNext').click();
     assert.match(await page.locator('#walkthroughNumber').innerText(),/STEP 2/);reviewTested=true;
    }
    if(n===0){
     await page.setViewportSize({width:390,height:844});
     assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile horizontal overflow');
     const box=await page.locator('#walkthroughDialog').boundingBox();assert(box.x>=0&&box.x+box.width<=391,'Dialog outside viewport');
     await page.screenshot({path:`test-report/${kind}-mobile-popup.png`});
     await page.setViewportSize({width:1440,height:1000});
    }
    await page.screenshot({path:`test-report/${kind}-step-${n}.png`});
    await page.locator('#walkthroughNext').click();
   }
   await page.waitForTimeout(220);
  }
  assert(finished,kind+' '+pace+' timed out');
  assert.equal(finished.s.status,'COMPLETE');assert.equal(finished.d.finished.verified,true,'Result must be verified by feedback');
  if(pace==='step'){assert.deepEqual([...seen].sort(),[0,1,2,3,4,5,6,7]);assert(finished.s.events.some(e=>e.layer==='APPROVAL'&&e.detail?.actor==='operator'));}
  else assert(finished.s.events.some(e=>e.layer==='APPROVAL'&&e.detail?.actor==='guided-demo'));
  assert.deepEqual(errors,[]);
  await page.screenshot({path:`test-report/${kind}-${pace}-complete.png`});
  const summary={kind,pace,seconds:Math.round((Date.now()-started)/1000),stages:[...seen],verified:finished.d.finished.verified,metrics:finished.d.finished.metrics,errors};results.push(summary);console.log(JSON.stringify(summary));
  await page.close();
 }
 for(const route of ['/thesis','/operating-stack','/world-model','/robotics','/demos','/roadmap','/why-ajay','/lab']){
  const page=await browser.newPage();await page.goto(base+route);const body=await page.locator('body').innerText();assert(!/\b(?:analog|hive)\b/i.test(body),route+' contains old branding');assert(!/analog|hive/i.test(await page.title()));const links=await page.locator('a').evaluateAll(a=>a.map(e=>e.getAttribute('href')).join(' '));assert(!/analog\.io|analog-physical-intelligence/i.test(links));await page.close();
 }
 console.log('PASS: eight explicit checkpoints, manual approval, automatic playback, mobile popups, source-neutral pages, and feedback-verified results.');
}catch(e){console.error(e);throw e;}finally{await fs.writeFile('test-report/walkthrough-results.json',JSON.stringify(results,null,2));await browser.close();}
