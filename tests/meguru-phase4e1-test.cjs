// Phase 4E-1 — あるける corridor の かたち と 状態(pure data)
// (docs/design/meguru-phase4e-continuous-corridor-world-2026-09-23.md §4〜§6・§16、
//  docs/handoff/meguru-phase4e1-corridor-geometry-2026-09-23.md)
//
// ここで しばるのは
//   ・walk の corridor 10 本 だけ(Phase 4C と 1 対 1)。ふね・ゴンドラ・もぐる・きおくのみずうみ は 入らない
//   ・長さ・段・むきの 変わりかた・幅・当たり判定の いみ・fallback・状態の かたち・handoff の 約束
//   ・かたちは global の 位置に あわせない(closure の のこりが 入らない)。むきだけ global と つながる
//   ・**この そうを まるごと 消しても ゲームの うごきが 1 ミリも 変わらない こと**
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { harness } = require('./helpers/runtime-harness.cjs');

// ちがう realm から くる ので、そのままでは Array / Object の はんてい が とおらない
const arr = (x) => Array.from(x || []);
const obj = (x) => Object.assign({}, x || {});

function setup(opts) {
  const h = harness(Object.assign({ fullDisplay: true }, opts || {}));
  const M = h.api.meguruMod;
  return { h, M, G: M.WORLD_GEOGRAPHY, W: M.WORLDS };
}
const specs = (M) => arr(M.walkCorridorSpecs());
const heading = (d) => ((Math.atan2(d.x, d.z) * 180 / Math.PI) + 360) % 360;
const angDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const deg = (rad) => ((rad * 180 / Math.PI) % 360 + 360) % 360;

const SRC = fs.readFileSync('meguru.js', 'utf8');
const strip4d2 = (src) => src.replace(/^[ \t]*\/\/ ====== Phase 4D-2:[\s\S]*?\/\/ ====== \/Phase 4D-2 ======\n/gm, '')
  // Phase 4E-2(home|forest を あるく PoC)も 印の ついた ブロックと 行だけ。4D-2 と いっしょに 消す
  .replace(/^[ \t]*\/\/ ====== Phase 4E-2:[\s\S]*?\/\/ ====== \/Phase 4E-2 ======\n/gm, '')
  .split('\n').filter((l) => !/\/\/ Phase 4D-2$|\/\/ Phase 4E-2$/.test(l)).join('\n')
  .replace(/ CONTINUOUS_WALK_ALLOWLIST,[^\n]*? createCorridorWalk,/, '')
  .replace(', get corridor() { return corridorInfo(); }, get corridorStats() { return corrStats; }', '');
// 4E-2(home|forest を あるく PoC)は 4E-1 の かたちを はじめて つかう そう。4E-1 を 消す ときは 4E-2 だけ いっしょに 消す(4D-2 は のこす)
const strip4e2 = (src) => src.replace(/^[ \t]*\/\/ ====== Phase 4E-2:[\s\S]*?\/\/ ====== \/Phase 4E-2 ======\n/gm, '')
  .split('\n').filter((l) => !/\/\/ Phase 4E-2$/.test(l)).join('\n')
  .replace(/ CONTINUOUS_WALK_ALLOWLIST,[^\n]*? createCorridorWalk,/, '')
  .replace(', get corridor() { return corridorInfo(); }, get corridorStats() { return corrStats; }', '');
function phase4e1Block() {
  const a = SRC.indexOf('// ====== Phase 4E-1:');
  const b = SRC.indexOf('// 世界地図に 出す 地域', a);
  assert.ok(a > 0 && b > a, 'Phase 4E-1 の ブロックが 見つかる');
  return SRC.slice(SRC.lastIndexOf('\n', a) + 1, SRC.lastIndexOf('\n', b) + 1);
}
const codeOnly = (src) => src.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const EXPORTS_4E1 = ['CORRIDOR_STAGE_WALK', 'CORRIDOR_WIDTH', 'CORRIDOR_TERRAIN_WIDTH', 'CORRIDOR_STATE_KEYS', 'walkCorridorSpecs',
  'walkCorridorSpec', 'orientWalkCorridor', 'corridorHeadingAt', 'corridorStageAt', 'corridorMode', 'makeCorridorState',
  'corridorEnterState', 'corridorExitPose'];
const WALK = ['snow|mountain', 'forest|mountain', 'mountain|river_lake', 'desert|mountain', 'countryside|forest',
  'home|forest', 'home|river_lake', 'city|countryside', 'city|sea', 'city|desert'];
const TERRAIN_KINDS = ['forest', 'field', 'road', 'slope', 'ridge', 'rock', 'river', 'shore', 'dry', 'snow', 'urban-edge'];

