// Phase 4E-4B: MEDIUM 3 本(forest|mountain・mountain|river_lake・city|sea)を あるいて こえる
//   ・曲がりを 道 ぜんぶへ ひろげる(turn spread)。曲がる 量・両はしの むきは 4E-1 の まま。2 かいめ(1.4 倍)でも 30°/s いか
//   ・めやすに おさまる 本(4E-4A の 5 本)は 4E-1 の かたちの まま(かわらない)
//   ・カメラ・なかま 27 にん・帯の はし が あたらしい 曲がりに なめらかに ついて いく
//   ・景色: 森 → 坂 / 岩 → 山、山 → 川 → 湖(海に ならない)、まち → 運河 / 港 → 海(深い 海・ジャングル・ふね を まぜない)
// 8 本の 不変(許可リスト・preload・ぎゃく むき・reload・fallback・gate・セーブ)は meguru-phase4e4a-test.cjs の 表で 8 本 まとめて みる
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');

const arr = (x) => Array.from(x || []);
const CONT = ['home|forest', 'home|river_lake', 'city|desert', 'desert|mountain', 'snow|mountain', 'forest|mountain', 'mountain|river_lake', 'city|sea'];
const MEDIUM = ['forest|mountain', 'mountain|river_lake', 'city|sea'];
// 4E-1 の 曲がる はやさ(°/s、初回)。4E-4A の 5 本は これから かわらない
const LOW_FIRST = { 'home|forest': 10.857, 'home|river_lake': 6.212, 'city|desert': 8.686, 'desert|mountain': 7.148, 'snow|mountain': 18.884 };
const angDiff = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return Math.min(d, 360 - d); };

function setup() {
  const h = harness({ fullDisplay: true });
  return { h, M: h.api.meguruMod };
}
// 1 world ごとの むきの 変化 から はかる さいだい(°/s。はやさ 260 × 倍率)
function measuredPeak(M, spec, from, mult) {
  let peak = 0;
  for (let x = 1; x <= spec.walkLength; x += 1) peak = Math.max(peak, angDiff(M.corridorHeadingAt(spec, from, x), M.corridorHeadingAt(spec, from, x - 1)));
  return peak * 260 * mult;
}

test('1. 曲がる はやさ: 8 本 × 行き / 帰り × 初回 / 2 かいめ を はかる。MEDIUM 3 本は 2 かいめでも 28°/s いか、4E-4A の 5 本は かわらない', () => {
  const { M } = setup();
  const rows = [];
  for (const id of CONT) {
    const spec = M.walkCorridorSpec(id);
    for (const from of [spec.a, spec.b]) {
      const first = measuredPeak(M, spec, from, 1), revisit = measuredPeak(M, spec, from, 1.4);
      rows.push([id, from, first, revisit]);
      assert.ok(revisit <= 30, `${id} ${from}: 2 かいめ ${revisit.toFixed(2)}°/s`);
      assert.ok(Math.abs(first - spec.turnRate.first) < 0.2, `${id}: 実測 ${first.toFixed(2)} / データ ${spec.turnRate.first}`);
    }
    if (MEDIUM.includes(id)) {
      assert.ok(spec.curveProfile.spread > 0, id + ' ひろげる');
      assert.ok(spec.turnRate.revisit <= 28, `${id} 2 かいめ ${spec.turnRate.revisit}`);
      assert.equal(spec.turnFlags.overTurnBudgetRevisit, false, id);
    } else {
      assert.equal(spec.curveProfile.spread, 0, id + ' は 4E-1 の かたち');
      assert.ok(Math.abs(spec.turnRate.first - LOW_FIRST[id]) < 1e-3, `${id} かわらない ${spec.turnRate.first}`);
    }
  }
  // 2 かいめの はやさは どの 本も 1.4 倍(MEDIUM だけ べつの 倍率を もたない)
  for (const id of CONT) assert.equal(M.walkCorridorSpec(id).timing.revisitSpeedMultiplier, 1.4, id);
  assert.equal(rows.length, 16);
});

