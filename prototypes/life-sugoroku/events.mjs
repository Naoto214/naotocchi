// Authored life events; canonical character IDs reference the existing world master.
// Score deltas are prototype tuning values. Romance text has an equal-reward friendship rendering.
export const EVENTS = [
  {
    "id": "daily-01",
    "category": "daily",
    "title": "雲の落としもの",
    "text": "空に、さっき食べたおやつそっくりの雲。見ていると、おなかが返事をした。",
    "stages": [
      1,
      8
    ],
    "regions": [
      "forest",
      "sea",
      "city",
      "square"
    ],
    "choices": [
      {
        "label": "名前をつける",
        "text": "「おかわり雲」。呼ぶたび、少しだけ形が変わった。",
        "sodachi": 3,
        "money": 0
      },
      {
        "label": "絵に残す",
        "text": "線がはみ出した。でも、おなかの音まで描けた気がする。",
        "sodachi": 2,
        "money": 2
      }
    ],
    "album": "おやつに似た雲を眺めた。",
    "once": true
  },
  {
    "id": "daily-02",
    "category": "daily",
    "title": "箱の会議",
    "text": "ただのはこが、道の真ん中にいる。ふたは閉まっている。会議中かもしれない。",
    "stages": [
      1,
      8
    ],
    "regions": [
      "city",
      "square"
    ],
    "npc": "box",
    "choices": [
      {
        "label": "隣で待つ",
        "text": "しばらくして、ふたが少し開いた。議題は、たぶん日なた。",
        "sodachi": 3,
        "money": 0
      },
      {
        "label": "通り道を譲る",
        "text": "一歩よけると、風ではこがころん。「どうぞ」が届いた気がした。",
        "sodachi": 2,
        "money": 3
      }
    ],
    "album": "ただのはこと、言葉のない会議をした。",
    "once": true
  },
  {
    "id": "daily-03",
    "category": "daily",
    "title": "くつしたの旗",
    "text": "片方だけのくつしたが、枝でひらひらしている。持ち主の帰りを待つ、小さな旗。",
    "stages": [
      1,
      8
    ],
    "regions": [
      "forest",
      "square"
    ],
    "choices": [
      {
        "label": "見つけやすく結ぶ",
        "text": "結び目はちょうちょ。帰ってきた誰かが、遠くで手を振った。",
        "sodachi": 4,
        "money": 2
      },
      {
        "label": "持ち主を探す",
        "text": "長く歩いて、くつしたの話ばかり上手になった。今日は見つからない。",
        "sodachi": -1,
        "money": 5
      }
    ],
    "album": "片方のくつしたのために、少し寄り道した。",
    "once": true
  },
  {
    "id": "daily-04",
    "category": "daily",
    "title": "はじめての大きな声",
    "text": "声を出すと、向こうの壁から小さな声が返ってきた。まだ、自分の声だと気づいていない。",
    "stages": [
      1,
      3
    ],
    "regions": [
      "forest",
      "sea",
      "city",
      "square"
    ],
    "choices": [
      {
        "label": "もう一度呼ぶ",
        "text": "「こんにちは！」。返事も元気になった。世界が少し広くなった。",
        "sodachi": 4,
        "money": 0,
        "evolve": 1
      },
      {
        "label": "小さくお礼を言う",
        "text": "「ありがとう」。返ってきた声も、ちゃんと小さかった。",
        "sodachi": 3,
        "money": 3
      }
    ],
    "album": "返ってくる自分の声に気づいた。",
    "once": true
  },
  {
    "id": "daily-05",
    "category": "daily",
    "title": "ひざより高い草",
    "text": "昨日は壁みたいだった草の間に、細い道が見える。先には、小さな光。",
    "stages": [
      1,
      3
    ],
    "regions": [
      "forest",
      "square"
    ],
    "choices": [
      {
        "label": "一歩ずつ進む",
        "text": "草を抜けたら、いつもの場所だった。でも、初めて自分で来た。",
        "sodachi": 4,
        "money": 0,
        "evolve": 1
      },
      {
        "label": "道の入口を覚える",
        "text": "今日はここまで。帰り道を覚えられたのも、ひとつの発見。",
        "sodachi": 3,
        "money": 0
      }
    ],
    "album": "大きな草の向こうの道を考えた。",
    "once": true
  },
  {
    "id": "daily-06",
    "category": "daily",
    "title": "寝ぐせの王冠",
    "text": "水面に映った姿に、ぴょこんと立つ寝ぐせ。風まで、そこだけ避けている。",
    "stages": [
      1,
      8
    ],
    "regions": [
      "forest",
      "sea",
      "city",
      "square"
    ],
    "choices": [
      {
        "label": "そのまま出かける",
        "text": "今日はこれが目印。待ち合わせに、すぐ気づいてもらえた。",
        "sodachi": 3,
        "money": 2
      },
      {
        "label": "水で直してみる",
        "text": "直したところと、別のところが立った。王冠は引っ越しただけだった。",
        "sodachi": 2,
        "money": 3
      }
    ],
    "album": "水面に映る寝ぐせを見つけた。",
    "once": true
  },
  {
    "id": "daily-07",
    "category": "daily",
    "title": "雨の拍手",
    "text": "雨が屋根をたたいている。早い音、遅い音。今日は、空が演奏係。",
    "stages": [
      1,
      8
    ],
    "regions": [
      "forest",
      "sea",
      "city",
      "square"
    ],
    "choices": [
      {
        "label": "音を数える",
        "text": "数えきれなくなって、ただ聴いた。雨上がりに、気持ちが軽くなった。",
        "sodachi": 3,
        "money": 0
      },
      {
        "label": "雨の切れ間に走る",
        "text": "あと一歩でまた雨。ぬれた道に、自分の足あとができた。",
        "sodachi": -1,
        "money": 7
      }
    ],
    "album": "雨の降る日の過ごし方を選んだ。",
    "once": true
  },
  {
    "id": "daily-08",
    "category": "daily",
    "title": "おやつ半分の計算",
    "text": "おやつを半分にしたら、片方だけ少し大きい。じっと見るほど、差が大きく感じる。",
    "stages": [
      1,
      8
    ],
    "regions": [
      "city",
      "square"
    ],
    "choices": [
      {
        "label": "大きい方を譲る",
        "text": "相手がまた半分をくれた。計算は難しくなったけれど、うれしかった。",
        "sodachi": 4,
        "money": -2
      },
      {
        "label": "くじで決める",
        "text": "引いた紙には「ゆっくり食べる」。誰が書いたのだろう。",
        "sodachi": 2,
        "money": 4
      }
    ],
    "album": "半分のおやつから、分ける楽しさを知った。",
    "once": true
  },
  {
    "id": "daily-09",
    "category": "daily",
    "title": "道案内は反対向き",
    "text": "おしゃべりオウムが「こっち！」と呼ぶ。よく聞くと、さっき自分が言った声だった。",
    "stages": [
      1,
      8
    ],
    "regions": [
      "forest",
      "sea",
      "city",
      "square"
    ],
    "npc": "parrot",
    "choices": [
      {
        "label": "地図を一緒に見る",
        "text": "「ここ！」と指すと「ここ！」が返る。二人分の声で、道が決まった。",
        "sodachi": 3,
        "money": 3
      },
      {
        "label": "声の方へ行く",
        "text": "ぐるっと回って同じ場所。「おかえり！」だけは、とても上手だった。",
        "sodachi": -2,
        "money": 7
      }
    ],
    "album": "おしゃべりオウムと、道を探した。",
    "once": true
  },
  {
    "id": "daily-10",
    "category": "daily",
    "title": "ゆっくりのお茶",
    "text": "湯気が消えるまで待っていたら、夕方になったような気がした。時計を見ると、まだ少ししか進んでいない。",
    "stages": [
      6,
      8
    ],
    "regions": [
      "forest",
      "sea",
      "city",
      "square"
    ],
    "choices": [
      {
        "label": "今日の話をする",
        "text": "特別なことのない日にも、話すことはちゃんとあった。",
        "sodachi": 4,
        "money": 0
      },
      {
        "label": "黙って味わう",
        "text": "言葉を急がない時間。最後の一口が、いちばん甘く感じた。",
        "sodachi": 3,
        "money": 4
      }
    ],
    "album": "温かいお茶の時間を過ごした。",
    "once": true
  },
  {
    "id": "daily-11",
    "category": "daily",
    "title": "昔の歩幅",
    "text": "前に歩いた道が、少し短く感じる。角の石だけは、昔と同じ顔をしている。",
    "stages": [
      6,
      8
    ],
    "regions": [
      "forest",
      "city",
      "square"
    ],
    "choices": [
      {
        "label": "小さい歩幅で歩く",
        "text": "忘れていた景色が、足元から戻ってきた。急がなくても、今日が進む。",
        "sodachi": 4,
        "money": 0
      },
      {
        "label": "新しい道を探す",
        "text": "曲がった先に、知らなかったベンチ。昔の道の隣にも、初めてがあった。",
        "sodachi": 3,
        "money": 3
      }
    ],
    "album": "昔も歩いた道に立った。",
    "once": true
  },
  {
    "id": "daily-12",
    "category": "daily",
    "title": "予定のない一日",
    "text": "手帳を開くと、今日の欄だけまっしろ。何も書いていないのに、少しわくわくする。",
    "stages": [
      1,
      8
    ],
    "regions": [
      "forest",
      "sea",
      "city",
      "square"
    ],
    "choices": [
      {
        "label": "気になる方へ行く",
        "text": "小さな寄り道が三つ。手帳には、書ききれない一日になった。",
        "sodachi": 4,
        "money": -2
      },
      {
        "label": "何もしない日と書く",
        "text": "予定どおり、よく休んだ。まっしろな欄に、小さな丸をつけた。",
        "sodachi": 3,
        "money": 2
      }
    ],
    "album": "予定のない日に、自分で予定を選んだ。",
    "once": true
  },
  {
    "id": "friend-01",
    "category": "friend",
    "title": "木の実の行方",
    "text": "おっちょこちょいリスが、落とした木の実を探している。足元で、葉っぱが少しふくらんでいた。",
    "stages": [
      1,
      8
    ],
    "regions": [
      "forest",
      "square"
    ],
    "npc": "squirrel",
    "choices": [
      {
        "label": "葉っぱをそっとめくる",
        "text": "木の実があった。リスは抱えて、今度はゆっくり歩き出した。",
        "sodachi": 4,
        "money": 2
      },
      {
        "label": "一緒に広く探す",
        "text": "探す範囲は広がったけれど、見つからない。休憩のおやつを分け合った。",
        "sodachi": 2,
        "money": 4
      }
    ],
    "album": "リスと木の実を探した。",
    "once": true
  },
  {
    "id": "friend-02",
    "category": "friend",
    "title": "ふくろうの小さな授業",
    "text": "ものしりふくろうが、木の影を指している。「朝と夕方、長さは似ていても向きが違うんだ」。",
    "stages": [
      1,
      5
    ],
    "regions": [
      "forest",
      "square"
    ],
    "npc": "owl",
    "choices": [
      {
        "label": "自分の影で試す",
        "text": "知っているだけの話が、自分の発見になった。ふくろうも、うなずいた。",
        "sodachi": 4,
        "money": 0
      },
      {
        "label": "話を最後まで聞く",
        "text": "影が伸びるまでの間、まだ知らない話をたくさん聞けた。",
        "sodachi": 3,
        "money": 3
      }
    ],
    "album": "ふくろうに、影の向きを教わった。",
    "once": true
  },
  {
    "id": "friend-03",
    "category": "friend",
    "title": "となりの日なた",
    "text": "きまぐれなねこが、今日はこちらの隣で眠っている。起こすほどの用事は、特にない。",
    "stages": [
      1,
      8
    ],
    "regions": [
      "forest",
      "city",
      "square"
    ],
    "npc": "cat_friend",
    "choices": [
      {
        "label": "静かに座る",
        "text": "しばらくして、しっぽがそっと触れた。何も言わなくても、隣にいた。",
        "sodachi": 4,
        "money": 0
      },
      {
        "label": "少し場所を空ける",
        "text": "ねこは伸びをして、その分だけ近づいた。日なたは、二人分あった。",
        "sodachi": 3,
        "money": 3
      }
    ],
    "album": "ねこと、何も話さない時間を過ごした。",
    "once": true
  },
  {
    "id": "friend-04",
    "category": "friend",
    "title": "せっかちなお誘い",
    "text": "せっかちなカタツムリが、雨上がりの葉っぱへ誘ってくれた。気持ちはもう到着しているらしい。",
    "stages": [
      1,
      8
    ],
    "regions": [
      "forest",
      "square"
    ],
    "npc": "snail",
    "choices": [
      {
        "label": "歩調を合わせる",
        "text": "着くまでに、道端の花を全部見つけた。到着より先に、楽しくなった。",
        "sodachi": 4,
        "money": 0
      },
      {
        "label": "先で場所を用意する",
        "text": "乾いた葉を一枚。あとから来たカタツムリは、すぐ次の遊びを提案した。",
        "sodachi": 3,
        "money": 4
      }
    ],
    "album": "カタツムリと、雨上がりの道を楽しんだ。",
    "once": true
  },
  {
    "id": "friend-05",
    "category": "friend",
    "title": "すべりすぎた日",
    "text": "すべりたがりペンギンが、いつもより遠くまで滑った。戻る途中、ちょっと困った顔でこちらを見た。",
    "stages": [
      1,
      8
    ],
    "regions": [
      "sea",
      "square"
    ],
    "npc": "penguin_friend",
    "choices": [
      {
        "label": "帰り道を一緒に歩く",
        "text": "今度は一歩ずつ。さっきの失敗の話が、少しずつ笑い話になった。",
        "sodachi": 4,
        "money": 2
      },
      {
        "label": "滑らない場所を探す",
        "text": "遠回りになったけれど、並んで進めた。「また遊ぼう」が聞こえた。",
        "sodachi": 3,
        "money": 4
      }
    ],
    "album": "ペンギンの失敗から、一緒の帰り道が生まれた。",
    "once": true
  },
  {
    "id": "friend-06",
    "category": "friend",
    "title": "待ち合わせの時計",
    "text": "じかんにルーズなとけいが、約束より少し遅く来た。「途中で、花の開く音を待っていたんだ」。",
    "stages": [
      1,
      8
    ],
    "regions": [
      "forest",
      "sea",
      "city",
      "square"
    ],
    "npc": "clock",
    "choices": [
      {
        "label": "聞こえた音を教わる",
        "text": "二人で耳をすませた。聞こえたかどうかより、待つ時間を覚えていたい。",
        "sodachi": 4,
        "money": 0
      },
      {
        "label": "次の約束を決める",
        "text": "「日がこの木に届くころ」。時計は、いつもより真剣にうなずいた。",
        "sodachi": 3,
        "money": 4
      }
    ],
    "album": "時計と、待つ時間の話をした。",
    "once": true
  },
  {
    "id": "friend-07",
    "category": "friend",
    "title": "旅立つ背中",
    "text": "いつも近くを歩いていたひとなつっこいしばいぬが、今日は別の道を見ている。少し遠くまで散歩に行くらしい。",
    "stages": [
      4,
      8
    ],
    "regions": [
      "forest",
      "city",
      "square"
    ],
    "npc": "shiba",
    "choices": [
      {
        "label": "笑顔で見送る",
        "text": "しっぽが一度、大きく動いた。帰ってきたら聞きたい話が増えた。",
        "sodachi": 5,
        "money": 0,
        "evolve": 1
      },
      {
        "label": "角まで一緒に歩く",
        "text": "分かれ道で歩みを止めた。離れても、今までの散歩はなくならない。",
        "sodachi": 4,
        "money": 0
      }
    ],
    "album": "しばいぬの新しい散歩に立ち会った。",
    "once": true
  },
  {
    "id": "friend-08",
    "category": "friend",
    "title": "言えなかったありがとう",
    "text": "ふわふわヒツジのそばで、前に助けてもらった日のことを思い出した。今日は、言葉にできそうだ。",
    "stages": [
      5,
      8
    ],
    "regions": [
      "forest",
      "sea",
      "city",
      "square"
    ],
    "npc": "sheep",
    "choices": [
      {
        "label": "ありがとうを伝える",
        "text": "ヒツジは少し照れたように、こちらへ寄った。言ってよかった。",
        "sodachi": 5,
        "money": 0,
        "evolve": 1
      },
      {
        "label": "小さな贈り物を置く",
        "text": "返事の代わりに、隣の場所が空いた。ゆっくり座って、同じ景色を見た。",
        "sodachi": 4,
        "money": -3
      }
    ],
    "album": "ヒツジへの感謝を形にした。",
    "once": true
  },
  {
    "id": "romance-01",
    "category": "romance",
    "title": "仕事の合間の夕焼け",
    "text": "ビルのねこ社長が、書類を閉じた。「この時間の空は、会議より先に見ておこう」。",
    "stages": [
      4,
      8
    ],
    "regions": [
      "city",
      "square"
    ],
    "npc": "cat_ceo",
    "choices": [
      {
        "label": "並んで空を見る",
        "text": "近づいた肩は、そのまま。夕焼けが消えるまで、少しだけ特別な時間になった。",
        "sodachi": 4,
        "money": -2,
        "friendshipText": "並んで空を見た。仕事の話をしない時間も、心地よかった。"
      },
      {
        "label": "飲み物を買ってくる",
        "text": "戻ると、二人分の場所が空いていた。冷めないうちに、気持ちを言葉にした。",
        "sodachi": 3,
        "money": -1,
        "friendshipText": "戻ると、二人分の場所が空いていた。今日の出来事をゆっくり話した。"
      }
    ],
    "album": "ねこ社長と、夕焼けを見た。",
    "once": true,
    "friendshipTitle": "会議のあとで",
    "friendshipText": "ビルのねこ社長が、書類を閉じた。忙しい一日の終わりに、友だちと空を見る時間ができた。"
  },
  {
    "id": "romance-02",
    "category": "romance",
    "title": "言葉を覚えるロボット",
    "text": "となりまちのロボットが「会いたかった」を小さく繰り返している。意味を確かめるように、こちらを見た。",
    "stages": [
      4,
      8
    ],
    "regions": [
      "city",
      "square"
    ],
    "npc": "robot_neighbor",
    "choices": [
      {
        "label": "自分の気持ちも伝える",
        "text": "同じ言葉を返すと、ロボットは少し黙った。「今、少しわかった気がする」。",
        "sodachi": 5,
        "money": 0,
        "evolve": 1,
        "friendshipText": "「会えてうれしい」と返すと、ロボットはうなずいた。友だちの言葉を、また一つ覚えた。"
      },
      {
        "label": "急がず隣で過ごす",
        "text": "答えを決めないまま、並んで歩いた。わからない時間も、一緒なら大切だった。",
        "sodachi": 4,
        "money": 0,
        "friendshipText": "答えを急がず、並んで歩いた。うれしい気持ちを、ゆっくり確かめた。"
      }
    ],
    "album": "ロボットと、気持ちを表す言葉を考えた。",
    "once": true,
    "friendshipTitle": "うれしいの意味",
    "friendshipText": "となりまちのロボットが「友だちに会うと、うれしい？」と尋ねた。答えを、ゆっくり考える時間になった。"
  },
  {
    "id": "romance-03",
    "category": "romance",
    "title": "大きな傘の下",
    "text": "もりのクマさんが、大きな傘をこちらへ傾けてくれた。自分の肩は、少しぬれている。",
    "stages": [
      4,
      8
    ],
    "regions": [
      "forest",
      "square"
    ],
    "npc": "forest_bear",
    "choices": [
      {
        "label": "傘を真ん中へ戻す",
        "text": "二人の肩が、同じくらいぬれた。クマさんは笑って、歩幅を合わせた。",
        "sodachi": 4,
        "money": 0,
        "friendshipText": "二人の肩が、同じくらいぬれた。クマさんと笑って、歩幅を合わせた。"
      },
      {
        "label": "雨宿りに誘う",
        "text": "雨音の下で、好きなものの話をした。言葉が途切れても、帰りたくなかった。",
        "sodachi": 5,
        "money": -3,
        "friendshipText": "雨音の下で、好きなものの話をした。友だちの知らなかった一面を聞けた。"
      }
    ],
    "album": "クマさんと、雨を分け合った。",
    "once": true,
    "friendshipTitle": "半分ずつの雨",
    "friendshipText": "もりのクマさんが、傘をこちらへ傾けてくれた。やさしさを、一人だけでもらわない方法を考えた。"
  },
  {
    "id": "romance-04",
    "category": "romance",
    "title": "波打ち際の約束",
    "text": "うみのにんぎょが、陸に続く道を見ている。「そっちには、どんな景色があるの？」。",
    "stages": [
      4,
      8
    ],
    "regions": [
      "sea"
    ],
    "npc": "sea_mermaid",
    "choices": [
      {
        "label": "見えるものから話す",
        "text": "遠くへ急がず、今日見える景色を二人で覚えた。次に会う日の話が、自然に出た。",
        "sodachi": 5,
        "money": 0,
        "friendshipText": "遠くへ急がず、今日見える景色を一緒に覚えた。次は別の景色を教え合うことにした。"
      },
      {
        "label": "小さな絵を描く",
        "text": "絵はあまり似ていない。「あなたの見た世界なんだね」と、にんぎょは大切に受け取った。",
        "sodachi": 4,
        "money": -2,
        "friendshipText": "絵はあまり似ていない。それでも、にんぎょは友だちからの景色を大切に受け取った。"
      }
    ],
    "album": "にんぎょと、海と陸の景色を教え合った。",
    "once": true,
    "friendshipTitle": "海と陸の絵はがき",
    "friendshipText": "うみのにんぎょが、陸の景色に興味を持っている。友だちとして、今見えるものを教え合うことになった。"
  },
  {
    "id": "romance-05",
    "category": "romance",
    "title": "同じ場所、違う明日",
    "text": "待ち合わせの場所で、少し長く話した。明日からは、それぞれ別の道を歩く。それでも今日をなかったことにはしたくない。",
    "stages": [
      6,
      8
    ],
    "regions": [
      "forest",
      "sea",
      "city",
      "square"
    ],
    "choices": [
      {
        "label": "大切だったと伝える",
        "text": "返事を急がず、最後まで話せた。さびしさと、ありがとうを一緒に持って帰った。",
        "sodachi": 4,
        "money": 0,
        "friendshipText": "友だちに、大切な時間だったと伝えた。別々の道でも、今日のことは覚えていよう。"
      },
      {
        "label": "次の便りを約束する",
        "text": "いつ届くかは決めなかった。新しい景色を見たら、最初に伝えたい。",
        "sodachi": 3,
        "money": 4,
        "friendshipText": "新しい景色を見つけたら、便りを送ろう。友だちとの約束を、そっと胸にしまった。"
      }
    ],
    "album": "大切な相手と、それぞれの明日について話した。",
    "once": true,
    "friendshipTitle": "友だちの旅立ち",
    "friendshipText": "友だちと、いつもの場所で話した。明日からは別々の道。離れても、今までの時間は消えない。"
  },
  {
    "id": "romance-06",
    "category": "romance",
    "title": "返事のいらない手紙",
    "text": "書きかけの手紙を、何度も読み返した。「好き」の後に、何を書けばいいのかわからない。",
    "stages": [
      4,
      8
    ],
    "regions": [
      "forest",
      "sea",
      "city",
      "square"
    ],
    "choices": [
      {
        "label": "飾らない言葉で書く",
        "text": "うまく言えないことも、そのまま書いた。返事を待つ前に、自分の気持ちがわかった。",
        "sodachi": 5,
        "money": 0,
        "evolve": 1,
        "friendshipText": "「いつもありがとう」と、飾らない言葉で書いた。友だちを大切に思う気持ちが、紙の上に残った。"
      },
      {
        "label": "今日はしまっておく",
        "text": "今は、届かないままでいい。言葉になる途中の気持ちも、大切にすることにした。",
        "sodachi": 3,
        "money": 3,
        "friendshipText": "今日はしまっておく。感謝を伝える自分らしい方法を、もう少し考えることにした。"
      }
    ],
    "album": "手紙にしたい気持ちを考えた。",
    "once": true,
    "friendshipTitle": "ありがとうの下書き",
    "friendshipText": "友だちへの手紙を書きかけている。「ありがとう」の後に、どの思い出を書こう。"
  },
  {
    "id": "work-01",
    "category": "work",
    "title": "一日だけのお店番",
    "text": "小さなお店で、留守番を頼まれた。最初のお客さんは、値札をじっと見ている。",
    "stages": [
      3,
      8
    ],
    "regions": [
      "city",
      "square"
    ],
    "choices": [
      {
        "label": "ゆっくり説明する",
        "text": "焦らず伝えると、笑顔で買ってもらえた。初めての仕事の手応えが残った。",
        "sodachi": 4,
        "money": 8
      },
      {
        "label": "大きな声で呼びこむ",
        "text": "張り切りすぎて、値段を言い間違えた。差額は自分で直し、次に覚えた。",
        "sodachi": -2,
        "money": 5
      }
    ],
    "album": "お店番で、伝える難しさを知った。",
    "once": true
  },
  {
    "id": "work-02",
    "category": "work",
    "title": "箱いっぱいの書類",
    "text": "ビルのねこ社長の机には、書類が山になっている。「上から片づけたら、下から出てくるんだ」。",
    "stages": [
      4,
      8
    ],
    "regions": [
      "city"
    ],
    "npc": "cat_ceo",
    "choices": [
      {
        "label": "種類ごとに分ける",
        "text": "山が小さな丘になった。社長は「これなら空が見える」と喜んだ。",
        "sodachi": 3,
        "money": 10
      },
      {
        "label": "一気に運ぶ",
        "text": "途中で書類が雪のように舞った。拾い直しながら、順番の大切さを覚えた。",
        "sodachi": -2,
        "money": 12
      }
    ],
    "album": "ねこ社長の書類の山を片づけた。",
    "once": true
  },
  {
    "id": "work-03",
    "category": "work",
    "title": "小さな手づくり市",
    "text": "作ったものを並べてみた。隣のお店より、少しだけ形がいびつ。でも、全部自分で作った。",
    "stages": [
      3,
      8
    ],
    "regions": [
      "forest",
      "city",
      "square"
    ],
    "choices": [
      {
        "label": "作った理由を話す",
        "text": "話を聞いた人が、一つを選んだ。形だけではないところが届いた。",
        "sodachi": 4,
        "money": 7
      },
      {
        "label": "まとめて安く売る",
        "text": "机の上がすっきりした。次に作りたいものの材料代になった。",
        "sodachi": 2,
        "money": 15
      }
    ],
    "album": "手づくり市で、自分の作品を届けた。",
    "once": true
  },
  {
    "id": "work-04",
    "category": "work",
    "title": "海辺の配達",
    "text": "潮風で、配達の宛先が少しにじんでいる。読めるのは「いつもの、あの場所」だけ。",
    "stages": [
      3,
      8
    ],
    "regions": [
      "sea"
    ],
    "choices": [
      {
        "label": "近くで聞いて回る",
        "text": "何度か聞いて、いつもの岩場に着いた。待っていた人が、ほっと笑った。",
        "sodachi": 4,
        "money": 8
      },
      {
        "label": "記憶を頼りに急ぐ",
        "text": "似た岩場を三つ回った。遅くなったけれど、最後はちゃんと届けられた。",
        "sodachi": -1,
        "money": 12
      }
    ],
    "album": "海辺で、にじんだ宛先の荷物を届けた。",
    "once": true
  },
  {
    "id": "work-05",
    "category": "work",
    "title": "あこがれの仕事",
    "text": "前から気になっていた仕事を、少しだけ手伝えることになった。見ていた時より、道具が重い。",
    "stages": [
      4,
      7
    ],
    "regions": [
      "city",
      "square"
    ],
    "choices": [
      {
        "label": "教わった通りに試す",
        "text": "一度ではできなかった。二度目に少しできた。その違いが、うれしかった。",
        "sodachi": 5,
        "money": 5,
        "evolve": 1
      },
      {
        "label": "得意な方法を試す",
        "text": "工夫した部分はうまくいった。難しいところは、素直に教わることにした。",
        "sodachi": 3,
        "money": 10
      }
    ],
    "album": "あこがれの仕事に、自分の手で触れた。",
    "once": true
  },
  {
    "id": "work-06",
    "category": "work",
    "title": "最後まで引き継ぐ",
    "text": "長く使った道具を、次に使う人へ渡す日。説明書には書けない、小さなコツがたくさんある。",
    "stages": [
      6,
      8
    ],
    "regions": [
      "city",
      "square"
    ],
    "choices": [
      {
        "label": "失敗した話も伝える",
        "text": "笑いながら話すうち、相手の緊張がほどけた。道具が、安心して次へ渡った。",
        "sodachi": 5,
        "money": 5
      },
      {
        "label": "手入れをして渡す",
        "text": "使い込んだ傷も、きれいに残った。次の仕事が、ここから始まる。",
        "sodachi": 3,
        "money": 10
      }
    ],
    "album": "大切な道具を次の人に引き継いだ。",
    "once": true
  },
  {
    "id": "adventure-01",
    "category": "adventure",
    "title": "波の向こうの光",
    "text": "浅い波の向こうで、何かがきらり。近くで見るか、岸から確かめるか。",
    "stages": [
      1,
      8
    ],
    "regions": [
      "sea"
    ],
    "choices": [
      {
        "label": "安全な足場から見る",
        "text": "光は、小さな貝の内側だった。濡れずに見つけた宝物を、心にしまった。",
        "sodachi": 3,
        "money": 5
      },
      {
        "label": "波が引く瞬間を待つ",
        "text": "足元まで来た貝を拾えた。タイミングを待つ冒険もあると知った。",
        "sodachi": 5,
        "money": -2
      }
    ],
    "album": "波の中に光るものを見つけた。",
    "once": true
  },
  {
    "id": "adventure-02",
    "category": "adventure",
    "title": "橋の一歩目",
    "text": "小さな橋が、風で少し鳴っている。渡った先の景色は、まだ見えない。",
    "stages": [
      1,
      4
    ],
    "regions": [
      "forest",
      "sea"
    ],
    "choices": [
      {
        "label": "ゆっくり渡る",
        "text": "足元を確かめて、一歩ずつ。向こう岸から見る橋は、さっきより小さかった。",
        "sodachi": 5,
        "money": 0,
        "evolve": 1
      },
      {
        "label": "別の道を選ぶ",
        "text": "遠回りの道に、花が咲いていた。今日は、この冒険でよかった。",
        "sodachi": 3,
        "money": 3
      }
    ],
    "album": "橋の向こうへ進む方法を、自分で選んだ。",
    "once": true
  },
  {
    "id": "adventure-03",
    "category": "adventure",
    "title": "地図のない寄り道",
    "text": "道の先に、小さな坂がある。地図には何も書かれていないけれど、風だけは気持ちよさそう。",
    "stages": [
      1,
      8
    ],
    "regions": [
      "forest",
      "sea",
      "city",
      "square"
    ],
    "choices": [
      {
        "label": "帰り道を覚えて登る",
        "text": "坂の上から、さっきまでいた場所が見えた。地図に小さな印を増やした。",
        "sodachi": 4,
        "money": 3
      },
      {
        "label": "宝物を探してみる",
        "text": "見つかったのは、丸い石。期待とは違ったけれど、ポケットにちょうどよかった。",
        "sodachi": -1,
        "money": 8
      }
    ],
    "album": "地図にない坂へ、寄り道した。",
    "once": true
  },
  {
    "id": "adventure-04",
    "category": "adventure",
    "title": "ころがる荷物",
    "text": "坂道を、誰かの荷物がころころ転がってくる。追いかけるには、少し距離がある。",
    "stages": [
      2,
      8
    ],
    "regions": [
      "city",
      "square"
    ],
    "choices": [
      {
        "label": "先で受け止める",
        "text": "両側を確かめて待つと、荷物が足元へ。持ち主のお礼が、息を切らして届いた。",
        "sodachi": 4,
        "money": 5
      },
      {
        "label": "声をかけて知らせる",
        "text": "近くの人が止めてくれた。一人で全部しなくても、助けることはできた。",
        "sodachi": 3,
        "money": 7
      }
    ],
    "album": "転がる荷物に気づいて行動した。",
    "once": true
  },
  {
    "id": "adventure-05",
    "category": "adventure",
    "title": "暗い道の小さな灯り",
    "text": "夕方の道で、ひかるチョウチンアンコウが明かりを向けてくれた。暗い場所では、いつもより楽しそう。",
    "stages": [
      1,
      8
    ],
    "regions": [
      "sea"
    ],
    "npc": "anglerfish",
    "choices": [
      {
        "label": "光を頼りに進む",
        "text": "暗さの中に、今まで見えなかった色があった。少しだけ、夜が好きになった。",
        "sodachi": 4,
        "money": 2
      },
      {
        "label": "見つけたものを教える",
        "text": "小さな影や波の形を、順番に教え合った。道が短く感じた。",
        "sodachi": 3,
        "money": 5
      }
    ],
    "album": "チョウチンアンコウと、夜の景色を見た。",
    "once": true
  },
  {
    "id": "adventure-06",
    "category": "adventure",
    "title": "風に飛んだ帽子",
    "text": "風が、誰かの帽子をさらった。枝に引っかかった帽子は、すっかり鳥の巣の顔をしている。",
    "stages": [
      1,
      8
    ],
    "regions": [
      "forest",
      "square"
    ],
    "choices": [
      {
        "label": "届く道具を借りる",
        "text": "長い枝を借りて、そっと下ろした。帽子は、また帽子の顔に戻った。",
        "sodachi": 4,
        "money": 3
      },
      {
        "label": "落ちるまで待つ",
        "text": "次の風で、さらに高い枝へ。今日は届かず、持ち主に場所を伝えた。",
        "sodachi": -2,
        "money": 8
      }
    ],
    "album": "風に飛んだ帽子を見つけた。",
    "once": true
  },
  {
    "id": "adventure-07",
    "category": "adventure",
    "title": "お祭りの迷子係",
    "text": "にぎやかな広場で、離ればなれになった二人を探すことになった。手がかりは「一番楽しそうなところ」。",
    "stages": [
      3,
      8
    ],
    "regions": [
      "square",
      "city"
    ],
    "choices": [
      {
        "label": "待ち合わせ場所を作る",
        "text": "目印を決めて呼びかけたら、二人とも来た。再会の笑顔が、今日のお祭りになった。",
        "sodachi": 5,
        "money": 4
      },
      {
        "label": "会場を一周する",
        "text": "同じ人と三度すれ違った。最後は係の場所で会えて、みんなで笑った。",
        "sodachi": -1,
        "money": 10
      }
    ],
    "album": "お祭りで、離ればなれの二人をつないだ。",
    "once": true
  },
  {
    "id": "adventure-08",
    "category": "adventure",
    "title": "こわれた看板",
    "text": "分かれ道の看板が、反対を向いている。誰かが迷う前に、できることはあるだろうか。",
    "stages": [
      2,
      8
    ],
    "regions": [
      "forest",
      "city",
      "square"
    ],
    "choices": [
      {
        "label": "向きを確かめて直す",
        "text": "道を確かめ、看板を戻した。後から来た人が、迷わず進んでいった。",
        "sodachi": 4,
        "money": 4
      },
      {
        "label": "案内役になる",
        "text": "しばらく立って案内した。声は少しかれたけれど、町の道に詳しくなった。",
        "sodachi": 3,
        "money": 8
      }
    ],
    "album": "分かれ道の案内に力を貸した。",
    "once": true
  },
  {
    "id": "adventure-09",
    "category": "adventure",
    "title": "忘れていた挑戦",
    "text": "前にできなかった遊びを、もう一度見かけた。あの日より少し成長した自分で、向き合ってみる。",
    "stages": [
      5,
      8
    ],
    "regions": [
      "sea",
      "square"
    ],
    "choices": [
      {
        "label": "もう一度挑む",
        "text": "途中までは前と同じ。最後の一歩だけ、今度はできた。",
        "sodachi": 5,
        "money": 0,
        "evolve": 1
      },
      {
        "label": "挑む人を応援する",
        "text": "応援しているうち、自分の時に欲しかった言葉がわかった。",
        "sodachi": 4,
        "money": 2
      }
    ],
    "album": "前にできなかった挑戦を、違う気持ちで見つめた。",
    "once": true
  },
  {
    "id": "adventure-10",
    "category": "adventure",
    "title": "遠くへ続く道",
    "text": "旅の終わりが近づいても、道はまだ続いている。全部を見ることはできない。それでも、今日の景色は選べる。",
    "stages": [
      6,
      8
    ],
    "regions": [
      "forest",
      "sea",
      "city",
      "square"
    ],
    "choices": [
      {
        "label": "まだ知らない方へ",
        "text": "初めての風を受けた。年を重ねても、初めてはなくならない。",
        "sodachi": 5,
        "money": 1
      },
      {
        "label": "好きだった場所へ戻る",
        "text": "同じ場所に、違う自分で立った。懐かしさと新しさが、並んでいた。",
        "sodachi": 4,
        "money": 5
      }
    ],
    "album": "旅の終わりに、行きたい道を選んだ。",
    "once": true
  },
  {
    "id": "fate-01",
    "category": "fate",
    "title": "時計の忘れもの",
    "text": "じかんにルーズなとけいが、針を一本ぶん首をかしげた。「若いころの景色、もう一度見てみる？」。",
    "stages": [
      2,
      8
    ],
    "regions": [
      "forest",
      "sea",
      "city",
      "square"
    ],
    "npc": "clock",
    "choices": [
      {
        "label": "少しだけ戻ってみる",
        "text": "景色は同じなのに、目線が変わった。覚えていることを持ったまま、もう一度歩こう。",
        "sodachi": 3,
        "money": 0,
        "time": -1
      },
      {
        "label": "今の自分で進む",
        "text": "「それもいいね」。時計は、今度は前を向いた。",
        "sodachi": 3,
        "money": 5
      }
    ],
    "album": "時計と、時間の進む向きを考えた。",
    "once": true
  },
  {
    "id": "fate-02",
    "category": "fate",
    "title": "もう一枚のページ",
    "text": "アルバムの間に、白いページが見つかった。あの日と違う選択を、ここへ書き足せそうだ。",
    "stages": [
      1,
      8
    ],
    "regions": [
      "forest",
      "sea",
      "city",
      "square"
    ],
    "choices": [
      {
        "label": "違う選択を体験する",
        "text": "過去は消さない。もう一つの選び方を、新しいページへ。",
        "sodachi": 0,
        "money": 0,
        "redo": true
      },
      {
        "label": "今の思い出を大切にする",
        "text": "白いページは、次の出来事のために残した。",
        "sodachi": 3,
        "money": 5
      }
    ],
    "album": "アルバムの白いページを見つけた。",
    "once": true
  },
  {
    "id": "fate-03",
    "category": "fate",
    "title": "時間のいたずら",
    "text": "広場の針が、くるりと回る。進んだのか、戻ったのか。風だけが、事情を知っていそう。",
    "stages": [
      1,
      8
    ],
    "regions": [
      "forest",
      "sea",
      "city",
      "square"
    ],
    "choices": [
      {
        "label": "未来の風に乗る",
        "text": "少し先の自分になった。何ができるかは、これから確かめよう。",
        "sodachi": 2,
        "money": 0,
        "time": 1
      },
      {
        "label": "昔の風に触れる",
        "text": "体は少し若くなった。覚えたことは、ちゃんとここにある。",
        "sodachi": 3,
        "money": 0,
        "time": -1
      }
    ],
    "album": "いたずらな時間の風に出会った。",
    "once": true
  },
  {
    "id": "fate-04",
    "category": "fate",
    "title": "八つ目の窓",
    "text": "並んだ窓の一つに、まだ見たことのない景色が映る。今まで選んできた道が、後ろに続いている。",
    "stages": [
      6,
      8
    ],
    "regions": [
      "forest",
      "sea",
      "city",
      "square"
    ],
    "choices": [
      {
        "label": "窓を開ける",
        "text": "新しい風が入ってきた。最後の姿でも、人生はまだ動いている。",
        "sodachi": 5,
        "money": 0,
        "evolve": 1
      },
      {
        "label": "後ろの道を眺める",
        "text": "失敗も寄り道も、ここへ続いていた。一つずつ、覚えていたい。",
        "sodachi": 4,
        "money": 10
      }
    ],
    "album": "八つ目の窓の前に立った。",
    "once": true
  }
];