test('1. spec は walk の 10 本。Phase 4C の walk corridor と 1 対 1。special と きおくのみずうみ は 入らない', () => {
  const { M } = setup();
  const S = specs(M);
  assert.equal(S.length, 10);
  const walk4c = arr(M.worldCorridors()).filter((c) => c.kind === 'walk').map((c) => c.id).sort();
  assert.equal(S.map((s) => s.connectionId).sort().join(','), walk4c.join(','), 'Phase 4C の walk と おなじ 10 本');
  assert.equal(walk4c.join(','), WALK.slice().sort().join(','));
  for (const id of ['jungle|sea', 'countryside|star_stop', 'deepsea|sea']) assert.equal(M.walkCorridorSpec(id), null, id + ' は かたちを もたない');
  for (const s of S) {
    assert.ok(s.a !== 'memory_lake' && s.b !== 'memory_lake');
    assert.equal(s.kind, 'walk'); assert.equal(s.way, 'walk'); assert.equal(s.layer, 'ground');
    const c = arr(M.worldCorridors()).find((q) => q.id === s.connectionId);
    assert.equal(s.a, c.a); assert.equal(s.b, c.b); assert.equal(s.fromRegion, c.a); assert.equal(s.toRegion, c.b);
    assert.equal(s.travelLength, c.travelLength, 'いみの 長さは 4C の まま');
  }
  assert.equal(M.walkCorridorSpec('nowhere'), null);
  assert.equal(M.orientWalkCorridor(M.walkCorridorSpec('home|forest'), 'memory_lake'), null);
});

test('2. はし は gate の 出口 spot と 一致。むきも gate と あう', () => {
  const { M, G, W } = setup();
  for (const s of specs(M)) {
    const conn = G.connections.find((c) => c.id === s.connectionId);
    const cor = arr(M.worldCorridors()).find((c) => c.id === s.connectionId);
    assert.equal(s.fromSpot, conn.gate.ends[s.a].spot); assert.equal(s.toSpot, conn.gate.ends[s.b].spot);
    for (const r of [s.a, s.b]) {
      const e = s.endpoints[r], sp = W[r].spots.find((q) => q.id === e.spot);
      assert.ok(sp, `${s.connectionId}: ${r}.${e.spot} は ある`);
      assert.equal(e.x, sp.x); assert.equal(e.z, sp.z); assert.equal(e.r, sp.r);
      assert.equal(e.spot, conn.mouths[r], 'walk の 出口 spot は 発見の 入口と おなじ');
      // 実際の gate(regionGates)に その spot の 出口が あり、行き先が あって いる
      const other = r === s.a ? s.b : s.a;
      const gates = arr(M.regionGates(r, M.buildWorld(r, M.buildRegistry())));
      assert.ok(gates.some((g) => g.spot.id === e.spot && g.to === other && g.way === 'walk'), `${r} → ${other} の gate が ${e.spot} に ある`);
      // local の 出る むき を global に すると 4C の leave(global)
      assert.ok(Math.abs(Math.hypot(e.leaveLocal.x, e.leaveLocal.z) - 1) < 1e-9);
      const g = M.dirToGlobal(r, e.leaveLocal);
      assert.ok(angDiff(heading(g), heading(cor.ends[r].leave)) < 1e-6, `${s.connectionId}: ${r} の 出る むき`);
      assert.ok(angDiff(e.leaveHeadingGlobal, heading(cor.ends[r].leave)) < 0.01);
    }
  }
});

test('3. 段の かずは land と おなじ。ことばは gate の land から(むきごと)。地面は 11 種', () => {
  const { M, G } = setup();
  const code = codeOnly(phase4e1Block());
  for (const s of specs(M)) {
    const conn = G.connections.find((c) => c.id === s.connectionId);
    const la = arr(conn.gate.ends[s.a].land), lb = arr(conn.gate.ends[s.b].land);
    assert.equal(s.stageCount, la.length); assert.equal(s.stageCount, lb.length);
    assert.equal(arr(s.stages).length, s.stageCount); assert.equal(arr(s.terrainStages).length, s.stageCount);
    assert.equal(arr(M.orientWalkCorridor(s, s.a).stages).map((q) => q.label).join('/'), la.join('/'), 'a から は a の land');
    assert.equal(arr(M.orientWalkCorridor(s, s.b).stages).map((q) => q.label).join('/'), lb.join('/'), 'b から は b の land');
    for (const st of arr(s.stages)) assert.ok(TERRAIN_KINDS.includes(st.terrain), st.terrain);
    for (const w of la.concat(lb)) assert.ok(!code.includes("'" + w + "'"), `「${w}」を 手で うつして いない`);
    let same = 0; for (let i = 0; i < la.length; i++) if (la[i] === lb[la.length - 1 - i]) same++;
    assert.equal(s.reverseSymmetry.landMatch, same);
  }
  // 11 種 ぜんぶが どこかで つかわれて いる(ことばが 多すぎない)
  const used = new Set(specs(M).flatMap((s) => arr(s.terrainStages)));
  assert.equal([...used].sort().join(','), TERRAIN_KINDS.slice().sort().join(','));
});

