const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

test('consumables are priced, buyable once per effect, and set the boost they promise', () => {
  const h = harness(), state = h.api.state();
  assert.ok(h.api.CONSUMABLE_ITEMS.length >= 10);
  const total = h.api.CONSUMABLE_ITEMS.reduce((a, it) => a + it.price, 0) + h.api.SHOP_ITEMS.reduce((a, it) => a + it.price, 0);
  assert.ok(total >= 3500, 'enough to spend on: ' + total);
  state.lifetime.money = 1000;
  h.api.useConsumableItem('c_coin2');
  assert.equal(state.oneTimeBoosts.doubleCoins, true);
  assert.equal(state.lifetime.money, 920);
  h.api.useConsumableItem('c_coin2');
  assert.equal(state.lifetime.money, 920, 'an active effect cannot be bought twice');
  h.api.useConsumableItem('c_mgbig');
  assert.equal(state.oneTimeBoosts.minigameBoost, 'big');
  h.api.useConsumableItem('c_mgsmall');
  assert.equal(state.oneTimeBoosts.minigameBoost, 'big', 'only one minigame charm at a time');
  assert.ok(h.api.activeBoostSummary().length >= 2);
  state.lifetime.money = 5;
  h.api.useConsumableItem('c_sickshield');
  assert.equal(state.oneTimeBoosts.sicknessShieldCount, 0, 'no money, no charm');
});

test('a lucky coin doubles the coins of the next great minigame and is consumed', () => {
  const h = harness(), state = h.api.state();
  state.stage = 'growing'; state.lifetime.money = 100;
  state.oneTimeBoosts.doubleCoins = true;
  const game = {id: 'coin-probe', start(container) { container.innerHTML = '<div></div>'; }};
  h.api.startMinigame(game);
  h.api.finishMinigame(95);
  const gained = state.lifetime.money - 100;
  assert.ok(gained >= 10 && gained <= 40, 'doubled 5-11 coins (times environment bonus): ' + gained);
  assert.equal(state.oneTimeBoosts.doubleCoins, false);
});

test('daily streak rewards grow and pay milestone bonuses', () => {
  const h = harness();
  assert.equal(h.api.dailyStreakReward(1).coins, 10);
  assert.equal(h.api.dailyStreakReward(2).coins, 15);
  assert.equal(h.api.dailyStreakReward(3).coins, 20 + 30);
  assert.equal(h.api.dailyStreakReward(7).coins, 40 + 100);
  assert.equal(h.api.dailyStreakReward(11).coins, 60);
  assert.equal(h.api.dailyStreakReward(40).coins, 60);
  assert.match(h.api.dailyStreakReward(30).milestone, /30/);
});
