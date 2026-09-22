// めぐる Phase 3B-2: にしの 大山塊 2 本
//   `forest|mountain`  もりの いわば ↔ やまの いちのてんぼう
//   `snow|mountain`    やまの ちょうじょう ↔ ゆきやまの みね
// いちばん あつく みるのは「やまの なかの 3 つの 出口が じゃまし あわない」こと。
// とくに **やまから かわ・みずうみへ もどれなく なって いない** こと(3B-1 の みちを こわさない)。
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
function walkOut(sim, gate, push = 0, steps = 600) {
  sim.setPlayer(gate.spot.x + push * 95, gate.spot.z);
  const dirY = gate.out === 'far' ? -1 : 1;      // パッドの y は 上が -1 ＝ おくへ
  for (let i = 0; i < steps; i++)
    for (const ev of sim.step(1 / 60, { x: push, y: dirY })) if (ev.type === 'gate') return ev.gate;
  return null;
}
const gateTo = (sim, to) => sim.gates.find((g) => g.to === to);

// ──────────────────────────────────────────────── 正本

test('1. この PR の 2 本に あるく 出口が ある。connection は ふえて いない', () => {
  const { G } = setup();
  assert.equal(G.connections.length, 15, 'connection は 15 本の まま');
  assert.equal(G.connections.filter((c) => c.b).length, 14);
  assert.ok(G.connections.filter((c) => c.gate).map((c) => c.id).includes('forest|mountain'));
  assert.ok(G.connections.filter((c) => c.gate).map((c) => c.id).includes('snow|mountain'));
  assert.equal(G.connections.filter((c) => c.gate).length, 13, 'gate は 13(3B-3 で 2 本・3B-4 で さらに 2 本 ふえた)');
  assert.equal(G.connections.filter((c) => c.b && !c.gate).map((c) => c.id).sort().join(','),
    'countryside|river_lake', '未実装は 1');
  for (const id of ['forest|mountain', 'snow|mountain']) {
    const c = G.connections.find((q) => q.id === id);
    assert.equal(c.gate.kind, 'walk'); assert.equal(c.layer, 'ground');
    assert.ok(!c.special, id + ' は とくべつな のりものを つかわない');
  }
});

test('2. forest|snow の ちょくつうろは 復活して いない。もり → やま → ゆきぐに', () => {
  const { G } = setup();
  assert.ok(!G.connections.some((c) => c.id === 'forest|snow'), 'forest|snow は ない');
  assert.ok(!G.connections.some((c) => (c.a === 'forest' && c.b === 'snow') || (c.a === 'snow' && c.b === 'forest')),
    'もりと ゆきぐにを じかに むすぶ connection は 1 本も ない');
  const adj = {};
  for (const c of G.connections) { if (!c.b) continue; (adj[c.a] ||= []).push(c.b); (adj[c.b] ||= []).push(c.a); }
  assert.equal(adj.snow.sort().join(','), 'mountain', 'ゆきぐには やま だけ');
  const path = (() => {
    const q = [['forest']], seen = new Set(['forest']);
    while (q.length) { const p = q.shift(); if (p[p.length - 1] === 'snow') return p;
      for (const n of adj[p[p.length - 1]] || []) if (!seen.has(n)) { seen.add(n); q.push([...p, n]); } }
    return null;
  })();
  assert.equal(path.join(' -> '), 'forest -> mountain -> snow');
});

test('3. anchor は ぜんぶ 既存の 非秘密 spot。**新しい spot は 1 つも つくって いない**', () => {
  const { M, G, W } = setup();
  const want = { 'forest|mountain': { forest: 'stonelook', mountain: 'lookout1' },
    'snow|mountain': { mountain: 'summit', snow: 'peak' } };
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
  let sp = 0, pa = 0, zo = 0, se = 0;
  for (const rid of Object.keys(W)) {
    const w = W[rid];
    sp += w.spots.length; pa += w.paths.length; zo += w.zones.length;
    se += w.spots.filter((x) => x.secret).length + w.paths.filter((x) => x[2] === 'secret').length;
  }
  assert.equal(sp, 471); assert.equal(pa, 654); assert.equal(zo, 118); assert.equal(se, 107);
  assert.equal(M.worldCountable().zones, 103);
});

// ──────────────────────────────────────────────── やまの なかの 3 つの 出口

