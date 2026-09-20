// なおとっち世界 正式地理 v1(D案)と、せかいのちず Phase 1。
// いちばん あつく みるのは「まだ 行って いない ところ」と「ひみつ」が
// せかいのちずから もれない こと。つぎに、region-local な せかいを 1つも
// こわして いない こと
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');

const ALL = ['home', 'city', 'countryside', 'forest', 'mountain', 'snow', 'sea', 'deepsea', 'river_lake', 'jungle', 'desert', 'star_stop', 'memory_lake'];
// 正本の 17本(D2)。ここが ずれたら 地理が かわった ということ
const LINKS = ['snow|mountain', 'forest|snow', 'forest|mountain', 'mountain|river_lake', 'desert|mountain',
  'countryside|forest', 'countryside|river_lake', 'countryside|home', 'home|river_lake', 'city|countryside',
  'city|sea', 'jungle|sea', 'desert|jungle', 'city|desert', 'deepsea|sea', 'countryside|star_stop', 'memory_lake'];

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

test('1. 正式地理 v2(D2): 13地域が 1回ずつ、地上10・水面下1・上空1・記憶1', () => {
  const { M } = setup();
  const G = M.WORLD_GEOGRAPHY;
  assert.equal(G.version, 2); assert.equal(G.plan, 'D2');
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
  const deg = {}, ground = {};
  for (const c of G.connections) {
    assert.ok(G.regions[c.a], `${c.id}: ${c.a}`);
    if (!c.b) { assert.equal(c.layer, 'memory'); continue; }
    assert.ok(G.regions[c.b], `${c.id}: ${c.b}`);
    deg[c.a] = (deg[c.a] || 0) + 1; deg[c.b] = (deg[c.b] || 0) + 1;
    if (c.layer === 'ground') { ground[c.a] = (ground[c.a] || 0) + 1; ground[c.b] = (ground[c.b] || 0) + 1; }
    for (const rid of Object.keys(c.mouths)) {
      const q = (M.WORLDS[rid].spots || []).find((x) => x.id === c.mouths[rid]);
      assert.ok(q, `${c.id}: ${rid}.${c.mouths[rid]} が 実在する spot`);
      assert.ok(!q.secret, `${c.id}: 入口が ひみつ spot では ない`);
    }
  }
  // どこにも つながらない 地上 region は ない。地上の みちは どの 地域も 4本まで
  for (const id of Object.keys(G.regions)) {
    if (G.regions[id].layer === 'memory') continue;
    assert.ok(deg[id] >= 1, `${id} は どこかに つながる`);
    assert.ok((ground[id] || 0) <= 4, `${id} の 地上の みちは 4本まで(${ground[id]})`);
  }
  // いなかは D2 の こうさてん: 地上 4本 ＋ 山の上へ 1本
  assert.equal(ground.countryside, 4, 'いなかの 地上の みちは 4本');
  assert.equal(deg.countryside, 5, 'いなかは そこに 山の上への みちが 1本 つく');
  // 飯田型 せいかつけんの 三角(D2): おうち・いなか・かわ・みずうみ
  for (const id of ['countryside|home', 'home|river_lake', 'countryside|river_lake']) {
    assert.ok(LINKS.includes(id), `${id} が せいかつけんの 三角に ある`);
  }
  // おうち ↔ とかい の 徒歩 connection は D2 に ない(たびでは 行ける)
  assert.ok(!LINKS.includes('city|home'), 'おうちと とかいは 地理的に 直結しない');
  assert.ok(!G.connections.some((c) => c.id === 'city|home'), '正本にも のこって いない');
  // ほしぞらへは うみからでは なく いなかから
  assert.ok(!G.connections.some((c) => c.id === 'sea|star_stop'), 'うみ↑ほしぞら は もう ない');
});

