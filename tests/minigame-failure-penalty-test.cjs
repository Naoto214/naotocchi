// ミニゲームの しっぱいに 育成ペナルティを つけない(2026-11-25 承認・C案)の 回帰テスト。
//  - 全100本の 通常ミニゲームで、記録される 29点以下の 結果は おとろえ(decline)・いのち(deathMeter)を 変えない
//  - 成功(30点〜)の コイン・そだち・おとろえ回復・Sランクの そだちボーナスは これまでどおり
//  - 放置(参加なし)・途中終了は これまでどおり(記録しない、げんき −6、きげん +2)
//  - クイックゲームの 結果処理は 育成に さわらない(これまでどおり)
//  - お世話不足・びょうき・老いによる おとろえ・いのちの しくみは そのまま
const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const {harness} = require('./helpers/runtime-harness.cjs');

function stubCtx() {
  return new Proxy({}, {
    get(o, k) {
      if (k in o) return o[k];
      if (k === 'measureText') return () => ({width: 10});
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => ({addColorStop() {}});
      if (k === 'getImageData') return () => ({data: new Uint8ClampedArray(4)});
      return () => {};
    },
    set(o, k, v) { o[k] = v; return true; },
  });
}
function living(h, extra = {}) {
  const s = h.api.state();
  Object.assign(s, {stage: 'growing', speciesLine: s.speciesLine || 'dog', ageTicks: 600, isSleeping: false, isSick: false,
    energy: 100, hunger: 80, happiness: 50, health: 80, decline: 30, deathMeter: 40, transformMeter: 0, transformOptions: null, boostTicks: 0}, extra);
  return s;
}
const probe = (id) => ({id, start(c) { c.innerHTML = '<div></div>'; }});
const PLAYED = {acts: 9, cover: 1, spans: 5}; // 参加あり(どの メーターの 形でも 通る)

test('全100本: 記録される 29点以下の 結果は、おとろえ・いのちを 変えない(コイン・そだちも 0、きげん・へんしんは これまでどおり)', () => {
  const h = harness({seed: 3, canvasContext: stubCtx()});
  const games = h.api.games;
  assert.equal(games.length, 100, '通常ミニゲームは 100本');
  const checked = [];
  for (const game of games) {
    const s = living(h);
    const before = {decline: s.decline, deathMeter: s.deathMeter, money: s.lifetime.money, growth: s.growth, sodachi: s.sodachi, count: s.minigameCount, energy: s.energy, happiness: s.happiness};
    h.api.startMinigame(game);
    h.api.finishMinigame(12, null, PLAYED);
    assert.equal(s.minigameCount, before.count + 1, `${game.id}: 記録される`);
    assert.equal(s.decline, before.decline, `${game.id}: おとろえ`);
    assert.equal(s.deathMeter, before.deathMeter, `${game.id}: いのち`);
    assert.equal(s.lifetime.money, before.money, `${game.id}: コイン 0`);
    assert.equal(s.growth, before.growth, `${game.id}: そだち 0`);
    assert.equal(s.sodachi, before.sodachi, `${game.id}: そだち 0`);
    assert.ok(s.energy < before.energy, `${game.id}: げんきは へる`);
    assert.equal(s.happiness, before.happiness + 7, `${game.id}: きげん +5+12/5`);
    assert.ok(s.transformMeter === 25 || s.transformOptions, `${game.id}: へんしんメーター +25`);
    h.api.closeAllMenuOverlays?.();
    checked.push(game.id);
  }
  assert.equal(new Set(checked).size, 100);
});

test('0点・29点でも 同じ(しっぱいの 帯の 両はし)', () => {
  const h = harness({seed: 4});
  for (const score of [0, 1, 14, 15, 29]) {
    const s = living(h);
    h.api.startMinigame(probe('fail-edge-' + score));
    h.api.finishMinigame(score);
    assert.equal(s.decline, 30, `score ${score}`);
    assert.equal(s.deathMeter, 40, `score ${score}`);
  }
});

test('成功の メリットは これまでどおり: 30〜69点 そだち+7・おとろえ−3・30コイン / 70点〜 そだち+14・おとろえ−8・60コイン / Sランク そだち2倍', () => {
  const h = harness({seed: 5});
  vm.runInContext('Math.random=()=>0.99', h.sandbox);
  const cases = [[30, 7, -3, 30], [69, 7, -3, 30], [70, 14, -8, 60], [89, 14, -8, 60]];
  for (const [score, growth, decline, coins] of cases) {
    const s = living(h, {sodachi: 20, maxSodachi: 20, growth: 0});
    const money = s.lifetime.money;
    h.api.startMinigame(probe('ok-' + score));
    h.api.finishMinigame(score);
    const gained = s.growth + (s.sodachi - 20) * h.api.sodachiCost(20);
    assert.equal(gained, growth, `score ${score}: そだち`);
    assert.equal(s.decline, 30 + decline, `score ${score}: おとろえ`);
    assert.equal(s.deathMeter, 40, `score ${score}: いのちは そのまま`);
    assert.equal(s.lifetime.money - money, coins, `score ${score}: コイン`);
  }
  const s = living(h);
  h.api.startMinigame(probe('s-rank'));
  h.api.finishMinigame(95);
  assert.ok(s.boostTicks >= 40, 'Sランクで そだち2倍が つく');
});

