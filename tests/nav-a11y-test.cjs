const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

// RH-10 Navigation, Notifications & A11y(Roadmap §8.4〜8.6・§8.9、P1-8 は オーナーの 決定 ①)。
const SAVE = 'naotocchi-save-v1';
const root = path.resolve(__dirname, '..');
function storageWith(entries = []) {
  const data = new Map(entries);
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
}
const flush = () => new Promise((r) => setImmediate(r));
function growing(h) {
  // index.html では はじめから hidden(harness の 要素は class なしで 生まれる ので そろえる)
  for (const id of ['wipeOverlay', 'wipeConfirmOverlay', 'lifeCardOverlay']) h.get(id).classList.add('hidden');
  Object.assign(h.api.state(), { stage: 'growing', speciesLine: 'dog', ageTicks: 600, hunger: 90, happiness: 90, energy: 90, health: 100, isSleeping: false, isSick: false });
  return h.api.state();
}

// ---------- P1-8: item-all は「一度でも 手に入れた」 ----------
function itemAll(h) { return Array.from(h.api.achievements).find((a) => a.id === 'item-all'); }
test('item-all counts consumables ever acquired: a held (never used) life charm counts, no near-death needed', () => {
  const h = harness({ deterministic: true }), s = growing(h), L = s.lifetime;
  L.ownedShopItems = Array.from(h.api.SHOP_ITEMS, (it) => it.id);
  const all = Array.from(h.api.CONSUMABLE_ITEMS, (it) => it.id);
  L.ownedConsumableItems = all.filter((id) => id !== 'c_life_charm');
  assert.equal(itemAll(h).condition(L, s), false, 'not yet: the life charm was never acquired');
  L.itemInventory = { ...(L.itemInventory || {}), c_life_charm: 1 };
  assert.equal(itemAll(h).condition(L, s), true, 'holding it counts');
  L.itemInventory.c_life_charm = 0; L.ownedConsumableItems.push('c_life_charm');
  assert.equal(itemAll(h).condition(L, s), true, 'having used it counts');
  L.ownedShopItems.pop();
  assert.equal(itemAll(h).condition(L, s), false, 'equipment is still required');
});

test('PERFECT and unlocked achievements are never revoked when the items or dex later change', () => {
  const storage = storageWith();
  const h = harness({ deterministic: true, storage }), s = growing(h);
  s.lifetime.perfectCleared = true; s.lifetime.dexCleared = true;
  s.achievementsUnlocked = Array.from(h.api.achievements, (a) => a.id);
  s.lifetime.ownedShopItems = []; s.lifetime.ownedConsumableItems = []; s.lifetime.itemInventory = {};
  s.discoveredStages = [];
  h.api.checkAchievements(); h.api.saveState();
  const saved = JSON.parse(storage.getItem(SAVE));
  assert.equal(saved.lifetime.perfectCleared, true);
  assert.equal(saved.lifetime.dexCleared, true);
  assert.ok(saved.achievementsUnlocked.includes('item-all'));
  assert.equal(saved.achievementsUnlocked.length, Array.from(h.api.achievements).length);
});

// ---------- §8.9: ④⑤ の おいわいは 見る まえに とじても もういちど 出る ----------
test('a reached PERFECT celebration is saved as pending and comes back after a reload until it is closed', () => {
  const storage = storageWith();
  const h = harness({ deterministic: true, storage }), s = growing(h);
  s.lifetime.perfectCleared = false;
  s.achievementsUnlocked = Array.from(h.api.achievements, (a) => a.id);
  h.api.saveState();
  assert.equal(JSON.parse(storage.getItem(SAVE)).lifetime.pendingGrandGoal, 'perfect');
  // 見る まえに とじた → 次の 起動で もういちど
  const again = harness({ deterministic: true, storage, resume: true });
  assert.equal(again.get('gameClearOverlay').classList.contains('hidden'), false, 'the celebration is shown again');
  again.dispatch(again.get('gameClearCloseBtn'), 'click');
  again.advance(1000);
  assert.equal(JSON.parse(storage.getItem(SAVE)).lifetime.pendingGrandGoal, undefined, 'cleared once seen');
  const third = harness({ deterministic: true, storage, resume: true });
  assert.equal(third.get('gameClearOverlay').classList.contains('hidden'), true);
});

test('a pending celebration without the matching clear flag is dropped (never shown by itself)', () => {
  const storage = storageWith();
  const h = harness({ deterministic: true, storage }); growing(h);
  h.api.saveState();
  const raw = JSON.parse(storage.getItem(SAVE));
  raw.lifetime.pendingGrandGoal = 'dex'; raw.lifetime.dexCleared = false;
  storage.setItem(SAVE, JSON.stringify(raw));
  const b = harness({ deterministic: true, storage, resume: true });
  assert.equal(b.get('gameClearOverlay').classList.contains('hidden'), true);
  b.api.saveState();
  assert.equal(JSON.parse(storage.getItem(SAVE)).lifetime.pendingGrandGoal, undefined);
});

