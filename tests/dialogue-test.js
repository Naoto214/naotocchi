const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Exercise the actual game closure with an ordered clock and separate DOM nodes.
// Unlike the boot smoke test, callbacks really execute here.
let now = 1000;
let timerId = 0;
let random = 0.25;
let confirmResult = false;
let savedPayload = null;
const timers = new Map();
const elements = new Map();
const spoken = [];
const events = [];
const captions = [];
const storyCaptions = [];
const scrollRequests = [];
const confirmPrompts = [];
const savedWrites = [];
const noop = () => {};
function element(id = '') {
  const classes = new Set(['hidden']);
  const listeners = new Map();
  const target = {
    id, listeners, style: { setProperty: noop, removeProperty: noop }, dataset: {}, children: [],
    innerHTML: '', value: '', disabled: false,
    classList: {
      add: (...names) => names.forEach((n) => classes.add(n)),
      remove: (...names) => names.forEach((n) => classes.delete(n)),
      contains: (n) => classes.has(n),
      toggle: (n, force) => { const on = force ?? !classes.has(n); if (on) classes.add(n); else classes.delete(n); return on; },
    },
    addEventListener: (type, fn) => { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn); },
    removeEventListener: noop, appendChild: (child) => { target.children.push(child); return child; }, remove: noop,
    querySelector: (selector) => getElement(selector), querySelectorAll: () => [], closest: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }),
    setAttribute: noop, focus: noop,
    scrollIntoView: (options) => scrollRequests.push({id, ...options}),
  };
  let html = '';
  Object.defineProperty(target, 'innerHTML', { get: () => html, set: (value) => {
    html = value; target.children.length = 0;
  } });
  let content = '';
  Object.defineProperty(target, 'textContent', { get: () => content, set: (value) => {
    content = value;
    if (id === 'dateMovieCaption') captions.push(String(value));
    if (id === 'storyFlashText') storyCaptions.push({ text: value, at: now });
  } });
  return new Proxy(target, { get: (obj, key) => key in obj ? obj[key] : noop });
}
function getElement(id) {
  if (!elements.has(id)) elements.set(id, element(id));
  return elements.get(id);
}
function advance(ms) {
  const until = now + ms;
  let steps = 0;
  while (true) {
    const next = [...timers.entries()].filter(([, timer]) => timer.at <= until)
      .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
    if (!next) break;
    assert.ok(++steps < 10000, 'timer runaway');
    timers.delete(next[0]); now = next[1].at; next[1].fn();
  }
  now = until;
}
const masterSource = fs.readFileSync('character-world-master.v1.js', 'utf8');
const master = new Function(masterSource + '\nreturn NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;')();
const clockDate = class extends Date { static now() { return now; } };
const math = Object.create(Math); math.random = () => random;
const sandbox = {
  console, Date: clockDate, Math: math,
  document: {
    getElementById: getElement, querySelector: getElement, querySelectorAll: () => [], createElement: () => element(),
    addEventListener: noop, body: element('body'), documentElement: element('html'), visibilityState: 'visible',
  },
  window: { addEventListener: noop, innerWidth: 390, innerHeight: 844,
    confirm: (prompt) => { confirmPrompts.push(prompt); return confirmResult; }, NAOTOCCHI_CHARACTER_WORLD_MASTER_V1: master },
  localStorage: { getItem: () => savedPayload,
    setItem: (key, value) => { if (key === 'naotocchi-save-v1') savedWrites.push(value); }, removeItem: noop },
  navigator: { userAgent: 'dialogue-test', maxTouchPoints: 1 },
  performance: { now: () => now }, requestAnimationFrame: () => 1, cancelAnimationFrame: noop,
  setInterval: () => 1, clearInterval: noop,
  setTimeout: (fn, delay = 0) => { const id = ++timerId; timers.set(id, { fn, at: now + delay }); return id; },
  clearTimeout: (id) => timers.delete(id),
  location: { href: 'https://naoto214.github.io/naotocchi/' }, crypto: { getRandomValues: (a) => a },
  __spoken: spoken, __events: events, __clock: () => now,
};
const source = fs.readFileSync('games.js', 'utf8') + '\n' + fs.readFileSync('script.js', 'utf8');
sandbox.window.NaotocchiCast = require('../cast-layout.js');
sandbox.window.NaotocchiCastMotion = require('../cast-motion.js');
sandbox.window.NaotocchiEnvironment = require('../world-environment.js');
const expose = `
  const realSpeech = setSpeechBubble;
  setSpeechBubble = (text, speaker) => {
    if (text && speaker) __spoken.push({ text, speaker, at: __clock() });
    return realSpeech(text, speaker);
  };
  const realEvent = speakEvent;
  speakEvent = (key, ctx) => { __events.push(key); return realEvent(key, ctx); };
  globalThis.dialogue = {
    speakEvent, pickConversationLine, pickCharacterConversationLine, partnerDailyLine, companionSpeaker,
    clearConversationTimers, conversationIsBusy, scheduleIdleGreeting, playMarriageMovie, playLegendEncounterMovie,
    maybeLegendEncounter, loop,
    finishDateMovie, celebrateAgeSpeech, finishMinigame, partnerAnniversaryLine,
    gainSodachi, onSodachiMilestone, travelToRegion, findRegion, chooseTransform,
    CONVERSATION_POOLS, PARTNER_DAILY_REACTIONS, PARTNER_CHARACTER_IDLE_LINES,
    COMPANION_DAILY_REACTIONS, COMPANION_CHARACTER_IDLE_LINES, PARTNER_RELATIONSHIP_LINES,
    PARTNER_IDLE_LINES, COMPANION_IDLE_LINES, ALL_PARTNER_CANDIDATES,
    stageDesc, SPECIES, SPECIES_STAGE_DESCS, DATE_PLANS, DATE_PLAN_VARIATIONS, DEEPSEA_DATE_PLANS,
    PARTNER_ANNIVERSARY_LINES, FUN_ITEMS, PARTNER_FIRST_ENCOUNTERS,
    datePlanForRegion, goOnDate, playFunScene, useItem, pickMemoryGreeting, playFirstPartnerEncounter, buildLifeCard,
    hatchEgg, triggerDeath, enterFarewell, openExclusiveMenu, openDateChooser, closeDateOverlay, checkAchievements,
    loadState, COMPANIONS, RARE_COMPANIONS, allCompanionsById, canonicalCompanionId,
    hasAllCurrentCompanions, companionDexEntries, companionVisualHTML, renderCompanionRow, renderCompanionDex,
    renderRareCompanionDex, rareCompanionDexEntries, renderProfile, openCompanionInvite, scheduleCompanionEncounter, renderDuelFinalStage,
    renderDuelQuestionStep, renderDuelAnswerReviewStep, renderDuelGuessListStep, renderDuelSuspicionStep,
    revealSavedDuel: (d) => { duelRevealIndex = 0; duelRevealPhase = 'revealed'; renderDuelRevealCard(d); },
    partnerVisualHTML, renderPartnerCompanion, renderPartnerDex,
    isAuthorUnlocked, authorVisualHTML, showAuthorGreeting, renderNaotoItemGrid,
    renderEnding, checkGrandGoals, getEndingTier, ALL_LINES, STAGES_PER_LINE, ACHIEVEMENTS, buildMinigamePool,
    pendingGoal: () => grandGoalPending,
    getState: () => state, recent: () => [...recentConversationLines],
    reset: (patch) => {
      clearConversationTimers(); clearDateMovieTimers(); hideSpeechBubble(); closeAllMenuOverlays();
      state = Object.assign(freshState(), {
        stage: STAGE.GROWING, speciesLine: WORLD_MASTER.playerSpecies.normal[0].id,
        stageIndex: stageForAge(25), ageTicks: 25 * AGE_TICKS_PER_YEAR, sodachi: 55, maxSodachi: 55,
        hunger: 50, energy: 90, happiness: 80, health: 100,
      }, patch);
      recentConversationLines = []; message = ''; gameActive = false; dateOpen = false;
      lastDatePlanId = null; dateChoiceOptions = [];
      grandGoalPending = null; pendingCompanionId = null;
      endingCelebrationShown = false;
      clearTimeout(storyFlashTimer); el.storyFlash.classList.add('hidden'); el.storyFlashEmoji.innerHTML = '';
      lastMemoryRecallKey = null;
    },
  };
`;
assert.ok(/\}\)\(\);\s*$/.test(source), 'game closure missing');
vm.runInNewContext(source.replace(/\}\)\(\);\s*$/, expose + '\n})();'), sandbox);
const api = sandbox.dialogue;
function reset(patch = {}) {
  api.reset(patch); timers.clear(); spoken.length = 0; events.length = 0; captions.length = 0;
  random = 0.25;
  confirmResult = false; storyCaptions.length = 0;
  scrollRequests.length = 0;
  confirmPrompts.length = 0; savedWrites.length = 0;
}
function partner(id = 'robot_neighbor', extra = {}) {
  const candidate = api.ALL_PARTNER_CANDIDATES.find((p) => p.id === id);
  assert.ok(candidate, id);
  return { ...candidate, affection: 100, married: false, bondCount: 0, ...extra };
}
function click(id, event = {}) {
  const handlers = getElement(id).listeners.get('click') || [];
  assert.ok(handlers.length, 'missing click handler: ' + id);
  handlers.forEach((fn) => fn({ preventDefault: noop, target: element(), ...event }));
}
function validSpeech() {
  for (const beat of spoken) {
    assert.equal(typeof beat.text, 'string');
    assert.ok(beat.text.trim());
    assert.ok(!/undefined|\{age\}|\{sodachi\}|\{coins\}/.test(beat.text), beat.text);
    assert.ok(['pet', 'partner', 'companion'].includes(beat.speaker.kind));
  }
}

// All requested event pools, with four real timed beats and a full last beat.
for (const key of Object.keys(api.CONVERSATION_POOLS)) {
  reset({ partner: partner(), companions: [{ id: 'otter', bond: 100 }] });
  api.speakEvent(key, { age: 37, sodachi: 70, coins: 123, partnerChance: 1, companionChance: 1 });
  advance(0); assert.equal(spoken.length, 1, key);
  assert.equal(getElement('speechBubble').classList.contains('hidden'), false);
  advance(2499); assert.equal(spoken.length, 1, key);
  advance(5001);
  assert.deepEqual(spoken.map((b) => b.speaker.kind), ['pet', 'partner', 'companion', 'pet'], key);
  assert.deepEqual(spoken.map((b, i) => b.at - spoken[0].at), [0, 2500, 5000, 7500], key);
  assert.equal(spoken[2].speaker.id, 'otter'); validSpeech();
  advance(2499); assert.equal(getElement('speechBubble').classList.contains('hidden'), false, key);
  advance(1); assert.equal(getElement('speechBubble').classList.contains('hidden'), true, key);
  assert.equal(api.conversationIsBusy(), false, key);
}