test('放置(参加なし)・途中終了は これまでどおり: 記録しない、げんき −6、きげん +2、おとろえ・いのち 変化なし', () => {
  const h = harness({seed: 6, canvasContext: stubCtx()});
  const game = h.api.games.find((g) => g.id === 'pinball-physics') || h.api.games[0];
  // 放置: メーターが「参加なし」
  let s = living(h);
  let count = s.minigameCount;
  h.api.startMinigame(game);
  h.api.finishMinigame(24, null, {acts: 0, spans: 0, cover: 0});
  assert.equal(s.minigameCount, count, '放置は 記録しない');
  assert.equal(s.energy, 94); assert.equal(s.happiness, 52);
  assert.equal(s.decline, 30); assert.equal(s.deathMeter, 40);
  // 途中終了
  s = living(h);
  count = s.minigameCount;
  h.api.startMinigame(game);
  h.api.retireMinigame();
  assert.equal(s.minigameCount, count, '途中終了は 記録しない');
  assert.equal(s.energy, 94); assert.equal(s.happiness, 52);
  assert.equal(s.decline, 30); assert.equal(s.deathMeter, 40);
});

test('クイックゲームの 結果処理は 育成に さわらない(これまでどおり)', () => {
  const h = harness({seed: 7});
  const s = living(h);
  const before = {decline: s.decline, deathMeter: s.deathMeter, energy: s.energy, happiness: s.happiness, count: s.minigameCount};
  h.api.startMinigame({id: 'quick-solo', start(c) { c.innerHTML = '<div></div>'; }});
  h.api.finishMinigame(0);
  assert.deepEqual({decline: s.decline, deathMeter: s.deathMeter, energy: s.energy, happiness: s.happiness, count: s.minigameCount}, before);
});

test('お世話不足・びょうき・老いの おとろえ・いのちは そのまま はたらく', () => {
  const h = harness({seed: 8});
  vm.runInContext('Math.random=()=>0.99', h.sandbox);
  // お世話不足: うんちが いっぱい・おなか 0 → おとろえが ふえ、いのちが 上がる
  let s = living(h, {poopCount: 6, hunger: 0, happiness: 0, decline: 0, deathMeter: 0});
  h.api.tick();
  assert.ok(s.decline > 0, 'お世話不足で おとろえが ふえる: ' + s.decline);
  for (let i = 0; i < 5; i++) h.api.tick();
  assert.ok(s.deathMeter > 0, 'おとろえが あると いのちが 上がる: ' + s.deathMeter);
  // 老い: 95さいは お世話が できていても 老いの リスクが のこる
  s = living(h, {ageTicks: 95 * 20, sodachi: 20, decline: 0, deathMeter: 50, hunger: 80, happiness: 80, energy: 80, health: 80, poopCount: 0});
  const dm = s.deathMeter;
  h.api.tick();
  assert.ok(s.deathMeter > dm - 1.1, '95さいでは 回復が 老いに おいつかない: ' + dm + ' → ' + s.deathMeter);
  assert.ok(s.stage === 'growing', '高齢でも ふつうに 育成が つづく');
});

test('高齢期(95さい)に 10回 しっぱいしても、いのちは しっぱいでは 上がらない', () => {
  const h = harness({seed: 9});
  const s = living(h, {ageTicks: 95 * 20, deathMeter: 70, decline: 10});
  for (let i = 0; i < 10; i++) { h.api.startMinigame(probe('elder-' + i)); h.api.finishMinigame(10); s.transformOptions = null; s.energy = 100; }
  assert.equal(s.deathMeter, 70);
  assert.equal(s.decline, 10);
  assert.equal(s.stage, 'growing');
});

test('セーブデータ: 形式は 変わらない(保存して 読みこむと おとろえ・いのち・記録が そのまま)', () => {
  const store = new Map();
  const storage = {getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k)};
  const h = harness({seed: 10, storage});
  const s = living(h, {decline: 37, deathMeter: 41});
  h.api.startMinigame(probe('save-probe'));
  h.api.finishMinigame(20);
  h.api.saveState();
  const key = [...store.keys()].find((k) => { try { return JSON.parse(store.get(k)).lifetime; } catch (e) { return false; } });
  assert.ok(key, 'セーブが 保存される');
  const saved = JSON.parse(store.get(key));
  assert.equal(saved.decline, 37);
  assert.equal(saved.deathMeter, 41);
  assert.equal(saved.lifetime.minigameRecords['save-probe'].last, 20);
  // 同じ セーブを 新しい ページで 読みこむ(セーブの 形式は 変えていない)
  const h2 = harness({seed: 11, storage, resume: true});
  assert.equal(h2.api.state().decline, 37);
  assert.equal(h2.api.state().deathMeter, 41);
  assert.equal(h2.api.state().lifetime.minigameRecords['save-probe'].last, 20);
});
