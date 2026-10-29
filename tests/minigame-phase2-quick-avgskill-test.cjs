const assert = require('node:assert/strict');
const {test} = require('node:test');
const {harness} = require('./helpers/runtime-harness.cjs');

// Phase 2 第3弾 PR 3-2（T9。docs/audit/minigame-phase2b-design-2026-10-25/README.md §7）。
// avgSkill（minigameScoreSum / minigameCount）は れんくんの こうほ条件（5回以上・平均85）だけに使う。
// クイックの 1本ずつを くりかえすと、ふつうの ゲームを 遊ばなくても 条件に とどいていた。
function growing() {
  const h = harness(); const s = h.api.state();
  Object.assign(s, {stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80});
  h.api.render();
  return {h, s};
}

test('Quick runs no longer feed avgSkill, so they alone cannot open the Ren condition', () => {
  const {h, s} = growing();
  for (let i = 0; i < 6; i++) {
    assert.equal(h.api.startQuickRun(h.api.QUICK_GAMES[i].id), true);
    h.api.finishMinigame(100);
    h.advance(5000);
  }
  assert.equal(s.lifetime.minigamesPlayed, 6, 'Quick still counts as played (achievements, records)');
  assert.equal(s.minigameCount, 0, 'Quick is not counted for avgSkill');
  assert.equal(s.minigameScoreSum, 0);
});

test('existing saved avgSkill values are kept as they are, and normal games still update them', () => {
  const {h, s} = growing();
  Object.assign(s, {minigameScoreSum: 430, minigameCount: 5});
  assert.equal(h.api.startQuickRun(), true);
  h.api.finishMinigame(100); h.advance(5000);
  assert.deepEqual([s.minigameScoreSum, s.minigameCount], [430, 5], 'not recalculated or reset');
  const game = h.api.games.find((g) => g.id === 'stack-themed');
  assert.equal(h.api.tryStartPlay(game), true);
  h.api.finishMinigame(80); h.advance(5000);
  assert.deepEqual([s.minigameScoreSum, s.minigameCount], [510, 6], 'normal games keep updating avgSkill');
});
