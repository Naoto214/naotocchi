// しゃしん: node shot.cjs <root> <outDir> <json: [{region, spot|x,z, yaw(deg), name, env?, jpg?}]>
const pw = require('playwright'); const fs = require('fs'); const path = require('path'); const http = require('http');
const ROOT = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3]); process.chdir(ROOT); const SHOTS = JSON.parse(process.argv[4]); fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
function serve() { return new Promise((res) => { const s = http.createServer((req, r) => { const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }); s.listen(0, '127.0.0.1', () => res(s)); }); }
const { harness } = require(path.join(ROOT, 'tests/helpers/runtime-harness.cjs'));
// Capture a completed frame instead of submitting more SwiftShader work while
// Chromium reads back the canvas. Restore every queued RAF callback afterwards.
// This is screenshot-only: never use this paused interval for performance QA.
async function captureFrame(page, options) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => {
    const original = window.requestAnimationFrame, queued = new Map(); let id = -1;
    const cancel = window.cancelAnimationFrame;
    window.requestAnimationFrame = (cb) => { const key = id--; queued.set(key, cb); return key; };
    window.cancelAnimationFrame = (key) => { if (key < 0) queued.delete(key); else cancel.call(window, key); };
    window.__resumeWorldShot = () => { window.requestAnimationFrame = original; window.cancelAnimationFrame = cancel;
      for (const cb of queued.values()) original.call(window, cb); delete window.__resumeWorldShot; };
    resolve();
  })));
  try { await page.screenshot({ ...options, timeout: 60000 }); }
  finally { await page.evaluate(() => window.__resumeWorldShot && window.__resumeWorldShot()); }
}
function makeSave(region, env) { const arr = (x) => Array.from(x || []); const h = harness({ deterministic: true, fullDisplay: true }); const s = h.api.state();
  Object.assign(s, { stage: 'growing', speciesLine: 'dog', ageTicks: 600, isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 85, happiness: 90, regionId: region });
  s.lifetime.regionsVisited = [...new Set([...(s.lifetime.regionsVisited || []), region])]; if (region === 'star_stop' || region === 'memory_lake') s.lifetime.specialRegionsVisited = [...new Set([...(s.lifetime.specialRegionsVisited || []), region])];
  if (env) Object.assign(s.lifetime, { timeMode: env[0] || 'day', weatherMode: env[1] || 'sunny', seasonMode: env[2] || 'summer' });
  const comps = arr(h.api.normalCompanions).concat(arr(h.api.rareCompanions)).slice(0, 4); s.companions = comps.map((c) => ({ id: c.id, bond: 100 })); s.lifetime.companionsRecruited = comps.map((c) => c.id);
  return JSON.stringify(s); }
(async () => {
  const srv = await serve(); const base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await pw.chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
  // 2026-10-02: adjacent shots of the same region/environment share a context.
  // Only the camera changes; avoid reloading Home and rebuilding identical terrain.
  let ctx = null, page = null, contextKey = null, errors = [], failures = 0;
  for (const sh of SHOTS) {
    try {
      const key = JSON.stringify([sh.region, sh.env, !!sh.perf]);
      if (key !== contextKey) {
      if (ctx) await ctx.close();
      ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); page = await ctx.newPage(); errors = []; contextKey = key;
      page.on('pageerror', (e) => errors.push(String(e.message || e)));
      page.on('console', (m) => { if (m.type() === 'error' && /THREE|WebGL|shader|GLSL/i.test(m.text())) errors.push(m.text().slice(0, 500)); });
      await page.addInitScript((s) => localStorage.setItem('naotocchi-save-v1', s), makeSave(sh.region, sh.env));
      await page.goto(base + '/index.html?meguru3d=1' + (sh.perf ? '&perf=1' : '')); await page.locator('.device.ui-home-active').waitFor({ timeout: 60000 }); await page.waitForTimeout(800);
      await page.locator('#travelBtn').click(); await page.locator('#meguruEnterBtn').waitFor({ state: 'visible' }); await page.locator('#meguruEnterBtn').click(); await page.locator('#mgrCanvas').waitFor({ state: 'visible' });
      await page.waitForFunction(() => { const r = globalThis.__meguruRun; return r && r.world && (r.renderer.is3D || r.renderer.failed); }, { timeout: 60000 });
      await page.evaluate(() => { const r = globalThis.__meguruRun; if (r.renderer.setAdaptiveDpr) r.renderer.setAdaptiveDpr(false); });   // しゃしんは 解像度を 固定(headless は おそい ので 自動調整が はたらく)
      await page.waitForTimeout(1200);
      }
      const st = await page.evaluate((sh) => { const r = globalThis.__meguruRun; let x = sh.x, z = sh.z; if (sh.spot) { const q = r.world.spots.find((s) => s.id === sh.spot); x = q.x + (sh.dx || 0); z = q.z + (sh.dz || 0); }
        r.sim.setCameraMotion && r.sim.setCameraMotion(false); r.setPlayer(x, z); r.sim.camera.yaw = (sh.yaw || 0) * Math.PI / 180; if (sh.dist) r.sim.camera.dist = sh.dist; r.sim.placeParty(); return { x, z, is3D: r.renderer.is3D }; }, sh);
      await page.waitForTimeout(1600);
      const box = await page.locator('#mgrCanvas').boundingBox(); await captureFrame(page, sh.jpg ? { path: path.join(OUT, sh.name + '.jpg'), clip: box, type: 'jpeg', quality: 82 } : { path: path.join(OUT, sh.name + '.png'), clip: box });   // jpg: docs 用(小さく)
      const stats = await page.evaluate(() => { const r = globalThis.__meguruRun; const s = r.renderer.stats3d ? r.renderer.stats3d() : null; return s && { calls: s.calls, tris: s.triangles, camera: { ...r.sim.camera }, js: +s.drawMsAvg.toFixed(1), water: s.water, player: s.player, ghosts: s.ghosts && s.ghosts.visible }; });
      console.log(sh.name.padEnd(28), JSON.stringify(st), JSON.stringify(stats), 'err', errors.length);
      if (!st.is3D || errors.length) failures++;
    } catch (e) { failures++; console.log(sh.name, 'EXC', String(e.message || e).slice(0, 200)); if (ctx) await ctx.close(); ctx = page = contextKey = null; }
  }
  await browser.close(); srv.close();
  if (failures) process.exitCode = 1;
})().catch((e) => { console.error('ERR', e); process.exit(2); });
