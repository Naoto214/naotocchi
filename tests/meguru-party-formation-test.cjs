// なかまの ならび(party formation)
// (docs/handoff/meguru-phase4e2-home-forest-poc-2026-09-23.md §16)
//
// ここで しばるのは
//   ・人数で かたちが かわる(1〜2: ななめ うしろ / 3〜4: ちいさな V / 5〜: 半円〜おうぎ)。横いっぱいの 1 列に ならない
//   ・うしろ(カメラから みて おく)が 中心。まえ(カメラがわ)へ 出ない。はばに 上限。人数が おおいと 段を ふやし、それでも こく する
//   ・ひろい ところ(open)と せまい ところ(corridor の 帯)で はばが かわる。せまくても 1 本の 線には しない
//   ・決定論(らんすう なし)・並び順が かわらない・O(n)・セーブに のこらない・当たり判定は ふやさない
//   ・region でも corridor でも 同じ helper。引き返し・曲がり・段の さかい・着いた とき に とばない / 1 列に もどらない
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');

const arr = (x) => Array.from(x || []);
function setup(n) {
  const h = harness({ fullDisplay: true });
  const M = h.api.meguruMod, s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, regionId: 'home' });
  // いっしょに あるく なかまを n にんに する(さいごの 1 にんは こいびと。いまの ゲームで いちばん おおいのは なかま 26 + こいびと 1 = 27)
  const all = arr(h.api.normalCompanions).concat(arr(h.api.rareCompanions));
  const withPartner = n >= 2, comps = all.slice(0, Math.max(0, withPartner ? n - 1 : n));
  s.companions = comps.map((c) => ({ id: c.id, bond: 100 }));
  s.lifetime.companionsRecruited = comps.map((c) => c.id);
  if (withPartner) { const pc = arr(h.api.partnerCandidates)[0]; s.partner = { id: pc.id, label: pc.label || pc.name, emoji: pc.emoji, affection: 100 }; s.lifetime.partnersRecorded = [pc.id]; }
  else s.partner = null;
  h.api.render();
  return { h, M, s };
}
const sim = (M, regionId = 'home') => M.createSimulation({ regionId, env: { time: 'day', weather: 'sunny', season: 'spring', region: regionId } });
// カメラから みた なかまの いち(side: みぎ +、back: おく +)
const rel = (S, a) => { const y = S.camera.yaw, dx = a.x - S.player.x, dz = a.z - S.player.z; return { side: dx * Math.cos(y) - dz * Math.sin(y), back: dx * Math.sin(y) + dz * Math.cos(y) }; };
const SIZES = [1, 2, 4, 8, 16, 27];

test('1. いまの ゲームで いっしょに あるける いちばん おおい 人数は 27(なかま 26 + こいびと 1)。コードから もとめる', () => {
  const { M } = setup(27);
  const party = M.companionsOf(M.buildRegistry());
  assert.equal(party.length, 27);
  assert.equal(party.filter((a) => a.kind === 'partner').length, 1);
});

