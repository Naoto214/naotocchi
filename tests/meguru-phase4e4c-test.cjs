// Phase 4E-4C: HIGH 2 本(city|countryside・countryside|forest)を あるいて こえる → walk 10 本 ぜんぶ corridor
//   ・曲がり: city|countryside は turn spread(level 2)、countryside|forest は 道 ぜんぶ 一定の 曲率(level 3)。
//     曲がる 量・両はしの むき・ぎゃく むき の かたちは 4E-1 の まま。2 かいめ(1.4 倍)でも 30°/s いか。はやさの 上限(cap)は つかわない
//   ・景色: まち(灰) → 道 / 畑 → 村、村 / 畑 → 雑木林 → 深い 森。home の いろ・いえ(🏠🌷🌼🪴)を まぜない。背景は 1 回だけ
//   ・gate の 表(地域 × spot × connection × mode)と special(ふね・ゴンドラ・もぐる)の 表
// 10 本 ぜんぶの 不変(許可リスト・preload・reload・fallback・27 にん・U ターン)は meguru-phase4e4a-test.cjs の 表、
// しくみ(じょうたい・10 往復 など)は meguru-phase4e3-test.cjs、曲がりの ひろげ方 は meguru-phase4e4b-test.cjs が 正本。ここでは くりかえさない
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');

const arr = (x) => Array.from(x || []);
const HIGH = ['city|countryside', 'countryside|forest'];
const SPECIAL = ['jungle|sea', 'deepsea|sea', 'countryside|star_stop'];
const HOME_WORDS = ['🏠', '🌷', '🌼', '🪴'];   // CORRIDOR_REGION_TERRAIN の まえ の urban-edge(home の いえなみ)
const angDiff = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return Math.min(d, 360 - d); };
const rgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));

function setup(o = {}) {
  const h = harness({ fullDisplay: true });
  const M = h.api.meguruMod, s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, regionId: o.region || 'home' });
  h.api.render();
  return { h, M, s };
}
function run(o = {}) {
  const { h, M, s } = setup(o);
  const B = h.api.meguruBridge, pad = { vec: { x: 0, y: 0 } }, real = B.createTouchPad;
  B.createTouchPad = (row, opts) => { const p = real(row, opts); return Object.assign({}, p, { vector: () => pad.vec, destroy: p.destroy }); };
  const realPrep = B.prepareIllustrations;
  B.prepareIllustrations = (sc, ac, opts) => (opts && opts.decode && !arr(ac).length) ? Promise.resolve(true) : (realPrep ? realPrep(sc, ac, opts) : Promise.resolve(true));
  if (o.perfTier != null) B.perfTier = () => o.perfTier;
  if (o.reduced) h.window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  const distant = [];
  const r = M.start(h.document.getElementById('meguruOverlay'), { renderer: () => ({ draw() {}, destroy() {}, setDistant(d) { distant.push(d); } }) });
  h.advance(300);
  const go = (to) => {
    const g = r.sim.gates.find((q) => q.to === to), b = g.bearing || (g.out === 'far' ? { x: 0, z: 1 } : { x: 0, z: -1 });
    pad.vec = { x: 0, y: 0 };
    r.setPlayer(g.spot.x - b.x * (g.spot.r + 200), g.spot.z - b.z * (g.spot.r + 200)); h.advance(100);
    r.setPlayer(g.spot.x - b.x * 40, g.spot.z - b.z * 40); r.sim.camera.yaw = Math.atan2(b.x, b.z);
    pad.vec = { x: 0, y: -1 };
    return g;
  };
  const enter = () => { for (let i = 0; i < 100 && !r.corridor; i++) h.advance(50); return r.corridor; };
  const $ = (q) => h.document.getElementById('meguruOverlay').querySelector(q);
  return { h, M, s, r, B, pad, go, enter, distant, $ };
}
function measuredRates(M, spec, from) {
  const d = [];
  for (let x = 1; x <= spec.walkLength; x += 1) d.push(angDiff(M.corridorHeadingAt(spec, from, x), M.corridorHeadingAt(spec, from, x - 1)));
  return d;
}

