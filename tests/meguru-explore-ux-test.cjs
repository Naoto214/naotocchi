// めぐる: ①右がわの ボタン ②世界地図の Fog of War ③ジャングル = 南西の しま。
// いちばん あつく みるのは「おしても なにも おきない ボタンが 1つも ない」ことと、
// 「まだ 行って いない ところが 地図に 先に 出て しまわない」こと
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
function setup(regionId = 'forest') {
  const h = harness({ fullDisplay: true, canvasContext: fakeCtx() });
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80,
    speciesLine: 'dog', stageIndex: 4, ageTicks: 500 });
  s.petKey = `dog:${h.api.currentFormStageIndex()}`;
  s.discoveredStages = [s.petKey, 'cat:2', 'penguin:3', 'mushroom:0', 'beetle:0', 'ghost:1'];
  s.regionId = regionId;
  h.api.render();
  return { h, s, M: h.api.meguruMod };
}
const wd = (M, rec) => M.worldMapData(Object.assign({ regions: [], links: [], marks: {}, zones: {} }, rec));
const GROUND = ['home', 'river_lake', 'countryside', 'forest', 'mountain', 'snow', 'desert', 'city', 'sea', 'jungle'];

// ──────────────────────────────────────────────── A. 右がわの ボタン

test('A1. うごく ボタンしか 出さない: なにも ない ときは その ばの ボタンが 1つも ない', () => {
  const { h } = setup('forest');
  assert.equal(h.api.startMeguru(), true);
  const ov = h.get('meguruOverlay');
  const act = ov.querySelector('#mgrTalk');
  const run = h.api.meguruRun(), sim = run.sim;
  // だれも いない ところへ 立つ
  run.setPlayer(run.world.halfW * 0.95, 40); h.advance(60);
  assert.equal(run.nearest, null, 'そばに だれも いない');
  assert.equal(act.classList.contains('hidden'), true, 'はなす ボタンは 出ない(おせない ボタンを のこさない)');
  // のこりの ボタンは いつでも いみが ある
  for (const id of ['mgrTravel', 'mgrHome', 'mgrMap']) {
    const b = ov.querySelector('#' + id);
    assert.ok(b, id + ' が ある');
    assert.equal(b.classList.contains('hidden'), false, id + ' は いつでも 出て いる');
    assert.notEqual(b.disabled, true, id + ' は ふだん おせる');
  }
  // 「のる」だけの べつ ボタンは もう ない。その ばの できごとは ぜんぶ
  // おなじ 1 つの 枠(#mgrTalk)が うけもつ ことを A2 で かためて いる
  h.api.stopMeguru();
});

test('A2. その ばの ボタンは 1 枠。住民が ちかいと「はなす」、のりばに 立つと「のる/もぐる」', () => {
  const { h, s } = setup('forest');
  assert.equal(h.api.startMeguru(), true);
  const ov = h.get('meguruOverlay');
  const act = ov.querySelector('#mgrTalk');
  const run = h.api.meguruRun(), sim = run.sim;
  const a = run.world.residents[0];
  run.setPlayer(a.x, a.z - 30); h.advance(40);
  assert.equal(run.nearest, a);
  assert.equal(act.classList.contains('hidden'), false, '住民が ちかいと 出る');
  assert.match(act.textContent, /はなす/);
  // おすと はなす
  h.dispatch(act, 'click');
  assert.ok(a.say && a.say.length > 0, 'おすと ことばが 出る');
  assert.equal(s.lifetime.meguru.talkCount, 1);
  // たてじくの のりばでは おなじ 枠が「のる」に なる
  s.regionId = 'countryside'; h.advance(60);
  const run2 = h.api.meguruRun(), sim2 = run2.sim;
  assert.equal(run2.world.regionId, 'countryside');
  const gate = sim2.gates.find((g) => g.kind === 'vertical');
  assert.ok(gate, 'いなかには そらへの のりばが ある');
  run2.setPlayer(gate.spot.x, gate.spot.z); h.advance(60);
  assert.ok(sim2.gateHere(), 'のりばの うえに 立って いる');
  assert.equal(act.classList.contains('hidden'), false);
  assert.equal(act.textContent, gate.action, '枠の なまえは gate の action そのまま: ' + act.textContent);
  assert.ok(!/はなす/.test(act.textContent), 'のりばでは はなす に ならない');
  h.api.stopMeguru();
});

