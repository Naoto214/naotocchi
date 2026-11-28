// ミニゲーム採点監査 Phase 3(docs/audit/minigame-scoring-p3-2026-11-26)の 回帰テスト。
// 本物の games.js + script.js を harness で うごかす(canvas は 呼び出しを 記録する スタブ。ボットは 描かれた 位置を 見て 操作する)。
// たしかめる こと:
//  - 連打・押しっぱなし・ねらわない 操作では 高得点に ならない(つみあげタワー・ダーツ・リズム・アステロイド・フルーツ・
//    アーチェリー・ハーフパイプ・かくとう・グランプリ・ハンググライダー・ジェンガ)
//  - 上手な 操作(ボット)は 100点 または 以前と おなじ 高さに とどく
//  - ケーキ・ドミノは 完成で 76〜100点(はやさ・ていねいさ)
//  - 放置・1回 さわって 放置は 記録しない(参加度メーター)
const assert = require('node:assert/strict');
const {test} = require('node:test');
const {play, many} = require('../tools/minigame-audit/p3/probe.cjs');
const sk = require('../tools/minigame-audit/p3/skill.cjs');
const {S} = require('../tools/minigame-audit/p3/scen.cjs');
const avg = (m) => m.scores.reduce((a, b) => a + (b || 0), 0) / m.scores.length;
const seeds = (n) => Array.from({length: n}, (_, i) => i + 1);

test('つみあげタワー6本: 連打(0.15秒)は 30点未満、ゆれを 見て おとすと 100点', () => {
  for (const id of ['stack-themed', 'stack-snowman', 'stack-harvest', 'stack-acorn', 'stack-sakura', 'stack-leaves']) {
    const m = many(id, S[`${id} 連打0.15秒`].bot, {seeds: seeds(3)});
    assert.ok(m.scores.every((s) => s < 30), `${id} 連打 ${m.scores}`);
  }
  const good = many('stack-themed', sk.stackBot({tol: 3}), {seeds: seeds(3), step: 16});
  assert.deepEqual(good.scores, [100, 100, 100]);
  const mid = many('stack-snowman', sk.stackBot({tol: 12}), {seeds: seeds(3), step: 16});
  assert.ok(mid.scores.every((s) => s >= 90), `ふつう ${mid.scores}`);
});

test('ダーツ: 押して すぐ はなすと 手が ふるえて 平均70点未満、おちつきを まって はなすと 100点', () => {
  const hold = (ms) => (r, t) => { const c = r.q('#dtCanvas'), ph = t % 2500; if (t < 1000) return; if (ph === 0) r.down(c, 150, 141); if (ms === 0 && ph === 0) r.up(c, 150, 141); if (ms && ph === ms) r.up(c, 150, 141); };
  const quick = many('darts-board', hold(0), {seeds: seeds(8)});
  assert.ok(avg(quick) < 70, `すぐ はなす ${quick.scores}`);
  const steady = many('darts-board', hold(750), {seeds: seeds(6)});
  assert.ok(steady.scores.every((s) => s === 100), `おちついて ${steady.scores}`);
});

test('リズム: 3レーン 同時連打は 15点いか、ノーツに あわせて 押せば 70点いじょう(おてつきの 少ない 人は 減点なし)', () => {
  for (const iv of [100, 150, 250]) {
    const m = many('rhythm-highway-3d', S[`rhythm 3レーン連打${iv}`].bot, {seeds: seeds(3)});
    assert.ok(m.scores.every((s) => s <= 15), `連打${iv} ${m.scores}`);
  }
  const good = many('rhythm-highway-3d', sk.rhythmBot({jitter: 15}), {seeds: seeds(3)});
  assert.ok(good.scores.every((s) => s >= 70), `上手 ${good.scores}`);
});

test('アステロイド: その場で 撃つだけは 平均60点未満、ねらって 撃つと 平均90点いじょう', () => {
  const spam = many('asteroids-classic', S['asteroids 撃つだけ'].bot, {seeds: seeds(8)});
  assert.ok(avg(spam) < 60, `撃つだけ ${spam.scores}`);
  const aim = many('asteroids-classic', sk.asteroidsBot({slow: 0.3, aimTol: 0.3}), {seeds: seeds(6)});
  assert.ok(avg(aim) >= 90, `ねらう ${aim.scores}`);
});

test('フルーツ斬り: なぞりつづけても コンボが つづかない(平均35点未満)。ねらって 斬る 点は 下がらない', () => {
  const m = many('fruit-slice', S['fruit なぞりつづける'].bot, {seeds: seeds(5)});
  assert.ok(avg(m) < 35, `なぞりつづける ${m.scores}`);
  const good = many('fruit-slice', sk.fruitBot({every: 150}), {seeds: seeds(5)});
  assert.deepEqual(good.scores, [53, 70, 51, 64, 47], 'ねらって 斬る(変更前と おなじ)');
});

test('アーチェリー: まっすぐ 引くだけ(風を 見ない)は 平均75点いか、照準を 的に あわせれば 95点いじょう', () => {
  const m = many('archery-3d', S['archery まっすぐ引く'].bot, {seeds: seeds(8)});
  assert.ok(avg(m) <= 75, `まっすぐ ${m.scores}`);
  const good = many('archery-3d', sk.archeryBot({err: 2}), {seeds: seeds(5)});
  assert.ok(good.scores.every((s) => s >= 95), `照準 ${good.scores}`);
});

