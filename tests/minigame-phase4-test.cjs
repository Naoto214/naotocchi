// ミニゲーム Phase 4(2026-11-28 ご承認・docs/audit/minigame-phase4-2026-11-28)の 回帰テスト。
// 本物の games.js + script.js を harness で うごかす(tools/minigame-audit/p3/probe.cjs)。
// たしかめる こと:
//  - 100点に とどかなかった ゲームの 式が、上手な 完全クリアで 100 に とどく(ふつうの クリアの 点は 下げない)
//  - ボクセルは まっすぐ 掘るだけで いつも 100 には ならない
//  - ハーフパイプ: ポンプボタンが くだりで 光り、光を 見てから 押す 人(0.25びょう おくれ)でも 大成功に とどく。おしっぱなしは 大成功に とどかない
//  - 制限時間: ヒット&ブロー 75びょう・ソリティア 150びょう・ふゆのカーリング 60びょう(1投15びょう)
//  - 「みじかめ」: グランプリは 完走でき、スカイシューターは ボスが 出る。ビリヤード・ミニゴルフは 短く しない(1打の 重さが かわらない)
//  - 盤上の 対戦: あいての 番は 持ち時間に 数えない。ならべる ゲームの 時間切れは 盤の 優劣で 判定
const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const {play, many, fresh} = require('../tools/minigame-audit/p3/probe.cjs');
const sk = require('../tools/minigame-audit/p3/skill.cjs');
const {S} = require('../tools/minigame-audit/p3/scen.cjs');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'games.js'), 'utf8');
const seeds = (n) => Array.from({length: n}, (_, i) => i + 1);
const timerAt = (id, opt = {}) => { let txt = ''; play(id, {seed: 1, limitMs: 300, ...opt, bot: (r) => { for (const sel of ['#mgTimer', '#hbTimer', '#soTimer']) { const e = r.q(sel), m = e && String(e.textContent).match(/\d+秒/); if (m && !txt) txt = m[0]; } }}); return txt; };

test('100点に とどく 式: 上手な 完全クリアの 点が 100(ふつうの クリアは 下げない)', () => {
  // 式の 上限を 直接 計算する(ゲームの 中の 式と おなじ もの。ソースに あることも たしかめる)
  const has = (s) => assert.ok(SRC.includes(s), s);
  has('const score = clamp(Math.round(10 + me * 12 + (won ? 22 + (me - cpu) * 3 : 0) - cpu * 2 + Math.min(8, bestRally)), 5, 100);');
  assert.equal(10 + 4 * 12 + 22 + 4 * 3 + 8, 100, 'ビーチバレー 4-0・ラリー8');
  has('me.hp * (win ? 0.38 : 0.3)'); assert.equal(Math.round(50 + 100 * 0.38 + 12), 100, 'かくとう ノーダメージ勝ち');
  has('const pSoft = Math.round(clamp((3.2 - soft) / 2.0, 0, 1) * 35);'); assert.equal(15 + 15 + Math.round(Math.min(1, (3.2 - 1.2) / 2.0) * 35) + 35, 100, '着陸 沈下1.2m/s');
  has('clamp(70 + (me - ai) * 10, 70, 100)'); has('clamp(70 + (me - ai) * 7.5, 70, 100)'); // テニス 3-0・エアホッケー 4-0
  has('strikes * 14'); assert.ok(14 + 20 * 2.9 + 2 * 14 >= 100, 'ボウリング 2ストライク');
  has('clamp(79 + lives * 7, 79, 100)'); has('25 * (SHOTS - shots) / Math.max(1, SHOTS - 2)'); // タンク・カタパルト
  has("best >= 512 ? 100 : best >= 256 ? 88 : best >= 128 ? 70 : best >= 64 ? 40 : best >= 32 ? 28 : 16"); // 2048
  has('const score = clamp(Math.round(10 + avg), 10, 100);'); // せんなぞり
  has('Math.max(0, tries - (PAIRS + 2))'); // しんけいすいじゃく
  has('100 - Math.max(0, guesses.length - 4) * 9'); // ヒット&ブロー 4回いない
});

test('上海: すぐ とりきれば 100(時間ボーナスは 制限の 4わりが のこれば 満点)・ソリティアの 時間ボーナスも 制限に 対する わりあい', () => {
  assert.ok(SRC.includes('84 + 16 * Math.min(1, remainS / (DURATION_MS / 1000 * 0.4))'));
  assert.ok(SRC.includes('90 + 10 * Math.min(1, remainS / (DURATION_MS / 1000 * 0.3))'));
  assert.ok(SRC.includes('72 + 28 * Math.min(1, Math.max(0, TIME_LIMIT_MS / 1000 - el) / (TIME_LIMIT_MS / 1000 * 0.6))'), 'マインスイーパー');
});

