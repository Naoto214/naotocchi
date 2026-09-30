const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const { resolve } = require('../emotion-state.js');

const base = Object.freeze({
  playable: true,
  life: 'none',
  health: 'none',
  sick: false,
  hunger: 'none',
  energy: 'none',
  happiness: 'none',
  sleeping: false,
  petAvailable: true,
});

test('static script exposes the pure resolver on window', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../emotion-state.js'), 'utf8'), context);
  assert.deepEqual(Object.keys(context.window.NaotocchiEmotionState), ['resolve']);
});

test('resolve returns every approved emotion profile', () => {
  const cases = [
    ['normal', {}, ['normal', 'none', null, 0, 0, false, false]],
    ['critical life', { life: 'critical' }, ['weak', 'critical', null, 0, 0, false, true]],
    ['warning life', { life: 'warning' }, ['weak', 'mild', 'droop', 9000, 14000, true, false]],
    ['sickness', { sick: true }, ['sick', 'strong', 'shake', 5000, 8000, true, false]],
    ['health', { health: 'strong' }, ['weak', 'strong', 'droop', 8000, 12000, true, false]],
    ['strong energy', { energy: 'strong' }, ['tired', 'strong', 'doze', 12000, 16000, true, false]],
    ['mild energy', { energy: 'mild' }, ['tired', 'mild', 'doze', 8000, 12000, true, false]],
    ['strong hunger', { hunger: 'strong' }, ['hungry', 'strong', 'hungry', 4500, 7500, false, false]],
    ['mild hunger', { hunger: 'mild' }, ['hungry', 'mild', 'hungry', 7000, 11000, true, false]],
    ['strong happiness', { happiness: 'strong' }, ['unhappy', 'strong', 'sulk', 6000, 9000, true, false]],
    ['available affection', { happiness: 'mild' }, ['wantsPlay', 'mild', 'curious', 6000, 10000, true, false]],
    ['unavailable affection', { happiness: 'mild', petAvailable: false }, ['unhappy', 'mild', 'sulk', 8000, 12000, true, false]],
  ];

  for (const [name, overrides, expected] of cases) {
    const result = resolve({ ...base, ...overrides });
    assert.deepEqual(
      [result.state, result.severity, result.motion, result.cueMinMs, result.cueMaxMs, result.gentle, result.suppressPetIdle],
      expected,
      name,
    );
  }
});

test('resolve follows the approved visible priority', () => {
  const cases = [
    [{ hunger: 'strong' }, 'hungry'],
    [{ hunger: 'strong', energy: 'mild' }, 'tired'],
    [{ energy: 'strong', health: 'strong' }, 'weak'],
    [{ health: 'strong', sick: true }, 'sick'],
    [{ life: 'critical', sick: true }, 'weak'],
    [{ happiness: 'mild', petAvailable: true }, 'wantsPlay'],
    [{ happiness: 'mild', petAvailable: false }, 'unhappy'],
  ];
  for (const [overrides, state] of cases) {
    assert.equal(resolve({ ...base, ...overrides }).state, state);
  }
});

test('worsening tiredness never increases cue cadence', () => {
  const mild = resolve({ ...base, energy: 'mild' });
  const strong = resolve({ ...base, energy: 'strong' });
  assert.ok(strong.cueMinMs >= mild.cueMinMs);
  assert.ok(strong.cueMaxMs >= mild.cueMaxMs);
});

test('non-playable and sleeping signals resolve to normal', () => {
  for (const overrides of [
    { playable: false, life: 'critical', sick: true, hunger: 'strong' },
    { sleeping: true, life: 'critical', sick: true, hunger: 'strong' },
  ]) {
    assert.deepEqual(resolve({ ...base, ...overrides }), {
      state: 'normal', severity: 'none', motion: null,
      cueMinMs: 0, cueMaxMs: 0, gentle: false, suppressPetIdle: false,
    });
  }
});

test('resolve does not mutate its input or share returned profile objects', () => {
  const signals = { ...base, hunger: 'strong' };
  const before = structuredClone(signals);
  const first = resolve(signals);
  first.state = 'normal';
  first.cueMinMs = -1;

  assert.deepEqual(signals, before);
  assert.notStrictEqual(resolve(signals), first);
  assert.deepEqual(resolve(signals), {
    state: 'hungry', severity: 'strong', motion: 'hungry',
    cueMinMs: 4500, cueMaxMs: 7500, gentle: false, suppressPetIdle: false,
  });
});
