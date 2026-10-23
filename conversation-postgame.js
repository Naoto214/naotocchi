// Conversation v2 — ゲームのあとの掛け合い(Pilot)。
// ゲームの結果そのもの(点数・帯・できごと)は minigame-reactions.js がすでに決めたものを受け取るだけ。
// ここは「その結果をきっかけに、誰が何を言うか」の台詞データと、候補を絞る純関数。
// DOM・セーブ・タイマー・乱数は持たない。いつ出すかは script.js と Conversation Director が決める。
// 設計: docs/design/conversation-postgame-pilot-2026-10-22.md
(function(root) {
  'use strict';

  // Pilot で台詞を書いたゲーム(通常ゲームのみ。クイックは結果の反応自体がない仕様のため対象外)
  const PILOT_GAMES = Object.freeze(['real-fishing', 'fishing-sea', 'mini-golf-physics', 'darts-board', 'bowling-3d', 'stack-themed',
    'crane-game-3d', 'haunted-house-3d', 'jenga-tower', 'memory-cards', 'sudoku-mini', 'reversi-6']);
  const FISHING = ['real-fishing', 'fishing-sea'];

  const P = text => Object.freeze({role:'pet', text});
  const T = text => Object.freeze({role:'them', text});
  // when: {games, moments, bands?, with?, trait?, favorite?}
  //  - moments: minigame-reactions.js のできごと(firstClear / firstS / newBest / nearMiss / losingStreak / repeatPlay / milestone / plain)
  //  - with: null(本人だけ)/ 'partner' / 'companion' / 'any'(どちらかが来ているとき)
  //  - trait: 'persistence+' のように、生まれつきの気質が高い(4〜5)/ 低い(1〜2)ときだけ候補に入る
  //  - favorite: その遊びのジャンルが「すきな遊び」のときだけ
  const unit = (id, when, beats) => Object.freeze({kind:'banter', id, with:null, bands:null, trait:null, favorite:false, ...when, beats:Object.freeze(beats)});
  const choice = (label, ...reply) => Object.freeze({label, reply:Object.freeze(reply)});
  const question = (id, when, ask, choices) => Object.freeze({kind:'question', id, with:null, bands:null, trait:null, favorite:false, ...when, ask, choices:Object.freeze(choices), lead:Object.freeze([])});

  const UNITS = Object.freeze([
    // さかなつり
    unit('pg-fish-bigone', {games:FISHING, moments:['nearMiss', 'losingStreak', 'plain'], bands:['bad', 'mid']}, [P('大物を逃した'), P('……見てないけど、たぶん大物')]),
    unit('pg-fish-size', {games:FISHING, moments:['nearMiss', 'plain'], bands:['bad', 'mid'], with:'any'}, [P('さっきの、大きかった'), T('何センチ?'), P('逃げた分だけ')]),
    unit('pg-fish-volunteer', {games:FISHING, moments:['newBest', 'firstClear', 'firstS'], with:'partner'}, [T('つれたね'), P('むこうが先に、つられに来た')]),
    unit('pg-fish-again', {games:FISHING, moments:['losingStreak', 'repeatPlay'], trait:'persistence+'}, [P('あと一回。魚もそう言ってる')]),
    unit('pg-fish-dayoff', {games:FISHING, moments:['losingStreak'], trait:'persistence-'}, [P('魚、きょうは休みだって')]),
    question('pq-fish-name', {games:FISHING, moments:['firstClear', 'newBest', 'firstS']}, 'つった魚、なんて名前にする?', [
      choice('ポチ', P('……もう泳いでいったけど、ポチ')),
      choice('さかな', P('そのまんまだ。いい名前')),
      choice('名前はいらない', P('じゃあ、呼ぶときこまるね')),
    ]),
    // ミニゴルフ
    unit('pg-golf-dodge', {games:['mini-golf-physics'], moments:['nearMiss', 'plain'], bands:['mid', 'bad']}, [P('いまの、穴のほうがよけた')]),
    unit('pg-golf-hole', {games:['mini-golf-physics'], moments:['newBest', 'firstS'], with:'any'}, [T('上手になったね'), P('穴が大きくなった気がする'), T('なってないよ')]),
    unit('pg-golf-ask', {games:['mini-golf-physics'], moments:['losingStreak'], trait:'persistence+'}, [P('ボールが言うことを聞かない'), P('もう一回、聞いてみる')]),
    unit('pg-golf-regular', {games:['mini-golf-physics'], moments:['repeatPlay', 'milestone']}, [P('この穴とは、だいぶ顔見知り')]),
    // ダーツ
    unit('pg-darts-center', {games:['darts-board'], moments:['firstS', 'newBest'], bands:['great']}, [P('まん中のほうから来てくれた')]),
    unit('pg-darts-where', {games:['darts-board'], moments:['plain', 'losingStreak', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('どこをねらったの?'), P('だいたい、むこう')]),
    unit('pg-darts-way', {games:['darts-board'], moments:['repeatPlay', 'plain'], trait:'curiosity+'}, [P('矢って、帰り道わかるのかな')]),
    // ボウリング
    unit('pg-bowl-polite', {games:['bowling-3d'], moments:['firstS', 'newBest', 'plain'], bands:['great']}, [P('ピンが自分から倒れた。えらい')]),
    unit('pg-bowl-gutter', {games:['bowling-3d'], moments:['plain', 'losingStreak'], bands:['bad'], with:'partner'}, [T('またみぞに行ったね'), P('みぞのほうが呼んでるんだよ')]),
    unit('pg-bowl-all', {games:['bowling-3d'], moments:['plain', 'newBest'], bands:['great', 'mid'], trait:'boldness+'}, [P('次は、ぜんぶ同時に倒す')]),
    // つみあげタワー
    unit('pg-stack-sky', {games:['stack-themed'], moments:['newBest', 'firstS'], with:'companion'}, [P('空まで、あと少しだった'), T('どのくらい?'), P('ぜんぶ')]),
    unit('pg-stack-break', {games:['stack-themed'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('タワーが先に休けいした')]),
    // クレーンゲーム
    unit('pg-crane-feeling', {games:['crane-game-3d'], moments:['plain', 'nearMiss'], bands:['bad', 'mid']}, [P('つかんでた。気持ちだけ')]),
    unit('pg-crane-arm', {games:['crane-game-3d'], moments:['plain', 'losingStreak'], bands:['bad', 'mid'], with:'any'}, [T('とれた?'), P('アームと、まだ話がついてない')]),
    unit('pg-crane-friend', {games:['crane-game-3d'], moments:['repeatPlay', 'milestone']}, [P('あの景品とは、もう知り合い')]),
    // おばけやしき
    unit('pg-ghost-eyes', {games:['haunted-house-3d'], moments:['plain', 'newBest', 'firstClear'], bands:['great', 'mid'], trait:'boldness-'}, [P('こわくなかった'), P('目はつぶってた')]),
    unit('pg-ghost-late', {games:['haunted-house-3d'], moments:['plain', 'losingStreak'], trait:'boldness+'}, [P('おばけ、出てくるの遅くない?')]),
    unit('pg-ghost-scared', {games:['haunted-house-3d'], moments:['plain', 'newBest', 'firstClear', 'firstS'], bands:['great'], with:'partner'}, [T('こわかった?'), P('おばけのほうが、こわがってた')]),
    question('pq-ghost-count', {games:['haunted-house-3d'], moments:['firstClear', 'newBest', 'firstS', 'plain'], bands:['great']}, 'おばけ、何人いた?', [
      choice('3人', P('4人目は、ぼくの影だった')),
      choice('0人', P('じゃあ、さっきの「わっ」はだれ?')),
      choice('かぞえてない', P('ぼくも。目をつぶってたから')),
    ]),
    // ジェンガ
    unit('pg-jenga-sigh', {games:['jenga-tower'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('タワーが、ため息ついた')]),
    unit('pg-jenga-middle', {games:['jenga-tower'], moments:['plain', 'newBest', 'firstS'], bands:['great'], trait:'boldness+'}, [P('まん中から抜くのが、通です')]),
    unit('pg-jenga-close', {games:['jenga-tower'], moments:['nearMiss'], with:'any'}, [T('おしかったね'), P('タワーのほうが、おしかった')]),
    // しんけいすいじゃく
    unit('pg-cards-faces', {games:['memory-cards'], moments:['firstS', 'newBest', 'plain'], bands:['great']}, [P('カードの顔、ぜんぶ覚えた。名前はまだ')]),
    unit('pg-cards-moved', {games:['memory-cards'], moments:['plain', 'losingStreak'], bands:['bad', 'mid']}, [P('さっきのカード、どこかに引っ越した')]),
    unit('pg-cards-greet', {games:['memory-cards'], moments:['plain', 'repeatPlay'], trait:'curiosity-'}, [P('一枚ずつ、ちゃんとあいさつした')]),
    // ナンプレ
    unit('pg-sudoku-seats', {games:['sudoku-mini'], moments:['firstS', 'newBest', 'firstClear', 'plain'], bands:['great']}, [P('数字がみんな、自分の席にすわった')]),
    unit('pg-sudoku-nine', {games:['sudoku-mini'], moments:['plain', 'losingStreak', 'nearMiss'], bands:['bad', 'mid'], with:'partner'}, [T('どこで迷った?'), P('9のとなり'), T('どの9?'), P('ぜんぶの')]),
    unit('pg-sudoku-cell', {games:['sudoku-mini'], moments:['nearMiss'], trait:'persistence+'}, [P('あとひとマス。そのマスが手ごわい')]),
    // オセロ
    unit('pg-reversi-color', {games:['reversi-6'], moments:['firstS', 'newBest', 'plain', 'firstClear'], bands:['great']}, [P('白と黒、どっちが好きか決めた。勝ったほう')]),
    unit('pg-reversi-last', {games:['reversi-6'], moments:['plain', 'losingStreak'], bands:['bad'], with:'companion'}, [T('何色だったの?'), P('さいごは、相手の色')]),
    // どのゲームでも(Pilot のゲームに限る)
    unit('pg-fav-lose', {games:PILOT_GAMES, moments:['plain', 'losingStreak', 'nearMiss'], bands:['bad', 'mid'], favorite:true}, [P('好きだから、負けてもあんまり負けてない')]),
    unit('pg-fav-time', {games:PILOT_GAMES, moments:['plain', 'repeatPlay', 'milestone'], favorite:true}, [P('好きなことをしてると、時間がちぢむ')]),
    unit('pg-switch', {games:PILOT_GAMES, moments:['losingStreak'], trait:'persistence-'}, [P('きょうは、ここまでにしてあげる')]),
    question('pq-watched', {games:PILOT_GAMES, moments:['newBest', 'firstS']}, 'いまの、見てた?', [
      choice('見てた', P('じゃあ、証人ね')),
      choice('見てない', P('……もう一回やるから、見てて')),
    ]),
    question('pq-win-next', {games:PILOT_GAMES, moments:['losingStreak']}, 'もう一回やったら、勝てると思う?', [
      choice('勝てる', P('じゃあ、勝つ前に休けいする')),
      choice('勝てない', P('正直だ。……もう一回だけ')),
      choice('勝ち負けはいい', P('じゃあ、なんでみんな点を数えてるの?')),
    ]),
  ]);

  // 生まれつきの気質(individuality の temperament 1〜5)を、高い/低いの印に
  function traitMatches(trait, temperament) {
    if (!trait) return true;
    const m = /^([a-z]+)([+-])$/.exec(trait);
    if (!m || !temperament) return false;
    const v = Number(temperament[m[1]]);
    if (!Number.isFinite(v)) return false;
    return m[2] === '+' ? v >= 4 : v <= 2;
  }
  // ctx: {gameId, genre, band, moments, visitorKind: null|'partner'|'companion', visitorQuiet, temperament, favoriteGenre}
  function candidates(ctx) {
    const c = ctx || {};
    if (!PILOT_GAMES.includes(c.gameId)) return [];
    const moments = new Set(c.moments || []);
    return UNITS.filter(u => {
      if (!u.games.includes(c.gameId)) return false;
      if (!u.moments.some(m => moments.has(m))) return false;
      if (u.bands && !u.bands.includes(c.band)) return false;
      if (u.favorite && (!c.favoriteGenre || c.favoriteGenre !== c.genre)) return false;
      if (!traitMatches(u.trait, c.temperament)) return false;
      if (u.with) {
        if (!c.visitorKind || c.visitorQuiet) return false;   // 寡黙な相手は、ゲームの話に乗ってこない
        if (u.with !== 'any' && u.with !== c.visitorKind) return false;
      }
      return true;
    });
  }

  function validate() {
    const problems = [], ids = new Set();
    const MOMENTS = ['firstClear', 'firstS', 'newBest', 'nearMiss', 'losingStreak', 'repeatPlay', 'milestone', 'plain'];
    const text = (where, t) => {
      if (typeof t !== 'string' || !t.trim()) problems.push(`${where}: empty`);
      else if (/[ 　]/.test(t)) problems.push(`${where}: spaces`);
      else if ([...t].length > 22) problems.push(`${where}: too long`);
    };
    for (const u of UNITS) {
      if (ids.has(u.id)) problems.push(`${u.id}: duplicate`); ids.add(u.id);
      if (!u.games.length || u.games.some(g => !PILOT_GAMES.includes(g))) problems.push(`${u.id}: games`);
      if (!u.moments.length || u.moments.some(m => !MOMENTS.includes(m))) problems.push(`${u.id}: moments`);
      if (u.bands && u.bands.some(b => !['great', 'mid', 'bad'].includes(b))) problems.push(`${u.id}: bands`);
      if (u.with && !['partner', 'companion', 'any'].includes(u.with)) problems.push(`${u.id}: with`);
      if (u.trait && !/^(curiosity|boldness|sociability|persistence)[+-]$/.test(u.trait)) problems.push(`${u.id}: trait`);
      const beats = u.kind === 'question' ? u.choices.flatMap(c => c.reply) : u.beats;
      if (u.kind === 'banter' && (u.beats.length < 1 || u.beats.length > 4)) problems.push(`${u.id}: beats`);
      if (u.kind === 'question') {
        text(`${u.id}.ask`, u.ask);
        if (u.choices.length < 2 || u.choices.length > 4) problems.push(`${u.id}: choices`);
        for (const c of u.choices) { text(`${u.id}.label`, c.label); if ([...c.label].length > 8) problems.push(`${u.id}: label too long`); }
      }
      beats.forEach((b, i) => {
        text(`${u.id}[${i}]`, b.text);
        if (b.role !== 'pet' && b.role !== 'them') problems.push(`${u.id}[${i}]: role`);
        if (b.role === 'them' && !u.with) problems.push(`${u.id}[${i}]: a visitor line needs a visitor`);
      });
    }
    return problems;
  }

  const api = {PILOT_GAMES, UNITS, candidates, traitMatches, validate, VERSION:1};
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NaotocchiConversationPostgame = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
