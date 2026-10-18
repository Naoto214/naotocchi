const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

// RH-2 Canonical Progress Counts: いまの版の進捗は「登録済みの ID ∩ 保存された ID」を、
// alias を正規化して重複なしで数える。save の raw 配列は履歴として そのまま のこる。
// 解放済みのもの(実績・dexCleared・ending・かんむり)は取り消さない。本物の起動・保存・表示を通す。
const SAVE = 'naotocchi-save-v1';
const FIXTURES = path.join(__dirname, 'fixtures', 'saves');
const fixture = (name) => JSON.parse(fs.readFileSync(path.join(FIXTURES, name), 'utf8'));

function storageWith(entries = []) {
  const data = new Map(entries);
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
}
const base = harness().api;
const LINES = base.ALL_LINES;
const RETIRED_LINES = ['bird', 'rabbit', 'fish', 'panda', 'fox', 'owl', 'plant', 'robot', 'dinosaur'];
const keysOf = (lines) => lines.flatMap((line) => Array.from({ length: 8 }, (_, i) => `${line}:${i}`));
const REAL_KEYS = keysOf(LINES);
const RETIRED_KEYS = keysOf(RETIRED_LINES);
const REAL_SET = new Set(REAL_KEYS);
// テスト側の期待値: 登録済みのキーを重複なしで数える(本体の helper とは別に書いた、独立した数えかた)
const realFormCount = (keys) => new Set(keys.filter((k) => REAL_SET.has(k))).size;

function bootSave(save) {
  const storage = storageWith([[SAVE, JSON.stringify(save)]]);
  return { h: harness({ storage, resume: true }), storage };
}
function saveWith(mutate) {
  const s = JSON.parse(JSON.stringify(harness().api.state()));
  mutate(s);
  return s;
}
const unlocked = (h, id) => h.api.state().achievementsUnlocked.includes(id);
const cond = (h, id) => h.api.achievements.find((a) => a.id === id).condition(h.api.state().lifetime, h.api.state());
function dexHeader(h) { h.api.renderDex(); return h.get('dexProgress').textContent; }
function dexSummary(h) { h.api.renderDex(); return h.get('dexSummary').innerHTML; }
function wipeSummary(h) { h.dispatch(h.get('wipeBtn'), 'click'); return h.get('wipeSummary').innerHTML; }
// ヘッダーは しゅぞく + なかま + こいびと の合計。しゅぞくの数と恋人の数を ここから取り出す
function headerParts(h) {
  const [found, total] = dexHeader(h).split(' / ').map(Number);
  return { found, total };
}

