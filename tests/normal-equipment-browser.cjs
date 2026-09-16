const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ids=['poop1','sleepboost1','bowtie','ribbon','scarf','travel1','partner1','bond1','gamepass1','star'];
const retired=['flower','energy1','hat','crown','glasses'];
const pictures={bowtie:'bento-box.png',ribbon:'toy-box.png',scarf:'first-aid-box.png',gamepass1:'game-pass.png'};
const readSave=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('naotocchi-save-v1')));
const openShop=async page=>{await page.locator('#menuBtn').click();await page.locator('#itemBtn').click();};
const home=page=>page.locator('.device.ui-home-active').waitFor();

// Exercise production UI and public persisted fields only. Seed once so reload
// assertions cannot accidentally restore the original fixture over the save.
module.exports=async function(browser,engine,fixtures,baseURL,output){
  const results=[];
  for(const width of [320,390]){
    const context=await browser.newContext({viewport:{width,height:760},reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const label=`${engine}-normal-equipment-${width}`;
    const seed=JSON.parse(JSON.stringify(fixtures.alone));
    Object.assign(seed,{health:100,energy:100,hunger:85,happiness:90,isSick:false,isSleeping:false,transformMeter:0,transformOptions:null,gamePassReadyAt:0});
    Object.assign(seed.lifetime,{ownedShopItems:ids,equippedItemId:null,money:20000});
    await page.clock.install({time:new Date('2026-09-12T12:00:00Z')});
    await page.clock.pauseAt(new Date('2026-09-12T12:01:00Z'));
    await page.addInitScript(s=>{
      if(!sessionStorage.getItem('equipment-seeded')){
        localStorage.setItem('naotocchi-save-v1',JSON.stringify(s));
        sessionStorage.setItem('equipment-seeded','1');
      }
    },seed);
    try{
      await page.goto(baseURL);await home(page);await openShop(page);
      assert.deepEqual(await page.locator('#shopItemGrid .shop-item').evaluateAll(es=>es.map(e=>e.dataset.id)),ids);
      for(const id of retired)assert.equal(await page.locator(`#shopItemGrid [data-id="${id}"]`).count(),0);
      await page.evaluate(()=>document.fonts.ready);
      for(const id of ids){
        const cell=page.locator(`#shopItemGrid [data-id="${id}"]`);
        await cell.scrollIntoViewIfNeeded();
        const box=await cell.boundingBox();
        assert.ok(box && box.x>=0 && box.x+box.width<=width+1 && box.y>=0 && box.y+box.height<=760+1,`${label} offscreen ${id}`);
        assert.equal(await cell.evaluate(e=>e.scrollWidth>e.clientWidth+1),false,`${id} text overflows`);
        if(pictures[id]){
          const img=cell.locator('.item-picture img.item-asset');
          assert.equal(await img.getAttribute('src'),`assets/items/normal-equipment/${pictures[id]}`);
          await img.evaluate(e=>e.decode());
          assert.ok(await img.evaluate(e=>e.naturalWidth>0 && e.naturalHeight>0));
        }
      }
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.screenshot({path:path.join(output,label+'-shop.png')});
      for(const id of ['gamepass1','star','gamepass1']){
        await page.locator(`#shopItemGrid [data-id="${id}"]`).click();
        assert.equal((await readSave(page)).lifetime.equippedItemId,id);
        assert.deepEqual(await page.locator('#shopItemGrid .equipped').evaluateAll(es=>es.map(e=>e.dataset.id)),[id]);
      }
      await page.reload();await home(page);await openShop(page);
      assert.deepEqual(await page.locator('#shopItemGrid .equipped').evaluateAll(es=>es.map(e=>e.dataset.id)),['gamepass1']);
      await page.locator('#itemCloseBtn').click();
      const play=page.locator('#playBtn'),labelBefore=await play.textContent();
      const before=await readSave(page);
      await play.click();
      assert.equal(await play.isDisabled(),true);
      assert.equal(await play.textContent(),labelBefore,'cooldown adds no countdown UI');
      assert.equal(await page.locator('#minigameOverlay').isVisible(),false);
      assert.equal((await readSave(page)).lifetime.money,before.lifetime.money+30);
      await page.clock.runFor(4999);assert.equal(await play.isDisabled(),true);
      await page.clock.runFor(1);assert.equal(await play.isDisabled(),false);
      await play.click();await page.clock.runFor(2000);
      const deadline=(await readSave(page)).gamePassReadyAt;
      await page.reload();await home(page);
      assert.equal((await readSave(page)).gamePassReadyAt,deadline);
      assert.equal(await play.isDisabled(),true);
      await page.clock.runFor(2999);assert.equal(await play.isDisabled(),true);
      await page.clock.runFor(1);assert.equal(await play.isDisabled(),false);

      // Lucky purchases cost 300; use immediately consumes stock and pays one
      // of the shipped roulette outcomes, with no pending/reservation UI.
      await openShop(page);
      const buy=page.locator('[data-item-action="buy"][data-id="c_coin2"]');
      const use=page.locator('[data-item-action="use"][data-id="c_coin2"]');
      const luckyBefore=await readSave(page),stock=luckyBefore.items.c_coin2||0;
      assert.match(await buy.textContent(),/300/);
      await buy.click();
      const purchased=await readSave(page);
      assert.equal(purchased.lifetime.money,luckyBefore.lifetime.money-300);
      assert.equal(purchased.items.c_coin2,stock+1);
      assert.equal(await use.textContent(),'つかう');
      await use.click();
      const used=await readSave(page),payout=used.lifetime.money-purchased.lifetime.money;
      assert.ok([10,20,50,100,500,1000,10000].includes(payout));
      assert.equal(used.items.c_coin2,stock);
      assert.match(await page.locator('#message').textContent(),new RegExp(`${payout}コイン`));
      assert.equal(await page.locator('[data-item-action="cancel"][data-id="c_coin2"]').count(),0);
      assert.doesNotMatch(await page.locator('#onetimeActive').textContent(),/ラッキー/);

      // Legacy save injection is a public save fixture, not a closure hook.
      const legacy=await readSave(page);
      Object.assign(legacy.lifetime,{money:100,ownedShopItems:[...retired,'bowtie'],equippedItemId:'crown'});
      delete legacy.lifetime.itemMigrations.normalEquipmentV2;
      legacy.items.c_coin2=4;legacy.lifetime.itemInventory.c_coin2=4;
      legacy.oneTimeBoosts.doubleCoins=true;
      await page.evaluate(s=>localStorage.setItem('naotocchi-save-v1',JSON.stringify(s)),legacy);
      await page.reload();await home(page);await openShop(page);
      assert.match(await page.locator('#itemMoneyLabel').getAttribute('aria-label'),/2380/);
      assert.equal(await page.locator('#shopItemGrid .equipped').count(),0);
      assert.equal(await use.textContent(),'つかう');
      assert.match(await use.locator('..').locator('.shop-item-status').textContent(),/^5こ/);
      assert.equal(await page.locator('[data-item-action="cancel"][data-id="c_coin2"]').count(),0);
      // A normal equipment click commits the migrated save without spending.
      await page.locator('#shopItemGrid [data-id="bowtie"]').click();
      const migrated=await readSave(page);
      assert.equal(migrated.lifetime.money,2380);
      assert.equal(migrated.lifetime.itemMigrations.normalEquipmentV2,true);
      assert.deepEqual(migrated.lifetime.ownedShopItems,['bowtie']);
      assert.equal(migrated.items.c_coin2,5);
      assert.equal('doubleCoins' in migrated.oneTimeBoosts,false);
      await page.reload();await home(page);await openShop(page);
      assert.equal((await readSave(page)).lifetime.money,2380);
      assert.match(await use.locator('..').locator('.shop-item-status').textContent(),/^5こ/);
      await use.click();
      const rescuedUsed=await readSave(page);
      assert.equal(rescuedUsed.items.c_coin2,4);
      await page.reload();await home(page);await openShop(page);
      assert.match(await use.locator('..').locator('.shop-item-status').textContent(),/^4こ/);
      assert.equal((await readSave(page)).lifetime.money,rescuedUsed.lifetime.money);
      assert.doesNotMatch(await page.locator('#onetimeActive').textContent(),/ラッキー/);
      assert.deepEqual(errors,[]);
      results.push({label,shopItems:10,approvedPNGs:4,cooldownBoundary:true,reloadRemaining:true,refundOnce:true,luckyImmediate:true});
      console.log('PASS '+label);
    }catch(error){
      await page.screenshot({path:path.join(output,label+'-failure.png')}).catch(()=>{});
      throw error;
    }finally{
      await context.close();
      fs.writeFileSync(path.join(output,engine+'-normal-equipment.json'),JSON.stringify(results,null,2));
    }
  }
};
