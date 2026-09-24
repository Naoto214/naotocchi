// Phase 4E-4A: LOW 4 本(home|river_lake・city|desert・desert|mountain・snow|mountain)を あるいて こえる
// (docs/handoff/meguru-phase4e4a-low-corridors-2026-09-24.md、監査 docs/design/meguru-phase4e4-preflight-audit-2026-09-24.md)
//
// 1 本ごとに 4E-3 の テストを コピーしない。「5 本すべて 同じ 契約で うごく」ことを 表で しばる。
// しくみの こまかい テスト(じょうたいの きまり・10 往復・まにあわない 等)は tests/meguru-phase4e3-test.cjs(home|forest)が 正本。
//   ・許可リストは 5 本。のこり 5 本(MEDIUM 3・HIGH 2)と special は いまの transition
//   ・組みはじめは 道の のこり 810(割合 では ない)。5 本 × 行きと帰り で preload → commit、二重 build なし
//   ・正本(regionId・セーブ・はっけん)は 着く まで 出発 地域。引き返し・reload・しっぱい で 出発 地域へ
//   ・あるける 出口に ちかづくと その corridor の 絵を さきに デコード(1 出口 1 回・デコード だけ)
//   ・景色: 背景は まんなかで 1 回だけ、はしは 端の 地域の いろ、湖に 海を 出さない、まちの はずれは まちの いろ
//   ・home.bigtree の 2 出口を とりちがえない
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');

const arr = (x) => Array.from(x || []);
const CONT = ['home|forest', 'home|river_lake', 'city|desert', 'desert|mountain', 'snow|mountain'];
const NEW4 = CONT.slice(1);
const LATER = ['forest|mountain', 'mountain|river_lake', 'city|sea', 'countryside|forest', 'city|countryside'];
const SPECIAL = ['jungle|sea', 'deepsea|sea', 'countryside|star_stop'];
const DIRS = CONT.flatMap((id) => { const [a, b] = id.split('|'); return [[id, a, b], [id, b, a]]; });

function setup(o = {}) {
  const h = harness({ fullDisplay: true });
  const M = h.api.meguruMod, s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, regionId: o.region || 'home' });
  if (o.party) {
    const all = arr(h.api.normalCompanions).concat(arr(h.api.rareCompanions)), comps = all.slice(0, o.party - 1);
    s.companions = comps.map((c) => ({ id: c.id, bond: 100 })); s.lifetime.companionsRecruited = comps.map((c) => c.id);
    const pc = arr(h.api.partnerCandidates)[0]; s.partner = { id: pc.id, label: pc.label || pc.name, emoji: pc.emoji, affection: 100 }; s.lifetime.partnersRecorded = [pc.id];
  }
  h.api.render();
  return { h, M, s };
}
function run(o = {}) {
  const { h, M, s } = setup(o);
  const B = h.api.meguruBridge, pad = { vec: { x: 0, y: 0 } }, real = B.createTouchPad;
  B.createTouchPad = (row, opts) => { const p = real(row, opts); return Object.assign({}, p, { vector: () => pad.vec, destroy: p.destroy }); };
  const decodes = [], realPrep = B.prepareIllustrations;
  B.prepareIllustrations = (sc, ac, opts) => {
    if (opts && opts.decode) decodes.push({ list: arr(sc), actors: arr(ac).length, region: s.regionId });
    if (o.decodeFails && opts && opts.decode) return Promise.reject(new Error('test decode failure'));
    // ハーネスの 絵は よみこまれない。出口の さきどり デコード(住民 なし)は おわった ことに する(入口の したくを うごかす)
    if (opts && opts.decode && !arr(ac).length) return Promise.resolve(true);
    return realPrep ? realPrep(sc, ac, opts) : Promise.resolve(true);
  };
  const r = M.start(h.document.getElementById('meguruOverlay'), { renderer: () => ({ draw() {}, destroy() {}, setDistant() {} }), corridorFaults: o.faults || null });
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
  const walkTo = (frac, L) => { for (let i = 0; i < 800; i++) { const c = r.corridor; if (!c || (c.phase === 'walk' && c.s >= frac * L)) return c; h.advance(50); } return r.corridor; };
  const arrive = () => { enter(); for (let i = 0; i < 800 && r.corridor; i++) h.advance(50); };
  return { h, M, s, r, B, pad, go, enter, walkTo, arrive, decodes, P: () => r.corridorStats.preload, H: () => r.corridorStats.handoff };
}
const tick = () => new Promise((res) => setImmediate(res));
const keysOf = (s) => JSON.stringify([Object.keys(s).sort(), Object.keys(s.lifetime || {}).sort(), Object.keys((s.lifetime || {}).meguru || {}).sort()]);

