// Inspect the actual bundled native policy, including direct URL/message inputs.
const path = require('node:path');
const assert = require('node:assert/strict');
const output = process.argv[2];
if (!output) throw Error('Usage: node verify_policy.cjs FINISH_DIST');
const policy = require(path.resolve(output, 'game/finish-policy.js'));
const widths = [300,320,321,332,348,360,374,375,390,430];
for (let count = 1; count <= 28; count++) {
  for (const width of widths) {
    const candidate = policy.evaluate({count, width, policy:'C', curve:'step'});
    const t = Math.min(1, Math.max(0, (width - 320) / 55));
    const expected = 15 * Math.max(0, (count - 18) / 10) * (t*t*(3-2*t));
    assert.equal(candidate.policy, 'B');
    assert.equal(candidate.curve, 'linear');
    assert.equal(candidate.extra, expected);
    assert.equal(candidate.hero, 120 * (100+expected)/100);
    assert.equal(candidate.partner, candidate.hero);
    assert.equal(candidate.companions, 105 * (100+expected)/100);
  }
}
console.log('Verified B and all three role multipliers across ' + widths.length*28 + ' width/household combinations');
