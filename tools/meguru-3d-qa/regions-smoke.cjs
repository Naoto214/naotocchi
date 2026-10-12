// 全地域の browser smoke: 3D で 起動・あるく・めりこみ・spot・しゃしん・perf。 node regions-smoke.cjs <root> <outDir> [regions,...]
const pw = require('playwright'); const fs = require('fs'); const path = require('path'); const http = require('http');
const ROOT = process.argv[2], OUT = process.argv[3]; const ONLY = (process.argv[4] || '').split(',').filter(Boolean); fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
function serve() { return new Promise((res) => { const s = http.createServer((req, r) => { const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }); s.listen(0, '127.0.0.1', () => res(s)); }); }
const { harness } = require(path.join(ROOT, 'tests/helpers/runtime-harness.cjs'));
function makeSave(region) { const arr = (x) => Array.from(x || []); const h = harness({ deterministic: true, fullDisplay: true }); const s = h.api.state();
  Object.assign(s, { stage: 'growing', speciesLine: 'dog', ageTicks: 600, isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 85, happiness: 90, regionId: region });
  s.lifetime.regionsVisited = [...new Set([...(s.lifetime.regionsVisited || []), region])]; if (region === 'star_stop' || region === 'memory_lake') s.lifetime.specialRegionsVisited = [...new Set([...(s.lifetime.specialRegionsVisited || []), region])];
  const comps = arr(h.api.normalCompanions).concat(arr(h.api.rareCompanions)).slice(0, 26); s.companions = comps.map((c) => ({ id: c.id, bond: 100 })); s.lifetime.companionsRecruited = comps.map((c) => c.id);
  const pc = arr(h.api.partnerCandidates)[0]; s.partner = { id: pc.id, label: pc.label || pc.name, emoji: pc.emoji, affection: 100 }; s.lifetime.partnersRecorded = [pc.id]; return JSON.stringify(s); }
const M = harness({ deterministic: true, fullDisplay: true }).api.meguruMod; const regions = ONLY.length ? ONLY : Object.keys(M.WORLDS);
(async () => {
  const srv = await serve(); const base = 'http://127.0.0.1:' + srv.address().port; const results = {};
  const browser = await pw.chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
  for (const rid of regions) {
    const R = { region: rid }; results[rid] = R;
    try {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const page = await ctx.newPage(); const errors = [], cerr = [], warn = [];
      page.on('pageerror', (e) => errors.push(String(e.message || e))); page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !/favicon|404/.test(t)) cerr.push(t.slice(0, 160)); if (/3D → 2D/.test(t)) warn.push(t.slice(0, 160)); });
      await page.addInitScript((s) => localStorage.setItem('naotocchi-save-v1', s), makeSave(rid));
      await page.goto(base + '/index.html?meguru3d=1&perf=1'); await page.locator('.device.ui-home-active').waitFor({ timeout: 60000 }); await page.waitForTimeout(1500);
      await page.locator('#travelBtn').click(); await page.locator('#meguruEnterBtn').waitFor({ state: 'visible' }); await page.locator('#meguruEnterBtn').click(); await page.locator('#mgrCanvas').waitFor({ state: 'visible' });
      const t0 = Date.now(); await page.waitForFunction(() => { const r = globalThis.__meguruRun; return r && r.world && (r.renderer.is3D || r.renderer.failed); }, { timeout: 60000 }); R.enterMs = Date.now() - t0; await page.waitForTimeout(2500);
      const info = () => page.evaluate(() => { const r = globalThis.__meguruRun; return { region: r.world.regionId, w3d: !!r.world.world3d, is3D: !!r.renderer.is3D, failed: !!r.renderer.failed, party: r.party.length, canvases: document.querySelectorAll('#meguruOverlay canvas').length, stats: r.renderer.stats3d ? r.renderer.stats3d() : null, player: { x: Math.round(r.player.x), z: Math.round(r.player.z) } }; });
      R.entry = await info();
      // penetration sampling while walking
      await page.evaluate(() => { window.__pen = { player: 0, party: 0, n: 0 }; window.__penId = setInterval(() => { const r = globalThis.__meguruRun, w = r.world; if (!w.obstacles) return; const f = (x, z, rad) => { let worst = 0; for (const o of w.obstacles) if (o.role === 'solid' || o.role === 'boundary') { const d = Math.hypot(o.x - x, o.z - z); if (o.shape === 'circle') worst = Math.max(worst, o.hw + rad - d); } return worst; }; window.__pen.player = Math.max(window.__pen.player, f(r.player.x, r.player.z, 22)); for (const a of r.party) window.__pen.party = Math.max(window.__pen.party, f(a.x, a.z, 17.6)); window.__pen.n++; }, 50); });
      const hold = async (dx, dy, ms) => { const bb = await page.locator('#meguruOverlay .mg-pad').boundingBox(); const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2; await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + dx * bb.width * 0.4, cy + dy * bb.height * 0.4, { steps: 4 }); await page.waitForTimeout(ms); await page.mouse.up(); };
      const p0 = R.entry.player; for (const [dx, dy] of [[0, -1], [0.7, -0.7], [-1, 0], [0, -1]]) await hold(dx, dy, 1200);
      const walked = await info(); R.walked = Math.round(Math.hypot(walked.player.x - p0.x, walked.player.z - p0.z)); R.pen = await page.evaluate(() => { clearInterval(window.__penId); return window.__pen; });
      R.afterWalk = walked;
      // representative spot: landmark spot if any, else the hub / middle spot
      const spot = await page.evaluate(() => { const r = globalThis.__meguruRun, sp = r.world.spots; const lm = sp.find((s) => s.landmark) || sp.find((s) => s.hub) || sp[Math.floor(sp.length / 2)]; return { id: lm.id, label: lm.label, x: lm.x, z: lm.z, landmark: lm.landmark || null }; });
      await page.evaluate(({ x, z }) => { const r = globalThis.__meguruRun; r.sim.setCameraMotion(false); r.setPlayer(x, z - 120); r.sim.camera.yaw = 0; r.sim.placeParty(); }, spot); await page.waitForTimeout(1800);
      const box = await page.locator('#mgrCanvas').boundingBox(); await page.screenshot({ path: path.join(OUT, rid + '-3d.png'), clip: box }); R.spot = spot; R.atSpot = await info();
      R.errors = errors; R.consoleErrors = cerr; R.fallbackWarnings = warn;
      await ctx.close();
    } catch (e) { R.exception = String(e.message || e).slice(0, 300); }
    const st = (R.atSpot && R.atSpot.stats) || (R.entry && R.entry.stats) || {};
    console.log(rid.padEnd(12), R.exception ? 'EXC ' + R.exception : `3D=${R.entry && R.entry.is3D} walk=${R.walked} pen=${R.pen && R.pen.player.toFixed(1)}/${R.pen && R.pen.party.toFixed(1)} party=${R.entry && R.entry.party} calls=${st.calls} tris=${st.triangles} js=${st.drawMsAvg && st.drawMsAvg.toFixed(1)} enter=${R.enterMs}ms spot=${R.spot && R.spot.id} err=${(R.errors || []).length}/${(R.consoleErrors || []).length} fb=${(R.fallbackWarnings || []).length}`);
  }
  fs.writeFileSync(path.join(OUT, 'regions-smoke.json'), JSON.stringify(results, null, 1)); await browser.close(); srv.close();
})().catch((e) => { console.error('ERR', e); process.exit(2); });