test('ハーフパイプ: ポンプ 押しっぱなし+一定間隔の タップは 40点いか、くだりで ポンプ+回転数を かえると 100点', () => {
  for (const iv of [700, 900, 1500, 2000]) {
    const m = many('halfpipe-skate', (r, t) => { if (t === 1000) r.down(r.q('#hpPump'), 0, 0, 7); if (t >= 1000 && t % iv === 0) r.down(r.q('#hpTrick'), 0, 0, 2); }, {seeds: seeds(2)});
    assert.ok(m.scores.every((s) => s <= 40), `間隔${iv} ${m.scores}`);
  }
  assert.ok(many('halfpipe-skate', sk.halfpipeBot({pattern: [1, 2]}), {seeds: seeds(2)}).scores.every((s) => s === 100));
  const hold1 = many('halfpipe-skate', sk.halfpipeBot({smart: false, pattern: [1]}), {seeds: seeds(2)});
  // Phase 5(2026-11-28): 押しっぱなしでは 加速しない(1.2びょう いじょう 押しつづけると ポンプが きかない)。まえは 30〜60
  assert.ok(hold1.scores.every((s) => s < 30), `押しっぱなし+1回転 ${hold1.scores}`);
});

test('かくとう: 同じ わざの 連打は 見切られて 平均30点未満。わざを まぜる 人は 変わらない', () => {
  const kick = many('street-fight', S['fight キック0.75秒'].bot, {seeds: seeds(6)});
  assert.ok(avg(kick) < 30, `キック連打 ${kick.scores}`);
  const human = require('../tools/minigame-audit/p3/personas.cjs').G['street-fight'].beginner;
  assert.deepEqual(many('street-fight', human, {seeds: seeds(4)}).scores, [26, 18, 27, 16], 'まぜる(変更前と おなじ)');
});

test('グランプリ: アクセルだけで 70点いじょうは 12回に 1回いか、ハンドルを きれば 平均85点いじょう', () => {
  const m = many('grand-prix-3d', S['grandprix アクセルだけ'].bot, {seeds: seeds(12)});
  assert.ok(m.scores.filter((s) => s >= 70).length <= 1, `アクセルだけ ${m.scores}`);
  const good = many('grand-prix-3d', sk.gpBot({dead: 0.35, lag: 2}), {seeds: seeds(6)});
  assert.ok(avg(good) >= 85, `ハンドル ${good.scores}`);
});

test('ハンググライダー: 少し ゆらす だけは 30点未満、気流・風船を ねらうと 平均45点いじょう', () => {
  const m = many('hang-glider-3d', S['hangglider 少しゆらす'].bot, {seeds: seeds(6)});
  assert.ok(m.scores.every((s) => s < 30), `ゆらす ${m.scores}`);
  const good = many('hang-glider-3d', sk.hgBot({gain: 0.6}), {seeds: seeds(6)});
  assert.ok(avg(good) >= 45, `ねらう ${good.scores}`);
});

test('ジェンガ: かたい ブロックが あり、まんなか だけでは 平均85点未満。安定度を 考えれば 100点', () => {
  const mid = many('jenga-tower', sk.jengaBot({middleOnly: true}), {seeds: seeds(8)});
  assert.ok(avg(mid) < 85, `まんなかだけ ${mid.scores}`);
  const good = many('jenga-tower', sk.jengaBot({minS: 0.45}), {seeds: seeds(6)});
  assert.ok(good.scores.every((s) => s === 100), `考える ${good.scores}`);
});

test('ドミノ: 2問 完成は はやさで 76〜100点(はやい 100・ゆっくり 76〜90)。すぐ 押す だけは 記録しない', () => {
  assert.ok(many('domino-run', sk.dominoBot({every: 300}), {seeds: seeds(3)}).scores.every((s) => s === 100));
  const slow = many('domino-run', sk.dominoBot({every: 1800}), {seeds: seeds(3)});
  assert.ok(slow.scores.every((s) => s >= 76 && s <= 92), `ゆっくり ${slow.scores}`);
  const veryslow = many('domino-run', sk.dominoBot({every: 2600}), {seeds: seeds(2)});
  assert.ok(veryslow.scores.every((s) => s >= 76 && s <= 80), `とても ゆっくり ${veryslow.scores}`);
  const push = many('domino-run', S['domino すぐ押す'].bot, {seeds: seeds(2)});
  assert.equal(push.recorded, 0);
});

test('参加度メーター: 対象の ゲームは 放置・1回 さわって 放置を 記録しない', () => {
  const ids = ['stack-themed', 'darts-board', 'rhythm-highway-3d', 'asteroids-classic', 'fruit-slice', 'archery-3d', 'halfpipe-skate', 'street-fight', 'grand-prix-3d', 'hang-glider-3d', 'jenga-tower', 'domino-run'];
  const tap1 = (r, t) => { if (t === 1000) { const n = r.box.children.find((c) => c.listeners && c.listeners.length) || r.box; r.tap(n); } };
  for (const id of ids) {
    const a = play(id, {seed: 1, limitMs: 120000});
    assert.equal(a.recorded, false, `${id} 放置`);
    const b = play(id, {seed: 1, bot: tap1, limitMs: 120000});
    assert.equal(b.recorded, false, `${id} 1回だけ`);
  }
});