test('alias + canonical, retired, future and typo ids stay in the save but count once or not at all', () => {
  const { h, storage } = bootSave(fixture('progress/alias-unknown-mix.json'));
  const l = h.api.state().lifetime;
  // 数えかた: mermaid と sea_mermaid は 1 件、neighbor-cat(退役)・未来・typo は 0 件
  assert.equal(cond(h, 'partner-1'), true);
  l.partnersRecorded.push('sea_mermaid');
  const partners = h.api.partnerCandidates.length;
  assert.equal(cond(h, 'partner-all'), false, 'partner-all needs every registered candidate');
  // 地域: tropical は jungle の alias。home と jungle の 2 件だけ
  assert.equal(cond(h, 'region-3'), false);
  l.regionsVisited.push('forest');
  assert.equal(cond(h, 'region-3'), true, 'home + jungle(tropical) + forest = 3');
  l.regionsVisited.splice(l.regionsVisited.indexOf('forest'), 1);
  // 結婚: mermaid / sea_mermaid で 1 人
  assert.equal(cond(h, 'married-1'), true);
  assert.equal(cond(h, 'married-3'), false);
  // なかま: 退役(hakuchou)・未来・typo は数えない。penguin は penguin_friend に正規化されて 1 人
  assert.equal(cond(h, 'companion-1'), true);
  assert.equal(cond(h, 'companion-5'), false);
  l.companionsRecruited.push('penguin');
  assert.equal(cond(h, 'companion-5'), false, 'an alias of an already counted companion adds nothing');
  // てんき・じかんたい: 登録にない storm / dusk は数えない(3 / 4)
  assert.equal(cond(h, 'weather-all'), false);
  assert.equal(cond(h, 'time-all'), false);
  l.weatherSeen.push('snow'); l.timeSeen.push('night');
  assert.equal(cond(h, 'weather-all'), true);
  assert.equal(cond(h, 'time-all'), true);
  // ナオトのアイテム・シールの種類・シールのお題: 未来の ID は数えない
  assert.equal(cond(h, 'naoto-1'), false);
  assert.equal(cond(h, 'sticker-10'), false, '1 registered sticker kind + 11 unknown ids');
  assert.equal(cond(h, 'sticker-tasks-5'), false);
  // 表示: 実績の件数は登録済みだけ
  assert.match(wipeSummary(h), new RegExp(`じっせき<b>${h.api.state().achievementsUnlocked.filter((id) => h.api.achievements.some((a) => a.id === id)).length} / ${h.api.achievements.length}</b>`));
  // save には raw がそのまま残る(削除しない)
  const saved = JSON.parse(storage.getItem(SAVE));
  for (const id of ['mermaid', 'neighbor-cat', 'future_partner', 'cat_ceoo']) assert.ok(saved.lifetime.partnersRecorded.includes(id), id);
  for (const id of ['tropical', 'future_region', 'hmoe']) assert.ok(saved.lifetime.regionsVisited.includes(id), id);
  for (const id of ['hakuchou', 'future_friend', 'shibaa']) assert.ok(saved.lifetime.companionsRecruited.includes(id), id);
  assert.ok(saved.lifetime.weatherSeen.includes('storm') && saved.lifetime.timeSeen.includes('dusk'));
  assert.ok(saved.lifetime.ownedNaotoItems.includes('naoto_future'));
  assert.ok(saved.discoveredStages.includes('futureline:3') && saved.discoveredStages.includes('bird:2') && saved.discoveredStages.includes('dgo:0'));
  assert.ok(saved.achievementsUnlocked.includes('future-achievement-99'));
  assert.equal(partners, 18);
});

test('boot never unlocks progress achievements from unregistered ids', () => {
  const { h } = bootSave(fixture('progress/alias-unknown-mix.json'));
  for (const id of ['region-3', 'region-all', 'partner-all', 'married-3', 'companion-5', 'weather-all', 'time-all', 'naoto-1', 'sticker-10', 'sticker-tasks-5', 'dex-25']) {
    assert.equal(unlocked(h, id), false, id);
  }
});

test('176 real forms + 72 retired-species keys do not reach dex-complete, goal 4 or the crown', () => {
  const { h } = bootSave(saveWith((s) => { s.discoveredStages = [...REAL_KEYS.slice(0, 176), ...RETIRED_KEYS]; }));
  const s = h.api.state();
  assert.equal(s.discoveredStages.length, 248, 'raw history is kept');
  assert.equal(unlocked(h, 'dex-complete'), false);
  assert.equal(s.lifetime.dexCleared, false);
  assert.equal(s.lifetime.endingTiersReached.includes(3), false);
  assert.equal(s.lifetime.ownedNaotoItems.includes('naoto_crown'), false);
  assert.equal(unlocked(h, 'dex-150'), true, '176 real forms still count');
  const header = headerParts(h);
  assert.equal(header.found, 176, 'dex header counts real forms only (no companions or partners in this save)');
  assert.match(h.api.buildLifeCard(), /ずかん176／248/);
  assert.match(wipeSummary(h), /ずかん<b>176 \/ 248<\/b>/);
  assert.doesNotMatch(dexSummary(h), /コンプリートの きろく/);
});

test('only retired final forms do not unlock elder-collector', () => {
  const { h } = bootSave(saveWith((s) => { s.discoveredStages = RETIRED_LINES.map((line) => `${line}:7`); }));
  assert.equal(unlocked(h, 'elder-collector'), false);
});

test('duplicates are counted once', () => {
  const h = harness();
  const s = h.api.state();
  s.discoveredStages = Array(30).fill('dog:0');
  assert.equal(cond(h, 'dex-25'), false);
  s.lifetime.regionsVisited = ['home', 'home', 'home', 'city'];
  assert.equal(cond(h, 'region-3'), false);
  s.lifetime.partnersMarried = ['cat_ceo', 'cat_ceo', 'cat_ceo'];
  assert.equal(cond(h, 'married-3'), false);
  s.lifetime.companionsRecruited = ['shiba', 'shiba', 'shiba', 'shiba', 'shiba'];
  assert.equal(cond(h, 'companion-5'), false);
});

