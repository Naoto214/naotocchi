// Read-only QA: compare live navigation coordinates with the visible painting.
// The optional overlay is injected only into the disposable browser document.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const pw = require(process.env.PLAYWRIGHT_MODULE || '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const repository = path.resolve(__dirname, '../..');
const runtime = path.resolve(process.env.REACH_DIST || '/tmp/v4-audit');
const output = path.resolve(process.env.REACH_OUT || '/tmp/v4-coordinates');
const config = {width: 390, height: 844, count: 4, item: true, stage: 5, safeBottom: 34};
const revisions = {
  a: '408c72e6ebef71da3eab33cfb268c7494117aaaa',
  b: '6ab53fc23747fc1982089939206c1b6087643953',
  c: 'e7032c2862320296b88969a6125ddb52af3d228a',
  d: '23b19aaf551e5b57b3333911dd4d43c479ad186f',
};
const sourceHashes = Object.fromEntries(Object.entries(revisions).map(([version, revision]) => [version,
  Object.fromEntries(['home-production-touch.js', 'home-production-transform.mjs'].map(file => [file,
    crypto.createHash('sha256').update(cp.execFileSync('git', ['show', revision + ':' + file], {cwd: repository})).digest('hex'),
  ])),
]));
const mime = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.css': 'text/css', '.woff2': 'font/woff2'};
const server = http.createServer((request, response) => {
  const file = path.resolve(runtime, '.' + new URL(request.url, 'http://localhost').pathname);
  if (!file.startsWith(runtime + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return response.writeHead(404).end();
  response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(response);
});

async function inspect(browser, version, seed) {
  const page = await browser.newPage({viewport: {width: config.width, height: config.height}, isMobile: true, hasTouch: true});
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  try {
    await page.addInitScript(({seed, slot}) => {
      localStorage.setItem('naotocchi-movement-v1-' + slot, JSON.stringify(seed));
      window.AudioContext = window.webkitAudioContext = undefined;
    }, {seed, slot: version === 'a' ? 'a' : 'b'});
    await page.clock.install({time: new Date('2026-11-15T01:00:00Z')});
    await page.clock.pauseAt(new Date('2026-11-15T01:00:01Z'));
    const entry = version === 'a' ? 'movement-a.html' : 'movement-b.html';
    await page.goto(`http://127.0.0.1:${server.address().port}/${version}/${entry}?freeze=1&polygon=shaped`, {waitUntil: 'networkidle'});
    await page.evaluate(config => {
      document.documentElement.style.setProperty('--safe-bottom', config.safeBottom + 'px');
      MovementQA.setup({...config, region: 'city'});
    }, config);
    await page.clock.runFor(2000);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(config => MovementQA.setup({...config, region: 'city'}), config);
    await page.clock.runFor(800);
    const result = await page.evaluate(async () => {
      const detail = MovementQA.detail(), presentation = detail.presentation, stage = detail.stage;
      const realHost = document.querySelector('.home-living-world').getBoundingClientRect().toJSON();
      const navigation = HomeReleaseQA.inspect().scene.navigation;
      const {selectRecoveredScene} = await import('./home-production-manifest.mjs');
      const width = Math.max(realHost.width, realHost.height / 1.5), height = width * 1.5;
      const cover = {left: realHost.left + (realHost.width - width) / 2, top: realHost.top + (realHost.height - height) / 2, width, height};
      const pair = ([x, z]) => {
        const native = navigation.project({x, z});
        const movementScreen = {
          x: presentation.x + (stage.left + native.x - presentation.x) * presentation.scaleX,
          y: presentation.y + (stage.top + native.y - presentation.y) * presentation.scaleY,
        };
        const paintingScreen = {x: cover.left + x * width, y: cover.top + z * height};
        const inverse = NaotocchiHomeViewport.unscalePoint(movementScreen);
        return {normalized: {x, z}, native, movementScreen, paintingScreen,
          difference: {x: movementScreen.x - paintingScreen.x, y: movementScreen.y - paintingScreen.y},
          roundtripError: Math.hypot(inverse.x - stage.left - native.x, inverse.y - stage.top - native.y)};
      };
      const origin = pair([0, 0]).movementScreen, unit = pair([1, 1]).movementScreen;
      return {realHost, virtualHost: presentation.world, presentation, stage, frame: detail.frame, cover,
        movementAffine: {left: origin.x, top: origin.y, width: unit.x - origin.x, height: unit.y - origin.y},
        points: [[.47, .53], [.60, .53], [.47, .96], [.60, .96], [.34, .53], [.49, .96]].map(pair),
        // Use the same baseline vertices in both projections to isolate mapping.
        // This is not a claim that this outline includes the V3 added wedge.
        baselinePolygon: selectRecoveredScene('city').ground.map(pair)};
    });
    for (const point of result.points) assert.ok(point.roundtripError < 1e-8, 'native/screen roundtrip');
    assert.deepEqual(errors, [], 'browser errors');
    if (version === 'd' && process.env.COORDINATE_OVERLAY !== '0') {
      await page.evaluate(result => {
        const canvas = document.createElement('canvas');
        canvas.width = 390; canvas.height = 844;
        canvas.style.cssText = 'position:fixed;inset:0;width:390px;height:844px;z-index:2147483647;pointer-events:none';
        document.body.appendChild(canvas);
        const context = canvas.getContext('2d');
        for (const [key, color, dash] of [['movementScreen', '#00e5ff', []], ['paintingScreen', '#ff58c4', [7, 4]]]) {
          context.beginPath();
          result.baselinePolygon.forEach((point, index) => context[index ? 'lineTo' : 'moveTo'](point[key].x, point[key].y));
          context.closePath(); context.strokeStyle = color; context.lineWidth = 2;
          context.setLineDash(dash); context.stroke();
        }
        context.setLineDash([]);
        for (const point of result.points.slice(0, 4)) {
          context.strokeStyle = '#ffffffb0'; context.lineWidth = 1;
          context.beginPath(); context.moveTo(point.movementScreen.x, point.movementScreen.y);
          context.lineTo(point.paintingScreen.x, point.paintingScreen.y); context.stroke();
          for (const [key, color] of [['movementScreen', '#00e5ff'], ['paintingScreen', '#ff58c4']]) {
            context.fillStyle = color; context.beginPath(); context.arc(point[key].x, point[key].y, 3, 0, Math.PI * 2); context.fill();
          }
        }
        context.fillStyle = '#101820e8'; context.fillRect(6, 6, 378, 60);
        context.font = '12px sans-serif'; context.fillStyle = '#ffffff';
        context.fillText('Same baseline city polygon, two coordinate projections', 12, 23);
        context.fillStyle = '#00e5ff'; context.fillText('Solid: movement / resident camera', 12, 41);
        context.fillStyle = '#ff58c4'; context.fillText('Dashed: actual painting cover (includes areas under UI)', 12, 58);
      }, result);
      await page.screenshot({path: path.join(output, 'polygon-projections.png')});
    }
    return result;
  } finally { await page.close(); }
}

(async () => {
  const seed = JSON.parse(fs.readFileSync(path.join(runtime, 'release-qa-seed.json')));
  fs.mkdirSync(output, {recursive: true});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await pw.chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox']});
    const versions = {};
    for (const version of ['a', 'b', 'c', 'd']) versions[version] = await inspect(browser, version, seed);
    for (const version of ['b', 'c', 'd']) for (const key of ['scaleX', 'scaleY', 'bodyScale']) {
      assert.ok(Math.abs(versions.a.presentation[key] - versions[version].presentation[key]) < 1e-8, 'same camera ' + version + ' ' + key);
    }
    const wrapperPage = await browser.newPage({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
    const css = fs.readFileSync(path.join(repository, 'tools/home-movement-v3/page.css'), 'utf8');
    await wrapperPage.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css + '</style><main><section><div id="play-wrap"><iframe id="play"></iframe></div></section></main>');
    const iframeLayout = await wrapperPage.evaluate(() => Object.fromEntries(['main', '#play-wrap', '#play'].map(selector => {
      const element = document.querySelector(selector);
      return [selector, {rect: element.getBoundingClientRect().toJSON(), clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, scrollLeft: element.scrollLeft}];
    })));
    await wrapperPage.close();
    const result = {config, revisions, sourceHashes, runtime, versions, iframeLayout,
      limitations: ['Chromium mobile emulation, not physical iPhone Safari.', 'Coordinate audit only: does not measure route reachability.', 'Overlay compares the same original city polygon under two mappings; it is not a proposal to make the full cover polygon walkable.', 'Runtime D comes from the worktree used to build REACH_DIST; revision hashes describe historical source comparison.']};
    const file = path.join(output, 'coordinates.json');
    fs.writeFileSync(file, JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify({file, overlay: process.env.COORDINATE_OVERLAY === '0' ? null : path.join(output, 'polygon-projections.png'), d: versions.d.points, iframeLayout}, null, 2));
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
