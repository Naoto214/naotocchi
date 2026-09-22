// めぐる Phase 3B-4: さばくを せかいへ つなぐ 2 本
//   `city|desert`     city.stalls  ↔ desert.caravan   (人が つくった キャラバンの かいどう)
//   `desert|mountain` desert.gate  ↔ mountain.windnotch (うかげの とうげ)
// いちばん あつく みるのは 2 つ:
//   ① さばくの 2 つの 入口(まちがわ / やまがわ)が だんごに ならず、混線も しない
//   ② やまの 4 つの 出口(かわ / もり / ゆきぐに / さばく)が たがいを ふさがない
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');

function setup() {
  const h = harness({ fullDisplay: true });
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, energy: 100, health: 100, hunger: 80,
    speciesLine: 'dog', stageIndex: 4, ageTicks: 500 });
  const M = h.api.meguruMod;
  return { h, s, M, G: M.WORLD_GEOGRAPHY, W: M.WORLDS };
}
// その 出口の うえに 立って、外へ むかって あるく
function walkOut(sim, gate, push = 0, steps = 600) {
  sim.setPlayer(gate.spot.x + push * 95, gate.spot.z);
  const dirY = gate.out === 'far' ? -1 : 1;      // パッドの y は 上が -1 ＝ おくへ
  for (let i = 0; i < steps; i++)
    for (const ev of sim.step(1 / 60, { x: push, y: dirY })) if (ev.type === 'gate') return ev.gate;
  return null;
}
const gateTo = (sim, to) => sim.gates.find((g) => g.to === to);
// ハーネスは meguru.js を べつの vm realm で うごかす。むこうの Array / Object は
// プロトタイプが ちがう ので deepStrictEqual が 中身に かかわらず 落ちる。
// くらべる まえに こちらの かたちへ うつす
const arr = (x) => Array.from(x || []);
const obj = (x) => Object.assign({}, x || {});
// **region ぜんぶの 非秘密 spot**から 8 むき x よこ 5 かしょ あるいて、
// じっさいに ひらいた 出口ごとに 行きさきを かぞえる。座標の さだけで 判断しない(項目10)
function sweepAll(M, rid, W, lateral = [-2, -1, 0, 1, 2]) {
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  const starts = W[rid].spots.filter((q) => !q.secret);
  const out = {}, perGateSpot = {};
  for (const q of starts) for (const d of dirs) for (const px of lateral) {
    const sim = M.createSimulation({ regionId: rid, discovered: [] });
    sim.setPlayer(q.x + px * 95, q.z);
    let hit = null;
    for (let i = 0; i < 400 && !hit; i++)
      for (const ev of sim.step(1 / 60, { x: d[0], y: d[1] })) if (ev.type === 'gate') { hit = ev.gate; break; }
    out[hit ? hit.to : 'none'] = (out[hit ? hit.to : 'none'] || 0) + 1;
    if (hit) (perGateSpot[hit.spot.id] ||= {})[hit.to] = (perGateSpot[hit.spot.id][hit.to] || 0) + 1;
  }
  return { out, perGateSpot, tries: starts.length * dirs.length * lateral.length };
}

// ──────────────────────────────────────────────── 正本

test('1. 2 本に あるく 出口が ついた。connection は ふえて いない', () => {
  const { G } = setup();
  assert.equal(G.connections.length, 15, 'connection は 15 のまま');
  const impl = G.connections.filter((c) => c.gate);
  assert.equal(impl.length, 13, 'gate 実装済み 11 → 13');
  const rest = arr(G.connections).filter((c) => !c.gate && c.b).map((c) => c.id);
  assert.deepEqual(rest, ['countryside|river_lake'], 'のこる 未実装は 1 本だけ');
  for (const id of ['city|desert', 'desert|mountain']) {
    const c = G.connections.find((q) => q.id === id);
    assert.equal(c.gate.kind, 'walk', id + ' は あるいて こえる');
    assert.equal(Object.keys(c.gate.ends).length, 2, id + ': りょうはしに 出口が ある');
    for (const [rid, e] of Object.entries(c.gate.ends)) {
      assert.equal(e.spot, c.mouths[rid], `${id}/${rid}: 正本の mouth と おなじ spot`);
      assert.ok(e.dir === 'far' || e.dir === 'near', `${id}/${rid}: dir`);
      assert.ok(e.bearing && (e.bearing.x !== 0 || e.bearing.z !== 0), `${id}/${rid}: bearing`);
      assert.equal(e.land.length, 6, `${id}/${rid}: non-region ちけいが 6 段`);
    }
  }
});

