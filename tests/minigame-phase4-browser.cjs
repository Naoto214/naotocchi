// ミニゲーム Phase 4(2026-11-28)を、本物の ページ(スマホ幅 390×844・タッチ/ポインタ)で たしかめる。
//  - ハーフパイプ: くだりで ポンプボタンが 光る。光を 見てから 0.25びょう おくれて 押す 人でも 大成功(70点いじょう)・60コイン
//  - ボクセル: まっすぐ 下へ 掘る だけでは 100点に ならない 回が ある(まえは いつも 100)
//  - 制限時間の 表示: ヒット&ブロー 75びょう・ソリティア 150びょう・ふゆのカーリング 60びょう
// 時計は Playwright の clock で 早送りする。配信する script.js の 絵の 置きかえ(canvas-illustrations)だけ はずす(P1〜P3 と おなじ)。
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

// 光を 見てから lag ms おくれて ポンプを 押す(ページの 中で 50ms ごとに 見る)。エアの たびに 1回転
async function halfpipeCue(page, lag) {
  const before = await snap(page); await start(page, 'halfpipe-skate', 3);
  await page.evaluate((lag) => {
    const p = document.querySelector('#hpPump'), tr = document.querySelector('#hpTrick'), hint = document.querySelector('#hpHint');
    const ev = (el, t, id) => { const r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent(t, {pointerId: id, bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerType: 'touch', isPrimary: true})); };
    let litAt = null, held = false, lastH = '', t = 0; window.__lit = 0;
    window.__hp = setInterval(() => {
      t += 50; const lit = !!p.style.boxShadow; if (lit) window.__lit++;
      if (lit && litAt === null) litAt = t; if (!lit) litAt = null;
      if (lit && t - litAt >= lag && !held) { ev(p, 'pointerdown', 41); held = true; } else if (!lit && held) { ev(p, 'pointerup', 41); held = false; }
      const h = hint.textContent; if (h !== lastH && /エア/.test(h)) { ev(tr, 'pointerdown', 42); ev(tr, 'pointerup', 42); } lastH = h;
    }, 50);
  }, lag);
  for (let i = 0; i < 40 && await ended(page) === null; i++) await page.clock.runFor(1000);
  const lit = await page.evaluate(() => { clearInterval(window.__hp); return window.__lit; });
  return {...await result(page, before), lit};
}
async function voxelDown(page, seed) {
  const before = await snap(page); await start(page, 'voxel-mine', seed);
  await page.clock.runFor(800);
  await page.evaluate(() => { window.__vx = setInterval(() => { const c = document.querySelector('#vmCanvas'); if (!c) return; const r = c.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height * 0.3;
    const ev = (t, py) => c.dispatchEvent(new PointerEvent(t, {pointerId: 51, bubbles: true, cancelable: true, clientX: x, clientY: py, pointerType: 'touch', isPrimary: true})); ev('pointerdown', y); ev('pointermove', y + 40); ev('pointerup', y + 40); }, 400); });
  for (let i = 0; i < 40 && await ended(page) === null; i++) await page.clock.runFor(1000);
  await page.evaluate(() => clearInterval(window.__vx));
  return result(page, before);
}
// 制限時間の 表示は ゲームごとに 新しい ページで 見る(とちゅうで やめる 確認を はさまない)
async function timerText(browser, engine, id, sel) { const {ctx, page, errors} = await openPage(browser, engine); await start(page, id, 1); const t = await page.evaluate((sel) => (document.querySelector(sel) || {}).textContent || '', sel); await ctx.close(); assert.deepEqual(errors, []); return t; }

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const report = [];
  for (const engine of engines) {
    const browser = await playwright[engine].launch();
    const row = {engine};
    const {ctx, page, errors} = await openPage(browser, engine);
    const check = async (name, fn, ok) => { const r = await fn(); row[name] = r; assert.ok(ok(r), `${engine} ${name}: ${JSON.stringify(r)}`); await page.clock.runFor(4000); };
    await check('halfpipeCue250', () => halfpipeCue(page, 250), (r) => r.lit > 0 && r.recorded && r.score >= 70 && r.coins === 60);
    if (shots) { fs.mkdirSync(shots, {recursive: true}); await page.screenshot({path: path.join(shots, `${engine}-halfpipe.png`)}); }
    const vox = []; for (const seed of [1, 2, 3, 4]) vox.push(await voxelDown(page, seed)); row.voxelDown = vox.map((v) => v.score);
    await page.clock.runFor(4000);
    assert.ok(vox.every((v) => v.score >= 30) && vox.some((v) => v.score < 100), `${engine} voxel ${row.voxelDown}`);
    assert.deepEqual(errors, []);
    await ctx.close();
    for (const [name, id, sel, re] of [['hitBlowTimer', 'hit-blow', '#hbTimer', /75秒/], ['solitaireTimer', 'solitaire-klondike', '#soTimer', /150秒/], ['curlingWinterTimer', 'curling-winter', '#mgTimer', /60秒/]]) {
      row[name] = await timerText(browser, engine, id, sel); assert.match(row[name], re, `${engine} ${name}`);
    }
    await browser.close();
    report.push(row); console.log(JSON.stringify(row));
  }
  server.close();
  if (shots) fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify(report, null, 1));
  console.log('ok: minigame phase 4 browser checks passed on', engines.join(', '));
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
