// Exercise the production clock, saved identity and profile on a small screen.
// Run by the existing Home layout CI in Chromium and WebKit.
const assert=require('node:assert/strict');
const path=require('node:path');

module.exports=async function(browser,engine,fixtures,baseURL,output) {
  for (const [name,gender,orientationId,targets,afterGender,afterLabel] of [
    ['gay','male','gay',['male'],'female','ストレート'],
    ['straight','male','straight',['female'],'female','レズビアン'],
    ['nb','nonbinary','straight',['male','female'],'nonbinary','ストレート'],
  ]) {
    const label=engine+'-clownfish-'+name;
    const context=await browser.newContext({viewport:{width:320,height:568},reducedMotion:'reduce',isMobile:true,hasTouch:true});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const save=JSON.parse(JSON.stringify(fixtures.phone_dog));
    Object.assign(save,{speciesLine:'clownfish',ageTicks:1399,stageIndex:6,
      gender,orientationId,attractedTo:targets,clownfishFemaleReached:false,pendingClownfishTransition:null,
      partner:null,health:100,hunger:100,energy:100,happiness:100,poopCount:0,transformMeter:0});
    if (name==='gay') save.partner={...fixtures.equipped.partner,gender:'male',orientationId:'gay',attractedTo:['male'],mismatched:false};
    await page.addInitScript(s=>{
      // Seed only the new context; a reload must read the game's actual save.
      if (!localStorage.getItem('naotocchi-save-v1')) localStorage.setItem('naotocchi-save-v1',JSON.stringify(s));
      Math.random=()=>.4;
    },save);
    await page.clock.install({time:new Date('2026-09-13T12:00:00Z')});
    await page.clock.pauseAt(new Date('2026-09-13T12:01:00Z'));
    try {
      await page.goto(baseURL,{waitUntil:'networkidle'});
      await page.clock.runFor(3001);
      assert.equal(await page.locator('#storyFlash').isVisible(),true,label+': transition notice is hidden');
      assert.match(await page.locator('#storyFlashText').textContent(),/からだがメスになった。好きになる相手は、そのまま/);
      await page.screenshot({path:path.join(output,label+'-notice.png')});
      await page.locator('#profileBtn').click();
      assert.equal(await page.locator('#profileOrientation').textContent(),afterLabel);
      assert.equal(await page.locator('#profileGender').textContent(),(afterGender==='female'?'女の子':'ノンバイナリー')+'（からだ：メス）');
      const widths=await page.evaluate(()=>({page:document.documentElement.scrollWidth,view:innerWidth,
        profile:document.querySelector('.profile-scroll').clientWidth,content:document.querySelector('.profile-scroll').scrollWidth}));
      assert.ok(widths.page<=widths.view+1 && widths.content<=widths.profile+1,label+': profile overflows horizontally');
      await page.screenshot({path:path.join(output,label+'-profile.png')});
      const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('naotocchi-save-v1')));
      assert.equal(stored.gender,afterGender);
      // Saving normalizes target order; the identities must remain unchanged.
      assert.deepEqual([...stored.attractedTo].sort(),[...targets].sort(),label+': saved attraction targets changed');
      if (name==='gay') {
        assert.equal(stored.partner.id,save.partner.id);
        assert.equal(stored.partner.married,true);
        assert.equal(stored.partner.mismatched,true);
      }
      await page.reload({waitUntil:'networkidle'});
      await page.locator('#profileBtn').click();
      assert.equal(await page.locator('#profileOrientation').textContent(),afterLabel);
      assert.deepEqual(errors,[],label+': browser runtime errors');
      console.log('PASS '+label);
    } catch(error) {
      await page.screenshot({path:path.join(output,label+'-failure.png')}).catch(()=>{});
      throw error;
    } finally { await context.close(); }
  }
};
