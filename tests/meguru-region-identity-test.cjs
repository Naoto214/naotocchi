const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

// 「地域を きりかえた しゅんかん、どこへ きたか わかる」ことを データの がわから たしかめる。
// え(canvas)は これらを よむ だけ な ので、Three.js に かえても おなじ こせいが のこる
function setup(opts) {
  const h = harness(opts);
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, energy: 100, health: 100, hunger: 80, speciesLine: 'dog', stageIndex: 4, ageTicks: 500 });
  s.petKey = `dog:${h.api.currentFormStageIndex()}`;
  s.discoveredStages = [s.petKey, 'cat:2', 'penguin:3', 'salmon:5', 'sakura:6', 'dragon:7', 'ghost:1', 'mushroom:0', 'beetle:0'];
  s.lifetime.companionsRecruited = ['shiba', 'owl'];
  s.lifetime.partnersRecorded = ['forest_bear'];
  h.api.render();
  return { h, s, M: h.api.meguruMod, reg: h.api.meguruMod.buildRegistry() };
}
const REGIONS = ['home', 'city', 'countryside', 'forest', 'mountain', 'snow', 'sea', 'deepsea', 'river_lake', 'jungle', 'desert', 'star_stop', 'memory_lake'];

test('every region carries its own look: colours, backdrop, air, view distance, ground layers and structures all differ', () => {
  const { M } = setup();
  const seen = { backdrop: new Map(), ground: new Map(), fingerprint: new Map() };
  for (const id of REGIONS) {
    const w = M.WORLDS[id];
    assert.ok(w.backdrop, id + ' has a far view');
    assert.ok(Array.isArray(w.detail) && w.detail.length >= 2, id + ' has at least two ground layers');
    assert.ok(Array.isArray(w.structs) && w.structs.length >= 3, id + ' has its own structures');
    assert.ok(w.field && w.field.pool.length, id + ' has clustered plants or objects');
    assert.ok(w.density > 0 && w.view > 0, id + ' has density and view distance');
    // 地面の いろは 地域ごとに ちがう
    const g = w.ground.join('|');
    assert.ok(!seen.ground.has(g), `${id} and ${seen.ground.get(g)} share the same ground colour`);
    seen.ground.set(g, id);
    // ぜんたいの くみあわせ(遠景+くうき+みつど+みとおし+じめんの しゅるい)は かならず ユニーク
    const fp = [w.backdrop, w.canopy, w.density, w.view, w.detail.map((d) => d[0]).join(','), w.structs.map((x) => x[0]).join(',')].join('/');
    assert.ok(!seen.fingerprint.has(fp), `${id} looks the same as ${seen.fingerprint.get(fp)}`);
    seen.fingerprint.set(fp, id);
  }
  // 遠景は 13 地域で 8 しゅるい いじょうに わかれている(にた 地域だけが かさなる)
  const backdrops = new Set(REGIONS.map((id) => M.WORLDS[id].backdrop));
  assert.ok(backdrops.size >= 8, 'far views: ' + [...backdrops].join(' '));
  assert.equal(M.WORLDS.city.backdrop, 'neonskyline');
  assert.equal(M.WORLDS.jungle.backdrop, 'canopy');
  assert.equal(M.WORLDS.desert.backdrop, 'mesas');
  assert.notEqual(M.WORLDS.jungle.backdrop, M.WORLDS.forest.backdrop, 'the jungle is not just a green forest');
});

test('density follows the plan: the jungle and forest are dense, the desert and the memory lake are open', () => {
  const { M, reg } = setup();
  const props = {};
  for (const id of REGIONS) props[id] = M.buildWorld(id, reg).props.length;
  assert.ok(props.jungle > props.forest, `jungle ${props.jungle} > forest ${props.forest}`);
  assert.ok(props.forest > props.countryside, `forest ${props.forest} > countryside ${props.countryside}`);
  assert.ok(props.city > props.countryside, 'the city is dense with buildings');
  assert.ok(props.jungle > props.desert * 2, `jungle ${props.jungle} is far denser than the desert ${props.desert}`);
  // 「こものの かず」では なく「ばしょが ある こと」で みる: じめんの くぎり + かこむ もの + こもの
  for (const id of REGIONS) { const w = M.buildWorld(id, reg); const mass = w.props.length + w.areas.length * 6 + (w.shore || []).length * 30; assert.ok(mass >= 240, `${id} is never bare: props ${w.props.length} + areas ${w.areas.length} + shore bands ${(w.shore || []).length}`); }
  // みとおし: ジャングル/しんかいは せまく、さばく/いなかは とおくまで
  assert.ok(M.WORLDS.jungle.view < 0.75 && M.WORLDS.deepsea.view < 0.75);
  assert.ok(M.WORLDS.desert.view > 1.5 && M.WORLDS.countryside.view > 1.3);
});

