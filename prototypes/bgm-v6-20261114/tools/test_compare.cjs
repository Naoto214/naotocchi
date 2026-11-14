const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../compare');
assert.ok(fs.existsSync(path.join(root,'index.html')),'comparison page required');
const {chromium,webkit}=require('playwright');
(async()=>{
 for(const [name,browserType] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await browserType.launch({headless:true,...(name==='chromium'?{executablePath:'/usr/bin/chromium'}:{})});
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(process.env.COMPARE_URL||'http://127.0.0.1:8765/bgm-v6/');
  assert.equal(await page.locator('.track').count(),32);
  await page.locator('.track').first().click();
  await page.waitForFunction(()=>window.BGM_COMPARE?.state().playing,{timeout:60000});
  await page.locator('#pause').click();
  await page.locator('#seek').fill('17000');await page.locator('#seek').dispatchEvent('change');
  await page.locator('[data-version="5"]').click();
  await page.waitForFunction(()=>window.BGM_COMPARE.state().version===5&&!window.BGM_COMPARE.state().loading);
  let s=await page.evaluate(()=>window.BGM_COMPARE.state());assert.ok(Math.abs(s.position-17)<.1);assert.equal(s.playing,false);
  await page.locator('#volume').fill('0.35');await page.locator('#volume').dispatchEvent('input');
  await page.locator('#pause').click();
  for(const version of [6,5,6,5,6])await page.locator(`[data-version="${version}"]`).click();
  s=await page.evaluate(()=>window.BGM_COMPARE.state());assert.ok(s.position>=17&&s.position<21);assert.equal(s.volume,.35);assert.equal(s.version,6);assert.equal(s.playing,true);
  await page.locator('#jump36').click();await page.waitForFunction(()=>window.BGM_COMPARE.state().id==='home-day'&&window.BGM_COMPARE.state().playing&&!window.BGM_COMPARE.state().loading);
  s=await page.evaluate(()=>window.BGM_COMPARE.state());assert.ok(s.position>=34&&s.position<38);
  await page.locator('#loop').check();await page.locator('#seek').fill('59900');await page.locator('#seek').dispatchEvent('change');
  await page.waitForFunction(()=>window.BGM_COMPARE.state().position<2);
  await page.locator('.track').nth(3).click();await page.waitForFunction(()=>window.BGM_COMPARE.state().id==='home-night'&&!window.BGM_COMPARE.state().loading);
  assert.equal(await page.locator('#status').getAttribute('role'),'status');assert.equal(errors.length,0,errors.join('\n'));
  console.log(name+': PASS 32 rows, seek, paused/live switching, gain, rapid switches, 34s jump, loop, track change');
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exit(1)});
