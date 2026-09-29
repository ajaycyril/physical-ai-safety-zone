import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.BASE_URL||'http://localhost:3001';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
for(const width of [1440,768,390]){
 await page.setViewportSize({width,height:1000});
 for(const path of ['/thesis','/operating-stack?view=eand#stack','/world-model','/robotics','/demos','/roadmap','/why-ajay']){
  assert.equal((await page.goto(base+path)).status(),200);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${path} overflow ${width}`);
  assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(247, 247, 242)');
 }
 await page.goto(base+'/operating-stack?view=eand#stack');
 assert.equal(await page.locator('#eand-tab').getAttribute('aria-selected'),'true');
 assert.equal(await page.locator('.eand-row').count(),12);
 assert(await page.locator('.eand-extension').innerText().then(s=>s.includes('not a photographed e& component')));
 await page.screenshot({path:`test-report/eand-light-${width}.png`,fullPage:true});
 await page.locator('#architecture-tab').click();
 assert(await page.locator('.operating-grid').isVisible());
 await page.screenshot({path:`test-report/architecture-light-${width}.png`,fullPage:true});
 await page.locator('#architecture-tab').press('ArrowRight');
 assert.equal(await page.locator('#eand-tab').getAttribute('aria-selected'),'true');
 await page.reload();assert(await page.locator('#eand-panel').isVisible());
}
await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/thesis');
assert.equal(await page.locator('[data-pending]').count(),0);
assert.deepEqual(errors,[]);
console.log('PASS: light theme on seven sections at three widths; e& mapping, tab switching, keyboard access, deep links, reduced motion, no browser errors.');
}finally{await browser.close()}
