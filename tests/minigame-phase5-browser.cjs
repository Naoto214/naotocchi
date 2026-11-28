// ミニゲーム Phase 5(2026-11-28)を、本物の ページ(スマホ幅・タッチ/ポインタ)で たしかめる。Chromium と WebKit。
//  - ハーフパイプ: 光を 見てから 0.4びょうで 押し、消えてから 0.4びょうで はなす 人(反応が ゆっくり)でも 大成功
//  - ダーツ: 30びょう さわらないと やさしく おわり、記録しない(途中で やめた ときと おなじ)
//  - ジェンガ: 画面幅 320・375・390・430 で ブロックの 大きさが 画面に あわせて 大きく なり、ブロックの まんなかを タップすると ぬける
//  - ソリティア: 画面に あきが あれば キャンバスが 高く なる(長い 列の 下の カードが はみ出さない)
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

// スワイプは ページの 中で PointerEvent を おくる(WebKit の モバイル表示では マウス操作が pointer に ならない ことが ある)
async function swipeOn(page, sel, dx, dy) {
  await page.evaluate(([sel, dx, dy]) => {
    const c = document.querySelector(sel); const r = c.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const ev = (t, px, py) => c.dispatchEvent(new PointerEvent(t, {pointerId: 31, bubbles: true, cancelable: true, clientX: px, clientY: py, pointerType: 'touch', isPrimary: true}));
    ev('pointerdown', x, y); ev('pointermove', x + dx * 30, y + dy * 30); ev('pointermove', x + dx * 60, y + dy * 60); ev('pointerup', x + dx * 60, y + dy * 60);
  }, [sel, dx, dy]);
}


