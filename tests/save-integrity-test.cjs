const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

// RH-1 Save Integrity: こわれた 配列要素で 起動が とまらない・backup が よごれない・
// 未知/未来/退役の ID は のこる・修復は 冪等。本物の 起動・移行・保存の コードを 通す。
const SAVE = 'naotocchi-save-v1', BACKUP = 'naotocchi-save-v1-backup', SNAPS = 'naotocchi-save-v1-snaps';
const FIXTURES = path.join(__dirname, 'fixtures', 'saves');
const fixture = (name) => fs.readFileSync(path.join(FIXTURES, name), 'utf8');

function storageWith(entries = []) {
  const data = new Map(entries);
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
}
const boot = (storage) => harness({ storage, resume: true });
const primary = (storage) => JSON.parse(storage.getItem(SAVE));
const snapRaws = (storage) => JSON.parse(storage.getItem(SNAPS) || '[]').map((s) => s.raw);
function goodSave() {
  const s = harness().api.state();
  s.lifetime.money = 4321;
  s.discoveredStages = ['dog:0', 'cat:1'];
  return JSON.stringify(s);
}
function corrupt(mutate, base = goodSave()) {
  const s = JSON.parse(base);
  mutate(s);
  return JSON.stringify(s);
}
// vm の 中の 配列は 別の realm なので、JSON で ふつうの 値に してから くらべる
const eq = (actual, expected, message) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected, message);
function assertIds(list, label) {
  assert.ok(Array.isArray(list), label);
  for (const v of list) assert.ok(typeof v === 'string' && v !== '', `${label}: ${JSON.stringify(v)}`);
  assert.equal(new Set(list).size, list.length, `${label} has duplicates`);
}

test('malformed elements are removed, recorded, and unknown/future/retired ids are kept', () => {
  const raw = fixture('corrupt/mixed-malformed.json'), storage = storageWith([[SAVE, raw]]);
  const s = boot(storage).api.state();
  eq(s.transformStageDone, ['2']);
  eq(s.marriageMilestonesSeen, [1, 10]);
  eq(s.discoveredStages.slice(0, 4), ['dog:0', 'futureline:3', 'bird:2', 'dog:1']);
  eq(s.achievementsUnlocked.slice(0, 2), ['evolve-1', 'future-achievement-99']);
  eq(s.lifetime.regionsVisited, ['home', 'future_region']);
  eq(s.lifetime.partnersRecorded, ['retired_partner_old']);
  eq(s.lifetime.companionsRecruited, ['retired_companion_old']);
  eq(s.lifetime.weatherSeen.slice(0, 1), ['sunny']);
  eq(s.lifetime.legendsMet, ['future_legend']);
  eq(s.lifetime.duelRecentQuestionIds, ['q1', 'q1', 'q2'], 'history keeps its repeats');
  eq(s.lifetime.stickers.tasksDone, ['future-task']);
  eq(s.lifetime.stickers.seen.slice(0, 1), ['form:dog:0']);
  eq(s.lifetime.stickers.pageOrder, ['page-1']);
  eq(s.lifetime.endingTiersReached, [1]);
  eq(s.infiniteReturn.discoveredStages, ['cat:0', 'future_cat:9']);
  for (const k of ['discoveredStages', 'achievementsUnlocked']) assertIds(s[k], k);
  const repair = s.lifetime.saveRepair;
  eq(repair.byField, {
    transformStageDone: 2, marriageMilestonesSeen: 2, discoveredStages: 6, achievementsUnlocked: 2,
    'lifetime.regionsVisited': 3, 'lifetime.partnersRecorded': 2, 'lifetime.companionsRecruited': 1,
    'lifetime.weatherSeen': 2, 'lifetime.legendsMet': 1, 'lifetime.duelRecentQuestionIds': 1,
    'lifetime.stickers.tasksDone': 2, 'lifetime.stickers.seen': 1, 'lifetime.stickers.pageOrder': 2,
    'lifetime.endingTiersReached': 2, 'infiniteReturn.discoveredStages': 1,
  });
  assert.equal(repair.v, 1);
  assert.equal(repair.total, 30);
  assert.equal(repair.samples.length, 10, 'samples stay capped at 10');
  for (const sample of repair.samples) assert.ok(typeof sample.field === 'string' && sample.value.length <= 120);
  assert.equal(s.lifetime.money, 777, 'normal data is untouched');
});

