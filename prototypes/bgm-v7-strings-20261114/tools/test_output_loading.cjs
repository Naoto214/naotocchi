const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium'});
 try{
  const page=await browser.newPage();page.setDefaultTimeout(15000);
  await page.addInitScript(()=>{const session=new EventTarget();session.type='auto';session.state='active';Object.defineProperty(navigator,'audioSession',{value:session})});
  let release;const barrier=new Promise(resolve=>release=resolve);
  await page.route('**/*.m4a',async route=>{await barrier;await route.continue()});
  const url=process.env.COMPARE_URL||'http://127.0.0.1:8769/bgm-v7-strings/';
  await page.goto(url);await page.locator('.track').first().click();await page.waitForFunction(()=>window.BGM_COMPARE.state().loading);
  await page.evaluate(()=>{navigator.audioSession.state='interrupted';navigator.audioSession.dispatchEvent(new Event('statechange'))});
  release();await page.waitForFunction(()=>!window.BGM_COMPARE.state().loading);
  assert.equal(await page.evaluate(()=>window.BGM_COMPARE.state().playing),false,'interruption during decode must cancel autoplay');
  await page.unroute('**/*.m4a');await page.goto(url);
  await page.evaluate(()=>navigator.audioSession.state='interrupted');
  await page.locator('.track').first().click();await page.waitForFunction(()=>window.BGM_COMPARE.state().id&&!window.BGM_COMPARE.state().loading);
  assert.equal(await page.evaluate(()=>window.BGM_COMPARE.state().playing),false);
  assert.equal(await page.locator('#pause').isDisabled(),false,'completed load must enable retry even with an interrupted session');
  assert.ok(!(await page.locator('#status').textContent()).includes('読み込み中'));
  console.log('PASS loading-time interruption cancels autoplay; preexisting interruption leaves retry controls usable');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
