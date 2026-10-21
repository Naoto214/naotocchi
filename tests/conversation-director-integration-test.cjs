// Conversation Director v1 を実ゲームの closure で確かめる(tests/helpers/runtime-harness.cjs)。
// 台詞の本文は変えない。いつ・誰が・どれを言うかと、記憶の保存だけを見る。
const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const {harness} = require('./helpers/runtime-harness.cjs');

const KEY = 'naotocchi-conversation-v1';
function memoryStorage(store = new Map(), {failConversation = false} = {}) {
  return {store, getItem:k => store.has(k) ? store.get(k) : null,
    setItem:(k, v) => { if (failConversation && k === KEY) throw new Error('quota'); store.set(k, String(v)); },
    removeItem:k => store.delete(k)};
}
function boot({store, resume = false, seed = 5, failConversation = false} = {}) {
  const storage = memoryStorage(store, {failConversation});
  const h = harness({deterministic:true, seed, storage, resume});
  const shown = [];
  let tc = '';
  Object.defineProperty(h.get('speechText'), 'textContent', {get:() => tc, set:v => { tc = String(v); if (tc) shown.push({text:tc, at:vm.runInContext('Date.now()', h.sandbox)}); }, configurable:true});
  const s = h.api.state();
  if (!resume) Object.assign(s, {regionId:'home', isSleeping:false, isSick:false, hunger:95, happiness:95, energy:95, health:100});
  return {h, s, shown, storage};
}
function idle(h, s, ms) {
  for (let t = 0; t < ms; t += 1000) { Object.assign(s, {hunger:95, happiness:95, energy:95, health:100}); h.advance(1000); if (t % 3000 === 0) h.api.render(); }
}

test('the Director module is loaded and drives idle chatter: no line repeats within 24 utterances', () => {
  const {h, s, shown} = boot();
  assert.ok(h.sandbox.NaotocchiConversationDirector, 'conversation-director.js is available to the page');
  h.api.scheduleIdleGreeting();
  idle(h, s, 40 * 60e3);
  const texts = shown.map(x => x.text);
  assert.ok(texts.length > 60, `${texts.length} lines in 40 minutes`);
  for (let i = 0; i < texts.length; i++) for (let j = Math.max(0, i - 24); j < i; j++) assert.notEqual(texts[i], texts[j], `"${texts[i]}" repeated after ${i - j} lines`);
});

test('pace: lively for the first minutes, then 12–24s apart while only watching; a tap brings it back', () => {
  const {h, s, shown} = boot({seed:9});
  h.api.scheduleIdleGreeting();
  idle(h, s, 3 * 60e3);
  const early = shown.length;
  assert.ok(early >= 14 && early <= 34, `first 3 minutes: ${early} lines`);
  idle(h, s, 4 * 60e3);
  shown.length = 0;
  idle(h, s, 20 * 60e3);
  const perMin = shown.length / 20;
  assert.ok(perMin >= 2.3 && perMin <= 5, `long idle: ${perMin.toFixed(2)} lines/min`);
  shown.length = 0;
  h.dispatch(h.document, 'pointerdown');
  idle(h, s, 2 * 60e3);
  assert.ok(shown.length >= 9, `after a tap: ${shown.length} lines in 2 minutes`);
});

test('only lines that were actually shown are remembered (a cancelled beat leaves no trace)', () => {
  const store = new Map();
  const {h, shown} = boot({store});
  h.api.setPresentCastFixture();
  // sodachi の会話は、同じ操作の feed の会話にすぐ上書きされる(監査 CA-18)
  h.api.speakEvent('sodachi', {partnerChance:0, companionChance:0});
  h.api.speakEvent('feed', {partnerChance:0, companionChance:0});
  h.advance(12000);
  h.dispatch(h.window, 'pagehide');
  const saved = JSON.parse(store.get(KEY));
  assert.equal(saved.seq, shown.length, `remembered ${saved.seq}, shown ${shown.length}`);
  assert.equal(saved.lines.length, new Set(shown.map(x => x.text)).size);
});

test('history survives a reload in its own key; the save file and schema are untouched', () => {
  const store = new Map();
  const a = boot({store, seed:3});
  a.h.api.scheduleIdleGreeting();
  idle(a.h, a.s, 15 * 60e3);
  const before = a.shown.map(x => x.text).slice(-24);
  a.h.api.saveState();
  a.h.dispatch(a.h.window, 'pagehide');
  assert.ok(store.has(KEY) && store.has('naotocchi-save-v1'));
  const save = store.get('naotocchi-save-v1');
  assert.doesNotMatch(save, /conversation|recentConversation|lastIdleGreeting/i, 'no conversation data inside the game save');
  assert.equal(JSON.parse(save).schemaVersion, a.s.schemaVersion);
  const b = boot({store, resume:true, seed:4});
  b.h.api.scheduleIdleGreeting();
  idle(b.h, b.s, 4 * 60e3);
  const after = b.shown.map(x => x.text).slice(0, 24);
  assert.ok(after.length >= 10);
  for (const line of after) assert.ok(!before.includes(line), `"${line}" repeated right after reload`);
});

test('a full conversation storage failure or broken history never breaks the game', () => {
  const broken = new Map([[KEY, '{"v":1,"lines":"oops"']]);
  const a = boot({store:broken});
  a.h.api.scheduleIdleGreeting();
  idle(a.h, a.s, 3 * 60e3);
  assert.ok(a.shown.length > 5, 'speaks with a broken history');
  const b = boot({failConversation:true});
  b.h.api.scheduleIdleGreeting();
  idle(b.h, b.s, 3 * 60e3);
  b.h.dispatch(b.h.window, 'pagehide');
  assert.ok(b.shown.length > 5, 'speaks when the history cannot be written');
  b.h.api.saveState();
  assert.ok(b.storage.store.has('naotocchi-save-v1'), 'the game save still works');
});

test('the full wipe also forgets the conversation history', () => {
  const store = new Map();
  const {h, s} = boot({store});
  h.api.scheduleIdleGreeting();
  idle(h, s, 2 * 60e3);
  h.dispatch(h.window, 'pagehide');
  assert.ok(store.has(KEY));
  h.api.doWipe();
  assert.ok(!store.has(KEY));
});

test('quiet characters keep their own voice; the box can still say something silly now and then', () => {
  const {h, s, shown} = boot({seed:21});
  h.api.setPresentCastFixture();
  s.companions = [{id:'box', bond:100}];
  s.hunger = 40;   // 本人は黙るので、はこだけが話す状況
  h.api.scheduleIdleGreeting();
  const own = ['……ただのはこです', '中の話はまだしません', '置いてあっても参加してる'];
  for (let t = 0; t < 120 * 60e3; t += 1000) { s.hunger = 40; h.advance(1000); }
  const lines = shown.map(x => x.text);
  const ownN = lines.filter(t => own.includes(t)).length, other = lines.length - ownN;
  assert.ok(ownN >= 3, `own lines ${ownN}`);
  assert.ok(other >= 1, `the box sometimes says a generic line (${other})`);
  assert.ok(other <= ownN * 2, `generic lines stay limited: own ${ownN} / generic ${other}`);
});
