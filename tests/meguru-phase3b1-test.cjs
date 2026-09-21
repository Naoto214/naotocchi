// めぐる Phase 3B-1: たにの 川すじ 2 本
//   `mountain|river_lake`  やまの ふもと ↔ みなもとのみずうみ
//   `home|river_lake`      おおきなき ↔ かわぎしの ひろば
// いちばん あつく みるのは「おおきなきで **もり と かわを とりちがえない**」こと。
// つぎに「行って もどれる」こと、そして「ほかは なにも かわって いない」こと。
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');

function setup() {
  const h = harness({ fullDisplay: true });
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, energy: 100, health: 100, hunger: 80,
    speciesLine: 'dog', stageIndex: 4, ageTicks: 500 });
  const M = h.api.meguruMod;
  return { h, s, M, G: M.WORLD_GEOGRAPHY, W: M.WORLDS };
}
// その 出口へ 立って 外へ あるく。push は よこへ よる ぶん(-1 = にし / +1 = ひがし)
function walkOut(sim, gate, push = 0, steps = 420) {
  sim.setPlayer(gate.spot.x + push * 95, gate.spot.z);
  const dirY = gate.out === 'far' ? -1 : 1;      // パッドの y は 上が -1 ＝ おくへ
  for (let i = 0; i < steps; i++)
    for (const ev of sim.step(1 / 60, { x: push, y: dirY })) if (ev.type === 'gate') return ev.gate;
  return null;
}
const gateTo = (sim, to) => sim.gates.find((g) => g.to === to);

// ──────────────────────────────────────────────── 正本

test('1. 2 本に あるく 出口が ついた。ほかの 未実装は ふえて いない', () => {
  const { G } = setup();
  const withGate = G.connections.filter((c) => c.gate).map((c) => c.id).sort();
  assert.equal(withGate.join(','),
    'countryside|forest,countryside|star_stop,deepsea|sea,home|forest,home|river_lake,jungle|sea,mountain|river_lake');
  assert.equal(withGate.length, 7, 'gate は 5 → 7');
  assert.equal(G.connections.filter((c) => c.b && !c.gate).length, 7, '未実装は 9 → 7');
  assert.equal(G.connections.length, 15, 'connection は ふやして いない');
  for (const id of ['mountain|river_lake', 'home|river_lake']) {
    const c = G.connections.find((q) => q.id === id);
    assert.equal(c.gate.kind, 'walk', id + ' は あるいて こえる');
    assert.equal(c.layer, 'ground');
    assert.ok(!c.special, id + ' は とくべつな のりものを つかわない');
  }
});

test('2. anchor は ぜんぶ 既存の 非秘密 spot。**新しい spot は 1 つも つくって いない**', () => {
  const { M, G, W } = setup();
  const want = { 'mountain|river_lake': { mountain: 'foot', river_lake: 'lakelook' },
    'home|river_lake': { home: 'bigtree', river_lake: 'riverside' } };
  for (const [id, ends] of Object.entries(want)) {
    const c = G.connections.find((q) => q.id === id);
    for (const [rid, sid] of Object.entries(ends)) {
      assert.equal(c.gate.ends[rid].spot, sid, `${id} の ${rid} がわは ${sid}`);
      assert.equal(c.mouths[rid], sid, 'mouths と gate は おなじ spot');
      const q = W[rid].spots.find((x) => x.id === sid);
      assert.ok(q, `${rid}.${sid} は 実在する`);
      assert.ok(!q.secret, `${rid}.${sid} は ひみつでは ない`);
    }
  }
  // region の なかみは 1 つも かわって いない
  let spots = 0, paths = 0, zones = 0, secret = 0;
  for (const rid of Object.keys(W)) {
    const w = W[rid];
    spots += w.spots.length; paths += w.paths.length; zones += w.zones.length;
    secret += w.spots.filter((x) => x.secret).length + w.paths.filter((x) => x[2] === 'secret').length;
  }
  assert.equal(spots, 471); assert.equal(paths, 654); assert.equal(zones, 118); assert.equal(secret, 107);
  assert.equal(M.worldCountable().zones, 103);
});

