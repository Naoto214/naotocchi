// Phase 4D-1 — 遠景の いみデータ(DistantFeature)の 基盤
// (docs/design/meguru-phase4d-distant-world-streaming-renderer-2026-09-23.md §5〜§8、
//  docs/handoff/meguru-phase4d1-distant-data-2026-09-23.md)
//
// Phase 4D-1 の 完了条件は **「corridor から みちびいた、まだ だれにも つかわれて いない 遠景の いみデータ」** で ある こと。
// ここで しばるのは
//   ・12 地域 ぶんの 遠景が corridor / graph から みちびかれて いる(手で 書いた ものが ない)
//   ・方角は 出口の 向き。REGION_FRAME の 原点どうし・mapX / mapY は つかわない
//   ・px を もたない
//   ・見える 条件(時間・天気・季節・はっけん)が 決定的で、実時刻を 読まない
//   ・きおくのみずうみ は 入らない。しま・ほしぞら・しんかい は 見つける まで 見せない
//   ・**この そうを まるごと 消しても ゲームの うごきが 1 ミリも 変わらない こと**
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

function setup(opts) {
  const h = harness(Object.assign({ fullDisplay: true }, opts || {}));
  const M = h.api.meguruMod;
  return { h, M, G: M.WORLD_GEOGRAPHY, W: M.WORLDS };
}
const all = (M) => { const reg = obj(M.distantRegistry()); return Object.keys(reg).flatMap((id) => arr(reg[id])); };
const ALL_LINKS = (G) => ({ links: G.connections.map((c) => c.id) });
const ENV = (time, weather = 'sunny', season = 'spring') => ({ time, weather, season });
const ids = (list) => arr(list).map((v) => v.id).sort();

const SRC = fs.readFileSync('meguru.js', 'utf8');
// Phase 4D-2(遠景 PoC)は 印の ついた ブロックと 行だけ。消す ときは いっしょに 消す
const strip4d2 = (src) => src.replace(/^[ \t]*\/\/ ====== Phase 4D-2:[\s\S]*?\/\/ ====== \/Phase 4D-2 ======\n/gm, '')
  // Phase 4E-2(home|forest を あるく PoC)も 印の ついた ブロックと 行だけ。4D-2 と いっしょに 消す
  .replace(/^[ \t]*\/\/ ====== Phase 4E-2:[\s\S]*?\/\/ ====== \/Phase 4E-2 ======\n/gm, '')
  .split('\n').filter((l) => !/\/\/ Phase 4D-2$|\/\/ Phase 4E-2$/.test(l)).join('\n')
  .replace(/ CONTINUOUS_WALK_ALLOWLIST,[^\n]*? createCorridorWalk,/, '')
  .replace(', get corridor() { return corridorInfo(); }, get corridorStats() { return corrStats; }', '');
function phase4d1Block() {
  const a = SRC.indexOf('// ====== Phase 4D-1:');
  const b = SRC.indexOf('// 世界地図に 出す 地域', a);
  assert.ok(a > 0 && b > a, 'Phase 4D-1 の ブロックが 見つかる');
  return SRC.slice(SRC.lastIndexOf('\n', a) + 1, SRC.lastIndexOf('\n', b) + 1);
}
const codeOnly = (src) => src.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const EXPORTS_4D1 = ['DISTANT_KIND_OF', 'DISTANT_RULES', 'distantFeatures', 'distantRegistry', 'distantInView', 'visibleDistant'];

// 設計監査(§5.3)から「出口 1 本に far は 1 つ」で しぼった 最終の 37 個
const EXPECTED = {
  home: ['home>forest', 'home>river_lake', 'home>>mountain'],
  city: ['city>countryside', 'city>desert', 'city>sea', 'city>>mountain'],
  countryside: ['countryside>city', 'countryside>forest', 'countryside>star_stop', 'countryside>>desert', 'countryside>>mountain'],
  forest: ['forest>countryside', 'forest>home', 'forest>mountain', 'forest>>city', 'forest>>snow'],
  mountain: ['mountain>desert', 'mountain>forest', 'mountain>river_lake', 'mountain>snow', 'mountain>>city'],
  snow: ['snow>mountain', 'snow>>desert'],
  sea: ['sea>city', 'sea>deepsea', 'sea>jungle', 'sea>>desert'],
  river_lake: ['river_lake>home', 'river_lake>mountain', 'river_lake>>snow'],
  jungle: ['jungle>sea'],
  desert: ['desert>city', 'desert>mountain', 'desert>>snow'],
  star_stop: ['star_stop>countryside'],
  deepsea: ['deepsea>sea'],
};