test('1. 許可リストは 5 本(かさならない)。のこり 5 本と special・memory_lake は いまの transition。LOW 4 本は 形が そろって いる', () => {
  const { M } = setup();
  assert.deepEqual(arr(M.CONTINUOUS_WALK_ALLOWLIST), CONT);
  assert.equal(new Set(CONT).size, CONT.length, 'connection id が 2 かい ない');
  const specs = arr(M.walkCorridorSpecs()).map((q) => q.connectionId);
  for (const id of CONT) assert.ok(specs.includes(id), id + ' の spec');
  const seen = {};
  for (const id of Object.keys(M.WORLDS)) {
    const w = M.buildWorld(id, M.buildRegistry());
    for (const g of arr(M.regionGates(id, w))) {
      const m = M.continuousWalkMode(g, {});
      seen[g.id + ':' + g.from] = m;
      if (CONT.includes(g.id)) { assert.equal(m.mode, 'corridor', g.id); assert.equal(m.reason, null); }
      else if (LATER.includes(g.id)) assert.equal(m.reason, 'not-allowed', g.id);
      else assert.equal(m.reason, 'not-walk', g.id);
    }
  }
  assert.equal(Object.values(seen).filter((m) => m.mode === 'corridor').length, 10, '5 本 × 行きと 帰り');
  for (const id of SPECIAL) assert.ok(Object.keys(seen).some((k) => k.startsWith(id + ':')) && Object.keys(seen).filter((k) => k.startsWith(id + ':')).every((k) => seen[k].mode === 'transition'), id);
  // こまった とき: spec が ない・形が あわない は transition(許可リストに いれても)
  assert.equal(M.continuousWalkMode({ id: 'x|y', kind: 'walk', way: 'walk', from: 'x', to: 'y', spot: { id: 'q' }, at: 'q' }, { allow: ['x|y'] }).reason, 'no-spec');
  for (const id of NEW4) {
    const [a] = id.split('|'), w = M.buildWorld(a, M.buildRegistry()), g = arr(M.regionGates(a, w)).find((q) => q.id === id);
    assert.equal(M.continuousWalkMode(Object.assign({}, g, { at: 'nowhere' }), {}).reason, 'geometry-invalid', id);
  }
});

test('2. 組みはじめ は 道の のこり 810(6 段 = 0.70)。5 本とも 曲がる はやさは 初回 / 2 かいめ 30°/s いか', () => {
  const { M } = setup();
  for (const id of CONT) {
    const sp = M.walkCorridorSpec(id);
    assert.equal(sp.walkLength, 2700, id);
    assert.ok(Math.abs((1 - M.CORRIDOR_PRELOAD.startRemaining / sp.walkLength) - 0.7) < 1e-9, id);
    assert.ok(sp.turnRate.first <= 30 && sp.turnRate.revisit <= 30, `${id} ${sp.turnRate.first} / ${sp.turnRate.revisit}`);
  }
});

