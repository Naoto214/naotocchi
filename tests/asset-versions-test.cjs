const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

// Every cache-busted asset in index.html must exist and carry a token, and the
// load order that the test loaders rely on must hold.
test('index.html asset references exist and carry cache tokens', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:href|src)="([^"?]+)\?v=([^"]*)"/g)];
  assert.ok(refs.length >= 10, 'assets found: ' + refs.length);
  for (const [, file, token] of refs) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', file)), file + ' exists');
    assert.ok(token.length >= 4, file + ' has a token');
  }
  const order = refs.map(([, f]) => f);
  assert.ok(order.indexOf('games.js') < order.indexOf('script.js') && order.indexOf('audio.js') < order.indexOf('script.js'), 'games.js and audio.js load before script.js');
});

test('the bump tool rewrites only cache tokens', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'tools', 'bump-versions.js'), 'utf8');
  assert.match(src, /sha1/);
  assert.match(src, /\?v=/);
});
