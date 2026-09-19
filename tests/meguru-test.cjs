const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

// ずかんに いろいろ のった セーブを つくる
function populated(h) {
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, speciesLine: 'dog', stageIndex: 4, ageTicks: 500 });
  const petStage = h.api.currentFormStageIndex();
  s.discoveredStages = ['dog:0', 'dog:1', `dog:${petStage}`, 'cat:2', 'penguin:3', 'salmon:5', 'sakura:6', 'dragon:7', 'ghost:1', 'mushroom:0', 'beetle:0'].filter((k, i, a) => a.indexOf(k) === i);
  s.petKey = `dog:${petStage}`;
  s.lifetime.companionsRecruited = ['shiba', 'owl', 'rabbit_friend'];
  s.lifetime.rareCompanionsRecruited = ['punyu'];
  s.companions = [{ id: 'shiba', bond: 80 }];
  s.lifetime.partnersRecorded = ['forest_bear', 'sea_mermaid'];
  s.partner = { id: 'sea_mermaid', label: 'うみのにんぎょ', emoji: '🧜', affection: 100 };
  s.regionId = 'forest';
  h.api.render();
  return s;
}

test('every dex entry becomes exactly one inhabitant somewhere; the current pet, companions and partner are not duplicated', () => {
  const h = harness(); const s = populated(h);
  const M = h.api.meguruMod; assert.ok(M, 'meguru module installed');
  const reg = M.buildRegistry();
  const keys = reg.residents.map((r) => r.key);
  // いまの じぶん(dog:4)は のぞく。ほかの すがたは ぜんぶ 1体ずつ
  assert.ok(!keys.includes('form:' + s.petKey), 'the player itself is not an inhabitant');
  for (const k of ['form:cat:2', 'form:penguin:3', 'form:salmon:5', 'form:sakura:6', 'form:dragon:7', 'form:ghost:1', 'form:mushroom:0', 'form:beetle:0']) assert.ok(keys.includes(k), k);
  for (const k of s.discoveredStages) if (k !== s.petKey) assert.ok(keys.includes('form:' + k), 'every other discovered form is an inhabitant: ' + k);
  // なかま・レアなかま・こいびと も ぜんいん(1体ずつ)
  for (const k of ['companion:shiba', 'companion:owl', 'companion:rabbit_friend', 'companion:punyu', 'partner:forest_bear', 'partner:sea_mermaid']) assert.equal(keys.filter((x) => x === k).length, 1, k);
  assert.equal(new Set(keys).size, keys.length, 'no duplicates');
  // いま つれている なかま・いまの こいびとは「いっしょに あるく」1体
  const shiba = reg.residents.find((r) => r.key === 'companion:shiba'); assert.equal(shiba.withPlayer, true); assert.equal(shiba.region, 'forest');
  const mer = reg.residents.find((r) => r.key === 'partner:sea_mermaid'); assert.equal(mer.withPlayer, true);
  const bear = reg.residents.find((r) => r.key === 'partner:forest_bear'); assert.equal(bear.withPlayer, false); assert.equal(bear.region, 'forest', 'recorded partners live in their first-encounter region');
  // すがたの すみか: らしい 地域
  assert.equal(reg.residents.find((r) => r.key === 'form:penguin:3').region, 'sea');
  assert.equal(reg.residents.find((r) => r.key === 'form:dragon:7').region, 'mountain');
  // どの 地域を あわせても、いっしょに あるく 2体 いがいは ぜんいん どこかに いる
  const placed = M.NORMAL_REGIONS.concat(['star_stop', 'memory_lake']).flatMap((id) => M.buildWorld(id, reg).residents.map((a) => a.key));
  const expected = keys.filter((k) => !reg.residents.find((r) => r.key === k).withPlayer);
  assert.deepEqual(placed.sort(), expected.sort(), 'each inhabitant is placed in exactly one world');
  assert.equal(M.companionsOf(reg).length, 2, 'two companions walk with the player');
});

