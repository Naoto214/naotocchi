// Run in CI with Playwright's Chromium and WebKit. Uses real HTML/CSS/scripts
// and the existing QA saves; it never injects hooks into the game closure.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { chromium, webkit } = require('playwright');

const output = path.resolve('test-results/home-layout');
fs.mkdirSync(output, { recursive: true });
let qaHtml;
require('./visual-qa.cjs')().configureServer({ middlewares: { use(_path, handler) {
  handler({}, { setHeader() {}, end(html) { qaHtml = html; } });
} } });
const qaScript = qaHtml.match(/<script>([\s\S]*?)<\/script>/)[1];
const fixtures = vm.runInNewContext(qaScript.slice(0, qaScript.indexOf('const mount=')) + '\nfixtures');

function savedScene(name) {
  const save = JSON.parse(JSON.stringify(fixtures[name]));
  // Enough life for layout/scroll checks, with a persistent medicine notice.
  Object.assign(save, { health:90, hunger:80, energy:90, happiness:80,
    isSick:true, sicknessType:'しんぞうがバクバクする、とてもながいなまえのびょうき' });
  Object.assign(save.lifetime, { timeMode:'night', weatherMode:'sunny', seasonMode:'autumn' });
  if (name === 'world_farewell') {
    save.lifetime.textSize = 'large';
    save.lifetime.endingTiersReached = [0,1,2,3,4];
    save.lifetime.clears = 5;
    save.lifetime.dexCleared = true;
  }
  return save;
}

async function measure(page) {
  return page.evaluate(() => {
    const rect = e => {
      const r = e.getBoundingClientRect();
      return { x:r.x, y:r.y, right:r.right, bottom:r.bottom, width:r.width, height:r.height };
    };
    const notice = document.getElementById('message');
    const n = rect(notice);
    const hit = document.elementFromPoint(n.x + n.width / 2, n.bottom - 4);
    const frame = document.querySelector('.screen-frame');
    return {
      width:innerWidth, height:innerHeight, pageWidth:document.documentElement.scrollWidth,
      pageHeight:document.documentElement.scrollHeight,
      header:rect(document.querySelector('.device-header')),
      frame:rect(frame), frameScroll:frame.scrollTop, frameOverflow:frame.scrollHeight - frame.clientHeight,
      notice:n, noticeHasContent:!!(notice.textContent.trim() || notice.querySelector('img,svg')),
      noticeVisible:!!hit && (hit === notice || notice.contains(hit)),
      buttons:[...document.querySelectorAll('.buttons button')].map(e => ({ id:e.id, ...rect(e) })),
      headerItems:[...document.querySelectorAll('.header-button:not(.hidden),.ending-badge,.name-plate')].map(rect),
      stage:rect(document.getElementById('castStage')),
      content:[...document.querySelectorAll('#screenNormal > *, .cast-heading > *, #petArea > *')]
        .filter(e => e.getClientRects().length).map(e => ({name:e.id || e.className,...rect(e)})),
    };
  });
}

function checkLayout(m, label) {
  assert.ok(m.pageWidth <= m.width + 1, label + ': page overflows horizontally');
  assert.ok(m.pageHeight <= m.height + 1, label + ': home exceeds the visible viewport');
  assert.ok(m.header.y >= 0, label + ': header leaves the viewport');
  for (const r of m.headerItems) {
    assert.ok(r.x >= 0 && r.right <= m.width + 1 && r.y >= 0 && r.bottom <= m.header.bottom + 1,
      label + ': title, badge or header button protrudes');
  }
  // An empty notice deliberately keeps its row but uses visibility:hidden.
  // Once there is text/art, including the long-text check below, hit-test it.
  assert.ok(!m.noticeHasContent || m.noticeVisible, label + ': bottom of narration is clipped or covered');
  assert.ok(m.notice.height >= 36 && m.notice.y >= m.header.bottom, label + ': narration needs its own readable space');
  for (const b of m.buttons) {
    assert.ok(b.width >= 44 && b.height >= 44, label + ': small touch target ' + b.id);
    assert.ok(b.x >= 0 && b.right <= m.width + 1 && b.bottom <= m.height + 1, label + ': offscreen control ' + b.id);
    assert.ok(m.notice.bottom <= b.y + 1, label + ': narration overlaps ' + b.id);
  }
}

