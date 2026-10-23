// Conversation 全対象展開(2026-10-23): こいびと 18・なかま 26・通常 100 本・クイック 50 本・問いかけ・ほかのあそび。
// 件数だけでなく、重複・似すぎ・素の褒め言葉・寡黙なキャラの口数・気質の出し分け、なおぽよ。/ CARD GAME の読み取りを確かめる。
// 通常 100 本・クイック 50 本の実ゲームでの再生は conversation-postgame-test / conversation-quick-test が見る。
const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const B = require('../conversation-banter.js');
const PG = require('../conversation-postgame.js');
const Q = require('../conversation-quick.js');
const A = require('../conversation-away.js');
const {harness} = require('./helpers/runtime-harness.cjs');
global.window = global;
require('../character-world-master.v1.js');
const master = global.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;

const QUIET = ['partner:high_eagle', 'partner:desert_scorpion', 'partner:swamp_croc', 'companion:sekizou', 'companion:box', 'companion:watcher'];
const cast = () => [...master.partners.map(p => 'partner:' + p.id), ...[...master.companions.normal, ...master.companions.rare].map(c => 'companion:' + c.id)];

// すべての台詞を {id, text, unit} に
function allLines() {
  const out = [];
  const add = (unit, where, text) => out.push({unit, id:`${unit}${where}`, text});
  for (const u of B.BANTERS) u.beats.forEach((b, i) => add(u.id, `[${i}]`, b.text));
  for (const q of B.QUESTIONS) { add(q.id, '.ask', q.ask); q.lead.forEach((b, i) => add(q.id, `.lead${i}`, b.text)); q.choices.forEach((c, i) => c.reply.forEach((b, j) => add(q.id, `.c${i}[${j}]`, b.text))); }
  for (const u of PG.UNITS) {
    if (u.kind === 'question') { add(u.id, '.ask', u.ask); u.choices.forEach((c, i) => c.reply.forEach((b, j) => add(u.id, `.c${i}[${j}]`, b.text))); }
    else u.beats.forEach((b, i) => add(u.id, `[${i}]`, b.text));
  }
  for (const u of Q.UNITS) u.beats.forEach((b, i) => add(u.id, `[${i}]`, b.text));
  for (const u of A.UNITS) u.beats.forEach((b, i) => add(u.id, `[${i}]`, b.text));
  return out;
}
const norm = t => t.normalize('NFKC').replace(/[\s。、!?！？…「」]/g, '');

test('coverage: all 44 characters have at least 3 exchanges of their own; no unknown characters', () => {
  const ids = cast();
  assert.equal(ids.filter(k => k.startsWith('partner:')).length, 18, '18 partners');
  assert.equal(ids.filter(k => k.startsWith('companion:')).length, 26, '26 companions');
  const counts = Object.fromEntries(ids.map(k => [k, 0]));
  for (const u of B.BANTERS) if (u.with.includes(':')) {
    assert.ok(u.with in counts, `${u.id}: ${u.with} is a real character`);
    counts[u.with] += 1;
  }
  const thin = Object.entries(counts).filter(([, n]) => n < 3);
  assert.deepEqual(thin, [], 'every character has 3+ own exchanges');
  // 記録: 全員の件数(coverage 表は docs に)
  assert.ok(Object.values(counts).reduce((a, b) => a + b, 0) >= 44 * 3);
});

test('coverage: 100 normal games and 50 quick games, each with lines of its own', () => {
  const h = harness({deterministic:true});
  const normal = h.api.games.map(g => g.id).filter(id => !String(id).startsWith('quick'));
  const quick = h.api.QUICK_GAMES.map(g => g.id);
  assert.equal(normal.length, 100); assert.equal(quick.length, 50);
  for (const id of normal) assert.ok(PG.UNITS.filter(u => u.games.length <= 2 && u.games.includes(id)).length >= 3, `${id}: 3+ own units`);
  for (const id of quick) assert.ok(Q.UNITS.filter(u => u.games?.includes(id)).length >= 3, `${id}: 3+ own units`);
  // クイックはテンポ優先: ほとんど 1〜2 行
  const three = Q.UNITS.filter(u => u.beats.length === 3).length;
  assert.ok(three / Q.UNITS.length <= 0.05, `${three} quick units have 3 lines`);
});