test('a true current complete dex still reaches dex-complete, goal 4, the crown and the ending count', () => {
  const { h } = bootSave(saveWith((s) => { s.discoveredStages = [...REAL_KEYS, ...RETIRED_KEYS, 'dog:0']; }));
  const s = h.api.state();
  assert.equal(unlocked(h, 'dex-complete'), true);
  assert.equal(s.lifetime.dexCleared, true);
  assert.ok(s.lifetime.endingTiersReached.includes(3));
  assert.ok(s.lifetime.ownedNaotoItems.includes('naoto_crown'));
  assert.equal(unlocked(h, 'elder-collector'), true);
  assert.match(h.get('gameClearDesc').innerHTML, /みつけたすがた: 248 \/ 248/, 'ending screen shows the canonical count, not the raw 321');
  assert.match(h.api.buildLifeCard(), /ずかん248／248/);
  assert.doesNotMatch(dexSummary(h), /コンプリートの きろく/, 'no record hint when the current dex is complete');
});

test('grandfathered dexCleared keeps every past unlock and shows the record without inflating the count', () => {
  const { h, storage } = bootSave(fixture('progress/dex-cleared-grandfathered.json'));
  const s = h.api.state();
  for (const id of ['dex-complete', 'elder-collector']) assert.ok(unlocked(h, id), `${id} is not revoked`);
  assert.equal(s.lifetime.dexCleared, true);
  assert.ok(s.lifetime.endingTiersReached.includes(3));
  assert.ok(s.lifetime.ownedNaotoItems.includes('naoto_crown'));
  assert.equal(cond(h, 'dex-complete'), false, 'a new check uses the canonical count');
  // 起動時に いまの すがた(dog:<段>)が 1 つ記録されるので、登録済みの形は 2〜3。旧系統 bird の 8 は数えない
  const real = realFormCount(s.discoveredStages);
  assert.ok(real <= 3 && s.discoveredStages.length >= 10, `real ${real} / raw ${s.discoveredStages.length}`);
  assert.equal(headerParts(h).found, real);
  assert.match(dexSummary(h), /📖 ずかんコンプリートの きろく あり/);
  assert.match(h.api.buildLifeCard(), new RegExp(`ずかん${real}／248`));
  assert.match(wipeSummary(h), new RegExp(`ずかん<b>${real} / 248</b>`));
  const saved = JSON.parse(storage.getItem(SAVE));
  assert.equal(saved.lifetime.legacyUnlocks, undefined, 'no new save field');
  assert.equal(saved.lifetime.saveRepair, undefined, 'a healthy legacy save is not a repair');
  assert.deepEqual(saved.achievementsUnlocked.filter((id) => id === 'dex-complete'), ['dex-complete']);
});

test('the record hint is derived from dexCleared and the current registry size only', () => {
  const h = harness();
  const s = h.api.state();
  s.discoveredStages = REAL_KEYS.slice(0, 247);
  s.lifetime.dexCleared = false;
  assert.doesNotMatch(dexSummary(h), /コンプリートの きろく/);
  s.lifetime.dexCleared = true;
  assert.match(dexSummary(h), /コンプリートの きろく あり/);
  s.discoveredStages = [...REAL_KEYS];
  assert.doesNotMatch(dexSummary(h), /コンプリートの きろく/);
});

test('the dex header combines canonical forms, companions and partners', () => {
  const h = harness();
  const s = h.api.state();
  s.discoveredStages = ['dog:0', 'dog:0', 'bird:0'];
  s.lifetime.companionsRecruited = ['shiba'];
  s.lifetime.rareCompanionsRecruited = [];
  s.lifetime.partnersRecorded = ['mermaid', 'sea_mermaid', 'neighbor-cat'];
  const { found, total } = headerParts(h);
  assert.equal(found, 1 + 1 + 1);
  assert.equal(total, 248 + h.api.normalCompanions.length + h.api.partnerCandidates.length);
});