test('2. 曲がる 量 と 両はしの むきは 4C / 4E-1 の まま(ひろげる だけ)。むきの 積分 = 出口の むき、行きと 帰りは 同じ かたちを さかさに', () => {
  const { M } = setup();
  for (const id of CONT) {
    const spec = M.walkCorridorSpec(id), cor = arr(M.worldCorridors()).find((c) => c.id === id), L = spec.walkLength, hp = spec.headingProfile;
    assert.ok(Math.abs(Math.abs(hp.turn) - cor.bend) < 0.01, `${id} 曲がる 量 = bend`);
    assert.ok(angDiff(M.corridorHeadingAt(spec, spec.a, 0), hp.startGlobal) < 1e-3 && angDiff(M.corridorHeadingAt(spec, spec.a, L), hp.endGlobal) < 1e-3, id);   // hp は 小数 3 けた
    assert.ok(Math.abs(arr(hp.perStage).reduce((a, b) => a + b, 0) - hp.turn) < 0.01, id + ' 段ごとの 合計');
    // 帰り(b から)は 同じ かたちを さかさ + 180°
    for (const s of [0, 300, 900, 1350, 2000, L]) assert.ok(angDiff(M.corridorHeadingAt(spec, spec.b, s), (M.corridorHeadingAt(spec, spec.a, L - s) + 180) % 360) < 1e-6, `${id} s=${s}`);
    // 出口で 曲率 0(むきが とばない)
    assert.ok(angDiff(M.corridorHeadingAt(spec, spec.a, 1), hp.startGlobal) < 1e-3 && angDiff(M.corridorHeadingAt(spec, spec.a, L - 1), hp.endGlobal) < 1e-3, id);
    // chart(あるく 平面)の はしの むき = 出口の むき(入口・出口の yaw の さを ふやさない)
    for (const from of [spec.a, spec.b]) {
      const w = M.createCorridorWalk(spec, from, {}), to = from === spec.a ? spec.b : spec.a;
      const ex = M.corridorExitPose(spec, Object.assign({}, w.state, { s: L }));
      assert.ok(ex && ex.region === to && ex.spot === spec.endpoints[to].spot, `${id} ${from}→ 着く spot`);
      // 着く ときの すすむ むき(chart)と 出口の むきの さは 4E-1 の まま(曲がりを ひろげても ふえない)
      w.state.s = L; const hEnd = w.stage() && M.corridorHeadingAt(spec, from, L);
      assert.ok(angDiff(hEnd, from === spec.a ? hp.endGlobal : (hp.startGlobal + 180) % 360) < 1e-3, `${id} ${from} 着く むき`);
    }
  }
  // ひろげかたは 曲がる 量から きまる(本ごとの 指定は ない)。表は 3 だん
  assert.deepEqual(arr(M.CORRIDOR_TURN_SPREAD).map((p) => p.level), [0, 1, 2]);
  for (const id of MEDIUM) {
    const spec = M.walkCorridorSpec(id), p = M.corridorTurnSpread(spec.headingProfile.turn, spec.walkLength);
    assert.equal(p.level, spec.curveProfile.spread, id);
  }
});

