// Conversation v2 — ゲームのあとの掛け合い(Pilot)。データの点検と、実ゲームでの流れ。
const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const PG = require('../conversation-postgame.js');
const R = require('../minigame-reactions.js');
const {harness} = require('./helpers/runtime-harness.cjs');

test('data: all 100 normal games have their own lines, well formed, short, moments known to minigame-reactions', () => {
  assert.deepEqual(PG.validate(), []);
  const real = harness({deterministic:true}).api.games.map(g => g.id).filter(id => !String(id).startsWith('quick')).sort();
  assert.equal(real.length, 100);
  assert.equal(JSON.stringify([...PG.GAMES].sort()), JSON.stringify(real), 'every normal game is covered');
  assert.ok(PG.PILOT_GAMES.every(g => PG.GAMES.includes(g)), 'the 12 pilot games are kept');
  const known = new Set(R.MOMENTS);
  for (const u of PG.UNITS) for (const m of u.moments) assert.ok(known.has(m), `${u.id}: ${m} is a moment minigame-reactions detects`);
  for (const g of PG.GAMES) {
    const own = PG.UNITS.filter(u => u.games.length <= 2 && u.games.includes(g));   // さかなつり 2 本は台詞を共有
    assert.ok(own.length >= 3, `${g} has its own lines (${own.length})`);
    const plainUnit = u => !u.trait && !u.with && !u.favorite;   // 気質・来訪者に関係なく出せるもの
    assert.ok(own.some(u => plainUnit(u) && u.moments.some(m => ['firstClear', 'firstS', 'newBest'].includes(m))), `${g}: a line for a good moment`);
    assert.ok(own.some(u => plainUnit(u) && u.moments.some(m => ['plain', 'losingStreak', 'nearMiss'].includes(m)) && (!u.bands || u.bands.includes('bad'))), `${g}: a line for a bad result`);
  }
  assert.ok(PG.UNITS.some(u => u.kind === 'banter' && u.with), 'some exchanges with a visitor');
  assert.ok(PG.UNITS.some(u => u.kind === 'question'), 'some questions');
  assert.ok(PG.UNITS.some(u => u.trait) && PG.UNITS.some(u => u.favorite), 'personality and favorite-game lines');
});

test('candidates follow the game, the moment, the result band, the visitor and the personality', () => {
  const base = {gameId:'real-fishing', genre:'sports', band:'bad', moments:['nearMiss'], visitorKind:null, temperament:{persistence:3, boldness:3, curiosity:3, sociability:3}};
  const ids = ctx => PG.candidates({...base, ...ctx}).map(u => u.id).sort();
  assert.deepEqual(ids({}), ['pg-fish-bigone'], 'alone after a near miss: the solo aside only');
  assert.ok(ids({visitorKind:'companion'}).includes('pg-fish-size'), 'with a companion the exchange joins');
  assert.ok(!ids({visitorKind:'companion', visitorQuiet:true}).includes('pg-fish-size'), 'a quiet visitor does not join');
  assert.ok(ids({moments:['firstClear'], band:'great', visitorKind:'partner'}).includes('pg-fish-volunteer'));
  assert.ok(!ids({moments:['firstClear'], band:'great', visitorKind:'companion'}).includes('pg-fish-volunteer'), 'partner-only line');
  assert.deepEqual(ids({gameId:'pong-unknown'}), [], 'games outside the pilot keep the old reaction');
  // 気質: 高い/低いときだけ。ふつう(3)なら出ない
  const streak = {moments:['losingStreak'], band:'bad'};
  assert.ok(ids({...streak, temperament:{persistence:5}}).includes('pg-fish-again'));
  assert.ok(!ids({...streak, temperament:{persistence:3}}).includes('pg-fish-again'));
  assert.ok(ids({...streak, temperament:{persistence:1}}).includes('pg-fish-dayoff'));
  assert.ok(ids({...streak, temperament:{persistence:1}}).includes('pg-switch'));
  // すきな遊び: ジャンルが一致するときだけ
  assert.ok(ids({favoriteGenre:'sports', moments:['plain'], band:'bad'}).includes('pg-fav-lose'));
  assert.ok(!ids({favoriteGenre:'puzzle', moments:['plain'], band:'bad'}).includes('pg-fav-lose'));
  assert.equal(PG.traitMatches('boldness-', {boldness:2}), true);
  assert.equal(PG.traitMatches('boldness-', null), false);
});

