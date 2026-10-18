const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

// RH-4 Region Registry Integrity: 地域 ID の 正本(master の regions)と、地域で ひく 表・参照・corridor が
// ずれたら CI で 赤に する。知らない ID は 本番では home へ 解決して 1 回だけ 記録、テスト(strictRegions)では throw。
// save の regionId / regionsVisited は 書きかえない(policy.preserveRawSaveIds)
const SAVE = 'naotocchi-save-v1';
const { read, literal, loadMaster } = require('./helpers/source.cjs'); // RH-6: 共通の 部品
const master = loadMaster();
const R = master.regions;
const CANON = [R.home.id, ...R.normal.map((r) => r.id), ...R.special.map((r) => r.id)];
const HOME_AND_NORMAL = [R.home.id, ...R.normal.map((r) => r.id)];
const without = (...ids) => CANON.filter((id) => !ids.includes(id));

// --- 検査の 部品(純粋な 関数。remove-it で こわした 写しにも つかう) ---
const keysOf = (t) => (Array.isArray(t) ? [...t] : Object.keys(t || {}));
function diffSet(actual, expected) {
  const a = new Set(actual), e = new Set(expected);
  return { missing: [...e].filter((x) => !a.has(x)), extra: [...a].filter((x) => !e.has(x)) };
}
function assertSet(label, actual, expected) {
  const { missing, extra } = diffSet(actual, expected);
  assert.deepEqual({ missing, extra }, { missing: [], extra: [] }, `${label}: missing=${missing.join(',')} extra=${extra.join(',')}`);
}
function unknownRefs(ids) { return [...new Set(ids)].filter((id) => !CANON.includes(id)); }
function missingSpecs(allow, specOf) { return allow.filter((id) => specOf(id) === null); }

const H = harness();
const M = H.api.meguruMod;

// 全地域を もつ べき 表(13 件 ちょうど)
function fullTables() {
  return {
    'meguru WORLDS': M.WORLDS, 'meguru WORLD_STYLE': M.WORLD_STYLE, 'meguru WORLD_THEME': M.WORLD_THEME,
    'meguru WORLD_MOTION': M.WORLD_MOTION, 'meguru WORLD_SPACE': M.WORLD_SPACE, 'meguru REGION_LIFE': M.REGION_LIFE,
    'meguru REGION_LINE': M.REGION_LINE, 'meguru GEO_AREA': M.GEO_AREA, 'meguru GEO_ASPECT': M.GEO_ASPECT,
    'meguru WORLD_GEOGRAPHY.regions': M.WORLD_GEOGRAPHY.regions, 'meguru FOLIAGE': literal('meguru.js', 'const FOLIAGE = '),
    'script ITEM_REGION_SCENES': H.api.ITEM_REGION_SCENES, 'script STICKER_BACKGROUND_THEMES': H.api.STICKER_BACKGROUND_THEMES,
    'script ENV_EFFECTS.region': H.api.ENV_EFFECTS.region, 'world-scene SCENES': require('../world-scene.js').SCENES,
  };
}
// 意図して 一部だけ もつ 表。RH-4 の 監査で 確定した 集合と 完全に 一致させる(typo の 追加・余分・意図しない 欠け を 両方 とめる)
const PARTIAL = {
  'meguru REGION_FRAME': [() => M.REGION_FRAME, without('memory_lake')],
  'meguru FRAMED_REGIONS': [() => M.FRAMED_REGIONS, without('memory_lake')],
  'meguru SKY_OVERRIDE': [() => M.SKY_OVERRIDE, ['deepsea', 'star_stop', 'memory_lake']],
  'meguru NIGHT_LIFT': [() => M.NIGHT_LIFT, ['jungle']],
  'meguru EMOJI_MIST': [() => M.EMOJI_MIST, ['memory_lake']],
  'meguru EMOJI_VARY': [() => M.EMOJI_VARY, ['city']],
  'meguru CORRIDOR_REGION_LOOK': [() => M.CORRIDOR_REGION_LOOK, ['home', 'city', 'countryside', 'forest', 'mountain', 'snow', 'sea', 'river_lake', 'desert']],
  'meguru CORRIDOR_REGION_TERRAIN': [() => M.CORRIDOR_REGION_TERRAIN, ['city', 'countryside', 'river_lake', 'desert']],
  'meguru NORMAL_REGIONS': [() => M.NORMAL_REGIONS, HOME_AND_NORMAL],
  'world-environment CLIMATE': [() => literal('world-environment.js', 'var CLIMATE = '), without('deepsea', 'star_stop')],
  'script REGION_RUNTIME_META': [() => H.api.REGION_RUNTIME_META, HOME_AND_NORMAL],
  'script REGION_BASE_FX': [() => H.api.REGION_BASE_FX, ['deepsea', 'jungle', 'desert', 'star_stop', 'memory_lake']],
  'script REGION_MOMENTS': [() => H.api.REGION_MOMENTS, ['mountain', 'deepsea', 'river_lake', 'jungle', 'desert', 'star_stop', 'memory_lake']],
  'script REGION_MOMENT_HINTS': [() => H.api.REGION_MOMENT_HINTS, ['mountain', 'deepsea', 'river_lake', 'jungle', 'desert', 'star_stop', 'memory_lake']],
  'script ENV_GAME_WEIGHTS.region': [() => H.api.ENV_GAME_WEIGHTS.region, without('home', 'star_stop', 'memory_lake')],
  'games REGION_MINIGAMES': [() => H.api.REGION_MINIGAMES, HOME_AND_NORMAL],
};
const WALK = ['home|forest', 'home|river_lake', 'city|desert', 'desert|mountain', 'snow|mountain', 'forest|mountain', 'mountain|river_lake', 'city|sea', 'city|countryside', 'countryside|forest'];

