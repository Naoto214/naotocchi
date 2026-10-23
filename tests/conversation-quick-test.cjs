// Conversation v2 — クイックのあとの一言(Pilot)。データの点検、結果の読み方、実ゲームでの流れ、画面の移動。
const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const Q = require('../conversation-quick.js');
const {harness} = require('./helpers/runtime-harness.cjs');

function memoryStorage() {
  const data = new Map();
  return {getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key)};
}

test('pilot data: 5-10 real quick games with different result shapes, short lines, no questions', () => {
  const h = harness();
  const games = h.api.QUICK_GAMES;
  assert.equal(games.length, 50, 'the quick catalogue still has 50 games');
  assert.deepEqual(Q.validate(games.map(g => g.id)), []);
  assert.ok(Q.PILOT_GAMES.length >= 5 && Q.PILOT_GAMES.length <= 10, `${Q.PILOT_GAMES.length} games`);
  const defs = Q.PILOT_GAMES.map(id => games.find(g => g.id === id));
  // 結果の形がちがうものを含む: 時間切れで成功(よける・まつ)/ タップ / スワイプ / ドラッグ / 長おし以外の操作
  assert.ok(defs.some(d => d.survive) && defs.some(d => !d.survive), 'survive-type and act-type games');
  const uses = new Set(defs.flatMap(d => d.uses));
  for (const u of ['tap', 'drag', 'swipe', 'none']) assert.ok(uses.has(u), `a pilot game uses ${u}`);
  for (const id of Q.PILOT_GAMES) {
    assert.ok(Q.UNITS.some(u => u.games?.includes(id) && u.modes.includes('solo')), `${id} has its own solo lines`);
    assert.ok(Q.UNITS.some(u => u.games?.includes(id) && u.moments.includes('endedBy')), `${id} has a line when a mixed run ends on it`);
  }
  assert.ok(Q.UNITS.every(u => u.kind === 'quick'), 'no choice questions after quick');
  const long = Q.UNITS.filter(u => u.beats.length === 3);
  assert.ok(Q.UNITS.every(u => u.beats.length <= 3) && long.length >= 1 && long.length <= 3, 'usually 1-2 lines, rarely 3');
  assert.ok(Q.UNITS.some(u => u.with) && Q.UNITS.some(u => u.trait), 'visitor exchanges and personality lines');
  // 「すごい!」「残念!」だけの台詞にしない
  const flat = /^(すごい|やった|ざんねん|残念|おしい|がんばった)[!！。]?$/;
  for (const u of Q.UNITS) for (const b of u.beats) assert.ok(!flat.test(b.text), `${u.id}: ${b.text}`);
});

test('moments are read from the quick result only (perfect, zero, best, first, combo, close, ended-by)', () => {
  const m = (stats, prev) => Q.moments({total:10, lives:1, solo:'mash', lastMiss:null, maxCombo:2, ...stats}, prev);
  assert.deepEqual(m({cleared:10, maxCombo:10}, {runs:2, best:8}), ['perfect', 'newBest']);
  assert.deepEqual(m({cleared:0, maxCombo:0, lives:0}, {runs:2, best:8}), ['zero']);
  assert.deepEqual(m({cleared:4}, {runs:0, best:0}), ['firstTime', 'plain']);
  assert.deepEqual(m({cleared:8}, {runs:3, best:9}), ['close']);
  assert.deepEqual(m({cleared:5}, {runs:3, best:9}), ['plain']);
  assert.deepEqual(m({cleared:7, maxCombo:7}, {runs:3, best:9}), ['bigCombo']);
  // まぜた 20 本: 3 回目の失敗で終わったら、そのゲームが「おまけ」のきっかけ
  const mix = {total:20, solo:null, lives:0, lastMiss:'wait', maxCombo:3};
  assert.deepEqual(Q.moments({...mix, cleared:9}, {runs:5, best:15}), ['endedBy', 'plain']);
  assert.deepEqual(Q.moments({...mix, cleared:18}, {runs:5, best:15}), ['newBest', 'close', 'endedBy']);
  assert.deepEqual(Q.moments({...mix, cleared:20, lives:1, lastMiss:'eat'}, {runs:5, best:15}), ['perfect', 'newBest']);
  assert.equal(Q.isNotable(['endedBy', 'plain'], 'wait'), true, 'ended on a pilot game: worth a word');
  assert.equal(Q.isNotable(['endedBy', 'plain'], 'catch'), false, 'ended on a game without lines: an ordinary result');
});

