// Run with an approved browser QA capability against the existing static server.
// This session did not execute browser QA; see UI-IMPLEMENTATION.md.
const {chromium,webkit}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const browser=await (process.env.BROWSER==='webkit'?webkit:chromium).launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 const page=await browser.newPage({hasTouch:true,isMobile:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const viewport of [{width:844,height:390},{width:932,height:430},{width:667,height:375},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.goto('http://127.0.0.1:8765/prototypes/card-game/');
  assert.equal(await page.locator('#catalog-list .card-face').count(),452);
  await page.locator('#new').click();assert.equal(await page.locator('#hand').count(),0);
  await page.locator('#reveal').click();
  assert.equal(await page.locator('.player-board .slot').count(),18);
  assert.equal(await page.locator('.egg-image').count(),2);
  const checks=await page.evaluate(()=>{
   const box=s=>document.querySelector(s).getBoundingClientRect(),o=box('.opponent'),a=box('.own'),c=box('.control-panel'),hand=box('#hand');
   const landscape=innerWidth>innerHeight;return {noHorizontalOverflow:document.documentElement.scrollWidth<=innerWidth,landscape,ordered:!landscape||(o.right<=a.left&&a.right<=c.left),larger:!landscape||a.width>o.width,handSeparate:!landscape||Math.max(o.bottom,a.bottom,c.bottom)<=hand.top+1};
  });
  assert.ok(checks.noHorizontalOverflow);assert.ok(checks.ordered);assert.ok(checks.larger);assert.ok(checks.handSeparate);
  await page.locator('#hand .card-tap').first().click();assert.ok(await page.locator('#card-dialog').isVisible());assert.ok(await page.locator('.full-effect').innerText());
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  assert.equal(await page.locator('#hand').count(),0);assert.equal(await page.locator('#card-dialog .card-face').count(),0);assert.equal(await page.locator('#confirm-dialog button').count(),0);
  await page.locator('#reveal').click();await page.locator('#hide').click();assert.equal(await page.locator('#actions').count(),0);
  await page.reload();await page.locator('#restore').click();assert.equal(await page.locator('#hand').count(),0);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({viewports:4,all452:true,detail:true,privacy:true,restore:true,pageErrors:errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
