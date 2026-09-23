// Phase 4C — corridor(地域と 地域の あいだの みち)と global graph の 基盤
// (docs/handoff/meguru-phase4c-corridor-2026-09-23.md)
//
// Phase 4C の 完了条件は **「REGION_FRAME から みちびいた、まだ だれにも つかわれて いない データ」** で ある こと。
// ここで しばるのは
//   ・corridor は connection / gate から **みちびく もの**(手で うつした かずを もたない)
//   ・walk と special(ふね / もぐる / ゴンドラ)の わけかた、りょうはし、方角、段、ながさ
//   ・のぼりと くだり、いきと かえりの つじつま
//   ・graph が 12 地域 ひとつながり、きおくのみずうみ は そと
//   ・方角に mapX / mapY も chart の 中心も つかわない
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

function setup() {
  const h = harness({ fullDisplay: true });
  const M = h.api.meguruMod;
  return { h, M, G: M.WORLD_GEOGRAPHY, W: M.WORLDS };
}
const spotOf = (W, rid, sid) => (W[rid].spots || []).find((q) => q.id === sid);
const corridors = (M) => arr(M.worldCorridors());
const byId = (M, id) => corridors(M).find((c) => c.id === id);
const heading = (d) => ((Math.atan2(d.x, d.z) * 180 / Math.PI) + 360) % 360;
const angDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

const SRC = fs.readFileSync('meguru.js', 'utf8');
// Phase 4D-2(遠景 PoC)は 印の ついた ブロックと 行だけ。消す ときは いっしょに 消す
const strip4d2 = (src) => src.replace(/^[ \t]*\/\/ ====== Phase 4D-2:[\s\S]*?\/\/ ====== \/Phase 4D-2 ======\n/gm, '')
  .split('\n').filter((l) => !/\/\/ Phase 4D-2$/.test(l)).join('\n');
// Phase 4C で 足した ぶんだけを 切りだす
function phase4cBlock() {
  const a = SRC.indexOf('// ====== Phase 4C:');
  const b = SRC.indexOf('// 世界地図に 出す 地域', a);
  assert.ok(a > 0 && b > a, 'Phase 4C の ブロックが 見つかる');
  // 行の あたまの 空白から 切る(のこりが きれいに なる)
  return SRC.slice(SRC.lastIndexOf('\n', a) + 1, SRC.lastIndexOf('\n', b) + 1);
}
const codeOnly = (src) => src.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const EXPORTS_4C = ['CORRIDOR_STAGE_LEN', 'CORRIDOR_WAY_FACTOR', 'worldCorridors', 'orientCorridor', 'corridorsFrom',
  'corridorDirection', 'corridorGraph', 'findRegionRoute', 'compassLabel'];

test('1. corridor は 13 本 = gate を もつ connection ぜんぶ。きおくのみずうみ は 入らない', () => {
  const { M, G } = setup();
  const C = corridors(M);
  const gated = G.connections.filter((c) => c.b && c.gate);
  assert.equal(C.length, 13, 'corridor は 13 本');
  assert.equal(C.map((c) => c.id).sort().join(','), gated.map((c) => c.id).sort().join(','),
    'corridor の id は gate を もつ connection の id と 1 対 1');
  assert.equal(new Set(C.map((c) => c.id)).size, 13, 'id は かぶらない');
  for (const c of C) {
    const src = G.connections.find((x) => x.id === c.id);
    assert.equal(c.a, src.a, c.id + ' の a は 正本の まま'); assert.equal(c.b, src.b, c.id + ' の b は 正本の まま');
    assert.ok(c.a !== 'memory_lake' && c.b !== 'memory_lake', 'きおくのみずうみ に つながる corridor は ない');
  }
  // きおくのみずうみ の connection は のこって いる(正本は けして いない)が、corridor には ならない
  const mem = G.connections.filter((c) => c.a === 'memory_lake' || c.b === 'memory_lake');
  assert.ok(mem.length >= 1, 'きおくのみずうみ の connection は 正本に ある');
  for (const c of mem) assert.ok(!C.some((x) => x.id === c.id), c.id + ' は corridor に ならない');
});

