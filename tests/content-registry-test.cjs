const assert = require('node:assert/strict');
const { test } = require('node:test');
const vm = require('node:vm');
const { harness } = require('./helpers/runtime-harness.cjs');

// RH-5 Content Registry Coverage: master に 登録された しゅぞく・なかま・こいびと・伝説 が、平行の 表・画像・
// 実行時の 定義 から もれて いない ことを、起動時の TypeError では なく テストで 名指しして とめる。
// 表は 起動せずに source の 宣言を そのまま 評価する(表が 1 つ 欠けても 全テストが 起動で こける 前に、
// どの 表の どの ID か を 出す)。save / ending の 番号 / 見た目は かえない
const { read, literal, loadMaster } = require('./helpers/source.cjs'); // RH-6: 共通の 部品
const master = loadMaster();

// --- 正本(master) ---
const P = master.playerSpecies;
const SPECIES = [...P.normal, ...P.rare, ...P.secret].map((s) => s.id);
const SECRET = P.secret.map((s) => s.id);
const COMPANIONS_NORMAL = master.companions.normal.map((c) => c.id);
const COMPANIONS_RARE = master.companions.rare.map((c) => c.id);
const COMPANIONS = [...COMPANIONS_NORMAL, ...COMPANIONS_RARE];
const PARTNERS = master.partners.map((p) => p.id);
const LEGENDS = master.legends.map((l) => l.id);
const C = master.compatibility;
// 退役した ID の 行(RH-5 では 消さない。現行の 正本には まぜない)
const LEGACY_SPECIES = C.legacyOnlySpecies;                       // 旧しゅぞく 11(旧定義で 表示する ために のこす)
const LEGACY = { companionNormal: ['koala'], companionRare: ['kinoko'], castBoundsAssets: ['assets/characters/companions/kinoko.png'] };
const GOAL_TIER_IDS = ['life', 'lifeClear', 'best', 'dex', 'perfect'];
// 既知の 未解決の すきま(「正しい 仕様」では ない)。中身を 決めて 5 件目を 足したら ここから 外す
const KNOWN_GAPS = { ENDING_CELEBRATIONS: { missing: ['perfect'] } };

// --- 検査の 部品(純粋な 関数。remove-it で こわした 写しにも つかう) ---
const keysOf = (t) => (Array.isArray(t) ? [...t] : Object.keys(t || {}));
function diffSet(actual, expected) {
  const a = new Set(actual), e = new Set(expected);
  return { missing: [...e].filter((x) => !a.has(x)), extra: [...a].filter((x) => !e.has(x)) };
}
// 1 つの 表の 報告: どの 表の、どの ID が 欠けて / 余って いるか
function coverage(tables, expected) {
  const out = [];
  for (const [table, keys] of Object.entries(tables)) {
    const { missing, extra } = diffSet(keys, expected[table]);
    if (missing.length || extra.length) out.push({ table, missing, extra });
  }
  return out;
}
function assertCoverage(tables, expected) {
  const report = coverage(tables, expected);
  assert.deepEqual(report, [], report.map((r) => `${r.table}: missing=[${r.missing}] extra=[${r.extra}]`).join('\n'));
}
const disjoint = (a, b) => a.filter((x) => b.includes(x));

