// Run only with an approved browser QA capability. Not executed in the managed Sites session.
const {chromium,webkit}=require('playwright');const assert=require('node:assert/strict');
const {closeDetail,projection,actionButton,reveal}=require('./ui-browser-helpers.cjs');
(async()=>{
 const browser=await(process.env.BROWSER==='webkit'?webkit:chromium).launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 const page=await browser.newPage({hasTouch:true,isMobile:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url=process.env.QA_URL||'http://127.0.0.1:8765/prototypes/card-game/';
 for(const viewport of [{width:844,height:390},{width:932,height:430},{width:667,height:375},{width:844,height:280},{width:390,height:664},{width:320,height:480}]){
  await page.setViewportSize(viewport);await page.goto(url);assert.equal(await page.locator('#catalog-list .card-face').count(),452);
  await page.locator('#welcome [data-menu]').click();assert.ok(await page.locator('#import').isVisible());await page.locator('#menu-dialog [data-close]').click();
  await page.locator('#new').click();assert.equal(await page.locator('#hand').count(),0);await reveal(page);await closeDetail(page);
  assert.equal(await page.locator('.player-board .slot').count(),18);
  const check=await page.evaluate(()=>{
   const box=s=>document.querySelector(s).getBoundingClientRect(),far=box('.opponent-shell'),near=box('.own-shell'),panel=box('#operation-panel'),hand=box('#hand'),landscape=innerWidth>innerHeight;
   return{overflow:document.documentElement.scrollWidth>innerWidth,ordered:landscape?far.right<=near.left&&near.right<=panel.left:far.bottom<=near.top&&near.bottom<=panel.top,separate:Math.max(far.bottom,near.bottom,panel.bottom)<=hand.top+1,pinned:far.top>=0&&far.bottom<=innerHeight,slots:[...document.querySelectorAll('.own .slot')].every(n=>{const b=n.getBoundingClientRect();return b.height>=20&&(landscape?Math.abs(b.width/b.height-1.05)<.05:b.height>=44);}),eggs:[...document.querySelectorAll('.egg-main .egg-image')].every(n=>{const b=n.getBoundingClientRect(),p=n.parentElement.getBoundingClientRect();return b.top>=p.top&&b.bottom<=p.bottom+1&&getComputedStyle(n).objectFit==='contain';})};
  });assert.ok(!check.overflow&&check.ordered&&check.separate&&check.pinned&&check.slots&&check.eggs,JSON.stringify({viewport,check}));
  assert.equal(await page.locator('#operation-panel .operation-notice').count(),1);if(viewport.height>viewport.width){assert.ok((await page.locator('#operation-panel').boundingBox()).height<=60);assert.ok((await page.locator('.own-shell').boundingBox()).height>=72);}assert.equal(await page.locator('#operation-panel [data-choice-card]').count(),0);
  // QA9: result row never overlaps a board or guide; close/replay does not change the save.
  if(await page.locator('.result-notice').count()){
   const originalSave=await page.evaluate(()=>localStorage.getItem('naotocchi-hotseat-v1'));
   assert.ok(await page.evaluate(()=>{const r=document.querySelector('#result-feedback').getBoundingClientRect(),b=document.querySelector('.battle-area').getBoundingClientRect();return r.bottom<=b.top&&getComputedStyle(document.querySelector('#result-feedback')).position!=='fixed';}));
   await page.locator('[data-result-collapse]').click();assert.equal(await page.locator('.result-notice').count(),0);assert.ok(await page.locator('#operation-panel').isVisible());
   await page.locator('[data-result-reopen]').click();await page.waitForFunction(()=>!document.querySelector('.result-notice'),{},{timeout:5000});
   assert.equal(await page.evaluate(()=>localStorage.getItem('naotocchi-hotseat-v1')),originalSave);
  }
  // Presentation-only fixture checks CSS in the actual zone contexts, without touching game state.
  const cardsOK=await page.evaluate(async()=>{const ui=await import('./ui-presentation.mjs'),{CARDS}=await import('./engine.mjs'),c=CARDS['M-beetle-01'],fixture=document.createElement('div');fixture.innerHTML='<div class="zone-body"><div class="discard-cards"><div>'+ui.browseButton(c)+'<small class="zone-card-caption">1. test</small></div></div><article class="activation-entry">'+ui.browseButton(c)+'<div><strong>解決順 1</strong></div></article></div>';document.body.append(fixture);
   const ok=[...fixture.querySelectorAll('.card-face')].every(n=>{const b=n.getBoundingClientRect(),category=n.querySelector('.card-category'),title=n.querySelector('.card-title');return Math.abs(b.width/b.height-2/3)<.01&&!n.querySelector('.card-copy,.card-footer,.card-stats small')&&parseFloat(getComputedStyle(category).fontSize)<b.width*.08&&parseFloat(getComputedStyle(title).fontSize)<b.width*.12;});fixture.remove();return ok;});assert.ok(cardsOK,'zone typography must not override card internals');
  const opponentTop=await page.locator('.opponent-shell').evaluate(n=>n.getBoundingClientRect().top);await page.locator('.own-shell').evaluate(n=>{n.scrollTop=100;});assert.equal(await page.locator('.opponent-shell').evaluate(n=>n.getBoundingClientRect().top),opponentTop);
  if(await page.locator('#hand.hand-collapsed').count())await page.locator('[data-hand-toggle]').click();
  const saved=await page.evaluate(()=>localStorage.getItem('naotocchi-hotseat-v1')),before=await page.locator('[data-hand-entry]').evaluateAll(ns=>ns.map(n=>n.dataset.handEntry));
  const first=await page.locator('.hand-card').first().boundingBox(),second=await page.locator('.hand-card').nth(1).boundingBox();
  await page.mouse.move(first.x+first.width/2,first.y+first.height/2);await page.mouse.down();await page.waitForTimeout(400);assert.equal(await page.locator('.drag-ghost').count(),1);
  await page.mouse.move(second.x+second.width/2,second.y+second.height/2,{steps:8});await page.waitForTimeout(180);await page.mouse.up();
  const after=await page.locator('[data-hand-entry]').evaluateAll(ns=>ns.map(n=>n.dataset.handEntry));assert.deepEqual(after,[before[1],before[0],...before.slice(2)]);assert.equal(await page.locator('.drag-ghost').count(),0);assert.ok(!await page.locator('#card-dialog').isVisible());assert.equal(await page.evaluate(()=>localStorage.getItem('naotocchi-hotseat-v1')),saved);
  await page.reload();await page.locator('#restore').click();assert.equal(await page.locator('#hand').count(),0);await reveal(page);
  if(await page.locator('#hand.hand-collapsed').count())await page.locator('[data-hand-toggle]').click();assert.deepEqual(await page.locator('[data-hand-entry]').evaluateAll(ns=>ns.map(n=>n.dataset.handEntry)),after);
  await page.waitForTimeout(450);await page.locator('.hand-card').first().click();assert.ok(await page.locator('.full-effect').innerText());
  for(const size of [viewport,{width:viewport.height,height:viewport.width},viewport]){
   await page.setViewportSize(size);await page.waitForTimeout(100);
   assert.ok(await page.evaluate(()=>{const c=document.querySelector('.detail-card-canvas>.card-face').getBoundingClientRect(),d=document.querySelector('#card-dialog').getBoundingClientRect();return c.top>=d.top&&c.bottom<=d.bottom&&c.left>=d.left&&c.right<=d.right&&Math.abs(c.width/c.height-2/3)<.01;}));
  }
  const v=await projection(page),a=v.actions[0];const button=await actionButton(page,a);await button.click();if(await page.locator('#confirm-dialog').isVisible())await page.locator('[data-confirm]').click();
  assert.notEqual(await page.evaluate(()=>localStorage.getItem('naotocchi-hotseat-v1')),saved);await reveal(page);await closeDetail(page);
  const next=await projection(page);assert.equal(await page.locator('[data-depth=near]').getAttribute('data-player'),next.actor);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await page.locator('#hand').count(),0);assert.equal(await page.locator('#card-dialog .card-face').count(),0);assert.equal(await page.locator('.drag-ghost').count(),0);
  await page.reload();await page.locator('#restore').click();assert.equal(await page.locator('#hand').count(),0);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({viewports:6,all452:true,orientationSpecificCourts:true,pinnedEffect:true,pinnedOpponent:true,detailRotation:true,drag:true,privacy:true,restore:true}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
