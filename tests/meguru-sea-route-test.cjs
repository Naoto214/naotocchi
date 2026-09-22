// ジャングル島への 海路 v1。
// いちばん あつく みるのは「あるいて 行けなく した こと」と、
// 「見つける まで 島も 航路も もれない こと」、そして「Phase 2.1 の しくみを
// そのまま つかって いる こと(べつの transition engine を つくって いない)」
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');

function fakeCtx() {
  const state = { imageSmoothingEnabled: true }, stack = [];
  return new Proxy(state, { get(o, k) {
    if (k in o) return o[k];
    if (k === 'save') return () => stack.push({ ...state });
    if (k === 'restore') return () => { const p = stack.pop(); if (p) Object.assign(state, p); };
    if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} });
    if (k === 'measureText') return (t) => ({ width: String(t).length * 6 });
    if (k === 'getImageData') return () => ({ data: [] });
    return () => {};
  }, set(o, k, v) { o[k] = v; return true; } });
}
function setup(regionId = 'sea', opts = {}) {
  const h = harness(Object.assign({ fullDisplay: true, canvasContext: fakeCtx() }, opts));
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80,
    speciesLine: 'dog', stageIndex: 4, ageTicks: 500 });
  s.petKey = `dog:${h.api.currentFormStageIndex()}`;
  s.discoveredStages = [s.petKey, 'cat:2', 'penguin:3', 'mushroom:0', 'beetle:0', 'ghost:1'];
  s.lifetime.companionsRecruited = ['shiba'];
  s.companions = [{ id: 'shiba', bond: 80 }];
  s.regionId = regionId;
  h.api.render();
  return { h, s, M: h.api.meguruMod };
}
const wd = (M, rec) => M.worldMapData(Object.assign({ regions: [], links: [], marks: {}, zones: {} }, rec));
const GROUND = ['home', 'river_lake', 'countryside', 'forest', 'mountain', 'snow', 'desert', 'city', 'sea', 'jungle'];
const SEA_LINK = 'jungle|sea';

// ──────────────────────────────────────────────── 正本

test('1. さばく ↔ ジャングルの 徒歩の みちは もう ない', () => {
  const { M } = setup();
  const G = M.WORLD_GEOGRAPHY;
  assert.ok(!G.connections.some((c) => c.id === 'desert|jungle'), 'desert|jungle は さくじょ');
  // どの むきの 書きかたでも ない
  for (const c of G.connections) {
    if (!c.b) continue;
    const pair = [c.a, c.b].sort().join('|');
    assert.notEqual(pair, 'desert|jungle', 'さばくと ジャングルは 直接 つながらない');
  }
  // 北西の すなの せかいと、南西の 外洋の しま。むきが ちがう
  const R = G.regions;
  assert.ok(R.desert.mapX < 0 && R.desert.mapY > 0, 'さばくは 北西');
  assert.ok(R.jungle.mapX < 0 && R.jungle.mapY < 0, 'ジャングルは 南西');
  assert.equal(R.desert.mapX, -3.2); assert.equal(R.desert.mapY, 1.4);   // さばくは うごかして いない
  // さばくから あるいて 出られるのは やまと とかい だけ
  const fromDesert = G.connections.filter((c) => c.b && (c.a === 'desert' || c.b === 'desert'))
    .map((c) => (c.a === 'desert' ? c.b : c.a)).sort().join(',');
  assert.equal(fromDesert, 'city,mountain');
});