test('2. walk / sea / vertical の わけかた と のりもの は 正本の gate / ride から', () => {
  const { M, G } = setup();
  const C = corridors(M);
  const kinds = {};
  for (const c of C) (kinds[c.kind] || (kinds[c.kind] = [])).push(c.id);
  assert.equal((kinds.walk || []).length, 10, 'あるく corridor は 10 本');
  assert.equal((kinds.sea || []).join(','), 'jungle|sea', 'ふねは 1 本');
  assert.equal((kinds.vertical || []).sort().join(','), 'countryside|star_stop,deepsea|sea', 'たては 2 本');
  for (const c of C) {
    const g = G.connections.find((x) => x.id === c.id).gate;
    assert.equal(c.kind, g.kind === 'walk' ? 'walk' : g.kind === 'sea' ? 'sea' : 'vertical', c.id + ' の kind は gate.kind から');
  }
  // のりもの(正本の ride を そのまま)
  assert.equal(byId(M, 'jungle|sea').ride.id, 'shimawatari-boat');
  assert.equal(byId(M, 'countryside|star_stop').ride.id, 'hoshizora-gondola');
  assert.equal(byId(M, 'deepsea|sea').ride, null, 'もぐるのは のりもの なし');
  for (const c of C.filter((x) => x.kind === 'walk')) assert.equal(c.ride, null, c.id + ' は のりもの なし');
});

test('3. こえかた(way)は むきごと。regionGates() と 1 本も ずれない', () => {
  const { M } = setup();
  const reg = M.buildRegistry();
  let n = 0;
  for (const c of corridors(M)) {
    for (const from of [c.a, c.b]) {
      const o = M.orientCorridor(c, from);
      const w = M.buildWorld(from, reg);
      const g = arr(M.regionGates(from, w)).find((x) => x.id === c.id);
      assert.ok(g, `${from} に ${c.id} の gate が ある`);
      assert.equal(o.way, g.way, `${c.id} を ${from} から こえる way は regionGates と おなじ(${g.way})`);
      assert.equal(o.to, g.to, `${c.id} の いきさき`);
      assert.equal(o.fromSpot, g.spot.id, `${c.id} の 出口 spot は gate の spot`);
      assert.equal(o.toSpot, g.at, `${c.id} の 着く spot は gate の at`);
      // その way の transition が ある(approach / cross / arrive / settle)
      const spec = obj(obj(M.TRANSITION.ways)[o.way]);
      for (const ph of ['approach', 'cross', 'arrive', 'settle']) assert.ok(obj(spec.span)[ph] > 0, `${o.way}.${ph}`);
      n++;
    }
  }
  assert.equal(n, 26, '13 本 × 2 むき');
  // たては むきで かわる
  assert.equal(M.orientCorridor(byId(M, 'deepsea|sea'), 'sea').way, 'down');
  assert.equal(M.orientCorridor(byId(M, 'deepsea|sea'), 'deepsea').way, 'up');
  assert.equal(M.orientCorridor(byId(M, 'countryside|star_stop'), 'countryside').way, 'up');
  assert.equal(M.orientCorridor(byId(M, 'countryside|star_stop'), 'star_stop').way, 'down');
});

test('4. りょうはしは gate の 出口 spot を toGlobal した もの。ぜんぶ 有限', () => {
  const { M, G, W } = setup();
  for (const c of corridors(M)) {
    const g = G.connections.find((x) => x.id === c.id).gate;
    for (const r of [c.a, c.b]) {
      const e = obj(c.ends[r]);
      assert.equal(e.spot, g.ends[r].spot, `${c.id}.${r} の spot は gate.ends の spot`);
      const want = M.toGlobal(r, spotOf(W, r, e.spot));
      for (const k of ['x', 'y', 'z']) {
        assert.ok(Number.isFinite(e.at[k]), `${c.id}.${r}.${k} は 有限`);
        assert.equal(e.at[k], want[k], `${c.id}.${r}.${k} は toGlobal と おなじ`);
      }
      assert.equal(e.layer, obj(M.regionFrame(r)).layer);
    }
    assert.ok(Number.isFinite(c.physicalGap), c.id + ' の physicalGap');
    assert.ok(Number.isFinite(c.heightDelta), c.id + ' の heightDelta');
    const A = c.ends[c.a].at, B = c.ends[c.b].at;
    assert.ok(Math.abs(c.physicalGap - Math.hypot(B.x - A.x, B.z - A.z)) < 1e-9, c.id + ' の gap は 両はしの X/Z の はなれ');
  }
  // 見つけかた(mouths)と 出口(gate の spot)が ちがう ただ 1 本: ゴンドラは とりい で 見つけ、のりば から 出る
  const cs = byId(M, 'countryside|star_stop');
  assert.equal(cs.ends.countryside.mouth, 'torii');
  assert.equal(cs.ends.countryside.spot, 'skyland', '出口は のりば(gate の spot)');
});