async function halfpipeSlow(page, lag) {
  const before = await snap(page); await start(page, 'halfpipe-skate', 3);
  await page.evaluate((lag) => {
    const p = document.querySelector('#hpPump'), tr = document.querySelector('#hpTrick'), hint = document.querySelector('#hpHint');
    const ev = (el, t, id) => { const r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent(t, {pointerId: id, bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerType: 'touch', isPrimary: true})); };
    let litAt = null, unlitAt = null, held = false, lastH = '', t = 0;
    window.__hp = setInterval(() => {
      t += 50; const lit = !!p.style.boxShadow;
      if (lit && litAt === null) litAt = t; if (!lit && litAt !== null) { litAt = null; unlitAt = t; }
      if (litAt !== null && !held && t - litAt >= lag) { ev(p, 'pointerdown', 41); held = true; }
      if (litAt === null && held && unlitAt !== null && t - unlitAt >= lag) { ev(p, 'pointerup', 41); held = false; }
      const h = hint.textContent; if (h !== lastH && /エア/.test(h)) { ev(tr, 'pointerdown', 42); ev(tr, 'pointerup', 42); } lastH = h;
    }, 50);
  }, lag);
  for (let i = 0; i < 40 && await ended(page) === null; i++) await page.clock.runFor(1000);
  await page.evaluate(() => clearInterval(window.__hp));
  return result(page, before);
}
async function dartsIdle(page) {
  const before = await snap(page); await start(page, 'darts-board', 2);
  await page.clock.runFor(12000); const hint = await page.evaluate(() => document.querySelector('#dtHint') ? document.querySelector('#dtHint').textContent : '');
  const r = await result(page, before, 40); return {...r, hint, msg: await page.evaluate(() => window.pQA.msg())};
}
// ジェンガ: キャンバスの 大きさから ブロックの 大きさを 計算し(games.js と おなじ 式)、1段目の まんなかの ブロックを タップする
async function jengaTap(browser, engine, width) {
  const ctx = await browser.newContext({viewport: {width, height: width < 360 ? 640 : 844}, hasTouch: true, isMobile: true, deviceScaleFactor: 1});
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.install(); await page.addInitScript(RECORDER);
  await page.goto('http://127.0.0.1:' + server.address().port + '/?meguru3d=0'); await page.clock.runFor(1500); await page.waitForFunction(() => window.pQA);
  await start(page, 'jenga-tower', 1);
  const box = await page.locator('#jgCanvas').boundingBox();
  const W = box.width, H = box.height, BASE_Y = H - 30, BH = Math.max(16, Math.min(24, Math.floor((BASE_Y - 34) / 17))), BW = Math.round(BH * 2.125);
  // 2段目の まんなか(ぬける ことが 多い)→ ぬけなければ 3段目
  let pulled = 0;
  for (const row of [1, 2, 3]) {
    await page.touchscreen.tap(box.x + W / 2, box.y + BASE_Y - (row + 1) * BH + BH / 2); await page.clock.runFor(1500);
    pulled = Number(((await page.locator('#jgPulled').textContent()) || '').match(/\d+/)?.[0] || 0); if (pulled) break;
  }
  await ctx.close(); assert.deepEqual(errors, []);
  return {W: Math.round(W), BH, BW, pulled};
}
async function solitaireHeight(browser, engine, width) {
  const ctx = await browser.newContext({viewport: {width, height: width < 360 ? 640 : 844}, hasTouch: true, isMobile: true, deviceScaleFactor: 1});
  const page = await ctx.newPage(); await page.clock.install(); await page.addInitScript(RECORDER);
  await page.goto('http://127.0.0.1:' + server.address().port + '/?meguru3d=0'); await page.clock.runFor(1500); await page.waitForFunction(() => window.pQA);
  await start(page, 'solitaire-klondike', 1);
  const box = await page.locator('#soCanvas').boundingBox(); await ctx.close();
  // いちばん 長い 列(うら6まい+おもて13まい)の いちばん 下の カードが キャンバスに おさまるか(games.js と おなじ 計算)
  const W = box.width, H = box.height, CW = Math.floor((W - 4 * 8) / 7), CH = Math.round(CW * 1.4), TAB_Y = 6 + CH + 10;
  const fan = Math.max(9, Math.min(15, Math.floor((H - 4 - TAB_Y - CH - 6 * 6) / 12)));
  return {W: Math.round(W), H: Math.round(H), fan, bottom: Math.round(TAB_Y + 6 * 6 + 12 * fan + CH)};
}

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const report = [];
  for (const engine of engines) {
    const browser = await playwright[engine].launch();
    const row = {engine};
    const {ctx, page, errors} = await openPage(browser, engine);
    const check = async (name, fn, ok) => { const r = await fn(); row[name] = r; assert.ok(ok(r), `${engine} ${name}: ${JSON.stringify(r)}`); await page.clock.runFor(4000); };
    await check('halfpipeSlow400', () => halfpipeSlow(page, 400), (r) => r.recorded && r.score >= 70 && r.coins === 60);
    if (shots) { fs.mkdirSync(shots, {recursive: true}); await page.screenshot({path: path.join(shots, `${engine}-halfpipe.png`)}); }
    await check('dartsIdle', () => dartsIdle(page), (r) => !r.recorded && r.coins === 0 && /さわって あそぼう/.test(r.hint));
    assert.deepEqual(errors, []);
    await ctx.close();
    row.jenga = []; for (const w of [320, 375, 390, 430]) { const j = await jengaTap(browser, engine, w); row.jenga.push(j); assert.ok(j.BH >= 16 && j.pulled >= 1, `${engine} jenga ${w}: ${JSON.stringify(j)}`); }
    row.solitaireH = []; for (const w of [320, 375, 390, 430]) row.solitaireH.push(await solitaireHeight(browser, engine, w));
    assert.ok(row.solitaireH.every((h) => h.bottom <= h.H), `${engine} solitaire ${JSON.stringify(row.solitaireH)}`);
    await browser.close();
    report.push(row); console.log(JSON.stringify(row));
  }
  server.close();
  if (shots) fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify(report, null, 1));
  console.log('ok: minigame phase 5 browser checks passed on', engines.join(', '));
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
