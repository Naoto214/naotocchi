// Phase 3A — 全地域 connection・地理整合性 監査(docs/qa/meguru-phase3a-connection-audit-2026-09-21.md)。
// この監査は「設計・監査だけで、コードは 1 行も変えない」PR で作られた。
// ここで しばるのは **監査した時点の じじつ** で、
// あとから しらないうちに connection / gate / 分母 / spot が 動いたら すぐ 気づけるように する。
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');

function setup() {
  const h = harness({ fullDisplay: true });
  const M = h.api.meguruMod;
  return { h, M, G: M.WORLD_GEOGRAPHY, W: M.WORLDS };
}

// 監査した じじつ を そのまま 書きうつした ていすう。
// **Phase 3B-0 で `forest|snow` を さくじょ した ぶんを はんえい して いる**
// Phase 3B-1 で `mountain|river_lake` と `home|river_lake` に gate が ついた
const GATED = ['countryside|forest', 'home|forest', 'jungle|sea', 'deepsea|sea', 'countryside|star_stop',
  'mountain|river_lake', 'home|river_lake'];
const UNGATED = ['snow|mountain', 'forest|mountain', 'desert|mountain',
  'countryside|river_lake', 'city|countryside', 'city|sea', 'city|desert'];
// 直線が ほかの 地域の だえんを つらぬいて いる のこり 1 本(3 章)。
// もう 1 本 だった `forest|snow` は さくじょ ずみ
const PIERCING = ['countryside|river_lake'];

test('1. connection は 15 本。b あり 14 / gate 7 / 未実装 7 / special 2', () => {
  const { G } = setup();
  assert.equal(G.connections.length, 15, 'connection は 15 本');
  assert.equal(G.connections.filter((c) => c.b).length, 14, '2 地域を むすぶ ものは 14 本');
  assert.ok(!G.connections.some((c) => c.id === 'forest|snow'), 'もり|ゆきぐに は 正式 connection に のこって いない');
  assert.equal(G.connections.filter((c) => !c.b).map((c) => c.id).join(','), 'memory_lake',
    'b を もたないのは きおくのみずうみ だけ');
  assert.equal(G.connections.filter((c) => c.gate).map((c) => c.id).sort().join(','), GATED.slice().sort().join(','));
  assert.equal(G.connections.filter((c) => c.b && !c.gate).map((c) => c.id).sort().join(','),
    UNGATED.slice().sort().join(','));
  assert.equal(G.connections.filter((c) => c.special).map((c) => c.id + ':' + c.special).sort().join(','),
    'countryside|star_stop:vertical,jungle|sea:sea');
});

test('2. gate の 端点は ぜんぶで 14。出口を 1 つも もたない 地域が 4 つ ある', () => {
  const { M, G, W } = setup();
  const ids = Object.keys(G.regions);
  let ends = 0;
  const without = [];
  for (const id of ids) {
    const w = W[id];
    const n = w ? M.regionGates(id, w).length : 0;
    ends += n;
    if (!n) without.push(id);
  }
  assert.equal(ends, 14, 'gate の 端点 合計');
  assert.equal(without.sort().join(','), 'city,desert,memory_lake,snow',
    'まだ あるいて 出られない 地域');
});

test('3. 未実装 7 本は どちらの がわにも gate が ない(片がわだけ は 0 本)', () => {
  const { M, G, W } = setup();
  for (const id of UNGATED) {
    const c = G.connections.find((x) => x.id === id);
    assert.ok(c, id + ' が ある');
    for (const rid of [c.a, c.b]) {
      const hit = M.regionGates(rid, W[rid]).filter((g) => g.id === id);
      assert.equal(hit.length, 0, `${id} の ${rid} がわに gate は ない`);
    }
  }
});

test('4. mouths の spot は ぜんぶ じっさいに あって、ひみつでは ない', () => {
  const { G, W } = setup();
  let n = 0;
  for (const c of G.connections) {
    if (!c.mouths) continue;
    for (const [rid, sid] of Object.entries(c.mouths)) {
      const s = (W[rid].spots || []).find((q) => q.id === sid);
      assert.ok(s, `${rid}.${sid} が ある`);
      assert.ok(!s.secret, `${rid}.${sid} は ひみつでは ない`);
      n++;
    }
  }
  assert.equal(n, 28, 'mouth の 端点は 14 本 × 2');
});