test('2. jungle|sea は special sea connection。ふつうの 徒歩の みちでは ない', () => {
  const { M } = setup();
  const c = M.WORLD_GEOGRAPHY.connections.find((x) => x.id === SEA_LINK);
  assert.ok(c, '海路が ある');
  assert.equal(c.special, 'sea');
  assert.equal(c.kind, 'sea');
  assert.equal(c.gate.kind, 'sea', 'gate も 徒歩(walk)では ない');
  assert.notEqual(c.gate.kind, 'walk');
  assert.notEqual(c.gate.kind, 'vertical', 'たてじく(ゴンドラ・もぐる)でも ない');
  // のりもの。ちいさな ふね。ごうかきゃくせんでは ない
  assert.equal(c.sea.ride.kind, 'boat');
  assert.equal(c.sea.ride.size, 'small');
  assert.ok(c.sea.ride.name && c.sea.ride.id, 'なまえと id が ある');
  // 出発と 到着の いみデータ
  assert.equal(c.sea.from.region, 'sea'); assert.equal(c.sea.to.region, 'jungle');
  assert.equal(c.sea.layerFrom, 'ground'); assert.equal(c.sea.layerTo, 'ground');
  assert.equal(c.sea.from.anchor, c.mouths.sea);
  assert.equal(c.sea.to.anchor, c.mouths.jungle);
  // たびの だんかい
  assert.equal(c.sea.stages.map((q) => q.id).join(','), 'approach,board,depart,sail,arrive,land');
  for (const q of c.sea.stages) {
    assert.ok(['walk', 'boat'].includes(q.move), q.id + ' の うごきかた');
    if (q.region === null) { assert.equal(q.anchor, null, q.id + ' は 海の うえ(region が ない)'); continue; }
    const w = M.WORLDS[q.region];
    assert.ok(w.spots.some((x) => x.id === q.anchor), `${q.id} の anchor ${q.anchor} は 実在する`);
  }
  // 海の うえの だんかいが 3 つ以上 ある = ほんとうに 外洋を わたって いる
  assert.ok(c.sea.stages.filter((q) => q.move === 'boat').length >= 3, '外洋を わたる だんかいが ある');
});

test('3. 出発と 上陸は、どちらも 実在する 非秘密の spot', () => {
  const { M } = setup();
  const c = M.WORLD_GEOGRAPHY.connections.find((x) => x.id === SEA_LINK);
  const check = (regionId, spotId, note) => {
    const q = M.WORLDS[regionId].spots.find((x) => x.id === spotId);
    assert.ok(q, `${note}: ${regionId}.${spotId} が 実在する`);
    assert.ok(!q.secret, `${note}: ひみつの ばしょでは ない`);
    return q;
  };
  const dep = check('sea', c.mouths.sea, 'うみがわ');
  const arr = check('jungle', c.mouths.jungle, 'ジャングルがわ');
  // うみがわは みなとの あたり、ジャングルがわは しまの 入口
  assert.equal(M.WORLDS.sea.spots.find((q) => q.id === dep.id).zone, 'port', 'のりばは みなとの ちく');
  assert.equal(arr.zone, 'entry', '上陸するのは しまの 入口');
  // gate の ends も おなじ spot を さして いる
  assert.equal(c.gate.ends.sea.spot, dep.id);
  assert.equal(c.gate.ends.jungle.spot, arr.id);
  // ほかの みちと 入口が かぶって いない(かたほうを 見つけただけで 海路が ひらかない)
  const others = M.WORLD_GEOGRAPHY.connections.filter((x) => x.id !== SEA_LINK && x.mouths);
  assert.ok(!others.some((x) => x.mouths.sea === dep.id), 'うみがわの のりばは この 海路 だけの 入口');
});

test('4. 外洋は region では ない。non-region geography として もって いる', () => {
  const { M } = setup();
  const c = M.WORLD_GEOGRAPHY.connections.find((x) => x.id === SEA_LINK);
  const w = c.sea.waters;
  assert.ok(w, 'わたる 海の いみデータが ある');
  assert.equal(w.region, null, 'region では ない');
  assert.ok(!M.WORLD_GEOGRAPHY.regions[w.id], '地域の ひょうにも いない');
  assert.ok(!M.WORLDS[w.id], '地域の せかいも もたない');
  assert.ok(w.far && w.far.length > 8, 'とおくから 見える ときの けしきが ある');
  assert.equal(w.role, 'beyond');
});

// ──────────────────────────────────────────────── Phase 2.1 の しくみの 再利用