test('3. カメラ・なかま 27 にん・帯: MEDIUM 3 本 × 行き / 帰り(2 かいめ 1.4 倍)で なめらかに ついて いく。帯の そとへ 出ない', () => {
  const { M } = setup();
  const comps = Array.from({ length: 27 }, (_, i) => ({ id: 'p' + i, x: 0, z: 0, emoji: '🐰', follow: true, behavior: 'idle', heading: 0, face: 1, bob: 0 }));
  let base = null;   // 4E-4A で 採用した home|forest の なかまの ひろがり を ものさし に する
  for (const id of ['home|forest'].concat(MEDIUM)) {
    const spec = M.walkCorridorSpec(id);
    for (const from of [spec.a, spec.b]) {
      const e = spec.endpoints[from], party = comps.map((a, k) => Object.assign({}, a, { x: e.x + (k % 5) * 12 - 24, z: e.z - 20 - Math.floor(k / 5) * 14 }));
      const w = M.createCorridorWalk(spec, from, { firstVisit: false, party });
      const dt = 1 / 60;
      let prevYaw = w.camera.yaw, maxYawRate = 0, flips = 0, lastSign = 0, maxJump = 0, maxOut = 0;
      let prevPos = party.map((a) => [a.x, a.z]);
      for (let i = 0; i < 60 * 12 && w.state.s < spec.walkLength - 5; i++) {
        w.step(dt, { x: 0, y: -1 });
        const d = Math.atan2(Math.sin(w.camera.yaw - prevYaw), Math.cos(w.camera.yaw - prevYaw)); prevYaw = w.camera.yaw;
        maxYawRate = Math.max(maxYawRate, Math.abs(d) / dt);
        const sg = Math.abs(d) > 1e-4 ? Math.sign(d) : 0; if (sg && lastSign && sg !== lastSign) flips++; if (sg) lastSign = sg;
        const st = M.corridorStageAt(spec, from, w.state.s);
        assert.ok(Math.abs(w.state.u) <= st.uMax + 1e-6, `${id} u ${w.state.u} > ${st.uMax}`);
        party.forEach((a, k) => { maxJump = Math.max(maxJump, Math.hypot(a.x - prevPos[k][0], a.z - prevPos[k][1])); if (i > 120) maxOut = Math.max(maxOut, Math.hypot(a.x - w.player.x, a.z - w.player.z)); });
        prevPos = party.map((a) => [a.x, a.z]);
      }
      assert.ok(w.state.s >= spec.walkLength - 5, `${id} ${from} さいごまで あるける`);
      // カメラ: はやさの 上限(RULES.cam.turnRate)いか、まっすぐ おして いる あいだ 左右に ふらつかない(むきの 反転 ≤ 2)
      assert.ok(maxYawRate <= M.RULES.cam.turnRate + 1e-6, `${id} カメラ ${maxYawRate.toFixed(2)} rad/s`);
      assert.ok(flips <= 2, `${id} ${from} カメラ ふらつき ${flips}`);
      // なかま: 1 frame で とばない・外へ とびださない
      assert.ok(maxJump <= 20, `${id} ${from} なかま 1 frame ${maxJump.toFixed(1)}`);
      if (id === 'home|forest') { base = Math.max(base || 0, maxOut); continue; }
      assert.ok(maxOut <= base * 1.02, `${id} ${from} なかま の ひろがり ${maxOut.toFixed(0)} / home|forest ${base.toFixed(0)}`);
    }
  }
});