// Missing/legacy speakers fall back; no ghost speakers or undefined lines.
for (const patch of [{}, { partner: { id: 'guest', label: 'ゲスト', emoji: '⭐' } }, { companions: [{ id: 'retired_unknown' }] }]) {
  reset(patch); api.speakEvent('feed', { partnerChance: 1, companionChance: 1 }); advance(10000); validSpeech();
  assert.equal(spoken.filter((b) => b.speaker.kind === 'companion').length, 0);
}
reset(); assert.equal(api.pickConversationLine([]), null); assert.equal(api.pickConversationLine(undefined), null);
assert.equal(api.pickConversationLine(['おはよう!']), 'おはよう!');
assert.equal(api.pickConversationLine(['おはよう！', '別の話']), '別の話', 'punctuation-only repetition');
for (let i = 0; i < 40; i++) api.pickConversationLine(['行' + i]);
assert.equal(api.recent().length, 24);

// A new action cancels every future line of the previous conversation.
reset({ partner: partner(), companions: [{ id: 'otter' }] });
api.speakEvent('feed', { petText: '古い会話', partnerChance: 1, companionChance: 1 }); advance(0);
api.speakEvent('clean', { petText: '新しい会話', partnerChance: 0, companionChance: 0 }); advance(10000);
assert.deepEqual(spoken.map((b) => b.text), ['古い会話', '新しい会話']);

// Every canonical character has reachable individual lines; idle lines share recency.
for (const def of master.partners) {
  reset({ partner: partner(def.id) });
  for (const key of ['play_with', 'medicine_cure', 'travel', 'minigame_great', 'minigame_bad']) {
    const first = api.partnerDailyLine(key); const second = api.partnerDailyLine(key);
    assert.notEqual(first, second, def.id + ': ' + key); assert.ok(first && second);
  }
  const lines = api.PARTNER_CHARACTER_IDLE_LINES[def.id]; assert.ok(lines.length >= 3);
  const first = api.pickCharacterConversationLine(lines, api.PARTNER_IDLE_LINES);
  assert.notEqual(first, api.pickCharacterConversationLine(lines, api.PARTNER_IDLE_LINES));
  for (const key of ['partner_new', 'marriage']) {
    reset({ partner: partner(def.id) }); api.speakEvent(key, { partnerChance: 1, companionChance: 0 }); advance(2500);
    const expected = api.PARTNER_RELATIONSHIP_LINES[def.id][key === 'partner_new' ? 'court' : 'marriage'];
    assert.equal(spoken[1].speaker.kind, 'partner'); assert.equal(spoken[1].text, expected);
    assert.notEqual(spoken[0].text, expected, 'partner line attributed to pet');
  }
}
for (const def of [...master.companions.normal, ...master.companions.rare]) {
  reset({ companions: [{ id: def.id }] });
  assert.equal(api.companionSpeaker().id, def.id);
  assert.ok(api.COMPANION_CHARACTER_IDLE_LINES[def.id].length >= 3, def.id + ': idle variants reduced');
  for (const key of ['feed', 'play_with', 'travel', 'minigame_great', 'minigame_bad']) {
    const lines = api.COMPANION_DAILY_REACTIONS[def.id][key];
    assert.ok(lines.includes(api.pickCharacterConversationLine(lines, api.CONVERSATION_POOLS[key].companion)));
  }
}

// Real button handlers: normal/blocked food, clean, sleep/wake, medicine and play.
const actions = [
  ['feed', 'feedBtn', {}], ['overfeed', 'feedBtn', { hunger: 95 }],
  ['clean', 'cleanBtn', { poopCount: 2 }], ['sleep', 'sleepBtn', {}], ['wake', 'sleepBtn', { isSleeping: true }],
  ['medicine_cure', 'medicineBtn', { isSick: true, sicknessType: 'かぜ' }],
  ['medicine_wrong', 'medicineBtn', {}], ['play_with', 'playWithBtn', {}],
  ['play_with_annoyed', 'playWithBtn', { affectionStreak: 20 }],
];
for (const [key, id, patch] of actions) {
  reset(patch); click(id); advance(0); assert.ok(events.includes(key), key + ' handler unreachable'); validSpeech();
}
for (const [score, key] of [[90, 'minigame_great'], [10, 'minigame_bad']]) {
  reset(); api.finishMinigame(score); advance(0); assert.ok(events.includes(key)); validSpeech();
}
reset(); api.celebrateAgeSpeech(37); advance(0); assert.ok(events.includes('age')); validSpeech();
for (const [key, fire] of [
  ['sodachi', () => api.gainSodachi(1)], ['money', () => api.onSodachiMilestone(40)],
  ['travel', () => api.travelToRegion(api.findRegion('forest'))],
  ['transform', () => { const target = master.playerSpecies.normal[1].id; api.getState().transformOptions = [target]; api.chooseTransform(target); }],
]) {
  reset(); fire(); advance(0); assert.ok(events.includes(key), key + ' event path'); validSpeech();
}
for (const [value, key] of [[0, 'partner_new'], [0.99, 'court_fail']]) {
  reset({ regionId: 'city', gender: 'female', attractedTo: ['female', 'male', 'nonbinary'] });
  api.getState().lifetime.partnerEncounters = api.ALL_PARTNER_CANDIDATES.map((p) => p.id);
  random = value; click('courtBtn'); advance(2500); assert.ok(events.includes(key), key + ' court path'); validSpeech();
  if (key === 'partner_new') {
    const relation = api.PARTNER_RELATIONSHIP_LINES[api.getState().partner.id].court;
    assert.equal(spoken[1].text, relation); assert.equal(spoken[1].speaker.kind, 'partner');
  }
}

// Actual existing-partner court/marriage handlers must also respect speaker ownership.
for (const [bondCount, key] of [[0, 'court'], [100, 'marriage']]) {
  reset({ partner: partner('robot_neighbor', { bondCount }) }); click('courtBtn'); advance(2500);
  assert.ok(events.includes(key)); validSpeech();
  if (key === 'marriage') assert.equal(spoken[1].text, api.PARTNER_RELATIONSHIP_LINES.robot_neighbor.marriage);
}

// Legend movies used to throw ReferenceError before the first caption.
// Both complete stories per legend must finish, keep the reward beat and support skip.
for (const id of ['gate', 'stairs', 'boss', 'lamp', 'mirror']) for (const value of [0, 0.99]) {
  reset(); random = value;
  api.speakEvent('feed'); advance(0);
  getElement('dateMoviePet').innerHTML = '';
  api.playLegendEncounterMovie({ id, emoji: '⭐', flash: '発見', story: '出会い' }, 17);
  assert.ok(getElement('dateMoviePet').innerHTML.includes('src="assets/characters/man/06.png"'),
    id + ': legend movie must show the current player PNG');
  assert.ok(scrollRequests.some(r=>r.id==='dateMovie'&&r.block==='nearest'),
    id + ': bring the movie into view after a scrolled care action');
  assert.equal(getElement('speechBubble').classList.contains('hidden'), true);
  const speechCount = spoken.length; advance(35000);
  assert.equal(spoken.length, speechCount, 'conversation leaked into movie');
  assert.ok(captions.length >= 6); assert.ok(captions.at(-1).includes('17'));
  assert.equal(getElement('dateMovieCloseBtn').classList.contains('hidden'), false);
  assert.equal(getElement('dateMovieSkipBtn').classList.contains('hidden'), true);
}
reset(); api.playLegendEncounterMovie({ id: 'boss', emoji: '🦑' }, 17); api.finishDateMovie();
const skippedAt = captions.length; advance(35000); assert.equal(captions.length, skippedAt, 'skip left captions queued');
// Use the selected species/stage, while keeping old saves without art playable.
reset({speciesLine:'sakura',stageIndex:0});
api.playLegendEncounterMovie({id:'mirror',emoji:'🪞'},17);
assert.ok(getElement('dateMoviePet').innerHTML.includes('src="assets/characters/sakura/01.png"'));
reset({speciesLine:'rabbit',stageIndex:4});
api.playLegendEncounterMovie({id:'gate',emoji:'⛩️'},17);
assert.match(getElement('dateMoviePet').innerHTML, /emoji-only/);
assert.ok(!getElement('dateMoviePet').innerHTML.includes('<img'));
assert.equal(api.getState().speciesLine, 'rabbit');

// The real scheduler must respect blocked scenes and grant a legend only once.
// These are ordered-clock unit regressions, separate from browser observation.
const legendReady = {sodachi:95,maxSodachi:95,legendMet:false};
for (const [name, patch] of [
  ['growth below 90',{sodachi:89,maxSodachi:89}],
  ['already met',{legendMet:true}],
  ['free mode',{infinite:true}],
  ['egg',{stage:'egg'}],
  ['sleeping',{isSleeping:true}],
  ['transformation choice',{transformOptions:['man']}],
]) {
  reset({...legendReady,...patch});random=0;
  const money=api.getState().lifetime.money;
  api.maybeLegendEncounter();
  assert.equal(captions.length,0,name+': legend interrupted a blocked scene');
  assert.equal(api.getState().lifetime.money,money,name+': blocked event granted coins');
}
for (const menu of ['dex','ach','theme','profile','comm','item','world']) {
  reset(legendReady);api.openExclusiveMenu(menu);random=0;
  const age=api.getState().ageTicks;
  api.maybeLegendEncounter();api.loop();
  assert.equal(captions.length,0,menu+': legend interrupted a menu');
  assert.equal(api.getState().ageTicks,age,menu+': time advanced behind a menu');
}
reset(legendReady);random=0.012;api.maybeLegendEncounter();
assert.equal(captions.length,0,'non-winning roll triggered legend');
for (const id of ['gate','stairs','boss','lamp','mirror']) {
  reset(legendReady);
  api.getState().lifetime.legendsMet=['gate','stairs','boss','lamp','mirror'].filter(x=>x!==id);
  const initialMoney=api.getState().lifetime.money;
  random=0;api.maybeLegendEncounter();
  assert.ok(api.getState().legendMet);
  assert.equal(api.getState().lifetime.legendsMet.at(-1),id,'unseen legend not selected');
  const awardedMoney=api.getState().lifetime.money;
  assert.ok(awardedMoney>initialMoney,'legend coins missing');
  const pausedAge=api.getState().ageTicks;
  api.loop();
  assert.equal(api.getState().ageTicks,pausedAge,'movie must pause the life clock');
  click('dateMovieSkipBtn');
  assert.equal(getElement('dateMovieCloseBtn').classList.contains('hidden'),false,'Skip did not expose Close');
  assert.equal(getElement('dateMovieSkipBtn').classList.contains('hidden'),true,'Skip stayed visible');
  const skippedCaptions=captions.length;
  advance(35000);
  assert.equal(captions.length,skippedCaptions,'Skip handler left captions scheduled');
  click('dateMovieCloseBtn');
  const captionCount=captions.length;
  api.maybeLegendEncounter();advance(35000);
  assert.equal(captions.length,captionCount,'skipped legend left captions or replayed');
  assert.equal(api.getState().lifetime.money,awardedMoney,'legend paid twice');
  assert.equal(getElement('dateOverlay').classList.contains('hidden'),true);
}
console.log('LEGEND SCHEDULER TEST OK: 6 blocked states; 7 paused menus; non-winning roll; 5 unseen legends; pause, skip, close and single reward.');

