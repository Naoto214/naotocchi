// Conversation Director v1 の単体テスト(DOM なし・時計と乱数は注入)。
// docs/design/conversation-director-v1-2026-10-12.md §4〜§6、§9.4
const assert = require('node:assert/strict');
const {test} = require('node:test');
const D = require('../conversation-director.js');

function make(opts = {}) {
  let t = 0, i = 0;
  const seq = opts.randoms || null;
  const clock = {get now() { return t; }, set(v) { t = v; }, add(ms) { t += ms; }};
  const random = seq ? () => seq[i++ % seq.length] : (() => { let a = opts.seed || 7; return () => { a = (a * 16807) % 2147483647; return (a - 1) / 2147483646; }; })();
  const director = D.createDirector({now:() => clock.now, random, storage:opts.storage || null, families:opts.families || [], quietSpeakers:opts.quiet || [], config:opts.config || {}});
  return {director, clock};
}
// 1 分以上の空白は「画面を見ていない時間」として数えないので、長い時間は 30 秒ずつ進める
function wait(d, clock, ms) { for (let left = ms; left > 0; left -= 30e3) { clock.add(Math.min(30e3, left)); d.rareReady(); } }
const POOL = Array.from({length:40}, (_, k) => `せりふ${k}`);
function speak(d, clock, pool, n, gapMs = 8000, opts = {}) {
  const out = [];
  for (let k = 0; k < n; k++) { clock.add(gapMs); const line = d.pick(pool, opts); out.push(line); d.noteShown(line, opts.speaker || 'pet'); }
  return out;
}

test('a shown line does not come back within the window or the cooldown', () => {
  const {director, clock} = make();
  // 40 行 × 30 秒 = 20 分 > 15 分。プールが足りるので、窓と cooldown の両方が守られる
  const out = speak(director, clock, POOL, 400, 30e3);
  const last = new Map();
  out.forEach((line, k) => {
    if (last.has(line)) {
      assert.ok(k - last.get(line) > Math.min(48, Math.floor(POOL.length * 0.6)), `${line} came back after ${k - last.get(line)} lines`);
      assert.ok((k - last.get(line)) * 30e3 >= 15 * 60e3, 'and not before the 15 minute cooldown');
    }
    last.set(line, k);
  });
  assert.equal(new Set(out).size, POOL.length, 'every line of the pool is still reachable');
});

test('small pools never go silent or loop: LRU fallback when everything is recent', () => {
  for (const size of [1, 2, 3, 5]) {
    const {director, clock} = make();
    const pool = POOL.slice(0, size);
    const out = speak(director, clock, pool, 60, 1000);
    assert.ok(out.every(Boolean), `pool of ${size} always answers`);
    assert.equal(new Set(out).size, size, `all ${size} lines are used`);
    if (size > 1) for (let k = 1; k < out.length; k++) assert.notEqual(out[k], out[k - 1], `pool of ${size} does not repeat back to back`);
  }
  const {director} = make();
  assert.equal(director.pick([]), null);
  assert.equal(director.pick(['', null]), null);
});

test('picking alone records nothing: only shown lines count', () => {
  const {director, clock} = make({randoms:[0]});
  const pool = ['あ', 'い', 'う'];
  for (let k = 0; k < 20; k++) { clock.add(1000); assert.equal(director.pick(pool), 'あ', 'unshown picks do not move the history'); }
  director.noteShown('あ', 'pet');
  clock.add(1000);
  assert.notEqual(director.pick(pool), 'あ');
});

test('the same text in another pool counts as the same line; avoid keeps a beat from echoing the message line', () => {
  const {director, clock} = make();
  director.noteShown('もう1かい!', 'companion:otter');
  clock.add(1000);
  for (let k = 0; k < 20; k++) assert.notEqual(director.pick(['もう1かい!', 'もっと!', 'いまのもう1かい!']), 'もう1かい!');
  for (let k = 0; k < 20; k++) assert.notEqual(director.pick(['まぶたが先に帰った', 'もうむり。ねる'], {avoid:['🌙まぶたが先に帰った']}), 'まぶたが先に帰った');
  assert.equal(director.pick(['まぶたが先に帰った'], {avoid:['まぶたが先に帰った']}), 'まぶたが先に帰った', 'avoid never empties the pool');
});