test('A3. こえて いる あいだ、右がわの ボタンは ぜんぶ ロックされる', () => {
  const { h, s } = setup('countryside');
  assert.equal(h.api.startMeguru(), true);
  const ov = h.get('meguruOverlay');
  const act = ov.querySelector('#mgrTalk'), travel = ov.querySelector('#mgrTravel'),
    home = ov.querySelector('#mgrHome'), map = ov.querySelector('#mgrMap');
  const run = h.api.meguruRun(), sim = run.sim;
  const gate = sim.gates.find((g) => g.kind === 'vertical');
  run.setPlayer(gate.spot.x, gate.spot.z); h.advance(60);
  assert.equal(act.classList.contains('hidden'), false);
  h.dispatch(act, 'click');                 // のる → こえはじめる
  h.advance(16);
  assert.equal(act.classList.contains('hidden'), true, 'こえて いる あいだ その ばの ボタンは 出ない');
  for (const [b, id] of [[travel, 'たび'], [home, 'もどる'], [map, 'ちず']]) {
    assert.equal(b.disabled, true, id + ' は こえて いる あいだ おせない');
  }
  // たび を おしても オーバーレイは ひらかない
  const before = h.api.overlayState();
  h.dispatch(travel, 'click');
  assert.equal(h.api.overlayState(), before, 'こえて いる あいだ たびは ひらかない');
  h.advance(6000);                          // こえおわる
  assert.equal(travel.disabled, false, 'こえおわると もとに もどる');
  assert.equal(s.regionId, 'star_stop', 'ほしぞらへ ついた');
  h.api.stopMeguru();
});

test('A7. hidden を つけた ボタンは ほんとうに きえる(CSS の きまりが ある)', () => {
  // これが なかったので、まえは「のる」が どの 地域でも ずっと 出て いた。
  // JS で class を つけても、けす きまりが なければ ボタンは のこる
  const css = require('node:fs').readFileSync('style.css', 'utf8');
  const rule = /\.meguru-overlay\s+\.mg-tap-btn\.hidden\s*\{[^}]*display:\s*none/;
  assert.ok(rule.test(css), '.meguru-overlay .mg-tap-btn.hidden { display: none } が ある');
});

test('A8. のりばでは、なにが おきるのかを ボタンの した にも 出す', () => {
  const { h } = setup('countryside');
  assert.equal(h.api.startMeguru(), true);
  const ov = h.get('meguruOverlay');
  const hintEl = ov.querySelector('#mgrHint');
  const run = h.api.meguruRun(), sim = run.sim;
  const gate = sim.gates.find((g) => g.kind === 'vertical');
  run.setPlayer(gate.spot.x, gate.spot.z); h.advance(60);
  assert.ok(hintEl.textContent.includes(gate.verb), `のりばの ヒントは 「${gate.verb}」(いまは 「${hintEl.textContent}」)`);
  // のりばから はなれたら もとの ヒントに もどる
  run.setPlayer(run.world.halfW * 0.9, run.world.len * 0.5); h.advance(60);
  assert.ok(!hintEl.textContent.includes(gate.verb), 'はなれたら のりばの ことばは きえる');
  h.api.stopMeguru();
});

// ──────────────────────────────────────────────── A. たび の 入口

