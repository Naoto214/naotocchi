// ミニゲーム採点監査 Phase 2 を、本物の ページ(スマホ幅 390×844・タッチ)で たしかめる。
//  - 放置・スタートだけ は 30点未満で 記録しない(そうこばん・タワーディフェンス・ピンボール・スキージャンプ・ジェンガ)
//  - 考えて 動かした 0達成は 30点未満で 記録(コイン 0)/最初の 目標を 達成すれば 30点いじょう(そうこばん 1問)
//  - 上手な プレイは これまでどおり(タワーディフェンス 全ウェーブ撃破 100点・コイン 60)
// 時計は Playwright の clock で 早送りする。配信する script.js の 絵の 置きかえ(canvas-illustrations)だけ はずす(P1 と おなじ)。
// node tests/minigame-scoring-p2-browser.cjs [--engines chromium,webkit] [--shots DIR]
const assert = require('node:assert/strict');
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const playwright = require('playwright');
const engines = (process.argv.includes('--engines') ? process.argv[process.argv.indexOf('--engines') + 1] : 'chromium').split(',');
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const root = path.resolve(__dirname, '..');
const S = require('../tools/push-puzzle/solver.cjs');
const mime = {'.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.m4a': 'audio/mp4'};
const ILLUS = 'globalThis.NaotocchiCanvasIllustrations?.create({document,resolve:DISPLAY_CATALOG.resolve})';
const original = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
assert.ok(original.includes(ILLUS), 'canvas illustration hook');
assert.ok(original.includes('function ageDifficulty() {'), 'ageDifficulty hook');
// 大きい盤(上海 68まい)を 出すため、むずかしさだけ 上書きできる ように する(年齢は かえない = 寿命の 演出が 出ない)
const script = original.replace(ILLUS, 'null').replace('function ageDifficulty() {', 'function ageDifficulty() { if (window.__p1Diff != null) return window.__p1Diff;').replace(/\}\)\(\);\s*$/, `
  window.p1QA = {
    start(id, mode, random) {
      Object.assign(state, {isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, transformMeter: 0, transformOptions: null});
      state.lifetime.minigameDifficulty = mode || 'normal'; window.__p1Diff = mode === 'hard' ? 1 : null;
      // 前の 局の 結果カード・メニュー・できごとの 画面を とじてから はじめる(連続プレイで タップを ふさがない ため)
      try { hideMinigameResultToast(); } catch (e) {} try { closeAllMenuOverlays(); } catch (e) {} try { closeIndividualityDialog(); } catch (e) {}
      const g = buildMinigamePool().find((x) => x.id === id); window.p1QA.scores = [];
      if (random) Math.random = random;
      startMinigame({id: g.id, start(c, done) { return g.start(c, (s, ...rest) => { window.p1QA.scores.push(s); done(s, ...rest); }); }});
    },
    count() { return state.minigameCount; },
    money() { return state.lifetime.money; },
    level(id) { const c = document.querySelector(id); return c && c.dataset.level; },
    scores: [],
  };
})();`);
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/\/$/, '/index.html'));
  if (!file.startsWith(root + path.sep) || !fs.statSync(file, {throwIfNoEntry: false})?.isFile()) return res.writeHead(404).end();
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  if (file === path.join(root, 'script.js')) res.end(script); else fs.createReadStream(file).pipe(res);
});

// 牌・ピースの 描画を きろくする(canvas の id ごと)
const RECORDER = () => {
  window.__draw = {};
  const P = CanvasRenderingContext2D.prototype, ft = P.fillText, di = P.drawImage;
  P.fillText = function (...a) { const id = this.canvas && this.canvas.id; if (id) (window.__draw[id] = window.__draw[id] || []).push(['t', ...a.slice(0, 3)]); return ft.apply(this, a); };
  P.drawImage = function (...a) { const id = this.canvas && this.canvas.id; if (id && a.length === 9) (window.__draw[id] = window.__draw[id] || []).push(['i', ...a.slice(1)]); return di.apply(this, a); };
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
  await page.waitForFunction(() => window.p1QA);
  return {ctx, page, errors};
}
async function start(page, id, mode, random) {
  await page.evaluate(([id, mode, src]) => window.p1QA.start(id, mode, src ? (0, eval)(src) : null), [id, mode || null, random || null]);
  await page.clock.runFor(700);
}
// 1〜2フレーム すすめて、その あいだの 描画を かえす(おなじ フレームが 2回 かかれる ことが あるので 重複は のぞく)
async function frameDraws(page, id) {
  await page.evaluate((id) => { window.__draw[id] = []; }, id);
  await page.clock.runFor(34);
  const all = await page.evaluate((id) => window.__draw[id] || [], id), seen = new Set();
  return all.filter((d) => { const k = JSON.stringify(d); if (seen.has(k)) return false; seen.add(k); return true; });
}
const ended = (page) => page.evaluate(() => window.p1QA.scores.length ? window.p1QA.scores[0] : null);


