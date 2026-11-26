// ミニゲーム採点監査 Phase 3 を、本物の ページ(スマホ幅 390×844・タッチ/ポインタ)で たしかめる。
//  - 連打・押しっぱなし で 高得点に ならない(つみあげタワー・ダーツ・リズム・ハーフパイプ・かくとう)
//  - 上手な 操作は 高得点(ダーツ: おちついて はなす・ドミノ: すきまを うめる)
//  - ケーキ: ドラッグで 完成させると 76〜100点・60コイン(はやく まんなかに おくほど 100点)
//  - ドミノ: 何も おかずに「おす!」だけは 記録しない / ジェンガ: かたい ブロックの 表示
// 時計は Playwright の clock で 早送りする。配信する script.js の 絵の 置きかえ(canvas-illustrations)だけ はずす(P1・P2 と おなじ)。
// node tests/minigame-scoring-p3-browser.cjs [--engines chromium,webkit] [--shots DIR]
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
  window.p3QA = {
    start(id, random) {
      Object.assign(state, {isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, transformMeter: 0, transformOptions: null});
      state.lifetime.minigameDifficulty = 'normal';
      try { hideMinigameResultToast(); } catch (e) {} try { closeAllMenuOverlays(); } catch (e) {} try { closeIndividualityDialog(); } catch (e) {}
      const g = buildMinigamePool().find((x) => x.id === id); window.p3QA.scores = [];
      if (random) Math.random = random;
      startMinigame({id: g.id, start(c, done) { return g.start(c, (s, ...rest) => { window.p3QA.scores.push(s); done(s, ...rest); }); }});
    },
    count() { return state.minigameCount; },
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
  await page.waitForFunction(() => window.p3QA);
  return {ctx, page, errors};
}
const snap = (page) => page.evaluate(() => ({count: window.p3QA.count(), money: window.p3QA.money()}));
const ended = (page) => page.evaluate(() => window.p3QA.scores.length ? window.p3QA.scores[0] : null);
async function start(page, id, seed) { await page.evaluate(([id, src]) => window.p3QA.start(id, (0, eval)(src)), [id, lcgSrc(seed)]); await page.clock.runFor(700); }
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

