// Conversation v2 — ゲームのあとの掛け合い(通常ミニゲーム 100 本)。
// ゲームの結果そのもの(点数・帯・できごと)は minigame-reactions.js がすでに決めたものを受け取るだけ。
// ここは「その結果をきっかけに、誰が何を言うか」の台詞データと、候補を絞る純関数。
// DOM・セーブ・タイマー・乱数は持たない。いつ出すかは script.js と Conversation Director が決める。
// 設計: docs/design/conversation-postgame-pilot-2026-10-22.md(Pilot 12 本)・docs/design/conversation-full-rollout-2026-10-23.md(全 100 本)
(function(root) {
  'use strict';

  // 台詞を書いた通常ミニゲーム(全 100 本。クイックは conversation-quick.js)。ゲームを足したら、ここと台詞を足す
  const GAMES = Object.freeze([
    'road-themed', 'stack-themed', 'stack-snowman', 'falling-block-puzzle', 'crane-game-3d', 'pinball-physics',
    'haunted-house-3d', 'bowling-3d', 'archery-3d', 'breakout-classic', 'dragDecorate-cake', 'dragDecorate-bento',
    'p3-space', 'p3-drive', 'fp-dungeon', 'race-3d', 'rhythm-highway-3d', 'tilt-maze-3d', 'space-gunner-3d',
    'mini-golf-physics', 'real-fishing', 'basketball-3d', 'pingpong-3d', 'chain-puzzle', 'street-fight',
    'free-kick-3d', 'tower-defense', 'roguelike-dungeon', 'grand-prix-3d', 'sky-shooter', 'jump-quest', 'push-puzzle',
    'reversi-6', 'billiards-6', 'animal-shogi', 'minesweeper-8', 'snake-classic', 'baseball-batting',
    'ring-flight-3d', 'bubble-shooter', 'catapult-castle', 'connect-four', 'puzzle-2048', 'frogger-road', 'ski-jump',
    'air-hockey', 'submarine-3d', 'match-3', 'gomoku-9', 'tank-battle', 'tennis-rally', 'picross-5', 'darts-board',
    'hang-glider-3d', 'bomber-maze', 'blackjack-21', 'pipe-connect', 'fruit-slice', 'track-field', 'voxel-mine',
    'sushi-belt', 'asteroids-classic', 'yacht-dice', 'lights-out', 'doodle-jump', 'curling-ice', 'jenga-tower',
    'line-trace', 'checkers-6', 'memory-cards', 'halfpipe-skate', 'domino-run', 'sudoku-mini', 'mancala-kalah',
    'plane-landing', 'dot-eater', 'missile-command', 'area-claim', 'solitaire-klondike', 'hit-blow', 'lunar-lander',
    'shanghai-tiles', 'beach-volley', 'slide-puzzle', 'sugoroku-race', 'takoyaki-grill', 'road-city', 'stack-harvest',
    'stack-acorn', 'downhill-mountain', 'downhill-snow', 'fishing-sea', 'fishing-deepsea', 'fishing-river',
    'road-jungle', 'road-desert', 'stack-sakura', 'ring-flight-summer', 'stack-leaves', 'curling-winter'
  ]);
  // 最初に Pilot で書いた 12 本(記録用。動きは全 100 本と同じ)
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
    unit('pg-golf-welcome', {games:['mini-golf-physics'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('一打で入った'), P('穴も、待ってたって')]),
    unit('pg-golf-dodge', {games:['mini-golf-physics'], moments:['nearMiss', 'plain'], bands:['mid', 'bad']}, [P('いまの、穴のほうがよけた')]),
    unit('pg-golf-hole', {games:['mini-golf-physics'], moments:['newBest', 'firstS'], with:'any'}, [T('上手になったね'), P('穴が大きくなった気がする'), T('なってないよ')]),
    unit('pg-golf-ask', {games:['mini-golf-physics'], moments:['losingStreak'], trait:'persistence+'}, [P('ボールが言うことを聞かない'), P('もう一回、聞いてみる')]),
    unit('pg-golf-regular', {games:['mini-golf-physics'], moments:['repeatPlay', 'milestone']}, [P('この穴とは、だいぶ顔見知り')]),
    // ダーツ
    unit('pg-darts-wall', {games:['darts-board'], moments:['plain', 'losingStreak', 'nearMiss'], bands:['bad']}, [P('かべに、いい点数をあげた')]),
    unit('pg-darts-center', {games:['darts-board'], moments:['firstS', 'newBest'], bands:['great']}, [P('まん中のほうから来てくれた')]),
    unit('pg-darts-where', {games:['darts-board'], moments:['plain', 'losingStreak', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('どこをねらったの?'), P('だいたい、むこう')]),
    unit('pg-darts-way', {games:['darts-board'], moments:['repeatPlay', 'plain'], trait:'curiosity+'}, [P('矢って、帰り道わかるのかな')]),
    // ボウリング
    unit('pg-bowl-spare', {games:['bowling-3d'], moments:['plain', 'losingStreak', 'nearMiss'], bands:['bad']}, [P('ピン、一本だけのこった'), P('あの一本とは、気が合わない')]),
    unit('pg-bowl-polite', {games:['bowling-3d'], moments:['firstS', 'newBest', 'plain'], bands:['great']}, [P('ピンが自分から倒れた。えらい')]),
    unit('pg-bowl-gutter', {games:['bowling-3d'], moments:['plain', 'losingStreak'], bands:['bad'], with:'partner'}, [T('またみぞに行ったね'), P('みぞのほうが呼んでるんだよ')]),
    unit('pg-bowl-all', {games:['bowling-3d'], moments:['plain', 'newBest'], bands:['great', 'mid'], trait:'boldness+'}, [P('次は、ぜんぶ同時に倒す')]),
    // つみあげタワー
    unit('pg-stack-sky', {games:['stack-themed'], moments:['newBest', 'firstS'], with:'companion'}, [P('空まで、あと少しだった'), T('どのくらい?'), P('ぜんぶ')]),
    unit('pg-stack-break', {games:['stack-themed'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('タワーが先に休けいした')]),
    unit('pg-stack-cloud', {games:['stack-themed'], moments:['firstClear', 'newBest'], bands:['great']}, [P('いちばん上のブロック、くもに会ってきた')]),
    // クレーンゲーム
    unit('pg-crane-feeling', {games:['crane-game-3d'], moments:['plain', 'nearMiss'], bands:['bad', 'mid']}, [P('つかんでた。気持ちだけ')]),
    unit('pg-crane-arm', {games:['crane-game-3d'], moments:['plain', 'losingStreak'], bands:['bad', 'mid'], with:'any'}, [T('とれた?'), P('アームと、まだ話がついてない')]),
    unit('pg-crane-deal', {games:['crane-game-3d'], moments:['firstClear', 'newBest', 'firstS'], bands:['great']}, [P('とれた。ついに'), P('アームと、やっと話がついた')]),
    unit('pg-crane-friend', {games:['crane-game-3d'], moments:['repeatPlay', 'milestone']}, [P('あの景品とは、もう知り合い')]),
    // おばけやしき
    unit('pg-ghost-eyes', {games:['haunted-house-3d'], moments:['plain', 'newBest', 'firstClear'], bands:['great', 'mid'], trait:'boldness-'}, [P('こわくなかった'), P('目はつぶってた')]),
    unit('pg-ghost-late', {games:['haunted-house-3d'], moments:['plain', 'losingStreak'], trait:'boldness+'}, [P('おばけ、出てくるの遅くない?')]),
    unit('pg-ghost-run', {games:['haunted-house-3d'], moments:['plain', 'losingStreak', 'nearMiss'], bands:['bad', 'mid']}, [P('にげてるうちに'), P('おばけと、同じ方向に走ってた')]),
    unit('pg-ghost-scared', {games:['haunted-house-3d'], moments:['plain', 'newBest', 'firstClear', 'firstS'], bands:['great'], with:'partner'}, [T('こわかった?'), P('おばけのほうが、こわがってた')]),
    question('pq-ghost-count', {games:['haunted-house-3d'], moments:['firstClear', 'newBest', 'firstS', 'plain'], bands:['great']}, 'おばけ、何人いた?', [
      choice('3人', P('4人目は、ぼくの影だった')),
      choice('0人', P('じゃあ、さっきの「わっ」はだれ?')),
      choice('かぞえてない', P('ぼくも。目をつぶってたから')),
    ]),
    // ジェンガ
    unit('pg-jenga-sigh', {games:['jenga-tower'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('タワーが、ため息ついた')]),
    unit('pg-jenga-middle', {games:['jenga-tower'], moments:['plain', 'newBest', 'firstS'], bands:['great'], trait:'boldness+'}, [P('まん中から抜くのが、通です')]),
    unit('pg-jenga-tall', {games:['jenga-tower'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('タワー、ぼくより高くなった'), P('ちょっと、見下ろされてる')]),
    unit('pg-jenga-close', {games:['jenga-tower'], moments:['nearMiss'], with:'any'}, [T('おしかったね'), P('タワーのほうが、おしかった')]),
    // しんけいすいじゃく
    unit('pg-cards-faces', {games:['memory-cards'], moments:['firstS', 'newBest', 'plain'], bands:['great']}, [P('カードの顔、ぜんぶ覚えた。名前はまだ')]),
    unit('pg-cards-moved', {games:['memory-cards'], moments:['plain', 'losingStreak'], bands:['bad', 'mid']}, [P('さっきのカード、どこかに引っ越した')]),
    unit('pg-cards-greet', {games:['memory-cards'], moments:['plain', 'repeatPlay'], trait:'curiosity-'}, [P('一枚ずつ、ちゃんとあいさつした')]),
    // ナンプレ
    unit('pg-sudoku-eight', {games:['sudoku-mini'], moments:['plain', 'losingStreak', 'nearMiss'], bands:['bad']}, [P('8がふたり、同じ列でなかよくしてた')]),
    unit('pg-sudoku-seats', {games:['sudoku-mini'], moments:['firstS', 'newBest', 'firstClear', 'plain'], bands:['great']}, [P('数字がみんな、自分の席にすわった')]),
    unit('pg-sudoku-nine', {games:['sudoku-mini'], moments:['plain', 'losingStreak', 'nearMiss'], bands:['bad', 'mid'], with:'partner'}, [T('どこで迷った?'), P('9のとなり'), T('どの9?'), P('ぜんぶの')]),
    unit('pg-sudoku-cell', {games:['sudoku-mini'], moments:['nearMiss'], trait:'persistence+'}, [P('あとひとマス。そのマスが手ごわい')]),
    // オセロ
    unit('pg-reversi-flip', {games:['reversi-6'], moments:['plain', 'losingStreak', 'nearMiss'], bands:['bad']}, [P('ぜんぶ、ひっくりかえされた'), P('裏の色も、わりと似合う')]),
    unit('pg-reversi-color', {games:['reversi-6'], moments:['firstS', 'newBest', 'plain', 'firstClear'], bands:['great']}, [P('白と黒、どっちが好きか決めた。勝ったほう')]),
    unit('pg-reversi-corner', {games:['reversi-6'], moments:['plain', 'nearMiss', 'repeatPlay'], with:'any'}, [T('どの角がすき?'), P('取られたほうの角')]),
    unit('pg-reversi-last', {games:['reversi-6'], moments:['plain', 'losingStreak'], bands:['bad'], with:'companion'}, [T('何色だったの?'), P('さいごは、相手の色')]),
    // ---- 全員展開: のこりの 88 本 ----
    // ロードラン
    unit('pg-road-thanks', {games:['road-themed'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('よいもの、ぜんぶもらった'), P('道にお礼を言っておく')]),
    unit('pg-road-eyes', {games:['road-themed'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('わるいものと、目が合っちゃった'), P('あいさつされたら、よけられない')]),
    unit('pg-road-caught', {games:['road-themed'], moments:['plain', 'nearMiss'], bands:['mid', 'bad'], with:'any'}, [T('なにを取ったの?'), P('わるいもの。多めに'), T('取るほうじゃないよ')]),
    unit('pg-road-who', {games:['road-themed'], moments:['repeatPlay', 'plain'], trait:'curiosity+'}, [P('わるいものって、だれが置いてるんだろう')]),
    // ゆきだるまタワー
    unit('pg-snowman-neck', {games:['stack-snowman'], moments:['newBest', 'firstS'], bands:['great']}, [P('ゆきだるま、首が長くなった'), P('どこが頭か、本人にもわからない')]),
    unit('pg-snowman-spare', {games:['stack-snowman'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('切り落とした分で、もう一体できそう')]),
    unit('pg-snowman-count', {games:['stack-snowman'], moments:['newBest', 'plain', 'firstClear'], bands:['great', 'mid'], with:'any'}, [T('何段できた?'), P('数えてたら、とけそうだった')]),
    unit('pg-snowman-hands', {games:['stack-snowman'], moments:['repeatPlay', 'milestone']}, [P('雪がもう、ぼくの手の形を覚えた')]),
    // ブロックパズル
    unit('pg-blocks-wait', {games:['falling-block-puzzle'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('長い棒、待ってたら来た'), P('待つのも、腕のうち')]),
    unit('pg-blocks-vent', {games:['falling-block-puzzle'], moments:['plain', 'losingStreak', 'nearMiss'], bands:['bad', 'mid']}, [P('すきまが一個だけ、ずっと空いてた'), P('あれは、たぶん通気口')]),
    unit('pg-blocks-turn', {games:['falling-block-puzzle'], moments:['plain', 'losingStreak'], bands:['bad', 'mid'], with:'any'}, [T('回さないの?'), P('回すと、気が変わる気がして')]),
    unit('pg-blocks-drop', {games:['falling-block-puzzle'], moments:['plain', 'newBest'], trait:'boldness+'}, [P('一気に落とした。考えるのはあとで')]),
    // ピンボール
    unit('pg-pinball-away', {games:['pinball-physics'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('ボールが、なかなか帰ってこなかった'), P('むこうで、楽しくやってたみたい')]),
    unit('pg-pinball-gap', {games:['pinball-physics'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('まん中のすきま、だれが開けたの')]),
    unit('pg-pinball-flipper', {games:['pinball-physics'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('フリッパー、上がってた?'), P('上がってた。ずっと')]),
    unit('pg-pinball-lights', {games:['pinball-physics'], moments:['repeatPlay', 'plain'], trait:'curiosity+'}, [P('光ってるところ、ぜんぶさわりたい')]),
    // アーチェリー
    unit('pg-archery-crowded', {games:['archery-3d'], moments:['newBest', 'firstS'], bands:['great']}, [P('同じ穴に入った。矢が混んでる')]),
    unit('pg-archery-wind', {games:['archery-3d'], moments:['plain', 'losingStreak', 'nearMiss'], bands:['bad', 'mid']}, [P('風のぶん、多めに入れすぎた'), P('風はきょう、来てなかった')]),
    unit('pg-archery-pull', {games:['archery-3d'], moments:['plain', 'firstClear', 'newBest'], with:'any'}, [T('いっぱい引いた?'), P('引いた。ぼくが後ろに下がった')]),
    question('pq-archery-color', {games:['archery-3d'], moments:['firstClear', 'newBest', 'firstS']}, '風って、何色だと思う?', [
      choice('水色', P('じゃあ、つぎは見えるはず')),
      choice('色はない', P('だから、ねらいにくいんだ')),
      choice('みどり', P('葉っぱをつれてるときだけね')),
    ]),
    // ブロックくずし
    unit('pg-breakout-empty', {games:['breakout-classic'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('ぜんぶくずした。少しさみしい')]),
    unit('pg-breakout-read', {games:['breakout-classic'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('パドルを動かしたら、ボールが反対に行った'), P('ボールは、ぼくの考えを読んでる')]),
    unit('pg-breakout-multi', {games:['breakout-classic'], moments:['plain', 'newBest'], bands:['great', 'mid'], with:'any'}, [T('ボール、何個あった?'), P('見るたびに、増えてた')]),
    unit('pg-breakout-last', {games:['breakout-classic'], moments:['losingStreak', 'nearMiss'], trait:'persistence+'}, [P('残りの一個、どこかにかくれてる')]),
    // ケーキデコレーション
    unit('pg-cake-relief', {games:['dragDecorate-cake'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('点線のとおりに置いた。ケーキが安心してた')]),
    unit('pg-cake-crowd', {games:['dragDecorate-cake'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('トッピングが、ぜんぶ同じ場所に集まった'), P('なかよしなんだと思う')]),
    unit('pg-cake-eat', {games:['dragDecorate-cake'], moments:['plain', 'newBest'], with:'any'}, [T('食べないの?'), P('かざると、食べるのがもったいない'), P('……ちょっとだけ')]),
    question('pq-cake-first', {games:['dragDecorate-cake'], moments:['firstClear', 'newBest', 'firstS']}, 'ケーキ、どこから食べる?', [
      choice('いちご', P('いちばんえらいから、最初に会う')),
      choice('はしっこ', P('まん中には、さいごまで見守ってもらう')),
      choice('食べない', P('じゃあ、ずっとケーキでいてもらう')),
    ]),
    // おべんとうづくり
    unit('pg-bento-which', {games:['dragDecorate-bento'], moments:['newBest', 'firstS'], bands:['great']}, [P('見本と同じ。どっちが見本か、わからない')]),
    unit('pg-bento-border', {games:['dragDecorate-bento'], moments:['plain', 'losingStreak', 'nearMiss'], bands:['bad', 'mid']}, [P('たまごやきが、ごはんの国に行った')]),
    unit('pg-bento-tummy', {games:['dragDecorate-bento'], moments:['plain', 'firstClear', 'newBest'], with:'any'}, [T('見本、覚えてた?'), P('見本は、おなかが覚えてた')]),
    unit('pg-bento-owner', {games:['dragDecorate-bento'], moments:['repeatPlay', 'milestone']}, [P('このおべんとう、いつ食べる人がくるの')]),
    // うちゅうフライト3D
    unit('pg-space-pocket', {games:['p3-space'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('星、ポケットにぜんぶ入った'), P('ポケットの中、ちょっと明るい')]),
    unit('pg-space-rocks', {games:['p3-space'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('いんせきって、よける気ないよね')]),
    unit('pg-space-lanes', {games:['p3-space'], moments:['plain', 'firstClear', 'nearMiss'], with:'any'}, [T('宇宙、どうだった?'), P('思ったより、横に三つしかない')]),
    unit('pg-space-wish', {games:['p3-space'], moments:['repeatPlay', 'plain'], trait:'curiosity+'}, [P('いんせきにも、行きたい場所があるのかな')]),
    // ハイウェイ3D
    unit('pg-drive-coins', {games:['p3-drive'], moments:['newBest', 'firstS'], bands:['great']}, [P('コインが、道に落ちすぎてる'), P('だれか、こまってないかな')]),
    unit('pg-drive-lane', {games:['p3-drive'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('車が、ぼくのレーンを気に入ってた')]),
    unit('pg-drive-far', {games:['p3-drive'], moments:['plain', 'firstClear', 'newBest'], with:'any'}, [T('どこまで行ったの?'), P('ずっと同じ景色のところまで')]),
    unit('pg-drive-middle', {games:['p3-drive'], moments:['plain', 'repeatPlay'], trait:'boldness-'}, [P('まん中のレーンが、いちばん落ち着く')]),
    // ダンジョン3D
    unit('pg-fpdungeon-lid', {games:['fp-dungeon'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('宝箱、ぜんぶあけた'), P('中身より、ふたが好き')]),
    unit('pg-fpdungeon-wall', {games:['fp-dungeon'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('同じかべに、三回あいさつした')]),
    unit('pg-fpdungeon-lost', {games:['fp-dungeon'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('迷ったの?'), P('迷ってない。ダンジョンが広がった')]),
    unit('pg-fpdungeon-corner', {games:['fp-dungeon'], moments:['plain', 'repeatPlay'], trait:'boldness-'}, [P('角を曲がるとき、ちょっと待つ'), P('むこうも、待ってるかもしれないから')]),
    // カーレース3D
    unit('pg-race-dumped', {games:['race-3d'], moments:['newBest', 'firstS'], bands:['great']}, [P('カーブに、ふられなかった'), P('カーブとは、もう顔なじみ')]),
    unit('pg-race-view', {games:['race-3d'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('カーブの外って、景色がいいんだよ')]),
    unit('pg-race-neon', {games:['race-3d'], moments:['plain', 'firstClear', 'nearMiss'], with:'any'}, [T('どのコースが好き?'), P('ネオン。まぶしくて、負けても見えない')]),
    unit('pg-race-accel', {games:['race-3d'], moments:['plain', 'newBest'], trait:'boldness+'}, [P('アクセルしか、おした覚えがない')]),
    // リズムハイウェイ
    unit('pg-rhythm-fingers', {games:['rhythm-highway-3d'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('指が、先に歌を覚えた')]),
    unit('pg-rhythm-gone', {games:['rhythm-highway-3d'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('ボタンをおすと、ノーツがもういない')]),
    unit('pg-rhythm-song', {games:['rhythm-highway-3d'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('リズム、とれてた?'), P('とれてた。曲のほうが、ずれてた')]),
    unit('pg-rhythm-clap', {games:['rhythm-highway-3d'], moments:['plain', 'nearMiss'], trait:'sociability+'}, [P('だれか、手びょうししてくれたらいけた')]),
    // たまころがし迷路
    unit('pg-tilt-lean', {games:['tilt-maze-3d'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('ころがるほうに、ぼくもかたむいた')]),
    unit('pg-tilt-world', {games:['tilt-maze-3d'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('世界ごと、かたむけすぎた')]),
    unit('pg-tilt-neck', {games:['tilt-maze-3d'], moments:['plain', 'newBest'], with:'any'}, [T('首、かたむいてるよ'), P('盤にあわせてたら、もどらない')]),
    unit('pg-tilt-flat', {games:['tilt-maze-3d'], moments:['losingStreak', 'nearMiss'], trait:'persistence+'}, [P('次は、盤をかたむけずにいく')]),
    // スペースガンナー
    unit('pg-gunner-aim', {games:['space-gunner-3d'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('ねらいが、先に着いてた')]),
    unit('pg-gunner-red', {games:['space-gunner-3d'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('赤くなったの、気づいてた。見てただけ')]),
    unit('pg-gunner-sound', {games:['space-gunner-3d'], moments:['plain', 'newBest'], with:'any'}, [T('何機、打ちおとした?'), P('数より、音を覚えてる')]),
    unit('pg-gunner-soft', {games:['space-gunner-3d'], moments:['plain', 'nearMiss'], trait:'boldness-'}, [P('「うつ!」を、ずっとそっとおしてた')]),
    // バスケ3D
    unit('pg-basket-peek', {games:['basketball-3d'], moments:['newBest', 'firstS'], bands:['great']}, [P('ボール、リングの中をのぞいてから入った')]),
    unit('pg-basket-green', {games:['basketball-3d'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('緑になるまで待ったら、手がつかれた')]),
    unit('pg-basket-touch', {games:['basketball-3d'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('いまの、リングに入った?'), P('リングには、さわった')]),
    unit('pg-basket-height', {games:['basketball-3d'], moments:['repeatPlay', 'milestone']}, [P('リングの高さ、毎回ちがう気がする')]),
    // 卓球3D
    unit('pg-pingpong-home', {games:['pingpong-3d'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('ラケットを置いたら、球が帰ってきた')]),
    unit('pg-pingpong-ending', {games:['pingpong-3d'], moments:['plain', 'losingStreak', 'nearMiss'], bands:['bad', 'mid']}, [P('ラリーが続くと、終わり方がわからない')]),
    unit('pg-pingpong-stare', {games:['pingpong-3d'], moments:['plain', 'losingStreak'], with:'any'}, [T('相手、強かった?'), P('ずっとこっちを見てた。こわい')]),
    question('pq-pingpong-sound', {games:['pingpong-3d'], moments:['firstClear', 'newBest', 'plain']}, '卓球の音、なんて聞こえる?', [
      choice('ピンポン', P('じゃあ、ずっとだれか来てる')),
      choice('カコン', P('それ、ししおどしだよ')),
      choice('ぼくの名前', P('……呼ばれてたのか')),
    ]),
    // れんさパズル
    unit('pg-chain-lonely', {games:['chain-puzzle'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('消えたら、上から仲間が落ちてきた'), P('色って、さみしがりなんだね')]),
    unit('pg-chain-shy', {games:['chain-puzzle'], moments:['plain', 'losingStreak', 'nearMiss'], bands:['bad', 'mid']}, [P('同じ色が、三こまでしか集まらない'), P('四こ目は、人見知り')]),
    unit('pg-chain-polite', {games:['chain-puzzle'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('れんさ、した?'), P('ていねいに、一回ずつ消した')]),
    unit('pg-chain-ten', {games:['chain-puzzle'], moments:['plain', 'newBest'], trait:'boldness+'}, [P('四こじゃなくて、十こ集めてから消す')]),
    // かくとうバトル
    unit('pg-fight-pickup', {games:['street-fight'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('キックしたら、相手が遠くへ行った'), P('おみおくりした')]),
    unit('pg-fight-guard', {games:['street-fight'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('ガードを長おししてたら、試合が終わった')]),
    unit('pg-fight-fast', {games:['street-fight'], moments:['plain', 'newBest'], with:'any'}, [T('パンチ、速かった?'), P('速すぎて、ぼくも見てない')]),
    unit('pg-fight-friends', {games:['street-fight'], moments:['plain', 'repeatPlay'], trait:'sociability+'}, [P('たたかったら、ちょっと仲よくなった')]),
    // フリーキック
    unit('pg-freekick-think', {games:['free-kick-3d'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('ボールが、かべの上でちょっと考えた')]),
    unit('pg-freekick-deliver', {games:['free-kick-3d'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('キーパーの正面に、ていねいに届けた')]),
    unit('pg-freekick-wall', {games:['free-kick-3d'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('かべ、じゃまだった?'), P('かべは、いい人たちだった')]),
    unit('pg-freekick-faces', {games:['free-kick-3d'], moments:['repeatPlay', 'milestone']}, [P('かべの人たちの顔、覚えてきた')]),
    // タワーディフェンス
    unit('pg-td-asleep', {games:['tower-defense'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('お城、なにも気づかずに寝てた')]),
    unit('pg-td-road', {games:['tower-defense'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('タワー、道の上に建てたかった')]),
    unit('pg-td-where', {games:['tower-defense'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('どこに建てたの?'), P('道の外。敵のほうが道にくわしい')]),
    unit('pg-td-why', {games:['tower-defense'], moments:['plain', 'repeatPlay'], trait:'curiosity+'}, [P('敵、お城で何がしたかったんだろう')]),
    // ローグライク
    unit('pg-rogue-manners', {games:['roguelike-dungeon'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('一マス動くと、敵も一マス。礼儀正しい')]),
    unit('pg-rogue-think', {games:['roguelike-dungeon'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('一歩ずつ考えたら、敵も考えてた')]),
    unit('pg-rogue-stairs', {games:['roguelike-dungeon'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('何階まで行った?'), P('階段は、見た')]),
    question('pq-rogue-potion', {games:['roguelike-dungeon'], moments:['plain', 'losingStreak', 'nearMiss']}, '回復のくすり、いつ飲む?', [
      choice('すぐ', P('ぼくは、とっておく派。さっき負けた')),
      choice('ピンチで', P('ピンチは、気づいたら終わってる')),
      choice('飲まない', P('かざっておくと、強そうに見える')),
    ]),
    // グランプリ
    unit('pg-gp-backs', {games:['grand-prix-3d'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('ライバルの背中、ずっと見なかった')]),
    unit('pg-gp-oil', {games:['grand-prix-3d'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('オイルの上で、ちょっとおどった')]),
    unit('pg-gp-rank', {games:['grand-prix-3d'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('何位だった?'), P('ライバルたちは、上のほう')]),
    unit('pg-gp-boost', {games:['grand-prix-3d'], moments:['plain', 'newBest'], trait:'boldness+'}, [P('青いパッドは、ぜんぶぼくのもの')]),
    // スカイシューター
    unit('pg-sky-gap', {games:['sky-shooter'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('弾のすきまに、ぼくがちょうど入った')]),
    unit('pg-sky-bomb', {games:['sky-shooter'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('ボム、たいせつにしすぎた')]),
    unit('pg-sky-scenery', {games:['sky-shooter'], moments:['plain', 'nearMiss', 'newBest'], with:'any'}, [T('弾、見えてた?'), P('多すぎて、もう景色だった')]),
    // ジャンプクエスト
    unit('pg-jump-stomp', {games:['jump-quest'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('敵の頭、ふみ心地がよかった')]),
    unit('pg-jump-spikes', {games:['jump-quest'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('とげ、飛びこえる気で近づいた')]),
    unit('pg-jump-sky', {games:['jump-quest'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('ジャンプ、高かった?'), P('長おししすぎて、ちょっと空にいた')]),
    // そうこばん
    unit('pg-push-home', {games:['push-puzzle'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('箱たちが、みんな星に帰った')]),
    unit('pg-push-stuck', {games:['push-puzzle'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('箱が、かべにぴったりくっついた'), P('もう引っぱれない仲になった')]),
    unit('pg-push-undo', {games:['push-puzzle'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('一手もどした?'), P('一手もどして、二手まちがえた')]),
    unit('pg-push-please', {games:['push-puzzle'], moments:['losingStreak', 'nearMiss'], trait:'persistence+'}, [P('箱は引っぱれない。でも、おねがいはできる')]),
    // ビリヤード
    unit('pg-billiards-order', {games:['billiards-6'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('ボールが、ポケットの順番をゆずりあってた')]),
    unit('pg-billiards-white', {games:['billiards-6'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('白いボールが、いちばんに入った')]),
    unit('pg-billiards-guide', {games:['billiards-6'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('ガイド線、見てた?'), P('見てた。線の上は、だれも走らなかった')]),
    unit('pg-billiards-pocket', {games:['billiards-6'], moments:['plain', 'repeatPlay'], trait:'curiosity+'}, [P('ポケットの中って、どこにつながってるの')]),
    // どうぶつしょうぎ
    unit('pg-shogi-walk', {games:['animal-shogi'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('ライオン、奥までおさんぽさせた')]),
    unit('pg-shogi-chick', {games:['animal-shogi'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('ひよこが、むこうのチームに入った')]),
    unit('pg-shogi-elephant', {games:['animal-shogi'], moments:['plain', 'firstClear', 'nearMiss'], with:'any'}, [T('どのこまが好き?'), P('ぞう。ななめにしか行かないところ')]),
    question('pq-shogi-lion', {games:['animal-shogi'], moments:['firstClear', 'newBest', 'firstS']}, 'ライオンって、こまの中でえらいの?', [
      choice('えらい', P('じゃあ、もっと働いてほしい')),
      choice('ふつう', P('本人には言わないでね')),
      choice('わからない', P('ライオンも、たぶんわかってない')),
    ]),
    // マインスイーパー
    unit('pg-mines-listen', {games:['minesweeper-8'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('数字の言うこと、ぜんぶ聞いた')]),
    unit('pg-mines-safe', {games:['minesweeper-8'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('いちばん安全そうなマスだった')]),
    unit('pg-mines-flags', {games:['minesweeper-8'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('旗、どこに立てたの?'), P('あやしいマス。ぜんぶあやしかった')]),
    unit('pg-mines-open', {games:['minesweeper-8'], moments:['plain', 'losingStreak'], trait:'boldness+'}, [P('まよったマスは、とりあえず開ける')]),
    // スネーク
    unit('pg-snake-tail', {games:['snake-classic'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('のびすぎて、しっぽが遠い'), P('しっぽ、元気かな')]),
    unit('pg-snake-self', {games:['snake-classic'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('かべより先に、自分にぶつかった')]),
    unit('pg-snake-apple', {games:['snake-classic'], moments:['plain', 'newBest'], with:'any'}, [T('りんご、おいしかった?'), P('食べるたびに、急がされる')]),
    unit('pg-snake-me', {games:['snake-classic'], moments:['plain', 'repeatPlay'], trait:'curiosity+'}, [P('ぼくも、りんごでのびるかな')]),
    // やきゅう
    unit('pg-bat-home', {games:['baseball-batting'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('ホームラン。球はまだ帰ってこない')]),
    unit('pg-bat-wind', {games:['baseball-batting'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('ふった。球が通ったあとに'), P('風は、よく打てた')]),
    unit('pg-bat-hello', {games:['baseball-batting'], moments:['nearMiss', 'plain'], bands:['mid', 'bad'], with:'any'}, [T('かすったね'), P('球と、あいさつはできた')]),
    unit('pg-bat-point', {games:['baseball-batting'], moments:['plain', 'repeatPlay'], trait:'boldness+'}, [P('予告ホームラン。指したのは天井')]),
    // リングフライト
    unit('pg-ring-thread', {games:['ring-flight-3d'], moments:['firstS', 'newBest'], bands:['great']}, [P('リングを、糸で通したみたいだった')]),
    unit('pg-ring-cloud', {games:['ring-flight-3d'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('雲に、ずっとくっつかれてた')]),
    unit('pg-ring-beside', {games:['ring-flight-3d'], moments:['plain', 'nearMiss'], bands:['mid', 'bad'], with:'any'}, [T('リング、くぐれた?'), P('リングの横なら、たくさん通った')]),
    unit('pg-ring-who', {games:['ring-flight-3d'], moments:['repeatPlay', 'plain'], trait:'curiosity+'}, [P('あのリング、だれがかけてるんだろう')]),
    // バブルシューター
    unit('pg-bubble-meet', {games:['bubble-shooter'], moments:['firstClear', 'newBest', 'firstS'], bands:['great']}, [P('同じ色どうし、会えてよかった')]),
    unit('pg-bubble-ceiling', {games:['bubble-shooter'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('泡が下りてきて、のぞきこまれた')]),
    unit('pg-bubble-wall', {games:['bubble-shooter'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('かべで、はね返すといいよ'), P('知ってる。かべが知らなかった')]),
    unit('pg-bubble-dream', {games:['bubble-shooter'], moments:['repeatPlay', 'milestone']}, [P('目をとじると、泡の色がならぶ')]),
    // カタパルト
    unit('pg-cata-untie', {games:['catapult-castle'], moments:['firstS', 'newBest', 'firstClear'], bands:['great']}, [P('塔が、きれいにほどけた')]),
    unit('pg-cata-trip', {games:['catapult-castle'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('ボール、塔をよけて旅に出た')]),
    unit('pg-cata-sit', {games:['catapult-castle'], moments:['plain', 'newBest', 'firstClear'], bands:['great', 'mid'], with:'any'}, [T('おばけ、たおれた?'), P('びっくりして、すわっただけ')]),
    unit('pg-cata-self', {games:['catapult-castle'], moments:['plain', 'newBest'], trait:'boldness+'}, [P('次は、ぼくが飛んでいく')]),
    // コネクトフォー
    unit('pg-c4-slant', {games:['connect-four'], moments:['firstClear', 'newBest', 'firstS'], bands:['great']}, [P('ななめに4つ。だれも気づいてなかった')]),
    unit('pg-c4-three', {games:['connect-four'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('3つまでなら、ぼくが多かった')]),
    unit('pg-c4-next', {games:['connect-four'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('どの列に入れたの?'), P('入れたかった列の、となり')]),
    // 2048
    unit('pg-2048-corner', {games:['puzzle-2048'], moments:['newBest', 'firstS'], bands:['great']}, [P('大きい数が、角でえらそうにしてる')]),
    unit('pg-2048-full', {games:['puzzle-2048'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('2と4で、満員になった')]),
    unit('pg-2048-name', {games:['puzzle-2048'], moments:['newBest', 'plain'], bands:['great', 'mid'], with:'any'}, [T('いちばん大きいの、いくつ?'), P('角にいるやつ')]),
    unit('pg-2048-slide', {games:['puzzle-2048'], moments:['repeatPlay', 'milestone']}, [P('まばたきすると、タイルがすべる')]),
    // かえる
    unit('pg-frog-open', {games:['frogger-road'], moments:['firstClear', 'newBest', 'firstS'], bands:['great']}, [P('おうち、ちゃんとあいてた')]),
    unit('pg-frog-log', {games:['frogger-road'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('丸太が、ぼくを待ってくれなかった')]),
    unit('pg-frog-yield', {games:['frogger-road'], moments:['plain', 'nearMiss', 'losingStreak'], bands:['bad', 'mid'], with:'any'}, [T('どうして止まってたの?'), P('車に、道をゆずってた')]),
    unit('pg-frog-many', {games:['frogger-road'], moments:['plain', 'repeatPlay'], trait:'boldness-'}, [P('道路って、むこうから来るものが多い')]),
    // スキージャンプ
    unit('pg-ski-town', {games:['ski-jump'], moments:['newBest', 'firstS'], bands:['great']}, [P('着地したら、知らない町だった')]),
    unit('pg-ski-edge', {games:['ski-jump'], moments:['plain', 'losingStreak', 'nearMiss'], bands:['bad']}, [P('台のはしで、ちょっと考えてしまった')]),
    unit('pg-ski-bow', {games:['ski-jump'], moments:['plain', 'firstClear', 'newBest'], with:'any'}, [T('テレマーク、できた?'), P('着地のあとに、ていねいに一回')]),
    unit('pg-ski-down', {games:['ski-jump'], moments:['plain'], bands:['bad', 'mid'], trait:'boldness-'}, [P('空中で、下を見たのがいけない')]),
    question('pq-ski-far', {games:['ski-jump'], moments:['firstClear', 'newBest']}, 'どこまで飛んだと思う?', [
      choice('山のむこう', P('じゃあ、帰りは歩きだ')),
      choice('すぐそこ', P('すぐそこにしては、長い空だった')),
      choice('空', P('空には、着地できないよ')),
    ]),
    // エアホッケー
    unit('pg-hockey-home', {games:['air-hockey'], moments:['firstS', 'newBest', 'firstClear'], bands:['great']}, [P('パック、自分からゴールに帰った')]),
    unit('pg-hockey-two', {games:['air-hockey'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('速すぎて、パックがたぶん二つあった')]),
    unit('pg-hockey-sound', {games:['air-hockey'], moments:['plain', 'nearMiss'], bands:['mid', 'bad'], with:'any'}, [T('いまの、入った?'), P('音だけ聞くと、入った')]),
    unit('pg-hockey-chat', {games:['air-hockey'], moments:['plain', 'repeatPlay'], trait:'sociability+'}, [P('パックが行ったり来たり。話してるみたい')]),
    // サブマリン
    unit('pg-sub-cold', {games:['submarine-3d'], moments:['newBest', 'firstS'], bands:['great']}, [P('ダイヤで、ポケットがつめたい')]),
    unit('pg-sub-jelly', {games:['submarine-3d'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('クラゲに、道をきいたのがまちがい')]),
    unit('pg-sub-ears', {games:['submarine-3d'], moments:['plain', 'newBest', 'firstClear'], with:'any'}, [T('深くまで行けた?'), P('耳が、もういいって言うまで')]),
    unit('pg-sub-quiet', {games:['submarine-3d'], moments:['plain', 'repeatPlay'], trait:'sociability-'}, [P('海の中は、だれも話しかけてこない')]),
    // フルーツマッチ3
    unit('pg-match-chain', {games:['match-3'], moments:['newBest', 'firstS'], bands:['great']}, [P('れんさが続いた。止め方がわからない')]),
    unit('pg-match-seat', {games:['match-3'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('入れかえても、みんな元の席に帰る')]),
    unit('pg-match-pair', {games:['match-3'], moments:['plain', 'newBest'], bands:['great', 'mid'], with:'any'}, [T('どれとどれ、入れかえたの?'), P('なかよくなさそうな二つ')]),
    unit('pg-match-faces', {games:['match-3'], moments:['repeatPlay', 'milestone']}, [P('イチゴの顔、一つずつ見分けがつく')]),
    // 五目ならべ
    unit('pg-gomoku-shake', {games:['gomoku-9'], moments:['firstClear', 'newBest', 'firstS'], bands:['great']}, [P('5つめを置くとき、手がふるえた')]),
    unit('pg-gomoku-apart', {games:['gomoku-9'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('ぼくの石、みんな離れて住んでる')]),
    unit('pg-gomoku-tap', {games:['gomoku-9'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('どうして、そこに置いたの?'), P('2回さわったら、決まってた')]),
    unit('pg-gomoku-memo', {games:['gomoku-9'], moments:['losingStreak'], trait:'persistence+'}, [P('相手の石、ぜんぶ覚えて帰る')]),
    // タンクバトル
    unit('pg-tank-road', {games:['tank-battle'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('かべに、ぼく専用の道ができた')]),
    unit('pg-tank-facing', {games:['tank-battle'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('弾は、ぼくが向いてるほうに行く'), P('それが問題')]),
    unit('pg-tank-heavy', {games:['tank-battle'], moments:['plain', 'repeatPlay'], with:'any'}, [T('タンクって、重くない?'), P('中にいるから、わからない')]),
    unit('pg-tank-brick', {games:['tank-battle'], moments:['plain', 'newBest'], trait:'boldness+'}, [P('かべがあると、とりあえず開けたい')]),
    // テニス
    unit('pg-tennis-lob', {games:['tennis-rally'], moments:['newBest', 'firstS'], bands:['great']}, [P('ロブが、空で一休みしてから落ちた')]),
    unit('pg-tennis-hole', {games:['tennis-rally'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('ラケットの、網じゃないとこで打った')]),
    unit('pg-tennis-rally', {games:['tennis-rally'], moments:['plain', 'nearMiss'], bands:['mid', 'bad'], with:'any'}, [T('ラリー、続いた?'), P('相手が、だいたい返してくれた')]),
    unit('pg-tennis-talk', {games:['tennis-rally'], moments:['plain', 'repeatPlay'], trait:'sociability-'}, [P('打ち返されると、話しかけられた気分')]),
    // ピクロス
    unit('pg-picross-art', {games:['picross-5'], moments:['firstClear', 'newBest', 'firstS'], bands:['great']}, [P('ぬってたら、絵だった。ちょっとおどろいた')]),
    unit('pg-picross-vote', {games:['picross-5'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('ぼくの絵、数字と意見が合わない')]),
    unit('pg-picross-what', {games:['picross-5'], moments:['plain', 'firstClear', 'newBest'], bands:['great', 'mid'], with:'any'}, [T('何の絵だったの?'), P('ぬってる間は、ただのマスだった')]),
    unit('pg-picross-x', {games:['picross-5'], moments:['plain', 'repeatPlay'], trait:'curiosity+'}, [P('ぬらないマスにも、言い分がある')]),
    // ハンググライダー
    unit('pg-glider-lift', {games:['hang-glider-3d'], moments:['newBest', 'firstS'], bands:['great']}, [P('気流に、だまって持ち上げてもらった')]),
    unit('pg-glider-ground', {games:['hang-glider-3d'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('地面が、思ったより近所にあった')]),
    unit('pg-glider-balloon', {games:['hang-glider-3d'], moments:['plain', 'nearMiss'], bands:['mid', 'bad'], with:'any'}, [T('風船、とれた?'), P('いくつか、空に置いてきた')]),
    unit('pg-glider-nose', {games:['hang-glider-3d'], moments:['plain'], trait:'boldness-'}, [P('機首を下げる勇気が、まだない')]),
    // ボンバー
    unit('pg-bomber-items', {games:['bomber-maze'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('レンガの中に、あいてむが住んでた')]),
    unit('pg-bomber-wait', {games:['bomber-maze'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('ばくだんを置いて、となりで待ってた')]),
    unit('pg-bomber-two', {games:['bomber-maze'], moments:['plain', 'nearMiss'], bands:['mid', 'bad'], with:'any'}, [T('2秒って、長い?'), P('ばくだんの横だと、長い')]),
    unit('pg-bomber-count', {games:['bomber-maze'], moments:['repeatPlay', 'milestone']}, [P('2秒を数えるのが、うまくなった')]),
    // ブラックジャック
    unit('pg-bj-air', {games:['blackjack-21'], moments:['firstS', 'newBest', 'firstClear'], bands:['great']}, [P('21。カードが空気を読んだ')]),
    unit('pg-bj-one', {games:['blackjack-21'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('「もう一枚だけ」が、いつも一枚多い')]),
    unit('pg-bj-lonely', {games:['blackjack-21'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('なんで、そこで引いたの?'), P('カードが、さみしそうだった')]),
    unit('pg-bj-fear', {games:['blackjack-21'], moments:['plain', 'losingStreak'], trait:'boldness+'}, [P('17はこわくない。22もこわくない')]),
    question('pq-bj-dealer', {games:['blackjack-21'], moments:['plain', 'newBest', 'losingStreak']}, 'ディーラー、どんな人だった?', [
      choice('こわい', P('17で止まる。まじめなだけだよ')),
      choice('やさしい', P('ぼくのカードには、きびしかった')),
      choice('顔がない', P('……だから、表情が読めなかったのか')),
    ]),
    // パイプつなぎ
    unit('pg-pipe-wait', {games:['pipe-connect'], moments:['firstClear', 'newBest', 'firstS'], bands:['great']}, [P('ひまわり、ちょっと待たせた')]),
    unit('pg-pipe-route', {games:['pipe-connect'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('水は、ぼくの考えた道を通らない')]),
    unit('pg-pipe-spin', {games:['pipe-connect'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('なんで、そんなに回したの?'), P('ぜんぶの向き、一回は見たかった')]),
    unit('pg-pipe-inside', {games:['pipe-connect'], moments:['repeatPlay', 'plain'], trait:'curiosity+'}, [P('パイプの中、いちど通ってみたい')]),
    // フルーツ斬り
    unit('pg-slice-salad', {games:['fruit-slice'], moments:['newBest', 'firstS'], bands:['great']}, [P('一回で、フルーツサラダになった')]),
    unit('pg-slice-bomb', {games:['fruit-slice'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('ばくだんも、フルーツの顔してた')]),
    unit('pg-slice-smell', {games:['fruit-slice'], moments:['plain', 'newBest'], with:'any'}, [T('ひとくち、ちょうだい'), P('画面の中だから、においだけ')]),
    unit('pg-slice-first', {games:['fruit-slice'], moments:['plain', 'newBest'], trait:'boldness+'}, [P('落ちてくる前に、こっちから行く')]),
    // りくじょう
    unit('pg-track-think', {games:['track-field'], moments:['newBest', 'firstS'], bands:['great']}, [P('飛んでる間に、ちょっと考えごとした')]),
    unit('pg-track-feet', {games:['track-field'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('右と左が、順番をゆずり合った')]),
    unit('pg-track-finger', {games:['track-field'], moments:['newBest', 'plain', 'firstClear'], bands:['great', 'mid'], with:'any'}, [T('足、はやかったね'), P('指がね')]),
    unit('pg-track-long', {games:['track-field'], moments:['losingStreak'], trait:'persistence-'}, [P('100mって、きょうは長い')]),
    // ボクセルマイニング
    unit('pg-mine-eye', {games:['voxel-mine'], moments:['newBest', 'firstS'], bands:['great']}, [P('ダイヤ、ほったらこっちを見てた')]),
    unit('pg-mine-stare', {games:['voxel-mine'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('ずっと、石とにらめっこしてた')]),
    unit('pg-mine-deep', {games:['voxel-mine'], moments:['plain', 'newBest', 'firstClear'], with:'any'}, [T('どこまでほったの?'), P('昼か夜か、わからなくなるまで')]),
    unit('pg-mine-below', {games:['voxel-mine'], moments:['repeatPlay', 'plain'], trait:'curiosity+'}, [P('もう一マス下に、何かいる気がする')]),
    // かいてんずし
    unit('pg-sushi-order', {games:['sushi-belt'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('注文どおり。ぼく、まじめだった')]),
    unit('pg-sushi-lap', {games:['sushi-belt'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('取りたいお皿は、いつも一周むこう')]),
    unit('pg-sushi-full', {games:['sushi-belt'], moments:['plain', 'newBest'], with:'any'}, [T('おなか、いっぱい?'), P('取っただけ。食べてない')]),
    unit('pg-sushi-exit', {games:['sushi-belt'], moments:['repeatPlay', 'plain'], trait:'curiosity+'}, [P('レーンの出口、どこにつながってるの')]),
    question('pq-sushi-next', {games:['sushi-belt'], moments:['plain', 'repeatPlay', 'newBest']}, 'つぎは、どのお皿をとる?', [
      choice('まぐろ', P('注文にないけど、目が合った')),
      choice('わさび', P('……あれは、取らないためにある')),
      choice('からのお皿', P('一周したら、何か乗ってるかも')),
    ]),
    // アステロイド
    unit('pg-ast-quiet', {games:['asteroids-classic'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('岩をわりきった。宇宙がしずか')]),
    unit('pg-ast-more', {games:['asteroids-classic'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('岩をわるたびに、数がふえる')]),
    unit('pg-ast-spin', {games:['asteroids-classic'], moments:['plain', 'nearMiss'], bands:['mid', 'bad'], with:'any'}, [T('くるくる回ってたね'), P('前がどっちか、さがしてた')]),
    unit('pg-ast-edge', {games:['asteroids-classic'], moments:['repeatPlay', 'milestone']}, [P('はしの向こうも、はしだった')]),
    // ヨット
    unit('pg-yacht-face', {games:['yacht-dice'], moments:['newBest', 'firstS'], bands:['great']}, [P('サイコロが、みんな同じ顔した')]),
    unit('pg-yacht-away', {games:['yacht-dice'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('ふり直すたび、遠ざかった')]),
    unit('pg-yacht-eyes', {games:['yacht-dice'], moments:['plain', 'nearMiss'], bands:['mid', 'bad'], with:'any'}, [T('なんで、それをのこしたの?'), P('目が合ったから')]),
    question('pq-yacht-keep', {games:['yacht-dice'], moments:['firstClear', 'newBest', 'plain']}, 'つぎ、どのサイコロをのこす?', [
      choice('6', P('いちばんえらそうだから')),
      choice('1', P('1は、ひとりだとさみしい')),
      choice('ぜんぶ', P('じゃあ、ふるものがない')),
    ]),
    // ライツアウト
    unit('pg-lights-dark', {games:['lights-out'], moments:['firstClear', 'newBest', 'firstS'], bands:['great']}, [P('真っ暗。いい意味で')]),
    unit('pg-lights-wake', {games:['lights-out'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('一つ消すと、となりが起きる')]),
    unit('pg-lights-glare', {games:['lights-out'], moments:['plain', 'nearMiss'], bands:['mid', 'bad'], with:'any'}, [T('まぶしくない?'), P('つけたのも、ぼくなんだ')]),
    unit('pg-lights-sleep', {games:['lights-out'], moments:['losingStreak', 'nearMiss'], trait:'persistence+'}, [P('ぜんぶ消えるまで、ねむれない')]),
    // ぴょんぴょんジャンプ
    unit('pg-doodle-spring', {games:['doodle-jump'], moments:['newBest', 'firstS'], bands:['great']}, [P('バネに乗ったら、景色が変わった')]),
    unit('pg-doodle-brown', {games:['doodle-jump'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('茶色の台を、信じてしまった')]),
    unit('pg-doodle-high', {games:['doodle-jump'], moments:['plain', 'newBest', 'firstClear'], with:'any'}, [T('高いところ、平気?'), P('下を見なければ、ずっと平気')]),
    unit('pg-doodle-auto', {games:['doodle-jump'], moments:['losingStreak', 'repeatPlay']}, [P('ジャンプは自動。やる気は手動')]),
    // カーリング
    unit('pg-curl-sit', {games:['curling-ice'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('石が、真ん中ですわりこんだ')]),
    unit('pg-curl-over', {games:['curling-ice'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('こすったら、石が調子にのった')]),
    unit('pg-curl-mood', {games:['curling-ice'], moments:['plain', 'nearMiss'], bands:['mid', 'bad'], with:'any'}, [T('ずっとこすってたの、何?'), P('氷のきげんを、とってた')]),
    unit('pg-curl-hush', {games:['curling-ice'], moments:['plain', 'repeatPlay'], trait:'sociability+'}, [P('石が止まるまで、みんなでだまるのがいい')]),
    // せんなぞり
    unit('pg-trace-model', {games:['line-trace'], moments:['newBest', 'firstS'], bands:['great']}, [P('お手本が、ぼくをなぞったのかも')]),
    unit('pg-trace-walk', {games:['line-trace'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('線が、赤いほうへ散歩に出た')]),
    unit('pg-trace-shake', {games:['line-trace'], moments:['plain', 'nearMiss'], bands:['mid', 'bad'], with:'any'}, [T('手、ふるえてた?'), P('ふるえも、線のうち')]),
    unit('pg-trace-lift', {games:['line-trace'], moments:['nearMiss'], trait:'persistence+'}, [P('指をはなすのが、いちばんむずかしい')]),
    // チェッカー
    unit('pg-check-king', {games:['checkers-6'], moments:['newBest', 'firstS', 'firstClear'], bands:['great']}, [P('キングになったら、後ろが気になる')]),
    unit('pg-check-over', {games:['checkers-6'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('飛びこされるとき、上を見てた')]),
    unit('pg-check-count', {games:['checkers-6'], moments:['plain', 'nearMiss'], bands:['mid', 'bad'], with:'any'}, [T('こま、いくつ取った?'), P('取られたぶんなら、覚えてる')]),
    question('pq-check-king', {games:['checkers-6'], moments:['firstClear', 'newBest', 'firstS']}, 'キングになったら、なにする?', [
      choice('後ろへ', P('ずっと前ばかり見てたから')),
      choice('すわる', P('王さまは、すわっててもいいはず')),
      choice('なにもしない', P('かんむりだけ、のせておく')),
    ]),
    // ハーフパイプ
    unit('pg-halfpipe-spin', {games:['halfpipe-skate'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('空で一回転してきた'), P('空は、回ってなかった')]),
    unit('pg-halfpipe-pump', {games:['halfpipe-skate'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('ポンプ、おしすぎた'), P('ぼくがふくらむかと思った')]),
    unit('pg-halfpipe-side', {games:['halfpipe-skate'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('いま、ころんだ?'), P('着地を、ちょっと横向きにしただけ')]),
    unit('pg-halfpipe-same', {games:['halfpipe-skate'], moments:['repeatPlay', 'milestone']}, [P('坂を行ったり来たり'), P('ずっと、同じ場所にいる')]),
    // ドミノたおし
    unit('pg-domino-bell', {games:['domino-run'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('チリンって鳴った'), P('ドミノ全員で、一回だけ')]),
    unit('pg-domino-lazy', {games:['domino-run'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('一まいだけ、たおれる気がなかった')]),
    unit('pg-domino-mine', {games:['domino-run'], moments:['nearMiss', 'plain'], bands:['bad', 'mid'], with:'any'}, [T('どこで止まったの?'), P('ぼくが置いたやつの前'), P('……ぼくが置いたやつで')]),
    unit('pg-domino-lie', {games:['domino-run'], moments:['losingStreak'], trait:'persistence-'}, [P('ドミノの気持ちになって、ちょっと横になる')]),
    // マンカラ
    unit('pg-mancala-sprout', {games:['mancala-kalah'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('ストアがたねで、ぎゅうぎゅう'), P('芽が出たら、どうしよう')]),
    unit('pg-mancala-gift', {games:['mancala-kalah'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('たねを、ていねいにまいてあげた'), P('むこうの穴に')]),
    unit('pg-mancala-eat', {games:['mancala-kalah'], moments:['plain', 'newBest'], bands:['great', 'mid'], with:'any'}, [T('それ、食べられるの?'), P('食べたら、ゲームが終わる')]),
    question('pq-mancala-seed', {games:['mancala-kalah'], moments:['firstClear', 'newBest']}, 'あまったたね、どうする?', [
      choice('まく', P('じゃあ、春まで待ってて')),
      choice('たべる', P('……マンカラの味がする')),
      choice('とっておく', P('来年のぼくに、あげよう')),
    ]),
    // ひこうき着陸
    unit('pg-plane-asleep', {games:['plane-landing'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('ふわっと降りた'), P('お客さん、まだ寝てる')]),
    unit('pg-plane-wind', {games:['plane-landing'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('風が、ちがう空港に行きたがった')]),
    unit('pg-plane-hello', {games:['plane-landing'], moments:['nearMiss', 'plain'], bands:['bad', 'mid'], with:'any'}, [T('着陸した?'), P('ほぼ。地面とは、あいさつした')]),
    unit('pg-plane-nose', {games:['plane-landing'], moments:['repeatPlay', 'milestone']}, [P('機首を上げると、空がもう一回見える')]),
    // ドットイーター
    unit('pg-dot-hungry', {games:['dot-eater'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('ドット、ぜんぶ食べた'), P('おなかは、すいたまま')]),
    unit('pg-dot-corner', {games:['dot-eater'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('おばけが、角で待ってた'), P('どの角にも')]),
    unit('pg-dot-taste', {games:['dot-eater'], moments:['plain', 'newBest'], bands:['great', 'mid'], with:'any'}, [T('何味だった?'), P('ドットは、点の味')]),
    unit('pg-dot-four', {games:['dot-eater'], moments:['plain', 'repeatPlay'], trait:'sociability+'}, [P('おばけたち、四人でなかよしだな')]),
    // ミサイルコマンド
    unit('pg-missile-rings', {games:['missile-command'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('空に、輪っかをたくさん作った'), P('町は、何も知らずに寝てた')]),
    unit('pg-missile-empty', {games:['missile-command'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('弾、ぜんぶ空にあげちゃった'), P('空は、にぎやかだった')]),
    unit('pg-missile-secret', {games:['missile-command'], moments:['nearMiss', 'plain'], bands:['bad', 'mid'], with:'any'}, [T('町、守れた?'), P('町の人には、ないしょにしといて')]),
    unit('pg-missile-sky', {games:['missile-command'], moments:['plain'], trait:'boldness-'}, [P('空をタップするの、ちょっとこわい'), P('空が、いたがりそう')]),
    // じんとり
    unit('pg-area-mine', {games:['area-claim'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('ここから、ここまで、ぼくの'), P('まだ、何にも使ってない')]),
    unit('pg-area-step', {games:['area-claim'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('キラキラに、線をふまれた')]),
    unit('pg-area-stand', {games:['area-claim'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('どのくらい取ったの?'), P('ぼくが立てるくらい')]),
    unit('pg-area-alone', {games:['area-claim'], moments:['newBest', 'plain'], bands:['great', 'mid'], trait:'sociability-'}, [P('ひとりで住むには、ちょうどいい広さ')]),
    // ソリティア
    unit('pg-soli-king', {games:['solitaire-klondike'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('Kが、いちばん上でえらそう')]),
    unit('pg-soli-deck', {games:['solitaire-klondike'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('山札をめくった'), P('知ってる顔ばっかり')]),
    unit('pg-soli-two', {games:['solitaire-klondike'], moments:['plain', 'repeatPlay'], with:'any'}, [T('それ、ひとりで遊ぶやつ?'), P('うん。いまは、ふたり')]),
    question('pq-soli-ace', {games:['solitaire-klondike'], moments:['firstClear', 'newBest']}, 'Aって、えらいの?', [
      choice('えらい', P('じゃあ、なんでいちばん下にいるの')),
      choice('ふつう', P('Aも、そう言ってた')),
      choice('Kがえらい', P('Kは、ずっとそう思ってる')),
    ]),
    // ヒット&ブロー
    unit('pg-hitblow-found', {games:['hit-blow'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('色たちのかくれんぼ、見つけた'), P('もういいかい、って言いそびれた')]),
    unit('pg-hitblow-blow', {games:['hit-blow'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('ブローばっかり'), P('みんな、いるのに、いない')]),
    unit('pg-hitblow-unchosen', {games:['hit-blow'], moments:['nearMiss', 'plain'], bands:['bad', 'mid'], with:'any'}, [T('答え、何色だった?'), P('ぼくが選ばなかった色')]),
    unit('pg-hitblow-seventh', {games:['hit-blow'], moments:['plain', 'repeatPlay'], trait:'curiosity+'}, [P('7色目がいたら、どこにかくれるかな')]),
    // ルナランダー
    unit('pg-lunar-step', {games:['lunar-lander'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('月に、ぼくの足あとがひとつ')]),
    unit('pg-lunar-near', {games:['lunar-lander'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('月が、思ったより近かった')]),
    unit('pg-lunar-tilt', {games:['lunar-lander'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('月、どうだった?'), P('ななめだった。ぼくが')]),
    unit('pg-lunar-guts', {games:['lunar-lander'], moments:['losingStreak'], trait:'persistence+'}, [P('燃料は、気合いでなんとかする')]),
    // 上海
    unit('pg-shanghai-pairs', {games:['shanghai-tiles'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('牌がみんな、ふたりずつ帰った')]),
    unit('pg-shanghai-single', {games:['shanghai-tiles'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('一枚だけ、相手が見つからない'), P('ぼくと組む?')]),
    unit('pg-shanghai-edge', {games:['shanghai-tiles'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('どれが取れるの?'), P('はじっこで、上に何もないやつ'), P('いちばん自由なやつ')]),
    unit('pg-shanghai-wide', {games:['shanghai-tiles'], moments:['repeatPlay', 'milestone']}, [P('牌の山がなくなると、つくえが広い')]),
    // ビーチバレー
    unit('pg-volley-sand', {games:['beach-volley'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('スパイクしたら、すながびっくりしてた')]),
    unit('pg-volley-circle', {games:['beach-volley'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('○の中で待ってた'), P('ボールは、来なかった')]),
    unit('pg-volley-sandy', {games:['beach-volley'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('すなだらけだね'), P('うけるたびに、ちょっとずつもらった')]),
    question('pq-volley-point', {games:['beach-volley'], moments:['firstClear', 'newBest']}, 'さいごの一点、どうやって取った?', [
      choice('スパイク', P('うん。ボールが勝手に曲がった')),
      choice('たまたま', P('たまたまを、四回やった')),
      choice('見てなかった', P('じゃあ、すごいスパイクだったことにする')),
    ]),
    // スライドパズル
    unit('pg-slide-face', {games:['slide-puzzle'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('絵が、やっと自分の顔を思い出した')]),
    unit('pg-slide-corner', {games:['slide-puzzle'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('左上だけは、完ぺき')]),
    unit('pg-slide-missing', {games:['slide-puzzle'], moments:['nearMiss', 'plain'], bands:['bad', 'mid'], with:'any'}, [T('あと何まい?'), P('空いてるところに、一まい足りない')]),
    unit('pg-slide-box', {games:['slide-puzzle'], moments:['losingStreak'], trait:'persistence-'}, [P('ピースをぜんぶ外して、箱にもどしたい')]),
    // すごろく
    unit('pg-sugoroku-face', {games:['sugoroku-race'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('ねらった目が、ちゃんと上を向いた')]),
    unit('pg-sugoroku-nap', {games:['sugoroku-race'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('1回休みのマスで、よく寝た')]),
    unit('pg-sugoroku-back', {games:['sugoroku-race'], moments:['plain', 'losingStreak'], bands:['bad', 'mid'], with:'any'}, [T('もどるマス、ふんだ?'), P('ふんだ。なつかしい場所に行けた')]),
    unit('pg-sugoroku-blind', {games:['sugoroku-race'], moments:['plain', 'newBest'], trait:'boldness+'}, [P('サイコロ、見ないで止めた。そのほうが速い')]),
    // たこやきやさん
    unit('pg-tako-fox', {games:['takoyaki-grill'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('ぜんぶ、きつね色'), P('きつねに見せてあげたい')]),
    unit('pg-tako-welldone', {games:['takoyaki-grill'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('こげたのは、よく焼きってことで')]),
    unit('pg-tako-share', {games:['takoyaki-grill'], moments:['plain', 'newBest'], bands:['great', 'mid'], with:'any'}, [T('ひとつちょうだい'), P('いいよ。たこが入ってないやつ')]),
    unit('pg-tako-know', {games:['takoyaki-grill'], moments:['repeatPlay', 'plain'], trait:'curiosity+'}, [P('たこは、中にいるの知ってるのかな')]),
    question('pq-tako-last', {games:['takoyaki-grill'], moments:['firstClear', 'firstS']}, 'さいごのひとつ、だれが食べる?', [
      choice('こっち', P('じゃあ、ふーふーしてあげる')),
      choice('なおとっち', P('いいの?じゃあ、半分こ')),
      choice('たこ', P('……たこは、もう入ってる')),
    ]),
    // とかいラン
    unit('pg-city-kid', {games:['road-city'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('ビルの間を、すいすい'), P('ぼく、都会っ子かもしれない')]),
    unit('pg-city-shiny', {games:['road-city'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('都会は、よけるものが多い'), P('わるいものほど、キラキラしてた')]),
    unit('pg-city-lucky', {games:['road-city'], moments:['plain', 'newBest'], bands:['great', 'mid'], with:'any'}, [T('なに拾ったの?'), P('ラッキーなもの。たぶん')]),
    // ジャングルラン
    unit('pg-jungle-fruit', {games:['road-jungle'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('くだもの、一年分ひろった')]),
    unit('pg-jungle-snake', {games:['road-jungle'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('ヘビと、同じレーンに入った'), P('ヘビも、ゆずる気はなかった')]),
    unit('pg-jungle-green', {games:['road-jungle'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('ジャングル、どうだった?'), P('緑だった。だいたい')]),
    unit('pg-jungle-wave', {games:['road-jungle'], moments:['plain', 'repeatPlay'], trait:'sociability+'}, [P('ヘビにも、手をふっておいた')]),
    // さばくラン
    unit('pg-desert-oasis', {games:['road-desert'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('オアシスで、ぜんぶもらってきた'), P('水たまり、ひとつ小さくなった')]),
    unit('pg-desert-camo', {games:['road-desert'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('とげが、すなと同じ色してる')]),
    unit('pg-desert-thirst', {games:['road-desert'], moments:['plain', 'newBest'], with:'any'}, [T('のど、かわいた?'), P('オアシス、持って帰れなかった')]),
    unit('pg-desert-later', {games:['road-desert'], moments:['losingStreak'], trait:'persistence-'}, [P('さばくは、また今度。すなは待ってる')]),
    // しゅうかくタワー
    unit('pg-harvest-scarecrow', {games:['stack-harvest'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('実りが、空までとどきそう'), P('かかしが、見上げてた')]),
    unit('pg-harvest-pumpkin', {games:['stack-harvest'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('かぼちゃの上に、かぼちゃはむずかしい')]),
    unit('pg-harvest-autumn', {games:['stack-harvest'], moments:['plain', 'newBest'], with:'any'}, [T('なに積んだの?'), P('秋。ひとかたまり')]),
    // きのみタワー
    unit('pg-acorn-squirrel', {games:['stack-acorn'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('リスの冬ごもり、ぜんぶここにある')]),
    unit('pg-acorn-round', {games:['stack-acorn'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('どんぐりは、まるい'), P('積むものじゃなかった')]),
    unit('pg-acorn-forest', {games:['stack-acorn'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('くずれちゃったね'), P('森に、帰っていった')]),
    // さくらタワー
    unit('pg-sakura-breath', {games:['stack-sakura'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('花びら、そっと重ねた'), P('息も、そっとしてた')]),
    unit('pg-sakura-sneeze', {games:['stack-sakura'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('くしゃみ、がまんできなかった')]),
    unit('pg-sakura-fall', {games:['stack-sakura'], moments:['plain', 'nearMiss'], with:'partner'}, [T('きれいだったね'), P('うん。くずれるときが、いちばん')]),
    // おちばタワー
    unit('pg-leaves-jump', {games:['stack-leaves'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('落ち葉の山、ぼくより高くなった'), P('とびこみたい')]),
    unit('pg-leaves-wind', {games:['stack-leaves'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('風が、ちょっと手伝いすぎた')]),
    unit('pg-leaves-above', {games:['stack-leaves'], moments:['plain', 'newBest'], with:'any'}, [T('その葉っぱ、どこから?'), P('ぜんぶ、上から')]),
    unit('pg-leaves-after', {games:['stack-leaves'], moments:['repeatPlay', 'plain'], trait:'curiosity+'}, [P('落ち葉って、落ちたあと何してるんだろう')]),
    // やまの岩場のぼり
    unit('pg-climb-summit', {games:['downhill-mountain'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('山頂に着いた'), P('山は、とくに何も言わなかった')]),
    unit('pg-climb-grip', {games:['downhill-mountain'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('にぎる力、岩においてきた')]),
    unit('pg-climb-rest', {games:['downhill-mountain'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('どこまで登った?'), P('休けいのところ。休けいは、完ぺき')]),
    unit('pg-climb-walk', {games:['downhill-mountain'], moments:['losingStreak', 'repeatPlay'], trait:'persistence+'}, [P('山頂が、ちょっとずつ近くなってる'), P('山が、歩いてきてるのかも')]),
    // ゆきのゲレンデ
    unit('pg-snow-flags', {games:['downhill-snow'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('旗の間を、ぜんぶ通った'), P('旗にも、ちゃんと会釈した')]),
    unit('pg-snow-log', {games:['downhill-snow'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('丸太をジャンプでこえた'), P('……気持ちだけ、むこうに着いた')]),
    unit('pg-snow-cold', {games:['downhill-snow'], moments:['plain', 'newBest'], bands:['great', 'mid'], with:'any'}, [T('寒くなかった?'), P('速すぎて、寒さが追いつかなかった')]),
    unit('pg-snow-top', {games:['downhill-snow'], moments:['plain'], trait:'boldness-'}, [P('坂のてっぺんで、しばらく考えてた')]),
    // しんかいフィッシング
    unit('pg-deep-something', {games:['fishing-deepsea'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('なにか、つれた'), P('なにかは、まだわからない')]),
    unit('pg-deep-reply', {games:['fishing-deepsea'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('深いところは、返事がおそい')]),
    unit('pg-deep-glow', {games:['fishing-deepsea'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('なにがかかったの?'), P('光ってた。それ以上は言えない')]),
    question('pq-deep-what', {games:['fishing-deepsea'], moments:['firstClear', 'newBest']}, 'いまの、なんだったと思う?', [
      choice('イカ', P('イカにしては、あいさつがていねい')),
      choice('たからばこ', P('じゃあ、開けずにとっておく')),
      choice('ながぐつ', P('……もう片方も、下にいるのかな')),
    ]),
    // みずべのさかなつり
    unit('pg-river-read', {games:['fishing-river'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('流れを読んだ'), P('ちょっとだけ、川の気持ちになった')]),
    unit('pg-river-meeting', {games:['fishing-river'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('さかなは、上流で会議中')]),
    unit('pg-river-sky', {games:['fishing-river'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('なにか、いた?'), P('川の中に、空がいた')]),
    unit('pg-river-home', {games:['fishing-river'], moments:['losingStreak'], trait:'persistence-'}, [P('さかなは、川にいるのがいちばん')]),
    // なつのうみフライト
    unit('pg-ring-center', {games:['ring-flight-summer'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('夕焼けの輪、ぜんぶくぐった'), P('空のまん中、通ってきた')]),
    unit('pg-ringsummer-cloud', {games:['ring-flight-summer'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('入道雲が、わの前で昼寝してた')]),
    unit('pg-ring-orange', {games:['ring-flight-summer'], moments:['plain', 'newBest'], with:'partner'}, [T('夕焼け、きれいだった?'), P('リングばっかり見てた'), P('……でも、オレンジだった')]),
    // カーリング
    unit('pg-curling-sit', {games:['curling-winter'], moments:['firstClear', 'firstS', 'newBest'], bands:['great']}, [P('雪の日の石は、まん中がすき'), P('あったかそうだから')]),
    unit('pg-curling-over', {games:['curling-winter'], moments:['plain', 'losingStreak'], bands:['bad']}, [P('こすりすぎて、氷がぴかぴか'), P('石は、もう見えない')]),
    unit('pg-curling-slick', {games:['curling-winter'], moments:['plain', 'nearMiss'], bands:['bad', 'mid'], with:'any'}, [T('何回こすったの?'), P('氷が、つるつるになるまで'), T('もともと、つるつるだよ')]),
    unit('pg-curling-friends', {games:['curling-winter'], moments:['plain', 'milestone'], trait:'sociability+'}, [P('石どうし、ぶつかって仲よくなってた')]),
    // どのゲームでも
    unit('pg-fav-lose', {games:GAMES, moments:['plain', 'losingStreak', 'nearMiss'], bands:['bad', 'mid'], favorite:true}, [P('好きだから、負けてもあんまり負けてない')]),
    unit('pg-fav-time', {games:GAMES, moments:['plain', 'repeatPlay', 'milestone'], favorite:true}, [P('好きなことをしてると、時間がちぢむ')]),
    unit('pg-switch', {games:GAMES, moments:['losingStreak'], trait:'persistence-'}, [P('きょうは、ここまでにしてあげる')]),
    question('pq-watched', {games:GAMES, moments:['newBest', 'firstS']}, 'いまの、見てた?', [
      choice('見てた', P('じゃあ、証人ね')),
      choice('見てない', P('……もう一回やるから、見てて')),
    ]),
    question('pq-win-next', {games:GAMES, moments:['losingStreak']}, 'もう一回やったら、勝てると思う?', [
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
    if (!GAMES.includes(c.gameId)) return [];
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
      if (!u.games.length || u.games.some(g => !GAMES.includes(g))) problems.push(`${u.id}: games`);
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

  const api = {GAMES, PILOT_GAMES, UNITS, candidates, traitMatches, validate, VERSION:1};
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NaotocchiConversationPostgame = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