test('5. physicalGap と travelLength は べつもの。special は gap を しばらない', () => {
  const { M } = setup();
  assert.equal(M.CORRIDOR_STAGE_LEN, 1600);
  for (const c of corridors(M)) {
    assert.equal(c.travelLength, c.travelStages * M.CORRIDOR_STAGE_LEN, c.id + ' の travelLength = 段 × 1600');
    assert.equal(c.travelStages, arr(c.stages).length);
    assert.ok(c.travelStages >= 5, c.id + ' は 5 段 いじょう');
  }
  // walk: gap は closure の のこり(ちいさい)、みちの ながさ(travelLength)は ずっと ながい
  for (const c of corridors(M).filter((x) => x.kind === 'walk')) {
    assert.equal(c.gapKind, 'closure');
    assert.ok(c.physicalGap < 150, `${c.id} の closure は ちいさい(${c.physicalGap.toFixed(1)})`);
    assert.ok(c.travelLength > c.physicalGap * 50, `${c.id} の みちの ながさは gap では ない`);
    assert.equal(c.heightDelta, 0, c.id + ' は おなじ 高さ');
  }
  // ふね: 外洋を ほんとうに わたる。**はなれて いる のが 正しい**(しばらない)
  const sea = byId(M, 'jungle|sea');
  assert.equal(sea.gapKind, 'crossing');
  assert.ok(sea.physicalGap > 7000 && sea.physicalGap < 9000, 'しままで 約 8000: ' + Math.round(sea.physicalGap));
  assert.equal(sea.heightDelta, 0);
  // もぐる: X/Z は ほぼ おなじ で 1600 した
  const dive = byId(M, 'deepsea|sea');
  assert.equal(dive.gapKind, 'drift');
  assert.ok(dive.physicalGap < 100, 'もぐるのは たて: ' + dive.physicalGap.toFixed(1));
  assert.equal(M.orientCorridor(dive, 'sea').heightDelta, -1600, 'うみ → しんかい は 1600 した');
  assert.equal(M.orientCorridor(dive, 'deepsea').heightDelta, 1600);
  // ゴンドラ: 4800 うえ。よこにも ながれる(しばらない)
  const gon = byId(M, 'countryside|star_stop');
  assert.equal(gon.gapKind, 'drift');
  assert.equal(M.orientCorridor(gon, 'countryside').heightDelta, 4800, 'いなか → ほしぞら は 4800 うえ');
  assert.ok(Number.isFinite(gon.physicalGap));
});

test('6. 段(terrain)は 正本の gate land / stages / transition を そのまま つかう。手で うつして いない', () => {
  const { M, G } = setup();
  const code = codeOnly(phase4cBlock());
  for (const c of corridors(M)) {
    const src = G.connections.find((x) => x.id === c.id);
    for (const from of [c.a, c.b]) {
      const o = M.orientCorridor(c, from);
      const land = arr(src.gate.ends[from].land);
      if (c.kind === 'walk') {
        assert.equal(arr(o.terrain).join('/'), land.join('/'), `${c.id} を ${from} から: terrain は from がわの land`);
        assert.ok(arr(o.stages).every((st) => st.move === 'walk'));
      } else if (land.length) {
        assert.equal(arr(o.terrain).join('/'), land.join('/'), `${c.id}: けしきは gate の land(ふね)`);
      }
      // land の ことばは 1 つも コードに かかれて いない(正本から よむ だけ)
      for (const w of land) assert.ok(!code.includes("'" + w + "'"), `「${w}」を 手で うつして いない`);
    }
  }
  // ふね / ゴンドラ は 正本の stages。origin(うみ / いなか)から ならぶ
  const sea = byId(M, 'jungle|sea'), seaSrc = G.connections.find((x) => x.id === 'jungle|sea').sea.stages;
  assert.equal(sea.origin, 'sea');
  assert.equal(arr(M.orientCorridor(sea, 'sea').stages).map((s) => s.id).join(','), arr(seaSrc).map((s) => s.id).join(','));
  assert.equal(arr(M.orientCorridor(sea, 'jungle').stages).map((s) => s.id).join(','), arr(seaSrc).map((s) => s.id).reverse().join(','));
  assert.ok(arr(M.orientCorridor(sea, 'sea').stages).some((s) => s.move === 'boat'), 'ふねの 段が ある');
  const gon = byId(M, 'countryside|star_stop'), gonSrc = G.connections.find((x) => x.id === 'countryside|star_stop').vertical.stages;
  assert.equal(gon.origin, 'countryside');
  assert.equal(arr(M.orientCorridor(gon, 'countryside').stages).map((s) => s.move).join(','), arr(gonSrc).map((s) => s.move).join(','));
  // もぐる は transition の ことば。うみ から ならび、しんかい から だと うかぶ
  const dive = byId(M, 'deepsea|sea'), words = arr(G.connections.find((x) => x.id === 'deepsea|sea').transition);
  assert.equal(dive.origin, 'sea');
  const down = M.orientCorridor(dive, 'sea'), up = M.orientCorridor(dive, 'deepsea');
  assert.equal(arr(down.terrain).join('/'), words.join('/'));
  assert.ok(arr(down.stages).every((s) => s.move === 'dive'));
  assert.equal(arr(up.terrain).join('/'), words.slice().reverse().join('/'));
  assert.ok(arr(up.stages).every((s) => s.move === 'rise'));
});

