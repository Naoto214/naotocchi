// Phase 4E-2 — home|forest を ほんとうに あるく(Canvas の PoC)
// (docs/handoff/meguru-phase4e2-home-forest-poc-2026-09-23.md)
//
// ここで しばるのは
//   ・corridor を あるくのは 許可リストの home|forest だけ。ほかの 出口(walk 9 本・ふね・ゴンドラ・もぐる)は いまの transition
//   ・よいやすい せってい・端末が おもい・しっぱい → いまの transition(地域の いどう じたいは いつも できる)
//   ・s / u・幅・むき・段・当たり判定・なかま・住民なし・引き返し・着いた ときの 受けわたし
//   ・**セーブ**: 地域の 書きかえは 着いた ときの 1 かい だけ。とちゅうの reload は 出発 地域。corridor の あとかたは のこらない
//   ・4E-2 の コードは 印の ついた ブロックと 行だけ(消せば もとの うごき)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { harness } = require('./helpers/runtime-harness.cjs');

const arr = (x) => Array.from(x || []);
const deg = (r) => ((r * 180 / Math.PI) % 360 + 360) % 360;
const angDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const SRC = fs.readFileSync('meguru.js', 'utf8');
const WALK = ['snow|mountain', 'forest|mountain', 'mountain|river_lake', 'desert|mountain', 'countryside|forest',
  'home|forest', 'home|river_lake', 'city|countryside', 'city|sea', 'city|desert'];

function setup(opts) {
  const h = harness(Object.assign({ fullDisplay: true }, opts || {}));
  return { h, M: h.api.meguruMod };
}
// 出口の むきへ まっすぐ(chart は 出発 地域の local)
function walker(M, from, o = {}) {
  const spec = M.walkCorridorSpec('home|forest'), e = spec.endpoints[from];
  const yaw = Math.atan2(e.leaveLocal.x, e.leaveLocal.z);
  return { spec, e, w: M.createCorridorWalk(spec, from, Object.assign({ yaw, heading: yaw }, o)) };
}
function walkUntil(w, input, maxSec = 30) {
  let t = 0, ev = null;
  while (!ev && t < maxSec) { ev = w.step(1 / 60, input); t += 1 / 60; }
  return { ev, t };
}
// start() を うごかす。パッドの むきは テストから わたす(harness の DOM では ボタンを おせない ため)
function run(o = {}) {
  const { h, M } = setup();
  const B = h.api.meguruBridge;
  const pad = { vec: { x: 0, y: 0 } };
  const real = B.createTouchPad;
  B.createTouchPad = (row, opts) => { const p = real(row, opts); return Object.assign({}, p, { vector: () => pad.vec, destroy: p.destroy }); };
  if (o.perfTier != null) B.perfTier = () => o.perfTier;
  if (o.reduced) h.window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, regionId: o.region || 'home' });
  if (o.lifetime) Object.assign(s.lifetime, o.lifetime);
  if (o.dex) s.discoveredStages = o.dex;
  h.api.render();
  const kinds = [];
  const r = M.start(h.document.getElementById('meguruOverlay'), { renderer: () => ({
    draw(v) { kinds.push(v.world.corridor ? 'C' : v.world.regionId); if (o.onDraw) o.onDraw(v); }, destroy() {}, setDistant(d) { if (o.onDistant) o.onDistant(d); } }) });
  h.advance(300);
  // 出口の すこし 手前に 立って、その むきへ あるく
  const go = (to) => {
    const g = r.sim.gates.find((q) => q.to === to);
    const b = g.bearing || (g.out === 'far' ? { x: 0, z: 1 } : { x: 0, z: -1 });
    // いま その spot に いると 出口は ふうじられて いる(着いた しゅんかんに もどされない しくみ)。いちど はなれる
    pad.vec = { x: 0, y: 0 };
    r.setPlayer(g.spot.x - b.x * (g.spot.r + 200), g.spot.z - b.z * (g.spot.r + 200));
    h.advance(100);
    r.setPlayer(g.spot.x - b.x * 40, g.spot.z - b.z * 40);
    r.sim.camera.yaw = Math.atan2(b.x, b.z);
    pad.vec = { x: 0, y: -1 };
    return g;
  };
  return { h, M, s, r, pad, kinds, go };
}
const seq = (kinds) => kinds.join(',').replace(/(home,?)+/g, 'H').replace(/(C,?)+/g, 'C').replace(/(forest,?)+/g, 'F').replace(/(river_lake,?)+/g, 'R');

