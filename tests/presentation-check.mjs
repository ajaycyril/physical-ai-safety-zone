import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
await fs.mkdir('test-report',{recursive:true});
const r={started:new Date().toISOString(),fullMissionAcceptanceCommit:'71ea42500c18f5b4442c7c632c7c4753966bce6e',checks:{},errors:[],layouts:[]};
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required']});
const p=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});p.on('pageerror',e=>r.errors.push(e.message));
const root=process.env.TEST_BASE_URL||'http://localhost:3000';
async function shot(name){await p.screenshot({path:'test-report/'+name+'.png'});}
async function fit(name){const d=await p.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight}));r.layouts.push({name,...d});assert.ok(d.sw<=d.w+1);if(d.w>1100)assert.ok(d.sh<=d.h+2);}
async function mode(v){await p.click('.pi-tabs [data-mode="'+v+'"]');await p.waitForTimeout(250);}
try{
 for(const city of [true,false]){
  const prefix=city?'city':'factory';await p.setViewportSize({width:1440,height:900});await p.goto(root+(city?'/city.html':'/studio.html'),{waitUntil:'domcontentloaded',timeout:120000});await p.waitForFunction(c=>window.__experience&&(c?window.__city?.state().ready:window.__room?.state().ready),city,{timeout:120000});
  await p.waitForFunction(c=>c?window.__city.state().observations.traffic.fresh:window.__room.state().observation?.fresh,city,{timeout:60000});
  await shot(prefix+'-final-live');
  for(const v of ['architecture','world','robotics']){await mode(v);await fit(prefix+' '+v);await shot(prefix+'-final-'+v);}
  await mode('architecture');const active=p.locator('.pi-tabs button.active');await active.hover();const style=await active.evaluate(e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color}));assert.equal(style.color,'rgb(32, 26, 49)');r.checks[prefix+'TabContrast']=true;
  await mode('world');await p.click('.pi-entity-list [data-entity-select="'+(city?'CAM-T01':'CAM-01')+'"]');await p.click('#piEntityDetail [data-pin]');await p.click('[data-open-pins]');assert.ok((await p.locator('#piDialog').innerText()).includes('Pinned world states'));assert.ok(await p.locator('#piExportPins').isVisible());await shot(prefix+'-final-pinned');await p.click('#piDialog .pi-dialog-close');
  await p.evaluate(()=>document.querySelector('#piSemanticGraph').dataset.identity='retained');await p.waitForTimeout(1600);assert.equal(await p.locator('#piSemanticGraph').getAttribute('data-identity'),'retained');r.checks[prefix+'StableGraph']=true;
  await p.click('.pi-subtabs [data-world-tab="history"]');await p.waitForTimeout(700);await shot(prefix+'-final-history');await p.click('.pi-subtabs [data-world-tab="predict"]');await p.click('#piComputePrediction');assert.ok(await p.locator('.pi-prediction-results').isVisible());await shot(prefix+'-final-prediction');
  await mode('robotics');await p.click('.pi-skill-grid [data-skill="actuate"]');await shot(prefix+'-final-contract');await p.click('#piDialog .pi-dialog-close');
  await mode('live');await p.waitForTimeout(900);const canvas=await p.locator(city?'#cityScene canvas':'#scene canvas').boundingBox();assert.ok(canvas.width>300&&canvas.height>200);await p.click('#piSignalsButton');await shot(prefix+'-final-signals');await p.click('[data-close-drawer]');
  await p.setViewportSize({width:1366,height:768});for(const v of ['live','architecture','world','robotics']){await mode(v);await fit(prefix+' laptop '+v);await shot(prefix+'-laptop-'+v);}
  await p.setViewportSize({width:390,height:844});for(const v of ['architecture','world','robotics','live']){await mode(v);await fit(prefix+' mobile '+v);}await p.screenshot({path:'test-report/'+prefix+'-final-mobile.png',fullPage:true});
  r.checks[prefix+'Presentation']=true;
 }
 // Deep-link initialization is exercised separately from clicking the tabs.
 await p.setViewportSize({width:1440,height:900});await p.goto(root+'/city.html?view=world',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.__experience?.state().mode==='world',null,{timeout:60000});await p.waitForFunction(()=>document.querySelectorAll('.pi-entity-list button').length>=7,null,{timeout:60000});r.checks.worldDeepLink=true;
 assert.equal(r.errors.length,0);r.pass=true;
}catch(e){r.failure=e.stack||String(e);await shot('presentation-failure').catch(()=>{});}
finally{await fs.writeFile('test-report/presentation-acceptance.json',JSON.stringify(r,null,2));console.log(JSON.stringify(r));await browser.close();}
if(!r.pass)process.exitCode=1;