test('7. 方角は gate を 出る むき(leave)を global に うつした もの。8 方位', () => {
  const { M, G } = setup();
  const K = ['きた', 'きたひがし', 'ひがし', 'みなみひがし', 'みなみ', 'みなみにし', 'にし', 'きたにし'];
  for (const c of corridors(M)) {
    const src = G.connections.find((x) => x.id === c.id).gate;
    for (const from of [c.a, c.b]) {
      const o = M.orientCorridor(c, from), d = M.corridorDirection(c.id, from);
      assert.equal(d.to, o.to);
      if (c.kind === 'walk') {
        // 正本の gate の 出口の むき(bearing、なければ 口 = −z / 奥 = +z)を じぶんで global に して くらべる
        const e = src.ends[from];
        const local = e.bearing ? { x: e.bearing.x, z: e.bearing.z } : { x: 0, z: e.dir === 'far' ? 1 : -1 };
        const want = heading(M.dirToGlobal(from, local));
        assert.ok(angDiff(o.heading, want) < 1e-6, `${c.id} を ${from} から: heading ${o.heading} ≒ ${want}`);
        assert.equal(d.label, K[Math.round(want / 45) % 8], `${c.id} を ${from} から の ことば`);
        assert.equal(d.vertical, null);
        // 入る むき は 着いた がわの 出口の はんたい
        const T = M.orientCorridor(c, o.to);
        assert.ok(Math.abs(o.enter.x + T.leave.x) < 1e-12 && Math.abs(o.enter.z + T.leave.z) < 1e-12);
        assert.ok(Number.isFinite(c.bend) && c.bend >= 0 && c.bend <= 180, c.id + ' の bend');
      } else if (c.kind === 'sea') {
        // ふねは ほんとうに 外洋を わたる ので、りょうはしの むき
        const want = heading({ x: o.globalTo.x - o.globalFrom.x, z: o.globalTo.z - o.globalFrom.z });
        assert.ok(angDiff(o.heading, want) < 1e-6);
        assert.ok(K.includes(d.label));
      } else {
        assert.equal(o.heading, null, 'たては 方位を もたない');
        assert.equal(d.label, o.heightDelta > 0 ? 'うえ' : 'した');
      }
    }
  }
  // しま は うみ から 見て みなみにし(正本の ことば「みなみにしの がいよう」と あう)
  assert.equal(M.corridorDirection('jungle|sea', 'sea').label, 'みなみにし');
  assert.equal(M.corridorDirection('jungle|sea', 'jungle').label, 'きたひがし');
  assert.equal(M.corridorDirection('deepsea|sea', 'sea').label, 'した');
  assert.equal(M.corridorDirection('countryside|star_stop', 'countryside').label, 'うえ');
  // しらない もの
  assert.equal(M.corridorDirection('nowhere', 'home'), null);
  assert.equal(M.corridorDirection('home|forest', 'city'), null, 'その みちの はしで ない 地域から は null');
});

