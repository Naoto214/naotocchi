// Conversation v2 Pilot — 掛け合い(本人⇄来ている相手)と、プレイヤーへの選択肢つき問いかけ。
// 台詞のデータと、候補を絞るだけの純関数。DOM・セーブ・タイマー・乱数は持たない。
// いつ・どれを出すかは script.js と Conversation Director が決める。
// 文章は docs/TEXT_STYLE.md と既存会話監査の Conversation DNA に合わせる(真顔・短い・半歩ずれ)。
// 設計: docs/design/conversation-v2-pilot-2026-10-22.md
(function(root) {
  'use strict';

  // role: 'pet' = 本人、'them' = いま家に来ている こいびと / なかま
  const beat = (role, text) => Object.freeze({role, text});
  const P = text => beat('pet', text);
  const T = text => beat('them', text);
  // with: 'partner:<id>' / 'companion:<id>' はその相手だけ。'partner' / 'companion' はその種類の誰でも(寡黙なキャラは除く)
  const banter = (id, withKey, ...beats) => Object.freeze({id, with:withKey, beats:Object.freeze(beats)});

  const BANTERS = Object.freeze([
    // こいびと(各キャラの性質のフィルタで返す)
    banter('b-octopus-hands', 'partner:rock_octopus', T('手、あいてる?'), P('二本ともあいてる'), T('少ないね')),
    banter('b-octopus-snack', 'partner:rock_octopus', T('おやつ、8つに分けといた'), P('食べるの、ぼくひとりだよ'), T('じゃあ8回食べて')),
    banter('b-snowman-hug', 'partner:snowman', P('ぎゅってしていい?'), T('3秒までなら形を保てる'), P('数えるの、ゆっくりでいい?')),
    banter('b-cactus-hand', 'partner:oasis_cactus', P('手つなごう'), T('つないだつもりで歩こう'), P('いま、ちょっと強くにぎった?')),
    banter('b-croc-passing', 'partner:swamp_croc', T('……べつに会いに来たわけじゃない'), P('じゃあ何しに来たの?'), T('……通りかかった。三回')),
    banter('b-gorilla-flower', 'partner:gentle_gorilla', T('この花、どう持てばいい?'), P('ふつうに'), T('ふつうがいちばん難しい')),
    banter('b-eagle-flight', 'partner:high_eagle', P('きょう、何してたの?'), T('……飛んでた'), P('どこまで?'), T('……ここまで')),
    banter('b-scorpion-water', 'partner:desert_scorpion', T('……水'), P('くれるの?'), T('……置いとく')),
    banter('b-robot-glad', 'partner:robot_neighbor', P('いま、うれしい?'), T('確認しています'), P('……まだ?'), T('うれしいので処理が遅れています')),
    banter('b-cat-meeting', 'partner:cat_ceo', P('お仕事は?'), T('いま会議中'), P('どこで?'), T('ここ。きみが議長')),
    banter('b-goat-above', 'partner:cliff_goat', P('どこから来たの?'), T('上から'), P('上には何もないよ'), T('だから近かった')),
    banter('b-sunflower-sun', 'partner:sunflower_partner', P('太陽、あっちだよ'), T('知ってる。こっちを向いてるだけ')),
    banter('b-angler-light', 'partner:anglerfish', T('ちょっと電気、消していい?'), P('いま、昼だよ'), T('じゃあ目をつぶってて')),
    banter('b-cow-grass', 'partner:field_cow', T('草、持ってきたよ'), P('ぼく、草は食べないよ'), T('知ってる。毎年持ってくる')),
    banter('b-deer-seat', 'partner:grove_deer', T('……そこ、座っていい?'), P('となり、あいてるよ'), T('じゃあ、そのとなりのとなり')),
    banter('b-mermaid-walk', 'partner:sea_mermaid', T('歩くって、毎回ころばない練習?'), P('……言われると、そうかも')),
    banter('b-bear-chair', 'partner:forest_bear', T('ここ、座っていい?'), P('いいよ'), T('……いすが、いいよって言ってない')),
    // なかま
    banter('b-snail-ahead', 'companion:snail', T('先に行ってるね!'), P('まだここにいるよ'), T('気持ちは、もう着いた')),
    banter('b-clock-time', 'companion:clock', P('いま何時?'), T('だいたい、きのうのつづき')),
    banter('b-box-inside', 'companion:box', P('なか、何が入ってるの?'), T('……ただのはこです'), P('答えになってないよ'), T('……なってないのが中身です')),
    banter('b-statue-moved', 'companion:sekizou', P('いま、動いた?'), T('……見てたなら、動いてない')),
    banter('b-parrot-morning', 'companion:parrot', P('おはよう'), T('おはよう!……いまのは自分で考えた')),
    banter('b-hamster-cheek', 'companion:hamster', P('おやつ、あるよ'), T('右に入れて。左は予約でいっぱい')),
    banter('b-owl-late', 'companion:owl', P('夜ふかし?'), T('昼ふかし')),
    banter('b-fox-tails', 'companion:many_tail_fox', P('しっぽ、何本?'), T('数えてるあいだに一本ふえる'), P('じゃあ、数えないでおく'), T('……それはそれで減る気がする')),
    banter('b-watcher-known', 'companion:watcher', T('……さっきから見てる'), P('知ってるよ'), T('……知られてたの、はじめて')),
    banter('b-monkey-copy', 'companion:monkey', P('まねしないで'), T('まねしないで'), P('ずるい'), T('ずるい')),
    // ---- 全員展開: こいびと(全員 3 件以上) ----
    // ねこ社長
    banter('b-cat-phone', 'partner:cat_ceo', T('電話、切ってきた'), P('かかってきたら?'), T('ふつうのねこのふりをする')),
    banter('b-cat-nap', 'partner:cat_ceo', P('ねむそうだね'), T('ひるねも業務のうち'), P('どこの業務?'), T('ねこの')),
    // ロボット
    banter('b-robot-fan', 'partner:robot_neighbor', P('いま、わらった?'), T('ファンの音です'), P('……ほんとに?'), T('……わらうと、ファンが回ります')),
    banter('b-robot-charge', 'partner:robot_neighbor', T('ここで充電してもいいですか'), P('コンセント、あっちだよ'), T('いえ。ここのほうが早くたまります')),
    banter('b-robot-lonely', 'partner:robot_neighbor', T('きのう、さびしいを覚えました'), P('いつ?'), T('帰りにドアをしめたとき')),
    // うしさん
    banter('b-cow-chew', 'partner:field_cow', P('いま、何か言った?'), T('きのうの話を、かんでるとこ'), P('……で?'), T('あしたには、言えるよ')),
    banter('b-cow-halfplan', 'partner:field_cow', T('きょうは何か、半分こしよう'), P('何を?'), T('まだ決めてない。半分だけ決めた')),
    // ひまわりさん
    banter('b-sunflower-turn', 'partner:sunflower_partner', P('ちょっと、むこう向いてて'), T('……向いた'), P('こっち見てるよ'), T('首が、話を聞いてない')),
    banter('b-sunflower-seeds', 'partner:sunflower_partner', T('たね、とれたよ'), P('いくつ?'), T('数えたら、ぜんぶこっち向いてた')),
    banter('b-sunflower-cloudy', 'partner:sunflower_partner', P('くもりの日は、元気ない?'), T('ううん。迷わなくていい日')),
    // クマさん
    banter('b-bear-door', 'partner:forest_bear', T('ドア、ちょっと小さいね'), P('ごめんね'), T('ううん。こっちが少し大きいだけ')),
    banter('b-bear-bite', 'partner:forest_bear', T('はちみつ、ひとくちどうぞ'), P('……ひとくちが大きい'), T('クマのひとくちだから')),
    banter('b-bear-alarm', 'partner:forest_bear', P('冬は、ずっとねむるの?'), T('うん。でも、目覚ましはかけてる'), P('なんで?'), T('きみに会う日のぶん')),
    // シカ
    banter('b-deer-step', 'partner:grove_deer', T('きのうより、ひとあし近い'), P('はかってるの?'), T('……毎日、はかってる')),
    banter('b-deer-sneeze', 'partner:grove_deer', P('くしゅん'), T('……っ'), P('あれ、どこ行ったの?'), T('……びっくりして、外。もどるね')),
    // ヤギさん
    banter('b-goat-ceiling', 'partner:cliff_goat', P('天井のすみで、何してるの?'), T('ながめがいい'), P('ぼくしか見えないよ'), T('うん。いいながめ')),
    banter('b-goat-stairs', 'partner:cliff_goat', T('階段って、ずるいね'), P('どこが?'), T('足を置くとこ、ぜんぶ決めてある')),
    // ワシ(寡黙)
    banter('b-eagle-window', 'partner:high_eagle', P('窓から来たの?'), T('……開いてた'), P('しめてたはずだよ'), T('……開いた')),
    banter('b-eagle-gift', 'partner:high_eagle', T('……ん'), P('それ、くれるの?'), T('……落ちてた。山のてっぺんに')),
    banter('b-eagle-dot', 'partner:high_eagle', P('ぼく、上から見えた?'), T('……点'), P('点かあ'), T('……いちばん、いい点')),
    // ゆきのせいれい
    banter('b-snowsp-photo', 'partner:snow_spirit', P('むかしの写真、見て'), T('わたし、どれも同じ顔'), P('ぼくだけ、育ってる'), T('だから、日付はきみで見てる')),
    banter('b-snowsp-flake', 'partner:snow_spirit', T('手、出して'), P('つめたい'), T('雪をひとつぶ、あずけた'), P('……もう、とけちゃった')),
    banter('b-snowsp-again', 'partner:snow_spirit', P('ずっと、かわらないね'), T('きみは、ちょっとずつかわる'), P('へん?'), T('ううん。毎回、会いなおせる')),
    banter('b-snowsp-season', 'partner:snow_spirit', T('いまの季節、なに?'), P('秋だよ'), T('それって、どんな雪?')),
    // ゆきだるま
    banter('b-snowman-tea', 'partner:snowman', P('お茶、いる?'), T('冷めるまで待つ'), P('どれくらい?'), T('冬まで')),
    banter('b-snowman-nose', 'partner:snowman', T('鼻、まがってない?'), P('ちょっとだけ'), T('じゃあ、きょうはそういう顔')),
    // タコさん
    banter('b-octopus-ink', 'partner:rock_octopus', T('いま、見てた?'), P('うん'), T('……すみ、出ちゃった')),
    banter('b-octopus-chores', 'partner:rock_octopus', T('そうじと洗たく、お茶もいれた'), P('……いつ来たの?'), T('いま')),
    // にんぎょ
    banter('b-mermaid-stairs', 'partner:sea_mermaid', T('この坂、ぎざぎざだね'), P('階段っていうの'), T('波が、かたまったみたい')),
    banter('b-mermaid-rain', 'partner:sea_mermaid', P('かさ、さす?'), T('雨って、上から来る海?'), P('……そうかも'), T('じゃあ、さしたらもったいない')),
    // チョウチンアンコウ
    banter('b-angler-curtain', 'partner:anglerfish', P('カーテン、あけるね'), T('まって'), P('どうしたの?'), T('……まだ、顔の準備が')),
    banter('b-angler-night', 'partner:anglerfish', T('夜になった。となり、行くね'), P('昼も、となりにいたよ'), T('昼のは、ちょっと遠いとなり')),
    banter('b-angler-blush', 'partner:anglerfish', P('その灯り、自分で消せるの?'), T('照れると、勝手につく'), P('いま、ついてるよ'), T('……知ってる')),
    // ワニさん(寡黙)
    banter('b-croc-flower', 'partner:swamp_croc', T('……ほら'), P('その花、なに?'), T('……口に、はさまってた')),
    banter('b-croc-tail', 'partner:swamp_croc', P('しっぽ、ゆれてるよ'), T('……風'), P('へやの中だよ'), T('……へやの風')),
    // ゴリラ
    banter('b-gorilla-cup', 'partner:gentle_gorilla', T('コップ、どこに置けばいい?'), P('そこでいいよ'), T('……置く音、うるさくない?'), P('まだ置いてないよ')),
    banter('b-gorilla-knock', 'partner:gentle_gorilla', P('いつから玄関にいたの?'), T('ノックはした'), P('きこえなかったよ'), T('そっとしすぎて、ドアも気づいてない')),
    // クモさん
    banter('b-spider-trail', 'partner:knitting_spider', P('糸、ここにも落ちてた'), T('それ、帰り道'), P('え?'), T('たどると、うちに着く')),
    banter('b-spider-scarf', 'partner:knitting_spider', T('マフラーあんだ。ふたり用'), P('ながすぎない?'), T('けんかしても、とどく長さ')),
    banter('b-spider-legs', 'partner:knitting_spider', P('あみもの、手伝える?'), T('足、何本ある?'), P('……2本'), T('じゃあ、応援係')),
    banter('b-spider-mend', 'partner:knitting_spider', P('くつした、穴があいちゃった'), T('見せて'), P('……あれ、穴がない'), T('話してるうちに、ふさいだ')),
    // サソリさん(寡黙)
    banter('b-scorpion-shade', 'partner:desert_scorpion', P('あつくない?'), T('……'), P('かげ、つくってくれてる?'), T('……たまたま、立ってる')),
    banter('b-scorpion-tail', 'partner:desert_scorpion', P('しっぽ、こわいって言われる?'), T('……言われる'), P('ぼくは平気だよ'), T('……知ってる。だから来る')),
    // サボテンさん
    banter('b-cactus-photo', 'partner:oasis_cactus', T('写真、とろう'), P('もっとくっつく?'), T('ううん。画面の中でくっつけて')),
    banter('b-cactus-count', 'partner:oasis_cactus', P('とげ、何本あるの?'), T('数えたことない'), P('数えていい?'), T('……近いから、だめ')),
    // ---- 全員展開: なかま(全員 3 件以上) ----
    // ねこ
    banter('b-cat-come', 'companion:cat_friend', P('おいで'), T('……いま、毛づくろい中'), P('じゃあ、ぼくが行く'), T('来るなら、ちょっとどく')),
    banter('b-cat-box', 'companion:cat_friend', P('その箱、ちいさくない?'), T('入れたから、ちょうどいい')),
    banter('b-cat-bed', 'companion:cat_friend', P('きょう、どこで寝るの?'), T('決めてない。寝たところ')),
    // うさぎ
    banter('b-rabbit-back', 'companion:rabbit_friend', T('ただいま!'), P('いま来たばっかりでしょ'), T('一回、あっちまで行ってきた')),
    banter('b-rabbit-slow', 'companion:rabbit_friend', P('ゆっくりでいいよ'), T('ゆっくりって、どっち向き?')),
    banter('b-rabbit-cross', 'companion:rabbit_friend', T('いま、横切ったの見た?'), P('見てない'), T('もう一回やる')),
    // たぬき
    banter('b-tanuki-hold', 'companion:tanuki', P('なにか隠してない?'), T('隠してない。……これは、持ってるだけ')),
    banter('b-tanuki-sock', 'companion:tanuki', T('ヒツジに、くつした一枚まぜてきた'), P('どこに?'), T('ふわふわの中。まだ気づいてない')),
    banter('b-tanuki-face', 'companion:tanuki', T('知らない顔、うまくなった?'), P('なにしたの?'), T('ほら、うまい')),
    // リス
    banter('b-squirrel-road', 'companion:squirrel', T('どんぐり、持ってきた!'), P('手、からっぽだよ'), T('……来る道に、ぜんぶ置いてきた')),
    banter('b-squirrel-dig', 'companion:squirrel', P('なにさがしてるの?'), T('きのう埋めたところ'), P('ここ、家の中だよ'), T('だれかが上に家を建てた')),
    banter('b-squirrel-tail', 'companion:squirrel', T('しっぽに何か入ってない?'), P('どんぐりがひとつ'), T('よかった。それ、あしたの分')),
    // カワウソ
    banter('b-otter-stone', 'companion:otter', T('この石、あげる'), P('ありがとう。何に使うの?'), T('転がして、返してもらう')),
    banter('b-otter-ball', 'companion:otter', P('それ、ぼくのボールだよ'), T('いま転がってるから、まだだれのでもない')),
    banter('b-otter-name', 'companion:otter', T('この石の名前、きめて'), P('……いし'), T('いいね。こっちは、いし二号')),
    // パンダ
    banter('b-panda-awake', 'companion:panda', P('起きてる?'), T('食べてる'), P('目、とじてるよ'), T('食べながら寝てる')),
    banter('b-panda-go', 'companion:panda', P('あそびに行こう'), T('ぼくの分まで、行ってきて')),
    banter('b-panda-last', 'companion:panda', T('ささ、もう一本ある?'), P('さっきので最後だよ'), T('なら、寝てから考える')),
    // ヒツジ
    banter('b-sheep-lean', 'companion:sheep', P('寄りかかっていい?'), T('いいよ。ぼくは、ねむくなっていい?')),
    banter('b-sheep-count', 'companion:sheep', T('ねむれないとき、何を数える?'), P('ヒツジ'), T('……ぼくは、何を数えればいいの')),
    banter('b-sheep-voice', 'companion:sheep', P('いま、ふわふわの中から声がした'), T('たぶん、きのう寄りかかった子')),
    // アザラシ
    banter('b-seal-stop', 'companion:seal', P('止まれる?'), T('止まる場所しだい'), P('ここ、ぼくの上だよ')),
    banter('b-seal-pass', 'companion:seal', P('こっちまで来られる?'), T('来られる。ただ、通りすぎる')),
    banter('b-seal-spin', 'companion:seal', T('ねえ、いま家、回ってない?'), P('回ってるのはきみだよ'), T('……どっちでも、景色はおなじ')),
    // コウモリ
    banter('b-bat-greet', 'companion:bat', P('おはよ'), T('おやすみ'), P('どっちが正しいの?'), T('ぶら下がってるほう')),
    banter('b-bat-floor', 'companion:bat', T('きょうの床、きれいだね'), P('そこ、天井だよ')),
    banter('b-bat-eat', 'companion:bat', P('逆さで、ごはん食べられる?'), T('食べられる。上に落ちていく')),
    // ニワトリ
    banter('b-chicken-ahead', 'companion:chicken', T('コケコッコー!'), P('いま、夕方だよ'), T('あしたの分、先に言っといた')),
    banter('b-chicken-hush', 'companion:chicken', P('しーっ、ねてる子がいる'), T('……こけ'), P('つづきは?'), T('あした')),
    banter('b-chicken-rollcall', 'companion:chicken', T('点呼!なおとっち!'), P('はい'), T('よし。朝、ひとり確認')),
    // ペンギン
    banter('b-penguin-belly', 'companion:penguin_friend', P('歩いてくれば?'), T('歩くと、着くまでが長い'), P('すべっても同じきょりだよ'), T('おなかで測ると短い')),
    banter('b-penguin-wall', 'companion:penguin_friend', T('止まるところ、決めてなかった'), P('……壁まで行った?'), T('壁が決めてくれた')),
    banter('b-penguin-brake', 'companion:penguin_friend', P('羽、ばたばたしてどうしたの?'), T('飛んでない。ブレーキ')),
    // ハリネズミ
    banter('b-hedgehog-ah', 'companion:hedgehog', P('あ'), T('……まるくなりました'), P('まだ何も言ってないよ'), T('「あ」が、ちょっと強かった')),
    banter('b-hedgehog-near', 'companion:hedgehog', T('近づいてもいい?'), P('いいよ。ゆっくりね'), T('じゃあ、あした、もうちょっと')),
    banter('b-hedgehog-hug', 'companion:hedgehog', P('だっこしていい?'), T('いいよ。とげは、いま寝かせた')),
    // しばいぬ
    banter('b-shiba-walk', 'companion:shiba', T('散歩、行く?'), P('さっき行ったよ'), T('あれは練習。本番は、いま')),
    banter('b-shiba-close', 'companion:shiba', P('ちょっと、近いよ'), T('となりを歩く係だから'), P('いま、すわってるよ'), T('となりにすわる係もやってる')),
    banter('b-shiba-mouth', 'companion:shiba', T('ボール、どこに投げる?'), P('きみが決めていいよ'), T('ここ。ぼくの口の中')),
    // ぷにゅ
    banter('b-punyu-spread', 'companion:punyu', P('なんか、広がってない?'), T('座ったから'), P('立って'), T('立つ形、わすれちゃった')),
    banter('b-punyu-round', 'companion:punyu', T('きょう、まるい?'), P('だいたいまるいよ'), T('なら、まるい日にする')),
    banter('b-punyu-eyes', 'companion:punyu', P('目だけ、ずっとこっち見てる'), T('目は、とけないことにしてる')),
    // カメレオン
    banter('b-chameleon-shades', 'companion:chameleon', P('あ、そこにいたの'), T('サングラスだけは、かくせなくて')),
    banter('b-chameleon-curtain', 'companion:chameleon', T('きょうの色、どう?'), P('……カーテン色'), T('ほめてる?'), P('うん。見つからない')),
    banter('b-chameleon-glare', 'companion:chameleon', P('なんでサングラス?'), T('まぶしいから'), P('目、あっちとこっち向いてるよ'), T('だから両方まぶしい')),
    // ユニコーン
    banter('b-unicorn-lost', 'companion:unicorn', P('道、まよったの?'), T('まよってない。ここに着いちゃっただけ')),
    banter('b-unicorn-horn', 'companion:unicorn', T('つの、どこに向けておけばいい?'), P('天井でいいよ'), T('……天井に、星がひとつついた')),
    banter('b-unicorn-rare', 'companion:unicorn', P('めずらしいんでしょ?'), T('自分では、よく見るよ')),
    // ふくろう
    banter('b-owl-know', 'companion:owl', T('知ってる?'), P('なにを?'), T('……いま、それを思い出してる')),
    banter('b-owl-neck', 'companion:owl', P('首、どこまで回るの?'), T('一周したら、きみが二回見えた')),
    // ハムスター
    banter('b-hamster-open', 'companion:hamster', P('ほっぺ、何が入ってるの?'), T('……あけたら、思い出すと思う')),
    banter('b-hamster-seed', 'companion:hamster', T('ひまわりのたね、いる?'), P('ありがとう'), T('いま出すね。……出ない')),
    // サル
    banter('b-monkey-sleepy', 'companion:monkey', P('ふわあ'), T('ふわーあ'), P('……ほんとにねむくなってきた'), T('ほら、まねされた')),
    banter('b-monkey-face', 'companion:monkey', T('いまの顔、もう一回して'), P('どの顔?'), T('それじゃなくて、さっきの')),
    // オウム
    banter('b-parrot-deliver', 'companion:parrot', T('ごはんまだ?ごはんまだ?'), P('それ、ぼくがきのう言ったやつ'), T('きのうの分、とどけに来た')),
    banter('b-parrot-secret', 'companion:parrot', P('ないしょ話していい?'), T('いいよ。だれに言えばいい?')),
    // カタツムリ
    banter('b-snail-rain', 'companion:snail', T('雨のにおい!'), P('外、はれてるよ'), T('ぼくが着くころに降る')),
    banter('b-snail-stay', 'companion:snail', T('きょうは、ゆっくりしていくね'), P('いつもゆっくりだよ'), T('きょうは、気持ちもゆっくり')),
    // せきぞう
    banter('b-statue-late', 'companion:sekizou', P('おはようございます'), T('……おやすみ'), P('いま、朝だよ'), T('……きのうの返事')),
    banter('b-statue-sit', 'companion:sekizou', P('ずっと立ってて、つかれない?'), T('……すわるのは、千年に一回')),
    // とけい
    banter('b-clock-meet', 'companion:clock', P('待ち合わせ、何時だっけ'), T('会えたときが、その時間')),
    banter('b-clock-sound', 'companion:clock', T('さっきの音、まだ持ってる'), P('なんの音?'), T('きみが、おやつのふくろを開けた音')),
    // きつね
    banter('b-fox-behind', 'companion:many_tail_fox', T('うしろ、見ないでね'), P('どうして?'), T('しっぽが、まだそろってない')),
    banter('b-fox-lend', 'companion:many_tail_fox', P('しっぽ、一本かして'), T('いいよ。どれか分かったら')),
    // みているなにか
    banter('b-watcher-together', 'companion:watcher', P('いっしょに見る?'), T('……もう、見てる')),
    banter('b-watcher-dream', 'companion:watcher', P('ねるとき、どうするの?'), T('……見てる夢を見る')),
    // はこ
    banter('b-box-sit', 'companion:box', P('すわっていい?'), T('……はこなので'), P('いいってこと?'), T('……はこですので')),
    banter('b-box-arrived', 'companion:box', P('きみ、いつからここにいるの?'), T('……とどきました')),
    // 誰が来ても成り立つもの(寡黙なキャラには使わない)
    banter('b-partner-called', 'partner', P('ねえ'), T('なに?'), P('呼んでみただけ'), T('じゃあ、返事してみただけ')),
    banter('b-companion-plan', 'companion', T('あそびに来た!'), P('何してあそぶ?'), T('来たところまでしか考えてなかった')),
  ]);

  // 選択肢: label はボタンの短い文字。reply は選んだあとに続く beat(本人 / 来ている相手)
  const choice = (label, ...reply) => Object.freeze({label, reply:Object.freeze(reply)});
  const question = (id, ask, choices, extra = {}) => Object.freeze({id, ask, choices:Object.freeze(choices), with:null, trait:null, lead:Object.freeze([]), ...extra});

  const QUESTIONS = Object.freeze([
    question('q-cloud-seat', 'くものうえって、座れると思う?', [
      choice('座れる', P('じゃあ、席とっとく')),
      choice('座れない', P('立ち見か……')),
      choice('先に座ってみて', P('下で待ってて。すぐ落ちるから')),
    ]),
    question('q-my-color', 'ぼくって、何色だと思う?', [
      choice('見たまま', P('見たまま色。いい名前')),
      choice('金色', P('……いま、ちょっと光った')),
      choice('とうめい', P('じゃあ、いまここにいるのは何?')),
    ]),
    question('q-tomorrow', 'あしたって、もう来てる?', [
      choice('まだだよ', P('じゃあ、迎えに行かないでおく')),
      choice('もう来てる', P('どこに隠れてるんだろ')),
      choice('寝たら来る', P('起きてたら来ない?ためしてみる')),
    ]),
    question('q-tummy-sound', 'いま、おなかの音きこえた?', [
      choice('きこえた', P('返事してあげて')),
      choice('きこえない', P('じゃあ、いまのは心の音')),
    ]),
    question('q-secret', 'ひみつ、ひとつ言っていい?', [
      choice('いいよ', P('……わすれた。言っていい?までは覚えてる')),
      choice('だめ', P('じゃあ、ひみつのまま持っとく。重い')),
      choice('あとでね', P('あとでの箱に入れとく')),
    ]),
    question('q-while-asleep', 'ぼくが寝てるとき、どこにいるの?', [
      choice('ここにいる', P('じゃあ、寝言きかれてる?')),
      choice('帰ってる', P('同じ時間に寝てた?')),
      choice('ないしょ', P('夢の中でさがしてみる')),
    ]),
    question('q-hundred', '100さいって、遠い?', [
      choice('遠いよ', P('じゃあ、ゆっくり歩こ')),
      choice('すぐだよ', P('いそいで顔あらってくる')),
      choice('わからない', P('ぼくも。いっしょにわからないね')),
    ]),
    question('q-sneeze', 'くしゃみ、出そうで出ない。手伝って', [
      choice('はくしょん', P('……出た。そっちから')),
      choice('くすぐる', P('……ありがとう。止まった')),
      choice('待つ', P('待ってたら帰っちゃった')),
    ]),
    question('q-meal-order', 'ごはんとおやつ、どっちが先?', [
      choice('ごはん', P('わかった。おやつを先に、ごはんにする')),
      choice('おやつ', P('話がはやい')),
      choice('同時に', P('口がもうひとつ要るね')),
    ]),
    question('q-call-name', 'ぼくの名前、呼んでみて', [
      choice('なおとっち', P('はい。……いまの返事、じょうずだった?')),
      choice('おーい', P('それも、ぼくの名前ってことにする')),
      choice('……', P('心の中で呼んだ?きこえた気がする')),
    ]),
    question('q-buy-cloud', 'くもって、どこで買える?', [
      choice('売ってない', P('じゃあ、ひろうしかない')),
      choice('空で', P('とどかないお店だ')),
      choice('わたあめ屋', P('……それは食べちゃうくも')),
    ]),
    question('q-two-of-me', 'ぼくがふたりいたら、どっちと遊ぶ?', [
      choice('両方', P('じゃあ、ぼくもふたり分たのしむ')),
      choice('本物', P('本物はどっち?ぼくもわからない')),
      choice('いまのほう', P('……いまのぼく、ちょっと勝った')),
    ]),
    // 来ている相手もいる問いかけ(相手→本人→プレイヤー→相手、の4人目までつながる)
    question('q-what-partner-does', 'ねえ、こいびとって何するひと?', [
      choice('となりにいる', T('いま、してる')),
      choice('おやつを分ける', T('……半分、ちょうだい')),
      choice('わからない', T('わたしも、毎日しらべてる')),
    ], {with:'partner'}),
    question('q-tell-them', '言っていい?', [
      choice('いいよ', P('……何の話だったっけ')),
      choice('ないしょ', T('ないしょって言われると、気になる')),
    ], {with:'companion', lead:Object.freeze([T('ふたりで何の話してたの?')])}),
    // ---- 全員展開: 問いかけの追加(本人だけ・気質つき・相手つき) ----
    question('q-octopus-which', 'タコさんの、どの手とつなぐ?', [
      choice('右から3本め', T('それ、いちばん照れやの手')),
      choice('ぜんぶ', T('じゃあ、きみの手がたりない')),
      choice('えらべない', P('タコさんも、まだえらんでる')),
    ], {with:'partner:rock_octopus'}),
    question('q-snowman-kotatsu', 'ゆきだるまさん、こたつに入れる?', [
      choice('入れる', T('……足だけ。足、ないけど')),
      choice('やめとく', T('見てるだけで、ぬくい')),
    ], {with:'partner:snowman'}),
    question('q-angler-lamp', 'へやの電気、つける?けす?', [
      choice('けす', T('……で、何の話からする?')),
      choice('つける', T('じゃあ、灯りのうらにいる')),
      choice('はんぶん', P('うすぐらいって、ちょうどいいね')),
    ], {with:'partner:anglerfish'}),
    question('q-snowsp-changed', 'ぼく、前とかわった?', [
      choice('大きくなった', T('うん。雪だるま、ひとつぶん')),
      choice('かわらない', T('それ、わたしの言うことだよ')),
      choice('わからない', T('だいじょうぶ。わたしが覚えてる')),
    ], {with:'partner:snow_spirit'}),
    question('q-cat-call', 'ねこのこと、呼んでみて?', [
      choice('おいで', T('きこえた。返事はしっぽでした')),
      choice('呼ばない', T('……なんで呼ばないの?')),
    ], {with:'companion:cat_friend'}),
    question('q-shiba-throw', 'しばいぬのボール、投げる?', [
      choice('投げる', T('……ボール、はなせなかった')),
      choice('投げるふり', T('走った。ふりの分だけ')),
      choice('あとで', T('あとでまで、ここにいる')),
    ], {with:'companion:shiba'}),
    question('q-chameleon-color', 'カメレオン、何色が似合う?', [
      choice('赤', T('……いま、なってる?')),
      choice('かべの色', T('それ、いちばん得意')),
      choice('サングラス色', T('……ぜんぶ黒くなった')),
    ], {with:'companion:chameleon'}),
    question('q-unicorn-wish', 'つのにさわると、願いかなう?', [
      choice('かなう', T('じゃあ、ぼくもさわっとく')),
      choice('かなわない', T('知ってた。なでる用')),
      choice('ためす', P('……おやつ、ふえてない')),
    ], {with:'companion:unicorn'}),
    question('q-stone-name', 'ひろった石に、名前つけて', [
      choice('いし子', P('いし子。……ちょっと、あったかくなった')),
      choice('なおとっち2', P('弟ができた。ごはん、いらない子')),
      choice('つけない', P('じゃあ、石のままでいてもらう。えらい')),
    ]),
    question('q-forever-night', 'ずっと夜と、ずっとあさ、どっちがいい?', [
      choice('ずっと夜', P('おやすみを、何回も言えるね')),
      choice('ずっとあさ', P('おはようが、終わらない')),
      choice('まんなか', P('ずっとおひる。ずっと、ごはんの時間')),
    ]),
    question('q-blink-speed', 'ぼくのまばたき、早すぎない?', [
      choice('はやい', P('じゃあ、ゆっくりにする。……まだ閉じてる')),
      choice('ふつう', P('ふつうか。毎日練習してたのに')),
      choice('見えなかった', P('よかった。ひみつのまばたきだった')),
    ]),
    question('q-yawn-catch', 'いまの、ぼくのあくび、うつった?', [
      choice('うつった', P('じゃあ、返して。……うそ、あげる')),
      choice('うつってない', P('じゃあ、どこ行ったんだろ。いまのあくび')),
    ]),
    question('q-forgot-what', 'たいへん。いま何しようとしてたか忘れた', [
      choice('ごはん', P('ちがう気がする。でも、食べる')),
      choice('ねること', P('それだ。……いや、まだ早い')),
      choice('ぼくと遊ぶ', P('それにする。思い出すより早い')),
    ]),
    question('q-snack-count', 'やくそくして。ぼくのおやつ、数えないって', [
      choice('やくそく', P('ありがとう。じゃあ、ひとつ増えてもいいね')),
      choice('数える', P('数えるなら、ゆっくりね。いま食べてる')),
      choice('もう数えた', P('いくつだった?ぼくより知ってる')),
    ]),
    question('q-room-exists', 'ぼくが見てないとき、へやってあるの?', [
      choice('あるよ', P('じゃあ、へやもひとりで待ってるんだ')),
      choice('ない', P('ふりむいたら、いそいで出てくるの?')),
      choice('たぶん', P('たぶんか。……いま、ふりむいてみた')),
    ]),
    question('q-yesterday-me', 'きのうのぼくって、どこ行ったの?', [
      choice('ここにいる', P('じゃあ、ぼくの中でおとなしくしてる')),
      choice('ねむった', P('おこさないでおこう。きのう、つかれてたし')),
      choice('おぼえてる', P('ぼくより、きみのほうが持ってるんだね')),
    ]),
    question('q-my-country', 'この線からこっち、ぼくの国にしていい?', [
      choice('いいよ', P('じゃあ、入るときは、くつぬいでね')),
      choice('だめ', P('じゃあ、半分。……いまの、半分の国')),
      choice('住みたい', P('国民がふたりになった。にぎやか')),
    ]),
    question('q-guess-think', 'ぼく、いま何考えてるでしょう', [
      choice('ごはん', P('はずれ。でも、いまそっちに変えた')),
      choice('こっちのこと', P('それは、さっき考えた。いまは二回目')),
      choice('なにも', P('あたり。ぼくも分かってなかったのに')),
    ]),
    question('q-good-sound', 'なにか、いいおと出して', [
      choice('ぽん', P('ぽん。……もう一回。ぽん、好きかも')),
      choice('ぴゅー', P('ぴゅー。いま、どこか飛んでった')),
      choice('もぐもぐ', P('もぐもぐ……おなかが、本気にした')),
    ]),
    question('q-face-name', 'ぼくのこの顔、なんて名前にする?', [
      choice('まじめ顔', P('まじめ顔。……続けると、つかれる')),
      choice('ねむい顔', P('ばれた')),
      choice('いつもの', P('いつもの、か。いちばん練習してる顔')),
    ]),
    // 気質で出るもの
    question('q-fridge-light', 'れいぞうこ、しめたら電気きえてる?', [
      choice('きえてる', P('じゃあ、中のプリン、暗いのこわくないかな')),
      choice('ついてる', P('だれのために?……プリンか')),
      choice('見てくる', P('しめたら見えない。あけたらつく。ずるい')),
    ], {trait:'curiosity+'}),
    question('q-climb-high', 'あのたかいとこ、のぼってもいい?', [
      choice('いいよ', P('のぼった。……おりかた、聞いてない')),
      choice('だめ', P('じゃあ、ここからのぼった気持ちになる')),
      choice('いっしょに', P('ふたりなら、おりるときもこわくない')),
    ], {trait:'boldness+'}),
    question('q-that-noise', 'いまの音、なに?見てきて', [
      choice('見てきた', P('どうだった?……いや、言わないで')),
      choice('なにもない', P('なにもないのが、いちばんこわい')),
      choice('おなかの音', P('ぼくの?じゃあ、こわくない。たぶん')),
    ], {trait:'boldness-'}),
    question('q-sleepover', 'ねえ、みんな呼んで、ここでねない?', [
      choice('いいね', P('まくら、いくつ要るかな。数えてくる')),
      choice('せまいよ', P('つめたら入る。ぼく、まるくなる')),
      choice('ふたりで', P('じゃあ、ふたりで、みんなの話をしよ')),
    ], {trait:'sociability+'}),
    question('q-alone-bit', 'ちょっとだけ、ひとりになってもいい?', [
      choice('いいよ', P('ありがとう。……もう、もどってきた')),
      choice('どのくらい', P('このくらい。……はい、おわり')),
      choice('だめ', P('じゃあ、となりでひとりになる')),
    ], {trait:'sociability-'}),
    question('q-one-more-block', 'つみき、あと一こ、のせていい?', [
      choice('のせて', P('のせた。……まだのる。まだのる')),
      choice('やめとく', P('わかった。のせないけど、ずっと見てる')),
      choice('もう三こ', P('三こか。今夜は、ねられない')),
    ], {trait:'persistence+'}),
  ]);

  // 返事がないまま時間が過ぎたとき、たまに言う(言わないことも多い)
  const NO_ANSWER_LINES = Object.freeze([
    '返事、あとで聞くね',
    '考え中の顔、もらった',
    'いまの間、けっこう好き',
  ]);

  function visitorKind(visitorKey) {
    const kind = String(visitorKey || '').split(':')[0];
    return kind === 'partner' || kind === 'companion' ? kind : null;
  }
  // その相手と成り立つ候補。specific(その相手専用)と generic(誰でも)に分ける。isQuiet(key) が真なら generic は使わない
  function candidatesFor(list, visitorKey, {isQuiet = () => false} = {}) {
    const kind = visitorKind(visitorKey);
    const specific = [], generic = [];
    for (const unit of list) {
      if (!unit.with) continue;
      if (unit.with === visitorKey) specific.push(unit);
      else if (kind && unit.with === kind && !isQuiet(visitorKey)) generic.push(unit);
    }
    return {specific, generic};
  }
  function banterCandidates(visitorKey, opts) { return candidatesFor(BANTERS, visitorKey, opts); }
  // 生まれつきの気質(individuality の temperament 1〜5)。trait 'boldness+' は 4〜5、'boldness-' は 1〜2 のときだけ
  function traitMatches(trait, temperament) {
    if (!trait) return true;
    const m = /^([a-z]+)([+-])$/.exec(trait);
    if (!m || !temperament) return false;
    const v = Number(temperament[m[1]]);
    if (!Number.isFinite(v)) return false;
    return m[2] === '+' ? v >= 4 : v <= 2;
  }
  // 問いかけ: 来ている相手がいなければ本人だけの問いかけ。いれば、その相手と成り立つものも加える。
  // 気質つきの問いかけは、その気質が高い/低いときだけ(opts.temperament。読むだけ)
  function questionCandidates(visitorKey, opts = {}) {
    const fits = q => traitMatches(q.trait, opts.temperament);
    const solo = QUESTIONS.filter(q => !q.with && fits(q));
    if (!visitorKey) return {solo, withVisitor:[]};
    const {specific, generic} = candidatesFor(QUESTIONS, visitorKey, opts);
    return {solo, withVisitor:[...specific, ...generic].filter(fits)};
  }

  // データの形を確かめる(テストと起動時の安全確認用)。問題があれば文字列の配列を返す
  function validate() {
    const problems = [], ids = new Set();
    const checkText = (where, text) => {
      if (typeof text !== 'string' || !text.trim()) problems.push(`${where}: empty text`);
      else if (/[ 　]/.test(text)) problems.push(`${where}: Japanese text must not contain spaces`);
    };
    const checkBeats = (where, beats, min) => {
      if (!Array.isArray(beats) || beats.length < min || beats.length > 4) problems.push(`${where}: ${beats?.length} beats`);
      (beats || []).forEach((b, i) => {
        if (!b || (b.role !== 'pet' && b.role !== 'them')) problems.push(`${where}[${i}]: role`);
        checkText(`${where}[${i}]`, b?.text);
      });
    };
    for (const u of BANTERS) {
      if (ids.has(u.id)) problems.push(`${u.id}: duplicate id`); ids.add(u.id);
      if (!/^(partner|companion)(:[a-z_]+)?$/.test(u.with || '')) problems.push(`${u.id}: with`);
      checkBeats(u.id, u.beats, 2);
      for (let i = 1; i < u.beats.length; i++) if (u.beats[i].role === u.beats[i - 1].role) problems.push(`${u.id}: same speaker twice in a row`);
    }
    for (const q of QUESTIONS) {
      if (ids.has(q.id)) problems.push(`${q.id}: duplicate id`); ids.add(q.id);
      checkText(`${q.id}.ask`, q.ask);
      if (q.with != null && !/^(partner|companion)(:[a-z_]+)?$/.test(q.with)) problems.push(`${q.id}: with`);
      if (q.trait && !/^(curiosity|boldness|sociability|persistence)[+-]$/.test(q.trait)) problems.push(`${q.id}: trait`);
      if (q.lead.length) checkBeats(`${q.id}.lead`, q.lead, 1);
      if (!Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > 4) problems.push(`${q.id}: ${q.choices?.length} choices`);
      const labels = new Set();
      for (const [i, c] of (q.choices || []).entries()) {
        checkText(`${q.id}.choices[${i}].label`, c.label);
        if ([...String(c.label)].length > 8) problems.push(`${q.id}.choices[${i}]: label too long for a button`);
        if (labels.has(c.label)) problems.push(`${q.id}: duplicate label`); labels.add(c.label);
        checkBeats(`${q.id}.choices[${i}].reply`, c.reply, 1);
        if (!q.with && c.reply.some(b => b.role === 'them')) problems.push(`${q.id}: a solo question cannot reply as a visitor`);
      }
    }
    NO_ANSWER_LINES.forEach((t, i) => checkText(`NO_ANSWER_LINES[${i}]`, t));
    return problems;
  }

  const api = {BANTERS, QUESTIONS, NO_ANSWER_LINES, banterCandidates, questionCandidates, traitMatches, visitorKind, validate, VERSION:1};
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NaotocchiConversationBanter = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
