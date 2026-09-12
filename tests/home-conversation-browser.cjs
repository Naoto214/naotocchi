// Real home rendering and real feed -> pet/partner/friend conversations.
// Only the long-text specimen is substituted; speaker selection uses the game.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

function measureConversation() {
  const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
  const shown=e=>e.getClientRects().length && getComputedStyle(e).visibility!=='hidden';
  const actors=[...document.querySelectorAll('#pet .character-visual')].filter(shown).map(visual=>{
    const img=visual.querySelector('.character-asset'),asset=img?.getAttribute('src').split('?')[0];
    const failed=visual.classList.contains('asset-failed'),r=rect(failed?visual:img);
    const b=failed?[0,0,128,128]:window.NaotocchiCastBounds[asset]?.box || [0,0,128,128];
    const fallback=visual.querySelector('.character-emoji-fallback');
    return {id:visual.closest('[data-companion-id]')?.dataset.companionId || (visual.closest('#petSprite')?'pet':'partner'),
      asset,failed,
      fallbackVisible:!!(failed && fallback && shown(fallback) && fallback.textContent.trim() && parseFloat(getComputedStyle(fallback).fontSize)>0 && rect(fallback).w>0 && rect(fallback).h>0),
      x:r.x+r.w*b[0]/128,y:r.y+r.h*b[1]/128,w:r.w*(b[2]-b[0])/128,h:r.h*(b[3]-b[1])/128};
  });
  const accessory=document.getElementById('petAccessory');
  if(shown(accessory)) actors.push({id:'item',...rect(accessory)});
  const bubble=document.getElementById('speechBubble'), speaker=document.getElementById('speechSpeaker');
  return {width:innerWidth,height:innerHeight,visibleHeight:visualViewport?.height || innerHeight,actors,main:actors.find(a=>a.id==='pet'),
    fieldScale:parseFloat(getComputedStyle(document.getElementById('petSprite')).width)/104,
    bubble:shown(bubble)?rect(bubble):null,slot:rect(document.getElementById('speechSlot')),
    kind:bubble.dataset.kind,speakerId:bubble.dataset.speakerId,speakerLabel:speaker.dataset.label,
    nameContent:getComputedStyle(speaker,'::after').content,
    nameVisible:shown(document.querySelector('.cast-names')),
    tail:getComputedStyle(bubble,'::before').left,
    tailTip:getComputedStyle(bubble,'::before').clipPath,
    tailBox:shown(bubble)?{x:rect(bubble).x+parseFloat(getComputedStyle(bubble,'::before').left)-7,y:rect(bubble).y-5,w:14,h:6}:null,
    poops:[...document.querySelectorAll('#poopRow > .care-icon')].map(rect),
    narration:rect(document.getElementById('message')),stage:rect(document.getElementById('castStage')),
    meters:rect(document.querySelector('.home-meters')),frame:rect(document.querySelector('.screen-frame')),
    controls:[...document.querySelectorAll('.buttons button')].map(rect),
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
    ['adult-dog',390,760,6,true,true,4,'normal','dog',5],
    ['fish',390,760,26,true,true,4,'normal','clownfish',6],
    ['small-sprout',320,568,26,true,true,4,'normal','sakura',0],
    ['small-old-tree',320,568,26,true,true,4,'normal','sakura',7],
    ['world-tree',390,760,26,true,true,4,'normal','world_tree',6],
    ['pupa',320,568,6,true,true,4,'normal','butterfly',4],
    ['small-large-text',320,568,26,true,true,4,'large'],
    ['small-toolbar',320,640,26,true,true,4,'large'],
    ['poop-two',390,760,6,true,true,2,'normal','dog',5],
    ['poop-three',390,760,6,true,true,3,'normal','dog',5],
    ['small-adult',320,568,26,true,true,4,'normal','dog',5],
    ['full-friends-only',320,568,26,false,false,4],
    ['full-partner-only',320,568,26,true,false,4],
    ['full-item-only',320,568,26,false,true,4],
    ['item-crown',320,568,26,true,true,4],
    ['right-speaker',390,760,6,true,true,4,'normal','dog',5],
    ['adult-single',390,760,0,false,false,1,'normal','dog',5],
    ['missing-friends-min',288,568,26,true,true,4],
    ['missing-all-min',288,568,26,true,true,4],
    ['missing-all-small',320,568,26,true,true,4,'large'],
  ];
  const separated=(a,b,gap=0)=>a.x+a.w+gap<=b.x+.6 || b.x+b.w+gap<=a.x+.6 || a.y+a.h+gap<=b.y+.6 || b.y+b.h+gap<=a.y+.6;
  const samePosition=(a,b)=>['x','y','w','h'].every(k=>Math.abs(a[k]-b[k])<.6);
  for(const [name,width,height,count,partner,item,poops,textSize,species,stage] of scenarios) {
    const label=engine+'-conversation-'+name;
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',isMobile:width<500,hasTouch:width<500});
    if(name==='safe-area') await context.route('**/*.css?*',async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:(await response.text()).replace(/env\(safe-area-inset-(top|right|bottom|left)\)/g,(_,edge)=>({top:59,bottom:34}[edge]||0)+'px')});
    });
    if(name.startsWith('missing-')) {
      await context.route('**/assets/characters/**/*.png',route=>
        name==='missing-friends-min' && !route.request().url().includes('/companions/')?route.continue():route.abort('failed'));
      if(name.endsWith('-min')) await context.route('**/world-scene.css?*',async route=>{
        const response=await route.fetch();
        // Restrict the available region, without overriding the inline min
        // height whose erroneous expansion caused this regression.
        await route.fulfill({response,body:(await response.text())+'\n.world-mode .device[data-home-fixed="true"] #petArea{flex:0 0 152px;min-height:152px}.world-mode .device[data-home-fixed="true"] .cast-stage{height:152px;flex:0 0 152px}'});
      });
    }
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const save=JSON.parse(JSON.stringify(fixtures.phone_dog));
    Object.assign(save,{companions:fixtures.equipped.companions.slice(0,count),partner:partner?fixtures.equipped.partner:null,
      poopCount:poops,health:100,hunger:60,energy:100,happiness:90,transformMeter:0,isSick:false,isSleeping:false});
    const itemId=name==='item-crown'?'crown':'poop1';
    Object.assign(save.lifetime,{textSize:textSize||'normal',equippedItemId:item?itemId:null,ownedShopItems:item?[itemId]:[]});
    const line=species || ((name==='full' || name==='desktop')?'man':save.speciesLine);
    const index=stage ?? ((name==='full' || name==='desktop')?4:0);
    // Appearance is derived from age on load; stageIndex alone is overwritten.
    Object.assign(save,{speciesLine:line,stageIndex:index,ageTicks:[2,4,8,13,17,23,41,71][index]*20});
    await page.addInitScript(s=>{localStorage.setItem('naotocchi-save-v1',JSON.stringify(s));Math.random=()=>.4;},save);
    if(name==='right-speaker') await page.addInitScript(()=>{Math.random=()=>.2;});
    if(name==='small-toolbar') await page.addInitScript(()=>Object.defineProperty(visualViewport,'height',{get:()=>568}));
    // Pause on the empty page, with a generous fixed future target. Sampling
    // Date.now()+1 across browser round trips can already be in the past.
    await page.clock.install({time:new Date('2026-09-12T12:00:00Z')});
    await page.clock.pauseAt(new Date('2026-09-12T12:01:00Z'));
    const check=async phase=>{
      const m=await page.evaluate(measureConversation);results.push({label,phase,...m});
      assert.ok(m.main.asset.endsWith('/'+line+'/'+String(index+1).padStart(2,'0')+'.png'),label+': wrong growth stage rendered: '+m.main.asset);
      if(name.startsWith('missing-')) {
        const friends=m.actors.filter(a=>a.id!=='pet' && a.id!=='partner' && a.id!=='item');
        assert.equal(friends.length,count,label+': a companion disappeared');
        assert.ok(friends.every(a=>a.failed),label+': missing companion images were not exercised');
        assert.ok(m.actors.filter(a=>a.failed).every(a=>a.fallbackVisible),label+': a failed image has no visible fallback');
        if(name!=='missing-friends-min') assert.ok(m.main.failed,label+': missing main image was not exercised');
        if(name.endsWith('-min')) assert.ok(Math.abs(m.stage.w-270)<.6 && Math.abs(m.stage.h-152)<.6,label+': fallback expanded the 270x152 region');
        for(const a of m.actors) assert.ok(a.x>=m.stage.x && a.x+a.w<=m.stage.x+m.stage.w+.6 && a.y>=m.stage.y && a.y+a.h<=m.stage.y+m.stage.h+.6,label+': fallback actor is outside the stage');
      }
      assert.ok(m.pageHeight<=height+1 && m.pageWidth<=width+1,label+': page overflow');
      assert.ok(m.meters.y+m.meters.h<=m.frame.y+m.frame.h+1,label+': meters clipped');
      for(const c of m.controls) assert.ok(c.w>=44 && c.h>=44 && c.y+c.h<=m.visibleHeight+1,label+': control is too small or below the visible viewport');
      assert.ok(m.narration.y+m.narration.h<=m.stage.y,label+': narration must stay above the cast');
      assert.ok(m.nameVisible,label+': dialogue hides character names');
      assert.ok(Math.abs(m.slot.x+m.slot.w/2-m.main.x-m.main.w/2)<.6,label+': conversation is not centered on the main character');
      if(m.bubble) {
        const gap=m.bubble.y-m.main.y-m.main.h;
        assert.ok(gap>=5.5 && gap<=8,label+': dialogue detached from main, gap='+gap);
        assert.ok(Math.abs(m.bubble.x+m.bubble.w/2-m.main.x-m.main.w/2)<.6,label+': bubble is not centered on the main character');
        assert.ok(m.speakerLabel && m.nameContent.includes(m.speakerLabel),label+': speaker name missing');
        assert.ok(m.bubble.y+m.bubble.h<=m.meters.y+1,label+': dialogue covers meters');
        for(const a of m.actors) assert.ok(separated(a,m.bubble,2),label+': dialogue covers '+a.id);
        for(const p of m.poops) {
          assert.ok(separated(p,m.bubble,2),label+': poop covers dialogue');
          assert.ok(separated(p,m.tailBox),label+': poop covers the speaker tail');
        }
      }
      for(const p of m.poops) {
        const expectedSize=Math.max(8,Math.min(12,Math.round(12*m.fieldScale)));
        assert.ok(Math.abs(p.w-expectedSize)<.01 && Math.abs(p.h-expectedSize)<.01,label+': poop does not follow the rendered field scale');
        for(const a of m.actors) assert.ok(separated(p,a,1),label+': poop covers '+a.id);
        assert.ok(p.x>=m.main.x+m.main.w+.5,label+': poop crosses the main body / central axis');
        assert.ok(p.y+p.h<=m.slot.y-1.5,label+': poop is below the top of the dialogue');
        assert.ok(p.y>=m.main.y+m.main.h-24.5,label+': poop is too high above the feet');
        assert.ok(p.x+p.w<=m.stage.x+m.stage.w-24,label+': poop is too close to the right edge');
        assert.ok(p.y+p.h<=m.stage.y+m.stage.h+.6 && p.y+p.h<=m.meters.y,label+': poop leaves the stage or covers meters');
        assert.ok(Math.hypot(p.x+p.w/2-m.main.x-m.main.w,p.y+p.h/2-m.main.y-m.main.h)<=72,label+': poop detached from main');
      }
      if(m.poops.length) assert.ok(Math.max(...m.poops.map(p=>p.x+p.w))-Math.min(...m.poops.map(p=>p.x))<=28.6 && Math.max(...m.poops.map(p=>p.y+p.h))-Math.min(...m.poops.map(p=>p.y))<=28.6,label+': multiple poops stretch outside their compact pocket');
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
        if(name==='right-speaker' && m.kind==='companion') assert.ok(m.actors.find(a=>a.id===m.speakerId).x>m.main.x+m.main.w/2,label+': expected a companion on the right');
        if(m.kind==='pet') assert.ok(Math.abs(parseFloat(m.tail)-m.bubble.w/2)<.6,label+': main speech tail is not centered');
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
      if(name==='right-speaker') {
        // Exercise the real CSS sway and individual speaking reactions as well
        // as the reduced-motion layout above. Poop stays outside both layers.
        await page.emulateMedia({reducedMotion:'no-preference'});
        await page.clock.runFor(50);
        await page.locator('#feedBtn').click();
        const positions=[];
        for(const fraction of [0,.25,.5,.75]) {
          await page.clock.runFor(150);
          const animated=await page.locator('.cast-sway').evaluate((e,fraction)=>{
            const a=e.getAnimations().find(a=>a.animationName==='world-float' || a.animationName==='world-breeze');
            if(!a)return false;
            a.pause();a.currentTime=Number(a.effect.getTiming().duration)*fraction;return true;
          },fraction);
          assert.ok(animated,label+': shared sway was not exercised');
          const m=await page.evaluate(measureConversation);
          results.push({label,phase:'animated-'+fraction,...m});positions.push(m.main.x);
          assert.ok(samePosition(m.slot,before.slot),label+': animation moves dialogue');
          assert.deepEqual(m.poops,before.poops,label+': animation moves poop');
          for(const p of m.poops) for(const a of m.actors) assert.ok(separated(p,a,1),label+': moving '+a.id+' covers poop');
        }
        assert.ok(Math.max(...positions)-Math.min(...positions)>4,label+': cast did not actually sway');
        await page.screenshot({path:path.join(output,label+'-animated.png')});
        await page.emulateMedia({reducedMotion:'reduce'});
        await page.clock.runFor(1);
      }
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
