// Conversation v2 — クイックのあとの一言(クイック 50 本)。
// クイックの結果(クリア数・コンボ・ライフ・どのゲームで失敗したか)は quick.js が数えたものを受け取るだけ。
// ここは「その結果から、どんなできごとだったか」を読む純関数と、「誰が何を言うか」の台詞データ。
// DOM・セーブ・タイマー・乱数は持たない。いつ出すかは script.js と Conversation Director が決める。
// クイックは次々遊べるのが魅力なので、台詞は 1〜2 行(まれに 3 行)。問いかけ(選択肢)は使わない。
// 設計: docs/design/conversation-quick-pilot-2026-10-23.md(Pilot 8 本)・docs/design/conversation-full-rollout-2026-10-23.md(全 50 本)
(function(root) {
  'use strict';

  // 台詞を書いたクイックのゲーム(quick.js の GAMES の id。全 50 本)。ゲームを足したら、ここと台詞を足す
  const GAMES = Object.freeze([
    'eat', 'dodge', 'catch', 'mash', 'clean', 'stop', 'swipe', 'medicine', 'find', 'charge', 'partner', 'season',
    'jump', 'pull', 'pet', 'button', 'flames', 'coins', 'cliff', 'throw', 'knock', 'wait', 'flee', 'mole', 'slice',
    'guard', 'bento', 'spin', 'lift', 'tickle', 'balance', 'color', 'count', 'bigger', 'odd', 'order', 'holdlid',
    'umbrella', 'shutter', 'sort', 'rhythm', 'trace', 'pushbox', 'fish', 'stack', 'pair', 'doors', 'sneak', 'feather',
    'weather'
  ]);
  // 最初に Pilot で書いた 8 本(結果の形がちがうものを選んだ。記録用。動きは全 50 本と同じ)
  const PILOT_GAMES = Object.freeze(['eat', 'dodge', 'mash', 'stop', 'wait', 'count', 'fish', 'stack']);
  const MOMENTS = Object.freeze(['perfect', 'zero', 'newBest', 'firstTime', 'bigCombo', 'close', 'endedBy', 'plain']);

  const P = text => Object.freeze({role:'pet', text});
  const T = text => Object.freeze({role:'them', text});
  // when: {modes, games?, moments, with?, trait?}
  //  - modes: 'solo'(1本ずつ)/ 'mix'(まぜた 20 本)
  //  - games: solo はそのゲーム、mix は「最後に失敗したゲーム」(endedBy のとき)。なしなら どのゲームでも
  //  - with: null(本人だけ)/ 'partner' / 'companion' / 'any'
  //  - trait: 'persistence+' のように、生まれつきの気質が高い(4〜5)/ 低い(1〜2)ときだけ候補に入る
  const unit = (id, when, beats) => Object.freeze({kind:'quick', id, games:null, with:null, trait:null, ...when, beats:Object.freeze(beats)});
  const SOLO = ['solo'], MIX = ['mix'], BOTH = ['solo', 'mix'];

  const UNITS = Object.freeze([
    // たべろ!
    unit('q-eat-full', {modes:SOLO, games:['eat'], moments:['perfect', 'newBest']}, [P('ぜんぶたべた'), P('ごちそうさまは、あとで言う')]),
    unit('q-eat-maybe', {modes:BOTH, games:['eat'], moments:['zero', 'plain', 'endedBy']}, [P('うんちは、たべてない'), P('……たぶん')]),
    unit('q-eat-chew', {modes:SOLO, games:['eat'], moments:['plain', 'bigCombo', 'close'], with:'any'}, [T('はやかったね'), P('かむのは、あとでやる')]),
    // よけろ!
    unit('q-dodge-polite', {modes:SOLO, games:['dodge'], moments:['perfect', 'newBest']}, [P('ぜんぶよけた'), P('うんちのほうが、気をつかってた')]),
    unit('q-dodge-wind', {modes:BOTH, games:['dodge'], moments:['zero', 'plain', 'endedBy']}, [P('いまの、むこうから来た')]),
    unit('q-dodge-catch', {modes:SOLO, games:['dodge'], moments:['plain', 'close', 'newBest'], trait:'boldness+'}, [P('次は、よけないで受けとめる')]),
    // れんだ!
    unit('q-mash-run', {modes:SOLO, games:['mash'], moments:['perfect', 'newBest', 'bigCombo']}, [P('ゆびが、まだ走ってる')]),
    unit('q-mash-tired', {modes:BOTH, games:['mash'], moments:['zero', 'plain', 'endedBy', 'close']}, [P('ボタンが、つかれたって')]),
    unit('q-mash-more', {modes:SOLO, games:['mash'], moments:['zero', 'plain', 'close'], trait:'persistence+'}, [P('もっとおせば、もっとおせる')]),
    // とめろ!
    unit('q-stop-done', {modes:SOLO, games:['stop'], moments:['perfect', 'newBest']}, [P('たこやき、ちょうどいいやけかた'), P('たべてないけど')]),
    unit('q-stop-heart', {modes:BOTH, games:['stop'], moments:['zero', 'plain', 'endedBy']}, [P('とめたよ。心の中で')]),
    unit('q-stop-early', {modes:SOLO, games:['stop'], moments:['close', 'plain'], with:'any'}, [T('おしかったね'), P('タイミングが、先に帰った')]),
    // まて!
    unit('q-wait-itch', {modes:BOTH, games:['wait'], moments:['zero', 'plain', 'endedBy']}, [P('まてって言われると'), P('うごきたくなる')]),
    unit('q-wait-pro', {modes:SOLO, games:['wait'], moments:['perfect', 'newBest']}, [P('なにもしないの、とくい')]),
    unit('q-wait-what', {modes:BOTH, games:['wait'], moments:['zero', 'plain', 'endedBy'], trait:'curiosity+'}, [P('まってたら、何が来たの?')]),
    // いくつ?
    unit('q-count-grow', {modes:BOTH, games:['count'], moments:['zero', 'plain', 'endedBy']}, [P('ほし、数えてたら'), P('数のほうがふえた')]),
    unit('q-count-fingers', {modes:SOLO, games:['count'], moments:['perfect', 'newBest']}, [P('ぜんぶ数えた'), P('ゆびは10本しかないのに')]),
    unit('q-count-lots', {modes:SOLO, games:['count'], moments:['plain', 'close'], with:'any'}, [T('いくつだった?'), P('いっぱい'), T('数字で')]),
    // つれ!
    unit('q-fish-early', {modes:BOTH, games:['fish'], moments:['zero', 'plain', 'endedBy']}, [P('はやすぎた'), P('魚、まだ着がえてた')]),
    unit('q-fish-face', {modes:SOLO, games:['fish'], moments:['perfect', 'newBest']}, [P('10ぴきつれた'), P('ぜんぶ同じ顔だった')]),
    unit('q-fish-rest', {modes:SOLO, games:['fish'], moments:['zero', 'plain'], trait:'persistence-'}, [P('魚にも、休けいは要る')]),
    // つめ!
    unit('q-stack-sky', {modes:SOLO, games:['stack'], moments:['perfect', 'newBest']}, [P('つみすぎて、空がせまい')]),
    unit('q-stack-lean', {modes:BOTH, games:['stack'], moments:['zero', 'plain', 'endedBy', 'close']}, [P('タワーが、ちょっとよりかかった')]),
    unit('q-stack-look', {modes:SOLO, games:['stack'], moments:['bigCombo', 'close', 'plain'], with:'any'}, [T('どこまでつむの?'), P('上の人が、こまるまで')]),
    // ---- 全員展開: のこりの 42 本 ----
    // つかまえろ!
    unit('q-catch-game', {modes:SOLO, games:['catch'], moments:['perfect', 'newBest']}, [P('ぜんぶつかまえた'), P('みんな、あそびだと思ってる')]),
    unit('q-catch-serious', {modes:BOTH, games:['catch'], moments:['zero', 'plain', 'endedBy']}, [P('なかまが、本気でにげてた'), P('おにごっこって、言ってないのに')]),
    unit('q-catch-love', {modes:SOLO, games:['catch'], moments:['plain', 'close'], with:'any'}, [T('なかま、にげてたね'), P('おいかけられるの、すきなんだって')]),
    // そうじしろ!
    unit('q-clean-shine', {modes:SOLO, games:['clean'], moments:['perfect', 'newBest']}, [P('ぜんぶふいた'), P('ゆかに、ぼくがうつってる')]),
    unit('q-clean-new', {modes:BOTH, games:['clean'], moments:['zero', 'plain', 'endedBy']}, [P('ふいたところに'), P('新しいのが来てた')]),
    unit('q-clean-look', {modes:SOLO, games:['clean'], moments:['zero', 'plain', 'close'], trait:'curiosity+'}, [P('ふく前に、ひと目見たかった')]),
    // スワイプ!
    unit('q-swipe-double', {modes:SOLO, games:['swipe'], moments:['perfect', 'newBest']}, [P('ぎゃくのぎゃくも、わかった')]),
    unit('q-swipe-whose', {modes:BOTH, games:['swipe'], moments:['zero', 'plain', 'endedBy']}, [P('みぎって、だれから見て?')]),
    unit('q-swipe-argue', {modes:SOLO, games:['swipe'], moments:['plain', 'close'], with:'any'}, [T('ゆび、まよってたね'), P('やじるしと、意見が合わなかった')]),
    // くすり!
    unit('q-medicine-mine', {modes:SOLO, games:['medicine'], moments:['perfect', 'newBest']}, [P('ぜんいん、のんだ'), P('ぼくのぶんは、ないの?')]),
    unit('q-medicine-almost', {modes:BOTH, games:['medicine'], moments:['zero', 'plain', 'endedBy']}, [P('くすり、ぼくがのみそうになった')]),
    unit('q-medicine-bitter', {modes:SOLO, games:['medicine'], moments:['plain', 'close'], with:'any'}, [T('とどかなかったね'), P('くすりが、にがいの知ってた')]),
    // さがせ!
    unit('q-find-relief', {modes:SOLO, games:['find'], moments:['perfect', 'newBest']}, [P('ぼくは、ぼくだった'), P('ちょっと安心した')]),
    unit('q-find-more', {modes:BOTH, games:['find'], moments:['zero', 'plain', 'endedBy']}, [P('ぼくに、にてる子がいた'), P('……ぼくより、ぼくっぽかった')]),
    unit('q-find-home', {modes:SOLO, games:['find'], moments:['perfect', 'plain', 'close'], trait:'curiosity+'}, [P('ほかのぼくたち、どこに帰るの?')]),
    // ためろ!
    unit('q-charge-green', {modes:SOLO, games:['charge'], moments:['perfect', 'newBest']}, [P('みどりの気持ちが、わかってきた')]),
    unit('q-charge-forgot', {modes:BOTH, games:['charge'], moments:['zero', 'plain', 'endedBy']}, [P('ためすぎて、はなしかたをわすれた')]),
    unit('q-charge-keep', {modes:SOLO, games:['charge'], moments:['zero', 'plain', 'close'], trait:'persistence+'}, [P('ためるのは、すき。はなすのが、にがて')]),
    // こいびとは?
    unit('q-partner-sure', {modes:SOLO, games:['partner'], moments:['perfect', 'newBest']}, [P('まちがえるわけない'), P('……ちょっと、まよった')]),
    unit('q-partner-sorry', {modes:BOTH, games:['partner'], moments:['zero', 'plain', 'endedBy']}, [P('いまの、ちがう人だった'), P('あとで、あやまっておく')]),
    unit('q-partner-bright', {modes:SOLO, games:['partner'], moments:['perfect', 'newBest', 'plain'], with:'partner'}, [T('ちゃんと、えらべた?'), P('まぶしいほうを、おした')]),
    // きせつは?
    unit('q-season-tan', {modes:SOLO, games:['season'], moments:['perfect', 'newBest']}, [P('きせつを、ぜんぶまわってきた'), P('ちょっと、日やけした')]),
    unit('q-season-scarf', {modes:BOTH, games:['season'], moments:['zero', 'plain', 'endedBy']}, [P('なつに、マフラーをえらんだ'), P('さむがりなので')]),
    unit('q-season-inside', {modes:SOLO, games:['season'], moments:['plain', 'close'], with:'any'}, [T('いまの、あきだよ'), P('ぼくの中では、まだなつ')]),
    // とべ!
    unit('q-jump-under', {modes:SOLO, games:['jump'], moments:['perfect', 'newBest']}, [P('いわは、ぜんぶ下を通った')]),
    unit('q-jump-eyes', {modes:BOTH, games:['jump'], moments:['zero', 'plain', 'endedBy']}, [P('いわと、目が合った'), P('ゆずってくれると思った')]),
    unit('q-jump-ride', {modes:SOLO, games:['jump'], moments:['perfect', 'plain', 'close'], trait:'boldness+'}, [P('次は、いわに乗ってみる')]),
    // ひっぱれ!
    unit('q-pull-lonely', {modes:SOLO, games:['pull'], moments:['perfect', 'newBest']}, [P('ぜんぶぬけた'), P('土が、さみしそう')]),
    unit('q-pull-back', {modes:BOTH, games:['pull'], moments:['zero', 'plain', 'endedBy']}, [P('ひっぱったら、むこうもひっぱった')]),
    unit('q-pull-what', {modes:SOLO, games:['pull'], moments:['plain', 'bigCombo', 'close'], with:'any'}, [T('なにをぬいてたの?'), P('ぬくまで、わからない')]),
    // なでろ!
    unit('q-pet-fluffy', {modes:SOLO, games:['pet'], moments:['perfect', 'newBest']}, [P('なですぎて、ゆびがふわふわ')]),
    unit('q-pet-tickle', {modes:BOTH, games:['pet'], moments:['zero', 'plain', 'endedBy']}, [P('なでるのが、はやすぎた'), P('くすぐってた')]),
    unit('q-pet-next', {modes:SOLO, games:['pet'], moments:['perfect', 'newBest', 'plain'], with:'companion'}, [T('つぎ、なでて'), P('ゲームに出たらね')]),
    // おせ!
    unit('q-button-friend', {modes:SOLO, games:['button'], moments:['perfect', 'newBest']}, [P('みどりとは、友だちになった')]),
    unit('q-button-red', {modes:BOTH, games:['button'], moments:['zero', 'plain', 'endedBy']}, [P('あかも、ちょっとみどりだった')]),
    unit('q-button-test', {modes:SOLO, games:['button'], moments:['zero', 'plain'], trait:'boldness+'}, [P('あかでおしたら、どうなるか見たかった')]),
    // けせ!
    unit('q-flames-whose', {modes:SOLO, games:['flames'], moments:['perfect', 'newBest']}, [P('ぜんぶけした'), P('……だれのたんじょうびだった?')]),
    unit('q-flames-wish', {modes:BOTH, games:['flames'], moments:['zero', 'plain', 'endedBy']}, [P('ねがいごと、考えてたら'), P('ろうそくが待ってくれなかった')]),
    unit('q-flames-again', {modes:SOLO, games:['flames'], moments:['perfect', 'newBest', 'plain'], with:'any'}, [T('ねがいごとは?'), P('もう一回、けしたい')]),
    // あつめろ!
    unit('q-coins-proud', {modes:SOLO, games:['coins'], moments:['perfect', 'newBest']}, [P('かごが、むねをはってる')]),
    unit('q-coins-gap', {modes:BOTH, games:['coins'], moments:['zero', 'plain', 'endedBy']}, [P('コインが、かごのすきまを知ってた')]),
    unit('q-coins-ground', {modes:SOLO, games:['coins'], moments:['zero', 'plain', 'close'], trait:'persistence-'}, [P('おちたぶんは、地面のぶん')]),
    // とまれ!
    unit('q-cliff-view', {modes:SOLO, games:['cliff'], moments:['perfect', 'newBest']}, [P('がけのはしっこ、ちょうどよかった'), P('けしきがいい')]),
    unit('q-cliff-beyond', {modes:BOTH, games:['cliff'], moments:['zero', 'plain', 'endedBy']}, [P('とまったよ。がけの先で')]),
    unit('q-cliff-peek', {modes:SOLO, games:['cliff'], moments:['perfect', 'plain', 'close'], trait:'boldness+'}, [P('もうちょっと先も、見たかった')]),
    // なげろ!
    unit('q-throw-mouth', {modes:SOLO, games:['throw'], moments:['perfect', 'newBest']}, [P('かごが、ずっと口をあけてた')]),
    unit('q-throw-stop', {modes:BOTH, games:['throw'], moments:['zero', 'plain', 'endedBy']}, [P('かご、うごくのやめてほしい'), P('ぼくはやめないけど')]),
    unit('q-throw-sky', {modes:SOLO, games:['throw'], moments:['close', 'bigCombo'], with:'any'}, [T('いまの、入りかけた?'), P('ボールは、ちゃんと空まで行った')]),
    // たたけ!
    unit('q-knock-door', {modes:SOLO, games:['knock'], moments:['perfect', 'newBest']}, [P('ドアのむこうも、ちょうどって言ってた')]),
    unit('q-knock-extra', {modes:BOTH, games:['knock'], moments:['zero', 'plain', 'endedBy']}, [P('一回、よけいにたたいた'), P('あいさつのつもりだった')]),
    unit('q-knock-more', {modes:SOLO, games:['knock'], moments:['perfect', 'plain', 'close'], trait:'persistence+'}, [P('たたきたりない')]),
    // にげろ!
    unit('q-flee-wave', {modes:SOLO, games:['flee'], moments:['perfect', 'newBest']}, [P('おばけ、さいごは手をふってた')]),
    unit('q-flee-toward', {modes:BOTH, games:['flee'], moments:['zero', 'plain', 'endedBy']}, [P('おばけのほうに、にげちゃった'), P('むこうも、こまってた')]),
    unit('q-flee-praise', {modes:SOLO, games:['flee'], moments:['perfect', 'newBest', 'plain'], trait:'boldness-'}, [P('にげるのは、ほめてほしい')]),
    // でたらたたけ!
    unit('q-mole-quiet', {modes:SOLO, games:['mole'], moments:['perfect', 'newBest']}, [P('あなから、もう出てこない'), P('あなの中で、会議してる')]),
    unit('q-mole-rumor', {modes:BOTH, games:['mole'], moments:['zero', 'plain', 'endedBy']}, [P('たたいたあなに、もういなかった'), P('うんちにも、うわさがある')]),
    unit('q-mole-tunnel', {modes:SOLO, games:['mole'], moments:['plain', 'close'], with:'any'}, [T('うんち、はやかったね'), P('となりのあなと、つながってる')]),
    // きれ!
    unit('q-slice-half', {modes:SOLO, games:['slice'], moments:['perfect', 'newBest']}, [P('くだもの、ぜんぶ半分'), P('のこり半分は、どこ?')]),
    unit('q-slice-round', {modes:BOTH, games:['slice'], moments:['zero', 'plain', 'endedBy']}, [P('くだもの、まるいままとんでった')]),
    unit('q-slice-juice', {modes:SOLO, games:['slice'], moments:['perfect', 'newBest', 'bigCombo'], with:'any'}, [T('いいにおいする'), P('ゆびが、ミックスジュース')]),
    // まもれ!
    unit('q-guard-what', {modes:SOLO, games:['guard'], moments:['perfect', 'newBest']}, [P('うんち、ひとつもとどかなかった'), P('まもったのは……なに?')]),
    unit('q-guard-address', {modes:BOTH, games:['guard'], moments:['zero', 'plain', 'endedBy']}, [P('うんちが、とどいた'), P('ちゃんと、あて先どおり')]),
    unit('q-guard-talk', {modes:SOLO, games:['guard'], moments:['plain', 'close'], trait:'sociability+'}, [P('うんちとも、話せばわかる')]),
    // つめろ!(おべんとう)
    unit('q-bento-lid', {modes:SOLO, games:['bento'], moments:['perfect','newBest']}, [P('ぜんぶつめた'), P('ふたが、ちょっときつい')]),
    unit('q-bento-half', {modes:BOTH, games:['bento'], moments:['zero','plain','endedBy']}, [P('おべんとうばこ、まだ半分おなかすいてる')]),
    unit('q-bento-spill', {modes:SOLO, games:['bento'], moments:['close','plain'], with:'any'}, [T('ひとつ、はみ出てたよ'), P('それは、あとでたべるぶん')]),
    // まわせ!(へんしん)
    unit('q-spin-me', {modes:SOLO, games:['spin'], moments:['perfect','newBest']}, [P('まわしすぎて、ぼくがへんしんしそう')]),
    unit('q-spin-egg', {modes:BOTH, games:['spin'], moments:['zero','plain','endedBy']}, [P('まるのつもりが、たまごになった')]),
    unit('q-spin-dizzy', {modes:SOLO, games:['spin'], moments:['zero','plain','close'], trait:'persistence+'}, [P('まだまわせる。ゆびは目がまわらない')]),
    // もちあげろ!(だっこ)
    unit('q-lift-arm', {modes:SOLO, games:['lift'], moments:['perfect','newBest']}, [P('だっこ、ぜんぶせいこう'), P('うでが、ちょっとのびた')]),
    unit('q-lift-sit', {modes:BOTH, games:['lift'], moments:['zero','plain','endedBy']}, [P('もちあげようとしたら'), P('むこうが、すわりこんだ')]),
    unit('q-lift-me', {modes:SOLO, games:['lift'], moments:['perfect','newBest','plain'], with:'partner'}, [T('だっこ、されたい'), P('つぎのクイックに出て')]),
    // くすぐれ!(じゃれる)
    unit('q-tickle-back', {modes:SOLO, games:['tickle'], moments:['perfect','newBest']}, [P('くすぐってたら'), P('こっちまで、くすぐったい')]),
    unit('q-tickle-navel', {modes:BOTH, games:['tickle'], moments:['zero','plain','endedBy']}, [P('はずした。おへそが、にげた')]),
    unit('q-tickle-hello', {modes:SOLO, games:['tickle'], moments:['plain','close','perfect'], trait:'sociability+'}, [P('くすぐるのは、なかよしのあいさつ')]),
    // バランス!
    unit('q-balance-hat', {modes:SOLO, games:['balance'], moments:['perfect','newBest']}, [P('ボール、ずっとあたまの上'), P('もう、ぼうしかもしれない')]),
    unit('q-balance-bored', {modes:BOTH, games:['balance'], moments:['zero','plain','endedBy']}, [P('ボールが、あたまにあきた')]),
    unit('q-balance-world', {modes:SOLO, games:['balance'], moments:['close','plain'], with:'any'}, [T('ゆれてたね'), P('ゆれてたのは、せかいのほう')]),
    // いろは?
    unit('q-color-eyes', {modes:SOLO, games:['color'], moments:['perfect','newBest']}, [P('いわれたいろ、ぜんぶ見つけた'), P('目が、ちょっとカラフル')]),
    unit('q-color-apple', {modes:BOTH, games:['color'], moments:['zero','plain','endedBy']}, [P('あかって言われて'), P('りんごをさがしてた')]),
    unit('q-color-between', {modes:SOLO, games:['color'], moments:['plain','close','perfect'], trait:'curiosity+'}, [P('みどりとあおのあいだ、名前ある?')]),
    // おおきいほう!
    unit('q-bigger-rule', {modes:SOLO, games:['bigger'], moments:['perfect','newBest']}, [P('おおきいほうを、ずっとえらんだ'), P('よくばりじゃない。ルール')]),
    unit('q-bigger-tasty', {modes:BOTH, games:['bigger'], moments:['zero','plain','endedBy']}, [P('ちいさいほうが、おいしそうだった')]),
    unit('q-bigger-both', {modes:SOLO, games:['bigger'], moments:['plain','close','perfect'], with:'any'}, [T('どっちもたべたら?'), P('それは、べつのゲーム')]),
    // ちがうの!
    unit('q-odd-look', {modes:SOLO, games:['odd'], moments:['perfect','newBest']}, [P('ちがうの、すぐわかった'), P('なんか、こっち見てたから')]),
    unit('q-odd-all', {modes:BOTH, games:['odd'], moments:['zero','plain','endedBy']}, [P('ぜんぶ、ちょっとずつちがって見えた')]),
    unit('q-odd-friend', {modes:SOLO, games:['odd'], moments:['plain','perfect','close'], trait:'sociability-'}, [P('ひとりだけちがうの、なかまかも')]),
    // じゅんばんに!(ふうせん)
    unit('q-order-line', {modes:SOLO, games:['order'], moments:['perfect','newBest']}, [P('じゅんばん、まもった'), P('ふうせんも、ならぶのがうまい')]),
    unit('q-order-hand', {modes:BOTH, games:['order'], moments:['zero','plain','endedBy']}, [P('3のふうせんが、さきに手をあげた')]),
    unit('q-order-free', {modes:SOLO, games:['order'], moments:['close','plain'], with:'any'}, [T('とちゅうまで、じゅんばんだった'), P('とちゅうから、じゆう')]),
    // おさえろ!(びっくりばこ)
    unit('q-holdlid-nap', {modes:SOLO, games:['holdlid'], moments:['perfect','newBest']}, [P('ふた、ずっとおさえてた'), P('中の人、たぶんねた')]),
    unit('q-holdlid-hello', {modes:BOTH, games:['holdlid'], moments:['zero','plain','endedBy']}, [P('はなしたら、こんにちはされた')]),
    unit('q-holdlid-peek', {modes:SOLO, games:['holdlid'], moments:['perfect','newBest','plain'], trait:'curiosity+'}, [P('ほんとは、ちょっとあけたかった')]),
    // かさ!
    unit('q-umbrella-dry', {modes:SOLO, games:['umbrella'], moments:['perfect','newBest']}, [P('ぜんぶ、ぬれなかった'), P('かさは、ちょっとぬれた')]),
    unit('q-umbrella-sky', {modes:BOTH, games:['umbrella'], moments:['zero','plain','endedBy']}, [P('はやすぎた。そらが、まだまよってた')]),
    unit('q-umbrella-wet', {modes:SOLO, games:['umbrella'], moments:['zero','plain','close'], trait:'boldness+'}, [P('ぬれるのも、わるくない')]),
    // とれ!(しゃしん)
    unit('q-shutter-album', {modes:SOLO, games:['shutter'], moments:['perfect','newBest']}, [P('しゃしん、ぜんぶわくの中'), P('アルバムが、ちょっとおもい')]),
    unit('q-shutter-tail', {modes:BOTH, games:['shutter'], moments:['zero','plain','endedBy']}, [P('とれたのは、しっぽだけ')]),
    unit('q-shutter-blur', {modes:SOLO, games:['shutter'], moments:['plain','close'], with:'any'}, [T('いいの、とれた?'), P('ぶれてるのが、いちばん速そう')]),
    // わけろ!
    unit('q-sort-right', {modes:SOLO, games:['sort'], moments:['perfect','newBest']}, [P('ごはんはひだり。ぜんぶ'), P('みぎは、見ないことにする')]),
    unit('q-sort-swap', {modes:BOTH, games:['sort'], moments:['zero','plain','endedBy']}, [P('ひだりとみぎ、とちゅうで入れかわった')]),
    unit('q-sort-onebox', {modes:SOLO, games:['sort'], moments:['zero','plain','close'], trait:'persistence-'}, [P('ひとつのはこに、まとめたらだめ?')]),
    // リズム!
    unit('q-rhythm-echo', {modes:SOLO, games:['rhythm'], moments:['perfect','newBest']}, [P('おんぷ、ひとつものこさなかった'), P('あたまの中で、まだ鳴ってる')]),
    unit('q-rhythm-behind', {modes:BOTH, games:['rhythm'], moments:['zero','plain','endedBy']}, [P('ぼくのリズム、ちょっとうしろにいた')]),
    unit('q-rhythm-ride', {modes:SOLO, games:['rhythm'], moments:['bigCombo','close'], with:'any'}, [T('のってたね'), P('のってた。おりかたがわからない')]),
    // なぞれ!
    unit('q-trace-shape', {modes:SOLO, games:['trace'], moments:['perfect','newBest']}, [P('ぜんぶつないだ'), P('なにかの形に、なりかけてた')]),
    unit('q-trace-lost', {modes:BOTH, games:['trace'], moments:['zero','plain','endedBy']}, [P('てんとてんのあいだで、まよった')]),
    unit('q-trace-ask', {modes:SOLO, games:['trace'], moments:['plain','close','perfect'], with:'any'}, [T('なにをかいてたの?'), P('それは、てんに聞いて')]),
    // おしだせ!
    unit('q-pushbox-quiet', {modes:SOLO, games:['pushbox'], moments:['perfect','newBest']}, [P('はこ、はしまでおした'), P('はこは、何も言わなかった')]),
    unit('q-pushbox-here', {modes:BOTH, games:['pushbox'], moments:['zero','plain','endedBy']}, [P('はこが、ここが好きだって')]),
    unit('q-pushbox-mood', {modes:SOLO, games:['pushbox'], moments:['close','plain'], with:'any'}, [T('もうちょっとだったね'), P('はこにも、きぶんがある')]),
    // おなじの!
    unit('q-pair-twins', {modes:SOLO, games:['pair'], moments:['perfect','newBest']}, [P('おなじの、すぐ見つかった'), P('ふたごは、目立つ')]),
    unit('q-pair-guess', {modes:BOTH, games:['pair'], moments:['zero','plain','endedBy']}, [P('おなじのは、ぼくの気のせいだった')]),
    unit('q-pair-us', {modes:SOLO, games:['pair'], moments:['perfect','newBest','plain'], with:'partner'}, [T('ふたりも、おなじ?'), P('……ちがうところがいい')]),
    // どっち?
    unit('q-doors-hum', {modes:SOLO, games:['doors'], moments:['perfect','newBest']}, [P('ドアがいれかわっても'), P('はなうたが、もれてた')]),
    unit('q-doors-search', {modes:BOTH, games:['doors'], moments:['zero','plain','endedBy']}, [P('ちがうドアだった'), P('むこうも、ぼくをさがしてた')]),
    unit('q-doors-onpurpose', {modes:SOLO, games:['doors'], moments:['perfect','newBest','plain'], with:'partner'}, [T('すぐ見つけてくれたね'), P('かくれるの、へただもん'), T('……わざとだよ')]),
    // そっとはこべ!
    unit('q-sneak-sleepy', {modes:SOLO, games:['sneak'], moments:['perfect','newBest']}, [P('そっとはこんだ'), P('ぼくまで、ねむくなった')]),
    unit('q-sneak-dream', {modes:BOTH, games:['sneak'], moments:['zero','plain','endedBy']}, [P('はやすぎて、ゆめがこぼれた')]),
    unit('q-sneak-itchy', {modes:SOLO, games:['sneak'], moments:['zero','plain','close'], trait:'boldness+'}, [P('そっとするの、からだがむずむずする')]),
    // ふけ!(はね)
    unit('q-feather-sky', {modes:SOLO, games:['feather'], moments:['perfect','newBest']}, [P('はね、ずっと空にいた'), P('ぼくのいき、けっこう強い')]),
    unit('q-feather-sit', {modes:BOTH, games:['feather'], moments:['zero','plain','endedBy']}, [P('はねが、ゆかにすわった')]),
    unit('q-feather-finger', {modes:SOLO, games:['feather'], moments:['close','plain'], with:'any'}, [T('ゆびで、ふいてたの?'), P('ゆびのいきは、見えないだけ')]),
    // てんきは?
    unit('q-weather-tomorrow', {modes:SOLO, games:['weather'], moments:['perfect','newBest']}, [P('てんき、ぜんぶ合わせた'), P('あしたのも、まかせて')]),
    unit('q-weather-just', {modes:BOTH, games:['weather'], moments:['zero','plain','endedBy']}, [P('はれって言われて、かさ持った'), P('ねんのため')]),
    unit('q-weather-cloudy', {modes:SOLO, games:['weather'], moments:['plain','close','perfect'], trait:'curiosity+'}, [P('くもりの日は、どれをえらぶの?')]),
    // まぜた 20 本
    unit('q-mix-perfect', {modes:MIX, moments:['perfect']}, [P('20こぜんぶ'), P('……いまの、だれがやったの?')]),
    unit('q-mix-auto', {modes:MIX, moments:['bigCombo']}, [P('とちゅうから、ゆびが勝手にやってた')]),
    unit('q-mix-follow', {modes:MIX, moments:['newBest'], with:'any'}, [T('きろくだね'), P('きろくのほうが、ついてきた')]),
    unit('q-mix-eyes', {modes:MIX, moments:['firstTime']}, [P('はやい。目がまだ前のゲームにいる')]),
    unit('q-mix-talk', {modes:MIX, moments:['plain', 'close']}, [P('指示が、ちょっと早口だった')]),
    unit('q-mix-sorry', {modes:MIX, moments:['plain', 'close'], with:'partner'}, [T('いっしょにやりたかった'), P('ゆびが一本、あいてるよ')]),
    // どれでも
    unit('q-any-practice', {modes:BOTH, moments:['zero']}, [P('いまのは、れんしゅう'), P('本番は、まだ')]),
    unit('q-any-almost', {modes:BOTH, moments:['close']}, [P('あとちょっとは、ほぼできた')]),
    unit('q-any-again', {modes:BOTH, moments:['zero', 'plain', 'close'], trait:'persistence+'}, [P('あと一回。いまのは、なし')]),
    unit('q-any-fingers', {modes:BOTH, moments:['zero', 'plain'], trait:'persistence-'}, [P('ゆびが、きょうは休みたいって')]),
  ]);

  // quick.js の結果(onRunEnd の stats)と、その回の前の記録から、できごとを読む。判定は変えない(読むだけ)
  // stats: {cleared, total, maxCombo, lives, solo, lastMiss}
  // prev: {runs, best}(solo はそのゲームの 1本ずつの記録、mix はまぜた 20 本の記録。この回を足す前)
  function moments(stats, prev) {
    const s = stats || {}, p = prev || {runs:0, best:0};
    const total = Number(s.total) || 0, cleared = Number(s.cleared) || 0;
    const out = [];
    if (total && cleared >= total) out.push('perfect');
    if (cleared === 0) out.push('zero');
    if (p.runs > 0 && cleared > (p.best || 0)) out.push('newBest');
    if (!p.runs) out.push('firstTime');
    if (cleared < total && (Number(s.maxCombo) || 0) >= (s.solo ? 6 : 8)) out.push('bigCombo');
    if (total && cleared < total && cleared >= total - 2) out.push('close');
    if (!s.solo && s.lives <= 0 && s.lastMiss) out.push('endedBy');
    // 最後に失敗したゲーム・はじめての回は「おまけ」のきっかけ。ほかにできごとがなければ、ふつうの結果としても読む
    if (!out.some(m => m !== 'endedBy' && m !== 'firstTime')) out.push('plain');
    return out;
  }

  // 生まれつきの気質(individuality の temperament 1〜5)を、高い/低いの印に
  function traitMatches(trait, temperament) {
    if (!trait) return true;
    const m = /^([a-z]+)([+-])$/.exec(trait);
    if (!m || !temperament) return false;
    const v = Number(temperament[m[1]]);
    if (!Number.isFinite(v)) return false;
    return m[2] === '+' ? v >= 4 : v <= 2;
  }
  // そのゲームの台詞があるか(solo はそのゲーム、mix はいつでも)
  function covers(mode, soloId) {
    return mode === 'mix' || (mode === 'solo' && GAMES.includes(soloId));
  }
  // ctx: {mode, soloId, lastMiss, moments, visitorKind, visitorQuiet, temperament}
  function candidates(ctx) {
    const c = ctx || {};
    if (!covers(c.mode, c.soloId)) return [];
    const moments = new Set(c.moments || []);
    // solo はそのゲーム。mix は最後に失敗したゲーム(endedBy のときだけ、そのゲームの台詞を使う)
    const gameId = c.mode === 'solo' ? c.soloId : (moments.has('endedBy') ? c.lastMiss : null);
    return UNITS.filter(u => {
      if (!u.modes.includes(c.mode)) return false;
      if (!u.moments.some(m => moments.has(m))) return false;
      if (u.games) {
        if (!gameId || !u.games.includes(gameId)) return false;
        if (c.mode === 'mix' && !u.moments.includes('endedBy')) return false;
      }
      if (!traitMatches(u.trait, c.temperament)) return false;
      if (u.with) {
        if (!c.visitorKind || c.visitorQuiet) return false;   // 寡黙な相手は、ゲームの話に乗ってこない
        if (u.with !== 'any' && u.with !== c.visitorKind) return false;
      }
      return true;
    });
  }
  // できごとが「話のきっかけになる」ものか(ふつうの結果より少し話しやすい)。
  // 最後に失敗したゲームは、そのゲームの台詞があるときだけ数える
  function isNotable(list, lastMiss) {
    return (list || []).some(m => m !== 'plain' && (m !== 'endedBy' || GAMES.includes(lastMiss)));
  }

  function validate(gameIds) {
    const problems = [], ids = new Set();
    const text = (where, t) => {
      if (typeof t !== 'string' || !t.trim()) problems.push(`${where}: empty`);
      else if (/[ 　]/.test(t)) problems.push(`${where}: spaces`);
      else if ([...t].length > 22) problems.push(`${where}: too long`);
    };
    if (gameIds) for (const g of GAMES) if (!gameIds.includes(g)) problems.push(`${g}: not a quick game`);
    for (const u of UNITS) {
      if (ids.has(u.id)) problems.push(`${u.id}: duplicate`); ids.add(u.id);
      if (!u.modes.length || u.modes.some(m => m !== 'solo' && m !== 'mix')) problems.push(`${u.id}: modes`);
      if (u.games && (!u.games.length || u.games.some(g => !GAMES.includes(g)))) problems.push(`${u.id}: games`);
      if (!u.moments.length || u.moments.some(m => !MOMENTS.includes(m))) problems.push(`${u.id}: moments`);
      if (u.with && !['partner', 'companion', 'any'].includes(u.with)) problems.push(`${u.id}: with`);
      if (u.trait && !/^(curiosity|boldness|sociability|persistence)[+-]$/.test(u.trait)) problems.push(`${u.id}: trait`);
      if (u.beats.length < 1 || u.beats.length > 3) problems.push(`${u.id}: beats`);
      u.beats.forEach((b, i) => {
        text(`${u.id}[${i}]`, b.text);
        if (b.role !== 'pet' && b.role !== 'them') problems.push(`${u.id}[${i}]: role`);
        if (b.role === 'them' && !u.with) problems.push(`${u.id}[${i}]: a visitor line needs a visitor`);
      });
    }
    return problems;
  }

  const api = {GAMES, PILOT_GAMES, MOMENTS, UNITS, moments, candidates, covers, isNotable, traitMatches, validate, VERSION:1};
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NaotocchiConversationQuick = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