test('1. corridor を あるくのは home|forest(行きと 帰り)だけ。ほかの 出口は いまの transition', () => {
  const { M } = setup();
  assert.deepEqual(arr(M.CONTINUOUS_WALK_ALLOWLIST), ['home|forest']);
  const seen = {};
  for (const id of Object.keys(M.WORLDS)) {
    const w = M.buildWorld(id, M.buildRegistry());
    for (const g of arr(M.regionGates(id, w))) {
      const m = M.continuousWalkMode(g, {});
      const key = g.id + ':' + g.from;
      seen[key] = m.mode;
      if (g.id === 'home|forest') assert.equal(m.mode, 'corridor', key);
      else {
        assert.equal(m.mode, 'transition', key);
        assert.equal(m.reason, g.kind === 'walk' ? 'not-allowed' : 'not-walk', key);
      }
    }
  }
  assert.equal(Object.values(seen).filter((v) => v === 'corridor').length, 2, 'home → forest と forest → home の 2 つ');
  // ふね・ゴンドラ・もぐる は つねに transition
  for (const id of ['jungle|sea', 'countryside|star_stop', 'deepsea|sea']) assert.ok(Object.keys(seen).some((k) => k.startsWith(id + ':')), id + ' を しらべた');
  for (const k of Object.keys(seen)) if (/jungle\|sea|star_stop|deepsea/.test(k)) assert.equal(seen[k], 'transition', k);
  // home.bigtree の もう 1 つの 出口(かわ)は transition
  assert.equal(seen['home|river_lake:home'], 'transition');
  // walk の のこり 9 本も transition
  for (const id of WALK.filter((x) => x !== 'home|forest')) for (const k of Object.keys(seen).filter((q) => q.startsWith(id + ':'))) assert.equal(seen[k], 'transition', k);
});

test('2. fallback: よいやすい せってい・perfTier 2・しっぱいした・おもい・形が あわない → transition。perfTier 0 / 1 は corridor', () => {
  const { M } = setup();
  const w = M.buildWorld('home', M.buildRegistry());
  const g = arr(M.regionGates('home', w)).find((q) => q.id === 'home|forest');
  const mode = (o) => M.continuousWalkMode(g, o);
  assert.equal(mode({ perfTier: 0 }).mode, 'corridor');
  assert.equal(mode({ perfTier: 1 }).mode, 'corridor');
  assert.equal(mode({ perfTier: 2 }).reason, 'perf-tier');
  assert.equal(mode({ reducedMotion: true }).reason, 'reduced-motion');
  assert.equal(mode({ failed: new Set(['home|forest']) }).reason, 'build-failure');
  assert.equal(mode({ heavy: true }).reason, 'perf-drop');
  assert.equal(mode({ allow: [] }).reason, 'not-allowed');
  assert.equal(M.continuousWalkMode(Object.assign({}, g, { spot: { id: 'nowhere' } }), {}).reason, 'geometry-invalid');
  assert.equal(M.continuousWalkMode(Object.assign({}, g, { at: 'nowhere' }), {}).reason, 'geometry-invalid');
  assert.equal(M.continuousWalkMode(null, {}).reason, 'not-walk');
  // 状態が つくれない(ざひょうが こわれて いる)ときは つくらない(start() は transition に もどす)
  const spec = M.walkCorridorSpec('home|forest');
  assert.throws(() => M.createCorridorWalk(spec, 'city', {}));
});

test('3. home → forest: 長さは spec の まま、初回 10.4 秒 / 再訪 7.4 秒、段は 0 → 5、着く がわは forest の 入口', () => {
  const { M } = setup();
  for (const first of [true, false]) {
    const { spec, w } = walker(M, 'home', { firstVisit: first });
    assert.equal(w.state.speedMultiplier, first ? 1 : 1.4);
    assert.equal(w.chart.L, spec.walkLength, 'walkLength は spec の まま(2700)');
    const stages = [];
    let t = 0, ev = null;
    while (!ev && t < 30) { ev = w.step(1 / 60, { x: 0, y: -1 }); t += 1 / 60; const i = w.stage().index; if (stages[stages.length - 1] !== i) stages.push(i); }
    assert.equal(ev.type, 'arrive');
    assert.ok(Math.abs(t - spec.walkLength / (260 * (first ? 1 : 1.4))) < 0.1, `所要 ${t.toFixed(2)}s`);
    assert.deepEqual(stages, [0, 1, 2, 3, 4, 5]);
    const p = w.exitPose();
    assert.equal(p.region, 'forest'); assert.equal(p.spot, 'entry'); assert.equal(p.commit, true);
  }
});

test('4. forest → home も おなじ 形を さかさに つかう(長さ・段・幅は おなじ、ことばは forest がわ)', () => {
  const { M } = setup();
  const { spec, w } = walker(M, 'forest');
  assert.equal(w.state.direction, 'reverse'); assert.equal(w.state.fromRegion, 'forest'); assert.equal(w.state.toRegion, 'home');
  const labels = [];
  let t = 0, ev = null;
  while (!ev && t < 30) { ev = w.step(1 / 60, { x: 0, y: -1 }); t += 1 / 60; const st = w.stage(); if (labels[labels.length - 1] !== st.label) labels.push(st.label); }
  assert.equal(ev.type, 'arrive');
  assert.ok(Math.abs(t - spec.walkLength / 260) < 0.1);
  const G = M.WORLD_GEOGRAPHY.connections.find((c) => c.id === 'home|forest');
  assert.deepEqual(labels, arr(G.gate.ends.forest.land), 'forest から の ことば');
  const p = w.exitPose();
  assert.equal(p.region, 'home'); assert.equal(p.spot, 'bigtree');
});

test('5. s / u: 左右に あるけるが 帯の そとへは 出ない(幅クラスから)。レールでは ない', () => {
  const { M } = setup();
  for (const x of [1, -1]) {
    const { spec, w } = walker(M, 'home');
    let maxU = 0;
    for (let i = 0; i < 600; i++) { w.step(1 / 60, { x, y: -0.4 }); maxU = Math.max(maxU, Math.abs(w.state.u)); const lim = w.stage().uMax; assert.ok(Math.abs(w.state.u) <= lim + 1e-6, `u ${w.state.u} ≤ ${lim}`); }
    assert.ok(maxU > 100, '横に うごける: ' + maxU.toFixed(0));
    assert.ok(Math.abs(w.state.u) > 100 && Math.sign(w.state.u) === x, '入力の がわへ');
    assert.ok(maxU <= Math.max(...arr(spec.stages).map((q) => q.uMax)) + 1e-6);
  }
});