async function result(page, before, maxSec = 400) {
  for (let i = 0; i < maxSec && await ended(page) === null; i++) await page.clock.runFor(1000);
  await page.clock.runFor(2500);
  const after = await page.evaluate(() => ({count: window.p1QA.count(), money: window.p1QA.money()}));
  return {score: await ended(page), recorded: after.count > before.count, coins: after.money - before.money};
}
const snap = (page) => page.evaluate(() => ({count: window.p1QA.count(), money: window.p1QA.money()}));
async function swipe(page, box, dx, dy) {
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx * 50, y + dy * 50, {steps: 3}); await page.mouse.up();
  await page.clock.runFor(150);
}
async function hold(page, sel, ms) { const b = await page.locator(sel).boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.clock.runFor(ms); await page.mouse.up(); }

// ---------- そうこばん ----------
let PZ_LEVELS = null;
async function pzSolution(page) {
  const tag = await page.evaluate(() => window.p1QA.level('#pzCanvas'));
  const lv = PZ_LEVELS.find((l) => l.id === tag.replace(/m$/, ''));
  const rows = tag.endsWith('m') ? lv.rows.map((x) => [...x].reverse().join('')) : lv.rows, goals = [];
  rows.forEach((row, y) => [...row].forEach((c, x) => { if (c === '.') goals.push([y, x]); }));
  return S.analyze(rows.map((x) => x.replace(/\./g, ' ')), goals).solution;
}
async function pushPuzzle(page, mode) {
  const before = await snap(page);
  await start(page, 'push-puzzle', null, lcgSrc(11));
  const box = await page.locator('#pzCanvas').boundingBox();
  if (mode === 'moves') for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) await swipe(page, box, dx, dy);
  if (mode === 'solve1') { for (const [dx, dy] of await pzSolution(page)) await swipe(page, box, dx, dy); }
  return result(page, before);
}

// ---------- タワーディフェンス ----------
async function towerDefense(page, mode) {
  const before = await snap(page);
  await start(page, 'tower-defense', null, lcgSrc(7919));
  const box = await page.locator('#tdCanvas').boundingBox(), cell = box.width / 8;
  if (mode === 'build') {
    for (let k = 0; k < 140 && await ended(page) === null; k++) {
      for (const [x, y] of [[2, 2], [4, 4], [4, 3], [2, 4]]) await page.touchscreen.tap(box.x + (x + 0.5) * cell, box.y + (y + 0.5) * cell);
      await page.locator('#tdNext').tap().catch(() => {});
      await page.clock.runFor(500);
    }
  }
  return result(page, before);
}

