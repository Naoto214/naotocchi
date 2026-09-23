// Phase 4B — REGION_FRAME と local ↔ global 変換の 基盤
// (docs/design/meguru-phase4a-region-origin-global-world-2026-09-22.md の §17「4B 置く」)
//
// Phase 4B の 完了条件は **「だれにも つかわれて いない pure transform layer」** で ある こと。
// ここで しばるのは
//   ・frame の かたちと 中み(有限・yaw は 自由な 実数・memory_lake は もたない)
//   ・変換の 往復が 一致する こと
//   ・walk connection の closure が 目標(< 400)に おさまる こと
//   ・**この そうを まるごと 消しても ゲームの うごきが 1 ミリも 変わらない こと**(11 番)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { harness } = require('./helpers/runtime-harness.cjs');

// ちがう realm から くる ので、そのままでは Array / Object の はんてい が とおらない
const arr = (x) => Array.from(x || []);
const obj = (x) => Object.assign({}, x || {});

function setup() {
  const h = harness({ fullDisplay: true });
  const M = h.api.meguruMod;
  return { h, M, G: M.WORLD_GEOGRAPHY, W: M.WORLDS };
}
const spotOf = (W, rid, sid) => (W[rid].spots || []).find((q) => q.id === sid);
// walk connection(closure を しばる もの)
const walkConns = (G) => G.connections.filter((c) => c.b && c.gate && c.gate.kind === 'walk' && c.mouths);
// special connection(しばらない もの)
const specialConns = (G) => G.connections.filter((c) => c.b && c.gate && c.gate.kind !== 'walk' && c.mouths);

const SRC = fs.readFileSync('meguru.js', 'utf8');
// Phase 4D-2(遠景 PoC)は 印の ついた ブロックと 行だけ。消す ときは いっしょに 消す
const strip4d2 = (src) => src.replace(/^[ \t]*\/\/ ====== Phase 4D-2:[\s\S]*?\/\/ ====== \/Phase 4D-2 ======\n/gm, '')
  // Phase 4E-2(home|forest を あるく PoC)も 印の ついた ブロックと 行だけ。4D-2 と いっしょに 消す
  .replace(/^[ \t]*\/\/ ====== Phase 4E-2:[\s\S]*?\/\/ ====== \/Phase 4E-2 ======\n/gm, '')
  .split('\n').filter((l) => !/\/\/ Phase 4D-2$|\/\/ Phase 4E-2$/.test(l)).join('\n')
  .replace(/ CONTINUOUS_WALK_ALLOWLIST,[^\n]*? createCorridorWalk,/, '')
  .replace(', get corridor() { return corridorInfo(); }, get corridorStats() { return corrStats; }', '');
// Phase 4B で 足した ぶんだけを 切りだす
function phase4bBlock() {
  const a = SRC.indexOf('// ====== Phase 4B:');
  const b = SRC.indexOf('// 世界地図に 出す 地域', a);
  assert.ok(a > 0 && b > a, 'Phase 4B の ブロックが 見つかる');
  return SRC.slice(a, b);
}

test('1. REGION_FRAME を もつのは 12 地域。きおくのみずうみ だけ もたない', () => {
  const { M, G } = setup();
  const framed = arr(M.FRAMED_REGIONS).sort();
  assert.equal(framed.length, 12, 'frame を もつのは 12(13 地域 − きおくのみずうみ)');
  assert.equal(framed.join(','),
    ['home', 'city', 'countryside', 'forest', 'mountain', 'snow', 'sea', 'deepsea',
      'river_lake', 'jungle', 'desert', 'star_stop'].sort().join(','));
  // **13 個 ぜんぶ おなじ あつかいには して いない**
  assert.equal(Object.keys(G.regions).length, 13, '地域そのものは 13');
  assert.ok(!framed.includes('memory_lake'), 'きおくのみずうみ は frame を もたない');
  assert.equal(M.hasFrame('memory_lake'), false);
  assert.equal(M.regionFrame('memory_lake'), null);
  // 正本の region 以外に かってに ふえて いない
  for (const id of framed) assert.ok(G.regions[id], id + ' は 正本の 地域');
});

