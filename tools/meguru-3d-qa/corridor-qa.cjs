// corridor 3D QA: home -> forest (and more) in 3D. node corridor-qa.cjs <root> <outDir> [conn|from,...]
const pw = require('playwright'); const fs = require('fs'); const path = require('path'); const http = require('http');
const ROOT = process.argv[2], OUT = process.argv[3]; const ONLY = (process.argv[4] || 'home|forest|home').split(',').filter(Boolean); fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
function serve() { return new Promise((res) => { const s = http.createServer((req, r) => { const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }); s.listen(0, '127.0.0.1', () => res(s)); }); }
const { harness } = require(path.join(ROOT, 'tests/helpers/runtime-harness.cjs'));
function makeSave(region) { const arr = (x) => Array.from(x || []); const h = harness({ deterministic: true, fullDisplay: true }); const s = h.api.state();
  Object.assign(s, { stage: 'growing', speciesLine: 'dog', ageTicks: 600, isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 85, happiness: 90, regionId: region });
  for (const r of ['home','city','countryside','forest','mountain','snow','sea','deepsea','river_lake','jungle','desert']) s.lifetime.regionsVisited = [...new Set([...(s.lifetime.regionsVisited || []), r])];
  const comps = arr(h.api.normalCompanions).concat(arr(h.api.rareCompanions)).slice(0, 8); s.companions = comps.map((c) => ({ id: c.id, bond: 100 })); s.lifetime.companionsRecruited = comps.map((c) => c.id);
  return JSON.stringify(s); }