test('1. 遠景は 37 個。12 地域 すべてに ある。きおくのみずうみ は 入らない', () => {
  const { M } = setup();
  const reg = obj(M.distantRegistry());
  assert.equal(Object.keys(reg).sort().join(','), arr(M.FRAMED_REGIONS).sort().join(','), '12 地域(frame を もつ 地域)ぶん');
  for (const [id, want] of Object.entries(EXPECTED)) {
    assert.equal(ids(reg[id]).join(','), want.slice().sort().join(','), id + ' の 遠景');
    assert.ok(arr(reg[id]).length >= 1, id + ' には 1 つ いじょう ある');
  }
  const F = all(M);
  assert.equal(F.length, 37, 'ぜんぶで 37');
  assert.equal(new Set(F.map((f) => f.id)).size, 37, 'id は かぶらない');
  for (const f of F) assert.ok(f.sourceRegion !== 'memory_lake' && f.targetRegion !== 'memory_lake', f.id);
  assert.equal(arr(M.distantFeatures('memory_lake')).length, 0);
  assert.equal(arr(M.visibleDistant('memory_lake', ENV('night'), ALL_LINKS(M.WORLD_GEOGRAPHY))).length, 0);
  assert.equal(arr(M.distantFeatures('nowhere')).length, 0, 'しらない id は から');
  // 内訳
  const byKind = {}, byClass = {};
  for (const f of F) { byKind[f.kind] = (byKind[f.kind] || 0) + 1; byClass[f.distanceClass] = (byClass[f.distanceClass] || 0) + 1; }
  assert.deepEqual(byClass, { mid: 20, far: 13, vertical: 4 });
  assert.deepEqual(byKind, { forest: 3, highland: 6, mountain: 7, sea_horizon: 2, desert_haze: 5, city_glow: 5,
    sky_light: 2, snow_mountain: 4, deep_dark: 1, island: 1, land_below: 1 });
});

test('2. 行き先と 経路は graph / corridor に 実在する', () => {
  const { M } = setup();
  const nodes = new Set(arr(M.corridorGraph().nodes).map((n) => n.id));
  const cors = new Map(arr(M.worldCorridors()).map((c) => [c.id, c]));
  for (const f of all(M)) {
    assert.ok(nodes.has(f.sourceRegion), f.id + ' の source は graph の node');
    assert.ok(nodes.has(f.targetRegion), f.id + ' の target は graph の node');
    assert.notEqual(f.sourceRegion, f.targetRegion);
    const via = arr(f.via);
    assert.equal(via[0], f.viaConnection, f.id + ' の viaConnection は 最初の 道');
    for (const id of via) assert.ok(cors.has(id), `${f.id} の ${id} は corridor に ある`);
    // 経路が つながって いる
    let at = f.sourceRegion;
    for (const id of via) { const c = cors.get(id); assert.ok(c.a === at || c.b === at, `${f.id}: ${id} は ${at} から 出る`); at = c.a === at ? c.b : c.a; }
    assert.equal(at, f.targetRegion, f.id + ' の 経路は 行き先に つく');
    if (f.distanceClass === 'far' && via.length === 2) {
      // 2 手先: いちばん やすい あるきの ルートと おなじ
      const r = M.findRegionRoute(f.sourceRegion, f.targetRegion, { special: false });
      assert.equal(arr(r.legs).map((l) => l.id).join(','), via.join(','), f.id + ' は いちばん やすい ルート');
      assert.ok(!arr(M.corridorsFrom(f.sourceRegion)).some((o) => o.to === f.targetRegion), f.id + ' の 行き先は となり では ない');
    } else {
      assert.equal(via.length, 1, f.id + ' は となり');
    }
  }
});