test('the ground is never a big empty space: detail is generated from the world grid anywhere you stand', () => {
  const { M, reg } = setup();
  for (const id of REGIONS) {
    const w = M.buildWorld(id, reg);
    for (const z of [200, Math.round(w.len * 0.5), w.len - 300]) {
      const n = M.sampleGroundDetails(w, 0, z, 700, []).length;
      assert.ok(n >= 60, `${id} at z=${z}: only ${n} ground details in a 700 unit circle`);
    }
    // おなじ ばしょは いつ よんでも おなじ もよう(もどってきても かわらない)
    const a = M.sampleGroundDetails(w, 100, 900, 400, []), b = M.sampleGroundDetails(w, 100, 900, 400, []);
    assert.equal(a.length, b.length);
    assert.equal(JSON.stringify(a.slice(0, 5)), JSON.stringify(b.slice(0, 5)), id + ' ground is stable');
    // もようの しゅるいは その 地域の ものだけ
    const kinds = new Set(a.map((d) => d.kind)), allowed = new Set(w.detail.map((d) => d[0]));
    for (const k of kinds) assert.ok(allowed.has(k), `${id}: ${k} is not one of its ground layers`);
  }
});

test('structures are canvas shapes with a region, never emoji, and never a living creature', () => {
  const { h, M, reg } = setup({ fullDisplay: true });
  const kinds = new Set();
  for (const id of REGIONS) {
    const w = M.buildWorld(id, reg);
    const structs = w.props.filter((p) => p.struct);
    assert.ok(structs.length >= 8, `${id} has structures: ${structs.length}`);
    for (const p of structs) { assert.equal(p.emoji, undefined, 'a structure is drawn, not an emoji'); assert.equal(p.region, id); kinds.add(p.struct); }
  }
  assert.ok(kinds.size >= 40, 'the world has many different structures: ' + kinds.size);
  // PR #277 の ほうしんは そのまま: どうぶつも キャラと おなじ 絵文字も けしきに ない
  assert.equal(M.auditSceneryFauna().length, 0);
  assert.equal(M.auditSceneryCharacters(h.api.displayCatalog.resolve).issues.length, 0);
  for (const id of REGIONS) for (const p of M.buildWorld(id, reg).props) if (p.emoji) assert.equal(M.isFaunaEmoji(p.emoji), false, `${id}: ${p.emoji}`);
});

test('water regions have real terrain and nobody can walk into the water', () => {
  const { M, reg } = setup();
  const sea = M.buildWorld('sea', reg), river = M.buildWorld('river_lake', reg), deep = M.buildWorld('deepsea', reg), lake = M.buildWorld('memory_lake', reg);
  assert.equal(sea.terrain.kind, 'coast'); assert.equal(sea.terrain.side, -1);
  assert.equal(lake.terrain.kind, 'coast'); assert.equal(lake.terrain.side, 1);
  assert.equal(river.terrain.kind, 'river'); assert.ok(river.terrain.pts.length >= 6);
  assert.equal(deep.terrain.kind, 'chasm');
  assert.equal(M.WORLDS.forest.terrain, undefined, 'the forest has no water crossing it');
  // みずぎわは まっすぐでは なく、あるける ばしょの すぐ そと
  const shores = [200, 800, 1500, 2500, 3500].map((z) => M.shoreX(sea, z));
  assert.ok(new Set(shores.map(Math.round)).size > 1, 'the shoreline bends: ' + shores.join(','));
  for (const z of [200, 800, 1500, 2500, 3500]) {
    const sx = M.shoreX(sea, z);
    for (const sp of sea.spots) if (Math.abs(sp.z - z) < 200) assert.ok(sp.x - sp.r > sx, `${sp.id} would be under water (${sp.x - sp.r} <= ${sx})`);
  }
  // じゅうみんも プレイヤーも りくの がわに とどまる
  for (const a of sea.residents) assert.ok(a.x > M.shoreX(sea, a.z), a.key + ' stands on the sand');
  const sim = M.createSimulation({ regionId: 'sea' });
  sim.setPlayer(-3000, 900);
  assert.ok(sim.player.x >= M.shoreX(sim.world, sim.player.z) - 1, 'walking left stops at the water: ' + sim.player.x);
});

test('the world layer still works with no canvas at all (the renderer stays swappable)', () => {
  const { M, reg } = setup();
  for (const id of REGIONS) {
    const w = M.buildWorld(id, reg);
    assert.ok(w.props.every((p) => typeof p.x === 'number' && typeof p.z === 'number'), id + ' props live in world coordinates');
    assert.ok(M.sampleGroundDetails(w, 0, 500, 300, []).every((d) => typeof d.x === 'number'), id + ' ground detail lives in world coordinates');
  }
  const sim = M.createSimulation({ regionId: 'jungle' });
  sim.step(0.1);
  assert.ok(sim.world.props.length > 0 && sim.camera && typeof sim.camera.yaw === 'number');
});

test('weather and time reach the regions that should have them: no rain under the sea or in the sky stop', () => {
  const { M } = setup();
  // 天気の 見えかたは え の がわ だが、どの 地域が そらを もつかは せかいの データ
  assert.equal(M.WORLDS.deepsea.sky, 'bubbles');
  assert.equal(M.WORLDS.star_stop.sky, 'stars');
  assert.equal(M.WORLDS.memory_lake.sky, 'mist');
  // くうきの そうは 地域ごとに ちがう(おなじ ものを 2つの 地域で つかわない)
  const canopies = REGIONS.map((id) => M.WORLDS[id].canopy).filter(Boolean);
  assert.equal(new Set(canopies).size, canopies.length, 'each region has its own air: ' + canopies.join(' '));
  assert.equal(M.WORLDS.snow.canopy, 'aurora');
  assert.equal(M.WORLDS.city.canopy, 'neon');
  assert.equal(M.WORLDS.jungle.canopy, 'leaves');
  assert.equal(M.WORLDS.deepsea.canopy, 'marine');
});
