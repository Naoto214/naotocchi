const assert = require('node:assert/strict');
const {test} = require('node:test');
const {harness} = require('./helpers/runtime-harness.cjs');

// Phase 2 PR 2-3 (docs/audit/minigame-phase2-plan-2026-10-22/variant-groups.md 2-4 の4).
// 3連続回避は カテゴリ名の一致だけを見ていたので、同じ生成関数から作られた
// road / perspective3d と realFishing / fishing が並んでも止まらなかった。
const byId = (h, id) => h.api.games.find((g) => g.id === id);

function prime(h) {
  const s = h.api.state();
  for (const g of h.api.games) s.lifetime.minigamePlayCounts[g.id] = 1;
  h.api.pickRandomMinigame(); // 最初の補充を済ませ、地域・季節の切り替え判定を落ち着かせる
}

test('road-themed → p3-space → p3-drive is avoided when another family is nearby', () => {
  const h = harness(); prime(h);
  // キューは末尾から出る: road-themed, p3-space の順に出たあと、次の候補が p3-drive
  h.api.setQueueIds(['stack-themed', 'p3-drive', 'p3-space', 'road-themed']);
  assert.equal(h.api.pickRandomMinigame().id, 'road-themed');
  assert.equal(h.api.pickRandomMinigame().id, 'p3-space');
  assert.equal(h.api.pickRandomMinigame().id, 'stack-themed', '3本目に同じ系統を出さない');
  assert.equal(h.api.pickRandomMinigame().id, 'p3-drive', '入れ替えた券は消えずに残る');
});

test('the swap only looks a few tickets ahead and never forces it', () => {
  const h = harness(); prime(h);
  h.api.setQueueIds(['p3-drive', 'p3-space', 'road-themed']);
  for (const id of ['road-themed', 'p3-space', 'p3-drive']) assert.equal(h.api.pickRandomMinigame().id, id);
});

test('fishing variants share the realFishing family; categories and genres are unchanged', () => {
  const h = harness();
  const fish = [...h.api.games.filter((g) => /fishing/.test(g.id))];
  assert.ok(fish.some((g) => g.id === 'real-fishing') && fish.some((g) => g.id === 'fishing-sea'));
  for (const g of fish) assert.equal(h.api.minigameFamilyOf(g), 'realFishing', g.id);
  assert.equal(h.api.minigameCategoryOf(byId(h, 'real-fishing')), 'realFishing');
  assert.equal(h.api.minigameCategoryOf(byId(h, 'fishing-sea')), 'fishing');
  assert.equal(h.api.genreOf(byId(h, 'p3-space')), 'drive3d');
  for (const id of ['road-themed', 'p3-space', 'p3-drive', 'road-city', 'road-jungle', 'road-desert']) {
    assert.equal(h.api.minigameFamilyOf(byId(h, id)), 'road', id);
  }
  // それ以外は カテゴリが そのまま 系統
  for (const g of h.api.games) {
    const c = h.api.minigameCategoryOf(g);
    if (c !== 'perspective3d' && c !== 'fishing') assert.equal(h.api.minigameFamilyOf(g), c, g.id);
  }
});

test('a game chosen from the list also counts toward the family streak', () => {
  const h = harness(); prime(h);
  const s = h.api.state();
  Object.assign(s, {stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80});
  h.api.setQueueIds(['stack-themed', 'p3-drive', 'road-themed']);
  assert.equal(h.api.pickRandomMinigame().id, 'road-themed');
  assert.equal(h.api.tryStartPlay(byId(h, 'p3-space')), true);
  h.api.retireMinigame(); h.advance(5000);
  assert.equal(h.api.pickRandomMinigame().id, 'stack-themed');
});