for (const years of [1, 10, 25, 50]) for (const mismatch of [false, true]) for (const value of [0, 0.99]) {
  reset({ partner: partner('robot_neighbor', { married: true }), lifeLog: mismatch ? [{ text: 'なかなおりした' }] : [] });
  random = value; api.playMarriageMovie({ years, icon: '💐', title: '記念日' }); advance(35000);
  assert.ok(captions.length >= 5); assert.ok(!captions.some((x) => /undefined|ワイ|ホンマ|やで/.test(x)));
  if (value === 0.99) assert.ok(captions.some((x) => mismatch ? x.includes('あのときはごめんね') : x.includes('おやつがおいしかった')), 'shared memory unreachable');
  assert.equal(getElement('dateMovieCloseBtn').classList.contains('hidden'), false);
}
console.log('DIALOGUE TEST OK: 20 events; 18 partners; 26 companions; action handlers; 2500ms timing; cancellation; recency; 10 legend stories; 16 anniversary cases.');

// Every current form has its own description, including new master species.
const currentSpecies = [...master.playerSpecies.normal, ...master.playerSpecies.rare, ...master.playerSpecies.secret];
const descriptions = [];
for (const def of currentSpecies) {
  assert.equal(api.SPECIES[def.id].stages.length, def.stages.length, def.id);
  for (let i = 0; i < def.stages.length; i++) {
    const text = api.stageDesc(def.id, i);
    assert.ok(text && text.trim(), def.id + ':' + i + ' empty dex description');
    assert.ok(!/undefined|TODO/.test(text), text); descriptions.push(text);
  }
}
assert.equal(descriptions.length, 248);
assert.equal(new Set(descriptions).size, descriptions.length, 'identical descriptions across forms');
// Existing save IDs still have all eight descriptions.
for (const id of ['bird', 'rabbit', 'fish', 'panda', 'fox', 'owl', 'plant', 'robot', 'dinosaur', 'mermaid', 'unicorn']) {
  assert.ok(api.SPECIES_STAGE_DESCS[id], id + ' lost legacy descriptions');
  assert.equal(api.SPECIES_STAGE_DESCS[id].filter(Boolean).length, 8, id);
}

// Show every ordinary plan line, including all three variants, through the real date path.
for (const plan of api.DATE_PLANS) for (const value of [0, 0.5, 0.999]) {
  reset({ partner: partner() }); random = value;
  api.speakEvent('feed'); advance(0);
  const before = spoken.length;
  api.goOnDate(plan); advance(20000);
  assert.equal(spoken.length, before, 'old care speech leaked into a date');
  assert.equal(captions.length, 4, plan.id);
  const lines = [plan.line, ...api.DATE_PLAN_VARIATIONS[plan.id]];
  assert.equal(captions[1], lines[Math.floor(value * lines.length)], plan.id);
  assert.ok(!captions.some((text) => /undefined|へ。/.test(text)), plan.id);
  assert.equal(api.getState().datesThisLife, 1);
  assert.equal(api.getState().partner.bondCount, 0, 'date changed marriage progress');
  assert.equal(getElement('dateMovieCloseBtn').classList.contains('hidden'), false);
}
for (const plan of api.DATE_PLANS) {
  reset({ partner: partner('anglerfish'), regionId: 'deepsea' });
  const local = api.datePlanForRegion(plan);
  api.goOnDate(plan); advance(20000);
  if (api.DEEPSEA_DATE_PLANS[plan.id]) {
    assert.notEqual(local.label, plan.label);
    assert.ok([local.line, ...local.variations].includes(captions[1]));
    assert.ok(!captions.slice(0, 2).some((s) => /ゆうやけ|あめやどり|ひなたぼっこ|流れ星/.test(s)));
  }
}
// A browser may suppress native confirm and return false. The reward decision
// must remain visible in the game, before any date effects or consumption.
for (const deepsea of [false, true]) {
  reset({ partner:partner(deepsea ? 'anglerfish' : 'robot_neighbor'),
    regionId:deepsea ? 'deepsea' : 'home', items:{reward:1} });
  const before = JSON.stringify(api.getState());
  click('worldDateBtn');
  const chosen = getElement('dateChoiceGrid').children[0];
  click('dateChoiceGrid', {target:{closest:s => s === '.date-choice-btn' ? chosen : null}});
  assert.equal(getElement('dateRewardConfirm').classList.contains('hidden'), false,
    'reward confirmation must be visible even when native confirm returns false');
  assert.equal(confirmPrompts.length, 0, 'date must not depend on native confirm');
  assert.equal(JSON.stringify(api.getState()), before, 'date committed before reward choice');
  assert.equal(captions.length, 0, 'movie started before reward choice');
  api.loop();
  assert.equal(JSON.stringify(api.getState()), before, 'reward choice did not pause care');
  click('dateRewardUseBtn');
  click('dateRewardUseBtn');
  assert.equal(api.getState().items.reward || 0, 0, 'reward was not consumed once');
  assert.equal(api.getState().datesThisLife, 1, 'double tap started a second date');
  assert.equal(getElement('dateRewardConfirm').classList.contains('hidden'), true);
  assert.equal(getElement('dateMovieScene').classList.contains('special-reward'), true);
  advance(28500);
  assert.equal(captions.length, 7, 'special date did not finish all seven captions');
  click('dateMovieCloseBtn');
  assert.equal(getElement('dateOverlay').classList.contains('hidden'), true);
}
for (const accept of [false, true]) {
  reset({ partner: partner(), items: { reward: 1 } }); confirmResult = accept;
  api.goOnDate(api.DATE_PLANS[0]);
  click(accept ? 'dateRewardUseBtn' : 'dateRewardSkipBtn'); advance(35000);
  assert.equal(captions.length, accept ? 7 : 4);
  assert.equal(api.getState().items.reward || 0, accept ? 0 : 1);
  assert.equal(api.getState().lifeLog.filter((r) => r.text.startsWith('とくべつなデートのおもいで:')).length, accept ? 1 : 0);
  api.finishDateMovie(); advance(35000);
  assert.equal(api.getState().items.reward || 0, accept ? 0 : 1, 'reward consumed twice');
}
reset({ partner: partner() }); confirmResult = true;
api.goOnDate(api.DATE_PLANS[0]); api.finishDateMovie();
const dateSkipCount = captions.length; advance(35000);
assert.equal(captions.length, dateSkipCount, 'skipped date still changes captions');
assert.equal(api.getState().items.reward || 0, 0, 'missing reward underflow');

