const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

// めぐる v5: 「疑似3D用の図形で作った世界」から「その場所を歩いている世界」へ。
// ここで見るのは え(canvas)では なく せかいの データ:
//   ・世界を「いみ」(terrain / water / road / building / vegetation / landmark / obstacle / light)で読めること(Three.js 化の土台)
//   ・巨大な「素材」のイラスト(なみ・こおり・ほし・むぎ…)を目印に使わないこと
//   ・地区ごとに構図(かこむ もの・群生・主役)が変わること
//   ・自然物が よこ一列に ならばないこと
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
const LAYERS = ['terrain', 'water', 'road', 'building', 'vegetation', 'landmark', 'obstacle', 'light', 'scenery'];

test('worldLayers: every region can be read by meaning, and every drawn structure has a role', () => {
  const { M, reg } = setup();
  for (const id of REGIONS) {
    const w = M.buildWorld(id, reg);
    const L = M.worldLayers(w);
    for (const k of LAYERS) assert.ok(Array.isArray(L[k]), `${id}: layer ${k}`);
    // 造形物は ぜんぶ やくわりを もつ(3D では やくわりで メッシュを えらぶ)
    for (const p of w.props) if (p.struct) assert.ok(M.STRUCT_ROLE[p.struct], `${id}: ${p.struct} has a role`);
    // どの 地域にも 地面・道・木か たてもの・光・障害物 が ある
    assert.ok(L.terrain.length >= 1 && L.road.length >= 5, `${id}: terrain ${L.terrain.length} road ${L.road.length}`);
    assert.ok(L.vegetation.length + L.building.length + L.terrain.length + L.light.length >= 12, `${id}: vegetation ${L.vegetation.length} + building ${L.building.length} + terrain ${L.terrain.length} + light ${L.light.length}`);
    assert.ok(L.landmark.length >= 1, `${id}: landmark`);
    assert.ok(L.light.length >= w.zones.length, `${id}: zone lights`);
    // レイヤーの がっけいは props と areas と せかいの ほねぐみを ぜんぶ ふくむ(おとしていない)
    const total = LAYERS.reduce((a, k) => a + L[k].length, 0);
    assert.ok(total >= w.props.length + w.areas.length + w.segments.length + w.spots.length, `${id}: nothing dropped (${total})`);
    // すべて ワールド座標(がめんの px は しらない)
    for (const k of LAYERS) for (const it of L[k]) if (it.x != null) assert.ok(Number.isFinite(it.x) && Number.isFinite(it.z), `${id}/${k}: world coordinates`);
  }
  // みずの ある 地域は water レイヤーに 海・川・池 が のる
  const sea = M.worldLayers(M.buildWorld('sea', reg)), river = M.worldLayers(M.buildWorld('river_lake', reg)), deep = M.worldLayers(M.buildWorld('deepsea', reg));
  assert.ok(sea.water.some((x) => x.kind === 'sea' && x.shoreline.length >= 6));
  assert.ok(sea.terrain.some((x) => x.kind === 'wetsand' && x.along === 'shoreline'), 'the wet sand follows the shoreline as one band');
  assert.ok(river.water.some((x) => x.kind === 'river' && x.centerline.length >= 6));
  assert.ok(deep.terrain.some((x) => x.kind === 'chasm'));
  assert.ok(M.worldLayers(M.buildWorld('city', reg)).road.some((x) => x.kind === 'road' || x.kind === 'sidewalk' || x.kind === 'crossing'), 'city roads are road layer');
});

test('no giant "material" illustration stands in for a landmark: waves, ice cubes, stars, wheat become canvas shapes or nothing', () => {
  const { M, reg } = setup();
  const material = new Set(['🌊', '🧊', '⭐', '🌟', '🪐', '🌙', '🌾', '🪨', '💧', '🏛️', '🌫️', '🕯️', '🫧', '💡', '☁️', '☀️', '🏜️', '🌈', '💫', '🌨️', '⛰️', '🏔️']);
  for (const id of REGIONS) {
    const w = M.buildWorld(id, reg);
    for (const p of w.props) {
      if (!p.emoji) continue;
      // スポットの めじるし(230)・ランドマークの おおきさでは 「素材」を つかわない
      if (p.layer === 'landmark' && !p.landmark) assert.ok(!material.has(p.emoji), `${id}: ${p.emoji} is a material picture at landmark size`);
      // りょうはしの おおきな ものにも そら・てんき の 絵文字を おかない
      if (p.layer === 'side') assert.ok(!material.has(p.emoji), `${id}: ${p.emoji} on the side`);
      // 絵文字は どれも 240 より おおきく ならない(ランドマークは canvas で えがく)
      if (!p.landmark) assert.ok(p.size <= 240, `${id}: ${p.emoji} size ${p.size}`);
    }
    // ランドマークは ぜんぶ canvas で えがく しゅるい(絵文字に おちない)
    for (const p of w.props) if (p.landmark) assert.ok(['bigtree', 'lighthouse', 'tower', 'waterfall', 'coral', 'bigstop', 'windmill', 'lodge', 'palms', 'peak', 'temple', 'bridge', 'glowmushroom'].includes(p.landmark), `${id}: landmark ${p.landmark} is drawn`);
  }
  // なみ は うみ そのものに まかせる(おかない)、こおり は 氷柱、ほし は クリスタル、むぎ は 畑 に なる
  assert.equal(M.SPOT_PROP_STRUCT['🌊'], null); assert.equal(M.SPOT_PROP_STRUCT['🧊'], 'icepillar'); assert.equal(M.SPOT_PROP_STRUCT['⭐'], 'crystal'); assert.equal(M.SPOT_PROP_STRUCT['🌾'], 'crop');
  const snow = M.buildWorld('snow', reg); assert.ok(snow.props.some((p) => p.struct === 'icepillar' && p.spot), 'the frozen lake marker is an ice pillar');
  const sea = M.buildWorld('sea', reg); assert.ok(!sea.props.some((p) => p.emoji === '🌊'), 'no wave picture on the beach: the sea is the hero');
});