test('4. walkLength = 段 × 450。初回 8.7〜10.4 秒、再訪は 1.4 倍の はやさ(かたちは 同じ)', () => {
  const { M } = setup();
  assert.equal(M.CORRIDOR_STAGE_WALK, 450);
  for (const s of specs(M)) {
    assert.equal(s.walkLength, s.stageCount * 450);
    assert.ok(Number.isFinite(s.walkLength) && s.walkLength > 0);
    assert.equal(s.stageLength, 450);
    assert.equal(s.timing.speed, M.RULES.playerSpeed);
    assert.ok(Math.abs(s.timing.firstSec - s.walkLength / 260) < 1e-3);
    assert.ok(s.timing.firstSec >= 8.6 && s.timing.firstSec <= 10.4, `${s.connectionId} ${s.timing.firstSec}`);
    assert.ok(Math.abs(s.timing.revisitSec - s.walkLength / (260 * 1.4)) < 1e-3);
    assert.equal(s.fallbackPolicy.revisitSpeedMultiplier, 1.4);
    // checkpoint は 段の はじまり(0〜1)。等分
    const cp = arr(s.stageCheckpoints);
    assert.equal(cp.length, s.stageCount + 1); assert.equal(cp[0], 0); assert.equal(cp[cp.length - 1], 1);
    for (let i = 0; i < s.stageCount; i++) assert.ok(Math.abs(cp[i] - i / s.stageCount) < 1e-12);
  }
  // さいかいは かたちを かえない: 再訪の 状態でも walkLength と 段は おなじ
  const hf = M.walkCorridorSpec('home|forest');
  const first = M.makeCorridorState(hf, 'home', { firstVisit: true }), again = M.makeCorridorState(hf, 'home', { firstVisit: false });
  assert.equal(first.speedMultiplier, 1); assert.equal(again.speedMultiplier, 1.4);
  assert.equal(M.walkCorridorSpec('home|forest'), hf, 'spec は 1 つ');
});

test('5. むきは a の 出口 → b へ 入る むき へ なめらかに。はじめと おわりの 半段は まっすぐ', () => {
  const { M } = setup();
  for (const s of specs(M)) {
    const cor = arr(M.worldCorridors()).find((c) => c.id === s.connectionId);
    const hA = heading(cor.ends[s.a].leave), hB = (heading(cor.ends[s.b].leave) + 180) % 360;
    const hp = s.headingProfile;
    assert.ok(angDiff(hp.startGlobal, hA) < 0.01 && angDiff(hp.endGlobal, hB) < 0.01);
    assert.ok(Math.abs(Math.abs(hp.turn) - cor.bend) < 0.01, `${s.connectionId}: 曲がる 量 = bend ${cor.bend}`);
    assert.ok(Math.abs(arr(hp.perStage).reduce((a, b) => a + b, 0) - hp.turn) < 0.01, '段ごとの 合計 = 曲がる 量');
    assert.ok(Math.abs(arr(hp.cumulative)[s.stageCount] - hp.turn) < 1e-6);
    const L = s.walkLength, step = 5;
    assert.ok(angDiff(M.corridorHeadingAt(s, s.a, 0), hA) < 1e-6);
    assert.ok(angDiff(M.corridorHeadingAt(s, s.a, L), hB) < 1e-6);
    let prev = M.corridorHeadingAt(s, s.a, 0);
    for (let x = step; x <= L; x += step) {
      const h = M.corridorHeadingAt(s, s.a, x);
      assert.ok(Number.isFinite(h));
      assert.ok(angDiff(h, prev) <= s.curveProfile.peakCurvature * Math.sign(s.curveProfile.peakCurvature) * step + 1e-9, 'とびが ない');
      prev = h;
    }
    // 出口の ちかく(はじめと おわりの 半段)は まっすぐ
    assert.ok(angDiff(M.corridorHeadingAt(s, s.a, 225), hA) < 1e-9);
    assert.ok(angDiff(M.corridorHeadingAt(s, s.a, L - 225), hB) < 1e-9);
  }
});

test('6. 曲がる はやさ(260/s): めやす 30°/s。こえる ものには しるし。U ターン寄りは countryside|forest', () => {
  const { M } = setup();
  const rows = [];
  for (const s of specs(M)) {
    // 数値で 1 world ごとの むきの 変化を はかる
    let peak = 0;
    for (let x = 1; x <= s.walkLength; x += 1) peak = Math.max(peak, angDiff(M.corridorHeadingAt(s, s.a, x), M.corridorHeadingAt(s, s.a, x - 1)));
    const rate = peak * 260;
    assert.ok(Math.abs(rate - s.turnRate.first) < 0.2, `${s.connectionId}: 実測 ${rate.toFixed(2)} / データ ${s.turnRate.first}`);
    assert.ok(Math.abs(s.turnRate.revisit - s.turnRate.first * 1.4) < 1e-3);
    assert.equal(s.turnFlags.overTurnBudget, s.turnRate.first > 30);
    assert.equal(s.turnFlags.overTurnBudgetRevisit, s.turnRate.revisit > 30);
    const t = Math.abs(s.headingProfile.turn);
    assert.equal(s.turnClass, t < 60 ? 'gentle' : t < 120 ? 'wide' : t < 160 ? 'sharp' : 'uTurnLike');
    assert.equal(s.turnFlags.uTurnLike, s.turnClass === 'uTurnLike');
    rows.push([s.connectionId, rate]);
  }
  const over = specs(M).filter((s) => s.turnFlags.overTurnBudget).map((s) => s.connectionId);
  assert.deepEqual(over, ['countryside|forest'], '初回で めやすを こえるのは countryside|forest だけ');
  assert.equal(M.walkCorridorSpec('countryside|forest').turnClass, 'uTurnLike');
  assert.equal(M.walkCorridorSpec('home|forest').turnClass, 'wide');
  assert.equal(M.walkCorridorSpec('home|river_lake').turnClass, 'gentle');
  assert.ok(Math.max(...rows.map((r) => r[1])) < 33, 'いちばん はやくても 32°/s ほど');
});

