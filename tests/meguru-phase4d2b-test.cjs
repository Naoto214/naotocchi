// Phase 4D-2b — Canvas 遠景を 12 地域へ(4D-2 の しくみを そのまま 一般化)
// (docs/handoff/meguru-phase4d2b-all-regions-2026-09-23.md)
//
// ここで しばるのは
//   ・12 地域 ぜんぶで おなじ 描画パイプラインが うごく(地域の 名前で わけない)。きおくのみずうみ は 出さない
//   ・よこは 方角固定(bearing − カメラの 向き → 画面の x)。たては 方位なしの 意味の 位置(上 / 中央上 / 中央下 / 水ぎわ)
//   ・1 画面は たても ふくめて 3 / 2 / 1(性能 tier)。同じ 方角には 2 まで、山影は 1 まい
//   ・見える 条件は visibleDistant の まま(ほしぞら・しま は 見つけてから、しんかいの 下は 出口の ちかく だけ)
//   ・2D 命令は 12 地域・ぜんぶの 向き・ぜんぶの tier の 最悪でも +30 いか
//   ・セーブ・当たり判定・住民・travelToRegion()・分母は 動かない
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { harness } = require('./helpers/runtime-harness.cjs');

const arr = (x) => Array.from(x || []);
const SRC = fs.readFileSync('meguru.js', 'utf8');
const W = 338, H = 533, F = W * 0.95;
const FOV = 2 * Math.atan(W / 2 / F) * 180 / Math.PI;
const ENV = (time, weather = 'sunny', season = 'summer') => ({ time, weather, season, region: 'x' });
const wrap = (d) => ((d + 540) % 360) - 180;
const YAWS = [0, 45, 90, 135, 180, 225, 270, 315];
const COUNTED = new Set(['fill', 'stroke', 'fillRect', 'drawImage', 'fillText', 'arc', 'ellipse', 'createLinearGradient', 'createRadialGradient']);
const MAX = [3, 2, 1];

function recCtx() {
  const log = [];
  const t = { canvas: { width: W, height: H }, globalAlpha: 1, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '10px sans-serif', textAlign: 'left', textBaseline: 'alphabetic' };
  const grad = { addColorStop() {} };
  const ctx = new Proxy(t, {
    get(o, k) {
      if (k in o) return o[k];
      if (typeof k !== 'string') return undefined;
      if (k === 'measureText') return (s) => ({ width: String(s).length * 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
      if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
      return (...a) => { log.push(k); return k.startsWith('create') ? grad : undefined; };
    },
    set(o, k, v) { o[k] = v; return true; },
  });
  return { ctx, log, counted: () => log.filter((k) => COUNTED.has(k)).length };
}
let shared = null;
function setup() {
  if (!shared) { const h = harness({ fullDisplay: true }); shared = { h, M: h.api.meguruMod }; }
  return shared;
}
const ALL = (M) => M.WORLD_GEOGRAPHY.connections.map((c) => c.id);
// 見つけた みち ぜんぶ + 出口の ちかく(たての 下の ヒントも 出る いちばん おおい じょうけん)
function scene(M, o) {
  const rc = recCtx();
  const r = M.createCanvasRenderer({ canvas: {}, ctx: rc.ctx, rawCtx: rc.ctx, W, H, tier: o.tier || 0 });
  const sim = M.createSimulation({ regionId: o.region, env: o.env });
  sim.setCameraMotion(false);
  const links = o.links === undefined ? ALL(M) : o.links;
  const list = o.list || M.visibleDistant(o.region, o.env, { links }, { nearGates: o.near === false ? [] : ALL(M) });
  if (o.distant !== false) r.setDistant({ regionId: o.region, list, reduced: !!o.reduced });
  const draw = (yawDeg, now = 1000) => { sim.camera.yaw = yawDeg * Math.PI / 180; rc.log.length = 0; r.draw(sim.view(), now); return arr(r.distantShown).map((x) => Object.assign({}, x)); };
  return { r, sim, rc, list, draw };
}
const REGIONS = (M) => arr(M.FRAMED_REGIONS);

test('1. 12 地域 ぜんぶで 同じ パイプラインが うごく(start() から renderer へ)。きおくのみずうみ は 出さない', () => {
  const { M } = setup();
  assert.equal(REGIONS(M).length, 12);
  for (const region of REGIONS(M).concat(['memory_lake'])) {
    const h = harness({ fullDisplay: true });
    const s = h.api.state();
    Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, regionId: region });
    Object.assign(s.lifetime, { timeMode: 'night', weatherMode: 'sunny', seasonMode: 'summer' });
    h.api.render();
    const calls = [];
    const run = h.api.meguruMod.start(h.document.getElementById('meguruOverlay'), { renderer: () => ({ draw() {}, destroy() {}, setDistant(st) { calls.push(st); } }) });
    h.advance(900); run.stop();
    const last = calls[calls.length - 1];
    if (region === 'memory_lake') { assert.ok(calls.length >= 1 && calls.every((c) => c === null), 'きおくのみずうみ には 遠景を わたさない'); continue; }
    assert.ok(last && last.regionId === region, region + ' に 遠景の データが わたる');
    for (const v of arr(last.list)) assert.equal(v.feature.sourceRegion, region, region + ': わたすのは その 地域の 遠景だけ');
    assert.ok(calls.length <= 3, region + ': 毎フレーム わたさない: ' + calls.length);
  }
  // 出口の ちかさ も start() が きめて わたす: うみの もぐる 出口に ちかづくと しんかいの 下の けはいが 入る
  const h = harness({ fullDisplay: true }), s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, regionId: 'sea' });
  s.lifetime.meguru = Object.assign({ visits: 0, talkCount: 0, met: {}, talks: {} }, s.lifetime.meguru || {}, { world: { regions: ['sea', 'deepsea'], links: ['deepsea|sea'] } });
  h.api.render();
  const calls = [];
  const run = h.api.meguruMod.start(h.document.getElementById('meguruOverlay'), { renderer: () => ({ draw() {}, destroy() {}, setDistant(st) { calls.push(st); } }) });
  h.advance(700);
  const hasDeep = () => arr((calls[calls.length - 1] || {}).list).some((v) => v.id === 'sea>deepsea');
  assert.ok(!hasDeep(), '出口から とおい ときは 出ない');
  const g = arr(run.sim.gates).find((x) => x.id === 'deepsea|sea');
  assert.ok(g, 'もぐる 出口が ある');
  run.setPlayer(g.spot.x, g.spot.z);
  h.advance(900);
  assert.ok(hasDeep(), '出口の ちかくで 出る');
  run.stop();
});

