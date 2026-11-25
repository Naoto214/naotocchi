#!/usr/bin/env node
// Builds the private comparison: the production home renderer beside the proposal overlay.
// usage: node comparisons/home-environment-v1/build.cjs <output-dir>
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const [out] = process.argv.slice(2);
if (!out || path.resolve(out).startsWith(root + path.sep)) throw new Error('Choose an output directory outside the repository.');
const write = (file, data) => { fs.mkdirSync(path.dirname(path.join(out, file)), {recursive:true}); fs.writeFileSync(path.join(out, file), data); };
const unpin = source => source.replace(/(\.mjs)\?v=[0-9a-f-]+/g, '$1');
const proposal = path.join(__dirname, 'proposal');
const modules = fs.readdirSync(root).filter(name => /^home-.*\.mjs$/.test(name));
// The baseline is this checkout's production home; the proposal overlays its four files.
for (const name of modules) write('baseline/' + name, unpin(fs.readFileSync(path.join(root, name), 'utf8')));
for (const name of new Set([...modules, ...fs.readdirSync(proposal).filter(name => name.endsWith('.mjs'))])) {
  const source = fs.existsSync(path.join(proposal, name)) ? path.join(proposal, name) : path.join(root, name);
  write('proposal/' + name, unpin(fs.readFileSync(source, 'utf8')));
}
for (const name of fs.readdirSync(path.join(proposal, 'living'))) write('proposal/living/' + name, fs.readFileSync(path.join(proposal, 'living', name)));
write('world-scene.js', fs.readFileSync(path.join(root, 'world-scene.js')));
write('compare.mjs', fs.readFileSync(path.join(__dirname, 'compare.mjs')));
for (const name of ['leaf-v1.webp', 'blossom-v1.webp']) write('assets/world/' + name, fs.readFileSync(path.join(root, 'assets/world', name)));
const images = [...fs.readFileSync(path.join(root, 'home-dayparts.mjs'), 'utf8').matchAll(/"(comparisons\/[^"]+\.webp)"/g)].map(m => m[1]);
for (const file of images) write(file, fs.readFileSync(path.join(root, file)));
// Only the particle rules are needed; the page keeps its own layout.
const css = [path.join(root, 'world-scene.css'), path.join(root, 'home-dayparts.css')].map(file => fs.readFileSync(file, 'utf8')).join('\n')
  .split('\n').filter(line => /^(\.world-(particle|mote|plankton|firefly|spark|rain|snow|leaf|petal|dust)|\.home-dayparts-fx|@keyframes world-(drift|twinkle|rain|fall))/.test(line)).join('\n');
// Real-home section: links into the packaged home, captured A|B|C strips and measured pacing.
const evidence = path.join(__dirname, 'evidence');
const REGION = ['おうち','もり','かわ','とかい','いなか','やま','ゆきぐに','うみ','ジャングル','さばく','しんかい','ほしぞら','きおくのみずうみ'];
const SEASON = ['はる','なつ','あき','ふゆ'], WEATHER = ['晴れ','曇り','雨','雪'], TIME = ['朝','昼','夕','夜'];
const sceneName = tail => { const [count, r, s, w, t] = tail.split('-').map(Number); return `${REGION[r]}・${SEASON[s]}・${WEATHER[w]}・${TIME[t]}・${count}体`; };
function gallery() {
  if (!fs.existsSync(path.join(evidence, 'tree.json'))) return '';
  const tree = JSON.parse(fs.readFileSync(path.join(evidence, 'tree.json'), 'utf8'));
  const rows = tree.perf.map(r => `<tr><td>${sceneName(r.scene)}</td><td>${r.rate === 1 ? '通常' : r.rate + '倍低速'}</td>${['tips','branch','wide','vivid'].map(k => `<td>${r[k] ?? '—'}</td>`).join('')}</tr>`).join('');
  return `<section class="gallery"><h2>実際のホーム画面で（住民・UIつき）</h2>
<p>住民とホームUIを表示した本物のホームです。開いた先の上部のパネルで木の揺れ方、住民数、地域や天気を切り替えられます。使い捨てのセーブで動き、本人のセーブには触れません。</p>
<div class="chips">${tree.scenes.map(tail => `<a href="home.html#gE-${tail}-4"><button type="button">${sceneName(tail)}</button></a>`).join('')}</div>
<h2>滑らかさ（ブラウザの毎秒コマ数、28体）</h2>
<p>${tree.note}</p>
<div class="strip"><table><thead><tr><th>場面</th><th>CPU</th><th>B 葉先</th><th>C 枝葉を分離</th><th>C2 拡張</th><th>C3 強化</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
const page = fs.readFileSync(path.join(__dirname, 'page.html'), 'utf8').replace('<!--INLINE_CSS-->', `<style>\n${css}\n</style>`).replace('<!--GALLERY-->', gallery());
write('page.html', page);
// The real home with residents and its interface, on a throwaway save. Only the files the
// home itself requests are packaged (game/files.json); menus that lead elsewhere are not.
const game = require('./game/patch.cjs'), gameDir = path.join(__dirname, 'game');
for (const file of JSON.parse(fs.readFileSync(path.join(gameDir, 'files.json'), 'utf8'))) {
  const body = game.resolve('/' + file);
  if (!body) throw new Error('Missing packaged file ' + file);
  // Cache tokens mean nothing in a fixed package; plain paths load on any static host.
  write(file, /\.(js|mjs|css)$/.test(file) ? body.toString().replace(/(\.(?:js|mjs|css|json|webp|png))\?v=[0-9a-zA-Z-]+/g, '$1') : body);
}
write('home.html', game.resolve('/index.html').toString().replace(/(\.(?:js|mjs|css|json|webp|png))\?v=[0-9a-zA-Z-]+/g, '$1'));
for (const name of ['fixture.js', 'panel.js']) write('env/' + name, fs.readFileSync(path.join(gameDir, name)));
for (const dir of ['proposal', 'proposal/living']) for (const name of fs.readdirSync(path.join(out, dir)))
  if (name.endsWith('.mjs')) write('env/' + dir + '/' + name, fs.readFileSync(path.join(out, dir, name)));
const shots = path.join(__dirname, 'evidence');
if (fs.existsSync(shots)) for (const name of fs.readdirSync(shots)) if (/\.(jpg|json)$/.test(name)) write('evidence/' + name, fs.readFileSync(path.join(shots, name)));
write('index.html', `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body style="margin:0">${page}</body></html>`);
console.log(`${modules.length} modules, ${images.length} paintings → ${out}`);
