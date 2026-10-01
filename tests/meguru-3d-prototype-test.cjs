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
  // 3D の 地域 = REGION3D の profile が ある 地域 = 登録 されて いる 地域 ぜんぶ(新しい 地域に profile を 書き忘れたら ここが 赤)
  assert.equal([...M.WORLD3D_REGIONS].sort().join(','), Object.keys(M.REGION3D).sort().join(','));
  assert.equal(Object.keys(M.WORLDS).sort().join(','), Object.keys(M.REGION3D).sort().join(','), 'profile の ない 地域');
});

test('2. 3D モード: 道の うえの かたい 物は 見た目ごと 道の そとへ(約 1.5 × 大きさ まで)。おけない ものは 3D では おかない', () => {
  const st = w3.world3d;
  const moved = Object.values(st.moved).reduce((a, b) => a + b, 0), dropped = Object.values(st.dropped).reduce((a, b) => a + b, 0);
  assert.equal(moved + dropped, st.candidates);
  assert.ok(moved > dropped, `うごかした ${moved} > おかない ${dropped}`);
  assert.ok(dropped <= 45, 'おかない ものは すくない ' + dropped);
  const added = Object.values(st.added || {}).reduce((a, b) => a + b, 0);   // ランドマークの まわりの 岩・いわだな(3D だけ)
  assert.equal(w3.props.length, w2.props.length - dropped + added);
  assert.ok(added >= 5 && added <= 10, 'たきの まわりの 岩 ' + added);
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
  const SOLID = new Set(['conifer', 'broadleaf', 'bigtree', 'rock', 'log', 'stump', 'glowmushroom', 'mushroomgrove', 'waterfall', 'ledge', 'mound', 'signpost']), WET = new Set(['pool', 'foam', 'mist', 'fall', 'wet', 'deep', 'moss', 'glowdisc', 'spark']);
  let n = 0;
  for (const ob of objs.objects) {
    if (!SOLID.has(ob.type) || (ob.type === 'signpost' && !ob.collision)) continue;   // 小さな かんばん は あたり なし(ふつうの 草花と おなじ)
    n++;
    assert.ok(ob.collision, ob.id + ' あたりが ある');
    const r = Math.max(ob.collision.hw, ob.collision.hd);
    assert.equal(ob.x, ob.collision.x); assert.equal(ob.z, ob.collision.z);   // 見た目の 中心 = あたりの 中心
    for (const pt of ob.parts) {
      if ((pt.y || 0) >= M.OBJ3D_HEAD) continue;
      // 水(たきつぼ・あわ・おちる 水)と しぶきは かたく ない。ふちの ひらたい 石は 小石と おなじく ふんで とおれる たかさ
      if (WET.has(pt.shape)) continue;
      if (pt.shape === 'stone') { assert.ok(pt.h <= 16, ob.id + ' ひらたい 石 ' + pt.h); continue; }
      if (pt.shape === 'stem' && pt.dx != null) { assert.ok(pt.h <= 26, ob.id + ' まわりの 小さな キノコ ' + pt.h); continue; }   // 足もとの 小さな キノコ(ふんで とおれる)
      if (pt.shape === 'cap' && pt.dx != null) continue;
      const rad = pt.shape === 'rock' || pt.shape === 'cliff' ? Math.max(pt.rx, pt.rz) : pt.shape === 'log' ? pt.len / 2 : pt.shape === 'board' ? pt.w / 2 : pt.r || 0;
      const lim = pt.shape === 'rock' || pt.shape === 'cliff' || pt.shape === 'mound' ? r : pt.shape === 'log' ? ob.collision.hw : r + 10;
      assert.ok(rad <= lim + 0.01, `${ob.id} ${ob.type}/${pt.shape}: あたまより 下の 見た目 ${rad.toFixed(1)} <= あたり ${lim.toFixed(1)}`);
    }
  }
  assert.ok(n > 500, 'かたい 物 ' + n);
  // あたりの ある 物は ぜんぶ 3D で 見える(見えない かべ なし)
  const shown = new Set(objs.objects.filter((ob) => ob.collision).map((ob) => ob.pi));
  for (const o of w3.obstacles) if (o.role === 'solid') assert.ok(shown.has(o.pi), 'あたり ' + o.kind + ' は 見える');
});

