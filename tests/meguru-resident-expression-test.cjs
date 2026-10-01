// めぐる Resident Expression System。docs/qa/meguru-resident-expression-2026-10-01.md
//
// ここで しばる 契約:
//   resident life / event → canonical emotion → expression mapping → Expression asset resolver(Home の 正本)→ renderer / dialogue
//   ・emotion の 名まえは resident-expression.js だけが 知って いる(renderer には ない)
//   ・画像は 1 まいも つくらない。Home の pet-expression.js / relationship-expression.js を そのまま つかう
//   ・画像が ない / resolver が こたえられない → production は base(ふつう)、dev / test は strict で 検出
//   ・一瞬の reaction は きれたら その時点の persistent へ もどる(normal 固定 では ない)
//   ・顔と 台詞は おなじ emotion から 出る(うれしい 顔 + いやがる 台詞 は 出ない)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { harness } = require('./helpers/runtime-harness.cjs');

const ROOT = path.join(__dirname, '..');
const RX = require('../resident-expression.js');
const PET = require('../pet-expression.js');
const REL = require('../relationship-expression.js');
const arr = (x) => Array.from(x || []);
const E = (time, weather, season) => ({ time: time || 'day', weather: weather || 'sunny', season: season || 'spring', region: 'x' });
const FIXED_ENV = { timeMode: 'day', weatherMode: 'sunny', seasonMode: 'spring' };

// いつも 128×128 で「よみこみずみ」の Image(2D レンダラーの drawImage に とどく え を しらべる ため)
class LoadedImage { constructor() { this.complete = true; this.naturalWidth = 128; this.naturalHeight = 128; this.width = 128; this.height = 128; this.src = ''; this.decoding = ''; } }

