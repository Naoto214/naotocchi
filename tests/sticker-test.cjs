const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

const growing = (h) => { const s = h.api.state(); s.stage = 'growing'; s.energy = 100; h.api.render(); return s; };

test('the sticker catalog is built from existing art with unique ids and valid rarities', () => {
  const h = harness();
  const cat = h.api.stickerCatalog();
  assert.ok(cat.length >= 200, 'catalog size ' + cat.length);
  assert.equal(new Set(cat.map((s) => s.id)).size, cat.length, 'ids are unique');
  const kinds = new Set(cat.map((s) => s.kind));
  for (const k of ['form', 'companion', 'partner', 'item', 'scenery']) assert.ok(kinds.has(k), k);
  for (const s of cat) {
    assert.ok(Object.keys(h.api.STICKER_RARITY).includes(s.rarity), s.id);
    assert.ok(typeof s.visual() === 'string' && s.visual().length > 0, s.id);
  }
  for (const line of h.api.ALL_LINES) assert.ok(cat.some((s) => s.id === `form:${line}:0`), line);
  assert.ok(h.api.stickerPackPool().length < cat.length, 'the secret line stays out of packs until met');
});

test('every current item has a sticker while retired items stay out', () => {
  const h = harness();
  const itemStickers = h.api.stickerCatalog().filter((s) => s.kind === 'item');
  const ids = new Set(itemStickers.map((s) => s.id));
  const current = [
    'poop1', 'sleepboost1', 'bowtie', 'ribbon', 'scarf', 'travel1', 'partner1', 'bond1', 'gamepass1', 'star',
    'c_coin2', 'c_life', 'c_time_back', 'c_time_forward', 'c_life_charm', 'c_friend', 'c_match', 'c_transform',
    'c_rare_friend', 'c_egg_normal', 'c_egg_rare', 'c_dex',
    'naoto_charm', 'naoto_lantern', 'naoto_ring', 'naoto_crown', 'new_themed_pack',
  ];
  assert.equal(itemStickers.length, current.length, 'only the current item catalog becomes stickers');
  for (const id of current) {
    const sticker = itemStickers.find((s) => s.id === `item:${id}`);
    const visualId = id === 'new_themed_pack' ? 'sticker_pack' : id;
    const expectedAsset = `assets/items/unified/${visualId}.png`;
    assert.ok(sticker, `missing item sticker: ${id}`);
    assert.ok(sticker.label.length > 0, `missing label: ${id}`);
    assert.equal(sticker.art.asset, expectedAsset, `wrong sticker art: ${id}`);
    assert.ok(require('node:fs').existsSync(expectedAsset), `missing PNG: ${id}`);
  }
  for (const id of ['fun_candy', 'fun_camera', 'c_growth', 'c_safety', 'new_transform_mirror']) {
    assert.equal(ids.has(`item:${id}`), false, `retired item must stay out: ${id}`);
  }
});

test('duplicate stickers remain usable copies up to the nine-copy cap', () => {
  const h = harness(), store = h.api.stickerStore();
  for (let i = 1; i <= h.api.STICKER_COPY_MAX; i++) {
    const result = h.api.grantSticker('scenery:tree', 'test');
    assert.ok(result);
    assert.equal(result.count, i);
    assert.equal(result.dup, i > 1);
  }
  assert.equal(store.owned['scenery:tree'], 9);
  assert.equal(h.api.grantSticker('scenery:tree', 'test'), null);
  assert.equal(store.owned['scenery:tree'], 9);
  assert.equal(Object.hasOwn(store, 'kakera'), false, 'points are removed from current saves');
});