test('3b. ランドマーク(3D だけ): spot から 見た むきを たもって おく(±30 度)。たきは がけ = あたりの 箱 で、たきつぼ・あわ と いっしょ', () => {
  const lms = w3.world3d.moves.filter((m) => m.landmark);
  assert.equal(lms.map((m) => m.landmark).sort().join(','), 'bigtree,glowmushroom,waterfall');
  for (const m of lms) {
    const p2 = w2.props.find((p) => p.landmark === m.landmark), p3 = w3.props.find((p) => p.landmark === m.landmark);
    const sp = w3.spots.find((s) => p2.mid === 'lm:' + s.id);
    const b2 = Math.atan2(p2.x - sp.x, p2.z - sp.z), b3 = Math.atan2(p3.x - sp.x, p3.z - sp.z);
    const turn = Math.abs(Math.atan2(Math.sin(b3 - b2), Math.cos(b3 - b2))) * 180 / Math.PI;
    assert.ok(turn <= 30.01 && Math.abs(m.turn) <= 30, `${m.landmark}: spot から 見た むきの ずれ ${turn.toFixed(1)} 度`);
    assert.ok(Math.hypot(p3.x - sp.x, p3.z - sp.z) >= Math.hypot(p2.x - sp.x, p2.z - sp.z) - 0.5, m.landmark + ': spot に ちかづけて 道を ふさがない');
    assert.ok(m.scale >= 0.6 && m.scale <= 1, m.landmark + ' ねもとの ほそさ ' + m.scale);
    // あたり = 3D の 見た目の いち(ランドマークも 見えない かべ なし)
    const ob = objs.objects.find((o) => o.pi === w3.props.indexOf(p3));
    assert.ok(ob && ob.collision && ob.x === p3.x && ob.z === p3.z, m.landmark + ' あたり = 見た目');
    assert.equal(ob.spot, sp.id);
  }
  // 大きな木: いっぱんの ルール(いちばん ちかい 空き。spot から 432・むき 11 度)より spot の ちかく・正面 に
  const bt = objs.objects.find((o) => o.kind === 'LM:bigtree'), great = w3.spots.find((s) => s.id === 'great');
  assert.ok(Math.hypot(bt.x - great.x, bt.z - great.z) <= 400, '大きな木は spot から 400 まで ' + Math.hypot(bt.x - great.x, bt.z - great.z).toFixed(0));
  const trunk = bt.parts.find((pt) => pt.shape === 'trunk');
  assert.equal(trunk.r, bt.collision.hw, 'みき = あたり');
  for (const pt of bt.parts.filter((q) => q.shape === 'crown')) assert.ok(pt.y - pt.r * pt.sy >= M.OBJ3D_HEAD, 'えだはりは あたまより 上');
  // たき: がけ = あたりの 箱(よこながの 面を spot へ)。水の もの は がけの まえ・spot がわ
  const wf = objs.objects.find((o) => o.kind === 'LM:waterfall'), falls = w3.spots.find((s) => s.id === 'falls');
  assert.equal(wf.collision.shape, 'box');
  assert.ok(wf.collision.hw > wf.collision.hd * 1.5, 'がけは よこながの 箱');
  const tx = (falls.x - wf.x), tz = (falls.z - wf.z), L = Math.hypot(tx, tz);
  const depth = { x: Math.cos(wf.collision.ang), z: -Math.sin(wf.collision.ang) };   // 箱の おくゆき の じく
  assert.ok(Math.abs(depth.x * tx / L + depth.z * tz / L) > 0.999, 'がけの 面は spot へ むく');
  const cliff = wf.parts.find((pt) => pt.shape === 'cliff');
  assert.equal(cliff.rx, wf.collision.hw); assert.equal(cliff.rz, wf.collision.hd); assert.equal(cliff.ang, wf.collision.ang);
  for (const shape of ['fall', 'pool', 'foam', 'mist']) {
    const pt = wf.parts.find((q) => q.shape === shape && !q.bare && (q.y || 0) >= 0);   // がけの 上の ながれ(bare)・ふくらみ(y < 0)は べつ
    assert.ok(pt, shape);
    assert.ok((pt.dx * tx + pt.dz * tz) / L > wf.collision.hd - 20, shape + ' は がけの まえ(spot がわ)');
  }
  const pool = wf.parts.find((q) => q.shape === 'pool' && !q.bare && (q.y || 0) >= 0);
  assert.ok(Math.abs(Math.hypot(wf.x + pool.dx - falls.x, wf.z + pool.dz - falls.z) + pool.rz - L) < L * 0.6, 'たきつぼは がけ から spot まで');
  // がけの 上の ながれ(上流の けはい)は がけの 上に。ぬれた 地面・ふかい ところ・ガレ も ある
  const top = wf.parts.find((q) => q.shape === 'pool' && q.bare);
  assert.ok(top && top.y > M.OBJ3D_HEAD, 'がけの 上の ながれ');
  for (const shape of ['wet', 'deep']) assert.ok(wf.parts.some((q) => q.shape === shape), shape);
  assert.ok(wf.parts.filter((q) => q.shape === 'stone').length >= 8, 'ガレ・ふちの 石');
  // まわりの 岩・いわだな: たきと おなじ ランドマークの もの。それぞれ あたり = 見た目(いわだな = 箱、岩 = まる)。道の 3/4・spot は 4 で みる
  const sats = objs.objects.filter((o) => o.collision && String(o.collision.kind || w3.obstacles.find((ob) => ob.pi === o.pi).kind).startsWith('LM:waterfall:'));
  assert.ok(sats.length >= 3, 'まわりの 岩・いわだな ' + sats.length);
  for (const o of sats) {
    assert.ok(Math.hypot(o.x - wf.x, o.z - wf.z) < 560 * 0.8, 'たきの そば');
    if (o.type === 'ledge') { assert.equal(o.collision.shape, 'box'); assert.equal(o.parts[0].rx, o.collision.hw); assert.equal(o.parts[0].rz, o.collision.hd); assert.ok(o.parts[0].h <= 560 * 0.75, 'がけより ひくい'); }
    else if (o.type === 'mound') { assert.equal(o.collision.shape, 'circle'); assert.equal(o.parts[0].r, o.collision.hw); assert.ok(o.parts[0].h <= 560 * 0.75, 'がけより ひくい'); }
    else assert.equal(o.type, 'rock');
  }
  // 2D は かわらない: ランドマークの あたりは まるい ねもと のまま
  for (const p of w2.props.filter((q) => q.landmark)) { assert.equal(p.collider3d, undefined); assert.equal(M.colliderOf(p).shape, 'circle'); }
});

