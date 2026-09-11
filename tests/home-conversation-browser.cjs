// Real home rendering and real feed -> pet/partner/friend conversations.
// Only the long-text specimen is substituted; speaker selection uses the game.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

function measureConversation() {
  const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
  const shown=e=>e.getClientRects().length && getComputedStyle(e).visibility!=='hidden';
  const actors=[...document.querySelectorAll('#pet .character-asset')].filter(shown).map(img=>{
    const r=rect(img), b=window.NaotocchiCastBounds[img.getAttribute('src').split('?')[0]]?.box || [0,0,128,128];
    return {id:img.closest('[data-companion-id]')?.dataset.companionId || (img.closest('#petSprite')?'pet':'partner'),
      x:r.x+r.w*b[0]/128,y:r.y+r.h*b[1]/128,w:r.w*(b[2]-b[0])/128,h:r.h*(b[3]-b[1])/128};
  });
  const accessory=document.getElementById('petAccessory');
  if(shown(accessory)) actors.push({id:'item',...rect(accessory)});
  const bubble=document.getElementById('speechBubble'), speaker=document.getElementById('speechSpeaker');
  return {width:innerWidth,height:innerHeight,actors,main:actors.find(a=>a.id==='pet'),
    bubble:shown(bubble)?rect(bubble):null,slot:rect(document.getElementById('speechSlot')),
    kind:bubble.dataset.kind,label:speaker.dataset.label,
    nameContent:getComputedStyle(speaker,'::after').content,
    nameVisible:shown(document.querySelector('.cast-names')),
    tail:getComputedStyle(bubble,'::before').left,
    poops:[...document.querySelectorAll('#poopRow > .care-icon')].map(rect),
    narration:rect(document.getElementById('message')),stage:rect(document.getElementById('castStage')),
    meters:rect(document.querySelector('.home-meters')),frame:rect(document.querySelector('.screen-frame')),
    pageHeight:document.documentElement.scrollHeight,pageWidth:document.documentElement.scrollWidth,
  };
}

