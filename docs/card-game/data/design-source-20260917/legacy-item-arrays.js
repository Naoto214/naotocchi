  const SHOP_ITEMS = [
    { id: 'flower', label: 'おはな', emoji: '🌼', price: 60, desc: 'きゅうあいが、少しうまくいきやすくなる' },
    { id: 'ribbon', label: 'リボン', emoji: '🎀', price: 60, desc: 'ごきげんがすこしへりにくい' },
    { id: 'bowtie', label: 'ちょうネクタイ', emoji: '🎗️', price: 60, desc: 'おなかがすこしへりにくい' },
    { id: 'poop1', label: 'トイレットペーパー', emoji: '🧻', price: 70, desc: 'うんちがすこしたまりにくい' },
    { id: 'scarf', label: 'マフラー', emoji: '🧣', price: 80, desc: 'びょうきにすこしなりにくい' },
    { id: 'glasses', label: 'サングラス', emoji: '🕶️', price: 90, desc: 'ミニゲームの得点が少しのびる' },
    { id: 'energy1', label: 'げんきバンド', emoji: '⚡', price: 100, desc: 'げんきがすこしへりにくい' },
    { id: 'hat', label: 'シルクハット', emoji: '🎩', price: 110, desc: 'へんしんの力が少したまりやすい' },
    { id: 'travel1', label: 'リュックサック', emoji: '🎒', price: 120, desc: '旅から帰ったあとのごきげんが、少しよくなる' },
    { id: 'sleepboost1', label: 'ふかふかまくら', emoji: '🛏️', price: 130, desc: 'ねているとき、げんきの回復が少しふえる' },
    { id: 'star', label: 'スターバッジ', emoji: '⭐', price: 150, desc: 'ミニゲームのあとにもらえるコインが、少しふえる' },
    { id: 'bond1', label: 'おともだちバッジ', emoji: '🐾', price: 170, desc: 'なかまのきずながすこしへりにくい' },
    { id: 'partner1', label: 'らぶれたー', emoji: '💌', price: 190, desc: 'こいびとのなかよし度がすこしへりにくい' },
    { id: 'crown', label: 'かんむり', emoji: '👑', price: 220, desc: 'つらいことがあったとき、いのちが少しへりにくい' },
    { id: 'itemluck1', label: 'よつばのクローバー', emoji: '🍀', price: 250, desc: 'めずらしいごほうびに、ほんの少し出会いやすくなる' },
  ];

  const NAOTO_ITEMS = [
    { id: 'naoto_charm', label: 'なおとのおまもり', emoji: '🧿', unlockTier: 0, desc: '幼いころと年をとってから、いのちが少しへりにくくなる' },
    { id: 'naoto_lantern', label: 'なおとのランタン', emoji: '🏮', unlockTier: 1, desc: '旅の途中で、不思議なあかりを見かけることがある' },
    { id: 'naoto_ring', label: 'なおとのリング', emoji: '💍', unlockTier: 2, desc: 'とくべつなデートに、ふたりだけの一言が加わる' },
    { id: 'naoto_crown', label: 'なおとのかんむり', emoji: '👑', unlockTier: 3, desc: 'おたのしみで遊ぶとき、たまに特別な一言が出る' },
  ];

  const CONSUMABLE_ITEMS = [
    { id: 'c_coin2', label: 'ラッキーコイン', emoji: '🪙', price: 80, desc: 'つぎのミニゲーム大成功でもらうおかねが2ばい（チャレンジの報酬は別）',
      available: () => !state.oneTimeBoosts.doubleCoins, unavailableMessage: 'もう持っている（つぎのミニゲーム大成功で使う）',
      apply: () => { state.oneTimeBoosts.doubleCoins = true; return { message: '🪙ラッキーコインをにぎりしめた。つぎのミニゲーム大成功でもらうおかねが2ばい!' }; } },
    { id: 'c_safety', label: 'スコアほけん', emoji: '🛡️', price: 90, desc: 'つぎのミニゲーム失敗で、おとろえは増えず、いのちも減らない',
      available: () => !state.oneTimeBoosts.safetyNet, unavailableMessage: 'もう持っている（つぎのミニゲーム失敗で使う）',
      apply: () => { state.oneTimeBoosts.safetyNet = true; return { message: '🛡️スコアほけんに入った。つぎのミニゲーム失敗で、おとろえといのちを守る' }; } },
    { id: 'c_mgsmall', label: 'やる気のおまもり', emoji: '🔥', price: 120, desc: 'つぎのゲームのごほうびと失敗の判定に25点を加える（記録とランクは変わらない）',
      available: () => !state.oneTimeBoosts.minigameBoost, unavailableMessage: 'おまもりはひとつずつ（つぎのゲームで使う）',
      apply: () => { state.oneTimeBoosts.minigameBoost = 'small'; return { message: '🔥やる気がわいてきた。つぎのゲームのごほうびと失敗の判定に25点を加える' }; } },
    { id: 'c_mgbig', label: '大成功のおまもり', emoji: '💫', price: 300, desc: 'つぎのゲームで大成功と同じごほうび・回復効果（記録とランクは変わらない）',
      available: () => !state.oneTimeBoosts.minigameBoost, unavailableMessage: 'おまもりはひとつずつ（つぎのゲームで使う）',
      apply: () => { state.oneTimeBoosts.minigameBoost = 'big'; return { message: '💫大成功のおまもりをにぎった。つぎのゲームで、大成功と同じごほうび・回復効果!' }; } },
    { id: 'c_sickshield', label: 'びょうきよけのおふだ', emoji: '🧧', price: 100, desc: 'お世話不足で病気になりそうなとき、3回まで防ぐ',
      available: () => (state.oneTimeBoosts.sicknessShieldCount || 0) <= 0, unavailableMessage: 'おふだがまだのこっている',
      apply: () => { state.oneTimeBoosts.sicknessShieldCount = 3; return { message: '🧧びょうきよけのおふだをはった（3回分）' }; } },
    { id: 'c_growth', label: 'せいちょうドリンク', emoji: '🧃', price: 250, desc: 'せいちょう2ばいの時間を5分追加（合計10分まで）',
      available: () => (state.boostTicks || 0) < BOOST_TICKS_MAX && isLiveLife() && !state.infinite, unavailableMessage: '今はせいちょうドリンクを使えない',
      apply: () => { grantGrowthBoost(100); return { message: '🧃せいちょうドリンクを飲んだ。せいちょう2ばいの時間を5分追加（合計10分まで）' }; } },
    { id: 'c_courtsmall', label: 'こいのおまもり', emoji: '💘', price: 150, desc: '夫婦になる前のきゅうあいが、1回だけ少しうまくいきやすい',
      available: () => !state.oneTimeBoosts.courtBoost, unavailableMessage: 'おまもりはひとつずつ（夫婦になる前のきゅうあいで使う）',
      apply: () => { state.oneTimeBoosts.courtBoost = 'small'; return { message: '💘こいのおまもりを持った。夫婦になる前のきゅうあいを1回助けてくれる' }; } },
    { id: 'c_courtbig', label: 'こいの大おまもり', emoji: '💝', price: 350, desc: '夫婦になる前のきゅうあいが、1回だけかなりうまくいきやすい',
      available: () => !state.oneTimeBoosts.courtBoost, unavailableMessage: 'おまもりはひとつずつ（夫婦になる前のきゅうあいで使う）',
      apply: () => { state.oneTimeBoosts.courtBoost = 'big'; return { message: '💝こいの大おまもりを持った。夫婦になる前のきゅうあいを1回、大きく助けてくれる' }; } },
    { id: 'c_breakhalf', label: 'なかなおりのおまもり', emoji: '🩹', price: 200, desc: 'つぎに別れたとき、いのちの減りが半分になる（別れは防げない）',
      available: () => !state.oneTimeBoosts.breakupShield, unavailableMessage: 'おまもりはひとつずつ',
      apply: () => { state.oneTimeBoosts.breakupShield = 'half'; return { message: '🩹なかなおりのおまもりをもった' }; } },
    { id: 'c_breakfull', label: 'きずなのおまもり', emoji: '💞', price: 400, desc: 'つぎに別れたとき、いのちが減らない（別れは防げない）',
      available: () => !state.oneTimeBoosts.breakupShield, unavailableMessage: 'おまもりはひとつずつ',
      apply: () => { state.oneTimeBoosts.breakupShield = 'full'; return { message: '💞きずなのおまもりをもった' }; } },
    { id: 'c_travel', label: 'たびのおまもり', emoji: '🧭', price: 120, desc: 'つぎの旅は、続けて出かけても「たびづかれ」にならない（げんき・おなかは使う）',
      available: () => !state.oneTimeBoosts.travelGuarantee, unavailableMessage: 'もう持っている（つぎの旅で使う）',
      apply: () => { state.oneTimeBoosts.travelGuarantee = true; return { message: '🧭たびのおまもりを持った。つぎの旅は「たびづかれ」にならない' }; } },
  ];

  const FUN_ITEMS = [
    {
      "id": "fun_candy",
      "label": "キャンディ",
      "emoji": "🍭",
      "narration": "🍭キャンディをぺろぺろ。ちいさなおやつタイム!",
      "emote": "happy",
      "petLines": [
        "あまーい!",
        "もうひとくち!",
        "これすき!",
        "ちいさくなった。どこへ消えたんだろ",
        "最後だけずっとなめてたい"
      ],
      "partnerLines": [
        "おいしそうだね",
        "ひとくちちょうだい?",
        "うれしそうでかわいい",
        "半分は難しいね。感想だけちょうだい",
        "ほっぺのふくらみで場所がわかる"
      ],
      "companionLines": [
        "ぼくもたべたい!",
        "あまいにおい!",
        "いいなー!",
        "包み紙の音で来ちゃった!",
        "その色、何の味?"
      ]
    },
    {
      "id": "fun_bubbles",
      "label": "しゃぼんだま",
      "emoji": "🫧",
      "narration": "🫧しゃぼんだまがふわふわひろがった",
      "emote": "fun",
      "petLines": [
        "まてまて〜!",
        "こっちにもきた!",
        "われるまえにつかまえる!",
        "ふれたらいなくなるの、ずるい",
        "大きいのほど慎重に見送る"
      ],
      "partnerLines": [
        "ふふ、たのしそう",
        "きれいだね",
        "そっちにもとんでるよ",
        "消える前に同じの見られたね",
        "近づいたら顔が映ってた"
      ],
      "companionLines": [
        "こっちこっち!",
        "おおきいのきた!",
        "つかまえた!…われた!",
        "三つ数えたら二つになった!",
        "あっちの大きいの、追いかけよう!"
      ]
    },
    {
      "id": "fun_balloon",
      "label": "ふうせん",
      "emoji": "🎈",
      "narration": "🎈ふうせんがふわり。つられて見あげた",
      "emote": "fun",
      "petLines": [
        "どこまでいくの?",
        "おちてこーい!",
        "ふわふわ〜",
        "持ってるほうが引っぱられてる",
        "軽そうなのに目が離せない"
      ],
      "partnerLines": [
        "にげないようにみてよう",
        "なんかいいね",
        "ずっとみてられる",
        "ひも、ここで持ってるね",
        "そっちに行きたいみたい。ついていく?"
      ],
      "companionLines": [
        "つかまえる!",
        "たかい!",
        "ぼくのところにも!",
        "天井まで行ったら呼んで!",
        "まるいのにころがらない!"
      ]
    },
    {
      "id": "fun_fireworks",
      "label": "はなび",
      "emoji": "🎇",
      "narration": "🎇よぞらにはなびがひらいた",
      "emote": "fun",
      "petLines": [
        "わあっ!",
        "もういっかい!",
        "おおきい!",
        "光ったあとに音が来た!",
        "次を待ってたら、もう終わりそう!"
      ],
      "partnerLines": [
        "きれい…",
        "いっしょにみれてよかった",
        "このままみてたいね",
        "同じところでびっくりしたね",
        "今の声、はなびより近かった"
      ],
      "companionLines": [
        "どーん!",
        "びっくりした!",
        "つぎくるかな?",
        "大きいの来た!拍手が遅れた!",
        "音のほうにも名前つけたい!"
      ]
    },
    {
      "id": "fun_camera",
      "label": "カメラ",
      "emoji": "📸",
      "narration": "📸カメラにむかって、ちょっといい顔をした",
      "emote": "happy",
      "petLines": [
        "はい、チーズ!",
        "どう?うつってる?",
        "もう1まい!",
        "まじめな顔がいちばんへん",
        "自分の顔にまだ慣れてない"
      ],
      "partnerLines": [
        "このしゃしん、とっておこうね",
        "もうすこしこっち",
        "いいかおしてる",
        "その顔も残しとこう",
        "さっきの一枚、消さないでね"
      ],
      "companionLines": [
        "ぼくもはいる!",
        "へんなかおする!",
        "みせてみせて!",
        "全員入った?はしっこ見せて!",
        "撮る前に笑っちゃった!"
      ]
    },
    {
      "id": "fun_musicbox",
      "label": "オルゴール",
      "emoji": "🎵",
      "narration": "🎵小さな箱から、やわらかい音が広がった",
      "emote": "happy",
      "petLines": [
        "ゆらゆら〜",
        "このおとすき",
        "なんかねむくなる…",
        "ふたを閉じてもまだ頭で鳴ってる",
        "次の音を待つのがたのしい"
      ],
      "partnerLines": [
        "おちつくね",
        "このままゆっくりしよう",
        "いいきょくだね",
        "話の続きはこの曲のあとにしよ",
        "黙って聴く時間もいいね"
      ],
      "companionLines": [
        "おどろう!",
        "ふしぎなおと!",
        "もういっかいききたい!",
        "小さな箱なのに音が広い!",
        "静かに聴く練習ならできる!"
      ]
    },
    {
      "id": "fun_surprise",
      "label": "びっくりばこ",
      "emoji": "🪄",
      "narration": "🪄びっくりばこがびよーん!",
      "emote": "fun",
      "petLines": [
        "うわっ!",
        "びっくりしたー!",
        "もうこわくないぞ!",
        "知っててもびっくりする!",
        "ふたに勝った顔をしておこう"
      ],
      "partnerLines": [
        "ふふ、いいかおした",
        "びっくりしたね",
        "次はこっちが開けてみるね",
        "驚くタイミングまで一緒だったね",
        "次はそっちが開けてみる?"
      ],
      "companionLines": [
        "わああ!",
        "もう1かい!",
        "いまのみた!?",
        "箱のほうが元気だった!",
        "閉めたらまた待ってるの?"
      ]
    }
  ];

  const RECOVERY_ITEMS = [
    { id: 'reward', label: 'ごほうび', emoji: '🎁', tier: 'special', rank: 1, weight: 1,
      effects: {}, desc: 'デートやたびをとくべつなおもいでにできる' },
  ];
