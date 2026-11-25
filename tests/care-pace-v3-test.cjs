'use strict';
// お世話の頻度 監査 VERSION 3(2026-11-25 採用候補): 本体の script.js / care-status.js / item-system.js の
// ふるまいを たしかめる。数値の 根拠は docs/audit/care-pace-2026-11-25/REPORT-V3.md。
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const { harness } = require('./helpers/runtime-harness.cjs');

function life(extra = {}) {
  const h = harness({ deterministic: true });
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', speciesLine: 'dog', stageIndex: 2, ageTicks: 200, hunger: 50, happiness: 50, energy: 50, health: 100,
    poopCount: 0, isSick: false, isSleeping: false, deathMeter: 0, decline: 0, companions: [], partner: null, totalSicknessCount: 0 }, extra);
  return { h, s, tap: id => h.dispatch(h.get(id), 'click') };
}
const ticks = (h, n) => { for (let i = 0; i < n; i++) h.api.tick(); };

test('お世話の頻度: 0.20/tick で減り、100→30 が 約17分(350 tick)', () => {
  const { h, s } = life({ hunger: 100, happiness: 100, energy: 100, poopCount: 0 });
  ticks(h, 100);
  assert.ok(Math.abs(s.hunger - 80) < 3, 'hunger after 5 min: ' + s.hunger);
  assert.ok(s.energy > 75 && s.energy < 85, 'energy after 5 min: ' + s.energy);
});

test('うんちは 2.5〜4.5分ごと(かたまって 出ない)・ねている 間は ゆっくり', () => {
  const { h, s } = life({ hunger: 100, happiness: 100 });
  let first = null;
  for (let t = 1; t <= 200 && first == null; t++) { h.api.tick(); if (s.poopCount > 0) first = t; }
  assert.ok(first >= 50 && first <= 90, 'first poop at tick ' + first);
});

test('ねている間に ごはんを 押すと、起きて そのまま 食べる(押すのは 1回)', () => {
  const { s, tap } = life();
  tap('sleepBtn');
  assert.equal(s.isSleeping, true);
  tap('feedBtn');
  assert.equal(s.isSleeping, false);
  assert.equal(s.hunger, 80, 'ごはん1回 +30');
});

test('じゃれすぎても ごきげんは 下がらず、15秒ごとに また 喜ぶ', () => {
  const { h, s, tap } = life();
  for (let i = 0; i < 4; i++) tap('playWithBtn');
  const before = s.happiness;
  tap('playWithBtn');
  assert.equal(s.happiness, before);
  ticks(h, 25);
  assert.equal(s.affectionStreak, 0);
});

test('じゃれるの せいちょうは 30秒に 1回まで(連打が 稼ぎに ならない)', () => {
  const { h, s, tap } = life({ sodachi: 30, maxSodachi: 30, growth: 0 });
  tap('playWithBtn');
  const g1 = s.growth;
  tap('playWithBtn');
  assert.equal(s.growth, g1, '2回目は せいちょう なし');
  ticks(h, 10);
  tap('playWithBtn');
  assert.ok(s.growth > g1, '30秒後は ふたたび せいちょう');
});

test('ミニゲーム1回の げんきは 8', () => {
  const { h, s } = life({ energy: 80 });
  h.api.startMinigame({ id: 'v3-probe', start(c) { c.innerHTML = '<div></div>'; } });
  h.api.finishMinigame(60);
  assert.ok(s.energy >= 70 && s.energy <= 73, 'energy after one game: ' + s.energy);
});

test('けんこう0が 続いても、かならず「おわかれの まえぶれ」を 出し、3分の 猶予の 前には 死なない', () => {
  const { h, s } = life({ hunger: 0, happiness: 0, energy: 0, health: 0, isSick: true, totalSicknessCount: 9 });
  let warned = null, died = null;
  for (let t = 0; t < 400 && s.stage === 'growing'; t++) { h.api.tick(); if (s.dying && warned == null) warned = t; if (s.stage === 'dead') died = t; }
  assert.ok(warned != null, 'まえぶれが 出る');
  assert.ok(died == null || died - warned >= 59, 'まえぶれから 死亡まで ' + (died - warned) + ' tick');
});

