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

test('the native bridge takes roster and width from the game and repaints fractional changes', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const {approvedRoles} = require('../home-cast-size-v2/build.cjs');
  const {limitBridge} = require('../home-cast-size-v3/build.cjs');
  const {populationBridge} = require('./build.cjs');
  const v1 = fs.readFileSync(path.join(__dirname, '../home-cast-size-v1/cast-trial.js'), 'utf8');
  const listeners = new Map();
  const state = [];
  const window = {
    innerWidth: 321,
    HomePopulationPolicy: require('./policy.js'),
    HomeBeauty: {settings: {count: 19, time: 'day'}, setCastClockPaused() {}, setCastTime() {}},
    parent: {postMessage(message) { state.push(message); }},
    addEventListener(name, fn) { listeners.set(name, fn); }
  };
  const document = {createElement: () => ({}), head: {appendChild() {}}, documentElement: {toggleAttribute() {}}};
  vm.runInNewContext(populationBridge(limitBridge(approvedRoles(v1))), {
    document, window, URLSearchParams, location: {origin:'https://example.test', search:'?variant=C&curve=ramp&extra=100&hero=1000'}
  });
  let repaints = 0;
  const trial = window.HomeCastTrial;
  trial.attach({repaint() { repaints++; }, clearGesture() {}});
  const update = () => trial.apply({extra:100, count:28, width:430, hero:150, companions:150});
  assert.equal(update().extra, evaluate({policy:'C',count:19,width:321}).extra);
  assert.equal(repaints, 0);
  window.innerWidth = 320;
  listeners.get('resize')();
  assert.equal(trial.settings.extra, 0);
  window.innerWidth = 375;
  listeners.get('resize')();
  assert.equal(trial.settings.extra, 2);
  assert.equal(trial.settings.count, 19);
  assert.equal(repaints, 2);
  const settings = trial.apply({policy:'A', curve:'step', time:'night', paused:true});
  assert.equal(settings.hero, 132);
  assert.equal(settings.companions, 115.5);
  assert.equal(state.at(-1).settings, settings);
  assert.equal(update().extra, 10);
  assert.equal(trial.scale('pet'), 1.32);
});