test('4. 景色(MEDIUM 3 本): 森 → 岩 → 山、山 → 川 → 湖(海に ならない)、まち → 運河 / 港 → 海(深い 海・ジャングル・ふね を まぜない)', () => {
  const { M } = setup();
  const rgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
  const stageWords = (W, n, SL) => { const per = Array.from({ length: n }, () => []); for (const p of W.props) if (!p.blocker) per[Math.min(n - 1, Math.floor((p.s || 0) / SL))].push(p.emoji || p.struct); return per; };
  const FOREST = ['🌿', '🍄', '🪵', '🍂', '🌲', '🌳', 'fern'];
  const SEA_ONLY = ['🌴', '🐚', '⛵', '⚓', '🪸'];
  const NEVER = ['⛵', '⚓', '🪸', '🐠', '🦑', '🐙', '🦈', '🌺', '🦜', '🛶'];
  for (const id of MEDIUM) {
    const spec = M.walkCorridorSpec(id);
    for (const from of [spec.a, spec.b]) {
      const to = from === spec.a ? spec.b : spec.a, w = M.createCorridorWalk(spec, from, {}), W = w.world, n = spec.stageCount, SL = spec.stageLength;
      const per = stageWords(W, n, SL), all = per.flat();
      assert.ok(!all.some((e) => NEVER.includes(e)), `${id} ${from}→ 深い 海・ふね・ジャングル なし`);
      // いろは 出発 → 到着 へ ひとつの むきに すすむ(とちゅうで もどらない)
      const A0 = rgb(M.WORLDS[from].ground[0]), B0 = rgb(M.WORLDS[to].ground[0]), ax = B0.map((v, i) => v - A0[i]), n2 = ax.reduce((u, v) => u + v * v, 0);
      const proj = (t) => { W.setProgress(t); const c = rgb(W.ground[0]); return c.reduce((u, v, i) => u + (v - A0[i]) * ax[i], 0) / n2; };
      let back = 0; for (let t = 0.02; t <= 1; t += 0.02) back = Math.max(back, proj(t - 0.02) - proj(t));
      assert.ok(back <= 0.03, `${id} ${from}→ いろが もどる ${back.toFixed(3)}`);
      const bds = new Set(); for (let t = 0; t <= 1; t += 0.02) { W.setProgress(t); bds.add(W.backdrop); }
      if (id === 'forest|mountain') {
        // 森の ことばは 1 段で きえない(森がわ 3 段は 森の ことばが のこる)
        const forestSide = from === 'forest' ? per.slice(0, 3) : per.slice(n - 3);
        for (const st of forestSide) assert.ok(st.filter((e) => FOREST.includes(e)).length >= 3, `${id} ${from}→ 森の ことば ${st.join('')}`);
        assert.ok(!all.some((e) => SEA_ONLY.includes(e)), id + ' 海の ことば なし');
      }
      if (id === 'mountain|river_lake') {
        assert.ok(!bds.has('seahorizon'), `${id} 海の 背景 なし`);
        assert.ok(!all.some((e) => SEA_ONLY.includes(e)), `${id} ${from}→ 砂浜・ヨット・🌴 なし`);
        const lakeSide = from === 'river_lake' ? per[0] : per[n - 1];
        assert.ok(lakeSide.includes('🪷') || lakeSide.includes('🌳'), `${id} 湖がわ ${lakeSide.join('')}`);
      }
      if (id === 'city|sea') {
        const citySide = from === 'city' ? per[0] : per[n - 1], seaSide = from === 'sea' ? per[0] : per[n - 1];
        assert.ok(citySide.some((e) => ['🏢', '🏬', '🚲', '🪧', '🗑️'].includes(e)), `${id} まちがわ ${citySide.join('')}`);
        assert.ok(!citySide.some((e) => ['🏠', '🏡'].includes(e) || e === 'fence'), `${id} まちがわに いえ・さく なし`);
        assert.ok(seaSide.some((e) => ['🌴', '🐚'].includes(e)), `${id} 海がわ ${seaSide.join('')}`);
        assert.deepEqual([...bds].sort(), ['neonskyline', 'seahorizon'], id);
      }
    }
  }
});

test('5. city の 3 出口: desert・sea は corridor、countryside は transition。special(ふね・ゴンドラ・もぐる)は 許可リストに ない', () => {
  const { M } = setup();
  const w = M.buildWorld('city', M.buildRegistry()), gs = arr(M.regionGates('city', w)).filter((g) => g.kind === 'walk');
  const modes = Object.fromEntries(gs.map((g) => [g.id, M.continuousWalkMode(g, {}).mode]));
  assert.deepEqual(modes, { 'city|countryside': 'transition', 'city|desert': 'corridor', 'city|sea': 'corridor' });
  for (const id of ['jungle|sea', 'deepsea|sea', 'countryside|star_stop', 'countryside|forest', 'city|countryside']) assert.ok(!arr(M.CONTINUOUS_WALK_ALLOWLIST).includes(id), id);
  // mountain の 4 出口は ぜんぶ corridor(4 本とも 許可リスト)
  const wm = M.buildWorld('mountain', M.buildRegistry());
  const mm = arr(M.regionGates('mountain', wm)).filter((g) => g.kind === 'walk').map((g) => [g.id, M.continuousWalkMode(g, {}).mode]);
  assert.deepEqual(Object.fromEntries(mm), { 'desert|mountain': 'corridor', 'forest|mountain': 'corridor', 'mountain|river_lake': 'corridor', 'snow|mountain': 'corridor' });
});