test('A4. めぐる中の「たび」が はたらく。openExclusiveMenu では はじかれて いた', () => {
  const { h } = setup('forest');
  // げんいんの かくにん: めぐる中は openExclusiveMenu が 何も しない
  assert.equal(h.api.startMeguru(), true);
  h.api.openExclusiveMenu('travel');
  assert.equal(h.api.overlayState(), null, 'めぐる中の openExclusiveMenu は はじかれる(これが げんいん)');
  // なおした 入口を とおすと ひらく
  const ov = h.get('meguruOverlay');
  h.dispatch(ov.querySelector('#mgrTravel'), 'click');
  assert.equal(h.api.overlayState(), 'travel', 'たびが ひらく');
  assert.equal(h.get('travelOverlay').classList.contains('hidden'), false, 'たびの がめんが 出て いる');
  assert.equal(h.api.meguruActive(), true, 'めぐるは とじない(うえに かぶさる だけ)');
  assert.equal(h.get('meguruOverlay').classList.contains('hidden'), false);
  h.api.stopMeguru();
});

test('A5. たびが かぶさって いる あいだ せかいは とまり、とじると つづきから うごく', () => {
  const { h } = setup('forest');
  assert.equal(h.api.startMeguru(), true);
  const ov = h.get('meguruOverlay');
  const run = h.api.meguruRun(), sim = run.sim;
  run.setPlayer(0, 200); h.advance(200);
  h.dispatch(ov.querySelector('#mgrTravel'), 'click');
  assert.equal(h.api.meguruBridge.menuOpen(), true);
  const frame0 = sim.view().frame, z0 = run.player.z, x0 = run.player.x;
  h.advance(1500);
  assert.equal(sim.view().frame, frame0, 'かぶさって いる あいだ せかいは 1 こまも すすまない');
  assert.equal(run.player.z, z0); assert.equal(run.player.x, x0);
  // とじる
  h.dispatch(h.get('travelCloseBtn'), 'click');
  assert.equal(h.api.overlayState(), null);
  assert.equal(h.api.meguruBridge.menuOpen(), false);
  h.advance(300);
  assert.ok(sim.view().frame > frame0, 'とじると また うごきだす(ロックが のこらない)');
  h.api.stopMeguru();
});

test('A6. たびから 地域を えらぶと、これまで どおり travelToRegion が はしり めぐるも ついて いく', () => {
  const { h, s } = setup('forest');
  assert.equal(h.api.startMeguru(), true);
  h.dispatch(h.get('meguruOverlay').querySelector('#mgrTravel'), 'click');
  const sea = h.api.REGIONS.find((r) => r.id === 'sea');
  assert.ok(sea);
  h.api.travelToRegion(sea, { id: 'sea' });
  assert.equal(h.api.overlayState(), null, 'えらぶと たびは とじる');
  assert.equal(s.regionId, 'sea');
  h.advance(120);
  assert.equal(h.api.meguruRun().world.regionId, 'sea', 'めぐるも その 地域へ 入りなおす');
  h.api.stopMeguru();
});

// ──────────────────────────────────────────────── B. 世界地図の Fog of War