test('1. 曲がりの 表(10 本): どれも 2 かいめ 30°/s いか・倍率 1.4(cap なし)。HIGH 2 本は city|countryside = level 2、countryside|forest = 一定 曲率(level 3)', () => {
  const { M } = setup();
  // level 3 = 道 ぜんぶ 一定の 曲率(はしの ゆるめ なし・まっすぐ なし)。levels は ゆるい じゅん
  const T = arr(M.CORRIDOR_TURN_SPREAD);
  assert.deepEqual(T.map((p) => p.level), [0, 1, 2, 3]);
  assert.deepEqual({ margin: T[3].margin, ramp: T[3].ramp }, { margin: 0, ramp: 0 });
  const table = {};
  for (const id of arr(M.CONTINUOUS_WALK_ALLOWLIST)) {
    const sp = M.walkCorridorSpec(id), cor = arr(M.worldCorridors()).find((c) => c.id === id);
    table[id] = { bend: cor.bend, level: sp.curveProfile.spread, first: sp.turnRate.first, revisit: sp.turnRate.revisit, mult: sp.timing.revisitSpeedMultiplier };
    assert.ok(sp.turnRate.revisit <= 30, `${id} ${sp.turnRate.revisit}`);
    assert.equal(sp.timing.revisitSpeedMultiplier, 1.4, id + ' 1.4 の まま');
    assert.ok(!('maxRevisitSpeedMultiplier' in sp.timing) && !('speedCap' in sp.timing), id + ' はやさの 上限 なし');
    assert.ok(Math.abs(sp.timing.revisitSec - sp.walkLength / (M.RULES.playerSpeed * 1.4)) < 0.01, id);
    // えらばれた level は めやす(28)に おさまる いちばん ゆるい もの
    const lv = M.corridorTurnSpread(sp.headingProfile.turn, sp.walkLength);
    assert.equal(lv.level, sp.curveProfile.spread, id);
  }
  assert.equal(Object.keys(table).length, 10);
  assert.equal(table['city|countryside'].level, 2);
  assert.ok(table['city|countryside'].revisit <= 28, JSON.stringify(table['city|countryside']));
  assert.equal(table['countryside|forest'].level, 3);
  assert.ok(table['countryside|forest'].revisit <= 29, JSON.stringify(table['countryside|forest']));
  assert.ok(Math.max(...Object.values(table).map((q) => q.revisit)) <= 29, '10 本 の いちばん はやい 2 かいめ');
});

test('2. countryside|forest の 一定 曲率: 行き / 帰り とも 道 ぜんぶ おなじ はやさで 曲がる。曲がる 量・両はし の むき・ぎゃく むき は 4E-1 の まま', () => {
  const { M } = setup();
  const sp = M.walkCorridorSpec('countryside|forest'), hp = sp.headingProfile, L = sp.walkLength, cor = arr(M.worldCorridors()).find((c) => c.id === sp.connectionId);
  assert.ok(Math.abs(Math.abs(hp.turn) - cor.bend) < 0.01, '曲がる 量 = bend');
  assert.ok(angDiff(M.corridorHeadingAt(sp, sp.a, 0), hp.startGlobal) < 1e-3 && angDiff(M.corridorHeadingAt(sp, sp.a, L), hp.endGlobal) < 1e-3, '両はし');
  for (const from of [sp.a, sp.b]) {
    const d = measuredRates(M, sp, from), mean = d.reduce((a, b) => a + b, 0) / d.length;
    assert.ok(Math.max(...d) - Math.min(...d) < 1e-6, `${from} 一定 ${Math.min(...d)}〜${Math.max(...d)}`);
    assert.ok(Math.abs(mean - Math.abs(hp.turn) / L) < 1e-6, from);
    assert.ok(Math.abs(Math.max(...d) * 260 * 1.4 - sp.turnRate.revisit) < 0.05, `${from} 2 かいめ ${sp.turnRate.revisit}`);
  }
  for (const s of [0, 1, 450, 1125, 2000, L]) assert.ok(angDiff(M.corridorHeadingAt(sp, sp.b, s), (M.corridorHeadingAt(sp, sp.a, L - s) + 180) % 360) < 1e-6, `ぎゃく むき s=${s}`);
  // city|countryside は level 2: はしを ゆるめる(ramp 0.1)。まんなかは 一定
  const cc = M.walkCorridorSpec('city|countryside'), dc = measuredRates(M, cc, cc.a);
  assert.ok(dc[0] < dc[Math.floor(dc.length / 2)] * 0.2, 'city|countryside の はしは ゆるい');
});