test('8. compassLabel: 8 方位の さかいめ', () => {
  const { M } = setup();
  const k = (d) => (M.compassLabel(d) || {}).kana;
  assert.equal(k(0), 'きた'); assert.equal(k(360), 'きた'); assert.equal(k(-10), 'きた'); assert.equal(k(22.4), 'きた');
  assert.equal(k(22.6), 'きたひがし'); assert.equal(k(45), 'きたひがし'); assert.equal(k(90), 'ひがし');
  assert.equal(k(135), 'みなみひがし'); assert.equal(k(180), 'みなみ'); assert.equal(k(225), 'みなみにし');
  assert.equal(k(-90), 'にし'); assert.equal(k(270), 'にし'); assert.equal(k(315), 'きたにし'); assert.equal(k(337.4), 'きたにし');
  assert.equal(k(337.6), 'きた');
  assert.equal(M.compassLabel(90).kanji, '東');
  assert.equal(M.compassLabel(NaN), null); assert.equal(M.compassLabel(null), null);
});

test('9. 方角に mapX / mapY も chart の 中心も つかって いない', () => {
  // (a) コードに でて こない
  const code = codeOnly(phase4cBlock());
  assert.ok(!/\bmapX\b|\bmapY\b/.test(code), 'Phase 4C の コードに mapX / mapY は 出て こない');
  assert.ok(!/worldMapShape|worldMapLayout|GEO_UNIT|GEO_AREA|WMAP_BOUNDS/.test(code), '世界地図の しくみも つかわない');
  // (b) mapX / mapY を でたらめに かえても corridor は 1 つも かわらない(corridor は はじめて よんだ ときに つくる)
  const snap = (M) => JSON.stringify(corridors(M).map((c) => [c.id, c.physicalGap, c.costs,
    [c.a, c.b].map((r) => M.corridorDirection(c.id, r).label)]));
  const base = snap(setup().M);
  const { M, G } = setup();
  let k = 0;
  for (const id of Object.keys(G.regions)) { G.regions[id].mapX = 97 - (k * 13) % 50; G.regions[id].mapY = -41 + (k * 7) % 30; k++; }
  assert.equal(G.regions.home.mapX, 97, 'ほんとうに かきかわって いる');
  assert.equal(snap(M), base, 'mapX / mapY を かえても corridor と 方角は おなじ');
});

test('10. いき と かえり の つじつま', () => {
  const { M } = setup();
  for (const c of corridors(M)) {
    const f = M.orientCorridor(c, c.a), r = M.orientCorridor(c, c.b);
    assert.equal(f.from, r.to); assert.equal(f.to, r.from);
    assert.deepEqual(obj(f.globalFrom), obj(r.globalTo)); assert.deepEqual(obj(f.globalTo), obj(r.globalFrom));
    assert.equal(f.fromSpot, r.toSpot); assert.equal(f.toSpot, r.fromSpot);
    assert.equal(f.physicalGap, r.physicalGap);
    assert.equal(f.heightDelta, -r.heightDelta || 0);
    assert.equal(f.travelLength, r.travelLength); assert.equal(f.travelStages, r.travelStages);
    assert.equal(arr(f.stages).length, arr(r.stages).length);
    if (c.kind !== 'walk') {
      assert.equal(arr(f.stages).map((s) => s.label).join('/'), arr(r.stages).map((s) => s.label).reverse().join('/'),
        c.id + ' の 段は かえりは さかさ');
    }
    // ほねおり: ひらたい みちは おなじ、のぼりは くだりより おもい
    if (c.kind === 'vertical') {
      const upCost = f.way === 'up' ? f.cost : r.cost, downCost = f.way === 'up' ? r.cost : f.cost;
      assert.ok(upCost > downCost, c.id + ' は のぼりの ほうが ほねがおれる');
    } else assert.equal(f.cost, r.cost);
  }
  // こえかたの おもみは TRANSITION の span から(じぶんで 足さない)
  const T = M.TRANSITION.ways, sum = (w) => ['approach', 'cross', 'arrive', 'settle'].reduce((n, k) => n + T[w].span[k], 0);
  const F = obj(M.CORRIDOR_WAY_FACTOR);
  assert.equal(F.walk, 1);
  for (const w of ['up', 'down', 'sail']) assert.ok(Math.abs(F[w] - sum(w) / sum('walk')) < 1e-12, w + ' の おもみ');
  assert.ok(Object.isFrozen(M.CORRIDOR_WAY_FACTOR));
});

