// めぐる scenery polish 第3段階(13 地域 の 最終 visual QA)の 正本。
//
// 13 地域 を ならべて 見て RED に した 2 つ だけ を、見た目 だけ で なおす:
//   ・city       : おなじ 絵 の ビル(🏢 / 🏬)が はんこ の ように ならぶ → 1 つ ずつ 大きさ と たかさ を かえて えがく。
//                  prop.size・いち・当たり判定 は かえない(えがく とき の かけざん だけ)
//   ・river_lake : 朝 と 夜 の かわ の もや が、ふち の かたい 3 本 の おび(しましま)に 見えた →
//                  1 まい の たて の グラデーション に して ふち を ぼかす
// 13 地域 の world 出力・当たり判定・出口・探索率・セーブ は 1 つも かわらない。
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
    return (...a) => { log.push([k, a, o.fillStyle]); };
  }, set(o, k, v) { o[k] = v; return true; } });
}
function setup(regionId = 'city', time = 'day') {
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

// ────────────────────────────── city: ビル の ばらつき

test('city: ばらつき は city の 🏢 / 🏬 だけ。ほか の 地域 と 絵 は そのまま', () => {
  const { M } = setup();
  assert.deepEqual(Object.keys(M.EMOJI_VARY), ['city']);
  assert.deepEqual(Object.keys(M.EMOJI_VARY.city).sort(), ['🏢', '🏬'].sort());
  for (const rid of Object.keys(M.WORLDS)) if (rid !== 'city') assert.equal(M.emojiVary(rid, '🏢', 100, 200), null, rid);
  for (const e of ['🌳', '🚦', '🏪', '🚉']) assert.equal(M.emojiVary('city', e, 100, 200), null, e);
});

test('city: おなじ いち は いつも おなじ 大きさ(決定的)。はば と たかさ は きめた はんい の なか', () => {
  const { M } = setup();
  const w = fixedWorld(M, 'city');
  const blds = w.props.filter((p) => p.emoji === '🏢' || p.emoji === '🏬');
  assert.ok(blds.length > 100);
  const ws = new Set(), hs = new Set();
  for (const p of blds) {
    const [lo, hi, grow] = M.EMOJI_VARY.city[p.emoji];
    const v = M.emojiVary('city', p.emoji, p.x, p.z);
    assert.deepEqual([...v], [...M.emojiVary('city', p.emoji, p.x, p.z)], 'おなじ いち → おなじ');
    assert.ok(v[0] >= lo - 1e-9 && v[0] <= hi + 1e-9, `はば ${v[0]}`);
    assert.ok(v[1] >= v[0] - 1e-9 && v[1] <= v[0] * grow + 1e-9, `たかさ ${v[1]}`);
    ws.add(v[0].toFixed(2)); hs.add((v[1] / v[0]).toFixed(2));
  }
  assert.ok(ws.size > 20 && hs.size > 15, 'はんこ に ならない くらい ばらける');
});

test('city: 絵文字 を えがく ところ で ばらつき を わたす(ほか の 絵文字 は いままで どおり)', () => {
  const s = src();
  assert.match(s, /const vary = emojiVaryOf\(world\.regionId, it\.o\);\s*if \(vary\) drawScenery\(it\.o\.emoji, it\.p\.sx, it\.p\.sy, px, vary\[0\], vary\[1\]\); else drawScenery\(it\.o\.emoji, it\.p\.sx, it\.p\.sy, px\);/);
  assert.match(s, /function drawGlyph\(emoji, sx, sy, px, scenery, kw = 1, kh = 1\)/, 'kw / kh の きめ は 1(ほか の よびだし は かわらない)');
});

test('city: 1 フレーム で えがく ビル の たて よこ の ひ が ばらける', () => {
  const { h, log } = setup('city');
  assert.equal(h.api.startMeguru(), true);
  h.advance(1800);
  const r = h.api.meguruRun();
  const sp = r.world.spots.find((q) => q.id === 'square');
  r.setPlayer(sp.x, sp.z - 200); h.advance(400);
  log.length = 0; h.advance(17);
  // drawImage(c, x, y, w, h): おなじ 絵(c)の たて / よこ の ひ を あつめる
  const byImg = new Map();
  for (const [k, a] of log) if (k === 'drawImage' && a.length === 5 && a[3] > 0) { const arr = byImg.get(a[0]) || []; arr.push((a[4] / a[3]).toFixed(3)); byImg.set(a[0], arr); }
  const spread = Math.max(0, ...[...byImg.values()].map((arr) => new Set(arr).size));
  h.api.stopMeguru();
  assert.ok(spread >= 3, `おなじ 絵 でも たて よこ の ひ が ${spread} とおり`);
});

test('city: props・当たり判定 は そのまま(えがく とき だけ)', () => {
  const { M } = setup();
  const w = fixedWorld(M, 'city');
  assert.equal(w.props.length, 1013);
  assert.equal(M.buildObstacles(w).length, 390);
  assert.equal(w.props.map((p) => M.colliderOf(p)).filter(Boolean).length, 565);
});

// ────────────────────────────── river_lake: かわ の もや

function riverFrame(time) {
  const { h, log, grads } = setup('river_lake', time);
  assert.equal(h.api.startMeguru(), true);
  h.advance(1800);
  const r = h.api.meguruRun();
  const sp = r.world.spots.find((q) => q.id === 'reeds');
  r.setPlayer(sp.x, sp.z - 200); h.advance(400);
  grads.length = 0; log.length = 0; h.advance(17);
  const out = { grads: grads.slice(), log: log.slice() };
  h.api.stopMeguru();
  return out;
}
const isMist = (g) => g.stops.length === 7 && g.stops.every(([, c]) => /^rgba\(230,240,250,/.test(c));

for (const time of ['night', 'morning']) test(`river_lake(${time}): もや は ふち を ぼかした 1 まい。かたい おび は ない`, () => {
  const { grads, log } = riverFrame(time);
  const mist = grads.find(isMist);
  assert.ok(mist, 'もや の グラデーション');
  assert.ok(log.some(([k, , fs]) => k === 'fillRect' && fs === mist), 'もや を ぬって いる');
  const a = mist.stops.map(([, c]) => +/,([\d.]+)\)$/.exec(c)[1]);
  assert.equal(a[0], 0); assert.equal(a[a.length - 1], 0, 'うえ と した の ふち は すきとおり');
  assert.ok(Math.max(...a) <= 0.14, 'もと の こさ(.14)を こえない');
  assert.ok(!log.some(([k, , fs]) => k === 'fillRect' && fs === 'rgba(230,240,250,.14)'), 'かたい おび は のこって いない');
});

test('river_lake(day): 昼 は もや を えがかない(いままで どおり)', () => {
  const { grads } = riverFrame('day');
  assert.ok(!grads.some(isMist));
});

test('river_lake: もや の とまり は 3 つ の やま(もと の 3 本 の おび の まんなか)', () => {
  const { M } = setup();
  const st = M.RIVERMIST_STOPS.map(([t, a]) => [t, a]);
  const peaks = st.filter(([, a], i) => i > 0 && i < st.length - 1 && a > st[i - 1][1] && a > st[i + 1][1]).map(([t]) => t);
  assert.deepEqual([...peaks], [0.17, 0.5, 0.83]);
  // もと の おび の まんなか(0.065 / 0.155 / 0.245)を、あたらしい はんい 0.02〜0.29 に うつした ところ
  for (const [t, c] of [[0.17, 0.065], [0.5, 0.155], [0.83, 0.245]]) assert.ok(Math.abs(0.02 + t * 0.27 - c) < 0.002);
});

// ────────────────────────────── 不変

test('counts: spot / path / zone / secret / 分母 / 遠景 / 発見レベル は 1 つも かわらない', () => {
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

test('river_lake: props・当たり判定 は そのまま', () => {
  const { M } = setup();
  const w = fixedWorld(M, 'river_lake');
  assert.equal(w.props.length, 677);
  assert.equal(M.buildObstacles(w).length, 294);
  assert.equal(w.props.map((p) => M.colliderOf(p)).filter(Boolean).length, 368);
});

test('save: 形 は かわらない(ばらつき・もや は セーブ しない)', () => {
  const { h, s } = setup('city');
  const before = Object.keys(s.lifetime.meguru).sort();
  assert.equal(h.api.startMeguru(), true);
  h.advance(1800);
  h.api.stopMeguru();
  assert.deepEqual(Object.keys(s.lifetime.meguru).sort(), before);
  assert.ok(!/vary|rivermist/i.test(JSON.stringify(s.lifetime.meguru)));
});