test('candidates follow the mode, the game, the visitor and the personality', () => {
  const ids = ctx => Q.candidates({mode:'solo', soloId:'wait', moments:['plain'], temperament:{curiosity:3, persistence:3, boldness:3}, ...ctx}).map(u => u.id).sort();
  assert.deepEqual(ids({}), ['q-wait-itch']);
  assert.ok(ids({temperament:{curiosity:5}}).includes('q-wait-what'), 'a curious one wonders');
  assert.ok(ids({temperament:{persistence:5}}).includes('q-any-again'));
  assert.ok(ids({temperament:{persistence:1}}).includes('q-any-fingers'));
  assert.deepEqual(ids({soloId:'catch'}), [], 'solo games outside the pilot stay quiet');
  assert.ok(ids({soloId:'stop', moments:['close']}).every(id => id !== 'q-stop-early'), 'the visitor line needs a visitor');
  assert.ok(ids({soloId:'stop', moments:['close'], visitorKind:'partner'}).includes('q-stop-early'));
  assert.ok(!ids({soloId:'stop', moments:['close'], visitorKind:'partner', visitorQuiet:true}).includes('q-stop-early'), 'a quiet visitor does not join');
  // まぜた 20 本: ゲームの台詞は、そのゲームで終わったときだけ
  const mix = ctx => Q.candidates({mode:'mix', temperament:null, ...ctx}).map(u => u.id).sort();
  assert.deepEqual(mix({moments:['endedBy', 'plain'], lastMiss:'wait'}), ['q-mix-talk', 'q-wait-itch']);
  assert.deepEqual(mix({moments:['endedBy', 'plain'], lastMiss:'catch'}), ['q-mix-talk']);
  assert.ok(!mix({moments:['plain'], lastMiss:'wait'}).includes('q-wait-itch'), 'a mid-run miss is not the ending');
  assert.deepEqual(mix({moments:['perfect']}), ['q-mix-perfect']);
});

// ---- 実ゲーム ----
function boot({seed = 3, storage = null, companions = [], temperament = null} = {}) {
  const h = harness({deterministic:true, seed, ...(storage ? {storage} : {})});
  const shown = [];
  let tc = '';
  const speaker = h.get('speechSpeaker');
  Object.defineProperty(h.get('speechText'), 'textContent', {get:() => tc, set:v => {
    tc = String(v);
    if (tc) shown.push({text:tc, who:speaker.dataset.label, at:vm.runInContext('Date.now()', h.sandbox)});
  }, configurable:true});
  const s = h.api.state();
  Object.assign(s, {stage:'growing', isSleeping:false, isSick:false, energy:100, health:100, hunger:90, happiness:90, regionId:'home'});
  s.partner = null;
  s.companions = companions.map(id => ({id, bond:90}));
  if (!s.individuality) s.individuality = require('../individuality.js').create('dog', ['home'], () => 0.5);
  if (temperament) Object.assign(s.individuality.temperament, temperament);
  if (companions.length) h.api.setPresentCastFixture();
  h.api.render();
  return {h, s, shown};
}
const settle = (h, ms) => { for (let t = 0; t < ms; t += 50) h.advance(50); };
const always = h => vm.runInContext('Math.random = () => 0.01', h.sandbox);
const never = h => vm.runInContext('Math.random = () => 0.99', h.sandbox);
// クイックを 1 回終える。quick.js と同じ順(onRunEnd → 結果カード)で、数えた結果だけを渡す
function finishQuick(h, soloId, stats) {
  assert.equal(h.api.startQuickRun(soloId || undefined), true, 'quick starts');
  const total = soloId ? 10 : 20;
  const full = {cleared:5, total, maxCombo:2, level:2, lives:0, plays:{}, clears:{}, solo:soloId || null, lastMiss:soloId || 'eat', ...stats};
  full.score = Math.round(full.cleared * 100 / total);
  h.api.conv2.recordQuickRun(full);
  h.api.finishMinigame(full.score);
}
const card = h => h.get('mgResultToast');
const unitDef = h => { const u = h.api.conv2.unit(); return u && Q.UNITS.find(x => x.id === u.id); };

