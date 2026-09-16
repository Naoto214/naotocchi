// Production UI and public saves only; shared by local Chromium and Home layout CI.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const products=[
  ['c_coin2','ラッキーコイン',300,'ルーレットでコインがもらえる。'],
  ['c_life','いのちのくすり',300,'いのちを満タンにする。'],
  ['c_time_back','ときのチケット・まえ',300,'ひとつ前の姿に5分だけ変わる。'],
  ['c_time_forward','ときのチケット・あと',300,'ひとつ後の姿に5分だけ変わる。'],
  ['c_life_charm','いのちのおまもり',1000,'死んでしまうとき、1回だけ助かる。'],
  ['c_friend','おともだちチケット',3000,'好きな未加入のなかまを呼べる。'],
  ['c_match','おみあいチケット',3000,'恋愛できる相手を1人選んで呼べる。'],
  ['c_transform','へんしんチケット',6000,'3つの候補から、好きな姿にへんしんできる。'],
  ['c_rare_friend','レアなかまチケット',8000,'好きな未加入のレアなかまを呼べる。'],
  ['c_egg_normal','ふしぎなたまご',8000,'次の人生が、まだ育てていない通常種族になる。'],
  ['c_egg_rare','レアなたまご',10000,'次の人生が、まだ育てていないレア種族になる。'],
  ['c_dex','ずかんチケット',10000,'好きな姿を選んで、5分だけへんしんできる。'],
];
const readSave=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('naotocchi-save-v1')));
const home=page=>page.locator('.device.ui-home-active').waitFor();
const openShop=async page=>{await page.locator('#menuBtn').click();await page.locator('#itemBtn').click();};
const button=(page,id,action='use')=>page.locator(`#onetimeItemGrid [data-item-action="${action}"][data-id="${id}"]`);
const stock=(save,id)=>save.lifetime.itemInventory[id]||0;
async function onScreen(locator,width,label){
  await locator.scrollIntoViewIfNeeded();
  const r=await locator.boundingBox();
  assert.ok(r&&r.x>=0&&r.x+r.width<=width+1&&r.y>=0&&r.y+r.height<=760+1,label+' outside viewport');
  assert.equal(await locator.evaluate(e=>e.scrollWidth>e.clientWidth+1),false,label+' horizontal overflow');
}
// Seed only once per scenario, after beforeunload and before the next boot.
async function seedNext(page,save,key){
  await page.addInitScript(({save,key})=>{
    Math.random=()=>0.4;
    if(!sessionStorage.getItem(key)){
      localStorage.setItem('naotocchi-save-v1',JSON.stringify(save));
      sessionStorage.setItem(key,'1');
    }
  },{save,key});
}
module.exports=async function(browser,engine,fixtures,baseURL,output){
  const results=[];
  for(const width of [320,390]){
    const context=await browser.newContext({viewport:{width,height:760},reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const label=`${engine}-consumables-v2-${width}`;
    const seed=JSON.parse(JSON.stringify(fixtures.alone));
    Object.assign(seed,{stage:'growing',speciesLine:'dog',ageTicks:500,stageIndex:5,health:100,energy:100,hunger:85,happiness:90,
      isSick:false,isSleeping:false,deathMeter:60,dying:false,dyingTicks:0,transformMeter:0,transformOptions:null,partner:null,companions:[],infinite:false});
    Object.assign(seed.lifetime,{money:200000,itemInventory:Object.fromEntries(products.map(([id])=>[id,2])),raisedSpecies:['dog'],nextEggLine:null,nextEggKind:null});
    seed.items=seed.lifetime.itemInventory;
    seed.lifetime.itemMigrations={...seed.lifetime.itemMigrations,consumablesV2:true,dreamEggsV2:true};
    await page.clock.install({time:new Date('2026-09-16T12:00:00Z')});
    await page.clock.pauseAt(new Date('2026-09-16T12:01:00Z'));
    seed.savedAt=Date.parse('2026-09-16T12:01:00Z');
    await seedNext(page,seed,'consumables-seeded');
    try{
      await page.goto(baseURL);await home(page);await openShop(page);
      assert.deepEqual(await page.locator('#onetimeItemGrid [data-item-action="buy"]').evaluateAll(es=>es.map(e=>e.dataset.id)),products.map(([id])=>id));
      assert.equal(await page.locator('#onetimeItemGrid .shop-item').count(),12);
      await page.evaluate(()=>document.fonts.ready);
      for(const [id,name,price,desc] of products){
        const buy=button(page,id,'buy'),cell=buy.locator('..');
        assert.equal(await cell.locator('.shop-item-label').textContent(),name);
        assert.equal(await cell.locator('.shop-item-desc').textContent(),desc);
        assert.equal(await buy.textContent(),`かう（${price}コイン）`);
        await onScreen(cell,width,id);
        assert.equal(await buy.isDisabled(),false);
      }
      const charm=button(page,'c_life_charm','buy').locator('..');
      assert.match(await charm.locator('.shop-item-status').textContent(),/自動で使う/);
      assert.equal(await button(page,'c_life_charm').count(),0);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.screenshot({path:path.join(output,label+'-shop.png')});

      // Repeated purchase and one successful use; full-life rejection keeps stock.
      await button(page,'c_life','buy').click();await button(page,'c_life','buy').click();
      let saved=await readSave(page);
      assert.equal(saved.lifetime.money,199400);assert.equal(stock(saved,'c_life'),4);
      await button(page,'c_life').click();saved=await readSave(page);
      assert.equal(saved.deathMeter,0);assert.equal(saved.health,100);assert.equal(stock(saved,'c_life'),3);
      assert.equal(await button(page,'c_life').isDisabled(),true);

      // Every selection family can be cancelled without spending, including a
      // long dex grid whose final entry and cancel control must remain reachable.
      for(const id of ['c_transform','c_friend','c_rare_friend','c_match','c_dex']){
        const before=stock(await readSave(page),id);
        await button(page,id).click();await page.locator('#pickerOverlay').waitFor({state:'visible'});
        const options=page.locator('#pickerGrid [data-picker-value]');
        assert.ok(await options.count()>0,id+' choices');
        if(id==='c_transform'){
          assert.equal(await options.count(),3);
          assert.equal(await page.locator('#pickerHint').textContent(),'へんしんする姿を1つ選んでね。決めるまで使わない');
        }
        if(id==='c_dex'){
          const values=await options.evaluateAll(es=>es.map(e=>e.dataset.pickerValue));
          assert.equal(values.some(v=>/^ren:|^legend/.test(v)),false);
          assert.ok(values.some(v=>!seed.discoveredStages.includes(v)),'unseen forms selectable');
          await onScreen(options.last(),width,id+' last choice');
          await page.screenshot({path:path.join(output,label+'-picker.png')});
        }
        await onScreen(page.locator('#pickerCloseBtn'),width,id+' cancel');
        await page.locator('#pickerCloseBtn').click();
        assert.equal(stock(await readSave(page),id),before);
      }

      // A selected friend starts the shipped invitation, never instant joining.
      await button(page,'c_friend').click();
      await page.locator('#pickerGrid [data-picker-value]').first().click();
      await page.locator('#companionInviteOverlay').waitFor({state:'visible'});
      saved=await readSave(page);assert.equal(stock(saved,'c_friend'),1);assert.deepEqual(saved.companions,[]);
      assert.ok((await page.locator('#companionInviteTitle').textContent()).length>0);
      await onScreen(page.locator('#companionInviteLaterBtn'),width,'encounter later');
      await page.screenshot({path:path.join(output,label+'-encounter.png')});
      await page.locator('#companionInviteLaterBtn').click();
      // Invitation may close the underlying item panel; reopen through home.
      if(!await page.locator('#itemOverlay').isVisible())await openShop(page);

      await button(page,'c_egg_normal').click();saved=await readSave(page);
      const reserved=saved.lifetime.nextEggLine;
      assert.ok(reserved&&reserved!=='dog');assert.equal(saved.lifetime.nextEggKind,'normal');assert.equal(stock(saved,'c_egg_normal'),2);
      assert.equal(await button(page,'c_egg_rare').isDisabled(),true);
      assert.match(await page.locator('#dreamStatus').textContent(),/予約：/);
      await page.reload();await home(page);await openShop(page);
      assert.equal((await readSave(page)).lifetime.nextEggLine,reserved);
      await page.locator('#dreamCancelBtn').click();saved=await readSave(page);
      assert.equal(saved.lifetime.nextEggLine,null);assert.equal(stock(saved,'c_egg_normal'),2);
      await button(page,'c_egg_rare').click();saved=await readSave(page);
      assert.equal(saved.lifetime.nextEggKind,'rare');assert.equal(stock(saved,'c_egg_rare'),2);
      await page.locator('#dreamCancelBtn').click();

      // Temporary appearance survives reload with its original deadline. Fast
      // forwarding dispatches the real timer without simulating 100 age ticks.
      const beforeForm=await readSave(page);
      await button(page,'c_time_back').click();saved=await readSave(page);
      const form=saved.itemLife.temporaryForm;
      assert.ok(form);assert.equal(form.expiresAt-await page.evaluate(()=>Date.now()),300000);
      assert.equal(saved.speciesLine,beforeForm.speciesLine);assert.equal(saved.ageTicks,beforeForm.ageTicks);
      assert.equal(stock(saved,'c_time_back'),1);
      await page.clock.fastForward(120000);await page.reload();await home(page);await openShop(page);
      assert.equal((await readSave(page)).itemLife.temporaryForm.expiresAt,form.expiresAt);
      await page.clock.fastForward(180000);await page.reload();await home(page);await openShop(page);
      // A purchase persists the normalized expiry rather than reading an old save.
      await button(page,'c_coin2','buy').click();saved=await readSave(page);
      assert.equal(saved.itemLife.temporaryForm,undefined);assert.equal(stock(saved,'c_time_back'),1);

      // Legacy refunds and conversions persist exactly once through actual boot.
      const legacy=JSON.parse(JSON.stringify(seed));
      legacy.savedAt=await page.evaluate(()=>Date.now());legacy.lifetime.money=100;
      legacy.items=legacy.lifetime.itemInventory={c_safety:2,c_growth:1,new_transform_mirror:1,new_life_patch:3};
      legacy.lifetime.dreamEggs={normal:2,rare:1};
      delete legacy.lifetime.itemMigrations.consumablesV2;delete legacy.lifetime.itemMigrations.dreamEggsV2;
      legacy.oneTimeBoosts={safetyNet:true};legacy.boostTicks=50;
      await seedNext(page,legacy,'legacy-consumables-seeded');
      await page.reload();await home(page);await openShop(page);
      assert.match(await page.locator('#itemMoneyLabel').getAttribute('aria-label'),/330/);
      await button(page,'c_life').click();saved=await readSave(page);
      assert.equal(saved.lifetime.money,330);assert.equal(stock(saved,'c_life'),2);
      assert.equal(stock(saved,'c_egg_normal'),2);assert.equal(stock(saved,'c_egg_rare'),1);
      assert.equal(saved.boostTicks,0);assert.deepEqual(saved.lifetime.dreamEggs,{});
      assert.equal(saved.lifetime.itemMigrations.consumablesV2,true);assert.equal(saved.lifetime.itemMigrations.dreamEggsV2,true);
      for(const id of ['c_safety','c_growth','new_transform_mirror','new_life_patch'])assert.equal(saved.lifetime.itemInventory[id],undefined);
      await page.reload();await home(page);await openShop(page);
      assert.equal((await readSave(page)).lifetime.money,330);assert.equal(stock(await readSave(page),'c_life'),2);
      assert.deepEqual(errors,[]);
      results.push({label,products:12,copyPrices:true,scrolling:true,pickerCancel:true,purchaseConsume:true,automaticCharm:true,encounter:true,eggReservationReloadCancel:true,temporaryReloadExpiry:true,migrationRefundOnce:true});
      console.log('PASS '+label);
    }catch(error){
      await page.screenshot({path:path.join(output,label+'-failure.png')}).catch(()=>{});throw error;
    }finally{
      await context.close();fs.writeFileSync(path.join(output,engine+'-consumables-v2.json'),JSON.stringify(results,null,2));
    }
  }
};