// ずかんの 全コマ + なかま 26(canonical)+ こいびと 18 を ぜんいん 住民に する。手がきの 一覧は つかわない
function makeHarness(opts = {}) {
  const h = harness({ fullDisplay: true, pinDate: true, clockNow: 1000, imageClass: LoadedImage });
  const s = h.api.state();
  Object.assign(s.lifetime, FIXED_ENV);
  Object.assign(s, { stage: 'growing', isSleeping: false, energy: 100, health: 100, hunger: 80, speciesLine: 'dog', stageIndex: 4, ageTicks: 500, regionId: opts.regionId || 'forest' });
  s.petKey = `dog:${h.api.currentFormStageIndex()}`;
  const all = []; const SP = h.api.SPECIES;
  for (const line of Object.keys(SP)) for (let i = 0; i < (SP[line].stages || []).length; i++) all.push(`${line}:${i}`);
  s.discoveredStages = all;
  const comps = arr(h.api.normalCompanions).concat(arr(h.api.rareCompanions));
  s.lifetime.companionsRecruited = arr(h.api.normalCompanions).map((c) => c.id);
  s.lifetime.rareCompanionsRecruited = arr(h.api.rareCompanions).map((c) => c.id);
  s.lifetime.partnersRecorded = arr(h.api.partnerCandidates).map((p) => p.id);
  s.companions = []; s.partner = null;
  h.api.render();
  return { h, s, M: h.api.meguruMod, comps };
}
const { h: H0, M, comps: ALL_COMPANIONS } = makeHarness();
const REGISTRY = M.buildRegistry();
const RESIDENTS = REGISTRY.residents;
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const seededRandom = (seed) => { let t = seed >>> 0; return () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
const withSeed = (seed, fn) => { M.setRandom(seededRandom(seed)); try { return fn(); } finally { M.setRandom(null); } };
const free = (a) => !a.plant && !a.fixed && !a.follow;
const simFor = (regionId, init = {}) => M.createSimulation(Object.assign({ regionId, registry: REGISTRY, discovered: [], env: E() }, init));
const stepSec = (sim, sec) => { for (let i = 0; i < Math.round(60 * sec); i++) sim.step(1 / 60, { x: 0, y: 0 }); };
// 住民の まえに 立って、nearest に なる まで すすめる
function standBy(sim, a) {
  for (const [dx, dz] of [[0, -40], [0, 40], [40, 0], [-40, 0], [30, -30], [-30, -30], [0, -70], [0, 70]]) {
    sim.setPlayer(a.x + dx, a.z + dz);
    for (let i = 0; i < 4 && sim.view().nearest !== a; i++) sim.step(1 / 60, { x: 0, y: 0 });
    if (sim.view().nearest === a) return true;
  }
  return false;
}
const firstFree = (sim, pred) => sim.world.residents.find((a) => free(a) && (!pred || pred(a)));
const familyExpression = (a, canonical) => RX.expressionFor(RX.familyOf(a), canonical);
// main 591b9de の Home 正本の sha256(めぐる lane は これらを 1 byte も かえない)
const HOME_HASHES = Object.freeze({ pet: '2286598972fd1ef4c5a88dbafd3292f6929b7bb109205ebfc5b282229ac18f8c', rel: '5fdba60b9155f53f7a3f77c3acb307df2c2397c344e8b74a5e955bbb2eb85082', emo: 'd341ed6e7fe0f6a60b998d7fadc06de66bf7e5286bfd6e41bfd70f490c76ff55' });

// ───────────────────────────── 1. coverage: 全住民 × canonical emotion → 正しい Expression asset
test('1. the resident set comes from the registry (all dex forms, 26 companions, 18 partners) and every canonical emotion resolves without a gap', () => {
  const forms = RESIDENTS.filter((r) => r.kind === 'form'), companions = RESIDENTS.filter((r) => r.kind === 'companion'), partners = RESIDENTS.filter((r) => r.kind === 'partner');
  const SP = H0.api.SPECIES; let dex = 0; for (const line of arr(H0.api.ALL_LINES)) dex += (SP[line].stages || []).length;
  assert.equal(forms.length, dex - 1, 'every current-dex form except the current pet is a resident (legacy lines are not residents)');
  assert.equal(new Set(forms.map((r) => r.line)).size, arr(H0.api.ALL_LINES).length, 'all 31 current lines are present');
  assert.equal(companions.length, 26, 'all canonical companions');
  assert.equal(partners.length, 18, 'all partners');
  assert.equal(ALL_COMPANIONS.length, 26, 'the companion master has 26 canonical companions');
  const { rows, gaps } = RX.audit(RESIDENTS);
  assert.deepEqual(gaps, [], 'no resident × emotion falls back');
  assert.equal(rows.length, RESIDENTS.length * RX.EMOTIONS.length);
  const homeVocab = new Set(['normal', 'happy', 'strained', 'sulky', 'hungry', 'sick', 'tired', 'weak', 'critical', 'wantsPlay', 'sleeping', 'positive', 'lonely']);
  let distinct = new Set();
  for (const row of rows) {
    assert.ok(homeVocab.has(row.expression), `${row.key}/${row.emotion}: ${row.expression} is a Home Expression System state`);
    assert.ok(exists(row.asset), `${row.key}/${row.emotion}: ${row.asset} exists`);
    distinct.add(row.asset);
    if (row.family === 'stage' && row.expression !== 'normal') assert.match(row.asset, /^assets\/characters\/expressions\//, 'stage faces come from the Home expression folder');
    if (row.family === 'relationship' && row.expression !== 'normal') assert.match(row.asset, /^assets\/characters\/relationship\//, 'companion/partner faces come from the relationship folder');
  }
  // すがた: normal + 7 表情(positive/dislike/tired/sleeping/strained/wantsPlay/sick)。なかま・こいびと: normal + positive
  assert.equal(distinct.size, forms.length * 8 + (companions.length + partners.length) * 2);
  assert.doesNotThrow(() => RX.audit(RESIDENTS, { strict: true }));
});

// ───────────────────────────── 2. normal fallback(production は だまって ちがう 顔を 出さず base)
test('2. production fallback is always the normal/base picture, never a different face', () => {
  const legacy = { key: 'form:bird:1', kind: 'form', line: 'bird', stage: 1, asset: 'assets/characters/bird/02.png', sprites: { front: 'assets/characters/bird/02.png' } };
  const r1 = RX.resolve(legacy, 'positive');
  assert.deepEqual([r1.expression, r1.asset, r1.fallback], ['normal', legacy.asset, 'missing-variant']);
  const naoto = REGISTRY.naoto || { key: 'naoto', kind: 'naoto', id: 'naoto', asset: 'assets/characters/author/01.png', sprites: { front: 'assets/characters/author/01.png' } };
  for (const em of RX.EMOTIONS) { const r = RX.resolve(naoto, em); assert.equal(r.expression, 'normal'); assert.equal(r.asset, naoto.asset); }
  const alias = { key: 'companion:kinoko', kind: 'companion', id: 'kinoko', asset: 'assets/characters/companions/kinoko.png', sprites: { front: 'assets/characters/companions/kinoko.png' } };
  const r2 = RX.resolve(alias, 'positive');
  assert.deepEqual([r2.expression, r2.asset, r2.fallback], ['normal', alias.asset, 'unsupported-id'], 'a non-canonical companion id falls back to its own picture');
  const r3 = RX.resolve(RESIDENTS.find((r) => r.kind === 'form'), 'furious');
  assert.deepEqual([r3.emotion, r3.expression, r3.fallback], ['normal', 'normal', 'unknown-emotion']);
  // 住民が ない / base が ない
  assert.equal(RX.resolve(null, 'positive').asset, null);
  const r4 = RX.resolve({ kind: 'form' }, 'positive');
  assert.deepEqual([r4.family, r4.expression, r4.asset], ['none', 'normal', null], 'a form without a picture has no face family: normal, nothing to draw');
});

// ───────────────────────────── 3. positive event → positive expression(+ 台詞も positive)
test('3. a friendly interaction (being talked to) gives a positive face and a positive line, for a dex form and for a companion', () => withSeed(31, () => {
  const sim = simFor('forest');
  stepSec(sim, 1);
  for (const kind of ['form', 'companion', 'partner']) {
    const a = firstFree(sim, (q) => q.kind === kind && q.behavior !== 'sleep');
    if (!a) continue;
    assert.ok(standBy(sim, a), `${kind}: standing next to the resident makes them the nearest`);
    const r = sim.talk();
    assert.equal(r.actor, a); assert.equal(r.event, 'talk'); assert.equal(r.emotion, 'happy');
    assert.equal(a.expr.emotion, 'positive');
    assert.equal(a.expr.expression, familyExpression(a, 'positive'));
    assert.equal(a.expr.expression, kind === 'form' ? 'happy' : 'positive');
    assert.notEqual(a.expr.asset, a.asset, `${kind}: the positive picture is not the base picture`);
    assert.ok(exists(a.expr.asset));
    assert.equal(M.spriteFor(a, 'front').asset, a.expr.asset, 'the renderer contract returns the positive picture');
    assert.equal(RX.dialogueEmotion(r.line), 'positive', `${kind}: the line is a positive line (${r.line})`);
    assert.ok(RX.consistent(a.emotion, r.line));
  }
}));

// ───────────────────────────── 4. dislike event → dislike expression(+ 台詞も dislike)
test('4. an unwanted interaction (waking a sleeper, pestering) gives the dislike face and a dislike line; companions have no dislike picture and stay normal', () => withSeed(47, () => {
  const sim = simFor('city');
  stepSec(sim, 1);
  // しつこく はなしかける: 2 かいめは PESTER_SEC の うち
  const a = firstFree(sim, (q) => q.kind === 'form' && q.behavior !== 'sleep');
  assert.ok(standBy(sim, a));
  assert.equal(sim.talk().event, 'talk');
  stepSec(sim, 2);
  assert.ok(standBy(sim, a));
  const r = sim.talk();
  assert.equal(r.event, 'talk_pester'); assert.equal(r.emotion, 'unhappy');
  assert.equal(a.expr.emotion, 'dislike'); assert.equal(a.expr.expression, 'sulky');
  assert.match(a.expr.asset, /-sulky\.png$/);
  assert.equal(RX.dialogueEmotion(r.line), 'dislike', r.line);
  assert.ok(a.sulk > 0 && a.joy === 0, 'the pester cancels the earlier joy');
  // ねむって いる ところを おこす
  const b = firstFree(sim, (q) => q.kind === 'form' && q !== a);
  b.behavior = 'sleep'; b.act = 'sleep'; b.until = 30; b.joy = 0; b.sulk = 0;
  sim.step(1 / 60, { x: 0, y: 0 });
  assert.ok(standBy(sim, b));
  const r2 = sim.talk();
  assert.equal(r2.event, 'talk_wake'); assert.equal(b.expr.expression, 'sulky');
  assert.equal(b.behavior, 'idle', 'talking wakes the sleeper');
  assert.equal(RX.dialogueEmotion(r2.line), 'dislike', r2.line);
  // なかま / こいびと には「いや」の えが ない → base(ふつう)の まま。ちがう 顔(lonely)を 出さない
  const c = firstFree(sim, (q) => q.kind === 'companion' || q.kind === 'partner');
  if (c) {
    assert.ok(standBy(sim, c)); sim.talk(); stepSec(sim, 1); assert.ok(standBy(sim, c));
    const r3 = sim.talk();
    assert.equal(r3.event, 'talk_pester'); assert.equal(c.expr.emotion, 'dislike');
    assert.equal(c.expr.expression, 'normal'); assert.equal(c.expr.asset, c.asset); assert.equal(c.expr.fallback, null, 'this is the mapping, not a fallback');
    assert.equal(RX.dialogueEmotion(r3.line), 'dislike', 'the words still say so');
  }
  // mapping の 正本: dislike は sulky(stage)、relationship では normal。lonely は つかわない(将来の ため のこす)
  assert.equal(RX.EXPRESSION_FOR.stage.dislike, 'sulky');
  assert.equal(RX.EXPRESSION_FOR.relationship.dislike, 'normal');
  assert.ok(!Object.values(RX.EXPRESSION_FOR.relationship).includes('lonely'));
}));

// ───────────────────────────── 5. sick state → sick expression(資産は ある。生活からは 発火しない)
test('5. sick resolves to the Home sick picture, but no resident-life event ever produces it (no illness signal exists)', () => withSeed(53, () => {
  for (const r of RESIDENTS.filter((q) => q.kind === 'form').slice(0, 40)) assert.match(RX.resolve(r, 'sick').asset, /-sick\.png$/);
  assert.ok(!M.RESIDENT_EMOTIONS.includes('sick'), 'resident life has no sick state');
  for (const id of ['forest', 'sea', 'snow']) {
    const sim = simFor(id, { env: E('day', 'rain') });
    for (let i = 0; i < 60 * 90; i++) { sim.step(1 / 60, { x: 0, y: 0 }); if (i % 60 === 0) for (const a of sim.world.residents) { assert.notEqual(a.emotion, 'sick'); if (a.expr) assert.notEqual(a.expr.expression, 'sick', `${a.key}: never sick without illness`); } }
  }
  // QA の 固定(?mgexprforce=sick)だけが sick を 出す。その ときも 顔・台詞は おなじ emotion
  const sim = simFor('forest', { forceEmotion: 'sick' });
  stepSec(sim, 0.5);
  const a = firstFree(sim, (q) => q.kind === 'form');
  assert.equal(a.emotion, 'sick'); assert.equal(a.expr.expression, 'sick');
  assert.ok(standBy(sim, a));
  const r = sim.talk();
  assert.equal(RX.dialogueEmotion(r.line), 'sick', r.line);
}));

// ───────────────────────────── 6. tired state → tired expression
test('6. a tired resident (low energy) shows the tired picture and says a tired line; a companion stays on its base picture', () => withSeed(61, () => {
  const sim = simFor('countryside');
  stepSec(sim, 1);
  const a = firstFree(sim, (q) => q.kind === 'form' && q.behavior !== 'sleep');
  a.energy = 0.1; a.joy = 0; a.sulk = 0;
  sim.step(1 / 60, { x: 0, y: 0 });
  assert.equal(a.emotion, 'tired'); assert.equal(a.emotionPersistent, 'tired');
  assert.equal(a.expr.expression, 'tired'); assert.match(a.expr.asset, /-tired\.png$/);
  assert.ok(standBy(sim, a));
  const r = sim.talk();   // はなしかけると うれしい reaction が 上に のる → 台詞も positive(顔と 一致)
  assert.equal(r.emotion, 'happy'); assert.equal(RX.dialogueEmotion(r.line), 'positive');
  a.joy = 0; sim.step(1 / 60, { x: 0, y: 0 });
  assert.equal(a.expr.expression, 'tired', 'back to tired as soon as the reaction is gone');
  const line = M.talkLine(a);
  assert.equal(RX.dialogueEmotion(line), 'tired', line);
  const c = firstFree(sim, (q) => q.kind === 'companion');
  if (c) { c.energy = 0.1; c.joy = 0; c.sulk = 0; sim.step(1 / 60, { x: 0, y: 0 }); assert.equal(c.emotion, 'tired'); assert.equal(c.expr.expression, 'normal'); assert.equal(c.expr.asset, c.asset); }
}));

// ───────────────────────────── 7. temporary reaction → persistent state へ 復帰
test('7. a temporary reaction expires back to the persistent state of that moment (tired), not to a fixed normal; sleeping overrides reactions', () => withSeed(71, () => {
  const sim = simFor('forest');
  stepSec(sim, 1);
  const a = firstFree(sim, (q) => q.kind === 'form' && q.behavior !== 'sleep');
  a.energy = 0.1; a.behavior = 'idle'; a.until = 1e9; a.route = null;   // つかれて いて、うごかない
  sim.step(1 / 60, { x: 0, y: 0 });
  assert.equal(a.expr.expression, 'tired');
  assert.ok(M.applyReaction(a, 'positive'));
  const started = a.joy;
  assert.ok(started >= RX.REACTION.positive.min && started <= RX.REACTION.positive.max, 'reaction length comes from the shared contract');
  sim.step(1 / 60, { x: 0, y: 0 });
  assert.equal(a.expr.expression, 'happy');
  let frames = 0; while (a.joy > 0 && frames < 60 * 60) { sim.step(1 / 60, { x: 0, y: 0 }); frames++; }
  assert.ok(frames > 60 * (RX.REACTION.positive.min - 1) && frames < 60 * (RX.REACTION.positive.max + 2), `the reaction lasted ${frames} frames`);
  assert.equal(a.emotion, 'tired'); assert.equal(a.expr.expression, 'tired', 'back to the persistent state, which is tired here');
  // げんきなら normal へ
  a.energy = 0.9; M.applyReaction(a, 'dislike'); sim.step(1 / 60, { x: 0, y: 0 }); assert.equal(a.expr.expression, 'sulky');
  frames = 0; while (a.sulk > 0 && frames < 60 * 60) { sim.step(1 / 60, { x: 0, y: 0 }); frames++; }
  assert.equal(a.expr.expression, 'normal'); assert.equal(a.expr.asset, a.asset);
  // ねむると reaction より ねむりが 勝つ(Home と おなじ 向き)
  M.applyReaction(a, 'positive'); a.behavior = 'sleep'; sim.step(1 / 60, { x: 0, y: 0 });
  assert.equal(a.expr.expression, 'sleeping'); assert.match(a.expr.asset, /-sleeping(-v3)?\.png$/);
  assert.equal(RX.effectiveEmotion({ persistent: 'sleeping', reaction: 'positive' }), 'sleeping');
  assert.equal(RX.effectiveEmotion({ persistent: 'tired', reaction: null }), 'tired');
}));

// ───────────────────────────── 8. dialogue と expression の semantic 一致
test('8. face and words always come from the same emotion: no happy face with a dislike line, no sick words without sick', () => withSeed(83, () => {
  const sim = simFor('city');
  stepSec(sim, 2);
  const seen = new Map();
  for (let round = 0; round < 60; round++) {
    const a = sim.world.residents[round % sim.world.residents.length];
    if (!free(a)) continue;
    // いろいろな emotion を つくる(せかいの 信号を さわる。顔は つねに そこから 導出)
    const want = RX.EMOTIONS[round % RX.EMOTIONS.length];
    a.joy = 0; a.sulk = 0; a.energy = 0.8; a.wish = 0; a.behavior = 'idle'; a.until = 5;
    sim.setEnv(E());
    if (want === 'positive') a.joy = 5; else if (want === 'dislike') a.sulk = 5; else if (want === 'tired') a.energy = 0.1; else if (want === 'sleeping') a.behavior = 'sleep'; else if (want === 'wantsPlay') { a.wish = 3; a.cool = 0; }
    else if (want === 'strained') { sim.setEnv(E('day', 'rain')); a.energy = 0.4; a.traits.calm = 0.8; if (a.spot) a.spot = Object.assign({}, a.spot, { shelter: false }); }
    sim.step(1 / 60, { x: 0, y: 0 });
    for (let k = 0; k < 12; k++) {
      const line = M.talkLine(a);
      const em = RX.canonicalEmotion(a.emotion);
      assert.ok(RX.consistent(a.emotion, line), `${a.key}: emotion ${a.emotion} / expression ${a.expr && a.expr.expression} / line "${line}" (${RX.dialogueEmotion(line)})`);
      // 顔が うれしいのに いやがる 台詞、いやがる 顔なのに うれしい 台詞 は 出ない
      if (a.expr && a.expr.expression === 'happy') assert.notEqual(RX.dialogueEmotion(line), 'dislike');
      if (a.expr && a.expr.expression === 'sulky') assert.notEqual(RX.dialogueEmotion(line), 'positive');
      if (RX.dialogueEmotion(line) === 'sick') assert.equal(em, 'sick');
      seen.set(em, (seen.get(em) || 0) + 1);
    }
  }
  for (const em of ['normal', 'positive', 'dislike', 'tired', 'sleeping', 'strained', 'wantsPlay']) assert.ok(seen.get(em), `${em} was exercised (${[...seen.keys()].join('/')})`);
  // はなす(talk) の かえりちも おなじ: event → emotion → expression → line
  for (let i = 0; i < 20; i++) {
    const a = firstFree(sim, (q) => q.kind !== 'naoto' && Math.random() < 0.5) || firstFree(sim);
    if (!standBy(sim, a)) continue;
    const r = sim.talk();
    assert.ok(RX.consistent(r.emotion, r.line), `${r.event}: ${r.emotion} / "${r.line}"`);
    assert.equal(r.expression, familyExpression(a, RX.canonicalEmotion(r.emotion)));
    stepSec(sim, 0.5);
  }
  // ふつうの 台詞(Home 由来の あいさつ・天気・季節・場所)は きもちの 台詞と まざらない
  for (const pool of Object.values(RX.DIALOGUE)) for (const line of pool) assert.equal(RX.dialogueEmotion(line) === 'normal', false);
}));

// ───────────────────────────── 9. resident 切替で まえの resident の expression が のこらない
test('9. an expression belongs to one actor: another resident, a new world and a flag-off never inherit it', () => withSeed(97, () => {
  const sim = simFor('forest');
  stepSec(sim, 1);
  const a = firstFree(sim, (q) => q.kind === 'form'), b = firstFree(sim, (q) => q.kind === 'form' && q !== a);
  a.joy = 0; a.sulk = 0; b.joy = 0; b.sulk = 0; a.energy = 0.8; b.energy = 0.8; a.behavior = 'idle'; b.behavior = 'idle'; a.until = 9; b.until = 9;
  M.applyReaction(a, 'positive');
  sim.step(1 / 60, { x: 0, y: 0 });
  assert.equal(a.expr.expression, 'happy'); assert.equal(b.expr.expression, 'normal');
  assert.notEqual(a.expr, b.expr); assert.equal(b.expr.base, b.asset);
  // おなじ 住民が べつの せかい(地域を 出て もどる)では あたらしい actor。まえの 顔は もちこまない
  const keyA = a.key, exprA = a.expr;
  sim.enterRegion('mountain'); stepSec(sim, 0.2); sim.enterRegion('forest');
  const a2 = sim.world.residents.find((q) => q.key === keyA);
  assert.ok(a2 && a2 !== a, 'a fresh actor object');
  assert.equal(a2.expr, null, 'no expression before the first life update');
  assert.equal(a2.joy, 0, 'no leftover reaction');
  sim.step(1 / 60, { x: 0, y: 0 });
  assert.notEqual(a2.expr, exprA);
  assert.equal(M.spriteFor(a2, 'front').asset, a2.asset, 'back on the base picture');
  // フラグを きると ぜんいん すぐ base(ghost texture の もとに なる expr を のこさない)
  M.applyReaction(a2, 'positive'); sim.step(1 / 60, { x: 0, y: 0 }); assert.equal(a2.expr.expression, 'happy');
  sim.setResidentExpression(false);
  assert.equal(a2.expr, null); assert.equal(M.spriteFor(a2, 'front').asset, a2.asset);
  sim.step(1 / 60, { x: 0, y: 0 }); assert.equal(a2.expr, null, 'stays off');
  sim.setResidentExpression(true); sim.step(1 / 60, { x: 0, y: 0 }); assert.equal(a2.expr.expression, 'happy');
  // 設定だけを 直接 きった ときも、つぎの 生活更新で expr が 消える(sync 側の 防御。stale な expr を 描かせない)
  sim.expressionConfig.on = false; sim.step(1 / 60, { x: 0, y: 0 });
  assert.equal(a2.expr, null, 'sync clears a stale expression when the config is off');
  assert.equal(M.spriteFor(a2, 'front').asset, a2.asset);
  sim.expressionConfig.on = true;
}));

// ───────────────────────────── 10. 2D renderer で うごく
test('10. the 2D canvas renderer draws the expression picture, and draws the base picture while the expression picture is still loading', () => withSeed(101, () => {
  const sim = simFor('forest');
  stepSec(sim, 1);
  const a = firstFree(sim, (q) => q.kind === 'form' && q.behavior !== 'sleep');
  a.joy = 0; a.sulk = 0; a.energy = 0.8; a.behavior = 'idle'; a.until = 9;
  M.applyReaction(a, 'positive'); sim.step(1 / 60, { x: 0, y: 0 });
  sim.setPlayer(a.x, a.z - 160); sim.step(1 / 60, { x: 0, y: 0 });
  const drawn = [];
  const grad = { addColorStop() {} };
  const ctx = new Proxy({ canvas: { width: 390, height: 600 }, globalAlpha: 1, font: '10px sans-serif' }, {
    get(o, k) {
      if (k in o) return o[k];
      if (typeof k !== 'string') return undefined;
      if (k === 'measureText') return (s) => ({ width: String(s).length * 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
      if (k === 'getImageData') return (x, y, w, hh) => ({ data: new Uint8ClampedArray(Math.max(1, w * hh * 4)) });
      if (k === 'drawImage') return (im) => { if (im && typeof im.src === 'string') drawn.push(im.src); };
      return () => (k.startsWith('create') ? grad : undefined);
    },
    set(o, k, v) { o[k] = v; return true; },
  });
  // makeCanvas: null → したごしらえ(bakedSprite)なし → え は そのまま drawImage に とどく(src が 見える)
  const r = M.createCanvasRenderer({ canvas: {}, ctx, rawCtx: ctx, W: 390, H: 600, tier: 0, makeCanvas: () => null });
  r.draw(sim.view(), 1000);
  assert.ok(drawn.includes(a.expr.asset), `the happy picture ${a.expr.asset} reached drawImage`);
  assert.ok(!drawn.includes(a.asset) || drawn.filter((s) => s === a.asset).length < drawn.filter((s) => s === a.expr.asset).length + 1, 'the base picture is not drawn on top of the happy one');
  // よみこみ まえ: imageFor が null を かえす え は base へ(絵文字へ 落ちない・ちがう 顔を 出さない)
  const pending = new Set([a.expr.asset]);
  const im = M.imageFor(a.expr.asset); assert.ok(im, 'the sandbox Image is loaded');
  im.complete = false;   // まだ よめて いない ふり
  drawn.length = 0; r.draw(sim.view(), 1016);
  assert.ok(!drawn.includes(a.expr.asset)); assert.ok(drawn.includes(a.asset), 'base picture while loading');
  im.complete = true;
  drawn.length = 0; r.draw(sim.view(), 1032);
  assert.ok(drawn.includes(a.expr.asset), 'and the expression once it is decoded');
  assert.ok(pending.size === 1);
  r.destroy();
}));

// ───────────────────────────── 11. 3D billboard も おなじ 契約(emotion は renderer に ない)
test('11. the 3D billboard uses the same spriteFor contract (asset + base) and neither renderer carries emotion vocabulary', () => {
  const src3d = fs.readFileSync(path.join(ROOT, 'meguru-3d.mjs'), 'utf8');
  const fn = src3d.slice(src3d.indexOf('function actorTexture('), src3d.indexOf('function skyTexture('));
  assert.match(fn, /M\.spriteFor\(a, 'front'\)/, 'the billboard reads the sprite through spriteFor');
  assert.match(fn, /\[s && s\.asset, s && s\.base\]/, 'tries the expression picture first, then the base picture, before the emoji glyph');
  assert.match(fn, /texCache\.has\(key\)/, 'one texture per asset, reused');
  const EMOTION_WORDS = /\b(happy|sulky|wantsPlay|sleeping|strained|hungry|critical|positive|lonely|emotion|canonicalEmotion|NaotocchiResidentExpression|NaotocchiPetExpression)\b/;
  assert.ok(!EMOTION_WORDS.test(src3d), '3D renderer has no emotion/expression vocabulary');
  const srcM = fs.readFileSync(path.join(ROOT, 'meguru.js'), 'utf8');
  const renderer2d = srcM.slice(srcM.indexOf('function createCanvasRenderer('), srcM.indexOf('function drawBubble('));
  assert.ok(renderer2d.length > 10000);
  assert.ok(!/\b(happy|sulky|wantsPlay|strained|positive|lonely|canonicalEmotion|residentExpression|\.expr\b)/.test(renderer2d), '2D renderer reads only spriteFor(asset/base), never emotion');
  // spriteFor は 表情の え と base の 両方を かえす。表情が なければ 同じ
  const a = RESIDENTS.find((r) => r.kind === 'form');
  const plain = M.spriteFor(Object.assign({ face: 1 }, a), 'front');
  assert.equal(plain.asset, a.asset); assert.equal(plain.base, a.asset);
  const withExpr = M.spriteFor(Object.assign({ face: 1, expr: RX.resolve(a, 'positive') }, a), 'front');
  assert.match(withExpr.asset, /-happy(-v3)?\.png$/); assert.equal(withExpr.base, a.asset);
  // 3D の 住民の え(billboard)が 2D と おなじ PNG 群で ある こと(assets の 中)
  assert.ok(exists(withExpr.asset) && exists(withExpr.base));
});

// ───────────────────────────── 12. flag-off / Home の Expression System を かえない
test('12. flag-off leaves residents on their base pictures, and the Home Expression System modules are untouched (frozen, same content)', () => withSeed(113, () => {
  const sim = simFor('forest', { residentExpression: false });
  stepSec(sim, 3);
  for (const a of sim.world.residents) { assert.equal(a.expr, null); assert.equal(M.spriteFor(a, 'front').asset, a.asset); }
  assert.equal(sim.expressionConfig.on, false);
  // 住民生活 そのものは フラグに よらず おなじ(emotion は ろんりの 状態 として 生きて いる)
  assert.ok(sim.world.residents.some((a) => free(a) && M.RESIDENT_EMOTIONS.includes(a.emotion)));
  // Home の 正本は 凍結された API で、resident-expression.js は なにも 書きこまない
  assert.ok(Object.isFrozen(PET) && Object.isFrozen(RX));
  assert.ok(Object.isFrozen(REL.SUPPORTED) && Object.isFrozen(REL.ART_BOUNDS));
  assert.deepEqual(Object.keys(PET).sort(), ['accentFor', 'assetFor', 'hungerCategoryFor', 'reactionFor', 'resolve', 'sweatFor']);
  assert.deepEqual(Object.keys(REL).sort(), ['ART_BOUNDS', 'REACTION_MS', 'SUPPORTED', 'companionPositiveIds', 'createReactions', 'heartAnchor', 'heartMarkup', 'heartSize', 'resolve']);
  const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex');
  // main 591b9de の Home 正本(めぐる lane は これらを 1 byte も かえない)
  assert.deepEqual({ pet: sha('pet-expression.js'), rel: sha('relationship-expression.js'), emo: sha('emotion-state.js') }, HOME_HASHES);
  // めぐるの ことばは Home の 台詞資産を かえない: Home の reaction 表(pet-expression)は そのまま
  assert.equal(PET.reactionFor('play_with'), 'happy'); assert.equal(PET.reactionFor('play_with_annoyed'), 'sulky');
}));

// ───────────────────────────── 13. save / schema 不変
test('13. nothing about expressions reaches the save: the same keys and schemaVersion as a flag-off run, and no actor state serialized', () => {
  // おなじ ことを フラグ on / off(?mgexpr=0)で やって、セーブの かたちを くらべる。off は 表情の コードを 一度も とおらない
  const scenario = (flagOff) => withSeed(127, () => {
    const { h, s } = makeHarness({ regionId: 'forest' });
    if (flagOff) h.window.location.search = '?mgexpr=0';
    const before = new Set(Object.keys(s)), lifetimeBefore = new Set(Object.keys(s.lifetime)), ver = s.schemaVersion;
    assert.equal(h.api.startMeguru(), true);
    const run = h.api.meguruRun(), sim = run.sim;
    assert.equal(sim.expressionConfig.on, !flagOff, 'the URL flag reaches the simulation (and nothing else does)');
    const a = run.world.residents.find((q) => free(q));
    run.setPlayer(a.x, a.z - 30); h.advance(40);
    assert.equal(run.nearest, a);
    h.dispatch(h.get('meguruOverlay').querySelector('#mgrTalk'), 'click');
    if (!flagOff) assert.ok(a.expr && a.expr.expression === 'happy');
    else assert.equal(a.expr, null);
    h.advance(600);
    h.api.stopMeguru();
    const raw = JSON.stringify(s);
    for (const word of ['"expr"', 'emotionPersistent', 'talkedAt', 'expression', 'sulky', 'resident-expression', 'mgexpr']) assert.ok(!raw.includes(word), `${word} is not in the save`);
    return { ver, after: s.schemaVersion, added: Object.keys(s).filter((k) => !before.has(k)).sort(), addedLifetime: Object.keys(s.lifetime).filter((k) => !lifetimeBefore.has(k)).sort(), meguru: JSON.stringify(s.lifetime.meguru) };
  });
  const on = scenario(false), off = scenario(true);
  assert.equal(on.ver, 5); assert.equal(on.after, 5); assert.equal(off.after, 5);
  assert.deepEqual(on.added, off.added, 'the expression lane adds no save key');
  assert.deepEqual(on.addedLifetime, off.addedLifetime, 'nor a lifetime key');
  assert.equal(on.meguru, off.meguru, 'the meguru record (talkCount etc.) is the same with and without expressions');
});

// ───────────────────────────── 14. missing asset を dev / test で 検出
test('14. strict mode detects a missing or unsupported expression picture instead of silently showing another face', () => withSeed(131, () => {
  const legacy = { key: 'form:bird:1', kind: 'form', line: 'bird', stage: 1, label: 'x', emoji: '🐦', asset: 'assets/characters/bird/02.png', sprites: { front: 'assets/characters/bird/02.png' }, region: 'forest' };
  assert.throws(() => RX.resolve(legacy, 'positive', { strict: true }), /resident expression missing: stage\/positive \(missing-variant\)/);
  assert.throws(() => RX.audit([legacy], { strict: true }), /gaps/);
  assert.equal(RX.audit([legacy]).gaps.length, RX.EMOTIONS.length - 1, 'every non-normal emotion is a gap for a picture without variants');
  assert.throws(() => RX.resolve(RESIDENTS.find((r) => r.kind === 'form'), 'furious', { strict: true }), /unknown-emotion/);
  // production(strict なし)は おなじ 住民で だまって base
  assert.equal(RX.resolve(legacy, 'positive').asset, legacy.asset);
  // せかいの なかでも: strictExpression の sim は 欠けた 住民が きもちを もった しゅんかんに throw する
  const reg = { residents: RESIDENTS.slice(0, 5).concat([legacy]), naoto: null, byRegion: (id) => reg.residents.filter((r) => r.region === id) };
  const strict = M.createSimulation({ regionId: 'forest', registry: reg, discovered: [], env: E(), strictExpression: true });
  const bad = strict.world.residents.find((q) => q.key === legacy.key);
  assert.ok(bad, 'the legacy resident is placed');
  assert.throws(() => { M.applyReaction(bad, 'positive'); for (let i = 0; i < 60; i++) strict.step(1 / 60, { x: 0, y: 0 }); }, /resident expression missing/);
  const prod = M.createSimulation({ regionId: 'forest', registry: reg, discovered: [], env: E() });
  const bad2 = prod.world.residents.find((q) => q.key === legacy.key);
  assert.doesNotThrow(() => { M.applyReaction(bad2, 'positive'); for (let i = 0; i < 60; i++) prod.step(1 / 60, { x: 0, y: 0 }); });
  assert.equal(bad2.expr.asset, legacy.asset); assert.equal(bad2.expr.fallback, 'missing-variant');
  // 既存の 全住民は strict でも 1 つも throw しない(= 欠けなし)
  const all = M.createSimulation({ regionId: 'city', registry: REGISTRY, discovered: [], env: E(), strictExpression: true });
  assert.doesNotThrow(() => { for (const a of all.world.residents) if (free(a)) { a.joy = 3; } for (let i = 0; i < 30; i++) all.step(1 / 60, { x: 0, y: 0 }); });
}));

// ───────────────────────────── 15. 既存の Expression 画像 / hash を かえない
test('15. the existing expression pictures are byte-identical (count and aggregate hash), and the resident lane adds no picture', () => {
  const walk = (dir) => { const out = []; for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) { const p = `${dir}/${e.name}`; if (e.isDirectory()) out.push(...walk(p)); else out.push(p); } return out.sort(); };
  const files = walk('assets/characters/expressions').concat(walk('assets/characters/relationship'));
  const h = crypto.createHash('sha256'); for (const f of files) { h.update(f); h.update(fs.readFileSync(path.join(ROOT, f))); }
  assert.equal(files.length, 2484 + 88);
  assert.equal(h.digest('hex'), '0eda6101ce2da61090c24317ad9947cc397b48b09cf2fb3f474ae13bd6a722a7');
  // Home の sample hash(pet-expression-assets-test と おなじ 正本)も そのまま
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'assets/characters/cat/06.png'))).digest('hex'), '8f6beedbfd82135cfc17c24d3aa5ea1869c9344f65b0a21e3950995c5768c6da');
});

