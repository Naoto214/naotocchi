// ミニゲームの しっぱいに 育成ペナルティを つけない(2026-11-25 承認・C案)を、本物の ページ(スマホ幅 390×844・タッチ)で たしかめる。
//  - 本物の ゲームを 開始し、ゲームの 完了コールバック(onComplete)から 29点以下で 終える → おとろえ・いのち 変化なし、コイン 0、げんき −12
//  - 50点・80点 → そだち・おとろえ回復・コイン(30・60)は これまでどおり
//  - 「ホームにもどる → やめる」(途中終了)→ 記録しない、げんき −6、きげん +2
// node tests/minigame-failure-penalty-browser.cjs [--engines chromium,webkit]
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
      startMinigame({id: g.id, start(c, done) { window.p1QA.done = (s, ...rest) => { window.p1QA.scores.push(s); done(s, ...rest); }; return g.start(c, window.p1QA.done); }});
    },
    count() { return state.minigameCount; },
    snap() { return {decline: state.decline, deathMeter: state.deathMeter, energy: state.energy, happiness: state.happiness, money: state.lifetime.money, count: state.minigameCount, sodachi: state.sodachi, growth: state.growth}; },
    prep(extra) { Object.assign(state, {stage: 'growing', ageTicks: 600, isSleeping: false, isSick: false, energy: 100, hunger: 80, happiness: 50, health: 80, decline: 30, deathMeter: 40, transformMeter: 0, transformOptions: null, sodachi: 30, maxSodachi: Math.max(30, state.maxSodachi || 0), growth: 0}, extra || {}); },
    finishWith(score, play) { const d = window.p1QA.done; window.p1QA.done = null; d(score, null, play); },
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


const snap = (page) => page.evaluate(() => window.p1QA.snap());
async function playAndFinish(page, id, score) {
  await page.evaluate(() => window.p1QA.prep());
  const before = await snap(page);
  await start(page, id, null, lcgSrc(7));
  await page.clock.runFor(1500);
  await page.evaluate(([s]) => window.p1QA.finishWith(s, {acts: 9, cover: 1, spans: 5}), [score]);
  await page.clock.runFor(2500);
  return {before, after: await snap(page)};
}
(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const report = [];
  for (const engine of engines) {
    const browser = await playwright[engine].launch();
    const {ctx, page, errors} = await openPage(browser, engine);
    const row = {engine, fail: [], ok: []};
    // しっぱい: アクション・考える・対戦の 3種類の ゲームで
    for (const id of ['sushi-belt', 'push-puzzle', 'reversi-6']) {
      const {before, after} = await playAndFinish(page, id, 12);
      row.fail.push({id, decline: [before.decline, +after.decline.toFixed(2)], deathMeter: [before.deathMeter, +after.deathMeter.toFixed(2)], coins: after.money - before.money, energy: after.energy - before.energy, recorded: after.count - before.count});
      assert.equal(after.count, before.count + 1, `${engine} ${id}: 記録される`);
      // 本物の ページでは 時間が すすみ、お世話が できていれば いのちは しぜんに 少し もどる。
      // 以前の 仕様(いのち +2・おとろえ +8)なら かならず ふえるので、「ふえない」ことを たしかめる
      assert.ok(after.decline <= before.decline, `${engine} ${id}: おとろえが ふえない ${before.decline}→${after.decline}`);
      assert.ok(after.deathMeter <= before.deathMeter, `${engine} ${id}: いのちが ふえない ${before.deathMeter}→${after.deathMeter}`);
      assert.equal(after.money, before.money, `${engine} ${id}: コイン 0`);
      assert.ok(after.energy < before.energy, `${engine} ${id}: げんきは へる`);
      await page.clock.runFor(3000);
    }
    // 成功: これまでどおり
    for (const [score, coins, decline] of [[50, 30, -3], [80, 60, -8]]) {
      const {before, after} = await playAndFinish(page, 'sushi-belt', score);
      row.ok.push({score, coins: after.money - before.money, decline: after.decline - before.decline, deathMeter: after.deathMeter - before.deathMeter});
      assert.equal(after.money - before.money, coins, `${engine} ${score}: コイン`);
      assert.ok(after.decline - before.decline <= decline + 0.001, `${engine} ${score}: おとろえ回復 ${after.decline - before.decline}`);
      assert.ok(after.deathMeter <= before.deathMeter, `${engine} ${score}: いのちが ふえない`);
      assert.ok(after.sodachi * 100 + after.growth > before.sodachi * 100 + before.growth, `${engine} ${score}: そだちが ふえる`);
      await page.clock.runFor(3000);
    }
    // 途中終了: ホームにもどる → やめる
    await page.evaluate(() => window.p1QA.prep());
    const before = await snap(page);
    await start(page, 'sushi-belt', null, lcgSrc(9));
    await page.clock.runFor(1500);
    await page.locator('#mgQuitBtn').tap();
    await page.clock.runFor(300);
    await page.locator('#mgQuitYesBtn').tap();
    await page.clock.runFor(1500);
    const after = await snap(page);
    row.quit = {recorded: after.count - before.count, energy: +(after.energy - before.energy).toFixed(2), happiness: +(after.happiness - before.happiness).toFixed(2), decline: +(after.decline - before.decline).toFixed(2), deathMeter: +(after.deathMeter - before.deathMeter).toFixed(2)};
    assert.equal(row.quit.recorded, 0, `${engine} 途中終了は 記録しない`);
    assert.ok(row.quit.energy <= -6 && row.quit.energy > -7, `${engine} 途中終了の げんき ${row.quit.energy}`);
    assert.ok(row.quit.happiness >= 1 && row.quit.happiness <= 2, `${engine} 途中終了の きげん ${row.quit.happiness}`);
    assert.ok(row.quit.decline <= 0 && row.quit.deathMeter <= 0, `${engine} 途中終了で おとろえ・いのちが ふえない`);
    if (shots) { fs.mkdirSync(shots, {recursive: true}); await page.screenshot({path: path.join(shots, `${engine}-after-quit.png`)}); }
    assert.deepEqual(errors, []);
    await ctx.close(); await browser.close();
    report.push(row); console.log(JSON.stringify(row));
  }
  server.close();
  if (shots) fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify(report, null, 1));
  console.log('ok: minigame failure penalty (C) browser checks passed on', engines.join(', '));
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
