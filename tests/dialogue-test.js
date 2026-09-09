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
    removeEventListener: noop, appendChild: noop, remove: noop,
    querySelector: (selector) => getElement(selector), querySelectorAll: () => [], closest: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }),
    setAttribute: noop, focus: noop,
  };
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
  window: { addEventListener: noop, innerWidth: 390, innerHeight: 844, confirm: () => confirmResult, NAOTOCCHI_CHARACTER_WORLD_MASTER_V1: master },
  localStorage: { getItem: () => savedPayload, setItem: noop, removeItem: noop },
  navigator: { userAgent: 'dialogue-test', maxTouchPoints: 1 },
  performance: { now: () => now }, requestAnimationFrame: () => 1, cancelAnimationFrame: noop,
  setInterval: () => 1, clearInterval: noop,
  setTimeout: (fn, delay = 0) => { const id = ++timerId; timers.set(id, { fn, at: now + delay }); return id; },
  clearTimeout: (id) => timers.delete(id),
  location: { href: 'https://naoto214.github.io/naotocchi/' }, crypto: { getRandomValues: (a) => a },
  __spoken: spoken, __events: events, __clock: () => now,
};
const source = fs.readFileSync('script.js', 'utf8');
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
    finishDateMovie, celebrateAgeSpeech, finishMinigame, partnerAnniversaryLine,
    gainSodachi, onSodachiMilestone, travelToRegion, findRegion, chooseTransform,
    CONVERSATION_POOLS, PARTNER_DAILY_REACTIONS, PARTNER_CHARACTER_IDLE_LINES,
    COMPANION_DAILY_REACTIONS, COMPANION_CHARACTER_IDLE_LINES, PARTNER_RELATIONSHIP_LINES,
    PARTNER_IDLE_LINES, COMPANION_IDLE_LINES, ALL_PARTNER_CANDIDATES,
    stageDesc, SPECIES, SPECIES_STAGE_DESCS, DATE_PLANS, DATE_PLAN_VARIATIONS, DEEPSEA_DATE_PLANS,
    PARTNER_ANNIVERSARY_LINES, FUN_ITEMS, PARTNER_FIRST_ENCOUNTERS,
    datePlanForRegion, goOnDate, playFunScene, useItem, pickMemoryGreeting, playFirstPartnerEncounter,
    hatchEgg, triggerDeath, enterFarewell, openExclusiveMenu, openDateChooser, closeDateOverlay, checkAchievements,
    loadState, COMPANIONS, RARE_COMPANIONS, allCompanionsById, canonicalCompanionId,
    hasAllCurrentCompanions, companionDexEntries, companionVisualHTML, renderCompanionRow, renderCompanionDex,
    renderRareCompanionDex, rareCompanionDexEntries, renderProfile, openCompanionInvite, scheduleCompanionEncounter,
    partnerVisualHTML, renderPartnerCompanion, renderPartnerDex,
    getState: () => state, recent: () => [...recentConversationLines],
    reset: (patch) => {
      clearConversationTimers(); clearDateMovieTimers(); hideSpeechBubble(); closeAllMenuOverlays();
      state = Object.assign(freshState(), {
        stage: STAGE.GROWING, speciesLine: WORLD_MASTER.playerSpecies.normal[0].id,
        stageIndex: stageForAge(25), ageTicks: 25 * AGE_TICKS_PER_YEAR, sodachi: 55, maxSodachi: 55,
        hunger: 50, energy: 90, happiness: 80, health: 100,
      }, patch);
      recentConversationLines = []; message = ''; gameActive = false; dateOpen = false;
      grandGoalPending = null; pendingCompanionId = null;
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
  assert.equal(api.COMPANION_CHARACTER_IDLE_LINES[def.id].length, 3);
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
  api.playLegendEncounterMovie({ id, emoji: '⭐', flash: '発見', story: '出会い' }, 17);
  assert.equal(getElement('speechBubble').classList.contains('hidden'), true);
  const speechCount = spoken.length; advance(35000);
  assert.equal(spoken.length, speechCount, 'conversation leaked into movie');
  assert.ok(captions.length >= 6); assert.ok(captions.at(-1).includes('17'));
  assert.equal(getElement('dateMovieCloseBtn').classList.contains('hidden'), false);
  assert.equal(getElement('dateMovieSkipBtn').classList.contains('hidden'), true);
}
reset(); api.playLegendEncounterMovie({ id: 'boss', emoji: '🦑' }, 17); api.finishDateMovie();
const skippedAt = captions.length; advance(35000); assert.equal(captions.length, skippedAt, 'skip left captions queued');
for (const years of [1, 10, 25, 50]) for (const mismatch of [false, true]) for (const value of [0, 0.99]) {
  reset({ partner: partner('robot_neighbor', { married: true }), lifeLog: mismatch ? [{ text: 'なかなおりした' }] : [] });
  random = value; api.playMarriageMovie({ years, icon: '💐', title: '記念日' }); advance(35000);
  assert.ok(captions.length >= 5); assert.ok(!captions.some((x) => /undefined|ワイ|ホンマ|やで/.test(x)));
  if (value === 0.99) assert.ok(captions.some((x) => mismatch ? x.includes('あのときは ごめんね') : x.includes('おやつが おいしかった')), 'shared memory unreachable');
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
for (const accept of [false, true]) {
  reset({ partner: partner(), items: { reward: 1 } }); confirmResult = accept;
  api.goOnDate(api.DATE_PLANS[0]); advance(35000);
  assert.equal(captions.length, accept ? 7 : 4);
  assert.equal(api.getState().items.reward || 0, accept ? 0 : 1);
  assert.equal(api.getState().lifeLog.filter((r) => r.text.startsWith('とくべつなデートの おもいで:')).length, accept ? 1 : 0);
  api.finishDateMovie(); advance(35000);
  assert.equal(api.getState().items.reward || 0, accept ? 0 : 1, 'reward consumed twice');
}
reset({ partner: partner() }); confirmResult = true;
api.goOnDate(api.DATE_PLANS[0]); api.finishDateMovie();
const dateSkipCount = captions.length; advance(35000);
assert.equal(captions.length, dateSkipCount, 'skipped date still changes captions');
assert.equal(api.getState().items.reward || 0, 0, 'missing reward underflow');
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
for (const patch of [{}, { lifeLog: [{ text: 'たまごから うまれた' }] }, { lifeLog: [{ text: 'はじめて くしゃみした' }] }]) {
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

// Every first encounter keeps both captions on screen for their full duration.
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
reset(); api.hatchEgg(); assert.equal(api.getState().lifeLog.at(-1).text, 'たまごから うまれた');
// Dream eggs retain access to every current species, including the eight rare lines.
for (const def of currentSpecies) {
  reset(); api.getState().lifetime.nextEggLine = def.id; api.hatchEgg();
  assert.equal(api.getState().speciesLine, def.id); assert.ok(api.stageDesc(def.id, 0));
}
console.log('WHOLE-TEXT TEST OK: 248 descriptions; 30 ordinary dates; 10 deep-sea plans; special rewards and skip; 36 anniversary lines; 7 items; event memories; 18 first encounters.');

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
assert.match(getElement('companionDexGrid').innerHTML, /のんびり コアラ/);
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
  assert.equal(getElement('companionInviteTitle').textContent, `${c.name}と めが あった`);
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
assert.equal(clockCompanion.name, 'じかんに ルーズな とけい');
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
assert.equal(getElement('companionInviteTitle').textContent, 'じかんに ルーズな とけいと めが あった');
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
assert.equal(partnerArt.length, 6, 'checkpoint BG partner PNG count');
assert.equal(new Set(partnerArt.map((p) => p.asset)).size, partnerArt.length);
for (const def of master.partners) {
  const candidate = api.ALL_PARTNER_CANDIDATES.find((p) => p.id === def.id);
  assert.ok(candidate, def.id);
  assert.ok(api.findRegion(def.firstRegion).candidates.some((p) => p.id === def.id));
  if (!def.asset) {
    assert.equal(api.partnerVisualHTML(candidate), candidate.emoji, 'unfinished partner retains emoji');
    continue;
  }
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

  reset({ partner: savedPartner });
  api.goOnDate(api.DATE_PLANS[0]);
  assert.ok(getElement('dateMoviePartner').innerHTML.includes(`src="${def.asset}"`), def.id + ': date');
  assert.match(getElement('dateMoviePet').innerHTML, /assets\/characters\//);
  api.finishDateMovie();
  reset({ partner: savedPartner });
  api.playMarriageMovie({ years: 25, icon: '💐', title: '銀婚式' });
  assert.ok(getElement('dateMoviePartner').innerHTML.includes(`src="${def.asset}"`), def.id + ': anniversary');
  api.finishDateMovie();
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
console.log(`PARTNER CAST PNG TEST OK: ${partnerArt.length} PNGs x 5 sizes; saved relationships; companion/profile/dex/date/anniversary/first encounter; aliases, guests and hidden dex.`);
