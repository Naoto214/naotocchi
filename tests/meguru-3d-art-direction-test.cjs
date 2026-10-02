// めぐる 3D Art Direction v1(2026-10-01): 統一 art direction の 契約
//   - 原則だけ(明るい 箱庭・まるい シルエット・自然 と 人工物の まざり・花 / しげみ / 小物・遠景・読める いろ・小さな 世界の 比率)。
//     Nintendo / どうぶつの森 固有の キャラクター・建物・家具・UI・模様・asset・配置は コピーしない(AD-18)
//   - Foundation v2(あたり / reachability / Water v2 / corridor 3D / 意味の 表)は かえない。3D だけ(`?meguru3d=1`)・save / schema 不変
// 契約: 群生の dressing(AD-1〜4)・Tree v3(AD-5 / 6)・Building v3 と city scene(AD-7〜10)・水の 統合 と Bridge v3(AD-11 / 12)・
//       さばくの サボテン(AD-13)・光(AD-14)・比率(AD-15)・前景 / 中景 / 遠景の 密度 gate(AD-16)・Human QA の 記録(AD-17)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { harness } = require('./helpers/runtime-harness.cjs');

const ROOT = path.join(__dirname, '..');
const SRC3D = fs.readFileSync(path.join(ROOT, 'meguru-3d.mjs'), 'utf8');
const SRC = fs.readFileSync(path.join(ROOT, 'meguru.js'), 'utf8');
const h = harness({ deterministic: true, fullDisplay: true });
const M = h.api.meguruMod, st = h.api.state();
Object.assign(st, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, regionId: 'forest' });
h.api.render();
const reg = M.buildRegistry();
const REGIONS = Object.keys(M.REGION3D);
const cacheW = new Map(), cacheO = new Map();
const worldOf = (rid, opts = { world3d: true }) => { const k = rid + ':' + JSON.stringify(opts); if (!cacheW.has(k)) cacheW.set(k, M.buildWorld(rid, reg, opts)); return cacheW.get(k); };
const objsOf = (rid) => { if (!cacheO.has(rid)) cacheO.set(rid, M.worldObjects3d(worldOf(rid))); return cacheO.get(rid); };
const dressOf = (rid) => objsOf(rid).objects.filter((o) => o.dressing);
const mod3d = () => import(path.join(ROOT, 'meguru-3d.mjs'));
const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const sat = (c) => { const [r, g, b] = hex(c); return Math.max(r, g, b) - Math.min(r, g, b); };
const riverDist = (T, x, z) => { let best = Infinity; for (let i = 0; i < T.pts.length - 1; i++) { const [ax, az] = T.pts[i], [bx, bz] = T.pts[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return best; };

test('AD-1. scene dressing の 契約: 3D だけ・あたり なし・ふんで とおれる・群生(2〜8)・道 / spot / かたい 物 / 水 には おかない', () => {
  let total = 0;
  for (const rid of REGIONS) {
    const w = worldOf(rid), ds = dressOf(rid), cv = M.REGION3D[rid].cover;
    assert.ok(cv && cv.empty != null, rid + ' に cover(empty つき)');
    assert.ok(ds.length >= 20, rid + ' の 群生 ' + ds.length);
    total += ds.length;
    for (const o of ds) {
      assert.equal(o.type, 'dressing'); assert.ok(o.dressing && o.walkable && !o.solid && o.collision === null, o.id + ' あたり なし');
      assert.ok(/^cover:/.test(o.kind), o.id + ' kind');
      assert.ok(o.parts.length >= 2 && o.parts.length <= 40, o.id + ' parts ' + o.parts.length);
      const np = M.nearestPath({ x: o.x, z: o.z }, w);
      assert.ok(!np || np.dist >= np.half + 10, o.id + ' 道の 上に おかない ' + (np && (np.dist - np.half).toFixed(0)));
      for (const q of w.spots) assert.ok(Math.hypot(q.x - o.x, q.z - o.z) >= q.r + 20, o.id + ' spot の まんなかに おかない');
      for (const pt of o.parts) {
        if (pt.shape === 'flower' || pt.shape === 'blade' || pt.shape === 'wblade' || pt.shape === 'kelp') assert.ok(pt.h <= 80, o.id + ' ' + pt.shape + ' ひざ丈 ' + pt.h);
        if (pt.shape === 'crown') assert.ok(pt.r <= 40 && pt.small, o.id + ' しげみは 小さい かたまり');
        if (pt.shape === 'pebble') assert.ok(pt.r <= 16, o.id + ' 小石');
      }
    }
  }
  assert.ok(total >= 13 * 20);
});

test('AD-2. 配置は「空いた ところに 均一に 置く」では なく 群生 + 意図した 余白: 道ばたの 帯(roadside)と ます目(grid)の 両方・余白が ある', () => {
  for (const rid of REGIONS) {
    const ds = dressOf(rid), road = ds.filter((o) => o.roadside), grid = ds.filter((o) => !o.roadside && !o.bank);
    assert.ok(road.length >= 8, rid + ' 道ばたの 群生 ' + road.length);
    assert.ok(grid.length >= 8, rid + ' ます目の 群生 ' + grid.length);
    // 余白: ます目の 候補の ぜんぶは うまらない(empty)・群生の 大きさは ばらつく
    const w = worldOf(rid), cells = Math.ceil((w.len - 280) / 300) * Math.ceil(((w.maxX != null ? w.maxX : w.halfW) - (w.minX != null ? w.minX : -w.halfW) - 160) / 300);
    assert.ok(grid.length < cells * (M.REGION3D[rid].cover.tries || 1), rid + ' 余白 ' + grid.length + ' / ' + cells);
    const sizes = new Set(ds.map((o) => o.parts.length)); assert.ok(sizes.size >= 4, rid + ' 群生の 大きさの ばらつき');
  }
});

test('AD-3. remove-it: 2D の world と corridor には dressing が ない(3D だけ)。cover を 外した profile では 群生 0', () => {
  const w2 = worldOf('forest', {}); assert.equal(M.worldObjects3d(w2).objects.filter((o) => o.dressing).length, 0, '2D には ない');
  assert.equal(M.sceneDressing3d(Object.assign({}, worldOf('forest'), { corridor: true })).length, 0, 'corridor には ない');
  const saved = M.REGION3D.forest.cover; M.REGION3D.forest.cover = null;
  try { assert.equal(M.sceneDressing3d(worldOf('forest')).length, 0, 'cover なし = 群生 なし'); } finally { M.REGION3D.forest.cover = saved; }
  assert.ok(M.sceneDressing3d(worldOf('forest')).length > 0);
});

test('AD-4. 花は 地域に あった いろ・場所: home / forest / jungle / countryside に 花の 群生、しんかい / ゆき には 花 なし、さばくは オアシスの まわり だけ', () => {
  for (const rid of ['home', 'forest', 'jungle', 'countryside', 'city']) assert.ok(dressOf(rid).filter((o) => o.kind === 'cover:flowers').length >= 5, rid + ' の 花');
  for (const rid of ['deepsea', 'snow']) assert.equal(dressOf(rid).filter((o) => o.kind === 'cover:flowers').length, 0, rid + ' に 花 なし');
  const d = worldOf('desert'), oasis = d.spots.filter((q) => q.kind === 'water');
  const df = dressOf('desert').filter((o) => o.kind === 'cover:flowers');
  assert.ok(df.length >= 1, 'オアシスの 花');
  for (const o of df) assert.ok(oasis.some((q) => Math.hypot(q.x - o.x, q.z - o.z) < q.r + 160 + 90), o.id + ' は オアシスの そば');
  assert.ok(dressOf('deepsea').some((o) => o.kind === 'cover:kelp'), 'しんかいは 昆布');
  for (const rid of REGIONS) { const fl = M.REGION3D[rid].cover.flowers || []; for (const c of fl) assert.match(c, /^#[0-9a-f]{6}$/i, rid + ' 花の いろ'); }
});

test('AD-5. Tree v3: 針葉樹 4〜5 段(明暗・下ほど ひろい)、広葉樹は かたまり 2〜5(明 / 中 / 暗)、ヤシは は 5〜8(はばは 長さに 比例)', () => {
  const f = objsOf('forest').objects, con = f.filter((o) => o.type === 'conifer'), br = f.filter((o) => o.type === 'broadleaf');
  assert.ok(con.length > 20 && br.length > 20);
  for (const o of con) { const cones = o.parts.filter((p) => p.shape === 'cone'); assert.ok(cones.length >= 4 && cones.length <= 5, o.id + ' 段 ' + cones.length); assert.ok(cones.every((p) => p.shade != null), '段ごとの 明暗'); assert.ok(cones[0].r >= cones[cones.length - 1].r, '下ほど ひろい'); }
  for (const o of br) { const cr = o.parts.filter((p) => p.shape === 'crown'); assert.ok(cr.length >= 2 && cr.length <= 5, o.id + ' かたまり ' + cr.length); assert.ok(new Set(cr.map((p) => p.shade)).size >= 2, o.id + ' 明暗 2 いじょう'); }
  assert.ok(new Set(con.map((o) => o.parts.filter((p) => p.shape === 'cone').length)).size === 2, '針葉樹の 段数は 木ごと');
  const palms = objsOf('sea').objects.filter((o) => o.type === 'palm');
  assert.ok(palms.length >= 5);
  for (const o of palms) { const fr = o.parts.filter((p) => p.shape === 'frond'); assert.ok(fr.length >= 5 && fr.length <= 8, o.id + ' は ' + fr.length); for (const p of fr) assert.ok(p.w >= 26 && p.w >= p.len * 0.28 && p.len <= 170, o.id + ' は の はば ' + p.w + ' / ' + p.len); assert.ok(o.parts.filter((p) => p.shape === 'trunk').length === 2, '幹 2 段(曲がる)'); }
});

test('AD-6. gate: もり と ジャングルは 1 まいの 絵で 見わけが つく(葉の palette・きりの いろ・ジャングル だけ 大きな は / つる / 根もとの 下草 / lowPoly)', () => {
  const F = M.REGION3D.forest, J = M.REGION3D.jungle;
  assert.notDeepEqual(F.foliage.crown, J.foliage.crown, '葉の palette が ちがう');
  // 2026-10-02 Geometry pass(HQ-11): もりにも つめたい きりの いろ。ジャングルの きりは もりより みどり が つよく、ちかい(見とおし が みじかい)
  const green = (c) => { const [r, g, b] = hex(c); return g - (r + b) / 2; };
  assert.ok(J.fogColor && F.fogColor && green(J.fogColor) > green(F.fogColor) && J.fog[0] < F.fog[0] && J.fog[1] < F.fog[1], 'ジャングルの きりは みどり で ちかい');
  assert.ok(J.lowPoly && !F.lowPoly);
  const jb = objsOf('jungle').objects.filter((o) => o.type === 'broadleaf'), fb = objsOf('forest').objects.filter((o) => o.type === 'broadleaf');
  assert.ok(jb.every((o) => o.parts.some((p) => p.shape === 'wblade')), 'ジャングルの 木には 大きな は');
  assert.ok(fb.every((o) => !o.parts.some((p) => p.shape === 'wblade')), 'もりの 木には ない');
  const jt = objsOf('jungle').objects.filter((o) => o.type === 'bigtree' && !o.kind.startsWith('LM:')), ft = objsOf('forest').objects.filter((o) => o.type === 'bigtree' && !o.kind.startsWith('LM:'));
  assert.ok(jt.length > 5 && jt.every((o) => o.parts.filter((p) => p.shape === 'frond').length === 3), 'ジャングルの 大木の 根もとに 下草');
  assert.ok(ft.length > 5 && ft.every((o) => !o.parts.some((p) => p.shape === 'frond')), 'もりの 大木には ない');
  assert.ok(objsOf('jungle').objects.some((o) => o.type === 'palm') && !objsOf('forest').objects.some((o) => o.type === 'palm'), 'ジャングルには ヤシ');
});

// 2026-10-02 Geometry pass(Human QA AD v1 HQ-9「家が 細い / 四角い / 塔の よう」): Building v3 の 契約を Building v4 に 再仕様化。
// 家の かたまりを family に わけ(切妻 / 寄棟 / 平ら・ポーチ・出窓・縁側・はなれ・ベランダ)、高さ / 床 の 比を しばる
test('AD-7. Building v4: family ごとの かたまり・屋根の かたち(切妻 / 寄棟 / 平ら)・のき・土台・入口 と まど・かたまりの 足し(ポーチ / 出窓 / 縁側 / はなれ / ベランダ / 煙突 / ひさし)・シルエット 高さ / はば ≤ 1.5', () => {
  const fams = new Set();
  for (const rid of ['home', 'countryside', 'snow', 'mountain', 'sea', 'desert', 'river_lake', 'city']) {
    const hs = objsOf(rid).objects.filter((o) => o.type === 'house'); if (!hs.length) continue;
    const bodies = new Set();
    for (const o of hs) {
      const body = o.parts[0], h = body.h, fam = body.family; bodies.add(body.color); fams.add(fam);
      assert.ok(fam, o.id + ' family');
      assert.ok(o.parts.length >= 12, o.id + ' parts ' + o.parts.length);
      assert.ok(o.parts.some((p) => p.shape === 'roof' || p.shape === 'gable' || (p.shape === 'box' && p.y >= h - 0.01)), o.id + ' 屋根');
      assert.ok(o.parts.some((p) => p.shape === 'box' && p.y > h - 10 && p.y < h + 0.01 && p.rx > body.rx * 1.02), o.id + ' のき / ふち');
      assert.ok(o.parts.some((p) => p.shape === 'box' && p.y === 0 && p.h <= 8 && p.rx > body.rx), o.id + ' 土台の ふち');
      assert.ok(o.parts.some((p) => p.door) && o.parts.some((p) => p.win), o.id + ' 入口 と まど');
      // シルエットの 比: (からだ + 屋根の 高さ)/ いちばん ひろい はば(屋根の のき・屋上の 看板 を ふくむ)。家 ≤ 1.5、みせ ≤ 1.6(塔の ような 家に しない)
      const roof = o.parts.find((p) => p.shape === 'gable' || p.shape === 'roof'), sign = Math.max(0, ...o.parts.filter((p) => p.shape === 'board').map((p) => p.w));
      const span = Math.max(roof ? (roof.shape === 'gable' ? 2 * Math.max(roof.rx, roof.rz) : 2 * roof.r * 0.71) : 2 * Math.max(body.rx, body.rz), sign), ratio = (h + (roof ? roof.h : 18)) / span;
      assert.ok(ratio <= (fam === 'shop' ? 1.6 : 1.5) + 1e-6, o.id + ' ' + fam + ' シルエット 高さ / はば ' + ratio.toFixed(2) + '(塔の ような 家に しない)');
      const extra = ['wslab', 'rail', 'board'].filter((s) => o.parts.some((p) => p.shape === s)).length + (o.parts.some((p) => p.color === '#6a5a4a') ? 1 : 0) + (o.parts.filter((p) => p.solidBox).length >= 2 ? 1 : 0) + (o.parts.some((p) => p.shape === 'gable' && p !== o.parts.find((q) => q.shape === 'gable')) ? 1 : 0);
      assert.ok(extra >= 1, o.id + ' かたまりの 足し ' + extra);
      const fl = (M.REGION3D[rid].cover.flowers || []).length;
      assert.ok(o.parts.filter((p) => p.shape === 'crown' && p.small).length >= 2 && o.parts.filter((p) => p.shape === 'flower').length >= (fl ? 2 : 0), o.id + ' まわりの 植物');
    }
    if (hs.length >= 5) assert.ok(bodies.size >= 2, rid + ' 家の いろは ばらつく');
  }
  for (const f of ['cottage', 'single', 'twostorey', 'farmhouse', 'barn', 'shed']) assert.ok(fams.has(f), 'family ' + f + ' が ある: ' + [...fams].join(','));
  assert.ok(objsOf('home').objects.filter((o) => o.type === 'house').some((o) => o.parts.some((p) => p.shape === 'gable')) && objsOf('home').objects.filter((o) => o.type === 'house').some((o) => o.parts.some((p) => p.shape === 'roof')), 'home は 切妻 と 寄棟 が まざる');
});

test('AD-8. city scene: 低層 / 中層 / 高層の まざり・灰 だけで ない いろ・みせ(ガラス + ひさし + 看板 + たて看板)・路地の かべも 正面を もつ・高さは 床の 5.5 倍まで', () => {
  const objs = objsOf('city').objects, towers = objs.filter((o) => o.type === 'tower'), walls = objs.filter((o) => o.type === 'wall');
  assert.ok(towers.length >= 30 && walls.length >= 5);
  const hs = towers.map((o) => o.parts[0].h), lo = hs.filter((x) => x < 220).length, hi = hs.filter((x) => x > 420).length;
  assert.ok(lo >= 5 && hi >= 5 && hs.length - lo - hi >= 5, `低 ${lo} / 中 ${hs.length - lo - hi} / 高 ${hi}`);
  const colors = new Set(towers.map((o) => o.parts[0].color));
  assert.ok(colors.size >= 6, 'ビルの いろ ' + colors.size);
  assert.ok([...colors].filter((c) => sat(c) >= 14).length >= 3, '灰 だけで ない: ' + [...colors].join(','));
  for (const o of towers) {
    const w = Math.max(o.parts[0].rx, o.parts[0].rz); assert.ok(o.parts[0].h <= w * 5.5 + 0.01, o.id + ' 高さ / 床 ' + (o.parts[0].h / w).toFixed(1));
    assert.ok(o.parts.some((p) => p.win) && o.parts.some((p) => p.door), o.id + ' まど と 入口');
    assert.ok(o.parts.some((p) => p.shape === 'box' && p.y >= o.parts[0].h - 0.01 && p.rx > o.parts[0].rx), o.id + ' パラペット');
  }
  const low = towers.filter((o) => o.parts[0].low);
  assert.ok(low.length >= 8 && low.every((o) => o.parts.some((p) => p.shape === 'wslab') && o.parts.some((p) => p.shape === 'board')), '低層は ひさし + 看板');
  assert.ok(low.filter((o) => o.parts.some((p) => p.shape === 'box' && p.rz === 12 && p.rx === 4)).length >= 3, 'たて看板');
  for (const o of walls) assert.ok(o.parts.length >= 5 && o.parts.some((p) => p.win) && o.parts.some((p) => p.door), o.id + ' 路地の かべの 正面');
  assert.ok(new Set(walls.map((o) => o.parts[0].color)).size >= 2, 'かべの いろも ばらつく');
  assert.ok(M.REGION3D.city.ground3d && M.REGION3D.city.ground3d.length === 2, '3D だけの 地面の いろ');
  assert.match(SRC3D, /prof0 && prof0\.ground3d\) \|\| world\.ground/, 'レンダラーは ground3d を 3D だけで つかう');
});

test('AD-9. city の 小物: 自転車・自販機は 3D の かたち(unresolved なし)。街路樹・信号・横断歩道・電柱は そのまま', () => {
  const r = objsOf('city');
  assert.equal(r.unresolved.length, 0, 'unresolved ' + r.unresolved.slice(0, 5).join(','));
  const bikes = r.objects.filter((o) => o.type === 'bike');
  // 2026-10-02 Geometry pass(props gate・HQ-13「横倒しの 輪と 棒」): わ は たての わ(arch)2 つ・地面に つく・ハンドル と サドル
  assert.ok(bikes.length >= 2 && bikes.every((o) => o.parts.filter((p) => p.shape === 'arch' && Math.abs(p.y - p.r) < 0.01).length === 2 && o.parts.some((p) => p.shape === 'wslab' && p.w >= 12) && o.parts.some((p) => p.shape === 'box') && o.walkable), '自転車 = 立った わ 2 つ + ハンドル + サドル・ふんで とおれる');
  assert.ok(!M.HIDDEN3D.has('🚲'));
  const vend = r.objects.filter((o) => o.kind === 'vending');
  assert.ok(vend.length >= 1 && vend.every((o) => o.parts.length >= 4), '自販機 = 本体 + パネル + 取り出し口 + ふち');
  assert.ok(r.objects.some((o) => o.type === 'broadleaf') && r.objects.some((o) => o.type === 'signal') && r.objects.some((o) => o.kind === 'crosswalk'), '街路樹 / 信号 / 横断歩道');
  assert.ok(r.objects.filter((o) => o.type === 'lamp').some((o) => o.parts.some((p) => p.shape === 'wslab')), '電柱');
});

test('AD-10. いけがき は 箱では なく まるい しげみの れつ(あたりの 箱の なか・あたまより 下)', () => {
  const hs = objsOf('home').objects.filter((o) => o.type === 'hedge');
  assert.ok(hs.length >= 3);
  for (const o of hs) {
    const cr = o.parts.filter((p) => p.shape === 'crown' && p.small);
    assert.ok(cr.length >= 2, o.id + ' かたまり ' + cr.length);
    const r = Math.max(o.collision.hw, o.collision.hd);
    for (const p of cr) assert.ok(p.r <= r + 10 && p.y + p.r * p.sy <= M.OBJ3D_HEAD + 10, o.id + ' あたまより 下・あたりの なか');
    assert.ok(new Set(cr.map((p) => p.shade)).size >= 2, '明暗');
  }
});

test('AD-11. 水の 統合: 川は なめらかに 曲がり はばが ゆれる(riverCurve・pure)。見た目の 水は あたりの 帯の 内がわ。川岸に 石 / あし / 草 / 花の 帯', async () => {
  const { riverCurve, polylineFrames, stripGeometryData } = await mod3d();
  const pts = [[0, 0], [0, 500], [200, 1000], [200, 1500], [0, 2000]];
  const rc = riverCurve(pts);
  assert.equal(rc.pts.length, (pts.length - 1) * 3 + 1, '区間 3 分割');
  assert.ok(rc.k.every((k) => k >= 0.62 && k <= 0.9) && new Set(rc.k.map((k) => k.toFixed(3))).size >= 5, 'はばの ゆらぎ 0.62〜0.9');
  for (const [x, z] of rc.pts) { let best = Infinity; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t)); } assert.ok(best <= 40, '曲線は 直線から 40 まで ' + best.toFixed(1)); }
  const fr = polylineFrames(rc.pts, rc.k), d = stripGeometryData(fr, [{ o: -200, y: 2, c: [0, 0, 1] }, { o: 200, y: 2, c: [0, 0, 1] }], { vary: true });
  const widths = []; for (let i = 0; i < fr.length; i++) widths.push(Math.hypot(d.positions[i * 6] - d.positions[i * 6 + 3], d.positions[i * 6 + 2] - d.positions[i * 6 + 5]));
  assert.ok(Math.max(...widths) <= 360.01 && Math.min(...widths) >= 247 && new Set(widths.map((w) => w.toFixed(1))).size >= 5, 'はばが フレームごとに ちがい・あたりの 帯(400)の 内がわ');
  const plain = stripGeometryData(polylineFrames(pts), [{ o: -100, y: 2, c: [0, 0, 1] }, { o: 100, y: 2, c: [0, 0, 1] }]);
  assert.equal(plain.positions.length / 3, pts.length * 2, 'vary なしは いままで どおり');
  assert.match(SRC3D, /riverCurve\(T\.pts\)/, 'レンダラーの 川は riverCurve');
  assert.match(SRC3D, /'water:bank'\)/);
  // 川岸の 帯
  const w = worldOf('river_lake'), bank = dressOf('river_lake').filter((o) => o.bank);
  assert.ok(bank.length >= 12, '川岸の 群生 ' + bank.length);
  for (const o of bank) { const dd = riverDist(w.terrain, o.x, o.z); assert.ok(dd >= w.terrain.half + 6 && dd <= w.terrain.half + 76, o.id + ' 岸の 帯 ' + dd.toFixed(0)); }
  assert.ok(new Set(bank.map((o) => o.kind)).size >= 3, '岸は 石 / あし / 草 / 花 の まざり');
});

