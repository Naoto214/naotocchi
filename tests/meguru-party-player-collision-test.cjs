// なかま と player の すりぬけ(2026-09-30。docs/audit/meguru-collision-audit-2026-09-29.md の C1〜C4)
//
// ここで しばるのは
//   ・なかまは player・住人と おなじ あたり(moveWithCollision)で あるく。27 にんでも 障害物に めりこまない(あるく とき・とまる とき)
//   ・かたく 見える 物(大きな 建物・岩・崖・木の みき・柵・切り株・丸太)は 道の そばでも あたりが のこる(道の 面は ふさがない)
//   ・corridor の はしの いし: なかまも player と おなじ corridorBody で よける
//   ・ならびは くずれない・はなれすぎない(あしあとを たどって まわりこむ)。セーブに あしあとは のこらない
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');
const collisionAudit = require('../tools/audit/meguru-collision-audit.cjs');

const arr = (x) => Array.from(x || []);
function setup(n = 27, regionId = 'home') {
  const h = harness({ deterministic: true, fullDisplay: true });
  const M = h.api.meguruMod, s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, regionId });
  const comps = arr(h.api.normalCompanions).concat(arr(h.api.rareCompanions)).slice(0, n - 1);
  s.companions = comps.map((c) => ({ id: c.id, bond: 100 })); s.lifetime.companionsRecruited = comps.map((c) => c.id);
  const pc = arr(h.api.partnerCandidates)[0];
  s.partner = { id: pc.id, label: pc.label || pc.name, emoji: pc.emoji, affection: 100 }; s.lifetime.partnersRecorded = [pc.id];
  h.api.render();
  return { h, M, s };
}
const sim = (M, regionId) => M.createSimulation({ regionId, env: { time: 'day', weather: 'sunny', season: 'spring', region: regionId } });
const PARTY_R = (M) => M.RULES.bodyRadius * M.STAND_CLEAR;

// 監査と おなじ あるき方(90 frame ごとに むきを かえ、400 frame の うち 60 は とまる)
function wander(M, regionId, frames, each) {
  const S = sim(M, regionId);
  let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
  let dir = { x: 0, y: -1 };
  for (let f = 0; f < frames; f++) {
    if (f % 90 === 0) { const a = rnd() * Math.PI * 2; dir = { x: Math.sin(a), y: -Math.abs(Math.cos(a)) - 0.2 }; }
    S.step(1 / 60, f % 400 < 340 ? dir : { x: 0, y: 0 });
    each(S, f);
  }
  return S;
}

test('1. 27 にんの なかまは forest / mountain / city で あるいても とまっても 障害物に めりこまない(player と おなじ あたり)', () => {
  for (const regionId of ['forest', 'mountain', 'city']) {
    const { M } = setup(27, regionId), r = PARTY_R(M);
    let worst = 0, frames = 0, idleFrames = 0, far = 0;
    wander(M, regionId, 1600, (S) => {
      frames++; if (!S.player.moving) idleFrames++;
      for (const a of S.party) {
        worst = Math.max(worst, M.penetrationAt(S.world, a.x, a.z, r));
        far = Math.max(far, Math.hypot(a.x - S.player.x, a.z - S.player.z));
      }
    });
    assert.ok(idleFrames > 100, regionId + ': とまる 時間も ある');
    // なめらかに すべる とき の ふれあい(0.00x)は みない。0.5 を こえる めりこみは ない
    assert.ok(worst <= 0.5, `${regionId}: なかまの めりこみ ${worst.toFixed(2)}`);
    assert.ok(far < 900, `${regionId}: なかまは はなれすぎない ${far.toFixed(0)}`);
  }
});

test('2. player も まえと おなじ あたりで とまる(めりこまない)。なかまが いても player の あるく みちは かわらない', () => {
  const { M } = setup(27, 'city'), { M: M1 } = setup(1, 'city');
  let worst = 0;
  const trace = (MM) => { const out = []; wander(MM, 'city', 900, (S, f) => { if (MM === M) worst = Math.max(worst, M.penetrationAt(S.world, S.player.x, S.player.z, M.RULES.bodyRadius)); if (f % 100 === 0) out.push(Math.round(S.player.x) + ',' + Math.round(S.player.z)); }); return out.join(' '); };
  assert.equal(trace(M), trace(M1), 'なかまは player を とめない');
  assert.ok(worst <= 0.5, 'player の めりこみ ' + worst.toFixed(2));
});

