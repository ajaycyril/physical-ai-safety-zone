import { chromium } from 'playwright';
import fs from 'node:fs/promises';
await fs.mkdir('test-report', { recursive: true });
const browser = await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required']});
const page = await browser.newPage({viewport:{width:1440,height:900}});
const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.goto('http://localhost:3000/lab', {waitUntil:'networkidle',timeout:120000});
await page.waitForTimeout(6000);
await page.screenshot({path:'test-report/desktop-initial.png'});
const result={before:await page.locator('body').innerText(),errors};
const button = page.getByRole('button',{name:/RUN END-TO-END DEMO|Run mission|Begin inspection/i}).first();
if(await button.count() && await button.isEnabled()) { await button.click(); await page.waitForTimeout(18000); }
await page.screenshot({path:'test-report/desktop-active.png'});
result.after=await page.locator('body').innerText();
result.layout=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:innerHeight,scrollHeight:document.documentElement.scrollHeight}));
await page.setViewportSize({width:390,height:844}); await page.screenshot({path:'test-report/mobile.png',fullPage:true});
try {
const media = await browser.newPage();
await media.goto('https://www.pexels.com/video/a-gauge-use-to-measure-quantity-and-weight-2853796/', {waitUntil:'domcontentloaded',timeout:45000});
result.media=await media.evaluate(()=>({src:[...document.querySelectorAll('video,video source')].map(e=>e.src||e.currentSrc), text:document.body.innerText.slice(0,1500),matches:document.documentElement.outerHTML.match(/https[^\s"<>]+\.mp4[^\s"<>]*/g)?.slice(0,10)}));
await media.screenshot({path:'test-report/sample-source.png'});
} catch(e) {result.mediaError=String(e)}
await fs.writeFile('test-report/report.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
await browser.close();
