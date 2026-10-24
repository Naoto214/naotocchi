// Conversation v2 Pilot を実ゲームの closure で確かめる(tests/helpers/runtime-harness.cjs)。
// 掛け合いの順番と話者、途中で割り込まれないこと、選択肢の返事・無操作・中断、reload、セーブへの影響。
const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const {harness} = require('./helpers/runtime-harness.cjs');
global.window = global;
require('../character-world-master.v1.js');
const master = global.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;

const KEY = 'naotocchi-conversation-v1';
function memoryStorage(store = new Map()) {
  return {store, getItem:k => store.has(k) ? store.get(k) : null, setItem:(k, v) => store.set(k, String(v)), removeItem:k => store.delete(k)};
}
function boot({store = new Map(), resume = false, seed = 7, partner = 'rock_octopus', companions = []} = {}) {
  const h = harness({deterministic:true, seed, storage:memoryStorage(store), resume});
  const shown = [];
  let tc = '';
  const speaker = h.get('speechSpeaker');
  Object.defineProperty(h.get('speechText'), 'textContent', {get:() => tc, set:v => {
    tc = String(v);
    if (tc) shown.push({text:tc, who:speaker.dataset.label, kind:null, at:vm.runInContext('Date.now()', h.sandbox)});
  }, configurable:true});
  // 吹き出しの話者の種類は本文のあとに付くので、直前に出た行へ書き込む
  let kind = '';
  Object.defineProperty(h.get('speechBubble').dataset, 'kind', {get:() => kind, set:v => { kind = String(v); if (shown.length) shown.at(-1).kind = kind; }, configurable:true});
  const s = h.api.state();
  if (!resume) {
    Object.assign(s, {regionId:'home', isSleeping:false, isSick:false, hunger:95, happiness:95, energy:95, health:100});
    if (partner) {
      const base = h.api.REGIONS.flatMap(r => r.candidates || []).find(c => c.id === partner);
      s.partner = JSON.parse(JSON.stringify({...base, id:partner, affection:80, bondCount:3, married:false}));
    } else s.partner = null;
    s.companions = companions.map(id => ({id, bond:90}));
  }
  h.api.setPresentCastFixture();
  return {h, s, shown, store};
}
function settle(h, s, ms) {
  for (let t = 0; t < ms; t += 250) { Object.assign(s, {hunger:95, happiness:95, energy:95, health:100}); h.advance(250); }
}
function waitUntilFree(h, s) {
  for (let i = 0; i < 200 && !h.api.conv2.canStart(); i++) settle(h, s, 250);
  assert.ok(h.api.conv2.canStart(), 'the home is free to start a conversation unit');
}
const unitDef = (h, id) => [...h.api.conv2.data.BANTERS, ...h.api.conv2.data.QUESTIONS].find(u => u.id === id);
const choiceButtons = h => h.get('speechChoices').children.filter(c => c.tagName === 'BUTTON');

test('a banter plays in order, each beat said by the right character, as one unit', () => {
  const {h, s, shown} = boot();
  waitUntilFree(h, s);
  shown.length = 0;
  assert.equal(h.api.conv2.startBanter('partner:rock_octopus'), true);
  const unit = h.api.conv2.unit();
  assert.equal(unit.kind, 'banter');
  const def = unitDef(h, unit.id);
  assert.ok(def.with === 'partner:rock_octopus' || def.with === 'partner', `${def.id} fits the octopus`);
  settle(h, s, 15000);
  const beats = shown.slice(0, def.beats.length);
  assert.deepEqual(beats.map(b => b.text), def.beats.map(b => b.text), 'beats in the written order');
  const label = s.partner.label;
  beats.forEach((b, i) => {
    assert.equal(b.kind, def.beats[i].role === 'pet' ? 'pet' : 'partner', `beat ${i} speaker kind`);
    if (def.beats[i].role === 'them') assert.equal(b.who, label);
  });
  for (let i = 1; i < beats.length; i++) assert.ok(beats[i].at - beats[i - 1].at >= 2400, 'each line stays up long enough to read');
  assert.equal(h.api.conv2.unit(), null, 'the unit is over');
});

test('no idle chatter or automatic event cuts into a banter; the automatic event speaks right after', () => {
  const {h, s, shown} = boot({seed:11});
  h.api.scheduleIdleGreeting();
  waitUntilFree(h, s);
  shown.length = 0;
  assert.ok(h.api.conv2.startBanter('partner:rock_octopus'));
  const def = unitDef(h, h.api.conv2.unit().id);
  settle(h, s, 1200);
  h.api.speakEvent('age', {partnerChance:0, companionChance:0});   // 誕生日などの自動の会話
  assert.equal(h.api.conv2.unit().held, 1, 'held until the banter ends');
  settle(h, s, 20000);
  const texts = shown.map(x => x.text);
  assert.deepEqual(texts.slice(0, def.beats.length), def.beats.map(b => b.text), 'nothing else in between');
  assert.ok(texts.length > def.beats.length, 'the held age line was said afterwards');
});