test('B1. 見つけた 地域の まわり だけが 紙に のる。0% → 100% で だんだん ひろがる', () => {
  const { M } = setup();
  const stage = (ids) => {
    const w = wd(M, { regions: ids });
    const on = w.features.reduce((n, f) => n + f.points.filter((p) => p.on).length, 0);
    const area = (w.bounds.x1 - w.bounds.x0) * (w.bounds.y1 - w.bounds.y0);
    return { on, area, feats: w.features.length, regions: w.regions.length };
  };
  const s0 = stage([]);
  const s10 = stage(['home']);
  const s25 = stage(['home', 'river_lake', 'forest']);
  const s50 = stage(['home', 'river_lake', 'forest', 'countryside', 'mountain', 'city']);
  const s75 = stage(['home', 'river_lake', 'forest', 'countryside', 'mountain', 'city', 'sea', 'snow']);
  const s100 = stage(GROUND);
  const all = [s0, s10, s25, s50, s75, s100];
  for (let i = 1; i < all.length; i++) {
    assert.ok(all[i].on >= all[i - 1].on, `${i}: わかる 地形は へらない`);
    assert.ok(all[i].area >= all[i - 1].area - 1e-9, `${i}: 紙の ひろさは ちぢまない`);
  }
  assert.equal(s0.regions, 0, '0% では 地域が 1つも 出ない');
  assert.equal(s0.feats, 0, '0% では 地形も 1つも 出ない');
  // 5 だんかいは 「はっきり ちがう」: 紙の ひろさが 1 だんかい ごとに のびる
  for (let i = 1; i < all.length; i++) {
    assert.ok(all[i].area > all[i - 1].area * 1.05, `${i} だんめは まえより はっきり ひろい (${all[i - 1].area.toFixed(1)} → ${all[i].area.toFixed(1)})`);
  }
  // 100% で ちょうど せかい ぜんたい。地形も すきまなく つながる
  const full = wd(M, { regions: GROUND });
  for (const f of full.features) assert.ok(f.points.every((p) => p.on), `${f.id} は 100% で ぜんぶ つながる`);
});

test('B2. 50% では、まだ 行って いない ところの かたちが はっきり のこって いる', () => {
  const { M } = setup();
  const half = wd(M, { regions: ['home', 'river_lake', 'forest', 'countryside', 'mountain', 'city'] });
  const hidden = M.WORLD_GEOGRAPHY.features
    .map((f) => { const g = half.features.find((x) => x.id === f.id); return { id: f.id,
      on: g ? g.points.filter((p) => p.on).length : 0, all: f.points.length }; })
    .filter((f) => f.on < f.all);
  assert.ok(hidden.length >= 3, 'はんぶんの ときに まだ わからない 地形が いくつも ある: ' + JSON.stringify(hidden));
  // 見つけて いない 地域は、かたち(だえん)も なまえも いちも みちも 出ない。
  // 「そこから 見える やまなみ」の いろだけは のこる(たにから 見えて いる ものを
  // わざわざ かくすと、いま 立って いる ところの けしきの ほうが うそに なる)
  for (const id of ['snow', 'desert', 'sea', 'jungle']) {
    const g = M.WORLD_GEOGRAPHY.regions[id];
    assert.ok(!half.regions.some((r) => r.id === id), id + ' の かたちが 出ない');
    assert.ok(!half.links.some((l) => l.a === id || l.b === id), id + ' への みちが 出ない');
    const json2 = JSON.stringify(half.regions) + JSON.stringify(half.links) + JSON.stringify(half.axis);
    assert.ok(!json2.includes(id), id + ' は 地域・みち・たてじくの どこにも 出ない');
    // いちも もれない
    for (const f of half.features) for (const p of f.points) {
      if (p.on) assert.ok(Math.hypot(p.x - g.mapX, p.y - g.mapY) > 0.5, id + ' の まんなかは 出ない');
    }
  }
});

test('B3. 見つけて いない 特殊層(ほしぞら・しんかい・きおく)は 1 文字も もれない', () => {
  const { M } = setup();
  for (const rec of [{ regions: [] }, { regions: ['home'] }, { regions: GROUND }]) {
    const w = wd(M, rec);
    const json = JSON.stringify(w);
    assert.equal(w.layers.sky, false); assert.equal(w.layers.deep, false); assert.equal(w.layers.memory, false);
    assert.equal(w.axis.sky.on, false); assert.equal(w.axis.deep.on, false);
    for (const id of ['star_stop', 'deepsea', 'memory_lake']) {
      assert.ok(!json.includes(id), `${id} が もれない(regions=${rec.regions.length})`);
      const g = M.WORLD_GEOGRAPHY.regions[id];
      if (g.label) assert.ok(!json.includes(g.label), `${g.label} が もれない`);
    }
    // たてじくの ばしょ(座標)も もれない
    for (const a of [M.WORLD_GEOGRAPHY.axis.sky, M.WORLD_GEOGRAPHY.axis.deep]) {
      assert.ok(!json.includes(a.label) && !json.includes(a.short), a.short + ' の なまえが もれない');
    }
  }
});