test('4. やまの 出口は 4 つ。foot / ひがしの てんぼう / ちょうじょう / かぜのきれめ に やくわりが ぶんさん', () => {
  const { M } = setup();
  const sim = M.createSimulation({ regionId: 'mountain', discovered: [] });
  const at = {};
  for (const g of sim.gates) at[g.spot.id] = g.to;
  assert.equal(JSON.stringify(at), JSON.stringify({ windnotch: 'desert', lookout1: 'forest', foot: 'river_lake', summit: 'snow' }));
  // 1 つの spot に 2 本 ついて いない
  for (const g of sim.gates) assert.equal(sim.gatesAt(g.spot.id).length, 1, g.spot.id + ' の 出口は 1 本');
  // windnotch は Phase 3B-4 で さばく用に つかった。ほかの 3 つは そのまま
  assert.equal(at.windnotch, 'desert', 'かぜのきれめは さばく用に つかった(Phase 3B-4)');
  assert.ok(!sim.gates.some((g) => g.spot.id === 'trailhead'), 'とざんぐちは 出口に して いない');
});

test('5. **やまの なかから かわ・みずうみへ もどれる**(もりの 出口が じゃまして いない)', () => {
  const { M } = setup();
  const sim = M.createSimulation({ regionId: 'mountain', discovered: [] });
  const seen = { forest: 0, river_lake: 0, snow: 0, none: 0 };
  for (let z = 600; z <= 3000; z += 100) for (const x of [0, -150, 150]) {
    sim.enterRegion('mountain', {});
    sim.setPlayer(x, z);
    let hit = null;
    for (let i = 0; i < 420 && !hit; i++)
      for (const ev of sim.step(1 / 60, { x: 0, y: 1 })) if (ev.type === 'gate') hit = ev.gate;
    seen[hit ? hit.to : 'none']++;
  }
  assert.ok(seen.river_lake > 0, 'やまの 中心線から 口へ おりると かわ・みずうみへ 出られる');
  assert.equal(seen.forest, 0,
    '中心線を おりる とき、もりの 出口(ひがしの てんぼう)は ひらかない = かわ・みずうみを ふさいで いない');
});

test('6. ひがしの てんぼうからは もりへ 出る(よこに ずれた ばしょだけ)', () => {
  const { M, W } = setup();
  const sim = M.createSimulation({ regionId: 'mountain', discovered: [] });
  const g = gateTo(sim, 'forest');
  const q = W.mountain.spots.find((x) => x.id === 'lookout1');
  assert.ok(Math.abs(q.x) > 600, 'ひがしの てんぼうは 中心線から じゅうぶん よこに ずれて いる(x=' + q.x + ')');
  assert.equal(walkOut(sim, g).to, 'forest');
});

// ──────────────────────────────────────────────── 行って もどる

test('7. もり ⇄ やま を 行って もどれる', () => {
  const { M } = setup();
  const a = M.createSimulation({ regionId: 'forest', discovered: [] });
  const out = walkOut(a, gateTo(a, 'mountain'));
  assert.equal(out.to, 'mountain'); assert.equal(out.at, 'lookout1');
  const b = M.createSimulation({ regionId: 'mountain', discovered: [] });
  const back = walkOut(b, gateTo(b, 'forest'));
  assert.equal(back.to, 'forest'); assert.equal(back.at, 'stonelook');
  assert.equal(out.enterFacing, 0, 'やまには 口がわから 入る ので おくを むく');
  assert.equal(back.enterFacing, Math.PI, 'もりには 奥がわから 入る ので 口を むく');
});

test('8. やま ⇄ ゆきぐに を 行って もどれる。どちらも おくが みね', () => {
  const { M, W } = setup();
  const a = M.createSimulation({ regionId: 'mountain', discovered: [] });
  const out = walkOut(a, gateTo(a, 'snow'));
  assert.equal(out.to, 'snow'); assert.equal(out.at, 'peak');
  const b = M.createSimulation({ regionId: 'snow', discovered: [] });
  const back = walkOut(b, gateTo(b, 'mountain'));
  assert.equal(back.to, 'mountain'); assert.equal(back.at, 'summit');
  assert.equal(out.enterFacing, Math.PI); assert.equal(back.enterFacing, Math.PI);
  // どちらも region の いちばん おく
  assert.ok(W.mountain.spots.find((q) => q.id === 'summit').z / W.mountain.len > 0.9);
  assert.ok(W.snow.spots.find((q) => q.id === 'peak').z / W.snow.len > 0.9);
});

