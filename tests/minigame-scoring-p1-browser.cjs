// ミニゲーム採点監査 Phase 1(重大 3本)を、本物の ページ(スマホ幅 390×844・タッチ)で たしかめる。
//  - tilt-maze-3d: 何もしないと 進み具合 0 の 15点(記録しない)。少し 動かしても ゴール前なら 15〜45点
//  - shanghai-tiles: でたらめな 順に とっても さいごまで とりきれる(60まい・68まい)
//  - slide-puzzle: 完成形に もどる シャッフルでも 解ける 盤。3×3 は 画面の タップで 実際に 完成できる
// 時計は Playwright の clock で 早送りする。牌の 絵を 読むため、配信する script.js の 絵の 置きかえ(canvas-illustrations)
// だけを はずす(ゲームの ロジックは 本物の games.js の まま)。
// node tests/minigame-scoring-p1-browser.cjs [--engines chromium,webkit] [--shots DIR]
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
      const g = buildMinigamePool().find((x) => x.id === id); window.p1QA.scores = [];
      if (random) Math.random = random;
      startMinigame({id: g.id, start(c, done) { return g.start(c, (s, ...rest) => { window.p1QA.scores.push(s); done(s, ...rest); }); }});
    },
    count() { return state.minigameCount; },
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

// ---------- tilt-maze ----------
async function tiltIdle(page) {
  await start(page, 'tilt-maze-3d');
  const before = await page.evaluate(() => window.p1QA.count());
  for (let i = 0; i < 60 && await ended(page) === null; i++) await page.clock.runFor(1000);
  await page.clock.runFor(1500);
  return {raw: await ended(page), recorded: (await page.evaluate(() => window.p1QA.count())) > before};
}

// ---------- shanghai ----------
const FACES = ['🌸', '🍀', '🍁', '🌙', '⭐', '🐟', '🐢', '🦋', '🍑', '🍇', '🎐', '🏮', '🐉', '🎋', '🍵', '🪷'];
async function shTiles(page) {
  const size = await page.evaluate(() => { const c = document.querySelector('#shCanvas'); if (!c) return null; const r = c.getBoundingClientRect(); return {W: Math.round(r.width), H: Math.round(r.height)}; });
  if (!size) return []; // ゲームが おわって 画面が とじた
  const {W, H} = size;
  const OX = (W - 16 * 14) / 2 + 6, OY = (H - 5 * 36) / 2 + 6;
  const out = [];
  for (const [k, text, cx, cy] of await frameDraws(page, 'shCanvas')) {
    if (k !== 't' || !FACES.includes(text)) continue;
    for (let layer = 0; layer <= 3; layer++) {
      const x = (cx - OX - 14 + layer * 3) / 14, y = (cy - 1 - OY - 18 + layer * 3) / 18;
      if (Math.abs(x - Math.round(x)) < 1e-6 && Math.round(x) % 2 === 0 && Math.abs(y - Math.round(y)) < 1e-6) { out.push({face: text, layer, x: Math.round(x), y: Math.round(y), cx, cy}); break; }
    }
  }
  return out;
}
function shFree(tiles) {
  const covers = (a, b) => a.layer === b.layer + 1 && Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;
  const side = (t, d) => tiles.some((o) => o !== t && o.layer === t.layer && o.x === t.x + d * 2 && Math.abs(o.y - t.y) < 2);
  return tiles.filter((t) => !tiles.some((o) => covers(o, t)) && !(side(t, -1) && side(t, 1)));
}
async function shPlay(page, seed, mode) {
  await start(page, 'shanghai-tiles', mode, lcgSrc(seed));
  const box = await page.locator('#shCanvas').boundingBox();
  let s = (seed * 2654435761) >>> 0; const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  let total = null, lowered = false;
  for (let step = 0; step < 120; step++) {
    const tiles = await shTiles(page);
    if (total === null) total = tiles.length;
    if (!tiles.length) break;
    const free = shFree(tiles), pairs = [];
    for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) if (free[i].face === free[j].face) pairs.push([free[i], free[j]]);
    if (!pairs.length) return {cleared: false, left: tiles.length, total, lowered};
    const [a, b] = pairs[Math.floor(rnd() * pairs.length)];
    for (const t of [a, b]) await page.touchscreen.tap(box.x + t.cx, box.y + t.cy - 1);
    if (/おろして/.test(await page.locator('#shHint').textContent())) lowered = true;
  }
  for (let i = 0; i < 10 && await ended(page) === null; i++) await page.clock.runFor(300);
  const score = await ended(page), left = (await shTiles(page)).length;
  const hint = await page.locator('#shHint').textContent().catch(() => '-');
  return {cleared: score !== null && left === 0, left, total, lowered, score, hint};
}

