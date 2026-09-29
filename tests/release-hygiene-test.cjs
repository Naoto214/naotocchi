const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');
const { codeOnly } = require('./helpers/source.cjs');

// RH-11 Release Hygiene: 文書の 数字が いまの コードと あう・地域の 表に 登録表の そとの 行が ない。
const root = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let h;
const api = () => (h || (h = harness())).api;

test('README sticker section matches the current sticker constants (no retired kakera / fixed four pages)', () => {
  const readme = read('README.md');
  const section = readme.slice(readme.indexOf('### シールちょう'), readme.indexOf('### いっしょうの'));
  const A = api();
  assert.match(section, new RegExp(`最大${A.STICKER_BOOK_MAX_PAGES}ページ`));
  assert.match(section, new RegExp(`1ページ${A.STICKER_PAGE_MAX}枚まで`));
  assert.match(section, new RegExp(`1種類${A.STICKER_COPY_MAX}枚まで`));
  assert.match(section, new RegExp(`💰${A.STICKER_PACK_PRICE}の「シールパック」\\(${A.STICKER_PACK_SIZE}枚\\)`));
  assert.match(section, new RegExp(`${A.STICKER_THEME_PRICE}コインのテーマパック`));
  assert.match(section, new RegExp(`全${Array.from(A.STICKER_TASKS).length}こ`));
  assert.doesNotMatch(section, /かけら/);
  assert.doesNotMatch(section, /4つのページ/);
});

test('README states the supported browsers and the hidden-tab / multi-tab behaviour', () => {
  const readme = read('README.md');
  assert.match(readme, /iOS Safari 16 以上、Chrome 105 以上/);
  assert.match(readme, /タブがかくれていたりした時間は年齢に加算されません/);
  assert.match(readme, /べつの タブで ひらかれています/);
});

test('region icon keys and body.region-* styles only name registered regions (no dead alias rows)', () => {
  const A = api();
  const ids = new Set([...Array.from(A.REGIONS, (r) => r.id), ...Array.from(A.SPECIAL_REGIONS, (r) => r.id)]);
  const src = codeOnly(read('script.js'));
  const table = src.match(/kind === 'region' \? \{([^}]*)\}/)[1];
  const keys = [...table.matchAll(/(\w+):'/g)].map((m) => m[1]);
  assert.deepEqual(keys.filter((k) => !ids.has(k)), [], 'icon keys outside the registry');
  const css = read('style.css');
  const styled = [...css.matchAll(/body\.region-(\w+)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(styled)].filter((k) => !ids.has(k)), [], 'body.region-* outside the registry');
});
