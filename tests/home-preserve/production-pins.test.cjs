const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const scope = require('../helpers/approved-notation-v6.cjs');

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(readFileSync('tools/pages/allowlist.json'));
const imports = {
  'index.html': ['home-production-model.js', 'home-production-diorama.js'],
  'home-production-diorama.js': ['home-production-world.mjs'],
  'home-production-world.mjs': ['home-visible-ground-navigation.mjs', 'home-recovered-navigation.mjs'],
  'home-recovered-navigation.mjs': ['home-art-navigation.mjs'],
  'home-art-navigation.mjs': ['home-route-navigation.mjs'],
  'home-visible-ground-navigation.mjs': ['home-art-navigation.mjs', 'home-route-navigation.mjs'],
};

test('production movement assets have exact package digests and cache tokens', () => {
  for (const [parent, children] of Object.entries(imports)) {
    const source = readFileSync(parent, 'utf8');
    for (const file of children) {
      const hash = digest(readFileSync(file));
      assert.equal(manifest.reviewed_runtime_sources[file], hash, file);
      assert.ok(source.includes(file + '?v=' + hash.slice(0, 12)), parent + ' loads ' + file);
    }
  }
});

for (const file of ['index.html', 'tools/pages/allowlist.json']) {
  test(file + ' restores the frozen notation baseline and retains unrelated changes', () => {
    const bytes = readFileSync(file);
    const expected = scope.files[file].before;
    const blob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
    assert.equal(blob(scope.restoreBytes(file, bytes)), expected);
    const mutated = Buffer.from(bytes);
    mutated[10] ^= 1;
    assert.notEqual(blob(scope.restoreBytes(file, mutated)), expected);
    const extra = Buffer.from([0xff]);
    assert.deepEqual(scope.restoreBytes(file, Buffer.concat([bytes, extra])).subarray(-1), extra);
  });
}