test('normal and category packs cost coins and never draw a sticker already at nine copies', () => {
  const h = harness(), state = h.api.state(), store = h.api.stickerStore();
  state.lifetime.money = 200;
  store.owned['scenery:tree'] = h.api.STICKER_COPY_MAX;
  const full = h.api.stickerById('scenery:tree');
  assert.ok(!h.api.stickerDrawablePool().some((s) => s.id === full.id));

  const normal = h.api.openStickerPack();
  assert.equal(normal.length, h.api.STICKER_PACK_SIZE);
  assert.equal(state.lifetime.money, 200 - h.api.STICKER_PACK_PRICE);
  assert.ok(normal.every((r) => r.sticker.id !== 'scenery:tree'));

  const themed = h.api.openThemedStickerPack('scenery');
  assert.equal(themed.length, h.api.STICKER_PACK_SIZE);
  assert.equal(state.lifetime.money, 200 - h.api.STICKER_PACK_PRICE - h.api.STICKER_THEME_PRICE);
  assert.ok(themed.every((r) => r.sticker.kind === 'scenery' && r.sticker.id !== 'scenery:tree'));
});

test('pack result marks a repeated sticker as the next copy instead of converting it to points', () => {
  const h = harness(), state = h.api.state();
  state.lifetime.money = 100;
  h.api.grantSticker('scenery:tree');
  h.api.setRandom(() => 0);
  const pool = h.api.stickerPackPool();
  const target = pool.find((s) => s.id === 'scenery:tree');
  assert.ok(target);
  const second = h.api.grantSticker(target.id);
  h.api.renderStickerPackResult?.([second]);
  assert.equal(second.count, 2);
});

test('stickers can be placed only when owned, moved within the page, and repeated up to owned copies', () => {
  const h = harness(), store = h.api.stickerStore();
  assert.equal(h.api.placeSticker('page-1', 'scenery:tree'), null, 'not owned');
  for (let i = 0; i < 3; i++) h.api.grantSticker('scenery:tree');
  const a = h.api.placeSticker('page-1', 'scenery:tree');
  const b = h.api.placeSticker('page-1', 'scenery:tree');
  const c = h.api.placeSticker('page-1', 'scenery:tree');
  assert.ok(a && b && c);
  assert.equal(h.api.placeSticker('page-1', 'scenery:tree'), null, 'cannot place more than owned copies');
  const moved = h.api.updateSticker('page-1', a.k, { x: 5, y: -1, r: 200, s: 9 });
  assert.deepEqual([moved.x, moved.y, moved.r, moved.s], [0.97, 0.03, -160, 2.2], 'values are clamped');
  assert.equal(h.api.removeSticker('page-1', a.k), true);
  assert.equal(store.pages['page-1'].length, 2);
});

test('free-page tasks are recorded once without sticker points or coin rewards', () => {
  const h = harness(), state = h.api.state(), store = h.api.stickerStore();
  growing(h);
  const money = state.lifetime.money;
  for (const id of ['form:dog:0', 'form:dog:1', 'form:cat:0']) { h.api.grantSticker(id); assert.ok(h.api.placeSticker('page-1', id)); }
  const done = h.api.checkStickerTasks();
  assert.equal(JSON.stringify(done.map((t) => t.id)), JSON.stringify(['page-any-3']));
  assert.equal(state.lifetime.money, money);
  assert.equal(Object.hasOwn(store, 'kakera'), false);
  assert.equal(h.api.checkStickerTasks().length, 0, 'no double completion');
  assert.doesNotMatch(h.get('storyFlashText').textContent, /ポイント|コイン/);
});

test('refreshed sticker tasks teach duplicate placement, two pages, and background changes', () => {
  const h = harness(), store = h.api.stickerStore();
  h.api.grantSticker('scenery:tree'); h.api.grantSticker('scenery:tree');
  h.api.placeSticker('page-1', 'scenery:tree'); h.api.placeSticker('page-1', 'scenery:tree');
  let done = h.api.checkStickerTasks().map((t) => t.id);
  assert.ok(done.includes('same-sticker-2'));

  const page2 = h.api.addStickerPage();
  h.api.grantSticker('scenery:tree');
  h.api.placeSticker(page2, 'scenery:tree');
  done = h.api.checkStickerTasks().map((t) => t.id);
  assert.ok(done.includes('multi-pages-2'));

  assert.equal(h.api.setStickerPageBackground('page-1', 'sea'), true);
  done = h.api.checkStickerTasks().map((t) => t.id);
  assert.ok(done.includes('background-change'));
  assert.ok(store.tasksDone.includes('background-change'));
});