test('3. 二つの水系。たにの おおかわと みやこがわは べつの 川で、上流で つながって いない', () => {
  const { M } = setup();
  const F = M.WORLD_GEOGRAPHY.features;
  const seq = (f) => { const o = []; for (const p of f.points) if (o[o.length - 1] !== p.region) o.push(p.region); return o; };
  const tenryu = F.find((f) => f.id === 'tenryu'), shonai = F.find((f) => f.id === 'shonai');
  assert.ok(tenryu && shonai, '川が 2本 ある');
  assert.equal(tenryu.kind, 'river'); assert.equal(shonai.kind, 'river');
  // 天竜川型: やま → かわ・みずうみ → たに(おうち) → うみ。**とかいを 通らない**
  assert.equal(seq(tenryu).join(' → '), 'mountain → river_lake → home → sea');
  assert.ok(!seq(tenryu).includes('city'), 'たにの おおかわは とかいへ ながれない');
  // 庄内川型: 分水界の むこう → とかい → うみ。**たにを 通らない**
  assert.equal(seq(shonai).join(' → '), 'countryside → city → sea');
  assert.ok(!seq(shonai).includes('river_lake') && !seq(shonai).includes('home'), 'みやこがわは たにを 通らない');
  // どちらも 下流へ 単調に 下る
  for (const f of [tenryu, shonai]) for (let i = 1; i < f.points.length; i++) {
    assert.ok(f.points[i].y < f.points[i - 1].y, `${f.id} の 点 ${i} が 下流へ 下る`);
  }
  // 2本が くっついて いない = 1本の 川が 山の上で 分かれて 見えない
  let best = Infinity;
  for (const a of tenryu.points) for (const b of shonai.points) best = Math.min(best, Math.hypot(a.x - b.x, a.y - b.y));
  assert.ok(best > 1.5, `2水系が はなれて いる(いちばん近い 点どうし ${best.toFixed(2)})`);
  // 山地も 2つ。にしは あるける、ひがしは たにから 見えるだけ
  const ranges = F.filter((f) => f.kind === 'range');
  assert.equal(ranges.length, 2, 'たにを はさむ 山地が 2つ');
  const west = ranges.find((f) => f.id === 'west-range'), east = ranges.find((f) => f.id === 'east-range');
  // にしの 山地: ゆきぐに → やま → もり と、さとの うしろ(いなか)まで つづく。
  // たにの そこ(おうち・かわ)は 入らない
  const westRegions = [...new Set(west.points.map((p) => p.region))];
  assert.equal(westRegions.join(','), 'snow,mountain,forest,countryside', 'にしの 山地は 山がわの 4地域');
  for (const id of ['home', 'river_lake']) assert.ok(!westRegions.includes(id), `にしの 山地に ${id}(たにの そこ)は 入らない`);
  // ひがしの 山地: たちどころが たにの 2地域だけ = **あるけない。たにから 見えるだけ**
  const eastRegions = [...new Set(east.points.map((p) => p.region))];
  assert.equal(eastRegions.slice().sort().join(','), 'home,river_lake', 'ひがしの 山地は たにから 見えるだけ');
  assert.ok(!Object.keys(M.WORLD_GEOGRAPHY.regions).some((id) => M.WORLD_GEOGRAPHY.regions[id].belt === 'eastwall'),
    'ひがしの 山地に region は ない(13地域を ふやさない)');
});