// 2026-10-02 Geometry pass(Human QA AD v1 HQ-8「橋は ベンチ / 板」): Bridge v3 の 契約を Bridge v4 に 再仕様化。
// 橋は ながれの 交わり(小川 / 川 / 水の ない 谷)に すわり、ながさは 水の はば から。床の 上面は 水面(小川 −9・川 −11)より 13 いじょう 上
test('AD-12. Bridge v4: 交わりに かかる(ながさ ≥ 水の はば)・床の 上面は 水面より 上・床より 下から ささえる 橋脚 / 橋台・種類で かたちが ちがう', () => {
  let n = 0; const sig = {};
  for (const rid of ['forest', 'river_lake', 'jungle', 'mountain', 'countryside', 'star_stop']) for (const o of objsOf(rid).objects.filter((q) => q.type === 'bridge')) {
    n++;
    const deck = o.parts.find((p) => p.shape === 'plank' || p.shape === 'slab' || p.shape === 'log' || (p.shape === 'wslab' && p.len > 60));
    assert.ok(deck, o.id + ' 床');
    const top = deck.shape === 'plank' ? deck.y + 8 : deck.shape === 'slab' ? deck.y + 10 : deck.shape === 'log' ? deck.y + deck.r * 2 : deck.y + deck.h;
    assert.ok(top >= 4, o.id + ' 床の 上面 ' + top.toFixed(1) + ' ≥ 4(水面 −9 / −11 より 上)');
    if (o.bridgeKind === 'light') continue;
    assert.ok(o.crossing, o.id + ' 交わり(小川 / 川 / 谷)に かかる');
    assert.ok(deck.len >= o.crossing.w * 2, o.id + ' ながさ ' + Math.round(deck.len) + ' ≥ 水の はば ' + Math.round(o.crossing.w * 2));
    const supports = o.parts.filter((p) => ['wpost', 'box', 'stone'].includes(p.shape) && (p.y || 0) < top - 4);
    assert.ok(supports.length >= 2, o.id + ' 床より 下から ささえる 物 ' + supports.length);
    if (o.bridgeKind === 'log') assert.ok(o.parts.filter((p) => p.shape === 'log').length === 3 && o.parts.some((p) => p.shape === 'rail'), o.id + ' 丸太 3 本 + ロープ');
    if (o.bridgeKind === 'stone') assert.ok(o.parts.filter((p) => p.shape === 'arch').length === 2 && o.parts.filter((p) => p.shape === 'box' && p.h === 16).length === 2, o.id + ' アーチ + 欄干');
    if (o.bridgeKind === 'wood' || o.bridgeKind === 'rope') assert.ok(o.parts.filter((p) => p.shape === 'rail').length >= 2, o.id + ' てすり');
    sig[o.bridgeKind] = [...new Set(o.parts.map((p) => p.shape))].sort().join('/');
  }
  assert.ok(n >= 6, 'はし ' + n);
  assert.ok(sig.log && sig.wood && sig.stone && new Set([sig.log, sig.wood, sig.stone]).size === 3, '丸太 / 木 / 石 は かたちの くみあわせが ちがう(色ちがい では ない)');
});