test('まえぶれの 間、お世話を 続けていれば 猶予は へらない(70さい未満)。ろうねんの 老衰には かけない', () => {
  const young = life({ deathMeter: 99 });
  young.h.api.tick();
  assert.equal(young.s.dying, true);
  const left = young.s.dyingTicks;
  young.tap('feedBtn');
  ticks(young.h, 5);
  assert.equal(young.s.dyingTicks, left, '看病中は 猶予が へらない');
  const old = life({ ageTicks: 75 * 20, deathMeter: 99 });
  old.h.api.tick();
  const leftOld = old.s.dyingTicks;
  old.tap('feedBtn');
  ticks(old.h, 5);
  assert.ok(old.s.dyingTicks < leftOld, 'ろうねんは 猶予が へる(老衰の しくみを のこす)');
});

test('暮らしが 落ちついている 間は、なかま・こいびとが はなれない(きずな 50 で とまる)', () => {
  const { h, s } = life({ hunger: 90, happiness: 90, health: 100 });
  s.companions = [{ id: 'cat_friend', bond: 100 }, { id: 'tanuki', bond: 100 }];
  s.partner = { id: 'grove_deer', label: 'こだちのシカ', emoji: '🦌', gender: 'female', orientationId: 'bi', attractedTo: ['female', 'male', 'nonbinary'], affection: 100, married: false, bondCount: 0 };
  for (let i = 0; i < 1500; i++) { h.api.decayCompanionBonds(); h.api.decayRelationship(); }
  assert.equal(s.companions.length, 2);
  assert.ok(s.companions.every(c => c.bond === 50), JSON.stringify(s.companions));
  assert.equal(s.partner && s.partner.affection, 50);
});

test('ほんとうに 放っておかれた(びょうき)ときは きずなが 冷えて、はなれる ことも ある', () => {
  const { h, s } = life({ isSick: true, health: 30, sodachi: 20, maxSodachi: 20 });
  s.companions = [{ id: 'cat_friend', bond: 60 }];
  for (let i = 0; i < 600; i++) h.api.decayCompanionBonds();
  assert.equal(s.companions.length, 0);
});

test('おともだちバッジを そうびすると きずなは 60 で とまる', () => {
  const { h, s } = life({ isSick: true, health: 30 });
  s.lifetime.equippedItemId = 'bond1';
  s.companions = [{ id: 'cat_friend', bond: 100 }];
  for (let i = 0; i < 1500; i++) h.api.decayCompanionBonds();
  assert.equal(s.companions[0].bond, 60);
});

test('救急箱: 自動の 治療は 病気の 実績・フェニックスに 数えず、まえぶれでは 1回だけ 手当てする', () => {
  const { h, s } = life({ isSick: true, health: 50 });
  s.lifetime.equippedItemId = 'scarf';
  const cured = s.lifetime.sicknessCured || 0;
  h.api.tick();
  assert.equal(s.isSick, false);
  assert.equal(s.lifetime.sicknessCured || 0, cured);
  Object.assign(s, { deathMeter: 99, health: 10 });
  ticks(h, 2); // まえぶれが 出た 次の tick で 手当て
  assert.equal(s.dying, true, 'まえぶれは 消さない');
  assert.ok(s.health >= 30, '手当て +30: ' + s.health);
  const after = s.health;
  ticks(h, 3);
  assert.ok(s.health <= after + 6, '手当ては 1回だけ');
});

test('ふかふかまくら: ねている 間は おなか・ごきげんが 減らず、うんちも 出ない', () => {
  const { h, s, tap } = life({ hunger: 80, happiness: 80 });
  s.lifetime.equippedItemId = 'sleepboost1';
  tap('sleepBtn');
  ticks(h, 25);
  assert.equal(s.hunger, 80);
  assert.equal(s.poopCount, 0);
});