// BQ: exercise the actual chooser/skip/close handlers, not finishDateMovie directly.
// Catches a missing consumption/save, ignored reward choice, broken ring branch,
// lingering captions, or failure to resume the clock after returning to care.
function assertDateReturned(expectedAge, expectedCooldown, label) {
  assert.equal(getElement('dateOverlay').classList.contains('hidden'), true, label + ': overlay stayed open');
  assert.equal(getElement('dateMovie').classList.contains('hidden'), true, label + ': movie stayed visible');
  assert.equal(getElement('dateChooser').classList.contains('hidden'), false, label + ': chooser not reset');
  const count = captions.length;
  advance(35000);
  assert.equal(captions.length, count, label + ': captions continued after close');
  api.loop();
  assert.equal(api.getState().ageTicks, expectedAge + 1, label + ': care clock did not resume');
  assert.equal(api.getState().dateCooldownTicks, expectedCooldown - 1, label + ': cooldown did not resume');
}
for (const testCase of [
  { name:'accept-one', reward:1, accept:true, remaining:0, beats:7, skip:false },
  { name:'accept-two-skip', reward:2, accept:true, remaining:1, beats:7, skip:true },
  { name:'decline', reward:1, accept:false, remaining:1, beats:4, skip:false },
  { name:'no-reward', reward:0, accept:true, remaining:0, beats:4, skip:false },
  { name:'deepsea-ring', reward:1, accept:true, remaining:0, beats:7, skip:false, deepsea:true, ring:true },
  { name:'deepsea-ordinary', reward:0, accept:false, remaining:0, beats:4, skip:false, deepsea:true },
]) {
  const { name, reward, accept, remaining, beats, skip, deepsea, ring } = testCase;
  reset({ partner:partner(deepsea ? 'anglerfish' : 'robot_neighbor', { married:true }),
    gender:'male', orientationId:'pan', attractedTo:['male','female','nonbinary'],
    marriageMilestonesSeen:[1,10,25,50], legendMet:true, datesThisLife:2,
    regionId:deepsea ? 'deepsea' : 'home', items:reward ? {reward} : {} });
  api.getState().lifetime.money = 123456789;
  if (ring) api.getState().lifetime.ownedNaotoItems = ['naoto_ring'];
  confirmResult = accept;
  const age = api.getState().ageTicks;
  click('worldDateBtn');
  assert.equal(getElement('dateOverlay').classList.contains('hidden'), false, name + ': chooser did not open');
  const choices = getElement('dateChoiceGrid').children;
  assert.equal(choices.length, 3, name + ': missing rendered choices');
  assert.equal(new Set(choices.map(button => button.dataset.plan)).size, 3);
  api.loop();
  assert.equal(api.getState().ageTicks, age, name + ': chooser did not pause clock');
  const selected = choices[0];
  click('dateChoiceGrid', {target:{closest:selector => selector === '.date-choice-btn' ? selected : null}});
  assert.equal(getElement('dateRewardConfirm').classList.contains('hidden'), !reward, name + ': incorrect reward prompt');
  if (reward) click(accept ? 'dateRewardUseBtn' : 'dateRewardSkipBtn');
  assert.equal(confirmPrompts.length, 0, name + ': native prompt called');
  assert.equal(api.getState().items.reward || 0, remaining, name + ': incorrect reward consumption');
  assert.equal(api.getState().datesThisLife, 3, name + ': wrong date count');
  assert.equal(api.getState().lifetime.datesEnjoyed, 1, name + ': lifetime date counted twice');
  assert.equal(api.getState().lifetime.money, 123456789, name + ': date spent coins');
  const special = beats === 7;
  assert.equal(getElement('dateMovieScene').classList.contains('special-reward'), special);
  assert.equal(getElement('dateMovieScene').dataset.plan, special ? 'special' : selected.dataset.plan);
  assert.equal(getElement('dateMoviePlace').textContent.startsWith('🎁'), special);
  assert.match(getElement('dateMoviePet').innerHTML, /assets\/characters\/man\/06\.png/);
  assert.ok(getElement('dateMoviePartner').innerHTML.includes('assets/characters/partners/' + (deepsea ? 'anglerfish' : 'robot_neighbor') + '.png'));
  const specialMemories = () => api.getState().lifeLog.filter(entry => entry.text.startsWith('とくべつなデートのおもいで:')).length;
  assert.equal(specialMemories(), special ? 1 : 0);
  assert.ok(savedWrites.length > 0, name + ': no saved state');
  savedPayload = savedWrites.at(-1);
  const loaded = api.loadState(); savedPayload = null;
  assert.equal(loaded.items.reward || 0, remaining, name + ': consumed reward returned after loading');
  assert.equal(loaded.datesThisLife, 3, name + ': date not persisted');
  assert.equal(loaded.lifetime.money, 123456789);
  assert.equal(loaded.partner.id, deepsea ? 'anglerfish' : 'robot_neighbor');
  assert.equal(loaded.lifeLog.filter(entry => entry.text.startsWith('とくべつなデートのおもいで:')).length, special ? 1 : 0);
  const cooldown = api.getState().dateCooldownTicks;
  assert.equal(cooldown, 60);
  api.loop();
  assert.equal(api.getState().ageTicks, age, name + ': movie did not pause clock');
  assert.equal(api.getState().dateCooldownTicks, cooldown, name + ': movie reduced cooldown');
  if (skip) {
    advance(8000); click('dateMovieSkipBtn');
    const count = captions.length;
    advance(35000);
    assert.equal(captions.length, count, name + ': skipped movie restarted before close');
  } else {
    const step = special ? 4000 : 3500;
    assert.equal(captions.length, 1);
    for (let beat = 1; beat < beats; beat += 1) {
      advance(step - 1); assert.equal(captions.length, beat, name + ': caption arrived early');
      advance(1); assert.equal(captions.length, beat + 1, name + ': caption missing at boundary');
    }
    if (ring) assert.match(captions[4], /💍/);
    else if (special) assert.match(captions[4], /しゃしん/);
    assert.ok(captions.every(text => text.trim() && !/undefined|\[object Object\]/.test(text)));
    advance(step + 499);
    assert.equal(getElement('dateMovieCloseBtn').classList.contains('hidden'), true, name + ': ending appeared early');
    advance(1);
  }
  assert.equal(getElement('dateMovieCloseBtn').classList.contains('hidden'), false);
  assert.equal(getElement('dateMovieSkipBtn').classList.contains('hidden'), true);
  click('dateMovieCloseBtn');
  assertDateReturned(age, cooldown, name);
  assert.equal(api.getState().items.reward || 0, remaining, name + ': close consumed reward again');
  assert.equal(specialMemories(), special ? 1 : 0, name + ': close duplicated memory');
  click('worldDateBtn');
  assert.equal(getElement('dateOverlay').classList.contains('hidden'), true, name + ': cooldown allowed a second date');
  assert.equal(api.getState().datesThisLife, 3);
  assert.equal(confirmPrompts.length, 0, name + ': cooldown prompted for reward again');
}
// Back/escape, cancel and a later visit must not reuse the pending decision.
for (const escape of [false, true]) {
  reset({partner:partner(),items:{reward:1}});
  const before = JSON.stringify(api.getState());
  click('worldDateBtn');
  const chosen = getElement('dateChoiceGrid').children[0];
  click('dateChoiceGrid', {target:{closest:s => s === '.date-choice-btn' ? chosen : null}});
  if (escape) {
    const handlers = getElement('dateRewardConfirm').listeners.get('keydown') || [];
    assert.ok(handlers.length, 'reward prompt has no escape handler');
    handlers.forEach(fn => fn({key:'Escape',preventDefault:noop}));
  } else click('dateRewardBackBtn');
  assert.equal(getElement('dateRewardConfirm').classList.contains('hidden'), true);
  assert.equal(getElement('dateChooser').classList.contains('hidden'), false);
  click('dateRewardUseBtn');
  assert.equal(JSON.stringify(api.getState()), before, 'stale reward confirmation started a date');
  click('dateCancelBtn');
  assert.equal(JSON.stringify(api.getState()), before, 'cancelled reward choice changed the save');
  click('worldDateBtn');
  assert.equal(getElement('dateRewardConfirm').classList.contains('hidden'), true);
  assert.equal(captions.length, 0);
}
reset({partner:partner(),items:{reward:1}});
const beforeCancelledDate = JSON.stringify(api.getState());
click('worldDateBtn'); click('dateCancelBtn'); advance(35000);
assert.equal(JSON.stringify(api.getState()), beforeCancelledDate, 'cancelled chooser changed saved game');
assert.equal(captions.length, 0, 'cancelled chooser started a movie');
assert.equal(confirmPrompts.length, 0, 'cancelled chooser prompted for reward');
assert.equal(getElement('dateOverlay').classList.contains('hidden'), true, 'cancelled chooser stayed open');
assert.equal(getElement('dateMovie').classList.contains('hidden'), true, 'cancelled chooser showed movie');
assert.equal(getElement('dateChooser').classList.contains('hidden'), false, 'cancelled chooser was not reset');
api.loop();
assert.equal(api.getState().ageTicks, JSON.parse(beforeCancelledDate).ageTicks + 1, 'cancelled chooser did not resume clock');
assert.equal(api.getState().dateCooldownTicks, 0, 'cancelled chooser started cooldown');
assert.equal(api.getState().datesThisLife, 0, 'cancelled chooser counted a date');
assert.equal(api.getState().items.reward, 1, 'cancelled chooser consumed reward');

// Every deep-sea plan's three opening-line branches must reach the final beat
// and return; the localized memory must never revert to the land activity.
const deepseaObservedLines = new Map();
for (const plan of api.DATE_PLANS) for (const value of [0, 0.5, 0.999]) {
  reset({partner:partner('anglerfish',{married:true}),regionId:'deepsea',datesThisLife:2,
    legendMet:true,marriageMilestonesSeen:[1,10,25,50]}); random = value;
  const age = api.getState().ageTicks;
  api.goOnDate(plan); advance(14500);
  assert.equal(captions.length, 4, 'deepsea ' + plan.id + ': incomplete movie');
  if (!deepseaObservedLines.has(plan.id)) deepseaObservedLines.set(plan.id, new Set());
  deepseaObservedLines.get(plan.id).add(captions[1]);
  assert.ok(captions.every(text => text.trim() && !/undefined|\[object Object\]/.test(text)));
  if (['walk','sunset','nap','rain','star'].includes(plan.id)) {
    assert.ok(!captions.slice(0,2).some(text => /ゆうやけ|あめやどり|ひなたぼっこ|流れ星/.test(text)), plan.id + ': land activity leaked underwater');
  }
  const memoryNeedle = {sunset:'光るさかな',rain:'岩かげ',star:'海の中で小さな光'}[plan.id];
  if (memoryNeedle) assert.ok(api.getState().lifeLog.some(entry => entry.text.startsWith('デートのおもいで:') && entry.text.includes(memoryNeedle)), plan.id + ': regional memory missing');
  assert.equal(getElement('dateMovieCloseBtn').classList.contains('hidden'), false);
  click('dateMovieCloseBtn');
  assertDateReturned(age, 60, 'deepsea ' + plan.id);
}
for (const [id, lines] of deepseaObservedLines) assert.equal(lines.size, 3, 'deepsea ' + id + ': opening branches collapsed');
console.log('DATE LIFECYCLE TEST OK: in-game reward choice with native dialogs suppressed; accept/decline/absent; double tap, back, escape and cancel; persisted rewards and memories; ring; real skip/close; pause/resume/cooldown; 30 complete deepsea branches.');
for (const def of master.partners) {
  reset({ partner: partner(def.id, { married: true }) });
  const lines = api.PARTNER_ANNIVERSARY_LINES[def.id];
  assert.equal(lines.length, 2);
  const first = api.partnerAnniversaryLine(api.getState().partner, 10);
  assert.ok(lines.includes(first));
  assert.notEqual(first, api.partnerAnniversaryLine(api.getState().partner, 10));
}

// Items use the same clock, recency and speaker ownership as everyday dialogue.
for (const item of api.FUN_ITEMS) {
  reset({ partner: partner(), companions: [{ id: 'otter' }], items: { [item.id]: 1 } });
  api.useItem(item.id); advance(0);
  assert.equal(api.conversationIsBusy(), true);
  advance(7500); validSpeech();
  assert.deepEqual(spoken.map((b) => b.speaker.kind), ['pet', 'partner', 'companion']);
  for (const beat of spoken) assert.ok(item[beat.speaker.kind + 'Lines'].includes(beat.text));
  assert.equal(api.getState().items[item.id] || 0, 0);
  assert.equal(api.getState().lifetime.consumablesUsed, 1);
  assert.equal(api.conversationIsBusy(), false);
  const before = spoken.length; api.useItem(item.id); advance(10000);
  assert.equal(spoken.length, before, 'empty item replayed');
  reset(); api.playFunScene(item); advance(10000);
  assert.deepEqual(spoken.map((b) => b.speaker.kind), ['pet']);
}
for (const stop of [() => click('feedBtn'), () => api.openExclusiveMenu('dex'), () => api.openDateChooser(), () => api.triggerDeath(), () => api.enterFarewell()]) {
  reset({ partner: partner(), companions: [{ id: 'otter' }] });
  api.playFunScene(api.FUN_ITEMS[0]); advance(0);
  stop(); advance(10000);
  assert.ok(!spoken.slice(1).some((b) => api.FUN_ITEMS[0][b.speaker.kind + 'Lines'].includes(b.text)), 'item line leaked after transition');
}