test('B4. 探索率の しきは ひとつも かわって いない(471 spot / 654 path / 118 zone / 107 ひみつ)', () => {
  const { M } = setup();
  const C = M.worldCountable();
  let spots = 0, paths = 0, zones = 0, secret = 0;
  for (const id of Object.keys(M.WORLDS)) {
    const w = M.WORLDS[id];
    spots += w.spots.length; paths += w.paths.length; zones += w.zones.length;
    secret += w.spots.filter((s) => s.secret).length + w.paths.filter((p) => p[2] === 'secret').length;
  }
  assert.equal(spots, 471); assert.equal(paths, 654); assert.equal(zones, 118); assert.equal(secret, 107);
  // 0% は 0、100% は 100
  const zero = wd(M, { regions: [] });
  assert.equal(zero.progress.percent, 0);
  // 分母は 4 つとも 正本の かず(しま に しても、Fog を なおしても かわらない)
  assert.equal(zero.progress.regionTotal, C.regions.length);
  assert.equal(zero.progress.linkTotal, C.links.length);
  assert.equal(zero.progress.markTotal, C.tier1);
  assert.equal(zero.progress.zoneTotal, C.zones);
  assert.equal(C.regions.length, 11); assert.equal(C.links.length, 15);
  assert.equal(C.tier1, 17); assert.equal(C.zones, 103);
  const marks = {}, zoneRec = {};
  for (const id of C.regions) marks[id] = M.worldTier1(id).map((m) => m.mid);
  for (const id of Object.keys(M.WORLDS)) zoneRec[id] = (M.WORLDS[id].zones || []).map((z) => z.id);
  const done = wd(M, { regions: Object.keys(M.WORLD_GEOGRAPHY.regions), links: C.links, marks, zones: zoneRec });
  assert.equal(done.progress.percent, 100, 'ぜんぶ 見つけると 100%');
});

// ──────────────────────────────────────────────── C. ジャングル = 南西の しま

test('C1. ジャングルは 南西の 外洋に うかぶ しま。本土の どの 地域とも 陸つづきに 見えない', () => {
  const { M } = setup();
  const G = M.WORLD_GEOGRAPHY, R = G.regions, J = R.jungle;
  assert.equal(J.isle, true, 'しま だと データに かいて ある');
  assert.equal(J.belt, 'isle');
  assert.ok(J.mapX < -4.5 && J.mapY < -6.5, 'いちは 南西の そと: ' + J.mapX + ',' + J.mapY);
  // 本土の どの 地上地域より、うみが ひろい
  const ground = Object.keys(R).filter((id) => R[id].layer === 'ground' && id !== 'jungle');
  const near = ground.map((id) => [id, Math.hypot(R[id].mapX - J.mapX, R[id].mapY - J.mapY)]).sort((a, b) => a[1] - b[1]);
  assert.ok(near[0][1] > 3.0, `いちばん 近い 本土(${near[0][0]})でも ${near[0][1].toFixed(2)} はなれて いる`);
  // だえん どうしの すきま(= じっさいに 紙の うえで あいて いる うみ)で みる。
  // 本土の となりあわせは たいてい かさなるか くっついて いるが、しまは はなれて いる
  const gap = (a, b) => {
    const sa = M.worldMapShape(a), sb = M.worldMapShape(b);
    return Math.hypot(R[a].mapX - R[b].mapX, R[a].mapY - R[b].mapY)
      - Math.max(sa.rx, sa.ry) - Math.max(sb.rx, sb.ry);
  };
  const isleGap = Math.min(...ground.map((id) => gap(id, 'jungle')));
  assert.ok(isleGap > 2.0, `しまの まわりは どこも 2.0 いじょう うみ(いまは ${isleGap.toFixed(2)})`);
  // 本土の 地域どうしは、みちで つながって いる ところが かならず もっと 近い
  const linked = G.connections.filter((c) => c.b && !c.vertical && c.a !== 'jungle' && c.b !== 'jungle'
    && R[c.a] && R[c.b] && R[c.a].layer === 'ground' && R[c.b].layer === 'ground');
  const narrowest = Math.min(...linked.map((c) => gap(c.a, c.b)));
  assert.ok(narrowest < isleGap, `本土どうしは くっついて いる(いちばん せまい すきま ${narrowest.toFixed(2)})`);
});

