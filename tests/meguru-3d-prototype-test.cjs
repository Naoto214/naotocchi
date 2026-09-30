// めぐる 3D prototype(forest だけ・?meguru3d=1 だけ)。docs/qa/meguru-forest-3d-prototype-2026-09-30.md
//
// ここで しばるのは
//   ・フラグが ない とき: forest の world・見た目・あたりは いまの 2D と 1 つも かわらない
//   ・3D モード: 道の うえの かたい 物は 見た目と あたりを 一体で 道の そとへ(約 1.5 × 大きさ まで)。おけなければ 3D では おかない
//   ・かたい 物の 3D の 見た目は あたりから つくる: あたまより 下で あたりより 太い 見た目は ない(とおれる 木 / 見えない かべ が ない)
//   ・道は ふさがない。50 の spot に ぜんぶ あるいて 行ける。27 にんの なかまも めりこまない
//   ・レンダラーは WebGL が なければ すぐ 2D。セーブ・フラグは のこさない。Three.js は version 固定で repo の なか
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { harness } = require('./helpers/runtime-harness.cjs');

const ROOT = path.join(__dirname, '..');
const arr = (x) => Array.from(x || []);
function setup(n = 1) {
  const h = harness({ deterministic: true, fullDisplay: true });
  const M = h.api.meguruMod, s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, regionId: 'forest' });
  if (n > 1) {
    const comps = arr(h.api.normalCompanions).concat(arr(h.api.rareCompanions)).slice(0, n - 1);
    s.companions = comps.map((c) => ({ id: c.id, bond: 100 })); s.lifetime.companionsRecruited = comps.map((c) => c.id);
    const pc = arr(h.api.partnerCandidates)[0];
    s.partner = { id: pc.id, label: pc.label || pc.name, emoji: pc.emoji, affection: 100 }; s.lifetime.partnersRecorded = [pc.id];
  }
  h.api.render();
  return { h, M, s };
}
const { M } = setup();
const reg = M.buildRegistry();
const w2 = M.buildWorld('forest', reg, {});
const w3 = M.buildWorld('forest', reg, { world3d: true });
const objs = M.worldObjects3d(w3);

test('1. フラグなし: forest の world は いまの 2D の まま(props・あたり・3D の しるし なし)', () => {
  assert.equal(w2.world3d, undefined);
  assert.equal(w2.props.length, 1233);
  assert.equal(w2.obstacles.length, 531);
  assert.ok(!w2.props.some((p) => p.moved3d || p.drop3d));
  // ?meguru3d=1 が なければ world3dOn は false(ほかの 地域は フラグが あっても 2D)
  assert.equal(M.world3dOn('forest', {}), false);
  assert.equal(M.world3dOn('city', { world3d: undefined }), false);
  assert.deepEqual([...M.WORLD3D_REGIONS], ['forest']);
});

test('2. 3D モード: 道の うえの かたい 物は 見た目ごと 道の そとへ(約 1.5 × 大きさ まで)。おけない ものは 3D では おかない', () => {
  const st = w3.world3d;
  const moved = Object.values(st.moved).reduce((a, b) => a + b, 0), dropped = Object.values(st.dropped).reduce((a, b) => a + b, 0);
  assert.equal(moved + dropped, st.candidates);
  assert.ok(moved > dropped, `うごかした ${moved} > おかない ${dropped}`);
  assert.ok(dropped <= 45, 'おかない ものは すくない ' + dropped);
  assert.equal(w3.props.length, w2.props.length - dropped);
  for (const m of st.moves) assert.ok(m.d > 0, m.kind);
  // うごかした 物は それぞれ 1.5 × 絵の はば の なか
  const byKey = new Map(w2.props.map((p, i) => [(p.struct || p.emoji) + ':' + i, p]));
  let checked = 0;
  w3.props.forEach((p) => {
    if (!p.moved3d) return;
    const vh = p.size * (p.struct && M.OCCLUDER_BOX[p.struct] ? M.OCCLUDER_BOX[p.struct][0] : M.OCCLUDER_BOX.glyph[0]);
    const o = w2.props.find((q) => q.size === p.size && (q.struct || q.emoji) === (p.struct || p.emoji) && Math.hypot(q.x - p.x, q.z - p.z) <= 1.5 * 2 * vh + 0.5 && !w3.props.includes(q));
    assert.ok(o, `${p.struct || p.emoji}: もとの 場所から 1.5 × 大きさ の なか`);
    checked++;
  });
  assert.equal(checked, moved);
  assert.ok(byKey.size > 0);
});

