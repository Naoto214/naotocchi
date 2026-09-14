// Real viewport geometry and animation checks. The test-only hook selects a
// movie without waiting for the rare encounter; it runs the production player.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const {harness} = require('./helpers/runtime-harness.cjs');
const base = process.env.MOVIE_TEST_URL || 'http://127.0.0.1:8773';
const output = process.env.MOVIE_TEST_OUTPUT || '/tmp/naotocchi-movie-browser';
fs.mkdirSync(output, {recursive:true});

function measure() {
  const box = el => {const r = el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height};};
  const scene = document.getElementById('dateMovieScene');
  const shown = el => el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
  return {
    viewport:{w:innerWidth,h:innerHeight},scene:box(scene),movie:box(document.getElementById('dateMovie')),
    title:box(document.getElementById('dateMoviePlace')),caption:box(document.getElementById('dateMovieCaption')),
    actors:[...document.querySelectorAll('.date-movie-actor')].filter(shown).map(el => ({...box(el),id:el.id,transform:getComputedStyle(el).transform})),
    button:box(document.getElementById(scene.dataset.complete === 'true' ? 'dateMovieCloseBtn' : 'dateMovieSkipBtn')),
    text:document.getElementById('dateMovieCaption').textContent,action:scene.dataset.action,theme:scene.dataset.theme,
    bodyInert:document.getElementById('device').inert,
    opacity:Number(getComputedStyle(document.getElementById('dateOverlay')).opacity),
    captionOpacity:Number(getComputedStyle(document.getElementById('dateMovieCaption')).opacity),
    captionOverflow:document.getElementById('dateMovieCaption').scrollHeight > document.getElementById('dateMovieCaption').clientHeight,
    failedImages:[...scene.querySelectorAll('img')].filter(img => !img.complete || !img.naturalWidth).map(img=>img.src),
    background:getComputedStyle(scene.querySelector('.movie-backdrop')).transform,
    running:document.getAnimations().filter(a=>scene.contains(a.effect?.target) && a.playState === 'running').length,
  };
}
const overlaps = (a,b) => a.x < b.x+b.w-1 && a.x+a.w > b.x+1 && a.y < b.y+b.h-1 && a.y+a.h > b.y+1;
function check(m, label) {
  assert.ok(Math.abs(m.scene.x)<1 && Math.abs(m.scene.y)<1, label+': scene begins at viewport origin');
  assert.ok(Math.abs(m.scene.w-m.viewport.w)<1 && Math.abs(m.scene.h-m.viewport.h)<1, label+': scene fills viewport');
  assert.equal(m.captionOverflow, false, label+': captions fit');
  for (const r of [m.title,m.caption,m.button,...m.actors]) {
    assert.ok(r.x>=-1 && r.y>=-1 && r.x+r.w<=m.viewport.w+1 && r.y+r.h<=m.viewport.h+1, label+': content inside viewport '+JSON.stringify(r));
  }
  for (const actor of m.actors) assert.ok(!overlaps(actor,m.caption) && !overlaps(actor,m.title),label+': actor clears text '+actor.id);
  assert.ok(!overlaps(m.caption,m.button),label+': controls clear caption');
  assert.ok(m.button.h>=44,label+': 44px control');
  assert.equal(m.bodyInert,true,label+': background controls unavailable during film');
  assert.equal(m.opacity,1,label+': film fully opaque after entrance');
  assert.equal(m.captionOpacity,1,label+': subtitle visible after transition');
  assert.deepEqual(m.failedImages,[],label+': actor art loads');
}