test('a real solo run hands its counts to the talk: lastMiss is read, judging and records are unchanged', () => {
  const {h, s} = boot({seed:7});
  never(h);
  assert.equal(h.api.startQuickRun('wait'), true);
  h.advance(40);
  const run = h.api.quickSoloRun('wait')._run;
  // 3 回とも さわってしまう(まて! は さわったら ×)
  for (let i = 0; i < 40 && !s.lifetime.quick.single.wait; i++) {
    const g = run.current?.game;
    if (g) (g.onPress || g.onTap)?.call(g, 20, 20);
    h.advance(16); h.advance(600);
  }
  const last = h.api.conv2.lastQuickRun();
  assert.ok(last, 'the counts are kept until the result card');
  assert.equal(last.stats.lastMiss, 'wait');
  assert.equal(last.stats.lives, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(last.prev)), {runs:0, best:0}, 'the record before this run');
  assert.deepEqual(JSON.parse(JSON.stringify(s.lifetime.quick.single.wait)), {runs:1, best:last.stats.cleared}, 'the record shape is unchanged');
  settle(h, 3000);
  assert.equal(h.api.conv2.lastQuickRun(), null, 'used once at the result card, then dropped');
  assert.equal(h.api.conv2.unit(), null, 'with no luck, nothing is said');
});

test('the result card and もういちど stay for their full 6 s; the talk comes after, in 1-2 lines', () => {
  const {h, shown} = boot({seed:8});
  always(h);
  finishQuick(h, 'mash', {cleared:10, maxCombo:10, lives:3});   // はじめて・パーフェクト
  const def = unitDef(h);
  assert.ok(def, 'a quick unit was chosen');
  assert.equal(def.games?.[0] ?? 'mash', 'mash');
  const startAt = vm.runInContext('Date.now()', h.sandbox);
  assert.equal(card(h).style.animationDuration, '6000ms', 'the card keeps its usual time');
  settle(h, 5900);
  assert.equal(shown.length, 0, 'nothing is said while the card (and its retry button) is up');
  assert.equal(card(h).classList.contains('hidden'), false, 'the card is still there');
  assert.ok(card(h).querySelector('#mgRetryBtn'), 'もういちど is still there');
  settle(h, 8000);
  assert.deepEqual(shown.map(x => x.text), def.beats.map(b => b.text));
  assert.ok(shown[0].at - startAt >= 6000 + h.api.conv2.config.quickStartDelayMs, 'after the card');
  assert.ok(def.beats.length <= 3);
  assert.equal(h.api.conv2.unit(), null, 'the unit is over');
});

