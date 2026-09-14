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
  const states = new Set(run.world.residents.map((a) => a.state));
  assert.ok(states.size >= 1);
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

test('Meguru defers item notices and leaves game rewards and Star categories unchanged', () => {
  const h = harness(); const s = populated(h);
  h.get('lifeCardOverlay').classList.add('hidden');
  h.get('storyFlash').classList.add('hidden');
  s.lifetime.equippedItemId = 'star';
  s.lifetime.itemProgress.starGames = ['quick-run'];
  const before = { money: s.lifetime.money, records: JSON.stringify(s.lifetime.minigameRecords), stars: JSON.stringify(s.lifetime.itemProgress.starGames) };

  h.api.renderTravelRegionGrid();
  assert.equal(h.api.startMeguru(), true);
  h.api.scheduleItemContextMessage('アイテムの通知はホームに戻ってから');
  h.advance(1);
  assert.equal(h.api.getMessage(), '', 'an item notice waits while Meguru owns the home scene');

  const run = h.api.meguruRun(); const actor = run.world.residents[0];
  run.setPlayer(actor.x, actor.z - 30); h.advance(40); run.talk();
  h.api.stopMeguru();
  assert.equal(h.api.meguruActive(), false);
  h.get('storyFlash').classList.add('hidden');
  h.advance(300);
  assert.equal(h.api.getMessage(), 'アイテムの通知はホームに戻ってから');
  assert.equal(s.lifetime.money, before.money, 'walking and talking grant no game reward');
  assert.equal(JSON.stringify(s.lifetime.minigameRecords), before.records, 'Meguru writes no minigame record');
  assert.equal(JSON.stringify(s.lifetime.itemProgress.starGames), before.stars, 'Meguru is not a Star game category');
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
  // まえへ あるく → z が ふえる。はしで とまる
  const z0 = sim.player.z;
  for (let i = 0; i < 60; i++) sim.step(1 / 60, { x: 0, y: -1 });
  assert.ok(sim.player.z > z0 + 200, 'walked forward in world units');
  for (let i = 0; i < 1200; i++) sim.step(1 / 60, { x: 1, y: -1 });
  assert.equal(sim.player.x, sim.RULES.xBound); assert.equal(sim.player.z, sim.world.len - sim.RULES.zMargin);
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