test('3. 方角は corridor の 出口の 向き。REGION_FRAME の 原点どうしは つかわない', () => {
  const { M } = setup();
  const deg = (v) => ((Math.atan2(v.x, v.z) * 180 / Math.PI) + 360) % 360;
  const angDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
  let differsFromOrigin = 0;
  for (const f of all(M)) {
    if (f.distanceClass === 'vertical') {
      assert.equal(f.bearingLocal, null, f.id + ' は 方位を もたない');
      assert.equal(f.bearingGlobal, null);
      continue;
    }
    for (const k of ['bearingLocal', 'bearingGlobal']) {
      assert.ok(Number.isFinite(f[k]) && f[k] >= 0 && f[k] < 360, `${f.id}.${k} = ${f[k]}`);
    }
    // global は 最初の 道の corridorDirection と 一致
    const d = M.corridorDirection(f.viaConnection, f.sourceRegion);
    assert.ok(angDiff(f.bearingGlobal, d.heading) < 1e-9, `${f.id}: ${f.bearingGlobal} = corridorDirection ${d.heading}`);
    // local は global を その 地域の local に もどした もの
    const t = f.bearingGlobal * Math.PI / 180;
    assert.ok(angDiff(f.bearingLocal, deg(M.dirToLocal(f.sourceRegion, { x: Math.sin(t), z: Math.cos(t) }))) < 1e-9, f.id);
    // あるきの 出口は 45° きざみ(gate の データの まま)
    const c = arr(M.worldCorridors()).find((x) => x.id === f.viaConnection);
    if (c.kind === 'walk') assert.ok(Math.abs(f.bearingLocal / 45 - Math.round(f.bearingLocal / 45)) < 1e-9, f.id + ' は 45° きざみ');
    // REGION_FRAME の 原点どうしの 向きとは ちがう ことが おおい(= つかって いない)
    const fa = M.regionFrame(f.sourceRegion), fb = M.regionFrame(f.targetRegion);
    if (angDiff(f.bearingLocal, deg(M.dirToLocal(f.sourceRegion, { x: fb.x - fa.x, z: fb.z - fa.z }))) > 45) differsFromOrigin++;
  }
  assert.ok(differsFromOrigin >= 15, '原点どうしの 向きと 45° いじょう ちがう ものが おおい: ' + differsFromOrigin);
  // mid は 出口 spot と local の 出る 向き だけを anchor に もつ
  for (const f of all(M).filter((x) => x.distanceClass === 'mid')) {
    const a = obj(f.anchor), o = arr(M.corridorsFrom(f.sourceRegion)).find((x) => x.id === f.viaConnection);
    assert.equal(a.spot, o.fromSpot, f.id + ' の anchor は 出口 spot');
    assert.ok(Math.abs(Math.hypot(a.out.x, a.out.z) - 1) < 1e-9, f.id + ' の 出る 向きは 単位ベクトル');
    assert.ok(Math.abs(deg(a.out) - f.bearingLocal) < 1e-6 || Math.abs(deg(a.out) - f.bearingLocal) > 359.99, f.id + ' の anchor の 向き = bearingLocal');
  }
  // コードは REGION_FRAME の 位置を よまない(dirToLocal だけ)
  const code = codeOnly(phase4d1Block());
  assert.ok(!/\bREGION_FRAME\b|\bregionFrame\(|\btoGlobal\(|\btoLocal\(|\bdirToGlobal\(/.test(code), '位置の 変換を つかって いない');
});

test('4. 分類・順位・LOD の 値が 正しい', () => {
  const { M, W } = setup();
  const RULES = obj(M.DISTANT_RULES);
  for (const f of all(M)) {
    assert.ok(['mid', 'far', 'vertical'].includes(f.distanceClass), f.id);
    assert.ok(['low', 'tall', 'above', 'below'].includes(f.elevationClass), f.id);
    assert.ok(RULES[f.kind], f.id + ' の kind は ルールに ある');
    assert.equal(f.elevationClass, obj(RULES[f.kind]).elevation);
    assert.ok(Number.isFinite(f.priority), f.id + ' の priority');
    assert.equal(obj(f.lod).layer, f.distanceClass);
    assert.ok([1, 2].includes(obj(f.lod).maxTier), f.id + ' の maxTier');
    // mid > vertical > far
    const band = f.distanceClass === 'mid' ? [200, 300] : f.distanceClass === 'vertical' ? [150, 200] : [100, 150];
    assert.ok(f.priority >= band[0] && f.priority < band[1], `${f.id} の priority ${f.priority}`);
    // far は 高い もの だけ(出口の 先の しま と、しま から 見た 本土 は べつ)
    if (f.distanceClass === 'far' && arr(f.via).length === 2) assert.ok(obj(RULES[f.kind]).tall, f.id + ' は 高い もの');
    // 見え方は 行き先の 地域の いみデータ(WORLDS[].backdrop)から。となりの 本体は よまない
    if (!['island', 'sky_light', 'deep_dark', 'land_below'].includes(f.kind)) {
      assert.equal(f.silhouette, W[f.targetRegion].backdrop, f.id + ' の silhouette');
      assert.equal(obj(M.DISTANT_KIND_OF)[f.silhouette], f.kind);
    }
  }
  assert.ok(!/\bbuildWorld\(|\bbuildRegistry\(/.test(codeOnly(phase4d1Block())), '地域の 本体を 組み立てない');
  // tier 2 で のこるのは mid だけ
  assert.ok(all(M).every((f) => (obj(f.lod).maxTier === 2) === (f.distanceClass === 'mid')));
});

test('5. px を もたない(renderer に よらない いみデータ)', () => {
  const { M } = setup();
  const walk = (v, where) => {
    if (v && typeof v === 'object') {
      for (const k of Object.keys(v)) {
        assert.ok(!/screen|pixel|^px|Px$|canvas|width|height/i.test(k), `${where}.${k} は 画面の 値`);
        walk(v[k], where + '.' + k);
      }
    }
  };
  for (const f of all(M)) walk(f, f.id);
  const code = codeOnly(phase4d1Block());
  assert.ok(!/\bctx\b|getContext|devicePixelRatio|innerWidth|document\.|window\./.test(code), 'がめんを さわらない');
});

test('6. 見える 条件は 決定的。実時刻を 読まない', () => {
  const combos = [];
  for (const time of ['morning', 'day', 'evening', 'night']) for (const weather of ['sunny', 'cloudy', 'rain', 'snow'])
    for (const season of ['spring', 'summer', 'autumn', 'winter']) combos.push({ time, weather, season });
  const snap = (M) => {
    const links = ALL_LINKS(M.WORLD_GEOGRAPHY);
    const out = [];
    for (const id of arr(M.FRAMED_REGIONS)) for (const e of combos) for (const rec of [{ links: [] }, links])
      out.push(id + '|' + JSON.stringify(e) + '|' + rec.links.length + '|' + arr(M.visibleDistant(id, e, rec, { nearGates: rec.links })).map((v) => v.id + ':' + v.alpha).join(','));
    return out.join('\n');
  };
  // とけいを かえた 2 つの ハーネス(new Date() も ずらす)で 1 文字も かわらない
  const A = snap(setup({ clockNow: 1000 }).M);
  const B = snap(setup({ clockNow: 5 * 86400000 + 12345, pinDate: true }).M);
  assert.equal(A, B, 'とけいに よらない');
  assert.ok(A.length > 1000);
  // 同じ ハーネスで 2 かい よんでも おなじ
  const { M } = setup();
  assert.deepEqual(JSON.stringify(arr(M.visibleDistant('home', ENV('day')))), JSON.stringify(arr(M.visibleDistant('home', ENV('day')))));
  // env が なければ ひる・はれ・はる(実時刻では ない)
  assert.equal(JSON.stringify(arr(M.visibleDistant('city', null)).map((v) => [v.id, v.alpha])),
    JSON.stringify(arr(M.visibleDistant('city', ENV('day'))).map((v) => [v.id, v.alpha])));
  const code = codeOnly(phase4d1Block());
  assert.ok(!/Date\.now|new Date|performance\.now|currentEnvironment|Math\.random/.test(code), 'とけい・らんすう を 読まない');
  // こさ は 0〜1
  for (const id of arr(M.FRAMED_REGIONS)) for (const e of combos)
    for (const v of arr(M.visibleDistant(id, e, ALL_LINKS(M.WORLD_GEOGRAPHY), { nearGates: ALL_LINKS(M.WORLD_GEOGRAPHY).links })))
      assert.ok(v.alpha > 0 && v.alpha <= 1, `${v.id} の alpha ${v.alpha}`);
});

test('7. 街の 光は 夜だけ(夕方は うすく)。昼は 出ない', () => {
  const { M } = setup();
  const glowIds = all(M).filter((f) => f.kind === 'city_glow').map((f) => f.id);
  assert.equal(glowIds.length, 5);
  for (const id of arr(M.FRAMED_REGIONS)) {
    const at = (t) => arr(M.visibleDistant(id, ENV(t))).filter((v) => v.feature.kind === 'city_glow');
    assert.equal(at('day').length, 0, id + ' の 昼');
    assert.equal(at('morning').length, 0, id + ' の 朝');
    for (const v of at('night')) assert.equal(v.alpha, 1);
    for (const v of at('evening')) assert.equal(v.alpha, 0.5);
  }
  assert.ok(arr(M.visibleDistant('countryside', ENV('night'))).some((v) => v.id === 'countryside>city'), 'いなか から 夜の 街');
  assert.ok(arr(M.visibleDistant('forest', ENV('night'))).some((v) => v.id === 'forest>>city'), 'もり から 遠くの 夜の 街');
  // 雨の 夜は うすく
  assert.equal(arr(M.visibleDistant('countryside', ENV('night', 'rain'))).find((v) => v.id === 'countryside>city').alpha, 0.6);
});

test('8. しま は うみ から だけ。道を 見つける まで 出ない。夜と 雨も 出ない', () => {
  const { M } = setup();
  const islands = all(M).filter((f) => f.kind === 'island');
  assert.equal(islands.map((f) => f.id).join(','), 'sea>jungle', 'しまかげ は うみ から だけ');
  const f = islands[0];
  assert.equal(obj(f.visibilityRule).requiresLink, 'jungle|sea');
  assert.equal(f.distanceClass, 'far');
  const vis = (rec, e) => arr(M.visibleDistant('sea', e, rec)).some((v) => v.id === 'sea>jungle');
  assert.equal(vis({ links: [] }, ENV('day')), false, '見つける まえは 出ない(ばしょも 名前も もらさない)');
  assert.equal(vis({ links: ['jungle|sea'] }, ENV('day')), true, '見つけた あとは 昼に 出る');
  assert.equal(vis({ links: ['jungle|sea'] }, ENV('night')), false, '夜は 見えない');
  assert.equal(vis({ links: ['jungle|sea'] }, ENV('day', 'rain')), false, '雨は 見えない');
  // 陸の 地域からは いつも 見えない(ぜんぶ 見つけても)
  for (const id of arr(M.FRAMED_REGIONS).filter((x) => x !== 'sea'))
    assert.ok(!arr(M.visibleDistant(id, ENV('day'), ALL_LINKS(M.WORLD_GEOGRAPHY))).some((v) => v.feature.targetRegion === 'jungle'), id + ' から しまは 見えない');
  // しま から 見る 本土は 島の がわ なので 条件なし
  assert.ok(arr(M.visibleDistant('jungle', ENV('day'), { links: [] })).some((v) => v.id === 'jungle>sea'));
});

test('9. ほしぞら は 地上の 遠景では なく 上の 光。見つける まで 出ない', () => {
  const { M } = setup();
  const toStar = all(M).filter((f) => f.targetRegion === 'star_stop');
  assert.equal(toStar.map((f) => f.id).join(','), 'countryside>star_stop', 'ほしぞら が 見えるのは いなか から だけ');
  assert.equal(toStar[0].kind, 'sky_light');
  assert.equal(toStar[0].distanceClass, 'vertical');
  assert.equal(toStar[0].bearingLocal, null, '地平線の 方角を もたない');
  const vis = (rec) => arr(M.visibleDistant('countryside', ENV('night'), rec)).some((v) => v.id === 'countryside>star_stop');
  assert.equal(vis({ links: [] }), false, '見つける まえは そんざいを もらさない');
  assert.equal(vis({ links: ['countryside|star_stop'] }), true);
  // 昼も 見える(上の 光は 時間で かわらない)
  assert.equal(arr(M.visibleDistant('countryside', ENV('day'), { links: ['countryside|star_stop'] })).find((v) => v.id === 'countryside>star_stop').alpha, 1);
  // しんかい: 水面の 下の 方向だけ。見つけて、出口の ちかく だけ
  const deep = all(M).find((f) => f.id === 'sea>deepsea');
  assert.equal(deep.kind, 'deep_dark'); assert.equal(deep.elevationClass, 'below');
  const dv = (rec, near) => arr(M.visibleDistant('sea', ENV('day'), rec, { nearGates: near })).some((v) => v.id === 'sea>deepsea');
  assert.equal(dv({ links: [] }, ['deepsea|sea']), false);
  assert.equal(dv({ links: ['deepsea|sea'] }, []), false, '出口から はなれて いると 出ない');
  assert.equal(dv({ links: ['deepsea|sea'] }, ['deepsea|sea']), true);
});

test('10. 1 画面に 出るのは 3 つ まで(順位で しぼる)', () => {
  const { M } = setup();
  const FOV = 2 * Math.atan(0.5 / 0.95) * 180 / Math.PI;   // renderer の F = 0.95 W
  const links = ALL_LINKS(M.WORLD_GEOGRAPHY);
  let rawMax = 0, cappedMax = 0;
  for (const id of arr(M.FRAMED_REGIONS)) for (const t of ['day', 'night']) {
    const vis = arr(M.visibleDistant(id, ENV(t), links, { nearGates: links.links }));
    for (let y = 0; y < 360; y += 5) {
      rawMax = Math.max(rawMax, arr(M.distantInView(vis, y, FOV, 99)).length);
      const picked = arr(M.distantInView(vis, y, FOV));
      cappedMax = Math.max(cappedMax, picked.length);
      for (let i = 1; i < picked.length; i++) assert.ok(picked[i - 1].feature.priority >= picked[i].feature.priority, '順位の 高い じゅん');
    }
  }
  assert.equal(rawMax, 4, 'しぼらないと さいだい 4(もり の 夜)');
  assert.ok(cappedMax <= 3, 'しぼると 3 まで');
  // 上の 光・下の 暗さ は 方位を もたないので 視野には 数えない
  assert.equal(arr(M.distantInView(arr(M.visibleDistant('deepsea', ENV('day'))), 0, FOV)).length, 0);
});

test('11. 1 どだけ 組み立てて freeze(毎フレーム つくらない)', () => {
  const { M } = setup();
  const a = M.distantRegistry(), b = M.distantRegistry();
  assert.equal(a, b, 'おなじ ものを かえす');
  assert.ok(Object.isFrozen(a));
  for (const id of Object.keys(obj(a))) {
    assert.ok(Object.isFrozen(a[id]), id + ' の 一覧');
    for (const f of arr(a[id])) { assert.ok(Object.isFrozen(f), f.id); assert.ok(Object.isFrozen(f.visibilityRule)); assert.ok(Object.isFrozen(f.lod)); }
  }
  assert.equal(M.distantFeatures('home'), obj(a).home);
  assert.ok(Object.isFrozen(M.DISTANT_RULES) && Object.isFrozen(M.DISTANT_KIND_OF));
});

test('12. mapX / mapY を つかって いない', () => {
  const code = codeOnly(phase4d1Block());
  assert.ok(!/\bmapX\b|\bmapY\b|worldMapShape|worldMapLayout|WMAP_BOUNDS/.test(code), 'Phase 4D-1 の コードに mapX / mapY は ない');
  const snap = (M) => JSON.stringify(all(M));
  const base = snap(setup().M);
  const { M, G } = setup();
  let k = 0;
  for (const id of Object.keys(G.regions)) { G.regions[id].mapX = 91 - (k * 11) % 40; G.regions[id].mapY = -33 + (k * 5) % 20; k++; }
  assert.equal(G.regions.home.mapX, 91, 'ほんとうに かきかわって いる');
  assert.equal(snap(M), base, 'mapX / mapY を かえても 遠景は おなじ');
});

test('13. **消しても うごきが 変わらない**(つかうのは Phase 4D-2 の 遠景 PoC だけ)', () => {
  const block = phase4d1Block();
  // Phase 4D-2(home / sea の 遠景 PoC)は この そうを よむ ただ 1 つの ばしょ。印の ついた ところ ごと 消す
  const rest = strip4d2(SRC.replace(block, ''));
  const INNER = ['DISTANT_CLASS', 'DISTANT_ENV_DEFAULT', 'buildDistantFor', 'distantCache', 'exitBearings', 'specialDestination', 'makeFeature'];
  // (a) しずかな しょうめい: Phase 4D-1 の なまえは ブロックと export の ぎょう いがいに 出て こない
  const exportLine = rest.split('\n').find((l) => l.includes('return { computeMapData,')) || '';
  const outside = rest.replace(exportLine, '');
  for (const n of EXPORTS_4D1.concat(INNER)) {
    const hit = outside.match(new RegExp('\\b' + n + '\\b', 'g')) || [];
    assert.equal(hit.length, 0, `meguru.js の ほかの ところで ${n} を つかって いない`);
  }
  // renderer(Canvas)も simulation も ほかの ファイルも よばない
  for (const f of ['script.js', 'games.js', 'quick.js', 'audio.js', 'world-scene.js', 'world-environment.js']) {
    const src = fs.readFileSync(f, 'utf8');
    for (const n of EXPORTS_4D1) assert.ok(!new RegExp('\\b' + n + '\\b').test(src), `${f} は ${n} を つかって いない`);
  }
  // (b) うごかす しょうめい: 4D-1 を まるごと 消した meguru.js で おなじ 指紋が 出る
  const files = fs.readdirSync('.').filter((f) => f.endsWith('.js'));
  const dirA = fs.mkdtempSync(path.join(os.tmpdir(), 'meguru4d1-a-'));
  const dirB = fs.mkdtempSync(path.join(os.tmpdir(), 'meguru4d1-b-'));
  const plant = (d) => {
    fs.mkdirSync(path.join(d, 'tests', 'helpers'), { recursive: true });
    for (const f of files) if (fs.existsSync(f)) fs.copyFileSync(f, path.join(d, f));
    fs.copyFileSync('tests/helpers/runtime-harness.cjs', path.join(d, 'tests/helpers/runtime-harness.cjs'));
  };
  try {
    plant(dirA); plant(dirB);
    const stripped = rest.replace(' ' + EXPORTS_4D1.join(', ') + ',', '')
      // Phase 4E-1(あるける corridor の かたち)も おなじ ブロックの なかに のる「まだ だれも つかって いない」そう なので、export も いっしょに けす
      .replace(/ CORRIDOR_STAGE_WALK,[^\n]*? corridorExitPose,/, '');
    assert.ok(!/distantRegistry|visibleDistant|distantInView|DISTANT_RULES|setDistant/.test(stripped), 'けしのこしが ない');
    assert.ok(/worldCorridors/.test(stripped) && /REGION_FRAME/.test(stripped), 'Phase 4B / 4C は のこって いる');
    fs.writeFileSync(path.join(dirB, 'meguru.js'), stripped);
    const probe = `
      const { harness } = require('./tests/helpers/runtime-harness.cjs');
      const h = harness({ fullDisplay: true }), M = h.api.meguruMod;
      M.setRandom(((s) => () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648)(4747));
      const out = [];
      let sp = 0, pa = 0, zo = 0, se = 0;
      for (const id of Object.keys(M.WORLDS)) { const w = M.WORLDS[id];
        sp += w.spots.length; pa += w.paths.length; zo += w.zones.length;
        se += w.spots.filter((x) => x.secret).length + w.paths.filter((x) => x[2] === 'secret').length; }
      out.push('counts ' + [sp, pa, zo, se].join('/'));
      const C = M.worldCountable();
      out.push('countable ' + C.regions.length + '/' + C.links.length + '/' + C.tier1 + '/' + C.zones);
      out.push('frame ' + JSON.stringify(M.REGION_FRAME));
      out.push('corridors ' + JSON.stringify(M.worldCorridors()));
      for (const id of M.NORMAL_REGIONS.concat(['star_stop', 'memory_lake'])) {
        const w = M.buildWorld(id, M.buildRegistry());
        out.push(id + ' w ' + [w.spots.length, w.paths.length, w.zones.length, w.segments.length,
          (w.obstacles || []).length, (w.props || []).length, w.len, w.halfW, w.minX, w.maxX, w.backdrop].join('/'));
        out.push(id + ' gates ' + M.regionGates(id, w).map((g) => g.id + '@' + g.spot.id + ':' + g.out + ':' + g.way).join(' '));
      }
      for (const id of ['home', 'sea', 'mountain', 'city']) {
        const sim = M.createSimulation({ regionId: id });
        for (let i = 0; i < 300; i++) sim.step(1 / 30, { x: Math.sin(i / 7), y: Math.cos(i / 5) });
        const p = sim.player, v = sim.view();
        out.push(id + ' walk ' + p.x.toFixed(4) + ',' + p.z.toFixed(4) + ',' + p.heading.toFixed(4)
          + ' found ' + sim.discovered.size + ' zones ' + sim.visitedZones.size + ' view ' + Object.keys(v).sort().join(','));
      }
      const wd = M.worldMapData({ regions: C.regions, links: C.links, marks: [], zones: [] });
      out.push('map ' + wd.regions.length + '/' + wd.links.length + '/' + wd.progress.percent);
      console.log(out.join('\\n'));
    `;
    fs.writeFileSync(path.join(dirA, 'probe.cjs'), probe);
    fs.writeFileSync(path.join(dirB, 'probe.cjs'), probe);
    const withD = execFileSync(process.execPath, ['probe.cjs'], { encoding: 'utf8', cwd: dirA });
    const without = execFileSync(process.execPath, ['probe.cjs'], { encoding: 'utf8', cwd: dirB });
    assert.ok(withD.length > 500, '指紋が とれて いる');
    assert.ok(/distantRegistry/.test(fs.readFileSync(path.join(dirA, 'meguru.js'), 'utf8')), 'A がわには Phase 4D-1 が ある');
    assert.equal(without, withD, 'Phase 4D-1 を 消しても ゲームの うごきは 1 つも 変わらない');
  } finally {
    fs.rmSync(dirA, { recursive: true, force: true });
    fs.rmSync(dirB, { recursive: true, force: true });
  }
});

test('14. 分母・spot・たび・セーブ・世界地図・corridor は 1 つも 動いて いない', () => {
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
  assert.equal(arr(M.worldCorridors()).length, 13);
  assert.equal(arr(M.corridorGraph().nodes).length, 12);
  // 遠景を 組み立てても frame / corridor は かわらない
  const before = JSON.stringify([M.REGION_FRAME, M.worldCorridors()]);
  M.distantRegistry(); M.visibleDistant('sea', ENV('night'), ALL_LINKS(G));
  assert.equal(JSON.stringify([M.REGION_FRAME, M.worldCorridors()]), before);
  // たび は 無変更
  const s = h.api.state();
  for (const id of ['jungle', 'deepsea', 'star_stop', 'sea', 'home']) {
    const r = h.api.REGIONS.find((x) => x.id === id);
    if (!r) continue;
    h.api.travelToRegion(r, { id });
    assert.equal(s.regionId, id, id + ' へ たびで 行ける');
  }
  // セーブに 遠景の あとかたは ない
  const json = JSON.stringify(s.lifetime.meguru || {});
  assert.ok(!/distant|visib|silhouette|corridor|global/i.test(json), 'セーブに 遠景の あとかたも ない: ' + json.slice(0, 200));
  // sim.view() に 遠景は まだ のって いない(renderer は つかって いない)
  const sim = M.createSimulation({ regionId: 'sea' });
  assert.ok(!('distant' in sim.view()), 'view に distant は まだ ない');
});