test('C2. かいがんせん(本土)は しまに さわらない。しまは べつの 地形として もつ', () => {
  const { M } = setup();
  const G = M.WORLD_GEOGRAPHY;
  const coast = G.features.find((f) => f.id === 'coast');
  assert.ok(coast);
  assert.ok(!coast.points.some((p) => p.region === 'jungle'), '本土の かいがんせんに ジャングルの 点は ない');
  const isles = G.features.filter((f) => f.kind === 'island');
  assert.equal(isles.length, 2, 'しま は 2つ(おおきい しま と こじま)');
  for (const f of isles) {
    assert.equal(f.needs, 'jungle', f.id + ' は ジャングルを 見つける まで 出ない');
    assert.ok(f.points.length >= 3, f.id + ' は 面として かける');
    for (const p of f.points) assert.equal(p.region, 'jungle', f.id + ' の 点は ぜんぶ ジャングル');
  }
  // 本土の どの 地形の 点も、しまの ちかくには ない
  const isleP = isles.flatMap((f) => f.points);
  for (const f of G.features) {
    if (f.kind === 'island') continue;
    for (const p of f.points) for (const q of isleP) {
      assert.ok(Math.hypot(p.x - q.x, p.y - q.y) > 1.5, `${f.id} の 点(${p.x},${p.y})が しまに ちかすぎる`);
    }
  }
});

test('C3. しまは ジャングルを 見つける まで 1 てんも 出ない(なまえも かたちも)', () => {
  const { M } = setup();
  const isles = M.WORLD_GEOGRAPHY.features.filter((f) => f.kind === 'island');
  const without = wd(M, { regions: GROUND.filter((id) => id !== 'jungle') });
  const json = JSON.stringify(without);
  for (const f of isles) {
    assert.ok(!without.features.some((g) => g.id === f.id), f.id + ' は 出ない');
    assert.ok(!json.includes(f.id) && !json.includes(f.label), f.label + ' が もれない');
    for (const p of f.points) assert.ok(!json.includes(`"x":${p.x},"y":${p.y}`), 'しまの 座標が もれない');
  }
  const withIt = wd(M, { regions: GROUND });
  for (const f of isles) {
    const g = withIt.features.find((x) => x.id === f.id);
    assert.ok(g, f.id + ' は 見つけたら 出る');
    assert.ok(g.points.every((p) => p.on), f.id + ' は まるごと 出る');
  }
});

test('C4. ジャングルの なかみ(spot / path / zone / ひみつ)は 1つも かわって いない', () => {
  const { M } = setup();
  const w = M.WORLDS.jungle;
  assert.equal(w.spots.length, 40); assert.equal(w.paths.length, 57); assert.equal(w.zones.length, 10);
  assert.equal(w.spots.filter((s) => s.secret).length + w.paths.filter((p) => p[2] === 'secret').length, 10);
  // 地域の なかは world 座標。世界地図の mapX/mapY を まったく 見て いない
  const built = M.buildWorld('jungle', M.buildRegistry());
  assert.equal(built.regionId, 'jungle');
  assert.ok(!('mapX' in built) && !('mapY' in built), '地域の せかいは 世界地図の 座標を もたない');
  for (const sp of built.spots) assert.ok(Math.abs(sp.x) <= built.halfW && sp.z <= built.len, sp.id + ' は 地域の なかに ある');
});

