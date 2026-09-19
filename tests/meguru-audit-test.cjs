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
  // (どうぶつは けしきの プールから なくなった ので、のこるのは 🍄 などの しょくぶつ だけ)
  assert.ok(audit.characterUnderDisplay.some((e) => e.emoji === '🍄'), 'the display resolver would turn these into characters: ' + JSON.stringify(audit.characterUnderDisplay.map((e) => e.emoji)));
  assert.ok(!audit.characterUnderDisplay.some((e) => M.isFaunaEmoji(e.emoji)), 'no animal is left in the scenery pools');
  assert.equal(audit.fauna.length, 0);
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

// ---- じっさいの canvas の みちすじ: けしきは キャラの え にも placeholder にも ならない ----
const CHARACTER_SCENERY = ['🐈', '🍄', '🐄', '🦋', '🐓', '🦉', '🦅', '⛄', '🦌', '🪸', '🐙', '🪼', '🐟', '🦜', '🗿', '🦎', '🪴'];
function spyContext() {
  const calls = [];
  const ctx = { canvas: { dir: 'ltr' }, font: '20px sans-serif', textAlign: 'left', textBaseline: 'alphabetic', direction: 'inherit', globalAlpha: 1, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, imageSmoothingEnabled: true };
  for (const m of ['save', 'restore', 'translate', 'scale', 'rotate', 'beginPath', 'closePath', 'fill', 'stroke', 'moveTo', 'lineTo', 'arc', 'ellipse', 'setTransform', 'clip', 'rect', 'roundRect', 'setLineDash']) ctx[m] = () => {};
  ctx.measureText = (t) => ({ width: 20 * [...String(t)].length, actualBoundingBoxAscent: 16, actualBoundingBoxDescent: 4 });
  ctx.fillText = (text, x, y) => calls.push({ op: 'fillText', text, x, y });
  ctx.drawImage = (img, ...rest) => calls.push({ op: 'drawImage', src: img && (img.src || img.currentSrc || ''), rest });
  ctx.fillRect = (x, y, w, h) => calls.push({ op: 'fillRect', x, y, w, h, fillStyle: ctx.fillStyle });
  ctx.strokeText = () => {};
  ctx.createLinearGradient = () => ({ addColorStop() {} });
  return { ctx, calls };
}
const PLACEHOLDER_COLORS = new Set(['#eedbb6', '#ad9477']);
const isPlaceholder = (calls) => calls.some((c) => c.op === 'fillRect' && PLACEHOLDER_COLORS.has(String(c.fillStyle)));
const drewCharacter = (calls) => calls.some((c) => c.op === 'drawImage' && /assets\/characters\//.test(c.src));
function makeRenderer(h, spy, raw) {
  const M = h.api.meguruMod;
  return M.createCanvasRenderer({ canvas: {}, ctx: h.api.wrapCanvasCtx(spy.ctx), rawCtx: raw.ctx, W: 300, H: 500, tier: 0, playerGlyph: () => '🐣', wrapCtx: h.api.wrapCanvasCtx, wrapScenery: h.api.sceneryCtx, resolveScenery: h.api.sceneryResolve });
}

test('canvas path: 🐈 scenery is drawn as a native emoji, not the cat picture and not a placeholder tile', () => {
  const { h } = setup();
  const spy = spyContext(), raw = spyContext();
  const r = makeRenderer(h, spy, raw);
  assert.equal(r.sceneryMode('🐈'), 'native');
  r.drawScenery('🐈', 100, 200, 40);
  assert.ok(raw.calls.some((c) => c.op === 'fillText' && c.text === '🐈'), 'native fillText on the raw context: ' + JSON.stringify(raw.calls));
  assert.ok(!drewCharacter(raw.calls) && !drewCharacter(spy.calls), 'no character asset drawn');
  assert.ok(!isPlaceholder(raw.calls) && !isPlaceholder(spy.calls), 'no placeholder tile drawn');
});

test('canvas path: 🍄 scenery is a native emoji too', () => {
  const { h } = setup();
  const spy = spyContext(), raw = spyContext();
  const r = makeRenderer(h, spy, raw);
  r.drawScenery('🍄', 100, 200, 40);
  assert.ok(raw.calls.some((c) => c.op === 'fillText' && c.text === '🍄'));
  assert.ok(!drewCharacter(raw.calls) && !drewCharacter(spy.calls));
  assert.ok(!isPlaceholder(raw.calls) && !isPlaceholder(spy.calls));
});

test('canvas path: all 17 character-colliding scenery emoji become native emoji (no character asset, no placeholder), U+E000 is never scenery', () => {
  const { h } = setup();
  const spy = spyContext(), raw = spyContext();
  const r = makeRenderer(h, spy, raw);
  for (const emoji of CHARACTER_SCENERY) {
    const before = raw.calls.length;
    assert.equal(r.sceneryMode(emoji), 'native', emoji + ' has no dedicated scenery art, so it stays a native emoji');
    r.drawScenery(emoji, 100, 200, 40);
    assert.ok(raw.calls.slice(before).some((c) => c.op === 'fillText' && c.text === emoji), 'native fillText for ' + emoji);
  }
  assert.ok(!drewCharacter(raw.calls) && !drewCharacter(spy.calls), 'no character asset for any scenery emoji');
  assert.ok(!isPlaceholder(raw.calls) && !isPlaceholder(spy.calls), 'no placeholder for any scenery emoji');
  assert.equal(r.sceneryMode(''), 'skip');
  const n = raw.calls.length + spy.calls.length; r.drawScenery('', 100, 200, 40);
  assert.equal(raw.calls.length + spy.calls.length, n, 'the current-actor marker draws nothing as scenery');
});

test('canvas path: scenery with dedicated art (🌳 🌲 🌴 🌵 🐚) goes through the scenery wrapper, never native text and never a character', () => {
  const { h } = setup();
  const spy = spyContext(), raw = spyContext();
  const r = makeRenderer(h, spy, raw);
  for (const emoji of ['🌳', '🌲', '🌴', '🌵', '🐚']) {
    const d = h.api.sceneryResolve(emoji);
    assert.ok(d && (d.svg || d.image || d.asset), emoji + ' has scenery art');
    assert.equal(r.sceneryMode(emoji), 'art', emoji);
    r.drawScenery(emoji, 100, 200, 40);
    assert.ok(!raw.calls.some((c) => c.op === 'fillText' && c.text === emoji), emoji + ' is not drawn as raw text');
  }
  assert.ok(!drewCharacter(raw.calls) && !drewCharacter(spy.calls), 'no character asset');
});

test('canvas path: every scenery emoji of every region either has scenery art or falls back to a native emoji, never a character or a placeholder', () => {
  const { h, M } = setup();
  const spy = spyContext(), raw = spyContext();
  const r = makeRenderer(h, spy, raw);
  const emojis = M.sceneryEmojis();
  let native = 0, art = 0;
  for (const emoji of emojis) {
    const mode = r.sceneryMode(emoji);
    assert.ok(mode === 'native' || mode === 'art', emoji + ': ' + mode);
    const before = raw.calls.length;
    r.drawScenery(emoji, 100, 200, 40);
    const slice = raw.calls.slice(before);
    if (mode === 'native') { native++; assert.ok(slice.some((c) => c.op === 'fillText' && c.text === emoji), 'native emoji for ' + emoji); assert.ok(!isPlaceholder(slice), 'no placeholder for the native emoji ' + emoji); }
    else art++; // え が よみこまれるまでは placeholder が でる ことが ある(ハーネスでは がぞうが よみこまれない)
  }
  assert.ok(native > 0 && art > 0, `both paths are exercised (native ${native}, art ${art})`);
  assert.ok(!drewCharacter(raw.calls) && !drewCharacter(spy.calls), 'no character asset');
});

// 「住民 ○○ 体」は じょうけんで かわる ので、1つの 数字で 言わない。
// ここで 正本を とめて おく。ずかん・なかま・こいびと・ナオト・同行 の どれが
// いくつ ふえる／へる のかを、コードから じかに かぞえる
test('the number of residents is pinned to the dex, not to a round figure', () => {
  const h = harness({ fullDisplay: true });
  const api = h.api, s = api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, energy: 100, health: 100, hunger: 80, speciesLine: 'dog', stageIndex: 4, ageTicks: 500 });
  s.petKey = `dog:${api.currentFormStageIndex()}`;
  // ずかんの すがた の 上限 = ALL_LINES × その 系統の 段階数
  const stages = [];
  for (const line of api.ALL_LINES) for (let i = 0; i < (api.SPECIES[line].stages || []).length; i++) stages.push(`${line}:${i}`);
  s.discoveredStages = stages.slice();
  s.lifetime.companionsRecruited = [];
  s.lifetime.rareCompanionsRecruited = [];
  s.lifetime.partnersRecorded = [];
  api.render();
  const M = api.meguruMod;
  const reg = M.buildRegistry();
  const forms = reg.residents.filter((r) => r.kind === 'form').length;

  // ① 台帳の すがた の 数は「ずかんの 上限 − いまの子 1」。まるい 数字では ない
  assert.equal(forms, stages.length - 1, `forms = dex(${stages.length}) - the child you are playing as (1)`);
  assert.equal(reg.residents.length, forms, 'with no companions and no partners, the registry is only the dex forms');

  // ② HABITAT に すまいの ない 系統が ない(しずかに 1体 きえる のを ふせぐ)
  const noHome = api.ALL_LINES.filter((line) => !M.HABITAT[line]);
  assert.equal(noHome.length, 0, 'every species line has a habitat: ' + noHome.join(','));

  // ③ 世界に おかれる 数 = 台帳 + ナオト。重複 0・のこり 0
  const placed = [];
  for (const id of Object.keys(M.WORLDS)) for (const a of M.buildWorld(id, reg).residents) placed.push(a.key);
  assert.equal(new Set(placed).size, placed.length, 'nobody is placed twice');
  assert.equal(placed.length, reg.residents.length + (reg.naoto ? 1 : 0), 'everyone in the ledger is somewhere in the world');

  // ④ なかま・こいびとを 入れると、その ぶん だけ ふえる
  const comp = (api.normalCompanions || []).map((c) => c.id);
  const rare = (api.rareCompanions || []).map((c) => c.id);
  const part = (api.partnerCandidates || []).map((c) => c.id);
  s.lifetime.companionsRecruited = comp;
  s.lifetime.rareCompanionsRecruited = rare;
  s.lifetime.partnersRecorded = part;
  api.render();
  const full = M.buildRegistry();
  assert.equal(full.residents.length, forms + comp.length + rare.length + part.length,
    `forms ${forms} + companions ${comp.length} + rare ${rare.length} + partners ${part.length}`);

  // ⑤ 同行中の こは 世界から はずれ、party に 出る(二重に ならない)
  s.companions = [{ id: comp[0], bond: 80 }];
  s.partner = { id: part[0], affection: 100 };
  api.render();
  const walking = M.buildRegistry();
  const withPlayer = walking.residents.filter((r) => r.withPlayer);
  assert.equal(withPlayer.length, 2, 'one companion and one partner are walking with you');
  assert.equal(M.companionsOf(walking).length, 2, 'and both are in the party');
  const placed2 = [];
  for (const id of Object.keys(M.WORLDS)) for (const a of M.buildWorld(id, walking).residents) placed2.push(a.key);
  assert.equal(placed2.length, walking.residents.length - 2 + (walking.naoto ? 1 : 0), 'the two walking with you are not also living somewhere');
  for (const r of withPlayer) assert.ok(!placed2.includes(r.key), `${r.key} is not in the world as well`);
  assert.equal(new Set(placed2).size, placed2.length, 'still nobody is placed twice');
});
