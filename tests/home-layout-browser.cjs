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
      notice:n, noticeVisible:!!hit && (hit === notice || notice.contains(hit)),
      buttons:[...document.querySelectorAll('.buttons button')].map(e => ({ id:e.id, ...rect(e) })),
      headerItems:[...document.querySelectorAll('.header-button:not(.hidden),.ending-badge,.name-plate')].map(rect),
      stage:rect(document.getElementById('castStage')),
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
  assert.ok(m.noticeVisible, label + ': bottom of narration is clipped or covered');
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
        for (const [name, width, height, fixture] of [
          ['phone',390,786,'alone'],
          ['phone-tall',390,844,'world_sea_full'],
          ['small',320,568,'care_large'],
          ['small-640',320,640,'badges_transparent'],
          ['desktop',768,844,'badges_transparent'],
        ]) {
          const label = engine + '-' + name;
          const context = await browser.newContext({ viewport:{width,height}, deviceScaleFactor:1 });
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

            // The reported bug: scrolling central information must never drag
            // narration under the fixed care buttons or move the top controls.
            await page.locator('.screen-frame').evaluate(e => { e.scrollTop = e.scrollHeight; });
            const after = await measure(page);
            results.push({ label, phase:'scrolled', ...after });
            checkLayout(after,label+' scrolled');
            assert.ok(Math.abs(before.notice.y-after.notice.y)<1, label+': narration moves with central scroll');
            assert.ok(Math.abs(before.header.y-after.header.y)<1, label+': header moves with central scroll');
            assert.ok(Math.abs(before.buttons[0].y-after.buttons[0].y)<1, label+': controls move with central scroll');

            // A browser toolbar changing height must reflow the real viewport.
            if (name === 'phone') {
              await page.setViewportSize({width,height:664});
              await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--app-height') === '664px');
              const resized = await measure(page);
              results.push({ label, phase:'toolbar-resize', ...resized });
              checkLayout(resized,label+' resized');
            }
            assert.deepEqual(errors, [], label+': browser runtime errors');
            console.log('PASS '+label);
          } catch (error) {
            failures.push(label+': '+error.message);
            console.error('FAIL '+label+': '+error.message);
            await page.screenshot({ path:path.join(output,label+'-failure.png') }).catch(() => {});
          } finally { await context.close(); }
        }
      } finally { await browser.close(); }
    }
  } finally {
    await server.close();
    fs.writeFileSync(path.join(output,'measurements.json'), JSON.stringify({ results, failures }, null, 2));
  }
  assert.equal(failures.length, 0, failures.join('\n'));
})().catch(error => { console.error(error); process.exitCode=1; });