// ---- 実ゲーム ----
function boot({seed = 3, partner = null, companions = [], temperament = null, favorite = null} = {}) {
  const h = harness({deterministic:true, seed});
  const shown = [];
  let tc = '', kind = '';
  const speaker = h.get('speechSpeaker');
  Object.defineProperty(h.get('speechText'), 'textContent', {get:() => tc, set:v => {
    tc = String(v);
    if (tc) shown.push({text:tc, who:speaker.dataset.label, kind:null, at:vm.runInContext('Date.now()', h.sandbox)});
  }, configurable:true});
  Object.defineProperty(h.get('speechBubble').dataset, 'kind', {get:() => kind, set:v => { kind = String(v); if (shown.length) shown.at(-1).kind = kind; }, configurable:true});
  const s = h.api.state();
  Object.assign(s, {stage:'growing', isSleeping:false, isSick:false, energy:100, health:100, hunger:90, happiness:90, regionId:'home'});
  if (partner) {
    const base = h.api.REGIONS.flatMap(r => r.candidates || []).find(c => c.id === partner);
    s.partner = JSON.parse(JSON.stringify({...base, id:partner, affection:80, bondCount:3, married:false}));
  } else s.partner = null;
  s.companions = companions.map(id => ({id, bond:90}));
  if (!s.individuality) s.individuality = require('../individuality.js').create('dog', ['home'], () => 0.5);
  if (temperament) Object.assign(s.individuality.temperament, temperament);
  if (favorite) s.individuality.preferences.game.current = favorite;
  if (partner || companions.length) h.api.setPresentCastFixture();
  else vm.runInContext('void 0', h.sandbox);
  h.api.render();
  return {h, s, shown};
}
// 実在のゲームを id で始めて、点数を決めて終える(ゲームの中身は動かさない)
function play(h, gameId, score) {
  const game = h.api.games.find(g => g.id === gameId);
  assert.ok(game, gameId);
  const done = {};
  // カテゴリ・ジャンルは本物のゲームのものを使う(minigameCategoryOf は物で引くので、同じ物で遊ぶ)。
  // 何度も遊んだことにして、はじめての操作説明を出さない(記録は別なので「初クリア」は判定される)
  const s = h.api.state();
  s.lifetime.minigamePlayCounts[gameId] = Math.max(20, s.lifetime.minigamePlayCounts[gameId] || 0);
  Object.assign(s, {energy:100, isSleeping:false});
  const original = game.start;
  game.start = (_c, d) => { done.fn = d; };
  try {
    h.api.tryStartPlay(game);
    // 開始の猶予(カウントダウン・読み込み)のあいだ時計を進める
    for (let i = 0; i < 40 && !done.fn; i++) h.advance(250);
  } finally { game.start = original; }
  assert.ok(done.fn, `${gameId} started`);
  done.fn(score);
}
const settle = (h, ms) => { for (let t = 0; t < ms; t += 250) h.advance(250); };
const unitTexts = u => u.kind === 'question' ? [u.ask] : u.beats.map(b => b.text);

test('after a pilot game the exchange waits for the result card, then plays in order instead of the usual cheer', () => {
  const {h, s, shown} = boot({seed:4, companions:['snail']});
  vm.runInContext('Math.random = () => 0.01', h.sandbox);   // 必ず掛け合いを選ぶ(頻度は別のテスト)
  s.lifetime.minigameRecords = s.lifetime.minigameRecords || {};
  play(h, 'real-fishing', 62);       // 初めての記録(firstClear)、ふつうの帯
  const unit = h.api.conv2.unit();
  assert.equal(unit?.kind, 'postgame', 'a post-game unit was chosen');
  const def = h.api.conv2.postgame.UNITS.find(u => u.id === unit.id);
  const cardMs = parseInt(h.get('mgResultToast').style.animationDuration, 10);
  settle(h, cardMs - 250);   // カードが出ているあいだ(6 秒)
  assert.equal(shown.length, 0, 'nothing is said while the result card is up');
  assert.equal(h.get('mgResultToast').classList.contains('hidden'), false, 'the card stays');
  settle(h, 15000);
  assert.deepEqual(shown.slice(0, unitTexts(def).length).map(x => x.text), unitTexts(def));
  const generic = Object.values(h.api.conv2.pools().minigame_great || {}).flat();
  assert.ok(shown.every(x => !generic.includes(x.text)), 'no usual cheer mixed in');
});