// ---------- ピンボール / スキージャンプ / ジェンガ / ヒット&ブロー ----------
async function pinball(page, mode) {
  const before = await snap(page);
  await start(page, 'pinball-physics', null, lcgSrc(7919));
  if (mode === 'flap') {
    // 左右の フィールドを 0.6びょうごとに 0.25びょう おす(両手で 連打する 人)。発射は 発射ボタンを 0.7びょう 長おし
    await page.evaluate(() => {
      const c = document.querySelector('#pbCanvas'), r = c.getBoundingClientRect();
      const ev = (type, id, fx) => c.dispatchEvent(new PointerEvent(type, {pointerId: id, bubbles: true, cancelable: true, clientX: r.left + r.width * fx, clientY: r.top + r.height * 0.8, pointerType: 'touch', isPrimary: id === 11}));
      window.__flap = setInterval(() => { ev('pointerdown', 11, 0.25); ev('pointerdown', 12, 0.75); setTimeout(() => { ev('pointerup', 11, 0.25); ev('pointerup', 12, 0.75); }, 250); }, 600);
    });
    for (let k = 0; k < 120 && await ended(page) === null; k++) {
      if (await page.locator('#pbLaunch').isEnabled().catch(() => false)) await hold(page, '#pbLaunch', 700);
      await page.clock.runFor(500);
    }
    await page.evaluate(() => clearInterval(window.__flap));
  }
  return result(page, before);
}
async function skiStartOnly(page) {
  const before = await snap(page);
  await start(page, 'ski-jump', null, lcgSrc(7919));
  for (let k = 0; k < 80 && await ended(page) === null; k++) {
    if ((await page.locator('#sjBtn').textContent()) === 'スタート') await page.locator('#sjBtn').tap().catch(() => {});
    await page.clock.runFor(500);
  }
  return result(page, before);
}
async function hitBlowOneGuess(page) {
  const before = await snap(page);
  await start(page, 'hit-blow', null, lcgSrc(7919));
  const colors = page.locator('#hbPalette button[data-color]');
  for (let i = 0; i < 4; i++) await colors.nth(i).tap();
  await page.locator('#hbSubmit').tap();
  return result(page, before);
}
async function idle(page, id) { const before = await snap(page); await start(page, id, null, lcgSrc(7919)); return result(page, before); }

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const report = [];
  { const {harness} = require('./helpers/runtime-harness.cjs'); const h = harness(); const g = h.api.games.find((x) => x.id === 'push-puzzle');
    PZ_LEVELS = Object.values(g.plans).flatMap((p) => p.levels.flatMap((st) => st.boards)); }
  for (const engine of engines) {
    const browser = await playwright[engine].launch();
    const row = {engine};
    const {ctx, page, errors} = await openPage(browser, engine);
    const check = (name, r, fn) => { row[name] = r; assert.ok(fn(r), `${engine} ${name}: ${JSON.stringify(r)}`); };
    check('pushIdle', await pushPuzzle(page, 'idle'), (r) => r.score === 12 && !r.recorded);
    await page.clock.runFor(4000);
    check('pushMoves', await pushPuzzle(page, 'moves'), (r) => r.score >= 12 && r.score < 30 && r.recorded && r.coins === 0);
    await page.clock.runFor(4000);
    check('pushSolve1', await pushPuzzle(page, 'solve1'), (r) => r.score >= 40 && r.recorded && r.coins === 30);
    await page.clock.runFor(4000);
    check('tdIdle', await towerDefense(page, 'idle'), (r) => r.score === 10 && !r.recorded);
    await page.clock.runFor(4000);
    check('tdBuild', await towerDefense(page, 'build'), (r) => r.score === 100 && r.recorded && r.coins === 60);
    if (shots) { fs.mkdirSync(shots, {recursive: true}); await page.screenshot({path: path.join(shots, `${engine}-td.png`)}); }
    await page.clock.runFor(4000);
    check('pinballIdle', await pinball(page, 'idle'), (r) => r.score === 24 && !r.recorded);
    await page.clock.runFor(4000);
    check('pinballFlap', await pinball(page, 'flap'), (r) => r.recorded && r.score > 24);
    await page.clock.runFor(4000);
    check('skiStartOnly', await skiStartOnly(page), (r) => r.score <= 25 && !r.recorded);
    await page.clock.runFor(4000);
    check('jengaIdle', await idle(page, 'jenga-tower'), (r) => r.score < 30 && !r.recorded);
    await page.clock.runFor(4000);
    check('hitBlowOneGuess', await hitBlowOneGuess(page), (r) => r.score <= 25 && r.recorded && r.coins === 0);
    if (shots) await page.screenshot({path: path.join(shots, `${engine}-hitblow.png`)});
    assert.deepEqual(errors, []);
    await ctx.close(); await browser.close();
    report.push(row); console.log(JSON.stringify(row));
  }
  server.close();
  if (shots) fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify(report, null, 1));
  console.log('ok: minigame scoring P2 browser checks passed on', engines.join(', '));
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
