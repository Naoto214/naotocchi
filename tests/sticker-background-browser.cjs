const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const vm = require('node:vm');
const { chromium, webkit } = require('playwright');

const root = path.resolve(__dirname, '..');
const output = path.resolve('test-results/sticker-backgrounds');
fs.mkdirSync(output, { recursive: true });

let qaHtml;
require('./visual-qa.cjs')().configureServer({ middlewares: { use(_path, handler) {
  handler({}, { setHeader() {}, end(html) { qaHtml = html; } });
} } });
const qaScript = qaHtml.match(/<script>([\s\S]*?)<\/script>/)[1];
const fixtures = vm.runInNewContext(qaScript.slice(0, qaScript.indexOf('const mount=')) + '\nfixtures');

const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(target, (error, body) => {
    if (error) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(target)] || 'application/octet-stream' });
    res.end(body);
  });
});

function stickerSave() {
  const save = JSON.parse(JSON.stringify(fixtures.alone));
  Object.assign(save, { stage:'growing', speciesLine:'dog', stageIndex:5, ageTicks:500, health:100, hunger:90, energy:90, happiness:90 });
  const ids = ['form:dog:0','form:dog:1','item:bowtie','companion:cat_friend','scenery:tree','scenery:wave','scenery:snow','scenery:moon'];
  save.lifetime.specialRegionsVisited = ['star_stop', 'memory_lake'];
  save.lifetime.stickers = {
    owned:Object.fromEntries(ids.map(id => [id, 1])),
    pages:{'page-1':ids.map((id, i) => ({id, x:.16 + (i % 4) * .22, y:.28 + Math.floor(i / 4) * .42, r:(i - 3) * 5, s:i === 0 ? 1.25 : 1, k:i + 1}))},
    pageOrder:['page-1'], pageMeta:{'page-1':{background:'home'}}, tasksDone:[], packsOpened:0, seen:ids,
  };
  return save;
}

const priorities = [
  ['star_stop','orbits'], ['memory_lake','lake-ripples'], ['deepsea','deep-current'],
  ['snow','snowfield'], ['forest','small-leaves'], ['jungle','tropical-canopy'],
];

(async () => {
  await new Promise((resolve, reject) => server.listen(5193, '127.0.0.1', error => error ? reject(error) : resolve()));
  const failures = [];
  try {
    for (const [engine, type] of Object.entries({ chromium, webkit })) {
      const browser = await type.launch();
      try {
        for (const [width, height] of [[390, 844], [320, 568]]) {
          const label = `${engine}-${width}`;
          const context = await browser.newContext({ viewport:{width, height}, deviceScaleFactor:1 });
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', error => errors.push(error.message));
          await page.addInitScript(save => localStorage.setItem('naotocchi-save-v1', JSON.stringify(save)), stickerSave());
          try {
            await page.goto('http://127.0.0.1:5193/');
            await page.locator('.device.ui-home-active').waitFor();
            await page.locator('#menuBtn').click();
            await page.locator('#stickerBtn').click();
            await page.locator('#stickerOverlay:not(.hidden)').waitFor();
            const board = page.locator('#stickerBoard');
            const dimensions = await board.evaluate(element => {
              const rect = element.getBoundingClientRect();
              return {width:rect.width,height:rect.height,pageWidth:document.documentElement.scrollWidth,viewport:innerWidth,stickers:element.querySelectorAll('.sticker-placed').length};
            });
            assert.ok(dimensions.pageWidth <= dimensions.viewport + 1, `${label}: horizontal overflow`);
            assert.ok(Math.abs(dimensions.width / dimensions.height - 4 / 3) < .03, `${label}: board ratio`);
            assert.equal(dimensions.stickers, 8, `${label}: sample stickers remain visible`);

            const options = await page.locator('#stickerBackgroundSelect option').evaluateAll(nodes => nodes.map(node => node.value));
            assert.equal(JSON.stringify(options), JSON.stringify(['home','city','countryside','forest','mountain','snow','sea','deepsea','river_lake','jungle','desert','star_stop','memory_lake']));
            for (const [id, motif] of priorities) {
              await page.locator('#stickerBackgroundSelect').selectOption(id);
              await page.waitForTimeout(30);
              const state = await board.evaluate(element => ({id:element.dataset.background, image:decodeURIComponent(element.style.backgroundImage)}));
              assert.equal(state.id, id, `${label}: selected background`);
              assert.match(state.image, new RegExp(`data-motif="${motif}"`), `${label}: ${id} motif`);
              if (width === 390) await board.screenshot({path:path.join(output, `${label}-${id}.png`)});
            }

            await page.locator('#stickerBackgroundSelect').selectOption('forest');
            await page.locator('#stickerExportBtn').click();
            const exported = page.locator('#stickerExportView img');
            await exported.waitFor();
            const imageSize = await exported.evaluate(image => ({width:image.naturalWidth,height:image.naturalHeight}));
            assert.deepEqual(imageSize, {width:640,height:480}, `${label}: exported PNG size`);
            assert.deepEqual(errors, [], `${label}: page errors`);
            console.log(`PASS sticker backgrounds ${label}`);
          } catch (error) {
            failures.push(`${label}: ${error.stack || error.message}`);
            console.error(`FAIL sticker backgrounds ${label}: ${error.message}`);
          } finally { await context.close(); }
        }
      } finally { await browser.close(); }
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
