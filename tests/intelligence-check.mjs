import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.BASE_URL||'http://localhost:3003';
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const results=[];
try {
  for(const kind of ['factory','city']) {
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/demos/'+kind);
    await page.waitForFunction(()=>window.__liveIntelligence?.state().frame&&document.getElementById('demoPlay')?.disabled===false,{},{timeout:90000});
    await page.locator('#intelTabs [data-intel-tab=world]').click();
    const before=await page.evaluate(()=>window.__liveIntelligence.state().frame.revision);
    await page.waitForFunction(n=>window.__liveIntelligence.state().frame.revision>n, before);
    assert(await page.locator('.intel-graph').isVisible());
    await page.locator(`[data-intel-entity="${kind==='factory'?'P-204':'J-01'}"]`).first().click();
    await page.screenshot({path:`test-report/intelligence-${kind}-world.png`});
    await page.locator('#intelTabs [data-intel-tab=agent]').click();
    await page.getByRole('textbox',{name:'Ask the live agent'}).fill(kind==='factory'?'What is the pressure?':'What is the junction queue?');
    await page.locator('#intelQuestion').evaluate(e=>e.requestSubmit());
    assert.match(await page.locator('#intelAnswer').innerText(),kind==='factory'?/P-204/:/J-01/);
    await page.locator('#demoPlay').click();
    const start=Date.now(),views=new Set(),captured=new Set();let held=false;
    while(Date.now()-start<150000) {
      const s=await page.evaluate(()=>({i:window.__liveIntelligence.state(),d:window.__demoDirector.state(),r:window.__city?.state()||window.__room.state()}));
      views.add(s.i.selected);
      if(s.i.selected!=='mission'&&!captured.has(s.i.selected)&&s.i.frame.phase>=0){captured.add(s.i.selected);await page.screenshot({path:`test-report/intelligence-${kind}-${s.i.selected}-running.png`});}
      if(s.i.selected==='hive'&&s.r.phase===4&&!held){held=true;await page.locator('[data-runtime-control=pause]').click();await page.waitForFunction(()=>window.__liveIntelligence.state().frame.paused);const pose=await page.evaluate(()=>JSON.stringify((window.__city?.state().scene||window.__room.state().physics)));await page.waitForTimeout(900);const paused=await page.evaluate(()=>window.__liveIntelligence.state());assert(paused.frame.held);assert(paused.frame.resources.every(r=>r.held));await page.locator('[data-runtime-control=pause]').click();}
      if(s.d.finished){assert(s.d.finished.verified);break;}
      if(['BLOCKED','STOPPED','FAILED'].includes(s.r.status))throw Error(kind+' '+s.r.status+' '+JSON.stringify(s.r.events.slice(-2)));
      await page.waitForTimeout(150);
    }
    await page.waitForFunction(()=>window.__liveIntelligence.state().frame.complete,{},{timeout:3000});
    for(const view of ['world','agent','hive'])assert(views.has(view),'automatic follow missed '+view);
    assert(held,'pause/resume was exercised');
    await page.locator('#intelTabs [data-intel-tab=hive]').click();
    const completed=await page.evaluate(()=>window.__liveIntelligence.state().frame);
    assert(completed.tasks.every(t=>['done','skipped'].includes(t.state)),JSON.stringify(completed.tasks));
    assert.equal(completed.agent.approval.actor,'guided-demo');
    await page.screenshot({path:`test-report/intelligence-${kind}-hive-complete.png`});
    await page.locator('#intelTabs [data-intel-tab=world]').click();
    await page.locator('[data-world-view=prediction]').click();assert(await page.locator('.intel-comparison').isVisible());
    await page.screenshot({path:`test-report/intelligence-${kind}-prediction.png`});
    await page.locator('[data-world-view=memory]').click();await page.locator('[data-memory=previous]').click();
    const frozen=await page.evaluate(()=>window.__liveIntelligence.state().frozen.revision);await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>window.__liveIntelligence.state().frozen.revision),frozen);assert.equal(await page.locator('#intelMode').innerText(),'REPLAY');
    await page.locator('[data-memory=live]').click();assert.equal(await page.locator('#intelMode').innerText(),'LIVE');
    const exported=await page.evaluate(()=>window.__liveIntelligence.export());assert.equal(exported.scope,'simulation-only');assert(exported.frames.some(f=>f.agent.approval));
    for(const width of [1024,768,390]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`test-report/intelligence-${kind}-${width}.png`,fullPage:true});}
    assert.deepEqual(errors,[]);results.push({kind,seconds:(Date.now()-start)/1000,views:[...views],revisions:completed.revision,tasks:completed.tasks.map(t=>[t.id,t.state]),errors});
    await page.close();
  }
  console.log(JSON.stringify(results,null,2));
} finally {await fs.writeFile('test-report/intelligence.json',JSON.stringify(results,null,2));await browser.close();}