test('a care tap during a banter wins: the rest of the banter is dropped, never mixed in', () => {
  const {h, s, shown} = boot({seed:12});
  waitUntilFree(h, s);
  shown.length = 0;
  assert.ok(h.api.conv2.startBanter('partner:rock_octopus'));
  const def = unitDef(h, h.api.conv2.unit().id);
  settle(h, s, 500);
  h.dispatch(h.document, 'pointerdown');
  h.api.speakEvent('feed', {partnerChance:0, companionChance:0});
  assert.equal(h.api.conv2.unit(), null, 'the banter stopped');
  settle(h, s, 15000);
  const later = def.beats.slice(1).map(b => b.text);
  assert.ok(shown.every(x => !later.includes(x.text)), 'later banter lines are never shown');
  assert.ok(shown.some(x => !def.beats.some(b => b.text === x.text)), 'the feed reaction was said');
});

test('an automatic line held during a banter never wipes out the care reaction that cut the banter off', () => {
  const {h, s, shown} = boot({seed:15});
  waitUntilFree(h, s);
  assert.ok(h.api.conv2.startBanter('partner:rock_octopus'));
  settle(h, s, 600);
  h.api.speakEvent('age', {partnerChance:0, companionChance:0});
  assert.equal(h.api.conv2.unit().held, 1);
  shown.length = 0;
  h.dispatch(h.document, 'pointerdown');
  h.api.speakEvent('feed', {partnerChance:0, companionChance:0});
  settle(h, s, 250);
  const feedFirst = shown[0]?.text;
  const feedLines = Object.values(h.api.conv2.pools().feed).flat();
  assert.ok(feedLines.includes(feedFirst), `the feed reaction starts ("${feedFirst}")`);
  settle(h, s, 400);
  assert.equal(shown.at(-1).text, feedFirst, 'still the care reaction, not the held age line');
});

test('a visit starts a banter a little after arrival; one visit in four stays quiet; a used-up visitor stays quiet', () => {
  const {h, s} = boot({seed:13});
  h.api.scheduleIdleGreeting();   // ふだんの放置会話も流れている(Director の Home 時間が進む)
  const visit = () => {
    waitUntilFree(h, s);
    h.api.meguruMod.socialSession.emit('visit', 'partner:' + s.partner.id, {context:'home'});
    settle(h, s, 1500);
    assert.equal(h.api.conv2.unit(), null, 'not right at the door');
    let id = null;
    // 話せる間ができるまで少し待つことがある(ほかの放置会話の最中など)
    for (let t = 0; t < 30000; t += 250) { settle(h, s, 250); const u = h.api.conv2.unit(); if (u?.kind === 'banter') id = u.id; }
    return id;
  };
  // タコの掛け合いは専用(全員展開で 3 件以上)+ こいびと汎用。4 回目ごとの来訪は静かに過ごす回
  const pool = h.api.conv2.data.BANTERS.filter(u => u.with === 'partner:rock_octopus' || u.with === 'partner').length;
  const said = [];
  let n = 0, used = false;
  while (n < pool * 2 + 4) {
    n += 1;
    const id = visit();
    if (n % 4 === 0) { assert.equal(id, null, `visit ${n} is a quiet one`); continue; }
    if (!id) { used = true; break; }
    said.push(id);
  }
  assert.ok(used, 'the octopus runs out of things to say');
  assert.equal(said.length, pool, said.join(','));
  assert.equal(new Set(said).size, pool, 'all different banters');
  settle(h, s, 46 * 60e3);
  if ((n + 1) % 4 === 0) { n += 1; visit(); }
  assert.ok(visit(), 'after a while a banter comes back');
});

test('when the visitor leaves mid-banter, the banter stops instead of talking to nobody', () => {
  const {h, s, shown} = boot({seed:14});
  waitUntilFree(h, s);
  shown.length = 0;
  assert.ok(h.api.conv2.startBanter('partner:rock_octopus'));
  const def = unitDef(h, h.api.conv2.unit().id);
  h.api.conv2.visitorLeaves();
  settle(h, s, 15000);
  assert.ok(shown.length < def.beats.length, `stopped after ${shown.length} of ${def.beats.length}`);
  assert.equal(h.api.conv2.unit(), null);
});