(async()=>{
  const browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || '/tmp/chromium',args:['--no-sandbox']});
  const results=[];
  try {
    const cases = process.env.MOVIE_TEST_QUICK ? [['mirror',393,852,'no-preference',0]] : [
      ['mirror',393,852,'no-preference',0],['mirror',320,568,'no-preference',1],
      ['gate',393,852,'no-preference',0],['boss',393,852,'no-preference',0],
      ['lamp',393,852,'no-preference',1],['stairs',320,568,'no-preference',0],
      ['date:star',393,852,'no-preference',0],['date:rain',320,568,'no-preference',0],
      ['special',393,852,'no-preference',0],['anniversary',393,852,'no-preference',0],
      ['deepsea',393,852,'no-preference',0],['mirror',844,390,'no-preference',0],
      ['mirror',1280,800,'no-preference',0],['mirror',320,568,'reduce',0],
    ];
    for (const [name,width,height,motion,variant] of cases) {
      const label=`${name.replace(':','-')}-${width}x${height}-${motion}-${variant}`;
      const context=await browser.newContext({viewport:{width,height},isMobile:width<900,hasTouch:true,reducedMotion:motion});
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      const h=harness();const save=h.api.state();
      Object.assign(save,{speciesLine:'man',stageIndex:5,gender:'male',ageTicks:500,legendMet:true,marriageMilestonesSeen:[1,10,25,50]});
      await page.addInitScript(save=>localStorage.setItem('naotocchi-save-v1',JSON.stringify(save)),JSON.parse(JSON.stringify(save)));
      await page.route('**/script.js?*',async route=>{
        const response=await route.fetch();
        const source=(await response.text()).replace(/\}\)\(\);\s*$/,`window.__movieQA={playLegendEncounterMovie,playOrdinaryDateMovie,playMarriageMovie,LEGEND_ENCOUNTERS,DATE_PLANS,ALL_PARTNER_CANDIDATES,state:()=>state};\n})();`);
        await route.fulfill({response,body:source});
      });
      await page.goto(base,{waitUntil:'networkidle'});
      await page.clock.install();
      await page.clock.pauseAt(new Date(Date.now()+100));
      await page.evaluate(({name,variant})=>{
        const q=window.__movieQA,s=q.state();
        Math.random=()=>variant ? .99 : 0;
        const partner={...q.ALL_PARTNER_CANDIDATES.find(p=>p.id==='robot_neighbor'),married:true};
        if(name.startsWith('date:') || ['special','deepsea'].includes(name)) {
          s.partner=partner;s.items.reward=1;s.regionId=name==='deepsea'?'deepsea':'forest';
          q.playOrdinaryDateMovie(q.DATE_PLANS.find(p=>p.id===(name==='deepsea'?'rain':name.split(':')[1] || 'photo')),partner,'同じ景色を、ふたりで見ていた。','また、ここに来よう。',name==='special');
        } else if(name==='anniversary') {
          s.partner=partner;q.playMarriageMovie({years:50,icon:'🥇',title:'きんこんしき'});
        } else q.playLegendEncounterMovie(q.LEGEND_ENCOUNTERS.find(l=>l.id===name),200);
      },{name,variant});
      await page.clock.runFor(4300);
      // The ordered JS clock advances the story; CSS animations use real time.
      await new Promise(resolve=>setTimeout(resolve,700));
      await page.evaluate(()=>document.fonts.ready);
      await page.waitForFunction(()=>[...document.querySelectorAll('#dateMovieScene img')].every(i=>i.complete));
      const first=await page.evaluate(measure);check(first,label);
      await page.screenshot({path:path.join(output,label+'.png')});
      await page.clock.runFor(800);
      await new Promise(resolve=>setTimeout(resolve,120));
      const second=await page.evaluate(measure);
      if(motion==='reduce') assert.equal(second.running,0,label+': no animations with reduced motion');
      else assert.notEqual(first.background,second.background,label+': camera actually moves');
      await page.clock.runFor(9200);
      await new Promise(resolve=>setTimeout(resolve,700));
      const middle=await page.evaluate(measure);check(middle,label+'-middle');
      if(name==='mirror') {
        assert.equal(middle.action,'ripple');
        await page.screenshot({path:path.join(output,label+'-ripple.png')});
      }
      await page.clock.runFor(24000);
      await new Promise(resolve=>setTimeout(resolve,700));
      assert.equal(await page.locator('#dateMovieCloseBtn').isVisible(),true,label+': finishes');
      check(await page.evaluate(measure),label+'-finished');
      await page.locator('#dateMovieCloseBtn').click();
      assert.equal(await page.locator('#dateOverlay').isVisible(),false,label+': closes');
      assert.equal(await page.evaluate(()=>document.getElementById('device').inert),false,label+': releases home input');
      assert.deepEqual(errors,[],label+': no runtime errors');
      results.push({label,first,middle,errors});
      console.log('PASS '+label);
      await context.close();
    }
  } finally {
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));
    await browser.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