test('composition changes inside a region: zones swap the framing kind, the plant pool and place one hero', () => {
  const { M, reg } = setup();
  // 地区ごとに かこむ ものが かわる 地域
  const city = M.buildWorld('city', reg);
  const frameKinds = (w) => new Set(w.props.filter((p) => p.layer === 'frame').map((p) => p.struct));
  assert.ok(frameKinds(city).has('building') && frameKinds(city).has('shopblock') && frameKinds(city).has('parktree'), 'the city has towers, shop fronts and park trees: ' + [...frameKinds(city)].join(','));
  const sea = M.buildWorld('sea', reg);
  assert.ok(frameKinds(sea).has('duneridge') && (frameKinds(sea).has('searock') || frameKinds(sea).has('seacliff')), 'the coast has dunes and rocks/cliffs: ' + [...frameKinds(sea)].join(','));
  const mountain = M.buildWorld('mountain', reg);
  assert.ok(frameKinds(mountain).has('cliffwall') && frameKinds(mountain).has('pinewall'), 'the mountain has cliffs and pine woods');
  // 主役: 地区に 1つ、みちの そとで あるける ばしょ
  for (const id of ['forest', 'sea', 'deepsea', 'desert', 'star_stop', 'home']) {
    const w = M.buildWorld(id, reg);
    const heroes = w.props.filter((p) => p.hero);
    assert.ok(heroes.length >= 1, `${id} has a hero: ${heroes.map((p) => p.struct).join(',')}`);
    for (const p of heroes) { assert.ok(p.struct && M.STRUCT_ROLE[p.struct], `${id}: hero ${p.struct} is a drawn structure with a role`); assert.ok(p.x > w.minX && p.x < w.maxX && p.z > 0 && p.z < w.len, `${id}: hero on land`); }
  }
  assert.ok(M.buildWorld('forest', reg).props.some((p) => p.hero && p.struct === 'mushroomgrove'), 'the mushroom forest has its glowing grove');
  assert.ok(M.buildWorld('desert', reg).props.some((p) => p.hero && p.struct === 'oasispool'), 'the oasis has water');
  // 群生の プールも 地区で かわる(いなかの 畑には むぎ、そうげんには はな)
  const cs = M.buildWorld('countryside', reg);
  const fieldsZone = cs.zones.find((z) => z.id === 'fields'), meadowZone = cs.zones.find((z) => z.id === 'meadow');
  assert.ok(fieldsZone.mood.field.includes('🌾') && !meadowZone.mood.field.includes('🌾'));
  // 地区ごとの おおきさの さ(もりは あかるい いりぐち < ふかい もり)
  const forest = M.WORLDS.forest.zones;
  assert.ok(forest.find((z) => z.id === 'bright').mood.frameScale < forest.find((z) => z.id === 'deep').mood.frameScale, 'the deep forest has bigger trunks than the bright entrance');
});

test('fallen logs and rocks lie at different angles and gather instead of lining up', () => {
  const { M, reg } = setup();
  const forest = M.buildWorld('forest', reg);
  const logs = forest.props.filter((p) => p.struct === 'log');
  assert.ok(logs.length >= 6, 'logs: ' + logs.length);
  const angles = new Set(logs.map((p) => Math.round(p.ang * 10)));
  assert.ok(angles.size >= 4, 'logs turn different ways: ' + [...angles].join(','));
  // 2ほん かさなった 倒木が ある(かたまり)
  const paired = logs.some((a) => logs.some((b) => a !== b && Math.hypot(a.x - b.x, a.z - b.z) < 100));
  assert.ok(paired, 'some logs lie together');
  const rocks = forest.props.filter((p) => p.struct === 'bigrock');
  assert.ok(new Set(rocks.map((p) => Math.round(p.ang * 10))).size >= 3, 'rocks turn too');
});

test('the world is still data only: layers, heroes and zone composition need no canvas, and PR #277 stays intact', () => {
  const { h, M, reg } = setup({ fullDisplay: true });
  for (const id of REGIONS) {
    const w = M.buildWorld(id, reg);
    assert.equal(M.auditSceneryFauna().length, 0);
    for (const p of w.props) if (p.emoji) assert.equal(M.isFaunaEmoji(p.emoji), false, `${id}: ${p.emoji}`);
    const L = M.worldLayers(w);
    assert.ok(L.scenery.every((x) => typeof x.emoji === 'string'), id + ' scenery layer keeps emoji only');
  }
  assert.equal(M.auditSceneryCharacters(h.api.displayCatalog.resolve).issues.length, 0);
  // せかいの ほねぐみ は かわらない: zone / spot / path / secret / landmark
  const forest = M.buildWorld('forest', reg);
  assert.ok(forest.zones.length === 6 && forest.spots.some((s) => s.secret) && forest.segments.some((g) => g.kind === 'secret') && forest.props.some((p) => p.landmark === 'bigtree'));
});
