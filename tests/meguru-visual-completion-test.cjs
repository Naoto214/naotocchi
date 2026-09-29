// めぐる 最終 visual completion pass の 正本。
//
// 見た目 だけ の ルール(当たり判定・発見・セーブ・corridor は かえない):
//   ・ランドマーク を ふさぐ 木 は すける(たきのみはらし の 滝)。岩・がけ(地形)は すけない
//   ・deco の 主役(つりばし など)も ながめる もの。ふさぐ 木 は すこし だけ すける
//   ・レンズ の なか に はいる ほど ちかい ランドマーク は うすく → えがかない(ていりゅうじょ の 看板)
//   ・かたがわ に はりだす がけ / ビル の あたり は その ぶん ずらす(ちょうじょう で じぶん が 見えない)
//   ・みちばた の 絵文字 も、カメラ の まえ で じぶん を かくす ほど おおきい とき だけ すける
//   ・ジャングル の 夜: さいてい の あかるさ と、みき の あいだ の もや・ぬれた は の ひかり
//   ・star_stop の 地平線 の 霞 を 地上 の こい ところ まで のばす
//   ・deco 2 か所: くぼちのみはらし に しだ、つりばし に つりばし
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { harness } = require('./helpers/runtime-harness.cjs');

function recordingCtx(log, grads) {
  const state = { imageSmoothingEnabled: true }, stack = [];
  return new Proxy(state, { get(o, k) {
    if (k in o) return o[k];
    if (k === 'save') return () => stack.push({ ...state });
    if (k === 'restore') return () => { const p = stack.pop(); if (p) Object.assign(state, p); };
    if (k === 'createLinearGradient') return (x0, y0, x1, y1) => { const g = { y0, y1, stops: [], addColorStop(t, c) { this.stops.push([t, c]); } }; grads.push(g); return g; };
    if (k === 'createRadialGradient') return () => ({ addColorStop() {} });
    if (k === 'measureText') return (t) => ({ width: String(t).length * 6 });
    if (k === 'getImageData') return () => ({ data: [] });
    return (...a) => { log.push([k, a, o.fillStyle, o.globalAlpha]); };
  }, set(o, k, v) { o[k] = v; return true; } });
}
function setup(regionId = 'forest', time = 'day') {
  const log = [], grads = [];
  const h = harness({ fullDisplay: true, canvasContext: recordingCtx(log, grads) });
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80,
    speciesLine: 'dog', stageIndex: 4, ageTicks: 500, regionId });
  s.petKey = `dog:${h.api.currentFormStageIndex()}`;
  Object.assign(s.lifetime, { timeMode: time, weatherMode: 'sunny', seasonMode: 'spring' });
  s.lifetime.meguru = { visits: 0, talkCount: 0, met: {}, talks: {}, spots: {}, zones: {}, paths: {}, marks: {}, world: { regions: [], links: [] } };
  h.api.render();
  return { h, s, M: h.api.meguruMod, log, grads };
}
const fixedWorld = (M, rid) => M.buildWorld(rid, M.buildRegistry(), {});
const src = () => fs.readFileSync(require.resolve('../meguru.js'), 'utf8');

// ────────────────────────────── ランドマーク を ふさぐ もの

test('occlusion: ランドマーク を ふさぐ 木 は すける。地形(がけ・岩)は すけない', () => {
  const { M } = setup();
  const L = M.RENDER_TUNING.occlusion.landmark;
  assert.ok(L.min >= 0.25 && L.min < M.RENDER_TUNING.occlusion.min, `木 は じぶん の とき より うすく できる: ${L.min}`);
  assert.ok(L.keyMin > L.min, 'deco の 主役 の とき は ひかえめ');
  assert.ok(L.near > 0 && L.near < 1000, 'カメラ の ちかく の もの だけ');
  const s = src();
  assert.match(s, /STRUCT_ROLE\[it\.o\.struct\] !== 'terrain'\) \{/, '地形 は のぞく');
  assert.match(s, /const spotKey = !it\.o\.landmark && it\.o\.deco && it\.o\.keep && /, 'spot の 主役 は deco の 主役 だけ');
  assert.equal(M.STRUCT_ROLE.bigtrunk, 'vegetation'); assert.equal(M.STRUCT_ROLE.cliffwall, 'terrain');
});

function standAndLook(rid, sid, target, time = 'day') {
  const ctx = setup(rid, time);
  const { h } = ctx;
  assert.equal(h.api.startMeguru(), true);
  h.advance(1800);
  const r = h.api.meguruRun();
  const s = r.world.spots.find((q) => q.id === sid);
  r.setPlayer(s.x, s.z); h.advance(200);
  r.sim.camera.yaw = Math.atan2(target[0] - s.x, target[1] - s.z);
  h.advance(900);
  ctx.log.length = 0; ctx.grads.length = 0; h.advance(17);
  return { ...ctx, r };
}

