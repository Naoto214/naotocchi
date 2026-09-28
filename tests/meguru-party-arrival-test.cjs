// RH-7: なかまが しょうがいぶつに めりこまない(Roadmap §7.4 / 4E-4 preflight §12)。
// あるける 出口の ぜんぶ(10 本 × 両方の むき = 20 とおり)で、ふつうの 地域の いどう(transition)と
// corridor で 着いた ときの それぞれ。なかま 26 + こいびと 1 = 27 にんで、着いてから 1.5 びょう とまって いて、
// 住人と おなじ はんけい(bodyRadius × STAND_CLEAR)で めりこむ 人数が 0。あるいた あと とまっても 0
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');

const arr = (x) => Array.from(x || []);
function setup() {
  const h = harness({ fullDisplay: true, deterministic: true });
  const M = h.api.meguruMod, s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, regionId: 'home' });
  const comps = arr(h.api.normalCompanions).concat(arr(h.api.rareCompanions)).slice(0, 26);
  s.companions = comps.map((c) => ({ id: c.id, bond: 100 }));
  s.lifetime.companionsRecruited = comps.map((c) => c.id);
  const pc = arr(h.api.partnerCandidates)[0];
  s.partner = { id: pc.id, label: pc.label || pc.name, emoji: pc.emoji, affection: 100 }; s.lifetime.partnersRecorded = [pc.id];
  h.api.render();
  const S = M.createSimulation({ regionId: 'home', env: { time: 'day', weather: 'sunny', season: 'spring', region: 'home' } });
  return { M, S };
}
const idle = (S, frames) => { for (let i = 0; i < frames; i++) S.step(1 / 60, { x: 0, y: 0 }); };
const walk = (S, frames) => { for (let i = 0; i < frames; i++) S.step(1 / 60, { x: 0.3, y: -1 }); };
function overlapping(M, S) {
  const r = 22 * M.STAND_CLEAR;
  return S.party.filter((a) => M.penetrationAt(S.world, a.x, a.z, r) > 0).map((a) => a.key);
}
// 20 とおりの 着きかた(from → to)。mode: 'transition' は 出口の gate から、'corridor' は 着いた がわの 出口の spot から
function arrivals(M) {
  const out = [];
  for (const spec of arr(M.walkCorridorSpecs())) {
    const [a, b] = spec.connectionId.split('|');
    for (const [from, to] of [[a, b], [b, a]]) out.push({ spec, from, to });
  }
  return out;
}
function arrive(S, { spec, from, to }, mode) {
  if (mode === 'corridor') {
    const e = spec.endpoints[to];
    const heading = Math.atan2(-e.leaveLocal.x, -e.leaveLocal.z);
    S.enterRegion(to, { at: e.spot, heading });
    S.setPlayer(e.x, e.z); S.player.heading = heading; S.camera.yaw = heading; S.placeParty();
    return;
  }
  S.enterRegion(from);
  const g = S.gates.find((q) => q.to === to && q.spot.id === spec.endpoints[from].spot) || S.gates.find((q) => q.to === to);
  S.enterRegion(to, { at: g.at, heading: g.enterFacing != null ? g.enterFacing : 0 });
}

for (const mode of ['transition', 'corridor']) {
  test(`${mode}: 27 companions never stand inside an obstacle after arriving (all 20 walk directions, 1.5 s idle; also after walking)`, () => {
    const { M, S } = setup();
    const list = arrivals(M);
    assert.equal(list.length, 20);
    const bad = [];
    for (const arrival of list) {
      arrive(S, arrival, mode);
      assert.equal(S.party.length, 27);
      idle(S, 90);
      const now = overlapping(M, S);
      if (now.length) bad.push(`${arrival.from}->${arrival.to} idle: ${now.join(',')}`);
      for (const a of S.party) assert.ok(Math.hypot(a.x - S.player.x, a.z - S.player.z) < 520, `${arrival.from}->${arrival.to}: ${a.key} stays near the player`);
      walk(S, 120); idle(S, 90);
      const after = overlapping(M, S);
      if (after.length) bad.push(`${arrival.from}->${arrival.to} after walk: ${after.join(',')}`);
    }
    assert.deepEqual(bad, []);
  });
}