async function stackMash(page) { const before = await snap(page); await start(page, 'stack-themed', 7); await page.clock.runFor(1500); await mash(page, '#stDrop', 150, 40); return result(page, before); }
async function darts(page, holdMs) {
  const before = await snap(page); await start(page, 'darts-board', 11);
  const c = await page.locator('#dtCanvas').boundingBox(), x = c.x + c.width / 2, y = c.y + c.height * 0.47;
  for (let k = 0; k < 6; k++) { await page.mouse.move(x, y); await page.mouse.down(); await page.clock.runFor(holdMs); await page.mouse.up(); await page.clock.runFor(1800); }
  return result(page, before);
}
async function rhythmMash(page) {
  const before = await snap(page); await start(page, 'rhythm-highway-3d', 5);
  await page.evaluate(() => { window.__mash = setInterval(() => { for (const id of ['#rhL', '#rhM', '#rhR']) { const b = document.querySelector(id); if (!b) continue; const r = b.getBoundingClientRect(); b.dispatchEvent(new PointerEvent('pointerdown', {pointerId: 22, bubbles: true, cancelable: true, clientX: r.left + 5, clientY: r.top + 5, pointerType: 'touch'})); } }, 150); });
  for (let i = 0; i < 40 && await ended(page) === null; i++) await page.clock.runFor(1000);
  await page.evaluate(() => clearInterval(window.__mash));
  return result(page, before);
}
async function halfpipeHold(page) {
  const before = await snap(page); await start(page, 'halfpipe-skate', 5);
  const p = await center(page, '#hpPump'); await page.mouse.move(p.x, p.y); await page.mouse.down();
  await page.evaluate(() => { window.__mash = setInterval(() => { const b = document.querySelector('#hpTrick'); if (!b) return; const r = b.getBoundingClientRect(); b.dispatchEvent(new PointerEvent('pointerdown', {pointerId: 23, bubbles: true, cancelable: true, clientX: r.left + 5, clientY: r.top + 5, pointerType: 'touch'})); }, 900); });
  for (let i = 0; i < 40 && await ended(page) === null; i++) await page.clock.runFor(1000);
  await page.evaluate(() => clearInterval(window.__mash)); await page.mouse.up();
  return result(page, before);
}
async function fightKick(page) { const before = await snap(page); await start(page, 'street-fight', 3); await mash(page, '#sfKick', 750, 40); return result(page, before); }
async function cake(page, slowMs) {
  const before = await snap(page); await start(page, 'dragDecorate-cake', 3);
  for (const key of ['strawberry', 'choco', 'cherry']) {
    const it = await center(page, `.mg-drag-item[data-key="${key}"]`), tg = await center(page, `.mg-drop-target[data-key="${key}"]`);
    await page.mouse.move(it.x, it.y); await page.mouse.down(); await page.mouse.move(tg.x, tg.y, {steps: 4}); await page.mouse.up();
    await page.clock.runFor(slowMs);
  }
  return result(page, before);
}
async function dominoPushOnly(page) {
  const before = await snap(page); await start(page, 'domino-run', 5);
  for (let k = 0; k < 2; k++) { await page.locator('#dmPush').tap(); await page.clock.runFor(2500); }
  return result(page, before);
}
async function jengaMiddle(page) {
  const before = await snap(page); await start(page, 'jenga-tower', 9);
  // まんなかの ブロックを 下の 段から じゅんに タップ(canvas の 座標は CSS の 大きさと おなじ。BASE_Y = 高さ − 30、段の 高さ 16)
  const c = await page.locator('#jgCanvas').boundingBox(), hints = new Set();
  for (let r = 0; r < 9; r++) { await page.touchscreen.tap(c.x + c.width / 2, c.y + (c.height - 30 - (r + 1) * 16 + 8)); await page.clock.runFor(1200); hints.add(await page.locator('#jgHint').textContent()); }
  return {...await result(page, before, 60), hints: [...hints]};
}

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const report = [];
  for (const engine of engines) {
    const browser = await playwright[engine].launch();
    const row = {engine};
    const {ctx, page, errors} = await openPage(browser, engine);
    const check = async (name, fn, ok) => { const r = await fn(); row[name] = r; assert.ok(ok(r), `${engine} ${name}: ${JSON.stringify(r)}`); await page.clock.runFor(4000); };
    await check('stackMash', () => stackMash(page), (r) => r.score < 30);
    // すぐ はなす 投げは 手の ふるえで 1回ごとに ばらつく(ブラウザ 8回で 35〜65点、まれに 80点台)ので 3回の 平均で 見る
    await check('dartsQuick', async () => { const rs = []; for (let k = 0; k < 3; k++) { rs.push(await darts(page, 0)); await page.clock.runFor(4000); } return {scores: rs.map((r) => r.score), recorded: rs.every((r) => r.recorded)}; }, (r) => r.recorded && r.scores.reduce((a, b) => a + b, 0) / r.scores.length < 70 && r.scores.every((x) => x < 90));
    await check('dartsSteady', () => darts(page, 800), (r) => r.recorded && r.score >= 90 && r.coins === 60);
    await check('rhythmMash', () => rhythmMash(page), (r) => r.score <= 15);
    await check('halfpipeHold', () => halfpipeHold(page), (r) => r.score <= 40);
    await check('fightKick', () => fightKick(page), (r) => r.score < 30);
    await check('cakeQuick', () => cake(page, 200), (r) => r.recorded && r.score >= 90 && r.score <= 100 && r.coins === 60);
    if (shots) { fs.mkdirSync(shots, {recursive: true}); await page.screenshot({path: path.join(shots, `${engine}-cake.png`)}); }
    await check('cakeSlow', () => cake(page, 4000), (r) => r.recorded && r.score >= 76 && r.score < 95 && r.coins === 60);
    await check('dominoPushOnly', () => dominoPushOnly(page), (r) => !r.recorded);
    await check('jengaMiddle', () => jengaMiddle(page), (r) => r.hints.some((h) => h.includes('かたい')));
    if (shots) await page.screenshot({path: path.join(shots, `${engine}-jenga.png`)});
    assert.deepEqual(errors, []);
    await ctx.close(); await browser.close();
    report.push(row); console.log(JSON.stringify(row));
  }
  server.close();
  if (shots) fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify(report, null, 1));
  console.log('ok: minigame scoring P3 browser checks passed on', engines.join(', '));
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
