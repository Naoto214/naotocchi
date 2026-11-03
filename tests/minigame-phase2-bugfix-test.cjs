const assert = require('node:assert/strict');
const {test} = require('node:test');
const {harness} = require('./helpers/runtime-harness.cjs');

// Phase 2 第3弾 PR 3-1（docs/audit/minigame-phase2b-design-2026-10-25/README.md §9 の 1）。
// なにも しなくても sugoroku は 72点（全員 0マスの 同着で 1い）、mini-golf は 55〜73点
// （遊んでいない ホールの パーまで ひいていた）に なっていた。
function idle(id, seed, ms) {
  const h = harness({seed});
  const game = h.api.games.find((g) => g.id === id);
  assert.ok(game, id);
  const scores = [];
  h.api.startMinigame({id: game.id, start(c, done) { game.start(c, (s) => { scores.push(s); done(s); }); }});
  h.advance(ms);
  return scores;
}

test('sugoroku: an all-zero tie at time-up no longer ranks the player first', () => {
  for (const seed of [1, 2, 3]) {
    const [score] = idle('sugoroku-race', seed, 200000);
    assert.ok(score != null, 'the race ends at time-up');
    assert.ok(score < 46, `seed ${seed}: idle tie scores as last place, not 1st (${score})`);
  }
});

test('mini-golf: holes that were never finished count as the stroke limit', () => {
  for (const seed of [1, 2, 3]) {
    const [score] = idle('mini-golf-physics', seed, 120000);
    assert.ok(score != null, 'the round ends at time-up');
    assert.ok(score <= 25, `seed ${seed}: doing nothing must not reach C (${score})`);
  }
});