test('3. 5 本 × 行きと 帰り(27 にん): 0.70 から 組み、着く まえに ready、組んだ world を 1 回 つかう。正本は 着く まで 出発 地域。はっけん・セーブの key・なかま', () => {
  for (const [id, from, to] of DIRS) {
    const R = run({ region: from, party: 27 }), k0 = keysOf(R.s), H0 = JSON.parse(JSON.stringify(R.H()));
    R.go(to); const c0 = R.enter();
    assert.ok(c0, `${id} ${from}→${to} corridor`); assert.equal(c0.connectionId, id); assert.equal(c0.firstVisit, true); assert.equal(c0.speedMultiplier, 1);
    const L = R.M.walkCorridorSpec(id).walkLength, uMax = (s) => R.M.corridorStageAt(R.M.walkCorridorSpec(id), from, Math.max(0, Math.min(L, s))).uMax;
    let c = R.walkTo(0.6, L); assert.equal(c.preload, 'idle', `${id} まだ 組まない`);
    c = R.walkTo(0.71, L); assert.ok(c.preload === 'preparing' || c.preload === 'ready', `${id} ${c.preload}`);
    assert.equal(R.s.regionId, from); assert.equal(R.r.world.regionId, from);
    for (let i = 0; i < 800 && R.r.corridor; i++) { const q = R.r.corridor; if (q) { assert.ok(Math.abs(q.u) <= uMax(q.s) + 1e-6); if (q.s < L) assert.equal(R.s.regionId, from, `${id} とちゅうで かわらない`); } R.h.advance(50); }
    assert.equal(R.s.regionId, to, id); assert.equal(R.r.world.regionId, to, id);
    const P = R.P(), H = R.H();
    assert.equal(P.commits, 1, id); assert.equal(P.fallbacks, 0, id); assert.equal(P.fails, 0, id);
    assert.ok(Math.abs(P.last.startFrac - 0.7) < 0.03, `${id} はじめ ${P.last.startFrac}`);
    assert.ok(P.last.readyFrac < 1 && !P.last.late, `${id} ready ${P.last.readyFrac}`);
    assert.equal(H.hits - H0.hits, 1, id); assert.equal(H.misses - H0.misses, 0, `${id} 二重 build なし`);
    // 組んだ world の 絵(住民・なかま つき)は デコードまで まって から ready(着いて はじめて デコードしない)
    assert.equal(R.decodes.filter((d) => d.actors > 0).length, 1, `${id} preload の デコード`);
    assert.equal(keysOf(R.s), k0, `${id} セーブの key`);
    assert.ok(arr(R.B.worldLinks()).includes(id), `${id} の みちを みつけた`);
    // 着いた: なかまは 1 くみ(27 にん)、みんな べつの ばしょ
    const party = R.r.party;
    assert.equal(party.length, 27, id);
    const pos = new Set(party.map((a) => Math.round(a.x) + ':' + Math.round(a.z)));
    assert.equal(pos.size, 27, `${id} かさならない`);
    // 2 かいめ(帰り)は はやあし 1.4、同じ しくみで 着く
    R.go(from); const c2 = R.enter();
    assert.equal(c2.firstVisit, false); assert.equal(c2.speedMultiplier, 1.4);
    for (let i = 0; i < 800 && R.r.corridor; i++) R.h.advance(50);
    assert.equal(R.s.regionId, from); assert.equal(R.P().commits, 2, id); assert.equal(R.P().fallbacks, 0);
    // U ターン(ready の あと 90%)で すてる。もどりきれば 出発 地域(ここでは from)
    R.go(to); R.enter(); R.walkTo(0.9, L);
    assert.equal(R.r.corridor.preload, 'ready', id);
    R.pad.vec = { x: 0, y: 1 };
    for (let i = 0; i < 800 && R.r.corridor; i++) R.h.advance(50);
    assert.equal(R.s.regionId, from, id); assert.equal(R.r.world.regionId, from);
    assert.equal(R.P().aborts, 1, id); assert.equal(R.P().commits, 2, id);
    R.r.stop();
  }
});

test('4. reload(組みかけ / ready で やめる): セーブは 出発 地域、組んだ ものは のこらない(LOW 4 本)', () => {
  for (const id of NEW4) {
    const [from, to] = id.split('|');
    for (const [frac, faults] of [[0.72, { slow: true }], [0.9, null]]) {
      const R = run({ region: from, faults });
      R.go(to); R.enter(); R.walkTo(frac, 2700);
      const st = R.r.corridor.preload;
      assert.ok(st === 'preparing' || st === 'ready', `${id} ${st}`);
      R.r.stop();
      assert.equal(R.P().aborts, 1, id); assert.equal(R.s.regionId, from, id);
      assert.ok(!/preload|prepared|corridor/.test(JSON.stringify(R.s)), `${id} セーブに のこらない`);
      const r2 = R.M.start(R.h.document.getElementById('meguruOverlay'), { renderer: () => ({ draw() {}, destroy() {}, setDistant() {} }) });
      R.h.advance(200); assert.equal(r2.world.regionId, from, id); assert.equal(r2.corridor, null); r2.stop();
    }
  }
});

