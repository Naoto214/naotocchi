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

test('scenery is kept rich, but as space rather than scattered trinkets: pools, ground areas and framing all stay in place', () => {
  const h = harness(); populated(h); const M = h.api.meguruMod;
  const reg = M.buildRegistry();
  // プールの ながさ は かえない(どの 地域も 見た目の たねが そろっている)
  const SIZES = { home: [6, 6, 3, 3], city: [8, 6, 3, 4], countryside: [8, 6, 3, 3], forest: [8, 6, 3, 3], mountain: [8, 6, 3, 3], snow: [8, 6, 3, 3], sea: [8, 6, 3, 3], deepsea: [8, 6, 3, 3], river_lake: [8, 6, 3, 3], jungle: [8, 6, 3, 3], desert: [8, 6, 3, 3], star_stop: [7, 6, 3, 3], memory_lake: [6, 6, 3, 3] };
  for (const [id, [props, lane, hint, wall]] of Object.entries(SIZES)) {
    const w = M.WORLDS[id];
    assert.equal(w.props.length, props, id + ' props'); assert.equal(w.lane.length, lane, id + ' lane'); assert.equal(w.hint.length, hint, id + ' hint'); assert.equal(w.wall.length, wall, id + ' wall');
    const built = M.buildWorld(id, reg);
    // 「こものを まく」では なく「ばしょを つくる」: じめんの くぎり と かこむ ものが かならず ある
    assert.ok(built.areas.length >= 10, `${id}: ${built.areas.length} ground areas`);
    assert.ok(built.props.filter((p) => p.layer === 'frame').length >= 14, `${id}: framing pieces`);
    assert.ok(built.props.filter((p) => p.layer === 'fore').length >= 5, `${id}: foreground pieces`);
    assert.ok(built.props.length >= 140, `${id} is never bare: ${built.props.length}`);
    for (const layer of ['side', 'wall', 'lane', 'frame', 'fore', 'landmark']) assert.ok(built.props.some((p) => p.layer === layer), `${id} has ${layer} props`);
  }
});

// ---- なかま・こいびと・ずかんの すがた と おなじに みえる けしき ----
test('the snow world no longer scatters the snowman partner: no ⛄ in props, lane, hint or spot props, density unchanged', () => {
  const M = harness().api.meguruMod;
  const w = M.WORLDS.snow;
  for (const pool of [w.props, w.lane, w.hint, w.wall]) assert.ok(!pool.includes('⛄') && !pool.includes('☃️'), 'no snowman in ' + pool.join(''));
  for (const sp of w.spots) assert.ok(sp.prop !== '⛄' && sp.prop !== '☃️', sp.id + ' has no snowman marker');
  assert.equal(w.spots.find((s) => s.id === 'snowman').prop, '🧣', 'the snowman hill keeps a scarf as its trace');
  assert.equal(w.spots.find((s) => s.id === 'field').prop, '🛷');
  assert.equal(w.props.length, 8); assert.equal(w.lane.length, 6); assert.equal(w.hint.length, 3);
  assert.ok(w.props.includes('❄️') && w.props.includes('🌲') && w.props.includes('🛷') && w.lane.includes('🌨️'));
  // こおりは 絵文字の くりかえしでは なく canvas の 氷柱で えがく
  assert.ok(w.structs.some(([kind]) => kind === 'icepillar'));
});

test('companion, rare companion and partner emoji are known to the audit, including the ☃️/⛄ alias of the snowman', () => {
  const h = harness({ fullDisplay: true }); const M = h.api.meguruMod;
  const map = M.characterEmojiMap(h.api.displayCatalog.resolve);
  assert.ok(map.size >= 40, 'companions + partners + character assets: ' + map.size);
  for (const [emoji, key] of [['🐱', 'companion:cat_friend'], ['🦜', 'companion:parrot'], ['🗿', 'companion:sekizou'], ['🐻', 'partner:forest_bear'], ['⛄', 'partner:snowman'], ['🌻', 'partner:sunflower_partner']]) assert.ok((map.get(emoji) || []).includes(key), `${emoji} → ${key}: ${JSON.stringify(map.get(emoji))}`);
  assert.ok(map.get('⛄').includes('partner:snowman'), 'the ☃️ partner emoji and the ⛄ catalog alias are the same character');
  // しょくぶつ の ライン(きのこ・サンゴ・ハエトリソウ)は キャラ あつかい しない
  for (const e of ['🍄', '🪸', '🪴']) assert.ok(!map.has(e), e + ' stays scenery');
});

test('no random scenery pool (props / lane / wall / hint / zone lanes / local flavor) contains a companion, partner or character-asset emoji', () => {
  const h = harness({ fullDisplay: true }); const M = h.api.meguruMod;
  const audit = M.auditSceneryCharacters(h.api.displayCatalog.resolve);
  assert.equal(audit.issues.length, 0, 'character look-alikes in scenery: ' + JSON.stringify(audit.issues));
  // ゆるしている れいがいは しょくぶつ・てんき と、いせきの 石像 1つ だけ
  const reasons = new Set(audit.allowed.map((a) => a.reason));
  assert.deepEqual([...reasons].sort(), ['plant', 'statue', 'weather']);
  const statues = audit.allowed.filter((a) => a.reason === 'statue');
  assert.equal(statues.length, 1); assert.equal(statues[0].region, 'jungle'); assert.equal(statues[0].pool, 'spot'); assert.equal(statues[0].emoji, '🗿');
  for (const a of audit.allowed) if (a.reason !== 'statue') assert.ok(['🌻', '🌵', '❄️'].includes(a.emoji), a.emoji);
  // 🗿 は ランダムの プールには ない(1スポット 1体 だけ)
  for (const p of M.sceneryPools()) if (p.pool !== 'spot') assert.ok(!p.emojis.includes('🗿'), p.region + '/' + p.pool);
  assert.equal(M.auditScenery(h.api.sceneryResolve, h.api.displayCatalog.resolve).characters.length, 0);
});

test('a character emoji sneaking back into a random pool or a second statue spot is reported by the audit', () => {
  const h = harness({ fullDisplay: true }); const M = h.api.meguruMod;
  const snow = M.WORLDS.snow, jungle = M.WORLDS.jungle;
  const savedProps = snow.props.slice(), savedLane = snow.lane.slice(), savedSpot = jungle.spots[0].prop;
  try {
    snow.props.push('⛄'); snow.lane.push('🦜');
    jungle.spots[0].prop = '🗿';
    const audit = M.auditSceneryCharacters(h.api.displayCatalog.resolve);
    assert.ok(audit.issues.some((i) => i.region === 'snow' && i.pool === 'props' && i.emoji === '⛄' && i.keys.includes('partner:snowman')), JSON.stringify(audit.issues));
    assert.ok(audit.issues.some((i) => i.region === 'snow' && i.pool === 'lane' && i.emoji === '🦜'), 'parrot companion caught too');
    assert.ok(audit.issues.some((i) => i.region === 'jungle' && i.pool === 'spot' && i.emoji === '🗿' && /one spot/.test(i.detail)), 'a second statue is one too many');
  } finally {
    snow.props.length = 0; snow.props.push(...savedProps); snow.lane.length = 0; snow.lane.push(...savedLane); jungle.spots[0].prop = savedSpot;
  }
  assert.equal(M.auditSceneryCharacters(h.api.displayCatalog.resolve).issues.length, 0, 'restored');
});
