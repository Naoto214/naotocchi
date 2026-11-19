const test = require('node:test');
const assert = require('node:assert/strict');
const {evaluate, normalizeCount} = require('./policy.js');

test('all real household sizes are selectable; invalid counts use the full fixture', () => {
  for (let n = 1; n <= 28; n++) assert.equal(normalizeCount(String(n)), n);
  for (const value of [0, -1, 29, 12.5, true, '', null, '2px', Infinity]) {
    assert.equal(normalizeCount(value), 28);
  }
});

test('policy, population and viewport limits preserve role ratios exactly once', () => {
  for (const [policy, ceiling] of Object.entries({current:0, A:10, B:15, C:20})) {
    for (const curve of ['linear','step']) {
      for (let count = 1; count <= 28; count++) {
        for (const width of [280,320,320.25,330,347.5,360,374,374.75,375,390,430,1280]) {
          const t = Math.max(0, Math.min(1, (width - 320) / 55));
          const widthFactor = t*t*(3-2*t);
          const countFactor = count <= 18 ? 0 : curve === 'step' ? 1 : (count-18)/10;
          const extra = ceiling * countFactor * widthFactor;
          const result = evaluate({policy, curve, width, count});
          assert.equal(result.extra, extra);
          assert.equal(result.hero, 120 * (100 + extra) / 100);
          assert.equal(result.partner, result.hero);
          assert.equal(result.companions, 105 * (100 + extra) / 100);
        }
      }
    }
  }
});

test('the browser entry uses B and linear by default and understands the shell aliases', () => {
  assert.deepEqual(evaluate({count:19,width:375}), evaluate({policy:'B',curve:'linear',count:19,width:375}));
  assert.deepEqual(evaluate({variant:'C',curve:'ramp',count:19,width:375}), evaluate({policy:'C',curve:'linear',count:19,width:375}));
  assert.equal(evaluate({policy:'__proto__',curve:'x',count:19,width:375}).extra, 1.5);
});
