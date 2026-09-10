const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

const SAVE = 'naotocchi-save-v1', BACKUP = 'naotocchi-save-v1-backup';

// Storage is the fault boundary. Boot, migration, save and reload all run the
// actual product code. No real browser data is read or changed by these tests.
function storageWith(entries = []) {
  const data = new Map(entries), failWrites = new Set();
  return {data, failWrites,
    getItem: key => data.get(key) ?? null,
    setItem(key, value) {
      if (failWrites.has(key)) throw new Error('QuotaExceededError');
      data.set(key, String(value));
    },
    removeItem: key => data.delete(key),
  };
}
function savedLife() {
  const state = harness().api.state();
  state.lifetime.money = 4321;
  return JSON.stringify(state);
}
const boot = storage => harness({storage, resume: true});

test('backup write failure does not stop a writable primary save', () => {
  const storage = storageWith([[SAVE, savedLife()]]), h = boot(storage);
  storage.failWrites.add(BACKUP);
  h.api.state().lifetime.money = 7654;
  h.api.saveState();
  assert.equal(boot(storage).api.state().lifetime.money, 7654);
});

test('failed primary migration cannot replace a working backup', () => {
  const good = savedLife(), broken = JSON.parse(good);
  broken.lifetime.money = 1;
  broken.lifetime.endingTiersReached = null;
  const raw = JSON.stringify(broken), storage = storageWith([[SAVE, raw], [BACKUP, good]]);
  const h = boot(storage);
  assert.equal(h.api.state().lifetime.money, 4321);
  assert.equal(storage.getItem(SAVE), raw, 'recovery boot must retain the failed primary for inspection');
  assert.equal(storage.getItem(BACKUP), good, 'failed migration must not poison the backup');
});

test('a failed save after recovery leaves a usable backup for the next reload', () => {
  const good = savedLife(), storage = storageWith([[SAVE, '{broken'], [BACKUP, good]]);
  const h = boot(storage);
  h.api.state().lifetime.money = 7654;
  storage.failWrites.add(SAVE);
  h.api.saveState();
  assert.equal(storage.getItem(BACKUP), good);
  assert.equal(boot(storage).api.state().lifetime.money, 4321);
});

test('backup advances to the latest successful save and survives the next write failure', () => {
  const storage = storageWith([[SAVE, savedLife()]]), h = boot(storage);
  h.api.state().lifetime.money = 7654;
  h.api.saveState();
  h.api.state().lifetime.money = 9876;
  storage.failWrites.add(SAVE);
  h.api.saveState();
  storage.setItem = (key, value) => storage.data.set(key, String(value));
  storage.setItem(SAVE, '{broken');
  assert.equal(boot(storage).api.state().lifetime.money, 7654);
});

test('a missing primary resumes the backup instead of creating a new life', () => {
  const storage = storageWith([[BACKUP, savedLife()]]), h = boot(storage);
  assert.equal(h.api.state().lifetime.money, 4321);
  assert.equal(storage.getItem(SAVE), null, 'recovery boot must not auto-overwrite storage');
  h.api.saveState();
  assert.equal(boot(storage).api.state().lifetime.money, 4321);
});

test('backup recovery applies legacy migrations once and preserves old characters', () => {
  const legacy = JSON.parse(savedLife());
  legacy.schemaVersion = 3;
  legacy.ageTicks = 360; // 20 years in v3 -> 400 ticks in v4.
  legacy.speciesLine = 'rabbit';
  legacy.lifetime.companionsRecruited = ['koala'];
  legacy.lifetime.rareCompanionsRecruited = ['kinoko'];
  legacy.lifetime.minigamePlayCounts = {'region:city:road:0': 3};
  const storage = storageWith([[SAVE, '{broken'], [BACKUP, JSON.stringify(legacy)]]);
  const h = boot(storage), state = h.api.state();
  assert.equal(state.schemaVersion, 4);
  assert.equal(state.ageTicks, 400);
  assert.equal(state.speciesLine, 'rabbit');
  assert.deepEqual(Array.from(state.lifetime.companionsRecruited), ['koala']);
  assert.deepEqual(Array.from(state.lifetime.rareCompanionsRecruited), ['kinoko']);
  assert.equal(state.lifetime.minigamePlayCounts['road-city'], 3);
  h.api.saveState();
  const reloaded = boot(storage).api.state();
  assert.equal(reloaded.ageTicks, 400);
  assert.equal(reloaded.lifetime.minigamePlayCounts['road-city'], 3);
});

test('invalid top-level payloads fall back without replacing the backup', () => {
  for (const raw of ['null', '[]', '42', '"invalid"']) {
    const good = savedLife(), storage = storageWith([[SAVE, raw], [BACKUP, good]]);
    assert.equal(boot(storage).api.state().lifetime.money, 4321, raw);
    assert.equal(storage.getItem(BACKUP), good, raw);
  }
});

test('confirmed full reset cannot later resurrect the removed life from backup', () => {
  const old = savedLife(), storage = storageWith([[SAVE, old], [BACKUP, old], ['unrelated', 'keep']]);
  const h = boot(storage);
  h.api.doWipe(); // The confirmed handler, using synthetic test storage only.
  assert.equal(h.api.state().lifetime.money, 0);
  storage.setItem(SAVE, '{broken');
  assert.equal(boot(storage).api.state().lifetime.money, 0);
  assert.equal(storage.getItem('unrelated'), 'keep');
});

test('unrecoverable saves remain intact through hidden, unload and repeated saves until explicit reset', () => {
  const invalid = JSON.parse(savedLife());
  invalid.lifetime.endingTiersReached = null;
  for (const raw of [JSON.stringify(invalid), '{broken']) {
    const storage = storageWith([[SAVE, raw]]), h = boot(storage);
    h.document.visibilityState = 'hidden';
    h.dispatch(h.document, 'visibilitychange', {bubbles: false});
    h.dispatch(h.window, 'beforeunload', {bubbles: false});
    h.api.saveState();
    h.api.saveState();
    assert.equal(storage.getItem(SAVE), raw, 'unrecoverable original must not be overwritten by an empty life');
    h.api.doWipe();
    h.api.state().lifetime.money = 7;
    h.api.saveState();
    assert.equal(boot(storage).api.state().lifetime.money, 7, 'explicit reset must re-enable saving');
  }
});

test('unreadable storage still permits boot and gameplay without throwing', () => {
  const unavailable = () => {throw new Error('SecurityError');};
  const h = boot({getItem: unavailable, setItem: unavailable, removeItem: unavailable});
  assert.equal(h.api.state().lifetime.money, 0);
  assert.doesNotThrow(() => h.api.saveState());
});
