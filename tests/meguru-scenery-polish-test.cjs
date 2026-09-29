// めぐる scenery polish(Phase 4E 後 の 見た目の 仕上げ)の 正本。
//
// ここで しばるのは「見た目 だけ が かわった」こと:
//   ・spot に deco(見た目だけ の けしき)を たせる。spotDiscoveryLevel() は deco を 見ない
//   ・deco は solid に ならない。当たり判定・出口・探索率・セーブ は 1 つも かわらない
//   ・アーチ は 1 つの かたち(drawStructure の 'arch')を material で ぬりわける:
//       rock(いわのアーチ)= 穴を evenodd で くりぬいた 岩 / bone(ほねのアーチ)= 線 で えがく ほね
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { harness } = require('./helpers/runtime-harness.cjs');

// えがいた ものを 記録する にせ の ctx(fill の 引数 まで のこす)
function recordingCtx(log) {
  const state = { imageSmoothingEnabled: true }, stack = [];
  return new Proxy(state, { get(o, k) {
    if (k in o) return o[k];
    if (k === 'save') return () => stack.push({ ...state });
    if (k === 'restore') return () => { const p = stack.pop(); if (p) Object.assign(state, p); };
    if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} });
    if (k === 'measureText') return (t) => ({ width: String(t).length * 6 });
    if (k === 'getImageData') return () => ({ data: [] });
    return (...a) => { log.push([k, a[0]]); };
  }, set(o, k, v) { o[k] = v; return true; } });
}
function setup(regionId = 'sea', log = []) {
  const h = harness({ fullDisplay: true, canvasContext: recordingCtx(log) });
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80,
    speciesLine: 'dog', stageIndex: 4, ageTicks: 500, regionId });
  s.petKey = `dog:${h.api.currentFormStageIndex()}`;
  // 日がわり / 天気 で けしきの いちが ばらつく ので 固定する
  Object.assign(s.lifetime, { timeMode: 'day', weatherMode: 'sunny', seasonMode: 'spring' });
  s.lifetime.meguru = { visits: 0, talkCount: 0, met: {}, talks: {}, spots: {}, zones: {}, paths: {}, marks: {}, world: { regions: [], links: [] } };
  h.api.render();
  return { h, s, M: h.api.meguruMod };
}
const fixedWorld = (M, rid) => M.buildWorld(rid, M.buildRegistry(), {});
const spotOf = (M, rid, id) => M.WORLDS[rid].spots.find((q) => q.id === id);

// deco を もつ spot(第1段階 3 + アーチ 2 + 最終 completion pass 2)
const DECO = [
  ['star_stop', 'starfall', 'ほしのおちるところ', 'crystalgarden', 0],
  ['snow', 'slopetop', 'げれんでのうえ', 'snowfence', 0],
  ['snow', 'peak', 'ゆきやま', 'firewood', 3],
  ['sea', 'rockarch', 'いわのアーチ', 'arch', 0],
  ['desert', 'bonearch', 'ほねのアーチ', 'arch', 0],
  ['forest', 'fernlook', 'くぼちのみはらし', 'fern', 0],
  ['jungle', 'hanging', 'つりばし', 'ropebridge', 2],
];

// アーチ の まえに たって、なんフレーム か えがかせ、その あいだ の canvas よびだし を かえす
function drawFrontOf(rid, sid) {
  const log = [];
  const { h } = setup(rid, log);
  assert.equal(h.api.startMeguru(), true);
  h.advance(1800);
  const r = h.api.meguruRun();
  const spot = r.world.spots.find((q) => q.id === sid);
  const arch = r.world.props.find((p) => p.view === sid && p.keep);
  const dx = arch.x - spot.x, dz = arch.z - spot.z, L = Math.hypot(dx, dz);
  r.setPlayer(arch.x - dx / L * 520, arch.z - dz / L * 520);
  h.advance(600);
  const pr = r.renderer.project(arch.x, arch.z);
  const onScreen = !!pr && pr.sx > -arch.size * pr.s && pr.sx < r.canvasSize.W + arch.size * pr.s;
  log.length = 0;
  h.advance(170);
  const withArch = log.slice();
  // おなじ ところ で アーチ だけ はずして えがく(アーチ の ぶん だけ を とりだす)
  r.world.props = r.world.props.filter((p) => p !== arch);
  h.advance(200);
  log.length = 0;
  h.advance(170);
  const without = log.slice();
  h.api.stopMeguru();
  return { withArch, without, onScreen, arch };
}
const count = (log, k, arg) => log.filter(([name, a]) => name === k && (arg === undefined || a === arg)).length;