test('3. かたく 見える 物には あたりが ある: fore の 岩・見はり小屋・柵、切り株・丸太・大岩、道ばたの 木と 建物', () => {
  const { M } = setup(1);
  for (const kind of ['stump', 'log', 'driftwood', 'bigrock', 'riverrock', 'hayroll', 'ledgerock', 'guardpost', 'fencerail'])
    assert.ok(M.colliderOf({ solid: true, struct: kind, size: 100 }), kind + ': あたりの かたちが ある');
  const reg = M.buildRegistry();
  const has = (regionId, pred) => M.buildWorld(regionId, reg, {}).props.filter(pred);
  // fore は かたい 3 種 だけ solid(草・花・葉は とおれる)
  for (const regionId of ['mountain', 'city']) {
    const fore = has(regionId, (p) => p.layer === 'fore');
    assert.ok(fore.some((p) => p.solid), regionId + ': fore に かたい 物が ある');
    for (const p of fore) assert.equal(!!p.solid, ['ledgerock', 'guardpost', 'fencerail'].includes(p.struct), regionId + '/' + p.struct);
  }
  // ちいさな 切り株・丸太も solid(deco は solid で ない まま)
  const small = has('forest', (p) => p.layer === 'struct' && ['stump', 'log'].includes(p.struct) && p.size <= 120);
  assert.ok(small.length > 0 && small.every((p) => p.solid), 'forest: 小さな 切り株・丸太も solid');
  // 道ばた(side)の 絵文字: 木・建物の ときは あたりが ある
  const side = has('mountain', (p) => p.layer === 'side' && p.emoji);
  assert.ok(side.length && side.every((p) => p.solid), 'mountain: 道ばたの 絵文字は solid(かたちは colliderOf が きめる)');
});

test('4. 道の 面は あいて いる: 道はばの 3/4 の なかは どこでも player(半径 22)が 立てる。はし(±half)の かすりは main(12)より ふえない(13 地域)', () => {
  const { M } = setup(1);
  const reg = M.buildRegistry();
  let edgeWorst = 0;
  for (const id of ['home', 'city', 'countryside', 'forest', 'mountain', 'snow', 'sea', 'deepsea', 'river_lake', 'jungle', 'desert', 'star_stop', 'memory_lake']) {
    const w = M.buildWorld(id, reg, {});
    let bad = 0, n = 0;
    for (const sg of w.segments) {
      const dx = sg.b.x - sg.a.x, dz = sg.b.z - sg.a.z, L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L;
      const steps = Math.max(2, Math.ceil(L / 40));
      for (let i = 0; i <= steps; i++) for (const u of [-1, -0.75, -0.5, 0, 0.5, 0.75, 1]) {
        const x = sg.a.x + dx * i / steps + nx * sg.half * u, z = sg.a.z + dz * i / steps + nz * sg.half * u;
        if (Math.abs(x) > w.halfW - 30 || z < 80 || z > w.len - 80) continue;   // 世界の はしは 地形の がわ
        let pen = 0;
        for (const o of w.obstacles) if (o.role === 'solid') pen = Math.max(pen, M.colliderPenetration(o, x, z, M.RULES.bodyRadius));
        if (Math.abs(u) === 1) { edgeWorst = Math.max(edgeWorst, pen); continue; }
        n++; if (pen > 0.5) bad++;
      }
    }
    assert.ok(n > 100, id + ': しらべた');
    assert.equal(bad, 0, `${id}: 道の なかに かかる かたい あたり ${bad}/${n}`);
  }
  // 道の はしで 箱の かどが かする のは まえ から(main 12)。ふやさない
  assert.ok(edgeWorst <= 12, '道の はしの かすり ' + edgeWorst.toFixed(1));
});

test('5. 道の そばの かたい 物: 絵の 中心部に player が 立てる 数が main の 半分 いか(道の 面の うえの 物は のぞく)', () => {
  const { M } = setup(1);
  // main(2026-09-30 05b31dfd)の 数字: forest 64 / mountain 145 / city 184(docs/qa の 表)
  const before = { forest: 64, mountain: 145, city: 184 };
  for (const regionId of Object.keys(before)) {
    const { rows, w } = collisionAudit.audit(regionId);
    let n = 0;
    for (const r of rows) {
      if (r.status === 'unreachable' || !['tree', 'building', 'rock/terrain', 'fence', 'landmark'].includes(r.cat)) continue;
      const f = collisionAudit.footprint(w, r.p);
      if (collisionAudit.outward(w, { x: f.x, z: f.z }).edge <= 0) continue;
      if (M.penetrationAt(w, f.x, f.z, 22) <= 0.5) n++;
    }
    assert.ok(n <= before[regionId] * 0.5, `${regionId}: 立てる 中心部 ${n}(main ${before[regionId]})`);
  }
});

