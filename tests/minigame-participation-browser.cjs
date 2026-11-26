// 参加度(2026-11-26)を、本物の ページ(スマホ幅 390×844・タッチ/ポインタ)で たしかめる。
//  - スネーク: 1回 スワイプして すぐ 壁に ぶつかる 回は 記録しない(「すぐにおわった」の ことば・げんき −6・きげん +2)
//  - スネーク: まがりながら 時間いっぱい 遊べば 記録する(へんしんメーター +25)
//  - ライツアウト: 何回か 押して 考えれば(とけなくても)記録する
// 時計は Playwright の clock で 早送りする。配信する script.js の 絵の 置きかえ(canvas-illustrations)だけ はずす(P1・P2 と おなじ)。
// node tests/minigame-participation-browser.cjs [--engines chromium,webkit] [--shots DIR]
const assert = require('node:assert/strict');
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const playwright = require('playwright');
const engines = (process.argv.includes('--engines') ? process.argv[process.argv.indexOf('--engines') + 1] : 'chromium').split(',');
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const root = path.resolve(__dirname, '..');
const mime = {'.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.m4a': 'audio/mp4'};
const ILLUS = 'globalThis.NaotocchiCanvasIllustrations?.create({document,resolve:DISPLAY_CATALOG.resolve})';
const original = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
assert.ok(original.includes(ILLUS), 'canvas illustration hook');
const script = original.replace(ILLUS, 'null').replace(/\}\)\(\);\s*$/, `
  window.pQA = {
    start(id, random) {
      Object.assign(state, {isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, transformMeter: 0, transformOptions: null});
      state.lifetime.minigameDifficulty = 'normal';
      try { hideMinigameResultToast(); } catch (e) {} try { closeAllMenuOverlays(); } catch (e) {} try { closeIndividualityDialog(); } catch (e) {}
      const g = buildMinigamePool().find((x) => x.id === id); window.pQA.scores = [];
      if (random) Math.random = random;
      startMinigame({id: g.id, start(c, done) { return g.start(c, (s, ...rest) => { window.pQA.scores.push(s); done(s, ...rest); }); }});
    },
    count() { return state.minigameCount; },
    meter() { return state.transformMeter || 0; },
    msg() { return (document.getElementById('message') || {}).textContent || ''; },
    money() { return state.lifetime.money; },
    scores: [],
  };
})();`);
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/\/$/, '/index.html'));
  if (!file.startsWith(root + path.sep) || !fs.statSync(file, {throwIfNoEntry: false})?.isFile()) return res.writeHead(404).end();
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  if (file === path.join(root, 'script.js')) res.end(script); else fs.createReadStream(file).pipe(res);
});
// 描画の 記録(canvas の id ごと): translate と setLineDash(ドミノの すきまの 位置)
const RECORDER = () => {
  window.__draw = {};
  const P = CanvasRenderingContext2D.prototype, tr = P.translate, ld = P.setLineDash;
  const rec = (ctx, row) => { const id = ctx.canvas && ctx.canvas.id; if (id) (window.__draw[id] = window.__draw[id] || []).push(row); };
  P.translate = function (...a) { rec(this, ['tr', ...a]); return tr.apply(this, a); };
  P.setLineDash = function (a) { rec(this, ['ld', ...(a || [])]); return ld.call(this, a); };
  window.AudioContext = undefined; window.webkitAudioContext = undefined;
};
const lcgSrc = (seed) => `(()=>{let s=${seed};return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);})()`;

