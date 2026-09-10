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

const SNAPS = SAVE + '-snaps';
function replacementHarness(storage) {
  const h=boot(storage);
  Object.assign(h.sandbox,{TextEncoder,TextDecoder,atob,btoa});
  h.sandbox.location.reload=()=>{};
  h.advance(10000);
  return h;
}
function replaceLife(h,action,raw) {
  if(action==='import') {
    h.get('saveImportInput').value='NTS1.'+Buffer.from(raw).toString('base64url');
    h.dispatch(h.get('saveImportBtn'),'click');h.dispatch(h.get('saveImportBtn'),'click');
  } else {
    const snap={at:900,raw};
    h.api.restoreSaveSnapshot(snap);h.api.restoreSaveSnapshot(snap);
  }
}
// Prepare the visible controls before injecting storage faults. Restore uses the
// snapshot row's real confirmation button, including its rerender on first click.
function prepareReplacementUI(h,storage,action,raw) {
  if(action==='import') {
    return () => replaceLife(h,action,raw);
  }
  storage.setItem(SNAPS,JSON.stringify([{at:900,raw}]));
  h.dispatch(h.get('profileBtn'),'click');
  return () => {
    for(let i=0;i<2;i++) h.dispatch(h.get('saveSnapList').children[0].children[1],'click');
  };
}
function assertReplacementFailureNotice(h,action) {
  const notice=h.get(action==='import'?'saveImportStatus':'saveSnapStatus').textContent;
  assert.match(notice,action==='import'?/セーブをおきかえられませんでした/:/セーブをもどせませんでした/);
  assert.doesNotMatch(notice,/残せなかった/,'the result must not claim that retaining the old life failed');
}
for(const action of ['import','restore']) {
  test(action+' retains a newer primary saved by another tab before replacement', () => {
    const storage=storageWith([[SAVE,savedLife()]]),first=replacementHarness(storage);
    const second=replacementHarness(storage);
    second.api.state().lifetime.money=9876;second.api.saveState();
    const latest=storage.getItem(SAVE),target=JSON.parse(latest);target.lifetime.money=99;
    assert.ok(!JSON.parse(storage.getItem(SNAPS)).some(s=>s.raw===latest),'the periodic interval has not retained it yet');
    replaceLife(first,action,JSON.stringify(target));
    assert.equal(boot(storage).api.state().lifetime.money,99);
    const prior=JSON.parse(storage.getItem(SNAPS)).find(s=>s.raw===latest);
    assert.ok(prior,'the other tab\'s most recent persisted life remains available for undo');
    const next=replacementHarness(storage);next.api.restoreSaveSnapshot(prior);next.api.restoreSaveSnapshot(prior);
    assert.equal(boot(storage).api.state().lifetime.money,9876);
  });
  test(action+' failure cannot poison a recovered backup with the broken primary', () => {
    const good=savedLife(),target=JSON.parse(good);target.lifetime.money=99;
    const storage=storageWith([[SAVE,'{broken'],[BACKUP,good]]),h=replacementHarness(storage);
    const replaceFromUI=prepareReplacementUI(h,storage,action,JSON.stringify(target));
    storage.removeItem(BACKUP); // Its reappearance proves backup retention succeeded in this attempt.
    storage.failWrites.add(SAVE);
    replaceFromUI();
    assert.equal(storage.getItem(SAVE),'{broken','the failed primary write cannot replace its old value');
    assert.equal(storage.getItem(BACKUP),good);
    assert.ok(JSON.parse(storage.getItem(SNAPS)).some(s=>s.raw===good),'snapshot retention succeeded before the primary failure');
    assertReplacementFailureNotice(h,action);
    assert.equal(boot(storage).api.state().lifetime.money,4321);
  });
  test(action+' stops before replacing a save if its safety snapshot cannot be written', () => {
    const good=savedLife(),target=JSON.parse(good);target.lifetime.money=99;
    const storage=storageWith([[SAVE,good]]),h=replacementHarness(storage);
    const before=storage.getItem(SAVE);
    storage.removeItem(SNAPS); // No prior safety copy: boot may have saved one already.
    const replaceFromUI=prepareReplacementUI(h,storage,action,JSON.stringify(target));
    const snapshotsBefore=storage.getItem(SNAPS);
    storage.failWrites.add(SNAPS);
    replaceFromUI();
    assert.equal(storage.getItem(SAVE),before);
    assert.equal(storage.getItem(SNAPS),snapshotsBefore,'failed retention cannot alter the snapshot list');
    assertReplacementFailureNotice(h,action);
    assert.equal(boot(storage).api.state().lifetime.money,4321);
  });
  test(action+' retains the prior life across replacement, reload and undo, including duplicate snapshots', () => {
    const good=savedLife(),target=JSON.parse(good);target.lifetime.money=99;
    const storage=storageWith([[SAVE,good],[SNAPS,JSON.stringify([{at:800,raw:good}])]]);
    const h=replacementHarness(storage);
    const before=storage.getItem(SAVE);
    storage.setItem(SNAPS,JSON.stringify([{at:800,raw:before}]));
    storage.failWrites.add(SNAPS); // The identical retained copy does not need another write.
    replaceLife(h,action,JSON.stringify(target));
    h.dispatch(h.window,'beforeunload',{bubbles:false});
    assert.equal(boot(storage).api.state().lifetime.money,99,'pending reload cannot overwrite the target');
    const snapshots=JSON.parse(storage.getItem(SNAPS));
    const prior=snapshots.find(s=>s.raw===before);assert.ok(prior,'the original remains available after reload');
    storage.failWrites.delete(SNAPS);
    const next=replacementHarness(storage);
    next.api.restoreSaveSnapshot(prior);next.api.restoreSaveSnapshot(prior);
    assert.equal(boot(storage).api.state().lifetime.money,4321);
  });
}