test('もういちど and the next game: the talk stops at once and nothing is said during the game', () => {
  const {h, shown} = boot({seed:9});
  always(h);
  finishQuick(h, 'stop', {cleared:0, maxCombo:0});
  assert.ok(h.api.conv2.unit(), 'chosen');
  settle(h, 3000);                                   // カードを見ている途中で もういちど
  assert.equal(shown.length, 0);
  const retry = card(h).querySelector('#mgRetryBtn');
  assert.ok(retry, 'the retry button is on the card');
  h.dispatch(h.document, 'pointerdown');
  retry.dispatchEvent({type:'click', preventDefault() {}});
  assert.equal(h.get('minigameOverlay').classList.contains('hidden'), false, 'the next quick run started without waiting');
  assert.equal(h.api.conv2.unit(), null);
  settle(h, 8000);
  assert.equal(shown.length, 0, 'nothing is said during the next game');
  // 1 行目を言っている途中で、次のクイックを始めた場合(メニューから)
  h.api.retireMinigame();
  settle(h, 500);
  finishQuick(h, 'stop', {cleared:0, maxCombo:0});   // 休む回
  settle(h, 3000);
  finishQuick(h, 'stop', {cleared:0, maxCombo:0});
  assert.ok(h.api.conv2.unit(), 'chosen');
  settle(h, 6600);
  assert.equal(shown.length, 1, 'first line out');
  h.dispatch(h.document, 'pointerdown');
  assert.equal(h.api.startQuickRun('stop'), true);
  assert.equal(h.api.conv2.unit(), null);
  assert.equal(h.get('speechBubble').classList.contains('hidden'), true, 'the half-said line is gone');
  settle(h, 8000);
  assert.equal(shown.length, 1, 'no more lines during the next game');
  // 会話を選んだ直後に、ふつうのミニゲームを始めた場合も同じ
  h.api.retireMinigame();
  settle(h, 500);
  const before = shown.length;
  finishQuick(h, 'stop', {cleared:0, maxCombo:0});
  settle(h, 3000);   // 休む回(続けて話さない)
  finishQuick(h, 'stop', {cleared:0, maxCombo:0});
  assert.ok(h.api.conv2.unit(), 'chosen');
  const game = h.api.games.find(g => g.id === 'darts-board');
  h.api.state().lifetime.minigamePlayCounts[game.id] = 20;
  h.api.startMinigame(game);
  settle(h, 8000);
  assert.equal(shown.length, before, 'a normal game started: the quick talk never shows');
});

test('moving to another screen drops the talk; coming back does not resume it', () => {
  const cases = [
    ['menu', h => { h.api.openExclusiveMenu('travel'); }, h => { h.api.closeAllMenuOverlays(); h.api.render(); }],
    ['meguru', h => { h.api.startMeguru(); }, h => { h.api.stopMeguru(); }],
    ['life event', h => { h.api.conv2.setLifeEventOpen(true); h.api.render(); }, h => { h.api.conv2.setLifeEventOpen(false); h.api.render(); }],
    ['background', h => { h.document.visibilityState = 'hidden'; h.dispatch(h.document, 'visibilitychange'); }, h => { h.document.visibilityState = 'visible'; h.dispatch(h.document, 'visibilitychange'); }],
    ['naopoyo / CARD GAME (page left, bfcache back)', h => { h.dispatch(h.window, 'pagehide'); }, h => { h.dispatch(h.window, 'pageshow', {persisted:true}); }],
  ];
  for (const [name, leave, back] of cases) {
    for (const when of ['before the first line', 'mid-talk']) {
      const {h, shown} = boot({seed:10});
      always(h);
      finishQuick(h, 'count', {cleared:0, maxCombo:0});
      assert.ok(h.api.conv2.unit(), `${name}: chosen`);
      const def = unitDef(h);
      settle(h, when === 'mid-talk' ? 6600 : 2000);
      const said = shown.length;
      if (when === 'mid-talk') assert.equal(said, 1, `${name}: first line out`);
      leave(h);
      h.api.conv2.syncLayer();   // ブラウザでは render のあとの microtask で走る
      settle(h, 50);
      assert.equal(h.api.conv2.unit(), null, `${name} ${when}: the talk is over`);
      if (when === 'mid-talk') assert.equal(h.get('speechBubble').classList.contains('hidden'), true, `${name}: the half-said line is closed`);
      back(h);
      settle(h, 12000);
      const rest = def.beats.slice(said).map(b => b.text);
      assert.ok(!shown.slice(said).some(x => rest.includes(x.text) || def.beats.some(b => b.text === x.text)), `${name} ${when}: nothing from the old talk after coming back`);
    }
  }
});

test('reload and save: no talk survives, the save has no conversation data, quick records are the same', () => {
  const storage = memoryStorage();
  const {h, s} = boot({seed:11, storage});
  always(h);
  finishQuick(h, 'fish', {cleared:10, maxCombo:10, lives:2});
  assert.ok(h.api.conv2.unit());
  h.api.saveState?.();
  const saved = JSON.stringify(s);
  assert.ok(!/q-fish|conv2|quickLastRun|lastMiss/.test(saved), 'nothing of the talk is in the save');
  assert.deepEqual(Object.keys(s.lifetime.quick).sort(), ['bestCleared', 'bestCombo', 'clears', 'plays', 'runs', 'single', 'totalCleared']);
  const again = harness({resume:true, storage, deterministic:true, seed:12});
  assert.equal(again.api.conv2.unit(), null, 'after reload nothing is pending');
  assert.equal(again.api.conv2.lastQuickRun(), null);
  for (let t = 0; t < 12000; t += 250) again.advance(250);
  assert.equal(again.api.conv2.unit(), null);
});