test('the null element that crashed boot in rare-line-1 now boots and saves', () => {
  const storage = storageWith([[SAVE, fixture('corrupt/rare-line-crash.json')]]);
  const h = boot(storage);
  eq(h.api.state().discoveredStages.slice(0, 2), ['dog:0', 'dog:1']);
  assert.equal(h.api.state().lifetime.money, 1234);
  h.api.state().lifetime.money = 2000;
  assert.doesNotThrow(() => h.api.saveState());
  assert.equal(primary(storage).lifetime.money, 2000);
  assertIds(primary(storage).discoveredStages, 'saved discoveredStages');
});

test('unknown integer tiers stay in the save and are skipped only by the badge row', () => {
  const storage = storageWith([[SAVE, fixture('corrupt/ending-tiers.json')]]);
  const h = boot(storage);
  eq(h.api.state().lifetime.endingTiersReached, [0, 2, 9, -1]);
  eq(primary(storage).lifetime.endingTiersReached, [0, 2, 9, -1], 'future tiers survive the save');
  const badges = [...h.get('endingBadges').innerHTML.matchAll(/<button\b/g)].length;
  assert.equal(badges, 2, 'only the known tiers 0 and 2 are drawn');
  assert.doesNotThrow(() => h.api.render());
});

test('repair is idempotent: reloading a repaired save adds nothing to saveRepair', () => {
  const storage = storageWith([[SAVE, fixture('corrupt/mixed-malformed.json')]]);
  const first = JSON.parse(JSON.stringify(boot(storage).api.state().lifetime.saveRepair));
  assert.equal(first.total, 30);
  const firstSaved = primary(storage).lifetime.saveRepair;
  eq(firstSaved, first);
  const snapsBefore = storage.getItem(SNAPS);
  for (let i = 0; i < 2; i++) {
    const again = boot(storage).api.state();
    eq(again.lifetime.saveRepair, first, `reload ${i + 1} must not re-add counts`);
  }
  assert.equal(storage.getItem(SNAPS), snapsBefore, 'a clean reload takes no forced snapshot');
});

test('a normal current save and a normal legacy v4 save never create saveRepair', () => {
  const current = goodSave(), storage = storageWith([[SAVE, current]]);
  boot(storage);
  assert.equal(primary(storage).lifetime.saveRepair, undefined);
  assert.equal(storage.getItem(BACKUP), current, 'a clean boot backs up exactly the loaded save');
  assert.equal(storage.getItem(SNAPS) && snapRaws(storage).includes(current) ? 'snap' : 'none', 'none', 'no forced snapshot for a clean load');

  const legacy = storageWith([[SAVE, fixture('valid/legacy-v4.json')]]);
  const s = boot(legacy).api.state();
  assert.equal(s.lifetime.saveRepair, undefined);
  assert.equal(primary(legacy).lifetime.saveRepair, undefined);
  assert.ok(s.discoveredStages.includes('futureline:1'), 'unknown dex key kept');
  eq(s.lifetime.companionsRecruited, ['retired_companion_old'], 'retired companion kept');
  eq(s.lifetime.regionsVisited, ['home', 'city']);
});

test('a corrupt primary with a good backup never copies the corrupt raw into backup', () => {
  const good = goodSave(), bad = corrupt((s) => s.discoveredStages.push(null, 7));
  const storage = storageWith([[SAVE, bad], [BACKUP, good]]);
  const h = boot(storage);
  assert.equal(h.api.state().lifetime.money, 4321);
  const backup = storage.getItem(BACKUP);
  assert.notEqual(backup, bad);
  assertIds(JSON.parse(backup).discoveredStages, 'backup discoveredStages');
  assert.ok(snapRaws(storage).includes(bad), 'the original raw is kept in a forced snapshot');
  // 正常な save が 成功した あとは、その ひとつ前(修復後)が backup に なる
  const repairedPrimary = storage.getItem(SAVE);
  h.api.state().lifetime.money = 5555;
  h.api.saveState();
  assert.equal(storage.getItem(BACKUP), repairedPrimary);
  assert.equal(primary(storage).lifetime.money, 5555);
});

test('loading alone never writes the backup (backup only follows a successful save)', () => {
  const good = goodSave(), storage = storageWith([[SAVE, good]]);
  const h = boot(storage);
  const backupBefore = storage.getItem(BACKUP);
  for (const raw of [corrupt((s) => s.discoveredStages.push(null)), corrupt((s) => { s.lifetime.money = 42; })]) {
    storage.setItem(SAVE, raw);
    h.api.loadState();
    assert.equal(storage.getItem(BACKUP), backupBefore, 'loadState must not copy the loaded raw into backup');
  }
});