test('3. カメラ・なかま 27 にん(HIGH 2 本 × 行き / 帰り、2 かいめ 1.4 倍 + とちゅうの U ターン): カメラは 上限 いか、なかまは とばない・ひろがらない', () => {
  const { M } = setup();
  const comps = Array.from({ length: 27 }, (_, i) => ({ id: 'p' + i, x: 0, z: 0, emoji: '🐰', follow: true, behavior: 'idle', heading: 0, face: 1, bob: 0 }));
  let base = 0;   // home|forest(4E-2 で 採用)の なかまの ひろがり が ものさし
  for (const id of ['home|forest'].concat(HIGH)) {
    const spec = M.walkCorridorSpec(id);
    for (const from of [spec.a, spec.b]) {
      const e = spec.endpoints[from], party = comps.map((a, k) => Object.assign({}, a, { x: e.x + (k % 5) * 12 - 24, z: e.z - 20 - Math.floor(k / 5) * 14 }));
      const w = M.createCorridorWalk(spec, from, { firstVisit: false, party }), dt = 1 / 60;
      let prevYaw = w.camera.yaw, maxYaw = 0, flips = 0, lastSign = 0, maxJump = 0, maxOut = 0, prevPos = party.map((a) => [a.x, a.z]);
      const stepAll = (input, i, countFlips) => {
        w.step(dt, input);
        const d = Math.atan2(Math.sin(w.camera.yaw - prevYaw), Math.cos(w.camera.yaw - prevYaw)); prevYaw = w.camera.yaw;
        maxYaw = Math.max(maxYaw, Math.abs(d) / dt);
        const sg = Math.abs(d) > 1e-4 ? Math.sign(d) : 0; if (countFlips && sg && lastSign && sg !== lastSign) flips++; if (sg) lastSign = sg;
        assert.ok(Math.abs(w.state.u) <= M.corridorStageAt(spec, from, w.state.s).uMax + 1e-6, `${id} 帯の なか`);
        party.forEach((a, k) => { maxJump = Math.max(maxJump, Math.hypot(a.x - prevPos[k][0], a.z - prevPos[k][1])); if (i > 120) maxOut = Math.max(maxOut, Math.hypot(a.x - w.player.x, a.z - w.player.z)); });
        prevPos = party.map((a) => [a.x, a.z]);
      };
      let i = 0;
      for (; i < 60 * 12 && w.state.s < spec.walkLength - 5; i++) stepAll({ x: 0, y: -1 }, i, true);
      assert.ok(w.state.s >= spec.walkLength - 5, `${id} ${from} さいごまで`);
      assert.ok(maxYaw <= M.RULES.cam.turnRate + 1e-6, `${id} ${from} カメラ ${maxYaw.toFixed(2)}`);
      assert.ok(flips <= 2, `${id} ${from} ふらつき ${flips}`);
      assert.ok(maxJump <= 20, `${id} ${from} なかま 1 frame ${maxJump.toFixed(1)}`);
      if (id === 'home|forest') { base = Math.max(base, maxOut); continue; }
      assert.ok(maxOut <= base * 1.02, `${id} ${from} ひろがり ${maxOut.toFixed(0)} / ${base.toFixed(0)}`);
      // U ターン: いちど 60% まで もどって から ひきかえす(むきが かわっても カメラ・なかま は とばない)
      const w2 = M.createCorridorWalk(spec, from, { firstVisit: false, party });
      let py = w2.camera.yaw, uYaw = 0, uJump = 0, pp = party.map((a) => [a.x, a.z]), back = false, turned = 0;
      for (let k = 0; k < 60 * 20; k++) {
        if (!back && w2.state.s >= spec.walkLength * 0.6) { back = true; turned = w2.state.s; }
        w2.step(dt, back ? { x: 0, y: 1 } : { x: 0, y: -1 });
        const d = Math.atan2(Math.sin(w2.camera.yaw - py), Math.cos(w2.camera.yaw - py)); py = w2.camera.yaw; uYaw = Math.max(uYaw, Math.abs(d) / dt);
        party.forEach((a, q) => { uJump = Math.max(uJump, Math.hypot(a.x - pp[q][0], a.z - pp[q][1])); }); pp = party.map((a) => [a.x, a.z]);
        if (back && w2.state.s <= 1) break;
      }
      assert.ok(back && turned >= spec.walkLength * 0.6 && w2.state.s <= 1, `${id} ${from} U ターン して もどった ${w2.state.s.toFixed(0)}`);
      assert.ok(uYaw <= M.RULES.cam.turnRate + 1e-6, `${id} ${from} U ターンの カメラ ${uYaw.toFixed(2)}`);
      assert.ok(uJump <= 20, `${id} ${from} U ターンの なかま ${uJump.toFixed(1)}`);
    }
  }
});