test('6. むき: 入る しゅんかんに カメラは うごかない。曲がる はやさは spec どおり(初回 10.9°/s)、着く ときの ずれは 1° 未満', () => {
  const { M } = setup();
  for (const from of ['home', 'forest']) for (const first of [true, false]) {
    const { spec, w } = walker(M, from, { firstVisit: first });
    const yaw0 = w.camera.yaw;
    w.step(1 / 60, { x: 0, y: 0 });
    assert.equal(w.camera.yaw, yaw0, '入った ときは カメラの むきが そのまま');
    let prev = w.camera.yaw, peak = 0, t = 0, ev = null;
    while (!ev && t < 30) { ev = w.step(1 / 60, { x: 0, y: -1 }); t += 1 / 60; peak = Math.max(peak, angDiff(deg(w.camera.yaw), deg(prev)) * 60); prev = w.camera.yaw; }
    const want = first ? spec.turnRate.first : spec.turnRate.revisit;
    assert.ok(peak <= want + 0.5, `${from} ${first}: 最大 ${peak.toFixed(1)}°/s(spec ${want})`);
    const to = from === 'home' ? 'forest' : 'home', p = w.exitPose();
    // 着いた 地域の local で、カメラの むき と からだの むき が ほぼ おなじ(遠景・backdrop が とばない)
    assert.ok(angDiff(deg(M.yawToGlobal(to, w.yawIn(to))), deg(M.yawToGlobal(to, p.heading))) < 1, 'カメラの ずれ < 1°');
  }
});

test('7. 当たり判定: 帯の はしの いし だけ(1 段 1 こ・24 こ いない)。いしに めりこまない。region の 当たり判定は もたない', () => {
  const { M } = setup();
  const { spec, w } = walker(M, 'home');
  const B = arr(w.world.blockers);
  assert.ok(B.length >= 1 && B.length <= spec.stageCount && B.length <= 24);
  assert.ok(!('obstacles' in w.world) && !('collision' in w.world), 'region の 当たり判定 データは ない');
  for (const o of B) {
    const lim = arr(spec.stages)[Math.min(spec.stageCount - 1, Math.floor(o.s / spec.stageLength))].uMax;
    assert.ok(Math.abs(o.u) <= lim && Math.abs(o.u) >= 100, 'いしは 帯の はしの ほう');
  }
  // いしへ まっすぐ ぶつかりに いく
  const o = B[0];
  const w2 = walker(M, 'home').w;
  let minD = Infinity;
  for (let i = 0; i < 900 && w2.state.s < o.s + 200; i++) {
    const du = o.u - w2.state.u;
    w2.step(1 / 60, { x: Math.max(-1, Math.min(1, du / 40)), y: -0.6 });
    minD = Math.min(minD, Math.hypot(w2.state.s - o.s, w2.state.u - o.u));
  }
  assert.ok(minD >= o.r + M.RULES.bodyRadius - 1e-6, 'いしに めりこまない: ' + minD.toFixed(1));
});

test('8. なかまは ついてくる(帯の なか・じぶんの ちかく・かずは おなじ)。住民は 0', () => {
  const { M } = setup();
  const spec = M.walkCorridorSpec('home|forest'), e = spec.endpoints.home;
  const party = [{ x: e.x - 60, z: e.z - 30, kind: 'companion', bob: 0 }, { x: e.x + 60, z: e.z - 30, kind: 'partner', bob: 0 }];
  const { w } = walker(M, 'home', { party });
  assert.equal(w.party, party, 'おなじ なかま(ふたりめを つくらない)');
  for (let i = 0; i < 360; i++) {
    w.step(1 / 60, { x: 0, y: -1 });
    if (i > 60) for (const a of party) assert.ok(Math.hypot(a.x - w.player.x, a.z - w.player.z) < 400, 'ちかく');
  }
  assert.equal(w.party.length, 2);
  assert.equal(arr(w.view().residents).length, 0, '住民は corridor に 出ない');
  assert.equal(w.view().nearest, null);
});

test('9. 引き返し: とちゅうで もどると 出発 地域の 同じ 出口へ(commit しない)', () => {
  const { M } = setup();
  const { w } = walker(M, 'home');
  for (let i = 0; i < 240; i++) w.step(1 / 60, { x: 0, y: -1 });
  const mid = w.state.s;
  assert.ok(mid > 900);
  const { ev } = walkUntil(w, { x: 0, y: 1 });
  assert.equal(ev.type, 'back');
  const p = w.backPose();
  assert.equal(p.region, 'home'); assert.equal(p.spot, 'bigtree'); assert.equal(p.commit, false);
  // うしろむきに あるいても「まえ」は ゆびを おいた ときの まま(いったり きたり しない)
  assert.ok(w.state.s < 0);
});

