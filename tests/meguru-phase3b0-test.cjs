// めぐる Phase 3B-0。
//   A. `forest|snow` を 正式 connection から けす(Phase 3A 監査 #27 の けつろん)
//   B. **1 つの spot に 出口を いくつでも** もてる ようにする
// いちばん あつく みるのは「けした みちの ゴーストが のこらない こと」と、
// 「出口の えらびかたが **配列の じゅんばんに よらない** こと」。
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');

function setup(regionId = 'home') {
  const h = harness({ fullDisplay: true });
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, energy: 100, health: 100, hunger: 80,
    speciesLine: 'dog', stageIndex: 4, ageTicks: 500 });
  const M = h.api.meguruMod;
  return { h, s, M, G: M.WORLD_GEOGRAPHY, W: M.WORLDS, regionId };
}
// その 出口へ 立って、外へ むかって あるく。よこへ よる ぶんは push で
function walkOut(sim, gate, push = 0, steps = 240) {
  sim.setPlayer(gate.spot.x + push * 90, gate.spot.z);
  const dirY = gate.out === 'far' ? -1 : 1;      // パッドの y は 上が -1 ＝ おくへ
  for (let i = 0; i < steps; i++) {
    for (const ev of sim.step(1 / 60, { x: push, y: dirY })) if (ev.type === 'gate') return ev.gate;
  }
  return null;
}

// ──────────────────────────────────────────────── A. forest|snow の さくじょ

test('A1. forest|snow は 正本・地図・みちの はっけん の どこにも のこって いない', () => {
  const { M, G, W } = setup();
  assert.ok(!G.connections.some((c) => c.id === 'forest|snow'), '正本に ない');
  assert.equal(G.connections.length, 15, 'connection は 15 本');
  assert.equal(G.connections.filter((c) => c.b).length, 14);
  // spot だけを ぜんぶ 見つけても、みちとしては 出て こない
  const every = {};
  for (const id of Object.keys(G.regions)) every[id] = W[id] ? W[id].spots.map((q) => q.id) : [];
  const found = M.worldLinksFrom(every);
  assert.ok(!found.includes('forest|snow'), 'はっけん できる みちにも ない');
  assert.equal(found.length, 14);
  // 地図にも 線が 出ない(りょうはしの 地域を 見つけて いても)
  const wd = M.worldMapData({ regions: ['forest', 'snow', 'mountain'], links: found, marks: {}, zones: {} });
  assert.ok(!wd.links.some((l) => l.id === 'forest|snow'), '地図に ゴーストの 線が ない');
});

test('A2. もり → やま → ゆきぐに が 正式な みちに なる。ゆきぐには やま だけ', () => {
  const { G } = setup();
  const adj = {};
  for (const c of G.connections) { if (!c.b) continue; (adj[c.a] ||= []).push(c.b); (adj[c.b] ||= []).push(c.a); }
  assert.equal(adj.snow.sort().join(','), 'mountain', 'ゆきぐには やま だけ');
  assert.equal(adj.forest.slice().sort().join(','), 'countryside,home,mountain');
  // もり → ゆきぐに は やま を かならず とおる
  const path = (() => {
    const q = [['forest']], seen = new Set(['forest']);
    while (q.length) { const p = q.shift(); if (p[p.length - 1] === 'snow') return p;
      for (const n of adj[p[p.length - 1]] || []) if (!seen.has(n)) { seen.add(n); q.push([...p, n]); } }
    return null;
  })();
  assert.equal(path.join(' -> '), 'forest -> mountain -> snow');
});

test('A3. 探索率の link ぶんぼは 正本から 13。ふるい セーブに のこって いても こわれない', () => {
  const { M } = setup();
  const C = M.worldCountable();
  assert.equal(C.links.length, 13, 'もり|ゆきぐに を けした ぶん 14 → 13');
  assert.ok(!C.links.includes('forest|snow'));
  // ぶんぼは いつも 正本から かぞえる。ふるい id は しずかに むしされる
  const stale = { regions: ['home', 'forest', 'snow', 'mountain'],
    links: ['forest|snow', 'home|forest', 'forest|mountain', 'snow|mountain'], marks: {}, zones: {} };
  const wd = M.worldMapData(stale);
  assert.equal(wd.progress.linkTotal, 13);
  assert.equal(wd.progress.links, 3, 'ふるい forest|snow は かぞえない(3 本)');
  assert.ok(Number.isFinite(wd.progress.percent) && wd.progress.percent >= 0 && wd.progress.percent <= 100);
  assert.ok(!wd.links.some((l) => l.id === 'forest|snow'));
  // 100% が ちゃんと 100% の まま
  const all = M.worldCountable();
  const zones = {}; for (const id of all.regions) zones[id] = M.WORLDS[id].zones.map((z) => z.id);
  const marks = {}; for (const id of all.regions) marks[id] = M.worldTier1(id).map((m) => m.mid);
  assert.equal(M.worldMapData({ regions: all.regions, links: all.links, marks, zones }).progress.percent, 100);
});

