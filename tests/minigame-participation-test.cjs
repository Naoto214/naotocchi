// 参加度(2026-11-26 ご承認・docs/audit/minigame-participation-2026-11-26)の 回帰テスト。
// たしかめる こと:
//  - 共通の 判定(script.js mgParticipated): 4びょう区切り 1つで おわった アクションの 回は、最初の 目標を 達成した(achieved)ときだけ 参加。
//    すぐ やられて しまう ゲーム(minSpans 3)は 3区切り。考える ゲーム・盤上の 対戦は これまでどおり
//  - 参加なしは「途中で やめた」と おなじ(げんき −6・きげん +2。記録・コイン・へんしんメーター なし)。みじかい 回は やさしい ことば
//  - 全100本が 参加度メーターを わたす(Phase 3 の #597 で 入れる 16本を のぞく)
//  - スネークなど: 放置・1回だけ・すぐ 失敗する 連打は 記録しない。ふつうに 長く 遊べば 記録する
const assert = require('node:assert/strict');
const {test} = require('node:test');
const {harness} = require('./helpers/runtime-harness.cjs');
const {play} = require('../tools/minigame-audit/p3/probe.cjs');
const table = () => { const {execFileSync} = require('node:child_process'); return JSON.parse(execFileSync(process.execPath, [require.resolve('../tools/minigame-audit/participation-table.cjs')], {maxBuffer: 1 << 24}).toString()); };

function finishWith(id, score, detail) {
  const h = harness({seed: 3});
  const s = h.api.state();
  Object.assign(s, {isSleeping: false, isSick: false, energy: 100, happiness: 50, transformMeter: 0, transformOptions: null});
  let done = null, box = null;
  h.api.startMinigame({id, start(c, d) { box = c; done = d; }});
  h.dispatch(box, 'pointerdown', {pointerId: 1, clientX: 10, clientY: 10});
  const was = {count: s.minigameCount, money: s.lifetime.money, energy: s.energy, happiness: s.happiness};
  done(score, null, detail);
  h.advance(3000);
  return {h, s, counted: s.minigameCount - was.count, coins: s.lifetime.money - was.money, energy: s.energy - was.energy, happiness: s.happiness - was.happiness, transform: s.transformMeter};
}

test('共通の 判定: 1区切りで おわった アクションの 回は 達成が ある ときだけ 参加', () => {
  const quick = finishWith('road-city', 20, {acts: 3, spans: 1, cover: 1});
  assert.equal(quick.counted, 0, '達成なし・1区切り');
  assert.equal(quick.energy, -6); assert.equal(quick.happiness, 2); assert.equal(quick.transform, 0);
  assert.equal(finishWith('road-city', 20, {acts: 3, spans: 1, cover: 1, achieved: true}).counted, 1, '達成あり');
  assert.equal(finishWith('road-city', 20, {acts: 4, spans: 2, cover: 1}).counted, 1, '2区切り(4びょう いじょう)');
  const r = finishWith('road-city', 20, {acts: 4, spans: 2, cover: 1});
  assert.equal(r.transform, 25, '記録される 回は これまでどおり へんしん +25(C案・点に 関係なし)');
});

test('共通の 判定: すぐ やられて しまう ゲームは 3区切り(minSpans)。考える ゲーム・盤上は これまでどおり', () => {
  assert.equal(finishWith('snake-classic', 10, {acts: 5, spans: 2, cover: 1, minSpans: 3}).counted, 0);
  assert.equal(finishWith('snake-classic', 10, {acts: 6, spans: 3, cover: 1, minSpans: 3}).counted, 1);
  assert.equal(finishWith('snake-classic', 21, {acts: 2, spans: 1, cover: 1, minSpans: 3, achieved: true}).counted, 1, 'リンゴを 食べたら すぐ おわっても 参加');
  assert.equal(finishWith('puzzle-2048', 20, {acts: 3}).counted, 1, '考える ゲーム(区切りを 見ない)');
  assert.equal(finishWith('puzzle-2048', 20, {acts: 0}).counted, 0);
  assert.equal(finishWith('reversi-6', 40, {acts: 5, maxGap: 9000, decided: false}).counted, 1, '盤上の 対戦');
});

