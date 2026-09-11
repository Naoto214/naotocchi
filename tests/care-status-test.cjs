const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const careStatus = require('../care-status.js');

function growing(overrides = {}) {
  return {
    stage: 'growing',
    hunger: 80,
    happiness: 80,
    energy: 80,
    health: 80,
    sodachi: 40,
    growth: 20,
    decline: 10,
    deathMeter: 0,
    lowHealthStreak: 0,
    dying: false,
    isSick: false,
    sicknessType: null,
    isSleeping: false,
    poopCount: 0,
    infinite: false,
    ...overrides,
  };
}

test('static script exposes the pure assessment interface on window', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../care-status.js'), 'utf8'), context);
  assert.deepEqual(
    Object.keys(context.window.NaotocchiCareStatus).sort(),
    ['assess', 'changes', 'snapshot'],
  );
});

test('assess leaves healthy and non-playable life stages quiet without mutating state', () => {
  const healthy = growing();
  const before = structuredClone(healthy);
  assert.equal(careStatus.assess(healthy), null);
  assert.deepEqual(healthy, before);

  for (const stage of ['egg', 'dead', 'farewell']) {
    assert.equal(careStatus.assess(growing({ stage, health: 0, dying: true, deathMeter: 99 })), null, stage);
  }
});

test('assess treats each real mortal life-risk signal as critical', () => {
  const cases = [
    ['health at its limit', { health: 0 }, /けんこう/],
    ['a sustained very low reading', { health: 19, lowHealthStreak: 1 }, /けんこう/],
    ['the dying grace state', { dying: true, health: 70 }, /いのち/],
    ['the visible danger threshold', { deathMeter: 80, health: 70 }, /いのち/],
  ];

  for (const [name, state, title] of cases) {
    const notice = careStatus.assess(growing(state));
    assert.equal(notice.severity, 'critical', name);
    assert.equal(notice.kind, 'life', name);
    assert.equal(notice.icon, 'danger', name);
    assert.match(notice.title, title, name);
    assert.deepEqual(Object.keys(notice).sort(), ['action', 'detail', 'icon', 'kind', 'motion', 'severity', 'title']);
  }
});

test('low life gives recovery advice before the critical threshold and clears after recovery', () => {
  for (const deathMeter of [60, 79.9]) {
    const notice = careStatus.assess(growing({ deathMeter, hunger:55 }));
    assert.equal(notice?.kind, 'life');
    assert.equal(notice.severity, 'warning');
    assert.match(notice.title, /いのち/);
    assert.equal(notice.action, 'feedBtn');
    assert.match(notice.detail, /60以上/);
  }
  assert.equal(careStatus.assess(growing({ deathMeter:59.9 })), null);
  assert.equal(careStatus.assess(growing({ deathMeter:80 })).severity, 'critical');
  assert.equal(careStatus.assess(growing({ deathMeter:70, infinite:true })), null);
  assert.equal(careStatus.assess(growing({ deathMeter:70, isSick:true })).action, 'medicineBtn');
});

test('life and health notices choose one useful action from the actual cause', () => {
  const cases = [
    ['illness can be treated even asleep', { isSick: true, sicknessType: 'ねつ', isSleeping: true }, 'medicineBtn', /くすり.*ねつ/],
    ['sleeping must end before food', { hunger: 40, isSleeping: true }, 'sleepBtn', /おきて.*ごはん/],
    ['hunger can be restored while awake', { hunger: 40 }, 'feedBtn', /ごはん/],
    ['sleeping must end before affection', { happiness: 40, isSleeping: true }, 'sleepBtn', /おきて.*ごきげん/],
    ['safe affection can restore mood', { happiness: 40 }, 'playWithBtn', /じゃれ/],
    ['tired pets need sleep rather than play', { happiness: 40, energy: 20 }, 'sleepBtn', /ねて.*げんき/],
    ['dirt can be removed', { poopCount: 2 }, 'cleanBtn', /そうじ/],
    ['health recovery takes continued balanced care', {}, '', /少しずつ.*回復/],
  ];

  for (const [name, cause, action, detail] of cases) {
    const notice = careStatus.assess(growing({ health: 25, ...cause }), { petAvailable: true });
    assert.equal(notice.kind, 'health', name);
    assert.equal(notice.severity, 'warning', name);
    assert.equal(notice.action, action, name);
    assert.match(notice.detail, detail, name);
  }
});

test('health advice never prescribes harmful care and falls back from unavailable affection', () => {
  const full = careStatus.assess(growing({ health: 25, hunger: 80 }));
  assert.notEqual(full.action, 'feedBtn');
  assert.doesNotMatch(full.detail, /くすり|ごはん/);

  const spammed = careStatus.assess(growing({ health: 25, happiness: 40 }), { petAvailable: false });
  assert.equal(spammed.action, 'playBtn');
  assert.doesNotMatch(spammed.detail, /じゃれ/);

  const tired = careStatus.assess(growing({ health: 25, happiness: 40, energy: 20 }), { petAvailable: true });
  assert.equal(tired.action, 'sleepBtn');
  assert.doesNotMatch(tired.detail, /あそ/);
});

test('high life risk restores every stat to the 60-point recovery threshold', () => {
  const notice = careStatus.assess(growing({
    deathMeter: 90,
    hunger: 55,
    happiness: 55,
    energy: 55,
    health: 80,
  }));
  assert.equal(notice.kind, 'life');
  assert.equal(notice.action, 'feedBtn');
  assert.match(notice.detail, /おなか.*60/);
});