test('existing lines are kept: the pilot units of #419 / #421 / #429 are still there word for word', () => {
  // 代表(各 Pilot の最初の台詞)。全員展開で既存の面白い会話を上書きしていない
  const keep = {
    'b-octopus-hands': ['手、あいてる?', '二本ともあいてる', '少ないね'],
    'b-box-inside': ['なか、何が入ってるの?', '……ただのはこです', '答えになってないよ', '……なってないのが中身です'],
    'pg-fish-bigone': ['大物を逃した', '……見てないけど、たぶん大物'],
    'pg-crane-arm': ['とれた?', 'アームと、まだ話がついてない'],
    'q-wait-itch': ['まてって言われると', 'うごきたくなる'],
    'q-mix-perfect': ['20こぜんぶ', '……いまの、だれがやったの?'],
  };
  const units = [...B.BANTERS, ...PG.UNITS, ...Q.UNITS];
  for (const [id, texts] of Object.entries(keep)) assert.deepEqual(units.find(u => u.id === id)?.beats.map(b => b.text), texts, id);
  for (const q of ['q-cloud-seat', 'q-tomorrow', 'q-two-of-me']) assert.ok(B.QUESTIONS.some(x => x.id === q), q);
});

test('quality: no line is used twice, nothing is a near copy of another, no plain praise, no harsh words', () => {
  const lines = allLines();
  // 既存 Pilot どうしで重なっていた相づち(意図的な言い回し)だけ許す
  const allowed = new Set(['おしかったね', 'まねしないで', 'ずるい']);
  const seen = new Map(), dup = [];
  for (const l of lines) {
    const k = norm(l.text);
    if (k.length < 3 || allowed.has(k)) continue;
    if (seen.has(k) && seen.get(k) !== l.unit) dup.push(`${seen.get(k)} / ${l.id}: ${l.text}`);
    else seen.set(k, l.unit);
  }
  assert.deepEqual(dup, [], 'no line used in two different units');
  // 似すぎ(2 文字ずつの重なり 75% 以上)
  const grams = t => { const s = norm(t), g = new Set(); for (let i = 0; i < s.length - 1; i++) g.add(s.slice(i, i + 2)); return g; };
  const long = lines.filter(l => norm(l.text).length >= 7).map(l => ({...l, g:grams(l.text)}));
  const near = [];
  for (let i = 0; i < long.length; i++) for (let j = i + 1; j < long.length; j++) {
    if (long[i].unit === long[j].unit) continue;
    let n = 0; for (const x of long[i].g) if (long[j].g.has(x)) n++;
    const jac = n / (long[i].g.size + long[j].g.size - n);
    if (jac >= 0.75) near.push(`${long[i].id} / ${long[j].id}: ${long[i].text} / ${long[j].text}`);
  }
  assert.deepEqual(near, [], 'no near copies');
  const flat = /^(すごい|やった|ざんねん|残念|おしい|がんばった|えらい|さすが|よくできました)[!！。]*$/;
  assert.deepEqual(lines.filter(l => flat.test(l.text)).map(l => l.id), [], 'no line that is only a plain cheer');
  assert.deepEqual(lines.filter(l => /死|殺|血|しね|バカ|ばかやろう|きらい/.test(l.text)).map(l => `${l.id}: ${l.text}`), [], 'no harsh words');
  assert.deepEqual(lines.filter(l => /[ 　]/.test(l.text)).map(l => l.id), [], 'no spaces');
  // 「〜のほうが〜」型のオチは使いすぎない
  assert.ok(lines.filter(l => /のほうが/.test(l.text)).length <= 20);
});

test('quiet characters stay quiet: short replies, mostly silences', () => {
  for (const key of QUIET) {
    const own = B.BANTERS.filter(u => u.with === key);
    assert.ok(own.length >= 3, key);
    for (const u of own) for (const b of u.beats) if (b.role === 'them') assert.ok([...b.text].length <= 16, `${u.id}: "${b.text}" is short for a quiet character`);
    const silences = own.flatMap(u => u.beats.filter(b => b.role === 'them')).filter(b => b.text.startsWith('……')).length;
    assert.ok(silences >= 2, `${key}: speaks in silences (${silences})`);
  }
});

