// めぐる Phase 3B-Final: `countryside|river_lake` を 正式に けした
//
// けした りゆう(docs/qa/meguru-phase3b-final-countryside-river-2026-09-22.md):
//   ・地図の 直線が **もりを 42.9% / おうちを 7.1% 貫通**して いた
//   ・**ぜんぶの connection の なかで よその region を 貫通して いたのは この 1 本だけ**
//   ・きょり 5.70 は 最長で、平均+1.5σ(5.49)を こえる ただ 1 つの 値
//   ・けしても いなか ⇄ みずべ は もり けいゆ / にしまわり で 行ける
//
// ここで しばるのは 2 つ:
//   ① けした ものが **実行時正本・地図・探索率・はっけん の どこにも のこらない**
//   ② けした ことで **こわれた ものが 1 つも ない**(連結性・既存 13 gate・spot・セーブ)
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');

const GONE = 'countryside|river_lake';

function setup() {
  const h = harness({ fullDisplay: true });
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, energy: 100, health: 100, hunger: 80,
    speciesLine: 'dog', stageIndex: 4, ageTicks: 500 });
  const M = h.api.meguruMod;
  return { h, s, M, G: M.WORLD_GEOGRAPHY, W: M.WORLDS };
}
// ハーネスは meguru.js を べつの vm realm で うごかす。むこうの Array は
// プロトタイプが ちがう ので、くらべる まえに こちらの かたちへ うつす
const arr = (x) => Array.from(x || []);
// あるける みちだけの となりどうし
const walkAdj = (M) => {
  const a = {};
  for (const c of M.WORLD_GEOGRAPHY.connections) {
    if (!c.gate || c.gate.kind !== 'walk') continue;
    (a[c.a] ||= []).push(c.b); (a[c.b] ||= []).push(c.a);
  }
  return a;
};
const route = (adj, from, to, ban = new Set()) => {
  const seen = new Set([from]), q = [[from, [from]]];
  while (q.length) {
    const [n, p] = q.shift();
    if (n === to) return p;
    for (const m of (adj[n] || [])) if (!seen.has(m) && !ban.has(m)) { seen.add(m); q.push([m, p.concat(m)]); }
  }
  return null;
};

// ──────────────────────────────────────────────── ① けした ものが のこって いない

test('1. 正本から きえた。connection 15 → 14 / 未実装 0', () => {
  const { G } = setup();
  assert.ok(!G.connections.some((c) => c.id === GONE), '正本に ない');
  assert.equal(G.connections.length, 14, 'connection は 14');
  assert.equal(G.connections.filter((c) => c.gate).length, 13, 'gate 実装済みは 13 のまま');
  assert.equal(G.connections.filter((c) => c.b && !c.gate).length, 0, '**未実装 connection は 0 本**');
  // b を もたないのは きおくのみずうみ だけ(これは 地上の ざひょうを もたない 特別な もの)
  assert.equal(G.connections.filter((c) => !c.b).map((c) => c.id).join(','), 'memory_lake');
});

test('2. 探索率の link 分母が 13 → 12。**かずを たもつ ための 代わりは 足して いない**', () => {
  const { M } = setup();
  const C = M.worldCountable();
  assert.equal(C.links.length, 12, 'link 分母は 12');
  assert.ok(!arr(C.links).includes(GONE), 'ぶんぼに ゴーストが のこって いない');
  // ほかの ぶんぼは 1 つも 動いて いない
  assert.equal(C.regions.length, 11); assert.equal(C.tier1, 17); assert.equal(C.zones, 103);
  assert.deepEqual(Object.assign({}, M.WORLD_PROGRESS_WEIGHT),
    { regions: 0.4, links: 0.25, marks: 0.2, zones: 0.15 }, '重みも そのまま');
  // 12 本の 中みは 「いま あるく / のれる」ものだけ
  assert.equal(arr(C.links).sort().join(','),
    'city|countryside,city|desert,city|sea,countryside|forest,deepsea|sea,desert|mountain,'
    + 'forest|mountain,home|forest,home|river_lake,jungle|sea,mountain|river_lake,snow|mountain');
});

