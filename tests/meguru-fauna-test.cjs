const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

// けしきとして ランダムに おかれる どうぶつは ゼロ。「いきている キャラ」は 住民台帳だけ
function populated(h) {
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, energy: 100, health: 100, hunger: 80, speciesLine: 'dog', stageIndex: 4, ageTicks: 500 });
  s.petKey = `dog:${h.api.currentFormStageIndex()}`;
  s.discoveredStages = [s.petKey, 'cat:2', 'penguin:3', 'salmon:5', 'sakura:6', 'dragon:7', 'ghost:1', 'mushroom:0', 'beetle:0'];
  s.lifetime.companionsRecruited = ['shiba', 'owl'];
  s.companions = [{ id: 'shiba', bond: 80 }];
  s.lifetime.partnersRecorded = ['forest_bear'];
  s.regionId = 'jungle';
  h.api.render();
  return s;
}
const FAUNA_SAMPLES = ['🦜', '🐍', '🐈', '🐄', '🦋', '🐓', '🦉', '🦅', '🦌', '🦀', '🐬', '🐙', '🦑', '🪼', '🦆', '🐟', '🐫', '🦎', '🕊️'];

test('the fauna classifier flags birds, fish, mammals, reptiles and bugs but not plants, shells, paw prints or coral', () => {
  const M = harness().api.meguruMod;
  for (const e of FAUNA_SAMPLES) assert.equal(M.isFaunaEmoji(e), true, e + ' is fauna');
  for (const e of ['🌴', '🌺', '🌿', '🍌', '🌳', '🪨', '🪵', '🌱', '✨', '🍄', '🐾', '🐚', '🪸', '🪧', '🏠', '🧑']) assert.equal(M.isFaunaEmoji(e), false, e + ' is scenery');
  assert.ok(M.SCENERY_FAUNA.length > 100);
  assert.ok(M.SCENERY_FAUNA.includes('🦜') && !M.SCENERY_FAUNA.includes('🐾'));
});

test('the jungle random props / lane / hint contain no parrot or snake', () => {
  const M = harness().api.meguruMod;
  const j = M.WORLDS.jungle;
  for (const pool of [j.props, j.lane, j.hint, j.wall]) { assert.ok(!pool.includes('🦜'), 'no 🦜 in ' + pool.join('')); assert.ok(!pool.includes('🐍'), 'no 🐍 in ' + pool.join('')); }
  for (const z of j.zones) if (z.mood && z.mood.lane) assert.ok(!z.mood.lane.includes('🦜'));
  // みどりの こさは そのまま: props 8 / lane 6 / hint 3
  assert.equal(j.props.length, 8); assert.equal(j.lane.length, 6); assert.equal(j.hint.length, 3);
  assert.ok(j.props.includes('🌴') && j.props.includes('🌺') && j.props.includes('🍌'));
});

test('no random scenery pool in any region contains living fauna (props, lane, wall, hint, zone lanes, spot props, local flavor)', () => {
  const M = harness().api.meguruMod;
  const issues = M.auditSceneryFauna();
  assert.equal(issues.length, 0, 'fauna in scenery pools: ' + issues.map((i) => `${i.region}/${i.pool}:${i.emoji}`).join(' '));
  const pools = M.sceneryPools();
  assert.ok(pools.length >= 13 * 5, 'every region contributes its pools');
  for (const region of Object.keys(M.WORLDS)) assert.ok(pools.some((p) => p.region === region && p.pool === 'props'), region + ' props listed');
  assert.ok(pools.some((p) => p.region.startsWith('home/')), 'local flavor is audited too');
  for (const e of M.sceneryEmojis()) assert.equal(M.isFaunaEmoji(e), false, e);
  // 1つだけ おく ばしょの しるしも どうぶつ ほんにん では ない
  const spotProps = pools.filter((p) => p.pool === 'spot').flatMap((p) => p.emojis);
  for (const e of spotProps) assert.equal(M.isFaunaEmoji(e), false, 'spot prop ' + e);
  assert.equal(M.WORLDS.city.spots.find((s) => s.id === 'cats').prop, '🐾');
  assert.equal(M.WORLDS.desert.spots.find((s) => s.id === 'camel').prop, '🪧');
  assert.equal(M.WORLDS.countryside.spots.find((s) => s.id === 'pasture').prop, '🪧');
});