// 全件 そろう べき 表(正本 + 決めた 旧行)
function fullTables() {
  const movie = require('../movie-dialogue.js');
  return {
    tables: {
      'script MASTER_SPECIES_EMOJI': keysOf(literal('script.js', 'const MASTER_SPECIES_EMOJI = ')),
      'script SPECIES_STAGE_DESCS': keysOf(literal('script.js', 'const SPECIES_STAGE_DESCS = ')),
      'meguru HABITAT': keysOf(literal('meguru.js', 'const HABITAT = ')),
      'script COMPANION_RUNTIME': keysOf(literal('script.js', 'const COMPANION_RUNTIME = ')),
      'script RARE_COMPANION_RUNTIME': keysOf(literal('script.js', 'const RARE_COMPANION_RUNTIME = ')),
      'script COMPANION_CHARACTER_IDLE_LINES': keysOf(literal('script.js', 'const COMPANION_CHARACTER_IDLE_LINES = ')),
      'script COMPANION_DAILY_REACTIONS': keysOf(literal('script.js', 'const COMPANION_DAILY_REACTIONS = ')),
      'script PARTNER_RUNTIME_PROFILE': keysOf(literal('script.js', 'const PARTNER_RUNTIME_PROFILE = ')),
      'script PARTNER_DAILY_REACTIONS': keysOf(literal('script.js', 'const PARTNER_DAILY_REACTIONS = ')),
      'script PARTNER_CHARACTER_IDLE_LINES': keysOf(literal('script.js', 'const PARTNER_CHARACTER_IDLE_LINES = ')),
      'script PARTNER_ANNIVERSARY_LINES': keysOf(literal('script.js', 'const PARTNER_ANNIVERSARY_LINES = ')),
      'script PARTNER_SIGNATURE_LINES': keysOf(literal('script.js', 'const PARTNER_SIGNATURE_LINES = ')),
      'script PARTNER_RELATIONSHIP_LINES': keysOf(literal('script.js', 'const PARTNER_RELATIONSHIP_LINES = ')),
      'script PARTNER_FIRST_ENCOUNTERS': keysOf(literal('script.js', 'const PARTNER_FIRST_ENCOUNTERS = ')),
      'movie-dialogue partners': keysOf(movie.partners),
      'movie-dialogue legends': keysOf(movie.legends),
    },
    expected: {
      'script MASTER_SPECIES_EMOJI': SPECIES,
      'script SPECIES_STAGE_DESCS': [...SPECIES, ...LEGACY_SPECIES],
      'meguru HABITAT': SPECIES,
      'script COMPANION_RUNTIME': [...COMPANIONS_NORMAL, ...LEGACY.companionNormal],
      'script RARE_COMPANION_RUNTIME': [...COMPANIONS_RARE, ...LEGACY.companionRare],
      'script COMPANION_CHARACTER_IDLE_LINES': [...COMPANIONS, ...LEGACY.companionNormal, ...LEGACY.companionRare],
      'script COMPANION_DAILY_REACTIONS': [...COMPANIONS, ...LEGACY.companionNormal, ...LEGACY.companionRare],
      'script PARTNER_RUNTIME_PROFILE': PARTNERS,
      'script PARTNER_DAILY_REACTIONS': PARTNERS,
      'script PARTNER_CHARACTER_IDLE_LINES': PARTNERS,
      'script PARTNER_ANNIVERSARY_LINES': PARTNERS,
      'script PARTNER_SIGNATURE_LINES': PARTNERS,
      'script PARTNER_RELATIONSHIP_LINES': PARTNERS,
      'script PARTNER_FIRST_ENCOUNTERS': PARTNERS,
      'movie-dialogue partners': PARTNERS,
      'movie-dialogue legends': LEGENDS,
    },
  };
}
// 意図して 一部だけ もつ 表(監査で 確定した 集合と 完全一致)
function partialTables() {
  const personality = keysOf(literal('cast-motion.js', 'PERSONALITY = '));
  return {
    tables: {
      'meguru WATER_LINES': literal('meguru.js', 'const WATER_LINES = '),
      'meguru PLANT_LINES': literal('meguru.js', 'const PLANT_LINES = '),
      'meguru NIGHT_LINES': literal('meguru.js', 'const NIGHT_LINES = '),
      'meguru SCENERY_LINES': literal('meguru.js', 'const SCENERY_LINES = '),
      'meguru NIGHT_COMPANIONS': literal('meguru.js', 'const NIGHT_COMPANIONS = '),
      'cast-motion PERSONALITY': personality,
    },
    expected: {
      'meguru WATER_LINES': ['salmon', 'clownfish', 'jellyfish', 'starfish', 'coral', 'hermit_crab', 'turtle', 'frog', 'unknown'],
      'meguru PLANT_LINES': ['dandelion', 'sakura', 'venus_flytrap', 'mushroom', 'world_tree', 'coral'],
      'meguru NIGHT_LINES': ['ghost', 'star'],
      'meguru SCENERY_LINES': ['plant', 'dandelion', 'sakura', 'venus_flytrap', 'world_tree', 'mushroom', 'coral'],
      'meguru NIGHT_COMPANIONS': ['bat', 'owl', 'watcher'],
      'cast-motion PERSONALITY': ['snail', 'clock', 'sekizou', 'watcher', 'box', 'koala', 'forest_bear', 'grove_deer', 'robot_neighbor', 'cat_ceo'],
    },
    // 一部の 表に のこる 旧 ID(現行の 正本では ない)
    legacy: { 'meguru SCENERY_LINES': ['plant'], 'cast-motion PERSONALITY': ['koala'] },
  };
}

