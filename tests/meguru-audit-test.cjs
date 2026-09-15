const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

// めぐるの じゅうみん だいちょう の かんさ: 「ずかんの ほんものの じゅうみん」と「せかいを つくる けしき」を かんぜんに わける
function setup(opts = {}) {
  const h = harness(Object.assign({ fullDisplay: true }, opts));
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, speciesLine: 'dog', stageIndex: 4, ageTicks: 500 });
  const petStage = h.api.currentFormStageIndex();
  s.discoveredStages = ['dog:0', 'dog:1', `dog:${petStage}`, 'cat:2', 'cat:3', 'penguin:3', 'woman:1', 'cicada:2', 'mushroom:0', 'beetle:0'];
  s.petKey = `dog:${petStage}`;
  s.lifetime.companionsRecruited = ['shiba', 'owl', 'rabbit_friend'];
  s.lifetime.rareCompanionsRecruited = ['punyu'];
  s.companions = [{ id: 'shiba', bond: 80 }];
  s.lifetime.partnersRecorded = ['forest_bear', 'sea_mermaid', 'cat_ceo'];
  s.partner = { id: 'sea_mermaid', label: 'うみのにんぎょ', emoji: '🧜', affection: 100 };
  s.regionId = 'forest';
  h.api.render();
  return { h, s, M: h.api.meguruMod };
}
const keysOf = (reg) => reg.residents.map((r) => r.key);
const allWorldKeys = (M, reg) => Object.keys(M.WORLDS).flatMap((id) => M.buildWorld(id, reg).residents.map((a) => a.key));
const isCharacterAsset = (d) => !!(d && d.asset && /assets\/characters\//.test(d.asset));

test('1. the same discoveredStages key twice still gives one resident', () => {
  const { s, M } = setup();
  s.discoveredStages.push('cat:3', 'cat:3', 'penguin:3');
  const reg = M.buildRegistry();
  assert.equal(keysOf(reg).filter((k) => k === 'form:cat:3').length, 1);
  assert.equal(keysOf(reg).filter((k) => k === 'form:penguin:3').length, 1);
  assert.equal(allWorldKeys(M, reg).filter((k) => k === 'form:cat:3').length, 1, 'placed exactly once in the whole world');
  assert.equal(new Set(keysOf(reg)).size, keysOf(reg).length, 'no duplicate keys at all');
});

test('2. the same partnersRecorded id twice still gives one resident', () => {
  const { s, M } = setup();
  s.lifetime.partnersRecorded.push('forest_bear', 'cat_ceo', 'forest_bear');
  const reg = M.buildRegistry();
  assert.equal(keysOf(reg).filter((k) => k === 'partner:forest_bear').length, 1);
  assert.equal(keysOf(reg).filter((k) => k === 'partner:cat_ceo').length, 1);
  assert.equal(allWorldKeys(M, reg).filter((k) => k === 'partner:forest_bear').length, 1);
});

test('3. companion aliases collapse to one canonical resident', () => {
  const { h, s, M } = setup();
  s.lifetime.companionsRecruited = ['rabbit', 'rabbit_friend', 'penguin', 'penguin_friend', 'owl', 'owl'];
  s.companions = [];
  const reg = M.buildRegistry();
  assert.equal(h.api.canonicalCompanionId('rabbit'), 'rabbit_friend');
  assert.equal(keysOf(reg).filter((k) => k === 'companion:rabbit_friend').length, 1);
  assert.equal(keysOf(reg).filter((k) => k === 'companion:penguin_friend').length, 1);
  assert.equal(keysOf(reg).filter((k) => k === 'companion:owl').length, 1);
  assert.ok(!keysOf(reg).some((k) => k === 'companion:rabbit' || k === 'companion:penguin'), 'alias ids never become residents of their own');
});

test('4. the current pet is never an ordinary resident', () => {
  const { s, M } = setup();
  const reg = M.buildRegistry();
  assert.ok(!keysOf(reg).includes('form:' + s.petKey));
  assert.ok(!allWorldKeys(M, reg).includes('form:' + s.petKey));
  const audit = M.auditRegistry(reg);
  assert.ok(!audit.issues.some((i) => i.code === 'current-pet-duplicate'), JSON.stringify(audit.issues));
});

test('5. the current companion and partner walk with the player only, never as region residents', () => {
  const { s, M } = setup();
  const reg = M.buildRegistry();
  const worldKeys = allWorldKeys(M, reg);
  assert.ok(!worldKeys.includes('companion:shiba'), 'the companion walking with the player is not placed in any world');
  assert.ok(!worldKeys.includes('partner:sea_mermaid'), 'the current partner is not placed in any world');
  const party = M.companionsOf(reg).map((a) => a.key);
  assert.equal(JSON.stringify(party.sort()), JSON.stringify(['companion:shiba', 'partner:sea_mermaid']));
  // だいちょうの なかでも 1つずつ
  assert.equal(keysOf(reg).filter((k) => k === 'companion:shiba').length, 1);
  assert.equal(keysOf(reg).filter((k) => k === 'partner:sea_mermaid').length, 1);
  const audit = M.auditRegistry(reg);
  assert.ok(!audit.issues.some((i) => i.code === 'follower-duplicate'), JSON.stringify(audit.issues));
  void s;
});

test('6. legacy species left in an old save (bird:*) never become residents, but the save keeps them', () => {
  const { h, s, M } = setup();
  s.discoveredStages.push('bird:3', 'bird:5', 'rabbit:2', 'fish:1', 'panda:0', 'fox:4', 'owl:6', 'plant:2', 'robot:1', 'dinosaur:7', 'mermaid:3', 'unicorn:2');
  assert.ok(h.api.SPECIES.bird, 'the legacy definition still exists for old lives');
  assert.ok(!h.api.ALL_LINES.includes('bird'));
  const reg = M.buildRegistry();
  for (const line of ['bird', 'rabbit', 'fish', 'panda', 'fox', 'owl', 'plant', 'robot', 'dinosaur', 'mermaid', 'unicorn']) assert.ok(!keysOf(reg).some((k) => k.startsWith('form:' + line + ':')), 'no resident for legacy line ' + line);
  assert.ok(!reg.residents.some((r) => r.label === '若い鳥'), 'the "若い鳥" from the old save does not walk around');
  assert.ok(s.discoveredStages.includes('bird:3'), 'the save data itself is untouched');
  const audit = M.auditRegistry(reg);
  assert.ok(!audit.issues.some((i) => i.code === 'legacy-form'), JSON.stringify(audit.issues));
});

test('7. current-dex forms such as woman よちよち and the cicada appear once discovered', () => {
  const { h, s, M } = setup();
  const reg = M.buildRegistry();
  const woman = reg.residents.find((r) => r.key === 'form:woman:1');
  assert.ok(woman && woman.label === 'よちよち', 'woman:1 = よちよち');
  // 「よく鳴くセミ」の だんかいを さがして のせる
  const loud = h.api.SPECIES.cicada.stages.findIndex((st) => st.label === 'よく鳴くセミ');
  assert.ok(loud >= 0, 'the current dex has よく鳴くセミ');
  s.discoveredStages.push('cicada:' + loud);
  const reg2 = M.buildRegistry();
  const cicada = reg2.residents.find((r) => r.key === 'form:cicada:' + loud);
  assert.ok(cicada && cicada.label === 'よく鳴くセミ', 'the cicada appears once discovered');
  assert.ok(allWorldKeys(M, reg2).includes('form:woman:1') && allWorldKeys(M, reg2).includes('form:cicada:' + loud));
  // みはっけんの すがたは でない
  assert.ok(!keysOf(reg).includes('form:woman:5'));
  assert.ok(h.api.SPECIES.cicada);
  void s;
});

test('8. the city 🐈 scenery never resolves to the cat resident asset (the display resolver would)', () => {
  const { h } = setup();
  const display = h.api.displayCatalog.resolve('🐈');
  assert.ok(isCharacterAsset(display), 'reproduces the bug: the character-aware resolver turns 🐈 into a cat picture: ' + JSON.stringify(display));
  assert.equal(typeof h.api.sceneryResolve, 'function', 'a scenery-only resolver exists');
  const scenery = h.api.sceneryResolve('🐈');
  assert.ok(!isCharacterAsset(scenery), 'scenery resolver must not return a character asset: ' + JSON.stringify(scenery));
  assert.equal(h.api.sceneryResolve('\uE000'), null, 'scenery never draws the current actor');
});

test('9. the forest 🍄 scenery never resolves to the mushroom resident asset', () => {
  const { h } = setup();
  const display = h.api.displayCatalog.resolve('🍄');
  assert.ok(isCharacterAsset(display), 'reproduces the bug: ' + JSON.stringify(display));
  assert.equal(typeof h.api.sceneryResolve, 'function');
  const scenery = h.api.sceneryResolve('🍄');
  assert.ok(!isCharacterAsset(scenery), JSON.stringify(scenery));
});

test('10. every scenery emoji in every region (prop/lane/wall/hint/spot.prop/flavour/landmark fallbacks) stays scenery', () => {
  const { h, M } = setup();
  const audit = M.auditScenery(h.api.sceneryResolve, h.api.displayCatalog.resolve);
  assert.ok(audit.emojis.length >= 60, 'the audit covers the whole world: ' + audit.emojis.length);
  // ひょうじ よう の resolver では キャラに なる けしきが ある(= バグの げんいん)…
  assert.ok(audit.characterUnderDisplay.some((e) => e.emoji === '🐈') && audit.characterUnderDisplay.some((e) => e.emoji === '🍄'), 'the display resolver would turn these into characters: ' + JSON.stringify(audit.characterUnderDisplay.map((e) => e.emoji)));
  // …が、けしき よう の resolver では ひとつも キャラに ならない
  assert.equal(audit.characterUnderScenery.length, 0, 'scenery must never become a character: ' + JSON.stringify(audit.characterUnderScenery));
});

test('registry audit reports rows and every issue class (duplicate, legacy, undiscovered, pet, follower, shared asset)', () => {
  const { s, M } = setup();
  const reg = M.buildRegistry();
  const audit = M.auditRegistry(reg);
  assert.ok(audit.rows.length === reg.residents.length + (reg.naoto ? 1 : 0));
  for (const row of audit.rows) for (const f of ['key', 'kind', 'label', 'region', 'asset']) assert.ok(f in row, 'row has ' + f);
  assert.equal(audit.issues.length, 0, 'a clean save has no issues: ' + JSON.stringify(audit.issues));
  // わざと こわした だいちょうを かんさ すると みつかる
  const broken = { residents: reg.residents.concat([reg.residents[0], { key: 'form:bird:3', kind: 'form', line: 'bird', stage: 3, label: '若い鳥', asset: 'assets/characters/bird/04.png', region: 'forest' }, { key: 'form:cat:7', kind: 'form', line: 'cat', stage: 7, label: 'x', asset: 'assets/characters/cat/08.png', region: 'city' }, { key: 'form:' + s.petKey, kind: 'form', line: 'dog', stage: Number(s.petKey.split(':')[1]), label: 'me', asset: 'assets/characters/dog/05.png', region: 'home' }, { key: 'companion:shiba', kind: 'companion', id: 'shiba', label: 'dup', asset: 'assets/characters/companions/shiba.png', region: 'forest', withPlayer: false }, { key: 'partner:x', kind: 'partner', id: 'x', label: 'shared', asset: 'assets/characters/partners/forest_bear.png', region: 'forest' }]), naoto: null, byRegion: () => [] };
  const codes = new Set(M.auditRegistry(broken).issues.map((i) => i.code));
  for (const c of ['duplicate-key', 'duplicate-id', 'legacy-form', 'undiscovered-form', 'current-pet-duplicate', 'follower-duplicate', 'shared-asset']) assert.ok(codes.has(c), 'reports ' + c + ': ' + [...codes].join(','));
});
