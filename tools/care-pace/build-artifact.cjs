'use strict';
// お世話の頻度 監査 VERSION 2: スマホで ひらける「本物の 2.5D ホーム × B2案」の 試遊パッケージを つくる。
//
//   node tools/care-pace/build-artifact.cjs build  <出力フォルダ>   … game.html・差し替え済みの script・開始セーブを つくる
//   node tools/care-pace/build-artifact.cjs record <出力フォルダ>   … 実ブラウザで 地域×時間帯×天気を まわし、読みこまれた ファイルを 同梱する
//   node tools/care-pace/build-artifact.cjs files  <出力フォルダ>   … 公開用の ファイル一覧(JSON)
//
// パッケージは 本体の 写しで、本番の セーブ(naotocchi-save-v1)には 書かない。
// 試遊用の 割りきり(本体の B2案には ふくめない):
//   - 生まれる 種族を「いぬ」に 固定(同梱する 絵を へらすため)
//   - 開始セーブ: わかもの(24さい)・なかま4にん・こいびと1にん。地域は もり/おうち/うみ/とかい から えらぶ
//   - #…-x4 で 時間を 4倍に できる(確認用)
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const ROOT = path.resolve(__dirname, '..', '..');
const { scriptPatches, careStatusPatches, applyPatches, PLANS } = require('./plans.cjs');
const PLAN = 'B2';
const SAVE_KEY = 'naotocchi-carepace-trial-v1';
const REGIONS = ['forest', 'home', 'sea', 'city'];

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function write(out, rel, text) { const f = path.join(out, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); }

function patchedScript() {
  let src = applyPatches(read('script.js'), scriptPatches(PLAN), PLAN);
  src = src.split("'naotocchi-save-v1").join("'" + SAVE_KEY);
  const once = (find, replace) => { if (src.split(find).length !== 2) throw new Error('試遊用の差し替えが当たりません: ' + find); src = src.replace(find, replace); };
  once('const TICK_MS = 3000;', 'const TICK_MS = 3000 / (window.__carePaceSpeed || 1);');
  once('state.speciesLine = reservedLine || pickRandomLine();', "state.speciesLine = reservedLine || 'dog'; // 試遊用: 同梱する 絵を へらすため いぬに 固定");
  return src;
}

// 開始セーブ: 本物の script.js(B2)を VM で うごかして つくる
function fixtures() {
  const realRead = fs.readFileSync;
  const patched = applyPatches(realRead.call(fs, path.join(ROOT, 'script.js'), 'utf8'), scriptPatches(PLAN), PLAN);
  fs.readFileSync = function (file, ...rest) { return file === 'script.js' ? patched : realRead.call(fs, file, ...rest); };
  const modPath = require.resolve(path.join(ROOT, 'tests/helpers/runtime-harness.cjs'));
  delete require.cache[modPath];
  let H;
  const cwd = process.cwd();
  process.chdir(ROOT);
  try { H = require(modPath); } finally { fs.readFileSync = realRead; }
  const out = {};
  try {
    for (const regionId of REGIONS) {
      const h = H.harness({ deterministic: true, seed: 20261125 });
      const a = h.api;
      const s = a.state();
      const region = a.REGIONS.find(r => r.id === regionId);
      const partnerRegion = region.candidates && region.candidates.length ? region : a.REGIONS.find(r => r.id === 'forest');
      const cand = partnerRegion.candidates.find(c => c.attractedTo && c.attractedTo.length >= 2) || partnerRegion.candidates[0];
      const companions = a.normalCompanions.slice(0, 4).map(c => ({ id: c.id, bond: 100 }));
      Object.assign(s, {
        stage: 'growing', speciesLine: 'dog', stageIndex: 5, ageTicks: 24 * 20, sodachi: 45, maxSodachi: 45, growth: 0, decline: 0, deathMeter: 0,
        hunger: 85, happiness: 85, energy: 85, health: 100, poopCount: 0, isSick: false, isSleeping: false,
        gender: 'female', orientationId: 'bi', attractedTo: ['female', 'male', 'nonbinary'],
        regionId, companions,
        partner: { id: cand.id, label: cand.label, emoji: cand.emoji, gender: cand.gender, orientationId: cand.orientationId,
          attractedTo: [...cand.attractedTo], affinityHeart: cand.affinityHeart, affection: 100, married: false, bondCount: 0 },
        savedAt: 0,
      });
      s.lifetime.visitedRegions = Array.from(new Set([...(s.lifetime.visitedRegions || []), regionId]));
      out[regionId] = JSON.parse(JSON.stringify(s));
    }
  } finally { process.chdir(cwd); }
  return out;
}