test('2. よこは 方角固定: 12 地域の 代表 1 つずつ、yaw 0〜315 で 正しい がわへ うごく', () => {
  const { M } = setup();
  for (const region of REGIONS(M)) {
    for (const time of ['day', 'night']) {
      const S = scene(M, { region, env: ENV(time) });
      const hz = S.list.filter((v) => v.feature.bearingLocal != null).sort((a, b) => b.feature.priority - a.feature.priority);
      if (!hz.length) continue;
      const rep = hz[0];
      let seen = 0;
      for (const yaw of YAWS.concat([rep.feature.bearingLocal])) {
        const d = S.draw(yaw).find((x) => x.id === rep.id);
        const rel = wrap(rep.feature.bearingLocal - yaw);
        if (Math.abs(rel) > FOV / 2) { assert.ok(!d, `${region} yaw ${yaw}: 視野の そとの ${rep.id} は 出ない`); continue; }
        if (!d) continue;                                              // 順位・かさなりで おされた ときだけ
        seen++;
        assert.ok(Math.abs(d.x - d.dx - (W / 2 + F * Math.tan(rel * Math.PI / 180))) < 1e-6, `${region} yaw ${yaw}: x = W/2 + F·tan(rel)`);
        // 正しい がわ: 方角が みぎ(rel > 0)なら 画面の みぎ
        if (Math.abs(rel) > 1) assert.equal(Math.sign(d.x - d.dx - W / 2), Math.sign(rel), `${region} yaw ${yaw}: ${rep.id} は ${rel > 0 ? 'みぎ' : 'ひだり'}`);
      }
      assert.ok(seen >= 1, `${region} ${time}: 代表 ${rep.id} を 正面に むけると 見える`);
    }
  }
});

test('3. どの 地域も 遠景が じっさいに 画面に 出る。kind 11 種 ぜんぶ 描ける', () => {
  const { M } = setup();
  const kinds = new Set(), perRegion = {};
  for (const region of REGIONS(M)) for (const time of ['day', 'night']) {
    const S = scene(M, { region, env: ENV(time) });
    for (let yaw = 0; yaw < 360; yaw += 15) for (const d of S.draw(yaw)) { kinds.add(d.kind); perRegion[region] = (perRegion[region] || 0) + 1; }
  }
  for (const region of REGIONS(M)) assert.ok(perRegion[region] > 0, region + ' で 遠景が 出る');
  assert.deepEqual([...kinds].sort(), Object.keys(M.DISTANT_RULES).sort(), 'kind 11 種 ぜんぶ');
});