// 起動は 必要な テストの 中だけ(表の 欠けで 起動が こけても、表の テストは 起動せずに 名指しで 赤に なる)
let booted = null;
const boot = () => booted || (booted = harness());

// --- 正本 ---
test('registry sizes: species 31 (22 normal + 8 rare + 1 secret, 8 stages each = 248), companions 26, partners 18, legends 5', () => {
  assert.equal(P.normal.length, 22); assert.equal(P.rare.length, 8); assert.equal(P.secret.length, 1);
  assert.equal(SPECIES.length, 31);
  for (const s of [...P.normal, ...P.rare, ...P.secret]) assert.equal(s.stages.length, 8, s.id);
  assert.equal(new Set(SPECIES).size, 31, 'species ids are unique');
  assert.equal(COMPANIONS.length, 26); assert.equal(COMPANIONS_NORMAL.length, 18); assert.equal(COMPANIONS_RARE.length, 8);
  assert.equal(PARTNERS.length, 18);
  assert.equal(LEGENDS.length, 5);
  assert.deepEqual([...boot().api.ALL_LINES], SPECIES, 'ALL_LINES is master normal + rare + secret, in order');
  assert.equal(boot().api.dexTotalCount(), 248);
});

test('the secret species comes from master.playerSpecies.secret; the ren fallback is only for a missing master', () => {
  assert.deepEqual([...boot().api.SECRET_LINES], SECRET);
  assert.equal(boot().api.SECRET_LINE, SECRET[0]);
  assert.ok(SECRET.every((id) => boot().api.isSecretLine(id)) && !boot().api.isSecretLine('dog'));
  // script.js の 組み立ての 行を そのまま 別の master で 動かす: master が あれば その ID、なければ ['ren']
  const src = read('script.js');
  const block = src.slice(src.indexOf('  const MASTER_NORMAL_LINES = '), src.indexOf('  const ALL_LINES = '));
  const build = (WORLD_MASTER) => vm.runInNewContext(block + ';({ SECRET_LINES, SECRET_LINE, ALL_LINES: [...NORMAL_LINES, ...RARE_LINES, ...SECRET_LINES] })', { WORLD_MASTER });
  const other = build({ playerSpecies: { normal: [{ id: 'dog' }], rare: [{ id: 'god' }], secret: [{ id: 'kage' }] } });
  assert.deepEqual([...other.SECRET_LINES], ['kage'], 'the production path reads the secret id from master, not the fallback');
  assert.equal(other.SECRET_LINE, 'kage');
  assert.deepEqual([...build(null).SECRET_LINES], ['ren'], 'without master the compatibility fallback is ren');
  assert.match(src, /const ALL_LINES = \[\.\.\.NORMAL_LINES, \.\.\.RARE_LINES, \.\.\.SECRET_LINES\];/);
});

test('every full registry table holds exactly the master ids (plus its pinned legacy rows)', () => {
  const { tables, expected } = fullTables();
  assertCoverage(tables, expected);
  for (const id of SPECIES) assert.equal(literal('script.js', 'const MASTER_SPECIES_EMOJI = ')[id].length, 8, `MASTER_SPECIES_EMOJI ${id}`);
  const descs = literal('script.js', 'const SPECIES_STAGE_DESCS = ');
  for (const id of SPECIES) assert.equal(descs[id].length, 8, `SPECIES_STAGE_DESCS ${id}`);
});

test('every intentionally partial table is exactly its audited subset', () => {
  const { tables, expected, legacy } = partialTables();
  assertCoverage(tables, expected);
  const known = new Set([...SPECIES, ...COMPANIONS, ...PARTNERS]);
  for (const [table, ids] of Object.entries(expected)) {
    const stray = ids.filter((id) => !known.has(id));
    assert.deepEqual(stray, legacy[table] || [], `${table}: only the pinned legacy ids are outside the current registry`);
  }
});

