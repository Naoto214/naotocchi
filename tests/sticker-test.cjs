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

test('granting stickers records copies and turns duplicates into kakera by rarity', () => {
  const h = harness(), store = h.api.stickerStore();
  const first = h.api.grantSticker('scenery:tree', 'test');
  assert.equal(first.dup, false); assert.equal(store.owned['scenery:tree'], 1); assert.equal(store.kakera, 0);
  const again = h.api.grantSticker('scenery:tree', 'test');
  assert.equal(again.dup, true); assert.equal(again.kakera, 1); assert.equal(store.kakera, 1);
  const rare = h.api.stickerCatalog().find((s) => s.rarity === 'rare' && !s.secret);
  h.api.grantSticker(rare.id); h.api.grantSticker(rare.id);
  assert.equal(store.kakera, 1 + h.api.STICKER_RARITY.rare.kakera);
  assert.equal(h.api.grantSticker('nope:x'), null);
  assert.equal(h.api.ownedStickerKinds(h.api.state().lifetime), 2);
});

test('packs cost coins, hand out three stickers, and the kakera pack guarantees something new', () => {
  const h = harness(), state = h.api.state(), store = h.api.stickerStore();
  state.lifetime.money = 10;
  assert.equal(h.api.openStickerPack(), null, 'too poor');
  assert.equal(state.lifetime.money, 10);
  state.lifetime.money = 100;
  const results = h.api.openStickerPack();
  assert.equal(results.length, h.api.STICKER_PACK_SIZE);
  assert.equal(state.lifetime.money, 100 - h.api.STICKER_PACK_PRICE);
  assert.equal(store.packsOpened, 1);
  for (const r of results) assert.ok(store.owned[r.sticker.id] >= 1);
  assert.equal(h.api.openKakeraPack(), null, 'no kakera yet');
  store.kakera = h.api.STICKER_KAKERA_PACK;
  const fresh = h.api.openKakeraPack();
  assert.equal(fresh.length, 1);
  assert.equal(fresh[0].dup, false, 'a kakera pack picks an unowned sticker while any remain');
  assert.equal(store.kakera, 0);
});

test('stickers can be placed only when owned, moved within the page, and removed', () => {
  const h = harness(), store = h.api.stickerStore();
  assert.equal(h.api.placeSticker('home', 'scenery:tree'), null, 'not owned');
  h.api.grantSticker('scenery:tree');
  const entry = h.api.placeSticker('home', 'scenery:tree');
  assert.ok(entry && entry.k > 0);
  assert.deepEqual([entry.x, entry.y, entry.r, entry.s], [0.5, 0.5, 0, 1]);
  assert.equal(h.api.placeSticker('travel', 'scenery:tree'), null, 'only one owned copy, already placed');
  h.api.grantSticker('scenery:tree');
  assert.ok(h.api.placeSticker('travel', 'scenery:tree'), 'a duplicate copy can be placed too');
  assert.equal(h.api.placedStickerCount('scenery:tree'), 2);
  const moved = h.api.updateSticker('home', entry.k, { x: 5, y: -1, r: 200, s: 9 });
  assert.deepEqual([moved.x, moved.y, moved.r, moved.s], [0.97, 0.03, -160, 2.2], 'values are clamped');
  h.api.saveState();
  assert.equal(store.pages.home.length, 1);
  assert.equal(h.api.removeSticker('home', entry.k), true);
  assert.equal(h.api.removeSticker('home', entry.k), false);
  assert.equal(store.pages.home.length, 0);
  for (let i = 0; i < h.api.STICKER_PAGE_MAX + 2; i++) h.api.grantSticker('item:flower');
  for (let i = 0; i < h.api.STICKER_PAGE_MAX; i++) assert.ok(h.api.placeSticker('memory', 'item:flower'));
  assert.equal(h.api.placeSticker('memory', 'item:flower'), null, 'a page holds at most ' + h.api.STICKER_PAGE_MAX);
});

