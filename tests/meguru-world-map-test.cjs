// なおとっち世界 正式地理 v1(D案)と、せかいのちず Phase 1。
// いちばん あつく みるのは「まだ 行って いない ところ」と「ひみつ」が
// せかいのちずから もれない こと。つぎに、region-local な せかいを 1つも
// こわして いない こと
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');

const ALL = ['home', 'city', 'countryside', 'forest', 'mountain', 'snow', 'sea', 'deepsea', 'river_lake', 'jungle', 'desert', 'star_stop', 'memory_lake'];
// 正本の 17本(#2)。ここが ずれたら 地理が かわった ということ
const LINKS = ['snow|mountain', 'forest|snow', 'forest|mountain', 'mountain|river_lake', 'desert|mountain',
  'countryside|forest', 'countryside|river_lake', 'countryside|home', 'city|countryside', 'city|home',
  'city|sea', 'jungle|sea', 'desert|jungle', 'city|desert', 'deepsea|sea', 'sea|star_stop', 'memory_lake'];

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
function setup(opts = {}) {
  const h = harness(Object.assign({ fullDisplay: true, canvasContext: fakeCtx() }, opts));
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, energy: 100, health: 100, hunger: 80, speciesLine: 'dog', stageIndex: 4, ageTicks: 500 });
  s.petKey = `dog:${h.api.currentFormStageIndex()}`;
  s.discoveredStages = [s.petKey, 'cat:2', 'penguin:3', 'mushroom:0'];
  s.regionId = opts.regionId || 'forest';
  h.api.render();
  return { h, M: h.api.meguruMod, s };
}
const wd = (M, rec) => M.worldMapData(Object.assign({ regions: [], links: [], marks: {}, zones: {} }, rec));

test('1. 正式地理 v1: 13地域が 1回ずつ、地上10・水面下1・上空1・記憶1', () => {
  const { M } = setup();
  const G = M.WORLD_GEOGRAPHY;
  assert.equal(G.version, 1); assert.equal(G.plan, 'D');
  assert.equal(Object.keys(G.regions).length, 13);
  for (const id of ALL) assert.ok(G.regions[id], `${id} が 正式地理に ある`);
  for (const id of Object.keys(M.WORLDS)) assert.ok(G.regions[id], `WORLDS の ${id} が 正式地理に ある`);
  const by = (l) => Object.keys(G.regions).filter((id) => G.regions[id].layer === l);
  assert.equal(by('ground').length, 10); assert.equal(by('below').join(','), 'deepsea');
  assert.equal(by('sky').join(','), 'star_stop'); assert.equal(by('memory').join(','), 'memory_lake');
});

test('2. 接続表が 正本の 17本と ぴったり あう。入口の spot も ぜんぶ 実在して、ひみつでは ない', () => {
  const { M } = setup();
  const G = M.WORLD_GEOGRAPHY;
  assert.equal(G.connections.map((c) => c.id).join(','), LINKS.join(','));
  const deg = {};
  for (const c of G.connections) {
    assert.ok(G.regions[c.a], `${c.id}: ${c.a}`);
    if (!c.b) { assert.equal(c.layer, 'memory'); continue; }
    assert.ok(G.regions[c.b], `${c.id}: ${c.b}`);
    deg[c.a] = (deg[c.a] || 0) + 1; deg[c.b] = (deg[c.b] || 0) + 1;
    for (const rid of Object.keys(c.mouths)) {
      const q = (M.WORLDS[rid].spots || []).find((x) => x.id === c.mouths[rid]);
      assert.ok(q, `${c.id}: ${rid}.${c.mouths[rid]} が 実在する spot`);
      assert.ok(!q.secret, `${c.id}: 入口が ひみつ spot では ない`);
    }
  }
  // どこにも つながらない 地上 region は ない。5本も 6本も つながる 地域も ない
  for (const id of Object.keys(G.regions)) {
    if (G.regions[id].layer === 'memory') continue;
    assert.ok(deg[id] >= 1, `${id} は どこかに つながる`);
    assert.ok(deg[id] <= 4, `${id} の 接続は 4本まで(${deg[id]})`);
  }
  // せいかつけんの 三角ループ(#8)
  for (const id of ['countryside|home', 'city|home', 'city|countryside']) assert.ok(LINKS.includes(id));
});