// ────────────────────────────── アーチ(いわ / ほね)

test('arch: drawStructure が しって いる 1 つ の かたち。地形 として えがく', () => {
  const { M } = setup();
  const src = fs.readFileSync('meguru.js', 'utf8');
  assert.ok(src.includes("case 'arch':"), 'drawStructure に arch が ある');
  assert.equal(M.STRUCT_ROLE.arch, 'terrain', 'arch は 地形');
  const b = M.OCCLUDER_BOX.arch;
  assert.ok(b && b[0] > 0 && b[0] <= 1 && b[1] > 0 && b[1] <= 3, 'じぶんの まえに きた とき の すける はこ');
  // アーチ を えがく ための あたらしい 画像 は つかわない
  assert.ok(!/arch\.(png|svg|webp)/.test(src), '画像 asset を よまない');
});

test('arch: いわのアーチ は rock、ほねのアーチ は bone。1 つ の かたち を ぬりわける', () => {
  const { M } = setup();
  const rock = fixedWorld(M, 'sea').props.filter((p) => p.view === 'rockarch');
  const bone = fixedWorld(M, 'desert').props.filter((p) => p.view === 'bonearch');
  assert.equal(rock.length, 1); assert.equal(bone.length, 1);
  assert.equal(rock[0].struct, 'arch'); assert.equal(rock[0].variant, 'rock');
  assert.equal(bone[0].struct, 'arch'); assert.equal(bone[0].variant, 'bone');
  // 地形 なので 1 まわり おおきい(ほかの deco の 主役 は 300)
  assert.ok(rock[0].size > 300 && bone[0].size > 300, `アーチは 地形の おおきさ: ${rock[0].size} / ${bone[0].size}`);
});

test('arch: rock は 穴を くりぬいた 岩、bone は 線 の ほね。えがきかた が ちがう', () => {
  const sea = drawFrontOf('sea', 'rockarch');
  const desert = drawFrontOf('desert', 'bonearch');
  assert.ok(sea.onScreen && desert.onScreen, 'どちらの アーチ も 画面に 入って いる');
  // rock: evenodd で 穴を くりぬく(ほか の けしき は evenodd を つかわない)
  assert.ok(count(sea.withArch, 'fill', 'evenodd') > 0, 'いわのアーチ は 穴 を くりぬいて えがく');
  assert.equal(count(sea.without, 'fill', 'evenodd'), 0, 'アーチ を はずす と evenodd は 0(= アーチ の ぶん)');
  // bone: evenodd を つかわず、ほね を 線 で えがく
  assert.equal(count(desert.withArch, 'fill', 'evenodd'), 0, 'ほねのアーチ は 岩 の かたち で えがかない');
  const boneStrokes = count(desert.withArch, 'stroke') - count(desert.without, 'stroke');
  assert.ok(boneStrokes >= 12, `ほね は 線 で えがく(1 フレーム あたり の ふえた stroke: ${boneStrokes})`);
  const rockStrokes = count(sea.withArch, 'stroke') - count(sea.without, 'stroke');
  assert.ok(rockStrokes < boneStrokes, `いわ は ほね ほど 線 を つかわない(${rockStrokes} < ${boneStrokes})`);
});

test('arch: 1 フレーム の よびだし の ふえかた は ちいさい(2 か所 だけ)', () => {
  for (const [rid, sid] of [['sea', 'rockarch'], ['desert', 'bonearch']]) {
    const d = drawFrontOf(rid, sid);
    const frames = 10;   // 170ms ≒ 10 フレーム
    const per = (d.withArch.length - d.without.length) / frames;
    assert.ok(per > 0 && per < 200, `${sid}: 1 フレーム あたり +${per.toFixed(1)} よびだし`);
    assert.ok(per / (d.without.length / frames) < 0.05, `${sid}: ふえた の は 5% みまん`);
  }
});

// ────────────────────────────── deco = 見た目 だけ

test('deco: 7 か所 とも deco で、view に して いない。しらせ の レベル は そのまま', () => {
  const { M } = setup();
  for (const [rid, id, label, lead, level] of DECO) {
    const sp = spotOf(M, rid, id);
    assert.equal(sp.label, label);
    assert.ok(Array.isArray(sp.deco) && sp.deco.length > 0, `${id}: deco が ある`);
    assert.ok(!sp.view, `${id}: view に して いない(view に すると L0 → L2 に かわる)`);
    assert.equal(M.spotDiscoveryLevel(sp), level, `${id}: しらせ の レベル は もと の まま`);
    const mine = fixedWorld(M, rid).props.filter((p) => p.view === id);
    assert.ok(mine.length === sp.deco.length, `${id}: deco の かず だけ おいた(${mine.length})`);
    assert.equal(mine.filter((p) => p.keep).length, 1, `${id}: 主役 は 1 つ`);
    assert.equal(mine.find((p) => p.keep).struct, lead, `${id}: 主役 は ${lead}`);
  }
});

