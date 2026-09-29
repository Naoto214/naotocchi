// RH-10 戻る(Roadmap §8.4)。本物の index.html を Chromium と WebKit で ひらき、page.goBack() で 層ごとに たしかめる。
// パネル → とじる / めぐるの 地図 → 地図だけ / めぐる → 出る / ミニゲーム → やめるかの 確認(おわらない)/ home → ページを はなれる
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const vm = require('node:vm');
const { chromium, webkit } = require('playwright');

const root = path.resolve(__dirname, '..');
let qaHtml;
require('./visual-qa.cjs')().configureServer({ middlewares: { use(_path, handler) { handler({}, { setHeader() {}, end(html) { qaHtml = html; } }); } } });
const qaScript = qaHtml.match(/<script>([\s\S]*?)<\/script>/)[1];
const fixtures = vm.runInNewContext(qaScript.slice(0, qaScript.indexOf('const mount=')) + '\nfixtures');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  if (pathname === '/away.html') { res.writeHead(200, { 'Content-Type': TYPES['.html'] }); res.end('<!doctype html><title>away</title>'); return; }
  const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(target, (error, body) => {
    if (error) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(target)] || 'application/octet-stream' });
    res.end(body);
  });
});
const BASE = 'http://127.0.0.1:5198/';
const shown = (page, id) => page.evaluate((i) => { const e = document.getElementById(i); return !!e && !e.classList.contains('hidden'); }, id);

(async () => {
  await new Promise((resolve, reject) => server.listen(5198, '127.0.0.1', (e) => (e ? reject(e) : resolve())));
  const failures = [];
  try {
    for (const [engine, type] of Object.entries({ chromium, webkit })) {
      let browser;
      try { browser = await type.launch(engine === 'chromium' && process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}); } catch (e) { if (engine === 'webkit' && process.env.CI !== 'true') { console.log(`skip ${engine}: ${e.message.split('\n')[0]}`); continue; } throw e; }
      try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
        const save = JSON.parse(JSON.stringify(fixtures.world_forest));
        Object.assign(save, { health: 100, energy: 100, hunger: 85, happiness: 90, isSick: false, isSleeping: false, gamePassReadyAt: 0 });
        await context.addInitScript((s) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('naotocchi-save-v1', JSON.stringify(s)); } }, save);
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(BASE + 'away.html');
        await page.goto(BASE);
        await page.locator('.device.ui-home-active').waitFor();
        // 1) パネル
        await page.locator('#menuBtn').click();
        assert.equal(await shown(page, 'menuOverlay'), true, `${engine}: menu opened`);
        await page.goBack(); await page.waitForTimeout(300);
        assert.equal(await shown(page, 'menuOverlay'), false, `${engine}: back closed the panel`);
        assert.equal(new URL(page.url()).pathname, '/', `${engine}: still on the app`);
        // 2) めぐるの 地図 → 地図だけ、3) めぐる → 出る
        await page.locator('#travelBtn').click();
        await page.locator('#meguruEnterBtn').waitFor({ state: 'visible' });
        await page.locator('#meguruEnterBtn').click();
        await page.locator('#mgrCanvas').waitFor({ state: 'visible' });
        await page.locator('#mgrMap').click();
        await page.locator('.mgr-map').waitFor({ state: 'visible' });
        await page.goBack(); await page.waitForTimeout(300);
        assert.equal(await page.locator('.mgr-map').count(), 0, `${engine}: back closed only the map`);
        assert.equal(await page.locator('#mgrCanvas').isVisible(), true, `${engine}: still in めぐる`);
        await page.goBack(); await page.waitForTimeout(500);
        assert.equal(await shown(page, 'meguruOverlay'), false, `${engine}: back left めぐる`);
        assert.equal(new URL(page.url()).pathname, '/', `${engine}: still on the app`);
        // 4) ミニゲーム → やめるかの 確認(おわらない)
        await page.locator('#playBtn').click();
        await page.locator('#minigameOverlay').waitFor({ state: 'visible' });
        await page.goBack(); await page.waitForTimeout(300);
        assert.equal(await shown(page, 'minigameOverlay'), true, `${engine}: the game keeps running`);
        assert.equal(await shown(page, 'mgQuitConfirm'), true, `${engine}: the quit confirmation is shown`);
        await page.locator('#mgQuitYesBtn').click();
        await page.waitForFunction(() => document.getElementById('minigameOverlay').classList.contains('hidden'));
        await page.waitForTimeout(300);
        // 5) home → ページを はなれる
        await page.goBack(); await page.waitForURL(/away\.html$/, { timeout: 5000 });
        assert.deepEqual(errors, [], `${engine}: no page errors`);
        await context.close();
        console.log(`PASS back navigation ${engine}`);
      } catch (e) {
        failures.push(`${engine}: ${e.message}`);
      } finally { await browser.close(); }
    }
  } finally { server.close(); }
  if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
})();