test('3. 大河は 山麓の湖 → かわ・みずうみ → いなか → とかい → 湾 まで 1本で つながり、下流へ 下る', () => {
  const { M } = setup();
  const r = M.WORLD_GEOGRAPHY.features.find((f) => f.id === 'great-river');
  const seq = []; for (const p of r.points) if (seq[seq.length - 1] !== p.region) seq.push(p.region);
  assert.equal(seq.join(' → '), 'mountain → river_lake → countryside → city → sea');
  for (let i = 1; i < r.points.length; i++) assert.ok(r.points[i].y < r.points[i - 1].y, `点 ${i} が 下流へ 下って いる`);
  assert.ok(!seq.includes('home'), 'おうちは 通らない(home に みずの zone が 1つも ない)');
  // 山系も 1本(#5)
  const sp = M.WORLD_GEOGRAPHY.features.find((f) => f.id === 'spine');
  const s2 = []; for (const p of sp.points) if (s2[s2.length - 1] !== p.region) s2.push(p.region);
  assert.equal(s2.join(' → '), 'snow → mountain → forest');
});

test('4/5. 特殊層は 地上の となりに ならばない。きおくのみずうみは global 座標を もたない', () => {
  const { M } = setup();
  const G = M.WORLD_GEOGRAPHY;
  assert.equal(G.regions.memory_lake.mapX, null);
  assert.equal(G.regions.memory_lake.mapY, null);
  // しんかい と ほしぞら は「湾の口」の おなじ 一点の 下と上
  assert.equal(G.regions.deepsea.mapX, G.axis.mapX); assert.equal(G.regions.deepsea.mapY, G.axis.mapY);
  assert.equal(G.regions.star_stop.mapX, G.axis.mapX); assert.equal(G.regions.star_stop.mapY, G.axis.mapY);
  assert.ok(G.regions.deepsea.depth < 0 && G.regions.star_stop.height > 0);
  // ぜんぶ 見つけて いても、地上の 地域として ならばない
  const all = wd(M, { regions: ALL });
  const ids = all.regions.map((r) => r.id);
  for (const id of ['deepsea', 'star_stop', 'memory_lake']) assert.ok(!ids.includes(id), `${id} は 地上の 地域として 出ない`);
  assert.equal(ids.length, 10);
  assert.ok(all.axis.sky && all.axis.deep, 'たてじくの 上下として 出る');
  assert.ok(all.layers.memory, 'きおくは べつの きろくとして もつ');
  assert.ok(!JSON.stringify(all.regions).includes('memory_lake'), 'きおくが 地上の データに まぎれこまない');
});

test('6/7/8. まだ 見つけて いない 地域・みち・大めじるしは、なまえも かたちも 出ない', () => {
  const { M } = setup();
  const only = wd(M, { regions: ['home'], links: LINKS.slice(), marks: { home: ['lm:bigtree'], forest: ['lm:great'] } });
  assert.equal(only.regions.length, 1, 'おうちだけ');
  assert.equal(only.regions[0].id, 'home');
  const json = JSON.stringify(only);
  for (const id of ['countryside', 'city', 'forest', 'mountain', 'snow', 'sea', 'jungle', 'desert', 'river_lake']) {
    assert.ok(!only.regions.some((r) => r.id === id), `${id} の かたちが 出ない`);
  }
  // みちは りょうはしの 地域を 見つけて いない かぎり 出ない(links に ぜんぶ 入れて いても)
  assert.equal(only.links.length, 0, 'みちが 1本も 出ない');
  // 地形も、見つけた 地域の 点しか「on」に ならない
  for (const f of only.features) for (const p of f.points) if (p.on) assert.equal(p.region, 'home');
  // 見つけて いない 地域の 大めじるしは 出ない
  assert.equal(only.regions[0].marks.length, 1, 'おうちの 大めじるしだけ');
  assert.ok(!json.includes('lm:great'), 'もりの 大めじるしは 出ない');
  // たてじくも、見つけて いなければ そんざいを ばらさない
  assert.ok(!only.axis.sky && !only.axis.deep && !only.axis.ground);
});

