// しゃしん: node shot.cjs <root> <outDir> <json: [{region, spot|x,z, yaw(deg), name, env?}]>
const pw = require('playwright'); const fs = require('fs'); const path = require('path'); const http = require('http');
const ROOT = process.argv[2], OUT = process.argv[3]; const SHOTS = JSON.parse(process.argv[4]); fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
function serve() { return new Promise((res) => { const s = http.createServer((req, r) => { const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }); s.listen(0, '127.0.0.1', () => res(s)); }); }
const { harness } = require(path.join(ROOT, 'tests/helpers/runtime-harness.cjs'));
function makeSave(region, env) { const arr = (x) => Array.from(x || []); const h = harness({ deterministic: true, fullDisplay: true }); const s = h.api.state();
  Object.assign(s, { stage: 'growing', speciesLine: 'dog', ageTicks: 600, isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 85, happiness: 90, regionId: region });
  s.lifetime.regionsVisited = [...new Set([...(s.lifetime.regionsVisited || []), region])]; if (region === 'star_stop' || region === 'memory_lake') s.lifetime.specialRegionsVisited = [...new Set([...(s.lifetime.specialRegionsVisited || []), region])];
  if (env) Object.assign(s.lifetime, { timeMode: env[0] || 'day', weatherMode: env[1] || 'sunny', seasonMode: env[2] || 'summer' });
  const comps = arr(h.api.normalCompanions).concat(arr(h.api.rareCompanions)).slice(0, 4); s.companions = comps.map((c) => ({ id: c.id, bond: 100 })); s.lifetime.companionsRecruited = comps.map((c) => c.id);
  return JSON.stringify(s); }
(async () => {
  const srv = await serve(); const base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await pw.chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
  for (const sh of SHOTS) {
    try {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const page = await ctx.newPage(); const errors = [];
      page.on('pageerror', (e) => errors.push(String(e.message || e)));
      await page.addInitScript((s) => localStorage.setItem('naotocchi-save-v1', s), makeSave(sh.region, sh.env));
      await page.goto(base + '/index.html?meguru3d=1' + (sh.perf ? '&perf=1' : '')); await page.locator('.device.ui-home-active').waitFor({ timeout: 60000 }); await page.waitForTimeout(800);
      await page.locator('#travelBtn').click(); await page.locator('#meguruEnterBtn').waitFor({ state: 'visible' }); await page.locator('#meguruEnterBtn').click(); await page.locator('#mgrCanvas').waitFor({ state: 'visible' });
      await page.waitForFunction(() => { const r = globalThis.__meguruRun; return r && r.world && (r.renderer.is3D || r.renderer.failed); }, { timeout: 60000 }); await page.waitForTimeout(1200);
      const st = await page.evaluate((sh) => { const r = globalThis.__meguruRun; let x = sh.x, z = sh.z; if (sh.spot) { const q = r.world.spots.find((s) => s.id === sh.spot); x = q.x + (sh.dx || 0); z = q.z + (sh.dz || 0); }
        r.sim.setCameraMotion && r.sim.setCameraMotion(false); r.setPlayer(x, z); r.sim.camera.yaw = (sh.yaw || 0) * Math.PI / 180; if (sh.dist) r.sim.camera.dist = sh.dist; r.sim.placeParty(); return { x, z, is3D: r.renderer.is3D }; }, sh);
      await page.waitForTimeout(1600);
      const box = await page.locator('#mgrCanvas').boundingBox(); await page.screenshot({ path: path.join(OUT, sh.name + '.png'), clip: box });
      const stats = await page.evaluate(() => { const r = globalThis.__meguruRun; const s = r.renderer.stats3d ? r.renderer.stats3d() : null; return s && { calls: s.calls, tris: s.triangles, js: +s.drawMsAvg.toFixed(1), water: s.water, player: s.player, ghosts: s.ghosts && s.ghosts.visible }; });
      console.log(sh.name.padEnd(28), JSON.stringify(st), JSON.stringify(stats), 'err', errors.length);
      await ctx.close();
    } catch (e) { console.log(sh.name, 'EXC', String(e.message || e).slice(0, 200)); }
  }
  await browser.close(); srv.close();
})().catch((e) => { console.error('ERR', e); process.exit(2); });
