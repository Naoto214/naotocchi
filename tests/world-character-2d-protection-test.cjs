// World presentation must remain opt-in; discovery records stay shared.
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');
function fakeCtx() {
  return new Proxy({}, { get(o, k) {
    if (k in o) return o[k];
    if (k === 'measureText') return t => ({ width: String(t).length * 6 });
    if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} });
    return () => {};
  }, set(o, k, v) { o[k] = v; return true; } });
}
function setup(on = false) {
  const h = harness({ deterministic: true, fullDisplay: true, canvasContext: fakeCtx() });
  // This is the existing URL/WebGL-derived bridge value; never saved state.
  h.api.meguruBridge.meguru3d = on;
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100,
    hunger: 80, speciesLine: 'dog', stageIndex: 4, ageTicks: 500, regionId: 'forest' });
  s.petKey = `dog:${h.api.currentFormStageIndex()}`;
  s.lifetime.meguru = { visits: 0, talkCount: 0, met: {}, talks: {}, spots: {}, zones: {}, paths: {}, marks: {}, world: { regions: [], links: [] } };
  h.api.render();
  return { h, s, M: h.api.meguruMod };
}
function drain(h, run) {
  const notices = [];
  for (let i = 0; i < 120; i++) {
    const f = run.foundInfo();
    if (f.now && !notices.some(n => n.key === f.now.key)) notices.push(f.now);
    if (!f.now && !f.queue.length && !f.banner) break;
    h.advance(400);
  }
  return notices;
}
for (const on of [false, true]) {
  test(`presentation flag=${on}: discovered ordinary spots remain recorded with mode-specific map display`, () => {
    const { M, s } = setup(on), before = JSON.stringify(s);
    const sim = M.createSimulation({ regionId: 'forest', discovered: [] });
    for (const id of ['entry', 'bright1', 'thicket1', 'creek2', 'great']) sim.discovered.add(id);
    const md = sim.mapData();
    assert.equal(md.spots.some(q => q.id === 'thicket1'), !on);
    assert.equal(md.spots.some(q => q.id === 'creek2'), !on);
    assert.equal(sim.discovered.size, 5);
    assert.equal(md.progress.percent, Math.round(5 / sim.world.spots.filter(q => !q.secret).length * 100));
    assert.equal(JSON.stringify(s), before, 'map presentation never mutates save state');
    assert.equal(M.spotDiscoveryLevel({ kind: 'water' }), on ? 1 : 2);
  });
  test(`presentation flag=${on}: ordinary, landmark and zone notifications preserve their mode`, () => {
    const { h, s } = setup(on);
    assert.equal(h.api.startMeguru(), true);
    const run = h.api.meguruRun();
    h.advance(1800); drain(h, run);
    for (const [id, kind] of [['bright2', 'spot'], ['great', 'landmark']]) {
      const q = run.world.spots.find(q => q.id === id);
      run.setPlayer(q.x, q.z); h.advance(120);
      const notices = drain(h, run);
      assert.equal(notices.some(n => n.key === `spot:forest:${id}` && n.kind === kind), !on, id);
      assert.ok(s.lifetime.meguru.spots.forest.includes(id));
      if (id === 'great') {
        assert.equal(notices.some(n => n.kind === 'zone'), !on, 'new ancient district');
        assert.equal(run.quietMark().id === 'great', on);
      }
    }
    assert.ok(s.lifetime.meguru.zones.forest.length > 0);
    h.api.stopMeguru();
  });
}
