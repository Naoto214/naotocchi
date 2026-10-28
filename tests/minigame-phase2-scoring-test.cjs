// Phase 2 第3弾 採点の 共通仕様の 回帰テスト。
// T7: 実質的に 参加して いない プレイ(無操作・さいしょに 1かい さわって ほうち)は「途中で やめた」と おなじ(記録しない)。
// T1: 対戦の 点は 決着 > 判定(時間切れで 優劣あり) > 時間切れ・未決着。正当な 引き分けと 時間切れを わける。
// DOM と 時計・canvas は ハーネスの 代用品(ブラウザの 描画や 指の 入力の 証拠では ない)。
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {harness} = require('./helpers/runtime-harness.cjs');

function fakeCtx() {
  const grad = {addColorStop() {}};
  return new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => grad;
      if (k === 'measureText') return () => ({width: 0});
      if (k === 'getImageData') return () => ({data: new Uint8ClampedArray(4)});
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

// ほんものの ゲームを 開始して 時間を すすめる。raw = ゲームが だした 点、final = 結果処理が つかった 点
function play(id, {seed = 1, before, during} = {}) {
  const h = harness({seed, canvasContext: fakeCtx()});
  const s = h.api.state(); Object.assign(s, {isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80});
  if (before) before(h, s);
  const game = h.api.games.find((g) => g.id === id);
  assert.ok(game, id);
  let box = null, raw = null, final = null, counted = null;
  h.api.startMinigame({id, start(c, done) {
    box = c;
    return game.start(c, (sc, ...rest) => { if (raw !== null) return; raw = sc; const b = s.minigameScoreSum, n = s.minigameCount; done(sc, ...rest); final = s.minigameScoreSum - b; counted = s.minigameCount - n; });
  }});
  for (let t = 0; raw === null && t < 240000; t += 100) { if (during) during(h, t, box); h.advance(100); }
  assert.notEqual(raw, null, id + ' ends');
  return {h, s, raw, final, counted};
}

// games.js の 共通ヘルパーを 直接 よぶ(本体の S の かわりに 最小の スタブ)
function helpers() {
  require('../games.js');
  return globalThis.installNaotocchiMinigames({SEASON: {SPRING: 'spring', SUMMER: 'summer', AUTUMN: 'autumn', WINTER: 'winter'},
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)), lerp: (a, b, t) => a + (b - a) * t});
}

// ---------------- T7 ----------------
// 案B(2026-10-28 承認): 参加なしの プレイは「途中で やめた」と おなじ。点・記録・コイン・そだち・個性・会話に 入れない。
// 遊んで 低い 点だった(失敗)ときは いままでどおりの 採点と ペナルティ
const IDLE_TEXT = 'そうさがなかったので、今回は記録しないよ';
// 03 の 実測で 無操作 C〜B だった 代表(対戦の 時間切れ・自動で すすむ・不具合で 高い もの)
const IDLE_HIGH = ['connect-four', 'gomoku-9', 'reversi-6', 'hang-glider-3d', 'sky-shooter', 'plane-landing', 'falling-block-puzzle', 'ring-flight-3d', 'downhill-snow', 'tilt-maze-3d', 'air-hockey', 'curling-ice', 'mini-golf-physics', 'sugoroku-race'];
for (const id of IDLE_HIGH) test(`T7: ${id} を 無操作で おえると 記録しない`, () => {
  const {h, s, counted} = play(id);
  assert.equal(counted, 0, id);
  assert.equal(s.lifetime.minigameRecords[id], undefined, id + ' record');
  assert.ok(h.api.getMessage().includes(IDLE_TEXT), h.api.getMessage());
});

test('T7: 自動で すすむ ゲームは さいしょに 1かい さわって ほうちしても 記録しない', () => {
  for (const id of ['hang-glider-3d', 'sky-shooter', 'falling-block-puzzle', 'road-city', 'reversi-6']) {
    const {raw, counted} = play(id, {during: (h, t, box) => { if (t === 1000) { const n = box.querySelector('canvas') || box; h.dispatch(n, 'pointerdown', {pointerId: 1, clientX: 150, clientY: 150, button: 0}); h.dispatch(n, 'pointermove', {pointerId: 1, clientX: 170, clientY: 140}); h.dispatch(n, 'pointerup', {pointerId: 1, clientX: 170, clientY: 140}); } }});
    assert.equal(counted, 0, `${id}: raw ${raw}`);
  }
});

