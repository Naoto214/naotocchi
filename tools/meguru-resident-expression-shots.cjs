#!/usr/bin/env node
// めぐる Resident Expression の 代表画像を ほんものの ゲーム(index.html)から とる。
//   node tools/meguru-resident-expression-shots.cjs <outDir> [--no-3d]
// ・repo を そのまま 静的に くばる(vite も ビルドも なし)。セーブは visual-qa の fixture + ずかん 全開放(localStorage だけ)
// ・?mgexprforce=<emotion> は QA の 固定(セーブには のこらない)。normal / positive / dislike / sick / tired を 2D(forest)で、
//   positive を 3D(?meguru3d=1・forest)で とる。顔・台詞は おなじ emotion から 出る ので、はなした ふきだしも いっしょに うつす
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const out = path.resolve(process.argv[2] || 'test-results/meguru-resident-expression');
const no3d = process.argv.includes('--no-3d');
fs.mkdirSync(out, { recursive: true });

// fixture(home-layout-browser と おなじ とりかた)
let qaHtml;
require(path.join(ROOT, 'tests/visual-qa.cjs'))().configureServer({ middlewares: { use(_p, handler) { handler({}, { setHeader() {}, end(html) { qaHtml = html; } }); } } });
const qaScript = qaHtml.match(/<script>([\s\S]*?)<\/script>/)[1];
const fixtures = vm.runInNewContext(qaScript.slice(0, qaScript.indexOf('const mount=')) + '\nfixtures');
// ずかんを ぜんぶ ひらく(住民 = ずかんの 全コマ + なかま + こいびと。手がきの 一覧は つかわない)
const { harness } = require(path.join(ROOT, 'tests/helpers/runtime-harness.cjs'));
const H = harness({ fullDisplay: true });
const SP = H.api.SPECIES, LINES = Array.from(H.api.ALL_LINES);
// ずかんの 最後の 1 段は あけて おく(ぜんぶ ひらくと PERFECT CLEAR の 幕が 出て Home に つかない)。住民は それでも 200 体 いじょう
const allStages = LINES.flatMap((line) => (SP[line].stages || []).slice(0, -1).map((_, i) => `${line}:${i}`));
function saveFor(region) {
  const save = JSON.parse(JSON.stringify(fixtures['world_' + region]));
  Object.assign(save, { health: 100, energy: 100, hunger: 85, happiness: 90, isSick: false, isSleeping: false, regionId: region, discoveredStages: allStages });
  Object.assign(save.lifetime, { timeMode: 'day', weatherMode: 'sunny', seasonMode: 'summer' });
  return save;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon' };
function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      const f = path.join(ROOT, u === '/' ? 'index.html' : u);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; res.end(); return; }
      res.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream'); res.setHeader('Cache-Control', 'no-store');
      fs.createReadStream(f).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }));
  });
}