test('11. graph は 12 地域 ひとつながり。きおくのみずうみ は そと。逆引きは ない', () => {
  const { M } = setup();
  const g = M.corridorGraph();
  const nodes = arr(g.nodes), edges = arr(g.edges);
  assert.equal(nodes.length, 12, 'node は 12(frame を もつ 地域)');
  assert.equal(edges.length, 13, 'edge は 13(corridor)');
  assert.ok(!nodes.some((n) => n.id === 'memory_lake'));
  assert.equal(nodes.find((n) => n.id === 'star_stop').layer, 'sky');
  assert.equal(nodes.find((n) => n.id === 'deepsea').layer, 'below');
  assert.equal(nodes.filter((n) => n.layer === 'ground').length, 10);
  // ひとつながり
  const seen = new Set(['home']), q = ['home'];
  while (q.length) {
    const cur = q.shift();
    for (const e of edges) {
      const nx = e.a === cur ? e.b : e.b === cur ? e.a : null;
      if (nx && !seen.has(nx)) { seen.add(nx); q.push(nx); }
    }
  }
  assert.equal(seen.size, 12, 'おうち から 12 地域 ぜんぶへ とどく');
  for (const e of edges) for (const r of [e.a, e.b]) assert.ok(Number.isFinite(obj(e.costs)[r]) && obj(e.costs)[r] > 0);
  // きおくのみずうみ は たびの そと
  assert.equal(M.findRegionRoute('home', 'memory_lake'), null);
  assert.equal(M.findRegionRoute('memory_lake', 'home'), null);
  assert.equal(arr(M.corridorsFrom('memory_lake')).length, 0);
  assert.equal(M.findRegionRoute('home', 'nowhere'), null);
  // global → region の 逆引きは 作らない
  for (const k of Object.keys(obj(M))) {
    assert.ok(!/^(regionAt|regionOf|findRegionAtGlobal|globalToRegion|whichRegion|corridorAt|nearestCorridor)$/.test(k),
      '逆引きの かんすうを はやして いない: ' + k);
  }
  // corridorsFrom は その 地域の gate の かず と おなじ
  const reg = M.buildRegistry();
  for (const n of nodes) {
    const gates = arr(M.regionGates(n.id, M.buildWorld(n.id, reg)));
    assert.equal(arr(M.corridorsFrom(n.id)).length, gates.length, n.id + ' から 出る corridor = gate');
  }
});

test('12. findRegionRoute: だいひょうの みち', () => {
  const { M } = setup();
  const route = (a, b, o) => { const r = M.findRegionRoute(a, b, o); return r && Object.assign({}, r, { regions: arr(r.regions), legs: arr(r.legs) }); };
  const check = (r) => {
    assert.equal(r.regions.length, r.legs.length + 1);
    r.legs.forEach((l, i) => { assert.equal(l.from, r.regions[i]); assert.equal(l.to, r.regions[i + 1]); });
    assert.ok(Math.abs(r.cost - r.legs.reduce((n, l) => n + l.cost, 0)) < 1e-9, 'cost は 足しざん');
    assert.equal(r.travelLength, r.legs.reduce((n, l) => n + l.travelLength, 0));
  };
  // おうち → ジャングル: みなとから ふねで わたる
  const hj = route('home', 'jungle'); check(hj);
  assert.equal(hj.regions.slice(-2).join('>'), 'sea>jungle');
  assert.equal(hj.legs[hj.legs.length - 1].way, 'sail');
  assert.equal(hj.walkOnly, false);
  assert.equal(route('home', 'jungle', { special: false }), null, 'しまへは あるいて いけない');
  // ゆき → うみ: あるいて いける
  const ss = route('snow', 'sea'); check(ss);
  assert.equal(ss.walkOnly, true);
  assert.equal(ss.regions.join('>'), 'snow>mountain>desert>city>sea');
  // さばく → しんかい: さいごに もぐる
  const dd = route('desert', 'deepsea'); check(dd);
  assert.equal(dd.regions.join('>'), 'desert>city>sea>deepsea');
  assert.equal(dd.legs[dd.legs.length - 1].way, 'down');
  // おうち → ほしぞら: さいごに ゴンドラで のぼる
  const hs = route('home', 'star_stop'); check(hs);
  assert.equal(hs.regions.slice(-2).join('>'), 'countryside>star_stop');
  assert.equal(hs.legs[hs.legs.length - 1].way, 'up');
  assert.equal(hs.legs[hs.legs.length - 1].ride.id, 'hoshizora-gondola');
  // かえりは くだり(おなじ みち、ほねおりは かるい)
  const sh = route('star_stop', 'home'); check(sh);
  assert.equal(sh.regions.join('>'), hs.regions.slice().reverse().join('>'));
  assert.ok(sh.cost < hs.cost, 'くだりの ほうが かるい');
  // おなじ 地域
  const same = route('city', 'city');
  assert.equal(same.cost, 0); assert.equal(same.legs.length, 0);
  // ぜんぶの くみあわせで とどく(12 × 11)
  const ids = arr(M.corridorGraph().nodes).map((n) => n.id);
  for (const a of ids) for (const b of ids) if (a !== b) check(route(a, b));
});

