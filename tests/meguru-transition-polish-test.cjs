// めぐる Phase 2.1「地域を こえる あいだ」の 正本。
// たいせつなのは「region が かわる」ことでは なく「こえた / のぼった / もぐった」と
// 感じられる こと なので、**いみ の がわ**(どの あいだに 何が おきるか)を ここで 固定する。
// え(veil・つぶ・かご・カメラの さ)は renderer の しごと なので ここでは しばらない。
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');

const h = harness({ fullDisplay: true });
const M = h.api.meguruMod;
const G = M.WORLD_GEOGRAPHY;
const world = (id) => M.buildWorld(id, M.buildRegistry(), {});
const gatesOf = (id) => M.regionGates(id, world(id));
const gate = (from, to) => gatesOf(from).find((g) => g.to === to);

test('こえかたは 4つの あいだ(approach → cross → arrive → settle)で できて いる', () => {
  assert.equal(M.TRANSITION.phases.join(','), 'approach,cross,arrive,settle');
  for (const way of ['walk', 'up', 'down']) {
    const plan = M.transitionPlan({ way, from: 'a', to: 'b' });
    assert.equal(plan.phases.map((p) => p.id).join(','), 'approach,cross,arrive,settle', `${way}: 4つ`);
    let at = 0;
    for (const p of plan.phases) { assert.equal(+p.from.toFixed(4), +at.toFixed(4), `${way}/${p.id}: すきまが ない`); at += p.dur; }
    assert.equal(+plan.total.toFixed(4), +at.toFixed(4), `${way}: ぜんたいの ながさ`);
    assert.ok(plan.total > 0.9 && plan.total < 3.2, `${way}: ${plan.total.toFixed(2)}s`);
  }
  // あるきは みじかく、ゴンドラは いちばん 印象てきに、もぐるは その あいだ
  const w = M.transitionPlan({ way: 'walk' }).total, u = M.transitionPlan({ way: 'up' }).total, d = M.transitionPlan({ way: 'down' }).total;
  assert.ok(w < d && d < u, `あるき ${w} < もぐる ${d} < のぼる ${u}`);
});

test('のぼり / くだりは connection では なく layer の さ から きまる(かえりは 逆)', () => {
  assert.equal(M.wayBetween('ground', 'sky'), 'up');
  assert.equal(M.wayBetween('sky', 'ground'), 'down');
  assert.equal(M.wayBetween('ground', 'below'), 'down');
  assert.equal(M.wayBetween('below', 'ground'), 'up');
  assert.equal(M.wayBetween('ground', 'ground'), 'walk');
  assert.equal(gate('countryside', 'star_stop').way, 'up', 'いなか → ほしぞら は のぼる');
  assert.equal(gate('star_stop', 'countryside').way, 'down', 'ほしぞら → いなか は おりる');
  assert.equal(gate('sea', 'deepsea').way, 'down', 'うみ → しんかい は もぐる');
  assert.equal(gate('deepsea', 'sea').way, 'up', 'しんかい → うみ は うかぶ');
  assert.equal(gate('home', 'forest').way, 'walk');
  assert.equal(gate('forest', 'countryside').way, 'walk');
  // ボタンの ことばも かえりは かわる
  assert.equal(gate('sea', 'deepsea').action, 'もぐる');
  assert.equal(gate('deepsea', 'sea').action, 'うかぶ');
});

test('入れかえの しゅんかんは ぜったいに すけない(cross の あいだは ずっと 1)', () => {
  for (const way of ['walk', 'up', 'down']) {
    const plan = M.transitionPlan({ way });
    const cross = plan.phases.find((p) => p.id === 'cross');
    assert.equal(plan.swapAt, cross.from, `${way}: 入れかえは cross の あたま`);
    for (let t = cross.from; t < cross.to; t += cross.dur / 12) {
      assert.equal(M.transitionCover(plan, t), 1, `${way}: cross の あいだは かくれて いる(t=${t.toFixed(2)})`);
    }
    assert.ok(M.transitionCover(plan, 0) < 0.05, `${way}: はじめは 見えて いる`);
    assert.ok(M.transitionCover(plan, plan.total - 0.01) < 0.05, `${way}: おわりは 見えて いる`);
    // approach は だんだん こく なる だけ(とちゅうで うすく ならない)
    let prev = -1;
    for (let t = 0; t < plan.swapAt; t += 0.02) { const c = M.transitionCover(plan, t); assert.ok(c >= prev - 1e-9, `${way}: approach は もどらない`); prev = c; }
  }
});

test('settle が あり、操作は settle の あたまで もどる(ながく うばわない)', () => {
  for (const way of ['walk', 'up', 'down']) {
    const plan = M.transitionPlan({ way });
    const settle = plan.phases.find((p) => p.id === 'settle');
    assert.ok(settle && settle.dur >= 0.2 && settle.dur <= 0.8, `${way}: settle ${settle.dur}s は 0.2〜0.8`);
    assert.equal(plan.releaseAt, settle.from, `${way}: settle の あたまで 操作が もどる`);
    assert.ok(plan.releaseAt < plan.total, `${way}: おわる まえに もどる`);
  }
});