test('3. かわ・みずうみ の 2 つの 入口は かさならない。かわぎし は いなか用に あいて いる', () => {
  const { M, W } = setup();
  const sim = M.createSimulation({ regionId: 'river_lake', discovered: [] });
  const at = {};
  for (const g of sim.gates) (at[g.spot.id] ||= []).push(g.to);
  assert.equal(Object.keys(at).sort().join(','), 'lakelook,riverside', '2 つの 入口は べつの spot');
  assert.equal(at.riverside.join(','), 'home', '口がわは おうちから');
  assert.equal(at.lakelook.join(','), 'mountain', '奥がわは やまから');
  // 口(z 800)と 奥(z 6600)。おなじ ところに かさなって いない
  const r = (id) => W.river_lake.spots.find((q) => q.id === id).z;
  assert.ok(r('lakelook') - r('riverside') > 5000, '口と 奥で じゅうぶん はなれて いる');
  // countryside|river_lake の anchor 候補 `bank` は まだ どの gate にも つかわれて いない
  assert.ok(!sim.gates.some((g) => g.spot.id === 'bank'), 'かわぎしは いなか用に あけて ある');
});

// ──────────────────────────────────────────────── おおきなきの 分かれみち

test('4. おおきなきに 出口が 2 つ。にしなら もり・ひがしなら かわ', () => {
  const { M } = setup();
  const sim = M.createSimulation({ regionId: 'home', discovered: [] });
  const at = sim.gatesAt('bigtree');
  assert.equal(at.length, 2, 'おおきなきは 分かれみち');
  assert.equal(at.map((g) => g.to).join(','), 'forest,river_lake', 'priority じゅん');
  assert.equal(at[0].priority, 0); assert.equal(at[1].priority, 1);
  assert.equal(walkOut(sim, at[0], -0.8).to, 'forest');
  sim.enterRegion('home', { at: 'gate' });
  assert.equal(walkOut(sim, at[1], 0.8).to, 'river_lake');
});

test('5. **とりちがえない**。にしへ よって かわに 出る / ひがしへ よって もりに 出る ことは ない', () => {
  const { M } = setup();
  const sim = M.createSimulation({ regionId: 'home', discovered: [] });
  const g = sim.gatesAt('bigtree')[0];
  for (const push of [-1, -0.9, -0.8, -0.6, -0.4]) {
    sim.enterRegion('home', { at: 'gate' });
    const hit = walkOut(sim, g, push);
    if (hit) assert.equal(hit.to, 'forest', `にし(${push}) で かわへ 出て しまった`);
  }
  for (const push of [1, 0.9, 0.8, 0.6, 0.4]) {
    sim.enterRegion('home', { at: 'gate' });
    const hit = walkOut(sim, g, push);
    if (hit) assert.equal(hit.to, 'river_lake', `ひがし(${push}) で もりへ 出て しまった`);
  }
});

test('6. まっすぐ あるいた ときは これまでどおり もり(既存の たいけんを かえない)', () => {
  const { M } = setup();
  const sim = M.createSimulation({ regionId: 'home', discovered: [] });
  const hit = walkOut(sim, sim.gatesAt('bigtree')[0], 0);
  assert.ok(hit, 'まっすぐでも ちゃんと 出られる');
  assert.equal(hit.to, 'forest');
  assert.equal(hit.at, 'entry');
});

test('7. 1 かいの よこぎりで gate は 1 どだけ(演出の 二じゅう はじまり なし)', () => {
  const { M } = setup();
  for (const [push, want] of [[-0.8, 'forest'], [0.8, 'river_lake']]) {
    const sim = M.createSimulation({ regionId: 'home', discovered: [] });
    const g = sim.gatesAt('bigtree')[0];
    sim.setPlayer(g.spot.x + push * 95, g.spot.z);
    let fired = 0, which = null;
    for (let i = 0; i < 480; i++)
      for (const ev of sim.step(1 / 60, { x: push, y: -1 })) if (ev.type === 'gate') { fired++; which = ev.gate.to; }
    assert.equal(fired, 1, `push=${push} で gate が ${fired} かい`);
    assert.equal(which, want);
  }
});

// ──────────────────────────────────────────────── 行って もどる

test('8. おうち ⇄ かわ・みずうみ を 行って もどれる', () => {
  const { M } = setup();
  const a = M.createSimulation({ regionId: 'home', discovered: [] });
  const out = walkOut(a, gateTo(a, 'river_lake'), 0.8);
  assert.equal(out.to, 'river_lake'); assert.equal(out.at, 'riverside');
  const b = M.createSimulation({ regionId: 'river_lake', discovered: [] });
  const back = walkOut(b, gateTo(b, 'home'));
  assert.equal(back.to, 'home'); assert.equal(back.at, 'bigtree');
  // 入った がわの むき: 口(near)から 入れば おくへ、おく(far)から 入れば 口へ
  assert.equal(out.enterFacing, 0, 'かわには 口から 入る ので おくを むく');
  assert.equal(back.enterFacing, Math.PI, 'おうちには おくから もどる ので 口を むく');
});

