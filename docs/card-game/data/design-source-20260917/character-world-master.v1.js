// なおとっち キャラクター/世界マスター v1
// NOTE:
// - script.js が現在のキャラクター構成・表示名・互換IDを読み込む。
// - 既存の表示・セーブ・ミニゲーム・季節挙動は変更しない。
// - 実装移行時は stable id を維持し、表示名変更でセーブ互換を壊さない。

const NAOTOCCHI_CHARACTER_WORLD_MASTER_V1 = {
  principles: {
    playerSpecies: '8段階それぞれの見た目と人生が面白いことを最優先する',
    companion: '通常なかまは原則どの通常地域でも出会え、一人生で無理なく全員を集められる',
    companionDisplay: '仲間は現在の左右に連なる表示を維持し、人数が増えるほど行列が賑やかになる',
    partner: 'こいびとは初遭遇地域を持つ。成立後は現在仕様どおり他地域へ一緒に移動できる',
    region: '地域は恋人初遭遇・地域イベント・地域ミニゲーム・伝説補正の差を作る',
    season: '季節は地域から独立。auto/春/夏/秋/冬の選択と背景差分を維持する',
    timeWeather: '時間帯・天気は将来の独立軸。通常キャラ獲得の必須ロックにはしない',
    legends: '現行5伝説を維持。地域は出現率補正に使えても完全ロックにはしない',
    visuals: '卵・種子そのものは8段階に含めず、単なる拡大縮小だけの段階は禁止',
  },

  playerSpecies: {
    normal: [
      { id: 'man', label: 'おとこのひと', stages: ['あかちゃん','よちよち','子ども','少年','若者','大人','落ちついた大人','おじいさん'] },
      { id: 'woman', label: 'おんなのひと', stages: ['あかちゃん','よちよち','子ども','少女','若者','大人','落ちついた大人','おばあさん'] },
      { id: 'dog', label: 'いぬ', stages: ['あかちゃんいぬ','よちよちこいぬ','こいぬ','わんぱくいぬ','若いいぬ','大人のいぬ','落ちついたいぬ','おとしよりのいぬ'] },
      { id: 'cat', label: 'ねこ', stages: ['あかちゃんねこ','よちよちこねこ','こねこ','おてんばねこ','若いねこ','大人のねこ','落ちついたねこ','おとしよりのねこ'] },
      { id: 'penguin', label: 'ペンギン', stages: ['小さなひな','ふわふわのひな','大きなひな','羽の衣替え中','若いペンギン','大人のペンギン','ベテランペンギン','おとしよりペンギン'] },
      { id: 'turtle', label: 'かめ', stages: ['うまれたてのかめ','ちびがめ','子がめ','若いかめ','大人のかめ','大きなかめ','古いかめ','長生きのかめ'] },
      { id: 'frog', label: 'かえる', stages: ['ちびおたま','おたまじゃくし','後ろ足が出たおたま','しっぽつきかえる','陸に上がったかえる','子がえる','大人のかえる','おとしよりのかえる'] },
      { id: 'salmon', label: 'さけ', stages: ['うまれたてのさけ','小さなさけ','しま模様のさけ','銀色のさけ','海の若いさけ','大人のさけ','川をのぼるさけ','赤く色づくさけ'] },
      { id: 'clownfish', label: 'カクレクマノミ', stages: ['透けたあかちゃん','しまが出た子','かくれんぼの子','若いクマノミ','群れのクマノミ','卵を守るオス','メスへ変わる途中','群れのリーダーのメス'] },
      { id: 'butterfly', label: 'ちょう', stages: ['うまれたてのいもむし','育ちざかりのいもむし','大きないもむし','さなぎの準備中','さなぎ','羽を広げたちょう','花めぐりのちょう','年を重ねたちょう'] },
      { id: 'beetle', label: 'カブトムシ', stages: ['うまれたての幼虫','育ちざかりの幼虫','まるまる幼虫','さなぎ','出たてのカブトムシ','若いカブトムシ','りっぱなカブトムシ','長生きカブトムシ'] },
      { id: 'stagbeetle', label: 'クワガタムシ', stages: ['うまれたての幼虫','育ちざかりの幼虫','大きな幼虫','さなぎ','出たてのクワガタ','若いクワガタ','りっぱなクワガタ','長生きクワガタ'] },
      { id: 'cicada', label: 'セミ', stages: ['小さな幼虫','土ぐらしの幼虫','旅立ち前の幼虫','地上に出たセミ','ぬけがらをぬぐセミ','若いセミ','よく鳴くセミ','年を重ねたセミ'] },
      { id: 'antlion', label: 'アリジゴク', stages: ['ちびアリジゴク','巣作りアリジゴク','大きなアリジゴク','砂のまゆ','まゆの中のさなぎ','出たてのウスバカゲロウ','飛び回るウスバカゲロウ','羽休めのウスバカゲロウ'] },
      { id: 'hermit_crab', label: 'ヤドカリ', stages: ['ちびヤドカリ','小さな貝の家','引っ越し中','若いヤドカリ','ゆったり貝の家','大きな貝の家','ごうかな貝の家','ベテランヤドカリ'] },
      { id: 'jellyfish', label: 'クラゲ', stages: ['岩ぐらしの子','重なった子','星形の子','小さなかさ','若いクラゲ','大人のクラゲ','大きなクラゲ','年を重ねたクラゲ'] },
      { id: 'starfish', label: 'ヒトデ', stages: ['丸いあかちゃん','透けた小さな星','色づく小さな星','ふっくらした星','金色の子ヒトデ','ぶつぶつ子ヒトデ','大人のヒトデ','大きなヒトデ'] },
      { id: 'coral', label: 'サンゴ', stages: ['住みついた子','ひとつのサンゴ','枝分かれサンゴ','小さなサンゴの森','若いサンゴの森','色とりどりのサンゴ','大きなサンゴの森','広がるサンゴの海'] },
      { id: 'dandelion', label: 'タンポポ', stages: ['芽ぶきのたね','ふたば','地面に広がる葉','葉がしげるタンポポ','つぼみ','花咲くタンポポ','わたげ','旅立つたね'] },
      { id: 'sakura', label: 'サクラ', stages: ['芽ぶきのたね','ふたばのサクラ','小さなサクラ','育ったサクラ','サクラのつぼみ','サクラの花','サクラの実','年を重ねたサクラ'] },
      { id: 'venus_flytrap', label: 'ハエトリグサ', stages: ['目覚めるたね','小さな口の芽','若葉のハエトリグサ','口を広げた葉','育ちざかりの葉','大きな口の葉','口がいっぱい','花咲くハエトリグサ'] },
      { id: 'mushroom', label: 'キノコ', stages: ['キノコの小さな粒','広がるキノコの糸','小さなキノコの芽','のびる子キノコ','育ちざかりのキノコ','かさを広げたキノコ','粉を飛ばすキノコ','年を重ねたキノコ'] },
    ],
    rare: [
      { id: 'dragon', label: 'りゅう', stages: ['ちびりゅう','子りゅう','つのの生えたりゅう','小さなつばさのりゅう','つばさの育ったりゅう','火をふくりゅう','大きなりゅう','いにしえのりゅう'] },
      { id: 'phoenix', label: 'フェニックス', stages: ['火のひな','よちよち火の鳥','若い火の鳥','空を飛ぶ火の鳥','燃えさかる火の鳥','金色の火の鳥','年を重ねた火の鳥','灰からよみがえる鳥'] },
      { id: 'god', label: 'かみさま', stages: ['光の粒','光の子','小さな精霊','見習いかみさま','かみさま','大いなるかみさま','神々しい光','光そのもの'] },
      { id: 'world_tree', label: '世界樹', stages: ['光る芽','ふしぎな苗','小さな木','精霊の木','大樹','巨大な木','雲をこえる木','世界樹'] },
      { id: 'ghost', label: 'おばけ', stages: ['小さなたましい','ちびおばけ','いたずらおばけ','おばけ','大きなおばけ','昔からいるおばけ','おだやかなおばけ','旅立ち前のおばけ'] },
      { id: 'star', label: 'ほし', stages: ['星のもとの雲','集まる星の雲','うまれかけの星','若い星','輝く星','ふくらんだ星','はじける星','星のなごり'] },
      { id: 'plush', label: 'ぬいぐるみ', stages: ['新品のぬいぐるみ','遊び相手','お気に入り','よごれたぬいぐるみ','ほつれたぬいぐるみ','つぎはぎ','くたくた','大切な宝物'] },
      { id: 'unknown', label: '？？？', stages: ['点','ぷる','足？','目？','羽？','でっかい？','ちっちゃい？','点……？'] },
    ],
    secret: [
      { id: 'ren', label: 'れんくん', stages: ['ちびれん','げんきれん','子どもれん','少年れん','若者れん','大人れん','年を重ねたれん','おじいちゃんれん'], design: '本人写真を参照した黒髪の流し前髪・明るい表情を核に、同じ一人が乳幼児→幼児→子ども→少年→若者→成人→中高年→高齢へ明確に年齢を重ねる専用8段階。サッカー好きの要素は主に子ども期へ。通常人間ラインの色違い、単なるサイズ違いは禁止' },
    ],
    author: { id: 'naoto', label: 'ナオト', playable: false, asset: 'assets/characters/author/naoto.png', design: '作者シークレット。承認済み「なおとのスペシャルキャラクターシート」の前向き立ち姿を基準にした128×128ドット絵。中央分けの黒褐色の髪、白いパーカー、暗色の服、穏やかな閉じ口の笑顔。実在本人の顔立ちは参照画像なしに想像しない' },
  },

  companions: {
    assetRule: 'assets/characters/companions/<id>.png',
    normal: [
      { id: 'cat_friend', label: 'きまぐれなねこ', behavior: '自由に寝る・箱に入る', asset: 'assets/characters/companions/cat_friend.png' },
      { id: 'rabbit_friend', label: 'すばしっこいうさぎ', behavior: '急に横切る・跳ねる', asset: 'assets/characters/companions/rabbit_friend.png' },
      { id: 'tanuki', label: 'いたずらたぬき', behavior: '他の仲間にちょっかいを出す', asset: 'assets/characters/companions/tanuki.png' },
      { id: 'squirrel', label: 'おっちょこちょいリス', behavior: '木の実を運んで落とす', asset: 'assets/characters/companions/squirrel.png' },
      { id: 'owl', label: 'ものしりふくろう', behavior: '時々豆知識を言う', asset: 'assets/characters/companions/owl.png' },
      { id: 'otter', label: 'あそびずきカワウソ', behavior: '物を転がす・滑らせる', asset: 'assets/characters/companions/otter.png' },
      { id: 'hamster', label: 'ほおぶくろハムスター', behavior: 'ごはんを頬に詰める', asset: 'assets/characters/companions/hamster.png' },
      { id: 'panda', label: 'ぐうたらパンダ', behavior: '食べる→寝る', asset: 'assets/characters/companions/panda.png' },
      { id: 'monkey', label: 'まねっこサル', behavior: '主人公の動きを真似する', asset: 'assets/characters/companions/monkey.png' },
      { id: 'parrot', label: 'おしゃべりオウム', behavior: '他キャラの言葉を真似する', asset: 'assets/characters/companions/parrot.png' },
      { id: 'sheep', label: 'ふわふわヒツジ', behavior: '他の仲間が寄りかかる', asset: 'assets/characters/companions/sheep.png' },
      { id: 'seal', label: 'ごろごろアザラシ', behavior: '転がって移動する', asset: 'assets/characters/companions/seal.png' },
      { id: 'bat', label: 'よふかしコウモリ', behavior: '逆さにぶら下がる', asset: 'assets/characters/companions/bat.png' },
      { id: 'chicken', label: 'はやおきニワトリ', behavior: '朝っぽい演出で鳴く', asset: 'assets/characters/companions/chicken.png' },
      { id: 'penguin_friend', label: 'すべりたがりペンギン', behavior: '腹ばいで滑る', asset: 'assets/characters/companions/penguin_friend.png' },
      { id: 'hedgehog', label: 'びっくりハリネズミ', behavior: '驚くと丸くなる', asset: 'assets/characters/companions/hedgehog.png' },
      { id: 'shiba', label: 'ひとなつっこいしばいぬ', behavior: '主人公の近くを歩く', asset: 'assets/characters/companions/shiba.png' },
      { id: 'snail', label: 'せっかちなカタツムリ', behavior: '気持ちは先へ急ぐが、からだはゆっくり。雨と葉っぱが好きで、思いついた遊びにすぐ誘う', asset: 'assets/characters/companions/snail.png' },
    ],
    rare: [
      { id: 'punyu', label: 'とけかけのぷにゅ', asset: 'assets/characters/companions/punyu.png' },
      { id: 'sekizou', label: 'むひょうじょうのせきぞう', asset: 'assets/characters/companions/sekizou.png' },
      { id: 'chameleon', label: 'サングラスのカメレオン', asset: 'assets/characters/companions/chameleon.png' },
      { id: 'clock', label: 'じかんにルーズなとけい', behavior: '時刻は大まか。小さな出来事の音を覚えていて、誰かを待つ時間は気にしない', asset: 'assets/characters/companions/clock.png' },
      { id: 'unicorn', label: 'まよいこんだユニコーン', asset: 'assets/characters/companions/unicorn.png' },
      { id: 'many_tail_fox', label: 'しっぽのおおいきつね', asset: 'assets/characters/companions/many_tail_fox.png' },
      { id: 'watcher', label: 'みているなにか', asset: 'assets/characters/companions/watcher.png' },
      { id: 'box', label: 'ただのはこ', asset: 'assets/characters/companions/box.png' },
    ],
  },

  regions: {
    home: { id: 'home', label: 'おうち', role: '拠点', normalTravelRegion: false },
    normal: [
      { id: 'city', label: 'とかい' },
      { id: 'countryside', label: 'いなか' },
      { id: 'forest', label: 'もり' },
      { id: 'mountain', label: 'やま' },
      { id: 'snow', label: 'ゆきぐに' },
      { id: 'sea', label: 'うみ' },
      { id: 'deepsea', label: 'しんかい' },
      { id: 'river_lake', label: 'みずべ' },
      { id: 'jungle', label: 'ジャングル' },
      { id: 'desert', label: 'さばく' },
    ],
    special: [
      { id: 'star_stop', label: 'ほしぞらのていりゅうじょ' },
      { id: 'memory_lake', label: 'きおくのみずうみ' },
    ],
  },

  partnerAssetRule: 'assets/characters/partners/<id>.png',

  partners: [
    { id: 'cat_ceo', label: 'ビルのねこ社長', firstRegion: 'city', hook: '仕事人なのにデートのため普通にサボる', asset: 'assets/characters/partners/cat_ceo.png' },
    { id: 'robot_neighbor', label: 'となりまちのロボット', firstRegion: 'city', hook: '感情を少しずつ覚える', asset: 'assets/characters/partners/robot_neighbor.png' },
    { id: 'field_cow', label: 'のはらのうしさん', firstRegion: 'countryside', hook: '何年経っても草をくれる', asset: 'assets/characters/partners/field_cow.png' },
    { id: 'sunflower_partner', label: 'はたけのひまわりさん', firstRegion: 'countryside', hook: '主人公の方を向く', asset: 'assets/characters/partners/sunflower_partner.png' },
    { id: 'forest_bear', label: 'もりのクマさん', firstRegion: 'forest', hook: '大きくて優しい', asset: 'assets/characters/partners/forest_bear.png' },
    { id: 'grove_deer', label: 'こだちのシカ', firstRegion: 'forest', hook: '最初は逃げるが徐々に近づく', asset: 'assets/characters/partners/grove_deer.png' },
    { id: 'cliff_goat', label: 'がけのヤギさん', firstRegion: 'mountain', hook: '毎回ありえない場所にいる', asset: 'assets/characters/partners/cliff_goat.png' },
    { id: 'high_eagle', label: 'たかねのワシ', firstRegion: 'mountain', hook: '無口だが年月とともに心を開く', asset: 'assets/characters/partners/high_eagle.png' },
    { id: 'snow_spirit', label: 'ゆきのせいれい', firstRegion: 'snow', hook: '主人公が老いても姿が変わらない', asset: 'assets/characters/partners/snow_spirit.png' },
    { id: 'snowman', label: 'とけないゆきだるま', firstRegion: 'snow', hook: '暖かい地域へのデートが大変', asset: 'assets/characters/partners/snowman.png' },
    { id: 'rock_octopus', label: 'いわばのタコさん', firstRegion: 'sea', hook: '8本腕の世話焼き', asset: 'assets/characters/partners/rock_octopus.png' },
    { id: 'sea_mermaid', label: 'うみのにんぎょ', firstRegion: 'sea', hook: '主人公と陸の世界を知っていく', asset: 'assets/characters/partners/sea_mermaid.png' },
    { id: 'anglerfish', label: 'ひかるチョウチンアンコウ', firstRegion: 'deepsea', hook: '暗所では積極的、明るい場所では照れる', asset: 'assets/characters/partners/anglerfish.png' },
    { id: 'swamp_croc', label: 'ぬまのワニさん', firstRegion: 'river_lake', hook: '強面なのに照れ屋', asset: 'assets/characters/partners/swamp_croc.png' },
    { id: 'gentle_gorilla', label: 'やさしいゴリラ', firstRegion: 'jungle', hook: '怪力なのに繊細', asset: 'assets/characters/partners/gentle_gorilla.png' },
    { id: 'knitting_spider', label: 'あみものがすきなクモさん', firstRegion: 'jungle', hook: '巣と糸でいろいろ作る', asset: 'assets/characters/partners/knitting_spider.png' },
    { id: 'desert_scorpion', label: 'さばくのサソリさん', firstRegion: 'desert', hook: '無口だが行動で優しさを示す', asset: 'assets/characters/partners/desert_scorpion.png' },
    { id: 'oasis_cactus', label: 'オアシスのサボテンさん', firstRegion: 'desert', hook: '抱きしめたいが抱きしめづらい', asset: 'assets/characters/partners/oasis_cactus.png' },
  ],

  legends: [
    { id: 'gate', label: 'そらにうかぶとりい', keepCurrent: true, affinityRegions: ['countryside','star_stop'] },
    { id: 'stairs', label: 'どこにもつながらないかいだん', keepCurrent: true, affinityRegions: ['desert'] },
    { id: 'boss', label: 'あやまりにきただいおういか', keepCurrent: true, affinityRegions: ['sea','deepsea'] },
    { id: 'lamp', label: 'よなかのあかり', keepCurrent: true, affinityRegions: ['forest','countryside'] },
    { id: 'mirror', label: 'としをとったじぶん', keepCurrent: true, affinityRegions: ['river_lake','memory_lake'] },
  ],


  compatibility: {
    // 旧IDを「似ている新キャラ」へ無理に変換しない。
    // 同一キャラクター/同一概念と判断できるものだけ alias を張り、
    // それ以外は legacy-only として旧IDを保持する。
    speciesAliases: {
      dog: 'dog',
      cat: 'cat',
      man: 'man',
      woman: 'woman',
      beetle: 'beetle',
      stagbeetle: 'stagbeetle',
      dragon: 'dragon',
      god: 'god',
      ren: 'ren',
      phoenix: 'phoenix',
    },
    legacyOnlySpecies: [
      'bird','rabbit','fish','panda','fox','owl','plant','robot','dinosaur','mermaid','unicorn',
    ],

    companionAliases: {
      shiba: 'shiba',
      tanuki: 'tanuki',
      penguin: 'penguin_friend',
      owl: 'owl',
      rabbit: 'rabbit_friend',
      hedgehog: 'hedgehog',
      koala: 'snail',
      otter: 'otter',
      hamster: 'hamster',
      squirrel: 'squirrel',
      punyu: 'punyu',
      sekizou: 'sekizou',
      chameleon: 'chameleon',
      kinoko: 'clock',
    },
    legacyOnlyCompanions: ['hakuchou'],

    partnerAliases: {
      mermaid: 'sea_mermaid',
      'snow-spirit': 'snow_spirit',
      'cabin-bear': 'forest_bear',
      'town-robot': 'robot_neighbor',
      'ceo-cat': 'cat_ceo',
      'field-sunflower': 'sunflower_partner',
      'meadow-cow': 'field_cow',
      'desert-scorpion': 'desert_scorpion',
    },
    legacyOnlyPartners: [
      'neighbor-cat','park-dog','surfer-turtle','forest-fox','tree-squirrel',
      'oasis-camel','tropical-parrot','palm-lizard',
    ],

    regionAliases: {
      home: 'home',
      sea: 'sea',
      snow: 'snow',
      city: 'city',
      countryside: 'countryside',
      forest: 'forest',
      desert: 'desert',
      tropical: 'jungle',
      star_stop: 'star_stop',
      memory_lake: 'memory_lake',
    },

    policy: {
      preserveRawSaveIds: true,
      migrateOnlyExactAliases: true,
      unknownSpeciesPolicy: 'keep-legacy-id-and-render-with-legacy-definition-until-life-reset',
      unknownCompanionPolicy: 'keep-legacy-id-and-render-with-legacy-definition',
      unknownPartnerPolicy: 'keep-current-partner-snapshot-and-legacy-id',
      unknownRegionFallback: 'home',
      migrationTiming: 'current-life values are preserved; new pools apply from new encounters/new lives unless exact alias is safe',
    },
  },

  migration: {
    strategy: '旧ID→新stable idの明示マップを用意し、未知IDは削除せず安全なフォールバックへ',
    doNotChangeYet: [
      'SAVE_KEY',
      'seasonMode',
      '既存地域背景CSS',
      '地域限定ミニゲーム抽選',
      '恋人/仲間の現在表示',
      '伝説5ムービー',
    ],
  },

  regressionChecks: [
    '仲間が左右に連なって表示される',
    '通常仲間は一人生で無理なく全員仲間にできる',
    '仲間は全通常地域で出会える',
    '恋人は初遭遇地域を持つが成立後は他地域へ移動できる',
    '季節auto/春/夏/秋/冬の独立選択と背景変化が維持される',
    '8段階に卵・種子を含めない',
    '人間の6/7/8が明確に異なる',
    'カブト/クワガタ1段階目が卵に見えない',
    '伝説5件の内容とムービーが維持される',
    '既存セーブを壊さない',
  ],
};

if (typeof window !== 'undefined') {
  window.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1 = NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;
}
