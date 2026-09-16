const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

const SAVE = 'naotocchi-save-v1';
function storageWith(entries = []) {
  const data = new Map(entries);
  return { data, getItem: (k) => data.get(k) ?? null, setItem(k, v) { data.set(k, String(v)); }, removeItem: (k) => data.delete(k) };
}
const boot = (save) => harness({ storage: storageWith([[SAVE, JSON.stringify(save)]]), resume: true });
const line = () => harness().api.ALL_LINES[0];

test('a fresh save is schemaVersion 5 and survives a save/load round trip unchanged', () => {
  const h = harness(), state = h.api.state();
  assert.equal(state.schemaVersion, 5);
  state.stage = 'growing'; state.speciesLine = line(); state.ageTicks = 777; state.lifetime.money = 55;
  const storage = storageWith();
  const h2 = harness({ storage, resume: true });
  const s2 = h2.api.state();
  Object.assign(s2, JSON.parse(JSON.stringify(state)));
  h2.api.saveState();
  const s3 = boot(JSON.parse(storage.getItem(SAVE))).api.state();
  assert.equal(s3.schemaVersion, 5);
  assert.equal(s3.ageTicks, 777, 'v5 saves are not re-scaled');
  assert.equal(s3.lifetime.money, 55);
});

test('a schemaVersion 3 save keeps its displayed age (18 -> 20 ticks per year)', () => {
  const state = boot({ schemaVersion: 3, stage: 'growing', speciesLine: line(), ageTicks: 900, lifetime: { money: 12 } }).api.state();
  assert.equal(state.ageTicks, 1000, '50 years at 18 ticks/year becomes 50 years at 20');
  assert.equal(state.schemaVersion, 5);
  assert.equal(state.lifetime.money, 12);
  assert.ok(state.gender, 'identity is rolled for an old growing save');
});

test('a pre-schema save converts the old age scale, stage names, and freePlay', () => {
  const state = boot({ stage: 'adult', species: 'dog', age: 600, freePlay: true, lifetime: { money: 3 } }).api.state();
  assert.equal(state.stage, 'growing');
  assert.equal(state.ageTicks, 30 * 20, 'age/20 = 30 displayed years');
  assert.equal(state.sodachi, 50);
  assert.equal(state.lifetime.perfectCleared, true);
  assert.equal(state.infinite, true);
  assert.equal(state.schemaVersion, 5);
  assert.equal(state.age, undefined, 'legacy fields are dropped');
});

test('schemaVersion 5 heals wrong shapes without touching valid values', () => {
  const save = {
    schemaVersion: 4, stage: 'growing', speciesLine: line(), ageTicks: '12', hunger: 250, energy: 'x', happiness: 40,
    midlifeSeen: 'nope', oneTimeBoosts: 3, lifeLog: [null, { age: 1, icon: '🍚', text: 'ごはん' }, 'str'], companions: 'x',
    actionCounts: { feed: 2 }, isSleeping: 0,
    lifetime: { money: 9, pastLives: [{ species: 'dog' }, null], companionsRecruited: 'bad', minigameRecords: [] },
  };
  const h = boot(save), state = h.api.state();
  assert.equal(state.schemaVersion, 5);
  assert.equal(state.ageTicks, 0, 'a string tick count falls back to the fresh value');
  assert.equal(state.hunger, 100, 'meters are clamped');
  assert.equal(state.energy, 90, 'a non-number meter takes the fresh value');
  assert.equal(state.happiness, 40, 'valid values stay');
  assert.deepEqual([...state.midlifeSeen], []);
  assert.equal(typeof state.oneTimeBoosts, 'object');
  assert.equal(state.oneTimeBoosts.sicknessShieldCount, 0);
  assert.equal(state.lifeLog.length, 1);
  assert.deepEqual([...state.companions], []);
  assert.equal(state.actionCounts.feed, 2);
  assert.equal(state.actionCounts.play, 0, 'nested gaps are filled');
  assert.equal(state.isSleeping, false, 'a numeric flag becomes a boolean');
  assert.equal(state.lifetime.money, 9);
  assert.equal(state.lifetime.pastLives.length, 1);
  assert.deepEqual([...state.lifetime.pastLives[0].log], []);
  assert.equal(state.lifetime.pastLives[0].code, null);
  assert.deepEqual([...state.lifetime.companionsRecruited], []);
  assert.equal(Array.isArray(state.lifetime.minigameRecords), false);
  h.api.render();
  h.api.tick();
});

