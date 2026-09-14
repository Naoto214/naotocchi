const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

test('consumables are bought into stock and arm one effect at a time', () => {
  const h=harness(),state=h.api.state();state.lifetime.money=1000;
  assert.equal(h.api.buyConsumableItem('c_coin2'),false,'Lucky is a daily gift');
  state.items.c_coin2=2;
  h.api.useConsumableItem('c_coin2');
  assert.equal(state.oneTimeBoosts.doubleCoins,true);assert.equal(state.lifetime.money,1000);
  h.api.useConsumableItem('c_coin2');assert.equal(h.api.itemStock('c_coin2'),1,'one reservation at a time');
  h.api.buyConsumableItem('c_mgbig');assert.equal(state.lifetime.money,880);
  h.api.useConsumableItem('c_mgbig');assert.equal(state.oneTimeBoosts.greatReward,true);
  h.api.buyConsumableItem('c_mgsmall');h.api.useConsumableItem('c_mgsmall');
  assert.equal(state.oneTimeBoosts.greatReward,true);assert.equal(state.oneTimeBoosts.minigameBoost,'small');assert.equal(h.api.itemStock('c_mgsmall'),0);
  h.api.buyConsumableItem('c_mgbig');h.api.useConsumableItem('c_mgbig');
  assert.equal(h.api.itemStock('c_mgbig'),1,'only one great reward reservation');
  assert.ok(h.api.activeBoostSummary().length>=2);
  state.lifetime.money=5;assert.equal(h.api.buyConsumableItem('c_sickshield'),false);
  h.api.useConsumableItem('c_sickshield');assert.equal(state.oneTimeBoosts.sicknessShieldCount,0);
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