test('2. かたち: 1〜2 は ななめ うしろ、3〜4 は ちいさな V、5 いじょうは 半円〜おうぎ。まえへ 出ない・横 1 列に ならない', () => {
  const { M } = setup(1);
  const F = (n, mh) => arr(M.partyFormationSlots(n, mh == null ? {} : { maxHalf: mh }));
  for (const n of SIZES.concat([3, 5, 12, 40])) {
    const s = F(n);
    assert.equal(s.length, n, 'かず ' + n);
    assert.ok(s.every((q) => q.back > 0), n + ': みんな うしろ');
    assert.ok(s.every((q) => Math.abs(q.side) <= 260), n + ': はばの 上限');
    const rows = new Set(s.map((q) => q.row)).size;
    assert.ok(rows <= 4, n + ': ひろい ところは 4 段まで');
    if (n >= 3) {
      assert.ok(rows >= 2, n + ': 1 段(横 1 列)に しない');
      const depth = Math.max(...s.map((q) => q.back)) - Math.min(...s.map((q) => q.back)), width = 2 * Math.max(...s.map((q) => Math.abs(q.side)));
      assert.ok(depth >= 50 && width / depth < (n < 8 ? 5 : 3), `${n}: おくゆき ${depth.toFixed(0)} / はば ${width.toFixed(0)}`);
    }
    // 全員 同じ ばしょ に ならない
    assert.equal(new Set(s.map((q) => Math.round(q.side) + ',' + Math.round(q.back))).size, n);
  }
  // 1: ななめ うしろ / 2: 左右の ななめ うしろ(じぶんの まうしろは あける)
  assert.ok(Math.abs(F(1)[0].side) >= 60);
  assert.deepEqual(F(2).map((q) => Math.sign(q.side)).sort(), [-1, 1]);
  // 3〜4: 2 段目は 1 段目より ひろくて おく(V)
  const v = F(4);
  assert.ok(Math.abs(v[2].side) > Math.abs(v[0].side) && v[2].back > v[0].back, 'V');
  // 5 いじょう: 段の なかでは まんなかほど おく(じぶんを かこむ 半円)
  const fan = F(8).filter((q) => q.row === 1).sort((a, b) => Math.abs(a.side) - Math.abs(b.side));
  assert.ok(fan[0].back > fan[fan.length - 1].back, '半円');
});

test('3. せまい ところ(corridor の 帯)は ほそく する。はばは 帯から(px ではなく world)。せまくても 1 本の 線に しない', () => {
  const { M } = setup(1);
  for (const n of SIZES) {
    const open = arr(M.partyFormationSlots(n)), narrow = arr(M.partyFormationSlots(n, { maxHalf: 151 }));
    assert.ok(narrow.every((q) => Math.abs(q.side) <= 151 + 1e-9), n + ': 帯の はば いない');
    assert.ok(Math.max(...narrow.map((q) => Math.abs(q.side))) <= Math.max(...open.map((q) => Math.abs(q.side))));
    if (n >= 2) {
      // 段ごとに 左右が ある(1 列に ならない)
      const sides = new Set(narrow.map((q) => Math.sign(Math.round(q.side))));
      assert.ok(sides.has(1) && sides.has(-1), n + ': 左右に わかれる');
    }
    assert.ok(new Set(narrow.map((q) => q.row)).size <= 8, n + ': せまくても 8 段まで');
  }
  // 27 にん: ひろい ところは 4 段、せまい ところは もっと おくへ(はばを こえない)
  const o27 = arr(M.partyFormationSlots(27)), n27 = arr(M.partyFormationSlots(27, { maxHalf: 151 }));
  assert.equal(new Set(o27.map((q) => q.row)).size, 4);
  assert.ok(new Set(n27.map((q) => q.row)).size > 4);
});

test('4. 決定論・並び順が かわらない・らんすうを つかわない・O(n)', () => {
  const { M } = setup(1);
  const real = Math.random;
  Math.random = () => { throw new Error('formation は らんすうを つかわない'); };
  let a, b;
  try { a = JSON.stringify(M.partyFormationSlots(27)); b = JSON.stringify(M.partyFormationSlots(27)); } finally { Math.random = real; }
  assert.equal(a, b);
  // 大きな かずでも すぐ(1 人あたり 一定の しごと)
  const t0 = Date.now(); M.partyFormationSlots(20000); M.partyFormationSlots(20000, { maxHalf: 151 });
  assert.ok(Date.now() - t0 < 300, 'O(n) ' + (Date.now() - t0) + 'ms');
  // region の なかで: 並び順(party の じゅん)は frame ごとに かわらない
  const { M: M2 } = setup(8), S = sim(M2);
  const order = S.party.map((x) => x.key).join();
  for (let i = 0; i < 120; i++) S.step(1 / 60, { x: 0.3, y: -1 });
  assert.equal(S.party.map((x) => x.key).join(), order);
  // ひとり ひとりの ちいさな ちがいは 名前から きまる(同じ なかまなら 同じ)
  const S2 = sim(M2);
  for (let i = 0; i < 5; i++) { S.step(1 / 60, { x: 0, y: 0 }); S2.step(1 / 60, { x: 0, y: 0 }); }
  assert.deepEqual(S.party.map((x) => x.formJ), S2.party.map((x) => x.formJ));
});

