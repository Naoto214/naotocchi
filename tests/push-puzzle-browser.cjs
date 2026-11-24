// そうこばん: 本物の ページ(Chromium・スマホ幅・タッチ)で、画面の 矢印ボタンを タップして 3案すべての 3問を とく。
// 入力の とりこぼし(すばやい 連続タップ)・おしっぱなしの 勝手な 連続移動・もどす/やりなおし も 確認する。
// B案は 各段階の すべての 盤面を(force で)とく。CI(.github/workflows/push-puzzle.yml)は Chromium と WebKit(iPhone の Safari と おなじ エンジン)。
// node tests/push-puzzle-browser.cjs [--engines chromium,webkit] [--shots DIR]
const assert = require('node:assert/strict');
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const playwright = require('playwright');
const engines = (process.argv.includes('--engines') ? process.argv[process.argv.indexOf('--engines') + 1] : 'chromium').split(',');
const S = require('../tools/push-puzzle/solver.cjs');
const root = path.resolve(__dirname, '..');
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const mime = {'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.m4a':'audio/mp4'};
const script = fs.readFileSync(path.join(root,'script.js'),'utf8').replace(/\}\)\(\);\s*$/, `
  window.pushQA = {
    start(plan, force){ const g = MINIGAMES.find((x) => x.id === 'push-puzzle'); g.plan = plan; g.force = force || null; window.pushQA.scores = []; startMinigame({id: g.id, start(c, done){ return g.start(c, (s, ...rest) => { window.pushQA.scores.push(s); done(s, ...rest); }); }}); },
    plans(){ return MINIGAMES.find((x) => x.id === 'push-puzzle').plans; },
    scores: []
  };
})();`);
const server = http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)||!fs.statSync(file,{throwIfNoEntry:false})?.isFile())return res.writeHead(404).end();
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  if(file===path.join(root,'script.js'))res.end(script);else fs.createReadStream(file).pipe(res);
});
const boardsOf = (plan) => plan.levels.flatMap((stage) => stage.boards);
function boardOf(lv, mirror) {
  const rows = mirror ? lv.rows.map((r) => [...r].reverse().join('')) : lv.rows, goals = [];
  rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '.') goals.push([y, x]); }));
  return {rows: rows.map((r) => r.replace(/\./g, ' ')), goals};
}
const KEY = {'1,0': 'right', '-1,0': 'left', '0,1': 'down', '0,-1': 'up'};
async function playRun(browser, engine, plan, force, results, first) {
  const page = await browser.newPage({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: engine !== 'firefox', deviceScaleFactor: 1});
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { window.AudioContext = undefined; window.webkitAudioContext = undefined; });
  await page.goto('http://127.0.0.1:' + server.address().port + '/?meguru3d=0');
  await page.waitForFunction(() => window.pushQA);
  await page.evaluate(([p, f]) => pushQA.start(p, f), [plan, force]);
  await page.waitForSelector('#pzCanvas');
  const plans = await page.evaluate(() => pushQA.plans());
  const key = (k) => page.locator(`#minigameOverlay .mg-pad-key[data-key="${k}"]`);
  const moves = () => page.locator('#pzMoves').textContent();
  if (first) {
    for (const k of ['up', 'down', 'left', 'right']) assert.ok(await key(k).isVisible(), `${plan}: ${k} arrow is on screen`);
    // 矢印・もどす・やりなおし が ゆびで おせる 大きさ(44px いじょう)
    for (const sel of ['.mg-pad-key[data-key="up"]', '#pzUndo', '#pzReset']) {
      const b = await page.locator('#minigameOverlay ' + sel).boundingBox();
      assert.ok(b && b.width >= 44 && b.height >= 44, `${sel} is at least 44px (${b && b.width}x${b && b.height})`);
    }
    const canvasBox = await page.locator('#pzCanvas').boundingBox(), padBox = await page.locator('#minigameOverlay .mg-pad').boundingBox();
    assert.ok(canvasBox.y + canvasBox.height <= padBox.y + 1, 'board is not covered by the pad');
    assert.ok(padBox.y + padBox.height <= 844, 'pad fits on a 390x844 screen');
  }
  for (let i = 0; i < 3; i++) {
    await page.waitForFunction((n) => document.querySelector('#pzLevel')?.textContent === `${n}/3問目`, i + 1);
    const tag = await page.locator('#pzCanvas').getAttribute('data-level');
    assert.equal(tag.replace(/m$/, ''), force[i], `${plan}: tier ${i + 1} shows the forced board`);
    const lv = boardsOf(plans[plan]).find((b) => b.id === force[i]);
    const {rows, goals} = boardOf(lv, tag.endsWith('m'));
    const sol = S.analyze(rows, goals).solution;
    if (shots && first && i === 0) await page.screenshot({path: path.join(shots, `${engine}-play-${tag}.png`)});
    if (first && i === 0) {
      // おしっぱなし 0.8秒 でも 1マスだけ(勝手に 連続で すすまない)
      const b = await key(KEY[sol[0].join()]).boundingBox();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(800); await page.mouse.up();
      assert.equal(await moves(), '手1', 'long press moves exactly one cell');
      await page.locator('#pzUndo').tap();
      assert.equal(await moves(), '手0', 'undo steps the count back');
      // 盤面の スワイプ(タッチの pointer イベント)でも 1マス。みじかい ふるえ(8px)では うごかない
      const cb = await page.locator('#pzCanvas').boundingBox(), cx = cb.x + cb.width / 2, cy = cb.y + cb.height / 2;
      const swipe = async (dx, dy) => {
        const base = {pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true};
        await page.locator('#pzCanvas').dispatchEvent('pointerdown', {...base, clientX: cx, clientY: cy});
        await page.locator('#pzCanvas').dispatchEvent('pointerup', {...base, clientX: cx + dx, clientY: cy + dy});
        await page.waitForTimeout(60);
      };
      await swipe(8 * sol[0][0], 8 * sol[0][1]);
      assert.equal(await moves(), '手0', 'a tiny wobble is not a swipe');
      await swipe(60 * sol[0][0], 60 * sol[0][1]);
      assert.equal(await moves(), '手1', 'one swipe on the board moves one cell');
      // やりなおし: はじめの 形に もどり、時間は もどらない
      await page.locator('#pzReset').tap();
      assert.equal(await moves(), '手0', 'reset returns to the start');
      assert.match(await page.locator('#pzHint').textContent(), /時間はそのまま/);
      // 制限時間: 段階ごとの 秒数で はじまり、へっていく
      const limits = plans[plan].levels.map((st) => st.timeMs / 1000);
      const shown = Number((await page.locator('#mgTimer').textContent()).match(/(\d+)秒/)[1]);
      assert.ok(shown <= limits[0] && shown >= limits[0] - 5, `timer starts near ${limits[0]}s (${shown})`);
    }
    if (first && i > 0) {
      // つぎの 問題では その 段階の 秒数に もどる(表示は 0.25秒ごとに 更新)
      await page.waitForTimeout(400);
      const lim = plans[plan].levels[i].timeMs / 1000, shown = Number((await page.locator('#mgTimer').textContent()).match(/(\d+)秒/)[1]);
      assert.ok(shown <= lim && shown >= lim - 3, `tier ${i + 1} timer restarts at ${lim}s (${shown})`);
    }
    // すばやい 連続タップ(アニメ 110ms より みじかい 間かく)でも とりこぼさない
    for (const d of sol) await key(KEY[d.join()]).tap({delay: 0});
    assert.equal(await moves(), '手' + sol.length, `${tag}: every tap counted`);
    results.push(`${engine} ${plan}${i + 1} ${tag} ${sol.length}手 OK`);
  }
  // 3問めの クリアから 結果(onComplete)まで 約2秒。page.waitForFunction は この ページでは とまる ことが あるので 自前で まつ
  for (let t = 0; t < 40 && !(await page.evaluate(() => pushQA.scores.length)); t++) await page.waitForTimeout(250);
  const score = await page.evaluate(() => pushQA.scores[0]);
  assert.ok(score >= 95, `${plan}: perfect play scores ${score}`);
  assert.deepEqual(errors, [], `${plan}: no page errors`);
  await page.close();
}
(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const results = [];
  try {
    for (const engine of engines) {
      const browser = await playwright[engine].launch();
      try {
        for (const plan of ['A', 'B', 'C']) {
          const fs0 = await (async () => { const p = await browser.newPage(); await p.goto('http://127.0.0.1:' + server.address().port + '/?meguru3d=0'); await p.waitForFunction(() => window.pushQA); const v = await p.evaluate((x) => pushQA.plans()[x].levels.map((s) => s.boards.map((b) => b.id)), plan); await p.close(); return v; })();
          const runs = Math.max(...fs0.map((ids) => ids.length));
          for (let k = 0; k < runs; k++) await playRun(browser, engine, plan, fs0.map((ids) => ids[k % ids.length]), results, k === 0);
        }
      } finally { await browser.close(); }
    }
    console.log(results.join('\n'));
    console.log('push-puzzle browser: OK');
  } finally { server.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
