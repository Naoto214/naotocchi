// Phase 1 (U13): 説明文に 実装に ない 目標・ボーナスを 書かない。
// 回数の 説明(README・MINIGAME_INFO・MINIGAME_CONTROLS)は、ゲームが 画面に 出す
// 定数(HUD の「1/4ハンド」など)と そろっている ことを たしかめる。
// ソースの コメントは しばらない(脆い ので)。プレイヤーが 読む 文字だけを 見る。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

// はじめての 説明画面(desc と そうさ)と、はじめた あとの 画面(header・hint)を かえす
function screens(h, id) {
  const game = h.api.games.find((g) => g.id === id);
  assert.ok(game, id + ': game must exist');
  h.api.startMinigame(game, {intro: true});
  const view = h.get('minigameOverlay');
  const intro = view.innerHTML;
  const desc = intro.match(/<div class="mg-intro-desc">([\s\S]*?)<\/div>/)?.[1] || '';
  const controls = intro.match(/<div class="mg-intro-controls">([\s\S]*?)<\/div>([\s\S]*?)<\/div>/)?.[2] || '';
  h.dispatch(view.querySelector('#mgIntroStart'), 'click');
  const body = view.innerHTML;
  const header = body.match(/<div class="mg-header">([\s\S]*?)<\/div>/)?.[1] || '';
  const hint = body.match(/<div class="mg-hint"[^>]*>([\s\S]*?)<\/div>/)?.[1] || '';
  h.api.retireMinigame();
  return {desc, controls, header, hint};
}

function num(text, re, label) {
  const m = text.match(re);
  assert.ok(m, `${label}: ${re} not found in ${JSON.stringify(text)}`);
  return Number(m[1]);
}

test('domino-run does not promise a bonus for spare dominoes', () => {
  // 手持ちは 欠けの数+1 で、クリア時の 余りは いつも 1。点数にも 入らない
  const {desc, controls, hint} = screens(harness(), 'domino-run');
  assert.ok(controls.length > 0 && hint.length > 0);
  for (const [where, text] of [['desc', desc], ['controls', controls], ['hint', hint]]) {
    assert.doesNotMatch(text, /ボーナス/, `domino-run ${where} must not mention a bonus`);
  }
});

test('descriptions state the same counts the game shows on screen', async (t) => {
  const h = harness();
  const cases = [
    // [id, 説明の どこ, 説明の 数, 画面の どこ, 画面の 数]
    ['tennis-rally', 'controls', /(\d+)ポイント先取り/, 'hint', /(\d+)ポイント先取り/],
    ['tower-defense', 'desc', /(\d+)ウェーブ/, 'header', /ウェーブ\d+\/(\d+)/],
    ['grand-prix-3d', 'desc', /(\d+)周/, 'header', /LAP \d+\/(\d+)/],
    ['curling-winter', 'desc', /(\d+)こずつ/, 'header', /残り(\d+)/],
  ];
  for (const [id, textKey, textRe, screenKey, screenRe] of cases) await t.test(id, () => {
    const s = screens(h, id);
    assert.equal(num(s[textKey], textRe, `${id} ${textKey}`), num(s[screenKey], screenRe, `${id} ${screenKey}`));
  });
});

test('README round counts match the counts each game shows on screen', async (t) => {
  const readme = fs.readFileSync('README.md', 'utf8');
  const line = readme.split('\n').find((l) => l.includes('回数制のゲームも短くしました')) || '';
  assert.ok(line, 'README must keep the round-count summary');
  const h = harness();
  const cases = [
    ['darts-board', /ダーツ (\d+)投/, /残り(\d+)本/],
    ['blackjack-21', /ブラックジャック (\d+)ハンド/, /\d+\/(\d+)ハンド/],
    ['yacht-dice', /ヨット (\d+)ターン/, /\d+\/(\d+)ターン/],
    ['plane-landing', /着陸 (\d+)回/, /\d+\/(\d+)回目/],
    ['grand-prix-3d', /グランプリ (\d+)周/, /LAP \d+\/(\d+)/],
    ['curling-ice', /カーリング (\d+)投/, /残り(\d+)/],
    ['tower-defense', /タワーディフェンス (\d+)ウェーブ/, /ウェーブ\d+\/(\d+)/],
  ];
  for (const [id, readmeRe, headerRe] of cases) await t.test(id, () => {
    const {header} = screens(h, id);
    assert.equal(num(line, readmeRe, `${id} README`), num(header, headerRe, `${id} header`));
  });
});