test('unavailable affection uses sleep when exhausted and play when energy is adequate', () => {
  const exhausted = careStatus.assess(growing({ happiness: 25, energy: 25 }), { petAvailable: false });
  assert.equal(exhausted.kind, 'energy');
  assert.equal(exhausted.action, 'sleepBtn');

  const rested = careStatus.assess(growing({ happiness: 25, energy: 80 }), { petAvailable: false });
  assert.equal(rested.kind, 'happiness');
  assert.equal(rested.action, 'playBtn');
  assert.match(rested.detail, /あそ/);
});

test('assess reports ordinary care needs in priority order', () => {
  const cases = [
    ['sickness', { isSick: true, sicknessType: 'おなかいた' }, 'sick', 'warning', 'sick', 'medicineBtn'],
    ['hunger', { hunger: 25 }, 'hunger', 'warning', 'hunger', 'feedBtn'],
    ['energy before mood', { energy: 25, happiness: 10 }, 'energy', 'warning', 'sleep', 'sleepBtn'],
    ['mood', { happiness: 25 }, 'happiness', 'info', 'play', 'playWithBtn'],
    ['dirt', { poopCount: 2 }, 'poop', 'info', 'clean', 'cleanBtn'],
    ['decline', { decline: 70 }, 'decline', 'info', 'decline', ''],
  ];

  for (const [name, state, kind, severity, icon, action] of cases) {
    const notice = careStatus.assess(growing(state));
    assert.equal(notice.kind, kind, name);
    assert.equal(notice.severity, severity, name);
    assert.equal(notice.icon, icon, name);
    assert.equal(notice.action, action, name);
  }
});

test('sickness labels remain plain text data for the textContent renderer', () => {
  const label = '<b>ねつ & せき</b>';
  const notice = careStatus.assess(growing({ isSick: true, sicknessType: label }));
  assert.ok(`${notice.title}\n${notice.detail}`.includes(label));
  assert.equal(notice.action, 'medicineBtn');
});

test('sleep notices distinguish ongoing recovery from a completed rest', () => {
  const recovering = careStatus.assess(growing({ isSleeping: true, energy: 45 }));
  assert.equal(recovering.kind, 'sleep');
  assert.equal(recovering.icon, 'sleep');
  assert.equal(recovering.action, '');
  assert.match(recovering.detail, /げんき.*回復/);

  const rested = careStatus.assess(growing({ isSleeping: true, energy: 100 }));
  assert.equal(rested.kind, 'sleep');
  assert.equal(rested.icon, 'recovery');
  assert.equal(rested.action, 'sleepBtn');
  assert.match(rested.detail, /おき/);
});

test('fixed-slot status copy stays compact and has no Japanese word spacing', () => {
  const states = [
    growing({ deathMeter: 90, hunger: 55 }),
    growing({ health: 25 }),
    growing({ isSick: true, sicknessType: 'かぜ' }),
    growing({ hunger: 25 }),
    growing({ energy: 25 }),
    growing({ happiness: 25 }),
    growing({ poopCount: 2 }),
    growing({ decline: 70 }),
    growing({ isSleeping: true, energy: 50 }),
    growing({ isSleeping: true, energy: 100 }),
  ];

  for (const state of states) {
    const notice = careStatus.assess(state);
    assert.ok([...notice.title].length <= 16, notice.title);
    assert.ok([...notice.detail].length <= 24, notice.detail);
    assert.doesNotMatch(`${notice.title}${notice.detail}`, /[ぁ-んァ-ヶ一-龠] [ぁ-んァ-ヶ一-龠]/, notice.kind);
  }
});

test('immortality defaults from state and suppresses death wording while retaining care advice', () => {
  const notice = careStatus.assess(growing({ infinite: true, health: 0, dying: true, deathMeter: 95 }));
  assert.equal(notice.kind, 'health');
  assert.equal(notice.severity, 'warning');
  assert.doesNotMatch(`${notice.title}${notice.detail}`, /いのち|しぬ|おわかれ/);

  assert.equal(careStatus.assess(growing({ infinite: true, health: 0 }), { immortal: false }).severity, 'critical');
});

test('snapshot copies only fields used by explicit action summaries', () => {
  const state = growing({ extra: 'do not copy' });
  const shot = careStatus.snapshot(state);
  assert.deepEqual(shot, {
    hunger: 80,
    happiness: 80,
    energy: 80,
    health: 80,
    sodachi: 40,
    growth: 20,
    decline: 10,
    deathMeter: 0,
    isSick: false,
    isSleeping: false,
    stage: 'growing',
  });
  shot.health = 1;
  assert.equal(state.health, 80);
});

test('changes reports at most two meaningful deltas in care priority order', () => {
  const before = careStatus.snapshot(growing());
  const after = { ...before, sodachi: 44, health: 100, energy: 70, hunger: 90 };
  assert.deepEqual(careStatus.changes(before, after), {
    text: 'そだち +4 / けんこう +20',
    icon: 'growth',
  });
});

test('changes derives life from risk and keeps decline improvement negative', () => {
  const before = careStatus.snapshot(growing({ deathMeter: 30, decline: 20 }));
  const after = { ...before, deathMeter: 24, decline: 16 };
  assert.deepEqual(careStatus.changes(before, after), {
    text: 'おとろえ −4 / いのち +6',
    icon: 'decline',
  });
});

test('changes ignores sub-point drift and does not mutate either snapshot', () => {
  const before = careStatus.snapshot(growing());
  const after = { ...before, hunger: 79.1, energy: 79.5 };
  const beforeCopy = structuredClone(before);
  const afterCopy = structuredClone(after);
  assert.equal(careStatus.changes(before, after), null);
  assert.deepEqual(before, beforeCopy);
  assert.deepEqual(after, afterCopy);
});
