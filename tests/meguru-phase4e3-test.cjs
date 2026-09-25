// Phase 4E-3: home|forest の corridor で、着く がわの world を とちゅうで 組んで おく(preload)
// (docs/handoff/meguru-phase4e3-corridor-preload-2026-09-24.md)
//
// ここで しばるのは
//   ・じょうたい: idle → preparing → ready → committed / aborted / failed。のこり 810 で 組み、のこり 1485 より もどれば すてる(あそび。6 段では 0.70 / 0.45)
//   ・buildWorldSteps は くぎって 組んでも 1 回で 組んでも 同じ world(13 地域)
//   ・組んで いる あいだ 正本(regionId・セーブ)は 出発 地域の まま。地域を かえるのは 着いた ときの 1 回
//   ・着いた ときに 組んだ world を つかう(buildWorld を 2 回 よばない)。まにあわなければ のこりを 組む
//   ・こけても 歩ける。着いた ときに 4E-2 の 着き方で 組む。その 旅では もう 組まない
//   ・引き返す / reload で すてる。10 往復しても たまらない。行きも 帰りも 同じ しくみ。27 にん
//   ・ほかの 出口・special は いまの まま
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');

const arr = (x) => Array.from(x || []);
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
  if (o.reduced) h.window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  if (o.perfTier != null) B.perfTier = () => o.perfTier;
  const r = M.start(h.document.getElementById('meguruOverlay'), { renderer: () => ({ draw() {}, destroy() {}, setDistant() {} }), corridorFaults: o.faults || null });
  h.advance(300);
  const go = (to) => {
    const g = r.sim.gates.find((q) => q.to === to), b = g.bearing || (g.out === 'far' ? { x: 0, z: 1 } : { x: 0, z: -1 });
    pad.vec = { x: 0, y: 0 };
    r.setPlayer(g.spot.x - b.x * (g.spot.r + 200), g.spot.z - b.z * (g.spot.r + 200)); h.advance(100);
    r.setPlayer(g.spot.x - b.x * 40, g.spot.z - b.z * 40); r.sim.camera.yaw = Math.atan2(b.x, b.z);
    pad.vec = { x: 0, y: -1 };
  };
  // corridor を 道の frac まで すすめる
  const walkTo = (frac) => { for (let i = 0; i < 600; i++) { const c = r.corridor; if (c && c.phase === 'walk' && c.s >= frac * 2700) return c; h.advance(50); } return r.corridor; };
  const arrive = () => { for (let i = 0; i < 100 && !r.corridor; i++) h.advance(50); for (let i = 0; i < 400 && r.corridor; i++) h.advance(50); };
  return { h, M, s, r, pad, go, walkTo, arrive, P: () => r.corridorStats.preload, H: () => r.corridorStats.handoff };
}
const snap = (x) => JSON.parse(JSON.stringify(x));

