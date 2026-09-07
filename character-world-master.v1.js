// なおとっち キャラクター/世界マスター v1
// NOTE:
// - このファイルは設計固定用。現時点では script.js から読み込まない。
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
      { id: 'man', label: 'おとこのひと', stages: ['乳児','よちよち','幼児','少年','青年','成人','中高年','老人'] },
      { id: 'woman', label: 'おんなのひと', stages: ['乳児','よちよち','幼児','少女','青年','成人','中高年','老人'] },
      { id: 'dog', label: 'いぬ', stages: ['新生仔','子犬','幼犬','若犬','若成犬','成犬','シニア','老犬'] },
      { id: 'cat', label: 'ねこ', stages: ['新生仔','子猫','幼猫','若猫','若成猫','成猫','シニア','老猫'] },
      { id: 'penguin', label: 'ペンギン', stages: ['小雛','綿毛雛','大雛','換羽中','若鳥','成鳥','老成鳥','老鳥'] },
      { id: 'turtle', label: 'かめ', stages: ['孵化仔','小亀','幼亀','若亀','成亀','大亀','古亀','老亀'] },
      { id: 'frog', label: 'かえる', stages: ['小オタマ','オタマ','後脚','四肢＋尾','変態直後','子ガエル','成体','老成体'] },
      { id: 'salmon', label: 'さけ', stages: ['仔魚','稚魚','パー','スモルト','海洋若魚','成魚','遡上魚','婚姻色成熟魚'] },
      { id: 'clownfish', label: 'カクレクマノミ', stages: ['仔魚','稚魚','幼魚','若魚','群れ成魚','繁殖雄','性転換中','成熟雌'] },
      { id: 'butterfly', label: 'ちょう', stages: ['初齢幼虫','中齢幼虫','終齢幼虫','前蛹','蛹','羽化直後','成虫','老成虫'] },
      { id: 'beetle', label: 'カブトムシ', stages: ['初齢幼虫','二齢幼虫','三齢幼虫','成熟幼虫','前蛹','蛹','若成虫','成虫'] },
      { id: 'stagbeetle', label: 'クワガタムシ', stages: ['初齢幼虫','二齢幼虫','三齢幼虫','成熟幼虫','前蛹','蛹','若成虫','成虫'] },
      { id: 'cicada', label: 'セミ', stages: ['若齢幼虫','幼虫','大幼虫','終齢幼虫','地上脱出','羽化中','若成虫','成虫'] },
      { id: 'antlion', label: 'アリジゴク', stages: ['小幼虫','巣作り幼虫','成長幼虫','巨大幼虫','繭','蛹','羽化','ウスバカゲロウ'] },
      { id: 'hermit_crab', label: 'ヤドカリ', stages: ['極小幼体','小殻','殻交換','若個体','中型殻','大型殻','豪華な殻','老個体'] },
      { id: 'jellyfish', label: 'クラゲ', stages: ['プラヌラ','ポリプ','成熟ポリプ','ストロビラ','エフィラ','若クラゲ','成体','大型成熟体'] },
      { id: 'starfish', label: 'ヒトデ', stages: ['幼生I','幼生II','着底','変態','極小ヒトデ','小ヒトデ','成体','大型成体'] },
      { id: 'coral', label: 'サンゴ', stages: ['着底幼生','1ポリプ','出芽','小群体','若群体','成熟群体','大群体','巨大群体'] },
      { id: 'dandelion', label: 'タンポポ', stages: ['発芽','双葉','ロゼット','成長株','蕾','開花','綿毛','種を飛ばす株'] },
      { id: 'sakura', label: 'サクラ', stages: ['発芽','小苗','苗木','幼木','若木','初開花','満開成木','老桜'] },
      { id: 'venus_flytrap', label: 'ハエトリグサ', stages: ['発芽','小苗','小捕虫葉','若株','成長株','成株','開花株','老成巨大株'] },
      { id: 'mushroom', label: 'キノコ', stages: ['菌糸','菌糸網','原基','幼菌','若菌','成菌','胞子成熟','老菌'] },
    ],
    rare: [
      { id: 'dragon', label: 'りゅう', stages: ['ちび竜','幼竜','角竜','翼芽竜','翼竜','火炎竜','巨竜','古龍'] },
      { id: 'phoenix', label: 'フェニックス', stages: ['火の雛','幼火鳥','若火鳥','火鳥','炎鳥','黄金鳥','老火鳥','灰から再生'] },
      { id: 'god', label: 'かみさま', stages: ['光の粒','光の子','精霊','小神','神','大神','神格','光そのもの'] },
      { id: 'world_tree', label: '世界樹', stages: ['光る芽','神秘の苗','幼樹','精霊樹','大樹','巨大樹','天空樹','世界樹'] },
      { id: 'ghost', label: 'おばけ', stages: ['小さな魂','小幽霊','幼い怪異','おばけ','大怪異','古い霊','穏やかな霊','成仏寸前'] },
      { id: 'star', label: 'ほし', stages: ['星間雲','凝縮雲','原始星','若い恒星','恒星','巨星','超新星','星の残骸'] },
      { id: 'plush', label: 'ぬいぐるみ', stages: ['新品','遊ばれる','お気に入り','汚れる','ほつれる','継ぎはぎ','ボロボロ','大切な宝物'] },
      { id: 'unknown', label: '？？？', stages: ['点','ぷる','足？','目？','羽？','巨大化','極小化','点……？'] },
    ],
    secret: [
      { id: 'ren', label: 'れんくん', stages: 8, design: '専用8段階。通常の人間ラインの色違いにしない' },
    ],
    author: { id: 'naoto', label: 'ナオト', playable: false },
  },

  companions: {
    normal: [
      { id: 'cat_friend', label: 'きまぐれな ねこ', behavior: '自由に寝る・箱に入る' },
      { id: 'rabbit_friend', label: 'すばしっこい うさぎ', behavior: '急に横切る・跳ねる' },
      { id: 'tanuki', label: 'いたずら たぬき', behavior: '他の仲間にちょっかいを出す' },
      { id: 'squirrel', label: 'おっちょこちょい リス', behavior: '木の実を運んで落とす' },
      { id: 'owl', label: 'ものしり ふくろう', behavior: '時々豆知識を言う' },
      { id: 'otter', label: 'あそびずき カワウソ', behavior: '物を転がす・滑らせる' },
      { id: 'hamster', label: 'ほおぶくろ ハムスター', behavior: 'ごはんを頬に詰める' },
      { id: 'panda', label: 'ぐうたら パンダ', behavior: '食べる→寝る' },
      { id: 'monkey', label: 'まねっこ サル', behavior: '主人公の動きを真似する' },
      { id: 'parrot', label: 'おしゃべり オウム', behavior: '他キャラの言葉を真似する' },
      { id: 'sheep', label: 'ふわふわ ヒツジ', behavior: '他の仲間が寄りかかる' },
      { id: 'seal', label: 'ごろごろ アザラシ', behavior: '転がって移動する' },
      { id: 'bat', label: 'よふかし コウモリ', behavior: '逆さにぶら下がる' },
      { id: 'chicken', label: 'はやおき ニワトリ', behavior: '朝っぽい演出で鳴く' },
      { id: 'penguin_friend', label: 'すべりたがり ペンギン', behavior: '腹ばいで滑る' },
      { id: 'hedgehog', label: 'びっくり ハリネズミ', behavior: '驚くと丸くなる' },
      { id: 'shiba', label: 'ひとなつっこい しばいぬ', behavior: '主人公の近くを歩く' },
      { id: 'koala', label: 'のんびり コアラ', behavior: 'よく眠る・ゆっくり動く' },
    ],
    rare: [
      { id: 'punyu', label: 'とけかけの ぷにゅ' },
      { id: 'sekizou', label: 'むひょうじょうの せきぞう' },
      { id: 'chameleon', label: 'サングラスの カメレオン' },
      { id: 'kinoko', label: 'しゃべる きのこ' },
      { id: 'unicorn', label: 'まよいこんだ ユニコーン' },
      { id: 'many_tail_fox', label: 'しっぽの おおい きつね' },
      { id: 'watcher', label: 'みている なにか' },
      { id: 'box', label: 'ただの はこ' },
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
      { id: 'river_lake', label: 'かわ・みずうみ' },
      { id: 'jungle', label: 'ジャングル' },
      { id: 'desert', label: 'さばく' },
    ],
    special: [
      { id: 'star_stop', label: 'ほしぞらの ていりゅうじょ' },
      { id: 'memory_lake', label: 'きおくの みずうみ' },
    ],
  },

  partners: [
    { id: 'cat_ceo', label: 'ビルの ねこ社長', firstRegion: 'city', hook: '仕事人なのにデートのため普通にサボる' },
    { id: 'robot_neighbor', label: 'となりまちの ロボット', firstRegion: 'city', hook: '感情を少しずつ覚える' },
    { id: 'field_cow', label: 'のはらの うしさん', firstRegion: 'countryside', hook: '何年経っても草をくれる' },
    { id: 'sunflower_partner', label: 'はたけの ひまわりさん', firstRegion: 'countryside', hook: '主人公の方を向く' },
    { id: 'forest_bear', label: 'もりの クマさん', firstRegion: 'forest', hook: '大きくて優しい' },
    { id: 'grove_deer', label: 'こだちの シカ', firstRegion: 'forest', hook: '最初は逃げるが徐々に近づく' },
    { id: 'cliff_goat', label: 'がけの ヤギさん', firstRegion: 'mountain', hook: '毎回ありえない場所にいる' },
    { id: 'high_eagle', label: 'たかねの ワシ', firstRegion: 'mountain', hook: '無口だが年月とともに心を開く' },
    { id: 'snow_spirit', label: 'ゆきの せいれい', firstRegion: 'snow', hook: '主人公が老いても姿が変わらない' },
    { id: 'snowman', label: 'とけない ゆきだるま', firstRegion: 'snow', hook: '暖かい地域へのデートが大変' },
    { id: 'rock_octopus', label: 'いわばの タコさん', firstRegion: 'sea', hook: '8本腕の世話焼き' },
    { id: 'sea_mermaid', label: 'うみの にんぎょ', firstRegion: 'sea', hook: '主人公と陸の世界を知っていく' },
    { id: 'anglerfish', label: 'ひかる チョウチンアンコウ', firstRegion: 'deepsea', hook: '暗所では積極的、明るい場所では照れる' },
    { id: 'swamp_croc', label: 'ぬまの ワニさん', firstRegion: 'river_lake', hook: '強面なのに照れ屋' },
    { id: 'gentle_gorilla', label: 'やさしい ゴリラ', firstRegion: 'jungle', hook: '怪力なのに繊細' },
    { id: 'knitting_spider', label: 'あみものが すきな クモさん', firstRegion: 'jungle', hook: '巣と糸でいろいろ作る' },
    { id: 'desert_scorpion', label: 'さばくの サソリさん', firstRegion: 'desert', hook: '無口だが行動で優しさを示す' },
    { id: 'oasis_cactus', label: 'オアシスの サボテンさん', firstRegion: 'desert', hook: '抱きしめたいが抱きしめづらい' },
  ],

  legends: [
    { id: 'gate', label: 'そらに うかぶ とりい', keepCurrent: true, affinityRegions: ['countryside'] },
    { id: 'stairs', label: 'どこにも つながらない かいだん', keepCurrent: true, affinityRegions: ['desert'] },
    { id: 'boss', label: 'あやまりに きた だいおういか', keepCurrent: true, affinityRegions: ['sea'] },
    { id: 'lamp', label: 'よなかの あかり', keepCurrent: true, affinityRegions: ['forest','countryside'] },
    { id: 'mirror', label: 'としを とった じぶん', keepCurrent: true, affinityRegions: ['river_lake','memory_lake'] },
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
      koala: 'koala',
      otter: 'otter',
      hamster: 'hamster',
      squirrel: 'squirrel',
      punyu: 'punyu',
      sekizou: 'sekizou',
      chameleon: 'chameleon',
      kinoko: 'kinoko',
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