test('3. 3D の かたい 物は かならず あたりが あり、あたまより 下の 見た目は あたり + 10 まで(とおれる 木・見えない かべ なし)', () => {
  assert.equal(objs.unresolved.length, 0, 'あたりの ない かたい 見た目は ない ' + Array.from(objs.unresolved).join(','));
  const SOLID = new Set(['conifer', 'broadleaf', 'bigtree', 'rock', 'log', 'stump', 'mushroom', 'waterfall']);
  let n = 0;
  for (const ob of objs.objects) {
    if (!SOLID.has(ob.type)) continue;
    n++;
    assert.ok(ob.collision, ob.id + ' あたりが ある');
    const r = Math.max(ob.collision.hw, ob.collision.hd);
    assert.equal(ob.x, ob.collision.x); assert.equal(ob.z, ob.collision.z);   // 見た目の 中心 = あたりの 中心
    for (const pt of ob.parts) {
      if ((pt.y || 0) >= M.OBJ3D_HEAD) continue;
      const rad = pt.shape === 'rock' || pt.shape === 'cliff' ? Math.max(pt.rx, pt.rz) : pt.shape === 'log' ? pt.len / 2 : pt.shape === 'fall' ? 0 : pt.r || 0;
      const lim = pt.shape === 'rock' || pt.shape === 'cliff' ? r : pt.shape === 'log' ? ob.collision.hw : r + 10;
      assert.ok(rad <= lim + 0.01, `${ob.id} ${ob.type}/${pt.shape}: あたまより 下の 見た目 ${rad.toFixed(1)} <= あたり ${lim.toFixed(1)}`);
    }
  }
  assert.ok(n > 500, 'かたい 物 ' + n);
  // あたりの ある 物は ぜんぶ 3D で 見える(見えない かべ なし)
  const shown = new Set(objs.objects.filter((ob) => ob.collision).map((ob) => ob.pi));
  for (const o of w3.obstacles) if (o.role === 'solid') assert.ok(shown.has(o.pi), 'あたり ' + o.kind + ' は 見える');
});

test('4. 3D モードでも 道は ふさがない: 道はばの 3/4 の なか・spot の まんなか は あいて いる', () => {
  let n = 0;
  for (const sg of w3.segments) {
    const dx = sg.b.x - sg.a.x, dz = sg.b.z - sg.a.z, L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L;
    for (let i = 0, steps = Math.max(2, Math.ceil(L / 40)); i <= steps; i++) for (const u of [-0.75, -0.5, 0, 0.5, 0.75]) {
      const x = sg.a.x + dx * i / steps + nx * sg.half * u, z = sg.a.z + dz * i / steps + nz * sg.half * u;
      if (Math.abs(x) > w3.halfW - 30 || z < 80 || z > w3.len - 80) continue;
      n++;
      for (const o of w3.obstacles) if (o.role === 'solid') assert.ok(M.colliderPenetration(o, x, z, M.RULES.bodyRadius) <= 0.5, `${o.kind} が 道 ${sg.a.id}|${sg.b.id} に かかる`);
    }
  }
  assert.ok(n > 1000);
  for (const sp of w3.spots) assert.ok(!M.collidesAt(w3, sp.x, sp.z, M.RULES.bodyRadius), sp.id);
});

test('5. 3D モードの forest: 50 の spot に ぜんぶ あるいて 行ける', () => {
  const sim = M.createSimulation({ regionId: 'forest', discovered: [], world3d: true });
  const w = sim.world;
  assert.ok(w.world3d, '3D モードの world');
  const adj = new Map(w.spots.map((s) => [s.id, []]));
  for (const sg of w.segments) { adj.get(sg.a.id).push(sg.b); adj.get(sg.b.id).push(sg.a); }
  const start = w.spots[0], seen = new Set([start.id]), order = [], q = [start], from = new Map();
  while (q.length) { const c = q.shift(); order.push(c); for (const nb of adj.get(c.id)) if (!seen.has(nb.id)) { seen.add(nb.id); from.set(nb.id, c); q.push(nb); } }
  const walkTo = (t) => { for (let i = 0; i < 4000; i++) { const dx = t.x - sim.player.x, dz = t.z - sim.player.z, d = Math.hypot(dx, dz) || 1; if (d < Math.max(40, (t.r || 60) * 0.5)) return true; sim.step(1 / 60, { x: dx / d, y: -dz / d }); } return false; };
  for (const sp of order.slice(1)) { const par = from.get(sp.id); sim.setPlayer(par.x, par.z); assert.ok(walkTo(sp), `${sp.id}: ${par.id} から あるいて 行ける`); }
  assert.equal(w.spots.length, 50);
});

