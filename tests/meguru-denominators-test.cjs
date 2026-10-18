const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');
const { DENOMINATORS, countWorlds } = require('./helpers/meguru-denominators.cjs');

// RH-6: 分母の 置き場所(tests/helpers/meguru-denominators.cjs)の 値が、いまの 世界から 数えなおした 値と 一致する
test('the shared meguru denominators match a fresh count of WORLDS and the world map', () => {
  const M = harness().api.meguruMod;
  assert.deepEqual(countWorlds(M), { ...DENOMINATORS });
});