test('Naoto never appears before the secret is unlocked, and afterwards waits at the far end of the memory lake', () => {
  const h = harness(); const s = populated(h);
  const M = h.api.meguruMod;
  assert.equal(h.api.isAuthorUnlocked(), false);
  let reg = M.buildRegistry();
  assert.equal(reg.naoto, null);
  for (const id of M.NORMAL_REGIONS.concat(['star_stop', 'memory_lake'])) assert.ok(!M.buildWorld(id, reg).residents.some((a) => a.kind === 'naoto'), id);
  s.lifetime.dexCleared = true; // ④ ずかんクリア = きぞんの かいきん じょうけん
  assert.equal(h.api.isAuthorUnlocked(), true);
  reg = M.buildRegistry();
  assert.equal(reg.naoto.region, 'memory_lake');
  const lake = M.buildWorld('memory_lake', reg);
  const naoto = lake.residents.find((a) => a.kind === 'naoto');
  assert.ok(naoto && naoto.fixed, 'Naoto stays at one special place');
  assert.equal(naoto.spot.kind, 'deep');
  assert.ok(naoto.z > lake.len * 0.85, 'at the far end');
  assert.ok(!M.buildWorld('forest', reg).residents.some((a) => a.kind === 'naoto'), 'not mixed into other worlds');
  assert.ok(!reg.residents.some((r) => r.kind === 'naoto'), 'kept out of the ordinary inhabitant list');
  const line = M.talkLine(naoto); assert.ok(typeof line === 'string' && line.length > 3);
});

test('entering めぐる from the travel screen switches to the field, inhabitants live, talking works, and returning restores home', () => {
  const h = harness(); const s = populated(h);
  h.api.renderTravelRegionGrid();
  assert.match(h.get('meguruEntry').innerHTML, /もりをめぐる/, 'the travel screen offers the current region');
  const homeHiddenBefore = h.get('screenNormal').classList.contains('hidden');
  assert.equal(h.api.startMeguru(), true);
  assert.equal(h.api.meguruActive(), true);
  assert.equal(h.get('screenNormal').classList.contains('hidden'), true, 'the home screen is hidden while exploring');
  assert.equal(h.get('meguruOverlay').classList.contains('hidden'), false);
  const run = h.api.meguruRun();
  assert.equal(run.world.regionId, 'forest');
  assert.ok(run.world.residents.length >= 3, 'the forest has inhabitants (bear, mushroom, beetle)');
  h.advance(2000);
  const states = new Set(run.world.residents.map((a) => a.behavior));
  assert.ok(states.size >= 1);
  for (const b of states) assert.ok(typeof b === 'string' && b.length > 0, 'every inhabitant carries a named behavior');
  // だれかの そばへ いって「はなす」
  const a = run.world.residents[0];
  run.setPlayer(a.x, a.z - 30); h.advance(40);
  assert.equal(run.nearest, a, 'the closest inhabitant is picked up');
  assert.equal(h.get('meguruOverlay').querySelector('#mgrTalk') !== null, true);
  run.talk();
  assert.ok(a.say && a.say.length > 0, 'a line appears');
  assert.equal(s.lifetime.meguru.talkCount, 1);
  assert.equal(s.lifetime.meguru.met[a.key], 1, 'met residents are recorded');
  // 地域が かわると(travelToRegion を とおった あと) せかいも かわる
  s.regionId = 'sea'; h.advance(40);
  assert.equal(run.world.regionId, 'sea');
  assert.ok(run.world.residents.some((r) => r.key === 'form:penguin:3'));
  h.api.stopMeguru();
  assert.equal(h.api.meguruActive(), false);
  assert.equal(h.get('meguruOverlay').classList.contains('hidden'), true, 'the field is closed');
  assert.equal(h.get('screenNormal').classList.contains('hidden'), homeHiddenBefore, 'the home screen is back to how it was');
  assert.equal(s.lifetime.meguru.visits, 1);
});

test('げんざいち keeps the home world and only changes its flavour; sleeping blocks entry', () => {
  const h = harness(); const s = populated(h);
  const M = h.api.meguruMod;
  s.regionId = 'home'; s.lifetime.currentLocationSelected = true; s.lifetime.currentLocation = { name: '函館市', display: '函館市', prefecture: '北海道', profileId: 'harbor' };
  h.api.renderTravelRegionGrid();
  assert.match(h.get('meguruEntry').innerHTML, /げんざいち（函館市）をめぐる/);
  const w = M.buildWorld('home', M.buildRegistry(), { locality: { profileId: 'harbor' } });
  assert.equal(w.regionId, 'home'); assert.ok(w.local && w.local.label === '港のまち');
  s.isSleeping = true;
  assert.equal(h.api.startMeguru(), false, 'no exploring while asleep');
});