test('9. やま ⇄ かわ・みずうみ を 行って もどれる', () => {
  const { M } = setup();
  const a = M.createSimulation({ regionId: 'mountain', discovered: [] });
  const out = walkOut(a, gateTo(a, 'river_lake'));
  assert.equal(out.to, 'river_lake'); assert.equal(out.at, 'lakelook');
  const b = M.createSimulation({ regionId: 'river_lake', discovered: [] });
  const back = walkOut(b, gateTo(b, 'mountain'));
  assert.equal(back.to, 'mountain'); assert.equal(back.at, 'foot');
  assert.equal(out.enterFacing, Math.PI, 'みずうみの 奥から 入る ので 口を むく');
  assert.equal(back.enterFacing, 0, 'やまの ふもとから 入る ので おくを むく');
});

test('10. たにの 川すじが あるいて つながる: やま → かわ → おうち → もり', () => {
  const { M } = setup();
  let at = 'mountain';
  const route = [at];
  for (const to of ['river_lake', 'home', 'forest']) {
    const sim = M.createSimulation({ regionId: at, discovered: [] });
    const g = gateTo(sim, to);
    assert.ok(g, at + ' から ' + to + ' への 出口が ある');
    const push = (at === 'home' && to === 'forest') ? -0.8 : (at === 'river_lake' && to === 'home') ? 0 : 0;
    const hit = walkOut(sim, g, push);
    assert.ok(hit, at + ' → ' + to);
    at = hit.to; route.push(at);
  }
  assert.equal(route.join(' -> '), 'mountain -> river_lake -> home -> forest');
});

// ──────────────────────────────────────────────── 演出・UI・こわして いない こと

test('11. Phase 2.1 の しくみを そのまま つかう(あたらしい engine を つくって いない)', () => {
  const { M } = setup();
  for (const rid of ['home', 'river_lake', 'mountain']) {
    const sim = M.createSimulation({ regionId: rid, discovered: [] });
    for (const g of sim.gates) {
      assert.equal(g.way, 'walk', g.id + ' は あるいて こえる');
      assert.equal(g.dir, null, 'あるく みちに たてじくの むきは ない');
      const plan = M.transitionPlan(g);
      assert.equal(plan.phases.map((p) => p.id).join(','), 'approach,cross,arrive,settle');
      assert.ok(plan.total > 0);
      // 2 かいめは みじかく、reduced は もっと みじかく
      assert.ok(M.transitionPlan(g, { repeat: true }).total < plan.total);
      assert.ok(M.transitionPlan(g, { reduced: true }).total < plan.total);
    }
  }
  // way の ていぎは さわって いない
  assert.equal(Object.keys(M.TRANSITION.ways).sort().join(','), 'down,sail,up,walk');
});

test('12. non-region terrain: どの 出口も あいだの ちけいを もつ(いきなり ワープ しない)', () => {
  const { G } = setup();
  for (const id of ['mountain|river_lake', 'home|river_lake']) {
    const c = G.connections.find((q) => q.id === id);
    for (const [rid, e] of Object.entries(c.gate.ends)) {
      assert.ok(Array.isArray(e.land) && e.land.length >= 5,
        `${id} の ${rid} がわに あいだの ちけいが 5 つ いじょう ある`);
      assert.equal(new Set(e.land).size, e.land.length, 'おなじ ちけいを くりかえさない');
    }
    // りょうがわの land は たがいに 逆むき(行きと かえりで おなじ ところを とおる)
    const [x, y] = Object.values(c.gate.ends).map((e) => e.land);
    assert.equal(x.length, y.length, id + ' の 行きと かえりは おなじ かずの ちけい');
  }
});