test('5. 海路は Phase 2.1 の transition 正本に そのまま のって いる', () => {
  const { M } = setup();
  // way は 4 つに なった。approach → cross → arrive → settle は ぜんぶ おなじ
  assert.equal(Object.keys(M.TRANSITION.ways).sort().join(','), 'down,sail,up,walk');
  const spec = M.TRANSITION.ways.sail;
  assert.equal(spec.swap, 'cross'); assert.equal(spec.release, 'settle');
  assert.equal(Object.keys(spec.span).sort().join(','), 'approach,arrive,cross,settle');
  // gate から plan が できる。way は 'sail'
  const gates = M.regionGates('sea', M.buildWorld('sea', M.buildRegistry()));
  const g = gates.find((x) => x.id === SEA_LINK);
  assert.ok(g, 'うみがわに 海路の gate が ある');
  assert.equal(g.way, 'sail'); assert.equal(g.kind, 'sea');
  assert.equal(g.isleTo, true, 'わたった さきは しま');
  assert.equal(g.isleFrom, false);
  const plan = M.transitionPlan(g, {});
  assert.equal(plan.phases.map((q) => q.id).join(','), 'approach,cross,arrive,settle');
  assert.equal(M.transitionCover(plan, plan.swapAt + 0.01), 1, 'こえて いる あいだは すけない');
  assert.ok(plan.releaseAt > plan.swapAt, '操作が もどるのは 入れかえの あと');
  // plan に Canvas の つごうは 入って いない
  const json = JSON.stringify(plan);
  for (const bad of ['rgba', '#', 'canvas', 'ctx', 'px']) assert.ok(!json.includes(bad), `plan に ${bad} は 入らない`);
});

test('6. 初回は すこし ながく、2 かいめ からは みじかい。よいやすい せっていも きく', () => {
  const { M } = setup();
  const g = M.regionGates('sea', M.buildWorld('sea', M.buildRegistry())).find((x) => x.id === SEA_LINK);
  const first = M.transitionPlan(g, {}).total;
  const again = M.transitionPlan(g, { repeat: true }).total;
  const soft = M.transitionPlan(g, { reduced: true }).total;
  assert.ok(Math.abs(again / first - M.TRANSITION.repeat) < 0.02, `2 かいめは ${M.TRANSITION.repeat} ばい`);
  assert.ok(Math.abs(soft / first - M.TRANSITION.reduced) < 0.02, `よいやすい せっていは ${M.TRANSITION.reduced} ばい`);
  // ながすぎない。ゴンドラの 2 ばい いないに おさめる
  const up = M.transitionPlan({ way: 'up' }, {}).total;
  assert.ok(first < up * 2, `初回 ${first.toFixed(2)}s は ゴンドラ ${up.toFixed(2)}s の 2 ばい いない`);
  assert.ok(first <= 3.6, `初回 ${first.toFixed(2)}s は 3.6s いない`);
  assert.ok(again <= 2.3, `2 かいめ ${again.toFixed(2)}s は 2.3s いない`);
  // 端末の おもさで つぶを へらす しくみも そのまま
  assert.equal(M.transitionPlan(g, { tier: 0 }).density, M.TRANSITION.density[0]);
  assert.equal(M.transitionPlan(g, { tier: 2 }).density, M.TRANSITION.density[2]);
  assert.ok(M.transitionPlan(g, { tier: 2 }).density < M.transitionPlan(g, { tier: 0 }).density);
});