test('the simulation runs with no renderer or DOM: world coordinates, movement, obstacles, meeting and talking', () => {
  const h = harness(); populated(h);
  const M = h.api.meguruMod;
  const sim = M.createSimulation({ regionId: 'forest', env: { time: 'day', weather: 'sunny', season: 'spring', region: 'forest' } });
  assert.equal(sim.world.regionId, 'forest');
  assert.ok(sim.world.obstacles.length > 0, 'spot landmarks are solid obstacles');
  // ワールド座標だけ(px は ない)
  for (const a of sim.world.residents.concat(sim.party, [sim.player])) { assert.equal(typeof a.x, 'number'); assert.equal(typeof a.z, 'number'); assert.ok(!('sx' in a) && !('sy' in a), 'no screen coordinates on actors'); }
  // まえへ あるく → z が ふえる。せかいの そとへは でない
  const z0 = sim.player.z;
  for (let i = 0; i < 60; i++) sim.step(1 / 60, { x: 0, y: -1 });
  assert.ok(sim.player.z > z0 + 200, 'walked forward in world units');
  for (let i = 0; i < 1200; i++) sim.step(1 / 60, { x: 1, y: -1 });
  assert.ok(Math.abs(sim.player.x) <= sim.world.halfW && sim.player.z >= sim.RULES.zMargin && sim.player.z <= sim.world.len - sim.RULES.zMargin, 'stays inside the world');
  // こものは とおりぬけられない
  const o = sim.world.obstacles[0]; sim.setPlayer(o.x - o.r - 5, o.z);
  for (let i = 0; i < 30; i++) sim.step(1 / 60, { x: 1, y: 0 });
  assert.ok(sim.dist(sim.player, o) >= o.r - 0.01, 'pushed out of the obstacle');
  // ちかづくと であう → イベント。はなす → ふきだし(びょう で かんり)
  const a = sim.world.residents.find((r) => !r.fixed);
  sim.setPlayer(a.x, a.z - 20);
  const events = sim.step(1 / 60, { x: 0, y: 0 });
  assert.ok(events.some((ev) => ev.type === 'met' && ev.actor === a), 'met event');
  assert.equal(sim.nearest, a);
  const said = sim.talk();
  assert.ok(said && said.actor === a && said.line.length > 0);
  assert.ok(a.sayFor > 0);
  for (let i = 0; i < 300; i++) sim.step(1 / 60, { x: 0, y: 0 });
  assert.equal(a.say, null, 'the bubble expires by simulated time, not wall-clock');
  // いっしょに あるく なかまは、通常の歩行中に追いつく。
  // setPlayer はテスト用の即時位置指定なので、直前の別地点から2秒で
  // 歩かせるのではなく、実際の入力移動で追従を確認する。
  const followSim = M.createSimulation({ regionId: 'forest', env: { time: 'day', weather: 'sunny', season: 'spring', region: 'forest' } });
  for (let i = 0; i < 240; i++) followSim.step(1 / 60, { x: 0, y: -1 });
  for (const [i, p] of followSim.party.entries()) {
    const side = p.kind === 'partner' ? -followSim.player.face : (i % 2 === 0 ? 1 : -1) * (1 + Math.floor(i / 2) * .9);
    const target = { x: followSim.player.x + side * followSim.RULES.follow.gap, z: followSim.player.z + followSim.RULES.follow.back + i * followSim.RULES.follow.spacing };
    const lag = Math.hypot(p.x - target.x, p.z - target.z);
    assert.ok(lag < 90, `party follows its ordinary walking position (lag=${lag.toFixed(1)}, slot=${i})`);
  }
  // view は ワールド座標のまま
  const v = sim.view();
  assert.equal(v.player, sim.player); assert.equal(v.camera.z, sim.player.z); assert.ok(Array.isArray(v.residents));
});