test('4. 景色 city|countryside: まち(灰 / ネオン) → 道・畑 → 村。いろは ひとつの むき、背景は 1 回、home の いえ・海 を まぜない', () => {
  const { M } = setup();
  const sp = M.walkCorridorSpec('city|countryside'), n = sp.stageCount, SL = sp.stageLength;
  for (const from of [sp.a, sp.b]) {
    const to = from === sp.a ? sp.b : sp.a, W = M.createCorridorWalk(sp, from, {}).world;
    const per = Array.from({ length: n }, () => []); for (const p of W.props) if (!p.blocker) per[Math.min(n - 1, Math.floor((p.s || 0) / SL))].push(p.emoji || p.struct);
    const citySide = from === 'city' ? per[0] : per[n - 1], farmSide = from === 'city' ? per[n - 1] : per[0];
    assert.ok(citySide.filter((e) => ['🏢', '🏬', '🪧', '🚲', '🗑️'].includes(e)).length >= 4, `まちがわ ${citySide.join('')}`);
    assert.ok(farmSide.filter((e) => ['🌾', '🌻', '🌳', 'hayroll', 'cropline', '🏡'].includes(e)).length >= 4, `村がわ ${farmSide.join('')}`);
    assert.ok(!per.flat().some((e) => HOME_WORDS.includes(e) || ['🌴', '🐚', '⛵'].includes(e)), `${from}→ home の いえ・海 なし`);
    const A0 = rgb(M.WORLDS[from].ground[0]), B0 = rgb(M.WORLDS[to].ground[0]), ax = B0.map((v, i) => v - A0[i]), n2 = ax.reduce((u, v) => u + v * v, 0);
    const proj = (t) => { W.setProgress(t); return rgb(W.ground[0]).reduce((u, v, i) => u + (v - A0[i]) * ax[i], 0) / n2; };
    let back = 0, flips = 0, prev = null; const bds = new Set();
    for (let t = 0.02; t <= 1.0001; t += 0.02) { back = Math.max(back, proj(t - 0.02) - proj(t)); W.setProgress(t); bds.add(W.backdrop); if (prev && prev !== W.backdrop) flips++; prev = W.backdrop; }
    assert.ok(back <= 0.03, `${from}→ いろが もどる ${back.toFixed(3)}`);
    assert.deepEqual([...bds].sort(), ['farhills', 'neonskyline']); assert.equal(flips, 1, from);
  }
});