test('10. け しき: 飾りは 150 こ いない、段の 地面の 種類で かわり、さかいは みじかく まざる。地面の いろも なめらか。遠景は すすみぐあいで まざる', () => {
  const { M } = setup();
  const { w } = walker(M, 'home');
  const props = w.world.props, L = w.spec.walkLength, len = w.spec.stageLength, band = len * 0.3;
  assert.ok(props.length > 60 && props.length <= 150, 'props ' + props.length);
  assert.ok(w.world.segments.length > 0 && w.world.segments.every((sg) => sg.half > 0 && sg.len > 0));
  const deco = props.filter((p) => !p.blocker), name = (p) => p.emoji || p.struct;
  const terr = arr(w.spec.stages.map((st) => st.terrain));
  assert.deepEqual(terr, ['urban-edge', 'field', 'field', 'forest', 'forest', 'forest']);
  // さかいの はば(段の 30% = 全体の 5%)の そとは、その 段の 地面の 種類の 飾り だけ
  for (const p of deco) {
    const i = Math.min(5, Math.floor(p.s / len)), inBand = p.s - i * len < band || (i + 1) * len - p.s < band;
    if (!inBand) assert.equal(p.terrain, terr[i], `${name(p)} @${Math.round(p.s)} は ${terr[i]}`);
    else assert.ok(p.terrain === terr[i] || p.terrain === terr[i - 1] || p.terrain === terr[i + 1]);
  }
  // 地面の 種類ごとに ちがいが わかる(いえなみ = いえ・さく、はたけ = うね・むぎ、もり = しんようじゅ・しだ)
  const set = (t) => new Set(deco.filter((p) => p.terrain === t).map(name));
  const has = (t, list) => list.some((n) => set(t).has(n));
  assert.ok(has('urban-edge', ['🏠', '🏡']) && has('urban-edge', ['fence', 'hedge', 'planter']), 'いえなみ');
  assert.ok(has('field', ['cropline', 'crop']) && has('field', ['🌾', '🌻']), 'はたけ');
  assert.ok(has('forest', ['🌲']) && has('forest', ['fern', '🌿', '🍄']), 'もり');
  assert.ok(!has('forest', ['🏠', '🏡', 'fence', 'hedge']) && !has('urban-edge', ['🌲', 'fern']), 'まざらない');
  // 着く ちょくぜん(さいごの 段の はばの そと)に 出発 がわの 飾りは のこらない
  assert.ok(deco.filter((p) => p.s > L - len + band).every((p) => p.terrain === 'forest'), '森の いりぐちに いえは ない');
  // 地面の いろ: 段の まんなかは その 地域の いろ、さかいで なめらかに かわる(10 ごとの とびが ちいさい)
  const at = (s) => { w.world.setProgress(s / L); return w.world.ground[0]; };
  assert.equal(at(len * 0.5), M.WORLDS.home.ground[0]); assert.equal(at(len * 1.5), M.WORLDS.countryside.ground[0]); assert.equal(at(len * 4.5), M.WORLDS.forest.ground[0]);
  const rgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
  let jump = 0;
  for (let s = 0; s < L; s += 10) { const a = rgb(at(s)), b = rgb(at(s + 10)); jump = Math.max(jump, ...a.map((v, k) => Math.abs(v - b[k]))); }
  assert.ok(jump <= 6, '地面の いろの とび ' + jump);
  // 山なみ: いえなみ → はたけ → もり
  assert.equal((at(len * 0.5), w.world.backdrop), M.WORLDS.home.backdrop);
  assert.equal((at(len * 1.5), w.world.backdrop), M.WORLDS.countryside.backdrop);
  assert.equal((at(len * 5.5), w.world.backdrop), M.WORLDS.forest.backdrop);
  // 森の 屋根は 森の おく だけ
  assert.equal((at(len * 3.5), w.world.canopy), null); assert.ok((at(len * 5.5), w.world.canopy) === (M.WORLDS.forest.canopy || null));
  const g0 = (w.world.setProgress(0), w.world.ground[0]);
  walkUntil(w, { x: 0, y: -1 });
  assert.equal(w.world.regionId, 'forest'); assert.notEqual(w.world.ground[0], g0, '地面の いろが かわる');
  // 遠景の まぜかた
  const F = [{ id: 'f', alpha: 1, feature: { bearingLocal: 10 } }], T = [{ id: 't', alpha: 1, feature: { bearingLocal: 20 } }];
  const bl = (t) => arr(w.distant(t, F, T)).map((v) => v.id + ':' + v.alpha.toFixed(2)).join(',');
  assert.equal(bl(0.2), 'f:1.00'); assert.equal(bl(0.5), 'f:0.50,t:0.50'); assert.equal(bl(0.8), 't:1.00');
  // 到着 がわの 方位は 出発 地域の local へ なおす
  const off = (r) => w.spec.endpoints[r].leaveHeadingGlobal - w.spec.endpoints[r].leaveHeadingLocal;
  const tv = arr(w.distant(0.9, F, T))[0];
  assert.ok(angDiff(tv.feature.bearingLocal, 20 + off('forest') - off('home')) < 1e-9);
  // 帰り(forest → home)は 同じ 段を さかさに(形は 1 つ。いりぐち ちかくは いえなみ)
  const r = walker(M, 'forest').w, rd = r.world.props.filter((p) => !p.blocker);
  assert.ok(rd.filter((p) => p.s < len - band).every((p) => p.terrain === 'forest'), '森の がわから はじまる');
  assert.ok(rd.filter((p) => p.s > L - len + band).every((p) => p.terrain === 'urban-edge'), 'いえの まえに 森は ない');
  assert.equal(r.chart.L, w.chart.L);
});