// 結果処理の 入口だけを みる(ゲームの 点は そのまま わたす)
function finishWith(id, score, detail, {input = false, before} = {}) {
  const h = harness(); const s = h.api.state(); Object.assign(s, {isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, happiness: 50});
  if (before) before(h, s);
  let done = null, box = null;
  h.api.startMinigame({id, start(c, d) { box = c; done = d; }});
  if (input) h.dispatch(box, 'pointerdown', {pointerId: 1, clientX: 10, clientY: 10});
  const was = {money: s.lifetime.money, sum: s.minigameScoreSum, count: s.minigameCount, played: s.lifetime.minigamesPlayed, energy: s.energy, happiness: s.happiness, decline: s.decline, death: s.deathMeter, transform: s.transformMeter, individuality: JSON.stringify(s.individuality)};
  done(score, null, detail);
  return {h, s, final: s.minigameScoreSum - was.sum, counted: s.minigameCount - was.count, coins: s.lifetime.money - was.money, record: s.lifetime.minigameRecords[id], was};
}

test('T7: ふつうに 操作した プレイの 点は かわらない(判定は 参加の ない ときだけ)', () => {
  assert.equal(finishWith('reversi-6', 90, {acts: 12, cover: 0.7}).final, 90);
  assert.equal(finishWith('hang-glider-3d', 82, {acts: 300, cover: 0.9}).final, 82);
  assert.equal(finishWith('dot-eater', 60, undefined, {input: true}).final, 60, '量を わたさない ゲームは ゲームの がめんの 入力で みる');
  assert.equal(finishWith('dot-eater', 60, undefined).counted, 0);
  assert.equal(finishWith('reversi-6', 90, {acts: 0, cover: 0}, {input: true}).counted, 0, '入力が あっても 状態を かえて いなければ 参加なし');
  assert.equal(finishWith('hang-glider-3d', 82, {acts: 3, cover: 0.05}, {input: true}).counted, 0, 'さいしょだけ さわって ほうち');
  assert.equal(finishWith('road-city', 41, {acts: 1, spans: 1, cover: 0.2}, {input: true}).counted, 0, '1つの 区切りだけ(みじかい ゲームでも 2区切り いじょう)');
  assert.equal(finishWith('road-city', 41, {acts: 4, spans: 2, cover: 0.4}, {input: true}).final, 41);
  assert.equal(finishWith('sky-shooter', 30, {acts: 2, spans: 1, cover: 1}, {input: true}).final, 30, '1区切りで おわった ゲームは その 1つで よい');
  assert.equal(finishWith('reversi-6', 20, {acts: 0}).counted, 0, '低い 点でも 参加なしなら 記録しない');
});

test('T7: 参加なしは「途中で やめた」と おなじ(元気-6・きげん+2 だけ。記録・コイン・そだち・個性に 入れない)', () => {
  const r = finishWith('hang-glider-3d', 82, {acts: 0, cover: 0}, {});
  assert.equal(r.counted, 0, 'avgSkill に 入れない');
  assert.equal(r.record, undefined, '記録しない');
  assert.equal(r.coins, 0);
  assert.equal(r.s.lifetime.minigamesPlayed, r.was.played);
  assert.equal(r.s.energy, r.was.energy - 6);
  assert.equal(r.s.happiness, r.was.happiness + 2);
  assert.equal(r.s.decline, r.was.decline, '衰えの ペナルティなし');
  assert.equal(r.s.deathMeter, r.was.death, '寿命の ペナルティなし');
  assert.equal(r.s.transformMeter, r.was.transform);
  assert.equal(JSON.stringify(r.s.individuality), r.was.individuality, '個性は かわらない');
  assert.ok(r.h.api.getMessage().includes(IDLE_TEXT), r.h.api.getMessage());
  // まえの 記録は そのまま(じこベストも 前回も)
  const k = finishWith('hang-glider-3d', 91, {acts: 0, cover: 0}, {before: (h, s) => { s.lifetime.minigameRecords['hang-glider-3d'] = {best: 82, last: 70}; }});
  assert.deepEqual({...k.s.lifetime.minigameRecords['hang-glider-3d']}, {best: 82, last: 70});
});