test('A4. みちを けしても region の なかみは 1 つも かわって いない', () => {
  const { M, W } = setup();
  let spots = 0, paths = 0, zones = 0, secret = 0;
  for (const id of Object.keys(W)) {
    const w = W[id];
    spots += w.spots.length; paths += w.paths.length; zones += w.zones.length;
    secret += w.spots.filter((q) => q.secret).length + w.paths.filter((q) => q[2] === 'secret').length;
  }
  assert.equal(spots, 471); assert.equal(paths, 654); assert.equal(zones, 118); assert.equal(secret, 107);
  // もと mouth だった spot は ふつうの spot として のこる(spot は けして いない)
  assert.ok(M.WORLDS.forest.spots.some((q) => q.id === 'anc1'));
  assert.ok(M.WORLDS.snow.spots.some((q) => q.id === 'pines'));
  assert.equal(M.worldCountable().zones, 103);
});

// ──────────────────────────────────────────────── B. 1 spot 複数 gate

// bigtree に 2 本目の あるく 出口を さしこんだ harness。**正本には 入れて いない**。
// Phase 3B-1 で ほんとうに 入れる かたちを、そのまま ここで ためす
function twoGateHome() {
  const ctx = setup();
  const { G } = ctx;
  G.connections.push({ id: 'home|river_lake', mouths: { home: 'bigtree', river_lake: 'riverside' },
    a: 'home', b: 'river_lake', kind: 'terrace', layer: 'ground', made: 'people', label: 'だんきゅうをおりるみち',
    ends: ['奥', '口'],
    gate: { kind: 'walk', ends: {
      home: { spot: 'bigtree', dir: 'far', bearing: { x: 1, z: 1 }, priority: 1, land: ['だんきゅうのふち', 'さかみち', 'かわら'] },
      river_lake: { spot: 'riverside', dir: 'near', bearing: { x: 0, z: -1 }, land: ['かわぎし', 'さかみち', 'だんきゅう'] } } },
    transition: ['おおきなき', 'だんきゅうのふち', 'さかみち', 'かわらの いしはら', 'かわぎしのひろば'] });
  return ctx;
}

test('B1. regionGates は priority → id の きまった じゅんで かえす(データの じゅんに よらない)', () => {
  const { M, G, W } = twoGateHome();
  const asIs = M.regionGates('home', W.home).map((g) => g.id);
  assert.equal(asIs.join(','), 'home|forest,home|river_lake', 'priority 0 が さき');
  // 正本の ならびを ひっくりかえしても、かえって くる じゅんは かわらない
  const i = G.connections.findIndex((c) => c.id === 'home|forest');
  const j = G.connections.findIndex((c) => c.id === 'home|river_lake');
  [G.connections[i], G.connections[j]] = [G.connections[j], G.connections[i]];
  assert.equal(M.regionGates('home', W.home).map((g) => g.id).join(','), asIs.join(','));
});

test('B2. 1 つの spot に 出口が 2 つ あっても、両方 もてる', () => {
  const { M, W } = twoGateHome();
  const sim = M.createSimulation({ regionId: 'home', discovered: [] });
  const at = sim.gatesAt('bigtree');
  assert.equal(at.length, 2, 'おおきなきに 出口が 2 つ');
  assert.equal(at.map((g) => g.to).sort().join(','), 'forest,river_lake');
  for (const g of at) { assert.ok(g.bearing, g.id + ' は bearing を もつ'); assert.equal(g.spot.id, 'bigtree'); }
  assert.ok(W.home.spots.some((q) => q.id === 'bigtree'), 'spot は 1 つの まま(ふやして いない)');
});