let partyByCorridor = null;                          // 11 で あるいて 着いた ときの なかま(14 の transition と くらべる)
test('11. start(): home → forest を あるく。とちゅうの セーブは home の まま、着いた ときだけ forest。corridor の あとかたは のこらない', () => {
  const R = run();
  R.go('forest');
  let saw = null, during = new Set(), t = 0;
  for (let i = 0; i < 400; i++) {
    R.h.advance(50);
    const c = R.r.corridor;
    if (c) { saw = saw || c; during.add(R.s.regionId); t += 0.05; }
    if (saw && !c) break;
  }
  R.h.advance(300);                                  // 着いた あとの forest の え
  assert.ok(saw, 'corridor が はじまる');
  assert.equal(saw.connectionId, 'home|forest'); assert.equal(saw.from, 'home');
  assert.deepEqual([...during], ['home'], 'あるいて いる あいだの セーブは home');
  assert.equal(R.s.regionId, 'forest'); assert.equal(R.r.world.regionId, 'forest');
  assert.ok(t > 10 && t < 11.5, '所要 ' + t.toFixed(2));
  assert.equal(seq(R.kinds), 'HCF', 'え は home → corridor → forest');
  const st = R.r.corridorStats; assert.equal(st.enters, 1); assert.equal(st.arrives, 1); assert.equal(st.fails, 0);
  assert.ok(!/corridor|walkLength|connectionId|speedMultiplier/.test(JSON.stringify(R.s.lifetime.meguru)), 'セーブに corridor は ない');
  assert.ok(R.s.lifetime.regionsVisited.includes('forest'));
  // なかまは 1 くみ だけ
  const ids = arr(R.r.party).map((a) => a.key);
  assert.equal(new Set(ids).size, ids.length);
  partyByCorridor = ids.slice().sort();
  // かえりも あるける
  R.go('home');
  let back = null;
  for (let i = 0; i < 400; i++) { R.h.advance(50); const c = R.r.corridor; if (c) back = back || c; if (back && !c) break; }
  assert.ok(back && back.from === 'forest' && back.direction === 'reverse');
  assert.equal(R.s.regionId, 'home');
  R.r.stop();
});

test('12. とちゅうで reload(もどる → もう いちど start)すると 出発 地域から。セーブの かたちは かわらない', () => {
  const R = run();
  const keys0 = JSON.stringify([Object.keys(R.s).sort(), Object.keys(R.s.lifetime).sort(), Object.keys(R.s.lifetime.meguru || {}).sort()]);
  R.go('forest');
  for (let i = 0; i < 80 && !(R.r.corridor && R.r.corridor.phase === 'walk' && R.r.corridor.s > 800); i++) R.h.advance(50);
  assert.ok(R.r.corridor && R.r.corridor.s > 800, 'corridor の とちゅう');
  R.h.api.saveState && R.h.api.saveState();
  R.r.stop();                                    // もどる / アプリを とじる
  assert.equal(R.s.regionId, 'home', 'セーブは 出発 地域の まま');
  assert.equal(JSON.stringify([Object.keys(R.s).sort(), Object.keys(R.s.lifetime).sort(), Object.keys(R.s.lifetime.meguru || {}).sort()]), keys0, 'セーブの key は おなじ');
  const r2 = R.M.start(R.h.document.getElementById('meguruOverlay'), { renderer: () => ({ draw() {}, destroy() {}, setDistant() {} }) });
  R.h.advance(200);
  assert.equal(r2.world.regionId, 'home'); assert.equal(r2.corridor, null);
  r2.stop();
});

test('13. とちゅうで 引き返すと home の 大きな 木へ。地域も セーブも かわらない', () => {
  const R = run();
  R.go('forest');
  for (let i = 0; i < 60; i++) R.h.advance(50);
  assert.ok(R.r.corridor && R.r.corridor.s > 300);
  R.pad.vec = { x: 0, y: 1 };
  let done = false;
  for (let i = 0; i < 200 && !done; i++) { R.h.advance(50); done = !R.r.corridor; }
  assert.ok(done);
  assert.equal(R.s.regionId, 'home'); assert.equal(R.r.world.regionId, 'home');
  assert.equal(R.r.sim.spot && R.r.sim.spot.id, 'bigtree', '同じ 出口の ところ');
  assert.equal(R.r.corridorStats.backs, 1);
  R.r.stop();
});

test('20. corridor の あいだ、しらせ・その ばの ボタン(はなす / のる)は 出ない(こえた frame に 出た ものも のこらない)', () => {
  for (const [from, to] of [['home', 'forest'], ['forest', 'home']]) {
    const R = run({ region: from, dex: ['dog:0', 'dog:1', 'cat:2', 'penguin:3', 'mushroom:0', 'beetle:0', 'ghost:1', 'sakura:6', 'salmon:5'] });
    assert.ok(R.r.world.residents.length >= 2, 'この テストには 住民が いる');
    // じぶんの すぐ そばに 住民を おく(こえる frame に「はなす」が 出る じょうけん)
    const g = R.go(to), b = g.bearing || (g.out === 'far' ? { x: 0, z: 1 } : { x: 0, z: -1 });
    for (const a of R.r.world.residents.slice(0, 2)) { a.x = g.spot.x - b.x * 30; a.z = g.spot.z - b.z * 30; a.fixed = true; }
    let seen = 0;
    for (let i = 0; i < 400; i++) {
      R.h.advance(50);
      const c = R.r.corridor;
      if (!c) { if (seen) break; continue; }
      assert.doesNotMatch(c.ui.hint, /パッドを なぞって|はなす/, `${from}→${to} ${c.phase}: 地域の ヒントが のこって いる`);
      if (c.phase !== 'walk') continue;
      seen++;
      assert.equal(c.ui.found, false, `${from}→${to}: しらせが のこって いる`);
      assert.equal(c.ui.act, null, `${from}→${to}: その ばの ボタンが のこって いる`);
      assert.match(c.ui.hint, /の ほうへ/, 'ヒントは corridor の もの');
    }
    assert.ok(seen > 50, 'corridor を あるいた ' + seen);
    R.r.stop();
  }
});