test('2. anchor は ぜんぶ 既存の 非秘密 spot。**新しい spot は 1 つも つくって いない**', () => {
  const { W } = setup();
  for (const [rid, sid, label] of [
    ['city', 'stalls', 'やたいのならび'], ['desert', 'caravan', 'キャラバンのテント'],
    ['desert', 'gate', 'さばくのいりぐち'], ['mountain', 'windnotch', 'かぜのきれめ']]) {
    const q = W[rid].spots.find((x) => x.id === sid);
    assert.ok(q, `${rid}.${sid} が ある`);
    assert.ok(!q.secret, `${rid}.${sid} は 非秘密`);
    assert.equal(q.label, label, `${rid}.${sid} の なまえ`);
  }
  assert.equal(W.city.spots.length, 47); assert.equal(W.desert.spots.length, 40); assert.equal(W.mountain.spots.length, 39);
  let sp = 0, pa = 0, zo = 0, se = 0;
  for (const w of Object.values(W)) {
    sp += w.spots.length; pa += w.paths.length; zo += w.zones.length;
    se += w.spots.filter((x) => x.secret).length + w.paths.filter((x) => x[2] === 'secret').length;
  }
  assert.equal(sp, 471); assert.equal(pa, 654); assert.equal(zo, 118); assert.equal(se, 107);
});

// ──────────────────────────────────────────────── さばくの 2 つの 入口

test('3. さばくの 2 つの 入口は だんごに ならない(まちがわと やまがわが はなれて いる)', () => {
  const { W } = setup();
  const g = W.desert.spots.find((q) => q.id === 'gate');
  const c = W.desert.spots.find((q) => q.id === 'caravan');
  const d = Math.hypot(g.x - c.x, g.z - c.z);
  assert.ok(d > 1200, 'ふたつの 入口は ' + Math.round(d) + ' はなれて いる');
  assert.ok(d - (g.r || 0) - (c.r || 0) > 800, '半径も かさならない');
  assert.notEqual(g.zone, c.zone, '地区も べつ(' + g.zone + ' / ' + c.zone + ')');
});

test('4. **さばく: あるいて まち・やま いがいへ 出て しまう ことが ない**(ぜんぶの spot x 8 むき 実測)', () => {
  const { M, W } = setup();
  const { out, perGateSpot, tries } = sweepAll(M, 'desert', W);
  assert.ok(tries > 1000, '実測の かず ' + tries);
  for (const to of Object.keys(out)) assert.ok(['none', 'city', 'mountain'].includes(to), 'さばくから ' + to + ' へ 出た');
  assert.ok((out.city || 0) > 0, 'まちへ 出られる'); assert.ok((out.mountain || 0) > 0, 'やまへ 出られる');
  assert.deepEqual(Object.keys(perGateSpot).sort(), ['caravan', 'gate'], 'ひらくのは この 2 つの spot だけ');
  assert.deepEqual(Object.keys(perGateSpot.caravan), ['city'], 'キャラバンは まちへ だけ');
  assert.deepEqual(Object.keys(perGateSpot.gate), ['mountain'], 'いりぐちは やまへ だけ');
});

test('5. まち: やたい(さばく) / おおどおり(いなか) / ふなつきば(うみ) が 混線しない', () => {
  const { M, W } = setup();
  const { out, perGateSpot } = sweepAll(M, 'city', W);
  for (const to of Object.keys(out)) assert.ok(['none', 'desert', 'countryside', 'sea'].includes(to), 'まちから ' + to + ' へ 出た');
  assert.deepEqual(Object.keys(perGateSpot).sort(), ['boatpier', 'cross4', 'stalls']);
  assert.deepEqual(Object.keys(perGateSpot.stalls), ['desert'], 'やたいは さばくへ だけ');
  assert.deepEqual(Object.keys(perGateSpot.cross4), ['countryside'], 'Phase 3B-3 の いなかは そのまま');
  assert.deepEqual(Object.keys(perGateSpot.boatpier), ['sea'], 'Phase 3B-3 の うみは そのまま');
});