test('9. ひみつ spot・ひみつ path・ひみつ zone が せかいのちずへ 1つも もれない', () => {
  const { M } = setup();
  const full = wd(M, { regions: ALL, links: LINKS.slice(), marks: {}, zones: {} });
  const json = JSON.stringify(full);
  // せかいのちずは spot を 1つも もたない(#24)。もつ キーは ここに ある ものだけ
  const KEYS = ['id', 'label', 'x', 'y', 'axis', 'layer', 'climate', 'terrain', 'belt', 'river',
    'rx', 'ry', 'ground', 'here', 'marks'];
  for (const r of full.regions) assert.equal(Object.keys(r).sort().join(','), KEYS.slice().sort().join(','), `${r.id} の キー`);
  assert.ok(!/secret/.test(json), 'ひみつ という ことばすら 出ない');
  // ひみつ spot の id が 値として のこって いない(terrain の ことばと かぶる ものは のぞく)
  const vocab = new Set(['deep', 'lake', 'river', 'mist', 'sky', 'sand', 'city', 'home', 'forest', 'jungle', 'shore']);
  const ids = new Set();
  const walk = (v) => { if (typeof v === 'string') ids.add(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  walk(full);
  for (const id of ALL) for (const q of (M.WORLDS[id].spots || [])) {
    if (q.secret && !vocab.has(q.id)) assert.ok(!ids.has(q.id), `${id}.${q.id}(ひみつ)が もれない`);
  }
  // ひみつの みちも 出ない: せかいのちずの みちは 正本の 17本の id しか とらない
  for (const ln of full.links) assert.ok(LINKS.includes(ln.id), `${ln.id} は 正本の みち`);
  // 大めじるしは tier1 だけ。ひみつの ものは そもそも ない
  for (const id of ALL) for (const m of M.worldTier1(id)) {
    const q = M.WORLDS[id].spots.find((x) => x.id === m.spot);
    assert.ok(!q.secret, `${id}: 大めじるしが ひみつ spot では ない`);
  }
});

test('10. 旧セーブの 訪問ずみ 地域が、そのまま 見つけた ことに なる。でも みちは ひらかない', () => {
  const { M, s } = setup();
  s.lifetime.regionsVisited = ['home', 'countryside', 'city'];
  s.lifetime.specialRegionsVisited = ['star_stop'];
  const seeded = M.seedWorldRegions(s.lifetime);
  assert.equal(seeded.slice().sort().join(','), 'city,countryside,home,star_stop');
  // 地域へ 行った ことが ある だけでは、あいだの みちは 1本も ひらかない(#22, #46)
  assert.equal(M.worldLinksFrom({}).length, 0);
  assert.equal(M.worldLinksFrom({ home: [], countryside: [], city: [] }).length, 0);
  // はじめての ひとも おうちだけは わかる(#47)
  assert.equal(M.seedWorldRegions({ regionsVisited: [], specialRegionsVisited: [] }).join(','), 'home');
  // ありえない id は まぎれこまない
  assert.equal(M.seedWorldRegions({ regionsVisited: ['nowhere', 'home'] }).join(','), 'home');
});

test('11. みちは りょうがわの 入口 spot を どちらも 見つけた ときだけ ひらく', () => {
  const { M } = setup();
  const c = M.WORLD_GEOGRAPHY.connections.find((x) => x.id === 'countryside|home');
  assert.equal(M.worldLinksFrom({ countryside: [c.mouths.countryside] }).length, 0, 'かたがわだけでは ひらかない');
  assert.equal(M.worldLinksFrom({ home: [c.mouths.home] }).length, 0, 'はんたいがわだけでも ひらかない');
  assert.equal(M.worldLinksFrom({ countryside: [c.mouths.countryside], home: [c.mouths.home] }).join(','), 'countryside|home');
  // ぜんぶの spot を 見つけると 17本のうち 16本(きおくは みちでは ない)
  const every = {}; for (const id of ALL) every[id] = M.WORLDS[id].spots.map((q) => q.id);
  assert.equal(M.worldLinksFrom(every).length, 16);
});

test('12. せかい たんさくりつ: ぶんぼに ひみつが 1つも 入って いない', () => {
  const { M } = setup();
  const C = M.worldCountable();
  assert.equal(C.regions.length, 11, '通常 11 地域(しんかい こみ)');
  assert.ok(!C.regions.includes('star_stop') && !C.regions.includes('memory_lake'));
  assert.equal(C.links.length, 15, 'ぶんぼの みちは 通常 11 地域を むすぶ ものだけ');
  assert.equal(C.tier1, 17, '通常 11 地域の 大めじるし');
  assert.equal(C.zones, 103, '通常 11 地域の ちく');
  // ぶんぼの ちくは ぜんぶ 非秘密 spot を もつ = ひみつだけの ちくは 入って いない
  let openZones = 0;
  for (const id of C.regions) for (const z of M.WORLDS[id].zones) {
    if (M.WORLDS[id].spots.some((q) => q.zone === z.id && !q.secret)) openZones += 1;
  }
  assert.equal(openZones, C.zones, 'ぶんぼの ちくは すべて ひみつ なしで 行ける');
  // 0% と 100%
  assert.equal(wd(M, { regions: [] }).progress.percent, 0);
  const marks = {}, zones = {};
  for (const id of C.regions) { marks[id] = M.worldTier1(id).map((m) => m.mid); zones[id] = M.WORLDS[id].zones.map((z) => z.id); }
  const done = wd(M, { regions: C.regions.slice(), links: C.links.slice(), marks, zones });
  assert.equal(done.progress.percent, 100, 'ひみつ 0 こ・ほしぞら なし・きおく なしで 100% に なる');
  assert.ok(!done.axis.sky, 'ほしぞらは 100% の じょうけんでは ない');
});

test('13. たんさくりつから のこりの ひみつの かずが ぎゃくさんできない', () => {
  const { M } = setup();
  const C = M.worldCountable();
  const p = (extra) => wd(M, Object.assign({ regions: C.regions.slice(), links: C.links.slice() }, extra)).progress;
  const a = p({}), b = p({ marks: { forest: M.worldTier1('forest').map((m) => m.mid) } });
  // ぶんぼは ひみつを 見つけても 見つけなくても うごかない ていすう
  assert.equal(a.regionTotal, b.regionTotal); assert.equal(a.linkTotal, b.linkTotal);
  assert.equal(a.markTotal, b.markTotal); assert.equal(a.zoneTotal, b.zoneTotal);
  assert.equal(a.markTotal, 17); assert.equal(a.zoneTotal, 103);
  // ぶんぼは ぜんぶ「ひみつを 1つも ふくまない」ていすう。107 という かずは どこにも 出ない
  assert.ok(!JSON.stringify(a).includes('107'));
});

test('14. 図上の おおきさ: おうちが 点に ならず、さばくの ひろさも のこる', () => {
  const { M } = setup();
  const side = (id) => M.worldMapSide(id);
  assert.ok(side('desert') > side('forest'), 'さばくが いちばん おおきい');
  assert.ok(side('home') >= 5.5, 'おうちに 下限が ある');
  assert.ok(side('desert') / side('home') < 2.0, '実面積 8.67ばい が 図上では 2ばい 未満');
  assert.ok(side('desert') / side('home') > 1.5, 'それでも はっきり 大きい');
  // ほそながさは ほんとうの world の かたちから
  const sh = (id) => M.worldMapShape(id);
  assert.ok(sh('mountain').ry / sh('mountain').rx > 2.0, 'やまは ほそながい おね');
  assert.ok(sh('sea').ry / sh('sea').rx > 2.0, 'うみは 岸の おび');
  assert.ok(sh('desert').ry / sh('desert').rx < 1.5, 'さばくは ひろい');
});

test('15. GEO_AREA は 実際の world から 測った 値と あう(halfW では なく 実 box)', () => {
  const { M } = setup();
  const reg = M.buildRegistry();
  for (const id of ALL) {
    const w = M.buildWorld(id, reg);
    const real = (w.maxX - w.minX) * w.len / 1e6;
    const side = M.worldMapSide(id);
    const expect = Math.max(Math.sqrt(real) + 2, id === 'home' ? 5.5 : 0);
    assert.ok(Math.abs(side - expect) < 0.02, `${id}: 図上サイズが 実面積 ${real.toFixed(2)} から 出て いる`);
  }
});

test('16. せかいのちずから 地域の ちずへ 入れて、もどれる。開いただけでは 発見状態が かわらない', () => {
  const { h, s } = setup({ regionId: 'forest' });
  s.lifetime.regionsVisited = ['home', 'countryside', 'forest'];
  assert.equal(h.api.startMeguru(), true);
  const run = h.api.meguruRun();
  run.setPlayer(0, 400); h.advance(120);
  const before = JSON.stringify(s.lifetime.meguru.spots);
  run.openMap();
  const ms = run.mapScreen;
  assert.equal(ms.mode, 'region'); assert.equal(ms.viewRegion, 'forest');
  ms.openWorld();
  assert.equal(ms.mode, 'world', 'せかいへ 入れる');
  assert.ok(ms.hits.length >= 3, '見つけた 地域が タップできる');
  assert.ok(ms.hits.every((q) => ['home', 'countryside', 'forest'].includes(q.id)), '見つけた 地域だけ');
  ms.openRegion('countryside');
  assert.equal(ms.mode, 'region'); assert.equal(ms.viewRegion, 'countryside', 'ほかの 地域の ちずが 見られる');
  assert.equal(s.regionId, 'forest', 'でも そこへ ワープは しない(#32)');
  assert.equal(ms.back(), true); assert.equal(ms.mode, 'world', 'せかいへ もどる');
  assert.equal(ms.back(), true); assert.equal(ms.mode, 'region'); assert.equal(ms.viewRegion, 'forest', 'もとの 地域の ちずへ もどる');
  assert.equal(ms.back(), false, 'いちばん うえまで もどったら もう もどらない');
  assert.equal(JSON.stringify(s.lifetime.meguru.spots), before, 'せかいのちずを ひらいても 地域の 発見状態は 1つも かわらない');
  run.closeMap(); run.stop();
});

test('17. せかいのちずを とじて いる あいだ、たんさくの けいさんは 1フレームも ふえない', () => {
  const { h, s } = setup();
  s.lifetime.regionsVisited = ['home', 'forest'];
  assert.equal(h.api.startMeguru(), true);
  const run = h.api.meguruRun();
  h.advance(400);
  const f0 = run.sim.view().frame;
  h.advance(1000);
  const walked = run.sim.view().frame - f0;
  run.openMap(); run.mapScreen.openWorld();
  const f1 = run.sim.view().frame;
  h.advance(1000);
  assert.equal(run.sim.view().frame, f1, 'ちずを ひらいて いる あいだは せかいが とまる');
  run.closeMap();
  const f2 = run.sim.view().frame;
  h.advance(1000);
  assert.ok(run.sim.view().frame - f2 >= walked * 0.5, 'とじたら もとどおり うごく');
  run.stop();
});

test('18. せかいのちずの セーブは id だけ。地域の はっけんと みちの はっけんを べつに もつ', () => {
  const { h, s } = setup();
  s.lifetime.regionsVisited = ['home', 'countryside', 'forest'];
  assert.equal(h.api.startMeguru(), true);
  const run = h.api.meguruRun();
  run.openMap(); run.mapScreen.openWorld();
  const w = s.lifetime.meguru.world;
  assert.ok(w && Array.isArray(w.regions) && Array.isArray(w.links), 'いれものは 2つだけ');
  assert.ok(w.regions.includes('home') && w.regions.includes('forest'));
  const json = JSON.stringify(w);
  assert.ok(!/-?\d+\.\d+/.test(json), 'ざひょうは 1つも のこさない');
  assert.ok(json.length < 800, `id の あつまり だけなので ちいさい(${json.length} バイト)`);
  run.closeMap(); run.stop();
});

test('19. 旧セーブ(せかいの きろくが ない)でも こわれない', () => {
  const { h, s, M } = setup();
  delete s.lifetime.meguru.world;                       // Phase 1 より まえの セーブ
  s.lifetime.regionsVisited = ['home', 'sea'];
  assert.equal(h.api.startMeguru(), true);
  const run = h.api.meguruRun();
  run.openMap(); run.mapScreen.openWorld();
  assert.equal(run.mapScreen.mode, 'world', 'それでも せかいの ちずが ひらく');
  assert.ok(s.lifetime.meguru.world.regions.includes('sea'), 'いれものが つくられ、旧セーブから 組みなおされる');
  run.closeMap(); run.stop();
});

test('20. 地域の ちずは これまでどおり。せかいのちずの ために 1つも かわって いない', () => {
  const { M } = setup();
  const sim = M.createSimulation({ regionId: 'forest', discovered: [] });
  const md = sim.mapData();
  for (const k of ['regionId', 'len', 'halfW', 'ground', 'terrain', 'zones', 'spots', 'paths', 'landmarks', 'here', 'progress']) {
    assert.ok(k in md, `mapData に ${k} が のこって いる`);
  }
  assert.ok(md.here && typeof md.here.x === 'number', 'いまいる ところは これまでどおり ある');
  // ほかの 地域ぶんも、おなじ かんすうで 組める(いまいる ところ だけ null)
  const reg = M.buildRegistry();
  const other = M.computeMapData(M.buildWorld('sea', reg), {
    discovered: new Set(), visitedZones: new Set(), walkedPaths: new Set(), foundMarks: new Set(), here: null, hereSpot: null });
  assert.equal(other.regionId, 'sea'); assert.equal(other.here, null);
  assert.equal(other.spots.length, 0); assert.equal(other.landmarks.length, 0);
});