test('6. corridor: なかまも player と おなじ corridorBody で はしの いしを よける。帯の そとへ 出ない・1 frame で とばない', () => {
  const { M } = setup(27);
  const party = arr(M.companionsOf(M.buildRegistry()));
  const r = PARTY_R(M);
  for (const id of ['home|forest', 'forest|mountain', 'city|sea']) {
    const spec = M.walkCorridorSpec(id), from = spec.a, e = spec.endpoints[from];
    party.forEach((a, k) => { a.x = e.x + (k % 5) * 12 - 24; a.z = e.z - 20 - Math.floor(k / 5) * 14; });
    const w = M.createCorridorWalk(spec, from, { firstVisit: false, party });
    const blockers = w.world.props.filter((p) => p.blocker);
    assert.ok(blockers.length > 0, id + ': はしの いしが ある');
    let deep = 0, jump = 0, prev = party.map((a) => [a.x, a.z]);
    for (let i = 0; i < 60 * 14 && w.state.s < spec.walkLength - 5; i++) {
      w.step(1 / 60, { x: i % 240 < 120 ? 0.6 : -0.6, y: -1 });
      party.forEach((a, k) => {
        jump = Math.max(jump, Math.hypot(a.x - prev[k][0], a.z - prev[k][1]));
        for (const b of blockers) if (24 + r - Math.hypot(a.x - b.x, a.z - b.z) > 20) deep++;   // tools/audit/meguru-corridor-depth.cjs と おなじ「ふかい」
      });
      prev = party.map((a) => [a.x, a.z]);
    }
    assert.ok(w.state.s >= spec.walkLength - 5, id + ': さいごまで あるける');
    assert.ok(deep <= 40, `${id}: なかまが いしに ふかく 入った のべ ${deep}`);
    assert.ok(jump <= 20, `${id}: 1 frame ${jump.toFixed(1)}`);
  }
});

test('7. まわりこみ: 生け垣の むこうに 取り残されない(ならびへ もどる)。あしあとは セーブに のこらない', () => {
  const { h, M } = setup(16, 'home'), S = sim(M, 'home');
  for (let i = 0; i < 360; i++) S.step(1 / 60, { x: 0, y: -1 });
  for (let i = 0; i < 180; i++) S.step(1 / 60, { x: 0, y: 0 });
  const y = S.camera.yaw;
  for (const a of S.party) {
    const dx = a.x - S.player.x, dz = a.z - S.player.z, back = dx * Math.sin(y) + dz * Math.cos(y);
    assert.ok(back > -25 && Math.hypot(dx, dz) < 420, `${a.key || a.id}: ならびに もどった ${back.toFixed(0)}`);
    assert.equal(a.behavior, 'idle', 'みんな とまって いる');
  }
  assert.ok(S.trail.length > 0, 'あしあとは メモリ だけ');
  h.api.saveState();
  const saved = JSON.stringify(h.api.state());
  assert.ok(!/"trail"|"blocked"|"lost"/.test(saved), 'セーブに あしあと・つまり の きろくは ない');
  // ワープ(setPlayer)で あしあとは けす(かべを こえた あしあとを たどらない)
  S.setPlayer(S.player.x + 30, S.player.z);
  assert.equal(S.trail.length, 0);
});

test('8. たて看板(建物・がけ)の あたりは もとの あたりの なかで 道がわを けずる だけ(見る むきで 見えない かべに ならない)', () => {
  const { M } = setup(1);
  const reg = M.buildRegistry();
  let n = 0;
  for (const regionId of ['city', 'mountain', 'sea', 'forest']) {
    const w = M.buildWorld(regionId, reg, {});
    for (const o of w.obstacles) {
      if (o.pi == null) continue;
      const p = w.props[o.pi];
      if (!p.struct || !M.OCCLUDER_SHIFT[p.struct]) continue;
      const c = M.colliderOf(p); n++;
      const ex = Math.sin(c.ang), ez = Math.cos(c.ang);
      const corners = o.shape === 'box'
        ? [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => [o.x + a * o.hw * Math.sin(o.ang) + b * o.hd * Math.cos(o.ang), o.z + a * o.hw * Math.cos(o.ang) - b * o.hd * Math.sin(o.ang)])
        : [[o.x + o.hw, o.z], [o.x - o.hw, o.z], [o.x, o.z + o.hw], [o.x, o.z - o.hw]];
      for (const [x, z] of corners) {
        const rx = x - p.x, rz = z - p.z, lx = rx * ex + rz * ez, lz = rx * ez - rz * ex;
        assert.ok(Math.abs(lx) <= c.hw + 1 && Math.abs(lz) <= c.hd + 1, `${regionId}/${p.struct}: あたりが もとの そとへ 出ない`);
      }
    }
  }
  assert.ok(n > 50, 'たて看板の あたりを しらべた ' + n);
});
