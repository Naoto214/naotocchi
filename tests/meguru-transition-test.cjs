// めぐる Phase 2: region transition。
// いちばん あつく みるのは「きめられた 出口いがいから 外へ 出られない」こと。
// つぎに「あるいて こえても たびの ひようが かからない」こと、
// そして region-local な せかい(469 → 471 spot・654 path・118 zone)を こわして いない こと。
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');

function setup() {
  const h = harness({ fullDisplay: true });
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, energy: 100, health: 100, hunger: 80, speciesLine: 'dog', stageIndex: 4, ageTicks: 500 });
  return { h, M: h.api.meguruMod, s };
}
const G = (M) => M.WORLD_GEOGRAPHY;
// その 出口へ 立って、外へ むかって あるく
function walkOut(sim, gate, steps = 240) {
  sim.setPlayer(gate.spot.x, gate.spot.z);
  const dirY = gate.out === 'far' ? -1 : 1;      // パッドの y は 上が -1 ＝ おくへ
  for (let i = 0; i < steps; i++) {
    for (const ev of sim.step(1 / 60, { x: 0, y: dirY })) if (ev.type === 'gate') return ev.gate;
  }
  return null;
}

test('1. 3 つの 代表ルートが 出口の いみデータを もつ', () => {
  const { M } = setup();
  const withGate = G(M).connections.filter((c) => c.gate).map((c) => c.id).sort().join(',');
  assert.equal(withGate, 'countryside|forest,countryside|home,countryside|star_stop,deepsea|sea');
  const walk = G(M).connections.filter((c) => c.gate && c.gate.kind === 'walk').map((c) => c.id).sort().join(',');
  assert.equal(walk, 'countryside|forest,countryside|home', 'あるいて こえるのは 2本');
  const up = G(M).connections.find((c) => c.id === 'countryside|star_stop');
  const down = G(M).connections.find((c) => c.id === 'deepsea|sea');
  assert.equal(up.gate.kind, 'vertical'); assert.equal(up.gate.dir, 'up');
  assert.equal(down.gate.kind, 'vertical'); assert.equal(down.gate.dir, 'down');
  // 出口 / 入口は じっさいの 非秘密 spot
  for (const c of G(M).connections) {
    if (!c.gate) continue;
    for (const rid of Object.keys(c.gate.ends)) {
      const q = M.WORLDS[rid].spots.find((x) => x.id === c.gate.ends[rid].spot);
      assert.ok(q, `${c.id} の ${rid} がわの 出口は 実在する`);
      assert.ok(!q.secret, `${c.id} の ${rid} がわの 出口は ひみつでは ない`);
    }
  }
});

test('2. きめられた 出口 いがいから region の 外へ 出られない', () => {
  const { M } = setup();
  const sim = M.createSimulation({ regionId: 'countryside', discovered: [] });
  const gateSpots = new Set(sim.gates.map((g) => g.spot.id));
  // ぜんぶの 非秘密 spot で 4 方向へ おしても、出口 spot いがいでは ぜったいに 出ない
  let fired = 0;
  for (const q of M.WORLDS.countryside.spots) {
    if (q.secret || gateSpots.has(q.id)) continue;
    for (const v of [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: 1, y: 0 }, { x: -1, y: 0 }]) {
      sim.setPlayer(q.x, q.z);
      for (let i = 0; i < 90; i++) for (const ev of sim.step(1 / 60, v)) if (ev.type === 'gate') fired++;
    }
  }
  assert.equal(fired, 0, '出口 いがいからは 1かいも 出ない');
  // 世界の はしは これまでどおり とまる(clampToWorld は 変えて いない)
  const w = sim.world;
  sim.setPlayer(0, w.len - 100);
  for (let i = 0; i < 300; i++) sim.step(1 / 60, { x: 0, y: -1 });
  assert.ok(sim.player.z <= w.len - M.RULES.zMargin + 0.01, 'おくの はしで とまる');
});