test('4. たて: 方位を もたず、意味の 位置(上 / 中央上 / 中央下 / 水ぎわ)に 出る。カメラが まわっても うごかない', () => {
  const { M } = setup();
  const want = { 'deepsea>sea': 'top', 'countryside>star_stop': 'upper', 'star_stop>countryside': 'lower', 'sea>deepsea': 'waterline' };
  for (const [id, slot] of Object.entries(want)) {
    const region = id.split('>')[0];
    const S = scene(M, { region, env: ENV('night') });
    const ys = new Set();
    for (const yaw of YAWS) {
      const d = S.draw(yaw).find((x) => x.id === id);
      assert.ok(d, `${id} は yaw ${yaw} でも 出る(方位が ない)`);
      assert.equal(d.layer, 'vertical'); assert.equal(d.slot, slot, id + ' は ' + slot);
      assert.ok(!('x' in d), 'たては 水平の 式を つかわない');
      ys.add(Math.round(d.y));
    }
    assert.equal(ys.size, 1, id + ': まわっても 同じ 高さ');
  }
  // 位置の じゅん: 上 < 中央上 < 水ぎわ(地平線) <= 中央下(地平線の した)
  const y = (id) => scene(M, { region: id.split('>')[0], env: ENV('night') }).draw(0).find((x) => x.id === id).y;
  assert.ok(y('deepsea>sea') < y('countryside>star_stop') && y('countryside>star_stop') < y('sea>deepsea') && y('sea>deepsea') <= y('star_stop>countryside') + 3);
});

test('5. 1 画面は たても ふくめて 3 / 2 / 1。同じ 方角は 2 まで、山影は 1 まい。低 tier は mid だけ', () => {
  const { M } = setup();
  const PEAK = new Set(['mountain', 'snow_mountain']);
  for (const region of REGIONS(M)) for (const time of ['day', 'evening', 'night']) for (const tier of [0, 1, 2]) {
    const S = scene(M, { region, env: ENV(time), tier });
    for (let yaw = 0; yaw < 360; yaw += 5) {
      const shown = S.draw(yaw);
      assert.ok(shown.length <= MAX[tier], `${region} ${time} tier ${tier} yaw ${yaw}: ${shown.length} <= ${MAX[tier]}`);
      if (tier === 2) for (const d of shown) assert.equal(d.layer, 'mid', `${region} 低 tier は mid だけ: ${d.id}`);
      const hz = shown.filter((d) => d.layer !== 'vertical');
      for (const a of hz) {
        const fa = S.list.find((v) => v.id === a.id).feature;
        const near = hz.filter((b) => b !== a && Math.abs(wrap(S.list.find((v) => v.id === b.id).feature.bearingLocal - fa.bearingLocal)) < 12);
        assert.ok(near.length <= 1, `${region} yaw ${yaw}: 同じ 方角に 3 まい いじょう`);
        if (PEAK.has(a.kind)) assert.ok(!near.some((b) => PEAK.has(b.kind)), `${region} yaw ${yaw}: 山影が かさなる`);
      }
    }
  }
  // 山影を 2 まい もつ 方角(森の 45°: 山 mid + 雪山 far)は 順位の たかい 山だけ
  const Fo = scene(M, { region: 'forest', env: ENV('day') });
  assert.deepEqual(Fo.draw(45).map((d) => d.id), ['forest>mountain']);
});

