// Public saves, production DOM inputs, and the real blackjack/Quick callbacks.
// Catches Quick care deductions and daily failure/duplicate/legacy re-grants.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const readSave=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('naotocchi-save-v1')));
const home=page=>page.locator('.device.ui-home-active').waitFor();
const openGames=async page=>{await page.locator('#menuBtn').click();await page.locator('#gamesBtn').click();};
const stock=s=>s.lifetime.itemInventory.c_coin2||0;
const careKeys=['stage','speciesLine','stageIndex','ageTicks','hunger','happiness','energy','health',
  'sodachi','maxSodachi','growth','decline','boostTicks','recentActionTicks','deathMeter','dying','dyingTicks',
  'transformMeter','transformOptions','transformsThisLife','transformStageDone','affectionStreak','travelStreak',
  'partner','companions','traitCounts','isSick','sicknessType','poopCount','lifeLog'];
const care=s=>Object.fromEntries(careKeys.map(k=>[k,s[k]]));
async function visibleWithin(page,locator,width){
  await locator.scrollIntoViewIfNeeded();
  const b=await locator.boundingBox();
  assert.ok(b&&b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=761,'control outside viewport');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
}
async function readableCards(page,width){
  for(const selector of ['.daily-card:not(.quick-card)','.quick-card']){
    const card=page.locator(selector);
    await card.scrollIntoViewIfNeeded();
    const metrics=await card.locator('.game-cell-text').evaluate(e=>({width:e.clientWidth,
      clipped:[...e.children].some(c=>c.scrollHeight>c.clientHeight+1||c.scrollWidth>c.clientWidth+1)}));
    assert.ok(metrics.width>=120,`${selector} squeezes copy into ${metrics.width}px at ${width}`);
    assert.equal(metrics.clipped,false,`${selector} clips reward/status copy at ${width}`);
  }
}
async function quit(page){
  await page.locator('#mgQuitBtn').click();await page.locator('#mgQuitYesBtn').click();await home(page);
}
async function blackjack(page,entry,bust){
  await entry.click();
  if(await page.locator('#mgIntroStart').isVisible())await page.locator('#mgIntroStart').click();
  await page.locator('#bjHit').waitFor();
  for(let hand=0;hand<4;hand++){
    // Math.random=.99 leaves the deck ordered. Standing yields 60 points;
    // repeatedly hitting yields 15. No score/payout handler is substituted.
    if(bust){
      for(let n=0;n<8&&await page.locator('#bjHit').isEnabled();n++)await page.locator('#bjHit').click();
    }else if(await page.locator('#bjStand').isEnabled())await page.locator('#bjStand').click();
    await page.clock.runFor(1800);
    assert.equal(await page.locator('#bjNext').isEnabled(),true,'hand must resolve via production card logic');
    await page.locator('#bjNext').click();
  }
  await page.clock.runFor(650);await home(page);
}
module.exports=async function(browser,engine,fixtures,baseURL,output){
  const results=[];
  for(const width of [320,390]){
    const context=await browser.newContext({viewport:{width,height:760},reducedMotion:'reduce',timezoneId:'UTC'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const label=`${engine}-item-economy-v2-${width}`;
    const seed=JSON.parse(JSON.stringify(fixtures.alone));
    Object.assign(seed,{stage:'growing',speciesLine:'dog',ageTicks:500,stageIndex:5,health:100,energy:100,hunger:85,happiness:90,
      isSick:false,isSleeping:false,deathMeter:19,dying:false,dyingTicks:0,transformMeter:0,transformOptions:null,
      partner:null,companions:[],infinite:false,growth:0,boostTicks:0});
    Object.assign(seed.lifetime,{money:437,equippedItemId:null,weatherMode:'sunny',timeMode:'day',seasonMode:'spring',
      dailyChallenge:null,dailyStreak:0,dailyLastDate:null,itemInventory:{},minigamePlayCounts:{},minigameRecords:{},quickVoice:'off',quickVoiceChosen:true});
    seed.items=seed.lifetime.itemInventory;
    await page.clock.install({time:new Date('2026-07-13T12:00:00Z')});
    await page.clock.pauseAt(new Date('2026-07-13T12:01:00Z'));
    seed.savedAt=Date.parse('2026-07-13T12:01:00Z');
    await page.addInitScript(s=>{
      Math.random=()=>0.99;
      if(!sessionStorage.getItem('economy-seeded')){
        localStorage.setItem('naotocchi-save-v1',JSON.stringify(s));sessionStorage.setItem('economy-seeded','1');
      }
    },seed);
    try{
      await page.goto(baseURL);await home(page);await page.reload();await home(page);
      const before=await readSave(page);
      await page.locator('#menuBtn').click();
      assert.match(await page.locator('#quickBtn').textContent(),/げんき消費なし/);
      await page.locator('#quickBtn').click();await page.clock.runFor(40);
      await page.locator('#qkCue').waitFor();
      await page.screenshot({path:path.join(output,label+'-quick.png')});
      await quit(page);
      assert.deepEqual(care(await readSave(page)),care(before),'real Quick entry/quit preserves care');
      assert.equal((await readSave(page)).lifetime.money,before.lifetime.money);
      await openGames(page);
      assert.equal(await page.locator('.daily-start').getAttribute('data-game-id'),'blackjack-21');
      assert.match(await page.locator('.daily-card:not(.quick-card)').textContent(),/1日1回。成功でラッキーコイン1個/);
      assert.doesNotMatch(await page.locator('.daily-card:not(.quick-card)').textContent(),/連続|2ばい|10コイン/);
      assert.match(await page.locator('.quick-card').textContent(),/げんき消費なし。20\/20完走で100コイン/);
      await readableCards(page,width);
      await visibleWithin(page,page.locator('.daily-start'),width);
      await visibleWithin(page,page.locator('.quick-start'),width);
      await page.screenshot({path:path.join(output,label+'-cards.png')});
      await page.locator('.quick-start').click();await page.clock.runFor(40);await quit(page);
      assert.deepEqual(care(await readSave(page)),care(before),'list Quick entry/quit preserves care');
      assert.equal((await readSave(page)).lifetime.money,before.lifetime.money);

      await openGames(page);await blackjack(page,page.locator('.daily-start'),true);
      let saved=await readSave(page);
      assert.equal(saved.lifetime.minigameRecords['blackjack-21'].last,15);
      assert.equal(saved.lifetime.dailyChallenge,null);assert.equal(stock(saved),0);assert.equal(saved.lifetime.money,437);
      await openGames(page);assert.equal(await page.locator('.daily-start').count(),1);
      const beforeSuccess=await readSave(page);
      await blackjack(page,page.locator('.daily-start'),false);saved=await readSave(page);
      assert.equal(saved.lifetime.minigameRecords['blackjack-21'].last,60);
      assert.equal(saved.lifetime.money,467,'only ordinary success 30, no daily coins');assert.equal(stock(saved),1);
      assert.deepEqual(saved.lifetime.dailyChallenge,{date:'2026-07-13',gameId:'blackjack-21',score:60,rank:'B'});
      assert.equal(saved.boostTicks,beforeSuccess.boostTicks);assert.equal(saved.lifetime.dailyStreak,0);assert.equal(saved.lifetime.dailyLastDate,null);
      assert.deepEqual(saved.lifetime.stickers,beforeSuccess.lifetime.stickers,'no daily sticker');
      await page.reload();await home(page);await openGames(page);
      assert.equal(await page.locator('.daily-start').count(),0);assert.equal(stock(await readSave(page)),1);
      await readableCards(page,width);
      await page.screenshot({path:path.join(output,label+'-claimed.png')});
      await blackjack(page,page.locator('.game-cell[data-game-id="blackjack-21"]'),false);
      saved=await readSave(page);assert.equal(stock(saved),1);assert.equal(saved.lifetime.money,497);

      // A historical same-date D-rank claim remains authoritative after boot.
      const old={date:'2026-07-13',gameId:'blackjack-21',score:10,rank:'D'};
      const legacy=JSON.parse(JSON.stringify(seed));legacy.lifetime.dailyChallenge=old;
      legacy.lifetime.dailyStreak=30;legacy.lifetime.dailyLastDate='2026-07-13';
      legacy.savedAt=await page.evaluate(()=>Date.now());
      await page.addInitScript(s=>{if(!sessionStorage.getItem('economy-legacy')){
        localStorage.setItem('naotocchi-save-v1',JSON.stringify(s));sessionStorage.setItem('economy-legacy','1');
      }},legacy);
      await page.reload();await home(page);await openGames(page);
      assert.equal(await page.locator('.daily-start').count(),0);
      await blackjack(page,page.locator('.game-cell[data-game-id="blackjack-21"]'),false);
      saved=await readSave(page);assert.deepEqual(saved.lifetime.dailyChallenge,old);assert.equal(stock(saved),0);
      assert.equal(saved.lifetime.money,467);assert.equal(saved.lifetime.dailyStreak,30);
      await page.reload();await home(page);assert.deepEqual((await readSave(page)).lifetime.dailyChallenge,old);
      assert.deepEqual(errors,[]);
      results.push({label,quickEntryQuitCare:true,copyLayout:true,realDailyFailure:true,realDailySuccess:true,reloadDuplicate:true,legacyClaim:true});
      console.log('PASS '+label);
    }catch(error){await page.screenshot({path:path.join(output,label+'-failure.png')}).catch(()=>{});throw error;}
    finally{await context.close();fs.writeFileSync(path.join(output,engine+'-item-economy-v2.json'),JSON.stringify(results,null,2));}
  }
};