test('tapping もういちど on the result card starts the next game; the exchange never plays over it', () => {
  const {h, s, shown} = boot({seed:5});
  vm.runInContext('Math.random = () => 0.01', h.sandbox);
  play(h, 'darts-board', 95);   // はじめての S(firstS)
  assert.equal(h.api.conv2.unit()?.kind, 'postgame');
  settle(h, 1000);
  h.dispatch(h.document, 'pointerdown');
  const retry = h.get('mgResultToast').querySelector('#mgRetryBtn');
  assert.ok(retry, 'the retry button is on the card');
  retry.dispatchEvent({type:'click', preventDefault() {}});
  assert.equal(h.api.conv2.unit(), null, 'the exchange stopped');
  settle(h, 15000);
  assert.equal(shown.length, 0, 'nothing said during the next game');
});

test('when the exchange is not picked, the old reaction stays exactly as before; mid results without a moment stay quiet', () => {
  const {h, s, shown} = boot({seed:6});
  vm.runInContext('Math.random = () => 0.99', h.sandbox);   // 掛け合いを選ばない回
  const other = h.api.games.find(g => !h.api.conv2.postgame.PILOT_GAMES.includes(g.id) && !String(g.id).startsWith('quick'));
  s.lifetime.minigamePlayCounts[other.id] = 5;
  play(h, other.id, 95);
  assert.equal(h.api.conv2.unit(), null, 'no post-game unit this time');
  settle(h, 9000);
  assert.ok(shown.length >= 1, 'the usual cheer is said');
  shown.length = 0;
  settle(h, 30000);
  vm.runInContext('Math.random = () => 0.01', h.sandbox);
  // ふつうの帯・できごとなし(何度も遊んだ記録に近くもない)→ 今までどおり黙る
  s.lifetime.minigamePlayCounts['bowling-3d'] = 5;
  s.lifetime.minigameRecords['bowling-3d'] = {best:100, plays:5};
  play(h, 'bowling-3d', 50);
  assert.equal(h.api.conv2.unit(), null, 'a plain middle result: no exchange');
});

test('frequency: at most one post-game exchange every 3 minutes of play; idle questions wait after one', () => {
  const {h, s} = boot({seed:7});
  vm.runInContext('Math.random = () => 0.01', h.sandbox);
  play(h, 'sudoku-mini', 95);
  assert.equal(h.api.conv2.unit()?.kind, 'postgame');
  settle(h, 20000);
  play(h, 'sudoku-mini', 96);
  assert.equal(h.api.conv2.unit(), null, 'a second game right after: the usual reaction only');
  const d = h.api.conv2.director();
  assert.equal(d.unitReady('postgame', 2 * 60e3), false);
  // ゲームのあとの掛け合いの直後は、ふつうの問いかけも出ない(Director の単位の間隔)
  h.dispatch(h.document, 'pointerdown');
  assert.equal(d.unitReady('postgame', h.api.conv2.config.postgameQuestionGapMs), false);
});

test('personality: a persistent pet and a quick-to-switch pet react differently to a losing streak', () => {
  const third = temperament => {
    const {h} = boot({seed:8, temperament});
    // 1・2 回目は確率で外れて、いつもの反応。3 回目(連敗)で必ず掛け合いを選ぶ
    vm.runInContext('Math.random = () => 0.99', h.sandbox);
    for (let i = 0; i < 2; i++) { play(h, 'real-fishing', 10); settle(h, 20000); }
    assert.equal(h.api.conv2.unit(), null);
    vm.runInContext('Math.random = () => 0.01', h.sandbox);
    play(h, 'real-fishing', 10);
    return h.api.conv2.unit()?.id;
  };
  assert.equal(third({persistence:5}), 'pg-fish-again', 'ねばりづよい: あと一回');
  assert.ok(['pg-fish-dayoff', 'pg-switch'].includes(third({persistence:1})), 'きりかえ上手: 今日はおしまい');
  assert.ok(!['pg-fish-again', 'pg-fish-dayoff', 'pg-switch'].includes(third({persistence:3})), 'ふつう: 性格の一言は出ない');
});