test('7. 幅は いみの クラス(narrow / normal / wide)。world たんいの 幅と よこずれの 上限を みちびける', () => {
  const { M } = setup();
  const W = obj(M.CORRIDOR_WIDTH);
  assert.deepEqual(Object.keys(W).sort(), ['narrow', 'normal', 'wide']);
  assert.ok(W.narrow.width < W.normal.width && W.normal.width < W.wide.width);
  for (const s of specs(M)) {
    assert.ok(['narrow', 'normal', 'wide'].includes(s.widthClass));
    assert.equal(s.nominalWidth, W[s.widthClass].width);
    for (const st of arr(s.stages)) {
      assert.equal(st.widthClass, M.CORRIDOR_TERRAIN_WIDTH[st.terrain]);
      assert.equal(st.width, W[st.widthClass].width); assert.equal(st.halfWidth, st.width / 2);
      assert.equal(st.uMax, st.halfWidth - M.RULES.bodyRadius); assert.ok(st.uMax > 0);
    }
    // いちばん 多い クラス(同じ なら せまい ほう)
    const n = {}; for (const st of arr(s.stages)) n[st.widthClass] = (n[st.widthClass] || 0) + 1;
    const best = ['narrow', 'normal', 'wide'].reduce((b, c) => ((n[c] || 0) > (n[b] || 0) ? c : b), 'narrow');
    assert.equal(s.widthClass, best);
    // 曲がる 内がわが 帯と かさならない(いちばん きつい 半径 > 半幅)
    const rMin = 180 / Math.PI / Math.abs(s.curveProfile.peakCurvature || 1e-9);
    assert.ok(rMin > Math.max(...arr(s.stages).map((st) => st.halfWidth)), `${s.connectionId}: 半径 ${rMin.toFixed(0)}`);
    // よこずれ u は 幅から clamp
    const st0 = M.corridorStageAt(s, s.a, 10);
    assert.equal(M.makeCorridorState(s, s.a, { s: 10, u: 99999 }).u, st0.uMax);
    assert.equal(M.makeCorridorState(s, s.a, { s: 10, u: -99999 }).u, -st0.uMax);
  }
  assert.equal(M.walkCorridorSpec('home|forest').widthClass, 'normal');
});

test('8. 当たり判定は いみだけ。region の collider を もちこまない。障害物の 上限 24', () => {
  const { M } = setup();
  for (const s of specs(M)) {
    const c = s.collisionProfile;
    assert.equal(c.kind, 'band'); assert.equal(c.regionColliders, false); assert.equal(c.obstacles, 'edges-only');
    assert.equal(c.bodyRadius, M.RULES.bodyRadius);
    assert.equal(arr(c.halfWidth).length, s.stageCount); assert.equal(arr(c.uMax).length, s.stageCount);
    assert.equal(arr(c.edge).length, s.stageCount); assert.equal(arr(c.edgeSoftness).length, s.stageCount);
    assert.ok(c.maxObstacleCount > 0 && c.maxObstacleCount <= 24);
    assert.ok(!('obstacleList' in c) && !('colliders' in c), 'じっさいの 障害物は まだ 置かない');
    for (const e of arr(c.edge)) assert.ok(['open', 'fence', 'trees', 'water', 'drop', 'wall'].includes(e));
  }
  // region の COLLIDER / collision grid の なまえを ブロックで つかわない
  const code = codeOnly(phase4e1Block());
  assert.ok(!/\bCOLLIDER\b|buildObstacles|buildCollisionGrid|collidersAt|moveWithCollision|COLL_CELL/.test(code));
});

test('9. いきと かえり: かたち・長さ・幅は 1 つを 共有、むきだけ さかさ', () => {
  const { M } = setup();
  for (const s of specs(M)) {
    const f = M.orientWalkCorridor(s, s.a), r = M.orientWalkCorridor(s, s.b);
    assert.equal(f.direction, 'forward'); assert.equal(r.direction, 'reverse');
    assert.equal(f.fromRegion, r.toRegion); assert.equal(f.toRegion, r.fromRegion);
    assert.equal(f.walkLength, r.walkLength); assert.equal(f.widthClass, r.widthClass);
    assert.equal(arr(f.stages).map((q) => q.terrain).join(','), arr(r.stages).map((q) => q.terrain).reverse().join(','));
    assert.equal(arr(f.stages).map((q) => q.widthClass).join(','), arr(r.stages).map((q) => q.widthClass).reverse().join(','));
    assert.ok(Math.abs(f.turn + r.turn) < 1e-9, 'かえりは 逆に 曲がる');
    assert.ok(angDiff(r.startGlobal, f.endGlobal + 180) < 0.01 && angDiff(r.endGlobal, f.startGlobal + 180) < 0.01);
    for (let x = 0; x <= s.walkLength; x += s.walkLength / 12) {
      assert.ok(angDiff(M.corridorHeadingAt(s, s.b, x), M.corridorHeadingAt(s, s.a, s.walkLength - x) + 180) < 1e-9);
    }
    // b から の むきも b の 出口の むき で はじまり、a へ 入る むきで おわる
    const cor = arr(M.worldCorridors()).find((c) => c.id === s.connectionId);
    assert.ok(angDiff(M.corridorHeadingAt(s, s.b, 0), heading(cor.ends[s.b].leave)) < 1e-6);
    assert.ok(angDiff(M.corridorHeadingAt(s, s.b, s.walkLength), heading(cor.ends[s.a].leave) + 180) < 1e-6);
    assert.ok(s.reverseSymmetry.geometryShared && s.reverseSymmetry.labelsPerEnd && s.reverseSymmetry.headingMirrored);
  }
});