// ───────────────────────────── 16. performance: emotion が かわった とき だけ resolve
test('16. expressions are resolved only when the emotion changes (object identity stays), never per frame, and the pipeline is deterministic', () => {
  const a = withSeed(137, () => {
    const sim = simFor('city');
    stepSec(sim, 2);
    const snap = new Map(sim.world.residents.map((q) => [q, { expr: q.expr, emotion: q.emotion, changes: 0, emotionChanges: 0 }]));
    for (let i = 0; i < 60 * 30; i++) {
      sim.step(1 / 60, { x: 0, y: 0 });
      for (const q of sim.world.residents) { const t = snap.get(q); if (q.expr !== t.expr) { t.changes++; t.expr = q.expr; } if (q.emotion !== t.emotion) { t.emotionChanges++; t.emotion = q.emotion; } }
    }
    let resolves = 0, emotions = 0, stable = 0;
    for (const [, t] of snap) { resolves += t.changes; emotions += t.emotionChanges; if (t.changes === 0) stable++; }
    assert.ok(resolves <= emotions + sim.world.residents.length, `resolves ${resolves} ≤ emotion changes ${emotions} + first sync`);
    assert.ok(stable > sim.world.residents.length / 3, `most residents never re-resolve in 30 s (${stable}/${sim.world.residents.length})`);
    return sim.world.residents.slice(0, 12).map((q) => [q.key, q.emotion, q.expr && q.expr.expression]);
  });
  const b = withSeed(137, () => { const sim = simFor('city'); stepSec(sim, 32); return sim.world.residents.slice(0, 12).map((q) => [q.key, q.emotion, q.expr && q.expr.expression]); });
  assert.deepEqual(a, b, 'same seed → same emotions and faces (no hidden randomness in the expression layer)');
});

