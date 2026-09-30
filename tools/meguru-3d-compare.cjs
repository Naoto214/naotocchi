#!/usr/bin/env node
// めぐる 3D prototype の くらべ(forest)。2D と 3D を おなじ セーブ・おなじ 場所・おなじ あるき方で はかる。
// つかいかた:
//   NODE_PATH=$(npm root -g) node tools/meguru-3d-compare.cjs --out /tmp/cmp            … 2D と 3D の しゃしん + 計測
//   ... --throttle 4          … CPU を 4 倍 おそく(スマホ相当の めやす)
//   ... --seconds 20          … あるいて はかる 秒数(きほん 20)
//   ... --modes 3d            … 3D だけ
//   ... --json out.json       … けっかを JSON にも
// セーブは tests の harness で つくる(forest・なかま 26 + こいびと 1 = 27 にん)。ゲームの セーブは かえない。
// playwright が ひつよう。headless の WebGL は ソフトウェア(SwiftShader)なので GPU の 時間は 実機と ちがう(CPU がわ・draw call は くらべられる)。
const http = require('http');
const fs = require('fs');
const path = require('path');
let pw;
try { pw = require('playwright'); } catch (e) { console.error('playwright が みつかりません: NODE_PATH=$(npm root -g) node tools/meguru-3d-compare.cjs'); process.exit(2); }

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const OUT = opt('--out', path.join(require('os').tmpdir(), 'meguru-3d-compare'));
const THROTTLE = Number(opt('--throttle', 1));
const SECONDS = Number(opt('--seconds', 20));
const MODES = String(opt('--modes', '2d,3d')).split(',');
const JSON_OUT = opt('--json', null);
const SPOTS = String(opt('--spots', 'entry,bright2,fork,great,falls')).split(',');
fs.mkdirSync(OUT, { recursive: true });

function makeSave() {
  const { harness } = require(path.join(ROOT, 'tests/helpers/runtime-harness.cjs'));
  const arr = (x) => Array.from(x || []);
  const h = harness({ deterministic: true, fullDisplay: true }); const s = h.api.state();
  Object.assign(s, { stage: 'growing', speciesLine: 'dog', ageTicks: 600, isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 85, happiness: 90, regionId: 'forest' });
  const comps = arr(h.api.normalCompanions).concat(arr(h.api.rareCompanions)).slice(0, 26);
  s.companions = comps.map((c) => ({ id: c.id, bond: 100 })); s.lifetime.companionsRecruited = comps.map((c) => c.id);
  const pc = arr(h.api.partnerCandidates)[0];
  s.partner = { id: pc.id, label: pc.label || pc.name, emoji: pc.emoji, affection: 100 }; s.lifetime.partnersRecorded = [pc.id];
  return JSON.stringify(s);
}
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

async function openMeguru(browser, base, mode, save) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.addInitScript((s) => localStorage.setItem('naotocchi-save-v1', s), save);
  if (THROTTLE > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE }); }
  await page.goto(base + '/index.html' + (mode === '3d' ? '?meguru3d=1' : ''));
  await page.locator('.device.ui-home-active').waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);   // 3D の module を よみこむ ひま
  await page.locator('#travelBtn').click();
  await page.locator('#meguruEnterBtn').waitFor({ state: 'visible' });
  const t0 = Date.now();
  await page.locator('#meguruEnterBtn').click();
  await page.locator('#mgrCanvas').waitFor({ state: 'visible' });
  await page.waitForFunction((m) => { const r = globalThis.__meguruRun; return r && r.world && (m !== '3d' || r.renderer.is3D || r.renderer.failed); }, mode, { timeout: 60000 });
  const enterMs = Date.now() - t0;
  return { ctx, page, errors, enterMs };
}
// パッドを おして うごかす(dx, dy: -1..1)。0,0 で はなす
async function hold(page, dx, dy) {
  const box = await page.locator('#meguruOverlay .mg-pad').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.up().catch(() => {});
  if (!dx && !dy) return;
  await page.mouse.move(cx, cy); await page.mouse.down();
  await page.mouse.move(cx + dx * 40, cy + dy * 40, { steps: 4 });
}

async function capture(page, mode, spot) {
  await page.evaluate((id) => {
    const r = globalThis.__meguruRun, s = r.world.spots.find((q) => q.id === id);
    r.setPlayer(s.x, s.z - 140); r.sim.placeParty && r.sim.placeParty();
  }, spot);
  await hold(page, 0, -1); await page.waitForTimeout(900); await hold(page, 0, 0); await page.waitForTimeout(1200);
  const box = await page.locator('#mgrCanvas').boundingBox();
  const file = path.join(OUT, `${spot}-${mode}.png`);
  await page.screenshot({ path: file, clip: box });
  return file;
}

async function measure(page) {
  await page.evaluate(() => {
    const r = globalThis.__meguruRun, s = r.world.spots.find((q) => q.id === 'entry'); r.setPlayer(s.x, s.z);
    window.__frames = []; let last = performance.now();
    const loop = (t) => { window.__frames.push(t - last); last = t; if (!window.__stopFrames) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
  // あるき方: まえ・ななめ・よこ・もどり を くりかえす(カメラが まわる・なかまが ついてくる)
  const route = [[0, -1], [0.7, -0.7], [0, -1], [-0.7, -0.7], [-1, 0], [0, -1], [1, 0], [0, 1]];
  const end = Date.now() + SECONDS * 1000;
  for (let i = 0; Date.now() < end; i++) { const [dx, dy] = route[i % route.length]; await hold(page, dx, dy); await page.waitForTimeout(1800); }
  await hold(page, 0, 0);
  return page.evaluate(() => {
    window.__stopFrames = true;
    const f = window.__frames.slice(10).sort((a, b) => a - b), pick = (q) => f[Math.min(f.length - 1, Math.floor(f.length * q))];
    const r = globalThis.__meguruRun;
    return { frames: f.length, avgMs: +(f.reduce((s, v) => s + v, 0) / f.length).toFixed(2), p95Ms: +pick(0.95).toFixed(1), p99Ms: +pick(0.99).toFixed(1), over60: f.filter((v) => v > 60).length,
      is3D: !!r.renderer.is3D, failed: !!r.renderer.failed, stats3d: r.renderer.stats3d ? r.renderer.stats3d() : null,
      party: r.party.length, residents: r.world.residents.length, props: r.world.props.length, obstacles: r.world.obstacles.length,
      heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1e6).toFixed(1) : null };
  });
}

(async () => {
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await pw.chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined, args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
  const save = makeSave();
  const result = { throttle: THROTTLE, seconds: SECONDS, modes: {} };
  try {
    for (const mode of MODES) {
      const { ctx, page, errors, enterMs } = await openMeguru(browser, base, mode, save);
      const shots = [];
      for (const spot of SPOTS) shots.push(await capture(page, mode, spot));
      const perf = await measure(page);
      result.modes[mode] = { enterMs, perf, shots, errors };
      console.log(mode, JSON.stringify({ enterMs, ...perf, errors }));
      await ctx.close();
    }
  } finally { await browser.close(); srv.close(); }
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(result, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