module.exports=async function(browser,engine,fixtures,baseURL,output) {
  const results=[],failures=[];
  const scenarios=[
    ['alone',390,760,0,false,false,0],['partner',390,760,0,true,false,0],
    ['one-friend',390,760,1,false,false,0],['friends',390,760,6,false,false,0],
    ['family',390,760,6,true,false,0],['item',390,760,0,false,true,0],
    ['poop',390,760,0,false,false,1],['item-poop',390,760,6,true,true,4],
    ['full',390,760,26,true,true,4],['small',320,568,0,false,true,4],
    ['small-full',320,568,26,true,true,4],['large-text',320,640,26,true,true,4,'large'],
    ['safe-area',393,852,26,true,true,4],['desktop',768,844,6,true,true,4],
  ];
  const separated=(a,b,gap=0)=>a.x+a.w+gap<=b.x+.6 || b.x+b.w+gap<=a.x+.6 || a.y+a.h+gap<=b.y+.6 || b.y+b.h+gap<=a.y+.6;
  const samePosition=(a,b)=>['x','y','w','h'].every(k=>Math.abs(a[k]-b[k])<.6);
  for(const [name,width,height,count,partner,item,poops,textSize] of scenarios) {
    const label=engine+'-conversation-'+name;
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',isMobile:width<500,hasTouch:width<500});
    if(name==='safe-area') await context.route('**/*.css?*',async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:(await response.text()).replace(/env\(safe-area-inset-(top|right|bottom|left)\)/g,(_,edge)=>({top:59,bottom:34}[edge]||0)+'px')});
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const save=JSON.parse(JSON.stringify(fixtures.phone_dog));
    Object.assign(save,{companions:fixtures.equipped.companions.slice(0,count),partner:partner?fixtures.equipped.partner:null,
      poopCount:poops,health:100,hunger:60,energy:100,happiness:90,transformMeter:0,isSick:false,isSleeping:false});
    Object.assign(save.lifetime,{textSize:textSize||'normal',equippedItemId:item?'poop1':null,ownedShopItems:item?['poop1']:[]});
    if(name==='full' || name==='desktop') {save.speciesLine='man';save.stageIndex=4;}
    await page.addInitScript(s=>{localStorage.setItem('naotocchi-save-v1',JSON.stringify(s));Math.random=()=>.4;},save);
    // Pause on the empty page, with a generous fixed future target. Sampling
    // Date.now()+1 across browser round trips can already be in the past.
    await page.clock.install({time:new Date('2026-09-12T12:00:00Z')});
    await page.clock.pauseAt(new Date('2026-09-12T12:01:00Z'));
    const check=async phase=>{
      const m=await page.evaluate(measureConversation);results.push({label,phase,...m});
      assert.ok(m.pageHeight<=height+1 && m.pageWidth<=width+1,label+': page overflow');
      assert.ok(m.meters.y+m.meters.h<=m.frame.y+m.frame.h+1,label+': meters clipped');
      assert.ok(m.narration.y+m.narration.h<=m.stage.y,label+': narration must stay above the cast');
      assert.ok(m.nameVisible,label+': dialogue hides character names');
      if(m.bubble) {
        const gap=m.bubble.y-m.main.y-m.main.h;
        assert.ok(gap>=6 && gap<=24,label+': dialogue detached from main, gap='+gap);
        assert.ok(m.label && m.nameContent.includes(m.label),label+': speaker name missing');
        assert.ok(m.bubble.y+m.bubble.h<=m.meters.y+1,label+': dialogue covers meters');
        for(const a of m.actors) assert.ok(separated(a,m.bubble,2),label+': dialogue covers '+a.id);
        for(const p of m.poops) assert.ok(separated(p,m.bubble,2),label+': poop covers dialogue');
      }
      for(const p of m.poops) for(const a of m.actors) assert.ok(separated(p,a,1),label+': poop covers '+a.id);
      assert.deepEqual(errors,[],label+': browser errors');
      return m;
    };
    try {
      await page.goto(baseURL);await page.locator('.device.ui-home-active').waitFor();
      await page.evaluate(()=>Promise.all([document.fonts.ready,...[...document.querySelectorAll('#pet img')].map(img=>img.decode().catch(()=>{}))]));
      await page.clock.runFor(100);
      const before=await check('silent');
      await page.locator('#feedBtn').click();await page.clock.runFor(1);
      const expected=['pet',...(partner?['partner']:[]),...(count?['companion']:[])];
      for(let i=0;i<expected.length;i++) {
        if(i) await page.clock.runFor(2500);
        const m=await check('speaker-'+expected[i]);
        assert.equal(m.kind,expected[i],label+': expected the real speaker');
        assert.ok(samePosition(m.main,before.main) && samePosition(m.slot,before.slot),label+': speaker change moves cast/conversation');
        assert.deepEqual(m.poops,before.poops,label+': speaking moves poop');
        await page.screenshot({path:path.join(output,label+'-'+expected[i]+'.png')});
      }
      await page.locator('#speechText').evaluate(e=>e.textContent='おはよう!');
      const short=await check('short');
      await page.locator('#speechText').evaluate(e=>e.textContent='いっしょにいろんなところへ出かけよう。'.repeat(15));
      const long=await check('long');
      assert.ok(samePosition(short.slot,long.slot) && samePosition(short.main,long.main),label+': long text moves layout');
      await page.locator('#speechText').evaluate(e=>e.scrollTop=e.scrollHeight);
      assert.ok(await page.locator('#speechText').evaluate(e=>e.scrollTop>0),label+': long text cannot scroll');
      await page.screenshot({path:path.join(output,label+'-long.png')});
      if(poops) {
        await page.locator('#cleanBtn').click();await page.clock.runFor(1);
        const cleaned=await check('cleaned');
        assert.equal(cleaned.poops.length,0,label+': cleaning failed');
        assert.ok(samePosition(cleaned.main,before.main) && samePosition(cleaned.slot,before.slot),label+': cleaning moves conversation');
      }
      console.log('PASS '+label);
    } catch(e) {
      failures.push(label+': '+e.message);
      await page.screenshot({path:path.join(output,label+'-failure.png')}).catch(()=>{});
      console.error('FAIL '+label+': '+e.message);
    } finally {await context.close();}
  }
  fs.writeFileSync(path.join(output,engine+'-conversation.json'),JSON.stringify({results,failures},null,2));
  assert.deepEqual(failures,[]);
};
