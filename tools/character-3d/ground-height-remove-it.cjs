const fs = require('node:fs');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const file = 'character-3d/runtime.mjs';
const original = fs.readFileSync(file);
const run = () => cp.spawnSync(process.execPath, ['--test', '--test-name-pattern=groundY:', 'tests/character-3d-test.cjs'], { encoding: 'utf8' });
const cases = [
  ['ignore terrain height', 'h.position.set(actor.x, groundY, -actor.z)', 'h.position.set(actor.x, 0, -actor.z)'],
  ['allow nonfinite height', 'Number.isFinite(info.groundY) ? info.groundY : 0', 'info.groundY'],
  ['scale world height', 'h.position.set(actor.x, groundY, -actor.z)', 'h.position.set(actor.x, groundY * inst.scale, -actor.z)'],
];
let result = run();
assert.equal(result.status, 0, result.stdout + result.stderr);
for (const [name, from, to] of cases) {
  try {
    assert.equal(original.toString().split(from).length, 2, 'unique mutation anchor');
    fs.writeFileSync(file, original.toString().replace(from, to));
    result = run();
    assert.equal(result.status, 1, name + ': expected assertion failure\n' + result.stdout + result.stderr);
    assert.match(result.stdout + result.stderr, /AssertionError/);
    console.log(name + ': RED');
  } finally {
    fs.writeFileSync(file, original);
    assert.ok(fs.readFileSync(file).equals(original), 'exact source restoration');
  }
}
result = run();
assert.equal(result.status, 0, result.stdout + result.stderr);
console.log('3/3 ground-height mutations detected; restored suite GREEN');
console.log('restored sha256 ' + crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