test('6. 見える 条件は visibleDistant の まま: ほしぞら・島は 見つけてから、下の 暗さは 出口の ちかく、街の 灯は 夕夜', () => {
  const { M } = setup();
  const has = (o, id, yaw = 0) => scene(M, o).draw(yaw).some((d) => d.id === id);
  // いなか: ほしぞらの のりばの 灯
  assert.ok(!has({ region: 'countryside', env: ENV('night'), links: [] }, 'countryside>star_stop'), '見つける まえは ほしぞらの 灯が ない');
  assert.ok(has({ region: 'countryside', env: ENV('night'), links: ['countryside|star_stop'] }, 'countryside>star_stop'), '見つけたら 出る');
  // うみ: しんかいの 下の 暗さは 出口の ちかく だけ
  assert.ok(!has({ region: 'sea', env: ENV('day'), near: false }, 'sea>deepsea'), '出口から とおいと 出ない');
  assert.ok(has({ region: 'sea', env: ENV('day') }, 'sea>deepsea'), '出口の ちかくで 出る');
  // 街の 灯(いなか 315°・森 0°・やま 315°・さばく 135°)は 昼は 出ない
  for (const [region, yaw] of [['countryside', 315], ['forest', 0], ['mountain', 315], ['desert', 135]]) {
    const day = scene(M, { region, env: ENV('day') }).draw(yaw), night = scene(M, { region, env: ENV('night') }).draw(yaw);
    assert.ok(!day.some((d) => d.kind === 'city_glow') && night.some((d) => d.kind === 'city_glow'), region + ': 街の 灯は 夜だけ');
  }
  // とかいは じぶんの 街の 灯を 遠景に 出さない
  for (const time of ['day', 'night']) { const S = scene(M, { region: 'city', env: ENV(time) }); for (let yaw = 0; yaw < 360; yaw += 15) assert.ok(!S.draw(yaw).some((d) => d.kind === 'city_glow'), 'city に city_glow は ない'); }
  // ジャングル(島)から 見えるのは 海の けはい だけ(街・さばくは 出ない)
  const J = scene(M, { region: 'jungle', env: ENV('night') });
  for (let yaw = 0; yaw < 360; yaw += 15) for (const d of J.draw(yaw)) assert.equal(d.kind, 'sea_horizon');
  // 雨は 山を かくす(4D-1 の ルール)
  assert.ok(!has({ region: 'river_lake', env: ENV('day', 'rain') }, 'river_lake>mountain'), '雨の 日は 山が 見えない');
  // 同じ 入力なら 同じ え(実時刻を よまない)
  const a = JSON.stringify(scene(M, { region: 'mountain', env: ENV('night') }).draw(315)), b = JSON.stringify(scene(M, { region: 'mountain', env: ENV('night') }).draw(315));
  assert.equal(a, b);
});

test('7. 地域の みとおし(view)で こさを おさえる: 森・ジャングルは うすい。高い ところ(やまなみ)から 見る 山は ひくい', () => {
  const { M } = setup();
  const alphaOf = (region, id, yaw) => scene(M, { region, env: ENV('day') }).draw(yaw).find((d) => d.id === id).alpha;
  assert.ok(alphaOf('forest', 'forest>mountain', 45) <= 0.7, '森の なかの 遠景は うすい');
  assert.ok(alphaOf('jungle', 'jungle>sea', 180) <= 0.45, 'ジャングルの 遠景は もっと うすい');
  assert.ok(alphaOf('river_lake', 'river_lake>mountain', 0) > 0.99, 'ひらけた ところは そのまま');
  // 水面の ある 遠景帯(みずうみ)では、遠景は 水平線に のる(水と きそわない)
  const rl = scene(M, { region: 'river_lake', env: ENV('day') }).draw(0).find((d) => d.id === 'river_lake>mountain');
  const ho = scene(M, { region: 'home', env: ENV('day') }).draw(315).find((d) => d.id === 'home>forest');
  assert.ok(rl.y0 < ho.y0 - 10, `みずうみの 遠景は 水の うえ(${rl.y0} < ${ho.y0})`);
});

test('8. よいやすい せってい: 12 地域 ぜんぶ 位置は おなじ・よこの ずれは 3 わり・ちらつかない', () => {
  const { M } = setup();
  for (const region of REGIONS(M)) {
    const A = scene(M, { region, env: ENV('night') }), B = scene(M, { region, env: ENV('night'), reduced: true });
    for (const S of [A, B]) S.sim.setPlayer(S.sim.player.x + 400, S.sim.player.z);
    for (const yaw of YAWS) {
      const a = A.draw(yaw, 1000), b = B.draw(yaw, 1000), b2 = B.draw(yaw, 2600);
      assert.deepEqual(a.map((d) => d.id), b.map((d) => d.id), region + ': えらぶ ものは おなじ');
      for (const d of a) {
        const e = b.find((x) => x.id === d.id);
        if (d.layer === 'vertical') { assert.equal(d.y, e.y); continue; }
        assert.ok(Math.abs((d.x - d.dx) - (e.x - e.dx)) < 1e-9 && Math.abs(e.dx - d.dx * 0.3) < 1e-9, region + ': ' + d.id);
      }
      for (const d of b) if (d.lights) assert.deepEqual(d.lights, b2.find((x) => x.id === d.id).lights, region + ': 明滅しない');
    }
  }
});

