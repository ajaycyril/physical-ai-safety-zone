import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.BASE_URL||'http://localhost:3003';
await fs.mkdir('test-report',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const results=[];
try{
 for(const kind of ['factory','city'])for(const pace of ['step','auto']){
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/demos/${kind}?mode=${pace}`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('demoPlay')?.disabled===false,{}, {timeout:100000});
  assert.equal(await page.locator('#demoPace').inputValue(),pace);assert.equal(await page.locator('[data-demo-step]').count(),8);assert(!/\b(?:analog|hive)\b/i.test(await page.locator('body').innerText()));
  await page.screenshot({path:`test-report/${kind}-${pace}-ready.png`});await page.locator('#demoPlay').click();
  const started=Date.now(),seen=new Set();let finished=null,reviewTested=false,lastData=null,liveChecked=false;
  while(Date.now()-started<260000){
   const data=await page.evaluate(()=>({d:window.__demoDirector.state(),s:(window.__city||window.__room).state(),popup:!!document.getElementById('walkthroughDialog')?.open}));lastData=data;
   if(data.d.finished){finished=data;break;}
   if(['STOPPED','BLOCKED','ERROR','FAILED'].includes(data.s.status))throw Error(kind+' '+pace+' stopped: '+JSON.stringify(data.s.events.slice(-4)));
   if(pace==='step'&&data.popup&&(data.d.waiting||data.s.status==='AWAITING APPROVAL')){
    const n=data.d.stage;seen.add(n);assert.equal(data.s.paused,false,'Reading must not pause the entire scene');
    assert.equal(await page.locator('#walkthroughDialog').evaluate(e=>e.matches(':modal')),false,'Guide must be nonmodal');
    assert.equal(await page.locator('#walkthroughDialog').getAttribute('aria-modal'),'false');
    if(n===0&&!liveChecked){
     await page.waitForFunction(()=>Number(document.getElementById('walkthroughLive')?.dataset.revision)>0);
     const before=await page.evaluate(()=>({rev:Number(document.getElementById('walkthroughLive').dataset.revision),time:document.querySelector('video').currentTime}));
     await page.waitForTimeout(1800);const after=await page.evaluate(()=>({rev:Number(document.getElementById('walkthroughLive').dataset.revision),time:document.querySelector('video').currentTime,stage:window.__demoDirector.state().stage}));
     assert(after.rev>before.rev,'World revisions must update while Next is waiting');assert.notEqual(after.time,before.time,'Video must continue playing');assert.equal(after.stage,n,'Live observation must not release the next action');
     const rects=await page.evaluate(()=>{const scene=document.getElementById('cityScene')||document.getElementById('scene'),a=scene.getBoundingClientRect(),b=document.getElementById('walkthroughDialog').getBoundingClientRect();return{overlap:a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top,filter:getComputedStyle(scene).filter,modalCount:document.querySelectorAll(':modal').length};});
     assert.equal(rects.overlap,false,'Guide must not cover the 3D scene');assert.equal(rects.filter,'none');assert.equal(rects.modalCount,0);
     await page.waitForFunction(()=>{const frame=window.__liveIntelligence.state().frame,live=document.getElementById('walkthroughLive');return Number(live.dataset.revision)===frame.revision&&[...live.querySelectorAll('[data-live-fact]')].every(el=>{const f=frame.facts.find(x=>x.id===el.dataset.liveFact);const v=!f.fresh||f.value==null?'Unknown':(typeof f.value==='number'?f.value.toFixed(f.unit==='bar'||f.unit==='m/s'?1:0):String(f.value))+(f.unit?' '+f.unit:'');return el.querySelector('[data-live-value]').textContent===v;});});
     await page.screenshot({path:`test-report/${kind}-live-guide.png`});liveChecked=true;
    }
    if(n===1&&!reviewTested){await page.locator('.wl-how').evaluate(e=>e.open=true);assert.match(await page.locator('#walkthroughMeaning').innerText(),/shared notebook/);await page.locator('#walkthroughBack').click();assert.equal(await page.evaluate(()=>window.__demoDirector.state().stage),1);await page.locator('#walkthroughNext').click();assert.match(await page.locator('#walkthroughNumber').innerText(),/STEP 2/);reviewTested=true;}
    if(n===0){await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const box=await page.locator('#walkthroughDialog').boundingBox();assert(box.x>=0&&box.x+box.width<=391);await page.screenshot({path:`test-report/${kind}-mobile-live-guide.png`,fullPage:true});await page.setViewportSize({width:1440,height:1000});}
    await page.screenshot({path:`test-report/${kind}-step-${n}.png`});await page.locator('#walkthroughNext').click();
   }
   await page.waitForTimeout(220);
  }
  if(!finished)await fs.writeFile(`test-report/${kind}-${pace}-timeout.json`,JSON.stringify(lastData,null,2));assert(finished,kind+' '+pace+' timed out');assert.equal(finished.s.status,'COMPLETE');assert.equal(finished.d.finished.verified,true);
  if(pace==='step'){assert.deepEqual([...seen].sort(),[0,1,2,3,4,5,6,7]);assert(finished.s.events.some(e=>e.layer==='APPROVAL'&&e.detail?.actor==='operator'));assert(liveChecked);}else assert(finished.s.events.some(e=>e.layer==='APPROVAL'&&e.detail?.actor==='guided-demo'));
  assert.deepEqual(errors,[]);await page.screenshot({path:`test-report/${kind}-${pace}-complete.png`});const summary={kind,pace,seconds:Math.round((Date.now()-started)/1000),stages:[...seen],verified:true,liveWorldState:liveChecked,metrics:finished.d.finished.metrics,errors};results.push(summary);console.log(JSON.stringify(summary));await page.close();
 }
 for(const route of ['/thesis','/operating-stack','/world-model','/robotics','/demos','/roadmap','/why-ajay','/lab']){const page=await browser.newPage();await page.goto(base+route);assert(!/\b(?:analog|hive)\b/i.test(await page.locator('body').innerText()));assert(!/analog|hive/i.test(await page.title()));await page.close();}
 console.log('PASS: nonmodal guide, live video, advancing world-state revisions, source-matched readings, eight action checkpoints and verified outcomes.');
}catch(e){console.error(e);throw e;}finally{await fs.writeFile('test-report/walkthrough-results.json',JSON.stringify(results,null,2));await browser.close();}
