#!/usr/bin/env node
// Character 3D QA: gallery の URL を headless chromium で しゃしんに する(QA 専用。ゲームの セーブは さわらない)。
//   NODE_PATH=$(npm root -g) node tools/character-3d/shot.cjs <out.png> "<gallery の query>" [width] [height]
// headless の WebGL は SwiftShader(ソフトウェア)。見た目の 確認 用で、iPhone の 速さとは ちがう
const http = require('http'), fs = require('fs'), path = require('path');
const pw = require('playwright');
const ROOT = path.join(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
function serve(opts = {}) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
      if(opts.claude && /^\/character-3d\/(spec\.js|spec-esm\.mjs|geometry\.mjs|rig\.mjs|archetypes\.mjs|animate\.mjs|runtime\.mjs)$/.test(req.url.split('?')[0])) {
        file=path.join(ROOT,'docs/qa/character-3d-quality-2026-10-02/claude',path.basename(file));
        let body=fs.readFileSync(file,'utf8').replaceAll('../../../../vendor/','../vendor/');
        res.writeHead(200,{'content-type':'text/javascript'});res.end(body);return;
      }
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}
async function shots(list, opts = {}) {
  const srv = await serve(); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const out = [];
  try {
    for (const s of list) {
      const page = await browser.newPage({ viewport: { width: s.w || 900, height: s.h || 900 }, deviceScaleFactor: s.dpr || 1 });
      const errs = []; page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
      await page.goto(`${base}/character-3d/gallery.html?${s.q}`);
      await page.waitForFunction(() => window.__c3d && window.__c3d.items.length > 0, null, { timeout: 30000 });
      await page.waitForTimeout(s.wait || 600);
      const el = await page.$(s.full || /bare=1/.test(s.q) ? 'body' : '#stage');
      await el.screenshot({ path: s.out });
      out.push({ out: s.out, errors: errs });
      await page.close();
    }
  } finally { await browser.close(); srv.close(); }
  return out;
}
module.exports = { shots, serve };
if (require.main === module) {
  const [o, q, w, h] = process.argv.slice(2);
  shots([{ out: o, q: q || '', w: Number(w) || 900, h: Number(h) || 900 }]).then((r) => console.log(JSON.stringify(r)));
}
