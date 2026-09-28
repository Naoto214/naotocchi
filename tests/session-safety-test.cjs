const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

// RH-9 Session Safety(Roadmap §8.1 の 共通の 芯・§8.2・待ち時間の 上限)。
// かくれた タブは すすまない → もどったら とじて いた ときと 同じ るすの 処理を 1 回だけ、
// 離れていた 時間は 打ち切らずに あらわす、複数タブは あとから ひらいた ほうが 引きつぐ。
const SAVE = 'naotocchi-save-v1';
const MIN = 60 * 1000;
function storageWith(entries = []) {
  const data = new Map(entries);
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
}
function growing(h) {
  Object.assign(h.api.state(), { stage: 'growing', speciesLine: 'dog', ageTicks: 600, hunger: 90, happiness: 90, energy: 60, health: 100, isSleeping: false, isSick: false });
  h.api.saveState();
  return h.api.state();
}
const hide = (h) => { h.document.visibilityState = 'hidden'; h.dispatch(h.document, 'visibilitychange', { bubbles: false }); };
const show = (h) => { h.document.visibilityState = 'visible'; h.dispatch(h.document, 'visibilitychange', { bubbles: false }); };
const lastLog = (s) => Array.from(s.lifeLog || [], (e) => e.text).filter((t) => t.startsWith('るすばん'));

test('a hidden tab does not tick, age, or run encounters / moments / idle talk', () => {
  const h = harness({ deterministic: true }), s = growing(h);
  const before = { ageTicks: s.ageTicks, hunger: s.hunger, envMoments: s.lifetime.envMoments || 0, log: s.lifeLog.length };
  hide(h);
  h.advance(30 * MIN);
  assert.equal(s.ageTicks, before.ageTicks, 'no aging while hidden');
  assert.equal(s.hunger, before.hunger, 'no meter change while hidden');
  assert.equal(s.lifetime.envMoments || 0, before.envMoments, 'no environment moment while hidden');
  assert.equal(h.api.isAnyMenuOverlayOpen(), false, 'no companion invite (or any overlay) while hidden');
  assert.equal(s.lifeLog.length, before.log);
});

test('coming back runs the same gentle absence processing once (existing caps: ≤30 drop, floor 20, no aging)', () => {
  const h = harness({ deterministic: true }), s = growing(h);
  const age = s.ageTicks;
  hide(h);
  h.advance(3 * 60 * MIN);
  show(h);
  assert.equal(s.ageTicks, age, 'absence never ages');
  assert.equal(s.hunger, 60, 'dropped by the existing cap (30)');
  assert.deepEqual(lastLog(s), ['るすばん：3時間']);
  // もう一度 見えても 2 回目は ない
  show(h);
  assert.deepEqual(lastLog(s), ['るすばん：3時間']);
});

test('a short hide (< 2 minutes) changes nothing', () => {
  const h = harness({ deterministic: true }), s = growing(h);
  hide(h); h.advance(MIN); show(h);
  assert.equal(s.hunger, 90);
  assert.deepEqual(lastLog(s), []);
});

test('absence time is recorded without a cap (days and hours), while the game effect keeps its cap', () => {
  const h = harness({ deterministic: true }), s = growing(h);
  hide(h);
  h.advance((7 * 24 + 3) * 60 * MIN);
  show(h);
  assert.deepEqual(lastLog(s), ['るすばん：7日3時間']);
  assert.equal(s.hunger, 60, 'a week is no harsher than the cap');
  assert.equal(s.stage, 'growing');
  const h2 = harness({ deterministic: true }), s2 = growing(h2);
  hide(h2); h2.advance(2 * 24 * 60 * MIN); show(h2);
  assert.deepEqual(lastLog(s2), ['るすばん：2日']);
});

test('closing and reopening still uses savedAt (the closed path is unchanged)', () => {
  const storage = storageWith();
  const a = harness({ deterministic: true, storage }); growing(a);
  const raw = JSON.parse(storage.getItem(SAVE));
  raw.savedAt -= 45 * MIN;
  storage.setItem(SAVE, JSON.stringify(raw));
  const b = harness({ deterministic: true, storage, resume: true });
  assert.deepEqual(lastLog(b.api.state()), ['るすばん：45分']);
});

test('two tabs: the tab opened later takes over; the older tab stops writing and shows the notice', () => {
  const storage = storageWith();
  const a = harness({ deterministic: true, storage }); growing(a);
  a.api.state().lifetime.money = 111; a.api.saveState();
  const b = harness({ deterministic: true, storage, resume: true });
  const fromB = storage.getItem(SAVE);
  assert.equal(JSON.parse(fromB).lifetime.money, 111);
  a.api.state().lifetime.money = 999; a.api.saveState();
  assert.equal(storage.getItem(SAVE), fromB, 'the older tab does not overwrite');
  assert.match(a.api.getMessage(), /べつのタブでひらかれています/);
  a.advance(3000);
  assert.equal(storage.getItem(SAVE), fromB, 'nor on the next tick');
  b.api.state().lifetime.money = 222; b.api.saveState();
  assert.equal(JSON.parse(storage.getItem(SAVE)).lifetime.money, 222, 'the newer tab keeps saving');
  assert.ok(JSON.parse(storage.getItem(SAVE)).lifetime.saveRevision > JSON.parse(fromB).lifetime.saveRevision);
});

test('two tabs: another tab\'s write (storage event) makes this tab read-only immediately, even with a lower revision', () => {
  const storage = storageWith();
  const a = harness({ deterministic: true, storage }); growing(a);
  a.dispatch(a.window, 'storage', { key: SAVE, newValue: '{"lifetime":{"saveRevision":1}}', bubbles: false });
  const before = storage.getItem(SAVE);
  a.api.saveState();
  assert.equal(storage.getItem(SAVE), before);
  assert.match(a.api.getMessage(), /べつのタブでひらかれています/);
  // ほかの キー・消去(newValue null)では 止まらない
  const c = harness({ deterministic: true, storage: storageWith() }); growing(c);
  c.dispatch(c.window, 'storage', { key: 'other', newValue: 'x', bubbles: false });
  c.dispatch(c.window, 'storage', { key: SAVE, newValue: null, bubbles: false });
  c.api.state().lifetime.money = 5; c.api.saveState();
  assert.doesNotMatch(c.api.getMessage(), /べつのタブ/);
});

test('waits written by a clock in the future are clamped to their real length', () => {
  const h = harness({ deterministic: true }), s = growing(h);
  const now = Date.parse('2026-09-16T12:00:00Z');
  s.gamePassReadyAt = now + 365 * 24 * 60 * MIN;
  h.api.render();
  assert.ok(s.gamePassReadyAt <= now + 5000 + 10, `gamePassReadyAt ${s.gamePassReadyAt - now}`);
  s.itemLife.temporaryForm = { line: 'cat', index: 2, expiresAt: now + 365 * 24 * 60 * MIN, originLine: 'dog', originIndex: h.api.currentFormStageIndex() };
  assert.equal(h.api.currentVisualForm().line, 'cat');
  assert.ok(s.itemLife.temporaryForm.expiresAt <= now + 5 * MIN + 10, 'temporary form clamped to 5 minutes');
  // ふつうの 値は そのまま
  s.gamePassReadyAt = now + 2000; h.api.render();
  assert.equal(s.gamePassReadyAt, now + 2000);
});

test('boot marks itself finished for the index.html rescue guard', () => {
  const h = harness({ deterministic: true });
  assert.equal(require('node:vm').runInContext('globalThis.__naotocchiBooted', h.sandbox), true);
});