test('primary and backup both element-corrupt still boot and keep the original raw', () => {
  const badA = corrupt((s) => s.discoveredStages.push({ x: 1 }));
  const badB = corrupt((s) => { s.lifetime.money = 1; s.discoveredStages.push(null); });
  const storage = storageWith([[SAVE, badA], [BACKUP, badB]]);
  const h = boot(storage);
  assert.equal(h.api.state().lifetime.money, 4321);
  assert.ok(snapRaws(storage).includes(badA));
  for (const key of [SAVE, BACKUP]) assertIds(JSON.parse(storage.getItem(key)).discoveredStages, key);
});

test('a truncated primary still falls back to the backup without writing', () => {
  const good = goodSave(), storage = storageWith([[SAVE, '{"stage":"gro'], [BACKUP, good]]);
  const h = boot(storage);
  assert.equal(h.api.state().lifetime.money, 4321);
  assert.equal(storage.getItem(SAVE), '{"stage":"gro');
  assert.equal(storage.getItem(BACKUP), good);
});

test('importing a save code with malformed elements boots after reload with a clean backup', () => {
  const good = goodSave(), storage = storageWith([[SAVE, good]]);
  const h = boot(storage);
  Object.assign(h.sandbox, { TextEncoder, TextDecoder, atob, btoa });
  h.sandbox.location.reload = () => {};
  h.advance(10000);
  const bad = corrupt((s) => { s.lifetime.money = 99; s.discoveredStages.push(null, 3); s.lifetime.endingTiersReached = [null, 9]; });
  h.get('saveImportInput').value = 'NTS1.' + Buffer.from(bad).toString('base64url');
  h.dispatch(h.get('saveImportBtn'), 'click'); h.dispatch(h.get('saveImportBtn'), 'click');
  assert.equal(storage.getItem(SAVE), bad);
  const after = boot(storage);
  assert.equal(after.api.state().lifetime.money, 99);
  eq(after.api.state().lifetime.endingTiersReached, [9]);
  const backup = JSON.parse(storage.getItem(BACKUP));
  assertIds(backup.discoveredStages, 'backup after import');
  assert.notEqual(storage.getItem(BACKUP), bad);
});

test('every array in freshState() drops a null element on load (coverage of the kind table)', () => {
  const fresh = harness().api.freshState();
  const exempt = /^(lifetime\.itemMemories\.|lifetime\.stickers\.pages\.)/; // item-system / シールの 仕組みが うけもつ
  const paths = [];
  const walk = (o, p) => { for (const [k, v] of Object.entries(o)) { const q = p ? `${p}.${k}` : k; if (Array.isArray(v)) paths.push(q); else if (v && typeof v === 'object') walk(v, q); } };
  walk(fresh, '');
  assert.ok(paths.length >= 25, 'walk found the arrays');
  const at = (o, p) => p.split('.').reduce((x, k) => x && x[k], o);
  const base = goodSave();
  const loadWithNull = (targets) => {
    const s = JSON.parse(base);
    for (const p of targets) { const arr = at(s, p); if (Array.isArray(arr)) arr.push(null); }
    const loaded = boot(storageWith([[SAVE, JSON.stringify(s)]])).api.state();
    // 採用されずに 新しい いのちへ 落ちると 下の 検査が 素通りに なるので、まず 採用を たしかめる
    assert.equal(loaded.lifetime.money, 4321, `a null in ${targets.length > 1 ? 'every array' : targets[0]} must not reject the whole save`);
    return loaded;
  };
  // 1つずつ(1要素で save ぜんたいが 読めなくなる 経路を みつける)と、ぜんぶ いっしょに
  for (const p of paths) loadWithNull([p]);
  const loaded = loadWithNull(paths);
  for (const p of paths.filter((q) => !exempt.test(q))) {
    assert.ok(!at(loaded, p).includes(null), `${p} kept a null element`);
  }
});

test('an achievement condition that throws is reported once and does not stop saving', () => {
  const storage = storageWith([[SAVE, goodSave()]]);
  const h = boot(storage);
  h.api.state().discoveredStages.push(null); // 実行中に まぎれこんだ ばあいの 2番目の 防御
  h.api.state().lifetime.money = 6000;
  assert.doesNotThrow(() => h.api.saveState());
  assert.doesNotThrow(() => h.api.saveState());
  assert.equal(primary(storage).lifetime.money, 6000);
  assert.ok(!h.api.state().achievementsUnlocked.includes('rare-line-1'));
  const errs = h.sandbox.__naotocchiErrors.filter((e) => e.where === 'achievement:rare-line-1');
  assert.equal(errs.length, 1);
});