test('T7: 遊んで 低い 点だった ときは いままでの 採点と ペナルティ(失敗)のまま', () => {
  const r = finishWith('reversi-6', 20, {acts: 12, cover: 0.7});
  assert.equal(r.final, 20);
  assert.equal(r.counted, 1);
  assert.equal(r.coins, 0);
  assert.equal(r.record.last, 20);
  assert.equal(r.s.lifetime.minigamesPlayed, r.was.played + 1);
  assert.ok(r.s.deathMeter > r.was.death, '寿命の ペナルティは のこる');
  assert.ok(!r.h.api.getMessage().includes(IDLE_TEXT));
});

// 盤上ゲーム 6本(2026-10-28 承認): 区切りの わりあいでは なく「手と 手の 間」で みる。
// 合法手を 指し、開始〜最初の 手・手と 手の 間・最後の 手〜おわり の どれもが 30びょう いないなら 参加(決着した ときは 間を とわない)。
// 長考(1手 20〜25びょう)は 参加。数手 指して 放置、時間切れ 直前の 1手だけ、完全放置 は 参加なし
function slowReversi(times) {
  const h = harness({seed: 3, canvasContext: fakeCtx()});
  const s = h.api.state(); Object.assign(s, {isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80});
  const game = h.api.games.find((g) => g.id === 'reversi-6');
  let raw = null, detail = null, counted = null;
  h.api.startMinigame({id: 'reversi-6', start(c, done) { return game.start(c, (sc, msg, d) => { if (raw !== null) return; raw = sc; detail = d; const n = s.minigameCount; done(sc, msg, d); counted = s.minigameCount - n; }); }});
  const box = h.get('minigameOverlay'), cv = box.querySelector('#rvCanvas'), score = () => box.querySelector('#rvScore').textContent;
  let t = 0, moves = 0;
  const due = [...times];
  while (raw === null && t < 120000) {
    if (due.length && t >= due[0]) {
      const before = score(); let ok = false;
      for (let y = 25; y < 300 && !ok; y += 50) for (let x = 25; x < 300 && !ok; x += 50) { h.dispatch(cv, 'pointerdown', {pointerId: 1, clientX: x, clientY: y, button: 0}); ok = score() !== before; }
      if (ok) { moves++; due.shift(); } else due[0] = t + 500; // あいての 番なら すこし まって 指す
    }
    h.advance(100); t += 100;
  }
  return {raw, detail, counted, moves, message: h.api.getMessage()};
}
const every = (gap, until = 60000, from = gap) => { const a = []; for (let t = from; t < until; t += gap) a.push(t); return a; };

test('T7 盤上: 長考(1手 20びょう・25びょう)で 合法手を 指しつづけた プレイは 参加あり(記録する)', () => {
  for (const gap of [20000, 25000]) {
    const r = slowReversi(every(gap));
    assert.ok(r.moves >= 2, `${gap}: moves ${r.moves}`);
    assert.equal(r.counted, 1, `${gap}ms: ${JSON.stringify(r.detail)} ${r.message}`);
    assert.ok(!r.message.includes(IDLE_TEXT), r.message);
  }
});

test('T7 盤上: ふつうの 速さ(1手 5びょう)も 参加あり', () => {
  const r = slowReversi(every(5000));
  assert.equal(r.counted, 1, JSON.stringify(r.detail));
});

test('T7 盤上: さいしょに 数手 指して 放置・時間切れ 直前の 1手だけ・完全放置 は 参加なし', () => {
  const quick = slowReversi([1000, 3000]);
  assert.equal(quick.moves, 2); assert.equal(quick.counted, 0, '短時間の 操作の あと 放置: ' + JSON.stringify(quick.detail));
  const last = slowReversi([55000]);
  assert.equal(last.moves, 1); assert.equal(last.counted, 0, '時間切れ 直前の 1手だけ: ' + JSON.stringify(last.detail));
  const idle = slowReversi([]);
  assert.equal(idle.counted, 0, '完全放置');
  for (const r of [quick, last, idle]) assert.ok(r.message.includes(IDLE_TEXT), r.message);
});