test('5. 景色 countryside|forest: 村・畑 → 雑木林 → 深い 森。村の はしは countryside の いろ(home の いえなみ・いろ で ない)。背景は 1 回、星の ことば なし', () => {
  const { M } = setup();
  // 村の はし は 地域 × 地形 の うわがき(connection の 特別 あつかい では ない)
  const edge = M.CORRIDOR_REGION_TERRAIN.countryside['urban-edge'];
  assert.equal(edge.palette, 'countryside');
  assert.ok(!arr(edge.near).concat(arr(edge.far)).some(([e]) => HOME_WORDS.includes(e)));
  const sp = M.walkCorridorSpec('countryside|forest'), n = sp.stageCount, SL = sp.stageLength, FOREST = ['🌲', '🌿', '🍄', '🪵', '🍂', 'fern'];
  for (const from of [sp.a, sp.b]) {
    const to = from === sp.a ? sp.b : sp.a, W = M.createCorridorWalk(sp, from, {}).world;
    const per = Array.from({ length: n }, () => []); for (const p of W.props) if (!p.blocker) per[Math.min(n - 1, Math.floor((p.s || 0) / SL))].push(p.emoji || p.struct);
    const ord = from === 'countryside' ? per : per.slice().reverse();   // 村 → 森 の じゅん
    assert.ok(!per.flat().some((e) => HOME_WORDS.includes(e)), `${from}→ home の いえなみ なし ${per[0].join('')}`);
    assert.ok(!per.flat().some((e) => ['⭐', '🌟', '✨', '🚡', '🌙'].includes(e)), `${from}→ 星の ことば なし`);
    assert.ok(ord[0].filter((e) => ['🌾', '🌻', '🏡', 'fence', 'cropline', 'hayroll'].includes(e)).length >= 4, `村 ${ord[0].join('')}`);
    for (const k of [n - 2, n - 1]) assert.ok(ord[k].filter((e) => FOREST.includes(e)).length >= 6, `森 ${ord[k].join('')}`);
    const fr = (st) => st.filter((e) => FOREST.includes(e)).length / Math.max(1, st.length);
    assert.ok(fr(ord[0]) < fr(ord[2]) && fr(ord[2]) <= fr(ord[n - 1]) + 1e-9, `森の ことばは ふえて いく ${ord.map(fr).map((v) => v.toFixed(2))}`);
    W.setProgress(0.01); const c0 = rgb(W.ground[0]), home = rgb(M.WORLDS.home.ground[0]), cs = rgb(M.WORLDS.countryside.ground[0]);
    if (from === 'countryside') assert.ok(Math.max(...c0.map((v, i) => Math.abs(v - cs[i]))) < Math.max(...c0.map((v, i) => Math.abs(v - home[i]))), '村の はし は countryside の いろ');
    const A0 = rgb(M.WORLDS[from].ground[0]), B0 = rgb(M.WORLDS[to].ground[0]), ax = B0.map((v, i) => v - A0[i]), n2 = ax.reduce((u, v) => u + v * v, 0);
    const proj = (t) => { W.setProgress(t); return rgb(W.ground[0]).reduce((u, v, i) => u + (v - A0[i]) * ax[i], 0) / n2; };
    let back = 0, flips = 0, prev = null; const bds = new Set();
    for (let t = 0.02; t <= 1.0001; t += 0.02) { back = Math.max(back, proj(t - 0.02) - proj(t)); W.setProgress(t); bds.add(W.backdrop); if (prev && prev !== W.backdrop) flips++; prev = W.backdrop; }
    assert.ok(back <= 0.03, `${from}→ いろが もどる ${back.toFixed(3)}`);
    assert.deepEqual([...bds].sort(), ['farhills', 'treeline']); assert.equal(flips, 1, from);
  }
});

