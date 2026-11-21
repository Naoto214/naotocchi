import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import observer from './observer.cjs';

const native = readFileSync(join(process.env.MOBILITY_GAME, 'telemetry-mobility-v9.js'), 'utf8');

function start() {
  const window = {};
  const source = observer.patchOwnerObserver(observer.patchObserver(native));
  runInNewContext(source, {
    window, performance, URLSearchParams, location: { search: '' },
    document: { addEventListener() {} },
  });
  const api = window.HomeMobilityDiagnostics;
  const actor = { key: 'pet:dog', x: 0, y: 0, w: 6, h: 6, source: 'ambient' };
  const home = { actors: [actor], clock: 100, scene: { navigation: { intentScale: { x: 1, y: 1 } } } };
  const goal = { x: 20, y: 0 };
  const facts = () => ({ terrain: true, visible: true, box: { left: 0, right: 100, top: 0, bottom: 100 } });
  api.bindModel('v10', () => home);
  api.enable();
  function plan(at, accepted, source = 'ambient') {
    home.clock = at;
    const request = api.request(actor.key, source, goal, false, at);
    request.planned = true;
    api.result(request, accepted, actor, home.actors, at, facts);
  }
  function choice(at, name, atBudget = false) {
    home.clock = at;
    if (atBudget) api.wait(actor, 'ambient-budget');
    api.choice(actor, name);
  }
  return { api, actor, home, plan, choice, read: () => api.read().residents[0] };
}

test('idle ends a refusal at the native choice clock without recording a later recovery', () => {
  for (const name of ['look', 'turn', 'sit', 'rest']) {
    const t = start();
    t.plan(110, false);
    t.plan(112, false);
    t.choice(125, name);
    t.plan(300, true);
    const r = t.read();
    assert.equal(r.longestRejected, 15);
    assert.equal(r.firstRejectedAt, null);
    assert.equal(r.ownRejections, 1);
    assert.equal(r.ownRecoveries, 0);
    assert.equal(r.ownIdleEnds, 1);
    assert.equal(r.ownBudgetEnds, 0);
  }
});

test('budget interruptions, active demand and same-source recoveries remain separate', () => {
  const t = start();
  t.plan(102, false);
  t.choice(105, 'sit', true);
  t.plan(120, false);
  t.choice(125, 'walk');
  t.plan(128, true, 'drag');
  assert.equal(t.read().firstRejectedAt, 20);
  t.plan(135, true);
  t.plan(146, false);
  const r = t.read();
  assert.equal(r.longestRejected, 15);
  assert.equal(r.ownRejections, 3);
  assert.equal(r.ownRecoveries, 1);
  assert.equal(r.ownIdleEnds, 0);
  assert.equal(r.ownBudgetEnds, 1);
  assert.equal(r.firstRejectedAt, 46);
});

test('owner 8px completion uses the tolerance of the native cohort', () => {
  const t = start();
  t.plan(105, true);
  t.actor.x = 8 - 1e-14;
  t.api.arrival(t.actor, 106);
  assert.equal(t.read().goalWalks, 1);
  t.plan(110, true);
  t.actor.x += 7.99;
  t.api.arrival(t.actor, 111);
  assert.equal(t.read().goalWalks, 1);
});