// Memories must refer to recorded events, with compact copy even for long old logs.
for (const patch of [{}, { lifeLog: [{ text: 'たまごからうまれた' }] }, { lifeLog: [{ text: 'はじめて くしゃみした' }] }]) {
  reset(patch); assert.equal(api.pickMemoryGreeting(), null);
}
const memorySamples = [
  ['びょうきを なおしてもらった', /看病|元気/],
  ['ロボと こいびとに なった', /恋人|返事/], ['ロボと けっこんした', /けっこん|結婚/],
  ['ロボと はじめての デートに いった', /デート/],
  ['デートの おもいで: ロボと あめやどりを した', /雨やどり|デート/],
  ['とくべつなデートの おもいで: ロボと なにか たべる', /デート|ごほうび/],
  ['とくべつな旅の おもいで: 深海', /旅/], ['ロボと なかなおりした', /話して|仲直り/],
  ['カワウソが なかまに なった', /仲間|にぎやか/], ['はじめて 森に いった', /場所|旅/],
  ['星のバス停に たどりついた', /場所|旅/], ['新しい姿に へんしんした', /姿|変身/],
  ['ロボと はじめて であった', /出会い/], ['れんくんに であった', /出会い/],
];
for (const [text, expected] of memorySamples) for (const age of [undefined, 1, 25]) {
  reset({ lifeLog: [{ text, age }] });
  const line = api.pickMemoryGreeting(); assert.match(line, expected);
  assert.ok([...line].length <= 38, 'long memory: ' + line);
  assert.ok(!/undefined|NaN|まえにの/.test(line));
}

// Current compact copy and old spaced saves must recall the same real event.
// Removing spaces from new log copy must not silence recall or change its kind.
for (const [text, expected] of memorySamples) {
  for (const savedText of [text.replace(/ /g, ''), text.replace(/ /g, '　 '), '12さい ' + text]) {
    reset({ lifeLog: [{ text: savedText, age: 12 }] });
    const before = JSON.stringify(api.getState().lifeLog);
    assert.match(api.pickMemoryGreeting() || '', expected, savedText);
    assert.equal(JSON.stringify(api.getState().lifeLog), before, 'recall rewrote the source history');
  }
}

// Every first encounter keeps both captions on screen for their full duration.
reset({partner:partner('robot_neighbor'),datesThisLife:2,lifeLog:[{
  age:12,icon:'💗',text:'デートの おもいで: となりまちの ロボットと あめやどりを した',
}]});
api.goOnDate(api.DATE_PLANS.find(plan => plan.id === 'rain')); advance(16000);
assert.equal(api.getState().lifeLog.filter(entry => /あめやどり/.test(entry.text)).length, 1,
  'compact date copy duplicated an old spaced memory');

reset({partner:partner('robot_neighbor',{label:'となりまちの ロボット'}),
  isSick:true,sicknessType:'げんいんふめいの こうねつ',
  lifeLog:[{age:12,icon:'💗',text:'でも　 なんとなく 気になる <おもいで>'}]});
api.renderProfile();
assert.match(getElement('profilePartnerCard').innerHTML, /となりまちのロボット/);
assert.equal(api.getState().partner.label, 'となりまちの ロボット', 'display changed the saved partner');
const oldCard = api.buildLifeCard();
assert.match(oldCard, /でもなんとなく気になる&lt;おもいで&gt;/);
assert.equal(api.getState().lifeLog[0].text, 'でも　 なんとなく 気になる <おもいで>', 'display rewrote the saved log');
api.loop(); assert.match(getElement('badges').textContent, /🥵/, 'old sickness label lost its badge');
api.getState().isSick = false;
api.loop();
assert.match(getElement('worldDateHint').textContent, /となりまちのロボット/);
api.renderPartnerCompanion();
assert.match(getElement('partnerCompanion').innerHTML, /title="となりまちのロボット"/);
api.getState().items.reward = 1;
api.goOnDate(api.DATE_PLANS[0]);
assert.match(getElement('dateRewardPlan').textContent, /となりまちのロボット/);
assert.equal(api.getState().partner.label, 'となりまちの ロボット', 'date prompt rewrote the saved partner');

for (const candidate of api.ALL_PARTNER_CANDIDATES) {
  reset(); api.checkAchievements(); storyCaptions.length = 0;
  assert.equal(api.playFirstPartnerEncounter(candidate), true);
  const expected = api.PARTNER_FIRST_ENCOUNTERS[candidate.id].length;
  assert.equal(storyCaptions.length, 1); advance(4199); assert.equal(storyCaptions.length, 1);
  advance(1); assert.equal(storyCaptions.length, expected, candidate.id);
  assert.ok(storyCaptions.every((r) => typeof r.text === 'string' && r.text.trim()));
  assert.equal(api.playFirstPartnerEncounter(candidate), false);
}
reset(); api.playFirstPartnerEncounter(partner()); click('cleanBtn');
const storyCount = storyCaptions.length; advance(10000);
assert.equal(storyCaptions.length, storyCount, 'encounter continued after a new action');
reset(); api.hatchEgg(); assert.equal(api.getState().lifeLog.at(-1).text, 'たまごからうまれた');
// Dream eggs retain access to every current species, including the eight rare lines.
for (const def of currentSpecies) {
  reset(); api.getState().lifetime.nextEggLine = def.id; api.hatchEgg();
  assert.equal(api.getState().speciesLine, def.id); assert.ok(api.stageDesc(def.id, 0));
}
console.log('WHOLE-TEXT TEST OK: 248 descriptions; 30 ordinary dates; 10 deep-sea plans; special rewards and skip; 36 anniversary lines; 7 items; event memories; 18 first encounters.');

// The result is relative to this player; a guessing-player win is not an A win.
for (const [role, winner, expected] of [
  ['challenger','A',/あなたのかち/], ['challenger','B',/あいてのかち/],
  ['guesser','B',/あなたのかち/], ['guesser','A',/あいてのかち/],
]) {
  reset();
  api.renderDuelFinalStage({role,matchOutcome:winner,aTotal:winner==='A'?3:2,bTotal:winner==='B'?3:2,breakdown:[],moneyDelta:0});
  assert.match(getElement('duelResultTitle').textContent, expected, role + ': ' + winner);
  assert.doesNotMatch(getElement('duelResultDesc').textContent, /ひきわけ/, 'zero payment was called a draw');
}

// An in-progress old duel keeps its choices and stored question snapshots.
const oldQuestion = {id:'dq5',emoji:'💭',text:'恋人に　うそを ついたことは?',
  a:{label:'ある よ'},b:{label:'ない よ'}};
const oldEntry = {truth:'a',pub:'b',isLie:true};
reset({duel:{role:'challenger',currentIndex:0,questions:[oldQuestion],entries:[null],lieCoinsMax:2}});
api.renderDuelQuestionStep();
assert.equal(getElement('duelQuestionText').textContent, '恋人にうそをついたことは?');
assert.equal(getElement('duelChoiceABtn').textContent, 'あるよ');
api.getState().duel.step='review'; api.getState().duel.entries=[oldEntry];
api.renderDuelAnswerReviewStep();
assert.match(getElement('duelAnswerReviewList').innerHTML, /恋人にうそをついたことは\?/);
assert.match(getElement('duelAnswerReviewList').innerHTML, /「ないよ」/);
const oldDuel={role:'guesser',items:[{qId:'dq5',question:oldQuestion,pub:'b'}],guesses:[]};
api.getState().duel=oldDuel;
api.renderDuelGuessListStep(); api.renderDuelSuspicionStep();
for(const id of ['duelGuessList','duelSuspicionList']) {
  assert.match(getElement(id).innerHTML, /恋人にうそをついたことは\?/);
  assert.match(getElement(id).innerHTML, /「ないよ」/);
}
const oldBreakdown={text:oldQuestion.text,emoji:'💭',pubLabel:'ない よ',
  flourishTitle:'よく 見ぬいた!',flourishDesc:'うそを 見ぬいた',pointsLabel:'B +1',aPoints:0,bPoints:1};
const oldResult={role:'guesser',matchOutcome:'B',aTotal:0,bTotal:1,breakdown:[oldBreakdown]};
api.revealSavedDuel(oldResult); api.renderDuelFinalStage(oldResult);
assert.equal(getElement('duelRevealText').textContent,'恋人にうそをついたことは?');
assert.equal(getElement('duelRevealOutcomeTitle').textContent,'よく見ぬいた!');
assert.match(getElement('duelResultBreakdown').innerHTML,/うそを見ぬいた/);
assert.equal(oldQuestion.text,'恋人に　うそを ついたことは?');
assert.equal(oldBreakdown.pubLabel,'ない よ');

// Cast replacement affects new encounters without rewriting a collected koala.
assert.equal(api.COMPANIONS.length, 18);
assert.ok(api.COMPANIONS.some((c) => c.id === 'snail'));
assert.ok(!api.COMPANIONS.some((c) => c.id === 'koala'));
assert.equal(api.canonicalCompanionId('koala'), 'koala');
assert.ok(master.compatibility.legacyOnlyCompanions.includes('koala'));
reset();
const oldLife = JSON.parse(JSON.stringify(api.getState()));
oldLife.companions = [{ id: 'koala', bond: 73 }, { id: 'penguin', bond: 84 }];
oldLife.lifetime.companionsRecruited = ['koala', 'penguin'];
oldLife.achievementsUnlocked = ['companion-all'];
savedPayload = JSON.stringify(oldLife);
const loadedOldLife = api.loadState();
assert.equal(savedPayload, JSON.stringify(oldLife), 'source save must remain intact');
savedPayload = null;
assert.equal(loadedOldLife.companions[0].id, 'koala');
assert.equal(loadedOldLife.companions[0].bond, 73);
assert.ok(loadedOldLife.lifetime.companionsRecruited.includes('koala'));
assert.ok(loadedOldLife.achievementsUnlocked.includes('companion-all'), 'earned achievements must remain');
reset(loadedOldLife);
assert.equal(api.allCompanionsById('koala').emoji, '🐨');
assert.equal(api.companionSpeaker(api.getState().companions[0]).id, 'koala');
api.renderCompanionRow(); api.renderCompanionDex();
assert.match(getElement('companionLeft').innerHTML, /🐨/);
assert.match(getElement('companionDexGrid').innerHTML, /のんびりコアラ/);
assert.equal(getElement('companionDexProgress').textContent, '2 / 19');
assert.ok(!api.hasAllCurrentCompanions({ companionsRecruited: [...api.COMPANIONS.filter((c) => c.id !== 'snail').map((c) => c.id), 'koala'] }), 'koala is not a substitute for snail');
assert.ok(api.hasAllCurrentCompanions({ companionsRecruited: api.COMPANIONS.map((c) => c.id) }));
reset({ companions: [{ id: 'snail', bond: 80 }] });
api.getState().lifetime.companionsRecruited = ['snail'];
api.renderCompanionRow(); api.renderCompanionDex();
assert.equal(api.companionDexEntries().length, 18);
assert.equal(getElement('companionDexProgress').textContent, '1 / 18');
for (const html of [getElement('companionLeft').innerHTML, getElement('companionDexGrid').innerHTML]) {
  assert.match(html, /assets\/characters\/companions\/snail\.png/);
  assert.match(html, /character-emoji-fallback/);
  assert.ok(!html.includes('コアラ'));
}
api.speakEvent('feed', { companionChance: 1 }); advance(10000);
const snailSpeech = spoken.find((beat) => beat.speaker.kind === 'companion');
assert.equal(snailSpeech.speaker.id, 'snail');
assert.ok(api.COMPANION_DAILY_REACTIONS.snail.feed.includes(snailSpeech.text));
console.log('CAST TEST OK: snail encounters and speech; legacy koala load, bond, row, dex and earned achievements; PNG renderer reference.');