test('5. しっぱい: 組む とちゅう / 絵の デコード / 着く ときの たしかめ で こけても 移動は とまらない(5 本)', () => {
  for (const id of CONT) {
    const [from, to] = id.split('|');
    // 組む とちゅうで こける + 絵の デコードも こける → 歩きつづけ、4E-2 の 着き方で 着く
    let R = run({ region: from, faults: { build: 5 }, decodeFails: true });
    R.go(to); R.arrive();
    assert.equal(R.s.regionId, to, id); assert.equal(R.P().fails, 1, id); assert.equal(R.P().fallbacks, 1, id); assert.equal(R.P().commits, 0, id);
    R.r.stop();
    // 着く ときの たしかめ で つかえない → すてて その場で 組む(移動は とまらない)
    R = run({ region: from, faults: { commit: true } });
    R.go(to); R.arrive();
    assert.equal(R.s.regionId, to, id); assert.equal(R.P().invalid, 1, id); assert.equal(R.P().fallbacks, 1, id);
    R.r.stop();
  }
});

test('6. 絵の さきどり デコード: あるける 出口に ちかづくと その corridor の 最初の 段と 両端の ことば だけを 1 回。セーブ・地域は かわらない', async () => {
  const { M } = setup();
  for (const id of NEW4) {
    const [from, to] = id.split('|');
    const R = run({ region: from }), k0 = keysOf(R.s);
    const g = R.r.sim.gates.find((q) => q.to === to), b = g.bearing || (g.out === 'far' ? { x: 0, z: 1 } : { x: 0, z: -1 });
    // 出口から とおい ところでは まだ しない(はじめから 出口の そばに いる 地域では もう 1 回 おわって いる)
    const want0 = M.corridorSceneryEmojis(M.walkCorridorSpec(id), from), same = (d) => d.list.length === want0.length && d.list.every((e) => want0.includes(e));
    const near0 = Math.hypot(R.r.sim.player.x - g.spot.x, R.r.sim.player.z - g.spot.z) <= g.spot.r + 360;
    assert.equal(R.decodes.filter(same).length, near0 ? 1 : 0, id + ' はじめ');
    R.r.setPlayer(g.spot.x - b.x * (g.spot.r + 900), g.spot.z - b.z * (g.spot.r + 900)); R.h.advance(400);
    assert.equal(R.decodes.filter(same).length, near0 ? 1 : 0, id + ' とおい ところでは しない');
    // ちかづくと 1 回
    R.r.setPlayer(g.spot.x - b.x * (g.spot.r + 200), g.spot.z - b.z * (g.spot.r + 200)); R.h.advance(400);
    const want = M.corridorSceneryEmojis(M.walkCorridorSpec(id), from);
    const mine = R.decodes.filter((d) => d.list.length === want.length && d.list.every((e) => want.includes(e)));
    assert.equal(mine.length, 1, id + ' ちかづいたら 1 回');
    assert.ok(want.length > 0 && want.length <= 20, id + ' すくない ' + want.length);
    assert.equal(R.r.corridor, null, 'デコードでは corridor に 入らない'); assert.equal(R.s.regionId, from); assert.equal(keysOf(R.s), k0);
    await tick();   // デコードの おわり(Promise)を とどける
    R.h.advance(400);
    assert.equal(R.decodes.filter((d) => d.list.length === want.length && d.list.every((e) => want.includes(e))).length, 1, id + ' 2 回 しない');
    // デコードが おわったら 入口の したく: corridor の world を さきに 1 回 組む(地域・セーブは そのまま)
    const EP = R.r.corridorStats.entryPrep;
    assert.ok(EP.builds >= 1 && EP.fails === 0, id + ' 入口の したく ' + JSON.stringify(EP));
    assert.equal(R.s.regionId, from); assert.equal(keysOf(R.s), k0);
    // corridor に 入っても もう しない(1 出口 1 回)。組んで おいた world を そのまま つかう(おなじ もの)
    R.go(to); R.enter();
    assert.equal(R.decodes.filter((d) => d.list.length === want.length && d.list.every((e) => want.includes(e))).length, 1);
    assert.equal(EP.reuses, 1, id + ' 入口で つかう');
    assert.equal(R.r.corridor.props, M.createCorridorWalk(M.walkCorridorSpec(id), from).world.props.length, id + ' おなじ world');
    R.r.stop();
  }
  // 入口の したくが こけても いつもどおり 入口で 組んで あるける
  {
    const R = run({ region: 'home', faults: { entry: true } });
    const g = R.r.sim.gates.find((q) => q.to === 'river_lake'), b = g.bearing || (g.out === 'far' ? { x: 0, z: 1 } : { x: 0, z: -1 });
    R.r.setPlayer(g.spot.x - b.x * (g.spot.r + 200), g.spot.z - b.z * (g.spot.r + 200)); R.h.advance(400); await tick(); R.h.advance(400);
    assert.ok(R.r.corridorStats.entryPrep.fails >= 1);
    R.go('river_lake'); const c = R.enter();
    assert.ok(c && c.connectionId === 'home|river_lake'); assert.equal(R.r.corridorStats.entryPrep.reuses, 0);
    R.arrive(); assert.equal(R.s.regionId, 'river_lake');
    R.r.stop();
  }
  // corridor に ならない 出口(city|sea)では しない
  const R = run({ region: 'city' });
  const g = R.r.sim.gates.find((q) => q.id === 'city|sea');
  R.r.setPlayer(g.spot.x, g.spot.z + (g.spot.r + 100)); R.h.advance(600);
  const seaWords = M.corridorSceneryEmojis(M.walkCorridorSpec('city|sea'), 'city');
  assert.equal(R.decodes.filter((d) => d.list.length === seaWords.length && d.list.every((e) => seaWords.includes(e))).length, 0, 'city|sea は まだ transition');
  R.r.stop();
  // 最初の 2 段 と 両端の 地域 だけ(ほかの 地域の ことばを ぜんぶ いれない)
  const w = M.corridorSceneryEmojis(M.walkCorridorSpec('city|desert'), 'city');
  assert.ok(!w.includes('🌴') && !w.includes('🐚'), '海の ことばは いれない');
});