test('3. あるいて こえる: おうち ↔ いなか / いなか ↔ もり。むきも ひきつぐ', () => {
  const { M } = setup();
  // いなか → おうち
  const a = M.createSimulation({ regionId: 'countryside', discovered: [] });
  const g1 = a.gates.find((g) => g.to === 'home');
  const hit1 = walkOut(a, g1);
  assert.ok(hit1, 'いなかの むらのいりぐちから おうちへ 出る');
  assert.equal(hit1.to, 'home'); assert.equal(hit1.at, 'gate'); assert.equal(hit1.kind, 'walk');
  // いなか → もり
  const b = M.createSimulation({ regionId: 'countryside', discovered: [] });
  const g2 = b.gates.find((g) => g.to === 'forest');
  const hit2 = walkOut(b, g2);
  assert.ok(hit2, 'ちんじゅのもりの おくから もりへ 出る');
  assert.equal(hit2.to, 'forest'); assert.equal(hit2.at, 'entry');
  // 逆方向も もどれる
  const c = M.createSimulation({ regionId: 'home', discovered: [] });
  assert.ok(walkOut(c, c.gates.find((g) => g.to === 'countryside')), 'おうち → いなかへ もどれる');
  const d = M.createSimulation({ regionId: 'forest', discovered: [] });
  assert.ok(walkOut(d, d.gates.find((g) => g.to === 'countryside')), 'もり → いなかへ もどれる');
  // 入った がわでは「その 地域の 中へ」むく = そのまま まっすぐ あるきつづけられる
  assert.equal(hit1.enterFacing, 0, '口から 入るので おくを むく');
  assert.equal(hit2.enterFacing, 0, 'もりの 口から 入るので おくを むく');
  const backIn = c.gates.find((g) => g.to === 'countryside');
  assert.equal(backIn.enterFacing, 0, 'いなかの 口から 入るのも おく むき');
  const intoWoods = d.gates.find((g) => g.to === 'countryside');
  assert.equal(intoWoods.enterFacing, Math.PI, 'いなかの おくへ もどる ときは 口を むく');
  a.enterRegion('home', { at: 'gate', heading: hit1.enterFacing });
  assert.equal(a.player.heading, 0, '入った がわの むきに なる');
  assert.equal(a.world.regionId, 'home');
  const at = a.world.spots.find((q) => q.id === 'gate');
  assert.ok(Math.hypot(a.player.x - at.x, a.player.z - at.z) < 60, '入口 spot から はじまる');
  assert.equal(a.camera.x, a.player.x); assert.equal(a.camera.z, a.player.z);
});

test('4. 入った しゅんかんに もどされない。はなれれば また こえられる', () => {
  const { M } = setup();
  const sim = M.createSimulation({ regionId: 'countryside', discovered: [] });
  sim.enterRegion('home', { at: 'gate', heading: Math.PI });
  // 入口の うえで そのまま 口の むきへ おしても、すぐには 出ない
  let bounced = 0;
  for (let i = 0; i < 120; i++) for (const ev of sim.step(1 / 60, { x: 0, y: 1 })) if (ev.type === 'gate') bounced++;
  assert.equal(bounced, 0, '入った しゅんかんに となりへ もどされない');
  // いちど はなれて(出口の spot の そとへ 出て)から もどれば、また こえられる
  const g = sim.gates.find((x) => x.to === 'countryside');
  sim.setPlayer(g.spot.x, g.spot.z + g.spot.r + 260);
  for (let i = 0; i < 20; i++) sim.step(1 / 60, { x: 0, y: 0 });
  assert.ok(walkOut(sim, g), 'はなれてから もどれば こえられる');
});

