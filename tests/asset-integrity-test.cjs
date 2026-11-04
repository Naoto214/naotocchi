const assert = require('node:assert/strict');
const { test } = require('node:test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { assetHash } = require('../tools/bump-versions.js');
const { expectedAssetToken } = require('./helpers/asset-token.cjs');
const { harness } = require('./helpers/runtime-harness.cjs');

// RH-3 asset gate: いまは 欠けは ない(QA で確認済み)。これからの 欠け・大文字小文字・古い token・
// token の つけわすれ を CI で止める。検査は 純粋な関数にして、こわれた入力(メモリ上)でも赤になることを確かめる。
const ROOT = path.join(__dirname, '..');
const tracked = () => new Set(execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).split('\n').filter(Boolean));
const read = (file) => fs.readFileSync(path.join(ROOT, file));

// --- 検査の部品 ---
// 静的な assets/… の参照(テンプレートの ${…} を含むものは下の動的な検査で扱う)
const STATIC_REF = /assets\/[A-Za-z0-9_\-./]+?\.(?:png|jpe?g|webp|svg|gif|woff2?|mp3|ogg|wav|json)/g;
function staticAssetRefs(sources) {
  return sources.flatMap(({ file, text }) => [...text.matchAll(STATIC_REF)].map((m) => ({ file, ref: m[0] })));
}
// 実在と、大文字小文字の完全一致(GitHub Pages は区別する。git ls-files の名前と比べる)
function checkRefs(refs, files) {
  const lower = new Map([...files].map((f) => [f.toLowerCase(), f]));
  const missing = [], caseMismatch = [];
  for (const r of refs) {
    if (files.has(r.ref)) continue;
    if (lower.has(r.ref.toLowerCase())) caseMismatch.push({ ...r, actual: lower.get(r.ref.toLowerCase()) });
    else missing.push(r);
  }
  return { missing, caseMismatch };
}
// Local scripts/styles/lazy modules require dated SHA-1/8 or SHA-256/12 tokens. Preloads are intentionally unversioned.
function checkTokens(html, readAsset) {
  const missingToken = [], stale = [];
  let checked = 0;
  // <template data-src> は あとから import() する module(めぐる 3D prototype)。おなじ token の きまり
  for (const [tag] of html.matchAll(/<(?:script|link|template)\b[^>]*>/g)) {
    const isScript = /^<script/.test(tag), isLazy = /^<template/.test(tag);
    if (isLazy ? !/\bdata-src="/.test(tag) : !isScript && !/\brel="stylesheet"/.test(tag)) continue;
    const url = (tag.match(isLazy ? /\bdata-src="([^"]+)"/ : isScript ? /\bsrc="([^"]+)"/ : /\bhref="([^"]+)"/) || [])[1];
    if (!url || /^(?:https?:)?\/\//.test(url)) continue;
    checked++;
    const [file, query = ''] = url.split('?');
    const token = (query.match(/(?:^|&)v=([^&]+)/) || [])[1];
    if (!token) { missingToken.push(file); continue; }
    const actual = expectedAssetToken(token, readAsset(file));
    if (token !== actual) stale.push({ file, token, actual });
  }
  return { checked, missingToken, stale };
}
function missingPaths(paths, files) { return [...paths].filter((p) => !files.has(p)); }

test('asset tokens validate exact file bytes in both supported formats for scripts, stylesheets and lazy modules', () => {
  const readAsset = (file) => file === 'app.js' ? Buffer.from('naotocchi') : null;
  const tags = [
    (token) => `<script src="app.js?v=${token}"></script>`,
    (token) => `<link rel="stylesheet" href="app.js?v=${token}">`,
    (token) => `<template data-src="app.js?v=${token}"></template>`,
  ];
  for (const tag of tags) {
    for (const token of ['20260101-c8ff6571', '3a4799083ab7']) {
      assert.deepEqual(checkTokens(tag(token), readAsset), { checked: 1, missingToken: [], stale: [] }, token);
      assert.deepEqual(checkTokens(tag(token), () => Buffer.from('changed')).stale.map((s) => s.file), ['app.js'], 'changed file bytes');
      assert.deepEqual(checkTokens(tag(token), () => null).stale.map((s) => s.file), ['app.js'], 'missing file');
      assert.deepEqual(checkTokens(tag(token.toUpperCase()), readAsset).stale.map((s) => s.file), ['app.js'], 'uppercase token');
    }
    for (const token of ['20260101-00000000', '000000000000', 'c8ff65717a65', '20260101-3a479908', '3a4799083ab', '3a4799083ab73']) {
      assert.deepEqual(checkTokens(tag(token), readAsset).stale.map((s) => s.file), ['app.js'], token);
    }
    assert.deepEqual(checkTokens(tag('').replace('?v=', ''), readAsset).missingToken, ['app.js']);
  }
});

// --- いまの repo ---
test('every static assets/… reference in HTML, CSS and JS exists with the exact case', () => {
  const files = tracked();
  const sources = [...files].filter((f) => /^[^/]+\.(?:html|css|js)$/.test(f)).map((file) => ({ file, text: read(file).toString('utf8') }));
  const refs = staticAssetRefs(sources);
  assert.ok(refs.length >= 300, 'references found: ' + refs.length);
  const { missing, caseMismatch } = checkRefs(refs, files);
  assert.deepEqual(missing, []);
  assert.deepEqual(caseMismatch, []);
});

test('every script, stylesheet and lazy module carries a supported token whose hash matches the file', () => {
  const files = tracked();
  const html = read('index.html').toString('utf8');
  const result = checkTokens(html, (file) => (files.has(file) ? read(file) : null));
  assert.ok(result.checked >= 25, 'scripts/stylesheets checked: ' + result.checked);
  assert.deepEqual(result.missingToken, []);
  assert.deepEqual(result.stale, []);
  // preload は token なしが正しい(CSS / JS が同じ URL で読むので、token を付けると二重に取得する)
  const preloads = [...html.matchAll(/<link\b[^>]*\brel="preload"[^>]*>/g)].map(([tag]) => tag.match(/href="([^"]+)"/)[1]);
  assert.ok(preloads.length >= 1 && preloads.every((url) => !url.includes('?v=')), JSON.stringify(preloads));
});

test('dynamic paths: current species, unified items, egg frames and goal-art fallbacks exist', () => {
  const files = tracked();
  const h = harness();
  // vm の 配列は別の realm なので、ふつうの配列に うつす
  const species = [...h.api.ALL_LINES].flatMap((line) => [...h.api.SPECIES[line].stages].map((stage) => stage.asset));
  assert.equal(species.length, h.api.ALL_LINES.length * 8);
  assert.ok(species.every(Boolean), 'every current form has an image');
  assert.deepEqual(missingPaths(species, files), []);
  // renderer が実際に画像を出す一覧(UNIFIED_ITEM_IDS)が正本。CATALOG 全部ではない(new_themed_pack は sticker_pack を使う)
  const script = read('script.js').toString('utf8');
  const unified = [...script.match(/const UNIFIED_ITEM_IDS = new Set\(\[([\s\S]*?)\]\)/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.equal(unified.length, 27);
  assert.match(script, /assets\/items\/unified\/\$\{item\.id\}\.png/);
  assert.deepEqual(missingPaths(unified.map((id) => `assets/items/unified/${id}.png`), files), []);
  assert.match(script, /assets\/characters\/egg\/\$\{frame\}\.png/);
  assert.deepEqual(missingPaths(['intact', 'cracking', 'ready'].map((f) => `assets/characters/egg/${f}.png`), files), []);
  assert.match(script, /assets\/clear\/goal-\$\{tierIndex \+ 1\}\.jpg/);
  assert.deepEqual(missingPaths([1, 2, 3, 4, 5].map((n) => `assets/clear/goal-${n}.jpg`), files), []);
});

// --- remove-it: こわれた入力で それぞれ赤になる(実ファイルは こわさない) ---
test('the checks catch a missing file, a case mismatch, a stale token, a missing token and a missing dynamic path', () => {
  const files = new Set(['assets/a/Cat.png', 'assets/a/dog.png', 'app.js', 'app.css']);
  const refs = staticAssetRefs([{ file: 'x.css', text: 'url(assets/a/dog.png) url(assets/a/cat.png) url(assets/a/fox.png)' }]);
  const r = checkRefs(refs, files);
  assert.deepEqual(r.missing.map((m) => m.ref), ['assets/a/fox.png']);
  assert.deepEqual(r.caseMismatch.map((m) => [m.ref, m.actual]), [['assets/a/cat.png', 'assets/a/Cat.png']]);
  const readAsset = (f) => ({ 'app.js': 'naotocchi', 'app.css': 'app.css' })[f] ?? null;
  const ok = '<script src="app.js?v=20260101-c8ff6571"></script><link rel="stylesheet" href="app.css?v=20260101-2aca11c5"><link rel="preload" as="image" href="assets/a/dog.png">';
  assert.deepEqual(checkTokens(ok, readAsset), { checked: 2, missingToken: [], stale: [] });
  const stale = checkTokens('<script src="app.js?v=20260101-cccccccc"></script>', readAsset);
  assert.deepEqual(stale.stale.map((s) => s.file), ['app.js']);
  assert.deepEqual(checkTokens('<link rel="stylesheet" href="app.css">', readAsset).missingToken, ['app.css']);
  assert.deepEqual(checkTokens('<script src="app.js?v=1"></script>', readAsset).stale.map((s) => s.file), ['app.js'], 'a token without the hash part is stale');
  assert.deepEqual(checkTokens('<script src="gone.js?v=20260101-c8ff6571"></script>', readAsset).stale.map((s) => s.file), ['gone.js']);
  // あとから import() する module(<template data-src>)も おなじ きまり
  assert.deepEqual(checkTokens('<template id="m" data-src="app.js?v=20260101-cccccccc"></template>', readAsset).stale.map((s) => s.file), ['app.js']);
  assert.deepEqual(checkTokens('<template id="m" data-src="app.js"></template>', readAsset).missingToken, ['app.js']);
  assert.deepEqual(missingPaths(['assets/characters/dog/09.png', 'assets/a/dog.png'], files), ['assets/characters/dog/09.png']);
});

test('the real index.html and references turn red when a token goes stale, a token is dropped or a path changes case', () => {
  const files = tracked();
  const html = read('index.html').toString('utf8');
  const readAsset = (file) => (files.has(file) ? read(file) : null);
  const staleHtml = html.replace(/(src="script\.js\?v=)([^"]+)/, (_, prefix, token) => prefix + token.slice(0, -1) + (token.endsWith('0') ? '1' : '0'));
  assert.notEqual(staleHtml, html, 'the mutation must replace the real script token');
  assert.deepEqual(checkTokens(staleHtml, readAsset).stale.map((x) => x.file), ['script.js']);
  const droppedHtml = html.replace(/(href="style\.css)\?v=[^"]+"/, '$1"');
  assert.deepEqual(checkTokens(droppedHtml, readAsset).missingToken, ['style.css']);
  const ref = staticAssetRefs([{ file: 'index.html', text: html }])[0].ref;
  const shouted = ref.replace(/[^/]+$/, (name) => name.toUpperCase());
  assert.deepEqual(checkRefs([{ file: 'index.html', ref: shouted }], files).caseMismatch.map((x) => x.actual), [ref]);
});

// --- bump-versions の CLI は変わらない(export は hash だけ) ---
test('npm run bump still rewrites only the ?v= tokens with YYYYMMDD-<assetHash>, and is idempotent', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rh3-bump-'));
  const html = read('index.html').toString('utf8');
  const refs = [...html.matchAll(/(?:href|src)="([^"?]+)\?v=([^"]+)"/g)].map((m) => m[1]);
  fs.mkdirSync(path.join(tmp, 'tools'));
  fs.copyFileSync(path.join(ROOT, 'tools/bump-versions.js'), path.join(tmp, 'tools/bump-versions.js'));
  const stale = html.replace(/\?v=[^"]+"/g, '?v=19990101-00000000"');
  fs.writeFileSync(path.join(tmp, 'index.html'), stale);
  for (const file of refs) { fs.mkdirSync(path.dirname(path.join(tmp, file)), { recursive: true }); fs.copyFileSync(path.join(ROOT, file), path.join(tmp, file)); }
  const first = execFileSync(process.execPath, [path.join(tmp, 'tools/bump-versions.js')], { encoding: 'utf8' });
  assert.equal(first.trim(), `${refs.length} asset token(s) updated in index.html`);
  const bumped = fs.readFileSync(path.join(tmp, 'index.html'), 'utf8');
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  assert.equal(bumped.replace(/\?v=[^"]+"/g, '?v="'), html.replace(/\?v=[^"]+"/g, '?v="'), 'nothing but tokens changes');
  for (const file of refs) assert.ok(bumped.includes(`${file}?v=${stamp}-${assetHash(read(file))}"`), file);
  const second = execFileSync(process.execPath, [path.join(tmp, 'tools/bump-versions.js')], { encoding: 'utf8' });
  assert.equal(second.trim(), 'asset tokens already up to date');
  assert.equal(require('../tools/bump-versions.js').assetHash(Buffer.from('naotocchi')), require('node:crypto').createHash('sha1').update('naotocchi').digest('hex').slice(0, 8));
});