test('7. 景色(5 本 × 行きと 帰り): 背景は まんなかで 1 回だけ 出発 → 到着。はしは 端の 地域の いろ。いろは とばない', () => {
  const { M } = setup();
  const rgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
  const dist = (a, b) => Math.max(...rgb(a).map((v, k) => Math.abs(v - rgb(b)[k])));
  for (const [id, from, to] of DIRS) {
    const w = M.createCorridorWalk(M.walkCorridorSpec(id), from, {}), W = w.world, L = w.spec.walkLength;
    const at = (t) => { W.setProgress(t); return { g: W.ground[0], bd: W.backdrop }; };
    let flips = 0, prev = null, jump = 0, pg = null;
    for (let s = 0; s <= L; s += 10) { const q = at(s / L); if (prev && q.bd !== prev) flips++; prev = q.bd; if (pg) jump = Math.max(jump, dist(pg, q.g)); pg = q.g; }
    const fromBd = M.WORLDS[from].backdrop, toBd = M.WORLDS[to].backdrop;
    assert.equal(at(0.05).bd, fromBd, id); assert.equal(at(0.95).bd, toBd, id);
    assert.equal(flips, fromBd === toBd ? 0 : 1, `${id} ${from}→${to} 背景の きりかわり ${flips}`);
    assert.ok(jump <= 6, `${id} いろの とび ${jump}`);
    assert.ok(dist(at(0.02).g, M.WORLDS[from].ground[0]) <= 6, `${id} はじめは ${from} の いろ ${at(0.02).g}`);
    assert.ok(dist(at(0.98).g, M.WORLDS[to].ground[0]) <= 6, `${id} おわりは ${to} の いろ ${at(0.98).g}`);
    // 湖・川(river_lake)は 海では ない
    if (from === 'river_lake' || to === 'river_lake') {
      for (let t = 0; t <= 1; t += 0.02) assert.notEqual(at(t).bd, 'seahorizon', id);
      assert.ok(!W.props.some((p) => p.emoji === '🌴' || p.emoji === '🐚'), id + ' 🌴 なし');
    }
    // まちを 出た すぐは まちの いろと ことば(いえなみ・はたけの いろに ならない)
    if (from === 'city') {
      const first = W.props.filter((p) => !p.blocker && p.s < w.spec.stageLength * 0.5);
      assert.ok(!first.some((p) => p.emoji === '🏠' || p.emoji === '🏡' || p.struct === 'fence'), id + ' まちの はずれに いえ・さく は ない');
      assert.ok(first.some((p) => ['🏢', '🏬', '🚲', '🪧', '🗑️'].includes(p.emoji)), id + ' まちの ことば');
    }
    assert.ok(W.props.length <= 150, id);
  }
  // 雪 → 岩: 雪の いろは 1 段で きえない(のこり 4 割の ところでも まだ 雪に ちかい)
  const w = M.createCorridorWalk(M.walkCorridorSpec('snow|mountain'), 'snow', {}), W = w.world;
  W.setProgress(0.42); const g42 = W.ground[0]; W.setProgress(0.58); const g58 = W.ground[0];
  assert.ok(dist(g42, M.WORLDS.snow.ground[0]) < dist(g42, M.WORLDS.mountain.ground[0]), 'まんなか てまえは まだ 雪');
  assert.ok(dist(g42, g58) <= 40, '雪 → 岩 は なめらか ' + dist(g42, g58));
  // さばく → 山: いろは 出発 → 到着 へ ひとつの むきに すすむ(とちゅうで さばくに もどらない)
  for (const [id, from] of [['desert|mountain', 'desert'], ['desert|mountain', 'mountain'], ['city|desert', 'city'], ['snow|mountain', 'snow']]) {
    const q = M.createCorridorWalk(M.walkCorridorSpec(id), from, {}).world, to = id.split('|').find((r) => r !== from);
    const A0 = rgb(M.WORLDS[from].ground[0]), B0 = rgb(M.WORLDS[to].ground[0]), ax = B0.map((v, i) => v - A0[i]), n2 = ax.reduce((u, v) => u + v * v, 0);
    const proj = (t) => { q.setProgress(t); const c = rgb(q.ground[0]); return c.reduce((u, v, i) => u + (v - A0[i]) * ax[i], 0) / n2; };
    let back = 0; for (let t = 0.02; t <= 1; t += 0.02) back = Math.max(back, proj(t - 0.02) - proj(t));
    assert.ok(back <= 0.03, `${id} ${from}→ いろが もどる ${back.toFixed(3)}`);
  }
});