test('6. HIGH 2 本 × 行き / 帰り(start): あるく あいだ たび・ちず は つかえない / もどる・パッド は つかえる、着くと もとどおり。遠景に ゴンドラ(星の とまりば)の ひかり は 出ない。はっけんは 1 回', () => {
  const { M } = setup();
  assert.ok(arr(M.distantFeatures('countryside')).some((f) => f.viaConnection === 'countryside|star_stop'), 'ゴンドラ の 遠景 は ある(みつける まで かくす)');
  for (const id of HIGH) {
    const [a, b] = id.split('|');
    const R = run({ region: a });
    for (const [from, to] of [[a, b], [b, a], [a, b]]) {
      R.distant.length = 0;
      R.go(to); const c = R.enter();
      assert.ok(c && c.connectionId === id, `${id} ${from}→${to}`);
      assert.equal(R.$('#mgrTravel').disabled, true, 'たび は つかえない'); assert.equal(R.$('#mgrMap').disabled, true, 'ちず は つかえない');
      assert.equal(R.$('#mgrHome').disabled, false, 'もどる は つかえる'); assert.ok(R.$('#mgrTalk').classList.contains('hidden'), 'はなす(context)は 出ない');
      for (let i = 0; i < 800 && R.r.corridor; i++) R.h.advance(50);
      assert.equal(R.s.regionId, to);
      assert.equal(R.$('#mgrTravel').disabled, false); assert.equal(R.$('#mgrMap').disabled, false);
      assert.ok(R.distant.length > 0, 'あるく あいだ 遠景を わたす');
      assert.ok(!R.distant.some((d) => arr(d.list).some((v) => v.feature && v.feature.viaConnection === 'countryside|star_stop')), `${id} ${from}→${to} ゴンドラ の ひかり なし`);
    }
    assert.equal(arr(R.B.worldLinks()).filter((x) => x === id).length, 1, id + ' はっけんは 1 回');
    assert.equal(R.r.corridorStats.enters, 3); assert.equal(R.r.corridorStats.preload.commits, 3); assert.equal(R.r.corridorStats.preload.fallbacks, 0);
    R.r.stop();
  }
});

test('7. HIGH 2 本 の fallback(start): よいやすい せってい・perfTier 2 は corridor を つかわず いまの transition で 着く', () => {
  for (const id of HIGH) {
    const [from, to] = id.split('|');
    for (const o of [{ reduced: true }, { perfTier: 2 }]) {
      const R = run(Object.assign({ region: from }, o));
      R.go(to);
      for (let i = 0; i < 80 && R.s.regionId === from; i++) R.h.advance(50);
      assert.equal(R.s.regionId, to, `${id} ${JSON.stringify(o)}`);
      assert.equal(R.r.corridorStats.enters, 0, `${id} ${JSON.stringify(o)} corridor なし`);
      R.r.stop();
    }
  }
  const { M } = setup();
  for (const id of HIGH) {
    const [a] = id.split('|'), g = arr(M.regionGates(a, M.buildWorld(a, M.buildRegistry()))).find((q) => q.id === id);
    assert.equal(M.continuousWalkMode(g, { reducedMotion: true }).reason, 'reduced-motion');
    assert.equal(M.continuousWalkMode(g, { perfTier: 2 }).reason, 'perf-tier');
    assert.equal(M.continuousWalkMode(g, { failed: new Set([id]) }).reason, 'build-failure');
    assert.equal(M.continuousWalkMode(g, { perfTier: 1 }).mode, 'corridor');
  }
});

test('8. gate の 表(13 地域 × 出口): 地域 × spot × connection × mode。walk 10 本 × 2 = 20 出口 は corridor、special 5 出口 は transition、memory_lake は 出口 なし', () => {
  const { M } = setup();
  const rows = [];
  for (const region of Object.keys(M.WORLDS)) for (const g of arr(M.regionGates(region, M.buildWorld(region, M.buildRegistry())))) {
    const m = M.continuousWalkMode(g, {});
    rows.push([region, g.spot.id, g.id, g.at, m.mode].join(' '));
  }
  assert.deepEqual(rows.sort(), [
    'city boatpier city|sea port corridor', 'city cross4 city|countryside terracelook corridor', 'city stalls city|desert caravan corridor',
    'countryside skyland countryside|star_stop stop transition', 'countryside terracelook city|countryside cross4 corridor', 'countryside woods countryside|forest anc2 corridor',
    'deepsea reef deepsea|sea seacave transition',
    'desert caravan city|desert stalls corridor', 'desert gate desert|mountain windnotch corridor',
    'forest anc2 countryside|forest woods corridor', 'forest entry home|forest bigtree corridor', 'forest stonelook forest|mountain lookout1 corridor',
    'home bigtree home|forest entry corridor', 'home bigtree home|river_lake riverside corridor',
    'jungle entry jungle|sea breakwater transition',
    'mountain foot mountain|river_lake lakelook corridor', 'mountain lookout1 forest|mountain stonelook corridor', 'mountain summit snow|mountain peak corridor', 'mountain windnotch desert|mountain gate corridor',
    'river_lake lakelook mountain|river_lake foot corridor', 'river_lake riverside home|river_lake bigtree corridor',
    'sea breakwater jungle|sea entry transition', 'sea port city|sea boatpier corridor', 'sea seacave deepsea|sea reef transition',
    'snow peak snow|mountain summit corridor',
    'star_stop stop countryside|star_stop skyland transition',
  ].sort());
  assert.equal(rows.filter((r) => r.endsWith(' corridor')).length, 20);
  assert.deepEqual(arr(M.regionGates('memory_lake', M.buildWorld('memory_lake', M.buildRegistry()))), []);
  // countryside: 森・まち は corridor、ゴンドラ(star_stop)は transition
  const cs = rows.filter((r) => r.startsWith('countryside '));
  assert.deepEqual(cs.map((r) => r.split(' ').slice(2).join(' ')).sort(), ['city|countryside cross4 corridor', 'countryside|forest anc2 corridor', 'countryside|star_stop stop transition']);
});