test('2. frame の 値は ぜんぶ 有限。yaw は **まるめて いない** 自由な 実数', () => {
  const { M } = setup();
  const F = obj(M.REGION_FRAME);
  const QUARTER = Math.PI / 4;
  let free = 0;
  for (const id of arr(M.FRAMED_REGIONS)) {
    const f = obj(F[id]);
    for (const k of ['x', 'y', 'z', 'yaw']) {
      assert.equal(typeof f[k], 'number', `${id}.${k} は かず`);
      assert.ok(Number.isFinite(f[k]), `${id}.${k} は 有限`);
    }
    assert.ok(['ground', 'sky', 'below'].includes(f.layer), id + ' の layer');
    // 45° きざみに まるめると Phase 4A 実測で ずれが 71 → 2222 に もどる。
    // まるめて いない ことを 「4 ぶんの π の ばいすうでは ない ものが ある」で しばる
    const r = Math.abs(f.yaw / QUARTER - Math.round(f.yaw / QUARTER));
    if (r > 0.02) free++;
  }
  assert.ok(free >= 10, `yaw は 自由な 実数(45°の ばいすうで ない ものが ${free} 個)`);
  // home は せかいの きじゅん点。origin は (0,0,0)
  const h = obj(F.home);
  assert.equal(h.x, 0); assert.equal(h.y, 0); assert.equal(h.z, 0);
});

test('3. toGlobal → toLocal の 往復が 一致する(471 spot ぜんぶ)', () => {
  const { M, W } = setup();
  let worst = 0, n = 0;
  for (const id of arr(M.FRAMED_REGIONS)) {
    for (const s of W[id].spots) {
      const g = M.toGlobal(id, s);
      assert.ok(g && Number.isFinite(g.x) && Number.isFinite(g.y) && Number.isFinite(g.z), id + '.' + s.id);
      const back = M.toLocal(id, g);
      worst = Math.max(worst, Math.abs(back.x - s.x), Math.abs(back.z - s.z));
      n++;
    }
  }
  assert.ok(n >= 400, '十分な かず を みた: ' + n);
  assert.ok(worst < 1e-6, '往復の ごさは 浮動小数の ぶんだけ: ' + worst);
  // y は frame の layer の 高さ
  const F = obj(M.REGION_FRAME);
  for (const id of arr(M.FRAMED_REGIONS)) assert.equal(M.toGlobal(id, { x: 0, z: 0 }).y, obj(F[id]).y);
});

test('4. むき(dir)の 往復が 一致する。いちは 足さない', () => {
  const { M } = setup();
  let worst = 0;
  for (const id of arr(M.FRAMED_REGIONS)) {
    for (let k = 0; k < 72; k++) {
      const a = k * 5 * Math.PI / 180, d = { x: Math.sin(a), z: Math.cos(a) };
      const g = M.dirToGlobal(id, d);
      const back = M.dirToLocal(id, g);
      worst = Math.max(worst, Math.abs(back.x - d.x), Math.abs(back.z - d.z));
      // むきは ながさを かえない
      assert.ok(Math.abs(Math.hypot(g.x, g.z) - 1) < 1e-9, 'ながさが かわらない');
    }
    // いちの 変換とは ちがう: origin を 足して いない
    const f = obj(obj(M.REGION_FRAME)[id]);
    const p = M.toGlobal(id, { x: 0, z: 100 }), v = M.dirToGlobal(id, { x: 0, z: 100 });
    assert.ok(Math.abs((p.x - f.x) - v.x) < 1e-9 && Math.abs((p.z - f.z) - v.z) < 1e-9);
  }
  assert.ok(worst < 1e-9, 'dir の 往復ごさ: ' + worst);
});