test('参加なしの ことば: みじかく おわった 回は「すぐにおわった」、放置は「そうさがなかった」', () => {
  const a = finishWith('road-city', 20, {acts: 3, spans: 1, cover: 1}).h.get('message').textContent;
  const b = finishWith('road-city', 20, {acts: 0, spans: 0, cover: 0}).h.get('message').textContent;
  assert.match(a, /すぐにおわったので、今回は記録しないよ。もう少しあそぶと記録されるよ/);
  assert.match(b, /そうさがなかったので、今回は記録しないよ/);
});

test('全100本: 参加度メーターを わたす(#597 の 16本を のぞく)', () => {
  const t = table();
  assert.equal(t.length, 100);
  const P3 = new Set(['stack-themed', 'stack-snowman', 'stack-harvest', 'stack-acorn', 'stack-sakura', 'stack-leaves', 'darts-board', 'rhythm-highway-3d', 'asteroids-classic', 'fruit-slice', 'archery-3d', 'halfpipe-skate', 'street-fight', 'grand-prix-3d', 'dragDecorate-cake', 'domino-run']);
  const none = t.filter((r) => r.kind === 'なし' || r.kind === '入力').map((r) => r.id);
  assert.deepEqual(none.filter((id) => !P3.has(id)), [], 'メーターの ない ゲーム');
});

test('スネーク・フロッガー・ボンバー: 放置・1回だけ・連打で すぐ 失敗する 回は 記録しない', () => {
  const tap1 = (r, t) => { if (t === 1000) { const n = r.box.children.find((c) => c.listeners && c.listeners.length) || r.box; r.tap(n); } };
  const mash = (r, t) => { if (t >= 1000 && t % 150 === 0) for (const n of [...globalThis.__mgListened]) { if (!n.isConnected || n.disabled || /^mg(Quit|Help)/.test(n.id || '')) continue; if (n.listeners.some((l) => l.type === 'pointerdown')) r.tap(n); } };
  for (const id of ['snake-classic', 'frogger-road', 'bomber-maze']) for (const [name, bot] of [['放置', null], ['1回', tap1], ['連打', mash]]) {
    const r = play(id, {seed: 1, bot});
    assert.equal(r.recorded, false, `${id} ${name}: ${JSON.stringify(r)}`);
  }
});

test('スネーク: よけながら 長く 遊べば 記録する(へんしん +25)', () => {
  // 0.8びょうごとに 下・左・上・右 と まがって 小さな 正方形を まわる(リンゴは ねらわない)。時間いっぱい 遊ぶ
  const loop = (() => { let k = 0; return (r, t) => { if (t >= 1300 && (t - 1300) % 800 === 0) { const pad = r.pad(); if (!pad) return; const d = [[0, 1], [-1, 0], [0, -1], [1, 0]][k++ % 4]; r.down(pad, 150, 150, 9); r.move(pad, 150 + d[0] * 40, 150 + d[1] * 40, 9); r.up(pad, 150 + d[0] * 40, 150 + d[1] * 40, 9); } }; })();
  const r = play('snake-classic', {seed: 2, bot: loop});
  assert.ok(r.endedMs > 9000, `遊んだ 時間 ${r.endedMs}`);
  assert.equal(r.recorded, true);
  assert.equal(r.transform, 25);
});

test('ふつうに 遊ぶ(でたらめでも 長く 操作する)回は 記録する: パズル・釣り・レース など', () => {
  const rnd = (seed) => { let s = seed; const rand = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); return (r, t) => { if (t < 1000 || t % 400) return; const ns = [...globalThis.__mgListened].filter((n) => n.isConnected && !n.disabled && !/^mg(Quit|Help)/.test(n.id || '') && n.listeners.some((l) => l.type === 'pointerdown')); if (!ns.length) return; const n = ns[Math.floor(rand() * ns.length)]; const x = Math.floor(rand() * 300), y = Math.floor(rand() * 300); r.down(n, x, y); r.move(n, x + 30, y - 30); r.up(n, x + 30, y - 30); }; };
  for (const id of ['lights-out', 'fishing-sea', 'race-3d', 'match-3', 'pipe-connect', 'tank-battle']) {
    const r = play(id, {seed: 1, bot: rnd(7)});
    assert.equal(r.recorded, true, `${id}: ${JSON.stringify(r)}`);
  }
});