// ---------- slide-puzzle ----------
async function slideBoard(page) {
  const draws = (await frameDraws(page, 'spCanvas')).filter((d) => d[0] === 'i');
  const CELL = draws[0][3] / 2, N = Math.round(Math.sqrt(draws.length + 1));
  const board = Array(N * N).fill(N * N - 1);
  for (const [, sx, sy, , , x, y] of draws) board[Math.round(y / CELL) * N + Math.round(x / CELL)] = Math.round(sy / 2 / CELL) * N + Math.round(sx / 2 / CELL);
  return {board, N, CELL};
}
function solvable(board, N) {
  assert.ok(board.slice().sort((x, y) => x - y).every((v, i) => v === i), 'board was read as a permutation: ' + board);
  let inv = 0; const p = board.slice();
  for (let i = 0; i < p.length; i++) while (p[i] !== i) { const j = p[i]; [p[i], p[j]] = [p[j], p[i]]; inv++; }
  const at = board.indexOf(N * N - 1);
  return inv % 2 === (Math.abs((at % N) - (N - 1)) + Math.abs(Math.floor(at / N) - (N - 1))) % 2;
}
function solve3(board) { // 3×3 の 最短手順(動かす ピースの マス)
  const key = (b) => b.join(','), goal = '0,1,2,3,4,5,6,7,8';
  const q = [[board, []]], seen = new Set([key(board)]);
  while (q.length) {
    const [b, path] = q.shift(); if (key(b) === goal) return path;
    const e = b.indexOf(8), ex = e % 3, ey = Math.floor(e / 3);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = ex + dx, y = ey + dy; if (x < 0 || y < 0 || x > 2 || y > 2) continue;
      const i = y * 3 + x, nb = b.slice(); nb[e] = nb[i]; nb[i] = 8; const k = key(nb);
      if (!seen.has(k)) { seen.add(k); q.push([nb, path.concat(i)]); }
    }
  }
  return null;
}
async function slideOpen(page, random) {
  await start(page, 'slide-puzzle', null, random);
  const box = await page.locator('#spCanvas').boundingBox();
  await page.touchscreen.tap(box.x + 10, box.y + 10); // お手本を とじる
  await page.clock.runFor(100);
  return {box, ...(await slideBoard(page))};
}

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const report = [];
  for (const engine of engines) {
    const browser = await playwright[engine].launch();
    const row = {engine};
    // tilt-maze
    { const {ctx, page, errors} = await openPage(browser, engine);
      const r = await tiltIdle(page);
      assert.equal(r.raw, 15, `${engine} tilt idle raw`); assert.equal(r.recorded, false, `${engine} tilt idle is not recorded`);
      row.tiltIdle = r; assert.deepEqual(errors, []); await ctx.close(); }
    // shanghai(6局ごとに 新しい ページ: 何局も つづけると ホームの できごと〔へんしん・寿命など〕が 画面に 出て、タップを ふさぐ ことが ある)
    { const games = []; let cur = null;
      for (let k = 0; k < 24; k++) {
        if (k % 6 === 0) { if (cur) { assert.deepEqual(cur.errors, []); await cur.ctx.close(); } cur = await openPage(browser, engine); } // 6局ごとに 新しい ページ
        const {page, errors} = cur;
        const mode = k % 2 ? 'hard' : null, res = await shPlay(page, 1000 + k * 7919, mode);
        if (!res.cleared && shots) { fs.mkdirSync(shots, {recursive: true}); await page.screenshot({path: path.join(shots, `${engine}-shanghai-fail-${k}.png`)}); }
        assert.equal(res.total, mode ? 68 : 60, `${engine} shanghai size`);
        assert.ok(res.cleared, `${engine} shanghai game ${k}: のこり ${res.left}/${res.total} hint=${res.hint}`);
        assert.ok(res.score >= 60, `${engine} shanghai game ${k}: full-clear score ${res.score}`);
        games.push({mode: mode || 'normal', score: res.score, lowered: res.lowered});
        if (shots && k === 1) { fs.mkdirSync(shots, {recursive: true}); await page.screenshot({path: path.join(shots, `${engine}-shanghai.png`)}); }
        assert.deepEqual(errors, []);
        await page.clock.runFor(4000);
      }
      await cur.ctx.close();
      row.shanghai = {games: games.length, cleared: games.length, lowered: games.filter((g) => g.lowered).length, scores: games.map((g) => g.score)}; }
    // slide-puzzle
    { const {ctx, page, errors} = await openPage(browser, engine);
      const solvedBoards = [];
      for (let off = 0; off < 4; off++) {
        const seq = `(()=>{let i=${off};const q=[0.75,0.25,0.5,0.25];return ()=>q[(i++)%4];})()`;
        const {board, N} = await slideOpen(page, seq);
        assert.equal(N, 3); assert.ok(solvable(board, N), `${engine} periodic offset ${off}: ${board}`);
        assert.ok(board.some((v, i) => v !== i), 'not solved at start');
        solvedBoards.push(board.join(''));
        await page.evaluate(() => window.retireMinigame && window.retireMinigame()); await page.clock.runFor(500);
      }
      for (let seed = 1; seed <= 3; seed++) {
        const {board, N, box, CELL} = await slideOpen(page, lcgSrc(seed * 31337));
        assert.ok(solvable(board, N), `${engine} seed ${seed}: ${board}`);
        const path3 = solve3(board); assert.ok(path3, 'BFS finds a solution');
        for (const i of path3) { await page.touchscreen.tap(box.x + (i % 3) * CELL + CELL / 2, box.y + Math.floor(i / 3) * CELL + CELL / 2); await page.clock.runFor(160); }
        for (let t = 0; t < 10 && await ended(page) === null; t++) await page.clock.runFor(500);
        const sc = await ended(page);
        assert.ok(sc >= 74, `${engine} seed ${seed}: solved by touch, score ${sc}`);
        solvedBoards.push('solved:' + sc);
        if (shots && seed === 1) await page.screenshot({path: path.join(shots, `${engine}-slide.png`)});
        await page.clock.runFor(4000);
      }
      row.slide = solvedBoards;
      assert.deepEqual(errors, []); await ctx.close(); }
    await browser.close();
    report.push(row);
    console.log(JSON.stringify(row));
  }
  server.close();
  if (shots) fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify(report, null, 1));
  console.log('ok: minigame scoring P1 browser checks passed on', engines.join(', '));
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