test('5. yaw の 往復が 一致する', () => {
  const { M } = setup();
  let worst = 0;
  for (const id of arr(M.FRAMED_REGIONS)) {
    for (let k = 0; k < 72; k++) {
      const a = (k * 5 - 180) * Math.PI / 180;
      const g = M.yawToGlobal(id, a);
      assert.ok(Number.isFinite(g), 'yawToGlobal は かず');
      const back = M.yawToLocal(id, g);
      const d = Math.abs(((back - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      worst = Math.max(worst, d);
    }
    // dirToGlobal と つじつまが あう(おなじ 回転)
    const a = 0.7;
    const v = M.dirToGlobal(id, { x: Math.sin(a), z: Math.cos(a) });
    const y = M.yawToGlobal(id, a);
    assert.ok(Math.abs(Math.sin(y) - v.x) < 1e-9 && Math.abs(Math.cos(y) - v.z) < 1e-9,
      'yawToGlobal と dirToGlobal は おなじ 回転');
  }
  assert.ok(worst < 1e-9, 'yaw の 往復ごさ: ' + worst);
});

test('6. walk connection 10 本の closure が 目標(< 400)に おさまる', () => {
  const { M, G, W } = setup();
  const walk = walkConns(G);
  assert.equal(walk.length, 10, 'あるいて わたる connection は 10 本');
  let worst = 0, sq = 0;
  for (const c of walk) {
    const a = M.toGlobal(c.a, spotOf(W, c.a, c.mouths[c.a]));
    const b = M.toGlobal(c.b, spotOf(W, c.b, c.mouths[c.b]));
    assert.ok(a && b, c.id + ' の 両はしが global に うつせる');
    assert.equal(a.y, b.y, c.id + ' は おなじ 高さ(どちらも ground)');
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    assert.ok(d < 400, `${c.id} の closure は 400 みまん(${d.toFixed(1)})`);
    worst = Math.max(worst, d); sq += d * d;
  }
  // Phase 4A の じっそく(さいだい 144)より よい ことも しばる
  assert.ok(worst < 150, 'さいだいの closure: ' + worst.toFixed(1));
  assert.ok(Math.sqrt(sq / walk.length) < 100, 'closure の RMS: ' + Math.sqrt(sq / walk.length).toFixed(1));
});

test('7. special connection は closure を しばらない。layer の 上下だけ しばる', () => {
  const { M, G, W } = setup();
  const sp = specialConns(G);
  assert.equal(sp.map((c) => c.id).sort().join(','),
    'countryside|star_stop,deepsea|sea,jungle|sea', 'transport edge は この 3 本');
  const at = {};
  for (const c of sp) {
    const a = M.toGlobal(c.a, spotOf(W, c.a, c.mouths[c.a]));
    const b = M.toGlobal(c.b, spotOf(W, c.b, c.mouths[c.b]));
    at[c.id] = { xz: Math.hypot(a.x - b.x, a.z - b.z), dy: b.y - a.y };
  }
  // ふねは 外洋を ひとわたり: **はなれて いて よい**(むしろ はなれて いる のが 正しい)
  assert.ok(at['jungle|sea'].xz > 5000, 'しまは 外洋の むこう: ' + Math.round(at['jungle|sea'].xz));
  assert.equal(at['jungle|sea'].dy, 0, 'ふねは おなじ 高さ');
  // もぐるのは たて: X/Z は ほぼ おなじで、下へ
  assert.ok(at['deepsea|sea'].xz < 100, 'もぐるのは たて: ' + Math.round(at['deepsea|sea'].xz));
  assert.ok(at['deepsea|sea'].dy > 0, 'deepsea → sea は 上へ(= deepsea は 下)');
  // ゴンドラは 上へ。よこにも すすむ ので X/Z は しばらない
  assert.ok(at['countryside|star_stop'].dy > 0, 'いなか → ほしぞら は 上へ');
});

test('8. きおくのみずうみ は 通常 global 地理の そと。逆引きの かんすうは ない', () => {
  const { M } = setup();
  // frame を もたない → null(れいがいを なげない)
  assert.equal(M.toGlobal('memory_lake', { x: 10, z: 20 }), null);
  assert.equal(M.toLocal('memory_lake', { x: 10, z: 20 }), null);
  assert.equal(M.dirToGlobal('memory_lake', { x: 0, z: 1 }), null);
  assert.equal(M.dirToLocal('memory_lake', { x: 0, z: 1 }), null);
  assert.equal(M.yawToGlobal('memory_lake', 0), null);
  assert.equal(M.yawToLocal('memory_lake', 0), null);
  // しらない id も おなじ。おかしな ざひょうを でっちあげない
  for (const bad of ['nowhere', '', null, undefined]) {
    assert.equal(M.toGlobal(bad, { x: 1, z: 1 }), null);
    assert.equal(M.toLocal(bad, { x: 1, z: 1 }), null);
  }
  // ひきすうが なくても おちない
  assert.equal(M.toGlobal('home', null), null);
  assert.equal(M.toLocal('home', null), null);
  assert.equal(M.yawToGlobal('home', NaN), null);
  // **global → region の 逆引きは 作らない**(chart が かさなるので 一意に きまらない)
  for (const k of Object.keys(obj(M))) {
    assert.ok(!/^(regionAt|regionOf|findRegionAtGlobal|globalToRegion|whichRegion)$/.test(k),
      '逆引きの かんすうを はやして いない: ' + k);
  }
});

test('9. special layer(そら / ちじょう / うみのそこ)が 区別できる', () => {
  const { M, G } = setup();
  const Y = obj(M.REGION_LAYER_Y);
  assert.equal(Y.ground, 0, 'ちじょうが きじゅん');
  assert.ok(Y.sky > 0, 'そらは 上: ' + Y.sky);
  assert.ok(Y.below < 0, 'うみのそこは 下: ' + Y.below);
  const F = obj(M.REGION_FRAME);
  const byLayer = {};
  for (const id of arr(M.FRAMED_REGIONS)) {
    const f = obj(F[id]);
    (byLayer[f.layer] || (byLayer[f.layer] = [])).push(id);
    assert.equal(f.y, Y[f.layer], id + ' の y は layer の 高さ');
    // 正本(WORLD_GEOGRAPHY.regions[id].layer)と ずれて いない
    assert.equal(f.layer, G.regions[id].layer, id + ' の layer は 正本と おなじ');
  }
  assert.equal((byLayer.ground || []).length, 10, 'ちじょうは 10');
  assert.equal((byLayer.sky || []).join(','), 'star_stop');
  assert.equal((byLayer.below || []).join(','), 'deepsea');
  assert.ok(obj(F.star_stop).y > obj(F.home).y, 'ほしぞらは おうちより 上');
  assert.ok(obj(F.deepsea).y < obj(F.home).y, 'しんかいは おうちより 下');
});

test('10. REGION_FRAME は mapX / mapY を つかって いない(世界地図とは べつの そう)', () => {
  const { M, G } = setup();
  // コメント(せつめい文)には 「mapX / mapY は つかわない」と 書いて ある ので、
  // **コードの ぎょう だけ**を 見る
  const code = phase4bBlock().split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  assert.ok(!/\bmapX\b|\bmapY\b/.test(code), 'Phase 4B の コードに mapX / mapY は 出て こない');
  assert.ok(!/worldMapShape|GEO_UNIT|GEO_AREA|GEO_ASPECT|WMAP_BOUNDS/.test(code),
    '世界地図の しくみも つかって いない');
  // かずも 一致して いない(= 流用して いない)
  const F = obj(M.REGION_FRAME);
  let same = 0;
  for (const id of arr(M.FRAMED_REGIONS)) {
    const g = G.regions[id], f = obj(F[id]);
    if (g.mapX != null && (f.x === g.mapX || f.z === g.mapY)) same++;
  }
  assert.equal(same, 0, 'mapX / mapY を そのまま 入れた 地域は ない');
  // 世界地図は 1 つも 動いて いない
  assert.equal(G.regions.home.mapX, 2.1); assert.equal(G.regions.home.mapY, 0.4);
  assert.equal(G.regions.desert.mapX, -3.2); assert.equal(G.regions.desert.mapY, 1.4);
  assert.equal(G.regions.memory_lake.mapX, null); assert.equal(G.regions.memory_lake.mapY, null);
});

test('11. **消しても うごきが 変わらない**(まだ だれにも つかわれて いない)', () => {
  const NAMES = ['REGION_FRAME', 'REGION_LAYER_Y', 'FRAMED_REGIONS', 'hasFrame', 'regionFrame',
    'toGlobal', 'toLocal', 'dirToGlobal', 'dirToLocal', 'yawToGlobal', 'yawToLocal'];
  const block = phase4bBlock();
  const rest = SRC.replace(block, '');
  // (a) しずかな しょうめい: Phase 4B の なまえは **ブロックと export の ぎょう いがいに 出て こない**
  const exportLine = rest.split('\n').find((l) => l.includes('return { computeMapData,')) || '';
  const outside = rest.replace(exportLine, '');
  for (const n of NAMES) {
    const hit = outside.match(new RegExp('\\b' + n + '\\b', 'g')) || [];
    assert.equal(hit.length, 0, `meguru.js の ほかの ところで ${n} を つかって いない`);
  }
  // ほかの ファイルからも よばれて いない
  for (const f of ['script.js', 'games.js', 'quick.js', 'audio.js']) {
    const src = fs.readFileSync(f, 'utf8');
    for (const n of NAMES) assert.ok(!new RegExp('\\b' + n + '\\b').test(src), `${f} は ${n} を つかって いない`);
  }
  // (b) うごかす しょうめい: **ブロックを まるごと 消した meguru.js** で おなじ 指紋が 出る
  // ハーネスは いろいろな ルートの .js を よむ ので、**ぜんぶ**を うつす。
  // meguru.js だけを あとで すりかえる
  const files = fs.readdirSync('.').filter((f) => f.endsWith('.js'));
  // **リポジトリの なかには 1 つも 書かない。** 2 つの 作業ばしょを 作って、
  // かたほうの meguru.js だけを すりかえる
  const dirA = fs.mkdtempSync(path.join(os.tmpdir(), 'meguru4b-a-'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meguru4b-b-'));
  const plant = (d) => {
    fs.mkdirSync(path.join(d, 'tests', 'helpers'), { recursive: true });
    for (const f of files) if (fs.existsSync(f)) fs.copyFileSync(f, path.join(d, f));
    fs.copyFileSync('tests/helpers/runtime-harness.cjs', path.join(d, 'tests/helpers/runtime-harness.cjs'));
  };
  try {
    plant(dirA); plant(dir);
    // Phase 4B の ブロックと export への ついかを けす。
    // Phase 4C(corridor)と 4D-1(遠景の いみデータ)と 4E-1(あるける corridor の かたち)は 4B の すぐ うしろ(おなじ ブロックの なか)に のる
    // 「まだ だれも つかって いない」 そう なので、export も いっしょに けす
    const stripped = strip4d2(SRC.replace(block, ''))
      .replace(/ REGION_FRAME, REGION_LAYER_Y, FRAMED_REGIONS, hasFrame, regionFrame, toGlobal, toLocal, dirToGlobal, dirToLocal, yawToGlobal, yawToLocal,( CORRIDOR_STAGE_LEN,[^\n]*? compassLabel,)?( DISTANT_KIND_OF,[^\n]*? visibleDistant,)?( CORRIDOR_STAGE_WALK,[^\n]*? corridorExitPose,)?/, '');
    assert.ok(!/REGION_FRAME/.test(stripped), 'けしのこしが ない');
    assert.ok(!/worldCorridors|findRegionRoute/.test(stripped), 'Phase 4C の けしのこしも ない');
    assert.ok(!/distantRegistry|visibleDistant/.test(stripped), 'Phase 4D-1 の けしのこしも ない');
    assert.ok(!/setDistant|drawDistant|syncDistant/.test(stripped), 'Phase 4D-2 の けしのこしも ない');
    fs.writeFileSync(path.join(dir, 'meguru.js'), stripped);
    const probe = `
      const { harness } = require('./tests/helpers/runtime-harness.cjs');
      const h = harness({ fullDisplay: true }), M = h.api.meguruMod;
      M.setRandom(((s) => () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648)(4242));
      const out = [];
      let sp = 0, pa = 0, zo = 0, se = 0;
      for (const id of Object.keys(M.WORLDS)) { const w = M.WORLDS[id];
        sp += w.spots.length; pa += w.paths.length; zo += w.zones.length;
        se += w.spots.filter((x) => x.secret).length + w.paths.filter((x) => x[2] === 'secret').length; }
      out.push('counts ' + [sp, pa, zo, se].join('/'));
      const C = M.worldCountable();
      out.push('countable ' + C.regions.length + '/' + C.links.length + '/' + C.tier1 + '/' + C.zones);
      out.push('links ' + C.links.slice().sort().join(','));
      for (const id of M.NORMAL_REGIONS.concat(['star_stop', 'memory_lake'])) {
        const w = M.buildWorld(id, M.buildRegistry());
        out.push(id + ' w ' + [w.spots.length, w.paths.length, w.zones.length, w.segments.length,
          (w.obstacles || []).length, (w.props || []).length, w.len, w.halfW, w.minX, w.maxX].join('/'));
        out.push(id + ' entry ' + w.entry.id + ' ' + Math.round(w.entry.x) + ',' + Math.round(w.entry.z));
        out.push(id + ' gates ' + M.regionGates(id, w).map((g) => g.id + '@' + g.spot.id + ':' + g.out).join(' '));
        const L = M.worldLayers(w);
        out.push(id + ' layers ' + ['terrain','water','road','building','vegetation','landmark','obstacle','light','scenery']
          .map((k) => k + '=' + L[k].length).join(' '));
      }
      // あるいて みる(せかいと あたりはんていが おなじ うごきを するか)
      const sim = M.createSimulation({ regionId: 'mountain' });
      for (let i = 0; i < 400; i++) sim.step(1 / 30, { x: Math.sin(i / 7), y: Math.cos(i / 5) });
      const p = sim.player;
      out.push('walk ' + p.x.toFixed(4) + ',' + p.z.toFixed(4) + ',' + p.heading.toFixed(4));
      out.push('discovered ' + sim.discovered.size + ' zones ' + sim.visitedZones.size);
      const wd = M.worldMapData({ regions: C.regions, links: C.links, marks: [], zones: [] });
      out.push('map ' + wd.regions.length + '/' + wd.links.length + '/' + wd.progress.percent);
      console.log(out.join('\\n'));
    `;
    fs.writeFileSync(path.join(dirA, 'probe.cjs'), probe);
    fs.writeFileSync(path.join(dir, 'probe.cjs'), probe);
    const withFrame = execFileSync(process.execPath, ['probe.cjs'], { encoding: 'utf8', cwd: dirA });
    const without = execFileSync(process.execPath, ['probe.cjs'], { encoding: 'utf8', cwd: dir });
    assert.ok(withFrame.length > 500, '指紋が とれて いる');
    assert.ok(/REGION_FRAME/.test(fs.readFileSync(path.join(dirA, 'meguru.js'), 'utf8')), 'A がわには Phase 4B が ある');
    assert.equal(without, withFrame, 'Phase 4B を 消しても ゲームの うごきは 1 つも 変わらない');
  } finally {
    fs.rmSync(dirA, { recursive: true, force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('12. 分母・spot・たび・セーブの かたちは 1 つも 動いて いない', () => {
  const { h, M, G, W } = setup();
  const C = M.worldCountable();
  assert.equal(C.regions.length, 11); assert.equal(C.links.length, 12);
  assert.equal(C.tier1, 17); assert.equal(C.zones, 103);
  let sp = 0, pa = 0, zo = 0, se = 0;
  for (const id of Object.keys(W)) { const w = W[id];
    sp += w.spots.length; pa += w.paths.length; zo += w.zones.length;
    se += w.spots.filter((x) => x.secret).length + w.paths.filter((x) => x[2] === 'secret').length; }
  assert.equal(sp, 471); assert.equal(pa, 654); assert.equal(zo, 118); assert.equal(se, 107);
  assert.equal(G.connections.length, 14);
  assert.equal(G.connections.filter((c) => c.gate).length, 13);
  assert.equal(G.connections.filter((c) => c.b && !c.gate).length, 0);
  // 「たび」は 無変更
  const s = h.api.state();
  assert.equal(typeof h.api.travelToRegion, 'function');
  for (const id of ['mountain', 'sea', 'desert', 'snow', 'river_lake']) {
    const r = h.api.REGIONS.find((x) => x.id === id);
    h.api.travelToRegion(r, { id });
    assert.equal(s.regionId, id, id + ' へ たびで 行ける');
  }
  // セーブには global 座標が 入って いない(いまも id だけ)
  const m = s.lifetime.meguru;
  assert.ok(m && typeof m === 'object');
  const json = JSON.stringify(m);
  assert.ok(!/global|frame|originX|worldX/i.test(json), 'セーブに global の あとかたも ない: ' + json.slice(0, 200));
  for (const k of Object.keys(obj(m))) assert.ok(!/frame|global/i.test(k), 'セーブの かぎに frame / global は ない');
});