test('legacy rows are pinned and never leak into the current canonical sets', () => {
  assert.deepEqual([...LEGACY_SPECIES], ['bird', 'rabbit', 'fish', 'panda', 'fox', 'owl', 'plant', 'robot', 'dinosaur', 'mermaid', 'unicorn']);
  assert.deepEqual([...boot().api.LEGACY_NORMAL_LINES, ...literal('script.js', 'const LEGACY_RARE_LINES = ')], [...LEGACY_SPECIES]);
  assert.deepEqual(disjoint(LEGACY_SPECIES, SPECIES), [], 'legacy species are not current species');
  assert.deepEqual(disjoint(LEGACY_SPECIES, [...boot().api.ALL_LINES]), [], 'legacy species are not in ALL_LINES');
  const retiredCompanions = [...LEGACY.companionNormal, ...LEGACY.companionRare];
  assert.deepEqual(disjoint(retiredCompanions, COMPANIONS), []);
  // 旧なかまの 行は 正式な alias で 現行の なかまへ よみかえられる(だから 実行時には 引かれない)
  for (const id of retiredCompanions) assert.ok(COMPANIONS.includes(C.companionAliases[id]), `${id} → ${C.companionAliases[id]}`);
  assert.deepEqual([...boot().api.normalCompanions.map((c) => c.id), ...boot().api.rareCompanions.map((c) => c.id)], COMPANIONS);
  assert.deepEqual([...boot().api.partnerCandidates.map((p) => p.id)].sort(), [...PARTNERS].sort());
});

test('alias destinations are canonical, and alias keys are canonical or retired', () => {
  const tables = [
    ['speciesAliases', C.speciesAliases, SPECIES, LEGACY_SPECIES],
    ['companionAliases', C.companionAliases, COMPANIONS, [...LEGACY.companionNormal, ...LEGACY.companionRare, 'penguin', 'rabbit']],
    ['partnerAliases', C.partnerAliases, PARTNERS, Object.keys(C.partnerAliases)],
  ];
  for (const [label, aliases, canon, retired] of tables) {
    for (const [from, to] of Object.entries(aliases)) {
      assert.ok(canon.includes(to), `${label}: ${from} → ${to} is canonical`);
      assert.ok(canon.includes(from) || retired.includes(from), `${label}: ${from} is canonical or retired`);
    }
  }
  assert.deepEqual(disjoint(C.legacyOnlyCompanions, COMPANIONS), []);
  assert.deepEqual(disjoint(C.legacyOnlyPartners, PARTNERS), []);
});