test('AD-13. さばくの サボテンは 大きく 4 種(柱・枝分かれ・まる・むれ)。オアシスの まわりは 花 で 対比', () => {
  const cs = objsOf('desert').objects.filter((o) => o.type === 'cactus');
  assert.ok(cs.length >= 8, 'サボテン ' + cs.length);
  const sig = new Set(cs.map((o) => o.parts.map((p) => p.shape).join('/')));
  assert.ok(sig.size >= 3, '種類 ' + [...sig].join(' | '));
  const tall = cs.filter((o) => o.parts.some((p) => p.shape === 'wstem' && p.h >= 125));
  assert.ok(tall.length >= 3, '柱 / 枝分かれは あたまより 高い ' + tall.length);
  assert.ok(cs.every((o) => o.parts.every((p) => (p.r || 0) >= 8)), 'ほそく ない');
  assert.ok(M.REGION3D.desert.cover.oasisFlowers.length >= 2 && (M.REGION3D.desert.cover.flowers || []).length === 0, 'さばくの 花は オアシス だけ');
});

// 2026-10-02 VQ: old numeric contract flattened planes by favoring ambient fill.
// New contract retains fill but transfers energy to the existing directional
// light (1.2 hemi / 1.55 key / .22 ambient); same weather/season semantics.
test('AD-14. 光: 明るい fill と 方向光で 面を 分ける・岩 / がけの 明るさ と 地域 palette を 保つ', () => {
  assert.match(SRC3D, /HemisphereLight\('#eaf4ff'.*?, 1\.2\)/, 'hemisphere fill 1.2');
  assert.match(SRC3D, /DirectionalLight\('#fff6e8', 1\.55\)/, 'key 1.55');
  assert.match(SRC3D, /AmbientLight\('#ffffff', 0\.22\)/, 'ambient floor 0.22');
  assert.ok((SRC3D.match(/color: '#c4c1b8'/g) || []).length >= 2, '岩 / がけの material は 明るめ');
  assert.match(SRC3D, /shadeOf\(FOL\.crown, pt\.shade\)/, 'かんむりの いろは 地域の palette');
  for (const rid of REGIONS) { const f = M.REGION3D[rid].foliage; assert.ok(f && f.crown.length === 3 && f.conifer.length === 3, rid + ' の 葉の palette 3 段'); }
});

