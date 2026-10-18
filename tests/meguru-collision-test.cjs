// めぐるの あたりはんてい(collision)。
// 見て「通れなさそう」な ものは 通れず、「通れそう」な ものは 通れる ことと、
// どんなに かたくても 道・スポットは ぜったいに ふさがない ことを みる。
// かたちは world たんい(円/箱 + むき + やくわり)で もつ ので Three.js も 住民も おなじ データを つかえる。
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');

const REGIONS = ['home', 'city', 'countryside', 'forest', 'mountain', 'snow', 'sea', 'deepsea', 'river_lake', 'jungle', 'desert', 'star_stop', 'memory_lake'];
const BODY = 22;

function setup() {
  const h = harness({ fullDisplay: true });
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, energy: 100, health: 100, hunger: 80, speciesLine: 'dog', stageIndex: 4, ageTicks: 500 });
  s.petKey = `dog:${h.api.currentFormStageIndex()}`;
  s.discoveredStages = [s.petKey, 'cat:2', 'penguin:3', 'salmon:5', 'sakura:6', 'dragon:7', 'ghost:1', 'mushroom:0', 'beetle:0'];
  h.api.render();
  return h.api.meguruMod;
}
// めあてへ じっさいに あるく(テレポートしない)
function walkTo(sim, t, steps = 4000) {
  for (let i = 0; i < steps; i++) {
    const dx = t.x - sim.player.x, dz = t.z - sim.player.z, d = Math.hypot(dx, dz) || 1;
    if (d < Math.max(40, (t.r || 60) * 0.5)) return true;
    sim.step(1 / 60, { x: dx / d, y: -dz / d });
  }
  return false;
}
const M = setup();
const worlds = new Map(REGIONS.map((id) => [id, M.buildWorld(id, M.buildRegistry(), {})]));

test('the collider table is world-space data: shape, half sizes, angle and role, never canvas pixels', () => {
  for (const id of REGIONS) {
    const w = worlds.get(id);
    assert.ok(w.obstacles.length > 0, `${id}: the region has colliders`);
    for (const o of w.obstacles) {
      assert.ok(o.shape === 'circle' || o.shape === 'box', `${id}/${o.kind}: shape is circle or box`);
      assert.ok(o.hw > 0 && o.hd > 0, `${id}/${o.kind}: half sizes are positive`);
      assert.ok(Number.isFinite(o.ang), `${id}/${o.kind}: the angle is a number`);
      assert.ok(['solid', 'water', 'boundary'].includes(o.role), `${id}/${o.kind}: role is one of solid / water / boundary`);
      assert.ok(o.r >= Math.max(o.hw, o.hd) - 0.001, `${id}/${o.kind}: r is the bounding circle`);
    }
  }
});

test('a tree stops you at the trunk, not at a leaf: the collider is a small part of the drawing', () => {
  const size = 600;
  for (const kind of ['bigtrunk', 'parktree', 'riverwood', 'mistwood', 'bluetree', 'palmgrove', 'pinewall']) {
    const c = M.colliderOf({ solid: true, struct: kind, size });
    assert.ok(c, `${kind}: a tree is solid`);
    assert.ok(c.hw <= size * 0.18, `${kind}: the trunk is at most 18% of the drawing (${(c.hw / size).toFixed(2)})`);
  }
  // 大木は 木の え の はばが 600 でも、みきは 200 ぐらいしか ない
  const big = M.colliderOf({ solid: true, struct: 'bigtrunk', size: 800 });
  assert.ok(big.hw * 2 < 300, 'the trunk of a 800-wide big tree is under 300 across');
});

test('buildings, walls and fences are boxes with a facing, and a fence is a thin line not a slab', () => {
  const size = 400;
  for (const kind of ['building', 'house', 'farmhouse', 'barn', 'ruinwall', 'alleywall', 'shopblock']) {
    const c = M.colliderOf({ solid: true, struct: kind, size, ang: 0.4 });
    assert.equal(c.shape, 'box', `${kind}: a building body is a box`);
    assert.equal(c.ang, 0.4, `${kind}: the box keeps the facing of the prop`);
  }
  for (const kind of ['woodfence', 'snowfence', 'fencerail', 'guardrail', 'fence']) {
    const c = M.colliderOf({ solid: true, struct: kind, size, ang: 0 });
    assert.equal(c.shape, 'box', `${kind}: a fence is a box`);
    assert.ok(c.hd <= c.hw * 0.25, `${kind}: a fence is a thin line along its run, not a slab`);
  }
});