test('6. **やまの 4 つの 出口が たがいを ふさがない**(かわ / もり / ゆきぐに / さばく)', () => {
  const { M, W } = setup();
  const { out, perGateSpot } = sweepAll(M, 'mountain', W);
  for (const to of Object.keys(out)) assert.ok(['none', 'river_lake', 'forest', 'snow', 'desert'].includes(to), 'やまから ' + to + ' へ 出た');
  assert.deepEqual(Object.keys(perGateSpot).sort(), ['foot', 'lookout1', 'summit', 'windnotch']);
  // #5 の やくわり ぶんさんが そのまま のこって いる
  assert.deepEqual(Object.keys(perGateSpot.foot), ['river_lake'], 'ふもと = かわ');
  assert.deepEqual(Object.keys(perGateSpot.lookout1), ['forest'], 'いちのてんぼう = もり');
  assert.deepEqual(Object.keys(perGateSpot.summit), ['snow'], 'ちょうじょう = ゆきぐに');
  assert.deepEqual(Object.keys(perGateSpot.windnotch), ['desert'], 'かぜのきれめ = さばく');
  for (const k of ['river_lake', 'forest', 'snow', 'desert']) assert.ok((out[k] || 0) > 0, k + ' へ 行ける');
});

// ──────────────────────────────────────────────── 行って もどれる

test('7. まち ⇄ さばく を 行って もどれる', () => {
  const { M } = setup();
  const a = M.createSimulation({ regionId: 'city', discovered: [] });
  const g1 = gateTo(a, 'desert');
  assert.equal(g1.spot.id, 'stalls'); assert.equal(g1.way, 'walk');
  assert.equal(walkOut(a, g1).to, 'desert');
  const b = M.createSimulation({ regionId: 'desert', discovered: [] });
  const g2 = gateTo(b, 'city');
  assert.equal(g2.spot.id, 'caravan'); assert.equal(g2.way, 'walk');
  assert.equal(walkOut(b, g2).to, 'city');
  assert.equal(g1.at, 'caravan', 'まちを 出ると キャラバンに 着く');
  assert.equal(g2.at, 'stalls', 'さばくを 出ると やたいに 着く');
});

test('8. さばく ⇄ やま を 行って もどれる', () => {
  const { M } = setup();
  const a = M.createSimulation({ regionId: 'desert', discovered: [] });
  const g1 = gateTo(a, 'mountain');
  assert.equal(g1.spot.id, 'gate'); assert.equal(g1.way, 'walk');
  assert.equal(walkOut(a, g1).to, 'mountain');
  const b = M.createSimulation({ regionId: 'mountain', discovered: [] });
  const g2 = gateTo(b, 'desert');
  assert.equal(g2.spot.id, 'windnotch'); assert.equal(g2.way, 'walk');
  assert.equal(walkOut(b, g2).to, 'desert');
  assert.equal(g1.at, 'windnotch'); assert.equal(g2.at, 'gate');
});

test('9. **さばくの こりつが とけた**: あるいて せかいが ひとつに つながる', () => {
  const { M, W } = setup();
  const walk = M.WORLD_GEOGRAPHY.connections.filter((c) => c.gate && c.gate.kind === 'walk');
  const adj = {};
  for (const c of walk) { (adj[c.a] ||= []).push(c.b); (adj[c.b] ||= []).push(c.a); }
  const seen = new Set(['desert']), st = ['desert'], group = [];
  while (st.length) { const x = st.pop(); group.push(x); for (const y of (adj[x] || [])) if (!seen.has(y)) { seen.add(y); st.push(y); } }
  for (const r of ['city', 'countryside', 'sea', 'forest', 'mountain', 'snow', 'river_lake', 'home'])
    assert.ok(group.includes(r), 'さばくから あるいて ' + r + ' へ 行ける');
  assert.equal(group.length, 9, 'あるいて つながる かたまりは 9 地域');
  // のりもの も いれると memory_lake いがい ぜんぶ
  const all = M.WORLD_GEOGRAPHY.connections.filter((c) => c.gate);
  const adj2 = {};
  for (const c of all) { (adj2[c.a] ||= []).push(c.b); (adj2[c.b] ||= []).push(c.a); }
  const seen2 = new Set(['desert']), st2 = ['desert'], g2 = [];
  while (st2.length) { const x = st2.pop(); g2.push(x); for (const y of (adj2[x] || [])) if (!seen2.has(y)) { seen2.add(y); st2.push(y); } }
  assert.equal(g2.length, Object.keys(W).length - 1, 'memory_lake いがいは ひとつの せかい');
  assert.ok(!g2.includes('memory_lake'), 'memory_lake は 地上の ざひょうを もたない ので べつ');
});