test('5. anchor 候補は ぜんぶ 既存の spot で たりる(新しい spot は いらない)', () => {
  const { G, W } = setup();
  // 監査 6 章で あげた 候補。**ぜんぶ 既存・非ひみつ** であることだけを しばる
  const CAND = {
    'snow|mountain': { snow: ['peak', 'peakfoot', 'blizzard'], mountain: ['summit', 'eastpeak', 'snowpatch'] },
    'forest|mountain': { forest: ['stonelook', 'fernlook', 'fork'], mountain: ['trailhead', 'lookout1', 'steps'] },
    'desert|mountain': { desert: ['gate', 'well', 'dune1'], mountain: ['windnotch', 'ridge', 'cliff'] },
    'city|countryside': { city: ['cross4', 'steps', 'lookout'], countryside: ['terracelook', 'hamlet', 'watermill'] },
    'city|sea': { city: ['boatpier', 'rivercross', 'riverpark'], sea: ['port', 'boats', 'pier'] },
    'city|desert': { city: ['stalls', 'marketback', 'market'], desert: ['caravan', 'ruins', 'dunecrest'] },
    'countryside|river_lake': { countryside: ['riverbank', 'watermill', 'fishspot'], river_lake: ['bank', 'riverbend', 'river1'] },
  };
  assert.equal(Object.keys(CAND).length, 7, '未実装 7 本ぶん');
  for (const [cid, sides] of Object.entries(CAND)) {
    assert.ok(G.connections.some((c) => c.id === cid), cid + ' が ある');
    for (const [rid, list] of Object.entries(sides)) {
      assert.ok(list.length <= 3, cid + ' / ' + rid + ' の 候補は 3 つまで');
      for (const sid of list) {
        const s = (W[rid].spots || []).find((q) => q.id === sid);
        assert.ok(s, `${cid}: ${rid}.${sid} は 既存の spot`);
        assert.ok(!s.secret, `${cid}: ${rid}.${sid} は ひみつでは ない`);
      }
    }
  }
});

test('6. ほかの 地域を つらぬいて いるのは countryside|river_lake だけ', () => {
  const { M, G } = setup();
  const R = G.regions;
  const shape = {};
  for (const id of Object.keys(R)) shape[id] = M.worldMapShape(id);
  const ground = Object.keys(R).filter((id) => R[id].layer === 'ground');
  const inside = (id, x, y) => (((x - R[id].mapX) / shape[id].rx) ** 2 + ((y - R[id].mapY) / shape[id].ry) ** 2) <= 1;
  const hits = [];
  for (const c of G.connections) {
    if (!c.b) continue;
    const A = R[c.a], B = R[c.b];
    const through = new Set();
    for (let i = 0; i <= 400; i++) {
      const t = i / 400, x = A.mapX + (B.mapX - A.mapX) * t, y = A.mapY + (B.mapY - A.mapY) * t;
      for (const id of ground) if (id !== c.a && id !== c.b && inside(id, x, y)) through.add(id);
    }
    if (through.size) hits.push(c.id);
  }
  assert.equal(hits.sort().join(','), PIERCING.slice().sort().join(','),
    'これ いがいが つらぬきはじめたら 監査文書が 古い');
});

test('7. 分水界の 点列は にしのやまちの 南はし 4 点と おなじ', () => {
  const { G } = setup();
  const f = (id) => G.features.find((x) => x.id === id);
  const key = (p) => p.x + ',' + p.y;
  const divide = f('divide').points.map(key);
  const tail = f('west-range').points.slice(-4).map(key);
  assert.equal(divide.join(' '), tail.join(' '), 'ぶんすいかい = にしのやまちの 南はし');
});

test('8. home の 2 本は どちらも おおきなき。いまの sim は 1 spot 1 gate しか ひろえない', () => {
  const { G } = setup();
  const at = G.connections.filter((c) => c.b && c.mouths && c.mouths.home).map((c) => c.id + '@' + c.mouths.home);
  assert.equal(at.sort().join(','), 'home|forest@bigtree,home|river_lake@bigtree',
    'おうちの 出口は 2 本とも おおきなき');
});