test('AD-15. 箱庭の 比率: ビルは 床の 5.5 倍まで、大木の 幹は あたりより ほそい、花 / しげみ / 街の 小物は 見える 大きさ、まど / 入口は 家に 対して 小さい', () => {
  for (const o of objsOf('city').objects.filter((q) => q.type === 'tower')) assert.ok(o.parts[0].h <= Math.max(o.parts[0].rx, o.parts[0].rz) * 5.5 + 0.01);
  for (const o of objsOf('forest').objects.filter((q) => q.type === 'bigtree' && !q.kind.startsWith('LM:'))) assert.ok(o.parts[0].r <= Math.max(o.collision.hw, o.collision.hd) * 0.82 + 0.01, o.id + ' 幹は ほそい');
  for (const rid of ['home', 'forest']) for (const o of dressOf(rid)) for (const p of o.parts) if (p.shape === 'flower') assert.ok(p.r >= 11 && p.h >= 18, '花は 見える 大きさ');
  for (const o of objsOf('home').objects.filter((q) => q.type === 'house')) { const w = o.parts[0].rx; for (const p of o.parts.filter((q) => q.door || q.win)) assert.ok(p.rx <= w * 0.35, o.id + ' まど / 入口は 小さい'); }
  for (const o of objsOf('city').objects.filter((q) => q.type === 'bike')) assert.ok(o.parts.every((p) => (p.r || p.len || p.rx || 0) <= 26), '自転車は 小さい');
});