test('legacy completed sticker tasks migrate only to logically equivalent refreshed tasks', () => {
  const h = harness(), store = h.api.stickerStore();
  store.tasksDone = ['page-form-3','any-12','multi-pages-3','page-partner-1'];
  const normalized = h.api.stickerStore();
  assert.ok(normalized.tasksDone.includes('page-any-3'));
  assert.ok(normalized.tasksDone.includes('page-8'));
  assert.ok(normalized.tasksDone.includes('multi-pages-2'));
  assert.equal(normalized.tasksDone.includes('page-partner-1'), false);
});

test('all eight sticker tasks grant the master sticker exactly once and unlock the master achievement on save', () => {
  const h = harness(), state = h.api.state(), store = h.api.stickerStore();

  // Build one page that satisfies 3 stickers, duplicate x2, item x2,
  // companion x3, その他 x3 and 8 total.
  const ids = ['item:bowtie','item:ribbon','companion:dog','companion:cat','companion:penguin','scenery:tree','scenery:tree','scenery:wave'];
  for (const id of ids) h.api.grantSticker(id);
  for (const id of ids) assert.ok(h.api.placeSticker('page-1', id));

  // Two pages.
  const page2 = h.api.addStickerPage();
  h.api.grantSticker('scenery:sun');
  assert.ok(h.api.placeSticker(page2, 'scenery:sun'));

  // Background change.
  assert.equal(h.api.setStickerPageBackground('page-1', 'sea'), true);

  h.api.checkStickerTasks();
  assert.equal(h.api.STICKER_TASKS.every((t) => store.tasksDone.includes(t.id)), true);
  assert.equal(store.owned[h.api.STICKER_TASK_MASTER_ID], 1);
  assert.equal(h.api.stickerPackPool().some((s) => s.id === h.api.STICKER_TASK_MASTER_ID), false, 'master sticker is reward-only');

  h.api.checkStickerTasks();
  assert.equal(store.owned[h.api.STICKER_TASK_MASTER_ID], 1, 'reward is exact once');

  h.api.saveState();
  assert.ok(state.achievementsUnlocked.includes('sticker-tasks-5'));
  assert.ok(state.achievementsUnlocked.includes('sticker-tasks-all'));
});

test('earned master sticker appears in the owned tray but does not change ordinary collection progress', () => {
  const h = harness(), store = h.api.stickerStore();
  const before = h.api.stickerPackPool().length;
  store.owned[h.api.STICKER_TASK_MASTER_ID] = 1;
  h.api.openExclusiveMenu('sticker');
  assert.match(h.get('stickerTray').innerHTML, /きんのシールちょう/);
  assert.match(h.get('stickerOwnedCount').textContent, /9まいまで/);
  assert.equal(h.api.stickerPackPool().length, before);
});

test('a first discovery grants that form as a sticker and the screen lists it', () => {
  const h = harness();
  growing(h);
  h.api.recordDiscoveryKey('cat:3');
  assert.equal(h.api.stickerStore().owned['form:cat:3'], 1);
  h.api.recordDiscoveryKey('cat:3');
  assert.equal(h.api.stickerStore().owned['form:cat:3'], 1, 'no duplicate for a repeat discovery');
  h.api.openExclusiveMenu('sticker');
  assert.equal(h.get('stickerOverlay').classList.contains('hidden'), false);
  assert.match(h.get('stickerTray').innerHTML, /data-sticker="form:cat:3"/);
  assert.match(h.get('stickerPageTabs').innerHTML, /data-page="page-1"/);
  assert.match(h.get('stickerFilter').innerHTML, /その他/);
  assert.match(h.get('stickerOwnedCount').textContent, /9まいまで/);
  assert.doesNotMatch(h.get('stickerOwnedCount').textContent, /ポイント/);
});