// --- 正本 ---
test('the canonical registry is master.regions: 13 regions, and REGIONS + SPECIAL_REGIONS match it id for id and label for label', () => {
  assert.deepEqual(CANON, ['home', 'city', 'countryside', 'forest', 'mountain', 'snow', 'sea', 'deepsea', 'river_lake', 'jungle', 'desert', 'star_stop', 'memory_lake']);
  const runtime = [...H.api.REGIONS, ...H.api.SPECIAL_REGIONS].map((r) => [r.id, r.label]);
  const fromMaster = [R.home, ...R.normal, ...R.special].map((r) => [r.id, r.label]);
  assert.deepEqual(runtime, fromMaster);
  assert.equal(master.compatibility.policy.unknownRegionFallback, 'home');
  assert.equal(master.compatibility.policy.preserveRawSaveIds, true);
});

test('every full registry table has exactly the 13 canonical regions', () => {
  for (const [label, table] of Object.entries(fullTables())) assertSet(label, keysOf(table), CANON);
});

test('every intentionally partial table is exactly its audited subset (no typo, no extra, no silent loss)', () => {
  for (const [label, [get, expected]] of Object.entries(PARTIAL)) {
    assert.deepEqual(unknownRefs(expected), [], `${label}: the expected subset is canonical`);
    assertSet(label, keysOf(get()), expected);
  }
});

test('nested region references and alias destinations are all canonical', () => {
  const G = M.WORLD_GEOGRAPHY;
  const refs = {
    'meguru HABITAT values': Object.values(M.HABITAT).flat(),
    'master partners.firstRegion': master.partners.map((p) => p.firstRegion),
    'master legends.affinityRegions': master.legends.flatMap((l) => l.affinityRegions || []),
    'connections a/b': G.connections.flatMap((c) => [c.a, c.b].filter(Boolean)),
    'connections mouths': G.connections.flatMap((c) => Object.keys(c.mouths || {})),
    'connections gate.ends': G.connections.flatMap((c) => Object.keys((c.gate && c.gate.ends) || {})),
    'CONTINUOUS_WALK_ALLOWLIST': M.CONTINUOUS_WALK_ALLOWLIST.flatMap((id) => id.split('|')),
    'regionAliases values': Object.values(master.compatibility.regionAliases),
  };
  for (const [label, ids] of Object.entries(refs)) {
    assert.ok(ids.length > 0, label);
    assert.deepEqual(unknownRefs(ids), [], label);
  }
  // alias の キーで 正本に ない のは、旧セーブの tropical だけ(新しい 別名を 足したら ここを 見なおす)
  assert.deepEqual(Object.keys(master.compatibility.regionAliases).filter((id) => !CANON.includes(id)), ['tropical']);
  assert.equal(master.compatibility.regionAliases.tropical, 'jungle');
});