test('near-identical lines (family) are not shown back to back', () => {
  const families = [{id:'eyelids', lines:['まぶたが先に帰った', 'まぶたと交渉が終わった']}];
  const {director, clock} = make({families});
  director.noteShown('まぶたが先に帰った', 'pet');
  clock.add(60e3);
  for (let k = 0; k < 30; k++) assert.notEqual(director.pick(['まぶたと交渉が終わった', 'おはよ。まだねむい']), 'まぶたと交渉が終わった');
  wait(director, clock, 5 * 60e3);
  const seen = new Set(Array.from({length:30}, () => director.pick(['まぶたと交渉が終わった', 'おはよ。まだねむい'])));
  assert.ok(seen.has('まぶたと交渉が終わった'), 'the family line returns after the gap');
  for (let k = 0; k < 30; k++) assert.notEqual(director.pick(['まぶたと交渉が終わった', 'もうむり'], {avoid:['まぶたが先に帰った']}), 'まぶたと交渉が終わった', 'same-conversation family is avoided too');
});

test('own lines get a cooldown; the shared pool fills in, so a partner line is not a tic', () => {
  const {director, clock} = make();
  const own = ['お茶と本と手、全部持てるよ', '空いた手だけで拍手してる', '片づけながらでも話は聞けるよ'];
  const shared = POOL;
  const counts = new Map();
  for (let k = 0; k < 360; k++) {   // 2 時間 / 20 秒
    clock.add(20e3);
    const line = director.pickOwnOrShared(own, shared, {speakerKey:'partner:rock_octopus'});
    assert.ok(line);
    director.noteShown(line, 'partner:rock_octopus');
    counts.set(line, (counts.get(line) || 0) + 1);
  }
  for (const line of own) assert.ok((counts.get(line) || 0) >= 1 && counts.get(line) <= 6, `${line} ${counts.get(line)}`);
});

test('quiet characters prefer their own lines and only sometimes say a generic one (never zero)', () => {
  const {director, clock} = make({quiet:['companion:box']});
  const own = ['……ただのはこです', '中の話はまだしません', '置いてあっても参加してる'];
  let ownN = 0, generic = 0, silent = 0;
  for (let k = 0; k < 600; k++) {
    clock.add(20e3);
    const line = director.pickOwnOrShared(own, POOL, {speakerKey:'companion:box'});
    if (!line) { silent++; continue; }
    director.noteShown(line, 'companion:box');
    if (own.includes(line)) ownN++; else generic++;
  }
  assert.ok(ownN > 0 && generic > 0 && silent > 0, `own ${ownN} generic ${generic} silent ${silent}`);
  assert.ok(generic < (ownN + generic) * 0.9, 'generic lines do not dominate a quiet character');
  // ふつうのキャラは黙らない
  const n = make().director;
  for (let k = 0; k < 50; k++) assert.ok(n.pickOwnOrShared(own, POOL, {speakerKey:'companion:otter'}));
});

test('idle speaker order: no third turn in a row, absent speakers are never chosen, events are not gated', () => {
  const {director, clock} = make();
  let last = null, run = 0;
  for (let k = 0; k < 300; k++) {
    clock.add(10e3);
    const order = director.orderSpeakers([{key:'pet', weight:4}, {key:'partner:robot_neighbor', weight:4, visitor:true}]);
    assert.ok(order.length >= 1 && order.every(c => ['pet', 'partner:robot_neighbor'].includes(c.key)));
    const who = order[0].key;
    director.noteShown(`line${k}`, who);
    run = who === last ? run + 1 : 1; last = who;
    assert.ok(run <= 2, `same speaker ${run} times`);
  }
  assert.deepEqual(director.orderSpeakers([]), []);
  assert.equal(director.orderSpeakers([{key:'pet', weight:4}]).length, 1, 'a lone speaker keeps talking');
  // 掛け合い(A→B→A)は orderSpeakers を通らないので妨げない
  director.noteShown('A1', 'pet'); director.noteShown('B1', 'partner:robot_neighbor');
  assert.ok(director.pick(['A2', 'A3']), 'the next beat of a conversation is always available');
});

test('unwell: visitors stay quiet about half the time', () => {
  const {director} = make({seed:3});
  let quiet = 0;
  for (let k = 0; k < 2000; k++) if (director.visitorStaysQuiet(true)) quiet++;
  assert.ok(quiet > 850 && quiet < 1150, `${quiet}/2000`);
  for (let k = 0; k < 50; k++) assert.equal(director.visitorStaysQuiet(false), false);
});

