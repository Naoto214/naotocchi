const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');

test('the owner trial has no entry in the approved game package', () => {
  const manifest = require('../../tools/pages/allowlist.json');
  assert.ok(manifest.files.includes('index.html'));
  assert.deepEqual(manifest.files.filter(name => name.startsWith('comparisons/home-beauty-v4/')), []);
  const entry = readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
  assert.doesNotMatch(entry, /home-beauty-v4|beauty\/paint\.mjs|forest-e\.mjs|sea-e\.mjs/);
});

test('the reference renderer and baseline fixture match Draft #563 at 5363cd8f', () => {
  const reference = {
    "full-motion.mjs": "c93fef1527c6629e728f6b7ab5b9f634531d3201ee1addcb0b864107b38e6039",
    "other-regions.mjs": "437b5b930a1dc7cf0d79c6716f136fbe79dde0b313de44e91db3cb260e0d9af8",
    "nature.mjs": "7d1cdd479413b6ecd98d5bde074af49e3dfb9247f9b1eca7d8b377058472456e",
    "fixture.json": "f8410097fa67b95d2fc5d7afaae38dca75d8dfe2c8f4eabfd6ea5f6223a61e39"
};
  for (const [file, expected] of Object.entries(reference)) {
    const actual = createHash('sha256').update(readFileSync(path.join(__dirname, file))).digest('hex');
    assert.equal(actual, expected, file);
  }
});
