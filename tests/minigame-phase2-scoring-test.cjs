// Phase 2 第3弾 採点の 共通仕様の 回帰テスト。
// T7: 実質的に 参加して いない プレイ(無操作・さいしょに 1かい さわって ほうち)は 25点を こえない。
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
  let box = null, raw = null, final = null;
  h.api.startMinigame({id, start(c, done) {
    box = c;
    return game.start(c, (sc, ...rest) => { if (raw !== null) return; raw = sc; const b = s.minigameScoreSum; done(sc, ...rest); final = s.minigameScoreSum - b; });
  }});
  for (let t = 0; raw === null && t < 240000; t += 100) { if (during) during(h, t, box); h.advance(100); }
  assert.notEqual(raw, null, id + ' ends');
  return {h, s, raw, final};
}

// games.js の 共通ヘルパーを 直接 よぶ(本体の S の かわりに 最小の スタブ)
function helpers() {
  require('../games.js');
  return globalThis.installNaotocchiMinigames({SEASON: {SPRING: 'spring', SUMMER: 'summer', AUTUMN: 'autumn', WINTER: 'winter'},
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)), lerp: (a, b, t) => a + (b - a) * t});
}

// ---------------- T7 ----------------
// 03 の 実測で 無操作 C〜B だった 代表(対戦の 時間切れ・自動で すすむ・不具合で 高い もの)
const IDLE_HIGH = ['connect-four', 'gomoku-9', 'reversi-6', 'hang-glider-3d', 'sky-shooter', 'plane-landing', 'falling-block-puzzle', 'ring-flight-3d', 'downhill-snow', 'tilt-maze-3d', 'air-hockey', 'curling-ice', 'mini-golf-physics', 'sugoroku-race'];
for (const id of IDLE_HIGH) test(`T7: ${id} を 無操作で おえると 25点を こえない`, () => {
  const {final} = play(id);
  assert.ok(final <= 25, `${id}: ${final}`);
});

test('T7: 自動で すすむ ゲームは さいしょに 1かい さわって ほうちしても 25点を こえない', () => {
  for (const id of ['hang-glider-3d', 'sky-shooter', 'falling-block-puzzle', 'road-city', 'reversi-6']) {
    const {raw, final} = play(id, {during: (h, t, box) => { if (t === 1000) { const n = box.querySelector('canvas') || box; h.dispatch(n, 'pointerdown', {pointerId: 1, clientX: 150, clientY: 150, button: 0}); h.dispatch(n, 'pointermove', {pointerId: 1, clientX: 170, clientY: 140}); h.dispatch(n, 'pointerup', {pointerId: 1, clientX: 170, clientY: 140}); } }});
    assert.ok(final <= 25, `${id}: raw ${raw} -> ${final}`);
  }
});

// 結果処理の 入口だけを みる(ゲームの 点は そのまま わたす)
function finishWith(id, score, detail, {input = false} = {}) {
  const h = harness(); const s = h.api.state(); Object.assign(s, {isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80});
  let done = null, box = null;
  h.api.startMinigame({id, start(c, d) { box = c; done = d; }});
  if (input) h.dispatch(box, 'pointerdown', {pointerId: 1, clientX: 10, clientY: 10});
  const money = s.lifetime.money, sum = s.minigameScoreSum;
  done(score, null, detail);
  return {h, s, final: s.minigameScoreSum - sum, coins: s.lifetime.money - money, record: s.lifetime.minigameRecords[id]};
}

test('T7: ふつうに 操作した プレイの 点は かわらない(上限は 参加の ない ときだけ)', () => {
  assert.equal(finishWith('reversi-6', 90, {acts: 12, cover: 0.7}).final, 90);
  assert.equal(finishWith('hang-glider-3d', 82, {acts: 300, cover: 0.9}).final, 82);
  assert.equal(finishWith('dot-eater', 60, undefined, {input: true}).final, 60, '量を わたさない ゲームは ゲームの がめんの 入力で みる');
  assert.equal(finishWith('dot-eater', 60, undefined).final, 25);
  assert.equal(finishWith('reversi-6', 90, {acts: 0, cover: 0}, {input: true}).final, 25, '入力が あっても 状態を かえて いなければ 参加なし');
  assert.equal(finishWith('hang-glider-3d', 82, {acts: 3, cover: 0.05}, {input: true}).final, 25, 'さいしょだけ さわって ほうち');
  assert.equal(finishWith('road-city', 41, {acts: 1, spans: 1, cover: 0.2}, {input: true}).final, 25, '1つの 区切りだけ(みじかい ゲームでも 2区切り いじょう)');
  assert.equal(finishWith('road-city', 41, {acts: 4, spans: 2, cover: 0.4}, {input: true}).final, 41);
  assert.equal(finishWith('sky-shooter', 30, {acts: 2, spans: 1, cover: 1}, {input: true}).final, 30, '1区切りで おわった ゲームは その 1つで よい');
  assert.equal(finishWith('reversi-6', 20, {acts: 0}).final, 20, '25点 いかの 点は そのまま');
});

test('T7: 上限は 記録・コイン・会話の 帯より まえに かかり、じこベストは 巻き戻さない', () => {
  const r = finishWith('hang-glider-3d', 82, {acts: 0, cover: 0}, {});
  assert.equal(r.record.last, 25);
  assert.equal(r.coins, 0, '25点は 失敗の 帯(30未満)なので コインなし');
  const k = harness(); const s = k.api.state(); Object.assign(s, {isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80});
  s.lifetime.minigameRecords['hang-glider-3d'] = {best: 82, last: 82};
  let done; k.api.startMinigame({id: 'hang-glider-3d', start(c, d) { done = d; }});
  done(91, null, {acts: 0, cover: 0});
  assert.deepEqual({...s.lifetime.minigameRecords['hang-glider-3d']}, {best: 82, last: 25});
  assert.ok(k.api.getMessage().includes('25点まで'), k.api.getMessage());
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