test('3. worldLinksFrom(): 両はしの spot を ぜんぶ 見つけても もう 出て こない', () => {
  const { M, W } = setup();
  const C = M.worldCountable();
  const every = {};
  for (const id of C.regions) every[id] = W[id].spots.map((q) => q.id);
  const found = arr(M.worldLinksFrom(every));
  assert.equal(found.length, 12, 'ぜんぶ 見つけても 12 本');
  assert.ok(!found.includes(GONE), 'はっけん できる みちにも ない');
  // かつての 両はし だけを 見つけても 1 本も ひらかない
  assert.equal(M.worldLinksFrom({ countryside: ['riverbank'], river_lake: ['bank'] }).length, 0,
    'むかしの 出口を そろえても もう ひらかない');
});

test('4. 世界地図に ゴーストの 線が 出ない(100% でも)', () => {
  const { M, W } = setup();
  const C = M.worldCountable();
  const every = {};
  for (const id of C.regions) every[id] = W[id].spots.map((q) => q.id);
  const links = arr(M.worldLinksFrom(every));
  const wd = M.worldMapData({ regions: C.regions, links, marks: {}, zones: {} });
  assert.equal(wd.links.length, 12, '100% の 地図は 12 本');
  assert.ok(!wd.links.some((l) => l.id === GONE), '地図に ゴーストの 線が ない');
  // いなかと みずべ を むすぶ 直通の 線は 1 本も ない
  const direct = wd.links.filter((l) => (l.a === 'countryside' && l.b === 'river_lake')
    || (l.a === 'river_lake' && l.b === 'countryside'));
  assert.equal(direct.length, 0, 'いなか ⇄ みずべ の 直通線は ない');
});

// ──────────────────────────────────────────────── ② こわれた ものが ない

test('5. **ふるい セーブに きろくが のこって いても 無害**(エラー / 水増し / 線の 復活 なし)', () => {
  const { M, W } = setup();
  const C = M.worldCountable();
  const every = {};
  for (const id of C.regions) every[id] = W[id].spots.map((q) => q.id);
  const links = arr(M.worldLinksFrom(every));
  // むかしの セーブ = 13 本 きろく されて いる(けした id が 入って いる)
  const old = { regions: C.regions, links: links.concat([GONE]), marks: {}, zones: {} };
  let wd;
  assert.doesNotThrow(() => { wd = M.worldMapData(old); }, 'エラーに ならない');
  assert.equal(wd.links.length, 12, '線は 12 本の まま(復活しない)');
  assert.ok(!wd.links.some((l) => l.id === GONE), 'ゴースト線が 出ない');
  assert.equal(wd.progress.links, 12, '**探索率を 水増ししない**(13 きろくでも 12)');
  assert.equal(wd.progress.linkTotal, 12, 'ぶんぼも 12');
  // まったく 知らない id が まざって いても おなじ
  const junk = M.worldMapData({ regions: C.regions, links: links.concat(['nowhere|nothing', GONE]), marks: {}, zones: {} });
  assert.equal(junk.links.length, 12);
  assert.equal(junk.progress.links, 12); assert.equal(junk.progress.linkTotal, 12);
  // けした id が あっても なくても すすみぐあいは おなじ
  const clean = M.worldMapData({ regions: C.regions, links, marks: {}, zones: {} });
  assert.equal(wd.progress.percent, clean.progress.percent,
    'ふるい きろくが あっても すすみぐあいは かわらない(' + wd.progress.percent + ' / ' + clean.progress.percent + ')');
  assert.ok(wd.progress.percent <= 100, 'すすみぐあいが 100% を こえない(' + wd.progress.percent + ')');
});

test('6. 連結性: いなか ⇄ みずべ は **もり けいゆ**でも **にしまわり**でも 行ける', () => {
  const { M } = setup();
  const adj = walkAdj(M);
  // 指示された 2 本の みちが じっさいに 通れる
  for (const want of [
    ['countryside', 'forest', 'mountain', 'river_lake'],
    ['countryside', 'forest', 'home', 'river_lake']]) {
    for (let i = 0; i < want.length - 1; i++)
      assert.ok((adj[want[i]] || []).includes(want[i + 1]), want[i] + ' → ' + want[i + 1] + ' が つながって いる');
  }
  // Phase 3B-4 で できた にしまわり(もりを とおらない)
  const west = route(adj, 'countryside', 'river_lake', new Set(['forest']));
  assert.ok(west, 'もりを とおらない みちが ある');
  assert.deepEqual(west, ['countryside', 'city', 'desert', 'mountain', 'river_lake'],
    'にしまわり = まち → さばく → やま');
  // どの 中つぎを 1 つ おとしても まだ つながる
  for (const cut of ['forest', 'mountain', 'home', 'city', 'desert'])
    assert.ok(route(adj, 'countryside', 'river_lake', new Set([cut])), cut + ' を とおらなくても 行ける');
});

