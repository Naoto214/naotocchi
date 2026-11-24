// そうこばん: 本物の ページ(Chromium・スマホ幅・タッチ)で、画面の 矢印ボタンを タップして 3案すべての 3問を とく。
// 入力の とりこぼし(すばやい 連続タップ)・おしっぱなしの 勝手な 連続移動・もどす/やりなおし も 確認する。
// node tests/push-puzzle-browser.cjs [--shots DIR]
const assert = require('node:assert/strict');
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const { chromium } = require('playwright');
const S = require('../tools/push-puzzle/solver.cjs');
const root = path.resolve(__dirname, '..');
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const mime = {'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.m4a':'audio/mp4'};
const script = fs.readFileSync(path.join(root,'script.js'),'utf8').replace(/\}\)\(\);\s*$/, `
  window.pushQA = {
    start(plan){ const g = MINIGAMES.find((x) => x.id === 'push-puzzle'); g.plan = plan; window.pushQA.scores = []; startMinigame({id: g.id, start(c, done){ return g.start(c, (s, ...rest) => { window.pushQA.scores.push(s); done(s, ...rest); }); }}); },
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
function boardOf(lv, mirror) {
  const rows = mirror ? lv.rows.map((r) => [...r].reverse().join('')) : lv.rows, goals = [];
  rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '.') goals.push([y, x]); }));
  return {rows: rows.map((r) => r.replace(/\./g, ' ')), goals};
}
const KEY = {'1,0': 'right', '-1,0': 'left', '0,1': 'down', '0,-1': 'up'};
(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const plan of ['A', 'B', 'C']) {
      const page = await browser.newPage({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true, deviceScaleFactor: 1});
      const errors = []; page.on('pageerror', (e) => errors.push(e.message));
      await page.addInitScript(() => { window.AudioContext = undefined; window.webkitAudioContext = undefined; });
      await page.goto('http://127.0.0.1:' + server.address().port + '/?meguru3d=0');
      await page.waitForFunction(() => window.pushQA);
      await page.evaluate((p) => pushQA.start(p), plan);
      await page.waitForSelector('#pzCanvas');
      const plans = await page.evaluate(() => pushQA.plans());
      const key = (k) => page.locator(`#minigameOverlay .mg-pad-key[data-key="${k}"]`);
      for (const k of ['up', 'down', 'left', 'right']) assert.ok(await key(k).isVisible(), `${plan}: ${k} arrow is on screen`);
      // 矢印・もどす・やりなおし が ゆびで おせる 大きさ(44px いじょう)
      for (const sel of ['.mg-pad-key[data-key="up"]', '#pzUndo', '#pzReset']) {
        const b = await page.locator('#minigameOverlay ' + sel).boundingBox();
        assert.ok(b && b.width >= 44 && b.height >= 44, `${sel} is at least 44px (${b && b.width}x${b && b.height})`);
      }
      const canvasBox = await page.locator('#pzCanvas').boundingBox();
      const padBox = await page.locator('#minigameOverlay .mg-pad').boundingBox();
      assert.ok(canvasBox.y + canvasBox.height <= padBox.y + 1, 'board is not covered by the pad');
      assert.ok(padBox.y + padBox.height <= 844, 'pad fits on a 390x844 screen');
      const moves = () => page.locator('#pzMoves').textContent();
      for (let i = 0; i < 3; i++) {
        await page.waitForFunction((n) => document.querySelector('#pzLevel')?.textContent === `${n}/3問目`, i + 1);
        const tag = await page.locator('#pzCanvas').getAttribute('data-level');
        const lv = plans[plan].levels[i]; assert.equal(tag.replace(/m$/, ''), lv.id);
        const {rows, goals} = boardOf(lv, tag.endsWith('m'));
        const sol = S.analyze(rows, goals).solution;
        if (shots && i === 0) await page.screenshot({path: path.join(shots, `play-${plan}${i + 1}.png`)});
        if (i === 0) {
          // おしっぱなし 0.8秒 でも 1マスだけ(勝手に 連続で すすまない)
          const free = sol[0], back = [-free[0], -free[1]];
          const b = await key(KEY[free.join()]).boundingBox();
          await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(800); await page.mouse.up();
          assert.equal(await moves(), '手1', 'long press moves exactly one cell');
          await page.locator('#pzUndo').tap();
          assert.equal(await moves(), '手0', 'undo steps the count back');
          void back;
        }
        // すばやい 連続タップ(アニメ 110ms より みじかい 間かく)でも とりこぼさない
        for (const d of sol) await key(KEY[d.join()]).tap({delay: 0});
        assert.equal(await moves(), '手' + sol.length, `${tag}: every tap counted`);
        if (shots && i === 2) await page.screenshot({path: path.join(shots, `clear-${plan}${i + 1}.png`)});
        results.push(`${plan}${i + 1} ${tag} ${sol.length}手 OK`);
      }
      await page.waitForFunction(() => pushQA.scores.length === 1, null, {timeout: 10000});
      const score = await page.evaluate(() => pushQA.scores[0]);
      assert.ok(score >= 95, `${plan}: perfect play scores ${score}`);
      assert.deepEqual(errors, [], `${plan}: no page errors`);
      results.push(`${plan}: 3問クリア score ${score}`);
      await page.close();
    }
    console.log(results.join('\n'));
    console.log('push-puzzle browser: OK');
  } finally { await browser.close(); server.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