// --- resolveRegionId の 契約 ---
test('resolveRegionId: canonical ids pass, the official alias tropical → jungle is normal input, unknown / typo / invalid throw under strictRegions', () => {
  const h = harness();
  for (const id of CANON) assert.equal(h.api.resolveRegionId(id), id);
  assert.equal(h.api.resolveRegionId('tropical'), 'jungle');
  assert.equal(h.sandbox.__naotocchiErrors.filter((e) => e.where.startsWith('region:')).length, 0, 'an alias is not an error');
  for (const bad of ['moon', 'forrest', '', 'Home', null, undefined, 42, {}, 'constructor', '__proto__']) {
    assert.throws(() => h.api.resolveRegionId(bad, 'test'), /unknown region id/, String(bad));
  }
});

test('production: unknown ids resolve to home and are reported once per raw id, keeping the first site', () => {
  const h = harness({ strictRegions: false });
  const regionErrors = () => h.sandbox.__naotocchiErrors.filter((e) => e.where.startsWith('region:'));
  for (let i = 0; i < 5; i++) assert.equal(h.api.resolveRegionId('moon', i === 0 ? 'siteA' : 'siteB'), 'home');
  assert.equal(regionErrors().length, 1, 'moon, resolved 5 times, is reported once');
  assert.equal(regionErrors()[0].where, 'region:siteA');
  assert.match(regionErrors()[0].message, /"moon"/);
  assert.equal(h.api.resolveRegionId('forrest'), 'home');
  assert.equal(h.api.resolveRegionId(null), 'home');
  assert.equal(h.api.resolveRegionId(7), 'home');
  assert.equal(regionErrors().length, 4, 'forrest, null and a number are reported separately');
  assert.equal(h.api.resolveRegionId('tropical'), 'jungle');
  assert.equal(h.api.resolveRegionId('desert'), 'desert');
  assert.equal(regionErrors().length, 4);
});