test('4/5. たてじくは 2か所。ほしぞらは いなかの 山の上、しんかいは うみの 外洋の下', () => {
  const { M } = setup();
  const G = M.WORLD_GEOGRAPHY;
  assert.equal(G.regions.memory_lake.mapX, null);
  assert.equal(G.regions.memory_lake.mapY, null);
  // D の「おなじ 一点の 上下」は やめた
  assert.ok(G.regions.deepsea.mapX !== G.regions.star_stop.mapX
    || G.regions.deepsea.mapY !== G.regions.star_stop.mapY, 'しんかいと ほしぞらは べつの ばしょ');
  assert.equal(G.axis.sky.from, 'countryside', 'ほしぞらへは いなかから 上がる');
  assert.equal(G.axis.deep.from, 'sea', 'しんかいへは うみから 下りる');
  // ほしぞらの いちは、どの 地上地域より いなかに 近い
  const d = (x, y, id) => Math.hypot(G.regions[id].mapX - x, G.regions[id].mapY - y);
  const ground = Object.keys(G.regions).filter((id) => G.regions[id].layer === 'ground');
  const near = ground.map((id) => [id, d(G.axis.sky.mapX, G.axis.sky.mapY, id)]).sort((a, b) => a[1] - b[1]);
  assert.equal(near[0][0], 'countryside', `ほしぞらに いちばん 近い 地上地域は いなか(いまは ${near[0][0]})`);
  for (const id of ['home', 'city', 'sea']) {
    assert.ok(d(G.axis.sky.mapX, G.axis.sky.mapY, id) > near[0][1], `ほしぞらは ${id} の まうえでは ない`);
  }
  // しんかいは うみの 外洋がわ。とかい(湾のある まち)より うみに 近い
  const nd = ground.map((id) => [id, d(G.axis.deep.mapX, G.axis.deep.mapY, id)]).sort((a, b) => a[1] - b[1]);
  assert.equal(nd[0][0], 'sea', 'しんかいに いちばん 近い 地上地域は うみ');
  // ぜんぶ 見つけて いても、地上の 地域として ならばない
  const all = wd(M, { regions: ALL });
  const ids = all.regions.map((r) => r.id);
  for (const id of ['deepsea', 'star_stop', 'memory_lake']) assert.ok(!ids.includes(id), `${id} は 地上の 地域として 出ない`);
  assert.equal(ids.length, 10);
  assert.ok(all.axis.sky.on && all.axis.deep.on, 'たてじくは 2か所とも 出る');
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
  assert.ok(!only.axis.sky.on && !only.axis.deep.on, '未発見の 特殊層は そんざいを ばらさない');
  // 「上がる もとの 地域」を 見つけて いても、さきの 地域を 見つけて いなければ 出ない
  const withVillage = wd(M, { regions: ['home', 'countryside'] });
  assert.ok(!withVillage.axis.sky.on, 'いなかへ 行っただけでは ほしぞらは 出ない');
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
  assert.ok(!done.axis.sky.on, 'ほしぞらは 100% の じょうけんでは ない');
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

test('21. D2 へ かえても、地域の なかみは 1つも うごいて いない', () => {
  const { M } = setup();
  const reg = M.buildRegistry();
  let zones = 0, spots = 0, paths = 0, secretSpots = 0, secretPaths = 0;
  for (const id of ALL) {
    const w = M.buildWorld(id, reg);
    zones += w.zones.length; spots += w.spots.length; paths += (M.WORLDS[id].paths || []).length;
    secretSpots += w.spots.filter((q) => q.secret).length;
    secretPaths += (M.WORLDS[id].paths || []).filter((p) => p[2] === 'secret').length;
  }
  assert.equal(zones, 118, '118 ちく');
  assert.equal(spots, 469, '469 スポット');
  assert.equal(paths, 652, '652 みち');
  assert.equal(secretSpots + secretPaths, 107, '107 ひみつ');
  // せかいの 地理は 地図の がわ だけ。region-local な world 座標に 1 つも 入りこんで いない
  for (const id of ALL) {
    const w = M.buildWorld(id, reg);
    assert.ok(!('mapX' in w) && !('mapY' in w), `${id}: world に mapX/mapY が まざって いない`);
    assert.equal(w.regionId, id);
  }
  // ナオトは いまの とおり(地図に ない ばしょの おくに、うごかずに いる)
  const naoto = reg.naoto;
  if (naoto) {
    assert.equal(naoto.region, 'memory_lake'); assert.equal(naoto.spot, 'deep'); assert.equal(naoto.secret, true);
    assert.equal(M.WORLD_GEOGRAPHY.regions.memory_lake.mapX, null, 'その ばしょは 世界地図に 座標を もたない');
  }
});

// ============================================================================
// なおとっち世界 地理正本 v1
// 「二つの大きな山地に はさまれた たに」を せかいの 中心に すえた 正本。
// ここから さきの テストは、正本の 条文を 1 つずつ コードへ とめる ための ものです。
// ============================================================================

test('22. 地理正本 v1: 山は 3 つの モチーフ。にしは あるける 山地、ひがしは region では ない 巨大山地', () => {
  const { M } = setup();
  const G = M.WORLD_GEOGRAPHY;
  assert.equal(G.canon, 'v1', '正本 v1');
  const F = G.features;
  const west = F.find((f) => f.id === 'west-range'), east = F.find((f) => f.id === 'east-range');
  // にし(中央アルプス型): あるける 地域が のって いる
  const westRegions = [...new Set(west.points.map((p) => p.region))];
  for (const id of ['snow', 'mountain', 'forest']) assert.ok(westRegions.includes(id), `にしの 山地に ${id}`);
  // ひがし(南アルプス型): **region では ない**。どの region の id とも 一致しない feature
  assert.ok(!Object.keys(G.regions).includes('east-range'), 'ひがしの 山地は region では ない');
  assert.equal([...new Set(east.points.map((p) => p.region))].sort().join(','), 'home,river_lake',
    'ひがしの 山地は たにの 2 地域からしか 見えない = あるけない');
  // 北へ 行くほど 高く 寒く なる: ゆきぐには やまより 北
  assert.ok(G.regions.snow.mapY > G.regions.mountain.mapY, 'ゆきぐには やまより 北');
  assert.ok(G.connections.some((c) => c.id === 'snow|mountain'), 'やま ↔ ゆきぐに の 峠');
  // おうちは その 2 つの 山地の あいだ
  const hx = G.regions.home.mapX;
  const westX = Math.max(...west.points.filter((p) => p.y > -1 && p.y < 2).map((p) => p.x));
  const eastX = Math.min(...east.points.filter((p) => p.y > -1 && p.y < 2).map((p) => p.x));
  assert.ok(westX < hx && hx < eastX, `おうち(${hx}) が にし(${westX}) と ひがし(${eastX}) の あいだ`);
});

test('23. 地理正本 v1: おうちの すぐ近くを 天竜川型が ながれ、とかいへは ながれない', () => {
  const { M } = setup();
  const G = M.WORLD_GEOGRAPHY;
  const tenryu = G.features.find((f) => f.id === 'tenryu');
  const shonai = G.features.find((f) => f.id === 'shonai');
  // おうちの すぐ近く: home の 点が ある。ただし region の 中心を つらぬかない
  const nearHome = tenryu.points.filter((p) => p.region === 'home');
  assert.ok(nearHome.length >= 2, 'たにの おおかわは おうちの そばを とおる');
  const H = G.regions.home;
  const closest = Math.min(...tenryu.points.map((p) => Math.hypot(p.x - H.mapX, p.y - H.mapY)));
  assert.ok(closest < 1.2, `おうちから 川まで ${closest.toFixed(2)}(すぐ近く)`);
  assert.ok(closest > 0.2, '川は おうちの まん中を つらぬかない(段丘の 上の まち)');
  // とかい・湾へは ながれない
  assert.ok(!tenryu.points.some((p) => p.region === 'city'), '天竜川型は とかいへ ながれない');
  // 庄内川型は とかいを ぬけて 湾へ
  assert.ok(shonai.points.some((p) => p.region === 'city'), '庄内川型は とかいを ぬける');
  assert.equal(shonai.points[shonai.points.length - 1].region, 'sea', '庄内川型の かこうは うみ(湾)');
  const bay = G.features.find((f) => f.id === 'bay');
  const mouth = shonai.points[shonai.points.length - 1];
  assert.ok(Math.min(...bay.points.map((p) => Math.hypot(p.x - mouth.x, p.y - mouth.y))) < 0.6,
    'かこうが 湾に ついて いる');
});

test('24. 地理正本 v1: 分水界が 正式な 地形。2 水系を 図の うえで 分ける', () => {
  const { M } = setup();
  const G = M.WORLD_GEOGRAPHY;
  const divide = G.features.find((f) => f.kind === 'divide');
  assert.ok(divide, '分水界が feature として ある');
  assert.ok(!Object.keys(G.regions).includes(divide.id), '分水界は region では ない');
  const tenryu = G.features.find((f) => f.id === 'tenryu');
  const shonai = G.features.find((f) => f.id === 'shonai');
  // 分水界は 2 水系の あいだ。たにの おおかわからは 遠く、みやこがわは ここから はじまる
  const near = (river) => Math.min(...divide.points.map((d) =>
    Math.min(...river.points.map((p) => Math.hypot(p.x - d.x, p.y - d.y)))));
  assert.ok(near(tenryu) > 1.5, `分水界は たにの おおかわから はなれて いる(${near(tenryu).toFixed(2)})`);
  assert.ok(near(shonai) < 0.8, `みやこがわは 分水界の むこうから はじまる(${near(shonai).toFixed(2)})`);
  assert.ok(near(tenryu) > near(shonai), '分水界は とかいがわの 水系に つく');
  // いなか → とかい の 街道は この おねを こえる
  const road = G.connections.find((c) => c.id === 'city|countryside');
  assert.ok(road, 'いなか ↔ とかい の 街道');
  const A = G.regions.countryside, B = G.regions.city;
  const side = (p) => (B.mapX - A.mapX) * (p.y - A.mapY) - (B.mapY - A.mapY) * (p.x - A.mapX);
  const signs = divide.points.map((p) => Math.sign(side(p)));
  assert.ok(signs.includes(1) && signs.includes(-1), '分水界が いなか ↔ とかい の 道を よこぎる');
});

test('25. 地理正本 v1: 源の湖は ふつうの 地形。きおくのみずうみ では ない', () => {
  const { M } = setup();
  const G = M.WORLD_GEOGRAPHY;
  const lake = G.features.find((f) => f.kind === 'lake');
  assert.ok(lake, '源の湖が feature として ある');
  assert.ok(!Object.keys(G.regions).includes(lake.id), '源の湖は region では ない');
  assert.ok(lake.id !== 'memory_lake' && !lake.points.some((p) => p.region === 'memory_lake'),
    '源の湖は きおくのみずうみ では ない');
  // 天竜川型の **いちばん上流がわ** に ある
  const tenryu = G.features.find((f) => f.id === 'tenryu');
  const cy = lake.points.reduce((a, p) => a + p.y, 0) / lake.points.length;
  const mouth = tenryu.points[tenryu.points.length - 1];
  assert.ok(cy > mouth.y, '源の湖は かこうより 上流');
  assert.ok(cy > G.regions.home.mapY, '源の湖は おうちより 上流');
  // 川が その 湖を とおる
  const through = Math.min(...tenryu.points.map((p) => Math.hypot(p.x - lake.points.reduce((a, q) => a + q.x, 0) / lake.points.length, p.y - cy)));
  assert.ok(through < 0.5, `天竜川型が 源の湖を とおる(${through.toFixed(2)})`);
  // きおくのみずうみは 世界地図に 出ない
  assert.equal(G.regions.memory_lake.mapX, null);
  assert.ok(!G.features.some((f) => f.points.some((p) => p.region === 'memory_lake')),
    'どの 地形 feature も きおくのみずうみを 指さない');
});

test('26. 地理正本 v1: 北西に さばく、南西に ジャングル', () => {
  const { M } = setup();
  const G = M.WORLD_GEOGRAPHY, R = G.regions;
  const ground = Object.keys(R).filter((id) => R[id].layer === 'ground');
  const cx = ground.reduce((a, id) => a + R[id].mapX, 0) / ground.length;
  const cy = ground.reduce((a, id) => a + R[id].mapY, 0) / ground.length;
  assert.ok(R.desert.mapX < cx && R.desert.mapY > cy, `さばくは 北西(${R.desert.mapX}, ${R.desert.mapY})`);
  assert.ok(R.jungle.mapX < cx && R.jungle.mapY < cy, `ジャングルは 南西(${R.jungle.mapX}, ${R.jungle.mapY})`);
  // さばくは ジャングルより 北、ジャングルは さばくより 南
  assert.ok(R.desert.mapY > R.jungle.mapY, 'さばくは ジャングルより 北');
  // 世界の へりの 語彙も そろって いる
  const rim = Object.fromEntries(G.rim.map((r) => [r.near[0], r.dir]));
  assert.equal(rim.desert, 'northwest', 'へり: さばくの さきは 北西');
  assert.equal(rim.jungle, 'southwest', 'へり: ジャングルの さきは 南西');
});

test('27. 地理正本 v1: 生活圏の 三角と、おうち ↔ とかい を 持たない こと', () => {
  const { M } = setup();
  const G = M.WORLD_GEOGRAPHY;
  const has = (id) => G.connections.some((c) => c.id === id);
  for (const id of ['countryside|home', 'home|river_lake', 'countryside|river_lake',
    'countryside|star_stop', 'snow|mountain', 'city|sea', 'deepsea|sea']) {
    assert.ok(has(id), `${id} が ある`);
  }
  assert.ok(!has('city|home'), 'おうち ↔ とかい の 直通は 持たない');
  // ほしぞらへは いなかの「ふるいとりい」から
  const sky = G.connections.find((c) => c.id === 'countryside|star_stop');
  assert.equal(sky.mouths.countryside, 'torii');
  assert.equal(sky.mouths.star_stop, 'stop');
  assert.equal(sky.layer, 'up');
  // おうちから さきは 一本道に しない(2 方向 いじょう)
  const from = (id) => G.connections.filter((c) => c.b && (c.a === id || c.b === id)).length;
  assert.ok(from('home') >= 2, 'おうちから 2 方向 いじょうへ 行ける');
  // 13 地域は ふえて いない
  assert.equal(Object.keys(G.regions).length, 13, '13 地域の まま');
});
