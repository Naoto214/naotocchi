// めぐる Resident Expression の 表情 QA(?mgexprqa=1)を ほんものの ブラウザで しらべる(browser smoke)。
//   node tests/meguru-resident-expression-qa-browser.cjs [outDir]
// ・repo を そのまま 静的に くばる。セーブは「ずかんが ほぼ 空・regionId = sea」の ふつうの セーブ(住民が いない 地点を わざと つくる)
// ・2D(?mgexprqa=1)と 3D(?meguru3d=1&mgexprqa=1)の 両方で、おなじ 6 体・おなじ きもち を たしかめる:
//     住民数 6 / forest / 各 emotion で emotion → expression → asset が 1 か所の mapping と 一致 / asset が HTTP 200 で よめて decode ずみ /
//     auto で はなした 1 体だけ うれしい / ふだんの URL では パネルも 台帳も ない
// ・画像(2D / 3D × normal・positive・dislike・sick・tired)を outDir に のこす
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const out = path.resolve(process.argv[2] || 'test-results/meguru-resident-expression-qa');
fs.mkdirSync(out, { recursive: true });
const EMOTIONS = ['normal', 'positive', 'dislike', 'sick', 'tired'];

let qaHtml;
require(path.join(ROOT, 'tests/visual-qa.cjs'))().configureServer({ middlewares: { use(_p, handler) { handler({}, { setHeader() {}, end(html) { qaHtml = html; } }); } } });
const qaScript = qaHtml.match(/<script>([\s\S]*?)<\/script>/)[1];
const fixtures = vm.runInNewContext(qaScript.slice(0, qaScript.indexOf('const mount=')) + '\nfixtures');
// 住民が ほとんど いない セーブ: ずかんは いまの 自分 だけ、なかま・こいびとの 記録 なし、regionId は sea
function emptySave() {
  const save = JSON.parse(JSON.stringify(fixtures.world_sea));
  Object.assign(save, { health: 100, energy: 100, hunger: 85, happiness: 90, isSick: false, isSleeping: false, regionId: 'sea', companions: [], partner: null });
  save.discoveredStages = (save.discoveredStages || []).slice(0, 1);
  Object.assign(save.lifetime, { timeMode: 'day', weatherMode: 'sunny', seasonMode: 'summer', companionsRecruited: [], rareCompanionsRecruited: [], partnersRecorded: [] });
  return save;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
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

async function open(browser, base, query) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  await page.addInitScript((s) => localStorage.setItem('naotocchi-save-v1', JSON.stringify(s)), emptySave());
  await page.goto(`${base}/index.html${query}`);
  await page.locator('.device.ui-home-active').waitFor({ timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#travelBtn').click();
  await page.locator('#meguruEnterBtn').waitFor({ state: 'visible' });
  await page.locator('#meguruEnterBtn').click();
  await page.locator('#mgrCanvas').waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
  return { context, page, errors };
}
const frames = (page, n) => page.evaluate(async (k) => { for (let i = 0; i < k; i++) await new Promise((r) => requestAnimationFrame(r)); }, n);
const status = (page) => page.evaluate(() => { const r = window.__meguruRun; return r && r.exprQa ? r.exprQa.status() : null; });
const shot = async (page, name) => { const c = await page.evaluate(() => { const r = document.getElementById('mgrCanvas').getBoundingClientRect(); const p = document.getElementById('mgrExprQa'); const q = p ? p.getBoundingClientRect() : r; return { x: Math.min(r.x, q.x), y: Math.min(r.y, q.y), w: Math.max(r.right, q.right) - Math.min(r.x, q.x), h: Math.max(r.bottom, q.bottom) - Math.min(r.y, q.y) }; }); await page.screenshot({ path: path.join(out, name + '.png'), clip: { x: c.x, y: c.y, width: c.w, height: c.h } }); };

async function checkMode(browser, base, label, query, want3d) {
  const { context, page, errors } = await open(browser, base, query);
  const report = { label, query, emotions: {}, errors };
  try {
    await frames(page, 90);
    let st = await status(page);
    assert.ok(st && st.on, `${label}: the QA controller is on`);
    assert.equal(st.region, 'forest', `${label}: forest`);
    assert.equal(st.count, 6, `${label}: six representative residents`);
    assert.deepEqual(st.residents.map((r) => r.key), st.keys);
    assert.ok(st.module, `${label}: resident-expression.js is loaded`);
    if (want3d) assert.equal(st.is3D, true, `${label}: the 3D billboard renderer is active (failed=${st.failed3d})`);
    else assert.equal(st.is3D, false, `${label}: 2D`);
    report.is3D = st.is3D; report.keys = st.keys;
    const mapping = await page.evaluate(() => { const X = window.NaotocchiResidentExpression; return { EXPRESSION_FOR: X.EXPRESSION_FOR }; });
    for (const em of EMOTIONS) {
      await page.locator(`#mgrExprQa button[data-em="${em}"]`).click();
      await frames(page, 70);   // decode を まつ(表情の えは きもちが かわった 瞬間に よみはじめる)
      st = await status(page);
      assert.equal(st.choice, em);
      const rows = [];
      for (const r of st.residents) {
        const family = r.kind === 'form' ? 'stage' : 'relationship';
        const expected = mapping.EXPRESSION_FOR[family][em];
        assert.equal(r.emotion, em, `${label}/${em}: ${r.key} emotion`);
        assert.equal(r.expression, expected, `${label}/${em}: ${r.key} expression (${family})`);
        assert.equal(r.fallback, null, `${label}/${em}: ${r.key} no fallback`);
        if (expected !== 'normal') assert.notEqual(r.asset, r.base, `${label}/${em}: ${r.key} uses an expression picture`); else assert.equal(r.asset, r.base);
        const http200 = await page.evaluate(async (u) => { const res = await fetch(u, { cache: 'no-store' }); return res.status; }, r.asset);
        assert.equal(http200, 200, `${label}/${em}: ${r.asset} is served`);
        assert.ok(r.loaded, `${label}/${em}: ${r.asset} is decoded in the renderer image cache`);
        rows.push({ key: r.key, kind: r.kind, emotion: r.emotion, expression: r.expression, asset: r.asset, loaded: r.loaded, dist: r.dist });
      }
      report.emotions[em] = rows;
      await shot(page, `${label}-${em}`);
    }
    // auto: はなした 1 体だけ うれしい(ふだんの 経路)。顔と 台詞が おなじ emotion
    await page.locator('#mgrExprQa button[data-em="auto"]').click();
    await frames(page, 20);
    const talk = await page.evaluate(async () => {
      const run = window.__meguruRun; const dog = run.world.residents.find((a) => a.key === 'form:dog:2');
      run.setPlayer(dog.x, dog.z - 50);
      for (let i = 0; i < 30 && run.nearest !== dog; i++) await new Promise((r) => requestAnimationFrame(r));
      const t = run.nearest === dog ? run.sim.talk() : null;
      for (let i = 0; i < 40; i++) await new Promise((r) => requestAnimationFrame(r));
      return t ? { event: t.event, emotion: t.emotion, expression: t.expression, line: t.line, faces: run.exprQa.status().residents.map((r) => r.expression) } : null;
    });
    assert.ok(talk, `${label}: talked to the dog`);
    assert.equal(talk.event, 'talk'); assert.equal(talk.expression, 'happy');
    assert.deepEqual(talk.faces, ['normal', 'happy', 'normal', 'normal', 'normal', 'normal'], `${label}: only the dog is happy after the talk`);
    report.talk = talk;
    await shot(page, `${label}-auto-talk`);
    // セーブ: QA の 住民・forest の 発見・はなした 記録は 1 つも 入らない。regionId は sea の まま
    const save = await page.evaluate(() => localStorage.getItem('naotocchi-save-v1'));
    const parsed = JSON.parse(save);
    assert.equal(parsed.regionId, 'sea', `${label}: the save region is untouched`);
    for (const word of ['mgexprqa', 'exprQa', 'form:cat:5', 'companion:tanuki', 'partner:cat_ceo']) assert.ok(!save.includes(word), `${label}: ${word} is not in the save`);
    assert.ok(!((parsed.lifetime || {}).meguru || {}).talkCount, `${label}: no talk is recorded`);
    report.save = { regionId: parsed.regionId, meguru: (parsed.lifetime || {}).meguru || null };
    assert.deepEqual(errors, [], `${label}: no page errors`);
    console.log(`PASS ${label} (3D=${st.is3D}) talk="${talk.line}"`);
  } catch (e) {
    await page.screenshot({ path: path.join(out, `${label}-failure.png`) }).catch(() => {});
    throw e;
  } finally { await context.close(); }
  return report;
}

async function checkPlain(browser, base) {
  const { context, page, errors } = await open(browser, base, '');
  try {
    await frames(page, 30);
    const r = await page.evaluate(() => { const run = window.__meguruRun; return { exprQa: !!run.exprQa, panel: !!document.getElementById('mgrExprQa'), region: run.world.regionId, qa: run.world.residents.filter((a) => a.qa).length, residents: run.world.residents.length, save: localStorage.getItem('naotocchi-save-v1') }; });
    assert.equal(r.exprQa, false, 'plain URL: no QA controller'); assert.equal(r.panel, false, 'plain URL: no panel');
    assert.equal(r.region, 'sea', 'plain URL: the save region'); assert.equal(r.qa, 0, 'plain URL: no injected resident');
    assert.ok(!/mgexprqa|exprQa|form:cat:5/.test(r.save), 'the save carries nothing of the QA mode');
    assert.deepEqual(errors, []);
    console.log(`PASS plain (sea, ${r.residents} residents, no QA)`);
    return { region: r.region, residents: r.residents };
  } finally { await context.close(); }
}

(async () => {
  const { server, base } = await serve();
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const report = { base: 'static repo', savedAt: new Date().toISOString() };
  try {
    report.plain = await checkPlain(browser, base);
    report['2d'] = await checkMode(browser, base, '2d', '?mgexprqa=1', false);
    report['3d'] = await checkMode(browser, base, '3d', '?meguru3d=1&mgexprqa=1', true);
    // 2D と 3D で おなじ 住民・おなじ 顔
    for (const em of EMOTIONS) assert.deepEqual(report['2d'].emotions[em].map((r) => [r.key, r.expression, r.asset]), report['3d'].emotions[em].map((r) => [r.key, r.expression, r.asset]), `${em}: 2D and 3D resolve the same pictures for the same residents`);
    console.log('PASS 2D == 3D for all emotions');
  } finally { await browser.close(); server.close(); }
  fs.writeFileSync(path.join(out, 'qa-smoke.json'), JSON.stringify(report, null, 2));
  console.log('report', path.join(out, 'qa-smoke.json'));
})().catch((e) => { console.error('FAIL', e && e.message); process.exit(1); });