test('questions: more and varied; every choice gets a different reply; temperament questions only for that temperament', () => {
  assert.ok(B.QUESTIONS.length >= 35, `${B.QUESTIONS.length} questions`);
  assert.ok(B.QUESTIONS.filter(q => !q.with).length >= 28, 'solo questions');
  assert.ok(B.QUESTIONS.filter(q => q.with && q.with.includes(':')).length >= 8, 'questions for a specific visitor');
  for (const q of B.QUESTIONS) {
    const replies = q.choices.map(c => norm(c.reply.map(b => b.text).join('')));
    assert.equal(new Set(replies).size, replies.length, `${q.id}: each choice has its own reply`);
  }
  const traits = B.QUESTIONS.filter(q => q.trait);
  assert.ok(traits.length >= 5);
  const base = {curiosity:3, boldness:3, sociability:3, persistence:3};
  const plain = B.questionCandidates(null, {temperament:base}).solo;
  assert.ok(traits.every(q => !plain.includes(q)), 'an average temperament gets no temperament question');
  for (const q of traits) {
    const [, key, sign] = /^([a-z]+)([+-])$/.exec(q.trait);
    const fits = B.questionCandidates(null, {temperament:{...base, [key]:sign === '+' ? 5 : 1}}).solo;
    assert.ok(fits.includes(q), `${q.id} for ${q.trait}`);
  }
  assert.ok(B.questionCandidates(null, {}).solo.every(q => !q.trait), 'no temperament known: no temperament questions');
});

// ---- なおぽよ。・CARD GAME ----
const cardRaw = rows => JSON.stringify({format:'naotocchi-records', version:1, catalog:[], decks:[], rows});
const row = (id, endedAt, mode, human, difficulty, winner, round = 6) => [id, endedAt - 60e3, endedAt, mode, human, difficulty, null, winner, 1, 1, round, 0, 0, [], []];
const poyo = cleared => JSON.stringify({version:1, index:0, state:{}, history:[], cleared});

test('away: the saved records of naopoyo and CARD GAME are read, never written; the first look only remembers', () => {
  const now = 10 * 60 * 60e3;
  let r = A.detect(null, {naopoyo:poyo([1, 2]), card:cardRaw([row('m1', now - 1000, 'cpu', 'A', 'beginner', 'A')])}, now);
  assert.equal(r.event, null, 'first look: remember only (old results are not news)');
  r = A.detect(r.next, {naopoyo:poyo([1, 2, 3]), card:cardRaw([row('m1', now - 1000, 'cpu', 'A', 'beginner', 'A')])}, now);
  assert.deepEqual({...r.event}, {source:'naopoyo', kind:'clear', count:1});
  r = A.detect(r.next, {naopoyo:poyo([1, 2, 3, 4, 5]), card:null}, now);
  assert.equal(r.event.kind, 'clears');
  const m = r.next;
  const card = (winner, difficulty, mode = 'cpu') => A.detect(m, {naopoyo:poyo([1, 2, 3, 4, 5]), card:cardRaw([row('m1', now - 1000, 'cpu', 'A', 'beginner', 'A'), row('m2', now - 500, mode, mode === 'cpu' ? 'A' : null, mode === 'cpu' ? difficulty : null, winner)])}, now).event;
  assert.equal(card('A', 'beginner').kind, 'win');
  assert.equal(card('A', 'intermediate').kind, 'bigwin');
  assert.equal(card('B', 'beginner').kind, 'loss');
  assert.equal(card(null, 'beginner').kind, 'draw');
  assert.equal(card('A', null, 'hotseat').kind, 'pair');
  // 古い対戦・こわれた記録・形の変わった記録は黙る
  assert.equal(A.detect(m, {naopoyo:null, card:cardRaw([row('m3', now - 60 * 60e3, 'cpu', 'A', 'beginner', 'A')])}, now).event, null, 'an old match is not news');
  assert.equal(A.detect(m, {naopoyo:'{broken', card:'{"format":"other"}'}, now).event, null);
  assert.equal(A.detect(m, {naopoyo:JSON.stringify({version:2, cleared:[9]}), card:null}, now).event, null);
  assert.deepEqual(A.validate(), []);
  for (const e of [{source:'naopoyo', kind:'clear'}, {source:'naopoyo', kind:'clears'}, {source:'card', kind:'win'}, {source:'card', kind:'bigwin'}, {source:'card', kind:'loss'}, {source:'card', kind:'draw'}, {source:'card', kind:'pair'}])
    assert.ok(A.candidates(e).length >= 1, `${e.source}/${e.kind}`);
});

