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
    speaker:document.getElementById('dateMovieCaption').dataset.speaker,
    speakerName:document.querySelector('.movie-speaker-name')?.textContent || '',
    speakerArt:document.querySelector('.movie-speaker-art') ? box(document.querySelector('.movie-speaker-art')) : null,
    speakerLabel:document.querySelector('.movie-speaker-name') ? box(document.querySelector('.movie-speaker-name')) : null,
    portrait:document.querySelector('.movie-speaker-art img')?.getAttribute('src') || '',
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
  if(m.speaker) {
    assert.ok(m.speakerName.length>0,label+': visible speaker name');
    assert.ok(m.speakerArt.w>=24 && m.speakerArt.h>=24,label+': small readable portrait');
    const r=m.speakerLabel;
    assert.ok(r.x>=m.caption.x && r.x+r.w<=m.caption.x+m.caption.w+1,label+': full name stays inside caption');
    if(m.speaker==='pet' || m.speaker==='partner') assert.ok(m.portrait,label+': character PNG in speech label');
  } else assert.equal(m.speakerName,'',label+': narration clears the previous speaker');
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
      ['date:photo',320,568,'no-preference',0,'knitting_spider'],
      ['date:talk',844,390,'no-preference',0,'oasis_cactus'],
      ['anniversary',320,568,'reduce',0,'anglerfish'],
      ['date:talk',320,568,'no-preference',0,'guest'],
      ['ring',320,568,'no-preference',0],
      ['ring-special',393,852,'no-preference',0,'anglerfish'],
    ];
    for (const [name,width,height,motion,variant,partnerId='robot_neighbor'] of cases.filter(row=>!process.env.MOVIE_TEST_FILTER || new RegExp(process.env.MOVIE_TEST_FILTER).test(row.join(':')))) {
      const label=`${name.replace(':','-')}-${width}x${height}-${motion}-${variant}-${partnerId}`;
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
      await page.evaluate(({name,variant,partnerId})=>{
        const q=window.__movieQA,s=q.state();
        Math.random=()=>variant ? .99 : 0;
        const partner=partnerId==='guest' ? {id:'guest',label:'ともだちのねこ',emoji:'🐈',married:true}
          : {...q.ALL_PARTNER_CANDIDATES.find(p=>p.id===partnerId),married:true};
        if(name.startsWith('date:') || ['special','deepsea','ring','ring-special'].includes(name)) {
          s.partner=partner;s.items.reward=1;s.regionId=name==='deepsea'?'deepsea':'forest';
          if(name.startsWith('ring')) s.lifetime.ownedNaotoItems=['naoto_ring'];
          q.playOrdinaryDateMovie(q.DATE_PLANS.find(p=>p.id===(name==='deepsea'?'rain':name.split(':')[1] || 'photo')),partner,'同じ景色を、ふたりで見ていた。','また、ここに来よう。',name==='special' || name==='ring-special');
        } else if(name==='anniversary') {
          s.partner=partner;q.playMarriageMovie({years:50,icon:'🥇',title:'きんこんしき'});
        } else q.playLegendEncounterMovie(q.LEGEND_ENCOUNTERS.find(l=>l.id===name),200);
      },{name,variant,partnerId});
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
      const replyDelta=['boss','lamp'].includes(name) ? 1900 : 5700;
      await page.clock.runFor(replyDelta);
      await new Promise(resolve=>setTimeout(resolve,700));
      const reply=await page.evaluate(measure);check(reply,label+'-reply');
      await page.screenshot({path:path.join(output,label+'-reply.png')});
      await page.clock.runFor(9200-replyDelta);
      await new Promise(resolve=>setTimeout(resolve,700));
      const middle=await page.evaluate(measure);check(middle,label+'-middle');
      await page.screenshot({path:path.join(output,label+'-dialogue.png')});
      if(name==='mirror') {
        assert.equal(middle.action,'ripple');
        await page.screenshot({path:path.join(output,label+'-ripple.png')});
      }
      let ring=null;
      const ringDelta=name==='ring' ? 11300 : 14600;
      if(name.startsWith('ring')) {
        await page.clock.runFor(ringDelta);
        await new Promise(resolve=>setTimeout(resolve,700));
        ring=await page.evaluate(measure);check(ring,label+'-phrase');
        assert.equal(ring.speaker,'partner',label+': partner says the ring phrase');
        await page.screenshot({path:path.join(output,label+'-phrase.png')});
      }
      await page.clock.runFor(ring ? 24000-ringDelta : 24000);
      await new Promise(resolve=>setTimeout(resolve,700));
      assert.equal(await page.locator('#dateMovieCloseBtn').isVisible(),true,label+': finishes');
      check(await page.evaluate(measure),label+'-finished');
      await page.locator('#dateMovieCloseBtn').click();
      assert.equal(await page.locator('#dateOverlay').isVisible(),false,label+': closes');
      assert.equal(await page.evaluate(()=>document.getElementById('device').inert),false,label+': releases home input');
      assert.deepEqual(errors,[],label+': no runtime errors');
      results.push({label,first,reply,middle,...(ring ? {ring} : {}),errors});
      console.log('PASS '+label);
      await context.close();
    }
  } finally {
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));
    await browser.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