// corridor を s(0〜1 の わりあい)まで すすめる
const walkTo = (R, frac) => { for (let i = 0; i < 400; i++) { const c = R.r.corridor; if (c && c.phase === 'walk' && c.s >= frac * 2700) return c; R.h.advance(50); } return R.r.corridor; };

test('21. 着く まえに 1 かい だけ 組み(prepare)、着いた ときに それを そのまま つかう(buildWorld を 2 かい よばない)。帰りも おなじ しくみ', () => {
  const R = run();
  const H = R.r.corridorStats.handoff, h0 = { ...H };
  R.go('forest');
  let c = walkTo(R, 0.5);
  assert.equal(c.prepared, false, 'まんなかでは まだ 組まない');
  c = walkTo(R, 0.95);
  assert.equal(c.prepared, true, '終端の てまえで 組む');
  assert.equal(R.s.regionId, 'home', '組んでも セーブは home の まま');
  assert.equal(R.r.world.regionId, 'home', 'sim の 地域も home の まま');
  for (let i = 0; i < 100 && R.r.corridor; i++) R.h.advance(50);
  assert.equal(R.s.regionId, 'forest');
  const st = R.r.corridorStats;
  assert.equal(st.prepares, 1); assert.equal(H.offers - h0.offers, 1); assert.equal(H.hits - h0.hits, 1, '組んだ world を つかった'); assert.equal(H.misses - h0.misses, 0);
  assert.ok(st.lastCommitMs != null && st.lastFirstDrawMs != null && st.lastPrepareMs != null);
  // 帰り(forest → home)も 同じ(home だけの とくべつな みちは ない)
  R.h.advance(300);
  R.go('home');
  walkTo(R, 0.97);
  for (let i = 0; i < 100 && R.r.corridor; i++) R.h.advance(50);
  assert.equal(R.s.regionId, 'home');
  assert.equal(R.r.corridorStats.prepares, 2); assert.equal(H.hits - h0.hits, 2); assert.equal(H.misses - h0.misses, 0);
  R.r.stop();
});

test('22. commit で しっぱい: 地域が かわる まえ でも かわった あと でも、出発 地域へ もどる。セーブは home、corridor の あとかたなし、つぎは transition', () => {
  for (const where of ['before', 'after']) {
    const R = run();
    const B = R.h.api.meguruBridge;
    R.go('forest');
    walkTo(R, 0.97);
    assert.equal(R.r.corridor.prepared, true);
    // before: enterWorld の はじめ(地域を かえる まえ)で こける / after: sim が forest に なった あとで こける
    const key = where === 'before' ? 'discoveredSpots' : 'prepareIllustrations', real = B[key];
    B[key] = () => { throw new Error('test ' + where); };
    try { for (let i = 0; i < 100 && R.r.corridor; i++) R.h.advance(50); } finally { B[key] = real; }
    assert.equal(R.r.corridor, null, where);
    assert.equal(R.s.regionId, 'home', where + ': セーブは home');
    assert.equal(R.r.world.regionId, 'home', where + ': 出発 地域の world');
    assert.equal(R.r.corridorStats.fails, 1);
    assert.ok(!/corridor|walkLength|connectionId/.test(JSON.stringify(R.s.lifetime.meguru)), 'セーブに corridor は ない');
    for (let i = 0; i < 30; i++) R.h.advance(50);
    R.go('forest');
    for (let i = 0; i < 80 && R.s.regionId === 'home'; i++) R.h.advance(50);
    assert.equal(R.s.regionId, 'forest', where + ': transition で いける');
    assert.equal(R.r.corridorStats.enters, 1, where + ': 2 かいめは transition');
    R.r.stop();
  }
});

