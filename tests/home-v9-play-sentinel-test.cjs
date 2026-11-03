const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const seed = require('./helpers/home-v9-play-sentinel.cjs');
const origin = 'http://127.0.0.1:43210';
const key = 'naotocchi-home-v9-play-v1';
function run(context) {
  return vm.runInNewContext(`(${seed.toString()})(${JSON.stringify(origin)})`, context);
}
test('opaque and unrelated documents never access storage', () => {
  for (const current of ['null', 'https://example.test', 'http://127.0.0.1:43211']) {
    const context = {location: {origin: current}};
    context.localStorage = {getItem() {throw new Error('storage forbidden');}};
    assert.doesNotThrow(() => run(context), current);
  }
});
test('test origin seeds once and preserves existing play bytes', () => {
  const values = new Map();
  const context = {location: {origin}, localStorage: {
    getItem: k => values.has(k) ? values.get(k) : null,
    setItem: (k, value) => values.set(k, value)
  }};
  run(context);
  assert.equal(values.get(key), 'existing-play-save-sentinel');
  values.set(key, 'saved-game-bytes');
  run(context);
  assert.equal(values.get(key), 'saved-game-bytes');
  assert.deepEqual([...values.keys()], [key]);
});
test('storage failures on the actual test origin remain visible', () => {
  const context = {location: {origin}};
  context.localStorage = {getItem() {throw new Error('real storage failure');}};
  assert.throws(() => run(context), /real storage failure/);
});