test('the renderer is swappable: a custom renderer receives sim.view() and the world is never given screen coordinates', () => {
  const h = harness(); const s = populated(h);
  const M = h.api.meguruMod;
  const seen = [];
  const fakeRenderer = (o) => { assert.ok('W' in o && 'H' in o && 'tier' in o); return { draw(view, now) { seen.push({ view, now }); assert.ok(view.world && view.player && view.camera && view.env); }, destroy() { seen.destroyed = true; } }; };
  const container = h.document.getElementById('meguruOverlay');
  const run = M.start(container, { renderer: fakeRenderer });
  h.advance(200);
  assert.ok(seen.length >= 5, 'the custom renderer is called every frame: ' + seen.length);
  const v = seen[seen.length - 1].view;
  assert.equal(v.regionId, s.regionId);
  for (const a of v.residents.concat(v.party)) assert.ok(!('sx' in a) && !('sy' in a) && !('px' in a), 'renderer never writes screen coordinates back into the world');
  // せかいは レンダラーに よらず うごく
  const z0 = run.player.z; run.setPlayer(0, 300); h.advance(50); assert.notEqual(run.player.z, z0);
  run.stop();
  assert.equal(seen.destroyed, true);
});

test('every region is a spot graph: all spots reachable from the entrance, at least one loop and one secret place, crowds uneven', () => {
  const h = harness(); populated(h);
  const M = h.api.meguruMod;
  for (const id of Object.keys(M.WORLDS)) {
    const w = M.WORLDS[id];
    const ids = new Set(w.spots.map((s) => s.id));
    assert.ok(w.spots.length >= 8 && w.spots.length <= 60, id + ' has 8-60 spots');
    for (const sp0 of w.spots) assert.ok(w.zones.some((z) => z.id === sp0.zone), id + ': spot ' + sp0.id + ' belongs to a zone');
    for (const sp0 of w.spots) assert.ok(Math.abs(sp0.x) <= w.halfW && sp0.z <= w.len, id + ': spot inside the world: ' + sp0.id);
    for (const [a, b] of w.paths) assert.ok(ids.has(a) && ids.has(b), id + ' path endpoints exist: ' + a + '-' + b);
    assert.equal(M.reachableSpots(w, w.spots[0].id).size, w.spots.length, id + ': every spot is reachable from the entrance');
    assert.ok(w.paths.length >= w.spots.length, id + ': has at least one loop (edges >= nodes)');
    assert.ok(w.spots.some((s) => s.secret), id + ': has a secret place');
    assert.ok(w.spots.some((s) => s.hub) || id === 'memory_lake', id + ': has a hub');
    // ひろば と しずかな こみち の crowd が ちがう
    const crowds = w.spots.map((s) => s.crowd);
    assert.ok(Math.max(...crowds) >= (id === 'memory_lake' ? 3 : 5) && Math.min(...crowds) <= 1, id + ': crowd weights are uneven');
  }
  // ずかんの ひとが おおい 地域では ひろばが いちばん にぎやかで、かくし ばしょは 1体だけ
  const reg = M.buildRegistry();
  const forest = M.buildWorld('forest', reg);
  const per = {}; for (const a of forest.residents) per[a.spot.id] = (per[a.spot.id] || 0) + 1;
  const hub = forest.hub.id;
  assert.ok(per[hub] >= Math.min(6, Math.ceil(forest.residents.length / 3)), 'the hub is populated: ' + JSON.stringify(per));
  for (const s of forest.spots) if (s.secret) assert.ok((per[s.id] || 0) <= 1, 'secret spot holds at most one resident');
  // しゃへいぶつ(かたい もの)が みちの わきに ある
  assert.ok(forest.props.filter((p) => p.layer === 'wall').length >= 10, 'occluders line the paths');
  assert.ok(forest.props.some((p) => p.landmark === 'bigtree'), 'the forest has its landmark');
});