test('7. 音は sim/world がわ。え の がわは 音を 鳴らさない', () => {
  const src = require('node:fs').readFileSync('meguru.js', 'utf8');
  const i = src.indexOf('function drawTransition');
  assert.ok(i > 0);
  const body = src.slice(i, src.indexOf('\n      }', src.indexOf('ctx.restore();', i)));
  assert.ok(!/\bsfx\(/.test(body), 'drawTransition は 音を 鳴らさない');
  // 海の えの なかに 生きものを 足して いない(景色の 生きものは 住民台帳 由来だけ)
  for (const bad of ['🐟', '🐬', '🐋', '🕊', '🐦', '🦈', '🐠']) {
    assert.ok(!body.includes(bad), bad + ' を 海の えに 足して いない');
  }
});

// ──────────────────────────────────────────────── じっさいに わたる

function ride(h, from) {
  const run = h.api.meguruRun(), sim = run.sim;
  const g = sim.gates.find((x) => x.id === SEA_LINK);
  assert.ok(g, from + ' に 海路の のりばが ある');
  run.setPlayer(g.spot.x, g.spot.z); h.advance(80);
  assert.ok(sim.gateHere(), from + ': のりばの うえに 立って いる');
  const act = h.get('meguruOverlay').querySelector('#mgrTalk');
  assert.equal(act.classList.contains('hidden'), false, from + ': ふねに のる ボタンが 出る');
  assert.match(act.textContent, /ふね/);
  h.dispatch(act, 'click');
  return { run, sim, act };
}

test('8. うみ → ふね → ジャングル。もどりも おなじ しくみで わたれる', () => {
  const { h, s } = setup('sea');
  assert.equal(h.api.startMeguru(), true);
  const { run } = ride(h, 'うみ');
  h.advance(16);
  const travel = h.get('meguruOverlay').querySelector('#mgrTravel');
  assert.equal(travel.disabled, true, 'わたって いる あいだは たびを ひらけない');
  h.advance(8000);
  assert.equal(s.regionId, 'jungle', 'しまへ ついた');
  assert.equal(run.world.regionId, 'jungle');
  assert.equal(travel.disabled, false, 'ついたら ボタンが もどる');
  // 上陸した ところは 正本の 上陸地点
  const c = h.api.meguruMod.WORLD_GEOGRAPHY.connections.find((x) => x.id === SEA_LINK);
  const arr = run.world.spots.find((q) => q.id === c.mouths.jungle);
  assert.ok(Math.hypot(run.player.x - arr.x, run.player.z - arr.z) < arr.r * 2.2, '入口の ちかくに 立って いる');
  // 復路
  const back = ride(h, 'ジャングル');
  h.advance(8000);
  assert.equal(s.regionId, 'sea', 'ほんどへ もどった');
  assert.equal(back.run.world.regionId, 'sea');
  h.api.stopMeguru();
});

test('9. なかまは いっしょに わたる。住民は のせない。二重に 出ない', () => {
  const { h, s } = setup('sea');
  assert.equal(h.api.startMeguru(), true);
  const run = h.api.meguruRun();
  const party0 = run.party.map((a) => a.key).sort().join(',');
  assert.ok(party0.length > 0, 'なかまが いっしょに あるいて いる');
  ride(h, 'うみ');
  h.advance(8000);
  assert.equal(s.regionId, 'jungle');
  const party1 = run.party.map((a) => a.key).sort().join(',');
  assert.equal(party1, party0, 'おなじ なかまが ついて きた');
  // 二重に 出ない: なかまは 住民の なかに いない
  const res = run.world.residents.map((a) => a.key);
  for (const k of run.party.map((a) => a.key)) assert.ok(!res.includes(k), k + ' は 住民として 二重に 出ない');
  assert.equal(new Set(res).size, res.length, '住民の なかにも 二重は ない');
  // 住民は 船に のって 地域を またがない: しまの 住民は しまの 台帳 どおり
  const reg = h.api.meguruMod.buildRegistry();
  const should = reg.residents.filter((r) => r.region === 'jungle' && !r.withPlayer).map((r) => r.key).sort().join(',');
  assert.equal(res.slice().sort().join(','), should, 'しまに いるのは しまの 住民だけ');
  h.api.stopMeguru();
});

test('10. わたって いる あいだ、二重に はじまらない。ボタンも ぜんぶ ロックされる', () => {
  const { h, s } = setup('sea');
  assert.equal(h.api.startMeguru(), true);
  const ov = h.get('meguruOverlay');
  const { run, act } = ride(h, 'うみ');
  h.advance(16);
  const z0 = run.player.z;
  // もう いちど おしても、二重には はじまらない
  h.dispatch(act, 'click'); h.dispatch(act, 'click');
  assert.equal(act.classList.contains('hidden'), true, 'わたって いる あいだ その ばの ボタンは 出ない');
  for (const id of ['mgrTravel', 'mgrHome', 'mgrMap']) {
    assert.equal(ov.querySelector('#' + id).disabled, true, id + ' は ロック');
  }
  h.advance(8000);
  assert.equal(s.regionId, 'jungle', '1 かいだけ わたった');
  assert.notEqual(run.player.z, z0);
  for (const id of ['mgrTravel', 'mgrHome', 'mgrMap']) {
    assert.equal(ov.querySelector('#' + id).disabled, false, id + ' は もどる');
  }
  h.api.stopMeguru();
});

test('11. 「たび」は これまで どおり。あるいて 行けなくても たびでは 行ける', () => {
  const { h, s } = setup('desert');
  assert.equal(h.api.startMeguru(), true);
  // さばくから ジャングルへの 徒歩の gate は ない
  const sim = h.api.meguruRun().sim;
  assert.ok(!sim.gates.some((g) => g.to === 'jungle'), 'さばくから しまへ あるいては 行けない');
  // それでも たびでは 行ける(travelToRegion は 無変更)
  const jungle = h.api.REGIONS.find((r) => r.id === 'jungle');
  h.api.travelToRegion(jungle, { id: 'jungle' });
  assert.equal(s.regionId, 'jungle', 'たびでは これまでどおり 行ける');
  h.advance(120);
  assert.equal(h.api.meguruRun().world.regionId, 'jungle');
  h.api.stopMeguru();
});

// ──────────────────────────────────────────────── 世界地図

test('12. 海路を 見つける まで、島も 航路も 1 つも もれない', () => {
  const { M } = setup();
  const G = M.WORLD_GEOGRAPHY;
  const c = G.connections.find((x) => x.id === SEA_LINK);
  // ① うみだけ 見つけた: 航路も しまも 出ない
  const onlySea = wd(M, { regions: ['home', 'city', 'sea'], links: [SEA_LINK] });
  assert.ok(!onlySea.links.some((l) => l.id === SEA_LINK), 'ジャングルを 見つける まで 航路は 出ない');
  assert.ok(!onlySea.regions.some((r) => r.id === 'jungle'));
  const j1 = JSON.stringify(onlySea);
  assert.ok(!j1.includes('jungle'), 'しまの なまえが もれない');
  assert.ok(!j1.includes(c.sea.ride.name) && !j1.includes(c.sea.ride.id), 'ふねの そんざいも もれない');
  assert.ok(!j1.includes(c.label), '航路の なまえも もれない');
  for (const f of G.features.filter((x) => x.kind === 'island')) {
    assert.ok(!j1.includes(f.id) && !j1.includes(f.label), f.id + ' が もれない');
  }
  // ② しまを 見つけた けれど 航路は まだ: しまは 出るが 線は 出ない(#24)
  const noRoute = wd(M, { regions: GROUND, links: [] });
  assert.ok(noRoute.regions.some((r) => r.id === 'jungle'), 'しまは 出る');
  assert.ok(!noRoute.links.some((l) => l.id === SEA_LINK), 'まだ 見つけて いない 航路は 出ない');
  // ③ 航路も 見つけた: そこで はじめて 線が 出る
  const both = wd(M, { regions: GROUND, links: [SEA_LINK] });
  const ln = both.links.find((l) => l.id === SEA_LINK);
  assert.ok(ln, '見つけたら 出る');
  assert.equal(ln.special, 'sea', '徒歩の みちとは べつの しゅるいだと わかる');
});

test('13. 海路の はっけんは、りょうがわの 入口を どちらも 見つけた ときだけ', () => {
  const { M } = setup();
  const c = M.WORLD_GEOGRAPHY.connections.find((x) => x.id === SEA_LINK);
  assert.equal(M.worldLinksFrom({ sea: [c.mouths.sea] }).length, 0, 'みなとの のりばだけでは ひらかない');
  assert.equal(M.worldLinksFrom({ jungle: [c.mouths.jungle] }).length, 0, 'しまの 入口だけでも ひらかない');
  assert.equal(M.worldLinksFrom({ sea: [c.mouths.sea], jungle: [c.mouths.jungle] }).join(','), SEA_LINK);
});

test('14. 世界地図の 海路は 徒歩の みちと おなじ 線に しない', () => {
  const src = require('node:fs').readFileSync('meguru.js', 'utf8');
  const i = src.indexOf('見つけた 海路');
  assert.ok(i > 0, '海路を かく ところが ある');
  const body = src.slice(i, src.indexOf('見つけた 大 landmark', i));
  assert.ok(/ln\.special !== 'sea'/.test(body), '海路だけを えらんで かいて いる');
  // 徒歩の みちの がわは 海路を 2 ど かかない
  assert.ok(/ln\.layer !== 'ground' \|\| ln\.special/.test(body), '徒歩の みちの ループは 海路を とばす');
});

// ──────────────────────────────────────────────── かぞえかた と なかみ

test('15. 探索率: 通常 link の ぶんぼに ひみつも ゴンドラも 入って いない', () => {
  const { M } = setup();
  const C = M.worldCountable();
  assert.equal(C.regions.length, 11);
  assert.equal(C.links.length, 12, 'Phase 3B-Final で いなか|みずべ を けした ぶん 13 → 12');
  assert.equal(C.tier1, 17); assert.equal(C.zones, 103);
  assert.ok(C.links.includes(SEA_LINK), '海路も 世界の 主要な みちとして かぞえる');
  assert.ok(!C.links.includes('desert|jungle'));
  assert.ok(!C.links.includes('countryside|star_stop'), 'ゴンドラは これまでどおり ぶんぼに 入らない');
  // 0% は 0、ぜんぶ 見つけると 100%
  assert.equal(wd(M, { regions: [] }).progress.percent, 0);
  const marks = {}, zones = {};
  for (const id of C.regions) marks[id] = M.worldTier1(id).map((m) => m.mid);
  for (const id of Object.keys(M.WORLDS)) zones[id] = (M.WORLDS[id].zones || []).map((z) => z.id);
  const done = wd(M, { regions: Object.keys(M.WORLD_GEOGRAPHY.regions), links: C.links, marks, zones });
  assert.equal(done.progress.percent, 100, 'ほしぞらへ 行かなくても 100% に できる');
  assert.equal(done.progress.linkTotal, 12);
});

test('16. 地域の なかみは 1 つも かわって いない', () => {
  const { M } = setup();
  const j = M.WORLDS.jungle;
  assert.equal(j.spots.length, 40); assert.equal(j.paths.length, 57); assert.equal(j.zones.length, 10);
  assert.equal(j.spots.filter((q) => q.secret).length + j.paths.filter((q) => q[2] === 'secret').length, 10);
  const sea = M.WORLDS.sea;
  assert.equal(sea.spots.length, 35); assert.equal(sea.zones.length, 10);
  // 13 地域あわせた かずも 正本の まま
  let spots = 0, paths = 0, zones = 0, secret = 0;
  for (const id of Object.keys(M.WORLDS)) {
    const w = M.WORLDS[id];
    spots += w.spots.length; paths += w.paths.length; zones += w.zones.length;
    secret += w.spots.filter((q) => q.secret).length + w.paths.filter((q) => q[2] === 'secret').length;
  }
  assert.equal(spots, 471); assert.equal(paths, 654); assert.equal(zones, 118); assert.equal(secret, 107);
});

test('17. ひみつは 1 つも 世界地図へ もれない(海路を 足した あとも)', () => {
  const { M } = setup();
  const C = M.worldCountable();
  const full = wd(M, { regions: Object.keys(M.WORLD_GEOGRAPHY.regions), links: C.links.concat([SEA_LINK]) });
  const json = JSON.stringify(full);
  assert.ok(!/secret/.test(json), 'ひみつ という ことばすら 出ない');
  const vocab = new Set(['deep', 'lake', 'river', 'mist', 'sky', 'sand', 'city', 'home', 'forest', 'jungle', 'shore', 'sea']);
  const ids = new Set();
  const walk = (v) => { if (typeof v === 'string') ids.add(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  walk(full);
  for (const id of Object.keys(M.WORLDS)) for (const q of (M.WORLDS[id].spots || [])) {
    if (q.secret && !vocab.has(q.id)) assert.ok(!ids.has(q.id), `${id}.${q.id}(ひみつ)が もれない`);
  }
  // 海路の だんかいの ことばも 地図には 出さない
  const c = M.WORLD_GEOGRAPHY.connections.find((x) => x.id === SEA_LINK);
  for (const q of c.sea.stages) assert.ok(!json.includes(q.note), 'だんかいの ことばは 地図に のらない');
  assert.ok(!json.includes(c.sea.waters.far), '外洋の けしきの ことばも のらない');
});