test('10. わ に なって いる: city → desert → mountain → … → city', () => {
  const { M } = setup();
  const walk = M.WORLD_GEOGRAPHY.connections.filter((c) => c.gate && c.gate.kind === 'walk');
  const adj = {};
  for (const c of walk) { (adj[c.a] ||= []).push(c.b); (adj[c.b] ||= []).push(c.a); }
  // city|desert を つかわずに mountain から city へ もどれる = わ
  const seen = new Set(['mountain', 'desert']), st = ['mountain'];
  let back = false;
  while (st.length) { const x = st.pop(); if (x === 'city') { back = true; break; } for (const y of (adj[x] || [])) if (!seen.has(y)) { seen.add(y); st.push(y); } }
  assert.ok(back, 'city|desert を とおらずに やまから まちへ もどれる(ゆきどまりでは ない)');
});

// ──────────────────────────────────────────────── しかけ

test('11. ジャングルとは つながない。desert|jungle は 復活して いない', () => {
  const { M } = setup();
  const L = M.WORLD_GEOGRAPHY.connections;
  assert.ok(!L.some((c) => c.id === 'desert|jungle'), 'desert|jungle は ない');
  const desert = arr(L).filter((c) => c.a === 'desert' || c.b === 'desert').map((c) => c.id).sort();
  assert.deepEqual(desert, ['city|desert', 'desert|mountain'], 'さばくの となりは まちと やまだけ');
  const sim = M.createSimulation({ regionId: 'desert', discovered: [] });
  assert.equal(sim.gates.filter((g) => g.kind !== 'walk').length, 0, 'さばくに のりばは ない');
});

test('12. のりものを ふやして いない。あたらしい 2 本は どちらも あるき', () => {
  const { M } = setup();
  const L = M.WORLD_GEOGRAPHY.connections.filter((c) => c.gate);
  const kinds = arr(L).reduce((a, c) => { a[c.gate.kind] = (a[c.gate.kind] || 0) + 1; return a; }, {});
  assert.deepEqual(kinds, { walk: 10, sea: 1, vertical: 2 }, 'ふね 1・たて 2 は Phase 3B-3 と おなじ');
  for (const rid of ['city', 'desert', 'mountain']) {
    const sim = M.createSimulation({ regionId: rid, discovered: [] });
    assert.equal(sim.gates.filter((g) => g.kind !== 'walk').length, 0, rid + ': のる / もぐる ボタンは 出ない');
  }
});

test('13. Phase 2.1 の しくみを そのまま つかう。gate 解決は 配列順に よらない', () => {
  const { M } = setup();
  for (const [rid, to] of [['city', 'desert'], ['desert', 'city'], ['desert', 'mountain'], ['mountain', 'desert']]) {
    const sim = M.createSimulation({ regionId: rid, discovered: [] });
    const g = gateTo(sim, to);
    const plan = M.transitionPlan(g);
    assert.equal(plan.way, 'walk');
    assert.deepEqual(arr(plan.phases).map((p) => p.id), ['approach', 'cross', 'arrive', 'settle'], 'あたらしい えんじんは つくらない');
    // 出口の ならびを さかさに しても おなじ 出口が ひらく
    const rev = sim.gates.slice().reverse();
    const at = { x: g.spot.x, z: g.spot.z, mx: (g.bearing || {}).x || 0, mz: g.out === 'far' ? 1 : -1, kind: 'walk' };
    const a = M.resolveGate(sim.gates.filter((q) => q.spot.id === g.spot.id), at);
    const b = M.resolveGate(rev.filter((q) => q.spot.id === g.spot.id), at);
    assert.equal(a && a.id, b && b.id, rid + '→' + to + ': ならびに よらない');
  }
});