test('3c. せかいは 3D・キャラだけ 2D: けしきの 物に 立て看板・意味の ちがう 置きかえ・なぞの placeholder は ない', () => {
  const byType = {};
  for (const ob of objs.objects) byType[ob.type] = (byType[ob.type] || 0) + 1;
  assert.equal(byType.billboard, undefined, '立て看板 ' + byType.billboard);
  for (const ob of objs.objects) { assert.ok(ob.parts.length > 0, ob.kind + ' に かたちが ある'); for (const pt of ob.parts) assert.notEqual(pt.shape, 'billboard', ob.kind); }
  assert.equal(objs.unresolved.length, 0);
  // きのこ は きのこ(木に しない): 🍄・mushroomcluster・mushroomgrove・ひかる きのこ は くき + かさ
  const isMush = (ob) => ['mushrooms', 'mushroomgrove', 'glowmushroom'].includes(ob.type);
  const mush = objs.objects.filter((ob) => ob.kind === '🍄' || ob.kind === 'mushroomcluster' || ob.kind === 'mushroomgrove' || ob.kind === 'LM:glowmushroom');
  assert.ok(mush.length >= 60, 'きのこ ' + mush.length);
  for (const ob of mush) {
    assert.ok(isMush(ob), ob.kind + ' は きのこ(' + ob.type + ')');
    assert.ok(ob.parts.some((pt) => pt.shape === 'stem') && ob.parts.some((pt) => pt.shape === 'cap' || pt.shape === 'glowcap'), ob.kind + ' くき + かさ');
    assert.ok(!ob.parts.some((pt) => pt.shape === 'trunk' || pt.shape === 'crown' || pt.shape === 'cone'), ob.kind + ' は 木では ない');
  }
  const glow = objs.objects.find((ob) => ob.kind === 'LM:glowmushroom');
  assert.ok(glow.parts.some((pt) => pt.shape === 'glowcap' && pt.dx == null) && glow.parts.some((pt) => pt.shape === 'glowdisc'), 'ひかる きのこ は ひかる かさ と 足もとの 光');
  assert.ok(glow.parts.filter((pt) => pt.shape === 'glowcap').length >= 4, 'まわりにも ひかる 小さな きのこ');
  // event の 対象(spot の しるし・ランドマーク)は 名まえ どおりの かたち
  const spotObjs = objs.objects.filter((ob) => w3.props[ob.pi].spot || w3.props[ob.pi].landmark);
  assert.ok(spotObjs.length >= 15, 'spot の しるし ' + spotObjs.length);
  const WANT = { '🌉': ['plank', 'slab'], '🪧': ['post'], '🪵': ['log'], '🍄': ['stem'], mushroomcluster: ['stem'], '🌳': ['trunk'], '🪨': ['rock'], bigrock: ['rock'], log: ['log'], springpool: ['pool'], '🌼': ['flower'], 'LM:bigtree': ['trunk'], 'LM:waterfall': ['cliff'], 'LM:glowmushroom': ['glowcap'] };
  for (const ob of spotObjs) { const want = WANT[ob.kind]; assert.ok(want, 'spot の しるし ' + ob.kind + ' の きまり'); assert.ok(ob.parts.some((pt) => want.includes(pt.shape)), ob.kind + ' → ' + want.join('/')); }
  const b1 = spotObjs.find((ob) => ob.kind === '🌉' && ob.parts.some((pt) => pt.shape === 'plank')), b2 = spotObjs.find((ob) => ob.kind === '🌉' && ob.parts.some((pt) => pt.shape === 'slab'));
  assert.ok(b1 && b2, 'まるたの はし / いしの はし');
  // 3D では 出さない もの は きまった しるし だけ(手前の えだ・光の もや・巨大な しだ の ながめ・💧)
  assert.equal(Object.keys(objs.skipped).sort().join(','), 'branch,fern,undefined,💧');
  assert.equal(objs.skipped.fern, 3);
  // 巨大な は・環境の 立て看板 は ない: おちば・木の実・草・小さな きのこ は 小さい
  for (const ob of objs.objects) {
    if (ob.type === 'leaf') for (const pt of ob.parts) assert.ok(pt.w <= 30, 'おちば ' + pt.w);
    if (ob.type === 'nut') for (const pt of ob.parts) assert.ok(pt.r <= 8);
    if (ob.type === 'grass' || ob.type === 'fern' || ob.type === 'sprout') for (const pt of ob.parts) assert.ok(pt.h <= 46 && pt.r <= 10, ob.type);
    if (ob.type === 'mushrooms') for (const pt of ob.parts) assert.ok((pt.shape === 'stem' ? pt.h : pt.r) <= 26, '小さな きのこ');
  }
  assert.equal(w2.props.length, 1233); assert.equal(w2.obstacles.length, 531);
});