test('normalizeStateShape is idempotent on a fresh state', () => {
  const h = harness();
  const fresh = h.api.freshState();
  const before = JSON.stringify(fresh);
  h.api.normalizeStateShape(fresh, h.api.freshState());
  h.api.normalizeStateValues(fresh);
  assert.equal(JSON.stringify(fresh), before);
});

test('the infinite-world return snapshot is normalized with the save', () => {
  const state = boot({ schemaVersion: 4, stage: 'growing', speciesLine: line(), infinite: true, infiniteReturn: { schemaVersion: 4, stage: 'growing', ageTicks: 100, lifeLog: 'x' } }).api.state();
  assert.equal(state.infiniteReturn.schemaVersion, 5);
  assert.deepEqual([...state.infiniteReturn.lifeLog], []);
  assert.equal(state.infiniteReturn.ageTicks, 100);
});

const retiredEquipment = ['flower', 'energy1', 'hat', 'crown', 'glasses'];
function equipmentSave(lifetime = {}, extra = {}) {
  return { schemaVersion: 5, stage: 'egg', lifetime: { money: 17, ownedShopItems: retiredEquipment, ...lifetime }, ...extra };
}

test('normal equipment V2 refunds all five owned retired IDs before catalog filtering', () => {
  const state = boot(equipmentSave({ equippedItemId: 'crown' })).api.state();
  assert.equal(state.lifetime.money, 2297);
  assert.deepEqual([...state.lifetime.ownedShopItems], []);
  assert.equal(state.lifetime.equippedItemId, null);
  assert.equal(state.lifetime.itemMigrations.normalEquipmentV2, true);
});

for (const [id, refund] of [['flower',120], ['energy1',360], ['hat',540], ['crown',900], ['glasses',360]]) {
  test(`normal equipment V2 refunds ${id} once and unequips it`, () => {
    const state = boot(equipmentSave({ ownedShopItems: [id, id], equippedItemId: id })).api.state();
    assert.equal(state.lifetime.money, 17 + refund);
    assert.deepEqual([...state.lifetime.ownedShopItems], []);
    assert.equal(state.lifetime.equippedItemId, null);
    assert.equal(state.lifetime.ownedShopItems.includes('gamepass1'), false);
  });
}

test('normal equipment V2 ignores purchase history without actual ownership', () => {
  const state = boot(equipmentSave({ ownedShopItems: [], itemPurchases: { flower: 8, energy1: 3, hat: 1, crown: 1, glasses: 4 } })).api.state();
  assert.equal(state.lifetime.money, 17);
  assert.deepEqual([...state.lifetime.ownedShopItems], []);
  assert.equal(state.lifetime.itemMigrations.normalEquipmentV2, true);
});

test('normal equipment V2 marked saves remove stale retired equipment without refunding again', () => {
  const state = boot(equipmentSave({ itemMigrations: { normalEquipmentV2: true }, equippedItemId: 'glasses' })).api.state();
  assert.equal(state.lifetime.money, 17);
  assert.deepEqual([...state.lifetime.ownedShopItems], []);
  assert.equal(state.lifetime.equippedItemId, null);
});

for (const marker of [null, [], 'bad', { normalEquipmentV2: 'false' }, { normalEquipmentV2: 1 }, { normalEquipmentV2: {} }]) {
  test(`normal equipment V2 heals malformed migration marker ${JSON.stringify(marker)}`, () => {
    const state = boot(equipmentSave({ itemMigrations: marker })).api.state();
    assert.equal(state.lifetime.money, 2297);
    assert.equal(state.lifetime.itemMigrations.normalEquipmentV2, true);
  });
}

