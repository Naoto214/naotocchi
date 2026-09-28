const assert = require('node:assert/strict');
const { test } = require('node:test');
const { literal, codeOnly, loadMaster } = require('./helpers/source.cjs');
const { guardedRoute } = require('./helpers/browser-route.cjs');

// RH-6: テスト用の 共通の 部品 そのものの テスト
test('source helpers: literal() evaluates objects and arrays, skipping brackets inside strings and comments', () => {
  const emoji = literal('script.js', 'const MASTER_SPECIES_EMOJI = ');
  assert.equal(Object.keys(emoji).length, 31);
  assert.ok(Array.isArray(literal('meguru.js', 'const NIGHT_LINES = ')));
  assert.throws(() => literal('script.js', 'const NO_SUCH_TABLE = '), /not found/);
  assert.equal(codeOnly('a\n  // b\nc'), 'a\nc');
  assert.equal(loadMaster().playerSpecies.secret[0].id, 'ren');
});

test('guardedRoute records a failed route fetch (label, url, code, timing) and aborts the request instead of throwing', async () => {
  let handler;
  const context = { route: async (pattern, fn) => { handler = fn; } };
  const sink = [];
  await guardedRoute(context, '**/*.css?*', 'case-a', sink, async () => { const e = new Error('read ECONNRESET'); e.code = 'ECONNRESET'; throw e; });
  let aborted = null;
  await handler({ request: () => ({ url: () => 'http://127.0.0.1:5191/style.css?v=1' }), abort: async (why) => { aborted = why; } });
  assert.equal(aborted, 'failed');
  assert.equal(sink.length, 1);
  assert.equal(sink[0].label, 'case-a');
  assert.equal(sink[0].code, 'ECONNRESET');
  assert.match(sink[0].url, /style\.css/);
  assert.ok(sink[0].msSinceCaseStart >= 0);
  // うまく いった ときは 何も 記録しない
  const ok = [];
  await guardedRoute(context, '**', 'case-b', ok, async () => {});
  await handler({ request: () => ({ url: () => 'x' }), abort: async () => { throw new Error('must not abort'); } });
  assert.deepEqual(ok, []);
});
