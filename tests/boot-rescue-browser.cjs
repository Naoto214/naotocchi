// RH-9 起動の 救済(Roadmap §8.3)。本物の index.html を Chromium と WebKit で ひらく。
// script.js を「起動中に 例外を 出す もの」「とどかない もの」に さしかえて、パネルと 3 つの ボタンを たしかめる。
// ふつうに 起動した ときは パネルが 出ない。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium, webkit } = require('playwright');

const root = path.resolve(__dirname, '..');
const KEY = 'naotocchi-save-v1', BACKUP = KEY + '-backup', SNAPS = KEY + '-snaps', RESCUED = KEY + '-rescued';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
let mode = 'normal';
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  if (pathname === '/script.js' && mode === 'throw') { res.writeHead(200, { 'Content-Type': TYPES['.js'] }); res.end('throw new Error("rh9 boot failure");'); return; }
  if (pathname === '/script.js' && mode === 'missing') { res.writeHead(404).end(); return; }
  const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(target, (error, body) => {
    if (error) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(target)] || 'application/octet-stream' });
    res.end(body);
  });
});
const decode = (code) => Buffer.from(code.slice('NTS1.'.length), 'base64url').toString('utf8');
const PRIMARY = JSON.stringify({ stage: 'growing', lifetime: { money: 123 }, note: 'primary' });
const OLDER = JSON.stringify({ stage: 'growing', lifetime: { money: 77 }, note: 'snapshot' });
const BACKUP_RAW = JSON.stringify({ stage: 'growing', lifetime: { money: 100 }, note: 'backup' });

async function withPage(browser, fn) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(([k, b, s, p, bk, o]) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem(k, p); localStorage.setItem(b, bk);
    localStorage.setItem(s, JSON.stringify([{ at: Date.parse('2026-09-20T01:00:00Z'), raw: o }]));
  }, [KEY, BACKUP, SNAPS, PRIMARY, BACKUP_RAW, OLDER]);
  const page = await context.newPage();
  try { await fn(page); } finally { await context.close(); }
}

(async () => {
  await new Promise((resolve, reject) => server.listen(5197, '127.0.0.1', (e) => (e ? reject(e) : resolve())));
  const failures = [];
  try {
    for (const [engine, type] of Object.entries({ chromium, webkit })) {
      let browser;
      try { browser = await type.launch(engine === 'chromium' && process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}); } catch (e) { if (engine === 'webkit' && process.env.CI !== 'true') { console.log(`skip ${engine}: ${e.message.split('\n')[0]}`); continue; } throw e; }
      try {
        // 1) 起動中に 例外 → すぐ パネル。3 つの ボタン(危なくない 順)
        mode = 'throw';
        await withPage(browser, async (page) => {
          await page.goto('http://127.0.0.1:5197/');
          await page.waitForSelector('#bootRescue', { timeout: 5000 });
          const labels = await page.$$eval('#bootRescue button', (bs) => bs.map((b) => b.textContent));
          assert.deepEqual(labels, ['もういちど よみこむ', 'セーブコードを うつす', 'じどうバックアップから もどす'], `${engine}: order`);
          assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), 'bootRescueReload', `${engine}: reload is focused`);
          // 2) セーブコード: 主キーと backup の 2 つ(NTS1.)
          await page.click('#bootRescueCopy');
          const codes = (await page.inputValue('#bootRescueCode')).split('\n\n');
          assert.deepEqual(codes.map(decode), [PRIMARY, BACKUP_RAW], `${engine}: codes`);
          // 3) バックアップから もどす: 一覧 → 1 回目は 確認 → 2 回目で 書いて reload。もどす まえの きろくは のこす
          await page.click('#bootRescueRestore');
          const snap = page.locator('#bootRescueSnaps button');
          assert.equal(await snap.count(), 1, `${engine}: one snapshot`);
          await snap.click();
          assert.match(await snap.textContent(), /ほんとうに もどす/);
          assert.equal(await page.evaluate((k) => localStorage.getItem(k), KEY), PRIMARY, `${engine}: nothing written before confirming`);
          await Promise.all([page.waitForEvent('load'), snap.click()]);
          assert.equal(await page.evaluate((k) => localStorage.getItem(k), KEY), OLDER, `${engine}: restored`);
          assert.equal(await page.evaluate((k) => localStorage.getItem(k), RESCUED), PRIMARY, `${engine}: replaced save kept`);
          await page.waitForSelector('#bootRescue', { timeout: 5000 });
          // 1) もういちど よみこむ
          await Promise.all([page.waitForEvent('load'), page.click('#bootRescueReload')]);
        });
        // script.js が とどかない → 6 秒で パネル
        mode = 'missing';
        await withPage(browser, async (page) => {
          await page.goto('http://127.0.0.1:5197/');
          await page.waitForSelector('#bootRescue', { timeout: 9000 });
        });
        // ふつうの 起動では 出ない
        mode = 'normal';
        await withPage(browser, async (page) => {
          const errors = [];
          page.on('pageerror', (e) => errors.push(e.message));
          await page.goto('http://127.0.0.1:5197/');
          await page.waitForFunction(() => window.__naotocchiBooted === true, null, { timeout: 15000 });
          await page.waitForTimeout(6500);
          assert.equal(await page.$('#bootRescue'), null, `${engine}: no panel after a normal boot`);
          assert.deepEqual(errors, [], `${engine}: no page errors`);
        });
        // 複数タブ(RH-9 §8.2): reload は 同じ タブ なので 止まらない。2 つめの タブを ひらくと まえの タブが 読みとり専用に なる
        {
          const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
          const booted = (p) => p.waitForFunction(() => window.__naotocchiBooted === true, null, { timeout: 15000 });
          const notice = (p) => p.evaluate(() => (document.getElementById('message') || {}).textContent || '');
          const a = await context.newPage();
          await a.goto('http://127.0.0.1:5197/'); await booted(a);
          for (let i = 0; i < 2; i++) { await a.reload(); await booted(a); await a.waitForTimeout(500); }
          assert.doesNotMatch(await notice(a), /べつのタブ/, `${engine}: a reload is the same tab`);
          const b = await context.newPage();
          await b.goto('http://127.0.0.1:5197/'); await booted(b);
          await a.waitForFunction(() => /べつのタブ/.test((document.getElementById('message') || {}).textContent || ''), null, { timeout: 5000 });
          assert.doesNotMatch(await notice(b), /べつのタブ/, `${engine}: the newer tab keeps going`);
          await context.close();
        }
        console.log(`PASS ${engine}`);
      } catch (e) {
        failures.push(`${engine}: ${e.message}`);
      } finally { await browser.close(); }
    }
  } finally { server.close(); }
  if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
})();
