import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.BASE_URL||'http://localhost:3003';
const routes=['thesis','operating-stack','world-model','robotics','demos','roadmap','why-ajay'];
const dir='test-report/architecture';await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const report={pages:[],interactions:[],errors:[]};
const page=await browser.newPage({viewport:{width:1366,height:900}});page.on('pageerror',e=>report.errors.push(e.message));
async function goto(route){const r=await page.goto(base+'/'+route,{waitUntil:'networkidle'});assert.equal(r.status(),200);if(await page.locator('[data-explorer]').getAttribute('data-explorer'))await page.waitForFunction(()=>!!window.__architectureExplorer);}
try{
 const titles=new Set(),heads=new Set();
 for(let i=0;i<routes.length;i++){
  const route=routes[i];await goto(route);const title=await page.title(),head=await page.locator('h1').innerText();assert(!titles.has(title)&&!heads.has(head),'Pages must have distinct titles and headings');titles.add(title);heads.add(head);
  const links=await page.locator('.site-nav nav a').evaluateAll(a=>a.map(x=>x.getAttribute('href')));assert.deepEqual(links,routes.map(r=>'/'+r));assert.equal(await page.locator('.site-nav nav [aria-current=page]').count(),1);assert.equal(await page.locator('.site-nav nav [aria-current=page]').getAttribute('href'),'/'+route);
  const text=await page.locator('body').innerText();assert(!/\b(?:Analog|Hive|Etisalat|Hassantuk)\b|e&\s/i.test(text),'Public page contains restricted branding');assert.equal(await page.locator('.physical-story').count(),0,'Old repeated hero is still visible');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Desktop horizontal overflow');await page.screenshot({path:dir+'/'+route+'.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile horizontal overflow');await page.screenshot({path:dir+'/'+route+'-mobile.png',fullPage:true});await page.setViewportSize({width:1366,height:900});
  const destination=routes[(i+1)%routes.length];await page.locator(`.site-nav nav a[href="/${destination}"]`).click();await page.waitForURL('**/'+destination);assert.equal(new URL(page.url()).pathname,'/'+destination);report.pages.push({route,title,head,navDestination:destination});
 }
 for(const [route,kind]of[['operating-stack','reference'],['robotics','robotics'],['world-model','world']]){
  await goto(route);assert.equal(await page.locator('#layerCanvas .layer').count(),6);for(let i=0;i<6;i++){await page.locator(`[data-layer="${i}"]`).click();assert.equal((await page.evaluate(()=>window.__architectureExplorer.state())).index,i);assert.equal(await page.locator('#detailTitle').innerText(),await page.locator(`[data-layer="${i}"] h2`).innerText());}
  await page.locator('#traceReset').click();await page.locator('#tracePlay').click();await page.waitForFunction(()=>window.__architectureExplorer.state().index>=1);await page.locator('#tracePlay').click();const held=await page.evaluate(()=>window.__architectureExplorer.state().index);await page.waitForTimeout(1600);assert.equal(await page.evaluate(()=>window.__architectureExplorer.state().index),held);await page.locator('#traceReset').click();assert.equal(await page.evaluate(()=>window.__architectureExplorer.state().index),0);report.interactions.push(kind+' layer selection and trace/pause/reset');
 }
 await goto('operating-stack');await page.selectOption('#archVariant','construction');await page.locator('[data-layer="1"]').click();assert((await page.locator('#detailExtra').innerText()).includes('As-built deviation'));
 for(const key of ['alphaz','formant','qualcomm','levatas','optelos','observance','kael','cosmos']){await page.locator(`[data-partner="${key}"]`).first().click();const source=await page.locator('#detailSources a').getAttribute('href');assert(/^https:\/\//.test(source));assert((await page.locator('#detailNote').innerText()).includes('independent proposal'));report.interactions.push({partner:key,source});}
 await page.locator('[data-partner="alphaz"]').first().click();await page.screenshot({path:dir+'/partner-alphaz.png',fullPage:true});
 await goto('robotics');const headings=[];for(const embodiment of ['ground','drone','arm']){await page.selectOption('#archVariant',embodiment);assert.equal(await page.evaluate(()=>window.__architectureExplorer.state().variant),embodiment);const h=await page.locator('#layerCanvas h2').allInnerTexts();headings.push(h.join('|'));await page.screenshot({path:dir+'/robotics-'+embodiment+'.png',fullPage:true});}assert.equal(new Set(headings).size,3);
 await goto('robotics?embodiment=drone&layer=4');assert.equal(await page.locator('#detailTitle').innerText(),'Flight control & failsafes');
 await goto('world-model');await page.locator('#staleState').click();assert.equal(await page.locator('#sampleValue').innerText(),'Unknown');assert((await page.locator('#detailExtra').innerText()).includes('UNKNOWN'));await page.locator('[data-layer="4"]').click();assert((await page.locator('#detailExtra').innerText()).includes('Prediction held'));await page.locator('#freshState').click();assert.equal(await page.locator('#sampleValue').innerText(),'18 L/min');
 await goto('roadmap');const phaseTitles=[];for(let i=0;i<4;i++){await page.locator(`[data-roadmap="${i}"]`).click();phaseTitles.push(await page.locator('#roadmapDetail h2').innerText());}assert.equal(new Set(phaseTitles).size,4);
 for(const name of ['factory','city']){const r=await page.request.get(base+'/demos/'+name);assert.equal(r.status(),200);const html=await r.text();assert(html.includes('/room/showcase.js'));assert(!html.includes('/architecture-explorer.css'),'Demo must not load architecture styles');}
 assert.deepEqual(report.errors,[]);console.log('PASS: seven unique routes, all header destinations, three architecture systems, partner sources, three embodiments, state freshness, trace controls, mobile layout, and untouched demo HTML.');
}catch(e){await page.screenshot({path:dir+'/failure.png',fullPage:true}).catch(()=>{});report.failure=e.message;throw e;}finally{await fs.writeFile(dir+'/results.json',JSON.stringify(report,null,2));await browser.close();}