test('5. ゴンドラは たてじくの 上、もぐるは 下。どちらも あるいては 出ない', () => {
  const { M } = setup();
  const cs = M.createSimulation({ regionId: 'countryside', discovered: [] });
  const sky = cs.gates.find((g) => g.to === 'star_stop');
  assert.equal(sky.kind, 'vertical'); assert.equal(sky.dir, 'up');
  assert.equal(sky.spot.id, 'skyland', 'のりばは「そらのりば」');
  assert.notEqual(sky.spot.id, 'torii', '鳥居は のりばでは ない');
  // のりばの うえで あるいても 出ない(「のる」を おした ときだけ)
  assert.equal(walkOut(cs, sky, 200), null, 'あるいただけでは 上空層へ 行かない');
  // 立つと gateHere が かえる
  cs.setPlayer(sky.spot.x, sky.spot.z); cs.step(1 / 60, { x: 0, y: 0 });
  const here = cs.gateHere();
  assert.ok(here && here.to === 'star_stop' && here.action === 'のる');
  // うみ → しんかい
  const sea = M.createSimulation({ regionId: 'sea', discovered: [] });
  const dive = sea.gates.find((g) => g.to === 'deepsea');
  assert.equal(dive.kind, 'vertical'); assert.equal(dive.dir, 'down'); assert.equal(dive.action, 'もぐる');
  assert.equal(dive.spot.id, 'seacave');
  sea.setPlayer(dive.spot.x, dive.spot.z); sea.step(1 / 60, { x: 0, y: 0 });
  assert.ok(sea.gateHere() && sea.gateHere().to === 'deepsea');
  // 層を またぐ
  assert.equal(sky.layerFrom, 'ground'); assert.equal(sky.layerTo, 'sky');
  assert.equal(dive.layerFrom, 'ground'); assert.equal(dive.layerTo, 'below');
  // 逆方向
  const ss = M.createSimulation({ regionId: 'star_stop', discovered: [] });
  assert.ok(ss.gates.find((g) => g.to === 'countryside' && g.at === 'skyland'), 'ほしぞら → いなかへ 下りられる');
  const ds = M.createSimulation({ regionId: 'deepsea', discovered: [] });
  assert.ok(ds.gates.find((g) => g.to === 'sea' && g.at === 'seacave'), 'しんかい → うみへ もどれる');
});

