// player visibility audit: walk every path segment, camera follows the path, read the ray probe (perf diag)
const pw = require('playwright'); const fs = require('fs'); const path = require('path'); const http = require('http');
const ROOT = process.argv[2], OUT = process.argv[3], ONLY = (process.argv[4] || '').split(',').filter(Boolean), STEP = +(process.argv[5] || 220); fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
function serve() { return new Promise((res) => { const s = http.createServer((req, r) => { const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }); s.listen(0, '127.0.0.1', () => res(s)); }); }
const { harness } = require(path.join(ROOT, 'tests/helpers/runtime-harness.cjs'));
function makeSave(region) { const arr = (x) => Array.from(x || []); const h = harness({ deterministic: true, fullDisplay: true }); const s = h.api.state();
  Object.assign(s, { stage: 'growing', speciesLine: 'dog', ageTicks: 600, isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 85, happiness: 90, regionId: region });
  s.lifetime.regionsVisited = [...new Set([...(s.lifetime.regionsVisited || []), region])]; if (region === 'star_stop' || region === 'memory_lake') s.lifetime.specialRegionsVisited = [...new Set([...(s.lifetime.specialRegionsVisited || []), region])];
  Object.assign(s.lifetime, { timeMode: 'day', weatherMode: 'sunny', seasonMode: 'summer' });
  const comps = arr(h.api.normalCompanions).concat(arr(h.api.rareCompanions)).slice(0, 4); s.companions = comps.map((c) => ({ id: c.id, bond: 100 })); s.lifetime.companionsRecruited = comps.map((c) => c.id);
  return JSON.stringify(s); }
const REG = ONLY.length ? ONLY : ['home', 'city', 'countryside', 'forest', 'mountain', 'snow', 'sea', 'deepsea', 'river_lake', 'jungle', 'desert', 'star_stop', 'memory_lake'];
(async () => {
  const srv = await serve(); const base = 'http://127.0.0.1:' + srv.address().port; const out = {};
  const browser = await pw.chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
  for (const region of REG) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 }); const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message || e)));
    await page.addInitScript((s) => localStorage.setItem('naotocchi-save-v1', s), makeSave(region));
    await page.goto(base + '/index.html?meguru3d=1&perf=1'); await page.locator('.device.ui-home-active').waitFor({ timeout: 60000 }); await page.waitForTimeout(600);
    await page.locator('#travelBtn').click(); await page.locator('#meguruEnterBtn').waitFor({ state: 'visible' }); await page.locator('#meguruEnterBtn').click(); await page.locator('#mgrCanvas').waitFor({ state: 'visible' });
    await page.waitForFunction(() => { const r = globalThis.__meguruRun; return r && r.world && (r.renderer.is3D || r.renderer.failed); }, { timeout: 60000 });
    await page.evaluate((NOFADE) => { const r = globalThis.__meguruRun; r.renderer.setAdaptiveDpr && r.renderer.setAdaptiveDpr(false); if (NOFADE) r.renderer.setOccluderFade(false); r.sim.setCameraMotion && r.sim.setCameraMotion(false); }, !!process.env.NOFADE);
    await page.evaluate((Y) => { globalThis.__YAWS = Y; }, (process.env.YAWS || '0').split(',').map(Number));
    const pts = await page.evaluate((STEP) => { const w = globalThis.__meguruRun.world, out = []; for (const s of w.segments) { const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z, L = Math.hypot(dx, dz); for (let t = 40; t < L - 40; t += STEP) for (const off of (globalThis.__YAWS || [0])) out.push({ x: s.a.x + dx * t / L, z: s.a.z + dz * t / L, yaw: Math.atan2(dx, dz) + off }); } return out; }, STEP);
    let hidden = 0, partial = 0, gh = 0; const bad = [], blk = {};
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      await page.evaluate((p) => { const r = globalThis.__meguruRun; r.setPlayer(p.x, p.z); r.sim.camera.yaw = p.yaw; r.sim.placeParty(); }, p);
      const f0 = await page.evaluate(() => globalThis.__meguruRun.renderer.frames3d());
      await page.waitForFunction((f0) => globalThis.__meguruRun.renderer.frames3d() >= f0 + 2, f0, { timeout: 20000 });
      const d = await page.evaluate(() => globalThis.__meguruRun.renderer.probeNow());
      if (!d) throw new Error('Missing visibility probe: ' + region + ' sample ' + i);
      gh += d.ghosts; if (d.seen === 0) { hidden++; bad.push(Object.assign({ i, blk: d.blk }, p)); blk[d.blk] = (blk[d.blk] || 0) + 1; } else if (d.seen < 3) partial++;
    }
    for (const b of bad.slice(0, 3)) { await page.evaluate((p) => { const r = globalThis.__meguruRun; r.setPlayer(p.x, p.z); r.sim.camera.yaw = p.yaw; r.sim.placeParty(); }, b); await page.waitForTimeout(500); const box = await page.locator('#mgrCanvas').boundingBox(); await page.screenshot({ path: path.join(OUT, region + '-hidden-' + b.i + '.png'), clip: box }); }
    const st = await page.evaluate(() => globalThis.__meguruRun.renderer.stats3d());
    out[region] = { tri: await page.evaluate(() => globalThis.__meguruRun.renderer.triBreakdown()), avgGhost: gh / Math.max(1, pts.length), samples: pts.length, hidden, partial, blk, bad: bad.slice(0, 12), errors: errors.length, tris: st.triangles, calls: st.calls, long: st.diag.longFrames, up: st.diag.uploads };
    console.log(region.padEnd(12), 'avgGhost', (gh / Math.max(1, pts.length)).toFixed(1), 'samples', pts.length, 'hidden', hidden, 'partial', partial, JSON.stringify(blk), 'err', errors.length, 'tris', Math.round(st.triangles / 1000) + 'k');
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'vis-audit.json'), JSON.stringify(out, null, 1)); await browser.close(); srv.close();
})().catch((e) => { console.error('ERR', e); process.exit(2); });
