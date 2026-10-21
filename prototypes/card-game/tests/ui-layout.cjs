// Run only with an approved browser QA capability. Not executed in the managed Sites session.
const {chromium,webkit}=require('playwright');const assert=require('node:assert/strict');
const {closeDetail,projection,actionButton,reveal}=require('./ui-browser-helpers.cjs');
(async()=>{
 const browser=await(process.env.BROWSER==='webkit'?webkit:chromium).launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 const page=await browser.newPage({hasTouch:true,isMobile:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url=process.env.QA_URL||'http://127.0.0.1:8765/prototypes/card-game/';
 for(const viewport of [{width:844,height:390},{width:932,height:430},{width:667,height:375},{width:844,height:280},{width:390,height:664},{width:320,height:480},{width:320,height:900}]){
  await page.setViewportSize(viewport);await page.goto(url);assert.equal(await page.locator('#catalog-list .card-face').count(),452);
  await page.locator('#welcome [data-menu]').click();assert.ok(await page.locator('#import').isVisible());await page.locator('#menu-dialog [data-close]').click();
  await page.locator('#new').click();assert.equal(await page.locator('#hand').count(),0);await reveal(page);await closeDetail(page);
  assert.equal(await page.locator('.player-board .slot').count(),18);
  const check=await page.evaluate(()=>{
   const box=s=>document.querySelector(s).getBoundingClientRect(),far=box('.opponent-shell'),near=box('.own-shell'),panel=box('#operation-panel'),hand=box('#hand'),landscape=innerWidth>innerHeight;
   return{overflow:document.documentElement.scrollWidth>innerWidth,ordered:landscape?far.right<=near.left&&near.right<=panel.left:far.bottom<=near.top&&near.bottom<=panel.top,separate:Math.max(far.bottom,near.bottom,panel.bottom)<=hand.top+1,pinned:far.top>=0&&far.bottom<=innerHeight,slots:[...document.querySelectorAll('.own .slot')].every(n=>{const b=n.getBoundingClientRect();return b.height>=20&&(landscape?Math.abs(b.width/b.height-1.05)<.05:b.height>=44);}),eggs:[...document.querySelectorAll('.egg-main .egg-image')].every(n=>{const b=n.getBoundingClientRect(),p=n.parentElement.getBoundingClientRect();return b.top>=p.top&&b.bottom<=p.bottom+1&&getComputedStyle(n).objectFit==='contain';})};
  });assert.ok(!check.overflow&&check.ordered&&check.separate&&check.pinned&&check.slots&&check.eggs,JSON.stringify({viewport,check}));
  assert.equal(await page.locator('#operation-panel .operation-notice').count(),1);if(viewport.height>viewport.width){assert.ok((await page.locator('#operation-panel').boundingBox()).height<=60);assert.ok((await page.locator('.own-shell').boundingBox()).height>=72);}assert.equal(await page.locator('#operation-panel [data-choice-card]').count(),0);
  // QA10: compare actual boxes with/without/replayed/auto-hidden results at every viewport.
  const stableBoxes=()=>page.evaluate(()=>[...document.querySelectorAll('.opponent-shell,.own-shell,#operation-panel,#hand,.slot,.hand-card')].map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
  await page.evaluate(()=>Promise.all([...document.querySelectorAll('#hand .hand-card')].flatMap(n=>n.getAnimations()).map(a=>a.finished.catch(()=>{}))));
  if(!await page.locator('.result-notice').count())await page.locator('[data-result-reopen]').click();
  assert.equal(await page.locator('.result-notice').count(),1);
  {
   const originalSave=await page.evaluate(()=>localStorage.getItem('naotocchi-hotseat-v1')),shown=await stableBoxes();
   assert.ok(await page.evaluate(()=>{const r=document.querySelector('#result-feedback').getBoundingClientRect(),b=document.querySelector('.opponent-shell').getBoundingClientRect();return getComputedStyle(document.querySelector('#result-feedback')).position==='absolute'&&r.top>=b.top&&r.top<b.bottom&&r.left>=b.left&&r.right<=b.right+1;}));
   await page.locator('[data-result-collapse]').click();assert.equal(await page.locator('.result-notice').count(),0);assert.ok(await page.locator('#operation-panel').isVisible());
   assert.deepEqual(await stableBoxes(),shown,'manual collapse must not move or rescale the table');
   await page.locator('[data-result-reopen]').click();assert.deepEqual(await stableBoxes(),shown,'replay must not move or rescale the table');
   await page.waitForFunction(()=>!document.querySelector('.result-notice'),{},{timeout:5000});
   assert.deepEqual(await stableBoxes(),shown,'automatic collapse must leave no spacer');
   assert.equal(await page.evaluate(()=>localStorage.getItem('naotocchi-hotseat-v1')),originalSave);
  }
  if(viewport.height>viewport.width){
   assert.ok(await page.evaluate(()=>{const shell=document.querySelector('.own-shell'),board=document.querySelector('.player-board.own'),s=shell.getBoundingClientRect(),b=board.getBoundingClientRect();return Math.abs(b.width-(s.width-4))<2&&b.height>=s.height-5;}),'own board must fill its available portrait row');
  }
  // Presentation-only long/short result fixture: no game state is changed.
  const beforeNotice=await stableBoxes();
  const widths=await page.evaluate(()=>{
   const host=document.querySelector('#result-feedback'),cell=document.querySelector('.opponent-shell').getBoundingClientRect();
   const measure=text=>{host.innerHTML='<section class="result-notice"><strong>結果</strong><ul><li><span></span></li></ul><button class="result-collapse">×</button></section>';host.querySelector('li span').textContent=text;const r=host.getBoundingClientRect(),t=host.querySelector('li span').getBoundingClientRect();return {width:r.width,textHeight:t.height};};
   const short=measure('時 +1'),long=measure('カードを山札の下へ戻しました。'.repeat(12));host.replaceChildren();return {short,long,available:cell.width};
  });
  assert.ok(widths.long.width<=widths.available*.96&&widths.long.width>=widths.available*.90);
  assert.ok(widths.short.width<widths.long.width&&widths.long.textHeight>24);
  assert.deepEqual(await stableBoxes(),beforeNotice);
  if(viewport.height>viewport.width){
   assert.ok(await page.evaluate(()=>{const slot=document.querySelector('.own .slot'),saved=slot.innerHTML,face=document.querySelector('#hand .card-face');slot.innerHTML='<small>比率確認</small><div class="slot-content"><button class="card-tap"></button></div>';slot.querySelector('button').append(face.cloneNode(true));const b=slot.querySelector('.card-face').getBoundingClientRect(),c=slot.querySelector('.slot-content').getBoundingClientRect();slot.innerHTML=saved;return Math.abs(b.width/b.height-2/3)<.01&&b.width<=c.width+1&&b.height<=c.height+1;}),'expanded cells must contain an undistorted 2:3 card');
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