test('13. はじめて よんだ ときに 1 どだけ つくる(毎フレーム つくらない)', () => {
  const { M } = setup();
  const a = M.worldCorridors(), b = M.worldCorridors();
  assert.equal(a, b, 'おなじ ものを かえす(つくりなおさない)');
  assert.ok(Object.isFrozen(a), 'かきかえられない');
  for (const c of corridors(M)) assert.ok(Object.isFrozen(c), c.id + ' も かきかえられない');
  // orientCorridor の 段を いじっても もとは かわらない
  const o = M.orientCorridor(byId(M, 'jungle|sea'), 'sea');
  o.stages[0].label = 'x';
  assert.notEqual(byId(M, 'jungle|sea').stages[0].label, 'x');
  // あるく しくみ(simulation / renderer)の なかでは よばれない
  const at = SRC.indexOf('function createSimulation(');
  assert.ok(at > 0);
  const sim = SRC.slice(at, SRC.indexOf('\n    function ', at + 30));
  for (const n of EXPORTS_4C) assert.ok(!new RegExp('\\b' + n + '\\b').test(sim), 'simulation で ' + n + ' を つかわない');
});

test('14. **消しても うごきが 変わらない**(まだ だれにも つかわれて いない)', () => {
  const block = phase4cBlock();
  const rest = SRC.replace(block, '');
  const INNER = ['buildCorridor', 'orientCorridor', 'corridorCache', 'corridorOutward', 'COMPASS8'];
  // (a) しずかな しょうめい: Phase 4C の なまえは ブロックと export の ぎょう いがいに 出て こない
  const exportLine = rest.split('\n').find((l) => l.includes('return { computeMapData,')) || '';
  const outside = rest.replace(exportLine, '');
  for (const n of EXPORTS_4C.concat(INNER)) {
    const hit = outside.match(new RegExp('\\b' + n + '\\b', 'g')) || [];
    assert.equal(hit.length, 0, `meguru.js の ほかの ところで ${n} を つかって いない`);
  }
  for (const f of ['script.js', 'games.js', 'quick.js', 'audio.js']) {
    const src = fs.readFileSync(f, 'utf8');
    for (const n of EXPORTS_4C) assert.ok(!new RegExp('\\b' + n + '\\b').test(src), `${f} は ${n} を つかって いない`);
  }
  // (b) うごかす しょうめい: Phase 4C を まるごと 消した meguru.js で おなじ 指紋が 出る。
  // リポジトリの なかには 1 つも 書かない
  const files = fs.readdirSync('.').filter((f) => f.endsWith('.js'));
  const dirA = fs.mkdtempSync(path.join(os.tmpdir(), 'meguru4c-a-'));
  const dirB = fs.mkdtempSync(path.join(os.tmpdir(), 'meguru4c-b-'));
  const plant = (d) => {
    fs.mkdirSync(path.join(d, 'tests', 'helpers'), { recursive: true });
    for (const f of files) if (fs.existsSync(f)) fs.copyFileSync(f, path.join(d, f));
    fs.copyFileSync('tests/helpers/runtime-harness.cjs', path.join(d, 'tests/helpers/runtime-harness.cjs'));
  };
  try {
    plant(dirA); plant(dirB);
    // Phase 4D-1(遠景の いみデータ)と 4E-1(あるける corridor の かたち)は 4C の すぐ うしろ(おなじ ブロックの なか)に のる
    // 「まだ だれも つかって いない」 そう なので、export も いっしょに けす
    const stripped = strip4d2(rest).replace(' ' + EXPORTS_4C.join(', ') + ',', '')
      .replace(/ DISTANT_KIND_OF,[^\n]*? visibleDistant,/, '').replace(/ CORRIDOR_STAGE_WALK,[^\n]*? corridorExitPose,/, '');
    assert.ok(!/worldCorridors|findRegionRoute|CORRIDOR_STAGE_LEN|distantRegistry|visibleDistant|distantInView/.test(stripped), 'けしのこしが ない');
    assert.ok(/REGION_FRAME/.test(stripped), 'Phase 4B は のこって いる');
    fs.writeFileSync(path.join(dirB, 'meguru.js'), stripped);
    const probe = `
      const { harness } = require('./tests/helpers/runtime-harness.cjs');
      const h = harness({ fullDisplay: true }), M = h.api.meguruMod;
      M.setRandom(((s) => () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648)(4343));
      const out = [];
      let sp = 0, pa = 0, zo = 0, se = 0;
      for (const id of Object.keys(M.WORLDS)) { const w = M.WORLDS[id];
        sp += w.spots.length; pa += w.paths.length; zo += w.zones.length;
        se += w.spots.filter((x) => x.secret).length + w.paths.filter((x) => x[2] === 'secret').length; }
      out.push('counts ' + [sp, pa, zo, se].join('/'));
      const C = M.worldCountable();
      out.push('countable ' + C.regions.length + '/' + C.links.length + '/' + C.tier1 + '/' + C.zones);
      out.push('frame ' + JSON.stringify(M.REGION_FRAME));
      for (const id of M.NORMAL_REGIONS.concat(['star_stop', 'memory_lake'])) {
        const w = M.buildWorld(id, M.buildRegistry());
        out.push(id + ' w ' + [w.spots.length, w.paths.length, w.zones.length, w.segments.length,
          (w.obstacles || []).length, (w.props || []).length, w.len, w.halfW, w.minX, w.maxX].join('/'));
        out.push(id + ' gates ' + M.regionGates(id, w).map((g) => g.id + '@' + g.spot.id + ':' + g.out + ':' + g.way).join(' '));
      }
      for (const id of ['mountain', 'sea', 'city']) {
        const sim = M.createSimulation({ regionId: id });
        for (let i = 0; i < 300; i++) sim.step(1 / 30, { x: Math.sin(i / 7), y: Math.cos(i / 5) });
        const p = sim.player;
        out.push(id + ' walk ' + p.x.toFixed(4) + ',' + p.z.toFixed(4) + ',' + p.heading.toFixed(4)
          + ' found ' + sim.discovered.size + ' zones ' + sim.visitedZones.size);
      }
      const wd = M.worldMapData({ regions: C.regions, links: C.links, marks: [], zones: [] });
      out.push('map ' + wd.regions.length + '/' + wd.links.length + '/' + wd.progress.percent);
      console.log(out.join('\\n'));
    `;
    fs.writeFileSync(path.join(dirA, 'probe.cjs'), probe);
    fs.writeFileSync(path.join(dirB, 'probe.cjs'), probe);
    const withC = execFileSync(process.execPath, ['probe.cjs'], { encoding: 'utf8', cwd: dirA });
    const without = execFileSync(process.execPath, ['probe.cjs'], { encoding: 'utf8', cwd: dirB });
    assert.ok(withC.length > 500, '指紋が とれて いる');
    assert.ok(/worldCorridors/.test(fs.readFileSync(path.join(dirA, 'meguru.js'), 'utf8')), 'A がわには Phase 4C が ある');
    assert.equal(without, withC, 'Phase 4C を 消しても ゲームの うごきは 1 つも 変わらない');
  } finally {
    fs.rmSync(dirA, { recursive: true, force: true });
    fs.rmSync(dirB, { recursive: true, force: true });
  }
});

test('15. 分母・spot・たび・セーブ・REGION_FRAME は 1 つも 動いて いない', () => {
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
  assert.equal(arr(M.FRAMED_REGIONS).length, 12);
  assert.equal(M.hasFrame('memory_lake'), false);
  // corridor を つくっても frame は かわらない
  const before = JSON.stringify(M.REGION_FRAME);
  M.worldCorridors(); M.findRegionRoute('home', 'jungle');
  assert.equal(JSON.stringify(M.REGION_FRAME), before);
  // 「たび」は 無変更(corridor を とおらない)
  const s = h.api.state();
  for (const id of ['jungle', 'deepsea', 'star_stop', 'desert', 'home']) {
    const r = h.api.REGIONS.find((x) => x.id === id);
    if (!r) continue;
    h.api.travelToRegion(r, { id });
    assert.equal(s.regionId, id, id + ' へ たびで 行ける');
  }
  // セーブには corridor / global の あとかたも ない
  const m = s.lifetime.meguru;
  assert.ok(m && typeof m === 'object');
  const json = JSON.stringify(m);
  assert.ok(!/corridor|global|frame|route/i.test(json), 'セーブに corridor の あとかたも ない: ' + json.slice(0, 200));
});