test('9. 2D 命令: 12 地域・ぜんぶの 向き・ぜんぶの tier の 最悪でも +30 いか', () => {
  const { M } = setup();
  let worst = { n: -1 };
  for (const region of REGIONS(M)) for (const [time, weather, season] of [['day', 'sunny', 'summer'], ['night', 'sunny', 'summer'], ['evening', 'snow', 'winter']]) for (const tier of [0, 1, 2]) {
    const on = scene(M, { region, env: ENV(time, weather, season), tier }), off = scene(M, { region, env: ENV(time, weather, season), tier, distant: false });
    for (let yaw = 0; yaw < 360; yaw += 10) {
      on.draw(yaw); off.draw(yaw);
      const n = on.rc.counted() - off.rc.counted();
      if (n > worst.n) worst = { n, region, time, tier, yaw };
      assert.ok(n >= 0 && n <= 30, `${region} ${time} tier ${tier} yaw ${yaw}: +${n}`);
    }
  }
  assert.ok(worst.n >= 1, 'はかれて いる: ' + JSON.stringify(worst));
});

test('10. renderer contract と 不変: 地域名で わけない・buildWorld / mapX を つかわない・セーブ / 当たり判定 / 住民 は そのまま', () => {
  const { M } = setup();
  const blocks = SRC.match(/^[ \t]*\/\/ ====== Phase 4D-2:[\s\S]*?\/\/ ====== \/Phase 4D-2 ======\n/gm) || [];
  assert.equal(blocks.length, 2);
  const code = blocks.join('\n').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  for (const ng of ['buildWorld', 'mapX', 'mapY', 'REGION_FRAME', 'toGlobal', 'worldMapData', 'recordWorldLinks', 'localStorage', 'performance.now', 'Date.now', 'obstacles', 'residents', 'spawn']) {
    assert.ok(!new RegExp('\\b' + ng.replace('.', '\\.') + '\\b').test(code), '4D-2 の コードは ' + ng + ' を つかわない');
  }
  assert.ok(!/DISTANT_POC/.test(SRC), 'home / sea だけ の きりかえは もう ない');
  // えがいても 世界の データは かわらない
  const before = JSON.stringify([M.distantRegistry(), M.worldCorridors(), M.REGION_FRAME]);
  const sims = {};
  for (const region of REGIONS(M)) {
    const S = scene(M, { region, env: ENV('night') });
    const w0 = JSON.stringify([S.sim.world.obstacles.length, S.sim.world.residents.length, S.sim.world.props.length]);
    for (const yaw of YAWS) S.draw(yaw);
    assert.equal(JSON.stringify([S.sim.world.obstacles.length, S.sim.world.residents.length, S.sim.world.props.length]), w0, region + ': 当たり判定・住民・もの は ふえない');
    assert.ok(!('distant' in S.sim.view()), 'view に 遠景は のせない');
    sims[region] = w0;
  }
  assert.equal(JSON.stringify([M.distantRegistry(), M.worldCorridors(), M.REGION_FRAME]), before);
  // 分母・かず
  const C = M.worldCountable();
  assert.deepEqual([C.regions.length, C.links.length, C.tier1, C.zones], [11, 12, 17, 103]);
  assert.equal(Object.values(M.distantRegistry()).reduce((n, l) => n + arr(l).length, 0), 37);
  // セーブ と たび
  const h = harness({ fullDisplay: true }), s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, regionId: 'countryside' });
  h.api.render();
  const run = h.api.meguruMod.start(h.document.getElementById('meguruOverlay'), { renderer: () => ({ draw() {}, destroy() {}, setDistant() {} }) });
  h.advance(600); run.stop();
  assert.ok(!/distant|silhouette|bearing|slot/i.test(JSON.stringify(s.lifetime.meguru || {})), 'セーブに 遠景の あとかたは ない');
  for (const id of ['jungle', 'deepsea', 'star_stop', 'forest']) {
    const r = h.api.REGIONS.find((x) => x.id === id); if (!r) continue;
    h.api.travelToRegion(r, { id }); assert.equal(s.regionId, id, id + ' へ たびで 行ける');
  }
});