test('the built worlds place no fauna as scenery: every living creature on screen is a registry resident', () => {
  const h = harness(); populated(h); const M = h.api.meguruMod;
  const reg = M.buildRegistry();
  for (const id of Object.keys(M.WORLDS)) {
    const w = M.buildWorld(id, reg);
    for (const p of w.props) assert.equal(M.isFaunaEmoji(p.emoji), false, `${id}: scenery prop ${p.emoji} (${p.layer})`);
    const keys = new Set(reg.residents.map((r) => r.key));
    for (const a of w.residents) assert.ok(keys.has(a.key), `${id}: ${a.key} comes from the registry`);
  }
  assert.equal(M.auditScenery().fauna.length, 0);
});

test('the fauna cleanup does not change the resident registry or the resident placement per region', () => {
  const h = harness(); const s = populated(h); const M = h.api.meguruMod;
  const reg = M.buildRegistry();
  const keys = reg.residents.map((r) => r.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const k of ['form:cat:2', 'form:penguin:3', 'form:salmon:5', 'form:sakura:6', 'form:dragon:7', 'form:ghost:1', 'form:mushroom:0', 'form:beetle:0', 'companion:shiba', 'companion:owl', 'partner:forest_bear']) assert.ok(keys.includes(k), k);
  assert.ok(!keys.includes('form:' + s.petKey));
  for (const id of Object.keys(M.WORLDS)) {
    const expected = reg.residents.filter((r) => r.region === id && !r.withPlayer).length;
    assert.equal(M.buildWorld(id, reg).residents.length, expected, id + ' residents come only from the registry');
  }
  assert.equal(M.auditRegistry(reg).issues.length, 0);
});

test('scenery density is kept: pool sizes and generated prop counts per region stay at their previous level', () => {
  const h = harness(); populated(h); const M = h.api.meguruMod;
  const reg = M.buildRegistry();
  // どうぶつを ぬいた ぶんは しょくぶつ・ちけい・ものに おきかえて、かずは へらさない
  const SIZES = { home: [6, 6, 3, 3], city: [8, 6, 3, 4], countryside: [8, 6, 3, 3], forest: [8, 6, 3, 3], mountain: [8, 6, 3, 3], snow: [8, 6, 3, 3], sea: [8, 6, 3, 3], deepsea: [8, 6, 3, 3], river_lake: [8, 6, 3, 3], jungle: [8, 6, 3, 3], desert: [8, 6, 3, 3], star_stop: [7, 6, 3, 3], memory_lake: [6, 6, 3, 3] };
  const MIN_PROPS = { home: 140, city: 240, countryside: 220, forest: 350, mountain: 250, snow: 225, sea: 200, deepsea: 225, river_lake: 210, jungle: 270, desert: 245, star_stop: 240, memory_lake: 225 };
  for (const [id, [props, lane, hint, wall]] of Object.entries(SIZES)) {
    const w = M.WORLDS[id];
    assert.equal(w.props.length, props, id + ' props'); assert.equal(w.lane.length, lane, id + ' lane'); assert.equal(w.hint.length, hint, id + ' hint'); assert.equal(w.wall.length, wall, id + ' wall');
    const built = M.buildWorld(id, reg);
    assert.ok(built.props.length >= MIN_PROPS[id], `${id}: ${built.props.length} props >= ${MIN_PROPS[id]}`);
    for (const layer of ['side', 'wall', 'lane', 'hint', 'landmark']) assert.ok(built.props.some((p) => p.layer === layer), `${id} has ${layer} props`);
  }
});