// Every current normal companion resolves its own PNG in both live rows and the dex.
const normalCast = [...api.COMPANIONS];
assert.equal(new Set(normalCast.map((c) => c.asset)).size, 18, 'shared or missing companion asset');
for (const c of normalCast) {
  assert.equal(c.asset, `assets/characters/companions/${c.id}.png`);
  for (const size of ['hero', 'detail', 'thumb', 'medium', 'companion']) {
    const html = api.companionVisualHTML(c, size);
    assert.ok(html.includes(`src="${c.asset}"`), `${c.id}: ${size} asset missing`);
    assert.match(html, /character-emoji-fallback/);
  }
}
for (const asset of [master.playerSpecies.author.asset, ...normalCast.map((c) => c.asset)]) {
  const png = fs.readFileSync(asset);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset);
  assert.equal(png.readUInt32BE(16), 128, asset);
  assert.equal(png.readUInt32BE(20), 128, asset);
  assert.equal(png[24], 8, asset);
  assert.equal(png[25], 6, asset);
}
reset({ companions: normalCast.map((c) => ({ id: c.id, bond: 80 })) });
api.getState().lifetime.companionsRecruited = normalCast.map((c) => c.id);
api.renderCompanionRow(); api.renderCompanionDex();
const rows = ['companionLeft', 'companionRight'].map((id) => getElement(id).innerHTML);
for (const row of rows) assert.equal((row.match(/class="companion-chip-small"/g) || []).length, 9);
for (const c of normalCast) for (const html of [rows.join(''), getElement('companionDexGrid').innerHTML]) {
  assert.equal(html.split(`src="${c.asset}"`).length - 1, 1, `${c.id}: duplicate or omitted PNG`);
}
assert.equal(getElement('companionDexProgress').textContent, '18 / 18');
reset(); api.renderCompanionRow(); api.renderCompanionDex();
assert.equal(getElement('companionLeft').innerHTML + getElement('companionRight').innerHTML, '');
assert.ok(!getElement('companionDexGrid').innerHTML.includes('assets/characters/companions/'), 'unmet companion revealed');
assert.equal(getElement('companionDexProgress').textContent, '0 / 18');
console.log('NORMAL CAST PNG TEST OK: 19 PNG headers; 18 companions x 5 renderer sizes; 9+9 live rows; collected and locked dex.');

// Rare PNGs are visible through the shared views but retain discovery boundaries.
const rareCast = [...api.RARE_COMPANIONS];
assert.equal(rareCast.length, 8);
assert.equal(new Set([...normalCast, ...rareCast].map((c) => c.asset)).size, 26);
reset(); api.renderRareCompanionDex();
assert.ok(getElement('rareCompanionDexDivider').classList.contains('hidden'));
assert.ok(getElement('rareCompanionDexGrid').classList.contains('hidden'));
assert.equal(getElement('rareCompanionDexGrid').innerHTML, '');
for (const c of rareCast) {
  assert.equal(c.asset, `assets/characters/companions/${c.id}.png`);
  const png = fs.readFileSync(c.asset);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', c.id);
  assert.equal(png.readUInt32BE(16), 128, c.id);
  assert.equal(png.readUInt32BE(20), 128, c.id);
  assert.equal(png[24], 8, c.id); assert.equal(png[25], 6, c.id);
  for (const size of ['hero', 'detail', 'thumb', 'medium', 'companion']) {
    const html = api.companionVisualHTML(c, size);
    assert.ok(html.includes(`src="${c.asset}"`), `${c.id}: ${size}`);
    assert.match(html, /character-emoji-fallback/);
  }
  reset({ companions: [{ id: c.id, bond: 72 }] });
  api.getState().lifetime.rareCompanionsRecruited = [c.id];
  api.renderRareCompanionDex(); api.renderCompanionRow(); api.renderProfile();
  assert.ok(!getElement('rareCompanionDexDivider').classList.contains('hidden'));
  assert.ok(!getElement('rareCompanionDexGrid').classList.contains('hidden'));
  assert.equal(getElement('rareCompanionDexProgress').textContent, '1 / 8');
  for (const id of ['rareCompanionDexGrid', 'companionLeft', 'profileCompanionList']) {
    const html = getElement(id).innerHTML;
    assert.equal(html.split(`src="${c.asset}"`).length - 1, 1, `${c.id}: ${id}`);
    for (const other of rareCast.filter((r) => r.id !== c.id)) assert.ok(!html.includes(other.asset), 'unmet rare companion revealed');
  }
  api.openCompanionInvite(c, true);
  assert.ok(getElement('companionInviteEmoji').innerHTML.includes(`src="${c.asset}"`));
  assert.equal(getElement('companionInviteTitle').textContent, `${c.name}とめがあった`);
  assert.ok(getElement('companionInviteOverlay').classList.contains('rare'));
  click('companionInviteLaterBtn');
  assert.equal(api.getState().companions[0].bond, 72, 'rendering changed bond');
}
reset({ companions: [...normalCast, ...rareCast].map((c) => ({ id: c.id, bond: 80 })) });
api.getState().lifetime.companionsRecruited = normalCast.map((c) => c.id);
api.getState().lifetime.rareCompanionsRecruited = rareCast.map((c) => c.id);
api.renderCompanionRow(); api.renderCompanionDex(); api.renderRareCompanionDex();
const allRows = ['companionLeft', 'companionRight'].map((id) => getElement(id).innerHTML);
for (const row of allRows) assert.equal((row.match(/class="companion-chip-small"/g) || []).length, 13);
for (const c of [...normalCast, ...rareCast]) assert.equal(allRows.join('').split(`src="${c.asset}"`).length - 1, 1, c.id);
assert.equal(getElement('companionDexProgress').textContent, '18 / 18');
assert.equal(getElement('rareCompanionDexProgress').textContent, '8 / 8');
console.log('RARE CAST PNG TEST OK: 8 PNGs x 5 renderer sizes; invite/profile/row/dex; hidden and partial dex; 13+13 mixed rows; bond retained.');

// The new clock has its own encounter and dialogue; a collected mushroom stays itself.
const clockCompanion = api.allCompanionsById('clock');
assert.ok(clockCompanion);
assert.equal(clockCompanion.name, 'じかんにルーズなとけい');
assert.ok(api.RARE_COMPANIONS.some((c) => c.id === 'clock'));
assert.ok(!api.RARE_COMPANIONS.some((c) => c.id === 'kinoko'));
assert.equal(api.canonicalCompanionId('kinoko'), 'kinoko');
assert.ok(master.compatibility.legacyOnlyCompanions.includes('kinoko'));
reset();
const oldRareLife = JSON.parse(JSON.stringify(api.getState()));
oldRareLife.companions = [{ id: 'kinoko', bond: 73 }];
oldRareLife.lifetime.rareCompanionsRecruited = ['kinoko'];
oldRareLife.achievementsUnlocked = ['companion-all'];
savedPayload = JSON.stringify(oldRareLife);
const loadedOldRareLife = api.loadState();
assert.equal(savedPayload, JSON.stringify(oldRareLife), 'source save must remain intact');
savedPayload = null;
assert.equal(loadedOldRareLife.companions[0].id, 'kinoko');
assert.equal(loadedOldRareLife.companions[0].bond, 73);
assert.deepEqual([...loadedOldRareLife.lifetime.rareCompanionsRecruited], ['kinoko']);
assert.ok(loadedOldRareLife.achievementsUnlocked.includes('companion-all'));
reset(loadedOldRareLife);
assert.equal(api.companionSpeaker(api.getState().companions[0]).id, 'kinoko');
api.renderCompanionRow(); api.renderProfile(); api.renderRareCompanionDex(); api.renderCompanionDex();
assert.equal(getElement('rareCompanionDexProgress').textContent, '1 / 9');
assert.equal(getElement('companionDexProgress').textContent, '0 / 18');
for (const id of ['companionLeft', 'profileCompanionList', 'rareCompanionDexGrid']) {
  assert.match(getElement(id).innerHTML, /assets\/characters\/companions\/kinoko\.png/);
  assert.ok(!getElement(id).innerHTML.includes(clockCompanion.asset), 'old mushroom must not unlock or become the clock');
}
assert.ok(!getElement('companionDexGrid').innerHTML.includes('kinoko'));
api.speakEvent('feed', { companionChance: 1 }); advance(10000);
assert.ok(spoken.some((beat) => beat.speaker.id === 'kinoko' && api.COMPANION_DAILY_REACTIONS.kinoko.feed.includes(beat.text)));

// Current entries and an already collected legacy entry count once, including across lives.
reset();
api.getState().lifetime.rareCompanionsRecruited = [...rareCast.map((c) => c.id), 'kinoko', 'kinoko', 'unrecognized-old-id'];
api.renderRareCompanionDex();
assert.equal(getElement('rareCompanionDexProgress').textContent, '9 / 9');
assert.equal(getElement('rareCompanionDexGrid').innerHTML.split('src="assets/characters/companions/kinoko.png"').length - 1, 1);
assert.equal(api.rareCompanionDexEntries().length, 9);
reset();
assert.equal(api.rareCompanionDexEntries().length, 8, 'unmet legacy character must not add a locked slot');
api.getState().lifetime.rareCompanionsRecruited = ['unrecognized-old-id'];
api.renderRareCompanionDex();
assert.ok(getElement('rareCompanionDexGrid').classList.contains('hidden'));

