// めぐる 3D Geometry / Terrain / Regional Identity / Runtime Quality Pass(2026-10-02・Human QA AD v1 の 未承認課題 HQ-1〜15)
//   - 3D だけ(`?meguru3d=1`)・あたり / 道 / spot / save / schema は かえない(地形・小川・橋・庭・畑 は 見た目 だけ)
//   - 特定の 作品の asset / 建物 / 地形 / 模様 / 配置は まねない(名まえも 出さない)
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
const cw = new Map(), co = new Map();
const worldOf = (rid) => { if (!cw.has(rid)) cw.set(rid, M.buildWorld(rid, reg, { world3d: true })); return cw.get(rid); };
const objsOf = (rid) => { if (!co.has(rid)) co.set(rid, M.worldObjects3d(worldOf(rid)).objects); return co.get(rid); };
const mod3d = () => import(path.join(ROOT, 'meguru-3d.mjs'));
const segDist = (s, x, z) => { const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z, L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - s.a.x) * dx + (z - s.a.z) * dz) / L2)); return Math.hypot(x - s.a.x - dx * t, z - s.a.z - dz * t); };

test('GT-1. runtime P0(HQ-1 / HQ-2 / HQ-3): すかしは ray で ほんとうに 隠す 物 だけ・もとの いろ・大きな 物は うすく・ちらつかない・変わった instance だけ 送る', async () => {
  const { pickOccluders, OCCLUDER_MAX, GHOST_OPACITY, GHOST_OPACITY_BIG, FADE_HOLD } = await mod3d();
  const S = M.ACTOR_SIZE, player = { x: 0, z: 1000 };
  // カメラの まわり(線分の はし)の 大きな がけも 候補(以前は t < 0 で 落ちて player が 見えなく なった)
  const cliffAtCam = { ob: { collision: { x: 30, z: -60 } }, r: 120, vr: 140, top: 300 };
  assert.ok(pickOccluders([cliffAtCam], 0, 0, player, S, 400).has(cliffAtCam), 'カメラの まわりの がけ');
  // ちかい 順に OCCLUDER_MAX まで(配列の 順で 打ち切らない)
  const many = Array.from({ length: 30 }, (_, i) => ({ ob: { collision: { x: (i % 2 ? 1 : -1) * (i * 3), z: 100 + i * 25 } }, r: 30, vr: 40, top: 300 }));
  const want = pickOccluders(many, 0, 0, player, S, 0);
  assert.equal(want.size, OCCLUDER_MAX);
  assert.ok(want.has(many[0]) && want.has(many[1]), 'いちばん ふかく かかる 物は かならず 入る');
  // あたりの ない 高い 物(ヤシ・電柱)は oc.c の 中心で
  const palm = { ob: {}, c: { x: 0, z: 500 }, r: 10, vr: 120, top: 260 };
  assert.ok(pickOccluders([palm], 0, 0, player, S, 400).has(palm));
  assert.ok(GHOST_OPACITY > GHOST_OPACITY_BIG && GHOST_OPACITY_BIG > 0 && FADE_HOLD >= 2 && FADE_HOLD <= 12);
  assert.match(SRC3D, /function rayHitsOccluder\(b, oc\)/, '候補は ray で たしかめる');
  assert.match(SRC3D, /for \(const oc of cand\) if \(rayHitsOccluder\(b, oc\)\) want\.add\(oc\)/);
  assert.match(SRC3D, /function ghostMatFor\(b, rf, big\)[\s\S]{0,400}getColorAt\(rf\.i, col\)[\s\S]{0,80}col\.multiply\(im\.material\.color\)/, 'ghost は もとの いろ(白い 半透明に しない)');
  assert.match(SRC3D, /m\.instanceMatrix\.addUpdateRange\(i \* 16, 16\)/, 'かわった instance だけ 送る');
  assert.match(SRC3D, /frame - \(oc\.lastWant \|\| 0\) <= FADE_HOLD/, 'ちらつかない(線分の ふちで 出入り しない)');
  assert.match(SRC3D, /shadows\.frustumCulled = false/, 'かげが きえない');
  assert.match(SRC3D, /r3d\.setDiag\(!!opts\.perf\)/, '診断は &perf=1 の ときだけ(production の UI に 出さない)');
  assert.match(SRC3D, /if \(diag\.on && \(view\.frame \|\| 0\) % 4 === 0\) \{ diag\.ray = rayProbe/);
  assert.match(SRC3D, /'ray ' \+ st\.diag\.ray\.seen \+ '\/' \+ st\.diag\.ray\.of/, 'perf 表示に ray の 見え かた');
  assert.match(SRC3D, /if \(med > 22 && dpr > 1\.5 \+ 1e-6\)/, '解像度の 自動調整(1.5 まで)');
  assert.ok(!/opacity\s*=\s*[^;]*(dist|Math\.hypot)/.test(SRC3D), 'きょりで 透明に しない');
});

test('GT-2. ray の 格子(pure): 線分が とおる ます目の instance だけ が 候補', async () => {
  const { buildRayGrid, rayCandidates, RAY_CELL } = await mod3d();
  const inst = { crown: [{ x: 0, y: 100, z: -500, sx: 60, sy: 40, sz: 60 }, { x: 2000, y: 100, z: -500, sx: 60, sy: 40, sz: 60 }], pool: [{ x: 0, y: 0, z: -500, sx: 300, sy: 1, sz: 300 }] };
  const g = buildRayGrid(inst, new Set(['pool']));
  const c = rayCandidates(g, 0, 0, 0, -1000);
  assert.ok(c.some(([s, i]) => s === 'crown' && i === 0) && !c.some(([s, i]) => s === 'crown' && i === 1), '線分の 上の 物 だけ');
  assert.ok(!c.some(([s]) => s === 'pool'), '水は 候補に しない');
  assert.ok(RAY_CELL >= 80 && RAY_CELL <= 400);
});

test('GT-3. 予算(HQ-4): うすい 板は 1 まい・幹は ふたなし・mound は 下半分 なし・花の まんなか 8 三角形。透明 fade で けさない', () => {
  assert.match(SRC3D, /case 'box': push\(pt\.rz <= 2\.6 && !pt\.solidBox \? 'wpanel' : 'wbox'/);
  assert.match(SRC3D, /trunk: up\(new THREE\.CylinderGeometry\(0\.72, 1, 1, 7, 1, true\)\)/);
  assert.match(SRC3D, /pos\.getY\(f\) < -0\.15 && pos\.getY\(f \+ 1\) < -0\.15 && pos\.getY\(f \+ 2\) < -0\.15/);
  assert.match(SRC3D, /push\('nut8',/);
  assert.match(SRC3D, /const N = 4, pos = \[\], idx = \[\];/, 'しだ / ヤシの は 8 三角形');
});

test('GT-4. Terrain v1(HQ-5): 意味の ある 起伏。道 / spot は 平ら、ひらけた ところ に 丘、小川は 谷、池は くぼ地、海は 水へ ひくく。ランダムな こぶ だけ では ない', async () => {
  const { terrainGrid, TERRAIN_CELL } = await mod3d();
  assert.equal(TERRAIN_CELL, 80);
  for (const rid of ['forest', 'countryside', 'desert', 'sea', 'river_lake', 'home', 'mountain']) {
    const w = worldOf(rid), tg = terrainGrid(w, M, objsOf(rid));
    let onPath = 0, onPathMax = 0, open = 0, openRange = [Infinity, -Infinity];
    for (let j = 0; j <= tg.nz; j += 2) for (let i = 0; i <= tg.nx; i += 2) {
      const x = tg.x0 + i * tg.cell, z = tg.z0 + j * tg.cell, hh = tg.H[j * (tg.nx + 1) + i], dp = tg.segD(x, z);
      if (dp < -20 && tg.sDist(x, z).d > 400 && !w.spots.some((q) => q.kind === 'water' && Math.hypot(q.x - x, q.z - z) < q.r * 1.6) && !(w.terrain && w.terrain.kind === 'coast')) { onPath++; onPathMax = Math.max(onPathMax, hh); }
      if (dp > 400 && x > (w.minX ?? -w.halfW) + 400 && x < (w.maxX ?? w.halfW) - 400 && z > 400 && z < w.len - 400 && tg.sDist(x, z).d > 300) { open++; openRange = [Math.min(openRange[0], hh), Math.max(openRange[1], hh)]; }
    }
    if (!(w.terrain && w.terrain.kind === 'coast')) assert.ok(onPath > 10 && onPathMax <= 0.5, rid + ' 道の 上は 平ら(上がらない)' + onPathMax.toFixed(2));
    const R = M.REGION3D[rid].relief || {};
    if (R.hill >= 20 && open > 20) assert.ok(openRange[1] - openRange[0] > R.hill * 0.6, rid + ' ひらけた ところに 起伏 ' + (openRange[1] - openRange[0]).toFixed(1));
    if (rid === 'home') assert.ok(openRange[1] - openRange[0] < 30, 'いえ は ほぼ 平らな 敷地');
    for (const s of tg.streams) { const mid = s.pts[Math.floor(s.pts.length / 2)], gy = tg.sample(mid.x, mid.z); if (tg.segD(mid.x, mid.z) > 40) assert.ok(gy < -8, rid + ' ' + s.id + ' は 谷 ' + gy.toFixed(1)); }
    for (const q of tg.ponds) assert.ok(tg.sample(q.x, q.z) < -8, rid + ' ' + q.id + ' は くぼ地');
  }
  const sea = worldOf('sea'), tg = terrainGrid(sea, M, objsOf('sea')), sx = M.shoreX(sea, 3000), side = sea.terrain.side || -1;
  assert.ok(tg.sample(sx + side * 300, 3000) < tg.sample(sx - side * 600, 3000), '海へ むかって ひくく');
});

test('GT-5. Creek / River v3(HQ-6): 小川は spot の 円盤の ならび では なく 1 本の ながれ。橋の spot の 下を とおり、道を 横切る ところは 橋 か 飛び石。道 / かたい 物 の 上を ながれない', () => {
  const want = { forest: ['creek', 'brook'], jungle: ['jriver', 'swampbrook'], mountain: ['gorge'], countryside: ['river', 'ditch'], river_lake: ['river'] };
  for (const [rid, ids] of Object.entries(want)) {
    const w = worldOf(rid), ss = M.streams3d(w);
    assert.equal(ss.map((s) => s.id).sort().join(','), ids.slice().sort().join(','), rid + ' の ながれ');
    for (const s of ss) {
      assert.ok(s.pts.length >= 10 && s.pts.every((p) => p.w > 0), rid + ' ' + s.id + ' 点 と はば');
      assert.ok(new Set(s.pts.map((p) => Math.round(p.w))).size >= 4, rid + ' ' + s.id + ' はばが ゆれる');
      const solids = w.obstacles.filter((o) => o.role === 'solid');
      const inSolid = s.pts.filter((p) => solids.some((o) => Math.hypot(o.x - p.x, o.z - p.z) < Math.max(o.hw, o.hd) * 0.6)).length;
      assert.ok(inSolid <= Math.max(3, s.pts.length * 0.08), rid + ' ' + s.id + ' かたい 物の 中 ' + inSolid);
      for (const c of s.crossings) assert.ok(c.kind === 'bridge' || c.kind === 'ford', rid + ' 交わりは 橋 か 飛び石');
      if (s.kind !== 'river') for (const nd of s.nodes) if (nd.spot) assert.ok(s.pts.some((p) => Math.hypot(p.x - nd.spot.x, p.z - nd.spot.z) < 2), rid + ' ' + s.id + ' は ' + nd.spot.id + ' を とおる');
    }
  }
  // 橋の spot の 下を とおる(forest)
  const f = M.streams3d(worldOf('forest')).find((s) => s.id === 'creek');
  assert.ok(f.crossings.some((c) => c.spot === 'bridge1') && f.crossings.some((c) => c.spot === 'bridge2'), 'forest の 小川は 2 つの 橋の 下');
  // 飛び石: 水面(−9)から 出る 石を 道の むきに 3 つ いじょう
  const fords = objsOf('forest').filter((o) => o.type === 'ford');
  assert.ok(fords.length >= 1 && fords.every((o) => o.parts.length >= 3 && o.parts.every((p) => p.shape === 'stone' && p.y === -9 && p.h >= 8) && o.walkable && !o.collision));
  // 小川の 水の spot は 池の 円盤に しない(レンダラーは 小川の 錨の 水の spot を ponds から はずす)
  assert.match(SRC3D, /!\(terr && terr\.anchorIds\.has\(q\.id\)\)/);
  assert.match(SRC3D, /river \? 'water:bank' : 'water:creekbed'/);
});

test('GT-6. Water(HQ-7): 海 / 川 / 池 で 水の 面を かえる(海 = 浅瀬 → 沖 → 水平線、川 = 谷の 中の ながれる 面、池 = しずかな くぼ地の 面)', async () => {
  const { STREAM_WATER_Y, streamBedY } = await mod3d();
  assert.ok(STREAM_WATER_Y.river < STREAM_WATER_Y.creek && STREAM_WATER_Y.creek < STREAM_WATER_Y.ditch && STREAM_WATER_Y.ditch < 0, '水面は 地面より ひくい');
  assert.ok(streamBedY(0, 50, false) < STREAM_WATER_Y.creek && streamBedY(0, 150, true) < STREAM_WATER_Y.river, '川底は 水面の 下');
  assert.equal(streamBedY(200, 50, false), null, '帯の そと');
  assert.match(SRC3D, /'water:' \+ water\.kind/, '海 / 湖 の 面');
  assert.match(SRC3D, /streamMat = keep\(new THREE\.MeshPhongMaterial\(\{ vertexColors: true, map: streamTex/, '小川の 面は べつの material(ながれの すじ)');
  assert.match(SRC3D, /waterAnim\.push\(\{ map: streamTex, dx: 0, dy: 0\.16 \}\)/);
  assert.match(SRC3D, /y: terr \? \(lake \? -3\.6 : -4\)/, '池は くぼ地の 中の 水面');
});

test('GT-7. home と countryside(HQ-10): いえ = 家ごとの 庭(花だん・ポスト・ひくい さく・飛び石)、いなか = ひろい 畑 と 用水路 と 板の はし(庭 なし)', () => {
  const home = objsOf('home'), cs = objsOf('countryside');
  const gardens = home.filter((o) => o.garden);
  assert.ok(gardens.length >= 8, '庭 ' + gardens.length);
  for (const g of gardens) assert.ok(g.walkable && !g.collision && g.dressing);
  assert.ok(gardens.filter((g) => g.parts.some((p) => p.shape === 'flower')).length >= gardens.length * 0.7, '庭の 多くに 花だん');
  assert.ok(gardens.filter((g) => g.parts.some((p) => p.shape === 'rail')).length >= 3 && gardens.filter((g) => g.parts.some((p) => p.shape === 'box' && p.y === 34)).length >= 3, 'さく と ポスト');
  assert.ok(!home.some((o) => o.field) && !cs.some((o) => o.garden), 'いえ に 畑 なし・いなか に 庭 なし');
  const fields = cs.filter((o) => o.field);
  assert.ok(fields.length >= 5 && fields.every((o) => o.parts.filter((p) => p.shape === 'blade').length >= 20), 'いなかの 畑(うね)' + fields.length);
  assert.ok(cs.some((o) => o.type === 'bridge' && o.bridgeKind === 'plank'), '用水路の 板の はし');
  const homeFam = new Set(home.filter((o) => o.type === 'house').map((o) => o.parts[0].family)), csFam = new Set(cs.filter((o) => o.type === 'house').map((o) => o.parts[0].family));
  assert.ok(!homeFam.has('farmhouse') && csFam.has('farmhouse') && csFam.has('barn') && !csFam.has('cottage'), 'いえ と いなか で 家の family が ちがう');
  assert.ok(M.REGION3D.countryside.relief.hill > M.REGION3D.home.relief.hill * 2, 'いなか は ひろく 起伏');
});

test('GT-8. forest と jungle(HQ-11): もり = つめたい みどり・たおれた 丸太・しだ・きのこ・見とおし ほどほど。ジャングル = 多層(大きな は の 下草・ヤシ・canopy の つる)・しめった もや', () => {
  const F = M.REGION3D.forest, J = M.REGION3D.jungle;
  const cool = (c) => { const r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16); return b - r; };
  assert.ok(F.foliage.crown.every((c) => cool(c) >= 0), 'もりの 葉は つめたい(青み ≥ 赤み)');
  assert.ok(F.cover.logs > 0 && F.cover.ferns > 0 && F.cover.mushrooms > 0 && !J.cover.logs, 'もりの 丸太 / しだ / きのこ');
  assert.ok(J.cover.bigleaves > 0, 'ジャングルの 下草');
  assert.ok(objsOf('forest').some((o) => o.kind === 'cover:logs') && objsOf('jungle').some((o) => o.kind === 'cover:bigleaves'));
  const jt = objsOf('jungle').filter((o) => o.type === 'bigtree' && !o.kind.startsWith('LM:'));
  assert.ok(jt.every((o) => o.parts.filter((p) => p.shape === 'wpost' && p.r < 2.5).length === 2), 'canopy から たれる つる');
  assert.ok(J.fog[1] < F.fog[1] && J.fog[0] < F.fog[0], 'ジャングルの 見とおし は みじかい');
});

test('GT-9. Tree v4(HQ-12): 根もとの はり・2 だんの 幹(すこし かたむく)・かんむりへ のびる 枝・白っぽい ほそい 木(すずしい 地域)', () => {
  const f = objsOf('forest').filter((o) => o.type === 'broadleaf');
  for (const o of f) {
    const trunks = o.parts.filter((p) => p.shape === 'trunk');
    assert.ok(trunks.length >= 3, o.id + ' 根もと + 幹 2 だん');
    assert.ok(trunks[0].h < trunks[1].h && trunks[0].r > trunks[1].r, o.id + ' 根もとは みじかく ひろい');
  }
  assert.ok(f.some((o) => o.parts.some((p) => p.shape === 'trunk' && p.tilt > 0.5 && p.toward)), '枝');
  assert.ok(f.some((o) => o.parts.some((p) => p.shape === 'trunk' && p.color === '#ddd6c8')), '白っぽい 幹の 木');
  assert.match(SRC3D, /ry: pt\.toward \? Math\.atan2\(-pt\.toward\[1\], -pt\.toward\[0\]\) : t \* TAU, rz: pt\.tilt \|\| 0/, 'かたむきの むき');
});

test('GT-10. props gate(HQ-13): ラベル なしで わかる。自転車は 立って いる、水車 / 観覧車の わ は たて', () => {
  for (const o of objsOf('city').filter((q) => q.type === 'bike')) { const w = o.parts.filter((p) => p.shape === 'arch'); assert.equal(w.length, 2); for (const p of w) assert.ok(Math.abs(p.y - p.r) < 0.01, '地面に つく'); }
  for (const rid of REGIONS) for (const o of objsOf(rid).filter((q) => q.type === 'wheel' || q.type === 'ferris' || q.type === 'bike')) assert.ok(!o.parts.some((p) => p.shape === 'ring'), rid + ' ' + o.type + ' の わ は 寝かせない');
  assert.match(SRC3D, /case 'arch': push\('wring', \{[^}]*rx: 0/, 'たての わ');
});

test('GT-11. 13 地域の grammar(HQ-14): 背景の 絵 なしで 3D だけで 地域が わかる きまり', () => {
  const KEYS = ['dominant', 'secondary', 'vegetation', 'water', 'density', 'landmark', 'palette', 'openness', 'verticality', 'props'];
  for (const rid of REGIONS) { const g = M.REGION3D[rid].grammar; assert.ok(g, rid + ' grammar'); for (const k of KEYS) assert.ok(typeof g[k] === 'string' && g[k].length >= 2, rid + ' ' + k); }
  assert.equal(new Set(REGIONS.map((r) => M.REGION3D[r].grammar.dominant)).size, REGIONS.length, '主な かたちは 地域ごとに ちがう');
});

test('GT-12. 季節 / 天気(HQ-15): 山は 夏(高原の みどり)と 冬(雪)で 地面が かわる・大木も 季節の いろ・3D でも 雨 / 雪', () => {
  const S3 = M.REGION3D.mountain.seasons3d;
  for (const k of ['spring', 'summer', 'autumn', 'winter']) assert.ok(Array.isArray(S3[k]) && S3[k].length === 2, '山の ' + k);
  const lum = (c) => parseInt(c.slice(1, 3), 16) + parseInt(c.slice(3, 5), 16) + parseInt(c.slice(5, 7), 16);
  assert.ok(lum(S3.winter[0]) > lum(S3.summer[0]) + 150, '冬は 雪(あかるい)');
  assert.ok(parseInt(S3.summer[0].slice(3, 5), 16) > parseInt(S3.summer[0].slice(1, 3), 16), '夏は みどり');
  assert.match(SRC3D, /snowy = !!\(SS && \(sk === 'winter' \|\| env\.weather === 'snow'\)\)/);
  assert.match(SRC3D, /built\.setGroundColors\(snowy \? SS\.winter : SS\[sk\] \|\| null\)/);
  assert.match(SRC3D, /built\.meshes\.crownBig\.material\.color\.set\(SEASON_CROWN\[sk\]/, '大木も 季節');
  assert.match(SRC3D, /wx === 'rain' \|\| wx === 'snow'/, '3D の 雨 / 雪');
});

test('GT-13. Human QA の 記録 と status: 未承認・main merge しない・Ready に しない・production Pages を かえない。特定の 作品の 名まえは 出さない', () => {
  const qa = fs.readFileSync(path.join(ROOT, 'docs/qa/meguru-3d-art-direction-v1-human-qa.md'), 'utf8');
  assert.ok(/Art Direction 完成は 未承認/.test(qa) && /production Pages を かえない/.test(qa));
  for (let i = 1; i <= 15; i++) assert.ok(qa.includes('HQ-' + i + ' '), 'HQ-' + i);
  const statusPath = path.join(ROOT, 'docs/qa/meguru-3d-geometry-terrain-v1-status.md');
  assert.ok(fs.existsSync(statusPath), 'status doc');
  const stx = fs.readFileSync(statusPath, 'utf8');
  for (let i = 1; i <= 15; i++) assert.ok(stx.includes('HQ-' + i), 'status に HQ-' + i);
  assert.ok(/main へ merge しない/.test(stx) && /Ready に しない/.test(stx));
  for (const text of [SRC, SRC3D, qa, stx]) for (const bad of ['Nintendo', 'nintendo', 'Animal Crossing', 'どうぶつの森', 'Nook', 'しずえ', 'たぬきち']) assert.ok(!text.includes(bad), '固有の 名まえ ' + bad);
});