function gameHtml() {
  let html = read('index.html');
  const once = (find, replace, label) => { if (html.split(find).length !== 2) throw new Error(label + ' が見つかりません'); html = html.replace(find, replace); };
  once("var KEY = 'naotocchi-save-v1',", `var KEY = '${SAVE_KEY}',`, 'rescue key');
  html = html.replace(/<title>なおとっち<\/title>/, '<title>なおとっち B2試遊</title>');
  // 起動前: 時間の速さ・開始セーブ(セーブが まだ ないときだけ)
  once('<head>\n', `<head>\n<!-- 生成物: tools/care-pace/build-artifact.cjs(お世話の頻度 監査 VERSION 2)。直接 編集しない -->\n<script src="care-pace/fixtures.js"></script>\n<script src="care-pace/boot.js"></script>\n`, 'head');
  const cs = html.match(/<script src="care-status\.js\?v=[^"]*"><\/script>/);
  html = html.replace(cs[0], '<script src="care-pace/care-status.B2.js"></script>');
  const sj = html.match(/<script src="script\.js\?v=[^"]*"><\/script>/);
  html = html.replace(sj[0], '<script src="care-pace/script.B2.js"></script>\n  <script src="care-pace/hud.js"></script>');
  return html;
}

const BOOT = `/* 試遊ページの 起動前処理(お世話の頻度 監査 VERSION 2) */
(function () {
  var KEY = '${SAVE_KEY}';
  var hash = (location.hash || '').replace('#', '');
  var parts = hash.split('-');
  var region = /^(forest|home|sea|city)$/.test(parts[0]) ? parts[0] : 'forest';
  window.__carePaceSpeed = parts.indexOf('x4') >= 0 ? 4 : 1;
  window.__carePace = { plan: '${PLAN}', speed: window.__carePaceSpeed, saveKey: KEY, hudCollapsed: true, hudHidden: window.parent !== window,
    plans: { PLANS: { ${PLAN}: { short: 'B2', poopNotice: ${PLANS[PLAN].poopNotice} } } } };
  try {
    var want = parts.indexOf('reset') >= 0;
    if (want) Object.keys(localStorage).forEach(function (k) { if (k.indexOf(KEY) === 0) localStorage.removeItem(k); });
    if (want) try { history.replaceState(null, '', location.pathname + '#' + hash.replace('-reset', '')); } catch (e) { /* 戻せなくても よい */ }
    if (!localStorage.getItem(KEY)) {
      var f = JSON.parse(JSON.stringify(window.__carePaceFixtures[region]));
      f.savedAt = Date.now();
      localStorage.setItem(KEY, JSON.stringify(f));
    }
  } catch (e) { /* localStorage が つかえなくても 本体が 新しい たまごで はじまる */ }
})();
`;

function build(out) {
  fs.mkdirSync(out, { recursive: true });
  write(out, 'game.html', gameHtml());
  write(out, 'care-pace/script.B2.js', patchedScript());
  write(out, 'care-pace/care-status.B2.js', applyPatches(read('care-status.js'), careStatusPatches(PLAN), PLAN));
  write(out, 'care-pace/fixtures.js', 'window.__carePaceFixtures = ' + JSON.stringify(fixtures()) + ';\n');
  write(out, 'care-pace/boot.js', BOOT);
  let hud = read('comparisons/care-pace-20261125/care-pace-hud.js');
  hud = hud.replace("var box, body, open = true;", "var box, body, open = !api.hudCollapsed;");
  hud = hud.replace("if (params.get('hud') !== '0') build();", "if (params.get('hud') !== '0' && !api.hudHidden) build();");
  hud = hud.replace("    body = document.createElement('div');\n", "    body = document.createElement('div');\n    body.style.display = open ? 'block' : 'none';\n");
  write(out, 'care-pace/hud.js', hud);
  console.log('built', out);
}

// 記録用の サーバー: パッケージに あれば それを、なければ リポジトリから 返し、返した ものを 記録する
function serve(out, used) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
  return http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
    for (const base of [out, ROOT]) {
      const f = path.join(base, rel);
      if (f.startsWith(base) && fs.existsSync(f) && fs.statSync(f).isFile()) {
        if (base === ROOT) used.add(rel);
        res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
        return fs.createReadStream(f).pipe(res);
      }
    }
    used.add('MISSING:' + rel);
    res.writeHead(404); res.end();
  }).listen(0, '127.0.0.1');
}