test('deco: solid に しない。当たり判定 に も 地図 に も のらない。カメラ も ふりむかない', () => {
  const { M } = setup();
  for (const [rid, id] of DECO) {
    const w = fixedWorld(M, rid);
    for (const p of w.props.filter((q) => q.view === id)) {
      assert.ok(!p.solid, `${id}: solid に して いない`);
      assert.equal(M.colliderOf(p), null, `${id}: あたりはんてい なし`);
      assert.ok(!p.mid, `${id}: 地図 の めじるし に しない`);
      assert.ok(!p.hero && !p.landmark, `${id}: hero / landmark に しない(カメラ が ふりむく ので)`);
      assert.ok(p.deco, `${id}: deco の しるし`);
    }
    // deco を ぜんぶ はずしても 障害物 は 1 つも かわらない
    const obs = (props) => JSON.stringify(M.buildObstacles({ ...w, props }).map((o) => [o.x, o.z, o.hw, o.hd, o.shape, o.kind]));
    assert.equal(obs(w.props), obs(w.props.filter((p) => !p.deco)), `${rid}: deco は 障害物 を ふやさない`);
  }
});

test('deco: #319 の view 4 か所 は keep を もたず、いち も かわらない ルール の まま', () => {
  const { M } = setup();
  for (const [rid, id] of [['forest', 'stonelook'], ['countryside', 'terracelook'], ['mountain', 'lookout1'], ['river_lake', 'lakelook']]) {
    const sp = spotOf(M, rid, id);
    assert.ok(sp.view && !sp.deco, `${id}: view の まま`);
    assert.equal(M.spotDiscoveryLevel(sp), 2);
    const mine = fixedWorld(M, rid).props.filter((p) => p.view === id);
    assert.ok(mine.every((p) => !p.keep && !p.deco), `${id}: view の 景色 に keep / deco は つけない`);
    assert.equal(mine.filter((p) => p.size === 300).length, 1, `${id}: 主役 は 300 の まま`);
  }
});

// ────────────────────────────── 世界 の かず は かわらない

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
  assert.equal(secretSpots + secretPaths, 107, 'secret(spot 50 + path 57)');
  const C = M.worldCountable();
  assert.equal(C.tier1, 17); assert.equal(C.links.length, 12, 'link の 分母'); assert.equal(C.zones, 103);
  assert.deepEqual(lv, { 0: 184, 2: 216, 3: 71 }, 'L0 / L2 / L3');
  const reg = M.distantRegistry();
  const df = Object.values(reg).reduce((a, v) => a + (Array.isArray(v) ? v.length : Object.keys(v).length), 0);
  assert.equal(df, 37, 'DistantFeature 37');
});

test('counts: props が ふえる の は deco を もつ 6 地域 だけ(その かず だけ)', () => {
  const { M } = setup();
  const decoRegions = new Set(DECO.map(([rid]) => rid));
  for (const rid of Object.keys(M.WORLDS)) {
    const w = fixedWorld(M, rid);
    const deco = w.props.filter((p) => p.deco).length;
    const want = DECO.filter(([r]) => r === rid).reduce((a, [r, id]) => a + spotOf(M, r, id).deco.length, 0);
    assert.equal(deco, want, `${rid}: deco は ${want} 個`);
    if (!decoRegions.has(rid)) assert.equal(deco, 0, `${rid}: ふえない`);
  }
});

test('save: 形 は かわらない(deco は セーブ しない)', () => {
  const { h, s } = setup('sea');
  assert.equal(h.api.startMeguru(), true);
  h.advance(1800);
  const r = h.api.meguruRun();
  const sp = r.world.spots.find((q) => q.id === 'rockarch');
  r.setPlayer(sp.x, sp.z); h.advance(400);
  h.api.stopMeguru();
  assert.deepEqual(Object.keys(s.lifetime.meguru).sort(),
    ['marks', 'met', 'paths', 'spots', 'talkCount', 'talks', 'visits', 'world', 'zones'].sort());
  // spot の id(rockarch)は はっけん として のる のが ただしい。のっては いけない のは けしき の 中身
  const saved = JSON.stringify(s.lifetime.meguru);
  for (const k of ['"variant"', '"deco"', '"keep"', 'crystalgarden', 'snowfence']) assert.ok(!saved.includes(k), `けしき(${k})は セーブ に のらない`);
});