test('AD-16. density gate: 代表 spot(各地域 最初の ひろば)から 前景(〜250)/ 中景(250〜700)/ 遠景(700〜1800)の それぞれに 意味の ある 物が 1 つ いじょう。道の 方向は 読める(道の 上に 物 なし)', () => {
  for (const rid of REGIONS) {
    const w = worldOf(rid), objs = objsOf(rid).objects, sp = w.spots.find((q) => q.kind === 'plaza') || w.spots[0];
    const band = (a, b) => objs.filter((o) => { const d = Math.hypot(o.x - sp.x, o.z - sp.z); return d >= a && d < b && o.type !== 'decal'; });
    const fg = band(0, 250), mg = band(250, 700), bg = band(700, 1800);
    assert.ok(fg.length >= 1 && mg.length >= 3 && bg.length >= 6, `${rid} ${sp.id}: 前景 ${fg.length} / 中景 ${mg.length} / 遠景 ${bg.length}`);
    assert.ok(fg.some((o) => o.dressing || o.walkable) || mg.some((o) => o.dressing), rid + ' 足もとの 植生 / 小物');
    for (const o of objs.filter((q) => q.dressing)) { const np = M.nearestPath({ x: o.x, z: o.z }, w); assert.ok(!np || np.dist >= np.half + 10); }
  }
});