test('page tasks pay out once and count toward the sticker achievements', () => {
  const h = harness(), state = h.api.state(), store = h.api.stickerStore();
  growing(h);
  const money = state.lifetime.money;
  for (const id of ['form:dog:0', 'form:dog:1', 'form:cat:0']) { h.api.grantSticker(id); assert.ok(h.api.placeSticker('home', id)); }
  const done = h.api.checkStickerTasks();
  assert.equal(JSON.stringify(done.map((t) => t.id)), JSON.stringify(['home-form-3']));
  const task = h.api.STICKER_TASKS.find((t) => t.id === 'home-form-3');
  assert.equal(state.lifetime.money, money + task.reward.coins);
  assert.equal(store.kakera, task.reward.kakera);
  assert.equal(h.api.checkStickerTasks().length, 0, 'no double reward');
  assert.match(h.get('storyFlashText').textContent, /おだい ?たっせい/);
  const cat = h.api.stickerCatalog().filter((s) => !s.secret).slice(0, 10);
  for (const s of cat) h.api.grantSticker(s.id);
  h.api.saveState();
  assert.ok(state.achievementsUnlocked.includes('sticker-10'));
});

test('a first discovery grants that form as a sticker and the screen lists it', () => {
  const h = harness(), state = h.api.state();
  growing(h);
  h.api.recordDiscoveryKey('cat:3');
  assert.equal(h.api.stickerStore().owned['form:cat:3'], 1);
  h.api.recordDiscoveryKey('cat:3');
  assert.equal(h.api.stickerStore().owned['form:cat:3'], 1, 'no duplicate for a repeat discovery');
  h.api.openExclusiveMenu('sticker');
  assert.equal(h.get('stickerOverlay').classList.contains('hidden'), false);
  assert.match(h.get('stickerTray').innerHTML, /data-sticker="form:cat:3"/);
  assert.match(h.get('stickerTray').innerHTML, /class="sticker-cell rarity-common new"/, 'first view shows NEW');
  assert.match(h.get('stickerPageTabs').innerHTML, /data-page="memory"/);
  assert.match(h.get('stickerTasks').innerHTML, /おうちに しゅぞくの シールを 3まい/);
  assert.match(h.get('stickerProgress').textContent, /^1 \/ \d+$/);
  h.api.placeSticker('home', 'form:cat:3'); h.api.render();
  assert.match(h.get('stickerBoard').innerHTML, /sticker-placed/);
  h.api.setStickerPage('travel'); h.api.render();
  assert.doesNotMatch(h.get('stickerBoard').innerHTML, /sticker-placed/);
  assert.equal(h.get('stickerBoard').dataset.page, 'travel');
  h.api.closeAllMenuOverlays(); h.api.render();
  assert.equal(h.get('stickerOverlay').classList.contains('hidden'), true);
  h.api.openExclusiveMenu('sticker');
  assert.doesNotMatch(h.get('stickerTray').innerHTML, /rarity-common new"/, 'seen stickers lose NEW');
});

test('sticker data survives a save and reload, and old saves get an empty book', () => {
  const SAVE = 'naotocchi-save-v1';
  const data = new Map();
  const storage = { getItem: (k) => data.get(k) ?? null, setItem(k, v) { data.set(k, String(v)); }, removeItem: (k) => data.delete(k) };
  const h = harness({ storage, resume: true });
  h.api.grantSticker('scenery:tree'); h.api.placeSticker('friends', 'scenery:tree');
  h.api.stickerStore().kakera = 4;
  h.api.saveState();
  const h2 = harness({ storage, resume: true }), store = h2.api.stickerStore();
  assert.equal(store.owned['scenery:tree'], 1);
  assert.equal(store.pages.friends.length, 1);
  assert.equal(store.kakera, 4);
  const old = JSON.parse(data.get(SAVE)); delete old.lifetime.stickers; old.schemaVersion = 4;
  data.set(SAVE, JSON.stringify(old));
  const h3 = harness({ storage, resume: true });
  assert.deepEqual(Object.keys(h3.api.stickerStore().owned), []);
});

test('page export resolves to null without a real canvas', async () => {
  const h = harness();
  assert.equal(await h.api.exportStickerPageImage('home'), null);
  assert.equal(await h.api.exportStickerPageImage('nope'), null);
});
