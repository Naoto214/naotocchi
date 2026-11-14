const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
(async()=>{
 for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await type.launch({headless:true,...(name==='chromium'?{executablePath:'/usr/bin/chromium'}:{})});
  try {
   const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
   page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.addInitScript(()=>{const C=window.AudioContext||window.webkitAudioContext;window.testContexts=[];window.AudioContext=class extends C{constructor(...a){super(...a);window.testContexts.push(this)}};});
   await page.goto(process.env.COMPARE_URL||'http://127.0.0.1:8770/bgm-v7-final/');
   await page.locator('.track').first().click();await page.waitForFunction(()=>window.BGM_COMPARE.state().playing);
   await page.waitForFunction(()=>window.BGM_COMPARE.diagnostics().graphRms>.00001);
   await page.evaluate(()=>window.testContexts.at(-1).suspend());
   await page.waitForTimeout(100);
   assert.equal(await page.evaluate(()=>window.BGM_COMPARE.state().playing),false,'suspended output must not keep reporting playback');
   await page.locator('#seek').fill('17000');await page.locator('#seek').dispatchEvent('change');
   await page.locator('[data-version="7"]').click();
   await page.locator('#volume').fill('0.35');await page.locator('#volume').dispatchEvent('input');
   const serial=await page.evaluate(()=>window.BGM_COMPARE.diagnostics().contextSerial);
   await page.locator('#reconnect').click();await page.waitForFunction(()=>window.BGM_COMPARE.state().playing);
   const s=await page.evaluate(()=>window.BGM_COMPARE.state());assert.equal(s.version,7);assert.equal(s.volume,.35);assert.ok(s.position>=17&&s.position<19);
   assert.equal(await page.evaluate(()=>window.BGM_COMPARE.diagnostics().contextSerial),serial+1);
   assert.equal(await page.evaluate(()=>window.testContexts[0].state),'closed');
   await page.waitForFunction(()=>window.BGM_COMPARE.diagnostics().graphRms>.00001);
   assert.ok(Math.abs(await page.evaluate(()=>window.BGM_COMPARE.diagnostics().gain)-.35)<1e-6);
   // Synthetic event verifies our response, not actual iPhone route detection.
   await page.evaluate(()=>window.testContexts.at(-1).dispatchEvent(new Event('sinkchange')));
   assert.equal(await page.evaluate(()=>window.BGM_COMPARE.state().playing),false);
   await page.locator('summary').click();await page.locator('#diagnosticRefresh').click();assert.match(await page.locator('#diagnosticText').inputValue(),/unknown: browser cannot verify speaker audibility/);
   await page.locator('#outputCheck').click();await page.waitForURL(/output-check.html/);
   assert.equal(await page.evaluate(()=>window.testContexts.length),0,'native diagnostic must create NO AudioContext');
   await page.locator('#nativePlay').click();await page.waitForFunction(()=>{const a=document.querySelector('audio');return !a.paused&&a.currentTime>17});
   assert.equal(await page.evaluate(()=>window.testContexts.length),0);
   assert.ok((await page.locator('audio').getAttribute('src')).includes('/audio/v7-final/home-morning.m4a'));
   await page.locator('#report').click();let report=JSON.parse(await page.locator('#result').inputValue());assert.equal(report.userReportedSpeaker,'unconfirmed');
   await page.locator('#heard').selectOption('silent');await page.locator('#report').click();report=JSON.parse(await page.locator('#result').inputValue());assert.equal(report.userReportedSpeaker,'silent');
   assert.equal(errors.length,0,errors.join('\n'));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   console.log(name+': PASS context suspension, graph signal (NOT speaker proof), same-position/gain reconnection, old context closed, synthetic sink interruption, independent native AAC, user-only audibility report');
   // Feature-detected session configuration: unsupported browsers still work above.
   await page.addInitScript(()=>{const session=new EventTarget();session.type='auto';session.state='active';Object.defineProperty(navigator,'audioSession',{value:session,configurable:true});});
   await page.goto(process.env.COMPARE_URL||'http://127.0.0.1:8770/bgm-v7-final/');await page.locator('.track').first().click();await page.waitForFunction(()=>window.BGM_COMPARE.state().playing);
   assert.equal(await page.evaluate(()=>navigator.audioSession.type),'playback');
   await page.evaluate(()=>{navigator.audioSession.state='interrupted';navigator.audioSession.dispatchEvent(new Event('statechange'))});
   assert.equal(await page.evaluate(()=>window.BGM_COMPARE.state().playing),false);
   console.log(name+': PASS simulated AudioSession playback declaration and interruption');
  } finally {await browser.close()}
 }
})().catch(e=>{console.error(e);process.exit(1)});