test('C5. みちの かず・つなぎは この 回では かえて いない(船は まだ つくらない)', () => {
  const { M } = setup();
  const G = M.WORLD_GEOGRAPHY;
  const ids = G.connections.filter((c) => c.b).map((c) => c.id).sort();
  assert.equal(ids.length, 16, 'ふつうの みち + たてじくで 16 本(きおくは べつ)');
  assert.ok(ids.includes('jungle|sea'), 'ジャングル|うみ は のこす(あとで 船に する ところ)');
  assert.ok(ids.includes('desert|jungle'), 'さばく|ジャングル も のこす');
  // 船・フェリー・いかだは まだ どこにも ない
  const json = JSON.stringify(G);
  for (const w of ['ferry', 'raft', 'sail', 'フェリー', 'ふなたび', 'いかだ', 'こうろ']) {
    assert.ok(!json.includes(w), w + ' は まだ 入れて いない');
  }
});

// ──────────────────────────────────────────────── D. 地域では ない 地形の いみ

test('D1. 地形には ぜんぶ「あるいて いる ときの けしき」の いみが ついて いる', () => {
  const { M } = setup();
  const G = M.WORLD_GEOGRAPHY;
  const ROLES = ['wall', 'gate', 'edge', 'flow', 'beyond'];
  assert.equal(Object.keys(G.scenery).sort().join(','), G.features.map((f) => f.id).sort().join(','),
    '地形と いみが 1対1で そろって いる');
  for (const f of G.features) {
    const m = G.scenery[f.id];
    assert.ok(ROLES.includes(m.role), `${f.id} の role は ${ROLES.join('/')} の どれか`);
    assert.equal(typeof m.walk, 'boolean', f.id + ' は あるけるか どうかが きまって いる');
    assert.ok(m.far && m.far.length > 8, f.id + ' には とおくから 見える ときの けしきが ある');
    assert.ok(Array.isArray(m.near) && m.near.length > 0, f.id + ' は どこから 見えるか が ある');
    // 「見える 地域」は、その 地形が じっさいに 点を もつ 地域か、その となり
    for (const id of m.near) assert.ok(G.regions[id], `${f.id}.near の ${id} は ほんものの 地域`);
    // こえる ところ だけが こえる ときの けしきを もつ
    if (m.role === 'gate') assert.ok(m.cross, f.id + ' は こえる 地形なので cross が ある');
    else if (!m.walk) assert.equal(m.cross, null, f.id + ' は あるけないので cross は ない');
  }
  // あるけない = かべ か うみの むこう。ひがしの やまなみと しまは あるけない
  assert.equal(G.scenery['east-range'].walk, false);
  assert.equal(G.scenery['east-range'].role, 'wall');
  for (const f of G.features.filter((x) => x.kind === 'island')) {
    assert.equal(G.scenery[f.id].walk, false, f.id + ' へは まだ わたれない(船は これから)');
    assert.equal(G.scenery[f.id].role, 'beyond');
  }
});

test('D2. 地形の いみは 世界地図の データに 1文字も まざらない', () => {
  const { M } = setup();
  const full = wd(M, { regions: Object.keys(M.WORLD_GEOGRAPHY.regions) });
  const json = JSON.stringify(full);
  for (const [id, m] of Object.entries(M.WORLD_GEOGRAPHY.scenery)) {
    assert.ok(!json.includes(m.far), id + ' の けしきの ことばは ちずに のらない');
    if (m.cross) assert.ok(!json.includes(m.cross), id + ' の こえる ときの ことばも のらない');
  }
  // 点の note(地形の いみ)も 出さない
  for (const f of M.WORLD_GEOGRAPHY.features) for (const p of f.points) {
    if (p.note) assert.ok(!json.includes(p.note), f.id + ' の 点の note は ちずに のらない');
  }
  assert.ok(!json.includes('scenery'), 'いみの ブロックごと わたして いない');
});