test('normal equipment V2 heals malformed money and ownership without creating unowned refunds', () => {
  const state = boot(equipmentSave({ money: '500', ownedShopItems: 'flower', equippedItemId: 'flower' })).api.state();
  assert.equal(state.lifetime.money, 0);
  assert.deepEqual([...state.lifetime.ownedShopItems], []);
  assert.equal(state.lifetime.equippedItemId, null);
  assert.equal(state.lifetime.itemMigrations.normalEquipmentV2, true);
  const mixed = boot(equipmentSave({ ownedShopItems: [null, {}, 'toString', '__proto__', 'flower', 'flower'] })).api.state();
  assert.equal(mixed.lifetime.money, 137);
  assert.deepEqual([...mixed.lifetime.ownedShopItems], []);
});

test('normal equipment V2 refunds survive save/load, repeated normalization and the next life', () => {
  const storage = storageWith([[SAVE, JSON.stringify(equipmentSave())]]);
  const h = harness({ storage, resume: true });
  const state = h.api.state();
  assert.equal(state.lifetime.money, 2297);
  for (let i = 0; i < 3; i++) {
    h.api.normalizeStateShape(state, h.api.freshState());
    h.api.normalizeStateValues(state);
  }
  assert.equal(state.lifetime.money, 2297);
  h.api.saveState();
  const resumed = harness({ storage, resume: true });
  assert.equal(resumed.api.state().lifetime.money, 2297);
  resumed.dispatch(resumed.get('resetBtn'), 'click');
  assert.equal(resumed.api.state().lifetime.money, 2297);
  assert.equal(resumed.api.state().lifetime.itemMigrations.normalEquipmentV2, true);
  resumed.api.saveState();
  assert.equal(harness({ storage, resume: true }).api.state().lifetime.money, 2297);
});

test('normal equipment V2 infinite return never credits its snapshot into the live balance', () => {
  const h = boot(equipmentSave({}, { infinite: true, infiniteReturn: equipmentSave({ equippedItemId: 'glasses' }) }));
  const state = h.api.state();
  assert.equal(state.lifetime.money, 2297);
  assert.deepEqual([...state.infiniteReturn.lifetime.ownedShopItems], []);
  assert.equal(state.infiniteReturn.lifetime.equippedItemId, null);
  state.lifetime.money -= 50;
  h.api.exitInfinite();
  assert.equal(h.api.state().lifetime.money, 2247);
  assert.equal(h.api.state().lifetime.itemMigrations.normalEquipmentV2, true);
  const resumed = boot(h.api.state());
  assert.equal(resumed.api.state().lifetime.money, 2247);
  resumed.api.enterInfinite();
  resumed.api.exitInfinite();
  assert.equal(resumed.api.state().lifetime.money, 2247);
});

test('normal equipment V2 does not repay an old infinite snapshot when the live save is marked', () => {
  const h = boot(equipmentSave({ money: 87, ownedShopItems: ['bowtie'], itemMigrations: { normalEquipmentV2: true } },
    { infinite: true, infiniteReturn: equipmentSave() }));
  assert.equal(h.api.state().lifetime.money, 87);
  h.api.exitInfinite();
  assert.equal(h.api.state().lifetime.money, 87);
  assert.deepEqual([...h.api.state().lifetime.ownedShopItems], ['bowtie']);
});

test('normal equipment V2 canonicalizes tier aliases and refunds each retired base only once', () => {
  const state = boot(equipmentSave({
    ownedShopItems: ['flower', 'flower2', 'flower3', 'energy2', 'energy3', 'hat3', 'crown2', 'glasses3', 'glasses', 'bowtie2', 'bowtie'],
    equippedItemId: 'glasses3',
  })).api.state();
  assert.equal(state.lifetime.money, 2297);
  assert.deepEqual([...state.lifetime.ownedShopItems], ['bowtie']);
  assert.equal(state.lifetime.equippedItemId, null);
  assert.equal(state.lifetime.ownedShopItems.includes('gamepass1'), false);
});