async function record(out) {
  const { chromium, devices } = require('playwright');
  const used = new Set();
  const server = serve(out, used);
  await new Promise(r => server.on('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const errors = [];
  for (const region of REGIONS) {
    for (const time of ['morning', 'day', 'evening', 'night']) {
      for (const weather of time === 'day' ? ['sunny', 'rain', 'snow', 'cloudy'] : ['sunny']) {
        const ctx = await browser.newContext({ ...devices['iPhone 13'] });
        await ctx.addInitScript(([key, time, weather, region]) => {
          if (sessionStorage.getItem('carepace-seeded')) return;
          sessionStorage.setItem('carepace-seeded', '1');
          const f = JSON.parse(JSON.stringify(window.__carePaceFixtures ? window.__carePaceFixtures[region] : {}));
          window.__carePaceRecord = { key, time, weather };
        }, [SAVE_KEY, time, weather, region]);
        const page = await ctx.newPage();
        page.on('pageerror', e => errors.push(`${region}/${time}/${weather}: ${e.message}`));
        await page.goto(`${base}/game.html#${region}`, { waitUntil: 'load' });
        // 時間帯・天気を 手で えらんだ ことに して 読みなおす
        await page.evaluate(([key, time, weather]) => { const s = JSON.parse(localStorage.getItem(key)); s.lifetime.timeMode = time; s.lifetime.weatherMode = weather; localStorage.setItem(key, JSON.stringify(s)); }, [SAVE_KEY, time, weather]);
        await page.reload({ waitUntil: 'load' });
        await page.waitForFunction(() => window.__naotocchiBooted === true, null, { timeout: 30000 }).catch(() => errors.push(`${region}/${time}: boot timeout`));
        const click = id => page.evaluate(id => { const d = document.getElementById('individualityDialog'); if (d && !d.classList.contains('hidden')) document.getElementById('individualityLater').click(); document.getElementById(id)?.click(); }, id);
        for (const id of ['feedBtn', 'playWithBtn', 'cleanBtn', 'courtBtn', 'sleepBtn', 'feedBtn', 'playWithBtn']) { await page.waitForTimeout(1500); await click(id); }
        await page.waitForTimeout(6000);
        await ctx.close();
      }
    }
    process.stderr.write(`recorded ${region} (${used.size})\n`);
  }
  // いぬの 全段階・表情、なかま・こいびとの 絵は 時間で 出かたが かわるので まとめて 入れる
  const addDir = d => { for (const f of fs.readdirSync(path.join(ROOT, d))) { const rel = path.join(d, f); if (fs.statSync(path.join(ROOT, rel)).isFile()) used.add(rel); } };
  addDir('assets/characters/dog'); addDir('assets/characters/expressions/dog'); addDir('assets/characters/egg');
  for (const bgm of ['home-morning.m4a', 'home-day.m4a', 'home-evening.m4a', 'home-night.m4a', 'ohayo.m4a', 'lullaby-a.m4a']) if (fs.existsSync(path.join(ROOT, 'assets/bgm', bgm))) used.add('assets/bgm/' + bgm);
  for (const rel of extraFiles()) used.add(rel);
  await browser.close();
  server.close();
  const missing = [...used].filter(u => u.startsWith('MISSING:')).map(u => u.slice(8));
  const files = [...used].filter(u => !u.startsWith('MISSING:'));
  for (const rel of files) { const dst = path.join(out, rel); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(path.join(ROOT, rel), dst); }
  const size = files.reduce((a, rel) => a + fs.statSync(path.join(ROOT, rel)).size, 0);
  fs.writeFileSync(path.join(out, 'care-pace/record.json'), JSON.stringify({ files: files.sort(), missing, errors: errors.slice(0, 50) }, null, 1));
  console.log('files', files.length, 'MB', (size / 1e6).toFixed(1), 'missing', missing.length, 'errors', errors.length);
  if (missing.length) console.log('missing sample', missing.slice(0, 20));
  if (errors.length) console.log('errors sample', errors.slice(0, 5));
}

// 時間帯(朝・昼・夕・夜)と 季節で かわる 背景は、記録した 時刻に よらず 4地域ぶん まとめて 入れる
function extraFiles() {
  const out = [];
  const dayparts = read('home-dayparts.mjs');
  for (const m of dayparts.matchAll(/"(comparisons\/dayparts-20261103\/[^"]+\.webp)"/g)) {
    if (REGIONS.some(r => m[1].includes('/' + r + '-'))) out.push(m[1]);
  }
  for (const f of fs.readdirSync(path.join(ROOT, 'assets/world'))) {
    if (/^(forest|sea|city|home)[-_].*\.webp$/.test(f)) out.push('assets/world/' + f);
  }
  return out.filter(rel => fs.existsSync(path.join(ROOT, rel)));
}
function addExtras(out) {
  const files = extraFiles();
  for (const rel of files) { const dst = path.join(out, rel); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(path.join(ROOT, rel), dst); }
  console.log('extras', files.length);
}

function list(out) {
  const files = [];
  const walk = d => { for (const f of fs.readdirSync(path.join(out, d))) { const rel = d ? d + '/' + f : f; const st = fs.statSync(path.join(out, rel)); if (st.isDirectory()) walk(rel); else files.push({ rel, size: st.size }); } };
  walk('');
  console.log(JSON.stringify({ count: files.length, mb: +(files.reduce((a, f) => a + f.size, 0) / 1e6).toFixed(1), big: files.filter(f => f.size > 15e6).map(f => f.rel) }));
  return files;
}

if (require.main === module) {
  const [cmd, out] = process.argv.slice(2);
  if (!out) throw new Error('出力フォルダを指定してください');
  if (cmd === 'build') build(path.resolve(out));
  else if (cmd === 'record') record(path.resolve(out)).catch(e => { console.error(e); process.exit(1); });
  else if (cmd === 'files') list(path.resolve(out));
  else if (cmd === 'extras') addExtras(path.resolve(out));
}
module.exports = { build, record, list, SAVE_KEY };