test('13. UI は ふえて いない。あるく 出口では context action を 出さない', () => {
  const { M, W } = setup();
  for (const [rid, sid] of [['home', 'bigtree'], ['river_lake', 'riverside'], ['river_lake', 'lakelook'], ['mountain', 'foot']]) {
    const sim = M.createSimulation({ regionId: rid, discovered: [] });
    const q = W[rid].spots.find((x) => x.id === sid);
    sim.setPlayer(q.x, q.z); sim.step(1 / 60, { x: 0, y: 0 });
    assert.equal(sim.gateHere(), null, `${rid}.${sid} で「のる」は 出ない`);
  }
  // ride は いまも 1 spot 1 本まで
  const { G } = setup();
  const seen = {};
  for (const c of G.connections) {
    if (!c.gate || c.gate.kind === 'walk') continue;
    for (const [rid, e] of Object.entries(c.gate.ends)) {
      const k = rid + '.' + e.spot;
      assert.ok(!seen[k], k + ' に ride が 2 つ'); seen[k] = c.id;
    }
  }
});

test('14. 探索率の ぶんぼは 1 つも 動いて いない(gate を つけただけ)', () => {
  const { M } = setup();
  const C = M.worldCountable();
  assert.equal(C.regions.length, 11); assert.equal(C.links.length, 13);
  assert.equal(C.tier1, 17); assert.equal(C.zones, 103);
  // はっけんの じょうけんも かわって いない(gate では なく mouth の spot で きまる)
  const every = {};
  for (const id of C.regions) every[id] = M.WORLDS[id].spots.map((q) => q.id);
  assert.ok(M.worldLinksFrom(every).includes('home|river_lake'));
  assert.ok(M.worldLinksFrom(every).includes('mountain|river_lake'));
  assert.equal(M.worldLinksFrom({ home: ['bigtree'] }).length, 0, 'かたがわだけでは ひらかない');
});

test('15. きめられた 出口 いがいからは 外へ 出られない(かわ・やま ぜんぶの spot)', () => {
  const { M, W } = setup();
  for (const rid of ['river_lake', 'mountain']) {
    const sim = M.createSimulation({ regionId: rid, discovered: [] });
    const gateSpots = new Set(sim.gates.map((g) => g.spot.id));
    let fired = 0;
    for (const q of W[rid].spots) {
      if (q.secret || gateSpots.has(q.id)) continue;
      for (const v of [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: 1, y: 0 }, { x: -1, y: 0 }]) {
        sim.setPlayer(q.x, q.z);
        for (let i = 0; i < 90; i++) for (const ev of sim.step(1 / 60, v)) if (ev.type === 'gate') fired++;
      }
    }
    assert.equal(fired, 0, rid + ': 出口 いがいからは 出ない');
  }
});

test('16. Fog: gate を つけても 見つけて いない ものは もれない', () => {
  const { M } = setup();
  const wd = M.worldMapData({ regions: ['home'], links: [], marks: {}, zones: {} });
  assert.equal(wd.regions.map((r) => r.id).join(','), 'home');
  assert.equal(wd.links.length, 0);
  const dump = JSON.stringify(wd);
  for (const id of ['river_lake', 'mountain', 'snow', 'jungle', 'deepsea', 'star_stop', 'memory_lake'])
    assert.ok(!dump.includes(id), id + ' は もれない');
  // かたほうだけ 見つけた ときも 線は 出ない
  const half = M.worldMapData({ regions: ['home'], links: ['home|river_lake'], marks: {}, zones: {} });
  assert.equal(half.links.length, 0, 'りょうはしを 見つける まで 線は 出ない');
});

test('17. 「たび」は 無変更。なかまは ついてくる。住民は だぶらない', () => {
  const { h, s, M } = setup();
  assert.equal(typeof h.api.travelToRegion, 'function');
  for (const id of ['river_lake', 'mountain', 'home']) {
    h.api.travelToRegion(h.api.REGIONS.find((r) => r.id === id), { id });
    assert.equal(s.regionId, id);
  }
  s.lifetime.companionsRecruited = ['shiba'];
  s.companions = [{ id: 'shiba', bond: 80 }];
  for (const rid of ['river_lake', 'mountain']) {
    const sim = M.createSimulation({ regionId: rid, discovered: [] });
    for (let i = 0; i < 120; i++) sim.step(1 / 60, { x: 0, y: -1 });
    const v = sim.view();
    for (const a of v.party) assert.ok(sim.dist(a, v.player) < 400, rid + ': ' + a.key + ' は そばに いる');
    const keys = v.residents.map((a) => a.key);
    assert.equal(new Set(keys).size, keys.length, rid + ': 住民の key が だぶって いない');
  }
});
