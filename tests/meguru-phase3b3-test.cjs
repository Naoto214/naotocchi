// めぐる Phase 3B-3: 山里・都市・海 2 本
//   `city|countryside`  countryside.terracelook ↔ city.cross4   (峠・ぶんすいかいを こえる かいどう)
//   `city|sea`          city.boatpier           ↔ sea.port      (みやこがわを くだって 河口の みなとへ)
// いちばん あつく みるのは「うみの 3 つの 出口(あるく / ふね / もぐる)が 混線しない」こと。
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
// いろいろな いち・8 むきから あるいて、どの 出口が ひらいたかを かぞえる
function sweep(M, rid, zs, xs) {
  const sim = M.createSimulation({ regionId: rid, discovered: [] });
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];
  const out = { none: 0 }, perSpot = {};
  for (const z of zs) for (const x of xs) for (const d of dirs) {
    sim.enterRegion(rid, {});
    sim.setPlayer(x, z);
    let hit = null;
    for (let i = 0; i < 300 && !hit; i++)
      for (const ev of sim.step(1 / 60, { x: d[0], y: d[1] })) if (ev.type === 'gate') hit = ev.gate;
    out[hit ? hit.to : 'none'] = (out[hit ? hit.to : 'none'] || 0) + 1;
    if (hit) { const k = hit.spot.id; (perSpot[k] ||= {})[hit.to] = (perSpot[k][hit.to] || 0) + 1; }
  }
  return { out, perSpot };
}

// ──────────────────────────────────────────────── 正本

test('1. 2 本に あるく 出口が ついた。connection は ふえて いない', () => {
  const { G } = setup();
  assert.equal(G.connections.length, 15, 'connection は 15 本の まま');
  assert.equal(G.connections.filter((c) => c.gate).length, 11, 'gate は 9 → 11');
  assert.equal(G.connections.filter((c) => c.b && !c.gate).map((c) => c.id).sort().join(','),
    'city|desert,countryside|river_lake,desert|mountain', '未実装は 5 → 3');
  for (const id of ['city|countryside', 'city|sea']) {
    const c = G.connections.find((q) => q.id === id);
    assert.equal(c.gate.kind, 'walk', id + ' は あるいて こえる');
    assert.ok(!c.special, id + ' に とくべつな のりものは ない');
  }
  // のりものは ふえて いない。ふねは ジャングルへの 1 本だけ
  const rides = G.connections.filter((c) => c.gate && c.gate.kind !== 'walk').map((c) => c.id + ':' + c.gate.kind);
  assert.equal(rides.sort().join(','), 'countryside|star_stop:vertical,deepsea|sea:vertical,jungle|sea:sea');
});

