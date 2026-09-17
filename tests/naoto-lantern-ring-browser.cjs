const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const readSave=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('naotocchi-save-v1')));
// Public save + real UI only. Probability boundaries are covered by unit tests.
module.exports=async(browser,engine,fixtures,baseURL,output)=>{
 const results=[];
 for(const width of [320,390]){
  const context=await browser.newContext({viewport:{width,height:760},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],label=`${engine}-lantern-ring-${width}`;
  page.on('pageerror',e=>errors.push(e.message));
  const seed=JSON.parse(JSON.stringify(fixtures.alone));
  Object.assign(seed,{stage:'growing',sodachi:20,growth:0,boostTicks:0,health:100,energy:100,hunger:40,happiness:90,isSick:false,isSleeping:false,dying:false,deathMeter:0,infinite:false,transformMeter:0,transformOptions:null});
  Object.assign(seed.lifetime,{ownedNaotoItems:['naoto_lantern','naoto_ring'],equippedItemId:null});
  await page.clock.install({time:new Date('2026-09-17T12:00:00Z')});
  await page.clock.pauseAt(new Date('2026-09-17T12:01:00Z'));
  seed.savedAt=Date.parse('2026-09-17T12:01:00Z');
  await page.addInitScript(s=>{if(!sessionStorage.getItem('lantern-ring-seeded')){localStorage.setItem('naotocchi-save-v1',JSON.stringify(s));sessionStorage.setItem('lantern-ring-seeded','1');}},seed);
  try{
   await page.goto(baseURL);await page.locator('.device.ui-home-active').waitFor();
   const before=await readSave(page);
   await page.locator('#feedBtn').click();
   const fed=await readSave(page);
   assert.ok(Math.abs(fed.growth-before.growth-4.4)<1e-9);
   assert.equal(fed.sodachi,before.sodachi);
   assert.equal(fed.actionCounts.feed,before.actionCounts.feed+1);
   await page.locator('#menuBtn').click();await page.locator('#itemBtn').click();
   for(const [id,text] of [['naoto_lantern','そだちの増え方が、少し大きくなる。'],['naoto_ring','まだ出会っていない候補が、少し出やすくなる。']]){
    const item=page.locator(`#naotoItemGrid [data-id="${id}"]`);
    await item.scrollIntoViewIfNeeded();assert.ok((await item.textContent()).includes(text));
    assert.equal(await item.isDisabled(),true);
    assert.equal(await item.evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
   }
   await page.screenshot({path:path.join(output,label+'-description.png')});
   await page.reload();await page.locator('.device.ui-home-active').waitFor();
   const restored=await readSave(page);
   for(const id of ['naoto_lantern','naoto_ring'])assert.ok(restored.lifetime.ownedNaotoItems.includes(id));
   assert.equal(restored.growth,fed.growth);assert.equal(restored.lifetime.equippedItemId,null);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1));
   assert.deepEqual(errors,[]);results.push({width,growth:4.4,feedCount:1,reload:true,description:true,errors});
   console.log('PASS '+label);
  }catch(error){await page.screenshot({path:path.join(output,label+'-failure.png')}).catch(()=>{});throw error;}
  finally{await context.close();}
 }
 fs.writeFileSync(path.join(output,engine+'-lantern-ring.json'),JSON.stringify(results,null,2));
};