test('ボクセル: まっすぐ 掘る だけでは いつも 100 には ならない(まえは 6回中5回 100)。鉱石を あつめれば 高い 点', () => {
  const down = many('voxel-mine', S['voxel 下スワイプ連打'].bot, {seeds: seeds(6)});
  assert.ok(down.scores.filter((s) => s >= 100).length <= 2, `まっすぐ ${down.scores}`);
  assert.ok(down.scores.every((s) => s >= 30), `まっすぐでも ふつう いじょう ${down.scores}`);
  const ore = many('voxel-mine', sk.voxelBot({reach: 3}), {seeds: seeds(6)});
  assert.ok(ore.scores.filter((s) => s >= 70).length >= 3, `鉱石を ねらう ${ore.scores}`);
});

// 光を 見てから lag ms おくれて ポンプを 押す(はなすのは 光が きえたとき)。エアの たびに pattern の 回数だけ トリック
function cueBot(pattern, lag) {
  let litAt = null, held = false, i = 0, lastH = '';
  return (r, t) => {
    if (t < 1000) return;
    const p = r.q('#hpPump'), lit = !!p.style.boxShadow;
    if (lit && litAt === null) litAt = t; if (!lit) litAt = null;
    if (lit && t - litAt >= lag && !held) { r.down(p, 0, 0, 7); held = true; } else if (!lit && held) { r.up(p, 0, 0, 7); held = false; }
    const ht = r.q('#hpHint').textContent, fire = ht !== lastH && /エア/.test(ht); lastH = ht;
    if (fire) { const n = pattern[i++ % pattern.length]; for (let k = 0; k < n; k++) r.down(r.q('#hpTrick'), 0, 0, 2); }
  };
}
test('ハーフパイプ: くだりで ポンプが 光る。光を 見てから 押す 初心者(0.25びょう おくれ)は 70点いじょう、おしっぱなしは 70点未満', () => {
  const beginner = many('halfpipe-skate', fresh(() => cueBot([1], 250)), {seeds: seeds(2)});
  assert.ok(beginner.scores.every((s) => s >= 70), `光を 見て 押す ${beginner.scores}`);
  const hold = many('halfpipe-skate', sk.halfpipeBot({smart: false, pattern: [1]}), {seeds: seeds(2)});
  assert.ok(hold.scores.every((s) => s >= 30 && s < 70), `おしっぱなし ${hold.scores}`);
  const expert = many('halfpipe-skate', fresh(() => cueBot([1, 2], 150)), {seeds: seeds(2)});
  assert.ok(expert.scores.every((s) => s === 100), `回転数を かえる ${expert.scores}`);
});

test('制限時間: ヒット&ブロー 75びょう・ソリティア 150びょう・ふゆのカーリング 60びょう(カーリング3投は 45びょうの まま)', () => {
  assert.match(timerAt('hit-blow'), /75秒/);
  assert.match(timerAt('solitaire-klondike'), /150秒/);
  assert.match(timerAt('curling-winter'), /60秒/);
  assert.match(timerAt('curling-ice'), /45秒/);
  assert.match(timerAt('hit-blow', {length: 'short'}), /75秒/, '考える ゲームは みじかめでも 短く しない');
});

test('「みじかめ」: ビリヤード・ミニゴルフは 短く しない。グランプリは 上手に 走れば 完走できる', () => {
  assert.match(timerAt('billiards-6', {length: 'short'}), /40秒/);
  assert.match(timerAt('mini-golf-physics', {length: 'short'}), /40秒/);
  const gp = many('grand-prix-3d', sk.gpBot({dead: 0.35, lag: 2}), {seeds: seeds(3), length: 'short'});
  assert.ok(gp.scores.some((s) => s >= 80), `みじかめで 完走(1位なら 100) ${gp.scores}`);
});

test('盤上の 対戦: あいての 番は 持ち時間に 数えない(mgMyClock)。ならべる ゲームの 時間切れは 盤の 優劣で 判定(mgLineLead)', () => {
  for (const f of ['makeReversiGame', 'makeAnimalShogiGame', 'makeConnectFourGame', 'makeGomokuGame', 'makeCheckersGame', 'makeMancalaGame']) {
    const a = SRC.indexOf(`function ${f}(`), b = SRC.indexOf('\n  function ', a + 20), seg = SRC.slice(a, b);
    assert.ok(seg.includes('mgMyClock(') && seg.includes('myClock.tick(now) > TIME_LIMIT_MS'), f);
  }
  assert.equal((SRC.match(/mgLineLead\(board, [45], ME, AI\)/g) || []).length, 2);
  // 放置(じぶんの 番の まま)だと 60びょうで 時間切れ。記録は しない(参加度・盤上の 対戦の 判定は これまでどおり)
  const r = play('gomoku-9', {seed: 1, limitMs: 90000});
  assert.ok(r.endedMs >= 59000 && r.endedMs <= 66000, `${r.endedMs}`);
  assert.equal(r.recorded, false);
});