// ───────────────────────────── 17. 1 か所の mapping と 契約の 形
test('17. the canonical mapping lives in one place and keeps the unused states open for the future', () => {
  assert.deepEqual([...RX.EMOTIONS], ['normal', 'positive', 'dislike', 'tired', 'sleeping', 'strained', 'wantsPlay', 'sick']);
  for (const em of M.RESIDENT_EMOTIONS) assert.ok(RX.EMOTIONS.includes(RX.canonicalEmotion(em)), `${em} maps to a canonical emotion`);
  assert.deepEqual(RX.LIFE_EMOTION.happy, 'positive'); assert.deepEqual(RX.LIFE_EMOTION.unhappy, 'dislike');
  assert.equal(RX.canonicalEmotion('nope'), 'normal');
  for (const fam of ['stage', 'relationship', 'none']) for (const em of RX.EMOTIONS) assert.ok(typeof RX.expressionFor(fam, em) === 'string');
  assert.deepEqual(RX.EXPRESSION_FOR.stage, { normal: 'normal', positive: 'happy', dislike: 'sulky', tired: 'tired', sleeping: 'sleeping', strained: 'strained', wantsPlay: 'wantsPlay', sick: 'sick' });
  // Home の 表情で めぐるが つかわない もの(将来の ため のこす): hungry / weak / critical / lonely
  const used = new Set(Object.values(RX.EXPRESSION_FOR.stage).concat(Object.values(RX.EXPRESSION_FOR.relationship)));
  for (const unused of ['hungry', 'weak', 'critical', 'lonely']) assert.ok(!used.has(unused), `${unused} stays unused`);
  assert.deepEqual(RX.EVENT_REACTION, { talk: 'positive', talk_end: 'positive', gather_end: 'positive', play_end: 'positive', talk_wake: 'dislike', talk_pester: 'dislike' });
  assert.equal(RX.talkEvent({ sleeping: true }), 'talk_wake'); assert.equal(RX.talkEvent({ sinceLastTalk: 3 }), 'talk_pester'); assert.equal(RX.talkEvent({ sinceLastTalk: 60 }), 'talk'); assert.equal(RX.talkEvent(), 'talk');
  assert.equal(RX.reactionFor('nothing'), null);
  assert.equal(RX.familyOf(RESIDENTS.find((r) => r.kind === 'form')), 'stage');
  assert.equal(RX.familyOf(RESIDENTS.find((r) => r.kind === 'companion')), 'relationship');
  assert.equal(RX.familyOf({ kind: 'naoto' }), 'none');
});