test('9. 通常 11 地域の 次数。一本道では なく、わが 1 つ ある', () => {
  const { M, G } = setup();
  const N = M.NORMAL_REGIONS;
  const deg = {};
  for (const id of N) deg[id] = 0;
  for (const c of G.connections) {
    if (!c.b || !N.includes(c.a) || !N.includes(c.b)) continue;
    deg[c.a]++; deg[c.b]++;
  }
  assert.equal(N.map((id) => id + ':' + deg[id]).sort().join(' '),
    ['home:2', 'city:3', 'countryside:3', 'forest:3', 'mountain:4', 'snow:1',
      'sea:3', 'deepsea:1', 'river_lake:3', 'jungle:1', 'desert:2'].sort().join(' '));
  assert.equal(N.reduce((n, id) => n + deg[id], 0), 26, '端点 26 = link 13 本 × 2');
  // ゆきぐには やま とだけ つながる。もり → やま → ゆきぐに が 正式な みち
  assert.equal(deg.snow, 1, 'ゆきぐには やま だけ');
});

test('10. 探索率の 分母(region 11 / link 13 / tier1 17 / zone 103)', () => {
  const { M } = setup();
  const C = M.worldCountable();
  assert.equal(C.regions.length, 11);
  assert.equal(C.links.length, 13, 'もり|ゆきぐに を けした ぶん 14 → 13');
  assert.ok(!C.links.includes('forest|snow'), 'ぶんぼに ゴースト が のこって いない');
  assert.equal(C.tier1, 17);
  assert.equal(C.zones, 103);
  assert.equal(M.WORLD_PROGRESS_WEIGHT.regions + M.WORLD_PROGRESS_WEIGHT.links
    + M.WORLD_PROGRESS_WEIGHT.marks + M.WORLD_PROGRESS_WEIGHT.zones, 1);
  // 14 本は ぜんぶ「gate が なくても 見つけられる」。発見は mouth spot だけで きまる
  const spots = {};
  for (const id of C.regions) spots[id] = M.WORLDS[id].spots.map((s) => s.id);
  const found = M.worldLinksFrom(spots);
  for (const id of C.links) assert.ok(found.includes(id), id + ' は spot だけで 見つけられる');
});

test('11. 地域の かずと 世界の 中みは 1 つも 動いて いない', () => {
  const { M, G, W } = setup();
  assert.equal(Object.keys(G.regions).length, 13);
  assert.equal(Object.keys(G.regions).filter((id) => G.regions[id].layer === 'ground').length, 10);
  assert.equal(M.NORMAL_REGIONS.length, 11);
  let spots = 0, paths = 0, zones = 0, secret = 0;
  for (const id of Object.keys(W)) {
    const w = W[id];
    spots += w.spots.length; paths += w.paths.length; zones += w.zones.length;
    secret += w.spots.filter((s) => s.secret).length + w.paths.filter((p) => p[2] === 'secret').length;
  }
  assert.equal(spots, 471); assert.equal(paths, 654); assert.equal(zones, 118); assert.equal(secret, 107);
  const j = W.jungle;
  assert.equal(j.spots.length, 40); assert.equal(j.paths.length, 57); assert.equal(j.zones.length, 10);
  assert.equal(j.spots.filter((s) => s.secret).length + j.paths.filter((p) => p[2] === 'secret').length, 10);
});

test('12. 「たび」は 無変更。まだ あるいて 行けない 地域へも たびでは 行ける', () => {
  const h = harness({ fullDisplay: true });
  const s = h.api.state();
  assert.equal(typeof h.api.travelToRegion, 'function');
  const before = s.regionId;
  for (const id of ['mountain', 'river_lake', 'city', 'desert', 'snow']) {
    const r = h.api.REGIONS.find((x) => x.id === id);
    assert.ok(r, id + ' は たびの いきさきに ある');
    h.api.travelToRegion(r, { id });
    assert.equal(s.regionId, id, id + ' へ たびで 行ける');
  }
  assert.notEqual(before, s.regionId);
});