test('grass, leaves, small mushrooms, ground detail and bridges have no collider at all', () => {
  for (const kind of ['fern', 'reed', 'reedclump', 'ricestalk', 'crop', 'vine', 'bigleaf', 'hugeleaf', 'palmfrond',
    'branch', 'kelp', 'mushroomcluster', 'planter', 'parasol', 'dune', 'sandcrest', 'snowdrift', 'cloudwisp', 'scree', 'crosswalk']) {
    assert.equal(M.colliderOf({ solid: true, struct: kind, size: 300 }), null, `${kind}: scenery you can walk through`);
  }
  // はし・さんばし は わたれないと こまる
  for (const kind of ['woodbridge', 'ropebridge', 'lightbridge', 'pier']) {
    assert.equal(M.colliderOf({ solid: true, struct: kind, size: 300 }), null, `${kind}: a bridge stays walkable`);
  }
  // 絵文字の 花・こものも 通れる
  for (const e of ['🌷', '🌼', '🐾', '🧣', '🪺', '🔭', '🎣', '☁️', '🌿', '🍄']) {
    assert.equal(M.colliderOf({ solid: true, emoji: e, size: 160 }), null, `${e}: small scenery you can walk through`);
  }
  // 絵文字の たてもの・大木・岩は かたい
  for (const e of ['🏢', '🏠', '🌳', '🌲', '🪨', '🪸']) {
    assert.ok(M.colliderOf({ solid: true, emoji: e, size: 160 }), `${e}: a building, a big tree or a rock is solid`);
  }
});

test('every path corridor and every spot centre is free of colliders in all 13 regions', () => {
  for (const id of REGIONS) {
    const w = worlds.get(id);
    for (const sg of w.segments) {
      const n = Math.max(2, Math.ceil(sg.len / 20));
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = sg.a.x + (sg.b.x - sg.a.x) * t, z = sg.a.z + (sg.b.z - sg.a.z) * t;
        assert.ok(!M.collidesAt(w, x, z, BODY), `${id}: the path ${sg.a.id}|${sg.b.id} stays open at t=${t.toFixed(2)}`);
      }
    }
    for (const sp of w.spots) assert.ok(!M.collidesAt(w, sp.x, sp.z, BODY), `${id}/${sp.id}: you can stand in the middle of the spot`);
  }
});

test('walking for real, every spot in every region is still reachable, secret ones included', () => {
  let spots = 0, secrets = 0;
  for (const id of REGIONS) {
    const sim = M.createSimulation({ regionId: id, discovered: [] });
    const w = sim.world;
    const adj = new Map(w.spots.map((s) => [s.id, []]));
    for (const sg of w.segments) { adj.get(sg.a.id).push(sg.b); adj.get(sg.b.id).push(sg.a); }
    const start = w.spots[0], seen = new Set([start.id]), order = [], q = [start], from = new Map();
    while (q.length) { const c = q.shift(); order.push(c); for (const nb of adj.get(c.id)) if (!seen.has(nb.id)) { seen.add(nb.id); from.set(nb.id, c); q.push(nb); } }
    assert.equal(seen.size, w.spots.length, `${id}: the spot graph itself is connected`);
    const reached = new Set([start.id]);
    for (const sp of order.slice(1)) {
      const par = from.get(sp.id);
      sim.setPlayer(par.x, par.z);
      assert.ok(walkTo(sim, sp), `${id}/${sp.id}: you can walk there from ${par.id}`);
      reached.add(sp.id);
    }
    spots += w.spots.length;
    secrets += w.spots.filter((s) => s.secret).length;
  }
  assert.equal(spots, 471, 'all 471 spots were walked to (Phase 2 added the mountain path and the gondola landing)');
  assert.equal(secrets, 50, 'all 50 secret spots were among them');
});

test('you cannot walk into a big tree, a building, a rock or a fence', () => {
  for (const id of REGIONS) {
    const sim = M.createSimulation({ regionId: id, discovered: [] });
    const w = sim.world;
    const big = w.obstacles.filter((o) => o.r > 55).sort((a, b) => b.r - a.r).slice(0, 20);
    for (const o of big) for (const ang of [0.2, 1.25, 2.3, 3.3, 4.4, 5.45]) {
      const sx = o.x + Math.sin(ang) * (o.r + 110), sz = o.z + Math.cos(ang) * (o.r + 110);
      sim.setPlayer(sx, sz);
      if (Math.hypot(sim.player.x - sx, sim.player.z - sz) > 1) continue;       // 世界の そとに なった
      if (M.collidesAt(w, sim.player.x, sim.player.z, BODY)) continue;          // すでに なかの 出発は みない
      for (let i = 0; i < 120; i++) {
        sim.step(1 / 60, { x: -Math.sin(ang), y: Math.cos(ang) });
        const pen = M.colliderPenetration(o, sim.player.x, sim.player.z, BODY);
        assert.ok(pen < BODY * 0.5, `${id}/${o.kind}: you are stopped at the surface, you do not go inside (${pen.toFixed(1)})`);
      }
    }
  }
});