(async () => {
  const srv = await serve(); const base = 'http://127.0.0.1:' + srv.address().port; const results = {};
  const browser = await pw.chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
  for (const key of ONLY) {
    const [a, b, from] = key.split('|'); const conn = a + '|' + b, to = from === a ? b : a; const R = { conn, from, to, samples: [] }; results[key] = R;
    try {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const page = await ctx.newPage(); const errors = [], cerr = [], warn = [];
      page.on('pageerror', (e) => errors.push(String(e.message || e))); page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !/favicon|404/.test(t)) cerr.push(t.slice(0, 160)); if (/3D → 2D/.test(t)) warn.push(t.slice(0, 160)); });
      await page.addInitScript((s) => localStorage.setItem('naotocchi-save-v1', s), makeSave(from));
      await page.goto(base + '/index.html?meguru3d=1&perf=1'); await page.locator('.device.ui-home-active').waitFor({ timeout: 60000 }); await page.waitForTimeout(1200);
      await page.locator('#travelBtn').click(); await page.locator('#meguruEnterBtn').waitFor({ state: 'visible' }); await page.locator('#meguruEnterBtn').click(); await page.locator('#mgrCanvas').waitFor({ state: 'visible' });
      await page.waitForFunction(() => { const r = globalThis.__meguruRun; return r && r.world && (r.renderer.is3D || r.renderer.failed); }, { timeout: 60000 }); await page.waitForTimeout(1500);
      // stand on the gate spot, face outward (bearing of the gate), hold the pad up
      const gate = null;
      const info = () => page.evaluate(() => { const r = globalThis.__meguruRun, st = r.renderer.stats3d ? r.renderer.stats3d() : null; return { region: r.world.regionId, corridor: r.corridor ? { phase: r.corridor.phase, t: +r.corridor.t.toFixed(2), stage: r.corridor.stage } : null, is3D: !!r.renderer.is3D, failed: !!r.renderer.failed, player: st && st.player, ghosts: st && st.ghosts, calls: st && st.calls, tris: st && st.triangles, js: st && +st.drawMsAvg.toFixed(1), party: r.party.length }; });
      const bb = await page.locator('#meguruOverlay .mg-pad').boundingBox(); const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
      const hold = async (dx, dy) => { await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + dx * 40, cy + dy * 40, { steps: 3 }); };
      const release = async () => page.mouse.up();
      // find gate spot + outward dir via the sim's regionGates through sim.step? use the public spot of the connection mouth
      const mouth = null;
      R.gateInfo = gate; R.mouth = mouth;
      const mouthSpot = { 'home|forest': { home: 'bigtree', forest: 'entry' }, 'home|river_lake': { home: 'bigtree', river_lake: 'riverside' }, 'city|desert': { city: 'stalls', desert: 'caravan' }, 'desert|mountain': { desert: 'gate', mountain: 'windnotch' }, 'snow|mountain': { snow: 'peak', mountain: 'summit' }, 'forest|mountain': { forest: 'stonelook', mountain: 'lookout1' }, 'mountain|river_lake': { mountain: 'foot', river_lake: 'lakelook' }, 'city|sea': { city: 'boatpier', sea: 'port' }, 'city|countryside': { countryside: 'terracelook', city: 'cross4' }, 'countryside|forest': { countryside: 'woods', forest: 'anc2' } }[conn][from];
      let started = false;
      for (const [dx, dy, yaw] of [[0, -1, 0], [0, -1, Math.PI], [1, 0, 0], [-1, 0, 0]]) {
        await page.evaluate(({ id, yaw }) => { const r = globalThis.__meguruRun; const q = r.world.spots.find((s) => s.id === id); r.sim.setCameraMotion && r.sim.setCameraMotion(false); r.setPlayer(q.x, q.z); r.sim.camera.yaw = yaw; r.sim.placeParty(); }, { id: mouthSpot, yaw });
        await page.waitForTimeout(300); await hold(dx, dy);
        const t0 = Date.now(); while (Date.now() - t0 < 7000) { await page.waitForTimeout(250); const i = await info(); if (i.corridor) { started = true; break; } }
        if (started) break; await release(); await page.waitForTimeout(200);
      }
      R.started = started;
      if (started) {
        const shots = new Set(); const t0 = Date.now(); let last = null;
        while (Date.now() - t0 < 120000) {
          await page.waitForTimeout(300); const i = await info(); last = i; R.samples.push({ ms: Date.now() - t0, region: i.region, c: i.corridor, is3D: i.is3D, pv: i.player && i.player.ok, miss: i.player && i.player.missFrames, g: i.ghosts && i.ghosts.visible, calls: i.calls, tris: i.tris, js: i.js });
          if (i.corridor) { const q = Math.floor(i.corridor.t * 4); if (!shots.has(q)) { shots.add(q); const box = await page.locator('#mgrCanvas').boundingBox(); await page.screenshot({ path: path.join(OUT, key.replace(/\|/g, '_') + '-corridor-' + q + '.png'), clip: box }); } }
          if (!i.corridor && i.region === to) { await page.waitForTimeout(1500); const box = await page.locator('#mgrCanvas').boundingBox(); await page.screenshot({ path: path.join(OUT, key.replace(/\|/g, '_') + '-arrived.png'), clip: box }); R.arrived = await info(); break; }
        }
        await release(); R.last = last;
      }
      R.errors = errors; R.consoleErrors = cerr; R.fallbackWarnings = warn;
      await ctx.close();
    } catch (e) { R.exception = String(e.message || e).slice(0, 300); }
    const s = R.samples; const in3d = s.filter((q) => q.c).every((q) => q.is3D), pv = s.every((q) => q.pv !== false), g = Math.max(0, ...s.map((q) => q.g || 0));
    console.log(key.padEnd(24), R.exception ? 'EXC ' + R.exception : `started=${R.started} arrived=${!!R.arrived} samples=${s.length} corridor3D=${in3d} playerOK=${pv} maxGhost=${g} err=${R.errors.length}/${R.consoleErrors.length} fb=${R.fallbackWarnings.length} miss=${R.last && R.last.miss}`);
  }
  fs.writeFileSync(path.join(OUT, 'corridor-qa.json'), JSON.stringify(results, null, 1)); await browser.close(); srv.close();
})().catch((e) => { console.error('ERR', e); process.exit(2); });
