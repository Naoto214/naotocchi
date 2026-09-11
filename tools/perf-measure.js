#!/usr/bin/env node
// ミニゲームごとの フレーム時間を はかる(どの ゲームが おもいか を しる ための どうぐ)。
// つかいかた:
//   node tools/perf-measure.js                 … 全ゲーム、1本 3秒
//   node tools/perf-measure.js --ms 5000       … 1本 5秒
//   node tools/perf-measure.js --throttle 4    … CPU を 4倍 おそく(スマホ相当)
//   node tools/perf-measure.js --json out.json … けっかを JSON にも のこす
//   node tools/perf-measure.js snake-classic jenga-tower … id を しぼる
// playwright が ひつよう(npm i -g playwright / NODE_PATH=$(npm root -g))。
// ページの rAF の 間かくを 記録し、へいきん・p95・最大 と canvas の かず を 出す。
// 平均 22ms を こえる ゲームは script.js の けいりょうモード(tier 1)が、34ms で tier 2 が はたらく。
const http = require('http');
const fs = require('fs');
const path = require('path');
let pw;
try { pw = require('playwright'); } catch (e) { console.error('playwright が みつかりません: NODE_PATH=$(npm root -g) node tools/perf-measure.js'); process.exit(2); }

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const MS = Number(opt('--ms', 3000));
const THROTTLE = Number(opt('--throttle', 1));
const JSON_OUT = opt('--json', null);
const ids = args.filter((a, i) => !a.startsWith('--') && !['--ms', '--throttle', '--json'].includes(args[i - 1]));

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (p === '/script.js') {
    // IIFE の さいごに 測定用の フックを たす(ゲーム一覧と startMinigame だけ)
    let s = fs.readFileSync(f, 'utf8');
    s = s.replace(/\}\)\(\);\s*$/, ';globalThis.__PERF={games:[...new Set([...MINIGAMES,...Object.values(REGION_MINIGAMES).flat().map(x=>x.game),...Object.values(SEASONAL_MINIGAMES).flat().map(x=>x.game)])],startMinigame,retireMinigame,el,state,hatchEgg,render};})();');
    res.setHeader('content-type', 'text/javascript'); res.end(s); return;
  }
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; res.end(); return; } res.setHeader('content-type', mime[path.extname(f)] || 'application/octet-stream'); res.end(d); });
});

(async () => {
  await new Promise((r) => srv.listen(0, r));
  const port = srv.address().port;
  const browser = await pw.chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (THROTTLE > 1) { const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE }); }
  await page.goto(`http://localhost:${port}/`);
  await page.waitForTimeout(400);
  await page.evaluate(() => { const P = globalThis.__PERF; P.hatchEgg(); P.state.energy = 100; P.render(); });
  const all = await page.evaluate(() => globalThis.__PERF.games.map((g) => g.id));
  const targets = ids.length ? all.filter((id) => ids.includes(id)) : all;
  const rows = [];
  for (const id of targets) {
    const before = errors.length;
    const r = await page.evaluate(async ({ id, ms }) => {
      const P = globalThis.__PERF;
      const g = P.games.find((x) => x.id === id);
      const deltas = [];
      let last = 0, raf = 0;
      const probe = (t) => { if (last) deltas.push(t - last); last = t; raf = requestAnimationFrame(probe); };
      P.startMinigame(g);
      const ov = P.el.minigameOverlay;
      const sleep = (n) => new Promise((r) => setTimeout(r, n));
      const fire = (el, type) => { try { const b = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, clientX: b.left + b.width * (0.3 + Math.random() * 0.4), clientY: b.top + b.height * (0.3 + Math.random() * 0.4) })); } catch (e) {} };
      await sleep(1100); // はじまりの 演出を とばす
      raf = requestAnimationFrame(probe);
      const t0 = performance.now();
      while (performance.now() - t0 < ms) {
        const btns = [...ov.querySelectorAll('button:not(:disabled)')];
        if (btns.length && Math.random() < 0.7) { const b = btns[Math.floor(Math.random() * btns.length)]; fire(b, 'pointerdown'); await sleep(50); fire(b, 'pointerup'); }
        const cv = ov.querySelector('canvas');
        if (cv) { fire(cv, 'pointerdown'); await sleep(40); fire(cv, 'pointermove'); await sleep(40); fire(cv, 'pointerup'); }
        await sleep(120);
      }
      cancelAnimationFrame(raf);
      const canvases = [...ov.querySelectorAll('canvas')].map((c) => `${c.width}x${c.height}`);
      P.retireMinigame();
      const sorted = deltas.slice().sort((a, b) => a - b);
      const avg = deltas.reduce((a, b) => a + b, 0) / Math.max(1, deltas.length);
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
      const max = sorted[sorted.length - 1] || 0;
      return { frames: deltas.length, avg, p95, max, canvases };
    }, { id, ms: MS });
    rows.push({ id, ...r, errors: errors.slice(before) });
    process.stderr.write(`${id.padEnd(28)} avg ${r.avg.toFixed(1).padStart(5)}ms  p95 ${r.p95.toFixed(1).padStart(5)}ms  max ${r.max.toFixed(0).padStart(4)}ms  frames ${String(r.frames).padStart(4)}  ${r.canvases.join(' ')}\n`);
    await page.waitForTimeout(150);
  }
  await browser.close(); srv.close();
  rows.sort((a, b) => b.avg - a.avg);
  console.log(`\n== おもい じゅん (1本 ${MS}ms, CPU x${THROTTLE}) ==`);
  console.log('id'.padEnd(28) + ' avg(ms)  p95(ms)  max(ms)  frames  tier');
  for (const r of rows) {
    const tier = r.avg > 34 ? 2 : r.avg > 22 ? 1 : 0;
    console.log(r.id.padEnd(28) + ' ' + r.avg.toFixed(1).padStart(7) + '  ' + r.p95.toFixed(1).padStart(7) + '  ' + r.max.toFixed(0).padStart(7) + '  ' + String(r.frames).padStart(6) + '  ' + tier + (r.errors.length ? '  ERROR ' + r.errors[0] : ''));
  }
  const heavy = rows.slice(0, 10);
  console.log(`\nいちばん おもい 10本: ${heavy.map((r) => `${r.id}(${r.avg.toFixed(1)})`).join(', ')}`);
  console.log(`ページエラー ${errors.length}`);
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ ms: MS, throttle: THROTTLE, rows }, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