test('species aliases: dex counts and the dex "found" display agree (raw → alias → registered)', () => {
  const h = harness();
  const s = h.api.state();
  s.discoveredStages = ['oldcat:0', 'oldcat:7', 'cat:1', 'dog:0', 'zzz:3'];
  // alias が ない とき: oldcat / zzz は 数えない、表示も しない
  assert.equal(h.api.dexFoundCount(), 2);
  assert.equal(h.api.dexElderCount(), 0);
  h.api.renderDex();
  assert.doesNotMatch(h.get('dexGrid').innerHTML, /data-line="cat" data-stage="0"/);
  // 正式な alias を 足すと(将来の 改名の 想定)、件数と 表示が いっしょに かわる。save は そのまま
  h.sandbox.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1.compatibility.speciesAliases.oldcat = 'cat';
  assert.equal(h.api.canonicalSpeciesId('oldcat'), 'cat');
  assert.equal(h.api.canonicalDexKey('oldcat:7'), 'cat:7');
  assert.equal(h.api.dexFoundCount(), 4, 'cat:0, cat:7, cat:1, dog:0');
  assert.equal(h.api.dexElderCount(), 1, 'cat:7');
  assert.ok(h.api.knownDexKeys().has('cat:0'));
  h.api.renderDex();
  const grid = h.get('dexGrid').innerHTML;
  const catBlock = grid.split('dex-line-block').find((block) => block.includes('data-line="cat"'));
  assert.match(catBlock, /dex-line-count">3\/8</, 'the cat line shows 3 of 8, same as the count');
  assert.match(catBlock, /data-line="cat" data-stage="0"/, 'the aliased cat:0 shows as found');
  assert.deepEqual(s.discoveredStages, ['oldcat:0', 'oldcat:7', 'cat:1', 'dog:0', 'zzz:3'], 'the save keeps the raw keys');
  for (const id of SPECIES) assert.equal(h.api.canonicalSpeciesId(id), id);
});

test('cast-bounds covers every current species stage, companion, partner, the author and egg frames', () => {
  const bounds = require('../cast-bounds.js');
  const assets = [
    ...SPECIES.flatMap((id) => Array.from({ length: 8 }, (_, i) => `assets/characters/${id}/${String(i + 1).padStart(2, '0')}.png`)),
    ...master.companions.normal.map((c) => c.asset), ...master.companions.rare.map((c) => c.asset),
    ...master.partners.map((p) => p.asset), P.author.asset,
    ...['intact', 'cracking', 'ready'].map((f) => `assets/characters/egg/${f}.png`),
  ];
  assert.equal(assets.length, 248 + 26 + 18 + 1 + 3);
  assertCoverage({ 'cast-bounds': Object.keys(bounds) }, { 'cast-bounds': [...assets, ...LEGACY.castBoundsAssets] });
});

test('images: every master species has 8 stages whose asset is <id>/01..08.png and whose label matches master', () => {
  for (const def of [...P.normal, ...P.rare, ...P.secret]) {
    const stages = boot().api.SPECIES[def.id].stages;
    assert.equal(stages.length, 8, def.id);
    stages.forEach((st, i) => {
      assert.equal(st.asset, `assets/characters/${def.id}/${String(i + 1).padStart(2, '0')}.png`, `${def.id} stage ${i + 1}`);
      assert.equal(st.label, def.stages[i], `${def.id} stage ${i + 1} label`);
    });
  }
  // ファイルが ある こと・大文字小文字は RH-3 の asset gate(asset-integrity-test)が 見る
  assert.match(read('tests/asset-integrity-test.cjs'), /h\.api\.SPECIES\[line\]\.stages/);
});

// --- ゴールの 段 ---
test('GOAL_TIER_IDS is the single tier map: id ↔ ordinal both ways, and every per-tier table follows it', () => {
  const ids = [...boot().api.GOAL_TIER_IDS], GOAL_TIER = { ...boot().api.GOAL_TIER };
  assert.deepEqual([...ids], GOAL_TIER_IDS);
  assert.deepEqual(Object.keys(GOAL_TIER), GOAL_TIER_IDS);
  ids.forEach((id, i) => { assert.equal(GOAL_TIER[id], i); assert.equal(ids[GOAL_TIER[id]], id); });
  const perTier = {
    ENDING_TIERS: boot().api.ENDING_TIERS, ENDING_TIER_ICONS: boot().api.ENDING_TIER_ICONS,
    ENDING_TIER_UNLOCK_LABELS: boot().api.ENDING_TIER_UNLOCK_LABELS, 'endingBadgeIconHTML keys': JSON.parse(read('script.js').match(/const keys = (\['fireworks'[^\]]*\])/)[1].replace(/'/g, '"')),
    ENDING_CELEBRATIONS: boot().api.ENDING_CELEBRATIONS,
  };
  for (const [name, table] of Object.entries(perTier)) {
    const gap = KNOWN_GAPS[name];
    const covered = gap ? ids.filter((id) => !gap.missing.includes(id)) : [...ids];
    assert.equal(table.length, covered.length, `${name}: ${table.length} entries for tiers [${covered}]`);
    if (gap) assert.deepEqual(ids.slice(table.length), gap.missing, `${name}: the known gap is exactly [${gap.missing}] (remove it from KNOWN_GAPS once filled)`);
  }
  // 段の 絵は goal-(番号+1)。data-goal / CSS の 番号も この 並び
  boot().api.ENDING_TIERS.forEach((tier, i) => assert.match(tier.art, new RegExp(`goal-${i + 1}`), ids[i]));
  // ごほうび・テーマの unlockTier は 段の 番号
  assert.deepEqual([...boot().api.NAOTO_ITEMS.map((item) => item.unlockTier)], [GOAL_TIER.life, GOAL_TIER.lifeClear, GOAL_TIER.best, GOAL_TIER.dex]);
  for (const theme of Object.values(boot().api.COLOR_THEMES)) if (theme.unlockTier !== undefined) assert.ok(ids[theme.unlockTier], `COLOR_THEMES unlockTier ${theme.unlockTier}`);
});

test('ENDING_CELEBRATIONS still lacks the perfect tier: a known open gap, not the spec', () => {
  assert.equal(boot().api.ENDING_CELEBRATIONS.length, GOAL_TIER_IDS.length - KNOWN_GAPS.ENDING_CELEBRATIONS.missing.length);
  assert.equal(boot().api.ENDING_CELEBRATIONS[boot().api.GOAL_TIER.perfect], undefined, 'perfect has no celebration yet (content decision pending)');
  assert.match(read('script.js'), /既知の 未解決の 網羅の すきま[\s\S]{0,200}perfect/);
});

test('save ordinals are unchanged: endingTiersReached stays the ints 0..4 and the tier logic returns the same numbers', () => {
  const h = harness();
  const s = h.api.state();
  const L = s.lifetime;
  Object.assign(L, { clears: 1, lifeClears: 1, bestLives: 1, dexCleared: true, perfectCleared: true });
  assert.deepEqual([...h.api.achievedGoalTiers()], [0, 1, 2, 3, 4]);
  s.stage = 'farewell';
  for (const [sodachi, tier] of [[0, 0], [70, 1], [1e9, 2]]) { s.maxSodachi = sodachi; assert.equal(h.api.getEndingTier(), tier, `sodachi ${sodachi}`); }
  L.endingTiersReached = [0, 3, 4];
  const data = new Map();
  const storage = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
  const w = harness({ storage });
  Object.assign(w.api.state().lifetime, { endingTiersReached: [0, 3, 4], clears: 1 });
  w.api.saveState();
  const saved = JSON.parse(storage.getItem('naotocchi-save-v1'));
  assert.deepEqual(saved.lifetime.endingTiersReached, [0, 3, 4]);
  assert.equal(saved.schemaVersion, 5);
  const r = harness({ storage, resume: true });
  assert.deepEqual([...r.api.state().lifetime.endingTiersReached], [0, 3, 4]);
});

// --- remove-it: こわした 写しで 赤に なる(実 file は こわさない) ---
test('remove-it: a species added to master but forgotten in one table is named with its table; typo, extra and retired ids too', () => {
  const { tables, expected } = fullTables();
  // master に しゅぞくを 1 つ 足し、1 つの 表だけ 書きわすれた 想定
  const added = { ...expected };
  const withNew = { ...tables };
  for (const t of ['script MASTER_SPECIES_EMOJI', 'script SPECIES_STAGE_DESCS', 'meguru HABITAT']) {
    added[t] = [...expected[t], 'newbie'];
    withNew[t] = t === 'script SPECIES_STAGE_DESCS' ? tables[t] : [...tables[t], 'newbie'];
  }
  assert.deepEqual(coverage(withNew, added), [{ table: 'script SPECIES_STAGE_DESCS', missing: ['newbie'], extra: [] }]);
  // こいびとを 1 つ 足し、movie-dialogue だけ 書きわすれた 想定
  const p2 = { ...expected }, t2 = { ...tables };
  for (const t of Object.keys(expected).filter((k) => expected[k] === PARTNERS)) { p2[t] = [...PARTNERS, 'moon_rabbit']; t2[t] = t === 'movie-dialogue partners' ? tables[t] : [...tables[t], 'moon_rabbit']; }
  assert.deepEqual(coverage(t2, p2), [{ table: 'movie-dialogue partners', missing: ['moon_rabbit'], extra: [] }]);
  // typo・余分・退役 ID の まぎれこみ
  assert.deepEqual(coverage({ x: [...PARTNERS.filter((id) => id !== 'cat_ceo'), 'cat_c3o'] }, { x: PARTNERS }), [{ table: 'x', missing: ['cat_ceo'], extra: ['cat_c3o'] }]);
  assert.deepEqual(coverage({ x: [...COMPANIONS_NORMAL, 'hakuchou'] }, { x: COMPANIONS_NORMAL }), [{ table: 'x', missing: [], extra: ['hakuchou'] }]);
  assert.throws(() => assertCoverage({ 'script COMPANION_RUNTIME': COMPANIONS_NORMAL.slice(1) }, { 'script COMPANION_RUNTIME': COMPANIONS_NORMAL }), /script COMPANION_RUNTIME: missing=\[cat_friend\]/);
  assert.deepEqual(disjoint(['koala', 'dog'], [...boot().api.ALL_LINES]), ['dog']);
});