test('5. region: 1 / 2 / 4 / 8 / 16 / 27 にんで あるいた あと、うしろに ゆるく あつまる(まえへ 出ない・横 1 列に ならない・同じ ばしょに かさならない)', () => {
  for (const n of SIZES) {
    const { M } = setup(n), S = sim(M);
    assert.equal(S.party.length, n);
    for (let i = 0; i < 360; i++) S.step(1 / 60, { x: 0, y: -1 });
    for (let i = 0; i < 90; i++) S.step(1 / 60, { x: 0, y: 0 });
    const r = S.party.map((a) => rel(S, a));
    assert.ok(r.every((q) => q.back > -25), n + ': カメラがわ(まえ)へ 出ない ' + Math.min(...r.map((q) => q.back)).toFixed(0));
    assert.ok(r.every((q) => Math.abs(q.side) < 300), n + ': はばの 上限');
    if (n >= 3) {
      const depth = Math.max(...r.map((q) => q.back)) - Math.min(...r.map((q) => q.back));
      assert.ok(depth > 40, n + ': おくゆきが ある(横 1 列 では ない) ' + depth.toFixed(0));
    }
    assert.equal(new Set(r.map((q) => Math.round(q.side / 5) + ',' + Math.round(q.back / 5))).size, n, n + ': かさならない');
  }
});

test('6. region に 入った とき、なかまは その ならびに いる(とおくから かけよらない・1 列に ならない)。当たり判定は ふやさない', () => {
  const { M } = setup(27), S = sim(M);
  const r = S.party.map((a) => rel(S, a));
  assert.ok(r.every((q) => Math.hypot(q.side, q.back) < 520), '入った しゅんかんから そばに いる');
  assert.ok(new Set(r.map((q) => Math.round(q.back / 20))).size >= 3, '段に わかれて いる');
  // なかまが いても じぶんの あるく みちは かわらない(なかま どうし・じぶんとの 当たり判定は ない)
  const { M: M0 } = setup(1), S0 = sim(M0);
  const walk = (X) => { for (let i = 0; i < 240; i++) X.step(1 / 60, { x: 0.2, y: -1 }); return Math.round(X.player.x) + ',' + Math.round(X.player.z); };
  assert.equal(walk(S), walk(S0), 'なかまは じぶんを とめない');
  assert.ok(!S.world.obstacles.some((o) => S.party.includes(o)), 'なかまは 障害物に ならない');
});