test('a save carrying RH-1 saveRepair counts the same way and keeps saveRepair untouched', () => {
  const raw = fs.readFileSync(path.join(FIXTURES, 'corrupt/mixed-malformed.json'), 'utf8');
  const { h } = bootSave(JSON.parse(raw));
  const s = h.api.state();
  const repair = JSON.parse(JSON.stringify(s.lifetime.saveRepair));
  assert.equal(repair.total, 30);
  assert.equal(Object.keys(repair).sort().join(','), 'byField,lastAt,samples,total,v', 'RH-2 adds nothing to saveRepair');
  assert.equal(cond(h, 'region-3'), false, 'home + future_region is one registered region');
  assert.equal(cond(h, 'partner-1'), false, 'only a retired partner id remains');
  assert.equal(cond(h, 'companion-1'), false, 'only a retired companion id remains');
});

test('an old v4 save keeps its unknown ids and counts only registered forms', () => {
  const { h } = bootSave(fixture('valid/legacy-v4.json'));
  const s = h.api.state();
  assert.ok(s.discoveredStages.includes('futureline:1'));
  assert.equal(cond(h, 'companion-1'), false, 'retired_companion_old is not a current companion');
  // 登録済みの形を 24 まで足す(futureline:1 は数えないので 25 には届かない)
  for (const key of REAL_KEYS) { if (realFormCount(s.discoveredStages) >= 24) break; if (!s.discoveredStages.includes(key)) s.discoveredStages.push(key); }
  assert.equal(cond(h, 'dex-25'), false, '24 real forms + futureline:1 is not 25');
  s.discoveredStages.push(REAL_KEYS.find((key) => !s.discoveredStages.includes(key)));
  assert.equal(cond(h, 'dex-25'), true);
});

test('PERFECT is still every current achievement, unchanged', () => {
  const h = harness();
  const s = h.api.state();
  s.achievementsUnlocked = h.api.achievements.map((a) => a.id).slice(1);
  s.achievementsUnlocked.push('future-achievement');
  h.api.saveState();
  assert.equal(s.lifetime.perfectCleared, false);
  s.achievementsUnlocked.push(h.api.achievements[0].id);
  h.api.saveState();
  assert.equal(s.lifetime.perfectCleared, true);
});

test('an alias alone counts as its canonical id (partner, married, region, companion)', () => {
  const h = harness();
  const l = h.api.state().lifetime;
  l.partnersRecorded = ['mermaid'];
  assert.equal(cond(h, 'partner-1'), true, 'mermaid → sea_mermaid');
  l.partnersMarried = ['mermaid'];
  assert.equal(cond(h, 'married-1'), true);
  l.regionsVisited = ['home', 'tropical', 'forest'];
  assert.equal(cond(h, 'region-3'), true, 'tropical → jungle');
  l.companionsRecruited = ['penguin', 'rabbit', 'koala', 'shiba', 'owl'];
  assert.equal(cond(h, 'companion-5'), true, 'penguin / rabbit / koala resolve to current companions');
});

test('the crown bonus follows the canonical dex, not the raw length', () => {
  const h = harness();
  const s = h.api.state();
  s.lifetime.ownedNaotoItems = ['naoto_crown'];
  s.lifetime.dexCleared = false;
  s.achievementsUnlocked = [];
  s.lifetime.minigamePlayCounts = {};
  const game = h.api.games[0];
  s.discoveredStages = [...REAL_KEYS.slice(0, 176), ...RETIRED_KEYS];
  assert.equal(h.api.crownAchievementWeight('game', game), 1, 'raw 248 with retired keys is not a complete dex');
  s.discoveredStages = [...REAL_KEYS];
  assert.equal(h.api.crownAchievementWeight('game', game), 2, 'a true complete dex enables the crown bonus');
});

test('perfect-life needs a registered marriage, not an unknown id', () => {
  const h = harness();
  const l = h.api.state().lifetime;
  l.companionsRecruited = h.api.normalCompanions.map((c) => c.id);
  l.partnersMarried = ['future_partner', 'park-dog'];
  assert.equal(cond(h, 'perfect-life'), false);
  l.partnersMarried.push('mermaid');
  assert.equal(cond(h, 'perfect-life'), true);
});