for (const [key, lines] of Object.entries(api.COMPANION_DAILY_REACTIONS.clock)) {
  reset({ companions: [{ id: 'clock', bond: 80 }] });
  api.speakEvent(key, { companionChance: 1, partnerChance: 0 }); advance(10000);
  assert.ok(spoken.some((beat) => beat.speaker.id === 'clock' && lines.includes(beat.text)), key + ': clock reaction missing');
}

// With every other current companion present, the actual scheduler offers the new clock.
reset({ sodachi: 80, maxSodachi: 80, companions: [...normalCast, ...rareCast.filter((c) => c.id !== 'clock'), { id: 'kinoko' }].map((c) => ({ id: c.id, bond: 80 })) });
api.scheduleCompanionEncounter(); advance(180000);
assert.equal(getElement('companionInviteTitle').textContent, 'じかんにルーズなとけいとめがあった');
assert.ok(getElement('companionInviteOverlay').classList.contains('rare'));
click('companionInviteLaterBtn');

// Preserve the actual GitHub baseline: rare recruitment requires 70 points.
for (const score of [69, 70]) {
  reset({ sodachi: 80, maxSodachi: 80 });
  api.openCompanionInvite(clockCompanion, true);
  api.finishMinigame(score);
  assert.equal(api.getState().lifetime.rareCompanionsRecruited.includes('clock'), score >= 70);
  assert.equal(api.getState().companions.some((c) => c.id === 'clock'), score >= 70);
  assert.ok(!api.getState().lifetime.companionsRecruited.includes('clock'), 'clock must use the rare collection');
  if (score >= 70) assert.equal(api.getState().companions.find((c) => c.id === 'clock').bond, 100);
  click('companionInviteLaterBtn');
}
console.log('CLOCK CAST TEST OK: real encounter and 69/70 recruitment; five dialogue events; legacy mushroom save, bond, PNG, dialogue and rare dex; unique current/legacy counts.');

// Saved partners resolve their current artwork without changing their relationship or identity.
const partnerArt = master.partners.filter((p) => p.asset);
assert.equal(partnerArt.length, 18, 'checkpoint BH partner PNG count');
assert.equal(new Set(partnerArt.map((p) => p.asset)).size, partnerArt.length);
for (const def of master.partners) {
  const candidate = api.ALL_PARTNER_CANDIDATES.find((p) => p.id === def.id);
  assert.ok(candidate, def.id);
  assert.ok(api.findRegion(def.firstRegion).candidates.some((p) => p.id === def.id));
  assert.equal(def.asset, `assets/characters/partners/${def.id}.png`);
  const png = fs.readFileSync(def.asset);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', def.id);
  assert.equal(png.readUInt32BE(16), 128); assert.equal(png.readUInt32BE(20), 128);
  assert.equal(png[24], 8); assert.equal(png[25], 6);
  for (const size of ['hero', 'detail', 'thumb', 'medium', 'companion']) {
    const html = api.partnerVisualHTML(candidate, size);
    assert.ok(html.includes(`src="${def.asset}"`), `${def.id}: ${size}`);
    assert.match(html, /character-emoji-fallback/);
  }
  const savedPartner = { ...candidate, affection: 73, bondCount: 4, married: true };
  delete savedPartner.asset;
  reset();
  const oldPartnerLife = JSON.parse(JSON.stringify(api.getState()));
  oldPartnerLife.partner = savedPartner;
  oldPartnerLife.lifetime.partnersRecorded = [def.id];
  oldPartnerLife.lifetime.partnersMarried = [def.id];
  savedPayload = JSON.stringify(oldPartnerLife);
  const loadedPartnerLife = api.loadState();
  savedPayload = null;
  assert.equal(JSON.stringify(loadedPartnerLife.partner), JSON.stringify(savedPartner), 'image upgrade rewrote saved relationship');
  reset(loadedPartnerLife);
  const beforePartnerRender = JSON.stringify(api.getState().partner);
  api.renderPartnerCompanion(false); api.renderProfile(); api.renderPartnerDex();
  for (const id of ['partnerCompanion', 'profilePartnerCard', 'partnerDexGrid']) {
    assert.ok(getElement(id).innerHTML.includes(`src="${def.asset}"`), `${def.id}: ${id}`);
    assert.match(getElement(id).innerHTML, /💍/);
  }
  assert.match(getElement('partnerCompanion').innerHTML, /partner-heart/);
  assert.match(getElement('partnerCompanion').innerHTML, /character-companion/);
  assert.equal(getElement('partnerDexProgress').textContent, '1 / 18');
  assert.equal(JSON.stringify(api.getState().partner), beforePartnerRender, 'rendering changed relationship');
  api.renderPartnerCompanion(true);
  assert.ok(getElement('partnerCompanion').classList.contains('hidden'));
  assert.equal(getElement('partnerCompanion').innerHTML, '');

  for (const plan of api.DATE_PLANS) {
    reset({ partner: savedPartner });
    api.goOnDate(plan); advance(20000);
    assert.ok(getElement('dateMoviePartner').innerHTML.includes(`src="${def.asset}"`), `${def.id}: date ${plan.id}`);
    assert.ok(getElement('dateMoviePet').innerHTML.includes('src="assets/characters/man/06.png"'));
    assert.equal(captions.length,4,`${def.id}: complete date ${plan.id}`);
    assert.ok(captions.every(text=>text.trim()&&!/undefined|\[object Object\]/.test(text)));
    assert.equal(getElement('dateMovieCloseBtn').classList.contains('hidden'),false);
  }
  for (const years of [1,10,25,50]) {
    reset({ partner: savedPartner });
    api.playMarriageMovie({ years, icon:'💐', title:'記念日' }); advance(35000);
    assert.ok(getElement('dateMoviePartner').innerHTML.includes(`src="${def.asset}"`), `${def.id}: anniversary ${years}`);
    assert.ok(getElement('dateMoviePet').innerHTML.includes('src="assets/characters/man/06.png"'));
    assert.ok(captions.length>=5&&captions.every(text=>text.trim()&&!/undefined|\[object Object\]/.test(text)));
    assert.ok(captions.some(text=>api.PARTNER_ANNIVERSARY_LINES[def.id].some(line=>text.includes(line))),
      `${def.id}: own anniversary dialogue at ${years} years`);
    assert.equal(getElement('dateMovieCloseBtn').classList.contains('hidden'),false);
  }
  reset();
  assert.ok(api.playFirstPartnerEncounter(candidate));
  assert.ok(getElement('storyFlashEmoji').innerHTML.includes(`src="${def.asset}"`), def.id + ': first encounter');
  advance(10000);
  assert.ok(getElement('storyFlashEmoji').innerHTML.includes(`src="${def.asset}"`), def.id + ': later encounter beat');
  assert.ok(!api.playFirstPartnerEncounter(candidate), 'first encounter repeated');
}
assert.ok(api.partnerVisualHTML({ id: 'ceo-cat', emoji: '🐈‍⬛' }).includes('assets/characters/partners/cat_ceo.png'));
for (const p of [{ id: 'guest', emoji: '🐸' }, { id: 'forest-fox', emoji: '🦊' }, { id: 'unknown-partner', emoji: '💕' }]) {
  assert.equal(api.partnerVisualHTML(p), p.emoji, 'unmapped partner must keep its own emoji');
}
reset(); api.renderPartnerDex();
assert.equal(getElement('partnerDexProgress').textContent, '0 / 18');
assert.ok(!getElement('partnerDexGrid').innerHTML.includes('assets/characters/partners/'), 'unmet partner revealed');
api.getState().lifetime.partnersRecorded = master.partners.map((p) => p.id);
api.renderPartnerDex();
assert.equal(getElement('partnerDexProgress').textContent, '18 / 18');
for (const p of partnerArt) assert.ok(getElement('partnerDexGrid').innerHTML.includes(p.asset));
console.log(`PARTNER CAST PNG TEST OK: ${partnerArt.length} PNGs x 5 sizes; saved relationships; companion/profile/dex; 180 complete dates; 72 complete anniversaries; first encounters; aliases, guests and hidden dex.`);

// The author stays outside the playable/companion/partner collections and appears only after goal 4/5.
const allForms = Array.from(api.ALL_LINES).flatMap((line) => Array.from({ length: api.STAGES_PER_LINE }, (_, i) => `${line}:${i}`));
assert.equal(api.ALL_LINES.length, 31); assert.equal(allForms.length, 248);
assert.ok(!api.ALL_LINES.includes('naoto'));
assert.ok(![...api.COMPANIONS, ...api.RARE_COMPANIONS, ...api.ALL_PARTNER_CANDIDATES].some((c) => c.id === 'naoto'));
assert.equal(master.playerSpecies.author.playable, false);
const authorAsset = master.playerSpecies.author.asset;
assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(authorAsset)).digest('hex'),
  'b87cd30262026ced43075a5334102acf8d27197113ff86a287918589991cbe59', 'approved normal author sprite changed');
for (const size of ['hero', 'detail', 'thumb', 'medium', 'companion']) {
  assert.ok(api.authorVisualHTML(size).includes(`src="${authorAsset}"`));
  assert.match(api.authorVisualHTML(size), /character-emoji-fallback/);
}
for (const count of [0, allForms.length - 1]) {
  reset({ discoveredStages: allForms.slice(0, count) });
  api.checkGrandGoals(); api.renderNaotoItemGrid();
  assert.equal(api.isAuthorUnlocked(), false); assert.equal(api.pendingGoal(), null);
  assert.ok(getElement('naotoGreetingBtn').classList.contains('hidden'));
  assert.equal(getElement('naotoGreetingBtn').innerHTML, '');
  assert.equal(api.showAuthorGreeting('dex'), false); assert.equal(storyCaptions.length, 0);
  click('naotoGreetingBtn');
  assert.ok(!getElement('storyFlashEmoji').innerHTML.includes(authorAsset), 'locked button revealed author');
}