test('7. corridor: 27 にんでも 帯の なか・帯が せまい 段では ほそく・引き返しでも 曲がりでも 段の さかいでも とばない', () => {
  const { M } = setup(27), S = sim(M);
  const spec = M.walkCorridorSpec('home|forest'), e = spec.endpoints.home, yaw = Math.atan2(e.leaveLocal.x, e.leaveLocal.z);
  S.setPlayer(e.x, e.z); S.camera.yaw = yaw; S.placeParty();   // 出口に 立って いる ところから
  const party = S.party;
  const w = M.createCorridorWalk(spec, 'home', { yaw, heading: yaw, party, local: { x: e.x, z: e.z } });
  assert.equal(w.party.length, 27);
  let prev = null, jump = 0, frames = 0, lastCls = null, since = 0;
  const maxU = Math.max(...arr(spec.stages).map((q) => q.uMax));
  const widths = {};
  const stepAll = (v, sec) => {
    for (let i = 0; i < sec * 60; i++) {
      const ev = w.step(1 / 60, v);
      const now = party.map((a) => ({ x: a.x, z: a.z }));
      if (prev) now.forEach((p, k) => { jump = Math.max(jump, Math.hypot(p.x - prev[k].x, p.z - prev[k].z)); });
      prev = now; frames++;
      // 帯の なか / その 段の はば
      // 帯が せまく なった 段では 1 秒で なかへ よる(とばずに すこしずつ)。ひろい 段の はばは いつも こえない
      const st = w.stage(), cls = st.widthClass;
      if (cls !== lastCls) { lastCls = cls; since = 0; } else since++;
      if (frames > 120) {
        const u = Math.max(...party.map((a) => Math.abs(chartU(w, a))));
        assert.ok(u <= maxU + 1, `帯の そとへ 出ない ${u.toFixed(0)}`);
        if (since > 60) { widths[cls] = Math.max(widths[cls] || 0, u); assert.ok(u <= st.uMax + 1, `帯の なか(${cls} ${u.toFixed(0)} > ${st.uMax})`); }
      }
      if (ev) return ev;
    }
    return null;
  };
  // chart の よこずれ(じぶんの 近くの s で)
  function chartU(walk, a) { const ch = walk.chart, h = ch.hs, i0 = Math.round(Math.max(0, Math.min(ch.L, walk.state.s)) / 10); let best = i0, bd = Infinity; for (let i = Math.max(0, i0 - 60); i <= Math.min(ch.n, i0 + 60); i++) { const d = (ch.xs[i] - a.x) ** 2 + (ch.zs[i] - a.z) ** 2; if (d < bd) { bd = d; best = i; } } return (a.x - ch.xs[best]) * Math.cos(h[best]) - (a.z - ch.zs[best]) * Math.sin(h[best]); }
  stepAll({ x: 0, y: -1 }, 4);                  // まえへ(曲がり・段の さかい を こえる)
  stepAll({ x: 0, y: 1 }, 1.5);                 // 引き返す
  stepAll({ x: 0, y: -1 }, 20);                 // また すすんで 着く
  assert.ok(jump < 40, '1 frame で とばない ' + jump.toFixed(1));
  assert.ok(widths.wide > 0 && widths.normal > 0);
  assert.ok(widths.normal <= spec.stages.find((q) => q.widthClass === 'normal').uMax + 1, 'せまい 段では ほそい');
});

test('8. start(): 27 にんで home → forest を あるいて 着いた とき、なかまは ならびの まま(1 列に ならない・ふえない)。セーブに ならびは のこらない', () => {
  const { h, M, s } = setup(27);
  const B = h.api.meguruBridge, pad = { vec: { x: 0, y: 0 } }, real = B.createTouchPad;
  B.createTouchPad = (row, opts) => { const p = real(row, opts); return Object.assign({}, p, { vector: () => pad.vec, destroy: p.destroy }); };
  const r = M.start(h.document.getElementById('meguruOverlay'), { renderer: () => ({ draw() {}, destroy() {}, setDistant() {} }) });
  h.advance(300);
  const g = r.sim.gates.find((q) => q.to === 'forest'), b = g.bearing || { x: 0, z: 1 };
  r.setPlayer(g.spot.x - b.x * (g.spot.r + 200), g.spot.z - b.z * (g.spot.r + 200)); h.advance(100);
  r.setPlayer(g.spot.x - b.x * 40, g.spot.z - b.z * 40); r.sim.camera.yaw = Math.atan2(b.x, b.z);
  pad.vec = { x: 0, y: -1 };
  let saw = false;
  for (let i = 0; i < 400; i++) { h.advance(50); const c = r.corridor; if (c) { saw = true; assert.equal(c.party, 27); } else if (saw) break; }
  pad.vec = { x: 0, y: 0 };
  assert.equal(r.world.regionId, 'forest');
  assert.equal(r.party.length, 27, 'ふえない・へらない');
  assert.equal(new Set(r.party.map((a) => a.key)).size, 27);
  const rr = r.party.map((a) => rel(r.sim, a));
  assert.ok(new Set(rr.map((q) => Math.round(q.back / 20))).size >= 3, '着いた とき 段に わかれて いる(1 列に もどらない)');
  assert.ok(rr.every((q) => q.back > -25));
  assert.ok(!/formJ|formation/.test(JSON.stringify(s)), 'セーブに ならびは ない');
  r.stop();
});