test('10. handoff: 出口の pose ↔ s / u ↔ 入口の pose。むきの とびは 0.5° 未満、位置は spot の なか', () => {
  const { M, W } = setup();
  for (const s of specs(M)) for (const from of [s.a, s.b]) {
    const to = from === s.a ? s.b : s.a, L = s.walkLength;
    const ef = s.endpoints[from], et = s.endpoints[to];
    // 出口: spot の まんなか → s = 0, u = 0。出る むきへ 30 すすむ と s = 30。右へ 20 で u = 20
    const c0 = M.corridorEnterState(s, from, { x: ef.x, z: ef.z });
    assert.equal(c0.s, 0); assert.ok(Math.abs(c0.u) < 1e-9);
    assert.equal(c0.fromRegion, from); assert.equal(c0.toRegion, to);
    const l = ef.leaveLocal, rx = l.z, rz = -l.x;
    const c1 = M.corridorEnterState(s, from, { x: ef.x + l.x * 30 + rx * 20, z: ef.z + l.z * 30 + rz * 20 });
    assert.ok(Math.abs(c1.s - 30) < 1e-9 && Math.abs(c1.u - 20) < 1e-9, `${s.connectionId} ${from}: s ${c1.s} u ${c1.u}`);
    // 入る ときの むき(from の local)を global に すると corridor の はじまりの むき
    const yawIn = Math.atan2(l.x, l.z);
    assert.ok(angDiff(deg(M.yawToGlobal(from, yawIn)), M.corridorHeadingAt(s, from, 0)) < 0.5);
    // 着く: s = L で to の 入口 spot。むきは to の 出口の はんたい
    const arrive = M.corridorExitPose(s, Object.assign({}, c1, { s: L, u: 0 }));
    assert.equal(arrive.region, to); assert.equal(arrive.spot, et.spot); assert.equal(arrive.arrived, true); assert.equal(arrive.commit, true);
    assert.ok(Math.hypot(arrive.x - et.x, arrive.z - et.z) < 1e-9, 'まんなかに 着く');
    assert.ok(angDiff(deg(arrive.heading), (et.leaveHeadingLocal + 180) % 360) < 1e-6);
    // **global の むきが つながる**(遠景・backdrop が とばない)
    assert.ok(angDiff(deg(M.yawToGlobal(to, arrive.heading)), M.corridorHeadingAt(s, from, L)) < 0.5, `${s.connectionId} ${from}→${to}: 着いた むき`);
    // よこずれ u は 入口の 右へ。こえた ぶんは 入る むきへ。spot の なかに おさまる
    const side = M.corridorExitPose(s, Object.assign({}, c1, { s: L + 20, u: 30 }));
    const e = { x: -et.leaveLocal.x, z: -et.leaveLocal.z }, erx = e.z, erz = -e.x;
    const ox = side.x - et.x, oz = side.z - et.z;
    const lim = et.r - M.RULES.bodyRadius, want = Math.hypot(20, 30), k = want > lim ? lim / want : 1;
    assert.ok(Math.abs(ox * e.x + oz * e.z - 20 * k) < 1e-6 && Math.abs(ox * erx + oz * erz - 30 * k) < 1e-6);
    assert.ok(Math.hypot(ox, oz) <= lim + 1e-9);
    const far = M.corridorExitPose(s, Object.assign({}, c1, { s: L + 5000, u: 5000 }));
    assert.ok(Math.hypot(far.x - et.x, far.z - et.z) <= lim + 1e-9, 'はみ出しても spot の なか');
    // もどる: s ≤ 0 で from の 出口 spot。むきは from の 出口の はんたい。commit しない
    const back = M.corridorExitPose(s, Object.assign({}, c1, { s: -10, u: 0 }));
    assert.equal(back.region, from); assert.equal(back.spot, ef.spot); assert.equal(back.arrived, false); assert.equal(back.commit, false);
    assert.ok(angDiff(deg(back.heading), (ef.leaveHeadingLocal + 180) % 360) < 1e-6);
    assert.ok(angDiff(deg(M.yawToGlobal(from, back.heading)), M.corridorHeadingAt(s, from, 0) + 180) < 0.5);
    // とちゅうは null
    assert.equal(M.corridorExitPose(s, Object.assign({}, c1, { s: L / 2 })), null);
    // spot は ほんとうに その region に ある
    assert.ok(W[to].spots.some((q) => q.id === arrive.spot));
  }
});