test('9. special の 表(ふね・ゴンドラ・もぐる): 許可リストに いれても walk で ない ので transition。corridor の spec も ない', () => {
  const { M } = setup();
  for (const id of SPECIAL) {
    assert.ok(!arr(M.CONTINUOUS_WALK_ALLOWLIST).includes(id), id);
    assert.equal(M.walkCorridorSpec(id), null, id);
    const cor = arr(M.worldCorridors()).find((c) => c.id === id);
    assert.ok(cor && cor.kind !== 'walk', `${id} kind ${cor && cor.kind}`);
    for (const region of id.split('|')) {
      const g = arr(M.regionGates(region, M.buildWorld(region, M.buildRegistry()))).find((q) => q.id === id);
      assert.ok(g, `${id} ${region}`);
      const m = M.continuousWalkMode(g, { allow: arr(M.CONTINUOUS_WALK_ALLOWLIST).concat(SPECIAL) });
      assert.deepEqual([m.mode, m.reason], ['transition', 'not-walk'], `${id} ${region}`);
    }
  }
});

test('10. 端の いろ の きまり(地形 × 地域 の きまり で、本ごと で ない): 10 本 の 端の 段を ほかの 地域の いろの 地形に かえても、道の はしは 端の 地域の いろ', () => {
  const { M } = setup();
  // いまの 10 本は 端の 段が みな 端の 地域の いろ(4E-4C の 村の はし で さいごの 1 本 も そろった)。きまり が のこって いる ことを 地形を かえて たしかめる
  const dist = (a, b) => Math.max(...rgb(a).map((v, k) => Math.abs(v - rgb(b)[k])));
  const foreign = (region) => ['dry', 'river', 'forest', 'field', 'shore'].find((t) => M.corridorStageLook(t, region).palette !== region);
  for (const id of arr(M.CONTINUOUS_WALK_ALLOWLIST)) {
    const sp = JSON.parse(JSON.stringify(M.walkCorridorSpec(id))), n = sp.stages.length;
    const ta = foreign(sp.a), tb = foreign(sp.b);
    sp.stages[0].terrain = sp.terrainStages[0] = ta; sp.stages[n - 1].terrain = sp.terrainStages[n - 1] = tb;
    assert.notEqual(M.corridorStageLook(ta, sp.a).palette, sp.a); assert.notEqual(M.corridorStageLook(tb, sp.b).palette, sp.b);
    for (const from of [sp.a, sp.b]) {
      const to = from === sp.a ? sp.b : sp.a, W = M.createCorridorWalk(sp, from, {}).world;
      W.setProgress(0.01); assert.ok(dist(W.ground[0], M.WORLDS[from].ground[0]) <= 6, `${id} ${from} はじめ ${W.ground[0]}`);
      W.setProgress(0.99); assert.ok(dist(W.ground[0], M.WORLDS[to].ground[0]) <= 6, `${id} ${to} おわり ${W.ground[0]}`);
    }
  }
});