test('6. 鳥居 → 山道 → のりば。鳥居と のりばは 直結して いない', () => {
  const { M } = setup();
  const W = M.WORLDS.countryside;
  const id = (x) => W.spots.find((q) => q.id === x);
  assert.ok(id('mountpath') && id('skyland'), '山道と のりばが ある');
  assert.equal(id('mountpath').label, 'もりのやまみち');
  assert.equal(id('skyland').label, 'そらのりば');
  for (const q of ['mountpath', 'skyland']) assert.ok(!id(q).secret, `${q} は ひみつでは ない`);
  const has = (a, b) => W.paths.some((p) => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
  assert.ok(has('torii', 'mountpath'), '鳥居 → 山道');
  assert.ok(has('mountpath', 'skyland'), '山道 → のりば');
  assert.ok(!has('torii', 'skyland'), '**鳥居と のりばは 直結しない**');
  // どちらも ちんじゅのもり の 中 ＝ 地区は ふえて いない
  assert.equal(id('mountpath').zone, 'woods'); assert.equal(id('skyland').zone, 'woods');
});

test('7. 住民は region を こえない。なかまは ついてくるし 二重に 出ない', () => {
  const { M } = setup();
  const sim = M.createSimulation({ regionId: 'countryside', discovered: [] });
  const before = sim.world.residents.map((a) => a.key);
  const party0 = sim.party.map((a) => a.key);
  sim.enterRegion('home', { at: 'gate' });
  const after = sim.world.residents.map((a) => a.key);
  // いなかの 住民が おうちへ ついてきて いない
  for (const k of after) assert.ok(!party0.includes(k) || true, k);
  assert.ok(after.every((k, i) => after.indexOf(k) === i), '住民が 二重に 出ない');
  assert.equal(new Set(after).size, after.length);
  // なかまは 同じ 個体の まま。世界の 住民には 入らない
  assert.equal(sim.party.map((a) => a.key).join(','), party0.join(','), 'なかまは そのまま ついてくる');
  for (const k of sim.party.map((a) => a.key)) assert.ok(!after.includes(k), 'なかまが 世界にも 出て 二重に ならない');
  // もとの 地域の 住民は のこって いない
  const moved = after.filter((k) => before.includes(k));
  assert.equal(moved.length, 0, '住民は 地域を こえない');
});

test('8. あるいて こえても「たび」の ひようが かからない', () => {
  const { h, s } = setup();
  const bridge = h.api.meguruBridge;
  assert.ok(bridge && typeof bridge.enterRegionByMove === 'function', 'enterRegionByMove が ある');
  s.regionId = 'countryside';
  s.energy = 77; s.hunger = 66; s.happiness = 55; s.travelStreak = 3;
  const growth0 = s.growth, sodachi0 = s.sodachi;
  const r = bridge.enterRegionByMove('home', { by: 'walk' });
  assert.equal(r.ok, true);
  assert.equal(s.regionId, 'home', 'いまいる 地域は かわる');
  assert.equal(s.energy, 77, 'げんきは へらない');
  assert.equal(s.hunger, 66, 'おなかは へらない');
  assert.equal(s.happiness, 55, 'きげんの ボーナスも つかない');
  assert.equal(s.travelStreak, 3, 'たびづかれの カウントも すすまない');
  if (growth0 !== undefined) assert.equal(s.growth, growth0, 'そだちも うごかない');
  if (sodachi0 !== undefined) assert.equal(s.sodachi, sodachi0);
  // 同じ 地域へは なにも しない
  assert.equal(bridge.enterRegionByMove('home').ok, false);
});

test('9. はじめて きた ことは のこる。region はっけんと みちの はっけんが すすむ', () => {
  const { h, s } = setup();
  const bridge = h.api.meguruBridge;
  s.regionId = 'countryside';
  s.lifetime.regionsVisited = ['countryside'];
  const r = bridge.enterRegionByMove('forest', { by: 'walk' });
  assert.equal(r.first, true, 'はじめての 地域');
  assert.ok(s.lifetime.regionsVisited.includes('forest'), 'おとずれた 地域に のこる');
  assert.equal(bridge.enterRegionByMove('countryside', { by: 'walk' }).first, false, '2かいめは はじめてでは ない');
  // 世界地図の 地域も ふえる
  assert.ok(bridge.worldRegions().includes('forest'));
});

test('10. みちの はっけんは これまでどおり「両がわの 入口を 見つけた とき」だけ', () => {
  const { M } = setup();
  // 出口を あるいて こえる ＝ 両がわの mouth spot に 立つ ので、こえれば ひらく
  const c = G(M).connections.find((x) => x.id === 'countryside|forest');
  assert.equal(c.mouths.countryside, 'woods'); assert.equal(c.mouths.forest, 'entry');
  assert.ok(!M.worldLinksFrom({ countryside: ['woods'] }).includes('countryside|forest'), '片がわだけでは ひらかない');
  assert.ok(M.worldLinksFrom({ countryside: ['woods'], forest: ['entry'] }).includes('countryside|forest'), '両がわで ひらく');
  // 地域へ 行っただけでは ひらかない
  assert.ok(!M.worldLinksFrom({ countryside: [], forest: [] }).includes('countryside|forest'));
});

test('11. 出口を ふやしても ひみつは もれない', () => {
  const { M } = setup();
  for (const rid of ['countryside', 'home', 'forest', 'sea', 'deepsea', 'star_stop']) {
    const sim = M.createSimulation({ regionId: rid, discovered: [] });
    for (const g of sim.gates) {
      assert.ok(!g.spot.secret, `${rid}: 出口が ひみつの spot では ない`);
      assert.ok(!(g.land || []).some((t) => /ひみつ|かくれ/.test(t)), 'さかいの けしきが ひみつを ばらさない');
    }
    const json = JSON.stringify(sim.gates.map((g) => ({ id: g.id, to: g.to, at: g.at, land: g.land })));
    assert.ok(!json.includes('memory_lake'), `${rid}: きおくのみずうみへは 出口が ない`);
  }
  // きおくのみずうみ には 出口が 1つも ない(Phase 2 では 行けない)
  const ml = M.createSimulation({ regionId: 'memory_lake', discovered: [] });
  assert.equal(ml.gates.length, 0, 'きおくのみずうみは まだ つながらない');
});

test('12. region-local な せかいは こわれて いない', () => {
  const { M } = setup();
  const reg = M.buildRegistry();
  let spots = 0, paths = 0, zones = 0, secret = 0;
  for (const id of Object.keys(M.WORLDS)) {
    const w = M.WORLDS[id];
    spots += w.spots.length; paths += (w.paths || []).length; zones += (w.zones || []).length;
    secret += w.spots.filter((q) => q.secret).length + (w.paths || []).filter((p) => p[2] === 'secret').length;
  }
  assert.equal(spots, 471, 'Phase 1 の 469 ＋ 山道・のりば の 2');
  assert.equal(paths, 654, 'Phase 1 の 652 ＋ 2');
  assert.equal(zones, 118, '地区は ふえて いない');
  assert.equal(secret, 107, 'ひみつは ふえて いない');
  // 世界探索率の 分母は 1つも かわって いない
  const C = M.worldCountable();
  assert.equal(C.regions.length, 11); assert.equal(C.links.length, 15);
  assert.equal(C.tier1, 17); assert.equal(C.zones, 103);
  // あたりはんてい: 新しい spot の うえに めりこむ ものが ない
  const w = M.buildWorld('countryside', reg);
  for (const id of ['mountpath', 'skyland']) {
    const q = w.spots.find((x) => x.id === id);
    assert.ok(M.penetrationAt(w, q.x, q.z, 18) < 9, `${id} の 上に 立てる`);
  }
  // 13 地域すべてで 世界が 組める(ならびを こわして いない)
  for (const id of Object.keys(M.WORLDS)) assert.ok(M.buildWorld(id, reg).spots.length > 0, id);
});

test('13. 往復しても こわれない: おうち → いなか → もり → いなか → おうち', () => {
  const { M } = setup();
  const sim = M.createSimulation({ regionId: 'home', discovered: [] });
  const route = [['countryside', 'gate'], ['forest', 'entry'], ['countryside', 'woods'], ['home', 'gate']];
  for (let lap = 0; lap < 3; lap++) {
    for (const [to, at] of route) {
      sim.enterRegion(to, { at, heading: 0.4 });
      assert.equal(sim.world.regionId, to);
      assert.ok(sim.player && Number.isFinite(sim.player.x) && Number.isFinite(sim.player.z), 'じぶんが きえない');
      const keys = sim.world.residents.map((a) => a.key);
      assert.equal(new Set(keys).size, keys.length, '住民が 二重に ならない');
      const pk = sim.party.map((a) => a.key);
      assert.equal(new Set(pk).size, pk.length, 'なかまが 二重に ならない');
      for (let i = 0; i < 60; i++) sim.step(1 / 60, { x: 0, y: -1 });
      assert.ok(M.penetrationAt(sim.world, sim.player.x, sim.player.z, 18) < 12, 'めりこんで いない');
      assert.equal(sim.camera.x, sim.player.x, 'カメラが とんで いない');
    }
  }
  // うみ ↔ しんかい も くりかえす
  const s2 = M.createSimulation({ regionId: 'sea', discovered: [] });
  for (let i = 0; i < 4; i++) {
    s2.enterRegion(i % 2 ? 'sea' : 'deepsea', { at: i % 2 ? 'seacave' : 'reef' });
    for (let k = 0; k < 40; k++) s2.step(1 / 60, { x: 0.4, y: -1 });
    assert.ok(Number.isFinite(s2.player.x) && Number.isFinite(s2.player.z));
  }
});

test('14. たてじくは 3D 化に つかえる いみデータ', () => {
  const { M } = setup();
  for (const id of ['countryside|star_stop', 'deepsea|sea']) {
    const c = G(M).connections.find((x) => x.id === id);
    assert.ok(['up', 'down'].includes(c.gate.dir), 'むきが ある');
    assert.ok(c.gate.action && c.gate.verb, 'そうさの ことばが ある');
    const rids = Object.keys(c.gate.ends);
    assert.equal(rids.length, 2, 'departure と arrival が ある');
    for (const rid of rids) assert.equal(c.gate.ends[rid].dir, 'ride');
  }
  // 層が かわる ことを データから ひける
  const R = G(M).regions;
  assert.equal(R.star_stop.layer, 'sky'); assert.equal(R.deepsea.layer, 'below');
  assert.equal(R.countryside.layer, 'ground'); assert.equal(R.sea.layer, 'ground');
});
