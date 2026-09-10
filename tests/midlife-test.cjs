const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

test('story pools exist for everyday care, travel, courtship and waking', () => {
  const h = harness();
  for (const ctx of ['feed', 'pet', 'travel', 'court', 'wake', 'evolve', 'poop-clean']) {
    const pool = h.api.STORY_EVENT_POOLS[ctx];
    assert.ok(Array.isArray(pool) && pool.length >= 3, ctx + ' needs at least 3 lines');
    assert.ok(pool.every((e) => e.emoji && e.message), ctx + ' entries are well-formed');
  }
});

test('each midlife event fires once at its age and records a life-log line', () => {
  const h = harness(), state = h.api.state();
  state.stage = 'growing';
  const ages = h.api.MIDLIFE_EVENTS.map((e) => e.age);
  assert.ok(ages.every((a) => a > 40 && a < 70), 'events sit between the 40 and 70 stage changes');
  const money = state.lifetime.money, logBefore = state.lifeLog.length;
  assert.equal(h.api.maybeMidlifeEvent(50), true);
  assert.equal(h.api.maybeMidlifeEvent(50), false, 'the same age does not fire twice');
  assert.ok(state.lifetime.money > money, 'the 50th birthday pays coins');
  assert.equal(state.lifeLog.length, logBefore + 1);
  assert.equal(h.api.maybeMidlifeEvent(45), false, 'no event at other ages');
  assert.equal(h.api.maybeMidlifeEvent(66), true);
  assert.equal(state.oneTimeBoosts.travelGuarantee, true, 'age 66 hands over a travel charm');
});

test('a birthday at a midlife age triggers the event through onAgeChanged', () => {
  const h = harness(), state = h.api.state();
  state.stage = 'growing'; state.ageTicks = 44 * 20;
  h.api.onAgeChanged(43);
  assert.ok(state.midlifeSeen.includes(44));
});