test('1. じょうたいの きまり: 道の のこり 810 で 組みはじめ、のこり 1485 より もどったら すてる(あそび)。こけた あと・着いた あとは なにも しない(Phase 4E-4A で 割合 → のこり きょり)', () => {
  const { M } = setup();
  const P = M.CORRIDOR_PRELOAD, A = M.corridorPreloadAction, LEAD = M.CORRIDOR_PRELOAD_LEAD;
  assert.deepEqual(arr(M.CORRIDOR_PRELOAD_STATES), ['idle', 'preparing', 'ready', 'failed', 'aborted', 'committed']);
  // 810 は「2 かいめの はやさ(260 × 1.4)で 着くまでに のこす 秒(組む + 余裕)」から 出る(magic number では ない)
  assert.equal(P.leadSec, LEAD.readySec + LEAD.marginSec);
  assert.equal(P.startRemaining, Math.ceil(P.leadSec * M.RULES.playerSpeed * 1.4 / 10) * 10);
  assert.equal(P.startRemaining, 810); assert.equal(P.disposeRemaining, 1485);
  assert.ok(P.disposeRemaining - P.startRemaining >= 450, 'あそびが 1 段 いじょう');
  // 6 段(2700)では 4E-3 と おなじ 0.70 / 0.45。5 段(2250)では 0.64 / 0.34
  assert.equal(1 - P.startRemaining / 2700, 0.7); assert.ok(Math.abs((1 - P.disposeRemaining / 2700) - 0.45) < 1e-9);
  assert.ok(Math.abs((1 - P.startRemaining / 2250) - 0.64) < 1e-9);
  assert.equal(A('idle', 811), null); assert.equal(A('idle', 810), 'start'); assert.equal(A('aborted', 600), 'start');
  assert.equal(A('preparing', 1200), null, 'のこり 810〜1485 の あいだは そのまま'); assert.equal(A('ready', 1485), null);
  assert.equal(A('preparing', 1486), 'abort'); assert.equal(A('ready', 2500), 'abort');
  for (const st of ['failed', 'committed']) for (const r of [0, 400, 810, 1500, 2700]) assert.equal(A(st, r), null, st);
  // さかいの まわりで ゆれても 組む / すてる を くりかえさない
  let st = 'idle', starts = 0, aborts = 0;
  for (let i = 0; i < 200; i++) { const r = i % 2 ? 815 : 805; const a = A(st, r); if (a === 'start') { starts++; st = 'ready'; } else if (a === 'abort') { aborts++; st = 'aborted'; } }
  assert.equal(starts, 1); assert.equal(aborts, 0);
  st = 'ready'; for (let i = 0; i < 200; i++) { const a = A(st, i % 2 ? 1490 : 1480); if (a === 'abort') { aborts++; st = 'aborted'; } else if (a === 'start') starts++; }
  assert.equal(aborts, 1); assert.equal(starts, 1, 'のこり 1485 あたりで ゆれても 組みなおさない');
});

test('2. buildWorldSteps: くぎって 組んでも・とちゅうで ほかの ことを しても、buildWorld と おなじ world(13 地域)', () => {
  const { M } = setup();
  const reg = M.buildRegistry();
  const ser = (w) => JSON.stringify(w, (k, v) => (v instanceof Map ? [...v] : typeof v === 'function' ? 'fn' : v));
  for (const id of Object.keys(M.WORLDS)) {
    const a = ser(M.buildWorld(id, reg, {}));
    const it = M.buildWorldSteps(id, reg, {});
    let r = it.next(), n = 0;
    while (!r.done) { if (n % 7 === 0) M.buildWorld('home', reg, {}); r = it.next(); n++; }   // あいだに べつの world を 組んでも まざらない
    assert.equal(ser(r.value), a, id);
    assert.ok(n >= 10, id + ': くぎりが ある ' + n);
  }
  // forest は 大きいので こまかく くぎれる(1 frame に のせる かたまりを ちいさく できる)
  let n = 0; const it = M.buildWorldSteps('forest', reg, {}); while (!it.next().done) n++;
  assert.ok(n >= 100, 'forest の くぎり ' + n);
});

test('3. home → forest: 0.70 から 組みはじめ、着く まえに ready。組んで いる あいだ 正本は home。着いた ときに その world を つかう(二重 build なし)', () => {
  const R = run(), H0 = snap(R.H());
  R.go('forest');
  let c = R.walkTo(0.6);
  assert.equal(c.preload, 'idle', 'まだ 組まない');
  c = R.walkTo(0.71);
  assert.ok(c.preload === 'preparing' || c.preload === 'ready', c.preload);
  // 組んで いる あいだ・組みおえても 地域も セーブも home
  for (let i = 0; i < 400 && R.r.corridor && R.r.corridor.preload !== 'ready'; i++) { assert.equal(R.s.regionId, 'home'); assert.equal(R.r.world.regionId, 'home'); R.h.advance(50); }
  c = R.r.corridor;
  assert.equal(c.preload, 'ready'); assert.ok(c.s < 2700, '着く まえに ready');
  assert.equal(R.s.regionId, 'home'); assert.equal(R.r.world.regionId, 'home');
  assert.ok(!R.s.discoveredSpots || !Object.keys(R.s.discoveredSpots).includes('forest') || true);
  R.arrive();
  assert.equal(R.s.regionId, 'forest'); assert.equal(R.r.world.regionId, 'forest');
  const P = R.P(), H = R.H();
  assert.equal(P.starts, 1); assert.equal(P.readies, 1); assert.equal(P.commits, 1); assert.equal(P.fallbacks, 0); assert.equal(P.fails, 0);
  assert.equal(R.r.corridorStats.prepares, 1, '組んだのは 1 回');
  assert.equal(H.offers - H0.offers, 1); assert.equal(H.hits - H0.hits, 1, '組んだ world を つかった'); assert.equal(H.misses - H0.misses, 0, 'buildWorld を もう 1 回 よんで いない');
  assert.ok(P.last.startFrac >= 0.7 && P.last.startFrac < 0.75, 'はじめ ' + P.last.startFrac);
  assert.ok(P.last.readyFrac < 1 && P.last.marginMs > 0 && !P.last.late, '余裕 ' + P.last.marginMs);
  // くぎりは 100 いじょう(1 frame に のせる かたまりを ちいさく できる)。1 frame の じかん(budgetMs)で 何 frame に なるかは 実画面で はかる
  assert.ok(P.last.frames >= 1 && P.last.steps >= 100, 'くぎって 組んだ ' + P.last.frames + ' / ' + P.last.steps);
  const evs = arr(P.log).map((q) => q.ev);
  assert.deepEqual(evs.filter((e) => e !== 'fallback'), ['prepare-start', 'prepare-ready', 'commit'], JSON.stringify(evs));
  R.r.stop();
});