test('2かいめ は みじかく、よいやすい せっていは もっと みじかい(なくしはしない)', () => {
  for (const way of ['walk', 'up', 'down']) {
    const full = M.transitionPlan({ way }).total;
    const again = M.transitionPlan({ way }, { repeat: true }).total;
    const soft = M.transitionPlan({ way }, { reduced: true }).total;
    const both = M.transitionPlan({ way }, { repeat: true, reduced: true }).total;
    assert.ok(again < full * 0.72 && again > full * 0.5, `${way}: 2かいめ ${again.toFixed(2)} < はじめて ${full.toFixed(2)}`);
    assert.ok(soft < full * 0.55, `${way}: よいやすい せっていは みじかい`);
    assert.ok(both < soft, `${way}: かさねると もっと みじかい`);
    assert.ok(both > 0.3, `${way}: なくなりはしない(${both.toFixed(2)}s)`);
    for (const p of M.transitionPlan({ way }, { repeat: true, reduced: true }).phases) {
      assert.ok(p.dur >= M.TRANSITION.minSpan, `${way}/${p.id}: さいてい ${M.TRANSITION.minSpan}s は のこる`);
    }
    assert.equal(M.transitionPlan({ way }, { reduced: true }).reduced, true, `${way}: え の がわへ つたわる`);
  }
});

test('端末の おもさで つぶの かずを へらす(えの がわが よむ 1つの すう字)', () => {
  const d = [0, 1, 2].map((tier) => M.transitionPlan({ way: 'up' }, { tier }).density);
  assert.equal(d.join(','), M.TRANSITION.density.join(','), 'tier ごとに こさが ちがう');
  assert.ok(d[0] > d[1] && d[1] > d[2], 'おもい ほど すくない');
  assert.equal(M.transitionPlan({ way: 'up' }, { tier: 9 }).density, d[2], 'しらない tier は いちばん かるい がわへ');
});

test('音は いみの がわ(cue)に あり、え の かんすうからは 鳴らさない', () => {
  for (const way of ['walk', 'up', 'down']) {
    const plan = M.transitionPlan({ way });
    const cues = plan.phases.map((p) => p.cue);
    assert.ok(cues.some(Boolean), `${way}: どこかに 音の さしぐちが ある`);
    assert.ok(plan.phases.find((p) => p.id === 'approach').cue, `${way}: こえはじめに 1つ`);
    assert.ok(plan.phases.find((p) => p.id === 'arrive').cue, `${way}: ついた ときに 1つ`);
  }
  // drawTransition の なかで sfx を よんで いない(え と 音を まぜない)
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'meguru.js'), 'utf8');
  const i = src.indexOf('function drawTransition(');
  const body = src.slice(i, src.indexOf('\n      }\n', i));
  assert.ok(i > 0 && !/\bsfx\(/.test(body), 'え の かんすうは 音を 鳴らさない');
});

test('plan は 3D 化に そのまま つかえる いみ だけ を もつ', () => {
  const g = gate('countryside', 'star_stop');
  const plan = M.transitionPlan(g, { tier: 1 });
  for (const key of ['way', 'from', 'to', 'at', 'enterFacing', 'layerFrom', 'layerTo', 'phases', 'total', 'swapAt', 'releaseAt']) {
    assert.ok(plan[key] !== undefined, `plan に ${key} が ある`);
  }
  assert.equal(plan.layerFrom, 'ground'); assert.equal(plan.layerTo, 'sky');
  assert.equal(plan.to, 'star_stop'); assert.equal(plan.at, 'stop');
  // Canvas の つごう(いろ・ピクセル・アルファ)は 1つも 入って いない
  const flat = JSON.stringify(plan);
  for (const bad of ['rgba', '#', 'canvas', 'ctx', 'alpha', 'veil']) assert.ok(!flat.includes(bad), `plan に ${bad} が ない`);
});

test('こえた ときに カメラが とばない(出るときの むきを ひきついで ゆっくり もどす)', () => {
  const sim = M.createSimulation({ regionId: 'home', discovered: [], env: { time: 'day', weather: 'sunny', season: 'spring', region: 'x' } });
  const g = M.regionGates('home', sim.world).find((q) => q.to === 'forest');
  assert.ok(g, 'おうち → もり の 出口が ある');
  // 出るとき: カメラは +z(0)。入る むきは π なので、ひきつがない と 180 度 とぶ
  const before = sim.view().camera.yaw;
  sim.enterRegion('forest', { at: g.at, heading: g.enterFacing, carry: { yaw: before, bob: 3, speed: 1, moving: true } });
  const justAfter = sim.view().camera.yaw;
  assert.ok(Math.abs(wrap(justAfter - before)) < 0.02, `こえた しゅんかんの むきは おなじ(${justAfter.toFixed(2)} vs ${before.toFixed(2)})`);
  // からだの いきおいも のこって いる
  assert.equal(sim.view().player.bob, 3, 'あるきの いきおい(bob)を ひきつぐ');
  assert.ok(sim.view().player.speed > 0, 'とまって いない');
  // そのあと 1 びょう ほどで 入った がわの むきへ もどる
  let t = 0; while (t < 2) { sim.step(1 / 60, { x: 0, y: 0 }); t += 1 / 60; }
  assert.ok(Math.abs(wrap(sim.view().camera.yaw - g.enterFacing)) < 0.25, 'やがて 入った がわの むきに おちつく');
  function wrap(a) { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; }
});