test('a post-game question gets answered like any question; the save file stays untouched', () => {
  const {h, s, shown} = boot({seed:9});
  vm.runInContext('Math.random = () => 0.01', h.sandbox);
  // 問いかけだけが候補になる状況: 初クリア・本人だけ・おばけやしき
  for (const u of h.api.conv2.postgame.UNITS) if (u.id !== 'pq-ghost-count') h.api.conv2.director().noteUnit(u.id, null);
  play(h, 'haunted-house-3d', 92);
  assert.equal(h.api.conv2.unit()?.id, 'pq-ghost-count');
  settle(h, 6800);
  const q = h.api.conv2.postgame.UNITS.find(u => u.id === 'pq-ghost-count');
  assert.equal(shown.at(-1).text, q.ask);
  assert.ok(h.api.conv2.answer(1));
  settle(h, 5000);
  const i = shown.findIndex(x => x.text === q.choices[1].reply[0].text);
  assert.ok(i > shown.findIndex(x => x.text === q.ask), 'the reply for that answer follows the question');
  h.api.saveState();
  const save = h.sandbox.localStorage.getItem('naotocchi-save-v1') || '';
  assert.doesNotMatch(save, /pq-ghost|pg-fish|postgame/i, 'no conversation data in the game save');
});

test('with the partner visiting, the partner really speaks its lines of the post-game exchange', () => {
  const {h, shown} = boot({seed:10, partner:'robot_neighbor'});
  vm.runInContext('Math.random = () => 0.01', h.sandbox);
  play(h, 'sudoku-mini', 20);
  assert.equal(h.api.conv2.unit()?.id, 'pg-sudoku-nine');
  settle(h, 20000);
  const def = h.api.conv2.postgame.UNITS.find(u => u.id === 'pg-sudoku-nine');
  const beats = shown.slice(0, def.beats.length);
  assert.deepEqual(beats.map(b => b.text), def.beats.map(b => b.text));
  assert.deepEqual(beats.map(b => b.kind), def.beats.map(b => b.role === 'pet' ? 'pet' : 'partner'));
});

test('every one of the 100 normal games plays its own exchange in the real game, for a good and a bad result', () => {
  const {h, shown} = boot({seed:31});
  vm.runInContext('Math.random = () => 0.01', h.sandbox);
  const s = h.api.state();
  s.lifetime.minigameRecords = s.lifetime.minigameRecords || {};
  for (const id of h.api.conv2.postgame.GAMES) {
    // 何度か遊んだあとのわるい結果と、(記録を消して)はじめてのよい結果。直前に同じゲームを続けると「くりかえし」になるので、わるい結果を先に
    for (const [record, score] of [[{best:60, last:60}, 15], [null, 95]]) {
      // 3 分の間隔と 45 分のくり返し防止は別のテストで見る。ここでは履歴だけ空にして、時間は進めない(年をとらない)
      const d = h.api.conv2.director();
      d.restore({...d.snapshot(), units:[], unitKinds:[]});
      if (record) s.lifetime.minigameRecords[id] = {...record}; else delete s.lifetime.minigameRecords[id];
      // ゲームのたびに「へんしん」メーター・わるい結果の命のメーターが動き、選ぶ画面やお別れが来ると会話はやめる(正しい動き)。ここでは出さない
      Object.assign(s, {transformMeter:0, transformOptions:null, deathMeter:0, decline:0, energy:100, happiness:90});
      shown.length = 0;
      play(h, id, score);
      // ストーリーのできごと(よい/わるい結果で 45%)が出たときは、そちらが優先で会話はやめる(既存どおり)。もう一度遊ぶ
      for (let retry = 0; retry < 3 && !h.api.conv2.unit(); retry++) {
        settle(h, 20000);
        d.restore({...d.snapshot(), units:[], unitKinds:[]});
        if (record) s.lifetime.minigameRecords[id] = {...record}; else delete s.lifetime.minigameRecords[id];
        Object.assign(s, {transformMeter:0, transformOptions:null, deathMeter:0, decline:0, energy:100, happiness:90});
        shown.length = 0;
        play(h, id, score);
      }
      const unit = h.api.conv2.unit();
      assert.equal(unit?.kind, 'postgame', `${id} (${score}): an exchange was chosen`);
      const def = h.api.conv2.postgame.UNITS.find(u => u.id === unit.id);
      assert.ok(def.games.includes(id), `${id}: ${def.id} belongs to this game`);
      settle(h, 20000);
      assert.ok(unitTexts(def).every(t => shown.some(x => x.text === t)), `${id}: the lines were shown (${def.id}: ${unitTexts(def).join('/')} | shown: ${shown.map(x => x.text).join('/')})`);
    }
  }
});
