// ミニゲーム Phase 5(2026-11-28 ご承認・docs/audit/minigame-phase5-2026-11-28)の 回帰テスト。
// たしかめる こと:
//  - 放置で おわらなかった ゲーム: アクション(スキージャンプ・ダーツ・りくじょう)は 30びょう さわらないと おわり、記録しない。
//    考える ゲーム(ブラックジャック・ヨット)は 短い 無操作では おわらない(5分で おわる)。ピンボール・UFOキャッチャーは もとから おわる
//  - ハーフパイプ: 光を 見てから 0.3〜0.5びょうで 押す 人は 大成功、0.6びょうでも エアが 出る。押しっぱなし・連打は 30点未満、上手なら 100
//  - スマホの 押しやすさ(ジェンガ・ドミノ・ゆきだるま・ソリティア)・れんさパズル・ブロックくずし・2048・3Dダンジョンの 変更が 入っている
//  - 結果の ひとことは 報酬の 帯(70・30)と Sランク(90)に そろう
const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const {harness} = require('./helpers/runtime-harness.cjs');
const {play, many, fresh} = require('../tools/minigame-audit/p3/probe.cjs');
const sk = require('../tools/minigame-audit/p3/skill.cjs');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'games.js'), 'utf8');
const SCRIPT = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
const seeds = (n) => Array.from({length: n}, (_, i) => i + 1);

test('放置: アクションの 3本は 30びょう さわらないと おわり、記録しない。考える 2本は 5分まで まつ', () => {
  for (const id of ['ski-jump', 'darts-board', 'track-field']) {
    const r = play(id, {seed: 1, limitMs: 120000, step: 100});
    assert.ok(r.endedMs >= 30000 && r.endedMs <= 32000, `${id} ${r.endedMs}`);
    assert.equal(r.recorded, false, id);
  }
  for (const id of ['blackjack-21', 'yacht-dice']) {
    assert.equal(play(id, {seed: 1, limitMs: 120000, step: 200}).endedMs, null, `${id}: 2分では おわらない`);
    const r = play(id, {seed: 1, limitMs: 400000, step: 200});
    assert.ok(r.endedMs >= 300000 && r.endedMs <= 302000, `${id} ${r.endedMs}`);
    assert.equal(r.recorded, false, id);
  }
  // 1回だけ さわって 放置: 放置で おわった 回は「途中で やめた」と おなじで 記録しない(まえは おわらなかった)
  const tap1 = (r, t) => { if (t === 1000) { const n = r.box.children.find((c) => c.listeners && c.listeners.length) || r.box; r.tap(n); } };
  for (const id of ['blackjack-21', 'ski-jump']) assert.equal(play(id, {seed: 1, limitMs: 400000, step: 200, bot: tap1}).recorded, false, `${id} 1回だけ`);
  for (const id of ['pinball-physics', 'crane-game-3d']) assert.ok(play(id, {seed: 1, limitMs: 120000, step: 100}).endedMs < 60000, `${id}: もとから おわる`);
});

test('放置の 目安は さわれば のびる(ダーツの 画面を 20びょうごとに さわると 30びょうでは おわらない)', () => {
  const r = play('darts-board', {seed: 1, limitMs: 70000, step: 100, bot: (rr, t) => { if (t % 20000 === 0) rr.down(rr.box, 5, 5, 9); }});
  assert.ok(r.endedMs === null || r.endedMs > 60000, `${r.endedMs}`);
});