test('camera-relative input, a camera that turns toward the walk direction, spot discovery events and facing', () => {
  const h = harness(); populated(h);
  const M = h.api.meguruMod;
  const sim = M.createSimulation({ regionId: 'forest', env: { time: 'day', weather: 'sunny', season: 'spring', region: 'forest' } });
  assert.equal(sim.camera.yaw, 0);
  // いりぐち に たった しゅんかんに スポットの できごと(はじめて)
  let events = sim.step(1 / 60, { x: 0, y: -1 });
  const spotEv = events.find((e) => e.type === 'spot');
  assert.ok(spotEv && spotEv.spot.id === sim.world.entry.id && spotEv.first === true, 'entering the entrance spot is reported as a first discovery');
  assert.ok(sim.discovered.has(sim.world.entry.id));
  // みぎへ あるきつづける → カメラが みぎへ まわる(すぐには まわらない)。ひろばの まんなか(しゃへいぶつ なし)から
  sim.setPlayer(sim.world.hub.x, sim.world.hub.z); sim.step(1 / 60, { x: 0, y: 0 });
  const yaw0 = sim.camera.yaw;
  for (let i = 0; i < 6; i++) sim.step(1 / 60, { x: 1, y: 0 });
  assert.ok(Math.abs(sim.camera.yaw - yaw0) < 0.4, 'the camera turns gradually');
  for (let i = 0; i < 36; i++) sim.step(1 / 60, { x: 1, y: 0 });
  assert.ok(sim.camera.yaw > 0.5 && sim.camera.yaw < 1.7, 'after half a second the camera has turned toward the walk direction: ' + sim.camera.yaw.toFixed(2));
  // にゅうりょくは カメラ きじゅん(ゆびを おきなおすと いまの むきが きじゅん): 「うえ」は ワールドの +x よりに すすむ
  sim.step(1 / 60, { x: 0, y: 0 });
  const x0 = sim.player.x;
  for (let i = 0; i < 30; i++) sim.step(1 / 60, { x: 0, y: -1 });
  assert.ok(sim.player.x > x0 + 40, 'forward on the pad follows the camera heading');
  // むきの はんてい(レンダラーが え を えらぶ ための やくそく)
  assert.equal(M.facingOf(0, 0), 'back'); assert.equal(M.facingOf(Math.PI, 0), 'front'); assert.equal(M.facingOf(Math.PI / 2, 0), 'right'); assert.equal(M.facingOf(-Math.PI / 2, 0), 'left');
  assert.deepEqual(JSON.parse(JSON.stringify(M.spriteFor({ sprites: { front: 'a.png' }, asset: 'a.png', face: 1 }, 'left'))), { asset: 'a.png', flip: true });
  assert.deepEqual(JSON.parse(JSON.stringify(M.spriteFor({ sprites: { front: 'a.png', side: 's.png' }, asset: 'a.png', face: 1 }, 'right'))), { asset: 's.png', flip: false });
  // ちずの データ: かくし ばしょは みつけるまで のらない
  const map = sim.mapData();
  assert.ok(map.spots.every((s) => !s.secret), 'secret spots are hidden from the map until discovered');
  const secret = sim.world.spots.find((s) => s.secret);
  sim.setPlayer(secret.x, secret.z); events = sim.step(1 / 60, { x: 0, y: 0 });
  assert.ok(events.some((e) => e.type === 'spot' && e.spot === secret && e.first), 'stepping into a secret place discovers it');
  assert.ok(sim.mapData().spots.some((s) => s.id === secret.id), 'discovered secret spots appear on the map');
  // みちの うえ と そと で はやさが ちがう
  assert.ok(M.onPath({ x: sim.world.entry.x, z: sim.world.entry.z + 100 }, sim.world), 'the entrance road is walkable');
  assert.equal(M.onPath({ x: sim.world.halfW - 10, z: 100 }, sim.world), false, 'the far corner is off the road');
});

test('spot discoveries are saved per region and survive re-entering', () => {
  const h = harness(); const s = populated(h);
  assert.equal(h.api.startMeguru(), true);
  const run = h.api.meguruRun();
  h.advance(40);
  assert.ok((s.lifetime.meguru.spots.forest || []).includes(run.world.entry.id), 'the entrance is recorded as discovered');
  const secret = run.world.spots.find((sp) => sp.secret);
  run.setPlayer(secret.x, secret.z); h.advance(40);
  assert.ok(s.lifetime.meguru.spots.forest.includes(secret.id), 'the secret place is recorded once found');
  h.api.stopMeguru();
  assert.equal(h.api.startMeguru(), true);
  const run2 = h.api.meguruRun();
  assert.ok(run2.sim.discovered.has(secret.id), 'discoveries are restored on re-entry');
  h.api.stopMeguru();
});