// めぐるに 入って、いちばん 人の おおい spot の まえに 立つ。はなして ふきだしを 出し、canvas を とる
async function shoot(browser, base, { name, region, query, width = 390, height = 844, want3d = false }) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  await page.addInitScript((s) => localStorage.setItem('naotocchi-save-v1', JSON.stringify(s)), saveFor(region));
  await page.goto(`${base}/index.html${query}`);
  try { await page.locator('.device.ui-home-active').waitFor({ timeout: 20000 }); }
  catch (e) { await page.screenshot({ path: path.join(out, `${name}-boot-failure.png`) }).catch(() => {}); console.error(`${name}: boot failed`, errors); throw e; }
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#travelBtn').click();
  await page.locator('#meguruEnterBtn').waitFor({ state: 'visible' });
  await page.locator('#meguruEnterBtn').click();
  await page.locator('#mgrCanvas').waitFor({ state: 'visible' });
  await page.waitForTimeout(600);
  const info = await page.evaluate(async () => {
    const run = window.__meguruRun;
    const w = run.world;
    const by = new Map();
    for (const a of w.residents) { if (a.fixed || a.plant || !a.spot) continue; const k = a.spot.id; by.set(k, (by.get(k) || []).concat(a)); }
    let best = null; for (const [, list] of by) if (!best || list.length > best.length) best = list;
    const s = best[0].spot;
    // spot の 手前に 立って +z(おく)を 見る。カメラは 2D と おなじ
    run.setPlayer(s.x, s.z - 150);
    for (let i = 0; i < 90; i++) await new Promise((r) => requestAnimationFrame(r));
    // 住民(いっしょに あるく なかまでは なく)の すぐ まえに 立って はなす(顔と 台詞が おなじ emotion から 出る)
    const target = best.slice().sort((a, b) => a.z - b.z)[0];
    run.setPlayer(target.x, target.z - 60);
    for (let i = 0; i < 12 && run.nearest !== target; i++) await new Promise((r) => requestAnimationFrame(r));
    const near = run.nearest;
    const talk = near ? run.sim.talk() : null;
    for (let i = 0; i < 20; i++) await new Promise((r) => requestAnimationFrame(r));
    const faces = w.residents.filter((a) => Math.hypot(a.x - run.player.x, a.z - run.player.z) < 600 && a.expr).map((a) => ({ key: a.key, kind: a.kind, emotion: a.emotion, expression: a.expr.expression, asset: a.expr.asset, base: a.expr.base, fallback: a.expr.fallback }));
    const c = document.getElementById('mgrCanvas').getBoundingClientRect();
    return { spot: s.id, count: best.length, faces, talk: talk ? { line: talk.line, event: talk.event, emotion: talk.emotion, expression: talk.expression, key: talk.actor.key } : null,
      is3D: !!(run.renderer && run.renderer.is3D), failed3d: !!(run.renderer && run.renderer.failed), canvas: { x: c.x, y: c.y, w: c.width, h: c.height }, expr: run.sim.expressionConfig };
  });
  if (want3d && !info.is3D) console.warn(`${name}: 3D did not activate (failed=${info.failed3d})`);
  await page.screenshot({ path: path.join(out, `${name}.png`), clip: { x: info.canvas.x, y: info.canvas.y, width: info.canvas.w, height: info.canvas.h } });
  await page.screenshot({ path: path.join(out, `${name}-full.png`) });
  await context.close();
  return Object.assign({ name, query, errors }, info);
}

(async () => {
  const { server, base } = await serve();
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const report = [];
  try {
    const only = process.env.SHOTS_ONLY ? process.env.SHOTS_ONLY.split(',') : null;
    for (const [name, force] of [['2d-normal', null], ['2d-positive', 'positive'], ['2d-dislike', 'dislike'], ['2d-sick', 'sick'], ['2d-tired', 'tired']]) {
      if (only && !only.includes(name)) continue;
      report.push(await shoot(browser, base, { name, region: 'forest', query: force ? `?mgexprforce=${force}` : '' }));
      console.log('shot', name);
    }
    if (!no3d) {
      for (const [name, force] of [['3d-positive', 'positive'], ['3d-sick', 'sick']]) {
        if (only && !only.includes(name)) continue;
        report.push(await shoot(browser, base, { name, region: 'forest', query: `?meguru3d=1&mgexprforce=${force}`, want3d: true }));
        console.log('shot', name);
      }
    }
  } finally {
    await browser.close(); server.close();
  }
  fs.writeFileSync(path.join(out, 'shots.json'), JSON.stringify(report, null, 2));
  for (const r of report) console.log(`${r.name}: spot=${r.spot} residents=${r.count} faces=${r.faces.length} 3D=${r.is3D} talk=${r.talk ? `${r.talk.event}/${r.talk.emotion}/${r.talk.expression} "${r.talk.line}"` : '-'} errors=${r.errors.length}`);
})().catch((e) => { console.error(e); process.exit(1); });