test('rare slot: memory and dialect are spaced, the same memory waits, the age recall happens once per age', () => {
  const {director, clock} = make();
  assert.ok(director.rareReady());
  director.noteRare();
  clock.add(10e3); assert.equal(director.rareReady(), false);
  clock.add(40e3); assert.ok(director.rareReady());
  assert.ok(director.memoryFresh('5|💊|看病'));
  director.noteMemory('5|💊|看病');
  clock.add(60e3); assert.equal(director.memoryFresh('5|💊|看病'), false);
  assert.ok(director.memoryFresh('3|🤝|なかま'));
  wait(director, clock, 6 * 60e3); assert.ok(director.memoryFresh('5|💊|看病'));
  assert.ok(director.ageRecallAllowed(40)); director.noteAgeRecall(40);
  assert.equal(director.ageRecallAllowed(40), false); assert.ok(director.ageRecallAllowed(41));
  let mem = 0; for (let k = 0; k < 5000; k++) if (director.wantsMemory()) mem++;
  assert.ok(mem > 480 && mem < 720, `memory roll about 12% (about 10% after spacing): ${mem}/5000`);
});

test('pace: as lively as before right after an interaction, 12–24s after a long idle, scalable for QA', () => {
  const {director, clock} = make();
  director.markInteraction();
  for (let k = 0; k < 50; k++) { const d = director.nextIdleDelay(); assert.ok(d >= 5200 && d <= 9000, `${d} (same as before the Director)`); }
  // 長い放置(Home 表示時間で 6 分。1 分以上の空白は数えないので 30 秒ずつ進める)
  for (let k = 0; k < 12; k++) { clock.add(30e3); director.nextIdleDelay(); }
  for (let k = 0; k < 50; k++) { const d = director.nextIdleDelay(); assert.ok(d >= 12000 && d <= 24000, `${d}`); }
  director.markInteraction();
  assert.ok(director.nextIdleDelay() <= 9000, 'a tap brings the chatter back');
  const fast = make({config:{paceScale:0.5}}).director;
  fast.markInteraction();
  assert.ok(fast.nextIdleDelay() <= 4500);
});

test('the clock only counts time on screen: long gaps (closed app) do not age the history', () => {
  const {director, clock} = make();
  director.noteShown('あ', 'pet');
  clock.add(6 * 60 * 60e3);   // 6 時間アプリを閉じていた
  director.noteShown('い', 'pet');
  assert.ok(director.clock < 60e3, `${director.clock}`);
});

test('history survives reload through its own storage key and stays small', () => {
  const store = new Map();
  const storage = {getItem:k => store.get(k) ?? null, setItem:(k, v) => store.set(k, v), removeItem:k => store.delete(k)};
  const a = make({storage});
  const out = speak(a.director, a.clock, POOL, 30);
  a.director.save();
  assert.ok(store.has('naotocchi-conversation-v1'));
  assert.ok(!store.has('naotocchi-save-v1'), 'the game save is untouched');
  const b = make({storage});
  assert.equal(b.director.load(), true);
  const next = speak(b.director, b.clock, POOL, 10);
  for (const line of next) assert.ok(!out.slice(-20).includes(line), `${line} repeated right after reload`);
  // 512 行ぶんでも 10KB 未満
  const big = make({storage});
  for (let k = 0; k < 700; k++) { big.clock.add(1000); big.director.noteShown(`line${k}`, 'pet'); }
  big.director.save();
  assert.ok(store.get('naotocchi-conversation-v1').length < 16000, `${store.get('naotocchi-conversation-v1').length} bytes`);
  assert.ok(big.director.snapshot().lines.length <= 512);
});

test('broken, old or unavailable storage never breaks the game', () => {
  for (const raw of ['{not json', '{"v":99,"lines":[]}', '{"v":1}', '{"v":1,"lines":[["zz",1,1],[1,2,3]],"clock":"x"}', 'null']) {
    const storage = {getItem:() => raw, setItem() {}, removeItem() {}};
    const {director, clock} = make({storage});
    assert.doesNotThrow(() => director.load());
    clock.add(1000);
    assert.ok(director.pick(POOL));
  }
  const throwing = {getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('x'); }};
  const {director, clock} = make({storage:throwing});
  assert.equal(director.load(), false);
  clock.add(1000); director.noteShown('あ', 'pet');
  assert.equal(director.save(), false);
  assert.doesNotThrow(() => director.reset());
  const none = make();
  assert.equal(none.director.save(), false);
  assert.equal(none.director.load(), false);
});

test('reset forgets everything (used by the full wipe)', () => {
  const store = new Map();
  const storage = {getItem:k => store.get(k) ?? null, setItem:(k, v) => store.set(k, v), removeItem:k => store.delete(k)};
  const {director, clock} = make({storage, randoms:[0]});
  clock.add(1000); director.noteShown('あ', 'pet'); director.save();
  director.reset();
  assert.ok(!store.has('naotocchi-conversation-v1'));
  assert.equal(director.pick(['あ', 'い']), 'あ', 'nothing is remembered');
});
