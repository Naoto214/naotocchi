const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Exercise the actual game closure with an ordered clock and separate DOM nodes.
// Unlike the boot smoke test, callbacks really execute here.
let now = 1000;
let timerId = 0;
let random = 0.25;
const timers = new Map();
const elements = new Map();
const spoken = [];
const events = [];
const captions = [];
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
  window: { addEventListener: noop, innerWidth: 390, innerHeight: 844, confirm: () => false, NAOTOCCHI_CHARACTER_WORLD_MASTER_V1: master },
  localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
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
    getState: () => state, recent: () => [...recentConversationLines],
    reset: (patch) => {
      clearConversationTimers(); clearDateMovieTimers(); hideSpeechBubble(); closeAllMenuOverlays();
      state = Object.assign(freshState(), {
        stage: STAGE.GROWING, speciesLine: WORLD_MASTER.playerSpecies.normal[0].id,
        stageIndex: stageForAge(25), ageTicks: 25 * AGE_TICKS_PER_YEAR, sodachi: 55, maxSodachi: 55,
        hunger: 50, energy: 90, happiness: 80, health: 100,
      }, patch);
      recentConversationLines = []; message = ''; gameActive = false; dateOpen = false;
    },
  };
`;
assert.ok(/\}\)\(\);\s*$/.test(source), 'game closure missing');
vm.runInNewContext(source.replace(/\}\)\(\);\s*$/, expose + '\n})();'), sandbox);
const api = sandbox.dialogue;
function reset(patch = {}) {
  api.reset(patch); timers.clear(); spoken.length = 0; events.length = 0; captions.length = 0;
  random = 0.25;
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