test('B3. どちらへ 出るかは いち と むきで きまる。**配列の じゅんばんに よらない**', () => {
  const { M } = setup();
  const spot = { id: 'bigtree', x: 0, z: 2600, r: 160 };
  const A = { id: 'home|forest', kind: 'walk', out: 'far', spot, bearing: { x: -0.7071, z: 0.7071 }, priority: 0 };
  const B = { id: 'home|river_lake', kind: 'walk', out: 'far', spot, bearing: { x: 0.7071, z: 0.7071 }, priority: 1 };
  const at = (x, mx) => ({ x, z: 2600, mx, mz: 1, kind: 'walk' });
  // 6 とおりの ならびを ぜんぶ ためす(2 本なので 2 とおり)
  for (const list of [[A, B], [B, A]]) {
    assert.equal(M.resolveGate(list, at(-80, -0.7)).id, 'home|forest', 'にしへ よれば もり');
    assert.equal(M.resolveGate(list, at(80, 0.7)).id, 'home|river_lake', 'ひがしへ よれば かわ');
    assert.equal(M.resolveGate(list, at(0, 0)).id, 'home|forest', 'まっすぐなら priority の ひくい ほう');
  }
});

test('B4. むきでも priority でも きまらない ときは わざと えらばない', () => {
  const { M } = setup();
  const spot = { id: 'x', x: 0, z: 100, r: 100 };
  const A = { id: 'a|b', kind: 'walk', out: 'far', spot, bearing: { x: -1, z: 1 }, priority: 0 };
  const B = { id: 'a|c', kind: 'walk', out: 'far', spot, bearing: { x: 1, z: 1 }, priority: 0 };
  const straight = { x: 0, z: 100, mx: 0, mz: 1, kind: 'walk' };
  assert.equal(M.resolveGate([A, B], straight), null, 'まん中で まっすぐなら えらばない');
  assert.equal(M.resolveGate([B, A], straight), null, 'ならびを かえても おなじ');
  // すこし よこへ ずれれば きまる
  assert.equal(M.resolveGate([A, B], { x: 40, z: 100, mx: 0.5, mz: 1, kind: 'walk' }).id, 'a|c');
  assert.equal(M.resolveGate([B, A], { x: -40, z: 100, mx: -0.5, mz: 1, kind: 'walk' }).id, 'a|b');
});

test('B5. 出口が 1 つの ときは これまでどおり。bearing が なくても うごく', () => {
  const { M } = setup();
  const spot = { id: 'x', x: 0, z: 100, r: 100 };
  const only = { id: 'a|b', kind: 'walk', out: 'far', spot, bearing: null, priority: 0 };
  assert.equal(M.resolveGate([only], { x: 0, z: 100, mx: 0, mz: 1, kind: 'walk' }).id, 'a|b');
  // 外へ むかって いない / まだ とどいて いない ときは 出ない
  assert.equal(M.resolveGate([only], { x: 0, z: 100, mx: 0, mz: -1, kind: 'walk' }), null, 'ぎゃくむきでは 出ない');
  assert.equal(M.resolveGate([only], { x: 0, z: 0, mx: 0, mz: 1, kind: 'walk' }), null, 'てまえでは 出ない');
  assert.equal(M.resolveGate([], { x: 0, z: 100, mx: 0, mz: 1, kind: 'walk' }), null);
  assert.equal(M.resolveGate(null, {}), null);
});

test('B6. じっさいに あるいて、にしなら もり・ひがしなら かわへ 出る', () => {
  const { M } = twoGateHome();
  const sim = M.createSimulation({ regionId: 'home', discovered: [] });
  const [forest, river] = ['forest', 'river_lake'].map((to) => sim.gatesAt('bigtree').find((g) => g.to === to));
  sim.enterRegion('home', { at: 'gate' });
  assert.equal(walkOut(sim, forest, -0.8).to, 'forest', 'にしへ よって あるくと もりへ');
  sim.enterRegion('home', { at: 'gate' });
  assert.equal(walkOut(sim, river, 0.8).to, 'river_lake', 'ひがしへ よって あるくと かわへ');
});

test('B7. 1 かいの よこぎりで gate は 1 どだけ(演出の 二じゅう はじまり なし)', () => {
  const { M } = twoGateHome();
  const sim = M.createSimulation({ regionId: 'home', discovered: [] });
  const river = sim.gatesAt('bigtree').find((g) => g.to === 'river_lake');
  sim.enterRegion('home', { at: 'gate' });
  sim.setPlayer(river.spot.x + 72, river.spot.z);
  let fired = 0;
  for (let i = 0; i < 360; i++) for (const ev of sim.step(1 / 60, { x: 0.8, y: -1 })) if (ev.type === 'gate') fired++;
  assert.equal(fired, 1, 'おしつづけても 1 どだけ');
});