test('a question shows big answer buttons; each answer gets its own reply; then the buttons go away', () => {
  for (const pick of [0, 1, 2]) {
    const {h, s, shown} = boot({seed:20 + pick, partner:null});
    waitUntilFree(h, s);
    shown.length = 0;
    const q = unitDef(h, 'q-cloud-seat');
    assert.ok(h.api.conv2.ask(q));
    assert.equal(shown.at(-1).text, q.ask);
    assert.equal(shown.at(-1).kind, 'pet');
    const buttons = choiceButtons(h);
    assert.deepEqual(buttons.map(b => b.textContent), q.choices.map(c => c.label));
    assert.equal(h.get('speechChoices').classList.contains('hidden'), false);
    assert.ok(h.get('speechSlot').classList.contains('is-asking'));
    settle(h, s, 3000);
    assert.equal(h.api.conv2.unit().awaiting, true, 'still waiting while the player reads');
    assert.ok(h.api.conv2.answer(pick));
    assert.equal(h.get('speechChoices').classList.contains('hidden'), true);
    assert.equal(h.get('speechSlot').classList.contains('is-asking'), false);
    assert.equal(h.api.conv2.answer(pick), false, 'a second tap does nothing');
    settle(h, s, 5000);
    assert.equal(shown.at(-1).text, q.choices[pick].reply.at(-1).text);
    assert.equal(h.api.conv2.unit(), null);
  }
});

test('a question with a visitor: the visitor sets it up and answers for the player choice', () => {
  const {h, s, shown} = boot({seed:30, partner:null, companions:['snail']});
  waitUntilFree(h, s);
  shown.length = 0;
  const q = unitDef(h, 'q-tell-them');
  assert.ok(h.api.conv2.ask(q, 'companion:snail'));
  settle(h, s, 3500);
  assert.equal(shown[0].text, q.lead[0].text);
  assert.equal(shown[0].kind, 'companion');
  assert.equal(shown[1].text, q.ask);
  assert.ok(h.api.conv2.answer(1));
  settle(h, s, 4000);
  assert.equal(shown.at(-1).text, q.choices[1].reply[0].text);
  assert.equal(shown.at(-1).kind, 'companion');
});

test('no answer: the question quietly ends; tapping elsewhere or opening a menu also ends it cleanly', () => {
  const {h, s, shown} = boot({seed:40, partner:null});
  waitUntilFree(h, s);
  const q = unitDef(h, 'q-tomorrow');
  assert.ok(h.api.conv2.ask(q));
  settle(h, s, 12500);
  assert.equal(h.get('speechChoices').classList.contains('hidden'), true, 'buttons gone after the wait');
  settle(h, s, 4000);
  assert.equal(h.api.conv2.unit(), null);
  const replies = q.choices.flatMap(c => c.reply.map(b => b.text));
  assert.ok(shown.every(x => !replies.includes(x.text)), 'no reply is invented for an answer that was never given');
  const after = shown.map(x => x.text).filter(t => t !== q.ask);
  assert.ok(after.every(t => h.api.conv2.data.NO_ANSWER_LINES.includes(t) || !replies.includes(t)));

  // ケア操作で中断
  waitUntilFree(h, s);
  assert.ok(h.api.conv2.ask(unitDef(h, 'q-secret')));
  h.dispatch(h.document, 'pointerdown');
  h.api.speakEvent('feed', {partnerChance:0, companionChance:0});
  assert.equal(h.api.conv2.unit(), null);
  assert.equal(h.get('speechChoices').classList.contains('hidden'), true);
  assert.equal(h.api.conv2.answer(0), false, 'a late tap on an old button does nothing');

  // 画面を隠す(バックグラウンド)で中断
  settle(h, s, 6000);
  waitUntilFree(h, s);
  assert.ok(h.api.conv2.ask(unitDef(h, 'q-hundred')));
  h.document.visibilityState = 'hidden';
  h.dispatch(h.document, 'visibilitychange');
  assert.equal(h.api.conv2.unit(), null);
  assert.equal(h.get('speechChoices').classList.contains('hidden'), true);
  h.document.visibilityState = 'visible';
  h.dispatch(h.document, 'visibilitychange');
});

