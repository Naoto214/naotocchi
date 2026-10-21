// A slow World3D frame can delay CSS transition creation beyond a wall-clock sleep.
// Run independently: node tests/meguru-discovery-transition-browser.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { measureAfterHintTransition } = require('./meguru-discovery-browser.cjs');
(async () => {
  const browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {}) });
  try {
    const page = await browser.newPage();
    const css = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');
    await page.setContent('<style>' + css + '</style><section class="minigame-overlay"><div id="mgrHint" class="mgr-hint">操作説明</div></section>');
    const initial = await measureAfterHintTransition(page);
    assert.equal(initial.hintQuiet, false, 'an unchanged hint without a transition is valid');
    assert.equal(initial.hintOpacity, 1);
    // Initially there is no animation: readiness must not return before the
    // queued render-frame class mutation has had its rendering opportunity.
    await page.evaluate(() => requestAnimationFrame(() => requestAnimationFrame(() => {
      document.getElementById('mgrHint').classList.add('mgr-hint-quiet');
      // Controlled scheduling delay, not a longer readiness wait or app mutation.
      const start = performance.now();
      while (performance.now() - start < 400) { /* simulate main-thread render work */ }
    })));
    const result = await measureAfterHintTransition(page);
    assert.equal(result.hintQuiet, true);
    assert.ok(result.hintOpacity < 0.6, 'quiet CSS transition is settled before measuring: ' + result.hintOpacity);
    assert.equal(await page.evaluate(() => document.getElementById('mgrHint').getAnimations().some(a => a.pending || a.playState === 'running')), false);
    console.log('PASS delayed-frame hint transition: opacity ' + result.hintOpacity);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
