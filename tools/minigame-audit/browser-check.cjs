// ミニゲーム採点監査(2026-11-24): 自動プレイ(ハーネス)で 見つかった 採点の 穴を、本物の ページ
// (Chromium・390×844・タッチ)で たしかめる。時計は Playwright の clock で 早送りする(本当の 時間は かからない)。
// 本番コードは 変更しない(配信する script.js の 末尾に 確認用の 窓口 auditQA を つけたす だけ)。
// node tools/minigame-audit/browser-check.cjs [--shots DIR]
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const playwright = require('playwright');
const root = path.resolve(__dirname, '..', '..');
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const mime = {'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.m4a':'audio/mp4'};
const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8').replace(/\}\)\(\);\s*$/, `
  window.auditQA = {
    start(id){ const g = buildMinigamePool().find((x) => x.id === id); Object.assign(state, {isSleeping:false, isSick:false, energy:100, health:100, hunger:80}); window.auditQA.raw = null;
      startMinigame({id: g.id, start(c, done){ return g.start(c, (s, ...rest) => { window.auditQA.raw = s; done(s, ...rest); }); }}); },
    snap(){ return {count: state.minigameCount, sum: state.minigameScoreSum, money: state.lifetime.money, message: document.querySelector('#message')?.textContent || ''}; },
    raw: null,
  };
})();`);
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/\/$/, '/index.html'));
  if (!file.startsWith(root + path.sep) || !fs.statSync(file, {throwIfNoEntry: false})?.isFile()) return res.writeHead(404).end();
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  if (file === path.join(root, 'script.js')) res.end(script); else fs.createReadStream(file).pipe(res);
});

// 各ケース: どの ゲームを、どんな 指の 操作で、どれだけ 時間を すすめるか。expect は 監査で 指摘した 内容
const CASES = [
  {id: 'push-puzzle', what: '右と左を1回ずつタップして放置(0問クリア)', expect: '30点で記録される',
    run: async (p, tap) => { await p.clock.runFor(1500); await tap('#minigameOverlay .mg-pad-key[data-key="right"]'); await p.clock.runFor(2500); await tap('#minigameOverlay .mg-pad-key[data-key="left"]'); for (let i = 0; i < 80 && await done(p) === null; i++) await p.clock.runFor(5000); }},
  {id: 'tilt-maze-3d', what: '3秒ごとに右/下を短く押すだけ(ゴールしない)', expect: '失敗なのに30点以上で記録される',
    run: async (p, tap, hold) => { await p.clock.runFor(1500); for (let i = 0; i < 40 && await done(p) === null; i++) { await hold(i % 2 ? '#minigameOverlay .mg-pad-key[data-key="down"]' : '#minigameOverlay .mg-pad-key[data-key="right"]', 200); await p.clock.runFor(3000); } for (let i = 0; i < 40 && await done(p) === null; i++) await p.clock.runFor(3000); }},
  {id: 'stack-themed', what: '「おとす」を0.15秒ごとに連打', expect: '高得点(100点近く)',
    run: async (p, tap) => { await p.clock.runFor(1500); for (let i = 0; i < 400 && await done(p) === null; i++) { await tap('#stDrop'); await p.clock.runFor(150); } }},
  {id: 'falling-block-puzzle', what: '「いっきに」を連打して即終了(0ライン)', expect: '35点前後で記録される',
    run: async (p, tap) => { await p.clock.runFor(1500); for (let i = 0; i < 200 && await done(p) === null; i++) { await tap('#fbDrop'); await p.clock.runFor(200); } }},
  {id: 'asteroids-classic', what: '画面中央を0.3秒ごとにタップ(回転・移動なし)', expect: '高得点が出やすい',
    run: async (p, tap, hold, tapCanvas) => { await p.clock.runFor(1500); for (let i = 0; i < 200 && await done(p) === null; i++) { await tapCanvas(); await p.clock.runFor(300); } }},
  {id: 'rhythm-highway-3d', what: '3レーンのボタンを同時に0.1秒ごとに連打', expect: '空振りに罰がなく70点以上',
    run: async (p, tap) => { await p.clock.runFor(1500); const btns = await p.locator('#minigameOverlay button[data-key]').all(); for (let i = 0; i < 600 && await done(p) === null; i++) { for (const b of btns) { const bb = await b.boundingBox(); if (bb && bb.width) await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); } await p.clock.runFor(100); } }},
];
async function done(p) { return p.evaluate(() => window.auditQA.raw); }

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await playwright.chromium.launch();
  const out = [];
  for (const c of CASES) {
    const ctx = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true, deviceScaleFactor: 1});
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.clock.install();
    await page.addInitScript(() => { window.AudioContext = undefined; window.webkitAudioContext = undefined; });
    await page.goto('http://127.0.0.1:' + server.address().port + '/?meguru3d=0');
    await page.clock.runFor(2000);
    await page.waitForFunction(() => window.auditQA);
    const before = await page.evaluate(() => window.auditQA.snap());
    await page.evaluate((id) => window.auditQA.start(id), c.id);
    await page.clock.runFor(500);
    const tap = async (sel) => { const b = await page.locator(sel).first().boundingBox(); if (b) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
    const hold = async (sel, ms) => { const b = await page.locator(sel).first().boundingBox(); if (!b) return; const x = b.x + b.width / 2, y = b.y + b.height / 2;
      await page.dispatchEvent(sel, 'pointerdown', {pointerId: 1, pointerType: 'touch', clientX: x, clientY: y, isPrimary: true, button: 0}); await page.clock.runFor(ms); await page.dispatchEvent(sel, 'pointerup', {pointerId: 1, pointerType: 'touch', clientX: x, clientY: y, isPrimary: true, button: 0}); };
    const tapCanvas = async () => { const b = await page.locator('#minigameOverlay canvas').first().boundingBox(); if (b) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
    let err = null;
    try { await c.run(page, tap, hold, tapCanvas); } catch (e) { err = String(e.message || e).slice(0, 200); }
    await page.clock.runFor(1500);
    const raw = await done(page); const after = await page.evaluate(() => window.auditQA.snap());
    if (shots) { fs.mkdirSync(shots, {recursive: true}); await page.screenshot({path: path.join(shots, c.id + '.png')}); }
    const row = {id: c.id, what: c.what, expect: c.expect, raw, recorded: after.count > before.count, recordedScore: after.sum - before.sum, coins: after.money - before.money, message: after.message.slice(0, 80), pageErrors: errors.length, err};
    out.push(row); console.error(JSON.stringify(row));
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(JSON.stringify(out, null, 1));
})();
