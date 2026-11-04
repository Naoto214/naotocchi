// Reuse the existing V5 UI QA against the final V6 runtime; never touch real saves.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const dest = path.join(root, 'test-results/naokoro-first-start');
const mime = {'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless:true});
  const evidence = {errors:[]};
  fs.mkdirSync(dest, {recursive:true});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    page.on('pageerror', error => evidence.errors.push(error.message));
    await page.goto(base);
    await page.locator('#menuBtn').click();
    await page.locator('#naokoroBtn').click();
    await page.locator('#naokoroDialog a.independent-game').click();
    await page.waitForURL('**/prototypes/life-sugoroku/');
    evidence.menuEntry = page.url();
    await page.goto(base + '/tools/life-sugoroku/qa-v5.html');
    await page.waitForFunction(() => document.querySelector('#view').contentWindow.lifeDebug);
    await page.locator('#branches').click();
    await page.waitForFunction(() => {
      try { return JSON.parse(document.querySelector('#report').textContent).complete === true; } catch { return false; }
    }, null, {timeout:180000});
    evidence.branches = JSON.parse(await page.locator('#report').textContent());
    assert.equal(evidence.branches.count, 128);
    assert.deepEqual(evidence.branches.failed, []);
    await page.locator('#auto-match').click();
    await page.waitForFunction(() => {
      const raw = sessionStorage.getItem('naokoro-v4-browser-match');
      return raw && JSON.parse(raw).done;
    }, null, {timeout:240000});
    evidence.match = await page.evaluate(() => JSON.parse(sessionStorage.getItem('naokoro-v4-browser-match')));
    assert.equal(evidence.match.players.length, 4);
    assert.ok(evidence.match.round >= 15);
    assert.ok(evidence.match.games.length > 0);
    assert.deepEqual(evidence.match.errors, []);
    assert.deepEqual(evidence.errors, []);
    console.log('FIRST START menu entry, 128 restored branches, 4-player 15R browser match passed');
  } finally {
    fs.writeFileSync(path.join(dest,'results.json'), JSON.stringify(evidence,null,2));
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); server.close(); process.exitCode=1; });