test('export uses the recoverable save when a broken primary cannot be repaired', () => {
  const good=savedLife(),storage=storageWith([[SAVE,'{broken'],[BACKUP,good]]),h=replacementHarness(storage);
  storage.failWrites.add(SAVE);
  h.dispatch(h.get('saveExportBtn'),'click');
  const json=Buffer.from(h.get('saveExportText').value.slice(5),'base64url').toString();
  assert.equal(JSON.parse(json).lifetime.money,4321);
});

test('explicit import can recover unreadable saves while retaining both originals for inspection', () => {
  const storage=storageWith([[SAVE,'{broken-primary'],[BACKUP,'{broken-backup']]);
  const h=replacementHarness(storage);
  replaceLife(h,'import',savedLife());
  assert.equal(boot(storage).api.state().lifetime.money,4321);
  const retained=JSON.parse(storage.getItem(SNAPS)).map(s=>s.raw);
  assert.ok(retained.includes('{broken-primary'));
  assert.ok(retained.includes('{broken-backup'));
});

test('import from backup recovery with no primary retains the former life after reload', () => {
  const good=savedLife(),target=JSON.parse(good);target.lifetime.money=99;
  const storage=storageWith([[BACKUP,good]]),h=replacementHarness(storage);
  replaceLife(h,'import',JSON.stringify(target));
  assert.equal(boot(storage).api.state().lifetime.money,99);
  assert.ok(JSON.parse(storage.getItem(SNAPS)).some(s=>s.raw===good));
});

test('a full storage drops the automatic snapshots and still writes the primary save', () => {
  const SNAPS = 'naotocchi-save-v1-snaps';
  const storage = storageWith([[SAVE, savedLife()], [SNAPS, '[]']]), h = boot(storage);
  let failsLeft = 1;
  const plainSet = storage.setItem.bind(storage);
  storage.setItem = (key, value) => {
    if (key === SAVE && failsLeft > 0) { failsLeft--; const e = new Error('The quota has been exceeded.'); e.name = 'QuotaExceededError'; throw e; }
    return plainSet(key, value);
  };
  h.api.state().lifetime.money = 999;
  h.api.saveState();
  assert.equal(storage.data.has(SNAPS), false, 'snapshots are pruned first');
  assert.match(storage.data.get(SAVE), /"money":999/, 'the primary save is retried and written');
});

test('a permanently full storage warns instead of failing silently', () => {
  const storage = storageWith([[SAVE, savedLife()]]), h = boot(storage);
  storage.setItem = () => { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; };
  h.api.state().lifetime.money = 555;
  h.api.saveState();
  assert.ok(h.sandbox.__naotocchiErrors.some(e => e.where === 'storage'), 'the quota failure is recorded and surfaced');
});