test('たきのみはらし: みき は solid の まま、いち も かわらない(すけるのは えがく とき だけ)', () => {
  const { M } = setup();
  const w = fixedWorld(M, 'forest');
  const trunk = w.props.find((p) => p.struct === 'bigtrunk' && Math.round(p.x) === -2504 && Math.round(p.z) === 5423);
  assert.ok(trunk && trunk.solid, 'solid の bigtrunk');
  assert.ok(M.colliderOf(trunk), 'あたり は のこる');
  const fl = w.spots.find((q) => q.id === 'fallslook');
  assert.deepEqual([fl.x, fl.z, fl.r], [-2200, 5500, 160]);
  assert.ok(!fl.deco && !fl.view, 'deco も view も つけて いない(カメラ も かえない)');
});

test('landmarkNearAlpha: ふつう に ながめる 大きさ は そのまま、レンズ の なか は えがかない', () => {
  const { M } = setup();
  const f = M.landmarkNearAlpha, N = M.LANDMARK_NEAR;
  for (const k of [0.2, 1.0, 1.6, 2.0, N.from]) assert.equal(f(k), 1, `k=${k}`);
  assert.ok(f((N.from + N.to) / 2) > 0 && f((N.from + N.to) / 2) < 1);
  for (const k of [N.to, 5, 10]) assert.equal(f(k), 0, `k=${k}`);
  for (const k of [NaN, 0, -1]) assert.equal(f(k), 1, `はかれない とき は そのまま: ${k}`);
  assert.ok(N.from >= 2, 'ふつう の ながめ(1.0〜1.6 ばい)を けさない');
  assert.match(src(), /const lmA = occ \* landmarkNearAlpha\(it\.o\.size \* it\.p\.s \/ H\);\s*if \(lmA <= 0\.02\) \{ curFog = 0; continue; \}/);
});

test('OCCLUDER_SHIFT: かたがわ に はりだす かたち だけ。side の ほう へ ずらす', () => {
  const { M } = setup();
  const S = M.OCCLUDER_SHIFT;
  assert.deepEqual(Object.keys(S).sort(), ['alleywall', 'building', 'cliff', 'cliffwall', 'seacliff', 'shopblock'].sort());
  for (const k of Object.keys(S)) { assert.ok(S[k] > 0 && S[k] < M.OCCLUDER_BOX[k][0] + 0.01, k); }
  const s = src();
  const n = (s.match(/it\.p\.sx \+ \(it\.o\.side < 0 \? -1 : 1\) \* \(OCCLUDER_SHIFT\[it\.o\.struct\] \|\| 0\) \* px2/g) || []).length;
  assert.equal(n, 2, 'じぶん を かくす はんてい と ランドマーク を かくす はんてい の 2 か所');
});

test('ちいさな 絵文字: みちばた の もの は、じぶん より ある ていど おおきい とき だけ すける', () => {
  const { M } = setup();
  const S = M.RENDER_TUNING.occlusion.small;
  assert.deepEqual([...S.layers].sort(), ['field', 'lane']);
  assert.ok(S.bigger >= 0.5, 'ちいさな 花 や 草 は すけない');
  assert.ok(S.box[0] < M.OCCLUDER_BOX.glyph[0] && S.box[1] < M.OCCLUDER_BOX.glyph[1], 'あたり は 絵 の まんなか だけ');
  assert.ok(S.cover >= M.RENDER_TUNING.occlusion.cover, 'かすめる だけ では すけない');
  // OCCLUDER_LAYERS そのもの は かえない(glow / field / lane は はいらない まま)
  assert.ok(!M.OCCLUDER_LAYERS.has('lane') && !M.OCCLUDER_LAYERS.has('field'));
});

// ────────────────────────────── ジャングル の 夜

test('jungle 夜: もちあげ は jungle だけ。floor と mul は ひかえめ', () => {
  const { M } = setup();
  assert.deepEqual(Object.keys(M.NIGHT_LIFT), ['jungle']);
  const J = M.NIGHT_LIFT.jungle;
  assert.ok(J.mul > 1 && J.mul <= 1.2 && J.floor > 0.4 && J.floor < 0.6, `夜らしさ を のこす: ${JSON.stringify(J)}`);
  assert.match(src(), /const nl = e\.time === 'night' && NIGHT_LIFT\[world\.regionId\]; if \(nl\) light = Math\.max\(light \* nl\.mul, nl\.floor\);/);
});