test('legacy sticker points disappear on normalization while owned copies clamp to nine', () => {
  const h = harness(), s = h.api.state();
  s.lifetime.stickers.kakera = 37;
  s.lifetime.stickers.owned['scenery:tree'] = 15;
  const store = h.api.stickerStore();
  assert.equal(Object.hasOwn(store, 'kakera'), false);
  assert.equal(store.owned['scenery:tree'], 9);
});

test('sticker data survives a save and reload, and old saves get an empty one-page book', () => {
  const SAVE = 'naotocchi-save-v1';
  const data = new Map();
  const storage = { getItem: (k) => data.get(k) ?? null, setItem(k, v) { data.set(k, String(v)); }, removeItem: (k) => data.delete(k) };
  const h = harness({ storage, resume: true });
  for (let i = 0; i < 3; i++) h.api.grantSticker('scenery:tree');
  h.api.placeSticker('page-1', 'scenery:tree');
  h.api.setStickerPageBackground('page-1', 'forest');
  h.api.saveState();
  const h2 = harness({ storage, resume: true }), store = h2.api.stickerStore();
  assert.equal(store.owned['scenery:tree'], 3);
  assert.equal(store.pages['page-1'].length, 1);
  assert.equal(store.pageMeta['page-1'].background, 'forest');
  assert.equal(Object.hasOwn(store, 'kakera'), false);
  const old = JSON.parse(data.get(SAVE)); delete old.lifetime.stickers; old.schemaVersion = 4;
  data.set(SAVE, JSON.stringify(old));
  const h3 = harness({ storage, resume: true });
  assert.deepEqual(Object.keys(h3.api.stickerStore().owned), []);
  assert.deepEqual([...h3.api.stickerPageIds()], ['page-1']);
});

test('a fresh sticker book starts with one page and grows to at most fifteen', () => {
  const h = harness();
  assert.deepEqual([...h.api.stickerPageIds()], ['page-1']);
  while (h.api.stickerPageIds().length < h.api.STICKER_BOOK_MAX_PAGES) assert.ok(h.api.addStickerPage());
  assert.equal(h.api.stickerPageIds().length, 15);
  assert.equal(h.api.addStickerPage(), null);
});

test('special region backgrounds unlock only after visiting them', () => {
  const h = harness(), state = h.api.state();
  const before = h.api.stickerBackgroundOptions().map((r) => r.id);
  assert.equal(before.includes('star_stop'), false);
  state.lifetime.specialRegionsVisited.push('star_stop');
  assert.ok(h.api.stickerBackgroundOptions().some((r) => r.id === 'star_stop'));
  assert.equal(h.api.setStickerPageBackground('page-1', 'star_stop'), true);
});

test('legacy four-category pages migrate without losing placed stickers', () => {
  const h = harness();
  const old = h.api.state().lifetime.stickers;
  old.pages = { home: [{ id: 'scenery:tree', x: .2, y: .2, r: 0, s: 1, k: 1 }], travel: [], friends: [{ id: 'item:bowtie', x: .4, y: .4, r: 0, s: 1, k: 2 }], memory: [] };
  delete old.pageOrder; delete old.pageMeta;
  const migrated = h.api.stickerStore();
  assert.deepEqual([...migrated.pageOrder], ['page-1', 'page-2']);
  assert.equal(migrated.pages['page-1'][0].id, 'scenery:tree');
  assert.equal(migrated.pages['page-2'][0].id, 'item:bowtie');
});

test('page export resolves to null without a real canvas', async () => {
  const h = harness();
  assert.equal(await h.api.exportStickerPageImage('page-1'), null);
  assert.equal(await h.api.exportStickerPageImage('nope'), null);
});