async function openPage(browser, engine) {
  const ctx = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: engine !== 'firefox', deviceScaleFactor: 1});
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.install();
  await page.addInitScript(RECORDER);
  await page.goto('http://127.0.0.1:' + server.address().port + '/?meguru3d=0');
  await page.clock.runFor(1500);
  await page.waitForFunction(() => window.pQA);
  return {ctx, page, errors};
}
const snap = (page) => page.evaluate(() => ({count: window.pQA.count(), money: window.pQA.money()}));
const ended = (page) => page.evaluate(() => window.pQA.scores.length ? window.pQA.scores[0] : null);
async function start(page, id, seed) { await page.evaluate(([id, src]) => window.pQA.start(id, (0, eval)(src)), [id, lcgSrc(seed)]); await page.clock.runFor(700); }
async function result(page, before, maxSec = 200) {
  for (let i = 0; i < maxSec && await ended(page) === null; i++) await page.clock.runFor(1000);
  await page.clock.runFor(2500);
  const after = await snap(page);
  return {score: await ended(page), recorded: after.count > before.count, coins: after.money - before.money};
}
// ページの 中で 一定間隔に ポインタを 送る(ボタンの 連打)
async function mash(page, sel, ms, until) {
  await page.evaluate(([sel, ms]) => { window.__mash = setInterval(() => { const b = document.querySelector(sel); if (!b) return; const r = b.getBoundingClientRect(); for (const t of ['pointerdown', 'pointerup']) b.dispatchEvent(new PointerEvent(t, {pointerId: 21, bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerType: 'touch', isPrimary: true})); }, ms); }, [sel, ms]);
  for (let i = 0; i < until && await ended(page) === null; i++) await page.clock.runFor(1000);
  await page.evaluate(() => clearInterval(window.__mash));
}
async function center(page, sel) { const b = await page.locator(sel).boundingBox(); return {x: b.x + b.width / 2, y: b.y + b.height / 2, b}; }

async function swipeOn(page, sel, dx, dy) { const b = await page.locator(sel).boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx * 60, y + dy * 60, {steps: 3}); await page.mouse.up(); }
async function snakeOnce(page) {
  const before = await snap(page); await start(page, 'snake-classic', 3);
  await page.clock.runFor(1200); await swipeOn(page, '#snCanvas', 0, -1);
  const r = await result(page, before); return {...r, msg: await page.evaluate(() => window.pQA.msg())};
}
async function snakeLoop(page) {
  const before = await snap(page); await start(page, 'snake-classic', 3);
  await page.clock.runFor(1300);
  for (let k = 0; k < 60 && await ended(page) === null; k++) { const d = [[0, 1], [-1, 0], [0, -1], [1, 0]][k % 4]; await swipeOn(page, '#snCanvas', d[0], d[1]); await page.clock.runFor(800); }
  const r = await result(page, before); return {...r, meter: await page.evaluate(() => window.pQA.meter())};
}
async function lightsTaps(page) {
  const before = await snap(page); await start(page, 'lights-out', 5);
  const c = await page.locator('#loCanvas').boundingBox();
  for (let k = 0; k < 6; k++) { await page.touchscreen.tap(c.x + c.width * (0.25 + 0.1 * k), c.y + c.height * 0.5); await page.clock.runFor(4000); }
  return result(page, before);
}

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const report = [];
  for (const engine of engines) {
    const browser = await playwright[engine].launch();
    const row = {engine};
    const {ctx, page, errors} = await openPage(browser, engine);
    const check = async (name, fn, ok) => { const r = await fn(); row[name] = r; assert.ok(ok(r), `${engine} ${name}: ${JSON.stringify(r)}`); await page.clock.runFor(4000); };
    await check('snakeOnce', () => snakeOnce(page), (r) => !r.recorded && r.coins === 0 && /すぐにおわったので/.test(r.msg));
    await check('snakeLoop', () => snakeLoop(page), (r) => r.recorded && r.meter === 25);
    if (shots) { fs.mkdirSync(shots, {recursive: true}); await page.screenshot({path: path.join(shots, `${engine}-snake.png`)}); }
    await check('lightsTaps', () => lightsTaps(page), (r) => r.recorded);
    assert.deepEqual(errors, []);
    await ctx.close(); await browser.close();
    report.push(row); console.log(JSON.stringify(row));
  }
  server.close();
  if (shots) fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify(report, null, 1));
  console.log('ok: minigame participation browser checks passed on', engines.join(', '));
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
