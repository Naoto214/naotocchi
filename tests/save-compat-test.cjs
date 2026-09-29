const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const { harness } = require('./helpers/runtime-harness.cjs');

// RH-8 Save Compatibility Suite(Roadmap §8.7)。
// 本物の 古い save(tools/gen-real-save-fixtures.cjs が 古い commit の コード 自身に 書かせた もの)を いまの コードで 読む。
// こわれた save と seed つきの fuzz。表示の よみかえ(旧しゅぞく名・シールの 背景)・innerHTML の エスケープ・
// snapshot の parse の cache・めぐるの きろくの まとめ保存。
const SAVE = 'naotocchi-save-v1', SNAPS = 'naotocchi-save-v1-snaps';
const REAL = path.join(__dirname, 'fixtures', 'saves', 'real');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(REAL, 'manifest.json'), 'utf8'));
const readReal = (file) => fs.readFileSync(path.join(REAL, file), 'utf8');

function storageWith(entries = []) {
  const data = new Map(entries);
  let writes = 0;
  return { data, writes: () => writes, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { writes++; data.set(k, String(v)); }, removeItem: (k) => data.delete(k) };
}
const boot = (storage) => harness({ storage, resume: true, deterministic: true });
// こわれた save と fuzz は 本番と おなじ ふるまい(知らない 地域 ID は home に よみかえて 記録。テスト用の throw は しない)
const bootProd = (storage) => harness({ storage, resume: true, deterministic: true, strictRegions: false });
const plain = (v) => JSON.parse(JSON.stringify(v));

// 期待する 件数(RH-2 の helper)。旧しゅぞく・退役 ID は 図鑑の 件数に 入らない(save には のこる)
const EXPECTED = {
  'pre-v3.json': { stage: 'dead', dex: 0 },
  'v3.json': { stage: 'growing', dex: 0 },
  'v4-pre-master.json': { stage: 'growing', dex: 0 },
  'v5-pre-items-v2.json': { stage: 'growing', dex: 2 },
  'sticker-points-meguru-p1.json': { stage: 'growing', dex: 2 },
  'meguru-p2.json': { stage: 'growing', dex: 2 },
};

test('real old saves: the manifest lists one fixture per era, each written by that era\'s own code', () => {
  assert.deepEqual(MANIFEST.map((m) => m.file).sort(), Object.keys(EXPECTED).sort());
  for (const m of MANIFEST) assert.match(m.commit, /^[0-9a-f]{8}$/, m.file);
  assert.deepEqual(MANIFEST.map((m) => m.schemaVersion), [null, 3, 4, 5, 5, 5]);
  for (const m of MANIFEST) assert.equal(JSON.parse(readReal(m.file)).lifetime.currentLocation, undefined, `${m.file}: no location`);
});

for (const { file } of MANIFEST) {
  test(`real old save ${file}: loads without errors, nothing decreases, RH-2 counts, load→save→load is idempotent`, () => {
    const raw = readReal(file), old = JSON.parse(raw);
    const storage = storageWith([[SAVE, JSON.stringify(old)]]);
    const h = boot(storage), s = h.api.state();
    assert.equal(s.schemaVersion, 5);
    assert.equal(s.stage, EXPECTED[file].stage);
    // へらない: お金・図鑑の キー(raw の まま)・恋人・シール・めぐる・人生の きろく
    assert.ok(s.lifetime.money >= old.lifetime.money, `money ${s.lifetime.money} >= ${old.lifetime.money}`);
    for (const k of old.discoveredStages || []) assert.ok(s.discoveredStages.includes(k), `dex key ${k} kept`);
    if (old.partner) assert.equal(s.partner && s.partner.id, old.partner.id);
    for (const [k, n] of Object.entries(old.lifetime.stickers?.owned || {})) {
      const count = (v) => (typeof v === 'number' ? v : Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0);
      assert.ok(count(s.lifetime.stickers.owned[k]) >= count(n), `sticker ${k} kept`);
    }
    const om = old.lifetime.meguru;
    if (om) {
      const m = s.lifetime.meguru;
      assert.ok(m.visits >= om.visits);
      for (const k of Object.keys(om.met || {})) assert.ok(m.met[k], `met ${k}`);
      for (const [k, n] of Object.entries(om.talks || {})) assert.ok(m.talks[k] >= n, `talks ${k}`);
      for (const [r, list] of Object.entries(om.spots || {})) for (const id of list) assert.ok((m.spots[r] || []).includes(id), `spot ${r}/${id}`);
      for (const kind of ['zones', 'paths', 'marks']) for (const [r, list] of Object.entries(om[kind] || {})) for (const id of list) assert.ok((m[kind][r] || []).includes(id), `${kind} ${r}/${id}`);
      for (const id of om.world?.links || []) assert.ok(m.world.links.includes(id), `link ${id}`);
    }
    assert.ok((s.lifetime.pastLives || []).length >= (old.lifetime.pastLives || []).length);
    assert.equal(h.api.dexFoundCount(), EXPECTED[file].dex);
    // 冪等: 読んで 書いた もの を もう一度 読んで 書いても 同じ
    h.api.saveState();
    const a = storage.getItem(SAVE);
    const again = storageWith([[SAVE, a]]);
    boot(again).api.saveState();
    // saveRevision は save の 回数(RH-9。起動の save と ここの save)なので ふえる。それ以外は 同じ
    const second = JSON.parse(again.getItem(SAVE)), first = JSON.parse(a);
    assert.ok(second.lifetime.saveRevision > first.lifetime.saveRevision);
    delete second.lifetime.saveRevision; delete first.lifetime.saveRevision;
    assert.deepEqual(second, first);
  });
}