test('AD-17. Human QA gate の 記録: 13 地域 × 7 条件(ひと目で 地域・さびしく ない・箱っぽく ない・いろ・歩きたい・見どころ・前景 / 中景 / 遠景)が status doc に ある。main merge / Ready は しない', () => {
  const doc = fs.readFileSync(path.join(ROOT, 'docs/qa/meguru-3d-art-direction-v1-status.md'), 'utf8');
  for (const rid of REGIONS) assert.ok(new RegExp('\\| ' + rid + ' \\|').test(doc), rid + ' の 行');
  for (const k of ['ひと目', 'さびし', '箱', 'いろ', '歩きたい', '見どころ', '前景']) assert.ok(doc.includes(k), '条件 ' + k);
  assert.ok(/main へ merge しない/.test(doc) && /Ready に しない/.test(doc));
  assert.ok(fs.existsSync(path.join(ROOT, 'docs/qa/meguru-3d-art-direction-v1/compare.html')), '比較 sheet');
});

test('AD-18. 原則だけ: Nintendo / どうぶつの森 固有の 名まえ・asset・模様は code にも doc にも 出てこない', () => {
  const docs = ['docs/qa/meguru-3d-art-direction-v1-status.md', 'docs/qa/meguru-3d-art-direction-v1/compare.html'].filter((f) => fs.existsSync(path.join(ROOT, f))).map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8'));
  for (const text of [SRC, SRC3D, ...docs]) for (const bad of ['Nintendo', 'nintendo', 'Animal Crossing', 'どうぶつの森', 'Tom Nook', 'Nook', 'Isabelle', 'しずえ', 'たぬきち']) assert.ok(!text.includes(bad), '固有の 名まえ ' + bad);
});