test('23. 終端 ちかくの 競合: 組んだ あとで 引き返す / もどる / reload / 暗く なりかけて 引き返す — どれも forest へ commit しない', () => {
  // (a) 組んだ あと 引き返す → すてる。さらに もどれば home の 出口へ
  let R = run();
  R.go('forest');
  walkTo(R, 0.95);
  assert.equal(R.r.corridor.prepared, true);
  R.pad.vec = { x: 0, y: 1 };
  for (let i = 0; i < 60 && R.r.corridor && R.r.corridor.prepared; i++) R.h.advance(50);
  assert.equal(R.r.corridor.prepared, false, '引き返したら すてる');
  assert.equal(R.r.corridorStats.discards, 1);
  for (let i = 0; i < 400 && R.r.corridor; i++) R.h.advance(50);
  assert.equal(R.s.regionId, 'home'); assert.equal(R.r.world.regionId, 'home'); assert.equal(R.r.corridorStats.backs, 1);
  assert.equal(R.r.corridorStats.handoff.hits, 0, 'forest の world は つかって いない');
  R.r.stop();
  // (b) 暗く なりかけ(終端の すぐ てまえ)で 引き返す → あかるく もどり、着かない
  R = run();
  R.go('forest');
  for (let i = 0; i < 2000; i++) { const c = R.r.corridor; if (c && c.s >= 2700 - 8) break; R.h.advance(16); }
  const c1 = R.r.corridor; assert.ok(c1 && c1.phase === 'walk' && c1.cover > 0, '暗く なりかけ ' + (c1 && c1.cover));
  R.pad.vec = { x: 0, y: 1 };
  for (let i = 0; i < 10; i++) R.h.advance(50);
  assert.ok(R.r.corridor && R.r.corridor.phase === 'walk' && R.r.corridor.s < 2600, 'まだ corridor');
  assert.equal(R.s.regionId, 'home');
  R.r.stop();
  // (c) 組んだ あとで もどる(めぐるを 出る)→ セーブは home。つぎの start は home から(組んだ ものは のこらない)
  R = run();
  R.go('forest');
  walkTo(R, 0.95);
  assert.equal(R.r.corridor.prepared, true);
  const drops0 = R.r.corridorStats.handoff.drops;
  R.r.stop();
  assert.equal(R.s.regionId, 'home');
  assert.equal(R.r.corridorStats.handoff.drops, drops0 + 1, 'もどったら すてる');
  const M = R.M, r2 = M.start(R.h.document.getElementById('meguruOverlay'), { renderer: () => ({ draw() {}, destroy() {}, setDistant() {} }) });
  R.h.advance(200);
  assert.equal(r2.world.regionId, 'home'); assert.equal(r2.corridor, null);
  r2.stop();
});

test('24. けしきは はじめて でも 2 かいめ でも おなじ(はやさ だけ かわる)。いしは まっすぐ あるく 道の うえに ない', () => {
  const { M } = setup();
  const a = walker(M, 'home', { firstVisit: true }).w, b = walker(M, 'home', { firstVisit: false }).w;
  assert.equal(JSON.stringify(a.world.props), JSON.stringify(b.world.props));
  assert.equal(a.state.speedMultiplier, 1); assert.equal(b.state.speedMultiplier, 1.4);
  for (const o of arr(a.world.blockers)) assert.ok(Math.abs(o.u) - o.r >= M.RULES.bodyRadius + 40, 'みちの まんなかから はなれて いる');
});

test('25. なかまは 段の さかいでも とばない・きえない(ずっと 同じ かず、1 frame の うごきは ちいさい)', () => {
  const R = run({ lifetime: { companionsRecruited: ['cat_friend'] } });
  R.s.companions = [{ id: 'cat_friend' }];
  R.r.stop();
  const R2 = run({ lifetime: { companionsRecruited: ['cat_friend'] } });
  R2.go('forest');
  let prev = null, jump = 0, frames = 0, n = null;
  for (let i = 0; i < 400; i++) {
    R2.h.advance(50);
    const c = R2.r.corridor;
    if (!c) { if (frames) break; continue; }
    if (c.phase !== 'walk') continue;
    const ps = arr(R2.r.party).map((a) => ({ x: a.x, z: a.z }));
    if (n == null) n = ps.length; assert.equal(ps.length, n);
    if (prev) ps.forEach((p, k) => { jump = Math.max(jump, Math.hypot(p.x - prev[k].x, p.z - prev[k].z)); });
    prev = ps; frames++;
  }
  assert.ok(frames > 150);
  assert.ok(jump < 60, 'なかまの 1 frame の うごき ' + jump.toFixed(1));
  R2.r.stop();
});

test('14. よいやすい せってい・perfTier 2 は いまの transition(corridor は つかわない)。地域の いどうは できる', () => {
  for (const o of [{ reduced: true }, { perfTier: 2 }]) {
    const R = run(o);
    R.go('forest');
    for (let i = 0; i < 80 && R.s.regionId === 'home'; i++) R.h.advance(50);
    assert.equal(R.s.regionId, 'forest', JSON.stringify(o) + ': いどう できる');
    assert.equal(R.r.corridorStats.enters, 0, JSON.stringify(o) + ': corridor は つかわない');
    assert.ok(!R.kinds.includes('C'));
    // 着いた あとの なかまは corridor で 着いた ときと おなじ(組み立てと 書きかえの じゅんばんが ちがっても かわらない)
    if (partyByCorridor) assert.deepEqual(arr(R.r.party).map((a) => a.key).sort(), partyByCorridor, JSON.stringify(o) + ': なかまが おなじ');
    R.r.stop();
  }
});

test('15. home.bigtree で かわ(river_lake)へ 出ると corridor は はじまらない(いまの transition)', () => {
  const R = run();
  R.go('river_lake');
  for (let i = 0; i < 80 && R.s.regionId === 'home'; i++) R.h.advance(50);
  assert.equal(R.s.regionId, 'river_lake');
  assert.equal(R.r.corridorStats.enters, 0);
  R.r.stop();
});