test('T7 盤上: 判定は 手と 手の 間 30びょうまで。決着した ときは 間を とわない(結果処理の 入口)', () => {
  assert.equal(finishWith('reversi-6', 59, {acts: 3, maxGap: 20000, decided: false}).counted, 1, '長考で 時間切れ');
  assert.equal(finishWith('reversi-6', 59, {acts: 3, maxGap: 30000, decided: false}).counted, 1, 'ちょうど 30びょう');
  assert.equal(finishWith('reversi-6', 40, {acts: 2, maxGap: 30100, decided: false}).counted, 0, '30びょうを こえる 間');
  assert.equal(finishWith('checkers-6', 90, {acts: 9, maxGap: 45000, decided: true}).counted, 1, '決着まで 指した(1回 ながく 考えても よい)');
  assert.equal(finishWith('mancala-kalah', 40, {acts: 0, maxGap: 60000, decided: false}).counted, 0, '手を 指して いない');
});

test('T7: Quick と テスト用の ゲームには かからない', () => {
  const h = harness(); const s = h.api.state(); Object.assign(s, {isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80});
  let done; h.api.startMinigame({id: 'quick-run', noIntro: true, start(c, d) { done = d; }});
  const money = s.lifetime.money; done(100, null, {acts: 0, cover: 0});
  assert.equal(s.lifetime.money - money, 100, 'クイック混合の 100点は 100コインの まま');
  assert.equal(finishWith('probe-not-a-game', 90, {acts: 0}).final, 90);
});

// ---------------- T1 ----------------
test('T1: mgVersusOutcome は 決着 > 判定 > 時間切れ の 順で、時間切れは 決着の 点を こえない', () => {
  const {mgVersusOutcome: vs} = helpers();
  for (const sc of [60, 72, 88, 100]) assert.equal(vs({result: 'win', by: 'decisive', score: sc}), sc, '決着の かちは いまの 点の まま');
  for (const sc of [12, 30, 45]) assert.equal(vs({result: 'lose', by: 'decisive', score: sc}), sc, '決着の まけも いまの 点の まま');
  for (const m of [0, 0.5, 1]) {
    const j = vs({result: 'win', by: 'judgement', score: 90, margin: m});
    assert.ok(j >= 55 && j <= 69, `判定かちは B(55〜69): ${j}`);
  }
  assert.equal(vs({result: 'win', by: 'judgement', score: 62, margin: 1}), 62, 'おなじ 局面で 決着した 点を こえない');
  assert.equal(vs({result: 'draw', by: 'decisive', score: 55}), 50, '正当な 引き分け(盤が うまった)は 45〜50');
  assert.equal(vs({result: 'draw', by: 'decisive', score: 45}), 45);
  assert.equal(vs({result: 'draw', by: 'timeout', score: 55}), 40, '時間切れの 互角・未決着');
  assert.equal(vs({result: 'draw', by: 'judgement', score: 50}), 40);
  assert.equal(vs({result: 'lose', by: 'judgement', score: 45}), 34, '時間切れの 判定まけは 互角より 下');
  const decided = vs({result: 'win', by: 'decisive', score: 72}), judged = vs({result: 'win', by: 'judgement', score: 72, margin: 0.3}), timeout = vs({result: 'draw', by: 'timeout', score: 72});
  assert.ok(timeout < judged && judged < decided, `${timeout} < ${judged} < ${decided}`);
});

test('T1: 時間切れの 引き分けは 正当な 引き分けより 下(ゲームの 生の 点で)', () => {
  // 何も 置かずに 時間切れ: 以前は 55(B)/50(C)。いまは 未決着・互角の 40
  assert.equal(play('connect-four').raw, 40);
  assert.equal(play('gomoku-9').raw, 40);
  assert.equal(play('reversi-6').raw, 40);
  assert.equal(play('checkers-6').raw, 40);
  assert.equal(play('mancala-kalah').raw, 40);
  assert.equal(play('air-hockey').raw, 40);
  assert.equal(play('curling-ice').raw, 40);
});