test('7. 通常世界は ひとつの まま。あるいて 9 地域 / のりもの こみで 12 地域', () => {
  const { M, W } = setup();
  const group = (kindOk) => {
    const a = {};
    for (const c of M.WORLD_GEOGRAPHY.connections) {
      if (!c.gate || !kindOk(c.gate.kind)) continue;
      (a[c.a] ||= []).push(c.b); (a[c.b] ||= []).push(c.a);
    }
    const seen = new Set(['countryside']), st = ['countryside'], g = [];
    while (st.length) { const x = st.pop(); g.push(x); for (const y of (a[x] || [])) if (!seen.has(y)) { seen.add(y); st.push(y); } }
    return g.sort();
  };
  const walk = group((k) => k === 'walk');
  assert.equal(walk.join(','), 'city,countryside,desert,forest,home,mountain,river_lake,sea,snow');
  assert.equal(walk.length, 9, 'あるいて 9 地域');
  const all = group(() => true);
  assert.equal(all.length, Object.keys(W).length - 1, 'のりもの こみで きおくのみずうみ いがい ぜんぶ');
  assert.ok(!all.includes('memory_lake'), 'きおくのみずうみは 地上の 出口を もたない ので べつ');
});

test('8. 既存の 13 gate が ぜんぶ 健在。出口の 組み合わせも 変わって いない', () => {
  const { M } = setup();
  const impl = arr(M.WORLD_GEOGRAPHY.connections).filter((c) => c.gate).map((c) => c.id).sort();
  assert.deepEqual(impl, ['city|countryside', 'city|desert', 'city|sea', 'countryside|forest',
    'countryside|star_stop', 'deepsea|sea', 'desert|mountain', 'forest|mountain', 'home|forest',
    'home|river_lake', 'jungle|sea', 'mountain|river_lake', 'snow|mountain']);
  // region ごとの 出口が そのまま(いなか・みずべ からも 出口が きえて いない)
  const at = {};
  for (const rid of ['countryside', 'river_lake', 'forest', 'home', 'mountain', 'city', 'sea', 'desert', 'snow']) {
    const sim = M.createSimulation({ regionId: rid, discovered: [] });
    at[rid] = sim.gates.map((g) => g.spot.id + '→' + g.to).sort().join(' / ');
  }
  assert.equal(at.countryside, 'skyland→star_stop / terracelook→city / woods→forest',
    'いなかの 出口は 3 つの まま(かわぞいは もともと 出口では なかった)');
  assert.equal(at.river_lake, 'lakelook→mountain / riverside→home',
    'みずべの 出口は 2 つの まま(かわぎしは もともと 出口では なかった)');
  assert.equal(at.mountain, 'foot→river_lake / lookout1→forest / summit→snow / windnotch→desert',
    'やまの やくわり ぶんさんは そのまま');
  for (const rid of Object.keys(at)) assert.ok(at[rid].length > 0, rid + ': 出口が 1 つも ない');
});