test('14. 1 かいの よこぎりで gate は 1 どだけ(演出の 二じゅう はじまり なし)', () => {
  const { M } = setup();
  for (const [rid, to] of [['city', 'desert'], ['desert', 'mountain'], ['mountain', 'desert'], ['desert', 'city']]) {
    const sim = M.createSimulation({ regionId: rid, discovered: [] });
    const g = gateTo(sim, to);
    sim.setPlayer(g.spot.x, g.spot.z);
    const dirY = g.out === 'far' ? -1 : 1;
    let fired = 0;
    for (let i = 0; i < 400; i++) for (const ev of sim.step(1 / 60, { x: 0, y: dirY })) if (ev.type === 'gate') fired++;
    assert.equal(fired, 1, rid + '→' + to + ': ' + fired + ' かい ひらいた');
  }
});

test('15. non-region terrain: 両がわ 6 段。まちの となりが いきなり すなの せかいでは ない', () => {
  const { M } = setup();
  const cd = M.WORLD_GEOGRAPHY.connections.find((c) => c.id === 'city|desert');
  const dm = M.WORLD_GEOGRAPHY.connections.find((c) => c.id === 'desert|mountain');
  // まち → さばく は「郊外 → 平野 / 荒地 → 風 → 砂地」を とおる
  const cityLand = cd.gate.ends.city.land.join('／');
  for (const w of ['こうがい', 'あれち', 'かぜ', 'すなち']) assert.ok(cityLand.includes(w), 'city|desert に「' + w + '」が ある: ' + cityLand);
  assert.deepEqual(cd.gate.ends.desert.land, cd.gate.ends.city.land.slice().reverse(), 'city|desert は 逆から 見ると さかさ');
  // さばく → やま は「高原 → 岩場 → 峠 → 砂礫 → 砂丘」
  const mtLand = dm.gate.ends.mountain.land.join('／');
  for (const w of ['きれめ', 'こうげん', 'いわやま', 'されき', 'すな']) assert.ok(mtLand.includes(w), 'desert|mountain に「' + w + '」が ある: ' + mtLand);
  assert.deepEqual(dm.gate.ends.desert.land, dm.gate.ends.mountain.land.slice().reverse(), 'desert|mountain も さかさ');
  // canvas せんようの え では なく、いみの ある ことば として もつ
  for (const c of [cd, dm]) for (const e of Object.values(c.gate.ends))
    for (const t of e.land) assert.ok(typeof t === 'string' && t.length >= 4, 'ことばとして もって いる: ' + t);
});

test('16. きめられた 出口 いがいからは 外へ 出られない(まち・さばく・やま ぜんぶの spot)', () => {
  const { M, W } = setup();
  for (const rid of ['city', 'desert', 'mountain']) {
    const sim = M.createSimulation({ regionId: rid, discovered: [] });
    const gateSpots = new Set(sim.gates.map((g) => g.spot.id));
    let fired = 0;
    for (const q of W[rid].spots) {
      if (q.secret || gateSpots.has(q.id)) continue;
      for (const v of [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: 1, y: 0 }, { x: -1, y: 0 }]) {
        sim.setPlayer(q.x, q.z);
        for (let i = 0; i < 90; i++) for (const ev of sim.step(1 / 60, v)) if (ev.type === 'gate') fired++;
      }
    }
    assert.equal(fired, 0, rid + ': 出口 いがいからは 出ない');
  }
});

// ──────────────────────────────────────────────── 探索率 / 地図 / たび

test('17. 探索率の ぶんぼは 1 つも 動いて いない(gate を つけただけ)', () => {
  const { M } = setup();
  const C = M.worldCountable();
  assert.equal(C.regions.length, 11); assert.equal(C.links.length, 13);
  assert.equal(C.tier1, 17); assert.equal(C.zones, 103);
  assert.deepEqual(obj(M.WORLD_PROGRESS_WEIGHT), { regions: 0.4, links: 0.25, marks: 0.2, zones: 0.15 });
  const every = {};
  for (const id of C.regions) every[id] = M.WORLDS[id].spots.map((q) => q.id);
  const found = arr(M.worldLinksFrom(every));
  assert.equal(found.length, 13, 'ぜんぶ 見つけても link は 13 のまま');
  for (const id of ['city|desert', 'desert|mountain']) assert.ok(found.includes(id));
  // かたがわだけでは 1 本も ひらかない
  for (const one of [{ city: ['stalls'] }, { desert: ['caravan'] }, { desert: ['gate'] }, { mountain: ['windnotch'] }])
    assert.equal(M.worldLinksFrom(one).length, 0, 'かたがわだけでは ひらかない ' + JSON.stringify(one));
  assert.deepEqual(arr(M.worldLinksFrom({ city: ['stalls'], desert: ['caravan'] })), ['city|desert']);
  assert.deepEqual(arr(M.worldLinksFrom({ desert: ['gate'], mountain: ['windnotch'] })), ['desert|mountain']);
});

