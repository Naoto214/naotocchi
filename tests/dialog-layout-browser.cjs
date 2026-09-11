const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {measureDialogs,resultSpecimen}=require('./dialog-layout-probe.js');

module.exports=async function(browser,engine,fixtures,baseURL,output) {
  const results=[];
  for(const [name,width,height,fixture] of [
    ['puppy',390,760,'phone_dog'],['puppy-tall',393,852,'phone_dog'],
    ['small',320,568,'phone_dog'],['crowded',390,760,'equipped'],
    ['large-text',320,640,'care_large'],['desktop',768,844,'alone'],
  ]) {
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
    const page=await context.newPage();
    const save=JSON.parse(JSON.stringify(fixtures[fixture]));
    Object.assign(save,{health:100,energy:100,hunger:85,happiness:90,isSick:false,isSleeping:false,transformMeter:0});
    await page.addInitScript(s=>localStorage.setItem('naotocchi-save-v1',JSON.stringify(s)),save);
    const label=engine+'-dialogs-'+name;
    const check=async phase=>{
      const m=await page.evaluate(measureDialogs);results.push({label,phase,...m});
      assert.deepEqual(m.errors,[],label+' '+phase+': '+JSON.stringify(m));
      return m;
    };
    try {
      await page.goto(baseURL);await page.locator('.device.ui-home-active').waitFor();
      await page.evaluate(()=>document.fonts.ready);
      await page.locator('#petSprite .character-asset').evaluate(img=>img.decode());
      const castBefore=await page.locator('#petSprite').boundingBox();
      // Populate the existing dialogue, without calling private game functions.
      await page.locator('#speechText').evaluate(e=>e.textContent='いっしょにいろんなところへ出かけよう。'.repeat(12));
      await page.locator('#speechBubble').evaluate(e=>e.classList.remove('hidden'));
      await check('dialogue');
      const castAfter=await page.locator('#petSprite').boundingBox();
      assert.equal(castAfter.width,castBefore.width,label+': speech resized the character');
      await page.locator('#speechText').evaluate(e=>e.scrollTop=e.scrollHeight);
      assert.ok(await page.locator('#speechText').evaluate(e=>e.scrollTop>0),label+': long speech cannot scroll');
      await page.screenshot({path:path.join(output,label+'-speech.png')});
      await page.locator('#speechBubble').evaluate(e=>e.classList.add('hidden'));
      // The specimen exercises the shipped result CSS with the reported text.
      // Game scoring itself remains covered by scoring-shop-test.cjs.
      await page.locator('#mgResultToast').evaluate((e,html)=>{e.innerHTML=html;e.classList.remove('hidden');e.style.animation='none';},resultSpecimen);
      await check('result-first');
      await page.locator('.mg-result-sub').evaluate(e=>e.textContent='自己ベスト更新!99 → 100');
      await check('result-best');
      await page.screenshot({path:path.join(output,label+'-result.png')});
      await page.locator('#mgResultToast').evaluate(e=>e.classList.add('hidden'));
      await page.locator('#menuBtn').click();await page.locator('#gamesBtn').click();
      await page.locator('[data-game-id="takoyaki-grill"]').click();
      await page.locator('#mgIntroStart').waitFor();
      await check('intro');
      const before=await page.locator('#minigameOverlay').boundingBox();
      await page.locator('#mgQuitBtn').click();
      await check('intro-confirm');
      assert.deepEqual(await page.locator('#minigameOverlay').boundingBox(),before,label+': confirmation moves the game');
      await page.screenshot({path:path.join(output,label+'-quit.png')});
      await page.locator('#mgQuitNoBtn').click();await page.locator('#mgIntroStart').click();
      await check('playing');
      const activeBefore=await page.locator('#minigameOverlay').boundingBox();
      await page.locator('#mgQuitBtn').click();await check('playing-confirm');
      assert.deepEqual(await page.locator('#minigameOverlay').boundingBox(),activeBefore,label+': confirmation shifts the active game');
      await page.locator('#mgQuitNoBtn').click();
      await page.locator('#mgHelpBtn').click();
      await page.locator('#mgHelpCloseBtn').click();
      await page.locator('#mgQuitBtn').click();await page.locator('#mgQuitYesBtn').click();
      await page.locator('#screenNormal').waitFor({state:'visible'});
      console.log('PASS '+label);
    } catch(error) {
      await page.screenshot({path:path.join(output,label+'-failure.png')}).catch(()=>{});
      throw error;
    } finally {
      await context.close();
      fs.writeFileSync(path.join(output,engine+'-dialogs.json'),JSON.stringify(results,null,2));
    }
  }
};