test('3d. すかし(occlusion)は カメラ → player の あいだに ある かたい 物 だけ。とおい から すける こと は ない', async () => {
  const mod = await import(path.join(ROOT, 'meguru-3d.mjs'));
  const oc = (x, z, r) => ({ ob: { collision: { x, z } }, r });
  const player = { x: 0, z: 1000 }, ex = 0, ez = 0;   // カメラ (0,0)・player (0,1000)
  const between = oc(0, 500, 40), beside = oc(140, 500, 40), far = oc(0, 2500, 40), behindCam = oc(0, -300, 40), huge = oc(0, 5000, 400);
  const want = mod.pickOccluders([between, beside, far, behindCam, huge], ex, ez, player, M.ACTOR_SIZE);
  assert.ok(want.has(between), 'あいだの 物は すける');
  assert.ok(!want.has(beside), 'よこの 物は すけない');
  assert.ok(!want.has(far) && !want.has(huge) && !want.has(behindCam), 'とおい / うしろの 物は すけない');
  assert.equal(mod.pickOccluders([between], ex, ez, { x: 400, z: 1000 }, M.ACTOR_SIZE).size, 0, 'player が どいたら すぐ もどる');
  assert.equal(mod.pickOccluders([between], ex, ez, null, M.ACTOR_SIZE).size, 0);
  // レンダラーの 中に「きょりで 透明に する」みちは ない: 透明の material は 水・あわ・しぶき・ぬれた 地面・光・まだら・かげ・ghost だけ
  const src = fs.readFileSync(path.join(ROOT, 'meguru-3d.mjs'), 'utf8');
  for (const line of src.split('\n').filter((l) => /transparent: true/.test(l))) assert.match(line, /pool|fall|foam|wet|mist|glowdisc|spark|patch|shadows|ghostMat|'#000000'/, '透明の material: ' + line.trim().slice(0, 80));
  assert.ok(!/opacity\s*=\s*[^;]*(dist|Math\.hypot)/.test(src), 'きょりで opacity を かえない');
  assert.match(src, /fog\.near = fr\[0\] \* fogK/, 'きり は 地域の profile から(きょりの 透明化 では ない)');
  assert.equal(M.REGION3D.forest.fog[0], 1400, 'forest の きり は 1400 から');
});