test('2. anchor は ぜんぶ 既存の 非秘密 spot。**新しい spot は 1 つも つくって いない**', () => {
  const { M, G, W } = setup();
  const want = { 'city|countryside': { countryside: 'terracelook', city: 'cross4' },
    'city|sea': { city: 'boatpier', sea: 'port' } };
  for (const [id, ends] of Object.entries(want)) {
    const c = G.connections.find((q) => q.id === id);
    for (const [rid, sid] of Object.entries(ends)) {
      assert.equal(c.gate.ends[rid].spot, sid, `${id} の ${rid} がわは ${sid}`);
      assert.equal(c.mouths[rid], sid, 'mouths と gate は おなじ spot');
      const q = W[rid].spots.find((x) => x.id === sid);
      assert.ok(q && !q.secret, `${rid}.${sid} は 既存の 非秘密 spot`);
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

// ──────────────────────────────────────────────── うみの 3 つの 出口

test('3. うみ: あるく(みなと) / ふね(ぼうはてい) / もぐる(どうくつ) が 混線しない', () => {
  const { M } = setup();
  const sim = M.createSimulation({ regionId: 'sea', discovered: [] });
  const at = {};
  for (const g of sim.gates) at[g.spot.id] = g.to + ':' + g.kind;
  assert.equal(JSON.stringify(at),
    JSON.stringify({ port: 'city:walk', seacave: 'deepsea:vertical', breakwater: 'jungle:sea' }));
  for (const g of sim.gates) assert.equal(sim.gatesAt(g.spot.id).length, 1, g.spot.id + ' の 出口は 1 本');
});

test('4. **うみで あるいて ふね・もぐるへ 出て しまう ことが ない**(8 むき 実測)', () => {
  const { M } = setup();
  const r = sweep(M, 'sea', [3600, 3800, 4000, 4200, 4400, 4600, 4800, 5000, 5200],
    [200, 450, 620, 800, 1000, 1100, 1200, 1340, 1600]);
  assert.equal(r.out.jungle || 0, 0, 'あるいて ジャングルへ 出た かい数');
  assert.equal(r.out.deepsea || 0, 0, 'あるいて しんかいへ 出た かい数');
  assert.ok((r.out.city || 0) > 0, 'みなとから まちへは ちゃんと 出られる');
  assert.equal(Object.keys(r.perSpot).join(','), 'port', 'あるいて 出られるのは みなと だけ');
});

test('5. ride ボタンは ぼうはてい / かいしょくどうくつ でしか 出ない', () => {
  const { M, W } = setup();
  const sim = M.createSimulation({ regionId: 'sea', discovered: [] });
  const ride = (x, z) => { sim.enterRegion('sea', {}); sim.setPlayer(x, z); sim.step(1 / 60, { x: 0, y: 0 });
    const g = sim.gateHere(); return g ? g.to + ':' + g.kind : null; };
  const q = (id) => W.sea.spots.find((s) => s.id === id);
  assert.equal(ride(q('port').x, q('port').z), null, 'みなとで「のる」は 出ない');
  assert.equal(ride(q('breakwater').x, q('breakwater').z), 'jungle:sea', 'ぼうはていでは ふね');
  assert.equal(ride(q('seacave').x, q('seacave').z), 'deepsea:vertical', 'かいしょくどうくつでは もぐる');
  // みなとの まわりを ぐるり
  for (const [dx, dz] of [[-200, 0], [200, 0], [0, -200], [0, 200], [-150, -150], [150, 150]])
    assert.equal(ride(q('port').x + dx, q('port').z + dz), null, 'みなとの まわりでも「のる」は 出ない');
});

// ──────────────────────────────────────────────── まちの 2 方向

test('6. まち: 山ごえの 出口(おおどおりのはし)と 河口の 出口(ふなつきば)が 誤発火しない', () => {
  const { M } = setup();
  const sim = M.createSimulation({ regionId: 'city', discovered: [] });
  const at = {};
  for (const g of sim.gates) at[g.spot.id] = g.to;
  assert.equal(JSON.stringify(at), JSON.stringify({ cross4: 'countryside', boatpier: 'sea' }));
  for (const g of sim.gates) assert.equal(sim.gatesAt(g.spot.id).length, 1);
  // むきが はんたい(山ごえは おくへ / 河口は 口へ)。よこも 2050 はなれて いる
  assert.equal(gateTo(sim, 'countryside').out, 'far', '山ごえは おくへ(たかいほう)');
  assert.equal(gateTo(sim, 'sea').out, 'near', '河口は 口へ(ひくいほう)');
  const r = sweep(M, 'city', [2000, 2600, 3000, 3400, 3650, 3900, 4200, 4550, 4900, 5200, 5600],
    [-1200, -600, 0, 600, 1200, 1800, 2050]);
  assert.equal(JSON.stringify(r.perSpot), JSON.stringify({ boatpier: { sea: 6 }, cross4: { countryside: 9 } }),
    'それぞれの spot からしか 出ない');
});

test('7. いなか: たなだのてんぼう(まち) / ちんじゅのもり(もり) / そらのりば(ほしぞら) が じゃましあわない', () => {
  const { M, W } = setup();
  const sim = M.createSimulation({ regionId: 'countryside', discovered: [] });
  const at = {};
  for (const g of sim.gates) at[g.spot.id] = g.to + ':' + g.kind;
  assert.equal(JSON.stringify(at),
    JSON.stringify({ terracelook: 'city:walk', woods: 'forest:walk', skyland: 'star_stop:vertical' }));
  for (const g of sim.gates) assert.equal(sim.gatesAt(g.spot.id).length, 1);
  const r = sweep(M, 'countryside', [3000, 3600, 4000, 4400, 4800, 5400, 6000, 6250, 6800, 7400],
    [-2000, -1200, -400, 400, 1150, 1500, 2350]);
  assert.equal(r.out.star_stop || 0, 0, 'あるいて ほしぞらへ 出る ことは ない(ゴンドラは ボタン)');
  assert.equal(JSON.stringify(r.perSpot), JSON.stringify({ terracelook: { city: 5 }, woods: { forest: 7 } }));
  // ゴンドラは そらのりば だけ
  const ride = (id) => { const q = W.countryside.spots.find((s) => s.id === id);
    sim.enterRegion('countryside', {}); sim.setPlayer(q.x, q.z); sim.step(1 / 60, { x: 0, y: 0 });
    const g = sim.gateHere(); return g ? g.to : null; };
  assert.equal(ride('skyland'), 'star_stop');
  assert.equal(ride('terracelook'), null);
  assert.equal(ride('woods'), null);
});

// ──────────────────────────────────────────────── 行って もどる

test('8. まち ⇄ いなか を 行って もどれる', () => {
  const { M } = setup();
  const a = M.createSimulation({ regionId: 'countryside', discovered: [] });
  const out = walkOut(a, gateTo(a, 'city'));
  assert.equal(out.to, 'city'); assert.equal(out.at, 'cross4');
  const b = M.createSimulation({ regionId: 'city', discovered: [] });
  const back = walkOut(b, gateTo(b, 'countryside'));
  assert.equal(back.to, 'countryside'); assert.equal(back.at, 'terracelook');
  assert.equal(out.enterFacing, Math.PI); assert.equal(back.enterFacing, Math.PI);
});

test('9. まち ⇄ うみ を 行って もどれる', () => {
  const { M } = setup();
  const a = M.createSimulation({ regionId: 'city', discovered: [] });
  const out = walkOut(a, gateTo(a, 'sea'));
  assert.equal(out.to, 'sea'); assert.equal(out.at, 'port');
  const b = M.createSimulation({ regionId: 'sea', discovered: [] });
  const back = walkOut(b, gateTo(b, 'city'));
  assert.equal(back.to, 'city'); assert.equal(back.at, 'boatpier');
  assert.equal(out.enterFacing, 0); assert.equal(back.enterFacing, 0);
});

test('10. **あるいて せかいが 1 つに つながる**: おうち → もり → いなか → まち → うみ', () => {
  const { M } = setup();
  const legs = [['home', 'forest'], ['forest', 'countryside'], ['countryside', 'city'], ['city', 'sea']];
  const route = ['home'];
  for (const [from, to] of legs) {
    const sim = M.createSimulation({ regionId: from, discovered: [] });
    const g = gateTo(sim, to);
    assert.ok(g, from + ' から ' + to + ' への 出口が ある');
    const hit = walkOut(sim, g, from === 'home' ? -0.8 : 0);
    assert.ok(hit, from + ' → ' + to);
    route.push(hit.to);
  }
  assert.equal(route.join(' -> '), 'home -> forest -> countryside -> city -> sea');
  // 徒歩だけの 連結成分が 1 つに なった(きおくのみずうみ を のぞく)
  const G = M.WORLD_GEOGRAPHY;
  const par = {}, find = (x) => (par[x] === x ? x : (par[x] = find(par[x])));
  for (const id of Object.keys(G.regions)) par[id] = id;
  for (const c of G.connections) if (c.gate) par[find(c.a)] = find(c.b);
  const comp = {};
  for (const id of Object.keys(G.regions)) (comp[find(id)] ||= []).push(id);
  const groups = Object.values(comp).map((v) => v.sort().join(',')).sort();
  // **わかれて いた 2 つ(生活圏 と うみの 3 つ)が ここで ひとつづきに なった。**
  // さばくは まだ 2 本とも 未実装(Phase 3B-4)なので はなれた まま。
  // きおくのみずうみは 地上の 出口を もたない
  assert.equal(groups.join(' / '),
    'city,countryside,deepsea,forest,home,jungle,mountain,river_lake,sea,snow,star_stop / desert / memory_lake');
  assert.equal(groups.length, 3, 'ひとつづき + さばく + きおくのみずうみ');
});

// ──────────────────────────────────────────────── 演出・UI・こわして いない こと

test('11. 1 かいの よこぎりで gate は 1 どだけ(演出の 二じゅう はじまり なし)', () => {
  const { M } = setup();
  for (const [rid, to] of [['countryside', 'city'], ['city', 'countryside'], ['city', 'sea'], ['sea', 'city']]) {
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

test('12. Phase 2.1 の しくみを そのまま つかう。gate 解決は 配列順に よらない', () => {
  const { M } = setup();
  for (const rid of ['city', 'countryside', 'sea']) {
    const sim = M.createSimulation({ regionId: rid, discovered: [] });
    for (const g of sim.gates.filter((q) => q.kind === 'walk')) {
      assert.equal(g.way, 'walk');
      const plan = M.transitionPlan(g);
      assert.equal(plan.phases.map((p) => p.id).join(','), 'approach,cross,arrive,settle');
      assert.ok(M.transitionPlan(g, { repeat: true }).total < plan.total);
    }
  }
  assert.equal(Object.keys(M.TRANSITION.ways).sort().join(','), 'down,sail,up,walk', 'way は ふやして いない');
  // resolveGate の きまりは そのまま
  const spot = { id: 'x', x: 0, z: 100, r: 100 };
  const A = { id: 'a|b', kind: 'walk', out: 'far', spot, bearing: { x: -0.707, z: 0.707 }, priority: 0 };
  const B = { id: 'a|c', kind: 'walk', out: 'far', spot, bearing: { x: 0.707, z: 0.707 }, priority: 1 };
  const at = (x, mx) => ({ x, z: 100, mx, mz: 1, kind: 'walk' });
  for (const list of [[A, B], [B, A]]) {
    assert.equal(M.resolveGate(list, at(-60, -0.7)).id, 'a|b');
    assert.equal(M.resolveGate(list, at(60, 0.7)).id, 'a|c');
    assert.equal(M.resolveGate(list, at(0, 0)).id, 'a|b');
  }
});

test('13. non-region terrain: 両がわ 6 段階。みやこがわは たにの おおかわと べつ水系', () => {
  const { G } = setup();
  for (const id of ['city|countryside', 'city|sea']) {
    const c = G.connections.find((q) => q.id === id);
    for (const [rid, e] of Object.entries(c.gate.ends)) {
      assert.ok(Array.isArray(e.land) && e.land.length === 6, `${id} の ${rid} がわは 6 段階`);
      assert.equal(new Set(e.land).size, 6, 'くりかえしなし');
      assert.ok(e.bearing, 'bearing を もつ(semantic data)');
    }
    const [x, y] = Object.values(c.gate.ends).map((e) => e.land);
    assert.notEqual(x.join(','), y.join(','), '行きと かえりは おなじ ならびでは ない');
  }
  // 峠・ぶんすいかいが ちゃんと 入って いる
  const cc = G.connections.find((q) => q.id === 'city|countryside');
  assert.ok(Object.values(cc.gate.ends).every((e) => e.land.some((q) => q.includes('ぶんすいかい'))),
    'りょうがわに ぶんすいかいが ある');
  // みやこがわ(庄内川型)であることが ことばで はっきりして いる
  const cs = G.connections.find((q) => q.id === 'city|sea');
  assert.ok(Object.values(cs.gate.ends).every((e) => e.land.some((q) => q.includes('みやこがわ'))),
    'りょうがわに みやこがわが ある(たにの おおかわでは ない)');
  for (const e of Object.values(cs.gate.ends))
    assert.ok(!e.land.some((q) => q.includes('たにのおおかわ')), 'たにの おおかわは まざって いない');
});

test('14. 探索率の ぶんぼは 1 つも 動いて いない(gate を つけただけ)', () => {
  const { M } = setup();
  const C = M.worldCountable();
  assert.equal(C.regions.length, 11); assert.equal(C.links.length, 13);
  assert.equal(C.tier1, 17); assert.equal(C.zones, 103);
  const every = {};
  for (const id of C.regions) every[id] = M.WORLDS[id].spots.map((q) => q.id);
  const found = M.worldLinksFrom(every);
  for (const id of ['city|countryside', 'city|sea']) assert.ok(found.includes(id));
  assert.equal(M.worldLinksFrom({ city: ['cross4'] }).length, 0, 'かたがわだけでは ひらかない');
});

test('15. きめられた 出口 いがいからは 外へ 出られない(まち・いなか・うみ ぜんぶの spot)', () => {
  const { M, W } = setup();
  for (const rid of ['city', 'countryside', 'sea']) {
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

test('16. Fog: いなかを 知った だけで まち・うみは もれない', () => {
  const { M } = setup();
  const wd = M.worldMapData({ regions: ['home', 'forest', 'countryside'],
    links: ['home|forest', 'countryside|forest'], marks: {}, zones: {} });
  assert.equal(wd.regions.map((r) => r.id).sort().join(','), 'countryside,forest,home');
  assert.equal(wd.links.map((l) => l.id).sort().join(','), 'countryside|forest,home|forest');
  const dump = JSON.stringify(wd);
  for (const id of ['city', 'sea', 'snow', 'mountain', 'river_lake', 'jungle', 'deepsea', 'star_stop', 'memory_lake'])
    assert.ok(!dump.includes(id), id + ' は もれない');
  assert.equal(M.worldMapData({ regions: ['city'], links: ['city|sea'], marks: {}, zones: {} }).links.length, 0,
    'りょうはしを 見つける まで 線は 出ない');
});

test('17. anchor は entry から みちを たどって 行ける。たび・なかま・住民も そのまま', () => {
  const { h, s, M, W } = setup();
  for (const [rid, entry, targets] of [
    ['city', 'station', ['cross4', 'boatpier']],
    ['countryside', 'gate', ['terracelook', 'woods', 'skyland']],
    ['sea', 'beach', ['port', 'breakwater', 'seacave']]]) {
    const reach = M.reachableSpots(W[rid], entry);
    for (const t of targets) assert.ok(reach.has(t), `${rid}: ${entry} → ${t} に みちが つながって いる`);
    const miss = W[rid].spots.filter((q) => !q.secret && !reach.has(q.id)).map((q) => q.id);
    assert.equal(miss.join(','), '', rid + ': とどかない 非秘密 spot');
  }
  assert.equal(typeof h.api.travelToRegion, 'function');
  for (const id of ['city', 'sea', 'countryside']) {
    h.api.travelToRegion(h.api.REGIONS.find((r) => r.id === id), { id });
    assert.equal(s.regionId, id);
  }
  s.lifetime.companionsRecruited = ['shiba'];
  s.companions = [{ id: 'shiba', bond: 80 }];
  for (const rid of ['city', 'sea', 'countryside']) {
    const sim = M.createSimulation({ regionId: rid, discovered: [] });
    for (let i = 0; i < 120; i++) sim.step(1 / 60, { x: 0, y: -1 });
    const v = sim.view();
    assert.ok(v.party.length >= 1, rid + ': なかまが いる');
    for (const a of v.party) assert.ok(sim.dist(a, v.player) < 400, rid + ': ' + a.key + ' は そばに いる');
    const keys = v.residents.map((a) => a.key);
    assert.equal(new Set(keys).size, keys.length, rid + ': 住民の key が だぶって いない');
  }
});