test('閉じていた 間の 減りは ひらいている 時より おだやか(0.14/tick)', () => {
  const { h, s } = life({ hunger: 90, happiness: 90, savedAt: 1 });
  h.api.applyOfflineProgress(1 + 30 * 60 * 1000, 1);
  assert.ok(s.hunger >= 60, 'hunger after 30 min away: ' + s.hunger);
});

test('フェニックスは 生まれかわり(過去の人生 3回いじょう)で 40さい いこうの 抽選に 入る', () => {
  const { h, s } = life({ ageTicks: 40 * 20, sicknessCuredThisLife: 10, careTicks: 1, careSum: 50 });
  const seen = past => {
    s.lifetime.pastLives = Array.from({ length: past }, () => ({ speciesLine: 'cat' }));
    let found = false;
    for (let i = 0; i < 200 && !found; i++) found = h.api.pickTransformCandidates([], 3).includes('phoenix');
    return found;
  };
  assert.equal(seen(0), false, '病気を 何回 なおしても 生まれかわりが なければ 出ない');
  assert.equal(seen(3), true);
});

test('実績: ごはん12・そうじ15・病気を なおす 通算3/8・ねがおの見守り(通算10)', () => {
  const src = fs.readFileSync('script.js', 'utf8');
  assert.match(src, /id: 'feed-100'[^\n]*s\.actionCounts\.feed >= 12 /);
  assert.match(src, /id: 'clean-50'[^\n]*s\.actionCounts\.clean >= 15 /);
  assert.match(src, /id: 'sick-cured-10'[^\n]*l\.sicknessCured >= 3 /);
  assert.match(src, /id: 'sick-cured-30'[^\n]*l\.sicknessCured >= 8 /);
  assert.match(src, /id: 'medicine-30'[^\n]*ねがおの見守り[^\n]*l\.sleepWatched \|\| 0\) >= 10 /);
});

test('自分で 起きた 睡眠は「ねがおの見守り」に 数える', () => {
  const { h, s, tap } = life({ energy: 100 });
  tap('sleepBtn');
  ticks(h, 32);
  assert.equal(s.isSleeping, false);
  assert.equal(s.lifetime.sleepWatched, 1);
});

test('おしらせ: ねている 時の 空腹は「ごはん」、じゃれすぎの 手前で「あそぶ」を すすめる', () => {
  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(fs.readFileSync('care-status.js', 'utf8'), sandbox);
  const cs = sandbox.module.exports;
  assert.equal(cs.assess({ stage: 'growing', hunger: 20, happiness: 80, energy: 80, health: 100, isSleeping: true }).action, 'feedBtn');
  const low = { stage: 'growing', hunger: 80, happiness: 20, energy: 80, health: 100, poopCount: 0 };
  assert.equal(cs.assess({ ...low, affectionStreak: 0 }).action, 'playWithBtn');
  assert.equal(cs.assess({ ...low, affectionStreak: 4 }).action, 'playBtn');
  assert.equal(cs.assess({ stage: 'growing', hunger: 80, happiness: 80, energy: 80, health: 100, poopCount: 2 }), null, 'うんち2個では まだ おしらせしない');
});

test('アイテムの 値段: トイレットペーパー1000・おもちゃばこ1000・おべんとうばこ1500・救急箱2000・ふかふかまくら2000', () => {
  const items = require('../item-system.js');
  const catalog = items.CATALOG || (items.catalog && items.catalog());
  const price = id => (catalog[id] || {}).price;
  assert.deepEqual(['poop1', 'ribbon', 'bowtie', 'scarf', 'sleepboost1', 'bond1', 'partner1'].map(price), [1000, 1000, 1500, 2000, 2000, 5000, 5000]);
});