test('legacy species keep their pre-master names (not ???) on the profile and in past lives; the save keeps the raw line', () => {
  const storage = storageWith([[SAVE, readReal('v4-pre-master.json')]]);
  const h = boot(storage), s = h.api.state();
  assert.equal(s.speciesLine, 'bird');
  h.api.renderProfile();
  assert.equal(h.get('profileSpecies').textContent, 'とり');
  assert.match(h.get('profilePastLives').innerHTML, /うさぎ/);
  // 旧しゅぞくは 正本の しゅぞく・図鑑の 件数には まざらない
  assert.ok(!Array.from(h.api.ALL_LINES).includes('bird'));
  h.api.saveState();
  assert.equal(JSON.parse(storage.getItem(SAVE)).speciesLine, 'bird');
});

test('sticker page background: an unavailable value is shown as home but never written back, and does not count as a change', () => {
  const s0 = JSON.parse(readReal('meguru-p2.json'));
  s0.lifetime.stickers.pageOrder = ['page-1'];
  s0.lifetime.stickers.pages = { 'page-1': [] };
  s0.lifetime.stickers.pageMeta = { 'page-1': { background: 'future_region' } };
  s0.lifetime.stickers.tasksDone = [];
  const storage = storageWith([[SAVE, JSON.stringify(s0)]]);
  const h = boot(storage);
  h.api.renderStickerOverlay();
  h.api.checkStickerTasks();
  h.api.saveState();
  const saved = JSON.parse(storage.getItem(SAVE)).lifetime.stickers;
  assert.equal(saved.pageMeta['page-1'].background, 'future_region', 'raw value kept');
  assert.ok(!saved.tasksDone.includes('background-change'), 'unknown background is not a change');
  // えらべる 背景なら これまでどおり 変えた ことに なる
  h.api.state().lifetime.stickers.pageMeta['page-1'].background = 'forest';
  h.api.checkStickerTasks();
  assert.ok(h.api.state().lifetime.stickers.tasksDone.includes('background-change'));
});

test('past lives and life-log fields from a save are escaped before innerHTML', () => {
  const s0 = JSON.parse(readReal('v3.json'));
  const evil = '<img src=x onerror=alert(1)>';
  s0.lifetime.pastLives = [{ species: 'いぬ', line: 'dog', age: evil, sodachi: evil, companions: evil, log: [{ age: evil, icon: '🐶', text: 'x' }] }];
  const h = boot(storageWith([[SAVE, JSON.stringify(s0)]]));
  h.api.renderProfile();
  const html = h.get('profilePastLives').innerHTML;
  assert.ok(!html.includes('<img src=x'), html);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  const tl = h.api.buildLifeTimelineHTML([{ age: evil, icon: '🐶', text: 'x' }]);
  assert.ok(!tl.includes('<img src=x') && tl.includes('&lt;img'));
});

test('snapshots: the list is not re-parsed while storage is unchanged, and another tab\'s write is picked up', () => {
  const storage = storageWith([[SAVE, readReal('v5-pre-items-v2.json')]]);
  const h = boot(storage);
  const J = vm.runInContext('JSON', h.sandbox), parse = J.parse;
  let snapParses = 0;
  J.parse = function (text, ...rest) { if (text === storage.getItem(SNAPS)) snapParses++; return parse.call(this, text, ...rest); };
  try {
    h.api.saveState(); h.api.saveState(); h.api.saveState();
    assert.ok(snapParses <= 1, `parsed ${snapParses} times`);
    // 別の タブが 書きかえた → 次は 読みなおす
    storage.setItem(SNAPS, JSON.stringify([{ at: 1, raw: '{"other":"tab"}' }]));
    h.advance(24 * 60 * 60 * 1000);
    h.api.saveState();
    const list = JSON.parse(storage.getItem(SNAPS));
    assert.ok(list.some((x) => x.raw === '{"other":"tab"}'), 'other tab\'s snapshot kept');
  } finally { J.parse = parse; }
});