test('18. Fog: まちを 知った だけで さばく・やまは もれない', () => {
  const { M } = setup();
  const wd = M.worldMapData({ regions: ['home', 'forest', 'countryside', 'city'],
    links: ['home|forest', 'countryside|forest', 'city|countryside'], marks: {}, zones: {} });
  assert.equal(wd.regions.map((r) => r.id).sort().join(','), 'city,countryside,forest,home');
  const dump = JSON.stringify(wd);
  for (const id of ['desert', 'mountain', 'snow', 'river_lake', 'jungle', 'deepsea', 'star_stop', 'memory_lake'])
    assert.ok(!dump.includes(id), id + ' は もれない');
  // かたはしだけ 知って いても 線は 出ない
  assert.equal(M.worldMapData({ regions: ['city'], links: [], marks: {}, zones: {} }).links.length, 0);
  assert.equal(M.worldMapData({ regions: ['desert'], links: [], marks: {}, zones: {} }).links.length, 0);
});

test('19. anchor は entry から みちを たどって 行ける。たび・なかま・住民も そのまま', () => {
  const { h, s, M, W } = setup();
  for (const [rid, entry, targets] of [
    ['city', 'station', ['stalls', 'cross4', 'boatpier']],
    ['desert', 'gate', ['caravan', 'gate']],
    ['mountain', 'trailhead', ['windnotch', 'foot', 'lookout1', 'summit']]]) {
    const reach = M.reachableSpots(W[rid], entry);
    for (const t of targets) assert.ok(reach.has(t), `${rid}: ${entry} → ${t} に みちが つながって いる`);
    const miss = W[rid].spots.filter((q) => !q.secret && !reach.has(q.id)).map((q) => q.id);
    assert.equal(miss.join(','), '', rid + ': とどかない 非秘密 spot');
  }
  // travelToRegion() は 1 行も かえて いない
  assert.equal(typeof h.api.travelToRegion, 'function');
  for (const id of ['city', 'desert', 'mountain']) {
    h.api.travelToRegion(h.api.REGIONS.find((r) => r.id === id), { id });
    assert.equal(s.regionId, id, 'たびで ' + id + ' へ 行ける');
  }
  s.lifetime.companionsRecruited = ['shiba'];
  s.companions = [{ id: 'shiba', bond: 80 }];
  for (const rid of ['city', 'desert', 'mountain']) {
    const sim = M.createSimulation({ regionId: rid, discovered: [] });
    for (let i = 0; i < 120; i++) sim.step(1 / 60, { x: 0, y: -1 });
    const v = sim.view();
    assert.ok(v.party.length >= 1, rid + ': なかまが いる');
    for (const a of v.party) assert.ok(sim.dist(a, v.player) < 400, rid + ': ' + a.key + ' は そばに いる');
    const keys = v.residents.map((a) => a.key);
    assert.equal(new Set(keys).size, keys.length, rid + ': 住民の key が だぶって いない');
  }
});

test('20. countryside|river_lake には 手を つけて いない(保留の まま)', () => {
  const { M } = setup();
  const c = M.WORLD_GEOGRAPHY.connections.find((q) => q.id === 'countryside|river_lake');
  assert.ok(c, 'connection じたいは のこって いる');
  assert.ok(!c.gate, 'gate は まだ つけて いない');
  assert.deepEqual(obj(c.mouths), { countryside: 'riverbank', river_lake: 'bank' }, '正本の mouth は そのまま');
  for (const rid of ['countryside', 'river_lake']) {
    const sim = M.createSimulation({ regionId: rid, discovered: [] });
    assert.ok(!sim.gates.some((g) => g.id === 'countryside|river_lake'), rid + ': まだ 出口に なって いない');
  }
});