test('9. にしの 大山塊が あるいて つながる: もり → やま → ゆきぐに → やま → かわ', () => {
  const { M } = setup();
  const legs = [['forest', 'mountain'], ['mountain', 'snow'], ['snow', 'mountain'], ['mountain', 'river_lake']];
  const route = ['forest'];
  for (const [from, to] of legs) {
    const sim = M.createSimulation({ regionId: from, discovered: [] });
    const g = gateTo(sim, to);
    assert.ok(g, from + ' から ' + to + ' への 出口が ある');
    const hit = walkOut(sim, g);
    assert.ok(hit, from + ' → ' + to);
    route.push(hit.to);
  }
  assert.equal(route.join(' -> '), 'forest -> mountain -> snow -> mountain -> river_lake');
});

test('10. 1 かいの よこぎりで gate は 1 どだけ(演出の 二じゅう はじまり なし)', () => {
  const { M } = setup();
  for (const [rid, to] of [['forest', 'mountain'], ['mountain', 'forest'], ['mountain', 'snow'], ['snow', 'mountain']]) {
    const sim = M.createSimulation({ regionId: rid, discovered: [] });
    const g = gateTo(sim, to);
    sim.setPlayer(g.spot.x, g.spot.z);
    const dirY = g.out === 'far' ? -1 : 1;
    let fired = 0;
    for (let i = 0; i < 600; i++)
      for (const ev of sim.step(1 / 60, { x: 0, y: dirY })) if (ev.type === 'gate') fired++;
    assert.equal(fired, 1, `${rid} → ${to} で gate が ${fired} かい`);
  }
});

// ──────────────────────────────────────────────── 演出・UI・こわして いない こと

test('11. Phase 2.1 の しくみを そのまま つかう(あたらしい engine を つくって いない)', () => {
  const { M } = setup();
  for (const rid of ['forest', 'mountain', 'snow']) {
    const sim = M.createSimulation({ regionId: rid, discovered: [] });
    for (const g of sim.gates) {
      assert.equal(g.way, 'walk', g.id + ' は あるいて こえる');
      assert.equal(g.dir, null);
      const plan = M.transitionPlan(g);
      assert.equal(plan.phases.map((p) => p.id).join(','), 'approach,cross,arrive,settle');
      assert.ok(M.transitionPlan(g, { repeat: true }).total < plan.total);
      assert.ok(M.transitionPlan(g, { reduced: true }).total < plan.total);
    }
  }
  assert.equal(Object.keys(M.TRANSITION.ways).sort().join(','), 'down,sail,up,walk');
});

test('12. non-region terrain: どの 出口も あいだの ちけいを もつ(いきなり ワープ しない)', () => {
  const { G } = setup();
  for (const id of ['forest|mountain', 'snow|mountain']) {
    const c = G.connections.find((q) => q.id === id);
    for (const [rid, e] of Object.entries(c.gate.ends)) {
      assert.ok(Array.isArray(e.land) && e.land.length >= 5, `${id} の ${rid} がわに ちけいが 5 つ いじょう`);
      assert.equal(new Set(e.land).size, e.land.length, 'おなじ ちけいを くりかえさない');
      for (const x of e.land) assert.equal(typeof x, 'string');
    }
    const [x, y] = Object.values(c.gate.ends).map((e) => e.land);
    assert.equal(x.length, y.length, id + ' の 行きと かえりは おなじ かず');
    // 行きと かえりは おなじ みちを 逆に たどる。ただし **すすむ むきで ことばは かわる**
    // (のぼりは「きが まばらに なる」、くだりは「きが ふえる」)。既存の home|forest と おなじ 書きかた
    assert.notEqual(x.join(','), y.join(','), id + ' の 行きと かえりは おなじ ならびでは ない');
    const mid = (a) => a.slice(1, -1);
    assert.ok(mid(x).filter((q) => mid(y).includes(q)).length >= mid(x).length - 1,
      id + ' の とちゅうの ちけいは 1 つを のぞいて 行き かえりで おなじ');
  }
});

test('13. UI は ふえて いない。あるく 出口では context action を 出さない', () => {
  const { M, G, W } = setup();
  for (const [rid, sid] of [['forest', 'stonelook'], ['mountain', 'lookout1'], ['mountain', 'summit'], ['snow', 'peak']]) {
    const sim = M.createSimulation({ regionId: rid, discovered: [] });
    const q = W[rid].spots.find((x) => x.id === sid);
    sim.setPlayer(q.x, q.z); sim.step(1 / 60, { x: 0, y: 0 });
    assert.equal(sim.gateHere(), null, `${rid}.${sid} で「のる」は 出ない`);
  }
  const seen = {};
  for (const c of G.connections) {
    if (!c.gate || c.gate.kind === 'walk') continue;
    for (const [rid, e] of Object.entries(c.gate.ends)) {
      const k = rid + '.' + e.spot;
      assert.ok(!seen[k], k + ' に ride が 2 つ'); seen[k] = c.id;
    }
  }
  assert.equal(Object.keys(seen).length, 6, 'ride は ふね 2 / もぐる 2 / ゴンドラ 2 の まま');
});