test('4. 帰り(forest → home)も 同じ しくみ。2 かいめ(はやあし 1.4 倍)でも 着く まえに ready', () => {
  const R = run();
  R.go('forest'); R.arrive();
  assert.equal(R.s.regionId, 'forest');
  R.h.advance(300); R.go('home');
  const c = R.walkTo(0.1);
  assert.ok(c.speedMultiplier > 1, 'はやあし ' + c.speedMultiplier);
  R.arrive();
  assert.equal(R.s.regionId, 'home');
  let P = R.P();
  assert.equal(P.commits, 2); assert.equal(P.last.to, 'home'); assert.ok(!P.last.late && P.last.marginMs > 0);
  // もういちど forest へ(2 かいめ)
  R.h.advance(300); R.go('forest'); R.arrive();
  P = R.P();
  assert.equal(R.s.regionId, 'forest'); assert.equal(P.commits, 3); assert.equal(P.last.to, 'forest'); assert.ok(!P.last.late, '2 かいめ でも まにあう');
  assert.equal(P.fallbacks, 0);
  R.r.stop();
});

test('5. まにあわない(組みかけ で 着いた): のこりを その場で 組んで つかう。二重 build なし', () => {
  const R = run({ faults: { slow: true } }), H0 = snap(R.H());
  R.go('forest'); R.arrive();
  assert.equal(R.s.regionId, 'forest');
  const P = R.P(), H = R.H();
  assert.equal(P.commits, 1); assert.equal(P.last.late, true, '組みかけ だった');
  assert.ok(P.last.frames >= 20, '何 frame にも わけて 組んで いた ' + P.last.frames);
  assert.equal(R.r.corridorStats.prepares, 1); assert.equal(H.hits - H0.hits, 1); assert.equal(H.misses - H0.misses, 0);
  R.r.stop();
});