// --- save と 実行時 ---
function savedWith(regionId, regionsVisited) {
  const data = new Map();
  const storage = { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
  const h = harness({ storage, strictRegions: false });
  const s = h.api.state();
  s.regionId = regionId; s.lifetime.regionsVisited = regionsVisited;
  h.api.saveState();
  assert.equal(JSON.parse(storage.getItem(SAVE)).regionId, regionId);
  return storage;
}
function walkMeguru(h, ms = 1500) {
  assert.equal(h.api.startMeguru(), true);
  h.advance(ms);
  const world = h.api.meguruRun().world;
  const out = { regionId: world.regionId, gates: M.regionGates(world.regionId, world).length };
  h.api.stopMeguru();
  return out;
}

test('an unknown saved region (moon) runs as home in production, and the save keeps the raw id', () => {
  const storage = savedWith('moon', ['home', 'moon', 'tropical', 'forest']);
  const h = harness({ storage, resume: true, strictRegions: false });
  const s = h.api.state();
  const schema = s.schemaVersion;
  assert.equal(s.regionId, 'moon', 'loading does not rewrite the raw region');
  h.api.render();
  assert.equal(h.api.currentRegionId(), 'home');
  assert.equal(h.api.currentEnvironment().region, 'home');
  assert.ok(h.document.body.classList.contains('region-home'));
  const walked = walkMeguru(h);
  assert.equal(walked.regionId, 'home', 'meguru builds and names the world as home');
  assert.ok(walked.gates > 0, 'the home world keeps its exits');
  const m = s.lifetime.meguru;
  for (const book of ['spots', 'zones', 'paths', 'marks']) assert.ok(!Object.prototype.hasOwnProperty.call(m[book] || {}, 'moon'), `meguru.${book} gets no unknown key`);
  // めぐるの 出口の はしから「いま いる 地域」へ うごいても raw は 書きかえない
  assert.deepEqual({ ...h.api.meguruBridge.enterRegionByMove('home') }, { ok: false, first: false });
  h.api.saveState();
  const saved = JSON.parse(storage.getItem(SAVE));
  assert.equal(saved.regionId, 'moon');
  assert.deepEqual(saved.lifetime.regionsVisited, ['home', 'moon', 'tropical', 'forest']);
  assert.equal(saved.schemaVersion, schema);
  assert.equal(h.sandbox.__naotocchiErrors.filter((e) => e.where.startsWith('region:')).length, 1, 'moon is reported once');
});

test('a legacy saved region (tropical) runs as jungle without an error, and the save keeps tropical', () => {
  const storage = savedWith('tropical', ['home', 'tropical']);
  const h = harness({ storage, resume: true });
  const s = h.api.state();
  assert.equal(s.regionId, 'tropical');
  h.api.render();
  assert.equal(h.api.currentEnvironment().region, 'jungle');
  assert.ok(h.document.body.classList.contains('region-jungle'));
  assert.equal(walkMeguru(h).regionId, 'jungle');
  assert.ok(!Object.prototype.hasOwnProperty.call(s.lifetime.meguru.spots || {}, 'tropical'));
  assert.ok(M.seedWorldRegions(s.lifetime).includes('jungle'), 'the world map knows the visited alias as jungle');
  h.api.saveState();
  assert.equal(JSON.parse(storage.getItem(SAVE)).regionId, 'tropical');
  assert.equal(h.sandbox.__naotocchiErrors.length, 0);
});

test('under strictRegions an unknown current region stops the test instead of silently becoming home', () => {
  const h = harness();
  h.api.state().regionId = 'forrest';
  assert.throws(() => h.api.currentEnvironment(), /unknown region id "forrest"/);
  assert.throws(() => h.api.meguruBridge.findRegion('forrest'), /unknown region id/);
});

// --- corridor / transition(4E の 仕様を そのまま 固定) ---
test('each of the 10 continuous walk corridors has a spec, named by id when one is missing', () => {
  assertSet('CONTINUOUS_WALK_ALLOWLIST', M.CONTINUOUS_WALK_ALLOWLIST, WALK);
  assert.deepEqual(missingSpecs(WALK, (id) => M.walkCorridorSpec(id)), [], 'every allowed walk corridor builds');
  assertSet('walkCorridorSpecs', M.walkCorridorSpecs().map((s) => s.connectionId), WALK);
});

test('the 3 existing transitions stay transitions and memory_lake is not a corridor', () => {
  const byKind = {};
  for (const c of M.worldCorridors()) (byKind[c.kind] = byKind[c.kind] || []).push(c.id);
  assertSet('walk', byKind.walk, WALK);
  assert.deepEqual(byKind.sea, ['jungle|sea']);
  assertSet('vertical', byKind.vertical, ['deepsea|sea', 'countryside|star_stop']);
  assert.equal(Object.keys(byKind).length, 3);
  assert.ok(M.WORLD_GEOGRAPHY.connections.some((c) => c.id === 'memory_lake'), 'memory_lake keeps its own special connection');
  assert.ok(!M.worldCorridors().some((c) => c.id === 'memory_lake' || c.a === 'memory_lake' || c.b === 'memory_lake'));
  assert.ok(!M.walkCorridorSpecs().some((s) => s.a === 'memory_lake' || s.b === 'memory_lake'));
  for (const id of ['jungle|sea', 'deepsea|sea', 'countryside|star_stop']) assert.equal(M.walkCorridorSpec(id), null, id);
});

// --- remove-it: 検査は こわした 写しで 赤に なる(実 file は こわさない) ---
test('remove-it: dropping or adding one region in any table, a stray reference or a missing corridor spec is caught', () => {
  for (const [label, table] of Object.entries(fullTables())) {
    const keys = keysOf(table);
    assert.throws(() => assertSet(label, keys.filter((k) => k !== keys[3]), CANON), /missing=/, `${label}: one region removed`);
    assert.throws(() => assertSet(label, [...keys, 'forrest'], CANON), /extra=forrest/, `${label}: a typo added`);
  }
  for (const [label, [get, expected]] of Object.entries(PARTIAL)) {
    const keys = keysOf(get());
    assert.throws(() => assertSet(label, keys.slice(1), expected), /missing=/, `${label}: one region removed`);
    const outsider = CANON.find((id) => !expected.includes(id)) || 'moon';
    assert.throws(() => assertSet(label, [...keys, outsider], expected), /extra=/, `${label}: ${outsider} added`);
  }
  assert.deepEqual(unknownRefs(['forest', 'forrest']), ['forrest']);
  assert.deepEqual(missingSpecs(WALK, (id) => (id === 'city|sea' ? null : {})), ['city|sea']);
});
