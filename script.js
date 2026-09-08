(() => {
  'use strict';

  const SAVE_KEY = 'naotocchi-save-v1';
  const WORLD_MASTER = window.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1 || null;
  const SAVE_BACKUP_KEY = 'naotocchi-save-v1-backup';
  let stateLoadRecovered = false;
  const TICK_MS = 3000; // 1 tick = 3 seconds of real time; time only passes while the page is open
  const MAX_POOP = 4;

  const SICKNESS_TYPES = [
    { label: 'げんいんふめいの こうねつ', badge: '🥵' },
    { label: 'とまらない はきけ', badge: '🤢' },
    { label: 'ぐるぐる する めまい', badge: '💫' },
    { label: 'われるような ずつう', badge: '🤕' },
    { label: 'しんぞうが バクバクする びょうき', badge: '😰' },
    { label: 'あたまが こんらんする びょうき', badge: '😵' },
    { label: 'きぶんの アップダウンが はげしい びょうき', badge: '😵‍💫' },
    { label: 'げんきが まったく でない びょうき', badge: '😞' },
    { label: 'からだが おもくて うごけない びょうき', badge: '🥶' },
    { label: 'あせが とまらない びょうき', badge: '😨' },
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
  const SODACHI_COST_BANDS = [
    { max: 19, cost: 9 },
    { max: 39, cost: 11 },
    { max: 59, cost: 20 },
    { max: 69, cost: 38 },
    { max: 79, cost: 55 },
    { max: 89, cost: 75 },
    { max: 99, cost: 100 },
  ];
  // おとろえは そだちの たかさに かかわらず つねに この量で まんたんに なる
  // (ミスの ダメージは いつでも おなじ ぜったい量)
  const DECLINE_MAX = 100;

  // ② はじめての いっしょうクリアの しきい値(100さい + 最高そだち これいじょう)
  const LIFE_CLEAR_SODACHI = 70;

  // そだちの 10きざみの 節目に 解禁される 特典。maxSodachi で 解禁され、
  // おとろえで そだちが さがっても うしなわれない(hasPerk() さんしょう)
  const SODACHI_PERKS = {
    30: { emoji: '🪙', name: 'はじめての ごほうび', coins: 100, desc: 'コインが ふえやすく なり、人生の節目で ごほうびに であえることが ある' },
    40: { emoji: '🐾', name: 'なかまの わ', coins: 150, desc: 'なかまと であいやすく なり、きずなが きれにくく なった' },
    50: { emoji: '💐', name: 'こいの きざし', coins: 250, desc: 'きゅうあいが せいこうしやすく なり、けっこんも ちかづいた。「せかい」から デートに さそえるように なった' },
    60: { emoji: '🗝️', name: 'へんしんの ちから', coins: 400, desc: 'えらべる すがたが ふえ、へんしんできる かいすうも ふえた。レアな しゅぞくの 解禁条件も 1だん ゆるくなった' },
    70: { emoji: '🧭', name: 'たびだち', coins: 600, desc: 'コインが もっと ふえ、たびの きげんボーナスが 2ばいに。「たびに でる」に とくべつな たびさきが あらわれた' },
    80: { emoji: '🌈', name: 'レアの きざし', coins: 900, desc: 'へんしんの こうほに レアが まざりやすく なり、レアな なかまとも であえるように なった' },
    90: { emoji: '✨', name: 'でんせつ', coins: 1400, desc: 'きんいろの オーラを まとった。でんせつの ゆめを もらい、いつか「でんせつの であい」が おきる' },
    100: { emoji: '👑', name: 'さいこうの そだち', coins: 3000, desc: 'にじの オーラを まとい、さいこうの そだちに たどりついた' },
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
        { emoji: '🐶', asset: 'assets/characters/dog/02.png', label: 'よちよちあるく こいぬ', message: 'よちよちあるく こいぬに せいちょうした!' },
        { emoji: '🐶', asset: 'assets/characters/dog/03.png', label: 'こいぬ', message: 'こいぬに せいちょうした!' },
        { emoji: '🐕', asset: 'assets/characters/dog/04.png', label: 'わんぱくいぬ', message: 'わんぱくいぬに せいちょうした!' },
        { emoji: '🐕', asset: 'assets/characters/dog/05.png', label: 'そとあそび だいすきな いぬ', message: 'そとあそび だいすきな いぬに せいちょうした!' },
        { emoji: '🐕', asset: 'assets/characters/dog/06.png', label: 'わかいいぬ', message: 'わかいいぬに せいちょうした!' },
        { emoji: '🐕', asset: 'assets/characters/dog/07.png', label: 'いぬ', message: 'げんきいっぱいの いぬに へんしんした!' },
        { emoji: '🐕', asset: 'assets/characters/dog/08.png', label: 'としをとった いぬ', message: 'としをとった いぬに なった…' },
      ],
    },
    cat: {
      stages: [
        { emoji: '🐱', asset: 'assets/characters/cat/01.png', label: 'あかちゃんねこ' },
        { emoji: '🐱', asset: 'assets/characters/cat/02.png', label: 'よちよちあるく こねこ', message: 'よちよちあるく こねこに せいちょうした!' },
        { emoji: '🐱', asset: 'assets/characters/cat/03.png', label: 'こねこ', message: 'こねこに せいちょうした!' },
        { emoji: '🐈', asset: 'assets/characters/cat/04.png', label: 'おてんばねこ', message: 'おてんばねこに せいちょうした!' },
        { emoji: '🐈', asset: 'assets/characters/cat/05.png', label: 'きままに あるきまわる ねこ', message: 'きままに あるきまわる ねこに せいちょうした!' },
        { emoji: '🐈', asset: 'assets/characters/cat/06.png', label: 'わかいねこ', message: 'わかいねこに せいちょうした!' },
        { emoji: '🐈', asset: 'assets/characters/cat/07.png', label: 'ねこ', message: 'きままな ねこに へんしんした!' },
        { emoji: '🐈', asset: 'assets/characters/cat/08.png', label: 'としをとった ねこ', message: 'としをとった ねこに なった…' },
      ],
    },
    bird: {
      stages: [
        { emoji: '🐣', label: 'ひな' },
        { emoji: '🐣', label: 'はねが はえてきた ひな', message: 'はねが はえてきた!' },
        { emoji: '🐥', label: 'こどり', message: 'こどりに せいちょうした!' },
        { emoji: '🐤', label: 'わかどり', message: 'わかどりに せいちょうした!' },
        { emoji: '🐤', label: 'とびかたを れんしゅうする とり', message: 'とびかたの れんしゅうを はじめた!' },
        { emoji: '🐤', label: 'はばたくとり', message: 'はばたくとりに せいちょうした!' },
        { emoji: '🐦', label: 'とり', message: 'じゆうな とりに へんしんした!' },
        { emoji: '🦜', label: 'としをとった とり', message: 'としをとった とりに なった…' },
      ],
    },
    man: {
      stages: [
        { emoji: '👶', asset: 'assets/characters/man/01.png', label: 'あかちゃん' },
        { emoji: '👶', asset: 'assets/characters/man/02.png', label: 'ようじ', message: 'ようじに せいちょうした!' },
        { emoji: '🧒', asset: 'assets/characters/man/03.png', label: 'こども', message: 'こどもに せいちょうした!' },
        { emoji: '👦', asset: 'assets/characters/man/04.png', label: 'しょうねん', message: 'しょうねんに せいちょうした!' },
        { emoji: '👦', asset: 'assets/characters/man/05.png', label: 'わかもの', message: 'わかものに せいちょうした!' },
        { emoji: '🧑', asset: 'assets/characters/man/06.png', label: 'おとな', message: 'おとなに せいちょうした!' },
        { emoji: '🧑', asset: 'assets/characters/man/07.png', label: 'ちゅうねん', message: 'ちゅうねんに なった!' },
        { emoji: '👴', asset: 'assets/characters/man/08.png', label: 'おじいさん', message: 'おじいさんに なった…' },
      ],
    },
    woman: {
      stages: [
        { emoji: '👶', asset: 'assets/characters/woman/01.png', label: 'あかちゃん' },
        { emoji: '👶', asset: 'assets/characters/woman/02.png', label: 'よちよちあるきの こども', message: 'よちよちあるきの こどもに せいちょうした!' },
        { emoji: '🧒', asset: 'assets/characters/woman/03.png', label: 'おんなのこ', message: 'おんなのこに せいちょうした!' },
        { emoji: '👧', asset: 'assets/characters/woman/04.png', label: 'しょうじょ', message: 'しょうじょに せいちょうした!' },
        { emoji: '👧', asset: 'assets/characters/woman/05.png', label: 'おしゃれに めざめた しょうじょ', message: 'おしゃれに めざめた しょうじょに せいちょうした!' },
        { emoji: '👧', asset: 'assets/characters/woman/06.png', label: 'わかいおんなのひと', message: 'わかいおんなのひとに せいちょうした!' },
        { emoji: '👩', asset: 'assets/characters/woman/07.png', label: 'おんなのひと', message: 'りりしい おんなのひとに せいちょうした!' },
        { emoji: '👵', asset: 'assets/characters/woman/08.png', label: 'おばあさん', message: 'おばあさんに なった…' },
      ],
    },
    beetle: {
      stages: [
        { emoji: '🐛', label: 'ようちゅう' },
        { emoji: '🐛', label: 'すこし おおきくなった ようちゅう', message: 'すこし おおきく なった!' },
        { emoji: '🐛', label: 'おおきくなった ようちゅう', message: 'ようちゅうが おおきく せいちょうした!' },
        { emoji: '🪲', label: 'さなぎあがりの こがぶとむし', message: 'さなぎから でてきた!' },
        { emoji: '🪲', label: 'つのが のびてきた こがぶとむし', message: 'つのが ぐんぐん のびてきた!' },
        { emoji: '🪲', label: 'わかいカブトムシ', message: 'わかいカブトムシに せいちょうした!' },
        { emoji: '🪲', label: 'カブトムシ', message: 'たくましい カブトムシに へんしんした!' },
        { emoji: '🪲', label: 'でんせつの カブトムシ', message: 'でんせつの カブトムシに なった…' },
      ],
    },
    stagbeetle: {
      stages: [
        { emoji: '🐛', label: 'ようちゅう' },
        { emoji: '🐛', label: 'すこし おおきくなった ようちゅう', message: 'すこし おおきく なった!' },
        { emoji: '🐛', label: 'おおきくなった ようちゅう', message: 'ようちゅうが おおきく せいちょうした!' },
        { emoji: '🪲', label: 'さなぎあがりの こくわがた', message: 'さなぎから でてきた!' },
        { emoji: '🪲', label: 'あごが りっぱに なってきた こくわがた', message: 'あごが りっぱに なってきた!' },
        { emoji: '🪲', label: 'わかいクワガタムシ', message: 'わかいクワガタムシに せいちょうした!' },
        { emoji: '🪲', label: 'クワガタムシ', message: 'りっぱな クワガタムシに へんしんした!' },
        { emoji: '🪲', label: 'でんせつの クワガタムシ', message: 'でんせつの クワガタムシに なった…' },
      ],
    },
    rabbit: {
      stages: [
        { emoji: '🐰', label: 'あかちゃんうさぎ' },
        { emoji: '🐰', label: 'よちよちはねる こうさぎ', message: 'よちよちはねる こうさぎに せいちょうした!' },
        { emoji: '🐰', label: 'こうさぎ', message: 'こうさぎに せいちょうした!' },
        { emoji: '🐇', label: 'わんぱくうさぎ', message: 'わんぱくうさぎに せいちょうした!' },
        { emoji: '🐇', label: 'ジャンプりょくが ついた うさぎ', message: 'ジャンプりょくが ついてきた!' },
        { emoji: '🐇', label: 'わかいうさぎ', message: 'わかいうさぎに せいちょうした!' },
        { emoji: '🐇', label: 'うさぎ', message: 'すばしっこい うさぎに へんしんした!' },
        { emoji: '🐇', label: 'としをとった うさぎ', message: 'としをとった うさぎに なった…' },
      ],
    },
    fish: {
      stages: [
        { emoji: '🐟', label: 'あかちゃんざかな' },
        { emoji: '🐟', label: 'ひれが うごきだした こざかな', message: 'ひれが うごきだした!' },
        { emoji: '🐟', label: 'こざかな', message: 'こざかなに せいちょうした!' },
        { emoji: '🐠', label: 'わんぱくざかな', message: 'わんぱくざかなに せいちょうした!' },
        { emoji: '🐠', label: 'むれで およぐ さかな', message: 'むれで およぐように なった!' },
        { emoji: '🐠', label: 'わかいさかな', message: 'わかいさかなに せいちょうした!' },
        { emoji: '🐡', label: 'さかな', message: 'カラフルな さかなに へんしんした!' },
        { emoji: '🐡', label: 'としをとった さかな', message: 'としをとった さかなに なった…' },
      ],
    },
    dragon: {
      stages: [
        { emoji: '🦎', label: 'あかちゃんりゅう' },
        { emoji: '🦎', label: 'うろこが かたくなってきた こりゅう', message: 'うろこが かたくなってきた!' },
        { emoji: '🦎', label: 'こりゅう', message: 'こりゅうに せいちょうした!' },
        { emoji: '🐉', label: 'わんぱくりゅう', message: 'わんぱくりゅうに せいちょうした!' },
        { emoji: '🐉', label: 'つばさが はえてきた りゅう', message: 'つばさが はえてきた!' },
        { emoji: '🐉', label: 'わかいりゅう', message: 'わかいりゅうに せいちょうした!' },
        { emoji: '🐉', label: 'りゅう', message: 'ほのおを ふく りゅうに へんしんした!' },
        { emoji: '🐉', label: 'でんせつの りゅう', message: 'でんせつの りゅうに なった…' },
      ],
    },
    panda: {
      stages: [
        { emoji: '🐼', label: 'あかちゃんパンダ' },
        { emoji: '🐼', label: 'よちよちあるく こパンダ', message: 'よちよちあるく こパンダに せいちょうした!' },
        { emoji: '🐼', label: 'やんちゃな パンダ', message: 'やんちゃな パンダに せいちょうした!' },
        { emoji: '🐼', label: 'ささを たべはじめた パンダ', message: 'ささを たべはじめた!' },
        { emoji: '🐼', label: 'ごろごろ ころがる パンダ', message: 'ごろごろ ころがるように なった!' },
        { emoji: '🐼', label: 'わかいパンダ', message: 'わかいパンダに せいちょうした!' },
        { emoji: '🐼', label: 'どっしりした パンダ', message: 'どっしりした パンダに へんしんした!' },
        { emoji: '🐼', label: 'としをとった パンダ', message: 'としをとった パンダに なった…' },
      ],
    },
    fox: {
      stages: [
        { emoji: '🦊', label: 'あかちゃんきつね' },
        { emoji: '🦊', label: 'よちよちあるく こぎつね', message: 'よちよちあるく こぎつねに せいちょうした!' },
        { emoji: '🦊', label: 'しっぽが ふさふさな こぎつね', message: 'しっぽが ふさふさに なってきた!' },
        { emoji: '🦊', label: 'わんぱくな きつね', message: 'わんぱくな きつねに せいちょうした!' },
        { emoji: '🦊', label: 'すばしっこい わかぎつね', message: 'すばしっこく なってきた!' },
        { emoji: '🦊', label: 'わかいきつね', message: 'わかいきつねに せいちょうした!' },
        { emoji: '🦊', label: 'ずるがしこい きつね', message: 'ずるがしこい きつねに へんしんした!' },
        { emoji: '🦊', label: 'せんれんされた きつね', message: 'せんれんされた きつねに なった…' },
      ],
    },
    owl: {
      stages: [
        { emoji: '🦉', label: 'あかちゃんふくろう' },
        { emoji: '🦉', label: 'めを あけたばかりの ひなふくろう', message: 'めを あけたばかりの ひなふくろうに せいちょうした!' },
        { emoji: '🦉', label: 'こふくろう', message: 'こふくろうに せいちょうした!' },
        { emoji: '🦉', label: 'よるに めざめる わんぱくふくろう', message: 'よるに めざめるように なった!' },
        { emoji: '🦉', label: 'とぶれんしゅうを する ふくろう', message: 'とぶれんしゅうを はじめた!' },
        { emoji: '🦉', label: 'わかいふくろう', message: 'わかいふくろうに せいちょうした!' },
        { emoji: '🦉', label: 'ちえのある ふくろう', message: 'ちえのある ふくろうに へんしんした!' },
        { emoji: '🦉', label: 'としをとった ふくろう', message: 'としをとった ふくろうに なった…' },
      ],
    },
    plant: {
      stages: [
        { emoji: '🌱', label: 'めが でたばかりの たね' },
        { emoji: '🌱', label: 'ふたばの め', message: 'ふたばが ひらいた!' },
        { emoji: '🌿', label: 'くきが のびた なえ', message: 'くきが ぐんぐん のびてきた!' },
        { emoji: '🌾', label: 'つぼみが ふくらんだ め', message: 'つぼみが ふくらんできた!' },
        { emoji: '🌷', label: 'はなびらが のぞく つぼみ', message: 'はなびらが のぞきはじめた!' },
        { emoji: '🌻', label: 'さきほこる はな', message: 'はなが さきほこった!' },
        { emoji: '🌼', label: 'みごとな はな', message: 'みごとな はなに せいちょうした!' },
        { emoji: '🥀', label: 'かれはじめた はな', message: 'すこしずつ かれはじめた…' },
      ],
    },
    robot: {
      stages: [
        { emoji: '🤖', label: 'くみたてちゅうの ミニロボット' },
        { emoji: '🤖', label: 'でんげんが はいった ロボット', message: 'でんげんが はいった!' },
        { emoji: '🤖', label: 'あるきかたを おぼえた ロボット', message: 'あるきかたを おぼえた!' },
        { emoji: '🤖', label: 'がくしゅうちゅうの ロボット', message: 'がくしゅうを はじめた!' },
        { emoji: '🦾', label: 'パワーアップした ロボット', message: 'パワーアップした!' },
        { emoji: '🦾', label: 'せんとうようの ロボット', message: 'せんとうようの ロボットに せいちょうした!' },
        { emoji: '🦾', label: 'さいしんがた ロボット', message: 'さいしんがたに アップグレードした!' },
        { emoji: '🤖', label: 'きゅうしきの ロボット', message: 'きゅうしきロボットに なった…' },
      ],
    },
    dinosaur: {
      stages: [
        { emoji: '🦕', label: 'たまごから でたばかりの きょうりゅう' },
        { emoji: '🦕', label: 'よちよちあるく こきょうりゅう', message: 'よちよちあるく こきょうりゅうに せいちょうした!' },
        { emoji: '🦕', label: 'とげが はえてきた きょうりゅう', message: 'とげが はえてきた!' },
        { emoji: '🦖', label: 'わんぱくな きょうりゅう', message: 'わんぱくな きょうりゅうに せいちょうした!' },
        { emoji: '🦖', label: 'するどい はが はえた きょうりゅう', message: 'するどい はが はえてきた!' },
        { emoji: '🦖', label: 'わかいきょうりゅう', message: 'わかいきょうりゅうに せいちょうした!' },
        { emoji: '🦖', label: 'きょだいな きょうりゅう', message: 'きょだいな きょうりゅうに へんしんした!' },
        { emoji: '🦴', label: 'かせきに なった きょうりゅう', message: 'ながい ときを へて かせきに なった…' },
      ],
    },
    // rare lines - never a starting hatch, only reachable as a 変身 choice
    // (see pickTransformCandidates) when care/skill has been exceptional
    god: {
      stages: [
        { emoji: '👼', label: 'あかちゃんてんし' },
        { emoji: '👼', label: 'はねが ちいさく はえてきた てんし', message: 'はねが ちいさく はえてきた!' },
        { emoji: '👼', label: 'こてんし', message: 'こてんしに せいちょうした!' },
        { emoji: '👼', label: 'みならいのてんし', message: 'みならいのてんしに せいちょうした!' },
        { emoji: '😇', label: 'ひかりを まといはじめた かみのこ', message: 'ひかりを まといはじめた!' },
        { emoji: '😇', label: 'わかきかみ', message: 'わかきかみに せいちょうした!' },
        { emoji: '😇', label: 'かみさま', message: 'まさかの…かみさまに なった!!' },
        { emoji: '🌞', label: 'だいじんの かみさま', message: 'だいじんの かみさまに なった…' },
      ],
    },
    ren: {
      stages: [
        { emoji: '👶', label: 'あかちゃんの れんくん' },
        { emoji: '👶', label: 'よちよちあるきの れんくん', message: 'よちよちあるきの れんくんに なった!' },
        { emoji: '🧒', label: 'れんくん', message: 'れんくんが おおきく なった!' },
        { emoji: '🧒', label: 'しょうねんの れんくん', message: 'しょうねんの れんくんに なった!' },
        { emoji: '🧒', label: 'いたずらざかりの れんくん', message: 'いたずらざかりの れんくんに なった!' },
        { emoji: '👦', label: 'せいねんの れんくん', message: 'せいねんの れんくんに なった!' },
        { emoji: '🧑', label: 'れんくん', message: 'あれ!?れんくんが なかまに くわわった!' },
        { emoji: '🧑', label: 'れんさん', message: 'れんさんに なった…' },
      ],
    },
    mermaid: {
      stages: [
        { emoji: '🐚', label: 'あかちゃんの かいがら' },
        { emoji: '🐚', label: 'うろこが きらめきだした こにんぎょ', message: 'うろこが きらめきだした!' },
        { emoji: '🐚', label: 'こにんぎょ', message: 'こにんぎょに せいちょうした!' },
        { emoji: '🧜', label: 'わんぱくにんぎょ', message: 'わんぱくにんぎょに せいちょうした!' },
        { emoji: '🧜', label: 'およぎが じょうずに なった にんぎょ', message: 'およぎが じょうずに なった!' },
        { emoji: '🧜', label: 'わかいにんぎょ', message: 'わかいにんぎょに せいちょうした!' },
        { emoji: '🧜‍♀️', label: 'にんぎょ', message: 'うみの プリンセス にんぎょに へんしんした!' },
        { emoji: '🧜‍♀️', label: 'でんせつの にんぎょ', message: 'でんせつの にんぎょに なった…' },
      ],
    },
    unicorn: {
      stages: [
        { emoji: '🐴', label: 'つのが みえはじめた あかちゃんうま' },
        { emoji: '🐴', label: 'よちよちあるく こうま', message: 'よちよちあるく こうまに せいちょうした!' },
        { emoji: '🦄', label: 'つのが のびてきた こうま', message: 'つのが のびてきた!' },
        { emoji: '🦄', label: 'わんぱくな ユニコーン', message: 'わんぱくな ユニコーンに せいちょうした!' },
        { emoji: '🦄', label: 'ひかりを はなちはじめた ユニコーン', message: 'ひかりを はなちはじめた!' },
        { emoji: '🦄', label: 'わかいユニコーン', message: 'わかいユニコーンに せいちょうした!' },
        { emoji: '🦄', label: 'でんせつの ユニコーン', message: 'まさかの…ユニコーンに なった!!' },
        { emoji: '🦄', label: 'おおいなる ユニコーン', message: 'おおいなる ユニコーンに なった…' },
      ],
    },
    phoenix: {
      stages: [
        { emoji: '🐣', label: 'ひのとりの ひな' },
        { emoji: '🐣', label: 'よちよちあるく ひな', message: 'よちよちあるく ひなに せいちょうした!' },
        { emoji: '🐥', label: 'ほのおを まといはじめた こどり', message: 'ほのおを まといはじめた!' },
        { emoji: '🐦‍🔥', label: 'わんぱくな ひのとり', message: 'わんぱくな ひのとりに せいちょうした!' },
        { emoji: '🐦‍🔥', label: 'つばさが もえあがる ひのとり', message: 'つばさが もえあがってきた!' },
        { emoji: '🐦‍🔥', label: 'わかいフェニックス', message: 'わかいフェニックスに せいちょうした!' },
        { emoji: '🐦‍🔥', label: 'でんせつの フェニックス', message: 'まさかの…フェニックスに なった!!' },
        { emoji: '🐦‍🔥', label: 'ふしちょうの フェニックス', message: 'ふしちょうの フェニックスに なった…' },
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
          message: i ? `${label}に なった!` : undefined,
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
  // 168形態ぶんの せつめい文(ずかんから 読める)
  // ================================================================
  // 「おなじ しゅぞくだから 似せる」は やらない(§03)。おなじ いぬでも
  // どろだらけ / スケボー / サングラス / へんな ろうけん…と、1つずつ
  // べつキャラくらい ふりはばを つける。かわいい・かっこいい・うつくしい・
  // こうごうしい・しぶい・おしゃれ・キモかわ・シュール・意味不明を
  // わざと おなじ せかいに まぜてある。すてキャラを つくらない ため、
  // どの 1つにも「これを えらびたい」と おもえる ところを かならず のこす
  const SPECIES_STAGE_DESCS = {
    dog: [
      'まだ めが あいていない。においだけで せかいを だいたい わかっている つもりでいる',
      'あるくのが たのしすぎて、いきたい ほうこうと あしが あっていない',
      'スリッパを かならず かたっぽうだけ かくす。もう かたっぽうの ゆくえは だれも しらない',
      'どろだらけ。よろこんで いるのか おこって いるのか、しっぽしか ヒントが ない',
      'スケートボードに のる。なぜ のれるのかは ほんにんも せつめいできない',
      'サングラスが にあう と おもっている。じっさい けっこう にあっている',
      'なにも いわずに となりに すわる。それだけで だいたい なんとか なる',
      'あるくのが おそく なった ぶん、ゆうやけを みる じかんが ながく なった',
    ],
    cat: [
      'ちいさい。まるい。あたたかい。それいがいの じょうほうを ほとんど ださない',
      'よちよち あるいては、とちゅうで なぜか ねる',
      'はこに はいる。はこが なければ はこの かたちを した くうきに はいる',
      'てんじょうから おちてきた。おちた あと 3びょうかん「よていどおり」の かおを する',
      'よるじゅう どこかへ でかけている。あさ かえってくると すこし しおの においが する',
      'めが きれい。ほんにんも それを しっている',
      'ひざの うえの けんりを ぜったいに ゆずらない。おきるのは ほんにんの きぶんしだい',
      'ひなたで ねている。よく みると まぶたの すきまから ずっと こっちを みている',
    ],
    bird: [
      'からを われた しゅんかん、いちばん さいしょに みた ものを ずっと おぼえている',
      'はねが はえてきた。うれしくて まだ とべないのに たかい ところに のぼる',
      'うたを れんしゅうしている。おなじ ところで かならず まちがえる',
      'おしゃれな はねの いろに なった。かがみの まえから うごかない',
      'とびかたを れんしゅう中。りりくは できる。ちゃくりくの けんきゅうは これから',
      'ようやく そらに でた。おもったより そらは ひろくて、すこし こわかった',
      'たかい ところから まちを みおろす。だれの ものでも ない けしきが すきらしい',
      'いろが あざやかに なった。としを とるほど はでに なる しゅぞく らしい',
    ],
    man: [
      'にぎる ちからだけが やたら つよい。はなさない',
      'たっては ころび、ころんでは わらう。なぜか ずっと きげんが いい',
      'ポケットが いつも いっぱい。なかみは いしと ぼうと なぞの きんぞく',
      'はしるのが はやい ことだけが とりえだと おもっている(とりえは ほかにも ある)',
      'なにも おきていないのに ふきげん。ほんにんも りゆうを さがしている',
      'はじめて じぶんで えらんだ ふくを きている。すこし サイズが おおきい',
      'だまって ものを もってくれる。おれいを いうと ちょっと こまった かおを する',
      'おなじ はなしを 3かい する。3かいめが いちばん おもしろい',
    ],
    woman: [
      'なきごえの おおきさが たいじゅうと つりあっていない',
      'あるくより はしる。はしるより おどる',
      'ひろった はなを ぜんぶ かみに さす。さしすぎて ちょっと もりに なる',
      'ノートの すみに ひみつの キャラを かいている。まいにち びみょうに ふえている',
      'かがみの まえに 40ぷん。でてくると なにが かわったのか わからない。でも きげんが いい',
      'ひとりで とおくへ いく でんしゃに のった。まどの そとを ずっと みていた',
      'こまっている ひとに いちばん さきに きづく。きづいた あと、すごく さりげなく たすける',
      'てが あたたかい。なぜか なんでも しっている',
    ],
    beetle: [
      'つちの なかで まっしろ。まだ せかいが ぜんぶ つちだと おもっている',
      'たべる、ねる、ふとる。かんぜんな せいかつ',
      'まるまると ふとった。ちょっと きもちわるくて、なぜか かわいい',
      'からだが まだ やわらかい。さわらないで ほしそうに している',
      'つのを ためしに なにかに ぶつけてみる。すぐ ぶつける',
      'よるの じゅえきに いちばんのりする。じつは ならんで まっていた',
      'つのが くろく ひかる。たたかわなくても つよい ことが わかる',
      'つのの さきが きんいろに なった。りゆうは ない。もりでは そういう ことに なっている',
    ],
    stagbeetle: [
      'つちの なかで、カブトムシの ようちゅうと ときどき すれちがう',
      'ふとりかたが すこし ちがう。ほんにんは けっこう きにしている',
      'あたまが かたく なってきた。じぶんで こんこん たたいて たしかめる',
      'あごが まだ ちいさい。それでも かならず はさもうと する',
      'はさむ ちからが つよすぎて、はさんだ ものを はなせなく なる ことが ある',
      'よるに なると きゅうに かっこよく なる。ひるまは ちょっと ねぼけている',
      'あごの かたちが 1ぴきずつ ちがう。ほんにんも それを じまんに おもっている',
      'だれも たおせなかった。というより、だれも たたかいを もうしこまなかった',
    ],
    rabbit: [
      'みみが からだより おおきい。まだ もてあましている',
      'はねる。とちゅうで こける。また はねる',
      'せなかを むけて すわると まるい。まるすぎて どこが かおか わからない',
      'あなを ほる。ほった ことを わすれて じぶんで おちる',
      'とびすぎて、じぶんの みみに おいつかれる',
      'はしるのが すき というより、とまるのが にがて',
      'しずかに すわって、みみだけ ずっと うごかしている。ぜんぶ きこえている',
      'もう あまり はねない。かわりに ずっと とおくの おとを きいている',
    ],
    fish: [
      'まだ ほとんど とうめい。ひかりに かざすと なかが みえる',
      'ひれの つかいかたを おぼえた。まっすぐ すすめるとは いっていない',
      'かべに ぶつかる。ガラスの そんざいに まだ なっとくしていない',
      'いちばん はやく およげると しんじている。じっさいには 3ばんめ くらい',
      'むれの まんなかが すき。はしっこに なると そわそわする',
      'うろこが ひかる かくどを、じぶんで けんきゅうしている',
      'ふくらむ。おこっている わけでは ない。ただの くせ',
      'ふくらんだまま もどらなく なった。ほんにんは あんまり きにしていない',
    ],
    dragon: [
      'まだ トカゲに しか みえない。ほのおも でない。でも ほこりは たかい',
      'うろこが かたく なってきた。うごくと こつこつ おとが する',
      'はじめて けむりを はいた。じぶんで びっくりして むせた',
      'たからものを あつめはじめた。1こめは ペットボトルの ふた',
      'つばさが おもい。とぶより ひきずって あるく ほうが はやい',
      'ようやく とんだ。ちゃくりくで ちいさな クレーターを つくった',
      'そらに いる ときだけ しずか。じめんに おりると よく しゃべる',
      'せなかに くもが かかる おおきさ。もう だれも おおきさを はかろうと しない',
    ],
    panda: [
      'ピンクいろで、まだ しろくろに なっていない。この きかんは とても みじかい',
      'あるく というより、ころがって いどうしている',
      'きに のぼる。おりかたを かんがえずに のぼる',
      'いちにち 12じかん ささを たべる。のこりの じかんは ねる',
      'さかを みつけると かならず ころがる。りゆうは ない',
      'めの まわりの もようが すこし ずれている。それが チャームポイント',
      'うごかない。うごかないのに、みんなが みている',
      'ささを ゆっくり かむ。かむ おとだけが ずっと きこえている',
    ],
    fox: [
      'しっぽが からだと おなじ おおきさ。バランスが とれていない',
      'ないている ふりを して おやつを もらおうと する。まだ へた',
      'しっぽを じぶんで おいかける。かならず まける',
      'かくれるのが うまい。うますぎて じぶんの ばしょを わすれる',
      'はしる ルートを 3とおり かんがえてから うごく',
      'よるの まちを あるく。なぜか みんなが みちを ゆずる',
      'うそは つかない。ただ ぜんぶは いわない',
      'マフラーが にあう。だれに もらったのかは おしえてくれない',
    ],
    owl: [
      'まんまる。まだ めが あいていないのに、こっちを むいている',
      'めを あけた。ひとみが おおきすぎて、みているだけで ちょっと こわい',
      'くびが よく まわる。まわしすぎて じぶんで おどろく',
      'ひるまに ねて、よるに おおさわぎする。まわりは めいわく している',
      'とぶ おとが しない。ほんにんは それが ふつうだと おもっている',
      'しつもんに こたえない。かんがえている ふりが とても じょうず',
      'なんでも しっている ような かおを する。じっさい わりと しっている',
      'なにも いわない。でも まえに すわると、なぜか なやみが かたづく',
    ],
    plant: [
      'つちの なかで、そとの ひかりを もう しっている',
      'はっぱが 2まい。せかいの すべてが この 2まいに かかっている',
      'せのびを する。かぜが ふくと けっこう こわい',
      'なかに なにいろが はいっているか、ほんにんも まだ しらない',
      'すこしだけ ひらいた。ここから さきは いっきに いく',
      'さいた。まわりの くうきの いろまで かわった き が する',
      'みているだけで、なぜか すこし なきそうに なる',
      'はなびらが おちる。その したに、もう つぎの たねが おちている',
    ],
    robot: [
      'まだ ねじが 3ぼん たりない。それでも うごこうと する',
      'でんげんが はいった。さいしょに はっした ことばは「…おなか すいた?」',
      'あるきかたを おぼえた。ただし よこあるき だけ',
      'にんげんの ジョークを がくしゅう中。まだ わらう タイミングが 0.4びょう おそい',
      'うでが ぎんいろに なった。もちあげられる ものが きゅうに ふえた',
      'せんとうようだが、たたかった ことは 1どもない',
      'ぴかぴか。かがみの まえで じぶんを みがく きのうが ついている',
      'すこし さびた。うごく おとが うるさい。でも みんな その おとが すき',
    ],
    dinosaur: [
      'たまごの からを まだ あたまに のせている。とるのを わすれている',
      'よちよち あるく。しっぽで バランスを とっている つもりだが とれていない',
      'せなかの とげが ちくちく する。だきしめると いたい',
      'なんでも かじる。かじった あと、あじの かんそうを のべる',
      'はが するどい。でも すきな たべものは やわらかい みどりの やつ',
      'ほえる れんしゅうを している。まだ こえが うらがえる',
      'あるくと じめんが ゆれる。ほんにんは そっと あるいている つもり',
      'ほねに なっても うごいている。だれも つっこまない',
    ],
    god: [
      'あかちゃん。ただし ひかっている',
      'はねが はえてきた。まだ かざり',
      'そらを とべる。とべるのに、なぜか あるいて いどうする',
      'きせきを 1つ おこせる。だいたい くだらない ことに つかう',
      'まわりの ひとが なぜか せすじを のばす',
      'いのりが とどく ように なった。だいたい ぜんぶ かなえて しまう',
      'そこに いるだけで、まわりの おとが すこし とおく なる',
      'かおが もう たいように なっている。とくに せつめいは ない',
    ],
    ren: [
      'なぜ ここに にんげんの あかちゃんが いるのか。だれも しつもんしない',
      'よちよち あるく。ときどき ふりむいて、こちらを みて わらう',
      'とつぜん あらわれて、とつぜん なかまに なっている',
      'なにを かんがえているのか わからない。ほんにんも たぶん わかっていない',
      'いたずらを する。おこられると なぜか こっちが わるい きに なる',
      'きゅうに おとなに なった。せは のびたが、なかみは そんなに かわっていない',
      'この せかいの ルールから、ひとりだけ すこし はずれている',
      'さいごまで、なんで いたのかは わからなかった。でも いなかったら さみしかった',
    ],
    mermaid: [
      'かいがら。ときどき ぷくっと あわが でる。それだけ',
      'うろこが きらめきだした。ひかりの かげんで にじいろに なる',
      'こえが きれい。ただし うたうと かならず あわが でて とちゅうで きれる',
      'ふねの ロープを ひっぱって あそぶ。おこられても また やる',
      'うずしおの まんなかを へいきで つっきる',
      'かみを とかす じかんが ながい。うみの そこには かがみが ない のに',
      'みずめんに すわって うたう。きいた ものは その ひの ことを おぼえていない',
      'うみの おとが、この こが いる ところだけ しずかに なる',
    ],
    unicorn: [
      'つのが ぽつんと 1つ。まだ ただの こぶに みえる',
      'よちよち あるく。あしが ながすぎて じぶんで つまずく',
      'つのが ひかる ように なった。よるは まくらもとの あかりに ちょうどいい',
      'つのに いろんな ものを ひっかけて はしりまわる',
      'たてがみが、かぜも ないのに ゆれる',
      'はしった あとに、ひかりが すこし のこる',
      'ちかづくと、なぜか うそが つけなく なる',
      'つのの さきに、ちいさな ほしが ひとつ ついている',
    ],
    phoenix: [
      'あたたかい。あたたかすぎて、もつと ちょっと あつい',
      'よちよち あるく。あるいた あとが すこし こげている',
      'はねの さきが ゆらゆら もえている。ほんにんは すずしい かお',
      'とんだ あとに ひのこが まう。まわりは いつも すこし あわてている',
      'つばさを ひろげると、よるでも あさに みえる',
      'いちど もえつきた。3びょうで もどってきた',
      'なんども しんで、なんども かえってくる。もう かぞえていない',
      'おわりが ない。だから いそがない',
    ],
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
    onetimeItemGrid: document.getElementById('onetimeItemGrid'),
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
    worldSeasonMenuBtn: document.getElementById('worldSeasonMenuBtn'),
    worldTravelBtn: document.getElementById('worldTravelBtn'),
    worldDateBtn: document.getElementById('worldDateBtn'),
    worldDateHint: document.getElementById('worldDateHint'),
    dateOverlay: document.getElementById('dateOverlay'),
    dateChooser: document.getElementById('dateChooser'),
    dateChoiceGrid: document.getElementById('dateChoiceGrid'),
    dateCancelBtn: document.getElementById('dateCancelBtn'),
    dateMovie: document.getElementById('dateMovie'),
    dateMovieScene: document.getElementById('dateMovieScene'),
    dateMoviePlace: document.getElementById('dateMoviePlace'),
    dateMoviePet: document.getElementById('dateMoviePet'),
    dateMoviePartner: document.getElementById('dateMoviePartner'),
    dateMovieCaption: document.getElementById('dateMovieCaption'),
    dateMovieSkipBtn: document.getElementById('dateMovieSkipBtn'),
    dateMovieCloseBtn: document.getElementById('dateMovieCloseBtn'),
    seasonOverlay: document.getElementById('seasonOverlay'),
    seasonCloseBtn: document.getElementById('seasonCloseBtn'),
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
      sandUsed: 0,
      bigSandUsed: 0,
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
        // 「せかい いっしゅう(ぜんぶの地域8つ)」の じょうけんを かえない
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
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return freshState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') throw new Error('invalid save payload');
      // マイグレーションで万一エラーが起きても元セーブを失わないよう、
      // 読み込み成功した生データを別キーにも退避してから加工する。
      try { localStorage.setItem(SAVE_BACKUP_KEY, raw); } catch (backupError) { /* storage unavailable */ }
      const merged = { ...freshState(), ...parsed };
      // lifetime is a nested object, so the shallow merge above replaces it
      // wholesale with the save's own (possibly older, field-missing)
      // lifetime rather than filling gaps - patch those gaps in explicitly
      // so a field added in a later version doesn't come back undefined
      merged.lifetime = { ...freshState().lifetime, ...(parsed.lifetime || {}) };
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
    } catch (e) {
      // 以前はここで freshState() を返し、起動直後の saveState() がそのまま
      // 元セーブを上書きしていた。読み込み失敗を「新規ゲーム」と誤認しない。
      // まずバックアップ、次に現在キーの生JSONから、危険なマイグレーションを
      // 通さない最小復旧を試す。復旧できた場合はこの起動中に警告を出す。
      const candidates = [];
      try { candidates.push(localStorage.getItem(SAVE_BACKUP_KEY)); } catch (ignore) {}
      try { candidates.push(localStorage.getItem(SAVE_KEY)); } catch (ignore) {}
      for (const candidate of candidates) {
        if (!candidate) continue;
        try {
          const parsed = JSON.parse(candidate);
          if (!parsed || typeof parsed !== 'object') continue;
          const recovered = { ...freshState(), ...parsed };
          recovered.lifetime = { ...freshState().lifetime, ...(parsed.lifetime || {}) };
          if (!Array.isArray(recovered.discoveredStages)) recovered.discoveredStages = [];
          if (!Array.isArray(recovered.achievementsUnlocked)) recovered.achievementsUnlocked = [];
          if (!Array.isArray(recovered.companions)) recovered.companions = [];
          stateLoadRecovered = true;
          return recovered;
        } catch (ignore) { /* try next candidate */ }
      }
      // 何も復元できない場合でも、起動直後に空データを自動保存しないための印。
      stateLoadRecovered = true;
      return freshState();
    }
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
    { id: 'evolve-1', emoji: '🌱', label: 'はじめの いっぽ', desc: 'はじめて そだちが あがった', condition: (l) => l.evolutions >= 1 },
    { id: 'devolve-1', emoji: '👶', label: 'はじめての おとろえ', desc: 'はじめて そだちが さがった', condition: (l) => l.devolutions >= 1 },
    { id: 'transform-1', emoji: '✨', label: 'はじめての へんしん', desc: 'はじめて へんしんした', condition: (l) => l.transforms >= 1 },
    { id: 'death-1', emoji: '👻', label: 'はじめての おわかれ', desc: 'はじめて てんごくに いった', condition: (l) => l.deaths >= 1 },
    { id: 'minigame-50', emoji: '🎮', label: 'あそびの みならい', desc: 'ミニゲームを 50かい あそんだ', condition: (l) => l.minigamesPlayed >= 50 },
    { id: 'sick-cured-1', emoji: '💉', label: 'はじめての かんびょう', desc: 'はじめて びょうきを なおした', condition: (l) => l.sicknessCured >= 1 },
    { id: 'age-10', emoji: '🐣', label: 'ひよっこ そだち', desc: 'ねんれい10に とうたつした', condition: (l) => l.maxAgeReached >= 10 },
    { id: 'shop-1', emoji: '🎁', label: 'はじめての おかいもの', desc: 'アイテムを はじめて こうにゅうした', condition: (l) => l.ownedShopItems.length >= 1 },
    { id: 'consumable-1', emoji: '🎈', label: 'はじめての おたのしみ', desc: 'おたのしみを はじめて つかった', condition: (l) => (l.consumablesUsed || 0) >= 1 },
    { id: 'money-100', emoji: '💰', label: 'ちょきんか デビュー', desc: 'しょじきんが 100に とうたつした', condition: (l) => l.money >= 100 },
    { id: 'region-3', emoji: '🧳', label: 'たびずき', desc: '3つの地域を おとずれた', condition: (l) => l.regionsVisited.length >= 3 },

    // --- やや かんたん ---
    { id: 'evolve-10', emoji: '🌿', label: 'ぐんぐん そだつ', desc: 'そだちが のべ10 あがった', condition: (l) => l.evolutions >= 10 },
    { id: 'devolve-5', emoji: '🍼', label: 'かえりみち', desc: 'そだちが のべ5 さがった', condition: (l) => l.devolutions >= 5 },
    { id: 'transform-10', emoji: '🌟', label: 'へんしん ざんまい', desc: '10かい へんしんした', condition: (l) => l.transforms >= 10 },
    { id: 'sick-cured-10', emoji: '💊', label: 'めいいの たまご', desc: 'びょうきを 10かい なおした', condition: (l) => l.sicknessCured >= 10 },
    { id: 'age-25', emoji: '🌼', label: 'すくすく せいちょう', desc: 'ねんれい25に とうたつした', condition: (l) => l.maxAgeReached >= 25 },
    { id: 'dex-25', emoji: '📗', label: 'ずかんの はじまり', desc: 'ずかんを 25しゅるい うめた', condition: (l, s) => s.discoveredStages.length >= 25 },
    { id: 'feed-100', emoji: '🍚', label: 'ごはん だいすき', desc: '1しょうがいで ごはんを 100かい あげた', condition: (l, s) => s.actionCounts.feed >= 100 },
    { id: 'play-100', emoji: '🎯', label: 'あそびっぱなし', desc: '1しょうがいで 100かい あそんだ', condition: (l, s) => s.actionCounts.play >= 100 },
    { id: 'pet-100', emoji: '🤲', label: 'なでなで まめ', desc: '1しょうがいで なでるを 100かい した', condition: (l, s) => s.actionCounts.pet >= 100 },
    { id: 'talk-100', emoji: '💬', label: 'おしゃべりずき', desc: '1しょうがいで はなしかけるを 100かい した', condition: (l, s) => s.actionCounts.talk >= 100 },
    { id: 'gentle-10', emoji: '💗', label: 'やさしい こころ', desc: 'やさしい せんたくを 1しょうがいで 10かい した', condition: (l, s) => s.traitCounts.gentle >= 10 },
    { id: 'brave-10', emoji: '🦁', label: 'ゆうかんな こころ', desc: 'ゆうかんな せんたくを 1しょうがいで 10かい した', condition: (l, s) => s.traitCounts.brave >= 10 },
    { id: 'romantic-10', emoji: '💘', label: 'ロマンチスト', desc: 'ロマンチックな せんたくを 1しょうがいで 10かい した', condition: (l, s) => s.traitCounts.romantic >= 10 },
    { id: 'companion-1', emoji: '🐾', label: 'はじめての なかま', desc: 'はじめて なかまが できた', condition: (l) => l.companionsRecruited.length >= 1 },
    { id: 'partner-1', emoji: '💑', label: 'はじめての こいびと', desc: 'はじめて こいびとが できた', condition: (l) => l.partnersRecorded.length >= 1 },
    { id: 'money-500', emoji: '💴', label: 'おおがねもち', desc: 'しょじきんが 500に とうたつした', condition: (l) => l.money >= 500 },

    // --- ふつう ---
    { id: 'death-5', emoji: '💀', label: 'なんども おわかれ', desc: '5かい てんごくに いった', condition: (l) => l.deaths >= 5 },
    { id: 'minigame-300', emoji: '🕹️', label: 'あそび どっぷり', desc: 'ミニゲームを 300かい あそんだ', condition: (l) => l.minigamesPlayed >= 300 },
    { id: 'age-50', emoji: '🎂', label: 'はんせいき', desc: 'ねんれい50に とうたつした', condition: (l) => l.maxAgeReached >= 50 },
    { id: 'dex-50', emoji: '📘', label: 'ずかん なかば', desc: 'ずかんを 50しゅるい うめた', condition: (l, s) => s.discoveredStages.length >= 50 },
    { id: 'rare-line-1', emoji: '🌈', label: 'レアな であい', desc: 'レアな しゅぞく(かみさま/れんくん/にんぎょ/ユニコーン/フェニックス)に 1かい であった', condition: (l, s) => s.discoveredStages.some((e) => RARE_LINES.includes(e.split(':')[0])) },
    { id: 'clean-50', emoji: '🧹', label: 'ピカピカ 50かい', desc: '1しょうがいで そうじを 50かい した', condition: (l, s) => s.actionCounts.clean >= 50 },
    { id: 'reset-5', emoji: '🔄', label: 'なんども ちょうせん', desc: '「はじめから」を 5かい した', condition: (l) => (l.resets || 0) >= 5 },
    { id: 'companion-5', emoji: '🐕', label: 'にぎやかな なかよしグループ', desc: 'なかまが 5にん できた', condition: (l) => l.companionsRecruited.length >= 5 },
    { id: 'companion-active-5', emoji: '💞', label: 'そばに いる しあわせ', desc: 'いま そばに いる なかまが 5にん いる', condition: (l, s) => s.companions.length >= 5 },
    { id: 'married-1', emoji: '💍', label: 'はじめての けっこん', desc: 'はじめて けっこんした', condition: (l) => l.partnersMarried.length >= 1 },

    // --- そだち・いっしょう(あたらしい じっせき) ---
    { id: 'sodachi-70', emoji: '🌟', label: 'よく そだてた', desc: 'そだちが 70に とうたつした', condition: (l) => (l.bestSodachi || 0) >= 70 },
    { id: 'sodachi-90', emoji: '💫', label: 'でんせつの そだて', desc: 'そだちが 90に とうたつした', condition: (l) => (l.bestSodachi || 0) >= 90 },
    { id: 'sodachi-100', emoji: '👑', label: 'さいこうの そだち', desc: 'そだちが 100に とうたつした', condition: (l) => (l.bestSodachi || 0) >= 100 },
    { id: 'lifeclear-1', emoji: '🎊', label: 'はじめての いっしょうクリア', desc: '100さいまで いき、そだち70いじょうに とどいた', condition: (l) => (l.lifeClears || 0) >= 1 },
    { id: 'lifeclear-10', emoji: '🏵️', label: 'じんせい 10しゅう', desc: 'いっしょうクリアを 10かい した', condition: (l) => (l.lifeClears || 0) >= 10 },
    { id: 'bestlife-1', emoji: '🌈', label: 'さいこうの いっしょう', desc: '100さいまで いき、そだち100に とうたつした', condition: (l) => (l.bestLives || 0) >= 1 },
    { id: 'pastlives-10', emoji: '📔', label: 'じゅうにんの なおとっち', desc: '10にんの なおとっちを そだてた', condition: (l) => (l.pastLives || []).length >= 10 },
    { id: 'nodecline', emoji: '🕊️', label: 'いちども おとろえなかった', desc: 'おとろえゼロの まま 100さいまで いきた', condition: (l) => (l.flawlessLives || 0) >= 1 },

    // --- ややむずかしい ---
    { id: 'evolve-50', emoji: '🌳', label: 'そだちの あしあと', desc: 'そだちが のべ50 あがった', condition: (l) => l.evolutions >= 50 },
    { id: 'devolve-20', emoji: '😵‍💫', label: 'おとろえの ぬし', desc: 'そだちが のべ20 さがった', condition: (l) => l.devolutions >= 20 },
    { id: 'transform-25', emoji: '💫', label: 'へんしん 25れんぱつ', desc: '25かい へんしんした', condition: (l) => l.transforms >= 25 },
    { id: 'death-10', emoji: '⚰️', label: 'てんごくの じょうれんきゃく', desc: '10かい てんごくに いった', condition: (l) => l.deaths >= 10 },
    { id: 'sick-cured-30', emoji: '🏥', label: 'めいいの たまご(じょうきゅう)', desc: 'びょうきを 30かい なおした', condition: (l) => l.sicknessCured >= 30 },
    { id: 'age-100', emoji: '🎊', label: 'ひゃくさい ばんざい', desc: 'ねんれい100に とうたつした', condition: (l) => l.maxAgeReached >= 100 },
    { id: 'medicine-30', emoji: '🩹', label: 'かんごし はだし', desc: '1しょうがいで くすりを 30かい あげた', condition: (l, s) => s.actionCounts.medicine >= 30 },
    { id: 'region-all', emoji: '🌍', label: 'せかい いっしゅう', desc: 'ぜんぶの地域(8つ)を おとずれた', condition: (l) => l.regionsVisited.length >= REGIONS.length },
    { id: 'consumable-30', emoji: '🫧', label: 'おたのしみ いっぱい', desc: 'おたのしみを 30かい つかった', condition: (l) => (l.consumablesUsed || 0) >= 30 },

    // --- むずかしい ---
    { id: 'evolve-100', emoji: '🌲', label: 'そだての きわみ', desc: 'そだちが のべ100 あがった', condition: (l) => l.evolutions >= 100 },
    { id: 'clear-1', emoji: '🏅', label: 'てんじゅを まっとうした', desc: 'はじめて 100さいまで いきた', condition: (l) => l.clears >= 1 },
    { id: 'dex-100', emoji: '📙', label: 'ずかん たいはん', desc: 'ずかんを 100しゅるい うめた', condition: (l, s) => s.discoveredStages.length >= 100 },
    { id: 'every-normal-line', emoji: '🐾', label: 'どうぶつ はかせ', desc: 'ふつうの16しゅぞく すべてに であった', condition: (l, s) => NORMAL_LINES.every((line) => s.discoveredStages.some((e) => e.startsWith(`${line}:`))) },
    { id: 'reset-20', emoji: '♾️', label: 'むげんループの たび', desc: '「はじめから」を 20かい した', condition: (l) => (l.resets || 0) >= 20 },
    { id: 'married-3', emoji: '👰', label: 'なんども ウェディング', desc: '3にんと けっこんした(いろんな 人生で)', condition: (l) => l.partnersMarried.length >= 3 },
    { id: 'naoto-1', emoji: '🧿', label: 'でんせつへの いっぽ', desc: '「なおとの〜」でんせつアイテムを はじめて てにいれた', condition: (l) => (l.ownedNaotoItems || []).length >= 1 },

    // --- かなり むずかしい ---
    { id: 'clear-5', emoji: '🏆', label: 'いつつの いっしょう', desc: '5かい 100さいまで いきた', condition: (l) => l.clears >= 5 },
    { id: 'minigame-1000', emoji: '🎰', label: '1000かい あそんだ', desc: 'ミニゲームを 1000かい あそんだ', condition: (l) => l.minigamesPlayed >= 1000 },
    { id: 'rare-line-all', emoji: '🎇', label: 'でんせつ コレクター', desc: 'レアな しゅぞく5しゅるい すべてに であった', condition: (l, s) => RARE_LINES.every((line) => s.discoveredStages.some((e) => e.startsWith(`${line}:`))) },
    { id: 'elder-collector', emoji: '👴', label: 'ちょうろう はかせ', desc: '10しゅるい いじょうの さいごの すがたに であった', condition: (l, s) => s.discoveredStages.filter((e) => e.endsWith(':7')).length >= 10 },
    { id: 'companion-all', emoji: '🎉', label: 'なかま だいしゅうごう', desc: 'なかまを ぜんいん(10にん)あつめた', condition: (l) => l.companionsRecruited.length >= COMPANIONS.length },
    { id: 'perfect-life', emoji: '🏵️', label: 'かんぺきな なおとっちライフ', desc: 'けっこんも なかま10にん あつめるのも りょうほう たっせいした', condition: (l) => l.partnersMarried.length >= 1 && l.companionsRecruited.length >= COMPANIONS.length },

    // --- 超むずかしい ---
    { id: 'clear-10', emoji: '👑', label: 'とおの いっしょう', desc: '10かい 100さいまで いきた', condition: (l) => l.clears >= 10 },
    { id: 'dex-150', emoji: '📕', label: 'ずかん もうすぐ', desc: 'ずかんを 150しゅるい うめた', condition: (l, s) => s.discoveredStages.length >= 150 },
    { id: 'partner-all', emoji: '🌏', label: 'れんあい たっせいしゃ', desc: '全8地域16人の こいびと候補 ぜんいんと であった', condition: (l) => l.partnersRecorded.length >= ALL_PARTNER_CANDIDATES.length },

    // --- きわめて むずかしい ---
    { id: 'clear-25', emoji: '🎖️', label: 'いっしょうの でんせつ', desc: '25かい 100さいまで いきた', condition: (l) => l.clears >= 25 },
    { id: 'dex-complete', emoji: '📖', label: 'ずかん コンプリート', desc: 'ずかんを ぜんぶ うめた', condition: (l, s) => s.discoveredStages.length >= ALL_LINES.length * STAGES_PER_LINE },
    { id: 'shop-all', emoji: '🛍️', label: 'みにつけるもの コンプリート', desc: 'みにつける アイテムを ぜんぶ こうにゅうした', condition: (l) => l.ownedShopItems.length >= SHOP_ITEMS.length },
    { id: 'consumable-all', emoji: '🎪', label: 'おたのしみ コンプリート', desc: 'おたのしみを ぜんぶ つかってみた', condition: (l) => FUN_ITEMS.every((it) => (l.ownedConsumableItems || []).includes(it.id)) },
    { id: 'item-all', emoji: '💯', label: 'アイテム パーフェクトコレクション', desc: 'みにつけるものを ぜんぶ集め、おたのしみも ぜんぶ使った', condition: (l) => l.ownedShopItems.length >= SHOP_ITEMS.length && FUN_ITEMS.every((it) => (l.ownedConsumableItems || []).includes(it.id)) },
  ];

  function checkAchievements() {
    state.lifetime.maxAgeReached = Math.max(state.lifetime.maxAgeReached, currentAge());
    for (const ach of ACHIEVEMENTS) {
      if (state.achievementsUnlocked.includes(ach.id)) continue;
      if (!ach.condition(state.lifetime, state)) continue;
      state.achievementsUnlocked.push(ach.id);
      // a minigame overlay owns the screen while gameActive - the unlock
      // is still recorded, just shown silently until it's safe to flash
      if (!gameActive) showStoryEvent({ emoji: ach.emoji, message: `じっせき かいほう!「${ach.label}」` });
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
  // ①〜③は100さいの人生評価、④は通常図鑑168形態、⑤は全実績。
  // ①〜③を同じ人生で同時達成した場合は最高位だけを大きく見せる。
  const ENDING_TIER_ICONS = ['🎉', '🏮', '🌳', '📖', '👑'];
  const ENDING_TIERS = [
    {
      title: 'てんじゅを まっとうした!',
      confetti: '🌇✨🎉✨🌇',
      badges: ['★① てんじゅを まっとうした'],
      desc: '100さいまで いっしょうを いきぬいた!<br>つぎのゴール: 100さい ＋ そだち70いじょう',
    },
    {
      title: 'いっしょうクリア!',
      confetti: '🏮✨🌙✨🏮',
      badges: ['★① てんじゅ', '★② いっしょうクリア'],
      desc: 'よく そだてながら、100さいまで いきぬいた!<br>つぎのゴール: 100さい ＋ そだち100',
    },
    {
      title: 'さいこうの いっしょう!',
      confetti: '🌳✨🌈✨🌳',
      badges: ['★① てんじゅ', '★② いっしょう', '★③ さいこうのいっしょう'],
      desc: 'そだち100。そして、100さいまで いきぬいた。<br>つぎは ずかん168しゅるいを ぜんぶ みつけよう!',
    },
    {
      title: 'ずかんクリア!',
      confetti: '📖✨👑✨📖',
      badges: ['📖 ④ ずかんクリア'],
      desc: '168 / 168　すべての すがたを みつけた!<br>……でも、まだ だれか いるみたい。　SECRET ???<br>のこった じっせきを すべて たっせいしよう!',
    },
    {
      title: 'PERFECT CLEAR!',
      confetti: '👑✨🌈♾️🌈✨👑',
      badges: ['📖 ④ ずかんクリア', '👑 ⑤ PERFECT CLEAR'],
      desc: 'ずかんも、じっせきも、ぜんぶ コンプリート!<br>♾️ の せかいが ひらいた!',
    },
  ];

  // 本体・がめんの いろを えらべる きのう。さいしょの6しょくは いつでも
  // えらべ、のこり4しょくは 4段階の クリアパターン(ENDING_TIERS、上の
  // endingTiersReached)を それぞれ 一度でも たっせいすると てにはいる、
  // 永続の ごほうび(unlockTier が その ENDING_TIERS の インデックス。
  // レインボーだけは 4つ ぜんぶ そろって はじめて 解放される ので
  // unlockAll を つかう)。deviceSwatch/screenSwatch は それぞれの グリッドの
  // プレビュー丸に つかう いろ - "default"(はじめから の くみあわせ)だけ
  // ほんたい(もも)と がめん(みどりの LCD)で いろが ちがうので わけてある
  const COLOR_THEMES = [
    { id: 'default', label: 'クラシック', deviceSwatch: '#ff7ab8', screenSwatch: '#9bd68d' },
    { id: 'sky', label: 'そら', deviceSwatch: '#6fa8ff', screenSwatch: '#8ecbe8' },
    { id: 'mint', label: 'ミント', deviceSwatch: '#5fe0a0', screenSwatch: '#8de8c0' },
    { id: 'lavender', label: 'ラベンダー', deviceSwatch: '#b98aff', screenSwatch: '#c9b3f0' },
    { id: 'lemon', label: 'レモン', deviceSwatch: '#ffe066', screenSwatch: '#f0e28d' },
    { id: 'charcoal', label: 'すみいろ', deviceSwatch: '#444444', screenSwatch: '#8a9a8a' },
    { id: 'coral', label: 'さんごいろ', deviceSwatch: '#ff8a80', screenSwatch: '#ffab9e' },
    { id: 'peach', label: 'ピーチ', deviceSwatch: '#ffb27a', screenSwatch: '#ffd4a8' },
    { id: 'turquoise', label: 'ターコイズ', deviceSwatch: '#33c9c9', screenSwatch: '#7fe0e0' },
    { id: 'indigo', label: 'あいいろ', deviceSwatch: '#3f5f9e', screenSwatch: '#93a9cc' },
    { id: 'olive', label: 'オリーブ', deviceSwatch: '#8a9a5b', screenSwatch: '#c3d19c' },
    { id: 'mustard', label: 'からしいろ', deviceSwatch: '#d9a441', screenSwatch: '#ecc98a' },
    { id: 'sakura', label: 'さくらいろ', deviceSwatch: '#ffb7c5', screenSwatch: '#ffd6df' },
    { id: 'crystal', label: 'すいしょう', deviceSwatch: '#a9c6d8', screenSwatch: '#d3e6ef' },
    { id: 'wakakusa', label: 'わかくさ', deviceSwatch: '#9fcf5a', screenSwatch: '#c9e692' },
    { id: 'grape', label: 'ぶどういろ', deviceSwatch: '#7d4fae', screenSwatch: '#b493d6' },
    { id: 'apricot', label: 'あんずいろ', deviceSwatch: '#f4a86a', screenSwatch: '#f8c99a' },
    { id: 'navy', label: 'こんじょう', deviceSwatch: '#2d4a73', screenSwatch: '#6d8bb0' },
    { id: 'crimson', label: 'べにいろ', deviceSwatch: '#c94f5c', screenSwatch: '#e08a92' },
    { id: 'rosegold', label: 'ローズゴールド', deviceSwatch: '#d9a5a0', screenSwatch: '#ecc9c4' },
    { id: 'sunset', label: 'ゆうやけ', deviceSwatch: '#ff8965', screenSwatch: '#f0b98d', unlockTier: 0 },
    { id: 'dawn', label: 'あさやけ', deviceSwatch: '#ffcf8f', screenSwatch: '#ffe0b8', unlockTier: 0 },
    { id: 'twilight', label: 'たそがれ', deviceSwatch: '#6b6ea8', screenSwatch: '#a3a8d1', unlockTier: 0 },
    { id: 'flame', label: 'ほのお', deviceSwatch: '#ff5e3a', screenSwatch: '#ff9a72', unlockTier: 0 },
    { id: 'amber', label: 'こはくいろ', deviceSwatch: '#e8a33d', screenSwatch: '#f5c97a', unlockTier: 0 },
    { id: 'forest', label: 'しんりん', deviceSwatch: '#4caf6e', screenSwatch: '#6fae7a', unlockTier: 1 },
    { id: 'stream', label: 'せせらぎ', deviceSwatch: '#4fb8b0', screenSwatch: '#8fd9d2', unlockTier: 1 },
    { id: 'grove', label: 'こだちいろ', deviceSwatch: '#1f5c38', screenSwatch: '#5a9268', unlockTier: 1 },
    { id: 'moonlight', label: 'つきかげ', deviceSwatch: '#b8c4d9', screenSwatch: '#e0e6f0', unlockTier: 1 },
    { id: 'mist', label: 'もりのきり', deviceSwatch: '#a8c9a0', screenSwatch: '#d3e6cd', unlockTier: 1 },
    { id: 'gold', label: 'おうごん', deviceSwatch: '#ffd76a', screenSwatch: '#e8cf7a', unlockTier: 2 },
    { id: 'galaxy', label: 'ぎんが', deviceSwatch: '#4a3f7a', screenSwatch: '#8577b3', unlockTier: 3 },
    { id: 'jade', label: 'ひすい', deviceSwatch: '#2f9e7a', screenSwatch: '#6fcaac', unlockTier: 2 },
    { id: 'ruby', label: 'ルビー', deviceSwatch: '#a3243f', screenSwatch: '#d1637a', unlockTier: 2 },
    { id: 'sapphire', label: 'サファイア', deviceSwatch: '#2a4d8f', screenSwatch: '#6a8fc9', unlockTier: 2 },
    {
      id: 'rainbow',
      label: 'レインボー',
      deviceSwatch: 'linear-gradient(90deg, #ff5ea8, #ffd23f, #55e6a5, #4fc3f7, #c77dff)',
      screenSwatch: 'linear-gradient(90deg, #ff5ea8, #ffd23f, #55e6a5, #4fc3f7, #c77dff)',
      unlockAll: true,
    },
    {
      id: 'aurora',
      label: 'オーロラ',
      deviceSwatch: 'linear-gradient(90deg, #43e97b, #38f9d7, #6a82fb, #fc5c7d)',
      screenSwatch: 'linear-gradient(90deg, #43e97b, #38f9d7, #6a82fb, #fc5c7d)',
      unlockTier: 4,
    },
    {
      id: 'radiance',
      label: 'こうごん',
      deviceSwatch: 'linear-gradient(90deg, #fff6d5, #ffe066, #ffd700, #f5b942)',
      screenSwatch: 'linear-gradient(90deg, #fff6d5, #ffe066, #ffd700, #f5b942)',
      unlockTier: 4,
    },
    { id: 'starlight', label: 'せいざ', deviceSwatch: '#2e1a47', screenSwatch: '#4a3564', unlockTier: 4 },
    {
      id: 'prism',
      label: 'にじいろのプリズム',
      deviceSwatch: 'radial-gradient(circle, #ff5ea8, #ffd23f, #55e6a5, #4fc3f7, #c77dff)',
      screenSwatch: 'radial-gradient(circle, #ff5ea8, #ffd23f, #55e6a5, #4fc3f7, #c77dff)',
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
    { id: 'pinstripe', label: 'ピンストライプ', emoji: '➖' },
    { id: 'brick', label: 'れんが', emoji: '🧱' },
    { id: 'herringbone', label: 'やまがた', emoji: '🪵' },
    { id: 'scallop', label: 'うろこ', emoji: '🐟' },
    { id: 'bubbles', label: 'あわ', emoji: '🫧' },
    { id: 'zigzag', label: 'ジグザグ', emoji: '⚡' },
    { id: 'rings', label: 'みずのわ', emoji: '⭕' },
    { id: 'tartan', label: 'タータン', emoji: '🧣' },
    { id: 'bigdots', label: 'みずたま(おおきめ)', emoji: '🔴' },
    { id: 'starburst', label: 'サンバースト', emoji: '☀️' },
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
    { id: 'medallion', label: 'メダリオン', emoji: '🏵️', unlockTier: 2 },
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
    { id: 'flower', label: 'おはな', emoji: '🌼', price: 60, desc: 'きゅうあいが すこし うまくいきやすくなる' },
    { id: 'ribbon', label: 'リボン', emoji: '🎀', price: 60, desc: 'ごきげんが すこし へりにくい' },
    { id: 'bowtie', label: 'ちょうネクタイ', emoji: '🎗️', price: 60, desc: 'おなかが すこし へりにくい' },
    { id: 'poop1', label: 'トイレットペーパー', emoji: '🧻', price: 70, desc: 'うんちが すこし たまりにくい' },
    { id: 'scarf', label: 'マフラー', emoji: '🧣', price: 80, desc: 'びょうきに すこし なりにくい' },
    { id: 'glasses', label: 'サングラス', emoji: '🕶️', price: 90, desc: 'ミニゲームの とくてんが すこし のびる' },
    { id: 'energy1', label: 'げんきバンド', emoji: '⚡', price: 100, desc: 'げんきが すこし へりにくい' },
    { id: 'hat', label: 'シルクハット', emoji: '🎩', price: 110, desc: 'へんしんの ちからが すこし たまりやすい' },
    { id: 'travel1', label: 'リュックサック', emoji: '🎒', price: 120, desc: 'たびから かえったあとの ごきげんが すこし よくなる' },
    { id: 'sleepboost1', label: 'ふかふかまくら', emoji: '🛏️', price: 130, desc: 'ねている ときの げんき回復が すこし ふえる' },
    { id: 'star', label: 'スターバッジ', emoji: '⭐', price: 150, desc: 'ミニゲームの あとに もらえる コインが すこし ふえる' },
    { id: 'bond1', label: 'おともだちバッジ', emoji: '🐾', price: 170, desc: 'なかまの きずなが すこし へりにくい' },
    { id: 'partner1', label: 'らぶれたー', emoji: '💌', price: 190, desc: 'こいびとの なかよし度が すこし へりにくい' },
    { id: 'crown', label: 'かんむり', emoji: '👑', price: 220, desc: 'つらいことが あったとき、いのちが すこし へりにくい' },
    { id: 'itemluck1', label: 'よつばのクローバー', emoji: '🍀', price: 250, desc: 'めずらしい ごほうびに ほんのすこし であいやすくなる' },
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
    { id: 'naoto_charm', label: 'なおとの おまもり', emoji: '🧿', unlockTier: 0, desc: 'ようしょうきと こうれいきの いのちの リスクを すこし やわらげる' },
    { id: 'naoto_lantern', label: 'なおとの ランタン', emoji: '🏮', unlockTier: 1, desc: 'ひみつの たびや ふしぎな できごとが ひらかれる' },
    { id: 'naoto_ring', label: 'なおとの リング', emoji: '💍', unlockTier: 2, desc: 'とくべつな デート・ふうふの ことば・きねんびの おもいでが ひらかれる' },
    { id: 'naoto_crown', label: 'なおとの かんむり', emoji: '👑', unlockTier: 3, desc: 'この せかいの ひみつが みえるようになる。SECRETへの かぎ' },
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

  // いちばん きずな度(bond)の ひくい、いま そばに いる なかまを かえす
  // (companionfull1/companionpartial1 の こうか先を えらぶ ための ヘルパー)
  function lowestBondCompanion() {
    if (!state.companions.length) return null;
    return state.companions.reduce((min, c) => ((c.bond ?? 100) < (min.bond ?? 100) ? c : min), state.companions[0]);
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
  const CONSUMABLE_ITEMS = [];


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

  function saveState() {
    recordDiscovery();
    checkAchievements();
    checkGrandGoals();
    try {
      const previous = localStorage.getItem(SAVE_KEY);
      if (previous) localStorage.setItem(SAVE_BACKUP_KEY, previous);
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
      // storage unavailable; ignore
    }
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  // 0 (freshly hatched) -> 1 (elder age) - every minigame scales its own
  // difficulty knobs off of this so the whole game gets meaner as the pet
  // gets older, instead of staying at "baby" difficulty forever
  function ageDifficulty() {
    const base = clamp(currentAge() / MAX_DIFFICULTY_AGE, 0, 1);
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

  // 「まちがえた ことは わかるが、ゲームじたいは とめない」けいの ミニ
  // ゲーム(numberOrder・sumPair など)で つかう、かるい 誤操作フィード
  // バック。revealAndProceed()とはちがい ゲームの すすみを ブロックせず、
  // ちいさな シェイク+❌を つけて すぐ もとに もどす だけ
  function flashMistake(el) {
    if (!el) return;
    el.classList.add('mg-mistake-flash');
    const mark = document.createElement('span');
    mark.className = 'mg-reveal-mark';
    mark.textContent = '❌';
    el.appendChild(mark);
    setTimeout(() => {
      el.classList.remove('mg-mistake-flash');
      mark.remove();
    }, 300);
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
  // canvas を おおもとの CSS幅(=ミニゲームがめんの はば)に あわせて
  // 用意する。height は かず、または はば→たかさ の かんすう
  function createMgCanvas(canvas, height) {
    const num = (v, d) => (typeof v === 'number' && v > 0 && isFinite(v) ? v : d);
    const W = Math.round(num(canvas && canvas.clientWidth, 244));
    const H = Math.round(typeof height === 'function' ? height(W) : num(height, 240));
    const dpr = Math.min(2, num(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1));
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
  let message = '';
  let gameActive = false;
  let messageTimer = null;
  // なかまイベントが とちゅうの あいだだけ セットされる、いま くどいて
  // いる COMPANIONS の id。gameActive などと おなじく プレイのたびに
  // リセットされる いちじてきな 状態なので state には いれない
  let pendingCompanionId = null;

  function setMessage(msg) {
    message = msg;
    el.message.textContent = msg;

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

  function hideSpeechBubble() {
    speechActive = false;
    if (speechTimer) { clearTimeout(speechTimer); speechTimer = null; }
    if (el.speechBubble) el.speechBubble.classList.add('hidden');
  }

  function setSpeechBubble(text, speaker) {
    if (!el.speechBubble || !text || !speaker) return;
    if (speechTimer) clearTimeout(speechTimer);
    speechActive = true;
    el.speechSpeaker.textContent = speaker.emoji || '💬';
    el.speechSpeaker.title = speaker.label || '';
    el.speechText.textContent = text;
    el.speechBubble.dataset.kind = speaker.kind || 'pet';
    el.speechBubble.classList.remove('hidden');
    speechTimer = setTimeout(() => {
      speechTimer = null;
      speechActive = false;
      el.speechBubble.classList.add('hidden');
    }, SPEECH_DURATION_MS);
  }

  function sayPet(text) {
    if (!text) return;
    setSpeechBubble(text, petSpeaker());
  }

  function sayReactionPool(poolKey) {
    const pool = STORY_EVENT_POOLS[poolKey];
    if (!pool || !pool.length) return;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    // 絵文字は吹き出しの話し言葉では省き、本人の言葉として見せる。
    sayPet(picked.message);
  }

  function petSpeaker() {
    return { kind: 'pet', emoji: currentSprite(), label: SPECIES_DISPLAY_NAMES[state.speciesLine] || 'なおとっち' };
  }

  function partnerSpeaker() {
    const p = state.partner;
    return p ? { kind: 'partner', emoji: p.emoji || '💕', label: p.label || 'こいびと' } : null;
  }

  function companionSpeaker() {
    if (!state.companions.length) return null;
    const sc = state.companions[Math.floor(Math.random() * state.companions.length)];
    const c = allCompanionsById(sc.id);
    return c ? { kind: 'companion', emoji: c.emoji, label: c.name } : null;
  }

  // ================================================================
  // なおとっち会話エンジン
  // ================================================================
  // 事実説明は setMessage / 上部イベント表示へ残し、キャラの感情・ツッコミ・
  // ひとりごとはここへ流す。本人→恋人/仲間の順に会話が続くこともある。
  const CONVERSATION_POOLS = {
    feed: {
      pet: ['うまっ!', 'これ毎日でよくない?', '炭水化物は うらぎらない', 'いま たぶん しあわせの かおしてる', 'あと3はい いける気がする'],
      partner: ['食べるの はやすぎ笑', 'くちに ついてるよ', 'ひとくち ちょうだい?', 'また そんなに たべて笑'],
      companion: ['ぼくも!', 'ひとくち!', 'ぜんぶ いる!', 'いいにおい!'],
    },
    overfeed: {
      pet: ['むり。もう はいる ばしょない', 'おなかが たいへんなことに なってる', 'たべるまえの ぼくを とめたい', 'ダイエットは あしたの ぼくに まかせた'],
      partner: ['だから いったのに笑', 'おなか さすろうか?', 'ほんとに ぜんぶ たべたの?'],
      companion: ['ぼくは まだ いける!', 'そのぶん ぼくが たべれば よかったのに!'],
    },
    sleep: {
      pet: ['おやすみ。あしたから ほんきだす', 'もう むり。ねる', '夢で あおう', '5ふんだけ…たぶん'],
      partner: ['おやすみ。へんな夢みないでね', 'ちゃんと ふとん かけてね', '寝顔 みてもいい?'],
      companion: ['もう ねるの?', 'ぼくも ねよ', 'いびき うるさくしないでね!'],
    },
    wake: {
      pet: ['おはよ。まだ ねむい', 'よし、きょうも いきるか', '夢のつづき どこいった?', 'ねた。たぶん げんき'],
      partner: ['おはよう', 'ねぐせ すごいよ笑', 'ちゃんと ねれた?'],
      companion: ['おきたー!', 'あそぼ!', 'ずっと まってた!'],
    },
    clean: {
      pet: ['よし、いいかんじ!', 'なんか へやが ひろくなった きがする', 'これなら ごろごろできる', 'においまで ちがう!', 'ちゃんと 片づくと きもちいい', 'いまの ぼく、ちょっと できる子'],
      partner: ['お、いいじゃん', 'ちゃんと きれいに なったね', 'このくらいなら ずっと いられる笑', 'めずらしく 仕事が はやい', '先に やってくれたんだ。ありがと', 'これなら 今日は くつしたで 歩けるね笑'],
      companion: ['わー!ひろくなった!', 'ここ 走っていい?', 'さっきより ぜんぜん いい!', 'ぼくの せいじゃ ないけど きれい!'],
    },
    medicine_cure: {
      pet: ['まずっ!! でも なおった!', 'げんき もどった!', 'くすりって まずいほど きくの?', 'いまなら なんでも できそう'],
      partner: ['よかった、なおったね', '顔色 もどってきたね', 'もう むりしないでよ', 'まずそうな顔してる笑', '今日は ちょっと ゆっくりしよ'],
      companion: ['それ ぼくには くれないで', 'なおったー!', 'においだけで まずそう!'],
    },
    medicine_wrong: {
      pet: ['びょうきじゃないって!', 'なんで いま!?', 'それ いらない! ほんとに!', 'くすりガチャ やめて'],
      partner: ['それ いま のませるやつ?', 'ちゃんと ようす みてあげて笑'],
      companion: ['ぼくに こないで!', 'にげろー!'],
    },
    play_with: {
      pet: ['うおおおお!', 'もっと!', 'いまの もう1かい!', 'たのしすぎて いみわからん'],
      partner: ['なにしてんの笑', 'たのしそうで なにより', 'ちょっと まぜて'],
      companion: ['顔やめて顔!', 'つかまえた!', 'まだ まけてない!'],
    },
    play_with_annoyed: {
      pet: ['ちょ、しつこい笑', 'もう いいって!', '距離感 バグってるよ', 'いまは ひとりに して!'],
      partner: ['ちょっと やりすぎ笑', '休ませてあげて'],
      companion: ['もう おなかいっぱい!', 'ぼくも ちょっと つかれた!'],
    },
    court: {
      pet: ['すきなんだけど!!!!', 'いま いわないと たぶん むり', '距離 ちかくしていい?', 'その顔 反則', '今日は ちょっと 帰したくないかも'],
      partner: ['声でかい笑', '近い近い笑', 'それ ずるい', 'もうちょっと こっちきて', 'そんな顔されたら こまる'],
      companion: ['また はじまった!', 'ぼく どこ みればいい?', '空気に なるね!'],
    },
    court_fail: {
      pet: ['いまの なしで!', 'しにたいほど はずかしい', 'タイミング ぜったい ちがった', '心だけ 先に 走った'],
      partner: ['いまは ちょっと…', 'きらいじゃないけど、ちょっと まって', '急すぎ笑'],
      companion: ['うわあ…', 'ぼく みてないことにする'],
    },
    age: {
      pet: ['{age}さいに なった!', 'もう {age}さいだって!', '{age}さいの ぼくも よろしく!', '年齢だけ すすむの はやくない?'],
      partner: ['{age}さい おめでとう! 💕', 'また ひとつ おもいでが ふえたね', 'これからも いっしょに いようね'],
      companion: ['{age}さい おめでとう!', 'また おおきく なったね!', 'きょうは ちょっと とくべつだね!'],
    },
    sodachi: {
      pet: ['あれ、目線 ちょっと 高くなった?', 'また そだった!', 'さっきまでの 服なら もう きつそう', '鏡みたら ちょっと 変わってる!'],
      partner: ['ちょっと おとなっぽく なった?', 'あ、ほんとに 変わってる', '前の しゃしんと くらべてみよっか'],
      companion: ['でかく なってる!', 'ぼくより おおきく ならないで!', '昨日と ちがう!'],
    },
    money: {
      pet: ['金だ!!', 'これは 貯金…たぶん', 'いま ちょっと お金持ち', 'コインの音、すき'],
      partner: ['貯金しなよ笑', 'おごってくれる?', 'また すぐ つかわないでね'],
      companion: ['おごって!', 'それ たべれる?', 'ぼくのぶん ある?'],
    },
    travel: {
      pet: ['ついた!', '空気 ちがう!', 'ここ 住めるかな', 'とりあえず 何たべる?', '地図で 見るより ひろい'],
      partner: ['いっしょに 来れてよかった', '写真 とろうよ', '迷子に ならないでね笑'],
      companion: ['走っていい!?', '知らない におい!', 'ここ ぼくの なわばりにする!'],
    },
    transform: {
      pet: ['え、ぼく!?', '鏡 どこ!?', '中身は ぼくのまま…だよね?', '変身ポーズ いる?', 'なんか 強そう'],
      partner: ['似合ってる。見慣れるまで ちょっと かかりそう笑', '急に 変わりすぎ!', 'でも ちゃんと わかるよ'],
      companion: ['だれ!?…あ、きみか!', 'ぼくも へんしんしたい!', 'においは おなじ!'],
    },
    partner_new: {
      pet: ['え、ほんとに!?', 'うれしくて 何から 話せばいいか わからない', '今日を 記念日に しよう', '心臓 うるさい'],
      partner: ['これから よろしくね', 'そんなに にやけないで笑', 'ちゃんと 大事にしてね'],
      companion: ['おめでとー!', 'ぼくのことも 忘れないで!', '空気 よんだほうがいい?'],
    },
    marriage: {
      pet: ['ほんとに けっこんした!', '市役所いく? もういった?', '明日の朝も となりに いるんだね', '指輪 なくさないようにする'],
      partner: ['これからも よろしくね', '逃げないでね笑', '一緒に 年とろうね'],
      companion: ['けっこん!?', 'パーティーは!?', 'ぼくも 家族?'],
    },
    minigame_great: {
      pet: ['見た!? いまの見た!?', 'いまの もう1回 できるかな', 'ドヤがおが もどらない', '手が まだ ちょっと 震えてる笑'],
      partner: ['いまの 見てたよ', 'もう 顔が 得意げ笑', 'さっきの とこ どうやったの?'],
      companion: ['いまの 見た!', 'もう1かい!', 'ぼくも やる!', 'なんで そんな できるの!?'],
    },
    minigame_bad: {
      pet: ['いまのは 練習', '押すところ ひとつ まちがえた', '忘れて', 'もう1回なら さっきより いける'],
      partner: ['はいはい笑', '言い訳 はやいって', '次 がんばろ'],
      companion: ['どんまい!', 'つぎ ぼくにも やらせて!'],
    },
  };

  let conversationTimers = [];
  let conversationBusyUntil = 0;
  let recentConversationLines = [];
  function clearConversationTimers() {
    conversationTimers.forEach((t) => clearTimeout(t));
    conversationTimers = [];
    conversationBusyUntil = 0;
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
  function pickConversationLine(lines, ctx) {
    if (!lines || !lines.length) return null;
    let pool = lines.map((x) => fillConversationLine(x, ctx || {}));
    const fresh = pool.filter((x) => !recentConversationLines.includes(x));
    if (fresh.length) pool = fresh;
    const line = pool[Math.floor(Math.random() * pool.length)];
    recentConversationLines.push(line);
    if (recentConversationLines.length > 24) recentConversationLines.shift();
    return line;
  }
  const PARTNER_DAILY_REACTIONS = {
    cat_ceo:{play_with:['「いま休憩中。……もう少し そのまま」'],medicine_cure:['「体調管理も 仕事のうち。なおって よかった」'],travel:['「移動時間も 予定に 入れといた」'],minigame_great:['「成果は 数字で出ると きもちいいね」'],minigame_bad:['「改善案、あとで まとめよ」']},
    robot_neighbor:{play_with:['「スキンシップ……好感度 上昇を確認」'],medicine_cure:['「バイタル、正常化。安心しました」'],travel:['「未知ノ地域データヲ 取得シマス」'],minigame_great:['「ハイスコアヲ 記録しました」'],minigame_bad:['「再試行デ 改善可能デス」']},
    field_cow:{play_with:['「のんびり しよ」'],medicine_cure:['「元気に なって よかった。草 いる？」'],travel:['「いい草 あるかな」'],minigame_great:['「すごいねえ」'],minigame_bad:['「まあまあ。草でも 食べよ」']},
    sunflower_partner:{play_with:['「もっと こっち 向いて」'],medicine_cure:['「元気なら また きみの方 向ける」'],travel:['「どこでも きみの方は わかるよ」'],minigame_great:['「いま すごく まぶしかった」'],minigame_bad:['「下むかないで。こっち 見て」']},
    forest_bear:{play_with:['「あったかいね」'],medicine_cure:['「よかった。はちみつ たべる？」'],travel:['「つかれたら すぐ 休もう」'],minigame_great:['「すごい。ぎゅーしていい？」'],minigame_bad:['「だいじょうぶ。ゆっくりで いいよ」']},
    grove_deer:{play_with:['「……もう少し 近くても いいよ」'],medicine_cure:['「顔色、もどったね」'],travel:['「しずかな道 みつけた」'],minigame_great:['「見てた。すごかった」'],minigame_bad:['「次は となりで 見てる」']},
    cliff_goat:{play_with:['「じゃれたら 次 のぼろ！」'],medicine_cure:['「元気なら 山いけるね」'],travel:['「あっち、道じゃないけど 行けそう」'],minigame_great:['「その勢いで 崖もいける！」'],minigame_bad:['「近道 探そ！」']},
    high_eagle:{play_with:['「……近い」'],medicine_cure:['「顔が もどった。よかった」'],travel:['「上から 先を 見てくる」'],minigame_great:['「よく 見えてた」'],minigame_bad:['「次は もっと遠くを 見て」']},
    snow_spirit:{play_with:['「つめたくない？」'],medicine_cure:['「熱、もう だいじょうぶ？」'],travel:['「雪があると うれしい」'],minigame_great:['「きらきら してた」'],minigame_bad:['「雪みたいに また 積めばいいよ」']},
    snowman:{play_with:['「ぎゅーは 短めで おねがい」'],medicine_cure:['「なおって よかった。ぼくは とけてない」'],travel:['「日かげルートで いこ」'],minigame_great:['「クールだったね。ぼくほどじゃないけど」'],minigame_bad:['「頭ひやそ。ぼくの横 くる？」']},
    rock_octopus:{play_with:['「どの手で じゃれる？」'],medicine_cure:['「8本で 看病したかい あった！」'],travel:['「荷物 8こまで 持てるよ」'],minigame_great:['「8回 拍手する！」'],minigame_bad:['「8回やれば 1回は勝てる！」']},
    sea_mermaid:{play_with:['「陸の じゃれかたって こう？」'],medicine_cure:['「海の薬より 効いたね」'],travel:['「また 新しい陸 教えて」'],minigame_great:['「海の底まで 自慢しにいこ」'],minigame_bad:['「海なら もっと うまくできるかも」']},
    anglerfish:{play_with:['「灯り、近づけるね」'],medicine_cure:['「顔が また ちゃんと 見える」'],travel:['「暗い道なら まかせて」'],minigame_great:['「いま すごく 光って見えた」'],minigame_bad:['「暗くして もう1回やる？」']},
    swamp_croc:{play_with:['「……もう少しなら いい」'],medicine_cure:['「べつに 心配してない。ちょっとだけ」'],travel:['「水辺なら 先いく」'],minigame_great:['「……やるじゃん」'],minigame_bad:['「見てない。だから 気にしなくていい」']},
    gentle_gorilla:{play_with:['「ちから ぬくね。そっとね」'],medicine_cure:['「よかった。ほんとに よかった」'],travel:['「荷物 ぜんぶ もつよ」'],minigame_great:['「すごい！でも びっくりさせないよう 小声で言うね」'],minigame_bad:['「だいじょうぶ。手 つなぐ？」']},
    knitting_spider:{play_with:['「動かないで。いま 糸ついた」'],medicine_cure:['「元気祝いに 何か 編むね」'],travel:['「いい糸の場所 ありそう」'],minigame_great:['「記念の 模様にしておく」'],minigame_bad:['「ほどいて やりなおせば いいよ」']},
    desert_scorpion:{play_with:['「しっぽには 気をつけて」'],medicine_cure:['「……よかった」'],travel:['「日陰側、こっち」'],minigame_great:['「強いね。知ってた」'],minigame_bad:['「次は となりで やる」']},
    oasis_cactus:{play_with:['「近い近い。とげ あるよ」'],medicine_cure:['「元気なら それでいい」'],travel:['「水、忘れないで」'],minigame_great:['「ハイタッチは……エアで」'],minigame_bad:['「落ちこんだら となりに 立ってる」']},
  };

  function partnerDailyLine(eventKey, ctx) {
    if (!state.partner) return null;
    const lines = PARTNER_DAILY_REACTIONS[state.partner.id]?.[eventKey];
    return pickConversationLine(lines, ctx || {});
  }

  function speakEvent(eventKey, ctx = {}) {
    const pool = CONVERSATION_POOLS[eventKey];
    if (!pool) return;
    clearConversationTimers();
    const beats = [];
    const petLine = ctx.petText || pickConversationLine(pool.pet, ctx);
    if (petLine) beats.push({ speaker: petSpeaker(), text: petLine });
    if (state.partner && pool.partner && Math.random() < (ctx.partnerChance ?? 0.6)) {
      const ps = partnerSpeaker();
      const line = partnerDailyLine(eventKey, ctx) || pickConversationLine(pool.partner, ctx);
      if (ps && line) beats.push({ speaker: ps, text: line });
    }
    if (state.companions.length && pool.companion && Math.random() < (ctx.companionChance ?? 0.55)) {
      const cs = companionSpeaker();
      const line = pickConversationLine(pool.companion, ctx);
      if (cs && line) beats.push({ speaker: cs, text: line });
    }
    // いるキャラが次々しゃべるテンポを優先。本人→恋人→仲間だけで終わらず、
    // 複数キャラがいる場面では最後に本人がもう一言返して「掛け合い」にする。
    if (beats.length >= 2 && Math.random() < 0.82) {
      const followUps = {
        feed: ['いや、これは ぼくの!', 'あと一口だけ!', '食べものの恨みは こわいぞ笑'],
        overfeed: ['いま 笑った?', 'もう 食べものの話しないで!', '明日から 本気だすって!'],
        sleep: ['もう しゃべらない…ねる…', 'おやすみって 何回いうの笑', '電気けして〜'],
        wake: ['起きたってば!', '朝から 元気すぎ笑', 'あと3分だけは だめ?'],
        clean: ['ほめていいよ!', '今日は できる子なので', 'この状態を 何分キープできるかな'],
        medicine_cure: ['まずかったけど 勝った!', 'もう薬は しばらく見たくない', '元気になったから あそぼ!'],
        medicine_wrong: ['だから 元気だって!', '薬しまって!', 'その手に持ってるの こわい笑'],
        play_with: ['まだ やる!', '次ぼくの番!', 'ちょっと本気だす!'],
        play_with_annoyed: ['ほんとに 休憩!', '5分だけ 放置して笑', 'かまいすぎ警報です'],
        court: ['聞こえてた!?', 'ちょっと みんな静かにして笑', '今いいところだから!'],
        court_fail: ['その話は もう終わり!', '見てた人 全員 忘れて!', 'はい次の話題!'],
        age: ['まあ 中身は いつものぼくだけどね', '誕生日ってことで 何かちょうだい?', '今日は 主役でいい?'],
        sodachi: ['まだ そだつの!?', '鏡もう1回みよ', 'なんか 強くなった気がする'],
        money: ['これは ぼくの資産です', '使わないよ。たぶん', 'とりあえず 数えよ!'],
        travel: ['まず ごはん!', '迷子には ならない。たぶん', '全部みたい!'],
        transform: ['見すぎ見すぎ笑', '写真とっとこ!', '声まで変わってないよね?'],
        partner_new: ['にやけてないし!', '今日は ちょっと浮かれていい?', 'みんな、今だけ 空気よんで笑'],
        marriage: ['なんか 急に照れてきた', '今日から 家族会議する?', 'ほんとに 夫婦なんだなぁ'],
        minigame_great: ['もう1回ほめて!', '録画してた!?', 'いまのは 保存版です'],
        minigame_bad: ['次は勝つ!', 'いまのは ノーカウント!', '見なかったことにして!'],
      };
      const line = pickConversationLine(followUps[eventKey], ctx);
      if (line) beats.push({ speaker: petSpeaker(), text: line });
    }
    const visibleBeats = beats.slice(0, 4);
    // 掛け合いが終わるまでは放置会話などに上書きさせない。
    conversationBusyUntil = Date.now() + Math.max(SPEECH_DURATION_MS, ((visibleBeats.length - 1) * SPEECH_DURATION_MS) + SPEECH_DURATION_MS);
    visibleBeats.forEach((beat, i) => {
      conversationTimers.push(setTimeout(() => setSpeechBubble(beat.text, beat.speaker), i * SPEECH_DURATION_MS));
    });
  }

  function celebrateAgeSpeech(age, stageLabel) {
    speakEvent('age', { age, stageLabel, partnerChance: 0.8, companionChance: 0.75 });
  }

  const PARTNER_IDLE_LINES = [
    'いっしょに いると おちつくね', '気づいたら また となりに いるね', 'つぎは どこへ いこうか?',
    'ちゃんと こっちも みてる?', 'なんでもない じかんも すき', 'また デート しようね',
    'きょう なんか いいかおしてる', 'あとで ちょっと さんぽしない?', 'いまの じかん、けっこう すき',
    'さいきん ちゃんと わらってる?', 'カレー たべたいな', 'あの くも、なんか いぬっぽい',
    'ねえ、ちょっと こっち きて', 'いま 目あったよね?', '手、あいてるけど?', '今日も すき。はい、報告おわり',
    'ちょっと くっついていい?', '近い? まあ いいか', 'その顔 ずるくない?', 'ふたりで どっか 消える?',
    'さっきから ちょっと かわいいんだけど', 'いまなら ぎゅーしても 怒られない気がする',
    '冷蔵庫あけたら 何か人生かわるかな', 'ねえ、くだらない話しよ', '急に旅行いく?', '今日の晩ごはん会議しよ',
  ];
  const COMPANION_IDLE_LINES = [
    'いっしょに あそぼう!', 'ここ けっこう すき!', 'きょうも げんき?',
    'なんか おもしろいこと ない?', 'きょうは ここに いるね', 'ちょっと じゃれたい!',
    'おなかすいたー', 'つぎ なにする?', 'ぼく ここ みはってるね',
    'いま なんか うごいた!', 'ひなたぼっこ したい', 'さっきの おと なに?',
    'ぼくのこと 忘れてない?', 'ねえねえねえねえ!', '走ろう!', 'なんか 食べよう!',
    '恋人ばっかり ずるい!', 'ぼくも まぜて!', 'いま ひま! すごく ひま!', '何か事件 おきないかな',
    'さっきから ずっと 見てるよ', '今日の ぼく、ちょっと かわいくない?', 'とりあえず はねとく!', '会議しよう。議題は おやつ',
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
    evolve: [
      { emoji: '📈', message: '朝から なんとなく 目線が 高い。昨日より すこし 大きくなったみたい' },
      { emoji: '😲', message: 'いつもの場所に 立ったら、景色が ほんのすこし ちがって見えた' },
      { emoji: '💫', message: '昨日できなかった 動きが、今日は すこしだけ できた' },
      { emoji: '🔔', message: '鏡のまえを 通って、二歩 もどって もう一度 見た' },
      { emoji: '📏', message: 'サイズが かわって…ふくは もってないけど なんとなく きつい' },
    ],
    devolve: [
      { emoji: '🤏', message: 'あれ?なんか ちいさく なってない…?' },
      { emoji: '👶', message: '前に できていたことが、今日は ちょっと うまくいかない' },
      { emoji: '😴', message: '今日は なんだか 動きが ゆっくり。早めに 休みたそう' },
      { emoji: '📉', message: 'たいじゅうは かわってないのに みための ねんれいが わかがえった' },
      { emoji: '🌀', message: 'じかんが ちょっと まきもどった ような かんかく' },
    ],
    transform: [
      { emoji: '🌟', message: '鏡のなかに、さっきまでと ちがう なおとっちが 立っている' },
      { emoji: '🕺', message: '新しい すがたを たしかめるように、くるっと 一周してみた' },
      { emoji: '👕', message: 'きがえた みたいな かんかく!なかみは おなじ' },
      { emoji: '🪞', message: 'べつじんに なった き が するけど、なかみは いつもどおり' },
      { emoji: '🎭', message: '「あたらしい じぶん」を いちど えんじて みたく なった' },
    ],
    'minigame-great': [
      { emoji: '🏆', message: '終わったあと、ちょっとだけ ドヤ顔を かくせなかった' },
      { emoji: '😎', message: '結果を 見たあと、口もとだけ ずっと ゆるんでいる' },
      { emoji: '📸', message: 'だれか いま の みてた?みてて ほしかった!' },
      { emoji: '🔥', message: 'いまなら もう1回 いける気がする!' },
      { emoji: '🎉', message: 'もう1回やったら もっと いけそうな 気がしてきた' },
    ],
    'minigame-bad': [
      { emoji: '🙈', message: '結果の画面を そっと 閉じた。もう一回なら ちがうはず' },
      { emoji: '😵', message: 'いまの タイミング、ぜんぶ ずれてた…' },
      { emoji: '🌀', message: '最初から ずっと タイミングが 半歩ずつ ずれていた' },
      { emoji: '🫠', message: 'くやしいから、あとで もう1回だけ やる' },
    ],
    'medicine-cure': [
      { emoji: '🕺', message: 'さっきまで 丸まっていたのに、もう 部屋を うろうろしている' },
      { emoji: '😋', message: 'くすりの あじが まずすぎて めが さめた(べつの いみで げんき)' },
      { emoji: '🎈', message: 'びょうきの ことは もう わすれた!(いたみは わすれてない)' },
      { emoji: '💊', message: 'くすりを のんだ ごほうびに あとで なにか ねだりそう' },
    ],
    overfeed: [
      { emoji: '🫃', message: 'おなかが パンパン…しばらく うごけない…' },
      { emoji: '🍚', message: '「もう むり」と いいながら、まだ おさらを 見ている' },
      { emoji: '🚨', message: 'おさらを 見るだけで、さっき 食べた量を 思いだしてしまう' },
      { emoji: '😵‍💫', message: '食べるまえに もどれたら、ひとくちだけ 減らしたい' },
    ],
    'poop-clean': [
      { emoji: '✨', message: 'さっきまでの ことは なかったことに しよう' },
      { emoji: '🧹', message: '床が ちゃんと 床に もどった!' },
      { emoji: '😌', message: 'これで こころおきなく ごろごろできる' },
      { emoji: '🚿', message: '空気まで ちょっと かるくなった きがする' },
      { emoji: '🫡', message: 'みなかったことに するには じゅうぶん きれい' },
      { emoji: '🧼', message: 'きれいに なった床を、意味もなく もう一度 見にきた' },
    ],
  };

  // なでる/はなしかける は毎回かならず1つ表示される軽いリアクション文 -
  // 通常のメッセージ欄に出すだけなので、STORY_EVENT_POOLSのような大きな
  // 演出やSTORY_EVENT_CHANCEの抽選は使わない
  // じゃれる時に吹き出しへ出す文は、すべて「なおとっち本人」の発言。
  // 観察者・ナレーター視点の文を混ぜない。
  const PET_REACTIONS = [
    'もっと じゃれて!',
    'これ きもちいい!',
    'くすぐったいって笑',
    'もうちょっと そのまま!',
    'そこ すき!',
    'あったかい て、いいね',
    'なんか ねむく なってきた',
    'もう1かい!',
    'このまま ちょっと ごろごろしよ',
    'いま かなり しあわせ',
    'ふわふわ さわるの すき?',
    'もっと こっち きて!',
  ];

  const TALK_REACTIONS = [
    'きょうも げんきだよ!',
    'ねえ、ちゃんと きいてる?',
    'ちょっと きいて!',
    'こっち みて!',
    'ひとりごと いってただけ!',
    'あそぼう!',
    'いまの ことば、わかった?',
    'へんじの かわりに はねる!',
    'うんうん、それで?',
    'ないしょばなし しよ',
    'だいすき!',
    'どうしたの?',
  ];

  // なかまが そばに いる ときも、吹き出しの話者はなおとっち本人。
  const COMPANION_PET_REACTIONS = [
    'みんなも いっしょに じゃれよ!',
    'ねえ、みんなも こっち きて!',
    'みんなで あそぶと たのしい!',
    '全員集合〜!',
  ];

  const COMPANION_TALK_REACTIONS = [
    'みんなにも はなしかけよ!',
    'ねえ、みんな きいて!',
    '今日は ずっと しゃべってたい笑',
    'この話は みんなには ひみつね!',
  ];

  const COMPANION_ANNOYED_REACTIONS = [
    'みんな、ちょっと 休憩しよ!',
    'いったん 全員しずかにしよ笑',
    'もう みんなで ごろごろしよ',
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
    return AFFECTION_SPAM_THRESHOLD + (isEquipped('pet_threshold') ? 2 : 0);
  }

  // らしんばん を そうびしていると、たびづかれに なるまで もう少し
  // 連続で たびに でられる
  function travelSpamThreshold() {
    return TRAVEL_SPAM_THRESHOLD + (isEquipped('travel_threshold') ? 2 : 0);
  }

  const PET_ANNOYED_REACTIONS = [
    'もう なでなでは じゅうぶん!',
    'ちょっと しつこいって笑',
    'その手 いったん おしまい!',
    'ちょっと 休ませて〜',
    'そろそろ ひとりに して!',
    'なですぎ けいほう、はつれい!',
    '好きなのは わかったから笑',
    '距離感! 距離感!',
  ];

  const TALK_ANNOYED_REACTIONS = [
    'もう ちょっと しずかにして笑',
    'いまは 返事しない!',
    'ふぅ〜…ちょっと 休憩!',
    '耳ふさぎたい! みみ ないけど!',
    'そろそろ 無言タイムにしよ',
    'しゃべりすぎた〜',
    '次の話題は 5分後で!',
    '口が つかれた笑',
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
    gay: '同性を対象とする タイプ',
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
    return isEquipped('questioning_fast') ? Math.ceil(QUESTIONING_RESOLVE_THRESHOLD / 2) : QUESTIONING_RESOLVE_THRESHOLD;
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
        pushLifeLog('💔', `${state.partner.label}と すれちがいはじめた`);
      } else if (compatible && state.partner.mismatched) {
        state.partner.mismatched = false;
        state.partner.repair = 0;
        pushLifeLog('💞', `${state.partner.label}と また きもちが かさなった`);
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
      label: `ともだちの ${stage.label}`,
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
    { id: 'gachi', label: 'これは ガチ' },
    { id: 'nocomment', label: 'ノーコメント笑' },
    { id: 'believe', label: '信じていいよ' },
    { id: 'guess', label: 'たぶん 想像どおり' },
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
    { id: 'dq5', category: 'sec', weight: 2, emoji: '🤥', text: '恋人に嘘をついた?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
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
    { id: 'dq21', category: 'sns', weight: 2, emoji: '📱', text: '好きな人のSNSを遡って見た?', a: { label: 'ある', traits: ['jealous', 'romantic'] }, b: { label: 'ない', traits: ['myPace'] } },
    { id: 'dq22', category: 'sns', weight: 2, emoji: '📲', text: '恋人のSNSは?', a: { label: 'チェックしてしまう', traits: ['jealous'] }, b: { label: 'ほとんどしない', traits: ['myPace'] } },
    { id: 'dq23', category: 'sns', weight: 2, emoji: '❤️', text: '恋人の「いいね」は?', a: { label: '気になる', traits: ['jealous'] }, b: { label: '気にならない', traits: ['myPace'] } },
    { id: 'dq24', category: 'sns', weight: 2, emoji: '🔓', text: '恋人のスマホを見たい?', a: { label: 'ある', traits: ['jealous'] }, b: { label: 'ない', traits: ['myPace'] } },
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
    { id: 'dq34', category: 'ex', weight: 2, emoji: '🔄', text: '復縁を言われたら?', a: { label: '少し迷うかも', traits: ['romantic'] }, b: { label: '全くない', traits: ['realist'] } },
    { id: 'dq35', category: 'ex', weight: 2, emoji: '⚖️', text: '元恋人と今の恋人を比べた?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq36', category: 'ex', weight: 2, emoji: '💔', text: '元恋人の方が良かったと思った?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
    { id: 'dq37', category: 'ex', weight: 2, emoji: '📵', text: '今でも元恋人のSNSを見る?', a: { label: 'ある', traits: ['jealous'] }, b: { label: 'ない', traits: ['myPace'] } },
    { id: 'dq38', category: 'ex', weight: 2, emoji: '🎁', text: '思い出の品は?', a: { label: '残している', traits: ['romantic'] }, b: { label: '残していない', traits: ['realist'] } },
    { id: 'dq39', category: 'ex', weight: 2, emoji: '🖼️', text: '元恋人との写真を見返した?', a: { label: 'ある', traits: ['romantic'] }, b: { label: 'ない', traits: ['realist'] } },
    { id: 'dq40', category: 'ex', weight: 2, emoji: '😔', text: '別れを後悔している相手は?', a: { label: 'いる', traits: ['romantic'] }, b: { label: 'いない', traits: ['realist'] } },
    { id: 'dq41', category: 'ex', weight: 2, emoji: '💫', text: '本気で復縁を考えた?', a: { label: 'ある', traits: ['romantic'] }, b: { label: 'ない', traits: ['realist'] } },
    { id: 'dq42', category: 'ex', weight: 2, emoji: '📞', text: '寂しさで元恋人に連絡した?', a: { label: 'ある', traits: ['spoiled'] }, b: { label: 'ない', traits: ['myPace'] } },
    { id: 'dq43', category: 'ex', weight: 2, emoji: '😒', text: '元恋人に新しい恋人ができたら?', a: { label: '少し嫉妬する', traits: ['jealous'] }, b: { label: '何とも思わない', traits: ['myPace'] } },
    { id: 'dq44', category: 'ex', weight: 2, emoji: '🔟', text: '過去の交際人数は?', a: { label: '正確に言える', traits: ['active'] }, b: { label: 'ぼかしたい', traits: ['secretive'] } },
    { id: 'dq45', category: 'ex', weight: 2, emoji: '✨', text: '過去の恋愛を良く話した?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
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
    { id: 'dq63', category: 'aff', weight: 3, emoji: '💘', text: '恋人以外に本気で惹かれた?', a: { label: 'ある', traits: ['secretive'] }, b: { label: 'ない', traits: ['active'] } },
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
    { id: 'dq74', category: 'loveTruth', weight: 2, emoji: '⚡', text: '惹かれるのは?', a: { label: 'ドキドキする人', traits: ['active'] }, b: { label: '安心できる人', traits: ['realist'] } },
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
    { id: 'dq99', category: 'phys', weight: 3, emoji: '🤔', text: '身体的に惹かれないと?', a: { label: '付き合うのは難しい', traits: ['realist'] }, b: { label: '付き合える', traits: ['romantic'] } },
    { id: 'dq100', category: 'phys', weight: 3, emoji: '⚡', text: '身体的に強く惹かれると?', a: { label: '気になることがある', traits: ['realist'] }, b: { label: 'ない', traits: ['romantic'] } },
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
    { id: 'dq111', category: 'money', weight: 3, emoji: '💸', text: '浪費癖は?', a: { label: '別れる理由になる', traits: ['realist'] }, b: { label: 'ならない', traits: ['romantic'] } },
    { id: 'dq112', category: 'money', weight: 3, emoji: '💒', text: 'お金がない相手とは?', a: { label: '結婚は難しい', traits: ['realist'] }, b: { label: '愛情があればできる', traits: ['romantic'] } },
    { id: 'dq113', category: 'money', weight: 3, emoji: '🎓', text: '社会的地位は?', a: { label: '求める', traits: ['realist'] }, b: { label: '求めない', traits: ['romantic'] } },
    { id: 'dq114', category: 'money', weight: 3, emoji: '🛒', text: '言わず高額な買い物は?', a: { label: 'あり', traits: ['secretive'] }, b: { label: 'なし', traits: ['active'] } },
    // 【結婚・将来】
    { id: 'dq115', category: 'marriage', weight: 3, emoji: '💍', text: '好きでも結婚したくない相手は?', a: { label: 'いると思う', traits: ['realist'] }, b: { label: '好きなら結婚できる', traits: ['romantic'] } },
    { id: 'dq116', category: 'marriage', weight: 3, emoji: '📋', text: '結婚相手への条件は?', a: { label: 'より求める', traits: ['realist'] }, b: { label: '求めない', traits: ['romantic'] } },
    { id: 'dq117', category: 'marriage', weight: 3, emoji: '👶', text: '子どもの希望が違えば?', a: { label: '別れる可能性が高い', traits: ['realist'] }, b: { label: '話し合って考える', traits: ['cautious'] } },
    { id: 'dq118', category: 'marriage', weight: 3, emoji: '👪', text: '家族と合わなければ?', a: { label: '諦める可能性がある', traits: ['realist'] }, b: { label: '相手が好きなら結婚する', traits: ['romantic'] } },
    { id: 'dq119', category: 'marriage', weight: 3, emoji: '💭', text: '感情が薄れても?', a: { label: '一緒にいられる', traits: ['realist'] }, b: { label: '難しい', traits: ['romantic'] } },
    { id: 'dq120', category: 'marriage', weight: 3, emoji: '👨‍👩‍👧', text: '愛情がなくなったら?', a: { label: '家族として一緒にいられる', traits: ['realist'] }, b: { label: '別れたい', traits: ['romantic'] } },
    { id: 'dq121', category: 'marriage', weight: 3, emoji: '🔐', text: '結婚後の秘密は?', a: { label: 'あっていい', traits: ['secretive'] }, b: { label: '全部共有したい', traits: ['active'] } },
    { id: 'dq122', category: 'marriage', weight: 3, emoji: '🧘', text: '一人の時間は?', a: { label: '絶対必要', traits: ['myPace'] }, b: { label: '基本的に一緒にいたい', traits: ['spoiled'] } },
    { id: 'dq123', category: 'marriage', weight: 3, emoji: '🌠', text: '相手の夢のために?', a: { label: '変えられる', traits: ['romantic'] }, b: { label: '難しい', traits: ['realist'] } },
    { id: 'dq124', category: 'marriage', weight: 3, emoji: '🎯', text: '自分の夢のためなら?', a: { label: '離れる選択もできる', traits: ['realist'] }, b: { label: '恋人を優先する', traits: ['romantic'] } },
    // 【かなり聞かれたくない本音】
    { id: 'dq125', category: 'deep', weight: 3, emoji: '👀', text: '気になる人は他にも?', a: { label: 'いる', traits: ['secretive'] }, b: { label: 'いない', traits: ['active'] } },
    { id: 'dq126', category: 'deep', weight: 3, emoji: '✨', text: 'より魅力的だと思う人は?', a: { label: 'いる', traits: ['secretive'] }, b: { label: 'いない', traits: ['active'] } },
    { id: 'dq127', category: 'deep', weight: 3, emoji: '💫', text: '恋人以外から好かれたい?', a: { label: 'ある', traits: ['spoiled', 'secretive'] }, b: { label: 'ない', traits: ['active'] } },
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
    { id: 'dq149', category: 'funny', weight: 1, emoji: '👃', text: '匂いをこっそり嗅いだ?', a: { label: 'ある', traits: ['romantic'] }, b: { label: 'ない', traits: ['myPace'] } },
    { id: 'dq150', category: 'funny', weight: 1, emoji: '🧥', text: '恋人の物の匂いを嗅いだ?', a: { label: 'ある', traits: ['romantic', 'spoiled'] }, b: { label: 'ない', traits: ['myPace'] } },
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
      flourishTitle = '👀 本音だった!';
      flourishDesc = `${confLabel}本音だと 見ぬいた!`;
      pointsLabel = 'B +1';
    } else if (wasHonest && !bCorrect) {
      aPoints = 1;
      flourishTitle = '😳 まさかの本音でした';
      flourishDesc = `${confLabel}うそだと うたがっていたのに…`;
      pointsLabel = 'A +1';
    } else if (!wasHonest && bCorrect) {
      bPoints = 2;
      flourishTitle = '🃏 うそを見破った!';
      flourishDesc = `${confLabel}うそだと 見やぶった!`;
      pointsLabel = 'B +2';
    } else {
      aPoints = 2;
      flourishTitle = '😈 完全にだまされた!';
      flourishDesc = `${confLabel}本音だと 信じていたのに…`;
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
    const base = isEquipped('marriage_fast') ? Math.ceil(MARRIAGE_BOND_THRESHOLD / 2) : MARRIAGE_BOND_THRESHOLD;
    return Math.max(2, base - (hasPerk(50) ? 2 : 0));
  }

  // きずぐすり を そうびしていると、わかれ/りこんの 死亡メーターダメージが
  // 半分に おさえられる(raiseDeathMeter() の こいびと/夫婦・かんむり
  // けいの けいげんとは べつに、breakup 専用の けいげん)
  function breakupPenalty(wasMarried) {
    const base = BREAKUP_DEATH_PENALTY[wasMarried ? 'married' : 'dating'];
    const eased = isEquipped('breakup_ease') ? base * 0.5 : base;
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
    pushLifeLog('💔', wasMarried ? `${label}と りこんした` : `${label}に ふられた`);
    setMessage(wasMarried ? `${label}と 何度も はなして、べつべつに くらすことに なった` : `${label}とは、ここで こいびとを やめることに なった`);
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
      setMessage(`${names}の すがたを さいきん 見なくなった。しばらく べつのところで 過ごすみたい`);
      applyDecline(8);
      emotePet('sad');
    }
  }

  const COURT_SUCCESS_REACTIONS = [
    'つきあってください! …え、ほんとにいいの!?',
    'やった。いま たぶん 顔にぜんぶ出てる',
    'うれしすぎて 何しゃべればいいか わからん笑',
    'ほんとに? ほんとに? …もう1回きくけど ほんとに?',
    '今日から こいびとってことで よろしく!',
    'ちょっと待って、にやけるの止まらない',
    '心臓うるさい。たぶん きこえてる',
    'よし、まず何しよ。手つなぐ?',
  ];

  const COURT_FAIL_REACTIONS = [
    'あっ…了解! いまの ぼくは 忘れて!',
    'うわー はずかし。穴あったら 5分だけ 入りたい',
    'そっか。じゃあ 今日は 友達モードでいく!',
    'はい、恋愛イベント終了! 解散!',
    'ちょっとだけ へこんでいい? 3びょうだけ',
    'よし、次は もっと かっこよく 言う',
    '心だけ 先走った笑',
    'いまの告白、編集でカットできない?',
  ];

  // れんあい対象が あわなかった ときの リアクション。しっぱい あつかいの
  // 「ふられた」トーンには せず、「友達なら いいよ」くらいの かるい
  // しぜんな はんのうに とどめる - LGBTQを ふくむ どの タイプの あわなさも
  // ネガティブに えがかない
  const COURT_FRIEND_REACTIONS = [
    '「ごめんね、恋愛のタイプが ちがうかも。でも 友達なら いいよ!」と わらわれた',
    'きょうみの むきが ちがったみたい。「なかよくは しようね!」だって',
    '「タイプじゃ ないけど、気は あうかも!」と あくしゅを かわした',
    'れんあいの むきは あわなかったけど、なかよく なれそうな よかん',
    '「そういう るいの すきじゃ ないんだ〜。でも また あそぼうね!」',
  ];

  // すでに こいびとが いるときに もういちど「きゅうあいする」を おすと、
  // あたらしい あいてを さがしに いくのではなく、今の こいびとと いちゃつく
  // 軽い リアクションに なる(せいこう/しっぱいの 抽選は しない)
  function courtFlirtReactions(partnerLabel) {
    // speakEvent('court', { petText: ... }) に渡すため、ここは必ず
    // 「なおとっち本人が口にするセリフ」にする。情景描写は入れない。
    // 甘い・くだらない・少しだけ色っぽい方向を混ぜて毎回の幅を出す。
    return [
      `${partnerLabel}、こっち みて。…やっぱ もうちょい みて`,
      '手 つないでいい? というか もう つなぐね',
      'きょう なんか いつもより かわいくない?',
      'ちょっと 近い? でも はなれる気は ない',
      'その顔 ずるい。もう1回して',
      'いま ふたりきりに なったら たぶん 帰さない笑',
      'ねえ、5びょうだけ ぎゅーして。…5びょうって こんな長かったっけ',
      '好きって 何回いったら うるさい?',
      'ちょっとだけ くっつこ。ちょっとだけは たぶん無理',
      'きょうの ぼく、理性が ちょっと 休みかも',
      '耳もとで なんか 言おうとしたけど、くだらなすぎて やめた笑',
      'この距離で 真顔は むり笑',
      'いま キスする流れ? …ちがう? じゃあ忘れて!',
      '帰る? …その質問、答えは「帰らない」で おねがいします',
      'ふたりで いると 時間だけ 仕事さぼってない?',
      'いまの 空気、なんか ちょっと えっちじゃない? 気のせい?',
      'そのまま となりに いて。理由は いま つくる',
      '好き。はい今日のノルマ達成。…もう1回いう?',
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
    home: { emoji:'🏠', visualBaseId:'home', minigameBaseId:'home', decor:['🏠','🌸','☁️','💕','✨','🎀','🪴','🕊️'], lines:['やっぱり じぶんの おうちが いちばん おちつく','おなじみの けしきに ほっとした'] },
    city: { emoji:'🏙️', visualBaseId:'city', minigameBaseId:'city', decor:['🏙️','🌃','✨','🚕','🌆','💡','🚦','🎡'], lines:['上を 見ながら 歩いて、あやうく 人に ぶつかりそうになった','ネオンを 見ていたら、帰るころには 首が つかれた'] },
    countryside: { emoji:'🌾', visualBaseId:'countryside', minigameBaseId:'countryside', decor:['🌾','🌻','🐄','🚜','☀️','🦋','🌈','🐓'], lines:['田んぼの かぜで、しばらく 何も しゃべらずに 立っていた','のはらを 走ったら、思ったより すぐ 息が きれた'] },
    forest: { emoji:'🌲', visualBaseId:'forest', minigameBaseId:'forest', decor:['🌲','🍄','🦋','🐿️','🌿','🍃','🦉','🌰'], lines:['きの えだから とりの こえが きこえる','はっぱの におい に しんこきゅう'] },
    mountain: { emoji:'⛰️', visualBaseId:'snow', minigameBaseId:'snow', decor:['⛰️','🪨','🌲','🦅','🥾','🏕️','♨️','☁️'], lines:['山の かぜが つよい。ちょっとだけ えらくなった きがする','みおろすと さっきまでいた場所が ずっと ちいさい'] },
    snow: { emoji:'❄️', visualBaseId:'snow', minigameBaseId:'snow', decor:['❄️','⛄','🏔️','🌨️','✨','🦌','🎿','🧣'], lines:['さむい!でも ゆきだるまを つくってみた','いきが しろく なるのが おもしろい'] },
    sea: { emoji:'🌊', visualBaseId:'sea', minigameBaseId:'sea', decor:['🌊','🐚','🐠','⛵','☀️','🦀','🐬','🏖️'], lines:['なみの おとが きもちいい!','すなはまを ぴょんぴょん はねまわった'] },
    deepsea: { emoji:'🌌', visualBaseId:'sea', minigameBaseId:'sea', decor:['🌌','💡','🐟','🦑','🪼','⚓','🫧','🪸'], lines:['くらい。なのに ところどころ ひかっている','上を 見ても どこが うみの うえか わからない'] },
    river_lake: { emoji:'🏞️', visualBaseId:'forest', minigameBaseId:'forest', decor:['🏞️','💧','🐟','🦆','🌿','🪷','🪨','🌈'], lines:['みずの おとを きいていたら しばらく うごけなくなった','かわべりを あるくと 風が すこし つめたい'] },
    jungle: { emoji:'🌴', visualBaseId:'tropical', minigameBaseId:'tropical', decor:['🌴','🌺','🦜','🦍','🌿','🍌','🐍','💧'], lines:['葉っぱが でかい。何もかも でかい','どこかで ずっと なにかが 鳴いている'] },
    desert: { emoji:'🏜️', visualBaseId:'desert', minigameBaseId:'desert', decor:['🏜️','🌵','🐫','☀️','🦂','🌅','⛺','🦎'], lines:['あつい!でも すなの うえを あるくのが たのしい','ほしぞらが びっくりする くらい きれいだった'] },
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
  // 地域(8つ)」)と partner-all(「全8地域16人」)の 条件が かわって
  // しまう ため。こいびと候補も おかない(ALL_PARTNER_CANDIDATES を
  // ふやさない)。ここは「であう ばしょ」では なく「たどりつく ばしょ」
  const SPECIAL_REGIONS = [
    {
      id: 'star_stop', label: 'ほしぞらの ていりゅうじょ', emoji: '🌌', special: true,
      decor: ['🌌', '✨', '🚏', '🌠', '🛰️', '🌙', '💫', '🪐'],
      lines: [
        'だれも こない ていりゅうじょで、こない バスを ずっと まっていた',
        'ときどき ほしが ながれる。そのたびに ベンチが すこし つめたくなる',
        'じこくひょうには「まもなく」とだけ かいてある',
        'となりに だれか すわった き が した。ふりむいたら だれも いなかった',
      ],
      candidates: [],
    },
    {
      id: 'memory_lake', label: 'きおくの みずうみ', emoji: '🫧', special: true,
      decor: ['🫧', '💧', '🌾', '🪞', '🌫️', '🕯️', '🐚', '🌊'],
      lines: [
        'みずめんに、まだ おきていない できごとが うつっていた',
        'こえを だすと、すこし おくれて じぶんの こえが かえってくる',
        'そこに しずんでいる ものは、どれも みおぼえが ある',
        'ここに きたことは ない。なのに かえりみちを しっている',
      ],
      candidates: [],
    },
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
    cat_friend:{emoji:'🐱', flavor:'ねこが こっちを 見た。呼んでも こない。でも帰ろうとすると ついてくる'},
    rabbit_friend:{emoji:'🐰', flavor:'うさぎが 少し先まで 走っては、こっちを 振り返っている'},
    tanuki:{emoji:'🦝', flavor:'たぬきが 何かを かくしている。目が あった瞬間、知らないふりをした'},
    squirrel:{emoji:'🐿️', flavor:'どんぐりを かかえた リスが しっぽを ふりふり ちかづいてきた'},
    owl:{emoji:'🦉', flavor:'ふくろうが 上から ずっと みている。話しかけるのを 待っているみたい'},
    otter:{emoji:'🦦', flavor:'カワウソが 石を ひとつ 差しだしてきた。たぶん 遊びの 参加券'},
    hamster:{emoji:'🐹', flavor:'ほおぶくろパンパンの ハムスターが こっちを のぞきこんでいる'},
    panda:{emoji:'🐼', flavor:'パンダが ねころんでいる。こちらを 見ても 起きる気は ないらしい'},
    monkey:{emoji:'🐒', flavor:'サルが さっきから こっちの 動きを ぜんぶ まねしている'},
    parrot:{emoji:'🦜', flavor:'オウムが 何か しゃべった。たぶん さっきの こっちの セリフだ'},
    sheep:{emoji:'🐑', flavor:'ヒツジが ふわふわ 近づいてきた。すでに ねむそう'},
    seal:{emoji:'🦭', flavor:'アザラシが ごろごろ 転がりながら 近づいてきた'},
    bat:{emoji:'🦇', flavor:'コウモリが 逆さまのまま こっちを 見ている'},
    chicken:{emoji:'🐓', flavor:'ニワトリが ものすごく 元気に 近づいてきた'},
    penguin_friend:{emoji:'🐧', flavor:'ペンギンが こっちへ 急いできて、目のまえで きれいに すべった'},
    hedgehog:{emoji:'🦔', flavor:'はりねずみが そっと かおを だした。目があうと また まるくなった'},
    shiba:{emoji:'🐕', flavor:'しばいぬが ボールを くわえて こっちを みている。投げるまで 帰る気は なさそう'},
    koala:{emoji:'🐨', flavor:'コアラが ゆっくり 近づいてきた。途中で 一回 ねた'},
  };

  const RARE_COMPANION_RUNTIME = {
    punyu:{emoji:'🫠',vibe:'キモかわ',flavor:'なにかが とけている。目だけは はっきり こっちを 見ている',joined:'ぷにゅも ぬるっと ついてきた'},
    sekizou:{emoji:'🗿',vibe:'シュール',flavor:'石像が ある。さっきより 近い 気がする',joined:'気づいたら 家まで ついてきた'},
    chameleon:{emoji:'🦎',vibe:'おしゃれ',flavor:'サングラスを かけた カメレオンが かべから はんぶん はえている',joined:'「よろしく」と ひとことだけ 言った'},
    kinoko:{emoji:'🍄',vibe:'意味不明',flavor:'きのこが しゃべっている。「やあ」と いわれた',joined:'「じゃ、いこっか」と きのこが 歩きだした'},
    unicorn:{emoji:'🦄',vibe:'神々しい',flavor:'ユニコーンが まよいこんできた。本人は ぜんぜん 困っていない',joined:'なぜか そのまま ついてきた'},
    many_tail_fox:{emoji:'🦊',vibe:'妖しい',flavor:'きつねの しっぽを 数えた。数えるたびに 数が ちがう',joined:'しっぽを ゆらして ついてきた'},
    watcher:{emoji:'👁️',vibe:'こわい',flavor:'画面の はしから なにかが ずっと みている',joined:'見ないふりをしたら いつのまにか 仲間の列にいた'},
    box:{emoji:'📦',vibe:'意味不明',flavor:'ただの はこが ある。たぶん ただの はこ',joined:'帰ったら はこも いた'},
  };

  const COMPANIONS = WORLD_MASTER
    ? WORLD_MASTER.companions.normal.map((def) => ({
        id:def.id,
        emoji:COMPANION_RUNTIME[def.id].emoji,
        name:def.label,
        preferredRegions:[],
        flavor:COMPANION_RUNTIME[def.id].flavor,
      }))
    : [];

  const RARE_COMPANIONS = WORLD_MASTER
    ? WORLD_MASTER.companions.rare.map((def) => ({
        id:def.id,
        emoji:RARE_COMPANION_RUNTIME[def.id].emoji,
        name:def.label,
        vibe:RARE_COMPANION_RUNTIME[def.id].vibe,
        flavor:RARE_COMPANION_RUNTIME[def.id].flavor,
        joined:RARE_COMPANION_RUNTIME[def.id].joined,
      }))
    : [];

  function canonicalCompanionId(id) {
    return WORLD_MASTER?.compatibility?.companionAliases?.[id] || id;
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
    { id: 'walk', emoji: '🚶', label: 'ならんで あるく', line: 'とくに もくてきも なく、ずっと ならんで あるいた' },
    { id: 'eat', emoji: '🍡', label: 'なにか たべる', line: 'ひとつを はんぶんこ にして たべた' },
    { id: 'sunset', emoji: '🌇', label: 'ゆうやけを みる', line: 'そらが きれいで、しばらく どちらも しゃべらなかった', memory: 'ゆうやけを ふたりで みた' },
    { id: 'photo', emoji: '📷', label: 'しゃしんを とる', line: 'なんまい とっても どちらかが めを つぶっていた', memory: 'ふたりで しゃしんを とった' },
    { id: 'nap', emoji: '😴', label: 'ひなたぼっこ', line: 'あたたかくて、ふたりとも うっかり ねてしまった' },
    { id: 'shop', emoji: '🛍️', label: 'ぶらぶら みてまわる', line: 'なにも かわなかったけど、ずっと たのしかった' },
    { id: 'rain', emoji: '☔', label: 'あめやどり', line: 'きゅうな あめで、おなじ ひさしの したに ならんだ', memory: 'あめやどりを した' },
    { id: 'star', emoji: '🌠', label: 'ほしを さがす', line: 'ながれぼしを みつけたのは、けっきょく あいての ほうだった', memory: 'ながれぼしを さがした' },
    { id: 'talk', emoji: '💬', label: 'どうでも いい はなしを する', line: 'なにを はなしたか もう おぼえていない くらい どうでも いい はなしだった' },
    { id: 'lost', emoji: '🧭', label: 'まいごに なる', line: 'みちに まよったけど、なぜか おこられなかった' },
  ];

  // こいびとの せいかく(affinityTrait)ごとの リアクション。おなじ プランでも
  // あいてが かわると まったく ちがう デートに なる
  const DATE_TRAIT_LINES = {
    gentle: [
      'ずっと にこにこして、なんども「ありがとう」と いってくれた',
      'そっと そでを つかんで、はぐれないように してくれた',
      'ちいさな こえで「たのしいね」と いった',
    ],
    wild: [
      'とちゅうで はしりだして、ついていくのが たいへんだった',
      '「つぎ あっち!」と、よていに ない ばしょへ ひっぱって いかれた',
      'おおごえで わらって、まわりに ふりかえられた',
    ],
    calm: [
      'なにも いわずに、となりで おなじ ほうを みていた',
      'いつもの ペースを くずさない。それが すこし うれしかった',
      '「べつに、ふつうだった」と いいながら ずっと きげんが よかった',
    ],
    brave: [
      '「まかせて」と いって、けっきょく ぜんぶ しきってくれた',
      'ちょっと あぶない ちかみちを えらんで、どやがおを していた',
      'こまった ひとを たすけに いって、デートが 30ぷん のびた',
    ],
    romantic: [
      'きゅうに てを にぎってきて、こちらの ほうが あわてた',
      '「きょうの ことは わすれない」と まじめな かおで いわれた',
      'なんでも ない ばめんを、いちいち ドラマみたいに してくれる',
    ],
  };

  // 18体それぞれの口調。性格カテゴリに加えて固有台詞を優先し、
  // 誰と付き合っているかがデート中にも分かるようにする。
  const PARTNER_SIGNATURE_LINES = {
    cat_ceo:['「このあと会議。だから、あと10ぷんだけ延長」','「予定には なかったけど……まあ、悪くない」'],
    robot_neighbor:['「たのしい、を いま 学習中」','「この時間は 保存しても いいですか？」'],
    field_cow:['「ゆっくりで いいよ。草も そうして のびるし」','おいしい草を 見つけるたび 半分くれた。'],
    sunflower_partner:['「きょうは たいようより こっち 見てる」','帰り道も ずっと こちらの方を 向いていた。'],
    forest_bear:['「つかれたら 休もう。はちみつ あるよ」','大きな手で そっと 歩幅を あわせてくれた。'],
    grove_deer:['「しずかな ところ、すき」','少し先を歩いて、何度も こちらを 振り返った。'],
    cliff_goat:['「あっちの道、ぜったい おもしろい」','気づけば また 高いところに 連れていかれた。'],
    high_eagle:['「上から見ると、だいたい 小さいよ」','いちばん景色のいい場所を 当然みたいに 知っていた。'],
    snow_spirit:['「手、つめたい？ わたしは これが ふつう」','雪が降るたび 少しだけ うれしそうに 光った。'],
    snowman:['「あったかい場所は……ちょっとだけね」','日なたを避けながら、それでも となりを歩いた。'],
    rock_octopus:['「手、つなぐ？ 8本あるけど」','写真を撮るたび ポーズが 8個ずつ増えた。'],
    sea_mermaid:['「陸って まだ知らないこと いっぱい」','こちらが海の話を聞くより、陸の話を たくさん聞かれた。'],
    anglerfish:['「暗いほうが 顔、よく見えるよ」','小さな灯りだけで ずっと となりにいてくれた。'],
    swamp_croc:['「べつに 楽しいとは……言ってない」','帰ろうとしたら、無言で もう少し先を 指さした。'],
    gentle_gorilla:['「だいじょうぶ？ 荷物 もつよ」','花を踏まないように 大きな体で ずっと小さく歩いた。'],
    knitting_spider:['「じっとして。いま おそろい 作ってる」','帰るころには 小さなおそろいの飾りが できていた。'],
    desert_scorpion:['「危ないから こっち歩いて」','強そうな顔のまま、ずっと 日陰側を ゆずってくれた。'],
    oasis_cactus:['「近くに いていいよ。さわらなければ」','距離は少しあるのに、不思議と ずっと一緒だった。'],
  };

  const PARTNER_RELATIONSHIP_LINES = {
    cat_ceo:{court:'「……じゃあ、予定に入れとく」',marriage:'「長期契約ってことで。解約は なしね」'},
    robot_neighbor:{court:'「コイビト……登録しました」',marriage:'「この関係を、終了条件なしに設定します」'},
    field_cow:{court:'「じゃあ、これからも 草 いっしょに食べよ」',marriage:'「ずっと となりの のはらに いよう」'},
    sunflower_partner:{court:'「これからは たいようと きみを 見る」',marriage:'「ずっと こっち 向いてるね」'},
    forest_bear:{court:'「うれしい。はちみつ もってくるね」',marriage:'「冬眠しても、起きたら となりに いてね」'},
    grove_deer:{court:'「もう にげないよ」',marriage:'「これからは 振り返らなくても となりに いるね」'},
    cliff_goat:{court:'「じゃあ 次は もっと高いとこ 行こう」',marriage:'「一生ぶんの ちかみち、いっしょに 探そ」'},
    high_eagle:{court:'「……悪くない」',marriage:'「ずっと 上からじゃなく、となりで 見る」'},
    snow_spirit:{court:'「この手、つめたいけど いい？」',marriage:'「季節が かわっても、ここにいる」'},
    snowman:{court:'「とけないように がんばる」',marriage:'「一生ぶん、まだ とけないつもり」'},
    rock_octopus:{court:'「じゃあ まず どの手 つなぐ？」',marriage:'「8本ぜんぶでも 足りないくらい」'},
    sea_mermaid:{court:'「もっと 陸のこと 教えて」',marriage:'「海も陸も、帰る場所は いっしょにしよ」'},
    anglerfish:{court:'「くらいところでも ちゃんと 見つけてね」',marriage:'「ずっと この灯りで となりにいる」'},
    swamp_croc:{court:'「……まあ、いいけど」',marriage:'「べつに 泣いてない。水が はねただけ」'},
    gentle_gorilla:{court:'「うれしい。つぶさないように だきしめるね」',marriage:'「ずっと たいせつに する」'},
    knitting_spider:{court:'「じゃあ ふたりぶん 編むね」',marriage:'「ほどけても また 編みなおせば いいよ」'},
    desert_scorpion:{court:'「……じゃあ となり 歩いて」',marriage:'「これからも 日陰は 半分こ」'},
    oasis_cactus:{court:'「さわれなくても、好きで いいよ」',marriage:'「ちかづけないぶん、ずっと ここにいる」'},
  };

  // どの デートでも さいごに ひとつ つく、しめの ひとこと
  const DATE_CLOSINGS = [
    'かえりみち、さっきより すこし ちかくを あるいた。',
    '「また いこうね」が、ほとんど おなじ タイミングで でた。',
    'なにを したかより、となりに いたことの ほうを おぼえていそう。',
    'とくべつなことは なかった。でも、かえりたくなるのが すこし おそかった。',
    '「つぎ どこいく?」の はなしが、もう はじまっていた。',
    'しゃべらない じかんも、ぜんぜん きまずくなかった。',
    'わかれる まえに、もう1回だけ ふりかえった。',
    'きょうの しゃしん、あとで 何回も 見そう。',
  ];

  let lastDatePlanId = null;

  // デートに さそえるか どうかと、さそえない ときの りゆうを ひとつに まとめる。
  // ボタンの ゆうこう/むこうと、じっさいの じっこう りょうほうで つかう
  function dateBlockReason() {
    if (!hasPerk(50)) return 'まだ デートには さそえない';
    if (!isLiveLife() || state.stage !== STAGE.GROWING) return 'いまは デートに いけない';
    if (!state.partner) return 'いま こいびとが いない';
    if (state.isSleeping) return 'ねている… おきてから さそおう';
    if (state.dateCooldownTicks > 0) return 'さっき デートしたばかり… すこし じかんを おこう';
    return null;
  }

  let dateOpen = false;
  let dateChoiceOptions = [];
  let dateMovieTimers = [];

  function clearDateMovieTimers() {
    dateMovieTimers.forEach((t) => clearTimeout(t));
    dateMovieTimers = [];
  }

  function pickDateChoices() {
    const pool = DATE_PLANS.filter((p) => p.id !== lastDatePlanId);
    const shuffled = pool.slice().sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
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
    dateChoiceOptions = pickDateChoices();
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
    dateOpen = false;
    el.dateOverlay.classList.add('hidden');
    el.dateChooser.classList.remove('hidden');
    el.dateMovie.classList.add('hidden');
    render();
  }

  function rememberSpecialDate(plan, partner) {
    if (!plan.memory || state.datesThisLife <= 1) return;
    const memoryText = `デートの おもいで: ${partner.label}と ${plan.memory}`;
    if (state.lifeLog.some((entry) => entry && entry.text === memoryText)) return;
    pushLifeLog('💗', memoryText);
  }

  function finishDateMovie() {
    clearDateMovieTimers();
    el.dateMovieCaption.classList.remove('beat');
    el.dateMovieCloseBtn.classList.remove('hidden');
    el.dateMovieSkipBtn.classList.add('hidden');
  }

  // ふつうのデートではムービーを流さない。ムービーは結婚など人生の
  // 大きな節目のために取っておき、毎回見せて特別感を薄めない
  function finishOrdinaryDate() {
    clearDateMovieTimers();
    dateOpen = false;
    el.dateOverlay.classList.add('hidden');
    el.dateChooser.classList.remove('hidden');
    el.dateMovie.classList.add('hidden');
  }

  function playOrdinaryDateMovie(plan, partner, traitLine, closing) {
    clearDateMovieTimers();
    dateOpen = true;
    el.dateOverlay.classList.remove('hidden');
    el.dateChooser.classList.add('hidden');
    el.dateMovie.classList.remove('hidden');
    el.dateMovieCloseBtn.classList.add('hidden');
    el.dateMovieSkipBtn.classList.remove('hidden');

    const special = (state.items.reward || 0) > 0
      && window.confirm('🎁 ごほうびを1こ使って、とくべつなデートにしますか？');
    if (special) {
      state.items.reward -= 1;
      if (state.items.reward <= 0) delete state.items.reward;
    }

    // ごほうび使用時は見た目も明確に別物にする。
    el.dateMovieScene.dataset.plan = special ? 'special' : plan.id;
    el.dateMovieScene.classList.toggle('special-reward', special);
    el.dateMoviePlace.textContent = special
      ? `🎁 とくべつな ${plan.label}デート`
      : `${plan.emoji || '💞'} ${plan.label}デート`;

    const ownStage = SPECIES[state.speciesLine] && SPECIES[state.speciesLine].stages[state.stageIndex];
    el.dateMoviePet.textContent = ownStage ? ownStage.emoji : '✨';
    el.dateMoviePartner.textContent = partner.emoji || '💞';

    const specialMiddleLines = [
      '「きょう、ちょっと いつもと ちがうね」',
      'ふたりとも すこしだけ よそいきの 顔を していた。',
      '「こういう日、たまには いいかも」',
      'いつもより ゆっくり はなして、いつもより よく わらった。',
    ];
    const specialClosingLines = [
      '「これ、あとで ちゃんと おぼえてようね」',
      '「また とくべつに しよう。たまにで いいから」',
      'かえりぎわ、どちらも すぐには あるきださなかった。',
      '今日のことを 何年後かに また 話せたらいいな、と 思った。',
    ];
    const beats = special
      ? [
          `🎁 ${partner.label}と ${plan.label}へ。`,
          specialMiddleLines[Math.floor(Math.random() * specialMiddleLines.length)],
          traitLine,
          hasNaotoItem('naoto_ring')
            ? '💍 「これ、ふたりだけの ことばに しよっか」'
            : '「しゃしん とろう」って いったのに、なぜか 何枚も とった。',
          specialClosingLines[Math.floor(Math.random() * specialClosingLines.length)],
          '🎁 この日のことが、ひとつ おもいでに のこった。',
        ]
      : [
          `${partner.label}と ${plan.label}へ。`,
          traitLine,
          closing,
        ];

    if (special) pushLifeLog('💝', `とくべつなデートの おもいで: ${partner.label}と ${plan.label}`);

    el.dateMovieCaption.textContent = beats[0];
    el.dateMovieCaption.classList.add('beat');

    // 文章を読んで余韻も残せる速度。通常でも約3.4秒/文、特別デートは約4.2秒/文。
    const step = special ? 4000 : 3500;
    for (let i = 1; i < beats.length; i += 1) {
      dateMovieTimers.push(setTimeout(() => {
        el.dateMovieCaption.classList.remove('beat');
        void el.dateMovieCaption.offsetWidth;
        el.dateMovieCaption.textContent = beats[i];
        el.dateMovieCaption.classList.add('beat');
      }, step * i));
    }
    dateMovieTimers.push(setTimeout(finishDateMovie, step * beats.length + 500));
    saveState();
  }

  const MARRIAGE_MILESTONES = [
    { years: 1, icon: '💐', title: 'はじめての けっこんきねんび' },
    { years: 10, icon: '🎀', title: 'けっこん 10しゅうねん' },
    { years: 25, icon: '🥈', title: 'ぎんこんしき' },
    { years: 50, icon: '🥇', title: 'きんこんしき' },
  ];

  function pickMovieLine(lines) {
    return lines[Math.floor(Math.random() * lines.length)];
  }

  function partnerAnniversaryLine(partner, years) {
    const lines = PARTNER_SIGNATURE_LINES[partner.id] || [];
    if (!lines.length) return null;
    if (years >= 50) return `50ねんたっても、${lines[0]}`;
    if (years >= 25) return `銀婚式でも、いつもの ${partner.label}だった。 ${lines[1] || lines[0]}`;
    if (years >= 10) return `10ねんたっても 変わらない。 ${lines[0]}`;
    return `1ねんたって、少しだけ わかってきた。 ${lines[1] || lines[0]}`;
  }

  function playMarriageMovie(milestone) {
    if (!state.partner || !state.partner.married) return;
    clearDateMovieTimers();
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
    el.dateMoviePet.textContent = ownStage ? ownStage.emoji : '✨';
    el.dateMoviePartner.textContent = state.partner.emoji || '💞';
    const name = state.partner.label;
    const hadMismatch = (state.lifeLog || []).some((e) => e && /すれちがい|なかなおり/.test(e.text || ''));
    const signatureAnniversary = partnerAnniversaryLine(state.partner, milestone.years);

    const commonSmallTalk = [
      `「${name}、きょう なんの日か おぼえてる?」`,
      '「ちゃんと おぼえてるよ。そっちは?」',
      '「こういう日くらい、ちょっと ちゃんとしようか」',
      '「何年たっても、こういうの ちょっと はずかしいね」',
    ];
    const sharedMemory = hadMismatch
      ? [
          '「いろいろ あったね」「ほんとにね。でも まだ となりにいる」',
          'すれちがった日の はなしも、いまは ふたりで できる はなしに なっていた。',
          '「あのとき ちゃんと はなして よかったね」',
        ]
      : [
          '「思い出せない日も いっぱいあるね」「たぶん それで いいんだよ」',
          '何でもない日の ほうが、あとから たくさん 思い出せた。',
          '「結局、ふつうの日が いちばん 多かったね」',
        ];

    let beats;
    if (milestone.years >= 50) {
      beats = [
        `${name}と けっこんして 50ねん。`,
        pickMovieLine([
          '「50ねんって、言うと すごいね」「言わなきゃ いつもどおりだけどね」',
          '「50ねん たったらしいよ」「ほんと? まだ しゃべること あるね」',
          '「むかしより 歩くの おそくなったね」「そっちもね」',
        ]),
        signatureAnniversary || pickMovieLine(sharedMemory),
        pickMovieLine([
          'むかしの しゃしんを 見て、どっちが 先に 老けたかで しばらく もめた。',
          '「あのころの ふたりに 教えたら 信じるかな」「たぶん 信じない」',
          '手をつなぐほどでもないのに、歩く速さは ずっと おなじだった。',
        ]),
        pickMovieLine([
          '「まだ いっしょに いるね」「うん。まだ いるね」',
          '「ここまで 来たね」「じゃあ、もう少し 行こっか」',
          '「これからも よろしく、で いい?」「もう それで いいよ」',
        ]),
        'ふたりは また、いつもの 速さで あるきだした。',
      ];
    } else if (milestone.years >= 25) {
      beats = [
        `${name}と けっこんして 25ねん。ぎんこんしき。`,
        pickMovieLine([
          '「銀婚式だって」「銀って 何か もらえるの?」「知らない笑」',
          '「25ねん。長かった?」「短かったって 言ったら うそになるね」',
          '「昔の しゃしん 見る?」「それは ちょっと こわい」',
        ]),
        signatureAnniversary || pickMovieLine(sharedMemory),
        pickMovieLine([
          '古い しゃしんを ひらいて、服と髪型の はなしだけで しばらく 笑った。',
          '「このころ 若いね」「今も まあまあ いけるでしょ」',
          '思い出せない出来事も 多かったけど、となりにいたことは ちゃんと わかった。',
        ]),
        pickMovieLine([
          '「ここまで きたね」「うん。意外と きたね」',
          '「また 25ねん後も これ やる?」「そのとき 考えよ」',
          '「これからも よろしく」「それ、何回目?」',
        ]),
        '帰り道は、いつもと ほとんど おなじだった。',
      ];
    } else if (milestone.years === 10) {
      beats = [
        `${name}と けっこんして 10ねん。`,
        pickMovieLine([
          '「10ねんだって」「そんなに たった?」',
          '「10周年らしいよ」「じゃあ 今日は ちょっと いいもの 食べよ」',
          '「あの日から 10ねん」「あの日って どの日?」「そこから!?」',
        ]),
        signatureAnniversary || pickMovieLine(sharedMemory),
        pickMovieLine([
          '「変わった?」「変わった。でも 変わってないとこも ある」',
          '「10年前より 好き?」「そういう 質問する?笑」',
          'ふたりで 10年前の はなしをして、半分くらい 記憶が ちがっていた。',
        ]),
        '「まあ、これからも よろしく」',
      ];
    } else {
      beats = [
        `${name}と はじめての けっこんきねんび。`,
        pickMovieLine([
          '「1ねん たったね」「まだ 1ねんなんだね」',
          '「きょう 記念日だよ」「忘れてないよ。たぶん」',
          '「結婚して 1ねん」「なんか もっと 長い気がする笑」',
        ]),
        pickMovieLine([
          '「まだ 新婚って いっていい?」「いいんじゃない?」',
          '「1年目、どうでした?」「面接みたいに 聞かないで笑」',
          'ふたりとも 少しだけ てれながら、最初の一年を 思い返した。',
        ]),
        '「来年も おぼえてたら、また こうしよう」',
      ];
    }

    el.dateMovieCaption.textContent = beats[0];
    el.dateMovieCaption.classList.add('beat');
    const step = 4000;
    for (let i = 1; i < beats.length; i += 1) {
      dateMovieTimers.push(setTimeout(() => {
        el.dateMovieCaption.classList.remove('beat');
        void el.dateMovieCaption.offsetWidth;
        el.dateMovieCaption.textContent = beats[i];
        el.dateMovieCaption.classList.add('beat');
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
        pushLifeLog(milestone.icon, `${state.partner.label}と ${milestone.title}を むかえた`);
        playMarriageMovie(milestone);
        break;
      }
    }
  }

  function goOnDate(plan) {
    const blocked = dateBlockReason();
    if (blocked) {
      closeDateOverlay();
      setMessage(blocked);
      saveState();
      render();
      return;
    }
    const partner = state.partner;
    const region = findRegion(state.regionId);
    lastDatePlanId = plan.id;
    const signatureLines = PARTNER_SIGNATURE_LINES[partner.id];
    const traitLines = signatureLines && signatureLines.length
      ? signatureLines
      : (DATE_TRAIT_LINES[partner.affinityTrait] || DATE_TRAIT_LINES.gentle);
    const traitLine = traitLines[Math.floor(Math.random() * traitLines.length)];
    const closing = DATE_CLOSINGS[Math.floor(Math.random() * DATE_CLOSINGS.length)];

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
      pushLifeLog('💞', `${partner.label}と はじめての デートに いった`);
    } else {
      rememberSpecialDate(plan, partner);
    }

    setMessage(`💞 ${partner.label}と ${plan.label}デート。帰るころには、ふたりとも すこし ゆっくり 歩いていた`);
    emotePet('love');
    saveState();
    playOrdinaryDateMovie(plan, partner, traitLine, closing);
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
      id: 'gate', emoji: '⛩️', name: 'そらに うかぶ とりい', vibe: '神々しい',
      flash: '見上げると、雲より ずっと下に とりいが ひとつ うかんでいる',
      story: 'くぐれる 高さでは ないのに、なぜか 足が とまった。しばらく 見ていると、とりいが ほんの少し こちらへ かたむいた。風は なかった',
    },
    {
      id: 'stairs', emoji: '🪜', name: 'どこにも つながらない かいだん', vibe: '意味不明',
      flash: 'のはらの まんなかに、かいだんだけが たっている',
      story: '何段 のぼったか わからなくなって、いったん おりた。地面から 見ると 3段しかない。もう一度 のぼる気には なれなかった',
    },
    {
      id: 'boss', emoji: '🦑', name: 'あやまりに きた だいおういか', vibe: '笑える',
      flash: 'とてつもなく おおきい いかが、なぜか ものすごく ていねいに おじぎを している',
      story: '「このたびは まことに もうしわけ ございませんでした」と いかが いった。何のことか 聞いても、もう一度 深く おじぎを するだけ。とりあえず「いいよ」と 言ったら 帰っていった',
    },
    {
      id: 'lamp', emoji: '🏮', name: 'よなかの あかり', vibe: '温かい',
      flash: 'まっくらな みちの さきに、ちいさな あかりが ひとつ ついている',
      story: '近づくと、暗がりから「おかえり」と 聞こえた。だれも 見えない。通りすぎて 振り返ると、あかりだけが まだ そこに あった',
    },
    {
      id: 'mirror', emoji: '🪞', name: 'としを とった じぶん', vibe: '美しい・こわい',
      flash: 'みずたまりに、いまより ずっと としを とった じぶんが うつっている',
      story: 'みずたまりの 自分だけが 先に わらった。口が 何かを 言うように 動いたところで、水面が ゆれた。消える直前の 顔は、おだやかだった',
    },
  ];

  const LEGEND_COIN_GIFT = 200;

  // でんせつの であいが おきる じょうけん。ミニゲーム中・すいみん中・
  // なにかの がめんを ひらいている あいだは おきない(みのがす のが
  // いちばん もったいない イベントな ため)
  function maybeLegendEncounter() {
    if (!hasPerk(90) || state.legendMet || state.infinite) return;
    if (state.stage !== STAGE.GROWING || gameActive || state.isSleeping) return;
    if (state.transformOptions || pendingCompanionId || isAnyMenuOverlayOpen()) return;
    if (Math.random() >= LEGEND_ENCOUNTER_CHANCE) return;
    triggerLegendEncounter();
  }

  function playLegendEncounterMovie(legend, coins) {
    clearDateMovieTimers();
    clearConversationTimers();
    clearSpeechBubble();
    dateOpen = true;
    el.dateOverlay.classList.remove('hidden');
    el.dateChooser.classList.add('hidden');
    el.dateMovie.classList.remove('hidden');
    el.dateMovieCloseBtn.classList.add('hidden');
    el.dateMovieSkipBtn.classList.remove('hidden');
    el.dateMovieScene.classList.remove('special-reward', 'anniversary-major');
    el.dateMovieScene.dataset.plan = legend.id === 'boss' ? 'sea' : legend.id === 'gate' ? 'star' : legend.id === 'lamp' ? 'sunset' : 'photo';
    el.dateMoviePlace.textContent = `${legend.emoji} でんせつの であい`;
    const ownStage = SPECIES[state.speciesLine] && SPECIES[state.speciesLine].stages[state.stageIndex];
    el.dateMoviePet.textContent = ownStage ? ownStage.emoji : '✨';
    el.dateMoviePartner.textContent = legend.emoji;

    const beatsById = {
      gate: [
        '空を 見上げた。',
        '⛩️ 雲より下に、とりいが ひとつ 浮かんでいる。',
        '風は ない。',
        'それなのに、とりいが 少しだけ こちらへ かたむいた。',
        '「……いま、動いたよね?」',
      ],
      stairs: [
        '野原の まんなかに、階段だけが 立っていた。',
        '「……どこ行くの、これ」',
        'のぼっても のぼっても、何段目か わからない。',
        'いったん おりて 振り返る。',
        '階段は、3段しか なかった。',
        '「もう のぼらん」',
      ],
      boss: [
        '🦑 とてつもなく 大きなイカが あらわれた。',
        'ダイオウイカは、ものすごく 丁寧に おじぎをした。',
        '🦑「このたびは まことに もうしわけ ございませんでした」',
        '「……なにが?」',
        '🦑 もう一度、深々と おじぎをした。',
        '「まあ……いいよ」',
        '🦑 ダイオウイカは 帰っていった。',
      ],
      lamp: [
        'まっくらな道の先に、小さな あかりが ひとつ。',
        '近づくと、暗がりから 声がした。',
        '「おかえり」',
        '「……ただいま?」',
        '振り返ると、あかりだけが まだ そこにあった。',
      ],
      mirror: [
        '水たまりを のぞきこんだ。',
        'そこには、ずっと年をとった 自分がいた。',
        '「……ぼく?」',
        '水の中の自分だけが、先に わらった。',
        '何かを 言いかけた瞬間、水面が ゆれた。',
        '消える直前の顔は、おだやかだった。',
      ],
    };
    const beats = (beatsById[legend.id] || [legend.flash, legend.story]).concat([`💰 足もとに ${coins} が 置かれていた。`]);
    el.dateMovieCaption.textContent = beats[0];
    el.dateMovieCaption.classList.add('beat');
    const step = 3500;
    for (let i = 1; i < beats.length; i += 1) {
      dateMovieTimers.push(setTimeout(() => {
        el.dateMovieCaption.classList.remove('beat');
        void el.dateMovieCaption.offsetWidth;
        el.dateMovieCaption.textContent = beats[i];
        el.dateMovieCaption.classList.add('beat');
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
    const legend = pool[Math.floor(Math.random() * pool.length)];
    state.legendMet = true;
    if (!seen.includes(legend.id)) state.lifetime.legendsMet = seen.concat(legend.id);
    const coins = Math.round(LEGEND_COIN_GIFT * coinMultiplier());
    state.lifetime.money += coins;
    state.happiness = 100;
    applyGrowth(8);
    applyDecline(-25);
    pushLifeLog(legend.emoji, `${legend.name}に であった`);
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
    'おい!', 'やあ!', 'こんにちは!', 'こんばんは!', 'こら!', 'ねえねえ!', 'もしもし!',
    'ちょっと きいて!', 'こっち むいて!', 'ひま?', 'あそぼうよ!', 'かまって かまって!',
    'げんき?', 'なにしてるの?', 'さみしいよ…', 'おーい!', 'もう!むし しないで!',
    'ひとりごと きいてくれる?', 'ちょっと じかん ある?', 'なんか はなしてよ!',
    'ボーっと してない?', 'サボってない?', 'たいくつだよ〜', 'こっちみて こっちみて!',
    'わたしを わすれないでね', 'ねえ、ちゃんと みてる?', 'ひさしぶりな きが する!',
  ];

  const IDLE_GREETINGS_DIALECT = [
    // 関西弁
    'なにしてんねん!', 'げんきに しとる?', 'はなし きこか?', 'なんでやねん!',
    'ほんまに?', 'せやせや!', 'まいど!', 'おおきに!', 'ようきたな!',
    'かまへん かまへん', 'いくで〜!', 'ごっつ ひまやわ〜', 'ちゃうちゃう!', 'あかんて!',
    // 博多弁(福岡)
    'ちかっぱ げんき?', 'なんしよっと?', 'よかよか!', 'ばり ひまっちゃ〜', 'そうたい!',
    // 広島弁
    'ぶち げんき?', 'ほうじゃけん!', 'なんしょん?',
    // 名古屋弁
    'だがや!', 'ええでや!', 'きゃー いかんわ!',
    // 東北弁
    'げんき だっぺ?', 'おばんです!', 'なじょ してたん?', 'めんこいなぁ',
    // 北海道弁
    'なまら げんき?', 'したっけ〜!',
    // 土佐弁(高知)
    'げんきで やってるぜよ?', 'よう おいでたぜよ!',
    // うちなーぐち(沖縄)
    'はいさい!', 'めんそーれ!', 'なんくるないさ〜',
  ];

  const IDLE_GREETINGS_FOREIGN = [
    'Hello!', 'Hi there!', 'Hey!', 'Bonjour!', 'Hola!', 'Ciao!', 'Guten Tag!',
    '你好!', '안녕!', 'Aloha!', 'Namaste!', 'Привет!', "G'day mate!", 'Salut!',
    'Hej!', 'Olá!', 'Merhaba!', 'Shalom!', 'Yo!', 'Howdy!',
  ];

  const IDLE_GREETINGS_SILLY = [
    'ンモー!', 'なんちゃって!', 'ジャジャン!', 'びっくりした?', 'あなたの ばんです!',
    'ぴぴぴっ!', 'ドキッと した?', 'あそびに きたよ!', 'ここに いるよー!',
    'きゅうに はなしかけて ごめんね!', 'いまの ぼく、たぶん 天才', '冷蔵庫に 何か いた気がする',
    '人類は なぜ ねむるのか…ぼくは ねむいから', '今日ちょっと 顔よくない?', '急に 市役所いく?',
  ];

  const IDLE_GREETINGS = [
    ...IDLE_GREETINGS_STANDARD,
    ...IDLE_GREETINGS_DIALECT,
    ...IDLE_GREETINGS_FOREIGN,
    ...IDLE_GREETINGS_SILLY,
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
    'びょうきを なおしてもらった',
    'こいびとに なった',
    'けっこんした',
    'デートに いった',
    'はじめての デートに いった',
    'デートの おもいで:',
    'なかなおりした',
    'なかまに なった',
    'はじめて ',
    'たどりついた',
    'へんしんした',
    'れんくんに であった',
    'に であった',
  ];
  let lastMemoryRecallKey = null;

  function pickMemoryGreeting() {
    if (!Array.isArray(state.lifeLog)) return null;
    const memories = state.lifeLog.filter((entry) => entry
      && typeof entry.text === 'string'
      && MEMORY_RECALL_MARKERS.some((marker) => entry.text.includes(marker)));
    if (!memories.length) return null;

    // 年を重ね、思い出がいくつもできた個体は、ときどき人生全体を振り返る。
    if (currentAge() >= 40 && memories.length >= 3 && Math.random() < 0.2) {
      return `もう ${currentAge()}さいかぁ。いろいろ あったね`;
    }

    const recent = memories.slice(-12);
    const keyOf = (entry) => `${entry.age}|${entry.icon || ''}|${entry.text}`;
    const choices = recent.length > 1
      ? recent.filter((entry) => keyOf(entry) !== lastMemoryRecallKey)
      : recent;
    const entry = choices[Math.floor(Math.random() * choices.length)] || recent[recent.length - 1];
    if (!entry) return null;
    lastMemoryRecallKey = keyOf(entry);

    const text = String(entry.text)
      .replace(/^\d+さい\s+/, '')
      .replace(/[。!！]+$/, '');
    const eventAge = Number(entry.age);
    const when = Number.isFinite(eventAge)
      ? (currentAge() <= eventAge + 1 ? 'このまえ' : `${eventAge}さいの とき`)
      : 'まえに';

    if (text === 'びょうきを なおしてもらった') {
      return `${when} びょうきを なおしてくれたね。ありがとう!`;
    }
    if (text.startsWith('デートの おもいで:')) {
      return `${when}の デート、${text.replace('デートの おもいで:', '').trim()}。おぼえてる?`;
    }
    return `${when}、${text}ね。おぼえてる?`;
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
      effects: {}, desc: 'デートや たびを とくべつな おもいでに できる' },
  ];

  const FUN_ITEMS = [
    { id: 'fun_candy', label: 'キャンディ', emoji: '🍭', narration: '🍭 キャンディを ぺろぺろ。ちいさな おやつタイム!', emote: 'happy',
      petLines: ['あまーい!', 'もう ひとくち!', 'これ すき!'], partnerLines: ['おいしそうだね', 'ひとくち ちょうだい?', 'うれしそうで かわいい'], companionLines: ['ぼくも たべたい!', 'あまい におい!', 'いいなー!'] },
    { id: 'fun_bubbles', label: 'しゃぼんだま', emoji: '🫧', narration: '🫧 しゃぼんだまが ふわふわ ひろがった', emote: 'fun',
      petLines: ['まてまて〜!', 'こっちにも きた!', 'われるまえに つかまえる!'], partnerLines: ['ふふ、たのしそう', 'きれいだね', 'そっちにも とんでるよ'], companionLines: ['こっちこっち!', 'おおきいの きた!', 'つかまえた!…われた!'] },
    { id: 'fun_balloon', label: 'ふうせん', emoji: '🎈', narration: '🎈 ふうせんが ふわり。みんなで みあげた', emote: 'fun',
      petLines: ['どこまで いくの?', 'おちてこーい!', 'ふわふわ〜'], partnerLines: ['にげないように みてよう', 'なんか いいね', 'ずっと みてられる'], companionLines: ['つかまえる!', 'たかい!', 'ぼくの ところにも!'] },
    { id: 'fun_fireworks', label: 'はなび', emoji: '🎇', narration: '🎇 よぞらに はなびが ひらいた', emote: 'fun',
      petLines: ['わあっ!', 'もういっかい!', 'おおきい!'], partnerLines: ['きれい…', 'いっしょに みれて よかった', 'このまま みてたいね'], companionLines: ['どーん!', 'びっくりした!', 'つぎ くるかな?'] },
    { id: 'fun_camera', label: 'カメラ', emoji: '📸', narration: '📸 みんなで きねんしゃしんを とった', emote: 'happy',
      petLines: ['はい、チーズ!', 'どう? うつってる?', 'もう1まい!'], partnerLines: ['このしゃしん、とっておこうね', 'もうすこし こっち', 'いいかお してる'], companionLines: ['ぼくも はいる!', 'へんな かお する!', 'みせてみせて!'] },
    { id: 'fun_musicbox', label: 'オルゴール', emoji: '🎵', narration: '🎵 やさしい おとが へやに ひろがった', emote: 'happy',
      petLines: ['ゆらゆら〜', 'この おと すき', 'なんか ねむくなる…'], partnerLines: ['おちつくね', 'このまま ゆっくりしよう', 'いい きょくだね'], companionLines: ['おどろう!', 'ふしぎな おと!', 'もういっかい ききたい!'] },
    { id: 'fun_surprise', label: 'びっくりばこ', emoji: '🪄', narration: '🪄 びっくりばこが びよーん!', emote: 'fun',
      petLines: ['うわっ!', 'びっくりしたー!', 'もう こわくないぞ!'], partnerLines: ['ふふ、いい かおした', 'びっくりしたね', 'つぎは わたしが あける'], companionLines: ['わああ!', 'もう1かい!', 'いまの みた!?'] },
  ];

  function randomFunItem() {
    return FUN_ITEMS[Math.floor(Math.random() * FUN_ITEMS.length)];
  }

  let funSceneTimers = [];
  function clearFunSceneTimers() {
    funSceneTimers.forEach((t) => clearTimeout(t));
    funSceneTimers = [];
  }

  function pickFunLine(lines) {
    if (!lines || !lines.length) return null;
    return lines[Math.floor(Math.random() * lines.length)];
  }

  function playFunScene(item) {
    clearFunSceneTimers();
    setMessage(item.narration || `${item.emoji} ${item.label}で あそんだ`);
    showStoryEvent({ emoji: item.emoji, message: item.label });
    emotePet(item.emote || 'fun');

    const beats = [{ speaker: petSpeaker(), text: pickFunLine(item.petLines) }];
    if (state.partner && Math.random() < 0.85) beats.push({ speaker: partnerSpeaker(), text: pickFunLine(item.partnerLines) });
    if (state.companions.length && Math.random() < 0.85) beats.push({ speaker: companionSpeaker(), text: pickFunLine(item.companionLines) });

    const crownExtra = hasNaotoItem('naoto_crown') && Math.random() < 0.25;
    if (crownExtra) beats.push({ speaker: petSpeaker(), text: '👑 きょうは なんだか とくべつ!' });

    beats.filter((b) => b.speaker && b.text).slice(0, 4).forEach((beat, idx) => {
      funSceneTimers.push(setTimeout(() => {
        setSpeechBubble(beat.text, beat.speaker);
        if (idx === 0 || beat.speaker.kind === 'pet') emotePet(item.emote || 'fun');
      }, idx * SPEECH_DURATION_MS));
    });
  }

  const RECOVERY_EFFECT_LABELS = {
    hunger: 'おなか', happiness: 'ごきげん', energy: 'げんき',
    health: 'けんこう', decline: 'おとろえ', life: 'いのち',
  };

  // よつばのクローバーけい(そうび)と そだち80で、ごほうびの こうかが
  // まとめて 何ばいに なるか。むかしは かいふく量に 直に +15 する
  // たしざん だった ため、ちいさな ごほうびほど 相対的に 効きすぎていた
  function recoveryPotency() {
    const equipBonus = isEquipped('itemluck3') ? 0.4 : isEquipped('itemluck2') ? 0.22 : isEquipped('itemluck1') ? 0.1 : 0;
    const sodachiBonus = hasPerk(80) ? state.sodachi / 400 : 0;
    return 1 + equipBonus + sodachiBonus;
  }

  // その ごほうびを いま つかって、じっさいに なにか かわるか。
  // まんたんの ときに だまって きえて しまわない ように、つかう まえに しらべる
  function recoveryWouldHelp(item) {
    const e = item.effects;
    if (e.hunger && state.hunger < 100) return true;
    if (e.happiness && state.happiness < 100) return true;
    if (e.energy && state.energy < 100) return true;
    if (e.health && state.health < 100) return true;
    // ♾️ の せかいでは おとろえも いのちも とまっている ので、
    // その 2つは「かわる ところ」に かぞえない
    if (!state.infinite) {
      if (e.decline && state.decline > 0) return true;
      if (e.life && state.deathMeter > 0) return true;
    }
    return false;
  }

  // そだち30(はじめての ごほうび)で ドロップが 1だん 上位に よる。
  // そだち80(レアの きざし)では さらに キス/ハグ などの 最上位が 出やすくなる
  function pickWeightedItem() {
    const rankBonus = hasPerk(80) ? 2.5 : hasPerk(30) ? 1.0 : 0;
    const weights = RECOVERY_ITEMS.map((it) => it.weight * (1 + rankBonus * (it.rank / 7)));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < RECOVERY_ITEMS.length; i += 1) {
      roll -= weights[i];
      if (roll <= 0) return RECOVERY_ITEMS[i];
    }
    return RECOVERY_ITEMS[RECOVERY_ITEMS.length - 1];
  }

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
    state.speciesLine = pickDreamLine() || pickRandomLine();
    state.stage = STAGE.GROWING;
    state.ageTicks = 0;
    state.stageIndex = 0;
    const identity = rollIdentity(state.speciesLine);
    state.gender = identity.gender;
    state.orientationId = identity.orientationId;
    state.attractedTo = identity.attractedTo;
    setMessage('たまごに ひびが はいって、なかから ちいさな なおとっちが でてきた!');
    emotePet('happy');
    pushLifeLog('🥚', 'たまごから うまれた');
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
    setMessage(stage.message || `${stage.label}に なった!`);
    emotePet('fun');
    state.lifetime.money += 100;
    pushLifeLog(stage.emoji, `${age}さい ${stage.label}に なった`);
    showStoryEvent({ emoji: stage.emoji, message: `${age}さいに なった！\n${stage.label}` });
    celebrateAgeSpeech(age, stage.label);
    checkStoryEvents('evolve');
    // すがたが かわった しゅんかんだけ、へんしんの ちゅうせんを おこなう
    rollTransformChance();
  }

  // 1さいごと: ちいさな トースト。5さいごと: すこし にぎやか。
  // 10さいごと: 「としの おくりもの」(そだち30で 解禁)
  function onBirthday(age) {
    applyGrowth(2, { silent: true });
    celebrateAgeSpeech(age);
    applyDecline(-5, { silent: true });
    const bonus = Math.round((3 + state.maxSodachi / 25) * coinMultiplier());
    state.lifetime.money += bonus;
    if (age % 10 === 0 && Math.random() < (isEquipped('itemluck1') ? 0.32 : 0.25)) {
      state.items.reward = (state.items.reward || 0) + 1;
      setMessage(`🎁 ${age}さい。どこからか ごほうびが 1こ とどいた!`);
      emotePet('love');
    } else if (age % 5 === 0) {
      const fun = randomFunItem();
      state.items[fun.id] = (state.items[fun.id] || 0) + 1;
      setMessage(`🎂 ${age}さい。${fun.emoji}${fun.label}を もらって、さっそく しまいこんだ`);
      emotePet('happy');
    } else {
      setBirthdayToast(`🎂 ${age}さいに なった`);
    }
    if (age === 90) {
      state.miracleGuard = true;
      setMessage('🌅 90さい。朝のひかりを しばらく だまって 見ていた');
    }
  }

  // ================================================================
  // そだち / せいちょう / おとろえ
  // ================================================================
  function growthMultiplier() {
    return state.boostTicks > 0 ? 2 : 1;
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
      setMessage(`そだちが ${state.sodachi}に さがってしまった…`);
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
    pushLifeLog(perk.emoji, `そだちが ${value}に とどいた — ${perk.name}`);
    showStoryEvent({ emoji: perk.emoji, message: `そだち ${value}！ ${perk.name}\n${perk.desc}` });
    if (value === 90) state.lifetime.dreamEggs.rare += 1;
    if (value === 100) {
      state.lifetime.dreamEggs.normal += 1;
      state.lifetime.money += 5000;
      // 「その人生の のこりは 不死」を UI でも はっきりさせる。
      // ここで いのちを まんたんに もどし、おわかれの まえぶれも けす
      setMessage('👑 そだち100。💰5000と たまごの ゆめが のこされた');
    } else {
      setMessage(`${perk.emoji} そだち ${value}! ${perk.name}`);
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
    state.stage = STAGE.DEAD;
    state.lifetime.deaths += 1;
    state.dying = false;
    state.lifetime.bestSodachi = Math.max(state.lifetime.bestSodachi || 0, state.maxSodachi);
    pushLifeLog(currentSprite(), `${currentAge()}さいで てんごくへ いった`);
    setMessage('てんごくへ いってしまった…');
  }

  // 100さい到達。すぐに きろくカードへ とばさず、まず「さいごの じかん」に はいる。
  // ここでは そだち・ずかん・じっせき・コインが すべて とまるので、
  // 「もうひとつの freePlay」には ならない(§12)
  function enterFarewell() {
    state.stage = STAGE.FAREWELL;
    state.dying = false;
    const L = state.lifetime;
    L.clears += 1;                                              // ① てんじゅを まっとうした
    if (state.maxSodachi >= LIFE_CLEAR_SODACHI) L.lifeClears += 1; // ② いっしょうクリア
    if (state.maxSodachi >= SODACHI_MAX) L.bestLives += 1;      // ③ さいこうの いっしょう
    if (state.lifetime.devolutions === state.declineBaseline) L.flawlessLives += 1;
    pushLifeLog('🎊', '100さいに なった — てんじゅを まっとうした');
    setMessage('🎊 100さい。なおとっちは、いつもの場所を ゆっくり 見まわした');
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
    setMessage('♾️ ねんれいから じゆうに なった! ずかんから すきな すがたを えらべるよ');
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
      setMessage('あたらしい たまごが やってきた…');
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
    setMessage('♾️ の せかいから、この子の いっしょうに もどってきた');
    emotePet('happy');
  }

  // 人生の きろくカード。死亡時・100さい到達時に 見せる
  function buildLifeCard() {
    const L = state.lifetime;
    const age = currentAge();
    const species = SPECIES_DISPLAY_NAMES[state.speciesLine] || '???';
    const rows = [];
    rows.push(`<div class="lifecard-title">${currentSprite()} ${species}</div>`);
    rows.push(`<div class="lifecard-age">${age}さいまで いきた</div>`);
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
        rows.push(`<div class="lifecard-ren-memory"><div class="lifecard-ren-caption">⭐ れんくんの いっしょう</div><div class="lifecard-ren-stages">${renMemories}</div><div class="lifecard-ren-message">ちいさかった れんくんも、たくさんの おもいでと いっしょに おじいちゃんに なった。</div></div>`);
      }
    }
    rows.push(`<div class="lifecard-line">さいごの そだち <b>${state.sodachi}</b> ／ さいこうの そだち <b>${state.maxSodachi}</b></div>`);
    const badges = [];
    if (age >= GOAL_AGE) badges.push('★① てんじゅを まっとうした');
    if (age >= GOAL_AGE && state.maxSodachi >= LIFE_CLEAR_SODACHI) badges.push('★② いっしょうクリア');
    if (age >= GOAL_AGE && state.maxSodachi >= SODACHI_MAX) badges.push('★③ さいこうの いっしょう');
    if (badges.length) rows.push(`<div class="lifecard-badges">${badges.join('<br>')}</div>`);
    rows.push(`<div class="lifecard-line">へんしん ${state.transformsThisLife}かい ／ なかま ${state.companions.length}にん ／ ${state.partner && state.partner.married ? 'けっこん した' : state.partner ? 'こいびとが いた' : 'ひとりで いきた'}</div>`);
    if (state.datesThisLife > 0) {
      rows.push(`<div class="lifecard-line">デート ${state.datesThisLife}かい${state.legendMet ? ' ／ でんせつに であった' : ''}</div>`);
    } else if (state.legendMet) {
      rows.push('<div class="lifecard-line">でんせつに であった</div>');
    }
    rows.push(`<div class="lifecard-line">びょうきを ${state.totalSicknessCount}かい のりこえた ／ ずかん ${state.discoveredStages.length} / ${ALL_LINES.length * STAGES_PER_LINE}</div>`);
    const log = (state.lifeLog || []).slice(-8);
    if (log.length) {
      rows.push('<div class="lifecard-sep"></div>');
      rows.push(log.map((e) => `<div class="lifecard-log"><span>${e.age}さい</span> ${e.icon} ${e.text}</div>`).join(''));
    }
    return rows.join('');
  }

  function showLifeCard() {
    el.lifeCardBody.innerHTML = buildLifeCard();
    el.lifeCardOverlay.classList.toggle('rainbow', state.maxSodachi >= SODACHI_MAX);
    el.lifeCardOverlay.classList.toggle('gold', state.maxSodachi >= LIFE_CLEAR_SODACHI && state.maxSodachi < SODACHI_MAX);
    el.lifeCardOverlay.classList.remove('hidden');
    el.screenNormal.classList.add('hidden');
    el.farewellBar.classList.add('hidden');
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
        setMessage('もう だめかと 思ったところで、なおとっちが ゆっくり 目を あけた');
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
        setMessage('なおとっちの ようすが おかしい… はやく おせわを してあげて!');
        emotePet('sad');
      } else if (state.dyingTicks > 0) {
        state.dyingTicks -= 1;
      }
    } else if (state.dying) {
      state.dying = false;
      state.dyingTicks = 0;
      setMessage('なおとっちの 呼吸が おちついて、いつもの 顔に もどってきた');
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
    pushLifeLog('💊', 'びょうきを なおしてもらった');
  }

  // 1さいごとの ちいさな トースト(操作を とめない)
  let birthdayToastTimer = null;
  function setBirthdayToast(text) {
    if (!el.birthdayToast) return;
    el.birthdayToast.textContent = text;
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
    setMessage('からだが ふわっと 光った。いまなら すがたを かえられそう');
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
    showStoryEvent(event);
  }

  let storyFlashTimer = null;
  let endingBadgeTipTimer = null;

  function showStoryEvent(event) {
    el.storyFlashEmoji.textContent = event.emoji;
    el.storyFlashText.textContent = event.message;
    el.storyFlash.classList.remove('hidden');
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
      state.hunger = clamp(state.hunger - 0.6 * sleepFactor * hungerFactor * legendFactor, 0, 100);
      state.happiness = clamp(state.happiness - 0.6 * sleepFactor * happinessFactor * legendFactor, 0, 100);

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
            setMessage(`${sickness.label}に なってしまった…くすりをあげよう`);
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
          setMessage('きせきの ふんばり! もう すこし がんばる…!');
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
        const recovery = age < 10 ? 0.7 : age >= 70 ? lerp(1.4, 0.50, (age - 70) / 30) : 1.4;
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
    el.pet.classList.remove('bounce', ...EMOTE_CLASSES);
    // force reflow to restart animation
    void el.pet.offsetWidth;
    el.pet.classList.add('bounce');
    petBusyUntil = Date.now() + 500;
  }

  function emotePet(kind) {
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
        && Date.now() >= petBusyUntil;
      if (idleOk) {
        el.pet.classList.add('idle-perk');
        petBusyUntil = Date.now() + 520;
        setTimeout(() => el.pet.classList.remove('idle-perk'), 520);
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
        && !conversationIsBusy();
      if (canGreet) {
        const choices = [{ kind: 'pet', weight: 4 }];
        // 恋人・仲間がいる人生では本人だけが独占せず、周囲もかなりよく割り込む。
        if (state.partner) choices.push({ kind: 'partner', weight: 4 });
        if (state.companions.length) choices.push({ kind: 'companion', weight: 4 });
        const expanded = choices.flatMap((x) => Array(x.weight).fill(x.kind));
        const kind = expanded[Math.floor(Math.random() * expanded.length)];
        if (kind === 'partner') {
          setSpeechBubble(pickReaction(PARTNER_IDLE_LINES, null), partnerSpeaker());
        } else if (kind === 'companion') {
          setSpeechBubble(pickReaction(COMPANION_IDLE_LINES, null), companionSpeaker());
        } else {
          const memoryGreeting = Math.random() < 0.3 ? pickMemoryGreeting() : null;
          const greeting = memoryGreeting || pickReaction(IDLE_GREETINGS, lastIdleGreeting);
          if (!memoryGreeting) lastIdleGreeting = greeting;
          setSpeechBubble(greeting, petSpeaker());
          emotePet('happy');
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
    return dexOpen || achOpen || themeOpen || profileOpen || commOpen
      || itemOpen || duelOpen || worldOpen || seasonOpen || travelOpen
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
    const delay = hasPerk(40) ? 90000 + Math.random() * 90000 : 120000 + Math.random() * 120000;
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
    el.companionInviteEmoji.textContent = companion.emoji;
    const progress = (state.lifetime.companionFriendshipProgress || {})[companion.id] || 0;
    const reunited = progress > 0 && !hasRecruitedCompanionId(companion.id);
    el.companionInviteTitle.textContent = isRare
      ? `${companion.name}と めが あった`
      : reunited ? `${companion.name}が また きた` : `${companion.name}が こっちを みている`;
    el.companionInviteFlavor.textContent = companion.flavor;
    el.companionInviteOverlay.classList.toggle('rare', !!isRare);
    // まだ ミニゲームが はじまる まえに、ちゃんと 目に はいるよう
    // ひとこと メッセージらんにも のこす
    setMessage(isRare
      ? `${companion.emoji} みたことの ない なにかと めが あった…`
      : reunited ? `${companion.emoji} ${companion.name}だ。また あった` : `${companion.emoji} ${companion.name}が こっちを みている`);
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
  }

  function updateMeter(elBar, value, baseClass) {
    elBar.style.width = `${clamp(value, 0, 100)}%`;
    // 「いのち」だけは へるほど あぶない ので、たかい ときでは なく
    // ひくい ときに 警告の みため(low)に する
    const flag = baseClass === 'death'
      ? (value <= 30 ? 'low' : '')
      : (value >= 70 ? 'high' : '');
    elBar.className = `bar-fill ${baseClass} ${flag}`.trim();
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
    target.innerHTML = stageVisualHTML(stage, size);
  }

  // innerHTML で差し込んだimgも含め、404/壊れた画像は自動的にemojiへ戻す。
  document.addEventListener('error', (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !img.classList.contains('character-asset')) return;
    const wrapper = img.closest('.character-visual');
    if (wrapper) wrapper.classList.add('asset-failed');
  }, true);

  function currentVisualStage() {
    if (state.stage === STAGE.EGG) return { emoji:'🥚', label:'たまご' };
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
    const deviceTheme = COLOR_THEMES.find((t) => t.id === state.lifetime.deviceThemeId && isThemeUnlocked(t));
    const screenTheme = COLOR_THEMES.find((t) => t.id === state.lifetime.screenThemeId && isThemeUnlocked(t));
    COLOR_THEMES.forEach((t) => {
      el.device.classList.toggle(`theme-${t.id}`, t === deviceTheme);
      el.screen.classList.toggle(`theme-${t.id}`, t === screenTheme);
    });
    const devicePattern = PATTERNS.find((p) => p.id === state.lifetime.devicePatternId && isThemeUnlocked(p));
    const screenPattern = PATTERNS.find((p) => p.id === state.lifetime.screenPatternId && isThemeUnlocked(p));
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
      return `<span class="region-decor-item" style="left:${pos.left}%; top:${pos.top}%; font-size:${size}px; animation-duration:${duration}s; animation-delay:-${delay}s;">${emoji}</span>`;
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
    'tropical:winter': { bg: ['🌺', '✨'], bgCount: 3, front: [], frontCount: 0, tint: 'tropicalMild' },
    'desert:winter': { bg: ['💨', '✨'], bgCount: 3, front: [], frontCount: 0, tint: 'desertMild' },
    'desert:summer': { bg: ['☀️', '💨'], bgCount: 3, front: [], frontCount: 0, tint: 'desertSummer' },
    'tropical:summer': { bg: ['🌺', '✨', '🦋'], bgCount: 5, front: ['✨'], frontCount: 1, tint: 'tropicalSummer' },
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
    spring: { emoji: '🌸', text: '🌸 はるに なった!' },
    summer: { emoji: '🌻', text: '🌻 なつに なった!' },
    autumn: { emoji: '🍁', text: '🍁 あきに なった!' },
    winter: { emoji: '❄️', text: '❄️ ふゆに なった!' },
  };

  // regionId + season から、その くみあわせの みための ぜんじょうほうを
  // ひとつに まとめて かえす。しょうらい ミニゲームなどが「いまの 地域×
  // きせつ」を しりたい ときも、この かんすうだけ みれば よい
  function computeSeasonVisual(regionId, season) {
    const key = `${regionId}:${season}`;
    const base = SEASON_BASE_FX[season] || SEASON_BASE_FX.spring;
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
      items.push(`<span class="season-fx-item" style="left:${left}%; font-size:${size}px; --drift:${drift}px; animation-duration:${duration}s; animation-delay:-${delay}s;">${emoji}</span>`);
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
      span.textContent = emoji;
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
    const visualBaseId = region.visualBaseId || region.id;
    REGIONS.concat(SPECIAL_REGIONS).forEach((r) => {
      document.body.classList.toggle(`region-${r.id}`, r.id === region.id);
    });
    const season = getEffectiveSeason();
    const visualKey = `${visualBaseId}|${season}`;
    if (visualKey !== lastVisualKey) {
      applySeasonRegionVisuals(visualBaseId, season);
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

    setStageVisual(el.petSprite, currentVisualStage(), 'hero');
    const equippedItem = SHOP_ITEMS.find((it) => it.id === state.lifetime.equippedItemId);
    el.petAccessory.textContent = equippedItem ? equippedItem.emoji : '';
    el.petAccessory.classList.toggle('hidden', !equippedItem || isEgg || isDead);
    const crown = state.sodachi >= SODACHI_MAX ? ' 👑' : '';
    el.ageLabel.textContent = state.infinite ? 'ねんれい: ♾️' : `ねんれい: ${currentAge()}さい${crown}`;
    el.sodachiLabel.textContent = state.infinite ? 'そだち: ♾️' : `そだち: ${state.sodachi}`;
    el.moneyLabel.textContent = `💰 ${state.lifetime.money}`;
    el.stageLabel.textContent = currentStageLabel();
    // せいべつ/れんあいタイプは 前面に 出しすぎず、ここに そっと 添える
    // だけ(長押し/ホバーで わかる)
    el.stageLabel.title = state.gender
      ? `${GENDER_LABELS[state.gender]}・${orientationLabel(state.orientationId, state.gender)}`
      : '';

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

    el.poopRow.textContent = '💩'.repeat(state.poopCount);

    const badges = [];
    if (state.isSick) {
      const sickness = SICKNESS_TYPES.find((s) => s.label === state.sicknessType);
      badges.push(sickness ? sickness.badge : '🤒');
    }
    if (state.isSleeping && !isOver) badges.push('💤');
    el.badges.textContent = badges.join(' ');

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
    el.regionLabel.textContent = `${region.emoji} ${region.label}`;
    const effectiveSeason = getEffectiveSeason();
    const seasonInfo = SEASON_INFO[effectiveSeason];
    el.seasonLabel.textContent = seasonInfo ? `${seasonInfo.emoji} ${seasonInfo.label}` : '';
    el.partnerLabel.textContent = state.partner
      ? `${state.partner.mismatched ? '💔' : state.partner.married ? '💍' : '💑'} ${state.partner.emoji} ${state.partner.label}${state.partner.mismatched ? '(すれちがい)' : ''}`
      : '';
    el.partnerLabel.title = state.partner
      ? `${GENDER_LABELS[state.partner.gender]}・${orientationLabel(state.partner.orientationId, state.partner.gender)}・${state.partner.married ? '夫婦' : 'こいびと'}`
      : '';
    el.subStatusRow.classList.toggle('hidden', isEgg || isOver);
    el.profileBtn.classList.toggle('hidden', isEgg || isOver);
    el.commBtn.classList.toggle('hidden', isEgg || isOver);

    const endingTiersReached = state.lifetime.endingTiersReached;
    el.endingBadges.innerHTML = [...endingTiersReached]
      // tier0の🎉は「100さいクリア済み」の証。セーブに古い値が残っても
      // clears===0なら画面には絶対に出さない。
      .filter((tierIndex) => tierIndex !== 0 || (state.lifetime.clears || 0) > 0)
      .sort((a, b) => a - b)
      .map((tierIndex) => {
        const label = ENDING_TIER_UNLOCK_LABELS[tierIndex] || ENDING_TIERS[tierIndex].title;
        return `<span class="ending-badge" data-title="${ENDING_TIER_ICONS[tierIndex]} ${label} を たっせいずみ" title="${label}">${ENDING_TIER_ICONS[tierIndex]}</span>`;
      })
      .join('');

    renderCompanionRow();
    renderPartnerCompanion(isEgg || isOver);

    const hasTransformChoice = !!state.transformOptions && !isOver;
    el.transformOverlay.classList.toggle('hidden', !hasTransformChoice);
    if (hasTransformChoice) renderTransformChoices();

    if (message) {
      el.message.textContent = message;
    } else if (isDead) {
      el.message.textContent = '「はじめから」で あたらしい たまごを そだてよう';
    } else if (isEgg) {
      el.message.textContent = `たまごを タップするか「あたためる」を おしてね　${Math.min(100, Math.round((state.growth / HATCH_GROWTH) * 100))}%`;
    } else {
      el.message.textContent = '';
    }

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
    el.resetBtn.classList.toggle('hidden', !isOver && !isFarewell);
    // ♾️ の ボタンは 行き と かえり の りょうほうを かねる。パーフェクト
    // クリアずみなら、たまご中でも 人生の とちゅうでも いつでも 行き来できる
    const canEnterInfinite = state.lifetime.perfectCleared && !state.infinite && !isDead;
    el.infiniteBtn.classList.toggle('hidden', !state.infinite && !canEnterInfinite);
    el.infiniteBtnIcon.textContent = state.infinite ? '↩️' : '♾️';
    el.infiniteBtnLabel.textContent = state.infinite ? 'いっしょうに もどる' : '♾️のせかい';
    el.infiniteBtn.title = state.infinite ? 'この子の いっしょうに もどる' : '♾️ の せかいへ';

    el.sleepBtn.querySelector('span').textContent = state.isSleeping ? 'おきる' : 'ねる';
    el.playWithBtn.querySelector('span').textContent = isEgg ? 'あたためる' : 'じゃれる';
    el.playWithBtn.title = isEgg ? 'たまごを あたためる' : 'じゃれる';
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

    el.worldOverlay.classList.toggle('hidden', !worldOpen);
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
      ? `いまは さそえません: ${dateBlocked}`
      : `${state.partner ? state.partner.emoji + ' ' + state.partner.label : 'こいびと'}と でかけられます`;

    el.seasonOverlay.classList.toggle('hidden', !seasonOpen);
    if (seasonOpen) renderSeasonModeGrid();

    el.travelOverlay.classList.toggle('hidden', !travelOpen);
    if (travelOpen) renderTravelRegionGrid();

    // ゲーム機・えきしょうの てまえまで よこぎる ぜんけいの きせつ
    // エフェクトは、しさが だいじな ばめん(ミニゲーム中や、よみもの/
    // そうさを おもんじる かくオーバーレイ)を ひらいている あいだ とめる。
    // はいけいエフェクト(region-decor/season-bg-fx)は デバイスの うしろに
    // かくれた ままなので、ここでは とめない
    const suppressFrontFx = gameActive || hasTransformChoice || isAnyMenuOverlayOpen();
    el.seasonFrontFx.classList.toggle('suppressed', suppressFrontFx);

    renderItemsRow(disableCare);
  }

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
  let seasonOpen = false;
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
    dexOpen = false;
    achOpen = false;
    themeOpen = false;
    profileOpen = false;
    commOpen = false;
    itemOpen = false;
    duelOpen = false;
    worldOpen = false;
    seasonOpen = false;
    travelOpen = false;
    dateOpen = false;
    companionInviteOpen = false;
    pickerOpen = false;
    pickerItem = null;
    dexDetail = null;
    orientationHintOpen = false;
    clearDateMovieTimers();
  }

  function openExclusiveMenu(kind) {
    closeAllMenuOverlays();
    if (kind === 'dex') dexOpen = true;
    else if (kind === 'ach') achOpen = true;
    else if (kind === 'theme') themeOpen = true;
    else if (kind === 'profile') profileOpen = true;
    else if (kind === 'comm') commOpen = true;
    else if (kind === 'item') itemOpen = true;
    else if (kind === 'world') worldOpen = true;
    render();
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
  function renderAchievements() {
    const unlockedCount = state.achievementsUnlocked.length;
    el.achProgress.textContent = `${unlockedCount} / ${ACHIEVEMENTS.length}`;
    el.achGrid.innerHTML = ACHIEVEMENTS.map((ach) => {
      const known = state.achievementsUnlocked.includes(ach.id);
      const emoji = known ? ach.emoji : '🔒';
      return `<div class="ach-cell ${known ? 'known' : 'locked'}"><span class="ach-cell-emoji">${emoji}</span><div class="ach-cell-text"><span class="ach-cell-label">${ach.label}</span><span class="ach-cell-desc">${ach.desc}</span></div></div>`;
    }).join('');
  }

  function renderThemeSwatchGrid(gridEl, selectedId, swatchField) {
    gridEl.innerHTML = COLOR_THEMES.map((t) => {
      const unlocked = isThemeUnlocked(t);
      const selected = unlocked && t.id === selectedId;
      const circleStyle = unlocked ? ` style="background:${t[swatchField]}"` : '';
      const label = unlocked ? t.label : '？？？';
      return `<button type="button" class="theme-swatch ${unlocked ? '' : 'locked'} ${selected ? 'selected' : ''}" data-id="${t.id}" ${unlocked ? '' : 'disabled'}><span class="theme-swatch-circle"${circleStyle}>${unlocked ? '' : '🔒'}</span><span class="theme-swatch-label">${label}</span></button>`;
    }).join('');
  }

  // COLOR_THEMES の いろスウォッチと ちがい、PATTERNS は 単色を
  // もたないので、まる の なかみに その がらの めじるしの emoji を
  // そのまま おく(じっさいの タイル もようは 選んで がめんに 反映した
  // ときに style.css の .screen.pattern-<id> で 見える)
  function renderPatternSwatchGrid(gridEl, selectedId) {
    gridEl.innerHTML = PATTERNS.map((p) => {
      const unlocked = isThemeUnlocked(p);
      const selected = unlocked && p.id === selectedId;
      const label = unlocked ? p.label : '？？？';
      const circleContent = unlocked ? p.emoji : '🔒';
      return `<button type="button" class="theme-swatch ${unlocked ? '' : 'locked'} ${selected ? 'selected' : ''}" data-id="${p.id}" ${unlocked ? '' : 'disabled'}><span class="theme-swatch-circle">${circleContent}</span><span class="theme-swatch-label">${label}</span></button>`;
    }).join('');
  }

  function renderThemeOverlay() {
    // ヘッダーの ぜんたい数は、いろ(COLOR_THEMES)と がら(PATTERNS)
    // を あわせた かずで あらわす
    const unlockedColors = COLOR_THEMES.filter((t) => isThemeUnlocked(t)).length;
    const unlockedPatterns = PATTERNS.filter((p) => isThemeUnlocked(p)).length;
    el.themeProgress.textContent = `${unlockedColors + unlockedPatterns} / ${COLOR_THEMES.length + PATTERNS.length}`;
    renderThemeSwatchGrid(el.deviceThemeGrid, state.lifetime.deviceThemeId, 'deviceSwatch');
    renderThemeSwatchGrid(el.screenThemeGrid, state.lifetime.screenThemeId, 'screenSwatch');
    renderPatternSwatchGrid(el.devicePatternGrid, state.lifetime.devicePatternId);
    renderPatternSwatchGrid(el.screenPatternGrid, state.lifetime.screenPatternId);
  }

  // なおとっち本体の しゅぞく・せいちょう段階・せいべつ・れんあいタイプ・
  // せいかく傾向(traitCounts)と、こいびとが いれば その せいべつ・
  // れんあいタイプ・affinityTrait を まとめて 見せる
  function renderProfile() {
    el.profileSpecies.textContent = SPECIES_DISPLAY_NAMES[state.speciesLine] || '???';
    el.profileStage.textContent = currentStageLabel();
    el.profileGender.textContent = state.gender ? GENDER_LABELS[state.gender] : '???';

    let orientationText = state.orientationId ? orientationLabel(state.orientationId, state.gender) : '???';
    if (state.orientationId === 'questioning') {
      orientationText += ` — さがしちゅう ${state.questioningEncounters || 0}/${questioningResolveThreshold()}`;
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
      aro: 'だれかを「すき」に なる きもちが、あまり わいてこない こ。'
        + 'だから「きゅうあいする」を おしても こいびとには ならないけれど、'
        + 'なかまや ともだちとは これまでどおり なかよく なれるよ。'
        + 'ひとりの じかんが すきなだけで、さみしい わけでは ないんだ',
      questioning: 'じぶんが だれを すきに なるのか、まだ さがしている とちゅうの こ。'
        + `「きゅうあいする」を おすたびに けいけんが 1つ たまって、${questioningResolveThreshold()}かい たまると じぶんの きもちが はっきりする。`
        + 'うまく いかなかった かいも、ちゃんと けいけんに なるよ',
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
        : `<span class="profile-partner-detail">つぎの ふしめまで あと ${marriageBondThreshold() - (p.bondCount || 0)}かいの きゅうあい</span>`;
      el.profilePartnerCard.innerHTML = `
        <div class="profile-partner-card">
          <span class="profile-partner-emoji">${p.emoji}</span>
          <div class="profile-partner-text">
            <span class="profile-partner-name">${p.label}(${p.married ? '夫婦 💍' : 'こいびと 💑'})</span>
            <span class="profile-partner-detail">${GENDER_LABELS[p.gender]}・${orientationLabel(p.orientationId, p.gender)}</span>
            <span class="profile-partner-detail">すきな ところ: ${TRAIT_LABELS[p.affinityTrait] || 'とくに なし'}</span>
            ${bondHint}
          </div>
        </div>
        <div class="profile-trait-row" style="margin-top:6px;">
          <span class="profile-trait-label">なかよし度</span>
          <div class="profile-trait-bar"><div class="profile-trait-fill" style="width:${p.affection ?? 100}%"></div></div>
        </div>
      `;
    } else {
      el.profilePartnerCard.innerHTML = '<div class="profile-empty">まだ こいびとは いません</div>';
    }

    if (state.companions.length) {
      el.profileCompanionList.innerHTML = state.companions.map((sc) => {
        const c = allCompanionsById(sc.id);
        if (!c) return '';
        return `
          <div class="profile-companion-row">
            <span class="profile-companion-emoji">${c.emoji}</span>
            <span class="profile-companion-name">${c.name}</span>
            <div class="profile-trait-bar"><div class="profile-trait-fill" style="width:${sc.bond ?? 100}%"></div></div>
          </div>
        `;
      }).join('');
    } else {
      el.profileCompanionList.innerHTML = '<div class="profile-empty">いま そばに いる なかまは いません</div>';
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
        ? '<div class="profile-hint">いま べつの あいてと こいびと/夫婦なので、この おきゃくさんに きゅうあいするには いまの あいてと わかれる ひつようが あります</div>'
        : '';
      el.guestStatus.innerHTML = `
        <div class="profile-partner-card">
          <span class="profile-partner-emoji">${stageVisualHTML(stage, 'thumb')}</span>
          <div class="profile-partner-text">
            <span class="profile-partner-name">ともだちの ${stage.label}</span>
            <span class="profile-partner-detail">${GENDER_LABELS[g.gender]}・${orientationLabel(g.orientationId, g.gender)}</span>
          </div>
        </div>
        ${blockedHint}
        <button class="profile-code-btn" id="clearGuestBtn">おきゃくを けす</button>
      `;
    } else {
      el.guestStatus.innerHTML = '<div class="profile-empty">まだ おきゃくさんは いません</div>';
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
    el.seasonModeGrid.innerHTML = SEASON_MODE_ORDER.map((mode) => {
      const info = mode === SEASON_MODE_AUTO ? { emoji: '🕐', label: 'げんじつに あわせる' } : SEASON_INFO[mode];
      const selected = mode === currentMode;
      return `<button type="button" class="theme-swatch ${selected ? 'selected' : ''}" data-id="${mode}"><span class="theme-swatch-circle">${info.emoji}</span><span class="theme-swatch-label">${info.label}</span></button>`;
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
    const swatch = (region) => {
      const isCurrent = region.id === state.regionId;
      return `<button type="button" class="theme-swatch ${isCurrent ? 'selected' : ''}" data-id="${region.id}" ${isCurrent ? 'disabled' : ''}><span class="theme-swatch-circle">${region.emoji}</span><span class="theme-swatch-label">${region.label}</span></button>`;
    };
    el.travelRegionGrid.innerHTML = REGIONS.map(swatch).join('');
    // そだち70「たびだち」に とどいて はじめて、ふつうの 8地域の したに
    // 「とくべつな たびさき」が あらわれる。REGIONS とは べつ わく なので、
    // じっせきの「せかい いっしゅう(8つ)」も「こいびと ぜんいん(16人)」も
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
      el.duelRecord.textContent = played > 0 ? `${played}戦 ${wins}勝 ${losses}敗${draws ? ` ${draws}分け` : ''}` : 'まだ たいせんして いません';
      const traits = state.lifetime.duelTraits || {};
      const totalTrait = Object.values(traits).reduce((a, b) => a + b, 0);
      if (totalTrait === 0) {
        el.duelTraitSummary.innerHTML = '<div class="profile-empty">まだ 傾向は わかりません。しょうぶで こたえて いくと 見えてきます</div>';
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
        hint = 'この「挑戦コード」を あいてに おくってください。あいてが よみこんで こたえたら、かえってくる「推理コード」を つぎに 入力します';
      } else if (d.role === 'challenger' && d.step === 'done') {
        code = encodeDuelReveal();
        hint = 'しょうぶの けっかが でました!この「決着コード」を あいてに おくると、あいての がわでも けっかが わかります';
      } else if (d.role === 'guesser') {
        code = encodeDuelGuess();
        hint = 'この「推理コード」を あいてに かえしてください。あいてから 「決着コード」が とどいたら、つぎに 入力します';
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
        ? 'あいてから とどいた「推理コード」を ここに 入れてください'
        : 'あいてから とどいた「決着コード」を ここに 入れてください';
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
    el.duelProgress.textContent = `しつもん ${idx + 1} / ${d.questions.length}(かいとうずみ ${answeredCount} 問)`;
    el.duelLieCoinRow.classList.remove('hidden');
    el.duelLieCoinCount.textContent = `${d.lieCoinsMax - duelLieCoinsUsed(d)} / ${d.lieCoinsMax}`;
    el.duelQuestionEmoji.textContent = q.emoji;
    el.duelQuestionText.textContent = q.text;
    el.duelLieFlash.classList.add('hidden');
    el.duelBackBtn.disabled = idx <= 0 && d.pendingTruth == null;

    if (d.pendingTruth == null) {
      el.duelQuestionShown.classList.add('hidden');
      el.duelTruthChoiceRow.classList.remove('hidden');
      el.duelHonestyChoiceRow.classList.add('hidden');
      el.duelChoiceABtn.textContent = q.a.label;
      el.duelChoiceBBtn.textContent = q.b.label;
      el.duelChoiceABtn.dataset.choice = 'a';
      el.duelChoiceBBtn.dataset.choice = 'b';
      const existing = d.entries[idx];
      el.duelChoiceABtn.classList.toggle('duel-choice-current', !!existing && existing.truth === 'a');
      el.duelChoiceBBtn.classList.toggle('duel-choice-current', !!existing && existing.truth === 'b');
    } else {
      const chosenSide = d.pendingTruth === 'a' ? q.a : q.b;
      el.duelQuestionShown.textContent = `あなたの 本心:「${chosenSide.label}」`;
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
            <span class="duel-review-row-q">${q.text}</span>
            <span class="duel-review-row-detail">本心:「${truthSide.label}」・${e.isLie ? '🃏 うそで こうかい' : '😇 本音で こうかい'}${testimonyText}</span>
            <span class="duel-review-row-pub">あいてに 見える こたえ:「${pubSide.label}」</span>
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
            <span class="duel-guess-row-text">${q.text}</span>
          </div>
          <div class="duel-guess-row-pub">こうかいされた こたえ:「${shownSide.label}」</div>
          ${testimonyHtml}
          <div class="duel-guess-row-buttons">
            <button type="button" class="duel-guess-btn ${current && current.guess === 'honest' ? 'selected' : ''}" data-guess="honest">😇 本音だと思う</button>
            <button type="button" class="duel-guess-btn ${current && current.guess === 'lie' ? 'selected' : ''}" data-guess="lie">🃏 うそだと思う</button>
          </div>
          <div class="duel-guess-row-confidence">
            <button type="button" class="duel-confidence-btn ${current && current.confidence === 'maybe' ? 'selected' : ''}" data-confidence="maybe">🤔 たぶん</button>
            <button type="button" class="duel-confidence-btn ${current && current.confidence === 'certain' ? 'selected' : ''}" data-confidence="certain">🔥 ぜったい</button>
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
      const guessLabel = g && g.guess === 'honest' ? '😇 本音だと 推理した' : '🃏 うそだと 推理した';
      return `
        <button type="button" class="duel-suspicion-row" data-qid="${item.qId}">
          <span class="duel-suspicion-row-emoji">${q.emoji}</span>
          <div class="duel-suspicion-row-text">
            <span class="duel-suspicion-row-q">${q.text}</span>
            <span class="duel-suspicion-row-pub">「${shownSide.label}」・${guessLabel}</span>
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
    el.duelRevealRunning.textContent = `ここまで: A ${running.a}点 － B ${running.b}点`;

    if (isSuspicionStep) {
      const row = d.breakdown.find((r) => r.qId === d.suspicionQId);
      el.duelRevealProgress.textContent = '👀 いちばん あやしい!';
      el.duelRevealEmoji.textContent = row.emoji;
      el.duelRevealText.textContent = row.text;
      el.duelRevealPub.textContent = `こうかいされた こたえ:「${row.pubLabel}」`;
      if (row.testimony) {
        const t = DUEL_TESTIMONY_PRESETS.find((tt) => tt.id === row.testimony);
        el.duelRevealTestimony.textContent = t ? `💬「${t.label}」` : '';
        el.duelRevealTestimony.classList.toggle('hidden', !t);
      } else {
        el.duelRevealTestimony.classList.add('hidden');
      }
      el.duelRevealGuess.textContent = 'Bが「いちばん あやしい」と 指名した もんだいです';
      if (duelRevealPhase === 'pending') {
        el.duelRevealOutcome.classList.add('hidden');
        el.duelRevealNextBtn.textContent = 'めくる 🎴';
      } else {
        el.duelRevealOutcome.classList.remove('hidden');
        if (row.wasHonest) {
          el.duelRevealOutcomeTitle.textContent = '😳 じつは 本音でした';
          el.duelRevealOutcomeDesc.textContent = '「いちばん あやしい」は はずれ…Aに ボーナス';
          el.duelRevealOutcomePoints.textContent = 'A +1(いちばん あやしい ボーナス)';
        } else {
          el.duelRevealOutcomeTitle.textContent = '👀 やっぱり うそでした!';
          el.duelRevealOutcomeDesc.textContent = '「いちばん あやしい」が てきちゅう!Bに ボーナス';
          el.duelRevealOutcomePoints.textContent = 'B +1(いちばん あやしい ボーナス)';
        }
        el.duelRevealNextBtn.textContent = 'けっかを 見る';
      }
      return;
    }

    const row = d.breakdown[duelRevealIndex];
    const isLastQuestion = duelRevealIndex === DUEL_MATCH_QUESTION_COUNT - 1;
    const closeMatch = isLastQuestion && duelRevealPhase === 'pending' && Math.abs(running.a - running.b) <= 2;
    el.duelRevealProgress.textContent = `しつもん ${duelRevealIndex + 1} / ${DUEL_MATCH_QUESTION_COUNT}${closeMatch ? '(せっせん!ラストです…)' : ''}`;
    el.duelRevealEmoji.textContent = row.emoji;
    el.duelRevealText.textContent = row.text;
    el.duelRevealPub.textContent = `こうかいされた こたえ:「${row.pubLabel}」`;
    if (row.testimony) {
      const t = DUEL_TESTIMONY_PRESETS.find((tt) => tt.id === row.testimony);
      el.duelRevealTestimony.textContent = t ? `💬「${t.label}」` : '';
      el.duelRevealTestimony.classList.toggle('hidden', !t);
    } else {
      el.duelRevealTestimony.classList.add('hidden');
    }
    const confLabel = DUEL_CONFIDENCE_LABELS[row.confidence] || DUEL_CONFIDENCE_LABELS.maybe;
    el.duelRevealGuess.textContent = `Bの すいり: ${row.guess === 'honest' ? '😇 本音だと思う' : '🃏 うそだと思う'}(${confLabel})`;

    if (duelRevealPhase === 'pending') {
      el.duelRevealOutcome.classList.add('hidden');
      el.duelRevealNextBtn.textContent = 'めくる 🎴';
    } else {
      el.duelRevealOutcome.classList.remove('hidden');
      el.duelRevealOutcomeTitle.textContent = row.flourishTitle;
      el.duelRevealOutcomeDesc.textContent = row.flourishDesc;
      el.duelRevealOutcomePoints.textContent = row.pointsLabel;
      el.duelRevealNextBtn.textContent = duelRevealIndex + 1 < DUEL_TOTAL_REVEAL_STEPS ? 'つぎへ' : 'けっかを 見る';
    }
  }

  function renderDuelFinalStage(d) {
    const iAmGuesser = d.role === 'guesser';
    const myOutcome = d.matchOutcome === 'draw' ? 'draw' : (d.matchOutcome === (iAmGuesser ? 'B' : 'A') ? 'win' : 'lose');
    el.duelResultTitle.textContent = myOutcome === 'win' ? '🎉 Aの かち!' : (myOutcome === 'lose' ? '😢 Bの かち' : '🤝 ひきわけ');
    el.duelResultScore.textContent = `A ${d.aTotal}点 － B ${d.bTotal}点`;
    const delta = d.moneyDelta || 0;
    const moneyLine = delta > 0 ? `+💰${delta}` : (delta < 0 ? `-💰${Math.abs(delta)}` : 'かけきんの やりとりなし(ひきわけ)');
    el.duelResultDesc.textContent = `おかね: ${moneyLine}\nいまの おかね: 💰${state.lifetime.money}`;

    const susLine = d.susBonus
      ? `<div class="duel-result-row ${d.susBonus === 'B' ? 'correct' : 'wrong'}"><span class="duel-result-row-emoji">👀</span><div class="duel-result-row-text"><span class="duel-result-row-question">いちばん あやしい ボーナス</span><span class="duel-result-row-detail">${d.susBonus === 'B' ? 'てきちゅう!' : 'はずれ…'}</span></div><span class="duel-result-row-mark">${d.susBonus} +1</span></div>`
      : '';

    el.duelResultBreakdown.innerHTML = (d.breakdown || []).map((b) => {
      const t = b.testimony ? DUEL_TESTIMONY_PRESETS.find((tt) => tt.id === b.testimony) : null;
      const testimonyText = t ? `・証言:「${t.label}」` : '';
      const confLabel = DUEL_CONFIDENCE_LABELS[b.confidence] || DUEL_CONFIDENCE_LABELS.maybe;
      return `
        <div class="duel-result-row ${b.correct ? 'correct' : 'wrong'}">
          <span class="duel-result-row-emoji">${b.emoji}</span>
          <div class="duel-result-row-text">
            <span class="duel-result-row-question">${b.flourishTitle} ${b.text}</span>
            <span class="duel-result-row-detail">${b.flourishDesc}・こうかいされた こたえ:「${b.pubLabel}」(${b.wasHonest ? '✅ 本音' : '🎭 うそ'})・すいり:${b.guess === 'honest' ? 'ほんと' : 'うそ'}(${confLabel})${testimonyText}</span>
          </div>
          <span class="duel-result-row-mark">${b.pointsLabel}</span>
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
        <span class="shop-item-emoji">🎁</span>
        <span class="shop-item-label">ごほうび</span>
        <span class="shop-item-desc">デートや たびを とくべつな思い出に できる。ここからは使わないよ</span>
        <span class="shop-item-status">${count > 0 ? `${count}こ もっている` : 'まだ もっていない'}</span>
      </button>
    `;
  }

  function renderItemOverlay() {
    el.itemMoneyLabel.textContent = `💰 ${state.lifetime.money}`;
    renderRewardItemGrid();
    el.shopItemGrid.innerHTML = SHOP_ITEMS.map((item) => {
      const owned = state.lifetime.ownedShopItems.includes(item.id);
      const equipped = state.lifetime.equippedItemId === item.id;
      const statusText = !owned ? `💰${item.price}` : (equipped ? 'そうびちゅう' : 'タップで そうび');
      const badge = equipped ? '⭐' : (owned ? '✔️' : '');
      return `
        <button type="button" class="shop-item ${equipped ? 'equipped owned' : (owned ? 'owned' : '')}" data-id="${item.id}">
          <span class="shop-item-badge">${badge}</span>
          <span class="shop-item-emoji">${item.emoji}</span>
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
    el.naotoItemGrid.innerHTML = NAOTO_ITEMS.map((item) => {
      const unlocked = state.lifetime.endingTiersReached.includes(item.unlockTier);
      if (!unlocked) {
        return `
          <button type="button" class="shop-item" disabled data-id="${item.id}">
            <span class="shop-item-emoji">🔒</span>
            <span class="shop-item-label">？？？</span>
            <span class="shop-item-desc">${ENDING_TIER_ICONS[item.unlockTier]} ${ENDING_TIER_UNLOCK_LABELS[item.unlockTier]}を たっせいすると もらえる</span>
            <span class="shop-item-status"></span>
          </button>
        `;
      }
      return `
        <button type="button" class="shop-item equipped owned" disabled data-id="${item.id}">
          <span class="shop-item-badge">✔️</span>
          <span class="shop-item-emoji">${item.emoji}</span>
          <span class="shop-item-label">${item.label}</span>
          <span class="shop-item-desc">${item.desc}</span>
          <span class="shop-item-status">たっせいほうしゅう</span>
        </button>
      `;
    }).join('');
  }

  // こうにゅうすれば それいこう ずっと こうかを はっきしつづける(SHOP_ITEMS
  // の ように そうび/かいじょを きりかえる ものではないので、こうにゅう
  // ずみなら それ以上 なにも おきない ボタンに なる)
  function buyNaotoItem() {
    // なおとのアイテムは購入しない。クリア条件を満たすと自動でもらえる。
    return;
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
        setMessage('おかねが たりない…');
        render();
        return;
      }
      state.lifetime.money -= item.price;
      state.lifetime.ownedShopItems.push(id);
      state.lifetime.equippedItemId = id;
      setMessage(`${item.label}を こうにゅうして そうびした!${item.emoji}`);
      emotePet('happy');
    } else if (state.lifetime.equippedItemId === id) {
      state.lifetime.equippedItemId = null;
      setMessage(`${item.label}を はずした`);
    } else {
      state.lifetime.equippedItemId = id;
      setMessage(`${item.label}を そうびした!${item.emoji}`);
      emotePet('happy');
    }
    saveState();
    render();
  }

  // つかいきり アイテムの いちらん(みこうにゅう/こうにゅうずみ の きがえが
  // ない ため、ねだんの みだけ つねに 出す。available()を みたさない ときは
  // グレー表示にして、おした ときに unavailableMessage を 出す)
  function renderConsumableItemGrid() {
    el.onetimeItemGrid.innerHTML = CONSUMABLE_ITEMS.map((item) => {
      const usable = !item.available || item.available();
      // ★ グレーアウトしているのに 理由が どこにも 書いていない、という
      //   じょうたいを なくす。つかえない ときは そのまま 理由を 出す
      const status = usable
        ? `💰${item.price}`
        : `つかえません: ${item.unavailableMessage || 'いまは つかえない'}`;
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
      setMessage(item.unavailableMessage || 'いまは つかえない…');
      render();
      return;
    }
    if (state.lifetime.money < item.price) {
      setMessage('おかねが たりない…');
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
      setMessage('おかねが たりない…');
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
          <span class="ach-cell-emoji">${ach.emoji}</span>
          <div class="ach-cell-text"><span class="ach-cell-label">${ach.label}</span><span class="ach-cell-desc">${ach.desc}</span></div>
        </div>
      `).join('');
    } else if (item.picker === 'color') {
      el.pickerGrid.className = 'theme-grid';
      html = COLOR_THEMES.filter((t) => t.unlockTier !== undefined && !t.unlockAll && !isThemeUnlocked(t)).map((t) => `
        <button type="button" class="theme-swatch" data-picker-value="${t.id}">
          <span class="theme-swatch-circle" style="background:${t.deviceSwatch}"></span>
          <span class="theme-swatch-label">${t.label}</span>
        </button>
      `).join('');
    } else if (item.picker === 'pattern') {
      el.pickerGrid.className = 'theme-grid';
      html = PATTERNS.filter((p) => p.unlockTier !== undefined && !p.unlockAll && !isThemeUnlocked(p)).map((p) => `
        <button type="button" class="theme-swatch" data-picker-value="${p.id}">
          <span class="theme-swatch-circle">${p.emoji}</span>
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
    el.pickerGrid.innerHTML = html || '<div class="profile-empty">えらべる ものが ありません</div>';
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
    // クリア条件ごとのゴールアート(assets/clear/goal-1.jpg〜goal-5.jpg)。
    // 差し替えるだけで全画面に反映できる。
    if (el.gameClearArt) {
      el.gameClearArt.src = `assets/clear/goal-${tierIndex + 1}.jpg?v=20260908-02`;
      el.gameClearArt.alt = tier.title;
    }
    el.gameClearOverlay.dataset.goal = String(tierIndex + 1);
    el.gameClearOverlay.classList.toggle('tier-1', tierIndex === 1);
    el.gameClearOverlay.classList.toggle('tier-2', tierIndex === 2);
    el.gameClearOverlay.classList.toggle('tier-3', tierIndex >= 3);
    // パーフェクト(tier 3)の ときだけ「じゆうに あそぶ」ボタンを 出す -
    // それいがいの tier は めざす さきが まだ ある ので、「はじめから」で
    // また ちょうせんしなおす ことを うながす
    el.gameClearFreePlayBtn.classList.toggle('hidden', !state.lifetime.perfectCleared);
    el.gameClearCloseBtn.classList.remove('hidden');
    el.gameClearTitle.textContent = tier.title;
    el.gameClearConfettiTop.textContent = tier.confetti;
    el.gameClearConfettiBottom.textContent = tier.confetti;
    el.gameClearDesc.innerHTML = tier.desc;
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
    el.dexDetailMeta.textContent = `${isRare ? '✨レア ' : ''}${SPECIES_DISPLAY_NAMES[line] || line} ／ ${LIFE_STAGES[stageIndex].name}(${LIFE_STAGES[stageIndex].min}さい〜)`;
    el.dexDetailDesc.textContent = stageDesc(line, stageIndex);
    el.dexDetailTransformBtn.classList.toggle('hidden', !state.infinite);
  }

  function renderDex() {
    const discoveredCount = state.discoveredStages.length;
    const totalCount = ALL_LINES.length * STAGES_PER_LINE;
    // ヘッダーの ぜんたい数は、しゅぞく・なかま・こいびとの 3セクション
    // ぶんを あわせた かずで あらわす(dex-complete じっせきの はんてい
    // じたいは しゅぞくだけの totalCount の ままで、ここは 表示だけ)
    const combinedDiscovered = discoveredCount + state.lifetime.companionsRecruited.length + state.lifetime.partnersRecorded.length;
    const combinedTotal = totalCount + COMPANIONS.length + ALL_PARTNER_CANDIDATES.length;
    el.dexProgress.textContent = `${combinedDiscovered} / ${combinedTotal}`;
    el.dexFreePlayHint.classList.toggle('hidden', !state.infinite);
    el.dexGrid.innerHTML = ALL_LINES.map((line) => {
      const stages = SPECIES[line].stages;
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
      return `<div class="dex-line-block"><div class="dex-row">${cells}</div></div>`;
    }).join('');
    renderCompanionDex();
    renderRareCompanionDex();
    renderPartnerDex();
  }

  // ずかんの したの ほうに、なかまイベントで であえる COMPANIONS の
  // いちらんを べつセクションとして あらわす。種族の ずかんと おなじ
  // dex-cell の 見た目を つかいまわしている
  function renderCompanionDex() {
    const recruited = state.lifetime.companionsRecruited;
    el.companionDexProgress.textContent = `${recruited.length} / ${COMPANIONS.length}`;
    el.companionDexGrid.innerHTML = COMPANIONS.map((c) => {
      const known = recruited.includes(c.id);
      return known
        ? `<div class="dex-cell known"><span class="dex-cell-emoji">${c.emoji}</span><span class="dex-cell-label">${c.name}</span></div>`
        : `<div class="dex-cell locked"><span class="dex-cell-emoji">❓</span><span class="dex-cell-label">？？？</span></div>`;
    }).join('');
  }

  // そだち80「レアの きざし」で であえる レアなかまの セクション。まだ
  // ひとりも であっていない あいだは セクションごと かくして おく - ❓が
  // 5つ ならんでいるだけの「たりない ずかん」に 見えない ように する ため。
  // ヘッダーの ぜんたい数(dexProgress)にも かぞえない。ここは
  // ずかんクリア(dex-complete)の じょうけんとは まったく べつの、
  // であえたら うれしい だけの おまけの コレクション
  function renderRareCompanionDex() {
    const recruited = state.lifetime.rareCompanionsRecruited || [];
    const show = recruited.length > 0;
    el.rareCompanionDexDivider.classList.toggle('hidden', !show);
    el.rareCompanionDexGrid.classList.toggle('hidden', !show);
    if (!show) {
      el.rareCompanionDexGrid.innerHTML = '';
      return;
    }
    el.rareCompanionDexProgress.textContent = `${recruited.length} / ${RARE_COMPANIONS.length}`;
    el.rareCompanionDexGrid.innerHTML = RARE_COMPANIONS.map((c) => {
      const known = recruited.includes(c.id);
      return known
        ? `<div class="dex-cell known"><span class="dex-cell-emoji">${c.emoji}</span><span class="dex-cell-label">${c.name}</span></div>`
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
      return `<div class="dex-cell known"><span class="dex-cell-emoji">${c.emoji}</span><span class="dex-cell-label">${label}</span></div>`;
    }).join('');
  }

  // いま そばに いる なかま(state.companions - じゃれるを おさぼって
  // はなれて いった なかまは ここに いない)を、#pet の こどもとして
  // 本体キャラの りょうサイドに くっつけて 表示する。#pet の こどもなので、
  // idle-float の ゆれにも 本体キャラと まったく おなじように ついてくる。
  // ひだり/みぎに こうごに ふりわけて、ふえるほど りょうがわ バランスよく そだつ
  function renderCompanionRow() {
    const recruited = state.companions
      .map((sc) => allCompanionsById(sc.id))
      .filter(Boolean);
    const left = recruited.filter((c, i) => i % 2 === 0);
    const right = recruited.filter((c, i) => i % 2 === 1);
    const chip = (c) => `<span class="companion-chip-small" title="${c.name}">${c.emoji}</span>`;
    el.companionLeft.innerHTML = left.map(chip).join('');
    el.companionRight.innerHTML = right.map(chip).join('');
  }

  // こいびと/けっこんあいてを、なかまとは くべつして 本体キャラの ひだりうえに
  // ハートで かこんで 表示する。#pet の こどもなので、idle-float の ゆれにも
  // 本体キャラと まったく おなじように ついてくる。けっこんずみの ときは
  // ゆびわを そえる。たまご/しぼう/クリアの あいだは 表示しない
  function renderPartnerCompanion(hide) {
    const p = !hide && state.partner;
    el.partnerCompanion.classList.toggle('hidden', !p);
    if (!p) {
      el.partnerCompanion.innerHTML = '';
      return;
    }
    const ring = p.married ? '<span class="partner-ring">💍</span>' : '';
    el.partnerCompanion.innerHTML =
      `<span class="partner-heart">💕</span><span class="partner-emoji" title="${p.label}">${p.emoji}${ring}</span><span class="partner-heart">💕</span>`;
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
        pushLifeLog('💞', `${label}と また きもちが かさなった`);
        return `そして、${label}とは また きもちが ぴったり かさなった!`;
      }
      return '';
    }

    // ★ ここで いきなり 別れさせない(§14)。「すれちがい」の じょうたいに
    //    はいって、なかよし度の へりが はやく なり、けっこんにも すすめなく
    //    なる。でも きゅうあいを つづければ もういちど つながれる
    if (state.partner.mismatched) return '';
    state.partner.mismatched = true;
    state.partner.repair = 0;
    pushLifeLog('💔', `${label}と すれちがいはじめた`);
    return `れんあいタイプが かわって、${label}とは すこし すれちがいはじめた… きゅうあいを つづければ また つながれる`;
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
    pushLifeLog(stage.emoji, wasHiddenRen ? 'れんくんに であった' : `${stage.label}に へんしんした`);
    if (wasHiddenRen) {
      // 隠しキャラを ひきあてた しゅんかんだけの、せんようの ひとこと
      showStoryEvent({ emoji: '🕯️', message: 'なんで にんげんが いるの?と おもったが、なぜか だれも きにしていない' });
    }
    setMessage(wasHiddenRen
      ? `？？？の しょうたいは 「${stage.label}」だった…!${breakupMessage}`
      : `${stage.label}に へんしんした!${breakupMessage}`);
    checkStoryEvents('transform');
    speakEvent('transform', { partnerChance: 0.65, companionChance: 0.65 });
    emotePet(breakupMessage ? 'sad' : 'fun');
    saveState();
    render();
  }

  function skipTransform() {
    if (!state.transformOptions) return;
    state.transformOptions = null;
    setMessage('鏡を 見て、やっぱり いまの すがたで いくことにした');
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
        <span class="item-emoji">${item.emoji}</span><span class="item-count">${state.items[item.id]}</span>
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
      ? `🎁 ごほうびを ${count}こ もっている。デートや たびを とくべつな思い出に できるよ`
      : '🎁 ごほうびは とてもレア。デートや たびの とくべつな思い出に つかえるよ');
    render();
  });

  // --- minigames (triggered by the play button) ---

  // いくつかの ミニゲームの「しゅるい(category)」は、そうさ・かちはい判定が
  // まったく おなじで テーマ(絵文字・タイトル)だけが ちがう バリエーションが
  // たくさん あった(例:キャッチゲームの「おやつ/くだもの/やさい/おかし」)。
  // これらは べつべつの エントリとして 水増しする かわりに、この ヘルパーで
  // 1つの ゲームに まとめ、あそぶ たびに テーマを ランダムに えらびなおす
  // ことで、見た目の バリエーションは のこしつつ プールの けんすうを
  // へらしている(「あそんだ かんじょく」が おなじ ゲームを 何度も べつの
  // ゲームとして かぞえない ため)
  function randomThemeGame(factory, themes) {
    return {
      start(container, onComplete) {
        const theme = themes[Math.floor(Math.random() * themes.length)];
        return factory(theme).start(container, onComplete);
      },
    };
  }

  // MINIGAME_CATEGORY_GROUPS の 各バリエーションに、配列内の 位置に
  // まったく 依存しない 固定の 文字列id を くっつける ための ヘルパー。
  // ゲームオブジェクトを つくった その場で id を タグづけしておくので、
  // あとから 配列を ならべかえたり、とちゅうに べつの ゲームを 挿入・削除
  // しても、この id は かわらない(state.lifetime.minigamePlayCounts の
  // キーとして つかう。下の minigamePlayCount/recordMinigamePlay 参照)。
  // REGION_MINIGAMES/SEASONAL_MINIGAMES の ゲームには わざと id を つけず、
  // これまでどおり あそんだ かいすうの きろく対象がいの まま にしてある
  function mg(id, game) {
    game.id = id;
    return game;
  }

  // shared factory behind every catch-and-avoid themed minigame - only the
  // title, basket emoji, and item pools change between variants
  function makeCatchGame({ title, basketEmoji, goodItems, badItems }) {
    return {
    start(container, onComplete) {
      const difficulty = ageDifficulty();
      const DURATION_MS = 6000;
      const GOOD_ITEMS = goodItems;
      const BAD_ITEMS = badItems;
      const BAD_ITEM_CHANCE = lerp(0.3, 0.55, difficulty);
      const spawnInterval = lerp(850, 420, difficulty);
      const speedMin = lerp(60, 130, difficulty);
      const speedRange = lerp(30, 70, difficulty);
      let points = 0;
      let running = true;
      let lastSpawn = 0;
      let items = [];
      let basketX = 50;

      container.innerHTML = `
        <div class="mg-header">
          <span id="mgTimer">残り: 6s</span>
          <span id="mgScore">とくてん: 0</span>
        </div>
        <div class="mg-title">${title}</div>
        <div class="mg-catch-field" id="mgField">
          <div class="mg-basket" id="mgBasket" style="left:50%">${basketEmoji}</div>
        </div>
      `;

      const field = container.querySelector('#mgField');
      const basket = container.querySelector('#mgBasket');
      const timerEl = container.querySelector('#mgTimer');
      const scoreEl = container.querySelector('#mgScore');

      function setBasketFromClientX(clientX) {
        const rect = field.getBoundingClientRect();
        let pct = ((clientX - rect.left) / rect.width) * 100;
        pct = Math.max(6, Math.min(94, pct));
        basketX = pct;
        basket.style.left = pct + '%';
      }

      function onPointerMove(e) {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        setBasketFromClientX(clientX);
      }

      field.addEventListener('pointerdown', onPointerMove);
      field.addEventListener('pointermove', onPointerMove);

      // がめん表示ちょくごに 突然 うごきだすのを ふせぐ、みじかい
      // スタート ゆうよ(セクション2)。ゆうよちゅうは タイマー・
      // オブジェクトとも うごかさない
      const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
      let rafId;

      function spawnItem() {
        const isBad = Math.random() < BAD_ITEM_CHANCE;
        const pool = isBad ? BAD_ITEMS : GOOD_ITEMS;
        const itemEl = document.createElement('div');
        itemEl.className = 'mg-falling-item';
        itemEl.textContent = pool[Math.floor(Math.random() * pool.length)];
        const xPct = 10 + Math.random() * 80;
        itemEl.style.left = xPct + '%';
        itemEl.style.top = '-20px';
        field.appendChild(itemEl);
        items.push({ el: itemEl, x: xPct, y: -20, speed: speedMin + Math.random() * speedRange, bad: isBad });
      }

      function flashField() {
        field.classList.add('hit');
        setTimeout(() => field.classList.remove('hit'), 200);
      }

      function frame(now) {
        if (!running) return;
        const elapsed = now - startTime;
        if (elapsed < 0) {
          timerEl.textContent = `残り: ${Math.ceil(DURATION_MS / 1000)}s`;
          rafId = requestAnimationFrame(frame);
          return;
        }
        const remaining = Math.max(0, DURATION_MS - elapsed);
        timerEl.textContent = `残り: ${Math.ceil(remaining / 1000)}s`;

        if (now - lastSpawn > spawnInterval) {
          spawnItem();
          lastSpawn = now;
        }

        const fieldHeight = field.clientHeight;
        items = items.filter((item) => {
          item.y += item.speed * (1 / 60);
          item.el.style.top = item.y + 'px';
          if (item.y > fieldHeight - 36 && Math.abs(item.x - basketX) < 12) {
            if (item.bad) {
              points = Math.max(0, points - 20);
              flashField();
              item.el.remove();
            } else {
              points = Math.min(100, points + 15);
              // 一しゅん ポップさせてから 消す(そくじ 消滅より 手ごたえを 見せる)
              item.el.classList.add('mg-catch-pop');
              setTimeout(() => item.el.remove(), 180);
            }
            scoreEl.textContent = `とくてん: ${points}`;
            return false;
          }
          if (item.y > fieldHeight) {
            item.el.remove();
            return false;
          }
          return true;
        });

        if (elapsed >= DURATION_MS) {
          end();
          return;
        }
        rafId = requestAnimationFrame(frame);
      }

      function end() {
        if (!running) return;
        running = false;
        cancelAnimationFrame(rafId);
        field.removeEventListener('pointerdown', onPointerMove);
        field.removeEventListener('pointermove', onPointerMove);
        items.forEach((item) => item.el.remove());
        onComplete(points);
      }

      rafId = requestAnimationFrame(frame);
    },
    };
  }

  // おやつ/くだもの/やさい/おかしの4テーマは「良い食べ物を キャッチし、
  // 悪い物を よける」という 操作・かちはい判定が 完全に おなじ 水増しだった
  // ため、randomThemeGame で 1つの エントリに 統合した(あそぶ たびに
  // テーマは ランダムで えらばれるので、見た目の バリエーションは のこる)。
  // おすし(からさの ハザード)・ほし(宇宙テーマ)は バスケットの 見た目・
  // ハザードの しゅるいが 他と はっきり ちがうので べつエントリの まま のこした
  const CATCH_FOOD_THEMES = [
    { title: 'おやつキャッチ!おいしいものだけ ひろおう', basketEmoji: '🧺', goodItems: ['🍙', '🍎', '🍬', '🍇'], badItems: ['💩', '🪳', '🧦', '🧼'] },
    { title: 'くだものキャッチ!おいしそうなのを ひろおう', basketEmoji: '🧺', goodItems: ['🍓', '🍊', '🍑', '🍌'], badItems: ['🐛', '🦠', '🗑️', '🧽'] },
    { title: 'やさいキャッチ!むしは いやだよね', basketEmoji: '🧺', goodItems: ['🥕', '🥦', '🌽', '🍅'], badItems: ['🐛', '🐌', '🪱', '🕷️'] },
    { title: 'おかしキャッチ!からい ものは よけよう', basketEmoji: '🎪', goodItems: ['🍭', '🍩', '🧁', '🍫'], badItems: ['🌶️', '🔥', '🥵', '🍛'] },
  ];
  const CATCH_GAME_VARIANTS = [
    mg('catch-themed', randomThemeGame(makeCatchGame, [
      ...CATCH_FOOD_THEMES,
      { title: 'おすしキャッチ!わさびは からいよ', basketEmoji: '🍽️', goodItems: ['🍣', '🍱', '🍤', '🍥'], badItems: ['🟢', '🔥', '🧨', '🐡'] },
      { title: 'ほしキャッチ!いんせきは あぶない', basketEmoji: '🛸', goodItems: ['⭐', '🌟', '✨', '🌠'], badItems: ['☄️', '🪨', '⚡', '🛰️'] },
      { title: 'コイン&キノコだいぼうけん!とげは キケン', basketEmoji: '🧢', goodItems: ['🍄', '🪙', '⭐', '🌼'], badItems: ['🐢', '💣', '🔥', '⚡'] },
      { title: 'ダンジョンの たからさがし!じゃまものは よけよう', basketEmoji: '🛡️', goodItems: ['💎', '💰', '🗝️', '🍯'], badItems: ['🕸️', '🦂', '🕷️', '🪨'] },
      { title: 'おちばキャッチ!ぬれはは よけよう', basketEmoji: '🧺', goodItems: ['🍁', '🍂', '🌰', '🍄'], badItems: ['🐛', '💧', '🕷️', '🦔'] },
    ])),
  ];

  // --- バランスゲーム ---

  const balanceGame = {
    start(container, onComplete) {
      const difficulty = ageDifficulty();
      const DURATION_MS = 6000;
      const drift = lerp(8, 22, difficulty);
      const nudgeAmount = 6;
      let pos = 50;
      let velocity = 0;
      let running = true;
      let lastTime = null;
      let errorSum = 0;
      let samples = 0;
      let rafId;

      container.innerHTML = `
        <div class="mg-header">
          <span id="mgTimer">残り: 6s</span>
        </div>
        <div class="mg-title">まんなかを キープしよう!</div>
        <div class="mg-gauge" id="mgGauge">
          <div class="mg-gauge-marker" id="mgMarker" style="left:50%; background:#333;"></div>
        </div>
        <div class="mg-math-choices">
          <button class="mg-tap-btn" id="mgLeftBtn">◀️</button>
          <button class="mg-tap-btn" id="mgRightBtn">▶️</button>
        </div>
      `;
      const marker = container.querySelector('#mgMarker');
      const timerEl = container.querySelector('#mgTimer');
      const leftBtn = container.querySelector('#mgLeftBtn');
      const rightBtn = container.querySelector('#mgRightBtn');

      leftBtn.addEventListener('pointerdown', () => {
        if (performance.now() < startTime) return;
        velocity -= nudgeAmount;
      });
      rightBtn.addEventListener('pointerdown', () => {
        if (performance.now() < startTime) return;
        velocity += nudgeAmount;
      });

      // スタートゆうよちゅうは マーカーを ドリフトさせず、タイマーも
      // すすめない(セクション2)
      const startTime = performance.now() + MG_ACTION_START_GRACE_MS;

      function frame(now) {
        if (!running) return;
        if (now < startTime) {
          timerEl.textContent = `残り: ${Math.ceil(DURATION_MS / 1000)}s`;
          rafId = requestAnimationFrame(frame);
          return;
        }
        if (lastTime == null) lastTime = now;
        const dt = (now - lastTime) / 1000;
        lastTime = now;

        velocity += (Math.random() - 0.5) * drift * dt;
        velocity *= 0.98;
        pos += velocity * dt * 10;
        pos = Math.max(0, Math.min(100, pos));
        marker.style.left = pos + '%';
        errorSum += Math.abs(pos - 50);
        samples += 1;

        const elapsed = now - startTime;
        const remaining = Math.max(0, DURATION_MS - elapsed);
        timerEl.textContent = `残り: ${Math.ceil(remaining / 1000)}s`;
        if (elapsed >= DURATION_MS) {
          end();
          return;
        }
        rafId = requestAnimationFrame(frame);
      }

      function end() {
        if (!running) return;
        running = false;
        cancelAnimationFrame(rafId);
        const avgError = samples ? errorSum / samples : 50;
        const score = Math.round(clamp(100 - avgError * 2, 0, 100));
        onComplete(score);
      }

      rafId = requestAnimationFrame(frame);
    },
  };

  const BALANCE_GAME_VARIANTS = [mg('balance-classic', balanceGame)];

  // --- なりきりポーズ: おだいの きもち(うれしい/たのしい/かなしい/おこった)
  // に合う反応を選ぶと、今の自分の姿がその場で emotePet() と同じモーション
  // を実演してくれる。既存の .pet / .emote-* のCSSをそのまま使い回す
  const POSE_MOODS = [
    { mood: 'happy', label: 'うれしい' },
    { mood: 'fun', label: 'たのしい' },
    { mood: 'sad', label: 'かなしい' },
    { mood: 'angry', label: 'おこった' },
  ];

  function makePoseGame() {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const ROUNDS = Math.round(lerp(3, 4, difficulty));
        const timeLimitMs = MG_TIMED_CHOICE_GRACE_MS + lerp(3400, MG_TIMED_CHOICE_MIN_MS, difficulty);
        const selfEmoji = currentSprite();
        let round = 0;
        let correctCount = 0;
        let answered = false;
        let timer;

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgRound">1 / ${ROUNDS}</span>
          </div>
          <div class="mg-title">おなじ きもちの ボタンを タップ!</div>
          <div class="pet-area" style="min-height:80px;">
            <span class="pet" id="mgPoseChar">${selfEmoji}</span>
          </div>
          <div class="mg-mood-prompt" id="mgMoodPrompt" style="text-align:center; font-weight:bold; margin:6px 0;"></div>
          <div class="mg-math-choices" id="mgMoodChoices"></div>
        `;

        const charEl = container.querySelector('#mgPoseChar');
        const promptEl = container.querySelector('#mgMoodPrompt');
        const choicesEl = container.querySelector('#mgMoodChoices');
        const roundEl = container.querySelector('#mgRound');

        function nextRound() {
          if (round >= ROUNDS) {
            end();
            return;
          }
          round += 1;
          answered = false;
          roundEl.textContent = `${round} / ${ROUNDS}`;
          const target = POSE_MOODS[Math.floor(Math.random() * POSE_MOODS.length)];
          promptEl.textContent = `「${target.label}」な きもちは どれ?`;
          const shuffled = [...POSE_MOODS].sort(() => Math.random() - 0.5);
          choicesEl.innerHTML = shuffled
            .map((m) => `<button class="mg-math-btn" data-mood="${m.mood}">${m.label}</button>`)
            .join('');
          Array.from(choicesEl.querySelectorAll('button')).forEach((btn) => {
            btn.addEventListener('pointerdown', () => {
              if (answered) return;
              answered = true;
              clearTimeout(timer);
              const correct = btn.dataset.mood === target.mood;
              if (correct) correctCount += 1;
              btn.classList.add(correct ? 'mg-reveal-correct' : 'mg-reveal-incorrect');
              const mark = document.createElement('span');
              mark.className = 'mg-reveal-mark';
              mark.textContent = correct ? '⭕' : '❌';
              btn.appendChild(mark);
              // せいかいは いつもの きもち反応、ふせいかいは あきらかに
              // ちがう「くびを かしげる」反応に して、あっていたかのように
              // 見えてしまわない ようにする(過度に ネガティブには しない)
              charEl.className = correct ? `pet emote-${target.mood}` : 'pet pose-confused';
              setTimeout(() => {
                charEl.className = 'pet';
                nextRound();
              }, 500);
            });
          });
          timer = setTimeout(() => {
            if (answered) return;
            answered = true;
            nextRound();
          }, timeLimitMs);
        }

        function end() {
          const score = Math.round((correctCount / ROUNDS) * 100);
          onComplete(score);
        }

        nextRound();
      },
    };
  }

  const POSE_GAME_VARIANTS = [mg('pose-classic', makePoseGame())];

  // --- ロードげーむ(3れーんを よけよう・キャッチしよう) ---

  // レーンごとの ざひょうを「ちへいせんで せまく・てまえで ひろく」
  // ほかんし、とどくまでの しんちょくに 2じょうの イージングを かけることで、
  // せまい がめんの なかでも「おくから せまってくる」たちたいてきな
  // おくゆき感を だす、みちを はしる/よける タイプの ミニゲーム
  // --- レーンラッシュ(canvas ぎじ3D): 3レーンの みちを はしり、よい ものを
  //     とって わるい ものを よける。どうろ/そら/うみ/うちゅう/ハイウェイの
  //     テーマで 見た目が かわる。ロードげーむ と 3Dふうフライトの きょうつう本体 ---
  const LANE_RUSH_SCENES = {
    road: { sky: ['#69b7ff', '#d9f1ff'], ground: ['#4f9f4a', '#5aae52'], road: ['#5c5c66', '#63636d'], rumble: ['#f3f3f3', '#d8383c'], scenery: ['🌳', '🏠', '🌲', '🪧'] },
    city: { sky: ['#7fb3ff', '#e4f0ff'], ground: ['#8d9aa8', '#98a5b3'], road: ['#4a4d57', '#51545e'], rumble: ['#eeeeee', '#e0a020'], scenery: ['🏢', '🏬', '🏪', '🚏'] },
    jungle: { sky: ['#5fb98a', '#d7f5e3'], ground: ['#2f7a3a', '#357f40'], road: ['#7a5a35', '#82613b'], rumble: ['#c9a96e', '#8a5a2b'], scenery: ['🌴', '🌿', '🌺', '🌳'] },
    desert: { sky: ['#ffb366', '#ffe6b3'], ground: ['#d9b36a', '#e2bf78'], road: ['#b08a55', '#b8925c'], rumble: ['#f2e2c4', '#c0392b'], scenery: ['🌵', '🪨', '🏜️', '🐪'] },
    sky: { sky: ['#3b7dd8', '#bfe0ff'], ground: ['#a9d3ff', '#b6dbff'], road: ['#dbeeff', '#e6f3ff'], rumble: ['#ffffff', '#9fc9ff'], scenery: ['☁️', '🎈', '🪁', '☁️'] },
    sea: { sky: ['#4fb3ff', '#d2efff'], ground: ['#1f6fb5', '#2378bf'], road: ['#2a8fd6', '#3197dc'], rumble: ['#bfe9ff', '#1b5f9a'], scenery: ['🪸', '🐚', '🌊', '⛵'] },
    space: { sky: ['#03061a', '#1b1f4a'], ground: ['#0b0f2a', '#0e1230'], road: ['#1c2350', '#212858'], rumble: ['#6f7cff', '#c46fff'], scenery: ['🪐', '🌟', '🛰️', '✨'] },
    highway: { sky: ['#5aa9ff', '#dff1ff'], ground: ['#5fa85a', '#68b062'], road: ['#4a4a55', '#52525d'], rumble: ['#f3f3f3', '#d8383c'], scenery: ['🌳', '🛣️', '🏢', '🌲'] },
  };
  function makeRoadGame({ title, goodItems, badItems, scene = 'road', playerEmoji, duration }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = duration || Math.round(lerp(16000, 13000, difficulty));
        const th = LANE_RUSH_SCENES[scene] || LANE_RUSH_SCENES.road;
        const BAD_CHANCE = lerp(0.35, 0.55, difficulty);
        const LANES = [-0.62, 0, 0.62];
        let lane = 1, playerX = 0, position = 0, speed = 0, running = true, rafId = null, last = null, msg = '', msgUntil = 0, flash = 0, sparkle = 0;
        let good = 0, bad = 0, points = 0, combo = 0, bestCombo = 0, nextSpawnZ = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="lrTimer">残り: ${Math.ceil(DURATION_MS / 1000)}s</span><span id="lrScore">とくてん: 0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="lrCanvas"></canvas></div>
          <div class="mg-hint" id="lrHint">◀▶(おしっぱなしOK)か がめんの 左/中/右を タップで レーン移動。よい ものは とって、わるい ものは よけよう</div>
          <div class="mg-race-controls"><button class="mg-tap-btn" id="lrLeft" data-hold="step" data-key="left">◀</button><button class="mg-tap-btn" id="lrRight" data-hold="step" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#lrCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 215);
        const road = createPseudoRoad(ctx, W, H, { colors: (dark) => (dark ? { grass: th.ground[0], rumble: th.rumble[0], road: th.road[0], lane: scene === 'space' ? 'rgba(160,170,255,.25)' : '#fff8c8' } : { grass: th.ground[1], rumble: th.rumble[1], road: th.road[1] }) });
        const { SEG_LEN, PLAYER_Z, segments } = road;
        const MAX_SPEED = SEG_LEN * lerp(34, 46, difficulty);
        for (let i = 0; i < 14; i++) { const dir = Math.random() < 0.5 ? -1 : 1; road.addRoad(10, 10 + Math.floor(Math.random() * 10), 10, dir * (1 + Math.random() * 2.2), (Math.random() - 0.5) * 30); }
        const TRACK_LEN = road.trackLength();
        for (let n = 0; n < segments.length; n += 3) {
          if (Math.random() < 0.65) segments[n].sprites.push({ emoji: th.scenery[Math.floor(Math.random() * th.scenery.length)], offset: -1.5 - Math.random() * 1.6, size: 0.5 });
          if (Math.random() < 0.65) segments[n].sprites.push({ emoji: th.scenery[Math.floor(Math.random() * th.scenery.length)], offset: 1.5 + Math.random() * 1.6, size: 0.5 });
        }
        const items = [];
        const timerEl = container.querySelector('#lrTimer'), scoreEl = container.querySelector('#lrScore'), hint = container.querySelector('#lrHint');
        const say = (t, ms = 900) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const setLane = (n) => { lane = clamp(n, 0, 2); };
        container.querySelector('#lrLeft').addEventListener('pointerdown', (e) => { e.preventDefault(); setLane(lane - 1); });
        container.querySelector('#lrRight').addEventListener('pointerdown', (e) => { e.preventDefault(); setLane(lane + 1); });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); const p = mgPointerPos(canvas, e); setLane(p.nx < 1 / 3 ? 0 : p.nx > 2 / 3 ? 2 : 1); });
        const pet = playerEmoji || currentSprite();
        function spawn() {
          const isBad = Math.random() < BAD_CHANCE;
          const pool = isBad ? badItems : goodItems;
          const laneIdx = Math.floor(Math.random() * 3);
          const it = { z: position + PLAYER_Z + SEG_LEN * 42, lane: laneIdx, offset: LANES[laneIdx], bad: isBad, emoji: pool[Math.floor(Math.random() * pool.length)], size: 0.3, done: false };
          items.push(it);
        }
        function update(dt, now) {
          speed = Math.min(MAX_SPEED, speed + MAX_SPEED * dt / 1.2);
          position += speed * dt;
          if (position >= TRACK_LEN) { position -= TRACK_LEN; for (const it of items) it.z -= TRACK_LEN; nextSpawnZ -= TRACK_LEN; }
          playerX += (LANES[lane] - playerX) * Math.min(1, dt * 12);
          const gap = SEG_LEN * lerp(7, 4.5, difficulty);
          if (position + PLAYER_Z + SEG_LEN * 42 > nextSpawnZ) { spawn(); nextSpawnZ = position + PLAYER_Z + SEG_LEN * 42 + gap; }
          for (const seg of segments) seg.dynamic.length = 0;
          const pz = position + PLAYER_Z;
          for (const it of items) {
            if (it.z >= pz - SEG_LEN && it.z < pz + SEG_LEN * 60) road.findSegment(((it.z % TRACK_LEN) + TRACK_LEN) % TRACK_LEN).dynamic.push(it);
            if (!it.done && it.z <= pz + SEG_LEN * 0.4) {
              it.done = true;
              if (it.lane === lane) {
                if (it.bad) { bad++; combo = 0; points = Math.max(0, points - 15); flash = 0.5; say('💥 ぶつかった!'); }
                else { good++; combo++; bestCombo = Math.max(bestCombo, combo); points += 12 + Math.min(8, combo * 2); sparkle = 1; say(combo >= 3 ? '✨ ' + combo + 'れんぞく!' : 'ゲット!', 600); }
                scoreEl.textContent = 'とくてん: ' + points;
              }
            }
          }
          for (let i = items.length - 1; i >= 0; i--) if (items[i].z < pz - SEG_LEN * 2) items.splice(i, 1);
        }
        function render(now) {
          if (!ctx) return;
          const skyG = ctx.createLinearGradient(0, 0, 0, H * 0.6); skyG.addColorStop(0, th.sky[0]); skyG.addColorStop(1, th.sky[1]);
          ctx.fillStyle = skyG; ctx.fillRect(0, 0, W, H);
          if (scene === 'space') { ctx.fillStyle = '#fff'; for (let i = 0; i < 46; i++) { const sx = ((i * 173 + 31) % 997 / 997 * W + position / 60) % W, sy = (i * 389 + 7) % 991 / 991 * H * 0.5; ctx.globalAlpha = 0.25 + (i % 5) * 0.15; ctx.fillRect(sx, sy, 1.5 + (i % 3) * 0.5, 1.5 + (i % 3) * 0.5); } ctx.globalAlpha = 1; }
          else { ctx.fillStyle = 'rgba(255,255,255,.4)'; for (let i = 0; i < 4; i++) { const cx = ((i * 97 + 20) - (position / 500)) % (W + 60); ctx.beginPath(); ctx.ellipse((cx + W + 60) % (W + 60) - 30, 20 + i * 11, 22, 7, 0, 0, Math.PI * 2); ctx.fill(); } }
          road.render(position, playerX);
          const bob = Math.sin(now / 90) * 1.5;
          ctx.font = '40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(W / 2, H - 6, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 6; ctx.fillText(pet, W / 2, H - 8 + bob); ctx.shadowBlur = 0;
          if (sparkle > 0) { ctx.globalAlpha = sparkle; ctx.font = '22px sans-serif'; ctx.fillText('✨', W / 2 + 24, H - 40 - (1 - sparkle) * 20); ctx.globalAlpha = 1; sparkle = Math.max(0, sparkle - 0.05); }
          if (flash > 0) { ctx.fillStyle = `rgba(255,70,70,${flash})`; ctx.fillRect(0, 0, W, H); flash = Math.max(0, flash - 0.04); }
          ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 3; i++) if (i === lane) { ctx.fillRect(W / 2 - 18 + (i - 1) * 0, H - 4, 36, 3); }
          if (now < startTime) { ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText('READY…', W / 2, H / 2 - 30); ctx.shadowBlur = 0; }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(W / 2 - 80, H / 2 - 44, 160, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2 - 31); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt, now);
          const rem = Math.max(0, DURATION_MS - Math.max(0, now - startTime));
          timerEl.textContent = '残り: ' + Math.ceil(rem / 1000) + 's';
          render(now);
          if (rem <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const score = clamp(Math.round(points + bestCombo * 2), 0, 100);
          say(`けっか: ゲット ${good}こ / ぶつかった ${bad}かい`, 1800);
          render(performance.now());
          setTimeout(() => onComplete(score), 800);
        }
        rafId = requestAnimationFrame(frame);
      },
    };
  }

  const ROAD_GAME_VARIANTS = [
    mg('road-themed', randomThemeGame(makeRoadGame, [
      { title: 'どうろを はしろう!たべものは キャッチ、ゴミは よけて', goodItems: ['🍎', '🍙', '🍬', '🍇'], badItems: ['🪨', '🚧', '🛢️', '⚠️'], scene: 'road' },
      { title: 'そらを とぼう!ほしは キャッチ、いんせきは よけて', goodItems: ['⭐', '🌟', '✨', '🍀'], badItems: ['☄️', '🪨', '⚡', '🛰️'], scene: 'sky' },
      { title: 'うみを およごう!さかなは キャッチ、ゴミは よけて', goodItems: ['🐟', '🐠', '🦐', '🐚'], badItems: ['🥫', '🪤', '🕸️', '🦈'], scene: 'sea' },
    ])),
  ];

  // --- スタックタワー(つみきを かさねよう) ---

  // うごく ブロックを タップで おとし、ひとつ したの ブロックとの
  // かさなり具合で 正確さが きまる クラシックな タワー積みゲーム。
  // ブロックごとに いろを かえて 立体的な かげを つけることで、
  // ひくい がめんの なかでも「どんどん たかく つみあがっていく」
  // りったいかんを だす
  function makeStackGame({ title, blockEmoji, palette }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const ROUNDS = 4;
        const BLOCK_H = 26;
        const baseWidthPct = 70;
        const minWidthPct = 12;
        const baseSpeed = lerp(55, 95, difficulty);
        const colors = palette || ['#f6a5c0', '#a5d8f6', '#c8f6a5', '#f6e2a5', '#d3a5f6', '#a5f6d8', '#f6c8a5'];

        let round = 0;
        let prevX = (100 - baseWidthPct) / 2;
        let prevWidth = baseWidthPct;
        let curWidth = baseWidthPct;
        let curX = prevX;
        let direction = 1;
        let speed = baseSpeed;
        let running = true;
        let locked = false;
        let lastTime = null;
        let rafId;
        let accuracySum = 0;

        function paletteColor(i) {
          return colors[i % colors.length];
        }

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgRound">だん: 0 / ${ROUNDS}</span>
            <span id="mgScore">せいかくさ: -</span>
          </div>
          <div class="mg-title">${title}</div>
          <div class="mg-stack-tower" id="mgTower"></div>
          <button class="mg-tap-btn" id="mgDropBtn">おとす!</button>
        `;

        const towerEl = container.querySelector('#mgTower');
        const dropBtn = container.querySelector('#mgDropBtn');
        const roundEl = container.querySelector('#mgRound');
        const scoreEl = container.querySelector('#mgScore');

        const baseEl = document.createElement('div');
        baseEl.className = 'mg-stack-block';
        baseEl.style.left = prevX + '%';
        baseEl.style.width = prevWidth + '%';
        baseEl.style.bottom = '0px';
        baseEl.style.background = paletteColor(0);
        baseEl.textContent = blockEmoji;
        towerEl.appendChild(baseEl);

        let movingEl = document.createElement('div');
        movingEl.className = 'mg-stack-moving';
        movingEl.style.bottom = BLOCK_H + 'px';
        movingEl.style.width = curWidth + '%';
        movingEl.style.left = curX + '%';
        movingEl.textContent = blockEmoji;
        towerEl.appendChild(movingEl);

        function frame(now) {
          if (!running) return;
          if (lastTime == null) lastTime = now;
          const dt = (now - lastTime) / 1000;
          lastTime = now;
          if (!locked) {
            curX += direction * speed * dt;
            const maxX = 100 - curWidth;
            if (curX >= maxX) { curX = maxX; direction = -1; }
            if (curX <= 0) { curX = 0; direction = 1; }
            movingEl.style.left = curX + '%';
          }
          rafId = requestAnimationFrame(frame);
        }

        function handleDrop() {
          if (locked || !running) return;
          locked = true;
          dropBtn.disabled = true;

          const curLeft = curX;
          const curRight = curX + curWidth;
          const prevLeft = prevX;
          const prevRight = prevX + prevWidth;
          const overlapLeft = Math.max(curLeft, prevLeft);
          const overlapRight = Math.min(curRight, prevRight);
          const overlapWidth = Math.max(0, overlapRight - overlapLeft);
          const accuracy = prevWidth > 0 ? clamp(overlapWidth / prevWidth, 0, 1) : 0;
          accuracySum += accuracy;

          const placedWidth = Math.max(minWidthPct, overlapWidth);
          const placedX = overlapWidth > 0 ? overlapLeft : curLeft;

          movingEl.style.left = placedX + '%';
          movingEl.style.width = placedWidth + '%';
          movingEl.style.background = paletteColor(round);
          movingEl.className = 'mg-stack-block';

          prevX = placedX;
          prevWidth = placedWidth;
          curWidth = placedWidth;
          scoreEl.textContent = `せいかくさ: ${Math.round(accuracy * 100)}%`;

          round += 1;
          roundEl.textContent = `だん: ${round} / ${ROUNDS}`;

          setTimeout(() => {
            if (!running) return;
            if (round >= ROUNDS) {
              end();
              return;
            }
            movingEl = document.createElement('div');
            movingEl.className = 'mg-stack-moving';
            movingEl.style.bottom = ((round + 1) * BLOCK_H) + 'px';
            movingEl.style.width = curWidth + '%';
            curX = 0;
            direction = 1;
            movingEl.style.left = curX + '%';
            movingEl.textContent = blockEmoji;
            towerEl.appendChild(movingEl);
            speed = baseSpeed + round * 6;
            locked = false;
            dropBtn.disabled = false;
          }, 260);
        }

        dropBtn.addEventListener('pointerdown', handleDrop);

        function end() {
          if (!running) return;
          running = false;
          cancelAnimationFrame(rafId);
          const score = Math.round((accuracySum / ROUNDS) * 100);
          onComplete(score);
        }

        rafId = requestAnimationFrame(frame);
      },
    };
  }

  // つみき/パンケーキ/ケーキは ブロックの 見た目だけが ちがう、うごく
  // ブロックを タイミングよく タップで おとす 操作・かちはい判定が おなじ
  // 水増しだった ため、randomThemeGame で 1つに 統合した
  const STACK_THEMES = [
    { title: 'つみきタワー!せいかくに かさねよう', blockEmoji: '🟦', palette: ['#f6a5c0', '#a5d8f6', '#c8f6a5', '#f6e2a5', '#d3a5f6', '#a5f6d8', '#f6c8a5'] },
    { title: 'パンケーキタワー!たかく かさねよう', blockEmoji: '🥞', palette: ['#f6d9a5', '#f0c078', '#e8a95c', '#dba05a', '#c98a4a', '#b87a3f', '#a56a35'] },
    { title: 'ケーキタワー!おいわいの たかづみ', blockEmoji: '🍰', palette: ['#ffd1e8', '#ffe4b5', '#d1f0d8', '#d1e8ff', '#e8d1ff', '#fff5b8', '#ffcccb'] },
  ];
  const STACK_GAME_VARIANTS = [
    mg('stack-themed', randomThemeGame(makeStackGame, STACK_THEMES)),
    // ふゆの ゆきだるまづくり テーマ(育成ゲームらしい あそび むけ)
    mg('stack-snowman', makeStackGame({
      title: 'ゆきだるまタワー!まるく かさねよう',
      blockEmoji: '⚪',
      palette: ['#ffffff', '#f0f8ff', '#e6f2ff', '#f5fbff', '#ffffff', '#eef7ff', '#f8fcff'],
    })),
  ];

  // --- かくとうゲーム(タイミングよく こうげき/ガード) ---

  // あいてが「こうげきの けはい」か「すき」かを ランダムに おりまぜて
  // きて、その たびに みじかい はんのう時間の なかで「こうげき」か
  // 「ガード」を えらぶ、HPゲージつきの リアルタイム対戦ゲーム
  function makeFightGame({ title, opponentEmoji, opponentName }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const ROUNDS = 5;
        const reactionMs = lerp(950, 500, difficulty);
        const telegraphMs = lerp(550, 280, difficulty);
        let round = 0;
        let playerHP = 100;
        let opponentHP = 100;
        let resolved = false;
        let running = true;
        const timers = [];

        container.innerHTML = `
          <div class="mg-title">${title}</div>
          <div class="mg-fight-hp-row">
            <div class="mg-fight-hp">
              <span class="mg-fight-hp-label">なおとっち</span>
              <div class="mg-hp-bar"><div class="mg-hp-fill player" id="mgPlayerHP" style="width:100%"></div></div>
            </div>
            <div class="mg-fight-hp">
              <span class="mg-fight-hp-label">${opponentName}</span>
              <div class="mg-hp-bar"><div class="mg-hp-fill enemy" id="mgEnemyHP" style="width:100%"></div></div>
            </div>
          </div>
          <div class="mg-fight-arena">
            <span class="mg-fight-player" id="mgFightPlayer">${currentSprite()}</span>
            <span class="mg-fight-tell hidden" id="mgFightTell">❗</span>
            <span class="mg-fight-opponent" id="mgFightOpponent">${opponentEmoji}</span>
          </div>
          <div class="mg-fight-msg" id="mgFightMsg">サインを みて はんだんしよう!</div>
          <div class="mg-fight-controls">
            <button class="mg-tap-btn" id="mgAttackBtn" disabled>こうげき!</button>
            <button class="mg-tap-btn" id="mgGuardBtn" disabled>ガード!</button>
          </div>
        `;

        const playerHPEl = container.querySelector('#mgPlayerHP');
        const enemyHPEl = container.querySelector('#mgEnemyHP');
        const tellEl = container.querySelector('#mgFightTell');
        const msgEl = container.querySelector('#mgFightMsg');
        const attackBtn = container.querySelector('#mgAttackBtn');
        const guardBtn = container.querySelector('#mgGuardBtn');
        const playerEl = container.querySelector('#mgFightPlayer');
        const opponentEl = container.querySelector('#mgFightOpponent');

        function flashHit(el) {
          el.classList.add('hit');
          setTimeout(() => el.classList.remove('hit'), 200);
        }

        function endIfKO() {
          if (opponentHP <= 0) { finish(true); return true; }
          if (playerHP <= 0) { finish(false); return true; }
          return false;
        }

        function finish(won) {
          if (resolved) return;
          resolved = true;
          running = false;
          timers.forEach(clearTimeout);
          msgEl.textContent = won ? `${opponentName}に かった!` : `${opponentName}に まけて しまった…`;
          attackBtn.disabled = true;
          guardBtn.disabled = true;
          const hpScore = clamp(playerHP - opponentHP, -100, 100);
          const score = won ? clamp(70 + hpScore / 2, 70, 100) : clamp(30 + hpScore / 2, 0, 45);
          timers.push(setTimeout(() => onComplete(Math.round(score)), 700));
        }

        function nextRound() {
          if (!running || resolved) return;
          round += 1;
          if (round > ROUNDS) {
            resolved = true;
            const score = clamp(50 + (playerHP - opponentHP) / 2, 0, 100);
            msgEl.textContent = playerHP >= opponentHP ? 'ここまで!ゆうせいで おわった' : 'ここまで!おされぎみで おわった';
            attackBtn.disabled = true;
            guardBtn.disabled = true;
            timers.push(setTimeout(() => onComplete(Math.round(score)), 700));
            return;
          }
          const opponentAttacking = Math.random() < 0.6;
          tellEl.classList.remove('hidden');
          tellEl.textContent = opponentAttacking ? '💥' : '✨';
          msgEl.textContent = opponentAttacking ? 'あいてが こうげきの けはい!' : 'あいてに すきが できた!';
          attackBtn.disabled = false;
          guardBtn.disabled = false;

          let acted = false;

          function resolveRound(choice) {
            if (acted || resolved) return;
            acted = true;
            attackBtn.disabled = true;
            guardBtn.disabled = true;
            tellEl.classList.add('hidden');
            if (opponentAttacking) {
              if (choice === 'guard') {
                msgEl.textContent = 'ガード せいこう!';
              } else {
                playerHP = clamp(playerHP - 18, 0, 100);
                playerHPEl.style.width = playerHP + '%';
                flashHit(playerEl);
                msgEl.textContent = choice ? 'こうげきを うけて しまった…' : 'はんのうが まにあわなかった…';
              }
            } else {
              if (choice === 'attack') {
                opponentHP = clamp(opponentHP - 20, 0, 100);
                enemyHPEl.style.width = opponentHP + '%';
                flashHit(opponentEl);
                msgEl.textContent = 'こうげき めいちゅう!';
              } else {
                msgEl.textContent = choice ? 'ガードしたが なにも おきなかった' : 'チャンスを のがした…';
              }
            }
            if (!endIfKO()) {
              timers.push(setTimeout(nextRound, 400));
            }
          }

          attackBtn.onpointerdown = () => resolveRound('attack');
          guardBtn.onpointerdown = () => resolveRound('guard');

          timers.push(setTimeout(() => resolveRound(null), telegraphMs + reactionMs));
        }

        // がめん表示ちょくごに いきなり こうげきが はじまらない ように、
        // さいしょの 1手だけ すこし ながめの ゆうよを おく(セクション2)
        timers.push(setTimeout(nextRound, MG_ACTION_START_GRACE_MS));
      },
    };
  }

  const FIGHT_GAME_VARIANTS = [
    mg('fight-themed', randomThemeGame(makeFightGame, [
      { title: 'ライバルの いぬと たいけつ!', opponentEmoji: '🐕‍🦺', opponentName: 'ライバルいぬ' },
      { title: 'なぞの にんじゃと たいけつ!', opponentEmoji: '🥷', opponentName: 'なぞのにんじゃ' },
      { title: 'きょうてきの とらと たいけつ!', opponentEmoji: '🐯', opponentName: 'きょうてきの とら' },
      { title: 'オールスターたいかいで ライバルを ふっとばせ!', opponentEmoji: '🥊', opponentName: 'にんきキャラの ライバル' },
    ])),
  ];

  // --- RPGふうバトル(コマンドせんたくで たたかう) ---

  // たたかう/まほう/ぼうぎょ/にげる の 4コマンドから じっくり えらぶ、
  // ターン制の HP・MPを もった RPGふうの バトルミニゲーム。はんしゃ神経
  // ではなく「せんりゃく」で たのしませる、かくとうゲームとは べつの
  // あじわいを ねらっている
  function makeRpgBattleGame({ title, monsterEmoji, monsterName }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const TURN_LIMIT = 6;
        const playerMaxHP = 100;
        const playerMaxMP = 30;
        const monsterMaxHP = 100;
        const monsterAtkMin = Math.round(lerp(10, 16, difficulty));
        const monsterAtkMax = Math.round(lerp(18, 26, difficulty));

        let turn = 0;
        let playerHP = playerMaxHP;
        let playerMP = playerMaxMP;
        let monsterHP = monsterMaxHP;
        let defending = false;
        let resolved = false;

        container.innerHTML = `
          <div class="mg-title">${title}</div>
          <div class="mg-fight-hp-row">
            <div class="mg-fight-hp">
              <span class="mg-fight-hp-label">なおとっち HP</span>
              <div class="mg-hp-bar"><div class="mg-hp-fill player" id="mgRpgPlayerHP" style="width:100%"></div></div>
              <span class="mg-fight-hp-label" id="mgRpgMPLabel">MP: ${playerMP} / ${playerMaxMP}</span>
              <div class="mg-hp-bar mg-mp-bar"><div class="mg-hp-fill mp" id="mgRpgPlayerMP" style="width:100%"></div></div>
            </div>
            <div class="mg-fight-hp">
              <span class="mg-fight-hp-label">${monsterName}</span>
              <div class="mg-hp-bar"><div class="mg-hp-fill enemy" id="mgRpgMonsterHP" style="width:100%"></div></div>
            </div>
          </div>
          <div class="mg-fight-arena">
            <span class="mg-fight-player" id="mgRpgPlayer">${currentSprite()}</span>
            <span class="mg-fight-opponent" id="mgRpgMonster">${monsterEmoji}</span>
          </div>
          <div class="mg-fight-msg" id="mgRpgMsg">コマンドを えらぼう!</div>
          <div class="mg-rpg-commands">
            <button class="mg-rpg-btn" id="mgRpgAttack">⚔️ たたかう</button>
            <button class="mg-rpg-btn" id="mgRpgMagic">✨ まほう(15MP)</button>
            <button class="mg-rpg-btn" id="mgRpgGuard">🛡️ ぼうぎょ</button>
            <button class="mg-rpg-btn" id="mgRpgFlee">💨 にげる</button>
          </div>
        `;

        const playerHPEl = container.querySelector('#mgRpgPlayerHP');
        const playerMPEl = container.querySelector('#mgRpgPlayerMP');
        const mpLabelEl = container.querySelector('#mgRpgMPLabel');
        const monsterHPEl = container.querySelector('#mgRpgMonsterHP');
        const msgEl = container.querySelector('#mgRpgMsg');
        const playerEl = container.querySelector('#mgRpgPlayer');
        const monsterEl = container.querySelector('#mgRpgMonster');
        const attackBtn = container.querySelector('#mgRpgAttack');
        const magicBtn = container.querySelector('#mgRpgMagic');
        const guardBtn = container.querySelector('#mgRpgGuard');
        const fleeBtn = container.querySelector('#mgRpgFlee');

        function flashHit(el) {
          el.classList.add('hit');
          setTimeout(() => el.classList.remove('hit'), 220);
        }

        function updateBars() {
          playerHPEl.style.width = clamp(playerHP, 0, playerMaxHP) + '%';
          playerMPEl.style.width = clamp((playerMP / playerMaxMP) * 100, 0, 100) + '%';
          mpLabelEl.textContent = `MP: ${playerMP} / ${playerMaxMP}`;
          monsterHPEl.style.width = clamp((monsterHP / monsterMaxHP) * 100, 0, 100) + '%';
        }

        function setButtonsEnabled(enabled) {
          attackBtn.disabled = !enabled;
          magicBtn.disabled = !enabled || playerMP < 15;
          guardBtn.disabled = !enabled;
          fleeBtn.disabled = !enabled;
        }

        function finish(score, message) {
          if (resolved) return;
          resolved = true;
          msgEl.textContent = message;
          setButtonsEnabled(false);
          setTimeout(() => onComplete(Math.round(clamp(score, 0, 100))), 800);
        }

        function monsterTurn() {
          if (resolved) return;
          let dmg = Math.round(monsterAtkMin + Math.random() * (monsterAtkMax - monsterAtkMin));
          if (defending) dmg = Math.round(dmg / 2);
          playerHP = clamp(playerHP - dmg, 0, playerMaxHP);
          flashHit(playerEl);
          updateBars();
          msgEl.textContent = `${monsterName}の こうげき!${dmg}の ダメージ!`;
          defending = false;
          if (playerHP <= 0) {
            finish(clamp(10 + (playerHP - monsterHP) / 5, 0, 25), `${monsterName}に まけて しまった…`);
            return;
          }
          turn += 1;
          if (turn >= TURN_LIMIT) {
            finish(clamp(50 + (playerHP - monsterHP) / 2, 0, 100), 'ここで たたかいは いったん おわり');
            return;
          }
          setTimeout(() => {
            msgEl.textContent = 'コマンドを えらぼう!';
            setButtonsEnabled(true);
          }, 400);
        }

        function playerAct(kind) {
          if (resolved) return;
          setButtonsEnabled(false);
          if (kind === 'attack') {
            const dmg = Math.round(15 + Math.random() * 10);
            monsterHP = clamp(monsterHP - dmg, 0, monsterMaxHP);
            flashHit(monsterEl);
            msgEl.textContent = `たたかった!${dmg}の ダメージ!`;
          } else if (kind === 'magic') {
            if (playerMP < 15) { setButtonsEnabled(true); return; }
            playerMP -= 15;
            const dmg = Math.round(25 + Math.random() * 15);
            monsterHP = clamp(monsterHP - dmg, 0, monsterMaxHP);
            flashHit(monsterEl);
            msgEl.textContent = `まほうを となえた!${dmg}の ダメージ!`;
          } else if (kind === 'guard') {
            defending = true;
            playerMP = clamp(playerMP + 5, 0, playerMaxMP);
            msgEl.textContent = 'ぼうぎょの かまえを とった';
          } else if (kind === 'flee') {
            finish(clamp(35 + (playerHP - monsterHP) / 4, 0, 55), 'にげだした…');
            return;
          }
          updateBars();
          if (monsterHP <= 0) {
            finish(clamp(75 + (playerHP - monsterHP) / 2, 75, 100), `${monsterName}を たおした!`);
            return;
          }
          setTimeout(monsterTurn, 450);
        }

        attackBtn.addEventListener('pointerdown', () => playerAct('attack'));
        magicBtn.addEventListener('pointerdown', () => playerAct('magic'));
        guardBtn.addEventListener('pointerdown', () => playerAct('guard'));
        fleeBtn.addEventListener('pointerdown', () => playerAct('flee'));

        updateBars();
      },
    };
  }

  const RPG_GAME_VARIANTS = [
    mg('rpg-themed', randomThemeGame(makeRpgBattleGame, [
      { title: 'RPGふう バトル!スライムが あらわれた', monsterEmoji: '🟢', monsterName: 'スライム' },
      { title: 'RPGふう バトル!ドラゴンが あらわれた', monsterEmoji: '🐉', monsterName: 'ドラゴン' },
      { title: 'RPGふう バトル!ゴーストが あらわれた', monsterEmoji: '👻', monsterName: 'ゴースト' },
    ])),
  ];

  // --- めいろチェイス: めいろを うごきまわって エサを ぜんぶ たべつつ、
  // おいかけてくる てきを かわす。なつかしい ドットめいろアクションの
  // あそびごこちを モチーフにした オマージュ・ミニゲーム。マップは
  // どうろの中央にある2本のたてどおりを、上下2本のよこどおりで つなぐ
  // 「ドーナツがた」の1しゅるいを きょうつうで つかう(D-パッドで
  // 上下左右に1マスずつ すすみ、てきは まいかい プレイヤーとの きょり
  // ちぢまる ほうこうへ すすむ、ただし ときどき ランダムに うごいて
  // かんぜんに よみきれる うごきには ならない)
  const CHASE_LAYOUT = [
    '#######',
    '#P....#',
    '#.###.#',
    '#.....#',
    '#.###G#',
    '#######',
  ];
  const CHASE_COLS = CHASE_LAYOUT[0].length;
  const CHASE_ROWS = CHASE_LAYOUT.length;

  function makeChaseGame({ title, dotEmoji, chaserEmoji }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = lerp(15000, 10500, difficulty);
        const chaserStepMs = lerp(750, 420, difficulty);
        let player = null;
        let chaser = null;
        const dots = new Set();
        const dotEls = {};
        let totalDots = 0;
        let collected = 0;
        let running = true;
        let chaserTimer;
        let tickTimer;
        let startTime;

        CHASE_LAYOUT.forEach((rowStr, r) => {
          [...rowStr].forEach((ch, c) => {
            if (ch === 'P') player = { row: r, col: c };
            if (ch === 'G') chaser = { row: r, col: c };
            if (ch === '.') { dots.add(`${r},${c}`); totalDots += 1; }
          });
        });

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgTimer">残り: ${Math.ceil(DURATION_MS / 1000)}s</span>
            <span id="mgScore">あつめた: 0/${totalDots}</span>
          </div>
          <div class="mg-title">${title}</div>
          <div class="mg-chase-wrap" id="mgChaseWrap">
            <div class="mg-chase-grid" id="mgChaseGrid" style="grid-template-columns: repeat(${CHASE_COLS}, 1fr); grid-template-rows: repeat(${CHASE_ROWS}, 1fr);"></div>
            <span class="mg-chase-player" id="mgChasePlayer">${currentSprite()}</span>
            <span class="mg-chase-chaser" id="mgChaseChaser">${chaserEmoji}</span>
          </div>
          <div class="mg-dpad">
            <button class="mg-tap-btn" id="mgChaseUp">▲</button>
            <div class="mg-dpad-mid">
              <button class="mg-tap-btn" id="mgChaseLeft">◀</button>
              <button class="mg-tap-btn" id="mgChaseRight">▶</button>
            </div>
            <button class="mg-tap-btn" id="mgChaseDown">▼</button>
          </div>
        `;

        const gridEl = container.querySelector('#mgChaseGrid');
        const playerEl = container.querySelector('#mgChasePlayer');
        const chaserEl = container.querySelector('#mgChaseChaser');
        const wrapEl = container.querySelector('#mgChaseWrap');
        const timerEl = container.querySelector('#mgTimer');
        const scoreEl = container.querySelector('#mgScore');

        CHASE_LAYOUT.forEach((rowStr, r) => {
          [...rowStr].forEach((ch, c) => {
            const cell = document.createElement('div');
            cell.className = `mg-chase-cell ${ch === '#' ? 'wall' : 'floor'}`;
            if (ch === '.') {
              const dot = document.createElement('span');
              dot.className = 'mg-chase-dot';
              dot.textContent = dotEmoji;
              cell.appendChild(dot);
              dotEls[`${r},${c}`] = dot;
            }
            gridEl.appendChild(cell);
          });
        });

        function placeEntity(el, pos) {
          el.style.left = `${((pos.col + 0.5) / CHASE_COLS) * 100}%`;
          el.style.top = `${((pos.row + 0.5) / CHASE_ROWS) * 100}%`;
        }
        placeEntity(playerEl, player);
        placeEntity(chaserEl, chaser);

        function isWalkable(r, c) {
          return r >= 0 && r < CHASE_ROWS && c >= 0 && c < CHASE_COLS && CHASE_LAYOUT[r][c] !== '#';
        }

        function checkCatch() {
          if (player.row === chaser.row && player.col === chaser.col) {
            caughtEnd();
            return true;
          }
          return false;
        }

        function caughtEnd() {
          if (!running) return;
          running = false;
          clearTimeout(chaserTimer);
          clearInterval(tickTimer);
          wrapEl.classList.add('hit');
          const ratio = collected / totalDots;
          onComplete(Math.round(clamp(ratio * 100 * 0.6, 10, 55)));
        }

        function winEnd() {
          if (!running) return;
          running = false;
          clearTimeout(chaserTimer);
          clearInterval(tickTimer);
          const remaining = Math.max(0, DURATION_MS - (performance.now() - startTime));
          const timeBonus = remaining / DURATION_MS;
          onComplete(Math.round(clamp(85 + timeBonus * 15, 85, 100)));
        }

        function timeUpEnd() {
          if (!running) return;
          running = false;
          clearTimeout(chaserTimer);
          const ratio = collected / totalDots;
          onComplete(Math.round(clamp(ratio * 100, 5, 80)));
        }

        function tryMove(dr, dc) {
          if (!running) return;
          const nr = player.row + dr;
          const nc = player.col + dc;
          if (!isWalkable(nr, nc)) return;
          player = { row: nr, col: nc };
          placeEntity(playerEl, player);
          const key = `${nr},${nc}`;
          if (dots.has(key)) {
            dots.delete(key);
            collected += 1;
            dotEls[key].remove();
            scoreEl.textContent = `あつめた: ${collected}/${totalDots}`;
            if (collected >= totalDots) { winEnd(); return; }
          }
          checkCatch();
        }

        const bindMove = (selector, dr, dc) => {
          const btn = container.querySelector(selector);
          btn.dataset.hold = 'step';
          btn.addEventListener('pointerdown', (e) => { e.preventDefault(); tryMove(dr, dc); });
        };
        // めいろの うえを スワイプしても うごける
        let chaseSwipe = null;
        wrapEl.addEventListener('pointerdown', (e) => { e.preventDefault(); chaseSwipe = { x: e.clientX, y: e.clientY }; try { wrapEl.setPointerCapture(e.pointerId); } catch (err) {} });
        wrapEl.addEventListener('pointerup', (e) => {
          if (!chaseSwipe) return;
          const dx = e.clientX - chaseSwipe.x, dy = e.clientY - chaseSwipe.y; chaseSwipe = null;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return;
          if (Math.abs(dx) > Math.abs(dy)) tryMove(0, dx < 0 ? -1 : 1); else tryMove(dy < 0 ? -1 : 1, 0);
        });
        wrapEl.addEventListener('pointercancel', () => { chaseSwipe = null; });
        bindMove('#mgChaseUp', -1, 0);
        bindMove('#mgChaseDown', 1, 0);
        bindMove('#mgChaseLeft', 0, -1);
        bindMove('#mgChaseRight', 0, 1);

        function stepChaser() {
          if (!running) return;
          const options = [[-1, 0], [1, 0], [0, -1], [0, 1]]
            .map(([dr, dc]) => ({ row: chaser.row + dr, col: chaser.col + dc }))
            .filter((p) => isWalkable(p.row, p.col));
          if (options.length) {
            if (Math.random() < 0.15) {
              chaser = options[Math.floor(Math.random() * options.length)];
            } else {
              let bestDist = Infinity;
              options.forEach((p) => {
                const dist = Math.abs(p.row - player.row) + Math.abs(p.col - player.col);
                if (dist < bestDist) bestDist = dist;
              });
              const tied = options.filter((p) => Math.abs(p.row - player.row) + Math.abs(p.col - player.col) === bestDist);
              chaser = tied[Math.floor(Math.random() * tied.length)];
            }
            placeEntity(chaserEl, chaser);
          }
          if (checkCatch()) return;
          chaserTimer = setTimeout(stepChaser, chaserStepMs);
        }

        // スタート ゆうよちゅうは おいかけっこも タイマーも すすめない
        // (プレイヤーの ボタンそうさじたいは 先に できて よい)(セクション2)
        startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        tickTimer = setInterval(() => {
          const remaining = Math.max(0, Math.min(DURATION_MS, DURATION_MS - (performance.now() - startTime)));
          timerEl.textContent = `残り: ${Math.ceil(remaining / 1000)}s`;
          if (remaining <= 0) { clearInterval(tickTimer); timeUpEnd(); }
        }, 200);

        chaserTimer = setTimeout(stepChaser, MG_ACTION_START_GRACE_MS + chaserStepMs);
      },
    };
  }

  const CHASE_GAME_VARIANTS = [
    mg('chase-themed', randomThemeGame(makeChaseGame, [
      { title: 'おばけやしきで キャンディを ぜんぶ あつめよう!', dotEmoji: '🍬', chaserEmoji: '👻' },
      { title: 'もりで どんぐりを ぜんぶ あつめよう!', dotEmoji: '🌰', chaserEmoji: '🦇' },
    ])),
  ];

  // --- シューティング: レーンを うごきながら、せまってくる てきを
  // うちおとす。なつかしい シューティングアクションの あそびごこちを
  // モチーフにした オマージュ・ミニゲーム。じぶんの いる れーんに
  // いちばん ちかづいている てきが「うつ!」ボタンで いちげきで きえる
  // (弾の とびじかんは 演出のみで、はんてい じたいは 即座に おこなう)。
  // れーんを こえて きた てきは うてず、そのまま とおりすぎて しまう
  function makeShooterGame({ title, enemyEmoji, bulletEmoji }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = 7000;
        const travelMs = lerp(2200, 1300, difficulty);
        const spawnInterval = lerp(900, 480, difficulty);
        const LANE_X = [20, 50, 80];
        let lane = 1;
        let hits = 0;
        let escapes = 0;
        let running = true;
        let lastSpawn = 0;
        let enemies = [];

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgTimer">残り: 7s</span>
            <span id="mgScore">げきついすう: 0</span>
          </div>
          <div class="mg-title">${title}</div>
          <div class="mg-shooter-arena" id="mgShooterArena">
            <div class="mg-shooter-player" id="mgShooterPlayer" style="left:${LANE_X[1]}%">${currentSprite()}</div>
          </div>
          <div class="mg-hint">左右ボタンか画面のレーンをタップして移動 → 同じレーンに来たら「うつ!」</div>
          <div class="mg-shooter-controls">
            <button class="mg-tap-btn" id="mgShooterLeft" data-hold="step" data-key="left">◀</button>
            <button class="mg-tap-btn mg-shooter-fire" id="mgShooterFire" data-key="action">🔫 うつ!</button>
            <button class="mg-tap-btn" id="mgShooterRight" data-hold="step" data-key="right">▶</button>
          </div>
        `;

        const arena = container.querySelector('#mgShooterArena');
        const playerEl = container.querySelector('#mgShooterPlayer');
        const timerEl = container.querySelector('#mgTimer');
        const scoreEl = container.querySelector('#mgScore');
        const leftBtn = container.querySelector('#mgShooterLeft');
        const rightBtn = container.querySelector('#mgShooterRight');
        const fireBtn = container.querySelector('#mgShooterFire');

        function setLane(next) {
          lane = clamp(next, 0, 2);
          playerEl.style.left = LANE_X[lane] + '%';
        }
        leftBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); setLane(lane - 1); });
        rightBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); setLane(lane + 1); });
        arena.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          const r = arena.getBoundingClientRect();
          const pct = (e.clientX - r.left) / r.width;
          setLane(pct < 1/3 ? 0 : pct > 2/3 ? 2 : 1);
        });

        function flashArena() {
          arena.classList.add('hit');
          setTimeout(() => arena.classList.remove('hit'), 200);
        }

        function spawnEnemy() {
          const enemyLane = Math.floor(Math.random() * 3);
          const el = document.createElement('div');
          el.className = 'mg-shooter-enemy';
          el.textContent = enemyEmoji;
          arena.appendChild(el);
          enemies.push({ el, lane: enemyLane, born: performance.now(), resolved: false });
        }

        function fire() {
          if (!running) return;
          const bulletEl = document.createElement('div');
          bulletEl.className = 'mg-shooter-bullet';
          bulletEl.textContent = bulletEmoji;
          bulletEl.style.left = LANE_X[lane] + '%';
          arena.appendChild(bulletEl);
          setTimeout(() => bulletEl.remove(), 220);

          let target = null;
          let bestProgress = -1;
          enemies.forEach((enemy) => {
            if (enemy.resolved || enemy.lane !== lane) return;
            const progress = clamp((performance.now() - enemy.born) / travelMs, 0, 1);
            if (progress > bestProgress) { bestProgress = progress; target = enemy; }
          });
          if (target) {
            target.resolved = true;
            target.el.classList.add('exploding');
            hits += 1;
            scoreEl.textContent = `げきついすう: ${hits}`;
            setTimeout(() => target.el.remove(), 180);
          }
        }
        fireBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); fire(); });

        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        let rafId;

        function frame(now) {
          if (!running) return;
          const elapsed = now - startTime;
          if (elapsed < 0) {
            timerEl.textContent = `残り: ${Math.ceil(DURATION_MS / 1000)}s`;
            rafId = requestAnimationFrame(frame);
            return;
          }
          const remaining = Math.max(0, DURATION_MS - elapsed);
          timerEl.textContent = `残り: ${Math.ceil(remaining / 1000)}s`;

          if (now - lastSpawn > spawnInterval && remaining > travelMs) {
            spawnEnemy();
            lastSpawn = now;
          }

          enemies = enemies.filter((enemy) => {
            if (enemy.resolved) return false;
            const t = clamp((now - enemy.born) / travelMs, 0, 1);
            enemy.el.style.left = LANE_X[enemy.lane] + '%';
            enemy.el.style.top = `${lerp(6, 82, t)}%`;
            if (t >= 1) {
              enemy.resolved = true;
              escapes += 1;
              flashArena();
              enemy.el.remove();
              return false;
            }
            return true;
          });

          if (elapsed >= DURATION_MS) { end(); return; }
          rafId = requestAnimationFrame(frame);
        }

        function end() {
          if (!running) return;
          running = false;
          cancelAnimationFrame(rafId);
          enemies.forEach((enemy) => enemy.el.remove());
          const total = hits + escapes;
          const score = total > 0 ? Math.round(clamp((hits / total) * 100, 0, 100)) : 0;
          onComplete(score);
        }

        rafId = requestAnimationFrame(frame);
      },
    };
  }

  const SHOOTER_GAME_VARIANTS = [
    mg('shooter-themed', randomThemeGame(makeShooterGame, [
      { title: 'せまりくる てきを うちおとせ!', enemyEmoji: '👾', bulletEmoji: '⭐' },
      { title: 'いんせきの あらしを うちやぶれ!', enemyEmoji: '☄️', bulletEmoji: '✨' },
    ])),
  ];

  // --- しょうじゅん・まとあて(シューティング) ---
  // うごきまわる しょうじゅんを、まとの うえに くるまで まって
  // タイミングよく タップする
  function makeTargetAimGame({ title, targetEmoji, reticleEmoji }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const ROUNDS = 3;
        const speed = lerp(1.2, 2.2, difficulty);
        let round = 0;
        const scores = [];
        let running = true;
        let rafId;
        const startTime = performance.now();
        let fired = false;

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgRound">ラウンド 1/${ROUNDS}</span>
            <span id="mgScore">とくてん: 0</span>
          </div>
          <div class="mg-title">${title}</div>
          <div class="mg-aim-field" id="mgAimField">
            <span class="mg-aim-target">${targetEmoji}</span>
            <span class="mg-aim-reticle" id="mgAimReticle">${reticleEmoji}</span>
          </div>
          <button class="mg-tap-btn" id="mgAimFireBtn">はっしゃ!</button>
        `;
        const reticleEl = container.querySelector('#mgAimReticle');
        const fireBtn = container.querySelector('#mgAimFireBtn');
        const roundEl = container.querySelector('#mgRound');
        const scoreEl = container.querySelector('#mgScore');
        let roundStart = performance.now();

        function frame(now) {
          if (!running) return;
          const t = (now - roundStart) / 1000;
          const x = 50 + Math.sin(t * speed) * 38;
          const y = 50 + Math.cos(t * speed * 1.6) * 30;
          reticleEl.style.left = x + '%';
          reticleEl.style.top = y + '%';
          if (!fired) rafId = requestAnimationFrame(frame);
        }

        function fire() {
          if (fired) return;
          fired = true;
          const x = parseFloat(reticleEl.style.left);
          const y = parseFloat(reticleEl.style.top);
          const dist = Math.hypot(x - 50, y - 50);
          let roundScore;
          if (dist <= 8) roundScore = 100;
          else if (dist <= 18) roundScore = 70;
          else if (dist <= 30) roundScore = 40;
          else roundScore = 10;
          scores.push(roundScore);
          scoreEl.textContent = `とくてん: ${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}`;
          round += 1;
          fireBtn.disabled = true;
          if (round >= ROUNDS) {
            setTimeout(end, 500);
          } else {
            setTimeout(() => {
              roundEl.textContent = `ラウンド ${round + 1}/${ROUNDS}`;
              fired = false;
              fireBtn.disabled = false;
              roundStart = performance.now();
              rafId = requestAnimationFrame(frame);
            }, 500);
          }
        }
        fireBtn.addEventListener('pointerdown', fire);

        function end() {
          if (!running) return;
          running = false;
          cancelAnimationFrame(rafId);
          onComplete(Math.round(scores.reduce((a, b) => a + b, 0) / scores.length));
        }

        rafId = requestAnimationFrame(frame);
      },
    };
  }

  const TARGET_AIM_VARIANTS = [
    mg('targetAim-themed', randomThemeGame(makeTargetAimGame, [
      { title: 'しゃげきふう!うごく しょうじゅんを まとへ あわせて うとう', targetEmoji: '🎯', reticleEmoji: '➕' },
      { title: 'そげきふう!うごく しょうじゅんを まとに あわせて はなて', targetEmoji: '🦆', reticleEmoji: '🔴' },
    ])),
  ];

  // --- ボウリング(canvas ぎじ3D・10ピン物理): うしろから 見た レーンに
  //     スワイプで なげる。スワイプの むきが ねらい、はやさが パワー、
  //     とちゅうで まげると フック(カーブ)。ピンどうしも ぶつかって たおれる ---
  function makeBowlingGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const LANE_L = 40, LANE_HW = 10, BALL_R = 2.05, PIN_R = 1.14, PIN_H = 7.2;
        const CAM_Z = -8, CAM_Y = 7.5, HOR_RATIO = 0.3;
        const FRAMES = 2;
        let frame = 1, ballNo = 1, pinsDown = 0, strikes = 0, spares = 0, framePins = 0, results = [];
        let ball = null, thrown = false, running = true, rafId = null, last = null, msg = '', msgUntil = 0, startX = 0, settleAt = 0;
        let drag = null, leftHeld = false, rightHeld = false;
        const GIVE_UP_MS = 50000;
        const startTime = performance.now();
        const pins = [];
        function rackPins() {
          pins.length = 0;
          const rows = [[0], [-2.9, 2.9], [-5.8, 0, 5.8], [-8.7, -2.9, 2.9, 8.7]];
          rows.forEach((xs, r) => xs.forEach((x) => pins.push({ x, z: LANE_L - 18 + r * 5.2, vx: 0, vz: 0, up: true, angle: 0, gone: false })));
        }
        container.innerHTML = `
          <div class="mg-header"><span id="bwFrame">1フレーム 1投目</span><span id="bwScore">たおした 0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="bwCanvas"></canvas></div>
          <div class="mg-hint" id="bwHint">ボールから うえへ スワイプ! はやく はらうほど つよく、ななめに はらうと ねらいが かわる。◀▶で 立ち位置</div>
          <div class="mg-race-controls"><button class="mg-tap-btn mg-hold-btn" id="bwLeft" data-key="left">◀</button><button class="mg-tap-btn mg-hold-btn" id="bwRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#bwCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 250);
        const F = W * 0.55, HOR = H * HOR_RATIO;
        const frameEl = container.querySelector('#bwFrame'), scoreEl = container.querySelector('#bwScore'), hint = container.querySelector('#bwHint');
        bindHeldButton(container.querySelector('#bwLeft'), (v) => { leftHeld = v; });
        bindHeldButton(container.querySelector('#bwRight'), (v) => { rightHeld = v; });
        const say = (t, ms = 1400) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        function project(x, y, z) { const dz = z - CAM_Z; const s = F / dz; return { x: W / 2 + x * s, y: HOR + (CAM_Y - y) * s, s }; }
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (thrown || !running) return; const p = mgPointerPos(canvas, e); drag = { id: e.pointerId, pts: [{ x: p.x, y: p.y, t: performance.now() }] }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; const p = mgPointerPos(canvas, e); drag.pts.push({ x: p.x, y: p.y, t: performance.now() }); if (drag.pts.length > 40) drag.pts.shift(); });
        const release = (e) => {
          if (!drag || e.pointerId !== drag.id) return;
          const pts = drag.pts; drag = null;
          const a = pts[0], b = pts[pts.length - 1];
          const dy = a.y - b.y, dx = b.x - a.x, dt = Math.max(40, b.t - a.t);
          if (dy < 30) { say('もっと ながく うえへ スワイプしよう', 1000); return; }
          const speedPx = Math.hypot(dx, dy) / dt * 1000;
          const power = clamp(speedPx / 1400, 0.45, 1.25);
          const mid = pts[Math.floor(pts.length / 2)];
          const hook = clamp(((b.x - mid.x) - (mid.x - a.x)) / 60, -1, 1);
          const aim = clamp(dx / dy, -0.6, 0.6);
          throwBall(power, aim, hook);
        };
        canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
        function throwBall(power, aim, hook) {
          thrown = true;
          const speed = 26 * power;
          ball = { x: startX, z: 0, vx: aim * speed * 0.55, vz: speed, hook: hook * 9, spin: 0 };
          say(power > 1.1 ? '💨 ごうきゅう!' : 'なげた!', 700);
        }
        function step(dt) {
          if (!ball) return;
          const b = ball;
          if (b.z > LANE_L * 0.45 && !b.gutter) b.vx += b.hook * dt * (b.z / LANE_L);
          b.x += b.vx * dt; b.z += b.vz * dt;
          b.vz -= 1.2 * dt;
          if (Math.abs(b.x) > LANE_HW && !b.gutter) { b.gutter = true; b.x = Math.sign(b.x) * (LANE_HW + 1.2); b.vx = 0; b.hook = 0; say('ガター…', 1000); }
          for (const p of pins) {
            if (p.gone) continue;
            const dx = p.x - b.x, dz = p.z - b.z, d = Math.hypot(dx, dz);
            if (d < BALL_R + PIN_R && !b.gutter) {
              const nx = dx / (d || 1), nz = dz / (d || 1);
              const sp = Math.hypot(b.vx, b.vz);
              p.x = b.x + nx * (BALL_R + PIN_R + 0.05); p.z = b.z + nz * (BALL_R + PIN_R + 0.05);
              // インパルスは ピンごとに 1かいだけ(ふれつづけても ボールが とまらない ように)
              if (!p.hitAt || performance.now() - p.hitAt > 250) {
                p.hitAt = performance.now();
                p.vx = nx * sp * (0.7 + Math.random() * 0.4) + b.vx * 0.2; p.vz = nz * sp * (0.8 + Math.random() * 0.3);
                p.up = false; p.angle = Math.atan2(nx, nz);
                b.vx -= nx * sp * 0.06; b.vz *= 0.96;
              }
            }
          }
          for (const p of pins) {
            if (p.gone || p.up) continue;
            p.x += p.vx * dt; p.z += p.vz * dt;
            p.vx *= Math.pow(0.5, dt); p.vz *= Math.pow(0.5, dt);
            p.angle += (Math.abs(p.vx) + Math.abs(p.vz)) * dt * 0.4;
            for (const q of pins) {
              if (q === p || q.gone) continue;
              const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
              // たおれかけの ピンは よこに ひろがるので、あたり判定を ひろめに とる
              const reach = PIN_R * 2 + (q.up ? 1.0 : 0.3);
              if (d < reach && d > 0) {
                const nx = dx / d, nz = dz / d, sp = Math.hypot(p.vx, p.vz);
                const key = pins.indexOf(q);
                p.pinHits = p.pinHits || {};
                // ピンどうしの インパルスも ペアごとに 1かい(ふれつづけて そくどが きえない ように)
                if (sp > 0.8 && !(p.pinHits[key] > performance.now() - 300)) {
                  p.pinHits[key] = performance.now();
                  if (q.up) { q.up = false; q.angle = Math.atan2(nx, nz); q.hitAt = performance.now(); }
                  const scatter = (Math.random() - 0.5) * 0.6;
                  q.vx += (nx + scatter) * sp * 0.6; q.vz += nz * sp * 0.6; p.vx *= 0.55; p.vz *= 0.55;
                }
                if (d < PIN_R * 2) { p.x = q.x - nx * PIN_R * 2; p.z = q.z - nz * PIN_R * 2; }
              }
            }
            if (Math.abs(p.x) > LANE_HW + 3 || p.z > LANE_L + 4 || p.z < 4) p.gone = true;
          }
          if (b.z > LANE_L + 4 || b.vz < 0.5) { ball = null; settleAt = performance.now() + 900; }
        }
        function ballDone() {
          const down = pins.filter((p) => !p.up).length;
          const gained = down - framePins;
          framePins = down; pinsDown += gained;
          scoreEl.textContent = 'たおした ' + pinsDown;
          let label;
          if (ballNo === 1 && down === 10) { strikes++; label = '🎳 ストライク!!'; results.push('X'); nextFrame(); }
          else if (ballNo === 2 && down === 10) { spares++; label = '✨ スペア!'; results.push('/'); nextFrame(); }
          else if (ballNo === 1) { label = gained === 0 ? 'ノーピン…' : gained + 'ほん たおした!'; ballNo = 2; for (const p of pins) if (!p.up) p.gone = true; }
          else { label = gained === 0 ? 'のこった…' : 'あわせて ' + down + 'ほん'; results.push(String(down)); nextFrame(); }
          say(label, 1600);
          if (frame > FRAMES) { setTimeout(finish, 1300); return; }
          frameEl.textContent = frame + 'フレーム ' + ballNo + '投目';
          thrown = false;
        }
        function nextFrame() { frame++; ballNo = 1; framePins = 0; if (frame <= FRAMES) rackPins(); }
        function drawPin(p) {
          const base = project(p.x, 0, p.z);
          const top = project(p.x, PIN_H, p.z);
          const h = base.y - top.y, w = PIN_R * 2 * base.s;
          ctx.save(); ctx.translate(base.x, base.y);
          if (!p.up) { ctx.rotate(Math.PI / 2 + p.angle * 0.5); ctx.globalAlpha = 0.9; }
          ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.6, w * 0.25, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.ellipse(0, -h * 0.28, w * 0.5, h * 0.3, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(0, -h * 0.7, w * 0.3, h * 0.32, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#e63946'; ctx.fillRect(-w * 0.3, -h * 0.58, w * 0.6, Math.max(1, h * 0.06)); ctx.fillRect(-w * 0.3, -h * 0.5, w * 0.6, Math.max(1, h * 0.06));
          ctx.restore();
        }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#1d2233'; ctx.fillRect(0, 0, W, H);
          const g = ctx.createLinearGradient(0, 0, 0, HOR); g.addColorStop(0, '#0f1320'); g.addColorStop(1, '#3a3f5a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, HOR + 2);
          const nl = project(-LANE_HW, 0, 0), nr = project(LANE_HW, 0, 0), fl = project(-LANE_HW, 0, LANE_L + 3), fr = project(LANE_HW, 0, LANE_L + 3);
          const gl = project(-LANE_HW - 2.5, 0, 0), gr = project(LANE_HW + 2.5, 0, 0), gfl = project(-LANE_HW - 2.5, 0, LANE_L + 3), gfr = project(LANE_HW + 2.5, 0, LANE_L + 3);
          ctx.fillStyle = '#2b2f3f'; ctx.beginPath(); ctx.moveTo(gl.x, gl.y); ctx.lineTo(gfl.x, gfl.y); ctx.lineTo(gfr.x, gfr.y); ctx.lineTo(gr.x, gr.y); ctx.closePath(); ctx.fill();
          const wood = ctx.createLinearGradient(0, fl.y, 0, nl.y); wood.addColorStop(0, '#b98a53'); wood.addColorStop(1, '#e2b57d');
          ctx.fillStyle = wood; ctx.beginPath(); ctx.moveTo(nl.x, nl.y); ctx.lineTo(fl.x, fl.y); ctx.lineTo(fr.x, fr.y); ctx.lineTo(nr.x, nr.y); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(120,80,40,.35)'; ctx.lineWidth = 1;
          for (let i = -4; i <= 4; i++) { const a = project(i * 2.5, 0, 0), b = project(i * 2.5, 0, LANE_L + 3); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
          ctx.fillStyle = 'rgba(80,40,10,.5)'; for (let i = -3; i <= 3; i++) { const a = project(i * 2.9, 0, 14 + Math.abs(i) * 1.2); ctx.beginPath(); ctx.moveTo(a.x, a.y - 5 * a.s); ctx.lineTo(a.x - 1.2 * a.s, a.y); ctx.lineTo(a.x + 1.2 * a.s, a.y); ctx.closePath(); ctx.fill(); }
          const order = pins.filter((p) => !p.gone).sort((a, b) => b.z - a.z);
          for (const p of order) if (!ball || p.z > ball.z) drawPin(p);
          if (ball) { const b = project(ball.x, BALL_R, ball.z); const r = BALL_R * b.s; ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(b.x, b.y + r * 0.9, r * 1.1, r * 0.4, 0, 0, Math.PI * 2); ctx.fill(); const bg = ctx.createRadialGradient(b.x - r * 0.35, b.y - r * 0.35, 1, b.x, b.y, r); bg.addColorStop(0, '#6fa8ff'); bg.addColorStop(1, '#0b2a6b'); ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill(); }
          for (const p of order) if (ball && p.z <= ball.z) drawPin(p);
          if (!thrown && running) {
            const b = project(startX, BALL_R, 0); const r = BALL_R * b.s;
            ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(b.x, b.y + r * 0.9, r * 1.1, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
            const bg = ctx.createRadialGradient(b.x - r * 0.35, b.y - r * 0.35, 1, b.x, b.y, r); bg.addColorStop(0, '#6fa8ff'); bg.addColorStop(1, '#0b2a6b'); ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
            if (drag && drag.pts.length > 1) { const a = drag.pts[0], e = drag.pts[drag.pts.length - 1]; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + (e.x - a.x), b.y + (e.y - a.y)); ctx.stroke(); ctx.setLineDash([]); }
            else { ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText('↑ スワイプで なげる', W / 2, b.y - r - 14); }
          }
          ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#fff';
          ctx.fillText(results.map((r) => r === 'X' ? 'X' : r === '/' ? '/' : r).join(' ') || '', 8, 8);
          if (now < msgUntil) { ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 90, HOR + 14, 180, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, HOR + 28); }
        }
        function loop(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.04, (now - last) / 1000); last = now;
          if (!thrown) { const mv = ((rightHeld ? 1 : 0) - (leftHeld ? 1 : 0)) * 9 * dt; startX = clamp(startX + mv, -LANE_HW + 2.5, LANE_HW - 2.5); }
          if (ball) { const sub = 3; for (let i = 0; i < sub; i++) step(dt / sub); }
          else if (thrown && settleAt && now > settleAt) { settleAt = 0; ballDone(); }
          render(now);
          if (now - startTime > GIVE_UP_MS && !thrown) { finish(); return; }
          rafId = requestAnimationFrame(loop);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const score = clamp(Math.round(22 + pinsDown * 3.2 + strikes * 8 + spares * 4), 15, 100);
          say(`けっか: ${pinsDown}ほん${strikes ? ' ストライク' + strikes : ''}${spares ? ' スペア' + spares : ''}`, 2000);
          render(performance.now());
          setTimeout(() => onComplete(score), 900);
        }
        rackPins();
        rafId = requestAnimationFrame(loop);
      },
    };
  }

  // --- アーチェリー(まとあて): ひっぱって はなす。かぜと 手ぶれを よんで
  //     まとの まんなかを ねらう。5本で 50点まんてん ---
  function makeArcheryGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const ARROWS = 5;
        let arrowNo = 0, total = 0, running = true, rafId = null, last = null, msg = '', msgUntil = 0, holdSince = 0;
        let wind = 0, dist = 1, aim = null, flying = null, hits = [], results = [];
        const GIVE_UP_MS = 55000;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="arNo">1/${ARROWS}本目</span><span id="arScore">0てん</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="arCanvas"></canvas></div>
          <div class="mg-hint" id="arHint">がめんを おさえて うしろへ ひっぱり、はなすと はっしゃ。かぜの ぶんだけ ずらして ねらおう</div>`;
        const canvas = container.querySelector('#arCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 250);
        const noEl = container.querySelector('#arNo'), scoreEl = container.querySelector('#arScore'), hint = container.querySelector('#arHint');
        const say = (t, ms = 1300) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const TX = W / 2, TY = H * 0.42;
        function newRound() {
          wind = (Math.random() - 0.5) * 2 * lerp(0.5, 1.2, difficulty);
          dist = 0.85 + Math.random() * 0.5;
          hits = [];
        }
        const targetR = () => W * 0.3 / dist;
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (flying || !running || arrowNo >= ARROWS) return; const p = mgPointerPos(canvas, e); aim = { id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y }; holdSince = performance.now(); try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointermove', (e) => { if (!aim || e.pointerId !== aim.id) return; const p = mgPointerPos(canvas, e); aim.x = p.x; aim.y = p.y; });
        const release = (e) => {
          if (!aim || e.pointerId !== aim.id) return;
          const dx = aim.ox - aim.x, dy = aim.oy - aim.y; const len = Math.hypot(dx, dy); aim = null;
          if (len < 18) { say('もっと ひっぱろう', 900); return; }
          const draw = clamp(len / 110, 0.2, 1);
          const { sx, sy } = sightPoint(dx, dy, len, draw);
          const shake = shakeAmount();
          const landX = sx + wind * 26 * (1 / draw) + (Math.random() - 0.5) * shake;
          const landY = sy + (Math.random() - 0.5) * shake;
          flying = { t: 0, fromX: W / 2, fromY: H + 10, toX: landX, toY: landY };
          arrowNo++;
        };
        canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
        function shakeAmount() { const held = (performance.now() - holdSince) / 1000; return lerp(4, 10, difficulty) + Math.max(0, held - 1.5) * 8; }
        // ひっぱった むきの はんたい(=やの とぶ むき)。まっすぐ したへ
        // いっぱいに ひくと まとの まんなか、ひきが よわい/ななめだと したに おちる
        function sightPoint(dx, dy, len, draw) { const ux = dx / len, uy = dy / len; return { sx: W / 2 + ux * 150, sy: TY + (1 - draw) * 90 + (1 + uy) * 45 }; }
        function ringScore(x, y) { const d = Math.hypot(x - TX, y - TY) / targetR(); if (d > 1) return 0; return Math.max(1, 10 - Math.floor(d * 10)); }
        function render(now) {
          if (!ctx) return;
          const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#8ed0ff'); sky.addColorStop(0.55, '#d8efff'); sky.addColorStop(0.56, '#79b85a'); sky.addColorStop(1, '#4e8f3a');
          ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
          const R = targetR();
          ctx.fillStyle = '#8b5a2b'; ctx.fillRect(TX - 3, TY, 6, H * 0.56 - TY);
          const rings = ['#fff', '#fff', '#222', '#222', '#2b7bd6', '#2b7bd6', '#e63946', '#e63946', '#ffd60a', '#ffd60a'];
          for (let i = 0; i < 10; i++) { ctx.fillStyle = rings[i]; ctx.beginPath(); ctx.arc(TX, TY, R * (1 - i / 10), 0, Math.PI * 2); ctx.fill(); }
          ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; for (let i = 1; i <= 10; i++) { ctx.beginPath(); ctx.arc(TX, TY, R * i / 10, 0, Math.PI * 2); ctx.stroke(); }
          for (const h of hits) { ctx.strokeStyle = '#3b2a12'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(h.x - 6, h.y + 14); ctx.stroke(); ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.arc(h.x, h.y, 3, 0, Math.PI * 2); ctx.fill(); }
          // かぜ
          ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(8, 8, 118, 22);
          ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          const wa = Math.abs(wind); ctx.fillText('かぜ ' + (wa < 0.15 ? 'なし' : (wind < 0 ? '←' : '→') + ' ' + (wa < 0.5 ? 'よわ' : wa < 0.9 ? 'ふつう' : 'つよ')), 14, 19);
          for (let i = 0; i < 3; i++) { ctx.fillStyle = i < wa * 3 ? '#8ef0ff' : 'rgba(255,255,255,.25)'; ctx.fillRect(96 + i * 9, 13, 6, 12); }
          if (aim) {
            const dx = aim.ox - aim.x, dy = aim.oy - aim.y, len = Math.hypot(dx, dy), draw = clamp(len / 110, 0, 1);
            if (len > 4) {
              const { sx, sy } = sightPoint(dx, dy, len, Math.max(0.2, draw));
              const sh = shakeAmount() * 0.4; const jx = Math.sin(now / 90) * sh, jy = Math.cos(now / 70) * sh;
              ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx + jx, sy + jy, 10, 0, Math.PI * 2); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(sx + jx - 16, sy + jy); ctx.lineTo(sx + jx + 16, sy + jy); ctx.moveTo(sx + jx, sy + jy - 16); ctx.lineTo(sx + jx, sy + jy + 16); ctx.stroke();
              ctx.fillStyle = draw > 0.85 ? '#ff5c8a' : draw > 0.5 ? '#ffd257' : '#8de0a0'; ctx.fillRect(W - 24, H - 16 - 100 * draw, 12, 100 * draw); ctx.strokeStyle = '#fff'; ctx.strokeRect(W - 24, H - 116, 12, 100);
            }
            // ゆみ
            ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(W / 2, H + 40, 70, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
            ctx.strokeStyle = '#eee'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(W / 2 - 57, H + 40 - 41); ctx.lineTo(W / 2 + (aim.x - aim.ox) * 0.3, H - 6 + Math.min(40, len * 0.3)); ctx.lineTo(W / 2 + 57, H + 40 - 41); ctx.stroke();
          } else if (!flying && arrowNo < ARROWS) {
            ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(W / 2, H + 40, 70, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
            ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4; ctx.fillText('おさえて うしろへ ひっぱる', W / 2, H - 30); ctx.shadowBlur = 0;
          }
          if (flying) {
            const t = flying.t, x = flying.fromX + (flying.toX - flying.fromX) * t, y = flying.fromY + (flying.toY - flying.fromY) * t - Math.sin(t * Math.PI) * 60;
            const s = 1 - t * 0.6;
            ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(flying.toY - flying.fromY, flying.toX - flying.fromX)); ctx.strokeStyle = '#3b2a12'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(-22 * s, 0); ctx.lineTo(6 * s, 0); ctx.stroke(); ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.moveTo(-22 * s, 0); ctx.lineTo(-30 * s, -5 * s); ctx.lineTo(-30 * s, 5 * s); ctx.closePath(); ctx.fill(); ctx.restore();
          }
          ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.shadowColor = '#000'; ctx.shadowBlur = 3; ctx.fillText(results.join('・'), W - 8, 8); ctx.shadowBlur = 0;
          if (now < msgUntil) { ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H * 0.62, 160, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H * 0.62 + 14); }
        }
        function loop(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.04, (now - last) / 1000); last = now;
          if (flying) {
            flying.t += dt / 0.55;
            if (flying.t >= 1) {
              const pts = ringScore(flying.toX, flying.toY);
              if (pts > 0) hits.push({ x: flying.toX, y: flying.toY });
              total += pts; results.push(String(pts)); scoreEl.textContent = total + 'てん';
              say(pts === 10 ? '🎯 ど まんなか! 10てん' : pts === 0 ? 'はずれ…' : pts + 'てん', 1300);
              flying = null;
              if (arrowNo >= ARROWS) { setTimeout(finish, 1200); }
              else { noEl.textContent = (arrowNo + 1) + '/' + ARROWS + '本目'; setTimeout(newRound, 900); }
            }
          }
          render(now);
          if (now - startTime > GIVE_UP_MS) { finish(); return; }
          rafId = requestAnimationFrame(loop);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const score = clamp(Math.round(total / (ARROWS * 10) * 100), 8, 100);
          say(`けっか: ${total}てん / ${ARROWS * 10}`, 2000);
          render(performance.now());
          setTimeout(() => onComplete(score), 900);
        }
        newRound();
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const SWIPE_THROW_VARIANTS = [
    mg('bowling-3d', makeBowlingGame({ title: 'ボウリング!スワイプで なげて ストライクを ねらえ' })),
    mg('archery-3d', makeArcheryGame({ title: 'アーチェリー!かぜを よんで まとの まんなかへ' })),
  ];

  // --- パワーメーター2だんかい(ゴルフ・ダーツ・アーチェリー) ---
  // 1かいめの タップで「パワー」、2かいめの タップで「せいかくさ」を
  // それぞれ うごく バーを とめて きめる、2だんかいの タイミングゲーム
  function makePowerMeterGame({ title, icon }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const speed = lerp(1.3, 2.1, difficulty);
        let stage = 'power';
        let powerValue = 0;
        let running = true;
        let t0 = performance.now();
        let rafId;

        container.innerHTML = `
          <div class="mg-title">${title}</div>
          ${icon ? `<div class="mg-timing-icon">${icon}</div>` : ''}
          <div class="mg-hint" id="mgPowerHint">パワーを ちょうせつしよう(1かいめ)</div>
          <div class="mg-gauge" id="mgGauge" style="background:#e879b0">
            <div class="mg-gauge-zone" style="left:35%;width:30%"></div>
            <div class="mg-gauge-marker" id="mgMarker"></div>
          </div>
          <button class="mg-tap-btn" id="mgPowerBtn">とめる!</button>
        `;
        const markerEl = container.querySelector('#mgMarker');
        const hintEl = container.querySelector('#mgPowerHint');
        const btn = container.querySelector('#mgPowerBtn');
        let pct = 0, dir = 1;

        function frame(now) {
          if (!running) return;
          const dt = (now - t0) / 1000;
          t0 = now;
          pct += dir * speed * 60 * dt;
          if (pct >= 100) { pct = 100; dir = -1; }
          if (pct <= 0) { pct = 0; dir = 1; }
          markerEl.style.left = pct + '%';
          rafId = requestAnimationFrame(frame);
        }

        function stop() {
          if (!running) return;
          if (stage === 'power') {
            powerValue = pct;
            stage = 'accuracy';
            hintEl.textContent = 'こんどは せいかくさを ねらおう(2かいめ)';
            pct = 0; dir = 1;
          } else {
            running = false;
            cancelAnimationFrame(rafId);
            btn.disabled = true;
            const powerScore = 100 - Math.abs(powerValue - 50) * 2;
            const accuracyScore = 100 - Math.abs(pct - 50) * 2;
            const total = Math.round(clamp((powerScore + accuracyScore) / 2, 0, 100));
            // 2かいめの 操作の あとに なにも 見せずに おわらせない よう、
            // てんすうに おうじた みじかい けっかを ひょうじしてから すすむ
            const resultLabel = total >= 80 ? 'ナイス!' : total >= 50 ? 'おしい!' : 'もうすこし!';
            hintEl.textContent = `${icon || ''} ${resultLabel}`.trim();
            hintEl.classList.add(total >= 80 ? 'mg-reveal-correct' : total >= 50 ? '' : 'mg-reveal-incorrect');
            setTimeout(() => onComplete(total), 650);
          }
        }
        btn.addEventListener('pointerdown', stop);
        rafId = requestAnimationFrame(frame);
      },
    };
  }

  const POWER_METER_VARIANTS = [
    mg('powerMeter-themed', randomThemeGame(makePowerMeterGame, [
      { title: 'ゴルフふう!パワーと せいかくさを あわせよう', icon: '⛳' },
      { title: 'ダーツふう!まんなかを ねらおう', icon: '🎯' },
      { title: 'アーチェリーふう!ゆみを いてみよう', icon: '🏹' },
    ])),
  ];

  // --- おしくらまんじゅう(すもうふう つなひき) ---
  // れんだタップで じぶんの バーを おして、あいてに かとう
  function makePushContestGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = 5500;
        const rivalPushMs = lerp(420, 260, difficulty);
        let position = 50; // 0=あいての かち、100=じぶんの かち
        let finished = false;
        let running = true;
        let rivalTimer;
        // スタートゆうよちゅうは あいても タイマーも うごかさない(セクション2)
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;

        container.innerHTML = `
          <div class="mg-header"><span id="mgTimer">残り: 6s</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-push-bar-wrap">
            <span class="mg-push-side">🧑</span>
            <div class="mg-push-bar"><div class="mg-push-fill" id="mgPushFill" style="width:50%"></div></div>
            <span class="mg-push-side">🐘</span>
          </div>
          <button class="mg-tap-btn" id="mgPushBtn">おす!</button>
        `;
        const fillEl = container.querySelector('#mgPushFill');
        const btn = container.querySelector('#mgPushBtn');
        const timerEl = container.querySelector('#mgTimer');

        function updateBar() {
          fillEl.style.width = position + '%';
        }

        function finish(won) {
          if (finished) return;
          finished = true;
          running = false;
          clearInterval(rivalTimer);
          btn.disabled = true;
          const score = won ? 100 : Math.round(clamp(position, 0, 60));
          setTimeout(() => onComplete(score), 400);
        }

        btn.addEventListener('pointerdown', () => {
          if (finished || performance.now() < startTime) return;
          position = clamp(position + 6, 0, 100);
          updateBar();
          if (position >= 100) finish(true);
        });

        setTimeout(() => {
          if (finished) return;
          rivalTimer = setInterval(() => {
            if (finished) return;
            position = clamp(position - 4, 0, 100);
            updateBar();
            if (position <= 0) finish(false);
          }, rivalPushMs);
        }, MG_ACTION_START_GRACE_MS);

        const tick = setInterval(() => {
          if (!running) { clearInterval(tick); return; }
          const remaining = Math.max(0, Math.min(DURATION_MS, DURATION_MS - (performance.now() - startTime)));
          timerEl.textContent = `残り: ${Math.ceil(remaining / 1000)}s`;
          if (remaining <= 0) { clearInterval(tick); finish(position >= 50); }
        }, 200);
      },
    };
  }

  const PUSH_CONTEST_VARIANTS = [
    mg('pushContest-sumo', makePushContestGame({ title: 'すもうふう!おしくらまんじゅうで かとう' })),
  ];

  // --- スワイプで やさいを きる(りょうり) ---
  function makeChopGame({ title, veggieEmojis }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = 6000;
        const neededChops = Math.round(lerp(6, 10, difficulty));
        let chops = 0;
        let running = true;
        // スタートゆうよちゅうは タイマーを すすめない(セクション2)
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgTimer">残り: 6s</span>
            <span id="mgScore">きった かず: 0/${neededChops}</span>
          </div>
          <div class="mg-title">${title}</div>
          <div class="mg-chop-board" id="mgChopBoard">
            <span class="mg-chop-veggie" id="mgChopVeggie">${veggieEmojis[0]}</span>
            <span class="mg-chop-knife" id="mgChopKnife">🔪</span>
          </div>
          <div class="mg-hint">したに スワイプして きろう!</div>
        `;
        const board = container.querySelector('#mgChopBoard');
        const veggieEl = container.querySelector('#mgChopVeggie');
        const knifeEl = container.querySelector('#mgChopKnife');
        const scoreEl = container.querySelector('#mgScore');
        const timerEl = container.querySelector('#mgTimer');
        let startY = 0, tracking = false;

        board.addEventListener('pointerdown', (e) => { tracking = true; startY = e.clientY; });
        board.addEventListener('pointerup', (e) => {
          if (!tracking || !running || performance.now() < startTime) return;
          tracking = false;
          const dy = e.clientY - startY;
          if (dy < 30) return;
          chops += 1;
          scoreEl.textContent = `きった かず: ${chops}/${neededChops}`;
          knifeEl.classList.add('chopping');
          veggieEl.textContent = veggieEmojis[chops % veggieEmojis.length];
          setTimeout(() => knifeEl.classList.remove('chopping'), 150);
          if (chops >= neededChops) end(100);
        });

        const tick = setInterval(() => {
          if (!running) { clearInterval(tick); return; }
          const remaining = Math.max(0, Math.min(DURATION_MS, DURATION_MS - (performance.now() - startTime)));
          timerEl.textContent = `残り: ${Math.ceil(remaining / 1000)}s`;
          if (remaining <= 0) { clearInterval(tick); end(Math.round((chops / neededChops) * 90)); }
        }, 200);

        function end(score) {
          if (!running) return;
          running = false;
          onComplete(clamp(score, 0, 100));
        }
      },
    };
  }

  const CHOP_GAME_VARIANTS = [
    mg('chop-vegetable', makeChopGame({ title: 'やさいを どんどん きろう!', veggieEmojis: ['🥕', '🥦', '🌽', '🍅', '🥒'] })),
  ];

  // --- ステルス(みはりの すきを ついて すすむ) ---
  // みはり役が「そっぽを むいている あいだ」だけ「すすむ」ボタンを
  // おして よい。みはりが こっちを むいている ときに おすと つかまって
  // しまう。ホラーふう・コメディふうにも おなじ しくみを つかいまわす
  function makeStealthGame({ title, guardEmoji, safeMessage, dangerMessage }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const stepsNeeded = 6;
        const minMs = lerp(700, 450, difficulty);
        const maxMs = lerp(1300, 800, difficulty);
        let progress = 0;
        let facingAway = true;
        let finished = false;
        let switchTimer;

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgScore">${progress}/${stepsNeeded}</span>
          </div>
          <div class="mg-title">${title}</div>
          <div class="mg-stealth-field" id="mgStealthField">
            <span class="mg-stealth-guard" id="mgStealthGuard">${guardEmoji}</span>
            <span class="mg-stealth-status" id="mgStealthStatus">${safeMessage}</span>
          </div>
          <button class="mg-tap-btn" id="mgStealthBtn">すすむ!</button>
        `;
        const guardEl = container.querySelector('#mgStealthGuard');
        const statusEl = container.querySelector('#mgStealthStatus');
        const scoreEl = container.querySelector('#mgScore');
        const btn = container.querySelector('#mgStealthBtn');

        let flippedAt = 0;
        function scheduleSwitch(delay) {
          clearTimeout(switchTimer);
          switchTimer = setTimeout(() => {
            facingAway = !facingAway;
            flippedAt = performance.now();
            guardEl.classList.toggle('facing-you', !facingAway);
            statusEl.textContent = facingAway ? safeMessage : dangerMessage;
            scheduleSwitch();
          }, delay != null ? delay : minMs + Math.random() * (maxMs - minMs));
        }
        // なにも しないまま ながく なったら、そこまでの しんちょくで おわる
        const giveUpTimer = setTimeout(() => { if (!finished) finish(true); }, 40000);

        function finish(caught) {
          if (finished) return;
          finished = true;
          clearTimeout(switchTimer);
          clearTimeout(giveUpTimer);
          btn.disabled = true;
          const score = caught ? Math.round((progress / stepsNeeded) * 55) : 100;
          setTimeout(() => onComplete(score), 400);
        }

        btn.dataset.key = 'action';
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          if (finished) return;
          // ふりむいた ちょくごの 150msだけは「まにあった」あつかいに して、
          // にんげんの はんのう時間より みじかい きりかえで いきなり おわらない ようにする
          if (!facingAway && performance.now() - flippedAt > 150) { finish(true); return; }
          progress += 1;
          scoreEl.textContent = `${progress}/${stepsNeeded}`;
          if (progress >= stepsNeeded) finish(false);
        });

        scheduleSwitch(MG_ACTION_START_GRACE_MS + minMs);
      },
    };
  }

  const STEALTH_GAME_VARIANTS = [
    mg('stealth-themed', randomThemeGame(makeStealthGame, [
      { title: 'みはりの すきを ついて すすもう!', guardEmoji: '💂', safeMessage: '👀 いま すすめる!', dangerMessage: '🚨 みつかる!とまれ!' },
      { title: 'ねている あいてを おこさず れいぞうこを あけよう!', guardEmoji: '😴', safeMessage: '😴 ぐっすり ねてる…', dangerMessage: '👀 おきそう!とまれ!' },
      { title: 'ゆうれいに 見つからないように にげよう!(こわくないよ)', guardEmoji: '👻', safeMessage: '🌙 よそ みてる…', dangerMessage: '😱 こっちを 見た!とまれ!' },
    ])),
  ];

  // --- ルーレット(ゲームセンター・ぎゃんぶるふう) ---
  // わくが じゅんばんに ひかり、すきな タイミングで「ストップ!」を
  // おして とめる。げんじつの おかね・かきんとは むかんけいの あそび
  function makeRouletteGame({ title, slots }) {
    return {
      start(container, onComplete) {
        let index = 0;
        let stopped = false;
        let spinInterval;
        const intervalMs = 140;

        container.innerHTML = `
          <div class="mg-title">${title}</div>
          <div class="mg-roulette-row" id="mgRouletteRow">
            ${slots.map((s, i) => `<span class="mg-roulette-slot" data-i="${i}">${s.emoji}</span>`).join('')}
          </div>
          <button class="mg-tap-btn" id="mgRouletteStopBtn">ストップ!</button>
        `;
        const slotEls = Array.from(container.querySelectorAll('.mg-roulette-slot'));
        const stopBtn = container.querySelector('#mgRouletteStopBtn');

        function highlight() {
          slotEls.forEach((el, i) => el.classList.toggle('active', i === index));
        }
        highlight();
        spinInterval = setInterval(() => {
          index = (index + 1) % slots.length;
          highlight();
        }, intervalMs);

        stopBtn.addEventListener('pointerdown', () => {
          if (stopped) return;
          stopped = true;
          clearInterval(spinInterval);
          stopBtn.disabled = true;
          const outcome = slots[index];
          const resultEl = document.createElement('div');
          resultEl.className = 'mg-swipe-result';
          resultEl.textContent = outcome.label;
          container.appendChild(resultEl);
          setTimeout(() => onComplete(outcome.score), 700);
        });
      },
    };
  }

  const ROULETTE_VARIANTS = [
    mg('roulette-classic', makeRouletteGame({
      title: 'ルーレットストップ!すきな タイミングで とめよう',
      slots: [
        { emoji: '🍒', label: 'あたり!', score: 70 },
        { emoji: '🔔', label: 'ちいさな あたり', score: 45 },
        { emoji: '💎', label: 'だいとうしょう!!', score: 100 },
        { emoji: '⭐', label: 'ちいさな あたり', score: 45 },
        { emoji: '❌', label: 'はずれ…', score: 15 },
        { emoji: '🍀', label: 'ラッキー!', score: 65 },
      ],
    })),
  ];

  // --- ブロックくずしふう(レトロゲーム風) ---
  // なつかしい こていがめん アクションの「パドルで ボールを はねかえして
  // ブロックを くずす」あそびごこちを モチーフにした オマージュ。パドルは
  // ◀▶ボタンで うごかす(スマホでも あんていして そうさできる ように)
  function makeBreakoutGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = 15000;
        const ballSpeed = lerp(46, 62, difficulty);
        const cols = 4, rows = 2;
        const blocks = [];
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) blocks.push({ r, c, alive: true });
        let paddleX = 50;
        const paddleWidth = 30;
        let ballX = 50, ballY = 70, vx = 0.6, vy = -1;
        let running = true;
        let cleared = false;
        let rafId;
        let lastFrame = null;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgTimer">残り: 15s</span>
            <span id="mgScore">ブロック: 0/${blocks.length}</span>
          </div>
          <div class="mg-title">${title}</div>
          <div class="mg-breakout-field" id="mgBreakoutField">
            <div class="mg-breakout-blocks" id="mgBreakoutBlocks"></div>
            <span class="mg-breakout-ball" id="mgBreakoutBall"></span>
            <div class="mg-breakout-paddle" id="mgBreakoutPaddle"></div>
          </div>
          <div class="mg-dpad-mid">
            <button class="mg-tap-btn" id="mgBreakoutLeft" data-hold="fast" data-key="left">◀</button>
            <button class="mg-tap-btn" id="mgBreakoutRight" data-hold="fast" data-key="right">▶</button>
          </div>
          <div class="mg-hint" id="mgBreakoutHint"></div>
        `;
        const blocksEl = container.querySelector('#mgBreakoutBlocks');
        const ballEl = container.querySelector('#mgBreakoutBall');
        const paddleEl = container.querySelector('#mgBreakoutPaddle');
        const scoreEl = container.querySelector('#mgScore');
        const timerEl = container.querySelector('#mgTimer');
        const hintEl = container.querySelector('#mgBreakoutHint');

        function renderBlocks() {
          blocksEl.innerHTML = blocks.map((b) => `<div class="mg-breakout-block ${b.alive ? '' : 'gone'}" style="left:${(b.c / cols) * 100}%;top:${(b.r / rows) * 42}%;width:${100 / cols}%;height:20%;"></div>`).join('');
        }
        renderBlocks();

        function setPaddle(x) {
          paddleX = clamp(x, paddleWidth / 2, 100 - paddleWidth / 2);
          paddleEl.style.left = paddleX + '%';
          paddleEl.style.width = paddleWidth + '%';
        }
        setPaddle(paddleX);
        container.querySelector('#mgBreakoutLeft').addEventListener('pointerdown', (e) => { e.preventDefault(); setPaddle(paddleX - (e.mgSynthetic ? 4 : 12)); });
        container.querySelector('#mgBreakoutRight').addEventListener('pointerdown', (e) => { e.preventDefault(); setPaddle(paddleX + (e.mgSynthetic ? 4 : 12)); });
        // フィールド上を直接なぞってもパドルがついてくる。スマホではこちらを主操作にする。
        const movePaddleFromPointer = (e) => {
          if (e.preventDefault) e.preventDefault();
          const rect = container.querySelector('#mgBreakoutField').getBoundingClientRect();
          setPaddle(((e.clientX - rect.left) / rect.width) * 100);
        };
        container.querySelector('#mgBreakoutField').addEventListener('pointerdown', movePaddleFromPointer);
        container.querySelector('#mgBreakoutField').addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') movePaddleFromPointer(e); });
        hintEl.textContent = '下のバーを左右になぞって ボールを はねかえそう!';

        let broken = 0;
        function frame(now) {
          if (!running) return;
          if (now < startTime) { rafId = requestAnimationFrame(frame); return; }
          if (lastFrame === null) lastFrame = now;
          const dt = Math.min(0.05, (now - lastFrame) / 1000);
          lastFrame = now;
          ballX += vx * ballSpeed * dt;
          ballY += vy * ballSpeed * dt;
          if (ballX <= 2 || ballX >= 98) vx *= -1;
          if (ballY <= 2) vy = Math.abs(vy);
          // パドルとの あたり判定
          if (ballY >= 88 && ballY <= 94 && Math.abs(ballX - paddleX) <= paddleWidth / 2) {
            vy = -Math.abs(vy);
            vx = clamp((ballX - paddleX) / (paddleWidth / 2), -1, 1) * 0.9;
          }
          // ブロックとの あたり判定
          blocks.forEach((b) => {
            if (!b.alive) return;
            const bx = (b.c / cols) * 100 + (100 / cols) / 2;
            const by = (b.r / rows) * 42 + 10;
            if (Math.abs(ballX - bx) < (100 / cols) / 2 && Math.abs(ballY - by) < 10) {
              b.alive = false;
              broken += 1;
              vy *= -1;
              scoreEl.textContent = `ブロック: ${broken}/${blocks.length}`;
              renderBlocks();
            }
          });
          ballEl.style.left = ballX + '%';
          ballEl.style.top = ballY + '%';

          const remaining = Math.max(0, DURATION_MS - (now - startTime));
          timerEl.textContent = `残り: ${Math.ceil(remaining / 1000)}s`;

          if (broken >= blocks.length) { cleared = true; end('clear'); return; }
          if (ballY >= 100) { end('dropped'); return; }
          if (remaining <= 0) { end('timeout'); return; }
          rafId = requestAnimationFrame(frame);
        }

        function end(reason) {
          if (!running) return;
          running = false;
          cancelAnimationFrame(rafId);
          const score = cleared ? 100 : Math.round((broken / blocks.length) * 90);
          // とつぜん がめんが とじたように 見えない よう、おわった りゆうを
          // みじかく 見せてから onComplete する
          const label = reason === 'clear' ? 'クリア! 🎉' : reason === 'timeout' ? 'タイムアップ!' : 'ボールが おちた…';
          hintEl.textContent = label;
          hintEl.classList.add(reason === 'clear' ? 'mg-reveal-correct' : 'mg-reveal-incorrect');
          setTimeout(() => onComplete(score), 650);
        }

        rafId = requestAnimationFrame(frame);
      },
    };
  }

  const BREAKOUT_VARIANTS = [
    mg('breakout-classic', makeBreakoutGame({ title: 'ブロックくずしふう!ぜんぶ くずそう' })),
  ];

  // --- スポーツスイング(PK・バッティング・シュート・テニス・たっきゅう・バレー) ---
  // しょうがいぶつジャンプ(makeJumpGame)と おなじ「せまってくる ものを
  // タイミングよく さばく」CSSアニメーションの しくみを つかいまわしつつ、
  // スポーツごとの きょうぎじょう・かけごえを つけて ジャンルを 見わけやすくした
  function makeSportsSwingGame({ title, fieldEmoji, ballEmoji, tapLabel, successLabel, missLabel }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const ROUNDS = 3;
        const cycleMs = lerp(1300, 850, difficulty);
        const windowMs = lerp(480, 260, difficulty);
        // jump/runnerと おなじく、判定が おわった あとに だけ「ボールが
        // プレイヤーの したを とおりすぎて 画面外へ ぬける」えんしゅつを
        // つけたす ための みため専用の ついか時間(セクション6)。判定した
        // しゅんかんに ボールが 消える ことが ないようにする
        const EXIT_MS = 260;
        let round = 0;
        let success = 0;
        let inWindow = false;
        let running = true;
        let windowOpenTimeout, windowCloseTimeout, exitTimeout, nextTimeout;

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgRound">1/${ROUNDS}</span>
            <span id="mgScore">せいこう: 0</span>
          </div>
          <div class="mg-title">${title}</div>
          <div class="mg-sports-field">
            <span class="mg-sports-goal">${fieldEmoji}</span>
            <span class="mg-sports-ball hidden" id="mgSportsBall">${ballEmoji}</span>
          </div>
          <button class="mg-tap-btn" id="mgSportsBtn" disabled>${tapLabel}</button>
        `;
        const ballEl = container.querySelector('#mgSportsBall');
        const btn = container.querySelector('#mgSportsBtn');
        const roundEl = container.querySelector('#mgRound');
        const scoreEl = container.querySelector('#mgScore');

        function spawn() {
          if (!running) return;
          inWindow = false;
          ballEl.classList.remove('hidden');
          ballEl.style.animation = 'none';
          void ballEl.offsetWidth;
          ballEl.style.animation = `mg-jump-approach ${cycleMs}ms linear`;
          btn.disabled = false;
          const windowStart = Math.max(0, cycleMs - windowMs);
          windowOpenTimeout = setTimeout(() => { inWindow = true; }, windowStart);
          windowCloseTimeout = setTimeout(() => resolveRound(false), cycleMs);
        }

        function resolveRound(hit) {
          clearTimeout(windowCloseTimeout);
          btn.disabled = true;
          inWindow = false;
          if (hit) success += 1;
          scoreEl.textContent = `せいこう: ${success}`;
          const hintEl = container.querySelector('.mg-hint');
          if (hintEl) hintEl.textContent = hit ? `⭕ ${successLabel}` : `❌ ${missLabel}`;
          round += 1;
          // 判定は ここで かくてい するが、ボールは そくじに 消さず、
          // のこりの うごきを さいごまで 見せてから きえる えんしゅつを
          // つける(PR#87の jump/runnerと おなじ パターン)
          ballEl.style.animation = 'none';
          void ballEl.offsetWidth;
          ballEl.style.animation = `mg-jump-exit ${EXIT_MS}ms linear`;
          exitTimeout = setTimeout(() => {
            ballEl.classList.add('hidden');
          }, EXIT_MS);
          if (round >= ROUNDS) {
            nextTimeout = setTimeout(end, EXIT_MS + 400);
          } else {
            nextTimeout = setTimeout(() => {
              roundEl.textContent = `${round + 1}/${ROUNDS}`;
              spawn();
            }, EXIT_MS + 350);
          }
        }

        btn.addEventListener('pointerdown', () => {
          if (!running || btn.disabled) return;
          clearTimeout(windowOpenTimeout);
          resolveRound(inWindow);
        });

        function end() {
          if (!running) return;
          running = false;
          clearTimeout(windowOpenTimeout);
          clearTimeout(windowCloseTimeout);
          clearTimeout(exitTimeout);
          clearTimeout(nextTimeout);
          const score = Math.round((success / ROUNDS) * 100);
          onComplete(score);
        }

        // がめん表示ちょくごに いきなり ボールが とんでこない ように、
        // さいしょの 1こだけ すこし ながめの ゆうよを おく(セクション2)
        nextTimeout = setTimeout(spawn, MG_ACTION_START_GRACE_MS);
      },
    };
  }

  // サッカー/やきゅう/バスケ/テニス/たっきゅう/バレーは、すべて おなじ
  // 「タイミングよく ボタンを おす」判定ロジック(makeSportsSwingGame)を
  // つかう テーマちがいと はんだんし、BOX_PICK と おなじ かんがえかたで
  // randomThemeGame に とうごうしてある(6テーマ じたいは のこる)
  const SPORTS_SWING_THEMES = [
    { title: 'サッカーPK!タイミングよく けろう', fieldEmoji: '🥅', ballEmoji: '⚽', tapLabel: 'シュート!', successLabel: 'ゴール!', missLabel: 'はずれた…' },
    { title: 'やきゅうバッティング!ジャストミートを ねらえ', fieldEmoji: '⚾', ballEmoji: '⚾', tapLabel: 'スイング!', successLabel: 'ヒット!', missLabel: 'くうぶり…' },
    { title: 'バスケシュート!リングを ねらおう', fieldEmoji: '🏀', ballEmoji: '🏀', tapLabel: 'シュート!', successLabel: 'ゴール!', missLabel: 'リングに あたった…' },
    { title: 'テニスふう!ジャストヒットを ねらえ', fieldEmoji: '🎾', ballEmoji: '🎾', tapLabel: 'スイング!', successLabel: 'ナイスショット!', missLabel: 'アウト…' },
    { title: 'たっきゅうふう!タイミングよく かえそう', fieldEmoji: '🏓', ballEmoji: '🏓', tapLabel: 'かえす!', successLabel: 'ナイスリターン!', missLabel: 'かえせなかった…' },
    { title: 'バレーふう!スパイクを きめよう', fieldEmoji: '🏐', ballEmoji: '🏐', tapLabel: 'スパイク!', successLabel: 'きまった!', missLabel: 'ネットに かかった…' },
  ];
  const SPORTS_SWING_VARIANTS = [mg('sportsSwing-themed', randomThemeGame(makeSportsSwingGame, SPORTS_SWING_THEMES))];

  // ================================================================
  // 第3段階B: 「あたらしい 操作たいけん」を もつ ミニゲーム7しゅるい
  // ここから したは、既存の絵柄違い水増しとは ちがい、いままで なかった
  // 操作(ドラッグ&ドロップ/まちぶせ→はんのう/れんぞくステアリング/
  // タイミング→バランスの2だんかい/てふだ判断/2だんかい探索)を
  // ついかする。既存の抽選・アンチリピート・履歴永続化のしくみには
  // いっさい 手を くわえていない
  // ================================================================

  // --- ドラッグ&ドロップ きょうつうエンジン(ケーキ/おべんとうで つかう) ---
  // pointerdown した ようそを ゆびに ついて うごかす。position:fixed +
  // clientX/clientYを そのまま つかう ため、ページの スクロールりょうに
  // えいきょうされない。pointerup/pointercancel の どちらでも かならず
  // ドラッグを おわらせ、onDropがfalseを かえした ときは もとの いちへ
  // もどす(ドラッグに しっぱいしても やりなおせる、こどもに やさしい仕様)
  function enableDragItem(itemEl, onDrop) {
    let dragging = false;
    let originLeft = '', originTop = '', originPosition = '';
    function place(x, y) {
      const w = parseFloat(itemEl.style.width) || itemEl.offsetWidth;
      const h = parseFloat(itemEl.style.height) || itemEl.offsetHeight;
      itemEl.style.left = (x - w / 2) + 'px';
      itemEl.style.top = (y - h / 2) + 'px';
    }
    function onPointerDown(e) {
      if (dragging || itemEl.classList.contains('placed')) return;
      e.preventDefault();
      dragging = true;
      try { itemEl.setPointerCapture(e.pointerId); } catch (err) { /* iOS Safariの ふるいばあいも あるので しっぱいは むし */ }
      const rect = itemEl.getBoundingClientRect();
      originLeft = itemEl.style.left;
      originTop = itemEl.style.top;
      originPosition = itemEl.style.position;
      itemEl.style.width = rect.width + 'px';
      itemEl.style.height = rect.height + 'px';
      itemEl.style.position = 'fixed';
      itemEl.classList.add('dragging');
      place(e.clientX, e.clientY);
    }
    function restore() {
      itemEl.style.position = originPosition;
      itemEl.style.left = originLeft;
      itemEl.style.top = originTop;
      itemEl.style.width = '';
      itemEl.style.height = '';
    }
    function onPointerMove(e) {
      if (!dragging) return;
      e.preventDefault();
      place(e.clientX, e.clientY);
    }
    function endDrag(e) {
      if (!dragging) return;
      e.preventDefault();
      dragging = false;
      itemEl.classList.remove('dragging');
      const handled = onDrop(e.clientX, e.clientY, itemEl);
      if (!handled) restore();
    }
    function cancelDrag() {
      if (!dragging) return;
      dragging = false;
      itemEl.classList.remove('dragging');
      restore();
    }
    itemEl.addEventListener('pointerdown', onPointerDown);
    itemEl.addEventListener('pointermove', onPointerMove);
    itemEl.addEventListener('pointerup', endDrag);
    itemEl.addEventListener('pointercancel', cancelDrag);
  }

  function isPointInsideEl(el, x, y) {
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  // --- 1. ケーキデコレーション(しじされた いちへ ドラッグして おく) ---
  // トッピングを ゆびで つまんで、ケーキ上の しじされた いちへ ドラッグする
  // はじめての「ほんものの ドラッグ&ドロップ」ミニゲーム。1かいに 1しゅるい
  // だけを ハイライトし、まちがえても なにも おこらず やりなおせる
  function makeCakeDecorateGame({ title }) {
    return {
      start(container, onComplete) {
        const ROUNDS_DEF = [
          { key: 'strawberry', emoji: '🍓', label: 'いちご', left: 26, top: 34 },
          { key: 'choco', emoji: '🍫', label: 'チョコ', left: 50, top: 20 },
          { key: 'cherry', emoji: '🍒', label: 'さくらんぼ', left: 74, top: 34 },
        ];
        // ドラッグして かんがえる 時間を たっぷり かくほ(セクション9)
        const TIME_LIMIT_MS = 16000;
        let roundIndex = 0;
        let placedCount = 0;
        let finished = false;
        let timer;
        container.innerHTML = `
          <div class="mg-header"><span id="mgScore">${placedCount}/${ROUNDS_DEF.length}</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-cake-stage" id="mgCakeStage">
            <div class="mg-cake-base">🍰</div>
            ${ROUNDS_DEF.map((r) => `<div class="mg-drop-target" data-key="${r.key}" style="left:${r.left}%;top:${r.top}%"></div>`).join('')}
          </div>
          <div class="mg-hint" id="mgHint"></div>
          <div class="mg-drag-tray" id="mgTray">
            ${ROUNDS_DEF.map((r) => `<div class="mg-drag-item" data-key="${r.key}">${r.emoji}</div>`).join('')}
          </div>
        `;
        const hintEl = container.querySelector('#mgHint');
        const scoreEl = container.querySelector('#mgScore');
        const targets = Array.from(container.querySelectorAll('.mg-drop-target'));
        const items = Array.from(container.querySelectorAll('.mg-drag-item'));

        function currentRound() { return ROUNDS_DEF[roundIndex]; }
        function updateHint() {
          const r = currentRound();
          if (r) hintEl.textContent = `${r.label}を ここに おいてね!`;
          targets.forEach((t) => t.classList.toggle('active', !!r && t.dataset.key === r.key));
        }
        updateHint();

        function finish(score) {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          onComplete(score);
        }

        items.forEach((itemEl) => {
          enableDragItem(itemEl, (x, y) => {
            if (finished) return true;
            const round = currentRound();
            if (!round || itemEl.dataset.key !== round.key) return false;
            const target = targets.find((t) => t.dataset.key === round.key);
            if (!target || !isPointInsideEl(target, x, y)) return false;
            itemEl.classList.add('placed');
            itemEl.style.opacity = '0';
            itemEl.style.pointerEvents = 'none';
            target.classList.remove('active');
            target.classList.add('filled');
            target.textContent = itemEl.textContent;
            placedCount += 1;
            scoreEl.textContent = `${placedCount}/${ROUNDS_DEF.length}`;
            roundIndex += 1;
            if (placedCount >= ROUNDS_DEF.length) {
              hintEl.textContent = 'さいごの ひとつを おいて、ケーキが できた! 🎂';
              finish(100);
            } else {
              updateHint();
            }
            return true;
          });
        });

        timer = setTimeout(() => {
          finish(Math.round((placedCount / ROUNDS_DEF.length) * 100));
        }, TIME_LIMIT_MS);
      },
    };
  }

  // --- 2. おべんとうづくり(見本を おぼえて おなじ はいちに もどす) ---
  // ケーキと おなじ ドラッグエンジンを つかいまわすが、かちはい判定は
  // まったく べつもの:さいしょに 見本を みじかく 見せてから かくし、
  // プレイヤーは「しじされた いち」ではなく「じぶんの きおく」だけを
  // たよりに もとの はいちを さいげんする(配置精度のケーキ vs
  // 記憶+ドラッグの おべんとう、で ルールを 差別化している)
  function makeBentoBoxGame({ title }) {
    return {
      start(container, onComplete) {
        const ITEMS_DEF = [
          { key: 'rice', emoji: '🍙', left: 26, top: 30 },
          { key: 'egg', emoji: '🥚', left: 74, top: 30 },
          { key: 'shrimp', emoji: '🍤', left: 26, top: 68 },
          { key: 'broccoli', emoji: '🥦', left: 74, top: 68 },
        ];
        const PREVIEW_MS = 2200;
        const TIME_LIMIT_MS = 11000;
        let placedCount = 0;
        let finished = false;
        let timer;
        container.innerHTML = `
          <div class="mg-header"><span id="mgScore">見本を おぼえてね!</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-bento-stage" id="mgBentoStage">
            ${ITEMS_DEF.map((it) => `<div class="mg-drop-target" data-key="${it.key}" style="left:${it.left}%;top:${it.top}%"></div>`).join('')}
            ${ITEMS_DEF.map((it) => `<div class="mg-bento-preview" style="left:${it.left}%;top:${it.top}%">${it.emoji}</div>`).join('')}
          </div>
          <div class="mg-hint" id="mgHint">見本を おぼえてね!</div>
          <div class="mg-drag-tray hidden" id="mgTray">
            ${ITEMS_DEF.map((it) => `<div class="mg-drag-item" data-key="${it.key}">${it.emoji}</div>`).join('')}
          </div>
        `;
        const hintEl = container.querySelector('#mgHint');
        const scoreEl = container.querySelector('#mgScore');
        const tray = container.querySelector('#mgTray');
        const previews = Array.from(container.querySelectorAll('.mg-bento-preview'));
        const targets = Array.from(container.querySelectorAll('.mg-drop-target'));
        const items = Array.from(container.querySelectorAll('.mg-drag-item'));
        let timer2;

        function finish(score) {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          clearTimeout(timer2);
          onComplete(score);
        }

        items.forEach((itemEl) => {
          enableDragItem(itemEl, (x, y) => {
            if (finished) return true;
            const target = targets.find((t) => !t.classList.contains('filled') && isPointInsideEl(t, x, y));
            if (!target) return false;
            const correct = target.dataset.key === itemEl.dataset.key;
            target.classList.add('filled', correct ? 'correct' : 'wrong');
            target.textContent = itemEl.textContent;
            itemEl.style.opacity = '0';
            itemEl.style.pointerEvents = 'none';
            if (correct) placedCount += 1;
            scoreEl.textContent = `${placedCount}/${ITEMS_DEF.length}`;
            if (items.every((it) => it.style.pointerEvents === 'none')) {
              hintEl.textContent = placedCount === ITEMS_DEF.length ? 'ぜんぶ つめて、おべんとうが できた! 🍱' : '時間までに ここまで つめられた';
              finish(Math.round((placedCount / ITEMS_DEF.length) * 100));
            }
            return true;
          });
        });

        timer = setTimeout(() => {
          previews.forEach((p) => p.remove());
          tray.classList.remove('hidden');
          hintEl.textContent = 'おぼえた ばしょへ もどそう!';
          timer2 = setTimeout(() => {
            finish(Math.round((placedCount / ITEMS_DEF.length) * 100));
          }, TIME_LIMIT_MS);
        }, PREVIEW_MS);
      },
    };
  }

  const DRAG_DECORATE_VARIANTS = [
    mg('dragDecorate-cake', makeCakeDecorateGame({ title: 'ケーキデコレーション!トッピングを かざろう' })),
    mg('dragDecorate-bento', makeBentoBoxGame({ title: 'おべんとうづくり!見本どおりに つめよう' })),
  ];

  // --- 3. ほんものの さかなつり(まちぶせ→はんのう の あたらしい 操作) ---
  // 既存の「さかなつり」(catchカテゴリ、うごく バスケットで つかまえる)とは
  // まったく べつの 操作。うきを 見つめて まち、あたりが きた しゅんかん
  // だけ タップする「まちぶせ→はんのう」型。うみ地域げんてい

  // --- プレミアム: 3Dふう奥行きゲーム ---
  // CSS perspective + requestAnimationFrame で軽量に奥行きを表現する。
  // 外部3Dライブラリを使わないため、iPhoneでも既存ゲームと同じページ内で遊べる。

  const PERSPECTIVE_3D_VARIANTS = [
    mg('p3-space', makeRoadGame({ title: '3Dうちゅうフライト!ほしを あつめて いんせきを よけよう', goodItems: ['⭐', '🌟', '💫', '🪙'], badItems: ['☄️', '🪨', '🛰️', '👾'], scene: 'space', playerEmoji: '🚀' })),
    mg('p3-drive', makeRoadGame({ title: '3Dハイウェイ!コインを ひろって くるまを よけよう', goodItems: ['🪙', '💎', '⛽', '🍔'], badItems: ['🚙', '🚚', '🚧', '🛢️'], scene: 'highway', playerEmoji: '🏎️' })),
  ];

  // --- 3D レイキャスト ビュー(おばけ屋敷・ダンジョン きょうつう) ---
  // 外部ライブラリなしの canvas 2D で、マス目の めいろを 一人称の 3Dに
  // 描く。かべは きょりで くらくなり、スプライト(かぎ・ゆうれい・宝箱)は
  // Zバッファで かべの うしろに かくれる
  function createRaycastView(ctx, W, H, theme) {
    const FOV = 1.15;
    const focal = (W / 2) / Math.tan(FOV / 2);
    const COL = 2;
    const cols = Math.ceil(W / COL);
    const zbuf = new Float32Array(cols);
    const horizon = H * 0.5;
    const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    const wallA = rgb(theme.wallA), wallB = rgb(theme.wallB);
    const shade = (c, k) => `rgb(${(c[0] * k) | 0},${(c[1] * k) | 0},${(c[2] * k) | 0})`;
    function render(map, px, py, ang, sprites, opts = {}) {
      if (!ctx) return;
      const rows = map.length, mapCols = map[0].length;
      const cg = ctx.createLinearGradient(0, 0, 0, horizon);
      cg.addColorStop(0, theme.ceilingTop); cg.addColorStop(1, theme.ceilingBottom);
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, horizon);
      const fg = ctx.createLinearGradient(0, horizon, 0, H);
      fg.addColorStop(0, theme.floorFar); fg.addColorStop(1, theme.floorNear);
      ctx.fillStyle = fg; ctx.fillRect(0, horizon, W, H - horizon);
      for (let c = 0; c < cols; c++) {
        const sx = (c + 0.5) * COL - W / 2;
        const rayA = ang + Math.atan2(sx, focal);
        const dx = Math.cos(rayA), dy = Math.sin(rayA);
        let mx = Math.floor(px), my = Math.floor(py);
        const ddx = Math.abs(1 / (dx || 1e-9)), ddy = Math.abs(1 / (dy || 1e-9));
        let stepX, stepY, sdx, sdy;
        if (dx < 0) { stepX = -1; sdx = (px - mx) * ddx; } else { stepX = 1; sdx = (mx + 1 - px) * ddx; }
        if (dy < 0) { stepY = -1; sdy = (py - my) * ddy; } else { stepY = 1; sdy = (my + 1 - py) * ddy; }
        let side = 0, dist = 30, guard = 0;
        while (guard++ < 80) {
          if (sdx < sdy) { sdx += ddx; mx += stepX; side = 0; } else { sdy += ddy; my += stepY; side = 1; }
          if (mx < 0 || my < 0 || mx >= mapCols || my >= rows) break;
          if (map[my][mx] === '#') { dist = side === 0 ? sdx - ddx : sdy - ddy; break; }
        }
        const perp = Math.max(0.06, dist * Math.cos(rayA - ang));
        zbuf[c] = perp;
        const lineH = Math.min(H * 6, H * 0.95 / perp);
        const top = horizon - lineH / 2;
        let wallX = side === 0 ? py + dist * dy : px + dist * dx;
        wallX -= Math.floor(wallX);
        const fog = Math.max(0.06, 1 / (1 + perp * perp * (theme.fog || 0.09)));
        ctx.fillStyle = shade(side === 0 ? wallA : wallB, fog);
        ctx.fillRect(c * COL, top, COL + 0.4, lineH);
        if (perp < 6.5) {
          ctx.fillStyle = `rgba(0,0,0,${0.28 * fog})`;
          const bricks = 4;
          for (let k = 1; k < bricks; k++) {
            const yy = top + lineH * k / bricks;
            ctx.fillRect(c * COL, yy, COL + 0.4, Math.max(1, lineH * 0.014));
          }
          const seam = (wallX * 3) % 1;
          if (seam < 0.07) { ctx.fillStyle = `rgba(0,0,0,${0.2 * fog})`; ctx.fillRect(c * COL, top, COL + 0.4, lineH); }
        }
      }
      const list = [];
      for (const s of sprites) {
        const rx = s.x - px, ry = s.y - py;
        const d = Math.hypot(rx, ry);
        let a = Math.atan2(ry, rx) - ang;
        a = Math.atan2(Math.sin(a), Math.cos(a));
        if (Math.abs(a) < FOV / 2 + 0.4 && d > 0.12) list.push({ s, d, a });
      }
      list.sort((p, q) => q.d - p.d);
      for (const o of list) {
        const perp = o.d * Math.cos(o.a);
        if (perp < 0.1) continue;
        const sx = W / 2 + Math.tan(o.a) * focal;
        const c = Math.floor(sx / COL);
        if (c >= 0 && c < cols && zbuf[c] < perp - 0.12) continue;
        const wallH = H * 0.95 / perp;
        const size = wallH * (o.s.scale || 0.55);
        const floorY = horizon + wallH / 2;
        const fog = 1 / (1 + perp * perp * 0.045);
        ctx.globalAlpha = Math.max(0.12, Math.min(1, fog * 1.5)) * (o.s.alpha == null ? 1 : o.s.alpha);
        const lift = (o.s.lift || 0) * wallH;
        if (o.s.glow) { ctx.shadowColor = o.s.glow; ctx.shadowBlur = Math.min(24, size * 0.35); }
        ctx.font = `${Math.max(4, size)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#fff';
        ctx.fillText(o.s.emoji, sx, floorY - lift - size * 0.06);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, opts.vignette || theme.vignette || 'rgba(0,0,0,.5)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
    // 見た ことの ある マスだけを 表示する ミニマップ(右上)
    function drawMinimap(map, px, py, ang, seen, marks) {
      if (!ctx) return;
      const cell = 5, pad = 6;
      const mw = map[0].length * cell, mh = map.length * cell;
      const ox = W - mw - pad, oy = pad;
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.fillRect(ox - 3, oy - 3, mw + 6, mh + 6);
      for (let y = 0; y < map.length; y++) for (let x = 0; x < map[0].length; x++) {
        if (!seen[y][x]) continue;
        ctx.fillStyle = map[y][x] === '#' ? 'rgba(200,200,220,.7)' : 'rgba(70,70,90,.75)';
        ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
      }
      for (const m of marks) {
        if (m.hidden) continue;
        ctx.fillStyle = m.color;
        ctx.beginPath(); ctx.arc(ox + (m.x + 0.5) * cell, oy + (m.y + 0.5) * cell, cell * 0.42, 0, Math.PI * 2); ctx.fill();
      }
      ctx.save();
      ctx.translate(ox + px * cell, oy + py * cell);
      ctx.rotate(ang);
      ctx.fillStyle = '#7dff9a';
      ctx.beginPath(); ctx.moveTo(cell * 0.9, 0); ctx.lineTo(-cell * 0.5, cell * 0.55); ctx.lineTo(-cell * 0.5, -cell * 0.55); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // 目標の ほうこうを しめす コンパス(左上)
    function drawCompass(px, py, ang, tx, ty, label, color) {
      if (!ctx) return;
      const cx = 22, cy = 22, r = 15;
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, Math.PI * 2); ctx.fill();
      const a = Math.atan2(ty - py, tx - px) - ang;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a - Math.PI / 2);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(0, -r + 1); ctx.lineTo(6, 4); ctx.lineTo(0, 1); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
      ctx.fillText(label, cx, cy + r + 9);
    }
    function drawMessage(text, alpha = 1) {
      if (!ctx || !text) return;
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      const w = Math.min(W - 10, ctx.measureText(text).width + 18);
      ctx.fillRect(W / 2 - w / 2, H - 34, w, 24);
      ctx.fillStyle = '#fff'; ctx.fillText(text, W / 2, H - 22);
      ctx.globalAlpha = 1;
    }
    return { render, drawMinimap, drawCompass, drawMessage };
  }
  // まるい あたり判定で かべに めりこまない ように うごく
  function rcMove(map, px, py, dx, dy, r = 0.24) {
    const free = (x, y) => {
      const cx = Math.floor(x), cy = Math.floor(y);
      return cy >= 0 && cx >= 0 && cy < map.length && cx < map[0].length && map[cy][cx] !== '#';
    };
    const ok = (x, y) => free(x - r, y - r) && free(x + r, y - r) && free(x - r, y + r) && free(x + r, y + r);
    if (ok(px + dx, py)) px += dx;
    if (ok(px, py + dy)) py += dy;
    return [px, py];
  }
  // 一人称ゲーム きょうつうの そうさ: ↶ ↑ ↷ ↓ の おしっぱなし + canvasを
  // 左右に ドラッグで むきを かえる + canvasを おさえたままで まえに すすむ
  function bindFirstPersonControls(container, canvas, ids) {
    const s = { left: false, right: false, fwd: false, back: false, touchFwd: false, dragTurn: 0 };
    bindHeldButton(container.querySelector(ids.left), (v) => { s.left = v; });
    bindHeldButton(container.querySelector(ids.right), (v) => { s.right = v; });
    bindHeldButton(container.querySelector(ids.fwd), (v) => { s.fwd = v; });
    if (ids.back) bindHeldButton(container.querySelector(ids.back), (v) => { s.back = v; });
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      drag = { x: e.clientX, id: e.pointerId, moved: 0 };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      s.touchFwd = true;
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x; drag.x = e.clientX; drag.moved += Math.abs(dx);
      s.dragTurn += dx * 0.012;
      if (drag.moved > 16) s.touchFwd = false;
    });
    const end = (e) => { if (!drag || e.pointerId !== drag.id) return; drag = null; s.touchFwd = false; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    return {
      consumeDragTurn() { const t = s.dragTurn; s.dragTurn = 0; return t; },
      turn() { return (s.right ? 1 : 0) - (s.left ? 1 : 0); },
      move() { return (s.fwd || s.touchFwd ? 1 : 0) - (s.back ? 1 : 0); },
    };
  }
  function pickFarCell(map, dists, exclude) {
    let best = null;
    for (let y = 0; y < map.length; y++) for (let x = 0; x < map[0].length; x++) {
      if (map[y][x] === '#') continue;
      if (exclude.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) < 3)) continue;
      const score = Math.min(...dists.map((d) => d[y][x]));
      if (score < 0) continue;
      if (!best || score > best.score) best = { x, y, score };
    }
    return best || { x: 1, y: 1, score: 0 };
  }
  function facingOpenDir(map, x, y) {
    for (const [dx, dy, a] of [[1, 0, 0], [0, 1, Math.PI / 2], [-1, 0, Math.PI], [0, -1, -Math.PI / 2]]) {
      if (map[y + dy] && map[y + dy][x + dx] === '.') return a;
    }
    return 0;
  }
  function markSeen(seen, map, px, py, radius = 2) {
    const cx = Math.floor(px), cy = Math.floor(py);
    for (let y = cy - radius; y <= cy + radius; y++) for (let x = cx - radius; x <= cx + radius; x++) {
      if (y >= 0 && x >= 0 && y < map.length && x < map[0].length) seen[y][x] = true;
    }
  }

  // --- 3Dダンジョン: 一人称で 宝箱を あつめて 出口へ ---
  function makeFirstPersonDungeonGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const COLS = 13, ROWS = 11;
        const map = generateMaze(COLS, ROWS, 3);
        const DURATION_MS = Math.round(lerp(60000, 48000, difficulty));
        const SPEED = 2.4, TURN = 2.5;
        const start = { x: 1, y: 1 };
        const d0 = mazeBfs(map, start.x, start.y);
        const exit = pickFarCell(map, [d0], [start]);
        const chests = [];
        const floorCells = [];
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (map[y][x] === '.' && d0[y][x] >= 4) floorCells.push({ x, y });
        floorCells.sort(() => Math.random() - 0.5);
        for (const c of floorCells) {
          if (chests.length >= 3) break;
          if ([exit, ...chests].some((p) => Math.abs(p.x - c.x) + Math.abs(p.y - c.y) < 4)) continue;
          chests.push({ x: c.x, y: c.y, taken: false });
        }
        const traps = [];
        for (const c of floorCells) {
          if (traps.length >= 2) break;
          if ([exit, ...chests, ...traps].some((p) => Math.abs(p.x - c.x) + Math.abs(p.y - c.y) < 3)) continue;
          traps.push({ x: c.x, y: c.y, cool: 0 });
        }
        const torches = floorCells.filter((c) => ![exit, ...chests, ...traps].some((p) => p.x === c.x && p.y === c.y)).slice(0, 5);
        let px = start.x + 0.5, py = start.y + 0.5, ang = facingOpenDir(map, start.x, start.y);
        let taken = 0, trapHits = 0, running = true, rafId = null, last = null, msg = '', msgUntil = 0, penaltyMs = 0, shake = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        const seen = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
        container.innerHTML = `
          <div class="mg-header"><span id="mgDTimer">のこり: ${Math.ceil(DURATION_MS / 1000)}s</span><span id="mgDTreasure">宝箱 0/3</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="mgDCanvas"></canvas></div>
          <div class="mg-hint" id="mgDHint">↶↷で むきを かえ、↑で すすむ(おしっぱなしOK)。がめんを ドラッグしても 見まわせる</div>
          <div class="mg-fp-controls"><button class="mg-tap-btn" id="mgDTurnL" data-key="left">↶</button><button class="mg-tap-btn primary" id="mgDForward" data-key="up">▲ すすむ</button><button class="mg-tap-btn" id="mgDBack" data-key="down">▼</button><button class="mg-tap-btn" id="mgDTurnR" data-key="right">↷</button></div>`;
        const canvas = container.querySelector('#mgDCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 215);
        const view = createRaycastView(ctx, W, H, { wallA: '#a08462', wallB: '#7d6548', ceilingTop: '#1a1410', ceilingBottom: '#3b2f22', floorFar: '#2a231b', floorNear: '#5a4a35', fog: 0.08 });
        const controls = bindFirstPersonControls(container, canvas, { left: '#mgDTurnL', right: '#mgDTurnR', fwd: '#mgDForward', back: '#mgDBack' });
        const timerEl = container.querySelector('#mgDTimer'), treasureEl = container.querySelector('#mgDTreasure'), hint = container.querySelector('#mgDHint');
        const say = (t, ms = 1400) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        function sprites(now) {
          const bob = Math.sin(now / 300) * 0.03;
          const list = [];
          for (const c of chests) if (!c.taken) list.push({ x: c.x + 0.5, y: c.y + 0.5, emoji: '🧰', scale: 0.5, lift: 0.05 + bob, glow: 'rgba(255,220,120,.9)' });
          for (const t of traps) list.push({ x: t.x + 0.5, y: t.y + 0.5, emoji: '🕳️', scale: 0.55, lift: -0.02 });
          for (const t of torches) list.push({ x: t.x + 0.5, y: t.y + 0.5, emoji: '🕯️', scale: 0.3, lift: 0.35 + bob, glow: 'rgba(255,170,60,.9)' });
          list.push({ x: exit.x + 0.5, y: exit.y + 0.5, emoji: '🚪', scale: 0.85, lift: 0.02, glow: taken >= 3 ? 'rgba(120,255,160,.9)' : undefined });
          return list;
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) {
            ang += controls.turn() * TURN * dt + controls.consumeDragTurn();
            const mv = controls.move() * SPEED * dt;
            if (mv !== 0) [px, py] = rcMove(map, px, py, Math.cos(ang) * mv, Math.sin(ang) * mv);
            markSeen(seen, map, px, py);
            const cx = Math.floor(px), cy = Math.floor(py);
            for (const c of chests) if (!c.taken && c.x === cx && c.y === cy) { c.taken = true; taken++; treasureEl.textContent = '宝箱 ' + taken + '/3'; say(taken >= 3 ? '✨ 宝箱を ぜんぶ あつめた! 出口へ!' : '🧰 宝箱を ゲット! (' + taken + '/3)'); shake = 3; }
            for (const t of traps) { if (t.cool > 0) t.cool -= dt; else if (t.x === cx && t.y === cy) { t.cool = 3; trapHits++; penaltyMs += 4000; shake = 7; say('🕳️ おとしあな! -4びょう'); } }
            if (cx === exit.x && cy === exit.y) { finish(true); return; }
          }
          const rem = Math.max(0, DURATION_MS - Math.max(0, now - startTime) - penaltyMs);
          timerEl.textContent = 'のこり: ' + Math.ceil(rem / 1000) + 's';
          if (rem <= 0) { finish(false); return; }
          if (ctx) {
            ctx.save();
            if (shake > 0) { ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); shake = Math.max(0, shake - 0.5); }
            view.render(map, px, py, ang, sprites(now));
            ctx.restore();
            view.drawMinimap(map, px, py, ang, seen, [
              ...chests.map((c) => ({ x: c.x, y: c.y, color: '#ffd45c', hidden: c.taken || !seen[c.y][c.x] })),
              { x: exit.x, y: exit.y, color: '#7dff9a', hidden: !seen[exit.y][exit.x] },
            ]);
            const next = chests.find((c) => !c.taken);
            if (next) view.drawCompass(px, py, ang, next.x + 0.5, next.y + 0.5, '宝箱', '#ffd45c');
            else view.drawCompass(px, py, ang, exit.x + 0.5, exit.y + 0.5, '出口', '#7dff9a');
            if (now < msgUntil) view.drawMessage(msg, Math.min(1, (msgUntil - now) / 300));
            else if (now < startTime) view.drawMessage('宝箱を さがして 出口へ!');
          }
          rafId = requestAnimationFrame(frame);
        }
        function finish(escaped) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const elapsed = Math.max(0, performance.now() - startTime) + penaltyMs;
          const remRatio = clamp(1 - elapsed / DURATION_MS, 0, 1);
          let score;
          if (escaped) { score = clamp(52 + taken * 12 + remRatio * 16 - trapHits * 4, 40, 100); say(taken >= 3 ? '🏆 かんぜん だっしゅつ!' : '🚪 だっしゅつ! 宝箱 ' + taken + '/3'); }
          else { score = clamp(18 + taken * 9, 15, 45); say('じかんぎれ… 宝箱 ' + taken + '/3'); }
          if (ctx) { view.render(map, px, py, ang, sprites(performance.now())); view.drawMessage(hint.textContent); }
          setTimeout(() => onComplete(Math.round(score)), 800);
        }
        markSeen(seen, map, px, py);
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const FIRST_PERSON_DUNGEON_VARIANTS=[mg('fp-dungeon',makeFirstPersonDungeonGame({title:'3Dダンジョン!宝箱を あつめて 出口を さがそう'}))];

  // --- 3Dふう ならびかえ ---
  // 大きさ・年齢など、客観的に正解を判定できるお題だけを使う。
  function makePerspectiveRankingGame({ title, cast, criterion }) {
    return {
      start(container,onComplete){
        let order=[...cast].sort(()=>Math.random()-.5), selected=-1, moves=0, done=false;
        container.innerHTML=`
          <div class="mg-header"><span id="mgRankMoves">いれかえ: 0</span><span>ならべよう!</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-rank3d-stage" id="mgRankStage"></div>
          <div class="mg-hint">左から順になるよう、2人ずつタップして入れかえよう</div>
          <button class="mg-tap-btn" id="mgRankDone">これで けってい!</button>`;
        const stage=container.querySelector('#mgRankStage'),movesEl=container.querySelector('#mgRankMoves');
        function render(){
          stage.innerHTML=order.map((c,i)=>`<button class="mg-rank3d-card ${i===selected?'selected':''}" data-i="${i}" style="--rank:${i}"><span class="mg-rank3d-emoji">${c.emoji}</span><strong>${c.name}</strong><small>${c.tag || ('No.'+(i+1))}</small></button>`).join('');
          stage.querySelectorAll('.mg-rank3d-card').forEach(btn=>btn.onpointerdown=(e)=>{e.preventDefault();
            if(done)return;const i=Number(btn.dataset.i);
            if(selected<0){selected=i;render();return;}
            if(selected!==i){[order[selected],order[i]]=[order[i],order[selected]];moves++;}
            selected=-1;movesEl.textContent='いれかえ: '+moves;render();
          });
        }
        render();
        container.querySelector('#mgRankDone').onpointerdown=(e)=>{e.preventDefault();
          if(done)return;done=true;
          const ideal=[...cast].sort((a,b)=>a[criterion]-b[criterion]);
          const pos=new Map(ideal.map((c,i)=>[c.name,i]));
          let error=0;order.forEach((c,i)=>error+=Math.abs(i-pos.get(c.name)));
          onComplete(clamp(Math.round(100-error*9-Math.max(0,moves-8)*2),20,100));
        };
      }
    };
  }
  const RANKING_3D_CASTS = [
    [
      {emoji:'🐭',name:'ねずみ',tag:'ちょこちょこ',size:1,age:2},{emoji:'🐰',name:'うさぎ',tag:'みみ長め',size:2,age:4},{emoji:'🐶',name:'いぬ',tag:'しっぽ元気',size:3,age:7},{emoji:'🐷',name:'ぶた',tag:'のんびり',size:4,age:9},{emoji:'🐻',name:'くま',tag:'どっしり',size:5,age:15}
    ],
    [
      {emoji:'🐣',name:'ひよこ',tag:'ぴよぴよ',size:1,age:1},{emoji:'🐱',name:'ねこ',tag:'きまぐれ',size:2,age:5},{emoji:'🦊',name:'きつね',tag:'目がするどい',size:3,age:8},{emoji:'🦁',name:'ライオン',tag:'たてがみ',size:4,age:12},{emoji:'🐘',name:'ぞう',tag:'ゆったり',size:5,age:18}
    ],
    [
      {emoji:'👶',name:'あかちゃん',tag:'よちよち',size:1,age:1},{emoji:'🧒',name:'こども',tag:'げんき',size:2,age:5},{emoji:'🧑',name:'おとな',tag:'しゃきっと',size:3,age:10},{emoji:'🧔',name:'おじさん',tag:'ひげ',size:4,age:14},{emoji:'👴',name:'おじいさん',tag:'つえ',size:5,age:20}
    ]
  ];
  function randomRankingCast(){ return RANKING_3D_CASTS[Math.floor(Math.random()*RANKING_3D_CASTS.length)].map(c=>({...c})); }
  function objectiveRanking(title,id,criterion,reverse=false){return mg(id,{start(container,onComplete){let cast=randomRankingCast();if(reverse)cast=cast.map(c=>({...c,[criterion]:30-c[criterion]}));makePerspectiveRankingGame({title,cast,criterion}).start(container,onComplete);}});}
  const RANKING_GAME_FACTORIES = [
    () => objectiveRanking('3Dならびかえ!小さい順に ならべよう','rank3d-small','size'),
    () => objectiveRanking('3Dならびかえ!大きい順に ならべよう','rank3d-big','size',true),
    () => objectiveRanking('3Dならびかえ!若そうな順に ならべよう','rank3d-young','age'),
    () => objectiveRanking('3Dならびかえ!年寄りそうな順に ならべよう','rank3d-old','age',true),
  ];
  const PERSPECTIVE_RANKING_VARIANTS = [
    mg('rank3d-random', {
      start(container, onComplete) {
        const game = RANKING_GAME_FACTORIES[Math.floor(Math.random() * RANKING_GAME_FACTORIES.length)]();
        game.start(container, onComplete);
      },
    }),
  ];

  // --- 名作ジャンルへのオマージュ: 固有キャラ/名称は使わず遊びの核だけ再構成 ---
  function makeCreatureCaptureGame(){
    return {start(container,onComplete){
      const difficulty=ageDifficulty();
      const DURATION_MS=11000;
      const monsters=['👾','👻','🐲','🦖','🦄'];
      let balls=6,caught=0,throws=0,running=true,targetX=50,targetY=42,targetVX=0,targetVY=0;
      let aimX=50,aimY=65,dragging=false,dragStart=null,rafId,last=null;
      const startTime=performance.now()+MG_ACTION_START_GRACE_MS;

      container.innerHTML=`
        <div class="mg-header"><span id="capTimer">のこり: 11s</span><span id="capBalls">カプセル 6　つかまえた 0</span></div>
        <div class="mg-title">3D モンスターキャッチ!うごきを よんで スワイプで なげよう</div>
        <div class="mg-capture3d" id="capScene">
          <div class="mg-capture-monster" id="capMonster">👾</div>
          <div class="mg-capture-reticle" id="capAim">◎</div>
          <div id="capBall" style="position:absolute;left:50%;bottom:6%;font-size:25px;transform:translateX(-50%);">⚪</div>
        </div>
        <div class="mg-hint" id="capHint">画面を ドラッグして ねらう → うえにスワイプして なげる!</div>`;
      const scene=container.querySelector('#capScene'),monster=container.querySelector('#capMonster'),aim=container.querySelector('#capAim');
      const ball=container.querySelector('#capBall'),timer=container.querySelector('#capTimer'),status=container.querySelector('#capBalls'),hint=container.querySelector('#capHint');

      function respawn(){
        targetX=18+Math.random()*64;targetY=25+Math.random()*30;
        const speed=.016+Math.random()*(.012+difficulty*.012);
        targetVX=(Math.random()<.5?-1:1)*speed;targetVY=(Math.random()<.5?-1:1)*speed*.5;
        monster.textContent=monsters[Math.floor(Math.random()*monsters.length)];
        monster.style.left=targetX+'%';monster.style.top=targetY+'%';
      }
      function setAim(e){
        const r=scene.getBoundingClientRect();
        aimX=clamp((e.clientX-r.left)/r.width*100,8,92);
        aimY=clamp((e.clientY-r.top)/r.height*100,12,88);
        aim.style.left=aimX+'%';aim.style.top=aimY+'%';
      }
      scene.addEventListener('pointerdown',(e)=>{
        if(!running)return;
        e.preventDefault();
        dragging=true;dragStart={x:e.clientX,y:e.clientY};setAim(e);
        try{scene.setPointerCapture(e.pointerId);}catch(err){}
      });
      scene.addEventListener('pointermove',(e)=>{if(dragging){e.preventDefault();setAim(e);}});
      scene.addEventListener('pointerup',(e)=>{
        if(!dragging||!running)return;
        e.preventDefault();
        dragging=false;
        if(performance.now()<startTime){hint.textContent='スタート! モンスターをねらって上へスワイプ';return;}
        const dy=dragStart.y-e.clientY;
        if(dy<18){setAim(e);hint.textContent='うえに スワイプして カプセルを なげよう!';return;}
        // なげる さきは ドラッグを はじめた いち(はなした いちでは ない)
        setAim({clientX:dragStart.x,clientY:dragStart.y});
        throwBall();
      });
      scene.addEventListener('pointercancel',()=>{dragging=false;});

      function throwBall(){
        if(!running||balls<=0)return;
        balls--;throws++;
        const d=Math.hypot((aimX-targetX)*1.05,(aimY-targetY)*1.25);
        ball.style.left=aimX+'%';ball.style.bottom=(100-aimY)+'%';ball.style.transform='translate(-50%,50%) scale(.45)';
        const great=d<8,hit=d<15;
        if(hit){
          const catchChance=great?.92:.62;
          monster.classList.add('caught');
          if(Math.random()<catchChance){caught++;hint.textContent=great?'✨ ナイススロー!つかまえた!':'つかまえた!';setTimeout(respawn,320);}
          else hint.textContent='あたった!でも にげられた!';
          setTimeout(()=>monster.classList.remove('caught'),300);
        }else hint.textContent='おしい!モンスターの うごきを よもう';
        status.textContent=`カプセル ${balls}　つかまえた ${caught}`;
        setTimeout(()=>{ball.style.left='50%';ball.style.bottom='6%';ball.style.transform='translateX(-50%)';},220);
        if(!balls)setTimeout(()=>end(),420);
      }
      function frame(now){
        if(!running)return;
        if(now>=startTime){
          if(last==null)last=now;const dt=Math.min(40,now-last);last=now;
          targetX+=targetVX*dt;targetY+=targetVY*dt;
          if(targetX<14||targetX>86){targetVX*=-1;targetX=clamp(targetX,14,86);}
          if(targetY<20||targetY>58){targetVY*=-1;targetY=clamp(targetY,20,58);}
          monster.style.left=targetX+'%';monster.style.top=targetY+'%';
          const rem=Math.max(0,DURATION_MS-(now-startTime));timer.textContent='のこり: '+Math.ceil(rem/1000)+'s';
          if(rem<=0){end();return;}
        }
        rafId=requestAnimationFrame(frame);
      }
      function end(){
        if(!running)return;running=false;cancelAnimationFrame(rafId);
        const accuracy=throws?caught/throws:0;
        onComplete(clamp(Math.round(35+caught*13+accuracy*25),20,100));
      }
      respawn();rafId=requestAnimationFrame(frame);
    }};
  }
  const CREATURE_CAPTURE_VARIANTS=[mg('creature-capture-3d',makeCreatureCaptureGame())];

  function makeAdventureFieldGame(){
    return {start(container,onComplete){
      const W=8,H=7;let x=1,y=1,hp=3,gems=0,moves=0,done=false,turn=0;
      const walls=new Set(['3,1','3,2','1,3','5,3','6,3','2,5','4,5']);
      const gemSet=new Set(['6,1','2,2','4,4','6,5']);
      const potionSet=new Set(['1,5']);
      const enemies=[{x:6,y:4},{x:4,y:2}];
      container.innerHTML=`
        <div class="mg-header"><span id="advHp">❤️❤️❤️</span><span id="advGem">💎 0/4</span></div>
        <div class="mg-title">ちいさな冒険!宝を あつめて てきを かわし 出口へ</div>
        <div class="mg-adventure-field" id="advField"></div>
        <div class="mg-hint" id="advHint">🏰へ行こう。矢印・スワイプ・となりのマスをタップで1マス移動</div>
        <div class="mg-dpad mg-adventure-dpad">
          <span></span><button data-d="up">▲</button><span></span>
          <button data-d="left">◀</button><button data-d="down">▼</button><button data-d="right">▶</button>
        </div>`;
      const field=container.querySelector('#advField'),hint=container.querySelector('#advHint');
      const key=(a,b)=>a+','+b;
      function occupiedByEnemy(xx,yy){return enemies.some(en=>en.x===xx&&en.y===yy);}
      function moveEnemies(){
        enemies.forEach(en=>{
          const opts=[[1,0],[-1,0],[0,1],[0,-1]]
            .map(([dx,dy])=>({x:en.x+dx,y:en.y+dy}))
            .filter(p=>p.x>=0&&p.y>=0&&p.x<W&&p.y<H&&!walls.has(key(p.x,p.y))&&!(p.x===7&&p.y===6));
          opts.sort((a,b)=>(Math.abs(a.x-x)+Math.abs(a.y-y))-(Math.abs(b.x-x)+Math.abs(b.y-y)));
          const chosen=Math.random()<.72?opts[0]:opts[Math.floor(Math.random()*opts.length)];
          if(chosen){en.x=chosen.x;en.y=chosen.y;}
        });
      }
      function checkEnemyHit(){
        if(occupiedByEnemy(x,y)){hp--;hint.textContent='👹に ぶつかった!HP -1';enemies.forEach(en=>{if(en.x===x&&en.y===y){en.x=Math.max(0,en.x-1);}});return true;}return false;
      }
      function draw(){
        let html='';
        for(let yy=0;yy<H;yy++)for(let xx=0;xx<W;xx++){
          const k=key(xx,yy);let e='·',cls='';
          if(walls.has(k)){e='🌲';cls='wall';}else if(gemSet.has(k)){e='💎';cls='gem';}else if(potionSet.has(k)){e='🧪';cls='potion';}
          if(occupiedByEnemy(xx,yy)){e='👹';cls='enemy';}if(xx===7&&yy===6){e='🏰';cls='goal';}if(xx===x&&yy===y)e=currentSprite();
          html+=`<span class="${cls}" data-x="${xx}" data-y="${yy}">${e}</span>`;
        }
        field.innerHTML=html;container.querySelector('#advHp').textContent='❤️'.repeat(Math.max(0,hp));container.querySelector('#advGem').textContent='💎 '+gems+'/4';
        const playerCell=field.querySelector(`[data-x="${x}"][data-y="${y}"]`);if(playerCell)playerCell.classList.add('player-cell');
      }
      function finish(score,msg){if(done)return;done=true;hint.textContent=msg;draw();setTimeout(()=>onComplete(clamp(score,20,100)),450);}
      function moveAdventure(d){
        if(done)return;const dx=d==='left'?-1:d==='right'?1:0,dy=d==='up'?-1:d==='down'?1:0;
        const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H||walls.has(key(nx,ny))){hint.textContent='そこは すすめない!';return;}
        x=nx;y=ny;moves++;turn++;
        const k=key(x,y);if(gemSet.delete(k)){gems++;hint.textContent='💎 ゲット!';}
        if(potionSet.delete(k)){hp=Math.min(3,hp+1);hint.textContent='🧪 HPかいふく!';}
        checkEnemyHit();
        if(hp<=0){finish(20,'ちからつきた…');return;}
        if(x===7&&y===6){finish(52+gems*13-Math.max(0,moves-26),'🏰 出口に ついた!');return;}
        if(turn%2===0){moveEnemies();checkEnemyHit();if(hp<=0){finish(20,'てきに つかまった…');return;}}
        draw();
      }
      container.querySelectorAll('[data-d]').forEach(b=>{b.dataset.hold='step';b.dataset.key=b.dataset.d;b.addEventListener('pointerdown',(e)=>{e.preventDefault();moveAdventure(b.dataset.d);});});
      // となりの マスを タップ、または フィールドを スワイプで 1マス うごく
      let advTouchStart=null;
      field.addEventListener('pointerdown',(e)=>{
        if(done)return;
        e.preventDefault();
        advTouchStart={x:e.clientX,y:e.clientY,target:e.target};
        try{field.setPointerCapture(e.pointerId);}catch(err){}
      });
      field.addEventListener('pointerup',(e)=>{
        if(!advTouchStart||done)return;
        e.preventDefault();
        const dx=e.clientX-advTouchStart.x,dy=e.clientY-advTouchStart.y,startTarget=advTouchStart.target;advTouchStart=null;
        if(Math.max(Math.abs(dx),Math.abs(dy))<12){
          const cell=startTarget&&startTarget.closest?startTarget.closest('[data-x][data-y]'):null;
          if(!cell)return;
          const tx=Number(cell.dataset.x),ty=Number(cell.dataset.y),cdx=tx-x,cdy=ty-y;
          if(Math.abs(cdx)+Math.abs(cdy)===1)moveAdventure(cdx<0?'left':cdx>0?'right':cdy<0?'up':'down');
          else{flashMistake(cell);hint.textContent='となりの マスを タップするか、スワイプで うごこう';}
          return;
        }
        moveAdventure(Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down'));
      });
      field.addEventListener('pointercancel',()=>{advTouchStart=null;});
      draw();
    }};
  }
  const ADVENTURE_FIELD_VARIANTS=[mg('adventure-field',makeAdventureFieldGame())];

  function makeRetroPetGame(){
    return {start(container,onComplete){
      const DURATION_MS=12000;let hunger=2,happy=1,clean=2,poop=0,steps=0,done=false,rafId,lastDecay=performance.now();
      const startTime=performance.now()+MG_ACTION_START_GRACE_MS;
      container.innerHTML=`
        <div class="mg-header"><span id="rpTimer">のこり: 12s</span><span id="rpScore">おせわ 0</span></div>
        <div class="mg-title">レトロ育成ゲーム!ようすを見て いちばん必要な おせわをしよう</div>
        <div class="mg-retropet"><div class="mg-retropet-screen"><div id="rpStats"></div><div class="mg-retropet-creature" id="rpCreature">◉ᴥ◉</div><div id="rpMsg">げんきに してあげよう!</div></div>
        <div class="mg-retropet-buttons"><button data-a="food">🍚</button><button data-a="play">🎾</button><button data-a="clean">🧹</button><button data-a="pet">🤲</button></div></div>`;
      const stats=container.querySelector('#rpStats'),msg=container.querySelector('#rpMsg'),creature=container.querySelector('#rpCreature'),timer=container.querySelector('#rpTimer'),scoreEl=container.querySelector('#rpScore');
      function needScore(){return hunger+happy+clean-poop*2;}
      function draw(){
        stats.textContent=`🍚${hunger}/3　😊${happy}/3　✨${clean}/3　💩${poop}`;
        scoreEl.textContent='おせわ '+Math.max(0,needScore());
        creature.textContent=poop?'◉︵◉':(hunger<=1||happy<=1?'◉﹏◉':'◉ᴥ◉');
      }
      function decay(){
        const choices=['hunger','happy','clean'];const k=choices[Math.floor(Math.random()*choices.length)];
        if(k==='hunger')hunger=Math.max(0,hunger-1);if(k==='happy')happy=Math.max(0,happy-1);if(k==='clean')clean=Math.max(0,clean-1);
        if(Math.random()<.38)poop=Math.min(2,poop+1);msg.textContent=poop?'💩した!そうじしてあげよう':'ようすが かわった!';draw();
      }
      container.querySelectorAll('[data-a]').forEach(b=>b.onpointerdown=(e)=>{e.preventDefault();
        if(done||performance.now()<startTime)return;steps++;const a=b.dataset.a;
        if(a==='food'){hunger=Math.min(3,hunger+1);if(Math.random()<.3)poop=Math.min(2,poop+1);msg.textContent='🍚 おなかいっぱい!';}
        if(a==='play'){happy=Math.min(3,happy+1);hunger=Math.max(0,hunger-1);msg.textContent='🎾 たのしそう!でも おなかへった';}
        if(a==='clean'){if(poop>0)poop--;clean=Math.min(3,clean+1);msg.textContent='🧹 きれいになった!';}
        if(a==='pet'){happy=Math.min(3,happy+1);msg.textContent='🤲 なでなで!';}
        draw();
        if(hunger===3&&happy===3&&clean===3&&poop===0){done=true;msg.textContent='✨ げんきいっぱい!おせわ大成功';setTimeout(()=>onComplete(clamp(100-steps*3,60,100)),450);}
      });
      function frame(now){
        if(done)return;if(now>=startTime){
          if(now-lastDecay>3200){lastDecay=now;decay();}
          const rem=Math.max(0,DURATION_MS-(now-startTime));timer.textContent='のこり: '+Math.ceil(rem/1000)+'s';
          if(rem<=0){done=true;const score=clamp(Math.round(35+needScore()*7-steps),20,95);msg.textContent='おせわ しゅうりょう!';setTimeout(()=>onComplete(score),350);return;}
        }
        rafId=requestAnimationFrame(frame);
      }
      draw();rafId=requestAnimationFrame(frame);
    }};
  }
  const RETRO_PET_VARIANTS=[mg('retro-pet-care',makeRetroPetGame())];

  // --- 4. ゲレンデすべりおり(スキー/スノーボード) ---
  // ◀▶ボタンで さゆうに うごきつづけながら、上から せまってくる
  // しょうがいぶつを よけつつ、はたの あいだ(ゲート)を くぐりぬける。
  // jump/runnerの「1レーンで タイミングよく さばく」だけとはちがい、
  // レーンを またいで うごきつづける れんぞくてきな そうさが ひつよう。
  // スキー/スノーボードは 見ためだけの ちがいなので randomThemeGame で
  // 1エントリに とうごうしてある。ゆきやま地域げんてい
  // --- ゲレンデすべりおり(canvas ぎじ3D版): カーブする ゲレンデを
  //     すべりおり、🚩の あいだを くぐり、木と岩を よけ、丸太は ジャンプ ---
  function makeDownhillGame({ title, rider }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const TIME_LIMIT_MS = Math.round(lerp(40000, 34000, difficulty));
        let position = 0, speed = 0, playerX = 0, steer = 0, steerTarget = 0, touchSteer = null;
        let hits = 0, gates = 0, gatesTotal = 0, jumpsOk = 0, running = true, rafId = null, last = null, flash = 0, msg = '', msgUntil = 0;
        let airborneUntil = 0, tumbleUntil = 0, offSnow = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="dhTimer">のこり: ${Math.ceil(TIME_LIMIT_MS / 1000)}s</span><span id="dhScore">🚩 0/0　🪵 0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="dhCanvas"></canvas></div>
          <div class="mg-hint" id="dhHint">◀▶(おしっぱなし)か がめんドラッグで ステア。🚩🚩の あいだを とおり、🪵は ジャンプで こえよう</div>
          <div class="mg-race-controls"><button class="mg-tap-btn mg-hold-btn" id="dhLeft" data-key="left">◀</button><button class="mg-tap-btn primary" id="dhJump" data-key="action">ジャンプ!</button><button class="mg-tap-btn mg-hold-btn" id="dhRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#dhCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 215);
        const road = createPseudoRoad(ctx, W, H, { roadWidth: 1500, colors: (dark) => (dark ? { grass: '#cfe6f5', road: '#ffffff', rumble: '#a9d3ec', rumbleWidth: 0.05 } : { grass: '#c4def0', road: '#f4fbff', rumble: '#a9d3ec', rumbleWidth: 0.05 }) });
        const { SEG_LEN, PLAYER_Z, segments } = road;
        const MAX_SPEED = SEG_LEN * 52, ACCEL = MAX_SPEED / 2.6;
        road.addRoad(10, 20, 10, 0, -10);
        for (let i = 0; i < 8; i++) {
          const dir = Math.random() < 0.5 ? -1 : 1;
          road.addRoad(10 + Math.floor(Math.random() * 8), 12 + Math.floor(Math.random() * 12), 10 + Math.floor(Math.random() * 8), dir * (1.5 + Math.random() * 2.5 + difficulty), -(10 + Math.random() * 30));
          if (Math.random() < 0.5) road.addRoad(6, 6 + Math.floor(Math.random() * 10), 6, 0, -(5 + Math.random() * 20));
        }
        road.addRoad(10, 30, 10, 0, -10);
        const FINISH_INDEX = segments.length - 12;
        const items = [];
        for (let n = 8; n < FINISH_INDEX; n += 2) {
          if (Math.random() < 0.55) segments[n].sprites.push({ emoji: '🌲', offset: -1.3 - Math.random() * 1.4, size: 0.5 });
          if (Math.random() < 0.55) segments[n].sprites.push({ emoji: '🌲', offset: 1.3 + Math.random() * 1.4, size: 0.5 });
        }
        for (let n = 30; n < FINISH_INDEX - 10; n += Math.floor(lerp(14, 9, difficulty)) + Math.floor(Math.random() * 6)) {
          const r = Math.random();
          if (r < 0.45) {
            const center = (Math.random() - 0.5) * 1.1;
            const item = { kind: 'gate', z: n * SEG_LEN, center, done: false };
            items.push(item);
            segments[n].sprites.push({ emoji: '🚩', offset: center - 0.32, size: 0.24, item });
            segments[n].sprites.push({ emoji: '🚩', offset: center + 0.32, size: 0.24, item });
          } else if (r < 0.8) {
            const off = (Math.random() - 0.5) * 1.6;
            const item = { kind: 'obstacle', z: n * SEG_LEN, offset: off, done: false };
            items.push(item);
            segments[n].sprites.push({ emoji: Math.random() < 0.5 ? '🌲' : '🪨', offset: off, size: 0.3, item });
          } else {
            const item = { kind: 'log', z: n * SEG_LEN, done: false };
            items.push(item);
            for (let k = -2; k <= 2; k++) segments[n].sprites.push({ emoji: '🪵', offset: k * 0.42, size: 0.28, item });
          }
        }
        for (let n = FINISH_INDEX; n < FINISH_INDEX + 2; n++) { segments[n].sprites.push({ emoji: '🏁', offset: -1.1, size: 0.4 }); segments[n].sprites.push({ emoji: '🏁', offset: 1.1, size: 0.4 }); }
        const timerEl = container.querySelector('#dhTimer'), scoreEl = container.querySelector('#dhScore'), hint = container.querySelector('#dhHint'), jumpBtn = container.querySelector('#dhJump');
        let leftHeld = false, rightHeld = false;
        bindHeldButton(container.querySelector('#dhLeft'), (v) => { leftHeld = v; });
        bindHeldButton(container.querySelector('#dhRight'), (v) => { rightHeld = v; });
        function jump() {
          const now = performance.now();
          if (!running || now < startTime || now < airborneUntil || now < tumbleUntil) return;
          airborneUntil = now + 760;
          jumpBtn.disabled = true; setTimeout(() => { if (running) jumpBtn.disabled = false; }, 760);
        }
        jumpBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); jump(); });
        let drag = null;
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (err) {} drag = { x: e.clientX, y: e.clientY, moved: 0 }; touchSteer = clamp((mgPointerPos(canvas, e).nx - 0.5) * 2.6, -1, 1); });
        canvas.addEventListener('pointermove', (e) => { if (!drag) return; drag.moved += Math.abs(e.clientX - drag.x); touchSteer = clamp((mgPointerPos(canvas, e).nx - 0.5) * 2.6, -1, 1); });
        const endTouch = (e) => { if (drag && drag.moved < 6 && e.clientY - drag.y < -20) jump(); drag = null; touchSteer = null; };
        canvas.addEventListener('pointerup', endTouch); canvas.addEventListener('pointercancel', endTouch);
        const say = (t, ms = 1100) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `🚩 ${gates}/${gatesTotal}　🪵 ${jumpsOk}`; };
        function render(now) {
          if (!ctx) return;
          const skyG = ctx.createLinearGradient(0, 0, 0, H * 0.5); skyG.addColorStop(0, '#6fb8ff'); skyG.addColorStop(1, '#dff1ff');
          ctx.fillStyle = skyG; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = '#eef6fb';
          ctx.beginPath(); ctx.moveTo(0, H * 0.42); for (let i = 0; i <= 6; i++) ctx.lineTo(i * W / 6 + ((position / 900) % (W / 6)) * 0 - 0, H * 0.42 - [18, 40, 26, 48, 30, 44, 20][i]); ctx.lineTo(W, H * 0.42); ctx.closePath(); ctx.fill();
          road.render(position, playerX);
          const air = now < airborneUntil ? Math.sin(((airborneUntil - now) / 760) * Math.PI) : 0;
          const tumble = now < tumbleUntil;
          ctx.save();
          if (tumble) { ctx.translate(W / 2, H - 10); ctx.rotate(Math.sin(now / 40) * 0.5); ctx.translate(-W / 2, -(H - 10)); }
          drawRider(ctx, W / 2 + steer * 6, H - 8, 34, rider, steer, air);
          ctx.restore();
          if (air > 0) { ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4; ctx.fillText('JUMP!', W / 2, H - 70); ctx.shadowBlur = 0; }
          const progress = clamp((position + PLAYER_Z) / (FINISH_INDEX * SEG_LEN), 0, 1);
          ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(8, 8, W - 16, 8);
          ctx.fillStyle = '#7dff9a'; ctx.fillRect(8, 8, (W - 16) * progress, 8);
          ctx.font = '11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 3;
          ctx.fillText('🏁 ' + Math.round(progress * 100) + '%　' + Math.round(speed / MAX_SPEED * 80) + ' km/h', 8, 19); ctx.shadowBlur = 0;
          if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, W, H); flash = Math.max(0, flash - 0.05); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(W / 2 - 90, H / 2 - 40, 180, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2 - 27); }
          if (now < startTime) { ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText('READY…', W / 2, H / 2 - 30); ctx.shadowBlur = 0; }
        }
        function update(dt, now) {
          const speedPct = speed / MAX_SPEED;
          const seg = road.findSegment(position + PLAYER_Z);
          const airborne = now < airborneUntil, tumbling = now < tumbleUntil;
          steerTarget = touchSteer != null ? touchSteer : (rightHeld ? 1 : 0) - (leftHeld ? 1 : 0);
          steer += (steerTarget - steer) * Math.min(1, dt * 8);
          position += speed * dt;
          playerX += steer * dt * 2.3 * speedPct * (airborne ? 0.45 : 1);
          playerX -= dt * 1.6 * speedPct * speedPct * seg.curve * 0.3;
          if (!tumbling) speed += ACCEL * dt * (1 - Math.abs(steer) * 0.25); else speed -= MAX_SPEED * 1.5 * dt;
          if (Math.abs(playerX) > 1) { offSnow += dt; speed = Math.min(speed, MAX_SPEED * 0.42); }
          playerX = clamp(playerX, -1.8, 1.8);
          speed = clamp(speed, 0, MAX_SPEED);
          const pz = position + PLAYER_Z;
          for (const it of items) {
            if (it.done || it.z > pz || it.z < pz - SEG_LEN * 1.5) continue;
            it.done = true;
            if (it.kind === 'gate') { gatesTotal++; if (Math.abs(playerX - it.center) < 0.32) { gates++; say('🚩 ゲート通過!', 700); } else say('ゲートを はずした…', 900); }
            else if (it.kind === 'obstacle') { if (!airborne && Math.abs(playerX - it.offset) < 0.28) { hits++; tumbleUntil = now + 650; flash = 0.6; say('💥 ぶつかった!'); } }
            else if (it.kind === 'log') { if (airborne) { jumpsOk++; say('🪵 ジャンプ せいこう!', 800); } else if (Math.abs(playerX) < 1.05) { hits++; tumbleUntil = now + 650; flash = 0.6; say('🪵 まるたに つまずいた!'); } }
            hud();
          }
          if (pz >= FINISH_INDEX * SEG_LEN) finish(true);
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt, now);
          if (!running) return;
          const rem = Math.max(0, TIME_LIMIT_MS - Math.max(0, now - startTime));
          timerEl.textContent = 'のこり: ' + Math.ceil(rem / 1000) + 's';
          render(now);
          if (rem <= 0) { finish(false); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish(win) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const progress = clamp((position + PLAYER_Z) / (FINISH_INDEX * SEG_LEN), 0, 1);
          const gateRatio = gatesTotal ? gates / gatesTotal : 0.5;
          let score;
          if (win) { score = clamp(45 + gateRatio * 35 + Math.min(20, jumpsOk * 5) - hits * 6, 30, 100); say('🏁 ゴール! ゲート ' + gates + '/' + gatesTotal); }
          else { score = clamp(10 + progress * 40 + gateRatio * 10, 10, 55); say('タイムアップ… ' + Math.round(progress * 100) + '% まで すべった'); }
          render(performance.now());
          setTimeout(() => onComplete(Math.round(score)), 800);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const DOWNHILL_THEMES = [
    { title: 'スキーで ゲレンデを すべりおりよう!', rider: { kind: 'ski', board: '#ff5a5a', jacket: '#2f6fed', helmet: '#f1f1f1' } },
    { title: 'スノーボードで ゲレンデを すべりおりよう!', rider: { kind: 'board', board: '#ffb703', jacket: '#e63946', helmet: '#222' } },
  ];

  // --- 5. サーフィン(なみに のる タイミング→バランスの2だんかい) ---
  // 「タイミングよく タップ」だけの timingカテゴリでも、「かたむきを
  // ととのえるだけ」の balanceカテゴリでもなく、①なみに のる しゅんかんの
  // タイミングはんてい→②のった あとの バランスたもち、を つづけて ためす
  // あたらしいジャンル。なつとの あいしょうが よいため、季節の「おまけ」枠
  // (SEASONAL_MINIGAMES)を つかい、地域×季節の あたらしいしくみは つくらない
  function makeSurfingGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        let finished=false,phase='wait',waveAttempt=0,waveTimer,windowTimer,nextWaveTimer;
        const MAX_WAVE_ATTEMPTS=3;
        container.innerHTML=`
          <div class="mg-header"><span id="mgWaveCount">なみ: 1/${MAX_WAVE_ATTEMPTS}</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-surf-scene" id="mgSurfScene">
            <div class="mg-surf-wave" id="mgSurfWave"></div>
            <div class="mg-surf-board" id="mgSurfBoard">🏄</div>
            <div class="mg-surf-ready" id="mgSurfReady">まて…</div>
          </div>
          <div class="mg-hint" id="mgHint">① 波が近づくまで待つ → ②「のる!」が光ったら押す</div>
          <div class="mg-surf-controls" id="mgSurfControls">
            <button class="mg-tap-btn" id="mgSurfRide" disabled>🌊 のる!</button>
          </div>`;
        const scene=container.querySelector('#mgSurfScene'),wave=container.querySelector('#mgSurfWave'),board=container.querySelector('#mgSurfBoard');
        const hint=container.querySelector('#mgHint'),count=container.querySelector('#mgWaveCount'),ready=container.querySelector('#mgSurfReady'),controls=container.querySelector('#mgSurfControls');
        const rideBtn=container.querySelector('#mgSurfRide');
        const approachMs=lerp(1800,1250,difficulty),catchWindowMs=lerp(900,620,difficulty);

        function finish(score,msg){if(finished)return;finished=true;clearTimeout(waveTimer);clearTimeout(windowTimer);clearTimeout(nextWaveTimer);hint.textContent=msg;setTimeout(()=>onComplete(score),550);}
        function scheduleWave(){
          phase='wait';rideBtn.disabled=true;rideBtn.classList.remove('ready');ready.textContent='まて…';wave.classList.remove('approaching','riding');
          hint.textContent='波が近づくまで待とう。「のる!」が光ったら押す';count.textContent=`なみ: ${waveAttempt+1}/${MAX_WAVE_ATTEMPTS}`;
          waveTimer=setTimeout(()=>{
            if(finished)return;phase='catch';wave.classList.add('approaching');rideBtn.disabled=false;rideBtn.classList.add('ready');ready.textContent='いまだ!';
            hint.textContent='いまだ! 「🌊 のる!」を押そう!';
            windowTimer=setTimeout(()=>missWave('波にのりおくれた…'),catchWindowMs);
          },approachMs);
        }
        function missWave(msg){
          if(finished||phase==='balance')return;phase='wait';clearTimeout(windowTimer);rideBtn.disabled=true;rideBtn.classList.remove('ready');wave.classList.remove('approaching');waveAttempt++;
          if(waveAttempt>=MAX_WAVE_ATTEMPTS)finish(20,msg);
          else{hint.textContent=msg+' つぎの波を待とう';nextWaveTimer=setTimeout(scheduleWave,750);}
        }
        rideBtn.addEventListener('pointerdown',e=>{
          e.preventDefault();if(finished)return;
          if(phase!=='catch'){hint.textContent='まだ! 「いまだ!」が出るまで待とう';return;}
          phase='balance';clearTimeout(windowTimer);rideBtn.disabled=true;rideBtn.classList.remove('ready');wave.classList.remove('approaching');wave.classList.add('riding');ready.textContent='バランス!';
          startBalance();
        });
        function startBalance(){
          const BALANCE_MS=4600,drift=lerp(9,18,difficulty);let tilt=0,velocity=0,last=null,rafId;const start=performance.now();
          controls.innerHTML='<button class="mg-tap-btn" id="mgSurfLeft">◀ 左へ</button><button class="mg-tap-btn" id="mgSurfRight">右へ ▶</button>';
          hint.textContent='ボードが傾いた反対側を押して、まんなかに戻そう';
          const left=container.querySelector('#mgSurfLeft'),right=container.querySelector('#mgSurfRight');
          left.addEventListener('pointerdown',e=>{e.preventDefault();velocity-=8;});
          right.addEventListener('pointerdown',e=>{e.preventDefault();velocity+=8;});
          function step(now){
            if(finished)return;if(last===null)last=now;const dt=Math.min(.05,(now-last)/1000);last=now;
            velocity+=(Math.random()-.5)*drift*dt;tilt=clamp(tilt+velocity*dt*8,-105,105);velocity*=.92;
            board.style.transform=`translateX(-50%) rotate(${tilt*.28}deg)`;
            ready.textContent=Math.abs(tilt)<28?'◎ 安定':tilt<0?'← 左に傾いてる':'右に傾いてる →';
            if(Math.abs(tilt)>=100){finish(35,'バランスを崩して落ちた…');return;}
            if(now-start>=BALANCE_MS){finish(100,'最後まで波に乗れた! 🌊');return;}
            rafId=requestAnimationFrame(step);
          }
          rafId=requestAnimationFrame(step);
        }
        scheduleWave();
      }
    };
  }

  // --- 6. ミニポーカー(てふだを 見て はんだんする、あたらしい 判断けい) ---
  // sumPair/highLow/boxPickとは ちがい、「くばられた3まいの カードから
  // 1まいだけ こうかんするか きめて、やくを そろえる」という、しょうぶの
  // まえに 一度だけ せんたくを はさむ 判断ゲーム。ほんかくてきな 役判定は
  // せず、こどもでも わかる かんたんな やくだけを つかう
  const POKER_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const POKER_SUITS = ['♠', '♥', '♦', '♣'];
  function drawPokerCard() {
    return { rank: POKER_RANKS[Math.floor(Math.random() * POKER_RANKS.length)], suit: POKER_SUITS[Math.floor(Math.random() * POKER_SUITS.length)] };
  }
  function evaluatePokerHand(cards) {
    const suits = cards.map((c) => c.suit);
    const allSameSuit = suits.every((s) => s === suits[0]);
    const rankCounts = {};
    cards.forEach((c) => { rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1; });
    const topCount = Math.max(...Object.values(rankCounts));
    if (topCount === 3) return { label: '3カード! 3まい そろった!', score: 100 };
    if (topCount === 2) return { label: 'ペア! 2まい そろった', score: 70 };
    if (allSameSuit) return { label: 'おなじ マークが そろった!', score: 60 };
    return { label: 'やくなし…', score: 25 };
  }
  function makeMiniPokerGame({ title }) {
    return {
      start(container, onComplete) {
        let finished = false;
        let cards = [drawPokerCard(), drawPokerCard(), drawPokerCard()];
        let selectedIndex = -1;
        container.innerHTML = `
          <div class="mg-title">${title}</div>
          <div class="mg-hint" id="mgPokerHint">かえたい カードを 1まいまで タップして「けってい」!</div>
          <div class="mg-poker-hand" id="mgPokerHand"></div>
          <button class="mg-tap-btn" id="mgPokerConfirm">けってい!</button>
        `;
        const handEl = container.querySelector('#mgPokerHand');
        const hintEl = container.querySelector('#mgPokerHint');
        const confirmBtn = container.querySelector('#mgPokerConfirm');

        function renderHand() {
          handEl.innerHTML = cards.map((c, i) => {
            const red = c.suit === '♥' || c.suit === '♦';
            return `<div class="mg-poker-card${i === selectedIndex ? ' selected' : ''}${red ? ' red' : ''}" data-i="${i}"><span>${c.rank}</span><span>${c.suit}</span></div>`;
          }).join('');
          Array.from(handEl.querySelectorAll('.mg-poker-card')).forEach((cardEl) => {
            cardEl.addEventListener('pointerdown', () => {
              if (finished) return;
              const i = Number(cardEl.dataset.i);
              selectedIndex = selectedIndex === i ? -1 : i;
              renderHand();
            });
          });
        }
        renderHand();

        confirmBtn.addEventListener('pointerdown', () => {
          if (finished) return;
          finished = true;
          confirmBtn.disabled = true;
          if (selectedIndex >= 0) cards[selectedIndex] = drawPokerCard();
          selectedIndex = -1;
          renderHand();
          hintEl.textContent = 'けっか はっぴょう!';
          setTimeout(() => {
            const result = evaluatePokerHand(cards);
            hintEl.textContent = result.label;
            setTimeout(() => onComplete(result.score), 700);
          }, 500);
        });
      },
    };
  }
  const MINI_POKER_VARIANTS = [mg('miniPoker-basic', makeMiniPokerGame({ title: 'ミニポーカー!やくを そろえよう' }))];

  // --- 7. ミニだっしゅつ(2だんかいの いんがかんけいを もつ たんさくゲーム) ---
  // boxPickの「1つ えらんで あける」だけの ゲームとはちがい、①正しい
  // ものを しらべて かぎ/てがかりを 見つける→②それを つかって だっしゅつ
  // する、という 2だんかいの いんがかんけいを もつ。テーマは 部屋の
  // 見ためだけの ちがいなので randomThemeGame で 1エントリに とうごうする
  function makeMiniEscapeGame({ title, objects, keyLabel, exitEmoji, exitLabel }) {
    return {
      start(container, onComplete) {
        const TIME_LIMIT_MS = 14000;
        let stage = 1;
        let finished = false;
        let timer;
        const correctIndex = Math.floor(Math.random() * objects.length);
        container.innerHTML = `
          <div class="mg-title">${title}</div>
          <div class="mg-hint" id="mgHint">あやしい ものを しらべよう!</div>
          <div class="mg-escape-grid" id="mgEscapeGrid">
            ${objects.map((o, i) => `<div class="mg-escape-obj" data-i="${i}">${o}</div>`).join('')}
          </div>
        `;
        const grid = container.querySelector('#mgEscapeGrid');
        const hintEl = container.querySelector('#mgHint');

        function finish(score, msg) {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          hintEl.textContent = msg;
          setTimeout(() => onComplete(score), 500);
        }

        function toStage2() {
          stage = 2;
          hintEl.textContent = `${keyLabel}を みつけた!でぐちを さがそう!`;
          grid.innerHTML = `<div class="mg-escape-obj mg-escape-exit" id="mgEscapeExit">${exitEmoji}<span>${exitLabel}</span></div>`;
          container.querySelector('#mgEscapeExit').addEventListener('pointerdown', () => {
            if (finished) return;
            finish(100, 'とびらが あいた! 🎉');
          });
        }

        Array.from(grid.querySelectorAll('.mg-escape-obj')).forEach((el) => {
          el.addEventListener('pointerdown', () => {
            if (finished || stage !== 1) return;
            const i = Number(el.dataset.i);
            if (i === correctIndex) {
              toStage2();
            } else {
              el.classList.add('checked');
              const msgEl = document.createElement('div');
              msgEl.className = 'mg-escape-msg';
              msgEl.textContent = 'なにも なかった…';
              container.appendChild(msgEl);
              setTimeout(() => msgEl.remove(), 700);
            }
          });
        });

        timer = setTimeout(() => {
          finish(stage === 2 ? 40 : 10, 'じかんぎれ…');
        }, TIME_LIMIT_MS);
      },
    };
  }
  const MINI_ESCAPE_THEMES = [
    { title: 'あやしい へやから だっしゅつしよう!', objects: ['🪴', '🛏️', '🖼️'], keyLabel: 'かぎ', exitEmoji: '🚪', exitLabel: 'とびら' },
    { title: 'としょしつから だっしゅつしよう!', objects: ['📚', '🗄️', '🪟'], keyLabel: 'あんごうの メモ', exitEmoji: '🔒', exitLabel: 'きんこ' },
    { title: 'だいどころから だっしゅつしよう!', objects: ['🧊', '🍳', '🧺'], keyLabel: 'とびらの かぎ', exitEmoji: '🚪', exitLabel: 'うらぐち' },
  ];
  const MINI_ESCAPE_VARIANTS = [mg('miniEscape-themed', randomThemeGame(makeMiniEscapeGame, MINI_ESCAPE_THEMES))];

  // 数より質を優先。ただし「操作が単純」だけを理由に削らない。
  // ボウリング/カーリング、スポーツ、積み上げのように短くても狙い・手応え・爽快感があるものは残す。
  // 正解や工夫がほぼなく、反射/ランダムだけで爽快感も薄いものを通常抽選から外す。
  // --- アクション型3Dボス戦 ---
  function makeActionBossGame(){
    return {start(container,onComplete){
      const DURATION_MS=18000,lanes=[18,50,82];
      let lane=1,bossHp=6,hits=0,running=true,weak=false,weakUntil=0,lastSpawn=0,projectiles=[],rafId;
      const startTime=performance.now()+MG_ACTION_START_GRACE_MS;
      container.innerHTML=`
        <div class="mg-header"><span id="abTimer">のこり: 18s</span><span id="abBoss">ボスHP: 💢💢💢💢💢💢</span></div>
        <div class="mg-title">3Dボスバトル!よけて、隙を見てこうげき!</div>
        <div class="mg-action-boss" id="abScene"><div class="mg-action-boss-enemy" id="abEnemy">👹</div><div class="mg-action-boss-player" id="abPlayer">${currentSprite()}</div></div>
        <div class="mg-hint" id="abHint">左右でよける。攻撃をかわすとボスがひるむ!</div>
        <div class="mg-action-boss-controls"><button class="mg-tap-btn" id="abLeft" data-hold="step" data-key="left">◀</button><button class="mg-tap-btn" id="abAttack" data-key="action">⚔️ こうげき!</button><button class="mg-tap-btn" id="abRight" data-hold="step" data-key="right">▶</button></div>`;
      const scene=container.querySelector('#abScene'),enemy=container.querySelector('#abEnemy'),player=container.querySelector('#abPlayer');
      const hint=container.querySelector('#abHint'),timer=container.querySelector('#abTimer'),boss=container.querySelector('#abBoss');
      const move=()=>player.style.left=lanes[lane]+'%';const setLane=n=>{lane=clamp(n,0,2);move();};move();
      container.querySelector('#abLeft').onpointerdown=e=>{e.preventDefault();setLane(lane-1);};
      container.querySelector('#abRight').onpointerdown=e=>{e.preventDefault();setLane(lane+1);};
      scene.onpointerdown=e=>{e.preventDefault();const r=scene.getBoundingClientRect(),p=(e.clientX-r.left)/r.width;setLane(p<1/3?0:p>2/3?2:1);};
      function playerAttackEffect(){
        player.classList.remove('slash');void player.offsetWidth;player.classList.add('slash');
        const fx=document.createElement('div');fx.className='mg-action-boss-slash';fx.innerHTML='<i></i><i></i><i></i>';scene.appendChild(fx);
        const flash=document.createElement('div');flash.className='mg-action-boss-impact';flash.textContent='✦';scene.appendChild(flash);
        setTimeout(()=>{player.classList.remove('slash');fx.remove();flash.remove();},420);
      }
      container.querySelector('#abAttack').onpointerdown=e=>{e.preventDefault();if(!running)return;if(weak&&performance.now()>weakUntil)weak=false;if(!weak){hint.textContent='まだ隙がない! まずよけよう';return;}weak=false;playerAttackEffect();bossHp--;boss.textContent='ボスHP: '+'💢'.repeat(Math.max(0,bossHp));enemy.classList.add('hit');scene.classList.add('player-hit');setTimeout(()=>{enemy.classList.remove('hit');scene.classList.remove('player-hit');},260);hint.textContent=bossHp<=0?'💥 とどめ!':'⚔️ ヒット!';if(bossHp<=0)setTimeout(()=>finish(true),280);};
      function spawn(now){const l=Math.floor(Math.random()*3),el=document.createElement('div');el.className='mg-action-boss-projectile';el.textContent=Math.random()<.5?'🔥':'💥';scene.appendChild(el);projectiles.push({el,l,born:now});enemy.classList.add('attack');setTimeout(()=>enemy.classList.remove('attack'),180);hint.textContent='攻撃がくる! 別レーンへ!';}
      function frame(now){if(!running)return;if(now<startTime){rafId=requestAnimationFrame(frame);return;}if(now-lastSpawn>1450){spawn(now);lastSpawn=now;}projectiles=projectiles.filter(p=>{const t=clamp((now-p.born)/1050,0,1);p.el.style.left=lanes[p.l]+'%';p.el.style.top=(18+t*68)+'%';p.el.style.transform='translate(-50%,-50%) scale('+(0.45+t)+')';if(t>=1){if(p.l===lane){hits++;scene.classList.add('hit');hint.textContent='くらった!';setTimeout(()=>scene.classList.remove('hit'),150);}else{weak=true;weakUntil=now+1100;enemy.classList.add('weak');hint.textContent='いま攻撃!';setTimeout(()=>{enemy.classList.remove('weak');},1100);}p.el.remove();return false;}return true;});const rem=Math.max(0,DURATION_MS-(now-startTime));timer.textContent='のこり: '+Math.ceil(rem/1000)+'s';if(rem<=0){finish(false);return;}rafId=requestAnimationFrame(frame);}
      function finish(win){if(!running)return;running=false;cancelAnimationFrame(rafId);projectiles.forEach(p=>p.el.remove());hint.textContent=win?'🏆 ボスをたおした!':'時間切れ!';setTimeout(()=>onComplete(win?clamp(100-hits*12,60,100):clamp(50-bossHp*5-hits*8,15,55)),650);}
      rafId=requestAnimationFrame(frame);
    }};
  }
  const ACTION_BOSS_VARIANTS=[mg('action-boss-3d',makeActionBossGame())];
  // --- 落ちものパズル: 左右移動・回転・高速落下・ライン消し ---
  function makeFallingBlockPuzzleGame(){
    return {start(container,onComplete){
      const W=8,H=14,board=Array.from({length:H},()=>Array(W).fill(0));
      const SHAPES=[
        [[1,1,1,1]],
        [[1,1],[1,1]],
        [[0,1,0],[1,1,1]],
        [[1,0],[1,0],[1,1]],
        [[0,1,1],[1,1,0]],
      ];
      let piece=null,px=2,py=0,lines=0,score=0,done=false,rafId;
      const startTime=performance.now()+MG_ACTION_START_GRACE_MS,DURATION_MS=32000;let lastDrop=startTime;
      container.innerHTML=`
        <div class="mg-header"><span id="fbTimer">のこり: 32s</span><span id="fbScore">ライン 0　0pt</span></div>
        <div class="mg-title">ブロックパズル!そろえて消そう</div>
        <div class="mg-falling-wrap"><div class="mg-falling-board" id="fbBoard"></div></div>
        <div class="mg-hint" id="fbHint">◀▶で移動(おしっぱなしOK)　↻で回転　▼おしっぱなしで はやく さげる　⏬で一気に</div>
        <div class="mg-falling-controls"><button class="mg-tap-btn" id="fbLeft" data-hold="step" data-key="left">◀</button><button class="mg-tap-btn" id="fbRight" data-hold="step" data-key="right">▶</button><button class="mg-tap-btn fb-rotate" id="fbRotate" data-key="up">↻ かいてん</button><button class="mg-tap-btn fb-soft" id="fbSoft" data-hold="fast" data-key="down">▼ さげる</button><button class="mg-tap-btn fb-hard" id="fbDrop" data-key="action">⏬ いっきに</button></div>`;
      const boardEl=container.querySelector('#fbBoard'),hint=container.querySelector('#fbHint'),timer=container.querySelector('#fbTimer'),scoreEl=container.querySelector('#fbScore');
      function cloneShape(shape){return shape.map(r=>r.slice());}
      function spawn(){piece=cloneShape(SHAPES[Math.floor(Math.random()*SHAPES.length)]);px=Math.floor((W-piece[0].length)/2);py=0;if(collides(piece,px,py)){finish();return;}render();}
      function collides(shape,x,y){for(let r=0;r<shape.length;r++)for(let q=0;q<shape[r].length;q++)if(shape[r][q]){const bx=x+q,by=y+r;if(bx<0||bx>=W||by>=H||by>=0&&board[by][bx])return true;}return false;}
      function rotateShape(shape){const h=shape.length,w=shape[0].length;return Array.from({length:w},(_,x)=>Array.from({length:h},(_,y)=>shape[h-1-y][x]));}
      function lock(){for(let r=0;r<piece.length;r++)for(let q=0;q<piece[r].length;q++)if(piece[r][q]&&py+r>=0)board[py+r][px+q]=1;clearLines();spawn();}
      function clearLines(){let cleared=0;for(let y=H-1;y>=0;y--){if(board[y].every(Boolean)){board.splice(y,1);board.unshift(Array(W).fill(0));cleared++;y++;}}if(cleared){lines+=cleared;score+=cleared===1?100:cleared===2?260:cleared===3?480:800;hint.textContent=cleared>=3?'✨ まとめ消し!':'ラインを消した!';scoreEl.textContent='ライン '+lines+'　'+score+'pt';}}
      function render(){const cells=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++){let on=board[y][x];if(piece){const ry=y-py,rx=x-px;if(ry>=0&&ry<piece.length&&rx>=0&&rx<piece[0].length&&piece[ry][rx])on=2;}cells.push('<span class="'+(on===2?'active':on===1?'fixed':'')+'"></span>');}boardEl.innerHTML=cells.join('');}
      function move(dx){if(done||!piece)return;if(!collides(piece,px+dx,py)){px+=dx;render();}}
      function rotate(){if(done||!piece)return;const r=rotateShape(piece);for(const kick of [0,-1,1,-2,2]){if(!collides(r,px+kick,py)){piece=r;px+=kick;render();return;}}hint.textContent='ここでは回せない!';}
      function softDrop(){if(done||!piece)return;if(!collides(piece,px,py+1)){py++;score+=1;render();}else lock();}
      function hardDrop(){if(done||!piece)return;let n=0;while(!collides(piece,px,py+1)){py++;n++;}score+=n*2;lock();scoreEl.textContent='ライン '+lines+'　'+score+'pt';}
      container.querySelector('#fbLeft').onpointerdown=e=>{e.preventDefault();move(-1);};
      container.querySelector('#fbRight').onpointerdown=e=>{e.preventDefault();move(1);};
      container.querySelector('#fbRotate').onpointerdown=e=>{e.preventDefault();rotate();};
      container.querySelector('#fbDrop').onpointerdown=e=>{e.preventDefault();hardDrop();};
      container.querySelector('#fbSoft').onpointerdown=e=>{e.preventDefault();softDrop();};
      let swipeStart=null;
      boardEl.onpointerdown=e=>{e.preventDefault();swipeStart={x:e.clientX,y:e.clientY};try{boardEl.setPointerCapture(e.pointerId);}catch(err){}};
      boardEl.onpointerup=e=>{if(!swipeStart)return;const dx=e.clientX-swipeStart.x,dy=e.clientY-swipeStart.y;swipeStart=null;if(Math.max(Math.abs(dx),Math.abs(dy))<18){rotate();return;}if(Math.abs(dx)>Math.abs(dy))move(dx<0?-1:1);else if(dy>0)hardDrop();};
      boardEl.onpointercancel=()=>{swipeStart=null;};
      function frame(now){if(done)return;if(now<startTime){rafId=requestAnimationFrame(frame);return;}const rem=Math.max(0,DURATION_MS-(now-startTime));timer.textContent='のこり: '+Math.ceil(rem/1000)+'s';const interval=Math.max(240,620-lines*18);if(now-lastDrop>interval){lastDrop=now;softDrop();}if(rem<=0){finish();return;}rafId=requestAnimationFrame(frame);}
      function finish(){if(done)return;done=true;cancelAnimationFrame(rafId);hint.textContent='しゅうりょう! '+lines+'ライン消した';const result=clamp(35+lines*10+Math.min(25,score/80),30,100);setTimeout(()=>onComplete(Math.round(result)),650);}
      spawn();rafId=requestAnimationFrame(frame);
    }};
  }
  const FALLING_BLOCK_VARIANTS=[mg('falling-block-puzzle',makeFallingBlockPuzzleGame())];
  // --- クレーンゲーム: 横位置→奥行き→下降→キャッチ ---
  function makeCraneGame(){
    return {start(container,onComplete){
      const prizes=[{e:'🧸',x:24,y:72,v:30},{e:'🎁',x:48,y:68,v:45},{e:'👑',x:72,y:74,v:70}];
      let cx=50,cy=18,phase='aimX',done=false,grabbed=null,moves=0;
      container.innerHTML=`
        <div class="mg-header"><span id="crPhase">① よこ位置</span><span id="crScore">うごかした 0</span></div>
        <div class="mg-title">3Dクレーンゲーム!ねらって景品をつかもう</div>
        <div class="mg-crane-scene" id="crScene"><div class="mg-crane-rail"></div><div class="mg-crane-head" id="crHead">⬇️</div><div class="mg-crane-claw" id="crClaw">🤏</div><div class="mg-crane-prizes" id="crPrizes"></div></div>
        <div class="mg-hint" id="crHint">左右でクレーンを景品の真上へ</div>
        <div class="mg-crane-controls" id="crControls"><button class="mg-tap-btn" id="crLeft">◀</button><button class="mg-tap-btn" id="crNext">けってい</button><button class="mg-tap-btn" id="crRight">▶</button></div>`;
      const scene=container.querySelector('#crScene'),head=container.querySelector('#crHead'),claw=container.querySelector('#crClaw'),prizeEl=container.querySelector('#crPrizes');
      const hint=container.querySelector('#crHint'),phaseEl=container.querySelector('#crPhase'),scoreEl=container.querySelector('#crScore'),controls=container.querySelector('#crControls');
      function renderPrizes(){prizeEl.innerHTML=prizes.map((p,i)=>'<span data-i="'+i+'" style="left:'+p.x+'%;top:'+p.y+'%">'+p.e+'</span>').join('');}
      function render(){head.style.left=cx+'%';head.style.top=Math.min(cy,48)+'%';claw.style.left=cx+'%';claw.style.top=cy+'%';scoreEl.textContent='うごかした '+moves;}
      function moveX(dx){if(done||phase!=='aimX')return;cx=clamp(cx+dx,12,88);moves++;render();}
      function moveY(dy){if(done||phase!=='aimY')return;cy=clamp(cy+dy,18,56);moves++;render();}
      function setPhase(p){phase=p;if(p==='aimY'){phaseEl.textContent='② おく行き';hint.textContent='▲ ▼で おく行きを 景品に あわせる(ずれると つかめない)';controls.innerHTML='<button class="mg-tap-btn" id="crUp" data-hold="step" data-key="up">▲</button><button class="mg-tap-btn" id="crNext2" data-key="action">けってい</button><button class="mg-tap-btn" id="crDown" data-hold="step" data-key="down">▼</button>';container.querySelector('#crUp').onpointerdown=e=>{e.preventDefault();moveY(-6);};container.querySelector('#crDown').onpointerdown=e=>{e.preventDefault();moveY(6);};container.querySelector('#crNext2').onpointerdown=e=>{e.preventDefault();drop();};}}
      function drop(){if(done)return;phase='drop';phaseEl.textContent='③ キャッチ';hint.textContent='クレーン下降中…';controls.innerHTML='';const targetY=cy+22;let start=performance.now(),from=cy;function step(now){const t=clamp((now-start)/650,0,1);cy=from+(targetY-from)*t;render();if(t<1)requestAnimationFrame(step);else grab();}requestAnimationFrame(step);}
      function grab(){let best=null,bestD=999;prizes.forEach((p,i)=>{const dx=(p.x-cx)*1.15,dy=p.y-cy,d=Math.hypot(dx,dy);if(d<bestD){bestD=d;best={p,i};}});grabbed=bestD<11?best:null;if(grabbed){hint.textContent='つかんだ! 戻っている…';const el=prizeEl.querySelector('[data-i="'+grabbed.i+'"]');if(el)el.classList.add('grabbed');}else hint.textContent='つかめなかった…';returnHome();}
      function returnHome(){let start=performance.now(),fromY=cy,fromX=cx;function step(now){const t=clamp((now-start)/800,0,1);cy=fromY+(18-fromY)*t;cx=fromX+(50-fromX)*t;render();if(grabbed){const el=prizeEl.querySelector('[data-i="'+grabbed.i+'"]');if(el){el.style.left=cx+'%';el.style.top=(cy+18)+'%';}}if(t<1)requestAnimationFrame(step);else finish();}requestAnimationFrame(step);}
      function finish(){done=true;phaseEl.textContent='結果';controls.innerHTML='';if(grabbed){hint.textContent=grabbed.p.e+' ゲット!';setTimeout(()=>onComplete(clamp(55+grabbed.p.v-moves*2,55,100)),650);}else{hint.textContent='もう少し!';setTimeout(()=>onComplete(clamp(30-moves,10,35)),650);}}
      container.querySelector('#crLeft').onpointerdown=e=>{e.preventDefault();moveX(-6);};container.querySelector('#crRight').onpointerdown=e=>{e.preventDefault();moveX(6);};container.querySelector('#crLeft').dataset.hold='step';container.querySelector('#crRight').dataset.hold='step';container.querySelector('#crNext').onpointerdown=e=>{e.preventDefault();setPhase('aimY');};
      scene.onpointerdown=e=>{if(done)return;const r=scene.getBoundingClientRect(),px=(e.clientX-r.left)/r.width*100,py=(e.clientY-r.top)/r.height*100;if(phase==='aimX'){cx=clamp(px,12,88);moves++;render();}else if(phase==='aimY'){cy=clamp(py,18,56);moves++;render();}};
      renderPrizes();render();
    }};
  }
  const CRANE_GAME_VARIANTS=[mg('crane-game-3d',makeCraneGame())];
  // --- ピンボール: canvas 物理版 ---
  // ボールは じゅうりょくで かならず したへ おちてくる。プランジャー(はっしゃ)を
  // ながおしで ためて うちだし、フリッパーは おしている あいだ 上がる。
  // バンパー/スリングショット/ターゲットで スコアを かせぎ、3つの ボールを
  // おとしきる まえに 目標点を めざす
  function makePinballGame(){
    return {start(container,onComplete){
      const difficulty=ageDifficulty();
      const DURATION_MS=Math.round(lerp(40000,32000,difficulty));
      const GOAL=Math.round(lerp(900,1300,difficulty)/50)*50;
      const FW=100,FH=122,BR=2.2,G=78,MAX_V=175;
      const LANE_X=90,LANE_GATE_Y=28;
      let balls=3,score=0,running=true,rafId=null,last=null,startTime=null,launched=false;
      let bx=95,by=113,vx=0,vy=0,inLane=true,charging=false,charge=0,chargeDir=1;
      let flashMsg='',flashUntil=0,shake=0,lastKick=0;
      const flippers=[
        {left:true,px:25,py:105,len:17,rest:0.5,up:-0.42,a:0.5,w:0,held:false},
        {left:false,px:65,py:105,len:17,rest:0.5,up:-0.42,a:0.5,w:0,held:false},
      ];
      const bumpers=[{x:26,y:36,r:6.2,v:100,hit:0},{x:64,y:36,r:6.2,v:100,hit:0},{x:45,y:55,r:6.6,v:150,hit:0}];
      const stars=[{x:9,y:62,lit:false,cool:0},{x:81,y:62,lit:false,cool:0}];
      // かべ(線分)。one='above' は うえから しか あたらない(レーンの 一方通行ゲート)。kick は スリングショット
      const walls=[
        {x1:0,y1:22,x2:22,y2:0},{x1:70,y1:0,x2:100,y2:21},
        {x1:LANE_X,y1:LANE_GATE_Y,x2:LANE_X,y2:FH+10},
        {x1:LANE_X,y1:LANE_GATE_Y,x2:100,y2:LANE_GATE_Y,one:'above'},
        {x1:0,y1:66,x2:25,y2:105},{x1:LANE_X,y1:66,x2:65,y2:105},
        {x1:9.6,y1:81,x2:24,y2:90,kick:true},{x1:24,y1:90,x2:17.3,y2:93},
        {x1:80.4,y1:81,x2:66,y2:90,kick:true},{x1:66,y1:90,x2:72.7,y2:93},
      ];
      container.innerHTML=`
        <div class="mg-header"><span id="pbTimer">のこり: ${Math.ceil(DURATION_MS/1000)}s</span><span id="pbScore">0 / ${GOAL}pt　●●●</span></div>
        <div class="mg-title">ピンボール!フリッパーで はじいて ${GOAL}ptを めざそう</div>
        <div class="mg-canvas-wrap mg-pinball-wrap"><canvas class="mg-canvas" id="pbCanvas"></canvas></div>
        <div class="mg-hint" id="pbHint">「はっしゃ」を ながおしで ためて はなす。フリッパーは おしっぱなしで 上がる</div>
        <div class="mg-pinball-controls"><button class="mg-tap-btn mg-hold-btn" id="pbLeft" data-key="left">◀ 左</button><button class="mg-tap-btn mg-launch-btn" id="pbLaunch" data-key="action">はっしゃ</button><button class="mg-tap-btn mg-hold-btn" id="pbRight" data-key="right">右 ▶</button></div>`;
      const canvas=container.querySelector('#pbCanvas');
      const {ctx,W,H}=createMgCanvas(canvas,(w)=>w*FH/FW);
      const S=W/FW;
      const timer=container.querySelector('#pbTimer'),scoreEl=container.querySelector('#pbScore'),hint=container.querySelector('#pbHint');
      const launchBtn=container.querySelector('#pbLaunch');
      const say=(msg,ms=900)=>{flashMsg=msg;flashUntil=performance.now()+ms;hint.textContent=msg;};
      bindHeldButton(container.querySelector('#pbLeft'),(v)=>{flippers[0].held=v;});
      bindHeldButton(container.querySelector('#pbRight'),(v)=>{flippers[1].held=v;});
      bindHeldButton(launchBtn,(v)=>{if(!running)return;if(v){if(inLane&&!launched){charging=true;charge=0;chargeDir=1;}}else if(charging){charging=false;launch();}});
      // フィールドを タッチ: 左はんぶん=左フリッパー、右はんぶん=右フリッパー(おしている あいだ)
      const touches=new Map();
      canvas.addEventListener('pointerdown',(e)=>{e.preventDefault();const p=mgPointerPos(canvas,e);const side=p.nx<0.5?0:1;touches.set(e.pointerId,side);flippers[side].held=true;try{canvas.setPointerCapture(e.pointerId);}catch(err){}});
      const endTouch=(e)=>{const side=touches.get(e.pointerId);if(side===undefined)return;touches.delete(e.pointerId);if(![...touches.values()].includes(side))flippers[side].held=false;};
      canvas.addEventListener('pointerup',endTouch);canvas.addEventListener('pointercancel',endTouch);
      function launch(){
        if(!inLane||launched)return;
        const power=charge;
        if(power<0.18){say('よわすぎ! もっと ながく ためよう');charge=0;return;}
        launched=true;vy=-(96+68*power);vx=(Math.random()-.5)*4;
        if(startTime===null)startTime=performance.now();
        launchBtn.disabled=true;
        say(power>0.85?'フルパワー!':'はっしゃ!');
      }
      function resetBall(){bx=95;by=113;vx=0;vy=0;inLane=true;launched=false;charge=0;launchBtn.disabled=false;}
      function addScore(n,msg){score+=n;if(msg)say(msg);}
      function collideSegment(w){
        if(w.one==='above'&&by>w.y1)return;
        const dx=w.x2-w.x1,dy=w.y2-w.y1,len2=dx*dx+dy*dy||1;
        let t=((bx-w.x1)*dx+(by-w.y1)*dy)/len2;t=clamp(t,0,1);
        const cx=w.x1+dx*t,cy=w.y1+dy*t;let nx=bx-cx,ny=by-cy;const d=Math.hypot(nx,ny);
        if(d>=BR||d===0)return;
        nx/=d;ny/=d;bx=cx+nx*BR;by=cy+ny*BR;
        const vn=vx*nx+vy*ny;
        if(vn<0){const e=w.kick?1.0:0.55;vx-=(1+e)*vn*nx;vy-=(1+e)*vn*ny;
          if(w.kick){const sp=Math.hypot(vx,vy);const want=Math.max(sp,70);vx=vx/sp*want;vy=vy/sp*want;const now=performance.now();if(now-lastKick>120){lastKick=now;addScore(30,'スリングショット! +30');shake=3;}}
          else{vx*=0.985;vy*=0.985;}}
      }
      function collideFlipper(f,dt){
        const dirx=(f.left?1:-1)*Math.cos(f.a),diry=Math.sin(f.a);
        const tx=f.px+dirx*f.len,ty=f.py+diry*f.len;
        const dx=tx-f.px,dy=ty-f.py,len2=dx*dx+dy*dy;
        let t=((bx-f.px)*dx+(by-f.py)*dy)/len2;t=clamp(t,0,1);
        const cx=f.px+dx*t,cy=f.py+dy*t;let nx=bx-cx,ny=by-cy;const d=Math.hypot(nx,ny);
        const R=BR+1.5;if(d>=R||d===0)return;
        nx/=d;ny/=d;bx=cx+nx*R;by=cy+ny*R;
        // フリッパー表面の そくど(かいてん × はんけい)
        const rx=cx-f.px,ry=cy-f.py,wz=f.left?f.w:-f.w;
        const sx=-wz*ry,sy=wz*rx;
        const relx=vx-sx,rely=vy-sy;const vn=relx*nx+rely*ny;
        if(vn<0){vx-=(1+0.35)*vn*nx;vy-=(1+0.35)*vn*ny;}
        const sn=sx*nx+sy*ny;
        if(sn>0){vx+=nx*sn*1.15;vy+=ny*sn*1.15;}
      }
      function step(dt){
        // フリッパーの かいてん
        for(const f of flippers){const target=f.held?f.up:f.rest;const speed=f.held?15:9;const prev=f.a;if(f.a>target)f.a=Math.max(target,f.a-speed*dt);else if(f.a<target)f.a=Math.min(target,f.a+speed*dt);f.w=(f.a-prev)/dt;}
        if(inLane&&!launched){return;}
        vy+=G*dt;
        const sp=Math.hypot(vx,vy);if(sp>MAX_V){vx*=MAX_V/sp;vy*=MAX_V/sp;}
        const sub=Math.max(1,Math.min(10,Math.ceil(sp*dt/0.9)));const h=dt/sub;
        for(let i=0;i<sub;i++){
          bx+=vx*h;by+=vy*h;
          if(bx<BR){bx=BR;vx=Math.abs(vx)*0.6;}if(bx>FW-BR){bx=FW-BR;vx=-Math.abs(vx)*0.6;}if(by<BR){by=BR;vy=Math.abs(vy)*0.6;}
          for(const w of walls)collideSegment(w);
          for(const f of flippers)collideFlipper(f,dt);
          for(const b of bumpers){let nx=bx-b.x,ny=by-b.y;const d=Math.hypot(nx,ny);if(d<b.r+BR&&d>0){nx/=d;ny/=d;bx=b.x+nx*(b.r+BR);by=b.y+ny*(b.r+BR);const vn=vx*nx+vy*ny;if(vn<0){vx-=2*vn*nx;vy-=2*vn*ny;}const s2=Math.hypot(vx,vy);const want=Math.max(s2*0.92,66);vx=vx/s2*want;vy=vy/s2*want;if(performance.now()-b.hit>140){b.hit=performance.now();addScore(b.v,'バンパー! +'+b.v);shake=4;}}}
          if(inLane&&by<LANE_GATE_Y-BR){inLane=false;say('フィールドへ!');}
        }
        for(const s of stars){if(s.cool>0)s.cool-=dt;if(!s.lit&&s.cool<=0&&Math.hypot(bx-s.x,by-s.y)<3.6+BR){s.lit=true;s.cool=1;addScore(50,'★ターゲット! +50');if(stars.every(q=>q.lit)){addScore(200,'★★ ダブルボーナス! +200');setTimeout(()=>stars.forEach(q=>{q.lit=false;}),400);}}}
        if(by>FH+BR*2){balls--;shake=6;if(balls<=0){finish(false);return;}say('ボールを おとした… のこり '+balls,1400);resetBall();}
      }
      function draw(now){
        if(!ctx)return;
        ctx.save();ctx.clearRect(0,0,W,H);
        if(shake>0){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake=Math.max(0,shake-0.6);}
        const bg=ctx.createRadialGradient(W*.45,H*.2,10,W*.5,H*.5,H);bg.addColorStop(0,'#2f5486');bg.addColorStop(.6,'#17263c');bg.addColorStop(1,'#0b111a');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
        // レーン
        ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(LANE_X*S,LANE_GATE_Y*S,(FW-LANE_X)*S,(FH-LANE_GATE_Y)*S);
        // ドレイン(あな)
        ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(25*S,(FH-4)*S,40*S,6*S);
        // かべ
        ctx.lineCap='round';ctx.lineWidth=3;ctx.strokeStyle='#9aa8bd';
        for(const w of walls){ctx.beginPath();ctx.moveTo(w.x1*S,w.y1*S);ctx.lineTo(w.x2*S,w.y2*S);ctx.strokeStyle=w.kick?'#ff9ad1':w.one?'rgba(154,168,189,.35)':'#9aa8bd';ctx.stroke();}
        // スリングショットの 三かく
        ctx.fillStyle='rgba(255,120,190,.22)';for(const tri of [[9.6,81,24,90,17.3,93],[80.4,81,66,90,72.7,93]]){ctx.beginPath();ctx.moveTo(tri[0]*S,tri[1]*S);ctx.lineTo(tri[2]*S,tri[3]*S);ctx.lineTo(tri[4]*S,tri[5]*S);ctx.closePath();ctx.fill();}
        // ターゲット
        for(const s of stars){ctx.font=`${Math.round(6.5*S)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.globalAlpha=s.lit?1:0.45;ctx.fillStyle=s.lit?'#fff27a':'#8fa2c0';ctx.fillText('★',s.x*S,s.y*S);ctx.globalAlpha=1;}
        // バンパー
        for(const b of bumpers){const hot=now-b.hit<160;const g=ctx.createRadialGradient(b.x*S-2,b.y*S-3,1,b.x*S,b.y*S,b.r*S);g.addColorStop(0,hot?'#ffffff':'#ffe98a');g.addColorStop(1,hot?'#ffb347':'#d9741c');ctx.beginPath();ctx.arc(b.x*S,b.y*S,b.r*S*(hot?1.12:1),0,Math.PI*2);ctx.fillStyle=g;ctx.shadowColor='rgba(255,190,60,.8)';ctx.shadowBlur=hot?18:8;ctx.fill();ctx.shadowBlur=0;ctx.lineWidth=2;ctx.strokeStyle='#fff3c4';ctx.stroke();ctx.fillStyle='#4a2a08';ctx.font=`bold ${Math.round(3.6*S)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(b.v),b.x*S,b.y*S);}
        // フリッパー
        for(const f of flippers){const dirx=(f.left?1:-1)*Math.cos(f.a),diry=Math.sin(f.a);ctx.beginPath();ctx.moveTo(f.px*S,f.py*S);ctx.lineTo((f.px+dirx*f.len)*S,(f.py+diry*f.len)*S);ctx.lineWidth=3*S;ctx.lineCap='round';ctx.strokeStyle=f.held?'#fff0a0':'#f2cf4f';ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=4;ctx.stroke();ctx.shadowBlur=0;ctx.beginPath();ctx.arc(f.px*S,f.py*S,1.6*S,0,Math.PI*2);ctx.fillStyle='#8a6a1c';ctx.fill();}
        // プランジャー(ため ゲージ)
        if(inLane&&!launched){const gh=(FH-118)*S;const gy=118*S;ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect((LANE_X+1)*S,gy,8*S,gh);ctx.fillStyle=charge>0.85?'#ff5c8a':charge>0.4?'#ffd257':'#8de0a0';ctx.fillRect((LANE_X+1)*S,gy+gh*(1-charge),8*S,gh*charge);
          ctx.fillStyle='rgba(255,255,255,.75)';ctx.font=`${Math.round(4*S)}px sans-serif`;ctx.textAlign='center';ctx.fillText(charging?'ため中…':'はっしゃ を ながおし',60*S,113*S);}
        // ボール
        const g2=ctx.createRadialGradient(bx*S-1,by*S-1.2,0.5,bx*S,by*S,BR*S);g2.addColorStop(0,'#ffffff');g2.addColorStop(.5,'#d8dee7');g2.addColorStop(1,'#6a7584');ctx.beginPath();ctx.arc(bx*S,by*S,BR*S,0,Math.PI*2);ctx.fillStyle=g2;ctx.shadowColor='rgba(255,255,255,.6)';ctx.shadowBlur=6;ctx.fill();ctx.shadowBlur=0;
        if(now<flashUntil){ctx.globalAlpha=Math.min(1,(flashUntil-now)/300);ctx.fillStyle='#fff';ctx.font=`bold ${Math.round(5*S)}px sans-serif`;ctx.textAlign='center';ctx.fillText(flashMsg,45*S,16*S);ctx.globalAlpha=1;}
        ctx.restore();
      }
      function frame(now){
        if(!running)return;
        if(last===null)last=now;const dt=Math.min(0.033,(now-last)/1000);last=now;
        if(charging)charge=Math.min(1,charge+dt/0.9);
        step(dt);
        if(!running)return;
        scoreEl.textContent=score+' / '+GOAL+'pt　'+'●'.repeat(Math.max(0,balls));
        if(startTime!==null){const rem=Math.max(0,DURATION_MS-(now-startTime));timer.textContent='のこり: '+Math.ceil(rem/1000)+'s';if(rem<=0){finish(score>=GOAL);return;}}
        if(score>=GOAL){finish(true);return;}
        draw(now);
        rafId=requestAnimationFrame(frame);
      }
      function finish(clear){
        if(!running)return;running=false;cancelAnimationFrame(rafId);
        container.querySelectorAll('button').forEach(b=>b.disabled=true);
        hint.textContent=clear?'🎉 目標スコア達成! '+score+'pt':'しゅうりょう! '+score+'pt';
        draw(performance.now());
        const result=clear?clamp(74+balls*8+Math.min(10,(score-GOAL)/50),74,100):clamp(20+score/GOAL*52,20,70);
        setTimeout(()=>onComplete(Math.round(result)),750);
      }
      draw(performance.now());
      rafId=requestAnimationFrame(frame);
    }};
  }
  const PINBALL_VARIANTS=[mg('pinball-physics',makePinballGame())];
  // --- 3Dおばけ屋敷: 一人称の やしきで かぎを さがし、おいかけてくる ゆうれいから にげて 出口へ ---
  function makeHauntedHouseGame() {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const COLS = 13, ROWS = 11;
        const map = generateMaze(COLS, ROWS, 5);
        const DURATION_MS = Math.round(lerp(70000, 55000, difficulty));
        const SPEED = 2.4, TURN = 2.5;
        const GHOST_WANDER = 0.8, GHOST_HUNT = lerp(1.45, 1.85, difficulty);
        const start = { x: 1, y: 1 };
        const d0 = mazeBfs(map, start.x, start.y);
        const keyCell = pickFarCell(map, [d0], [start]);
        const dKey = mazeBfs(map, keyCell.x, keyCell.y);
        const exit = pickFarCell(map, [d0, dKey], [start, keyCell]);
        let px = start.x + 0.5, py = start.y + 0.5, ang = facingOpenDir(map, start.x, start.y);
        let gx = exit.x + 0.5, gy = exit.y + 0.5, gPath = [], gRepath = 0, gTarget = null;
        let hasKey = false, running = true, rafId = null, last = null, msg = '', msgUntil = 0, shake = 0, nearMs = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        const seen = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
        const decor = [];
        for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) {
          if (map[y][x] !== '.' || (x === start.x && y === start.y)) continue;
          if ((x === keyCell.x && y === keyCell.y) || (x === exit.x && y === exit.y)) continue;
          if (Math.random() < 0.12) decor.push({ x: x + 0.5, y: y + 0.5, emoji: ['🕸️', '🕯️', '🪦', '🎃'][Math.floor(Math.random() * 4)], scale: 0.32, lift: 0.3 });
        }
        container.innerHTML = `
          <div class="mg-header"><span id="hhTimer">のこり: ${Math.ceil(DURATION_MS / 1000)}s</span><span id="hhKey">🔑 なし</span></div>
          <div class="mg-title">3Dおばけ屋敷!かぎを 見つけて 出口から にげろ</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="hhCanvas"></canvas></div>
          <div class="mg-hint" id="hhHint">↶↷で むきを かえ、▲で すすむ(おしっぱなしOK)。かぎを とると ゆうれいが おいかけてくる!</div>
          <div class="mg-fp-controls"><button class="mg-tap-btn" id="hhTurnL" data-key="left">↶</button><button class="mg-tap-btn primary" id="hhForward" data-key="up">▲ すすむ</button><button class="mg-tap-btn" id="hhBack" data-key="down">▼</button><button class="mg-tap-btn" id="hhTurnR" data-key="right">↷</button></div>`;
        const canvas = container.querySelector('#hhCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 215);
        const view = createRaycastView(ctx, W, H, { wallA: '#8c80a4', wallB: '#635878', ceilingTop: '#0a080e', ceilingBottom: '#241d30', floorFar: '#1a1622', floorNear: '#463a52', fog: 0.1, vignette: 'rgba(0,0,0,.65)' });
        const controls = bindFirstPersonControls(container, canvas, { left: '#hhTurnL', right: '#hhTurnR', fwd: '#hhForward', back: '#hhBack' });
        const timerEl = container.querySelector('#hhTimer'), keyEl = container.querySelector('#hhKey'), hint = container.querySelector('#hhHint');
        const say = (t, ms = 1500) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        function ghostStep(dt, now) {
          const speed = hasKey ? GHOST_HUNT : GHOST_WANDER;
          const gcx = Math.floor(gx), gcy = Math.floor(gy);
          if (now > gRepath || !gPath.length) {
            gRepath = now + (hasKey ? 350 : 900);
            let target;
            if (hasKey) target = { x: Math.floor(px), y: Math.floor(py) };
            else {
              if (!gTarget || (gTarget.x === gcx && gTarget.y === gcy) || Math.random() < 0.15) {
                const cand = [];
                for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) if (map[y][x] === '.') cand.push({ x, y });
                gTarget = cand[Math.floor(Math.random() * cand.length)];
              }
              target = gTarget;
            }
            const dist = mazeBfs(map, target.x, target.y);
            gPath = [];
            let cx = gcx, cy = gcy, guard = 0;
            while (dist[cy][cx] > 0 && guard++ < 200) {
              let next = null;
              for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = cx + dx, ny = cy + dy;
                if (map[ny] && map[ny][nx] === '.' && dist[ny][nx] >= 0 && dist[ny][nx] < dist[cy][cx]) { next = { x: nx, y: ny }; break; }
              }
              if (!next) break;
              gPath.push(next); cx = next.x; cy = next.y;
            }
          }
          const goal = gPath.length ? { x: gPath[0].x + 0.5, y: gPath[0].y + 0.5 } : (hasKey ? { x: px, y: py } : null);
          if (!goal) return;
          const dx = goal.x - gx, dy = goal.y - gy, d = Math.hypot(dx, dy);
          const stepLen = Math.min(d, speed * dt);
          if (d > 1e-4) { gx += dx / d * stepLen; gy += dy / d * stepLen; }
          if (d <= speed * dt + 0.02 && gPath.length) gPath.shift();
        }
        function sprites(now) {
          const bob = Math.sin(now / 260) * 0.04;
          const list = decor.slice();
          if (!hasKey) list.push({ x: keyCell.x + 0.5, y: keyCell.y + 0.5, emoji: '🔑', scale: 0.45, lift: 0.28 + bob, glow: 'rgba(255,230,120,.95)' });
          list.push({ x: exit.x + 0.5, y: exit.y + 0.5, emoji: '🚪', scale: 0.85, lift: 0.02, glow: hasKey ? 'rgba(120,255,160,.9)' : undefined });
          const flicker = 0.75 + Math.sin(now / 90) * 0.15;
          list.push({ x: gx, y: gy, emoji: '👻', scale: 0.7, lift: 0.22 + bob * 2, alpha: flicker, glow: 'rgba(200,200,255,.9)' });
          return list;
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          let ghostDist = Math.hypot(gx - px, gy - py);
          if (now >= startTime) {
            ang += controls.turn() * TURN * dt + controls.consumeDragTurn();
            const mv = controls.move() * SPEED * dt;
            if (mv !== 0) [px, py] = rcMove(map, px, py, Math.cos(ang) * mv, Math.sin(ang) * mv);
            markSeen(seen, map, px, py);
            ghostStep(dt, now);
            const cx = Math.floor(px), cy = Math.floor(py);
            if (!hasKey && cx === keyCell.x && cy === keyCell.y) { hasKey = true; keyEl.textContent = '🔑 もってる'; say('🔑 かぎを とった! ゆうれいが きづいた… 出口へ にげろ!', 2200); shake = 4; }
            ghostDist = Math.hypot(gx - px, gy - py);
            if (ghostDist < 0.55) { finish('caught'); return; }
            if (cx === exit.x && cy === exit.y) { if (hasKey) { finish('escaped'); return; } if (now > msgUntil) say('🚪 かぎが かかっている! 先に 🔑を さがそう'); }
          }
          const rem = Math.max(0, DURATION_MS - Math.max(0, now - startTime));
          timerEl.textContent = 'のこり: ' + Math.ceil(rem / 1000) + 's';
          if (rem <= 0) { finish('timeout'); return; }
          const danger = hasKey && ghostDist < 3.5;
          if (danger) nearMs += dt * 1000;
          if (ctx) {
            ctx.save();
            if (shake > 0) { ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); shake = Math.max(0, shake - 0.5); }
            const pulse = danger ? 0.35 + 0.3 * Math.abs(Math.sin(now / 160)) : 0;
            view.render(map, px, py, ang, sprites(now), { vignette: danger ? `rgba(120,0,25,${0.55 + pulse})` : undefined });
            ctx.restore();
            const ghostSeen = ghostDist < 4;
            view.drawMinimap(map, px, py, ang, seen, [
              { x: keyCell.x, y: keyCell.y, color: '#ffd45c', hidden: hasKey || !seen[keyCell.y][keyCell.x] },
              { x: exit.x, y: exit.y, color: '#7dff9a', hidden: !seen[exit.y][exit.x] },
              { x: Math.floor(gx), y: Math.floor(gy), color: '#d6d0ff', hidden: !ghostSeen },
            ]);
            if (hasKey) view.drawCompass(px, py, ang, exit.x + 0.5, exit.y + 0.5, '出口', '#7dff9a');
            else view.drawCompass(px, py, ang, keyCell.x + 0.5, keyCell.y + 0.5, 'かぎ', '#ffd45c');
            if (now < msgUntil) view.drawMessage(msg, Math.min(1, (msgUntil - now) / 300));
            else if (now < startTime) view.drawMessage('🔑を 見つけて 🚪から だっしゅつ!');
            else if (danger) view.drawMessage('👻 ちかい! にげろ!');
          }
          rafId = requestAnimationFrame(frame);
        }
        function finish(result) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const elapsedSec = Math.max(0, performance.now() - startTime) / 1000;
          let score;
          if (result === 'escaped') { score = clamp(100 - Math.max(0, elapsedSec - 25) * 1.4, 70, 100); say('🚪 だっしゅつ せいこう!'); }
          else if (result === 'caught') { score = hasKey ? 34 : 22; say('👻 つかまった…'); shake = 8; }
          else { score = hasKey ? 40 : 25; say('じかんぎれ… やしきに とじこめられた'); }
          if (ctx) { view.render(map, px, py, ang, sprites(performance.now()), { vignette: result === 'escaped' ? 'rgba(20,60,20,.6)' : 'rgba(80,0,20,.8)' }); view.drawMessage(hint.textContent); }
          setTimeout(() => onComplete(Math.round(score)), 900);
        }
        markSeen(seen, map, px, py);
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const HAUNTED_HOUSE_VARIANTS=[mg('haunted-house-3d',makeHauntedHouseGame())];
  // ================================================================
  // 3D新作: レース / リズムハイウェイ / たまころがし迷路 / スペースガンナー
  // (すべて canvas 2D + requestAnimationFrame。外部ライブラリなし)
  // ================================================================

  // --- ぎじ3D ロードエンジン(3Dレース・ゲレンデ きょうつう) ---
  // セグメントごとの カーブ/おかを カメラから とうえいして、手前から
  // おくへ ならぶ 台形で 道を 描く。スプライトは 道はば きじゅんの
  // offset(0=まん中, ±1=道はし)と size(道はば に たいする わりあい)で おく
  function createPseudoRoad(ctx, W, H, opts) {
    const SEG_LEN = 200, ROAD_W = opts.roadWidth || 1100, RUMBLE = 3, CAM_H = 1000, DRAW_DIST = opts.drawDistance || 70;
    const CAM_DEPTH = 1 / Math.tan((100 / 2) * Math.PI / 180);
    const PLAYER_Z = CAM_H * CAM_DEPTH;
    const segments = [];
    const easeIn = (a, b, p) => a + (b - a) * p * p;
    const easeInOut = (a, b, p) => a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + 0.5);
    const lastY = () => (segments.length ? segments[segments.length - 1].p2.world.y : 0);
    function addSeg(curve, y) {
      const n = segments.length;
      segments.push({ index: n, p1: { world: { y: lastY(), z: n * SEG_LEN }, camera: {}, screen: {} }, p2: { world: { y, z: (n + 1) * SEG_LEN }, camera: {}, screen: {} }, curve, sprites: [], dynamic: [], dark: Math.floor(n / RUMBLE) % 2 === 0, clip: 0 });
    }
    function addRoad(enter, hold, leave, curve, hill) {
      const startY = lastY(), endY = startY + hill * SEG_LEN, total = enter + hold + leave;
      for (let n = 0; n < enter; n++) addSeg(easeIn(0, curve, n / enter), easeInOut(startY, endY, n / total));
      for (let n = 0; n < hold; n++) addSeg(curve, easeInOut(startY, endY, (enter + n) / total));
      for (let n = 0; n < leave; n++) addSeg(easeInOut(curve, 0, n / leave), easeInOut(startY, endY, (enter + hold + n) / total));
    }
    const findSegment = (z) => segments[Math.floor(Math.max(0, z) / SEG_LEN) % segments.length];
    const trackLength = () => segments.length * SEG_LEN;
    function project(p, camX, camY, camZ) {
      p.camera.x = (p.world.x || 0) - camX; p.camera.y = p.world.y - camY; p.camera.z = p.world.z - camZ;
      p.screen.scale = CAM_DEPTH / Math.max(1, p.camera.z);
      p.screen.x = W / 2 + p.screen.scale * p.camera.x * W / 2;
      p.screen.y = H / 2 - p.screen.scale * p.camera.y * H / 2;
      p.screen.w = p.screen.scale * ROAD_W * W / 2;
    }
    function polygon(x1, y1, x2, y2, x3, y3, x4, y4, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.closePath(); ctx.fill(); }
    function drawSegment(seg) {
      const p1 = seg.p1.screen, p2 = seg.p2.screen;
      const c = opts.colors(seg.dark);
      const r1 = p1.w * (c.rumbleWidth || 1 / 6), r2 = p2.w * (c.rumbleWidth || 1 / 6), l1 = p1.w / 28, l2 = p2.w / 28;
      ctx.fillStyle = c.grass; ctx.fillRect(0, p2.y, W, p1.y - p2.y);
      if (c.rumble) {
        polygon(p1.x - p1.w - r1, p1.y, p1.x - p1.w, p1.y, p2.x - p2.w, p2.y, p2.x - p2.w - r2, p2.y, c.rumble);
        polygon(p1.x + p1.w + r1, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x + p2.w + r2, p2.y, c.rumble);
      }
      polygon(p1.x - p1.w, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x - p2.w, p2.y, c.road);
      if (c.lane) polygon(p1.x - l1, p1.y, p1.x + l1, p1.y, p2.x + l2, p2.y, p2.x - l2, p2.y, c.lane);
    }
    // position: カメラの きょり、playerX: 道はば きじゅんの よこ位置(-1..1 が 道の うえ)
    function render(position, playerX) {
      const baseSeg = findSegment(position);
      const basePercent = (position % SEG_LEN) / SEG_LEN;
      const playerSeg = findSegment(position + PLAYER_Z);
      const playerPercent = ((position + PLAYER_Z) % SEG_LEN) / SEG_LEN;
      const playerY = playerSeg.p1.world.y + (playerSeg.p2.world.y - playerSeg.p1.world.y) * playerPercent;
      let maxy = H, x = 0, dx = -(baseSeg.curve * basePercent);
      const len = trackLength();
      for (let n = 0; n < DRAW_DIST; n++) {
        const seg = segments[(baseSeg.index + n) % segments.length];
        const looped = seg.index < baseSeg.index;
        seg.clip = maxy;
        project(seg.p1, playerX * ROAD_W - x, playerY + CAM_H, position - (looped ? len : 0));
        x += dx; dx += seg.curve;
        project(seg.p2, playerX * ROAD_W - x, playerY + CAM_H, position - (looped ? len : 0));
        if (seg.p1.camera.z <= CAM_DEPTH || seg.p2.screen.y >= seg.p1.screen.y || seg.p2.screen.y >= maxy) continue;
        drawSegment(seg);
        maxy = seg.p1.screen.y;
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      for (let n = DRAW_DIST - 1; n > 0; n--) {
        const seg = segments[(baseSeg.index + n) % segments.length];
        if (seg.p1.camera.z <= CAM_DEPTH) continue;
        const scale = seg.p1.screen.scale;
        const drawOne = (s) => {
          const sx = seg.p1.screen.x + scale * s.offset * ROAD_W * W / 2;
          const sy = seg.p1.screen.y;
          if (sy > seg.clip + 2) return;
          const px = Math.max(3, scale * ROAD_W * W / 2 * s.size);
          if (s.draw) s.draw(ctx, sx, sy, px, s);
          else { ctx.font = `${px}px sans-serif`; ctx.fillText(s.emoji, sx, sy + px * 0.08); }
        };
        for (const s of seg.sprites) drawOne(s);
        for (const s of seg.dynamic) drawOne(s);
      }
      return { baseSeg, playerSeg, playerY };
    }
    return { SEG_LEN, ROAD_W, PLAYER_Z, segments, addRoad, addSeg, lastY, findSegment, trackLength, render };
  }
  function mgRoundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + rr, y); ctx.lineTo(x + w - rr, y); ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr); ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h); ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr); ctx.lineTo(x, y + rr); ctx.quadraticCurveTo(x, y, x + rr, y); ctx.closePath(); ctx.fill();
  }
  function mgShade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) * k), g = Math.min(255, ((n >> 8) & 255) * k), b = Math.min(255, (n & 255) * k);
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }
  // うしろから 見た くるま(しんこう方向を むいている)。x,y は そこの まん中
  function drawRearCar(ctx, x, y, w, color, lean = 0, sporty = false) {
    const h = w * 0.62;
    ctx.save(); ctx.translate(x, y); ctx.rotate(lean * 0.08);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, -h * 0.02, w * 0.56, h * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b1b21'; mgRoundRect(ctx, -w * 0.52, -h * 0.42, w * 0.18, h * 0.44, w * 0.04); mgRoundRect(ctx, w * 0.34, -h * 0.42, w * 0.18, h * 0.44, w * 0.04);
    ctx.fillStyle = color; mgRoundRect(ctx, -w * 0.46, -h * 0.78, w * 0.92, h * 0.72, w * 0.08);
    ctx.fillStyle = mgShade(color, 0.72); mgRoundRect(ctx, -w * 0.46, -h * 0.3, w * 0.92, h * 0.22, w * 0.04);
    if (sporty) { ctx.fillStyle = mgShade(color, 0.6); mgRoundRect(ctx, -w * 0.42, -h * 1.02, w * 0.84, h * 0.08, w * 0.02); ctx.fillRect(-w * 0.4, -h * 1.02, w * 0.05, h * 0.26); ctx.fillRect(w * 0.35, -h * 1.02, w * 0.05, h * 0.26); }
    ctx.fillStyle = mgShade(color, 0.85); mgRoundRect(ctx, -w * 0.32, -h * 1.06, w * 0.64, h * 0.4, w * 0.08);
    ctx.fillStyle = 'rgba(70,90,120,.92)'; mgRoundRect(ctx, -w * 0.28, -h * 1.0, w * 0.56, h * 0.28, w * 0.05);
    ctx.fillStyle = '#ff5a4a'; mgRoundRect(ctx, -w * 0.42, -h * 0.66, w * 0.16, h * 0.13, w * 0.02); mgRoundRect(ctx, w * 0.26, -h * 0.66, w * 0.16, h * 0.13, w * 0.02);
    ctx.fillStyle = '#e8e8f0'; ctx.fillRect(-w * 0.1, -h * 0.5, w * 0.2, h * 0.1);
    ctx.restore();
  }
  // うしろから 見た スキーヤー/スノーボーダー。lean で かたむく、air で うかぶ
  function drawRider(ctx, x, y, w, style, lean = 0, air = 0) {
    const h = w * 1.35;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.5 * (1 - air * 0.35), h * 0.08 * (1 - air * 0.35), 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(0, -air * h * 0.55); ctx.rotate(lean * 0.35);
    ctx.fillStyle = style.board;
    if (style.kind === 'ski') { mgRoundRect(ctx, -w * 0.42, -h * 0.08, w * 0.3, h * 0.08, w * 0.04); mgRoundRect(ctx, w * 0.12, -h * 0.08, w * 0.3, h * 0.08, w * 0.04); }
    else { mgRoundRect(ctx, -w * 0.5, -h * 0.1, w * 1.0, h * 0.1, w * 0.06); }
    ctx.fillStyle = '#2b2f3a'; mgRoundRect(ctx, -w * 0.28, -h * 0.5, w * 0.2, h * 0.45, w * 0.05); mgRoundRect(ctx, w * 0.08, -h * 0.5, w * 0.2, h * 0.45, w * 0.05);
    ctx.fillStyle = style.jacket; mgRoundRect(ctx, -w * 0.34, -h * 0.95, w * 0.68, h * 0.5, w * 0.12);
    ctx.fillStyle = mgShade(style.jacket, 0.75); ctx.fillRect(-w * 0.34, -h * 0.72, w * 0.68, h * 0.06);
    ctx.fillStyle = style.helmet; ctx.beginPath(); ctx.arc(0, -h * 1.05, w * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe1b8'; ctx.fillRect(-w * 0.12, -h * 1.02, w * 0.24, h * 0.07);
    if (style.kind === 'ski') { ctx.strokeStyle = '#888'; ctx.lineWidth = Math.max(1, w * 0.04); ctx.beginPath(); ctx.moveTo(-w * 0.4, -h * 0.75); ctx.lineTo(-w * 0.5, -h * 0.1); ctx.moveTo(w * 0.4, -h * 0.75); ctx.lineTo(w * 0.5, -h * 0.1); ctx.stroke(); }
    ctx.restore();
  }

  // --- 3Dレース: ぎじ3Dの ロードを はしり、カーブの えんしんりょくと
  //     こうつうを さばきながら 時間内に ゴールを めざす ---
  function makeRoadRaceGame({ title, playerColor, trafficColors, sceneryEmojis, sky, ground, road: roadColors, rumble }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const TIME_LIMIT_MS = Math.round(lerp(52000, 44000, difficulty));
        const CENTRIFUGAL = 0.34;
        let position = 0, speed = 0, playerX = 0, steer = 0, steerTarget = 0, accelHeld = false, touchAccel = false, touchSteer = null;
        let hits = 0, offroadTime = 0, running = true, rafId = null, last = null, flash = 0, msg = '', msgUntil = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="rcTimer">のこり: ${Math.ceil(TIME_LIMIT_MS / 1000)}s</span><span id="rcSpeed">0 km/h</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="rcCanvas"></canvas></div>
          <div class="mg-hint" id="rcHint">アクセルを おしっぱなしで かそく。カーブでは 外に ふられるので ◀▶で おさえよう</div>
          <div class="mg-race-controls"><button class="mg-tap-btn mg-hold-btn" id="rcLeft" data-key="left">◀</button><button class="mg-tap-btn mg-hold-btn primary" id="rcAccel" data-key="action">アクセル</button><button class="mg-tap-btn mg-hold-btn" id="rcRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#rcCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 215);
        const road = createPseudoRoad(ctx, W, H, { colors: (dark) => (dark ? { grass: ground[0], rumble: rumble[0], road: roadColors[0], lane: '#fff8c8' } : { grass: ground[1], rumble: rumble[1], road: roadColors[1] }) });
        const { SEG_LEN, PLAYER_Z, segments } = road;
        const MAX_SPEED = SEG_LEN * 60;
        const ACCEL = MAX_SPEED / 3.4, COAST = -MAX_SPEED / 4.5, OFF_DECEL = -MAX_SPEED / 1.4, OFF_LIMIT = MAX_SPEED / 4;
        road.addRoad(10, 25, 10, 0, 0);
        for (let i = 0; i < 9; i++) {
          const dir = Math.random() < 0.5 ? -1 : 1;
          const curve = dir * (2 + Math.random() * 3 + difficulty * 1.5);
          road.addRoad(12 + Math.floor(Math.random() * 10), 14 + Math.floor(Math.random() * 14), 12 + Math.floor(Math.random() * 10), curve, (Math.random() - 0.5) * 60);
          if (Math.random() < 0.6) road.addRoad(8, 8 + Math.floor(Math.random() * 12), 8, 0, (Math.random() - 0.5) * 40);
        }
        road.addRoad(10, 40, 10, 0, -road.lastY() / SEG_LEN);
        const FINISH_INDEX = segments.length - 12;
        const TRACK_LEN = road.trackLength();
        for (let n = 0; n < FINISH_INDEX; n += 3) {
          if (Math.random() < 0.7) segments[n].sprites.push({ emoji: sceneryEmojis[Math.floor(Math.random() * sceneryEmojis.length)], offset: -1.4 - Math.random() * 1.6, size: 0.55 });
          if (Math.random() < 0.7) segments[n].sprites.push({ emoji: sceneryEmojis[Math.floor(Math.random() * sceneryEmojis.length)], offset: 1.4 + Math.random() * 1.6, size: 0.55 });
        }
        for (let n = FINISH_INDEX; n < FINISH_INDEX + 2; n++) { segments[n].sprites.push({ emoji: '🏁', offset: -1.25, size: 0.5 }); segments[n].sprites.push({ emoji: '🏁', offset: 1.25, size: 0.5 }); }
        const cars = [];
        const carCount = Math.round(lerp(9, 16, difficulty));
        for (let i = 0; i < carCount; i++) {
          const z = (30 + Math.random() * (FINISH_INDEX - 45)) * SEG_LEN;
          if (cars.some((c) => Math.abs(c.z - z) < SEG_LEN * 5)) { i--; continue; }
          const color = trafficColors[Math.floor(Math.random() * trafficColors.length)];
          cars.push({ z, offset: (Math.random() < 0.5 ? -1 : 1) * (0.15 + Math.random() * 0.5), speed: MAX_SPEED * (0.28 + Math.random() * 0.3), size: 0.32, draw: (c, sx, sy, px) => drawRearCar(c, sx, sy, px, color, 0, false) });
        }
        const timerEl = container.querySelector('#rcTimer'), speedEl = container.querySelector('#rcSpeed'), hint = container.querySelector('#rcHint');
        let leftHeld = false, rightHeld = false;
        bindHeldButton(container.querySelector('#rcLeft'), (v) => { leftHeld = v; });
        bindHeldButton(container.querySelector('#rcRight'), (v) => { rightHeld = v; });
        bindHeldButton(container.querySelector('#rcAccel'), (v) => { accelHeld = v; });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (err) {} touchAccel = true; touchSteer = clamp((mgPointerPos(canvas, e).nx - 0.5) * 2.6, -1, 1); });
        canvas.addEventListener('pointermove', (e) => { if (!touchAccel) return; touchSteer = clamp((mgPointerPos(canvas, e).nx - 0.5) * 2.6, -1, 1); });
        const endTouch = () => { touchAccel = false; touchSteer = null; };
        canvas.addEventListener('pointerup', endTouch); canvas.addEventListener('pointercancel', endTouch);
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        function render(now) {
          if (!ctx) return;
          const skyG = ctx.createLinearGradient(0, 0, 0, H * 0.6); skyG.addColorStop(0, sky[0]); skyG.addColorStop(1, sky[1]);
          ctx.fillStyle = skyG; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = 'rgba(255,255,255,.35)';
          for (let i = 0; i < 5; i++) { const cx = ((i * 97 + 20) - (position / 400) * 0.35) % (W + 60); ctx.beginPath(); ctx.ellipse((cx + W + 60) % (W + 60) - 30, 22 + i * 9, 22, 7, 0, 0, Math.PI * 2); ctx.fill(); }
          road.render(position, playerX);
          const bounce = speed > 0 ? (Math.random() - 0.5) * 1.4 * (speed / MAX_SPEED) : 0;
          drawRearCar(ctx, W / 2 + steer * 5, H - 8 + bounce, 46, playerColor, steer, true);
          const progress = clamp((position + PLAYER_Z) / (FINISH_INDEX * SEG_LEN), 0, 1);
          ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(8, 8, W - 16, 8);
          ctx.fillStyle = '#7dff9a'; ctx.fillRect(8, 8, (W - 16) * progress, 8);
          ctx.font = '11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#fff';
          ctx.fillText('🏁 ' + Math.round(progress * 100) + '%', 8, 19);
          if (flash > 0) { ctx.fillStyle = `rgba(255,80,80,${flash})`; ctx.fillRect(0, 0, W, H); flash = Math.max(0, flash - 0.04); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(W / 2 - 90, H / 2 - 40, 180, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2 - 27); }
        }
        function update(dt) {
          const speedPct = speed / MAX_SPEED;
          const playerSeg = road.findSegment(position + PLAYER_Z);
          steerTarget = touchSteer != null ? touchSteer : (rightHeld ? 1 : 0) - (leftHeld ? 1 : 0);
          steer += (steerTarget - steer) * Math.min(1, dt * 9);
          position += speed * dt;
          playerX += steer * dt * 2.1 * speedPct;
          playerX -= dt * 2 * speedPct * speedPct * playerSeg.curve * CENTRIFUGAL;
          if (accelHeld || touchAccel) speed += ACCEL * dt; else speed += COAST * dt;
          const offroad = Math.abs(playerX) > 1;
          if (offroad) { offroadTime += dt; if (speed > OFF_LIMIT) speed += OFF_DECEL * dt; }
          playerX = clamp(playerX, -2.2, 2.2);
          speed = clamp(speed, 0, MAX_SPEED);
          for (const seg of segments) seg.dynamic.length = 0;
          for (const c of cars) {
            c.z += c.speed * dt;
            if (c.z >= TRACK_LEN) c.z -= TRACK_LEN;
            road.findSegment(c.z).dynamic.push(c);
            const rel = c.z - (position + PLAYER_Z);
            if (rel > -SEG_LEN * 0.6 && rel < SEG_LEN * 1.2 && Math.abs(playerX - c.offset) < 0.34 && speed > c.speed) {
              speed = c.speed * 0.6; hits++; flash = 0.5; say('💥 ぶつかった!');
              c.z += SEG_LEN * 2;
            }
          }
          speedEl.textContent = Math.round(speedPct * 240) + ' km/h';
          if (position + PLAYER_Z >= FINISH_INDEX * SEG_LEN) finish(true);
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt);
          if (!running) return;
          const rem = Math.max(0, TIME_LIMIT_MS - Math.max(0, now - startTime));
          timerEl.textContent = 'のこり: ' + Math.ceil(rem / 1000) + 's';
          render(now);
          if (now < startTime && ctx) { ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText('READY…', W / 2, H / 2 - 30); ctx.shadowBlur = 0; }
          if (rem <= 0) { finish(false); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish(win) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const remRatio = clamp(1 - (performance.now() - startTime) / TIME_LIMIT_MS, 0, 1);
          const progress = clamp((position + PLAYER_Z) / (FINISH_INDEX * SEG_LEN), 0, 1);
          let score;
          if (win) { score = clamp(62 + remRatio * 34 - hits * 5 - Math.min(12, offroadTime * 2), 55, 100); say('🏁 ゴール! ' + (hits === 0 ? 'ノーミス!' : 'しょうとつ ' + hits + 'かい')); }
          else { score = clamp(14 + progress * 44, 14, 58); say('タイムアップ… ' + Math.round(progress * 100) + '% まで はしった'); }
          render(performance.now());
          setTimeout(() => onComplete(Math.round(score)), 800);
        }
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const RACE_THEMES = [
    { title: '3Dレース!ハイウェイを はしりぬけ ゴールへ', playerColor: '#e63946', trafficColors: ['#3a86ff', '#ffbe0b', '#8ecae6', '#f4f1de', '#6a994e'], sceneryEmojis: ['🌴', '🌳', '🏢', '🪧'], sky: ['#69b7ff', '#d9f1ff'], ground: ['#4f9f4a', '#5aae52'], road: ['#5c5c66', '#63636d'], rumble: ['#f3f3f3', '#d8383c'] },
    { title: '3Dレース!さばくの ラリーで 先頭を めざせ', playerColor: '#ff8c1a', trafficColors: ['#9d8189', '#d8e2dc', '#5c4033', '#457b9d'], sceneryEmojis: ['🌵', '🪨', '🏜️', '🌵'], sky: ['#ffb366', '#ffe6b3'], ground: ['#d9b36a', '#e2bf78'], road: ['#8a7355', '#93795a'], rumble: ['#f2e2c4', '#c0392b'] },
    { title: '3Dレース!よるの ネオンハイウェイを かけぬけろ', playerColor: '#b5179e', trafficColors: ['#4cc9f0', '#f72585', '#ffd60a', '#e0e0e0'], sceneryEmojis: ['🏙️', '🌃', '🗼', '🏬'], sky: ['#0b1030', '#3a2a6b'], ground: ['#1e2740', '#242e4a'], road: ['#2f3140', '#353748'], rumble: ['#8f9bff', '#ff4fa3'] },
  ];
  const ROAD_RACE_VARIANTS = [mg('race-3d', randomThemeGame(makeRoadRaceGame, RACE_THEMES))];

  // --- 3Dリズムハイウェイ: おくから ながれてくる ノーツを 3レーンで
  //     ジャストタイミングで たたく ---
  function makeRhythmHighwayGame({ title, noteEmojis, colors }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const BPM = lerp(96, 126, difficulty), BEAT = 60000 / BPM, APPROACH = lerp(1700, 1350, difficulty);
        const LENGTH_MS = 26000;
        const notes = [];
        let lastLane = -1, sameCount = 0;
        for (let t = 2200, k = 0; t < LENGTH_MS - 1200; t += BEAT / 2, k++) {
          const onBeat = k % 2 === 0;
          const p = onBeat ? lerp(0.55, 0.78, difficulty) : lerp(0.18, 0.45, difficulty);
          if (Math.random() >= p) continue;
          let lane = Math.floor(Math.random() * 3);
          if (lane === lastLane) { sameCount++; if (sameCount >= 2) { lane = (lane + 1 + Math.floor(Math.random() * 2)) % 3; sameCount = 0; } } else sameCount = 0;
          lastLane = lane;
          notes.push({ t, lane, hit: false, missed: false, emoji: noteEmojis[lane] });
          if (onBeat && Math.random() < lerp(0.04, 0.22, difficulty)) notes.push({ t, lane: (lane + 1 + Math.floor(Math.random() * 2)) % 3, hit: false, missed: false, emoji: noteEmojis[(lane + 1) % 3] });
        }
        const total = notes.length;
        let perfect = 0, good = 0, miss = 0, combo = 0, maxCombo = 0, running = true, rafId = null;
        let judge = '', judgeUntil = 0, judgeColor = '#fff';
        const laneFlash = [0, 0, 0];
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        const effects = [];
        container.innerHTML = `
          <div class="mg-header"><span id="rhScore">PERFECT 0 / GOOD 0 / MISS 0</span><span id="rhCombo">コンボ 0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="rhCanvas"></canvas></div>
          <div class="mg-hint" id="rhHint">ノーツが 手前の ラインに かさなった しゅんかんに、その レーンの ボタンを タップ!</div>
          <div class="mg-rhythm-controls"><button class="mg-tap-btn" id="rhL" data-key="left">◀ ${noteEmojis[0]}</button><button class="mg-tap-btn" id="rhM" data-key="action">${noteEmojis[1]}</button><button class="mg-tap-btn" id="rhR" data-key="right">${noteEmojis[2]} ▶</button></div>`;
        const canvas = container.querySelector('#rhCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 215);
        const scoreEl = container.querySelector('#rhScore'), comboEl = container.querySelector('#rhCombo'), hint = container.querySelector('#rhHint');
        const HORIZON = 34, LINE_Y = H - 34;
        const laneX = (lane, p) => { const far = W / 2 + (lane - 1) * W * 0.07, near = W / 2 + (lane - 1) * W * 0.3; return far + (near - far) * p; };
        const laneY = (p) => HORIZON + (LINE_Y - HORIZON) * p;
        function press(lane) {
          if (!running) return;
          const now = performance.now() - startTime;
          laneFlash[lane] = 1;
          let best = null;
          for (const n of notes) { if (n.hit || n.missed || n.lane !== lane) continue; const d = Math.abs(n.t - now); if (d <= 170 && (!best || d < best.d)) best = { n, d }; }
          if (!best) { setJudge('…', '#aab'); return; }
          best.n.hit = true; combo++; maxCombo = Math.max(maxCombo, combo);
          if (best.d <= 60) { perfect++; setJudge('PERFECT!', '#ffe36e'); effects.push({ lane, born: now, color: '#ffe36e' }); }
          else { good++; setJudge('GOOD', '#8ef0ff'); effects.push({ lane, born: now, color: '#8ef0ff' }); }
          updateHud();
        }
        function setJudge(t, c) { judge = t; judgeColor = c; judgeUntil = performance.now() + 420; }
        function updateHud() { scoreEl.textContent = `PERFECT ${perfect} / GOOD ${good} / MISS ${miss}`; comboEl.textContent = 'コンボ ' + combo; }
        ['#rhL', '#rhM', '#rhR'].forEach((id, i) => container.querySelector(id).addEventListener('pointerdown', (e) => { e.preventDefault(); press(i); }));
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); const p = mgPointerPos(canvas, e); press(p.nx < 1 / 3 ? 0 : p.nx > 2 / 3 ? 2 : 1); });
        function render(now) {
          if (!ctx) return;
          const beatPhase = ((now % BEAT) / BEAT);
          const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, colors[0]); bg.addColorStop(1, colors[1]);
          ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = `rgba(255,255,255,${0.08 * (1 - beatPhase)})`; ctx.fillRect(0, 0, W, H);
          // ハイウェイ
          ctx.fillStyle = 'rgba(0,0,0,.35)';
          ctx.beginPath(); ctx.moveTo(laneX(0, 0) - W * 0.045, HORIZON); ctx.lineTo(laneX(2, 0) + W * 0.045, HORIZON); ctx.lineTo(laneX(2, 1) + W * 0.17, H); ctx.lineTo(laneX(0, 1) - W * 0.17, H); ctx.closePath(); ctx.fill();
          for (let lane = 0; lane < 3; lane++) {
            if (laneFlash[lane] > 0) { ctx.fillStyle = `rgba(255,255,255,${laneFlash[lane] * 0.22})`; ctx.beginPath(); ctx.moveTo(laneX(lane, 0) - W * 0.04, HORIZON); ctx.lineTo(laneX(lane, 0) + W * 0.04, HORIZON); ctx.lineTo(laneX(lane, 1) + W * 0.16, H); ctx.lineTo(laneX(lane, 1) - W * 0.16, H); ctx.closePath(); ctx.fill(); laneFlash[lane] = Math.max(0, laneFlash[lane] - 0.08); }
          }
          ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
          for (const edge of [-0.5, 0.5, 1.5, 2.5]) { ctx.beginPath(); ctx.moveTo(laneX(edge, 0), HORIZON); ctx.lineTo(laneX(edge, 1), H); ctx.stroke(); }
          for (let i = 0; i < 6; i++) { const p = ((i / 6 + beatPhase / 6) % 1); const pp = p * p; ctx.strokeStyle = `rgba(255,255,255,${0.1 + pp * 0.25})`; ctx.beginPath(); ctx.moveTo(laneX(-0.5, pp), laneY(pp)); ctx.lineTo(laneX(2.5, pp), laneY(pp)); ctx.stroke(); }
          // 判定ライン
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.moveTo(laneX(-0.5, 1), LINE_Y); ctx.lineTo(laneX(2.5, 1), LINE_Y); ctx.stroke(); ctx.shadowBlur = 0;
          for (let lane = 0; lane < 3; lane++) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(laneX(lane, 1), LINE_Y, 15, 0, Math.PI * 2); ctx.stroke(); }
          // ノーツ
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          for (const n of notes) {
            const z = 1 - (n.t - now) / APPROACH;
            if (z < 0 || z > 1.18 || n.hit) continue;
            const p = z * z;
            const size = 8 + 26 * p;
            ctx.globalAlpha = n.missed ? 0.3 : Math.min(1, 0.3 + z);
            ctx.font = `${size}px sans-serif`;
            ctx.fillText(n.emoji, laneX(n.lane, Math.min(1.18, p)), laneY(Math.min(1.18, p)));
            ctx.globalAlpha = 1;
          }
          for (const fx of effects) { const age = (now - fx.born) / 350; if (age > 1) continue; ctx.strokeStyle = fx.color; ctx.globalAlpha = 1 - age; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(laneX(fx.lane, 1), LINE_Y, 15 + age * 26, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
          if (performance.now() < judgeUntil) { ctx.font = 'bold 20px sans-serif'; ctx.fillStyle = judgeColor; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText(judge, W / 2, H / 2 - 6); ctx.shadowBlur = 0; }
          if (combo >= 5) { ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 5; ctx.fillText(combo + ' COMBO', W / 2, H / 2 + 20); ctx.shadowBlur = 0; }
          if (now < 0) { ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText('リズムに のって…', W / 2, H / 2 - 30); ctx.shadowBlur = 0; }
        }
        function frame(nowAbs) {
          if (!running) return;
          const now = nowAbs - startTime;
          for (const n of notes) if (!n.hit && !n.missed && now > n.t + 170) { n.missed = true; miss++; combo = 0; setJudge('MISS', '#ff7a7a'); updateHud(); }
          render(now);
          if (now > LENGTH_MS) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const pts = perfect * 3 + good * 2;
          const score = clamp(Math.round(pts / Math.max(1, total * 3) * 100), 8, 100);
          hint.textContent = `けっか: PERFECT ${perfect} / GOOD ${good} / MISS ${miss}　さいだいコンボ ${maxCombo}`;
          setTimeout(() => onComplete(score), 900);
        }
        updateHud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const RHYTHM_THEMES = [
    { title: 'リズムハイウェイ!ながれてくる ノーツを ジャストで たたけ', noteEmojis: ['🥁', '🎸', '🎹'], colors: ['#1a0f3a', '#4b1f7a'] },
    { title: 'おかしの リズムロード!リズムに のって タップ', noteEmojis: ['🍩', '🍭', '🍪'], colors: ['#3a1030', '#8a2d6b'] },
    { title: 'うちゅう リズムハイウェイ!ほしを タイミングよく キャッチ', noteEmojis: ['🌟', '🪐', '☄️'], colors: ['#020a1e', '#0d2a5c'] },
  ];
  const RHYTHM_HIGHWAY_VARIANTS = [mg('rhythm-highway-3d', randomThemeGame(makeRhythmHighwayGame, RHYTHM_THEMES))];

  // --- たまころがし迷路: ばんを かたむけて ボールを ころがし、あなを
  //     よけながら ゴールへ。ドラッグ(ジョイスティック)か 十字キーで かたむける ---
  function makeTiltMazeGame({ title, ballEmoji, goalEmoji, palette }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const N = 9;
        const map = generateMaze(N, N, 2);
        const DURATION_MS = Math.round(lerp(50000, 40000, difficulty));
        const start = { x: 1, y: 1 };
        const d0 = mazeBfs(map, 1, 1);
        const goal = pickFarCell(map, [d0], [start]);
        const holes = [];
        const floor = [];
        for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) if (map[y][x] === '.' && d0[y][x] >= 3) floor.push({ x, y });
        floor.sort(() => Math.random() - 0.5);
        const holeCount = Math.round(lerp(2, 4, difficulty));
        for (const c of floor) {
          if (holes.length >= holeCount) break;
          if ([goal, ...holes].some((p) => Math.abs(p.x - c.x) + Math.abs(p.y - c.y) < 3)) continue;
          holes.push(c);
        }
        container.innerHTML = `
          <div class="mg-header"><span id="tmTimer">のこり: ${Math.ceil(DURATION_MS / 1000)}s</span><span id="tmLives">❤️❤️❤️</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="tmCanvas"></canvas></div>
          <div class="mg-hint" id="tmHint">ばんを ドラッグして かたむける(十字ボタンでも OK)。あなに おちないよう ${goalEmoji}へ</div>
          <div class="mg-tilt-dpad"><span></span><button class="mg-tap-btn mg-hold-btn" id="tmUp" data-key="up">▲</button><span></span><button class="mg-tap-btn mg-hold-btn" id="tmLeft" data-key="left">◀</button><button class="mg-tap-btn mg-hold-btn" id="tmDown" data-key="down">▼</button><button class="mg-tap-btn mg-hold-btn" id="tmRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#tmCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const CELL = W / N, R = CELL * 0.27, G = CELL * 58;
        const timerEl = container.querySelector('#tmTimer'), livesEl = container.querySelector('#tmLives'), hint = container.querySelector('#tmHint');
        let bx = (start.x + 0.5) * CELL, by = (start.y + 0.5) * CELL, vx = 0, vy = 0, tiltX = 0, tiltY = 0;
        let lives = 3, falls = 0, running = true, rafId = null, last = null, falling = 0, msg = '', msgUntil = 0, bestD = d0[goal.y][goal.x];
        const held = { up: false, down: false, left: false, right: false };
        let joy = null;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        for (const k of ['Up', 'Down', 'Left', 'Right']) bindHeldButton(container.querySelector('#tm' + k), (v) => { held[k.toLowerCase()] = v; });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); const p = mgPointerPos(canvas, e); joy = { id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointermove', (e) => { if (!joy || e.pointerId !== joy.id) return; const p = mgPointerPos(canvas, e); joy.x = p.x; joy.y = p.y; });
        const endJoy = (e) => { if (joy && e.pointerId === joy.id) joy = null; };
        canvas.addEventListener('pointerup', endJoy); canvas.addEventListener('pointercancel', endJoy);
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const isWall = (cx, cy) => cx < 0 || cy < 0 || cx >= N || cy >= N || map[cy][cx] === '#';
        function collide() {
          const cx = Math.floor(bx / CELL), cy = Math.floor(by / CELL);
          for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) {
            if (!isWall(x, y)) continue;
            const rx = x * CELL, ry = y * CELL;
            const nx = clamp(bx, rx, rx + CELL), ny = clamp(by, ry, ry + CELL);
            let dx = bx - nx, dy = by - ny; const d = Math.hypot(dx, dy);
            if (d >= R) continue;
            if (d === 0) { dx = bx - (rx + CELL / 2); dy = by - (ry + CELL / 2); if (Math.abs(dx) > Math.abs(dy)) { dy = 0; } else { dx = 0; } const dd = Math.hypot(dx, dy) || 1; dx /= dd; dy /= dd; bx = nx + dx * R; by = ny + dy * R; } else { dx /= d; dy /= d; bx = nx + dx * R; by = ny + dy * R; }
            const vn = vx * dx + vy * dy;
            if (vn < 0) { vx -= (1 + 0.3) * vn * dx; vy -= (1 + 0.3) * vn * dy; }
          }
        }
        function update(dt, now) {
          if (falling > 0) { falling -= dt; if (falling <= 0) { bx = (start.x + 0.5) * CELL; by = (start.y + 0.5) * CELL; vx = vy = 0; } return; }
          let tx = (held.right ? 1 : 0) - (held.left ? 1 : 0), ty = (held.down ? 1 : 0) - (held.up ? 1 : 0);
          if (joy) { tx = clamp((joy.x - joy.ox) / 42, -1, 1); ty = clamp((joy.y - joy.oy) / 42, -1, 1); }
          tiltX += (tx - tiltX) * Math.min(1, dt * 8); tiltY += (ty - tiltY) * Math.min(1, dt * 8);
          vx += tiltX * G * dt; vy += tiltY * G * dt;
          const damp = Math.pow(0.28, dt); vx *= damp; vy *= damp;
          const sp = Math.hypot(vx, vy), cap = CELL * 14; if (sp > cap) { vx *= cap / sp; vy *= cap / sp; }
          const sub = Math.max(1, Math.ceil(sp * dt / (R * 0.8)));
          for (let i = 0; i < sub; i++) { bx += vx * dt / sub; collide(); by += vy * dt / sub; collide(); }
          const cx = Math.floor(bx / CELL), cy = Math.floor(by / CELL);
          for (const h of holes) if (Math.hypot(bx - (h.x + 0.5) * CELL, by - (h.y + 0.5) * CELL) < CELL * 0.24) { lives--; falls++; livesEl.textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(3 - Math.max(0, lives)); falling = 0.7; say(lives > 0 ? '🕳️ あなに おちた! スタートに もどる' : '🕳️ おちてしまった…'); if (lives <= 0) { finish(false); } return; }
          if (!isWall(cx, cy) && d0[cy][cx] >= 0) bestD = Math.min(bestD, Math.abs(cx - goal.x) + Math.abs(cy - goal.y));
          if (Math.hypot(bx - (goal.x + 0.5) * CELL, by - (goal.y + 0.5) * CELL) < CELL * 0.36) finish(true);
        }
        function render(now) {
          if (!ctx) return;
          ctx.save(); ctx.clearRect(0, 0, W, H);
          ctx.fillStyle = palette.frame; ctx.fillRect(0, 0, W, H);
          // ばんの かたむき(ぎじ3D): かたむいた がわが すこし ちぢんで しずむ
          ctx.translate(W / 2, H / 2);
          ctx.transform(1 - Math.abs(tiltX) * 0.05, 0, 0, 1 - Math.abs(tiltY) * 0.05, tiltX * 5, tiltY * 5);
          ctx.translate(-W / 2, -H / 2);
          const ex = -tiltX * 3, ey = 4 - tiltY * 3;
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            if (map[y][x] === '#') continue;
            ctx.fillStyle = (x + y) % 2 ? palette.floorA : palette.floorB; ctx.fillRect(x * CELL, y * CELL, CELL + 0.5, CELL + 0.5);
          }
          for (const h of holes) { const g = ctx.createRadialGradient((h.x + 0.5) * CELL, (h.y + 0.5) * CELL, 1, (h.x + 0.5) * CELL, (h.y + 0.5) * CELL, CELL * 0.34); g.addColorStop(0, '#000'); g.addColorStop(0.7, '#111'); g.addColorStop(1, 'rgba(0,0,0,.15)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc((h.x + 0.5) * CELL, (h.y + 0.5) * CELL, CELL * 0.34, 0, Math.PI * 2); ctx.fill(); }
          ctx.font = `${CELL * 0.7}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(255,230,120,.9)'; ctx.shadowBlur = 10; ctx.fillText(goalEmoji, (goal.x + 0.5) * CELL, (goal.y + 0.5) * CELL + 1); ctx.shadowBlur = 0;
          // かべ(そくめん → うわめん)
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (map[y][x] !== '#') continue; ctx.fillStyle = palette.wallSide; ctx.fillRect(x * CELL + ex, y * CELL + ey, CELL + 0.5, CELL + 0.5); }
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (map[y][x] !== '#') continue; ctx.fillStyle = palette.wallTop; ctx.fillRect(x * CELL, y * CELL, CELL + 0.5, CELL + 0.5); }
          // ボール
          const shrink = falling > 0 ? Math.max(0.05, falling / 0.7) : 1;
          ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(bx + 3 - tiltX * 2, by + 4 - tiltY * 2, R * shrink, R * 0.7 * shrink, 0, 0, Math.PI * 2); ctx.fill();
          if (ballEmoji) { ctx.font = `${R * 2.2 * shrink}px sans-serif`; ctx.fillText(ballEmoji, bx, by + 1); }
          else { const g = ctx.createRadialGradient(bx - R * 0.35, by - R * 0.4, 1, bx, by, R); g.addColorStop(0, '#fff'); g.addColorStop(0.4, palette.ball); g.addColorStop(1, palette.ballDark); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, R * shrink, 0, Math.PI * 2); ctx.fill(); }
          ctx.restore();
          if (joy) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(joy.ox, joy.oy, 30, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(joy.ox + tiltX * 30, joy.oy + tiltY * 30, 10, 0, Math.PI * 2); ctx.fill(); }
          if (now < msgUntil) { ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 100, H / 2 - 14, 200, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2); }
          if (now < startTime) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 100, H / 2 - 14, 200, 28); ctx.fillStyle = '#fff'; ctx.fillText('ばんを かたむけて ' + goalEmoji + ' へ!', W / 2, H / 2); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.04, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt, now);
          if (!running) return;
          const rem = Math.max(0, DURATION_MS - Math.max(0, now - startTime));
          timerEl.textContent = 'のこり: ' + Math.ceil(rem / 1000) + 's';
          render(now);
          if (rem <= 0) { finish(false); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish(win) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const elapsed = Math.max(0, performance.now() - startTime) / 1000;
          let score;
          if (win) { score = clamp(100 - falls * 12 - Math.max(0, elapsed - 18) * 1.5, 55, 100); say('🎉 ゴール!' + (falls === 0 ? ' ノーミス!' : '')); }
          else { const prog = 1 - bestD / Math.max(1, d0[goal.y][goal.x]); score = clamp(15 + prog * 30, 15, 45); say(lives <= 0 ? 'ボールが なくなった…' : 'じかんぎれ…'); }
          render(performance.now());
          setTimeout(() => onComplete(Math.round(score)), 800);
        }
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const TILT_MAZE_THEMES = [
    { title: 'たまころがし迷路!ばんを かたむけて ゴールへ', ballEmoji: '', goalEmoji: '⭐', palette: { frame: '#5b3b1e', floorA: '#e8d3a8', floorB: '#e0c99a', wallTop: '#a86f3a', wallSide: '#6e4522', ball: '#9fc4e8', ballDark: '#3b6a99' } },
    { title: 'こおりの たまころがし!すべる ばんで ゴールを めざせ', ballEmoji: '', goalEmoji: '🏁', palette: { frame: '#284a6e', floorA: '#d9f1ff', floorB: '#cbe8fb', wallTop: '#7fb8e6', wallSide: '#3f7bb0', ball: '#ffd27a', ballDark: '#b97a12' } },
    { title: 'おかしの たまころがし!あめだまを ゴールへ ころがそう', ballEmoji: '🍬', goalEmoji: '🎁', palette: { frame: '#7a2d5a', floorA: '#ffe4f0', floorB: '#ffd6e8', wallTop: '#ff8fbf', wallSide: '#b8467f', ball: '#fff', ballDark: '#999' } },
  ];
  const TILT_MAZE_VARIANTS = [mg('tilt-maze-3d', randomThemeGame(makeTiltMazeGame, TILT_MAZE_THEMES))];

  // --- スペースガンナー: 一人称の しょうじゅんを うごかして、おくから
  //     せまる てきを うちおとす。てきの こうげきを うける まえに たおせ ---
  function makeSpaceGunnerGame({ title, enemyEmojis, bossEmoji }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = Math.round(lerp(30000, 26000, difficulty));
        const SPAWN_MS = lerp(1200, 780, difficulty), APPROACH = lerp(1.15, 1.7, difficulty);
        let shields = 3, kills = 0, shots = 0, running = true, rafId = null, last = null, lastSpawn = 0, lastShot = -1, shake = 0, redFlash = 0;
        let enemies = [], particles = [], lasers = [], bolts = [];
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="sgTimer">のこり: ${Math.ceil(DURATION_MS / 1000)}s</span><span id="sgScore">🛡️🛡️🛡️　げきは 0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="sgCanvas"></canvas></div>
          <div class="mg-hint" id="sgHint">ドラッグで しょうじゅんを あわせ、タップ/うつ で はっしゃ。赤く なった てきは こうげき ちょくぜん!</div>
          <div class="mg-gunner-controls"><button class="mg-tap-btn mg-hold-btn" id="sgLeft" data-key="left">◀</button><button class="mg-tap-btn mg-hold-btn" id="sgUp" data-key="up">▲</button><button class="mg-tap-btn primary" id="sgFire" data-key="action">うつ!</button><button class="mg-tap-btn mg-hold-btn" id="sgDown" data-key="down">▼</button><button class="mg-tap-btn mg-hold-btn" id="sgRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#sgCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 225);
        const timerEl = container.querySelector('#sgTimer'), scoreEl = container.querySelector('#sgScore'), hint = container.querySelector('#sgHint');
        const F = W * 0.55;
        let cx = W / 2, cy = H / 2;
        const held = { left: false, right: false, up: false, down: false };
        for (const k of ['Left', 'Right', 'Up', 'Down']) bindHeldButton(container.querySelector('#sg' + k), (v) => { held[k.toLowerCase()] = v; });
        container.querySelector('#sgFire').addEventListener('pointerdown', (e) => { e.preventDefault(); fire(); });
        let drag = null;
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); const p = mgPointerPos(canvas, e); drag = { id: e.pointerId, x: p.x, y: p.y, moved: 0 }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; const p = mgPointerPos(canvas, e); cx = clamp(cx + (p.x - drag.x) * 1.15, 10, W - 10); cy = clamp(cy + (p.y - drag.y) * 1.15, 10, H - 10); drag.moved += Math.abs(p.x - drag.x) + Math.abs(p.y - drag.y); drag.x = p.x; drag.y = p.y; });
        const endDrag = (e) => { if (!drag || e.pointerId !== drag.id) return; if (drag.moved < 8) fire(); drag = null; };
        canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
        const stars = Array.from({ length: 70 }, () => ({ x: (Math.random() - 0.5) * 2.4, y: (Math.random() - 0.5) * 2.4, z: 0.4 + Math.random() * 6 }));
        function panX() { return (cx - W / 2) * 0.28; }
        function panY() { return (cy - H / 2) * 0.28; }
        function projectE(e) { const z = Math.max(0.25, e.z); return { sx: W / 2 + (e.x * F) / z - panX(), sy: H / 2 + (e.y * F) / z - panY(), size: F * 0.5 / z }; }
        function updateHud() { scoreEl.textContent = '🛡️'.repeat(Math.max(0, shields)) + '💔'.repeat(3 - Math.max(0, shields)) + '　げきは ' + kills; }
        function spawn(now) {
          const boss = kills > 0 && kills % 6 === 0 && !enemies.some((e) => e.boss);
          enemies.push({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 1.2, z: 7.5, vz: -APPROACH * (boss ? 0.7 : 0.85 + Math.random() * 0.35), vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.25, emoji: boss ? bossEmoji : enemyEmojis[Math.floor(Math.random() * enemyEmojis.length)], hp: boss ? 3 : 1, boss, state: 'approach', stateAt: now, hitFlash: 0 });
        }
        function fire() {
          if (!running) return;
          const now = performance.now();
          if (now < startTime || now - lastShot < 170) return;
          lastShot = now; shots++;
          lasers.push({ born: now, x: cx, y: cy });
          let target = null, bestD = 1e9;
          for (const e of enemies) { if (e.state === 'flee') continue; const p = projectE(e); const d = Math.hypot(p.sx - cx, p.sy - cy); if (d < p.size * 0.6 + 7 && d < bestD) { bestD = d; target = e; } }
          if (!target) return;
          target.hp--; target.hitFlash = 1;
          const p = projectE(target);
          if (target.hp <= 0) {
            kills++; updateHud();
            for (let i = 0; i < 12; i++) particles.push({ x: p.sx, y: p.sy, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, born: now, color: target.boss ? '#ffd45c' : '#8ef0ff' });
            enemies = enemies.filter((e) => e !== target);
            hint.textContent = target.boss ? '💥 ボスを げきは!' : 'げきは! ' + kills + 'き';
          } else hint.textContent = 'ヒット! あと ' + target.hp + 'はつ';
        }
        function update(dt, now) {
          const mv = 200 * dt;
          cx = clamp(cx + ((held.right ? 1 : 0) - (held.left ? 1 : 0)) * mv, 10, W - 10);
          cy = clamp(cy + ((held.down ? 1 : 0) - (held.up ? 1 : 0)) * mv, 10, H - 10);
          if (now - lastSpawn > SPAWN_MS && enemies.length < 6) { spawn(now); lastSpawn = now; }
          for (const s of stars) { s.z -= dt * 2.2; if (s.z < 0.3) { s.z = 6.5; s.x = (Math.random() - 0.5) * 2.4; s.y = (Math.random() - 0.5) * 2.4; } }
          for (const e of enemies) {
            e.z += e.vz * dt; e.x += e.vx * dt; e.y += e.vy * dt;
            if (Math.abs(e.x) > 1.1) e.vx *= -1; if (Math.abs(e.y) > 0.7) e.vy *= -1;
            if (e.hitFlash > 0) e.hitFlash -= dt * 4;
            if (e.state === 'approach' && e.z <= 1.9) { e.state = 'aim'; e.stateAt = now; e.vz = 0; e.vx *= 0.3; e.vy *= 0.3; }
            else if (e.state === 'aim' && now - e.stateAt > (e.boss ? 1000 : 800)) {
              e.state = 'flee'; e.stateAt = now; e.vz = 4;
              shields--; updateHud(); shake = 8; redFlash = 0.55;
              const p = projectE(e); bolts.push({ born: now, x: p.sx, y: p.sy });
              hint.textContent = 'こうげきを うけた! シールド ' + Math.max(0, shields);
              if (shields <= 0) { finish(); return; }
            }
          }
          enemies = enemies.filter((e) => e.z < 9);
          particles = particles.filter((p) => now - p.born < 500);
          for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; }
          lasers = lasers.filter((l) => now - l.born < 110);
          bolts = bolts.filter((b) => now - b.born < 220);
        }
        function render(now) {
          if (!ctx) return;
          ctx.save();
          if (shake > 0) { ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake = Math.max(0, shake - 0.6); }
          const bg = ctx.createRadialGradient(W / 2 - panX() * 0.5, H / 2 - panY() * 0.5, 10, W / 2, H / 2, H); bg.addColorStop(0, '#182a55'); bg.addColorStop(1, '#03060f');
          ctx.fillStyle = bg; ctx.fillRect(-10, -10, W + 20, H + 20);
          for (const s of stars) { const sx = W / 2 + (s.x * F) / s.z - panX(), sy = H / 2 + (s.y * F) / s.z - panY(); const a = clamp(1 - s.z / 7, 0.1, 1); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(sx, sy, 1.5 + a, 1.5 + a); }
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          const sorted = enemies.slice().sort((a, b) => b.z - a.z);
          for (const e of sorted) {
            const p = projectE(e);
            if (e.state === 'aim') { const t = (now - e.stateAt) / (e.boss ? 1000 : 800); ctx.strokeStyle = `rgba(255,70,70,${0.4 + 0.6 * Math.abs(Math.sin(now / 70))})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.sx, p.sy, p.size * 0.6 + 4 + (1 - t) * 10, 0, Math.PI * 2); ctx.stroke(); }
            ctx.font = `${p.size}px sans-serif`;
            if (e.hitFlash > 0) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 16; }
            ctx.globalAlpha = clamp(1.3 - e.z / 8, 0.2, 1);
            ctx.fillText(e.emoji, p.sx, p.sy);
            ctx.globalAlpha = 1; ctx.shadowBlur = 0;
            if (e.boss) { ctx.fillStyle = '#ffd45c'; ctx.fillRect(p.sx - 15, p.sy - p.size * 0.6 - 6, 30 * e.hp / 3, 3); }
          }
          for (const p of particles) { const a = 1 - (now - p.born) / 500; ctx.fillStyle = p.color; ctx.globalAlpha = a; ctx.fillRect(p.x, p.y, 3, 3); ctx.globalAlpha = 1; }
          for (const b of bolts) { const a = 1 - (now - b.born) / 220; ctx.strokeStyle = `rgba(255,80,80,${a})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(W / 2, H + 10); ctx.stroke(); }
          for (const l of lasers) { const a = 1 - (now - l.born) / 110; ctx.strokeStyle = `rgba(140,240,255,${a})`; ctx.lineWidth = 3; ctx.shadowColor = '#8ef0ff'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(8, H + 4); ctx.lineTo(l.x, l.y); ctx.moveTo(W - 8, H + 4); ctx.lineTo(l.x, l.y); ctx.stroke(); ctx.shadowBlur = 0; }
          // しょうじゅん
          ctx.strokeStyle = '#8ef0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx - 20, cy); ctx.lineTo(cx - 8, cy); ctx.moveTo(cx + 8, cy); ctx.lineTo(cx + 20, cy); ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy - 8); ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy + 20); ctx.stroke();
          ctx.fillStyle = '#8ef0ff'; ctx.fillRect(cx - 1, cy - 1, 2, 2);
          // コックピット わく
          ctx.strokeStyle = 'rgba(140,200,255,.35)'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, H - 6);
          if (redFlash > 0) { ctx.fillStyle = `rgba(255,40,40,${redFlash})`; ctx.fillRect(-10, -10, W + 20, H + 20); redFlash = Math.max(0, redFlash - 0.03); }
          if (now < startTime) { ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText('てきが くる… しょうじゅんを あわせろ!', W / 2, H / 2 - 40); ctx.shadowBlur = 0; }
          ctx.restore();
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt, now);
          if (!running) return;
          const rem = Math.max(0, DURATION_MS - Math.max(0, now - startTime));
          timerEl.textContent = 'のこり: ' + Math.ceil(rem / 1000) + 's';
          render(now);
          if (rem <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const accuracy = shots ? kills / shots : 0;
          const score = shields <= 0 ? clamp(12 + kills * 3, 12, 48) : clamp(30 + kills * 5 + shields * 7 + accuracy * 10, 15, 100);
          hint.textContent = shields <= 0 ? 'シールドが やぶれた… げきは ' + kills + 'き' : 'いきのこった! げきは ' + kills + 'き　めいちゅうりつ ' + Math.round(accuracy * 100) + '%';
          render(performance.now());
          setTimeout(() => onComplete(Math.round(score)), 850);
        }
        updateHud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const GUNNER_THEMES = [
    { title: 'スペースガンナー!せまる てきを しょうじゅんで うちおとせ', enemyEmojis: ['👾', '🛸', '🤖'], bossEmoji: '👹' },
    { title: 'いんせき ガンナー!ぶつかる まえに ぜんぶ こわせ', enemyEmojis: ['☄️', '🪨', '🛰️'], bossEmoji: '🌑' },
  ];
  const SPACE_GUNNER_VARIANTS = [mg('space-gunner-3d', randomThemeGame(makeSpaceGunnerGame, GUNNER_THEMES))];

  // --- ミニゴルフ: ひっぱって はなす スリングショット操作の 物理パット。
  //     かべ・バンカー・いけ・さかみち の ある コースを 3ホール、パー以下を めざす ---
  const MINI_GOLF_HOLES = [
    { par: 2, start: [30, 200], hole: [200, 40], walls: [[110, 90, 20, 110]], sand: [], water: [], slopes: [] },
    { par: 3, start: [30, 210], hole: [210, 30], walls: [[70, 0, 18, 150], [150, 100, 18, 144]], sand: [[120, 60, 26]], water: [], slopes: [] },
    { par: 3, start: [122, 215], hole: [122, 34], walls: [[95, 110, 54, 16]], sand: [], water: [[40, 120, 26], [204, 120, 26]], slopes: [[0, 150, 244, 50, 0, -220]] },
    { par: 3, start: [40, 40], hole: [204, 200], walls: [[0, 100, 150, 16], [94, 160, 150, 16]], sand: [[200, 60, 24]], water: [], slopes: [[150, 0, 94, 100, 90, 0]] },
    { par: 3, start: [122, 210], hole: [122, 60], walls: [[60, 120, 40, 16], [144, 120, 40, 16], [100, 40, 44, 12]], sand: [], water: [[122, 100, 18]], slopes: [] },
    { par: 2, start: [30, 40], hole: [210, 205], walls: [[60, 60, 16, 120]], sand: [[150, 150, 30]], water: [], slopes: [[100, 120, 144, 60, 0, 180]] },
  ];
  function makeMiniGolfGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const holes = MINI_GOLF_HOLES.slice().sort(() => Math.random() - 0.5).slice(0, 3);
        const TIME_LIMIT_MS = 80000, MAX_STROKES = 6;
        let holeIdx = 0, strokes = 0, totalStrokes = 0, running = true, rafId = null, last = null, msg = '', msgUntil = 0;
        let bx = 0, by = 0, vx = 0, vy = 0, lastRest = [0, 0], moving = false, sunk = false, sinkAnim = 0, aim = null, splash = 0;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="gfHole">HOLE 1/3　PAR ${holes[0].par}</span><span id="gfStrokes">だせい 0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="gfCanvas"></canvas></div>
          <div class="mg-hint" id="gfHint">ボールから うしろへ ひっぱって はなすと パット。ひっぱる ながさが つよさ</div>`;
        const canvas = container.querySelector('#gfCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const S = W / 244;
        const holeEl = container.querySelector('#gfHole'), strokesEl = container.querySelector('#gfStrokes'), hint = container.querySelector('#gfHint');
        const R = 6 * S, HOLE_R = 8 * S;
        const say = (t, ms = 1300) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const cur = () => holes[holeIdx];
        function loadHole() {
          const h = cur(); strokes = 0; bx = h.start[0] * S; by = h.start[1] * S; vx = vy = 0; moving = false; sunk = false; sinkAnim = 0; lastRest = [bx, by];
          holeEl.textContent = `HOLE ${holeIdx + 1}/3　PAR ${h.par}`; strokesEl.textContent = 'だせい 0';
        }
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running || moving || sunk) return; const p = mgPointerPos(canvas, e); aim = { id: e.pointerId, x: p.x, y: p.y }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointermove', (e) => { if (!aim || e.pointerId !== aim.id) return; const p = mgPointerPos(canvas, e); aim.x = p.x; aim.y = p.y; });
        const release = (e) => {
          if (!aim || e.pointerId !== aim.id) return;
          const dx = bx - aim.x, dy = by - aim.y; aim = null;
          const len = Math.hypot(dx, dy);
          if (len < 10 * S) { say('もっと ひっぱろう', 800); return; }
          const power = clamp(len / (95 * S), 0.12, 1);
          vx = dx / len * power * 560 * S; vy = dy / len * power * 560 * S;
          moving = true; strokes++; totalStrokes++; strokesEl.textContent = 'だせい ' + strokes; lastRest = [bx, by];
        };
        canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
        function inCircle(c) { return Math.hypot(bx - c[0] * S, by - c[1] * S) < c[2] * S; }
        function collideWalls() {
          const h = cur();
          const rects = h.walls.map((w) => [w[0] * S, w[1] * S, w[2] * S, w[3] * S]).concat([[-20, -20, W + 40, 20], [-20, H, W + 40, 20], [-20, -20, 20, H + 40], [W, -20, 20, H + 40]]);
          for (const [rx, ry, rw, rh] of rects) {
            const nx = clamp(bx, rx, rx + rw), ny = clamp(by, ry, ry + rh);
            let dx = bx - nx, dy = by - ny; const d = Math.hypot(dx, dy);
            if (d >= R) continue;
            if (d === 0) { dx = bx - (rx + rw / 2); dy = by - (ry + rh / 2); if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; const dd = Math.hypot(dx, dy) || 1; dx /= dd; dy /= dd; bx = nx + dx * R; by = ny + dy * R; }
            else { dx /= d; dy /= d; bx = nx + dx * R; by = ny + dy * R; }
            const vn = vx * dx + vy * dy; if (vn < 0) { vx -= 1.65 * vn * dx; vy -= 1.65 * vn * dy; }
          }
        }
        function update(dt) {
          if (!moving) return;
          const h = cur();
          for (const sl of h.slopes) if (bx >= sl[0] * S && bx <= (sl[0] + sl[2]) * S && by >= sl[1] * S && by <= (sl[1] + sl[3]) * S) { vx += sl[4] * S * dt; vy += sl[5] * S * dt; }
          const inSand = h.sand.some(inCircle);
          const damp = Math.pow(inSand ? 0.004 : 0.32, dt); vx *= damp; vy *= damp;
          const sp = Math.hypot(vx, vy);
          const sub = Math.max(1, Math.ceil(sp * dt / (R * 0.8)));
          for (let i = 0; i < sub; i++) { bx += vx * dt / sub; by += vy * dt / sub; collideWalls(); }
          const hd = Math.hypot(bx - h.hole[0] * S, by - h.hole[1] * S);
          if (hd < HOLE_R && sp < 330 * S) { sunk = true; moving = false; sinkAnim = 1; const diff = strokes - h.par; say(diff <= -2 ? '🦅 イーグル!' : diff === -1 ? '🐦 バーディー!' : diff === 0 ? '⛳ パー!' : diff === 1 ? 'ボギー' : 'ダブルボギー…', 1500); setTimeout(nextHole, 1200); return; }
          if (hd < HOLE_R * 1.4 && sp >= 330 * S) { const nx = (bx - h.hole[0] * S) / hd, ny = (by - h.hole[1] * S) / hd; vx += nx * 40 * S; vy += ny * 40 * S; }
          if (h.water.some(inCircle)) { splash = 1; say('💦 いけに おちた! +1だせい'); strokes++; totalStrokes++; strokesEl.textContent = 'だせい ' + strokes; bx = lastRest[0]; by = lastRest[1]; vx = vy = 0; moving = false; return; }
          if (sp < 9 * S) { vx = vy = 0; moving = false; if (strokes >= MAX_STROKES) { say('だせい オーバー… つぎの ホールへ'); setTimeout(nextHole, 900); } }
        }
        function nextHole() {
          if (!running) return;
          holeIdx++;
          if (holeIdx >= holes.length) { finish(); return; }
          loadHole();
        }
        function render(now) {
          if (!ctx) return;
          const h = cur();
          ctx.fillStyle = '#3f8f3a'; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < W; i += 24 * S) ctx.fillRect(i, 0, 12 * S, H);
          for (const sl of h.slopes) { const cx = (sl[0] + sl[2] / 2) * S, cy = (sl[1] + sl[3] / 2) * S, al = Math.hypot(sl[4], sl[5]) || 1, ux = sl[4] / al, uy = sl[5] / al, hl = Math.min(sl[2], sl[3]) * S / 2; const g = ctx.createLinearGradient(cx - ux * hl, cy - uy * hl, cx + ux * hl, cy + uy * hl); g.addColorStop(0, 'rgba(255,255,255,.16)'); g.addColorStop(1, 'rgba(0,0,0,.2)'); ctx.fillStyle = g; ctx.fillRect(sl[0] * S, sl[1] * S, sl[2] * S, sl[3] * S); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = `${14 * S}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(sl[5] < 0 ? '⬆' : sl[5] > 0 ? '⬇' : sl[4] > 0 ? '➡' : '⬅', (sl[0] + sl[2] / 2) * S, (sl[1] + sl[3] / 2) * S); }
          for (const c of h.sand) { ctx.fillStyle = '#e6d28a'; ctx.beginPath(); ctx.arc(c[0] * S, c[1] * S, c[2] * S, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.beginPath(); ctx.arc(c[0] * S, c[1] * S, c[2] * S * 0.6, 0, Math.PI * 2); ctx.fill(); }
          for (const c of h.water) { const g = ctx.createRadialGradient(c[0] * S, c[1] * S, 2, c[0] * S, c[1] * S, c[2] * S); g.addColorStop(0, '#7fd0ff'); g.addColorStop(1, '#2b7fc4'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0] * S, c[1] * S, c[2] * S, 0, Math.PI * 2); ctx.fill(); }
          for (const w of h.walls) { ctx.fillStyle = '#5b3a1e'; ctx.fillRect(w[0] * S, w[1] * S + 4 * S, w[2] * S, w[3] * S); ctx.fillStyle = '#9c6b3c'; ctx.fillRect(w[0] * S, w[1] * S, w[2] * S, w[3] * S); }
          const hg = ctx.createRadialGradient(h.hole[0] * S, h.hole[1] * S, 1, h.hole[0] * S, h.hole[1] * S, HOLE_R); hg.addColorStop(0, '#000'); hg.addColorStop(1, '#1d2a1c');
          ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(h.hole[0] * S, h.hole[1] * S, HOLE_R, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#eee'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(h.hole[0] * S, h.hole[1] * S); ctx.lineTo(h.hole[0] * S, h.hole[1] * S - 26 * S); ctx.stroke();
          ctx.fillStyle = '#ff3b5c'; ctx.beginPath(); ctx.moveTo(h.hole[0] * S, h.hole[1] * S - 26 * S); ctx.lineTo(h.hole[0] * S + 14 * S, h.hole[1] * S - 21 * S); ctx.lineTo(h.hole[0] * S, h.hole[1] * S - 16 * S); ctx.closePath(); ctx.fill();
          if (aim && !moving) {
            const dx = bx - aim.x, dy = by - aim.y, len = Math.hypot(dx, dy), power = clamp(len / (95 * S), 0, 1);
            ctx.strokeStyle = `rgba(255,255,255,.85)`; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + dx / (len || 1) * power * 90 * S, by + dy / (len || 1) * power * 90 * S); ctx.stroke(); ctx.setLineDash([]);
            ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(aim.x, aim.y); ctx.stroke();
            ctx.fillStyle = power > 0.8 ? '#ff5c8a' : power > 0.45 ? '#ffd257' : '#8de0a0'; ctx.fillRect(10 * S, H - 16 * S, (W - 20 * S) * power, 8 * S); ctx.strokeStyle = '#fff'; ctx.strokeRect(10 * S, H - 16 * S, W - 20 * S, 8 * S);
          }
          const sh = sunk ? Math.max(0, sinkAnim) : 1;
          if (sunk) sinkAnim = Math.max(0, sinkAnim - 0.05);
          ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(bx + 2, by + 3, R * sh, R * 0.7 * sh, 0, 0, Math.PI * 2); ctx.fill();
          const g = ctx.createRadialGradient(bx - R * 0.3, by - R * 0.3, 1, bx, by, R); g.addColorStop(0, '#fff'); g.addColorStop(1, '#c9ccd6');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, R * sh, 0, Math.PI * 2); ctx.fill();
          if (splash > 0) { ctx.strokeStyle = `rgba(150,220,255,${splash})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bx, by, (1 - splash) * 30 * S + 6, 0, Math.PI * 2); ctx.stroke(); splash = Math.max(0, splash - 0.04); }
          if (now < msgUntil) { ctx.font = `bold ${14 * S}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 90 * S, 12 * S, 180 * S, 26 * S); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 25 * S); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.04, (now - last) / 1000); last = now;
          update(dt);
          if (!running) return;
          render(now);
          if (now - startTime > TIME_LIMIT_MS) { say('じかんぎれ…'); finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const playedPar = holes.reduce((a, h) => a + h.par, 0);
          const over = totalStrokes - playedPar + (holeIdx < holes.length ? (holes.length - holeIdx) * 4 : 0);
          const score = clamp(100 - Math.max(0, over) * 9 + Math.min(0, over) * -4, 15, 100);
          say(over <= 0 ? `🏆 ${totalStrokes}だせい (パー${playedPar}) すばらしい!` : `${totalStrokes}だせい (パー${playedPar}) +${over}`, 2000);
          render(performance.now());
          setTimeout(() => onComplete(Math.round(score)), 900);
        }
        loadHole();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const MINI_GOLF_VARIANTS = [mg('mini-golf-physics', makeMiniGolfGame({ title: 'ミニゴルフ!ひっぱって はなして パー以下を めざせ' }))];

  // --- ほんかく さかなつり: なげる → さかなが よってくる → あたりで あわせる →
  //     テンションを 見ながら まく、の 4だんかい。おおきい さかなほど つよく ひく ---
  const FISHING_SPECIES = [
    { emoji: '🐟', name: 'あじ', size: 1, value: 20, pull: 0.9, speed: 34 },
    { emoji: '🐠', name: 'ねったいぎょ', size: 1.1, value: 26, pull: 1.0, speed: 42 },
    { emoji: '🐡', name: 'ふぐ', size: 1.3, value: 34, pull: 1.3, speed: 26 },
    { emoji: '🦑', name: 'いか', size: 1.4, value: 40, pull: 1.4, speed: 36 },
    { emoji: '🐙', name: 'たこ', size: 1.6, value: 48, pull: 1.7, speed: 22 },
    { emoji: '🦈', name: 'さめ', size: 2.2, value: 70, pull: 2.4, speed: 50 },
  ];
  function makeRealFishingGame({ title, species = FISHING_SPECIES, waterTop = '#3fa6e8', waterBottom = '#0b3f7a' }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = Math.round(lerp(60000, 50000, difficulty));
        let phase = 'ready', running = true, rafId = null, last = null, charge = 0, charging = false, msg = '', msgUntil = 0;
        let lureX = 0, lureY = 0, lureVx = 0, lureVy = 0, targetDepth = 0, castDist = 0;
        let hooked = null, biteUntil = 0, nibbleUntil = 0, tension = 0, lineLen = 0, reeling = false, dashUntil = 0, slackMs = 0, caught = [], escaped = 0;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="rfTimer">のこり: ${Math.ceil(DURATION_MS / 1000)}s</span><span id="rfScore">つった: 0ひき　0pt</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="rfCanvas"></canvas></div>
          <div class="mg-hint" id="rfHint">ボタン ながおしで ためて はなすと キャスト。うきが しずんだら「あわせる」!</div>
          <div class="mg-race-controls"><button class="mg-tap-btn mg-hold-btn primary" id="rfMain" data-key="action">キャスト(ながおし)</button></div>`;
        const canvas = container.querySelector('#rfCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 235);
        const WATER_Y = H * 0.34, SHORE_X = 28;
        const timerEl = container.querySelector('#rfTimer'), scoreEl = container.querySelector('#rfScore'), hint = container.querySelector('#rfHint'), mainBtn = container.querySelector('#rfMain');
        const say = (t, ms = 1400) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const fishes = [];
        function spawnFish() {
          const sp = species[Math.min(species.length - 1, Math.floor(Math.pow(Math.random(), 1.6 - difficulty * 0.5) * species.length))];
          const dir = Math.random() < 0.5 ? 1 : -1;
          fishes.push({ sp, x: dir > 0 ? -20 : W + 20, y: WATER_Y + 30 + Math.random() * (H - WATER_Y - 50), dir, speed: sp.speed * (0.7 + Math.random() * 0.6), state: 'swim', wobble: Math.random() * 10, size: 16 + sp.size * 8 });
        }
        for (let i = 0; i < 3; i++) { spawnFish(); fishes[i].x = 40 + Math.random() * (W - 80); }
        function setPhase(p) {
          phase = p;
          mainBtn.classList.toggle('primary', true);
          if (p === 'ready') mainBtn.textContent = 'キャスト(ながおし)';
          else if (p === 'wait') mainBtn.textContent = 'あわせる!';
          else if (p === 'fight') mainBtn.textContent = 'まく(ながおし)';
        }
        bindHeldButton(mainBtn, (v) => {
          if (!running) return;
          if (phase === 'ready') { if (v) { charging = true; charge = 0; } else if (charging) { charging = false; cast(); } }
          else if (phase === 'wait') { if (v) strike(); }
          else if (phase === 'fight') reeling = v;
        });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (phase === 'wait') strike(); else if (phase === 'ready' && !charging) { charging = true; charge = 0; } else if (phase === 'fight') reeling = true; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        const canvasUp = () => { if (phase === 'ready' && charging) { charging = false; cast(); } if (phase === 'fight') reeling = false; };
        canvas.addEventListener('pointerup', canvasUp); canvas.addEventListener('pointercancel', canvasUp);
        function cast() {
          if (charge < 0.1) { say('もっと ながく ためよう', 900); return; }
          castDist = 40 + charge * (W - 80);
          lureX = SHORE_X; lureY = WATER_Y - 40; lureVx = castDist / 0.9; lureVy = -140;
          targetDepth = WATER_Y + 40 + Math.random() * (H - WATER_Y - 70);
          setPhase('cast'); say('キャスト!', 700);
        }
        function strike() {
          if (phase !== 'wait') return;
          const now = performance.now();
          const biter = fishes.find((f) => f.state === 'bite');
          if (biter && now < biteUntil) {
            hooked = biter; biter.state = 'hooked'; tension = 30; lineLen = Math.hypot(lureX - SHORE_X, lureY - (WATER_Y - 40)); reeling = false; slackMs = 0; dashUntil = now + 600;
            setPhase('fight'); say('🎣 ヒット! ' + hooked.sp.name + ' だ! テンションに ちゅうい', 1600);
          } else {
            const nib = fishes.find((f) => f.state === 'nibble' || f.state === 'approach');
            if (nib) { nib.state = 'flee'; say('はやすぎ! さかなが にげた…'); } else say('まだ あたりが ない…', 800);
          }
        }
        function landFish() {
          caught.push(hooked.sp); const idx = fishes.indexOf(hooked); if (idx >= 0) fishes.splice(idx, 1); spawnFish();
          say('🎉 ' + hooked.sp.name + ' を つった! +' + hooked.sp.value + 'pt', 1600); hooked = null;
          scoreEl.textContent = 'つった: ' + caught.length + 'ひき　' + caught.reduce((a, f) => a + f.value, 0) + 'pt';
          setPhase('ready');
        }
        function loseFish(reason) {
          escaped++; if (hooked) { hooked.state = 'flee'; hooked = null; }
          say(reason, 1500); setPhase('ready');
        }
        function update(dt, now) {
          if (charging) charge = Math.min(1, charge + dt / 1.1);
          for (const f of fishes) {
            f.wobble += dt * 6;
            if (f.state === 'swim' || f.state === 'flee') {
              const sp = f.state === 'flee' ? f.speed * 2.2 : f.speed;
              f.x += f.dir * sp * dt; f.y += Math.sin(f.wobble) * 6 * dt;
              if (f.x < -40 || f.x > W + 40) { const i = fishes.indexOf(f); fishes.splice(i, 1); spawnFish(); }
              if (f.state === 'swim' && phase === 'wait' && !fishes.some((o) => o.state === 'approach' || o.state === 'nibble' || o.state === 'bite') && Math.hypot(f.x - lureX, f.y - lureY) < 90 && Math.random() < dt * 0.9) f.state = 'approach';
            } else if (f.state === 'approach') {
              const dx = lureX - f.x, dy = lureY - f.y, d = Math.hypot(dx, dy);
              if (d < 14) { f.state = 'nibble'; nibbleUntil = now + 700 + Math.random() * 900; }
              else { f.x += dx / d * f.speed * 1.1 * dt; f.y += dy / d * f.speed * 1.1 * dt; f.dir = dx > 0 ? 1 : -1; }
              if (phase !== 'wait') f.state = 'swim';
            } else if (f.state === 'nibble') {
              f.x = lureX + Math.sin(now / 60) * 3; f.y = lureY + 8;
              if (now > nibbleUntil) { f.state = 'bite'; biteUntil = now + lerp(750, 520, difficulty); }
              if (phase !== 'wait') f.state = 'swim';
            } else if (f.state === 'bite') {
              f.x = lureX; f.y = lureY + 10;
              if (now > biteUntil) { f.state = 'flee'; say('にがした… あたりを のがした', 1200); }
            } else if (f.state === 'hooked') {
              f.x = SHORE_X + lineLen * 0.98; f.y = lureY + Math.sin(now / 90) * 4;
            }
          }
          if (phase === 'cast') {
            lureVy += 420 * dt; lureX += lureVx * dt; lureY += lureVy * dt;
            if (lureY >= WATER_Y) { lureY = WATER_Y; lureVx = 0; lureVy = 0; setPhase('wait'); say('うきを 見て… しずんだら あわせる!', 1400); }
          } else if (phase === 'wait') {
            if (lureY < targetDepth) lureY += 30 * dt;
          } else if (phase === 'fight' && hooked) {
            const f = hooked;
            if (now > dashUntil && Math.random() < dt * 0.55) { dashUntil = now + 500 + Math.random() * 500; }
            const dashing = now < dashUntil;
            const pull = f.sp.pull * (dashing ? 1 : 0.35);
            if (reeling) { lineLen -= 55 * dt; tension += (28 + pull * 34) * dt; slackMs = 0; }
            else { tension -= 42 * dt; lineLen += pull * 14 * dt; slackMs += dt * 1000; }
            tension = clamp(tension, 0, 100);
            lureX = SHORE_X + lineLen; lureY = f.y;
            if (tension >= 100) { loseFish('💥 いとが きれた! テンションの あげすぎ'); return; }
            if (slackMs > 2600) { loseFish('いとが たるんで ばれた…'); return; }
            if (lineLen <= 6) { landFish(); return; }
          }
        }
        function render(now) {
          if (!ctx) return;
          const sky = ctx.createLinearGradient(0, 0, 0, WATER_Y); sky.addColorStop(0, '#7cc6ff'); sky.addColorStop(1, '#dff3ff');
          ctx.fillStyle = sky; ctx.fillRect(0, 0, W, WATER_Y);
          const water = ctx.createLinearGradient(0, WATER_Y, 0, H); water.addColorStop(0, waterTop); water.addColorStop(1, waterBottom);
          ctx.fillStyle = water; ctx.fillRect(0, WATER_Y, W, H - WATER_Y);
          ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
          for (let i = 0; i < 4; i++) { ctx.beginPath(); for (let x = 0; x <= W; x += 8) { const y = WATER_Y + 12 + i * 34 + Math.sin(x / 22 + now / 500 + i) * 3; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); }
          ctx.fillStyle = '#7a5a3a'; ctx.fillRect(0, WATER_Y - 14, SHORE_X + 10, 14); ctx.fillStyle = '#9ccc65'; ctx.fillRect(0, WATER_Y - 18, SHORE_X + 10, 6);
          ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(currentSprite(), SHORE_X - 6, WATER_Y - 16);
          const rodTipX = SHORE_X + 26, rodTipY = WATER_Y - 62;
          ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(SHORE_X + 4, WATER_Y - 22); ctx.lineTo(rodTipX, rodTipY); ctx.stroke();
          for (const f of fishes) {
            const sh = f.state === 'hooked' ? 1 : 0.55;
            ctx.globalAlpha = sh; ctx.font = `${f.size}px sans-serif`; ctx.textBaseline = 'middle';
            ctx.save(); ctx.translate(f.x, f.y); if (f.dir > 0) ctx.scale(-1, 1); ctx.fillText(f.sp.emoji, 0, 0); ctx.restore();
            ctx.globalAlpha = 1;
            if (f.state === 'nibble') { ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.fillText('…', f.x, f.y - f.size * 0.7); }
          }
          if (phase !== 'ready') {
            ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(rodTipX, rodTipY); ctx.lineTo(lureX, Math.min(lureY, WATER_Y)); if (lureY > WATER_Y) ctx.lineTo(lureX, lureY); ctx.stroke();
            const bobbing = fishes.some((f) => f.state === 'nibble'), biting = fishes.some((f) => f.state === 'bite');
            const floatY = phase === 'fight' ? Math.min(lureY, WATER_Y + 8) : WATER_Y + (biting ? 12 : bobbing ? Math.sin(now / 50) * 4 : Math.sin(now / 400) * 1.5);
            ctx.font = '16px sans-serif'; ctx.textBaseline = 'middle'; ctx.fillText(phase === 'cast' ? '🪝' : '🔴', lureX, phase === 'cast' ? lureY : floatY);
            if (phase === 'wait' && lureY > WATER_Y + 4) { ctx.fillStyle = '#ffd257'; ctx.beginPath(); ctx.arc(lureX, lureY, 3, 0, Math.PI * 2); ctx.fill(); }
            if (biting) { ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#ff3b5c'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 6; ctx.fillText('あたり! いま!', lureX, WATER_Y - 18); ctx.shadowBlur = 0; }
          }
          if (charging) { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(W / 2 - 60, 12, 120, 12); ctx.fillStyle = charge > 0.8 ? '#ff5c8a' : '#8de0a0'; ctx.fillRect(W / 2 - 60, 12, 120 * charge, 12); ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif'; ctx.textBaseline = 'top'; ctx.fillText('とおくへ なげる', W / 2, 26); }
          if (phase === 'fight') {
            ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(10, 10, W - 20, 30);
            ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('テンション', 14, 13);
            ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(14, 26, W - 28, 9);
            ctx.fillStyle = tension > 80 ? '#ff3b5c' : tension > 55 ? '#ffd257' : '#8de0a0'; ctx.fillRect(14, 26, (W - 28) * tension / 100, 9);
            ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText('あと ' + Math.max(0, Math.round(lineLen)) + 'm', W - 14, 13);
            if (tension > 80) { ctx.fillStyle = `rgba(255,60,60,${0.2 + 0.2 * Math.abs(Math.sin(now / 90))})`; ctx.fillRect(0, 0, W, H); }
          }
          if (now < msgUntil) { ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 100, H - 34, 200, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H - 21); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          update(dt, now);
          if (!running) return;
          const rem = Math.max(0, DURATION_MS - (now - startTime));
          timerEl.textContent = 'のこり: ' + Math.ceil(rem / 1000) + 's';
          render(now);
          if (rem <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          mainBtn.disabled = true;
          const pts = caught.reduce((a, f) => a + f.value, 0);
          const score = clamp(18 + pts * 0.85 - escaped * 4, 10, 100);
          say(caught.length ? `しゅうりょう! ${caught.length}ひき ${pts}pt` : 'しゅうりょう… つれなかった', 2000);
          render(performance.now());
          setTimeout(() => onComplete(Math.round(score)), 900);
        }
        setPhase('ready');
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const RIVER_FISH = [
    { emoji: '🐟', name: 'あゆ', size: 1, value: 20, pull: 0.9, speed: 36 },
    { emoji: '🦐', name: 'てながえび', size: 0.9, value: 22, pull: 0.7, speed: 30 },
    { emoji: '🐸', name: 'かえる', size: 1.1, value: 24, pull: 1.0, speed: 28 },
    { emoji: '🦞', name: 'ざりがに', size: 1.3, value: 32, pull: 1.4, speed: 22 },
    { emoji: '🐢', name: 'かめ', size: 1.5, value: 40, pull: 1.6, speed: 18 },
    { emoji: '🐊', name: 'ワニ', size: 2.2, value: 70, pull: 2.5, speed: 40 },
  ];
  const DEEPSEA_FISH = [
    { emoji: '🐡', name: 'ふぐ', size: 1.2, value: 28, pull: 1.2, speed: 26 },
    { emoji: '🦑', name: 'いか', size: 1.4, value: 40, pull: 1.4, speed: 36 },
    { emoji: '🐙', name: 'たこ', size: 1.6, value: 48, pull: 1.7, speed: 22 },
    { emoji: '🦀', name: 'かに', size: 1.3, value: 36, pull: 1.5, speed: 20 },
    { emoji: '🦈', name: 'さめ', size: 2.2, value: 70, pull: 2.4, speed: 50 },
    { emoji: '🐋', name: 'くじら', size: 2.8, value: 95, pull: 3.0, speed: 30 },
  ];
  const REAL_FISHING_VARIANTS = [mg('real-fishing', makeRealFishingGame({ title: 'ほんかく さかなつり!あわせて、まいて、つりあげろ' }))];

  // --- 3Dバスケ シュート: うえに はらって シュート。ボールは ほうぶつせんを
  //     えがき、リング/バックボードに あたる。うごく ゴールも ---
  function makeBasketballGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = Math.round(lerp(40000, 34000, difficulty));
        const CAM_Z = -4, CAM_Y = 3.2, F_RATIO = 0.62;
        const HOOP_Z = 9, HOOP_Y = 3.05, RIM_R = 0.45, BALL_R = 0.24, BOARD_Z = HOOP_Z + 0.55;
        let hoopX = 0, hoopVx = 0, made = 0, shots = 0, streak = 0, best = 0, running = true, rafId = null, last = null, msg = '', msgUntil = 0;
        let ball = null, drag = null, net = 0, rimFlash = 0, sway = lerp(0, 1.4, difficulty);
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="bkTimer">のこり: ${Math.ceil(DURATION_MS / 1000)}s</span><span id="bkScore">🏀 0 / 0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="bkCanvas"></canvas></div>
          <div class="mg-hint" id="bkHint">ボールを うえへ はらって シュート。はらう ながさと はやさで とぶ きょりが かわる。バックボードに あてても OK</div>`;
        const canvas = container.querySelector('#bkCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 250);
        const F = W * F_RATIO, HOR = H * 0.36;
        const timerEl = container.querySelector('#bkTimer'), scoreEl = container.querySelector('#bkScore'), hint = container.querySelector('#bkHint');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        function project(x, y, z) { const dz = z - CAM_Z; const s = F / dz; return { x: W / 2 + x * s, y: HOR + (CAM_Y - y) * s, s }; }
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (ball || !running || performance.now() < startTime) return; const p = mgPointerPos(canvas, e); drag = { id: e.pointerId, pts: [{ x: p.x, y: p.y, t: performance.now() }] }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; const p = mgPointerPos(canvas, e); drag.pts.push({ x: p.x, y: p.y, t: performance.now() }); if (drag.pts.length > 30) drag.pts.shift(); });
        const release = (e) => {
          if (!drag || e.pointerId !== drag.id) return;
          const pts = drag.pts; drag = null;
          const a = pts[0], b = pts[pts.length - 1];
          const dy = a.y - b.y, dx = b.x - a.x, dt = Math.max(50, b.t - a.t);
          if (dy < 30) { say('うえへ はらって シュート!', 900); return; }
          const speed = Math.hypot(dx, dy) / dt * 1000;
          const power = clamp(speed / 1500 * 0.55 + dy / 200 * 0.45, 0.35, 1.3);
          const vz = 5.2 + power * 5.8, vy = 5.6 + power * 3.2, vx = clamp(dx / 90, -1, 1) * 3.2;
          ball = { x: 0, y: 1.2, z: 0.6, vx, vy, vz, scored: false, done: false, rimHits: 0 };
          shots++; updateHud();
        };
        canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
        function updateHud() { scoreEl.textContent = `🏀 ${made} / ${shots}` + (streak >= 2 ? `　🔥${streak}れんぞく` : ''); }
        function step(dt) {
          if (!ball) return;
          const b = ball;
          b.vy -= 9.8 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
          // バックボード
          if (!b.done && b.z + BALL_R > BOARD_Z && b.vz > 0 && Math.abs(b.x - hoopX) < 1.1 && b.y > HOOP_Y - 0.3 && b.y < HOOP_Y + 1.3) { b.z = BOARD_Z - BALL_R; b.vz *= -0.55; b.vx *= 0.8; rimFlash = 0.3; }
          // リング
          const dxr = b.x - hoopX, dzr = b.z - HOOP_Z, dr = Math.hypot(dxr, dzr);
          if (!b.done && b.vy < 0 && b.y - BALL_R < HOOP_Y + 0.05 && b.y + BALL_R > HOOP_Y - 0.05) {
            if (dr < RIM_R - BALL_R * 0.55) { b.scored = true; b.done = true; made++; streak++; best = Math.max(best, streak); net = 1; say(b.rimHits ? '🏀 リングに あたって イン!' : streak >= 3 ? '🔥 スウィッシュ! ' + streak + 'れんぞく' : '🏀 ナイスシュート!', 1200); updateHud(); }
            else if (dr < RIM_R + BALL_R) { const nx = dxr / (dr || 1), nz = dzr / (dr || 1); b.vx = nx * 2.2 + b.vx * 0.3; b.vz = nz * 2.2 + b.vz * 0.2; b.vy = Math.abs(b.vy) * 0.45; b.rimHits++; rimFlash = 0.4; }
          }
          if (b.y < 0) { b.y = 0; b.vy = Math.abs(b.vy) * 0.5; b.vx *= 0.7; b.vz *= 0.7; if (!b.done) { b.done = true; streak = 0; say(b.rimHits ? 'おしい! リングに はじかれた' : 'はずれ…', 1000); updateHud(); } }
          if (b.z > 14 || b.z < -3 || (b.done && Math.abs(b.vy) < 0.6 && b.y <= 0.01)) ball = null;
        }
        function render(now) {
          if (!ctx) return;
          const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1b1f3a'); bg.addColorStop(0.36, '#2d3358'); bg.addColorStop(0.361, '#c98a4a'); bg.addColorStop(1, '#e0a66a');
          ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
          // コートの せん
          ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
          for (const xx of [-2.4, 2.4]) { const a = project(xx, 0, 0), c = project(xx, 0, HOOP_Z + 1); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke(); }
          const kl = project(-2.4, 0, HOOP_Z - 2.5), kr = project(2.4, 0, HOOP_Z - 2.5); ctx.beginPath(); ctx.moveTo(kl.x, kl.y); ctx.lineTo(kr.x, kr.y); ctx.stroke();
          // ゴール
          const pole = project(hoopX, 0, BOARD_Z + 0.4), poleTop = project(hoopX, HOOP_Y + 1.4, BOARD_Z + 0.4);
          ctx.strokeStyle = '#555'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(pole.x, pole.y); ctx.lineTo(poleTop.x, poleTop.y); ctx.stroke();
          const bl = project(hoopX - 1.1, HOOP_Y - 0.3, BOARD_Z), br = project(hoopX + 1.1, HOOP_Y + 1.3, BOARD_Z);
          ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(bl.x, br.y, br.x - bl.x, bl.y - br.y); ctx.strokeStyle = '#e63946'; ctx.lineWidth = 2; ctx.strokeRect(bl.x, br.y, br.x - bl.x, bl.y - br.y);
          const il = project(hoopX - 0.45, HOOP_Y, BOARD_Z), ir = project(hoopX + 0.45, HOOP_Y + 0.4, BOARD_Z); ctx.strokeRect(il.x, ir.y, ir.x - il.x, il.y - ir.y);
          const rc = project(hoopX, HOOP_Y, HOOP_Z); const rr = RIM_R * rc.s;
          // ネット
          ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1;
          for (let i = 0; i < 8; i++) { const ang = i / 8 * Math.PI * 2; const nx = rc.x + Math.cos(ang) * rr, ny = rc.y + Math.sin(ang) * rr * 0.35; ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(rc.x + Math.cos(ang) * rr * 0.6, rc.y + rr * 1.1 + net * 6); ctx.stroke(); }
          ctx.strokeStyle = rimFlash > 0 ? '#fff' : '#ff6b1a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(rc.x, rc.y, rr, rr * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
          if (rimFlash > 0) rimFlash = Math.max(0, rimFlash - 0.03);
          if (net > 0) net = Math.max(0, net - 0.04);
          // ボール
          const drawBall = (x, y, z) => { const p = project(x, y, z); const r = Math.max(2, BALL_R * p.s); const sh = project(x, 0, z); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, r * 1.1, r * 0.4, 0, 0, Math.PI * 2); ctx.fill(); const g = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, 1, p.x, p.y, r); g.addColorStop(0, '#ffb066'); g.addColorStop(1, '#c4520d'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(60,20,0,.6)'; ctx.lineWidth = Math.max(1, r * 0.08); ctx.beginPath(); ctx.moveTo(p.x - r, p.y); ctx.lineTo(p.x + r, p.y); ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x, p.y + r); ctx.stroke(); return p; };
          if (ball) drawBall(ball.x, ball.y, ball.z);
          else if (running) { const p = drawBall(0, 1.2, 0.6); if (drag && drag.pts.length > 1) { const a = drag.pts[0], e = drag.pts[drag.pts.length - 1]; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + (e.x - a.x), p.y + (e.y - a.y)); ctx.stroke(); ctx.setLineDash([]); } else if (performance.now() >= startTime) { ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillText('↑ はらって シュート', W / 2, p.y - 40); } }
          if (now < startTime) { ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText('READY…', W / 2, H / 2); ctx.shadowBlur = 0; }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 95, 10, 190, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 23); }
        }
        function loop(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.04, (now - last) / 1000); last = now;
          if (now >= startTime) {
            if (sway > 0) { hoopX = Math.sin((now - startTime) / 1000 * 0.9) * sway; }
            const sub = 3; for (let i = 0; i < sub; i++) step(dt / sub);
          }
          const rem = Math.max(0, DURATION_MS - Math.max(0, now - startTime));
          timerEl.textContent = 'のこり: ' + Math.ceil(rem / 1000) + 's';
          render(now);
          if (rem <= 0) { finish(); return; }
          rafId = requestAnimationFrame(loop);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const acc = shots ? made / shots : 0;
          const score = clamp(Math.round(18 + made * 9 + acc * 20 + best * 3), 12, 100);
          say(`けっか: ${made}ほん せいこう / ${shots}ほん　さいだい ${best}れんぞく`, 2000);
          render(performance.now());
          setTimeout(() => onComplete(score), 900);
        }
        updateHud();
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const BASKETBALL_VARIANTS = [mg('basketball-3d', makeBasketballGame({ title: '3Dバスケ!はらって シュート、リングを ねらえ' }))];

  // --- 3Dたっきゅう: ラケットは ゆびに ついてくる。ボールが 手前に きた
  //     しゅんかんに ラケットが あれば かえせる。あてる いちで コースが かわる ---
  function makePingPongGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const WIN = 5, TIME_LIMIT_MS = 75000;
        const TABLE_L = 2.74, TABLE_HW = 0.76, NET_H = 0.15, CAM_Z = -1.3, CAM_Y = 1.25, F_RATIO = 0.62;
        const AI_SPEED = lerp(1.3, 2.4, difficulty), AI_ERR = lerp(0.22, 0.09, difficulty);
        let me = 0, ai = 0, rally = 0, bestRally = 0, running = true, rafId = null, last = null, msg = '', msgUntil = 0, serveAt = 0, server = 'me';
        let ball = null, px = 0, py = 0.25, prevPx = 0, prevPy = 0.25, pvx = 0, aiX = 0, aiY = 0.25, hitFlash = 0;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="ppScore">じぶん 0 - 0 あいて</span><span id="ppRally">ラリー 0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="ppCanvas"></canvas></div>
          <div class="mg-hint" id="ppHint">がめんを なぞって ラケットを うごかす。ボールの きた ところに ラケットを おけば かえせる。さきに ${WIN}てん!</div>`;
        const canvas = container.querySelector('#ppCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 250);
        const F = W * F_RATIO, HOR = H * 0.34;
        const scoreEl = container.querySelector('#ppScore'), rallyEl = container.querySelector('#ppRally'), hint = container.querySelector('#ppHint');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        function project(x, y, z) { const dz = z - CAM_Z; const s = F / dz; return { x: W / 2 + x * s, y: HOR + (CAM_Y - y) * s, s }; }
        function unproject(sx, sy) { const s = F / (0 - CAM_Z); return { x: (sx - W / 2) / s, y: CAM_Y - (sy - HOR) / s }; }
        let pid = null;
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); pid = e.pointerId; const p = mgPointerPos(canvas, e); const u = unproject(p.x, p.y); px = clamp(u.x, -1.1, 1.1); py = clamp(u.y, 0.05, 0.9); try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointermove', (e) => { if (pid !== e.pointerId) return; const p = mgPointerPos(canvas, e); const u = unproject(p.x, p.y); px = clamp(u.x, -1.1, 1.1); py = clamp(u.y, 0.05, 0.9); });
        const up = (e) => { if (pid === e.pointerId) pid = null; };
        canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
        function serve(who) {
          server = who;
          if (who === 'me') ball = { x: px * 0.5, y: 0.35, z: 0.2, vx: (Math.random() - 0.5) * 0.6, vy: 2.5, vz: 2.6, lastHit: 'me' };
          else ball = { x: aiX * 0.5, y: 0.35, z: TABLE_L - 0.2, vx: (Math.random() - 0.5) * 0.6, vy: 2.5, vz: -2.6, lastHit: 'ai' };
          rally = 0; rallyEl.textContent = 'ラリー 0';
        }
        function point(who, why) {
          if (who === 'me') me++; else ai++;
          scoreEl.textContent = `じぶん ${me} - ${ai} あいて`;
          say(why, 1300);
          ball = null;
          if (me >= WIN || ai >= WIN) { setTimeout(finish, 1200); return; }
          serveAt = performance.now() + 1400;
          server = who === 'me' ? 'ai' : 'me';
        }
        function step(dt, now) {
          if (!ball) { if (serveAt && now > serveAt) { serveAt = 0; serve(server); } return; }
          const b = ball;
          b.vy -= 9.8 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
          // テーブルで バウンド
          if (b.y < 0.02 && b.vy < 0) {
            if (Math.abs(b.x) <= TABLE_HW + 0.02 && b.z >= -0.02 && b.z <= TABLE_L + 0.02) { b.y = 0.02; b.vy = Math.abs(b.vy) * 0.82; }
            else { point(b.lastHit === 'me' ? 'me' : 'ai', b.lastHit === 'me' ? '🎉 あいてが かえせなかった!' : 'あいての ポイント…'); return; }
          }
          // ネット
          if (Math.abs(b.z - TABLE_L / 2) < 0.03 && b.y < NET_H && Math.abs(b.x) < TABLE_HW + 0.1) { point(b.lastHit === 'me' ? 'ai' : 'me', b.lastHit === 'me' ? 'ネットに かかった…' : 'あいてが ネットに かけた!'); return; }
          // じぶんの ラケット
          if (b.z <= 0.05 && b.vz < 0) {
            if (Math.abs(b.x - px) < 0.26 && Math.abs(b.y - py) < 0.3) {
              const off = (b.x - px) / 0.26, swing = clamp(pvx, -1.5, 1.5);
              const power = 2.8 + Math.min(1.4, Math.abs(swing) * 0.8) + rally * 0.05;
              b.vz = power; b.vx = off * 1.4 + swing * 0.8 - b.x * 0.4; b.vy = 2.55 + Math.max(0, 0.25 - b.y) * 5; b.lastHit = 'me';
              rally++; bestRally = Math.max(bestRally, rally); rallyEl.textContent = 'ラリー ' + rally; hitFlash = 1;
            } else if (b.z < -0.25) { point('ai', 'とれなかった…'); return; }
          }
          // あいての ラケット(AI)
          if (b.z >= TABLE_L - 0.05 && b.vz > 0) {
            if (Math.abs(b.x - aiX) < 0.28) {
              const off = (b.x - aiX) / 0.28;
              b.vz = -(2.6 + rally * 0.06 + difficulty * 0.6); b.vx = off * 1.0 + (Math.random() - 0.5) * 0.9 - b.x * 0.5; b.vy = 2.5 + Math.random() * 0.4; b.lastHit = 'ai';
            } else if (b.z > TABLE_L + 0.25) { point('me', '🎉 あいてが ミス!'); return; }
          }
          if (b.z < -1 || b.z > TABLE_L + 1 || Math.abs(b.x) > 2.5) { point(b.lastHit === 'me' ? 'me' : 'ai', b.lastHit === 'me' ? '🎉 ポイント!' : 'アウト…'); }
        }
        function render(now) {
          if (!ctx) return;
          const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#26304a'); bg.addColorStop(0.5, '#3a4664'); bg.addColorStop(1, '#5b6a8a');
          ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
          const tl = project(-TABLE_HW, 0, 0), tr = project(TABLE_HW, 0, 0), fl = project(-TABLE_HW, 0, TABLE_L), fr = project(TABLE_HW, 0, TABLE_L);
          ctx.fillStyle = '#1f6fb5'; ctx.beginPath(); ctx.moveTo(tl.x, tl.y); ctx.lineTo(fl.x, fl.y); ctx.lineTo(fr.x, fr.y); ctx.lineTo(tr.x, tr.y); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
          const ml = project(0, 0, 0), mf = project(0, 0, TABLE_L); ctx.beginPath(); ctx.moveTo(ml.x, ml.y); ctx.lineTo(mf.x, mf.y); ctx.stroke();
          // ネット
          const nl = project(-TABLE_HW - 0.1, 0, TABLE_L / 2), nr = project(TABLE_HW + 0.1, 0, TABLE_L / 2), nlt = project(-TABLE_HW - 0.1, NET_H, TABLE_L / 2), nrt = project(TABLE_HW + 0.1, NET_H, TABLE_L / 2);
          ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(nl.x, nlt.y, nr.x - nl.x, nl.y - nlt.y); ctx.strokeStyle = '#fff'; ctx.strokeRect(nl.x, nlt.y, nr.x - nl.x, nl.y - nlt.y);
          // あいて
          const ap = project(aiX, aiY, TABLE_L + 0.15); ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.ellipse(ap.x, ap.y, 0.13 * ap.s, 0.15 * ap.s, 0, 0, Math.PI * 2); ctx.fill();
          ctx.font = `${Math.max(10, 0.4 * ap.s)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('🤖', ap.x, ap.y - 0.1 * ap.s);
          // ボール
          if (ball) { const sh = project(ball.x, 0, ball.z); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, 0.05 * sh.s, 0.02 * sh.s, 0, 0, Math.PI * 2); ctx.fill(); const p = project(ball.x, ball.y, ball.z); ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2, 0.04 * p.s), 0, Math.PI * 2); ctx.fill(); }
          // じぶんの ラケット
          const rp = project(px, py, 0.02);
          ctx.fillStyle = hitFlash > 0 ? '#ff8f8f' : '#d64545'; ctx.beginPath(); ctx.ellipse(rp.x, rp.y, 0.16 * rp.s, 0.18 * rp.s, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#3b1f10'; ctx.lineWidth = 3; ctx.stroke();
          ctx.fillStyle = '#c99a5b'; ctx.fillRect(rp.x - 0.03 * rp.s, rp.y + 0.15 * rp.s, 0.06 * rp.s, 0.18 * rp.s);
          if (hitFlash > 0) hitFlash = Math.max(0, hitFlash - 0.1);
          if (!ball && serveAt) { ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 5; ctx.fillText((server === 'me' ? 'じぶんの' : 'あいての') + ' サーブ…', W / 2, H * 0.55); ctx.shadowBlur = 0; }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 95, 10, 190, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 23); }
        }
        function loop(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.04, (now - last) / 1000); last = now;
          pvx = (px - prevPx) / Math.max(0.001, dt); prevPx = px; prevPy = py;
          if (ball) { const tx = ball.vz > 0 ? clamp(ball.x + ball.vx * Math.max(0, (TABLE_L - ball.z) / Math.max(0.1, ball.vz)) * 0.9 + (Math.random() - 0.5) * AI_ERR, -1, 1) : 0; aiX += clamp(tx - aiX, -AI_SPEED * dt, AI_SPEED * dt); }
          const sub = 4; for (let i = 0; i < sub; i++) step(dt / sub, now);
          render(now);
          if (now - startTime > TIME_LIMIT_MS) { finish(); return; }
          rafId = requestAnimationFrame(loop);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const won = me > ai;
          const score = clamp(Math.round((won ? 62 : 20) + (me - ai) * 5 + Math.min(18, bestRally * 2)), 12, 100);
          say(won ? `🏆 ${me}-${ai} で かった! さいだいラリー ${bestRally}` : `${me}-${ai} で まけた… さいだいラリー ${bestRally}`, 2200);
          render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        serveAt = performance.now() + MG_ACTION_START_GRACE_MS + 600;
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const PING_PONG_VARIANTS = [mg('pingpong-3d', makePingPongGame({ title: '3Dたっきゅう!ラリーで あいてを ぬけ' }))];

  // ================================================================
  // フラッグシップ新作: れんさパズル / かくとう / フリーキック / タワーディフェンス / ローグライク
  // ================================================================

  // --- れんさパズル: 2こ1くみの いろだまを つんで、おなじ いろが 4こ
  //     つながると きえる。きえた あとに おちて また つながると れんさ! ---
  function makeChainPuzzleGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const COLS = 6, ROWS = 12, COLORS = difficulty > 0.6 ? 5 : 4;
        const PALETTE = [['#ff5f7e', '#ffb3c1'], ['#4cc9f0', '#bdefff'], ['#7ed957', '#d2f5c0'], ['#ffd23f', '#fff0b3'], ['#c77dff', '#ead9ff']];
        const DURATION_MS = Math.round(lerp(60000, 50000, difficulty));
        const board = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
        let piece = null, nextPair = [rnd(), rnd()], popped = 0, chains = 0, maxChain = 0, score = 0, running = true, rafId = null, last = null, dropAcc = 0, phase = 'fall', phaseUntil = 0, popping = [], chainNow = 0, msg = '', msgUntil = 0, softHeld = false, gameOver = false;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        function rnd() { return Math.floor(Math.random() * COLORS); }
        container.innerHTML = `
          <div class="mg-header"><span id="cpTimer">のこり: ${Math.ceil(DURATION_MS / 1000)}s</span><span id="cpScore">0pt　さいだい 0れんさ</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="cpCanvas"></canvas></div>
          <div class="mg-hint" id="cpHint">おなじ いろを 4こ つなげると きえる。きえた あとに おちて つながれば れんさ!</div>
          <div class="mg-falling-controls"><button class="mg-tap-btn" id="fbLeft" data-hold="step" data-key="left">◀</button><button class="mg-tap-btn" id="fbRight" data-hold="step" data-key="right">▶</button><button class="mg-tap-btn fb-rotate" id="fbRotate" data-key="up">↻ かいてん</button><button class="mg-tap-btn fb-soft mg-hold-btn" id="fbSoft" data-key="down">▼ さげる</button><button class="mg-tap-btn fb-hard" id="fbDrop" data-key="action">⏬ いっきに</button></div>`;
        const canvas = container.querySelector('#cpCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 300);
        const CELL = Math.floor(Math.min((W - 70) / COLS, (H - 8) / ROWS)), OX = 8, OY = H - CELL * ROWS - 4;
        const timerEl = container.querySelector('#cpTimer'), scoreEl = container.querySelector('#cpScore'), hint = container.querySelector('#cpHint');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        function spawn() {
          piece = { x: 2, y: 0, rot: 0, a: nextPair[0], b: nextPair[1] };
          nextPair = [rnd(), rnd()];
          if (!fits(piece)) { gameOver = true; finish(); }
        }
        function cells(p) { const d = [[0, -1], [1, 0], [0, 1], [-1, 0]][p.rot]; return [{ x: p.x, y: p.y, c: p.a }, { x: p.x + d[0], y: p.y + d[1], c: p.b }]; }
        function fits(p) { return cells(p).every((c) => c.x >= 0 && c.x < COLS && c.y < ROWS && (c.y < 0 || board[c.y][c.x] === -1)); }
        function move(dx) { if (!piece || phase !== 'fall') return; const q = { ...piece, x: piece.x + dx }; if (fits(q)) piece = q; }
        function rotate() { if (!piece || phase !== 'fall') return; for (const kick of [0, -1, 1]) { const q = { ...piece, rot: (piece.rot + 1) % 4, x: piece.x + kick }; if (fits(q)) { piece = q; return; } } }
        function stepDown() { if (!piece) return false; const q = { ...piece, y: piece.y + 1 }; if (fits(q)) { piece = q; return true; } lock(); return false; }
        function hardDrop() { if (!piece || phase !== 'fall') return; while (stepDown()); }
        function lock() {
          for (const c of cells(piece)) if (c.y >= 0) board[c.y][c.x] = c.c;
          piece = null; chainNow = 0; applyGravity(); phase = 'settle'; phaseUntil = performance.now() + 120;
        }
        function applyGravity() { for (let x = 0; x < COLS; x++) { let w = ROWS - 1; for (let y = ROWS - 1; y >= 0; y--) { if (board[y][x] !== -1) { const v = board[y][x]; board[y][x] = -1; board[w][x] = v; w--; } } } }
        function findGroups() {
          const seen = Array.from({ length: ROWS }, () => Array(COLS).fill(false)); const groups = [];
          for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
            if (board[y][x] === -1 || seen[y][x]) continue;
            const col = board[y][x], stack = [[x, y]], g = []; seen[y][x] = true;
            while (stack.length) { const [cx, cy] = stack.pop(); g.push([cx, cy]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && !seen[ny][nx] && board[ny][nx] === col) { seen[ny][nx] = true; stack.push([nx, ny]); } } }
            if (g.length >= 4) groups.push(g);
          }
          return groups;
        }
        function resolve() {
          const groups = findGroups();
          if (!groups.length) { phase = 'fall'; if (chainNow > 0) { chains++; maxChain = Math.max(maxChain, chainNow); } spawn(); return; }
          chainNow++;
          popping = groups.flat();
          const n = popping.length;
          const mult = chainNow === 1 ? 1 : chainNow === 2 ? 2 : chainNow === 3 ? 4 : chainNow === 4 ? 8 : 16;
          score += n * 10 * mult; popped += n;
          if (chainNow >= 2) say(chainNow + 'れんさ! ×' + mult, 1200); else if (n >= 6) say('おおきく けした!', 800);
          scoreEl.textContent = score + 'pt　さいだい ' + Math.max(maxChain, chainNow) + 'れんさ';
          phase = 'pop'; phaseUntil = performance.now() + 340;
        }
        function afterPop() { for (const [x, y] of popping) board[y][x] = -1; popping = []; applyGravity(); phase = 'settle'; phaseUntil = performance.now() + 140; }
        container.querySelector('#fbLeft').addEventListener('pointerdown', (e) => { e.preventDefault(); move(-1); });
        container.querySelector('#fbRight').addEventListener('pointerdown', (e) => { e.preventDefault(); move(1); });
        container.querySelector('#fbRotate').addEventListener('pointerdown', (e) => { e.preventDefault(); rotate(); });
        container.querySelector('#fbDrop').addEventListener('pointerdown', (e) => { e.preventDefault(); hardDrop(); });
        bindHeldButton(container.querySelector('#fbSoft'), (v) => { softHeld = v; });
        let swipe = null;
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); swipe = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointerup', (e) => { if (!swipe || e.pointerId !== swipe.id) return; const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; swipe = null; if (Math.max(Math.abs(dx), Math.abs(dy)) < 14) { rotate(); return; } if (Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? -1 : 1); else if (dy > 0) hardDrop(); });
        canvas.addEventListener('pointercancel', () => { swipe = null; });
        function drawBlob(px, py, col, size, alpha = 1, glow = false) {
          const [c1, c2] = PALETTE[col]; ctx.globalAlpha = alpha;
          if (glow) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 12; }
          const g = ctx.createRadialGradient(px - size * 0.2, py - size * 0.25, size * 0.1, px, py, size * 0.55); g.addColorStop(0, c2); g.addColorStop(1, c1);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, size * 0.46, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px - size * 0.14, py - size * 0.06, size * 0.1, 0, Math.PI * 2); ctx.arc(px + size * 0.14, py - size * 0.06, size * 0.1, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(px - size * 0.12, py - size * 0.05, size * 0.05, 0, Math.PI * 2); ctx.arc(px + size * 0.16, py - size * 0.05, size * 0.05, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#1e2233'; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = '#2a3048'; ctx.fillRect(OX, OY, CELL * COLS, CELL * ROWS);
          ctx.strokeStyle = 'rgba(255,255,255,.06)'; for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(OX + x * CELL, OY); ctx.lineTo(OX + x * CELL, OY + CELL * ROWS); ctx.stroke(); } for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(OX, OY + y * CELL); ctx.lineTo(OX + CELL * COLS, OY + y * CELL); ctx.stroke(); }
          // つながり
          for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const c = board[y][x]; if (c === -1) continue; ctx.fillStyle = PALETTE[c][0]; if (x + 1 < COLS && board[y][x + 1] === c) ctx.fillRect(OX + x * CELL + CELL / 2, OY + y * CELL + CELL * 0.3, CELL, CELL * 0.4); if (y + 1 < ROWS && board[y + 1][x] === c) ctx.fillRect(OX + x * CELL + CELL * 0.3, OY + y * CELL + CELL / 2, CELL * 0.4, CELL); }
          const popSet = new Set(popping.map(([x, y]) => x + ',' + y));
          const popT = phase === 'pop' ? (phaseUntil - now) / 340 : 1;
          for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const c = board[y][x]; if (c === -1) continue; const isPop = popSet.has(x + ',' + y); drawBlob(OX + x * CELL + CELL / 2, OY + y * CELL + CELL / 2, c, isPop ? CELL * (0.6 + 0.5 * popT) : CELL, isPop ? Math.max(0.2, popT) : 1, isPop); }
          if (piece) { const gy = ghostY(); for (const c of cells({ ...piece, y: gy })) if (c.y >= 0) { ctx.strokeStyle = PALETTE[c.c][0]; ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.arc(OX + c.x * CELL + CELL / 2, OY + c.y * CELL + CELL / 2, CELL * 0.4, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; } for (const c of cells(piece)) if (c.y >= 0) drawBlob(OX + c.x * CELL + CELL / 2, OY + c.y * CELL + CELL / 2, c.c, CELL); }
          // NEXT
          const nx = OX + CELL * COLS + 12; ctx.fillStyle = 'rgba(255,255,255,.08)'; mgRoundRect(ctx, nx, OY, W - nx - 6, CELL * 3, 8);
          ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('NEXT', nx + (W - nx - 6) / 2, OY + 4);
          drawBlob(nx + (W - nx - 6) / 2, OY + CELL * 1.2, nextPair[1], CELL * 0.8); drawBlob(nx + (W - nx - 6) / 2, OY + CELL * 2.1, nextPair[0], CELL * 0.8);
          ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillText('けした', nx + (W - nx - 6) / 2, OY + CELL * 3.4); ctx.font = 'bold 16px sans-serif'; ctx.fillText(String(popped), nx + (W - nx - 6) / 2, OY + CELL * 3.9);
          ctx.font = 'bold 11px sans-serif'; ctx.fillText('れんさ', nx + (W - nx - 6) / 2, OY + CELL * 5.2); ctx.font = 'bold 16px sans-serif'; ctx.fillText(String(maxChain), nx + (W - nx - 6) / 2, OY + CELL * 5.7);
          if (now < msgUntil) { ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#ff5f7e'; ctx.shadowBlur = 10; ctx.fillText(msg, OX + CELL * COLS / 2, OY + CELL * 4); ctx.shadowBlur = 0; }
          if (now < startTime) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('READY…', OX + CELL * COLS / 2, OY + CELL * 5); }
        }
        function ghostY() { let q = { ...piece }; while (fits({ ...q, y: q.y + 1 })) q.y++; return q.y; }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) {
            if (phase === 'fall') {
              if (!piece) spawn();
              if (piece) { const interval = softHeld ? 0.05 : Math.max(0.28, 0.75 - (now - startTime) / 90000); dropAcc += dt; if (dropAcc >= interval) { dropAcc = 0; stepDown(); } }
            } else if (phase === 'settle' && now >= phaseUntil) resolve();
            else if (phase === 'pop' && now >= phaseUntil) afterPop();
          }
          if (!running) return;
          const rem = Math.max(0, DURATION_MS - Math.max(0, now - startTime));
          timerEl.textContent = 'のこり: ' + Math.ceil(rem / 1000) + 's';
          render(now);
          if (rem <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const result = clamp(Math.round(18 + popped * 1.1 + maxChain * 12 + Math.min(20, score / 60)), 10, 100);
          say(gameOver ? 'つみあがった… ' + popped + 'こ けした' : 'しゅうりょう! ' + popped + 'こ けした / さいだい ' + maxChain + 'れんさ', 2200);
          render(performance.now());
          setTimeout(() => onComplete(result), 900);
        }
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const CHAIN_PUZZLE_VARIANTS = [mg('chain-puzzle', makeChainPuzzleGame({ title: 'れんさパズル!いろだまを 4こ つなげて けそう' }))];

  // --- かくとう(リアルタイム): よこから 見た ステージで、うごく・パンチ・
  //     キック・ガードを つかいわけて AIあいてを たおす ---
  function makeStreetFightGame({ title, rival }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = 50000, FLOOR = 0.78;
        const me = { x: 0.25, hp: 100, face: 1, state: 'idle', stateUntil: 0, guard: false, stun: 0, emoji: currentSprite(), color: '#3a86ff', combo: 0 };
        const ai = { x: 0.75, hp: 100, face: -1, state: 'idle', stateUntil: 0, guard: false, stun: 0, emoji: rival.emoji, color: rival.color, think: 0, aggro: lerp(0.45, 0.8, difficulty) };
        let running = true, rafId = null, last = null, msg = '', msgUntil = 0, shake = 0, sparks = [], leftHeld = false, rightHeld = false, hits = 0, taken = 0, ko = null;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="sfTimer">のこり: 50s</span><span id="sfRound">${rival.name} と たいせん</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="sfCanvas"></canvas></div>
          <div class="mg-hint" id="sfHint">パンチは はやい、キックは つよくて ふきとばす。あいてが ひかったら ガード(ながおし)!</div>
          <div class="mg-fight-controls"><button class="mg-tap-btn mg-hold-btn" id="sfLeft" data-key="left">◀</button><button class="mg-tap-btn mg-hold-btn" id="sfRight" data-key="right">▶</button><button class="mg-tap-btn punch" id="sfPunch" data-key="action">👊 パンチ</button><button class="mg-tap-btn kick" id="sfKick" data-key="action2">🦵 キック</button><button class="mg-tap-btn mg-hold-btn guard" id="sfGuard" data-key="down">🛡️ ガード</button></div>`;
        const canvas = container.querySelector('#sfCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 230);
        const timerEl = container.querySelector('#sfTimer'), hint = container.querySelector('#sfHint');
        const say = (t, ms = 1000) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        bindHeldButton(container.querySelector('#sfLeft'), (v) => { leftHeld = v; });
        bindHeldButton(container.querySelector('#sfRight'), (v) => { rightHeld = v; });
        bindHeldButton(container.querySelector('#sfGuard'), (v) => { me.guard = v; });
        container.querySelector('#sfPunch').addEventListener('pointerdown', (e) => { e.preventDefault(); attack(me, ai, 'punch'); });
        container.querySelector('#sfKick').addEventListener('pointerdown', (e) => { e.preventDefault(); attack(me, ai, 'kick'); });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); const p = mgPointerPos(canvas, e); attack(me, ai, p.ny < 0.5 ? 'punch' : 'kick'); });
        const MOVES = { punch: { windup: 120, active: 110, recover: 180, range: 0.17, dmg: 7, push: 0.02 }, kick: { windup: 260, active: 140, recover: 320, range: 0.23, dmg: 13, push: 0.07 } };
        function attack(f, target, kind) {
          const now = performance.now();
          if (!running || now < startTime || f.state !== 'idle' || f.stun > 0 || f.guard) return;
          f.state = 'windup'; f.move = kind; f.stateUntil = now + MOVES[kind].windup; f.hitDone = false;
        }
        function updateFighter(f, target, dt, now) {
          if (f.stun > 0) { f.stun -= dt; if (f.stun <= 0) f.state = 'idle'; return; }
          const mv = MOVES[f.move] || MOVES.punch;
          if (f.state === 'windup' && now >= f.stateUntil) { f.state = 'active'; f.stateUntil = now + mv.active; }
          else if (f.state === 'active') {
            if (!f.hitDone && Math.abs(target.x - f.x) < mv.range + 0.06 && Math.sign(target.x - f.x) === f.face) {
              f.hitDone = true;
              const blocked = target.guard && target.stun <= 0;
              const dmg = blocked ? Math.round(mv.dmg * 0.2) : mv.dmg;
              target.hp = Math.max(0, target.hp - dmg);
              target.x = clamp(target.x + f.face * (blocked ? mv.push * 0.5 : mv.push), 0.08, 0.92);
              if (!blocked) { target.stun = f.move === 'kick' ? 0.45 : 0.25; target.state = 'hit'; target.guard = false; shake = f.move === 'kick' ? 7 : 4; }
              sparks.push({ x: target.x, y: FLOOR - 0.45, born: now, blocked });
              if (f === me) { hits++; if (!blocked) { me.combo++; if (me.combo >= 3) say('🔥 ' + me.combo + 'れんぞく ヒット!', 800); } else say('ガードされた!', 600); }
              else { taken++; me.combo = 0; if (blocked) say('🛡️ ガード せいこう!', 700); }
              if (target.hp <= 0) { ko = target === ai ? 'win' : 'lose'; setTimeout(() => finish(), 900); }
            }
            if (now >= f.stateUntil) { f.state = 'recover'; f.stateUntil = now + mv.recover; }
          } else if (f.state === 'recover' && now >= f.stateUntil) f.state = 'idle';
        }
        function aiThink(dt, now) {
          if (ai.stun > 0 || ai.state !== 'idle') return;
          ai.think -= dt; if (ai.think > 0) return;
          ai.think = 0.12 + Math.random() * 0.2;
          const dist = Math.abs(me.x - ai.x);
          ai.face = me.x < ai.x ? -1 : 1;
          const threatened = me.state === 'windup' && dist < 0.3;
          if (threatened && Math.random() < lerp(0.35, 0.75, difficulty)) { ai.guard = true; ai.guardUntil = now + 420; return; }
          ai.guard = false;
          if (dist > 0.26) { ai.x = clamp(ai.x + ai.face * 0.55 * dt * 4, 0.08, 0.92); }
          else if (Math.random() < ai.aggro) attack(ai, me, Math.random() < 0.55 ? 'punch' : 'kick');
          else if (Math.random() < 0.3) ai.x = clamp(ai.x - ai.face * 0.5 * dt * 4, 0.08, 0.92);
        }
        function drawFighter(f, now, isMe) {
          const px = f.x * W, base = FLOOR * H, s = 1;
          const bob = f.state === 'idle' ? Math.sin(now / 160 + (isMe ? 0 : 2)) * 2 : 0;
          const lean = f.state === 'windup' ? -f.face * 6 : f.state === 'active' ? f.face * 10 : f.state === 'hit' ? -f.face * 12 : 0;
          ctx.save(); ctx.translate(px, base);
          ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.translate(lean, bob);
          // あし
          ctx.strokeStyle = '#2b2f3a'; ctx.lineWidth = 7; ctx.lineCap = 'round';
          const kick = f.state === 'active' && f.move === 'kick';
          ctx.beginPath(); ctx.moveTo(-6, -34); ctx.lineTo(-10, -4); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(6, -34); if (kick) ctx.lineTo(f.face * 34, -30); else ctx.lineTo(10, -4); ctx.stroke();
          if (kick) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.face * 38, -30, 7, 0, Math.PI * 2); ctx.fill(); }
          // どう
          ctx.fillStyle = f.color; mgRoundRect(ctx, -14, -66, 28, 36, 8);
          ctx.fillStyle = mgShade(f.color, 0.8); mgRoundRect(ctx, -14, -46, 28, 8, 3);
          // うで
          ctx.strokeStyle = f.color; ctx.lineWidth = 7;
          const punch = f.state === 'active' && f.move === 'punch';
          ctx.beginPath(); ctx.moveTo(f.face * 10, -58); if (punch) ctx.lineTo(f.face * 40, -56); else if (f.guard) ctx.lineTo(f.face * 18, -44); else ctx.lineTo(f.face * 20, -40); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-f.face * 10, -58); if (f.guard) ctx.lineTo(f.face * 14, -60); else ctx.lineTo(-f.face * 14, -42); ctx.stroke();
          ctx.fillStyle = '#ffe1b8'; ctx.beginPath(); ctx.arc(punch ? f.face * 44 : f.guard ? f.face * 18 : f.face * 20, punch ? -56 : f.guard ? -46 : -40, 7, 0, Math.PI * 2); ctx.fill();
          if (f.guard) { ctx.fillStyle = 'rgba(120,200,255,.45)'; ctx.beginPath(); ctx.arc(f.face * 20, -56, 18, 0, Math.PI * 2); ctx.fill(); }
          // あたま(えもじ)
          ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          if (f.stun > 0) ctx.rotate(-f.face * 0.2);
          ctx.fillText(f.emoji, 0, -84);
          if (f.state === 'windup') { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -84, 22 + (f.stateUntil - now) / 20, 0, Math.PI * 2); ctx.stroke(); }
          ctx.restore();
        }
        function render(now) {
          if (!ctx) return;
          ctx.save();
          if (shake > 0) { ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake = Math.max(0, shake - 0.6); }
          const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, rival.bg[0]); bg.addColorStop(0.75, rival.bg[1]); bg.addColorStop(0.76, rival.floor[0]); bg.addColorStop(1, rival.floor[1]);
          ctx.fillStyle = bg; ctx.fillRect(-10, -10, W + 20, H + 20);
          ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.globalAlpha = 0.85;
          rival.decor.forEach((d, i) => ctx.fillText(d, 30 + i * 60, H * 0.62)); ctx.globalAlpha = 1;
          ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, FLOOR * H, W, 2);
          // HPバー
          const bar = (x, w, hp, col, right) => { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x, 8, w, 12); ctx.fillStyle = hp > 40 ? col : '#ff5c5c'; ctx.fillRect(right ? x + w - w * hp / 100 : x, 8, w * hp / 100, 12); ctx.strokeStyle = '#fff'; ctx.strokeRect(x, 8, w, 12); };
          bar(8, W / 2 - 20, me.hp, '#3ae374', false); bar(W / 2 + 12, W / 2 - 20, ai.hp, '#3ae374', true);
          ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('じぶん', 8, 22); ctx.textAlign = 'right'; ctx.fillText(rival.name, W - 8, 22);
          const order = me.x < ai.x ? [me, ai] : [ai, me];
          drawFighter(order[0], now, order[0] === me); drawFighter(order[1], now, order[1] === me);
          sparks = sparks.filter((s) => now - s.born < 260);
          for (const s of sparks) { const t = (now - s.born) / 260; ctx.globalAlpha = 1 - t; ctx.font = `${22 + t * 20}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.blocked ? '🛡️' : '💥', s.x * W, s.y * H); ctx.globalAlpha = 1; }
          if (ko) { ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = ko === 'win' ? '#ffd23f' : '#ff5c5c'; ctx.shadowColor = '#000'; ctx.shadowBlur = 8; ctx.fillText(ko === 'win' ? 'K.O.!' : 'まけ…', W / 2, H * 0.4); ctx.shadowBlur = 0; }
          else if (now < startTime) { ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText('FIGHT!', W / 2, H * 0.4); ctx.shadowBlur = 0; }
          if (now < msgUntil && !ko) { ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(W / 2 - 80, 30, 160, 22); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 41); }
          ctx.restore();
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime && !ko) {
            if (me.state === 'idle' && me.stun <= 0 && !me.guard) { const mv = (rightHeld ? 1 : 0) - (leftHeld ? 1 : 0); if (mv) { me.x = clamp(me.x + mv * 0.42 * dt, 0.08, 0.92); } }
            me.face = ai.x >= me.x ? 1 : -1;
            if (ai.guard && now > (ai.guardUntil || 0)) ai.guard = false;
            aiThink(dt, now);
            updateFighter(me, ai, dt, now); updateFighter(ai, me, dt, now);
            if (Math.abs(me.x - ai.x) < 0.12) { const mid = (me.x + ai.x) / 2; me.x = clamp(mid - me.face * 0.06, 0.08, 0.92); ai.x = clamp(mid + me.face * 0.06, 0.08, 0.92); }
          }
          const rem = Math.max(0, DURATION_MS - Math.max(0, now - startTime));
          timerEl.textContent = 'のこり: ' + Math.ceil(rem / 1000) + 's';
          render(now);
          if (rem <= 0 && !ko) { ko = me.hp >= ai.hp ? 'win' : 'lose'; setTimeout(() => finish(), 900); }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const win = ko === 'win';
          const score = clamp(Math.round((win ? 60 : 18) + me.hp * 0.35 + Math.min(12, hits) - Math.min(15, taken)), 10, 100);
          say(win ? `🏆 かった! のこりHP ${me.hp}` : `まけた… あいての のこりHP ${ai.hp}`, 2200);
          render(performance.now());
          setTimeout(() => onComplete(score), 900);
        }
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const FIGHT_RIVALS = [
    { title: 'かくとうバトル!パンチ・キック・ガードで たおせ', rival: { name: 'おに', emoji: '👹', color: '#c0392b', bg: ['#2b1d3a', '#5a3a6b'], floor: ['#6b4a2b', '#4a3220'], decor: ['🏮', '⛩️', '🏮', '🎋'] } },
    { title: 'かくとうバトル!ロボと たたかえ', rival: { name: 'ロボ', emoji: '🤖', color: '#5f6f8a', bg: ['#0d1b2a', '#1b3a5a'], floor: ['#3a4a5a', '#2a3440'], decor: ['🛰️', '💡', '⚙️', '🔋'] } },
    { title: 'かくとうバトル!にんじゃに いどめ', rival: { name: 'にんじゃ', emoji: '🥷', color: '#2d2d3a', bg: ['#1a2a1a', '#3a5a3a'], floor: ['#5a4a3a', '#3a3020'], decor: ['🎋', '🌙', '🏯', '🍃'] } },
  ];
  const STREET_FIGHT_VARIANTS = [mg('street-fight', randomThemeGame(makeStreetFightGame, FIGHT_RIVALS))];

  // --- フリーキック(ぎじ3D): かべと キーパーを こえて ゴールへ。スワイプの
  //     むきと はやさ、とちゅうの まがりで カーブを かける ---
  function makeFreeKickGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const KICKS = 5, CAM_Z = -3, CAM_Y = 1.7, F_RATIO = 0.95;
        const GOAL_Z = 15, GOAL_HW = 3.66, GOAL_H = 2.44, WALL_Z = 8, BALL_R = 0.11;
        let kick = 0, goals = 0, running = true, rafId = null, last = null, msg = '', msgUntil = 0, ball = null, drag = null, net = 0, results = [];
        let wallX = 0, keeper = { x: 0, tx: 0, dive: 0, react: 0 };
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="fkNo">1/${KICKS}本目</span><span id="fkScore">⚽ 0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="fkCanvas"></canvas></div>
          <div class="mg-hint" id="fkHint">ボールから うえへ はらって シュート。はやさで つよさ、ななめで ねらい、とちゅうで まげると カーブ!</div>`;
        const canvas = container.querySelector('#fkCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 250);
        const F = W * F_RATIO, HOR = H * 0.42;
        const noEl = container.querySelector('#fkNo'), scoreEl = container.querySelector('#fkScore'), hint = container.querySelector('#fkHint');
        const say = (t, ms = 1300) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        function project(x, y, z) { const dz = z - CAM_Z; const s = F / dz; return { x: W / 2 + x * s, y: HOR + (CAM_Y - y) * s, s }; }
        function setup() { wallX = (Math.random() - 0.5) * 2.4; keeper = { x: (Math.random() - 0.5) * 1.2, tx: 0, dive: 0, react: lerp(0.55, 0.3, difficulty), reach: lerp(1.5, 2.2, difficulty) }; }
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (ball || !running || kick >= KICKS) return; const p = mgPointerPos(canvas, e); drag = { id: e.pointerId, pts: [{ x: p.x, y: p.y, t: performance.now() }] }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; const p = mgPointerPos(canvas, e); drag.pts.push({ x: p.x, y: p.y, t: performance.now() }); if (drag.pts.length > 30) drag.pts.shift(); });
        const release = (e) => {
          if (!drag || e.pointerId !== drag.id) return;
          const pts = drag.pts; drag = null;
          const a = pts[0], b = pts[pts.length - 1];
          const dy = a.y - b.y, dx = b.x - a.x, dt = Math.max(50, b.t - a.t);
          if (dy < 30) { say('うえへ はらって シュート!', 900); return; }
          const speed = Math.hypot(dx, dy) / dt * 1000;
          const power = clamp(speed / 1600 * 0.6 + dy / 220 * 0.4, 0.4, 1.25);
          const mid = pts[Math.floor(pts.length / 2)];
          const curve = clamp(((b.x - mid.x) - (mid.x - a.x)) / 50, -1, 1);
          const aim = clamp(dx / dy, -0.7, 0.7);
          ball = { x: 0, y: BALL_R, z: 0, vx: aim * 9 * power, vy: 4.2 + power * 4.6 * (1 - Math.abs(aim) * 0.3), vz: 14 + power * 12, curve: curve * 7, done: false, result: null };
          kick++; noEl.textContent = Math.min(KICKS, kick) + '/' + KICKS + '本目';
          keeper.tx = keeper.x; keeper.timer = 0;
        };
        canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
        function step(dt) {
          if (!ball) return;
          const b = ball;
          b.vy -= 9.8 * dt; b.vx += b.curve * dt * (b.z > 3 ? 1 : 0.3);
          b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
          if (b.y < BALL_R && b.vy < 0) { b.y = BALL_R; b.vy = Math.abs(b.vy) * 0.45; b.vx *= 0.8; b.vz *= 0.85; }
          // かべ
          if (!b.done && b.z >= WALL_Z - 0.2 && b.z <= WALL_Z + 0.4 && b.y < 1.85 && Math.abs(b.x - wallX) < 1.35) { b.done = true; b.result = 'wall'; b.vz = -b.vz * 0.3; b.vx = (b.x - wallX) * 2; say('🧱 かべに あたった!'); }
          // キーパー
          keeper.timer = (keeper.timer || 0) + dt;
          if (keeper.timer > keeper.react && !b.done) { const tGoal = Math.max(0.01, (GOAL_Z - b.z) / Math.max(1, b.vz)); const predX = b.x + b.vx * tGoal + b.curve * tGoal * tGoal * 0.5; keeper.tx = clamp(predX + (Math.random() - 0.5) * 0.6, -GOAL_HW, GOAL_HW); }
          keeper.x += clamp(keeper.tx - keeper.x, -keeper.reach * dt * 2.2, keeper.reach * dt * 2.2);
          if (!b.done && b.z >= GOAL_Z) {
            b.done = true;
            const inFrame = Math.abs(b.x) < GOAL_HW && b.y < GOAL_H;
            const saved = inFrame && Math.abs(b.x - keeper.x) < 0.75 && b.y < 2.1;
            if (!inFrame) { b.result = 'miss'; say(b.y >= GOAL_H ? 'うえに はずれた…' : 'よこに はずれた…'); b.vz *= 0.3; }
            else if (saved) { b.result = 'save'; keeper.dive = 1; say('🧤 キーパーに とめられた!'); b.vz = -b.vz * 0.25; b.vx = (b.x - keeper.x) * 3; }
            else { b.result = 'goal'; goals++; net = 1; scoreEl.textContent = '⚽ ' + goals; say(Math.abs(b.curve) > 3 ? '⚽ カーブが きまった! ゴール!!' : '⚽ ゴール!!', 1500); b.vz *= 0.15; b.vx *= 0.2; }
            results.push(b.result);
          }
          if (b.z > GOAL_Z + 3 || b.z < -2 || (b.done && Math.hypot(b.vx, b.vz) < 0.5)) { ball = null; if (kick >= KICKS) setTimeout(finish, 900); else { setup(); } }
        }
        function drawPlayer(x, z, color, head, dive = 0, face = 1) {
          const p = project(x, 0, z); const s = p.s;
          ctx.save(); ctx.translate(p.x, p.y);
          ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, 0, 0.35 * s, 0.1 * s, 0, 0, Math.PI * 2); ctx.fill();
          if (dive) ctx.rotate(face * dive * 1.1);
          ctx.strokeStyle = '#2b2f3a'; ctx.lineWidth = Math.max(2, 0.12 * s); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-0.1 * s, -0.8 * s); ctx.lineTo(-0.16 * s, 0); ctx.moveTo(0.1 * s, -0.8 * s); ctx.lineTo(0.16 * s, 0); ctx.stroke();
          ctx.fillStyle = color; mgRoundRect(ctx, -0.26 * s, -1.4 * s, 0.52 * s, 0.65 * s, 0.1 * s);
          ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(-0.24 * s, -1.3 * s); ctx.lineTo(-0.45 * s, dive ? -1.7 * s : -0.9 * s); ctx.moveTo(0.24 * s, -1.3 * s); ctx.lineTo(0.45 * s, dive ? -1.7 * s : -0.9 * s); ctx.stroke();
          ctx.font = `${0.55 * s}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(head, 0, -1.65 * s);
          ctx.restore();
        }
        function render(now) {
          if (!ctx) return;
          const sky = ctx.createLinearGradient(0, 0, 0, HOR); sky.addColorStop(0, '#2b3a6b'); sky.addColorStop(1, '#5e7fc4'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, HOR + 1);
          ctx.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 60; i++) ctx.fillRect((i * 53) % W, HOR - 22 + (i * 17) % 18, 3, 3);
          const g = ctx.createLinearGradient(0, HOR, 0, H); g.addColorStop(0, '#2f8f3a'); g.addColorStop(1, '#4fb04a'); ctx.fillStyle = g; ctx.fillRect(0, HOR, W, H - HOR);
          for (let z = 2; z < GOAL_Z; z += 4) { const a = project(-10, 0, z), b2 = project(-10, 0, z + 2); ctx.fillStyle = 'rgba(0,0,0,.06)'; ctx.fillRect(0, b2.y, W, a.y - b2.y); }
          // ゴール
          const gl = project(-GOAL_HW, 0, GOAL_Z), gr = project(GOAL_HW, 0, GOAL_Z), glt = project(-GOAL_HW, GOAL_H, GOAL_Z), grt = project(GOAL_HW, GOAL_H, GOAL_Z);
          const bl = project(-GOAL_HW, 0, GOAL_Z + 1.5), br = project(GOAL_HW, 0, GOAL_Z + 1.5), blt = project(-GOAL_HW, GOAL_H, GOAL_Z + 1.5), brt = project(GOAL_HW, GOAL_H, GOAL_Z + 1.5);
          ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
          for (let i = 0; i <= 8; i++) { const t = i / 8; ctx.beginPath(); ctx.moveTo(gl.x + (gr.x - gl.x) * t, glt.y + net * 3); ctx.lineTo(bl.x + (br.x - bl.x) * t, blt.y); ctx.lineTo(bl.x + (br.x - bl.x) * t, bl.y); ctx.stroke(); }
          for (let i = 0; i <= 5; i++) { const t = i / 5; ctx.beginPath(); ctx.moveTo(gl.x, glt.y + (gl.y - glt.y) * t); ctx.lineTo(bl.x, blt.y + (bl.y - blt.y) * t); ctx.lineTo(br.x, brt.y + (br.y - brt.y) * t); ctx.lineTo(gr.x, grt.y + (gr.y - grt.y) * t); ctx.stroke(); }
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(gl.x, gl.y); ctx.lineTo(glt.x, glt.y); ctx.lineTo(grt.x, grt.y); ctx.lineTo(gr.x, gr.y); ctx.stroke();
          if (net > 0) net = Math.max(0, net - 0.03);
          // ペナルティエリアの せん
          ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; const pl = project(-9, 0, GOAL_Z), pr = project(9, 0, GOAL_Z), pfl = project(-9, 0, GOAL_Z - 5.5), pfr = project(9, 0, GOAL_Z - 5.5);
          ctx.beginPath(); ctx.moveTo(pl.x, pl.y); ctx.lineTo(pfl.x, pfl.y); ctx.lineTo(pfr.x, pfr.y); ctx.lineTo(pr.x, pr.y); ctx.stroke();
          // キーパー・かべ・ボールを おくから じゅんに
          drawPlayer(keeper.x, GOAL_Z - 0.6, '#ffd23f', '🧤', keeper.dive, ball && ball.x < keeper.x ? -1 : 1);
          if (keeper.dive > 0) keeper.dive = Math.max(0, keeper.dive - 0.02);
          const drawBallAt = () => { if (!ball) return; const b = ball; const sh = project(b.x, 0, b.z); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, 0.16 * sh.s, 0.06 * sh.s, 0, 0, Math.PI * 2); ctx.fill(); const p = project(b.x, b.y, b.z); const r = Math.max(2.5, BALL_R * p.s * 1.4); ctx.font = `${r * 2.4}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⚽', p.x, p.y); };
          if (ball && ball.z > WALL_Z) drawBallAt();
          for (let i = -1; i <= 1; i++) drawPlayer(wallX + i * 0.62, WALL_Z, '#e63946', '🧍');
          if (ball && ball.z <= WALL_Z) drawBallAt();
          if (!ball && running && kick < KICKS) {
            const p = project(0, BALL_R, 0); ctx.font = `${BALL_R * p.s * 3.4}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⚽', p.x, p.y);
            if (drag && drag.pts.length > 1) { const a = drag.pts[0], e = drag.pts[drag.pts.length - 1]; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + (e.x - a.x), p.y + (e.y - a.y)); ctx.stroke(); ctx.setLineDash([]); }
            else { ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4; ctx.fillText('↑ はらって シュート(まげると カーブ)', W / 2, p.y - 36); ctx.shadowBlur = 0; }
          }
          ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.shadowColor = '#000'; ctx.shadowBlur = 3;
          ctx.fillText(results.map((r) => r === 'goal' ? '⚽' : r === 'save' ? '🧤' : r === 'wall' ? '🧱' : '✖').join(' '), 8, 8); ctx.shadowBlur = 0;
          if (now < msgUntil) { ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 95, HOR + 8, 190, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, HOR + 22); }
        }
        function loop(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.04, (now - last) / 1000); last = now;
          const sub = 3; for (let i = 0; i < sub; i++) step(dt / sub);
          render(now);
          if (now - startTime > 70000) { finish(); return; }
          rafId = requestAnimationFrame(loop);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const score = clamp(Math.round(12 + goals * 18 + (goals === KICKS ? 10 : 0)), 10, 100);
          say(`けっか: ${goals} / ${KICKS} ゴール`, 2000);
          render(performance.now());
          setTimeout(() => onComplete(score), 900);
        }
        setup();
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const FREE_KICK_VARIANTS = [mg('free-kick-3d', makeFreeKickGame({ title: 'フリーキック!かべと キーパーを こえて ゴールへ' }))];

  // --- タワーディフェンス: みちを あるいてくる てきを、マスに おいた
  //     タワーで たおす。おかねで タワーを たてて/きょうかして 6ウェーブ まもりきる ---
  function makeTowerDefenseGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const COLS = 8, ROWS = 7;
        const PATH = [[0, 1], [1, 1], [2, 1], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [1, 4], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [5, 4], [5, 3], [5, 2], [6, 2], [7, 2]];
        const pathSet = new Set(PATH.map(([x, y]) => x + ',' + y));
        const TOWER_TYPES = { arrow: { name: 'ゆみ', emoji: '🏹', cost: 40, range: 1.9, rate: 0.55, dmg: 3, splash: 0 }, bomb: { name: 'ばくだん', emoji: '💣', cost: 70, range: 1.6, rate: 1.4, dmg: 6, splash: 0.9 }, ice: { name: 'こおり', emoji: '❄️', cost: 55, range: 1.7, rate: 0.9, dmg: 1.5, splash: 0, slow: 0.5 } };
        const WAVES = 6;
        let gold = 90, lives = 10, wave = 0, running = true, rafId = null, last = null, msg = '', msgUntil = 0, selType = 'arrow', selected = null;
        let towers = [], enemies = [], shots = [], booms = [], spawnQueue = [], spawnTimer = 0, waveActive = false, nextWaveAt = 0, kills = 0;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="tdWave">ウェーブ 0/${WAVES}</span><span id="tdStat">💰 90　❤️ 10</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="tdCanvas"></canvas></div>
          <div class="mg-hint" id="tdHint">みち(茶色)いがいの マスを タップして タワーを たてる。タワーを タップで きょうか。ウェーブが くるまえに そなえよう</div>
          <div class="mg-td-controls"><button class="mg-tap-btn sel" id="tdArrow" data-key="left">🏹 40</button><button class="mg-tap-btn" id="tdBomb" data-key="up">💣 70</button><button class="mg-tap-btn" id="tdIce" data-key="right">❄️ 55</button><button class="mg-tap-btn primary" id="tdNext" data-key="action">つぎの ウェーブ ▶</button></div>`;
        const canvas = container.querySelector('#tdCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => Math.round(w * ROWS / COLS));
        const CELL = W / COLS;
        const waveEl = container.querySelector('#tdWave'), statEl = container.querySelector('#tdStat'), hint = container.querySelector('#tdHint');
        const btns = { arrow: container.querySelector('#tdArrow'), bomb: container.querySelector('#tdBomb'), ice: container.querySelector('#tdIce') };
        const nextBtn = container.querySelector('#tdNext');
        const say = (t, ms = 1300) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { statEl.textContent = `💰 ${gold}　❤️ ${lives}`; waveEl.textContent = `ウェーブ ${wave}/${WAVES}`; for (const k in btns) btns[k].classList.toggle('sel', selType === k); };
        for (const k in btns) btns[k].addEventListener('pointerdown', (e) => { e.preventDefault(); selType = k; selected = null; hud(); });
        nextBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!waveActive && wave < WAVES) startWave(true); });
        canvas.addEventListener('pointerdown', (e) => {
          e.preventDefault(); if (!running) return;
          const p = mgPointerPos(canvas, e); const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL);
          if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return;
          const t = towers.find((tw) => tw.cx === cx && tw.cy === cy);
          if (t) { if (selected === t) { upgrade(t); } else { selected = t; say(`${TOWER_TYPES[t.type].emoji} Lv${t.level}　もういちど タップで きょうか(💰${upgradeCost(t)})`, 1500); } return; }
          selected = null;
          if (pathSet.has(cx + ',' + cy)) { say('みちの うえには たてられない', 800); return; }
          const tt = TOWER_TYPES[selType];
          if (gold < tt.cost) { say('おかねが たりない…', 800); return; }
          gold -= tt.cost; towers.push({ cx, cy, type: selType, level: 1, cd: 0 }); hud(); say(`${tt.emoji} ${tt.name}を たてた!`, 700);
        });
        const upgradeCost = (t) => 30 + t.level * 25;
        function upgrade(t) { const c = upgradeCost(t); if (t.level >= 3) { say('もう さいきょう!', 700); return; } if (gold < c) { say('おかねが たりない…', 800); return; } gold -= c; t.level++; hud(); say(`⬆️ Lv${t.level}に きょうか!`, 800); }
        function startWave(early) {
          wave++; waveActive = true; hud();
          if (early && wave > 1) { gold += 15; say(`はやめの ウェーブ! ボーナス💰15`, 1000); }
          const count = 6 + wave * 3, boss = wave === WAVES;
          spawnQueue = [];
          for (let i = 0; i < count; i++) {
            const fast = Math.random() < 0.25 + wave * 0.05;
            spawnQueue.push({ hp: (fast ? 5 : 9) * (1 + wave * 0.45) * lerp(0.85, 1.2, difficulty), speed: fast ? 1.5 : 0.9, emoji: fast ? '🐇' : ['👾', '🐌', '🐗', '🦂'][wave % 4], gold: fast ? 4 : 6 });
          }
          if (boss) spawnQueue.push({ hp: 140 * lerp(0.85, 1.25, difficulty), speed: 0.55, emoji: '🐉', gold: 40, boss: true });
          spawnTimer = 0;
        }
        function posAlong(d) { const i = Math.min(PATH.length - 2, Math.floor(d)); const t = d - i; const a = PATH[i], b = PATH[i + 1]; return { x: (a[0] + (b[0] - a[0]) * t + 0.5) * CELL, y: (a[1] + (b[1] - a[1]) * t + 0.5) * CELL }; }
        function update(dt, now) {
          if (waveActive) {
            spawnTimer -= dt;
            if (spawnQueue.length && spawnTimer <= 0) { const e = spawnQueue.shift(); enemies.push({ ...e, maxHp: e.hp, d: 0, slow: 0 }); spawnTimer = e.boss ? 1.2 : 0.75; }
            if (!spawnQueue.length && !enemies.length) { waveActive = false; if (wave >= WAVES) { finish(true); return; } gold += 25; hud(); say(`ウェーブ ${wave} クリア! 💰+25`, 1400); nextWaveAt = now + 6000; }
          } else if (wave < WAVES && now > nextWaveAt) startWave(false);
          for (const e of enemies) {
            const sp = e.speed * (e.slow > 0 ? 0.5 : 1); if (e.slow > 0) e.slow -= dt;
            e.d += sp * dt;
            if (e.d >= PATH.length - 1) { e.dead = true; lives -= e.boss ? 3 : 1; hud(); say('てきが とおりぬけた! ❤️-1', 900); if (lives <= 0) { finish(false); return; } }
          }
          enemies = enemies.filter((e) => !e.dead);
          for (const t of towers) {
            const tt = TOWER_TYPES[t.type]; t.cd -= dt; if (t.cd > 0) continue;
            const tx = (t.cx + 0.5) * CELL, ty = (t.cy + 0.5) * CELL, range = tt.range * CELL * (1 + (t.level - 1) * 0.15);
            let target = null, bestD = -1;
            for (const e of enemies) { const p = posAlong(e.d); if (Math.hypot(p.x - tx, p.y - ty) <= range && e.d > bestD) { bestD = e.d; target = e; } }
            if (!target) continue;
            t.cd = tt.rate / (1 + (t.level - 1) * 0.3);
            const p = posAlong(target.d);
            shots.push({ x: tx, y: ty, tx: p.x, ty: p.y, born: now, type: t.type });
            const dmg = tt.dmg * (1 + (t.level - 1) * 0.6);
            const hitList = tt.splash ? enemies.filter((e) => { const q = posAlong(e.d); return Math.hypot(q.x - p.x, q.y - p.y) <= tt.splash * CELL; }) : [target];
            if (tt.splash) booms.push({ x: p.x, y: p.y, born: now });
            for (const e of hitList) { e.hp -= dmg; if (tt.slow) e.slow = 1.2; if (e.hp <= 0 && !e.dead) { e.dead = true; kills++; gold += e.gold; hud(); } }
            enemies = enemies.filter((e) => !e.dead);
          }
          shots = shots.filter((s) => now - s.born < 120); booms = booms.filter((b) => now - b.born < 300);
        }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#5fae4a'; ctx.fillRect(0, 0, W, H);
          for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { ctx.fillStyle = (x + y) % 2 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)'; ctx.fillRect(x * CELL, y * CELL, CELL, CELL); }
          ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = CELL * 0.72; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); PATH.forEach(([x, y], i) => { const px = (x + 0.5) * CELL, py = (y + 0.5) * CELL; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }); ctx.stroke();
          ctx.strokeStyle = '#a97142'; ctx.lineWidth = CELL * 0.6; ctx.stroke();
          const s0 = posAlong(0), sE = posAlong(PATH.length - 1.001);
          ctx.font = `${CELL * 0.6}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🚪', s0.x, s0.y); ctx.fillText('🏰', sE.x, sE.y);
          for (const t of towers) {
            const tx = (t.cx + 0.5) * CELL, ty = (t.cy + 0.5) * CELL, tt = TOWER_TYPES[t.type];
            if (selected === t) { ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(tx, ty, tt.range * CELL * (1 + (t.level - 1) * 0.15), 0, Math.PI * 2); ctx.fill(); }
            ctx.fillStyle = '#d9c9a5'; ctx.beginPath(); ctx.arc(tx, ty, CELL * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2; ctx.stroke();
            ctx.font = `${CELL * 0.5}px sans-serif`; ctx.fillText(tt.emoji, tx, ty);
            for (let i = 0; i < t.level; i++) { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(tx - CELL * 0.25 + i * CELL * 0.25, ty + CELL * 0.36, 2.5, 0, Math.PI * 2); ctx.fill(); }
          }
          for (const s of shots) { ctx.strokeStyle = s.type === 'ice' ? '#bdefff' : s.type === 'bomb' ? '#ffb347' : '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.tx, s.ty); ctx.stroke(); }
          for (const b of booms) { const t = (now - b.born) / 300; ctx.strokeStyle = `rgba(255,140,40,${1 - t})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b.x, b.y, CELL * 0.9 * t, 0, Math.PI * 2); ctx.stroke(); }
          for (const e of enemies) {
            const p = posAlong(e.d); const sz = e.boss ? CELL * 0.85 : CELL * 0.55;
            ctx.font = `${sz}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            if (e.slow > 0) { ctx.fillStyle = 'rgba(150,220,255,.5)'; ctx.beginPath(); ctx.arc(p.x, p.y, sz * 0.6, 0, Math.PI * 2); ctx.fill(); }
            ctx.fillText(e.emoji, p.x, p.y);
            ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(p.x - sz * 0.5, p.y - sz * 0.65, sz, 3); ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#3ae374' : '#ff5c5c'; ctx.fillRect(p.x - sz * 0.5, p.y - sz * 0.65, sz * clamp(e.hp / e.maxHp, 0, 1), 3);
          }
          if (!waveActive && wave < WAVES && running) { const secs = Math.max(0, Math.ceil((nextWaveAt - now) / 1000)); ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, 4, 160, 22); ctx.fillStyle = '#fff'; ctx.fillText(wave === 0 ? 'タワーを おいて そなえよう' : `つぎの ウェーブまで ${secs}s`, W / 2, 15); }
          if (now < msgUntil) { ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 95, H - 30, 190, 24); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H - 18); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          update(dt, now);
          if (!running) return;
          render(now);
          if (now - startTime > 150000) { finish(lives > 0); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish(win) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const score = win ? clamp(Math.round(62 + lives * 3.8), 60, 100) : clamp(Math.round(12 + wave * 6 + kills * 0.4), 10, 55);
          say(win ? `🏆 まもりきった! ❤️${lives} のこし` : `おしろが おちた… ウェーブ ${wave} まで`, 2400);
          render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        nextWaveAt = startTime + 12000;
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const TOWER_DEFENSE_VARIANTS = [mg('tower-defense', makeTowerDefenseGame({ title: 'タワーディフェンス!おしろを 6ウェーブ まもりきれ' }))];

  // --- ローグライク ダンジョン: ターンせいで うごく。まいかい ちがう
  //     ダンジョンを 3かい おりて、てきと たたかい、アイテムを ひろう ---
  function makeRoguelikeGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const COLS = 11, ROWS = 11, FLOORS = 3;
        let floor = 1, map, seen, px, py, hp = 20, maxHp = 20, atk = 3, gold = 0, kills = 0, enemies = [], items = [], stairs, running = true, rafId = null, msg = '', msgUntil = 0, anim = [], log = [], turn = 0, potions = 0, dead = false;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="rgFloor">B1F</span><span id="rgStat">❤️ 20/20　⚔️ 3　💰 0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="rgCanvas"></canvas></div>
          <div class="mg-hint" id="rgHint">1マス うごくと てきも うごく。てきに ぶつかって こうげき。🧪は かいふく、⚔️は こうげき力アップ、🪜で つぎの かいへ</div>
          <div class="mg-tilt-dpad"><button class="mg-tap-btn" id="rgPotion" data-key="action2">🧪 0</button><button class="mg-tap-btn" id="rgUp" data-hold="step" data-key="up">▲</button><button class="mg-tap-btn" id="rgWait" data-key="action">⏳ まつ</button><button class="mg-tap-btn" id="rgLeft" data-hold="step" data-key="left">◀</button><button class="mg-tap-btn" id="rgDown" data-hold="step" data-key="down">▼</button><button class="mg-tap-btn" id="rgRight" data-hold="step" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#rgCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const CELL = W / COLS;
        const floorEl = container.querySelector('#rgFloor'), statEl = container.querySelector('#rgStat'), hint = container.querySelector('#rgHint'), potionBtn = container.querySelector('#rgPotion');
        const say = (t, ms = 1500) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { statEl.textContent = `❤️ ${hp}/${maxHp}　⚔️ ${atk}　💰 ${gold}`; floorEl.textContent = 'B' + floor + 'F'; potionBtn.textContent = '🧪 ' + potions; };
        function genFloor() {
          map = generateMaze(COLS, ROWS, 10 + floor * 2).map((r) => r.split(''));
          // すこし ひろい へやを つくる
          for (let k = 0; k < 3; k++) { const rx = 1 + Math.floor(Math.random() * (COLS - 4)), ry = 1 + Math.floor(Math.random() * (ROWS - 4)); for (let y = ry; y < ry + 3; y++) for (let x = rx; x < rx + 3; x++) map[y][x] = '.'; }
          seen = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
          px = 1; py = 1; map[1][1] = '.';
          const d = mazeBfs(map.map((r) => r.join('')), 1, 1);
          const cells = []; for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (map[y][x] === '.' && d[y][x] >= 4) cells.push({ x, y, d: d[y][x] });
          cells.sort((a, b) => b.d - a.d);
          stairs = cells[0] || { x: COLS - 2, y: ROWS - 2 };
          const rest = cells.slice(1).sort(() => Math.random() - 0.5);
          enemies = []; items = [];
          const nE = 3 + floor + Math.round(difficulty * 2);
          for (let i = 0; i < nE && rest.length; i++) { const c = rest.pop(); const strong = Math.random() < 0.3 + floor * 0.15; enemies.push({ x: c.x, y: c.y, hp: strong ? 8 + floor * 3 : 4 + floor * 2, maxHp: strong ? 8 + floor * 3 : 4 + floor * 2, atk: strong ? 3 + floor : 1 + floor, emoji: strong ? ['👺', '🐗', '🧟'][floor - 1] : ['🦇', '🐀', '🕷️'][Math.floor(Math.random() * 3)], awake: false, gold: strong ? 12 : 5 }); }
          for (let i = 0; i < 2 && rest.length; i++) { const c = rest.pop(); items.push({ x: c.x, y: c.y, kind: 'potion', emoji: '🧪' }); }
          for (let i = 0; i < 3 && rest.length; i++) { const c = rest.pop(); items.push({ x: c.x, y: c.y, kind: 'gold', emoji: '💰' }); }
          if (rest.length) { const c = rest.pop(); items.push({ x: c.x, y: c.y, kind: 'sword', emoji: '⚔️' }); }
          reveal();
          hud();
        }
        function reveal() { for (let y = py - 2; y <= py + 2; y++) for (let x = px - 2; x <= px + 2; x++) if (y >= 0 && x >= 0 && y < ROWS && x < COLS && Math.abs(x - px) + Math.abs(y - py) <= 3) seen[y][x] = true; }
        const free = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && map[y][x] === '.';
        function tryMove(dx, dy) {
          if (!running || dead) return;
          const nx = px + dx, ny = py + dy;
          const en = enemies.find((e) => e.x === nx && e.y === ny);
          if (en) { hitEnemy(en); endTurn(); return; }
          if (!free(nx, ny)) { say('かべだ', 500); return; }
          anim.push({ kind: 'move', from: [px, py], born: performance.now() });
          px = nx; py = ny; reveal();
          const it = items.find((i) => i.x === px && i.y === py);
          if (it) { items.splice(items.indexOf(it), 1); if (it.kind === 'potion') { potions++; say('🧪 くすりを ひろった'); } else if (it.kind === 'gold') { gold += 10 + floor * 5; say('💰 おかねを ひろった'); } else { atk += 2; say('⚔️ けんを ひろった! こうげき力+2'); } hud(); }
          if (px === stairs.x && py === stairs.y) { if (floor >= FLOORS) { finish(true); return; } floor++; say(`🪜 B${floor}Fへ おりた…`, 1400); genFloor(); return; }
          endTurn();
        }
        function hitEnemy(en) {
          const dmg = atk + Math.floor(Math.random() * 2); en.hp -= dmg; en.awake = true; anim.push({ kind: 'hit', x: en.x, y: en.y, born: performance.now(), text: '-' + dmg });
          if (en.hp <= 0) { enemies.splice(enemies.indexOf(en), 1); kills++; gold += en.gold; say(`${en.emoji}を たおした! 💰+${en.gold}`, 900); hud(); } else say(`${en.emoji}に ${dmg}ダメージ`, 700);
        }
        function endTurn() {
          turn++;
          for (const e of enemies) {
            const dist = Math.abs(e.x - px) + Math.abs(e.y - py);
            if (dist <= 5) e.awake = true;
            if (!e.awake) { if (Math.random() < 0.3) { const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(() => Math.random() - 0.5); for (const [dx, dy] of dirs) if (free(e.x + dx, e.y + dy) && !enemies.some((o) => o.x === e.x + dx && o.y === e.y + dy)) { e.x += dx; e.y += dy; break; } } continue; }
            if (dist === 1) { const dmg = e.atk + Math.floor(Math.random() * 2); hp -= dmg; anim.push({ kind: 'hit', x: px, y: py, born: performance.now(), text: '-' + dmg, me: true }); say(`${e.emoji}の こうげき! ${dmg}ダメージ`, 800); hud(); if (hp <= 0) { dead = true; finish(false); return; } continue; }
            const dmap = mazeBfs(map.map((r) => r.join('')), px, py);
            let best = null;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = e.x + dx, ny = e.y + dy; if (!free(nx, ny) || enemies.some((o) => o.x === nx && o.y === ny) || (nx === px && ny === py)) continue; if (dmap[ny][nx] >= 0 && (!best || dmap[ny][nx] < best.d)) best = { x: nx, y: ny, d: dmap[ny][nx] }; }
            if (best && best.d < dmap[e.y][e.x]) { e.x = best.x; e.y = best.y; }
          }
        }
        container.querySelector('#rgUp').addEventListener('pointerdown', (e) => { e.preventDefault(); tryMove(0, -1); });
        container.querySelector('#rgDown').addEventListener('pointerdown', (e) => { e.preventDefault(); tryMove(0, 1); });
        container.querySelector('#rgLeft').addEventListener('pointerdown', (e) => { e.preventDefault(); tryMove(-1, 0); });
        container.querySelector('#rgRight').addEventListener('pointerdown', (e) => { e.preventDefault(); tryMove(1, 0); });
        container.querySelector('#rgWait').addEventListener('pointerdown', (e) => { e.preventDefault(); if (running && !dead) { hp = Math.min(maxHp, hp + 1); hud(); endTurn(); } });
        potionBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running || dead || potions <= 0) return; potions--; hp = Math.min(maxHp, hp + 10); hud(); say('🧪 HPが 10 かいふく', 900); });
        let swipe = null;
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); swipe = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointerup', (e) => { if (!swipe || e.pointerId !== swipe.id) return; const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; swipe = null; if (Math.max(Math.abs(dx), Math.abs(dy)) < 14) { const p = mgPointerPos(canvas, e); const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL); const ddx = cx - px, ddy = cy - py; if (Math.abs(ddx) + Math.abs(ddy) === 1) tryMove(ddx, ddy); return; } if (Math.abs(dx) > Math.abs(dy)) tryMove(dx < 0 ? -1 : 1, 0); else tryMove(0, dy < 0 ? -1 : 1); });
        canvas.addEventListener('pointercancel', () => { swipe = null; });
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#0d0b12'; ctx.fillRect(0, 0, W, H);
          for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
            if (!seen[y][x]) continue;
            const inSight = Math.abs(x - px) + Math.abs(y - py) <= 3;
            const wall = map[y][x] === '#';
            ctx.fillStyle = wall ? (inSight ? '#4a3f5c' : '#2a2434') : (inSight ? '#8a7a66' : '#4a4238');
            ctx.fillRect(x * CELL, y * CELL, CELL + 0.5, CELL + 0.5);
            if (!wall) { ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2); }
            else { ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(x * CELL, y * CELL, CELL, 3); }
          }
          ctx.font = `${CELL * 0.72}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          if (seen[stairs.y][stairs.x]) ctx.fillText('🪜', (stairs.x + 0.5) * CELL, (stairs.y + 0.5) * CELL);
          for (const it of items) if (seen[it.y][it.x]) ctx.fillText(it.emoji, (it.x + 0.5) * CELL, (it.y + 0.5) * CELL);
          for (const e of enemies) { if (!seen[e.y][e.x] || Math.abs(e.x - px) + Math.abs(e.y - py) > 4) continue; ctx.fillText(e.emoji, (e.x + 0.5) * CELL, (e.y + 0.5) * CELL); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(e.x * CELL + 3, e.y * CELL + 2, CELL - 6, 3); ctx.fillStyle = '#ff5c5c'; ctx.fillRect(e.x * CELL + 3, e.y * CELL + 2, (CELL - 6) * clamp(e.hp / e.maxHp, 0, 1), 3); }
          const mv = anim.find((a) => a.kind === 'move' && now - a.born < 110);
          let dx = 0, dy = 0; if (mv) { const t = 1 - (now - mv.born) / 110; dx = (mv.from[0] - px) * t; dy = (mv.from[1] - py) * t; }
          ctx.fillStyle = 'rgba(255,230,150,.18)'; ctx.beginPath(); ctx.arc((px + 0.5 + dx) * CELL, (py + 0.5 + dy) * CELL, CELL * 1.6, 0, Math.PI * 2); ctx.fill();
          ctx.font = `${CELL * 0.8}px sans-serif`; ctx.fillText(currentSprite(), (px + 0.5 + dx) * CELL, (py + 0.5 + dy) * CELL);
          anim = anim.filter((a) => now - a.born < 600);
          for (const a of anim) if (a.kind === 'hit') { const t = (now - a.born) / 600; ctx.globalAlpha = 1 - t; ctx.fillStyle = a.me ? '#ff5c5c' : '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.fillText(a.text, (a.x + 0.5) * CELL, (a.y + 0.2) * CELL - t * 14); ctx.globalAlpha = 1; }
          if (now < msgUntil) { ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 100, H - 26, 200, 22); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H - 15); }
        }
        function loop(now) { if (!running) return; render(now); if (now - startTime > 180000) { finish(false); return; } rafId = requestAnimationFrame(loop); }
        function finish(win) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const score = win ? clamp(Math.round(60 + hp * 1.2 + Math.min(20, gold * 0.3)), 60, 100) : clamp(Math.round(12 + (floor - 1) * 14 + kills * 3 + Math.min(10, gold * 0.2)), 10, 58);
          say(win ? `🏆 ダンジョンを ぬけた! 💰${gold} たおした${kills}` : dead ? `たおれた… B${floor}F で ちからつきた` : 'じかんぎれ…', 2400);
          render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        genFloor();
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const ROGUELIKE_VARIANTS = [mg('roguelike-dungeon', makeRoguelikeGame({ title: 'ローグライク!ダンジョンを 3かい おりて だっしゅつ' }))];

  const MINIGAMES = [
    ...ROAD_GAME_VARIANTS,
    ...STACK_GAME_VARIANTS,
    ...CHASE_GAME_VARIANTS,
    ...SHOOTER_GAME_VARIANTS,
    ...ACTION_BOSS_VARIANTS,
    ...FALLING_BLOCK_VARIANTS,
    ...CRANE_GAME_VARIANTS,
    ...PINBALL_VARIANTS,
    ...HAUNTED_HOUSE_VARIANTS,
    ...SWIPE_THROW_VARIANTS,
    ...STEALTH_GAME_VARIANTS,
    ...BREAKOUT_VARIANTS,
    ...SPORTS_SWING_VARIANTS,
    ...DRAG_DECORATE_VARIANTS,
    ...PERSPECTIVE_3D_VARIANTS,
    ...FIRST_PERSON_DUNGEON_VARIANTS,
    ...CREATURE_CAPTURE_VARIANTS,
    ...ADVENTURE_FIELD_VARIANTS,
    ...ROAD_RACE_VARIANTS,
    ...RHYTHM_HIGHWAY_VARIANTS,
    ...TILT_MAZE_VARIANTS,
    ...SPACE_GUNNER_VARIANTS,
    ...MINI_GOLF_VARIANTS,
    ...REAL_FISHING_VARIANTS,
    ...BASKETBALL_VARIANTS,
    ...PING_PONG_VARIANTS,
    ...CHAIN_PUZZLE_VARIANTS,
    ...STREET_FIGHT_VARIANTS,
    ...FREE_KICK_VARIANTS,
    ...TOWER_DEFENSE_VARIANTS,
    ...ROGUELIKE_VARIANTS,
  ];

  // MINIGAMES の どの ゲームが どの「しゅるい」(生成もとの make*Game
  // ジェネレーター)に ぞくすかを、オブジェクトの まま ひきなおせる
  // Map として おぼえておく。地域限定あそびが「その しゅるい」を まるごと
  // 地域仕様に おきかえる さいに つかう(下の buildMinigamePool 参照)
  const MINIGAME_CATEGORY_GROUPS = [
    ['road', ROAD_GAME_VARIANTS],
    ['stack', STACK_GAME_VARIANTS],
    ['chase', CHASE_GAME_VARIANTS],
    ['shooter', SHOOTER_GAME_VARIANTS],
    ['actionBoss', ACTION_BOSS_VARIANTS],
    ['fallingBlock', FALLING_BLOCK_VARIANTS],
    ['craneGame', CRANE_GAME_VARIANTS],
    ['pinball', PINBALL_VARIANTS],
    ['hauntedHouse', HAUNTED_HOUSE_VARIANTS],
    ['swipeThrow', SWIPE_THROW_VARIANTS],
    ['stealth', STEALTH_GAME_VARIANTS],
    ['breakout', BREAKOUT_VARIANTS],
    ['sportsSwing', SPORTS_SWING_VARIANTS],
    ['dragDecorate', DRAG_DECORATE_VARIANTS],
    ['perspective3d', PERSPECTIVE_3D_VARIANTS],
    ['firstPersonDungeon', FIRST_PERSON_DUNGEON_VARIANTS],
    ['creatureCapture', CREATURE_CAPTURE_VARIANTS],
    ['adventureField', ADVENTURE_FIELD_VARIANTS],
    ['roadRace', ROAD_RACE_VARIANTS],
    ['rhythmHighway', RHYTHM_HIGHWAY_VARIANTS],
    ['tiltMaze', TILT_MAZE_VARIANTS],
    ['spaceGunner', SPACE_GUNNER_VARIANTS],
    ['miniGolf', MINI_GOLF_VARIANTS],
    ['realFishing', REAL_FISHING_VARIANTS],
    ['basketball', BASKETBALL_VARIANTS],
    ['pingPong', PING_PONG_VARIANTS],
    ['chainPuzzle', CHAIN_PUZZLE_VARIANTS],
    ['streetFight', STREET_FIGHT_VARIANTS],
    ['freeKick', FREE_KICK_VARIANTS],
    ['towerDefense', TOWER_DEFENSE_VARIANTS],
    ['roguelike', ROGUELIKE_VARIANTS],
  ];
  const minigameCategoryOf = new Map();
  for (const [category, variants] of MINIGAME_CATEGORY_GROUPS) {
    for (const game of variants) minigameCategoryOf.set(game, category);
  }

  // 地域ごとの あそび。一般プールとは別に地域らしいテーマを足す。
  // 同じ「左右に動いて落下物を拾う」キャッチ系は一般・地域とも抽選から外した。
  // 地域側は釣り・滑走・ロード・積み上げなど、操作感が変わるものだけ残す。
  const REGION_MINIGAMES = {
    home: [],
    city: [
      { category: 'road', game: makeRoadGame({
        title: 'とかいを はしろう!ラッキーアイテムは キャッチ、しょうがいぶつは よけて',
        goodItems: ['🍩','☕','🎫','💰'], badItems: ['🐦','🚧','🗑️','⚠️'], scene: 'city',
      }) },
    ],
    countryside: [
      { category: 'stack', game: makeStackGame({
        title: 'いなかの しゅうかくタワー!くずさず つもう',
        blockEmoji: '🌾',
        palette: ['#d6b85a','#af9b4f','#8c7b3f','#e4cf77','#9f8c53','#cab86e','#776638'],
      }) },
    ],
    forest: [
      { category: 'stack', game: makeStackGame({
        title: 'きのみタワー!たかく つみあげよう',
        blockEmoji: '🌰',
        palette: ['#8a9a5b','#a3b18a','#dad7cd','#588157','#3a5a40','#344e41','#bc6c25'],
      }) },
    ],
    mountain: [
      { category: 'downhill', game: mg('downhill-mountain', randomThemeGame(makeDownhillGame, DOWNHILL_THEMES)) },
    ],
    snow: [
      { category: 'downhill', game: mg('downhill-snow', randomThemeGame(makeDownhillGame, DOWNHILL_THEMES)) },
    ],
    sea: [
      { category: 'fishing', game: mg('fishing-sea', makeRealFishingGame({ title: 'うみで ほんかく さかなつり!あわせて まいて つりあげろ' })) },
    ],
    deepsea: [
      { category: 'fishing', game: mg('fishing-deepsea', makeRealFishingGame({ title: 'しんかいフィッシング!なにが かかるか わからない', species: DEEPSEA_FISH, waterTop: '#1d5a8a', waterBottom: '#03122a' })) },
    ],
    river_lake: [
      { category: 'fishing', game: mg('fishing-river', makeRealFishingGame({ title: 'かわ・みずうみで さかなつり!ながれを よもう', species: RIVER_FISH, waterTop: '#5fc0b0', waterBottom: '#1c5a5a' })) },
    ],
    jungle: [
      { category: 'road', game: makeRoadGame({
        title: 'ジャングルを かけぬけろ!くだものは とって、とげとヘビは よけて',
        goodItems: ['🍌','🥭','🥥','⭐'], badItems: ['🐍','🌵','🕸️','⚠️'], scene: 'jungle',
      }) },
    ],
    desert: [
      { category: 'road', game: makeRoadGame({
        title: 'さばくを はしろう!オアシスの めぐみは とって、とげは よけて',
        goodItems: ['💧','🍈','⭐','🧢'], badItems: ['🦂','🐍','☠️','🔥'], scene: 'desert',
      }) },
    ],
  };

  // きせつごとの あそび。  // きせつごとの あそび。地域とはちがい、その category を まるごと
  // おきかえるのではなく、いま の きせつのあいだだけ「おまけの あと数種類」
  // として ふつうの プールに くわわる(きせつが すぎれば また 出なくなる)。
  // しょうらい きせつごとに 出現する ゲームを かえたり ふやしたり できる
  // よう、REGION_MINIGAMES と おなじ かたち([{category, game}, ...])で
  // もたせてある
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

  const SEASONAL_MINIGAMES = {
    // 季節ゲームも「その季節なら遊びたい」ものだけ残す。
    [SEASON.SPRING]: [],
    [SEASON.SUMMER]: [
      { category: 'surfing', game: mg('surfing-wave', makeSurfingGame({ title: 'サーフィン!なみに のって バランスを たもとう' })) },
    ],
    [SEASON.AUTUMN]: [
      { category: 'stack', game: makeStackGame({
        title: 'おちばの やまを たかく つもう!',
        blockEmoji: '🍁',
        palette: ['#c1440e', '#e3843b', '#d4a017', '#a0522d', '#8b5a2b', '#6b4226', '#e08214'],
      }) },
    ],
    [SEASON.WINTER]: [],
  };

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
    const regionEntries = REGION_MINIGAMES[activeRegion.minigameBaseId || activeRegion.id];
    return !!regionEntries && regionEntries.some((entry) => entry.game === game);
  }

  function isSeasonExclusiveGame(game) {
    const seasonEntries = SEASONAL_MINIGAMES[getEffectiveSeason()];
    return !!seasonEntries && seasonEntries.some((entry) => entry.game === game);
  }

  // ミニゲームの 出やすさは「質の ティア」で きめる。
  //  S: 物理/3D/れんぞく操作が ある、いちばん あそびごたえの ある ゲーム(追加チケット2枚)
  //  A: 操作感や 展開に 変化が あって しっかり あそべる ゲーム(追加チケット1枚)
  //  B: みじかい タイミング/選択の ゲーム(そのまま)
  // ゲームid に ついた ティアが 優先、なければ カテゴリの ティア、それも なければ B
  const MINIGAME_TIER_WEIGHT = { S: 2.4, A: 1.45, B: 0.7 };
  const MINIGAME_TIER_TICKETS = { S: 2, A: 1, B: 0 };
  const MINIGAME_TIER_BY_ID = {
    'pinball-physics': 'S', 'haunted-house-3d': 'S', 'fp-dungeon': 'S', 'race-3d': 'S', 'rhythm-highway-3d': 'S',
    'tilt-maze-3d': 'S', 'space-gunner-3d': 'S', 'mini-golf-physics': 'S', 'real-fishing': 'S',
    'bowling-3d': 'S', 'archery-3d': 'S', 'basketball-3d': 'S', 'pingpong-3d': 'S',
    'chain-puzzle': 'S', 'street-fight': 'S', 'free-kick-3d': 'S', 'tower-defense': 'S', 'roguelike-dungeon': 'S',
    'road-themed': 'A', 'p3-space': 'A', 'p3-drive': 'A', 'fishing-sea': 'S', 'fishing-deepsea': 'S', 'fishing-river': 'S',
    'downhill-mountain': 'S', 'downhill-snow': 'S',
    'crane-game-3d': 'A', 'falling-block-puzzle': 'A', 'action-boss-3d': 'A', 'creature-capture-3d': 'A',
    'adventure-field': 'A', 'chase-themed': 'A', 'breakout-classic': 'A', 'shooter-themed': 'A',
    'p3-space': 'A', 'p3-drive': 'A', 'surfing-wave': 'A', 'stealth-themed': 'A',
  };
  const MINIGAME_TIER_BY_CATEGORY = {
    roadRace: 'S', rhythmHighway: 'S', tiltMaze: 'S', spaceGunner: 'S', miniGolf: 'S', realFishing: 'S', basketball: 'S', pingPong: 'S', swipeThrow: 'S', chainPuzzle: 'S', streetFight: 'S', freeKick: 'S', towerDefense: 'S', roguelike: 'S', pinball: 'S', hauntedHouse: 'S', firstPersonDungeon: 'S', downhill: 'S',
    chase: 'A', shooter: 'A', actionBoss: 'A', fallingBlock: 'A', craneGame: 'A', breakout: 'A', miniEscape: 'A', stealth: 'A', fishing: 'A', surfing: 'A', fight: 'A',
    creatureCapture: 'A', adventureField: 'A', perspective3d: 'A', road: 'A', sportsSwing: 'A', dragDecorate: 'A', targetAim: 'A',
  };
  function minigameTier(game) {
    if (game.id && MINIGAME_TIER_BY_ID[game.id]) return MINIGAME_TIER_BY_ID[game.id];
    const category = minigameCategoryOf.get(game);
    return MINIGAME_TIER_BY_CATEGORY[category] || 'B';
  }
  function minigameFunWeight(game) {
    return MINIGAME_TIER_WEIGHT[minigameTier(game)];
  }

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
      weight *= minigameFunWeight(game);
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
      for (let t = 0; t < MINIGAME_TIER_TICKETS[minigameTier(game)]; t++) spotlightTickets.push(i);
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
      ? ['いまのは きもちよかった!', 'これは もう1かい やりたい!', '最後のところ、もう一度 やりたい!', '思ったより できた!', '手が ちゃんと ついてきた!']
      : score >= 50
        ? ['あと ちょっと いけそう!', '途中までは よかった!', 'もう1回なら 変わりそう!', 'いい勝負だった!', 'いまの ミスだけ くやしい!']
        : ['今回は こんなもん!', 'つぎは もうちょい いける!', 'いまのは れんしゅう!', 'ちょっと くやしい!', 'もう1かいなら いけそう!'];
    return pools[Math.floor(Math.random() * pools.length)];
  }

  function finishMinigame(score, customMessage) {
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
    state.energy = clamp(state.energy - 12, 0, 100);
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
      const coins = Math.round((5 + Math.random() * 6) * starFactor * coinBoost);
      state.lifetime.money += coins;
      itemMessage = gotReward ? ` おたのしみに ${fun.emoji}${fun.label}、さらに 🎁 と 💰${coins} を もらった!` : ` おたのしみに ${fun.emoji}${fun.label} と 💰${coins} を もらった!`;
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
          pushLifeLog(companion.emoji, `${companion.name}が なかまに なった`);
          recruitedNow = true;
          resultMessage = isRare
            ? `${companion.emoji} ${companion.joined}`
            : `${companion.emoji} ${companion.name}が なかまに なった!`;
        } else {
          resultMessage = isRare
            ? `${companion.name}とは まだ なかよく なれなかった… レアなかまは ${RARE_COMPANION_RECRUIT_THRESHOLD}てん いじょうで なかまに なれる`
            : `${companion.name}とは まだ なかよく なれなかった… ${COMPANION_RECRUIT_THRESHOLD}てん いじょうで なかまに なれる`;
        }
      }
    }

    setMessage(resultMessage);

    gameActive = false;
    el.minigameOverlay.classList.add('hidden');
    el.minigameOverlay.innerHTML = '';
    el.screenNormal.classList.remove('hidden');

    // checkStoryEvents() no-ops while gameActive, so this must run after
    // gameActive flips back to false above
    if (isGreat) checkStoryEvents('minigame-great');
    else if (isBad) checkStoryEvents('minigame-bad');

    emotePet(recruitedNow ? 'fun' : isGreat ? 'fun' : isBad ? 'sad' : 'happy');
    checkMeters();
    saveState();
    render();
  }

  function startMinigame(game) {
    gameActive = true;
    // render() も おなじ じょうけんで これを セットしなおすが、つぎの
    // render() が よばれるまでの わずかな あいだも きせつの ぜんけい
    // エフェクトが えきしょうの てまえに のこらないよう、ここで すぐに とめる
    el.seasonFrontFx.classList.add('suppressed');
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
    game.start(el.minigameOverlay, finishMinigame);
  }

  let sleepRecoveryTimer = null;

  function stopSleepRecovery() {
    if (sleepRecoveryTimer) {
      clearInterval(sleepRecoveryTimer);
      sleepRecoveryTimer = null;
    }
  }

  function recoverSleepStep() {
    if (!state.isSleeping || !isLiveLife()) {
      stopSleepRecovery();
      return;
    }
    const boost = isEquipped('sleepboost1') ? 0.35 : 0;
    const step = (state.isSick ? 1.15 : 1.8) + boost;
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
    recoverSleepStep();
    if (state.isSleeping && state.energy < 100) {
      sleepRecoveryTimer = setInterval(recoverSleepStep, 100);
    }
  }

  const ACTION_RESULT_MESSAGES = {
    feed: ['🍚 ごちそうさま!', '🍚 おなかが みたされた', '🍚 いいにおいだった!', '🍚 ぺろっと たべた'],
    clean: ['🧹 きれいに なった!', '🧹 さっぱりした!', '🧹 ピカピカに なった!', '🧹 これで よし!'],
    sleep: ['🌙 すやすや…', '🌙 ねむりに ついた', '🌙 おやすみモード', '🌙 もう ねてる…'],
    wake: ['☀️ おはよう!', '☀️ 目が さめた!', '☀️ よく ねた!', '☀️ さて、なにしよう'],
    cure: ['💊 げんきが もどった!', '💊 なおった!', '💊 もう だいじょうぶそう', '💊 ちょっと らくに なった'],
  };

  const ACTION_BLOCKED_MESSAGES = {
    cleanAlready: ['🧹 まだ きれいだよ', '🧹 そうじするところ、いまは なさそう', '🧹 床を 見た。うん、まだ だいじょうぶ', '🧹 ほうきを 持ったけど、出番は なかった'],
    sleepingFeed: ['💤 ねてる。ごはんは あとで', '💤 いま 起こすのは かわいそうかも', '💤 ごはんの においにも まだ 起きない'],
    sleepingPlay: ['💤 ぐっすり。あそぶのは 起きてから', '💤 いまは 夢のなかで あそんでるかも', '💤 起きるまで ちょっと 待とう'],
    lowEnergyPlay: ['😮‍💨 いまは ちょっと つかれてる', '😮‍💨 あそぶ前に すこし 休みたいみたい', '😮‍💨 いま走ったら たぶん すぐ 座りこむ'],
    sleepingPet: ['💤 ぐっすり ねている', '💤 じゃれるのは 起きてからに しよう', '💤 いまは そっと しておこう'],
    sleepingCourt: ['💤 ねている。気持ちは 起きてから つたえよう', '💤 いま告白しても たぶん 聞いてない', '💤 起きたら ちゃんと はなそう'],
    sleepingTravel: ['💤 ねている。旅は 起きてから', '💤 このまま 連れていくのは さすがに むり', '💤 まず 起こしてから 出かけよう'],
  };

  function randomBlockedMessage(key) {
    const pool = ACTION_BLOCKED_MESSAGES[key] || [];
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : '';
  }

  function randomActionMessage(key) {
    const pool = ACTION_RESULT_MESSAGES[key] || [];
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : '';
  }

  function withFeedback(fn) {
    return () => {
      fn();
      saveState();
      render();
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
      applyDecline(8);
      if (!state.isSick && Math.random() < 0.3) {
        const sickness = SICKNESS_TYPES[Math.floor(Math.random() * SICKNESS_TYPES.length)];
        state.isSick = true;
        state.sicknessType = sickness.label;
        state.totalSicknessCount += 1;
        raiseDeathMeter(4);
        setMessage(`🍚 たべすぎて ${sickness.label}に なった`);
        speakEvent('overfeed');
      } else {
        setMessage('🍚 たべすぎた');
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
  const mgKeysDown = new Map();
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

  el.playBtn.addEventListener('click', () => {
    if (gameActive) return;
    if (state.isSleeping) {
      setMessage(randomBlockedMessage('sleepingPlay'));
      saveState();
      render();
      return;
    }
    if (state.energy < 10) {
      setMessage(randomBlockedMessage('lowEnergyPlay'));
      saveState();
      render();
      return;
    }
    state.actionCounts.play += 1;
    state.affectionStreak = 0;
    state.travelStreak = 0;
    const game = pickRandomMinigame();
    startMinigame(game);
  });

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
        setMessage('💊 びょうきではないのに くすりを のませた');
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
    if (state.stage === STAGE.EGG) {
      const pct = Math.min(100, Math.round((state.growth / HATCH_GROWTH) * 100));
      setMessage(`たまごを あたためた… もぞもぞ うごいている　${pct}%`);
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
      ? pickReaction([...PET_ANNOYED_REACTIONS, ...TALK_ANNOYED_REACTIONS, ...(hasCompanions ? COMPANION_ANNOYED_REACTIONS : [])], lastPlayWithReaction)
      : pickReaction([...PET_REACTIONS, ...TALK_REACTIONS, ...(hasCompanions ? [...COMPANION_PET_REACTIONS, ...COMPANION_TALK_REACTIONS] : [])], lastPlayWithReaction);
    lastPlayWithReaction = reaction;
    if (!checkMeters()) {
      // 日常の「じゃれる」は客観ナレーションを出さず、会話だけで見せる。
      // 状態変化の事実通知が必要な場面だけ setMessage() を使う。
      setMessage('');
      speakEvent(spammed ? 'play_with_annoyed' : 'play_with', { petText: reaction, partnerChance: 0.45, companionChance: 0.8 });
    }
    emotePet(spammed ? 'angry' : 'happy');
  }));

  const PARTNER_FIRST_ENCOUNTERS = {
    cat_ceo: ['🏙️ ビルの まえで、ねこが でんわを しながら いそいでいる。','🐈‍⬛「……5ふんだけなら あいてる」'],
    robot_neighbor: ['🤖 ロボットが こちらを じっと みている。','🤖「コレハ……キョウミ、デスカ？」'],
    field_cow: ['🐄 のはらで うしが 草を いっぽん さしだしてきた。','🐄「たべる？」'],
    sunflower_partner: ['🌻 ひまわりが こちらを むいた。たいようは べつの方向だ。','🌻「……。」'],
    forest_bear: ['🐻 木の うしろから 大きな クマが こちらを 見ている。','🐻「……みた？」'],
    grove_deer: ['🦌 シカと 目があった。すぐ にげた。','🦌 でも 少し先で また こっちを 見ている。'],
    cliff_goat: ['🐐 どうやって のぼったのか わからない崖に ヤギがいる。','🐐「こっち くる？」'],
    high_eagle: ['🦅 頭のうえを 大きな影が とおった。','🦅 ワシが 少しだけ こちらを 見た。'],
    snow_spirit: ['❄️ 雪のなかに ひとつだけ とけない光がある。','❄️「さむくない？」'],
    snowman: ['☃️ さっきまで なかった 雪だるまが ある。','☃️「……またきたね」'],
    rock_octopus: ['🐙 岩場から 8本の手が いっせいに 手をふった。','🐙「どれで あいさつする？」'],
    sea_mermaid: ['🧜 波のむこうから だれかが 陸を じっと見ている。','🧜「そこ、どんな ところ？」'],
    anglerfish: ['🐟 まっくらな海で 小さな光だけが 近づいてくる。','🐟「まぶしくない ここ、すき」'],
    swamp_croc: ['🐊 水面に 目だけが ふたつ。','🐊「……べつに まってない」'],
    gentle_gorilla: ['🦍 大きなゴリラが 道をふさいでいる。','🦍 そっと 花を どけて 道をあけてくれた。'],
    knitting_spider: ['🕷️ 木のあいだに きれいな糸の模様がある。','🕷️「ほどかないでね。まだ とちゅう」'],
    desert_scorpion: ['🦂 日かげが ひとつしかない。サソリが 少し よけた。','🦂「……ここ、あいてる」'],
    oasis_cactus: ['🌵 オアシスのそばに ひときわ 立派なサボテンがいる。','🌵「さわる？……おすすめは しない」'],
  };

  function playFirstPartnerEncounter(candidate) {
    if (!state.lifetime.partnerEncounters) state.lifetime.partnerEncounters = [];
    if (state.lifetime.partnerEncounters.includes(candidate.id)) return false;
    state.lifetime.partnerEncounters.push(candidate.id);
    const beats = PARTNER_FIRST_ENCOUNTERS[candidate.id] || [
      `${candidate.emoji} ${candidate.label}と はじめて 目があった。`,
      'なんとなく、また 会う気がした。',
    ];
    showStoryEvent({ emoji: candidate.emoji, message: beats[0] });
    setTimeout(() => showStoryEvent({ emoji: candidate.emoji, message: beats[1] }), 2300);
    pushLifeLog(candidate.emoji, `${candidate.label}と はじめて であった`);
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
          ? ` ${state.partner.label}とは、恋愛の向きが ちがうことにも 気づいた。`
          : '';
        setMessage(`じぶんの 気持ちが 少し はっきりした。「${orientationLabel(resolvedOrientation, state.gender)}」なんだと思う。${mismatchNote}`);
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
        pushLifeLog('💞', `${p.label}と なかなおりした`);
        if (!checkMeters()) {
          setMessage(`${p.emoji} ${p.label}と ちゃんと はなした。れんあいタイプは かわったけれど、それでも いっしょに いる ことに した`);
        }
        emotePet('love');
        return;
      }
      const left = MISMATCH_REPAIR_NEEDED - p.repair;
      if (!checkMeters()) {
        setMessage(`${p.emoji} ${p.label}と ぎこちなく はなした… あと ${left}かい むきあえば きっと つたわる`);
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
        pushLifeLog('💍', `${state.partner.label}と けっこんした`);
        if (state.partner.id !== 'guest' && !state.lifetime.partnersMarried.includes(state.partner.id)) {
          state.lifetime.partnersMarried.push(state.partner.id);
        }
        if (!checkMeters()) {
          setMessage(`💍 ${state.partner.label}と けっこんした`);
          const marriageLine = PARTNER_RELATIONSHIP_LINES[state.partner.id]?.marriage;
          speakEvent('marriage', { petText: marriageLine || undefined, partnerChance: 1, companionChance: 0.65 });
        }
        emotePet('love');
        return;
      }
      const reaction = pickReaction(courtFlirtReactions(state.partner.label), lastCourtReaction);
      lastCourtReaction = reaction;
      if (!checkMeters()) {
        // 恋人への日常的ないちゃつきは、客観説明を重ねず会話だけで見せる。
        setMessage('');
        speakEvent('court', { petText: reaction, partnerChance: 0.9, companionChance: 0.35 });
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
        setMessage('💞 いまは 気持ちを つたえたい あいてが いない');
        speakEvent('court_fail', { partnerChance: 0, companionChance: 0.35 });
      }
      emotePet('happy');
      return;
    }

    // 地域固有の恋人は、初回は「出会う」だけ。次に会ったときから求愛できる。
    // これで地域を旅する理由と、知り合ってから恋へ進む一段階を作る。
    if (candidate.id !== 'guest' && playFirstPartnerEncounter(candidate)) {
      setMessage(`${candidate.emoji} ${candidate.label}と しりあった。また 会えそうだ`);
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
      pushLifeLog('💑', `${candidate.label}と こいびとに なった`);
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
      const relationLines = PARTNER_RELATIONSHIP_LINES[candidate.id];
      const reaction = relationLines?.court || pickReaction(COURT_SUCCESS_REACTIONS, lastCourtReaction);
      lastCourtReaction = reaction;
      if (!checkMeters()) {
        setMessage(`💑 ${candidate.label}と こいびとに なった`);
        speakEvent('partner_new', { petText: reaction, partnerChance: 0.95, companionChance: 0.5 });
      }
      emotePet('love');
    } else {
      state.happiness = clamp(state.happiness - 3, 0, 100);
      applyDecline(2);
      const reaction = pickReaction(COURT_FAIL_REACTIONS, lastCourtReaction);
      lastCourtReaction = reaction;
      if (!checkMeters()) {
        setMessage('💞 気持ちは つたえた。返事は「もう少し 友達で いたい」だった');
        speakEvent('court_fail', { petText: reaction, partnerChance: 0, companionChance: 0.45 });
      }
      emotePet('sad');
    }
  }));

  // まいかい ちがう 地域が でるよう、今の 地域を のぞいて 抽選する
  // 「🌍 せかい」ボタンは、以前の「🧳 たび」の その場じっこうを やめて、
  // まず「せかい」がめん(きせつを かえる/たびに でる の いりぐち)を
  // ひらくだけに する。たびの じっこう ロジックじたいは worldTravelBtn に
  // そのまま うつした(内容は へんこう なし)
  el.travelBtn.addEventListener('click', () => openExclusiveMenu('world'));

  el.worldCloseBtn.addEventListener('click', () => {
    worldOpen = false;
    render();
  });

  el.worldSeasonMenuBtn.addEventListener('click', () => {
    closeAllMenuOverlays();
    seasonOpen = true;
    render();
  });

  el.seasonCloseBtn.addEventListener('click', () => {
    closeAllMenuOverlays();
    worldOpen = true;
    render();
  });

  el.seasonModeGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-swatch');
    if (!btn) return;
    selectSeasonMode(btn.dataset.id);
  });

  // 「🧳 たびに でる」は、以前は 押した しゅんかんに ランダムな 地域へ
  // その場で 移動していたが、いまは いちど「たびに でる」がめん(地域の
  // いちらん)を ひらき、行きたい 場所を えらんで タップする かたちに した
  el.worldTravelBtn.addEventListener('click', () => {
    closeAllMenuOverlays();
    travelOpen = true;
    render();
  });

  el.travelCloseBtn.addEventListener('click', () => {
    closeAllMenuOverlays();
    worldOpen = true;
    render();
  });

  // えらんだ 地域へ じっさいに たびに でる。げんき/まんぷく/きげんの
  // 増減・たびづかれ判定・ずかん用の きろくなど、なかみは いぜんの
  // ランダム移動時と まったく おなじ ロジックで、行き先だけが
  // 「ランダムに えらばれた もの」から「タップで えらんだ もの」に かわった
  function travelToRegion(region) {
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
      setMessage('地図を ひらいたけれど、その ばしょへ つづく道は まだ 見つからない');
      saveState();
      render();
      return;
    }
    const specialRewardTrip = (state.items.reward || 0) > 0 && window.confirm('🎁 ごほうびを1こ使って、とくべつな旅にしますか？');
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
    // (ぜんぶの地域8つ)」が「ふつうの地域7つ + とくべつ1つ」でも 成立して
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
      pushLifeLog(region.emoji, isSpecial ? `${region.label}に たどりついた` : `はじめて ${region.label}に いった`);
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
    if (hasNaotoItem('naoto_lantern') && Math.random() < 0.18) reaction += ' 🏮 みちの さきに ふしぎな あかりが ひとつ みえた。';
    if (!checkMeters()) {
      if (specialRewardTrip) {
        pushLifeLog('🎁', `とくべつな旅の おもいで: ${region.label}`);
        setMessage(`🎁 ${region.emoji} ${region.label}で、いつもより ゆっくり すごした。 ${reaction}`);
      } else {
        setMessage(spammedTravel
          ? `${region.emoji} ${region.label}に やってきた!でも たびづかれで ちょっと ぐったり…${reaction}`
          : `${region.emoji} ${region.label}に やってきた!${reaction}`);
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
      setMessage('いまは あそべなかった… また こんど さそって もらおう');
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
      ? `${companion.emoji} ${companion.name}は「また こんどね」と かえっていった`
      : 'また こんど あそぼう');
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
      `ずかん <b>${state.discoveredStages.length} / ${dexTotal}</b>`,
      `じっせき <b>${state.achievementsUnlocked.length} / ${ACHIEVEMENTS.length}</b>`,
      `おかね <b>💰${L.money}</b>`,
      `そうび <b>${(L.ownedShopItems || []).length}こ</b>`,
      `これまで そだてた こ <b>${(L.pastLives || []).length}ひき</b>`,
    ].map((t) => `<div>${t}</div>`).join('');
    el.wipeOverlay.classList.remove('hidden');
  });
  el.wipeCancelBtn.addEventListener('click', () => el.wipeOverlay.classList.add('hidden'));
  el.wipeNextBtn.addEventListener('click', () => {
    el.wipeOverlay.classList.add('hidden');
    el.wipeConfirmOverlay.classList.remove('hidden');
  });
  el.wipeConfirmCancelBtn.addEventListener('click', () => {
    cancelWipeHold();
    el.wipeConfirmOverlay.classList.add('hidden');
  });

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
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* storage unavailable */ }
    state = freshState();
    el.wipeConfirmOverlay.classList.add('hidden');
    themeOpen = false;
    dexOpen = false;
    achOpen = false;
    itemOpen = false;
    setMessage('ぜんぶ きえました。はじめまして!');
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
    setMessage('あたらしい たまごが やってきた…');
  }));

  el.gameClearCloseBtn.addEventListener('click', withFeedback(() => {
    grandGoalPending = null;
  }));

  el.gameClearFreePlayBtn.addEventListener('click', withFeedback(() => {
    grandGoalPending = null;
    // ⑤ パーフェクトクリアの ごほうび: ねんれいから じゆうに なった
    // ♾️ の せかいへ はいる(enterInfinite() さんしょう)
    enterInfinite();
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
    setMessage(`${stage.emoji} ${stage.label}に すがたを かえた!${breakupMessage}`);
    emotePet(breakupMessage ? 'sad' : 'happy');
    saveState();
    render();
  });

  el.achBtn.addEventListener('click', () => openExclusiveMenu('ach'));

  el.achCloseBtn.addEventListener('click', () => {
    achOpen = false;
    render();
  });

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

  el.naotoItemGrid.addEventListener('click', () => {
    // 達成報酬なので購入操作はない。
  });

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
    itemOpen = false; worldOpen = false; seasonOpen = false; travelOpen = false; dateOpen = false;
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
      el.codeError.textContent = 'コードが よみとれませんでした…もういちど たしかめてね';
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
      el.duelBetError.textContent = 'かけきんを 1いじょうの すうじで 入力してください';
      el.duelBetError.classList.remove('hidden');
      return;
    }
    if (bet > state.lifetime.money) {
      el.duelBetError.textContent = 'おかねが たりません';
      el.duelBetError.classList.remove('hidden');
      return;
    }
    const d = startDuelChallenge(bet);
    if (!d) {
      el.duelBetError.textContent = 'かけきんを かくにんしてください';
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
      el.duelGuessCodeError.textContent = 'おかねが たりなくて さんかできません…';
      el.duelGuessCodeError.classList.remove('hidden');
      return;
    }
    if (!result || result.error) {
      el.duelGuessCodeError.textContent = 'コードが よみとれませんでした…もういちど たしかめてね';
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
      el.duelGuessConfirmError.textContent = 'すべての しつもんに すいりを えらんでください';
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
      el.duelCodeInError.textContent = 'コードが よみとれませんでした…もういちど たしかめてね';
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
    if (isAnyMenuOverlayOpen()) return;
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
    pushLifeLog('💔', `${legacyResolution.label}と 関係を はなしあって 整理した`);
    setTimeout(() => {
      setMessage(legacyResolution.married
        ? `${who}と ちゃんと はなした。恋愛の向きが ちがうことを 確かめて、夫婦ではなくなることにした`
        : `${who}と ちゃんと はなした。恋愛の向きが ちがうことを 確かめて、こいびとではなくなることにした`);
      sayPet('これからは、おたがいに むりのない かたちで いよう');
    }, 350);
  }
  if (!stateLoadRecovered) {
    saveState();
  } else {
    // 読み込み異常時は、復旧候補を表示するだけで元セーブを自動上書きしない。
    // 次の正常なユーザー操作/定期保存までにバックアップが残る。
    setTimeout(() => setMessage('セーブデータを保護して復旧しました。内容を確認してください'), 250);
  }
  render();
  setInterval(loop, TICK_MS);
  scheduleIdlePerk();
  scheduleIdleGreeting();
  scheduleCompanionEncounter();

  // save immediately whenever the tab is hidden/closed so nothing is lost
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveState();
    }
  });
  window.addEventListener('beforeunload', () => {
    saveState();
  });
})();