test('questions stay rare and only come while someone is playing', () => {
  const {h, s, shown} = boot({seed:50, partner:null});
  const asks = new Set(h.api.conv2.data.QUESTIONS.map(q => q.ask));
  h.api.scheduleIdleGreeting();
  // 最初の 6 分は問いかけない
  for (let t = 0; t < 6 * 60e3; t += 1000) { if (t % 30000 === 0) h.dispatch(h.document, 'pointerdown'); settle(h, s, 1000); }
  assert.equal(shown.filter(x => asks.has(x.text)).length, 0, 'no question in the first minutes');
  // 30 秒ごとに触りながら 60 分
  shown.length = 0;
  for (let t = 0; t < 60 * 60e3; t += 1000) { if (t % 30000 === 0) h.dispatch(h.document, 'pointerdown'); settle(h, s, 1000); }
  const asked = shown.filter(x => asks.has(x.text)).length;
  assert.ok(asked >= 2 && asked <= 10, `${asked} questions in an hour of play`);
  // 触らずに眺めているだけの 40 分は問いかけない(最初の 3 分を除く)
  settle(h, s, 4 * 60e3);
  shown.length = 0;
  settle(h, s, 40 * 60e3);
  assert.equal(shown.filter(x => asks.has(x.text)).length, 0, 'nobody is playing: no questions');
});

test('reload: the same banter does not come back right away; the save file and schema are untouched', () => {
  const store = new Map();
  const a = boot({store, seed:60});
  waitUntilFree(a.h, a.s);
  assert.ok(a.h.api.conv2.startBanter('partner:rock_octopus'));
  const first = a.h.api.conv2.unit().id;
  settle(a.h, a.s, 15000);
  a.h.api.saveState();
  a.h.dispatch(a.h.window, 'pagehide');
  const save = store.get('naotocchi-save-v1');
  assert.doesNotMatch(save, /conv2|banter|b-octopus|q-cloud/i, 'no conversation units inside the game save');
  assert.equal(JSON.parse(save).schemaVersion, a.s.schemaVersion);
  assert.ok(JSON.parse(store.get(KEY)).units.some(([id]) => id === first), 'the unit history is in its own key');
  const b = boot({store, resume:true, seed:61});
  b.h.api.setPresentCastFixture();
  const seen = [];
  const pool = b.h.api.conv2.data.BANTERS.filter(u => u.with === 'partner:rock_octopus' || u.with === 'partner').length;
  for (let i = 0; i < pool + 1; i++) {
    waitUntilFree(b.h, b.s);
    if (!b.h.api.conv2.startBanter('partner:rock_octopus')) break;
    seen.push(b.h.api.conv2.unit().id);
    settle(b.h, b.s, 15000);
  }
  assert.ok(!seen.includes(first), `"${first}" did not come back after the reload (${seen.join(', ')})`);
  assert.ok(new Set(seen).size === seen.length, 'no repeats while cooling down');
  assert.ok(seen.length <= pool - 1, `octopus: ${pool - 1} left to say, then quiet`);
});

test('every partner and companion with its own banter can actually play it in the real game', () => {
  const units = (() => { const {h} = boot({partner:null}); return h.api.conv2.data.BANTERS.filter(u => u.with.includes(':')); })();
  for (const u of units) {
    const [kind, id] = u.with.split(':');
    const {h, s, shown} = boot({seed:70, partner:kind === 'partner' ? id : null, companions:kind === 'companion' ? [id] : []});
    // 専用だけを候補に残し、その一つを確実に選ばせる
    for (const other of h.api.conv2.data.BANTERS) if (other.id !== u.id) h.api.conv2.director().noteUnit(other.id, 'banter');
    waitUntilFree(h, s);
    shown.length = 0;
    assert.ok(h.api.conv2.startBanter(u.with), `${u.id} starts`);
    assert.equal(h.api.conv2.unit().id, u.id);
    settle(h, s, 15000);
    assert.deepEqual(shown.slice(0, u.beats.length).map(x => x.text), u.beats.map(b => b.text), `${u.id} plays fully`);
    const them = shown.find((x, i) => u.beats[i]?.role === 'them');
    const name = kind === 'partner' ? master.partners.find(p => p.id === id).label : null;
    if (name) assert.equal(them.who, name, `${u.id}: said by ${name}`);
    assert.equal(them.kind, kind);
  }
});

test('the life-event choice dialog (individuality) keeps banters and questions out, and stops one in progress', () => {
  const {h, s, shown} = boot({seed:80});
  waitUntilFree(h, s);
  h.api.conv2.setLifeEventOpen(true);
  assert.equal(h.api.conv2.canStart(), false, 'nothing starts behind the life-event dialog');
  assert.equal(h.api.conv2.startBanter('partner:rock_octopus'), false);
  h.api.conv2.setLifeEventOpen(false);
  assert.ok(h.api.conv2.startBanter('partner:rock_octopus'));
  const def = unitDef(h, h.api.conv2.unit().id);
  shown.length = 0;
  h.api.conv2.setLifeEventOpen(true);
  settle(h, s, 15000);
  assert.equal(h.api.conv2.unit(), null, 'the banter stopped');
  assert.ok(shown.every(x => !def.beats.slice(1).some(b => b.text === x.text)), 'no further banter lines while the dialog is open');
});