test('B8. ride の 出口は 1 つの spot に 1 本まで(ボタンを ふやさない ための ルール)', () => {
  const { M, G, W } = setup();
  const seen = {};
  for (const c of G.connections) {
    if (!c.gate || !c.gate.ends || c.gate.kind === 'walk') continue;
    for (const [rid, e] of Object.entries(c.gate.ends)) {
      const k = rid + '.' + e.spot;
      assert.ok(!seen[k], `${k} に ride の 出口が 2 つ ある(${seen[k]} と ${c.id})`);
      seen[k] = c.id;
    }
  }
  assert.equal(Object.keys(seen).length, 6, 'ふね 2 / もぐる 2 / ゴンドラ 2');
  // あるく 出口の うえでは「のる」は 出ない
  const sim = M.createSimulation({ regionId: 'home', discovered: [] });
  const bigtree = W.home.spots.find((q) => q.id === 'bigtree');
  sim.setPlayer(bigtree.x, bigtree.z); sim.step(1 / 60, { x: 0, y: 0 });
  assert.equal(sim.gateHere(), null, 'あるく 出口では context action を 出さない');
});

// ──────────────────────────────────────────────── C. こわして いない こと

test('C1. これまでの 出口は そのまま。おうち → もり → いなか が あるける', () => {
  const { M } = setup();
  const sim = M.createSimulation({ regionId: 'home', discovered: [] });
  assert.equal(sim.gates.length, 1, 'おうちの 出口は いまも 1 つ');
  const g = sim.gates[0];
  assert.equal(g.id, 'home|forest'); assert.equal(g.way, 'walk');
  assert.equal(walkOut(sim, g).to, 'forest');
  sim.enterRegion('forest', { at: 'entry' });
  const toCountry = sim.gates.find((q) => q.to === 'countryside');
  assert.equal(walkOut(sim, toCountry).to, 'countryside');
});

test('C2. きめられた 出口 いがいからは 外へ 出られない(おうち ぜんぶの spot)', () => {
  const { M, W } = setup();
  const sim = M.createSimulation({ regionId: 'home', discovered: [] });
  const gateSpots = new Set(sim.gates.map((g) => g.spot.id));
  let fired = 0;
  for (const q of W.home.spots) {
    if (q.secret || gateSpots.has(q.id)) continue;
    for (const v of [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: 1, y: 0 }, { x: -1, y: 0 }]) {
      sim.setPlayer(q.x, q.z);
      for (let i = 0; i < 90; i++) for (const ev of sim.step(1 / 60, v)) if (ev.type === 'gate') fired++;
    }
  }
  assert.equal(fired, 0);
});

test('C3. 「たび」は 無変更。けした みちの さきへも たびでは 行ける', () => {
  const { h, s } = setup();
  assert.equal(typeof h.api.travelToRegion, 'function');
  for (const id of ['snow', 'forest', 'mountain']) {
    h.api.travelToRegion(h.api.REGIONS.find((r) => r.id === id), { id });
    assert.equal(s.regionId, id);
  }
});

test('C4. Fog: 見つけて いない 地域・みち・特殊移動は 1 つも もれない', () => {
  const { M } = setup();
  const wd = M.worldMapData({ regions: ['home'], links: [], marks: {}, zones: {} });
  assert.equal(wd.regions.map((r) => r.id).join(','), 'home', '見つけた 地域しか 出て こない');
  assert.equal(wd.links.length, 0, 'みちの 線は 1 本も 出ない');
  assert.equal(wd.axis.sky.on, false); assert.equal(wd.axis.deep.on, false);
  for (const r of wd.rim) for (const n of r.near) assert.equal(n, 'home', '外縁も 見つけた 地域しか ささない');
  assert.equal(wd.layers.sky, false); assert.equal(wd.layers.deep, false); assert.equal(wd.layers.memory, false);
  const dump = JSON.stringify(wd);
  for (const id of ['snow', 'jungle', 'deepsea', 'star_stop', 'memory_lake']) {
    assert.ok(!dump.includes(id), id + ' は 見つける まで もれない');
  }
});

test('C5. なかまは ついてくる。住民は だぶらない', () => {
  const { h, s, M } = setup();
  s.lifetime.companionsRecruited = ['shiba'];
  s.companions = [{ id: 'shiba', bond: 80 }];
  const sim = M.createSimulation({ regionId: 'home', discovered: [] });
  for (let i = 0; i < 120; i++) sim.step(1 / 60, { x: 0, y: -1 });
  const v = sim.view();
  assert.ok(v.party.length >= 1, 'なかまが いる');
  for (const a of v.party) assert.ok(sim.dist(a, v.player) < 400, a.key + ' は そばに いる');
  const keys = v.residents.map((a) => a.key);
  assert.equal(new Set(keys).size, keys.length, '住民の key が だぶって いない');
});
