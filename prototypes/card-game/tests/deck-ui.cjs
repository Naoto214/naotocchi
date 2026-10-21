// Browser regression runner. Run against a served checkout when browser infrastructure is available.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(process.env.CARD_GAME_URL??'http://127.0.0.1:8765/prototypes/card-game/');
 assert.equal(await page.locator('.catalog-card').count(),0);
 await page.locator('#deck-editor>summary').click();assert.equal(await page.locator('.catalog-card').count(),452);
 await page.locator('#deck-create').click();await page.locator('#deck-name').fill('iPhoneで作ったデッキ');await page.locator('#deck-name').blur();
 const id=await page.evaluate(()=>JSON.parse(localStorage.getItem('naotocchi-my-decks-v1')).decks.at(-1).id);
 await page.locator('#select-deck-A').selectOption(id);assert.equal(await page.locator('#new').isDisabled(),true);
 const cards=await page.evaluate(async()=>{const {CARDS}=await import('./engine.mjs');return Object.values(CARDS).map(c=>({id:c.id,rare:c.rare,type:c.type,species:c.species,attribute:c.attribute}));});
 for(const c of [cards.find(c=>!c.rare),cards.find(c=>c.rare)]){await page.locator('#card-search').fill(c.id);const add=page.locator(`[data-add="${c.id}"]`);for(let i=0;i<(c.rare?1:3);i++)await add.click();assert.equal(await add.isDisabled(),true);await page.locator(`[data-remove="${c.id}"]`).click();assert.equal(await add.isDisabled(),false);}
 await page.locator('.catalog-preview').first().click();assert.equal(await page.locator('#card-dialog').isVisible(),true);await page.locator('#card-dialog [data-close]').click();
 await page.locator('#filter-reset').click();const main=cards.find(c=>c.type==='main');await page.locator('#card-species').selectOption(main.species);assert.equal(await page.locator('.catalog-card').count(),8);await page.locator('#card-stage').selectOption('4');assert.equal(await page.locator('.catalog-card').count(),1);
 await page.locator('#deck-duplicate').click();assert.equal(await page.locator('.my-deck-item').count(),4);await page.locator('#deck-delete').click();assert.equal(await page.locator('.my-deck-item').count(),3);
 await page.locator('.my-deck-open').filter({hasText:'iPhoneで作ったデッキ'}).click();await page.locator('.deck-tools>summary').click();await page.locator('#deck-default').click();assert.equal(await page.locator('#new').isDisabled(),false);
 await page.reload();assert.equal(await page.locator('#select-deck-A').inputValue(),id);await page.locator('#deck-editor>summary').click();
 for(const viewport of [{width:390,height:844},{width:844,height:390},{width:320,height:568}]){await page.setViewportSize(viewport);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const box=await page.locator('#deck-count').boundingBox();assert.ok(box.y>=0&&box.y+box.height<=viewport.height+1);}
 await page.locator('#match-mode').selectOption('hotseat');await page.locator('#new').click();assert.equal(await page.locator('#hand').count(),0);await page.locator('#reveal').click();assert.equal(await page.locator('#hand').count(),1);await page.locator('#hide').click();assert.equal(await page.locator('#hand').count(),0);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({catalog:452,crud:true,persistence:true,copyLimits:true,filters:true,portraitLandscape:true,handoffPrivacy:true,pageErrors:errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