test('rewards and records are identical whether or not the talk happens', () => {
  const runOnce = force => {
    const {h, s} = boot({seed:13});
    force(h);
    finishQuick(h, null, {cleared:20, total:20, maxCombo:20, lives:3, lastMiss:null});
    settle(h, 9000);
    return {money:s.lifetime.money, energy:s.energy, happiness:s.happiness, sodachi:s.sodachi, quick:JSON.parse(JSON.stringify(s.lifetime.quick)),
      record:JSON.parse(JSON.stringify(s.lifetime.minigameRecords['quick-run'])), talked:h.api.conv2.director().snapshot().unitKinds.some(([k]) => k === 'quick')};
  };
  const talk = runOnce(always), quiet = runOnce(never);
  assert.equal(talk.talked, true);
  assert.equal(quiet.talked, false);
  delete talk.talked; delete quiet.talked;
  assert.deepEqual(talk, quiet);
  assert.equal(talk.money, 100, 'a mixed 20/20 still pays 100 coins');
});

test('frequency: about one run in 3-5, never twice in a row, quiet for solo games outside the pilot', () => {
  const {h} = boot({seed:21});
  // 本物の乱数(決まった種)で 300 回。結果はいろいろ(パーフェクト・0こ・ふつう…)
  let x = 12345;
  const rnd = () => ((x = (1664525 * x + 1013904223) >>> 0) / 4294967296);
  const results = [];
  let talks = 0, inRow = 0, prevTalked = false;
  for (let i = 0; i < 300; i++) {
    const solo = Q.PILOT_GAMES[i % Q.PILOT_GAMES.length];
    const mixed = i % 3 === 0;
    const cleared = Math.floor(rnd() * 11);
    finishQuick(h, mixed ? null : solo, mixed ? {cleared:cleared * 2, total:20, maxCombo:Math.floor(rnd() * 9), lastMiss:Q.PILOT_GAMES[i % 8]} : {cleared, maxCombo:Math.floor(rnd() * 7)});
    const talked = !!h.api.conv2.unit();
    if (talked) { talks++; if (prevTalked) inRow++; }
    prevTalked = talked;
    results.push(talked);
    // 結果カード(6 秒)を見てから次へ。ゲーム中の時間は Home の時間に数えない
    settle(h, 8000);
  }
  const rate = talks / 300;
  console.log(`# quick talk rate ${talks}/300 = ${rate.toFixed(3)}`);
  assert.ok(rate >= 1 / 5 && rate <= 1 / 3, `rate ${rate.toFixed(3)}`);
  assert.equal(inRow, 0, 'never two runs in a row');
  // Pilot 以外の 1本ずつは 黙る
  const {h: h2} = boot({seed:22});
  always(h2);
  for (let i = 0; i < 5; i++) { finishQuick(h2, 'catch', {cleared:0}); assert.equal(h2.api.conv2.unit(), null); settle(h2, 2000); }
});

test('a visitor joins some exchanges as the visitor, and the quick talk keeps idle chatter and questions out', () => {
  const {h, shown} = boot({seed:23, companions:['snail']});
  always(h);
  finishQuick(h, 'count', {cleared:6, maxCombo:2});   // ふつう
  const def = unitDef(h);
  assert.ok(def, 'chosen');
  settle(h, 16000);
  assert.deepEqual(shown.map(x => x.text), def.beats.map(b => b.text), 'only the unit lines, in order (no idle line or question in between)');
  if (def.with) {
    const who = shown.map(x => x.who);
    def.beats.forEach((b, i) => assert.equal(b.role === 'them', who[i] !== who[def.beats.findIndex(z => z.role === 'pet')], `${def.id}[${i}] speaker`));
  }
});
