const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const readSave = page => page.evaluate(() => JSON.parse(localStorage.getItem('naotocchi-save-v1')));

// CI browser verification: real app, synthetic legacy save, UI only; no game-closure hooks.
module.exports = async (browser, engine, fixtures, baseURL, output) => {
  const results = [];
  for (const width of [320, 390]) {
    const context = await browser.newContext({viewport:{width,height:760},reducedMotion:'reduce'});
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const label = `${engine}-naoto-crown-${width}`;
    const seed = JSON.parse(JSON.stringify(fixtures.alone));
    Object.assign(seed,{health:100,energy:100,hunger:90,happiness:90,isSick:false,isSleeping:false,dying:false,deathMeter:0,infinite:false,transformMeter:0,transformOptions:null});
    seed.achievementsUnlocked = seed.achievementsUnlocked.filter(id => !/^(games-|record-rank-|sticker-|env-moments-)/.test(id));
    Object.assign(seed.lifetime,{dexCleared:true,perfectCleared:false,ownedNaotoItems:['naoto_crown'],money:1000,equippedItemId:null,
      timeMode:'day',weatherMode:'sunny',seasonMode:'summer',minigameRecords:{},minigamePlayCounts:{}});
    await page.clock.install({time:new Date('2026-09-17T12:00:00Z')});
    await page.clock.pauseAt(new Date('2026-09-17T12:01:00Z'));
    seed.savedAt = Date.parse('2026-09-17T12:01:00Z');
    await page.addInitScript(save => {
      if (!sessionStorage.getItem('crown-seeded')) {
        localStorage.setItem('naotocchi-save-v1',JSON.stringify(save));
        sessionStorage.setItem('crown-seeded','1');
      }
    }, seed);
    try {
      await page.goto(baseURL); await page.locator('.device.ui-home-active').waitFor();
      await page.locator('#menuBtn').click(); await page.locator('#itemBtn').click();
      const crown = page.locator('#naotoItemGrid [data-id="naoto_crown"]');
      await crown.scrollIntoViewIfNeeded();
      assert.match(await crown.textContent(),/まだ達成していない実績につながる遊びが、少し出やすくなる/);
      assert.equal(await crown.isDisabled(),true); // Permanent, no equipment toggle.
      assert.equal(await crown.evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
      await page.screenshot({path:path.join(output,label+'-description.png')});
      await page.locator('#itemCloseBtn').click();
      await page.locator('#menuBtn').click(); await page.locator('#stickerBtn').click();
      const before = await readSave(page);
      await page.locator('#stickerPackBtn').click();
      const bought = await readSave(page);
      assert.equal(bought.lifetime.money,before.lifetime.money-30);
      assert.equal(bought.lifetime.stickers.packsOpened,before.lifetime.stickers.packsOpened+1);
      assert.equal(await page.locator('#stickerPackResult').isVisible(),true);
      await page.screenshot({path:path.join(output,label+'-stickers.png')});
      await page.reload(); await page.locator('.device.ui-home-active').waitFor();
      const restored = await readSave(page);
      assert.ok(restored.lifetime.ownedNaotoItems.includes('naoto_crown'));
      assert.equal(restored.lifetime.money,bought.lifetime.money);
      assert.deepEqual(restored.lifetime.stickers.owned,bought.lifetime.stickers.owned);
      assert.equal(restored.lifetime.timeMode,'day'); assert.equal(restored.lifetime.weatherMode,'sunny');
      await page.locator('#playBtn').click();
      await page.locator('#minigameOverlay').waitFor({state:'visible'});
      if (await page.locator('#mgIntroStart').isVisible()) await page.locator('#mgIntroStart').click();
      await page.locator('#mgQuitBtn').click(); await page.locator('#mgQuitYesBtn').click();
      const played = await readSave(page);
      assert.equal(Object.values(played.lifetime.minigamePlayCounts).reduce((a,b)=>a+b,0),1);
      assert.deepEqual(errors,[]);
      results.push({engine,width,description:true,pack:true,reload:true,playCount:1,errors});
      console.log('PASS '+label);
    } catch(error) {
      await page.screenshot({path:path.join(output,label+'-failure.png')}).catch(()=>{});
      throw error;
    } finally { await context.close(); }
  }
  fs.writeFileSync(path.join(output,engine+'-naoto-crown.json'),JSON.stringify(results,null,2));
};