test('8. home.bigtree の 2 出口: むきで 1 つに きまる(もり / かわ を とりちがえない)。city の 3 出口も とりちがえない', () => {
  for (const [region, cases] of [['home', [['forest', 'home|forest'], ['river_lake', 'home|river_lake']]], ['city', [['desert', 'city|desert']]]]) {
    for (const [to, id] of cases) {
      const R = run({ region });
      R.go(to); const c = R.enter();
      assert.ok(c, `${region}→${to}`); assert.equal(c.connectionId, id);
      R.arrive(); assert.equal(R.s.regionId, to);
      R.r.stop();
    }
  }
  // resolveGate: bigtree で むきが もり なら もり、かわ なら かわ。まんなかは えらばない(まちがった ほうへ 出ない)
  const { M } = setup();
  const w = M.buildWorld('home', M.buildRegistry()), gs = arr(M.regionGates('home', w)).filter((g) => g.spot.id === 'bigtree');
  assert.deepEqual(gs.map((g) => g.id).sort(), ['home|forest', 'home|river_lake']);
  for (const g of gs) {
    const sp = g.spot, b = g.bearing, z = g.out === 'far' ? sp.z : sp.z;
    const pick = M.resolveGate(gs, { x: sp.x + b.x * sp.r * 0.6, z: z + b.z * sp.r * 0.6, mx: b.x, mz: b.z > 0 ? Math.max(b.z, 0.5) : Math.min(b.z, -0.5) });
    assert.ok(!pick || pick.id === g.id, `${g.id} → ${pick && pick.id}`);
  }
});
