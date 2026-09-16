const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

test('minigame ranks follow the S90/A75/B55/C35 thresholds and records keep best and last', () => {
  const h = harness();
  assert.equal(h.api.minigameRankOf(90), 'S'); assert.equal(h.api.minigameRankOf(89), 'A');
  assert.equal(h.api.minigameRankOf(75), 'A'); assert.equal(h.api.minigameRankOf(55), 'B');
  assert.equal(h.api.minigameRankOf(35), 'C'); assert.equal(h.api.minigameRankOf(34), 'D');
  const game = {id: 'score-probe'};
  const first = h.api.recordMinigameResult(game, 62.4);
  assert.deepEqual([first.score, first.best, first.prevBest, first.isNewBest, first.rank], [62, 62, null, true, 'B']);
  const second = h.api.recordMinigameResult(game, 40);
  assert.deepEqual([second.best, second.prevBest, second.isNewBest], [62, 62, false]);
  assert.equal(JSON.stringify(h.api.state().lifetime.minigameRecords['score-probe']), JSON.stringify({best: 62, last: 40}));
  const third = h.api.recordMinigameResult(game, 140);
  assert.equal(third.score, 100, 'scores are clamped to 100');
});

test('shop items are bought once, equipped, and toggled off', () => {
  const h = harness(), state = h.api.state();
  state.lifetime.money = 999;
  h.api.buyOrEquipShopItem('poop1');
  assert.equal(state.lifetime.ownedShopItems.includes('poop1'), false, 'not enough money');
  state.lifetime.money = 1040;
  h.api.buyOrEquipShopItem('poop1');
  assert.equal(state.lifetime.money, 40);
  assert.equal(state.lifetime.equippedItemId, 'poop1');
  h.api.buyOrEquipShopItem('poop1');
  assert.equal(state.lifetime.equippedItemId, null, 'tapping the equipped item unequips it');
  h.api.buyOrEquipShopItem('poop1');
  assert.equal(state.lifetime.money, 40, 'owned items are not paid for again');
});

test('achievement unlocks record their time and do not repeat', () => {
  const h = harness(), state = h.api.state();
  state.lifetime.minigamesPlayed = 50;
  h.api.checkAchievements();
  assert.ok(state.achievementsUnlocked.includes('minigame-50'));
  const at = state.lifetime.achievementUnlockedAt['minigame-50'];
  assert.ok(at > 0);
  h.api.checkAchievements();
  assert.equal(state.achievementsUnlocked.filter((id) => id === 'minigame-50').length, 1);
  assert.equal(state.lifetime.achievementUnlockedAt['minigame-50'], at);
});

test('game pass must be purchased separately from sunglasses and occupies one equipment slot',()=>{
  const h=harness(),state=h.api.state();
  state.lifetime.ownedShopItems=['glasses','star'];
  state.lifetime.equippedItemId='star';state.lifetime.money=7999;
  h.api.buyOrEquipShopItem('gamepass1');
  assert.equal(state.lifetime.ownedShopItems.includes('gamepass1'),false);
  assert.equal(state.lifetime.equippedItemId,'star');
  assert.equal(state.lifetime.money,7999);
  state.lifetime.money=8000;h.api.buyOrEquipShopItem('gamepass1');
  assert.equal(state.lifetime.money,0);
  assert.equal(state.lifetime.ownedShopItems.includes('gamepass1'),true);
  assert.equal(state.lifetime.equippedItemId,'gamepass1');
  h.api.buyOrEquipShopItem('star');
  assert.equal(state.lifetime.equippedItemId,'star');
  assert.equal(state.lifetime.money,0,'switching owned equipment has no extra cost');
});
