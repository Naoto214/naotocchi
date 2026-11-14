const assert=require('node:assert/strict');const path=require('node:path');const {chromium,webkit}=require('playwright');
(async()=>{for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch({headless:true,...(name==='chromium'?{executablePath:'/usr/bin/chromium'}:{})});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(process.env.COMPARE_URL||'http://127.0.0.1:8771/bgm-v7-complete/');assert.equal(await page.locator('.track').count(),32);
 await page.locator('.track').first().click();await page.waitForFunction(()=>BGM_COMPARE.state().playing);assert.equal(await page.locator('[data-version="6"]').isDisabled(),true);
 await page.locator('.track').nth(4).click();await page.waitForFunction(()=>BGM_COMPARE.state().id==='poyo-1'&&BGM_COMPARE.state().playing&&!BGM_COMPARE.state().loading);
 await page.locator('#pause').click();await page.locator('#seek').fill('17000');await page.locator('#seek').dispatchEvent('change');await page.locator('[data-version="6"]').click();let s=await page.evaluate(()=>BGM_COMPARE.state());assert.equal(s.version,6);assert.equal(s.playing,false);assert.ok(Math.abs(s.position-17)<.1);
 await page.locator('#volume').fill('.35');await page.locator('#volume').dispatchEvent('input');await page.locator('#pause').click();for(const v of [7,6,7,6])await page.locator(`[data-version="${v}"]`).click();s=await page.evaluate(()=>BGM_COMPARE.state());assert.equal(s.volume,.35);assert.ok(s.position>=17&&s.position<22);assert.equal(s.playing,true);
 await page.locator('#jump36').click();await page.waitForFunction(()=>BGM_COMPARE.state().id==='home-day'&&BGM_COMPARE.state().playing&&!BGM_COMPARE.state().loading);assert.equal(await page.evaluate(()=>BGM_COMPARE.state().version),7);
 await page.locator('#loop').check();await page.locator('#seek').fill('59900');await page.locator('#seek').dispatchEvent('change');await page.waitForFunction(()=>BGM_COMPARE.state().position>.2&&BGM_COMPARE.state().position<2);assert.equal(await page.evaluate(()=>BGM_COMPARE.state().id),'home-day');
 const pos=await page.evaluate(()=>BGM_COMPARE.state().position);await page.locator('#loop').uncheck();assert.ok(Math.abs(await page.evaluate(()=>BGM_COMPARE.state().position)-pos)<.3);
 await page.locator('.track').first().click();await page.waitForFunction(()=>BGM_COMPARE.state().id==='home-morning'&&BGM_COMPARE.state().playing&&!BGM_COMPARE.state().loading);
 for(let i=0;i<32;i++){
  await page.waitForFunction(i=>BGM_COMPARE.state().id===BGM_COMPARE.tracks[i].id&&BGM_COMPARE.state().playing&&!BGM_COMPARE.state().loading,i);
  const near=await page.evaluate(i=>Math.max(0,Math.floor((BGM_COMPARE.tracks[i].duration-.15)*1000)),i);await page.locator('#seek').fill(String(near));await page.locator('#seek').dispatchEvent('change');
 }
 await page.waitForFunction(()=>BGM_COMPARE.state().id===BGM_COMPARE.tracks[31].id&&!BGM_COMPARE.state().playing&&!BGM_COMPARE.state().loading);
 await page.locator('#continuous').uncheck();await page.locator('.track').nth(24).click();await page.waitForFunction(()=>BGM_COMPARE.state().id===BGM_COMPARE.tracks[24].id&&BGM_COMPARE.state().playing);const end=await page.evaluate(()=>Math.floor((BGM_COMPARE.tracks[24].duration-.1)*1000));await page.locator('#seek').fill(String(end));await page.locator('#seek').dispatchEvent('change');await page.waitForFunction(()=>!BGM_COMPARE.state().playing);assert.equal(await page.evaluate(()=>BGM_COMPARE.state().id),'var-koro-goal');
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:path.resolve(__dirname,'../verification/'+name+'-mobile.png'),fullPage:true});console.log(name+': PASS 32 real-track sequential boundaries and final stop; home lock; V6/V7 same-position/gain; loop; opt-out; mobile layout');
 }finally{await browser.close()}
}})().catch(e=>{console.error(e);process.exit(1)});