function memoryStorage(store = new Map()) {
  return {store, getItem:k => store.has(k) ? store.get(k) : null, setItem:(k, v) => store.set(k, String(v)), removeItem:k => store.delete(k)};
}
function bootAway(store) {
  const h = harness({deterministic:true, seed:9, storage:memoryStorage(store)});
  const shown = [];
  let tc = '';
  Object.defineProperty(h.get('speechText'), 'textContent', {get:() => tc, set:v => { tc = String(v); if (tc) shown.push(tc); }, configurable:true});
  const s = h.api.state();
  Object.assign(s, {stage:'growing', isSleeping:false, isSick:false, hunger:95, happiness:95, energy:95, health:100, regionId:'home'});
  s.partner = null; s.companions = [];
  vm.runInContext('Math.random = () => 0.01', h.sandbox);
  h.api.render();
  h.api.conv2.checkAway();   // 起動時の確認(ブラウザでは読み込みの直後に走る)
  return {h, s, shown};
}
const settle = (h, s, ms) => { for (let t = 0; t < ms; t += 250) { Object.assign(s, {hunger:95, happiness:95, energy:95, health:100}); h.advance(250); } };

test('away in the real home: coming back from CARD GAME brings one line; the game records are untouched; it is said once', () => {
  const store = new Map();
  const {h, s, shown} = bootAway(store);
  settle(h, s, 5000);
  assert.ok(store.has(A.MARKER_KEY), 'the first look remembers where things are');
  const now = vm.runInContext('Date.now()', h.sandbox);
  const raw = cardRaw([row('x1', now - 2000, 'cpu', 'A', 'beginner', 'A')]);
  store.set(A.KEYS.card, raw);
  const naopoyoBefore = store.get(A.KEYS.naopoyo) ?? null;
  // ページを離れて(CARD GAME)、bfcache で戻ってきた
  h.dispatch(h.window, 'pagehide');
  h.dispatch(h.window, 'pageshow', {persisted:true});
  settle(h, s, 2000);
  const unit = h.api.conv2.unit() || (settle(h, s, 1500), h.api.conv2.unit());
  assert.equal(unit?.kind, 'away', 'a coming-back line starts');
  const def = A.UNITS.find(u => u.id === unit.id);
  assert.ok(def.source === 'card' && def.kinds.includes('win'), def.id);
  settle(h, s, 15000);
  assert.ok(def.beats.every(b => shown.includes(b.text)), 'said in full');
  assert.equal(store.get(A.KEYS.card), raw, 'CARD GAME records unchanged');
  assert.equal(store.get(A.KEYS.naopoyo) ?? null, naopoyoBefore, 'naopoyo save unchanged');
  assert.doesNotMatch(store.get('naotocchi-save-v1') || '', /a-card|naotocchi-records|away/, 'nothing in the game save');
  // 同じ対戦は二度話題にしない(reload・もう一度戻る)
  const count = shown.length;
  h.dispatch(h.window, 'pageshow', {persisted:true});
  settle(h, s, 10000);
  assert.equal(h.api.conv2.unit(), null);
  assert.equal(shown.filter(t => def.beats.some(b => b.text === t)).length, def.beats.length, 'not said again');
  assert.ok(shown.length >= count);
});

test('away: a menu or a game in front of home keeps the line from starting, and it does not wait for later', () => {
  const store = new Map();
  const {h, s} = bootAway(store);
  settle(h, s, 5000);
  const now = vm.runInContext('Date.now()', h.sandbox);
  store.set(A.KEYS.naopoyo, poyo([1]));
  // マーカーは naopoyo なしで覚えていた → なおぽよ。は「はじめて見た」扱いで話題にしない
  h.dispatch(h.window, 'pageshow', {persisted:true});
  settle(h, s, 6000);
  assert.equal(h.api.conv2.unit(), null, 'a save seen for the first time is only remembered');
  store.set(A.KEYS.naopoyo, poyo([1, 2]));
  store.set(A.KEYS.card, cardRaw([row('y1', now, 'cpu', 'A', 'beginner', 'B')]));
  h.dispatch(h.window, 'pageshow', {persisted:true});
  h.api.openExclusiveMenu('travel');
  settle(h, s, 20000);
  assert.equal(h.api.conv2.unit(), null, 'nothing behind the menu');
  h.api.closeAllMenuOverlays(); h.api.render();
  settle(h, s, 20000);
  assert.equal(h.api.conv2.unit(), null, 'the chance passed; nothing starts later out of nowhere');
});