// 光を 見てから lag ms で 押し、光が 消えてから lag ms で はなす(反応が ゆっくりな 人)。エアごとに pattern の 回数だけ トリック
function slowBot(lag, pattern = [1]) {
  let litAt = null, unlitAt = null, held = false, i = 0, lastH = '';
  return (r, t) => {
    if (t < 1000) return;
    const p = r.q('#hpPump'), lit = !!p.style.boxShadow;
    if (lit && litAt === null) litAt = t; if (!lit && litAt !== null) { litAt = null; unlitAt = t; }
    if (litAt !== null && !held && t - litAt >= lag) { r.down(p, 0, 0, 7); held = true; }
    if (litAt === null && held && unlitAt !== null && t - unlitAt >= lag) { r.up(p, 0, 0, 7); held = false; }
    const ht = r.q('#hpHint').textContent, fire = ht !== lastH && /エア/.test(ht); lastH = ht;
    if (fire) { const n = pattern[i++ % pattern.length]; for (let k = 0; k < n; k++) r.down(r.q('#hpTrick'), 0, 0, 2); }
  };
}
test('ハーフパイプ: 反応 0.3〜0.5びょうの 人は 大成功、0.6びょうでも ふつう いじょう。押しっぱなし・連打は 30点未満、上手なら 100', () => {
  for (const lag of [300, 400, 500]) {
    const m = many('halfpipe-skate', fresh(() => slowBot(lag)), {seeds: seeds(2)});
    assert.ok(m.scores.every((s) => s >= 70), `反応 ${lag}ms ${m.scores}`);
  }
  const slow = many('halfpipe-skate', fresh(() => slowBot(600)), {seeds: seeds(2)});
  assert.ok(slow.scores.every((s) => s >= 30), `反応 600ms ${slow.scores}`);
  const hold = many('halfpipe-skate', sk.halfpipeBot({smart: false, pattern: [1]}), {seeds: seeds(2)});
  assert.ok(hold.scores.every((s) => s < 30), `押しっぱなし ${hold.scores}`);
  const mash = (r, t) => { if (t < 1000) return; const p = r.q('#hpPump'); if (t % 600 === 0) r.down(p, 0, 0, 7); if (t % 600 === 150) r.up(p, 0, 0, 7); if (t % 900 === 0) r.down(r.q('#hpTrick'), 0, 0, 2); };
  assert.ok(many('halfpipe-skate', mash, {seeds: seeds(2)}).scores.every((s) => s < 30), '連打');
  assert.ok(many('halfpipe-skate', fresh(() => slowBot(250, [1, 2])), {seeds: seeds(2)}).scores.every((s) => s === 100), '回転数を かえる');
});

test('スマホの 押しやすさ・れんさパズル・ブロックくずし・2048・3Dダンジョン の 変更', () => {
  const has = (s, msg) => assert.ok(SRC.includes(s), msg || s);
  has('BH = clamp(Math.floor((BASE_Y - 34) / 17), 16, 24), BW = Math.round(BH * 2.125)', 'ジェンガ: 画面に あわせた 大きさ');
  has('let best = near((d) => !d.present || d.placed, 24); if (best < 0) best = near(() => true, 22);', 'ドミノ: 置ける すきまを さきに さがす');
  has("outline: 'rgba(40,70,120,.6)'", 'ゆきだるま: ふちどり');
  has("createMgCanvas(canvas, 300, { grow: true, maxGrow: 1.3 })", 'ソリティア: 画面に あきが あれば 高く');
  has('const fanOf = (col) =>', 'ソリティア: 長い 列を つめる');
  has('maxChain = Math.max(maxChain, chainNow);', 'れんさパズル: 時間切れの れんさも 数える');
  has('clamp(Math.round(10 + score / 3.5 + cleared * 15 + lives * 3), 10, 100)', 'ブロックくずし');
  has('best >= 256 ? 90', '2048'); has('Math.min(10, score / 220)', '2048 ボーナス');
  has('d[p.y][p.x] > d0[p.y][p.x] + 2)) continue;', '3Dダンジョン: 1本道に おとしあなを 置かない');
});

test('3Dダンジョン: 宝箱3つと 出口への 道を おとしあなが ふさがない(40迷路)', () => {
  const s = SRC; assert.ok(s.includes('m[c.y][c.x] = \'#\'; const d = mazeBfs(m, start.x, start.y);'));
  // 40迷路を 生成しても 例外が おきない(はじまって 1.5びょうは まだ つづいている)
  for (const seed of seeds(40)) { const r = play('fp-dungeon', {seed, limitMs: 1500, step: 100}); assert.equal(r.endedMs, null, `seed ${seed}`); }
});

test('結果の ひとこと: 90点いじょう・70点いじょう・30点いじょう・30点未満で ことばが かわる(報酬の 帯と おなじ 区切り)', () => {
  const a = SCRIPT.indexOf('function resultMessageForScore(score) {'), b = SCRIPT.indexOf('\n  }\n', a);
  const fn = new Function(`${SCRIPT.slice(a, b)}\n  }\n return resultMessageForScore;`)();
  const pool = (score) => new Set(Array.from({length: 200}, () => fn(score)));
  const S = pool(95), G = pool(75), M = pool(35), F = pool(10);
  assert.deepEqual([...pool(90)].sort(), [...S].sort()); assert.deepEqual([...pool(70)].sort(), [...G].sort());
  assert.deepEqual([...pool(30)].sort(), [...M].sort()); assert.deepEqual([...pool(29)].sort(), [...F].sort());
  assert.ok([...G].every((m) => !M.has(m)) && [...M].every((m) => !F.has(m)), '帯ごとに ちがう ことば');
  for (const m of F) assert.doesNotMatch(m, /だめ|へた|ダメ|失敗/, `せめない ことば: ${m}`);
  assert.ok([...F].includes('今回はここまで!'));
});