test('9. **spot は けして いない。**かわぞい も かわぎし も そのまま はたらく', () => {
  const { M, W } = setup();
  // ① ふたつとも 実在して、中みも 変わって いない
  const rb = W.countryside.spots.find((q) => q.id === 'riverbank');
  const bk = W.river_lake.spots.find((q) => q.id === 'bank');
  assert.ok(rb && bk, 'ふたつとも ある');
  assert.equal(rb.label, 'かわぞい'); assert.equal(rb.kind, 'water'); assert.equal(rb.zone, 'river');
  assert.equal(bk.label, 'かわぎし'); assert.equal(bk.kind, 'plaza'); assert.equal(bk.zone, 'bank');
  assert.ok(!rb.secret && !bk.secret, 'どちらも 非秘密の まま');
  // ② みちも つながった まま(ほかの つかいみちが ある)
  assert.equal(W.countryside.paths.filter((p) => p[0] === 'riverbank' || p[1] === 'riverbank').length, 3,
    'かわぞいの みちは 3 本の まま');
  assert.equal(W.river_lake.paths.filter((p) => p[0] === 'bank' || p[1] === 'bank').length, 1,
    'かわぎしの みちは 1 本の まま');
  // ③ かわぎしは みずべの いちばん 手前の ひろば。そこから region ぜんぶへ 行ける
  const reach = M.reachableSpots(W.river_lake, 'bank');
  const miss = W.river_lake.spots.filter((q) => !q.secret && !reach.has(q.id)).map((q) => q.id);
  assert.equal(miss.join(','), '', 'かわぎしから みずべの 非秘密 spot ぜんぶへ 行ける');
  // ④ もう connection の 出口では ない
  for (const c of M.WORLD_GEOGRAPHY.connections) {
    if (!c.mouths) continue;
    assert.notEqual(c.mouths.countryside, 'riverbank', c.id + ' が まだ かわぞいを 出口に して いる');
    assert.notEqual(c.mouths.river_lake, 'bank', c.id + ' が まだ かわぎしを 出口に して いる');
  }
});

test('10. region の なかみ・たび・なかま・住民は 1 つも 変わって いない', () => {
  const { h, s, M, W } = setup();
  let sp = 0, pa = 0, zo = 0, se = 0;
  for (const w of Object.values(W)) {
    sp += w.spots.length; pa += w.paths.length; zo += w.zones.length;
    se += w.spots.filter((x) => x.secret).length + w.paths.filter((x) => x[2] === 'secret').length;
  }
  assert.equal(sp, 471); assert.equal(pa, 654); assert.equal(zo, 118); assert.equal(se, 107);
  // travelToRegion() は そのまま。けした 2 地域へも たびで 行ける
  assert.equal(typeof h.api.travelToRegion, 'function');
  for (const id of ['countryside', 'river_lake', 'forest']) {
    h.api.travelToRegion(h.api.REGIONS.find((r) => r.id === id), { id });
    assert.equal(s.regionId, id, 'たびで ' + id + ' へ 行ける');
  }
  s.lifetime.companionsRecruited = ['shiba'];
  s.companions = [{ id: 'shiba', bond: 80 }];
  for (const rid of ['countryside', 'river_lake']) {
    const sim = M.createSimulation({ regionId: rid, discovered: [] });
    for (let i = 0; i < 120; i++) sim.step(1 / 60, { x: 0, y: -1 });
    const v = sim.view();
    assert.ok(v.party.length >= 1, rid + ': なかまが いる');
    for (const a of v.party) assert.ok(sim.dist(a, v.player) < 400, rid + ': ' + a.key + ' は そばに いる');
    const keys = v.residents.map((a) => a.key);
    assert.equal(new Set(keys).size, keys.length, rid + ': 住民の key が だぶって いない');
  }
});

test('11. **よその region を 貫通する 線が 1 本も なくなった**(けした いちばんの りゆう)', () => {
  const { M } = setup();
  const C = M.worldCountable();
  const every = {};
  for (const id of C.regions) every[id] = M.WORLDS[id].spots.map((q) => q.id);
  const wd = M.worldMapData({ regions: C.regions, links: arr(M.worldLinksFrom(every)), marks: {}, zones: {} });
  const byId = {};
  for (const r of wd.regions) byId[r.id] = r;
  const hits = [];
  for (const l of wd.links) {
    const a = byId[l.a], b = byId[l.b];
    if (!a || !b) continue;                       // 地図に のらない たてじく は みない
    for (const r of wd.regions) {
      if (r.id === l.a || r.id === l.b || r.rx == null) continue;
      let inside = 0;
      const N = 400;
      for (let i = 0; i <= N; i++) {
        const t = i / N, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
        if (((x - r.x) / r.rx) ** 2 + ((y - r.y) / r.ry) ** 2 <= 1) inside++;
      }
      const pct = inside / (N + 1) * 100;
      if (pct > 1) hits.push(l.id + ' が ' + r.id + ' を ' + pct.toFixed(1) + '% 貫通');
    }
  }
  assert.deepEqual(hits, [], '貫通して いる 線: ' + hits.join(' / '));
});
