// 大人数の なかまを かるく えがく(Large-party performance stabilization)
// (docs/handoff/meguru-phase4e2-home-forest-poc-2026-09-23.md §17)
//
// ここで しばるのは
//   ・うしろむきの「すこし くらく」を ctx.filter で まいかい えがかない(画像ごとに 1 回 作って つかいまわす)
//   ・なかまの こまかさ(LOD: full / medium / light)は 見かけの 大きさ と きょりで きまる(人数・並び順では きまらない)。さかいで ぱたぱた しない
//   ・light でも キャラは けさない(全員 えがく)。ならび(いち)は かえない
//   ・作れない ときは もとの えがきかた(filter)へ もどる。こわれない
//   ・corridor の 暗転が こい ときは 道の え を えがかない(ぬりつぶし だけ)
//   ・27 にんで あるいて 着く・引き返す・reload・reduced motion。組む(build)のは 1 回。セーブは かわらない
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');

const arr = (x) => Array.from(x || []);
// よみこんだ ことに する 画像(128 × 128)
class LoadedImage { constructor() { this.complete = true; this.naturalWidth = 128; this.naturalHeight = 128; this.width = 128; this.height = 128; this.decoding = 'async'; this._src = ''; } set src(v) { this._src = v; } get src() { return this._src; } }
function setup(n, o = {}) {
  const h = harness({ fullDisplay: true, imageClass: LoadedImage, reducedMotion: !!o.reduced });
  const M = h.api.meguruMod, s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, regionId: 'home' });
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
const COUNTED = new Set(['fill', 'stroke', 'fillRect', 'drawImage', 'fillText', 'arc', 'ellipse', 'createLinearGradient', 'createRadialGradient']);
// なんでも うける ctx。命令と filter の せっていを 記録する
function recCtx(W = 338, H = 533) {
  const log = [], filters = [], sources = [];
  const t = { canvas: { width: W, height: H }, globalAlpha: 1, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '10px sans-serif', textAlign: 'left', textBaseline: 'alphabetic', filter: 'none', globalCompositeOperation: 'source-over' };
  const grad = { addColorStop() {} };
  const ctx = new Proxy(t, {
    get(o, k) {
      if (k in o) return o[k];
      if (typeof k !== 'string') return undefined;
      if (k === 'measureText') return (s) => ({ width: String(s).length * 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
      if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
      return (...a) => { log.push(k); if (k === 'drawImage') sources.push(a[0]); return k.startsWith('create') ? grad : undefined; };
    },
    set(o, k, v) { if (k === 'filter' && v && v !== 'none') filters.push(v); o[k] = v; return true; },
  });
  return { ctx, log, filters, sources, counted: () => log.filter((k) => COUNTED.has(k)).length, reset() { log.length = 0; filters.length = 0; sources.length = 0; } };
}
// え の したく よう の canvas(作った かずを かぞえる)
function canvasMaker(o = {}) {
  const made = [];
  const make = (w, h) => { if (o.fail) return null; if (o.throws) throw new Error('no canvas'); const c = { width: w, height: h, _ctx: recCtx(w, h).ctx, getContext() { return this._ctx; } }; made.push(c); return c; };
  return { make, made };
}
function renderer(M, o = {}) {
  const rc = recCtx(), cm = canvasMaker(o);
  const r = M.createCanvasRenderer({ canvas: {}, ctx: rc.ctx, rawCtx: rc.ctx, W: 338, H: 533, tier: 0, makeCanvas: cm.make });
  return { r, rc, cm };
}
// なかまを ならびの まま あるかせて、とまった ところ(みんな うしろむき〜よこ)
function walked(n, sec = 4) {
  const { M } = setup(n), S = sim(M);
  for (let i = 0; i < sec * 60; i++) S.step(1 / 60, { x: 0, y: -1 });
  return { M, S };
}
// なかま だけの 命令の かず(なかま あり − なし)。けしき・じゅうみんは のぞく(えがく かずの 上限で けしきが へると かぞえが ずれる)
function partyCost(r, rc, v) {
  const view = Object.assign({}, v, { residents: [], world: Object.assign({}, v.world, { props: [], residents: [] }) });
  const noParty = Object.assign({}, view, { party: [] });
  r.draw(noParty, 1000); rc.reset(); r.draw(noParty, 1000); const base = rc.counted();
  r.draw(view, 1000); rc.reset(); r.draw(view, 1000);
  return { cost: rc.counted() - base, filters: rc.filters.slice(), sources: rc.sources.slice() };
}
const SIZES = [1, 4, 8, 16, 27];

test('1. partyLod: ちかい なかまは full、見かけの 大きさで medium / light。さかいで ぱたぱた しない・決定的', () => {
  const { M } = setup(1);
  const L = M.PARTY_LOD;
  assert.equal(M.partyLod(0.3, L.nearD - 1), 'full', 'じぶんの そばは いつも full');
  assert.equal(M.partyLod(L.full + 0.01, 400), 'full');
  assert.equal(M.partyLod((L.full + L.medium) / 2, 400), 'medium');
  assert.equal(M.partyLod(L.medium - 0.01, 400), 'light');
  // さかいの まわりで ゆれても かわらない(あそび hys)
  for (const [prev, lo, hi] of [['light', L.medium - 0.02, L.medium + 0.02], ['medium', L.medium - 0.02, L.medium + 0.02], ['medium', L.full - 0.02, L.full + 0.02], ['full', L.full - 0.02, L.full + 0.02]]) {
    let cur = prev, changes = 0;
    for (let i = 0; i < 100; i++) { const nx = M.partyLod(i % 2 ? lo : hi, 400, cur); if (nx !== cur) changes++; cur = nx; }
    assert.equal(changes, 0, `${prev}: ${lo.toFixed(2)}〜${hi.toFixed(2)} で ゆれても かわらない`);
  }
  // はっきり こえたら かわる
  assert.equal(M.partyLod(L.medium + L.hys + 0.01, 400, 'light'), 'medium');
  assert.equal(M.partyLod(L.medium - L.hys - 0.01, 400, 'medium'), 'light');
  // 決定的(おなじ いりょく → おなじ こたえ)
  for (let i = 0; i < 50; i++) { const q = (i * 37 % 100) / 100; assert.equal(M.partyLod(q, 300 + i), M.partyLod(q, 300 + i)); }
});

test('2. 1 / 4 / 8 / 16 / 27 にん: 全員 えがく・filter を まいかい つかわない・うしろの なかまほど かるい。16 にん いじょうは 命令 1 にん 2 いか', () => {
  for (const n of SIZES) {
    const { M, S } = walked(n), { r, rc } = renderer(M);
    const v = S.view();
    const before = S.party.map((a) => [a.x, a.z, a.heading]);
    const st0 = { ...r.spriteStats };
    const { cost, filters, sources } = partyCost(r, rc, v);
    // けしきも じゅうみんも ない え なので、え(画像)は みんな なかま。1 にん 1 まい いじょう(light でも けさない)
    assert.ok(sources.filter((q) => q && (q.getContext || q instanceof LoadedImage)).length >= n, n + ': なかま 全員の え が ある');
    const st = r.spriteStats, got = { full: st.full - st0.full, medium: st.medium - st0.medium, light: st.light - st0.light };
    assert.deepEqual(filters, [], n + ': ctx.filter を つかわない');
    // 2 かい えがいた ぶん。全員 どれかの LOD で えがかれる(けさない)
    assert.equal(got.full + got.medium + got.light, n * 2, n + ': 全員 えがく');
    assert.ok(got.full >= 2, n + ': じぶんの そばは full');
    if (n >= 16) {
      assert.ok(got.light >= n * 2 * 0.3, `${n}: うしろの 段は light(${JSON.stringify(got)})`);
      assert.ok(got.full <= n * 2 * 0.5, `${n}: 全員 full では ない(${JSON.stringify(got)})`);
    }
    // まえは 1 にん 3(かげ ellipse + fill + え)。すくない ときは ふえない、おおい ときは 1 にん 2 いか
    assert.ok(cost <= n * 3 + 2, `${n}: なかまの 命令 ${cost} は まえより ふえない`);
    if (n >= 16) assert.ok(cost <= n * 2, `${n}: なかまの 命令 ${cost} (1 にん 2 いか)`);
    if (n === 27) assert.ok(cost <= 50, '27 にんで 命令 50 いか ' + cost);
    // えがいても ならびは かわらない
    assert.deepEqual(S.party.map((a) => [a.x, a.z, a.heading]), before, n + ': えがく ことで いちは かわらない');
  }
});

test('3. え の したく: 1 回 作って つかいまわす(つぎの frame は 作らない)。おなじ え は おなじ もの。destroy で すてる', () => {
  const { M, S } = walked(27), { r, rc, cm } = renderer(M);
  const v = S.view();
  r.draw(v, 1000);
  const built1 = r.spriteStats.built, size1 = r.spriteCacheSize;
  assert.ok(built1 > 0 && built1 === cm.made.length - (cm.made.length - built1), '作った');
  assert.ok(size1 <= 27 * 2 + 1, 'なかま 1 にん 2 まい まで ' + size1);
  rc.reset(); r.draw(v, 1000);
  const src1 = rc.sources.filter((q) => q && q.getContext);
  const hits1 = r.spriteStats.hits;
  for (let i = 0; i < 5; i++) r.draw(v, 1000 + i * 16);
  assert.equal(r.spriteStats.built, built1, 'つぎの frame からは 作らない');
  assert.ok(r.spriteStats.hits > hits1, 'つかいまわす');
  rc.reset(); r.draw(v, 1000);
  const src2 = rc.sources.filter((q) => q && q.getContext);
  assert.ok(src1.length > 0 && src2.length === src1.length && src2.every((q, i) => q === src1[i]), 'おなじ え は おなじ もの');
  assert.ok(r.spriteStats.bytes > 0 && r.spriteStats.bytes < 8 * 1024 * 1024, 'メモリは 8 MB みまん ' + r.spriteStats.bytes);
  r.destroy();
  assert.equal(r.spriteCacheSize, 0, 'destroy で すてる');
});

test('4. したくが できない(canvas が 作れない / こける)ときは もとの えがきかた へ。こわれない・全員 えがく', () => {
  for (const o of [{ fail: true }, { throws: true }]) {
    const { M, S } = walked(27), { r, rc } = renderer(M, o);
    const v = S.view();
    assert.doesNotThrow(() => { r.draw(v, 1000); r.draw(v, 1016); });
    assert.equal(r.spriteStats.fails, 1, 'いちど こけたら それからは 作ろうと しない');
    assert.equal(r.spriteCacheSize, 0);
    rc.reset(); r.draw(v, 1032);
    assert.ok(rc.filters.length > 0, 'うしろむき は もとの filter で くらく');
    assert.ok(rc.log.filter((k) => k === 'drawImage').length >= 27, '全員 えがく');
  }
});

test('5. 暗転の こさで 道の え を えがくか きめる: 0.95 いじょう は えがかない', () => {
  const { M } = setup(1);
  assert.ok(M.CORRIDOR_COVER_SKIP >= 0.9 && M.CORRIDOR_COVER_SKIP < 1);
  assert.equal(M.corridorCoverSkip(0), false);
  assert.equal(M.corridorCoverSkip(0.94), false);
  assert.equal(M.corridorCoverSkip(M.CORRIDOR_COVER_SKIP), true);
  assert.equal(M.corridorCoverSkip(1), true);
});

// start() で 27 にん
function run(n, o = {}) {
  const { h, M, s } = setup(n, o);
  const B = h.api.meguruBridge, pad = { vec: { x: 0, y: 0 } }, real = B.createTouchPad;
  B.createTouchPad = (row, opts) => { const p = real(row, opts); return Object.assign({}, p, { vector: () => pad.vec, destroy: p.destroy }); };
  if (o.reduced) h.window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  const draws = [];
  const r = M.start(h.document.getElementById('meguruOverlay'), { renderer: () => ({ draw(v) { draws.push(v.world.corridor ? 'C' : v.world.regionId); }, destroy() {}, setDistant() {} }) });
  h.advance(300);
  const go = (to) => {
    const g = r.sim.gates.find((q) => q.to === to), b = g.bearing || (g.out === 'far' ? { x: 0, z: 1 } : { x: 0, z: -1 });
    pad.vec = { x: 0, y: 0 };
    r.setPlayer(g.spot.x - b.x * (g.spot.r + 200), g.spot.z - b.z * (g.spot.r + 200)); h.advance(100);
    r.setPlayer(g.spot.x - b.x * 40, g.spot.z - b.z * 40); r.sim.camera.yaw = Math.atan2(b.x, b.z);
    pad.vec = { x: 0, y: -1 };
  };
  return { h, M, s, r, pad, draws, go };
}
const walkTo = (R, frac) => { for (let i = 0; i < 400; i++) { const c = R.r.corridor; if (c && c.phase === 'walk' && c.s >= frac * 2700) return c; R.h.advance(50); } return R.r.corridor; };

test('6. 27 にんで home → forest → home: 暗転の こい frame は 道を えがかない。組むのは 1 回(二重 build なし)。なかまは 27 のまま', () => {
  const R = run(27), H = R.r.corridorStats.handoff, h0 = { ...H };
  R.go('forest');
  walkTo(R, 0.5);
  const d0 = R.draws.length;
  for (let i = 0; i < 200 && R.r.corridor; i++) R.h.advance(50);
  assert.equal(R.s.regionId, 'forest');
  const st = R.r.corridorStats;
  assert.ok(st.coverSkips >= 1, '暗転の こい frame は えがかない ' + st.coverSkips);
  assert.ok(R.draws.length - d0 > 5, 'それいがいは えがく');
  assert.equal(st.prepares, 1); assert.equal(H.hits - h0.hits, 1, '組んだ world を つかった'); assert.equal(H.misses - h0.misses, 0, '二重 build なし');
  assert.equal(R.r.party.length, 27); assert.equal(new Set(R.r.party.map((a) => a.key)).size, 27);
  const skips1 = st.coverSkips;
  R.h.advance(300); R.go('home'); walkTo(R, 0.97);
  for (let i = 0; i < 100 && R.r.corridor; i++) R.h.advance(50);
  assert.equal(R.s.regionId, 'home');
  assert.ok(R.r.corridorStats.coverSkips > skips1, '帰りも おなじ');
  assert.equal(R.r.corridorStats.prepares, 2); assert.equal(H.misses - h0.misses, 0);
  assert.equal(R.r.party.length, 27);
  // セーブに LOD・え の したく は のこらない
  assert.ok(!/lodMemo|spriteCache|"lod"|coverSkip/.test(JSON.stringify(R.s)), 'セーブは かわらない');
  R.r.stop();
});

test('7. 27 にん: 着く まえに 引き返す(組んだ ものを すてる)・とちゅうで reload・reduced motion は transition', () => {
  // 引き返す
  {
    const R = run(27);
    R.go('forest'); walkTo(R, 0.95);
    assert.equal(R.r.corridor.prepared, true);
    R.pad.vec = { x: 0, y: 1 };
    for (let i = 0; i < 400 && R.r.corridor; i++) R.h.advance(50);
    assert.equal(R.r.world.regionId, 'home'); assert.equal(R.s.regionId, 'home');
    assert.ok(R.r.corridorStats.discards >= 1 && R.r.corridorStats.backs === 1);
    assert.equal(R.r.party.length, 27);
    R.r.stop();
  }
  // とちゅうで reload(やめて もういちど start)→ home から
  {
    const R = run(27);
    R.go('forest'); walkTo(R, 0.6);
    assert.ok(R.r.corridor);
    R.r.stop();
    assert.equal(R.s.regionId, 'home', 'セーブは home の まま');
    const r2 = R.M.start(R.h.document.getElementById('meguruOverlay'), { renderer: () => ({ draw() {}, destroy() {}, setDistant() {} }) });
    R.h.advance(300);
    assert.equal(r2.world.regionId, 'home'); assert.equal(r2.corridor, null); assert.equal(r2.party.length, 27);
    r2.stop();
  }
  // reduced motion: 道を あるかない(いまの transition)
  {
    const R = run(27, { reduced: true });
    R.go('forest');
    let saw = false;
    for (let i = 0; i < 200; i++) { R.h.advance(50); if (R.r.corridor) saw = true; if (R.r.world.regionId === 'forest') break; }
    assert.equal(saw, false, 'reduced motion では corridor に 入らない');
    assert.equal(R.r.world.regionId, 'forest'); assert.equal(R.r.party.length, 27);
    R.r.stop();
  }
});

test('8. ほかの 出口・special は いまの まま(連続で あるくのは home|forest だけ)', () => {
  const { M } = setup(1);
  assert.deepEqual(arr(M.CONTINUOUS_WALK_ALLOWLIST), ['home|forest']);
  let n = 0;
  for (const id of Object.keys(M.WORLDS)) {
    const w = M.buildWorld(id, M.buildRegistry());
    for (const g of arr(M.regionGates(id, w))) {
      const m = M.continuousWalkMode(g, {});
      if (g.id === 'home|forest') { assert.equal(m.mode, 'corridor'); n++; }
      else assert.equal(m.reason, g.kind === 'walk' ? 'not-allowed' : 'not-walk', g.id);
    }
  }
  assert.equal(n, 2);
});