test('a diagonal bump slides along the wall instead of stopping dead', () => {
  let tried = 0, slid = 0;
  for (const id of REGIONS) {
    const sim = M.createSimulation({ regionId: id, discovered: [] });
    for (const o of sim.world.obstacles.filter((q) => q.shape === 'box' && q.r > 60).slice(0, 20)) {
      const ex = Math.sin(o.ang), ez = Math.cos(o.ang), nx = ez, nz = -ex;
      const sx = o.x + nx * (o.hd + 90), sz = o.z + nz * (o.hd + 90);
      sim.setPlayer(sx, sz);
      if (M.collidesAt(sim.world, sim.player.x, sim.player.z, BODY)) continue;
      const p0 = { x: sim.player.x, z: sim.player.z };
      const vx = (-nx + ex) / Math.SQRT2, vz = (-nz + ez) / Math.SQRT2;
      for (let i = 0; i < 90; i++) sim.step(1 / 60, { x: vx, y: -vz });
      tried++;
      if (Math.abs((sim.player.x - p0.x) * ex + (sim.player.z - p0.z) * ez) > 50) slid++;
    }
  }
  assert.ok(tried > 40, 'there are enough angled walls to test');
  assert.ok(slid / tried > 0.7, `most diagonal bumps slide along the wall (${slid}/${tried})`);
});

test('water: the sea you may not enter is the only no-go water, and every water spot is still walkable', () => {
  // うみの ある 地域は みずぎわで とまる(clampToWorld)
  for (const id of ['sea', 'memory_lake']) {
    const w = worlds.get(id);
    if (!w.terrain || w.terrain.kind !== 'coast') continue;
    const z = w.len * 0.5, sx = M.shoreX(w, z);
    const pt = { x: sx + w.terrain.side * -2000, z };
    M.clampToWorld(pt, w);
    assert.ok(w.terrain.side < 0 ? pt.x >= sx : pt.x <= sx, `${id}: you cannot walk out into the open sea`);
  }
  // かわ・みずうみ・しんかいの みぞ は「みちが わたって いる」ので あるける まま
  for (const id of ['river_lake', 'deepsea']) {
    const w = worlds.get(id);
    for (const sp of w.spots.filter((s) => s.kind === 'water')) {
      assert.ok(!M.collidesAt(w, sp.x, sp.z, BODY), `${id}/${sp.id}: a water spot the paths reach stays walkable`);
    }
  }
  // 景色の みずたまり は role=water で、やくわりとして 区別できる
  let pools = 0;
  for (const id of REGIONS) pools += worlds.get(id).obstacles.filter((o) => o.role === 'water').length;
  assert.ok(pools > 0, 'scenery pools are tagged role=water, not lumped in with rocks');
});

test('collision cost does not grow with the size of the world: the grid keeps each lookup tiny', () => {
  for (const id of REGIONS) {
    const w = worlds.get(id);
    const g = w.collision;
    assert.ok(g && g.cells, `${id}: the region has a collision grid`);
    let used = 0, sum = 0, max = 0;
    for (const c of g.cells) { if (!c) continue; used++; sum += c.length; max = Math.max(max, c.length); }
    assert.ok(used > 0, `${id}: the grid has content`);
    assert.ok(sum / used < 12, `${id}: a cell holds a handful of shapes on average (${(sum / used).toFixed(1)})`);
    assert.ok(max <= 40, `${id}: even the busiest cell is small (${max})`);
    // 8805 の けしきを まいフレーム ぜんぶ しらべる、には なって いない
    const anywhere = M.collidersAt(w, w.entry.x, w.entry.z);
    assert.ok(anywhere.length < w.obstacles.length, `${id}: a lookup returns a cell, not the whole region`);
  }
});

test('residents are held by the same colliders as the player, so nobody walks through a wall', () => {
  const sim = M.createSimulation({ regionId: 'forest', discovered: [] });
  const w = sim.world;
  const a = w.residents.find((r) => !r.fixed && !r.plant && !r.water);
  if (!a) return;
  const o = w.obstacles.filter((q) => q.r > 60)[0];
  if (!o) return;
  // かべの そとに おいて、なかへ むかわせる
  a.x = o.x + (o.r + 90); a.z = o.z;
  a.behavior = 'walk'; a.until = 60; a.tx = o.x - o.r; a.tz = o.z;
  for (let i = 0; i < 400; i++) { a.behavior = 'walk'; a.until = 60; a.tx = o.x - o.r; a.tz = o.z; M.updateActor(a, 1 / 60, {}, w, w.residents); }
  assert.ok(M.colliderPenetration(o, a.x, a.z, M.RULES.bodyRadius * 0.8) < M.RULES.bodyRadius * 0.5, 'the resident is stopped by the same wall the player is');
});

test('the role layers hand the same shapes to a Three.js renderer', () => {
  const L = M.worldLayers(worlds.get('forest'));
  assert.ok(L.obstacle.length > 0, 'the obstacle layer is not empty');
  for (const o of L.obstacle) {
    assert.ok(o.shape === 'circle' || o.shape === 'box', 'the exported shape is named');
    assert.ok(o.hw > 0 && o.hd > 0 && Number.isFinite(o.ang), 'the exported shape carries its size and facing');
    assert.ok(['solid', 'water', 'boundary'].includes(o.role), 'the exported shape carries its role');
  }
  assert.equal(L.obstacle.length, worlds.get('forest').obstacles.length, 'the layer is the same list the simulation uses');
});