// ---------- §8.4: 戻る(history)と Escape は 同じ closeTopLayer ----------
function withHistory(h) {
  const calls = [];
  h.sandbox.history = { pushState: (st) => calls.push(['push', st && st.nt]), back: () => calls.push(['back']) };
  return calls;
}
const popstate = (h) => h.dispatch(h.window, 'popstate', { bubbles: false });
test('a panel pushes one history entry; back closes it; closing by UI removes the entry; home back does nothing', async () => {
  const h = harness({ deterministic: true }); growing(h);
  const calls = withHistory(h);
  h.api.openExclusiveMenu('dex'); h.api.render(); await flush();
  assert.deepEqual(calls, [['push', 'layer']]);
  // 層の あいだの 移動では ふやさない
  h.api.openExclusiveMenu('ach'); h.api.render(); await flush();
  assert.deepEqual(calls, [['push', 'layer']]);
  popstate(h); await flush();
  assert.equal(h.api.isAnyMenuOverlayOpen(), false, 'back closed the panel');
  assert.deepEqual(calls, [['push', 'layer']], 'no extra entry after back');
  // UI で 閉じたら entry を けす(その popstate は むしする)
  h.api.openExclusiveMenu('dex'); h.api.render(); await flush();
  h.api.closeAllMenuOverlays(); h.api.render(); await flush();
  assert.deepEqual(calls.slice(1), [['push', 'layer'], ['back']]);
  popstate(h); await flush(); // その back の popstate
  assert.equal(h.api.isAnyMenuOverlayOpen(), false);
  // home で 戻る: 何も しない(ページを はなれる)
  popstate(h); await flush();
  assert.deepEqual(calls.slice(3), []);
});

test('back during a minigame asks to quit instead of ending it, and stays in the layer', async () => {
  const h = harness({ deterministic: true }); growing(h);
  const calls = withHistory(h);
  h.dispatch(h.get('playBtn'), 'click');
  h.api.render(); await flush();
  assert.equal(h.get('minigameOverlay').classList.contains('hidden'), false, 'a minigame is running');
  const pushes = calls.length;
  popstate(h); await flush();
  assert.equal(h.get('minigameOverlay').classList.contains('hidden'), false, 'the game keeps running');
  assert.equal(h.get('mgQuitConfirm').classList.contains('hidden'), false, 'the quit confirmation is shown');
  assert.equal(calls.length, pushes + 1, 'the entry is pushed back so the next back stays in the app');
});

test('Escape closes the top panel through the same path', () => {
  const h = harness({ deterministic: true }); growing(h);
  h.api.openExclusiveMenu('dex'); h.api.render();
  h.dispatch(h.document, 'keydown', { key: 'Escape', bubbles: false });
  assert.equal(h.api.isAnyMenuOverlayOpen(), false);
});

// ---------- §8.5: 優先度 0(critical)は 上書き されない ----------
test('a critical notice (another tab) is not overwritten for 8 s; the latest ordinary notice follows it', () => {
  const h = harness({ deterministic: true }); growing(h);
  h.dispatch(h.window, 'storage', { key: SAVE, newValue: '{}', bubbles: false });
  assert.match(h.api.getMessage(), /べつのタブ/);
  h.api.setMessage ? h.api.setMessage('ふつうの おしらせ') : null;
  h.api.pushLifeLog && h.api.pushLifeLog('🐶', 'x');
  assert.match(h.api.getMessage(), /べつのタブ/, 'still the critical notice');
});

// ---------- §8.6: role・inert・reduced motion ----------
test('every overlay is a named modal dialog; story flash and birthday toast are live status regions', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const overlays = [...html.matchAll(/<div class="[^"]*overlay[^"]*" id="(\w+)"([^>]*)>/g)];
  assert.ok(overlays.length >= 20);
  for (const [, id, attrs] of overlays) {
    assert.match(attrs, /role="dialog"/, id);
    assert.match(attrs, /aria-modal="true"/, id);
    assert.match(attrs, /aria-label="[^"]+"/, id);
  }
  assert.match(html, /id="storyFlash" role="status" aria-live="polite"/);
  assert.match(html, /id="birthdayToast" role="status" aria-live="polite"/);
});

test('the home screen behind an open panel is inert, and becomes interactive again when it closes', async () => {
  const h = harness({ deterministic: true }); growing(h);
  h.api.openExclusiveMenu('dex'); h.api.render(); await flush();
  assert.equal(h.get('screenNormal').inert, true);
  h.api.closeAllMenuOverlays(); h.api.render(); await flush();
  assert.equal(h.get('screenNormal').inert, false);
});

test('minigame screen shakes go through the reduced-motion guard (the random sequence is unchanged)', () => {
  const src = fs.readFileSync(path.join(root, 'games.js'), 'utf8');
  assert.equal((src.match(/ctx\.translate\(\(Math\.random\(\)[^;]*\*\s*shake/g) || []).length, 0, 'no raw random shake translate');
  assert.ok((src.match(/shakeTranslate\(ctx, \(Math\.random\(\)/g) || []).length >= 10);
  assert.match(src, /function shakeTranslate\(ctx, dx, dy\) \{ if \(!reducedMotion\(\)\) ctx\.translate\(dx, dy\); \}/);
});