reset({ discoveredStages: allForms.slice(), partner: partner(), companions: [{ id: 'clock', bond: 84 }] });
api.checkGrandGoals(); api.renderEnding(); api.renderNaotoItemGrid();
assert.equal(api.pendingGoal(), 'dex'); assert.equal(api.getEndingTier(), 3);
assert.equal(api.getState().lifetime.dexCleared, true);
assert.equal(api.getState().lifetime.perfectCleared, false);
assert.equal(getElement('gameClearOverlay').dataset.goal, '4');
assert.match(getElement('gameClearArt').src, /^assets\/clear\/goal-4-naoto-v1\.jpg\?/);
assert.ok(getElement('gameClearDesc').innerHTML.includes(`${allForms.length} / ${allForms.length}`));
assert.ok(!getElement('gameClearDesc').innerHTML.includes('168'));
assert.ok(getElement('gameClearDesc').innerHTML.includes('なおとのかんむり'));
assert.ok(getElement('gameClearFreePlayBtn').classList.contains('hidden'));
assert.ok(!getElement('naotoGreetingBtn').classList.contains('hidden'));
assert.ok(getElement('naotoGreetingBtn').innerHTML.includes(authorAsset));
api.checkGrandGoals(); api.renderEnding();
assert.equal(api.getState().lifetime.ownedNaotoItems.filter((id) => id === 'naoto_crown').length, 1);
const dexRelations = JSON.stringify([api.getState().partner, api.getState().companions]);
const dexMoney = api.getState().lifetime.money;
click('gameClearCloseBtn');
assert.equal(api.pendingGoal(), null);
assert.ok(getElement('gameClearOverlay').classList.contains('hidden'));
assert.ok(!getElement('storyFlash').classList.contains('hidden'));
assert.ok(getElement('storyFlashEmoji').innerHTML.includes(authorAsset));
assert.match(getElement('storyFlashText').textContent, /ナオト「こんなに/);
advance(4199); assert.ok(!getElement('storyFlash').classList.contains('hidden'));
advance(1); assert.ok(getElement('storyFlash').classList.contains('hidden'));
assert.equal(JSON.stringify([api.getState().partner, api.getState().companions]), dexRelations);
assert.equal(api.getState().lifetime.money, dexMoney);
api.checkGrandGoals(); assert.equal(api.pendingGoal(), null, 'dismissed goal replayed');

// Goal 5 takes priority when both goals are first completed; both exit routes keep the earned unlocks.
for (const exitButton of ['gameClearCloseBtn', 'gameClearFreePlayBtn']) {
  reset({ discoveredStages: allForms.slice(), achievementsUnlocked: api.ACHIEVEMENTS.map((a) => a.id) });
  api.checkGrandGoals(); api.renderEnding();
  assert.equal(api.pendingGoal(), 'perfect'); assert.equal(api.getEndingTier(), 4);
  assert.equal(getElement('gameClearOverlay').dataset.goal, '5');
  assert.match(getElement('gameClearArt').src, /^assets\/clear\/goal-5-naoto-v1\.jpg\?/);
  assert.match(getElement('gameClearArt').alt, /歯を見せて笑う/);
  assert.ok(!getElement('gameClearFreePlayBtn').classList.contains('hidden'));
  assert.equal(api.getState().lifetime.dexCleared, true);
  assert.equal(api.getState().lifetime.perfectCleared, true);
  click(exitButton);
  assert.equal(api.pendingGoal(), null);
  assert.equal(api.getState().infinite, exitButton === 'gameClearFreePlayBtn');
  assert.ok(getElement('storyFlashEmoji').innerHTML.includes(authorAsset));
  assert.match(getElement('storyFlashText').textContent, /ナオト「ぜんぶ/);
  assert.equal(api.getState().discoveredStages.length, allForms.length);
  assert.equal(api.getState().achievementsUnlocked.length, api.ACHIEVEMENTS.length);
}

// Previous saves retain their earned author access even while today's expanded dex is incomplete.
for (const oldGoal of ['dexCleared', 'perfectCleared']) {
  reset({ discoveredStages: ['man:4'], partner: partner('robot_neighbor', { affection: 71, married: true }), companions: [{ id: 'kinoko', bond: 63 }] });
  api.getState().lifetime[oldGoal] = true;
  api.getState().lifetime.ownedNaotoItems = ['naoto_charm'];
  const oldAuthorSave = JSON.parse(JSON.stringify(api.getState()));
  savedPayload = JSON.stringify(oldAuthorSave);
  const loadedAuthorSave = api.loadState(); savedPayload = null;
  assert.equal(loadedAuthorSave.lifetime[oldGoal], true);
  assert.equal(JSON.stringify(loadedAuthorSave.partner), JSON.stringify(oldAuthorSave.partner));
  assert.equal(JSON.stringify(loadedAuthorSave.companions), JSON.stringify(oldAuthorSave.companions));
  reset(loadedAuthorSave); api.checkGrandGoals();
  assert.equal(api.pendingGoal(), null, 'old goal replayed on load');
  if (oldGoal === 'dexCleared') {
    api.renderEnding();
    assert.ok(getElement('gameClearDesc').innerHTML.includes(`${api.getState().discoveredStages.length} / ${allForms.length}`), 'old unlock must not fake a full current dex');
  }
  api.openExclusiveMenu('item');
  assert.ok(!getElement('itemOverlay').classList.contains('hidden'));
  assert.ok(!getElement('naotoGreetingBtn').classList.contains('hidden'));
  const beforeTalk = JSON.stringify([api.getState().partner, api.getState().companions, api.getState().lifetime.money, api.getState().ageTicks]);
  click('naotoGreetingBtn');
  assert.ok(getElement('itemOverlay').classList.contains('hidden'), 'shop obscures author greeting');
  assert.ok(getElement('storyFlashEmoji').innerHTML.includes(authorAsset));
  assert.match(getElement('storyFlashText').textContent, /ナオト「やあ！/);
  assert.equal(JSON.stringify([api.getState().partner, api.getState().companions, api.getState().lifetime.money, api.getState().ageTicks]), beforeTalk);
  assert.ok(api.getState().lifetime.ownedNaotoItems.includes('naoto_charm'), 'old reward lost');
  advance(4200); api.openExclusiveMenu('item'); click('naotoGreetingBtn');
  assert.match(getElement('storyFlashText').textContent, /ナオト「やあ！/);
  assert.ok(!getElement('storyFlash').classList.contains('hidden'), 'unlocked author could not be greeted again');
}

// Returning to the earlier life goals must restore their original artwork and never add an author greeting.
for (const [sodachi, tier] of [[69, 0], [70, 1], [100, 2]]) {
  reset({ maxSodachi: sodachi, sodachi }); api.enterFarewell(); api.renderEnding();
  assert.equal(api.getEndingTier(), tier);
  assert.equal(getElement('gameClearArt').src, `assets/clear/goal-${tier + 1}.jpg?v=20260908-02`);
  assert.ok(!getElement('gameClearDesc').innerHTML.includes('みつけたすがた:'));
  assert.equal(api.isAuthorUnlocked(), false);
  click('gameClearCloseBtn');
  assert.ok(!storyCaptions.some((caption) => caption.text.startsWith('ナオト「')));
}
for (const goal of [4, 5]) {
  const jpeg = fs.readFileSync(`assets/clear/goal-${goal}-naoto-v1.jpg`);
  assert.equal(jpeg.subarray(0, 2).toString('hex'), 'ffd8');
  assert.equal(jpeg.subarray(-2).toString('hex'), 'ffd9');
}
console.log('AUTHOR ENDING TEST OK: 247/248 unlock; native dex count; goals 4/5 and both exits; 4200ms greeting; old-save access and rewards; hidden/repeatable shop greeting; original goals 1-3.');

// Main #203 adds six achievements. Existing perfect saves keep their earned mode and author access.
const recordAchievementIds = ['record-rank-s-1', 'games-played-25', 'games-played-60', 'record-rank-a-20', 'games-complete-100', 'record-rank-s-15'];
for (const id of recordAchievementIds) assert.ok(api.ACHIEVEMENTS.some((a) => a.id === id));
reset({ discoveredStages: allForms.slice(), achievementsUnlocked: api.ACHIEVEMENTS.filter((a) => !recordAchievementIds.includes(a.id)).map((a) => a.id) });
api.getState().lifetime.dexCleared = true;
api.getState().lifetime.perfectCleared = true;
api.getState().lifetime.endingTiersReached = [3, 4];
api.getState().lifetime.ownedNaotoItems = ['naoto_crown'];
savedPayload = JSON.stringify(api.getState());
const preRecordAchievementSave = api.loadState(); savedPayload = null;
reset(preRecordAchievementSave); api.checkAchievements(); api.checkGrandGoals(); api.renderEnding();
assert.equal(api.getState().lifetime.perfectCleared, true);
assert.equal(api.pendingGoal(), null, 'expanded achievements replayed an old perfect clear');
assert.equal(api.isAuthorUnlocked(), true);
assert.ok(getElement('gameClearArt').src.includes('goal-5-naoto-v1.jpg'));
assert.ok(!getElement('gameClearFreePlayBtn').classList.contains('hidden'));
assert.ok(recordAchievementIds.every((id) => !api.getState().achievementsUnlocked.includes(id)), 'unearned new achievements were granted');
click('gameClearFreePlayBtn');
assert.equal(api.getState().infinite, true, 'earned infinite mode was lost');
assert.ok(api.getState().lifetime.ownedNaotoItems.includes('naoto_crown'));

// For new perfect clears, 99 current games plus retired records must not count as 100.
const currentGameIds = Array.from(api.buildMinigamePool(), (game) => game.id);
assert.equal(currentGameIds.length, 100); assert.equal(new Set(currentGameIds).size, 100);
reset({ discoveredStages: allForms.slice(), achievementsUnlocked: api.ACHIEVEMENTS.filter((a) => a.id !== 'games-complete-100').map((a) => a.id) });
api.getState().lifetime.dexCleared = true;
api.getState().lifetime.minigamePlayCounts = Object.fromEntries(currentGameIds.slice(0, -1).map((id) => [id, 1]));
api.getState().lifetime.minigamePlayCounts['retired-test-game'] = 1000;
api.checkAchievements(); api.checkGrandGoals();
assert.ok(!api.getState().achievementsUnlocked.includes('games-complete-100'));
assert.equal(api.getState().lifetime.perfectCleared, false);
assert.equal(api.pendingGoal(), null);
api.getState().lifetime.minigamePlayCounts[currentGameIds.at(-1)] = 1;
api.checkAchievements(); api.checkGrandGoals(); api.renderEnding();
assert.ok(api.getState().achievementsUnlocked.includes('games-complete-100'));
assert.equal(api.getState().lifetime.perfectCleared, true);
assert.equal(api.pendingGoal(), 'perfect');
assert.ok(getElement('gameClearArt').src.includes('goal-5-naoto-v1.jpg'));
click('gameClearCloseBtn');
assert.ok(getElement('storyFlashEmoji').innerHTML.includes(authorAsset));
assert.match(getElement('storyFlashText').textContent, /ナオト「ぜんぶ/);
console.log('MAIN 203 AUTHOR COMPATIBILITY OK: prior perfect save keeps author, crown and infinite mode; six new achievements stay unearned; 99/100 current games excludes retired records and opens goal 5 correctly.');