test('6. 3D モードの forest: 27 にんの なかまも player も かたい 物に めりこまない', () => {
  const { M: M27 } = setup(27);
  const S = M27.createSimulation({ regionId: 'forest', env: { time: 'day', weather: 'sunny', season: 'spring', region: 'forest' }, world3d: true });
  const r = M27.RULES.bodyRadius * M27.STAND_CLEAR;
  let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
  let dir = { x: 0, y: -1 }, worstParty = 0, worstPlayer = 0;
  for (let f = 0; f < 1600; f++) {
    if (f % 90 === 0) { const a = rnd() * Math.PI * 2; dir = { x: Math.sin(a), y: -Math.abs(Math.cos(a)) - 0.2 }; }
    S.step(1 / 60, f % 400 < 340 ? dir : { x: 0, y: 0 });
    worstPlayer = Math.max(worstPlayer, M27.penetrationAt(S.world, S.player.x, S.player.z, M27.RULES.bodyRadius));
    for (const a of S.party) worstParty = Math.max(worstParty, M27.penetrationAt(S.world, a.x, a.z, r));
  }
  assert.equal(S.party.length, 27);
  assert.ok(worstParty <= 0.5, 'なかま ' + worstParty.toFixed(2));
  assert.ok(worstPlayer <= 0.5, 'player ' + worstPlayer.toFixed(2));
});

test('7. レンダラー: WebGL が ない ところでは すぐ 2D(こわれない・この あいだ ずっと 2D)', async () => {
  const mod = await import(path.join(ROOT, 'meguru-3d.mjs'));
  assert.equal(mod.THREE_REVISION, '170');
  assert.equal(mod.webgl2Available(null), false);
  let drawn2d = 0, fellBack = null;
  const fakeM = Object.assign({}, M, { createCanvasRenderer: () => ({ draw() { drawn2d++; }, resize() {}, destroy() {}, setAnimLevel() {}, setDistant() {} }) });
  const r = mod.createMeguru3D(fakeM, { onFallback: (e) => { fellBack = e; } })({ canvas: {}, ctx: null, W: 300, H: 500 });
  const view = { world: w3, camera: { x: 0, z: 300, yaw: 0, dist: 430, height: 1 }, player: { x: 0, z: 300 }, party: [], residents: [], env: {}, mood: {} };
  r.draw(view, 0); r.draw(view, 16);
  assert.equal(drawn2d, 2, '2D で えがいた');
  assert.ok(fellBack, 'fallback の しらせ');
  assert.equal(r.failed, true); assert.equal(r.is3D, false);
  // corridor や ほかの 地域は そもそも 3D に しない
  const r2 = mod.createMeguru3D(fakeM)({ canvas: {}, W: 300, H: 500 });
  r2.draw(Object.assign({}, view, { world: w2 }), 0);
  assert.equal(r2.failed, false, '2D の world では 3D を ためさない');
  r2.draw(Object.assign({}, view, { world: Object.assign({}, w3, { corridor: 'home|forest' }) }), 0);
  assert.equal(r2.failed, false, 'corridor の world は 2D のまま(3D を ためさない)');
  assert.equal(r2.is3D, false);
});

test('8. フラグは URL だけ・セーブに のこさない。Three.js は version 固定で repo の なか。ふだんは よみこまない', () => {
  const script = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8');
  assert.match(script, /meguru3d=1/);
  assert.equal((script.match(/meguru3d/gi) || []).filter(() => true).length > 0, true);
  assert.ok(!/localStorage\.setItem\([^)]*meguru3d/i.test(script) && !/state\.meguru3d|lifetime\.meguru3d/.test(script), 'セーブにも localStorage にも かかない');
  // classic の script.js に 動的 import を かくと vite の dev server(npm run dev)が こわす。module は <script type="module"> で よむ
  assert.ok(!/\bimport\(/.test(script), 'script.js に import( が ない');
  assert.match(script, /tag\.type = 'module'/);
  assert.match(fs.readFileSync(path.join(ROOT, 'meguru-3d.mjs'), 'utf8'), /window\.NaotocchiMeguru3D = /);
  const mod = fs.readFileSync(path.join(ROOT, 'meguru-3d.mjs'), 'utf8');
  const imp = mod.match(/from '\.\/(vendor\/three-(\d+\.\d+\.\d+)\/three\.module\.min\.js)'/);
  assert.ok(imp, 'three は version の ついた フォルダ から');
  assert.ok(fs.existsSync(path.join(ROOT, imp[1])) && fs.existsSync(path.join(ROOT, 'vendor/three-' + imp[2] + '/LICENSE')));
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(!/<script[^>]+meguru-3d/.test(html) && !/modulepreload[^>]+meguru-3d|three\.module/.test(html), 'index.html は 3D を よみこまない(template の data-src だけ)');
  assert.match(html, /<template id="meguru3dModule" data-src="meguru-3d\.mjs\?v=\d{8}-[0-9a-f]{8}"><\/template>/);
});