test('3e. たき は うしろ・よこ からも 岩の おか: がけの うしろに 岩の かたまり(あたり つき)が あり、見た目 = あたり', () => {
  const wf = objs.objects.find((o) => o.kind === 'LM:waterfall'), falls = w3.spots.find((s) => s.id === 'falls');
  const fx = (falls.x - wf.x), fz = (falls.z - wf.z), L = Math.hypot(fx, fz), ux = fx / L, uz = fz / L;
  const sats = objs.objects.filter((o) => o.collision && w3.obstacles.find((ob) => ob.pi === o.pi).kind.startsWith('LM:waterfall:'));
  const mounds = sats.filter((o) => o.type === 'mound');
  assert.ok(mounds.length >= 5, '岩の かたまり ' + mounds.length);
  const behind = mounds.filter((o) => (o.x - wf.x) * ux + (o.z - wf.z) * uz < -wf.collision.hd * 0.5);
  assert.ok(behind.length >= 3, 'がけの うしろに ' + behind.length);
  assert.ok(behind.some((o) => o.parts[0].h >= 560 * 0.75 * 0.7), 'がけの 上に のぞく 段');
  assert.ok(behind.some((o) => (o.x - wf.x) * ux + (o.z - wf.z) * uz < -wf.collision.hd - 100), 'うしろの おか(がけ から はなれて 地面へ つながる)');
  for (const o of mounds) { assert.equal(o.parts[0].shape, 'mound'); assert.equal(o.parts[0].r, o.collision.hw); assert.ok(o.solid); }
  const cliff = wf.parts.find((pt) => pt.shape === 'cliff');
  assert.equal(cliff.rx, wf.collision.hw); assert.equal(cliff.rz, wf.collision.hd);
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
