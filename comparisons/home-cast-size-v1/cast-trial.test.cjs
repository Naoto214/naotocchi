const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {replaceOnce} = require('./rewrite.cjs');

function openTrial(query = '') {
  const handlers = {};
  const posted = [];
  const pauses = [];
  const dayparts = [];
  const attributes = new Set();
  let clock = 0, timer;
  function tick(milliseconds) {
    clock += milliseconds;
    const due = timer;
    timer = undefined;
    due?.();
  }
  const window = {
    parent: {postMessage(message) { posted.push(message); }},
    HomeBeauty: {
      settings: {time: 'day'},
      setCastTime(time) { dayparts.push(time); },
      setCastClockPaused(value) { pauses.push(value); }
    },
    setTimeout(listener) { timer = listener; },
    addEventListener(type, listener) { handlers[type] = listener; }
  };
  const document = {
    head: {appendChild() {}},
    createElement() { return {}; },
    documentElement: {toggleAttribute(name, value) { value ? attributes.add(name) : attributes.delete(name); }}
  };
  const location = {search: query, origin: 'https://trial.example'};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'cast-trial.js'), 'utf8'),
    {window, document, location, URLSearchParams, performance: {now: () => clock}});
  return {api: window.HomeCastTrial, window, posted, pauses, dayparts, handlers, attributes, location, tick};
}

test('the role factors multiply each native body once and return exactly to current', () => {
  const {api} = openTrial('?castPreset=B');
  for (const [preset, expected] of Object.entries({current: [1,1,1], A: [1.2,1.1,1.05], B: [1.25,1.15,1.15]})) {
    api.apply({preset});
    assert.deepEqual(['pet', 'partner', 'companion'].map(k => api.scale(k)), expected);
  }
  assert.equal(api.apply({hero: 144, companions: 85}).preset, 'custom');
  assert.equal(api.scale('pet'), 1.44);
  assert.equal(api.scale('companion'), .85);
  assert.equal(api.apply({hero: NaN}).hero, 144);
  assert.equal(api.apply({hero: 225}).hero, 150);
  assert.equal(api.apply({preset: 'current'}).hero, 100);
});

test('presets reuse the attached controller, preserve pause and leave the environmental clock alone', () => {
  const {api, pauses, dayparts, attributes} = openTrial('?paused=1');
  const positions = [{key: 'pet:dog', x: 19, y: 11}];
  let paints = 0, clears = 0;
  const controller = {inspect: () => positions, repaint() {paints++;}, clearGesture() {clears++;}};
  api.attach(controller);
  for (const preset of ['A', 'B', 'current']) {
    api.apply({preset, paused: true});
    assert.strictEqual(api.inspect(), positions);
    assert.ok(attributes.has('data-cast-frozen'));
  }
  assert.equal(paints, 3);
  assert.deepEqual(pauses, [true]);
  assert.deepEqual(dayparts, []);
  api.apply({paused: false, time: 'night'});
  assert.deepEqual(pauses, [true, false]);
  assert.deepEqual(dayparts, ['night']);
  assert.equal(clears, 1);
  api.detach(controller);
  assert.equal(api.inspect().length, 0);
});

test('only the same-origin parent can request a trial change by message', () => {
  const {api, window, handlers, location, posted} = openTrial();
  const data = {type: 'home-cast-settings', settings: {preset: 'A'}};
  handlers.message({origin: 'https://other.example', source: window.parent, data});
  handlers.message({origin: location.origin, source: {}, data});
  assert.equal(api.settings.preset, 'current');
  handlers.message({origin: location.origin, source: window.parent, data});
  assert.equal(api.settings.preset, 'A');
  assert.equal(posted.at(-1).type, 'home-cast-state');

});

test('fail closed if an upstream code anchor disappears or gains a duplicate', () => {
  assert.equal(replaceOnce('foo(1)', '1', '2'), 'foo(2)');
  assert.throws(() => replaceOnce('same same', 'same', 'different'));
  assert.throws(() => replaceOnce('removed', 'old', 'new'));
});

test('readiness waits for the same current fitted terrain across native paint samples', () => {
  const {api, handlers, posted, tick} = openTrial('?paused=1');
  let proof = null;
  api.attach({presentation: () => proof});
  handlers.load();
  tick(4000);
  assert.equal(api.ready, false);
  proof = {key:'forest/3', revision:3, metricRevision:3, frame:15};
  tick(200);
  proof = {key:'forest/6', revision:6, metricRevision:3, frame:45};
  tick(200);
  proof.frame=60;
  tick(200);
  assert.equal(api.ready, false);
  proof.metricRevision=6;
  tick(200);
  assert.equal(api.ready, true);
  assert.equal(posted.at(-1).type, 'home-cast-ready');
  tick(5000);
  assert.equal(posted.filter(m=>m.type==='home-cast-ready').length, 1);
});

test('an already painted, unchanged throttled projection becomes ready without additional frames', () => {
  const {api, handlers, posted, tick} = openTrial();
  let proof = {key:'forest/6', revision:6, frame:1};
  api.attach({presentation: () => proof});
  handlers.load();
  tick(3000);
  assert.equal(api.ready, false);
  proof=null; // Hidden or a new native fit is still pending.
  tick(100);
  proof={key:'forest/7', revision:7, frame:2};
  tick(100);
  tick(3499);
  assert.equal(api.ready, false);
  tick(1);
  assert.equal(api.ready, true);
  assert.equal(posted.at(-1).type, 'home-cast-ready');
});