test('16. 着く がわが 組み立てられない とき: home の 出口へ もどる。セーブは home、つぎからは transition', () => {
  const R = run();
  R.go('forest');
  for (let i = 0; i < 30; i++) R.h.advance(50);
  assert.ok(R.r.corridor);
  const spots = R.M.WORLDS.forest.spots;
  R.M.WORLDS.forest.spots = null;               // forest の buildWorld を こわす
  try {
    for (let i = 0; i < 400 && R.r.corridor; i++) R.h.advance(50);
  } finally { R.M.WORLDS.forest.spots = spots; }
  assert.equal(R.r.corridor, null);
  assert.equal(R.s.regionId, 'home'); assert.equal(R.r.world.regionId, 'home');
  assert.equal(R.r.corridorStats.fails, 1);
  // つぎは transition(corridor を もう いちど つかわない)
  for (let i = 0; i < 30; i++) R.h.advance(50);
  R.go('forest');
  for (let i = 0; i < 80 && R.s.regionId === 'home'; i++) R.h.advance(50);
  assert.equal(R.s.regionId, 'forest');
  assert.equal(R.r.corridorStats.enters, 1, '2 かいめは transition');
  R.r.stop();
});

test('17. ほかの walk 出口(例: countryside → forest)は いまの transition の まま', () => {
  const R = run({ region: 'countryside' });
  R.go('forest');
  for (let i = 0; i < 80 && R.s.regionId === 'countryside'; i++) R.h.advance(50);
  assert.equal(R.s.regionId, 'forest');
  assert.equal(R.r.corridorStats.enters, 0);
  R.r.stop();
});

test('18. 4E-2 の コードは 印の ついた ところ だけ。simulation・renderer・セーブ・たび は かえて いない', () => {
  const marked = SRC.match(/^[ \t]*\/\/ ====== Phase 4E-2:[\s\S]*?\/\/ ====== \/Phase 4E-2 ======\n/gm) || [];
  assert.equal(marked.length, 2, 'module の ブロック と start() の ブロック');
  const stripped = SRC.replace(/^[ \t]*\/\/ ====== Phase 4E-2:[\s\S]*?\/\/ ====== \/Phase 4E-2 ======\n/gm, '')
    .split('\n').filter((l) => !/\/\/ Phase 4E-2$/.test(l)).join('\n')
    .replace(/ CONTINUOUS_WALK_ALLOWLIST,[^\n]*? createCorridorWalk,/, '')
    .replace(', get corridor() { return corridorInfo(); }, get corridorStats() { return corrStats; }', '');
  for (const n of ['CONTINUOUS_WALK_ALLOWLIST', 'continuousWalkMode', 'createCorridorWalk', 'corridorDistantBlend', 'tryCorridor', 'stepCorridor', 'corrFade', 'corridorInfo', 'corrStats'])
    assert.ok(!new RegExp('\\b' + n + '\\b').test(stripped), n + ' は 印の ところ だけ');
  // simulation(createSimulation)と renderer(createCanvasRenderer)には 4E-2 が ない
  const slice = (a, b) => SRC.slice(SRC.indexOf(a), SRC.indexOf(b, SRC.indexOf(a) + 10));
  assert.ok(!/Phase 4E-2|corridor/i.test(slice('function createSimulation(', '\n    function imageFor(')), 'simulation は そのまま');
  assert.ok(!/Phase 4E-2|walkCorridor|CorridorWalk/.test(slice('function createCanvasRenderer(', '\n    const GEO_UNIT')), 'renderer は そのまま');
  // TRANSITION と travelToRegion は そのまま
  const script = fs.readFileSync('script.js', 'utf8');
  assert.ok(!/corridor/i.test(script.slice(script.indexOf('function travelToRegion('), script.indexOf('function travelToRegion(') + 6000)), 'たびは そのまま');
  assert.ok(!/corridor/i.test(slice('const TRANSITION = {', 'function transitionPlan(')), 'transition の データは そのまま');
});

test('19. 分母・spot・たび・セーブ・世界地図・corridor の かずは うごいて いない', () => {
  const { h, M } = setup();
  const C = M.worldCountable();
  assert.equal(C.regions.length, 11); assert.equal(C.links.length, 12); assert.equal(C.tier1, 17); assert.equal(C.zones, 103);
  let sp = 0, pa = 0, zo = 0, se = 0;
  for (const id of Object.keys(M.WORLDS)) { const w = M.WORLDS[id];
    sp += w.spots.length; pa += w.paths.length; zo += w.zones.length;
    se += w.spots.filter((x) => x.secret).length + w.paths.filter((x) => x[2] === 'secret').length; }
  assert.equal(sp, 471); assert.equal(pa, 654); assert.equal(zo, 118); assert.equal(se, 107);
  assert.equal(M.WORLD_GEOGRAPHY.connections.length, 14);
  assert.equal(M.WORLD_GEOGRAPHY.connections.filter((c) => c.gate).length, 13);
  assert.equal(arr(M.worldCorridors()).length, 13); assert.equal(arr(M.walkCorridorSpecs()).length, 10);
  const s = h.api.state();
  for (const id of ['forest', 'jungle', 'deepsea', 'star_stop', 'home']) {
    const r = h.api.REGIONS.find((x) => x.id === id);
    if (!r) continue;
    h.api.travelToRegion(r, { id });
    assert.equal(s.regionId, id, id + ' へ たびで 行ける');
  }
  assert.ok(!/corridor/i.test(JSON.stringify(Object.keys(s))));
});