test('14. 探索率の ぶんぼは 1 つも 動いて いない(gate を つけただけ)', () => {
  const { M } = setup();
  const C = M.worldCountable();
  assert.equal(C.regions.length, 11); assert.equal(C.links.length, 13);
  assert.equal(C.tier1, 17); assert.equal(C.zones, 103);
  const every = {};
  for (const id of C.regions) every[id] = M.WORLDS[id].spots.map((q) => q.id);
  const found = M.worldLinksFrom(every);
  for (const id of ['forest|mountain', 'snow|mountain']) assert.ok(found.includes(id), id + ' は はっけん できる');
  assert.equal(M.worldLinksFrom({ mountain: ['summit'] }).length, 0, 'かたがわだけでは ひらかない');
});

test('15. きめられた 出口 いがいからは 外へ 出られない(もり・やま・ゆきぐに ぜんぶの spot)', () => {
  const { M, W } = setup();
  for (const rid of ['forest', 'mountain', 'snow']) {
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

test('16. Fog: もりを 知った だけで ゆきぐにの ばしょも そんざいも わからない', () => {
  const { M } = setup();
  const wd = M.worldMapData({ regions: ['home', 'forest'], links: ['home|forest'], marks: {}, zones: {} });
  assert.equal(wd.regions.map((r) => r.id).sort().join(','), 'forest,home');
  assert.equal(wd.links.map((l) => l.id).join(','), 'home|forest', 'もりから さきの みちは 出ない');
  const dump = JSON.stringify(wd);
  for (const id of ['snow', 'mountain', 'river_lake', 'jungle', 'deepsea', 'star_stop', 'memory_lake'])
    assert.ok(!dump.includes(id), id + ' は もれない');
  // りょうはしを 見つける まで 線は 出ない
  assert.equal(M.worldMapData({ regions: ['mountain'], links: ['snow|mountain'], marks: {}, zones: {} }).links.length, 0);
});

test('17. 「たび」は 無変更。なかまは ついてくる。住民は だぶらない', () => {
  const { h, s, M } = setup();
  assert.equal(typeof h.api.travelToRegion, 'function');
  for (const id of ['forest', 'mountain', 'snow']) {
    h.api.travelToRegion(h.api.REGIONS.find((r) => r.id === id), { id });
    assert.equal(s.regionId, id);
  }
  s.lifetime.companionsRecruited = ['shiba'];
  s.companions = [{ id: 'shiba', bond: 80 }];
  for (const rid of ['forest', 'mountain', 'snow']) {
    const sim = M.createSimulation({ regionId: rid, discovered: [] });
    for (let i = 0; i < 120; i++) sim.step(1 / 60, { x: 0, y: -1 });
    const v = sim.view();
    assert.ok(v.party.length >= 1, rid + ': なかまが いる');
    for (const a of v.party) assert.ok(sim.dist(a, v.player) < 400, rid + ': ' + a.key + ' は そばに いる');
    const keys = v.residents.map((a) => a.key);
    assert.equal(new Set(keys).size, keys.length, rid + ': 住民の key が だぶって いない');
  }
});

test('18. 4 つの anchor は entry から **みちを たどって** 行ける(じっさいに あそべる)', () => {
  const { M, W } = setup();
  // region の みちの グラフの うえで、入口から その spot まで つながって いるか。
  // 「出口は あるのに そこまで 行けない」= あそべない みち に なって いない ことを しばる
  for (const [rid, entry, targets] of [
    ['forest', 'entry', ['stonelook']],
    ['mountain', 'foot', ['lookout1', 'summit', 'foot']],
    ['snow', 'gate', ['peak']],
  ]) {
    const reach = M.reachableSpots(W[rid], entry);
    for (const t of targets) assert.ok(reach.has(t), `${rid}: ${entry} から ${t} へ みちが つながって いる`);
  }
  // ついでに: この 3 地域は 非秘密 spot が 1 つも 孤立して いない
  for (const rid of ['forest', 'mountain', 'snow']) {
    const w = W[rid];
    const entry = w.spots.reduce((a, b) => (a.z < b.z ? a : b)).id;
    const reach = M.reachableSpots(w, entry);
    const miss = w.spots.filter((s) => !s.secret && !reach.has(s.id)).map((s) => s.id);
    assert.equal(miss.join(','), '', rid + ': とどかない 非秘密 spot');
  }
});