test('ひきつぎが ない とき(たび)は これまでどおり', () => {
  const sim = M.createSimulation({ regionId: 'home', discovered: [], env: { time: 'day', weather: 'sunny', season: 'spring', region: 'x' } });
  sim.enterRegion('sea', {});
  assert.equal(sim.view().camFx.carry, 0, 'たびでは むきの さ を もたない');
  assert.equal(sim.view().player.bob, 0, 'たびでは いきおいを ひきつがない');
});

test('鳥居・山道・のりば・どうくつには その ばしょ だけの きぶんが ある', () => {
  const cs = world('countryside');
  const ids = cs.moodSpots.map((s) => s.id).sort().join(',');
  assert.equal(ids, 'mountpath,skyland,torii', 'いなかは 鳥居 → 山道 → のりば の 3つ');
  const at = (w, id) => { const s = w.spots.find((q) => q.id === id); return M.moodAt(w, s.x, s.z); };
  const base = M.moodAt(cs, cs.hub.x, cs.hub.z);
  const torii = at(cs, 'torii'), trail = at(cs, 'mountpath'), board = at(cs, 'skyland');
  assert.ok(torii.fog > base.fog, '鳥居の むこうは すこし きりが 出る');
  assert.ok(torii.light < base.light, '光が すこし つめたく なる');
  assert.ok(trail.open > torii.open, '山道は そらが ひろく なる(高度が あがる)');
  assert.ok(board.open > trail.open, 'のりばは いちばん ひらけて いる');
  assert.ok(board.fog < torii.fog, 'のりばは きりが うすい');
  // うみ / しんかい がわ
  assert.equal(world('sea').moodSpots.map((s) => s.id).join(','), 'seacave');
  assert.equal(world('deepsea').moodSpots.map((s) => s.id).join(','), 'reef');
  // ふつうの ばしょには ない(まいフレームの しごとを ふやさない)
  for (const id of ['home', 'forest', 'city', 'mountain']) assert.equal(world(id).moodSpots.length, 0, `${id} には ない`);
});

test('えんしゅつを 足しても 地理正本・データの かずは 1つも かわらない', () => {
  assert.equal(G.canon, 'v1');
  assert.equal(G.connections.length, 17, 'connection は 17 本のまま');
  const links = G.connections.filter((c) => c.b).map((c) => [c.a, c.b].sort().join('|'));
  assert.equal(new Set(links).size, 16, 'つながりは 16 本 ＋ きおくのみずうみ 1');
  assert.ok(!links.includes('countryside|home'), 'おうち ↔ いなか の 直通は ない まま');
  assert.equal([M.WORLD_PROGRESS_WEIGHT.regions, M.WORLD_PROGRESS_WEIGHT.links, M.WORLD_PROGRESS_WEIGHT.marks, M.WORLD_PROGRESS_WEIGHT.zones].join(','), '0.4,0.25,0.2,0.15', '探索率の おもみは そのまま');
  let spots = 0, paths = 0, zones = 0, secrets = 0;
  for (const id of Object.keys(M.WORLDS)) {
    const w = M.WORLDS[id];
    spots += w.spots.length; paths += w.paths.length; zones += (w.zones || []).length;
    secrets += w.spots.filter((s) => s.secret).length + (w.paths || []).filter((q) => q[2] === 'secret').length;
  }
  assert.equal(spots, 471, 'spot は 471 のまま');
  assert.equal(paths, 654, 'path は 654 のまま');
  assert.equal(zones, 118, '地区は 118 のまま');
  assert.equal(secrets, 107, 'ひみつは 107 のまま');
});

test('こえる ための データに ひみつは 出て こない', () => {
  for (const id of Object.keys(M.WORLDS)) {
    const w = world(id);
    for (const g of M.regionGates(id, w)) {
      assert.ok(!g.spot.secret, `${id}/${g.spot.id}: 出口は ひみつの ばしょ では ない`);
      const flat = JSON.stringify(M.transitionPlan(g));
      for (const s of w.spots.filter((q) => q.secret)) assert.ok(!flat.includes(s.id), `${id}: plan に ${s.id} が 出ない`);
    }
  }
});
