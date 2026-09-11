// Additional real-browser coverage run by the existing Home layout CI job.
// Save fixtures exercise shipped code; no game-state hooks are injected.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function attentionState(page) {
  return page.evaluate(() => {
    const el = id => document.getElementById(id);
    const rect = node => {
      const r = node.getBoundingClientRect();
      return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};
    };
    const fx=el('careAlertFx'), device=el('device'), notice=el('message');
    const recommended=document.querySelector('.buttons button[data-care-recommended="true"]');
    const button=el('medicineBtn'), r=rect(button);
    const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
    return {
      level:fx?.dataset.level,kind:notice.dataset.careKind,sick:device.dataset.careIllness,
      title:el('worldCareState').textContent,notice:notice.textContent,
      fxDisplay:fx && getComputedStyle(fx).display,
      fxMotion:fx && getComputedStyle(fx).animationName,
      fxPointer:fx && getComputedStyle(fx).pointerEvents,
      sweatContent:getComputedStyle(el('petSprite'),'::after').content,
      sweatMotion:getComputedStyle(el('petSprite'),'::after').animationName,
      sweatTop:parseFloat(getComputedStyle(el('petSprite'),'::after').top),
      spriteHeight:el('petSprite').getBoundingClientRect().height,
      action:recommended?.id || '',actionMotion:recommended && getComputedStyle(recommended).animationName,
      actionShadow:recommended && getComputedStyle(recommended).boxShadow,
      medicineClickable:hit===button || button.contains(hit),
      noticeRect:rect(notice),buttons:[...document.querySelectorAll('.buttons button')].map(rect),
      cast:[...document.querySelectorAll('#petSprite,.partner-companion,.companion-chip-small,.pet-accessory')]
        // The existing cure speech can bounce/rotate actors. Compare layout
        // sizes rather than the transient transformed bounding rectangles.
        .filter(e=>e.getBoundingClientRect().width>0).map(e=>({width:getComputedStyle(e).width,height:getComputedStyle(e).height})),
      pageWidth:document.documentElement.scrollWidth,width:innerWidth,height:innerHeight,
    };
  });
}

module.exports = async function checkCareAttention(browser, engine, fixtures, baseUrl, output) {
  const results=[];
  const cases=[
    ['sick',390,844,'care_attention_sick',false,'warning','medicineBtn'],
    ['low-life',320,640,'care_attention_low_life',false,'warning','feedBtn'],
    ['critical',390,844,'care_attention_critical',false,'critical','medicineBtn'],
    ['critical-small-reduced',320,568,'care_attention_critical',true,'critical','medicineBtn'],
  ];
  try {
    for(const [name,width,height,fixture,reduced,level,action] of cases) {
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,
        reducedMotion:reduced?'reduce':'no-preference'});
      const page=await context.newPage(), errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      const save=JSON.parse(JSON.stringify(fixtures[fixture]));
      if(reduced) save.lifetime.textSize='large';
      await page.addInitScript(save=>localStorage.setItem('naotocchi-save-v1',JSON.stringify(save)),save);
      try {
        await page.goto(baseUrl);
        await page.locator('.device.ui-home-active').waitFor();
        await page.evaluate(()=>document.fonts.ready);
        const before=await attentionState(page);
        results.push({name,phase:'initial',...before});
        assert.equal(before.level,level,name+': attention level');
        assert.equal(before.fxDisplay,'block',name+': visible edge effect');
        assert.equal(before.fxPointer,'none',name+': effect must not take taps');
        assert.equal(before.action,action,name+': useful care action');
        assert.equal(before.medicineClickable,true,name+': controls remain tappable');
        assert.ok(before.pageWidth<=width+1,name+': horizontal overflow');
        assert.ok(before.buttons.every(b=>b.bottom<=height+1 && b.y>=before.noticeRect.bottom-1),name+': pinned notice/control layout');
        assert.notEqual(before.actionShadow,'none',name+': static recommendation remains visible');
        if(save.isSick) {
          assert.equal(before.sick,'true');
          assert.notEqual(before.sweatContent,'none',name+': illness mark near protagonist');
          assert.ok(before.sweatTop>before.spriteHeight*.60 && before.sweatTop<before.spriteHeight*.90,
            name+': sweat is near the painted young fish, not the transparent upper frame');
        }
        if(name==='sick') assert.match(before.title,/びょうき/);
        else assert.match(before.title,/いのち/);
        if(reduced) {
          assert.equal(before.fxMotion,'none');assert.equal(before.sweatMotion,'none');assert.equal(before.actionMotion,'none');
        } else {
          assert.equal(before.actionMotion,'care-action-breathe');
          if(level==='critical') assert.equal(before.fxMotion,'care-edge-breathe');
          if(save.isSick) assert.equal(before.sweatMotion,'care-sweat');
        }
        await page.screenshot({path:path.join(output,engine+'-care-'+name+'.png')});

        if(name==='sick') {
          await page.locator('#medicineBtn').click();
          await page.waitForFunction(()=>document.getElementById('device').dataset.careIllness==='');
          // A real cure story can temporarily occupy the home stage.
          await page.locator('#storyFlash').waitFor({state:'hidden'});
          const after=await attentionState(page);
          results.push({name,phase:'cured',...after});
          assert.equal(after.level,'');
          assert.equal(after.fxDisplay,'none');
          assert.equal(after.sweatContent,'none');
          assert.deepEqual(after.cast,before.cast,'illness/cure must not resize any character or accessory');
          await page.screenshot({path:path.join(output,engine+'-care-cured.png')});
        }
        if(name==='critical') {
          await page.locator('#menuBtn').click();
          await page.waitForFunction(()=>document.getElementById('careAlertFx').dataset.level==='');
          assert.equal((await attentionState(page)).fxDisplay,'none','menu suppresses effects');
          await page.keyboard.press('Escape');
          await page.waitForFunction(()=>document.getElementById('careAlertFx').dataset.level==='critical');
        }
        assert.deepEqual(errors,[],name+': browser runtime errors');
        console.log('PASS '+engine+'-care-'+name);
      } catch(error) {
        await page.screenshot({path:path.join(output,engine+'-care-'+name+'-failure.png')}).catch(()=>{});
        throw error;
      } finally {await context.close();}
    }
  } finally {fs.writeFileSync(path.join(output,engine+'-care-measurements.json'),JSON.stringify(results,null,2));}
};