test('holding one pad direction never spins the camera: the input frame is locked while the finger stays down', () => {
  const h = harness(); populated(h);
  const M = h.api.meguruMod;
  const sim = M.createSimulation({ regionId: 'forest', env: { time: 'day', weather: 'sunny', season: 'spring', region: 'forest' } });
  sim.setPlayer(0, 780);
  for (let i = 0; i < 180; i++) sim.step(1 / 60, { x: -1, y: 0 });
  assert.ok(sim.player.x < -300, 'walking left keeps going left in the world: x=' + Math.round(sim.player.x));
  assert.ok(sim.camera.yaw < -0.4 && sim.camera.yaw > -2.0, 'the camera turned toward the left but stopped once aligned: ' + sim.camera.yaw.toFixed(2));
});

test('regions differ in size and structure; zones give a mood that changes with depth; the forest is the maze', () => {
  const h = harness(); populated(h);
  const M = h.api.meguruMod;
  const W = M.WORLDS;
  assert.ok(W.forest.spots.length >= 20 && W.forest.paths.length >= W.forest.spots.length + 5, 'the forest has many spots and extra loops');
  assert.ok(W.home.spots.length <= 16 && W.home.len < W.forest.len * 0.5, 'home stays compact');
  assert.ok(W.desert.halfW >= 1700 && W.desert.len >= 4400, 'the desert is the widest');
  assert.ok(W.memory_lake.halfW <= 1400 && W.memory_lake.halfW < W.desert.halfW * 0.5 && W.memory_lake.spots.filter((s) => s.secret).length >= 2, 'the memory lake is narrow and hides its end');
  // ふかい 地区は くらく きりが ふかい(おくへ いくほど けしきが かわる)
  const reg = M.buildRegistry();
  const forest = M.buildWorld('forest', reg);
  const deepSpot = forest.spots.find((s) => s.zone === 'deep' && s.kind === 'grove');
  const entry = M.moodAt(forest, forest.entry.x, forest.entry.z), deep = M.moodAt(forest, deepSpot.x, deepSpot.z);
  assert.ok(deep.light < entry.light - 0.15 && deep.fog > entry.fog + 0.2, 'deep forest is darker and foggier: ' + JSON.stringify({ entry, deep }));
  assert.equal(deep.zone.id, 'deep'); assert.equal(entry.zone.id, 'bright');
  // かくし みちには さそい(ヒント)と あかり、ぶんきには ひょうしき、みちの ふちに もよう
  assert.ok(forest.props.some((p) => p.layer === 'hint') && forest.props.some((p) => p.layer === 'glow'), 'secret paths carry hints');
  assert.ok(forest.props.some((p) => p.layer === 'sign'), 'junctions carry a signpost');
  assert.ok(forest.marks.some((m) => m.edge), 'paths have edge marks');
  // にたような こだち の 地区では しゃへいぶつが おおい
  const wallsIn = (zoneId) => forest.props.filter((p) => p.layer === 'wall' && M.moodAt(forest, p.x, p.z).zone.id === zoneId).length;
  assert.ok(wallsIn('thicket') > wallsIn('bright'), 'the thicket is denser than the bright woods');
  // シミュレーションは 地区を しっている
  const sim = M.createSimulation({ regionId: 'forest', env: { time: 'day', weather: 'sunny', season: 'spring', region: 'forest' } });
  sim.step(1 / 60, { x: 0, y: 0 });
  assert.equal(sim.zone.id, 'bright'); assert.ok(sim.view().mood.light > 0.95);
  const greatSpot = forest.spots.find((s) => s.id === 'great');
  sim.setPlayer(greatSpot.x, greatSpot.z); sim.step(1 / 60, { x: 0, y: 0 });
  assert.equal(sim.zone.id, 'great');
  assert.ok(sim.mapData().zones.length === forest.zones.length);
});