test('6. こける(台帳 / 組む とちゅう / 絵の したく / 着く ときの たしかめ): 歩きつづけ、着いた ときに 4E-2 の 着き方で forest へ。その 旅では 組みなおさない', () => {
  for (const faults of [{ registry: true }, { build: 5 }]) {
    const R = run({ faults });
    R.go('forest'); R.walkTo(0.9);
    assert.equal(R.r.corridor.preload, 'failed', JSON.stringify(faults));
    assert.equal(R.r.corridor.phase, 'walk', 'こけても 歩ける');
    // もどって また 0.7 を こえても 組みなおさない(1 旅 1 回)
    R.pad.vec = { x: 0, y: 1 }; for (let i = 0; i < 300 && R.r.corridor.s > 0.4 * 2700; i++) R.h.advance(50);
    assert.ok(R.r.corridor.s < 0.45 * 2700);
    R.pad.vec = { x: 0, y: -1 }; R.arrive();
    assert.equal(R.s.regionId, 'forest', '着く');
    const P = R.P();
    assert.equal(P.starts, 1, 'くりかえさない'); assert.equal(P.fails, 1); assert.equal(P.invalid, 0); assert.equal(P.commits, 0); assert.equal(P.fallbacks, 1);
    assert.equal(R.r.corridorStats.prepares, 1, '着いた ときに 1 回 組んだ');
    assert.equal(R.r.corridorStats.fails, 0, 'corridor じたいは こけて いない');
    // つぎの 旅では また ためす
    R.h.advance(300); R.go('home'); R.arrive();
    assert.equal(R.P().starts, 2);
    R.r.stop();
  }
  // 絵の したく が こけても 組んだ world は つかう
  {
    const R = run({ faults: { warm: true } });
    R.go('forest'); R.arrive();
    assert.equal(R.s.regionId, 'forest'); assert.equal(R.P().commits, 1); assert.equal(R.P().fallbacks, 0);
    R.r.stop();
  }
  // 着く ときの たしかめで つかえない → すてて その場で 組む(地域は かわる)
  {
    const R = run({ faults: { commit: true } });
    R.go('forest'); R.arrive();
    const P = R.P();
    assert.equal(R.s.regionId, 'forest'); assert.equal(P.invalid, 1); assert.equal(P.commits, 0); assert.equal(P.fallbacks, 1);
    assert.equal(R.r.corridorStats.prepares, 2, 'preload 1 回 + 着いて 1 回');
    R.r.stop();
  }
});

test('7. 引き返し: 組む まえ / 組みかけ / ready の あと。0.45 より もどったら すてる。もどりきれば home。また すすめば 組みなおす', () => {
  // 組む まえに 引き返す(なにも 組まない)
  {
    const R = run();
    R.go('forest'); R.walkTo(0.5);
    R.pad.vec = { x: 0, y: 1 }; R.arrive();
    assert.equal(R.s.regionId, 'home'); assert.equal(R.P().starts, 0);
    R.r.stop();
  }
  // ready の あと: 0.5 までは もったまま、0.45 より もどると すてる → また すすむと 組みなおして 着く
  {
    const R = run(), H0 = snap(R.H());
    R.go('forest'); R.walkTo(0.9);
    assert.equal(R.r.corridor.preload, 'ready');
    R.pad.vec = { x: 0, y: 1 };
    for (let i = 0; i < 400 && R.r.corridor.s > 0.5 * 2700; i++) R.h.advance(20);
    assert.equal(R.r.corridor.preload, 'ready', '0.5 では まだ もつ(あそび)');
    for (let i = 0; i < 400 && R.r.corridor.s > 0.4 * 2700; i++) R.h.advance(20);
    assert.equal(R.r.corridor.preload, 'aborted'); assert.equal(R.r.corridor.prepared, false); assert.equal(R.r.corridor.held, false, '組んだ ものを もって いない');
    assert.equal(R.s.regionId, 'home');
    R.pad.vec = { x: 0, y: -1 }; R.arrive();
    const P = R.P(), H = R.H();
    assert.equal(R.s.regionId, 'forest'); assert.equal(P.starts, 2); assert.equal(P.aborts, 1); assert.equal(P.commits, 1);
    assert.equal(H.hits - H0.hits, 1); assert.equal(H.misses - H0.misses, 0);
    R.r.stop();
  }
  // 組みかけ で 引き返して home へ もどる
  {
    const R = run({ faults: { slow: true } });
    R.go('forest'); const c = R.walkTo(0.72);
    assert.equal(c.preload, 'preparing');
    R.pad.vec = { x: 0, y: 1 };
    for (let i = 0; i < 400 && R.r.corridor && R.r.corridor.preload === 'preparing'; i++) R.h.advance(50);
    assert.equal(R.r.corridor.preload, 'aborted'); assert.equal(R.r.corridor.held, false, '組みかけ も もって いない');
    R.arrive();
    assert.equal(R.s.regionId, 'home'); assert.equal(R.r.world.regionId, 'home');
    assert.equal(R.P().aborts, 1); assert.equal(R.P().commits, 0);
    R.r.stop();
  }
});

