(() => {
  'use strict';

  const SAVE_KEY = 'naotocchi-save-v1';
  const WORLD_MASTER = window.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1 || null;
  const CARE_STATUS = window.NaotocchiCareStatus || null;
  const SAVE_BACKUP_KEY = 'naotocchi-save-v1-backup';
  // じどうバックアップ: 20分いじょう あいだが あいた セーブを 3つまで
  // のこし、プロフィールの「もどす」で その時点に もどせる
  const SAVE_SNAP_KEY = 'naotocchi-save-v1-snaps';
  const SAVE_SNAP_MAX = 3;
  const SAVE_SNAP_INTERVAL_MS = 20 * 60 * 1000;
  let stateLoadRecovered = false;
  let lastGoodSaveRaw = null;
  let saveWriteBlocked = false;
  const TICK_MS = 3000; // 1 tick = 3 seconds of real time; time only passes while the page is open
  const MAX_POOP = 4;

  const SICKNESS_TYPES = [
    { label: 'げんいんふめいのこうねつ', badge: '🥵' },
    { label: 'とまらないはきけ', badge: '🤢' },
    { label: 'ぐるぐるするめまい', badge: '💫' },
    { label: 'われるようなずつう', badge: '🤕' },
    { label: 'しんぞうがバクバクするびょうき', badge: '😰' },
    { label: 'あたまがこんらんするびょうき', badge: '😵' },
    { label: '気分の上がり下がりがはげしいびょうき', badge: '😵‍💫' },
    { label: 'げんきがまったくでないびょうき', badge: '😞' },
    { label: 'からだがおもくてうごけないびょうき', badge: '🥶' },
    { label: 'あせがとまらないびょうき', badge: '😨' },
  ];

  const STAGE = {
    EGG: 'egg',
    GROWING: 'growing', // 0さい..100さい - どの すがたかは ねんれいから 導出する
    FAREWELL: 'farewell', // 100さい到達後の「さいごの じかん」
    DEAD: 'dead',
  };

  // ================================================================
  // ねんれい - この ゲームで ゆいいつの「時間」の軸
  // ================================================================
  // ねんれいは 0 から 100 へ 一方通行で しか すすまない。tick が すすんだ
  // ぶんだけ ふえ、けっして もどらない(state.ageTicks は たんちょう増加)。
  // tick() は 基本がめん と ミニゲーム中しか うごかない ので、「ゲームを
  // ひらいて あそんでいる じかん」だけが ねんれいに なる - タブを とじて
  // いる あいだも、ずかん/あいてむ などの がめんを ひらいて いる あいだも
  // ねんれいは とまる(loop() さんしょう)
  const AGE_TICKS_PER_YEAR = 20; // ★人生の長さを きめる ゆいいつの 定数(1さい=60秒 / 100さい=100分)
  const GOAL_AGE = 100;
  const HATCH_GROWTH = 20; // たまごは「せいちょう」を これだけ ためると かえる

  // ミニゲームの むずかしさを ねんれいに あわせて スケールさせる ための
  // 上限(表示ねんれい基準)。ここを こえても それいじょう むずかしくは ならない
  const MAX_DIFFICULTY_AGE = 60;

  const STAGES_PER_LINE = 8;

  // 8つの ライフステージ。ねんれいから いちいに きまる「その としの すがた」
  // で あって、「しんか段階」では ない。min は その ステージが はじまる ねんれい。
  // costPerYear は そだちを 1 あげるのに ひつような「せいちょう」の量では なく、
  // SODACHI_COST が うけもつ(下)。ここは ねんれいと 名まえ だけを もつ
  const LIFE_STAGES = [
    { min: 0, name: 'あかちゃん' },
    { min: 3, name: 'よちよち' },
    { min: 7, name: 'こども' },
    { min: 12, name: 'しょうねん・しょうじょ' },
    { min: 16, name: 'せいしゅん' },
    { min: 22, name: 'わかもの' },
    { min: 40, name: 'おとな' },
    { min: 70, name: 'ろうねん' },
  ];

  // ================================================================
  // そだち - ねんれいと ならぶ もうひとつの 中心の かず
  // ================================================================
  // 「この子を どれくらい りっぱに そだてられたか」。20 から はじまり
  // 0〜100 を うごく。せいちょうメーターが まんたんで +1、おとろえメーターが
  // まんたんで -1。SODACHI_COST は「そだちを その値から 1 あげるのに
  // ひつような せいちょう量」。そだちが たかいほど 1 あげるのが おもくなる
  const SODACHI_START = 20;
  const SODACHI_MAX = 100;
  // そだち 1 を あげる のに ひつような せいちょうの 量。20→70 で 680、20→100 で
  // 1,660(以前は 1,000 / 3,300 で、100分の いっしょうでは そだち100 に とどかなかった)
  const SODACHI_COST_BANDS = [
    { max: 19, cost: 8 },
    { max: 39, cost: 10 },
    { max: 59, cost: 14 },
    { max: 69, cost: 20 },
    { max: 79, cost: 26 },
    { max: 89, cost: 32 },
    { max: 99, cost: 40 },
  ];
  // おとろえは そだちの たかさに かかわらず つねに この量で まんたんに なる
  // (ミスの ダメージは いつでも おなじ ぜったい量)
  const DECLINE_MAX = 100;

  // ② はじめての いっしょうクリアの しきい値(100さい + 最高そだち これいじょう)
  const LIFE_CLEAR_SODACHI = 70;

  // そだちの 10きざみの 節目に 解禁される 特典。maxSodachi で 解禁され、
  // おとろえで そだちが さがっても うしなわれない(hasPerk() さんしょう)
  const SODACHI_PERKS = {
    30: { emoji: '🪙', name: 'はじめてのごほうび', coins: 100, desc: 'コインがふえやすくなった。少しずつためてみよう' },
    40: { emoji: '🐾', name: 'なかまのわ', coins: 150, desc: 'なかまと出会いやすくなり、きずなが切れにくくなった' },
    50: { emoji: '💐', name: 'こいのきざし', coins: 250, desc: 'きゅうあいがうまくいきやすくなった。「データ」のこいびと欄から、デートにもさそえる' },
    60: { emoji: '🗝️', name: 'へんしんのちから', coins: 400, desc: 'へんしんの候補が増えた。レアな姿もえらびやすくなる' },
    70: { emoji: '🧭', name: 'たびだち', coins: 600, desc: 'コインと旅のごきげんがふえやすくなった。とくべつな旅先もひらき、いつか「でんせつのであい」が起きる' },
    80: { emoji: '🌈', name: 'レアのきざし', coins: 900, desc: 'へんしんの候補にレアな姿がまざりやすくなり、レアななかまとも出会えるようになった' },
    90: { emoji: '✨', name: 'でんせつ', coins: 1400, desc: '金色のオーラをまとった。でんせつのゆめをもらい、おなか・ごきげん・げんきがゆっくり減るようになった' },
    100: { emoji: '👑', name: 'さいこうのそだち', coins: 3000, desc: '虹のオーラをまとい、最高のそだちにたどりついた' },
  };

  // 関係の 減衰は「なおとっちの 何年ぶん ほうっておいたら おわるか」で きめる。
  // こうすると AGE_TICKS_PER_YEAR を かえても ひりつが くずれない
  const RELATION_DECAY_YEARS = 28;

  // へんしんで れんあいタイプが かわった あと、「すれちがい」から
  // なかなおりする のに ひつような きゅうあいの かいすう
  const MISMATCH_REPAIR_NEEDED = 3;

  // each line is its own baby -> elder growth path (own emoji and label at
  // every stage, not a generic bird sprite shared by everyone pre-adult).
  // which line an egg hatches into is random (see pickRandomLine) - なる
  // messages are deliberately distinct per line/stage rather than templated
  const SPECIES = {
    dog: {
      stages: [
        { emoji: '🐶', asset: 'assets/characters/dog/01.png', label: 'あかちゃんいぬ' },
        { emoji: '🐶', asset: 'assets/characters/dog/02.png', label: 'よちよちこいぬ', message: 'よちよちこいぬになった！' },
        { emoji: '🐶', asset: 'assets/characters/dog/03.png', label: 'こいぬ', message: 'こいぬになった！' },
        { emoji: '🐕', asset: 'assets/characters/dog/04.png', label: 'わんぱくいぬ', message: 'わんぱくいぬになった！' },
        { emoji: '🐕', asset: 'assets/characters/dog/05.png', label: '若いいぬ', message: '若いいぬになった！' },
        { emoji: '🐕', asset: 'assets/characters/dog/06.png', label: '大人のいぬ', message: '大人のいぬになった！' },
        { emoji: '🐕', asset: 'assets/characters/dog/07.png', label: '落ちついたいぬ', message: '落ちついたいぬになった！' },
        { emoji: '🐕', asset: 'assets/characters/dog/08.png', label: 'おとしよりのいぬ', message: 'おとしよりのいぬになった！' },
      ],
    },
    cat: {
      stages: [
        { emoji: '🐱', asset: 'assets/characters/cat/01.png', label: 'あかちゃんねこ' },
        { emoji: '🐱', asset: 'assets/characters/cat/02.png', label: 'よちよちこねこ', message: 'よちよちこねこになった！' },
        { emoji: '🐱', asset: 'assets/characters/cat/03.png', label: 'こねこ', message: 'こねこになった！' },
        { emoji: '🐈', asset: 'assets/characters/cat/04.png', label: 'おてんばねこ', message: 'おてんばねこになった！' },
        { emoji: '🐈', asset: 'assets/characters/cat/05.png', label: '若いねこ', message: '若いねこになった！' },
        { emoji: '🐈', asset: 'assets/characters/cat/06.png', label: '大人のねこ', message: '大人のねこになった！' },
        { emoji: '🐈', asset: 'assets/characters/cat/07.png', label: '落ちついたねこ', message: '落ちついたねこになった！' },
        { emoji: '🐈', asset: 'assets/characters/cat/08.png', label: 'おとしよりのねこ', message: 'おとしよりのねこになった！' },
      ],
    },
    bird: {
      stages: [
        { emoji: '🐣', label: 'ひな' },
        { emoji: '🐣', label: '羽が生えたひな', message: '羽が生えてきた！' },
        { emoji: '🐥', label: '小鳥', message: '小鳥に成長した！' },
        { emoji: '🐤', label: '若い鳥', message: '若い鳥に成長した！' },
        { emoji: '🐤', label: '飛ぶ練習中の鳥', message: '飛び方の練習をはじめた！' },
        { emoji: '🐤', label: 'はばたく鳥', message: 'はばたく鳥に成長した！' },
        { emoji: '🐦', label: '空をゆく鳥', message: '空を自由に飛ぶようになった！' },
        { emoji: '🦜', label: 'おとしよりの鳥', message: 'おとしよりの鳥になった…' },
      ],
    },
    man: {
      stages: [
        { emoji: '👶', asset: 'assets/characters/man/01.png', label: 'あかちゃん' },
        { emoji: '👶', asset: 'assets/characters/man/02.png', label: 'よちよち', message: 'よちよちになった！' },
        { emoji: '🧒', asset: 'assets/characters/man/03.png', label: '子ども', message: '子どもになった！' },
        { emoji: '👦', asset: 'assets/characters/man/04.png', label: '少年', message: '少年になった！' },
        { emoji: '👦', asset: 'assets/characters/man/05.png', label: '若者', message: '若者になった！' },
        { emoji: '🧑', asset: 'assets/characters/man/06.png', label: '大人', message: '大人になった！' },
        { emoji: '🧑', asset: 'assets/characters/man/07.png', label: '落ちついた大人', message: '落ちついた大人になった！' },
        { emoji: '👴', asset: 'assets/characters/man/08.png', label: 'おじいさん', message: 'おじいさんになった！' },
      ],
    },
    woman: {
      stages: [
        { emoji: '👶', asset: 'assets/characters/woman/01.png', label: 'あかちゃん' },
        { emoji: '👶', asset: 'assets/characters/woman/02.png', label: 'よちよち', message: 'よちよちになった！' },
        { emoji: '🧒', asset: 'assets/characters/woman/03.png', label: '子ども', message: '子どもになった！' },
        { emoji: '👧', asset: 'assets/characters/woman/04.png', label: '少女', message: '少女になった！' },
        { emoji: '👧', asset: 'assets/characters/woman/05.png', label: '若者', message: '若者になった！' },
        { emoji: '👧', asset: 'assets/characters/woman/06.png', label: '大人', message: '大人になった！' },
        { emoji: '👩', asset: 'assets/characters/woman/07.png', label: '落ちついた大人', message: '落ちついた大人になった！' },
        { emoji: '👵', asset: 'assets/characters/woman/08.png', label: 'おばあさん', message: 'おばあさんになった！' },
      ],
    },
    beetle: {
      stages: [
        { emoji: '🐛', label: 'うまれたての幼虫' },
        { emoji: '🐛', label: '育ちざかりの幼虫', message: '育ちざかりの幼虫になった！' },
        { emoji: '🐛', label: 'まるまる幼虫', message: 'まるまる幼虫になった！' },
        { emoji: '🪲', label: 'さなぎ', message: 'さなぎになった！' },
        { emoji: '🪲', label: '出たてのカブトムシ', message: '出たてのカブトムシになった！' },
        { emoji: '🪲', label: '若いカブトムシ', message: '若いカブトムシになった！' },
        { emoji: '🪲', label: 'りっぱなカブトムシ', message: 'りっぱなカブトムシになった！' },
        { emoji: '🪲', label: '長生きカブトムシ', message: '長生きカブトムシになった！' },
      ],
    },
    stagbeetle: {
      stages: [
        { emoji: '🐛', label: 'うまれたての幼虫' },
        { emoji: '🐛', label: '育ちざかりの幼虫', message: '育ちざかりの幼虫になった！' },
        { emoji: '🐛', label: '大きな幼虫', message: '大きな幼虫になった！' },
        { emoji: '🪲', label: 'さなぎ', message: 'さなぎになった！' },
        { emoji: '🪲', label: '出たてのクワガタ', message: '出たてのクワガタになった！' },
        { emoji: '🪲', label: '若いクワガタ', message: '若いクワガタになった！' },
        { emoji: '🪲', label: 'りっぱなクワガタ', message: 'りっぱなクワガタになった！' },
        { emoji: '🪲', label: '長生きクワガタ', message: '長生きクワガタになった！' },
      ],
    },
    rabbit: {
      stages: [
        { emoji: '🐰', label: 'あかちゃんうさぎ' },
        { emoji: '🐰', label: 'よちよちこうさぎ', message: 'よちよちこうさぎに成長した！' },
        { emoji: '🐰', label: 'こうさぎ', message: 'こうさぎに成長した！' },
        { emoji: '🐇', label: 'わんぱくうさぎ', message: 'わんぱくうさぎに成長した！' },
        { emoji: '🐇', label: 'ジャンプうさぎ', message: 'ジャンプ力がついてきた！' },
        { emoji: '🐇', label: '若いうさぎ', message: '若いうさぎに成長した！' },
        { emoji: '🐇', label: '大人のうさぎ', message: 'すばしっこい大人のうさぎになった！' },
        { emoji: '🐇', label: 'おとしよりのうさぎ', message: 'おとしよりのうさぎになった…' },
      ],
    },
    fish: {
      stages: [
        { emoji: '🐟', label: 'あかちゃんざかな' },
        { emoji: '🐟', label: 'ひれを動かす子', message: 'ひれが動きだした！' },
        { emoji: '🐟', label: '小ざかな', message: '小ざかなに成長した！' },
        { emoji: '🐠', label: 'わんぱくざかな', message: 'わんぱくざかなに成長した！' },
        { emoji: '🐠', label: '群れで泳ぐさかな', message: '群れで泳ぐようになった！' },
        { emoji: '🐠', label: '若いさかな', message: '若いさかなに成長した！' },
        { emoji: '🐡', label: 'ふくらむさかな', message: 'カラフルなふくらむさかなになった！' },
        { emoji: '🐡', label: 'おとしよりのさかな', message: 'おとしよりのさかなになった…' },
      ],
    },
    dragon: {
      stages: [
        { emoji: '🦎', label: 'ちびりゅう' },
        { emoji: '🦎', label: '子りゅう', message: '子りゅうになった！' },
        { emoji: '🦎', label: 'つのの生えたりゅう', message: 'つのの生えたりゅうになった！' },
        { emoji: '🐉', label: '小さなつばさのりゅう', message: '小さなつばさのりゅうになった！' },
        { emoji: '🐉', label: 'つばさの育ったりゅう', message: 'つばさの育ったりゅうになった！' },
        { emoji: '🐉', label: '火をふくりゅう', message: '火をふくりゅうになった！' },
        { emoji: '🐉', label: '大きなりゅう', message: '大きなりゅうになった！' },
        { emoji: '🐉', label: 'いにしえのりゅう', message: 'いにしえのりゅうになった！' },
      ],
    },
    panda: {
      stages: [
        { emoji: '🐼', label: 'あかちゃんパンダ' },
        { emoji: '🐼', label: 'よちよちパンダ', message: 'よちよちパンダに成長した！' },
        { emoji: '🐼', label: 'やんちゃパンダ', message: 'やんちゃパンダに成長した！' },
        { emoji: '🐼', label: 'ささ食いパンダ', message: 'ささを食べはじめた！' },
        { emoji: '🐼', label: 'ころがるパンダ', message: 'ごろごろ転がるようになった！' },
        { emoji: '🐼', label: '若いパンダ', message: '若いパンダに成長した！' },
        { emoji: '🐼', label: 'どっしりパンダ', message: 'どっしりパンダになった！' },
        { emoji: '🐼', label: 'おとしよりパンダ', message: 'おとしよりパンダになった…' },
      ],
    },
    fox: {
      stages: [
        { emoji: '🦊', label: 'あかちゃんきつね' },
        { emoji: '🦊', label: 'よちよちこぎつね', message: 'よちよちこぎつねに成長した！' },
        { emoji: '🦊', label: 'ふさふさこぎつね', message: 'しっぽがふさふさになってきた！' },
        { emoji: '🦊', label: 'わんぱくきつね', message: 'わんぱくきつねに成長した！' },
        { emoji: '🦊', label: 'すばやいきつね', message: 'すばしっこくなってきた！' },
        { emoji: '🦊', label: '若いきつね', message: '若いきつねに成長した！' },
        { emoji: '🦊', label: 'ずるがしこいきつね', message: 'ずるがしこいきつねになった！' },
        { emoji: '🦊', label: 'おしゃれなきつね', message: 'おしゃれなきつねになった…' },
      ],
    },
    owl: {
      stages: [
        { emoji: '🦉', label: 'あかちゃんふくろう' },
        { emoji: '🦉', label: '目を開けたひな', message: '目を開けたひなに成長した！' },
        { emoji: '🦉', label: 'こふくろう', message: 'こふくろうに成長した！' },
        { emoji: '🦉', label: '夜ふかしふくろう', message: '夜に目覚めるようになった！' },
        { emoji: '🦉', label: '飛ぶ練習のふくろう', message: '飛ぶ練習をはじめた！' },
        { emoji: '🦉', label: '若いふくろう', message: '若いふくろうに成長した！' },
        { emoji: '🦉', label: '知恵あるふくろう', message: '知恵あるふくろうになった！' },
        { emoji: '🦉', label: 'おとしよりふくろう', message: 'おとしよりふくろうになった…' },
      ],
    },
    plant: {
      stages: [
        { emoji: '🌱', label: '芽ぶきのたね' },
        { emoji: '🌱', label: 'ふたば', message: 'ふたばが開いた！' },
        { emoji: '🌿', label: 'のびる苗', message: 'くきがぐんぐんのびてきた！' },
        { emoji: '🌾', label: 'ふくらむつぼみ', message: 'つぼみがふくらんできた！' },
        { emoji: '🌷', label: '開きかけのつぼみ', message: '花びらがのぞきはじめた！' },
        { emoji: '🌻', label: '咲きほこる花', message: '花が咲きほこった！' },
        { emoji: '🌼', label: 'みごとな花', message: 'みごとな花に成長した！' },
        { emoji: '🥀', label: 'かれはじめた花', message: '少しずつかれはじめた…' },
      ],
    },
    robot: {
      stages: [
        { emoji: '🤖', label: '組み立て中' },
        { emoji: '🤖', label: '電源オン', message: '電源が入った！' },
        { emoji: '🤖', label: 'よちよちロボット', message: '歩き方を覚えた！' },
        { emoji: '🤖', label: '学習ロボット', message: '学習をはじめた！' },
        { emoji: '🦾', label: '力持ちロボット', message: 'パワーアップした！' },
        { emoji: '🦾', label: '戦うロボット', message: '戦うロボットに成長した！' },
        { emoji: '🦾', label: '最新型ロボット', message: '最新型にアップグレードした！' },
        { emoji: '🤖', label: '旧式ロボット', message: '旧式ロボットになった…' },
      ],
    },
    dinosaur: {
      stages: [
        { emoji: '🦕', label: 'うまれたての恐竜' },
        { emoji: '🦕', label: 'よちよち恐竜', message: 'よちよち恐竜に成長した！' },
        { emoji: '🦕', label: 'とげの生えた恐竜', message: 'とげが生えてきた！' },
        { emoji: '🦖', label: 'わんぱく恐竜', message: 'わんぱく恐竜に成長した！' },
        { emoji: '🦖', label: 'するどい歯の恐竜', message: 'するどい歯が生えてきた！' },
        { emoji: '🦖', label: '若い恐竜', message: '若い恐竜に成長した！' },
        { emoji: '🦖', label: '巨大な恐竜', message: '巨大な恐竜になった！' },
        { emoji: '🦴', label: '化石になった恐竜', message: '長い時をへて、化石になった…' },
      ],
    },
    // rare lines - never a starting hatch, only reachable as a 変身 choice
    // (see pickTransformCandidates) when care/skill has been exceptional
    god: {
      stages: [
        { emoji: '👼', label: '光の粒' },
        { emoji: '👼', label: '光の子', message: '光の子になった！' },
        { emoji: '👼', label: '小さな精霊', message: '小さな精霊になった！' },
        { emoji: '👼', label: '見習いかみさま', message: '見習いかみさまになった！' },
        { emoji: '😇', label: 'かみさま', message: 'かみさまになった！' },
        { emoji: '😇', label: '大いなるかみさま', message: '大いなるかみさまになった！' },
        { emoji: '😇', label: '神々しい光', message: '神々しい光になった！' },
        { emoji: '🌞', label: '光そのもの', message: '光そのものになった！' },
      ],
    },
    ren: {
      stages: [
        { emoji: '👶', label: 'ちびれん' },
        { emoji: '👶', label: 'げんきれん', message: 'げんきれんになった！' },
        { emoji: '🧒', label: '子どもれん', message: '子どもれんになった！' },
        { emoji: '🧒', label: '少年れん', message: '少年れんになった！' },
        { emoji: '🧒', label: '若者れん', message: '若者れんになった！' },
        { emoji: '👦', label: '大人れん', message: '大人れんになった！' },
        { emoji: '🧑', label: '年を重ねたれん', message: '年を重ねたれんになった！' },
        { emoji: '🧑', label: 'おじいちゃんれん', message: 'おじいちゃんれんになった！' },
      ],
    },
    mermaid: {
      stages: [
        { emoji: '🐚', label: 'あかちゃんの貝がら' },
        { emoji: '🐚', label: 'きらめく子にんぎょ', message: 'うろこがきらめきだした！' },
        { emoji: '🐚', label: '子にんぎょ', message: '子にんぎょに成長した！' },
        { emoji: '🧜', label: 'わんぱくにんぎょ', message: 'わんぱくにんぎょに成長した！' },
        { emoji: '🧜', label: '泳ぎ上手のにんぎょ', message: '泳ぎが上手になった！' },
        { emoji: '🧜', label: '若いにんぎょ', message: '若いにんぎょに成長した！' },
        { emoji: '🧜‍♀️', label: '海のプリンセス', message: '海のプリンセスになった！' },
        { emoji: '🧜‍♀️', label: '伝説のにんぎょ', message: '伝説のにんぎょになった…' },
      ],
    },
    unicorn: {
      stages: [
        { emoji: '🐴', label: '小さなつのの子馬' },
        { emoji: '🐴', label: 'よちよち子馬', message: 'よちよち子馬に成長した！' },
        { emoji: '🦄', label: 'つのがのびた子馬', message: 'つのがのびてきた！' },
        { emoji: '🦄', label: 'わんぱくユニコーン', message: 'わんぱくユニコーンに成長した！' },
        { emoji: '🦄', label: '光るユニコーン', message: '光を放ちはじめた！' },
        { emoji: '🦄', label: '若いユニコーン', message: '若いユニコーンに成長した！' },
        { emoji: '🦄', label: '伝説のユニコーン', message: 'まさかの…伝説のユニコーンになった！！' },
        { emoji: '🦄', label: '大いなるユニコーン', message: '大いなるユニコーンになった…' },
      ],
    },
    phoenix: {
      stages: [
        { emoji: '🐣', label: '火のひな' },
        { emoji: '🐣', label: 'よちよち火の鳥', message: 'よちよち火の鳥になった！' },
        { emoji: '🐥', label: '若い火の鳥', message: '若い火の鳥になった！' },
        { emoji: '🐦‍🔥', label: '空を飛ぶ火の鳥', message: '空を飛ぶ火の鳥になった！' },
        { emoji: '🐦‍🔥', label: '燃えさかる火の鳥', message: '燃えさかる火の鳥になった！' },
        { emoji: '🐦‍🔥', label: '金色の火の鳥', message: '金色の火の鳥になった！' },
        { emoji: '🐦‍🔥', label: '年を重ねた火の鳥', message: '年を重ねた火の鳥になった！' },
        { emoji: '🐦‍🔥', label: '灰からよみがえる鳥', message: '灰からよみがえる鳥になった！' },
      ],
    },
  };

  // マスターの8段階をランタイムSPECIESへ接続する。
  // 専用ドット絵が完成するまでは分類ごとの仮絵文字を使うが、段階名・ID・抽選は新仕様。
  const MASTER_SPECIES_EMOJI = {
    man:['👶','🚼','🧒','👦','🧑','🧑','🧔','👴'], woman:['👶','🚼','🧒','👧','🧑','👩','👩','👵'],
    dog:['🐶','🐶','🐕','🐕','🐕','🐕','🐕','🐕'], cat:['🐱','🐱','🐈','🐈','🐈','🐈','🐈','🐈'],
    penguin:['🐣','🐧','🐧','🐧','🐧','🐧','🐧','🐧'], turtle:['🐢','🐢','🐢','🐢','🐢','🐢','🐢','🐢'],
    frog:['〰️','〰️','🐸','🐸','🐸','🐸','🐸','🐸'], salmon:['🐟','🐟','🐟','🐟','🐟','🐟','🐟','🐟'],
    clownfish:['🐟','🐟','🐠','🐠','🐠','🐠','🐠','🐠'], butterfly:['🐛','🐛','🐛','🟤','🟤','🦋','🦋','🦋'],
    beetle:['🐛','🐛','🐛','🐛','🟤','🟤','🪲','🪲'], stagbeetle:['🐛','🐛','🐛','🐛','🟤','🟤','🪲','🪲'],
    cicada:['🐛','🐛','🐛','🐛','🐛','🟤','🪰','🪰'], antlion:['🐛','🐛','🐛','🐛','🟤','🟤','🪰','🪰'],
    hermit_crab:['🦀','🦀','🦀','🦀','🦀','🦀','🦀','🦀'], jellyfish:['•','◉','◉','✺','🪼','🪼','🪼','🪼'],
    starfish:['•','✦','⭐','⭐','⭐','⭐','⭐','⭐'], coral:['•','🪸','🪸','🪸','🪸','🪸','🪸','🪸'],
    dandelion:['🌱','🌱','🌿','🌿','🌼','🌼','🌬️','🌿'], sakura:['🌱','🌱','🌳','🌳','🌳','🌸','🌸','🌳'],
    venus_flytrap:['🌱','🌱','🌿','🌿','🪴','🪴','🌼','🪴'], mushroom:['〰️','〰️','•','🍄','🍄','🍄','🍄','🍄'],
    dragon:['🦎','🦎','🐉','🐉','🐉','🐉','🐉','🐉'], phoenix:['🔥','🐣','🐥','🐦‍🔥','🐦‍🔥','🐦‍🔥','🐦‍🔥','🔥'],
    god:['✨','👼','🧚','😇','😇','🌟','🌟','☀️'], world_tree:['🌱','🌱','🌳','🌳','🌳','🌳','🌳','🌳'],
    ghost:['✨','👻','👻','👻','👻','👻','👻','✨'], star:['☁️','☁️','✨','⭐','☀️','🌟','💥','✨'],
    plush:['🧸','🧸','🧸','🧸','🧸','🧸','🧸','🧸'], unknown:['•','🫧','〰️','👁️','🪽','⬤','·','•'], ren:['👶','🏃','🧒','🧒','🧑','🧑','🧓','👴'],
  };
  function installMasterSpecies() {
    if (!WORLD_MASTER) return;
    const defs = [...WORLD_MASTER.playerSpecies.normal, ...WORLD_MASTER.playerSpecies.rare, ...(WORLD_MASTER.playerSpecies.secret || [])];
    defs.forEach((def) => {
      const emojis = MASTER_SPECIES_EMOJI[def.id] || Array(8).fill('❓');
      SPECIES[def.id] = {
        stages: def.stages.map((label, i) => ({
          emoji: emojis[i] || emojis[emojis.length - 1] || '❓',
          // 全マスター種族は同じstable pathを使う。未制作PNGはrenderer側でemojiへfallback。
          asset: `assets/characters/${def.id}/${String(i + 1).padStart(2, '0')}.png`,
          label,
          message: i ? `${label}になった!` : undefined,
        })),
      };
    });
  }
  installMasterSpecies();

  // god/ren/mermaid/unicorn/phoenix are intentionally left out of the
  // random hatch pool - they stay rare, earned surprises unlocked only
  // through a 変身 choice
  const MASTER_NORMAL_LINES = (WORLD_MASTER?.playerSpecies?.normal || []).map((x) => x.id);
  const MASTER_RARE_LINES = (WORLD_MASTER?.playerSpecies?.rare || []).map((x) => x.id);
  // 現在の人生が旧種族なら、その人生だけは旧定義を保持する。
  // 新しい卵・新しい変身候補からはマスターの22通常+8レアを使う。
  const LEGACY_NORMAL_LINES = ['bird','rabbit','fish','panda','fox','owl','plant','robot','dinosaur'];
  const LEGACY_RARE_LINES = ['mermaid','unicorn'];
  const NORMAL_LINES = MASTER_NORMAL_LINES.length ? MASTER_NORMAL_LINES : ['dog','cat','man','woman','beetle','stagbeetle'];
  const RARE_LINES = MASTER_RARE_LINES.length ? MASTER_RARE_LINES : ['dragon','phoenix','god'];
  const ALL_LINES = [...NORMAL_LINES, ...RARE_LINES, 'ren'];

  // プロフィール表示用の しゅぞく名。新マスターを正とし、れんくんだけsecret枠から追加。
  const SPECIES_DISPLAY_NAMES = Object.fromEntries([
    ...(WORLD_MASTER?.playerSpecies?.normal || []),
    ...(WORLD_MASTER?.playerSpecies?.rare || []),
    ...(WORLD_MASTER?.playerSpecies?.secret || []),
  ].map((x) => [x.id, x.label]));

  // ================================================================
  // 現在の全248段階と旧セーブの種族に対応する、ずかんの説明文
  // ================================================================
  // 「おなじ しゅぞくだから 似せる」は やらない(§03)。おなじ いぬでも
  // どろだらけ / スケボー / サングラス / へんな ろうけん…と、1つずつ
  // べつキャラくらい ふりはばを つける。かわいい・かっこいい・うつくしい・
  // こうごうしい・しぶい・おしゃれ・キモかわ・シュール・意味不明を
  // わざと おなじ せかいに まぜてある。すてキャラを つくらない ため、
  // どの 1つにも「これを えらびたい」と おもえる ところを かならず のこす
  const SPECIES_STAGE_DESCS = {
    "dog": [
      "まだ目が開いていない。においだけで、世界をだいたいわかっているつもりでいる。",
      "歩くのが楽しすぎて、行きたい方向と足が合っていない。",
      "スリッパを必ず片方だけ隠す。もう片方の行方は誰も知らない。",
      "どろだらけ。喜んでいるのか怒っているのか、しっぽしかヒントがない。",
      "走る前にこちらを見る。ついてくるとわかるまで少し待つ。",
      "散歩の道を覚えた。曲がる角だけは毎回相談したがる。",
      "何も言わずに隣に座る。それだけで、だいたいなんとかなる。",
      "歩くのが遅くなったぶん、夕焼けを見る時間が長くなった。"
    ],
    "cat": [
      "小さい。丸い。あたたかい。それ以外の情報をほとんど出さない。",
      "よちよち歩いては、途中でなぜか寝る。",
      "箱に入る。箱がなければ、箱の形をした空気に入る。",
      "天井から落ちてきた。落ちたあと3秒間、「予定どおり」の顔をする。",
      "夜じゅうどこかへ出かけている。朝帰ってくると、少し潮のにおいがする。",
      "目がきれい。本人もそれを知っている。",
      "ひざの上の権利を絶対にゆずらない。起きるのは本人の気分しだい。",
      "日なたで寝ている。よく見ると、まぶたのすき間からずっとこっちを見ている。"
    ],
    "bird": [
      "からを割った瞬間、最初に見たものをずっと覚えている。",
      "羽が生えてきた。うれしくて、まだ飛べないのに高いところに登る。",
      "歌を練習している。同じところで必ず間違える。",
      "おしゃれな羽の色になった。鏡の前から動かない。",
      "飛び方を練習中。飛び立つことはできる。着地の研究はこれから。",
      "ようやく空に出た。思ったより空は広くて、少し怖かった。",
      "高いところから町を見下ろす。誰のものでもない景色が好きらしい。",
      "色があざやかになった。年を取るほど派手になる種族らしい。"
    ],
    "man": [
      "にぎる力だけがやたら強い。離さない。",
      "立っては転び、転んでは笑う。なぜかずっと機嫌がいい。",
      "ポケットがいつもいっぱい。中身は石と棒と、なぞの金属。",
      "走るのが速いことだけが取りえだと思っている。（取りえはほかにもある。）",
      "何も起きていないのに不機嫌。本人も理由を探している。",
      "初めて自分で選んだ服を着ている。少しサイズが大きい。",
      "だまって物を持ってくれる。お礼を言うと、ちょっと困った顔をする。",
      "同じ話を3回する。3回目がいちばんおもしろい。"
    ],
    "woman": [
      "泣き声の大きさが、体重とつり合っていない。",
      "歩くより走る。走るより踊る。",
      "拾った花を全部髪にさす。さしすぎて、ちょっと森になる。",
      "ノートのすみに秘密のキャラを描いている。毎日少しずつ増えている。",
      "髪をひと束だけ直した。誰も気づかないけど、本人は満足している。",
      "ひとりで遠くへ行く電車に乗った。窓の外をずっと見ていた。",
      "困っている人にいちばん先に気づく。気づいたあと、とてもさりげなく助ける。",
      "手があたたかい。なぜかなんでも知っている。"
    ],
    "beetle": [
      "土の中で真っ白。まだ世界が全部土だと思っている。",
      "食べる、寝る、太る。完ぺきな生活。",
      "まるまると太った。ちょっと気持ち悪くて、なぜかかわいい。",
      "さなぎになった。土の部屋で、次の姿を静かに待っている。",
      "さなぎから出てきた。体が固まるまで、今日はそっとしておこう。",
      "夜の樹液にいちばん乗りする。実は並んで待っていた。",
      "つのが黒く光る。戦わなくても強いことがわかる。",
      "つのの先が金色になった。理由はない。森ではそういうことになっている。"
    ],
    "stagbeetle": [
      "土の中で、カブトムシの幼虫とときどきすれ違う。",
      "太り方が少し違う。本人はけっこう気にしている。",
      "頭が固くなってきた。自分でこんこんたたいて確かめる。",
      "さなぎの中であごの形が見える。はさむ練習はまだ先。",
      "さなぎから出たばかり。強そうなあごも、まだやわらかい。",
      "夜になると急にかっこよくなる。昼間はちょっと寝ぼけている。",
      "あごの形が1匹ずつ違う。本人もそれを自慢に思っている。",
      "誰も倒せなかった。というより、誰も戦いを申しこまなかった。"
    ],
    "rabbit": [
      "耳が体より大きい。まだ持て余している。",
      "はねる。途中でこける。またはねる。",
      "背中を向けて座ると丸い。丸すぎて、どこが顔かわからない。",
      "穴を掘る。掘ったことを忘れて、自分で落ちる。",
      "跳びすぎて、自分の耳に追いつかれる。",
      "走るのが好きというより、止まるのが苦手。",
      "静かに座って、耳だけずっと動かしている。全部聞こえている。",
      "もうあまりはねない。代わりに、ずっと遠くの音を聞いている。"
    ],
    "fish": [
      "まだほとんど透明。光にかざすと中が見える。",
      "ひれの使い方を覚えた。まっすぐ進めるとは言っていない。",
      "壁にぶつかる。ガラスの存在に、まだ納得していない。",
      "いちばん速く泳げると信じている。実際には3番目くらい。",
      "群れの真ん中が好き。はしっこになると、そわそわする。",
      "うろこが光る角度を、自分で研究している。",
      "ふくらむ。怒っているわけではない。ただのくせ。",
      "ふくらんだまま戻らなくなった。本人はあんまり気にしていない。"
    ],
    "dragon": [
      "まだトカゲにしか見えない。炎も出ない。でも誇りは高い。",
      "うろこが固くなってきた。動くとこつこつ音がする。",
      "初めて煙をはいた。自分でびっくりしてむせた。",
      "宝物を集めはじめた。1個目はペットボトルのふた。",
      "つばさが重い。飛ぶより、引きずって歩くほうが速い。",
      "ようやく飛んだ。着地で小さなクレーターを作った。",
      "空にいるときだけ静か。地面に降りるとよくしゃべる。",
      "背中に雲がかかる大きさ。もう誰も大きさを測ろうとしない。"
    ],
    "panda": [
      "ピンク色で、まだ白黒になっていない。この期間はとても短い。",
      "歩くというより、転がって移動している。",
      "木に登る。降り方を考えずに登る。",
      "1日12時間ささを食べる。残りの時間は寝る。",
      "坂を見つけると必ず転がる。理由はない。",
      "目の周りの模様が少しずれている。それがチャームポイント。",
      "動かない。動かないのに、みんなが見ている。",
      "ささをゆっくりかむ。かむ音だけがずっと聞こえている。"
    ],
    "fox": [
      "しっぽが体と同じ大きさ。バランスが取れていない。",
      "泣いているふりをして、おやつをもらおうとする。まだ下手。",
      "しっぽを自分で追いかける。必ず負ける。",
      "隠れるのがうまい。うますぎて、自分の場所を忘れる。",
      "走るルートを3通り考えてから動く。",
      "夜の町を歩く。なぜかみんなが道をゆずる。",
      "うそはつかない。ただ、全部は言わない。",
      "マフラーが似合う。誰にもらったのかは教えてくれない。"
    ],
    "owl": [
      "まんまる。まだ目が開いていないのに、こっちを向いている。",
      "目を開けた。ひとみが大きすぎて、見ているだけでちょっと怖い。",
      "首がよく回る。回しすぎて自分で驚く。",
      "昼間に寝て、夜に大さわぎする。周りは迷惑している。",
      "飛ぶ音がしない。本人はそれが普通だと思っている。",
      "質問に答えない。考えているふりがとても上手。",
      "なんでも知っているような顔をする。実際、わりと知っている。",
      "何も言わない。でも前に座ると、なぜか悩みが片づく。"
    ],
    "plant": [
      "土の中で、外の光をもう知っている。",
      "葉っぱが2枚。世界のすべてが、この2枚にかかっている。",
      "背のびをする。風が吹くとけっこう怖い。",
      "中に何色が入っているか、本人もまだ知らない。",
      "少しだけ開いた。ここから先は一気にいく。",
      "咲いた。周りの空気の色まで変わった気がする。",
      "見ているだけで、なぜか少し泣きそうになる。",
      "花びらが落ちる。その下に、もう次のたねが落ちている。"
    ],
    "robot": [
      "まだねじが3本足りない。それでも動こうとする。",
      "電源が入った。最初に発した言葉は「…おなかすいた？」。",
      "歩き方を覚えた。ただし横歩きだけ。",
      "人間のジョークを学習中。まだ笑うタイミングが0.4秒遅い。",
      "腕が銀色になった。持ち上げられるものが急に増えた。",
      "戦うために作られたが、戦ったことは1度もない。",
      "ぴかぴか。鏡の前で自分をみがく機能がついている。",
      "少しさびた。動く音がうるさい。でも、みんなその音が好き。"
    ],
    "dinosaur": [
      "卵のからをまだ頭にのせている。取るのを忘れている。",
      "よちよち歩く。しっぽでバランスを取っているつもりだが、取れていない。",
      "背中のとげがちくちくする。抱きしめると痛い。",
      "なんでもかじる。かじったあと、味の感想を述べる。",
      "歯がするどい。でも好きな食べ物は、やわらかい緑のやつ。",
      "ほえる練習をしている。まだ声が裏返る。",
      "歩くと地面が揺れる。本人はそっと歩いているつもり。",
      "骨になっても動いている。誰もつっこまない。"
    ],
    "god": [
      "光の粒がいる。小さいのに、つい目で追ってしまう。",
      "羽が生えてきた。まだかざり。",
      "小さな精霊になった。呼ぶと光の向きが少し変わる。",
      "小さな奇跡を起こせる。なくした物がすぐ見つかるくらい。",
      "周りの人が、なぜか背すじをのばす。",
      "祈りが届くようになった。だいたい全部かなえてしまう。",
      "そこにいるだけで、周りの音が少し遠くなる。",
      "顔がもう太陽になっている。とくに説明はない。"
    ],
    "ren": [
      "なぜここに人間のあかちゃんがいるのか。誰も質問しない。",
      "よちよち歩く。ときどき振り向いて、こちらを見て笑う。",
      "突然現れて、突然仲間になっている。",
      "何を考えているのかわからない。本人もたぶんわかっていない。",
      "いたずらをする。怒られると、なぜかこっちが悪い気になる。",
      "急に大人になった。背はのびたが、中身はそんなに変わっていない。",
      "この世界のルールから、ひとりだけ少し外れている。",
      "最後まで、なんでいたのかはわからなかった。でも、いなかったら寂しかった。"
    ],
    "mermaid": [
      "貝がら。ときどきぷくっと泡が出る。それだけ。",
      "うろこがきらめきだした。光の加減で虹色になる。",
      "声がきれい。ただし歌うと必ず泡が出て、途中で切れる。",
      "船のロープを引っぱって遊ぶ。怒られてもまたやる。",
      "うずしおの真ん中を平気で突っ切る。",
      "髪をとかす時間が長い。海の底には鏡がないのに。",
      "水面に座って歌う。聞いたものは、その日のことを覚えていない。",
      "海の音が、この子がいるところだけ静かになる。"
    ],
    "unicorn": [
      "つのがぽつんと1つ。まだ、ただのこぶに見える。",
      "よちよち歩く。足が長すぎて自分でつまずく。",
      "つのが光るようになった。夜は枕元の明かりにちょうどいい。",
      "つのにいろんな物を引っかけて走り回る。",
      "たてがみが、風もないのに揺れる。",
      "走ったあとに、光が少し残る。",
      "近づくと、なぜかうそがつけなくなる。",
      "つのの先に、小さな星がひとつついている。"
    ],
    "phoenix": [
      "あたたかい。あたたかすぎて、持つとちょっと熱い。",
      "よちよち歩く。歩いたあとが少しこげている。",
      "羽の先がゆらゆら燃えている。本人は涼しい顔。",
      "飛んだあとに火の粉が舞う。周りはいつも少しあわてている。",
      "つばさを広げると、夜でも朝に見える。",
      "一度燃えつきた。3秒で戻ってきた。",
      "何度も死んで、何度も帰ってくる。もう数えていない。",
      "終わりがない。だから急がない。"
    ],
    "penguin": [
      "小さな声で呼ぶ。返事がくるまで、もう一度呼ぶ。",
      "綿毛がふくらんでいる。本人よりひとまわり先に風が当たる。",
      "よく食べる。大きくなったことには、まだ気づいていない。",
      "羽の衣替え中。ところどころ前のふわふわが残っている。",
      "泳ぐとすばやい。陸に上がると、いつもの歩き方に戻る。",
      "きちんと並んでいる。何の列かは聞いていない。",
      "すべりやすい場所を知っている。近道よりそっちを選ぶ。",
      "急ぐ仲間を見送ってから歩きだす。着く場所はだいたい同じ。"
    ],
    "turtle": [
      "小さなこうらをもう背負っている。荷物はこれで全部。",
      "一歩すすんでひと休み。休む場所も一緒に来てくれる。",
      "顔を出すまで少し待つ。引っこめるときだけはやい。",
      "知らない道にも出てみる。帰る場所は背中にある。",
      "日なたで動かない。用事があるならここで聞いてくれる。",
      "石と間違えられた。しばらく石のふりを続けた。",
      "こうらの傷の話をする。ひとつ目だけで日が暮れた。",
      "待つのが上手。誰かが来るとも来ないとも言わない。"
    ],
    "frog": [
      "しっぽで泳いでいる。曲がるつもりが、一周して戻ってきた。",
      "仲間とかたまって泳ぐ。先頭はいつのまにか交代している。",
      "後ろ足が出てきた。泳ぎながら、ときどき振り返って確認する。",
      "手も足もしっぽもある。どれを使うか少し迷う。",
      "陸に上がった。座ったまま、新しい景色に慣れている。",
      "初めてのジャンプ。着いた場所で少し得意げにしている。",
      "鳴くと、どこかから返事がくる。会話の内容はだいたい同じ。",
      "大きな葉の上で休む。雨の音だけは最後まで聞いている。"
    ],
    "salmon": [
      "小さな体で水に揺れている。まだ流れに名前はない。",
      "泳ぐ向きを覚えた。石の裏で休むことも覚えた。",
      "体の模様がはっきりしてきた。隠れるときだけ役に立つ。",
      "銀色になってきた。水の向こうが少し気になっている。",
      "海に出た。広すぎるので、とりあえず前へ泳ぐ。",
      "よく泳ぎ、よく食べる。話しかけるなら休憩のときに。",
      "流れに逆らって進む。知っているにおいを探している。",
      "体の色が深くなった。長い旅の話は、水音に少し混ざる。"
    ],
    "clownfish": [
      "まだ体が透けている。隠れたつもりで、目だけこちらを見ている。",
      "小さなしまができた。もうなくさないように泳いでいる。",
      "イソギンチャクの間から顔を出す。出すだけでまた戻る。",
      "家の周りを少し遠回りする。帰ると毎回ほっとする。",
      "仲間の中で自分の場所を覚えた。空いていてもそこに行く。",
      "オスが卵のそばを離れない。見に来た相手にもちょっと真剣な顔。",
      "オスからメスへ変わる途中。体も暮らしも、今日の調子を確かめている。",
      "大人のメスが群れの先頭にいる。後ろがついてくるまで、少し待っている。"
    ],
    "butterfly": [
      "葉っぱに小さな穴をあけた。今日の仕事はその続き。",
      "食べる道が葉っぱに残る。地図としてはあまり使えない。",
      "よく食べて大きくなった。葉っぱの道幅が、少し気になりだした。",
      "落ちつく場所を決めた。しばらく留守のような顔をしている。",
      "動かない。中ではいろいろ忙しいらしい。",
      "羽を広げて待っている。急がせても返事はない。",
      "花から花へ寄り道する。どこまでが用事なのかは秘密。",
      "羽の端が少し欠けた。休む花を選ぶのは上手になった。"
    ],
    "cicada": [
      "土の中を進む。外の天気はまだ聞いていない。",
      "根のそばで暮らしている。住所を聞いても土の中。",
      "出口のほうが気になる。土を少し動かして、また待つ。",
      "地上に出た。登るものを探して、まず周りを見た。",
      "背中からゆっくり抜け出す。置いていく服が立派すぎる。",
      "声を出してみた。思ったより大きくて、自分でも止まった。",
      "よく鳴く。話の切れ目に入ろうとするとまた始まる。",
      "鳴きやんで枝にいる。静かな声でも、ここにいるとわかる。"
    ],
    "antlion": [
      "砂を少し掘った。住まいにするには、まだ浅い。",
      "すり鉢の形を整えている。引っ越すより掘り直す派。",
      "穴の底で待っている。待ち時間を聞かれても困る。",
      "砂の中でまゆを作った。外から見ると、ただの砂。",
      "静かに姿を変えている。穴掘りはしばらく休業。",
      "羽が広がった。地面を見下ろすのは初めて。",
      "薄い羽で飛んでいる。昔の穴にはもう入らない。",
      "細い枝で羽を休める。砂の上をしばらく眺めていた。"
    ],
    "hermit_crab": [
      "小さな貝がらを見つけた。ひとまず表札なしで入った。",
      "貝がらから顔だけ出している。用事が済むとすぐ戻る。",
      "新しい貝がらを何度も確かめる。広ければいいわけでもない。",
      "慣れた貝がらで遠出する。荷造りはとくにいらない。",
      "少し大きな貝がらに引っ越した。角を曲がるとまだぶつかる。",
      "立派な貝がらで歩いている。中は意外といつもどおり。",
      "目立つ貝がらを選んだ。隠れても居場所がよくわかる。",
      "貝がらを直しながら使っている。気に入った理由は話してくれない。"
    ],
    "jellyfish": [
      "岩の上でゆらゆらしている。行き先を聞くと、少し首をかしげた。",
      "体が重なった形になった。上と下で相談しているようにも見える。",
      "星のような形で泳ぎだした。初めての遠出はふわふわだった。",
      "小さなかさの形になった。水の中の散歩に少し慣れてきた。",
      "かさを動かして進む。急いでいるのかは判断しづらい。",
      "透けた体で漂っている。考えごとだけは見えない。",
      "大きくなった。水の中で占める場所だけ少し増えた。",
      "ゆっくりかさを閉じる。波と呼吸を合わせているみたい。"
    ],
    "starfish": [
      "小さくてまだ星には見えない。本人も急いでいない。",
      "透けた星の形で水に揺れる。途中の姿もきちんと自分。",
      "小さな星が色づいた。ここから先は地面との付き合いになる。",
      "星の形がふっくらしてきた。向きを決めるのはあとでいい。",
      "金色の小さな星になった。空には行かず、その場にいる。",
      "少しずつ進む。目を離すと、さっきの場所にはいない。",
      "どっちが前か聞いてみた。返事のかわりに動きだした。",
      "大きな星が底にいる。踏まれない場所をよく知っている。"
    ],
    "coral": [
      "ここに決めたらしい。住まいはこれから自分で作る。",
      "小さく開いた。通りすぎる水にあいさつしているように見える。",
      "隣が増えた。引っ越してきたのではなく、ここで増えた。",
      "小さな集まりになった。全員で少しずつ大きくなる。",
      "枝の間を魚が通る。通行料の相談はしていない。",
      "にぎやかな形に育った。本人たちはずっと同じ場所にいる。",
      "隠れ場所がたくさんある。住人の数までは数えていない。",
      "見渡すほどに広がった。最初のひとつは、今もこの中にある。"
    ],
    "dandelion": [
      "目覚めの時間が来た。外が明るいことだけまずわかった。",
      "葉っぱがふたつ。どちらもちゃんと光を浴びている。",
      "低く広がっている。背の高さは、いまのところ気にしない。",
      "葉が増えた。足もとを固める時間はまだ続いている。",
      "つぼみを持ち上げた。中の色はもう決まっているらしい。",
      "黄色い花が咲いた。通り道が少しだけ明るくなった。",
      "ふわふわになった。風が来ると少し緊張する。",
      "たねが風に乗った。行き先は聞かないまま、空を見ている。"
    ],
    "sakura": [
      "小さな芽が出てきた。木陰になる予定はまだ先の話。",
      "風に揺れている。揺れたぶんだけまた戻ってくる。",
      "枝が増えてきた。鳥が止まるには、もう少し待ってほしい。",
      "少し木らしくなった。自分の影を初めて長く眺めた。",
      "枝先のつぼみがふくらんだ。中の花とは、まだ内緒話をしている。",
      "花が開いた。一輪目の場所をずっと覚えていそう。",
      "赤い実がなった。下に集まる人の話を全部聞いている。",
      "古い枝を広げて休む。待っていた人が今年も来た。"
    ],
    "venus_flytrap": [
      "まだ小さく丸まっている。目覚めの時間を静かに待っている。",
      "小さな口のような葉が出た。開けたまま待っている。",
      "若い葉が増えてきた。急に動く用事はまだない。",
      "閉じるのが上手になった。開き直るには少し時間がかかる。",
      "葉を広げて待つ。動かない時間のほうがずっと長い。",
      "立派な葉が並んでいる。話しかける葉を少し迷う。",
      "口のような葉がいっぱい。閉じる用事がなければとても静か。",
      "高いところに白い花が咲いた。食事の場所とは分けているらしい。"
    ],
    "mushroom": [
      "小さな粒がふわふわしている。キノコになる場所を探しているらしい。",
      "細い糸があちこちにつながった。どこまでが自分かは聞かないでおく。",
      "小さなキノコの芽が顔を出した。まだ小さくても、かさはもう一人前。",
      "背がすっとのびた。雨がなくても、かさは持っている。",
      "背が伸びてきた。昨日と同じ高さで探すと見落とす。",
      "かさを広げた。下に入った虫とは、とくに約束していない。",
      "キノコのもとになる粉を送り出している。引っ越し先は風と相談するらしい。",
      "かさの端が少し下がった。土の中では、まだ話が続いている。"
    ],
    "world_tree": [
      "小さな芽が光っている。寝るときは少し暗くしてくれる。",
      "葉のそばに不思議な気配がある。呼ぶといったん静かになる。",
      "枝が伸びた。木陰には、ときどき知らない足跡がある。",
      "枝の間で声がする。聞き返すと葉っぱの音に戻る。",
      "大きな木になった。根もとの昼寝場所が人気らしい。",
      "上のほうが見えない。落ちた葉が届くまで少し待つ。",
      "雲が枝にかかる。雨宿りの相談は下のほうで受けつける。",
      "世界を支えているらしい。それでも新しい葉は小さい。"
    ],
    "ghost": [
      "小さな光がいる。風がなくても少し揺れる。",
      "呼ぶとこちらを向く。名前はまだ決めていないらしい。",
      "驚かせる練習中。出てくる前に、自分から声をかけてしまう。",
      "壁を通りぬけた。扉の前で待っていたことを思い出した。",
      "大きくなった。隠れたつもりでも、少しはみ出している。",
      "昔の家の間取りを知っている。今の家具にはよく迷う。",
      "そばにいると落ちつく。怖い話を頼むと少し困った顔をする。",
      "薄くなってきた。さよならの前に、もう一度だけこちらを見た。"
    ],
    "star": [
      "雲のように広がっている。光る予定はまだ内緒。",
      "少しずつ集まっている。離れていたものが、ひとつになりかけた。",
      "中心が明るくなった。まぶしいかどうかこちらを見ている。",
      "光りはじめた。消し忘れではないらしい。",
      "いつもの場所で光っている。見つけてもらうのを急がない。",
      "大きくふくらんだ。遠くからでも顔がよく見える。",
      "ひときわ明るくなった。言いかけたことが、光に混ざった。",
      "光のあとが残っている。ここにいたことを、空が覚えている。"
    ],
    "plush": [
      "ふかふかで、まだ誰のにおいも知らない。置かれた場所だけ覚えている。",
      "連れていかれる場所が増えた。今日はどこまで行くのだろう。",
      "呼ばれる前に抱えられる。返事の必要がないくらい近い。",
      "少し汚れた。どこで遊んだか、その分だけわかる。",
      "糸がほつれた。引っぱらずに見つけてくれるとうれしい。",
      "ぬい目が増えた。直してくれた手のことは忘れていない。",
      "くたくたになった。抱き心地の話ならまだ負けない。",
      "古くなったのに捨てられない。いつもの場所が今日も空いている。"
    ],
    "unknown": [
      "点がある。汚れだと思って拭くと、少しよけた。",
      "ぷるっとした。形について質問するには、まだ早そう。",
      "足のようなものが出た。歩いたかどうかは見逃した。",
      "目が合った気がする。こちらを見ていたのかもわからない。",
      "羽らしいものがある。飛ぶつもりか聞くと、じっとしていた。",
      "大きくなった。わかったことは、それだけだった。",
      "小さくなった。さっきの大きさはどこにしまったのだろう。",
      "また点になった。最初の点とは、少し目の合い方が違う。"
    ]
  };

  function stageDesc(line, stageIndex) {
    const list = SPECIES_STAGE_DESCS[line];
    return (list && list[stageIndex]) || '';
  }

  // プロフィールの「せいかく傾向」に つかう traitCounts のラベル
  const TRAIT_LABELS = {
    gentle: 'やさしい', wild: 'やんちゃ', calm: 'おだやか', brave: 'ゆうかん', romantic: 'ロマンチック',
  };

  function pickRandomLine() {
    return NORMAL_LINES[Math.floor(Math.random() * NORMAL_LINES.length)];
  }

  // 変身メーターが満タンのときに提示する2つの候補ラインを選ぶ。ふだんは
  // ノーマル種の中から現在と違う2つだが、これまでの育て方が良ければ
  // (お世話の平均が高い/ミニゲームの腕が良い・ロマンチック傾向が強い)、
  // レア枠(かみさま・れんくん)が候補の1つに混ざることがある
  function pickTransformCandidates() {
    const pool = NORMAL_LINES.filter((line) => line !== state.speciesLine);
    const candidates = [];
    const wanted = hasPerk(60) ? 3 : 2;
    while (candidates.length < wanted && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      candidates.push(pool.splice(idx, 1)[0]);
    }

    const avgCare = state.careTicks > 0 ? state.careSum / state.careTicks : 0;
    const avgSkill = state.minigameCount > 0 ? state.minigameScoreSum / state.minigameCount : 0;
    // レアの 解禁条件は そだち60から 1だん ゆるくなる(§23 QA-1)。
    // へんしん抽選は ライフステージが かわる 7かいだけ なので、そだち80
    // だけを 見ていた ころは 7かいちゅう さいごの 1かい(70さい)にしか
    // 効いていなかった。そだち60は 22さいごろに とどくので、40さいと
    // 70さいの 2かいに 効く。そだち80は これまでどおり ゆるいまま + レアの
    // まざる かくりつが 0.5→0.65 に あがる(こちらが そだち80の とくてん)
    const eased = hasPerk(60);
    const rareMixChance = hasPerk(80) ? 0.65 : 0.5;
    // ★ れんくんだけは いまの じょうけんを そのまま のこす。
    //   「レア4種とは べつわくの 隠しキャラ」という 見つけにくさを かえない
    const renEased = hasPerk(80);
    // れんくんは ほかの レア4しゅとは わけて あつかう(§04)。ふつうの
    // レアわくの 抽選には いれず、じょうけんを みたした うえで さらに
    // べつの ひくい かくりつを ひいた ときだけ、しかも「？？？」の
    // まま こうほに まぎれこむ - 隠しキャラとしての「見つけた感」を のこす ため
    const rarePool = RARE_LINES.filter((line) => {
      if (line === state.speciesLine) return false;
      if (line === 'ren') return false;
      if (line === 'god') return avgCare >= (eased ? 82 : 90);
      // せいかくは「せいかくクイズ」でしか たまらず、それは ぜんミニゲームの
      // 6%。100分でも 7かい前後しか まわってこない ので、基本閾値を 3 に する
      if (line === 'mermaid') return state.traitCounts.gentle >= (eased ? 2 : 3);
      if (line === 'unicorn') return state.traitCounts.brave >= (eased ? 2 : 3);
      // ★ 「なった かいすう」では なく「なおした かいすう」。
      //   ちゃんと くすりを あげた 人が むくわれる じょうけんに する
      if (line === 'phoenix') return (state.sicknessCuredThisLife || 0) >= (eased ? 3 : 5);
      return false;
    });
    if (rarePool.length > 0 && Math.random() < rareMixChance) {
      const rare = rarePool[Math.floor(Math.random() * rarePool.length)];
      candidates[Math.floor(Math.random() * candidates.length)] = rare;
    }
    const renReady = state.speciesLine !== 'ren'
      && ((state.minigameCount >= 5 && avgSkill >= (renEased ? 78 : 85)) || state.traitCounts.romantic >= (renEased ? 3 : 5));
    if (renReady && Math.random() < (renEased ? 0.3 : 0.18)) {
      candidates[Math.floor(Math.random() * candidates.length)] = 'ren';
    }
    return candidates;
  }

  const el = {
    mainNameLabel: document.getElementById('mainNameLabel'),
    castStage: document.getElementById('castStage'),
    castSway: document.getElementById('castSway'),
    castResponse: document.getElementById('castResponse'),
    menuBtn: document.getElementById('menuBtn'),
    menuOverlay: document.getElementById('menuOverlay'),
    menuCloseBtn: document.getElementById('menuCloseBtn'),
    worldBtn: document.getElementById('worldBtn'),
    gamesBtn: document.getElementById('gamesBtn'),
    timeModeGrid: document.getElementById('timeModeGrid'),
    difficultyModeGrid: document.getElementById('difficultyModeGrid'),
    gameLengthGrid: document.getElementById('gameLengthGrid'),
    sfxModeGrid: document.getElementById('sfxModeGrid'),
    bgmModeGrid: document.getElementById('bgmModeGrid'),
    weatherModeGrid: document.getElementById('weatherModeGrid'),
    weatherFx: document.getElementById('weatherFx'),
    timeTint: document.getElementById('timeTint'),
    worldNowCard: document.getElementById('worldNowCard'),
    environmentLabel: document.getElementById('environmentLabel'),
    worldLocationLabel: document.getElementById('worldLocationLabel'),
    environmentStatus: document.getElementById('environmentStatus'),
    locationRefreshBtn: document.getElementById('locationRefreshBtn'),
    currentLocationBtn: document.getElementById('currentLocationBtn'),
    travelLocationStatus: document.getElementById('travelLocationStatus'),
    designScreenTab: document.getElementById('designScreenTab'),
    designDeviceTab: document.getElementById('designDeviceTab'),
    designScreenPanel: document.getElementById('designScreenPanel'),
    designDevicePanel: document.getElementById('designDevicePanel'),
    fontSelect: document.getElementById('fontSelect'),
    textSizeSelect: document.getElementById('textSizeSelect'),

    pet: document.getElementById('pet'),
    petSprite: document.getElementById('petSprite'),
    petAccessory: document.getElementById('petAccessory'),
    petArea: document.getElementById('petArea'),
    endingBadges: document.getElementById('endingBadges'),
    endingBadgeTip: document.getElementById('endingBadgeTip'),
    ageLabel: document.getElementById('ageLabel'),
    sodachiLabel: document.getElementById('sodachiLabel'),
    birthdayToast: document.getElementById('birthdayToast'),
    lifeMeterRow: document.getElementById('lifeMeterRow'),
    farewellBar: document.getElementById('farewellBar'),
    farewellBtn: document.getElementById('farewellBtn'),
    lifeCardOverlay: document.getElementById('lifeCardOverlay'),
    lifeCardBody: document.getElementById('lifeCardBody'),
    lifeCardNextBtn: document.getElementById('lifeCardNextBtn'),
    infiniteBtn: document.getElementById('infiniteBtn'),
    infiniteBtnIcon: document.getElementById('infiniteBtnIcon'),
    infiniteBtnLabel: document.getElementById('infiniteBtnLabel'),
    softResetBtn: document.getElementById('softResetBtn'),
    wipeBtn: document.getElementById('wipeBtn'),
    wipeOverlay: document.getElementById('wipeOverlay'),
    wipeSummary: document.getElementById('wipeSummary'),
    wipeCancelBtn: document.getElementById('wipeCancelBtn'),
    wipeNextBtn: document.getElementById('wipeNextBtn'),
    wipeConfirmOverlay: document.getElementById('wipeConfirmOverlay'),
    wipeConfirmCancelBtn: document.getElementById('wipeConfirmCancelBtn'),
    wipeHoldBtn: document.getElementById('wipeHoldBtn'),
    wipeHoldFill: document.getElementById('wipeHoldFill'),
    moneyLabel: document.getElementById('moneyLabel'),
    stageLabel: document.getElementById('stageLabel'),
    hungerBar: document.getElementById('hungerBar'),
    happinessBar: document.getElementById('happinessBar'),
    energyBar: document.getElementById('energyBar'),
    healthBar: document.getElementById('healthBar'),
    evoBar: document.getElementById('evoBar'),
    devoBar: document.getElementById('devoBar'),
    deathBar: document.getElementById('deathBar'),
    transformBar: document.getElementById('transformBar'),
    goalBar: document.getElementById('goalBar'),
    goalValue: document.getElementById('goalValue'),
    transformOverlay: document.getElementById('transformOverlay'),
    transformChoices: document.getElementById('transformChoices'),
    transformSkipBtn: document.getElementById('transformSkipBtn'),
    message: document.getElementById('message'),
    speechBubble: document.getElementById('speechBubble'),
    speechSpeaker: document.getElementById('speechSpeaker'),
    speechText: document.getElementById('speechText'),
    itemsRow: document.getElementById('itemsRow'),
    companionInviteOverlay: document.getElementById('companionInviteOverlay'),
    companionInviteEmoji: document.getElementById('companionInviteEmoji'),
    companionInviteTitle: document.getElementById('companionInviteTitle'),
    companionInviteFlavor: document.getElementById('companionInviteFlavor'),
    companionInvitePlayBtn: document.getElementById('companionInvitePlayBtn'),
    companionInviteLaterBtn: document.getElementById('companionInviteLaterBtn'),
    storyFlash: document.getElementById('storyFlash'),
    storyFlashEmoji: document.getElementById('storyFlashEmoji'),
    storyFlashText: document.getElementById('storyFlashText'),
    gameClearOverlay: document.getElementById('gameClearOverlay'),
    gameClearArt: document.getElementById('gameClearArt'),
    gameClearConfettiTop: document.getElementById('gameClearConfettiTop'),
    gameClearConfettiBottom: document.getElementById('gameClearConfettiBottom'),
    gameClearTitle: document.getElementById('gameClearTitle'),
    gameClearBadges: document.getElementById('gameClearBadges'),
    gameClearDesc: document.getElementById('gameClearDesc'),
    gameClearFreePlayBtn: document.getElementById('gameClearFreePlayBtn'),
    gameClearCloseBtn: document.getElementById('gameClearCloseBtn'),
    badges: document.getElementById('badges'),
    poopRow: document.getElementById('poopRow'),
    screen: document.getElementById('screen'),
    lamp: document.getElementById('lamp'),
    feedBtn: document.getElementById('feedBtn'),
    playBtn: document.getElementById('playBtn'),
    cleanBtn: document.getElementById('cleanBtn'),
    sleepBtn: document.getElementById('sleepBtn'),
    medicineBtn: document.getElementById('medicineBtn'),
    playWithBtn: document.getElementById('playWithBtn'),
    resetBtn: document.getElementById('resetBtn'),
    dexBtn: document.getElementById('dexBtn'),
    achBtn: document.getElementById('achBtn'),
    screenNormal: document.getElementById('screenNormal'),
    minigameOverlay: document.getElementById('minigameOverlay'),
    dexOverlay: document.getElementById('dexOverlay'),
    dexGrid: document.getElementById('dexGrid'),
    dexSummary: document.getElementById('dexSummary'),
    careMeters: document.getElementById('careMeters'),
    dexProgress: document.getElementById('dexProgress'),
    dexFreePlayHint: document.getElementById('dexFreePlayHint'),
    dexDetailOverlay: document.getElementById('dexDetailOverlay'),
    dexDetailEmoji: document.getElementById('dexDetailEmoji'),
    dexDetailLabel: document.getElementById('dexDetailLabel'),
    dexDetailMeta: document.getElementById('dexDetailMeta'),
    dexDetailDesc: document.getElementById('dexDetailDesc'),
    dexDetailTransformBtn: document.getElementById('dexDetailTransformBtn'),
    dexDetailCloseBtn: document.getElementById('dexDetailCloseBtn'),
    dexCloseBtn: document.getElementById('dexCloseBtn'),
    achOverlay: document.getElementById('achOverlay'),
    achGrid: document.getElementById('achGrid'),
    saveExportBtn: document.getElementById('saveExportBtn'),
    saveExportBox: document.getElementById('saveExportBox'),
    saveExportText: document.getElementById('saveExportText'),
    saveExportCopyBtn: document.getElementById('saveExportCopyBtn'),
    saveExportCopied: document.getElementById('saveExportCopied'),
    saveImportInput: document.getElementById('saveImportInput'),
    saveImportBtn: document.getElementById('saveImportBtn'),
    saveImportStatus: document.getElementById('saveImportStatus'),
    saveSnapList: document.getElementById('saveSnapList'),
    profileTimeline: document.getElementById('profileTimeline'),
    profilePastLives: document.getElementById('profilePastLives'),
    lifeCodeInput: document.getElementById('lifeCodeInput'),
    lifeCodeViewBtn: document.getElementById('lifeCodeViewBtn'),
    lifeCodeView: document.getElementById('lifeCodeView'),
    errorLogList: document.getElementById('errorLogList'),
    errorLogSummary: document.getElementById('errorLogSummary'),
    errorLogCopyBtn: document.getElementById('errorLogCopyBtn'),
    errorLogCopied: document.getElementById('errorLogCopied'),
    saveSnapStatus: document.getElementById('saveSnapStatus'),
    achTitle: document.getElementById('achTitle'),
    achTabs: document.getElementById('achTabs'),
    gameListGrid: document.getElementById('gameListGrid'),
    mgResultToast: document.getElementById('mgResultToast'),
    mgQuit: document.getElementById('mgQuit'),
    mgQuitBtn: document.getElementById('mgQuitBtn'),
    mgQuitConfirm: document.getElementById('mgQuitConfirm'),
    mgQuitYesBtn: document.getElementById('mgQuitYesBtn'),
    mgQuitNoBtn: document.getElementById('mgQuitNoBtn'),
    achProgress: document.getElementById('achProgress'),
    achCloseBtn: document.getElementById('achCloseBtn'),
    device: document.getElementById('device'),
    themeBtn: document.getElementById('themeBtn'),
    themeOverlay: document.getElementById('themeOverlay'),
    themeProgress: document.getElementById('themeProgress'),
    themeCloseBtn: document.getElementById('themeCloseBtn'),
    deviceThemeGrid: document.getElementById('deviceThemeGrid'),
    screenThemeGrid: document.getElementById('screenThemeGrid'),
    devicePatternGrid: document.getElementById('devicePatternGrid'),
    screenPatternGrid: document.getElementById('screenPatternGrid'),
    itemBtn: document.getElementById('itemBtn'),
    itemOverlay: document.getElementById('itemOverlay'),
    itemMoneyLabel: document.getElementById('itemMoneyLabel'),
    itemCloseBtn: document.getElementById('itemCloseBtn'),
    shopItemGrid: document.getElementById('shopItemGrid'),
    naotoItemGrid: document.getElementById('naotoItemGrid'),
    naotoGreetingBtn: document.getElementById('naotoGreetingBtn'),
    onetimeItemGrid: document.getElementById('onetimeItemGrid'),
    onetimeActive: document.getElementById('onetimeActive'),
    rewardItemGrid: document.getElementById('rewardItemGrid'),
    pickerOverlay: document.getElementById('pickerOverlay'),
    pickerTitle: document.getElementById('pickerTitle'),
    pickerHint: document.getElementById('pickerHint'),
    pickerGrid: document.getElementById('pickerGrid'),
    pickerCloseBtn: document.getElementById('pickerCloseBtn'),
    courtBtn: document.getElementById('courtBtn'),
    travelBtn: document.getElementById('travelBtn'),
    subStatusRow: document.getElementById('subStatusRow'),
    regionDecor: document.getElementById('regionDecor'),
    seasonTint: document.getElementById('seasonTint'),
    seasonBgFx: document.getElementById('seasonBgFx'),
    seasonFrontFx: document.getElementById('seasonFrontFx'),
    seasonLabel: document.getElementById('seasonLabel'),
    regionLabel: document.getElementById('regionLabel'),
    partnerLabel: document.getElementById('partnerLabel'),
    worldOverlay: document.getElementById('worldOverlay'),
    worldCloseBtn: document.getElementById('worldCloseBtn'),
    worldDateBtn: document.getElementById('worldDateBtn'),
    worldDateHint: document.getElementById('worldDateHint'),
    dateOverlay: document.getElementById('dateOverlay'),
    dateChooser: document.getElementById('dateChooser'),
    dateChoiceGrid: document.getElementById('dateChoiceGrid'),
    dateCancelBtn: document.getElementById('dateCancelBtn'),
    dateRewardConfirm: document.getElementById('dateRewardConfirm'),
    dateRewardPlan: document.getElementById('dateRewardPlan'),
    dateRewardTitle: document.getElementById('dateRewardTitle'),
    dateRewardCount: document.getElementById('dateRewardCount'),
    dateRewardUseBtn: document.getElementById('dateRewardUseBtn'),
    dateRewardSkipBtn: document.getElementById('dateRewardSkipBtn'),
    dateRewardBackBtn: document.getElementById('dateRewardBackBtn'),
    dateMovie: document.getElementById('dateMovie'),
    dateMovieScene: document.getElementById('dateMovieScene'),
    dateMoviePlace: document.getElementById('dateMoviePlace'),
    dateMoviePet: document.getElementById('dateMoviePet'),
    dateMoviePartner: document.getElementById('dateMoviePartner'),
    dateMovieCaption: document.getElementById('dateMovieCaption'),
    dateMovieSkipBtn: document.getElementById('dateMovieSkipBtn'),
    dateMovieCloseBtn: document.getElementById('dateMovieCloseBtn'),
    seasonModeGrid: document.getElementById('seasonModeGrid'),
    travelOverlay: document.getElementById('travelOverlay'),
    travelCloseBtn: document.getElementById('travelCloseBtn'),
    travelRegionGrid: document.getElementById('travelRegionGrid'),
    travelSpecialSection: document.getElementById('travelSpecialSection'),
    travelSpecialGrid: document.getElementById('travelSpecialGrid'),
    profileBtn: document.getElementById('profileBtn'),
    profileOverlay: document.getElementById('profileOverlay'),
    profileCloseBtn: document.getElementById('profileCloseBtn'),
    profileSpecies: document.getElementById('profileSpecies'),
    profileStage: document.getElementById('profileStage'),
    profileGender: document.getElementById('profileGender'),
    profileOrientation: document.getElementById('profileOrientation'),
    profileOrientationHelpBtn: document.getElementById('profileOrientationHelpBtn'),
    profileOrientationHint: document.getElementById('profileOrientationHint'),
    profileTraits: document.getElementById('profileTraits'),
    profilePartnerSection: document.getElementById('profilePartnerSection'),
    profilePartnerCard: document.getElementById('profilePartnerCard'),
    profileCompanionList: document.getElementById('profileCompanionList'),
    makeCodeBtn: document.getElementById('makeCodeBtn'),
    myCodeBox: document.getElementById('myCodeBox'),
    myCodeActions: document.getElementById('myCodeActions'),
    myCodeCopyBtn: document.getElementById('myCodeCopyBtn'),
    myCodeCopyMsg: document.getElementById('myCodeCopyMsg'),
    guestCodeInput: document.getElementById('guestCodeInput'),
    guestCodeClearBtn: document.getElementById('guestCodeClearBtn'),
    loadCodeBtn: document.getElementById('loadCodeBtn'),
    codeError: document.getElementById('codeError'),
    guestStatus: document.getElementById('guestStatus'),
    companionLeft: document.getElementById('companionLeft'),
    companionRight: document.getElementById('companionRight'),
    partnerCompanion: document.getElementById('partnerCompanion'),
    companionDexGrid: document.getElementById('companionDexGrid'),
    rareCompanionDexDivider: document.getElementById('rareCompanionDexDivider'),
    rareCompanionDexProgress: document.getElementById('rareCompanionDexProgress'),
    rareCompanionDexGrid: document.getElementById('rareCompanionDexGrid'),
    companionDexProgress: document.getElementById('companionDexProgress'),
    partnerDexGrid: document.getElementById('partnerDexGrid'),
    partnerDexProgress: document.getElementById('partnerDexProgress'),
    commBtn: document.getElementById('commBtn'),
    commOverlay: document.getElementById('commOverlay'),
    commCloseBtn: document.getElementById('commCloseBtn'),
    openDuelBtn: document.getElementById('openDuelBtn'),
    duelOverlay: document.getElementById('duelOverlay'),
    duelCloseBtn: document.getElementById('duelCloseBtn'),
    duelHomeSection: document.getElementById('duelHomeSection'),
    duelRecord: document.getElementById('duelRecord'),
    duelTraitSummary: document.getElementById('duelTraitSummary'),
    duelStartChallengeBtn: document.getElementById('duelStartChallengeBtn'),
    duelStartGuessBtn: document.getElementById('duelStartGuessBtn'),
    duelBetSection: document.getElementById('duelBetSection'),
    duelOwnMoney: document.getElementById('duelOwnMoney'),
    duelBetInput: document.getElementById('duelBetInput'),
    duelBetError: document.getElementById('duelBetError'),
    duelBetConfirmBtn: document.getElementById('duelBetConfirmBtn'),
    duelGuessCodeInSection: document.getElementById('duelGuessCodeInSection'),
    duelGuessCodeInput: document.getElementById('duelGuessCodeInput'),
    duelGuessCodeClearBtn: document.getElementById('duelGuessCodeClearBtn'),
    duelGuessCodeError: document.getElementById('duelGuessCodeError'),
    duelGuessCodeBtn: document.getElementById('duelGuessCodeBtn'),
    duelQuestionSection: document.getElementById('duelQuestionSection'),
    duelBackBtn: document.getElementById('duelBackBtn'),
    duelProgress: document.getElementById('duelProgress'),
    duelLieCoinRow: document.getElementById('duelLieCoinRow'),
    duelLieCoinCount: document.getElementById('duelLieCoinCount'),
    duelQuestionEmoji: document.getElementById('duelQuestionEmoji'),
    duelQuestionText: document.getElementById('duelQuestionText'),
    duelQuestionShown: document.getElementById('duelQuestionShown'),
    duelTruthChoiceRow: document.getElementById('duelTruthChoiceRow'),
    duelChoiceABtn: document.getElementById('duelChoiceABtn'),
    duelChoiceBBtn: document.getElementById('duelChoiceBBtn'),
    duelHonestyChoiceRow: document.getElementById('duelHonestyChoiceRow'),
    duelTestimonyRow: document.getElementById('duelTestimonyRow'),
    duelHonestBtn: document.getElementById('duelHonestBtn'),
    duelLieBtn: document.getElementById('duelLieBtn'),
    duelLieFlash: document.getElementById('duelLieFlash'),
    duelAnswerReviewSection: document.getElementById('duelAnswerReviewSection'),
    duelAnswerReviewList: document.getElementById('duelAnswerReviewList'),
    duelAnswerReviewLieCount: document.getElementById('duelAnswerReviewLieCount'),
    duelRestartAnswersBtn: document.getElementById('duelRestartAnswersBtn'),
    duelRerollQuestionsBtn: document.getElementById('duelRerollQuestionsBtn'),
    duelRerollConfirmRow: document.getElementById('duelRerollConfirmRow'),
    duelRerollCancelBtn: document.getElementById('duelRerollCancelBtn'),
    duelRerollYesBtn: document.getElementById('duelRerollYesBtn'),
    duelFinalizeChallengeBtn: document.getElementById('duelFinalizeChallengeBtn'),
    duelGuessListSection: document.getElementById('duelGuessListSection'),
    duelGuessList: document.getElementById('duelGuessList'),
    duelGuessConfirmError: document.getElementById('duelGuessConfirmError'),
    duelGuessConfirmBtn: document.getElementById('duelGuessConfirmBtn'),
    duelSuspicionSection: document.getElementById('duelSuspicionSection'),
    duelSuspicionList: document.getElementById('duelSuspicionList'),
    duelSuspicionError: document.getElementById('duelSuspicionError'),
    duelCodeOutSection: document.getElementById('duelCodeOutSection'),
    duelCodeOutHint: document.getElementById('duelCodeOutHint'),
    duelCodeOutBox: document.getElementById('duelCodeOutBox'),
    duelCodeOutCopyBtn: document.getElementById('duelCodeOutCopyBtn'),
    duelCodeOutCopyMsg: document.getElementById('duelCodeOutCopyMsg'),
    duelCodeOutDoneBtn: document.getElementById('duelCodeOutDoneBtn'),
    duelAbandonBtn: document.getElementById('duelAbandonBtn'),
    duelCodeInSection: document.getElementById('duelCodeInSection'),
    duelCodeInHint: document.getElementById('duelCodeInHint'),
    duelCodeInInput: document.getElementById('duelCodeInInput'),
    duelCodeInClearBtn: document.getElementById('duelCodeInClearBtn'),
    duelCodeInError: document.getElementById('duelCodeInError'),
    duelCodeInBtn: document.getElementById('duelCodeInBtn'),
    duelCodeInAbandonBtn: document.getElementById('duelCodeInAbandonBtn'),
    duelResultSection: document.getElementById('duelResultSection'),
    duelRevealStage: document.getElementById('duelRevealStage'),
    duelRevealProgress: document.getElementById('duelRevealProgress'),
    duelRevealRunning: document.getElementById('duelRevealRunning'),
    duelRevealCard: document.getElementById('duelRevealCard'),
    duelRevealEmoji: document.getElementById('duelRevealEmoji'),
    duelRevealText: document.getElementById('duelRevealText'),
    duelRevealPub: document.getElementById('duelRevealPub'),
    duelRevealTestimony: document.getElementById('duelRevealTestimony'),
    duelRevealGuess: document.getElementById('duelRevealGuess'),
    duelRevealOutcome: document.getElementById('duelRevealOutcome'),
    duelRevealOutcomeTitle: document.getElementById('duelRevealOutcomeTitle'),
    duelRevealOutcomeDesc: document.getElementById('duelRevealOutcomeDesc'),
    duelRevealOutcomePoints: document.getElementById('duelRevealOutcomePoints'),
    duelRevealNextBtn: document.getElementById('duelRevealNextBtn'),
    duelFinalStage: document.getElementById('duelFinalStage'),
    duelResultTitle: document.getElementById('duelResultTitle'),
    duelResultScore: document.getElementById('duelResultScore'),
    duelResultDesc: document.getElementById('duelResultDesc'),
    duelResultBreakdown: document.getElementById('duelResultBreakdown'),
    duelRematchBtn: document.getElementById('duelRematchBtn'),
    duelResultCloseBtn: document.getElementById('duelResultCloseBtn'),
  };

  function freshState() {
    return {
      stage: STAGE.EGG,
      speciesLine: null,
      stageIndex: 0,
      hunger: 90,
      happiness: 90,
      energy: 90,
      health: 100,
      // ねんれいは ageTicks からしか もとまらない(たんちょう増加)
      ageTicks: 0,
      // そだち - ねんれいと ならぶ もうひとつの 中心の かず
      sodachi: SODACHI_START,
      maxSodachi: SODACHI_START,
      growth: 0,
      decline: 0,
      // せいちょう2ばいの ブースト(tick が すすんでいる あいだ だけ へる)
      boostTicks: 0,
      // 安定ボーナスの「ちょくご 60秒いないに お世話した」カウンタ
      recentActionTicks: 0,
      // すいみんを 何tick つづけたか(20いじょうで はじめて みとめる)
      sleptTicks: 0,
      // 90さいで 1かいだけ チャージされる きせきの ふんばり
      miracleGuard: false,
      // おわかれの まえぶれ
      dying: false,
      dyingTicks: 0,
      // この人生で へんしんした かいすうと、すでに へんしんした ステージ
      transformsThisLife: 0,
      // この人生の はじまりの lifetime.devolutions(おとろえゼロ判定に つかう)
      declineBaseline: 0,
      transformStageDone: [],
      // ときのすな系(せいちょうの おいかぜ)の この人生での しようかいすう
      // そだち50「こいの きざし」の デートの クールダウン(tick)。デートは
      // なんども たのしめる けれど、コイン/アイテムを かせぐ ばしょには
      // しない ため、つづけて さそえない ように している
      dateCooldownTicks: 0,
      // この人生で デートに いった かいすう(人生記録カードに のる)
      datesThisLife: 0,
      // けっこんした ときの ねんれいと、すでに おいわいした きねんび。
      // 1/10/25/50周年だけを人生の大きな節目として扱う
      marriageAge: null,
      marriageMilestonesSeen: [],
      // そだち90「でんせつの であい」は 1つの 人生で 1かいだけ おきる
      legendMet: false,
      // この子の 人生の きろく
      lifeLog: [],
      // 40〜70さいの あいだに 1かいずつ おきる「ちゅうねんの できごと」の ねんれい
      midlifeSeen: [],
      // さいごに ほぞんした じこく(るすのあいだの けいかを だす ため)
      savedAt: 0,
      // ♾️ の せかい(パーフェクトクリア後の 自由モード)
      infinite: false,
      infiniteForm: null,
      // ♾️ に はいる まえの 人生を まるごと しまっておく ばしょ。
      // 「いっしょうに もどる」で ここから もとの 人生を そのまま
      // ふくげんする ので、♾️ は 人生を リセットしない。state の 一部な ので
      // セーブにも のり、ページを ひらきなおしても もどれる
      infiniteReturn: null,
      schemaVersion: 4,
      romanceCompatibilityVersion: 2,
      pendingLegacyRelationshipResolution: null,
      poopCount: 0,
      isSick: false,
      sicknessType: null,
      totalSicknessCount: 0,
      // この人生で びょうきを なおした かいすう。フェニックスの 解禁条件に
      // つかう(「びょうきに なった かいすう」だと、上手く そだてるほど
      // とどかない ぎゃくインセンティブに なって しまう ため)
      sicknessCuredThisLife: 0,
      isSleeping: false,
      // パーフェクトクリア(ずかん・じっせき りょうほう コンプリート)を
      lowHealthStreak: 0,
      careSum: 0,
      careTicks: 0,
      // consecutive なでる/はなしかける taps with no "real" care action in
      // between - past a threshold, these flip from a nice reaction to an
      // annoyed one instead of just always being free positive stats
      affectionStreak: 0,
      // おなじく、たびを 連続で おしすぎた かいすう(ほかの おせわを
      // すると 0に もどる) - TRAVEL_SPAM_THRESHOLD を こえると 機嫌の
      // ボーナスが 逆転する
      travelStreak: 0,
      actionCounts: { feed: 0, play: 0, clean: 0, sleep: 0, medicine: 0, pet: 0, talk: 0 },
      traitCounts: { gentle: 0, wild: 0, calm: 0, brave: 0, romantic: 0 },
      minigameScoreSum: 0,
      minigameCount: 0,
      deathMeter: 0,
      transformMeter: 0,
      transformOptions: null,
      items: {},
      // つかいきり アイテム(CONSUMABLE_ITEMS)の うち、「つぎの 1かいだけ」
      // こうかを はっきする タイプの ものが つかう、いちじてきな フラグ
      // ちゅう(state ぜんたいと おなじく「はじめから」で リセットされる -
      // いま そだてている 1たいぶんの ちからな ため)
      oneTimeBoosts: {
        sicknessShieldCount: 0,
        breakupShield: null, // null | 'half' | 'full'
        courtBoost: null, // null | 'small' | 'big'
        minigameBoost: null, // null | 'small' | 'big'
        doubleCoins: false,
        safetyNet: false,
        travelGuarantee: false,
      },
      // きゅうあい・たび は「はじめから」で ほかの おせわの きろくと
      // いっしょに リセットされる、今の いっしょうぶんの じょうたい。
      // gender/orientationId/attractedTo は 卵が かえった しゅんかんに
      // rollIdentity() で きまる(hatchEgg() 参照)
      partner: null,
      gender: null,
      orientationId: null,
      attractedTo: [],
      // クエスチョニングの あいだだけ つかう、けいけんの カウンター
      questioningEncounters: 0,
      // ともだちの「あいてコード」を よみこんで あらわれる おきゃくさん。
      // その プレイ中は ずっと のこり、「はじめから」で きえる
      guest: null,
      // いま そばに いる なかま({id, bond}の はいれつ)。state.lifetime.
      // companionsRecruited(いちど でも であった ことの ある えいきゅうの
      // きろく)とは べつに、こちらは「いま いっしょに いる かどうか」を
      // あらわす いっしょうぶんの じょうたい。じゃれるを おさぼると bond が
      // へっていき、0で はなれて いってしまう(ただし きろく じたいは
      // きえない)。「はじめから」の たびに lifetime.companionsRecruited
      // から bond100で つくりなおされる(resetBtn の ハンドラー さんしょう)
      companions: [],
      regionId: 'home',
      discoveredStages: [],
      // cross-playthrough counters for じっせき (achievements) - unlike
      // most of this object these are never reset by "はじめから" (see the
      // resetBtn handler)
      lifetime: {
        evolutions: 0,
        devolutions: 0,
        transforms: 0,
        clears: 0,
        deaths: 0,
        minigamesPlayed: 0,
        sicknessCured: 0,
        maxAgeReached: 0,
        resets: 0,
        // ② はじめての いっしょうクリア(100さい + 最高そだち70)の かいすう。
        // ① てんじゅを まっとうした かいすうは clears が うけもつ
        lifeClears: 0,
        // これまでの 人生で とうたつした そだちの さいこう記録
        bestSodachi: 0,
        // ③ さいこうの いっしょう(100さい + そだち100)の かいすう
        bestLives: 0,
        // おとろえ ゼロの まま 100さいまで いった かいすう
        flawlessLives: 0,
        // ⑤ パーフェクトクリア(ずかん + じっせき 両方)を 一度でも たっせいしたか。
        // これが true の あいだ だけ ♾️ の せかいに はいれる
        // ④ ずかんクリア(図鑑168形態)を 一度でも たっせいしたか
        dexCleared: false,
        perfectCleared: false,
        // 歴代の なおとっちの ようやく(「はじめから」の たびに 1行 つみあがる)
        pastLives: [],
        // 「たまごの ゆめ」「でんせつの ゆめ」の 在庫と、つぎの たまごに
        // していする しゅぞく
        dreamEggs: { normal: 0, rare: 0 },
        nextEggLine: null,
        // which of the 4 getEndingTier() endings have ever been reached
        // (across any playthrough) - drives the permanent badge row on the
        // normal screen and the rainbow screen once all 4 are collected
        endingTiersReached: [],
        // えらんだ ほんたい・がめんの いろ(COLOR_THEMES の id) - じっせき/
        // ずかんと おなじく「はじめから」しても消えない、永続の せってい
        deviceThemeId: 'default',
        screenThemeId: 'default',
        // 「せかい」→「きせつを かえる」で えらんだ きせつの せってい
        // モード('auto'|'spring'|'summer'|'autumn'|'winter')。地域(regionId)
        // とはちがい「なおとっちが くらす せかい」の じょうたいなので、
        // でざいんの いろ・がらと おなじく「はじめから」しても きえない
        // 永続せってい としてあつかう。きせつせってい を もたない ふるい
        // セーブデータは loadState() の lifetime マージで じどうに 'auto'が
        // 補われる(getEffectiveSeason() 参照)。SEASON_MODE_AUTO 定数は この
        // freshState() より あとで 定義される ため、じゅんじょの もんだいを
        // さける ために ここだけ リテラル文字列 'auto' を じかに つかう
        seasonMode: 'auto',
        timeMode: 'auto',
        weatherMode: 'auto',
        // せかい(てんき・じかんたい)の きろく: 見た てんき/じかんたい、
        // てんき・じかんたい ごとの あそんだ かいすう、できごとの かいすう
        weatherSeen: [],
        timeSeen: [],
        envPlays: {},
        envMoments: 0,
        // ミニゲームの むずかしさ(easy/normal/hard)と おとの せってい
        minigameDifficulty: 'normal',
        // ながい ゲーム(90びょう いじょう)を みじかく する せってい(normal/short)
        minigameLength: 'normal',
        soundSfx: true,
        soundBgm: true,
        currentLocationSelected: false,
        fontStyle: 'rounded',
        textSize: 'normal',
        // えらんだ ほんたい・がめんの がら(PATTERNS の id) - いろとは
        // どくりつに えらべる、もうひとつの おしゃれ せってい
        devicePatternId: 'none',
        screenPatternId: 'none',
        // なかまイベントに クリアして なかまに なった COMPANIONS の id 一覧。
        // ずかん・じっせきと おなじく「はじめから」しても消えず、画面の
        // よこに ずっと 表示されつづける、プレイをまたいだ 永続コレクション
        companionsRecruited: [],
        // そだち80「レアの きざし」で であえる RARE_COMPANIONS の id 一覧。
        // companionsRecruited とは べつの ばしょに つむ ことで、じっせきの
        // 「なかま だいしゅうごう(ぜんいん10にん)」の じょうけんを 1ミリも
        // かえない(レアなかまが パーフェクトクリアを おもく しない)
        rareCompanionsRecruited: [],
        // まだ なかまに なっていない相手との交流成功回数(id→回数)。
        // はじめての出会い1回だけでは仲間にならず、再会の物語を作るために使う。
        companionFriendshipProgress: {},
        // 地域ごとの きめうちキャラ(REGIONSの candidates)のうち、いままで
        // こいびとに なった ことが ある id の一覧と、そのうち けっこんまで
        // いたった id の一覧。どちらも「ずかん」の「こいびと」セクション
        // として 永続に 記録される(あいてコードの おきゃくさんは 種族の
        // ずかんに 記録されるので、ここには ふくまれない)
        partnersRecorded: [],
        partnerEncounters: [],
        partnersMarried: [],
        // おかね(ミニゲーム大成功などで もらえる)と、それで こうにゅう
        // した SHOP_ITEMS の id 一覧、いま そうびちゅうの id。いろ・がら
        // せっていと おなじく「はじめから」しても消えない永続の せってい
        money: 0,
        ownedShopItems: [],
        equippedItemId: null,
        // 「なおとの〜」でんせつアイテム(NAOTO_ITEMS)の うち、こうにゅう
        // ずみの id 一覧。そうび/かいじょの きがえは なく、こうにゅうすれば
        // それいこう ずっと こうかを はっきしつづける(SHOP_ITEMS とは
        // ちがい、いちどに 1つまでの せいげんも ない)
        ownedNaotoItems: [],
        // つかいきり アイテム(CONSUMABLE_ITEMS)を こうにゅう/しよう した
        // のべ かいすう。じっせきの「つかいきりの たつじん」などに つかう
        consumablesUsed: 0,
        // つかいきり アイテム(CONSUMABLE_ITEMS)の うち、いままでに 1かい
        // でも こうにゅう した ことの ある id 一覧(のべ かいすうとは べつに、
        // しゅるいの じゅうふくを のぞいて かうんとする)。じっせきの
        // 「つかいきるもの コンプリート」に つかう
        ownedConsumableItems: [],
        // つかいきり アイテムの「すきな いろ/がらの チケット」で、tier
        // 条件を みたす前に とくべつに 解放した COLOR_THEMES/PATTERNS の
        // id。"color:<id>" / "pattern:<id>" の かたちで もつ(いろ・がらで
        // おなじ id が つかわれている ばあいの きりわけの ため)。
        // unlockAll(レインボー)は ここでは あつかわない - こちらは
        // かならず 4段階 ぜんぶの クリアで しか 解放できない
        bonusUnlockedThemeIds: [],
        // 「たび」で いちど でも おとずれた ことの ある地域(REGIONS の id)
        // の いちらん。じっせきの「せかい いっしゅう」に つかう。「おうち」
        // は さいしょから いる ので、あらかじめ ふくめておく
        regionsVisited: ['home'],
        // そだち70「たびだち」で ひらく SPECIAL_REGIONS の うち、たどりついた
        // ことの ある id。regionsVisited とは べつに つむ ことで、じっせきの
        // 「せかい いっしゅう(ぜんぶの地域(REGIONS の 11))」の じょうけんを かえない
        specialRegionsVisited: [],
        // そだち50「こいの きざし」の デートに いった のべ かいすう
        datesEnjoyed: 0,
        // そだち90「でんせつの であい」で であった でんせつの id 一覧。
        // 「はじめから」しても きえない、じっせきに ならない コレクション
        legendsMet: [],
        // 「あそぶ」で えらばれた ミニゲームを、なんかい あそんだかの
        // きろく(id→かいすう)。id は `${category}#${そのカテゴリの
        // なんばんめか}` の かたち(pickRandomMinigame() ふきん さんしょう)。
        // regionsVisited と おなじ かんがえかたで、「はじめから」しても
        // きえない プレイヤーぜんたいの けいけんとして あつかう(未プレイ
        // 優遇/アンチリピートの おもみづけに つかう)
        minigamePlayCounts: {},
        // ゲームごとの じこベスト(id→{ best, last })。てんすうは アイテムの
        // ボーナスを のぞいた「じつりょくの てんすう」(0〜100)で きろくし、
        // ランク(S/A/B/C/D)も ここから ひく。minigamePlayCounts と おなじく
        // 「はじめから」しても きえない
        minigameRecords: {},
        // きょうの チャレンジ(ひづけで きまる 1本を 1日1かい)。{ date, gameId, score, rank }
        dailyChallenge: null,
        dailyStreak: 0,
        dailyLastDate: null,
        // 「うそつきしょうぶ」(2人用の あいてコード対戦)の えいきゅう記録。
        // なおとっち本体(ペット)の じんせいとは べつの、あそんでいる
        // 人間の しこう傾向な ので「はじめから」しても きえない。
        // duelTraits は しつもんに 正直に こたえた とき だけ すこしずつ
        // たまる(うそを ついた ラウンドぶんは かうんとしない)
        duelTraits: { cautious: 0, active: 0, jealous: 0, romantic: 0, secretive: 0, spoiled: 0, myPace: 0, realist: 0 },
        duelMatchesPlayed: 0,
        duelWins: 0,
        duelLosses: 0,
        duelDraws: 0,
        // せんぞくの せいせき(しょうらい じっせき/プロフィールにも つかえる
        // ように、こまかく のこしておく)
        duelLiesUsed: 0,
        duelLiesSucceeded: 0,
        duelLiesFacedAsGuesser: 0,
        duelLiesDetected: 0,
        duelHonestAnswersGiven: 0,
        duelHonestMisread: 0,
        duelLongestLieStreak: 0,
        // さいきん だした しつもんの id(あたらしい じゅん)。つぎの
        // しゅつだいで ここに ふくまれる ものは できるだけ さける
        duelRecentQuestionIds: [],
      },
      achievementsUnlocked: [],
      // 「うそつきしょうぶ」の しんこうちゅうの たいせん。ゲスト(state.guest)
      // と おなじく、いま そだてている 1たいぶんの いちじてきな じょうたい
      // なので「はじめから」で リセットされる
      duel: null,
    };
  }

  let pendingMigrationQuiet = false;

  function loadState() {
    // 通常セーブもバックアップも、同じ移行処理を最後まで通してから採用する。
    const migrate = (raw) => {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid save payload');
      const merged = { ...freshState(), ...parsed };
      // lifetime is a nested object, so the shallow merge above replaces it
      // wholesale with the save's own (possibly older, field-missing)
      // lifetime rather than filling gaps - patch those gaps in explicitly
      // so a field added in a later version doesn't come back undefined
      merged.lifetime = { ...freshState().lifetime, ...(parsed.lifetime || {}) };
      // 地域/きせつゲームの id を「登録順の 連番(region:city:road:0 …)」から
      // 固定の 文字列 id に かえた ぶんを ひきつぐ(プレイ回数の きろく)
      const LEGACY_MINIGAME_IDS = {
        'region:city:road:0': 'road-city', 'region:countryside:stack:1': 'stack-harvest', 'region:forest:stack:2': 'stack-acorn',
        'region:jungle:road:3': 'road-jungle', 'region:desert:road:4': 'road-desert',
        'season:spring:stack:5': 'stack-sakura', 'season:autumn:stack:6': 'stack-leaves',
      };
      const counts = merged.lifetime.minigamePlayCounts;
      if (counts && typeof counts === 'object') {
        for (const [oldId, newId] of Object.entries(LEGACY_MINIGAME_IDS)) {
          if (counts[oldId] == null) continue;
          counts[newId] = (counts[newId] || 0) + counts[oldId];
          delete counts[oldId];
        }
      }
      if (!merged.lifetime.minigameRecords || typeof merged.lifetime.minigameRecords !== 'object') merged.lifetime.minigameRecords = {};
      // 旧ショップの上位互換を、同じ役割の新しい1種類へまとめて引き継ぐ。
      const OLD_ITEM_BASE = {
        flower2:'flower', flower3:'flower', ribbon2:'ribbon', ribbon3:'ribbon', bowtie2:'bowtie', bowtie3:'bowtie',
        poop2:'poop1', poop3:'poop1', scarf2:'scarf', scarf3:'scarf', glasses2:'glasses', glasses3:'glasses',
        energy2:'energy1', energy3:'energy1', hat2:'hat', hat3:'hat', travel2:'travel1', travel3:'travel1',
        sleepboost2:'sleepboost1', sleepboost3:'sleepboost1', star2:'star', star3:'star', bond2:'bond1', bond3:'bond1',
        partner2:'partner1', partner3:'partner1', crown2:'crown', crown3:'crown', itemluck2:'itemluck1', itemluck3:'itemluck1'
      };
      const oldOwned = Array.isArray(merged.lifetime.ownedShopItems) ? merged.lifetime.ownedShopItems : [];
      merged.lifetime.ownedShopItems = [...new Set(oldOwned.map((id) => OLD_ITEM_BASE[id] || id).filter((id) => SHOP_ITEMS.some((it) => it.id === id)))];
      merged.lifetime.equippedItemId = OLD_ITEM_BASE[merged.lifetime.equippedItemId] || merged.lifetime.equippedItemId;
      if (!SHOP_ITEMS.some((it) => it.id === merged.lifetime.equippedItemId)) merged.lifetime.equippedItemId = null;
      // 旧回復ごほうびは在庫をそのまま大量変換せず、まとめて最大2個の新ごほうびへ。
      const oldRewardIds = ['candy','dogfood','catfood','udon','curry','hotpot','shoulder','hug','kiss'];
      let oldRewardCount = 0;
      if (!merged.items || typeof merged.items !== 'object') merged.items = {};
      oldRewardIds.forEach((id) => { oldRewardCount += Number(merged.items[id]) || 0; delete merged.items[id]; });
      if (oldRewardCount > 0) merged.items.reward = (Number(merged.items.reward) || 0) + Math.min(2, Math.ceil(oldRewardCount / 5));
      // migrate saves from before growth lines existed - old stage values
      // were egg/baby/child/teen/adult/elder/dead/clear (plus a legacy
      // adult_good/adult_bad from even earlier), with one shared species
      // decided at teen->adult instead of a per-line stage list from hatch
      const OLD_STAGE_MAP = {
        adult_good: { stageIndex: 6, species: 'dog' },
        adult_bad: { stageIndex: 6, species: 'stagbeetle' },
        baby: { stageIndex: 0, species: null },
        child: { stageIndex: 2, species: null },
        teen: { stageIndex: 4, species: null },
        adult: { stageIndex: 6, species: parsed.species || null },
        elder: { stageIndex: 7, species: parsed.species || null },
      };
      if (Object.prototype.hasOwnProperty.call(OLD_STAGE_MAP, parsed.stage)) {
        const mapped = OLD_STAGE_MAP[parsed.stage];
        merged.stage = STAGE.GROWING;
        merged.stageIndex = mapped.stageIndex;
        merged.speciesLine = mapped.species || pickRandomLine();
      }
      // このセーブに まだ gender が ない(きゅうあい きのうより 前の
      // セーブ、または 上の きゅう形式からの いこう)のに もう そだって
      // いる ばあいは、いまここで さかのぼって ロールしておく
      if (merged.stage === STAGE.GROWING && !merged.gender) {
        const identity = rollIdentity(merged.speciesLine);
        merged.gender = identity.gender;
        merged.orientationId = identity.orientationId;
        merged.attractedTo = identity.attractedTo;
      }
      // 恋愛対象は identity の一部。straight/gay/pan/aro/questioning は
      // gender + orientationId から再構築し、bi は個体ごとの対象範囲を保存して維持する。
      if (merged.stage === STAGE.GROWING && merged.gender && merged.orientationId) {
        const savedSelfTargets = parsed.attractedTo;
        const legacyBiWithoutTargets = merged.orientationId === 'bi'
          && (!Array.isArray(savedSelfTargets) || savedSelfTargets.length < 2);
        merged.attractedTo = legacyBiWithoutTargets && merged.partner
          ? [...GENDERS]
          : normalizeAttractedTo(merged.gender, merged.orientationId, savedSelfTargets);
      }

      // 恋人側の bi も、付き合った時点の対象範囲を partner.attractedTo として保存する。
      // 旧セーブには無いので、その場合だけ現在の identity から補う。
      if (merged.partner && merged.partner.gender && merged.partner.orientationId) {
        const savedPartnerTargets = parsed.partner && parsed.partner.attractedTo;
        // 旧バージョンでは partner.attractedTo 自体を保存していなかった。
        // その相手が bi の場合、ここでランダム再抽選して「対象外」と判定すると、
        // 本来成立していた古いカップルまで誤って解消してしまう。
        // 情報が失われている旧bi恋人だけは、既存関係が成立していた事実を優先し、
        // 全ジェンダー対象として安全に移行する。今後の新規bi恋人は実際の対象範囲を保存する。
        const legacyBiWithoutTargets = merged.partner.orientationId === 'bi'
          && (!Array.isArray(savedPartnerTargets) || savedPartnerTargets.length < 2);
        merged.partner.attractedTo = legacyBiWithoutTargets
          ? [...GENDERS]
          : normalizeAttractedTo(merged.partner.gender, merged.partner.orientationId, savedPartnerTargets);
      }

      // 恋愛互換ルールv2への一回限りの移行。
      // 旧実装の不整合で「表示上は対象外なのに夫婦/恋人」になっていた場合だけ、
      // アップデート後に自然な会話を出して関係を整理する。通常プレイ中に
      // 変身などで起きる intentional な「すれちがい」は従来どおり残す。
      if ((parsed.romanceCompatibilityVersion || 0) < 2) {
        merged.romanceCompatibilityVersion = 2;
        if (merged.partner && merged.gender && merged.orientationId) {
          const selfTargets = normalizeAttractedTo(merged.gender, merged.orientationId, merged.attractedTo);
          const partnerTargets = normalizeAttractedTo(
            merged.partner.gender,
            merged.partner.orientationId,
            merged.partner.attractedTo
          );
          const compatible = selfTargets.includes(merged.partner.gender) && partnerTargets.includes(merged.gender);
          if (!compatible) {
            merged.pendingLegacyRelationshipResolution = {
              label: merged.partner.label,
              emoji: merged.partner.emoji,
              married: !!merged.partner.married,
            };
            merged.partner = null;
          }
        }
      }
      // なかまの bond きのう(state.companions)より 前の セーブには この
      // フィールドが まだ ないので、いままで どおり lifetime.
      // companionsRecruited ぜんいんが bond100で そばに いる じょうたいから
      // はじめる(とつぜん だれかが いなくなった ように 見えないように)
      if (!Object.prototype.hasOwnProperty.call(parsed, 'companions')) {
        merged.companions = merged.lifetime.companionsRecruited.map((id) => ({ id, bond: 100 }));
      }

      // 入れ替えた仲間は現在のIDへ引き継ぎ、重複時も高いなかよし度を保つ。
      for (const key of ['companionsRecruited', 'rareCompanionsRecruited']) {
        merged.lifetime[key] = [...new Set(merged.lifetime[key].map(canonicalCompanionId))];
      }
      const migratedCompanions = new Map();
      for (const companion of merged.companions) {
        const id = canonicalCompanionId(companion.id);
        const previous = migratedCompanions.get(id);
        if (!previous || (companion.bond || 0) > (previous.bond || 0)) {
          migratedCompanions.set(id, { ...companion, id });
        }
      }
      merged.companions = [...migratedCompanions.values()];

      // ================================================================
      // schemaVersion 3 への いこう(ねんれい/そだち の あたらしい しくみ)
      // ================================================================
      // SAVE_KEY は かえない ので、lifetime(ずかん・じっせき・おかね・
      // アイテム・いろ/がら/きせつ)は まるごと そのまま のこる
      // ★ merged は freshState() を ベースに しているので schemaVersion が
      // すでに 3 に なっている。いこうが ひつようかは かならず parsed 側で 判定する
      if ((parsed.schemaVersion || 0) < 3) {
        // 旧 state.age は 内部スケール(表示ねんれい = age/20)だった。
        // 表示ねんれいが かわらない ように tick 数へ ひきなおす
        const displayedAge = clamp(Math.floor((parsed.age || 0) / 20), 0, GOAL_AGE);
        merged.ageTicks = displayedAge * AGE_TICKS_PER_YEAR;
        // stageIndex は すてて ねんれいから ひきなおす(そのぶん 見た目が
        // かわる ことは あるが、きろくは 1つも うしなわれない)
        merged.stageIndex = stageForAge(displayedAge);
        // メーターは いみが かわる ので 0 から
        merged.growth = 0;
        merged.decline = 0;
        // とちゅうから はじまる 子なので、そだちは 中間値の 50 から
        merged.sodachi = 50;
        merged.maxSodachi = 50;
        // 旧 freePlay は tier3(ずかん+じっせき コンプリート)でしか
        // つけられなかった ので、その プレイヤーは すでに ⑤ パーフェクト
        // クリア ずみ。♾️ の せかいを 解禁ずみとして ひきつぐ
        if (parsed.freePlay) {
          merged.lifetime.perfectCleared = true;
          merged.infinite = true;
        }
        // 旧「クリア」じょうたいで とまっていた セーブは、あたらしい
        // 「さいごの じかん」に ひきなおす。そこから 人生記録カード →
        // あたらしい たまご へ すすめる(ちゅうぶらりんに しない)
        if (parsed.stage === 'clear') {
          merged.stage = STAGE.FAREWELL;
          merged.ageTicks = GOAL_AGE * AGE_TICKS_PER_YEAR;
          merged.stageIndex = stageForAge(GOAL_AGE);
        }
        merged.declineBaseline = merged.lifetime.devolutions || 0;
        merged.schemaVersion = 3;
        // いこうの しゅんかんに たんじょうび/すがたの へんか/死亡が
        // ぼうはつ しない ように、この よみこみでは 演出を ぬく
        pendingMigrationQuiet = true;
      }

      // ================================================================
      // schemaVersion 4 への いこう(1さい=54秒 → 1さい=60秒)
      // ================================================================
      // v3 セーブの ageTicks は 18tick/年で記録されている。そのまま20へ変えると
      // 例: 50さいの子が45さいに見えてしまうので、人生の進み具合を 20/18 倍して
      // 表示年齢と「次の誕生日までの途中経過」を両方そのまま保つ。
      if ((parsed.schemaVersion || 0) === 3) {
        const OLD_AGE_TICKS_PER_YEAR = 18;
        merged.ageTicks = Math.round((Number(parsed.ageTicks) || 0) * AGE_TICKS_PER_YEAR / OLD_AGE_TICKS_PER_YEAR);
        if (merged.infiniteReturn && typeof merged.infiniteReturn === 'object') {
          merged.infiniteReturn.ageTicks = Math.round((Number(merged.infiniteReturn.ageTicks) || 0) * AGE_TICKS_PER_YEAR / OLD_AGE_TICKS_PER_YEAR);
          merged.infiniteReturn.schemaVersion = 4;
        }
        pendingMigrationQuiet = true;
      }
      merged.schemaVersion = 4;

      // 旧版の途中状態などで endingTiersReached に tier0(🎉)だけ残っていても、
      // 実際に100さいクリアを一度もしていない(clears===0)なら未達成として扱う。
      // これで「一度もクリアしていないのに左上に🎉」を既存セーブからも除去する。
      if ((Number(merged.lifetime.clears) || 0) <= 0 && Array.isArray(merged.lifetime.endingTiersReached)) {
        merged.lifetime.endingTiersReached = merged.lifetime.endingTiersReached.filter((tier) => tier !== 0);
      }
      // 旧版で購入式だった「なおとの〜」を、達成報酬式へ移行する。
      if (!Array.isArray(merged.lifetime.ownedNaotoItems)) merged.lifetime.ownedNaotoItems = [];
      NAOTO_ITEMS.forEach((item) => {
        if (merged.lifetime.endingTiersReached.includes(item.unlockTier) && !merged.lifetime.ownedNaotoItems.includes(item.id)) {
          merged.lifetime.ownedNaotoItems.push(item.id);
        }
      });

      // PR #98 より前から けっこんしている セーブには marriageAge がない。
      // lifeLog の「○さい ... けっこんした」を優先して復元する。記録がない
      // 古いセーブでは、現在年齢を結婚年齢として扱い、読み込み直後に過去の
      // 記念日ムービーがまとめて発火しないようにする。
      if (merged.partner && merged.partner.married && !Number.isFinite(Number(parsed.marriageAge))) {
        let recoveredMarriageAge = null;
        const logs = Array.isArray(merged.lifeLog) ? merged.lifeLog : [];
        for (const entry of logs) {
          if (!entry || !/けっこん/.test(String(entry.text || ''))) continue;
          const loggedAge = Number(entry.age);
          if (Number.isFinite(loggedAge)) {
            recoveredMarriageAge = clamp(Math.floor(loggedAge), 0, GOAL_AGE);
            break;
          }
        }
        merged.marriageAge = recoveredMarriageAge == null ? clamp(Math.floor((Number(merged.ageTicks) || 0) / AGE_TICKS_PER_YEAR), 0, GOAL_AGE) : recoveredMarriageAge;
        if (!Array.isArray(merged.marriageMilestonesSeen)) merged.marriageMilestonesSeen = [];
        const marriedYears = Math.max(0, clamp(Math.floor((Number(merged.ageTicks) || 0) / AGE_TICKS_PER_YEAR), 0, GOAL_AGE) - merged.marriageAge);
        for (const years of [1, 10, 25, 50]) {
          if (marriedYears >= years && !merged.marriageMilestonesSeen.includes(years)) {
            merged.marriageMilestonesSeen.push(years);
          }
        }
        pendingMigrationQuiet = true;
      }

      delete merged.age;
      delete merged.evoMeter;
      delete merged.devoMeter;
      delete merged.freePlay;
      return merged;
    };
    stateLoadRecovered = false;
    lastGoodSaveRaw = null;
    saveWriteBlocked = false;
    let failed = false;
    for (const key of [SAVE_KEY, SAVE_BACKUP_KEY]) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const merged = migrate(raw);
        lastGoodSaveRaw = raw;
        if (key === SAVE_KEY) {
          // 移行に失敗したデータで、正常なバックアップを上書きしない。
          try { localStorage.setItem(SAVE_BACKUP_KEY, raw); } catch (ignore) { /* backup is best effort */ }
        } else {
          stateLoadRecovered = true;
        }
        return merged;
      } catch (e) {
        failed = true;
      }
    }
    // 読み取り失敗と新規ゲームを区別し、起動直後の空データ保存を防ぐ。
    stateLoadRecovered = failed;
    saveWriteBlocked = failed;
    return freshState();
  }

  // marks the current line+stage as met, so the 図鑑 can show it instead of
  // a ❓ placeholder - called from saveState() so every persisted change
  // (not just growth events) keeps this in sync with what's on screen
  function recordDiscoveryKey(key) {
    if (!state.discoveredStages.includes(key)) {
      state.discoveredStages.push(key);
    }
  }

  function recordDiscovery() {
    if (state.stage === STAGE.GROWING || state.stage === STAGE.FAREWELL) {
      state.stageIndex = currentFormStageIndex();
    }
    if (state.stage !== STAGE.GROWING || !state.speciesLine) return;
    recordDiscoveryKey(`${state.speciesLine}:${state.stageIndex}`);
  }

  // じっせき (achievements) - permanent badges based on lifetime totals
  // (state.lifetime), separate from the current pet's per-playthrough
  // stats which reset with "はじめから". checkAchievements() runs from
  // saveState() so no individual call site needs to remember to check it
  // むずかしさが 低いと おもわれる じゅんに ならべてある(はじめの ほうは
  // ふつうに あそんでいれば すぐ たっせいでき、うしろに いくほど 長時間の
  // やりこみや 高額な おかねが 必要に なる)。dex-complete は「ずかんを
  // ぜんぶ うめる」判定そのものと 一対一な ため、endingProgress() の
  // achComplete 判定からは 除外している(ふくめると じゅんかん参照に
  // なって しまう)。「なおとの〜」でんせつアイテムを ぜんぶ てにいれる
  // じっせきは、あえて つくっていない - 最高位の アイテム(なおとの
  // かんむり)が「じっせき コンプリート」の さらに さきに ある tier3
  // クリアを 前提に しており、じっせきグリッドの 100%達成が 事実上
  // とどかない ものに なって しまうため
  const ACHIEVEMENTS = [
    // --- かんたん(ふつうに あそんでいれば すぐ とどく) ---
    { id: 'evolve-1', emoji: '🌱', label: 'はじめのいっぽ', desc: 'はじめてそだちがあがった', tier: 'easy', condition: (l) => l.evolutions >= 1 },
    { id: 'devolve-1', emoji: '👶', label: 'はじめてのおとろえ', desc: 'はじめてそだちがさがった', tier: 'easy', condition: (l) => l.devolutions >= 1 },
    { id: 'transform-1', emoji: '✨', label: 'はじめてのへんしん', desc: 'はじめてへんしんした', tier: 'easy', condition: (l) => l.transforms >= 1 },
    { id: 'death-1', emoji: '👻', label: 'はじめてのおわかれ', desc: 'はじめててんごくにいった', tier: 'easy', condition: (l) => l.deaths >= 1 },
    { id: 'minigame-50', emoji: '🎮', label: 'あそびのみならい', desc: 'ミニゲームを50かいあそんだ', tier: 'easy', condition: (l) => l.minigamesPlayed >= 50 },
    { id: 'record-rank-s-1', emoji: '🌟', label: 'はじめてのS', desc: 'ゲームきろくではじめてSランクをとった', tier: 'easy', condition: (l) => countMinigameRecords(l, (r) => r.best >= 90) >= 1 },
    { id: 'games-played-25', emoji: '🗂️', label: 'あそびめぐり', desc: '25しゅるいのミニゲームをあそんだ', tier: 'easy', condition: (l) => countMinigamesPlayed(l) >= 25 },
    { id: 'sick-cured-1', emoji: '💉', label: 'はじめてのかんびょう', desc: 'はじめてびょうきをなおした', tier: 'easy', condition: (l) => l.sicknessCured >= 1 },
    { id: 'age-10', emoji: '🐣', label: 'ひよっこそだち', desc: '10さいになった', tier: 'easy', condition: (l) => l.maxAgeReached >= 10 },
    { id: 'shop-1', emoji: '🎁', label: 'はじめてのおかいもの', desc: 'あいてむを初めて買った', tier: 'easy', condition: (l) => l.ownedShopItems.length >= 1 },
    { id: 'consumable-1', emoji: '🎈', label: 'はじめてのおたのしみ', desc: 'おたのしみをはじめてつかった', tier: 'easy', condition: (l) => (l.consumablesUsed || 0) >= 1 },
    { id: 'money-100', emoji: '💰', label: 'ちょきんかデビュー', desc: '持っているおかねが100以上になった', tier: 'easy', condition: (l) => l.money >= 100 },
    { id: 'region-3', emoji: '🧳', label: 'たびずき', desc: '3つの地域を訪れた', tier: 'easy', condition: (l) => l.regionsVisited.length >= 3 },

    // --- やや かんたん ---
    { id: 'time-all', emoji: '🕰️', label: 'いちにちのともだち', desc: '朝・昼・夕・夜をすべて過ごした', tier: 'easy2', condition: (l) => (l.timeSeen || []).length >= 4 },
    { id: 'rain-play', emoji: '☔', label: 'あめの日のあそび', desc: '雨の日にミニゲームであそんだ', tier: 'easy2', condition: (l) => ((l.envPlays || {}).rain || 0) >= 1 },
    { id: 'snow-play', emoji: '⛄', label: 'ゆきの日のあそび', desc: '雪の日にミニゲームであそんだ', tier: 'easy2', condition: (l) => ((l.envPlays || {}).snow || 0) >= 1 },
    { id: 'evolve-10', emoji: '🌿', label: 'ぐんぐんそだつ', desc: 'そだちが合計で10あがった', tier: 'easy2', condition: (l) => l.evolutions >= 10 },
    { id: 'devolve-5', emoji: '🍼', label: 'かえりみち', desc: 'そだちが合計で5さがった', tier: 'easy2', condition: (l) => l.devolutions >= 5 },
    { id: 'transform-10', emoji: '🌟', label: 'へんしんざんまい', desc: '10かいへんしんした', tier: 'easy2', condition: (l) => l.transforms >= 10 },
    { id: 'sick-cured-10', emoji: '💊', label: 'めいいのたまご', desc: 'びょうきを10かいなおした', tier: 'easy2', condition: (l) => l.sicknessCured >= 10 },
    { id: 'age-25', emoji: '🌼', label: 'すくすくせいちょう', desc: '25さいになった', tier: 'easy2', condition: (l) => l.maxAgeReached >= 25 },
    { id: 'dex-25', emoji: '📗', label: 'ずかんのはじまり', desc: 'ずかんを25しゅるいうめた', tier: 'easy2', condition: (l, s) => s.discoveredStages.length >= 25 },
    { id: 'feed-100', emoji: '🍚', label: 'ごはんだいすき', desc: 'ひとつの人生で、ごはんを100回あげた', tier: 'easy2', condition: (l, s) => s.actionCounts.feed >= 100 },
    { id: 'play-100', emoji: '🎯', label: 'あそびっぱなし', desc: 'ひとつの人生で、100回あそんだ', tier: 'easy2', condition: (l, s) => s.actionCounts.play >= 100 },
    { id: 'pet-100', emoji: '🤲', label: 'なでなでまめ', desc: 'ひとつの人生で「じゃれる」を100かいした', tier: 'easy2', condition: (l, s) => s.actionCounts.pet >= 100 },
    { id: 'talk-100', emoji: '💬', label: 'おしゃべりずき', desc: 'ひとつの人生で「じゃれる」を100かいした', tier: 'easy2', condition: (l, s) => s.actionCounts.talk >= 100 },
    { id: 'gentle-10', emoji: '💗', label: 'やさしいこころ', desc: 'ひとつの人生で、やさしい選択を10回した', tier: 'easy2', condition: (l, s) => s.traitCounts.gentle >= 10 },
    { id: 'brave-10', emoji: '🦁', label: 'ゆうかんなこころ', desc: 'ひとつの人生で、ゆうかんな選択を10回した', tier: 'easy2', condition: (l, s) => s.traitCounts.brave >= 10 },
    { id: 'romantic-10', emoji: '💘', label: 'ロマンチスト', desc: 'ひとつの人生で、ロマンチックな選択を10回した', tier: 'easy2', condition: (l, s) => s.traitCounts.romantic >= 10 },
    { id: 'companion-1', emoji: '🐾', label: 'はじめてのなかま', desc: 'はじめてなかまができた', tier: 'easy2', condition: (l) => l.companionsRecruited.length >= 1 },
    { id: 'partner-1', emoji: '💑', label: 'はじめてのこいびと', desc: 'はじめてこいびとができた', tier: 'easy2', condition: (l) => l.partnersRecorded.length >= 1 },
    { id: 'money-500', emoji: '💴', label: 'おおがねもち', desc: '持っているおかねが500以上になった', tier: 'easy2', condition: (l) => l.money >= 500 },

    // --- ふつう ---
    { id: 'weather-all', emoji: '🌦️', label: 'てんきはかせ', desc: '晴れ・くもり・雨・雪をすべて見た', tier: 'normal', condition: (l) => (l.weatherSeen || []).length >= 4 },
    { id: 'night-play-10', emoji: '🦉', label: 'よふかし', desc: '夜にミニゲームで10回あそんだ', tier: 'normal', condition: (l) => ((l.envPlays || {}).night || 0) >= 10 },
    { id: 'env-moments-10', emoji: '🍃', label: 'せかいをかんじる', desc: '天気や時間にちなんだ出来事に、10回出会った', tier: 'normal', condition: (l) => (l.envMoments || 0) >= 10 },
    { id: 'death-5', emoji: '💀', label: 'なんどもおわかれ', desc: '5かいてんごくにいった', tier: 'normal', condition: (l) => l.deaths >= 5 },
    { id: 'minigame-300', emoji: '🕹️', label: 'あそびどっぷり', desc: 'ミニゲームを300かいあそんだ', tier: 'normal', condition: (l) => l.minigamesPlayed >= 300 },
    { id: 'games-played-60', emoji: '🧭', label: 'あそびたんけんか', desc: '60しゅるいのミニゲームをあそんだ', tier: 'normal', condition: (l) => countMinigamesPlayed(l) >= 60 },
    { id: 'record-rank-a-20', emoji: '🎖️', label: 'Aランクコレクター', desc: '20しゅるいのゲームでAランクいじょう', tier: 'normal', condition: (l) => countMinigameRecords(l, (r) => r.best >= 75) >= 20 },
    { id: 'age-50', emoji: '🎂', label: 'はんせいき', desc: '50さいになった', tier: 'normal', condition: (l) => l.maxAgeReached >= 50 },
    { id: 'dex-50', emoji: '📘', label: 'ずかんなかば', desc: 'ずかんを50しゅるいうめた', tier: 'normal', condition: (l, s) => s.discoveredStages.length >= 50 },
    { id: 'rare-line-1', emoji: '🌈', label: 'レアなであい', desc: 'レアなしゅぞくにはじめてであった', tier: 'normal', condition: (l, s) => s.discoveredStages.some((e) => RARE_LINES.includes(e.split(':')[0])) },
    { id: 'clean-50', emoji: '🧹', label: 'ピカピカ50かい', desc: 'ひとつの人生で、そうじを50回した', tier: 'normal', condition: (l, s) => s.actionCounts.clean >= 50 },
    { id: 'reset-5', emoji: '🔄', label: 'なんどもちょうせん', desc: 'あたらしいたまごを5かいむかえた', tier: 'normal', condition: (l) => (l.resets || 0) >= 5 },
    { id: 'companion-5', emoji: '🐕', label: 'にぎやかななかよしグループ', desc: 'なかまが5にんできた', tier: 'normal', condition: (l) => l.companionsRecruited.length >= 5 },
    { id: 'companion-active-5', emoji: '💞', label: 'そばにいるしあわせ', desc: 'いまそばにいるなかまが5にんいる', tier: 'normal', condition: (l, s) => s.companions.length >= 5 },
    { id: 'married-1', emoji: '💍', label: 'はじめてのけっこん', desc: 'はじめてけっこんした', tier: 'normal', condition: (l) => l.partnersMarried.length >= 1 },

    // --- そだち・いっしょう(あたらしい じっせき) ---
    { id: 'sodachi-70', emoji: '🌟', label: 'よくそだてた', desc: 'そだちが70にとどいた', tier: 'life', condition: (l) => (l.bestSodachi || 0) >= 70 },
    { id: 'sodachi-90', emoji: '💫', label: 'でんせつのそだて', desc: 'そだちが90にとどいた', tier: 'life', condition: (l) => (l.bestSodachi || 0) >= 90 },
    { id: 'sodachi-100', emoji: '👑', label: 'さいこうのそだち', desc: 'そだちが100にとどいた', tier: 'life', condition: (l) => (l.bestSodachi || 0) >= 100 },
    { id: 'lifeclear-1', emoji: '🎊', label: 'はじめてのいっしょうクリア', desc: '100さいまで生き、そだち70以上にとどいた', tier: 'life', condition: (l) => (l.lifeClears || 0) >= 1 },
    { id: 'lifeclear-10', emoji: '🏵️', label: 'じんせい10しゅう', desc: 'いっしょうクリアを10かいした', tier: 'life', condition: (l) => (l.lifeClears || 0) >= 10 },
    { id: 'bestlife-1', emoji: '🌈', label: 'さいこうのいっしょう', desc: '100さいまで生き、そだち100にとどいた', tier: 'life', condition: (l) => (l.bestLives || 0) >= 1 },
    { id: 'pastlives-10', emoji: '📔', label: 'じゅうにんのなおとっち', desc: '10にんのなおとっちをそだてた', tier: 'life', condition: (l) => (l.pastLives || []).length >= 10 },
    { id: 'nodecline', emoji: '🕊️', label: 'いちどもおとろえなかった', desc: 'そだちを一度も下げずに100さいまでいきた', tier: 'life', condition: (l) => (l.flawlessLives || 0) >= 1 },

    // --- ややむずかしい ---
    { id: 'evolve-50', emoji: '🌳', label: 'そだちのあしあと', desc: 'そだちが合計で50あがった', tier: 'hard1', condition: (l) => l.evolutions >= 50 },
    { id: 'devolve-20', emoji: '😵‍💫', label: 'おとろえのぬし', desc: 'そだちが合計で20さがった', tier: 'hard1', condition: (l) => l.devolutions >= 20 },
    { id: 'transform-25', emoji: '💫', label: 'へんしん25れんぱつ', desc: '25かいへんしんした', tier: 'hard1', condition: (l) => l.transforms >= 25 },
    { id: 'death-10', emoji: '⚰️', label: 'てんごくのじょうれんきゃく', desc: '10かいてんごくにいった', tier: 'hard1', condition: (l) => l.deaths >= 10 },
    { id: 'sick-cured-30', emoji: '🏥', label: 'めいいのたまご(じょうきゅう)', desc: 'びょうきを30かいなおした', tier: 'hard1', condition: (l) => l.sicknessCured >= 30 },
    { id: 'age-100', emoji: '🎊', label: 'ひゃくさいばんざい', desc: '100さいになった', tier: 'hard1', condition: (l) => l.maxAgeReached >= 100 },
    { id: 'medicine-30', emoji: '🩹', label: 'かんびょうのきろく', desc: 'ひとつの人生で、くすりを30回あげた', tier: 'hard1', condition: (l, s) => s.actionCounts.medicine >= 30 },
    { id: 'region-all', emoji: '🌍', label: 'せかいいっしゅう', desc: 'おうちをふくむ、すべての通常地域を訪れた', tier: 'hard1', condition: (l) => l.regionsVisited.length >= REGIONS.length },
    { id: 'consumable-30', emoji: '🫧', label: 'おたのしみいっぱい', desc: 'おたのしみを30かいつかった', tier: 'hard1', condition: (l) => (l.consumablesUsed || 0) >= 30 },

    // --- むずかしい ---
    { id: 'evolve-100', emoji: '🌲', label: 'そだてのきわみ', desc: 'そだちが合計で100あがった', tier: 'hard2', condition: (l) => l.evolutions >= 100 },
    { id: 'clear-1', emoji: '🏅', label: 'てんじゅをまっとうした', desc: 'はじめて100さいまでいきた', tier: 'hard2', condition: (l) => l.clears >= 1 },
    { id: 'dex-100', emoji: '📙', label: 'ずかんたいはん', desc: 'ずかんを100しゅるいうめた', tier: 'hard2', condition: (l, s) => s.discoveredStages.length >= 100 },
    { id: 'every-normal-line', emoji: '🐾', label: 'どうぶつはかせ', desc: 'ふつうのしゅぞくすべてにであった', tier: 'hard2', condition: (l, s) => NORMAL_LINES.every((line) => s.discoveredStages.some((e) => e.startsWith(`${line}:`))) },
    { id: 'reset-20', emoji: '♾️', label: 'むげんループのたび', desc: 'あたらしいたまごを20かいむかえた', tier: 'hard2', condition: (l) => (l.resets || 0) >= 20 },
    { id: 'married-3', emoji: '👰', label: 'なんどもウェディング', desc: '3にんとけっこんした(いろんな人生で)', tier: 'hard2', condition: (l) => l.partnersMarried.length >= 3 },
    { id: 'naoto-1', emoji: '🧿', label: 'でんせつへのいっぽ', desc: '「なおとの〜」という、でんせつのあいてむを初めて手に入れた', tier: 'hard2', condition: (l) => (l.ownedNaotoItems || []).length >= 1 },

    // --- かなり むずかしい ---
    { id: 'clear-5', emoji: '🏆', label: 'いつつのいっしょう', desc: '5かい100さいまでいきた', tier: 'hard3', condition: (l) => l.clears >= 5 },
    { id: 'minigame-1000', emoji: '🎰', label: '1000かいあそんだ', desc: 'ミニゲームを1000かいあそんだ', tier: 'hard3', condition: (l) => l.minigamesPlayed >= 1000 },
    { id: 'games-complete-100', emoji: '💯', label: '100ぼんコンプリート', desc: 'ぜんぶのミニゲームを1かいいじょうあそんだ', tier: 'hard3', condition: (l) => countMinigamesPlayed(l) >= buildMinigamePool().length },
    { id: 'record-rank-s-15', emoji: '👑', label: 'Sランクマスター', desc: '15しゅるいのゲームでSランク', tier: 'hard3', condition: (l) => countMinigameRecords(l, (r) => r.best >= 90) >= 15 },
    { id: 'rare-line-all', emoji: '🎇', label: 'でんせつコレクター', desc: 'レアなしゅぞくすべてにであった', tier: 'hard3', condition: (l, s) => RARE_LINES.every((line) => s.discoveredStages.some((e) => e.startsWith(`${line}:`))) },
    { id: 'elder-collector', emoji: '👴', label: 'ちょうろうはかせ', desc: '10種類以上の、さいごの姿に出会った', tier: 'hard3', condition: (l, s) => s.discoveredStages.filter((e) => e.endsWith(':7')).length >= 10 },
    { id: 'companion-all', emoji: '🎉', label: 'なかまだいしゅうごう', desc: '通常のなかま全員となかよくなった', tier: 'hard3', condition: (l) => hasAllCurrentCompanions(l) },
    { id: 'perfect-life', emoji: '🏵️', label: 'かんぺきななおとっちライフ', desc: 'けっこんと、通常のなかま全員との出会いをたっせいした', tier: 'hard3', condition: (l) => l.partnersMarried.length >= 1 && hasAllCurrentCompanions(l) },

    // --- 超むずかしい ---
    { id: 'clear-10', emoji: '👑', label: 'とおのいっしょう', desc: '10かい100さいまでいきた', tier: 'hard4', condition: (l) => l.clears >= 10 },
    { id: 'dex-150', emoji: '📕', label: 'ずかんもうすぐ', desc: 'ずかんを150しゅるいうめた', tier: 'hard4', condition: (l, s) => s.discoveredStages.length >= 150 },
    { id: 'partner-all', emoji: '🌏', label: 'れんあいたっせいしゃ', desc: '各地域のこいびと候補全員と知りあった', tier: 'hard4', condition: (l) => l.partnersRecorded.length >= ALL_PARTNER_CANDIDATES.length },

    // --- きわめて むずかしい ---
    { id: 'clear-25', emoji: '🎖️', label: 'いっしょうのでんせつ', desc: '25かい100さいまでいきた', tier: 'hard5', condition: (l) => l.clears >= 25 },
    { id: 'dex-complete', emoji: '📖', label: 'ずかんコンプリート', desc: 'ずかんをぜんぶうめた', tier: 'hard5', condition: (l, s) => s.discoveredStages.length >= ALL_LINES.length * STAGES_PER_LINE },
    { id: 'shop-all', emoji: '🛍️', label: 'みにつけるものコンプリート', desc: '身につけるあいてむを全部買った', tier: 'hard5', condition: (l) => l.ownedShopItems.length >= SHOP_ITEMS.length },
    { id: 'consumable-all', emoji: '🎪', label: 'おたのしみコンプリート', desc: 'おたのしみをぜんぶつかってみた', tier: 'hard5', condition: (l) => FUN_ITEMS.every((it) => (l.ownedConsumableItems || []).includes(it.id)) },
    { id: 'item-all', emoji: '💯', label: 'あいてむぜんぶあつめた', desc: 'みにつけるものをぜんぶ集め、おたのしみもぜんぶ使った', tier: 'hard5', condition: (l) => l.ownedShopItems.length >= SHOP_ITEMS.length && FUN_ITEMS.every((it) => (l.ownedConsumableItems || []).includes(it.id)) },
  ];
  // じっせきの だんかい(むずかしさ)。画面では この じゅんに セクション分けする
  const ACHIEVEMENT_TIERS = [
    { id: 'easy', emoji: '🌱', label: 'かんたん' },
    { id: 'easy2', emoji: '🍀', label: 'ややかんたん' },
    { id: 'normal', emoji: '⭐', label: 'ふつう' },
    { id: 'life', emoji: '🌳', label: 'そだち・いっしょう' },
    { id: 'hard1', emoji: '🔥', label: 'ややむずかしい' },
    { id: 'hard2', emoji: '💎', label: 'むずかしい' },
    { id: 'hard3', emoji: '🏔️', label: 'かなりむずかしい' },
    { id: 'hard4', emoji: '🌌', label: 'とてもむずかしい' },
    { id: 'hard5', emoji: '👑', label: 'きわめてむずかしい' },
  ];

  // ゲームきろく(じこベスト/ランク)を つかう じっせきの ための かぞえかた。
  // いま の プールに ある ゲームだけを かぞえる(さくじょされた ゲームの
  // ふるい きろくで かずが ずれない ように)
  function countMinigameRecords(lifetime, predicate) {
    const records = (lifetime && lifetime.minigameRecords) || {};
    let n = 0;
    for (const game of buildMinigamePool()) { const r = records[game.id]; if (r && predicate(r)) n++; }
    return n;
  }
  function countMinigamesPlayed(lifetime) {
    const counts = (lifetime && lifetime.minigamePlayCounts) || {};
    return buildMinigamePool().filter((game) => (counts[game.id] || 0) > 0).length;
  }

  function checkAchievements() {
    state.lifetime.maxAgeReached = Math.max(state.lifetime.maxAgeReached, currentAge());
    for (const ach of ACHIEVEMENTS) {
      if (state.achievementsUnlocked.includes(ach.id)) continue;
      if (!ach.condition(state.lifetime, state)) continue;
      state.achievementsUnlocked.push(ach.id);
      // かいほうした ひづけ(じっせき画面の「さいきん」と NEW の しるしに つかう)
      (state.lifetime.achievementUnlockedAt || (state.lifetime.achievementUnlockedAt = {}))[ach.id] = Date.now();
      // a minigame overlay owns the screen while gameActive - the unlock
      // is still recorded, just shown silently until it's safe to flash
      if (!gameActive) showStoryEvent({ emoji: ach.emoji, achievement: ach, message: `じっせきたっせい!「${ach.label}」` });
    }
  }

  // ゲームクリア時の演出は「ずかん」「じっせき」がどれだけ揃っているかで
  // 4段階に豪華になる。「じっせき コンプリート」は dex-complete も ふくむ
  // ぜんぶで はんてい すると、それ単体では「ずかんは まだ」を表せない -
  // エンディングの段階わけとしては dex-complete を除いた のこり ぜんぶで
  // 判定し、ずかん達成/じっせき(dex以外)達成を独立した2軸として扱う
  // 一生のあいだに たどりついた クリアパターンの あかしとして、ふだんの
  // 画面に ずっと 残る バッジ(state.lifetime.endingTiersReached に記録)
  // 5つのゴール:
  // ①〜③は100さいの人生評価、④は現在の図鑑全形態、⑤は全実績。
  // ①〜③を同じ人生で同時達成した場合は最高位だけを大きく見せる。
  const ENDING_TIER_ICONS = ['🎉', '🏮', '🌳', '📖', '👑'];
  const ENDING_TIERS = [
    {
      title: 'てんじゅをまっとうした!',
      art: 'assets/clear/goal-1-naoto-v2.jpg?v=20260910-ending-1',
      artAlt: '夕焼けの縁側で、白いパーカーのナオトと犬が並んで景色を眺める後ろ姿',
      confetti: '🌇✨🎉✨🌇',
      badges: ['★①てんじゅをまっとうした'],
      desc: '100さいまで、一生を生きぬいた!<br>つぎのゴール: 100さい＋そだち70いじょう',
    },
    {
      title: 'いっしょうクリア!',
      art: 'assets/clear/goal-2-naoto-v2.jpg?v=20260910-ending-1',
      artAlt: '星空の港で、白いパーカーのナオトと犬がランタンのそばに座る後ろ姿',
      confetti: '🏮✨🌙✨🏮',
      badges: ['★①てんじゅ', '★②いっしょうクリア'],
      desc: 'よく育てながら、100さいまで生きぬいた!<br>つぎのゴール: 100さい＋そだち100',
    },
    {
      title: 'さいこうのいっしょう!',
      art: 'assets/clear/goal-3-naoto-v2.jpg?v=20260910-ending-1',
      artAlt: '思い出の写真が揺れる木の下で、白いパーカーのナオトと犬が寄り添う後ろ姿',
      confetti: '🌳✨🌈✨🌳',
      badges: ['★①てんじゅ', '★②いっしょう', '★③さいこうのいっしょう'],
      desc: 'そだち100にとどき、100さいをむかえた。<br>つぎは、ずかんのすべての姿を見つけよう!',
    },
    {
      title: 'ずかんクリア!',
      art: 'assets/clear/goal-4-naoto-v1.jpg?v=20260909-cast-author-bi-1',
      artAlt: 'ずかんクリア。図書室でナオトが犬と一緒に、みんなの図鑑をひらいている',
      confetti: '📖✨👑✨📖',
      badges: ['📖 ④ずかんクリア'],
      desc: 'ずかんのすべての姿を見つけた!<br>見覚えのある顔が、こんなにふえた。<br>つぎは、残ったじっせきに挑戦しよう!',
    },
    {
      title: 'PERFECT CLEAR!',
      art: 'assets/clear/goal-5-naoto-v1.jpg?v=20260909-cast-author-bi-1',
      artAlt: 'PERFECT CLEAR。むげんのせかいで犬と並び、歯を見せて笑うナオトが手をふっている',
      confetti: '👑✨🌈♾️🌈✨👑',
      badges: ['📖 ④ずかんクリア', '👑 ⑤ PERFECT CLEAR'],
      desc: 'ずかんも、じっせきも、ぜんぶコンプリート!<br>♾️のせかいがひらいた!',
    },
  ];

  // 本体・がめんの いろを えらべる きのう。さいしょの6しょくは いつでも
  // えらべ、のこり4しょくは 4段階の クリアパターン(ENDING_TIERS、上の
  // endingTiersReached)を それぞれ 一度でも たっせいすると てにはいる、
  // 永続の ごほうび(unlockTier が その ENDING_TIERS の インデックス。
  // レインボーだけは 4つ ぜんぶ そろって はじめて 解放される ので
  // unlockAll をつかう)。実際の色とプレビューは design.css の同じ定義を使う。
  const COLOR_THEMES = [
    { id: 'default', label: 'クラシック' },
    { id: 'sky', label: 'そら' },
    { id: 'mint', label: 'ミント' },
    { id: 'lavender', label: 'ラベンダー' },
    { id: 'lemon', label: 'レモン' },
    { id: 'charcoal', label: 'すみいろ' },
    { id: 'coral', label: 'さんごいろ' },
    { id: 'peach', label: 'ピーチ' },
    { id: 'turquoise', label: 'ターコイズ' },
    { id: 'indigo', label: 'あいいろ' },
    { id: 'olive', label: 'オリーブ' },
    { id: 'mustard', label: 'からしいろ' },
    { id: 'sakura', label: 'さくらいろ' },
    { id: 'crystal', label: 'すいしょう' },
    { id: 'wakakusa', label: 'わかくさ' },
    { id: 'grape', label: 'ぶどういろ' },
    { id: 'apricot', label: 'あんずいろ' },
    { id: 'navy', label: 'こんじょう' },
    { id: 'crimson', label: 'べにいろ' },
    { id: 'rosegold', label: 'ローズゴールド' },
    { id: 'sunset', label: 'ゆうやけ', unlockTier: 0 },
    { id: 'dawn', label: 'あさやけ', unlockTier: 0 },
    { id: 'twilight', label: 'たそがれ', unlockTier: 0 },
    { id: 'flame', label: 'ほのお', unlockTier: 0 },
    { id: 'amber', label: 'こはくいろ', unlockTier: 0 },
    { id: 'forest', label: 'しんりん', unlockTier: 1 },
    { id: 'stream', label: 'せせらぎ', unlockTier: 1 },
    { id: 'grove', label: 'こだちいろ', unlockTier: 1 },
    { id: 'moonlight', label: 'つきかげ', unlockTier: 1 },
    { id: 'mist', label: 'もりのきり', unlockTier: 1 },
    { id: 'gold', label: 'おうごん', unlockTier: 2 },
    { id: 'galaxy', label: 'ぎんが', unlockTier: 3 },
    { id: 'jade', label: 'ひすい', unlockTier: 2 },
    { id: 'ruby', label: 'ルビー', unlockTier: 2 },
    { id: 'sapphire', label: 'サファイア', unlockTier: 2 },
    {
      id: 'rainbow',
      label: 'レインボー',
      unlockAll: true,
    },
    {
      id: 'aurora',
      label: 'オーロラ',
      unlockTier: 4,
    },
    {
      id: 'radiance',
      label: 'こうごん',
      unlockTier: 4,
    },
    { id: 'starlight', label: 'せいざ', unlockTier: 4 },
    {
      id: 'prism',
      label: 'にじいろのプリズム',
      unlockTier: 4,
    },
  ];

  // COLOR_THEMES と おなじ unlockTier/unlockAll の しくみで えらべる、
  // がめんの がら(色とは べつの もうひとつの おしゃれ軸)。emoji は
  // 「いろ」がめんの スウォッチ プレビューに つかい、じっさいの タイル
  // もようは style.css の .screen.pattern-<id> が うけもつ
  const PATTERNS = [
    { id: 'none', label: 'なし', emoji: '⬜' },
    { id: 'dots', label: 'みずたま', emoji: '🔵' },
    { id: 'stripes', label: 'ストライプ', emoji: '〰️' },
    { id: 'checker', label: 'チェック', emoji: '🏁' },
    { id: 'grid', label: 'こうし', emoji: '#️⃣' },
    { id: 'flower', label: 'はな', emoji: '🌸' },
    { id: 'diamond', label: 'ひしがた', emoji: '🔷' },
    { id: 'crosshatch', label: 'こうしがけ', emoji: '❌' },
    { id: 'pinstripe', label: 'ほそいしま', emoji: '➖' },
    { id: 'brick', label: 'れんが', emoji: '🧱' },
    { id: 'herringbone', label: 'やまがた', emoji: '🪵' },
    { id: 'scallop', label: 'うろこ', emoji: '🐟' },
    { id: 'bubbles', label: 'あわ', emoji: '🫧' },
    { id: 'zigzag', label: 'ジグザグ', emoji: '⚡' },
    { id: 'rings', label: 'みずのわ', emoji: '⭕' },
    { id: 'tartan', label: 'タータン', emoji: '🧣' },
    { id: 'bigdots', label: 'みずたま(おおきめ)', emoji: '🔴' },
    { id: 'starburst', label: 'ひかりのすじ', emoji: '☀️' },
    { id: 'pinwheel', label: 'かざぐるま', emoji: '🎐' },
    { id: 'basket', label: 'あみめ', emoji: '🧺' },
    { id: 'wave', label: 'なみ', emoji: '🌊', unlockTier: 0 },
    { id: 'sunray', label: 'ひざし', emoji: '🌤️', unlockTier: 0 },
    { id: 'ripple', label: 'さざなみ', emoji: '💧', unlockTier: 0 },
    { id: 'petal', label: 'はなびら', emoji: '🌷', unlockTier: 0 },
    { id: 'cloud', label: 'くも', emoji: '☁️', unlockTier: 0 },
    { id: 'confetti', label: 'かみふぶき', emoji: '🎊', unlockTier: 1 },
    { id: 'leaf', label: 'このは', emoji: '🍃', unlockTier: 1 },
    { id: 'bamboo', label: 'たけ', emoji: '🎋', unlockTier: 1 },
    { id: 'pebble', label: 'こいし', emoji: '🪨', unlockTier: 1 },
    { id: 'vine', label: 'つる', emoji: '🌿', unlockTier: 1 },
    { id: 'sparkle', label: 'きらきら', emoji: '✨', unlockTier: 2 },
    { id: 'facet', label: 'カット', emoji: '💎', unlockTier: 2 },
    { id: 'glitter', label: 'ラメ', emoji: '✨', unlockTier: 2 },
    { id: 'crownmotif', label: 'かんむりもよう', emoji: '👑', unlockTier: 3 },
    { id: 'medallion', label: 'まるいかざり', emoji: '🏵️', unlockTier: 2 },
    { id: 'rainbow', label: 'レインボー', emoji: '🌈', unlockAll: true },
    { id: 'nebula', label: 'せいうん', emoji: '🌌', unlockTier: 4 },
    { id: 'kaleidoscope', label: 'まんげきょう', emoji: '🔮', unlockTier: 4 },
    { id: 'crownjewel', label: 'おうかん', emoji: '💠', unlockTier: 4 },
    { id: 'prismshine', label: 'プリズムのひかり', emoji: '🌈', unlockTier: 4 },
  ];

  // おかねで こうにゅうできる、みにつける アイテム。一度 こうにゅう
  // すれば ずっと もちものに のこり(state.lifetime.ownedShopItems)、
  // なんども そうび/かいじょ できる(いちどに そうびできるのは 1つだけ)
  // それぞれの id は、コード内の isEquipped('id') の りようポイントで
  // state.lifetime.equippedItemId と つきあわされ、そうびちゅうだけ
  // こうかを はっきする(いちどに そうびできるのは 1つだけ)。
  //
  // ぜんぶで50しゅるい。多くは おなじ こうかの グレードアップ チェーン
  // (むじるし → 2 → 3)に なっていて、ねだんが たかい ものほど こうかも
  // 豪華に なる。だいたい 4つの ねだん帯に わかれる:
  //   ・きほん(10〜90): さいしょから すこし ためれば かえる
  //   ・じょうきゅう(150〜600): ある程度 ミニゲームを かさねないと とどかない
  //   ・プレミアム(800〜2200): まとまった プレイが ひつよう
  //   ・でんせつ/むげん(5000〜20000): パーフェクトクリアの あとも おかねを
  //     かせぎつづけないと とても とどかない、いちばん 豪華な こうか
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

  // いま そうびちゅうの SHOP_ITEMS が id と いっちするか(いちどに
  // そうびできるのは 1つだけなので、こうかの はんてい先は ここ 1か所ずつ)
  function isEquipped(id) {
    return state.lifetime.equippedItemId === id;
  }

  // 「なおとの〜」でんせつアイテム。ENDING_TIERS の 4だんかいクリアに
  // それぞれ 1つずつ ひもづく、けたちがいの こうがくアイテム。SHOP_ITEMS
  // と ちがって そうび/かいじょの きがえは なく、こうにゅうすれば
  // それいこう ずっと こうかを はっきしつづける(なんこ もっていても いい)。
  // unlockTier は isThemeUnlocked() と おなじ フィールド名を つかって
  // COLOR_THEMES/PATTERNS と ロジックを 共有する
  const NAOTO_ITEMS = [
    { id: 'naoto_charm', label: 'なおとのおまもり', emoji: '🧿', unlockTier: 0, desc: '幼いころと年をとってから、いのちが少しへりにくくなる' },
    { id: 'naoto_lantern', label: 'なおとのランタン', emoji: '🏮', unlockTier: 1, desc: '旅の途中で、不思議なあかりを見かけることがある' },
    { id: 'naoto_ring', label: 'なおとのリング', emoji: '💍', unlockTier: 2, desc: 'とくべつなデートに、ふたりだけの一言が加わる' },
    { id: 'naoto_crown', label: 'なおとのかんむり', emoji: '👑', unlockTier: 3, desc: 'おたのしみで遊ぶとき、たまに特別な一言が出る' },
  ];

  function hasNaotoItem(id) {
    return state.lifetime.ownedNaotoItems.includes(id);
  }

  // 既存セーブの本物の記録を正として5ゴールへ復元する。
  // 旧4tierで既に得たアイテムは没収しない(grandfather)。
  function achievedGoalTiers() {
    const L = state.lifetime || {};
    const tiers = [];
    if ((L.clears || 0) >= 1) tiers.push(0);
    if ((L.lifeClears || 0) >= 1) tiers.push(1);
    if ((L.bestLives || 0) >= 1) tiers.push(2);
    if (L.dexCleared || state.discoveredStages.length >= ALL_LINES.length * STAGES_PER_LINE) tiers.push(3);
    if (L.perfectCleared || ACHIEVEMENTS.every((ach) => state.achievementsUnlocked.includes(ach.id))) tiers.push(4);
    return tiers;
  }

  function syncNaotoRewardItems() {
    if (!state.lifetime) return;
    if (!Array.isArray(state.lifetime.ownedNaotoItems)) state.lifetime.ownedNaotoItems = [];
    const reached = achievedGoalTiers();
    NAOTO_ITEMS.forEach((item) => {
      if (reached.includes(item.unlockTier) && !state.lifetime.ownedNaotoItems.includes(item.id)) {
        state.lifetime.ownedNaotoItems.push(item.id);
      }
    });
  }

  const ENDING_TIER_UNLOCK_LABELS = [
    'てんじゅをまっとう',
    'いっしょうクリア',
    'さいこうのいっしょう',
    'ずかんクリア',
    'PERFECT CLEAR',
  ];

  // COLOR_THEMES/PATTERNS 共通の解放判定(どちらも unlockTier/
  // unlockAll という おなじ フィールドしか みないので、そのまま りようできる)
  function isThemeUnlocked(theme) {
    if (theme.unlockAll) return achievedGoalTiers().includes(4);
    if (theme.unlockTier === undefined) return true;
    if (state.lifetime.endingTiersReached.includes(theme.unlockTier)) return true;
    // つかいきり アイテムの「すきな いろ/がらの チケット」による、tier
    // 条件を こえた とくべつな 解放(bonusUnlockedThemeIds さんしょう)
    const kind = COLOR_THEMES.includes(theme) ? 'color' : 'pattern';
    return state.lifetime.bonusUnlockedThemeIds.includes(`${kind}:${theme.id}`);
  }


  // つかいきり アイテム(CONSUMABLE_ITEMS)。SHOP_ITEMS/NAOTO_ITEMS の ように
  // そうびして のこる ものでは なく、こうにゅうした しゅんかんに 1かいだけ
  // こうかを はっきする。しぼうメーターの かいふくは べつの しくみ
  // (RECOVERY_ITEMS/useItem())で すでに ようい されている ため、ここには
  // 単純な しぼうメーター回復の アイテムは いれない。
  //
  // avaliable(state に依存する きょかはんてい)を みたさない あいだは
  // ボタンを おしても なにも おきず、unavailableMessage が かわりに 出る。
  // picker が セットされて いる アイテムは、こうにゅう ボタンを おした
  // しゅんかんには まだ おかねを はらわず、pickerOverlay で なにを
  // えらぶかを きめてから(resolvePickerSelection)はじめて はらう。
  // apply()/apply(value) が {} を かえした ばあいは、なかで すでに
  // setMessage() ずみ(onStageChanged/checkMeters けいゆ)という あいずなので、
  // よびだし側は じぶんの メッセージで 上書きしない
  // それぞれ「つぎの 1かい」だけ こうかが ある。おなじ こうかを もう もって
  // いる あいだは かえない(available)。うけとりがわは state.oneTimeBoosts を よむ
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
  // いま もっている つかいきりの こうかを、あいてむ画面に みじかく 出す
  function activeBoostSummary() {
    const b = state.oneTimeBoosts || {};
    const out = [];
    if (b.doubleCoins) out.push('🪙ラッキーコイン');
    if (b.safetyNet) out.push('🛡️スコアほけん');
    if (b.minigameBoost) out.push(b.minigameBoost === 'big' ? '💫大成功のおまもり' : '🔥やる気のおまもり');
    if (b.sicknessShieldCount > 0) out.push(`🧧びょうきよけのおふだ×${b.sicknessShieldCount}`);
    if (b.courtBoost) out.push(b.courtBoost === 'big' ? '💝こいの大おまもり' : '💘こいのおまもり');
    if (b.breakupShield) out.push(b.breakupShield === 'full' ? '💞きずなのおまもり' : '🩹なかなおりのおまもり');
    if (b.travelGuarantee) out.push('🧭たびのおまもり');
    if (state.boostTicks > 0) out.push(`✨せいちょう2ばい（あと${Math.ceil(state.boostTicks * TICK_MS / 60000)}分）`);
    return out;
  }


  function endingProgress() {
    const dexComplete = state.discoveredStages.length >= ALL_LINES.length * STAGES_PER_LINE;
    // 「実績だけクリア」は廃止。⑤は dex-complete を含む全ACHIEVEMENTSで判定する。
    const achComplete = ACHIEVEMENTS.every((ach) => state.achievementsUnlocked.includes(ach.id));
    return { dexComplete, achComplete };
  }

  function getEndingTier() {
    if (grandGoalPending === 'perfect') return 4;
    if (grandGoalPending === 'dex') return 3;
    if (state.stage === STAGE.FAREWELL) {
      if (state.maxSodachi >= SODACHI_MAX) return 2;
      if (state.maxSodachi >= LIFE_CLEAR_SODACHI) return 1;
      return 0;
    }
    const reached = achievedGoalTiers();
    return reached.length ? Math.max(...reached) : 0;
  }

  function qualifyingEndingTiers() {
    return achievedGoalTiers();
  }

  // --- じっこう中の エラーの きろく(さいきん 20けん)。がめんは とめない ---
  const runtimeErrors = [];
  function reportRuntimeError(err, where) {
    const entry = { at: Date.now(), where, message: err && err.message ? String(err.message) : String(err), stack: err && err.stack ? String(err.stack).slice(0, 600) : '' };
    runtimeErrors.push(entry);
    if (runtimeErrors.length > 20) runtimeErrors.shift();
    try { console.error('[naotocchi]', where, err); } catch (e) { /* ignore */ }
    return entry;
  }
  globalThis.__naotocchiErrors = runtimeErrors;
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('error', (ev) => { if (ev && (ev.error || ev.message)) reportRuntimeError(ev.error || ev.message, 'window'); });
    window.addEventListener('unhandledrejection', (ev) => { reportRuntimeError(ev && ev.reason, 'promise'); });
  }
  // --- ほぞん容量ぎれ(QuotaExceeded)の けんち ---
  function isQuotaError(e) {
    return !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014 || /quota/i.test(String(e.message || e)));
  }
  let storageWarnedAt = 0;
  let storageWarning = false;
  function noteStorageWarning(on) {
    storageWarning = on;
    if (!on) return;
    const now = Date.now();
    if (storageWarnedAt && now - storageWarnedAt < 5 * 60 * 1000) return;
    storageWarnedAt = now;
    reportRuntimeError(new Error('localStorage quota exceeded'), 'storage');
    try { setMessage('⚠️保存に失敗しました。「データ」でセーブコードをひかえられますが、最後に保存できた記録になる場合があります。保存できていない変更は、画面を閉じると失われます。'); } catch (e) { /* ignore */ }
  }

  // セーブコードの よみこみ中は、ページを とじる ときの じどうセーブで
  // よみこんだ セーブを うわがきしない ように とめる
  let saveLocked = false;
  function saveState() {
    if (saveLocked) return;
    // 復旧候補がすべて読めないときは、非表示時の保存でも原本を消さない。
    if (saveWriteBlocked) return;
    recordDiscovery();
    checkAchievements();
    checkGrandGoals();
    state.savedAt = Date.now();
    let raw;
    try { raw = JSON.stringify(state); } catch (e) { return; }
    // 復旧中の壊れた主キーではなく、最後に読込／保存できたデータを退避。
    // バックアップだけ書けない場合も、通常セーブの書き込みは試す。
    if (lastGoodSaveRaw) {
      try { localStorage.setItem(SAVE_BACKUP_KEY, lastGoodSaveRaw); } catch (e) { /* backup is best effort */ }
    }
    try {
      localStorage.setItem(SAVE_KEY, raw);
      lastGoodSaveRaw = raw;
      stateLoadRecovered = false;
      takeSaveSnapshot(raw);
      if (storageWarning) noteStorageWarning(false);
    } catch (e) {
      if (!isQuotaError(e)) return; // storage unavailable; ignore
      // 容量ぎれ: じどうバックアップ(3世代)を けして もういちど だけ ためす。
      // それでも だめなら、ほぞんできない ことを がめんに 出す
      try {
        localStorage.removeItem(SAVE_SNAP_KEY);
        localStorage.setItem(SAVE_KEY, raw);
        lastGoodSaveRaw = raw;
        stateLoadRecovered = false;
        noteStorageWarning(false);
      } catch (e2) {
        noteStorageWarning(true);
      }
    }
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }
  // innerHTML の かきかえは、なかみが かわった ときだけ(3秒ごとの render で
  // おなじ HTML を くみなおさない)
  function setHTMLIfChanged(node, html) {
    if (node && node.innerHTML !== html) node.innerHTML = html;
  }

  // 0 (freshly hatched) -> 1 (elder age) - every minigame scales its own
  // difficulty knobs off of this so the whole game gets meaner as the pet
  // gets older, instead of staying at "baby" difficulty forever
  // 「せかい」がめんで えらぶ ミニゲームの むずかしさ。ねんれいで あがる
  // むずかしさの のびを おさえ(やさしい 0.4倍 / ふつう 0.7倍 / むずかしい 1倍)、
  // せいげん時間を ながくする(mgDuration)
  const DIFFICULTY_CHOICES = { easy: ['🌱', 'やさしい'], normal: ['🙂', 'ふつう'], hard: ['🔥', 'むずかしい'] };
  const GAME_LENGTH_CHOICES = { normal: ['⏱️', 'ふつう'], short: ['⚡', 'みじかめ'] };
  function minigameDifficultyMode() {
    const m = state && state.lifetime && state.lifetime.minigameDifficulty;
    return DIFFICULTY_CHOICES[m] ? m : 'normal';
  }
  // 0(むずかしい)〜1(やさしい)。ゲームごとの「ゆるさ」の 目安
  function minigameEase() {
    const m = minigameDifficultyMode();
    return m === 'easy' ? 1 : m === 'hard' ? 0 : 0.5;
  }
  // せいげん時間: やさしい +35% / ふつう +17% / むずかしい そのまま
  // 「みじかめ」せっていは 90びょう いじょうの ゲームだけ 6わりの ながさに する
  function minigameLengthMode() {
    return GAME_LENGTH_CHOICES[state.lifetime.minigameLength] ? state.lifetime.minigameLength : 'normal';
  }
  function mgDuration(ms) {
    const short = minigameLengthMode() === 'short' && ms >= 90000 ? 0.6 : 1;
    return Math.round(ms * (1 + 0.35 * minigameEase()) * short);
  }
  function ageDifficulty() {
    const m = minigameDifficultyMode();
    const scale = m === 'easy' ? 0.4 : m === 'hard' ? 1 : 0.7;
    const base = clamp(currentAge() / MAX_DIFFICULTY_AGE, 0, 1) * scale;
    // そだち40(なかまの わ)に とうたつしていると、なかまイベントの
    // ミニゲームだけ すこし やさしく なる
    if (pendingCompanionId && hasPerk(40)) return base * 0.7;
    return base;
  }

  function lerp(min, max, t) {
    return min + (max - min) * t;
  }

  // ================================================================
  // ミニゲーム きょうつうの UXルール(コード上の きまりごと)
  // ================================================================
  // ・せんたく式の ミニゲームは、判定した しゅんかんに つぎへ すすんだり
  //   onCompleteを よんだり しない。かならず このさきの revealAndProceed()
  //   などで「なにを えらんで、あっていたか/まちがっていたか」を
  //   目に 見える かたちで 見せてから すすむ
  // ・判定と onComplete は おなじ フレームで おこなわない(すくなくとも
  //   MG_REVEAL_MS ぶんは あいだを あける)
  // ・誤タップを かんぜんな 無反応に しない(ボタンを おした ことは
  //   かならず なにかしらの ヘんかで わかる ようにする)
  // ・かいひ/衝突けいの ゲームでは、判定成立(あたり/はずれの かくてい)と
  //   しょうがいぶつ/対象を 画面から 消す タイミングを わける(判定した
  //   しゅんかんに 消さず、うごきおわってから 消す。downhill-themed・
  //   jump・runner さんしょう)
  // ・2だんかい構成の ゲームは、さいごの 操作の あとに かならず 結果を
  //   見せてから おわる(surfing-wave・miniPoker-basic さんしょう)
  // ・せいかい と ふせいかいで おなじ えんしゅつを つかいまわさない
  //   (pose さんしょう)
  // ・あたらしい 地域/季節限定カテゴリを ついかした ときは、
  //   minigameCategoryOf からも れないよう、REGION_MINIGAMES/
  //   SEASONAL_MINIGAMESへの category とうろくループ(下の ほう)を
  //   かならず とおす
  // ・いろだけに たよらず、⭕/❌/✓ などの きごうでも せいご/ふせいかいが
  //   つたわる ようにする
  // ・せいし画面の はんだん系は、もんだいを 表示した しゅんかんから
  //   タイムアウト用の タイマーを うごかしはじめない(MG_TIMED_CHOICE_
  //   GRACE_MS ぶん、もんだいを 読む じかんを さきに ひかえておく)。
  //   はやく こたえれば すぐ すすめる ため、テンポは そこなわない
  // ・高難易度でも かんがえる じかんが 短くなりすぎない よう、はんだん系は
  //   MG_TIMED_CHOICE_MIN_MS、めいろ/あしばけいは MG_STEP_MIN_MS を
  //   さいてい保証する
  // ・れんぞくアクション系は、がめんが 出た しゅんかんに いきなり うごき
  //   はじめず、MG_ACTION_START_GRACE_MS ぶん タイトルを 読む ゆうよを おく
  //   (その あいだは タイマー・オブジェクトとも うごかない)

  const MG_REVEAL_MS = 480;

  // せいし画面(えらぶだけ)の はんだん系ミニゲームで つかう、きょうつうの
  // じかん定数。もんだいを 読む じかんを タイムアウトの けいさんから
  // わけて、うちのめされる まえに 読みおわる じかんを 保証する
  const MG_TIMED_CHOICE_GRACE_MS = 700;
  const MG_TIMED_CHOICE_MIN_MS = 2200;
  const MG_STEP_MIN_MS = 2500;

  // れんぞくアクション系ミニゲームで つかう、がめんが 出てから じっさいに
  // うごきはじめる/タイマーが へりはじめるまでの ゆうよ。みじかすぎると
  // タイトルを 読みきれず、長すぎると テンポが わるくなる ため、
  // 実際に 文字を 読める さいたん値として 900msを えらんだ
  const MG_ACTION_START_GRACE_MS = 900;

  // せんたく式の ミニゲームで つかう、きょうつうの せいかい/ふせいかい
  // ひょうじヘルパー。タップした ようそに ⭕/❌ の マークと いろを つけ、
  // ふせいかいの ときは ただしい ようそ(わかれば)にも ✓を つけて 見せる。
  // MG_REVEAL_MSだけ まってから after() を よぶので、その あいだに
  // つぎの 判定へ すすむ コードを おかなければ、しぜんに 多重タップも
  // ふせげる(呼び出しがわの awaitingフラグは 判定した しゅんかんに
  // falseに し、after() の なかで はじめて trueに もどす こと)
  function revealAndProceed(tappedEl, correct, correctEl, after) {
    if (tappedEl) {
      tappedEl.classList.add(correct ? 'mg-reveal-correct' : 'mg-reveal-incorrect');
      const mark = document.createElement('span');
      mark.className = 'mg-reveal-mark';
      mark.textContent = correct ? '⭕' : '❌';
      tappedEl.appendChild(mark);
    }
    if (!correct && correctEl && correctEl !== tappedEl) {
      correctEl.classList.add('mg-reveal-correct');
      const mark = document.createElement('span');
      mark.className = 'mg-reveal-mark';
      mark.textContent = '✓';
      correctEl.appendChild(mark);
    }
    setTimeout(after, MG_REVEAL_MS);
  }



  // ================================================================
  // ミニゲーム きょうつう 入力レイヤー(おしっぱなし・キーボード・canvas)
  // ================================================================
  // ・<button data-hold="step|fast"> は おしっぱなしで くりかえし はんのう
  //   する(1マスずつ うごく ゲームで「連打しないと うごかない」を なくす)
  // ・<button data-key="left|right|up|down|action|action2"> は PCの
  //   やじるしキー/WASD/スペース/Enter からも おせる(data-key が ない
  //   ばあいも ◀▶▲▼ の きごうを 手がかりに さがす)
  // ・bindHeldButton() は「おしている あいだ true」を ゲームがわに わたす
  //   (フリッパー・ステアリング など れんぞくてきな そうさ用)
  // ・createMgCanvas() は devicePixelRatio を 考慮した canvas を 用意する
  //   (smoke-test の ような ダミーDOMでは ctx が null になるので、描画は
  //   かならず ctx の 有無を みてから おこなう)
  const MG_HOLD_PROFILES = { step: { delay: 240, interval: 140 }, fast: { delay: 80, interval: 45 } };
  let mgHoldTimer = null;
  let mgHoldButton = null;
  const mgKeysDown = new Map();
  const mgHeldButtons = new Set();
  function mgStopHold(btn) {
    if (btn && mgHoldButton && btn !== mgHoldButton) return;
    if (mgHoldTimer) { clearTimeout(mgHoldTimer); mgHoldTimer = null; }
    if (mgHoldButton) { mgHoldButton.classList.remove('mg-holding'); mgHoldButton = null; }
  }
  function mgDispatchPointer(target, type, extra) {
    if (!target || typeof target.dispatchEvent !== 'function') return;
    let ev;
    const init = Object.assign({ bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, pointerType: 'touch' }, extra || {});
    try { ev = new PointerEvent(type, init); } catch (err) { ev = new Event(type, { bubbles: true, cancelable: true }); }
    ev.mgSynthetic = true;
    target.dispatchEvent(ev);
  }
  function mgStartHold(btn, e) {
    const profile = MG_HOLD_PROFILES[btn.dataset.hold] || MG_HOLD_PROFILES.step;
    mgStopHold();
    mgHoldButton = btn;
    btn.classList.add('mg-holding');
    try { if (e && e.pointerId != null && btn.setPointerCapture) btn.setPointerCapture(e.pointerId); } catch (err) {}
    const tick = () => {
      if (mgHoldButton !== btn || !btn.isConnected || btn.disabled) { mgStopHold(); return; }
      mgDispatchPointer(btn, 'pointerdown');
      mgHoldTimer = setTimeout(tick, profile.interval);
    };
    mgHoldTimer = setTimeout(tick, profile.delay);
  }
  function bindHeldButton(btn, onChange) {
    if (!btn || typeof btn.addEventListener !== 'function') return () => false;
    let held = false;
    const set = (v) => {
      if (held === v) return;
      held = v;
      if (v) mgHeldButtons.add(btn); else mgHeldButtons.delete(btn);
      if (btn.classList) btn.classList.toggle('mg-held', v);
      onChange(v);
    };
    btn.addEventListener('pointerdown', (e) => {
      if (e.preventDefault) e.preventDefault();
      if (btn.disabled) return;
      try { if (e.pointerId != null && btn.setPointerCapture) btn.setPointerCapture(e.pointerId); } catch (err) {}
      set(true);
    });
    const release = () => set(false);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
    return () => held;
  }
  // keyup/pointerup が別のタブ・アプリへ届いても、入力を押したままにしない。
  function resetMinigameInput() {
    const buttons = new Set([...mgKeysDown.values(), ...mgHeldButtons]);
    if (mgHoldButton) buttons.add(mgHoldButton);
    mgKeysDown.clear();
    mgStopHold();
    for (const btn of buttons) mgDispatchPointer(btn, 'pointercancel');
  }
  window.addEventListener('blur', resetMinigameInput);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') resetMinigameInput();
  });
  // canvas を おおもとの CSS幅(=ミニゲームがめんの はば)に あわせて
  // 用意する。height は かず、または はば→たかさ の かんすう
  function createMgCanvas(canvas, height) {
    const num = (v, d) => (typeof v === 'number' && v > 0 && isFinite(v) ? v : d);
    const W = Math.round(num(canvas && canvas.clientWidth, 244));
    const H = Math.round(typeof height === 'function' ? height(W) : num(height, 240));
    // おもい たんまつ(けいりょうモード)では かいぞうどを 1に おとして えがく りょうを へらす
    const dpr = Math.min(mgPerfLow ? 1 : 2, num(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1));
    let ctx = canvas && typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
    if (!ctx || typeof ctx.setTransform !== 'function') ctx = null;
    if (canvas) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      if (canvas.style) { canvas.style.width = '100%'; canvas.style.height = H + 'px'; }
    }
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, W, H, dpr };
  }
  // canvas の 上での ゆびの いち(canvasピクセル座標)を とる
  function mgPointerPos(canvas, e) {
    const r = canvas.getBoundingClientRect();
    const w = r.width || 1, h = r.height || 1;
    return { x: (e.clientX - r.left), y: (e.clientY - r.top), nx: (e.clientX - r.left) / w, ny: (e.clientY - r.top) / h };
  }
  // ランダムな めいろ(奇数サイズの 文字配列。'#'=かべ '.'=ゆか)。
  // loops>0 なら いきどまりを へらす ために かべを いくつか ぬいて、
  // にげみち/ちかみちが できるように する
  function generateMaze(cols, rows, loops = 0) {
    const grid = Array.from({ length: rows }, () => Array(cols).fill('#'));
    const carve = (x, y) => {
      grid[y][x] = '.';
      const dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]].sort(() => Math.random() - 0.5);
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (nx > 0 && ny > 0 && nx < cols - 1 && ny < rows - 1 && grid[ny][nx] === '#') {
          grid[y + dy / 2][x + dx / 2] = '.';
          carve(nx, ny);
        }
      }
    };
    carve(1, 1);
    let opened = 0, guard = 0;
    while (opened < loops && guard++ < 500) {
      const x = 1 + Math.floor(Math.random() * (cols - 2)), y = 1 + Math.floor(Math.random() * (rows - 2));
      if (grid[y][x] !== '#') continue;
      const h = grid[y][x - 1] === '.' && grid[y][x + 1] === '.';
      const v = grid[y - 1][x] === '.' && grid[y + 1][x] === '.';
      if (h !== v) { grid[y][x] = '.'; opened++; }
    }
    return grid.map((r) => r.join(''));
  }
  // めいろの 上で BFS。ゴールまでの つぎの いっぽ と きょり を かえす
  function mazeBfs(map, sx, sy) {
    const rows = map.length, cols = map[0].length;
    const dist = Array.from({ length: rows }, () => Array(cols).fill(-1));
    const queue = [[sx, sy]];
    dist[sy][sx] = 0;
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || map[ny][nx] === '#' || dist[ny][nx] >= 0) continue;
        dist[ny][nx] = dist[y][x] + 1;
        queue.push([nx, ny]);
      }
    }
    return dist;
  }
  const MESSAGE_DURATION_MS = 4200;

  // GENDERS/ORIENTATION_ROLL_POOL は 本来 もっと したの せいべつ関係の
  // まとまりで 定義しているが、loadState() が(gender の ない ふるい
  // セーブを いま ここで ロールしなおす ために)rollIdentity() 経由で
  // すぐ したで つかうので、const の TDZ(まだ 初期化されていない
  // じょうたいで 参照すると ReferenceError に なる せいしつ)に
  // ひっかからないよう、この関連の consts だけ ここで さきに 定義しておく
  const GENDERS = ['male', 'female', 'nonbinary'];
  const RESOLVED_ORIENTATIONS = ['straight', 'gay', 'bi', 'pan', 'aro'];
  const ORIENTATION_ROLL_POOL = [...RESOLVED_ORIENTATIONS, 'questioning'];

  // せいべつ/れんあいタイプは どちらも「げんじつ社会を ざっくり
  // さんこうにした 重みつき」ランダムで きまる(均等抽選だと 少数派の
  // タイプが 不自然に 高頻度に なってしまう ため)。GENDERS/
  // ORIENTATION_ROLL_POOL と おなじ ならびじゅんに 対応する 重みの はいれつ。
  // 「同性を れんあい対象と する タイプ」は gay という 1つの id/8%の
  // 抽選の まま(ゲイ/レズビアンで べつべつに 抽選しない)で、表示だけ
  // gender に あわせて 分ける(下の orientationLabel を さんしょう)
  const GENDER_WEIGHTS = [47.5, 47.5, 5]; // 男の子 / 女の子 / ノンバイナリー
  const ORIENTATION_WEIGHTS = [68, 8, 12, 5, 2, 5]; // straight / gay / bi / pan / aro / questioning

  // 重みつき抽選: items[i] が えらばれる かくりつは weights[i] / 合計
  function weightedPick(items, weights) {
    const total = weights.reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < items.length; i += 1) {
      roll -= weights[i];
      if (roll < 0) return items[i];
    }
    return items[items.length - 1];
  }

  let state = loadState();
  // きどう中の さいしょの saveState() で savedAt が いまに なる まえに、
  // まえの セーブの じこくを とっておく(るすのあいだの けいさん用)
  const bootSavedAt = Number(state && state.savedAt) || 0;
  // Presentation only: never saved, and never allowed to follow a replaced life.
  let eggVisualReaction = null;

  // Old saves can still contain spaced labels/logs. Compact their display only;
  // English words, numeric separators and the saved originals stay intact.
  function compactJapaneseText(text) {
    return String(text ?? '').replace(
      /([\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ー々。、！？!?…「」『』（）])[ \u3000]+|[ \u3000]+(?=[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ー々。、！？!?…「」『』（）])/gu,
      '$1'
    );
  }
  let message = '';
  let gameActive = false;
  let messageTimer = null;
  // なかまイベントが とちゅうの あいだだけ セットされる、いま くどいて
  // いる COMPANIONS の id。gameActive などと おなじく プレイのたびに
  // リセットされる いちじてきな 状態なので state には いれない
  let pendingCompanionId = null;

  // Presentation-only state: never written to a save or used by the life clock.
  let careLife = null, carePrevious = null, carePreviousKind = '';
  let careFeedback = null, careFeedbackTimer = null, careMilestone = null;
  function clearCareFeedback() {
    if (careFeedbackTimer) clearTimeout(careFeedbackTimer);
    careFeedbackTimer = null;
    careFeedback = null;
  }
  function showCareFeedback(feedback) {
    if (!feedback || state.stage !== STAGE.GROWING) return;
    clearCareFeedback();
    careFeedback = feedback;
    careFeedbackTimer = setTimeout(() => {
      careFeedback = null; careFeedbackTimer = null;
      renderCareNotice();
    }, 4200);
  }
  function recordCareChange(before) {
    if (!CARE_STATUS || !before || before.stage !== state.stage) return;
    showCareFeedback(CARE_STATUS.changes(before, CARE_STATUS.snapshot(state)));
  }
  function iconFallbackHTML(emoji) {
    return emoji ? `<span class="icon-fallback" aria-hidden="true">${escapeHtml(emoji)}</span>` : '';
  }
  function careIconHTML(icon, label = '', fallback = '') {
    const known = ['food','game','clean','sleep','medicine','play','love','coin','gift','hunger','sick','danger','recovery','growth','decline','poop','egg'];
    if (!known.includes(icon)) return '';
    return `<i class="care-icon" data-care-icon="${icon}" ${label ? `role="img" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"` : 'aria-hidden="true"'}>${iconFallbackHTML(fallback)}</i>`;
  }
  // Display mappings only. Item definitions, saved emoji, IDs and effects stay
  // unchanged; old/unmapped items keep their original display fallback.
  const UI_ILLUSTRATION_KEYS = new Set([
    'flower','ribbon','bowtie','paper','scarf','glasses',
    'band','hat','backpack','star_badge','paw_badge','letter',
    'crown','clover','charm','lantern','ring','naoto_crown',
    'world','book','medal','palette','sun','cloud',
    'rain','snow','moon','sunrise','sunset','candy',
    'bubbles','balloon','fireworks','camera','musicbox','surprise',
  ]);
  const SCENERY_ILLUSTRATION_KEYS = new Set([
    'cherry_blossom','sunflower','maple_leaf','green_leaf','tree','pine','palm','cactus',
    'snow_mountain','mountain','house','city','wheat','wave','shell','hibiscus',
  ]);
  const ITEM_ILLUSTRATIONS = {
    flower:'flower',ribbon:'ribbon',bowtie:'bowtie',poop1:'paper',scarf:'scarf',glasses:'glasses',
    energy1:'band',hat:'hat',travel1:'backpack',star:'star_badge',bond1:'paw_badge',
    partner1:'letter',crown:'crown',itemluck1:'clover',
    naoto_charm:'charm',naoto_lantern:'lantern',naoto_ring:'ring',naoto_crown:'naoto_crown',
    fun_candy:'candy',fun_bubbles:'bubbles',fun_balloon:'balloon',fun_fireworks:'fireworks',
    fun_camera:'camera',fun_musicbox:'musicbox',fun_surprise:'surprise',
  };
  // CSS background failures do not emit element error events. A single hidden
  // image per atlas observes loading; failure only changes presentation state.
  const UI_ATLAS_IMAGES = {};
  for (const [atlas,src] of [['ui','assets/ui/world-items-atlas-v1.png'],['care','assets/ui/care-atlas-v2.png'],['scenery','assets/ui/season-region-atlas-v1.png']]) {
    const probe=document.createElement('img');
    UI_ATLAS_IMAGES[atlas]=probe;
    probe.hidden=true;probe.alt='';probe.dataset.iconAtlas=atlas;
    probe.addEventListener('error',()=>{document.documentElement.dataset[atlas+'Atlas']='failed';});
    probe.addEventListener('load',()=>{document.documentElement.dataset[atlas+'Atlas']='loaded';});
    document.body.appendChild(probe);probe.src=src;
  }
  function uiIconHTML(icon, label = '', fallback = '') {
    const scenery = SCENERY_ILLUSTRATION_KEYS.has(icon);
    if (!scenery && !UI_ILLUSTRATION_KEYS.has(icon)) return '';
    return `<i class="care-icon ui-icon${scenery ? ' scenery-icon' : ''}" data-ui-icon="${icon}" ${label ? `role="img" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"` : 'aria-hidden="true"'}>${iconFallbackHTML(fallback)}</i>`;
  }
  function itemIconHTML(item, labelled = false) {
    const label = labelled ? item.label : '';
    if (item.id === 'sleepboost1') return careIconHTML('sleep', label, item.emoji);
    const key = Object.hasOwn(ITEM_ILLUSTRATIONS, item.id) ? ITEM_ILLUSTRATIONS[item.id] : '';
    return uiIconHTML(key, label, item.emoji) || escapeHtml(item.emoji || '');
  }
  function environmentIconHTML(kind, id, fallback) {
    const keys = kind === 'weather' ? {sunny:'sun',cloudy:'cloud',rain:'rain',snow:'snow'}
      : kind === 'time' ? {morning:'sunrise',day:'sun',evening:'sunset',night:'moon'}
      : kind === 'season' ? {spring:'cherry_blossom',summer:'sunflower',autumn:'maple_leaf',winter:'snow'}
      : kind === 'region' ? {home:'house',forest:'tree',countryside:'wheat',sea:'wave',tropical:'palm',jungle:'palm',mountain:'mountain',snow:'snow_mountain',desert:'cactus',city:'city',memory_lake:'bubbles'} : {};
    return uiIconHTML(Object.hasOwn(keys,id) ? keys[id] : '', '', fallback) || PROP_ILLUSTRATIONS?.iconHTML(fallback) || escapeHtml(fallback || '');
  }
  // Reuse only illustrations of the same object. Region/season data and saved
  // emoji remain intact; unillustrated scenery keeps its original symbol.
  const SCENERY_ILLUSTRATIONS = {
    '☀️':'sun','🌞':'sun','☁️':'cloud','❄️':'snow','❄':'snow','🌙':'moon',
    '🌼':'flower','🍀':'clover','🎀':'ribbon','🧣':'scarf',
    '🌸':'cherry_blossom','🌻':'sunflower','🍁':'maple_leaf','🍃':'green_leaf','🌿':'green_leaf',
    '🌳':'tree','🌲':'pine','🌴':'palm','🌵':'cactus','🏔️':'snow_mountain','⛰️':'mountain',
    '🏠':'house','🏡':'house','🏙️':'city','🌾':'wheat','🌊':'wave','🐚':'shell','🌺':'hibiscus',
    '🫧':'bubbles','🌅':'sunrise',
  };
  // Reuse complete existing PNGs as decorative pictures. These do not create
  // cast members, unlock forms or share the cast's image-failure/layout state.
  const SCENERY_PICTURES = {
    '🐄':'partners/field_cow.png','🦋':'butterfly/07.png','🐓':'companions/chicken.png',
    '🍄':'mushroom/06.png','🐿️':'companions/squirrel.png','🦉':'companions/owl.png',
    '🦔':'companions/hedgehog.png','🦌':'partners/grove_deer.png','⛄':'partners/snowman.png',
    '🐠':'clownfish/05.png','🐢':'turtle/05.png','🐟':'salmon/06.png',
    '🪼':'jellyfish/06.png','🪸':'coral/06.png','🦜':'companions/parrot.png',
    '🦍':'partners/gentle_gorilla.png','🦂':'partners/desert_scorpion.png','🦅':'partners/high_eagle.png',
  };
  function sceneryIconHTML(emoji) {
    if (emoji === '🍂') return careIconHTML('decline', '', emoji);
    if (emoji === '💕') return careIconHTML('love', '', emoji);
    if (Object.hasOwn(SCENERY_PICTURES,emoji)) {
      return `<span class="scenery-picture" aria-hidden="true"><img class="scenery-asset" src="assets/characters/${SCENERY_PICTURES[emoji]}" alt="" width="128" height="128" decoding="async" draggable="false">${iconFallbackHTML(emoji)}</span>`;
    }
    const icon = Object.hasOwn(SCENERY_ILLUSTRATIONS,emoji) ? SCENERY_ILLUSTRATIONS[emoji] : '';
    return uiIconHTML(icon, '', emoji) || PROP_ILLUSTRATIONS?.iconHTML(emoji,'scenery') || escapeHtml(emoji || '');
  }
  function endingBadgeIconHTML(tierIndex) {
    const keys = ['fireworks','lantern','tree','book','naoto_crown'];
    return uiIconHTML(keys[tierIndex], '', ENDING_TIER_ICONS[tierIndex]) || escapeHtml(ENDING_TIER_ICONS[tierIndex] || '');
  }
  // Text presentation only: keep dialogue, event objects and saved history as
  // strings. Match a whole emoji sequence so an unknown ZWJ/skin-tone sequence
  // cannot accidentally become half an illustration and half an emoji.
  const COMMENT_EMOJI = /\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?(?:\u200D\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?)*/gu;
  const COMMENT_CARE = {
    '🍚':'food','🎮':'game','🧹':'clean','🛏':'sleep','💤':'sleep','💊':'medicine',
    '🧸':'play','❤':'love','💕':'love','💞':'love','💗':'love','💖':'love',
    '💰':'coin','🪙':'coin','🎁':'gift','🌱':'growth','🍂':'decline','💩':'poop',
  };
  const COMMENT_UI = {
    ...Object.fromEntries(Object.entries(SCENERY_ILLUSTRATIONS).map(([emoji,key])=>[emoji.replace(/[\uFE0E\uFE0F]/g,''),key])),
    '🎗':'bowtie','🧻':'paper','🕶':'glasses','🎩':'hat','🎒':'backpack','⭐':'star_badge',
    '🐾':'paw_badge','💌':'letter','👑':'crown','💍':'ring','🌍':'world','🌏':'world',
    '📖':'book','📚':'book','🏅':'medal','🎨':'palette','☔':'rain','🌧':'rain',
    '🌄':'sunrise','🌇':'sunset','🍭':'candy','🎈':'balloon','🎇':'fireworks','🎆':'fireworks',
    '📸':'camera','📷':'camera','🎵':'musicbox','🪄':'surprise',
  };
  const COMMENT_LABELS = {
    food:'ごはん',game:'ゲーム',clean:'そうじ',sleep:'ねむり',medicine:'くすり',play:'おもちゃ',
    love:'ハート',coin:'コイン',gift:'プレゼント',growth:'めばえ',decline:'おちば',poop:'うんち',
    flower:'はな',ribbon:'リボン',bowtie:'ちょうネクタイ',paper:'ペーパー',scarf:'マフラー',
    glasses:'サングラス',hat:'ぼうし',backpack:'リュック',star_badge:'ほし',paw_badge:'あしあと',
    letter:'てがみ',crown:'かんむり',clover:'クローバー',ring:'ゆびわ',world:'せかい',book:'ほん',
    medal:'メダル',palette:'パレット',sun:'たいよう',cloud:'くも',rain:'あめ',snow:'ゆき',moon:'つき',
    sunrise:'あさひ',sunset:'ゆうやけ',candy:'キャンディ',bubbles:'しゃぼんだま',balloon:'ふうせん',
    fireworks:'はなび',camera:'カメラ',musicbox:'オルゴール',surprise:'びっくりばこ',
    cherry_blossom:'さくら',sunflower:'ひまわり',maple_leaf:'もみじ',green_leaf:'はっぱ',tree:'き',
    pine:'まつ',palm:'やし',cactus:'サボテン',snow_mountain:'ゆきやま',mountain:'やま',house:'いえ',
    city:'まち',wheat:'むぎ',wave:'なみ',shell:'かいがら',hibiscus:'ハイビスカス',
  };
  // Small code-native symbols fill gaps in the existing atlases. A cake stays
  // a cake, a key stays a key; none borrows a food, egg or character picture.
  const COMMENT_SYMBOL_KEYS = {'🎂':'cake','🎉':'celebration','🎊':'celebration','✨':'sparkles','🌟':'sparkles',
    '💐':'bouquet','🗝':'key','🔑':'key','🧭':'compass','🌈':'rainbow','⚡':'bolt','🔥':'fire',
    '🙂':'smile','💑':'couple','♾':'infinity','🔒':'lock','✅':'check','🏆':'trophy',
    '💎':'diamond','🌌':'galaxy','🕰':'clock','💬':'speech','🔄':'cycle'};
  const COMMENT_SYMBOLS = {
    cake:['ケーキ','<path fill="#f7c7a6" d="M4 12h16v9H4z"/><path fill="#fff5df" d="M4 10h16v5l-3-2-3 2-3-2-3 2-4-2z"/><path d="M8 10V6m8 4V6"/><path fill="#efb34f" d="m8 1-2 3 2 2 2-2zm8 0-2 3 2 2 2-2z"/>'],
    celebration:['おいわい','<path fill="#efb34f" d="m3 21 4-13 9 9z"/><path fill="none" d="m6 12 6 6m0-13 3-3m3 10 4-1m-4-7 2 3"/><path fill="#d56b84" d="M5 2h3v3H5zm14 15h3v3h-3z"/><circle fill="#789daa" cx="15" cy="9" r="1.5"/>'],
    sparkles:['きらめき','<path fill="#f4c85e" d="m10 2 2.5 6.5L19 11l-6.5 2.5L10 20l-2.5-6.5L1 11l6.5-2.5z"/><path fill="#fff0b2" d="m20 1 1 3 3 1-3 1-1 3-1-3-3-1 3-1zm0 14 1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/>'],
    bouquet:['はなたば','<path fill="#8eaf72" d="m4 11 8 11 8-11-8 4z"/><path fill="none" d="m6 7 6 11 6-11m-6-4v15"/><path fill="#e998a7" d="m6 3 2 2 2 2-2 2-2 2-2-2-2-2 2-2zm12 0 2 2 2 2-2 2-2 2-2-2-2-2 2-2z"/><path fill="#f4c85e" d="m12 1 2 2 2 2-2 2-2 2-2-2-2-2 2-2z"/><path fill="#d56b84" d="m8 17 4 2 4-2v4l-4-2-4 2z"/>'],
    key:['かぎ','<circle fill="#e7bc63" cx="7" cy="7" r="5"/><circle fill="#fff5df" cx="7" cy="7" r="1.5"/><path fill="#e7bc63" d="m10 9 12 12-2 2-3-3-2 1-2-2 1-2-6-6z"/>'],
    compass:['ほういじしゃく','<circle fill="#fff5df" cx="12" cy="12" r="10"/><path fill="#d9797f" d="m16 5-1 10-6-6z"/><path fill="#83a6a5" d="m8 19 1-10 6 6z"/><path d="M12 2v2m10 8h-2M12 22v-2M2 12h2"/>'],
    rainbow:['にじ','<path fill="none" stroke="#9a687b" stroke-width="4" d="M3 21V12a9 9 0 0 1 18 0v9"/><path fill="none" stroke="#df9875" stroke-width="3" d="M5 21V12a7 7 0 0 1 14 0v9"/><path fill="none" stroke="#eccd79" stroke-width="3" d="M8 21V12a4 4 0 0 1 8 0v9"/><path fill="none" stroke="#7caba3" stroke-width="2" d="M10 21V12a2 2 0 0 1 4 0v9"/>'],
    bolt:['いなずま','<path fill="#f4c85e" d="M13 1 3 14h7l-1 9 12-14h-8z"/>'],
    fire:['ほのお','<path fill="#df8457" d="M13 1c1 8 8 9 8 15a9 9 0 0 1-18 0c0-3 2-6 4-8 0 4 2 4 2 4s4-4 4-11z"/><path fill="#f6d47f" d="M12 12c0 4-4 4-4 7a4 4 0 0 0 8 0c0-3-4-3-4-7z"/>'],
    smile:['えがお','<circle fill="#f4d48d" cx="12" cy="12" r="10"/><path d="M8 8v2m8-2v2"/><path fill="none" d="M7 14q5 7 10 0"/>'],
    couple:['こいびと','<circle fill="#f2c7a0" cx="6" cy="13" r="3"/><circle fill="#f2c7a0" cx="18" cy="13" r="3"/><path fill="#87a9a3" d="M1 23v-3a5 5 0 0 1 10 0v3z"/><path fill="#c28b9b" d="M13 23v-3a5 5 0 0 1 10 0v3z"/><path fill="#dd8295" d="M12 10 6 5C3 0 10-1 12 3c2-4 9-3 6 2z"/>'],
    infinity:['むげん','<path fill="none" stroke-width="2.5" d="M12 12C6 1 2 7 2 12s4 11 10 0 10-5 10 0-4 11-10 0z"/>'],
    lock:['まだひらいていない','<path fill="none" stroke-width="2.4" d="M6 11V7a6 6 0 0 1 12 0v4"/><rect fill="#b9b4ab" x="3" y="10" width="18" height="12" rx="3"/><circle fill="#694d3b" cx="12" cy="15" r="1.4"/><path d="M12 16v3"/>'],
    check:['かんりょう','<rect fill="#80a779" x="2" y="2" width="20" height="20" rx="5"/><path fill="none" stroke="#fff5df" stroke-width="2.6" d="m6 12 4 5 8-10"/>'],
    trophy:['トロフィー','<path fill="#f4c85e" d="M7 3h10v8a5 5 0 0 1-10 0z"/><path fill="none" d="M7 5H2v3q0 5 5 5m10-8h5v3q0 5-5 5M12 16v4"/><path fill="#dcaa57" d="M7 20h10v3H7z"/>'],
    diamond:['ほうせき','<path fill="#99c6cf" d="m2 8 5-6h10l5 6-10 14z"/><path fill="#d9eef0" d="m7 2 5 6 5-6z"/><path fill="none" d="M2 8h20M7 2l-1 6 6 14 6-14-1-6"/>'],
    galaxy:['ほしぞら','<circle fill="#5b6399" cx="12" cy="12" r="10"/><path fill="none" stroke="#b8cee3" stroke-width="2.2" d="M4 16C6 4 20 5 20 10c0 7-14 9-14 5 0-4 10-7 10-4 0 2-5 5-6 3"/><path fill="#fff0b2" stroke="none" d="m7 3 1 2 2 1-2 1-1 2-1-2-2-1 2-1zm11 12 1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>'],
    clock:['とけい','<circle fill="#d5b47c" cx="12" cy="12" r="10"/><circle fill="#fff5df" cx="12" cy="12" r="7.5"/><path fill="none" stroke-width="1.8" d="M12 6v6l4 3"/><path d="M12 3v1m9 8h-1M12 21v-1M3 12h1"/>'],
    speech:['おはなし','<path fill="#fff5df" d="M3 3h18v14H10l-6 5v-5H3z"/><path fill="none" d="M7 8h10M7 12h7"/>'],
    cycle:['めぐり','<path fill="none" stroke="#83a6a5" stroke-width="2.5" d="M4 9a8 8 0 0 1 14-3M20 15A8 8 0 0 1 6 18"/><path fill="#83a6a5" d="m14 6 6-5v8zm-4 12-6 5v-8z"/>'],
  };
  const COMMENT_PICTURES = {
    '🐌':['companions/snail.png','かたつむり'],'🐸':['frog/05.png','かえる'],
    '⛄':['partners/snowman.png','ゆきだるま'],'🦋':['butterfly/07.png','ちょう'],
    '🦇':['companions/bat.png','こうもり'],'🦉':['companions/owl.png','ふくろう'],
  };
  // Only environment moments and achievement marks may assume this generic
  // animal. A form-change notice can mean a different stage of the same species.
  function commentAnimalVisual(emoji) {
    const key=emoji.replace(/[\uFE0E\uFE0F]/g,'');
    if (!Object.hasOwn(COMMENT_PICTURES,key)) return null;
    const [path,label]=COMMENT_PICTURES[key];
    return {asset:`assets/characters/${path}`,emoji,label};
  }
  // Context-specific achievement marks express the recorded action. The
  // original emoji/condition/ID remains in ACHIEVEMENTS and in the fallback.
  const ACHIEVEMENT_MARKS = Object.fromEntries([
    ['🍂','devolve-1 devolve-5 devolve-20'],['💐','death-1 death-5 death-10'],
    ['🎮','minigame-300 minigame-1000'],['🧭','games-played-25 region-3'],
    ['💊','sick-cured-1 sick-cured-30 medicine-30'],['🌱','age-10'],
    ['📖','dex-25 dex-50 dex-100 dex-150 pastlives-10 elder-collector'],
    ['🧸','play-100'],['💕','pet-100 romantic-10'],['🏅','brave-10 record-rank-a-20 clear-25'],
    ['💰','money-500'],['🌈','weather-all'],['🐾','companion-5'],['✨','sodachi-90 transform-25'],
    ['🏆','lifeclear-10 perfect-life games-complete-100 item-all'],['🌳','nodecline'],
    ['💍','married-3'],['🎁','shop-all'],['🎈','consumable-all'],
  ].flatMap(([mark,ids])=>ids.split(' ').map(id=>[id,mark])));
  function achievementIconHTML(ach) {
    if (ach.id==='naoto-1') return uiIconHTML('naoto_crown','なおとのかんむり',ach.emoji);
    const mark=Object.hasOwn(ACHIEVEMENT_MARKS,ach.id) ? ACHIEVEMENT_MARKS[ach.id] : ach.emoji;
    const animal=commentAnimalVisual(mark);
    if (animal) return commentPictureHTML(animal.asset,ach.emoji,animal.label);
    return commentIconHTML(mark,ach.emoji)||escapeHtml(ach.emoji||'');
  }
  // Food art is reused only for matching game props. The boiled egg remains
  // exclusive to the bento game, never a hatching egg or ambiguous dialogue egg.
  const MINIGAME_FOOD = {
    strawberry:['いちご','<path fill="#df7581" d="M3 9c0-5 6-6 9-3 3-3 9-2 9 3 0 6-6 13-9 13S3 15 3 9z"/><path fill="#81a96e" d="m12 2 2 4 5-2-2 5-5-2-5 2-2-5 5 2z"/><path stroke="#fff0b2" d="m7 11 1 1m8-1-1 1m-3 2v1m-3 2 1 1m5-1-1 1"/>'],
    choco:['チョコ','<path fill="#9c6850" d="M5 2h14v20H5z"/><path fill="none" d="M12 2v13M5 8h14M5 14h14"/><path fill="#b6c6d0" d="m3 13 6 3 4-3 8 3v7H3z"/><path fill="#d37e8a" d="M3 18h18v5H3z"/>'],
    cherry:['さくらんぼ','<path fill="none" stroke="#789363" stroke-width="1.8" d="M7 15q7-5 7-13 0 8 4 12"/><path fill="#86a66f" d="M14 3q-8-5-9 2 7 3 9-2z"/><circle fill="#cd697c" cx="6" cy="17" r="4.5"/><circle fill="#da7580" cx="18" cy="17" r="4.5"/><path stroke="#fff0da" d="m4 15 1-1m11 1 1-1"/>'],
    rice:['おにぎり','<path fill="#fff5df" d="M9 3q3-3 6 0l8 14q2 5-4 5H5q-6 0-4-5z"/><path fill="#516b58" d="M8 13h8v9H8z"/><path stroke="#d8ccae" d="M7 10h1m8-1h1M4 17h1m14 1h1"/>'],
    egg:['ゆでたまご','<path fill="#fff5df" d="M12 2C7 2 3 10 3 15a9 7 0 0 0 18 0c0-5-4-13-9-13z"/><ellipse fill="#efc35f" cx="12" cy="14" rx="5.5" ry="6"/><path fill="none" stroke="#fff0b2" d="M9 11q3-3 5 0"/>'],
    shrimp:['エビフライ','<path fill="#e18471" d="m4 8-3-6 6 2 1 5zm1 0 4-6 2 5-3 4z"/><path fill="#e8b15f" d="M6 7c3-2 7 2 6 6 0 4 4 3 5 0 1-4 6-3 6 0 0 9-13 12-17 4C4 13 3 9 6 7z"/><path fill="none" stroke="#f8d88d" stroke-width="1.5" d="m7 10 2 1m-2 4 2 1m2 3h2m3-2 1-1m3-3v-1"/>'],
    broccoli:['ブロッコリー','<path fill="#9ab779" d="M9 13h6l2 9H7z"/><path fill="none" d="m12 19-5-8m5 8 5-8"/><path fill="#699861" d="M5 14a5 5 0 0 1-2-9 5 5 0 0 1 8-2 5 5 0 0 1 8 2 5 5 0 0 1 1 9c-3 2-5-1-8 0-3-1-4 2-7 0z"/><path fill="none" stroke="#a6c486" d="M5 7q2-2 4 0m5-1q3-2 4 1m-9 3q2-2 4 0"/>'],
    slice:['ショートケーキ','<path fill="#f4d7ac" d="m2 10 20-6v15L2 23z"/><path fill="#ef9b9e" d="m2 14 20-5v4L2 18z"/><path fill="#fff5df" d="m2 10 14-9 6 3v4L2 14z"/><path fill="#df7581" d="M13 4c0-3 6-4 6-1 0 2-2 4-3 4s-3-2-3-3z"/><path fill="#81a96e" d="m16 1 1 1 2-1-1 2-2-1-2 1 1-2z"/>'],
    bento:['おべんとう','<rect fill="#be7d66" x="1" y="3" width="22" height="19" rx="4"/><path fill="#fff5df" d="M4 6h8v13H4z"/><path fill="#526d59" d="M6 13h4v5H6z"/><circle fill="#82a36e" cx="17" cy="9" r="3"/><ellipse fill="#efc35f" cx="17" cy="16" rx="3" ry="2.5"/>'],
    cake:COMMENT_SYMBOLS.cake,
  };
  function minigameFoodHTML(key, fallback) {
    if (!Object.hasOwn(MINIGAME_FOOD,key)) return escapeHtml(fallback||'');
    const [label,art]=MINIGAME_FOOD[key];
    return `<span class="mg-food-picture" data-food-symbol="${key}" role="img" aria-label="${label}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${art}</svg>${iconFallbackHTML(fallback)}</span>`;
  }
  const PROP_ILLUSTRATIONS = globalThis.NaotocchiPropIllustrations?.create({
    document, atlases:UI_ATLAS_IMAGES, symbols:COMMENT_SYMBOLS, food:MINIGAME_FOOD,
  });
  function commentPictureHTML(asset, emoji, label = '') {
    return `<span class="comment-picture" ${label ? `role="img" aria-label="${escapeHtml(label)}"` : 'aria-hidden="true"'}><img class="comment-asset" src="${escapeHtml(asset)}" alt="" width="128" height="128" decoding="async" draggable="false">${iconFallbackHTML(emoji)}</span>`;
  }
  function commentIconHTML(emoji, fallback = emoji) {
    const key = emoji.replace(/[\uFE0E\uFE0F]/g,'');
    if (Object.hasOwn(COMMENT_SYMBOL_KEYS,key)) {
      const symbol=COMMENT_SYMBOL_KEYS[key],[label,art]=COMMENT_SYMBOLS[symbol];
      return `<span class="comment-drawing" data-comment-symbol="${symbol}" role="img" aria-label="${label}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${art}</svg>${iconFallbackHTML(fallback)}</span>`;
    }
    if (Object.hasOwn(COMMENT_CARE,key)) {
      const icon=COMMENT_CARE[key];return careIconHTML(icon,COMMENT_LABELS[icon],fallback);
    }
    if (Object.hasOwn(COMMENT_UI,key)) {
      const icon=COMMENT_UI[key];return uiIconHTML(icon,COMMENT_LABELS[icon],fallback);
    }
    return PROP_ILLUSTRATIONS?.iconHTML(emoji) || '';
  }
  function commentTextHTML(text, character = null) {
    return escapeHtml(text).replace(COMMENT_EMOJI,emoji=>
      character?.asset && emoji===character.emoji
        ? commentPictureHTML(character.asset,emoji,character.label)
        : (character?.illustrationContext && emoji===character.emoji
          ? PROP_ILLUSTRATIONS?.iconHTML(emoji,character.illustrationContext) : '') || commentIconHTML(emoji)||emoji);
  }
  const commentTextCache = new WeakMap();
  function setCommentText(target, text, force = false, character = null) {
    if (!target) return false;
    const value=String(text??'');
    // Only the notice renderer deduplicates repeated renders. Other surfaces
    // still announce each new beat, even when its words match the last beat.
    if (!force && commentTextCache.get(target)===value) return false;
    commentTextCache.set(target,value);
    const html=commentTextHTML(value,character),illustrated=html!==escapeHtml(value);
    const property=illustrated?'innerHTML':'textContent';
    const rendered=illustrated?html:value;
    if (!force && target[property]===rendered) return false;
    target[property]=rendered;
    return true;
  }
  function commentActorVisual(speaker) {
    let visual;
    if (speaker.kind==='pet') visual=currentVisualStage();
    else if (speaker.kind==='companion') visual=allCompanionsById(speaker.id);
    else if (speaker.kind==='partner') {
      const id=speaker.id||state.partner?.id;
      visual=WORLD_MASTER?.partners?.find(p=>p.id===(WORLD_MASTER.compatibility?.partnerAliases?.[id]||id));
    }
    return visual?.asset ? {...visual,emoji:speaker.emoji||visual.emoji,label:speaker.label||visual.label||visual.name} : null;
  }
  function commentSpeakerHTML(speaker) {
    const visual=commentActorVisual(speaker),emoji=speaker.emoji||'💬';
    return visual?.asset ? commentPictureHTML(visual.asset,emoji,compactJapaneseText(speaker.label))
      : commentIconHTML(emoji)||escapeHtml(emoji);
  }
  function renderCareNotice(observe = false) {
    if (!CARE_STATUS) return;
    if (careLife !== state) {
      clearCareFeedback(); careMilestone = null; careLife = state; carePrevious = null; carePreviousKind = '';
    }
    const notice = CARE_STATUS.assess(state, {immortal:isImmortal(), petAvailable:state.affectionStreak < affectionSpamThreshold()});
    const visible = state.stage === STAGE.GROWING && !gameActive && !grandGoalPending
      && !state.transformOptions && !isAnyMenuOverlayOpen()
      && el.lifeCardOverlay.classList.contains('hidden');
    const urgent = visible && notice && notice.severity !== 'info';
    if (observe) {
      const next = CARE_STATUS.snapshot(state);
      // 「せいちょう ↑」の しらせは 5 せいちょう ごと(コストが 20 を こえたら その 1/4 ごと)。
      // コストが やすい あいだに ごはん 1かい ごとに ならない ように
      const quarter = Math.floor(state.growth / Math.max(5, sodachiCost(state.sodachi) / 4));
      // Collect before advancing the snapshot, even while the slot is occupied.
      // One latest summary coalesces simultaneous milestones instead of replaying
      // an unbounded queue of old changes on returning home.
      if (carePrevious?.stage === STAGE.GROWING && state.stage === STAGE.GROWING) {
        const milestones = [];
        if (state.sodachi !== carePrevious.sodachi) {
          const diff = state.sodachi - carePrevious.sodachi;
          milestones.push({icon:diff > 0 ? 'growth' : 'decline',text:`そだち ${diff > 0 ? '+' : '−'}${Math.abs(diff)}：${diff > 0 ? 'せいちょうした' : 'おとろえでさがった'}`});
        }
        if (carePrevious.health <= 25 && state.health > 25) milestones.push({icon:'recovery',text:'けんこうがもどってきた'});
        if (carePrevious.energy < 100 && state.energy >= 100 && state.isSleeping) milestones.push({icon:'recovery',text:'ねむってげんきがかいふくした'});
        if (state.decline >= 50 && Math.floor(state.decline / 25) > Math.floor(carePrevious.decline / 25)) milestones.push({icon:'decline',text:'おとろえ ↑ おせわで立てなおそう'});
        if (!milestones.length && state.sodachi === carePrevious.sodachi && quarter > carePrevious.quarter && quarter > 0) milestones.push({icon:'growth',text:`せいちょう ↑ ${Math.round(state.growth / sodachiCost(state.sodachi) * 100)}%`});
        if (milestones.length) careMilestone = {icon:milestones[0].icon,text:milestones.slice(0,2).map(m=>m.text).join('\n')};
      }
      carePrevious = {...next, quarter};
      const kind = visible ? notice?.kind || '' : '';
      if (kind && kind !== carePreviousKind && notice.motion && !mgPerfLow
        && !speechActive && !conversationIsBusy() && document.visibilityState !== 'hidden') {
        castMotion?.emote(notice.motion);
      }
      carePreviousKind = kind;
    }
    if (state.stage !== STAGE.GROWING) { clearCareFeedback(); careMilestone = null; }
    if (visible && !urgent && !careFeedback && careMilestone) {
      const pending = careMilestone; careMilestone = null; showCareFeedback(pending);
    }
    const display = urgent ? notice : visible && careFeedback
      ? {kind:'change',severity:'info',icon:careFeedback.icon,text:[message,careFeedback.text].filter(Boolean).join('\n')}
      : visible && !message ? notice : null;
    const text = display ? display.text || `${display.title}\n${display.detail}`
      : message || (state.stage === STAGE.DEAD ? '「あたらしいたまご」で、つぎの子をむかえよう'
        : state.stage === STAGE.EGG ? `たまごをタップするか「あたためる」をおしてね${Math.min(100, Math.round((state.growth / HATCH_GROWTH) * 100))}%` : '');
    if (setCommentText(el.message, text)) el.message.scrollTop = 0;
    el.message.dataset.careKind = display?.kind || '';
    el.message.dataset.careSeverity = display?.severity || '';
    el.message.dataset.careIcon = display?.icon || '';
    el.message.dataset.careTone = display?.kind === 'change'
      ? display.text.includes('−') ? display.text.includes('+') ? 'mixed' : 'loss' : 'gain' : '';
    el.screen.dataset.careSeverity = visible ? notice?.severity || '' : '';
    for (const id of ['feedBtn','playBtn','cleanBtn','sleepBtn','medicineBtn','playWithBtn']) {
      const recommended = visible && notice?.action === id;
      el[id].dataset.careRecommended = recommended ? 'true' : '';
      el[id].setAttribute('aria-describedby', recommended ? 'message' : '');
    }
  }

  function setMessage(msg) {
    message = compactJapaneseText(msg);
    if (CARE_STATUS) renderCareNotice();
    else { setCommentText(el.message, message); el.message.scrollTop = 0; }

    // A message must stay on screen for a fixed, guaranteed stretch of time -
    // it must NOT be at the mercy of the background tick's own independent
    // 3-second phase, which could otherwise blank it out (or overwrite it)
    // a fraction of a second after it appeared.
    if (messageTimer) {
      clearTimeout(messageTimer);
      messageTimer = null;
    }
    if (msg) {
      messageTimer = setTimeout(() => {
        messageTimer = null;
        message = '';
        if (!gameActive) render();
      }, MESSAGE_DURATION_MS);
    }
  }

  // メイン育成画面の「だれが しゃべったか」が分かる吹き出し。
  // setMessage() は成長・病気・結果などのシステム通知専用として残し、
  // キャラ本人 / こいびと / なかまのセリフだけをこちらへ流す。
  let speechTimer = null;
  let speechActive = false;
  const SPEECH_DURATION_MS = 2500;
  const castMotion = window.NaotocchiCastMotion?.createController({
    getActors: homeCastActors,
    getGroup: () => el.castResponse,
    canAnimate: () => document.visibilityState !== 'hidden' && !gameActive
      && state.stage !== STAGE.DEAD && !state.transformOptions && !isAnyMenuOverlayOpen(),
    isResting: () => state.isSleeping || state.isSick || state.dying || state.stage === STAGE.FAREWELL,
    getMotionRadius: homeCastMotionRadius,
    env: window,
  });

  function hideSpeechBubble() {
    speechActive = false;
    if (speechTimer) { clearTimeout(speechTimer); speechTimer = null; }
    if (el.speechBubble) el.speechBubble.classList.add('hidden');
    castMotion?.clearSpeaker();
  }

  function setSpeechBubble(text, speaker, reaction = {}) {
    if (!el.speechBubble || !text || !speaker) return;
    if (speaker.kind === 'partner' && (!state.partner || (speaker.id && speaker.id !== state.partner.id))) return;
    if (speaker.kind === 'companion' && !state.companions.some(c => canonicalCompanionId(c.id) === speaker.id)) return;
    if (speechTimer) clearTimeout(speechTimer);
    speechActive = true;
    el.speechSpeaker.innerHTML = commentSpeakerHTML(speaker);
    el.speechSpeaker.title = compactJapaneseText(speaker.label);
    setCommentText(el.speechText, compactJapaneseText(text), true);
    el.speechBubble.dataset.kind = speaker.kind || 'pet';
    el.speechBubble.classList.remove('hidden');
    // A display:none ancestor has no scroll box; reset after revealing it.
    el.speechText.scrollTop = 0;
    renderHomeCast();
    castMotion?.speak({...reaction, text:compactJapaneseText(text), speaker});
    speechTimer = setTimeout(() => {
      speechTimer = null;
      speechActive = false;
      el.speechBubble.classList.add('hidden');
      castMotion?.clearSpeaker();
    }, SPEECH_DURATION_MS);
  }

  function sayPet(text) {
    if (!text) return;
    setSpeechBubble(text, petSpeaker());
  }


  function petSpeaker() {
    return { kind: 'pet', emoji: currentSprite(), label: SPECIES_DISPLAY_NAMES[state.speciesLine] || 'なおとっち' };
  }

  function partnerSpeaker() {
    const p = state.partner;
    return p ? { kind: 'partner', id:p.id, emoji: p.emoji || '💕', label: p.label || 'こいびと' } : null;
  }

  function companionSpeaker() {
    if (!state.companions.length) return null;
    const sc = state.companions[Math.floor(Math.random() * state.companions.length)];
    const c = allCompanionsById(sc.id);
    return c ? { kind: 'companion', id: c.id, emoji: c.emoji, label: c.name } : null;
  }

  // ================================================================
  // なおとっち会話エンジン
  // ================================================================
  // 事実説明は setMessage / 上部イベント表示へ残し、キャラの感情・ツッコミ・
  // ひとりごとはここへ流す。本人→恋人/仲間の順に会話が続くこともある。
  const CONVERSATION_POOLS = {
    "feed": {
      "pet": [
        "うまっ!",
        "これ毎日でよくない?",
        "炭水化物はうらぎらない",
        "いまたぶんしあわせのかおしてる",
        "あと3はいいける気がする",
        "おさらにもう何もない。ふしぎ",
        "かむの忘れかけた",
        "ひとくちのつもりが一食だった",
        "おなかから拍手きた",
        "最後のひとくちだけ大きくない?"
      ],
      "partner": [
        "食べるのはやすぎ笑",
        "くちについてるよ",
        "ひとくちちょうだい?",
        "またそんなにたべて笑",
        "最後のひとくち、見守ってる",
        "食べ終わったら感想きかせて",
        "そのほっぺ、満席だね",
        "おいしいとしずかになるんだ",
        "あとでおさら回収するね"
      ],
      "companion": [
        "ぼくも!",
        "ひとくち!",
        "ぜんぶいる!",
        "いいにおい!",
        "おさらの音で来ました!",
        "ひとくちの予約、まだできる?",
        "食べる係ならあいてる!",
        "順番まちの列、ここ?",
        "そのおさら、もう一周しない?"
      ]
    },
    "overfeed": {
      "pet": [
        "むり。もうはいるばしょない",
        "おなかがたいへんなことになってる",
        "たべるまえのぼくをとめたい",
        "ダイエットはあしたのぼくにまかせた",
        "おなかだけ一歩先にいる",
        "座るにも相談がいる",
        "さっきの一口、まだ間にあう?",
        "満腹のむこう側だった",
        "もうにおいでおなかいっぱい"
      ],
      "partner": [
        "だからいったのに笑",
        "おなかさすろうか?",
        "ほんとにぜんぶたべたの?",
        "動かなくていいよ。こっちで休も",
        "おさらは片づけとくね",
        "見ないふりしておくね笑",
        "おかわりの相談はあしたね",
        "となり、少し広くあけとく"
      ],
      "companion": [
        "ぼくはまだいける!",
        "そのぶんぼくがたべればよかったのに!",
        "おやつの話はあとにするね!",
        "走る予定は消しといた!",
        "ころがす?…やめとく!",
        "そのおなかでおじぎできる?",
        "座れる場所さがしてくる!"
      ]
    },
    "sleep": {
      "pet": [
        "おやすみ。あしたからほんきだす",
        "もうむり。ねる",
        "夢であおう",
        "5ふんだけ…たぶん",
        "まぶたが先に帰った",
        "夢の入口でくつぬぐ?",
        "ねる向きだけ決めた",
        "あくびに返事とられた",
        "用事は枕に伝えといて"
      ],
      "partner": [
        "おやすみ。へんな夢みないでね",
        "ちゃんとふとんかけてね",
        "寝顔みてもいい?",
        "返事はあしたでいいよ",
        "となりで静かにしてるね",
        "あと一言はねごとでどうぞ",
        "ふとんの端、こっちにあるよ",
        "おやすみの小声、届いた?"
      ],
      "companion": [
        "もうねるの?",
        "ぼくもねよ",
        "いびきうるさくしないでね!",
        "静かにあそぶ練習する!",
        "小声ってこれくらい?",
        "続きは起きたら教えて!",
        "おやすみってもう言ったっけ?",
        "足音、ちいさくしてくる!"
      ]
    },
    "wake": {
      "pet": [
        "おはよ。まだねむい",
        "よし、きょうもいきるか",
        "夢のつづきどこいった?",
        "ねた。たぶんげんき",
        "夢の荷物置いてきた",
        "おきたけどまだ読み込み中",
        "まぶたが残業したがる",
        "寝るまえの用事、なんだっけ",
        "枕には先にあいさつした"
      ],
      "partner": [
        "おはよう",
        "ねぐせすごいよ笑",
        "ちゃんとねれた?",
        "急がなくていいよ。まだいるから",
        "夢で何か拾ってきた?",
        "おはようの声、半分ねてる",
        "よく寝た顔。ちょっとうらやましい",
        "まばたきゆっくりだね"
      ],
      "companion": [
        "おきたー!",
        "あそぼ!",
        "ずっとまってた!",
        "起きた!話すことたまってる!",
        "待ってる間にひまを極めた!",
        "あそぶ順番、考えてた!",
        "夢のおみやげは?",
        "寝てる間もちゃんと隣にいたよ"
      ]
    },
    "clean": {
      "pet": [
        "よし、いいかんじ!",
        "なんかへやがひろくなったきがする",
        "これならごろごろできる",
        "においまでちがう!",
        "ちゃんと片づくときもちいい",
        "いまのぼく、ちょっとできる子",
        "床ってこの色だった",
        "落ちてたの全部ぼくのかも",
        "ほこりにも引っ越してもらった",
        "片づけた場所を忘れた",
        "床が見えると歩きたくなる"
      ],
      "partner": [
        "お、いいじゃん",
        "ちゃんときれいになったね",
        "床でごろごろできるね",
        "そこまでやったの?早いね",
        "先にやってくれたんだ。ありがと",
        "これなら今日はくつしたで歩けるね笑",
        "ここ空いたね。座っていい?",
        "ほうきの置き場だけ決めようか",
        "なくした物、そこにあったんだ",
        "最後のすみまできれいだね",
        "あとは一緒に休む仕事だね"
      ],
      "companion": [
        "わー!ひろくなった!",
        "ここ走っていい?",
        "さっきよりぜんぜんいい!",
        "ぼくのせいじゃないけどきれい!",
        "走る道できた!",
        "落とし物のお迎えきました!",
        "足あとつけていい?だめ?",
        "片づける物がなくてひまだ!",
        "床の点検、ころがっていい?"
      ]
    },
    "medicine_cure": {
      "pet": [
        "まずっ!!でもなおった!",
        "げんきもどった!",
        "くすりってまずいほどきくの?",
        "いまならなんでもできそう",
        "苦さだけ居残りしてる",
        "あくびの声まで元気になった",
        "苦い顔、もどしていい?",
        "元気ってこういう感じだった",
        "口なおしの相談をしたい"
      ],
      "partner": [
        "よかった、なおったね",
        "顔色もどってきたね",
        "もうむりしないでよ",
        "まずそうな顔してる笑",
        "今日はちょっとゆっくりしよ",
        "顔みて安心した",
        "毛布、まだしまわずにおこうか",
        "元気の前借りはしないでね",
        "苦い顔だけ残ってるよ笑",
        "次の用事は休憩にしよ"
      ],
      "companion": [
        "それぼくにはくれないで",
        "なおったー!",
        "においだけでまずそう!",
        "元気のおかえり会しよう!",
        "元気な声が戻ってきた!",
        "においでこっちまで苦い!",
        "今日は応援だけにしとく!",
        "あそぶ場所、とっておくね!"
      ]
    },
    "medicine_wrong": {
      "pet": [
        "びょうきじゃないって!",
        "なんでいま!?",
        "それいらない!ほんとに!",
        "くすりガチャやめて",
        "元気にも薬っているの?",
        "そのスプーン、返却します",
        "おやつの顔して持ってこないで",
        "苦さだけふえたんだけど",
        "元気です。もう一度いうね"
      ],
      "partner": [
        "それいまのませるやつ?",
        "ちゃんとようすみてあげて笑",
        "おくすりの出番、まだだね",
        "元気かどうか先に聞こうか",
        "今はお水だけでいいよ",
        "その瓶、いったん戻そっか",
        "びっくりしたね。ひと息つこ"
      ],
      "companion": [
        "ぼくにこないで!",
        "にげろー!",
        "その列には並ばない!",
        "おやつじゃなかった!",
        "味見係は辞退します!",
        "元気な人はこっち集合!",
        "薬のふたしめる係やる!"
      ]
    },
    "play_with": {
      "pet": [
        "うおおおお!",
        "もっと!",
        "いまのもう1かい!",
        "たのしすぎていみわからん",
        "楽しさが先にはねた",
        "くすぐったい場所ふえた?",
        "笑いすぎて返事がでない",
        "いまの動きに名前つけよ",
        "じゃれる予定ならあいてます"
      ],
      "partner": [
        "なにしてんの笑",
        "たのしそうでなにより",
        "ちょっとまぜて",
        "その笑い方、つられる",
        "そこそんなにくすぐったいんだ",
        "元気な顔、近くで見とこ",
        "休憩の席はとっておくね",
        "笑いすぎ。…こっちまで笑った"
      ],
      "companion": [
        "顔やめて顔!",
        "つかまえた!",
        "まだまけてない!",
        "横から参加しまーす!",
        "つぎの番、予約!",
        "遊びのルールはあとで!",
        "その動き、全員でやろう!",
        "審判も遊んでいい?"
      ]
    },
    "play_with_annoyed": {
      "pet": [
        "ちょ、しつこい笑",
        "もういいって!",
        "距離感バグってるよ",
        "いまはひとりにして!",
        "休憩にも休憩をください",
        "笑う係、いったん退勤",
        "いま置き物になりたい",
        "返事はまばたきでいい?",
        "楽しさに体力が追いつかない"
      ],
      "partner": [
        "ちょっとやりすぎ笑",
        "休ませてあげて",
        "ここでいったんおしまいにしよ",
        "静かな席、あけといたよ",
        "楽しそうでも休憩はいるね",
        "続きは気が向いたらね",
        "今はそばで見てるね"
      ],
      "companion": [
        "もうおなかいっぱい!",
        "ぼくもちょっとつかれた!",
        "休憩の号令だけ元気!",
        "全員いったん座ろう!",
        "続きの場所はとっとく!",
        "元気はあとで持ってくる!",
        "ひま係に戻ります!"
      ]
    },
    "court": {
      "pet": [
        "すきなんだけど!!!!",
        "いまいわないとたぶんむり",
        "距離ちかくしていい?",
        "その顔反則",
        "帰り道、もう一周しない?",
        "好きのあと、何て言うんだっけ",
        "近づく理由がもう足りない",
        "目があうと用事を忘れる",
        "用はないけど呼んでいい?",
        "好きって小声でも届く?"
      ],
      "partner": [
        "声でかい笑",
        "近い近い笑",
        "それずるい",
        "もうちょっとこっちきて",
        "そんな顔されたらこまる",
        "聞こえた。もう一回、聞きたいかも",
        "その続き、となりで聞くね",
        "好きの返事、顔に出てる?",
        "ちょっと待って。顔を戻すから",
        "用事なくても来ていいよ"
      ],
      "companion": [
        "またはじまった!",
        "ぼくどこみればいい?",
        "空気になるね!",
        "聞こえちゃった。もう遅い?",
        "今は実況やめとく!",
        "おやつ持って離れてます!",
        "ふたりの間だけ通行止め!",
        "拍手するタイミング教えて!"
      ]
    },
    "court_fail": {
      "pet": [
        "いまのなしで!",
        "ふとんに帰りたいくらいはずかしい",
        "タイミングぜったいちがった",
        "心だけ先に走った",
        "言ったあとの手、どこに置く?",
        "返事を聞く練習してなかった",
        "ほっぺだけ夏になった",
        "話題の予備、持ってない",
        "今日は帰り道をゆっくり行く"
      ],
      "partner": [
        "いまはちょっと…",
        "きらいじゃないけど、ちょっとまって",
        "急すぎ笑",
        "返事はもう少し考えたい",
        "聞いたよ。急がなくていいよ",
        "今はいつもどおり話そ",
        "大きな声じゃなくても届いてるよ",
        "ちょっと距離を戻そうか"
      ],
      "companion": [
        "うわあ…",
        "ぼくみてないことにする",
        "散歩しよ。話さなくてもいいから",
        "おやつの話、する?",
        "隣の席はあいてるよ!",
        "今のはここだけの話ね",
        "帰り道なら一緒にいく!"
      ]
    },
    "age": {
      "pet": [
        "{age}さいになった!",
        "もう{age}さいだって!",
        "{age}さいのぼくもよろしく!",
        "年齢だけすすむのはやくない?",
        "{age}さい、まだ慣れてない",
        "年だけ先に到着した",
        "ろうそく数えるだけで疲れそう",
        "誕生日の顔ってどれ?",
        "年齢欄を書きなおしてくる"
      ],
      "partner": [
        "{age}さいおめでとう!💕",
        "またひとつおもいでがふえたね",
        "これからもいっしょにいようね",
        "今日の顔もおぼえとくね",
        "最初におめでとうって言いたかった",
        "お祝いの練習してた。おめでとう",
        "{age}さいの最初の用事、何にする?",
        "今日は少しだけ甘やかそうかな"
      ],
      "companion": [
        "{age}さいおめでとう!",
        "またおおきくなったね!",
        "きょうはちょっととくべつだね!",
        "主役の席、あけたよ!",
        "拍手は何回でもできる!",
        "ろうそく数える係やる!",
        "ケーキの見張りはまかせて!",
        "今日だけ主役をゆずります!"
      ]
    },
    "sodachi": {
      "pet": [
        "またそだった!",
        "できること、ひとつ増えたかな",
        "さっきより自信がひとくちぶんある",
        "おせわされた分、ちゃんと残ってる",
        "昨日の自分に教えたいことがある",
        "そだちって見えないのに増えるんだ",
        "ほめられる準備だけはできてる",
        "中身が少し追いついてきた",
        "覚えたことの置き場所、まだあるよ"
      ],
      "partner": [
        "ちょっと頼もしくなったね",
        "こつこつ続いたの、見てたよ",
        "前は困ってたことも慣れてきたね",
        "急がずここまで来たね",
        "いつもの積み重ねって残るんだね",
        "できたこと、ひとつ教えて",
        "その自信ありそうな顔、いいね",
        "新しい用事も一緒に覚えよ"
      ],
      "companion": [
        "さっきの、今度教えて!",
        "先に慣れちゃったね!",
        "おお、ちょっと頼もしい!",
        "次は一緒にやってみよう!",
        "覚えたこと自慢していいよ!",
        "こっちまでやる気が出た!",
        "みんなにも知らせてくる!",
        "できることが増えると忙しいね!"
      ]
    },
    "money": {
      "pet": [
        "金だ!!",
        "これは貯金…たぶん",
        "お金の音が一枚ぶんふえた",
        "コインの音、すき",
        "数えなおすたび嬉しい",
        "使い道だけ先に行列してる",
        "貯金箱に自慢してくる",
        "財布が少しえらそう",
        "コインに名前つけたら使えない?"
      ],
      "partner": [
        "貯金しなよ笑",
        "おごってくれる?",
        "またすぐつかわないでね",
        "数える間だけ静かにしてるね",
        "買う前の相談には乗るよ",
        "財布の顔まで明るく見える",
        "少し残したらまた楽しめるね",
        "小銭の音でこっち向いたよ"
      ],
      "companion": [
        "おごって!",
        "それたべれる?",
        "ぼくのぶんある?",
        "おごられる準備だけできた!",
        "コインの音で集合した!",
        "数える係はおやつ代で!",
        "おやつ予算、提案していい?",
        "財布の列に並んじゃった!"
      ]
    },
    "travel": {
      "pet": [
        "ついた!",
        "空気ちがう!",
        "ここ住めるかな",
        "とりあえず何たべる?",
        "地図で見るよりひろい",
        "地図の点に立ってる",
        "おみやげの棚が先に見たい",
        "はじめてなのにおなかはいつもどおり",
        "知らない道の顔して歩こう",
        "到着したのに足がまだ旅してる"
      ],
      "partner": [
        "いっしょに来れてよかった",
        "写真とろうよ",
        "迷子にならないでね笑",
        "少し歩幅あわせよっか",
        "迷ったらふたりで地図みよ",
        "到着した顔、撮っておこうかな",
        "荷物おろしてから探検しよ",
        "帰り道もおぼえておこうね"
      ],
      "companion": [
        "走っていい!?",
        "知らないにおい!",
        "ここぼくのなわばりにする!",
        "先頭係、交代制ね!",
        "知らない場所で点呼しまーす!",
        "集合場所を先に決めよう!",
        "おみやげ係に立候補!",
        "探検の最初はどっち?"
      ]
    },
    "transform": {
      "pet": [
        "え、ぼく!?",
        "鏡どこ!?",
        "中身はぼくのまま…だよね?",
        "変身ポーズいる?",
        "なんか強そう",
        "自己紹介からやりなおす?",
        "影にも説明しておこう",
        "操作方法は変わってないよね",
        "鏡のほうが先に慣れそう",
        "この姿でいつもの顔できる?"
      ],
      "partner": [
        "似合ってる。見慣れるまでちょっとかかりそう笑",
        "急に変わりすぎ!",
        "でもちゃんとわかるよ",
        "同じ呼び方で振り向いたね",
        "いつもの呼び方でいいんだね",
        "びっくりしたぶんもう少し見たい",
        "となりに来たら見慣れるかな",
        "声かける前に二度見した"
      ],
      "companion": [
        "だれ!?…あ、きみか!",
        "ぼくもへんしんしたい!",
        "においはおなじ!",
        "点呼!…同じ人だった!",
        "名札だけ借りてもいい?",
        "二度見する列はここ!",
        "集合写真とりなおそう!",
        "影当てゲーム、難しくなった!"
      ]
    },
    "partner_new": {
      "pet": [
        "え、ほんとに!?",
        "うれしくて何から話せばいいかわからない",
        "今日を記念日にしよう",
        "心臓うるさい",
        "呼び方、きのうと同じでいい?",
        "返事のあと何も考えてなかった",
        "顔が勝手にお祝いしてる",
        "となりの席、予約していい?",
        "うれしいの置き場所がない"
      ],
      "partner": [
        "これからよろしくね",
        "そんなににやけないで笑",
        "ちゃんと大事にしてね",
        "帰り道、少しゆっくり行こ",
        "呼び方は急に変えなくていいよ",
        "となりの席、とっておくね",
        "こちらこそ。いまちょっと照れてる",
        "明日もいつもどおり呼んでね"
      ],
      "companion": [
        "おめでとー!",
        "ぼくのことも忘れないで!",
        "お祝いのおやつ、何人ぶん?",
        "列の並び順変わる?",
        "あ、お祝いの声が裏返った!",
        "ふたりの席、あけといた!",
        "おやつ会議には来てね!",
        "ふたりとも同じ顔してる!"
      ]
    },
    "marriage": {
      "pet": [
        "ほんとにけっこんした!",
        "市役所いく?もういった?",
        "明日の朝もとなりにいるんだね",
        "指輪なくさないようにする",
        "名字の練習、いるのかな",
        "生活の話なのに顔が熱い",
        "ただいまの相手が決まった",
        "一緒になくし物さがすんだね",
        "家族って呼ぶの、まだ照れる"
      ],
      "partner": [
        "これからもよろしくね",
        "席、となりにしておいたよ",
        "一緒に年とろうね",
        "明日のごはんも一緒に考えよ",
        "おかえりを言う係、交代ね",
        "なくし物はふたりで探そう",
        "家族会議の一回目はおやつで",
        "いつもの席をふたりぶんね"
      ],
      "companion": [
        "けっこん!?",
        "パーティーは!?",
        "ぼくも家族?",
        "家族会議、見学したい!",
        "まずおめでとう!続きは考え中!",
        "ケーキ運ぶ係、慎重にいく!",
        "ふたりの分まで拍手する!",
        "写真の端に入っていい?"
      ]
    },
    "minigame_great": {
      "pet": [
        "見た!?いまの見た!?",
        "いまのもう1回できるかな",
        "ドヤがおがもどらない",
        "手がまだちょっと震えてる笑",
        "手だけ先に喜んでる",
        "さっきのぼくに聞きたい",
        "自慢の準備が間にあわない",
        "もう一回やると違うぼくかも",
        "帰り道もこの顔でいく"
      ],
      "partner": [
        "いまの見てたよ",
        "もう顔が得意げ笑",
        "さっきのとこどうやったの?",
        "見てる間、息とめてた",
        "説明は得意げな顔でどうぞ",
        "今の顔、写真に残したいね",
        "終わってから肩の力ぬけた",
        "途中からこっちも応援に本気だった"
      ],
      "companion": [
        "いまの見た!",
        "もう1かい!",
        "ぼくもやる!",
        "なんでそんなできるの!?",
        "拍手する手が足りない!",
        "実況が追いつかなかった!",
        "観客席から立っちゃった!",
        "今の技に名前つけよう!",
        "順番まちの期待が上がった!"
      ]
    },
    "minigame_bad": {
      "pet": [
        "いまのは練習",
        "押すところひとつまちがえた",
        "忘れて",
        "もう1回ならさっきよりいける",
        "作戦だけは立派だった",
        "勝つ顔だけ先に練習してた",
        "応援に手を振ったのが敗因かも",
        "指と相談してくる",
        "今の負け、あとで分析する顔しよ"
      ],
      "partner": [
        "はいはい笑",
        "言い訳はやいって",
        "次がんばろ",
        "まず肩の力ぬこうか",
        "一回休んで作戦会議しよ",
        "見てたから惜しいのもわかる",
        "失敗した顔もいつもの顔だね",
        "隣の席で次も見てるよ"
      ],
      "companion": [
        "どんまい!",
        "つぎぼくにもやらせて!",
        "反省会におやついる?",
        "次の作戦、聞くだけ聞く!",
        "練習相手ならいるよ!",
        "今の失敗、秘密にしとく!",
        "応援の音量、調整します!"
      ]
    }
  };

  let conversationTimers = [];
  let conversationBusyUntil = 0;
  let recentConversationLines = [];
  function clearConversationTimers() {
    conversationTimers.forEach((t) => clearTimeout(t));
    conversationTimers = [];
    conversationBusyUntil = 0;
    castMotion?.clear(false);
  }
  function conversationIsBusy() {
    return Date.now() < conversationBusyUntil;
  }
  function fillConversationLine(line, ctx) {
    if (!line) return line;
    return line.replaceAll('{age}', String(ctx.age ?? currentAge()))
      .replaceAll('{sodachi}', String(ctx.sodachi ?? state.sodachi))
      .replaceAll('{coins}', String(ctx.coins ?? 0));
  }
  function conversationLineKey(line) {
    return String(line).normalize('NFKC').replace(/[\s。、!?「」]/g, '');
  }
  function conversationLineIsRecent(line) {
    const key = conversationLineKey(line);
    return recentConversationLines.some((recent) => conversationLineKey(recent) === key);
  }
  function pickCharacterConversationLine(specific, fallback, ctx = {}) {
    const fresh = (specific || []).filter((line) => !conversationLineIsRecent(fillConversationLine(line, ctx)));
    const pool = fresh.length && (!fallback?.length || Math.random() < 0.7) ? fresh : fallback;
    return pickConversationLine(pool, ctx);
  }
  function pickConversationLine(lines, ctx) {
    if (!lines || !lines.length) return null;
    let pool = lines.map((x) => fillConversationLine(x, ctx || {}));
    const fresh = pool.filter((x) => !conversationLineIsRecent(x));
    if (fresh.length) pool = fresh;
    const line = pool[Math.floor(Math.random() * pool.length)];
    recentConversationLines.push(line);
    if (recentConversationLines.length > 24) recentConversationLines.shift();
    return line;
  }
  const PARTNER_DAILY_REACTIONS = {
    "cat_ceo": {
      "play_with": [
        "いま休憩中。……もう少しそのまま",
        "休憩、5分だけ延長しよう",
        "その用事なら優先していい"
      ],
      "medicine_cure": [
        "体調管理も仕事のうち。なおってよかった",
        "心配で予定が手につかなかった",
        "本日の残りは休養で"
      ],
      "travel": [
        "移動時間も予定に入れといた",
        "寄り道の枠も確保した",
        "帰る時間はあとで決める"
      ],
      "minigame_great": [
        "成果は数字で出るときもちいいね",
        "その顔、成果報告よりわかりやすい",
        "今日は定時でお祝いしよう"
      ],
      "minigame_bad": [
        "改善案、あとでまとめよ",
        "反省会はお茶つきで",
        "いったん休憩を決裁します"
      ]
    },
    "robot_neighbor": {
      "play_with": [
        "スキンシップ……好感度上昇を確認",
        "距離センサー、近いと喜びます",
        "この感覚、名前がまだありません"
      ],
      "medicine_cure": [
        "バイタル、正常化。安心しました",
        "心配の処理がやっと終わりました",
        "安心したら冷却ファンが止まりました"
      ],
      "travel": [
        "未知の地域をスキャンします",
        "寄り道も経路に含めます",
        "知らない道、同時に覚えましょう"
      ],
      "minigame_great": [
        "今の動き、お気に入りに保存しました",
        "拍手の回数がオーバーフローしそうです",
        "今の動き、もう一度観測したいです"
      ],
      "minigame_bad": [
        "再試行できます。応援モードは継続中です",
        "失敗データも大切に保存します",
        "応援は再起動なしで続けられます"
      ]
    },
    "field_cow": {
      "play_with": [
        "のんびりしよ",
        "急がない遊びならまかせて",
        "そこに座ったらもう動けないねえ"
      ],
      "medicine_cure": [
        "元気になってよかった。草いる？",
        "お祝いは急がず噛もうねえ",
        "心配してたら草が進まなかった"
      ],
      "travel": [
        "いい草あるかな",
        "着いたねえ。帰るのはあとで考えよ",
        "寄り道の草も見ていこうか"
      ],
      "minigame_great": [
        "すごいねえ",
        "見てたら草を噛むの止まってた",
        "お祝いものんびりやろうねえ"
      ],
      "minigame_bad": [
        "まあまあ。草でも食べよ",
        "一回休むのも上手のうちだよ",
        "あわてないで。ここは逃げないから"
      ]
    },
    "sunflower_partner": {
      "play_with": [
        "もっとこっち向いて",
        "こっち向いたらまた目があった",
        "近くで笑うとまぶしいね"
      ],
      "medicine_cure": [
        "元気ならまたきみの方向ける",
        "今日は少しだけ日かげで休もう",
        "元気な顔、また見られた"
      ],
      "travel": [
        "どこでもきみの方はわかるよ",
        "向きを変えてもきみが目印",
        "道に迷ったらこっち見て"
      ],
      "minigame_great": [
        "いますごくまぶしかった",
        "いま太陽見るの忘れてた",
        "お祝いの顔、こっちにも見せて"
      ],
      "minigame_bad": [
        "下むかないで。こっち見て",
        "今日は下を向く日でもいいよ",
        "顔を上げるまでここにいるね"
      ]
    },
    "forest_bear": {
      "play_with": [
        "あったかいね",
        "ぎゅっとする前にひと呼吸",
        "この手でくすぐったくない?"
      ],
      "medicine_cure": [
        "よかった。はちみつたべる？",
        "はちみつのふた、開けておくね",
        "休む場所、広めにとってあるよ"
      ],
      "travel": [
        "つかれたらすぐ休もう",
        "歩くの速かったら言ってね",
        "休憩できる切り株見つけたよ"
      ],
      "minigame_great": [
        "すごい。ぎゅーしていい？",
        "拍手、大きすぎたかな",
        "お祝い用のはちみつ、出そうか"
      ],
      "minigame_bad": [
        "だいじょうぶ。ゆっくりでいいよ",
        "休憩だけなら何回でも付きあうよ",
        "大きな手だけど、肩はそっとたたくね"
      ]
    },
    "grove_deer": {
      "play_with": [
        "……もう少し近くてもいいよ",
        "ここまで近づいても平気になった",
        "……もう一回なら"
      ],
      "medicine_cure": [
        "顔色、もどったね",
        "元気になったの、少し前から見てた",
        "今日は静かなところにいよう"
      ],
      "travel": [
        "しずかな道みつけた",
        "振り返る前に足音でわかった",
        "人の少ないほう、行かない?"
      ],
      "minigame_great": [
        "見てた。すごかった",
        "……もう一回見たい",
        "嬉しくて少し近づいちゃった"
      ],
      "minigame_bad": [
        "次はとなりで見てる",
        "何も言わないでとなりにいていい?",
        "次もここから見てるね"
      ]
    },
    "cliff_goat": {
      "play_with": [
        "じゃれたら次のぼろ！",
        "そこよりあっちの岩で遊ぼう!",
        "休憩場所、ちょっと高いけど来る?"
      ],
      "medicine_cure": [
        "元気な顔だ。山はまた今度ね",
        "元気になっても今日は平地ね",
        "山は逃げないから。たぶん!"
      ],
      "travel": [
        "あっち、道じゃないけど行けそう",
        "道があるほう、今日は選ぶね",
        "景色のいい休憩所なら上にある!"
      ],
      "minigame_great": [
        "その勢いで崖もいける！",
        "その勢い、登り坂向き!",
        "お祝いの場所、高めでいい?"
      ],
      "minigame_bad": [
        "近道探そ！",
        "いったん下りてから作戦たてよう",
        "遠回りでも着けばいいんだよ!"
      ]
    },
    "high_eagle": {
      "play_with": [
        "……近い",
        "……そこならいい",
        "羽の下、少しあいてる"
      ],
      "medicine_cure": [
        "顔がもどった。よかった",
        "……安心した",
        "今日は飛ばずにここにいる"
      ],
      "travel": [
        "上から先を見てくる",
        "……こっちが近い",
        "先に見た。静かな場所がある"
      ],
      "minigame_great": [
        "よく見えてた",
        "……見逃さなかった",
        "最後の動き、よかった"
      ],
      "minigame_bad": [
        "次はもっと遠くを見て",
        "……肩の力、ぬいて",
        "遠くを見ると少し落ちつく"
      ]
    },
    "snow_spirit": {
      "play_with": [
        "つめたくない？",
        "手の冷たさ、慣れた?",
        "近づくと雪の音がしずかになる"
      ],
      "medicine_cure": [
        "熱、もうだいじょうぶ？",
        "おでこ、もうつめたくしていい?",
        "今日はとなりで静かに光るね"
      ],
      "travel": [
        "雪があるとうれしい",
        "あたたかい場所の話、聞かせて",
        "知らない季節も一緒に見たい"
      ],
      "minigame_great": [
        "きらきらしてた",
        "きみが笑うと雪より明るい",
        "今の顔、長く覚えていたい"
      ],
      "minigame_bad": [
        "今日はここまで。雪もひと休み",
        "急に元気な顔にしなくていい",
        "静かにしててもそばにいるよ"
      ]
    },
    "snowman": {
      "play_with": [
        "ぎゅーは短めでおねがい",
        "近づく前に日かげへどうぞ",
        "温度だけちょっと測っていい?"
      ],
      "medicine_cure": [
        "なおってよかった。ぼくはとけてない",
        "安心して顔がゆるんだ。形は無事",
        "看病のあとは日かげで休もう"
      ],
      "travel": [
        "日かげルートでいこ",
        "日なたの区間、早歩きでお願い",
        "写真は日かげの側から撮ろう"
      ],
      "minigame_great": [
        "クールだったね。ぼくほどじゃないけど",
        "熱い拍手は気持ちだけで!",
        "興奮しても形は保ちます"
      ],
      "minigame_bad": [
        "頭ひやそ。ぼくの横くる？",
        "クールダウンの場所なら知ってる",
        "冷静な顔だけなら得意です"
      ]
    },
    "rock_octopus": {
      "play_with": [
        "どの手でじゃれる？",
        "あれ、どの手までつないだっけ",
        "片方はお茶をいれておくね"
      ],
      "medicine_cure": [
        "8本で看病したかいあった！",
        "枕の角度、8方向から確認したよ",
        "元気になったから看病の手があまった"
      ],
      "travel": [
        "荷物8こまで持てるよ",
        "地図と荷物とおやつ、持ったよ",
        "つなぐ手だけ一本あけてある"
      ],
      "minigame_great": [
        "8回拍手する！",
        "拍手しながら写真も撮れるよ",
        "お祝いの準備、同時にはじめた!"
      ],
      "minigame_bad": [
        "手は8本ある。作戦も考えよう",
        "一息つこう。お茶もう用意した",
        "反省する前に肩ほぐそうか"
      ]
    },
    "sea_mermaid": {
      "play_with": [
        "陸のじゃれかたってこう？",
        "陸の遊び、またひとつ覚えた",
        "今の動き、水の中でもできるかな"
      ],
      "medicine_cure": [
        "いつもの声に戻ったね",
        "陸の看病、少し覚えたよ",
        "元気な声、海まで聞かせたい"
      ],
      "travel": [
        "また新しい陸教えて",
        "地図の青くない所、まだ不思議",
        "ここでの歩き方、教えてね"
      ],
      "minigame_great": [
        "海の底まで自慢しにいこ",
        "今の技、水の外だけのもの?",
        "海の友達にも説明したいな"
      ],
      "minigame_bad": [
        "今の失敗、波が持っていけばいいのに",
        "陸の遊びはむずかしいね",
        "一緒に覚えたら少し楽かな"
      ]
    },
    "anglerfish": {
      "play_with": [
        "灯り、近づけるね",
        "明るすぎたら灯りを下げるね",
        "暗いと近づく勇気が出る"
      ],
      "medicine_cure": [
        "顔がまたちゃんと見える",
        "安心して灯りが強くなっちゃった",
        "まぶしかった?少しおさえるね"
      ],
      "travel": [
        "暗い道ならまかせて",
        "暗い道ならとなりに来て",
        "明るい場所はそっちが案内して"
      ],
      "minigame_great": [
        "いますごく光って見えた",
        "お祝いでちょっと光りすぎた",
        "得意げな顔まで照らしちゃった"
      ],
      "minigame_bad": [
        "暗くしてもう1回やる？",
        "明るさを少し落として休もう",
        "うつむいても見失わないよ"
      ]
    },
    "swamp_croc": {
      "play_with": [
        "……もう少しならいい",
        "……いやとは言ってない",
        "近くてもべつにいいけど"
      ],
      "medicine_cure": [
        "……くすりの瓶、片づけといた",
        "返事がいつもの声になったな",
        "……水、もう一杯いる?"
      ],
      "travel": [
        "水辺なら先いく",
        "足もと、滑るから……こっち",
        "置いていかない。歩くの遅いだけ"
      ],
      "minigame_great": [
        "……やるじゃん",
        "……もう一回なら見てもいい",
        "拍手?手が勝手に動いただけ"
      ],
      "minigame_bad": [
        "……見てた。惜しかったな",
        "……お茶。飲むなら",
        "落ちつくまで、ここにいる"
      ]
    },
    "gentle_gorilla": {
      "play_with": [
        "ちからぬくね。そっとね",
        "今日は指一本で遊ぶね。力が余るから",
        "くすぐる力、これくらい?"
      ],
      "medicine_cure": [
        "よかった。ほんとによかった",
        "嬉しい声、大きくならないようにするね",
        "水のコップ、そっと置いたよ"
      ],
      "travel": [
        "荷物ぜんぶもつよ",
        "荷物より花を踏まないのが大変",
        "道がせまいから後ろを歩くね"
      ],
      "minigame_great": [
        "すごい!…大声になっちゃった",
        "小声で言うね。すごい!",
        "拍手、そっとでも聞こえるかな"
      ],
      "minigame_bad": [
        "だいじょうぶ。手つなぐ？",
        "力の抜き方なら一緒に練習できる",
        "くやしいね。何も言わずそばにいるね"
      ]
    },
    "knitting_spider": {
      "play_with": [
        "動かないで。いま糸ついた",
        "今の動き、糸がからまりそう",
        "おそろいを編むから、長さを測るね"
      ],
      "medicine_cure": [
        "元気祝いに何か編むね",
        "看病の合間にひざかけ編んだよ",
        "元気になった分、明るい糸にしよう"
      ],
      "travel": [
        "いい糸の場所ありそう",
        "寄り道した所を模様にしよう",
        "荷物の持ち手、補強しておいたよ"
      ],
      "minigame_great": [
        "記念の模様にしておく",
        "今の動きを模様にするのむずかしい",
        "お祝いの糸、何色がいい?"
      ],
      "minigame_bad": [
        "ほどいてやりなおせばいいよ",
        "ひと目ずつ戻せば大丈夫",
        "休憩のあいだ糸巻き持ってて"
      ]
    },
    "desert_scorpion": {
      "play_with": [
        "しっぽには気をつけて",
        "……しっぽはあっちに向ける",
        "そっちなら近くていい"
      ],
      "medicine_cure": [
        "……よかった",
        "……水、ここ",
        "日かげをあけておいた"
      ],
      "travel": [
        "日陰側、こっち",
        "……休憩はこっち",
        "砂が熱い。ここを通って"
      ],
      "minigame_great": [
        "……見事だった",
        "……さすが",
        "静かに見てた。ちゃんと全部"
      ],
      "minigame_bad": [
        "次はとなりでやる",
        "次も、日かげは取っておく",
        "座って。日かげ、あるから"
      ]
    },
    "oasis_cactus": {
      "play_with": [
        "近い近い。とげあるよ",
        "気持ちだけぎゅっとね",
        "少しあけて。近くにはいて"
      ],
      "medicine_cure": [
        "元気ならそれでいい",
        "心配だったのに、近づけなくてごめんね",
        "元気な顔、ここから見てる"
      ],
      "travel": [
        "水、忘れないで",
        "並んで歩く幅、これくらいでいい?",
        "水は分けて持とうね"
      ],
      "minigame_great": [
        "ハイタッチは……エアで",
        "拍手の気持ち、受けとって",
        "喜んで寄りすぎないようにしてる"
      ],
      "minigame_bad": [
        "落ちこんだらとなりに立ってる",
        "触れなくても応援はできるよ",
        "休むならこの距離で付きあうね"
      ]
    }
  };

  const PARTNER_CHARACTER_IDLE_LINES = {
    "cat_ceo": [
      "何もしない時間、予定に入れた",
      "休憩の延長、承認しようかな",
      "きみの用事なら先に聞く"
    ],
    "robot_neighbor": [
      "沈黙でも通信できている気がします",
      "この落ちつき、保存できませんか",
      "目があうと処理が少し遅れます"
    ],
    "field_cow": [
      "今日の草はまだ途中だよ",
      "のんびりの予定、あいてる?",
      "何もしないのも一緒なら長くできるねえ"
    ],
    "sunflower_partner": [
      "太陽ときみが逆方向で困る",
      "またそっちを見てた",
      "今日はまぶしくなくてもそばにいるね"
    ],
    "forest_bear": [
      "はちみつ、ふたりぶんあるよ",
      "ここなら大きな体でも座れるね",
      "眠くなったら寄りかかっていいよ"
    ],
    "grove_deer": [
      "……少し近づいてもいい?",
      "逃げなくなったの、気づいた?",
      "話さなくても平気になったね"
    ],
    "cliff_goat": [
      "あの上で休憩しない?",
      "近道を探して遠くまで来ちゃった",
      "次は階段がある所にしようか"
    ],
    "high_eagle": [
      "……隣、あいてる",
      "上からも見えてた",
      "今日はここでいい"
    ],
    "snow_spirit": [
      "きみの歩く速さ、覚えてる",
      "手が冷たくても近くにいたい",
      "季節の話、また聞かせて"
    ],
    "snowman": [
      "ここ、ちょうどいい日かげ",
      "顔がゆるむと形が心配",
      "あったかい話は短めでお願い"
    ],
    "rock_octopus": [
      "お茶と本と手、全部持てるよ",
      "空いた手だけで拍手してる",
      "片づけながらでも話は聞けるよ"
    ],
    "sea_mermaid": [
      "陸のただいま、言ってみたい",
      "道に名前があるのまだ不思議",
      "空の青は泳げないんだね"
    ],
    "anglerfish": [
      "灯りを落とすと話しやすいね",
      "顔を見られるとちょっとまぶしい",
      "暗い所ならこっちに来て"
    ],
    "swamp_croc": [
      "……来たなら座っていけば",
      "隣、あいてる。荷物はどかす",
      "……笑ってた?そりゃ、少しは"
    ],
    "gentle_gorilla": [
      "花の位置だけ先に確かめるね",
      "お茶のコップ、小さくて緊張する",
      "そっと座った。音、大きくなかった?"
    ],
    "knitting_spider": [
      "会話しながら二目すすんだ",
      "おそろいの長さ、まだ測ってる",
      "糸の端だけ持っててくれる?"
    ],
    "desert_scorpion": [
      "……水、いる?",
      "こっちが日かげ",
      "何もなくても隣にいる"
    ],
    "oasis_cactus": [
      "この距離でぎゅっとのつもり",
      "触らずに近くにいるの、上手になったね",
      "寄りたい気持ちだけ先に行く"
    ]
  };

  const COMPANION_CHARACTER_IDLE_LINES = {
    "cat_friend": [
      "呼んでも行かない。…帰るなら行く",
      "そこ、座ろうと思ってた",
      "目があっただけ。用はない"
    ],
    "rabbit_friend": [
      "先に行くね!ここで待ってる!",
      "走って戻るまでそこにいてね",
      "呼んだらすぐ振り返るよ"
    ],
    "tanuki": [
      "何も隠してないよ。たぶん",
      "だれかの足あと、ひとつ増やしといた",
      "知らない顔の練習してた"
    ],
    "squirrel": [
      "木の実の数がまた合わない",
      "落とした場所を覚えたはず…",
      "荷物の心配で足もと見てなかった"
    ],
    "owl": [
      "静かにしてても話は聞いてる",
      "見晴らしのいい所で考えてた",
      "月にも昼があるよ。夜だけの係じゃない"
    ],
    "otter": [
      "転がすのにちょうどいい石ない?",
      "石ひとつでずっと遊べる!",
      "石の名前、まだ決まらない"
    ],
    "hamster": [
      "ほっぺの中で迷子になった",
      "おやつの収納ならまかせて",
      "空いてるのは右のほっぺです"
    ],
    "panda": [
      "寝る場所から考えよう",
      "動かずにあそべないかな",
      "起きてるだけで参加したつもり"
    ],
    "monkey": [
      "今の顔、こう?",
      "同じ動きになっちゃった!",
      "まねする前から目があった!"
    ],
    "parrot": [
      "ねえねえ。…って誰が言った?",
      "おやつ!おやつ!今のは自分の声!",
      "聞いた言葉を預かってます"
    ],
    "sheep": [
      "寄りかかる席、あいてるよ",
      "ふわふわの中に何か入った?",
      "数えられるとこっちも眠くなる"
    ],
    "seal": [
      "転がったほうが早くない?",
      "止まる場所を先に決めたい",
      "ここからだと一回転で届く"
    ],
    "bat": [
      "逆さでも話は聞けるよ",
      "天井のほうが落ちつくんだ",
      "昼のあくびを、夜まで預かってる"
    ],
    "chicken": [
      "起きてる?点呼だけしておく!",
      "朝の練習、していい?",
      "小声の鳴き方、練習中"
    ],
    "penguin_friend": [
      "ここ、すべっていい?",
      "歩くよりおなかで行きたい",
      "止まるところだけ考えてる"
    ],
    "hedgehog": [
      "近づくの、少しずつでいい?",
      "びっくりしてない。まだ",
      "丸くなる準備だけしてる"
    ],
    "shiba": [
      "散歩の用事、まだない?",
      "ボール持って待ってる!",
      "となりを歩く係、やりたい!"
    ],
    "snail": [
      "先に行くね!まだここだけど",
      "忘れ物!…家、背中だった",
      "この葉っぱ、座り心地もいいね",
      "雨のにおい!窓はないけどわかる",
      "もう仲良しってことでいい?"
    ],
    "koala": [
      "集合までに一回寝ていい?",
      "ゆっくり来たらまた眠い",
      "返事を考える間に眠りそう"
    ],
    "punyu": [
      "形が決まるまで待って",
      "座ると広がっちゃう",
      "今日はちょっと丸くいたい"
    ],
    "sekizou": [
      "……さっきより近い?",
      "動いてないところを見てて",
      "ここにいたことにしておこう"
    ],
    "chameleon": [
      "目立たない色で目立ってみる",
      "サングラスの下で目があった?",
      "背景と少しかぶっちゃった"
    ],
    "kinoko": [
      "きのうの話?根はないけど",
      "座る前からここに生えてた",
      "傘は貸せないんだ"
    ],
    "clock": [
      "ぴったり遅れてきたよ",
      "秒針だけ先に帰った",
      "今?だいたいこのへん",
      "きのうの音が、ひとつ残ってる",
      "待ってたよ。何時からかは忘れた"
    ],
    "unicorn": [
      "道に迷った顔ではないよ",
      "角の向きだけ気をつけるね",
      "きらきらしててもひまはある"
    ],
    "many_tail_fox": [
      "しっぽ、何本だった?",
      "数え終わるまで待ってあげる",
      "見てないしっぽが一本あるかも"
    ],
    "watcher": [
      "……気づいた?",
      "見てない間もいたよ",
      "目があうまでここにいる"
    ],
    "box": [
      "……ただのはこです",
      "中の話はまだしません",
      "置いてあっても参加してる"
    ]
  };

  const COMPANION_DAILY_REACTIONS = {
    "cat_friend": {
      "feed": [
        "味見は呼ばれなくても行く"
      ],
      "play_with": [
        "もうやめる?…もう一回だけ"
      ],
      "travel": [
        "先に行って。ついてくか考える"
      ],
      "minigame_great": [
        "たまたま見てた。よかったね"
      ],
      "minigame_bad": [
        "そばで寝てるからまたやって"
      ]
    },
    "rabbit_friend": {
      "feed": [
        "食べたらひと走りしよう!"
      ],
      "play_with": [
        "追いかける?先に走っちゃう!"
      ],
      "travel": [
        "少し先で待ってるね!"
      ],
      "minigame_great": [
        "嬉しくて一周しちゃった!"
      ],
      "minigame_bad": [
        "一回走って気分かえよう!"
      ]
    },
    "tanuki": {
      "feed": [
        "おやつの場所?知らないなあ"
      ],
      "play_with": [
        "その動き、あとでこっそり真似しよ"
      ],
      "travel": [
        "寄り道の場所はまだ秘密"
      ],
      "minigame_great": [
        "応援してたの、内緒ね"
      ],
      "minigame_bad": [
        "負けを隠す穴、掘っとく?"
      ]
    },
    "squirrel": {
      "feed": [
        "ひとつ持ち帰るつもりが落とした!"
      ],
      "play_with": [
        "はしゃいだら木の実がこぼれた!"
      ],
      "travel": [
        "荷物、落ちてたら教えて!"
      ],
      "minigame_great": [
        "拍手したら木の実ぜんぶ落ちた!"
      ],
      "minigame_bad": [
        "一個ずつ拾えば戻るよ!"
      ]
    },
    "owl": {
      "feed": [
        "知識もごはんも、よく噛むのが大事"
      ],
      "play_with": [
        "今の動き、よく見てたよ"
      ],
      "travel": [
        "上から道を確認してみよう"
      ],
      "minigame_great": [
        "最後の判断、よかったね"
      ],
      "minigame_bad": [
        "次は最初の動きを見直そう"
      ]
    },
    "otter": {
      "feed": [
        "食べ終わったら石で遊ぼ!"
      ],
      "play_with": [
        "水たまり、少しだけすべり台にした！"
      ],
      "travel": [
        "転がせそうな坂さがしてる!"
      ],
      "minigame_great": [
        "記念にとっておきの石あげる!"
      ],
      "minigame_bad": [
        "一回石ころ転がして休もう!"
      ]
    },
    "hamster": {
      "feed": [
        "持ち帰る場所ならここにある!"
      ],
      "play_with": [
        "笑ったらおやつが出ちゃう!"
      ],
      "travel": [
        "荷物はほっぺのぶんだけ!"
      ],
      "minigame_great": [
        "お祝いしたいけど口がいっぱい!"
      ],
      "minigame_bad": [
        "休憩のおやつ、ほっぺにあるよ"
      ]
    },
    "panda": {
      "feed": [
        "食べたらここで寝ていい?"
      ],
      "play_with": [
        "座ったままで参加するね"
      ],
      "travel": [
        "休憩所に到着したつもり"
      ],
      "minigame_great": [
        "拍手は気持ちでしてるよ"
      ],
      "minigame_bad": [
        "寝て起きたらまた考えよう"
      ]
    },
    "monkey": {
      "feed": [
        "同じ顔で食べてみる!"
      ],
      "play_with": [
        "今の動き、もう覚えた!"
      ],
      "travel": [
        "歩き方までまねしちゃう!"
      ],
      "minigame_great": [
        "勝った顔、まねしていい?"
      ],
      "minigame_bad": [
        "悔しい顔、まねはやめとくね"
      ]
    },
    "parrot": {
      "feed": [
        "ごはん!…呼ぶ係、もうやった?"
      ],
      "play_with": [
        "もう一回!もう一回!"
      ],
      "travel": [
        "到着!全員に伝えとく!"
      ],
      "minigame_great": [
        "すごい!…今度は自分の感想!"
      ],
      "minigame_bad": [
        "どんまいは小声で言うね"
      ]
    },
    "sheep": {
      "feed": [
        "食べたらふわふわ休憩しよ"
      ],
      "play_with": [
        "はねるとふわふわが遅れて来る"
      ],
      "travel": [
        "休憩の枕ならここにいるよ"
      ],
      "minigame_great": [
        "拍手のかわりにふわっとはねた!"
      ],
      "minigame_bad": [
        "疲れたら寄りかかっていいよ"
      ]
    },
    "seal": {
      "feed": [
        "食べたらころがりにくそう!"
      ],
      "play_with": [
        "止まるまで待ってて!"
      ],
      "travel": [
        "坂道は帰りが大変そう"
      ],
      "minigame_great": [
        "嬉しくてころがりすぎた!"
      ],
      "minigame_bad": [
        "一回ごろっとしよう"
      ]
    },
    "bat": {
      "feed": [
        "逆さで食べるのはやめとく"
      ],
      "play_with": [
        "揺れたらこっちも揺れた"
      ],
      "travel": [
        "ぶら下がる場所、さがそう"
      ],
      "minigame_great": [
        "逆さで見てもすごかった!"
      ],
      "minigame_bad": [
        "向きを変えて見てみようか"
      ]
    },
    "chicken": {
      "feed": [
        "ごはんの合図ならまかせて!"
      ],
      "play_with": [
        "声だけ先にはしゃいだ!"
      ],
      "travel": [
        "到着の合図、鳴いていい?"
      ],
      "minigame_great": [
        "お祝いの声、大きすぎた?"
      ],
      "minigame_bad": [
        "小声で応援しなおすね"
      ]
    },
    "penguin_friend": {
      "feed": [
        "食べたらおなかがすべらないかも"
      ],
      "play_with": [
        "すべって参加!…止めて!"
      ],
      "travel": [
        "道のすべり具合、確認するね"
      ],
      "minigame_great": [
        "拍手しながらすべっちゃった!"
      ],
      "minigame_bad": [
        "一回すべって気分かえよ"
      ]
    },
    "hedgehog": {
      "feed": [
        "いいにおいで顔だけ出ちゃった"
      ],
      "play_with": [
        "驚く前に知らせてね!"
      ],
      "travel": [
        "初めての道、ゆっくり行こう"
      ],
      "minigame_great": [
        "びっくりして丸いまま拍手!"
      ],
      "minigame_bad": [
        "ここなら丸くなって休めるよ"
      ]
    },
    "shiba": {
      "feed": [
        "ごはんのあとはボールね!"
      ],
      "play_with": [
        "投げるまで待てる。たぶん!"
      ],
      "travel": [
        "となりの歩幅、覚えたよ!"
      ],
      "minigame_great": [
        "嬉しいからボール持ってきた!"
      ],
      "minigame_bad": [
        "ボールだけ置いていくね"
      ]
    },
    "snail": {
      "feed": [
        "次のおやつも決めとこう!",
        "葉っぱのお皿、最後に食べていい?"
      ],
      "play_with": [
        "かくれんぼ?もう殻に入った!",
        "その遊び、名前から決めたい!"
      ],
      "travel": [
        "出発は誰より早かったんだよ",
        "この道、雨の日にも来てみたい"
      ],
      "minigame_great": [
        "すごい!つのまでピンとした!",
        "もう一回!今度は応援も間に合わせる!"
      ],
      "minigame_bad": [
        "ここにいるよ。殻のとなり、座る?",
        "次の作戦、もう三つ考えた!"
      ]
    },
    "koala": {
      "feed": [
        "食べるのもゆっくりでいい?"
      ],
      "play_with": [
        "動くまで少し待ってね"
      ],
      "travel": [
        "着いた?まだ途中でも休もう"
      ],
      "minigame_great": [
        "見てたよ。目は細いけど"
      ],
      "minigame_bad": [
        "次を急がないのもいいよね"
      ]
    },
    "punyu": {
      "feed": [
        "食べたぶんだけ広がった"
      ],
      "play_with": [
        "はしゃぐと形が戻らない"
      ],
      "travel": [
        "荷物より形を保つのが大変"
      ],
      "minigame_great": [
        "喜びが横に広がっちゃった"
      ],
      "minigame_bad": [
        "落ちこんだら平たくなっちゃった"
      ]
    },
    "sekizou": {
      "feed": [
        "見てない間にひとくち"
      ],
      "play_with": [
        "……参加してるよ"
      ],
      "travel": [
        "振り返ったらそこにいる"
      ],
      "minigame_great": [
        "……見てた"
      ],
      "minigame_bad": [
        "……台座ごと反省中"
      ]
    },
    "chameleon": {
      "feed": [
        "おやつの色には負けた"
      ],
      "play_with": [
        "はしゃぐと色が落ちつかない"
      ],
      "travel": [
        "ここの背景、合わせがいがある"
      ],
      "minigame_great": [
        "お祝いの色に着替えよう"
      ],
      "minigame_bad": [
        "休憩色にしておくね"
      ]
    },
    "kinoko": {
      "feed": [
        "それは食べていい。こっちは話し相手"
      ],
      "play_with": [
        "足の使い方、まだ慣れない"
      ],
      "travel": [
        "根を張る前に出発しよう"
      ],
      "minigame_great": [
        "お祝いの胞子は控えとく"
      ],
      "minigame_bad": [
        "日かげで作戦たてよう"
      ]
    },
    "clock": {
      "feed": [
        "おやつに時計は合わせてある",
        "このにおい、前のおやつと同じだ"
      ],
      "play_with": [
        "もう一回?じゃあ針は見ないでおく",
        "楽しいと秒針だけ忙しいね"
      ],
      "travel": [
        "出発時刻?着いてから決めよう",
        "ここ、待ち合わせにちょうどよさそう"
      ],
      "minigame_great": [
        "拍手の時間だね。ここは遅れない",
        "今の一秒、覚えておこう"
      ],
      "minigame_bad": [
        "休憩はきっちり計らなくていいよ",
        "まだ終わりのベルは鳴らしてないよ"
      ]
    },
    "unicorn": {
      "feed": [
        "おやつの列には普通に並ぶよ"
      ],
      "play_with": [
        "角の距離だけあけて遊ぼう"
      ],
      "travel": [
        "迷ってるけど堂々と行くね"
      ],
      "minigame_great": [
        "きらきらを分けてお祝いするよ"
      ],
      "minigame_bad": [
        "輝いてなくても隣にいるよ"
      ]
    },
    "many_tail_fox": {
      "feed": [
        "分ける数、しっぽで数えないでね"
      ],
      "play_with": [
        "つかまえるしっぽ、どれ?"
      ],
      "travel": [
        "最後尾はしっぽに任せよう"
      ],
      "minigame_great": [
        "しっぽが勝手にお祝いしてる"
      ],
      "minigame_bad": [
        "しっぽの陰で休んでいく?"
      ]
    },
    "watcher": {
      "feed": [
        "……食べるところ、見てていい?"
      ],
      "play_with": [
        "……よく動くね"
      ],
      "travel": [
        "……もう着いてたよ"
      ],
      "minigame_great": [
        "……全部見てた"
      ],
      "minigame_bad": [
        "……見なかったことにする"
      ]
    },
    "box": {
      "feed": [
        "……おやつなら入れていいよ"
      ],
      "play_with": [
        "……ゆするのは少しだけ"
      ],
      "travel": [
        "……荷物と一緒にどうぞ"
      ],
      "minigame_great": [
        "……中で拍手してる"
      ],
      "minigame_bad": [
        "……休む場所なら空いてる"
      ]
    }
  };

  function partnerDailyLine(eventKey, ctx) {
    if (!state.partner) return null;
    const lines = PARTNER_DAILY_REACTIONS[state.partner.id]?.[eventKey];
    return pickCharacterConversationLine(lines, CONVERSATION_POOLS[eventKey]?.partner, ctx || {});
  }

  function speakEvent(eventKey, ctx = {}) {
    const pool = CONVERSATION_POOLS[eventKey];
    if (!pool) return;
    clearConversationTimers();
    const beats = [];
    const petLine = ctx.petText || pickConversationLine(pool.pet, ctx);
    if (petLine) {
      if (ctx.petText) {
        recentConversationLines.push(petLine);
        if (recentConversationLines.length > 24) recentConversationLines.shift();
      }
      beats.push({ speaker: petSpeaker(), text: petLine });
    }
    if (state.partner && pool.partner && Math.random() < (ctx.partnerChance ?? 0.6)) {
      const ps = partnerSpeaker();
      // 成立・結婚の固有セリフは、必ず恋人の吹き出しへ。
      const relationshipKey = eventKey === 'partner_new' ? 'court' : eventKey === 'marriage' ? 'marriage' : null;
      const relationshipLine = PARTNER_RELATIONSHIP_LINES[state.partner.id]?.[relationshipKey];
      const line = relationshipLine || partnerDailyLine(eventKey, ctx);
      if (ps && line) beats.push({ speaker: ps, text: line });
    }
    if (state.companions.length && pool.companion && Math.random() < (ctx.companionChance ?? 0.55)) {
      const cs = companionSpeaker();
      const line = pickCharacterConversationLine(COMPANION_DAILY_REACTIONS[cs?.id]?.[eventKey], pool.companion, ctx);
      if (cs && line) beats.push({ speaker: cs, text: line });
    }
    // いるキャラが次々しゃべるテンポを優先。本人→恋人→仲間だけで終わらず、
    // 複数キャラがいる場面では最後に本人がもう一言返して「掛け合い」にする。
    if (beats.length >= 2 && Math.random() < 0.82) {
      const followUps = {
        "feed": [
          "いや、これはぼくの!",
          "あと一口だけ!",
          "食べものの恨みはこわいぞ笑",
          "食べながら相談はむずかしい",
          "最後のひとくちだけ会議させて",
          "おかわりって言った?まだ言ってない?"
        ],
        "overfeed": [
          "いま笑った?",
          "もう食べものの話しないで!",
          "明日から本気だすって!",
          "うなずくのも少し待って",
          "満腹には休憩がついてくる",
          "横になる向き、検討中"
        ],
        "sleep": [
          "もうしゃべらない…ねる…",
          "おやすみって何回いうの笑",
          "電気けして〜",
          "最後の返事は枕がします",
          "続きは夢の受付で",
          "おやすみのあとに用事ふやさないで"
        ],
        "wake": [
          "起きたってば!",
          "朝から元気すぎ笑",
          "あと3分だけはだめ?",
          "中身はあとから起きてくる",
          "寝ぐせも今日のメンバーです",
          "まぶたと交渉が終わった"
        ],
        "clean": [
          "ほめていいよ!",
          "今日はできる子なので",
          "この状態を何分キープできるかな",
          "今だけ床を自慢させて",
          "探し物、片づけたらふえたかも",
          "きれいなうちに写真とろう"
        ],
        "medicine_cure": [
          "まずかったけど勝った!",
          "もう薬はしばらく見たくない",
          "元気になったからあそぼ!",
          "元気はあるけど苦い顔です",
          "薬のふた、もう閉めていい?",
          "お礼は苦くない声でいうね"
        ],
        "medicine_wrong": [
          "だから元気だって!",
          "薬しまって!",
          "その手に持ってるのこわい笑",
          "元気の証明、どうすればいい?",
          "おやつとの取り違えでは?",
          "その相談、飲む前にしたかった"
        ],
        "play_with": [
          "まだやる!",
          "次ぼくの番!",
          "ちょっと本気だす!",
          "笑うほうの筋肉が忙しい",
          "顔が元の位置に戻らない",
          "休む予定をもう少し延ばす"
        ],
        "play_with_annoyed": [
          "ほんとに休憩!",
          "5分だけ放置して笑",
          "かまいすぎ警報です",
          "いったん背景になります",
          "楽しかったのは本当だからね",
          "休憩終わったらこっちから呼ぶ"
        ],
        "court": [
          "聞こえてた!?",
          "ちょっとみんな静かにして笑",
          "今いいところだから!",
          "照れてる間もこっち見てて",
          "好きの説明書、どこだろ",
          "顔だけ先に返事しないで"
        ],
        "court_fail": [
          "その話はもう終わり!",
          "見てた人全員忘れて!",
          "はい次の話題!",
          "その優しさで余計に赤くなる",
          "話題の引っ越しをお願いします",
          "次の話、天気とかでいい?"
        ],
        "age": [
          "まあ中身はいつものぼくだけどね",
          "誕生日ってことで何かちょうだい?",
          "今日は主役でいい?",
          "{age}さいの名札、いまつけた",
          "ろうそくの数よりケーキの大きさ",
          "主役の仕事は食べることでいい?"
        ],
        "sodachi": [
          "中身は少しずつ育つ予定です",
          "見た目じゃわからない成長もあるよ",
          "ほめられたぶん自信も増えた",
          "忘れないうちにもう一回やってみる",
          "次に覚えることはおやつのあとで",
          "急がずここまで来たんだね"
        ],
        "money": [
          "これはぼくの資産です",
          "使わないよ。たぶん",
          "とりあえず数えよ!",
          "音だけならみんなに分ける",
          "予算よりほしい物が多い",
          "貯金って数えるだけでも楽しいね"
        ],
        "travel": [
          "まずごはん!",
          "迷子にはならない。たぶん",
          "全部みたい!",
          "集合場所を忘れる前にメモしよ",
          "帰りのぼくに道はまかせた",
          "寄り道にも寄り道したい"
        ],
        "transform": [
          "見すぎ見すぎ笑",
          "写真とっとこ!",
          "声まで変わってないよね?",
          "まだこっちも見慣れてないから",
          "反応が一周するまで待つね",
          "呼ばれたら返事はいつもどおり"
        ],
        "partner_new": [
          "にやけてないし!",
          "今日はちょっと浮かれていい?",
          "みんな、今だけ空気よんで笑",
          "にやけた分だけ頬が疲れた",
          "何をするにもふたりで相談できる?",
          "嬉しい顔の片づけ方がわからない"
        ],
        "marriage": [
          "なんか急に照れてきた",
          "今日から家族会議する?",
          "ほんとに夫婦なんだなぁ",
          "家族会議のおやつは必要です",
          "ただいまの練習、もうしていい?",
          "大事な日は普通の顔がむずかしい"
        ],
        "minigame_great": [
          "もう1回ほめて!",
          "録画してた!?",
          "いまのは保存版です",
          "ほめられ待ちの顔、まだできる",
          "勝った手を少し休ませる",
          "もう一回は緊張するんだけど"
        ],
        "minigame_bad": [
          "次は勝つ!",
          "いまのはノーカウント!",
          "見なかったことにして!",
          "くやしい顔だけ長引いてる",
          "作戦会議は座ってやろう",
          "負けた分だけ次の話が長い"
        ]
      };
      const line = pickConversationLine(followUps[eventKey], ctx);
      if (line) beats.push({ speaker: petSpeaker(), text: line });
    }
    playConversationBeats(beats, eventKey);
  }

  function playConversationBeats(beats, event = 'idle') {
    clearConversationTimers();
    hideSpeechBubble();
    const visibleBeats = beats.filter((beat) => beat.speaker && beat.text).slice(0, 4);
    // 掛け合いが終わるまでは放置会話などに上書きさせない。
    conversationBusyUntil = Date.now() + Math.max(SPEECH_DURATION_MS, ((visibleBeats.length - 1) * SPEECH_DURATION_MS) + SPEECH_DURATION_MS);
    visibleBeats.forEach((beat, i) => {
      const listener = beat.speaker.kind === 'pet'
        ? (event === 'play_with' ? visibleBeats.find(b=>b.speaker.kind === 'companion')?.speaker
          : ['court','partner_new','marriage'].includes(event) ? visibleBeats.find(b=>b.speaker.kind === 'partner')?.speaker : null)
        : petSpeaker();
      conversationTimers.push(setTimeout(() => setSpeechBubble(beat.text, beat.speaker, {event,listener}), i * SPEECH_DURATION_MS));
    });
  }

  function celebrateAgeSpeech(age, stageLabel) {
    speakEvent('age', { age, stageLabel, partnerChance: 0.8, companionChance: 0.75 });
  }

  const PARTNER_IDLE_LINES = [
    "いっしょにいるとおちつくね",
    "気づいたらまたとなりにいるね",
    "つぎはどこへいこうか?",
    "ちゃんとこっちもみてる?",
    "なんでもないじかんもすき",
    "またデートしようね",
    "きょうなんかいいかおしてる",
    "あとでちょっとさんぽしない?",
    "いまのじかん、けっこうすき",
    "さいきんちゃんとわらってる?",
    "カレーたべたいな",
    "あのくも、なんかいぬっぽい",
    "ねえ、ちょっとこっちきて",
    "いま目あったよね?",
    "手、あいてるけど?",
    "今日もすき。はい、報告おわり",
    "ちょっとくっついていい?",
    "近い?まあいいか",
    "その顔ずるくない?",
    "ふたりでおつかい、遠回りつきで",
    "さっきからちょっとかわいいんだけど",
    "いまならぎゅーしても怒られない気がする",
    "冷蔵庫あけたら何か人生かわるかな",
    "ねえ、くだらない話しよ",
    "急に旅行いく?",
    "今日の晩ごはん会議しよ",
    "となりの席、なんとなく空けといた",
    "同じとこで笑ったね",
    "話すこと忘れた。もう少しここにいる",
    "用事なくても呼んでいい?",
    "黙ってても返事してる感じするね",
    "おやつを半分にする練習しよ",
    "どこ行くか決める前に座ろう",
    "そのあくび、こっちに移った",
    "話の途中でお茶が冷めたね",
    "一緒にいるとひとりごと減るね",
    "次の休憩もとなりでいい?",
    "お茶いれる?相談だけ先にしよ",
    "何もしてない写真、撮ってみる?",
    "手持ちぶさたを分けようか",
    "呼んでみただけ。もう一回呼ぼうかな",
    "おやつの最後のひとつ、会議しよう",
    "まばたきのタイミング合ったね",
    "今の静けさ、けっこう好き",
    "目があったから用事を考えてる",
    "今日の予定にぼんやりを足そう",
    "となりに来る理由、なくてもいいよ",
    "なんとなく同じ方を見ちゃう",
    "お茶が冷めるまで一緒に休も",
    "おかえりの練習、してみる?"
  ];
  const COMPANION_IDLE_LINES = [
    "いっしょにあそぼう!",
    "ここけっこうすき!",
    "きょうもげんき?",
    "なんかおもしろいことない?",
    "きょうはここにいるね",
    "ちょっとじゃれたい!",
    "おなかすいたー",
    "つぎなにする?",
    "ぼくここみはってるね",
    "いまなんかうごいた!",
    "ひなたぼっこしたい",
    "さっきのおとなに?",
    "ぼくのこと忘れてない?",
    "ねえねえねえねえ!",
    "散歩の予定、足していい?",
    "なんか食べよう!",
    "こっちにも話の続きをちょうだい!",
    "ぼくもまぜて!",
    "いまひま!すごくひま!",
    "何か事件おきないかな",
    "さっきからずっと見てるよ",
    "今日のぼく、ちょっとかわいくない?",
    "とりあえずはねとく!",
    "会議しよう。議題はおやつ",
    "点呼!…全員いる?",
    "おやつの袋の音は聞き逃さない!",
    "ひまの長さなら負けない!",
    "いま何人でぼんやりしてる?",
    "先頭と最後尾、交代しよう!",
    "話す順番じゃんけんで決める?",
    "寄り道の練習してた!",
    "呼んでない?でも来た!",
    "集合場所から動いてません!",
    "静かにする係、むずかしい!",
    "遊びを考える遊び、しよ!",
    "写真の端、あけといて!",
    "あっちを見たらこっちが気になる!",
    "みんなの分のひまがある!",
    "何もしない競争なら今すぐ!",
    "おやつの話だけ聞こえた!",
    "一歩ずつ動く遊び、やってみる?",
    "今日も参加賞ほしい!",
    "誰かと目があうまで待ってる!",
    "予定がない人、集合!",
    "拍手の練習だけできてる!",
    "足音を合わせたら楽しいかな?",
    "笑ってる理由、あとで教えて!"
  ];

  // flavor beats sprinkled across a play session, reacting to whatever
  // just happened (a fresh evolution, a devolution, a 変身, a great or
  // terrible minigame score, an illness beaten, overeating, cleanup) -
  // see checkStoryEvents() for exactly when each pool is eligible
  // chance that a qualifying moment (an evolution, a great minigame score,
  // ...) actually pops a flash at all - keeps it feeling like a fun surprise
  // rather than a guaranteed interruption on every single occurrence
  const STORY_EVENT_CHANCE = 0.45;

  // one flavor line is rolled from the matching pool each time its context
  // happens, so unlike the old one-time-ever milestones these can repeat -
  // with 4-6 humorous takes per pool that's still a lot of variety, and it
  // means the game keeps reacting to what's actually going on instead of
  // going quiet after every pool is used up once
  const STORY_EVENT_POOLS = {
    "feed": [
      { "emoji": "🍚", "message": "ひと口目を、いつもよりゆっくり味わっていた" },
      { "emoji": "🥢", "message": "食べ終わって、お皿をそっとよせた" },
      { "emoji": "😋", "message": "いちばんおいしいところを、最後までとっておいた" },
      { "emoji": "🍽️", "message": "食べながら、窓の外をぼんやりながめていた" },
      { "emoji": "🫶", "message": "ごちそうさま、と小さくつぶやいた" }
    ],
    "pet": [
      { "emoji": "🤗", "message": "なでられて、目を細めた" },
      { "emoji": "🎈", "message": "はしゃぎすぎて、ちょっとつまずいた" },
      { "emoji": "🐾", "message": "遊んだあと、そっとよりそってきた" },
      { "emoji": "😆", "message": "くすぐったそうに、ころんと寝ころがった" },
      { "emoji": "💭", "message": "遊びの途中で、ふと何かを思い出したような顔をした" }
    ],
    "travel": [
      { "emoji": "🧳", "message": "旅先のにおいを、すんすんとかいでいた" },
      { "emoji": "📷", "message": "きれいな景色を見て、しばらく立ちどまっていた" },
      { "emoji": "🗺️", "message": "道に迷いかけたけれど、すぐに行き先を見つけた" },
      { "emoji": "🍡", "message": "旅先のおやつを、ひとつだけ買ってみた" },
      { "emoji": "🌄", "message": "旅の終わりに、おうちのことを少し考えていた" }
    ],
    "court": [
      { "emoji": "💐", "message": "花をわたしたあと、照れてそっぽを向いた" },
      { "emoji": "💌", "message": "うまく言えなかったけれど、気持ちは伝わったみたいだ" },
      { "emoji": "🌙", "message": "ふたりでしばらく、同じ空を見ていた" },
      { "emoji": "🎶", "message": "帰り道、小さく鼻歌を歌っていた" }
    ],
    "wake": [
      { "emoji": "🌅", "message": "目をこすって、大きくのびをした" },
      { "emoji": "☕", "message": "起きぬけに、窓を開けて風を入れた" },
      { "emoji": "💤", "message": "夢の続きを、しばらく思い出そうとしていた" },
      { "emoji": "🐦", "message": "小鳥の声で、ごきげんに目が覚めた" }
    ],
    "evolve": [
      {
        "emoji": "📈",
        "message": "新しい姿で、いつもの場所に座ってみた"
      },
      {
        "emoji": "😲",
        "message": "鏡を見た。向こうもこちらを確かめていた"
      },
      {
        "emoji": "💫",
        "message": "昨日できなかった動きが、今日はすこしだけできた"
      },
      {
        "emoji": "🔔",
        "message": "新しい影を踏んでみた。ちゃんとついてきた"
      },
      {
        "emoji": "📏",
        "message": "姿がかわった。呼ばれる名前はいつもどおりだった"
      },
      {
        "emoji": "📈",
        "message": "いつものポーズをとってみた。少しだけ直した"
      },
      {
        "emoji": "😲",
        "message": "新しい姿に驚いて、挨拶するのを忘れた"
      },
      {
        "emoji": "💫",
        "message": "変わったところを探した。笑い方はそのままだった"
      },
      {
        "emoji": "🔔",
        "message": "ちょっと得意げにしたあと、照れて横を向いた"
      },
      {
        "emoji": "✨",
        "message": "いつもの場所で、今の姿に慣れるまで休んだ"
      }
    ],
    "devolve": [
      {
        "emoji": "🤏",
        "message": "さっきまでの勢いが、少しだけどこかへいった"
      },
      {
        "emoji": "👶",
        "message": "いつものことに手間どった。今日は急がないことにした"
      },
      {
        "emoji": "😴",
        "message": "今日はなんだか動きがゆっくり。早めに休みたそう"
      },
      {
        "emoji": "📉",
        "message": "そだちが少し下がった。姿はいつものままだった"
      },
      {
        "emoji": "🌀",
        "message": "やりかけのことを置いて、ひと息ついた"
      },
      {
        "emoji": "🤏",
        "message": "得意なことから始めようとして、まず座った"
      },
      {
        "emoji": "👶",
        "message": "元気なふりをやめたら、少し顔がゆるんだ"
      },
      {
        "emoji": "😴",
        "message": "今日は休むほうの予定を先にした"
      },
      {
        "emoji": "🍼",
        "message": "うまくいかない日も、いつもの場所は空いていた"
      }
    ],
    "transform": [
      {
        "emoji": "🌟",
        "message": "鏡のなかに、さっきまでとちがうなおとっちが立っている"
      },
      {
        "emoji": "🕺",
        "message": "新しいすがたをたしかめるように、くるっと一周してみた"
      },
      {
        "emoji": "👕",
        "message": "姿をかえた。おなかのすく時間はいつもどおりだった"
      },
      {
        "emoji": "🪞",
        "message": "新しい影に手を振ってみた。同時に振り返された"
      },
      {
        "emoji": "🎭",
        "message": "少し格好をつけてみた。すぐいつもの顔に戻った"
      },
      {
        "emoji": "🌟",
        "message": "呼ばれて振り向く速さだけは、前と同じだった"
      },
      {
        "emoji": "🕺",
        "message": "新しい姿でくつろぐ場所を、もう決めていた"
      },
      {
        "emoji": "✨",
        "message": "一度名乗ってみた。名前まで変える必要はなかった"
      }
    ],
    "minigame-great": [
      {
        "emoji": "🏆",
        "message": "終わったあと、ちょっとだけドヤ顔をかくせなかった"
      },
      {
        "emoji": "😎",
        "message": "結果を見たあと、口もとだけずっとゆるんでいる"
      },
      {
        "emoji": "📸",
        "message": "誰か見ていたか、結果より先にまわりを確かめた"
      },
      {
        "emoji": "🔥",
        "message": "終わってからも、勝ったポーズのままだった"
      },
      {
        "emoji": "🎉",
        "message": "もう一回やる前に、ほめられる時間を少しとった"
      }
    ],
    "minigame-bad": [
      {
        "emoji": "🙈",
        "message": "結果を見た。口を開きかけて、まずお茶にした"
      },
      {
        "emoji": "😵",
        "message": "考えていた作戦が、終わってからやっと並んだ"
      },
      {
        "emoji": "🌀",
        "message": "しばらく黙った。顔だけは反省会を続けていた"
      },
      {
        "emoji": "🫠",
        "message": "次の一回のことを考えながら、ひと休みした"
      }
    ],
    "medicine-cure": [
      {
        "emoji": "🕺",
        "message": "さっきまで丸まっていたのに、もう部屋をうろうろしている"
      },
      {
        "emoji": "😋",
        "message": "元気は戻った。苦い顔だけは少し長引いた"
      },
      {
        "emoji": "🎈",
        "message": "いつもの声で呼んだあと、安心してひと息ついた"
      },
      {
        "emoji": "💊",
        "message": "くすりを飲んだごほうびに、あとで何かねだりそう"
      }
    ],
    "overfeed": [
      {
        "emoji": "🫃",
        "message": "おなかがパンパン…しばらく動けない…"
      },
      {
        "emoji": "🍚",
        "message": "「もうむり」といいながら、まだおさらを見ている"
      },
      {
        "emoji": "🚨",
        "message": "おさらを見るだけで、さっき食べた量を思いだしてしまう"
      },
      {
        "emoji": "😵‍💫",
        "message": "食べるまえにもどれたら、ひとくちだけ減らしたい"
      }
    ],
    "poop-clean": [
      {
        "emoji": "✨",
        "message": "さっきまでのことはなかったことにしよう"
      },
      {
        "emoji": "🧹",
        "message": "床がちゃんと床にもどった!"
      },
      {
        "emoji": "😌",
        "message": "これでこころおきなくごろごろできる"
      },
      {
        "emoji": "🚿",
        "message": "空気までちょっとかるくなったきがする"
      },
      {
        "emoji": "🫡",
        "message": "見なかったことにするには、十分きれい"
      },
      {
        "emoji": "🧼",
        "message": "きれいになった床を、意味もなくもう一度見にきた"
      }
    ]
  };

  // なでる/はなしかける は毎回かならず1つ表示される軽いリアクション文 -
  // 通常のメッセージ欄に出すだけなので、STORY_EVENT_POOLSのような大きな
  // 演出やSTORY_EVENT_CHANCEの抽選は使わない
  // じゃれる時に吹き出しへ出す文は、すべて「なおとっち本人」の発言。
  // 観察者・ナレーター視点の文を混ぜない。
  const PET_REACTIONS = [
    "もっとじゃれて!",
    "これきもちいい!",
    "くすぐったいって笑",
    "もうちょっとそのまま!",
    "そこすき!",
    "あったかい手、いいね",
    "なんかねむくなってきた",
    "もう1かい!",
    "このままちょっとごろごろしよ",
    "いまかなりしあわせ",
    "ふわふわさわるのすき?",
    "もっとこっちきて!",
    "そのなで方、覚えておいて",
    "なでられる仕事なら続けられる",
    "手が止まると用事を思い出す",
    "そこそこ。位置をメモしとこう",
    "いまの手つき、次もお願い",
    "気持ちよくて、返事を忘れた",
    "動かないほうがいい気がする",
    "なでる係、交代しないで",
    "もう少しだけ置き物にして",
    "溶ける予定はなかったのに",
    "休憩ってこういうことか"
  ];

  const TALK_REACTIONS = [
    "きょうもげんきだよ!",
    "ねえ、ちゃんときいてる?",
    "ちょっときいて!",
    "こっちみて!",
    "ひとりごといってただけ!",
    "あそぼう!",
    "いまのことば、わかった?",
    "へんじのかわりにはねる!",
    "うんうん、それで?",
    "ないしょばなししよ",
    "だいすき!",
    "どうしたの?",
    "聞く顔だけ先に用意した",
    "返事のタイミング、今だった?",
    "話の途中で用事を忘れた",
    "続きが気になるから座る",
    "その話、あとでみんなにもして",
    "うなずきだけ少し多めです",
    "聞いてると口が休めるね",
    "声を聞くだけで目がこっち向く",
    "結論はおやつのあとでもいい?",
    "今日の話題にまだ空きがあります",
    "こっちも話したいことひとつある",
    "返事ははねるだけでもいい?",
    "今の話、覚えておく場所さがしてる",
    "前のめりで聞いてます",
    "自分の声ってどこまで届くの?"
  ];

  // なかまが そばに いる ときも、吹き出しの話者はなおとっち本人。
  const COMPANION_PET_REACTIONS = [
    "みんなもいっしょにじゃれよ!",
    "ねえ、みんなもこっちきて!",
    "みんなであそぶとたのしい!",
    "全員集合〜!",
    "全員で笑うとすごい音になるね",
    "順番にくると休むひまがない笑",
    "みんなの分のくすぐったさがある",
    "一列になって、順番にじゃれる?"
  ];

  const COMPANION_TALK_REACTIONS = [
    "みんなにもはなしかけよ!",
    "ねえ、みんなきいて!",
    "今日はずっとしゃべってたい笑",
    "この話はみんなにはひみつね!",
    "ごはんの話だけ全員こっち向くね",
    "ひとりずつ話したら夜になりそう",
    "聞く係と話す係、交代しよ",
    "秘密基地の合言葉から決めよう"
  ];

  const COMPANION_ANNOYED_REACTIONS = [
    "みんな、ちょっと休憩しよ!",
    "いったん全員しずかにしよ笑",
    "もうみんなでごろごろしよ",
    "全員いったん座って話そう",
    "おやつの相談だけ休憩中も可です",
    "静かになったらまた呼んで"
  ];

  // beyond this many なでる/はなしかける in a row (with no real care action
  // in between), the action flips from its normal small positive into an
  // annoyed negative instead - spamming either stops being free stats
  const AFFECTION_SPAM_THRESHOLD = 3;

  // おなじように、たびを 連続で おしすぎた ときも「たびづかれ」で 機嫌の
  // ボーナスが きえて 逆に すこし へる - 元気/満腹の コストと あわせて、
  // たびボタンを 連打するだけの ごうりつ機嫌かせぎに ならないようにする
  const TRAVEL_SPAM_THRESHOLD = 3;

  // おもちゃ を そうびしていると、じゃれる連打で いやがられるまでの
  // かいすうが ふえる
  function affectionSpamThreshold() {
    return AFFECTION_SPAM_THRESHOLD;
  }

  // らしんばん を そうびしていると、たびづかれに なるまで もう少し
  // 連続で たびに でられる
  function travelSpamThreshold() {
    return TRAVEL_SPAM_THRESHOLD;
  }

  const PET_ANNOYED_REACTIONS = [
    "もうなでなではじゅうぶん!",
    "ちょっとしつこいって笑",
    "その手いったんおしまい!",
    "ちょっと休ませて〜",
    "そろそろひとりにして!",
    "なですぎけいほう、はつれい!",
    "好きなのはわかったから笑",
    "距離感!距離感!",
    "なでる手にも休憩をあげて",
    "こっちの休憩時間、まだあります?",
    "気持ちよかった分だけ少し休む",
    "好きだけど一回止めて笑",
    "もう十分伝わったよ",
    "いまなら置くだけで大丈夫",
    "動く予定がもうなくなった",
    "なでられる係、交代したい",
    "ちょっと離れて見る時間にしよ",
    "最後の一回って何回目?"
  ];

  const TALK_ANNOYED_REACTIONS = [
    "もうちょっとしずかにして笑",
    "いまは返事しない!",
    "ふぅ〜…ちょっと休憩!",
    "話があふれそう。いったん待って!",
    "そろそろ無言タイムにしよ",
    "しゃべりすぎた〜",
    "次の話題は5分後で!",
    "口がつかれた笑",
    "返事を考える場所が満員です",
    "話題が渋滞してる",
    "聞く係もひと休み",
    "脳みそが少し席を外した",
    "好きな声でも休憩はいる笑",
    "話の荷物をいったん置こう",
    "次の話はお茶を飲んでから",
    "無言の会議を開こう"
  ];

  // せいべつ/ジェンダーと れんあいタイプ(だれに ひかれるか)は べつべつの
  // ぞくせい。ストレート・同性を対象とする タイプ・バイセクシャル・
  // パンセクシャル・アロマンティック・クエスチョニングは どれも 優劣の
  // ない、とくしゅな 属性としては あつかわない こせいとして 実装する
  // (ORIENTATION_WEIGHTS で 出現率には ゲームバランス上の ちがいを
  // つけているが、それは あくまで 出現頻度の はなしで、タイプそのものに
  // 優劣を つける ものでは ない)。ノンバイナリーに 限らず どのせいべつにも
  // どのれんあいタイプも 原則 わりあてられる(下の attractedToFor が
  // それぞれに ちゃんと いみのある あいて候補を かえす)
  // GENDERS/RESOLVED_ORIENTATIONS/ORIENTATION_ROLL_POOL は、loadState()
  // からも つかわれる ため、この ファイルの ずっと うえのほう(state を
  // ロールする ちょくぜん)で すでに 定義ずみ
  const GENDER_LABELS = { male: '男の子', female: '女の子', nonbinary: 'ノンバイナリー' };
  // gay は「同性を れんあい対象と する タイプ」を あらわす 1つの id
  // (抽選も 8%の 1本)で、この マップの 値は あくまで gender が
  // わからない ときの ひかえめな フォールバック。じっさいの 表示は
  // gender に あわせて 分ける orientationLabel() を つかう
  const ORIENTATION_LABELS = {
    straight: 'ストレート',
    gay: '同性を対象とするタイプ',
    bi: 'バイセクシャル',
    pan: 'パンセクシャル',
    aro: 'アロマンティック',
    questioning: 'クエスチョニング',
  };

  // gay id を もつ キャラの 表示ラベルは gender で わける:
  // 男の子→「ゲイ」、女の子→「レズビアン」。ノンバイナリーには
  // 「ゲイ」「レズビアン」「クィア」のような、本人が じぶんの アイデン
  // ティティとして 選びとる ことばを ゲーム側から 機械的に わりあてない
  // (「クィア」は とくに 自称として つかわれる ことばな ので、なおさら
  // 自動付与すべきでない)。かわりに、実際に 内部で 設定されている
  // 恋愛対象(gay id は gender に かんけいなく「じぶんと おなじ
  // ジェンダー」が 対象、という ランダム要素の ない きまった 意味な ので、
  // ここで あらためて 計算しなおしても 表示が ぶれない)を そのまま
  // 中立的に せつめいする 表記にする。gay いがいは これまでどおり
  // ORIENTATION_LABELS を そのまま つかう
  function orientationLabel(orientationId, gender) {
    if (orientationId === 'gay') {
      if (gender === 'male') return 'ゲイ';
      if (gender === 'female') return 'レズビアン';
      return '恋愛対象：同じジェンダー';
    }
    return ORIENTATION_LABELS[orientationId] || '???';
  }

  // gender+orientationId から「だれに ひかれるか」を くみたてる。
  // ストレートだけ「じぶんと ちがう せいべつ」の いみが gender ごとに
  // かわる(男の子↔女の子、ノンバイナリーは 男の子/女の子)ので gender で
  // わける。
  //
  // バイと パンは どちらも「1つの せいべつだけに かぎらない」タイプだが、
  // ゲーム内では かんがえかたを わけて あつかう:
  //   ・バイセクシャル: 「ふくすうの ジェンダーが 恋愛対象に なりうる」
  //     タイプ。どの くみあわせに ひかれるかは 人それぞれの こたいさで、
  //     男の子+女の子/男の子+ノンバイナリー/女の子+ノンバイナリーの
  //     2しゅるいの くみあわせは もちろん、3しゅるい ぜんぶが 対象になる
  //     こともある(「バイ=かならず2しゅるい」という きめうちには しない)。
  //     どの くみあわせに なっても、プロフィールの 表示は「バイセクシャル」
  //     の まま(内部の 対象しゅるいすうで 表示は かえない)
  //   ・パンセクシャル: ジェンダーそのものを 恋愛成立の せいげん条件に
  //     しない タイプ。バイと ちがい こたいさは なく、つねに ぜんジェンダー
  //     が むじょうけんに 対象に なる
  // クエスチョニングは まだ さがしている とちゅうで、とくてい の せいべつを
  // こていの 対象から はずさず ひろく ひらかれている(パンと おなじ 実装だが、
  // 「まだ さだまっていない」という べつの いみあいを もつ)。
  // アロマンティックは だれにも れんあい感情を もたない。gay(同性を
  // 対象と する タイプ)は gender に かんけいなく「じぶんと おなじ
  // せいべつの 人」が たいしょう ― ノンバイナリーの ばあいも おなじ
  // ロジックを つかう(むかしは ノンバイナリーだけ とくべつあつかいで
  // bi/pan/aro/questioning まで ぜんぶ「ノンバイナリー どうしのみ」に
  // まとめてしまう バグが あったので、gender による とくべつあつかいは
  // straight だけに かぎっている)
  function attractedToFor(gender, orientationId) {
    if (orientationId === 'aro') return [];
    if (orientationId === 'pan' || orientationId === 'questioning') return [...GENDERS];
    if (orientationId === 'bi') {
      const shuffled = [...GENDERS].sort(() => Math.random() - 0.5);
      // 2しゅるいの くみあわせを やや 多めに しつつ、3しゅるい ぜんぶが
      // 対象に なる こたいも ふつうに ありうる あつかいに する
      const count = Math.random() < 0.65 ? 2 : 3;
      return shuffled.slice(0, count).sort();
    }
    if (orientationId === 'straight') {
      if (gender === 'nonbinary') return ['male', 'female'];
      return gender === 'male' ? ['female'] : ['male'];
    }
    return [gender]; // gay(同性を対象とする タイプ)
  }

  // attractedTo は本来 identity の一部で、特に bi は個体ごとの対象範囲を
  // いちど決めたら、その人生のあいだ勝手に変わってはいけない。
  // そのためロード時は、bi だけ有効な保存値を優先し、それ以外は現在の定義から再構築する。
  function normalizeAttractedTo(gender, orientationId, savedTargets) {
    if (orientationId === 'bi') {
      const valid = Array.isArray(savedTargets)
        ? [...new Set(savedTargets)].filter((g) => GENDERS.includes(g)).sort()
        : [];
      if (valid.length >= 2) return valid.slice(0, 3);
    }
    return attractedToFor(gender, orientationId);
  }

  // たまごが かえる ときに、なおとっち じしんの せいべつ/れんあいタイプも
  // いっしょに きまる。man/woman ラインは 既存の せりふ(あかちゃんの
  // おんなのこ、など)に あわせて せいべつを こていし、それ以外の
  // ラインは GENDER_WEIGHTS に したがった 重みつき ランダム。れんあい
  // タイプも おなじく せいべつに かんけいなく ORIENTATION_WEIGHTS で
  // ロールする(げんじつ社会を ざっくり さんこうに した ひりつだが、
  // 少数派の タイプが ゲームの なかで 不自然に 出にくく ならないよう
  // ある程度 高めに たもってある)
  function rollIdentity(speciesLine) {
    let gender;
    if (speciesLine === 'man') gender = 'male';
    else if (speciesLine === 'woman') gender = 'female';
    else gender = weightedPick(GENDERS, GENDER_WEIGHTS);
    const orientationId = weightedPick(ORIENTATION_ROLL_POOL, ORIENTATION_WEIGHTS);
    return { gender, orientationId, attractedTo: attractedToFor(gender, orientationId) };
  }

  // クエスチョニングの あいだに「きゅうあいする」を おすたびに1つ
  // けいけんを つみ、いきの しきい値に とどくと べつの タイプに おちつく
  // (questioning 自身には もどらない)。しっぱい/友達あつかいの けっかでも、
  // いろんな あいてと であうこと じたいが けいけんに なる、という
  // かんがえかた。おちつく さきも ORIENTATION_WEIGHTS と おなじ ひりつの
  // 重みつき ランダム(RESOLVED_ORIENTATIONS は ORIENTATION_ROLL_POOL から
  // questioning を のぞいた ならびと おなじ じゅんばんな ので、対応する
  // 重みも 先頭から おなじ かず ぶん きりだせる)
  const QUESTIONING_RESOLVE_THRESHOLD = 4;
  const RESOLVED_ORIENTATION_WEIGHTS = ORIENTATION_WEIGHTS.slice(0, RESOLVED_ORIENTATIONS.length);

  // じぶんさがしの書 を そうびしていると、クエスチョニングが おちつくまでの
  // けいけん回数が 半分に なる(きりあげ)
  function questioningResolveThreshold() {
    return QUESTIONING_RESOLVE_THRESHOLD;
  }

  function checkQuestioningResolution() {
    if (state.orientationId !== 'questioning') return null;
    state.questioningEncounters = (state.questioningEncounters || 0) + 1;
    if (state.questioningEncounters < questioningResolveThreshold()) return null;
    const resolved = weightedPick(RESOLVED_ORIENTATIONS, RESOLVED_ORIENTATION_WEIGHTS);
    state.orientationId = resolved;
    // bi に落ち着いた場合も、ここで一度だけ個体ごとの対象範囲を決め、
    // 以後は state.attractedTo に保存して使い続ける。
    state.attractedTo = attractedToFor(state.gender, resolved);
    state.questioningEncounters = 0;

    // 恋愛タイプが確定した瞬間、既存の恋人との双方向相性も必ず再判定する。
    // 以前はここが抜けていて、questioning→gay/straight 等に変わったあとも
    // 対象外の恋人が通常カップル表示のまま残ることがあった。
    if (state.partner) {
      const partnerTargets = normalizeAttractedTo(
        state.partner.gender,
        state.partner.orientationId,
        state.partner.attractedTo
      );
      const compatible = state.attractedTo.includes(state.partner.gender)
        && partnerTargets.includes(state.gender);
      if (!compatible && !state.partner.mismatched) {
        state.partner.mismatched = true;
        state.partner.repair = 0;
        pushLifeLog('💔', `${state.partner.label}とすれちがいはじめた`);
      } else if (compatible && state.partner.mismatched) {
        state.partner.mismatched = false;
        state.partner.repair = 0;
        pushLifeLog('💞', `${state.partner.label}とまたきもちがかさなった`);
      }
    }
    return resolved;
  }

  // 「きゅうあいする」の おあいて候補を つくる ヘルパー。affinityTrait は
  // traitCounts の どのせいかく(やさしい/やんちゃ/おだやか/ゆうかん/
  // ロマンチック)を 積み重ねていると成功しやすいかで、null は せいかくに
  // 左右されない ニュートラルな あいて
  function courtCandidate({ id, label, emoji, gender, orientationId, affinityTrait = null }) {
    return { id, label, emoji, gender, orientationId, attractedTo: attractedToFor(gender, orientationId), affinityTrait };
  }

  // 「あいてコード」: サーバーも つうしんも つかわず、じぶんの なおとっちの
  // すがたを みじかい 文字れつに して ともだちに わたし、うけとった
  // がわが よみこむと「たびさきの おきゃくさん」として あらわれる。
  // GITHUB_PAGES の ような 静的サイトの ままでも できる、いちばん かるい
  // 「つうしん」の しくみ
  const GUEST_CODE_PREFIX = 'NAOTOCCHI1:';

  function encodeGuestCode() {
    const payload = {
      s: state.speciesLine,
      i: state.stageIndex,
      g: state.gender,
      o: state.orientationId,
      t: state.traitCounts,
    };
    return GUEST_CODE_PREFIX + btoa(encodeURIComponent(JSON.stringify(payload)));
  }

  // よみこんだ コードが こわれていたり、いたずらで へんな 値に
  // かきかえられていても、ゲームが こわれない よう ぜんぶ けんしょうする
  function decodeGuestCode(raw) {
    try {
      // 一部の アプリ(メッセージの リンク自動検出 など)は URIスキームっぽい
      // コードの プレフィックス部分だけを こぴー/ひょうじ 時に 小文字化する
      // ことが あるため、プレフィックスの ひかくは 大文字小文字を くべつしない
      const trimmed = raw.trim().replace(/^NAOTOCCHI1:/i, '');
      const payload = JSON.parse(decodeURIComponent(atob(trimmed)));
      if (!payload || typeof payload !== 'object') return null;
      if (!ALL_LINES.includes(payload.s)) return null;
      if (!Number.isInteger(payload.i) || payload.i < 0 || payload.i >= STAGES_PER_LINE) return null;
      if (!GENDERS.includes(payload.g)) return null;
      if (!ORIENTATION_ROLL_POOL.includes(payload.o)) return null;
      const traitCounts = {};
      Object.keys(TRAIT_LABELS).forEach((key) => {
        const v = payload.t && payload.t[key];
        traitCounts[key] = Number.isFinite(v) ? v : 0;
      });
      return {
        speciesLine: payload.s,
        stageIndex: payload.i,
        gender: payload.g,
        orientationId: payload.o,
        attractedTo: attractedToFor(payload.g, payload.o),
        traitCounts,
      };
    } catch (e) {
      return null;
    }
  }

  // ゲストの traitCounts から いちばん たかい せいかくを 1つ えらび、
  // その ひとの affinityTrait(すきな ところ)として あつかう。すべて 0
  // (よみこんだ ばかりで まだ なにも 選んでいない)なら ニュートラル
  function dominantTrait(traitCounts) {
    const entries = Object.entries(traitCounts);
    const max = Math.max(...entries.map(([, v]) => v));
    if (max <= 0) return null;
    const top = entries.filter(([, v]) => v === max);
    return top[Math.floor(Math.random() * top.length)][0];
  }

  function guestCandidate(guest) {
    const stage = SPECIES[guest.speciesLine].stages[guest.stageIndex];
    return {
      id: 'guest',
      label: `ともだちの${stage.label}`,
      emoji: stage.emoji,
      gender: guest.gender,
      orientationId: guest.orientationId,
      attractedTo: guest.attractedTo,
      affinityTrait: dominantTrait(guest.traitCounts),
    };
  }

  // 「うそつきしょうぶ」: 2人だけの 心理戦ミニゲーム。あいてコードと おなじく
  // サーバーを つかわず、コードの やりとり(3回)だけで あそべる。
  // A(かいとうしゃ)が 5つの 二択しつもんに ほんねで こたえ、しつもんごとに
  // 「本音で こうかいする」か「うそを つく(逆を こうかいする)」かを
  // A自身が えらぶ(うそは 1試合5問につき さいだい DUEL_LIE_BUDGET かい
  // までの「うそコイン」せいで、つかう義務は ない)。B(すいりしゃ)は
  // 5問ぶんの こうかいされた こたえを まとめて 見てから、それぞれが
  // 本音か うそかを すいりする。とくてんは 本音を めぐる こうぼう=1点、
  // うそを めぐる こうぼう=2点(ハイリスク・ハイリターン)で、5問の
  // ごうけいとくてんが 多い ほうが その試合の しょうり(どうてんなら
  // ひきわけで、かけきんの やりとりは なし)。
  // かけきんの けっさんは、Aと Bが それぞれ じぶんの たんまつで おなじ
  // しきを つかって けいさんする(どちらかが 一方的に けっかを きめて
  // つたえる かたちには しない)ので、コードを さきに つくった がわが
  // ゆうりに ならない こうへいな しくみに なっている
  const DUEL_TRAIT_LABELS = {
    cautious: '慎重派',
    active: '行動派',
    jealous: '嫉妬深い',
    romantic: 'ロマンチスト',
    secretive: '秘密主義',
    spoiled: '甘えん坊',
    myPace: 'マイペース',
    realist: '現実派',
  };

  // A(かいとうしゃ)が こうかいする こたえに そえられる、みじかい
  // ひとこと証言。人狼の「弁明」に ちかい えんしゅつ要素で、本音でも
  // ブラフでも 自由に つかってよい(せいかく分析には いっさい つかわない)。
  // スマホでの テンポを たもつため 定型文の タップせんたくのみ
  const DUEL_TESTIMONY_PRESETS = [
    { id: 'gachi', label: 'これはガチ' },
    { id: 'nocomment', label: 'ノーコメント笑' },
    { id: 'believe', label: '信じていいよ' },
    { id: 'guess', label: 'たぶん想像どおり' },
    { id: 'secret', label: 'ひみつ' },
    { id: 'dunno', label: 'さあ、どうかな〜?' },
  ];

  // category: しつもんの ジャンル(1試合の なかで おなじ ジャンルが
  // かたよりすぎない ように つかう)。weight: 1=かるい/2=ふつう/3=おもい
  // (1試合の なかで かるい話題と おもい話題が まざるように つかう)
  const DUEL_QUESTIONS = [
    // 【秘密・隠し事】
    { id: 'dq1', category: 'sec', weight: 2, emoji: '🤫', text: '恋人に言ってない秘密は?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ほぼない', traits: ['active'] } },
    { id: 'dq2', category: 'sec', weight: 2, emoji: '📓', text: '誰にも言ってない黒歴史は?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ほぼない', traits: ['active'] } },
    { id: 'dq3', category: 'sec', weight: 2, emoji: '🎭', text: '見せたくない自分は?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ほぼない', traits: ['active'] } },
    { id: 'dq4', category: 'sec', weight: 2, emoji: '⚰️', text: '墓場まで持っていきたい秘密は?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq5', category: 'sec', weight: 2, emoji: '🤥', text: '恋人にうそをついたことは?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq6', category: 'sec', weight: 2, emoji: '😶', text: '本当は嫌でも「いいよ」と言う?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq7', category: 'sec', weight: 2, emoji: '🎨', text: '好きなふりをした?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq8', category: 'sec', weight: 2, emoji: '💭', text: '好きでもない人と付き合った?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq9', category: 'sec', weight: 2, emoji: '🌫️', text: '「好き」と言いながら迷った?', a: { label: 'ある', traits: ['secretive', 'cautious'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq10', category: 'sec', weight: 2, emoji: '🎪', text: '趣味や好みを偽った?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq11', category: 'sec', weight: 2, emoji: '🎈', text: '話を盛ったことは?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq12', category: 'sec', weight: 2, emoji: '🛍️', text: '言えない買い物は?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq13', category: 'sec', weight: 2, emoji: '🚶', text: '言わずに誰かと会った?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq14', category: 'sec', weight: 2, emoji: '🎭', text: '本音と建前は?', a: { label: 'かなり使い分ける', traits: ['secretive'] }, b: { label: 'ほぼ使い分けない', traits: ['active'] } },
    { id: 'dq15', category: 'sec', weight: 2, emoji: '🔒', text: '知られたくない過去は?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    // 【スマホ・SNS】
    { id: 'dq16', category: 'sns', weight: 2, emoji: '🔍', text: '検索履歴は?', a: { label: '全部見せられる', traits: ['active'] }, b: { label: '絶対見せたくない', traits: ['secretive'] } },
    { id: 'dq17', category: 'sns', weight: 2, emoji: '🖼️', text: '写真フォルダは?', a: { label: '全部見せられる', traits: ['active'] }, b: { label: '無理', traits: ['secretive'] } },
    { id: 'dq18', category: 'sns', weight: 2, emoji: '💬', text: 'LINE/DMは?', a: { label: '全部見せられる', traits: ['active'] }, b: { label: '無理', traits: ['secretive'] } },
    { id: 'dq19', category: 'sns', weight: 2, emoji: '🔢', text: 'パスコードは?', a: { label: '教えられる', traits: ['active'] }, b: { label: '教えたくない', traits: ['secretive'] } },
    { id: 'dq20', category: 'sns', weight: 2, emoji: '👀', text: '元恋人のSNSをこっそり見た?', a: { label: 'ある', traits: ['jealous'] }, b: { label: 'ない', traits: ['myPace'] } },
    { id: 'dq21', category: 'sns', weight: 2, emoji: '📱', text: '好きな人のSNSを、昔の投稿まで見た?', a: { label: 'ある', traits: ['jealous', 'romantic'] }, b: { label: 'ない', traits: ['myPace'] } },
    { id: 'dq22', category: 'sns', weight: 2, emoji: '📲', text: '恋人のSNSは?', a: { label: 'チェックしてしまう', traits: ['jealous'] }, b: { label: 'ほとんどしない', traits: ['myPace'] } },
    { id: 'dq23', category: 'sns', weight: 2, emoji: '❤️', text: '恋人の「いいね」は?', a: { label: '気になる', traits: ['jealous'] }, b: { label: '気にならない', traits: ['myPace'] } },
    { id: 'dq24', category: 'sns', weight: 2, emoji: '🔓', text: '恋人のスマホを見たいと思ったことは?', a: { label: 'ある', traits: ['jealous'] }, b: { label: 'ない', traits: ['myPace'] } },
    { id: 'dq25', category: 'sns', weight: 2, emoji: '📴', text: '開いたままのスマホは?', a: { label: '少し気になる', traits: ['jealous'] }, b: { label: '全く気にならない', traits: ['myPace'] } },
    { id: 'dq26', category: 'sns', weight: 2, emoji: '🗑️', text: '元恋人との写真は?', a: { label: 'まだ持っている', traits: ['romantic'] }, b: { label: '全部消した', traits: ['realist'] } },
    { id: 'dq27', category: 'sns', weight: 2, emoji: '✉️', text: '元恋人とのメッセージは?', a: { label: '残している', traits: ['romantic'] }, b: { label: '消している', traits: ['realist'] } },
    { id: 'dq28', category: 'sns', weight: 2, emoji: '😰', text: '焦る検索履歴は?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq29', category: 'sns', weight: 2, emoji: '📸', text: '説明に困る写真は?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq30', category: 'sns', weight: 2, emoji: '📨', text: '見られたくないDMは?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    // 【元恋人・過去の恋愛】
    { id: 'dq31', category: 'ex', weight: 2, emoji: '💭', text: '今でも思い出す元恋人は?', a: { label: 'いる', traits: ['romantic'] }, b: { label: 'いない', traits: ['realist'] } },
    { id: 'dq32', category: 'ex', weight: 2, emoji: '🚪', text: '会ってみたい元恋人は?', a: { label: 'いる', traits: ['romantic'] }, b: { label: 'いない', traits: ['realist'] } },
    { id: 'dq33', category: 'ex', weight: 2, emoji: '📞', text: '元恋人から連絡が来たら?', a: { label: '少し嬉しい', traits: ['romantic'] }, b: { label: '何とも思わない', traits: ['realist'] } },
    { id: 'dq34', category: 'ex', weight: 2, emoji: '🔄', text: '元恋人に、もう一度付き合おうと言われたら?', a: { label: '少し迷うかも', traits: ['romantic'] }, b: { label: '全くない', traits: ['realist'] } },
    { id: 'dq35', category: 'ex', weight: 2, emoji: '⚖️', text: '元恋人と今の恋人を比べた?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq36', category: 'ex', weight: 2, emoji: '💔', text: '元恋人の方が良かったと思った?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq37', category: 'ex', weight: 2, emoji: '📵', text: '今でも元恋人のSNSを見る?', a: { label: 'ある', traits: ['jealous'] }, b: { label: 'ない', traits: ['myPace'] } },
    { id: 'dq38', category: 'ex', weight: 2, emoji: '🎁', text: '思い出の品は?', a: { label: '残している', traits: ['romantic'] }, b: { label: '残していない', traits: ['realist'] } },
    { id: 'dq39', category: 'ex', weight: 2, emoji: '🖼️', text: '元恋人との写真を見返した?', a: { label: 'ある', traits: ['romantic'] }, b: { label: 'ない', traits: ['realist'] } },
    { id: 'dq40', category: 'ex', weight: 2, emoji: '😔', text: '別れを後悔している相手は?', a: { label: 'いる', traits: ['romantic'] }, b: { label: 'いない', traits: ['realist'] } },
    { id: 'dq41', category: 'ex', weight: 2, emoji: '💫', text: '本気で元恋人とやり直そうと考えた?', a: { label: 'ある', traits: ['romantic'] }, b: { label: 'ない', traits: ['realist'] } },
    { id: 'dq42', category: 'ex', weight: 2, emoji: '📞', text: '寂しさで元恋人に連絡した?', a: { label: 'ある', traits: ['spoiled'] }, b: { label: 'ない', traits: ['myPace'] } },
    { id: 'dq43', category: 'ex', weight: 2, emoji: '😒', text: '元恋人に新しい恋人ができたら?', a: { label: '少し嫉妬する', traits: ['jealous'] }, b: { label: '何とも思わない', traits: ['myPace'] } },
    { id: 'dq44', category: 'ex', weight: 2, emoji: '🔟', text: '過去の交際人数は?', a: { label: '正確に言える', traits: ['active'] }, b: { label: 'ぼかしたい', traits: ['secretive'] } },
    { id: 'dq45', category: 'ex', weight: 2, emoji: '✨', text: '過去の恋愛をよく見せて話したことは?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    // 【嫉妬・独占欲】
    { id: 'dq46', category: 'jea', weight: 2, emoji: '😤', text: '自分は嫉妬深い?', a: { label: 'そう思う', traits: ['jealous'] }, b: { label: 'そうでもない', traits: ['myPace'] } },
    { id: 'dq47', category: 'jea', weight: 2, emoji: '🤐', text: '嫉妬したら?', a: { label: '隠す', traits: ['secretive'] }, b: { label: '相手に言う', traits: ['active'] } },
    { id: 'dq48', category: 'jea', weight: 2, emoji: '🍷', text: '異性と二人飲みは?', a: { label: '嫌', traits: ['jealous'] }, b: { label: '平気', traits: ['myPace'] } },
    { id: 'dq49', category: 'jea', weight: 2, emoji: '📵', text: '元恋人との連絡は?', a: { label: '嫌', traits: ['jealous'] }, b: { label: '平気', traits: ['myPace'] } },
    { id: 'dq50', category: 'jea', weight: 2, emoji: '🍽️', text: '元恋人と二人で食事は?', a: { label: '無理', traits: ['jealous'] }, b: { label: '平気', traits: ['myPace'] } },
    { id: 'dq51', category: 'jea', weight: 2, emoji: '😰', text: '恋人がモテると?', a: { label: '不安になる', traits: ['jealous'] }, b: { label: 'むしろ嬉しい', traits: ['myPace'] } },
    { id: 'dq52', category: 'jea', weight: 2, emoji: '😏', text: '恋人が他の人を褒めると?', a: { label: '少し嫉妬する', traits: ['jealous'] }, b: { label: '気にならない', traits: ['myPace'] } },
    { id: 'dq53', category: 'jea', weight: 2, emoji: '🚫', text: '異性の親友は?', a: { label: '正直ちょっと嫌', traits: ['jealous'] }, b: { label: '全く平気', traits: ['myPace'] } },
    { id: 'dq54', category: 'jea', weight: 2, emoji: '👑', text: '優先してほしいのは?', a: { label: '自分が一番', traits: ['spoiled'] }, b: { label: 'そこまで求めない', traits: ['realist'] } },
    { id: 'dq55', category: 'jea', weight: 2, emoji: '🗺️', text: '恋人の行動は?', a: { label: '把握していたい', traits: ['jealous'] }, b: { label: '知らなくても平気', traits: ['myPace'] } },
    { id: 'dq56', category: 'jea', weight: 2, emoji: '⏳', text: '返信がないと?', a: { label: '気になる', traits: ['jealous'] }, b: { label: '気にならない', traits: ['myPace'] } },
    { id: 'dq57', category: 'jea', weight: 2, emoji: '😊', text: '嫉妬されると?', a: { label: '少し嬉しい', traits: ['romantic'] }, b: { label: '面倒', traits: ['myPace'] } },
    { id: 'dq58', category: 'jea', weight: 2, emoji: '⛓️', text: '束縛されると?', a: { label: '愛を感じる', traits: ['spoiled'] }, b: { label: '全く感じない', traits: ['myPace'] } },
    { id: 'dq59', category: 'jea', weight: 2, emoji: '🔑', text: '独占欲は?', a: { label: '少し出る', traits: ['jealous'] }, b: { label: 'ほとんど出ない', traits: ['myPace'] } },
    { id: 'dq60', category: 'jea', weight: 2, emoji: '🥺', text: '恋人が他の人と楽しそうだと?', a: { label: '少し寂しい', traits: ['spoiled'] }, b: { label: '平気', traits: ['myPace'] } },
    // 【浮気・境界線】
    { id: 'dq61', category: 'aff', weight: 3, emoji: '💔', text: '浮気したことは?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq62', category: 'aff', weight: 3, emoji: '⚡', text: '浮気しそうになった?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq63', category: 'aff', weight: 3, emoji: '💘', text: '恋人以外に本気でひかれた?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq64', category: 'aff', weight: 3, emoji: '💭', text: '別の人と付き合う想像は?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq65', category: 'aff', weight: 3, emoji: '💌', text: '他の人から告白されて嬉しかった?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq66', category: 'aff', weight: 3, emoji: '🤫', text: '二人で会ったことを黙っていた?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq67', category: 'aff', weight: 3, emoji: '📵', text: '連絡を隠したことは?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq68', category: 'aff', weight: 3, emoji: '😅', text: '怒られると思いつつやったことは?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq69', category: 'aff', weight: 3, emoji: '💋', text: '浮気の境界線は?', a: { label: 'キスから', traits: ['realist'] }, b: { label: '気持ちが動いた時点で', traits: ['romantic'] } },
    { id: 'dq70', category: 'aff', weight: 3, emoji: '💔', text: '一度の浮気は?', a: { label: '許せるかも', traits: ['romantic'] }, b: { label: '絶対無理', traits: ['cautious'] } },
    { id: 'dq71', category: 'aff', weight: 3, emoji: '🤔', text: '自分は浮気しないと?', a: { label: '言い切れる', traits: ['cautious'] }, b: { label: '言い切れない', traits: ['realist'] } },
    { id: 'dq72', category: 'aff', weight: 3, emoji: '🙈', text: 'バレなければ許されること?', a: { label: 'あると思う', traits: ['realist'] }, b: { label: '思わない', traits: ['cautious'] } },
    // 【恋愛の本音】
    { id: 'dq73', category: 'loveTruth', weight: 2, emoji: '💞', text: '求めるのは?', a: { label: '愛されたい', traits: ['spoiled'] }, b: { label: '愛したい', traits: ['active'] } },
    { id: 'dq74', category: 'loveTruth', weight: 2, emoji: '⚡', text: 'ひかれるのは?', a: { label: 'ドキドキする人', traits: ['active'] }, b: { label: '安心できる人', traits: ['realist'] } },
    { id: 'dq75', category: 'loveTruth', weight: 2, emoji: '👀', text: '見た目を優先すること?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ほぼない', traits: ['active'] } },
    { id: 'dq76', category: 'loveTruth', weight: 2, emoji: '✨', text: '見た目は?', a: { label: 'かなり重要', traits: ['realist'] }, b: { label: 'そこまで重要ではない', traits: ['romantic'] } },
    { id: 'dq77', category: 'loveTruth', weight: 2, emoji: '💰', text: '収入は?', a: { label: '正直気になる', traits: ['realist'] }, b: { label: 'あまり気にならない', traits: ['romantic'] } },
    { id: 'dq78', category: 'loveTruth', weight: 2, emoji: '💼', text: '職業は?', a: { label: '正直気になる', traits: ['realist'] }, b: { label: 'あまり気にならない', traits: ['romantic'] } },
    { id: 'dq79', category: 'loveTruth', weight: 2, emoji: '🎓', text: '学歴は?', a: { label: '気になる', traits: ['realist'] }, b: { label: '気にならない', traits: ['romantic'] } },
    { id: 'dq80', category: 'loveTruth', weight: 2, emoji: '🏠', text: '家柄・家庭環境は?', a: { label: '気になる', traits: ['realist'] }, b: { label: '気にならない', traits: ['romantic'] } },
    { id: 'dq81', category: 'loveTruth', weight: 2, emoji: '💍', text: '条件が良ければ?', a: { label: '結婚できるかも', traits: ['realist'] }, b: { label: '無理', traits: ['romantic'] } },
    { id: 'dq82', category: 'loveTruth', weight: 2, emoji: '⚖️', text: '条件が悪ければ?', a: { label: '別れるかも', traits: ['realist'] }, b: { label: '好きなら関係ない', traits: ['romantic'] } },
    { id: 'dq83', category: 'loveTruth', weight: 2, emoji: '🏡', text: '結婚で優先するのは?', a: { label: '安定', traits: ['realist'] }, b: { label: '愛情', traits: ['romantic'] } },
    { id: 'dq84', category: 'loveTruth', weight: 2, emoji: '🤷', text: 'もっといい人と付き合えると考えた?', a: { label: 'ある', traits: ['secretive', 'realist'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq85', category: 'loveTruth', weight: 2, emoji: '🎤', text: '自慢できるか?', a: { label: '少し気になる', traits: ['realist'] }, b: { label: '全く気にならない', traits: ['myPace'] } },
    { id: 'dq86', category: 'loveTruth', weight: 2, emoji: '👥', text: '周囲からどう見えるか?', a: { label: '気になる', traits: ['realist'] }, b: { label: '気にならない', traits: ['myPace'] } },
    // 【性的・身体的な本音】
    { id: 'dq87', category: 'phys', weight: 3, emoji: '💋', text: 'キスは?', a: { label: '自分からしたい', traits: ['active'] }, b: { label: 'されたい', traits: ['spoiled'] } },
    { id: 'dq88', category: 'phys', weight: 3, emoji: '😉', text: '誘うのは?', a: { label: '自分から', traits: ['active'] }, b: { label: '誘われたい', traits: ['spoiled'] } },
    { id: 'dq89', category: 'phys', weight: 3, emoji: '🎯', text: '恋愛では?', a: { label: 'リードしたい', traits: ['active'] }, b: { label: 'リードされたい', traits: ['spoiled'] } },
    { id: 'dq90', category: 'phys', weight: 3, emoji: '🤝', text: 'スキンシップは?', a: { label: '多い方が好き', traits: ['spoiled'] }, b: { label: '少なめでも平気', traits: ['myPace'] } },
    { id: 'dq91', category: 'phys', weight: 3, emoji: '🌙', text: '触れ合う頻度は?', a: { label: '毎日触れ合いたい', traits: ['spoiled'] }, b: { label: '毎日でなくていい', traits: ['myPace'] } },
    { id: 'dq92', category: 'phys', weight: 3, emoji: '🛌', text: '寝る時は?', a: { label: 'くっつきたい', traits: ['spoiled'] }, b: { label: '離れて寝たい', traits: ['myPace'] } },
    { id: 'dq93', category: 'phys', weight: 3, emoji: '🛁', text: '一緒にお風呂は?', a: { label: '入れる', traits: ['active'] }, b: { label: '恥ずかしい', traits: ['secretive'] } },
    { id: 'dq94', category: 'phys', weight: 3, emoji: '😘', text: '人前でキスは?', a: { label: 'できる', traits: ['active'] }, b: { label: '無理', traits: ['secretive'] } },
    { id: 'dq95', category: 'phys', weight: 3, emoji: '🔥', text: '恋人には?', a: { label: '大胆になれる', traits: ['active'] }, b: { label: '恥ずかしさが勝つ', traits: ['secretive'] } },
    { id: 'dq96', category: 'phys', weight: 3, emoji: '🕯️', text: '大事にするのは?', a: { label: '雰囲気', traits: ['romantic'] }, b: { label: '勢い', traits: ['active'] } },
    { id: 'dq97', category: 'phys', weight: 3, emoji: '🌸', text: '香りは?', a: { label: 'かなり重要', traits: ['romantic'] }, b: { label: 'あまり気にしない', traits: ['realist'] } },
    { id: 'dq98', category: 'phys', weight: 3, emoji: '💫', text: '性的魅力の重要度は?', a: { label: 'かなり重要', traits: ['realist'] }, b: { label: 'そこまで重要ではない', traits: ['romantic'] } },
    { id: 'dq99', category: 'phys', weight: 3, emoji: '🤔', text: '見た目やからだにひかれないと?', a: { label: '付き合うのは難しい', traits: ['realist'] }, b: { label: '付き合える', traits: ['romantic'] } },
    { id: 'dq100', category: 'phys', weight: 3, emoji: '⚡', text: '見た目やからだに強くひかれて、相手が気になることは?', a: { label: '気になることがある', traits: ['realist'] }, b: { label: 'ない', traits: ['romantic'] } },
    { id: 'dq101', category: 'phys', weight: 3, emoji: '💬', text: '性的な好みは?', a: { label: '全部話せる', traits: ['active'] }, b: { label: '話せないこともある', traits: ['secretive'] } },
    { id: 'dq102', category: 'phys', weight: 3, emoji: '🔐', text: '言っていない性的な好みは?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq103', category: 'phys', weight: 3, emoji: '🔍', text: '性的な検索履歴は?', a: { label: '見られても平気', traits: ['myPace'] }, b: { label: '絶対嫌', traits: ['secretive'] } },
    { id: 'dq104', category: 'phys', weight: 3, emoji: '💥', text: '興奮するのは?', a: { label: '相手から積極的に', traits: ['spoiled'] }, b: { label: '自分から行く方', traits: ['active'] } },
    { id: 'dq105', category: 'phys', weight: 3, emoji: '💗', text: '重要なのは?', a: { label: '身体的な相性', traits: ['realist'] }, b: { label: '愛情', traits: ['romantic'] } },
    // 【お金・ステータス】
    { id: 'dq106', category: 'money', weight: 3, emoji: '💰', text: '貯金額は?', a: { label: '正確に言える', traits: ['active'] }, b: { label: '言いたくない', traits: ['secretive'] } },
    { id: 'dq107', category: 'money', weight: 3, emoji: '💵', text: '給料は?', a: { label: '正確に言える', traits: ['active'] }, b: { label: '言いたくない', traits: ['secretive'] } },
    { id: 'dq108', category: 'money', weight: 3, emoji: '💳', text: '借金があったら?', a: { label: '付き合う前に言う', traits: ['cautious'] }, b: { label: '深くなってから言う', traits: ['secretive'] } },
    { id: 'dq109', category: 'money', weight: 3, emoji: '📉', text: '収入差は?', a: { label: '少し気になる', traits: ['realist'] }, b: { label: '全く気にならない', traits: ['myPace'] } },
    { id: 'dq110', category: 'money', weight: 3, emoji: '🤔', text: '収入が低すぎると?', a: { label: '結婚を迷う', traits: ['realist'] }, b: { label: '迷わない', traits: ['romantic'] } },
    { id: 'dq111', category: 'money', weight: 3, emoji: '💸', text: 'お金を使いすぎるくせは?', a: { label: '別れる理由になる', traits: ['realist'] }, b: { label: 'ならない', traits: ['romantic'] } },
    { id: 'dq112', category: 'money', weight: 3, emoji: '💒', text: 'お金がない相手とは?', a: { label: '結婚は難しい', traits: ['realist'] }, b: { label: '愛情があればできる', traits: ['romantic'] } },
    { id: 'dq113', category: 'money', weight: 3, emoji: '🎓', text: '社会的地位は?', a: { label: '求める', traits: ['realist'] }, b: { label: '求めない', traits: ['romantic'] } },
    { id: 'dq114', category: 'money', weight: 3, emoji: '🛒', text: '相手に言わず、高い買い物をするのは?', a: { label: 'あり', traits: ['secretive'] }, b: { label: 'なし', traits: ['active'] } },
    // 【結婚・将来】
    { id: 'dq115', category: 'marriage', weight: 3, emoji: '💍', text: '好きでも結婚したくない相手は?', a: { label: 'いると思う', traits: ['realist'] }, b: { label: '好きなら結婚できる', traits: ['romantic'] } },
    { id: 'dq116', category: 'marriage', weight: 3, emoji: '📋', text: '結婚相手への条件は?', a: { label: 'より求める', traits: ['realist'] }, b: { label: '求めない', traits: ['romantic'] } },
    { id: 'dq117', category: 'marriage', weight: 3, emoji: '👶', text: '子どもの希望が違えば?', a: { label: '別れる可能性が高い', traits: ['realist'] }, b: { label: '話し合って考える', traits: ['cautious'] } },
    { id: 'dq118', category: 'marriage', weight: 3, emoji: '👪', text: '家族と合わなければ?', a: { label: '諦める可能性がある', traits: ['realist'] }, b: { label: '相手が好きなら結婚する', traits: ['romantic'] } },
    { id: 'dq119', category: 'marriage', weight: 3, emoji: '💭', text: '感情が薄れても?', a: { label: '一緒にいられる', traits: ['realist'] }, b: { label: '難しい', traits: ['romantic'] } },
    { id: 'dq120', category: 'marriage', weight: 3, emoji: '👨‍👩‍👧', text: '愛情がなくなったら?', a: { label: '家族として一緒にいられる', traits: ['realist'] }, b: { label: '別れたい', traits: ['romantic'] } },
    { id: 'dq121', category: 'marriage', weight: 3, emoji: '🔐', text: '結婚後の秘密は?', a: { label: 'あっていい', traits: ['secretive'] }, b: { label: '全部共有したい', traits: ['active'] } },
    { id: 'dq122', category: 'marriage', weight: 3, emoji: '🧘', text: '一人の時間は?', a: { label: '絶対必要', traits: ['myPace'] }, b: { label: '基本的に一緒にいたい', traits: ['spoiled'] } },
    { id: 'dq123', category: 'marriage', weight: 3, emoji: '🌠', text: '相手の夢のために暮らしを変えられる?', a: { label: '変えられる', traits: ['romantic'] }, b: { label: '難しい', traits: ['realist'] } },
    { id: 'dq124', category: 'marriage', weight: 3, emoji: '🎯', text: '自分の夢のためなら?', a: { label: '離れる選択もできる', traits: ['realist'] }, b: { label: '恋人を優先する', traits: ['romantic'] } },
    // 【かなり聞かれたくない本音】
    { id: 'dq125', category: 'deep', weight: 3, emoji: '👀', text: '気になる人は他にも?', a: { label: 'いる', traits: ['secretive'] }, b: { label: 'いない', traits: ['active'] } },
    { id: 'dq126', category: 'deep', weight: 3, emoji: '✨', text: 'より魅力的だと思う人は?', a: { label: 'いる', traits: ['secretive'] }, b: { label: 'いない', traits: ['active'] } },
    { id: 'dq127', category: 'deep', weight: 3, emoji: '💫', text: '恋人以外から好かれたいと思ったことは?', a: { label: 'ある', traits: ['spoiled', 'secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq128', category: 'deep', weight: 3, emoji: '🤷', text: 'もっといい人がいるかもと思った?', a: { label: 'ある', traits: ['secretive', 'realist'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq129', category: 'deep', weight: 3, emoji: '💭', text: '別れを具体的に想像した?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq130', category: 'deep', weight: 3, emoji: '🌫️', text: '別れた後の相手を想像した?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq131', category: 'deep', weight: 3, emoji: '🤐', text: '言えない不満は?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq132', category: 'deep', weight: 3, emoji: '👁️', text: '見た目で気になる部分は?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq133', category: 'deep', weight: 3, emoji: '😑', text: '我慢している部分は?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq134', category: 'deep', weight: 3, emoji: '⚖️', text: '妥協していると感じる?', a: { label: 'ある', traits: ['secretive', 'realist'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq135', category: 'deep', weight: 3, emoji: '💢', text: '根に持っている言葉は?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq136', category: 'deep', weight: 3, emoji: '😤', text: 'まだ許していないことは?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq137', category: 'deep', weight: 3, emoji: '🎭', text: '本当の自分は?', a: { label: '全部見せている', traits: ['active'] }, b: { label: 'まだ隠している部分がある', traits: ['secretive'] } },
    { id: 'dq138', category: 'deep', weight: 3, emoji: '🤔', text: 'ずっと一緒でいいのかなと思った?', a: { label: 'ある', traits: ['secretive', 'realist'] }, b: { label: 'ない', traits: ['romantic'] } },
    { id: 'dq139', category: 'deep', weight: 3, emoji: '😨', text: '怖くて関係を続けた?', a: { label: 'ある', traits: ['spoiled', 'secretive'] }, b: { label: 'ない', traits: ['myPace'] } },
    { id: 'dq140', category: 'deep', weight: 3, emoji: '🥺', text: '寂しいから付き合った?', a: { label: 'ある', traits: ['spoiled'] }, b: { label: 'ない', traits: ['myPace'] } },
    // 【恥ずかしい・笑える秘密】
    { id: 'dq141', category: 'funny', weight: 1, emoji: '💨', text: 'おならは?', a: { label: '我慢している', traits: ['secretive'] }, b: { label: '普通にできる', traits: ['active'] } },
    { id: 'dq142', category: 'funny', weight: 1, emoji: '🌙', text: '寝た後にスマホを見る?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq143', category: 'funny', weight: 1, emoji: '💌', text: 'LINEを何度も読み返した?', a: { label: 'ある', traits: ['romantic', 'spoiled'] }, b: { label: 'ない', traits: ['myPace'] } },
    { id: 'dq144', category: 'funny', weight: 1, emoji: '⏰', text: '返信をわざと遅らせた?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq145', category: 'funny', weight: 1, emoji: '♟️', text: '返信時間で駆け引きした?', a: { label: 'ある', traits: ['secretive', 'romantic'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq146', category: 'funny', weight: 1, emoji: '🔍', text: '名前を検索した?', a: { label: 'ある', traits: ['romantic'] }, b: { label: 'ない', traits: ['myPace'] } },
    { id: 'dq147', category: 'funny', weight: 1, emoji: '🖼️', text: '昔の写真まで探した?', a: { label: 'ある', traits: ['romantic', 'jealous'] }, b: { label: 'ない', traits: ['myPace'] } },
    { id: 'dq148', category: 'funny', weight: 1, emoji: '📸', text: '寝顔をこっそり撮った?', a: { label: 'ある', traits: ['romantic'] }, b: { label: 'ない', traits: ['myPace'] } },
    { id: 'dq149', category: 'funny', weight: 1, emoji: '👃', text: 'においをこっそりかいだ?', a: { label: 'ある', traits: ['romantic'] }, b: { label: 'ない', traits: ['myPace'] } },
    { id: 'dq150', category: 'funny', weight: 1, emoji: '🧥', text: '恋人の物のにおいをかいだ?', a: { label: 'ある', traits: ['romantic', 'spoiled'] }, b: { label: 'ない', traits: ['myPace'] } },
  ];

  const DUEL_MATCH_QUESTION_COUNT = 5;
  const DUEL_RECENT_HISTORY_LIMIT = 20;
  // 1試合5問につき Aが つかえる「うそコイン」の まいすう。つかう義務は
  // なく、0〜DUEL_LIE_BUDGET かいの あいだで じゆうに つかえる
  const DUEL_LIE_BUDGET = 2;
  // 1試合ぶんの weight(1=かるい/2=ふつう/3=おもい)の くみあわせ。
  // かるい話題1問+ふつう2問+おもい2問を きほんとし、じゅんばんは
  // pickDuelQuestions() さいごの シャッフルで きまる ので、とくに
  // ふかい話題が あとの ほうに かたよる、といった かたい きまりは ない
  const DUEL_WEIGHT_MIX = [1, 2, 2, 3, 3];
  // 1試合の なかで おなじ カテゴリーの しつもんが これいじょう かたよらない ように
  const DUEL_CATEGORY_LIMIT = 2;

  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // カテゴリーの かたより(さいだい DUEL_CATEGORY_LIMIT 問まで)と、
  // かるい/ふつう/おもい話題の おんどさ(DUEL_WEIGHT_MIX)を りょうほう
  // みたす ように 5問を えらび、さいごに じゅんばんを シャッフルする
  function pickDuelQuestions(recentIds) {
    const recent = Array.isArray(recentIds) ? recentIds : [];
    const used = [];
    const categoryCounts = {};
    const picked = [];
    shuffleArray(DUEL_WEIGHT_MIX).forEach((weight) => {
      const byWeight = DUEL_QUESTIONS.filter((q) => q.weight === weight && !used.includes(q.id));
      let pool = byWeight.filter((q) => !recent.includes(q.id) && (categoryCounts[q.category] || 0) < DUEL_CATEGORY_LIMIT);
      if (pool.length === 0) pool = byWeight.filter((q) => (categoryCounts[q.category] || 0) < DUEL_CATEGORY_LIMIT);
      if (pool.length === 0) pool = byWeight.filter((q) => !recent.includes(q.id));
      if (pool.length === 0) pool = byWeight;
      if (pool.length === 0) pool = DUEL_QUESTIONS.filter((q) => !used.includes(q.id) && (categoryCounts[q.category] || 0) < DUEL_CATEGORY_LIMIT);
      if (pool.length === 0) pool = DUEL_QUESTIONS.filter((q) => !used.includes(q.id));
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      picked.push(chosen);
      used.push(chosen.id);
      categoryCounts[chosen.category] = (categoryCounts[chosen.category] || 0) + 1;
    });
    return shuffleArray(picked);
  }

  function rememberDuelQuestions(ids) {
    const list = state.lifetime.duelRecentQuestionIds || [];
    state.lifetime.duelRecentQuestionIds = [...list, ...ids].slice(-DUEL_RECENT_HISTORY_LIMIT);
  }

  // せいかく・かちかんの すいてい: プレイヤーの ほんね(truth)だけを
  // かさねて きろくする(こうかいされた こたえや、本音/うその せんたくは
  // いっさい つかわない)。1問だけで はんだんせず、なんかいも あそぶうちに
  // すこしずつ 傾向が みえてくる ように、ここでは たんに +1 するだけに とどめる
  function applyDuelTrait(question, truth) {
    const side = truth === 'a' ? question.a : question.b;
    (side.traits || []).forEach((t) => {
      state.lifetime.duelTraits[t] = (state.lifetime.duelTraits[t] || 0) + 1;
    });
  }

  const DUEL_CHALLENGE_PREFIX = 'NAOTOCCHIDUELC1:';
  const DUEL_GUESS_PREFIX = 'NAOTOCCHIDUELG1:';
  const DUEL_REVEAL_PREFIX = 'NAOTOCCHIDUELR1:';
  const DUEL_MAX_BET = 999999;

  // 挑戦コードに のるのは かけきんと「こうかいされる こたえ(pub)」だけ。
  // Aの ほんね(truth)や、どの もんで うそコインを つかったかは この
  // コードに いっさい ふくまれない ので、Bに もれる ことは ない
  // ひとこと証言(testimony)も この コードだけで はこぶ(あんごうの
  // かいすうは ふやさない)。空文字を「証言なし」の しるしとして つかう
  function encodeDuelChallenge() {
    const d = state.duel;
    const payload = { bet: d.bet, q: d.entries.map((e) => [e.qId, e.pub, e.testimony || '']) };
    return DUEL_CHALLENGE_PREFIX + btoa(encodeURIComponent(JSON.stringify(payload)));
  }

  function decodeDuelChallenge(raw) {
    try {
      // GUEST_CODE_PREFIX と おなじ りゆうで、プレフィックスは 大文字小文字を
      // くべつせず よみとる(こぴー元アプリの リンク自動検出による 小文字化 対策)
      const trimmed = raw.trim().replace(/^NAOTOCCHIDUELC1:/i, '');
      const payload = JSON.parse(decodeURIComponent(atob(trimmed)));
      if (!payload || typeof payload !== 'object') return null;
      if (!Number.isFinite(payload.bet) || payload.bet <= 0 || payload.bet > DUEL_MAX_BET) return null;
      if (!Array.isArray(payload.q) || payload.q.length !== DUEL_MATCH_QUESTION_COUNT) return null;
      const items = [];
      for (const entry of payload.q) {
        if (!Array.isArray(entry) || entry.length !== 3) return null;
        const [qId, pub, testimony] = entry;
        if (typeof qId !== 'string' || !DUEL_QUESTIONS.some((q) => q.id === qId)) return null;
        if (pub !== 'a' && pub !== 'b') return null;
        if (testimony !== '' && !DUEL_TESTIMONY_PRESETS.some((t) => t.id === testimony)) return null;
        items.push({ qId, pub, testimony: testimony || null });
      }
      return { bet: Math.round(payload.bet), items };
    } catch (e) {
      return null;
    }
  }

  // 自信度(confidence)と「いちばん あやしい」の 指名(sus)も この コードで
  // はこぶ。sus は かならず どれか1問の qId に なる(Aが 1回も うそを
  // つかっていない ばあいでも、Bは かならず 1問を えらぶ しくみのため)
  function encodeDuelGuess() {
    const d = state.duel;
    const payload = { bet: d.bet, g: d.guesses.map((g) => [g.qId, g.guess, g.confidence]), sus: d.suspicionQId };
    return DUEL_GUESS_PREFIX + btoa(encodeURIComponent(JSON.stringify(payload)));
  }

  function decodeDuelGuess(raw) {
    try {
      const trimmed = raw.trim().replace(/^NAOTOCCHIDUELG1:/i, '');
      const payload = JSON.parse(decodeURIComponent(atob(trimmed)));
      if (!payload || typeof payload !== 'object') return null;
      if (!Number.isFinite(payload.bet) || payload.bet <= 0 || payload.bet > DUEL_MAX_BET) return null;
      if (!Array.isArray(payload.g) || payload.g.length !== DUEL_MATCH_QUESTION_COUNT) return null;
      const guesses = [];
      for (const entry of payload.g) {
        if (!Array.isArray(entry) || entry.length !== 3) return null;
        const [qId, guess, confidence] = entry;
        if (typeof qId !== 'string' || !DUEL_QUESTIONS.some((q) => q.id === qId)) return null;
        if (guess !== 'honest' && guess !== 'lie') return null;
        if (confidence !== 'maybe' && confidence !== 'certain') return null;
        guesses.push({ qId, guess, confidence });
      }
      if (typeof payload.sus !== 'string' || !DUEL_QUESTIONS.some((q) => q.id === payload.sus)) return null;
      if (!guesses.some((g) => g.qId === payload.sus)) return null;
      return { bet: Math.round(payload.bet), guesses, suspicionQId: payload.sus };
    } catch (e) {
      return null;
    }
  }

  function encodeDuelReveal() {
    const d = state.duel;
    const payload = { bet: d.bet, r: d.entries.map((e) => [e.qId, e.truth]) };
    return DUEL_REVEAL_PREFIX + btoa(encodeURIComponent(JSON.stringify(payload)));
  }

  function decodeDuelReveal(raw) {
    try {
      const trimmed = raw.trim().replace(/^NAOTOCCHIDUELR1:/i, '');
      const payload = JSON.parse(decodeURIComponent(atob(trimmed)));
      if (!payload || typeof payload !== 'object') return null;
      if (!Number.isFinite(payload.bet) || payload.bet <= 0 || payload.bet > DUEL_MAX_BET) return null;
      if (!Array.isArray(payload.r) || payload.r.length !== DUEL_MATCH_QUESTION_COUNT) return null;
      const reveals = [];
      for (const entry of payload.r) {
        if (!Array.isArray(entry) || entry.length !== 2) return null;
        const [qId, truth] = entry;
        if (typeof qId !== 'string' || !DUEL_QUESTIONS.some((q) => q.id === qId)) return null;
        if (truth !== 'a' && truth !== 'b') return null;
        reveals.push({ qId, truth });
      }
      return { bet: Math.round(payload.bet), reveals };
    } catch (e) {
      return null;
    }
  }

  // A(かいとうしゃ)やく: かけきんを きめて しんきの しょうぶを はじめる。
  // entries は 5つぶんの こたえを かならず このながさで もつ かためられた
  // はいれつ(未回答は null)で、d.currentIndex が いま 見ている しつもんの
  // ばんごうを あらわす。これにより「もどる」「前の しつもんへ 編集しに
  // もどる」といった 行き来を entries.push() に たよらずに あんぜんに
  // あつかえる
  function startDuelChallenge(bet) {
    const roundedBet = Math.round(bet);
    if (!Number.isFinite(roundedBet) || roundedBet <= 0 || roundedBet > DUEL_MAX_BET) return null;
    if (roundedBet > state.lifetime.money) return null;
    const questions = pickDuelQuestions(state.lifetime.duelRecentQuestionIds);
    state.duel = {
      role: 'challenger',
      step: 'answering',
      bet: roundedBet,
      questions,
      entries: new Array(questions.length).fill(null),
      currentIndex: 0,
      pendingTruth: null,
      pendingTestimony: null,
      lieCoinsMax: DUEL_LIE_BUDGET,
    };
    return state.duel;
  }

  // いま つかっている うそコインの まいすう。entries は かためられた
  // はいれつな ので、たんに isLie の こたえを かぞえるだけで つねに 正しい
  // かずが もとまる(前は フィールドに 手動で +1/-1 していたが、回答を
  // あとから 変更できる ように した ため、かぞえなおす 方式に した)
  function duelLieCoinsUsed(d, excludeIndex) {
    return d.entries.reduce((n, e, idx) => (idx !== excludeIndex && e && e.isLie ? n + 1 : n), 0);
  }

  // A: いま でている しつもんに たいする 本心を えらぶ(この じてんでは
  // まだ こうかいの けってい(本音/うそ)は しない。おなじ しつもん画面の
  // なかで つづけて 本音/うそを えらべるよう、pendingTruth に いったん
  // とどめておく)
  function chooseDuelTruth(choice) {
    const d = state.duel;
    if (!d || d.role !== 'challenger' || d.step !== 'answering') return null;
    const q = d.questions[d.currentIndex];
    if (!q) return null;
    d.pendingTruth = choice === 'a' ? 'a' : 'b';
    return d;
  }

  // A: 本音/うそを えらぶ まえに、この こたえに そえる ひとこと証言を
  // にんいで えらべる(えらばなくても いい)。せいかく分析には つかわない
  function setDuelPendingTestimony(id) {
    const d = state.duel;
    if (!d || d.role !== 'challenger' || d.step !== 'answering') return null;
    if (d.pendingTruth == null) return null;
    if (id !== null && !DUEL_TESTIMONY_PRESETS.some((t) => t.id === id)) return null;
    d.pendingTestimony = id;
    return d;
  }

  // A: 直前に えらんだ 本心を「本音で こうかいする」か「うそを つく(逆を
  // こうかいする)」かを きめる。うそは 1試合につき さいだい lieCoinsMax
  // かいまでで、のこりが 0の ときに うそを えらぼうとすると エラーを かえす
  // (いま 編集している この しつもん じしんが すでに うそだった ばあいは、
  // その ぶんを のぞいて かぞえるので、うそ→うそへの ぬりなおしは コインを
  // 消費しない)。せいかく傾向の しゅうけい(applyDuelTrait)と 直近しつもん
  // りれきの きろく(rememberDuelQuestions)は、ここでは まだ おこなわず、
  // finalizeDuelChallenge() で 5問ぶん まとめて 1かいだけ おこなう(なんども
  // 見なおし・へんこうできる ように した ため、ここで つど かぞえると
  // 二重に かぞえて しまう)
  function chooseDuelHonesty(isLie) {
    const d = state.duel;
    if (!d || d.role !== 'challenger' || d.step !== 'answering') return null;
    if (d.pendingTruth == null) return null;
    if (isLie && duelLieCoinsUsed(d, d.currentIndex) >= d.lieCoinsMax) return { error: 'noLieCoins' };
    const q = d.questions[d.currentIndex];
    if (!q) return null;
    const truth = d.pendingTruth;
    const pub = isLie ? (truth === 'a' ? 'b' : 'a') : truth;
    d.entries[d.currentIndex] = { qId: q.id, truth, pub, isLie: !!isLie, testimony: d.pendingTestimony || null };
    d.pendingTruth = null;
    d.pendingTestimony = null;
    const nextEmpty = d.entries.findIndex((e) => e === null);
    if (nextEmpty === -1) {
      d.step = 'review';
    } else {
      d.currentIndex = nextEmpty;
    }
    return d;
  }

  // A: 「← もどる」。2だんかいめ(本音/うそ選択)なら 同じ しつもんの
  // 1だんかいめに もどり(まだ かくてい していない pendingTruth/
  // pendingTestimony だけを 消す。entries の 既存の こたえは そのまま)、
  // 1だんかいめなら 1つ前の しつもんの 2だんかいめへ もどって、その
  // しつもんの こたえ(本心/本音うそ/証言)を pending に つみなおして
  // 見なおせる ようにする。いちばん さいしょの しつもんの 1だんかいめでは
  // なにも しない(それより 前は ない)
  function goBackDuelQuestion() {
    const d = state.duel;
    if (!d || d.role !== 'challenger' || d.step !== 'answering') return null;
    if (d.pendingTruth != null) {
      d.pendingTruth = null;
      d.pendingTestimony = null;
      return d;
    }
    if (d.currentIndex <= 0) return null;
    d.currentIndex -= 1;
    const prev = d.entries[d.currentIndex];
    d.pendingTruth = prev ? prev.truth : null;
    d.pendingTestimony = prev ? prev.testimony : null;
    return d;
  }

  // A: 回答確認画面(review)から、5問の うち 1問を タップして その しつもんの
  // 2だんかいめ(本音/うそ・証言)を もういちど 見なおす。entries[index] は
  // すでに こたえずみの はずなので、その ないようを pending に つみなおして
  // 「answering」ステップに もどる
  function editDuelAnswer(index) {
    const d = state.duel;
    if (!d || d.role !== 'challenger' || d.step !== 'review') return null;
    const entry = d.entries[index];
    if (!entry) return null;
    d.currentIndex = index;
    d.pendingTruth = entry.truth;
    d.pendingTestimony = entry.testimony;
    d.step = 'answering';
    return d;
  }

  // A: 「↻ さいしょから」。おなじ5問の まま、こたえ・証言・うそコイン
  // 使用状況を すべて リセットして 1問目から こたえなおす
  function restartDuelAnswers() {
    const d = state.duel;
    if (!d || d.role !== 'challenger' || (d.step !== 'answering' && d.step !== 'review')) return null;
    d.entries = new Array(d.questions.length).fill(null);
    d.currentIndex = 0;
    d.pendingTruth = null;
    d.pendingTestimony = null;
    d.step = 'answering';
    return d;
  }

  // A: 「🎲 しつもんを かえる」。いまの5問を まるごと はいき して、150問の
  // プールから 新しい5問を 引きなおす。直近の しあいの りれきに くわえて、
  // いま はいき する 5問も さける ように わたす ことで、引きなおした
  // 直後に おなじ5問に なる ことを ふせぐ。こたえ・証言・うそコインは
  // すべて リセットされ、1問目から こたえなおす
  function rerollDuelQuestions() {
    const d = state.duel;
    if (!d || d.role !== 'challenger' || (d.step !== 'answering' && d.step !== 'review')) return null;
    const avoid = [...(state.lifetime.duelRecentQuestionIds || []), ...d.questions.map((q) => q.id)];
    d.questions = pickDuelQuestions(avoid);
    d.entries = new Array(d.questions.length).fill(null);
    d.currentIndex = 0;
    d.pendingTruth = null;
    d.pendingTestimony = null;
    d.step = 'answering';
    return d;
  }

  // A: 回答確認画面から、5問ぶんの ないようを さいしゅう かくてい する。
  // ここで はじめて せいかく傾向(本心のみ)を しゅうけいし、直近しつもん
  // りれきに この5問を きろくする(どちらも 1回だけ おこなう ひつようが
  // あるので、entries を なんど 書きなおしても ここに たどりつくまでは
  // 実行されない)。この あと d.step は 'ready' に なり、挑戦コードが
  // つくれる ように なる - ここから さきは「このしょうぶを やめる」以外の
  // 方法で ないようを 書きかえられない(3コード交換の こうへいせいを まもる ため)
  function finalizeDuelChallenge() {
    const d = state.duel;
    if (!d || d.role !== 'challenger' || d.step !== 'review') return null;
    if (!d.entries.every((e) => e !== null)) return null;
    d.entries.forEach((e, idx) => applyDuelTrait(d.questions[idx], e.truth));
    rememberDuelQuestions(d.questions.map((q) => q.id));
    d.step = 'ready';
    return d;
  }

  // A: 挑戦コードを すでに 発行した あと(d.step === 'ready')に ないように
  // 手を いれたい ばあいの ための「このしょうぶを やめる」。発行ずみの
  // コードは 書きかえず、しあい じたいを はいきして あたらしい しょうぶを
  // ゼロから つくりなおす あつかいに する(3コード交換の こうへいせいを
  // まもる ため)
  function abandonDuelChallenge() {
    const d = state.duel;
    if (!d || d.role !== 'challenger' || d.step !== 'ready') return null;
    state.duel = null;
    return true;
  }

  // B(すいりしゃ)やく: A から うけとった 挑戦コードを よみこんで
  // しょうぶに さんかする。かけきん以上の おかねを もっていないと
  // 参加できない
  function startDuelGuess(code) {
    const decoded = decodeDuelChallenge(code);
    if (!decoded) return { error: 'invalid' };
    if (decoded.bet > state.lifetime.money) return { error: 'funds' };
    const items = decoded.items.map((item) => ({ qId: item.qId, pub: item.pub, testimony: item.testimony, question: DUEL_QUESTIONS.find((q) => q.id === item.qId) }));
    if (items.some((item) => !item.question)) return { error: 'invalid' };
    state.duel = { role: 'guesser', step: 'guessing', bet: decoded.bet, items, guesses: [], suspicionQId: null };
    return state.duel;
  }

  // B: 5問ぶんを まとめて 見てから、それぞれの すいり(本音/うそ)を
  // すきな じゅんばんで セット・セットしなおしできる(1問ずつ かくてい
  // していく かたちには しない)。自信度は はじめて えらんだ ときは
  // 「🤔たぶん」を デフォルトに しておき、「🔥ぜったい」に したい ときだけ
  // setDuelConfidence() で あげる(タップ回数を へらす ための くふう)
  function setDuelGuess(qId, guess) {
    const d = state.duel;
    if (!d || d.role !== 'guesser' || d.step !== 'guessing') return null;
    if (!d.items.some((i) => i.qId === qId)) return null;
    const value = guess === 'honest' ? 'honest' : 'lie';
    const existing = d.guesses.find((g) => g.qId === qId);
    if (existing) existing.guess = value;
    else d.guesses.push({ qId, guess: value, confidence: 'maybe' });
    return d;
  }

  // B: すでに すいりずみの もんの 自信度を きりかえる(まず 本音/うそを
  // えらんでいないと つかえない)
  function setDuelConfidence(qId, level) {
    const d = state.duel;
    if (!d || d.role !== 'guesser' || d.step !== 'guessing') return null;
    const existing = d.guesses.find((g) => g.qId === qId);
    if (!existing) return null;
    existing.confidence = level === 'certain' ? 'certain' : 'maybe';
    return d;
  }

  function allDuelGuessesSet() {
    const d = state.duel;
    if (!d || d.role !== 'guesser') return false;
    return d.items.every((i) => d.guesses.some((g) => g.qId === i.qId));
  }

  // B: 5問ぜんぶの すいりが そろったら かくていし、つぎの「いちばん
  // あやしい」の せんたく段階へ すすむ(ここまでは なんども えらびなおせる)
  function confirmDuelGuesses() {
    const d = state.duel;
    if (!d || d.role !== 'guesser' || d.step !== 'guessing') return null;
    if (!allDuelGuessesSet()) return null;
    d.step = 'suspicion';
    return d;
  }

  // B: 5問の なかから「いちばん あやしい」1問を さいごに 指名する。
  // Aが 1回も うそを つかっていない かのうせいも あるが、それでも
  // かならず 1問を えらぶ ひつよう が あるので、「ぜんぶ 本音」という
  // Aの せんじゅつ じたいが ブラフとして きのうする
  function chooseDuelSuspicion(qId) {
    const d = state.duel;
    if (!d || d.role !== 'guesser' || d.step !== 'suspicion') return null;
    if (!d.items.some((i) => i.qId === qId)) return null;
    d.suspicionQId = qId;
    d.step = 'ready';
    rememberDuelQuestions(d.items.map((i) => i.qId));
    return d;
  }

  // じぶんの たんまつで、けっさんを じぶんの おかねに はんえいさせる。
  // outcome='win'なら かけきんを うけとり、'lose'なら かけきんを しはらい
  // (しょじきん未満しか はらえない ばあいは もっている ぶんだけに とどめる)、
  // 'draw'なら おかねの やりとりは しない
  function settleDuelForSelf(outcome) {
    const d = state.duel;
    if (outcome === 'win') {
      d.moneyDelta = d.bet;
    } else if (outcome === 'lose') {
      d.moneyDelta = -Math.min(d.bet, state.lifetime.money);
    } else {
      d.moneyDelta = 0;
    }
    state.lifetime.money += d.moneyDelta;
  }

  function recordDuelOutcome(outcome) {
    state.lifetime.duelMatchesPlayed = (state.lifetime.duelMatchesPlayed || 0) + 1;
    if (outcome === 'win') state.lifetime.duelWins = (state.lifetime.duelWins || 0) + 1;
    else if (outcome === 'lose') state.lifetime.duelLosses = (state.lifetime.duelLosses || 0) + 1;
    else state.lifetime.duelDraws = (state.lifetime.duelDraws || 0) + 1;
  }

  const DUEL_CONFIDENCE_LABELS = { maybe: '🤔たぶん', certain: '🔥ぜったい' };

  // 1問ぶんの とくてんと えんしゅつを けいさんする。本音を めぐる
  // こうぼうは 1点、うそを めぐる こうぼうは 2点(ハイリスク・ハイリターン)。
  // 自信度(confidence)は とくてんには えいきょうせず、えんしゅつ文言
  // だけに はんえいさせる。A/Bの どちらの がわで けいさんしても おなじ
  // しきな ので、りょうほうの たんまつで かならず おなじ けっかに なる
  function computeDuelRow(qId, question, pubLabel, wasHonest, guess, confidence, testimony) {
    const guessedHonest = guess === 'honest';
    const bCorrect = guessedHonest === wasHonest;
    const confLabel = DUEL_CONFIDENCE_LABELS[confidence] || DUEL_CONFIDENCE_LABELS.maybe;
    let aPoints = 0;
    let bPoints = 0;
    let flourishTitle = '';
    let flourishDesc = '';
    let pointsLabel = '';
    if (wasHonest && bCorrect) {
      bPoints = 1;
      flourishTitle = '👀本音だった!';
      flourishDesc = `${confLabel}本音だと見ぬいた!`;
      pointsLabel = 'B +1';
    } else if (wasHonest && !bCorrect) {
      aPoints = 1;
      flourishTitle = '😳まさかの本音でした';
      flourishDesc = `${confLabel}うそだとうたがっていたのに…`;
      pointsLabel = 'A +1';
    } else if (!wasHonest && bCorrect) {
      bPoints = 2;
      flourishTitle = '🃏うそを見破った!';
      flourishDesc = `${confLabel}うそだと見やぶった!`;
      pointsLabel = 'B +2';
    } else {
      aPoints = 2;
      flourishTitle = '😈完全にだまされた!';
      flourishDesc = `${confLabel}本音だと信じていたのに…`;
      pointsLabel = 'A +2';
    }
    return {
      qId,
      emoji: question.emoji,
      text: question.text,
      pubLabel,
      testimony,
      wasHonest,
      guess,
      confidence,
      correct: bCorrect,
      aPoints,
      bPoints,
      flourishTitle,
      flourishDesc,
      pointsLabel,
    };
  }

  // 「いちばん あやしい」の ボーナスてんを けいさんする(breakdown・
  // すでに もとまった aTotal/bTotal に くわえる)。うそだったら B+1、
  // 本音だったら A+1
  function applyDuelSuspicionBonus(breakdown, susQId, aTotal, bTotal) {
    const row = breakdown.find((r) => r.qId === susQId);
    if (!row) return { aTotal, bTotal, susBonus: null };
    if (!row.wasHonest) return { aTotal, bTotal: bTotal + 1, susBonus: 'B' };
    return { aTotal: aTotal + 1, bTotal, susBonus: 'A' };
  }

  // A じしんの せいせき(うその せいこう率・れんぞく記録 など)を、
  // じぶんの entries と breakdown から しゅうけいする
  function updateDuelChallengerStats(entries, breakdown) {
    let streak = 0;
    entries.forEach((e, idx) => {
      const row = breakdown[idx];
      if (e.isLie) {
        state.lifetime.duelLiesUsed = (state.lifetime.duelLiesUsed || 0) + 1;
        if (!row.correct) {
          state.lifetime.duelLiesSucceeded = (state.lifetime.duelLiesSucceeded || 0) + 1;
          streak += 1;
          state.lifetime.duelLongestLieStreak = Math.max(state.lifetime.duelLongestLieStreak || 0, streak);
        } else {
          streak = 0;
        }
      } else {
        state.lifetime.duelHonestAnswersGiven = (state.lifetime.duelHonestAnswersGiven || 0) + 1;
        if (!row.correct) state.lifetime.duelHonestMisread = (state.lifetime.duelHonestMisread || 0) + 1;
        streak = 0;
      }
    });
  }

  // B じしんの せいせき(うそを 見やぶった率)を breakdown から しゅうけいする
  function updateDuelGuesserStats(breakdown) {
    breakdown.forEach((row) => {
      if (!row.wasHonest) {
        state.lifetime.duelLiesFacedAsGuesser = (state.lifetime.duelLiesFacedAsGuesser || 0) + 1;
        if (row.correct) state.lifetime.duelLiesDetected = (state.lifetime.duelLiesDetected || 0) + 1;
      }
    });
  }

  // A: B から うけとった 推理コードを よみこんで けっちゃくを つける。
  // Aは この じてんで しんじつ(truth)と すいり(guess)の りょうほうを
  // もっているので、じぶんの たんまつだけで けっかを かくてい できる
  function resolveDuelWithGuessCode(code) {
    const d = state.duel;
    if (!d || d.role !== 'challenger' || d.step !== 'ready') return { error: 'state' };
    const decoded = decodeDuelGuess(code);
    if (!decoded || decoded.bet !== d.bet) return { error: 'invalid' };
    const guessMap = {};
    decoded.guesses.forEach((g) => { guessMap[g.qId] = g; });
    if (!d.entries.every((e) => guessMap[e.qId])) return { error: 'invalid' };
    if (!d.entries.some((e) => e.qId === decoded.suspicionQId)) return { error: 'invalid' };
    const breakdown = d.entries.map((e) => {
      const q = DUEL_QUESTIONS.find((qq) => qq.id === e.qId);
      const wasHonest = e.truth === e.pub;
      const pubSide = e.pub === 'a' ? q.a : q.b;
      const g = guessMap[e.qId];
      return computeDuelRow(e.qId, q, pubSide.label, wasHonest, g.guess, g.confidence, e.testimony);
    });
    let aTotal = breakdown.reduce((sum, r) => sum + r.aPoints, 0);
    let bTotal = breakdown.reduce((sum, r) => sum + r.bPoints, 0);
    const susResult = applyDuelSuspicionBonus(breakdown, decoded.suspicionQId, aTotal, bTotal);
    aTotal = susResult.aTotal;
    bTotal = susResult.bTotal;
    const matchOutcome = aTotal > bTotal ? 'A' : (bTotal > aTotal ? 'B' : 'draw');
    const selfOutcome = matchOutcome === 'draw' ? 'draw' : (matchOutcome === 'A' ? 'win' : 'lose');
    settleDuelForSelf(selfOutcome);
    recordDuelOutcome(selfOutcome);
    updateDuelChallengerStats(d.entries, breakdown);
    d.step = 'done';
    d.breakdown = breakdown;
    d.aTotal = aTotal;
    d.bTotal = bTotal;
    d.matchOutcome = matchOutcome;
    d.suspicionQId = decoded.suspicionQId;
    d.susBonus = susResult.susBonus;
    return d;
  }

  // B: A から うけとった 決着コードで しんじつを しり、じぶんが
  // もっている すいり(guess)と つきあわせて、じぶんの たんまつだけで
  // けっかを かくてい する(Aの ほうこくを そのまま しんじる のではなく、
  // おなじ しきで けいさんしなおす ことで こうへいさを たもつ)
  function resolveDuelWithRevealCode(code) {
    const d = state.duel;
    if (!d || d.role !== 'guesser' || d.step !== 'ready') return { error: 'state' };
    const decoded = decodeDuelReveal(code);
    if (!decoded || decoded.bet !== d.bet) return { error: 'invalid' };
    const truthMap = {};
    decoded.reveals.forEach((r) => { truthMap[r.qId] = r.truth; });
    if (!d.items.every((i) => truthMap[i.qId])) return { error: 'invalid' };
    const guessMap = {};
    d.guesses.forEach((g) => { guessMap[g.qId] = g; });
    const breakdown = d.items.map((i) => {
      const truth = truthMap[i.qId];
      const wasHonest = truth === i.pub;
      const pubSide = i.pub === 'a' ? i.question.a : i.question.b;
      const g = guessMap[i.qId];
      return computeDuelRow(i.qId, i.question, pubSide.label, wasHonest, g.guess, g.confidence, i.testimony);
    });
    let aTotal = breakdown.reduce((sum, r) => sum + r.aPoints, 0);
    let bTotal = breakdown.reduce((sum, r) => sum + r.bPoints, 0);
    const susResult = applyDuelSuspicionBonus(breakdown, d.suspicionQId, aTotal, bTotal);
    aTotal = susResult.aTotal;
    bTotal = susResult.bTotal;
    const matchOutcome = aTotal > bTotal ? 'A' : (bTotal > aTotal ? 'B' : 'draw');
    const selfOutcome = matchOutcome === 'draw' ? 'draw' : (matchOutcome === 'B' ? 'win' : 'lose');
    settleDuelForSelf(selfOutcome);
    recordDuelOutcome(selfOutcome);
    updateDuelGuesserStats(breakdown);
    d.step = 'done';
    d.breakdown = breakdown;
    d.aTotal = aTotal;
    d.bTotal = bTotal;
    d.matchOutcome = matchOutcome;
    d.susBonus = susResult.susBonus;
    return d;
  }

  // こいびと関係の いじ・けっこんへの しんてん・わかれ に かかわる
  // すうち。あいてが 地域のNPCでも「あいてコード」の おきゃくさんでも、
  // state.partner オブジェクトに おなじ フィールドを もたせるので、
  // どちらも まったく おなじ ルールで あつかわれる
  const PARTNER_AFFECTION_DECAY_PER_TICK = 100 / (RELATION_DECAY_YEARS * AGE_TICKS_PER_YEAR);
  const PARTNER_FLIRT_AFFECTION_BOOST = 30;
  const MARRIAGE_BOND_THRESHOLD = 8;
  const BREAKUP_DEATH_PENALTY = { dating: 10, married: 20 };
  const DEATH_METER_MULTIPLIER = { none: 1, dating: 0.75, married: 0.5 };

  function relationshipStage() {
    if (!state.partner) return 'none';
    return state.partner.married ? 'married' : 'dating';
  }

  // えいえんの誓い を そうびしていると、けっこんまでに ひつような
  // きゅうあい回数が 半分に なる(きりあげ)
  function marriageBondThreshold() {
    const base = MARRIAGE_BOND_THRESHOLD;
    return Math.max(2, base - (hasPerk(50) ? 2 : 0));
  }

  // きずぐすり を そうびしていると、わかれ/りこんの 死亡メーターダメージが
  // 半分に おさえられる(raiseDeathMeter() の こいびと/夫婦・かんむり
  // けいの けいげんとは べつに、breakup 専用の けいげん)
  function breakupPenalty(wasMarried) {
    const base = BREAKUP_DEATH_PENALTY[wasMarried ? 'married' : 'dating'];
    const eased = base;
    // つかいきりアイテムの「わかれよけの おふだ/けっかい」は、この わかれ
    // 1かいぶんだけ こうかを はっきして きえる
    if (state.oneTimeBoosts.breakupShield === 'full') {
      state.oneTimeBoosts.breakupShield = null;
      return 0;
    }
    if (state.oneTimeBoosts.breakupShield === 'half') {
      state.oneTimeBoosts.breakupShield = null;
      return eased * 0.5;
    }
    return eased;
  }

  // 「死亡」メーターの じょうしょう(かいふくアイテムなどの げんしょうは
  // ふくまない)は、こいびとが いると すこし、夫婦だと もっと ゆるやかに
  // なる - すべての 死亡メーター上昇の げんいん(びょうき・ていけんこう・
  // ミニゲーム大失敗・たべすぎ など)に 共通で かける。かんむりを
  // そうびしていると、そこから さらに 2わり おさえられる
  function raiseDeathMeter(amount) {
    // 「もう いのちは つきない」じょうたい(なおとのリング / そだち100 /
    // ♾️)では、しぼうメーターは 二度と 上がらない。むかしは リングだけを
    // みていた ため、そだち100の あとも メーターだけ たまって
    // 「ぜったい 死なないのに いのちバーが まっ赤」という くいちがいが
    // おきていた。かいふく分(amount<0)は どの ばあいも そのまま とおす
    if (amount > 0 && isImmortal()) return;
    const crownFactor = isEquipped('crown') ? 0.85 : 1;
    state.deathMeter = clamp(state.deathMeter + amount * DEATH_METER_MULTIPLIER[relationshipStage()] * crownFactor, 0, 100);
  }

  // いま そばに いる なかま(state.companions - じゃれるを おさぼると
  // はなれて いく ことが ある、いっしょうぶんの じょうたい)が ふえるほど、
  // 時間経過による「元気」の げんしょうが おだやかに なる - にぎやかな
  // なかまとの くらしが、ひとりの ときより つかれを やわらげる、という
  // かんがえかた。1たいごとに 5%ずつ おだやかになり、10たい そろうと
  // 半分の げんしょうスピードになる(それ いじょう ふえても これより
  // ゆるくは ならない)
  function energyDecayMultiplier() {
    const count = state.companions.length;
    return clamp(1 - count * 0.05, 0.5, 1);
  }

  // 「きゅうあいする」で いちゃついた ぶんだけ なかよし度(affection)が
  // かいふくし、bondCount が つみあがって しきい値に とどくと 夫婦に
  // しんてんする。すでに 夫婦なら bondCount は もう つかわない
  function reinforceRelationship() {
    const p = state.partner;
    p.affection = clamp((p.affection ?? 100) + PARTNER_FLIRT_AFFECTION_BOOST, 0, 100);
    if (p.married) return false;
    // つかいきりアイテムの「こいの おまじない/キューピッド」を つかった
    // ちょくごの きゅうあい 1かいだけ、bondCount の のびが おおきくなる
    const courtBoost = state.oneTimeBoosts.courtBoost === 'big' ? 4 : state.oneTimeBoosts.courtBoost === 'small' ? 2 : 0;
    state.oneTimeBoosts.courtBoost = null;
    p.bondCount = (p.bondCount || 0) + 1 + courtBoost;
    if (p.bondCount < marriageBondThreshold()) return false;
    p.married = true;
    p.bondCount = 0;
    state.marriageAge = currentAge();
    state.marriageMilestonesSeen = [];
    return true;
  }

  // ほうっておくと(=きゅうあいで いちゃつかないと)なかよし度が すこしずつ
  // へっていき、0に なると ふられる/りこんする。夫婦の ほうが わかれた
  // ときの 死亡メーターへの ダメージが おおきい - 「そのぶん 別れたら より
  // ダメージくる」という つよい きずなの うらがえし
  function decayRelationship() {
    if (!state.partner || !isLiveLife()) return;
    const p = state.partner;
    // らぶれたーけいの アイテムを そうびしていると、なかよし度が へりにくい
    const affectionDecayFactor = isEquipped('partner1') ? 0.75 : 1;
    // すれちがい中は きもちが はなれるのが はやい。ほうっておくと
    // ふつうより ずっと はやく わかれに ちかづく
    const mismatchFactor = p.mismatched ? 2.5 : 1;
    p.affection = clamp((p.affection ?? 100) - PARTNER_AFFECTION_DECAY_PER_TICK * affectionDecayFactor * mismatchFactor, 0, 100);
    if (p.affection > 0) return;
    const wasMarried = !!p.married;
    const label = p.label;
    state.partner = null;
    raiseDeathMeter(breakupPenalty(wasMarried));
    // そだち50(こいの きざし)に とうたつしていると、わかれの ダメージが 半分に なる
    applyDecline((wasMarried ? 20 : 12) * (hasPerk(50) ? 0.5 : 1));
    pushLifeLog('💔', wasMarried ? `${label}とりこんした` : `${label}にふられた`);
    setMessage(wasMarried ? `${label}と何度もはなして、べつべつにくらすことになった` : `${label}とは、ここでこいびとをやめることになった`);
    emotePet('sad');
  }

  // なかまとの きずな(bond)も、こいびとの なかよし度と おなじ しくみ。
  // じゃれるで かいふくし、ほうっておくと じわじわ へっていって、0に
  // なると その なかまだけ いっしょうぶんの あいだ はなれて いってしまう
  // (state.lifetime.companionsRecruited の えいきゅうきろくは きえない -
  // 「はじめから」すれば また bond100で もどってくる)
  const COMPANION_BOND_DECAY_PER_TICK = 100 / (RELATION_DECAY_YEARS * AGE_TICKS_PER_YEAR);
  const COMPANION_PLAYWITH_BOND_BOOST = 30;

  function decayCompanionBonds() {
    if (!state.companions.length || !isLiveLife()) return;
    const left = [];
    // おともだちバッジけいの アイテムを そうびしていると、きずな度が へりにくい
    const bondDecayFactor = (isEquipped('bond1') ? 0.75 : 1) * (hasPerk(40) ? 0.5 : 1);
    state.companions = state.companions.filter((c) => {
      c.bond = clamp((c.bond ?? 100) - COMPANION_BOND_DECAY_PER_TICK * bondDecayFactor, 0, 100);
      if (c.bond > 0) return true;
      left.push(c.id);
      return false;
    });
    if (left.length) {
      const names = left.map((id) => allCompanionsById(id)?.name || id).join('・');
      setMessage(`${names}のすがたをさいきん見なくなった。しばらくべつのところで過ごすみたい`);
      applyDecline(8);
      emotePet('sad');
    }
  }

  const COURT_SUCCESS_REACTIONS = [
    "つきあってください!…え、ほんとにいいの!?",
    "やった。いまたぶん顔にぜんぶ出てる",
    "うれしすぎて何しゃべればいいかわからん笑",
    "ほんとに?…うん、今度は聞こえた",
    "今日からこいびとってことでよろしく!",
    "ちょっと待って、にやけるの止まらない",
    "心臓うるさい。たぶんきこえてる",
    "よし、まず何しよ。手つなぐ?",
    "返事を聞いてから顔が忙しい",
    "声が大きくなった。いまのは小声の予定",
    "記念日、忘れる前に書こう",
    "お祝いの声がまだ余ってる",
    "明日の用事にも会うを入れていい?",
    "にやけたまま帰ってもいい?",
    "今日の話をもう一度したい",
    "照れた顔の置き場所がない",
    "好きの返事が来るとこうなるのか"
  ];

  const COURT_FAIL_REACTIONS = [
    "あっ…了解!いまのぼくは忘れて!",
    "うわーはずかし。穴あったら5分だけ入りたい",
    "そっか。じゃあ今日は友達モードでいく!",
    "はい、恋愛イベント終了!解散!",
    "ちょっとだけへこんでいい?3びょうだけ",
    "よし、次はもっとかっこよく言う",
    "心だけ先走った笑",
    "いまの告白、編集でカットできない?",
    "返事を聞く顔、用意してなかった",
    "少し休んだら普通に話すね",
    "格好つけた声だけ残っちゃった",
    "記憶の隅にしまっておいて",
    "顔の熱が下がるのを待つ",
    "お茶の話に変えてもいい?",
    "今日は友達として帰ろう",
    "帰り道にちょっと深呼吸する",
    "平気な顔だけまだ練習中"
  ];

  // れんあい対象が あわなかった ときの リアクション。しっぱい あつかいの
  // 「ふられた」トーンには せず、「友達なら いいよ」くらいの かるい
  // しぜんな はんのうに とどめる - LGBTQを ふくむ どの タイプの あわなさも
  // ネガティブに えがかない
  const COURT_FRIEND_REACTIONS = [
    '「恋人にはなれないけど、また話そう」と返事がきた',
    '興味の向きがちがったみたい。「仲よくはしようね!」だって',
    '「タイプじゃないけど、気はあうかも!」とあくしゅをかわした',
    '恋愛の向きはあわなかったけど、仲よくなれそうな予感',
    '「友達として、またあそびたいな」',
        '「恋の話より、今はおやつの話がしたいな」',
    '「恋人にはなれないよ。でも、話はきいてる」',
    '「一緒にあそぶのは好き。それじゃだめかな」',
    '「じゃあまたね」と手を振った。いつもの距離だった',

  ];

  // すでに こいびとが いるときに もういちど「きゅうあいする」を おすと、
  // あたらしい あいてを さがしに いくのではなく、今の こいびとと いちゃつく
  // 軽い リアクションに なる(せいこう/しっぱいの 抽選は しない)
  function courtFlirtReactions(partnerLabel) {
    // speakEvent('court', { petText: ... }) に渡すため、ここは必ず
    // 「なおとっち本人が口にするセリフ」にする。情景描写は入れない。
    // 甘い・くだらない・少しだけ色っぽい方向を混ぜて毎回の幅を出す。
    return [
      `${partnerLabel}、もう少しこっちみて`,
      '手、つないでいい?返事までそわそわ',
      'きょうなんかいつもよりかわいくない?',
      'ちょっと近い?ここまでならいい?',
      'その顔ずるい。もう1回して',
      'ふたりで話すと、帰る時間を忘れそう',
      '5びょうだけぎゅーして。数えるの忘れた',
      '好きって何回いったらうるさい?',
      'ちょっとくっつこ。暑かったら言ってね',
      '近づいたら言うこと全部忘れた',
      '小声の用事は「おやつ、何にする?」です',
      'この距離で真顔はむり笑',
      'いまキスする流れ?…ちがう?じゃあ忘れて!',
      '曲がり角まで話そ。次の角でもいいけど',
      'ふたりでいると時間だけ仕事さぼってない?',
      '目が合うたび、言いかけたことが消える',
      'となりにいて。用事はあとで考える',
      '好き。言う予定じゃなかったのに',
      "好きって言う前からこっち見ないで",
      "ほめる言葉より顔に出るほうがはやい",
      "呼びたいだけで名前呼んでもいい?",
      "理由を考えたけど近くにいたいだけだった",
      "見つめる競争は先に笑ったほうの負けね",
      "手の距離だけ少し縮めたい",
      "帰る前にもうひとつだけくだらない話しよ",
      "隣に来ると用事を忘れる",
      "一緒にいると独り言が会話になるね",
    ];
  }

  // 「たびにでる」で うつる 地域。home は なおとっちの もとの すみか
  // (「はじめから」した ときの デフォルト)で、それ以外は README の
  // れい(うみ・ゆきやま・とかい・いなか・もり・さばく・なんごく)に
  // ならった。cssClass は body に つける region-<id> の いろちがい
  // (「いろ」きのうの ほんたい/がめんの いろとは べつレイヤー)。
  // candidates は その地域でだけ 出会える「きゅうあいする」の おあいてで、
  // せいべつ・れんあいタイプ・しゅぞく(動物/植物/ロボットなど)を
  // ひろく ちらして あり、どの ラインの なおとっちでも 種族を こえた
  // 恋愛が できる
  const PARTNER_RUNTIME_PROFILE = {
    cat_ceo: { emoji: '🐈‍⬛', gender: 'female', orientationId: 'gay', affinityTrait: 'brave' },
    robot_neighbor: { emoji: '🤖', gender: 'nonbinary', orientationId: 'bi', affinityTrait: 'calm' },
    field_cow: { emoji: '🐄', gender: 'male', orientationId: 'pan', affinityTrait: 'gentle' },
    sunflower_partner: { emoji: '🌻', gender: 'female', orientationId: 'straight', affinityTrait: 'romantic' },
    forest_bear: { emoji: '🐻', gender: 'male', orientationId: 'bi', affinityTrait: 'gentle' },
    grove_deer: { emoji: '🦌', gender: 'female', orientationId: 'bi', affinityTrait: 'calm' },
    cliff_goat: { emoji: '🐐', gender: 'male', orientationId: 'straight', affinityTrait: 'wild' },
    high_eagle: { emoji: '🦅', gender: 'nonbinary', orientationId: 'bi', affinityTrait: 'brave' },
    snow_spirit: { emoji: '❄️', gender: 'nonbinary', orientationId: 'pan', affinityTrait: 'calm' },
    snowman: { emoji: '☃️', gender: 'nonbinary', orientationId: 'pan', affinityTrait: 'gentle' },
    rock_octopus: { emoji: '🐙', gender: 'male', orientationId: 'bi', affinityTrait: 'gentle' },
    sea_mermaid: { emoji: '🧜', gender: 'female', orientationId: 'pan', affinityTrait: 'romantic' },
    anglerfish: { emoji: '🐟', gender: 'female', orientationId: 'bi', affinityTrait: 'calm' },
    swamp_croc: { emoji: '🐊', gender: 'male', orientationId: 'straight', affinityTrait: 'calm' },
    gentle_gorilla: { emoji: '🦍', gender: 'male', orientationId: 'pan', affinityTrait: 'gentle' },
    knitting_spider: { emoji: '🕷️', gender: 'female', orientationId: 'bi', affinityTrait: 'gentle' },
    desert_scorpion: { emoji: '🦂', gender: 'nonbinary', orientationId: 'bi', affinityTrait: 'brave' },
    oasis_cactus: { emoji: '🌵', gender: 'nonbinary', orientationId: 'pan', affinityTrait: 'calm' },
  };

  const REGION_RUNTIME_META = {
    "home": {
      "emoji": "🏠",
      "visualBaseId": "home",
      "minigameBaseId": "home",
      "decor": [
        "🏠",
        "🌸",
        "☁️",
        "💕",
        "✨",
        "🎀",
        "🪴",
        "🕊️"
      ],
      "lines": [
        "やっぱり自分のおうちが、いちばん落ちつく",
        "おなじみの景色に、ほっとした",
        "いつもの場所に座った。もう用事を忘れた",
        "帰ってきたら、床まで見慣れた顔をしていた",
        "出かける前のおやつがまだ気になる"
      ]
    },
    "city": {
      "emoji": "🏙️",
      "visualBaseId": "city",
      "minigameBaseId": "city",
      "decor": [
        "🏙️",
        "🌃",
        "✨",
        "🚕",
        "🌆",
        "💡",
        "🚦",
        "🎡"
      ],
      "lines": [
        "上を見ながら歩いて、あやうく人にぶつかりそうになった",
        "ネオンを見ていたら、帰るころには首がつかれた",
        "人の流れに乗ったら、用のない店に着いた",
        "ショーウインドーの自分と何度も目があう",
        "信号待ちの間だけ、みんな同じ予定だった"
      ]
    },
    "countryside": {
      "emoji": "🌾",
      "visualBaseId": "countryside",
      "minigameBaseId": "countryside",
      "decor": [
        "🌾",
        "🌻",
        "🐄",
        "🚜",
        "☀️",
        "🦋",
        "🌈",
        "🐓"
      ],
      "lines": [
        "田んぼのかぜで、しばらく何もしゃべらずに立っていた",
        "のはらを走ったら、思ったよりすぐ息がきれた",
        "空が広い。見るだけならおかわりできそう",
        "畑の端で立ち止まった。かかしに少し似た",
        "遠くの牛と目があった。先にそらされた"
      ]
    },
    "forest": {
      "emoji": "🌲",
      "visualBaseId": "forest",
      "minigameBaseId": "forest",
      "decor": [
        "🌲",
        "🍄",
        "🦋",
        "🐿️",
        "🌿",
        "🍃",
        "🦉",
        "🌰"
      ],
      "lines": [
        "木の枝から、鳥の声が聞こえる",
        "深呼吸したら、葉っぱのにおいが少し残った",
        "葉っぱの下をのぞいたら、向こうものぞいていた",
        "きのこを見つけた。食べずに名前だけ考えた",
        "落ち葉を踏んだ音に、もう一歩返事をした"
      ]
    },
    "mountain": {
      "emoji": "⛰️",
      "visualBaseId": "mountain",
      "minigameBaseId": "mountain",
      "decor": [
        "⛰️",
        "🪨",
        "🌲",
        "🦅",
        "🥾",
        "🏕️",
        "♨️",
        "☁️"
      ],
      "lines": [
        "山の風が強い。ちょっとだけ、えらくなった気がする",
        "見下ろすと、さっきまでいた場所がずっと小さい",
        "やっほーと言った。返事を少し長く待った",
        "上に着いたら、おにぎりの話が先に出た",
        "休憩中の顔で、しばらく景色を見ていた"
      ]
    },
    "snow": {
      "emoji": "❄️",
      "visualBaseId": "snow",
      "minigameBaseId": "snow",
      "decor": [
        "❄️",
        "⛄",
        "🏔️",
        "🌨️",
        "✨",
        "🦌",
        "🎿",
        "🧣"
      ],
      "lines": [
        "さむい!でもゆきだるまをつくってみた",
        "息が白くなるのがおもしろい",
        "雪に跡をつけた。帰り道までできてしまった",
        "雪だるまを作って、少しだけ会釈した",
        "足あとを戻ってみたら、来たときよりにぎやかだった"
      ]
    },
    "sea": {
      "emoji": "🌊",
      "visualBaseId": "sea",
      "minigameBaseId": "sea",
      "decor": [
        "🌊",
        "🐚",
        "🐠",
        "⛵",
        "☀️",
        "🦀",
        "🐬",
        "🏖️"
      ],
      "lines": [
        "なみのおとがきもちいい!",
        "砂浜をぴょんぴょんはねまわった",
        "波の音にあわせて、返事をひとつ遅らせた",
        "拾った貝を耳にあてた。目の前も海だった",
        "砂に書いた文字を、波が先に読み終えた"
      ]
    },
    "deepsea": {
      "emoji": "🫧",
      "visualBaseId": "deepsea",
      "minigameBaseId": "deepsea",
      "decor": [
        "🫧",
        "💡",
        "✨",
        "🦑",
        "🪼",
        "⚓",
        "🫧",
        "🪸"
      ],
      "lines": [
        "暗い。なのに、ところどころ光っている",
        "上を見ても、水面がどこかわからない",
        "暗いところで光が動く。挨拶なのかまだわからない",
        "泡をひとつ見送った。あっちが上らしい",
        "光る魚とすれちがった。道案内は頼みそびれた"
      ]
    },
    "river_lake": {
      "emoji": "🏞️",
      "visualBaseId": "river_lake",
      "minigameBaseId": "river_lake",
      "decor": [
        "🏞️",
        "💧",
        "🐟",
        "🦆",
        "🌿",
        "🪷",
        "🪨",
        "🌈"
      ],
      "lines": [
        "水の音を聞いていたら、しばらく動けなくなった",
        "川べりを歩くと、風が少し冷たい",
        "水切りをした。石は一回も跳ねずに休んだ",
        "川に顔を映した。流れのほうが先に笑った",
        "水音を聞いていたら、話すことがひとつ減った"
      ]
    },
    "jungle": {
      "emoji": "🌴",
      "visualBaseId": "jungle",
      "minigameBaseId": "jungle",
      "decor": [
        "🌴",
        "🌺",
        "🦜",
        "🦍",
        "🌿",
        "🍌",
        "🐍",
        "💧"
      ],
      "lines": [
        "葉っぱがでかい。何もかもでかい",
        "どこかでずっとなにかが鳴いている",
        "葉っぱをよけたら、もう一枚葉っぱがあった",
        "大きな音の正体は、まだ葉っぱの向こうにいる",
        "探検の最初に、休めそうな場所を覚えた"
      ]
    },
    "desert": {
      "emoji": "🏜️",
      "visualBaseId": "desert",
      "minigameBaseId": "desert",
      "decor": [
        "🏜️",
        "🌵",
        "🐫",
        "☀️",
        "🦂",
        "🌅",
        "⛺",
        "🦎"
      ],
      "lines": [
        "あつい!でも、砂の上を歩くのが楽しい",
        "星空がびっくりするくらいきれいだった",
        "日かげを見つけた。しばらくそこの住人になった",
        "砂をはらったつもりが、別の場所からまた出てきた",
        "遠くまで見える。歩く距離もちゃんと遠い"
      ]
    }
  };

  function makeMasterPartner(def) {
    const p = PARTNER_RUNTIME_PROFILE[def.id];
    return courtCandidate({
      id: def.id,
      label: def.label,
      emoji: p.emoji,
      gender: p.gender,
      orientationId: p.orientationId,
      affinityTrait: p.affinityTrait,
    });
  }

  function makeMasterRegion(def) {
    const meta = REGION_RUNTIME_META[def.id];
    const candidates = (WORLD_MASTER?.partners || [])
      .filter((p) => p.firstRegion === def.id)
      .map(makeMasterPartner);
    return {
      id: def.id,
      label: def.label,
      emoji: meta.emoji,
      visualBaseId: meta.visualBaseId,
      minigameBaseId: meta.minigameBaseId,
      decor: meta.decor,
      lines: meta.lines,
      candidates,
    };
  }

  const REGIONS = WORLD_MASTER
    ? [
        {
          id: 'home',
          label: WORLD_MASTER.regions.home.label,
          emoji: REGION_RUNTIME_META.home.emoji,
          visualBaseId: 'home',
          minigameBaseId: 'home',
          decor: REGION_RUNTIME_META.home.decor,
          lines: REGION_RUNTIME_META.home.lines,
          candidates: [],
        },
        ...WORLD_MASTER.regions.normal.map(makeMasterRegion),
      ]
    : [];

  // ================================================================
  // そだち70「たびだち」で ひらく とくべつな たびさき
  // ================================================================
  // REGIONS には いれない。REGIONS に いれると region-all(「ぜんぶの
  // 地域(8つ)」)と partner-all(「全地域のこいびと候補ぜんいん」)の 条件が かわって
  // しまう ため。こいびと候補も おかない(ALL_PARTNER_CANDIDATES を
  // ふやさない)。ここは「であう ばしょ」では なく「たどりつく ばしょ」
  const SPECIAL_REGIONS = [
    {
      "id": "star_stop",
      "label": "ほしぞらのていりゅうじょ",
      "emoji": "🌌",
      "special": true,
      "decor": [
        "🌌",
        "✨",
        "🚏",
        "🌠",
        "🛰️",
        "🌙",
        "💫",
        "🪐"
      ],
      "lines": [
        "だれも来ないバス停で、来ないバスをずっと待っていた",
        "ときどき星が流れる。そのたびに、ベンチが少し冷たくなる",
        "時刻表には「まもなく」とだけ書いてある",
        "となりにだれか座った気がした。振り向いたら、だれもいなかった",
        "ベンチの端に座った。だれの席をあけたのかはわからない",
        "来ないバスの話をしていたら、少しだけ待てた"
      ],
      "candidates": []
    },
    {
      "id": "memory_lake",
      "label": "きおくのみずうみ",
      "emoji": "🫧",
      "special": true,
      "decor": [
        "🫧",
        "💧",
        "🌾",
        "🪞",
        "🌫️",
        "🕯️",
        "🐚",
        "🌊"
      ],
      "lines": [
        "水面に、まだ起きていない出来事がうつっていた",
        "声を出すと、少し遅れて自分の声が返ってくる",
        "そこに沈んでいるものは、どれも見覚えがある",
        "ここに来たことはない。なのに、帰り道を知っている",
        "思い出そうとすると、水面が少し曇る",
        "忘れたはずの声がした。名前だけは浮かんでこない"
      ],
      "candidates": []
    }
  ];

  // ふつうの 地域と とくべつな たびさきを まとめて ひく。とくべつな
  // たびさきも body の region-<id> クラス・かざり emoji・たびの けっか文を
  // ふつうの 地域と まったく おなじ しくみで つかえる ように する ため、
  // findRegion() の たんいで 両方を みる(REGIONS じたいには いれない)
  function findRegion(id) {
    return REGIONS.find((r) => r.id === id) || SPECIAL_REGIONS.find((r) => r.id === id) || REGIONS[0];
  }

  // 「ずかん」の「こいびと」セクションで つかう、地域ごとの きめうち
  // キャラの ぜんいちらん(REGIONSの candidatesを ひとつに まとめたもの)
  const ALL_PARTNER_CANDIDATES = REGIONS.flatMap((r) => r.candidates);

  // なかまイベントで であえる キャラたち。ランダムに 1たい えらばれて
  // とうじょうし、そのあとに はじまる ミニゲームを クリアできれば なかまに
  // なる。なかまに なった id は state.lifetime.companionsRecruited に
  // 永続で きろくされ(「はじめから」でも消えない)、画面の よこの れつと
  // ずかんの 「なかま」セクションに ずっと 表示されつづける
  const COMPANION_RUNTIME = {
    cat_friend:{emoji:'🐱', flavor:'ねこがこっちを見た。呼んでもこない。でも帰ろうとするとついてくる'},
    rabbit_friend:{emoji:'🐰', flavor:'うさぎが少し先まで走っては、こっちを振り返っている'},
    tanuki:{emoji:'🦝', flavor:'たぬきが何かをかくしている。目があった瞬間、知らないふりをした'},
    squirrel:{emoji:'🐿️', flavor:'どんぐりをかかえたリスが、しっぽをふりふり近づいてきた'},
    owl:{emoji:'🦉', flavor:'ふくろうが上からずっとみている。話しかけるのを待っているみたい'},
    otter:{emoji:'🦦', flavor:'カワウソが石をひとつ差しだしてきた。たぶん遊びの参加券'},
    hamster:{emoji:'🐹', flavor:'ほおぶくろがパンパンのハムスターが、こっちをのぞきこんでいる'},
    panda:{emoji:'🐼', flavor:'パンダがねころんでいる。こちらを見ても起きる気はないらしい'},
    monkey:{emoji:'🐒', flavor:'サルがさっきからこっちの動きをぜんぶまねしている'},
    parrot:{emoji:'🦜', flavor:'オウムが何かしゃべった。たぶんさっきのこっちのセリフだ'},
    sheep:{emoji:'🐑', flavor:'ヒツジがふわふわ近づいてきた。すでにねむそう'},
    seal:{emoji:'🦭', flavor:'アザラシがごろごろ転がりながら近づいてきた'},
    bat:{emoji:'🦇', flavor:'コウモリが逆さまのままこっちを見ている'},
    chicken:{emoji:'🐓', flavor:'ニワトリがものすごく元気に近づいてきた'},
    penguin_friend:{emoji:'🐧', flavor:'ペンギンがこっちへ急いできて、目のまえできれいにすべった'},
    hedgehog:{emoji:'🦔', flavor:'はりねずみがそっと顔を出した。目があうと、また丸くなった'},
    shiba:{emoji:'🐕', flavor:'しばいぬがボールをくわえてこっちをみている。投げるまで帰る気はなさそう'},
    snail:{emoji:'🐌', flavor:'カタツムリが「先に行くね!」と言った。まだとなりにいる'},
    koala:{emoji:'🐨', flavor:'コアラがゆっくり近づいてきた。途中で一回ねた'},
  };

  const RARE_COMPANION_RUNTIME = {
    punyu:{emoji:'🫠',vibe:'キモかわ',flavor:'なにかがとけている。目だけははっきりこっちを見ている',joined:'ぷにゅもぬるっとついてきた'},
    sekizou:{emoji:'🗿',vibe:'シュール',flavor:'石像がある。さっきより近い気がする',joined:'気づいたら家までついてきた'},
    chameleon:{emoji:'🦎',vibe:'おしゃれ',flavor:'サングラスをかけたカメレオンが、壁から半分はえている',joined:'「よろしく」とひとことだけ言った'},
    kinoko:{emoji:'🍄',vibe:'意味不明',flavor:'きのこがしゃべっている。「やあ」といわれた',joined:'「じゃ、いこっか」ときのこが歩きだした'},
    clock:{emoji:'⏰',vibe:'マイペース',flavor:'時計が「ぴったり遅れてきたよ」と手を振った。待ち合わせはしていない',joined:'「出発はだいたい今だね」と時計がついてきた'},
    unicorn:{emoji:'🦄',vibe:'神々しい',flavor:'ユニコーンがまよいこんできた。本人はぜんぜん困っていない',joined:'なぜかそのままついてきた'},
    many_tail_fox:{emoji:'🦊',vibe:'妖しい',flavor:'きつねのしっぽを数えた。数えるたびに数がちがう',joined:'しっぽをゆらしてついてきた'},
    watcher:{emoji:'👁️',vibe:'こわい',flavor:'画面のはしからなにかがずっとみている',joined:'見ないふりをしたらいつのまにか仲間の列にいた'},
    box:{emoji:'📦',vibe:'意味不明',flavor:'ただのはこがある。たぶんただのはこ',joined:'帰ったらはこもいた'},
  };

  const COMPANIONS = WORLD_MASTER
    ? WORLD_MASTER.companions.normal.map((def) => ({
        id:def.id,
        emoji:COMPANION_RUNTIME[def.id].emoji,
        asset:def.asset || '',
        name:def.label,
        preferredRegions:[],
        flavor:COMPANION_RUNTIME[def.id].flavor,
      }))
    : [];

  const RARE_COMPANIONS = WORLD_MASTER
    ? WORLD_MASTER.companions.rare.map((def) => ({
        id:def.id,
        emoji:RARE_COMPANION_RUNTIME[def.id].emoji,
        asset:def.asset || '',
        name:def.label,
        vibe:RARE_COMPANION_RUNTIME[def.id].vibe,
        flavor:RARE_COMPANION_RUNTIME[def.id].flavor,
        joined:RARE_COMPANION_RUNTIME[def.id].joined,
      }))
    : [];

  function canonicalCompanionId(id) {
    return WORLD_MASTER?.compatibility?.companionAliases?.[id] || id;
  }

  function hasAllCurrentCompanions(lifetime) {
    const known = new Set((lifetime.companionsRecruited || []).map(canonicalCompanionId));
    return COMPANIONS.every((c) => known.has(c.id));
  }

  function companionDexEntries() {
    return COMPANIONS;
  }

  function rareCompanionDexEntries() {
    return RARE_COMPANIONS;
  }

  function companionVisualHTML(companion, size = 'thumb') {
    return companion.asset ? stageVisualHTML(companion, size) : escapeHtml(companion.emoji);
  }

  // 保存済みの恋人も現在の専用PNGを使う。セーブの関係性や通信相手は書き換えない。
  function partnerVisualHTML(partner, size = 'thumb') {
    const id = WORLD_MASTER?.compatibility?.partnerAliases?.[partner?.id] || partner?.id;
    const def = WORLD_MASTER?.partners?.find((p) => p.id === id);
    const emoji = partner?.emoji || PARTNER_RUNTIME_PROFILE[id]?.emoji || '💞';
    return def?.asset ? stageVisualHTML({ asset:def.asset, emoji }, size) : escapeHtml(emoji);
  }

  // 作者は育成・なかま・恋人の枠に入れず、④以降のシークレットとして会える。
  // 以前の図鑑/パーフェクト達成記録でも開放を保つ。
  function isAuthorUnlocked() {
    return achievedGoalTiers().some((tier) => tier >= 3);
  }

  function authorVisualHTML(size = 'thumb') {
    const author = WORLD_MASTER?.playerSpecies?.author;
    return author?.asset ? stageVisualHTML({ asset:author.asset, emoji:'🧑' }, size) : '🧑';
  }

  function showAuthorGreeting(kind = 'hello') {
    if (!isAuthorUnlocked()) return false;
    const lines = {
      hello: 'ナオト「やあ！遊んでくれて、ありがとう！」',
      dex: 'ナオト「ナオトだよ！たくさんの子に会ってくれて、ありがとう！」',
      // ④を経ずに⑤へ進んでも、この挨拶だけで誰に会ったかがわかる。
      perfect: 'ナオト「ナオトだよ！ぜんぶ見つけてくれて、ありがとう！」',
    };
    showStoryEvent({ author:true, message:lines[kind] || lines.hello });
    return true;
  }

  function hasActiveCompanionId(id) {
    return state.companions.some((sc) => canonicalCompanionId(sc.id) === id);
  }

  function hasRecruitedCompanionId(id) {
    return state.lifetime.companionsRecruited.some((rawId) => canonicalCompanionId(rawId) === id)
      || state.lifetime.rareCompanionsRecruited.some((rawId) => canonicalCompanionId(rawId) === id);
  }

  // レアなかまと 出会う かくりつ(そだち80いこう、なかまイベントの たびに 抽選)
  const RARE_COMPANION_CHANCE = 0.35;

  function allCompanionsById(id) {
    const canonical = canonicalCompanionId(id);
    return COMPANIONS.find((c) => c.id === canonical) || RARE_COMPANIONS.find((c) => c.id === canonical);
  }


  // ================================================================
  // そだち50「こいの きざし」で ひらく デート
  // ================================================================
  // ・こいびとが いる ときだけ「せかい」から さそえる
  // ・いま いる ばしょ(REGIONS/SPECIAL_REGIONS)× デートの プラン ×
  //   こいびとの せいかく(affinityTrait)の 3つで ぶんしょうが きまる ので、
  //   おなじ くみあわせは なかなか でない
  // ・もらえる ものは「なかよし度」「きげん」「すこしの せいちょう」だけ。
  //   コインも アイテムも でない ので、かせぎの ばしょには ならない。
  //   DATE_COOLDOWN_TICKS の あいだは また さそえないので、連打も できない
  // ・けっこんへの すすみぐあい(bondCount)は うごかさない。デートは
  //   「やらないと そんを する こと」では なく「やりたいから やる こと」
  const DATE_COOLDOWN_TICKS = 60;
  const DATE_AFFECTION_BOOST = 45;

  const DATE_PLANS = [
    { id: 'walk', emoji: '🚶', label: 'ならんであるく', line: 'とくに目的もなく、ずっと並んで歩いた' },
    { id: 'eat', emoji: '🍡', label: 'なにかたべる', line: 'ひとつを半分こにして食べた' },
    { id: 'sunset', emoji: '🌇', label: 'ゆうやけをみる', line: '空がきれいで、しばらくどちらもしゃべらなかった', memory: '夕やけをふたりでみた' },
    { id: 'photo', emoji: '📷', label: 'しゃしんをとる', line: '何枚とっても、どちらかが目をつぶっていた', memory: 'ふたりで写真をとった' },
    { id: 'nap', emoji: '😴', label: 'ひなたぼっこ', line: 'あたたかくて、ふたりともうっかり寝てしまった' },
    { id: 'shop', emoji: '🛍️', label: 'ぶらぶらみてまわる', line: '何も買わなかったけど、ずっと楽しかった' },
    { id: 'rain', emoji: '☔', label: 'あめやどり', line: '急な雨で、同じひさしの下に並んだ', memory: '雨やどりをした' },
    { id: 'star', emoji: '🌠', label: 'ほしをさがす', line: '流れ星を見つけたのは、結局あいてのほうだった', memory: '流れ星をさがした' },
    { id: 'talk', emoji: '💬', label: 'どうでもいいはなしをする', line: '何を話したか忘れた。笑ったところだけ覚えてる' },
    { id: 'lost', emoji: '🧭', label: 'まいごになる', line: '道に迷った。ふたりとも相手についてきたつもりだった' },
  ];

  // こいびとの せいかく(affinityTrait)ごとの リアクション。おなじ プランでも
  // あいてが かわると まったく ちがう デートに なる
  const DATE_PLAN_VARIATIONS = {
    "walk": [
      "曲がり角で、ふたりとも同じほうを指さした。",
      "歩く速さをあわせたら、話す間もあってきた。"
    ],
    "eat": [
      "最後のひとつを譲りあって、結局はんぶんこにした。",
      "ひとくち食べて顔を見た。感想はもう伝わっていた。"
    ],
    "sunset": [
      "暮れていく空を見ていた。帰る相談だけ少し遅れた。",
      "空の色に名前をつけた。次に見るころには別の色だった。"
    ],
    "photo": [
      "まじめな顔をしようとして、ふたりとも先に笑った。",
      "並んで撮ったら、間に少しすき間があった。もう一枚撮った。"
    ],
    "nap": [
      "どちらが先に寝たのか、ふたりとも覚えていなかった。",
      "日なたでぼんやりした。返事はときどきあくびだった。"
    ],
    "shop": [
      "同じものを見つけて、同時に相手を呼んだ。",
      "買わずに歩いた。ほしいものの話だけ、少し増えた。"
    ],
    "rain": [
      "雨の音で声が聞こえなくて、少しだけ近づいた。",
      "雨がやんだか確かめた。話の続きがまだあった。"
    ],
    "star": [
      "流れ星を待った。何を願うか話している間に流れた。",
      "同じ星を指したつもりが、少しずつずれていた。"
    ],
    "talk": [
      "話がひとまわりして、最初の話題に戻ってきた。",
      "大事な話のように、おやつの食べ方を相談した。"
    ],
    "lost": [
      "地図を一緒に回した。道より先にふたりの向きが決まった。",
      "同じ角を二度通った。今度は知っている顔で通った。"
    ]
  };

  const PARTNER_ANNIVERSARY_LINES = {
    "cat_ceo": [
      "「記念日は休みにした。会議もおやすみ」",
      "「来年の予定も、ここはあけとく」"
    ],
    "robot_neighbor": [
      "「思い出が増えても、整理はしないでおきます」",
      "「好きの計算、まだ終わりません」"
    ],
    "field_cow": [
      "「あのころの草も、おいしかったねえ」",
      "「変わらないねえ。半分あげるのも」"
    ],
    "sunflower_partner": [
      "「何年ぶんも、きみの方を見てたんだね」",
      "「昔の写真でも、そっち向いてる」"
    ],
    "forest_bear": [
      "「今日のはちみつ、少しいいやつにした」",
      "「寄りかかる場所、今も同じでいい?」"
    ],
    "grove_deer": [
      "「最初は、こんなに近くにいなかったね」",
      "「振り返らなくても、足音でわかるよ」"
    ],
    "cliff_goat": [
      "「記念日くらい平地で。…あの上もいいけど」",
      "「遠回りした場所のほうが覚えてるね」"
    ],
    "high_eagle": [
      "「……長く、となりにいたな」",
      "「今の景色も、悪くない」"
    ],
    "snow_spirit": [
      "「きみの顔が変わった分も、覚えてる」",
      "「わたしは同じでも、思い出は増えたよ」"
    ],
    "snowman": [
      "「とけずにここまで来たね。おかげさまで」",
      "「記念写真、今年も日かげ側で」"
    ],
    "rock_octopus": [
      "「お祝いの支度はできた。手だけが余った」",
      "「昔の写真、何本の手をつないでたっけ」"
    ],
    "sea_mermaid": [
      "「陸の『ただいま』、すっかり慣れたよ」",
      "「海の話も、ふたりの話も増えたね」"
    ],
    "anglerfish": [
      "「この灯り、もう見慣れたでしょ」",
      "「記念日は少し明るく。…やっぱり照れる」"
    ],
    "swamp_croc": [
      "「……覚えてる。花も置いてある」",
      "「泣いてない。……昔の話、するか」"
    ],
    "gentle_gorilla": [
      "「昔の写真も、破らないようにそっとね」",
      "「おめでとう。声、また大きかったかな」"
    ],
    "knitting_spider": [
      "「今年の模様を、ひと目だけ足そう」",
      "「直したところも、ふたりの模様だね」"
    ],
    "desert_scorpion": [
      "「……お茶。いつもの場所に」",
      "「日かげ、今年も半分ずつ」"
    ],
    "oasis_cactus": [
      "「このすき間にも、思い出たまったね」",
      "「記念日も、触れないくらいのとなりで」"
    ]
  };

  const DATE_TRAIT_LINES = {
    "gentle": [
      "ずっとにこにこして、何度も「ありがとう」と言ってくれた",
      "はぐれないように、少し近くへ来てくれた",
      "小さな声で「楽しいね」と言った",
      "ころびかけたら、先に荷物を受けとめてくれた",
      "「少し休も」と、自分のほうが先に座った",
      "別れぎわ、おみやげを持ちやすく直してくれた"
    ],
    "wild": [
      "途中で走りだして、ついていくのが大変だった",
      "「つぎあっち!」と、予定にない場所へ引っぱっていかれた",
      "大声で笑って、まわりに振り返られた",
      "面白そうな道を見つけて、地図をしまってしまった",
      "休憩のつもりが、次の遊びの相談になった",
      "寄り道が多くて、予定のほうを変えることにした"
    ],
    "calm": [
      "何も言わずに、となりで同じほうを見ていた",
      "いつものペースをくずさない。それが少しうれしかった",
      "「べつに、ふつうだった」と言いながら、ずっと機嫌がよかった",
      "歩く速さが少しずつ合って、話すのを忘れた",
      "静かな場所を見つけると、何も言わず座った",
      "「また来よう」と、小さな声だけ残した"
    ],
    "brave": [
      "「まかせて」と言って、結局ぜんぶ仕切ってくれた",
      "ちょっと危ない近道を選んで、どや顔をしていた",
      "困った人を助けに行って、デートが30分のびた",
      "道を間違えても、引き返す足取りは堂々としていた",
      "先に橋を渡って、真ん中で待っていてくれた",
      "「まかせて」のあと、地図をそっと上下逆にした"
    ],
    "romantic": [
      "「手、つなごう」と言ってから、あいてのほうが照れた",
      "「今日のことは忘れない」と、まじめな顔で言われた",
      "まじめに見つめられた。何か言う前に、おなかが鳴った",
      "落ちていた花びらを、記念だと大事にしまった",
      "いい雰囲気の途中で、帰り道を間違えた",
      "別れの言葉を考えすぎて、「またね」が二回になった"
    ]
  };

  // 18体それぞれの口調。性格カテゴリに加えて固有台詞を優先し、
  // 誰と付き合っているかがデート中にも分かるようにする。
  const PARTNER_SIGNATURE_LINES = {
    cat_ceo:['「このあと会議。だから、あと10ぷんだけ延長」','「予定にはなかったけど……まあ、悪くない」'],
    robot_neighbor:['「たのしい、をいま学習中」','「この時間は保存してもいいですか？」'],
    field_cow:['「ゆっくりでいいよ。草もそうしてのびるし」','おいしい草を見つけるたび半分くれた。'],
    sunflower_partner:['「きょうはたいようよりこっち見てる」','帰り道もずっとこちらの方を向いていた。'],
    forest_bear:['「つかれたら休もう。はちみつあるよ」','大きな体で、そっと歩幅をあわせてくれた。'],
    grove_deer:['「しずかなところ、すき」','少し先を歩いて、何度もこちらを振り返った。'],
    cliff_goat:['「あっちの道、ぜったいおもしろい」','気づけばまた高いところに連れていかれた。'],
    high_eagle:['「上から見ると、だいたい小さいよ」','いちばん景色のいい場所を当然みたいに知っていた。'],
    snow_spirit:['「手、つめたい？わたしはこれがふつう」','雪が降るたび少しだけうれしそうに光った。'],
    snowman:['「あったかい場所は……ちょっとだけね」','日なたを避けながら、それでもとなりを歩いた。'],
    rock_octopus:['「手、つなぐ？8本あるけど」','写真を撮るたびポーズが8個ずつ増えた。'],
    sea_mermaid:['「陸ってまだ知らないこといっぱい」','こちらが海の話を聞くより、陸の話をたくさん聞かれた。'],
    anglerfish:['「暗いほうが顔、よく見えるよ」','小さな灯りだけでずっととなりにいてくれた。'],
    swamp_croc:['「……もう帰るのか。そっか」','帰ろうとしたら、無言でもう少し先を指さした。'],
    gentle_gorilla:['「だいじょうぶ？荷物もつよ」','花を踏まないように、小さな歩幅を選んだ。'],
    knitting_spider:['「じっとして。いまおそろい作ってる」','帰るころには小さなおそろいの飾りができていた。'],
    desert_scorpion:['「危ないからこっち歩いて」','強そうな顔のまま、ずっと日陰側をゆずってくれた。'],
    oasis_cactus:['「近くにいていいよ。さわらなければ」','少し離れて歩いた。影は何度も重なった。'],
  };

  const PARTNER_RELATIONSHIP_LINES = {
    cat_ceo:{court:'「……じゃあ、予定に入れとく」',marriage:'「これからの予定、ふたりで組もう」'},
    robot_neighbor:{court:'「コイビト……登録しました」',marriage:'「家族……まだ呼び慣れません」'},
    field_cow:{court:'「じゃあ、これからも草いっしょに食べよ」',marriage:'「明日の草も半分、あけとくねえ」'},
    sunflower_partner:{court:'「これからはたいようときみを見る」',marriage:'「おかえりは、きみの方を向いて言うね」'},
    forest_bear:{court:'「うれしい。はちみつもってくるね」',marriage:'「冬眠しても、起きたらとなりにいてね」'},
    grove_deer:{court:'「もうにげないよ」',marriage:'「これからは振り返らなくてもとなりにいるね」'},
    cliff_goat:{court:'「じゃあ次はもっと高いとこ行こう」',marriage:'「一生ぶんのちかみち、いっしょに探そ」'},
    high_eagle:{court:'「……悪くない」',marriage:'「ずっと上からじゃなく、となりで見る」'},
    snow_spirit:{court:'「この手、つめたいけどいい？」',marriage:'「季節がかわっても、ここにいる」'},
    snowman:{court:'「とけないようにがんばる」',marriage:'「ふたりの家は日かげ多めでお願い」'},
    rock_octopus:{court:'「じゃあまずどの手つなぐ？」',marriage:'「家事の分担?まず手を数えよう」'},
    sea_mermaid:{court:'「もっと陸のこと教えて」',marriage:'「海も陸も、帰る場所はいっしょにしよ」'},
    anglerfish:{court:'「くらいところでもちゃんと見つけてね」',marriage:'「帰る目印の灯り、ここに置こうね」'},
    swamp_croc:{court:'「……まあ、いいけど」',marriage:'「べつに泣いてない。水がはねただけ」'},
    gentle_gorilla:{court:'「うれしい。そっとだきしめてもいい?」',marriage:'「指輪を持つのがいちばん緊張した」'},
    knitting_spider:{court:'「じゃあふたりぶん編むね」',marriage:'「ほどけてもまた編みなおせばいいよ」'},
    desert_scorpion:{court:'「……じゃあとなり歩いて」',marriage:'「これからも日陰は半分こ」'},
    oasis_cactus:{court:'「さわれなくても、好きでいいよ」',marriage:'「家族になっても、このすき間は大事ね」'},
  };

  // どの デートでも さいごに ひとつ つく、しめの ひとこと
  const DATE_CLOSINGS = [
    "帰り道、さっきより少し近くを歩いた。",
    "「また行こうね」が、ほとんど同じタイミングで出た。",
    "何をしたかより、となりにいたことのほうを覚えていそう。",
    "帰り道に入ってから、今日いちばんくだらない話が始まった。",
    "「つぎどこ行く?」の話が、もう始まっていた。",
    "しゃべらない時間も、ぜんぜん気まずくなかった。",
    "別れる前に、もう1回だけ振り返った。",
    "きょうの顔、あとで何回も思い出しそう。",
    "帰る支度をしたのに、もう少しだけ座っていた。",
    "帰りの速さだけ、なかなか決まらなかった。",
    "「またね」を言ったあと、少し同じ道を歩いた。",
    "寄り道の場所ばかり、あとから思い出した。",
    "次に会う用事を考えたけど、別になくてもよかった。",
    "話し忘れたことを、帰ってから思い出した。",
    "笑いをこらえたら、ふたりとも少し変な顔になった。",
    "今日の話をするために、次の約束をした。"
  ];

  let lastDatePlanId = null;

  // デートに さそえるか どうかと、さそえない ときの りゆうを ひとつに まとめる。
  // ボタンの ゆうこう/むこうと、じっさいの じっこう りょうほうで つかう
  function dateBlockReason() {
    if (!hasPerk(50)) return 'まだデートにはさそえない';
    if (!isLiveLife() || state.stage !== STAGE.GROWING) return 'いまはデートにいけない';
    if (!state.partner) return 'いまこいびとがいない';
    if (state.isSleeping) return 'ねている…おきてからさそおう';
    if (state.dateCooldownTicks > 0) return 'さっきデートしたばかり…少し時間をおこう';
    return null;
  }

  let dateOpen = false;
  let dateChoiceOptions = [];
  let pendingDatePlan = null;
  let dateMovieTimers = [];

  function clearDateMovieTimers() {
    dateMovieTimers.forEach((t) => clearTimeout(t));
    dateMovieTimers = [];
  }

  const DEEPSEA_DATE_PLANS = {
    "walk": {
      "emoji": "🫧",
      "label": "ならんですすむ",
      "line": "ふたりの泡が、ときどき同じほうへ流れた。",
      "variations": [
        "同じ速さで進んだ。急ぐ理由はまだなかった。",
        "遠くの光を目印にした。光も少しずつ動いていた。"
      ]
    },
    "sunset": {
      "emoji": "🐟",
      "label": "光るさかなをみる",
      "line": "魚の灯りが遠ざかるまで、ふたりとも見ていた。",
      "memory": "光るさかなをふたりでみた",
      "variations": [
        "ひとつ見つけると、近くにも小さな光があった。",
        "魚が通りすぎた。話の続きを、少し待ってから始めた。"
      ]
    },
    "nap": {
      "emoji": "😴",
      "label": "しずかなところで休む",
      "line": "静かな岩かげで、ふたりともぼんやりした。",
      "variations": [
        "返事がひとつ遅れた。どちらも急いでいなかった。",
        "少し休むつもりが、出発する相談からまた始めた。"
      ]
    },
    "rain": {
      "emoji": "🪨",
      "label": "岩かげでひと休み",
      "line": "流れをよけて、同じ岩のかげに並んだ。",
      "memory": "岩かげでひと休みした",
      "variations": [
        "流れが静かになるまで、声も少し小さくした。",
        "もう出られそうだったけど、話があとひとつ残っていた。"
      ]
    },
    "star": {
      "emoji": "✨",
      "label": "小さな光をさがす",
      "line": "暗い海で、先に光を見つけたのはあいてだった。",
      "memory": "海の中で小さな光をさがした",
      "variations": [
        "星みたいな光を見つけた。近づくとゆっくり逃げた。",
        "数えた光がひとつ合わない。もう一度、一緒に見た。"
      ]
    }
  };

  function datePlanForRegion(plan) {
    const local = state.regionId === 'deepsea' && DEEPSEA_DATE_PLANS[plan.id];
    return local ? { ...plan, ...local } : plan;
  }

  function pickDateChoices() {
    const pool = DATE_PLANS.filter((p) => p.id !== lastDatePlanId);
    const shuffled = pool.slice().sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3).map(datePlanForRegion);
  }

  function renderDateChoices() {
    el.dateChoiceGrid.innerHTML = '';
    dateChoiceOptions.forEach((plan) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'date-choice-btn';
      btn.dataset.plan = plan.id;
      btn.innerHTML = `<span class="date-choice-emoji">${plan.emoji}</span><span class="date-choice-label">${plan.label}</span>`;
      el.dateChoiceGrid.appendChild(btn);
    });
  }

  function openDateChooser() {
    const blocked = dateBlockReason();
    if (blocked) {
      setMessage(blocked);
      saveState();
      render();
      return;
    }
    closeAllMenuOverlays();
    clearConversationTimers();
    hideSpeechBubble();
    dateChoiceOptions = pickDateChoices();
    pendingDatePlan = null;
    el.dateRewardConfirm.classList.add('hidden');
    dateOpen = true;
    clearDateMovieTimers();
    el.dateChooser.classList.remove('hidden');
    el.dateMovie.classList.add('hidden');
    el.dateMovieScene.classList.remove('special-reward');
    el.dateMovieScene.classList.remove('anniversary-major');
    el.dateMovieCloseBtn.classList.add('hidden');
    el.dateMovieSkipBtn.classList.remove('hidden');
    renderDateChoices();
    render();
  }

  function closeDateOverlay() {
    clearDateMovieTimers();
    pendingDatePlan = null;
    el.dateRewardConfirm.classList.add('hidden');
    dateOpen = false;
    el.dateOverlay.classList.add('hidden');
    el.dateChooser.classList.remove('hidden');
    el.dateMovie.classList.add('hidden');
    render();
  }

  function rememberSpecialDate(plan, partner) {
    if (!plan.memory || state.datesThisLife <= 1) return;
    const memoryText = `デートのおもいで: ${partner.label}と${plan.memory}`;
    if (state.lifeLog.some((entry) => entry && lifeLogTextKey(entry.text) === lifeLogTextKey(memoryText))) return;
    pushLifeLog('💗', memoryText);
  }

  function finishDateMovie() {
    clearDateMovieTimers();
    el.dateMovieCaption.classList.remove('beat');
    el.dateMovieCloseBtn.classList.remove('hidden');
    el.dateMovieSkipBtn.classList.add('hidden');
    el.dateMovie.scrollIntoView({ block: 'nearest' });
  }


  function playOrdinaryDateMovie(plan, partner, traitLine, closing, useReward) {
    clearDateMovieTimers();
    clearConversationTimers();
    hideSpeechBubble();
    dateOpen = true;
    el.dateOverlay.classList.remove('hidden');
    el.dateChooser.classList.add('hidden');
    el.dateMovie.classList.remove('hidden');
    el.dateMovieCloseBtn.classList.add('hidden');
    el.dateMovieSkipBtn.classList.remove('hidden');

    const special = useReward === true && (state.items.reward || 0) > 0;
    if (special) {
      state.items.reward -= 1;
      if (state.items.reward <= 0) delete state.items.reward;
    }

    // ごほうび使用時は見た目も明確に別物にする。
    el.dateMovieScene.dataset.plan = special ? 'special' : plan.id;
    el.dateMovieScene.classList.toggle('special-reward', special);
    el.dateMoviePlace.textContent = special
      ? `🎁とくべつなデート・${plan.label}`
      : `${plan.emoji || '💞'} ${plan.label}`;

    const ownStage = SPECIES[state.speciesLine] && SPECIES[state.speciesLine].stages[state.stageIndex];
    setStageVisual(el.dateMoviePet, ownStage || { emoji:'✨' }, 'medium');
    el.dateMoviePartner.innerHTML = partnerVisualHTML(partner, 'medium');

    const specialMiddleLines = [
      '「おしゃれした?」「いつもの服」「そっか。似合ってる」',
      'ふたりともすこしだけよそいきの顔をしていた。',
      '「帰ったら、今日のこと自慢しよう」「誰に?」',
      '先に笑いだしたほうが、何がおかしいのか説明できなかった。',
    ];
    const specialClosingLines = [
      '「帰ったら何しよう」「今日の話を、もう一回」',
      '「次の予定は?」「まだない」「じゃあ、今はここにいよう」',
      '帰りぎわ、どちらもすぐには歩きださなかった。',
      '帰り道で、今日撮った写真をまた見せあった。さっきも見た。',
    ];
    const planLine = pickConversationLine([plan.line, ...(plan.variations || DATE_PLAN_VARIATIONS[plan.id] || [])].filter(Boolean));
    const beats = special
      ? [
          `🎁 ${partner.label}と、${plan.label}。`,
          planLine,
          specialMiddleLines[Math.floor(Math.random() * specialMiddleLines.length)],
          traitLine,
          hasNaotoItem('naoto_ring')
            ? '💍「今日の合言葉、ふたりだけで決めよっか」'
            : '「写真とろう」って言ったのに、なぜか何枚もとった。',
          specialClosingLines[Math.floor(Math.random() * specialClosingLines.length)],
          '🎁この日のことが、ひとつ思い出に残った。',
        ]
      : [
          `${partner.label}と、${plan.label}。`,
          planLine,
          traitLine,
          closing,
        ];

    if (special) pushLifeLog('💝', `とくべつなデートのおもいで: ${partner.label}と${plan.label}`);

    setCommentText(el.dateMovieCaption, compactJapaneseText(beats[0]), true);
    el.dateMovieCaption.classList.add('beat');
    el.dateMovie.scrollIntoView({ block: 'nearest' });

    // 文章を読んで余韻も残せる速度。通常は3.5秒/文、特別デートは4秒/文。
    const step = special ? 4000 : 3500;
    for (let i = 1; i < beats.length; i += 1) {
      dateMovieTimers.push(setTimeout(() => {
        el.dateMovieCaption.classList.remove('beat');
        void el.dateMovieCaption.offsetWidth;
        setCommentText(el.dateMovieCaption, compactJapaneseText(beats[i]), true);
        el.dateMovieCaption.classList.add('beat');
        el.dateMovie.scrollIntoView({ block: 'nearest' });
      }, step * i));
    }
    dateMovieTimers.push(setTimeout(finishDateMovie, step * beats.length + 500));
    saveState();
  }

  const MARRIAGE_MILESTONES = [
    { years: 1, icon: '💐', title: 'はじめてのけっこんきねんび' },
    { years: 10, icon: '🎀', title: 'けっこん10しゅうねん' },
    { years: 25, icon: '🥈', title: 'ぎんこんしき' },
    { years: 50, icon: '🥇', title: 'きんこんしき' },
  ];

  function pickMovieLine(lines) {
    return lines[Math.floor(Math.random() * lines.length)];
  }

  function partnerAnniversaryLine(partner, years) {
    // 年数と名前は最初の字幕にあるので、ここは相手固有の短い一言にする。
    const lines = PARTNER_ANNIVERSARY_LINES[partner.id] || PARTNER_SIGNATURE_LINES[partner.id];
    return lines?.length ? pickConversationLine(lines) : null;
  }

  function playMarriageMovie(milestone) {
    if (!state.partner || !state.partner.married) return;
    clearDateMovieTimers();
    clearConversationTimers();
    hideSpeechBubble();
    dateOpen = true;
    el.dateOverlay.classList.remove('hidden');
    el.dateChooser.classList.add('hidden');
    el.dateMovie.classList.remove('hidden');
    el.dateMovieCloseBtn.classList.add('hidden');
    el.dateMovieSkipBtn.classList.remove('hidden');
    el.dateMovieScene.classList.remove('special-reward');
    el.dateMovieScene.classList.toggle('anniversary-major', milestone.years >= 25);
    el.dateMovieScene.dataset.plan = milestone.years >= 50 ? 'star' : milestone.years >= 25 ? 'sunset' : 'photo';
    el.dateMoviePlace.textContent = `${milestone.icon} ${milestone.title}`;
    const ownStage = SPECIES[state.speciesLine] && SPECIES[state.speciesLine].stages[state.stageIndex];
    setStageVisual(el.dateMoviePet, ownStage || { emoji:'✨' }, 'medium');
    el.dateMoviePartner.innerHTML = partnerVisualHTML(state.partner, 'medium');
    const name = compactJapaneseText(state.partner.label);
    const hadMismatch = (state.lifeLog || []).some((e) => e && /すれちがい|なかなおり/.test(e.text || ''));
    const signatureAnniversary = partnerAnniversaryLine(state.partner, milestone.years);


    const sharedMemory = hadMismatch
      ? [
          '「いろいろあったね」「ほんとにね。でもまだとなりにいる」',
          'すれちがった日の話も、いまはふたりでできる話になっていた。',
          '「あのときちゃんとはなしてよかったね」',
          '「あのときの話、する?」「お茶いれてからにしよ」',
          '「仲直りの一言、何回も練習した」「聞こえてたよ」',
          '「あのときはごめんね」「うん。今日はとなりで飲もう」',
        ]
      : [
          '「思い出せない日もいっぱいあるね」「たぶんそれでいいんだよ」',
          '何でもない日のほうが、あとからたくさん思い出せた。',
          '「結局、ふつうの日がいちばん多かったね」',
          '「静かだね」「ふたりとも話すこと忘れたね」',
          '「予定ないね」「じゃあ、いつもの席にしよ」',
          '「今日の話は?」「おやつがおいしかった」「それで十分」',
        ];

    let beats;
    if (milestone.years >= 50) {
      beats = [
        `${name}と結婚して50年。`,
        pickMovieLine([
          '「50ねんだって」「今日のお茶はいつもどおりね」',
          '「50ねんたったらしいよ」「ほんと?まだしゃべることあるね」',
          '「急がなくなったね」「待つのも上手になった」',
        ]),
        signatureAnniversary && Math.random() < 0.5 ? signatureAnniversary : pickMovieLine(sharedMemory),
        pickMovieLine([
          '昔の写真を見た。笑うときのくせは、今も同じだった。',
          '「昔のふたり、信じるかな」「まず座ってもらおう」',
          '手をつながなくても、曲がる角はいつも同じだった。',
        ]),
        pickMovieLine([
          '「まだいっしょにいるね」「うん。まだいるね」',
          '「ここまで来たね」「じゃあ、もう少し行こっか」',
          '「これからもよろしく、でいい?」「うん。こちらこそ」',
        ]),
        'ふたりはまた、いつもの速さで歩きだした。',
      ];
    } else if (milestone.years >= 25) {
      beats = [
        `${name}と結婚して25年。銀婚式。`,
        pickMovieLine([
          '「銀婚式だって」「銀って何かもらえるの?」「知らない笑」',
          '「25ねん。長かった?」「短かったって言ったらうそになるね」',
          '「昔のしゃしん見る?」「それはちょっとこわい」',
        ]),
        signatureAnniversary && Math.random() < 0.5 ? signatureAnniversary : pickMovieLine(sharedMemory),
        pickMovieLine([
          '古い写真をひらいた。ふたりとも、同じ一枚で笑った。',
          '「このころ若いね」「今もまあまあいけるでしょ」',
          '忘れた日もある。となりにいたことは、思い出せた。',
        ]),
        pickMovieLine([
          '「ここまできたね」「うん。意外ときたね」',
          '「また25ねん後もこれやる?」「そのとき考えよ」',
          '「これからもよろしく」「それ、何回目?」',
        ]),
        '帰り道は、いつもとほとんどおなじだった。',
      ];
    } else if (milestone.years === 10) {
      beats = [
        `${name}と結婚して10年。`,
        pickMovieLine([
          '「10ねんだって」「そんなにたった?」',
          '「10周年らしいよ」「じゃあ今日はちょっといいもの食べよ」',
          '「あの日から10ねん」「あの日ってどの日?」「そこから!?」',
        ]),
        signatureAnniversary && Math.random() < 0.5 ? signatureAnniversary : pickMovieLine(sharedMemory),
        pickMovieLine([
          '「変わった?」「変わった。でも変わってないとこもある」',
          '「10年前より近い?」「席の話ならそうだね」',
          'ふたりで10年前の話をして、半分くらい記憶がちがっていた。',
        ]),
        '「まあ、これからもよろしく」',
      ];
    } else {
      beats = [
        `${name}と初めての結婚記念日。`,
        pickMovieLine([
          '「1ねんたったね」「まだ1ねんなんだね」',
          '「きょう記念日だよ」「忘れてないよ。たぶん」',
          '「結婚して1ねん」「なんかもっと長い気がする笑」',
        ]),
        pickMovieLine([
          '「まだ新婚っていっていい?」「いいんじゃない?」',
          '「1年目、どう?」「面接みたいに聞かないで笑」',
          'ふたりとも少しだけ照れながら、最初の一年を思い返した。',
        ]),
        signatureAnniversary && Math.random() < 0.5 ? signatureAnniversary : pickMovieLine(sharedMemory),
        '「来年もやろうね。忘れてたら呼んで」',
      ];
    }

    setCommentText(el.dateMovieCaption, compactJapaneseText(beats[0]), true);
    el.dateMovieCaption.classList.add('beat');
    el.dateMovie.scrollIntoView({ block: 'nearest' });
    const step = 4000;
    for (let i = 1; i < beats.length; i += 1) {
      dateMovieTimers.push(setTimeout(() => {
        el.dateMovieCaption.classList.remove('beat');
        void el.dateMovieCaption.offsetWidth;
        setCommentText(el.dateMovieCaption, compactJapaneseText(beats[i]), true);
        el.dateMovieCaption.classList.add('beat');
        el.dateMovie.scrollIntoView({ block: 'nearest' });
      }, step * i));
    }
    dateMovieTimers.push(setTimeout(finishDateMovie, step * beats.length + 800));
  }

  function checkMarriageMilestones(prevAge, age) {
    if (!state.partner || !state.partner.married || state.marriageAge == null) return;
    if (!Array.isArray(state.marriageMilestonesSeen)) state.marriageMilestonesSeen = [];
    for (const milestone of MARRIAGE_MILESTONES) {
      if (state.marriageMilestonesSeen.includes(milestone.years)) continue;
      const targetAge = state.marriageAge + milestone.years;
      if (prevAge < targetAge && age >= targetAge) {
        state.marriageMilestonesSeen.push(milestone.years);
        pushLifeLog(milestone.icon, `${state.partner.label}と${milestone.title}をむかえた`);
        playMarriageMovie(milestone);
        break;
      }
    }
  }

  function goOnDate(plan, useReward) {
    plan = datePlanForRegion(plan);
    const blocked = dateBlockReason();
    if (blocked) {
      closeDateOverlay();
      setMessage(blocked);
      saveState();
      render();
      return;
    }
    // Native dialogs may be suppressed by an embedded browser. Keep this
    // decision in the game, and commit no date effects until a choice is made.
    if ((state.items.reward || 0) > 0 && typeof useReward !== 'boolean') {
      pendingDatePlan = plan;
      dateOpen = true;
      clearDateMovieTimers();
      clearConversationTimers();
      hideSpeechBubble();
      el.dateChooser.classList.add('hidden');
      el.dateMovie.classList.add('hidden');
      el.dateRewardPlan.textContent = compactJapaneseText(`${state.partner.label}と、${plan.label}`);
      el.dateRewardCount.textContent = `ごほうびを${state.items.reward}こ持っている`;
      el.dateRewardConfirm.classList.remove('hidden');
      render();
      el.dateRewardTitle.focus({ preventScroll: true });
      el.dateRewardConfirm.scrollIntoView({ block: 'nearest' });
      return;
    }
    pendingDatePlan = null;
    el.dateRewardConfirm.classList.add('hidden');
    const partner = state.partner;
    const region = findRegion(state.regionId);
    lastDatePlanId = plan.id;
    const traitLine = pickCharacterConversationLine(PARTNER_SIGNATURE_LINES[partner.id], DATE_TRAIT_LINES[partner.affinityTrait] || DATE_TRAIT_LINES.gentle);
    const closing = pickConversationLine(DATE_CLOSINGS);

    state.dateCooldownTicks = DATE_COOLDOWN_TICKS;
    state.datesThisLife += 1;
    state.lifetime.datesEnjoyed += 1;
    state.affectionStreak = 0;
    partner.affection = clamp((partner.affection ?? 100) + DATE_AFFECTION_BOOST, 0, 100);
    state.happiness = clamp(state.happiness + 12, 0, 100);
    state.energy = clamp(state.energy - 6, 0, 100);
    state.hunger = clamp(state.hunger - 4, 0, 100);
    applyGrowth(5);
    applyDecline(-4);
    if (state.datesThisLife === 1) {
      pushLifeLog('💞', `${partner.label}とはじめてのデートにいった`);
    } else {
      rememberSpecialDate(plan, partner);
    }

    setMessage(`💞 ${partner.label}と、${plan.label}。話の続きはまた今度`);
    emotePet('love');
    saveState();
    playOrdinaryDateMovie(plan, partner, traitLine, closing, useReward);
    render();
  }

  // ================================================================
  // そだち90「でんせつ」で おきる「でんせつの であい」
  // ================================================================
  // 1つの 人生で 1かいだけ、しかも「いつ おきるか わからない」ように
  // tick ごとの ていかくりつで しのばせてある(そだち90に とどいた しゅんかんに
  // おきるのでは なく、そのあとの ふつうの じかんに とつぜん おきる)。
  // もらえる ものは わざと ちいさい - でんせつの ゆめ(レア種族)や
  // そだち100・ずかんクリア・パーフェクトクリアの やくわりを とらない ように、
  // ここは「みた ことが ある か どうか」だけが のこる イベントに している。
  // 5つの パターンは ほうこうせいを わざと バラバラに して ある
  const LEGEND_ENCOUNTER_CHANCE = 0.012;

  const LEGEND_ENCOUNTERS = [
    {
      id: 'gate', emoji: '⛩️', name: 'そらにうかぶとりい', vibe: '神々しい',
      flash: '見上げると、雲よりずっと下にとりいがひとつうかんでいる',
      story: 'くぐれる高さではないのに、なぜか足がとまった。しばらく見ていると、とりいがほんの少しこちらへかたむいた。風はなかった',
    },
    {
      id: 'stairs', emoji: '🪜', name: 'どこにもつながらないかいだん', vibe: '意味不明',
      flash: '野原のまんなかに、階段だけが立っている',
      story: '何段のぼったかわからなくなって、いったんおりた。地面から見ると3段しかない。もう一度のぼる気にはなれなかった',
    },
    {
      id: 'boss', emoji: '🦑', name: 'あやまりにきただいおういか', vibe: '笑える',
      flash: 'とてつもなく大きなイカが、なぜかものすごく丁寧におじぎをしている',
      story: '「このたびは、まことに申し訳ございませんでした」とイカが言った。何のことか聞いても、もう一度深くおじぎをするだけ。とりあえず「いいよ」と言ったら帰っていった',
    },
    {
      id: 'lamp', emoji: '🏮', name: 'よなかのあかり', vibe: '温かい',
      flash: 'まっくらな道の先に、小さなあかりがひとつついている',
      story: '近づくと、暗がりから「おかえり」と聞こえた。だれも見えない。通りすぎて振り返ると、あかりだけがまだそこにあった',
    },
    {
      id: 'mirror', emoji: '🪞', name: 'としをとったじぶん', vibe: '美しい・こわい',
      flash: '水たまりに、いまよりずっと年をとった自分がうつっている',
      story: '水たまりの自分だけが先に笑った。口が何かを言うように動いたところで、水面がゆれた。消える直前の顔は、おだやかだった',
    },
  ];

  const LEGEND_COIN_GIFT = 200;

  // でんせつの であいが おきる じょうけん。ミニゲーム中・すいみん中・
  // なにかの がめんを ひらいている あいだは おきない(みのがす のが
  // いちばん もったいない イベントな ため)
  function maybeLegendEncounter() {
    // そだち70(たびだち)から でんせつに あえる(以前は 90 で、ほとんどの いっしょうで おきなかった)
    if (!hasPerk(70) || state.legendMet || state.infinite) return;
    if (state.stage !== STAGE.GROWING || gameActive || state.isSleeping) return;
    if (state.transformOptions || pendingCompanionId || isAnyMenuOverlayOpen()) return;
    if (Math.random() >= LEGEND_ENCOUNTER_CHANCE) return;
    triggerLegendEncounter();
  }

  function playLegendEncounterMovie(legend, coins) {
    clearDateMovieTimers();
    clearConversationTimers();
    hideSpeechBubble();
    dateOpen = true;
    el.dateOverlay.classList.remove('hidden');
    el.dateChooser.classList.add('hidden');
    el.dateMovie.classList.remove('hidden');
    el.dateMovieCloseBtn.classList.add('hidden');
    el.dateMovieSkipBtn.classList.remove('hidden');
    el.dateMovieScene.classList.remove('special-reward', 'anniversary-major');
    el.dateMovieScene.dataset.plan = legend.id === 'boss' ? 'sea' : legend.id === 'gate' ? 'star' : legend.id === 'lamp' ? 'sunset' : 'photo';
    el.dateMoviePlace.textContent = `${legend.emoji}でんせつのであい`;
    const ownStage = SPECIES[state.speciesLine] && SPECIES[state.speciesLine].stages[state.stageIndex];
    setStageVisual(el.dateMoviePet, ownStage || { emoji:'✨' }, 'medium');
    el.dateMoviePartner.textContent = legend.emoji;

    const beatsById = {
      gate: [
        '空を見上げた。',
        '⛩️雲より下に、とりいがひとつ浮かんでいる。',
        '風はない。',
        'それなのに、とりいが少しだけこちらへかたむいた。',
        '「……いま、動いたよね?」',
      ],
      stairs: [
        '野原のまんなかに、階段だけが立っていた。',
        '「……どこ行くの、これ」',
        'のぼってものぼっても、何段目かわからない。',
        'いったんおりて振り返る。',
        '階段は、3段しかなかった。',
        '「もうのぼらない」',
      ],
      boss: [
        '🦑とてつもなく大きなイカがあらわれた。',
        'ダイオウイカは、ものすごく丁寧におじぎをした。',
        '🦑「このたびは、まことに申し訳ございませんでした」',
        '「……なにが?」',
        '🦑もう一度、深々とおじぎをした。',
        '「まあ……いいよ」',
        '🦑ダイオウイカは帰っていった。',
      ],
      lamp: [
        'まっくらな道の先に、小さなあかりがひとつ。',
        '近づくと、暗がりから声がした。',
        '「おかえり」',
        '「……ただいま?」',
        '振り返ると、あかりだけがまだそこにあった。',
      ],
      mirror: [
        '水たまりをのぞきこんだ。',
        'そこには、ずっと年をとった自分がいた。',
        '「……これ、自分?」',
        '水の中の自分だけが、先にわらった。',
        '何かを言いかけた瞬間、水面がゆれた。',
        '消える直前の顔は、おだやかだった。',
      ],
    };
    // 文ごとに混ぜず、一つの短い物語を丸ごと選ぶ。
    const alternateBeatsById = {
      "gate": [
        "空にとりいが浮かんでいた。",
        "少しだけおじぎをしてみた。",
        "とりいの向こうに、同じ空が見えた。",
        "「……通ってないのに、通った気がする」",
        "振り返ると、とりいはまた遠くにいた。"
      ],
      "stairs": [
        "行き先のない階段に座ってみた。",
        "ひと休みしただけなのに、景色がひとつ上がっていた。",
        "「……今、のぼった?」",
        "足はずっと同じ段にあった。",
        "もう少し座るのはやめておいた。"
      ],
      "boss": [
        "🦑大きなイカが、遠くからおじぎをしている。",
        "近づいてみたら、まだおじぎをしていた。",
        "🦑「お時間をとらせてしまい……」",
        "「話す前からあやまってない?」",
        "🦑イカは少し考えて、もう一度おじぎをした。",
        "何の用だったのかは、最後までわからなかった。"
      ],
      "lamp": [
        "遠くに小さなあかりが見えた。",
        "足を止めると、あかりも止まった。",
        "一歩進むと、少しだけ近づいた。",
        "「……待ち合わせ?」",
        "返事はなく、あかりはしばらくとなりにいた。"
      ],
      "mirror": [
        "水たまりの中で、年をとった自分が手をふった。",
        "こちらも手をふってみる。",
        "水の中の自分は、まだこちらを見ていた。",
        "「……そっちも元気?」",
        "返事のかわりに、小さな波がひとつ広がった。",
        "もう一度見ると、いつもの顔に戻っていた。"
      ]
    };
    const stories = [beatsById[legend.id], alternateBeatsById[legend.id]].filter(Boolean);
    const beats = (stories.length ? pickMovieLine(stories) : [legend.flash, legend.story]).concat([`💰足もとに${coins}コインがきちんと積まれていた。`]);
    setCommentText(el.dateMovieCaption, compactJapaneseText(beats[0]), true);
    el.dateMovieCaption.classList.add('beat');
    el.dateMovie.scrollIntoView({ block: 'nearest' });
    const step = 3500;
    for (let i = 1; i < beats.length; i += 1) {
      dateMovieTimers.push(setTimeout(() => {
        el.dateMovieCaption.classList.remove('beat');
        void el.dateMovieCaption.offsetWidth;
        setCommentText(el.dateMovieCaption, compactJapaneseText(beats[i]), true);
        el.dateMovieCaption.classList.add('beat');
        el.dateMovie.scrollIntoView({ block: 'nearest' });
      }, step * i));
    }
    dateMovieTimers.push(setTimeout(finishDateMovie, step * beats.length + 500));
  }

  // まだ みた ことの ない パターンを ゆうせんして えらぶ ので、いっしょうを
  // かさねる ほど あたらしい でんせつに であえる(ぜんぶ みた あとは
  // どれかが もういちど でる - コンプリートは じっせきに ならない)
  function triggerLegendEncounter() {
    const seen = state.lifetime.legendsMet || [];
    const unseen = LEGEND_ENCOUNTERS.filter((e) => !seen.includes(e.id));
    const pool = unseen.length ? unseen : LEGEND_ENCOUNTERS;
    // 未遭遇を優先したまま、ゆかりのある地域では重みを2倍にする。
    // 全員に最低1票を残すので、どの旅先でも全ての伝説に出会える。
    const weights = pool.map((entry) => WORLD_MASTER?.legends?.find((def) => def.id === entry.id)?.affinityRegions?.includes(state.regionId) ? 2 : 1);
    let roll = Math.random() * weights.reduce((sum, weight) => sum + weight, 0);
    const legend = pool.find((entry, index) => (roll -= weights[index]) < 0) || pool[pool.length - 1];
    state.legendMet = true;
    if (!seen.includes(legend.id)) state.lifetime.legendsMet = seen.concat(legend.id);
    const coins = Math.round(LEGEND_COIN_GIFT * coinMultiplier());
    state.lifetime.money += coins;
    state.happiness = 100;
    applyGrowth(8);
    applyDecline(-25);
    pushLifeLog(legend.emoji, `${legend.name}にであった`);
    // 一生に一度の特別イベントなので、通常通知へ長文を流さず専用ムービーで見せる。
    setMessage('');
    emotePet('love');
    playLegendEncounterMovie(legend, coins);
    saveState();
    render();
  }

  const COMPANION_RECRUIT_THRESHOLD = 50;
  const RARE_COMPANION_RECRUIT_THRESHOLD = 70;

  // なにも しなくても、放っておくと たまに キャラのほうから吹き出しで話しかけてくる
  // ひとことセリフ集。標準語 + 各地の方言 + 外国語のあいさつ + ちょっとした
  // ネタを できるだけ たくさん 用意して、待っているだけでも 飽きにくくする
  const IDLE_GREETINGS_STANDARD = [
    "ねえ、ちょっと!",
    "やあ!",
    "こんにちは!",
    "こんばんは!",
    "あ、目があった!",
    "ねえねえ!",
    "もしもし!",
    "ちょっときいて!",
    "こっちむいて!",
    "ひま?",
    "あそぼうよ!",
    "かまってかまって!",
    "げんき?",
    "なにしてるの?",
    "さみしいよ…",
    "おーい!",
    "静かだから小声で呼んでみた",
    "ひとりごときいてくれる?",
    "ちょっとじかんある?",
    "なんかはなしてよ!",
    "ボーっとしてない?",
    "休憩中ならまぜて",
    "たいくつだよ〜",
    "こっちみてこっちみて!",
    "ここにいるのは覚えといてね",
    "ねえ、ちゃんとみてる?",
    "ひさしぶりなきがする!",
    "おなかの話ならいつでもできる",
    "呼んでみただけ。聞こえた?",
    "予定のない時間を忙しく過ごしてる",
    "ふとんがこちらを見ている気がする",
    "用事を考えるのが今日の用事",
    "目があうまで待ってみた",
    "かわいい顔の練習、見てた?",
    "小銭って増える音だけ聞きたいね",
    "今日のごはん、想像だけしてる",
    "画面のこっち側も見てるよ",
    "楽しいことの入口どこ?",
    "中身もちゃんとここにいます",
    "何もしてないのに休みたくなる"
  ];

  const IDLE_GREETINGS_DIALECT = [
    // 関西弁
    'なにしてんねん!', 'げんきにしとる?', 'はなしきこか?', 'なんでやねん!',
    'ほんまに?', 'せやせや!', 'まいど!', 'おおきに!', 'ようきたな!',
    'かまへんかまへん', 'いくで〜!', 'ごっつひまやわ〜', 'ちゃうちゃう!', 'あかんて!',
    // 博多弁(福岡)
    'ちかっぱげんき?', 'なんしよっと?', 'よかよか!', 'ばりひまっちゃ〜', 'そうたい!',
    // 広島弁
    'ぶちげんき?', 'ほうじゃけん!', 'なんしょん?',
    // 名古屋弁
    'ひまになったがね', 'ええがね!', 'でらねむいがね',
    // 東北弁
    'げんきだっぺ?', 'おばんです!', 'なじょしてたん?', 'めんこいなぁ',
    // 北海道弁
    'なまらげんき?', 'したっけ〜!',
    // 土佐弁(高知)
    'げんきでやってるぜよ?', 'ようおいでたぜよ!',
    // うちなーぐち(沖縄)
    'はいさい!', 'めんそーれ!', 'なんくるないさ〜',
    // 津軽弁(青森)
    'わのこと、覚えでら?', 'どさ？ゆさ！',
    // 京都弁
    'ちょっとひと休みしましょか', 'お茶でも飲んでいきます?', 'はぁ〜、えらいわぁ',
    // 熊本弁
    'たいぎゃヒマばい！', 'どぎゃんしたと？',
        '腹減ってしゃーないわ！',
    'なあなあ、ちょっと話そ?',
    'ひまの予定、あきすぎやわ',
    'めっちゃ好きやねんけど、知ってた？',
    'なんでやねん。…いまのは練習',
    'あー、たこ焼き食いたなってきた',
    'ちかっぱ腹減ったばい！',
    'なんしとーと？こっち来んね！',
    'でらヒマだわー！',
    'なまら眠いべさ…',

  ];

  const IDLE_GREETINGS_FOREIGN = [
    'Hello!', 'Hi there!', 'Hey!', 'Bonjour!', 'Hola!', 'Ciao!', 'Guten Tag!',
    '你好!', '안녕!', 'Aloha!', 'Namaste!', 'Привет!', "G'day mate!", 'Salut!',
    'Hej!', 'Olá!', 'Merhaba!', 'Shalom!', 'Yo!', 'Howdy!',
  ];

  const IDLE_GREETINGS_SILLY = [
    "ンモー!",
    "なんちゃって!",
    "ジャジャン!",
    "びっくりした?",
    "あなたのばんです!",
    "ぴぴぴっ!",
    "ドキッとした?",
    "あそびにきたよ!",
    "ここにいるよー!",
    "きゅうにはなしかけてごめんね!",
    "いまのぼく、たぶん天才",
    "冷蔵庫に何かいた気がする",
    "人類はなぜねむるのか…ぼくはねむいから",
    "今日ちょっと顔よくない?",
    "急に市役所いく?",
    "笑う理由を後から考えてる",
    "座る場所に先を越された",
    "いまの声、宇宙まで届いた?",
    "足音だけ立派に歩いてみる",
    "かっこいいポーズ、受付中",
    "筋肉より先にやる気が疲れた",
    "振り返る用事、いま作った",
    "頭の中だけ少し踊ってる",
    "話し出したら話題を忘れた",
    "えらそうな顔ってどれだろ",
    "心の中でアンコールしてる",
    "歩くリズムが途中で迷子",
    "影とじゃんけんしたら引き分けた"
  ];

  const IDLE_GREETINGS = [
    ...IDLE_GREETINGS_STANDARD,
    ...IDLE_GREETINGS_FOREIGN,
    ...IDLE_GREETINGS_SILLY,
    'ひまの予定、重なったね',
    '呼ぶ前にこっち向いたね',
    '何か言う顔だけ先にできた',
    '視線の先に参加していい?',
    '動き出す理由を探してる',
    '好きな顔ってこういう顔?',
    '小さく踊る準備はできた',
    '腹筋の前に休憩を入れる',

  ];

  let lastIdleGreeting = null;

  let lastPlayWithReaction = null;
  let lastCourtReaction = null;
  let lastTravelReaction = null;

  function pickReaction(pool, lastPicked) {
    const choices = pool.length > 1 ? pool.filter((m) => m !== lastPicked) : pool;
    return choices[Math.floor(Math.random() * choices.length)];
  }

  // いまの人生で本当に起きた出来事だけを、本人がたまに思い出して話す。
  // lifeLog にない出来事は会話に使わないので、「やっていないことを覚えている」
  // という嘘の記憶は作らない。通常のランダム会話もそのまま残す。
  const MEMORY_RECALL_MARKERS = [
    'びょうきをなおしてもらった',
    'こいびとになった',
    'けっこんした',
    'デートにいった',
    'はじめてのデートにいった',
    'デートのおもいで:',
    'とくべつなデートのおもいで:',
    'とくべつな旅のおもいで:',
    'なかなおりした',
    'なかまになった',
    'はじめてであった',
    'たどりついた',
    'へんしんした',
    'れんくんにであった',
    'にであった',
  ];
  let lastMemoryRecallKey = null;

  // Compare current copy with old spaced logs without rewriting saved history.
  function lifeLogTextKey(text) {
    const key = String(text).replace(/[ \u3000]/g, '').replace(/^\d+さい/, '');
    if (!key.startsWith('デートのおもいで:')) return key;
    return key.replace(/雨やどりをした$/, 'あめやどりをした')
      .replace(/ふたりで写真をとった$/, 'ふたりでしゃしんをとった')
      .replace(/流れ星をさがした$/, 'ながれぼしをさがした')
      .replace(/夕やけをふたりでみた$/, 'ゆうやけをふたりでみた');
  }

  function pickMemoryGreeting() {
    if (!Array.isArray(state.lifeLog)) return null;
    const memories = state.lifeLog.filter((entry) => {
      if (!entry || typeof entry.text !== 'string') return false;
      const text = lifeLogTextKey(entry.text);
      return MEMORY_RECALL_MARKERS.some((marker) => text.includes(marker))
        || /^はじめて.+にいった[。!！]?$/.test(text);
    });
    if (!memories.length) return null;

    // 年を重ね、思い出がいくつもできた個体は、ときどき人生全体を振り返る。
    if (currentAge() >= 40 && memories.length >= 3 && Math.random() < 0.2) {
      return `もう${currentAge()}さいかぁ。いろいろあったね`;
    }

    const recent = memories.slice(-12);
    const keyOf = (entry) => `${entry.age}|${entry.icon || ''}|${entry.text}`;
    const choices = recent.length > 1
      ? recent.filter((entry) => keyOf(entry) !== lastMemoryRecallKey)
      : recent;
    const entry = choices[Math.floor(Math.random() * choices.length)] || recent[recent.length - 1];
    if (!entry) return null;
    lastMemoryRecallKey = keyOf(entry);

    const text = lifeLogTextKey(entry.text)
      .replace(/[。!！]+$/, '');
    const eventAge = Number(entry.age);
    const when = Number.isFinite(eventAge)
      ? (currentAge() <= eventAge + 1 ? 'このまえ' : `${eventAge}さいのとき`)
      : 'あのとき';

    let lines;
    if (text === 'びょうきをなおしてもらった') {
      lines = [when + 'の看病、ありがとう', '元気になったとき、ほっとしたね'];
    } else if (text.startsWith('とくべつなデートのおもいで:')) {
      lines = ['あのとくべつなデート、覚えてる?', 'あの日のごほうび、使ってよかったね'];
    } else if (text.startsWith('とくべつな旅のおもいで:')) {
      lines = ['ごほうびを使った旅、覚えてる?', 'あの旅は、少し特別だったね'];
    } else if (/デート/.test(text)) {
      const detail = /あめやどり/.test(text) ? '雨やどり'
        : /しゃしん/.test(text) ? '写真をとった日'
        : /ながれぼし/.test(text) ? '流れ星を探した日'
        : /ゆうやけ/.test(text) ? '夕やけを見た日'
        : /光るさかな/.test(text) ? '光る魚を見た日'
        : /岩かげ/.test(text) ? '岩かげで休んだ日'
        : /小さな光/.test(text) ? '海で光を探した日' : 'デート';
      lines = ['あの' + detail + '、まだ覚えてる', when + 'のデート、思い出してた'];
    } else if (/けっこんした/.test(text)) {
      lines = ['けっこんした日の顔、思い出すと照れる', when + 'の結婚のこと、覚えてるよ'];
    } else if (/こいびとになった/.test(text)) {
      lines = ['恋人になった日のこと、ふと思い出した', 'あの返事、聞いたあともどきどきしてた'];
    } else if (/なかなおりした/.test(text)) {
      lines = ['あのとき、ちゃんと話してよかった', '仲直りのあと、やっとひと息つけたね'];
    } else if (/なかまになった/.test(text)) {
      lines = ['仲間がふえた日のこと、覚えてる?', 'あの出会いから、少しにぎやかになったね'];
    } else if (/へんしんした/.test(text)) {
      lines = ['前の姿も、ちゃんと自分だったなあ', when + 'の変身、ちょっと驚いたね'];
    } else if (/たどりついた|にいった/.test(text)) {
      lines = ['初めての場所に着いた顔、覚えてる?', when + 'の旅、ふと思い出した'];
    } else {
      lines = [when + 'の出会い、まだ覚えてる', 'あの出会いのこと、たまに思い出す'];
    }
    return pickConversationLine(lines);
  }

  // rewards for a great minigame result: each heals the death meter by a
  // different amount. weight controls drop rarity - the strongest healers
  // (kiss, hug) are the rarest, weaker ones are common, so a big stock of
  // items still tends to be mostly low-tier
  // ================================================================
  // ごほうび(かいふくアイテム)
  // ================================================================
  // 日常ステータスは「たべる・あそぶ・ねる・くすり」で戻せるため、
  // ごほうびの主役にはしない。ごほうびは一生の中でたまる「おとろえ」を
  // ほどくもの、上位はさらに「いのち」を立て直すものとして役割を分ける。
  // rank が上がるほど希少で、人生ダメージへの回復力も大きくなる。
  const RECOVERY_ITEMS = [
    { id: 'reward', label: 'ごほうび', emoji: '🎁', tier: 'special', rank: 1, weight: 1,
      effects: {}, desc: 'デートやたびをとくべつなおもいでにできる' },
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

  function randomFunItem() {
    return FUN_ITEMS[Math.floor(Math.random() * FUN_ITEMS.length)];
  }

  function playFunScene(item) {
    clearConversationTimers();
    hideSpeechBubble();
    setMessage(item.narration || `${item.emoji} ${item.label}であそんだ`);
    showStoryEvent({ emoji: item.emoji, item, message: item.label });
    emotePet(item.emote || 'fun');

    const beats = [{ speaker: petSpeaker(), text: pickConversationLine(item.petLines) }];
    if (state.partner && Math.random() < 0.85) beats.push({ speaker: partnerSpeaker(), text: pickConversationLine(item.partnerLines) });
    if (state.companions.length && Math.random() < 0.85) beats.push({ speaker: companionSpeaker(), text: pickConversationLine(item.companionLines) });

    const crownExtra = hasNaotoItem('naoto_crown') && Math.random() < 0.25;
    if (crownExtra) beats.push({ speaker: petSpeaker(), text: '👑きょうはなんだかとくべつ!' });

    playConversationBeats(beats);
  }

  const RECOVERY_EFFECT_LABELS = {
    hunger: 'おなか', happiness: 'ごきげん', energy: 'げんき',
    health: 'けんこう', decline: 'おとろえ', life: 'いのち',
  };




  // ================================================================
  // ねんれい / ライフステージ - ゆいいつの 真実
  // ================================================================
  // state.ageTicks だけが 本もので、ねんれいも すがたも すべて そこから
  // 導出する。stageIndex は キャッシュ するだけで、けっして これを
  // ちょくせつ 書きかえて すがたを かえたり しない(むかしの
  // triggerEvolutionJump/triggerDevolutionJump は この やりかたの せいで
  // ねんれいを 大きく まきもどす バグを かかえていた)
  function currentAge() {
    return Math.min(GOAL_AGE, Math.floor(state.ageTicks / AGE_TICKS_PER_YEAR));
  }

  function stageForAge(age) {
    for (let i = LIFE_STAGES.length - 1; i >= 0; i -= 1) {
      if (age >= LIFE_STAGES[i].min) return i;
    }
    return 0;
  }

  // そだちを その値から 1 あげるのに ひつような せいちょう量
  function sodachiCost(value) {
    for (const band of SODACHI_COST_BANDS) {
      if (value <= band.max) return band.cost;
    }
    return SODACHI_COST_BANDS[SODACHI_COST_BANDS.length - 1].cost;
  }

  // マイグレーション中や たまごの あいだは 演出を いっさい 出さない ための フラグ
  let suppressLifeEvents = false;

  function hatchEgg() {
    audio.play('hatch');
    state.speciesLine = pickDreamLine() || pickRandomLine();
    state.stage = STAGE.GROWING;
    state.ageTicks = 0;
    state.stageIndex = 0;
    const identity = rollIdentity(state.speciesLine);
    state.gender = identity.gender;
    state.orientationId = identity.orientationId;
    state.attractedTo = identity.attractedTo;
    setMessage('たまごがぱかり。ちいさななおとっちと、目があった。');
    emotePet('happy');
    pushLifeLog('🥚', 'たまごからうまれた');
  }

  // ねんれいが かわった しゅんかんに よばれる。ライフステージの さかいを
  // またいだ ときだけ「すがたが かわった」演出に なり、それいがいは
  // ちいさな たんじょうび演出に なる
  function onAgeChanged(prevAge) {
    const age = currentAge();
    if (age === prevAge) return;
    const before = stageForAge(prevAge);
    const after = stageForAge(age);
    state.stageIndex = after;
    state.lifetime.maxAgeReached = Math.max(state.lifetime.maxAgeReached, age);
    if (suppressLifeEvents) return;
    if (after !== before) onStageChanged(before, after, age);
    else onBirthday(age);
  }

  function onStageChanged(before, after, age) {
    const stage = SPECIES[state.speciesLine].stages[after];
    setMessage(stage.message || `${stage.label}になった!`);
    emotePet('fun');
    state.lifetime.money += 100;
    pushLifeLog(stage.emoji, `${age}さい${stage.label}になった`);
    showStoryEvent({ emoji: stage.emoji, petReaction:true, message: `${age}さいになった！\n${stage.label}` });
    celebrateAgeSpeech(age, stage.label);
    checkStoryEvents('evolve');
    // すがたが かわった しゅんかんだけ、へんしんの ちゅうせんを おこなう
    rollTransformChance();
  }

  // 1さいごと: ちいさな トースト。5さいごと: すこし にぎやか。
  // 10さいごと: 「としの おくりもの」(そだち30で 解禁)
  // 40〜70さいは すがたの かわりめが 18分・30分と あいて、なにも おきない
  // じかんが ながかった。その あいだを うめる、1かいずつの ちいさな できごと
  const MIDLIFE_EVENTS = [
    { age: 44, emoji: '🎣', solo: '趣味を見つけた。静かな時間が好きになった', pair: 'ふたりで趣味をはじめた。静かな時間を分けあった', happiness: 10, growth: 6 },
    { age: 50, emoji: '🎂', solo: '50さいのお祝い。遠くから手紙が届いた', pair: '50さいのお祝い。こいびととお祝いの時間を過ごした', happiness: 8, money: 150 },
    { age: 56, emoji: '📚', solo: '昔のアルバムを開いた。笑っている自分がいた', pair: '昔のアルバムをふたりで開いた。笑っている自分たちがいた', happiness: 6, decline: -10 },
    { age: 62, emoji: '🌻', solo: '庭に小さな花を植えた。明日が少し楽しみになった', pair: 'ふたりで庭に花を植えた。明日が少し楽しみになった', happiness: 6, growth: 8 },
    { age: 66, emoji: '🧳', solo: '小さな旅の計画を立てた。つぎの旅はきっといい日になる', pair: 'ふたりで旅の計画を立てた。つぎの旅はきっといい日になる', money: 100, travelCharm: true },
  ];
  function maybeMidlifeEvent(age) {
    const ev = MIDLIFE_EVENTS.find((e) => e.age === age);
    if (!ev || state.stage !== STAGE.GROWING || state.infinite) return false;
    const seen = state.midlifeSeen || (state.midlifeSeen = []);
    if (seen.includes(age)) return false;
    seen.push(age);
    const text = state.partner ? ev.pair : ev.solo;
    if (ev.happiness) state.happiness = clamp(state.happiness + ev.happiness, 0, 100);
    if (ev.money) state.lifetime.money += ev.money;
    if (ev.growth) applyGrowth(ev.growth, { silent: true });
    if (ev.decline) applyDecline(ev.decline);
    if (ev.travelCharm) state.oneTimeBoosts.travelGuarantee = true;
    const extra = [ev.money ? `💰+${ev.money}` : '', ev.travelCharm ? '🧭たびのおまもりが手元にある' : ''].filter(Boolean).join('／');
    pushLifeLog(ev.emoji, `${age}さい：${text}`);
    showStoryEvent({ emoji: ev.emoji, petReaction: true, message: `${text}${extra ? '\n' + extra : ''}` });
    return true;
  }

  function onBirthday(age) {
    applyGrowth(2, { silent: true });
    celebrateAgeSpeech(age);
    applyDecline(-5, { silent: true });
    maybeMidlifeEvent(age);
    const bonus = Math.round((3 + state.maxSodachi / 25) * coinMultiplier());
    state.lifetime.money += bonus;
    if (age % 10 === 0 && Math.random() < (isEquipped('itemluck1') ? 0.32 : 0.25)) {
      state.items.reward = (state.items.reward || 0) + 1;
      setMessage(`🎁 ${age}さい。どこからかごほうびが1ことどいた!`);
      emotePet('love');
    } else if (age % 5 === 0) {
      const fun = randomFunItem();
      state.items[fun.id] = (state.items[fun.id] || 0) + 1;
      setMessage(`🎂 ${age}さい。${fun.emoji}${fun.label}をもらって、さっそくしまいこんだ`);
      emotePet('happy');
    } else {
      setBirthdayToast(`🎂 ${age}さいになった`);
    }
    if (age === 90) {
      state.miracleGuard = true;
      setMessage('🌅 90さい。いつもの場所で、しばらくゆっくりしていた');
    }
  }

  // ================================================================
  // そだち / せいちょう / おとろえ
  // ================================================================
  function growthMultiplier() {
    return state.boostTicks > 0 ? 2 : 1;
  }
  // せいちょう2ばい: ミニゲームの Sランクで 2ふん、きょうの チャレンジで 10ぷん(かさなる、さいだい 10ぷん)
  const BOOST_TICKS_S_RANK = 40;
  const BOOST_TICKS_DAILY = 200;
  const BOOST_TICKS_MAX = 200;
  // きょうの チャレンジの ごほうび: きほん 10 + れんぞく日数に おうじて +5/日(さいだい 60)、
  // 3・7・14・30にち の ふしめで ボーナス
  const DAILY_STREAK_MILESTONES = { 3: 30, 7: 100, 14: 200, 30: 500 };
  function dailyStreakReward(streak) {
    const base = 10 + 5 * Math.min(Math.max(0, streak - 1), 10);
    const bonus = DAILY_STREAK_MILESTONES[streak] || 0;
    return { coins: base + bonus, milestone: bonus ? `${streak}日連続ボーナス💰${bonus}を含む` : '' };
  }
  function grantGrowthBoost(ticks) {
    if (!isLiveLife() || state.infinite) return 0;
    state.boostTicks = Math.min(BOOST_TICKS_MAX, (state.boostTicks || 0) + ticks);
    return state.boostTicks;
  }

  const RECENT_ACTION_TICKS = 20; // 60秒
  function markCared() { state.recentActionTicks = RECENT_ACTION_TICKS; }

  function applyGrowth(amount, opts) {
    // ♾️ の せかいでは そだちも とまる(アイテムで 節目報酬を 二重取り
    // できて しまわない ように、ここで まとめて ふさぐ)
    if (amount === 0 || !isLiveLife() || state.infinite) return;
    if (amount > 0 && (!opts || !opts.silent)) markCared();
    if (state.stage === STAGE.EGG) {
      state.growth += amount;
      if (state.growth >= HATCH_GROWTH) { state.growth = 0; hatchEgg(); }
      return;
    }
    state.growth += amount > 0 ? amount * growthMultiplier() : amount;
    if (state.growth < 0) state.growth = 0;
    while (state.growth >= sodachiCost(state.sodachi) && state.sodachi < SODACHI_MAX) {
      state.growth -= sodachiCost(state.sodachi);
      gainSodachi(1, opts);
    }
    if (state.sodachi >= SODACHI_MAX) state.growth = 0;
  }

  function applyDecline(amount) {
    if (amount === 0 || !isLiveLife() || state.stage === STAGE.EGG || state.infinite) return;
    state.decline = clamp(state.decline + amount, 0, DECLINE_MAX);
    while (state.decline >= DECLINE_MAX && state.sodachi > 0) {
      state.decline -= DECLINE_MAX;
      loseSodachi(1);
    }
    if (state.sodachi <= 0) state.decline = Math.min(state.decline, DECLINE_MAX * 0.6);
  }

  function gainSodachi(n, opts) {
    for (let i = 0; i < n && state.sodachi < SODACHI_MAX; i += 1) {
      state.sodachi += 1;
      state.lifetime.evolutions += 1;
      audio.play('levelup');
      if (!suppressLifeEvents) speakEvent('sodachi', { sodachi: state.sodachi, partnerChance: 0.35, companionChance: 0.35 });
      if (state.sodachi > state.maxSodachi) {
        state.maxSodachi = state.sodachi;
        // じっせき(sodachi-70/90/100)が 人生の おわりを またずに 出る ように、
        // さいこう記録は とうたつした しゅんかんに こうしんする
        state.lifetime.bestSodachi = Math.max(state.lifetime.bestSodachi || 0, state.maxSodachi);
        if (state.maxSodachi % 10 === 0) onSodachiMilestone(state.maxSodachi);
      }
    }
    if (!opts || !opts.silent) emotePet('happy');
  }

  function loseSodachi(n) {
    for (let i = 0; i < n && state.sodachi > 0; i += 1) {
      state.sodachi -= 1;
      state.lifetime.devolutions += 1;
    }
    if (!suppressLifeEvents) {
      setMessage(`そだちが${state.sodachi}にさがってしまった…`);
      emotePet('sad');
      checkStoryEvents('devolve');
    }
  }

  // そだちの 10きざみの 節目。maxSodachi ベースなので、おとろえで さがっても
  // 一度 解禁した ものは うしなわれない
  function onSodachiMilestone(value) {
    const perk = SODACHI_PERKS[value];
    if (!perk) return;
    const reward = Math.round(perk.coins * coinMultiplier());
    state.lifetime.money += reward;
    speakEvent('money', { coins: reward, partnerChance: 0.4, companionChance: 0.4 });
    pushLifeLog(perk.emoji, `そだちが${value}にとどいた— ${perk.name}`);
    showStoryEvent({ emoji: perk.emoji, message: `そだち${value}！ ${perk.name}\n${perk.desc}` });
    if (value === 90) state.lifetime.dreamEggs.rare += 1;
    if (value === 100) {
      state.lifetime.dreamEggs.normal += 1;
      state.lifetime.money += 5000;
      // 「その人生の のこりは 不死」を UI でも はっきりさせる。
      // ここで いのちを まんたんに もどし、おわかれの まえぶれも けす
      setMessage('👑そだち100。💰5000とたまごのゆめをもらった');
    } else {
      setMessage(`${perk.emoji}そだち${value}! ${perk.name}`);
    }
    emotePet('love');
  }

  function hasPerk(level) { return state.maxSodachi >= level; }

  // ================================================================
  // ④ ずかんクリア / ⑤ パーフェクトクリア の はんてい
  // ================================================================
  // 100さいで STAGE.CLEAR に はいる しくみを やめた ので、この 2つは
  // 人生の おわりでは なく「たっせいした しゅんかん」に はんていする。
  // ここを とおさないと ⑤ が 一度も 成立せず、♾️ の せかいが えいえんに
  // 解禁されない(endingTiersReached・レインボーの 解禁も とまる)
  let grandGoalPending = null;

  function checkGrandGoals() {
    if (!state.lifetime) return;
    const { dexComplete, achComplete } = endingProgress();
    // 4つの tier バッジは たっせいした ぶんを その場で えいきゅうに きろくする
    qualifyingEndingTiers().forEach((t) => {
      if (!state.lifetime.endingTiersReached.includes(t)) state.lifetime.endingTiersReached.push(t);
    });
    syncNaotoRewardItems();
    if (dexComplete && !state.lifetime.dexCleared) {
      state.lifetime.dexCleared = true;
      grandGoalPending = 'dex';
    }
    if (achComplete && !state.lifetime.perfectCleared) {
      state.lifetime.perfectCleared = true;
      // dex-complete は全実績の一部なので、⑤成立時には④も必ず成立済み。
      // 同時成立なら PERFECT を最終表示として優先する。
      grandGoalPending = 'perfect';
    }
  }

  // そだち30で +25%、70で さらに +50%(累計 ×1.75)。そだち100の
  // その人生では さらに うわのせ しない(即時5000コインで かわりに わたす)
  function coinMultiplier() {
    let m = 1;
    if (hasPerk(30)) m *= 1.25;
    if (hasPerk(70)) m *= 1.4;
    return m;
  }

  // いま「いきている 人生」を そうさ できる じょうたいか
  function isLiveLife() {
    return state.stage === STAGE.EGG || state.stage === STAGE.GROWING;
  }

  function triggerDeath() {
    clearConversationTimers();
    hideSpeechBubble();
    state.stage = STAGE.DEAD;
    audio.play('die');
    state.lifetime.deaths += 1;
    state.dying = false;
    state.lifetime.bestSodachi = Math.max(state.lifetime.bestSodachi || 0, state.maxSodachi);
    pushLifeLog(currentSprite(), `${currentAge()}さいでてんごくへいった`);
    setMessage('てんごくへいってしまった。いつもの場所が、少し静かになった。');
  }

  // 100さい到達。すぐに きろくカードへ とばさず、まず「さいごの じかん」に はいる。
  // ここでは そだち・ずかん・じっせき・コインが すべて とまるので、
  // 「もうひとつの freePlay」には ならない(§12)
  function enterFarewell() {
    clearConversationTimers();
    hideSpeechBubble();
    state.stage = STAGE.FAREWELL;
    state.dying = false;
    const L = state.lifetime;
    L.clears += 1;                                              // ① てんじゅを まっとうした
    if (state.maxSodachi >= LIFE_CLEAR_SODACHI) L.lifeClears += 1; // ② いっしょうクリア
    if (state.maxSodachi >= SODACHI_MAX) L.bestLives += 1;      // ③ さいこうの いっしょう
    if (state.lifetime.devolutions === state.declineBaseline) L.flawlessLives += 1;
    pushLifeLog('🎊', '100さいになった—てんじゅをまっとうした');
    setMessage('🎊100さい。なおとっちは、部屋のすみずみに小さくうなずいた');
    // ①〜③は条件を累積記録し、最高位のクリア画面を1枚だけ出す。
    grandGoalPending = 'life';
    syncNaotoRewardItems();
    emotePet('love');
  }

  // ⑤ パーフェクトクリア後だけ はいれる ♾️ の せかい。ねんれい・いのち・
  // そだちが とまり、ずかんから すきな すがたを えらべる ようになる
  // ♾️ は「べつの ごほうびモード」であって、人生の やりなおしでは ない。
  // はいる まえの 人生を まるごと しまってから きりかえる ので、
  // 「いっしょうに もどる」で ねんれい・そだち・なかま・こいびとまで
  // そのまま かえってくる(§27「♾️ ⇄ 通常の人生を いつでも 行き来できる」)
  function enterInfinite() {
    if (state.infinite) return;
    // ずかん・じっせき・lifetime は 人生を またぐ きろく な ので しまわない。
    // = ♾️ の あいだに ふえた おかね・ずかん・じっせきは もどっても のこる
    const snapshot = JSON.parse(JSON.stringify(state));
    delete snapshot.lifetime;
    delete snapshot.discoveredStages;
    delete snapshot.achievementsUnlocked;
    delete snapshot.infiniteReturn;
    state.infiniteReturn = snapshot;
    state.stage = STAGE.GROWING;
    state.infinite = true;
    state.dying = false;
    state.dyingTicks = 0;
    state.lifetime.perfectCleared = true;
    setMessage('♾️年齢から自由になった!ずかんから好きな姿を選べるよ');
    emotePet('love');
  }

  // ♾️ から ふつうの 人生へ もどる。lifetime.resets も pastLives も
  // ふやさない し、じっせき用の カウンタにも さわらない - ♾️ に
  // でいりした こと じたいは、なにも きろくに のこさない
  function exitInfinite() {
    if (!state.infinite) return;
    const snapshot = state.infiniteReturn;
    // 人生を またぐ きろくは そのまま ひきつぐ(♾️ で えた ぶんも のこす)
    const lifetime = state.lifetime;
    const discoveredStages = state.discoveredStages;
    const achievementsUnlocked = state.achievementsUnlocked;
    if (!snapshot) {
      // ふるい セーブ(旧 freePlay からの ひきつぎ など)には しまってある
      // 人生が ない。その ばあいだけ あたらしい たまごから はじめる
      state = freshState();
      state.lifetime = lifetime;
      state.discoveredStages = discoveredStages;
      state.achievementsUnlocked = achievementsUnlocked;
      state.declineBaseline = lifetime.devolutions || 0;
      setMessage('あたらしいたまごがやってきた…');
      emotePet('happy');
      return;
    }
    state = Object.assign({}, snapshot, {
      lifetime,
      discoveredStages,
      achievementsUnlocked,
      infinite: false,
      infiniteForm: null,
      infiniteReturn: null,
    });
    setMessage('♾️のせかいから、この子のいっしょうにもどってきた');
    emotePet('happy');
  }

  // 人生の きろくカード。死亡時・100さい到達時に 見せる
  function buildLifeCard() {
    const L = state.lifetime;
    const age = currentAge();
    const species = SPECIES_DISPLAY_NAMES[state.speciesLine] || '???';
    const rows = [];
    rows.push(`<div class="lifecard-title">${currentSprite()} ${species}</div>`);
    rows.push(`<div class="lifecard-age">${age}さいまでいきた</div>`);
    // SECRET れんくんが天寿をまっとうした人生だけ、通常カードの情報を
    // 削らずに小さな専用回想を添える。別Renderer/別エンディングにはせず、
    // 248形態共通の人生記録フローを保ったまま「同じ一人が育った」ことを見せる。
    if (state.speciesLine === 'ren' && age >= GOAL_AGE) {
      const renStages = SPECIES.ren?.stages || [];
      const renMemories = [0, 2, 4, 5, 7]
        .map((stageIndex) => renStages[stageIndex])
        .filter(Boolean)
        .map((stage) => `<span class="lifecard-ren-stage">${stageVisualHTML(stage, 'thumb')}<small>${stage.label}</small></span>`)
        .join('<span class="lifecard-ren-arrow">→</span>');
      if (renMemories) {
        rows.push(`<div class="lifecard-ren-memory"><div class="lifecard-ren-caption">⭐れんくんのいっしょう</div><div class="lifecard-ren-stages">${renMemories}</div><div class="lifecard-ren-message">小さかったれんくんも、たくさんの思い出といっしょにおじいちゃんになった。</div></div>`);
      }
    }
    rows.push(`<div class="lifecard-line">さいごのそだち<b>${state.sodachi}</b>／さいこうのそだち<b>${state.maxSodachi}</b></div>`);
    const badges = [];
    if (age >= GOAL_AGE) badges.push('★①てんじゅをまっとうした');
    if (age >= GOAL_AGE && state.maxSodachi >= LIFE_CLEAR_SODACHI) badges.push('★②いっしょうクリア');
    if (age >= GOAL_AGE && state.maxSodachi >= SODACHI_MAX) badges.push('★③さいこうのいっしょう');
    if (badges.length) rows.push(`<div class="lifecard-badges">${badges.join('<br>')}</div>`);
    rows.push(`<div class="lifecard-line">へんしん${state.transformsThisLife}かい／なかま${state.companions.length}にん／${state.partner && state.partner.married ? 'けっこんした' : state.partner ? 'こいびとがいた' : 'こいびとなし'}</div>`);
    if (state.datesThisLife > 0) {
      rows.push(`<div class="lifecard-line">デート${state.datesThisLife}かい${state.legendMet ? '／でんせつにであった' : ''}</div>`);
    } else if (state.legendMet) {
      rows.push('<div class="lifecard-line">でんせつにであった</div>');
    }
    rows.push(`<div class="lifecard-line">びょうきを${state.totalSicknessCount}かいのりこえた／ずかん${state.discoveredStages.length}／${ALL_LINES.length * STAGES_PER_LINE}</div>`);
    const stats = lifeSummaryStats();
    if (stats.bestGame) rows.push(`<div class="lifecard-line">いちばんとくいなゲーム: ${stats.bestGame.emoji}${escapeHtml(stats.bestGame.name)} ${stats.bestGame.best}てん</div>`);
    const log = state.lifeLog || [];
    if (log.length) {
      rows.push('<div class="lifecard-sep"></div>');
      rows.push(`<div class="lifecard-timeline">${buildLifeTimelineHTML(log)}</div>`);
    }
    rows.push('<div class="lifecard-code"><button type="button" class="profile-code-btn" id="lifeCardCodeBtn">📋いっしょうカードのコード</button><textarea readonly class="profile-code-input hidden" id="lifeCardCodeText" rows="2"></textarea><div class="profile-hint hidden" id="lifeCardCodeCopied">コピーした!</div></div>');
    return rows.join('');
  }

  // --- いっしょうの ねんぴょう: lifeLog を ねんれい ごとに ならべる ---
  function buildLifeTimelineHTML(log, limit = 0) {
    const entries = (Array.isArray(log) ? log : []).filter((e) => e && typeof e.text === 'string');
    const shown = limit > 0 ? entries.slice(-limit) : entries;
    if (!shown.length) return '<div class="life-timeline-empty">まだ できごとは ない</div>';
    let lastAge = null;
    return '<div class="life-timeline">' + shown.map((e) => {
      const ageCell = e.age !== lastAge ? `<span class="life-timeline-age">${e.age}さい</span>` : '<span class="life-timeline-age"></span>';
      lastAge = e.age;
      return `<div class="life-timeline-row">${ageCell}<span class="life-timeline-icon">${escapeHtml(e.icon || '')}</span><span class="life-timeline-text">${escapeHtml(compactJapaneseText(e.text))}</span></div>`;
    }).join('') + '</div>';
  }
  function lifeSummaryStats() {
    const records = state.lifetime.minigameRecords || {};
    let bestGame = null;
    for (const game of buildMinigamePool()) {
      const r = records[game.id];
      if (r && (!bestGame || r.best > bestGame.best)) { const info = minigameInfo(game); bestGame = { id: game.id, name: info.name, emoji: info.emoji, best: r.best }; }
    }
    return {
      species: SPECIES_DISPLAY_NAMES[state.speciesLine] || '???',
      age: currentAge(),
      sodachi: state.maxSodachi,
      partner: state.partner ? { label: state.partner.label, married: !!state.partner.married } : null,
      companions: state.companions.length,
      transforms: state.transformsThisLife || 0,
      sickness: state.totalSicknessCount || 0,
      legend: !!state.legendMet,
      bestGame,
    };
  }
  // いっしょうカードの コード: 'NTL1.' + base64url(JSON)。セーブコードと おなじ かたちで
  // ともだちに おくれる。よみこんでも セーブは かわらず、カードとして 見るだけ
  const LIFE_CODE_PREFIX = 'NTL1.';
  function encodeLifeCode(snapshot) {
    const s = snapshot || { ...lifeSummaryStats(), emoji: currentSprite(), line: state.speciesLine, log: (state.lifeLog || []).slice(-40) };
    const json = JSON.stringify({ v: 1, ...s });
    const bytes = new TextEncoder().encode(json);
    let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return LIFE_CODE_PREFIX + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodeLifeCode(code) {
    const t = (code || '').trim();
    if (!t.startsWith(LIFE_CODE_PREFIX)) throw new Error('これは いっしょうカードの コードでは ない');
    let b64 = t.slice(LIFE_CODE_PREFIX.length).replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const bin = atob(b64); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || parsed.v !== 1 || typeof parsed.species !== 'string' || !Array.isArray(parsed.log)) throw new Error('カードの なかみが ちがう');
    return parsed;
  }
  function lifeCodeCardHTML(card) {
    const badges = [];
    if (card.age >= GOAL_AGE) badges.push('★てんじゅ');
    if (card.age >= GOAL_AGE && card.sodachi >= LIFE_CLEAR_SODACHI) badges.push('★いっしょうクリア');
    if (card.age >= GOAL_AGE && card.sodachi >= SODACHI_MAX) badges.push('★さいこう');
    return `<div class="life-code-card"><div class="life-code-head">${escapeHtml(card.emoji || '')} ${escapeHtml(card.species)}・${card.age}さい・そだち${card.sodachi}${badges.length ? ' ' + badges.join(' ') : ''}</div>`
      + `<div class="life-code-line">${card.partner ? (card.partner.married ? '💍' : '💖') + escapeHtml(card.partner.label) : 'こいびとなし'}／なかま${card.companions}にん／へんしん${card.transforms}かい${card.bestGame ? `／${escapeHtml(card.bestGame.emoji || '')}${escapeHtml(card.bestGame.name)} ${card.bestGame.best}てん` : ''}</div>`
      + buildLifeTimelineHTML(card.log) + '</div>';
  }
  function renderLifeTimeline() {
    if (!el.profileTimeline) return;
    const s = lifeSummaryStats();
    const head = state.stage === STAGE.EGG ? 'たまごを あたためている' : `${escapeHtml(s.species)}・${s.age}さい・そだち${s.sodachi}${s.bestGame ? `・${s.bestGame.emoji}${escapeHtml(s.bestGame.name)} ${s.bestGame.best}てん` : ''}`;
    el.profileTimeline.innerHTML = `<div class="life-timeline-head">${head}</div>` + buildLifeTimelineHTML(state.lifeLog || []);
    if (el.profilePastLives) {
      const past = (state.lifetime.pastLives || []).slice().reverse();
      el.profilePastLives.innerHTML = past.length
        ? past.slice(0, 12).map((p, i) => `<details class="past-life"><summary>${escapeHtml(p.emoji || '')} ${escapeHtml(p.species || '???')}・${p.age}さい・そだち${p.sodachi}${p.married ? '・💍' : ''}${p.companions ? `・なかま${p.companions}` : ''}</summary>${Array.isArray(p.log) && p.log.length ? buildLifeTimelineHTML(p.log) : '<div class="life-timeline-empty">この子の ねんぴょうは のこっていない(古いきろく)</div>'}${p.code ? `<button type="button" class="profile-code-btn past-life-code-btn" data-code="${escapeHtml(p.code)}">📋いっしょうカードのコード</button>` : ''}</details>`).join('')
        : '<div class="profile-hint">まだ おわかれした子は いない</div>';
    }
  }
  // --- エラーのきろく(データ画面): さいきんの エラーと セーブコードを まとめて コピー ---
  function renderErrorLog() {
    if (!el.errorLogList) return;
    const list = runtimeErrors.slice().reverse();
    el.errorLogList.innerHTML = list.length
      ? list.map((e) => { const d = new Date(e.at); const t = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; return `<div class="error-log-row"><span class="error-log-time">${t}</span><span class="error-log-where">${escapeHtml(e.where)}</span><span class="error-log-msg">${escapeHtml(e.message)}</span></div>`; }).join('')
      : '<div class="profile-hint">エラーは きろくされていない</div>';
    if (el.errorLogSummary) el.errorLogSummary.textContent = list.length ? `エラーのきろく(${list.length}けん)` : 'エラーのきろく(なし)';
  }
  function errorReportText() {
    let save = '';
    try { save = encodeSaveCode(JSON.stringify(state)); } catch (e) { save = '(セーブコードを つくれなかった)'; }
    const lines = runtimeErrors.map((e) => `[${new Date(e.at).toISOString()}] ${e.where}: ${e.message}${e.stack ? '\n' + e.stack : ''}`);
    return `なおとっち エラーレポート ${new Date().toISOString()}\nUA: ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}\n\n${lines.join('\n\n') || '(エラーなし)'}\n\nセーブコード:\n${save}`;
  }

  function showLifeCard() {
    el.lifeCardBody.innerHTML = buildLifeCard();
    el.lifeCardOverlay.classList.toggle('rainbow', state.maxSodachi >= SODACHI_MAX);
    el.lifeCardOverlay.classList.toggle('gold', state.maxSodachi >= LIFE_CLEAR_SODACHI && state.maxSodachi < SODACHI_MAX);
    el.lifeCardOverlay.classList.remove('hidden');
    el.screenNormal.classList.add('hidden');
    el.farewellBar.classList.add('hidden');
    positionWeatherSky();
  }

  // その子の いっしょうを ようやく 1行に して 歴代に つみ、あたらしい たまごへ
  function archiveLifeAndReset() {
    const L = state.lifetime;
    L.bestSodachi = Math.max(L.bestSodachi || 0, state.maxSodachi);
    L.pastLives = L.pastLives || [];
    L.pastLives.push({
      emoji: currentSprite(),
      species: SPECIES_DISPLAY_NAMES[state.speciesLine] || '???',
      age: currentAge(),
      sodachi: state.maxSodachi,
      companions: state.companions.length,
      married: !!(state.partner && state.partner.married),
      line: state.speciesLine,
      log: (state.lifeLog || []).slice(-40),
      code: encodeLifeCode(),
    });
    if (L.pastLives.length > 100) L.pastLives.shift();
  }

  // returns true if it set its own message - callers must not overwrite it
  function checkMeters() {
    if (!isLiveLife()) return false;
    if (state.stage === STAGE.EGG) return false;
    if (state.deathMeter >= 100 && !isImmortal()) {
      // 80をこえたときに始まる「おわかれの まえぶれ」は、本当に最低2分の猶予にする。
      // 以前は dyingTicks を表示用に減らすだけで、100に届くと同じtickで死亡できていた。
      if (state.dying && state.dyingTicks > 0) {
        state.deathMeter = 99;
        return false;
      }
      if (state.miracleGuard) {
        state.miracleGuard = false;
        state.deathMeter = 50;
        setMessage('もうだめかと思ったところで、なおとっちがゆっくり目をあけた');
        emotePet('happy');
        return true;
      }
      state.deathMeter = 0;
      triggerDeath();
      return true;
    }
    if (state.deathMeter >= 100) state.deathMeter = 99;
    if (state.transformMeter > 100) state.transformMeter = 100;
    return false;
  }

  // いのちが つきない じょうたい(そだち100の 特典 / なおとの リング)
  function isImmortal() {
    return state.infinite;
  }

  // ================================================================
  // おわかれの まえぶれ - 予告なく 死なせない ための しくみ
  // ================================================================
  const DYING_GRACE_TICKS = 40; // 2分
  function updateDyingWarning() {
    if (isImmortal()) { state.dying = false; state.dyingTicks = 0; return; }
    if (state.deathMeter >= 80) {
      if (!state.dying) {
        state.dying = true;
        state.dyingTicks = DYING_GRACE_TICKS;
        setMessage('なおとっちの様子がおかしい…早くおせわをしてあげて!');
        emotePet('sad');
      } else if (state.dyingTicks > 0) {
        state.dyingTicks -= 1;
      }
    } else if (state.dying) {
      state.dying = false;
      state.dyingTicks = 0;
      setMessage('なおとっちの呼吸がおちついて、いつもの顔にもどってきた');
      emotePet('happy');
    }
  }

  // 人生の きろく。変身しても 死んでも きえない。「はじめから」の ときだけ
  // lifetime.pastLives に ようやくを つんで まっさらに もどす
  function pushLifeLog(icon, text) {
    if (suppressLifeEvents) return;
    if (!Array.isArray(state.lifeLog)) state.lifeLog = [];
    state.lifeLog.push({ age: currentAge(), icon, text });
    if (state.lifeLog.length > 60) state.lifeLog.shift();
  }

  // びょうきを治した事実も「この人生の思い出」に残す。
  // 薬ボタン・万能薬・お世話パック等のどの治療経路でも同じ1件として記録する。
  function recordSicknessCure() {
    state.lifetime.sicknessCured += 1;
    state.sicknessCuredThisLife = (state.sicknessCuredThisLife || 0) + 1;
    pushLifeLog('💊', 'びょうきをなおしてもらった');
  }

  // 1さいごとの ちいさな トースト(操作を とめない)
  let birthdayToastTimer = null;
  function setBirthdayToast(text) {
    if (!el.birthdayToast) return;
    setCommentText(el.birthdayToast, text, true);
    el.birthdayToast.classList.remove('hidden');
    clearTimeout(birthdayToastTimer);
    birthdayToastTimer = setTimeout(() => {
      el.birthdayToast.classList.add('hidden');
    }, 1200);
  }

  // 「たまごの ゆめ」「でんせつの ゆめ」で 次の たまごの しゅぞくを えらんで
  // いた ばあいは それを つかう。つかったら 在庫から へらす
  function pickDreamLine() {
    const dream = state.lifetime.nextEggLine;
    if (!dream || !SPECIES[dream]) return null;
    state.lifetime.nextEggLine = null;
    return dream;
  }

  // ================================================================
  // へんしん - ライフステージが かわった しゅんかんに だけ ちゅうせん
  // ================================================================
  function rollTransformChance() {
    if (state.stage !== STAGE.GROWING || state.transformOptions) return;
    // 人生全体の変身回数上限は設けない。変身チャンス自体は
    // ライフステージが変わる節目ごとに1回だけなので、最大回数は自然に制限される。
    const stageKey = String(state.stageIndex);
    if (state.transformStageDone.includes(stageKey)) { state.transformMeter = 0; return; }
    const chance = (state.transformMeter / 100) * (1 + state.sodachi / 200);
    state.transformMeter = 0;
    if (Math.random() >= chance) return;
    const options = pickTransformCandidates();
    if (!options.length) return;
    state.transformOptions = options;
    setMessage('からだがふわっと光った。いまならすがたをかえられそう');
  }

  const STORY_FLASH_DURATION_MS = 4200;

  let lastStoryEventMessage = null;
  let deathCardShown = false;

  function checkStoryEvents(context) {
    if (state.stage === STAGE.DEAD || gameActive) return;
    const pool = STORY_EVENT_POOLS[context];
    if (!pool || pool.length === 0) return;
    if (Math.random() >= STORY_EVENT_CHANCE) return;
    // avoid showing the exact same line twice back to back when a pool
    // has more than one entry to pick from
    const choices = pool.length > 1 ? pool.filter((e) => e.message !== lastStoryEventMessage) : pool;
    const event = choices[Math.floor(Math.random() * choices.length)];
    lastStoryEventMessage = event.message;
    showStoryEvent({...event,petReaction:true});
  }

  let storyFlashTimer = null;
  let endingBadgeTipTimer = null;

  function showStoryEvent(event) {
    audio.play('notify');
    const inlineVisual = event.character ? commentActorVisual({...event.character,kind:'partner'})
      : event.environmentMoment ? commentAnimalVisual(event.emoji) || {emoji:event.emoji,illustrationContext:'environment'} : null;
    if (event.author) el.storyFlashEmoji.innerHTML = authorVisualHTML('thumb');
    else if (event.character) el.storyFlashEmoji.innerHTML = partnerVisualHTML(event.character, 'thumb');
    else if (event.item) el.storyFlashEmoji.innerHTML = itemIconHTML(event.item);
    else if (event.achievement) el.storyFlashEmoji.innerHTML = achievementIconHTML(event.achievement);
    else if (event.petReaction) el.storyFlashEmoji.innerHTML = commentSpeakerHTML(petSpeaker());
    else setCommentText(el.storyFlashEmoji, event.emoji, true, inlineVisual);
    setCommentText(el.storyFlashText, compactJapaneseText(event.message), true, inlineVisual);
    el.storyFlash.classList.remove('hidden');
    // 下のボタンから会話を開いても、作者・初遭遇の顔と台詞を見失わない。
    if (event.author || event.character) el.storyFlash.scrollIntoView({ block: 'nearest' });
    clearTimeout(storyFlashTimer);
    storyFlashTimer = setTimeout(() => {
      el.storyFlash.classList.add('hidden');
    }, STORY_FLASH_DURATION_MS);
  }

  function tick() {
    // さいごの じかん(FAREWELL)は そだち・ねんれい・いのち・ステータスの
    // すべてが とまる - お別れを ゆっくり すごす ための じかんな ので、
    // ここで なにも すすめない(§12)。♾️の せかいも ねんれいは とまる
    if (!isLiveLife()) return;

    // たまごは じかんでは かえらない。じゃれる などで「せいちょう」を
    // ためた ときだけ かえる(applyGrowth さんしょう)ので、ここでは
    // ステータスの げんしょうも ねんれいも すすめない
    if (state.stage === STAGE.EGG) return;

    if (!state.infinite) {
      const prevAge = currentAge();
      state.ageTicks += 1;
      if (currentAge() !== prevAge && currentAge() < GOAL_AGE) {
        onAgeChanged(prevAge);
        checkMarriageMilestones(prevAge, currentAge());
      }
      if (currentAge() >= GOAL_AGE) {
        state.stageIndex = stageForAge(GOAL_AGE);
        state.lifetime.maxAgeReached = GOAL_AGE;
        enterFarewell();
        return;
      }
    }

    // せいちょう2ばいの ブーストは tick が すすんでいる あいだ だけ へる
    // (ずかんや あいてむを ながめて いる あいだに とけない)
    if (state.boostTicks > 0) state.boostTicks -= 1;
    if (state.recentActionTicks > 0) state.recentActionTicks -= 1;
    // そだち50の デートの クールダウン。ずかんなどを ひらいて tick が
    // とまっている あいだは これも すすまない(おいかぜと おなじ かんがえかた)
    if (state.dateCooldownTicks > 0) state.dateCooldownTicks -= 1;

    {
      const sleepFactor = state.isSleeping ? 0.4 : 1;
      // そだち90(でんせつ)に とうたつしていると、ステータスの 自然減が 15% ゆるやかに なる
      const legendFactor = hasPerk(90) ? 0.85 : 1;
      // ちょうネクタイ/リボンけいを そうびしていると、それぞれ 満腹/機嫌の
      // 時間経過による げんしょうが ゆるやかに なる(上位アイテムほど
      // さらに ゆるやかに)
      const hungerFactor = isEquipped('bowtie') ? 0.78 : 1;
      const happinessFactor = isEquipped('ribbon') ? 0.78 : 1;
      // 満腹・機嫌の 基本の げんしょうスピード(0.6/tick)は、なにも せずに
      // 基本がめんで しばらく ながめていても あわてなくて いい よう、
      // 余裕を もたせた 大きさに おさえてある(以前は 1/tick で、放置3分
      // ほどで お世話ぎれの 状態に なってしまっていた)
      // てんき・じかんたい・きせつ・地域の こうか(envModifiers)
      const envMod = envModifiers();
      { const envNow = currentEnvironment(); noteEnvironmentSeen(envNow.time, envNow.weather, envNow.weatherSource); }
      state.hunger = clamp(state.hunger - 0.6 * sleepFactor * hungerFactor * legendFactor * envMod.hunger, 0, 100);
      state.happiness = clamp(state.happiness - 0.6 * sleepFactor * happinessFactor * legendFactor * envMod.happy, 0, 100);

      if (state.isSleeping) {
        state.sleptTicks += 1;
        // 元気回復は startSleepRecovery() の100msタイマーで滑らかに行う。
        // tick側では回復しないので、起こした後に遅れて回復することもない。
      } else {
        // 元気けいの アイテムを そうびしていると、おきている あいだの
        // げんしょうも ゆるやかに なる。基本の げんしょうスピード(0.32/tick)
        // は、「あそぶ」でミニゲームを たくさん あそべる ように、満腹・機嫌
        // よりも すこし ゆっくりめに おさえてある
        const energyFactor = isEquipped('energy1') ? 0.82 : 1;
        state.energy = clamp(state.energy - 0.32 * energyDecayMultiplier() * energyFactor * legendFactor, 0, 100);
      }

      // なおとの ひみつは日常のお世話そのものを無効化しない。

      // poop accumulates over time(そうじけいの アイテムを そうびしていると たまりにくい。
      // なおとの ランタンを もっていると そもそも 二度と たまらなくなる)
      const poopFactor = isEquipped('poop1') ? 0.7 : 1;
      if (Math.random() < 0.08 * poopFactor && state.poopCount < MAX_POOP) {
        state.poopCount += 1;
      }
      if (state.poopCount >= MAX_POOP) {
        state.happiness = clamp(state.happiness - 2, 0, 100);
      }

      // sickness risk - neglect (dirt, hunger, unhappiness, low health) raises
      // the odds of falling ill; well cared-for pets almost never trigger this
      const neglected = state.poopCount >= 2 || state.health < 50 || state.hunger < 30 || state.happiness < 30;
      // なおとの おまもりを もっていると、びょうきに ぜったいに ならない
      if (!state.isSick && neglected) {
        // マフラーけいを そうびしていると、びょうきに なる かくりつが へる
        // (上位アイテムほど さらに)
        const sicknessChance = 0.09 * (isEquipped('scarf') ? 0.65 : 1);
        if (Math.random() < sicknessChance) {
          // びょうきよけの おふだ(つかいきりアイテム)を もっていれば、
          // ここで 1かいぶん つかって びょうきを ふせぐ
          if (state.oneTimeBoosts.sicknessShieldCount > 0) {
            state.oneTimeBoosts.sicknessShieldCount -= 1;
          } else {
            const sickness = SICKNESS_TYPES[Math.floor(Math.random() * SICKNESS_TYPES.length)];
            state.isSick = true;
            state.sicknessType = sickness.label;
            state.totalSicknessCount += 1;
            applyDecline(10);
            raiseDeathMeter(6);
            setMessage(`${sickness.label}になってしまった…くすりをあげよう`);
          }
        }
      }

      // health responds to neglect - a pet with a long history of illness is
      // frailer overall: sickness hits its health harder, and it doesn't take
      // as long a losing streak to be fatal
      let healthDelta = 0;
      if (state.hunger <= 0) healthDelta -= 3;
      if (state.happiness <= 0) healthDelta -= 2;
      if (!state.isSleeping && state.energy <= 0) healthDelta -= 2;
      if (state.isSick) healthDelta -= 2 + Math.min(3, Math.floor(state.totalSicknessCount / 3));
      if (healthDelta === 0 && state.hunger > 50 && state.happiness > 50) healthDelta += 1;
      state.health = clamp(state.health + healthDelta, 0, 100);


      // track care quality for evolution
      state.careSum += (state.hunger + state.happiness + state.energy) / 3;
      state.careTicks += 1;

      // death condition: sustained critical health
      if (state.health <= 0) {
        state.lowHealthStreak += 1;
        raiseDeathMeter(4);
      } else {
        state.lowHealthStreak = 0;
      }
      const deathThreshold = Math.max(6, 15 - state.totalSicknessCount);
      // なおとの リング / そだち100 / ♾️ の あいだは この けいろでも 死亡しない
      if (state.lowHealthStreak >= deathThreshold && !isImmortal()) {
        if (state.miracleGuard) {
          state.miracleGuard = false;
          state.lowHealthStreak = 0;
          state.health = 40;
          setMessage('きせきのふんばり!もうすこしがんばる…!');
        } else {
          triggerDeath();
        }
      }

      // 「死亡」メーターは びょうき・ていけんこう・ミニゲーム大失敗・
      // たべすぎ など「なにか やらかした とき」に くわえて、としを とるほど
      // わずかに 自然にも あがる(raiseDeathMeter() を通すので、こいびと/
      // 夫婦や かんむりの けいげん効果は ここにも かかる)。
      // 「死亡メーターの 上昇が はやすぎて むずかしい」という フィードバックを
      // うけて、上限を すぐ したの wellCared による -2/tick の 自動かいふくより
      // ひかえめな 大きさに おさえてある(以前は 上限が -2を うわまわり、
      // どんなに かんぺきに お世話しても すこしずつ あがってしまっていたが、
      // いまは 4項目を 60いじょう たもてる 熟練プレイヤーなら 自然じょうしょう分を
      // 自動かいふくで うわまわり、しっかり さげられる)
      // 自然減は「怠り」と「老い」の 2本立て。ちゃんと お世話できていれば
      // おとろえが たまらないので、じつしつ ゼロに ちかい。老いのぶんは
      // ろうねん(70さい〜)からで、そだち90いじょうなら それも なくなる
      const age = currentAge();
      const fromNeglect = lerp(0, 0.8, state.decline / DECLINE_MAX);
      // 年齢そのものによる自然リスクは、幼少期と高齢期だけに持たせる。
      // 高齢期は 70さいから 100さいへ向けてなだらかに上がるが、
      // 90代に入った瞬間に「しっかりお世話していても急に赤くなる」感触を避けるため
      // 100さい直前の上限を以前の 1.15/tick から 0.90/tick へ緩和する。
      const baseAgeRisk = age < 10
        ? lerp(0.28, 0.04, age / 10)
        : age >= 70
          ? lerp(0.06, 0.90, (age - 70) / 30)
          : 0;
      // ①クリア報酬「なおとの おまもり」は、人生の両端を守る。
      // 幼少期だけでなく、70さい以降の老いによる自然リスクにも同じ軽減をかける。
      const charmProtectsAge = age < 10 || age >= 70;
      const ageRisk = charmProtectsAge && hasNaotoItem('naoto_charm') ? baseAgeRisk * 0.72 : baseAgeRisk;
      const sodachiProtection = lerp(1, 0.55, state.sodachi / SODACHI_MAX);
      const fromAge = ageRisk * sodachiProtection;
      raiseDeathMeter(fromNeglect + fromAge);

      // お世話が じゅうぶん いきとどいている あいだ(びょうきでなく、
      // おなか・ごきげん・げんき・けんこうが すべて 60いじょう)は、死亡メーターが
      // すこしずつ ひとりでに かいふくする - 回復アイテムの うんに
      // たよらず、ちゃんと お世話を つづければ じぶんの ちからで
      // さげられる。ひとつでも 60を きると その tick は かいふくしない
      const wellCared = !state.isSick
        && state.hunger >= 60
        && state.happiness >= 60
        && state.energy >= 60
        && state.health >= 60;
      if (wellCared && state.deathMeter > 0) {
        const age = currentAge();
        // 高齢になっても「ちゃんとお世話すれば いのちを戻せる」余地は残す。
        // 以前は100さい直前に 0.35/tick まで落ち、自然リスクとの差が急に開いていた。
        // 90さいだいは 老いの リスク(さいだい 0.9)が 自動かいふくを うわまわる ことが
        // あり、そだちが ひくいと 老衰も ありうる(以前は かいふくが つねに 上で 老衰が おきなかった)
        const recovery = age < 10 ? 0.7 : age >= 70 ? lerp(0.9, 0.35, (age - 70) / 30) : 1.4;
        state.deathMeter = clamp(state.deathMeter - recovery, 0, 100);
      }

      // 安定ボーナス - 4つの ステータスが そろって よく、びょうきでもなく、
      // かつ「ちょくご 60秒いないに なにか お世話した」ときだけ すこしずつ
      // せいちょうする。「直近のお世話」を 条件に いれてあるので、なおとの
      // かんむり(4ステータス常時MAX)を もっていても ほうっておくだけでは
      // そだたない - じかんでは なく お世話で そだつ、という きほんを まもる
      if (wellCared && state.recentActionTicks > 0) {
        applyGrowth(0.1, { silent: true });
        applyDecline(-0.3);
      }

      // おとろえは「おこたり」の しるし。としを とる こと じたいでは ふえない
      let declineRise = 0;
      if (state.isSick) declineRise += 0.4;
      if (state.poopCount >= MAX_POOP) declineRise += 0.5;
      if (state.hunger <= 0) declineRise += 0.3;
      if (state.happiness <= 0) declineRise += 0.3;
      if (!state.isSleeping && state.energy <= 0) declineRise += 0.3;
      if (state.health <= 0) declineRise += 0.6;
      if (declineRise > 0) applyDecline(declineRise);

      // おわかれの まえぶれ - いのちが のこり20を きったら 予告を だし、
      // そこから さいてい40tick(2分)は ぜったいに 死なせない
      updateDyingWarning();

      // こいびと/夫婦は ほうっておくと なかよし度が へっていき、0で
      // わかれてしまう - きゅうあいで ちゃんと いちゃつきつづける ひつようが ある
      decayRelationship();

      // なかまも おなじく、じゃれるを おさぼると bond が へっていき、0の
      // なかまから じゅんに はなれて いってしまう
      decayCompanionBonds();

      // そだち90の「でんせつの であい」を、この tick で おこすか どうか。
      // ていかくりつ なので いつ おきるか わからず、1つの 人生で 1かいだけ
      maybeLegendEncounter();

      // すがたの へんかは tick の あたまで ねんれいから 導出ずみ。ここでは
      // いのちの はんてい(死亡 / きせきの ふんばり)だけを おこなう
      checkMeters();
    }
  }

  // each mood gets its own hop/wobble plus a couple of floating emoji -
  // a small, immediate (100% of the time) layer of feedback that sits
  // alongside the bigger but rarer full-screen STORY_EVENT_POOLS flashes
  const EMOTE_CONFIG = {
    happy: { animClass: 'emote-happy', particles: ['💖', '✨'], duration: 620 },
    // 🎉 はクリア等の本当のお祝い専用。通常の「たのしい」リアクションで
    // 画面左上に飛び込んで見えることがあったため、日常演出では使わない
    fun: { animClass: 'emote-fun', particles: ['⭐', '✨'], duration: 720 },
    sad: { animClass: 'emote-sad', particles: ['😢', '💧'], duration: 720 },
    angry: { animClass: 'emote-angry', particles: ['💢'], duration: 520 },
    love: { animClass: 'emote-love', particles: ['💕', '💘', '💖'], duration: 900 },
  };
  const EMOTE_CLASSES = Object.values(EMOTE_CONFIG).map((cfg) => cfg.animClass);

  // tracks when the pet's current animation finishes, so the idle-perk
  // timer below knows not to interrupt a bounce/emote already in progress
  let petBusyUntil = 0;

  function bouncePet() {
    if (castMotion) {
      if (!conversationIsBusy()) castMotion.emote('bounce');
      petBusyUntil = Date.now() + 960;
      return;
    }
    el.pet.classList.remove('bounce', ...EMOTE_CLASSES);
    // force reflow to restart animation
    void el.pet.offsetWidth;
    el.pet.classList.add('bounce');
    petBusyUntil = Date.now() + 500;
  }

  function emotePet(kind) {
    if (kind === 'sad') audio.play('sad'); else if (kind === 'fun') audio.play('chirp');
    if (castMotion) {
      if (!conversationIsBusy()) castMotion.emote({happy:'bounce',fun:'bounce',sad:'droop',angry:'shake',love:'love'}[kind] || 'nod');
      petBusyUntil = Date.now() + 1400;
      return;
    }
    const cfg = EMOTE_CONFIG[kind];
    if (!cfg) {
      bouncePet();
      return;
    }
    el.pet.classList.remove('bounce', ...EMOTE_CLASSES);
    void el.pet.offsetWidth;
    el.pet.classList.add(cfg.animClass);
    petBusyUntil = Date.now() + cfg.duration;
    setTimeout(() => el.pet.classList.remove(cfg.animClass), cfg.duration);
    spawnEmoteParticles(cfg.particles);
  }

  function spawnEmoteParticles(pool) {
    if (!el.petArea) return;
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const span = document.createElement('span');
      span.className = 'emote-particle';
      span.textContent = pool[Math.floor(Math.random() * pool.length)];
      span.style.left = `${45 + Math.random() * 10}%`;
      span.style.setProperty('--drift', `${Math.round(Math.random() * 40 - 20)}px`);
      span.style.animationDelay = `${i * 90}ms`;
      span.addEventListener('animationend', () => span.remove());
      el.petArea.appendChild(span);
    }
  }

  // occasional idle動作(小さなジャンプ・首かしげ)を数秒おきにランダム発火し、
  // 何もしていない通常画面でもキャラが生きて見えるようにする
  function scheduleIdlePerk() {
    const delay = 4000 + Math.random() * 5000;
    setTimeout(() => {
      const idleOk = !gameActive
        && state.stage !== STAGE.DEAD
        && state.stage !== STAGE.EGG
        && !state.isSleeping && !state.isSick && !state.dying
        && !state.transformOptions && !conversationIsBusy() && !speechActive && !isAnyMenuOverlayOpen()
        && Date.now() >= petBusyUntil;
      if (idleOk) {
        if (castMotion) {
          castMotion.idle();
          petBusyUntil = Date.now() + 1600;
        } else {
        el.pet.classList.add('idle-perk');
        petBusyUntil = Date.now() + 520;
        setTimeout(() => el.pet.classList.remove('idle-perk'), 520);
        }
      }
      scheduleIdlePerk();
    }, delay);
  }

  // 放置中の会話はシステム通知欄ではなく、話者つき吹き出しへ出す。
  // 本人を基本にしつつ、いま一緒にいる恋人・なかまも時々しゃべる。
  function scheduleIdleGreeting() {
    // 通常画面では「誰かがほぼ常に何か言っている」くらい賑やかにする。
    // 放置会話は掛け合いより間を空ける。吹き出し自体の表示時間は共通。
    const delay = 5200 + Math.random() * 3800;
    setTimeout(() => {
      const canGreet = !gameActive
        && state.stage === STAGE.GROWING
        && !state.isSleeping
        && !state.transformOptions
        && !message
        && !conversationIsBusy()
        && !isAnyMenuOverlayOpen();
      if (canGreet) {
        const choices = [{ kind: 'pet', weight: 4 }];
        // 恋人・仲間がいる人生では本人だけが独占せず、周囲もかなりよく割り込む。
        if (state.partner) choices.push({ kind: 'partner', weight: 4 });
        if (state.companions.length) choices.push({ kind: 'companion', weight: 4 });
        const expanded = choices.flatMap((x) => Array(x.weight).fill(x.kind));
        const kind = expanded[Math.floor(Math.random() * expanded.length)];
        if (kind === 'partner') {
          setSpeechBubble(pickCharacterConversationLine(PARTNER_CHARACTER_IDLE_LINES[state.partner.id], PARTNER_IDLE_LINES), partnerSpeaker());
        } else if (kind === 'companion') {
          const speaker = companionSpeaker();
          setSpeechBubble(pickCharacterConversationLine(COMPANION_CHARACTER_IDLE_LINES[speaker?.id], COMPANION_IDLE_LINES), speaker);
        } else {
          const memoryGreeting = Math.random() < 0.3 ? pickMemoryGreeting() : null;
          // 方言は本人の短い遊びとして時々。通常の独り言の大半を占めさせない。
          const greetingPool = Math.random() < 0.08 ? IDLE_GREETINGS_DIALECT : IDLE_GREETINGS;
          const greeting = memoryGreeting || pickReaction(greetingPool, lastIdleGreeting);
          if (!memoryGreeting) lastIdleGreeting = greeting;
          setSpeechBubble(greeting, petSpeaker());
          if (!castMotion) emotePet('happy');
        }
      }
      scheduleIdleGreeting();
    }, delay);
  }

  // IDLE_GREETINGSより ずっと まれにしか おきない、なかまとの であい
  // イベント。まず であった あいてを ひとことで しょうかいし(showStoryEvent
  // を りよう)、そのあと じどうで ミニゲームが はじまって、クリアできれば
  // なかまに なる(なれなくても また こんど おなじ あいてに であえる)。
  // いま いる なかま(state.companions)だけを のぞくので、じゃれるを
  // おさぼって はなれて いった なかまとも、このイベントで また であって
  // なかまに もどれる
  // なんらかの メニューがめん(ずかん/じっせき/でざいん/プロフィール/
  // つうしん/あいてむ/うそつきしょうぶ/せかい/きせつを かえる/たびに でる)が
  // ひらいているかどうかを まとめて はんていする、きょうつうの ヘルパー。
  // tick()の じかんていし ガード・なかまイベント抽選ガード・きせつの
  // ぜんけいエフェクト よくせいの 3か所で つかう。pickerOpen は
  // useConsumableItem()→openPicker() の けいろでしか ひらかれず、itemOpen
  // すでに ひらいている ときにしか 到達しないため、ここには ふくめていない
  // (itemOpen だけで じゅうぶん カバーできる)
  function isAnyMenuOverlayOpen() {
    return menuOpen || dexOpen || achOpen || themeOpen || profileOpen || commOpen
      || itemOpen || duelOpen || worldOpen || travelOpen
      || dateOpen || companionInviteOpen
      // ④⑤の おいわい がめん(grandGoalPending)と ずかんの くわしい がめんも
      // 「ひらいている がめん」。ここを いれないと、おいわいの うえに
      // なかまの さそいが かぶさって、クリアの ボタンが おせなく なる
      || !!grandGoalPending || !!dexDetail;
  }

  function pickCompanionByRegion(pool) {
    if (!pool.length) return null;
    const weighted = [];
    pool.forEach((c) => {
      const local = Array.isArray(c.preferredRegions) && c.preferredRegions.includes(state.regionId);
      const weight = local ? 4 : 1;
      for (let i = 0; i < weight; i += 1) weighted.push(c);
    });
    return weighted[Math.floor(Math.random() * weighted.length)] || pool[0];
  }

  function scheduleCompanionEncounter() {
    // 1つの人生(100分)の中で通常なかま10人が十分そろえるよう、出会い間隔を短めにする。
    // そだち40以降は「なかまの わ」でさらに出会いやすくなる。
    // てんき・じかんたい・きせつ・地域で であいやすさが かわる(envModifiers().meet)
    const delay = (hasPerk(40) ? 90000 + Math.random() * 90000 : 120000 + Math.random() * 120000) / envModifiers().meet;
    setTimeout(() => {
      const remaining = COMPANIONS.filter((c) => !hasActiveCompanionId(c.id));
      // そだち80「レアの きざし」に とどいていると、ふつうの なかまの かわりに
      // RARE_COMPANIONS の だれかが あらわれる ことが ある。ふつうの なかまが
      // もう ぜんいん そばに いる ときは、レアだけが のこりの であいに なる
      const rareRemaining = hasPerk(80)
        ? RARE_COMPANIONS.filter((c) => !hasActiveCompanionId(c.id))
        : [];
      const canEncounter = !gameActive
        && state.stage === STAGE.GROWING
        && !state.isSleeping
        && !state.transformOptions
        && !message
        && !pendingCompanionId
        && !isAnyMenuOverlayOpen()
        && (remaining.length > 0 || rareRemaining.length > 0);
      if (canEncounter && Math.random() < 0.9) {
        const useRare = rareRemaining.length > 0
          && (remaining.length === 0 || Math.random() < RARE_COMPANION_CHANCE);
        const pool = useRare ? rareRemaining : remaining;
        const companion = useRare ? pool[Math.floor(Math.random() * pool.length)] : pickCompanionByRegion(pool);
        openCompanionInvite(companion, useRare);
      }
      scheduleCompanionEncounter();
    }, delay);
  }

  // なかまからの さそいの がめん。ひらいている あいだは pendingCompanionId が
  // うまっている ので、つぎの さそいが かさなって くることは ない
  let companionInviteOpen = false;

  function openCompanionInvite(companion, isRare) {
    pendingCompanionId = companion.id;
    companionInviteOpen = true;
    el.companionInviteEmoji.innerHTML = companionVisualHTML(companion, 'hero');
    const progress = (state.lifetime.companionFriendshipProgress || {})[companion.id] || 0;
    const reunited = progress > 0 && !hasRecruitedCompanionId(companion.id);
    el.companionInviteTitle.textContent = isRare
      ? `${companion.name}とめがあった`
      : reunited ? `${companion.name}がまたきた` : `${companion.name}がこっちをみている`;
    el.companionInviteFlavor.textContent = companion.flavor;
    el.companionInviteOverlay.classList.toggle('rare', !!isRare);
    // まだ ミニゲームが はじまる まえに、ちゃんと 目に はいるよう
    // ひとこと メッセージらんにも のこす
    setMessage(isRare
      ? `${companion.emoji}みたことのないなにかとめがあった…`
      : reunited ? `${companion.emoji} ${companion.name}だ。またあった` : `${companion.emoji} ${companion.name}がこっちをみている`);
    emotePet('fun');
    render();
  }

  function closeCompanionInvite() {
    companionInviteOpen = false;
    el.companionInviteOverlay.classList.add('hidden');
  }

  function barClass(value) {
    if (value <= 20) return 'critical';
    if (value <= 45) return 'low';
    return '';
  }

  function updateBar(elBar, value, baseClass) {
    elBar.style.width = `${clamp(value, 0, 100)}%`;
    elBar.className = `bar-fill ${baseClass} ${barClass(value)}`.trim();
    renderMeterValue(elBar, value, baseClass);
  }

  function updateMeter(elBar, value, baseClass) {
    elBar.style.width = `${clamp(value, 0, 100)}%`;
    // 「いのち」だけは へるほど あぶない ので、たかい ときでは なく
    // ひくい ときに 警告の みため(low)に する
    const flag = baseClass === 'death'
      ? (value <= 30 ? 'low' : '')
      : (value >= 70 ? 'high' : '');
    elBar.className = `bar-fill ${baseClass} ${flag}`.trim();
    renderMeterValue(elBar, value, baseClass, true);
  }

  function renderMeterValue(bar, value, name, progress = false) {
    const amount = Math.round(clamp(value, 0, 100));
    const text = document.getElementById(name + 'Value');
    if (text) text.textContent = progress ? `${amount} / 100` : String(amount);
    bar.setAttribute('role', name === 'goal' ? 'progressbar' : 'meter');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    bar.setAttribute('aria-valuenow', String(amount));
    bar.setAttribute('aria-label', ({hunger:'おなか',happiness:'ごきげん',energy:'げんき',health:'けんこう',evo:'せいちょう',devo:'おとろえ',death:'いのち',transform:'へんしん',goal:'100さいまで'})[name]);
  }

  // いまの すがた。つうじょうは ねんれいから いちいに きまる。♾️ の せかいの
  // あいだ だけ、ずかんで えらんだ かたち(infiniteForm)を ゆうせんする -
  // これが ♾️ の とくてん「ねんれいと みためを きりはなす」の 実体
  function currentFormStageIndex() {
    if (state.infinite && state.infiniteForm) return state.infiniteForm.stageIndex;
    return stageForAge(currentAge());
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
    }[ch]));
  }

  // Character Renderer:
  // stage.asset がある形態だけPNGを使い、未制作/読込失敗時は必ずemojiへ戻る。
  // 1形態1ファイルを基本にし、メイン/図鑑/変身など全UIで同じマスターを使う。
  function stageVisualHTML(stage, size = 'medium') {
    const emoji = stage?.emoji || '❓';
    const asset = stage?.asset || '';
    const safeEmoji = escapeHtml(emoji);
    if (!asset) {
      return `<span class="character-visual character-${size} emoji-only"><span class="character-emoji-fallback">${safeEmoji}</span></span>`;
    }
    return `<span class="character-visual character-${size} has-asset">
      <img class="character-asset" src="${escapeHtml(asset)}" alt="" draggable="false">
      <span class="character-emoji-fallback">${safeEmoji}</span>
    </span>`;
  }

  function setStageVisual(target, stage, size = 'medium') {
    if (!target) return;
    const key = JSON.stringify([stage?.asset, stage?.emoji, size]);
    if (target === el.petSprite && target.dataset.visualKey === key && target.innerHTML) return;
    target.dataset.visualKey = key;
    target.innerHTML = stageVisualHTML(stage, size);
  }

  function eggVisualStage() {
    const progress = state.growth / HATCH_GROWTH;
    const frame = progress >= 0.8 ? 'ready' : progress >= 0.4 ? 'cracking' : 'intact';
    return { emoji:'🥚', label:'たまご', asset:`assets/characters/egg/${frame}.png` };
  }

  function renderPetVisual() {
    const reaction = eggVisualReaction?.life === state ? eggVisualReaction.kind : '';
    eggVisualReaction = null;
    // A new inner visual restarts a finite reaction without forcing layout or
    // replacing the shared cast-sway / petSprite motion layers.
    if (reaction) el.petSprite.dataset.visualKey = '';
    setStageVisual(el.petSprite, currentVisualStage(), 'hero');
    if (!reaction || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
    const visual = el.petSprite.querySelector('.character-visual');
    if (!visual) return;
    let shell = null;
    if (reaction === 'warm') {
      visual.classList.add('egg-warming');
    } else {
      visual.classList.add('egg-newborn');
      shell = document.createElement('span');
      shell.className = 'egg-hatch-shell';
      shell.setAttribute('aria-hidden', 'true');
      shell.innerHTML = '<span class="egg-shell-top"></span><span class="egg-shell-bottom"></span>';
      visual.appendChild(shell);
    }
    // display:none cancels CSS animations; leaving the class attached would
    // hatch the same child again when a minigame reveals the home screen.
    // Capture this visual only: a reset or another tap may already replace it.
    const cleanup = () => {
      visual.removeEventListener('animationend', onAnimationDone);
      visual.removeEventListener('animationcancel', onAnimationDone);
      clearTimeout(cleanupTimer);
      visual.classList.remove('egg-warming', 'egg-newborn');
      if (shell) shell.remove();
    };
    const onAnimationDone = (event) => {
      if (event.animationName?.startsWith('egg-')) cleanup();
    };
    const cleanupTimer = setTimeout(cleanup, reaction === 'warm' ? 560 : 900);
    visual.addEventListener('animationend', onAnimationDone);
    visual.addEventListener('animationcancel', onAnimationDone);
  }

  // innerHTML で差し込んだimgも含め、404/壊れた画像は自動的にemojiへ戻す。
  document.addEventListener('error', (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) return;
    if (img.classList.contains('comment-asset')) {
      img.closest('.comment-picture')?.classList.add('asset-failed');
      return;
    }
    if (img.classList.contains('scenery-asset')) {
      img.closest('.scenery-picture')?.classList.add('asset-failed');
      return;
    }
    if (!img.classList.contains('character-asset')) return;
    const wrapper = img.closest('.character-visual');
    if (wrapper) wrapper.classList.add('asset-failed');
    const asset = img.getAttribute('src');
    if (asset && !failedCastAssets.has(asset)) {
      failedCastAssets.add(asset);
      renderHomeCast();
    }
  }, true);

  function currentVisualStage() {
    if (state.stage === STAGE.EGG) return eggVisualStage();
    const stages = state.speciesLine && SPECIES[state.speciesLine]?.stages;
    return stages?.[currentFormStageIndex()] || { emoji:'❓', label:'???' };
  }

  function currentSprite() {
    if (state.stage === STAGE.EGG) return '🥚';
    // 亡くなったあとも、おばけに置きかえず「そのときの すがた」を残す。
    // 人生記録カードやメイン画面でも、最後に育っていた姿をそのまま見せる。
    const stages = state.speciesLine && SPECIES[state.speciesLine].stages;
    return stages?.[currentFormStageIndex()]?.emoji || '❓';
  }

  function currentStageLabel() {
    if (state.stage === STAGE.EGG) return 'たまご';
    if (state.stage === STAGE.DEAD) return 'おわり';
    const stages = state.speciesLine && SPECIES[state.speciesLine].stages;
    return stages?.[currentFormStageIndex()]?.label || '';
  }

  // COLOR_THEMES の えらんだ id を .device / .screen の class に反映する。
  // ロックされた/存在しない id が しれっと 残っていても(セーブデータ改変
  // など)、その場合は もも(default)に フォールバックする
  function applyTheme() {
    const deviceTheme = COLOR_THEMES.find((t) => t.id === state.lifetime.deviceThemeId && isThemeUnlocked(t)) || COLOR_THEMES[0];
    const screenTheme = COLOR_THEMES.find((t) => t.id === state.lifetime.screenThemeId && isThemeUnlocked(t)) || COLOR_THEMES[0];
    COLOR_THEMES.forEach((t) => {
      el.device.classList.toggle(`theme-${t.id}`, t === deviceTheme);
      el.screen.classList.toggle(`theme-${t.id}`, t === screenTheme);
    });
    const devicePattern = PATTERNS.find((p) => p.id === state.lifetime.devicePatternId && isThemeUnlocked(p)) || PATTERNS[0];
    const screenPattern = PATTERNS.find((p) => p.id === state.lifetime.screenPatternId && isThemeUnlocked(p)) || PATTERNS[0];
    PATTERNS.forEach((p) => {
      el.device.classList.toggle(`pattern-${p.id}`, p === devicePattern);
      el.screen.classList.toggle(`pattern-${p.id}`, p === screenPattern);
    });
  }

  // ランダムな いち(はし に よせて、まんなかの デバイスと かさならない
  // ように 上下左右の どこかの ふち を えらぶ)を きめる
  function randomEdgePosition() {
    const zone = Math.floor(Math.random() * 4);
    if (zone === 0) return { left: Math.random() * 100, top: Math.random() * 12 };
    if (zone === 1) return { left: Math.random() * 100, top: 88 + Math.random() * 12 };
    if (zone === 2) return { left: Math.random() * 10, top: Math.random() * 100 };
    return { left: 90 + Math.random() * 10, top: Math.random() * 100 };
  }

  // 地域の decor(絵柄。きせつに よって うわがきされる ことが ある)を、
  // デバイスの まわりに ランダムに ちらす。地域か きせつが かわった ときだけ
  // よびだされるので、なにも かわっていない あいだは いちが ガタガタ
  // かわったりしない
  function renderRegionDecor(decorList) {
    el.regionDecor.innerHTML = (decorList || []).map((emoji) => {
      const pos = randomEdgePosition();
      const size = 22 + Math.random() * 20;
      const duration = 7 + Math.random() * 6;
      const delay = Math.random() * duration;
      return `<span class="region-decor-item" style="left:${pos.left}%; top:${pos.top}%; font-size:${size}px; animation-duration:${duration}s; animation-delay:-${delay}s;">${sceneryIconHTML(emoji)}</span>`;
    }).join('');
  }

  // ==== きせつ × 地域 の みため(はいけい/ぜんけいエフェクト・タイント・
  // かざりの うわがき) ============================================
  // regionId + season(SEASON.*の あたい)だけで ひける、じゅんすいな
  // データテーブル + かんすうとして きりだしてある。しょうらい ミニゲームの
  // 抽選や イベントからも、この かたちの まま りようできる ことを 想定している

  // きせつの きほんの エフェクト(region による うわがきが なければ これを つかう)
  const SEASON_BASE_FX = {
    spring: { bg: ['🌸', '🌸', '🍃'], bgCount: 5, front: ['🌸'], frontCount: 2, tint: 'spring' },
    summer: { bg: ['✨', '🍃'], bgCount: 4, front: ['✨'], frontCount: 1, tint: 'summer' },
    autumn: { bg: ['🍂', '🍁'], bgCount: 5, front: ['🍂'], frontCount: 2, tint: 'autumn' },
    winter: { bg: ['❄️'], bgCount: 5, front: ['❄️'], frontCount: 2, tint: 'winter' },
  };

  // 地上の四季をそのまま使わない旅先。地域の空気を一年中保つ。
  const REGION_BASE_FX = {
    deepsea: { bg: ['🫧', '✨'], bgCount: 5, front: ['🫧'], frontCount: 2, tint: 'deepsea' },
    star_stop: { bg: ['✨', '⭐'], bgCount: 4, front: ['✨'], frontCount: 1, tint: 'starry' },
    memory_lake: { bg: ['💧', '✨'], bgCount: 4, front: ['✨'], frontCount: 1, tint: 'memory' },
    jungle: { bg: ['🌿', '🌺'], bgCount: 4, front: ['🍃'], frontCount: 1, tint: 'tropicalMild' },
    desert: { bg: ['💨', '✨'], bgCount: 3, front: [], frontCount: 0, tint: 'desertMild' },
  };

  // `${regionId}:${season}` の くみあわせだけ、きほんから 上書きする
  // (front を からの はいれつに すると、その くみあわせは ぜんけい
  // エフェクトなし = なんごく/さばくの ふゆ などで つかう)
  const SEASON_REGION_OVERRIDES = {
    // ゆきやまは 一年中「ゆきやまらしさ」を のこす(9番の しよう どおり)
    'snow:spring': { bg: ['🌸', '💧', '❄️'], bgCount: 5, front: ['🌸'], frontCount: 2, tint: 'snowSpring' },
    'snow:summer': { bg: ['✨', '🌿'], bgCount: 4, front: ['✨'], frontCount: 1, tint: 'snowSummer' },
    'snow:autumn': { bg: ['🍁', '❄️'], bgCount: 5, front: ['🍁'], frontCount: 2, tint: 'snowAutumn' },
    'snow:winter': { bg: ['❄️', '❄️', '🌨️'], bgCount: 8, front: ['❄️'], frontCount: 3, tint: 'snowWinter' },
    // もり・いなか・おうちは かるい ゆきげしょう ていど
    'forest:winter': { bg: ['❄️'], bgCount: 4, front: ['❄️'], frontCount: 1, tint: 'winter' },
    'countryside:winter': { bg: ['❄️'], bgCount: 3, front: ['❄️'], frontCount: 1, tint: 'winter' },
    'home:winter': { bg: ['❄️'], bgCount: 3, front: ['❄️'], frontCount: 1, tint: 'winter' },
    // とかい・うみは ふゆらしい くうきかんだけ、ゆきの ぜんけいは なし
    'city:winter': { bg: ['❄️'], bgCount: 3, front: [], frontCount: 0, tint: 'winterCity' },
    'sea:winter': { bg: ['💨', '❄️'], bgCount: 3, front: [], frontCount: 0, tint: 'seaWinter' },
    // なんごく・さばくは ゆきを ふらせず、いろあい・かぜだけで きせつさを だす
    'jungle:winter': { bg: ['🌺', '✨'], bgCount: 3, front: [], frontCount: 0, tint: 'tropicalMild' },
    'desert:winter': { bg: ['💨', '✨'], bgCount: 3, front: [], frontCount: 0, tint: 'desertMild' },
    'desert:summer': { bg: ['☀️', '💨'], bgCount: 3, front: [], frontCount: 0, tint: 'desertSummer' },
    'jungle:summer': { bg: ['🌺', '✨', '🦋'], bgCount: 5, front: ['✨'], frontCount: 1, tint: 'tropicalSummer' },
    'mountain:summer': { bg: ['🍃', '✨'], bgCount: 4, front: ['🍃'], frontCount: 1, tint: 'summer' },
    'river_lake:summer': { bg: ['💧', '✨'], bgCount: 4, front: ['✨'], frontCount: 1, tint: 'seaSummer' },
    'sea:summer': { bg: ['✨', '💧'], bgCount: 4, front: ['✨'], frontCount: 1, tint: 'seaSummer' },
  };

  // `${regionId}:${season}` の くみあわせだけ、region.decor(かざり emoji)を
  // うわがきする(ない くみあわせは region.decor の まま。なんごく/さばく
  // など きせつ差が 小さくて よい地域は、あえて 上書きを もたせていない)
  const SEASON_DECOR_OVERRIDES = {
    'snow:spring': ['🌸', '💧', '🏔️', '🌿', '✨', '🦌', '🎿', '🧣'],
    'snow:summer': ['🏔️', '🌿', '☀️', '🦋', '✨', '🦌', '⛰️', '🎣'],
    'snow:autumn': ['🍁', '🏔️', '🍂', '❄️', '✨', '🦌', '🎿', '🧣'],
    'forest:autumn': ['🍂', '🍁', '🌰', '🦉', '🍄', '🐿️', '🌲', '🦔'],
    'forest:winter': ['🌲', '❄️', '🌨️', '🦉', '🐿️', '🌰', '✨', '🧣'],
    'countryside:winter': ['🌾', '❄️', '🏚️', '🐄', '☁️', '🧣', '🌨️', '🐓'],
    'home:winter': ['🏠', '❄️', '☁️', '💕', '✨', '🎀', '🪴', '🧣'],
    'city:winter': ['🏙️', '❄️', '🌃', '✨', '🚕', '💡', '🎄', '🌆'],
    'sea:winter': ['🌊', '🧣', '☁️', '🐚', '💨', '🦭', '🏖️', '⚓'],
  };

  // タイント名 → じっさいの グラデーション(からだ ぜんたいを うっすら
  // そめる、地域の けしきの さらに うえの いろ・くうきかん レイヤー)
  const SEASON_TINTS = {
    deepsea: 'radial-gradient(circle at 50% 75%, rgba(50,190,210,0.18), rgba(5,15,60,0.3) 70%, transparent)',
    starry: 'radial-gradient(circle at 50% 15%, rgba(130,100,210,0.25), rgba(15,20,65,0.2) 70%, transparent)',
    memory: 'radial-gradient(circle at 50% 65%, rgba(200,230,245,0.25), rgba(145,170,220,0.12) 70%, transparent)',
    spring: 'radial-gradient(circle at 50% 12%, rgba(255,214,230,0.35), rgba(200,240,180,0.12) 60%, transparent 100%)',
    summer: 'radial-gradient(circle at 50% 8%, rgba(255,250,200,0.32), rgba(255,255,255,0.05) 70%, transparent 100%)',
    autumn: 'radial-gradient(circle at 50% 15%, rgba(255,196,140,0.32), rgba(150,90,50,0.14) 65%, transparent 100%)',
    winter: 'radial-gradient(circle at 50% 12%, rgba(255,255,255,0.38), rgba(190,210,230,0.18) 65%, transparent 100%)',
    snowSpring: 'radial-gradient(circle at 50% 12%, rgba(255,214,230,0.3), rgba(220,235,245,0.2) 65%, transparent 100%)',
    snowSummer: 'radial-gradient(circle at 50% 10%, rgba(255,255,255,0.28), rgba(190,225,190,0.15) 65%, transparent 100%)',
    snowAutumn: 'radial-gradient(circle at 50% 14%, rgba(255,196,140,0.28), rgba(210,225,235,0.2) 65%, transparent 100%)',
    snowWinter: 'radial-gradient(circle at 50% 10%, rgba(255,255,255,0.45), rgba(200,220,240,0.25) 70%, transparent 100%)',
    winterCity: 'radial-gradient(circle at 50% 10%, rgba(230,235,255,0.3), rgba(180,190,220,0.12) 65%, transparent 100%)',
    seaWinter: 'radial-gradient(circle at 50% 12%, rgba(220,240,255,0.28), rgba(150,180,210,0.15) 65%, transparent 100%)',
    tropicalMild: 'radial-gradient(circle at 50% 12%, rgba(255,235,210,0.22), rgba(255,255,255,0.05) 70%, transparent 100%)',
    desertMild: 'radial-gradient(circle at 50% 12%, rgba(255,240,220,0.22), rgba(255,255,255,0.05) 70%, transparent 100%)',
    desertSummer: 'radial-gradient(circle at 50% 8%, rgba(255,245,200,0.35), rgba(255,255,255,0.05) 70%, transparent 100%)',
    tropicalSummer: 'radial-gradient(circle at 50% 8%, rgba(255,250,220,0.3), rgba(255,255,255,0.05) 70%, transparent 100%)',
    seaSummer: 'radial-gradient(circle at 50% 8%, rgba(255,250,220,0.28), rgba(200,240,255,0.1) 70%, transparent 100%)',
  };

  // きせつが かわった しゅんかんだけ 出す、みじかい きりかえ えんしゅつの
  // ぶんしょう/emoji(バーストに つかう emoji は SEASON_BASE_FX の front/bg
  // を そのまま りようする)
  const SEASON_CHANGE_ANNOUNCE = {
    spring: { emoji: '🌸', text: '🌸はるになった!' },
    summer: { emoji: '🌻', text: '🌻なつになった!' },
    autumn: { emoji: '🍁', text: '🍁あきになった!' },
    winter: { emoji: '❄️', text: '❄️ふゆになった!' },
  };

  // regionId + season から、その くみあわせの みための ぜんじょうほうを
  // ひとつに まとめて かえす。しょうらい ミニゲームなどが「いまの 地域×
  // きせつ」を しりたい ときも、この かんすうだけ みれば よい
  function computeSeasonVisual(regionId, season) {
    const key = `${regionId}:${season}`;
    const base = REGION_BASE_FX[regionId] || SEASON_BASE_FX[season] || SEASON_BASE_FX.spring;
    const fx = { ...base, ...(SEASON_REGION_OVERRIDES[key] || {}) };
    const decor = SEASON_DECOR_OVERRIDES[key] || findRegion(regionId).decor;
    const tint = SEASON_TINTS[fx.tint] || SEASON_TINTS[season] || SEASON_TINTS.spring;
    return { fx, decor, tint };
  }

  // した(-10%)から がめん外(115vh)まで ゆっくり ながれおちる、きせつの
  // エフェクト ようそを かずぶん つくる。よこの ゆれかたが ようそごとに
  // すこしずつ ちがって 見えるよう --drift を らんすうで もたせる
  function buildSeasonFxHtml(emojis, count) {
    if (!emojis || !emojis.length || !count) return '';
    const items = [];
    for (let i = 0; i < count; i++) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      const size = 14 + Math.random() * 10;
      const duration = 10 + Math.random() * 8;
      const delay = Math.random() * (duration + 6);
      const left = Math.random() * 100;
      const drift = Math.round(Math.random() * 50 - 25);
      items.push(`<span class="season-fx-item" style="left:${left}%; font-size:${size}px; --drift:${drift}px; animation-duration:${duration}s; animation-delay:-${delay}s;">${sceneryIconHTML(emoji)}</span>`);
    }
    return items.join('');
  }

  // 地域か きせつが かわった ときだけ よびだす、みため ぜんぱんの ふりだし。
  // かざり(region-decor)・はいけい/ぜんけいエフェクト・からだの タイントを
  // まとめて つくりなおす
  function applySeasonRegionVisuals(regionId, season) {
    const { fx, decor, tint } = computeSeasonVisual(regionId, season);
    renderRegionDecor(decor);
    el.seasonBgFx.innerHTML = buildSeasonFxHtml(fx.bg, fx.bgCount);
    el.seasonFrontFx.innerHTML = buildSeasonFxHtml(fx.front, fx.frontCount);
    el.seasonTint.style.background = tint;
  }

  // きせつが きりかわった しゅんかんだけ、すこし つよめに ちる バーストと
  // みじかい こくちバナーを だす(常時エフェクトは そのまま つづく)
  function celebrateSeasonChange(regionId, season) {
    const announce = SEASON_CHANGE_ANNOUNCE[season];
    if (!announce) return;
    showStoryEvent({ emoji: announce.emoji, message: announce.text });
    // 「うごきを へらす」せっていの ときは、テキストの こくちだけに とどめ、
    // ちる バーストの アニメーションじたいを つくらない(animationend が
    // 発火せず ようそが のこりつづける じこを さける ため)
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const { fx } = computeSeasonVisual(regionId, season);
    const burstEmojis = (fx.front && fx.front.length ? fx.front : fx.bg) || [announce.emoji];
    const burstCount = 10;
    for (let i = 0; i < burstCount; i++) {
      const span = document.createElement('span');
      span.className = 'season-burst-item';
      const emoji = burstEmojis[Math.floor(Math.random() * burstEmojis.length)];
      span.innerHTML = sceneryIconHTML(emoji);
      const left = Math.random() * 100;
      const top = -5 - Math.random() * 10;
      const size = 16 + Math.random() * 14;
      const fall = 45 + Math.random() * 35;
      const drift = Math.round(Math.random() * 60 - 30);
      const duration = 0.8 + Math.random() * 0.6;
      span.style.left = `${left}%`;
      span.style.top = `${top}%`;
      span.style.fontSize = `${size}px`;
      span.style.setProperty('--drift', `${drift}px`);
      span.style.setProperty('--fall', `${fall}vh`);
      span.style.animationDuration = `${duration}s`;
      // animationend が なんらかの りゆうで 発火しない ばあいの ほけんとして、
      // すこし よゆうを もった setTimeout でも かならず とりのぞく
      // (どちらが 先でも 二重に remove() しても むがいなので ガードは 不要)
      span.addEventListener('animationend', () => span.remove());
      setTimeout(() => span.remove(), (duration + 0.5) * 1000);
      el.seasonFrontFx.appendChild(span);
    }
  }

  // 「たび」で えらんだ 地域(と、いまの きせつ)を body の class・みため に
  // 反映する。「いろ」の 本体/がめんテーマとは 別レイヤー(まわりの けしき)
  // なので、どんな いろの くみあわせと あわせても 衝突しない
  let lastVisualKey = null;

  function applyRegion() {
    const region = findRegion(state.regionId);
    REGIONS.concat(SPECIAL_REGIONS).forEach((r) => {
      document.body.classList.toggle(`region-${r.id}`, r.id === region.id);
    });
    const season = getEffectiveSeason();
    const visualKey = `${region.id}|${season}`;
    if (visualKey !== lastVisualKey) {
      applySeasonRegionVisuals(region.id, season);
      lastVisualKey = visualKey;
    }
    return region;
  }

  function render() {
    if (state.isSleeping && !sleepRecoveryTimer) startSleepRecovery();
    const isDead = state.stage === STAGE.DEAD;
    const isEgg = state.stage === STAGE.EGG;
    const isOver = isDead;
    const isFarewell = state.stage === STAGE.FAREWELL;

    renderPetVisual();
    const equippedItem = SHOP_ITEMS.find((it) => it.id === state.lifetime.equippedItemId);
    const accessoryHTML = equippedItem ? itemIconHTML(equippedItem, true) : '';
    if (el.petAccessory.innerHTML !== accessoryHTML) el.petAccessory.innerHTML = accessoryHTML;
    el.petAccessory.classList.toggle('hidden', !equippedItem || isEgg || isDead);
    const crown = state.sodachi >= SODACHI_MAX ? ' 👑' : '';
    el.ageLabel.textContent = state.infinite ? 'ねんれい: ♾️' : `ねんれい: ${currentAge()}さい${crown}`;
    el.sodachiLabel.textContent = state.infinite ? 'そだち: ♾️' : `そだち: ${state.sodachi}`;
    const moneyHTML = `${careIconHTML('coin')}<span>${state.lifetime.money}</span>`;
    if (el.moneyLabel.innerHTML !== moneyHTML) el.moneyLabel.innerHTML = moneyHTML;
    el.moneyLabel.setAttribute('aria-label', `おかね ${state.lifetime.money}`);
    el.mainNameLabel.textContent = isEgg ? 'たまご' : (SPECIES_DISPLAY_NAMES[state.speciesLine] || currentStageLabel());
    el.stageLabel.textContent = currentStageLabel();
    // せいべつ/れんあいタイプは 前面に 出しすぎず、ここに そっと 添える
    // だけ(長押し/ホバーで わかる)
    el.stageLabel.title = state.gender
      ? `${GENDER_LABELS[state.gender]}・${orientationLabel(state.orientationId, state.gender)}`
      : '';

    if (el.careMeters) el.careMeters.classList.toggle('hidden', isEgg);
    updateBar(el.hungerBar, isEgg || isOver ? 0 : state.hunger, 'hunger');
    updateBar(el.happinessBar, isEgg || isOver ? 0 : state.happiness, 'happiness');
    updateBar(el.energyBar, isEgg || isOver ? 0 : state.energy, 'energy');
    updateBar(el.healthBar, isEgg || isOver ? 0 : state.health, 'health');

    const hideLife = state.infinite || isOver;
    const growthPct = state.stage === STAGE.EGG
      ? (state.growth / HATCH_GROWTH) * 100
      : (state.growth / sodachiCost(state.sodachi)) * 100;
    updateMeter(el.evoBar, hideLife ? 0 : clamp(growthPct, 0, 100), 'evo');
    updateMeter(el.devoBar, hideLife ? 0 : state.decline, 'devo');
    // 「いのち」は へるほど あぶない ように 反転して 見せる(内部の deathMeter は そのまま)
    updateMeter(el.deathBar, hideLife ? 100 : 100 - state.deathMeter, 'death');
    updateMeter(el.transformBar, hideLife ? 0 : state.transformMeter, 'transform');
    el.lifeMeterRow.classList.toggle('hidden', state.infinite);

    const goalAge = currentAge();
    updateMeter(el.goalBar, isDead ? 0 : goalAge, 'goal');
    el.goalValue.textContent = state.infinite ? '♾️' : `${isDead ? 0 : goalAge} / ${GOAL_AGE}`;

    const poopHTML = careIconHTML('poop').repeat(state.poopCount);
    if (el.poopRow.innerHTML !== poopHTML) el.poopRow.innerHTML = poopHTML;
    el.poopRow.setAttribute('aria-label', `うんち ${state.poopCount}こ`);
    el.poopRow.setAttribute('aria-hidden', String(state.poopCount === 0));

    const badges = [];
    if (state.isSick && !isEgg && !isOver) badges.push(careIconHTML('sick', compactJapaneseText(state.sicknessType || 'びょうき'), '🤒'));
    if (state.isSleeping && !isOver) badges.push(careIconHTML('sleep', 'ねむっている', '😴'));
    if (state.boostTicks > 0 && !isEgg && !isOver) badges.push(`<span class="badge badge-boost" title="せいちょう2ばい（あと${Math.ceil(state.boostTicks * TICK_MS / 60000)}分）">✨2ばい</span>`);
    const badgesHTML = badges.join('');
    if (el.badges.innerHTML !== badgesHTML) el.badges.innerHTML = badgesHTML;

    el.screen.classList.toggle('dead', isDead);
    el.screen.classList.toggle('dying', !!state.dying && !isOver);
    // 虹オーラ(そだち100の 称号)も、いちど とどいたら その人生ずっと のこる。
    // そだち90(でんせつ)は それより ひかえめな きんいろの オーラ
    el.screen.classList.toggle('rainbow-aura', state.maxSodachi >= SODACHI_MAX && !isOver);
    el.screen.classList.toggle('legend-aura', state.maxSodachi >= 90 && state.maxSodachi < SODACHI_MAX && !isOver);
    el.farewellBar.classList.toggle('hidden', state.stage !== STAGE.FAREWELL);
    el.screen.classList.toggle('sick', state.isSick && !isOver);
    el.screen.classList.toggle('sleeping', state.isSleeping && !isOver);
    el.lamp.classList.toggle('sick', state.isSick && !isOver);
    // renderEnding() は たっせいした tier を state.lifetime.endingTiersReached に
    // きろくし、4つ そろった さいしょの 1かいだけ 'rainbow' の がめんテーマを
    // じどうで えらぶ ことが ある - なので バッジの れつも applyTheme() も
    // これより あとで うごかす
    el.gameClearOverlay.classList.toggle('hidden', !grandGoalPending);
    if (grandGoalPending) renderEnding();
    if (isDead && el.lifeCardOverlay.classList.contains('hidden') && !deathCardShown) {
      deathCardShown = true;
      showLifeCard();
    }
    if (!isDead) deathCardShown = false;
    // ゴールの おいわい画面と 人生記録カードは、がめんに かぶせる のではなく
    // ふつうの がめん(screen-normal)と いれかわりで ながれの なかに 置く。
    // こうすると なかみの たかさに あわせて がめんが のびるので、
    // スマホで したが 見きれたり、おわかれバーと かさなったり しない
    const lifeCardVisible = !el.lifeCardOverlay.classList.contains('hidden');
    el.screenNormal.classList.toggle('hidden', gameActive || !!grandGoalPending || lifeCardVisible);
    el.farewellBar.classList.toggle('hidden', state.stage !== STAGE.FAREWELL || !!grandGoalPending || lifeCardVisible);
    applyTheme();

    const region = applyRegion();
    setHTMLIfChanged(el.regionLabel, `${environmentIconHTML('region',region.id,region.emoji)} ${escapeHtml(region.label)}`);
    const effectiveSeason = getEffectiveSeason();
    const seasonInfo = SEASON_INFO[effectiveSeason];
    setHTMLIfChanged(el.seasonLabel, seasonInfo ? `${environmentIconHTML('season',effectiveSeason,seasonInfo.emoji)} ${escapeHtml(seasonInfo.label)}` : '');
    setHTMLIfChanged(el.partnerLabel, state.partner
      ? `<span class="name-heart" aria-hidden="true">${state.partner.mismatched ? '💔' : '💖'}</span> ${escapeHtml(compactJapaneseText(state.partner.label))}${state.partner.married ? ' 💍' : ''}${state.partner.mismatched ? '(すれちがい)' : ''}`
      : '');
    el.partnerLabel.title = state.partner
      ? `${GENDER_LABELS[state.partner.gender]}・${orientationLabel(state.partner.orientationId, state.partner.gender)}・${state.partner.married ? '夫婦' : 'こいびと'}`
      : '';
    el.subStatusRow.classList.toggle('hidden', isEgg || isOver);
    el.profileBtn.classList.toggle('hidden', isEgg || isOver);
    el.commBtn.classList.toggle('hidden', isEgg || isOver);

    const endingTiersReached = state.lifetime.endingTiersReached;
    setHTMLIfChanged(el.endingBadges, [...endingTiersReached]
      // tier0の🎉は「100さいクリア済み」の証。セーブに古い値が残っても
      // clears===0なら画面には絶対に出さない。
      .filter((tierIndex) => tierIndex !== 0 || (state.lifetime.clears || 0) > 0)
      .sort((a, b) => a - b)
      .map((tierIndex) => {
        const label = ENDING_TIER_UNLOCK_LABELS[tierIndex] || ENDING_TIERS[tierIndex].title;
        return `<button type="button" class="ending-badge" data-title="${ENDING_TIER_ICONS[tierIndex]} ${label}をたっせいずみ" title="${label}" aria-label="${label}をたっせいずみ">${endingBadgeIconHTML(tierIndex)}</button>`;
      })
      .join(''));

    renderCompanionRow();
    renderPartnerCompanion(isEgg || isOver);
    if (gameActive || isDead || state.transformOptions || isAnyMenuOverlayOpen() || document.visibilityState === 'hidden') castMotion?.clear();

    const hasTransformChoice = !!state.transformOptions && !isOver;
    el.transformOverlay.classList.toggle('hidden', !hasTransformChoice);
    if (hasTransformChoice) renderTransformChoices();

    const homeMessage = message || (isDead ? '「あたらしいたまご」で、つぎの子をむかえよう'
      : isEgg ? `たまごをタップするか「あたためる」をおしてね${Math.min(100, Math.round((state.growth / HATCH_GROWTH) * 100))}%` : '');
    if (!CARE_STATUS && setCommentText(el.message, homeMessage)) {
      el.message.scrollTop = 0;
    }
    renderCareNotice(true);

    const disableCare = isOver || isEgg || hasTransformChoice;
    // さいごの じかん は お世話が できる(そだち等は とまっている)
    el.feedBtn.disabled = disableCare;
    el.playBtn.disabled = disableCare || state.isSleeping;
    el.cleanBtn.disabled = disableCare || state.poopCount === 0;
    el.sleepBtn.disabled = disableCare;
    el.medicineBtn.disabled = disableCare;
    // たまごの あいだも「じゃれる」だけは おせる - たまごは じかんでは
    // なく、なでて あたためる ことで かえる ため
    el.playWithBtn.disabled = isOver || hasTransformChoice;
    el.courtBtn.disabled = disableCare;
    el.travelBtn.disabled = disableCare;
    el.menuBtn.disabled = gameActive || hasTransformChoice;
    el.profileBtn.disabled = gameActive || hasTransformChoice;
    el.commBtn.disabled = gameActive || hasTransformChoice;
    el.resetBtn.classList.toggle('hidden', !isOver && !isFarewell);
    // ♾️ の ボタンは 行き と かえり の りょうほうを かねる。パーフェクト
    // クリアずみなら、たまご中でも 人生の とちゅうでも いつでも 行き来できる
    const canEnterInfinite = state.lifetime.perfectCleared && !state.infinite && !isDead;
    el.infiniteBtn.classList.toggle('hidden', !state.infinite && !canEnterInfinite);
    el.infiniteBtnIcon.textContent = state.infinite ? '↩️' : '♾️';
    el.infiniteBtnLabel.textContent = state.infinite ? 'いっしょうにもどる' : '♾️のせかい';
    el.infiniteBtn.title = state.infinite ? 'この子のいっしょうにもどる' : '♾️のせかいへ';

    el.sleepBtn.querySelector('span').textContent = state.isSleeping ? 'おきる' : 'ねる';
    el.playWithBtn.querySelector('span').textContent = isEgg ? 'あたためる' : 'じゃれる';
    el.playWithBtn.title = isEgg ? 'たまごをあたためる' : 'じゃれる';
    el.playWithBtn.querySelector('i').dataset.careIcon = isEgg ? 'egg' : 'play';
    el.dexBtn.disabled = gameActive || hasTransformChoice;
    el.achBtn.disabled = gameActive || hasTransformChoice;
    el.themeBtn.disabled = gameActive || hasTransformChoice;
    el.itemBtn.disabled = gameActive || hasTransformChoice;

    el.dexOverlay.classList.toggle('hidden', !dexOpen);
    if (dexOpen) renderDex();

    el.dexDetailOverlay.classList.toggle('hidden', !dexDetail);
    if (dexDetail) renderDexDetail();

    el.achOverlay.classList.toggle('hidden', !achOpen);
    if (achOpen) renderAchievements();

    el.themeOverlay.classList.toggle('hidden', !themeOpen);
    if (themeOpen) renderThemeOverlay();

    el.profileOverlay.classList.toggle('hidden', !profileOpen);
    if (profileOpen) renderProfile();

    el.commOverlay.classList.toggle('hidden', !commOpen);
    if (commOpen) renderCommOverlay();

    el.itemOverlay.classList.toggle('hidden', !itemOpen);
    if (itemOpen) renderItemOverlay();

    el.pickerOverlay.classList.toggle('hidden', !pickerOpen);
    if (pickerOpen) renderPicker();

    el.duelOverlay.classList.toggle('hidden', !duelOpen);
    if (duelOpen) renderDuelOverlay();

    el.companionInviteOverlay.classList.toggle('hidden', !companionInviteOpen);

    el.menuOverlay.classList.toggle('hidden', !menuOpen);
    el.worldOverlay.classList.toggle('hidden', !worldOpen);
    renderEnvironment();
    el.dateOverlay.classList.toggle('hidden', !dateOpen);
    // そだち50「こいの きざし」に とどいて はじめて「デートに さそう」が
    // あらわれる。こいびとが いない/クールダウン中 などの ときは、ボタンは
    // 出したまま おせない ようにして、りゆうは おしたときに ことばで つたえる
    el.worldDateBtn.classList.toggle('hidden', !hasPerk(50));
    const dateBlocked = dateBlockReason();
    // ★ disabled に しない。おせない ときは 理由を すぐ したに 出し、
    //   タップしても おなじ 理由が メッセージらんに 出る
    el.worldDateBtn.disabled = false;
    el.worldDateBtn.classList.toggle('blocked', !!dateBlocked);
    el.worldDateHint.classList.toggle('hidden', !hasPerk(50));
    el.worldDateHint.textContent = dateBlocked
      ? `いまはさそえません: ${dateBlocked}`
      : compactJapaneseText(`${state.partner ? state.partner.emoji + ' ' + state.partner.label : 'こいびと'}とでかけられます`);


    el.travelOverlay.classList.toggle('hidden', !travelOpen);
    if (travelOpen) renderTravelRegionGrid();

    // ゲーム機・えきしょうの てまえまで よこぎる ぜんけいの きせつ
    // エフェクトは、しさが だいじな ばめん(ミニゲーム中や、よみもの/
    // そうさを おもんじる かくオーバーレイ)を ひらいている あいだ とめる。
    // はいけいエフェクト(region-decor/season-bg-fx)は デバイスの うしろに
    // かくれた ままなので、ここでは とめない
    const suppressFrontFx = gameActive || hasTransformChoice || lifeCardVisible || isAnyMenuOverlayOpen();
    el.seasonFrontFx.classList.toggle('suppressed', suppressFrontFx);
    if (el.weatherFx) el.weatherFx.classList.toggle('suppressed', suppressFrontFx);
    if (el.timeTint) el.timeTint.classList.toggle('suppressed', gameActive);

    el.device.classList.toggle('ui-game-active', gameActive);
    el.device.classList.toggle('ui-menu-open', isAnyMenuOverlayOpen());
    el.device.dataset.font = ['rounded','standard','retro'].includes(state.lifetime.fontStyle) ? state.lifetime.fontStyle : 'rounded';
    el.device.dataset.textSize = state.lifetime.textSize === 'large' ? 'large' : 'normal';
    el.device.classList.toggle('ui-home-active', !el.screenNormal.classList.contains('hidden'));
    renderItemsRow(disableCare);
    renderHomeCast();
    positionWeatherSky();
  }

  let menuOpen = false;
  let dexOpen = false;
  let achOpen = false;
  let themeOpen = false;
  let profileOpen = false;
  let commOpen = false;
  let itemOpen = false;
  let duelOpen = false;
  // 「🌍 せかい」がめん(きせつを かえる/たびに でる の いりぐち)と、
  // その中の「きせつを かえる」「たびに でる」サブがめん。dexOpen などと
  // おなじ しくみで render() から ひょうじを きりかえる
  let worldOpen = false;
  let travelOpen = false;
  // うそつきしょうぶ画面の どこを 見せているかを おぼえておく
  // 表示じょうたい じたいは state.duel(セーブに のこる 進行データ)とは
  // べつに もつ ことで、画面を とじて また ひらいても つづきから
  // 再開できるように している
  let duelUiStep = 'home';
  // けっかがめんで「1問ずつ めくる」えんしゅつの すすみぐあい。result
  // ステップに はいるたびに 0/'pending' から やりなおす
  let duelRevealIndex = 0;
  let duelRevealPhase = 'pending';
  // れんあいタイプの「？」ボタンで ひらいた せつめいが、profileOpen 中の
  // ほかの 操作(たとえば きゅうあいの けっかで render() が よびなおされる
  // など)で かってに とじてしまわないよう、ひらいている/いないを
  // ここで おぼえておく
  let orientationHintOpen = false;

  // メインメニュー同士は同時に1枚だけ開く。別メニューを押したら、
  // いま開いているものを先に閉じて、そのまま新しい画面へ切り替える。
  function closeAllMenuOverlays() {
    restoreFocusToMenu();
    menuOpen = false;
    currentLocationIntent += 1;
    dexOpen = false;
    achOpen = false;
    themeOpen = false;
    profileOpen = false;
    commOpen = false;
    itemOpen = false;
    duelOpen = false;
    worldOpen = false;
    travelOpen = false;
    dateOpen = false;
    pendingDatePlan = null;
    el.dateRewardConfirm.classList.add('hidden');
    companionInviteOpen = false;
    pickerOpen = false;
    pickerItem = null;
    dexDetail = null;
    orientationHintOpen = false;
    clearDateMovieTimers();
  }

  function openExclusiveMenu(kind) {
    if (gameActive || state.transformOptions) return;
    audio.play('open');
    clearConversationTimers();
    hideSpeechBubble();
    closeAllMenuOverlays();
    if (kind === 'menu') menuOpen = true;
    else if (kind === 'travel') travelOpen = true;
    else if (kind === 'dex') dexOpen = true;
    else if (kind === 'ach') achOpen = true;
    else if (kind === 'theme') { themeOpen = true; selectDesignPanel('screen'); }
    else if (kind === 'profile') profileOpen = true;
    else if (kind === 'comm') commOpen = true;
    else if (kind === 'item') itemOpen = true;
    else if (kind === 'world') worldOpen = true;
    render();
    focusOverlayClose(kind);
  }
  // キーボード/スクリーンリーダー むけ: ひらいた オーバーレイの とじるボタンに
  // フォーカスを うつし、とじたら メニューボタンに もどす
  const OVERLAY_CLOSE_IDS = { menu: 'menuCloseBtn', travel: 'travelCloseBtn', dex: 'dexCloseBtn', ach: 'achCloseBtn', theme: 'themeCloseBtn', profile: 'profileCloseBtn', comm: 'commCloseBtn', item: 'itemCloseBtn', world: 'worldCloseBtn' };
  function focusOverlayClose(kind) {
    const id = OVERLAY_CLOSE_IDS[kind];
    const btn = id && document.getElementById(id);
    if (!btn || typeof btn.focus !== 'function') return;
    try { btn.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }
  function restoreFocusToMenu() {
    const active = document.activeElement;
    if (!active || active === document.body || !el.menuBtn || typeof el.menuBtn.focus !== 'function') return;
    if (typeof active.closest === 'function' && active.closest('.dex-overlay')) {
      try { el.menuBtn.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
  }

  // エンディングの派手さは tier ごとに 見た目も うごきも まったく別物にする
  // (CSSの .tier-1/2/3 が いろ・かたちを、ここが 飛びちる パーティクルを
  // 受け持つ)。ふつうクリアは ふわっと おちる かるい かんじ、ずかんは
  // はっぱが ゆれながら おちる しぜんな かんじ、じっせきは まわりに はじける
  // ごうかな かんじ、PERFECTは その両方を いちばん たくさん・はやく
  const ENDING_CELEBRATIONS = [
    { kinds: ['fall'], pool: ['🎉', '🎊', '✨', '🎈'], count: 10 },
    { kinds: ['sway'], pool: ['🍃', '🌿', '📖', '✨'], count: 12 },
    { kinds: ['burst'], pool: ['🏅', '🎆', '✨', '⭐'], count: 18 },
    { kinds: ['burst', 'fall'], pool: ['👑', '✨', '⭐', '🎉', '🎊'], count: 26 },
  ];

  let endingCelebrationShown = false;

  function spawnEndingCelebration(tierIndex) {
    const cfg = ENDING_CELEBRATIONS[tierIndex];
    if (!cfg || !el.gameClearOverlay) return;
    for (let i = 0; i < cfg.count; i++) {
      const kind = cfg.kinds[i % cfg.kinds.length];
      const span = document.createElement('span');
      span.className = `ending-particle ${kind}`;
      span.textContent = cfg.pool[Math.floor(Math.random() * cfg.pool.length)];
      span.style.left = `${Math.random() * 100}%`;
      span.style.setProperty('--drift', `${Math.round(Math.random() * 90 - 45)}px`);
      span.style.setProperty('--spin', `${Math.round(Math.random() * 360)}deg`);
      span.style.setProperty('--dx', `${Math.round(Math.random() * 180 - 90)}px`);
      span.style.setProperty('--dy', `${Math.round(Math.random() * 180 - 90)}px`);
      span.style.animationDuration = `${1100 + Math.random() * 1500}ms`;
      span.style.animationDelay = `${Math.random() * 500}ms`;
      span.addEventListener('animationend', () => span.remove());
      el.gameClearOverlay.appendChild(span);
    }
  }

  // じっせき: shows every achievement with its unlock condition, revealing
  // the description only once state.achievementsUnlocked contains its id
  // ずかんとちがい、じっせきは「なにを たっせいすれば いいか」が わからな
  // いと 目指しようが ないので、ラベル・せつめい文は 未達成でも つねに 見
  // せる。達成ずみかどうかは ❓ に すりかえるのではなく、カードの いろ
  // (ach-cell.locked のグレー ⇔ 達成いろ)だけで 判別する
  let achTab = 'ach';
  function renderAchievements() {
    const gamesTab = achTab === 'games';
    if (el.achTabs) {
      for (const btn of el.achTabs.querySelectorAll('.ach-tab')) btn.classList.toggle('active', btn.dataset.tab === achTab);
    }
    if (el.achTitle) el.achTitle.textContent = gamesTab ? 'ゲームきろく' : 'じっせき';
    el.achGrid.classList.toggle('hidden', gamesTab);
    if (el.gameListGrid) el.gameListGrid.classList.toggle('hidden', !gamesTab);
    if (gamesTab) {
      renderGameList();
      return;
    }
    const unlockedSet = new Set(state.achievementsUnlocked);
    const unlockedCount = ACHIEVEMENTS.filter((a) => unlockedSet.has(a.id)).length;
    el.achProgress.textContent = `${unlockedCount} / ${ACHIEVEMENTS.length}`;
    const at = state.lifetime.achievementUnlockedAt || {};
    const now = Date.now();
    const isNew = (ach) => at[ach.id] && now - at[ach.id] < 24 * 60 * 60 * 1000;
    const cell = (ach) => {
      const known = unlockedSet.has(ach.id);
      const emoji = known ? achievementIconHTML(ach) : commentIconHTML('🔒');
      const badge = known && isNew(ach) ? '<span class="ach-new">NEW</span>' : '';
      return `<div class="ach-cell ${known ? 'known' : 'locked'}"><span class="ach-cell-emoji">${emoji}</span><div class="ach-cell-text"><span class="ach-cell-label">${ach.label}${badge}</span><span class="ach-cell-desc">${ach.desc}</span></div></div>`;
    };
    // まとめカード: かいほう数の バー、だんかいごとの かず、さいきん、つぎの もくひょう
    const total = ACHIEVEMENTS.length || 1;
    const tierChips = ACHIEVEMENT_TIERS.map((tier) => {
      const list = ACHIEVEMENTS.filter((a) => a.tier === tier.id);
      const done = list.filter((a) => unlockedSet.has(a.id)).length;
      return `<span class="ach-tier-chip ${done === list.length ? 'done' : ''}" title="${tier.label}">${commentTextHTML(tier.emoji)}${done}/${list.length}</span>`;
    }).join('');
    const nextGoals = ACHIEVEMENTS.filter((a) => !unlockedSet.has(a.id)).slice(0, 3);
    const recent = ACHIEVEMENTS.filter((a) => unlockedSet.has(a.id) && at[a.id]).sort((a, b) => at[b.id] - at[a.id]).slice(0, 3);
    const headline = unlockedCount >= ACHIEVEMENTS.length ? '👑ぜんぶたっせい!' : `あと${ACHIEVEMENTS.length - unlockedCount}こ`;
    let html = `<div class="records-summary ach-summary"><div class="records-head"><span class="records-title">${commentIconHTML('🏅')}じっせきのまとめ</span><span class="records-headline">${commentTextHTML(headline)}</span></div>`
      + `<div class="records-row"><span class="records-label">たっせい</span><span class="records-bar"><span class="records-bar-fill ach-fill" style="width:${(unlockedCount / total * 100).toFixed(1)}%"></span></span><span class="records-num">${unlockedCount}/${ACHIEVEMENTS.length}</span></div>`
      + `<div class="ach-tier-chips">${tierChips}</div>`
      + (recent.length ? `<div class="ach-mini-list"><span class="ach-mini-title">さいきんたっせい</span>${recent.map((a) => `<span class="ach-mini ${isNew(a) ? 'new' : ''}">${achievementIconHTML(a)}${a.label}</span>`).join('')}</div>` : '')
      + (nextGoals.length ? `<div class="ach-mini-list"><span class="ach-mini-title">つぎのもくひょう</span>${nextGoals.map((a) => `<span class="ach-mini goal">${achievementIconHTML(a)}${a.label}</span>`).join('')}</div>` : '')
      + '</div>';
    for (const tier of ACHIEVEMENT_TIERS) {
      const list = ACHIEVEMENTS.filter((a) => a.tier === tier.id);
      if (!list.length) continue;
      const done = list.filter((a) => unlockedSet.has(a.id)).length;
      html += `<div class="game-section-title"><span>${commentTextHTML(tier.emoji)} ${tier.label}</span><span class="game-section-meta">${done}/${list.length}${done === list.length ? ' '+commentIconHTML('✅') : ''}</span></div>`;
      html += list.map(cell).join('');
    }
    el.achGrid.innerHTML = html;
  }

  // 「ゲームきろく」タブ: ぜんゲームを ジャンルごとに ならべ、じこベスト・
  // ランク・あそんだ かいすうを 見せる。タップすると その ゲームで あそべる
  // (「あそぶ」と おなじ 条件・おなじ ごほうび)
  // --- きょうの チャレンジ: ひづけ(YYYY-MM-DD)から 1本 きまる。1日1かい だけ ---
  function dailyKey(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function dailyChallengeGame() {
    const pool = buildMinigamePool().slice().sort((a, b) => (a.id < b.id ? -1 : 1));
    if (!pool.length) return null;
    let h = 0; for (const ch of dailyKey()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return pool[h % pool.length];
  }
  function dailyChallengeToday() {
    const d = state.lifetime.dailyChallenge;
    return d && d.date === dailyKey() ? d : null;
  }
  let gameListSort = 'genre'; // genre / unplayed / low / high
  const GAME_LIST_SORTS = [['genre', 'ジャンル'], ['unplayed', 'まだあそんでない'], ['low', 'ランクの低い順'], ['high', 'ベストの高い順']];

  function renderGameList() {
    if (!el.gameListGrid) return;
    const pool = buildMinigamePool();
    const effectiveSeason = getEffectiveSeason();
    let played = 0;
    const rankCounts = { S: 0, A: 0, B: 0, C: 0, D: 0 };
    for (const game of pool) {
      const record = minigameRecordOf(game);
      if (!record) continue;
      played += 1;
      rankCounts[minigameRankOf(record.best)] += 1;
    }
    el.achProgress.textContent = `あそんだ${played} / ${pool.length}`;
    let html = '';
    // まとめカード: あそんだ わりあいの バー、ランクの うちわけ バー、のこり本数
    const total = pool.length || 1;
    const left = pool.length - played;
    const rankOrder = ['S', 'A', 'B', 'C', 'D'];
    const rankBar = rankOrder.map((r) => rankCounts[r] ? `<span class="rank-bar-seg seg-${r}" style="width:${(rankCounts[r] / total * 100).toFixed(1)}%"></span>` : '').join('') + (left ? `<span class="rank-bar-seg seg-none" style="width:${(left / total * 100).toFixed(1)}%"></span>` : '');
    const rankCells = rankOrder.map((r) => `<span class="rank-count"><span class="mg-rank rank-${r}">${r}</span>${rankCounts[r]}</span>`).join('');
    const bestAvg = played ? Math.round(pool.reduce((a, g) => { const r = minigameRecordOf(g); return a + (r ? r.best : 0); }, 0) / played) : 0;
    const complete = left === 0;
    const headline = complete
      ? (rankCounts.S >= pool.length ? '👑全部Sランク!' : `🏁100本コンプリート!Sランクまであと${pool.length - rankCounts.S}本`)
      : `あと${left}本でコンプリート`;
    html += `<div class="records-summary"><div class="records-head"><span class="records-title">📒記録のまとめ</span><span class="records-headline">${headline}</span></div>`
      + `<div class="records-row"><span class="records-label">あそんだ</span><span class="records-bar"><span class="records-bar-fill" style="width:${(played / total * 100).toFixed(1)}%"></span></span><span class="records-num">${played}/${pool.length}</span></div>`
      + `<div class="records-row"><span class="records-label">ランク</span><span class="records-bar rank-bar">${rankBar}</span><span class="records-num">${played ? '平均' + bestAvg + '点' : '—'}</span></div>`
      + `<div class="records-ranks">${rankCells}</div></div>`;
    // きょうの チャレンジ カード
    const daily = dailyChallengeGame();
    if (daily) {
      const dInfo = minigameInfo(daily);
      const done = dailyChallengeToday();
      const streak = state.lifetime.dailyStreak || 0;
      const status = done && done.score != null
        ? `<span class="mg-rank rank-${done.rank}">${done.rank}</span><span class="daily-score">${done.score}点</span>`
        : `<button type="button" class="mg-tap-btn primary daily-start" data-game-id="${daily.id}">ちょうせん</button>`;
      html += `<div class="daily-card ${done ? 'done' : ''}"><div class="daily-head">🗓️ きょうのチャレンジ${streak > 0 ? `<span class="daily-streak">🔥${streak}日連続</span>` : ''}</div><div class="daily-body"><span class="game-cell-emoji">${dInfo.emoji}</span><div class="game-cell-text"><span class="game-cell-label">${dInfo.name}</span><span class="game-cell-desc">${done ? '今日はクリア済み。また明日!' : '1日1回。クリアで💰10〜60＋連続ボーナス／せいちょう2ばい（10分）'}</span></div><div class="daily-status">${status}</div></div></div>`;
    }
    html += `<div class="game-list-sorts">${GAME_LIST_SORTS.map(([id, label]) => `<button type="button" class="game-list-sort ${gameListSort === id ? 'active' : ''}" data-sort="${id}">${label}</button>`).join('')}</div>`;
    html += `<div class="game-list-hint">タップでゲームをはじめるよ（げんきを使う）。むずかしさ：${DIFFICULTY_CHOICES[minigameDifficultyMode()][1]}（せかい画面で変えられる）</div>`;
    const bestOf = (game) => { const r = minigameRecordOf(game); return r ? r.best : -1; };
    const sections = [];
    if (gameListSort === 'genre') {
      for (const genre of MINIGAME_GENRES) {
        const games = pool.filter((game) => minigameGenreId(game) === genre.id);
        if (!games.length) continue;
        const done = games.filter((game) => minigameRecordOf(game)).length;
        const s = games.filter((game) => { const r = minigameRecordOf(game); return r && minigameRankOf(r.best) === 'S'; }).length;
        sections.push({ title: `${genre.emoji} ${genre.label}`, meta: `${done}/${games.length}${s ? ` <span class="mg-rank rank-S mini">S</span>${s}` : ''}`, games });
      }
    } else if (gameListSort === 'unplayed') {
      const games = pool.filter((game) => !minigameRecordOf(game)); sections.push({ title: `🗂️まだ記録のないゲーム（${games.length}）`, games });
    } else if (gameListSort === 'low') {
      const games = pool.slice().sort((a, b) => bestOf(a) - bestOf(b)); sections.push({ title: '📉ランクの低い順（まだあそんでない→D→S）', games });
    } else {
      const games = pool.slice().sort((a, b) => bestOf(b) - bestOf(a)); sections.push({ title: '📈ベストの高い順', games });
    }
    for (const section of sections) {
      const games = section.games;
      const titleHtml = `<div class="game-section-title"><span>${section.title}</span>${section.meta ? `<span class="game-section-meta">${section.meta}</span>` : ''}</div>`;
      if (!games.length) { html += `${titleHtml}<div class="game-list-hint">全部記録がある!</div>`; continue; }
      html += titleHtml;
      for (const game of games) {
        const info = minigameInfo(game);
        const record = minigameRecordOf(game);
        const plays = minigamePlayCount(game);
        const home = minigameHomeOf.get(game);
        const isNow = home && ((home.kind === 'region' && home.id === state.regionId) || (home.kind === 'season' && home.id === effectiveSeason));
        const tag = home ? `<span class="game-cell-tag ${isNow ? 'now' : ''}">${home.emoji}${home.label}${isNow ? ' 2ばい' : ''}</span>` : '';
        const rank = record ? minigameRankOf(record.best) : null;
        const rankHtml = rank ? `<span class="mg-rank rank-${rank}">${rank}</span>` : '<span class="mg-rank rank-none">—</span>';
        const bestHtml = record ? `<span class="game-cell-best">ベスト${record.best}点</span>` : `<span class="game-cell-best">${plays ? '記録なし' : 'まだあそんでない'}</span>`;
        const lastHtml = record && record.last != null && record.last !== record.best ? `<span class="game-cell-plays">前回${record.last}点</span>` : '';
        const playsHtml = plays ? `<span class="game-cell-plays">${plays}かい</span>` : '';
        html += `<button type="button" class="game-cell ${record ? 'known' : 'unplayed'} ${isNow ? 'spotlight' : ''} ${rank ? 'accent-' + rank : ''}" data-game-id="${game.id}"><span class="game-cell-emoji">${info.emoji}</span><div class="game-cell-text"><span class="game-cell-label">${info.name}${tag}</span><span class="game-cell-desc">${info.desc}</span></div><div class="game-cell-record">${rankHtml}${bestHtml}${lastHtml}${playsHtml}</div></button>`;
      }
    }
    el.gameListGrid.innerHTML = html;
  }

  function designPreview(target, colorId, patternId) {
    const color = COLOR_THEMES.find(t => t.id === colorId && isThemeUnlocked(t)) || COLOR_THEMES[0];
    const pattern = PATTERNS.find(p => p.id === patternId && isThemeUnlocked(p)) || PATTERNS[0];
    return `<span class="theme-swatch-circle surface-${target} theme-${color.id} pattern-${pattern.id}" aria-hidden="true"></span>`;
  }

  function renderThemeSwatchGrid(gridEl, selectedId, target, patternId) {
    selectedId = COLOR_THEMES.find(t => t.id === selectedId && isThemeUnlocked(t))?.id || 'default';
    gridEl.innerHTML = COLOR_THEMES.map((t) => {
      const unlocked = isThemeUnlocked(t);
      const selected = unlocked && t.id === selectedId;
      const label = unlocked ? t.label : '？？？';
      const preview = unlocked ? designPreview(target,t.id,patternId) : '<span class="theme-swatch-circle">🔒</span>';
      return `<button type="button" class="theme-swatch ${unlocked ? '' : 'locked'} ${selected ? 'selected' : ''}" data-id="${t.id}" aria-pressed="${selected}" ${unlocked ? '' : 'disabled'}>${preview}<span class="theme-swatch-label">${label}</span></button>`;
    }).join('');
  }

  // Preview the actual selected color with each motif, using the same CSS.
  function renderPatternSwatchGrid(gridEl, selectedId, target, colorId) {
    selectedId = PATTERNS.find(p => p.id === selectedId && isThemeUnlocked(p))?.id || 'none';
    gridEl.innerHTML = PATTERNS.map((p) => {
      const unlocked = isThemeUnlocked(p);
      const selected = unlocked && p.id === selectedId;
      const label = unlocked ? p.label : '？？？';
      const preview = unlocked ? designPreview(target,colorId,p.id) : '<span class="theme-swatch-circle">🔒</span>';
      return `<button type="button" class="theme-swatch ${unlocked ? '' : 'locked'} ${selected ? 'selected' : ''}" data-id="${p.id}" aria-pressed="${selected}" ${unlocked ? '' : 'disabled'}>${preview}<span class="theme-swatch-label">${label}</span></button>`;
    }).join('');
  }

  function renderThemeOverlay() {
    // ヘッダーの ぜんたい数は、いろ(COLOR_THEMES)と がら(PATTERNS)
    // を あわせた かずで あらわす
    const unlockedColors = COLOR_THEMES.filter((t) => isThemeUnlocked(t)).length;
    const unlockedPatterns = PATTERNS.filter((p) => isThemeUnlocked(p)).length;
    el.themeProgress.textContent = `${unlockedColors + unlockedPatterns} / ${COLOR_THEMES.length + PATTERNS.length}`;
    renderThemeSwatchGrid(el.deviceThemeGrid, state.lifetime.deviceThemeId, 'device', state.lifetime.devicePatternId);
    renderThemeSwatchGrid(el.screenThemeGrid, state.lifetime.screenThemeId, 'screen', state.lifetime.screenPatternId);
    renderPatternSwatchGrid(el.devicePatternGrid, state.lifetime.devicePatternId, 'device', state.lifetime.deviceThemeId);
    renderPatternSwatchGrid(el.screenPatternGrid, state.lifetime.screenPatternId, 'screen', state.lifetime.screenThemeId);
    el.fontSelect.value = state.lifetime.fontStyle || 'rounded';
    el.textSizeSelect.value = state.lifetime.textSize || 'normal';
  }

  // なおとっち本体の しゅぞく・せいちょう段階・せいべつ・れんあいタイプ・
  // せいかく傾向(traitCounts)と、こいびとが いれば その せいべつ・
  // れんあいタイプ・affinityTrait を まとめて 見せる
  function renderProfile() {
    renderSaveSnaps();
    renderLifeTimeline();
    renderErrorLog();
    el.profileSpecies.textContent = SPECIES_DISPLAY_NAMES[state.speciesLine] || '???';
    el.profileStage.textContent = currentStageLabel();
    el.profileGender.textContent = state.gender ? GENDER_LABELS[state.gender] : '???';

    let orientationText = state.orientationId ? orientationLabel(state.orientationId, state.gender) : '???';
    if (state.orientationId === 'questioning') {
      orientationText += ` —さがしちゅう${state.questioningEncounters || 0}/${questioningResolveThreshold()}`;
    }
    el.profileOrientation.textContent = orientationText;
    // アロマンティック/クエスチョニングは ごかいされやすい ことばな ので、
    // 「？」ボタンを タップ(ホバーできない タッチ端末でも つかえるように)
    // すると せつめいが ひらく。アロマンティックは「人を あいせない」わけ
    // では なく、なかま/ともだちとの ふかい きずなは これまでどおり
    // きずける。クエスチョニングは「まだ さがしている とちゅう」で あって
    // しっぱいでは ない、という トーン。プロフィールは キャラ情報を
    // かんけつに 見せたいので、この せつめいは デフォルトでは たたんでおく
    const ORIENTATION_HELP_TEXT = {
      aro: 'だれかを恋愛の意味で「好き」になる気持ちが、あまりわいてこない子。'
        + 'だから「きゅうあい」を押してもこいびとにはならないけれど、'
        + 'なかまや友達とは、これまでどおり仲よくなれるよ。'
        + '恋愛をするかどうかと、だれかを大切にする気持ちは別のことだよ',
      questioning: '自分がだれを好きになるのか、まだ探している途中の子。'
        + `「きゅうあい」を押すたびに経験が1つたまって、${questioningResolveThreshold()}回たまると、自分の気持ちがはっきりする。`
        + 'うまくいかなかった回も、ちゃんと経験になるよ',
    };
    const helpText = ORIENTATION_HELP_TEXT[state.orientationId];
    el.profileOrientationHelpBtn.classList.toggle('hidden', !helpText);
    if (!helpText) orientationHintOpen = false;
    el.profileOrientationHint.textContent = helpText || '';
    el.profileOrientationHint.classList.toggle('hidden', !helpText || !orientationHintOpen);
    el.profileOrientationHelpBtn.onclick = () => {
      orientationHintOpen = !orientationHintOpen;
      renderProfile();
    };

    const maxTrait = Math.max(1, ...Object.values(state.traitCounts));
    el.profileTraits.innerHTML = Object.keys(TRAIT_LABELS).map((key) => {
      const value = state.traitCounts[key] || 0;
      const pct = Math.round((value / maxTrait) * 100);
      return `
        <div class="profile-trait-row">
          <span class="profile-trait-label">${TRAIT_LABELS[key]}</span>
          <div class="profile-trait-bar"><div class="profile-trait-fill" style="width:${pct}%"></div></div>
        </div>
      `;
    }).join('');

    if (state.partner) {
      const p = state.partner;
      const bondHint = p.married
        ? ''
        : `<span class="profile-partner-detail">つぎのふしめまであと${marriageBondThreshold() - (p.bondCount || 0)}かいのきゅうあい</span>`;
      el.profilePartnerCard.innerHTML = `
        <div class="profile-partner-card">
          <span class="profile-partner-emoji">${partnerVisualHTML(p)}</span>
          <div class="profile-partner-text">
            <span class="profile-partner-name">${escapeHtml(compactJapaneseText(p.label))}(${p.married ? '夫婦💍' : 'こいびと💑'})</span>
            <span class="profile-partner-detail">${GENDER_LABELS[p.gender]}・${orientationLabel(p.orientationId, p.gender)}</span>
            <span class="profile-partner-detail">すきなところ: ${TRAIT_LABELS[p.affinityTrait] || 'とくになし'}</span>
            ${bondHint}
          </div>
        </div>
        <div class="profile-trait-row" style="margin-top:6px;">
          <span class="profile-trait-label">なかよし度</span>
          <div class="profile-trait-bar"><div class="profile-trait-fill" style="width:${p.affection ?? 100}%"></div></div>
        </div>
      `;
    } else {
      el.profilePartnerCard.innerHTML = '<div class="profile-empty">まだこいびとはいません</div>';
    }

    if (state.companions.length) {
      el.profileCompanionList.innerHTML = state.companions.map((sc) => {
        const c = allCompanionsById(sc.id);
        if (!c) return '';
        return `
          <div class="profile-companion-row">
            <span class="profile-companion-emoji">${companionVisualHTML(c, 'companion')}</span>
            <span class="profile-companion-name">${c.name}</span>
            <div class="profile-trait-bar"><div class="profile-trait-fill" style="width:${sc.bond ?? 100}%"></div></div>
          </div>
        `;
      }).join('');
    } else {
      el.profileCompanionList.innerHTML = '<div class="profile-empty">いまそばにいるなかまはいません</div>';
    }
  }

  // プロフィールと ついに なる「つうしん」画面: あいてコード(state.guest の
  // ひょうじ)と、うそつきしょうぶへの いりぐちを まとめて もつ
  function renderCommOverlay() {
    if (state.guest) {
      const g = state.guest;
      const stage = SPECIES[g.speciesLine].stages[g.stageIndex];
      // すでに べつの あいてと こいびと/夫婦の ときは、「きゅうあいする」が
      // いまの あいてと いちゃつく だけに なってしまい、この おきゃくさんが
      // ぜったいに こうほに あがらない - なぜ なにも おきないのか わからず
      // こまらないよう、ここで はっきり りゆうを つたえる
      const blockedHint = state.partner && state.partner.id !== 'guest'
        ? '<div class="profile-hint">いまは別のあいてとこいびと・夫婦になっています。このおきゃくさんにきゅうあいするには、いまのあいてと別れる必要があります</div>'
        : '';
      el.guestStatus.innerHTML = `
        <div class="profile-partner-card">
          <span class="profile-partner-emoji">${stageVisualHTML(stage, 'thumb')}</span>
          <div class="profile-partner-text">
            <span class="profile-partner-name">ともだちの${stage.label}</span>
            <span class="profile-partner-detail">${GENDER_LABELS[g.gender]}・${orientationLabel(g.orientationId, g.gender)}</span>
          </div>
        </div>
        ${blockedHint}
        <button class="profile-code-btn" id="clearGuestBtn">おきゃくをけす</button>
      `;
    } else {
      el.guestStatus.innerHTML = '<div class="profile-empty">まだおきゃくさんはいません</div>';
    }
  }

  function selectTheme(target, id) {
    if (target === 'devicePattern' || target === 'screenPattern') {
      const pattern = PATTERNS.find((p) => p.id === id);
      if (!pattern || !isThemeUnlocked(pattern)) return;
      if (target === 'devicePattern') state.lifetime.devicePatternId = id;
      else state.lifetime.screenPatternId = id;
      saveState();
      render();
      return;
    }
    const theme = COLOR_THEMES.find((t) => t.id === id);
    if (!theme || !isThemeUnlocked(theme)) return;
    if (target === 'device') state.lifetime.deviceThemeId = id;
    else state.lifetime.screenThemeId = id;
    saveState();
    render();
  }

  // 「せかい」→「きせつを かえる」がめん。でざいんの いろ・がら スウォッチ
  // (.theme-swatch)と おなじ 見た目を りようして、5つの せってい モード
  // (げんじつに あわせる/はる/なつ/あき/ふゆ)を いちらん表示する。ロックは
  // ないので、でざいんとちがい ぜんぶ つねに えらべる
  function renderSeasonModeGrid() {
    const currentMode = state.lifetime.seasonMode || SEASON_MODE_AUTO;
    if (el.seasonModeGrid.dataset.choiceMode === currentMode) return;
    el.seasonModeGrid.dataset.choiceMode = currentMode;
    el.seasonModeGrid.innerHTML = SEASON_MODE_ORDER.map((mode) => {
      const info = mode === SEASON_MODE_AUTO ? { emoji: '🕐', label: 'げんざい' } : SEASON_INFO[mode];
      const selected = mode === currentMode;
      return `<button type="button" class="theme-swatch ${selected ? 'selected' : ''}" data-id="${mode}" aria-pressed="${selected}"><span class="theme-swatch-circle">${environmentIconHTML('season',mode,info.emoji)}</span><span class="theme-swatch-label">${info.label}</span></button>`;
    }).join('');
  }

  function selectSeasonMode(mode) {
    if (!SEASON_MODE_ORDER.includes(mode)) return;
    // 「じっこうされる きせつ」じたいが かわった ときだけ、みじかい
    // きりかえ えんしゅつを だす(おなじ きせつに なる せんたくを
    // くりかえしても、そのたびに バーストが 出たりは しない)
    const seasonBefore = getEffectiveSeason();
    state.lifetime.seasonMode = mode;
    const seasonAfter = getEffectiveSeason();
    saveState();
    render();
    if (seasonAfter !== seasonBefore) {
      celebrateSeasonChange(state.regionId, seasonAfter);
    }
  }

  // 「せかい」→「たびに でる」がめん。きせつの えらびかたと おなじ
  // theme-swatch グリッドで、8つの地域を いちらん表示する。いま いる
  // 地域は selected の ハイライトを つけつつ、そこへは「たびに でる」
  // いみが ないので タップできないよう disabled に する
  function renderTravelRegionGrid() {
    // 地域カード: こうか・出やすいゲーム・こいびと候補・ごとうちゲーム・おとずれた しるし
    const visited = new Set([...(state.lifetime.regionsVisited || []), ...(state.lifetime.specialRegionsVisited || [])]);
    const swatch = (region) => {
      const isCurrent = region.id === state.regionId;
      const effect = ENV_EFFECTS.region[region.id] ? ENV_EFFECTS.region[region.id].text : '';
      const weights = ENV_GAME_WEIGHTS.region[region.id] || {};
      const ups = MINIGAME_GENRES.filter((g) => weights[g.id] > 1).map((g) => g.emoji + g.label);
      const local = (REGION_MINIGAMES[region.id] || []).length;
      const partners = Array.isArray(region.candidates) ? region.candidates.length : 0;
      const activity = REGION_MOMENT_HINTS[region.id] || '';
      const lines = [effect, ups.length ? `ゲーム：${ups.join('・')}↑` : '', local ? `ごとうちゲーム：${local}本` : '', activity, partners ? `こいびと候補：${partners}人` : ''].filter(Boolean);
      return `<button type="button" class="theme-swatch travel-card ${isCurrent ? 'selected' : ''} ${visited.has(region.id) ? 'visited' : ''}" data-id="${region.id}" ${isCurrent ? 'disabled' : ''} aria-pressed="${isCurrent}"><span class="travel-card-head"><span class="theme-swatch-circle">${environmentIconHTML('region',region.id,region.emoji)}</span><span class="travel-card-title">${escapeHtml(region.label)}${isCurrent ? '<span class="travel-card-tag now">いまここ</span>' : visited.has(region.id) ? '<span class="travel-card-tag">✓</span>' : ''}</span></span><span class="travel-card-lines">${lines.map((t) => `<span>${t}</span>`).join('')}</span></button>`;
    };
    el.travelRegionGrid.innerHTML = REGIONS.map(swatch).join('');
    // そだち70「たびだち」に とどいて はじめて、ふつうの 地域の したに
    // 「とくべつな たびさき」が あらわれる。REGIONS とは べつ わく なので、
    // じっせきの「せかい いっしゅう」も「こいびと ぜんいん」も
    // これまでと まったく おなじ じょうけんの まま
    const showSpecial = hasPerk(70);
    el.travelSpecialSection.classList.toggle('hidden', !showSpecial);
    el.travelSpecialGrid.innerHTML = showSpecial ? SPECIAL_REGIONS.map(swatch).join('') : '';
  }

  // 「アイテム」がめん: SHOP_ITEMS を みにつける ものの いちらんとして
  // あらわす。みぶんに おうじて みぶんの ひょうじが かわる: みこうにゅう
  // なら ねだん、こうにゅうずみで そうびちゅうでなければ「タップで そうび」、
  // そうびちゅうなら「そうびちゅう」
  // うそつきしょうぶの 画面ぶぶんを きりかえる ヘルパー。同時に
  // エラーひょうじも クリアしておき、まえの がめんの エラーが
  // のこったままに ならないようにする
  function goToDuelStep(step) {
    duelUiStep = step;
    el.duelBetError.classList.add('hidden');
    el.duelGuessCodeError.classList.add('hidden');
    el.duelCodeInError.classList.add('hidden');
    el.duelGuessConfirmError.classList.add('hidden');
    el.duelSuspicionError.classList.add('hidden');
    if (step === 'result') {
      duelRevealIndex = 0;
      duelRevealPhase = 'pending';
    }
  }

  // 画面を とじて また ひらいたときに、state.duel の 進行じょうきょうから
  // どの がめんに もどるべきかを きめる。あんごうを つくる encodeDuel*
  // 系の 関数は state.duel から なんども つくりなおせるので、コードを
  // 見せる がめんへは いつでも あんぜんに もどれる
  function duelResumeStep() {
    const d = state.duel;
    if (!d) return 'home';
    if (d.role === 'challenger') {
      if (d.step === 'answering') return 'question';
      if (d.step === 'review') return 'answerReview';
      if (d.step === 'ready') return 'codeOut';
      if (d.step === 'done') return d.revealSent ? 'result' : 'codeOut';
    } else if (d.role === 'guesser') {
      if (d.step === 'guessing') return 'guessList';
      if (d.step === 'suspicion') return 'guessSuspicion';
      if (d.step === 'ready') return 'codeOut';
      if (d.step === 'done') return 'result';
    }
    return 'home';
  }

  function renderDuelOverlay() {
    const sections = {
      duelHomeSection: duelUiStep === 'home',
      duelBetSection: duelUiStep === 'bet',
      duelGuessCodeInSection: duelUiStep === 'guessCodeIn',
      duelQuestionSection: duelUiStep === 'question',
      duelAnswerReviewSection: duelUiStep === 'answerReview',
      duelGuessListSection: duelUiStep === 'guessList',
      duelSuspicionSection: duelUiStep === 'guessSuspicion',
      duelCodeOutSection: duelUiStep === 'codeOut',
      duelCodeInSection: duelUiStep === 'codeIn',
      duelResultSection: duelUiStep === 'result',
    };
    Object.keys(sections).forEach((id) => el[id].classList.toggle('hidden', !sections[id]));

    if (duelUiStep === 'home') {
      const played = state.lifetime.duelMatchesPlayed || 0;
      const wins = state.lifetime.duelWins || 0;
      const losses = state.lifetime.duelLosses || 0;
      const draws = state.lifetime.duelDraws || 0;
      el.duelRecord.textContent = played > 0 ? `${played}戦${wins}勝${losses}敗${draws ? ` ${draws}分け` : ''}` : 'まだたいせんしていません';
      const traits = state.lifetime.duelTraits || {};
      const totalTrait = Object.values(traits).reduce((a, b) => a + b, 0);
      if (totalTrait === 0) {
        el.duelTraitSummary.innerHTML = '<div class="profile-empty">まだ傾向はわかりません。しょうぶでこたえていくと見えてきます</div>';
      } else {
        const maxTrait = Math.max(1, ...Object.values(traits));
        el.duelTraitSummary.innerHTML = Object.keys(DUEL_TRAIT_LABELS).map((key) => {
          const pct = Math.round(((traits[key] || 0) / maxTrait) * 100);
          return `
            <div class="profile-trait-row">
              <span class="profile-trait-label">${DUEL_TRAIT_LABELS[key]}</span>
              <div class="profile-trait-bar"><div class="profile-trait-fill" style="width:${pct}%"></div></div>
            </div>
          `;
        }).join('');
      }
    }

    if (duelUiStep === 'bet') {
      el.duelOwnMoney.textContent = `💰 ${state.lifetime.money}`;
    }

    if (duelUiStep === 'question' && state.duel) {
      renderDuelQuestionStep();
    }

    if (duelUiStep === 'answerReview' && state.duel) {
      renderDuelAnswerReviewStep();
    }

    if (duelUiStep === 'guessList' && state.duel) {
      renderDuelGuessListStep();
    }

    if (duelUiStep === 'guessSuspicion' && state.duel) {
      renderDuelSuspicionStep();
    }

    if (duelUiStep === 'codeOut' && state.duel) {
      const d = state.duel;
      let code = '';
      let hint = '';
      if (d.role === 'challenger' && d.step === 'ready') {
        code = encodeDuelChallenge();
        hint = '「挑戦コード」を相手に送ろう。「推理コード」が返ってきたら、ここで読みこめます';
      } else if (d.role === 'challenger' && d.step === 'done') {
        code = encodeDuelReveal();
        hint = '結果が出たよ!「決着コード」を相手に送ると、相手も結果を見られます';
      } else if (d.role === 'guesser') {
        code = encodeDuelGuess();
        hint = '「推理コード」を相手に返そう。「決着コード」が届いたら、ここで読みこめます';
      }
      el.duelCodeOutBox.value = code;
      el.duelCodeOutHint.textContent = hint;
      el.duelCodeOutCopyMsg.classList.add('hidden');
      // 挑戦コードを 発行して あいての 返事まちの あいだ(d.step==='ready')
      // だけ「やめる」を 出す。発行ずみの コードは 書きかえられない ため、
      // ないようを 変えたい ときは まっさらな しょうぶを つくりなおす
      // しかない。すでに 推理コードを よみこんで けっちゃくずみ
      // (d.step==='done')の 決着コードがめんでは 出さない
      el.duelAbandonBtn.classList.toggle('hidden', !(d.role === 'challenger' && d.step === 'ready'));
    }

    if (duelUiStep === 'codeIn' && state.duel) {
      const d = state.duel;
      el.duelCodeInHint.textContent = d.role === 'challenger'
        ? 'あいてからとどいた「推理コード」をここに入れてください'
        : 'あいてからとどいた「決着コード」をここに入れてください';
      el.duelCodeInAbandonBtn.classList.toggle('hidden', !(d.role === 'challenger' && d.step === 'ready'));
    }

    if (duelUiStep === 'result' && state.duel) {
      renderDuelResultStep();
    }
  }

  // A(かいとうしゃ)の しつもん画面。おなじ しつもんの なかで
  // 1.本心を えらぶ → 2.本音/うそを えらぶ(+ひとこと証言)、の 2だんかいを
  // つづけて おこなう(pendingTruth が null なら 1だんかいめ、はいって
  // いれば 2だんかいめを 表示する)ことで、画面いどうを へらしている。
  // すでに こたえずみの しつもんを もどる/編集で 見なおしている ときも
  // おなじ 画面を つかい、以前の 本心/証言が pending に つみなおされた
  // じょうたいで 表示される
  function renderDuelQuestionStep() {
    const d = state.duel;
    if (!d || d.role !== 'challenger') return;
    const idx = d.currentIndex;
    const q = d.questions[idx];
    if (!q) return;
    const answeredCount = d.entries.filter((e) => e !== null).length;
    el.duelProgress.textContent = `しつもん${idx + 1} / ${d.questions.length}(かいとうずみ${answeredCount}問)`;
    el.duelLieCoinRow.classList.remove('hidden');
    el.duelLieCoinCount.textContent = `${d.lieCoinsMax - duelLieCoinsUsed(d)} / ${d.lieCoinsMax}`;
    el.duelQuestionEmoji.textContent = q.emoji;
    setCommentText(el.duelQuestionText, compactJapaneseText(q.text));
    el.duelLieFlash.classList.add('hidden');
    el.duelBackBtn.disabled = idx <= 0 && d.pendingTruth == null;

    if (d.pendingTruth == null) {
      el.duelQuestionShown.classList.add('hidden');
      el.duelTruthChoiceRow.classList.remove('hidden');
      el.duelHonestyChoiceRow.classList.add('hidden');
      el.duelChoiceABtn.textContent = compactJapaneseText(q.a.label);
      el.duelChoiceBBtn.textContent = compactJapaneseText(q.b.label);
      el.duelChoiceABtn.dataset.choice = 'a';
      el.duelChoiceBBtn.dataset.choice = 'b';
      const existing = d.entries[idx];
      el.duelChoiceABtn.classList.toggle('duel-choice-current', !!existing && existing.truth === 'a');
      el.duelChoiceBBtn.classList.toggle('duel-choice-current', !!existing && existing.truth === 'b');
    } else {
      const chosenSide = d.pendingTruth === 'a' ? q.a : q.b;
      el.duelQuestionShown.textContent = `あなたの本心:「${compactJapaneseText(chosenSide.label)}」`;
      el.duelQuestionShown.classList.remove('hidden');
      el.duelTruthChoiceRow.classList.add('hidden');
      el.duelHonestyChoiceRow.classList.remove('hidden');
      el.duelLieBtn.disabled = duelLieCoinsUsed(d, idx) >= d.lieCoinsMax;
      el.duelTestimonyRow.innerHTML = DUEL_TESTIMONY_PRESETS.map((t) => `
        <button type="button" class="duel-testimony-chip ${d.pendingTestimony === t.id ? 'selected' : ''}" data-testimony="${t.id}">${t.label}</button>
      `).join('');
    }
  }

  // A: 回答確認画面(review)。5問ぶんの 質問・本心・本音/うそ・こうかいされる
  // こたえ・証言を いちらん表示し、タップで その しつもんを 編集しなおせる
  function renderDuelAnswerReviewStep() {
    const d = state.duel;
    if (!d || d.role !== 'challenger' || d.step !== 'review') return;
    el.duelAnswerReviewList.innerHTML = d.entries.map((e, idx) => {
      const q = d.questions[idx];
      const truthSide = e.truth === 'a' ? q.a : q.b;
      const pubSide = e.pub === 'a' ? q.a : q.b;
      const testimonyPreset = e.testimony ? DUEL_TESTIMONY_PRESETS.find((t) => t.id === e.testimony) : null;
      const testimonyText = testimonyPreset ? `・💬「${testimonyPreset.label}」` : '';
      return `
        <button type="button" class="duel-review-row" data-index="${idx}">
          <span class="duel-review-row-emoji">${q.emoji}</span>
          <div class="duel-review-row-text">
            <span class="duel-review-row-q">${escapeHtml(compactJapaneseText(q.text))}</span>
            <span class="duel-review-row-detail">本心:「${escapeHtml(compactJapaneseText(truthSide.label))}」・${e.isLie ? '🃏うそでこうかい' : '😇本音でこうかい'}${testimonyText}</span>
            <span class="duel-review-row-pub">あいてに見えるこたえ:「${escapeHtml(compactJapaneseText(pubSide.label))}」</span>
          </div>
          <span class="duel-review-row-edit">✏️</span>
        </button>
      `;
    }).join('');
    el.duelAnswerReviewLieCount.textContent = `${duelLieCoinsUsed(d)} / ${d.lieCoinsMax}`;
    el.duelRerollConfirmRow.classList.add('hidden');
  }

  // B(すいりしゃ)の すいり画面。5問ぶんの こうかいされた こたえを
  // まとめて 見くらべながら、じゅんばん じゆうに 本音/うそ+自信度を
  // えらべる(1問ずつ かくてい していく かたちには しない)
  function renderDuelGuessListStep() {
    const d = state.duel;
    if (!d || d.role !== 'guesser') return;
    el.duelGuessList.innerHTML = d.items.map((item) => {
      const q = item.question;
      const shownSide = item.pub === 'a' ? q.a : q.b;
      const current = d.guesses.find((g) => g.qId === item.qId);
      const testimonyPreset = item.testimony ? DUEL_TESTIMONY_PRESETS.find((t) => t.id === item.testimony) : null;
      const testimonyHtml = testimonyPreset ? `<div class="duel-guess-row-testimony">💬「${testimonyPreset.label}」</div>` : '';
      return `
        <div class="duel-guess-row" data-qid="${item.qId}">
          <div class="duel-guess-row-head">
            <span class="duel-guess-row-emoji">${q.emoji}</span>
            <span class="duel-guess-row-text">${escapeHtml(compactJapaneseText(q.text))}</span>
          </div>
          <div class="duel-guess-row-pub">こうかいされたこたえ:「${escapeHtml(compactJapaneseText(shownSide.label))}」</div>
          ${testimonyHtml}
          <div class="duel-guess-row-buttons">
            <button type="button" class="duel-guess-btn ${current && current.guess === 'honest' ? 'selected' : ''}" data-guess="honest">😇本音だと思う</button>
            <button type="button" class="duel-guess-btn ${current && current.guess === 'lie' ? 'selected' : ''}" data-guess="lie">🃏うそだと思う</button>
          </div>
          <div class="duel-guess-row-confidence">
            <button type="button" class="duel-confidence-btn ${current && current.confidence === 'maybe' ? 'selected' : ''}" data-confidence="maybe">🤔たぶん</button>
            <button type="button" class="duel-confidence-btn ${current && current.confidence === 'certain' ? 'selected' : ''}" data-confidence="certain">🔥ぜったい</button>
          </div>
        </div>
      `;
    }).join('');
    el.duelGuessConfirmBtn.disabled = !allDuelGuessesSet();
  }

  // B: 5問すいりが かくていした あとの「いちばん あやしい」せんたく画面。
  // タップした しゅんかんに かくてい する(かくにんボタンは おかない)
  function renderDuelSuspicionStep() {
    const d = state.duel;
    if (!d || d.role !== 'guesser') return;
    el.duelSuspicionList.innerHTML = d.items.map((item) => {
      const q = item.question;
      const shownSide = item.pub === 'a' ? q.a : q.b;
      const g = d.guesses.find((gg) => gg.qId === item.qId);
      const guessLabel = g && g.guess === 'honest' ? '😇本音だと推理した' : '🃏うそだと推理した';
      return `
        <button type="button" class="duel-suspicion-row" data-qid="${item.qId}">
          <span class="duel-suspicion-row-emoji">${q.emoji}</span>
          <div class="duel-suspicion-row-text">
            <span class="duel-suspicion-row-q">${escapeHtml(compactJapaneseText(q.text))}</span>
            <span class="duel-suspicion-row-pub">「${escapeHtml(compactJapaneseText(shownSide.label))}」・${guessLabel}</span>
          </div>
          <span class="duel-suspicion-row-pick">👀</span>
        </button>
      `;
    }).join('');
  }

  const DUEL_TOTAL_REVEAL_STEPS = DUEL_MATCH_QUESTION_COUNT + 1; // 5問 + いちばんあやしいボーナス

  // すでに めくり終わった ぶんだけの るいけい とくてんを けいさんする
  function duelRunningTotals(d) {
    let a = 0;
    let b = 0;
    const completedRows = Math.min(duelRevealIndex, DUEL_MATCH_QUESTION_COUNT);
    for (let i = 0; i < completedRows; i++) {
      a += d.breakdown[i].aPoints;
      b += d.breakdown[i].bPoints;
    }
    if (duelRevealIndex < DUEL_MATCH_QUESTION_COUNT && duelRevealPhase === 'revealed') {
      a += d.breakdown[duelRevealIndex].aPoints;
      b += d.breakdown[duelRevealIndex].bPoints;
    }
    if (duelRevealIndex === DUEL_MATCH_QUESTION_COUNT && duelRevealPhase === 'revealed' && d.susBonus) {
      if (d.susBonus === 'A') a += 1; else b += 1;
    }
    return { a, b };
  }

  function renderDuelResultStep() {
    const d = state.duel;
    if (!d) return;
    if (duelRevealIndex >= DUEL_TOTAL_REVEAL_STEPS) {
      el.duelRevealStage.classList.add('hidden');
      el.duelFinalStage.classList.remove('hidden');
      renderDuelFinalStage(d);
      return;
    }
    el.duelRevealStage.classList.remove('hidden');
    el.duelFinalStage.classList.add('hidden');
    renderDuelRevealCard(d);
  }

  function renderDuelRevealCard(d) {
    const isSuspicionStep = duelRevealIndex === DUEL_MATCH_QUESTION_COUNT;
    const running = duelRunningTotals(d);
    el.duelRevealRunning.textContent = `回答A:${running.a}点／推理B:${running.b}点`;

    if (isSuspicionStep) {
      const row = d.breakdown.find((r) => r.qId === d.suspicionQId);
      el.duelRevealProgress.textContent = '👀いちばんあやしい!';
      el.duelRevealEmoji.textContent = row.emoji;
      setCommentText(el.duelRevealText, compactJapaneseText(row.text));
      el.duelRevealPub.textContent = `こうかいされたこたえ:「${compactJapaneseText(row.pubLabel)}」`;
      if (row.testimony) {
        const t = DUEL_TESTIMONY_PRESETS.find((tt) => tt.id === row.testimony);
        el.duelRevealTestimony.textContent = t ? `💬「${t.label}」` : '';
        el.duelRevealTestimony.classList.toggle('hidden', !t);
      } else {
        el.duelRevealTestimony.classList.add('hidden');
      }
      el.duelRevealGuess.textContent = '推理Bが「いちばんあやしい」と選んだ質問です';
      if (duelRevealPhase === 'pending') {
        el.duelRevealOutcome.classList.add('hidden');
        el.duelRevealNextBtn.textContent = 'めくる🎴';
      } else {
        el.duelRevealOutcome.classList.remove('hidden');
        if (row.wasHonest) {
          el.duelRevealOutcomeTitle.textContent = '😳じつは本音でした';
          el.duelRevealOutcomeDesc.textContent = 'はずれ…回答Aにボーナス';
          el.duelRevealOutcomePoints.textContent = 'A +1(いちばんあやしいボーナス)';
        } else {
          el.duelRevealOutcomeTitle.textContent = '👀やっぱりうそでした!';
          el.duelRevealOutcomeDesc.textContent = 'てきちゅう!推理Bにボーナス';
          el.duelRevealOutcomePoints.textContent = 'B +1(いちばんあやしいボーナス)';
        }
        el.duelRevealNextBtn.textContent = 'けっかを見る';
      }
      return;
    }

    const row = d.breakdown[duelRevealIndex];
    const isLastQuestion = duelRevealIndex === DUEL_MATCH_QUESTION_COUNT - 1;
    const closeMatch = isLastQuestion && duelRevealPhase === 'pending' && Math.abs(running.a - running.b) <= 2;
    el.duelRevealProgress.textContent = `しつもん${duelRevealIndex + 1} / ${DUEL_MATCH_QUESTION_COUNT}${closeMatch ? '(せっせん!ラストです…)' : ''}`;
    el.duelRevealEmoji.textContent = row.emoji;
    setCommentText(el.duelRevealText, compactJapaneseText(row.text));
    el.duelRevealPub.textContent = `こうかいされたこたえ:「${compactJapaneseText(row.pubLabel)}」`;
    if (row.testimony) {
      const t = DUEL_TESTIMONY_PRESETS.find((tt) => tt.id === row.testimony);
      el.duelRevealTestimony.textContent = t ? `💬「${t.label}」` : '';
      el.duelRevealTestimony.classList.toggle('hidden', !t);
    } else {
      el.duelRevealTestimony.classList.add('hidden');
    }
    const confLabel = DUEL_CONFIDENCE_LABELS[row.confidence] || DUEL_CONFIDENCE_LABELS.maybe;
    el.duelRevealGuess.textContent = `推理B: ${row.guess === 'honest' ? '😇本音だと思う' : '🃏うそだと思う'}(${confLabel})`;

    if (duelRevealPhase === 'pending') {
      el.duelRevealOutcome.classList.add('hidden');
      el.duelRevealNextBtn.textContent = 'めくる🎴';
    } else {
      el.duelRevealOutcome.classList.remove('hidden');
      el.duelRevealOutcomeTitle.textContent = compactJapaneseText(row.flourishTitle);
      el.duelRevealOutcomeDesc.textContent = compactJapaneseText(row.flourishDesc);
      el.duelRevealOutcomePoints.textContent = compactJapaneseText(row.pointsLabel);
      el.duelRevealNextBtn.textContent = duelRevealIndex + 1 < DUEL_TOTAL_REVEAL_STEPS ? 'つぎへ' : 'けっかを見る';
    }
  }

  function renderDuelFinalStage(d) {
    const iAmGuesser = d.role === 'guesser';
    const myOutcome = d.matchOutcome === 'draw' ? 'draw' : (d.matchOutcome === (iAmGuesser ? 'B' : 'A') ? 'win' : 'lose');
    el.duelResultTitle.textContent = myOutcome === 'win' ? '🎉あなたのかち!' : (myOutcome === 'lose' ? '😢あいてのかち' : '🤝ひきわけ');
    el.duelResultScore.textContent = `回答A:${d.aTotal}点／推理B:${d.bTotal}点`;
    const delta = d.moneyDelta || 0;
    const moneyLine = delta > 0 ? `+💰${delta}` : (delta < 0 ? `-💰${Math.abs(delta)}` : `かけきんのやりとりなし${myOutcome === 'draw' ? '(ひきわけ)' : ''}`);
    el.duelResultDesc.textContent = `おかね: ${moneyLine}\nいまのおかね: 💰${state.lifetime.money}`;

    const susLine = d.susBonus
      ? `<div class="duel-result-row ${d.susBonus === 'B' ? 'correct' : 'wrong'}"><span class="duel-result-row-emoji">👀</span><div class="duel-result-row-text"><span class="duel-result-row-question">いちばんあやしいボーナス</span><span class="duel-result-row-detail">${d.susBonus === 'B' ? 'てきちゅう!' : 'はずれ…'}</span></div><span class="duel-result-row-mark">${d.susBonus} +1</span></div>`
      : '';

    el.duelResultBreakdown.innerHTML = (d.breakdown || []).map((b) => {
      const t = b.testimony ? DUEL_TESTIMONY_PRESETS.find((tt) => tt.id === b.testimony) : null;
      const testimonyText = t ? `・証言:「${t.label}」` : '';
      const confLabel = DUEL_CONFIDENCE_LABELS[b.confidence] || DUEL_CONFIDENCE_LABELS.maybe;
      return `
        <div class="duel-result-row ${b.correct ? 'correct' : 'wrong'}">
          <span class="duel-result-row-emoji">${b.emoji}</span>
          <div class="duel-result-row-text">
            <span class="duel-result-row-question">${escapeHtml(compactJapaneseText(b.flourishTitle))}：${escapeHtml(compactJapaneseText(b.text))}</span>
            <span class="duel-result-row-detail">${escapeHtml(compactJapaneseText(b.flourishDesc))}・こうかいされたこたえ:「${escapeHtml(compactJapaneseText(b.pubLabel))}」(${b.wasHonest ? '✅本音' : '🎭うそ'})・すいり:${b.guess === 'honest' ? 'ほんと' : 'うそ'}(${confLabel})${testimonyText}</span>
          </div>
          <span class="duel-result-row-mark">${escapeHtml(compactJapaneseText(b.pointsLabel))}</span>
        </div>
      `;
    }).join('') + susLine;
  }

  // 「ごほうび」セクション。9この かいふくアイテムが なにに きくのかを
  // 画面じょうで はっきり させる ための いちらん(ふつう / とくべつ の
  // 2段階が 目で わかる ように、とくべつには 💫 を つける)。
  // もっている ものは タップで その場で つかえる
  function renderRewardItemGrid() {
    const count = state.items.reward || 0;
    el.rewardItemGrid.innerHTML = `
      <button type="button" class="shop-item reward-item ${count > 0 ? 'owned' : 'locked'}" data-id="reward">
        <span class="shop-item-badge">💫</span>
        <span class="shop-item-emoji">${careIconHTML('gift')}</span>
        <span class="shop-item-label">ごほうび</span>
        <span class="shop-item-desc">デートや旅を特別な思い出にできるよ。使うかどうかは出かけるときに選べます</span>
        <span class="shop-item-status">${count > 0 ? `${count}こもっている` : 'まだもっていない'}</span>
      </button>
    `;
  }

  function renderItemOverlay() {
    el.itemMoneyLabel.innerHTML = `${careIconHTML('coin')}<span>${state.lifetime.money}</span>`;
    el.itemMoneyLabel.setAttribute('aria-label', `おかね ${state.lifetime.money}`);
    renderRewardItemGrid();
    el.shopItemGrid.innerHTML = SHOP_ITEMS.map((item) => {
      const owned = state.lifetime.ownedShopItems.includes(item.id);
      const equipped = state.lifetime.equippedItemId === item.id;
      const statusText = !owned ? `💰${item.price}` : (equipped ? 'みにつけている' : 'タップでみにつける');
      const badge = equipped ? '⭐' : (owned ? '✔️' : '');
      return `
        <button type="button" class="shop-item ${equipped ? 'equipped owned' : (owned ? 'owned' : '')}" data-id="${item.id}">
          <span class="shop-item-badge">${badge}</span>
          <span class="shop-item-emoji">${itemIconHTML(item)}</span>
          <span class="shop-item-label">${item.label}</span>
          <span class="shop-item-desc">${item.desc}</span>
          <span class="shop-item-status">${statusText}</span>
        </button>
      `;
    }).join('');
    renderNaotoItemGrid();
    renderConsumableItemGrid();
  }

  // 「なおとの〜」でんせつアイテム: unlockTier に とどいていない あいだは
  // ロック表示(？？？)、とどいたら 自動でもらえる。
  // SHOP_ITEMS と ちがい そうび/かいじょの きがえは なく、なんこ もっていても いい
  function renderNaotoItemGrid() {
    syncNaotoRewardItems();
    const authorUnlocked = isAuthorUnlocked();
    el.naotoGreetingBtn.classList.toggle('hidden', !authorUnlocked);
    el.naotoGreetingBtn.innerHTML = authorUnlocked
      ? `${authorVisualHTML('thumb')}<span>ナオトにはなしかける</span>` : '';
    el.naotoItemGrid.innerHTML = NAOTO_ITEMS.map((item) => {
      const unlocked = state.lifetime.endingTiersReached.includes(item.unlockTier);
      if (!unlocked) {
        return `
          <button type="button" class="shop-item" disabled data-id="${item.id}">
            <span class="shop-item-emoji">🔒</span>
            <span class="shop-item-label">？？？</span>
            <span class="shop-item-desc">${ENDING_TIER_ICONS[item.unlockTier]} ${ENDING_TIER_UNLOCK_LABELS[item.unlockTier]}をたっせいするともらえる</span>
            <span class="shop-item-status"></span>
          </button>
        `;
      }
      return `
        <button type="button" class="shop-item equipped owned" disabled data-id="${item.id}">
          <span class="shop-item-badge">✔️</span>
          <span class="shop-item-emoji">${itemIconHTML(item)}</span>
          <span class="shop-item-label">${item.label}</span>
          <span class="shop-item-desc">${item.desc}</span>
          <span class="shop-item-status">たっせいのごほうび</span>
        </button>
      `;
    }).join('');
  }


  // みこうにゅうなら おかねが たりれば こうにゅうして そのまま そうび、
  // こうにゅうずみなら タップの たびに そうび/かいじょを きりかえる
  // (いちどに そうびできるのは 1つだけ)
  function buyOrEquipShopItem(id) {
    const item = SHOP_ITEMS.find((it) => it.id === id);
    if (!item) return;
    const owned = state.lifetime.ownedShopItems.includes(id);
    if (!owned) {
      if (state.lifetime.money < item.price) {
        setMessage('おかねがたりない…');
        render();
        return;
      }
      state.lifetime.money -= item.price;
      state.lifetime.ownedShopItems.push(id);
      state.lifetime.equippedItemId = id;
      setMessage(`${item.label}を買って身につけた!${item.emoji}`);
      emotePet('happy');
    } else if (state.lifetime.equippedItemId === id) {
      state.lifetime.equippedItemId = null;
      setMessage(`${item.label}をはずした`);
    } else {
      state.lifetime.equippedItemId = id;
      setMessage(`${item.label}を身につけた!${item.emoji}`);
      emotePet('happy');
    }
    saveState();
    render();
  }

  // つかいきり アイテムの いちらん(みこうにゅう/こうにゅうずみ の きがえが
  // ない ため、ねだんの みだけ つねに 出す。available()を みたさない ときは
  // グレー表示にして、おした ときに unavailableMessage を 出す)
  function renderConsumableItemGrid() {
    if (el.onetimeActive) { const list = activeBoostSummary(); el.onetimeActive.textContent = list.length ? `いまのこうか：${list.join('／')}` : 'いまのこうかはない'; }
    el.onetimeItemGrid.innerHTML = CONSUMABLE_ITEMS.map((item) => {
      const usable = !item.available || item.available();
      // ★ グレーアウトしているのに 理由が どこにも 書いていない、という
      //   じょうたいを なくす。つかえない ときは そのまま 理由を 出す
      const status = usable
        ? `💰${item.price}`
        : `つかえません: ${item.unavailableMessage || 'いまはつかえない'}`;
      return `
        <button type="button" class="shop-item ${usable ? '' : 'locked'}" data-id="${item.id}">
          <span class="shop-item-emoji">${item.emoji}</span>
          <span class="shop-item-label">${item.label}</span>
          <span class="shop-item-desc">${item.desc}</span>
          <span class="shop-item-status">${status}</span>
        </button>
      `;
    }).join('');
  }

  // つかいきり アイテムを こうにゅうする。picker つきの アイテムは、この
  // じてんでは まだ おかねを はらわず(pickerOverlay で なにを えらぶかを
  // きめてから resolvePickerSelection() が はらう)、picker なしの アイテムは
  // その場で はらって すぐに こうかを はっきする
  function useConsumableItem(id) {
    const item = CONSUMABLE_ITEMS.find((it) => it.id === id);
    if (!item) return;
    if (item.available && !item.available()) {
      setMessage(item.unavailableMessage || 'いまはつかえない…');
      render();
      return;
    }
    if (state.lifetime.money < item.price) {
      setMessage('おかねがたりない…');
      render();
      return;
    }
    if (item.picker) {
      openPicker(item);
      return;
    }
    state.lifetime.money -= item.price;
    state.lifetime.consumablesUsed = (state.lifetime.consumablesUsed || 0) + 1;
    if (!state.lifetime.ownedConsumableItems) state.lifetime.ownedConsumableItems = [];
    if (!state.lifetime.ownedConsumableItems.includes(item.id)) state.lifetime.ownedConsumableItems.push(item.id);
    const result = item.apply() || {};
    if (result.message) setMessage(result.message);
    emotePet(result.emote || 'happy');
    // ときの すな/せいちょうのくすり けいの アイテムは checkMeters() ごし
    // に ねんれいや せいちょう段階を うごかせる ため、その 1かいで
    // しぼう/ゲームクリアに とどく ことも ある。そのばあいは アイテム画面
    // ごしに ならないよう、専用の えんしゅつ画面が 前に 出られる ように とじる
    if (state.stage === STAGE.DEAD) {
      itemOpen = false;
    }
    saveState();
    render();
  }

  let pickerOpen = false;
  let pickerItem = null;

  function openPicker(item) {
    pickerItem = item;
    pickerOpen = true;
    render();
  }

  function closePicker() {
    pickerOpen = false;
    pickerItem = null;
    render();
  }

  // picker(すきな 図鑑/じっせき/いろ/がら/地域)で 1つ えらんだ しゅんかんに
  // よばれる。ここで はじめて おかねを はらい、item.apply(value) で こうかを
  // はっきする
  function resolvePickerSelection(value) {
    const item = pickerItem;
    if (!item) return;
    if (state.lifetime.money < item.price) {
      setMessage('おかねがたりない…');
      closePicker();
      return;
    }
    state.lifetime.money -= item.price;
    state.lifetime.consumablesUsed = (state.lifetime.consumablesUsed || 0) + 1;
    if (!state.lifetime.ownedConsumableItems) state.lifetime.ownedConsumableItems = [];
    if (!state.lifetime.ownedConsumableItems.includes(item.id)) state.lifetime.ownedConsumableItems.push(item.id);
    const result = item.apply(value) || {};
    pickerOpen = false;
    pickerItem = null;
    if (result.message) setMessage(result.message);
    emotePet(result.emote || 'happy');
    if (state.stage === STAGE.DEAD) {
      itemOpen = false;
    }
    saveState();
    render();
  }

  // picker の なかみは モードごとに べつの みため(すでに ある dex-cell/
  // ach-cell/theme-swatch を そのまま りようする)。えらべる ものが 1つも
  // ない ときは、その むね だけ 出す(available() で ボタン じたいを
  // 出さない ように している ので、じっさいには ほぼ おきない)
  function renderPicker() {
    const item = pickerItem;
    if (!item) return;
    el.pickerTitle.textContent = item.label;
    el.pickerHint.textContent = `${item.desc}(💰${item.price})`;
    let html = '';
    if (item.picker === 'dreamline') {
      // 「たまごの ゆめ」- つぎの たまごの しゅぞくを えらぶ。レア5しゅは
      // そだち90の「でんせつの ゆめ」を もっている ときだけ えらべる
      const rareOk = (state.lifetime.dreamEggs && state.lifetime.dreamEggs.rare > 0);
      const lines = rareOk ? ALL_LINES : NORMAL_LINES;
      el.pickerGrid.className = 'theme-grid';
      html = lines.map((line) => `
        <div class="dex-cell known tappable" data-picker-value="${line}">
          <span class="dex-cell-emoji">${stageVisualHTML(SPECIES[line].stages[0], 'thumb')}</span>
          <span class="dex-cell-label">${SPECIES_DISPLAY_NAMES[line] || line}</span>
        </div>
      `).join('');
    } else if (item.picker === 'dex') {
      el.pickerGrid.className = 'theme-grid';
      html = ALL_LINES.map((line) => SPECIES[line].stages.map((stage, i) => `
        <div class="dex-cell known tappable" data-picker-value="${line}:${i}">
          <span class="dex-cell-emoji">${stageVisualHTML(stage, 'thumb')}</span>
          <span class="dex-cell-label">${stage.label}</span>
        </div>
      `).join('')).join('');
    } else if (item.picker === 'achievement') {
      el.pickerGrid.className = 'ach-grid';
      html = ACHIEVEMENTS.filter((ach) => !state.achievementsUnlocked.includes(ach.id)).map((ach) => `
        <div class="ach-cell locked pickable" data-picker-value="${ach.id}">
          <span class="ach-cell-emoji">${achievementIconHTML(ach)}</span>
          <div class="ach-cell-text"><span class="ach-cell-label">${ach.label}</span><span class="ach-cell-desc">${ach.desc}</span></div>
        </div>
      `).join('');
    } else if (item.picker === 'color') {
      el.pickerGrid.className = 'theme-grid';
      html = COLOR_THEMES.filter((t) => t.unlockTier !== undefined && !t.unlockAll && !isThemeUnlocked(t)).map((t) => `
        <button type="button" class="theme-swatch" data-picker-value="${t.id}">
          <span class="theme-swatch-circle surface-device theme-${t.id} pattern-none" aria-hidden="true"></span>
          <span class="theme-swatch-label">${t.label}</span>
        </button>
      `).join('');
    } else if (item.picker === 'pattern') {
      el.pickerGrid.className = 'theme-grid';
      html = PATTERNS.filter((p) => p.unlockTier !== undefined && !p.unlockAll && !isThemeUnlocked(p)).map((p) => `
        <button type="button" class="theme-swatch" data-picker-value="${p.id}">
          <span class="theme-swatch-circle surface-device theme-default pattern-${p.id}" aria-hidden="true"></span>
          <span class="theme-swatch-label">${p.label}</span>
        </button>
      `).join('');
    } else if (item.picker === 'region') {
      el.pickerGrid.className = 'theme-grid';
      // まだ おとずれていない 地域を ゆうせんして ならべる。ぜんぶ まわった
      // あとは ぜんぶの 地域を ならべ、その場で いける ワープとして つかう
      const unvisited = REGIONS.filter((r) => !state.lifetime.regionsVisited.includes(r.id));
      const pickable = unvisited.length ? unvisited : REGIONS.filter((r) => r.id !== state.regionId);
      html = pickable.map((r) => `
        <div class="dex-cell known tappable" data-picker-value="${r.id}">
          <span class="dex-cell-emoji">${r.emoji}</span>
          <span class="dex-cell-label">${r.label}</span>
        </div>
      `).join('');
    }
    el.pickerGrid.innerHTML = html || '<div class="profile-empty">えらべるものがありません</div>';
  }

  // ゴール たっせいの おいわい がめん。はでさは getEndingTier() で かわる。
  // tier は 上がる ことしか ない(ずかん・じっせきの きろくは えいきゅう)ので、
  // じっさいには オーバーレイが 出た しゅんかんに きまる。tier3 だけは
  // 「じゆうに あそぶ」ボタンが つき、♾️ の せかいへ はいれる
  // (gameClearFreePlayBtn ハンドラー さんしょう)
  function renderEnding() {
    const tierIndex = getEndingTier();
    // ⑤ パーフェクトクリア(ずかん + じっせき 両方)を 一度でも たっせいしたら
    // ♾️ の せかいを えいきゅうに 解禁する
    const tier = ENDING_TIERS[tierIndex];
    // ①〜③はナオトの後ろ姿、④⑤は正面。文字・達成数・報酬はUIで表示する。
    if (el.gameClearArt) {
      el.gameClearArt.src = tier.art || `assets/clear/goal-${tierIndex + 1}.jpg?v=20260908-02`;
      el.gameClearArt.alt = tier.artAlt || tier.title;
    }
    el.gameClearOverlay.dataset.goal = String(tierIndex + 1);
    el.gameClearOverlay.classList.toggle('tier-1', tierIndex === 1);
    el.gameClearOverlay.classList.toggle('tier-2', tierIndex === 2);
    el.gameClearOverlay.classList.toggle('tier-3', tierIndex >= 3);
    // ⑤を一度でも達成していれば、人生を残したまま♾️のせかいへ進める。
    el.gameClearFreePlayBtn.classList.toggle('hidden', !state.lifetime.perfectCleared);
    el.gameClearCloseBtn.classList.remove('hidden');
    const meetsAuthor = grandGoalPending === 'dex' || grandGoalPending === 'perfect';
    el.gameClearCloseBtn.textContent = meetsAuthor ? 'ナオトにあう'
      : grandGoalPending === 'life' ? 'おわかれのじかんへ' : 'とじる';
    el.gameClearTitle.textContent = tier.title;
    el.gameClearConfettiTop.textContent = tier.confetti;
    el.gameClearConfettiBottom.textContent = tier.confetti;
    el.gameClearDesc.innerHTML = tier.desc;
    if (tierIndex < 3) {
      const reward = NAOTO_ITEMS.find((item) => item.unlockTier === tierIndex);
      if (reward) el.gameClearDesc.innerHTML += `<br>${escapeHtml(reward.emoji)} ${escapeHtml(reward.label)}をもらった!<br>${escapeHtml(reward.desc)}`;
    }
    if (tierIndex === 3) {
      const totalForms = ALL_LINES.length * STAGES_PER_LINE;
      const knownForms = Math.min(state.discoveredStages.length, totalForms);
      el.gameClearDesc.innerHTML += `<br>📖みつけたすがた: ${knownForms} / ${totalForms}<br>👑なおとのかんむりをもらった!`;
    }
    if (meetsAuthor) {
      el.gameClearDesc.innerHTML += '<br>ゲームをつくったナオトが、あいさつにくるよ。<br>「あいてむ」の「なおとのひみつ」で、またはなせるよ。';
    } else if (grandGoalPending === 'life') {
      el.gameClearDesc.innerHTML += '<br>このあと、おわかれのじかんに<br>この子のいっしょうをきろくできるよ。';
    }
    el.gameClearBadges.innerHTML = tier.badges.map((b) => `<span class="game-clear-badge">${b}</span>`).join('');
    const hadPerfect = state.lifetime.endingTiersReached.includes(4);
    qualifyingEndingTiers().forEach((t) => {
      if (!state.lifetime.endingTiersReached.includes(t)) state.lifetime.endingTiersReached.push(t);
    });
    syncNaotoRewardItems();
    if (!hadPerfect && state.lifetime.endingTiersReached.includes(4)) {
      state.lifetime.screenThemeId = 'rainbow';
    }
    if (!endingCelebrationShown) {
      endingCelebrationShown = true;
      spawnEndingCelebration(tierIndex);
    }
  }

  // 図鑑: shows every species line's 6 growth stages, revealing emoji+label
  // only for line/stage combos recorded in state.discoveredStages so far.
  // ♾️ の せかいに はいった あとは、であった すがた(known)
  // を タップすると すぐ その すがたに 変身できる(el.dexGrid の クリック
  // ハンドラー さんしょう) - ロックされた すがたは タップしても なにも
  // おきない
  // ずかんの「くわしい」がめん。ここが §28 の「どの子に しようかな と
  // ながめるだけでも たのしい ばしょ」の 本体。であった すがたなら
  // いつでも ひらける(♾️ でなくても 読める)
  let dexDetail = null;

  function openDexDetail(line, stageIndex) {
    if (!SPECIES[line] || !SPECIES[line].stages[stageIndex]) return;
    if (!state.discoveredStages.includes(`${line}:${stageIndex}`)) return;
    dexDetail = { line, stageIndex };
    render();
  }

  function renderDexDetail() {
    if (!dexDetail) return;
    const { line, stageIndex } = dexDetail;
    const stage = SPECIES[line].stages[stageIndex];
    const isRare = RARE_LINES.includes(line);
    el.dexDetailOverlay.classList.toggle('rare', isRare);
    setStageVisual(el.dexDetailEmoji, stage, 'detail');
    el.dexDetailLabel.textContent = stage.label;
    el.dexDetailMeta.textContent = `${isRare ? '✨レア' : ''}${SPECIES_DISPLAY_NAMES[line] || line} ／ ${LIFE_STAGES[stageIndex].name}(${LIFE_STAGES[stageIndex].min}さい〜)`;
    el.dexDetailDesc.textContent = stageDesc(line, stageIndex);
    el.dexDetailTransformBtn.classList.toggle('hidden', !state.infinite);
  }

  function renderDex() {
    const discoveredCount = state.discoveredStages.length;
    const totalCount = ALL_LINES.length * STAGES_PER_LINE;
    // ヘッダーの ぜんたい数は、しゅぞく・なかま・こいびとの 3セクション
    // ぶんを あわせた かずで あらわす(dex-complete じっせきの はんてい
    // じたいは しゅぞくだけの totalCount の ままで、ここは 表示だけ)
    const companionEntries = companionDexEntries();
    const combinedDiscovered = discoveredCount + companionEntries.filter((c) => hasRecruitedCompanionId(c.id)).length + state.lifetime.partnersRecorded.length;
    const combinedTotal = totalCount + companionEntries.length + ALL_PARTNER_CANDIDATES.length;
    el.dexProgress.textContent = `${combinedDiscovered} / ${combinedTotal}`;
    el.dexFreePlayHint.classList.toggle('hidden', !state.infinite);
    renderDexSummary();
    el.dexGrid.innerHTML = ALL_LINES.map((line) => {
      const stages = SPECIES[line].stages;
      const knownCount = stages.filter((_, i) => state.discoveredStages.includes(`${line}:${i}`)).length;
      const isRare = RARE_LINES.includes(line) || line === 'ren';
      const name = knownCount ? (SPECIES_DISPLAY_NAMES[line] || line) : '？？？';
      const head = `<div class="dex-line-head"><span class="dex-line-name">${escapeHtml(name)}${knownCount && isRare ? ' <span class="dex-line-rare">✨レア</span>' : ''}</span><span class="dex-line-bar"><span class="dex-line-fill" style="width:${(knownCount / stages.length * 100).toFixed(0)}%"></span></span><span class="dex-line-count">${knownCount}/${stages.length}</span></div>`;
      const cells = stages
        .map((stage, i) => {
          const known = state.discoveredStages.includes(`${line}:${i}`);
          if (!known) return `<div class="dex-cell locked"><span class="dex-cell-emoji">❓</span><span class="dex-cell-label">？？？</span></div>`;
          // であった すがたは いつでも タップして、なまえ・しゅぞく・
          // ライフステージ・せつめい文を 読める(§28)。♾️ の せかいでは
          // その くわしい がめんから そのまま その すがたに なれる
          return `<div class="dex-cell known tappable" data-line="${line}" data-stage="${i}"><span class="dex-cell-emoji">${stageVisualHTML(stage, 'thumb')}</span><span class="dex-cell-label">${stage.label}</span></div>`;
        })
        .join('');
      return `<div class="dex-line-block ${knownCount ? 'has-known' : 'unknown'}">${head}<div class="dex-row">${cells}</div></div>`;
    }).join('');
    renderCompanionDex();
    renderRareCompanionDex();
    renderPartnerDex();
  }

  // ずかんの あたまの まとめ: ふつう/レアの うまりぐあい と「いまの子の つぎの すがた」
  function renderDexSummary() {
    if (!el.dexSummary) return;
    const known = new Set(state.discoveredStages);
    const count = (lines) => lines.reduce((a, line) => a + SPECIES[line].stages.filter((_, i) => known.has(`${line}:${i}`)).length, 0);
    const normal = count(NORMAL_LINES), normalTotal = NORMAL_LINES.length * STAGES_PER_LINE;
    const rare = count([...RARE_LINES, 'ren']), rareTotal = (RARE_LINES.length + 1) * STAGES_PER_LINE;
    const linesStarted = ALL_LINES.filter((line) => SPECIES[line].stages.some((_, i) => known.has(`${line}:${i}`))).length;
    let next = '';
    if (state.stage === STAGE.GROWING && state.speciesLine && SPECIES[state.speciesLine]) {
      const stages = SPECIES[state.speciesLine].stages;
      const idx = stages.findIndex((_, i) => i > (state.stageIndex || 0) && !known.has(`${state.speciesLine}:${i}`));
      if (idx > 0 && LIFE_STAGES[idx]) next = `今の子のつぎの姿は${LIFE_STAGES[idx].min}さい（あと${Math.max(0, LIFE_STAGES[idx].min - currentAge())}年）`;
      else if (idx < 0) next = '今の子の姿は全部見た';
    }
    const bar = (v, t, cls) => `<span class="records-bar"><span class="records-bar-fill ${cls}" style="width:${(t ? v / t * 100 : 0).toFixed(1)}%"></span></span>`;
    el.dexSummary.innerHTML = `<div class="records-summary dex-summary"><div class="records-head"><span class="records-title">📗ずかんのまとめ</span><span class="records-headline">${linesStarted}/${ALL_LINES.length}しゅぞく</span></div>`
      + `<div class="records-row"><span class="records-label">ふつう</span>${bar(normal, normalTotal, 'dex-fill')}<span class="records-num">${normal}/${normalTotal}</span></div>`
      + `<div class="records-row"><span class="records-label">レア</span>${bar(rare, rareTotal, 'dex-fill-rare')}<span class="records-num">${rare}/${rareTotal}</span></div>`
      + (next ? `<div class="dex-next">🔎 ${next}</div>` : '') + '</div>';
  }

  // ずかんの したの ほうに、なかまイベントで であえる COMPANIONS の
  // いちらんを べつセクションとして あらわす。種族の ずかんと おなじ
  // dex-cell の 見た目を つかいまわしている
  function renderCompanionDex() {
    const entries = companionDexEntries();
    const knownCount = entries.filter((c) => hasRecruitedCompanionId(c.id)).length;
    el.companionDexProgress.textContent = `${knownCount} / ${entries.length}`;
    el.companionDexGrid.innerHTML = entries.map((c) => {
      const known = hasRecruitedCompanionId(c.id);
      return known
        ? `<div class="dex-cell known"><span class="dex-cell-emoji">${companionVisualHTML(c)}</span><span class="dex-cell-label">${c.name}</span></div>`
        : `<div class="dex-cell locked"><span class="dex-cell-emoji">❓</span><span class="dex-cell-label">？？？</span></div>`;
    }).join('');
  }

  // そだち80「レアの きざし」で であえる レアなかまの セクション。まだ
  // ひとりも であっていない あいだは セクションごと かくして おく - ❓が
  // ならんでいるだけの「たりない ずかん」に 見えない ように する ため。
  // ヘッダーの ぜんたい数(dexProgress)にも かぞえない。ここは
  // ずかんクリア(dex-complete)の じょうけんとは まったく べつの、
  // であえたら うれしい だけの おまけの コレクション
  function renderRareCompanionDex() {
    const entries = rareCompanionDexEntries();
    const recruited = new Set((state.lifetime.rareCompanionsRecruited || []).map(canonicalCompanionId));
    const knownCount = entries.filter((c) => recruited.has(c.id)).length;
    const show = knownCount > 0;
    el.rareCompanionDexDivider.classList.toggle('hidden', !show);
    el.rareCompanionDexGrid.classList.toggle('hidden', !show);
    if (!show) {
      el.rareCompanionDexGrid.innerHTML = '';
      return;
    }
    el.rareCompanionDexProgress.textContent = `${knownCount} / ${entries.length}`;
    el.rareCompanionDexGrid.innerHTML = entries.map((c) => {
      const known = recruited.has(c.id);
      return known
        ? `<div class="dex-cell known"><span class="dex-cell-emoji">${companionVisualHTML(c)}</span><span class="dex-cell-label">${c.name}</span></div>`
        : '<div class="dex-cell locked"><span class="dex-cell-emoji">❓</span><span class="dex-cell-label">？？？</span></div>';
    }).join('');
  }

  // ずかんの いちばん したに、こいびとに なった ことが ある 地域キャラの
  // いちらんを あらわす。けっこんまで いたった あいては ラベルに 💍を
  // そえて、いちど でも きずなを ふかめた しるしを のこす
  function renderPartnerDex() {
    const recorded = state.lifetime.partnersRecorded;
    const married = state.lifetime.partnersMarried;
    el.partnerDexProgress.textContent = `${recorded.length} / ${ALL_PARTNER_CANDIDATES.length}`;
    el.partnerDexGrid.innerHTML = ALL_PARTNER_CANDIDATES.map((c) => {
      const known = recorded.includes(c.id);
      if (!known) {
        return '<div class="dex-cell locked"><span class="dex-cell-emoji">❓</span><span class="dex-cell-label">？？？</span></div>';
      }
      const label = married.includes(c.id) ? `💍 ${c.label}` : c.label;
      return `<div class="dex-cell known"><span class="dex-cell-emoji">${partnerVisualHTML(c)}</span><span class="dex-cell-label">${label}</span></div>`;
    }).join('');
  }

  // いま そばに いる なかま(state.companions - じゃれるを おさぼって
  // はなれて いった なかまは ここに いない)を、#pet の こどもとして
  // 本体キャラの左右の列に表示する。話者の安定IDで短い反応を結びつける。
  // ひだり/みぎに こうごに ふりわけて、ふえるほど りょうがわ バランスよく そだつ
  function renderCompanionRow() {
    const recruited = state.companions
      .map((sc) => allCompanionsById(sc.id))
      .filter(Boolean);
    const left = recruited.filter((c, i) => i % 2 === 0);
    const right = recruited.filter((c, i) => i % 2 === 1);
    const chip = (c) => `<span class="companion-chip-small" data-companion-id="${escapeHtml(c.id)}" title="${escapeHtml(c.name)}">${companionVisualHTML(c, 'companion')}</span>`;
    const key = recruited.map(c => c.id + ':' + (c.asset || c.emoji)).join('|');
    if (key === companionRenderKey) return;
    companionRenderKey = key;
    el.companionLeft.innerHTML = left.map(chip).join('');
    el.companionRight.innerHTML = right.map(chip).join('');
  }

  // こいびと/けっこんあいてを、なかまとは くべつして 本体キャラの ひだりうえに
  // ハートで囲み、中央セルの左上に表示する。けっこんずみの ときは
  // ゆびわを そえる。たまご/しぼう/クリアの あいだは 表示しない
  function renderPartnerCompanion(hide) {
    const p = !hide && state.partner;
    el.partnerCompanion.classList.toggle('hidden', !p);
    if (!p) {
      el.partnerCompanion.innerHTML = '';
      return;
    }
    const key = JSON.stringify([p.id,p.label,p.emoji,p.married]);
    if (key === el.partnerCompanion.dataset.visualKey && el.partnerCompanion.innerHTML) return;
    el.partnerCompanion.dataset.visualKey = key;
    const ring = p.married ? '<span class="partner-ring">💍</span>' : '';
    el.partnerCompanion.innerHTML =
      `<span class="partner-heart">💕</span><span class="partner-emoji" title="${escapeHtml(compactJapaneseText(p.label))}">${partnerVisualHTML(p, 'companion')}${ring}</span><span class="partner-heart">💕</span>`;
  }

  let companionRenderKey = null;
  let homeCastLayoutKey = '';
  const failedCastAssets = new Set();
  let currentLocationIntent = 0;
  const SFX_CHOICES = { on: ['🔔', 'こうかおん ON'], off: ['🔕', 'OFF'] };
  const BGM_CHOICES = { on: ['🎵', 'BGM ON'], off: ['🔇', 'OFF'] };
  const TIME_CHOICES = {auto:['🕐','げんざい'],morning:['🌅','あさ'],day:['☀️','ひる'],evening:['🌇','ゆう'],night:['🌙','よる']};
  const WEATHER_CHOICES = {auto:['📍','げんざい'],sunny:['☀️','はれ'],cloudy:['☁️','くもり'],rain:['🌧️','あめ'],snow:['❄️','ゆき']};

  // --- せかいの こうか: てんき・じかんたい・きせつ・地域 ごとの ステータス補正 ---
  // happy/hunger: 自然減の ばいりつ(小さいほど さがりにくい)、sleep: ねむりの
  // かいふく、play: ミニゲームの げんき消費、coin: ミニゲームの おかね、
  // meet: なかまとの であいやすさ。text は せかい画面の せつめい
  const ENV_EFFECTS = {
    weather: {
      sunny: { happy: 0.85, coin: 1.1, text: 'ごきげんが下がりにくい・ゲームのおかね+10%' },
      cloudy: { meet: 1.15, text: 'なかまに出会いやすい' },
      rain: { happy: 1.15, meet: 0.7, coin: 1.15, text: 'ごきげんが下がりやすい・出会いがへる・ゲームのおかね+15%' },
      snow: { hunger: 1.1, play: 1.2, sleep: 1.15, text: 'おなかがすきやすい・あそぶと疲れやすい・ねるとよく回復する' },
    },
    time: {
      morning: { sleep: 1.2, hunger: 1.1, text: 'ねむると回復が早い・おなかがすきやすい' },
      day: { coin: 1.1, text: 'ゲームのおかね+10%' },
      evening: { happy: 0.9, text: 'ごきげんが下がりにくい' },
      night: { happy: 1.1, meet: 0.6, sleep: 1.3, text: '夜ふかしはごきげんが下がりやすい・出会いがへる・ねるとよく回復する' },
    },
    season: {
      spring: { happy: 0.9, meet: 1.2, text: 'ごきげんが下がりにくい・出会いがふえる' },
      summer: { play: 1.15, hunger: 1.1, coin: 1.05, text: 'あそぶと疲れやすい・おなかがすきやすい' },
      autumn: { coin: 1.15, happy: 0.95, text: 'ゲームのおかね+15%' },
      winter: { hunger: 1.15, sleep: 1.1, text: 'おなかがすきやすい・ねるとよく回復する' },
    },
    region: {
      home: { text: 'おちつく' },
      city: { coin: 1.1, text: 'ゲームのおかね+10%' },
      countryside: { hunger: 0.9, text: 'おなかがすきにくい' },
      forest: { meet: 1.3, text: 'なかまに出会いやすい' },
      mountain: { sleep: 1.1, play: 1.1, text: 'ねるとよく回復する・あそぶと疲れやすい' },
      snow: { hunger: 1.05, sleep: 1.2, play: 0.9, text: 'ねるとよく回復する・あそぶ疲れがへる・少しおなかがすきやすい' },
      sea: { meet: 1.2, happy: 0.95, text: 'なかまに出会いやすい' },
      deepsea: { happy: 0.9, meet: 0.8, text: 'ごきげんが下がりにくい・出会いがへる' },
      river_lake: { happy: 0.9, text: 'ごきげんが下がりにくい' },
      jungle: { meet: 1.4, hunger: 1.05, text: 'なかまにとても出会いやすい・少しおなかがすきやすい' },
      desert: { hunger: 1.1, coin: 1.2, text: 'ゲームのおかね+20%・おなかがすきやすい' },
      star_stop: { happy: 0.85, play: 0.9, text: 'ごきげんが下がりにくい・あそぶ疲れがへる' },
      memory_lake: { happy: 0.85, sleep: 1.15, text: 'ごきげんが下がりにくい・ねるとよく回復する' },
    },
  };
  // ジャンルごとの 出やすさ(ミニゲームの ちゅうせん)。1 より 大きいと 出やすい
  const ENV_GAME_WEIGHTS = {
    weather: {
      sunny: { sports: 1.3, drive3d: 1.2, puzzle: 0.9 },
      cloudy: { action: 1.1 },
      rain: { puzzle: 1.6, board: 1.4, sports: 0.7, drive3d: 0.8 },
      snow: { board: 1.2, sports: 0.8 },
    },
    time: {
      morning: { sports: 1.2 },
      day: { action: 1.1 },
      evening: { drive3d: 1.2, sports: 1.1 },
      night: { puzzle: 1.4, board: 1.3, action: 0.85 },
    },
    season: {
      spring: { board: 1.1 },
      summer: { sports: 1.3 },
      autumn: { puzzle: 1.2 },
      winter: { board: 1.2 },
    },
    region: {
      city: { action: 1.2 }, countryside: { board: 1.2 }, forest: { puzzle: 1.2 }, mountain: { sports: 1.2 },
      snow: { strategy: 1.1 }, sea: { sports: 1.3, drive3d: 1.1 }, deepsea: { puzzle: 1.3 }, river_lake: { puzzle: 1.1 },
      jungle: { action: 1.2 }, desert: { drive3d: 1.4 },
    },
  };
  // てんきに ちなんだ ゲーム(id の パターン)は さらに 出やすく
  const ENV_GAME_ID_BOOSTS = { snow: [/snow|ski|curling/i, 2], rain: [/fishing/i, 1.3], sunny: [/beach|summer|ring-flight/i, 1.3] };

  // いまの てんき。じゅんばんに: 手で えらんだ もの → 現在地の 観測(2時間いない)
  // → 地域の 気候からの 予想(simulatedWeather)。source で どれかを かえす
  function effectiveWeather() {
    if (state.regionId === 'deepsea') return { weather: null, source: 'underwater' };
    if (state.regionId === 'star_stop') return { weather: null, source: 'starry' };
    const weatherMode = WEATHER_CHOICES[state.lifetime.weatherMode] ? state.lifetime.weatherMode : 'auto';
    if (weatherMode !== 'auto') return { weather: weatherMode, source: 'manual' };
    const snapshot = environmentTracker?.snapshot();
    const observed = snapshot?.weather;
    const fresh = observed && Date.now() - Date.parse(observed.measuredAt) <= 2 * 60 * 60 * 1000;
    if (fresh && state.regionId === 'home') return { weather: observed.mode, source: 'observed' };
    const sim = window.NaotocchiEnvironment?.simulatedWeather?.(state.regionId, getEffectiveSeason());
    return sim ? { weather: sim.mode, source: 'sim' } : { weather: null, source: 'none' };
  }
  function currentTimeOfDay() {
    const mode = TIME_CHOICES[state.lifetime.timeMode] ? state.lifetime.timeMode : 'auto';
    return window.NaotocchiEnvironment?.timeOfDay(mode) || 'day';
  }
  function currentEnvironment() {
    const w = effectiveWeather();
    return { time: currentTimeOfDay(), weather: w.weather, weatherSource: w.source, season: getEffectiveSeason(), region: state.regionId };
  }
  function hasSurfaceSeasons(regionId) {
    return regionId !== 'deepsea' && regionId !== 'star_stop';
  }
  // 4つの こうかを かけあわせた ばいりつ(0.7〜1.5 に おさめる)
  function envModifiers() {
    const env = currentEnvironment();
    const parts = [ENV_EFFECTS.weather[env.weather], ENV_EFFECTS.time[env.time], hasSurfaceSeasons(env.region) && ENV_EFFECTS.season[env.season], ENV_EFFECTS.region[env.region]];
    const out = { happy: 1, hunger: 1, sleep: 1, play: 1, coin: 1, meet: 1 };
    for (const part of parts) { if (!part) continue; for (const k of Object.keys(out)) if (part[k] != null) out[k] *= part[k]; }
    for (const k of Object.keys(out)) out[k] = clamp(out[k], 0.7, 1.5);
    return out;
  }
  function environmentGameWeight(game) {
    const env = currentEnvironment();
    const genre = minigameGenreId(game);
    let w = 1;
    for (const [kind, key] of [['weather', env.weather], ['time', env.time], ['season', env.season], ['region', env.region]]) {
      if (kind === 'season' && !hasSurfaceSeasons(env.region)) continue;
      const table = ENV_GAME_WEIGHTS[kind][key];
      if (table && table[genre] != null) w *= table[genre];
    }
    const idBoost = ENV_GAME_ID_BOOSTS[env.weather];
    if (idBoost && game.id && idBoost[0].test(game.id)) w *= idBoost[1];
    return w;
  }
  // てんき/じかんたいの ジャンル補正を、せかい画面に 出す ための みじかい 文
  function environmentGenreSummary() {
    const env = currentEnvironment();
    const totals = {};
    for (const [kind, key] of [['weather', env.weather], ['time', env.time], ['season', env.season], ['region', env.region]]) {
      if (kind === 'season' && !hasSurfaceSeasons(env.region)) continue;
      const table = ENV_GAME_WEIGHTS[kind][key]; if (!table) continue;
      for (const [genre, v] of Object.entries(table)) totals[genre] = (totals[genre] || 1) * v;
    }
    const up = [], down = [];
    for (const genre of MINIGAME_GENRES) { const v = totals[genre.id]; if (!v) continue; if (v > 1.05) up.push(`${genre.emoji}${genre.label}`); else if (v < 0.95) down.push(`${genre.emoji}${genre.label}`); }
    return { up, down };
  }
  // 見た てんき・じかんたい を きろく(じっせき用)。手で えらんだ ときは かぞえない
  function noteEnvironmentSeen(time, weather, weatherSource) {
    if (state.stage !== STAGE.GROWING) return;
    const l = state.lifetime;
    if (TIME_CHOICES[state.lifetime.timeMode] && state.lifetime.timeMode === 'auto') { l.timeSeen = l.timeSeen || []; if (time && !l.timeSeen.includes(time)) l.timeSeen.push(time); }
    if (weather && weatherSource !== 'manual') { l.weatherSeen = l.weatherSeen || []; if (!l.weatherSeen.includes(weather)) l.weatherSeen.push(weather); }
  }
  function recordEnvironmentPlay() {
    const env = currentEnvironment();
    const plays = state.lifetime.envPlays || (state.lifetime.envPlays = {});
    if (env.weather) plays[env.weather] = (plays[env.weather] || 0) + 1;
    plays[env.time] = (plays[env.time] || 0) + 1;
  }
  function renderWorldNowCard(env) {
    if (!el.worldNowCard) return;
    const region = findRegion(env.region) || { emoji: '🏠', label: 'おうち' };
    const weatherChip = env.weather ? `${environmentIconHTML('weather',env.weather,WEATHER_CHOICES[env.weather][0])}${WEATHER_CHOICES[env.weather][1]}${env.weatherSource === 'sim' ? '(よそう)' : env.weatherSource === 'observed' ? '(げんざいち)' : ''}` : environmentContextLabel(env.weatherSource);
    const season = SEASON_INFO[env.season];
    const chips = [`${environmentIconHTML('time',env.time,TIME_CHOICES[env.time][0])}${TIME_CHOICES[env.time][1]}`, weatherChip, `${environmentIconHTML('season',env.season,season.emoji)}${hasSurfaceSeasons(env.region) ? '' : '地上は'}${season.label}`, `${environmentIconHTML('region',env.region,region.emoji)}${region.label}`];
    const effects = [
      ['weather', env.weather, env.weather ? WEATHER_CHOICES[env.weather][0] : ''],
      ['time', env.time, TIME_CHOICES[env.time][0]],
      ['season', hasSurfaceSeasons(env.region) ? env.season : null, season.emoji],
      ['region', env.region, region.emoji],
    ].map(([kind, key, icon]) => { const e = key && ENV_EFFECTS[kind][key]; return e && e.text ? `<div class="world-now-effect"><span class="icon">${environmentIconHTML(kind,key,icon)}</span><span>${e.text}</span></div>` : ''; }).join('');
    const g = environmentGenreSummary();
    const games = g.up.length || g.down.length
      ? `<div class="world-now-games">ゲームの出やすさ: ${g.up.map((t) => `<span class="up">${t}↑</span>`).join(' ')} ${g.down.map((t) => `<span class="down">${t}↓</span>`).join(' ')}</div>`
      : '';
    el.worldNowCard.innerHTML = `<div class="world-now-head"><span class="world-now-title">いまのせかい</span>${chips.map((c) => `<span class="world-now-chip">${c}</span>`).join('')}</div><div class="world-now-effects">${effects}</div>${games}`;
  }
  // てんきの えんしゅつ(あめ・ゆき・くも・ひざし・よるの ほし)を つくりなおす。
  // てんき・じかんたい・動きを減らす設定・軽量モードの 変更時だけ つくりなおす
  let weatherFxKey = '';
  function environmentContextLabel(source) {
    return source === 'underwater' ? '🫧水の中' : source === 'starry' ? '✨いつも星空' : '🌫️てんきがわからない';
  }
  function applyWeatherFx(weather, time, regionId) {
    if (!el.weatherFx) return;
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const low = mgPerfLow;
    const key = `${regionId}|${weather || 'none'}|${time}|${reduced}|${low}`;
    if (key === weatherFxKey) return;
    weatherFxKey = key;
    if (regionId === 'deepsea') { el.weatherFx.innerHTML = ''; return; }
    if (regionId === 'star_stop') { weather = null; time = 'night'; }
    const items = [];
    const sky = [];
    const rnd = (a, b) => a + Math.random() * (b - a);
    if (weather === 'rain') {
      const n = low ? 18 : 42;
      for (let i = 0; i < n; i++) items.push(`<span class="wx-drop" style="left:${rnd(0, 100).toFixed(1)}%;animation-duration:${rnd(0.7, 1.2).toFixed(2)}s;animation-delay:${rnd(-1.2, 0).toFixed(2)}s;height:${Math.round(rnd(14, 24))}px;opacity:${rnd(0.4, 0.9).toFixed(2)}"></span>`);
    } else if (weather === 'snow') {
      const n = low ? 12 : 26;
      for (let i = 0; i < n; i++) items.push(`<span class="wx-flake" style="left:${rnd(0, 100).toFixed(1)}%;font-size:${Math.round(rnd(11, 24))}px;--drift:${Math.round(rnd(-30, 30))}px;animation-duration:${rnd(7, 13).toFixed(1)}s;animation-delay:${rnd(-12, 0).toFixed(1)}s">${sceneryIconHTML('❄')}</span>`);
    } else if (weather === 'cloudy') {
      const n = low ? 3 : 5;
      for (let i = 0; i < n; i++) sky.push(`<span class="wx-cloud" style="top:${rnd(2, 30).toFixed(1)}%;font-size:${Math.round(rnd(18, 32))}px;animation-duration:${rnd(40, 80).toFixed(0)}s;animation-delay:${rnd(-70, 0).toFixed(0)}s">${sceneryIconHTML('☁️')}</span>`);
    } else if (weather === 'sunny' && time !== 'night') {
      sky.push('<span class="wx-sun"></span>');
      const n = low ? 3 : 7;
      for (let i = 0; i < n; i++) sky.push(`<span class="wx-spark" style="left:${rnd(55, 96).toFixed(1)}%;top:${rnd(2, 26).toFixed(1)}%;font-size:${Math.round(rnd(9, 16))}px;animation-duration:${rnd(2.4, 4.2).toFixed(1)}s;animation-delay:${rnd(0, 3).toFixed(1)}s">✦</span>`);
    }
    if (time === 'night' && weather !== 'rain' && weather !== 'snow') {
      const n = low ? 14 : 30;
      for (let i = 0; i < n; i++) sky.push(`<span class="wx-star" style="left:${rnd(0, 100).toFixed(1)}%;top:${rnd(0, 60).toFixed(1)}%;animation-duration:${rnd(1.2, 3.2).toFixed(1)}s;animation-delay:${rnd(0, 3).toFixed(1)}s"></span>`);
      if (weather !== 'cloudy') sky.push(`<span class="wx-moon">${sceneryIconHTML('🌙')}</span>`);
    }
    // あめ・ゆきは がめん ぜんたい。たいよう・つき・ほし・くもは、ペットの
    // ステージの うえに かさなる わく(.wx-sky)の なかに 入れて、ヘッダーの
    // ボタンに かさならない ように する(いちは positionWeatherSky() が あわせる)
    const skyKept = reduced ? sky.filter((h) => /wx-sun|wx-moon|wx-star/.test(h)) : sky;
    if (skyKept.length) items.push(`<span class="wx-sky">${skyKept.join('')}</span>`);
    el.weatherFx.innerHTML = reduced ? items.filter((h) => /wx-sky/.test(h)).join('') : items.join('');
    positionWeatherSky();
  }
  // .wx-sky(たいよう・つき・ほし・くも)を、ペットの ステージの いちに あわせる
  function positionWeatherSky() {
    if (!el.weatherFx || !el.castStage) return;
    const sky = el.weatherFx.querySelector('.wx-sky');
    if (!sky) return;
    let r = null;
    try { r = el.castStage.getBoundingClientRect(); } catch (e) { r = null; }
    // ホームの がめんが かくれている あいだ(おわかれカードなど)は ださない
    if (!r || !r.width || (el.screenNormal && el.screenNormal.classList.contains('hidden'))) { sky.style.display = 'none'; return; }
    sky.style.display = '';
    sky.style.left = `${Math.round(r.left)}px`; sky.style.top = `${Math.round(r.top)}px`;
    sky.style.width = `${Math.round(r.width)}px`; sky.style.height = `${Math.round(r.height)}px`;
  }
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') window.addEventListener('resize', () => positionWeatherSky());

  // --- せかいの できごと: てんき・じかんたいに ちなんだ 小さな できごとが ときどき おこる ---
  const ENV_MOMENTS = {
    sunny: [
      { emoji: '🌞', message: 'ひなたぼっこでぽかぽか。げんき+5', energy: 5 },
      { emoji: '🌈', message: '虹を見つけた!ごきげん+8', happiness: 8 },
    ],
    cloudy: [
      { emoji: '☁️', message: '雲をながめてのんびり。げんき+3', energy: 3 },
      { emoji: '🍃', message: 'すずしい風がふいた。ごきげん+4', happiness: 4 },
    ],
    rain: [
      { emoji: '☔', message: '雨やどりしながらおしゃべり。ごきげん+6', happiness: 6 },
      { emoji: '🐌', message: 'かたつむりを見つけた。ごきげん+4', happiness: 4 },
      { emoji: '🐸', message: 'かえるの合唱を聞いた。ごきげん+3', happiness: 3 },
    ],
    snow: [
      { emoji: '⛄', message: '雪だるまを作った!ごきげん+8／げんき-3', happiness: 8, energy: -3 },
      { emoji: '❄️', message: '雪をぱくっとキャッチ。ごきげん+5', happiness: 5 },
    ],
    morning: [
      { emoji: '🐦', message: '小鳥の声で、すっきり目覚めた。げんき+4', energy: 4 },
      { emoji: '🌄', message: '朝日をあびて深呼吸。ごきげん+4', happiness: 4 },
    ],
    day: [
      { emoji: '🦋', message: 'ちょうちょを追いかけた。ごきげん+4', happiness: 4 },
    ],
    evening: [
      { emoji: '🌇', message: '夕やけがきれい。ごきげん+6', happiness: 6 },
      { emoji: '🦇', message: 'こうもりが飛んでいった。ちょっとびっくり', happiness: 1 },
    ],
    night: [
      { emoji: '⭐', message: '流れ星にお願い。💰+8', money: 8 },
      { emoji: '🦉', message: 'ふくろうの声…ちょっとこわい。ごきげん-2', happiness: -2 },
      { emoji: '🌙', message: '月がきれいだね。ごきげん+5', happiness: 5 },
    ],
  };
  const REGION_MOMENT_HINTS = {
    mountain: '岩場のぼりと、山びこのひと休み',
    deepsea: '光るくらげや深海の音に出会える',
    river_lake: '水切りや、水面の輪をながめる時間',
    jungle: '葉のかげで、生きものの声を聞こう',
    desert: 'オアシスや、砂にかくれたものを探そう',
    star_stop: '星を見送り、ときどき星のかけらを拾える',
    memory_lake: '水面に、これまでの思い出がうつる',
  };
  const REGION_MOMENTS = {
    mountain: [
      { emoji: '⛰️', message: '山びこが少し遅れて返事をした。ごきげん+5', happiness: 5 },
      { emoji: '🪨', message: '平らな岩でひと休み。げんき+5', energy: 5 },
    ],
    river_lake: [
      { emoji: '💧', message: '水切りの石が、今度は3回はねた。ごきげん+6', happiness: 6 },
      { emoji: '🪷', message: '水面の輪が静かに広がった。げんき+4', energy: 4 },
    ],
    jungle: [
      { emoji: '🦜', message: '葉のかげから、聞いたことのない声。ごきげん+6', happiness: 6 },
      { emoji: '🌿', message: '大きな葉の下で休んだ。げんき+5', energy: 5 },
    ],
    desert: [
      { emoji: '💧', message: 'オアシスのそばでひと休み。げんき+6', energy: 6 },
      { emoji: '✨', message: '砂の中に、小さなかざりを見つけた。💰+8', money: 8 },
    ],
    deepsea: [
      { emoji: '🪼', message: '光るくらげが、ゆっくり道を横切った。ごきげん+6', happiness: 6 },
      { emoji: '🫧', message: '深海で泡の音に耳をすませた。げんき+5', energy: 5 },
    ],
    star_stop: [
      { emoji: '⭐', message: '星をひとつ見送った。次はどこへ行くのだろう。ごきげん+6', happiness: 6 },
      { emoji: '✨', message: 'ベンチの下に星のかけらが落ちていた。💰+8', money: 8 },
      { emoji: '🌌', message: '遠くの星の明かりを数えて休んだ。げんき+5', energy: 5 },
    ],
    memory_lake: [
      { emoji: '🪞', memory: true, happiness: 6 },
      { emoji: '💧', message: '湖の波が静まるまで、思い出をたどった。げんき+6', energy: 6 },
    ],
  };
  function environmentMomentPool(env) {
    const local = REGION_MOMENTS[env.region] || [];
    if (env.region === 'deepsea' || env.region === 'star_stop' || env.region === 'memory_lake') return local;
    const generic = [...(ENV_MOMENTS[env.weather] || []), ...(ENV_MOMENTS[env.time] || [])];
    return [...local, ...generic.filter((moment) => {
      if (moment.emoji === '🦋' && (env.season === 'winter' || env.weather === 'snow' || ['snow','desert'].includes(env.region))) return false;
      if (['🐌','🐸'].includes(moment.emoji) && env.region === 'desert') return false;
      return true;
    })];
  }
  function scheduleEnvironmentMoment() {
    const delay = 150000 + Math.random() * 150000;
    setTimeout(() => {
      try {
        const idleOk = !gameActive
          && state.stage === STAGE.GROWING
          && !state.isSleeping && !state.isSick && !state.dying
          && !state.transformOptions && !conversationIsBusy() && !speechActive && !isAnyMenuOverlayOpen()
          && !message && !pendingCompanionId;
        if (idleOk && Math.random() < 0.45) {
          const env = currentEnvironment();
          const pool = environmentMomentPool(env);
          if (pool.length) {
            const m = pool[Math.floor(Math.random() * pool.length)];
            if (m.happiness) state.happiness = clamp(state.happiness + m.happiness, 0, 100);
            if (m.energy) state.energy = clamp(state.energy + m.energy, 0, 100);
            if (m.money) state.lifetime.money += m.money;
            state.lifetime.envMoments = (state.lifetime.envMoments || 0) + 1;
            const memories = m.memory ? (state.lifeLog || []).filter((entry) => typeof entry.text === 'string' && entry.text.trim()) : [];
            const memory = memories.length ? memories[Math.floor(Math.random() * memories.length)] : null;
            const caption = m.memory ? (memory ? `水面に思い出がうつった。「${Array.from(memory.text).slice(0, 60).join('')}」ごきげん+6` : '水面に今の自分がうつった。ここから思い出が増えていく。ごきげん+6') : m.message;
            showStoryEvent({ emoji: m.emoji, message: caption, environmentMoment: true });
            emotePet(m.happiness < 0 ? 'sad' : 'happy');
            saveState();
            render();
          }
        }
      } catch (err) { /* できごとが おきなくても ゲームは とめない */ }
      scheduleEnvironmentMoment();
    }, delay);
  }
  let environmentRequested = false;
  let environmentRequestedAt = 0;
  const environmentTracker = window.NaotocchiEnvironment?.createTracker({
    geolocation: navigator.geolocation,
    fetcher: typeof window.fetch === 'function' ? window.fetch.bind(window) : undefined,
    now: () => Date.now(),
    onChange: () => renderEnvironment(),
  });

  function homeCastMotionRadius() {
    const count = state.companions.filter(c=>allCompanionsById(c.id)).length;
    return window.NaotocchiCastMotion?.motionRadiusFor(count) || 0;
  }

  function homeCastActors() {
    const actors = [{kind:'pet',id:state.speciesLine,node:el.petSprite,direction:-1}];
    if (state.stage === STAGE.EGG || state.stage === STAGE.DEAD) return actors;
    if (state.partner && !el.partnerCompanion.classList.contains('hidden')) {
      const node = el.partnerCompanion.querySelector('.partner-emoji');
      if (node) actors.push({kind:'partner',id:state.partner.id,node,size:parseFloat(el.partnerCompanion.style.width) || 52});
    }
    if (!el.petAccessory.classList.contains('hidden')) actors.push({kind:'accessory',node:el.petAccessory});
    for (const [side,direction] of [[el.companionLeft,1],[el.companionRight,-1]]) {
      for (const node of side.children) if (node.dataset.companionId) {
        actors.push({kind:'companion',id:node.dataset.companionId,node,direction});
      }
    }
    return actors;
  }

  function renderHomeCast() {
    if (!window.NaotocchiCast) return;
    const main = currentVisualStage();
    const p = state.partner;
    const partnerId = WORLD_MASTER?.compatibility?.partnerAliases?.[p?.id] || p?.id;
    const partnerAsset = WORLD_MASTER?.partners?.find(def => def.id === partnerId)?.asset;
    const recruited = state.companions.map(sc => allCompanionsById(sc.id)).filter(Boolean);
    // Let sparse scenes share more of the available height with the care keys.
    // Measure after changing this attribute, before starting a speech reaction.
    el.device.dataset.castCrowded = String(recruited.length > 0);
    const stageRect = el.castStage.getBoundingClientRect();
    const width = Math.floor(stageRect.width);
    const height = el.device.classList.contains('ui-home-active') ? Math.max(132,Math.floor(stageRect.height)) : undefined;
    if (width < 240) return;
    const asset = path => path && !failedCastAssets.has(path) ? path : null;
    const hasPartner = !!p && state.stage !== STAGE.EGG && state.stage !== STAGE.DEAD;
    const hasAccessory = !!state.lifetime.equippedItemId && state.stage !== STAGE.EGG && state.stage !== STAGE.DEAD;
    const args = {width,height,mainAsset:asset(main.asset),partnerAsset:asset(partnerAsset),hasPartner,hasAccessory,companions:recruited.map(c=>asset(c.asset)),motionRadius:homeCastMotionRadius()};
    const key = JSON.stringify([args, companionRenderKey, p?.id, p?.married]);
    if (key === homeCastLayoutKey) return;
    homeCastLayoutKey = key;
    castMotion?.clear();
    const layout = window.NaotocchiCast.layoutHomeCast(args);
    const place = (node,frame) => {
      if (!node || !frame) return;
      node.style.left = frame.x + 'px'; node.style.top = frame.y + 'px';
      node.style.width = frame.w + 'px'; node.style.height = frame.h + 'px';
      node.style.fontSize = Math.floor(frame.w * .8) + 'px';
    };
    el.castStage.style.height = height ? '' : layout.height + 'px';
    el.castStage.style.minHeight = height && layout.height > height ? layout.height + 'px' : '';
    place(el.petSprite,layout.main);place(el.partnerCompanion,layout.partner);place(el.petAccessory,layout.accessory);
    el.petSprite.style.setProperty('--cast-art-offset-y',(layout.main.artOffsetY || 0) + 'px');
    const left=el.companionLeft.children,right=el.companionRight.children;
    layout.companions.forEach((frame,i)=>place((i%2?right:left)[Math.floor(i/2)],frame));
    if (layout.partner) el.partnerCompanion.querySelectorAll('.partner-heart').forEach((node,i)=>{
      const frame=layout.hearts[i];
      place(node,{...frame,x:frame.x-layout.partner.x,y:frame.y-layout.partner.y});
    });
  }

  function selectDesignPanel(panel) {
    const screen = panel !== 'device';
    el.designScreenPanel.hidden = !screen; el.designDevicePanel.hidden = screen;
    el.designScreenTab.setAttribute('aria-pressed',String(screen));
    el.designDeviceTab.setAttribute('aria-pressed',String(!screen));
  }

  function renderEnvironmentChoices(grid,choices,mode,kind = '') {
    if (grid.dataset.choiceMode === mode) return;
    grid.dataset.choiceMode = mode;
    grid.innerHTML = Object.entries(choices).map(([id,[emoji,label]])=>
      `<button type="button" class="theme-swatch ${id === mode ? 'selected' : ''}" data-id="${id}" aria-pressed="${id === mode}"><span class="theme-swatch-circle">${environmentIconHTML(kind,id,emoji)}</span><span class="theme-swatch-label">${label}</span></button>`).join('');
  }

  function renderEnvironment() {
    const snapshot = environmentTracker?.snapshot();
    const mode = TIME_CHOICES[state.lifetime.timeMode] ? state.lifetime.timeMode : 'auto';
    const time = window.NaotocchiEnvironment?.timeOfDay(mode) || 'day';
    const weatherMode = WEATHER_CHOICES[state.lifetime.weatherMode] ? state.lifetime.weatherMode : 'auto';
    const eff = effectiveWeather();
    const weather = eff.weather;
    const visualTime = eff.source === 'underwater' ? 'underwater' : eff.source === 'starry' ? 'night' : time;
    el.screen.dataset.time = visualTime;
    el.screen.dataset.weather = weather || 'unknown';
    document.body.dataset.time = visualTime;
    document.body.dataset.weather = weather || 'unknown';
    applyWeatherFx(weather, time, state.regionId);
    const weatherText = weather ? WEATHER_CHOICES[weather].join(' ') + (eff.source === 'sim' ? '(よそう)' : '') : environmentContextLabel(eff.source);
    el.environmentLabel.innerHTML = `${environmentIconHTML('time',time,TIME_CHOICES[time][0])} ${TIME_CHOICES[time][1]}・${weather ? environmentIconHTML('weather',weather,WEATHER_CHOICES[weather][0]) + ' ' + WEATHER_CHOICES[weather][1] + (eff.source === 'sim' ? '(よそう)' : '') : escapeHtml(weatherText)}`;
    const city = snapshot?.municipality?.display;
    const locationLabel = `げんざいち：${city || 'まだわからない'}`;
    el.worldLocationLabel.textContent = locationLabel;
    el.currentLocationBtn.textContent = `📍${locationLabel}`;
    if (state.lifetime.currentLocationSelected && state.regionId === 'home') el.regionLabel.textContent = `📍${locationLabel}`;
    const loading = snapshot?.status === 'loading';
    el.locationRefreshBtn.disabled = loading;
    el.currentLocationBtn.disabled = loading;
    const status = loading ? '現在地とてんきを調べています…' : snapshot?.error || (city || weather ?
      `${city ? locationLabel : ''}${city && weather ? '・' : ''}${weather ? weatherText : ''}` : '現在地を調べると、近くのてんきにあわせられます。');
    const contextNote = eff.source === 'underwater' ? 'ここは水の中。地上の天気は届きません。' : eff.source === 'starry' ? 'ここでは、いつでも星空が見えます。' : '';
    el.environmentStatus.textContent = contextNote ? `${contextNote} 選んだ天気は地上へ戻ると反映されます。` : status;
    el.travelLocationStatus.textContent = loading || snapshot?.error ? status : (city ? 'この市区町村を、いつものばしょとして表示します。' : '市区町村まで調べられます。');
    if (worldOpen) {
      renderWorldNowCard({ time, weather, weatherSource: eff.source, season: getEffectiveSeason(), region: state.regionId });
      renderEnvironmentChoices(el.timeModeGrid,TIME_CHOICES,mode,'time');
      renderSeasonModeGrid();
      renderEnvironmentChoices(el.weatherModeGrid,WEATHER_CHOICES,weatherMode,'weather');
      if (el.difficultyModeGrid) renderEnvironmentChoices(el.difficultyModeGrid, DIFFICULTY_CHOICES, minigameDifficultyMode());
      if (el.gameLengthGrid) renderEnvironmentChoices(el.gameLengthGrid, GAME_LENGTH_CHOICES, minigameLengthMode());
      if (el.sfxModeGrid) renderEnvironmentChoices(el.sfxModeGrid, SFX_CHOICES, state.lifetime.soundSfx === false ? 'off' : 'on');
      if (el.bgmModeGrid) renderEnvironmentChoices(el.bgmModeGrid, BGM_CHOICES, state.lifetime.soundBgm === false ? 'off' : 'on');
    }
    maybeRefreshEnvironment();
  }

  function requestEnvironment() {
    environmentRequested = true;
    environmentRequestedAt = Date.now();
    if (!environmentTracker) {
      el.environmentStatus.textContent = '現在地を調べられませんでした。もう一度ページを開いてください。';
      return Promise.resolve(null);
    }
    return environmentTracker.request();
  }

  function maybeRefreshEnvironment() {
    if (!environmentRequested || document.visibilityState !== 'visible' || Date.now()-environmentRequestedAt < 15*60*1000) return;
    const status = environmentTracker?.snapshot().status;
    if (status !== 'ready' && status !== 'partial') return;
    if (state.lifetime.weatherMode === 'auto' || state.lifetime.currentLocationSelected) requestEnvironment();
  }

  // まだ 1どでも であった ことの ない れんくんは、こうほに まぎれても
  // 正体を みせない。「なんだか わからない ものを えらぶ」という
  // 隠しキャラ らしい たいけんに する(いちど であえば ふつうに 名前が出る)
  function isHiddenTransformLine(line) {
    return line === 'ren' && !state.discoveredStages.some((e) => e.startsWith('ren:'));
  }

  function renderTransformChoices() {
    const options = state.transformOptions || [];
    el.transformChoices.innerHTML = options
      .map((line) => {
        if (isHiddenTransformLine(line)) {
          return `
            <button class="transform-choice-btn mystery" data-line="${line}">
              <span class="transform-choice-emoji">🕯️</span>
              <span>？？？</span>
            </button>
          `;
        }
        const stage = SPECIES[line].stages[stageForAge(currentAge())];
        return `
          <button class="transform-choice-btn" data-line="${line}">
            <span class="transform-choice-emoji">${stageVisualHTML(stage, 'thumb')}</span>
            <span>${stage.label}</span>
          </button>
        `;
      })
      .join('');
  }

  // 種族ラインが かわる とき(通常の 変身メーターからの 変身・「ずかん」
  // タップ変身の どちらも)は、せいべつ・れんあいタイプ・せいかく傾向も
  // rollIdentity() で まるごと 新しく ロールしなおす(たまごが かえる
  // ときと おなじ ロジック)。クエスチョニングの けいけんカウンターも
  // まっさらに もどす。れんあいタイプが かわった けっか、いまの こいびと/
  // 夫婦と もう おたがいの れんあい対象で なくなる ことも ある(表示文字列
  // では なく attractedTo の 双方向いっちで はんてい する) - その ばあいは
  // なかよし度0で ふられる ときと おなじ ペナルティ・えんしゅつで 自然に
  // わかれさせ、その せつめいメッセージ(なければ 空文字)を かえす
  function rerollIdentityAndBreakupIfNeeded(line) {
    const identity = rollIdentity(line);
    state.gender = identity.gender;
    state.orientationId = identity.orientationId;
    state.attractedTo = identity.attractedTo;
    state.questioningEncounters = 0;
    // せいかく傾向は ゼロに もどさず 半分に する - レア種族の 解禁条件の
    // おおくが traitCounts に よるので、ゼロに すると「へんしんするほど
    // レアが とおのく」ぎゃくインセンティブに なってしまう
    Object.keys(state.traitCounts).forEach((k) => {
      state.traitCounts[k] = Math.floor((state.traitCounts[k] || 0) / 2);
    });

    if (!state.partner) return '';
    const partnerAttractedTo = normalizeAttractedTo(state.partner.gender, state.partner.orientationId, state.partner.attractedTo);
    const stillMatches = partnerAttractedTo.includes(state.gender) && state.attractedTo.includes(state.partner.gender);
    const label = state.partner.label;
    if (stillMatches) {
      // すれちがっていた あいてと、また あいしょうが あう ように なったら
      // その場で もとどおりに なる
      if (state.partner.mismatched) {
        state.partner.mismatched = false;
        state.partner.repair = 0;
        pushLifeLog('💞', `${label}とまたきもちがかさなった`);
        return `そして、${label}とはまたきもちがぴったりかさなった!`;
      }
      return '';
    }

    // ★ ここで いきなり 別れさせない(§14)。「すれちがい」の じょうたいに
    //    はいって、なかよし度の へりが はやく なり、けっこんにも すすめなく
    //    なる。でも きゅうあいを つづければ もういちど つながれる
    if (state.partner.mismatched) return '';
    state.partner.mismatched = true;
    state.partner.repair = 0;
    pushLifeLog('💔', `${label}とすれちがいはじめた`);
    return `恋愛タイプが変わって、${label}とは少しすれちがいはじめた…きゅうあいを続ければ、またつながれる`;
  }

  function chooseTransform(line) {
    if (!state.transformOptions || !state.transformOptions.includes(line)) return;
    // ★ ねんれいは ぜったいに かえない。すがたは stageForAge() から きまるので
    // ここで かえるのは しゅぞくの ラインだけ(35さいのいぬ → 35さいのねこ)
    state.speciesLine = line;
    state.transformOptions = null;
    state.lifetime.transforms += 1;
    state.transformsThisLife += 1;
    if (!state.transformStageDone.includes(String(state.stageIndex))) {
      state.transformStageDone.push(String(state.stageIndex));
    }
    const stage = SPECIES[line].stages[stageForAge(currentAge())];
    const wasHiddenRen = line === 'ren' && hiddenRenRevealPending;
    hiddenRenRevealPending = false;
    const breakupMessage = rerollIdentityAndBreakupIfNeeded(line);
    pushLifeLog(stage.emoji, wasHiddenRen ? 'れんくんにであった' : `${stage.label}にへんしんした`);
    if (wasHiddenRen) {
      // 隠しキャラを ひきあてた しゅんかんだけの、せんようの ひとこと
      showStoryEvent({ emoji: '🕯️', message: 'なんで人間がいるの?と思ったが、なぜかだれも気にしていない' });
    }
    setMessage(wasHiddenRen
      ? `？？？のしょうたいは「${stage.label}」だった…!${breakupMessage}`
      : `${stage.label}にへんしんした!${breakupMessage}`);
    checkStoryEvents('transform');
    speakEvent('transform', { partnerChance: 0.65, companionChance: 0.65 });
    emotePet(breakupMessage ? 'sad' : 'fun');
    saveState();
    render();
  }

  function skipTransform() {
    if (!state.transformOptions) return;
    state.transformOptions = null;
    setMessage('鏡を見て、やっぱり今の姿でいくことにした');
    saveState();
    render();
  }

  // 「？？？」の まま えらばれた かどうかを、しょうたいを あかす
  // えんしゅつの ために おぼえておく
  let hiddenRenRevealPending = false;

  el.transformChoices.addEventListener('click', (e) => {
    const btn = e.target.closest('.transform-choice-btn');
    if (!btn) return;
    // DOM の クラスでは なく、じょうたいから ちょくせつ 判定する
    hiddenRenRevealPending = isHiddenTransformLine(btn.dataset.line);
    chooseTransform(btn.dataset.line);
  });

  el.transformSkipBtn.addEventListener('click', skipTransform);

  // ごほうびはミニゲーム大成功などで入手。一生のダメージである
  // おとろえを主に回復し、上位3種はさらにいのちも立て直す。
  function renderItemsRow(disableUse) {
    const entries = FUN_ITEMS.filter((item) => (state.items[item.id] || 0) > 0);
    if (!entries.length) { el.itemsRow.innerHTML = ''; return; }
    el.itemsRow.innerHTML = entries.map((item) => `
      <button class="item-btn" data-item-id="${item.id}" title="${item.label}" ${disableUse ? 'disabled' : ''}>
        <span class="item-emoji">${itemIconHTML(item,true)}</span><span class="item-count">${state.items[item.id]}</span>
      </button>
    `).join('');
  }

  function useItem(itemId) {
    const item = FUN_ITEMS.find((it) => it.id === itemId);
    if (!item || !(state.items[itemId] > 0)) return;
    state.items[itemId] -= 1;
    if (state.items[itemId] <= 0) delete state.items[itemId];
    state.lifetime.consumablesUsed = (state.lifetime.consumablesUsed || 0) + 1;
    if (!Array.isArray(state.lifetime.ownedConsumableItems)) state.lifetime.ownedConsumableItems = [];
    if (!state.lifetime.ownedConsumableItems.includes(itemId)) state.lifetime.ownedConsumableItems.push(itemId);
    state.happiness = clamp(state.happiness + 2, 0, 100);
    playFunScene(item);
    saveState(); render();
  }

  el.itemsRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.item-btn');
    if (btn && !btn.disabled) useItem(btn.dataset.itemId);
  });

  el.rewardItemGrid.addEventListener('click', () => {
    const count = state.items.reward || 0;
    setMessage(count > 0
      ? `🎁ごほうびを${count}こもっている。デートやたびをとくべつな思い出にできるよ`
      : '🎁ごほうびはとてもレア。デートやたびのとくべつな思い出につかえるよ');
    render();
  });

  // --- minigames (triggered by the play button) ---

  const SEASON = { SPRING: 'spring', SUMMER: 'summer', AUTUMN: 'autumn', WINTER: 'winter' };

  // 季節ゲームも同じキャッチ操作の着せ替えは削り、操作が変わるものだけ残す。
  // 「せかい」画面の きせつせんたくで つかう、5つの モード(じどう+てきよう
  // する きせつ4つ)の 見た目じょうほう。SEASON_MODE_ORDER の じゅんに
  // せんたくしを ならべる
  const SEASON_INFO = {
    [SEASON.SPRING]: { emoji: '🌸', label: 'はる' },
    [SEASON.SUMMER]: { emoji: '🌻', label: 'なつ' },
    [SEASON.AUTUMN]: { emoji: '🍁', label: 'あき' },
    [SEASON.WINTER]: { emoji: '❄️', label: 'ふゆ' },
  };
  const SEASON_MODE_AUTO = 'auto';
  const SEASON_MODE_ORDER = [SEASON_MODE_AUTO, SEASON.SPRING, SEASON.SUMMER, SEASON.AUTUMN, SEASON.WINTER];

  // げんじつの 月から きせつを はんてい する、「こよみの うえの きせつ」。
  // せってい モードが auto の ときの ばあいに つかわれる(はんていロジック
  // じたいは てきよう モードに かかわらず つねに けいさんできる)
  function getCalendarSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return SEASON.SPRING;
    if (month >= 6 && month <= 8) return SEASON.SUMMER;
    if (month >= 9 && month <= 11) return SEASON.AUTUMN;
    return SEASON.WINTER;
  }

  // 「せってい モード」(state.lifetime.seasonMode: auto/spring/summer/
  // autumn/winter)と、「いま じっさいに てきようされている きせつ」
  // (=じっこう きせつ)は べつものとして あつかう。auto モードなら
  // げんじつの 月から けいさんし、はる/なつ/あき/ふゆを 手動で えらんで
  // いれば その きせつに こていする。ミニゲーム・はいけい・イベントなど、
  // 「いまの きせつ」を しりたい ばしょは すべて この関数だけを 参照すれば
  // よい(今回の 第1段かいでは ミニゲームの プールに この効果を そのまま
  // つかいつづける だけで、地域とのくみあわせ調整は 次の段かいで 行う)
  function getEffectiveSeason() {
    const mode = state.lifetime.seasonMode;
    if (mode && mode !== SEASON_MODE_AUTO && SEASON_INFO[mode]) return mode;
    return getCalendarSeason();
  }


  // ミニゲーム本体(100本)は games.js に わけてある。index.html で script.js より
  // さきに よみこまれ、globalThis.installNaotocchiMinigames() に 共通ヘルパーを
  // わたすと、とうろくデータ(MINIGAMES など)が かえってくる
  const installMinigames = (typeof globalThis !== 'undefined' && globalThis.installNaotocchiMinigames) || (typeof window !== 'undefined' && window.installNaotocchiMinigames);
  if (typeof installMinigames !== 'function') throw new Error('games.js を読みこめませんでした(index.html で script.js より前に <script src="games.js"> が必要です)');
  const { MINIGAMES, MINIGAME_CATEGORY_GROUPS, REGION_MINIGAMES, SEASONAL_MINIGAMES, mg, minigameCategoryOf } = installMinigames({ sfx: (name) => audio.play(name), perfLow: () => mgPerfLow, sceneryAtlas: UI_ATLAS_IMAGES.scenery, foodIconHTML: minigameFoodHTML, drawProp: PROP_ILLUSTRATIONS?.draw, MG_ACTION_START_GRACE_MS, SEASON, ageDifficulty, bindHeldButton, clamp, createMgCanvas, currentSprite, generateMaze, lerp, mazeBfs, mgDuration, mgPointerPos, minigameEase });

  // REGION_MINIGAMES/SEASONAL_MINIGAMES  // REGION_MINIGAMES/SEASONAL_MINIGAMES の ゲームは MINIGAME_CATEGORY_
  // GROUPS には ふくまれない(一般プールを 汚さない ため、上の 説明を
  // さんしょう)が、それぞれ すでに もっている category フィールドを
  // そのまま つかって minigameCategoryOf にも 登録しておく。こうしないと
  // これらの ゲームは minigameCategoryOf.get(game) が undefined に なり、
  // pickRandomMinigame() の「同カテゴリ3連続回避」判定で undefined
  // どうしが おなじ カテゴリと 誤判定されてしまう(fishing/downhill/
  // surfingのような まったく べつの あそび が、たまたま れんぞくで 出た
  // ときに 同カテゴリあつかいされる ばぐに つながる)。fishing/downhill/
  // surfingだけでなく、home/sea/snow/…の 既存の 地域限定・季節限定
  // ゲーム すべて、そして 今後 あたらしく 追加される 地域限定・季節限定
  // カテゴリも、この ループが そのまま ひろってくれる ため、個別対応は
  // 不要(category フィールドを つけわすれない かぎり、いつでも あんぜん)
  let themedGameSerial = 0;
  for (const [regionId, regionEntries] of Object.entries(REGION_MINIGAMES)) {
    for (const entry of regionEntries) {
      if (!entry.game.id) entry.game.id = `region:${regionId}:${entry.category}:${themedGameSerial++}`;
      minigameCategoryOf.set(entry.game, entry.category);
    }
  }
  for (const [seasonId, seasonEntries] of Object.entries(SEASONAL_MINIGAMES)) {
    for (const entry of seasonEntries) {
      if (!entry.game.id) entry.game.id = `season:${seasonId}:${entry.category}:${themedGameSerial++}`;
      minigameCategoryOf.set(entry.game, entry.category);
    }
  }

  // 地域・季節ゲームは常に抽選候補。現在地・現在季節のものだけ少し出やすくする。
  // これにより、ゲームを見るために毎回地域や季節を切り替える必要はない。
  let minigameQueue = [];
  let currentMinigamePool = MINIGAMES;
  let minigameQueueRegionId = null;
  let minigameQueueSeason = null;
  // --- ゲームいちらん用の 見出し情報 -----------------------------------
  // ゲーム本体(makeXxxGame)は タイトル文字列を クロージャの なかに とじこめて
  // いて 外から よめない ので、「じっせき > ゲームきろく」の いちらんに
  // 出す みじかい名前・アイコン・ひとこと説明は、この表で id ごとに もつ。
  // ジャンルは category から ひく(MINIGAME_GENRE_OF_CATEGORY)。
  // tests/smoke-test.js が「すべての ゲーム id に この表の エントリが ある」
  // ことを 確かめる ので、ゲームを 足したら ここにも 1行 足すこと。
  const MINIGAME_GENRES = [
    { id: 'action', emoji: '🕹️', label: 'アクション' },
    { id: 'drive3d', emoji: '🚀', label: '3D・のりもの' },
    { id: 'sports', emoji: '⚽', label: 'スポーツ' },
    { id: 'puzzle', emoji: '🧩', label: 'パズル' },
    { id: 'board', emoji: '♟️', label: 'ボード・テーブル' },
    { id: 'strategy', emoji: '🏰', label: 'ストラテジー・RPG' },
  ];
  const MINIGAME_GENRE_OF_CATEGORY = {
    road: 'action', stack: 'action', craneGame: 'action', pinball: 'action', breakout: 'action', jumpQuest: 'action',
    frogger: 'action', snake: 'action', doodleJump: 'action', bomber: 'action', asteroids: 'action', skyShooter: 'action',
    tankBattle: 'action', fruitSlice: 'action', sushiBelt: 'action', catapult: 'action', streetFight: 'action',
    halfpipe: 'action', dominoRun: 'action', jenga: 'action', dotEater: 'action', missileCommand: 'action', areaClaim: 'action', takoyaki: 'action',
    perspective3d: 'drive3d', firstPersonDungeon: 'drive3d', hauntedHouse: 'drive3d', roadRace: 'drive3d', rhythmHighway: 'drive3d',
    tiltMaze: 'drive3d', spaceGunner: 'drive3d', grandPrix: 'drive3d', ringFlight: 'drive3d', submarine: 'drive3d',
    hangGlider: 'drive3d', planeLanding: 'drive3d', voxelMine: 'drive3d', lunarLander: 'drive3d',
    swipeThrow: 'sports', miniGolf: 'sports', realFishing: 'sports', fishing: 'sports', basketball: 'sports', pingPong: 'sports',
    freeKick: 'sports', baseball: 'sports', skiJump: 'sports', airHockey: 'sports', tennis: 'sports', darts: 'sports',
    trackField: 'sports', curling: 'sports', downhill: 'sports', climbing: 'sports', beachVolley: 'sports',
    fallingBlock: 'puzzle', chainPuzzle: 'puzzle', pushPuzzle: 'puzzle', minesweeper: 'puzzle', bubbleShooter: 'puzzle',
    twenty48: 'puzzle', matchThree: 'puzzle', picross: 'puzzle', pipeConnect: 'puzzle', lightsOut: 'puzzle', lineTrace: 'puzzle',
    memoryCards: 'puzzle', sudoku: 'puzzle', dragDecorate: 'puzzle', hitBlow: 'puzzle', slidePuzzle: 'puzzle',
    reversi: 'board', animalShogi: 'board', billiards: 'board', connectFour: 'board', gomoku: 'board', blackjack: 'board',
    yachtDice: 'board', checkers: 'board', mancala: 'board', solitaire: 'board', shanghai: 'board', sugoroku: 'board',
    towerDefense: 'strategy', roguelike: 'strategy',
  };
  const MINIGAME_INFO = {
    'road-themed': { name: 'ロードラン', emoji: '🏃', desc: 'よいものをキャッチ。わるいものはよけよう。' },
    'stack-themed': { name: 'つみあげタワー', emoji: '🏗️', desc: 'ゆれるクレーンから落として、高くつもう。' },
    'stack-snowman': { name: 'ゆきだるまタワー', emoji: '⛄', desc: '丸く重ねよう。' },
    'bowling-3d': { name: 'ボウリング', emoji: '🎳', desc: 'スワイプで投げて、ストライクをねらえ。' },
    'archery-3d': { name: 'アーチェリー', emoji: '🏹', desc: '風を読んで、的の真ん中へ。' },
    'breakout-classic': { name: 'ブロックくずし', emoji: '🧱', desc: '指でパドルを動かして、全部くずそう。' },
    'dragDecorate-cake': { name: 'ケーキデコレーション', emoji: '🎂', desc: 'トッピングをかざろう。' },
    'dragDecorate-bento': { name: 'おべんとうづくり', emoji: '🍱', desc: '見本どおりにつめよう。' },
    'p3-space': { name: 'うちゅうフライト3D', emoji: '🛸', desc: '星を集めて、いんせきをよけよう。' },
    'p3-drive': { name: 'ハイウェイ3D', emoji: '🛣️', desc: 'コインを拾って、車をよけよう。' },
    'fp-dungeon': { name: 'ダンジョン3D', emoji: '🗝️', desc: '宝箱を集めて、出口をさがそう。' },
    'falling-block-puzzle': { name: 'ブロックパズル', emoji: '🟦', desc: 'そろえて消そう。' },
    'crane-game-3d': { name: 'クレーンゲーム', emoji: '🕹️', desc: 'アームを動かして、景品をつかめ。' },
    'pinball-physics': { name: 'ピンボール', emoji: '🎯', desc: 'フリッパーではじいて、得点をかせげ。' },
    'haunted-house-3d': { name: 'おばけやしき3D', emoji: '👻', desc: 'かぎを見つけて、出口からにげろ。' },
    'race-3d': { name: 'カーレース3D', emoji: '🏎️', desc: 'ハイウェイ・さばく・ネオンのコースを走りぬけ。' },
    'rhythm-highway-3d': { name: 'リズムハイウェイ', emoji: '🎵', desc: '流れてくるノーツを、ジャストでたたけ。' },
    'tilt-maze-3d': { name: 'たまころがし迷路', emoji: '🪀', desc: '盤をかたむけてゴールへ。' },
    'space-gunner-3d': { name: 'スペースガンナー', emoji: '🔫', desc: 'せまる敵にねらいを合わせて、打ち落とせ。' },
    'mini-golf-physics': { name: 'ミニゴルフ', emoji: '⛳', desc: '引っぱってはなして、パー以下をめざせ。' },
    'real-fishing': { name: 'ほんかくさかなつり', emoji: '🎣', desc: '合わせて、巻いて、つり上げろ。' },
    'basketball-3d': { name: 'バスケ3D', emoji: '🏀', desc: 'はらってシュート。リングをねらえ。' },
    'pingpong-3d': { name: '卓球3D', emoji: '🏓', desc: 'ラリーで相手をぬけ。' },
    'chain-puzzle': { name: 'れんさパズル', emoji: '🔮', desc: '色玉を4こつなげて消そう。' },
    'street-fight': { name: 'かくとうバトル', emoji: '🥊', desc: 'パンチ・キック・ガードでライバルをたおせ。' },
    'free-kick-3d': { name: 'フリーキック', emoji: '⚽', desc: 'かべとキーパーをこえて、ゴールへ。' },
    'tower-defense': { name: 'タワーディフェンス', emoji: '🏰', desc: 'お城を6ウェーブ守りきれ。' },
    'roguelike-dungeon': { name: 'ローグライク', emoji: '⚔️', desc: 'ダンジョンを3階降りて脱出。' },
    'grand-prix-3d': { name: 'グランプリ', emoji: '🏁', desc: 'ライバル5台と3周レース。' },
    'sky-shooter': { name: 'スカイシューター', emoji: '✈️', desc: 'たくさんの弾をかわして、ボスをたおせ。' },
    'jump-quest': { name: 'ジャンプクエスト', emoji: '🍄', desc: '走って飛んで、旗まで。' },
    'push-puzzle': { name: 'そうこばん', emoji: '📦', desc: '箱をおして★へ。' },
    'reversi-6': { name: 'オセロ', emoji: '⚫', desc: '角を取って、相手に勝とう。' },
    'billiards-6': { name: 'ビリヤード', emoji: '🎱', desc: '6このボールを全部ポケットへ。' },
    'animal-shogi': { name: 'どうぶつしょうぎ', emoji: '🦁', desc: '🦁を取るか、奥まで進め。' },
    'minesweeper-8': { name: 'マインスイーパー', emoji: '💣', desc: '数字を読んで、ばくだんをさけろ。' },
    'snake-classic': { name: 'スネーク', emoji: '🐍', desc: '🍎を食べて、どこまでのびる?' },
    'baseball-batting': { name: 'やきゅう', emoji: '⚾', desc: 'コースを合わせて、タイミングよくスイング。' },
    'ring-flight-3d': { name: 'リングフライト3D', emoji: '🛩️', desc: '空のリングをくぐりぬけろ。' },
    'bubble-shooter': { name: 'バブルシューター', emoji: '🫧', desc: '同じ色を3こそろえて消せ。' },
    'catapult-castle': { name: 'カタパルト', emoji: '🏯', desc: '塔をくずして👻をたおせ。' },
    'connect-four': { name: 'コネクトフォー', emoji: '🔴', desc: '4つならべて、相手に勝とう。' },
    'puzzle-2048': { name: '2048', emoji: '🔢', desc: '同じ数を合わせて、大きくしよう。' },
    'frogger-road': { name: 'かえるのおうちがえり', emoji: '🐸', desc: '道路と川をわたって、おうちへ。' },
    'ski-jump': { name: 'スキージャンプ', emoji: '⛷️', desc: '飛び出しと前かがみで、遠くへ。' },
    'air-hockey': { name: 'エアホッケー', emoji: '🏒', desc: 'パックをはじいて、先に5点。' },
    'submarine-3d': { name: 'サブマリン3D', emoji: '🐙', desc: '深い海でお宝をさがせ。' },
    'match-3': { name: 'フルーツマッチ3', emoji: '🍓', desc: '入れかえて、そろえて消す。' },
    'gomoku-9': { name: '五目ならべ', emoji: '⚪', desc: '5つならべて、相手に勝とう。' },
    'tank-battle': { name: 'タンクバトル', emoji: '🪖', desc: 'かべをくだいて、敵を全部たおせ。' },
    'tennis-rally': { name: 'テニス', emoji: '🎾', desc: 'ラリーで相手をゆさぶれ。' },
    'picross-5': { name: 'ピクロス', emoji: '🖼️', desc: '数字を読んで、絵をぬろう。' },
    'darts-board': { name: 'ダーツ', emoji: '🎯', desc: 'ゆれるねらいをおさえて、ブルをねらえ。' },
    'hang-glider-3d': { name: 'ハンググライダー3D', emoji: '🪂', desc: '気流に乗って、遠くまで。' },
    'bomber-maze': { name: 'ボンバー', emoji: '💥', desc: 'ばくだんでレンガをくだき、敵をたおせ。' },
    'blackjack-21': { name: 'ブラックジャック', emoji: '🃏', desc: '21に近づけて、ディーラーに勝とう。' },
    'pipe-connect': { name: 'パイプつなぎ', emoji: '🔧', desc: '回して、水を通そう。' },
    'fruit-slice': { name: 'フルーツ斬り', emoji: '🍉', desc: 'スワイプでスパッと切ろう。' },
    'track-field': { name: 'りくじょう', emoji: '🏃‍♀️', desc: '100mダッシュと幅とび。' },
    'voxel-mine': { name: 'ボクセルマイニング', emoji: '⛏️', desc: 'ほって、お宝をさがそう。' },
    'sushi-belt': { name: 'かいてんずし', emoji: '🍣', desc: '注文どおりに取ろう。' },
    'asteroids-classic': { name: 'アステロイド', emoji: '☄️', desc: '回して噴射して、岩をくだけ。' },
    'yacht-dice': { name: 'ヨット', emoji: '🎲', desc: 'サイコロで役をそろえよう。' },
    'lights-out': { name: 'ライツアウト', emoji: '💡', desc: '全部のライトを消そう。' },
    'doodle-jump': { name: 'ぴょんぴょんジャンプ', emoji: '🐰', desc: '台をつたって上へ。' },
    'curling-ice': { name: 'カーリング', emoji: '🥌', desc: '真ん中によせよう。' },
    'jenga-tower': { name: 'ジェンガ', emoji: '🪵', desc: 'くずさず何こぬける?' },
    'line-trace': { name: 'せんなぞり', emoji: '✏️', desc: 'お手本をぴったりなぞろう。' },
    'checkers-6': { name: 'チェッカー', emoji: '🔘', desc: '飛びこして、相手のこまを取れ。' },
    'memory-cards': { name: 'しんけいすいじゃく', emoji: '🃏', desc: '同じ絵をそろえよう。' },
    'halfpipe-skate': { name: 'ハーフパイプ', emoji: '🛹', desc: 'ポンプで加速、エアで回転。' },
    'domino-run': { name: 'ドミノたおし', emoji: '🁢', desc: '欠けた場所をうめて🔔まで。' },
    'sudoku-mini': { name: 'ナンプレ', emoji: '🔢', desc: '数字を全部うめよう。' },
    'mancala-kalah': { name: 'マンカラ', emoji: '🫘', desc: 'たねをまいて、ストアに集めよう。' },
    'plane-landing': { name: 'ひこうき着陸', emoji: '🛬', desc: 'ふわっと降りよう。' },
    'road-city': { name: 'とかいラン', emoji: '🏙️', desc: 'ラッキーなあいてむはキャッチ。障害物はよけて。' },
    'stack-harvest': { name: 'しゅうかくタワー', emoji: '🌾', desc: 'いなかの実りを、くずさずつもう。' },
    'stack-acorn': { name: 'きのみタワー', emoji: '🌰', desc: '森の木の実を、高くつみ上げよう。' },
    'downhill-mountain': { name: 'やまの岩場のぼり', emoji: '⛰️', desc: '岩をえらび、タイミングよくつかんで山頂へ。' },
    'downhill-snow': { name: 'ゆきのゲレンデ', emoji: '🎿', desc: 'スキーやボードですべり降りよう。' },
    'fishing-sea': { name: 'うみのさかなつり', emoji: '🐟', desc: '合わせて、巻いて、つり上げろ。' },
    'fishing-deepsea': { name: 'しんかいフィッシング', emoji: '🦑', desc: '何がかかるかわからない。' },
    'fishing-river': { name: 'みずべのさかなつり', emoji: '🐠', desc: '川や湖の流れを読もう。' },
    'road-jungle': { name: 'ジャングルラン', emoji: '🌴', desc: 'くだものは取って、とげとヘビはよけて。' },
    'road-desert': { name: 'さばくラン', emoji: '🏜️', desc: 'オアシスのめぐみは取って、とげはよけて。' },
    'stack-sakura': { name: 'さくらタワー', emoji: '🌸', desc: '花びらをそっと重ねよう。' },
    'ring-flight-summer': { name: 'なつのうみフライト', emoji: '🌅', desc: '夕焼けのリングをくぐれ。' },
    'stack-leaves': { name: 'おちばタワー', emoji: '🍂', desc: '落ち葉の山を高くつもう。' },
    'curling-winter': { name: 'ふゆのカーリング大会', emoji: '🥌', desc: '5こずつで勝負。' },
    'dot-eater': { name: 'ドットイーター', emoji: '👻', desc: 'ドットを全部食べて、おばけからにげろ。' },
    'missile-command': { name: 'ミサイルコマンド', emoji: '🚀', desc: 'タップで迎え打って、町を守れ。' },
    'area-claim': { name: 'じんとり', emoji: '🟪', desc: '線を引いてかこんで、75%取れ。' },
    'solitaire-klondike': { name: 'ソリティア', emoji: '🃏', desc: '4つの台にAからKまでそろえよう。' },
    'hit-blow': { name: 'ヒット&ブロー', emoji: '🎯', desc: 'かくれた4色のならびを当てろ。' },
    'lunar-lander': { name: 'ルナランダー', emoji: '🌙', desc: '逆噴射でやさしく着陸。' },
    'shanghai-tiles': { name: '上海', emoji: '🀄', desc: '同じ絵の牌を2枚ずつ取ってくずせ。' },
    'beach-volley': { name: 'ビーチバレー', emoji: '🏐', desc: 'うけて上げてスパイク。先に7点。' },
    'slide-puzzle': { name: 'スライドパズル', emoji: '🧩', desc: 'ピースをすべらせて、絵を完成させよう。' },
    'sugoroku-race': { name: 'すごろく', emoji: '🎲', desc: 'サイコロをねらって止めて、先にゴール。' },
    'takoyaki-grill': { name: 'たこやきやさん', emoji: '🐙', desc: 'ちょうどいい焼き具合で、返して取れ。' },
  };
  // はじめて あそぶ ゲームの まえに 出す「そうさの せつめい」。games.js の 各ゲームの
  // ヒント文(class="mg-hint" の さいしょの 文)から 生成した 表(id → 文)。
  // ゲームを 足したら ここにも 1行 足す(smoke-test が もれを 検査する)
  const MINIGAME_CONTROLS = {
    "road-themed": "◀▶（おしっぱなしOK）か、画面の左・中・右をタップしてレーンを移動。よいものは取って、わるいものはよけよう。",
    "stack-themed": "上でゆれるブロックを、下のブロックに重なるタイミングでタップして落とす。はみ出た部分は切り落とされて、だんだん細くなる。ぴったり重ねると✨パーフェクトで幅がもどる!",
    "stack-snowman": "上でゆれるブロックを、下のブロックに重なるタイミングでタップして落とす。はみ出た部分は切り落とされて、だんだん細くなる。ぴったり重ねると✨パーフェクトで幅がもどる!",
    "bowling-3d": "ボールから上へスワイプ!速くはらうほど強く、ななめにはらうとねらいが変わる。◀▶で立ち位置を変えよう。",
    "archery-3d": "画面をおさえて後ろへ引っぱり、はなすと発射。風の分だけずらしてねらおう。",
    "breakout-classic": "画面を横になぞるか、◀▶でパドルを動かす。パドルのはしで打つと、ボールがななめに飛ぶ。落ちてくるあいてむ：⬌ワイドはパドルが広がる／●マルチボールはボールが増える／🐢スローはボールがゆっくりになる。",
    "dragDecorate-cake": "下のトッピングを指でドラッグして、点線の場所に置く。ヒントに合ったトッピングを選ぼう。",
    "dragDecorate-bento": "見本を覚えてね!見本が消えたら、同じ場所に具をドラッグしてもどそう。",
    "p3-space": "◀▶（おしっぱなしOK）か、画面の左・中・右をタップしてレーンを移動。よいものは取って、わるいものはよけよう。",
    "p3-drive": "◀▶（おしっぱなしOK）か、画面の左・中・右をタップしてレーンを移動。よいものは取って、わるいものはよけよう。",
    "fp-dungeon": "↶↷で向きを変え、↑で進む（おしっぱなしOK）。画面をドラッグしても見まわせる。",
    "falling-block-puzzle": "◀▶で移動（おしっぱなしOK）。↻で回転、▼をおしっぱなしで速く下げる。⏬で一気に落とそう。",
    "crane-game-3d": "ボタンをおしている間、アームが動く。景品の真ん中ではなそう。落ちても、左手前の落とし口に入ればゲット!",
    "pinball-physics": "「はっしゃ」を長おしでためて、はなす。フリッパーはおしっぱなしで上がる。",
    "haunted-house-3d": "↶↷で向きを変え、▲で進む（おしっぱなしOK）。かぎを取ると、ゆうれいが追いかけてくる!",
    "race-3d": "アクセルをおしっぱなしで加速。カーブでは外にふられるので、◀▶でおさえよう。",
    "rhythm-highway-3d": "ノーツが手前のラインに重なった瞬間に、そのレーンのボタンをタップ!",
    "tilt-maze-3d": "盤をドラッグしてかたむける（十字ボタンでもOK）。穴に落ちないようにゴールへ進もう。",
    "space-gunner-3d": "ドラッグでねらいを合わせ、画面をタップするか「うつ!」で発射。赤くなった敵は攻撃直前!",
    "mini-golf-physics": "ボールから後ろへ引っぱって、はなすとパット。引っぱる長さで強さが決まる。",
    "real-fishing": "ボタンを長おしでためて、はなすとキャスト。うきがしずんだら「あわせる」!",
    "basketball-3d": "ボールを上へはらってシュート。はらう長さと速さで、飛ぶ距離が変わる。バックボードに当ててもOK。",
    "pingpong-3d": "画面をなぞってラケットを動かす。ボールが来た場所にラケットを置くと返せる。先に5点取ろう!",
    "chain-puzzle": "同じ色を4こつなげると消える。消えたあとに落ちてつながれば、れんさ!",
    "street-fight": "パンチは速い。キックは強くて、相手をふき飛ばす。相手が光ったらガード（長おし）!",
    "free-kick-3d": "ボールから上へはらってシュート。速くはらうほど強く、ななめにはらうとねらいが変わる。途中で曲げるとカーブ!",
    "tower-defense": "茶色い道の外にタワーを建てよう。タワーを選び、もう一度タップすると強化。敵が来る前にそなえて!",
    "roguelike-dungeon": "1マス動くと敵も動く。敵にぶつかって攻撃。🧪は回復、⚔️は攻撃力アップ、🪜で次の階へ。",
    "grand-prix-3d": "アクセルを長おし、◀▶でハンドル操作。青いパッドでブースト、オイルはすべる。ライバルをぬいて1位をめざせ!",
    "sky-shooter": "画面をなぞって機体を動かそう。弾は自動で出るよ。Pを取るとパワーアップ。ピンチではボム!",
    "jump-quest": "◀▶で走り、ジャンプは長おしで高く。敵は上からふみ、とげは飛びこえて、🚩まで!",
    "push-puzzle": "箱（📦）をおして★のマスへ。引っぱれないので、おす向きを考えよう。↩で1手もどせる。",
    "reversi-6": "光っているマスをタップ。相手の石をはさむと、全部自分の色に変わる。角を取ると強い!",
    "billiards-6": "白いボールから後ろへ引っぱって、はなすとショット。引っぱる長さで強さが変わる。ガイド線を見てねらおう!",
    "animal-shogi": "こまをタップして、光ったマスへ。🦁を取るか、自分の🦁が一番奥まで行けば勝ち。取ったこまは、下の手持ちから打てる。",
    "minesweeper-8": "マスをタップで開く。数字は、まわり8マスにあるばくだんの数。あやしいマスは🚩モードか長おしで、旗を立てよう。",
    "snake-classic": "十字キーか画面のスワイプで向きを変える。🍎でのびてスピードアップ。⭐は3こ分!かべと体にぶつからないで。",
    "baseball-batting": "◀▶か画面のドラッグで、バットを球のコースへ。球がホームベースに来る瞬間にスイング!真ん中で当てるとホームラン。",
    "ring-flight-3d": "画面をなぞって飛行機を動かす（十字キーでもOK）。リングの真ん中をくぐると○。雲に当たるとスピードダウン。",
    "bubble-shooter": "画面をおさえてねらいを決め、はなすと発射。同じ色が3こつながると消える。かべではね返して、裏からねらうのもアリ。",
    "catapult-castle": "ボールをおさえて後ろへ引っぱり、はなすと発射。ブロックをくずして👻をたおそう。高い場所から落としてもOK。",
    "connect-four": "落としたい列をタップ。たて・横・ななめに4つならべたら勝ち。相手（🟡）の3つならびはふさごう。",
    "puzzle-2048": "スワイプか十字キーで、全部のタイルがすべる。同じ数がぶつかると、足されて1つに。大きい数を角にためるのがコツ。",
    "frogger-road": "十字キーかスワイプで1マス飛ぶ。車に当たらないように道路をわたろう。川は🪵の上だけ安全。空いている🏠へ!",
    "ski-jump": "ボタンでスタート。台のはし（赤い線）でタップして飛び出す!空中では長おしで前かがみになり、風の目印（▽）に重ねよう。着地直前にタップでテレマーク。",
    "air-hockey": "下半分で指を動かすとマレットがついてくる。パックをはじいて上のゴールへ!自分のゴールも守ろう。先に5点取ったら勝ち。",
    "submarine-3d": "画面をなぞるか、十字キーで潜水艦を動かす。💎を取り、岩やクラゲはよける。酸素メーターが減ったら🫧を取ろう。",
    "match-3": "となり合うフルーツを、スワイプか2回のタップで入れかえる。たて・横に3つ以上そろうと消える。4つ・5つや、れんさで大きくかせごう。",
    "gomoku-9": "マスをタップすると仮置き。同じ場所をもう一度タップで決定。たて・横・ななめに5つならべたら勝ち。相手の3つ・4つならびはふさごう。",
    "tank-battle": "十字キーの長おしで動き、真ん中の🔥で発射。向いている方へ弾が飛ぶ。レンガのかべは、こわして道を作れる。",
    "tennis-rally": "◀▶で動いて、ボールが近づいたらスイング!低い場所で打つと速いドライブ、高い場所で打つとロブ。相手のコートに落とそう。4ポイント先取り。",
    "picross-5": "数字は、その列で続けてぬるマスの数。「2 1」なら2つぬって、間を空けて1つぬる。タップでぬる。✕モードか長おしで、ぬらない印をつけよう。",
    "darts-board": "画面をおさえてねらいを動かし、はなすと投げる。おさえている間は手がゆれるので、早めにはなすのがコツ。真ん中のブルは50点!",
    "hang-glider-3d": "画面をなぞるか◀▶で左右に動き、▲▼で機首を上げ下げ。下げると速く進むけど、高さが減る。🌀の上昇気流で高さをかせぎ、🎈を集めよう。地面につくと着陸。",
    "bomber-maze": "十字キーの長おしで動き、💣でばくだんを置く。2秒で十字に爆発!自分もまきこまれるので、はなれよう。レンガからあいてむが出る。",
    "blackjack-21": "カードの合計を21に近づける。21をこえたら負け。Aは1か11、絵札は10。ヒットで1枚引き、スタンドで勝負。ディーラーは17以上で止まる。",
    "pipe-connect": "パイプをタップすると90°回る。左の🚰から右の🌻まで、水が通る道を作ろう。少ないタップでつなぐと高得点。",
    "fruit-slice": "指で素早くなぞってフルーツを切る!1回のスワイプで何こも切るとコンボ。💣を切るとライフが減る。落としすぎにも注意。",
    "track-field": "◀と▶を交互に素早くタップして走る!100mのあとは幅とび。白いラインの手前でジャンプボタンをおして、はなすと飛ぶ。長くおすと高く飛べる。",
    "voxel-mine": "十字キーを長おしで、その向きにほる。石は時間がかかる。⚫石炭→⛓鉄→🟡金→💎ダイヤは、深いほど多い。🔥マグマにさわるとダメージ!",
    "sushi-belt": "上の「注文」と同じネタのお皿を、レーンからタップして取る。ちがうお皿や🌶わさびはペナルティ。早くそろえるとボーナス。",
    "asteroids-classic": "◀▶で回り、▲の長おしで進む。🔥か画面のタップで打つ。岩をわると、小さく速くなる。画面のはしはつながっている。",
    "yacht-dice": "「ふる」は1ターンに全部で3回。サイコロをタップでキープし、残りだけふり直す。役をタップして記録。同じ役は1回だけ。",
    "lights-out": "タップしたマスと、上下左右のライトが反転する。全部消せばクリア。「さいてい」の手数をめざそう。",
    "doodle-jump": "◀▶か横のドラッグで動き、台に降りよう。ジャンプは自動。緑はふつう、青は動く、茶色は1回でこわれる。🔴バネは大ジャンプ。左右のはしはつながっている。",
    "curling-ice": "🔴を上へスワイプ。速いほど強く、ななめなら曲がる。投げたあとは連打でのばそう。真ん中に一番近い石のチームが得点。",
    "jenga-tower": "タップしたブロックをぬいて、上につみ直すよ。真ん中を残すと安定し、はしだけだとくずれやすい。安定度（%）を見ながら選ぼう。",
    "line-trace": "●から灰色の線をひと筆でなぞろう。線に近いと緑、はなれると赤。指をはなすと判定するよ。",
    "checkers-6": "こまをタップして、光ったマスへ。ななめ前に1マス進める。相手のこまを飛びこすと取れる（続けて飛べる）。奥まで行くと👑キングになり、後ろにも進める。",
    "memory-cards": "カードを2枚タップしてめくる。同じ絵ならそのまま、ちがえばもどる。場所を覚えて、少ない回数で全部そろえよう。",
    "halfpipe-skate": "下り坂で「ポンプ」を長おしすると加速。勢いがつくと、ふちから飛び出す。空中で「トリック」をおすと1回転（何度もおせる）。着地までに回りきらないと転倒!",
    "domino-run": "道の途中でドミノが欠けている（点線）。手持ちのドミノを、欠けた場所にタップして置こう。全部つながったら「おす!」。余った手持ちはボーナス。",
    "sudoku-mini": "難易度により4×4（1〜4）か6×6（1〜6）。たて・横・太いわくの中に、それぞれの数字を1つずつ入れる。マスをタップで選び、下の数字ボタンで入れよう。まちがうと赤く光る。",
    "mancala-kalah": "下にある自分の穴をタップ。たねを1つずつ、自分のストアの方向へまく。最後のたねが右の自分のストアに入ると、もう1回。空の自分の穴に落ちると、向かいのたねももらえる。",
    "plane-landing": "▲▼かたてのドラッグで機首を上げ下げ。緑の線を目安に、滑走路の⬛へふわっと降りよう。風で浮きしずみするよ。",
    "dot-eater": "十字キーか画面のスワイプで進む。ドットを全部食べよう。⭐を食べると、6秒間はおばけを食べ返せる!",
    "missile-command": "空をタップすると、一番近い基地から迎撃ミサイルが飛ぶ。爆発の輪に敵のミサイルをまきこんで、町を守れ!基地の弾はウェーブごとに補給される。",
    "area-claim": "十字キーのおしっぱなしでふちを動き、中へ線を引いてかこもう。75%取ればクリア。✨が線にふれると1ミス。",
    "solitaire-klondike": "カードをタップで選び、置きたい列か右上の台をタップ。選んだカードをもう1回タップすると台へ。山札はタップでめくる。",
    "hit-blow": "答えは6色のうち4色（同じ色は2つない）。色を4つ選んで「けってい」。🎯ヒット＝色も場所も当たり。💨ブロー＝色はあるけど場所がちがう。",
    "lunar-lander": "◀▶でかたむけ、🔥で逆噴射。平らなパッド（×2/×3）に、まっすぐ、ゆっくり降りよう。速すぎたり、ななめだとクラッシュ。",
    "shanghai-tiles": "上に牌がなく、左か右が空いている牌だけ取れる。同じ絵の2枚をタップして消そう。必ず解ききれるならびになっている。",
    "beach-volley": "◀▶で動いてボールの下へ。ふれると高く上がる（うけ）。🏐アタックをおしながらふれると、相手のコートへスパイク!先に7点取ろう。",
    "slide-puzzle": "空いたマスのとなりのピースを、タップかスワイプですべらせる。左上から順番にならべて、絵を完成させよう。",
    "sugoroku-race": "「🎲とめる」をおすと、回っているサイコロが止まる。ねらって止めよう!➕は進む、➖はもどる、⭐はコイン、💤は1回休み。先にゴールへ!",
    "takoyaki-grill": "きつね色（緑のゾーン）になったら、タップでひっくり返す。裏もきつね色になったら、タップで取り出す。早いと生、おそいとこげ!",
    "road-city": "◀▶（おしっぱなしOK）か、画面の左・中・右をタップしてレーンを移動。よいものは取って、わるいものはよけよう。",
    "stack-harvest": "上でゆれるブロックを、下のブロックに重なるタイミングでタップして落とす。はみ出た部分は切り落とされて、だんだん細くなる。ぴったり重ねると✨パーフェクトで幅がもどる!",
    "stack-acorn": "上でゆれるブロックを、下のブロックに重なるタイミングでタップして落とす。はみ出た部分は切り落とされて、だんだん細くなる。ぴったり重ねると✨パーフェクトで幅がもどる!",
    "downhill-mountain": "◀▶か画面のタップで岩をえらぼう。針が緑のわくに入ったら「つかむ」!明るい岩はつかみやすい。3段ごとの休憩で、にぎる力がもどる。12段の山頂をめざそう。",
    "downhill-snow": "◀▶のおしっぱなしか、画面のドラッグでハンドル操作。🚩🚩の間を通り、🪵はジャンプでこえよう。",
    "fishing-sea": "ボタンを長おしでためて、はなすとキャスト。うきがしずんだら「あわせる」!",
    "fishing-deepsea": "ボタンを長おしでためて、はなすとキャスト。うきがしずんだら「あわせる」!",
    "fishing-river": "ボタンを長おしでためて、はなすとキャスト。うきがしずんだら「あわせる」!",
    "road-jungle": "◀▶（おしっぱなしOK）か、画面の左・中・右をタップしてレーンを移動。よいものは取って、わるいものはよけよう。",
    "road-desert": "◀▶（おしっぱなしOK）か、画面の左・中・右をタップしてレーンを移動。よいものは取って、わるいものはよけよう。",
    "stack-sakura": "上でゆれるブロックを、下のブロックに重なるタイミングでタップして落とす。はみ出た部分は切り落とされて、だんだん細くなる。ぴったり重ねると✨パーフェクトで幅がもどる!",
    "ring-flight-summer": "画面をなぞって飛行機を動かす（十字キーでもOK）。リングの真ん中をくぐると○。雲に当たるとスピードダウン。",
    "stack-leaves": "上でゆれるブロックを、下のブロックに重なるタイミングでタップして落とす。はみ出た部分は切り落とされて、だんだん細くなる。ぴったり重ねると✨パーフェクトで幅がもどる!",
    "curling-winter": "🔴を上へスワイプ。速いほど強く、ななめなら曲がる。投げたあとは連打でのばそう。真ん中に一番近い石のチームが得点。",
  };
  function minigameInfo(game) {
    const info = MINIGAME_INFO[game.id];
    if (info) return info;
    const category = minigameCategoryOf.get(game) || 'game';
    return { name: category, emoji: '🎮', desc: '' };
  }
  function minigameGenreId(game) {
    return MINIGAME_GENRE_OF_CATEGORY[minigameCategoryOf.get(game)] || 'action';
  }

  // 地域/きせつ げんていの ゲームが「どこ/いつの ゲームか」を いちらんの
  // タグに 出すための 逆引き(ゲーム → {kind, id, emoji, label})
  const minigameHomeOf = new Map();
  for (const [regionId, regionEntries] of Object.entries(REGION_MINIGAMES)) {
    const region = findRegion(regionId);
    for (const entry of regionEntries) minigameHomeOf.set(entry.game, { kind: 'region', id: regionId, emoji: region.emoji, label: region.label });
  }
  for (const [seasonId, seasonEntries] of Object.entries(SEASONAL_MINIGAMES)) {
    const info = SEASON_INFO[seasonId];
    for (const entry of seasonEntries) minigameHomeOf.set(entry.game, { kind: 'season', id: seasonId, emoji: info.emoji, label: info.label });
  }

  // --- じこベストと ランク ---------------------------------------------
  // ランクは アイテムの ボーナスを のぞいた てんすう(0〜100)で きめる。
  // S は「ほぼ かんぺき」、A は「じょうず」、B は「なかなか」、C は
  // 「もうすこし」、D は「これから」。finishMinigame() の 大成功(70+)と
  // A(75+)が ほぼ そろう ように しきい値を あわせてある
  const MINIGAME_RANKS = [
    { id: 'S', min: 90 },
    { id: 'A', min: 75 },
    { id: 'B', min: 55 },
    { id: 'C', min: 35 },
    { id: 'D', min: 0 },
  ];
  function minigameRankOf(score) {
    return (MINIGAME_RANKS.find((r) => score >= r.min) || MINIGAME_RANKS[MINIGAME_RANKS.length - 1]).id;
  }
  function minigameRecordOf(game) {
    if (!game || !game.id) return null;
    const records = state.lifetime.minigameRecords || (state.lifetime.minigameRecords = {});
    return records[game.id] || null;
  }
  // 1かいの けっかを きろくし、けっかカードに 出す じょうほうを かえす
  function recordMinigameResult(game, rawScore) {
    if (!game || !game.id) return null;
    const records = state.lifetime.minigameRecords || (state.lifetime.minigameRecords = {});
    const score = clamp(Math.round(rawScore), 0, 100);
    const prev = records[game.id] || null;
    const isNewBest = !prev || score > prev.best;
    const best = isNewBest ? score : prev.best;
    records[game.id] = { best, last: score };
    return { score, best, prevBest: prev ? prev.best : null, isNewBest, rank: minigameRankOf(score), bestRank: minigameRankOf(best) };
  }

  let mgResultToastTimer = null;
  function showMinigameResultToast(result) {
    if (!el.mgResultToast || !result) return;
    let sub;
    let subClass = 'mg-result-sub';
    if (result.prevBest == null) sub = 'はじめての記録!';
    else if (result.isNewBest) { sub = `自己ベスト更新!${result.prevBest} → ${result.score}`; subClass += ' new-best'; }
    else sub = `自己ベスト${result.best}点(ランク${result.bestRank})`;
    el.mgResultToast.innerHTML = `<span class="mg-rank rank-${result.rank}">${result.rank}</span><div class="mg-result-body"><span class="mg-result-score">${result.score}点</span><span class="${subClass}">${sub}</span></div>`;
    // アニメーションを あたまから やりなおす ために いちど けして つけなおす
    el.mgResultToast.classList.add('hidden');
    void el.mgResultToast.offsetWidth;
    el.mgResultToast.classList.remove('hidden');
    clearTimeout(mgResultToastTimer);
    mgResultToastTimer = setTimeout(() => el.mgResultToast.classList.add('hidden'), 3600);
  }

  let lastMinigame = null;
  // 直近さいだい4かいぶんの カテゴリ(=ジャンル)を おぼえておいて、
  // おなじ ジャンルが 3かい れんぞくしないように するための きろく
  const recentMinigameCategories = [];

  // 各ゲームオブジェクトは 上の mg() で つくった その場で 固定の 文字列id
  // (game.id)を もっている。配列じょうの 位置には いっさい 依存しないので、
  // MINIGAME_CATEGORY_GROUPS/各バリエーション配列を ならべかえたり、
  // とちゅうに べつの ゲームを 挿入・削除しても、きそんの ゲームの id は
  // かわらない。この id を state.lifetime.minigamePlayCounts(id→かいすう)
  // の キーとして えいきゅう保存する。これにより「あそんだ かいすう/
  // みプレイ優遇」が ページを とじても きえず、なおとっちの いっしょうを
  // こえて つみあがっていく(regionsVisited などと おなじ あつかい)。
  // REGION_MINIGAMES/SEASONAL_MINIGAMES にも上の登録ループで安定した id を付けるため、
  // 地域・季節ゲームもプレイ回数と未プレイ優遇の対象になる
  function minigamePlayCount(game) {
    return game.id ? (state.lifetime.minigamePlayCounts[game.id] || 0) : 0;
  }

  function recordMinigamePlay(game) {
    if (!game.id) return;
    state.lifetime.minigamePlayCounts[game.id] = (state.lifetime.minigamePlayCounts[game.id] || 0) + 1;
  }

  function buildMinigamePool() {
    // 地域・季節は「その場所でしか遊べない条件」ではなく、出やすさの個性として扱う。
    // すべての地域/季節ゲームを常に候補へ入れ、現在地・現在季節のものだけ後段で優遇する。
    const regionalGames = Object.values(REGION_MINIGAMES).flat().map((entry) => entry.game);
    const seasonalGames = Object.values(SEASONAL_MINIGAMES).flat().map((entry) => entry.game);
    return [...new Set([...MINIGAMES, ...regionalGames, ...seasonalGames])];
  }

  // いま の 地域/きせつに だけ 出る ゲームかどうかを、category名の 文字列
  // ひかくではなく、REGION_MINIGAMES/SEASONAL_MINIGAMES の じっさいの
  // ゲームオブジェクトとの いちぃ でなおに はんていする(データこうぞうを
  // そのまま りようするので、タイトル文字列などに たよらない)
  function isRegionExclusiveGame(game) {
    const activeRegion = findRegion(state.regionId);
    return (REGION_MINIGAMES[activeRegion.id] || []).some((entry) => entry.game === game);
  }

  function isSeasonExclusiveGame(game) {
    if (!hasSurfaceSeasons(state.regionId)) return false;
    const seasonEntries = SEASONAL_MINIGAMES[getEffectiveSeason()];
    return !!seasonEntries && seasonEntries.some((entry) => entry.game === game);
  }

  // ミニゲームの 出やすさは「質の ティア」で きめる。
  //  S: 物理/3D/れんぞく操作が ある、いちばん あそびごたえの ある ゲーム(追加チケット2枚)
  //  A: 操作感や 展開に 変化が あって しっかり あそべる ゲーム(追加チケット1枚)
  //  B: みじかい タイミング/選択の ゲーム(そのまま)
  // ゲームid に ついた ティアが 優先、なければ カテゴリの ティア、それも なければ B
  // 出やすさは ぜんゲーム 同確率。いま いる地域 / いまの きせつの ゲームだけ
  // 袋に 2まい 入れて、滞在中は 約2ばい 出やすくする(ほかの 地域でも
  // ふつうの 確率で 出る。「出ない ゲーム」は つくらない)
  function refillMinigameQueue() {
    currentMinigamePool = buildMinigamePool();
    minigameQueueRegionId = state.regionId;
    minigameQueueSeason = getEffectiveSeason();
    // ふつうの シャッフル(ぜんぶが かならず 1しゅうする「シャッフルバッグ」)を
    // ベースに しつつ、まだ あそんでいない・あそんだ かいすうが すくない
    // ものほど キューの うしろ(=つぎに 出てきやすい ところ)に よりやすい
    // よう、じゅうみつきの らんすうキーで ならびかえる(Efraimidis-Spirakis ほう)
    const weighted = currentMinigamePool.map((game, i) => {
      const played = minigamePlayCount(game);
      let weight = played === 0 ? 2.2 : 1 / (1 + played * 0.12);
      if (isRegionExclusiveGame(game)) weight *= 1.45;
      if (isSeasonExclusiveGame(game)) weight *= 1.25;
      // てんき・じかんたい・きせつ・地域に あう ジャンルを 出やすく する
      weight *= environmentGameWeight(game);
      return { i, key: Math.pow(Math.random(), 1 / weight) };
    });
    weighted.sort((a, b) => a.key - b.key);
    minigameQueue = weighted.map((w) => w.i);

    // ティアに おうじて 追加チケット(S:2枚 A:1枚)。質の高いゲームへ明確に寄せつつ、
    // 元のプールも残すので同じ数本だけに固定はしない。
    // 未プレイ優遇・地域/季節優遇と競合しないよう、追加チケットも同じ
    // キューに混ぜてから軽くシャッフルする。
    const spotlightTickets = [];
    currentMinigamePool.forEach((game, i) => {
      if (isRegionExclusiveGame(game) || isSeasonExclusiveGame(game)) spotlightTickets.push(i);
    });
    for (const ticket of spotlightTickets) {
      const insertAt = Math.floor(Math.random() * (minigameQueue.length + 1));
      minigameQueue.splice(insertAt, 0, ticket);
    }
    // すぐ さっき あそんだのと おなじ ものに ならないよう ちぇっく。
    // プールの なかみは 地域が かわるたびに かわりうるので、いんでっくす
    // ではなく ゲームじたい(れいがい なく おなじ オブジェクト)で くらべる
    if (minigameQueue.length > 1 && currentMinigamePool[minigameQueue[minigameQueue.length - 1]] === lastMinigame) {
      [minigameQueue[0], minigameQueue[minigameQueue.length - 1]] = [minigameQueue[minigameQueue.length - 1], minigameQueue[0]];
    }
  }

  // 「たびに でる」「きせつを かえる」で 地域/きせつが かわった 直後だけ、
  // その場所/きせつ らしい ゲームに であいやすく する ための、のこり
  // ブーストかいすう。かわった しゅんかんに セットされ、あそぶ たびに
  // 1へって いく(0に なれば ふつうの かくりつに もどる)。地域の ほうが
  // 優先・つよめ、きせつは よわめに してある。地域と きせつが 同時に
  // かわり りょうほう ブースト中の ばあいも、それぞれの のこりかいすうは
  // 独立して へっていく(下の pickRandomMinigame() さんしょう。地域の
  // 5かいが おわるまで きせつの 3かいが まったく へらない、という 直列の
  // のびかたには ならない)
  const REGION_ARRIVAL_BOOST_PLAYS = 2;
  const REGION_ARRIVAL_BOOST_LOOKBACK = 10;
  const SEASON_ARRIVAL_BOOST_PLAYS = 1;
  const SEASON_ARRIVAL_BOOST_LOOKBACK = 8;
  let regionArrivalBoostLeft = 0;
  let seasonArrivalBoostLeft = 0;

  // キューの うしろ(=つぎに 出る ところ)から さかのぼって lookback ぶんの
  // はんいで、matches() に あう ゲームを さがし、見つかれば いちばん
  // うしろ(=つぎに 出る いち)に いれかえる。見つからなければ なにも せず
  // false を かえす(むりに 出そうとは しない)
  function trySwapForwardMatching(matches, lookback) {
    const topIdx = minigameQueue.length - 1;
    if (topIdx < 0) return false;
    const limit = Math.max(0, minigameQueue.length - lookback);
    for (let i = topIdx; i >= limit; i--) {
      if (matches(currentMinigamePool[minigameQueue[i]])) {
        if (i !== topIdx) {
          [minigameQueue[i], minigameQueue[topIdx]] = [minigameQueue[topIdx], minigameQueue[i]];
        }
        return true;
      }
    }
    return false;
  }

  // 「ぜんぶ 出きるまで おなじ ものを くりかえさない」しくみは そのまま、
  // いま いる地域の あそびも まぜた プールぜんたいに たいして はたらく
  function pickRandomMinigame() {
    // refillMinigameQueue() で じょうほうが うわがきされる まえに、
    // 地域/きせつが「いま かわった ところか」を さきに はんていしておく
    const effectiveSeasonNow = getEffectiveSeason();
    const regionJustChanged = minigameQueueRegionId !== null && minigameQueueRegionId !== state.regionId;
    const seasonJustChanged = minigameQueueSeason !== null && minigameQueueSeason !== effectiveSeasonNow;

    if (minigameQueue.length === 0 || minigameQueueRegionId !== state.regionId || minigameQueueSeason !== effectiveSeasonNow) {
      refillMinigameQueue();
    }
    if (regionJustChanged) regionArrivalBoostLeft = REGION_ARRIVAL_BOOST_PLAYS;
    if (seasonJustChanged) seasonArrivalBoostLeft = SEASON_ARRIVAL_BOOST_PLAYS;

    // とうちゃく/きせつ切りかえ 直後の のこり かいすうぶんだけ、その
    // 地域/きせつ げんてい ゲームを 見つけしだい つぎに 出るよう ひきよせる
    // (見つからない ばあいは むりせず、ふつうの じゅんばんの まま)。
    // 1かいの プレイで ひきよせは さいだい1かいまで:地域の ほうを 優先して
    // ためし、地域が いま ブースト中でない ときだけ きせつを ためす。
    // ただし 地域と きせつが 同時に かわった ばあい(りょうほう ブースト
    // 中)でも、きせつの のこり かいすうは 地域の うらで とめずに へらし
    // つづける(直列に 5+3=8かい ぶん のびない ため)。地域の ひきよせが
    // その かいだけ 見つからなかった ときは、その かいに かぎり きせつも
    // ためす(地域の 5かいぶんの つよさ・きせつの 3かいぶんの ながさは、
    // それぞれ たんどく発生時と かわらない)
    if (regionArrivalBoostLeft > 0) {
      const regionSwapped = trySwapForwardMatching(isRegionExclusiveGame, REGION_ARRIVAL_BOOST_LOOKBACK);
      if (!regionSwapped && seasonArrivalBoostLeft > 0) {
        trySwapForwardMatching(isSeasonExclusiveGame, SEASON_ARRIVAL_BOOST_LOOKBACK);
      }
    } else if (seasonArrivalBoostLeft > 0) {
      trySwapForwardMatching(isSeasonExclusiveGame, SEASON_ARRIVAL_BOOST_LOOKBACK);
    }
    if (regionArrivalBoostLeft > 0) regionArrivalBoostLeft -= 1;
    if (seasonArrivalBoostLeft > 0) seasonArrivalBoostLeft -= 1;

    // 追加チケットで同じゲームが連続しないよう、次が前回と同一なら
    // 近くにある別ゲームと入れ替える。出現率は上げても「またこれか」は防ぐ。
    let immediateIdx = minigameQueue.length - 1;
    if (immediateIdx > 0 && currentMinigamePool[minigameQueue[immediateIdx]] === lastMinigame) {
      const lookbackLimit = Math.max(0, minigameQueue.length - 10);
      for (let lookback = immediateIdx - 1; lookback >= lookbackLimit; lookback--) {
        if (currentMinigamePool[minigameQueue[lookback]] !== lastMinigame) {
          [minigameQueue[lookback], minigameQueue[immediateIdx]] = [minigameQueue[immediateIdx], minigameQueue[lookback]];
          break;
        }
      }
    }

    // おなじ ジャンル(カテゴリ)が 3かい れんぞくで 出てしまいそうなら、
    // すぐ ちかく(=もうすぐ 出てくる ところ)に ちがう ジャンルが
    // あれば そちらを さきに 出す(なければ そのまま、むりには しない)
    let idx = minigameQueue.length - 1;
    let category = minigameCategoryOf.get(currentMinigamePool[minigameQueue[idx]]);
    if (
      recentMinigameCategories.length >= 2 &&
      recentMinigameCategories[recentMinigameCategories.length - 1] === category &&
      recentMinigameCategories[recentMinigameCategories.length - 2] === category
    ) {
      const lookbackLimit = Math.max(0, minigameQueue.length - 8);
      for (let lookback = idx - 1; lookback >= lookbackLimit; lookback--) {
        const altCategory = minigameCategoryOf.get(currentMinigamePool[minigameQueue[lookback]]);
        if (altCategory !== category) {
          [minigameQueue[lookback], minigameQueue[idx]] = [minigameQueue[idx], minigameQueue[lookback]];
          category = altCategory;
          break;
        }
      }
    }
    const gameIdx = minigameQueue.pop();
    const game = currentMinigamePool[gameIdx];
    lastMinigame = game;
    recordMinigamePlay(game);
    recentMinigameCategories.push(category);
    if (recentMinigameCategories.length > 4) recentMinigameCategories.shift();
    return game;
  }

  function resultMessageForScore(score) {
    const pools = score >= 80
      ? ['いまのは気持ちよかった!', 'これはもう1回やりたい!', '最後のところ、もう一度やりたい!', '思ったよりできた!', '思いどおりに手が動いた!']
      : score >= 50
        ? ['あとちょっといけそう!', '途中まではよかった!', 'もう1回なら、もっといけそう!', 'いい勝負だった!', 'いまのミスだけくやしい!']
        : ['今回はここまで!', 'つぎはもうちょいいける!', 'いまのは練習!', 'ちょっとくやしい!', 'もう1回ならいけそう!'];
    return pools[Math.floor(Math.random() * pools.length)];
  }

  // --- ミニゲームの「セッション」と、とちゅうで やめる しくみ ---------------
  // ゲーム本体は requestAnimationFrame/setTimeout で じぶんの ループを
  // まわしている。ふつうは ゲームが じぶんで おわる ときに ループを とめる
  // が、「ゲームを やめる」で 外から おわらせた ときは、ゲームがわの ループ
  // や タイマーが とりのこされて うごきつづけて しまう(見えない canvas に
  // えがきつづける、おくれて onComplete を もう1かい よぶ、など)。
  // そこで、ゲームの コードが うごいている あいだ(start() の なか、および
  // そこから 予約された コールバック/overlay 内の DOM イベントの なか)に
  // 予約された rAF/setTimeout には「どの セッションの ものか」の しるしを
  // つけ、セッションが おわったあとは 実行せずに すてる。ふつうの がめんの
  // コード(ゲームの そとで 予約した タイマー)には しるしが つかないので、
  // これまでどおり うごく
  // けいりょうモード: ゲーム中の フレーム間かくを はかり、へいきんが 30ms を
  // こえたら(おおよそ 33fps 未満)、それいこうの canvas を かいぞうど 1 で
  // つくり、星などの かざりを へらす(このセッションの あいだ ゆうこう)
  let mgPerfLow = false;
  const mgPerf = { last: 0, samples: [] };
  function mgPerfSample() {
    const t = performance.now();
    const dt = t - mgPerf.last; mgPerf.last = t;
    if (dt < 4 || dt > 250) return;
    mgPerf.samples.push(dt);
    if (mgPerf.samples.length < 90) return;
    const avg = mgPerf.samples.reduce((a, b) => a + b, 0) / mgPerf.samples.length;
    mgPerf.samples = [];
    if (avg > 30 && !mgPerfLow) mgPerfLow = true;
  }
  let mgSession = 0;        // いま うごいている ゲームの セッション番号(0 = なし)
  let mgSessionSerial = 0;
  let mgCodeDepth = 0;      // > 0 なら「ゲームの コードの なか」
  let mgCodeSession = 0;    // その コードが どの セッションに ぞくするか
  let activeMinigame = null;
  let dailyPending = false;       // つぎに はじまる ゲームが「きょうの チャレンジ」か
  let activeMinigameDaily = false; // いま うごいている ゲームが きょうの チャレンジか
  function mgRunTagged(session, fn, thisArg, args) {
    const prevDepth = mgCodeDepth;
    const prevSession = mgCodeSession;
    mgCodeDepth += 1;
    mgCodeSession = session;
    try {
      return fn.apply(thisArg, args);
    } catch (err) {
      // ゲームの コード(フレーム/タイマー/はじめの start)が 例外で とまっても、
      // がめんが ひらきっぱなしで もどれなく ならない ように、その ゲームを
      // 「やめた」あつかいで とじる(ばつ なし)。ゲームの そとの 例外は そのまま なげる
      if (session && session === mgSession && gameActive) { handleMinigameCrash(err); return undefined; }
      throw err;
    } finally {
      mgCodeDepth = prevDepth;
      mgCodeSession = prevSession;
    }
  }
  let mgCrashHandling = false;
  function handleMinigameCrash(err) {
    if (mgCrashHandling) return;
    mgCrashHandling = true;
    try {
      reportRuntimeError(err, 'minigame');
      const game = activeMinigame;
      const name = game && minigameInfo(game).name ? minigameInfo(game).name : 'ミニゲーム';
      retireMinigame();
      setMessage(`⚠️${name}がうまく動かなかったので、途中で終わりにした。今回の得点は記録されないよ`);
      render();
    } catch (e2) {
      // ここで さらに こけても ゲームぜんたいは とめない
      try { closeMinigameScreen(); } catch (e3) { /* ignore */ }
    } finally {
      mgCrashHandling = false;
    }
  }
  function mgTagNow() {
    return mgCodeDepth > 0 ? mgCodeSession : 0;
  }
  function mgTagAlive(tag) {
    return tag === 0 || tag === mgSession;
  }
  const nativeRequestAnimationFrame = typeof window.requestAnimationFrame === 'function' ? window.requestAnimationFrame.bind(window) : null;
  const nativeSetTimeout = typeof window.setTimeout === 'function' ? window.setTimeout.bind(window) : null;
  if (nativeRequestAnimationFrame) {
    window.requestAnimationFrame = function (cb) {
      const tag = mgTagNow();
      if (!tag || typeof cb !== 'function') return nativeRequestAnimationFrame(cb);
      return nativeRequestAnimationFrame((t) => {
        if (!mgTagAlive(tag)) return;
        mgPerfSample();
        mgRunTagged(tag, cb, null, [t]);
      });
    };
  }
  if (nativeSetTimeout) {
    window.setTimeout = function (cb, delay, ...args) {
      const tag = mgTagNow();
      if (!tag || typeof cb !== 'function') return nativeSetTimeout(cb, delay, ...args);
      return nativeSetTimeout(() => {
        if (!mgTagAlive(tag)) return;
        mgRunTagged(tag, cb, null, args);
      }, delay);
    };
  }
  // overlay の なかで おきた DOM イベント(タップ/ドラッグ/キー)の ハンドラも
  // 「ゲームの コード」あつかいに する。document の capture で 入り、
  // window の bubble で 出る(stopPropagation された ばあいの ほけんとして
  // つぎの タスクでも かならず 出る)
  const MG_EVENT_TYPES = ['pointerdown', 'pointerup', 'pointermove', 'pointercancel', 'click', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'mousedown', 'mouseup', 'mousemove', 'keydown', 'keyup'];
  let mgEventSaved = null;
  let mgEventResetTimer = null;
  function mgEventEnter(event) {
    if (!mgSession || mgEventSaved) return;
    mgEventSaved = { depth: mgCodeDepth, session: mgCodeSession, event };
    mgCodeDepth += 1;
    mgCodeSession = mgSession;
    if (nativeSetTimeout) mgEventResetTimer = nativeSetTimeout(() => mgEventLeave(event), 0);
  }
  function mgEventLeave(event) {
    // 合成pointerイベントが入れ子になっても、外側の入力の記録を消さない。
    if (!mgEventSaved || mgEventSaved.event !== event) return;
    mgCodeDepth = mgEventSaved.depth;
    mgCodeSession = mgEventSaved.session;
    mgEventSaved = null;
    if (mgEventResetTimer != null) { clearTimeout(mgEventResetTimer); mgEventResetTimer = null; }
  }
  for (const type of MG_EVENT_TYPES) {
    document.addEventListener(type, mgEventEnter, true);
    window.addEventListener(type, mgEventLeave, false);
  }

  function closeMinigameScreen() {
    const endedSession = mgSession;
    gameActive = false;
    mgSession = 0;
    // 解除ハンドラーが予約する処理も、終了したゲームに所属させる。
    mgRunTagged(endedSession, resetMinigameInput, null, []);
    activeMinigame = null;
    hideMinigameQuit();
    el.minigameOverlay.classList.add('hidden');
    el.minigameOverlay.innerHTML = '';
    el.screenNormal.classList.remove('hidden');
  }

  // 「ゲームを やめる」: てんすう なし・ごほうび なし・ばつ なし。げんきだけ
  // すこし つかう(あそびはじめた ぶん)。じこベストも うごかない
  function retireMinigame() {
    if (!gameActive) return;
    // finishMinigame() と おなじく、ふつうの がめんの タイマーに ゲームの
    // しるしが つかない ように「ゲームの コードの そと」で 処理する
    const savedDepth = mgCodeDepth;
    mgCodeDepth = 0;
    try {
      retireMinigameInner();
    } finally {
      mgCodeDepth = savedDepth;
    }
  }

  function retireMinigameInner() {
    const game = activeMinigame;
    activeMinigameDaily = false;
    closeMinigameScreen();
    audio.play('close');
    state.energy = clamp(state.energy - 6, 0, 100);
    state.happiness = clamp(state.happiness + 2, 0, 100);
    let message = 'むりせず途中でやめた。また今度ちょうせん!';
    if (pendingCompanionId) {
      const companion = allCompanionsById(pendingCompanionId);
      pendingCompanionId = null;
      if (companion) message = `${companion.name}とのあそびは途中でおわり。また今度さそってみよう`;
    }
    if (game && minigameInfo(game).name) message = `${minigameInfo(game).emoji} ${message}`;
    setMessage(message);
    emotePet('happy');
    checkMeters();
    saveState();
    render();
  }

  let mgQuitConfirmTimer = null;
  function showMinigameQuit() {
    if (!el.mgQuit) return;
    el.mgQuit.classList.remove('hidden');
    setMinigameQuitConfirm(false);
  }
  function hideMinigameQuit() {
    if (!el.mgQuit) return;
    el.mgQuit.classList.add('hidden');
    setMinigameQuitConfirm(false);
  }
  function setMinigameQuitConfirm(open) {
    if (!el.mgQuitConfirm) return;
    el.mgQuitConfirm.classList.toggle('hidden', !open);
    el.mgQuitBtn.classList.toggle('hidden', open);
    clearTimeout(mgQuitConfirmTimer);
    // おしまちがい むけ: なにも しなければ 4びょうで もとの ボタンに もどる
    if (open) mgQuitConfirmTimer = setTimeout(() => setMinigameQuitConfirm(false), 4000);
  }
  if (el.mgQuitBtn) {
    el.mgQuitBtn.addEventListener('click', () => { if (gameActive) setMinigameQuitConfirm(true); });
    el.mgQuitNoBtn.addEventListener('click', () => setMinigameQuitConfirm(false));
    el.mgQuitYesBtn.addEventListener('click', () => retireMinigame());
  }

  function finishMinigame(score, customMessage) {
    const game = activeMinigame;
    // ここから さきの ふつうの がめんの タイマー(えもーと/ふきだし など)に
    // ゲームの セッションの しるしが つかない よう、いったん「ゲームの
    // コードの そと」に 出る(finally で もとに もどす ので、この あとに
    // つづく ゲームがわの コードが 予約した ものは ちゃんと すてられる)
    const savedDepth = mgCodeDepth;
    mgCodeDepth = 0;
    try {
      finishMinigameInner(game, score, customMessage);
    } finally {
      mgCodeDepth = savedDepth;
    }
  }

  function finishMinigameInner(game, score, customMessage) {
    const careBefore = CARE_STATUS?.snapshot(state);
    // じこベスト/ランクは アイテムの ボーナスを のせる まえの てんすうで
    const record = recordMinigameResult(game, score);
    // サングラスを そうびしていると、ミニゲームの とくてんに ボーナスが つく。
    // つかいきりアイテムの「やる気の おまもり/大成功の おまもり」は、この
    // ミニゲーム 1かいだけ とくてんを おおきく 底上げする(大成功の おまもりは
    // +100で どんな スコアからでも かならず 大成功あつかいに なる)
    const glassesBonus = isEquipped('glasses') ? 6 : 0;
    const minigameBoostBonus = state.oneTimeBoosts.minigameBoost === 'big' ? 100 : state.oneTimeBoosts.minigameBoost === 'small' ? 25 : 0;
    state.oneTimeBoosts.minigameBoost = null;
    const clampedScore = clamp(score + glassesBonus + minigameBoostBonus, 0, 100);
    const happinessGain = Math.round(5 + (clampedScore / 100) * 20);
    state.happiness = clamp(state.happiness + happinessGain, 0, 100);
    state.energy = clamp(state.energy - Math.round(12 * envModifiers().play), 0, 100);
    state.minigameScoreSum += clampedScore;
    state.minigameCount += 1;
    state.lifetime.minigamesPlayed += 1;
    // fills regardless of score - unlike evo/devo, playing itself (not
    // skill) is what earns a shot at choosing a different growth line。
    // シルクハットを そうびしていると たまりやすさに ボーナスが つく
    const hatBonus = isEquipped('hat') ? 4 : 0;
    state.transformMeter = clamp(state.transformMeter + (15 + hatBonus) * (hasPerk(60) ? 1.2 : 1), 0, 100);

    // good play pushes the evolution meter, a real miss pushes both the
    // devolution and death meters - this is the main engine behind the
    // fast-paced transform/regress/die loop, not just the passive clock
    let itemMessage = '';
    const isGreat = clampedScore >= 70;
    const isBad = clampedScore < 40;
    if (isGreat) {
      applyGrowth(14); applyDecline(-8);
      const fun = randomFunItem();
      state.items[fun.id] = (state.items[fun.id] || 0) + 1;
      const gotReward = Math.random() < (isEquipped('itemluck1') ? 0.16 : 0.12);
      if (gotReward) state.items.reward = (state.items.reward || 0) + 1;
      // スターバッジを そうびしていると、もらえる おかねが 4わり ふえる。
      // つかいきりアイテムの「ラッキーコイン」は、この ミニゲーム 1かいだけ
      // もらえる おかねを 2ばいにする
      const starFactor = isEquipped('star') ? 1.25 : 1;
      const coinBoost = state.oneTimeBoosts.doubleCoins ? 2 : 1;
      state.oneTimeBoosts.doubleCoins = false;
      const coins = Math.round((5 + Math.random() * 6) * starFactor * coinBoost * envModifiers().coin);
      state.lifetime.money += coins;
      itemMessage = gotReward ? `おたのしみに${fun.emoji}${fun.label}、さらに🎁と💰${coins}をもらった!` : `おたのしみに${fun.emoji}${fun.label}と💰${coins}をもらった!`;
    } else if (clampedScore >= 40) {
      applyGrowth(7); applyDecline(-3);
    } else if (state.oneTimeBoosts.safetyNet) {
      // つかいきりアイテムの「スコアほけん」は、この ミニゲーム 1かいだけ
      // しっぱい時の たいか/しぼうメーター上昇を まるごと なかった ことにする
      state.oneTimeBoosts.safetyNet = false;
    } else {
      applyDecline(16);
      raiseDeathMeter(5);
    }

    let resultMessage = (customMessage || resultMessageForScore(score)) + itemMessage;
    // きょうの チャレンジ: きょうの スコアを きろくし、💰+10 と れんぞく日数
    if (activeMinigameDaily && record) {
      activeMinigameDaily = false;
      const key = dailyKey();
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const streak = state.lifetime.dailyLastDate === dailyKey(yesterday) ? (state.lifetime.dailyStreak || 0) + 1 : 1;
      state.lifetime.dailyChallenge = { date: key, gameId: game ? game.id : null, score: record.score, rank: record.rank };
      state.lifetime.dailyStreak = streak; state.lifetime.dailyLastDate = key;
      const reward = dailyStreakReward(streak);
      state.lifetime.money += reward.coins;
      grantGrowthBoost(BOOST_TICKS_DAILY);
      resultMessage += `／🗓️今日のチャレンジクリア!／💰+${reward.coins}／✨せいちょう2ばい(10分)${streak >= 2 ? `／🔥${streak}日連続` : ''}${reward.milestone ? `／🎉${reward.milestone}` : ''}`;
    }
    if (record && record.rank === 'S' && !activeMinigameDaily) {
      grantGrowthBoost(BOOST_TICKS_S_RANK);
      resultMessage += '／✨Sランク!せいちょう2ばいを2分追加（合計10分まで）';
    }
    if (isGreat) speakEvent('minigame_great', { partnerChance: 0.5, companionChance: 0.6 });
    else if (isBad) speakEvent('minigame_bad', { partnerChance: 0.45, companionChance: 0.5 });
    let recruitedNow = false;

    // なかまイベントの さいちゅうだった プレイなら、つうじょうの けっか
    // メッセージを なかまに なれたか どうかの けっかに おきかえる(ステータス
    // への こうかは ふつうの ミニゲームと まったく おなじ)
    if (pendingCompanionId) {
      const companion = allCompanionsById(pendingCompanionId);
      pendingCompanionId = null;
      if (companion) {
        const isRare = RARE_COMPANIONS.some((c) => c.id === companion.id);
        const threshold = isRare ? RARE_COMPANION_RECRUIT_THRESHOLD : COMPANION_RECRUIT_THRESHOLD;
        if (clampedScore >= threshold) {
          const record = isRare
            ? state.lifetime.rareCompanionsRecruited
            : state.lifetime.companionsRecruited;
          if (!record.includes(companion.id)) record.push(companion.id);
          if (state.lifetime.companionFriendshipProgress) {
            delete state.lifetime.companionFriendshipProgress[companion.id];
          }
          if (!state.companions.some((c) => c.id === companion.id)) {
            state.companions.push({ id: companion.id, bond: 100 });
          }
          pushLifeLog(companion.emoji, `${companion.name}がなかまになった`);
          recruitedNow = true;
          resultMessage = isRare
            ? `${companion.emoji} ${companion.joined}`
            : `${companion.emoji} ${companion.name}がなかまになった!`;
        } else {
          resultMessage = isRare
            ? `${companion.name}とはまだなかよくなれなかった…レアなかまは${RARE_COMPANION_RECRUIT_THRESHOLD}点以上でなかまになれる`
            : `${companion.name}とはまだなかよくなれなかった…${COMPANION_RECRUIT_THRESHOLD}点以上でなかまになれる`;
        }
      }
    }

    setMessage(resultMessage);

    closeMinigameScreen();
    showMinigameResultToast(record);
    audio.play(record && (record.rank === 'S' || record.rank === 'A') ? 'fanfare' : record && record.rank === 'D' ? 'fail' : 'clear');

    // checkStoryEvents() no-ops while gameActive, so this must run after
    // gameActive flips back to false above
    if (isGreat) checkStoryEvents('minigame-great');
    else if (isBad) checkStoryEvents('minigame-bad');

    emotePet(recruitedNow ? 'fun' : isGreat ? 'fun' : isBad ? 'sad' : 'happy');
    checkMeters();
    saveState();
    recordCareChange(careBefore);
    render();
  }

  // opts.intro: はじめて あそぶ ゲームの まえに そうさの せつめいを 出す(「あそぶ」/
  // ゲームきろく からの みちすじ = tryStartPlay だけ。テストや ハーネスからの
  // ちょくせつの startMinigame() は すぐ はじまる)
  function startMinigame(game, opts = {}) {
    gameActive = true;
    castMotion?.clear();
    el.device.classList.add('ui-game-active');
    el.menuBtn.disabled = true;
    el.profileBtn.disabled = true;
    el.commBtn.disabled = true;
    // render() も おなじ じょうけんで これを セットしなおすが、つぎの
    // render() が よばれるまでの わずかな あいだも きせつの ぜんけい
    // エフェクトが えきしょうの てまえに のこらないよう、ここで すぐに とめる
    el.seasonFrontFx.classList.add('suppressed');
    if (el.weatherFx) el.weatherFx.classList.add('suppressed');
    if (el.timeTint) el.timeTint.classList.add('suppressed');
    // 直前の「そうじリアクション」のような ストーリーいベント バナー(.story-flash)
    // には じぶんの ひょうじ時間(STORY_FLASH_DURATION_MS)ぶんの タイマーが
    // あり、ミニゲームが はじまっても かってには きえない - ミニゲームの
    // タイトル/せつめい文(.mg-title など、がめん じょうぶ)と おなじ いちに
    // 重なって かくれてしまう ことが あった ので、ミニゲームが はじまる
    // しゅんかんに かならず とじる ようにする
    clearTimeout(storyFlashTimer);
    el.storyFlash.classList.add('hidden');
    el.screenNormal.classList.add('hidden');
    el.minigameOverlay.classList.remove('hidden');
    el.minigameOverlay.innerHTML = '';
    el.feedBtn.disabled = true;
    el.playBtn.disabled = true;
    el.cleanBtn.disabled = true;
    el.sleepBtn.disabled = true;
    el.medicineBtn.disabled = true;
    el.playWithBtn.disabled = true;
    el.courtBtn.disabled = true;
    el.travelBtn.disabled = true;
    el.dexBtn.disabled = true;
    el.achBtn.disabled = true;
    el.themeBtn.disabled = true;
    el.itemBtn.disabled = true;
    mgSessionSerial += 1;
    const session = mgSessionSerial;
    mgSession = session;
    activeMinigame = game;
    activeMinigameDaily = dailyPending; dailyPending = false;
    showMinigameQuit();
    // ゲームがわから おくれて/2かい よばれても、その セッションが もう
    // おわっていれば なにも しない
    const onComplete = (result, message) => {
      if (session !== mgSession || !gameActive) return;
      finishMinigame(result, message);
    };
    const launch = () => {
      if (session !== mgSession || !gameActive) return;
      el.minigameOverlay.innerHTML = '';
      mgRunTagged(session, () => game.start(el.minigameOverlay, onComplete), null, []);
    };
    // はじめて あそぶ ゲームは、うごきだす まえに そうさの せつめいを 1まい 出す
    if (opts.intro) renderMinigameIntro(game, launch);
    else launch();
  }

  // 「はじめて」= じこベストが なく、あそんだ かいすうが この1かい だけ
  function isFirstMinigamePlay(game) {
    return !!game.id && !minigameRecordOf(game) && minigamePlayCount(game) <= 1;
  }

  function renderMinigameIntro(game, onStart) {
    const info = minigameInfo(game);
    const controls = MINIGAME_CONTROLS[game.id] || '';
    const genre = MINIGAME_GENRES.find((x) => x.id === minigameGenreId(game));
    el.minigameOverlay.innerHTML = `
      <div class="mg-intro">
        <div class="mg-intro-badge">✨はじめてのゲーム</div>
        <div class="mg-intro-emoji">${info.emoji}</div>
        <div class="mg-intro-name">${info.name}</div>
        <div class="mg-intro-genre">${genre ? `${genre.emoji} ${genre.label}` : ''}</div>
        <div class="mg-intro-desc">${info.desc}</div>
        <div class="mg-intro-controls"><div class="mg-intro-controls-title">🕹️ そうさ</div>${controls}</div>
        <button type="button" class="mg-tap-btn primary mg-intro-start" id="mgIntroStart" data-key="action">▶ はじめる</button>
        <div class="mg-intro-note">次からはすぐはじまるよ</div>
      </div>`;
    const btn = el.minigameOverlay.querySelector('#mgIntroStart');
    let started = false;
    const go = (e) => { if (e && e.preventDefault) e.preventDefault(); if (started) return; started = true; onStart(); };
    btn.addEventListener('pointerdown', go);
    btn.addEventListener('click', go);
  }

  let sleepRecoveryTimer = null;

  function stopSleepRecovery() {
    if (sleepRecoveryTimer) {
      clearInterval(sleepRecoveryTimer);
      sleepRecoveryTimer = null;
    }
  }

  // recoverSleepStep → render → startSleepRecovery → recoverSleepStep の
  // さいきよびだしを ふせぐ(以前は これで「ねる」の しゅんかんに いっきに
  // かいふくして いた)
  let sleepStepBusy = false;
  function recoverSleepStep() {
    if (sleepStepBusy) return;
    if (!state.isSleeping || !isLiveLife()) {
      stopSleepRecovery();
      return;
    }
    sleepStepBusy = true;
    try { recoverSleepStepInner(); } finally { sleepStepBusy = false; }
  }
  function recoverSleepStepInner() {
    // 100ms ごと。0→100 が やく 17びょう(はやすぎると げんきの 意味が なくなり、
    // おそすぎると あそびに もどれない。その あいだの はやさ)
    const boost = isEquipped('sleepboost1') ? 0.12 : 0;
    const step = ((state.isSick ? 0.38 : 0.6) + boost) * envModifiers().sleep;
    const before = state.energy;
    state.energy = clamp(state.energy + step, 0, 100);
    if (state.energy !== before) render();
    if (state.energy >= 100) stopSleepRecovery();
  }

  function startSleepRecovery() {
    stopSleepRecovery();
    if (!state.isSleeping) return;
    // 「ねる」を押したその場で最初の回復を1回入れ、その後100msごとに
    // なめらかに回復し続ける。最初の100ms待ちをなくして反応を即時にする。
    if (state.isSleeping && state.energy < 100) {
      sleepRecoveryTimer = setInterval(recoverSleepStep, 100);
    }
    recoverSleepStep();
  }

  const ACTION_RESULT_MESSAGES = {
    "feed": [
      "🍚ごちそうさま!",
      "🍚おなかがみたされた",
      "🍚いいにおいだった!",
      "🍚ぺろっとたべた",
      "🍚おさらが空になった",
      "🍚おなかから小さな拍手",
      "🍚最後のひとくちまでぺろり",
      "🍚食べ終わってからおいしさが来た",
      "🍚ごはんの余韻でぼんやり",
      "🍚くちの中においしさが居残り"
    ],
    "clean": [
      "🧹きれいになった!",
      "🧹さっぱりした!",
      "🧹ピカピカになった!",
      "🧹これでよし!",
      "🧹床がよく見える",
      "🧹ほこりはお引っ越し",
      "🧹なくし物が少し戻った",
      "🧹ほうきもひと休み",
      "🧹片づけた場所を確認中",
      "🧹きれいなまま少し眺めた"
    ],
    "sleep": [
      "🌙すやすや…",
      "🌙ねむりについた",
      "🌙おやすみモード",
      "🌙もうねてる…",
      "🌙返事は夢のなかで",
      "🌙枕に用事を預けた",
      "🌙まぶたが先に帰った",
      "🌙寝る向きだけ決めた",
      "🌙あくびの途中でねた",
      "🌙続きは起きてから"
    ],
    "wake": [
      "☀️おはよう!",
      "☀️目がさめた!",
      "☀️よくねた!",
      "☀️さて、なにしよう",
      "☀️夢の入口を閉めてきた",
      "☀️まぶたと交渉が終わった",
      "☀️寝ぐせも一緒に起きた",
      "☀️おはようの声が少し寝てる",
      "☀️枕にはあいさつ済み",
      "☀️中身がゆっくり起きてくる"
    ],
    "cure": [
      "💊げんきがもどった!",
      "💊なおった!",
      "💊もうだいじょうぶそう",
      "💊ちょっとらくになった",
      "💊苦さだけ居残りしてる",
      "💊安心してひと息ついた",
      "💊おくすりのふたを閉めた",
      "💊苦い顔が少し残った",
      "💊元気な声がもどった",
      "💊看病のあとの休憩タイム"
    ]
  };

  const ACTION_BLOCKED_MESSAGES = {
    "cleanAlready": [
      "🧹まだきれいだよ",
      "🧹そうじするところ、いまはなさそう",
      "🧹床を見た。うん、まだだいじょうぶ",
      "🧹ほうきを持ったけど、出番はなかった",
      "🧹ほうきの出番はまだ先",
      "🧹片づいてる。今日は見守ろう"
    ],
    "sleepingFeed": [
      "💤ねてる。ごはんはあとで",
      "💤いま起こすのはかわいそうかも",
      "💤ごはんのにおいにもまだ起きない",
      "💤ごはんは起きてから待ってる",
      "💤夢のなかでは食べてるかも"
    ],
    "sleepingPlay": [
      "💤ぐっすり。あそぶのは起きてから",
      "💤いまは夢のなかであそんでるかも",
      "💤起きるまでちょっと待とう",
      "💤夢の中の集合場所にいるらしい",
      "💤足だけ少し動いた。まだ夢の中"
    ],
    "lowEnergyPlay": [
      "😮‍💨いまはちょっとつかれてる",
      "😮‍💨あそぶ前にすこし休みたいみたい",
      "😮‍💨いま走ったらたぶんすぐ座りこむ",
      "😮‍💨遊ぶ予定より休憩が先みたい",
      "😮‍💨座る場所を探している"
    ],
    "sleepingPet": [
      "💤ぐっすりねている",
      "💤じゃれるのは起きてからにしよう",
      "💤いまはそっとしておこう",
      "💤呼びかけの返事はあくびだった",
      "💤ふとんからねいきだけ聞こえる"
    ],
    "sleepingCourt": [
      "💤ねている。気持ちは起きてからつたえよう",
      "💤いま告白してもたぶん聞いてない",
      "💤起きたらちゃんとはなそう",
      "💤ねごとを返事にするのはやめよう",
      "💤伝えたいことは起きてから"
    ],
    "sleepingTravel": [
      "💤ねている。旅は起きてから",
      "💤このまま連れていくのはさすがにむり",
      "💤まず起こしてから出かけよう",
      "💤荷物をまとめてもまだ夢の中",
      "💤出発の相談は起きてから"
    ]
  };

  function randomBlockedMessage(key) {
    const pool = ACTION_BLOCKED_MESSAGES[key] || [];
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : '';
  }

  function randomActionMessage(key) {
    const pool = ACTION_RESULT_MESSAGES[key] || [];
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : '';
  }

  // ================================================================
  // おと: こうかおん(SFX)と BGM。おとの ファイルは つかわず、WebAudio で
  // その場で つくる(オシレーター + ノイズ)。ブラウザの きまりで、さいしょの
  // タップ/キーまでは ならせない ので、さいしょの そうさで「かいじょう」する。
  // BGM は 場面(ふつうの がめん / よる / ミニゲーム / デートムービー /
  // おわかれ)ごとに べつの きょくを ループし、場面が かわると ふわっと きりかわる。
  // せっていは state.lifetime.soundSfx / soundBgm(せかい がめん)
  // ================================================================
  // おと(効果音/BGM)は audio.js。場面を きめる じょうたいは getter で わたす
  const audio = installNaotocchiAudio({
    nativeSetTimeout: typeof nativeSetTimeout === 'function' ? nativeSetTimeout : null,
    getState: () => state,
    STAGE,
    el,
    isGameActive: () => gameActive,
    getActiveMinigame: () => activeMinigame,
    minigameGenreId: (game) => minigameGenreId(game),
    isDateOpen: () => dateOpen,
  });
  function audioSettingsChanged() { audio.settingsChanged(); }

  // ミニゲームの ヒント文(say())の かわりめを 見て、なかみに あわせた
  // こうかおんを ならす。100本の ゲームを 1本ずつ なおさずに すむ 共通の しかけ
  (() => {
    if (typeof MutationObserver !== 'function' || !el.minigameOverlay) return;
    let lastText = '', lastAt = 0;
    const GOOD = /🎉|✨|ゲット|パーフェクト|ストライク|スペア|ホームラン|せいこう|クリア|ボーナス|れんぞく|\+\d|たべた|とった|いい|おいしい|もぐもぐ|のびた|くぐった|まんなか|ふんだ|かった|せいかい/;
    const BAD = /💥|💫|💦|💀|😣|😵|🔥|ガター|ミス|ぶつかった|クラッシュ|こげ|なま|つかまった|おちた|しっぱい|やられた|ざんねん|アウト/;
    const START = /スタート/;
    const obs = new MutationObserver(() => {
      if (!gameActive) return;
      const hint = el.minigameOverlay.querySelector('.mg-hint');
      if (!hint) return;
      const text = (hint.textContent || '').trim();
      if (!text || text === lastText) return;
      lastText = text;
      const now = performance.now();
      if (now - lastAt < 120) return;
      lastAt = now;
      if (text.length > 60) return; // せつめい文は ならさない
      if (START.test(text)) audio.play('start');
      else if (/🎉/.test(text)) audio.play('clear');
      else if (BAD.test(text)) audio.play('bad');
      else if (GOOD.test(text)) audio.play('good');
    });
    obs.observe(el.minigameOverlay, { childList: true, subtree: true, characterData: true });
  })();
  // ボタンの タップおん(ミニゲームの ボタンも ふくむ)。おしっぱなしの
  // れんだは 1かいだけ
  document.addEventListener('pointerdown', (e) => {
    const btn = e.target && e.target.closest ? e.target.closest('button') : null;
    if (!btn || btn.disabled) return;
    audio.play('tap');
  }, true);

  function withFeedback(fn, afterRender) {
    return () => {
      clearConversationTimers();
      hideSpeechBubble();
      const careBefore = CARE_STATUS?.snapshot(state);
      const result = fn();
      saveState();
      recordCareChange(careBefore);
      render();
      // クリア後の挨拶は、保存時の実績通知で消えないよう最後に表示する。
      if (afterRender) afterRender(result);
    };
  }

  el.feedBtn.addEventListener('click', withFeedback(() => {
    if (state.isSleeping) {
      setMessage(randomBlockedMessage('sleepingFeed'));
      return;
    }
    const overfed = state.hunger >= 80;
    state.hunger = clamp(state.hunger + 25, 0, 100);
    state.actionCounts.feed += 1;
    state.affectionStreak = 0;
    state.travelStreak = 0;
    if (overfed) {
      // spamming ごはん when the pet is already full doesn't help evolution -
      // it risks making it sick instead
      state.happiness = clamp(state.happiness - 4, 0, 100);
      applyDecline(4);
      if (!state.isSick && Math.random() < 0.15) {
        const sickness = SICKNESS_TYPES[Math.floor(Math.random() * SICKNESS_TYPES.length)];
        state.isSick = true;
        state.sicknessType = sickness.label;
        state.totalSicknessCount += 1;
        raiseDeathMeter(2);
        setMessage(`🍚たべすぎて${sickness.label}になった`);
        speakEvent('overfeed');
      } else {
        setMessage('🍚たべすぎた');
        speakEvent('overfeed');
      }
      checkStoryEvents('overfeed');
      checkMeters();
      emotePet('angry');
      return;
    }
    state.happiness = clamp(state.happiness + 3, 0, 100);
    applyGrowth(4); applyDecline(-4);
    if (!checkMeters()) {
      setMessage(randomActionMessage('feed'));
      speakEvent('feed');
      checkStoryEvents('feed');
    }
    emotePet('happy');
  }));


  // ミニゲームの ボタン おしっぱなし/キーボード そうさ(うえの 入力レイヤー
  // さんしょう)。overlay に 1かいだけ とりつける
  el.minigameOverlay.addEventListener('pointerdown', (e) => {
    if (e.mgSynthetic) return;
    const btn = e.target && e.target.closest ? e.target.closest('button[data-hold]') : null;
    if (btn && !btn.disabled) mgStartHold(btn, e);
  }, true);
  document.addEventListener('pointerup', () => mgStopHold());
  document.addEventListener('pointercancel', () => mgStopHold());
  const MG_KEY_MAP = {
    ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down',
    ' ': 'action', Enter: 'action', z: 'action', x: 'action2', Shift: 'action2',
  };
  const MG_KEY_GLYPHS = { left: '◀', right: '▶', up: '▲', down: '▼' };
  function mgFindKeyButton(key) {
    const root = el.minigameOverlay;
    let btn = root.querySelector('button[data-key="' + key + '"]');
    if (!btn && MG_KEY_GLYPHS[key]) {
      const glyph = MG_KEY_GLYPHS[key];
      btn = [...root.querySelectorAll('button')].find((b) => {
        const t = (b.textContent || '').trim();
        return t.startsWith(glyph) || t.endsWith(glyph);
      }) || null;
    }
    return btn && !btn.disabled ? btn : null;
  }
  document.addEventListener('keydown', (e) => {
    if (!gameActive || el.minigameOverlay.classList.contains('hidden')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setMinigameQuitConfirm(el.mgQuitConfirm && el.mgQuitConfirm.classList.contains('hidden'));
      return;
    }
    const key = MG_KEY_MAP[e.key];
    if (!key) return;
    e.preventDefault();
    if (mgKeysDown.has(e.key)) return;
    const btn = mgFindKeyButton(key);
    if (!btn) return;
    mgKeysDown.set(e.key, btn);
    mgDispatchPointer(btn, 'pointerdown');
    if (btn.dataset.hold) { const ev = { pointerId: null }; mgStartHold(btn, ev); }
  });
  document.addEventListener('keyup', (e) => {
    const btn = mgKeysDown.get(e.key);
    if (!btn) return;
    mgKeysDown.delete(e.key);
    mgDispatchPointer(btn, 'pointerup');
    mgStopHold(btn);
  });

  // 「あそぶ」ボタン(ランダム)と「ゲームきろく」からの えらんで あそぶ の
  // 共通いりぐち。chosenGame が あれば その ゲームを、なければ 抽選する。
  // えらんで あそんだ ときも プレイ回数・直前ゲーム・ジャンルの きろくは
  // ランダムの ときと おなじように のこす(未プレイ優遇の もとデータ)
  function tryStartPlay(chosenGame) {
    if (gameActive) return false;
    if (state.isSleeping) {
      setMessage(randomBlockedMessage('sleepingPlay'));
      saveState();
      render();
      return false;
    }
    if (el.playBtn.disabled) return false;
    if (state.energy < 10) {
      setMessage(randomBlockedMessage('lowEnergyPlay'));
      saveState();
      render();
      return false;
    }
    state.actionCounts.play += 1;
    state.affectionStreak = 0;
    state.travelStreak = 0;
    recordEnvironmentPlay();
    let game;
    if (chosenGame) {
      game = chosenGame;
      lastMinigame = game;
      recordMinigamePlay(game);
      recentMinigameCategories.push(minigameCategoryOf.get(game));
      if (recentMinigameCategories.length > 4) recentMinigameCategories.shift();
    } else {
      game = pickRandomMinigame();
    }
    startMinigame(game, { intro: isFirstMinigamePlay(game) });
    return true;
  }

  el.playBtn.addEventListener('click', () => { tryStartPlay(null); });

  el.cleanBtn.addEventListener('click', withFeedback(() => {
    if (state.poopCount === 0) {
      setMessage(randomBlockedMessage('cleanAlready'));
      return;
    }
    state.poopCount = 0;
    state.happiness = clamp(state.happiness + 5, 0, 100);
    state.actionCounts.clean += 1;
    state.affectionStreak = 0;
    state.travelStreak = 0;
    applyGrowth(4); applyDecline(-5);
    checkStoryEvents('poop-clean');
    if (!checkMeters()) {
      setMessage(randomActionMessage('clean'));
      speakEvent('clean');
    }
    emotePet('happy');
  }));

  el.sleepBtn.addEventListener('click', withFeedback(() => {
    state.isSleeping = !state.isSleeping;
    audio.play(state.isSleeping ? 'sleep' : 'wake');
    state.affectionStreak = 0;
    state.travelStreak = 0;
    if (state.isSleeping) {
      state.actionCounts.sleep += 1;
      state.sleptTicks = 0;
      // 回復は専用タイマーで連続して行う。最初の1ステップも押した瞬間に
      // 入るので見た目の待ち時間はない。成長ボーナスは十分な睡眠時間を
      // とった場合だけなので、寝る/起きる連打で得をすることはない
      setMessage(randomActionMessage('sleep'));
      speakEvent('sleep');
      startSleepRecovery();
      return;
    }
    // すいみんは「20tick いじょう ねてから おきた」ときだけ みとめる
    // (ねる→おきるの 連打で かせげてしまう ぬけみちを ふさぐ)
    stopSleepRecovery();
    if (state.sleptTicks >= 20) { applyGrowth(3); applyDecline(-3); }
    state.sleptTicks = 0;
    if (!checkMeters()) {
      setMessage(randomActionMessage('wake'));
      speakEvent('wake');
      checkStoryEvents('wake');
    }
    emotePet('happy');
  }));

  el.medicineBtn.addEventListener('click', withFeedback(() => {
    state.actionCounts.medicine += 1;
    state.affectionStreak = 0;
    state.travelStreak = 0;
    if (state.isSick) {
      state.isSick = false;
      state.sicknessType = null;
      state.health = clamp(state.health + 20, 0, 100);
      state.energy = clamp(state.energy - 10, 0, 100);
      applyGrowth(8); applyDecline(-12);
      recordSicknessCure();
      checkStoryEvents('medicine-cure');
      if (!checkMeters()) {
        setMessage(randomActionMessage('cure'));
        speakEvent('medicine_cure');
      }
      emotePet('happy');
    } else {
      state.happiness = clamp(state.happiness - 10, 0, 100);
      state.health = clamp(state.health - 5, 0, 100);
      applyDecline(10);
      if (!checkMeters()) {
        setMessage('💊びょうきではないのに、くすりを飲ませた');
        speakEvent('medicine_wrong');
      }
      emotePet('angry');
    }
  }));

  // じゃれる(もとの なでる/はなしかけるを ひとつに まとめたボタン)は
  // deliberately low-stakes: a tiny boost (or none at all) so it can't
  // replace ごはん/あそぶ as an evolution grind, just a way to check in on
  // the pet between the "real" actions。なでる/はなしかけるの りょうほうの
  // こうかを あわせて 1タップで うけられる ぶん、actionCounts は りょうほう
  // 積みあげる(なでなで まめ/おしゃべりずき の じっせきは そのまま つかえる)
  function warmEgg() {
    if (state.stage !== STAGE.EGG) return false;
    applyGrowth(4);
    eggVisualReaction = { life:state, kind:state.stage === STAGE.EGG ? 'warm' : 'hatch' };
    if (state.stage === STAGE.EGG) {
      const pct = Math.min(100, Math.round((state.growth / HATCH_GROWTH) * 100));
      const response = pct >= 80 ? 'ひびがひろがった。もうすぐ会えそう' : pct >= 40 ? '小さなひびがはいった。中でもぞもぞ' : '中でもぞもぞうごいている';
      setMessage(`たまごをあたためた…${response} ${pct}%`);
    }
    return true;
  }

  // 卵そのものをタップしても温められる。卵状態で「全部押せない」ように
  // 見えないよう、画面中央にも明確な操作を用意する。
  el.petArea.addEventListener('click', (e) => {
    if (state.stage !== STAGE.EGG) return;
    if (e.target.closest('button')) return;
    warmEgg();
    saveState();
    render();
  });

  el.playWithBtn.addEventListener('click', withFeedback(() => {
    // たまごの あいだは「あたためる」あつかい。せいちょうが たまると かえる
    if (warmEgg()) return;
    if (state.isSleeping) {
      setMessage(randomBlockedMessage('sleepingPet'));
      return;
    }
    state.affectionStreak += 1;
    state.travelStreak = 0;
    state.actionCounts.pet += 1;
    state.actionCounts.talk += 1;
    const spammed = state.affectionStreak > affectionSpamThreshold();
    if (spammed) {
      state.happiness = clamp(state.happiness - 5, 0, 100);
      applyDecline(6);
    } else {
      state.happiness = clamp(state.happiness + 5, 0, 100);
      applyGrowth(1.5); applyDecline(-2);
      // じゃれるは、そばに いる なかま ぜんいんの bond も まとめて かいふく
      // する(なかまが はなれて いかないよう、ここで つなぎとめる)
      state.companions.forEach((c) => {
        c.bond = clamp((c.bond ?? 100) + COMPANION_PLAYWITH_BOND_BOOST + (hasPerk(40) ? state.sodachi / 5 : 0), 0, 100);
      });
    }
    const hasCompanions = state.companions.length > 0;
    const reaction = spammed
      ? pickReaction([...CONVERSATION_POOLS.play_with_annoyed.pet, ...PET_ANNOYED_REACTIONS, ...TALK_ANNOYED_REACTIONS, ...(hasCompanions ? COMPANION_ANNOYED_REACTIONS : [])], lastPlayWithReaction)
      : pickReaction([...CONVERSATION_POOLS.play_with.pet, ...PET_REACTIONS, ...TALK_REACTIONS, ...(hasCompanions ? [...COMPANION_PET_REACTIONS, ...COMPANION_TALK_REACTIONS] : [])], lastPlayWithReaction);
    lastPlayWithReaction = reaction;
    if (!checkMeters()) {
      // 日常の「じゃれる」は客観ナレーションを出さず、会話だけで見せる。
      // 状態変化の事実通知が必要な場面だけ setMessage() を使う。
      setMessage('');
      speakEvent(spammed ? 'play_with_annoyed' : 'play_with', { petText: reaction, partnerChance: 0.45, companionChance: 0.8 });
      if (!spammed) checkStoryEvents('pet');
    }
    emotePet(spammed ? 'angry' : 'happy');
  }));

  const PARTNER_FIRST_ENCOUNTERS = {
    cat_ceo: ['🏙️ビルの前で、ねこが電話をしながら急いでいる。','🐈‍⬛「……5ふんだけならあいてる」'],
    robot_neighbor: ['🤖ロボットがこちらをじっとみている。','🤖「コレハ……キョウミ、デスカ？」'],
    field_cow: ['🐄野原でうしが、草を一本差しだしてきた。','🐄「たべる？」'],
    sunflower_partner: ['🌻ひまわりがこちらを向いた。太陽は別の方向だ。','🌻「太陽には、ないしょね」'],
    forest_bear: ['🐻木のうしろから大きなクマがこちらを見ている。','🐻「通る?ちょっとよけるね」'],
    grove_deer: ['🦌シカと目があった。すぐにげた。','🦌でも少し先でまたこっちを見ている。'],
    cliff_goat: ['🐐見上げても頂上がわからない崖に、ヤギがいる。','🐐「こっちくる？」'],
    high_eagle: ['🦅頭のうえを大きな影がとおった。','🦅ワシが少しだけこちらを見た。'],
    snow_spirit: ['❄️雪のなかにひとつだけとけない光がある。','❄️「さむくない？」'],
    snowman: ['☃️さっきまでなかった雪だるまがある。','☃️「……いま気づいた?」'],
    rock_octopus: ['🐙岩場から8本の手がいっせいに手をふった。','🐙「どれであいさつする？」'],
    sea_mermaid: ['🧜波のむこうからだれかが陸をじっと見ている。','🧜「そこ、どんなところ？」'],
    anglerfish: ['🐟まっくらな海で小さな光だけが近づいてくる。','🐟「まぶしくないここ、すき」'],
    swamp_croc: ['🐊水面に目だけがふたつ。','🐊「……べつにまってない」'],
    gentle_gorilla: ['🦍道ばたに大きなゴリラがいる。','🦍そっと花をどけて道をあけてくれた。'],
    knitting_spider: ['🕷️木のあいだにきれいな糸の模様がある。','🕷️「ほどかないでね。まだとちゅう」'],
    desert_scorpion: ['🦂日かげがひとつしかない。サソリが少しよけた。','🦂「……ここ、あいてる」'],
    oasis_cactus: ['🌵オアシスのそばにひときわ立派なサボテンがいる。','🌵「話すなら、このくらいの距離で」'],
  };

  function playFirstPartnerEncounter(candidate) {
    if (!state.lifetime.partnerEncounters) state.lifetime.partnerEncounters = [];
    if (state.lifetime.partnerEncounters.includes(candidate.id)) return false;
    state.lifetime.partnerEncounters.push(candidate.id);
    const beats = PARTNER_FIRST_ENCOUNTERS[candidate.id] || [
      `${candidate.emoji} ${candidate.label}とはじめて目があった。`,
      'なんとなく、また会う気がした。',
    ];
    showStoryEvent({ emoji: candidate.emoji, character:candidate, message: beats[0] });
    beats.slice(1).filter(Boolean).forEach((text, index) => {
      conversationTimers.push(setTimeout(() => showStoryEvent({ emoji: candidate.emoji, character:candidate, message: text }), (index + 1) * STORY_FLASH_DURATION_MS));
    });
    pushLifeLog(candidate.emoji, `${candidate.label}とはじめてであった`);
    state.happiness = clamp(state.happiness + 3, 0, 100);
    saveState();
    return true;
  }

  // すでに こいびとが いる ときは あたらしい あいてを さがしにいかず、
  // 今の こいびとと いちゃつく だけ(せいこう/しっぱいの 抽選なし) -
  // 一生のあいだ 1にん だけの、じみに おだやかな 恋愛システム
  el.courtBtn.addEventListener('click', withFeedback(() => {
    if (state.isSleeping) {
      setMessage(randomBlockedMessage('sleepingCourt'));
      return;
    }
    state.affectionStreak = 0;
    state.travelStreak = 0;
    // きゅうあい・いちゃつきは からだを つかう ので、けっかに かかわらず
    // 元気を すこし けずる - 何度でも おせない ように するための コスト
    state.energy = clamp(state.energy - 6, 0, 100);

    // クエスチョニングちゅうは、こいびとの ゆうむに かかわらず「きゅうあい」を
    // おすたびに けいけんが つみあがり、しきい値に とどくと その回だけは
    // つうじょうの きゅうあい/いちゃつきの けっかの かわりに、じぶんの
    // れんあいタイプが おちついた ことを つたえる とくべつな メッセージに なる
    const resolvedOrientation = checkQuestioningResolution();
    if (resolvedOrientation) {
      state.happiness = clamp(state.happiness + 5, 0, 100);
      if (!checkMeters()) {
        const mismatchNote = state.partner && state.partner.mismatched
          ? ` ${state.partner.label}とは、恋愛の向きがちがうことにも気づいた。`
          : '';
        setMessage(`じぶんの気持ちが少しはっきりした。「${orientationLabel(resolvedOrientation, state.gender)}」なんだと思う。${mismatchNote}`);
      }
      emotePet('fun');
      return;
    }

    if (state.partner && state.partner.mismatched) {
      // すれちがい中は、けっこんへは すすまない かわりに、きゅうあいが
      // まるごと「なかなおりの どりょく」に なる。MISMATCH_REPAIR_NEEDED かい
      // かさねれば、れんあいタイプが ちがっても いっしょに いる ことに きめられる
      const p = state.partner;
      p.affection = clamp((p.affection ?? 100) + PARTNER_FLIRT_AFFECTION_BOOST, 0, 100);
      p.repair = (p.repair || 0) + 1;
      state.happiness = clamp(state.happiness + 2, 0, 100);
      if (p.repair >= MISMATCH_REPAIR_NEEDED) {
        p.mismatched = false;
        p.repair = 0;
        applyGrowth(12); applyDecline(-15);
        pushLifeLog('💞', `${p.label}となかなおりした`);
        if (!checkMeters()) {
          setMessage(`${p.emoji} ${p.label}とちゃんと話した。恋愛タイプは変わったけれど、それでもいっしょにいることにした`);
        }
        emotePet('love');
        return;
      }
      const left = MISMATCH_REPAIR_NEEDED - p.repair;
      if (!checkMeters()) {
        setMessage(`${p.emoji} ${p.label}とぎこちなく話した…あと${left}回向きあえば、きっと伝わる`);
      }
      emotePet('sad');
      return;
    }

    if (state.partner) {
      state.happiness = clamp(state.happiness + 3, 0, 100);
      // いちゃつくたびに なかよし度が かいふくし、じゅうぶん つみかさなると
      // こいびとから 夫婦に しんてんする(すでに 夫婦なら なにも おきない)
      const justMarried = reinforceRelationship();
      if (justMarried) {
        applyGrowth(30); applyDecline(-20);
        pushLifeLog('💍', `${state.partner.label}とけっこんした`);
        if (state.partner.id !== 'guest' && !state.lifetime.partnersMarried.includes(state.partner.id)) {
          state.lifetime.partnersMarried.push(state.partner.id);
        }
        if (!checkMeters()) {
          setMessage(`💍 ${state.partner.label}とけっこんした`);
          speakEvent('marriage', { partnerChance: 1, companionChance: 0.65 });
        }
        emotePet('love');
        return;
      }
      const reaction = pickReaction([...CONVERSATION_POOLS.court.pet, ...courtFlirtReactions(state.partner.label)], lastCourtReaction);
      lastCourtReaction = reaction;
      if (!checkMeters()) {
        // 恋人への日常的ないちゃつきは、客観説明を重ねず会話だけで見せる。
        setMessage('');
        speakEvent('court', { petText: reaction, partnerChance: 0.9, companionChance: 0.35 });
        checkStoryEvents('court');
      }
      emotePet('love');
      return;
    }

    // あいては いま いる地域(state.regionId)にいる キャラに くわえて、
    // 「あいてコード」で よみこんだ おきゃくさんが いれば その人も
    // こうほに はいる - 旅先ごとに ちがう あいてと であえるうえ、
    // ともだちの なおとっちにも どこからでも きゅうあいを ためせる。
    // おきゃくさんは じっさいの ともだちの なおとっちなので、地域の
    // きめうちキャラ2人と おなじ かくりつで うもれてしまわないよう、
    // いる ときは 6わり多めの かくりつで 優先的に えらぶ
    // とくべつな たびさき(SPECIAL_REGIONS)には こいびとこうほが いない ので、
    // candidates が からの ことが ある。あいてが いない ときは しっぱいでは なく
    // 「ひとりの じかん」として かるく かえす(ここを まもらないと undefined に なる)
    const regionCandidates = findRegion(state.regionId).candidates || [];
    let candidate;
    if (state.guest && Math.random() < 0.6) {
      candidate = guestCandidate(state.guest);
    } else if (regionCandidates.length) {
      candidate = regionCandidates[Math.floor(Math.random() * regionCandidates.length)];
    }
    if (!candidate) {
      state.happiness = clamp(state.happiness + 2, 0, 100);
      if (!checkMeters()) {
        setMessage('💞いまは気持ちをつたえたいあいてがいない');
        speakEvent('court_fail', { partnerChance: 0, companionChance: 0.35 });
      }
      emotePet('happy');
      return;
    }

    // 地域固有の恋人は、初回は「出会う」だけ。次に会ったときから求愛できる。
    // これで地域を旅する理由と、知り合ってから恋へ進む一段階を作る。
    if (candidate.id !== 'guest' && playFirstPartnerEncounter(candidate)) {
      setMessage(`${candidate.emoji} ${candidate.label}としりあった。また会えそうだ`);
      emotePet('fun');
      render();
      return;
    }

    // まず おたがいの れんあい対象に あいてが ふくまれているか(双方向)を
    // たしかめる。せいべつ/しゅぞくを こえた 恋愛は なんでも ありだが、
    // れんあいタイプが あわない ときだけは、しっぱい あつかいでは なく
    // 「友達なら いいよ」くらいの かるい リアクションに とどめる
    const mutualMatch = candidate.attractedTo.includes(state.gender) && state.attractedTo.includes(candidate.gender);
    if (!mutualMatch) {
      state.happiness = clamp(state.happiness + 2, 0, 100);
      const reaction = pickReaction(COURT_FRIEND_REACTIONS, lastCourtReaction);
      lastCourtReaction = reaction;
      if (!checkMeters()) {
        setMessage(`${candidate.emoji} ${candidate.label}:${reaction}`);
      }
      emotePet('happy');
      return;
    }

    // れんあいタイプが あってさえいれば、あとは せいかく(traitCounts)の
    // あいしょうと、いまの きげんで せいこう率が すこし かわる - まいかい
    // かならず せいこうする ゲームバランス崩壊を さけつつ、お世話を
    // がんばっているほど とおりやすくは なる
    const traitBonus = candidate.affinityTrait ? Math.min(0.3, state.traitCounts[candidate.affinityTrait] * 0.03) : 0.1;
    const happinessBonus = (state.happiness / 100) * 0.15;
    // おはなを そうびしていると、きゅうあいの せいこうりつに ボーナスが つく
    const flowerBonus = isEquipped('flower') ? 0.1 : 0;
    // そだち50の「こいの きざし」で +10%、さらに いまの そだちに おうじて 最大+20%
    const sodachiBonus = (hasPerk(50) ? 0.1 : 0) + (hasPerk(50) ? Math.min(0.2, state.sodachi / 500) : 0);
    const successChance = clamp(0.35 + traitBonus + happinessBonus + flowerBonus + sodachiBonus, 0.15, 0.85);

    if (Math.random() < successChance) {
      state.partner = {
        id: candidate.id,
        label: candidate.label,
        emoji: candidate.emoji,
        gender: candidate.gender,
        orientationId: candidate.orientationId,
        attractedTo: [...candidate.attractedTo],
        affinityTrait: candidate.affinityTrait,
        affection: 100,
        married: false,
        bondCount: 0,
      };
      state.happiness = clamp(state.happiness + 8, 0, 100);
      applyGrowth(10); applyDecline(-5);
      pushLifeLog('💑', `${candidate.label}とこいびとになった`);
      // おきゃくさんと こいびとに なれたら、その しゅぞく・すがたを
      // 「ずかん」にも きねんに 記録する(じぶんで そだてていなくても)
      if (candidate.id === 'guest' && state.guest) {
        recordDiscoveryKey(`${state.guest.speciesLine}:${state.guest.stageIndex}`);
      } else if (!state.lifetime.partnersRecorded.includes(candidate.id)) {
        // あいてコード いがいの、地域ごとの きめうちキャラは しゅぞくの
        // ずかんに のらない ぶん、こちらの「こいびと」せんよう ずかんに
        // きねんに 記録する(「はじめから」しても きえない永続コレクション)
        state.lifetime.partnersRecorded.push(candidate.id);
      }
      const reaction = pickReaction([...CONVERSATION_POOLS.partner_new.pet, ...COURT_SUCCESS_REACTIONS], lastCourtReaction);
      lastCourtReaction = reaction;
      if (!checkMeters()) {
        setMessage(`💑 ${candidate.label}とこいびとになった`);
        speakEvent('partner_new', { petText: reaction, partnerChance: 0.95, companionChance: 0.5 });
      }
      emotePet('love');
    } else {
      state.happiness = clamp(state.happiness - 3, 0, 100);
      applyDecline(2);
      const reaction = pickReaction([...CONVERSATION_POOLS.court_fail.pet, ...COURT_FAIL_REACTIONS], lastCourtReaction);
      lastCourtReaction = reaction;
      if (!checkMeters()) {
        setMessage('💞気持ちはつたえた。返事は「もう少し友達でいたい」だった');
        speakEvent('court_fail', { petText: reaction, partnerChance: 0, companionChance: 0.45 });
      }
      emotePet('sad');
    }
  }));

  el.menuBtn.addEventListener('click', () => openExclusiveMenu('menu'));
  el.menuCloseBtn.addEventListener('click', () => { menuOpen = false; render(); });
  el.worldBtn.addEventListener('click', () => openExclusiveMenu('world'));
  el.gamesBtn.addEventListener('click', () => { achTab = 'games'; openExclusiveMenu('ach'); });
  el.travelBtn.addEventListener('click', () => openExclusiveMenu('travel'));
  el.worldCloseBtn.addEventListener('click', () => { worldOpen = false; render(); });
  el.travelCloseBtn.addEventListener('click', () => { closeAllMenuOverlays(); render(); });
  el.seasonModeGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-swatch');
    if (btn) selectSeasonMode(btn.dataset.id);
  });
  el.timeModeGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-swatch');
    if (btn && TIME_CHOICES[btn.dataset.id]) { state.lifetime.timeMode = btn.dataset.id; saveState(); renderEnvironment(); }
  });
  if (el.difficultyModeGrid) {
    if (el.gameLengthGrid) el.gameLengthGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.theme-swatch');
      if (!btn || !GAME_LENGTH_CHOICES[btn.dataset.id]) return;
      state.lifetime.minigameLength = btn.dataset.id; saveState(); renderEnvironment();
      setMessage(btn.dataset.id === 'short' ? '⚡ゲームを「みじかめ」にした（90秒以上の制限時間を60%にする）' : '⏱️ゲームのながさを「ふつう」にした');
    });
    el.difficultyModeGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.theme-swatch');
      if (!btn || !DIFFICULTY_CHOICES[btn.dataset.id]) return;
      state.lifetime.minigameDifficulty = btn.dataset.id; saveState(); renderEnvironment();
      setMessage(btn.dataset.id === 'easy' ? '🌱ミニゲームをやさしくした(時間も長め)' : btn.dataset.id === 'hard' ? '🔥ミニゲームをむずかしくした' : '🙂ミニゲームをふつうにした');
    });
  }
  if (el.sfxModeGrid) {
    el.sfxModeGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.theme-swatch');
      if (!btn || !SFX_CHOICES[btn.dataset.id]) return;
      state.lifetime.soundSfx = btn.dataset.id === 'on'; saveState(); renderEnvironment();
      audioSettingsChanged();
    });
  }
  if (el.bgmModeGrid) {
    el.bgmModeGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.theme-swatch');
      if (!btn || !BGM_CHOICES[btn.dataset.id]) return;
      state.lifetime.soundBgm = btn.dataset.id === 'on'; saveState(); renderEnvironment();
      audioSettingsChanged();
    });
  }
  el.weatherModeGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-swatch');
    if (!btn || !WEATHER_CHOICES[btn.dataset.id]) return;
    state.lifetime.weatherMode = btn.dataset.id; saveState(); renderEnvironment();
    if (btn.dataset.id === 'auto') requestEnvironment();
  });
  el.locationRefreshBtn.addEventListener('click', requestEnvironment);
  el.currentLocationBtn.addEventListener('click', async () => {
    const intent = ++currentLocationIntent;
    const info = await requestEnvironment();
    if (intent !== currentLocationIntent || !travelOpen || !info?.municipality) return;
    if (state.isSleeping) { setMessage(randomBlockedMessage('sleepingTravel')); render(); return; }
    if (state.stage === STAGE.EGG || state.stage === STAGE.DEAD || state.transformOptions || gameActive) return;
    // The real municipality labels the home region; it is never invented as a
    // new biome or allowed to unlock special regions/region achievements.
    if (state.regionId !== 'home') travelToRegion(findRegion('home'));
    else closeAllMenuOverlays();
    state.lifetime.currentLocationSelected = true;
    saveState(); render();
  });
  el.designScreenTab.addEventListener('click', () => selectDesignPanel('screen'));
  el.designDeviceTab.addEventListener('click', () => selectDesignPanel('device'));
  el.fontSelect.addEventListener('change', () => {
    if (!['rounded','standard','retro'].includes(el.fontSelect.value)) return;
    state.lifetime.fontStyle = el.fontSelect.value; saveState(); render();
  });
  el.textSizeSelect.addEventListener('change', () => {
    state.lifetime.textSize = el.textSizeSelect.value === 'large' ? 'large' : 'normal'; saveState(); render();
  });

  // えらんだ 地域へ じっさいに たびに でる。げんき/まんぷく/きげんの
  // 増減・たびづかれ判定・ずかん用の きろくなど、なかみは いぜんの
  // ランダム移動時と まったく おなじ ロジックで、行き先だけが
  // 「ランダムに えらばれた もの」から「タップで えらんだ もの」に かわった
  function travelToRegion(region) {
    if (!region) return;
    currentLocationIntent += 1;
    // たびの けっかは 「せかい」がめんの うえではなく、もとの 基本がめんの
    // メッセージらんに 出す ので、じっこうまえに がめんを とじておく。
    // どちらの ぶんき(ねている/じっさいに たびに でる)でも さいごに
    // かならず saveState()/render() まで とおるよう、はやい return は
    // つかわず if/else で くみたてる
    travelOpen = false;
    worldOpen = false;
    if (state.isSleeping) {
      setMessage(randomBlockedMessage('sleepingTravel'));
      saveState();
      render();
      return;
    }
    // そだち70に とどいていない ときに とくべつな たびさきへ いこうと
    // しても いけない(ボタンが 出ていない ときの ねんの ための まもり)
    if (region.special && !hasPerk(70)) {
      setMessage('地図をひらいたけれど、そのばしょへつづく道はまだ見つからない');
      saveState();
      render();
      return;
    }
    state.lifetime.currentLocationSelected = false;
    const specialRewardTrip = (state.items.reward || 0) > 0 && window.confirm('🎁ごほうびを1こ使って、とくべつな旅にしますか？');
    if (specialRewardTrip) { state.items.reward -= 1; if (state.items.reward <= 0) delete state.items.reward; }
    state.affectionStreak = 0;
    state.travelStreak += 1;
    // TRAVEL_SPAM_THRESHOLD を こえて 連続で たびに でると「たびづかれ」で
    // 機嫌の ボーナスが なくなり、逆に すこし へってしまう。つかいきり
    // アイテムの「たびの おまもり」を もっていれば、この たび 1かいだけ
    // かならず「たびづかれ」なしの よい けっかに なる
    const travelGuaranteed = state.oneTimeBoosts.travelGuarantee;
    state.oneTimeBoosts.travelGuarantee = false;
    const spammedTravel = !travelGuaranteed && state.travelStreak > travelSpamThreshold();
    // とくべつな たびさきは、regionsVisited では なく specialRegionsVisited に
    // つむ。regionsVisited に いれて しまうと、じっせきの「せかい いっしゅう
    // (ぜんぶの地域(REGIONS の 11))」が「ふつうの地域7つ + とくべつ1つ」でも 成立して
    // しまい、じょうけんの いみが かわって しまう
    const isSpecial = !!region.special;
    // ずっと まえの セーブから きた ばあいでも undefined に ならない よう、
    // ここで かならず はいれつが ある ことを たしかめておく
    if (!state.lifetime.specialRegionsVisited) state.lifetime.specialRegionsVisited = [];
    const visitedList = isSpecial ? state.lifetime.specialRegionsVisited : state.lifetime.regionsVisited;
    const firstVisit = !visitedList.includes(region.id);
    state.regionId = region.id;
    // じっせきの「せかい いっしゅう」用に、いちど でも おとずれた ことの
    // ある地域を えいきゅうに きろくしておく(「はじめから」しても きえない)
    if (firstVisit) {
      visitedList.push(region.id);
      pushLifeLog(region.emoji, isSpecial ? `${region.label}にたどりついた` : `はじめて${region.label}にいった`);
    }
    // たびは からだを つかう ので、元気/満腹が すこし へる(移動で つかれ、
    // ごはんの タイミングも のがす)
    state.energy = clamp(state.energy - 6, 0, 100);
    state.hunger = clamp(state.hunger - 4, 0, 100);
    if (spammedTravel) {
      state.happiness = clamp(state.happiness - 3, 0, 100);
      applyDecline(5);
    } else {
      applyGrowth(firstVisit ? (isSpecial ? 12 : 6) : (isSpecial ? 4 : 2));
      applyDecline(-2);
      // リュックサックけいの アイテムを そうびしていると、たびの きげん
      // ボーナスが 上乗せされる
      const travelBonus = isEquipped('travel1') ? 2 : 0;
      // そだち70(たびだち)に とうたつしていると、たびの きげんボーナスが 2ばいに なる
      state.happiness = clamp(state.happiness + (5 + travelBonus) * (hasPerk(70) ? 2 : 1), 0, 100);
    }
    let reaction = pickReaction(region.lines, lastTravelReaction);
    lastTravelReaction = reaction;
    speakEvent('travel', { partnerChance: 0.7, companionChance: 0.75 });
    checkStoryEvents('travel');
    if (hasNaotoItem('naoto_lantern') && Math.random() < 0.18) reaction += ' 🏮道の先に、不思議なあかりがひとつ見えた。';
    if (!checkMeters()) {
      if (specialRewardTrip) {
        pushLifeLog('🎁', `とくべつな旅のおもいで: ${region.label}`);
        setMessage(`🎁 ${region.emoji} ${region.label}で、いつもよりゆっくりすごした。${reaction}`);
      } else {
        setMessage(spammedTravel
          ? `${region.emoji} ${region.label}にやってきた!でも、旅の疲れでちょっとぐったり…${reaction}`
          : `${region.emoji} ${region.label}にやってきた!${reaction}`);
      }
    }
    emotePet(spammedTravel ? 'sad' : 'fun');
    saveState();
    render();
  }

  el.travelRegionGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-swatch');
    if (!btn || btn.disabled) return;
    travelToRegion(findRegion(btn.dataset.id));
  });

  // そだち70「たびだち」で ひらく とくべつな たびさき。いきさきの えらびかた
  // じたいは ふつうの地域と まったく おなじ(travelToRegion の なかで
  // とくべつ あつかいに わかれる)
  el.travelSpecialGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-swatch');
    if (!btn || btn.disabled) return;
    travelToRegion(findRegion(btn.dataset.id));
  });

  // そだち50「こいの きざし」の デート。「せかい」がめんの なかから さそう
  el.worldDateBtn.addEventListener('click', () => {
    openDateChooser();
  });

  el.dateChoiceGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.date-choice-btn');
    if (!btn) return;
    const plan = dateChoiceOptions.find((p) => p.id === btn.dataset.plan);
    if (plan) goOnDate(plan);
  });

  el.dateCancelBtn.addEventListener('click', () => {
    closeDateOverlay();
  });

  function confirmDateReward(useReward) {
    const plan = pendingDatePlan;
    if (!dateOpen || !plan) return;
    pendingDatePlan = null;
    goOnDate(plan, useReward);
  }

  function returnToDateChoices() {
    if (!dateOpen || !pendingDatePlan) return;
    pendingDatePlan = null;
    el.dateRewardConfirm.classList.add('hidden');
    el.dateChooser.classList.remove('hidden');
    render();
    el.dateCancelBtn.focus({ preventScroll: true });
    el.dateChooser.scrollIntoView({ block: 'nearest' });
  }

  el.dateRewardUseBtn.addEventListener('click', () => confirmDateReward(true));
  el.dateRewardSkipBtn.addEventListener('click', () => confirmDateReward(false));
  el.dateRewardBackBtn.addEventListener('click', returnToDateChoices);
  el.dateRewardConfirm.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      returnToDateChoices();
    }
  });

  el.dateMovieSkipBtn.addEventListener('click', () => {
    finishDateMovie();
  });

  el.dateMovieCloseBtn.addEventListener('click', () => {
    closeDateOverlay();
  });

  // なかまからの さそい: 「あそぶ!」で ミニゲームへ、「また こんど」で
  // ことわる(ことわっても その なかまとは また いつか であえる)
  el.companionInvitePlayBtn.addEventListener('click', () => {
    const companion = allCompanionsById(pendingCompanionId);
    closeCompanionInvite();
    if (!companion) { pendingCompanionId = null; render(); return; }
    const stillOk = !gameActive && state.stage === STAGE.GROWING && !state.isSleeping && !state.transformOptions;
    if (!stillOk) {
      pendingCompanionId = null;
      setMessage('いまはあそべなかった…またこんどさそってもらおう');
      saveState();
      render();
      return;
    }
    startMinigame(pickRandomMinigame());
  });

  el.companionInviteLaterBtn.addEventListener('click', withFeedback(() => {
    const companion = allCompanionsById(pendingCompanionId);
    pendingCompanionId = null;
    closeCompanionInvite();
    setMessage(companion
      ? `${companion.emoji} ${companion.name}は「またこんどね」とかえっていった`
      : 'またこんどあそぼう');
    emotePet('happy');
  }));

  // ゴールバッジ(①〜⑤の しるし)は、ならんでいる だけでは なんの 絵文字か
  // わからない ので、タップで なんの しるしかを 出す
  el.endingBadges.addEventListener('click', (e) => {
    const badge = e.target.closest('.ending-badge');
    if (!badge) return;
    clearTimeout(endingBadgeTipTimer);
    el.endingBadgeTip.textContent = badge.dataset.title || '';
    el.endingBadgeTip.classList.remove('hidden');
    endingBadgeTipTimer = setTimeout(() => el.endingBadgeTip.classList.add('hidden'), 2600);
  });

  // さいごの じかん → 人生記録カード
  el.farewellBtn.addEventListener('click', withFeedback(() => {
    showLifeCard();
  }));

  // 人生記録カード → あたらしい たまご
  el.lifeCardNextBtn.addEventListener('click', withFeedback(() => {
    el.lifeCardOverlay.classList.add('hidden');
    el.resetBtn.click();
  }));

  // ================================================================
  // 「はじめから」と「完全リセット」- はっきり べつの きのうに する
  // ================================================================
  // 「あたらしい たまごを むかえる」: いまの子だけ リセット。ずかん・じっせき・
  // おかね・アイテム・おもいでは のこる(せっていがめんから いつでも おせる)
  el.softResetBtn.addEventListener('click', withFeedback(() => {
    themeOpen = false;
    el.resetBtn.click();
  }));

  // 「ぜんぶ さいしょから やりなおす」: localStorage ごと けす。
  // 2だんかいの かくにん + 3びょうの ながおし で ごそうさを ふせぐ
  el.wipeBtn.addEventListener('click', () => {
    const L = state.lifetime;
    const dexTotal = ALL_LINES.length * STAGES_PER_LINE;
    el.wipeSummary.innerHTML = [
      `ずかん<b>${state.discoveredStages.length} / ${dexTotal}</b>`,
      `じっせき<b>${state.achievementsUnlocked.length} / ${ACHIEVEMENTS.length}</b>`,
      `おかね<b>💰${L.money}</b>`,
      `そうび<b>${(L.ownedShopItems || []).length}こ</b>`,
      `これまでそだてたこ<b>${(L.pastLives || []).length}ひき</b>`,
    ].map((t) => `<div>${t}</div>`).join('');
    el.wipeOverlay.classList.remove('hidden');
  });
  function cancelWipePrompt() {
    el.wipeOverlay.classList.add('hidden');
    el.wipeBtn.focus({ preventScroll: true });
  }
  function cancelWipeConfirmation() {
    cancelWipeHold();
    el.wipeConfirmOverlay.classList.add('hidden');
    el.wipeBtn.focus({ preventScroll: true });
  }
  el.wipeCancelBtn.addEventListener('click', cancelWipePrompt);
  el.wipeNextBtn.addEventListener('click', () => {
    el.wipeOverlay.classList.add('hidden');
    el.wipeConfirmOverlay.classList.remove('hidden');
  });
  el.wipeConfirmCancelBtn.addEventListener('click', cancelWipeConfirmation);

  const WIPE_HOLD_MS = 3000;
  let wipeHoldTimer = null;
  let wipeHoldStart = 0;
  let wipeHoldRaf = null;
  function cancelWipeHold() {
    clearTimeout(wipeHoldTimer);
    cancelAnimationFrame(wipeHoldRaf);
    wipeHoldTimer = null;
    el.wipeHoldFill.style.width = '0%';
  }
  function startWipeHold(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (wipeHoldTimer) return;
    wipeHoldStart = Date.now();
    const step = () => {
      const p = Math.min(1, (Date.now() - wipeHoldStart) / WIPE_HOLD_MS);
      el.wipeHoldFill.style.width = `${p * 100}%`;
      if (p < 1) wipeHoldRaf = requestAnimationFrame(step);
    };
    step();
    wipeHoldTimer = setTimeout(() => {
      cancelWipeHold();
      doWipe();
    }, WIPE_HOLD_MS);
  }
  ['mousedown', 'touchstart'].forEach((t) => el.wipeHoldBtn.addEventListener(t, startWipeHold));
  ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach((t) => el.wipeHoldBtn.addEventListener(t, cancelWipeHold));

  function doWipe() {
    for (const key of [SAVE_KEY, SAVE_BACKUP_KEY, SAVE_SNAP_KEY]) {
      try { localStorage.removeItem(key); } catch (e) { /* storage unavailable */ }
    }
    lastGoodSaveRaw = null;
    stateLoadRecovered = false;
    saveWriteBlocked = false;
    state = freshState();
    el.wipeConfirmOverlay.classList.add('hidden');
    themeOpen = false;
    dexOpen = false;
    achOpen = false;
    itemOpen = false;
    setMessage('ぜんぶきえました。はじめまして!');
    saveState();
    render();
  }

  // ♾️ の せかいへ(パーフェクトクリアずみの ときだけ ボタンが 出る)
  el.infiniteBtn.addEventListener('click', withFeedback(() => {
    if (state.infinite) exitInfinite();
    else enterInfinite();
  }));

  el.resetBtn.addEventListener('click', withFeedback(() => {
    // 図鑑 and じっせき are cross-playthrough records, so they survive a
    // reset even though every other stat starts over from scratch
    const discoveredStages = state.discoveredStages;
    // この子の いっしょうを ようやく 1行に して 歴代に のこす。
    // ♾️ の せかいは「1つの 人生」では ない ので、そこからは この ボタンに
    // たどりつかない(♾️ の あいだ resetBtn は かくれている)が、ねんの ため
    if (state.stage !== STAGE.EGG && !state.infinite) archiveLifeAndReset();
    const lifetime = state.lifetime;
    // 古いセーブデータには resets フィールドが無いので || 0 で補う
    lifetime.resets = (lifetime.resets || 0) + 1;
    const achievementsUnlocked = state.achievementsUnlocked;
    state = freshState();
    state.declineBaseline = lifetime.devolutions;
    state.discoveredStages = discoveredStages;
    state.lifetime = lifetime;
    state.achievementsUnlocked = achievementsUnlocked;
    // あたらしい たまごは、なかまも こいびとも いない まっさらな じょうたいで
    // スタートする(state.companions/state.partner は freshState() の
    // まま [] / null)。ずかん・じっせき用の えいきゅう記録(lifetime.
    // companionsRecruited/partnersRecorded/partnersMarried)は べつに
    // のこるので、これまで であった なかま/こいびとの コレクションじたいは
    // きえないが、つぎの いっしょうでは また いちから であいなおす ひつようが ある
    clearTimeout(storyFlashTimer);
    el.storyFlash.classList.add('hidden');
    endingCelebrationShown = false;
    el.gameClearOverlay.querySelectorAll('.ending-particle').forEach((p) => p.remove());
    el.gameClearOverlay.classList.remove('tier-1', 'tier-2', 'tier-3');
    setMessage('あたらしいたまごがやってきた…');
  }));

  el.gameClearCloseBtn.addEventListener('click', withFeedback(() => {
    const goal = grandGoalPending;
    grandGoalPending = null;
    return goal;
  }, (goal) => {
    if (goal === 'dex' || goal === 'perfect') showAuthorGreeting(goal);
  }));

  el.gameClearFreePlayBtn.addEventListener('click', withFeedback(() => {
    const goal = grandGoalPending;
    grandGoalPending = null;
    // ⑤ パーフェクトクリアの ごほうび: ねんれいから じゆうに なった
    // ♾️ の せかいへ はいる(enterInfinite() さんしょう)
    enterInfinite();
    return goal;
  }, (goal) => {
    if (goal === 'perfect') showAuthorGreeting(goal);
  }));

  el.dexBtn.addEventListener('click', () => openExclusiveMenu('dex'));

  el.dexCloseBtn.addEventListener('click', () => {
    dexOpen = false;
    dexDetail = null;
    render();
  });

  // ⑤ パーフェクトクリア後の ♾️ の せかいでだけ、ずかんで であった(known)
  // すがたを タップすると すぐ その すがたに なれる。ここが ゆいいつ
  // 「ねんれいと みためを きりはなす」ところで、ねんれいは ♾️ の まま
  // かえない。しゅぞくだけでなく、せいべつ・れんあいタイプ・せいかく傾向も
  // まるごと 新しい こせいとして ロールしなおす
  el.dexGrid.addEventListener('click', (e) => {
    const cell = e.target.closest('.dex-cell.known');
    if (!cell) return;
    openDexDetail(cell.dataset.line, Number(cell.dataset.stage));
  });

  el.dexDetailCloseBtn.addEventListener('click', () => {
    dexDetail = null;
    render();
  });

  // ♾️ の せかい(パーフェクトクリア後)だけの とくてん。ここでは ねんれいと
  // みため を きりはなす - ねんれいは ♾️ の まま かえない
  el.dexDetailTransformBtn.addEventListener('click', () => {
    if (!state.infinite || !dexDetail) return;
    const { line, stageIndex } = dexDetail;
    const stage = SPECIES[line] && SPECIES[line].stages[stageIndex];
    if (!stage) return;
    dexDetail = null;
    state.speciesLine = line;
    state.infiniteForm = { line, stageIndex };
    const breakupMessage = rerollIdentityAndBreakupIfNeeded(line);
    setMessage(`${stage.emoji} ${stage.label}にすがたをかえた!${breakupMessage}`);
    emotePet(breakupMessage ? 'sad' : 'happy');
    saveState();
    render();
  });

  el.achBtn.addEventListener('click', () => { achTab = 'ach'; openExclusiveMenu('ach'); });

  el.achCloseBtn.addEventListener('click', () => {
    achOpen = false;
    render();
  });
  if (el.achTabs) {
    el.achTabs.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('.ach-tab') : null;
      if (!btn || !btn.dataset.tab) return;
      achTab = btn.dataset.tab;
      render();
    });
  }
  if (el.gameListGrid) {
    el.gameListGrid.addEventListener('click', (e) => {
      const sortBtn = e.target && e.target.closest ? e.target.closest('.game-list-sort') : null;
      if (sortBtn) { gameListSort = sortBtn.dataset.sort; renderGameList(); return; }
      const dailyBtn = e.target && e.target.closest ? e.target.closest('.daily-start') : null;
      const cell = e.target && e.target.closest ? e.target.closest('.game-cell') : null;
      if (!cell && !dailyBtn) return;
      const game = buildMinigamePool().find((g) => g.id === (dailyBtn ? dailyBtn.dataset.gameId : cell.dataset.gameId));
      if (dailyBtn) { if (dailyChallengeToday()) return; dailyPending = true; }
      if (!game) return;
      // いちらんを とじてから はじめる。あそべない ときは ふつうの がめんに
      // りゆうの メッセージが 出る(ねている/げんき不足 など)
      closeAllMenuOverlays();
      clearConversationTimers();
      hideSpeechBubble();
      render();
      if (!tryStartPlay(game)) dailyPending = false;
    });
  }

  el.themeBtn.addEventListener('click', () => openExclusiveMenu('theme'));

  el.themeCloseBtn.addEventListener('click', () => {
    themeOpen = false;
    render();
  });

  el.deviceThemeGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-swatch');
    if (!btn) return;
    selectTheme('device', btn.dataset.id);
  });

  el.screenThemeGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-swatch');
    if (!btn) return;
    selectTheme('screen', btn.dataset.id);
  });

  el.devicePatternGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-swatch');
    if (!btn) return;
    selectTheme('devicePattern', btn.dataset.id);
  });

  el.screenPatternGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-swatch');
    if (!btn) return;
    selectTheme('screenPattern', btn.dataset.id);
  });

  el.itemBtn.addEventListener('click', () => openExclusiveMenu('item'));

  el.itemCloseBtn.addEventListener('click', () => {
    itemOpen = false;
    pickerOpen = false;
    pickerItem = null;
    render();
  });

  el.shopItemGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.shop-item');
    if (!btn) return;
    buyOrEquipShopItem(btn.dataset.id);
  });
  if (el.onetimeItemGrid) el.onetimeItemGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.shop-item');
    if (!btn) return;
    useConsumableItem(btn.dataset.id);
  });

  el.naotoItemGrid.addEventListener('click', () => {
    // 達成報酬なので購入操作はない。
  });

  el.naotoGreetingBtn.addEventListener('click', withFeedback(() => {
    if (!isAuthorUnlocked()) return false;
    closeAllMenuOverlays();
    return true;
  }, (opened) => {
    if (opened) showAuthorGreeting();
  }));

  el.pickerGrid.addEventListener('click', (e) => {
    const cell = e.target.closest('[data-picker-value]');
    if (!cell) return;
    resolvePickerSelection(cell.dataset.pickerValue);
  });

  el.pickerCloseBtn.addEventListener('click', () => {
    closePicker();
  });

  // コードボックスの ないようを クリップボードに こぴーする(あいてコード・
  // うそつきしょうぶの どちらの コードにも つかう きょうつう ヘルパー)。
  // navigator.clipboard は https/localhost の みで つかえるため、file://
  // などの ひあんぜんな コンテキストでは textarea 選択+execCommand に
  // フォールバックする。せいこうしたら msgEl を いっしゅん 表示する
  function copyCodeToClipboard(text, sourceEl, msgEl) {
    if (!text) return;
    const showCopiedMsg = () => {
      if (!msgEl) return;
      msgEl.classList.remove('hidden');
      clearTimeout(copyCodeToClipboard.hideTimer);
      copyCodeToClipboard.hideTimer = setTimeout(() => msgEl.classList.add('hidden'), 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(showCopiedMsg).catch(() => {
        fallbackCopy(text, sourceEl, showCopiedMsg);
      });
    } else {
      fallbackCopy(text, sourceEl, showCopiedMsg);
    }
  }

  function fallbackCopy(text, sourceEl, onDone) {
    try {
      if (sourceEl && typeof sourceEl.select === 'function') {
        sourceEl.focus();
        sourceEl.select();
      } else {
        const temp = document.createElement('textarea');
        temp.value = text;
        temp.style.position = 'fixed';
        temp.style.opacity = '0';
        document.body.appendChild(temp);
        temp.focus();
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        onDone();
        return;
      }
      document.execCommand('copy');
      onDone();
    } catch (e) {
      // こぴーに しっぱいしても なにも おきない(手動で コードを えらんで
      // こぴーしてもらう しかない)ので、ここでは とくに エラー表示は しない
    }
  }

  el.profileBtn.addEventListener('click', () => openExclusiveMenu('profile'));

  el.profileCloseBtn.addEventListener('click', () => {
    profileOpen = false;
    render();
  });

  el.commBtn.addEventListener('click', () => {
    openExclusiveMenu('comm');
    el.codeError.classList.add('hidden');
  });

  el.commCloseBtn.addEventListener('click', () => {
    commOpen = false;
    render();
  });

  el.openDuelBtn.addEventListener('click', () => {
    dexOpen = false; achOpen = false; themeOpen = false; profileOpen = false;
    itemOpen = false; worldOpen = false; travelOpen = false; dateOpen = false;
    // うそつきしょうぶだけは「つうしん」の子画面なので、commOpen は残す。
    duelOpen = true;
    goToDuelStep(duelResumeStep());
    render();
  });

  el.makeCodeBtn.addEventListener('click', () => {
    if (!state.gender) return;
    el.myCodeBox.value = encodeGuestCode();
    el.myCodeBox.classList.remove('hidden');
    el.myCodeActions.classList.remove('hidden');
    el.myCodeBox.focus();
    el.myCodeBox.select();
  });

  // --- セーブの バックアップ: セーブ(JSON)を 'NTS1.' + base64 の コードに ---
  const SAVE_CODE_PREFIX = 'NTS1.';
  function encodeSaveCode(json) {
    const bytes = new TextEncoder().encode(json);
    let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return SAVE_CODE_PREFIX + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodeSaveCode(code) {
    const t = (code || '').trim();
    if (!t.startsWith(SAVE_CODE_PREFIX)) throw new Error('これはセーブコードではありません');
    let b64 = t.slice(SAVE_CODE_PREFIX.length).replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const bin = atob(b64); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || !parsed.lifetime || typeof parsed.stage !== 'string') throw new Error('セーブコードの中身が正しくありません');
    return json;
  }
  // --- じどうバックアップ(3世代) ---
  function readSaveSnaps() {
    try {
      const list = JSON.parse(localStorage.getItem(SAVE_SNAP_KEY) || '[]');
      return Array.isArray(list) ? list.filter((s) => s && typeof s.raw === 'string' && typeof s.at === 'number') : [];
    } catch (e) { return []; }
  }
  function writeSaveSnaps(list) {
    try { localStorage.setItem(SAVE_SNAP_KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  }
  // force=true は セーブコードの よみこみ/もどす の 直前に、いまの セーブを
  // かならず のこす ため(あとで「もどすのを やめる」が できる)
  function takeSaveSnapshot(raw, force = false) {
    if (!raw) return false;
    const snaps = readSaveSnaps();
    const now = Date.now();
    if (snaps.length && snaps[0].raw === raw) return force;
    if (!force && snaps.length && now - snaps[0].at < SAVE_SNAP_INTERVAL_MS) return false;
    snaps.unshift({ at: now, raw });
    while (snaps.length > SAVE_SNAP_MAX) snaps.pop();
    return writeSaveSnaps(snaps);
  }
  // 読めたセーブを必ず退避してから置き換える。壊れた primary を正常な backup に
  // 上書きせず、退避できないときは置き換えも止める。成功後は再読込まで自動保存を止める。
  function replaceSavedLife(raw) {
    if (saveLocked) return false;
    saveLocked = true;
    try {
      // 別タブが保存した新しい primary も退避。検証前の raw は backup には書かない。
      const previous = lastGoodSaveRaw ? [lastGoodSaveRaw, localStorage.getItem(SAVE_KEY)].filter(Boolean) :
        [localStorage.getItem(SAVE_KEY), localStorage.getItem(SAVE_BACKUP_KEY)].filter(Boolean);
      for (const saved of new Set(previous)) {
        if (!takeSaveSnapshot(saved, true)) throw new Error('Previous save could not be retained');
      }
      if (lastGoodSaveRaw) localStorage.setItem(SAVE_BACKUP_KEY, lastGoodSaveRaw);
      localStorage.setItem(SAVE_KEY, raw);
      return true;
    } catch (err) {
      saveLocked = false;
      return false;
    }
  }
  function describeSaveRaw(raw) {
    try {
      const s = JSON.parse(raw);
      if (!s || typeof s !== 'object' || !s.lifetime || typeof s.stage !== 'string') return null;
      const age = Math.max(0, Math.floor((s.ageTicks || 0) / AGE_TICKS_PER_YEAR));
      const stage = s.stage === STAGE.EGG ? 'たまご' : s.stage === STAGE.DEAD ? 'おわり' : LIFE_STAGES[stageForAge(age)].name;
      const species = s.stage === STAGE.EGG ? '' : (SPECIES_DISPLAY_NAMES[s.speciesLine] || '');
      return { species, stage, age, money: Math.max(0, Math.round(s.lifetime.money || 0)) };
    } catch (e) { return null; }
  }
  function formatSnapTime(at) {
    const d = new Date(at);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  let saveSnapArmed = null;
  function renderSaveSnaps() {
    if (!el.saveSnapList) return;
    const snaps = readSaveSnaps();
    el.saveSnapList.innerHTML = '';
    if (!snaps.length) {
      el.saveSnapList.innerHTML = '<div class="profile-hint">まだありません。あそんでいると自動で残ります</div>';
      return;
    }
    snaps.forEach((snap, i) => {
      const info = describeSaveRaw(snap.raw);
      const row = document.createElement('div');
      row.className = 'save-snap-row';
      const label = document.createElement('div');
      label.className = 'save-snap-label';
      label.textContent = info
        ? `${formatSnapTime(snap.at)} ・ ${info.species ? info.species + '・' : ''}${info.stage}（${info.age}さい） ・ 🪙\u00a0${info.money}`
        : `${formatSnapTime(snap.at)} ・ (よめない)`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'profile-code-btn save-snap-btn';
      btn.textContent = saveSnapArmed && saveSnapArmed.at === snap.at && Date.now() - saveSnapArmed.when < 6000 ? 'ほんとうにもどす' : 'この時点にもどす';
      btn.disabled = !info;
      btn.addEventListener('click', () => restoreSaveSnapshot(snap));
      row.appendChild(label);
      row.appendChild(btn);
      el.saveSnapList.appendChild(row);
    });
  }
  function restoreSaveSnapshot(snap) {
    if (!el.saveSnapStatus) return;
    const now = Date.now();
    if (!saveSnapArmed || saveSnapArmed.at !== snap.at || now - saveSnapArmed.when > 6000) {
      saveSnapArmed = { at: snap.at, when: now };
      el.saveSnapStatus.textContent = `${formatSnapTime(snap.at)}のセーブにもどします。いまのセーブもバックアップに残ります。よければ、もう一度押してください`;
      renderSaveSnaps();
      return;
    }
    saveSnapArmed = null;
    if (!replaceSavedLife(snap.raw)) { el.saveSnapStatus.textContent = 'セーブをもどせませんでした'; return; }
    el.saveSnapStatus.textContent = 'もどしました!読みこみ直します…';
    setTimeout(() => location.reload(), 600);
  }

  // いっしょうカード: おわかれ画面の コード生成、データ画面の 歴代の コード、コードを 見る
  if (el.lifeCardBody) el.lifeCardBody.addEventListener('click', (e) => {
    const btn = e.target.closest('#lifeCardCodeBtn');
    if (!btn) return;
    const box = el.lifeCardBody.querySelector('#lifeCardCodeText');
    if (!box) return;
    box.value = encodeLifeCode();
    box.classList.remove('hidden');
    copyCodeToClipboard(box.value, box, el.lifeCardBody.querySelector('#lifeCardCodeCopied'));
  });
  if (el.profilePastLives) el.profilePastLives.addEventListener('click', (e) => {
    const btn = e.target.closest('.past-life-code-btn');
    if (!btn) return;
    copyCodeToClipboard(btn.dataset.code, null, null);
    setMessage('📋 いっしょうカードの コードを コピーした');
  });
  if (el.lifeCodeViewBtn) el.lifeCodeViewBtn.addEventListener('click', () => {
    try {
      const card = decodeLifeCode(el.lifeCodeInput.value);
      el.lifeCodeView.innerHTML = lifeCodeCardHTML(card);
      el.lifeCodeView.classList.remove('hidden');
    } catch (err) {
      el.lifeCodeView.innerHTML = `<div class="profile-hint">よめない: ${escapeHtml(err.message)}</div>`;
      el.lifeCodeView.classList.remove('hidden');
    }
  });
  if (el.errorLogCopyBtn) el.errorLogCopyBtn.addEventListener('click', () => copyCodeToClipboard(errorReportText(), null, el.errorLogCopied));

  let saveImportArmedAt = 0;
  if (el.saveExportBtn) {
    el.saveExportBtn.addEventListener('click', () => {
      saveState();
      const raw = lastGoodSaveRaw;
      if (!raw) { el.saveImportStatus.textContent = 'まだセーブがありません'; return; }
      el.saveExportText.value = encodeSaveCode(raw);
      el.saveExportBox.classList.remove('hidden');
      el.saveImportStatus.textContent = `コードは${el.saveExportText.value.length}文字。メモアプリなどに貼りつけて、とっておこう`;
    });
    el.saveExportCopyBtn.addEventListener('click', () => copyCodeToClipboard(el.saveExportText.value, el.saveExportText, el.saveExportCopied));
    el.saveImportBtn.addEventListener('click', () => {
      let json;
      try { json = decodeSaveCode(el.saveImportInput.value); } catch (err) { el.saveImportStatus.textContent = `よみこめない: ${err.message}`; saveImportArmedAt = 0; return; }
      const now = Date.now();
      if (now - saveImportArmedAt > 6000) { saveImportArmedAt = now; el.saveImportStatus.textContent = 'いまのセーブを、このコードでおきかえます。よければ、もう一度押してください'; return; }
      saveImportArmedAt = 0;
      if (!replaceSavedLife(json)) { el.saveImportStatus.textContent = 'セーブをおきかえられませんでした'; return; }
      el.saveImportStatus.textContent = 'おきかえました!読みこみ直します…';
      setTimeout(() => location.reload(), 600);
    });
  }

  el.myCodeCopyBtn.addEventListener('click', () => {
    copyCodeToClipboard(el.myCodeBox.value, el.myCodeBox, el.myCodeCopyMsg);
  });

  el.guestCodeClearBtn.addEventListener('click', () => {
    el.guestCodeInput.value = '';
    el.codeError.classList.add('hidden');
    el.guestCodeInput.focus();
  });

  el.loadCodeBtn.addEventListener('click', () => {
    const raw = el.guestCodeInput.value;
    if (!raw.trim()) return;
    const guest = decodeGuestCode(raw);
    if (!guest) {
      el.codeError.textContent = 'コードが読みとれませんでした…もう一度たしかめてね';
      el.codeError.classList.remove('hidden');
      return;
    }
    el.codeError.classList.add('hidden');
    state.guest = guest;
    el.guestCodeInput.value = '';
    saveState();
    render();
  });

  el.guestStatus.addEventListener('click', (e) => {
    if (!e.target.closest('#clearGuestBtn')) return;
    state.guest = null;
    saveState();
    render();
  });

  el.duelCloseBtn.addEventListener('click', () => {
    duelOpen = false;
    render();
  });

  el.duelStartChallengeBtn.addEventListener('click', () => {
    goToDuelStep('bet');
    render();
  });

  el.duelStartGuessBtn.addEventListener('click', () => {
    goToDuelStep('guessCodeIn');
    render();
  });

  el.duelBetConfirmBtn.addEventListener('click', () => {
    const bet = Math.round(Number(el.duelBetInput.value));
    if (!Number.isFinite(bet) || bet <= 0) {
      el.duelBetError.textContent = 'かけきんを1以上の数字で入力してください';
      el.duelBetError.classList.remove('hidden');
      return;
    }
    if (bet > state.lifetime.money) {
      el.duelBetError.textContent = 'おかねがたりません';
      el.duelBetError.classList.remove('hidden');
      return;
    }
    const d = startDuelChallenge(bet);
    if (!d) {
      el.duelBetError.textContent = 'かけきんをかくにんしてください';
      el.duelBetError.classList.remove('hidden');
      return;
    }
    el.duelBetInput.value = '';
    goToDuelStep('question');
    saveState();
    render();
  });

  el.duelGuessCodeBtn.addEventListener('click', () => {
    const raw = el.duelGuessCodeInput.value;
    if (!raw.trim()) return;
    const result = startDuelGuess(raw);
    if (result && result.error === 'funds') {
      el.duelGuessCodeError.textContent = 'おかねがたりなくてさんかできません…';
      el.duelGuessCodeError.classList.remove('hidden');
      return;
    }
    if (!result || result.error) {
      el.duelGuessCodeError.textContent = 'コードが読みとれませんでした…もう一度たしかめてね';
      el.duelGuessCodeError.classList.remove('hidden');
      return;
    }
    el.duelGuessCodeInput.value = '';
    goToDuelStep('guessList');
    saveState();
    render();
  });

  el.duelGuessCodeClearBtn.addEventListener('click', () => {
    el.duelGuessCodeInput.value = '';
    el.duelGuessCodeError.classList.add('hidden');
    el.duelGuessCodeInput.focus();
  });

  // A: 1だんかいめ、本心を えらぶ(まだ こうかいの けっては しない)
  el.duelChoiceABtn.addEventListener('click', () => {
    if (!chooseDuelTruth(el.duelChoiceABtn.dataset.choice)) return;
    saveState();
    render();
  });
  el.duelChoiceBBtn.addEventListener('click', () => {
    if (!chooseDuelTruth(el.duelChoiceBBtn.dataset.choice)) return;
    saveState();
    render();
  });

  // A: 2だんかいめ、本音で いくか うそを つくかを えらぶ。うそを えらんだ
  // ときだけ、A本人にしか 見えない えんしゅつ(🃏😈)を 一瞬 見せてから
  // つぎの しつもんへ すすむ(Bには この えんしゅつは いっさい つたわらない)。
  // 5問ぜんぶ こたえおわると(すでに こたえずみの ものを 見なおしていた
  // ばあいも ふくむ)、いきなり コードを つくらず 回答確認画面に すすむ
  el.duelHonestBtn.addEventListener('click', () => {
    const d = chooseDuelHonesty(false);
    if (!d) return;
    saveState();
    if (d.step === 'review') goToDuelStep('answerReview');
    render();
  });

  el.duelLieBtn.addEventListener('click', () => {
    const result = chooseDuelHonesty(true);
    if (!result || result.error) return;
    const d = state.duel;
    saveState();
    el.duelHonestyChoiceRow.classList.add('hidden');
    el.duelLieFlash.classList.remove('hidden');
    setTimeout(() => {
      if (d.step === 'review') goToDuelStep('answerReview');
      render();
    }, 700);
  });

  // A: 2だんかいめの がめんで、こたえに そえる ひとこと証言を にんいで
  // えらぶ(もう いちど おなじ ものを タップすると とりけせる)
  el.duelTestimonyRow.addEventListener('click', (e) => {
    const chip = e.target.closest('.duel-testimony-chip');
    if (!chip) return;
    const d = state.duel;
    const id = chip.dataset.testimony;
    const next = d && d.pendingTestimony === id ? null : id;
    setDuelPendingTestimony(next);
    saveState();
    render();
  });

  // A: 「← もどる」。2だんかいめなら 同じ しつもんの 1だんかいめへ、
  // 1だんかいめなら 1つ前の しつもんの 2だんかいめ(以前の こたえを
  // つみなおした じょうたい)へ もどる
  el.duelBackBtn.addEventListener('click', () => {
    if (!goBackDuelQuestion()) return;
    saveState();
    render();
  });

  // A: 回答確認画面から、いずれかの しつもんを タップして 編集しなおす
  el.duelAnswerReviewList.addEventListener('click', (e) => {
    const row = e.target.closest('.duel-review-row');
    if (!row) return;
    if (!editDuelAnswer(Number(row.dataset.index))) return;
    saveState();
    goToDuelStep('question');
    render();
  });

  el.duelRestartAnswersBtn.addEventListener('click', () => {
    if (!restartDuelAnswers()) return;
    saveState();
    goToDuelStep('question');
    render();
  });

  el.duelRerollQuestionsBtn.addEventListener('click', () => {
    el.duelRerollConfirmRow.classList.remove('hidden');
  });

  el.duelRerollCancelBtn.addEventListener('click', () => {
    el.duelRerollConfirmRow.classList.add('hidden');
  });

  el.duelRerollYesBtn.addEventListener('click', () => {
    if (!rerollDuelQuestions()) return;
    saveState();
    goToDuelStep('question');
    render();
  });

  el.duelFinalizeChallengeBtn.addEventListener('click', () => {
    const d = finalizeDuelChallenge();
    if (!d) return;
    saveState();
    goToDuelStep('codeOut');
    render();
  });

  // B: 5問ぶんを 見くらべながら、すきな じゅんばんで すいり+自信度を えらぶ
  el.duelGuessList.addEventListener('click', (e) => {
    const row = e.target.closest('.duel-guess-row');
    if (!row) return;
    const guessBtn = e.target.closest('.duel-guess-btn');
    const confBtn = e.target.closest('.duel-confidence-btn');
    if (guessBtn) setDuelGuess(row.dataset.qid, guessBtn.dataset.guess);
    else if (confBtn) setDuelConfidence(row.dataset.qid, confBtn.dataset.confidence);
    else return;
    saveState();
    render();
  });

  el.duelGuessConfirmBtn.addEventListener('click', () => {
    const d = confirmDuelGuesses();
    if (!d) {
      el.duelGuessConfirmError.textContent = 'すべての質問で、すいりを選んでください';
      el.duelGuessConfirmError.classList.remove('hidden');
      return;
    }
    el.duelGuessConfirmError.classList.add('hidden');
    saveState();
    goToDuelStep('guessSuspicion');
    render();
  });

  // B: 5問の なかから「いちばん あやしい」1問を タップした しゅんかんに
  // かくてい する(この あと すいりコードを つくれる ように なる)
  el.duelSuspicionList.addEventListener('click', (e) => {
    const row = e.target.closest('.duel-suspicion-row');
    if (!row) return;
    const d = chooseDuelSuspicion(row.dataset.qid);
    if (!d) return;
    saveState();
    goToDuelStep('codeOut');
    render();
  });

  el.duelCodeOutCopyBtn.addEventListener('click', () => {
    copyCodeToClipboard(el.duelCodeOutBox.value, el.duelCodeOutBox, el.duelCodeOutCopyMsg);
  });

  el.duelCodeInClearBtn.addEventListener('click', () => {
    el.duelCodeInInput.value = '';
    el.duelCodeInError.classList.add('hidden');
    el.duelCodeInInput.focus();
  });

  el.duelCodeOutDoneBtn.addEventListener('click', () => {
    const d = state.duel;
    if (!d) {
      goToDuelStep('home');
      render();
      return;
    }
    if (d.role === 'challenger' && d.step === 'done') {
      d.revealSent = true;
      goToDuelStep('result');
    } else {
      goToDuelStep('codeIn');
    }
    saveState();
    render();
  });

  // A: 発行ずみの 挑戦コードは 書きかえられない ため、ないようを 変えたい
  // ときは「このしょうぶを やめて 新しく作る」で しあい じたいを はいきし、
  // かけきん入力からの あたらしい しょうぶへ すすむ
  el.duelAbandonBtn.addEventListener('click', () => {
    if (!abandonDuelChallenge()) return;
    saveState();
    goToDuelStep('bet');
    render();
  });
  el.duelCodeInAbandonBtn.addEventListener('click', () => {
    if (!abandonDuelChallenge()) return;
    saveState();
    goToDuelStep('bet');
    render();
  });

  el.duelCodeInBtn.addEventListener('click', () => {
    const raw = el.duelCodeInInput.value;
    if (!raw.trim()) return;
    const d = state.duel;
    if (!d) {
      goToDuelStep('home');
      render();
      return;
    }
    const result = d.role === 'challenger' ? resolveDuelWithGuessCode(raw) : resolveDuelWithRevealCode(raw);
    if (!result || result.error) {
      el.duelCodeInError.textContent = 'コードが読みとれませんでした…もう一度たしかめてね';
      el.duelCodeInError.classList.remove('hidden');
      return;
    }
    el.duelCodeInError.classList.add('hidden');
    el.duelCodeInInput.value = '';
    saveState();
    goToDuelStep(d.role === 'challenger' ? 'codeOut' : 'result');
    render();
  });

  // けっかがめん: 1問(+いちばんあやしいボーナス)ずつ めくっていく。
  // pending→revealed で いまの カードを あける、revealed→つぎへ すすむ
  el.duelRevealNextBtn.addEventListener('click', () => {
    if (duelRevealPhase === 'pending') {
      duelRevealPhase = 'revealed';
    } else {
      duelRevealIndex += 1;
      duelRevealPhase = 'pending';
    }
    render();
  });

  el.duelResultCloseBtn.addEventListener('click', () => {
    state.duel = null;
    goToDuelStep('home');
    saveState();
    render();
  });

  // けっか画面が 行き止まりに ならないよう、じぶんの たんまつ「だけ」を
  // しょうぶの 入口(フラットな 初期画面 - 「しょうぶを つくる」/
  // 「コードを よみこんで さんか」の 2つが ならぶ がめん)へ もどす。
  //
  // これは「まえかいと おなじ あいて・おなじ 役割で 自動さいせん」する
  // きのうでは ない。うそつきしょうぶは リアルタイム通信ではなく
  // 挑戦/推理/決着の 3コードを 手で やりとりする 方式な ため、A/Bは
  // プレイヤーに こていされた 役割ではなく、その1試合だけの いちじてきな
  // ラベルに すぎない。だから「もういちど しょうぶ!」を おした がわだけが
  // 入口画面に もどり、そこから 自由に「しょうぶを つくる」(=あたらしい A)
  // か「コードを よみこんで さんか」(=あたらしい B)かを えらびなおせる
  // (まえかい Aだった たんまつが つぎも Aを えらんでも、つぎは Bに
  // まわっても、どちらでも よい)。あいてがわの たんまつには なんの
  // えいきょうも あたえない - あいてが おなじ ボタンを おすまでは、
  // あいての がめんは まえの けっか画面の ままで よい(どうじに おす
  // ひつようも ない)。ちょうせんしゃ役に せんようの「かけきん入力へ
  // 直行」の ちかみちは あえて つくらない(役割の こていに つながる ため)
  //
  // せんぞく・せいかく傾向・しょじきん・じっせきなど 複数の しょうぶを
  // またいで つみあがる 永続データは state.lifetime に あり、
  // state.duel = null は 今回の しあい「だけ」に ぞくする いちじてきな
  // じょうたい(5問・こたえ・うそコイン・証言・すいり・自信度・いちばん
  // あやしい・挑戦/推理/決着コード・とくてん・A/Bの いちじてきな 役割)
  // だけを まとめて はいきする ため、永続データには まったく えいきょう しない
  el.duelRematchBtn.addEventListener('click', () => {
    state.duel = null;
    goToDuelStep('home');
    saveState();
    render();
  });

  const OFFLINE_MIN_MS = 2 * 60 * 1000;
  const OFFLINE_CAP_TICKS = 600; // 30ぷんぶん
  const OFFLINE_FLOOR = 20;
  function applyOfflineProgress(now = Date.now(), savedAtOverride) {
    const savedAt = savedAtOverride != null ? Number(savedAtOverride) || 0 : Number(state.savedAt) || 0;
    if (!savedAt || state.stage !== STAGE.GROWING || state.infinite) return null;
    const elapsed = now - savedAt;
    if (elapsed < OFFLINE_MIN_MS) return null;
    const ticks = Math.min(OFFLINE_CAP_TICKS, Math.floor(elapsed / TICK_MS));
    const minutes = Math.round(elapsed / 60000);
    const sleeping = !!state.isSleeping;
    const factor = sleeping ? 0.4 : 1;
    const before = { hunger: state.hunger, happiness: state.happiness, energy: state.energy };
    // ぶんだけ さがるが、るすで あぶなく なる ことは ない(20 どまり)
    const drop = (v, per) => Math.max(Math.min(v, OFFLINE_FLOOR), v - per * ticks);
    // ひらいている ときより ずっと おだやか。1かいの るすで さがるのは さいだい 30 まで。
    // げんきは るすの あいだ やすんでいる あつかいで、さがらず すこし かいふくする
    const cap = (v, per) => Math.max(drop(v, per), v - 30);
    state.hunger = clamp(cap(state.hunger, 0.25 * factor), 0, 100);
    state.happiness = clamp(cap(state.happiness, 0.25 * factor), 0, 100);
    if (sleeping) state.energy = clamp(state.energy + 2.2 * Math.min(ticks, 40), 0, 100);
    else state.energy = clamp(state.energy + 0.05 * ticks, 0, 100);
    let poop = 0;
    if (!sleeping && ticks >= 100 && state.poopCount < MAX_POOP) { state.poopCount += 1; poop = 1; }
    // おみやげ: 5ふんに 1コイン(さいだい 12)、30ぷんいじょうなら ときどき おたのしみ
    const coins = Math.min(12, Math.floor(elapsed / (5 * 60 * 1000)));
    let gift = null;
    if (coins > 0) state.lifetime.money += coins;
    if (elapsed >= 30 * 60 * 1000 && Math.random() < 0.35) { gift = randomFunItem(); state.items[gift.id] = (state.items[gift.id] || 0) + 1; }
    const parts = [];
    const d = (k, label) => { const diff = Math.round(state[k] - before[k]); if (diff) parts.push(`${label}${diff > 0 ? '+' : ''}${diff}`); };
    d('hunger', 'おなか'); d('happiness', 'ごきげん'); d('energy', 'げんき');
    if (poop) parts.push('うんち+1');
    if (coins) parts.push(`💰+${coins}`);
    if (gift) parts.push(`${gift.emoji}${gift.label}`);
    const span = minutes >= 120 ? `${Math.floor(minutes / 60)}時間` : `${minutes}分`;
    const summary = `🏠おかえり。留守のあいだ（${span}）、${sleeping ? 'ぐっすり寝ていた' : 'おとなしく待っていた'}。${parts.length ? '変化：' + parts.join('／') : ''}`;
    pushLifeLog('🏠', `るすばん：${span}`);
    setMessage(summary);
    showStoryEvent({ emoji: sleeping ? '😴' : '🏠', message: `おかえり!${span}、お留守番していたよ${gift ? `\n${gift.emoji}${gift.label}を見つけて、とっておいた` : coins ? `\n💰${coins}を拾っておいた` : ''}` });
    return { ticks, minutes, coins, gift, poop, sleeping };
  }

  function loop() {
    if (gameActive) {
      // still age/decay stats in the background, but don't touch the DOM
      // while a minigame owns the screen
      tick();
      saveState();
      return;
    }
    // うそつきしょうぶは しつもんを かんがえたり、あいてからの コードを
    // まったりと、ほかの がめんより ずっと 長く 同じ がめんに とどまる
    // ことが 想定される(あいては べつの端末で べつの タイミングに あそぶ
    // 非同期な しくみなので、なおさら)。あいてむ・ずかん・じっせき・
    // でざいんも、なにを こうにゅうするか/どの すがたか/どの いろ・がら
    // にするか などを じっくり ながめて えらぶ がめんな ので、おなじく
    // 時間の すすみを とめる。ここで とめておかないと、えらんでいる
    // あいだに 死亡メーターが すすんで しんでしまう、といった ことが
    // おきてしまうため、これらの がめんが ひらいている あいだは tick()
    // じたいを まるごと スキップする(とじれば また ふつうに じかんが
    // すすみだす)。プロフィールも、せいかく傾向や こいびと・なかまの
    // ようすを じっくり 見返す がめんな ので おなじく とめる。つうしん
    // はぶ(あいてコード・しょうぶの いりぐち一覧)も、コードを つくったり
    // 読みこんだり する あいだ とどまりやすい がめんな ので おなじ あつかい
    // にする。基本がめん(なにも ひらいていない とき)は、ながめて いる
    // だけでも 時間が すすみつづける、いつもどおりの プレイに もどる
    if (isAnyMenuOverlayOpen()) { renderEnvironment(); return; }
    // messages clear themselves on their own timer (see setMessage) rather
    // than being wiped here, so a message's visible duration never depends
    // on how this tick's 3-second phase happens to line up with it
    tick();
    saveState();
    render();
  }

  // boot: resume exactly where the last save left off. Time never passes
  // while the page is closed - only this interval, while open, advances it.
  // マイグレーション ちょくごの 1かいだけ、たんじょうび/すがたのへんか/
  // 死亡の えんしゅつが ぼうはつ しない ように おさえてから ひょうじする
  if (pendingMigrationQuiet) {
    suppressLifeEvents = true;
    pendingMigrationQuiet = false;
    setTimeout(() => { suppressLifeEvents = false; }, 0);
  }
  state.declineBaseline = state.declineBaseline || state.lifetime.devolutions || 0;
  const legacyResolution = state.pendingLegacyRelationshipResolution;
  if (legacyResolution) {
    state.pendingLegacyRelationshipResolution = null;
    const who = `${legacyResolution.emoji || '💞'} ${legacyResolution.label}`;
    pushLifeLog('💔', `${legacyResolution.label}と関係をはなしあって整理した`);
    setTimeout(() => {
      setMessage(legacyResolution.married
        ? `${who}とちゃんと話した。恋愛の向きがちがうことを確かめて、夫婦ではなくなることにした`
        : `${who}とちゃんと話した。恋愛の向きがちがうことを確かめて、こいびとではなくなることにした`);
      sayPet('これからは、おたがいにむりのないかたちでいよう');
    }, 350);
  }
  if (!stateLoadRecovered) {
    saveState();
  } else {
    // 復旧できた場合は次の保存から再開。候補が全滅した場合は原本を保持する。
    setTimeout(() => setMessage(saveWriteBlocked
      ? 'きろくを読みこめませんでした。前のきろくを守るため、いまは保存を止めています'
      : '前のきろくから元にもどしました。内容をたしかめてください'), 250);
  }
  // るすのあいだの けいか(ひかえめ): ページを とじていた じかんの ぶんだけ、
  // さいだい 30ぷんぶん ステータスが すこし さがる(20 より したには ならず、
  // としも とらない)。ねていれば げんきが かいふくする。もどってきたら
  // 「おかえり」の おしらせと、るすの ながさに おうじた ちいさな おみやげ
  applyOfflineProgress(Date.now(), bootSavedAt);
  render();
  setInterval(loop, TICK_MS);
  scheduleIdlePerk();
  scheduleEnvironmentMoment();
  scheduleIdleGreeting();
  scheduleCompanionEncounter();

  // save immediately whenever the tab is hidden/closed so nothing is lost
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      clearConversationTimers(); hideSpeechBubble(); castMotion?.clear();
      saveState();
    }
  });
  window.addEventListener('beforeunload', () => {
    saveState();
  });
  function syncHomeViewport() {
    const viewport = window.visualViewport;
    // Pinch zoom remains a real zoom; do not shrink the app to undo it.
    if (viewport && viewport.scale !== 1) return;
    const height = Math.round(viewport?.height || window.innerHeight);
    if (height > 0) {
      document.documentElement.style.setProperty('--app-height',height + 'px');
      el.device.classList.toggle('ui-home-compact', height <= 640);
    }
    el.castStage.style.minHeight = '';
    renderHomeCast();
  }
  if (typeof ResizeObserver === 'function') new ResizeObserver(renderHomeCast).observe(el.castStage);
  window.addEventListener('resize', syncHomeViewport);
  window.visualViewport?.addEventListener('resize', syncHomeViewport);
  syncHomeViewport();
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!el.wipeConfirmOverlay.classList.contains('hidden')) {
      e.preventDefault();
      cancelWipeConfirmation();
      return;
    }
    if (!el.wipeOverlay.classList.contains('hidden')) {
      e.preventDefault();
      cancelWipePrompt();
      return;
    }
    if (dateOpen || duelOpen || companionInviteOpen || gameActive || state.transformOptions) return;
    if (isAnyMenuOverlayOpen()) { closeAllMenuOverlays(); render(); el.menuBtn.focus(); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { renderEnvironment(); maybeRefreshEnvironment(); }
  });
  window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', renderEnvironment);
})();
