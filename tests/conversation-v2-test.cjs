// Conversation v2 Pilot のデータと、Director の「単位」(掛け合い・問いかけ)の履歴を確かめる。DOM・ゲームは使わない。
const assert = require('node:assert/strict');
const {test} = require('node:test');
const B = require('../conversation-banter.js');
const {createDirector} = require('../conversation-director.js');
global.window = global;
require('../character-world-master.v1.js');
const master = global.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;

const QUIET = ['partner:high_eagle', 'partner:desert_scorpion', 'partner:swamp_croc', 'companion:sekizou', 'companion:box', 'companion:watcher'];
const isQuiet = key => QUIET.includes(key);

test('the pilot data is well formed: pilot-sized, short, no spaces, alternating speakers, button-sized labels', () => {
  assert.deepEqual(B.validate(), []);
  assert.ok(B.BANTERS.length >= 20 && B.BANTERS.length <= 30, `${B.BANTERS.length} banters`);
  assert.ok(B.QUESTIONS.length >= 10 && B.QUESTIONS.length <= 15, `${B.QUESTIONS.length} questions`);
  for (const u of B.BANTERS) for (const b of u.beats) assert.ok([...b.text].length <= 20, `${u.id}: "${b.text}" is short`);
  for (const q of B.QUESTIONS) assert.ok(q.choices.length >= 2 && q.choices.length <= 4, q.id);
});

test('every character-specific unit names a real partner or companion', () => {
  const ids = new Set([...master.partners.map(p => 'partner:' + p.id),
    ...[...master.companions.normal, ...master.companions.rare].map(c => 'companion:' + c.id)]);
  for (const u of [...B.BANTERS, ...B.QUESTIONS]) if (u.with && u.with.includes(':')) assert.ok(ids.has(u.with), `${u.id}: ${u.with}`);
});

test('candidates: own banters first; quiet characters never get the generic ones', () => {
  const octo = B.banterCandidates('partner:rock_octopus', {isQuiet});
  assert.deepEqual(octo.specific.map(u => u.id).sort(), ['b-octopus-hands', 'b-octopus-snack']);
  assert.ok(octo.generic.length >= 1 && octo.generic.every(u => u.with === 'partner'));
  const eagle = B.banterCandidates('partner:high_eagle', {isQuiet});
  assert.deepEqual(eagle.specific.map(u => u.id), ['b-eagle-flight']);
  assert.deepEqual(eagle.generic, [], 'the quiet eagle does not say generic chatter');
  const box = B.banterCandidates('companion:box', {isQuiet});
  assert.deepEqual(box.generic, []);
  assert.deepEqual(B.banterCandidates(null).specific, []);
  // 本人だけの問いかけは、来訪者がいなくても出せる。来訪者向けは種類が合うときだけ
  const alone = B.questionCandidates(null, {isQuiet});
  assert.ok(alone.solo.length >= 10 && alone.withVisitor.length === 0);
  assert.deepEqual(B.questionCandidates('companion:snail', {isQuiet}).withVisitor.map(q => q.id), ['q-tell-them']);
  assert.deepEqual(B.questionCandidates('partner:robot_neighbor', {isQuiet}).withVisitor.map(q => q.id), ['q-what-partner-does']);
  assert.deepEqual(B.questionCandidates('partner:swamp_croc', {isQuiet}).withVisitor, [], 'no generic questions for a quiet partner');
});

test('Director units: never repeat a unit within its cooldown; unseen units first; kinds keep their own gap', () => {
  let t = 0;
  const d = createDirector({now:() => t, random:() => 0.5, config:{unitCooldownMs:10 * 60e3, maxCountedGapMs:Infinity}});
  const ids = ['a', 'b', 'c'];
  const seen = [];
  for (let i = 0; i < 3; i++) { const id = d.pickUnit(ids); seen.push(id); d.noteUnit(id, 'banter'); t += 1000; }
  assert.deepEqual([...seen].sort(), ids, 'each one once before any repeat');
  assert.equal(d.pickUnit(ids), null, 'all three are cooling down: say nothing rather than repeat');
  assert.equal(d.unitReady('banter', 60e3), false);
  assert.equal(d.unitReady('question', 60e3), true, 'a banter does not delay a question');
  t = 10 * 60e3;   // ちょうど最初の一つだけが cooldown を抜けた
  assert.equal(d.pickUnit(ids), seen[0], 'the oldest comes back first after the cooldown');
  assert.equal(d.unitReady('banter', 60e3), true);
});

test('Director units are saved with the history and older histories without units still load', () => {
  let t = 0;
  const store = new Map();
  const storage = {getItem:k => store.get(k) ?? null, setItem:(k, v) => store.set(k, v), removeItem:k => store.delete(k)};
  const a = createDirector({now:() => t, storage, config:{maxCountedGapMs:Infinity}});
  a.noteUnit('b-owl-late', 'banter');
  t += 5000;
  assert.ok(a.save());
  const b = createDirector({now:() => t, storage});
  assert.ok(b.load());
  assert.equal(b.pickUnit(['b-owl-late']), null, 'still cooling down after a reload');
  assert.equal(b.unitReady('banter', 60e3), false);
  const old = JSON.parse(store.get('naotocchi-conversation-v1'));
  delete old.units; delete old.unitKinds;
  const c = createDirector({storage:{getItem:() => JSON.stringify(old), setItem() {}, removeItem() {}}});
  assert.ok(c.load(), 'a v1 history from before the pilot loads');
  assert.equal(c.pickUnit(['b-owl-late']), 'b-owl-late');
  b.reset();
  assert.equal(b.pickUnit(['b-owl-late']), 'b-owl-late', 'the full wipe forgets units too');
});