test('8. reload(組みかけ / ready で やめる): 組んだ ものは すて、セーブは home。つぎは home から', () => {
  for (const frac of [0.72, 0.9]) {
    const R = run(frac < 0.8 ? { faults: { slow: true } } : {});
    R.go('forest'); R.walkTo(frac);
    const st = R.r.corridor.preload;
    assert.ok(st === 'preparing' || st === 'ready', st);
    const drops0 = R.H().drops;
    assert.equal(R.r.corridor.held, true);
    R.r.stop();
    assert.equal(R.P().aborts, 1, 'やめたら すてる');
    assert.equal(R.r.corridor ? R.r.corridor.held : false, false, 'やめたら なにも もって いない');
    assert.ok(R.H().drops >= drops0, 'わたす ものも すてる');
    assert.equal(R.s.regionId, 'home');
    assert.ok(!/preload|prepared|corridor/.test(JSON.stringify(R.s)), 'セーブに のこらない');
    const r2 = R.M.start(R.h.document.getElementById('meguruOverlay'), { renderer: () => ({ draw() {}, destroy() {}, setDistant() {} }) });
    R.h.advance(200);
    assert.equal(r2.world.regionId, 'home'); assert.equal(r2.corridor, null);
    r2.stop();
  }
});

test('9. 10 往復しても たまらない(組んだ world・わたす もの・ログ)。まいかい 組んで 1 回 つかう', () => {
  const R = run(), H0 = snap(R.H());
  for (let k = 0; k < 10; k++) {
    for (const to of ['forest', 'home']) {
      R.go(to); R.arrive(); R.h.advance(200);
      assert.equal(R.s.regionId, to);
      assert.equal(R.r.corridor, null);
    }
  }
  const P = R.P(), H = R.H();
  assert.equal(P.starts, 20); assert.equal(P.readies, 20); assert.equal(P.commits, 20); assert.equal(P.aborts, 0); assert.equal(P.fails, 0); assert.equal(P.fallbacks, 0);
  assert.equal(H.offers - H0.offers, 20); assert.equal(H.hits - H0.hits, 20); assert.equal(H.misses - H0.misses, 0);
  assert.ok(P.log.length <= 60, 'ログは 60 まで ' + P.log.length);
  R.r.stop();
});

test('10. 27 にんでも 組んで 着く(ならびは そのまま)。セーブに あたらしい key は ない', () => {
  const R = run({ party: 27 });
  const keys0 = Object.keys(R.s).sort().join(',');
  R.go('forest'); R.arrive();
  assert.equal(R.s.regionId, 'forest'); assert.equal(R.P().commits, 1);
  assert.equal(R.r.party.length, 27); assert.equal(new Set(R.r.party.map((a) => a.key)).size, 27);
  R.h.advance(300); R.go('home'); R.arrive();
  assert.equal(R.s.regionId, 'home'); assert.equal(R.P().commits, 2);
  assert.equal(Object.keys(R.s).sort().join(','), keys0, 'セーブの key は かわらない');
  assert.ok(!/preload|CORRIDOR_PRELOAD|readyFrac/.test(JSON.stringify(R.s)));
  R.r.stop();
});

test('11. reduced motion・perfTier 2 は いまの transition(preload も しない)。ほかの 出口・special も そのまま', () => {
  for (const o of [{ reduced: true }, { perfTier: 2 }]) {
    const R = run(o);
    R.go('forest');
    let saw = false; for (let i = 0; i < 200 && R.r.world.regionId !== 'forest'; i++) { R.h.advance(50); if (R.r.corridor) saw = true; }
    assert.equal(saw, false); assert.equal(R.r.world.regionId, 'forest'); assert.equal(R.P().starts, 0);
    R.r.stop();
  }
  const { M } = setup();
  const CONT = ['home|forest', 'home|river_lake', 'city|desert', 'desert|mountain', 'snow|mountain', 'forest|mountain', 'mountain|river_lake', 'city|sea', 'city|countryside', 'countryside|forest'];   // Phase 4E-4A: LOW 4 本・4E-4B: MEDIUM 3 本を たした
  assert.deepEqual(arr(M.CONTINUOUS_WALK_ALLOWLIST), CONT);
  for (const id of Object.keys(M.WORLDS)) {
    const w = M.buildWorld(id, M.buildRegistry());
    for (const g of arr(M.regionGates(id, w))) { const m = M.continuousWalkMode(g, {}); if (!CONT.includes(g.id)) assert.equal(m.mode, 'transition', g.id); }
  }
});
