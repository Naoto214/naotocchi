const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {approvedRoles} = require('../home-cast-size-v2/build.cjs');
const {limitBridge} = require('./build.cjs');

function trial(search) {
  const original = fs.readFileSync(path.join(__dirname, '../home-cast-size-v1/cast-trial.js'), 'utf8');
  const document = {createElement: () => ({}), head: {appendChild() {}}, documentElement: {toggleAttribute() {}}};
  const window = {parent: {postMessage() {}}, addEventListener() {},
    HomeBeauty: {settings: {time: 'day'}, setCastClockPaused() {}, setCastTime() {}}};
  vm.runInNewContext(limitBridge(approvedRoles(original)), {window, document, URLSearchParams, location: {search, origin: 'https://example.test'}});
  return window.HomeCastTrial;
}

test('all five gains preserve the approved ratio on each call, including fractional companion sizes', () => {
  const api = trial('?extra=5&hero=150&companions=90');
  assert.equal(api.settings.companions, 110.25);
  for (const gain of [0, 5, 10, 15, 20, 20, 5, 0]) {
    api.apply({extra: gain, hero: 80, partner: 95, companions: 150});
    assert.equal(api.settings.extra, gain);
    assert.deepEqual([api.scale('pet'), api.scale('partner'), api.scale('companion')],
      [120, 120, 105].map(base => base * (100 + gain) / 10000));
    api.apply({paused: true, time: 'night'});
    assert.equal(api.settings.extra, gain);
  }
});

test('invalid gain cannot overscale on direct entry or replace an active comparison', () => {
  assert.equal(trial('?extra=1000').settings.extra, 0);
  const api = trial('?extra=20');
  for (const extra of [-5, 1, 200, NaN, '', null]) assert.equal(api.apply({extra}).extra, 20);
});
