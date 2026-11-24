const test = require('node:test');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {readFileSync} = require('node:fs');
const hash = value => createHash('sha256').update(value).digest('hex');

// Frozen before the private BEST integration. A second runtime addition must
// receive its own review even if every individual source digest is current.
const priorFiles = 'd3bfa21b6eeb6910d11f047eb2a6c37b71aa10809a28183afbf8ad18e7edbc82';
const archivedLeaves = '059657479bfee0d2732a67f2b6dc5874df65a718a2468dea5bb3fe5138be0b15';

test('the seasonal renderer adds the reviewed archived source to the pinned package', () => {
  const file = 'home-autumn-leaves.mjs';
  const manifest = JSON.parse(readFileSync('tools/pages/allowlist.json'));
  assert.equal(manifest.files.filter(entry => entry === file).length, 1);
  const existing = manifest.files.filter(entry => entry !== file).sort();
  assert.equal(hash(existing.join('\n') + '\n'), priorFiles);
  assert.equal(hash(readFileSync(file)), archivedLeaves);
  assert.equal(manifest.reviewed_runtime_sources[file], archivedLeaves);
  assert.ok(readFileSync('home-production-world.mjs', 'utf8').includes(file + '?v=' + archivedLeaves.slice(0,12)));
});

for (const file of ['home-recovered-navigation.mjs', 'tests/home-production-test.cjs']) {
  test('historical byte restoration rejects independent changes in ' + file, () => {
    const notation = require('../../helpers/approved-notation-v6.cjs');
    const pins = require('../../helpers/home-production-pins.json');
    const bytes = readFileSync(file);
    const blob = buffer => createHash('sha1').update('blob ' + buffer.length + '\0').update(buffer).digest('hex');
    const expected = notation.files[file]?.before || pins[file].before;
    assert.equal(blob(notation.restoreBytes(file, bytes)), expected);
    const mutated = Buffer.from(bytes);
    mutated[Math.floor(bytes.length / 2)] ^= 1;
    assert.notEqual(blob(notation.restoreBytes(file, mutated)), expected);
    const appended = Buffer.concat([bytes, Buffer.from('\n// independent change\n')]);
    assert.notEqual(blob(notation.restoreBytes(file, appended)), expected);
  });
}