test('meguru records are saved once, outside the frame (microtask), with the same bridge signatures', async () => {
  const storage = storageWith([[SAVE, readReal('meguru-p2.json')]]);
  const h = boot(storage), B = h.api.meguruBridge;
  await Promise.resolve();
  const before = storage.writes();
  B.recordMet('companion:tanuki'); B.recordTalk('companion:tanuki'); B.recordSpot('home', 'rh8_spot');
  B.recordMapBits('home', 'zones', ['rh8_zone']); B.recordWorldLinks(['forest|home_rh8']);
  assert.equal(storage.writes(), before, 'nothing written inside the frame');
  await new Promise((r) => setImmediate(r));
  const saved = JSON.parse(storage.getItem(SAVE)).lifetime.meguru;
  assert.equal(saved.met['companion:tanuki'], 1);
  assert.equal(saved.talks['companion:tanuki'], 1);
  assert.ok(saved.spots.home.includes('rh8_spot'));
  assert.ok(saved.zones.home.includes('rh8_zone'));
  assert.ok(saved.world.links.includes('forest|home_rh8'));
  assert.equal(storage.data.has(SAVE), true);
  const writesOfSave = storage.writes() - before;
  assert.ok(writesOfSave >= 1 && writesOfSave <= 3, `one save (primary + backup + snapshots), got ${writesOfSave}`);
});

// ---------- こわれた save ----------
const base = () => JSON.parse(readReal('meguru-p2.json'));
const BROKEN = {
  'boolean as string': (s) => { s.isSleeping = 'false'; s.isSick = 'true'; },
  'number as string': (s) => { s.lifetime.money = '123'; s.hunger = '50'; },
  'duplicate ids': (s) => { s.discoveredStages = ['dog:0', 'dog:0', 'cat:1', 'cat:1']; s.lifetime.regionsVisited = ['home', 'home']; },
  'unknown and future ids': (s) => { s.speciesLine = 'future_line'; s.discoveredStages.push('future_line:9'); s.lifetime.regionsVisited.push('future_region'); },
  'missing keys': (s) => { delete s.lifetime.stickers; delete s.lifetime.meguru; delete s.discoveredStages; delete s.companions; },
  'partner as string': (s) => { s.partner = 'cat_ceo'; },
  'transformOptions as string': (s) => { s.transformOptions = 'dog'; },
  'unknown stage': (s) => { s.stage = 'teenager'; },
  'huge numbers': (s) => { s.lifetime.money = 1e308; s.ageTicks = Number.MAX_SAFE_INTEGER; s.hunger = 1e9; },
  '__proto__ keys': (s) => { s.lifetime.meguru.met = JSON.parse('{"__proto__":{"polluted":1},"companion:shiba":1}'); s.__proto__polluted = 1; },
};
function assertSane(h, label) {
  const s = h.api.state();
  assert.equal(typeof s.stage, 'string', label);
  assert.ok(s.lifetime && typeof s.lifetime === 'object', label);
  assert.ok(Number.isFinite(Number(s.lifetime.money)), `${label}: money`);
  assert.ok(Array.isArray(s.discoveredStages), `${label}: discoveredStages`);
  assert.equal({}.polluted, undefined, `${label}: host prototype`);
  assert.equal(vm.runInContext('Object.prototype.polluted', h.sandbox), undefined, `${label}: sandbox prototype`);
}
for (const [label, mutate] of Object.entries(BROKEN)) {
  test(`broken save (${label}): boots, stays sane, and saves`, () => {
    const s = base(); mutate(s);
    const storage = storageWith([[SAVE, JSON.stringify(s)]]);
    const h = bootProd(storage);
    assertSane(h, label);
    h.api.saveState();
    assert.doesNotThrow(() => JSON.parse(storage.getItem(SAVE)));
  });
}
test('broken save (truncated JSON): boots without replacing the unreadable primary', () => {
  const raw = readReal('meguru-p2.json'), cut = raw.slice(0, Math.floor(raw.length / 2));
  const storage = storageWith([[SAVE, cut]]);
  const h = bootProd(storage);
  assertSane(h, 'truncated');
  assert.equal(storage.getItem(SAVE), cut, 'the unreadable primary is not overwritten');
});

// ---------- seed つきの fuzz(200 回)----------
test('fuzz: 200 seeded mutations of real old saves all boot and stay sane', () => {
  let a = 20260928;
  const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  const VALUES = [null, true, false, 0, -1, 1e308, NaN, '', 'x', '123', 'false', [], [null], {}, { id: 1 }, ['dog:0', 'dog:0'], '__proto__'];
  const files = MANIFEST.map((m) => m.file);
  const paths = (o, pre = [], out = []) => { if (o && typeof o === 'object') for (const k of Object.keys(o)) { out.push([...pre, k]); if (pre.length < 3) paths(o[k], [...pre, k], out); } return out; };
  for (let i = 0; i < 200; i++) {
    const s = JSON.parse(readReal(pick(files)));
    const all = paths(s);
    for (let n = 1 + Math.floor(rnd() * 4); n > 0; n--) {
      const p = pick(all); let o = s;
      for (let j = 0; j < p.length - 1 && o && typeof o === 'object'; j++) o = o[p[j]];
      if (!o || typeof o !== 'object') continue;
      if (rnd() < 0.2) delete o[p[p.length - 1]]; else o[p[p.length - 1]] = pick(VALUES);
    }
    const storage = storageWith([[SAVE, JSON.stringify(s)]]);
    let h;
    assert.doesNotThrow(() => { h = bootProd(storage); h.api.render(); h.api.saveState(); }, `case ${i}`);
    assertSane(h, `case ${i}`);
  }
});