test('11. closure の のこりを もちこまない: はしは spot の local 座標 そのもの。global の 位置では きめない', () => {
  const { M } = setup();
  const code = codeOnly(phase4e1Block());
  assert.ok(!/\bREGION_FRAME\b|\bregionFrame\(|\btoGlobal\(|\btoLocal\(|\bdirToGlobal\(|\bdirToLocal\(/.test(code), '位置の 変換を つかわない');
  assert.ok(!/\bmapX\b|\bmapY\b|worldMapShape|worldMapLayout|WMAP_BOUNDS/.test(code), '世界地図の しくみも つかわない');
  for (const s of specs(M)) {
    // 目安の global は 4C の まま(接続関係の 参考)。gap は 4.6〜83.9 だが、あるく 長さは その 20 ばい いじょう
    assert.ok(s.globalRef.physicalGap < 90 && s.walkLength > 20 * s.globalRef.physicalGap);
    // handoff の 位置は global を とおらない: 着いた 位置 = 入口 spot(ずれ 0)
    const p = M.corridorExitPose(s, M.makeCorridorState(s, s.a, { s: s.walkLength + 1e-9 }));
    assert.ok(Math.abs(p.x - s.endpoints[s.b].x) < 1e-6 && Math.abs(p.z - s.endpoints[s.b].z) < 1e-6);
  }
});

test('12. fallback: reduced motion・perfTier 2・失敗・許可リスト外 は いまの transition', () => {
  const { M } = setup();
  const hf = M.walkCorridorSpec('home|forest');
  for (const s of specs(M)) {
    const p = s.fallbackPolicy;
    assert.equal(p.continuousAllowed, true); assert.equal(p.maxPerfTier, 1);
    assert.equal(p.reducedMotionFallback, 'transition'); assert.equal(p.buildFailureFallback, 'returnToFrom');
    assert.equal(p.perfDropFallback, 'transitionFromNextGate');
  }
  const mode = (o) => M.corridorMode(hf, o);
  assert.deepEqual(obj(mode({})), { mode: 'corridor', reason: null });
  assert.equal(mode({ perfTier: 0 }).mode, 'corridor'); assert.equal(mode({ perfTier: 1 }).mode, 'corridor');
  assert.deepEqual(obj(mode({ perfTier: 2 })), { mode: 'transition', reason: 'perf-tier' });
  assert.deepEqual(obj(mode({ reducedMotion: true })), { mode: 'transition', reason: 'reduced-motion' });
  assert.deepEqual(obj(mode({ failed: true })), { mode: 'transition', reason: 'build-failure' });
  assert.deepEqual(obj(mode({ heavy: true })), { mode: 'transition', reason: 'perf-drop' });
  assert.deepEqual(obj(mode({ allow: ['home|river_lake'] })), { mode: 'transition', reason: 'not-allowed' });
  assert.equal(mode({ allow: ['home|forest'] }).mode, 'corridor');
  assert.deepEqual(obj(M.corridorMode(null)), { mode: 'transition', reason: 'not-walk' });
  assert.deepEqual(obj(M.corridorMode(M.walkCorridorSpec('jungle|sea'))), { mode: 'transition', reason: 'not-walk' }, 'ふねは つねに transition');
  assert.equal(M.makeCorridorState(hf, 'home', { reducedMotion: true }).fallback, 'reduced-motion');
  assert.equal(M.makeCorridorState(hf, 'home', {}).fallback, null);
});

test('13. CorridorState の かたち。s は 0〜walkLength の world 距離、u は よこの world 距離', () => {
  const { M } = setup();
  assert.deepEqual(arr(M.CORRIDOR_STATE_KEYS), ['connectionId', 'fromRegion', 'toRegion', 's', 'u', 'direction', 'speedMultiplier', 'firstVisit', 'fallback']);
  assert.ok(Object.isFrozen(M.CORRIDOR_STATE_KEYS));
  for (const s of specs(M)) for (const from of [s.a, s.b]) {
    const st = M.makeCorridorState(s, from, { s: s.walkLength / 2, u: 12 });
    assert.deepEqual(Object.keys(st), arr(M.CORRIDOR_STATE_KEYS));
    assert.equal(st.connectionId, s.connectionId); assert.equal(st.direction, from === s.a ? 'forward' : 'reverse');
    assert.equal(st.s, s.walkLength / 2); assert.equal(st.u, 12); assert.equal(st.firstVisit, true); assert.equal(st.speedMultiplier, 1);
    assert.equal(M.makeCorridorState(s, from, { s: -50 }).s, 0);
    assert.equal(M.makeCorridorState(s, from, { s: 1e9 }).s, s.walkLength);
    const stage = M.corridorStageAt(s, from, s.walkLength / 2);
    assert.ok(stage.t === 0.5 && stage.index === Math.floor(s.stageCount / 2));
  }
  assert.equal(M.makeCorridorState(M.walkCorridorSpec('home|forest'), 'city'), null, 'はしで ない 地域からは つくれない');
});

test('14. 1 どだけ 組み立てて freeze。生成は かるい', () => {
  const { M } = setup();
  const t0 = process.hrtime.bigint();
  const a = M.walkCorridorSpecs();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.equal(M.walkCorridorSpecs(), a, 'おなじ ものを かえす');
  assert.ok(Object.isFrozen(a));
  for (const s of arr(a)) {
    assert.ok(Object.isFrozen(s) && Object.isFrozen(s.stages) && Object.isFrozen(s.headingProfile) && Object.isFrozen(s.curveProfile.segments));
    for (const st of arr(s.stages)) assert.ok(Object.isFrozen(st) && Object.isFrozen(st.labels));
  }
  assert.ok(Object.isFrozen(M.CORRIDOR_WIDTH) && Object.isFrozen(M.CORRIDOR_TERRAIN_WIDTH));
  assert.ok(ms < 200, `生成 ${ms.toFixed(1)}ms`);
  assert.ok(JSON.stringify(a).length < 64 * 1024, 'データは 64KB より 小さい');
  // 実時刻・らんすう・画面を よまない
  const code = codeOnly(phase4e1Block());
  assert.ok(!/Date\.now|new Date|performance\.now|Math\.random|\bctx\b|document\.|window\./.test(code));
  assert.ok(!/\bbuildWorld\(|\bbuildRegistry\(/.test(code), '地域の 本体を 組み立てない');
});

test('15. まだ だれも つかって いない: simulation / renderer / UI / script.js から よばない', () => {
  const block = phase4e1Block();
  const rest = SRC.replace(block, '');
  const INNER = ['CORRIDOR_REVISIT_SPEED', 'CORRIDOR_TURN_BUDGET', 'CORRIDOR_RAMP', 'CORRIDOR_EDGE', 'CORRIDOR_OBSTACLE_ALLOWANCE',
    'CORRIDOR_OBSTACLE_MAX', 'CORRIDOR_TERRAIN', 'CORRIDOR_WIDTH_ORDER', 'buildWalkCorridorSpec', 'walkSpecCache', 'turnedAt', 'deepFreeze', 'wrapDeg', 'deg360', 'round3'];
  const exportLine = rest.split('\n').find((l) => l.includes('return { computeMapData,')) || '';
  const outside = rest.replace(exportLine, '');
  for (const n of EXPORTS_4E1.concat(INNER)) {
    const hit = outside.match(new RegExp('\\b' + n + '\\b', 'g')) || [];
    assert.equal(hit.length, 0, `meguru.js の ほかの ところで ${n} を つかって いない`);
  }
  for (const f of ['script.js', 'games.js', 'quick.js', 'audio.js', 'world-scene.js', 'world-environment.js']) {
    if (!fs.existsSync(f)) continue;
    const src = fs.readFileSync(f, 'utf8');
    for (const n of EXPORTS_4E1) assert.ok(!new RegExp('\\b' + n + '\\b').test(src), `${f} は ${n} を つかって いない`);
  }
  // export の ぎょうには ある
  for (const n of EXPORTS_4E1) assert.ok(new RegExp('\\b' + n + '\\b').test(exportLine), n + ' は export だけ');
});

test('16. **消しても うごきが 変わらない**: 4E-1 を 消した meguru.js と ゲームの 指紋が おなじ', () => {
  const block = phase4e1Block();
  const files = fs.readdirSync('.').filter((f) => f.endsWith('.js'));
  const dirA = fs.mkdtempSync(path.join(os.tmpdir(), 'meguru4e1-a-'));
  const dirB = fs.mkdtempSync(path.join(os.tmpdir(), 'meguru4e1-b-'));
  const plant = (d) => {
    fs.mkdirSync(path.join(d, 'tests', 'helpers'), { recursive: true });
    for (const f of files) if (fs.existsSync(f)) fs.copyFileSync(f, path.join(d, f));
    fs.copyFileSync('tests/helpers/runtime-harness.cjs', path.join(d, 'tests/helpers/runtime-harness.cjs'));
  };
  try {
    plant(dirA); plant(dirB);
    const stripped = strip4e2(SRC.replace(block, '')).replace(' ' + EXPORTS_4E1.join(', ') + ',', '');
    assert.ok(!/walkCorridorSpecs|corridorExitPose|CORRIDOR_STAGE_WALK/.test(stripped), 'けしのこしが ない');
    assert.ok(/worldCorridors/.test(stripped) && /distantRegistry/.test(stripped) && /setDistant/.test(stripped), '4C / 4D は のこって いる');
    fs.writeFileSync(path.join(dirB, 'meguru.js'), stripped);
    const probe = `
      const { harness } = require('./tests/helpers/runtime-harness.cjs');
      const h = harness({ fullDisplay: true }), M = h.api.meguruMod;
      M.setRandom(((s) => () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648)(4141));
      const out = [];
      let sp = 0, pa = 0, zo = 0, se = 0;
      for (const id of Object.keys(M.WORLDS)) { const w = M.WORLDS[id];
        sp += w.spots.length; pa += w.paths.length; zo += w.zones.length;
        se += w.spots.filter((x) => x.secret).length + w.paths.filter((x) => x[2] === 'secret').length; }
      out.push('counts ' + [sp, pa, zo, se].join('/'));
      const C = M.worldCountable();
      out.push('countable ' + C.regions.length + '/' + C.links.length + '/' + C.tier1 + '/' + C.zones);
      out.push('corridors ' + JSON.stringify(M.worldCorridors()));
      out.push('distant ' + JSON.stringify(M.distantRegistry()));
      out.push('transition ' + JSON.stringify(M.TRANSITION));
      for (const id of M.NORMAL_REGIONS.concat(['star_stop', 'memory_lake'])) {
        const w = M.buildWorld(id, M.buildRegistry());
        out.push(id + ' w ' + [w.spots.length, w.paths.length, w.zones.length, w.segments.length,
          (w.obstacles || []).length, (w.props || []).length, w.len, w.halfW, w.backdrop].join('/'));
        out.push(id + ' gates ' + M.regionGates(id, w).map((g) => g.id + '@' + g.spot.id + ':' + g.out + ':' + g.way).join(' '));
      }
      for (const id of ['home', 'forest', 'sea', 'mountain', 'city']) {
        const sim = M.createSimulation({ regionId: id });
        const ev = [];
        for (let i = 0; i < 300; i++) for (const e of sim.step(1 / 30, { x: Math.sin(i / 7), y: Math.cos(i / 5) })) ev.push(e.type);
        const p = sim.player, v = sim.view();
        out.push(id + ' walk ' + p.x.toFixed(4) + ',' + p.z.toFixed(4) + ',' + p.heading.toFixed(4)
          + ' found ' + sim.discovered.size + ' ev ' + ev.join('') .length + ' view ' + Object.keys(v).sort().join(','));
      }
      const wd = M.worldMapData({ regions: C.regions, links: C.links, marks: [], zones: [] });
      out.push('map ' + wd.regions.length + '/' + wd.links.length + '/' + wd.progress.percent);
      const s = h.api.state();
      out.push('save ' + Object.keys(s).sort().join(',') + ' | ' + Object.keys(s.lifetime).sort().join(','));
      console.log(out.join('\\n'));
    `;
    fs.writeFileSync(path.join(dirA, 'probe.cjs'), probe);
    fs.writeFileSync(path.join(dirB, 'probe.cjs'), probe);
    const withE = execFileSync(process.execPath, ['probe.cjs'], { encoding: 'utf8', cwd: dirA });
    const without = execFileSync(process.execPath, ['probe.cjs'], { encoding: 'utf8', cwd: dirB });
    assert.ok(withE.length > 500, '指紋が とれて いる');
    assert.ok(/walkCorridorSpecs/.test(fs.readFileSync(path.join(dirA, 'meguru.js'), 'utf8')), 'A がわには Phase 4E-1 が ある');
    assert.equal(without, withE, 'Phase 4E-1 を 消しても ゲームの うごきは 1 つも 変わらない');
  } finally {
    fs.rmSync(dirA, { recursive: true, force: true });
    fs.rmSync(dirB, { recursive: true, force: true });
  }
});

test('17. 分母・spot・たび・セーブ・世界地図・corridor・遠景・transition は 1 つも 動いて いない', () => {
  const { h, M, G, W } = setup();
  const C = M.worldCountable();
  assert.equal(C.regions.length, 11); assert.equal(C.links.length, 12);
  assert.equal(C.tier1, 17); assert.equal(C.zones, 103);
  let sp = 0, pa = 0, zo = 0, se = 0;
  for (const id of Object.keys(W)) { const w = W[id];
    sp += w.spots.length; pa += w.paths.length; zo += w.zones.length;
    se += w.spots.filter((x) => x.secret).length + w.paths.filter((x) => x[2] === 'secret').length; }
  assert.equal(sp, 471); assert.equal(pa, 654); assert.equal(zo, 118); assert.equal(se, 107);
  assert.equal(G.connections.length, 14);
  assert.equal(G.connections.filter((c) => c.gate).length, 13);
  assert.equal(arr(M.worldCorridors()).length, 13);
  const dist = obj(M.distantRegistry());
  assert.equal(Object.keys(dist).reduce((n, k) => n + arr(dist[k]).length, 0), 37);
  // spec を 組み立てても corridor・frame・transition は かわらない
  const before = JSON.stringify([M.REGION_FRAME, M.worldCorridors(), M.TRANSITION]);
  M.walkCorridorSpecs();
  for (const s of specs(M)) { M.corridorEnterState(s, s.a, { x: 0, z: 0 }); M.corridorExitPose(s, M.makeCorridorState(s, s.b, { s: 1e9 })); }
  assert.equal(JSON.stringify([M.REGION_FRAME, M.worldCorridors(), M.TRANSITION]), before);
  // セーブの かたち(key)は かわらない
  const s = h.api.state();
  const keys = JSON.stringify([Object.keys(s).sort(), Object.keys(s.lifetime).sort()]);
  // たび は 無変更
  for (const id of ['forest', 'jungle', 'deepsea', 'star_stop', 'home']) {
    const r = h.api.REGIONS.find((x) => x.id === id);
    if (!r) continue;
    h.api.travelToRegion(r, { id });
    assert.equal(s.regionId, id, id + ' へ たびで 行ける');
  }
  const json = JSON.stringify(s.lifetime.meguru || {});
  assert.ok(!/corridor|walkLength|connectionId|speedMultiplier/i.test(json), 'セーブに corridor の あとかたは ない');
  assert.ok(!/corridor|walkLength/i.test(JSON.stringify(Object.keys(s))), 'state に corridor の key は ない');
  assert.equal(JSON.stringify([Object.keys(s).sort(), Object.keys(s.lifetime).sort()]).length >= keys.length - 200, true);
  // sim.view() に corridor は のって いない
  const sim = M.createSimulation({ regionId: 'home' });
  assert.ok(!('corridor' in sim.view()), 'view に corridor は まだ ない');
});