(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({ server:{ host:'127.0.0.1', port:5191, strictPort:true } });
  await server.listen();
  const results = [], failures = [];
  try {
    for (const [engine, type] of Object.entries({ chromium, webkit })) {
      const browser = await type.launch();
      try {
        for (const [name, width, height, fixture, insets] of [
          ['phone',390,786,'alone'],
          ['phone-tall',390,844,'world_sea_full'],
          ['phone-safe-area',390,844,'alone',{top:59,bottom:34}],
          ['phone-badges-safe-area',390,844,'badges_transparent',{top:59,bottom:34}],
          ['small',320,568,'care_large'],
          ['small-640',320,640,'badges_transparent'],
          ['farewell',320,568,'world_farewell'],
          ['landscape-safe-area',844,390,'badges_transparent',{left:59,right:59,bottom:21}],
          ['desktop',768,844,'badges_transparent'],
        ]) {
          const label = engine + '-' + name;
          const context = await browser.newContext({ viewport:{width,height}, deviceScaleFactor:1 });
          if (insets) {
            // Desktop CI has no physical notch. Substitute only CSS env inputs;
            // the shipped padding rules still calculate and lay out the page.
            await context.route('**/*.css?*', async route => {
              const response = await route.fetch();
              const css = (await response.text()).replace(/env\(safe-area-inset-(top|right|bottom|left)\)/g,
                (_match,edge) => (insets[edge] || 0) + 'px');
              await route.fulfill({response,body:css});
            });
          }
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', e => errors.push(e.message));
          await page.addInitScript(save => localStorage.setItem('naotocchi-save-v1', JSON.stringify(save)), savedScene(fixture));
          try {
            await page.goto('http://127.0.0.1:5191/');
            await page.locator('.device.ui-home-active').waitFor();
            await page.evaluate(() => document.fonts.ready);
            await page.screenshot({ path:path.join(output,label+'.png') });
            const before = await measure(page);
            results.push({ label, phase:'loaded', ...before });
            checkLayout(before,label);
            if (insets) {
              assert.ok(before.header.y >= (insets.top || 0),label+': top safe area');
              assert.ok(before.buttons.every(b => b.bottom <= height-(insets.bottom||0)+1),label+': bottom safe area');
              assert.ok(before.header.x >= (insets.left||0) && before.header.right <= width-(insets.right||0)+1,label+': side safe areas');
            }

            // Home stays still, including the central age/cast/meter region.
            await page.locator('.screen-frame').evaluate(e => { e.scrollTop = e.scrollHeight; });
            const after = await measure(page);
            results.push({ label, phase:'scrolled', ...after });
            checkLayout(after,label+' scrolled');
            // Farewell is a record/detail flow, outside the fixed living home.
            if (name !== 'farewell') {
              assert.equal(after.frameScroll,0,label+': central home can still scroll');
              for (const r of before.content) {
                assert.ok(r.y >= before.frame.y-1 && r.bottom <= before.frame.bottom+1,
                  label+': central content is clipped: '+r.name+' '+JSON.stringify({r,frame:before.frame}));
              }
              await page.mouse.move(before.stage.x+before.stage.width/2,before.stage.y+before.stage.height/2);
              await page.mouse.wheel(0,400);
              await page.waitForTimeout(100);
              const wheeled=await measure(page);
              assert.equal(wheeled.frameScroll,0,label+': wheel moves central home');
              assert.equal(await page.evaluate(()=>scrollY),0,label+': wheel moves the page');
              assert.equal(wheeled.content[0].y,before.content[0].y,label+': age moves after wheel');
            }
            assert.ok(Math.abs(before.notice.y-after.notice.y)<1, label+': narration moves with central scroll');
            assert.ok(Math.abs(before.header.y-after.header.y)<1, label+': header moves with central scroll');
            assert.ok(Math.abs(before.buttons[0].y-after.buttons[0].y)<1, label+': controls move with central scroll');

            if (name.includes('badges') || name === 'small-640' || name === 'landscape-safe-area') {
              await page.locator('.ending-badge').first().click();
              const tip=await page.locator('#endingBadgeTip').boundingBox();
              assert.ok(tip && tip.y>=before.header.y && tip.y+tip.height<=height && tip.x>=0 && tip.x+tip.width<=width,
                label+': badge explanation leaves the viewport');
              results.push({label,phase:'badge-explanation',tip,width,height});
              await page.screenshot({path:path.join(output,label+'-badge.png')});
            }

            if (name === 'small') {
              // The long dialogue must fit its own box without shifting home.
              await page.evaluate(() => {
                document.getElementById('speechText').textContent='長いセリフも最後まで読めるよ。'.repeat(8);
                document.getElementById('speechBubble').classList.remove('hidden');
              });
              const speaking=await measure(page);
              assert.equal(speaking.stage.y,before.stage.y,label+': dialogue moves the cast');
              assert.equal(speaking.notice.y,before.notice.y,label+': dialogue moves care warning');
              const bubble=await page.locator('#speechBubble').boundingBox();
              assert.ok(bubble.y>=before.frame.y && bubble.y+bubble.height<=before.stage.y+1,label+': dialogue covers cast or leaves frame');
              await page.locator('#speechText').evaluate(e=>{e.scrollTop=e.scrollHeight;});
              assert.ok(await page.locator('#speechText').evaluate(e=>e.scrollTop>0),label+': long dialogue cannot scroll');
              await page.screenshot({path:path.join(output,label+'-dialogue.png')});
              await page.locator('#speechBubble').evaluate(e=>e.classList.add('hidden'));
            }

            // Exercise overflow using a long narration, not only its first line.
            await page.locator('#message').evaluate(e => {
              e.textContent = '長いお知らせも、ここで最後まで読めます。'.repeat(15);
              e.scrollTop = 0;
            });
            await page.locator('#message').focus();
            await page.keyboard.press('End');
            await page.waitForFunction(() => document.getElementById('message').scrollTop > 0);
            checkLayout(await measure(page),label+' long narration');

            // A browser toolbar changing height must reflow the real viewport.
            if (name === 'phone') {
              await page.setViewportSize({width,height:664});
              await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--app-height') === '664px');
              const resized = await measure(page);
              results.push({ label, phase:'toolbar-resize', ...resized });
              checkLayout(resized,label+' resized');
              await page.locator('#menuBtn').click();
              await page.locator('#themeBtn').click();
              const detail=await page.locator('#themeOverlay').boundingBox();
              assert.ok(detail && detail.y>=0 && detail.height>500 && detail.y+detail.height<=664,label+': detail is trapped in the central frame');
              await page.locator('#themeOverlay .theme-scroll').evaluate(e=>{e.scrollTop=e.scrollHeight;});
              assert.ok(await page.locator('#themeOverlay .theme-scroll').evaluate(e=>e.scrollTop>0),label+': design details cannot scroll');
              results.push({label,phase:'design-details',detail,scroll:await page.locator('#themeOverlay .theme-scroll').evaluate(e=>({top:e.scrollTop,height:e.clientHeight,total:e.scrollHeight}))});
              await page.screenshot({path:path.join(output,label+'-design-details.png')});
              await page.locator('#themeCloseBtn').click();
              await page.locator('#playBtn').click();
              await page.locator('#minigameOverlay').waitFor({state:'visible'});
              assert.equal(await page.locator('#message').isVisible(),false,label+': narration remains over the minigame');
              await page.locator('#mgQuitBtn').click();
              await page.locator('#mgQuitYesBtn').click();
              await page.locator('#screenNormal').waitFor({state:'visible'});
              assert.equal(await page.locator('#message').isVisible(),true,label+': narration did not return home');
            }
            if (name === 'farewell') {
              const farewell = await page.locator('#farewellBtn').boundingBox();
              assert.ok(farewell && farewell.y+farewell.height<=height+1,label+': farewell action is offscreen');
              await page.locator('#farewellBtn').click();
              await page.locator('#lifeCardOverlay').waitFor({state:'visible'});
              assert.equal(await page.locator('#message').isVisible(),false,label+': narration remains over the life record');
            }
            assert.deepEqual(errors, [], label+': browser runtime errors');
            console.log('PASS '+label);
          } catch (error) {
            failures.push(label+': '+error.message);
            console.error('FAIL '+label+': '+error.message);
            await page.screenshot({ path:path.join(output,label+'-failure.png') }).catch(() => {});
          } finally { await context.close(); }
        }
        try {
          await require('./care-attention-browser.cjs')(browser,engine,fixtures,'http://127.0.0.1:5191/',output);
        } catch(error) {
          failures.push(engine+' care attention: '+error.message);
          console.error('FAIL '+engine+' care attention: '+error.message);
        }
      } finally { await browser.close(); }
    }
  } finally {
    await server.close();
    fs.writeFileSync(path.join(output,'measurements.json'), JSON.stringify({ results, failures }, null, 2));
  }
  assert.equal(failures.length, 0, failures.join('\n'));
})().catch(error => { console.error(error); process.exitCode=1; });