function leafNight(time) {
  const { h, grads, log } = setup('jungle', time);
  assert.equal(h.api.startMeguru(), true);
  h.advance(1800);
  const r = h.api.meguruRun();
  const s = r.world.spots.find((q) => q.id === 'clearing');
  r.setPlayer(s.x, s.z); h.advance(300);
  grads.length = 0; log.length = 0; h.advance(17);
  const out = { grads: grads.slice(), log: log.slice() };
  h.api.stopMeguru();
  return out;
}
test('jungle 夜: みき の あいだ の もや を ぬる。ぬれた は の ひかり は 1 かい の fill', () => {
  const L = setup().M.LEAF_NIGHT;
  const { grads, log } = leafNight('night');
  const haze = grads.find((g) => g.stops.length === 3 && g.stops.every(([, c]) => c.startsWith(`rgba(${L.haze},`)));
  assert.ok(haze, 'もや の グラデーション');
  assert.ok(log.some(([k, , fs]) => k === 'fillRect' && fs === haze), 'もや を ぬって いる');
  const glintFills = log.filter(([k, , fs]) => k === 'fill' && fs === `rgba(${L.glint},${L.glintA})`);
  assert.equal(glintFills.length, 1, 'ひかり は まとめて 1 かい');
  assert.ok(L.hazeA <= 0.12 && L.glintA <= 0.25, 'あかるく しすぎない');
});
test('jungle 昼: もや も ひかり も えがかない', () => {
  const L = setup().M.LEAF_NIGHT;
  const { grads, log } = leafNight('day');
  assert.ok(!grads.some((g) => g.stops.some(([, c]) => c.startsWith(`rgba(${L.haze},`))));
  assert.ok(!log.some(([k, , fs]) => k === 'fill' && fs === `rgba(${L.glint},${L.glintA})`));
});

// ────────────────────────────── star_stop

test('star_stop: 霞 は 地平線 で いちばん こく、地上 の こい ところ でも 0.7 のこる', () => {
  const { M } = setup();
  const st = M.HORIZON_HAZE.map(([t, a]) => [t, a]);
  assert.deepEqual([...st.map(([, a]) => a)], [0, 1, 0.7, 0]);
  assert.match(src(), /const hy0 = HOR - \(y1 - HOR\) \* 0\.35, hy1 = HOR \+ \(y1 - HOR\) \* 0\.95;/);
  // 地上 の いちばん こい ところ(0.4)で 霞 が 0.6 いじょう
  const tOfLand = (0.35 + 0.4) / (0.35 + 0.95);
  const i = st.findIndex(([t]) => t >= tOfLand);
  const [t0, a0] = st[i - 1], [t1, a1] = st[i];
  assert.ok(a0 + (a1 - a0) * (tOfLand - t0) / (t1 - t0) >= 0.6);
});

// ────────────────────────────── deco 2 か所

test('deco: くぼちのみはらし に しだ、つりばし に つりばし。見た目 だけ', () => {
  const { M } = setup();
  for (const [rid, id, lead, n, level] of [['forest', 'fernlook', 'fern', 3, 0], ['jungle', 'hanging', 'ropebridge', 1, 2]]) {
    const sp = M.WORLDS[rid].spots.find((q) => q.id === id);
    assert.equal(sp.deco.length, n); assert.ok(!sp.view);
    assert.equal(M.spotDiscoveryLevel(sp), level, `${id}: しらせ の レベル は そのまま`);
    const mine = fixedWorld(M, rid).props.filter((p) => p.view === id);
    assert.equal(mine.length, n);
    assert.equal(mine.find((p) => p.keep).struct, lead);
    for (const p of mine) { assert.ok(!p.solid && !p.hero && !p.landmark && p.deco); assert.equal(M.colliderOf(p), null); }
  }
});

// ────────────────────────────── 不変

test('counts: spot / path / zone / secret / 分母 / 遠景 / 発見レベル は かわらない', () => {
  const { M } = setup();
  let spots = 0, paths = 0, zones = 0, secretSpots = 0, secretPaths = 0;
  const lv = { 0: 0, 2: 0, 3: 0 };
  for (const rid of Object.keys(M.WORLDS)) {
    const b = M.WORLDS[rid];
    spots += b.spots.length; zones += b.zones.length; paths += (b.paths || []).length;
    secretSpots += b.spots.filter((q) => q.secret).length;
    for (const p of b.paths || []) { const o = p[2]; if (o === 'secret' || (o && o.kind === 'secret')) secretPaths++; }
    for (const q of b.spots) lv[M.spotDiscoveryLevel(q)]++;
  }
  assert.equal(spots, 471); assert.equal(paths, 654); assert.equal(zones, 118);
  assert.equal(secretSpots + secretPaths, 107);
  const C = M.worldCountable();
  assert.equal(C.tier1, 17); assert.equal(C.links.length, 12);
  assert.deepEqual(lv, { 0: 184, 2: 216, 3: 71 });
  const df = Object.values(M.distantRegistry()).reduce((a, v) => a + (Array.isArray(v) ? v.length : Object.keys(v).length), 0);
  assert.equal(df, 37);
});

test('collision: forest / jungle の 障害物 は main と おなじ かず(deco は solid で ない)', () => {
  const { M } = setup();
  for (const [rid, nObs, nCol] of [['forest', 469, 637], ['jungle', 552, 688]]) {
    const w = fixedWorld(M, rid);
    assert.equal(M.buildObstacles(w).length, nObs, `${rid} 障害物`);
    assert.equal(w.props.map((p) => M.colliderOf(p)).filter(Boolean).length, nCol, `${rid} collider`);
  }
});

test('save: 形 は かわらない', () => {
  const { h, s } = setup('jungle', 'night');
  const before = Object.keys(s.lifetime.meguru).sort();
  assert.equal(h.api.startMeguru(), true);
  h.advance(1800);
  h.api.stopMeguru();
  assert.deepEqual(Object.keys(s.lifetime.meguru).sort(), before);
});
