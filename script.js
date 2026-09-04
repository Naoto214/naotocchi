(() => {
  'use strict';

  const SAVE_KEY = 'naotocchi-save-v1';
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
    GROWING: 'growing', // baby..elder - which one is tracked by state.stageIndex
    DEAD: 'dead',
    CLEAR: 'clear',
  };

  // age at which an egg hatches - the same for every line, since which line
  // it hatches into is picked randomly at that moment
  const HATCH_AGE = 2;

  const AGE_MIN = 0;
  const AGE_MAX = 9999;

  // reaching this displayed 年齢 (state.age / 20) wins the game, however
  // that age was reached - normal aging, evolution jumps, or a mix
  const GOAL_DAYS = 100;

  // used only to scale minigame difficulty continuously with age - not tied
  // to any one line's actual stage thresholds
  const MAX_DIFFICULTY_AGE = 60;

  // every line shares this 8-value threshold curve, so a line's own 6
  // original stages (at indices 0,2,3,5,6,7) keep their exact original ages
  // (2/8/16/26/40/60) - the two new indices (1 and 4) just insert an extra
  // growth beat without touching any of that existing pacing
  const STAGES_PER_LINE = 8;
  const STAGE_THRESHOLDS = [HATCH_AGE, 5, 8, 16, 20, 26, 40, 60];

  // each line is its own baby -> elder growth path (own emoji and label at
  // every stage, not a generic bird sprite shared by everyone pre-adult).
  // which line an egg hatches into is random (see pickRandomLine) - なる
  // messages are deliberately distinct per line/stage rather than templated
  const SPECIES = {
    dog: {
      stages: [
        { threshold: STAGE_THRESHOLDS[0], emoji: '🐶', label: 'あかちゃんいぬ' },
        { threshold: STAGE_THRESHOLDS[1], emoji: '🐶', label: 'よちよちあるく こいぬ', message: 'よちよちあるく こいぬに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[2], emoji: '🐶', label: 'こいぬ', message: 'こいぬに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[3], emoji: '🐕', label: 'わんぱくいぬ', message: 'わんぱくいぬに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[4], emoji: '🐕', label: 'そとあそび だいすきな いぬ', message: 'そとあそび だいすきな いぬに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[5], emoji: '🐕', label: 'わかいいぬ', message: 'わかいいぬに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[6], emoji: '🐕', label: 'いぬ', message: 'げんきいっぱいの いぬに へんしんした!' },
        { threshold: STAGE_THRESHOLDS[7], emoji: '🐕', label: 'としをとった いぬ', message: 'としをとった いぬに なった…' },
      ],
    },
    cat: {
      stages: [
        { threshold: STAGE_THRESHOLDS[0], emoji: '🐱', label: 'あかちゃんねこ' },
        { threshold: STAGE_THRESHOLDS[1], emoji: '🐱', label: 'よちよちあるく こねこ', message: 'よちよちあるく こねこに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[2], emoji: '🐱', label: 'こねこ', message: 'こねこに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[3], emoji: '🐈', label: 'おてんばねこ', message: 'おてんばねこに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[4], emoji: '🐈', label: 'きままに あるきまわる ねこ', message: 'きままに あるきまわる ねこに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[5], emoji: '🐈', label: 'わかいねこ', message: 'わかいねこに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[6], emoji: '🐈', label: 'ねこ', message: 'きままな ねこに へんしんした!' },
        { threshold: STAGE_THRESHOLDS[7], emoji: '🐈', label: 'としをとった ねこ', message: 'としをとった ねこに なった…' },
      ],
    },
    bird: {
      stages: [
        { threshold: STAGE_THRESHOLDS[0], emoji: '🐣', label: 'ひな' },
        { threshold: STAGE_THRESHOLDS[1], emoji: '🐣', label: 'はねが はえてきた ひな', message: 'はねが はえてきた!' },
        { threshold: STAGE_THRESHOLDS[2], emoji: '🐥', label: 'こどり', message: 'こどりに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[3], emoji: '🐤', label: 'わかどり', message: 'わかどりに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[4], emoji: '🐤', label: 'とびかたを れんしゅうする とり', message: 'とびかたの れんしゅうを はじめた!' },
        { threshold: STAGE_THRESHOLDS[5], emoji: '🐤', label: 'はばたくとり', message: 'はばたくとりに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[6], emoji: '🐦', label: 'とり', message: 'じゆうな とりに へんしんした!' },
        { threshold: STAGE_THRESHOLDS[7], emoji: '🦜', label: 'としをとった とり', message: 'としをとった とりに なった…' },
      ],
    },
    man: {
      stages: [
        { threshold: STAGE_THRESHOLDS[0], emoji: '👶', label: 'あかちゃん' },
        { threshold: STAGE_THRESHOLDS[1], emoji: '👶', label: 'よちよちあるきの こども', message: 'よちよちあるきの こどもに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[2], emoji: '🧒', label: 'おとこのこ', message: 'おとこのこに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[3], emoji: '👦', label: 'しょうねん', message: 'しょうねんに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[4], emoji: '👦', label: 'はんぱんきの しょうねん', message: 'はんぱんきの しょうねんに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[5], emoji: '🧑', label: 'せいねん', message: 'せいねんに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[6], emoji: '🧑', label: 'おとこのひと', message: 'たくましい おとこのひとに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[7], emoji: '👴', label: 'おじいさん', message: 'おじいさんに なった…' },
      ],
    },
    woman: {
      stages: [
        { threshold: STAGE_THRESHOLDS[0], emoji: '👶', label: 'あかちゃん' },
        { threshold: STAGE_THRESHOLDS[1], emoji: '👶', label: 'よちよちあるきの こども', message: 'よちよちあるきの こどもに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[2], emoji: '🧒', label: 'おんなのこ', message: 'おんなのこに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[3], emoji: '👧', label: 'しょうじょ', message: 'しょうじょに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[4], emoji: '👧', label: 'おしゃれに めざめた しょうじょ', message: 'おしゃれに めざめた しょうじょに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[5], emoji: '👧', label: 'わかいおんなのひと', message: 'わかいおんなのひとに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[6], emoji: '👩', label: 'おんなのひと', message: 'りりしい おんなのひとに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[7], emoji: '👵', label: 'おばあさん', message: 'おばあさんに なった…' },
      ],
    },
    beetle: {
      stages: [
        { threshold: STAGE_THRESHOLDS[0], emoji: '🐛', label: 'ようちゅう' },
        { threshold: STAGE_THRESHOLDS[1], emoji: '🐛', label: 'すこし おおきくなった ようちゅう', message: 'すこし おおきく なった!' },
        { threshold: STAGE_THRESHOLDS[2], emoji: '🐛', label: 'おおきくなった ようちゅう', message: 'ようちゅうが おおきく せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[3], emoji: '🪲', label: 'さなぎあがりの こがぶとむし', message: 'さなぎから でてきた!' },
        { threshold: STAGE_THRESHOLDS[4], emoji: '🪲', label: 'つのが のびてきた こがぶとむし', message: 'つのが ぐんぐん のびてきた!' },
        { threshold: STAGE_THRESHOLDS[5], emoji: '🪲', label: 'わかいカブトムシ', message: 'わかいカブトムシに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[6], emoji: '🪲', label: 'カブトムシ', message: 'たくましい カブトムシに へんしんした!' },
        { threshold: STAGE_THRESHOLDS[7], emoji: '🪲', label: 'でんせつの カブトムシ', message: 'でんせつの カブトムシに なった…' },
      ],
    },
    stagbeetle: {
      stages: [
        { threshold: STAGE_THRESHOLDS[0], emoji: '🐛', label: 'ようちゅう' },
        { threshold: STAGE_THRESHOLDS[1], emoji: '🐛', label: 'すこし おおきくなった ようちゅう', message: 'すこし おおきく なった!' },
        { threshold: STAGE_THRESHOLDS[2], emoji: '🐛', label: 'おおきくなった ようちゅう', message: 'ようちゅうが おおきく せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[3], emoji: '🪲', label: 'さなぎあがりの こくわがた', message: 'さなぎから でてきた!' },
        { threshold: STAGE_THRESHOLDS[4], emoji: '🪲', label: 'あごが りっぱに なってきた こくわがた', message: 'あごが りっぱに なってきた!' },
        { threshold: STAGE_THRESHOLDS[5], emoji: '🪲', label: 'わかいクワガタムシ', message: 'わかいクワガタムシに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[6], emoji: '🪲', label: 'クワガタムシ', message: 'りっぱな クワガタムシに へんしんした!' },
        { threshold: STAGE_THRESHOLDS[7], emoji: '🪲', label: 'でんせつの クワガタムシ', message: 'でんせつの クワガタムシに なった…' },
      ],
    },
    rabbit: {
      stages: [
        { threshold: STAGE_THRESHOLDS[0], emoji: '🐰', label: 'あかちゃんうさぎ' },
        { threshold: STAGE_THRESHOLDS[1], emoji: '🐰', label: 'よちよちはねる こうさぎ', message: 'よちよちはねる こうさぎに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[2], emoji: '🐰', label: 'こうさぎ', message: 'こうさぎに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[3], emoji: '🐇', label: 'わんぱくうさぎ', message: 'わんぱくうさぎに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[4], emoji: '🐇', label: 'ジャンプりょくが ついた うさぎ', message: 'ジャンプりょくが ついてきた!' },
        { threshold: STAGE_THRESHOLDS[5], emoji: '🐇', label: 'わかいうさぎ', message: 'わかいうさぎに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[6], emoji: '🐇', label: 'うさぎ', message: 'すばしっこい うさぎに へんしんした!' },
        { threshold: STAGE_THRESHOLDS[7], emoji: '🐇', label: 'としをとった うさぎ', message: 'としをとった うさぎに なった…' },
      ],
    },
    fish: {
      stages: [
        { threshold: STAGE_THRESHOLDS[0], emoji: '🐟', label: 'あかちゃんざかな' },
        { threshold: STAGE_THRESHOLDS[1], emoji: '🐟', label: 'ひれが うごきだした こざかな', message: 'ひれが うごきだした!' },
        { threshold: STAGE_THRESHOLDS[2], emoji: '🐟', label: 'こざかな', message: 'こざかなに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[3], emoji: '🐠', label: 'わんぱくざかな', message: 'わんぱくざかなに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[4], emoji: '🐠', label: 'むれで およぐ さかな', message: 'むれで およぐように なった!' },
        { threshold: STAGE_THRESHOLDS[5], emoji: '🐠', label: 'わかいさかな', message: 'わかいさかなに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[6], emoji: '🐡', label: 'さかな', message: 'カラフルな さかなに へんしんした!' },
        { threshold: STAGE_THRESHOLDS[7], emoji: '🐡', label: 'としをとった さかな', message: 'としをとった さかなに なった…' },
      ],
    },
    dragon: {
      stages: [
        { threshold: STAGE_THRESHOLDS[0], emoji: '🦎', label: 'あかちゃんりゅう' },
        { threshold: STAGE_THRESHOLDS[1], emoji: '🦎', label: 'うろこが かたくなってきた こりゅう', message: 'うろこが かたくなってきた!' },
        { threshold: STAGE_THRESHOLDS[2], emoji: '🦎', label: 'こりゅう', message: 'こりゅうに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[3], emoji: '🐉', label: 'わんぱくりゅう', message: 'わんぱくりゅうに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[4], emoji: '🐉', label: 'つばさが はえてきた りゅう', message: 'つばさが はえてきた!' },
        { threshold: STAGE_THRESHOLDS[5], emoji: '🐉', label: 'わかいりゅう', message: 'わかいりゅうに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[6], emoji: '🐉', label: 'りゅう', message: 'ほのおを ふく りゅうに へんしんした!' },
        { threshold: STAGE_THRESHOLDS[7], emoji: '🐉', label: 'でんせつの りゅう', message: 'でんせつの りゅうに なった…' },
      ],
    },
    panda: {
      stages: [
        { threshold: STAGE_THRESHOLDS[0], emoji: '🐼', label: 'あかちゃんパンダ' },
        { threshold: STAGE_THRESHOLDS[1], emoji: '🐼', label: 'よちよちあるく こパンダ', message: 'よちよちあるく こパンダに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[2], emoji: '🐼', label: 'やんちゃな パンダ', message: 'やんちゃな パンダに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[3], emoji: '🐼', label: 'ささを たべはじめた パンダ', message: 'ささを たべはじめた!' },
        { threshold: STAGE_THRESHOLDS[4], emoji: '🐼', label: 'ごろごろ ころがる パンダ', message: 'ごろごろ ころがるように なった!' },
        { threshold: STAGE_THRESHOLDS[5], emoji: '🐼', label: 'わかいパンダ', message: 'わかいパンダに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[6], emoji: '🐼', label: 'どっしりした パンダ', message: 'どっしりした パンダに へんしんした!' },
        { threshold: STAGE_THRESHOLDS[7], emoji: '🐼', label: 'としをとった パンダ', message: 'としをとった パンダに なった…' },
      ],
    },
    fox: {
      stages: [
        { threshold: STAGE_THRESHOLDS[0], emoji: '🦊', label: 'あかちゃんきつね' },
        { threshold: STAGE_THRESHOLDS[1], emoji: '🦊', label: 'よちよちあるく こぎつね', message: 'よちよちあるく こぎつねに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[2], emoji: '🦊', label: 'しっぽが ふさふさな こぎつね', message: 'しっぽが ふさふさに なってきた!' },
        { threshold: STAGE_THRESHOLDS[3], emoji: '🦊', label: 'わんぱくな きつね', message: 'わんぱくな きつねに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[4], emoji: '🦊', label: 'すばしっこい わかぎつね', message: 'すばしっこく なってきた!' },
        { threshold: STAGE_THRESHOLDS[5], emoji: '🦊', label: 'わかいきつね', message: 'わかいきつねに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[6], emoji: '🦊', label: 'ずるがしこい きつね', message: 'ずるがしこい きつねに へんしんした!' },
        { threshold: STAGE_THRESHOLDS[7], emoji: '🦊', label: 'せんれんされた きつね', message: 'せんれんされた きつねに なった…' },
      ],
    },
    owl: {
      stages: [
        { threshold: STAGE_THRESHOLDS[0], emoji: '🦉', label: 'あかちゃんふくろう' },
        { threshold: STAGE_THRESHOLDS[1], emoji: '🦉', label: 'めを あけたばかりの ひなふくろう', message: 'めを あけたばかりの ひなふくろうに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[2], emoji: '🦉', label: 'こふくろう', message: 'こふくろうに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[3], emoji: '🦉', label: 'よるに めざめる わんぱくふくろう', message: 'よるに めざめるように なった!' },
        { threshold: STAGE_THRESHOLDS[4], emoji: '🦉', label: 'とぶれんしゅうを する ふくろう', message: 'とぶれんしゅうを はじめた!' },
        { threshold: STAGE_THRESHOLDS[5], emoji: '🦉', label: 'わかいふくろう', message: 'わかいふくろうに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[6], emoji: '🦉', label: 'ちえのある ふくろう', message: 'ちえのある ふくろうに へんしんした!' },
        { threshold: STAGE_THRESHOLDS[7], emoji: '🦉', label: 'としをとった ふくろう', message: 'としをとった ふくろうに なった…' },
      ],
    },
    plant: {
      stages: [
        { threshold: STAGE_THRESHOLDS[0], emoji: '🌱', label: 'めが でたばかりの たね' },
        { threshold: STAGE_THRESHOLDS[1], emoji: '🌱', label: 'ふたばの め', message: 'ふたばが ひらいた!' },
        { threshold: STAGE_THRESHOLDS[2], emoji: '🌿', label: 'くきが のびた なえ', message: 'くきが ぐんぐん のびてきた!' },
        { threshold: STAGE_THRESHOLDS[3], emoji: '🌾', label: 'つぼみが ふくらんだ め', message: 'つぼみが ふくらんできた!' },
        { threshold: STAGE_THRESHOLDS[4], emoji: '🌷', label: 'はなびらが のぞく つぼみ', message: 'はなびらが のぞきはじめた!' },
        { threshold: STAGE_THRESHOLDS[5], emoji: '🌻', label: 'さきほこる はな', message: 'はなが さきほこった!' },
        { threshold: STAGE_THRESHOLDS[6], emoji: '🌼', label: 'みごとな はな', message: 'みごとな はなに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[7], emoji: '🥀', label: 'かれはじめた はな', message: 'すこしずつ かれはじめた…' },
      ],
    },
    robot: {
      stages: [
        { threshold: STAGE_THRESHOLDS[0], emoji: '🤖', label: 'くみたてちゅうの ミニロボット' },
        { threshold: STAGE_THRESHOLDS[1], emoji: '🤖', label: 'でんげんが はいった ロボット', message: 'でんげんが はいった!' },
        { threshold: STAGE_THRESHOLDS[2], emoji: '🤖', label: 'あるきかたを おぼえた ロボット', message: 'あるきかたを おぼえた!' },
        { threshold: STAGE_THRESHOLDS[3], emoji: '🤖', label: 'がくしゅうちゅうの ロボット', message: 'がくしゅうを はじめた!' },
        { threshold: STAGE_THRESHOLDS[4], emoji: '🦾', label: 'パワーアップした ロボット', message: 'パワーアップした!' },
        { threshold: STAGE_THRESHOLDS[5], emoji: '🦾', label: 'せんとうようの ロボット', message: 'せんとうようの ロボットに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[6], emoji: '🦾', label: 'さいしんがた ロボット', message: 'さいしんがたに アップグレードした!' },
        { threshold: STAGE_THRESHOLDS[7], emoji: '🤖', label: 'きゅうしきの ロボット', message: 'きゅうしきロボットに なった…' },
      ],
    },
    dinosaur: {
      stages: [
        { threshold: STAGE_THRESHOLDS[0], emoji: '🦕', label: 'たまごから でたばかりの きょうりゅう' },
        { threshold: STAGE_THRESHOLDS[1], emoji: '🦕', label: 'よちよちあるく こきょうりゅう', message: 'よちよちあるく こきょうりゅうに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[2], emoji: '🦕', label: 'とげが はえてきた きょうりゅう', message: 'とげが はえてきた!' },
        { threshold: STAGE_THRESHOLDS[3], emoji: '🦖', label: 'わんぱくな きょうりゅう', message: 'わんぱくな きょうりゅうに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[4], emoji: '🦖', label: 'するどい はが はえた きょうりゅう', message: 'するどい はが はえてきた!' },
        { threshold: STAGE_THRESHOLDS[5], emoji: '🦖', label: 'わかいきょうりゅう', message: 'わかいきょうりゅうに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[6], emoji: '🦖', label: 'きょだいな きょうりゅう', message: 'きょだいな きょうりゅうに へんしんした!' },
        { threshold: STAGE_THRESHOLDS[7], emoji: '🦴', label: 'かせきに なった きょうりゅう', message: 'ながい ときを へて かせきに なった…' },
      ],
    },
    // rare lines - never a starting hatch, only reachable as a 変身 choice
    // (see pickTransformCandidates) when care/skill has been exceptional
    god: {
      stages: [
        { threshold: STAGE_THRESHOLDS[0], emoji: '👼', label: 'あかちゃんてんし' },
        { threshold: STAGE_THRESHOLDS[1], emoji: '👼', label: 'はねが ちいさく はえてきた てんし', message: 'はねが ちいさく はえてきた!' },
        { threshold: STAGE_THRESHOLDS[2], emoji: '👼', label: 'こてんし', message: 'こてんしに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[3], emoji: '👼', label: 'みならいのてんし', message: 'みならいのてんしに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[4], emoji: '😇', label: 'ひかりを まといはじめた かみのこ', message: 'ひかりを まといはじめた!' },
        { threshold: STAGE_THRESHOLDS[5], emoji: '😇', label: 'わかきかみ', message: 'わかきかみに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[6], emoji: '😇', label: 'かみさま', message: 'まさかの…かみさまに しんかした!!' },
        { threshold: STAGE_THRESHOLDS[7], emoji: '🌞', label: 'だいじんの かみさま', message: 'だいじんの かみさまに なった…' },
      ],
    },
    ren: {
      stages: [
        { threshold: STAGE_THRESHOLDS[0], emoji: '👶', label: 'あかちゃんの れんくん' },
        { threshold: STAGE_THRESHOLDS[1], emoji: '👶', label: 'よちよちあるきの れんくん', message: 'よちよちあるきの れんくんに なった!' },
        { threshold: STAGE_THRESHOLDS[2], emoji: '🧒', label: 'れんくん', message: 'れんくんが おおきく なった!' },
        { threshold: STAGE_THRESHOLDS[3], emoji: '🧒', label: 'しょうねんの れんくん', message: 'しょうねんの れんくんに なった!' },
        { threshold: STAGE_THRESHOLDS[4], emoji: '🧒', label: 'いたずらざかりの れんくん', message: 'いたずらざかりの れんくんに なった!' },
        { threshold: STAGE_THRESHOLDS[5], emoji: '👦', label: 'せいねんの れんくん', message: 'せいねんの れんくんに なった!' },
        { threshold: STAGE_THRESHOLDS[6], emoji: '🧑', label: 'れんくん', message: 'あれ!?れんくんが なかまに くわわった!' },
        { threshold: STAGE_THRESHOLDS[7], emoji: '🧑', label: 'れんさん', message: 'れんさんに なった…' },
      ],
    },
    mermaid: {
      stages: [
        { threshold: STAGE_THRESHOLDS[0], emoji: '🐚', label: 'あかちゃんの かいがら' },
        { threshold: STAGE_THRESHOLDS[1], emoji: '🐚', label: 'うろこが きらめきだした こにんぎょ', message: 'うろこが きらめきだした!' },
        { threshold: STAGE_THRESHOLDS[2], emoji: '🐚', label: 'こにんぎょ', message: 'こにんぎょに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[3], emoji: '🧜', label: 'わんぱくにんぎょ', message: 'わんぱくにんぎょに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[4], emoji: '🧜', label: 'およぎが じょうずに なった にんぎょ', message: 'およぎが じょうずに なった!' },
        { threshold: STAGE_THRESHOLDS[5], emoji: '🧜', label: 'わかいにんぎょ', message: 'わかいにんぎょに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[6], emoji: '🧜‍♀️', label: 'にんぎょ', message: 'うみの プリンセス にんぎょに へんしんした!' },
        { threshold: STAGE_THRESHOLDS[7], emoji: '🧜‍♀️', label: 'でんせつの にんぎょ', message: 'でんせつの にんぎょに なった…' },
      ],
    },
    unicorn: {
      stages: [
        { threshold: STAGE_THRESHOLDS[0], emoji: '🐴', label: 'つのが みえはじめた あかちゃんうま' },
        { threshold: STAGE_THRESHOLDS[1], emoji: '🐴', label: 'よちよちあるく こうま', message: 'よちよちあるく こうまに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[2], emoji: '🦄', label: 'つのが のびてきた こうま', message: 'つのが のびてきた!' },
        { threshold: STAGE_THRESHOLDS[3], emoji: '🦄', label: 'わんぱくな ユニコーン', message: 'わんぱくな ユニコーンに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[4], emoji: '🦄', label: 'ひかりを はなちはじめた ユニコーン', message: 'ひかりを はなちはじめた!' },
        { threshold: STAGE_THRESHOLDS[5], emoji: '🦄', label: 'わかいユニコーン', message: 'わかいユニコーンに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[6], emoji: '🦄', label: 'でんせつの ユニコーン', message: 'まさかの…ユニコーンに しんかした!!' },
        { threshold: STAGE_THRESHOLDS[7], emoji: '🦄', label: 'おおいなる ユニコーン', message: 'おおいなる ユニコーンに なった…' },
      ],
    },
    phoenix: {
      stages: [
        { threshold: STAGE_THRESHOLDS[0], emoji: '🐣', label: 'ひのとりの ひな' },
        { threshold: STAGE_THRESHOLDS[1], emoji: '🐣', label: 'よちよちあるく ひな', message: 'よちよちあるく ひなに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[2], emoji: '🐥', label: 'ほのおを まといはじめた こどり', message: 'ほのおを まといはじめた!' },
        { threshold: STAGE_THRESHOLDS[3], emoji: '🐦‍🔥', label: 'わんぱくな ひのとり', message: 'わんぱくな ひのとりに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[4], emoji: '🐦‍🔥', label: 'つばさが もえあがる ひのとり', message: 'つばさが もえあがってきた!' },
        { threshold: STAGE_THRESHOLDS[5], emoji: '🐦‍🔥', label: 'わかいフェニックス', message: 'わかいフェニックスに せいちょうした!' },
        { threshold: STAGE_THRESHOLDS[6], emoji: '🐦‍🔥', label: 'でんせつの フェニックス', message: 'まさかの…フェニックスに しんかした!!' },
        { threshold: STAGE_THRESHOLDS[7], emoji: '🐦‍🔥', label: 'ふしちょうの フェニックス', message: 'ふしちょうの フェニックスに なった…' },
      ],
    },
  };

  // god/ren/mermaid/unicorn/phoenix are intentionally left out of the
  // random hatch pool - they stay rare, earned surprises unlocked only
  // through a 変身 choice
  const NORMAL_LINES = ['dog', 'cat', 'bird', 'man', 'woman', 'beetle', 'stagbeetle', 'rabbit', 'fish', 'dragon', 'panda', 'fox', 'owl', 'plant', 'robot', 'dinosaur'];
  const RARE_LINES = ['god', 'ren', 'mermaid', 'unicorn', 'phoenix'];
  const ALL_LINES = [...NORMAL_LINES, ...RARE_LINES];

  // プロフィール表示用の しゅぞく名(README の ずかん一覧と おなじ表記)
  const SPECIES_DISPLAY_NAMES = {
    dog: 'いぬ', cat: 'ねこ', bird: 'とり', man: 'おとこのひと', woman: 'おんなのひと',
    beetle: 'カブトムシ', stagbeetle: 'クワガタムシ', rabbit: 'うさぎ', fish: 'さかな',
    dragon: 'りゅう', panda: 'パンダ', fox: 'きつね', owl: 'ふくろう', plant: 'はな',
    robot: 'ロボット', dinosaur: 'きょうりゅう',
    god: 'かみさま', ren: 'れんくん', mermaid: 'にんぎょ', unicorn: 'ユニコーン', phoenix: 'フェニックス',
  };

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
    while (candidates.length < 2 && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      candidates.push(pool.splice(idx, 1)[0]);
    }

    const avgCare = state.careTicks > 0 ? state.careSum / state.careTicks : 0;
    const avgSkill = state.minigameCount > 0 ? state.minigameScoreSum / state.minigameCount : 0;
    const rarePool = RARE_LINES.filter((line) => {
      if (line === state.speciesLine) return false;
      if (line === 'god') return avgCare >= 90;
      if (line === 'ren') return (state.minigameCount >= 5 && avgSkill >= 85) || state.traitCounts.romantic >= 5;
      if (line === 'mermaid') return state.traitCounts.gentle >= 5;
      if (line === 'unicorn') return state.traitCounts.brave >= 5;
      if (line === 'phoenix') return state.totalSicknessCount >= 8;
      return false;
    });
    if (rarePool.length > 0 && Math.random() < 0.5) {
      const rare = rarePool[Math.floor(Math.random() * rarePool.length)];
      candidates[Math.floor(Math.random() * candidates.length)] = rare;
    }
    return candidates;
  }

  const el = {
    pet: document.getElementById('pet'),
    petSprite: document.getElementById('petSprite'),
    petAccessory: document.getElementById('petAccessory'),
    petArea: document.getElementById('petArea'),
    endingBadges: document.getElementById('endingBadges'),
    ageLabel: document.getElementById('ageLabel'),
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
    itemsRow: document.getElementById('itemsRow'),
    storyFlash: document.getElementById('storyFlash'),
    storyFlashEmoji: document.getElementById('storyFlashEmoji'),
    storyFlashText: document.getElementById('storyFlashText'),
    gameClearOverlay: document.getElementById('gameClearOverlay'),
    gameClearConfettiTop: document.getElementById('gameClearConfettiTop'),
    gameClearConfettiBottom: document.getElementById('gameClearConfettiBottom'),
    gameClearTitle: document.getElementById('gameClearTitle'),
    gameClearBadges: document.getElementById('gameClearBadges'),
    gameClearDesc: document.getElementById('gameClearDesc'),
    gameClearFreePlayBtn: document.getElementById('gameClearFreePlayBtn'),
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
    courtBtn: document.getElementById('courtBtn'),
    travelBtn: document.getElementById('travelBtn'),
    subStatusRow: document.getElementById('subStatusRow'),
    regionDecor: document.getElementById('regionDecor'),
    regionLabel: document.getElementById('regionLabel'),
    partnerLabel: document.getElementById('partnerLabel'),
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
    guestCodeInput: document.getElementById('guestCodeInput'),
    loadCodeBtn: document.getElementById('loadCodeBtn'),
    codeError: document.getElementById('codeError'),
    guestStatus: document.getElementById('guestStatus'),
    companionLeft: document.getElementById('companionLeft'),
    companionRight: document.getElementById('companionRight'),
    partnerCompanion: document.getElementById('partnerCompanion'),
    companionDexGrid: document.getElementById('companionDexGrid'),
    companionDexProgress: document.getElementById('companionDexProgress'),
    partnerDexGrid: document.getElementById('partnerDexGrid'),
    partnerDexProgress: document.getElementById('partnerDexProgress'),
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
      age: 0,
      poopCount: 0,
      isSick: false,
      sicknessType: null,
      totalSicknessCount: 0,
      isSleeping: false,
      // パーフェクトクリア(ずかん・じっせき りょうほう コンプリート)を
      // 一度でも たっせいすると true になり、そのプレイぶんは GOAL_DAYS
      // ゴール判定(checkMeters())を もう トリガーしない - 「じゆうに
      // あそぶ」ボタン(gameClearFreePlayBtn の ハンドラー さんしょう)で
      // ゲームオーバー状態を ぬけたあとも おなじ ゴール条件で むげんに
      // クリア画面が 出つづけない ようにする ための フラグ
      freePlay: false,
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
      evoMeter: 0,
      devoMeter: 0,
      deathMeter: 0,
      transformMeter: 0,
      transformOptions: null,
      items: {},
      // きゅうあい・たび は「はじめから」で ほかの おせわの きろくと
      // いっしょに リセットされる、今の いっしょうぶんの じょうたい。
      // gender/orientationId/attractedTo は 卵が かえった しゅんかんに
      // rollIdentity() で きまる(advanceStage() 参照)
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
        // which of the 4 getEndingTier() endings have ever been reached
        // (across any playthrough) - drives the permanent badge row on the
        // normal screen and the rainbow screen once all 4 are collected
        endingTiersReached: [],
        // えらんだ ほんたい・がめんの いろ(COLOR_THEMES の id) - じっせき/
        // ずかんと おなじく「はじめから」しても消えない、永続の せってい
        deviceThemeId: 'default',
        screenThemeId: 'default',
        // えらんだ ほんたい・がめんの がら(PATTERNS の id) - いろとは
        // どくりつに えらべる、もうひとつの おしゃれ せってい
        devicePatternId: 'none',
        screenPatternId: 'none',
        // なかまイベントに クリアして なかまに なった COMPANIONS の id 一覧。
        // ずかん・じっせきと おなじく「はじめから」しても消えず、画面の
        // よこに ずっと 表示されつづける、プレイをまたいだ 永続コレクション
        companionsRecruited: [],
        // 地域ごとの きめうちキャラ(REGIONSの candidates)のうち、いままで
        // こいびとに なった ことが ある id の一覧と、そのうち けっこんまで
        // いたった id の一覧。どちらも「ずかん」の「こいびと」セクション
        // として 永続に 記録される(あいてコードの おきゃくさんは 種族の
        // ずかんに 記録されるので、ここには ふくまれない)
        partnersRecorded: [],
        partnersMarried: [],
        // おかね(ミニゲーム大成功などで もらえる)と、それで こうにゅう
        // した SHOP_ITEMS の id 一覧、いま そうびちゅうの id。いろ・がら
        // せっていと おなじく「はじめから」しても消えない永続の せってい
        money: 0,
        ownedShopItems: [],
        equippedItemId: null,
        // 「たび」で いちど でも おとずれた ことの ある地域(REGIONS の id)
        // の いちらん。じっせきの「せかい いっしゅう」に つかう。「おうち」
        // は さいしょから いる ので、あらかじめ ふくめておく
        regionsVisited: ['home'],
      },
      achievementsUnlocked: [],
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return freshState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return freshState();
      const merged = { ...freshState(), ...parsed };
      // lifetime is a nested object, so the shallow merge above replaces it
      // wholesale with the save's own (possibly older, field-missing)
      // lifetime rather than filling gaps - patch those gaps in explicitly
      // so a field added in a later version doesn't come back undefined
      merged.lifetime = { ...freshState().lifetime, ...(parsed.lifetime || {}) };
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
      // なかまの bond きのう(state.companions)より 前の セーブには この
      // フィールドが まだ ないので、いままで どおり lifetime.
      // companionsRecruited ぜんいんが bond100で そばに いる じょうたいから
      // はじめる(とつぜん だれかが いなくなった ように 見えないように)
      if (!Object.prototype.hasOwnProperty.call(parsed, 'companions')) {
        merged.companions = merged.lifetime.companionsRecruited.map((id) => ({ id, bond: 100 }));
      }
      return merged;
    } catch (e) {
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
    if (state.stage !== STAGE.GROWING || !state.speciesLine) return;
    recordDiscoveryKey(`${state.speciesLine}:${state.stageIndex}`);
  }

  // じっせき (achievements) - permanent badges based on lifetime totals
  // (state.lifetime), separate from the current pet's per-playthrough
  // stats which reset with "はじめから". checkAchievements() runs from
  // saveState() so no individual call site needs to remember to check it
  const ACHIEVEMENTS = [
    { id: 'evolve-1', emoji: '🌱', label: 'はじめの いっぽ', desc: 'はじめて しんかした', condition: (l) => l.evolutions >= 1 },
    { id: 'evolve-10', emoji: '🌿', label: 'せいちょう じょうずさん', desc: '10かい しんかした', condition: (l) => l.evolutions >= 10 },
    { id: 'evolve-50', emoji: '🌳', label: 'しんかの たつじん', desc: '50かい しんかした', condition: (l) => l.evolutions >= 50 },
    { id: 'devolve-5', emoji: '🍼', label: 'かえりみち', desc: '5かい たいかした', condition: (l) => l.devolutions >= 5 },
    { id: 'transform-1', emoji: '✨', label: 'はじめての へんしん', desc: 'はじめて へんしんした', condition: (l) => l.transforms >= 1 },
    { id: 'transform-10', emoji: '🌟', label: 'へんしん たつじん', desc: '10かい へんしんした', condition: (l) => l.transforms >= 10 },
    { id: 'clear-1', emoji: '🏅', label: 'てんごくへの きっぷ', desc: 'はじめて ゲームクリアした', condition: (l) => l.clears >= 1 },
    { id: 'clear-5', emoji: '🏆', label: 'なんども てんごくへ', desc: '5かい ゲームクリアした', condition: (l) => l.clears >= 5 },
    { id: 'death-1', emoji: '👻', label: 'はじめての おわかれ', desc: 'はじめて てんごくに いった', condition: (l) => l.deaths >= 1 },
    { id: 'minigame-50', emoji: '🎮', label: 'あそびの みならい', desc: 'ミニゲームを 50かい あそんだ', condition: (l) => l.minigamesPlayed >= 50 },
    { id: 'minigame-300', emoji: '🕹️', label: 'あそびの たつじん', desc: 'ミニゲームを 300かい あそんだ', condition: (l) => l.minigamesPlayed >= 300 },
    { id: 'sick-cured-10', emoji: '💊', label: 'めいいの たまご', desc: 'びょうきを 10かい なおした', condition: (l) => l.sicknessCured >= 10 },
    { id: 'age-50', emoji: '🎂', label: 'はんせいき', desc: 'ねんれい50に とうたつした', condition: (l) => l.maxAgeReached >= 50 },
    { id: 'age-100', emoji: '🎊', label: 'ひゃくさい ばんざい', desc: 'ねんれい100に とうたつした', condition: (l) => l.maxAgeReached >= 100 },
    { id: 'dex-complete', emoji: '📖', label: 'ずかん コンプリート', desc: 'ずかんを ぜんぶ うめた', condition: (l, s) => s.discoveredStages.length >= ALL_LINES.length * STAGES_PER_LINE },

    // ここから追加分 - しんか/たいか/へんしん/クリア/しぼう/ミニゲーム/かんびょう/
    // ねんれいの さらに上の きろく、ずかんの とちゅうけいか、レアしゅぞく・
    // ぜんしゅぞくとの であい、1しょうがいの お世話がんばりカウント、
    // せいかく(やさしい/ゆうかん/ロマンチック)のかたより、「はじめから」の
    // かいすう、と ジャンルを ひろげて 目標を たくさん 用意する
    { id: 'evolve-100', emoji: '🌲', label: 'しんかの きわみ', desc: '100かい しんかした', condition: (l) => l.evolutions >= 100 },
    { id: 'devolve-1', emoji: '👶', label: 'はじめての たいか', desc: 'はじめて たいかした', condition: (l) => l.devolutions >= 1 },
    { id: 'devolve-20', emoji: '😵‍💫', label: 'たいかの ぬし', desc: '20かい たいかした', condition: (l) => l.devolutions >= 20 },
    { id: 'transform-25', emoji: '💫', label: 'へんしん マイスター', desc: '25かい へんしんした', condition: (l) => l.transforms >= 25 },
    { id: 'clear-10', emoji: '👑', label: 'てんごくの じょうきゃく', desc: '10かい ゲームクリアした', condition: (l) => l.clears >= 10 },
    { id: 'clear-25', emoji: '🎖️', label: 'クリアの でんせつ', desc: '25かい ゲームクリアした', condition: (l) => l.clears >= 25 },
    { id: 'death-5', emoji: '💀', label: 'なんども おわかれ', desc: '5かい てんごくに いった', condition: (l) => l.deaths >= 5 },
    { id: 'death-10', emoji: '⚰️', label: 'てんごくの じょうれんきゃく', desc: '10かい てんごくに いった', condition: (l) => l.deaths >= 10 },
    { id: 'minigame-1000', emoji: '🎰', label: 'あそびの でんせつ', desc: 'ミニゲームを 1000かい あそんだ', condition: (l) => l.minigamesPlayed >= 1000 },
    { id: 'sick-cured-1', emoji: '💉', label: 'はじめての かんびょう', desc: 'はじめて びょうきを なおした', condition: (l) => l.sicknessCured >= 1 },
    { id: 'sick-cured-30', emoji: '🏥', label: 'めいいの たまご(じょうきゅう)', desc: 'びょうきを 30かい なおした', condition: (l) => l.sicknessCured >= 30 },
    { id: 'age-10', emoji: '🐣', label: 'ひよっこ そだち', desc: 'ねんれい10に とうたつした', condition: (l) => l.maxAgeReached >= 10 },
    { id: 'age-25', emoji: '🌼', label: 'すくすく せいちょう', desc: 'ねんれい25に とうたつした', condition: (l) => l.maxAgeReached >= 25 },
    { id: 'dex-25', emoji: '📗', label: 'ずかんの はじまり', desc: 'ずかんを 25しゅるい うめた', condition: (l, s) => s.discoveredStages.length >= 25 },
    { id: 'dex-50', emoji: '📘', label: 'ずかん なかば', desc: 'ずかんを 50しゅるい うめた', condition: (l, s) => s.discoveredStages.length >= 50 },
    { id: 'dex-100', emoji: '📙', label: 'ずかん たいはん', desc: 'ずかんを 100しゅるい うめた', condition: (l, s) => s.discoveredStages.length >= 100 },
    { id: 'dex-150', emoji: '📕', label: 'ずかん もうすぐ', desc: 'ずかんを 150しゅるい うめた', condition: (l, s) => s.discoveredStages.length >= 150 },
    { id: 'rare-line-1', emoji: '🌈', label: 'レアな であい', desc: 'レアな しゅぞく(かみさま/れんくん/にんぎょ/ユニコーン/フェニックス)に 1かい であった', condition: (l, s) => s.discoveredStages.some((e) => RARE_LINES.includes(e.split(':')[0])) },
    { id: 'rare-line-all', emoji: '🎇', label: 'でんせつ コレクター', desc: 'レアな しゅぞく5しゅるい すべてに であった', condition: (l, s) => RARE_LINES.every((line) => s.discoveredStages.some((e) => e.startsWith(`${line}:`))) },
    { id: 'every-normal-line', emoji: '🐾', label: 'どうぶつ はかせ', desc: 'ふつうの16しゅぞく すべてに であった', condition: (l, s) => NORMAL_LINES.every((line) => s.discoveredStages.some((e) => e.startsWith(`${line}:`))) },
    { id: 'elder-collector', emoji: '👴', label: 'ちょうろう はかせ', desc: '10しゅるい いじょうの さいごの すがたに であった', condition: (l, s) => s.discoveredStages.filter((e) => e.endsWith(':7')).length >= 10 },
    { id: 'feed-100', emoji: '🍚', label: 'ごはん だいすき', desc: '1しょうがいで ごはんを 100かい あげた', condition: (l, s) => s.actionCounts.feed >= 100 },
    { id: 'play-100', emoji: '🎯', label: 'あそびじょうず', desc: '1しょうがいで 100かい あそんだ', condition: (l, s) => s.actionCounts.play >= 100 },
    { id: 'clean-50', emoji: '🧹', label: 'そうじの プロ', desc: '1しょうがいで そうじを 50かい した', condition: (l, s) => s.actionCounts.clean >= 50 },
    { id: 'pet-100', emoji: '🤲', label: 'なでなで まめ', desc: '1しょうがいで なでるを 100かい した', condition: (l, s) => s.actionCounts.pet >= 100 },
    { id: 'talk-100', emoji: '💬', label: 'おしゃべりずき', desc: '1しょうがいで はなしかけるを 100かい した', condition: (l, s) => s.actionCounts.talk >= 100 },
    { id: 'medicine-30', emoji: '🩹', label: 'かんごし はだし', desc: '1しょうがいで くすりを 30かい あげた', condition: (l, s) => s.actionCounts.medicine >= 30 },
    { id: 'gentle-10', emoji: '💗', label: 'やさしい こころ', desc: 'やさしい せんたくを 1しょうがいで 10かい した', condition: (l, s) => s.traitCounts.gentle >= 10 },
    { id: 'brave-10', emoji: '🦁', label: 'ゆうかんな こころ', desc: 'ゆうかんな せんたくを 1しょうがいで 10かい した', condition: (l, s) => s.traitCounts.brave >= 10 },
    { id: 'romantic-10', emoji: '💘', label: 'ロマンチスト', desc: 'ロマンチックな せんたくを 1しょうがいで 10かい した', condition: (l, s) => s.traitCounts.romantic >= 10 },
    { id: 'reset-5', emoji: '🔄', label: 'なんども ちょうせん', desc: '「はじめから」を 5かい した', condition: (l) => (l.resets || 0) >= 5 },
    { id: 'reset-20', emoji: '♾️', label: 'むげんループの たび', desc: '「はじめから」を 20かい した', condition: (l) => (l.resets || 0) >= 20 },

    // ここから さらに追加分 - なかまの きずな度きのう、けっこん、
    // アイテムショップ、地域をめぐる たび など、あとから 加わった
    // システムにも ちゃんと じっせきの もくひょうを 用意する
    { id: 'companion-1', emoji: '🐾', label: 'はじめての なかま', desc: 'はじめて なかまが できた', condition: (l) => l.companionsRecruited.length >= 1 },
    { id: 'companion-5', emoji: '🐕', label: 'にぎやかな なかよしグループ', desc: 'なかまが 5にん できた', condition: (l) => l.companionsRecruited.length >= 5 },
    { id: 'companion-all', emoji: '🎉', label: 'なかま だいしゅうごう', desc: 'なかまを ぜんいん(10にん)あつめた', condition: (l) => l.companionsRecruited.length >= COMPANIONS.length },
    { id: 'companion-active-5', emoji: '💞', label: 'そばに いる しあわせ', desc: 'いま そばに いる なかまが 5にん いる', condition: (l, s) => s.companions.length >= 5 },
    { id: 'partner-1', emoji: '💑', label: 'はじめての こいびと', desc: 'はじめて こいびとが できた', condition: (l) => l.partnersRecorded.length >= 1 },
    { id: 'married-1', emoji: '💍', label: 'はじめての けっこん', desc: 'はじめて けっこんした', condition: (l) => l.partnersMarried.length >= 1 },
    { id: 'married-3', emoji: '👰', label: 'なんども ウェディング', desc: '3にんと けっこんした(いろんな 人生で)', condition: (l) => l.partnersMarried.length >= 3 },
    { id: 'partner-all', emoji: '🌏', label: 'れんあい たっせいしゃ', desc: '全8地域16人の こいびと候補 ぜんいんと であった', condition: (l) => l.partnersRecorded.length >= ALL_PARTNER_CANDIDATES.length },
    { id: 'shop-1', emoji: '🎁', label: 'はじめての おかいもの', desc: 'アイテムを はじめて こうにゅうした', condition: (l) => l.ownedShopItems.length >= 1 },
    { id: 'shop-all', emoji: '🛍️', label: 'コレクション コンプリート', desc: 'アイテムを ぜんぶ(8しゅるい)こうにゅうした', condition: (l) => l.ownedShopItems.length >= SHOP_ITEMS.length },
    { id: 'money-100', emoji: '💰', label: 'ちょきんか デビュー', desc: 'しょじきんが 100に とうたつした', condition: (l) => l.money >= 100 },
    { id: 'money-500', emoji: '💴', label: 'おおがねもち', desc: 'しょじきんが 500に とうたつした', condition: (l) => l.money >= 500 },
    { id: 'region-3', emoji: '🧳', label: 'たびずき', desc: '3つの地域を おとずれた', condition: (l) => l.regionsVisited.length >= 3 },
    { id: 'region-all', emoji: '🌍', label: 'せかい いっしゅう', desc: 'ぜんぶの地域(8つ)を おとずれた', condition: (l) => l.regionsVisited.length >= REGIONS.length },
    { id: 'perfect-life', emoji: '🏵️', label: 'かんぺきな なおとっちライフ', desc: 'けっこんも なかま10にん あつめるのも りょうほう たっせいした', condition: (l) => l.partnersMarried.length >= 1 && l.companionsRecruited.length >= COMPANIONS.length },
  ];

  function checkAchievements() {
    state.lifetime.maxAgeReached = Math.max(state.lifetime.maxAgeReached, Math.floor(state.age / 20));
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
  const ENDING_TIER_ICONS = ['🎉', '📖', '🏅', '👑'];

  // desc の 2行目は、tier 0〜2 では「つぎに なにを コンプリートすれば
  // もっと はでな ゴールに なるか」を つたえる ヒント文言(不足している
  // 条件だけを ぐたいてきに 示す)。tier 3(パーフェクト)だけは めざす先が
  // もう ない ので、かわりに「じゆうに あそぶ」ボタン(gameClearFreePlayBtn)
  // へ さそう 文言に する
  const ENDING_TIERS = [
    {
      title: 'GAME CLEAR',
      confetti: '🎉🎊✨🎉🎊✨',
      badges: [],
      desc: 'さいごまで そだてきった!<br>つぎは ずかん・じっせきを コンプリートして、もっと すごい ゴールを めざしてね!!',
    },
    {
      title: 'GAME CLEAR',
      confetti: '🎉🎊✨📖✨🎊🎉',
      badges: ['📖 ずかん コンプリート'],
      desc: 'ぜんぶの すがたに であって そだてきった!<br>つぎは じっせきを コンプリートして、パーフェクトゴールを めざしてね!!',
    },
    {
      title: 'GAME CLEAR',
      confetti: '🎉🎊✨🏅✨🎊🎉',
      badges: ['🏅 じっせき コンプリート'],
      desc: 'あらゆる じっせきを たっせいして そだてきった!<br>つぎは ずかんを コンプリートして、パーフェクトゴールを めざしてね!!',
    },
    {
      title: 'PERFECT CLEAR',
      confetti: '👑✨🎉🎊✨🎉🎊✨👑',
      badges: ['📖 ずかん コンプリート', '🏅 じっせき コンプリート'],
      desc: 'ずかんも じっせきも すべて そろえて、かんぺきに そだてきった!<br>これからは じゆうに あそんでね',
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
    { id: 'sunset', label: 'ゆうやけ', deviceSwatch: '#ff8965', screenSwatch: '#f0b98d', unlockTier: 0 },
    { id: 'forest', label: 'しんりん', deviceSwatch: '#4caf6e', screenSwatch: '#6fae7a', unlockTier: 1 },
    { id: 'gold', label: 'おうごん', deviceSwatch: '#ffd76a', screenSwatch: '#e8cf7a', unlockTier: 2 },
    {
      id: 'rainbow',
      label: 'レインボー',
      deviceSwatch: 'linear-gradient(90deg, #ff5ea8, #ffd23f, #55e6a5, #4fc3f7, #c77dff)',
      screenSwatch: 'linear-gradient(90deg, #ff5ea8, #ffd23f, #55e6a5, #4fc3f7, #c77dff)',
      unlockAll: true,
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
    { id: 'wave', label: 'なみ', emoji: '🌊', unlockTier: 0 },
    { id: 'confetti', label: 'かみふぶき', emoji: '🎊', unlockTier: 1 },
    { id: 'sparkle', label: 'きらきら', emoji: '✨', unlockTier: 2 },
    { id: 'rainbow', label: 'レインボー', emoji: '🌈', unlockAll: true },
  ];

  // おかねで こうにゅうできる、みにつける アイテム。一度 こうにゅう
  // すれば ずっと もちものに のこり(state.lifetime.ownedShopItems)、
  // なんども そうび/かいじょ できる(いちどに そうびできるのは 1つだけ)
  // それぞれの id は、したの EQUIPPED_ITEM_EFFECTS の りようポイントで
  // state.lifetime.equippedItemId と つきあわされ、そうびちゅうだけ
  // こうかを はっきする(いちどに そうびできるのは 1つだけ)
  const SHOP_ITEMS = [
    { id: 'ribbon', label: 'リボン', emoji: '🎀', price: 20, desc: '機嫌の げんしょうが ゆるやかに' },
    { id: 'bowtie', label: 'ちょうネクタイ', emoji: '🎗️', price: 20, desc: '満腹の げんしょうが ゆるやかに' },
    { id: 'flower', label: 'おはな', emoji: '🌼', price: 15, desc: 'きゅうあいの せいこうりつ アップ' },
    { id: 'glasses', label: 'サングラス', emoji: '🕶️', price: 30, desc: 'ミニゲームの とくてん ボーナス' },
    { id: 'scarf', label: 'マフラー', emoji: '🧣', price: 25, desc: 'びょうきに なりにくい' },
    { id: 'hat', label: 'シルクハット', emoji: '🎩', price: 40, desc: '変身メーターが たまりやすい' },
    { id: 'crown', label: 'かんむり', emoji: '👑', price: 80, desc: '死亡メーターの じょうしょうを おさえる' },
    { id: 'star', label: 'スターバッジ', emoji: '⭐', price: 50, desc: 'ミニゲームの おかねが ふえる' },
  ];

  // いま そうびちゅうの SHOP_ITEMS が id と いっちするか(いちどに
  // そうびできるのは 1つだけなので、こうかの はんてい先は ここ 1か所ずつ)
  function isEquipped(id) {
    return state.lifetime.equippedItemId === id;
  }

  // COLOR_THEMES/PATTERNS 共通の解放判定(どちらも unlockTier/
  // unlockAll という おなじ フィールドしか みないので、そのまま りようできる)
  function isThemeUnlocked(theme) {
    if (theme.unlockAll) return state.lifetime.endingTiersReached.length >= ENDING_TIERS.length;
    return theme.unlockTier === undefined || state.lifetime.endingTiersReached.includes(theme.unlockTier);
  }

  function endingProgress() {
    const dexComplete = state.discoveredStages.length >= ALL_LINES.length * STAGES_PER_LINE;
    const achComplete = ACHIEVEMENTS
      .filter((ach) => ach.id !== 'dex-complete')
      .every((ach) => state.achievementsUnlocked.includes(ach.id));
    return { dexComplete, achComplete };
  }

  // その回の クリアで いちばん はでな 1つの tier だけを えらぶ - クリア
  // えんしゅつ(タイトル・バッジ・いろ)の 表示に つかう
  function getEndingTier() {
    const { dexComplete, achComplete } = endingProgress();
    if (dexComplete && achComplete) return 3;
    if (achComplete) return 2;
    if (dexComplete) return 1;
    return 0;
  }

  // その回の クリアで じっさいに みたした ぜんぶの tier(0はつねに、
  // 1はずかんコンプリート、2はじっせきコンプリート、3はりょうほう)を
  // 記録用に かえす。getEndingTier() は 表示用に いちばん はでな tierを
  // 1つだけ えらぶが、えいぞくの バッジ記録(endingTiersReached)は
  // みたした ぶんを ぜんぶ 記録しないと、ずかん/じっせきの どちらが
  // 先に コンプリートしたかで もういっぽうの たんどくバッジが えいえいに
  // とれなくなってしまう(あとから りょうほう そろうと つねに tier3だけに
  // なる ため)
  function qualifyingEndingTiers() {
    const { dexComplete, achComplete } = endingProgress();
    const tiers = [0];
    if (dexComplete) tiers.push(1);
    if (achComplete) tiers.push(2);
    if (dexComplete && achComplete) tiers.push(3);
    return tiers;
  }

  function saveState() {
    recordDiscovery();
    checkAchievements();
    try {
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
    return clamp(state.age / MAX_DIFFICULTY_AGE, 0, 1);
  }

  function lerp(min, max, t) {
    return min + (max - min) * t;
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
      { emoji: '📈', message: 'からだが ムズムズする…これが せいちょうつうか!?' },
      { emoji: '😲', message: 'きゅうに せが のびて じぶんでも ビックリした!' },
      { emoji: '💫', message: 'きのうより ちょっと できる きが する!' },
      { emoji: '🔔', message: 'レベルアップの おとが きこえた き が した(たぶん きのせい)' },
      { emoji: '📏', message: 'サイズが かわって…ふくは もってないけど なんとなく きつい' },
    ],
    devolve: [
      { emoji: '🤏', message: 'あれ?なんか ちいさく なってない…?' },
      { emoji: '👶', message: 'こどもがえり ちゅう!ばぶばぶ!' },
      { emoji: '😴', message: 'せいちょうを いったん おやすみする ことにした' },
      { emoji: '📉', message: 'たいじゅうは かわってないのに みための ねんれいが わかがえった' },
      { emoji: '🌀', message: 'じかんが ちょっと まきもどった ような かんかく' },
    ],
    transform: [
      { emoji: '🌟', message: 'すがたが かわった!げんきに なった…かも!' },
      { emoji: '🕺', message: 'へんしんポーズを キメて みた(だれも みてない)' },
      { emoji: '👕', message: 'きがえた みたいな かんかく!なかみは おなじ' },
      { emoji: '🪞', message: 'べつじんに なった き が するけど、なかみは いつもどおり' },
      { emoji: '🎭', message: '「あたらしい じぶん」を いちど えんじて みたく なった' },
    ],
    'minigame-great': [
      { emoji: '🏆', message: 'てんさいって よばれても おかしくない できばえ!' },
      { emoji: '😎', message: 'ドヤがおが とまらない!' },
      { emoji: '📸', message: 'だれか いま の みてた?みてて ほしかった!' },
      { emoji: '🔥', message: 'きょうの ちょうしは いつもの100ばい あるかも!' },
      { emoji: '🎉', message: 'しょうきんが でるなら もらいたい くらい じょうず' },
    ],
    'minigame-bad': [
      { emoji: '🙈', message: 'いまのは わすれて ほしい…れんしゅうだったし!' },
      { emoji: '😵', message: 'うでが なまってた だけ!じつりょくじゃ ない!' },
      { emoji: '🌀', message: 'ちょっと めが まわっただけ!ほんきだせば…' },
      { emoji: '🫠', message: 'つぎは かならず リベンジする!(こんかいは しない)' },
    ],
    'medicine-cure': [
      { emoji: '🕺', message: 'げんきに なって おどりだしそう!' },
      { emoji: '😋', message: 'くすりの あじが まずすぎて めが さめた(べつの いみで げんき)' },
      { emoji: '🎈', message: 'びょうきの ことは もう わすれた!(いたみは わすれてない)' },
      { emoji: '💊', message: 'くすりを のんだ ごほうびに あとで なにか ねだりそう' },
    ],
    overfeed: [
      { emoji: '🫃', message: 'おなかが パンパン…しばらく うごけない…' },
      { emoji: '🍚', message: '「もう たべられない」と いいつつ もう いっこ いけそう' },
      { emoji: '🚨', message: 'たべすぎ けいほう、はつれい!' },
      { emoji: '😵‍💫', message: 'まんぷく すぎて まんぞくと こうかいが なかよく どうきょ ちゅう' },
    ],
    'poop-clean': [
      { emoji: '✨', message: 'スッキリ!せかいが きゅうに きれいに みえる!' },
      { emoji: '🧹', message: 'そうじの プロに なれる き が してきた' },
      { emoji: '😌', message: 'うんちに なまえを つけそうに なった ところで やめた' },
      { emoji: '🚿', message: 'きれいずき が いっかい あがった き が する' },
    ],
  };

  // なでる/はなしかける は毎回かならず1つ表示される軽いリアクション文 -
  // 通常のメッセージ欄に出すだけなので、STORY_EVENT_POOLSのような大きな
  // 演出やSTORY_EVENT_CHANCEの抽選は使わない
  const PET_REACTIONS = [
    'うれしそうに すりよってきた!',
    'ゴロゴロ… きもちよさそう',
    'くすぐったいのか、ぴくっと うごいた',
    'なでられて めを ほそめた',
    'もっと なでて!って かおを してる',
    'あったかい てが きもちいいみたい',
    'うっとりした ひょうじょうに なった',
    '「もう1かい!」と せがまれた き が した',
    'そっと めを とじて リラックスしてる',
    'しあわせそうな こえを だした',
    'ふわふわの てざわりに ほっこりする',
    'なでる てに あわせて からだを よせてきた',
  ];

  const TALK_REACTIONS = [
    '「きょうも げんきだよ!」と いってる き が する',
    'なにか はなしかけてきたけど、わからなかった',
    'うれしそうに なにか さけんでる!',
    'じっと めを みて なにか つたえようと してる',
    'ひとりごとを つぶやいてる みたい',
    '「あそぼう!」って いってる ような き が する',
    'なぞの げんごで はなしかけてきた',
    'こたえの かわりに ぴょんと はねた',
    'うんうんと うなずいて くれた(たぶん)',
    'ないしょばなしを してくれた(ひみつ)',
    '「だいすき」って いった…かも',
    'くびを かしげて こっちを みてる',
  ];

  // なかまが そばに いる ときだけ、じゃれるの リアクションに まざる
  // すこし ちがった 文言。なかまの bond かいふくは じゃれるの ハンドラー
  // じたいで おこなう(ここは メッセージの バリエーションだけ)
  const COMPANION_PET_REACTIONS = [
    'なかまたちも まざって いっしょに あまえてきた!',
    'そばに いる なかまも うれしそうに はねてる',
    'なかまと じゃれあう すがたが ほほえましい',
    'みんなで よりそって、なかよしの わの なかに いる きぶん',
  ];

  const COMPANION_TALK_REACTIONS = [
    'なかまたちにも なにか はなしかけてる みたい',
    'なかまと いっしょに こっちを みて くびを かしげた',
    'なかまたちが まわりで にぎやかに さわいでる',
    'なかまとの おしゃべりに まざれた き が した',
  ];

  const COMPANION_ANNOYED_REACTIONS = [
    'なかまたちも すこし げんなり してる みたい',
    'なかまも いっしょに そっぽを むいてしまった',
  ];

  // beyond this many なでる/はなしかける in a row (with no real care action
  // in between), the action flips from its normal small positive into an
  // annoyed negative instead - spamming either stops being free stats
  const AFFECTION_SPAM_THRESHOLD = 3;

  // おなじように、たびを 連続で おしすぎた ときも「たびづかれ」で 機嫌の
  // ボーナスが きえて 逆に すこし へる - 元気/満腹の コストと あわせて、
  // たびボタンを 連打するだけの ごうりつ機嫌かせぎに ならないようにする
  const TRAVEL_SPAM_THRESHOLD = 3;

  const PET_ANNOYED_REACTIONS = [
    'もう なでなでは じゅうぶん!と いう かおを してる',
    'しつこいと ちょっと おこられた…',
    'てを やんわり ふりはらわれた!',
    'つかれた ような かおを してる',
    'そろそろ ひとりに して ほしいみたい',
    'なですぎ けいほう、はつれい!',
  ];

  const TALK_ANNOYED_REACTIONS = [
    'もう はなしかけないで!と いう かおを してる',
    'すっかり むしされてしまった…',
    'ふーっと ためいきを つかれた',
    'みみを ふさぐ しぐさを された(みみ、ないけど)',
    'そろそろ しずかに して ほしいみたい',
    'おしゃべりが すぎたと おもわれたかも…',
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

  function checkQuestioningResolution() {
    if (state.orientationId !== 'questioning') return null;
    state.questioningEncounters = (state.questioningEncounters || 0) + 1;
    if (state.questioningEncounters < QUESTIONING_RESOLVE_THRESHOLD) return null;
    const resolved = weightedPick(RESOLVED_ORIENTATIONS, RESOLVED_ORIENTATION_WEIGHTS);
    state.orientationId = resolved;
    state.attractedTo = attractedToFor(state.gender, resolved);
    state.questioningEncounters = 0;
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
      const trimmed = raw.trim().replace(/^NAOTOCCHI1:/, '');
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

  // こいびと関係の いじ・けっこんへの しんてん・わかれ に かかわる
  // すうち。あいてが 地域のNPCでも「あいてコード」の おきゃくさんでも、
  // state.partner オブジェクトに おなじ フィールドを もたせるので、
  // どちらも まったく おなじ ルールで あつかわれる
  const PARTNER_AFFECTION_DECAY_PER_TICK = 1;
  const PARTNER_FLIRT_AFFECTION_BOOST = 20;
  const MARRIAGE_BOND_THRESHOLD = 8;
  const BREAKUP_DEATH_PENALTY = { dating: 15, married: 30 };
  const DEATH_METER_MULTIPLIER = { none: 1, dating: 0.75, married: 0.5 };

  function relationshipStage() {
    if (!state.partner) return 'none';
    return state.partner.married ? 'married' : 'dating';
  }

  // 「死亡」メーターの じょうしょう(かいふくアイテムなどの げんしょうは
  // ふくまない)は、こいびとが いると すこし、夫婦だと もっと ゆるやかに
  // なる - すべての 死亡メーター上昇の げんいん(びょうき・ていけんこう・
  // ミニゲーム大失敗・たべすぎ など)に 共通で かける。かんむりを
  // そうびしていると、そこから さらに 2わり おさえられる
  function raiseDeathMeter(amount) {
    const crownFactor = isEquipped('crown') ? 0.8 : 1;
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
    p.bondCount = (p.bondCount || 0) + 1;
    if (p.bondCount < MARRIAGE_BOND_THRESHOLD) return false;
    p.married = true;
    p.bondCount = 0;
    return true;
  }

  // ほうっておくと(=きゅうあいで いちゃつかないと)なかよし度が すこしずつ
  // へっていき、0に なると ふられる/りこんする。夫婦の ほうが わかれた
  // ときの 死亡メーターへの ダメージが おおきい - 「そのぶん 別れたら より
  // ダメージくる」という つよい きずなの うらがえし
  function decayRelationship() {
    if (!state.partner || state.stage === STAGE.DEAD || state.stage === STAGE.CLEAR) return;
    const p = state.partner;
    p.affection = clamp((p.affection ?? 100) - PARTNER_AFFECTION_DECAY_PER_TICK, 0, 100);
    if (p.affection > 0) return;
    const wasMarried = !!p.married;
    const label = p.label;
    state.partner = null;
    raiseDeathMeter(BREAKUP_DEATH_PENALTY[wasMarried ? 'married' : 'dating']);
    setMessage(wasMarried ? `${label}と りこんしてしまった…` : `${label}に ふられてしまった…`);
    emotePet('sad');
  }

  // なかまとの きずな(bond)も、こいびとの なかよし度と おなじ しくみ。
  // じゃれるで かいふくし、ほうっておくと じわじわ へっていって、0に
  // なると その なかまだけ いっしょうぶんの あいだ はなれて いってしまう
  // (state.lifetime.companionsRecruited の えいきゅうきろくは きえない -
  // 「はじめから」すれば また bond100で もどってくる)
  const COMPANION_BOND_DECAY_PER_TICK = 1;
  const COMPANION_PLAYWITH_BOND_BOOST = 20;

  function decayCompanionBonds() {
    if (!state.companions.length || state.stage === STAGE.DEAD || state.stage === STAGE.CLEAR) return;
    const left = [];
    state.companions = state.companions.filter((c) => {
      c.bond = clamp((c.bond ?? 100) - COMPANION_BOND_DECAY_PER_TICK, 0, 100);
      if (c.bond > 0) return true;
      left.push(c.id);
      return false;
    });
    if (left.length) {
      const names = left.map((id) => COMPANIONS.find((c) => c.id === id)?.name || id).join('・');
      setMessage(`${names}が さびしがって、はなれて いってしまった…`);
      emotePet('sad');
    }
  }

  const COURT_SUCCESS_REACTIONS = [
    '「つきあってください!」…って いったら まさかの OK!',
    'めが あった しゅんかん、うんめいを かんじた(たぶん)',
    'テレながらも、おもいを つたえられた!',
    'こくはく せいこう!はずかしくて めが まわりそう',
    'まさかの てんかいに、じぶんが いちばん おどろいてる',
  ];

  const COURT_FAIL_REACTIONS = [
    'ゆうきを だして こくはくしたけど…「ともだちでいよう」だって',
    'テレすぎて、へんな ことばしか でてこなかった…',
    'ふられた…でも つぎが ある!(たぶん)',
    'アピールが からまわりしちゃった みたい',
    'きんちょうしすぎて、なにを いったか おぼえてない',
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
    return [
      `${partnerLabel}と いつもどおり ラブラブ!`,
      `${partnerLabel}の ことを かんがえて、にやにや してしまった`,
      `${partnerLabel}に ぞっこんなのは かわらない みたい`,
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
  const REGIONS = [
    {
      id: 'home',
      label: 'おうち',
      emoji: '🏠',
      decor: ['🏠', '🌸', '☁️', '💕', '✨', '🎀', '🪴', '🕊️'],
      lines: ['やっぱり じぶんの おうちが いちばん おちつく', 'おなじみの けしきに ほっとした'],
      candidates: [
        courtCandidate({ id: 'neighbor-cat', label: 'となりの ねこ', emoji: '🐱', gender: 'female', orientationId: 'bi', affinityTrait: 'gentle' }),
        courtCandidate({ id: 'park-dog', label: 'こうえんの わんこ', emoji: '🐶', gender: 'male', orientationId: 'straight', affinityTrait: 'wild' }),
      ],
    },
    {
      id: 'sea',
      label: 'うみ',
      emoji: '🌊',
      decor: ['🌊', '🐚', '🐠', '⛵', '☀️', '🦀', '🐬', '🏖️'],
      lines: ['なみの おとが きもちいい!', 'すなはまを ぴょんぴょん はねまわった', 'かいがらを ひろって じまんげ'],
      candidates: [
        courtCandidate({ id: 'mermaid', label: 'うみの にんぎょ', emoji: '🧜', gender: 'female', orientationId: 'pan', affinityTrait: 'romantic' }),
        courtCandidate({ id: 'surfer-turtle', label: 'なみのり カメくん', emoji: '🐢', gender: 'male', orientationId: 'gay', affinityTrait: 'calm' }),
      ],
    },
    {
      id: 'snow',
      label: 'ゆきやま',
      emoji: '🏔️',
      decor: ['❄️', '⛄', '🏔️', '🌨️', '✨', '🦌', '🎿', '🧣'],
      lines: ['さむい!でも ゆきだるまを つくってみた', 'いきが しろく なるのが おもしろい', 'つるっと すべって しりもちを ついた'],
      candidates: [
        courtCandidate({ id: 'snow-spirit', label: 'ゆきの せいれい', emoji: '❄️', gender: 'nonbinary', orientationId: 'pan', affinityTrait: 'calm' }),
        courtCandidate({ id: 'cabin-bear', label: 'やまごやの クマさん', emoji: '🐻', gender: 'male', orientationId: 'bi', affinityTrait: 'brave' }),
      ],
    },
    {
      id: 'city',
      label: 'とかい',
      emoji: '🏙️',
      decor: ['🏙️', '🌃', '✨', '🚕', '🌆', '💡', '🚦', '🎡'],
      lines: ['ビルの たかさに びっくり!', 'ネオンの ひかりに めが きらきら', 'ひとの おおさに ちょっと つかれた'],
      candidates: [
        courtCandidate({ id: 'town-robot', label: 'となりまちの ロボット', emoji: '🤖', gender: 'nonbinary', orientationId: 'bi', affinityTrait: 'calm' }),
        courtCandidate({ id: 'ceo-cat', label: 'ビルの ねこ社長', emoji: '🐈‍⬛', gender: 'female', orientationId: 'gay', affinityTrait: 'brave' }),
      ],
    },
    {
      id: 'countryside',
      label: 'いなか',
      emoji: '🌾',
      decor: ['🌾', '🌻', '🐄', '🚜', '☀️', '🦋', '🌈', '🐓'],
      lines: ['たんぼの かぜが きもちいい', 'のはらを おもいっきり かけまわった', 'むぎわらぼうしが にあうと ほめられた(き が する)'],
      candidates: [
        courtCandidate({ id: 'field-sunflower', label: 'はたけの ひまわりさん', emoji: '🌻', gender: 'female', orientationId: 'straight', affinityTrait: 'romantic' }),
        courtCandidate({ id: 'meadow-cow', label: 'のはらの うしさん', emoji: '🐄', gender: 'male', orientationId: 'pan', affinityTrait: 'gentle' }),
      ],
    },
    {
      id: 'forest',
      label: 'もり',
      emoji: '🌲',
      decor: ['🌲', '🍄', '🦋', '🐿️', '🌿', '🍃', '🦉', '🌰'],
      lines: ['きの えだから とりの こえが きこえる', 'はっぱの におい に しんこきゅう', 'こだぬきと めが あった(かもしれない)'],
      candidates: [
        courtCandidate({ id: 'forest-fox', label: 'もりの きつね', emoji: '🦊', gender: 'male', orientationId: 'gay', affinityTrait: 'wild' }),
        courtCandidate({ id: 'tree-squirrel', label: 'こだちの リス', emoji: '🐿️', gender: 'female', orientationId: 'bi', affinityTrait: 'wild' }),
      ],
    },
    {
      id: 'desert',
      label: 'さばく',
      emoji: '🏜️',
      decor: ['🏜️', '🌵', '🐫', '☀️', '🦂', '🌅', '⛺', '🦎'],
      lines: ['あつい!でも すなの うえを あるくのが たのしい', 'サボテンに ちかづきすぎて ちょっと いたい めに あった', 'ほしぞらが びっくりする くらい きれいだった'],
      candidates: [
        courtCandidate({ id: 'desert-scorpion', label: 'さばくの さそりさん', emoji: '🦂', gender: 'nonbinary', orientationId: 'bi', affinityTrait: 'brave' }),
        courtCandidate({ id: 'oasis-camel', label: 'オアシスの らくださん', emoji: '🐫', gender: 'male', orientationId: 'straight', affinityTrait: 'calm' }),
      ],
    },
    {
      id: 'tropical',
      label: 'なんごく',
      emoji: '🌴',
      decor: ['🌴', '🌺', '🦜', '🍍', '🐠', '☀️', '🥥', '🦩'],
      lines: ['やしの みを みつけて うれしそう', 'あたたかい かぜが きもちいい', 'カラフルな とりに てを ふってみた'],
      candidates: [
        courtCandidate({ id: 'tropical-parrot', label: 'なんごくの インコ', emoji: '🦜', gender: 'female', orientationId: 'pan', affinityTrait: 'romantic' }),
        courtCandidate({ id: 'palm-lizard', label: 'やしの きの リザードさん', emoji: '🦎', gender: 'male', orientationId: 'gay', affinityTrait: 'wild' }),
      ],
    },
  ];

  function findRegion(id) {
    return REGIONS.find((r) => r.id === id) || REGIONS[0];
  }

  // 「ずかん」の「こいびと」セクションで つかう、地域ごとの きめうち
  // キャラの ぜんいちらん(REGIONSの candidatesを ひとつに まとめたもの)
  const ALL_PARTNER_CANDIDATES = REGIONS.flatMap((r) => r.candidates);

  // なかまイベントで であえる キャラたち。ランダムに 1たい えらばれて
  // とうじょうし、そのあとに はじまる ミニゲームを クリアできれば なかまに
  // なる。なかまに なった id は state.lifetime.companionsRecruited に
  // 永続で きろくされ(「はじめから」でも消えない)、画面の よこの れつと
  // ずかんの 「なかま」セクションに ずっと 表示されつづける
  const COMPANIONS = [
    { id: 'shiba', emoji: '🐕', name: 'げんきな しばいぬ', flavor: 'げんきいっぱいの しばいぬが ちかづいてきた!いっしょに あそんで なかよくなろう!' },
    { id: 'tanuki', emoji: '🦝', name: 'いたずら たぬき', flavor: 'いたずらっこの たぬきが とつぜん あらわれた!ゆだんすると からかわれちゃうかも?' },
    { id: 'penguin', emoji: '🐧', name: 'おっちょこちょい ペンギン', flavor: 'よちよち あるく ペンギンが めのまえに!なかまに なってくれるか ためしてみよう' },
    { id: 'owl', emoji: '🦉', name: 'ものしり ふくろう', flavor: 'ものしりな ふくろうが きの えだから みつめている…なかまに できるかな?' },
    { id: 'rabbit', emoji: '🐰', name: 'すばしっこい うさぎ', flavor: 'すばしっこい うさぎが とびはねながら やってきた!ついてこられる?' },
    { id: 'hedgehog', emoji: '🦔', name: 'はずかしがり はりねずみ', flavor: 'はずかしがりやの はりねずみが そっと かおを だした…' },
    { id: 'koala', emoji: '🐨', name: 'のんびり コアラ', flavor: 'のんびりやの コアラが きから おりてきた' },
    { id: 'otter', emoji: '🦦', name: 'あそびずき カワウソ', flavor: 'あそぶのが だいすきな カワウソが きょうみしんしんで ちかづいてきた!' },
    { id: 'hamster', emoji: '🐹', name: 'ほおぶくろ ハムスター', flavor: 'ほおぶくろパンパンの ハムスターが てちょうを のぞきこんでいる' },
    { id: 'squirrel', emoji: '🐿️', name: 'おっちょこちょい リス', flavor: 'どんぐりを かかえた リスが しっぽを ふりふり ちかづいてきた' },
  ];

  const COMPANION_RECRUIT_THRESHOLD = 50;

  // なにも しなくても、放っておくと たまに キャラのほうから 話しかけてくる
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
    'きゅうに はなしかけて ごめんね!',
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

  // rewards for a great minigame result: each heals the death meter by a
  // different amount. weight controls drop rarity - the strongest healers
  // (kiss, hug) are the rarest, weaker ones are common, so a big stock of
  // items still tends to be mostly low-tier
  const RECOVERY_ITEMS = [
    { id: 'kiss', label: 'キス', emoji: '💋', heal: 40, weight: 1 },
    { id: 'hug', label: 'ハグ', emoji: '🤗', heal: 32, weight: 2 },
    { id: 'shoulder', label: 'かたたたき', emoji: '💆', heal: 26, weight: 3 },
    { id: 'hotpot', label: 'なべ', emoji: '🍲', heal: 22, weight: 4 },
    { id: 'curry', label: 'カレー', emoji: '🍛', heal: 20, weight: 5 },
    { id: 'udon', label: 'うどん', emoji: '🍜', heal: 18, weight: 5 },
    { id: 'dogfood', label: 'ドッグフード', emoji: '🦴', heal: 15, weight: 6 },
    { id: 'catfood', label: 'キャットフード', emoji: '🐟', heal: 15, weight: 6 },
    { id: 'candy', label: 'あめ', emoji: '🍬', heal: 8, weight: 8 },
  ];

  function pickWeightedItem() {
    const totalWeight = RECOVERY_ITEMS.reduce((sum, it) => sum + it.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const item of RECOVERY_ITEMS) {
      roll -= item.weight;
      if (roll <= 0) return item;
    }
    return RECOVERY_ITEMS[RECOVERY_ITEMS.length - 1];
  }

  // returns true if a transition happened, so callers can loop it to catch
  // up multiple stages at once when age jumps by a lot in one go
  function advanceStage() {
    if (state.stage === STAGE.EGG) {
      if (state.age < HATCH_AGE) return false;
      state.speciesLine = pickRandomLine();
      state.stage = STAGE.GROWING;
      state.stageIndex = 0;
      const identity = rollIdentity(state.speciesLine);
      state.gender = identity.gender;
      state.orientationId = identity.orientationId;
      state.attractedTo = identity.attractedTo;
      setMessage('たまごがかえった!');
      emotePet('happy');
      return true;
    }
    if (state.stage === STAGE.GROWING) {
      const stages = SPECIES[state.speciesLine].stages;
      const next = stages[state.stageIndex + 1];
      if (!next || state.age < next.threshold) return false;
      state.stageIndex += 1;
      setMessage(next.message || `${next.label}に なった!`);
      emotePet('fun');
      return true;
    }
    return false;
  }

  // the evolution/devolution/death meters are the fast, performance-driven
  // layer on top of plain aging: doing well fills evoMeter and, once full,
  // always transforms the pet forward a stage (snapping age up to that
  // stage's threshold); doing poorly fills devoMeter and, once full, always
  // knocks it back a stage (snapping age down); repeated mistakes fill
  // deathMeter and end things outright. because these jumps move age
  // directly, they also move the pet toward or away from GOAL_DAYS
  // both return whether they actually moved the pet a stage, so callers
  // can gate story events on a real change rather than a no-op attempt
  function triggerEvolutionJump() {
    if (state.stage !== STAGE.GROWING) return false;
    const stages = SPECIES[state.speciesLine].stages;
    if (state.stageIndex >= stages.length - 1) return false;
    state.age = Math.max(state.age, stages[state.stageIndex + 1].threshold);
    return advanceStage();
  }

  function triggerDevolutionJump() {
    if (state.stage !== STAGE.GROWING || state.stageIndex <= 0) {
      // already the youngest growing stage (or still an egg) - nowhere
      // lower to fall back to visually
      setMessage('たいかメーターが MAXに…でも これ以上は もどれない…');
      return false;
    }
    const stages = SPECIES[state.speciesLine].stages;
    state.stageIndex -= 1;
    state.age = stages[state.stageIndex].threshold;
    setMessage(`${stages[state.stageIndex].label}に もどってしまった…`);
    emotePet('sad');
    return true;
  }

  function triggerDeath() {
    state.stage = STAGE.DEAD;
    state.lifetime.deaths += 1;
    setMessage('しぼうメーターが MAXに…てんごくへ いってしまった…');
  }

  function triggerGameClear() {
    state.stage = STAGE.CLEAR;
    state.lifetime.clears += 1;
    setMessage('ゲームクリア!');
  }

  // returns true if it set its own message (death/transform/clear) - callers
  // must not overwrite that with their own generic action message afterward
  function checkMeters() {
    if (state.stage === STAGE.DEAD || state.stage === STAGE.CLEAR) return false;
    if (state.deathMeter >= 100) {
      state.deathMeter = 0;
      state.evoMeter = 0;
      state.devoMeter = 0;
      triggerDeath();
      return true;
    }
    let changedMessage = false;
    if (state.evoMeter >= 100) {
      state.evoMeter = 0;
      if (triggerEvolutionJump()) {
        state.lifetime.evolutions += 1;
        checkStoryEvents('evolve');
      }
      changedMessage = true;
    }
    if (state.devoMeter >= 100) {
      state.devoMeter = 0;
      if (triggerDevolutionJump()) {
        state.lifetime.devolutions += 1;
        checkStoryEvents('devolve');
      }
      changedMessage = true;
    }
    if (state.transformMeter >= 100 && !state.transformOptions && state.stage === STAGE.GROWING) {
      state.transformMeter = 0;
      state.transformOptions = pickTransformCandidates();
      setMessage('へんしんの ちからが たまった!すがたを えらべるよ');
      changedMessage = true;
    }
    if (!state.freePlay && Math.floor(state.age / 20) >= GOAL_DAYS) {
      triggerGameClear();
      return true;
    }
    return changedMessage;
  }

  const STORY_FLASH_DURATION_MS = 4200;

  let lastStoryEventMessage = null;

  function checkStoryEvents(context) {
    if (state.stage === STAGE.DEAD || state.stage === STAGE.CLEAR || gameActive) return;
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
    if (state.stage === STAGE.DEAD || state.stage === STAGE.CLEAR) return;

    state.age = clamp(state.age + 1, AGE_MIN, AGE_MAX);

    if (state.stage === STAGE.EGG) {
      advanceStage();
      return;
    }

    {
      const sleepFactor = state.isSleeping ? 0.4 : 1;
      // ちょうネクタイ/リボンを そうびしていると、それぞれ 満腹/機嫌の
      // 時間経過による げんしょうが ゆるやかに なる
      const hungerFactor = isEquipped('bowtie') ? 0.6 : 1;
      const happinessFactor = isEquipped('ribbon') ? 0.6 : 1;
      state.hunger = clamp(state.hunger - 1 * sleepFactor * hungerFactor, 0, 100);
      state.happiness = clamp(state.happiness - 1 * sleepFactor * happinessFactor, 0, 100);

      if (state.isSleeping) {
        // 元気の かいふくスピードを 底上げ(びょうき中は それでも 少し
        // ひかえめ)。「ねる」を おした しゅんかんの キックスタート分
        // (sleepBtn の クリックハンドラを さんしょう)と あわせて、
        // すぐに かいふくが はじまり、はやく フルに もどるように している
        state.energy = clamp(state.energy + (state.isSick ? 10 : 26), 0, 100);
      } else {
        state.energy = clamp(state.energy - 0.65 * energyDecayMultiplier(), 0, 100);
      }

      // poop accumulates over time
      if (Math.random() < 0.08 && state.poopCount < MAX_POOP) {
        state.poopCount += 1;
      }
      if (state.poopCount >= MAX_POOP) {
        state.happiness = clamp(state.happiness - 2, 0, 100);
        state.devoMeter = clamp(state.devoMeter + 3, 0, 100);
      }

      // sickness risk - neglect (dirt, hunger, unhappiness, low health) raises
      // the odds of falling ill; well cared-for pets almost never trigger this
      const neglected = state.poopCount >= 2 || state.health < 50 || state.hunger < 30 || state.happiness < 30;
      if (!state.isSick && neglected) {
        // マフラーを そうびしていると、びょうきに なる かくりつが 半分に
        const sicknessChance = isEquipped('scarf') ? 0.045 : 0.09;
        if (Math.random() < sicknessChance) {
          const sickness = SICKNESS_TYPES[Math.floor(Math.random() * SICKNESS_TYPES.length)];
          state.isSick = true;
          state.sicknessType = sickness.label;
          state.totalSicknessCount += 1;
          state.devoMeter = clamp(state.devoMeter + 12, 0, 100);
          raiseDeathMeter(12);
          setMessage(`${sickness.label}に なってしまった…くすりをあげよう`);
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
        raiseDeathMeter(8);
      } else {
        state.lowHealthStreak = 0;
      }
      const deathThreshold = Math.max(6, 15 - state.totalSicknessCount);
      if (state.lowHealthStreak >= deathThreshold) {
        state.stage = STAGE.DEAD;
        setMessage('てんごくへ いってしまった…');
      }

      // 「死亡」メーターは これまで びょうき・ていけんこう・ミニゲーム
      // 大失敗・たべすぎ など「なにか やらかした とき」だけ あがり、
      // 放っておいても じたいは まったく うごかなかった - お世話さえ
      // 欠かさなければ ずっと 安全、という ぬるさの げんいんだった。
      // としを とるほど わずかに 自然にも あがるようにして、放置に
      // たいする きんちょうかんを もたせる(raiseDeathMeter() を通すので、
      // こいびと/夫婦や かんむりの けいげん効果は ここにも かかる)。
      // すぐ したの wellCared による -2/tick の 自動かいふくより 小さいと、
      // 4項目を つねに 60いじょう たもてる 熟練プレイヤーには この上昇が
      // まいtick かんぜんに 打ち消されて けっきょく なにも かわらなく
      // なってしまう ため、ageDifficulty が 上限に ちかい ときは -2を
      // うわまわる 大きさまで あげ、じゅうぶん 年を とれば どんなに
      // かんぺきに お世話しても すこしずつは あがっていく ようにしてある
      // (それでも かいふくアイテムを ときどき つかえば じゅうぶん おさえられる
      // 大きさで、ぜったいに 死んでしまう ほどの きゅうげきな 上昇では ない)
      const naturalDeathRise = lerp(0.3, 2.5, ageDifficulty());
      raiseDeathMeter(naturalDeathRise);

      // お世話が じゅうぶん いきとどいている あいだ(びょうきでなく、
      // 満腹・機嫌・元気・体力が すべて 60いじょう)は、死亡メーターが
      // すこしずつ ひとりでに かいふくする - 回復アイテムの うんに
      // たよらず、ちゃんと お世話を つづければ じぶんの ちからで
      // さげられる。ひとつでも 60を きると その tick は かいふくしない
      const wellCared = !state.isSick
        && state.hunger >= 60
        && state.happiness >= 60
        && state.energy >= 60
        && state.health >= 60;
      if (wellCared && state.deathMeter > 0) {
        state.deathMeter = clamp(state.deathMeter - 2, 0, 100);
      }

      // こいびと/夫婦は ほうっておくと なかよし度が へっていき、0で
      // わかれてしまう - きゅうあいで ちゃんと いちゃつきつづける ひつようが ある
      decayRelationship();

      // なかまも おなじく、じゃれるを おさぼると bond が へっていき、0の
      // なかまから じゅんに はなれて いってしまう
      decayCompanionBonds();

      // no natural age-based advancement past the egg here on purpose -
      // growing up beyond hatching only happens through triggerEvolutionJump()
      // (see checkMeters()), so a full evo meter is the only thing that
      // actually transforms the pet
      checkMeters();
    }
  }

  // each mood gets its own hop/wobble plus a couple of floating emoji -
  // a small, immediate (100% of the time) layer of feedback that sits
  // alongside the bigger but rarer full-screen STORY_EVENT_POOLS flashes
  const EMOTE_CONFIG = {
    happy: { animClass: 'emote-happy', particles: ['💖', '✨'], duration: 620 },
    fun: { animClass: 'emote-fun', particles: ['🎉', '✨'], duration: 720 },
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
        && state.stage !== STAGE.CLEAR
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

  // 放置していると、たまにキャラのほうから話しかけてくる(IDLE_GREETINGSから
  // 1つ抽選)。ほかのメッセージやミニゲーム・すいみん中などとかぶらないよう、
  // 何も表示されていない・普通に育っている最中のときだけ発火する
  function scheduleIdleGreeting() {
    const delay = 3000 + Math.random() * 9000;
    setTimeout(() => {
      const canGreet = !gameActive
        && state.stage === STAGE.GROWING
        && !state.isSleeping
        && !state.transformOptions
        && !message;
      if (canGreet) {
        const greeting = pickReaction(IDLE_GREETINGS, lastIdleGreeting);
        lastIdleGreeting = greeting;
        setMessage(greeting);
        emotePet('happy');
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
  function scheduleCompanionEncounter() {
    const delay = 45000 + Math.random() * 75000;
    setTimeout(() => {
      const remaining = COMPANIONS.filter((c) => !state.companions.some((sc) => sc.id === c.id));
      const canEncounter = !gameActive
        && state.stage === STAGE.GROWING
        && !state.isSleeping
        && !state.transformOptions
        && !message
        && !pendingCompanionId
        && !dexOpen && !achOpen && !themeOpen && !profileOpen
        && remaining.length > 0;
      if (canEncounter) {
        const companion = remaining[Math.floor(Math.random() * remaining.length)];
        pendingCompanionId = companion.id;
        showStoryEvent({ emoji: companion.emoji, message: companion.flavor });
        setTimeout(() => {
          if (pendingCompanionId !== companion.id) return;
          clearTimeout(storyFlashTimer);
          el.storyFlash.classList.add('hidden');
          const stillOk = !gameActive && state.stage === STAGE.GROWING && !state.isSleeping && !state.transformOptions;
          if (!stillOk) {
            pendingCompanionId = null;
            return;
          }
          startMinigame(pickRandomMinigame());
        }, 2800);
      }
      scheduleCompanionEncounter();
    }, delay);
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
    elBar.className = `bar-fill ${baseClass} ${value >= 70 ? 'high' : ''}`.trim();
  }

  function currentSprite() {
    if (state.stage === STAGE.EGG) return '🥚';
    if (state.stage === STAGE.DEAD) return '👻';
    if (state.stage === STAGE.CLEAR) return '🎉';
    const stages = state.speciesLine && SPECIES[state.speciesLine].stages;
    return stages?.[state.stageIndex]?.emoji || '❓';
  }

  function currentStageLabel() {
    if (state.stage === STAGE.EGG) return 'たまご';
    if (state.stage === STAGE.DEAD) return 'おわり';
    if (state.stage === STAGE.CLEAR) return 'クリア!';
    const stages = state.speciesLine && SPECIES[state.speciesLine].stages;
    return stages?.[state.stageIndex]?.label || '';
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

  // 地域の decor(絵柄)を、デバイスの まわりに ランダムに ちらす。
  // 地域が かわった ときだけ よびだされるので、おなじ 地域に いるあいだは
  // いちが ガタガタ かわったりしない
  function renderRegionDecor(region) {
    el.regionDecor.innerHTML = (region.decor || []).map((emoji) => {
      const pos = randomEdgePosition();
      const size = 22 + Math.random() * 20;
      const duration = 7 + Math.random() * 6;
      const delay = Math.random() * duration;
      return `<span class="region-decor-item" style="left:${pos.left}%; top:${pos.top}%; font-size:${size}px; animation-duration:${duration}s; animation-delay:-${delay}s;">${emoji}</span>`;
    }).join('');
  }

  // 「たび」で えらんだ 地域を body の class に反映する。「いろ」の
  // 本体/がめんテーマとは 別レイヤー(まわりの けしき)なので、どんな
  // いろの くみあわせと あわせても 衝突しない
  let lastDecorRegionId = null;

  function applyRegion() {
    const region = findRegion(state.regionId);
    REGIONS.forEach((r) => {
      document.body.classList.toggle(`region-${r.id}`, r === region);
    });
    if (region.id !== lastDecorRegionId) {
      renderRegionDecor(region);
      lastDecorRegionId = region.id;
    }
    return region;
  }

  function render() {
    const isDead = state.stage === STAGE.DEAD;
    const isClear = state.stage === STAGE.CLEAR;
    const isEgg = state.stage === STAGE.EGG;
    const isOver = isDead || isClear;

    el.petSprite.textContent = currentSprite();
    const equippedItem = SHOP_ITEMS.find((it) => it.id === state.lifetime.equippedItemId);
    el.petAccessory.textContent = equippedItem ? equippedItem.emoji : '';
    el.petAccessory.classList.toggle('hidden', !equippedItem || isEgg || isDead);
    el.ageLabel.textContent = `年齢: ${Math.floor(state.age / 20)}`;
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

    updateMeter(el.evoBar, isOver ? 0 : state.evoMeter, 'evo');
    updateMeter(el.devoBar, isOver ? 0 : state.devoMeter, 'devo');
    updateMeter(el.deathBar, isOver ? 0 : state.deathMeter, 'death');
    updateMeter(el.transformBar, isOver ? 0 : state.transformMeter, 'transform');

    const goalDays = Math.floor(state.age / 20);
    updateMeter(el.goalBar, isDead ? 0 : goalDays, 'goal');
    el.goalValue.textContent = `${isDead ? 0 : goalDays} / ${GOAL_DAYS}`;

    el.poopRow.textContent = '💩'.repeat(state.poopCount);

    const badges = [];
    if (state.isSick) {
      const sickness = SICKNESS_TYPES.find((s) => s.label === state.sicknessType);
      badges.push(sickness ? sickness.badge : '🤒');
    }
    if (state.isSleeping && !isOver) badges.push('💤');
    el.badges.textContent = badges.join(' ');

    el.screen.classList.toggle('dead', isDead);
    el.screen.classList.toggle('sick', state.isSick && !isOver);
    el.screen.classList.toggle('sleeping', state.isSleeping && !isOver);
    el.lamp.classList.toggle('sick', state.isSick && !isOver);
    el.gameClearOverlay.classList.toggle('hidden', !isClear);
    // renderEnding() (when isClear) records this playthrough's qualifying
    // tiers into state.lifetime.endingTiersReached, and may auto-select the
    // 'rainbow' screen theme the first time all 4 are reached - so both the
    // badge row and applyTheme() below must run after it, not before
    if (isClear) renderEnding();
    applyTheme();

    const region = applyRegion();
    el.regionLabel.textContent = `${region.emoji} ${region.label}`;
    el.partnerLabel.textContent = state.partner
      ? `${state.partner.married ? '💍' : '💑'} ${state.partner.emoji} ${state.partner.label}`
      : '';
    el.partnerLabel.title = state.partner
      ? `${GENDER_LABELS[state.partner.gender]}・${orientationLabel(state.partner.orientationId, state.partner.gender)}・${state.partner.married ? '夫婦' : 'こいびと'}`
      : '';
    el.subStatusRow.classList.toggle('hidden', isEgg || isOver);
    el.profileBtn.classList.toggle('hidden', isEgg || isOver);

    const endingTiersReached = state.lifetime.endingTiersReached;
    el.endingBadges.innerHTML = [...endingTiersReached]
      .sort((a, b) => a - b)
      .map((tierIndex) => `<span class="ending-badge" title="${ENDING_TIERS[tierIndex].title}">${ENDING_TIER_ICONS[tierIndex]}</span>`)
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
    } else if (isClear) {
      el.message.textContent = '';
    } else if (isEgg) {
      el.message.textContent = 'もうすぐ かえりそう…';
    } else {
      el.message.textContent = '';
    }

    const disableCare = isOver || isEgg || hasTransformChoice;
    el.feedBtn.disabled = disableCare;
    el.playBtn.disabled = disableCare || state.isSleeping;
    el.cleanBtn.disabled = disableCare || state.poopCount === 0;
    el.sleepBtn.disabled = disableCare;
    el.medicineBtn.disabled = disableCare;
    el.playWithBtn.disabled = disableCare;
    el.courtBtn.disabled = disableCare;
    el.travelBtn.disabled = disableCare;
    el.resetBtn.classList.toggle('hidden', !isOver);

    el.sleepBtn.querySelector('span').textContent = state.isSleeping ? 'おきる' : 'ねる';
    el.dexBtn.disabled = gameActive || hasTransformChoice;
    el.achBtn.disabled = gameActive || hasTransformChoice;
    el.themeBtn.disabled = gameActive || hasTransformChoice;
    el.itemBtn.disabled = gameActive || hasTransformChoice;

    el.dexOverlay.classList.toggle('hidden', !dexOpen);
    if (dexOpen) renderDex();

    el.achOverlay.classList.toggle('hidden', !achOpen);
    if (achOpen) renderAchievements();

    el.themeOverlay.classList.toggle('hidden', !themeOpen);
    if (themeOpen) renderThemeOverlay();

    el.profileOverlay.classList.toggle('hidden', !profileOpen);
    if (profileOpen) renderProfile();

    el.itemOverlay.classList.toggle('hidden', !itemOpen);
    if (itemOpen) renderItemOverlay();

    renderItemsRow(disableCare);
  }

  let dexOpen = false;
  let achOpen = false;
  let themeOpen = false;
  let profileOpen = false;
  let itemOpen = false;
  // れんあいタイプの「？」ボタンで ひらいた せつめいが、profileOpen 中の
  // ほかの 操作(たとえば きゅうあいの けっかで render() が よびなおされる
  // など)で かってに とじてしまわないよう、ひらいている/いないを
  // ここで おぼえておく
  let orientationHintOpen = false;

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
      orientationText += `(けいけん ${state.questioningEncounters || 0}/${QUESTIONING_RESOLVE_THRESHOLD})`;
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
      aro: 'れんあい感情を あまり かんじない/かんじにくい タイプ。なかまや ともだちとの ふかい きずなは ふつうに きずけます',
      questioning: 'れんあいタイプが まだ きまっていない/さがしている とちゅう。いろんな あいてと であう ことで、いつか べつの タイプに おちつくかも',
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
        : `<span class="profile-partner-detail">つぎの ふしめまで あと ${MARRIAGE_BOND_THRESHOLD - (p.bondCount || 0)}かいの きゅうあい</span>`;
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
        const c = COMPANIONS.find((cc) => cc.id === sc.id);
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
          <span class="profile-partner-emoji">${stage.emoji}</span>
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

  // 「アイテム」がめん: SHOP_ITEMS を みにつける ものの いちらんとして
  // あらわす。みぶんに おうじて みぶんの ひょうじが かわる: みこうにゅう
  // なら ねだん、こうにゅうずみで そうびちゅうでなければ「タップで そうび」、
  // そうびちゅうなら「そうびちゅう」
  function renderItemOverlay() {
    el.itemMoneyLabel.textContent = `💰 ${state.lifetime.money}`;
    el.shopItemGrid.innerHTML = SHOP_ITEMS.map((item) => {
      const owned = state.lifetime.ownedShopItems.includes(item.id);
      const equipped = state.lifetime.equippedItemId === item.id;
      const statusText = !owned ? `💰${item.price}` : (equipped ? 'そうびちゅう' : 'タップで そうび');
      return `
        <button type="button" class="shop-item ${equipped ? 'equipped' : ''}" data-id="${item.id}">
          <span class="shop-item-emoji">${item.emoji}</span>
          <span class="shop-item-label">${item.label}</span>
          <span class="shop-item-desc">${item.desc}</span>
          <span class="shop-item-status">${statusText}</span>
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

  // the GAME CLEAR overlay's grandeur scales with getEndingTier() - re-runs
  // every render() while isClear, but the tier can only ever go up (dex/ach
  // records are permanent) and no care actions are possible once cleared,
  // so in practice it settles the moment the overlay first shows (tier 3
  // is the one exception: it offers a 「じゆうに あそぶ」ボタン that exits
  // the CLEAR stage entirely, see the gameClearFreePlayBtn ハンドラー)
  function renderEnding() {
    const tierIndex = getEndingTier();
    const tier = ENDING_TIERS[tierIndex];
    el.gameClearOverlay.classList.toggle('tier-1', tier === ENDING_TIERS[1]);
    el.gameClearOverlay.classList.toggle('tier-2', tier === ENDING_TIERS[2]);
    el.gameClearOverlay.classList.toggle('tier-3', tier === ENDING_TIERS[3]);
    // パーフェクト(tier 3)の ときだけ「じゆうに あそぶ」ボタンを 出す -
    // それいがいの tier は めざす さきが まだ ある ので、「はじめから」で
    // また ちょうせんしなおす ことを うながす
    el.gameClearFreePlayBtn.classList.toggle('hidden', tierIndex !== 3);
    el.gameClearTitle.textContent = tier.title;
    el.gameClearConfettiTop.textContent = tier.confetti;
    el.gameClearConfettiBottom.textContent = tier.confetti;
    el.gameClearDesc.innerHTML = tier.desc;
    el.gameClearBadges.innerHTML = tier.badges.map((b) => `<span class="game-clear-badge">${b}</span>`).join('');
    const hadAllTiers = state.lifetime.endingTiersReached.length >= ENDING_TIERS.length;
    qualifyingEndingTiers().forEach((t) => {
      if (!state.lifetime.endingTiersReached.includes(t)) {
        state.lifetime.endingTiersReached.push(t);
      }
    });
    // はじめて 4つ ぜんぶ そろった しゅんかんに、がめんの いろを
    // レインボーに 自動で きりかえる(その あとは「いろ」から いつでも
    // えらびなおせる、強制ではない いち回だけの おいわい)
    if (!hadAllTiers && state.lifetime.endingTiersReached.length >= ENDING_TIERS.length) {
      state.lifetime.screenThemeId = 'rainbow';
    }
    if (!endingCelebrationShown) {
      endingCelebrationShown = true;
      spawnEndingCelebration(tierIndex);
    }
  }

  // 図鑑: shows every species line's 6 growth stages, revealing emoji+label
  // only for line/stage combos recorded in state.discoveredStages so far.
  // パーフェクトクリアで freePlay に なったあとは、であった すがた(known)
  // を タップすると すぐ その すがたに 変身できる(el.dexGrid の クリック
  // ハンドラー さんしょう) - ロックされた すがたは タップしても なにも
  // おきない
  function renderDex() {
    const discoveredCount = state.discoveredStages.length;
    const totalCount = ALL_LINES.length * STAGES_PER_LINE;
    // ヘッダーの ぜんたい数は、しゅぞく・なかま・こいびとの 3セクション
    // ぶんを あわせた かずで あらわす(dex-complete じっせきの はんてい
    // じたいは しゅぞくだけの totalCount の ままで、ここは 表示だけ)
    const combinedDiscovered = discoveredCount + state.lifetime.companionsRecruited.length + state.lifetime.partnersRecorded.length;
    const combinedTotal = totalCount + COMPANIONS.length + ALL_PARTNER_CANDIDATES.length;
    el.dexProgress.textContent = `${combinedDiscovered} / ${combinedTotal}`;
    el.dexFreePlayHint.classList.toggle('hidden', !state.freePlay);
    el.dexGrid.innerHTML = ALL_LINES.map((line) => {
      const stages = SPECIES[line].stages;
      const cells = stages
        .map((stage, i) => {
          const known = state.discoveredStages.includes(`${line}:${i}`);
          if (!known) return `<div class="dex-cell locked"><span class="dex-cell-emoji">❓</span><span class="dex-cell-label">？？？</span></div>`;
          const tappable = state.freePlay ? ' tappable' : '';
          return `<div class="dex-cell known${tappable}" data-line="${line}" data-stage="${i}"><span class="dex-cell-emoji">${stage.emoji}</span><span class="dex-cell-label">${stage.label}</span></div>`;
        })
        .join('');
      return `<div class="dex-line-block"><div class="dex-row">${cells}</div></div>`;
    }).join('');
    renderCompanionDex();
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
      .map((sc) => COMPANIONS.find((c) => c.id === sc.id))
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

  function renderTransformChoices() {
    const options = state.transformOptions || [];
    el.transformChoices.innerHTML = options
      .map((line) => {
        const stage = SPECIES[line].stages[state.stageIndex];
        return `
          <button class="transform-choice-btn" data-line="${line}">
            <span class="transform-choice-emoji">${stage.emoji}</span>
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
    state.traitCounts = { gentle: 0, wild: 0, calm: 0, brave: 0, romantic: 0 };

    if (!state.partner) return '';
    const partnerAttractedTo = attractedToFor(state.partner.gender, state.partner.orientationId);
    const stillMatches = partnerAttractedTo.includes(state.gender) && state.attractedTo.includes(state.partner.gender);
    if (stillMatches) return '';

    const wasMarried = !!state.partner.married;
    const label = state.partner.label;
    state.partner = null;
    raiseDeathMeter(BREAKUP_DEATH_PENALTY[wasMarried ? 'married' : 'dating']);
    return wasMarried
      ? `れんあいタイプが かわって、${label}とは りこんする ことに なった…`
      : `れんあいタイプが かわって、${label}とは わかれる ことに なった…`;
  }

  function chooseTransform(line) {
    if (!state.transformOptions || !state.transformOptions.includes(line)) return;
    state.speciesLine = line;
    state.transformOptions = null;
    state.lifetime.transforms += 1;
    const stage = SPECIES[line].stages[state.stageIndex];
    const breakupMessage = rerollIdentityAndBreakupIfNeeded(line);
    setMessage(`${stage.label}に へんしんした!${breakupMessage}`);
    checkStoryEvents('transform');
    emotePet(breakupMessage ? 'sad' : 'fun');
    saveState();
    render();
  }

  function skipTransform() {
    if (!state.transformOptions) return;
    state.transformOptions = null;
    setMessage('いまの すがたのままで いくことにした');
    saveState();
    render();
  }

  el.transformChoices.addEventListener('click', (e) => {
    const btn = e.target.closest('.transform-choice-btn');
    if (!btn) return;
    chooseTransform(btn.dataset.line);
  });

  el.transformSkipBtn.addEventListener('click', skipTransform);

  // recovery items are earned from great minigame results and heal the
  // death meter by an amount that depends on the item (see RECOVERY_ITEMS)
  function renderItemsRow(disableUse) {
    const entries = RECOVERY_ITEMS.filter((item) => (state.items[item.id] || 0) > 0);
    if (entries.length === 0) {
      el.itemsRow.innerHTML = '';
      return;
    }
    el.itemsRow.innerHTML = entries
      .map(
        (item) => `
          <button class="item-btn" data-item-id="${item.id}" title="${item.label}" ${disableUse ? 'disabled' : ''}>
            <span class="item-emoji">${item.emoji}</span>
            <span class="item-count">${state.items[item.id]}</span>
          </button>
        `
      )
      .join('');
  }

  function useItem(itemId) {
    const count = state.items[itemId] || 0;
    if (count <= 0) return;
    const item = RECOVERY_ITEMS.find((it) => it.id === itemId);
    if (!item) return;
    state.items[itemId] = count - 1;
    if (state.items[itemId] <= 0) delete state.items[itemId];
    state.deathMeter = clamp(state.deathMeter - item.heal, 0, 100);
    setMessage(`${item.emoji}${item.label}で げんきに なった!`);
    emotePet('happy');
    saveState();
    render();
  }

  el.itemsRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.item-btn');
    if (!btn || btn.disabled) return;
    useItem(btn.dataset.itemId);
  });

  // --- minigames (triggered by the play button) ---

  // shared factory behind every catch-and-avoid themed minigame - only the
  // title, basket emoji, and item pools change between variants
  function makeCatchGame({ title, basketEmoji, goodItems, badItems }) {
    return {
    start(container, onComplete) {
      const difficulty = ageDifficulty();
      const DURATION_MS = 10000;
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
          <span id="mgTimer">残り: 10s</span>
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

      const startTime = performance.now();
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
            } else {
              points = Math.min(100, points + 15);
            }
            scoreEl.textContent = `とくてん: ${points}`;
            item.el.remove();
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

  const CATCH_GAME_VARIANTS = [
    makeCatchGame({
      title: 'おやつキャッチ!わるい ものは よけよう',
      basketEmoji: '🧺',
      goodItems: ['🍙', '🍎', '🍬', '🍇'],
      badItems: ['💩', '🪳', '🔪', '🔫'],
    }),
    makeCatchGame({
      title: 'くだものキャッチ!くさった のは いらない',
      basketEmoji: '🧺',
      goodItems: ['🍓', '🍊', '🍑', '🍌'],
      badItems: ['🐛', '🦠', '🗑️', '☠️'],
    }),
    makeCatchGame({
      title: 'おすしキャッチ!わさびは からいよ',
      basketEmoji: '🍽️',
      goodItems: ['🍣', '🍱', '🍤', '🍥'],
      badItems: ['🟢', '🔥', '🧨', '🐡'],
    }),
    makeCatchGame({
      title: 'ほしキャッチ!いんせきは あぶない',
      basketEmoji: '🛸',
      goodItems: ['⭐', '🌟', '✨', '🌠'],
      badItems: ['☄️', '🪨', '⚡', '🛰️'],
    }),
    makeCatchGame({
      title: 'やさいキャッチ!むしは いやだよね',
      basketEmoji: '🧺',
      goodItems: ['🥕', '🥦', '🌽', '🍅'],
      badItems: ['🐛', '🐌', '🪱', '🕷️'],
    }),
    makeCatchGame({
      title: 'おかしキャッチ!からい ものは にがて',
      basketEmoji: '🎪',
      goodItems: ['🍭', '🍩', '🧁', '🍫'],
      badItems: ['🌶️', '🔥', '🥵', '🍛'],
    }),
    // なつかしい 配管工アクションの「キノコと コインを あつめて とげは
    // よける」あそびごこちを モチーフにした オマージュ
    makeCatchGame({
      title: 'コイン&キノコだいぼうけん!とげは キケン',
      basketEmoji: '🧢',
      goodItems: ['🍄', '🪙', '⭐', '🌼'],
      badItems: ['🐢', '💣', '🔥', '⚡'],
    }),
    // なつかしい 冒険アクションの「ダンジョンで おたからを あつめる」
    // あそびごこちを モチーフにした オマージュ
    makeCatchGame({
      title: 'ダンジョンの たからさがし!トゲトゲは あぶない',
      basketEmoji: '🛡️',
      goodItems: ['💎', '💰', '🗝️', '🍯'],
      badItems: ['💀', '🦂', '🕷️', '☠️'],
    }),
  ];

  // shared factory behind every whack-a-mole style minigame - only the
  // title and target emoji change between variants
  function makeWhackGame({ title, targetEmoji }) {
    return {
    start(container, onComplete) {
      const difficulty = ageDifficulty();
      const DURATION_MS = 5000;
      const HOLE_COUNT = 6;
      const visibleMs = lerp(700, 320, difficulty);
      let hits = 0;
      let activeIndex = -1;
      let running = true;
      let hideTimeout;
      let spawnTimeout;

      container.innerHTML = `
        <div class="mg-header">
          <span id="mgTimer">残り: 5s</span>
          <span id="mgScore">たいしょう: 0</span>
        </div>
        <div class="mg-title">${title}</div>
        <div class="mg-whack-grid" id="mgGrid"></div>
      `;

      const grid = container.querySelector('#mgGrid');
      const timerEl = container.querySelector('#mgTimer');
      const scoreEl = container.querySelector('#mgScore');
      const holes = [];

      for (let i = 0; i < HOLE_COUNT; i++) {
        const hole = document.createElement('div');
        hole.className = 'mg-hole';
        hole.addEventListener('pointerdown', () => onTap(i));
        grid.appendChild(hole);
        holes.push(hole);
      }

      function onTap(i) {
        if (i !== activeIndex) return;
        hits += 1;
        scoreEl.textContent = `たいしょう: ${hits}`;
        holes[i].classList.remove('active');
        holes[i].textContent = '';
        activeIndex = -1;
        clearTimeout(hideTimeout);
        scheduleNext(150);
      }

      function showTarget() {
        if (!running) return;
        const i = Math.floor(Math.random() * HOLE_COUNT);
        activeIndex = i;
        holes[i].classList.add('active');
        holes[i].textContent = targetEmoji;
        hideTimeout = setTimeout(() => {
          holes[i].classList.remove('active');
          holes[i].textContent = '';
          activeIndex = -1;
          scheduleNext(200);
        }, visibleMs);
      }

      function scheduleNext(delay) {
        if (!running) return;
        spawnTimeout = setTimeout(showTarget, delay);
      }

      const startTime = performance.now();
      const tickInterval = setInterval(() => {
        const remaining = Math.max(0, DURATION_MS - (performance.now() - startTime));
        timerEl.textContent = `残り: ${Math.ceil(remaining / 1000)}s`;
        if (remaining <= 0) end();
      }, 200);

      function end() {
        if (!running) return;
        running = false;
        clearInterval(tickInterval);
        clearTimeout(hideTimeout);
        clearTimeout(spawnTimeout);
        const score = Math.max(0, Math.min(100, hits * 20));
        onComplete(score);
      }

      scheduleNext(300);
    },
    };
  }

  const WHACK_GAME_VARIANTS = [
    makeWhackGame({ title: 'とびだす ほしを タップ!', targetEmoji: '⭐' }),
    makeWhackGame({ title: 'とびだす もぐらを タップ!', targetEmoji: '🐹' }),
    makeWhackGame({ title: 'とびだす むしを タップ!', targetEmoji: '🐞' }),
    makeWhackGame({ title: 'とびだす おばけを タップ!', targetEmoji: '👻' }),
    makeWhackGame({ title: 'とびだす ひよこを タップ!', targetEmoji: '🐥' }),
    // なつかしい 配管工アクションの「?ブロックを たたく」を モチーフにした
    // オマージュ。商標キャラの名まえは つかわず、モチーフだけ お借りする
    makeWhackGame({ title: 'とびだす はてなブロックを たたいて コインゲット!', targetEmoji: '❓' }),
    // かくとうアクションの「ライバルを ふっとばす」あそびごこちを タップの
    // テンポで オマージュ
    makeWhackGame({ title: 'とびだす ライバルファイターを たたいて ふっとばせ!', targetEmoji: '🤺' }),
  ];

  // shared factory behind every timing-bar minigame - only the title, tap
  // button label, and gauge color theme change between variants
  function makeTimingGame({ title, tapLabel, gaugeStyle }) {
    return {
    start(container, onComplete) {
      const difficulty = ageDifficulty();
      const ROUNDS = 3;
      const zoneWidthMin = lerp(16, 7, difficulty);
      const zoneWidthRange = lerp(6, 3, difficulty);
      const baseSpeed = lerp(50, 95, difficulty);
      let round = 0;
      const scores = [];
      let running = true;
      let rafId;
      let direction = 1;
      let markerPct = 0;
      let speed = 50;
      let zoneStart = 0;
      let zoneWidth = 20;
      let lastTime = null;
      let locked = false;

      container.innerHTML = `
        <div class="mg-header">
          <span id="mgRound">ラウンド 1/${ROUNDS}</span>
          <span id="mgScore">とくてん: 0</span>
        </div>
        <div class="mg-timing-body">
          <div class="mg-title">${title}</div>
          <div class="mg-gauge" id="mgGauge" style="background:${gaugeStyle}">
            <div class="mg-gauge-zone" id="mgZone"></div>
            <div class="mg-gauge-marker" id="mgMarker"></div>
          </div>
          <button class="mg-tap-btn" id="mgTapBtn">${tapLabel}</button>
        </div>
      `;

      const zoneEl = container.querySelector('#mgZone');
      const markerEl = container.querySelector('#mgMarker');
      const tapBtn = container.querySelector('#mgTapBtn');
      const roundEl = container.querySelector('#mgRound');
      const scoreEl = container.querySelector('#mgScore');

      function newRound() {
        zoneWidth = zoneWidthMin + Math.random() * zoneWidthRange;
        zoneStart = Math.random() * (100 - zoneWidth);
        zoneEl.style.left = zoneStart + '%';
        zoneEl.style.width = zoneWidth + '%';
        markerPct = 0;
        direction = 1;
        speed = baseSpeed + round * 8;
        locked = false;
        tapBtn.disabled = false;
      }

      function frame(now) {
        if (!running) return;
        if (lastTime == null) lastTime = now;
        const dt = (now - lastTime) / 1000;
        lastTime = now;
        if (!locked) {
          markerPct += direction * speed * dt;
          if (markerPct >= 100) {
            markerPct = 100;
            direction = -1;
          }
          if (markerPct <= 0) {
            markerPct = 0;
            direction = 1;
          }
          markerEl.style.left = markerPct + '%';
        }
        rafId = requestAnimationFrame(frame);
      }

      function handleTap() {
        if (locked) return;
        locked = true;
        tapBtn.disabled = true;
        const center = zoneStart + zoneWidth / 2;
        const dist = Math.abs(markerPct - center);
        let roundScore;
        if (dist <= zoneWidth * 0.25) roundScore = 100;
        else if (dist <= zoneWidth / 2) roundScore = 70;
        else if (dist <= zoneWidth) roundScore = 40;
        else roundScore = 10;
        scores.push(roundScore);
        round += 1;
        scoreEl.textContent = `とくてん: ${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}`;
        if (round >= ROUNDS) {
          setTimeout(end, 500);
        } else {
          setTimeout(() => {
            roundEl.textContent = `ラウンド ${round + 1}/${ROUNDS}`;
            newRound();
          }, 500);
        }
      }

      tapBtn.addEventListener('pointerdown', handleTap);

      function end() {
        if (!running) return;
        running = false;
        cancelAnimationFrame(rafId);
        tapBtn.removeEventListener('pointerdown', handleTap);
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        onComplete(Math.round(avg));
      }

      newRound();
      rafId = requestAnimationFrame(frame);
    },
    };
  }

  const TIMING_GAME_VARIANTS = [
    makeTimingGame({ title: 'ちょうどいい タイミングで タップ!', tapLabel: 'タップ!', gaugeStyle: '#6fae5f' }),
    makeTimingGame({ title: 'ジャストタイミングを ねらえ!', tapLabel: 'ここだ!', gaugeStyle: '#4a90d9' }),
    makeTimingGame({ title: 'リズムに あわせて タップ!', tapLabel: 'いくよ!', gaugeStyle: '#c76fc9' }),
    // かくとうアクションの「ジャストタイミングで ためて はなつ スマッシュ
    // こうげき」あそびごこちを モチーフにした オマージュ
    makeTimingGame({ title: 'スマッシュこうげき!タイミングよく ためて はなとう', tapLabel: 'スマッシュ!', gaugeStyle: '#ff6b3d' }),
  ];

  const QUIZ_QUESTIONS = [
    // --- ふつう ---
    {
      text: 'きゅうに あめが ふってきたよ!どうする?',
      choices: [
        { label: 'いそいで やねの したに はしる', response: 'セーフ!ぬれなかったね', score: 90, trait: 'brave' },
        { label: 'あめの なかで おどっちゃう', response: 'たのしいけど ちょっと びしょぬれ…', score: 60, trait: 'wild' },
        { label: 'きにせず そのまま すすむ', response: 'かぜ ひかないでね…', score: 40, trait: 'wild' },
        { label: 'ちかくの おみせに にげこむ', response: 'きてんの きく こうどう!', score: 80, trait: 'calm' },
      ],
    },
    {
      text: 'おなかが すいてきた…なにを たべたい?',
      choices: [
        { label: 'おにぎり', response: 'もぐもぐ!げんきが でるね', score: 80, trait: 'gentle' },
        { label: 'あまい おかし', response: 'にっこり!しあわせな あじ', score: 70, trait: 'wild' },
        { label: 'なんでも いいや', response: 'じゃあ おまかせだね', score: 50, trait: 'calm' },
        { label: 'やさいを たべる', response: 'けんこうてき!からだ よろこぶね', score: 90, trait: 'gentle' },
      ],
    },
    {
      text: 'ともだちが けんかを してるみたい。どうする?',
      choices: [
        { label: 'なかに はいって なかなおりさせる', response: 'ふたりとも わらってくれた!', score: 90, trait: 'brave' },
        { label: 'そっと みまもる', response: 'しずかに おさまったみたい', score: 65, trait: 'calm' },
        { label: 'みなかったことに する', response: 'ちょっと きになるけど…', score: 35, trait: 'wild' },
        { label: 'りょうほうの はなしを べつべつに きく', response: 'こうへいな しせい、りっぱだね', score: 85, trait: 'gentle' },
      ],
    },
    {
      text: 'よる ねむれないとき、なにを する?',
      choices: [
        { label: 'ひつじを かぞえる', response: '1ぴき、2ひき…すやすや', score: 70, trait: 'calm' },
        { label: 'すきな おんがくを きく', response: 'こころが おちついたね', score: 85, trait: 'gentle' },
        { label: 'がんばって おきてる', response: 'あさに なって ねむそう…', score: 40, trait: 'wild' },
        { label: 'あたたかい ミルクを のむ', response: 'からだも こころも ほっとするね', score: 80, trait: 'gentle' },
      ],
    },
    {
      text: 'あたらしい ぼうしを もらったよ!どうする?',
      choices: [
        { label: 'さっそく かぶってみる', response: 'よく にあってるよ!', score: 85, trait: 'wild' },
        { label: 'だいじに しまっておく', response: 'たいせつに するんだね', score: 60, trait: 'calm' },
        { label: 'かがみで にあうか かくにんする', response: 'ばっちり!じしんまんまん', score: 75, trait: 'brave' },
        { label: 'ともだちに みせびらかす', response: 'うれしさが つたわってくるよ', score: 70, trait: 'wild' },
      ],
    },
    {
      text: 'きょう ちょっと つかれちゃった…',
      choices: [
        { label: 'はやめに ねる', response: 'ぐっすり やすめそう', score: 90, trait: 'calm' },
        { label: 'すこし やすんでから がんばる', response: 'むりせず ちょうどいいね', score: 70, trait: 'calm' },
        { label: 'がまんして がんばりつづける', response: 'むりは きんもつだよ…', score: 30, trait: 'brave' },
        { label: 'あたたかい おふろに はいる', response: 'つかれが とけていくね', score: 85, trait: 'gentle' },
      ],
    },
    {
      text: 'かいものに いったら、レジで さいふを わすれたことに きづいた。',
      choices: [
        { label: 'てんいんに しょうじきに つたえる', response: 'せいじつな たいおう、りっぱだね', score: 85, trait: 'brave' },
        { label: 'こっそり にげる', response: 'それは だめだよ…', score: 20, trait: 'wild' },
        { label: 'けいたいで かぞくに れんらくする', response: 'たよれる ひとが いて よかったね', score: 70, trait: 'gentle' },
        { label: 'つぎに もってくる ことを やくそくする', response: 'てんいんさんも わかってくれたね', score: 75, trait: 'calm' },
      ],
    },
    // --- シリアス ---
    {
      text: 'ずっと がんばってきたことが、うまくいかなかった。',
      choices: [
        { label: 'なみだを ふいて、またはじめから やりなおす', response: 'その つよさが、きっと みらいを かえる', score: 95, trait: 'brave' },
        { label: 'どうしてなのか、しずかに かんがえる', response: 'こたえは まだ みつからないけど…', score: 75, trait: 'calm' },
        { label: 'もう なにも かんがえたくない', response: 'たまには やすんでも いいんだよ', score: 35, trait: 'wild' },
        { label: 'しっぱいから まなぼうと する', response: 'その しせいが、つぎに つながるよ', score: 88, trait: 'brave' },
      ],
    },
    {
      text: 'たいせつな なにかを、うしなってしまった。',
      choices: [
        { label: 'かなしみを うけとめて、まえを むく', response: 'その きもち、わすれなくて いいんだよ', score: 90, trait: 'gentle' },
        { label: 'だれかに きもちを はなす', response: 'ひとりじゃ ないって おもえたね', score: 80, trait: 'gentle' },
        { label: 'なかったことに しようとする', response: 'むりに わすれなくても だいじょうぶ', score: 30, trait: 'wild' },
        { label: 'しずかに なみだを ながす', response: 'なくのも、こころの だいじな しょほう', score: 85, trait: 'gentle' },
      ],
    },
    {
      text: 'じぶんの いきる いみって、なんだろう。ふと そんなことを かんがえた。',
      choices: [
        { label: 'こたえは ひとつじゃないと きづく', response: 'そのとおり。きみの ものがたりは、きみだけの もの', score: 90, trait: 'calm' },
        { label: 'みらいの じぶんに きいてみる', response: 'いつか こたえが みえてくるかも', score: 75, trait: 'calm' },
        { label: 'かんがえるのを やめる', response: 'たまには そういう ひも あるよね', score: 40, trait: 'wild' },
        { label: 'いま この しゅんかんを たいせつに する', response: 'それこそが、いちばんの こたえ かもしれない', score: 88, trait: 'gentle' },
      ],
    },
    {
      text: 'みんなが すすむ みちと、じぶんの きもちが ちがう きがする。',
      choices: [
        { label: 'じぶんの こえを しんじて すすむ', response: 'その ゆうきが、みちを ひらくよ', score: 90, trait: 'brave' },
        { label: 'もうすこし かんがえる じかんを もつ', response: 'あわてなくても だいじょうぶ', score: 75, trait: 'calm' },
        { label: 'みんなに あわせておく', response: 'それも ひとつの えらびかた', score: 45, trait: 'wild' },
        { label: 'しんらいできる ひとに そうだんする', response: 'ひとりで かかえなくて いいんだよ', score: 85, trait: 'gentle' },
      ],
    },
    {
      text: 'もう にどと あえない ひとが いる。ふと おもいだす よるが ある。',
      choices: [
        { label: 'おもいでを たいせつに しまっておく', response: 'その おもいでは、きえたりしないよ', score: 90, trait: 'gentle' },
        { label: 'つたえられなかった かんしゃを くやむ', response: 'いまからでも、こころの なかで つたえられるよ', score: 65, trait: 'gentle' },
        { label: 'かんがえないように する', response: 'むりせず、じぶんの ペースで いいんだよ', score: 35, trait: 'wild' },
        { label: 'そのひとの ぶんまで げんきに いきようと おもう', response: 'それは、すてきな くようの かたち', score: 88, trait: 'brave' },
      ],
    },
    {
      text: 'あしたが こなければいいのに、と おもう よるが ある。',
      choices: [
        { label: 'その きもちを、だれかに はなしてみる', response: 'ひとりで かかえなくて いいんだよ', score: 90, trait: 'gentle' },
        { label: 'あさまで ただ じっと まつ', response: 'よるは、いつか あけるから', score: 60, trait: 'calm' },
        { label: 'なにも かんがえずに ねむる', response: 'ゆっくり やすんでね', score: 55, trait: 'calm' },
        { label: 'すきな ものがたりを よんで きを まぎらわす', response: 'こころが すこし かるく なったかな', score: 75, trait: 'gentle' },
      ],
    },
    {
      text: 'いっしょうけんめい がんばったのに、だれにも きづいてもらえなかった。',
      choices: [
        { label: 'じぶんで じぶんを ほめる', response: 'その りっぱな こころが、きみを ささえるよ', score: 85, trait: 'brave' },
        { label: 'すこし さみしく なる', response: 'その きもちも、しぜんな ことだよ', score: 70, trait: 'gentle' },
        { label: 'もう がんばるのを やめようと おもう', response: 'つかれた ときは、やすんで いいんだよ', score: 35, trait: 'wild' },
        { label: 'いつか だれかが きづいてくれると しんじる', response: 'その しんねんが、きっと みちを てらすよ', score: 80, trait: 'calm' },
      ],
    },
    // --- 大人っぽい ---
    {
      text: 'あしたは だいじな しごとの ひ。きんちょうで ねむれない…',
      choices: [
        { label: 'じゅんびは できてる。じぶんを しんじる', response: 'その じしんが、きっと ちからに なる', score: 90, trait: 'brave' },
        { label: 'なんども だんどりを かくにんしてしまう', response: 'まじめだね。でも たまには きゅうけいも', score: 70, trait: 'calm' },
        { label: 'かんがえるのを やめて スマホを みる', response: 'げんじつ とうひも、たまには ひつよう', score: 45, trait: 'wild' },
        { label: 'はやめに ふとんに はいって めを とじる', response: 'リラックスも たいせつな じゅんび', score: 80, trait: 'calm' },
      ],
    },
    {
      text: 'きゅうりょうびまえで、さいふの なかが さみしい。',
      choices: [
        { label: 'つぎの げつまつまで けいかくを たてる', response: 'その りせいてきさ、みならいたい', score: 85, trait: 'calm' },
        { label: 'すこしだけ ぜいたくして じぶんに ごほうび', response: 'たまには いいよね', score: 65, trait: 'wild' },
        { label: 'みなかったことに して つかっちゃう', response: 'あとで こうかいしても しらないよ…', score: 30, trait: 'wild' },
        { label: 'いえに ある もので すごす', response: 'くふうする ちから、すごいね', score: 80, trait: 'calm' },
      ],
    },
    {
      text: 'かいぎで、じぶんの いけんと まわりの いけんが ぶつかった。',
      choices: [
        { label: 'れいせいに、じぶんの かんがえを つたえる', response: 'おとなの たいおう、かっこいいね', score: 90, trait: 'calm' },
        { label: 'あいての いいぶんも きいてみる', response: 'そのバランスかんかく、だいじだね', score: 85, trait: 'gentle' },
        { label: 'めんどうだから だまっておく', response: 'それも ひとつの せんたく', score: 40, trait: 'wild' },
        { label: 'いちど もちかえって かんがえる', response: 'あわてない、その よゆう だいじだね', score: 80, trait: 'calm' },
      ],
    },
    {
      text: 'ふと、じぶんの しょうらいの ことを かんがえてしまう よるが ある。',
      choices: [
        { label: 'すこしずつ ちょきんを はじめる', response: 'みらいの じぶんが よろこぶよ', score: 85, trait: 'calm' },
        { label: 'かんがえても しかたないから いまを たのしむ', response: 'それも ひとつの いきかた', score: 65, trait: 'wild' },
        { label: 'かんがえたくなくて めを そらす', response: 'いつか むきあう ひが くるかも', score: 35, trait: 'wild' },
        { label: 'あたらしい スキルを べんきょうしはじめる', response: 'みらいへの とうし、すてきだね', score: 88, trait: 'brave' },
      ],
    },
    {
      text: 'こうはいから、しんけんな そうだんを もちかけられた。',
      choices: [
        { label: 'じっくり はなしを きいて アドバイスする', response: 'たよりに されてるね', score: 90, trait: 'gentle' },
        { label: 'じぶんの けいけんを シェアする', response: 'それも りっぱな サポート', score: 75, trait: 'gentle' },
        { label: 'めんどうだと おもいつつ うなずいておく', response: 'せめて きくしせいは だいじだよ', score: 40, trait: 'wild' },
        { label: 'いっしょに かいけつさくを かんがえる', response: 'こころ強い せんぱいだね', score: 88, trait: 'gentle' },
      ],
    },
    {
      text: 'ふと、じぶんの おやの としを かんがえてしまった。',
      choices: [
        { label: 'こんど れんらくしてみようと きめる', response: 'その きもち、つたわると いいね', score: 90, trait: 'gentle' },
        { label: 'かんしゃの きもちが わいてくる', response: 'そのきもち、たいせつに', score: 85, trait: 'gentle' },
        { label: 'いそがしくて わすれてしまう', response: 'ふと おもいだした いまが チャンスかも', score: 40, trait: 'wild' },
        { label: 'しゃしんを みかえして きもちに ひたる', response: 'そのじかんも、たいせつな くよう', score: 75, trait: 'gentle' },
      ],
    },
    {
      text: 'ながねん つとめた しごとを、やめる ひが きた。',
      choices: [
        { label: 'せいせいと わかれを つげる', response: 'つぎの いっぽへ、じしんを もって', score: 85, trait: 'brave' },
        { label: 'なかまとの おもいでに ひたる', response: 'その きずなは、きえないよ', score: 80, trait: 'gentle' },
        { label: 'ふあんで いっぱいに なる', response: 'あたらしい みちには、ふあんも つきものだね', score: 50, trait: 'wild' },
        { label: 'これからの けいかくを たてはじめる', response: 'まえむきな いっぽ、いいね', score: 88, trait: 'calm' },
      ],
    },
    // --- 馬鹿らしい ---
    {
      text: 'めのまえに、たいやきが あらわれた!なぜか しゃべる。',
      choices: [
        { label: 'たいやきと ともだちに なる', response: 'あんこの なかまが ふえたね', score: 80, trait: 'gentle' },
        { label: 'とりあえず たべる', response: 'ちょっと ざんこくだけど…おいしかった?', score: 60, trait: 'wild' },
        { label: 'さけぶ', response: 'たいやきも びっくりしてる', score: 40, trait: 'wild' },
        { label: 'いっしょに さんぽに でかける', response: 'へんな コンビの たんじょうだ', score: 70, trait: 'wild' },
      ],
    },
    {
      text: 'そらから いきなり バナナが ふってきた。',
      choices: [
        { label: 'かさがわりに する', response: 'あたらしい はつめいかも しれない', score: 70, trait: 'wild' },
        { label: 'みんなに くばる', response: 'バナナパーティーの はじまりだ', score: 85, trait: 'gentle' },
        { label: 'ふまないように そっと よける', response: 'けんめいな はんだん', score: 55, trait: 'calm' },
        { label: 'たべて エネルギーほきゅう', response: 'バナナパワー じゅうてん!', score: 75, trait: 'wild' },
      ],
    },
    {
      text: 'あさおきたら、じぶんの あたまが キャベツに なっていた。',
      choices: [
        { label: 'きにせず いつもどおり すごす', response: 'その どきょう、すごい', score: 75, trait: 'brave' },
        { label: 'ぼうしを かぶって かくす', response: 'さくせん せいこう?', score: 65, trait: 'calm' },
        { label: 'サラダに されないか しんぱいする', response: 'きもちは わかる', score: 50, trait: 'wild' },
        { label: 'びょういんに いくか なやむ', response: 'しんちょうな はんだんだね', score: 60, trait: 'calm' },
      ],
    },
    {
      text: 'ペットが きゅうに にんげんの ことばで はなしかけてきた。',
      choices: [
        { label: 'ふつうに かいわを たのしむ', response: 'あたらしい なかまとの かいわ、たのしそう', score: 85, trait: 'gentle' },
        { label: 'びっくりして こしを ぬかす', response: 'むりも ないね', score: 55, trait: 'wild' },
        { label: 'ゆめだと おもって もういちど ねる', response: 'げんじつだったら どうしよう', score: 60, trait: 'calm' },
        { label: 'なにか おねがいごとを きいてみる', response: 'ちゃっかりしてるね', score: 70, trait: 'wild' },
      ],
    },
    {
      text: 'せかいが きゅうに ぜんぶ プリンに なってしまった。',
      choices: [
        { label: 'よろこんで たべまくる', response: 'あまい せかい、さいこう', score: 80, trait: 'wild' },
        { label: 'もったいなくて どうしようか なやむ', response: 'なやんでいるうちに とけちゃうかも', score: 60, trait: 'calm' },
        { label: 'もとに もどす ほうほうを さがす', response: 'けんきゅうしゃの すじが あるかも', score: 65, trait: 'calm' },
        { label: 'プリンの うえで ジャンプする', response: 'むじゃきで たのしそう', score: 70, trait: 'wild' },
      ],
    },
    {
      text: 'みぎあしと ひだりあしが、けんかを はじめてしまった。',
      choices: [
        { label: 'なかなおりさせる', response: 'へいわが もどったね', score: 75, trait: 'gentle' },
        { label: 'そのまま けんかを みまもる', response: 'あしあと、じぐざぐに なってるよ', score: 45, trait: 'calm' },
        { label: 'みてみぬふりを する', response: 'あしあと そのまま すすもう', score: 55, trait: 'wild' },
        { label: 'りょうほうに ごほうびを あげる', response: 'こうへいな かいけつほうだね', score: 65, trait: 'gentle' },
      ],
    },
    {
      text: 'じぶんの かげが、きゅうに かってに うごきだした。',
      choices: [
        { label: 'かげと おいかけっこ する', response: 'たいへんな うんどうに なったね', score: 75, trait: 'wild' },
        { label: 'かげに はなしかける', response: 'どんな へんじが かえって きたかな', score: 70, trait: 'wild' },
        { label: 'びっくりして うごけなく なる', response: 'むりも ないね', score: 50, trait: 'calm' },
        { label: 'かげと いっしょに おどる', response: 'ふたりの あいぼう、たんじょう', score: 80, trait: 'wild' },
      ],
    },
    // --- ラブロマンス的 ---
    {
      text: 'きになる ひとと めが あった。しゅんかん、じかんが とまった きが した。',
      choices: [
        { label: 'おもいきって わらいかけてみる', response: 'せかいが きゅうに いろづいて みえたね', score: 90, trait: 'romantic' },
        { label: 'どきどきして めを そらしてしまう', response: 'その きもちも、りっぱな こいの はじまり', score: 70, trait: 'romantic' },
        { label: 'きのせいだと じぶんに いいきかせる', response: 'ほんとうに、そうかな?', score: 45, trait: 'calm' },
        { label: 'しぜんに あいさつを する', response: 'その いっぽが、なにかを かえるかも', score: 80, trait: 'brave' },
      ],
    },
    {
      text: 'たいせつな ひとに、きもちを つたえる ひが きた。',
      choices: [
        { label: 'まっすぐ きもちを ことばに する', response: 'その ゆうき、いつまでも おぼえておいて', score: 95, trait: 'romantic' },
        { label: 'てがみに かいて わたす', response: 'ことばには できない おもいも、とどくよ', score: 85, trait: 'romantic' },
        { label: 'けっきょく いえずに おわる', response: 'つぎの チャンスは、きっと くる', score: 40, trait: 'calm' },
        { label: 'ともだちに せなかを おしてもらう', response: 'だれかの ちからを かりるのも ゆうき', score: 80, trait: 'gentle' },
      ],
    },
    {
      text: 'あめの ひ、かさを わすれた ひとに かさを さしだされた。',
      choices: [
        { label: 'どきどきしながら いっしょに あるく', response: 'あめさえも、うつくしく みえる しゅんかん', score: 90, trait: 'romantic' },
        { label: 'おれいを いって わかれる', response: 'その やさしさは、きっと わすれない', score: 65, trait: 'calm' },
        { label: 'えんりょして ことわる', response: 'ちょっと もったいなかったかも?', score: 40, trait: 'wild' },
        { label: 'かさを いっしょに もつ ていあんを する', response: 'きょりが ちかづく しゅんかんだね', score: 85, trait: 'romantic' },
      ],
    },
    {
      text: 'むかしの こいびとから、ふいに れんらくが きた。',
      choices: [
        { label: 'なつかしさに ほほえんで へんじを する', response: 'おもいでは、やさしく こころに のこってる', score: 80, trait: 'romantic' },
        { label: 'すこし まよってから へんじする', response: 'そのまよいも、しぜんな きもち', score: 70, trait: 'calm' },
        { label: 'みなかったことに する', response: 'いまの じぶんを だいじに するのも だいじ', score: 50, trait: 'wild' },
        { label: 'いまの きもちを しょうじきに つたえる', response: 'せいじつさが、いちばん つたわるよ', score: 88, trait: 'gentle' },
      ],
    },
    {
      text: 'ふたりで みた ゆうやけが、わすれられないほど きれいだった。',
      choices: [
        { label: 'この しゅんかんを、いつまでも おぼえておこうと おもう', response: 'その きもちが、いちばんの たからもの', score: 90, trait: 'romantic' },
        { label: 'しゃしんに とって のこす', response: 'きろくも、また すてきな しゅだん', score: 80, trait: 'calm' },
        { label: 'とくに なにも かんじない', response: 'ひとそれぞれ、かんじかたは ちがうよね', score: 50, trait: 'wild' },
        { label: 'となりの ひとの よこがおを ちらっと みる', response: 'その どきどきも、たからものだね', score: 85, trait: 'romantic' },
      ],
    },
    {
      text: 'ずっと そばに いてくれた ひとの ありがたみに、ふと きづいた。',
      choices: [
        { label: 'すなおに 「ありがとう」と つたえる', response: 'その ひとことが、なによりの プレゼント', score: 95, trait: 'gentle' },
        { label: 'こんど なにか おかえしを しようと きめる', response: 'きもちが かたちに なると うれしいね', score: 80, trait: 'gentle' },
        { label: 'きづいたけど、なんとなく いいそびれる', response: 'つたえるのに、おそすぎることは ないよ', score: 45, trait: 'wild' },
        { label: 'てがみを かいて わたす', response: 'ことばに した きもちは、ずっと のこるよ', score: 90, trait: 'romantic' },
      ],
    },
    {
      text: 'けっこんしきで、ゆうじんの スピーチに ないてしまった。',
      choices: [
        { label: 'なみだを かくさず ながす', response: 'その すなおさが、うつくしいね', score: 90, trait: 'romantic' },
        { label: 'こっそり なみだを ふく', response: 'やさしい きもちが つたわってくるよ', score: 75, trait: 'gentle' },
        { label: 'わらって ごまかす', response: 'てれかくしも、かわいいね', score: 50, trait: 'wild' },
        { label: 'あとで てがみを かこうと きめる', response: 'きもちを かたちに するのは すてきだね', score: 85, trait: 'romantic' },
      ],
    },
    // --- 感動 ---
    {
      text: 'そだてた いえの こどもが、きょう ひとりだちして いえを でていった。',
      choices: [
        { label: 'げんかんで、みえなくなるまで てを ふりつづけた', response: 'その せなかを、いつまでも おうえんしてるよ', score: 95, trait: 'gentle' },
        { label: 'へやに のこった においを かいで、なみだが こぼれた', response: 'その あいじょうは、ちゃんと とどいていたよ', score: 90, trait: 'romantic' },
        { label: 'さみしさを かくして、げんきに おくりだした', response: 'その つよさこそ、あいの かたちだね', score: 85, trait: 'brave' },
        { label: 'けいたいに 「げんきでね」と メッセージを おくった', response: 'ことばに した きもち、きっと とどくよ', score: 88, trait: 'gentle' },
      ],
    },
    {
      text: 'むかし かってた ペットが てんごくへ いった ひの ことを、ふと おもいだした。',
      choices: [
        { label: 'しゃしんを みながら、いっしょに すごした じかんに かんしゃした', response: 'その おもいでは、いつまでも きえないよ', score: 92, trait: 'gentle' },
        { label: 'こえに だして「ありがとう」と つぶやいた', response: 'その ことば、きっと とどいているよ', score: 90, trait: 'gentle' },
        { label: 'なみだが とまらなく なった', response: 'なくほど あいした あかし だね', score: 88, trait: 'romantic' },
        { label: 'あたらしい いのちを だいじに しようと ちかった', response: 'その きもちが、めぐりめぐって いくんだね', score: 85, trait: 'brave' },
      ],
    },
    {
      text: 'びょういんの ベッドで、かぞくが てを にぎってくれていた ときの ことを おもいだす。',
      choices: [
        { label: 'あのときの あたたかさを、いまも わすれない', response: 'その てのひらの ぬくもりは、たからものだね', score: 93, trait: 'gentle' },
        { label: 'じぶんも だれかの ささえに なろうと おもった', response: 'うけとった あいを、つなげていくんだね', score: 90, trait: 'brave' },
        { label: 'なにも いえなかったことを、いま こうかいしている', response: 'いまからでも、つたえられる ことは あるよ', score: 70, trait: 'calm' },
        { label: 'あのひとに もういちど あいたいと おもう', response: 'その おもいは、きっと とどいているよ', score: 85, trait: 'romantic' },
      ],
    },
    {
      text: 'ずっと けんかしていた きょうだいから、ひさしぶりに れんらくが きた。',
      choices: [
        { label: 'なにも なかったかのように へんじする', response: 'そのやさしさが、きずなを むすびなおすね', score: 85, trait: 'gentle' },
        { label: 'なみだ ながら でんわに でる', response: 'がまんしていた きもちが、あふれたんだね', score: 90, trait: 'romantic' },
        { label: 'すぐには へんじ できず、しばらく かんがえこんだ', response: 'そのじかんも、たいせつな プロセスだよ', score: 75, trait: 'calm' },
        { label: '「げんき?」の ひとことに、すべての わだかまりが とけた', response: 'たったひとことで、こころは つながるんだね', score: 92, trait: 'gentle' },
      ],
    },
    {
      text: 'そつぎょうしきで、せんせいが「きみたちを ほこりに おもう」と いってくれた。',
      choices: [
        { label: 'こらえきれず なみだが あふれた', response: 'その ことばは、いつまでも こころに のこるね', score: 93, trait: 'romantic' },
        { label: 'せんせいに ふかく あたまを さげた', response: 'そのかんしゃの きもち、つたわったはず', score: 88, trait: 'brave' },
        { label: 'みんなと がっしょうして よろこびを わかちあった', response: 'その いったいかん、かけがえの ない しゅんかんだね', score: 90, trait: 'gentle' },
        { label: 'いままでの ひびを、いっきに おもいだした', response: 'つみかさねた じかんが、むねに せまるね', score: 85, trait: 'calm' },
      ],
    },
  ];

  // a shuffled, no-immediate-repeat draw over an arbitrary index list - used
  // both for the quiz question pools below and reused by other games that
  // want fair "see everything before repeating" random picks
  function makeShuffledDraw(indices) {
    let queue = [];
    let lastIndex = -1;
    function refill() {
      queue = indices.slice();
      for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
      }
      if (queue.length > 1 && queue[queue.length - 1] === lastIndex) {
        [queue[0], queue[queue.length - 1]] = [queue[queue.length - 1], queue[0]];
      }
    }
    return function next() {
      if (queue.length === 0) refill();
      const idx = queue.pop();
      lastIndex = idx;
      return idx;
    };
  }

  // ふつう/シリアス/大人っぽい/馬鹿らしい/ラブロマンス的/感動, in the order
  // they appear in QUIZ_QUESTIONS above (7,7,7,7,7,5 questions respectively)
  const QUIZ_CATEGORY_RANGES = {
    normal: [0, 7],
    serious: [7, 14],
    adult: [14, 21],
    silly: [21, 28],
    romance: [28, 35],
    touching: [35, 40],
  };

  function categoryIndices(rangeKey) {
    if (rangeKey === 'all') return QUIZ_QUESTIONS.map((_, i) => i);
    const [start, end] = QUIZ_CATEGORY_RANGES[rangeKey];
    return Array.from({ length: end - start }, (_, i) => start + i);
  }

  const TRAIT_IMPACT = {
    gentle: { emoji: '🌸', color: '#ffb3d9' },
    wild: { emoji: '🎉', color: '#ffd43b' },
    calm: { emoji: '💧', color: '#74c0fc' },
    brave: { emoji: '⚡', color: '#ffa94d' },
    romantic: { emoji: '💖', color: '#ff8787' },
  };

  // shared factory behind every manga-quiz variant - only which slice of
  // QUIZ_QUESTIONS it draws from (and its title) changes between variants
  function makeQuizGame(rangeKey, title) {
    const nextIndex = makeShuffledDraw(categoryIndices(rangeKey));
    return {
      start(container, onComplete) {
        const q = QUIZ_QUESTIONS[nextIndex()];

        container.innerHTML = `
          <div class="mg-title">${title}</div>
          <div class="mg-comic-panel">
            <div class="mg-comic-face">🐣</div>
            <div class="mg-comic-bubble" id="mgBubble"></div>
          </div>
          <div class="mg-choices" id="mgChoices"></div>
        `;

        const bubble = container.querySelector('#mgBubble');
        const choicesEl = container.querySelector('#mgChoices');
        bubble.textContent = q.text;

        let answered = false;

        q.choices.forEach((choice) => {
          const btn = document.createElement('button');
          btn.className = 'mg-choice-btn';
          btn.textContent = choice.label;
          btn.addEventListener('pointerdown', () => {
            // a near-simultaneous second tap (e.g. a stray touch point hitting an
            // adjacent choice) must not double-apply its reward, so this guard
            // has to run before anything else - disabling the buttons alone
            // doesn't stop an event that's already in flight when the tap lands.
            if (answered) return;
            answered = true;
            state.traitCounts[choice.trait] = (state.traitCounts[choice.trait] || 0) + 1;

            // a short, punchy flash moment instead of a lingering second
            // screen - the choice's response text becomes the normal status
            // message once back on the main screen, where it gets its own
            // guaranteed display time (see setMessage)
            const impact = TRAIT_IMPACT[choice.trait] || TRAIT_IMPACT.calm;
            container.innerHTML = `
              <div class="mg-impact-flash" style="background: radial-gradient(circle, ${impact.color} 0%, transparent 72%)">
                <div class="mg-impact-emoji">${impact.emoji}</div>
              </div>
            `;
            setTimeout(() => onComplete(choice.score, choice.response), 420);
          });
          choicesEl.appendChild(btn);
        });
      },
    };
  }

  const QUIZ_GAME_VARIANTS = [
    makeQuizGame('all', 'なおとっちが はなしかけてきた'),
    makeQuizGame('normal', 'なおとっちが ふつうの はなしを してきた'),
    makeQuizGame('serious', 'なおとっちが しんけんな かおを している…'),
    makeQuizGame('adult', 'なおとっちが おとなびた はなしを してきた'),
    makeQuizGame('silly', 'なおとっちが へんなことを いいだした!'),
    makeQuizGame('romance', 'なおとっちが きゅうに ロマンチックに なった'),
    makeQuizGame('touching', 'なおとっちが しみじみと かたりはじめた…'),
  ];

  // shared factory behind every memory-sequence minigame - only the title
  // and pad theme (colors, with an optional emoji shown on each pad) change
  // between variants
  function makeMemoryGame({ title, pads: padDefs }) {
    return {
    start(container, onComplete) {
      const difficulty = ageDifficulty();
      const sequenceLength = Math.round(lerp(3, 8, difficulty));
      const flashMs = lerp(600, 300, difficulty);
      const gapMs = lerp(250, 120, difficulty);
      const PAD_COLORS = padDefs.map((p) => p.bg);

      container.innerHTML = `
        <div class="mg-header">
          <span id="mgRound">おぼえて まねしよう</span>
          <span id="mgScore">${sequenceLength}こ の れつ</span>
        </div>
        <div class="mg-title">${title}</div>
        <div class="mg-memory-grid" id="mgGrid">
          ${padDefs.map((p, i) => `<div class="mg-memory-pad" id="mgPad${i}" style="background:${p.bg}">${p.emoji || ''}</div>`).join('')}
        </div>
      `;

      const pads = PAD_COLORS.map((_, i) => container.querySelector(`#mgPad${i}`));
      const roundEl = container.querySelector('#mgRound');
      const sequence = Array.from({ length: sequenceLength }, () => Math.floor(Math.random() * PAD_COLORS.length));
      let playerIndex = 0;
      let accepting = false;

      function flashPad(i) {
        return new Promise((resolve) => {
          pads[i].classList.add('lit');
          setTimeout(() => {
            pads[i].classList.remove('lit');
            setTimeout(resolve, gapMs);
          }, flashMs);
        });
      }

      async function playSequence() {
        accepting = false;
        roundEl.textContent = 'よく みてね…';
        for (const i of sequence) {
          await flashPad(i);
        }
        roundEl.textContent = 'じゅんばんに タップ!';
        accepting = true;
      }

      function onPadTap(i) {
        if (!accepting) return;
        if (i === sequence[playerIndex]) {
          pads[i].classList.add('lit');
          setTimeout(() => pads[i].classList.remove('lit'), 150);
          playerIndex += 1;
          if (playerIndex >= sequence.length) {
            accepting = false;
            onComplete(100);
          }
        } else {
          accepting = false;
          const score = Math.round((playerIndex / sequence.length) * 100);
          pads.forEach((p) => p.classList.add('wrong'));
          setTimeout(() => onComplete(score), 400);
        }
      }

      pads.forEach((pad, i) => pad.addEventListener('pointerdown', () => onPadTap(i)));
      playSequence();
    },
    };
  }

  const MEMORY_GAME_VARIANTS = [
    makeMemoryGame({
      title: 'じゅんばんを おぼえて タップ!',
      pads: [{ bg: '#ff6b6b' }, { bg: '#4dabf7' }, { bg: '#ffd43b' }, { bg: '#69db7c' }],
    }),
    makeMemoryGame({
      title: 'どうぶつの じゅんばんを おぼえよう!',
      pads: [
        { bg: '#ffd8a8', emoji: '🐶' },
        { bg: '#d0ebff', emoji: '🐱' },
        { bg: '#fff3bf', emoji: '🐥' },
        { bg: '#d3f9d8', emoji: '🐸' },
      ],
    }),
    makeMemoryGame({
      title: 'たべものの じゅんばんを おぼえよう!',
      pads: [
        { bg: '#ffe3e3', emoji: '🍎' },
        { bg: '#fff9db', emoji: '🍌' },
        { bg: '#e7f5ff', emoji: '🍇' },
        { bg: '#eaf7e6', emoji: '🍓' },
      ],
    }),
    makeMemoryGame({
      title: 'きせつの じゅんばんを おぼえよう!',
      pads: [
        { bg: '#ffe0ec', emoji: '🌸' },
        { bg: '#e0fbff', emoji: '🌻' },
        { bg: '#ffe8cc', emoji: '🍁' },
        { bg: '#e7ecff', emoji: '⛄' },
      ],
    }),
  ];

  function mixedMathProblem(difficulty) {
    if (difficulty < 0.34) {
      let a = 1 + Math.floor(Math.random() * 9);
      let b = 1 + Math.floor(Math.random() * 9);
      const op = Math.random() < 0.5 ? '+' : '−';
      if (op === '−' && a < b) [a, b] = [b, a];
      return { text: `${a} ${op} ${b}`, answer: op === '+' ? a + b : a - b };
    }
    if (difficulty < 0.7) {
      if (Math.random() < 0.5) {
        const a = 5 + Math.floor(Math.random() * 25);
        const b = 5 + Math.floor(Math.random() * 25);
        return { text: `${a} + ${b}`, answer: a + b };
      }
      const a = 2 + Math.floor(Math.random() * 9);
      const b = 2 + Math.floor(Math.random() * 9);
      return { text: `${a} × ${b}`, answer: a * b };
    }
    const kind = Math.floor(Math.random() * 3);
    if (kind === 0) {
      const a = 10 + Math.floor(Math.random() * 40);
      const b = 2 + Math.floor(Math.random() * 12);
      const c = 1 + Math.floor(Math.random() * 9);
      return { text: `${a} − ${b} + ${c}`, answer: a - b + c };
    }
    if (kind === 1) {
      const a = 3 + Math.floor(Math.random() * 9);
      const b = 3 + Math.floor(Math.random() * 9);
      const c = 2 + Math.floor(Math.random() * 6);
      return { text: `${a} × ${b} − ${c}`, answer: a * b - c };
    }
    const b = 2 + Math.floor(Math.random() * 9);
    const q = 2 + Math.floor(Math.random() * 12);
    return { text: `${b * q} ÷ ${b}`, answer: q };
  }

  function addMathProblem(difficulty) {
    const max = Math.round(lerp(9, 60, difficulty));
    const a = 1 + Math.floor(Math.random() * max);
    const b = 1 + Math.floor(Math.random() * max);
    return { text: `${a} + ${b}`, answer: a + b };
  }

  function subMathProblem(difficulty) {
    const max = Math.round(lerp(9, 60, difficulty));
    let a = 1 + Math.floor(Math.random() * max);
    let b = 1 + Math.floor(Math.random() * max);
    if (a < b) [a, b] = [b, a];
    return { text: `${a} − ${b}`, answer: a - b };
  }

  function mulMathProblem(difficulty) {
    const max = Math.round(lerp(4, 12, difficulty));
    const a = 2 + Math.floor(Math.random() * max);
    const b = 2 + Math.floor(Math.random() * max);
    return { text: `${a} × ${b}`, answer: a * b };
  }

  function divMathProblem(difficulty) {
    const max = Math.round(lerp(4, 12, difficulty));
    const b = 2 + Math.floor(Math.random() * max);
    const q = 2 + Math.floor(Math.random() * max);
    return { text: `${b * q} ÷ ${b}`, answer: q };
  }

  // shared factory behind every arithmetic minigame - only the title and
  // problem generator (which operation(s) it draws from) change
  function makeMathGame(title, generateProblem) {
    return {
    start(container, onComplete) {
      const difficulty = ageDifficulty();
      const ROUNDS = 3 + Math.round(difficulty * 2);
      const timeLimitMs = lerp(6000, 2200, difficulty);
      let round = 0;
      let correctCount = 0;
      let timer;

      function renderRound() {
        const problem = generateProblem(difficulty);
        const distractors = new Set();
        while (distractors.size < 3) {
          const delta = Math.floor(Math.random() * 9) - 4;
          const candidate = problem.answer + (delta === 0 ? 1 : delta);
          if (candidate !== problem.answer) distractors.add(candidate);
        }
        const choices = [problem.answer, ...distractors];
        for (let i = choices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [choices[i], choices[j]] = [choices[j], choices[i]];
        }

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgRound">もんだい ${round + 1}/${ROUNDS}</span>
            <span id="mgScore">せいかい: ${correctCount}</span>
          </div>
          <div class="mg-title">${title}</div>
          <div class="mg-math-problem">${problem.text} = ?</div>
          <div class="mg-math-choices">
            ${choices.map((c) => `<button class="mg-math-btn" data-val="${c}">${c}</button>`).join('')}
          </div>
        `;

        const buttons = Array.from(container.querySelectorAll('.mg-math-btn'));
        let answered = false;

        function finishRound(correct) {
          if (answered) return;
          answered = true;
          clearTimeout(timer);
          if (correct) correctCount += 1;
          round += 1;
          if (round >= ROUNDS) {
            const score = Math.round((correctCount / ROUNDS) * 100);
            setTimeout(() => onComplete(score), 250);
          } else {
            setTimeout(renderRound, 250);
          }
        }

        buttons.forEach((btn) => {
          btn.addEventListener('pointerdown', () => finishRound(Number(btn.dataset.val) === problem.answer));
        });

        timer = setTimeout(() => finishRound(false), timeLimitMs);
      }

      renderRound();
    },
    };
  }

  const MATH_GAME_VARIANTS = [
    makeMathGame('けいさんチャレンジ!', mixedMathProblem),
    makeMathGame('たしざんチャレンジ!', addMathProblem),
    makeMathGame('ひきざんチャレンジ!', subMathProblem),
    makeMathGame('かけざんチャレンジ!', mulMathProblem),
    makeMathGame('わりざんチャレンジ!', divMathProblem),
  ];

  // shared factory behind every reaction-time minigame - only the title and
  // wait/go/fail wording change between variants
  function makeReactionGame({ title, waitWord, goWord, tooSoonWord }) {
    return {
    start(container, onComplete) {
      const difficulty = ageDifficulty();
      const ROUNDS = 3;
      const goodMs = lerp(550, 280, difficulty);
      const okMs = lerp(900, 500, difficulty);
      const results = [];
      let round = 0;

      function renderWait() {
        const avg = results.length ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : 0;
        container.innerHTML = `
          <div class="mg-header">
            <span id="mgRound">ラウンド ${round + 1}/${ROUNDS}</span>
            <span id="mgScore">とくてん: ${avg}</span>
          </div>
          <div class="mg-title">${title}</div>
          <div class="mg-reaction-field mg-reaction-wait" id="mgReactionField">${waitWord}</div>
        `;
        const field = container.querySelector('#mgReactionField');
        let goTime = null;
        let handled = false;
        const delay = 1000 + Math.random() * 2500;
        let goTimer;

        function onEarlyTap() {
          if (handled) return;
          handled = true;
          clearTimeout(goTimer);
          field.removeEventListener('pointerdown', onEarlyTap);
          field.classList.remove('mg-reaction-wait');
          field.classList.add('mg-reaction-fail');
          field.textContent = tooSoonWord;
          setTimeout(() => nextRound(0), 700);
        }
        field.addEventListener('pointerdown', onEarlyTap);

        function onGoTap() {
          if (handled) return;
          handled = true;
          field.removeEventListener('pointerdown', onGoTap);
          const reactionMs = performance.now() - goTime;
          let roundScore;
          if (reactionMs <= goodMs) roundScore = 100;
          else if (reactionMs <= okMs) roundScore = Math.round(lerp(100, 40, (reactionMs - goodMs) / (okMs - goodMs)));
          else roundScore = 15;
          field.textContent = `${Math.round(reactionMs)}ms!`;
          setTimeout(() => nextRound(roundScore), 700);
        }

        goTimer = setTimeout(() => {
          field.removeEventListener('pointerdown', onEarlyTap);
          field.classList.remove('mg-reaction-wait');
          field.classList.add('mg-reaction-go');
          field.textContent = goWord;
          goTime = performance.now();
          field.addEventListener('pointerdown', onGoTap);
        }, delay);
      }

      function nextRound(score) {
        results.push(score);
        round += 1;
        if (round >= ROUNDS) {
          onComplete(Math.round(results.reduce((a, b) => a + b, 0) / results.length));
        } else {
          renderWait();
        }
      }

      renderWait();
    },
    };
  }

  const REACTION_GAME_VARIANTS = [
    makeReactionGame({ title: 'はんしゃしんけい チャレンジ!', waitWord: 'まってね…', goWord: 'いま!', tooSoonWord: 'はやすぎ!' }),
    makeReactionGame({ title: 'しゅんぱつりょく チャレンジ!', waitWord: 'じゅんび…', goWord: 'ダッシュ!', tooSoonWord: 'フライング!' }),
  ];

  const stroopGame = {
    start(container, onComplete) {
      const difficulty = ageDifficulty();
      const COLOR_DEFS = [
        { key: 'red', label: 'あか', hex: '#e03131' },
        { key: 'blue', label: 'あお', hex: '#1971c2' },
        { key: 'yellow', label: 'きいろ', hex: '#f2c811' },
        { key: 'green', label: 'みどり', hex: '#2f9e44' },
        { key: 'purple', label: 'むらさき', hex: '#9c36b5' },
        { key: 'orange', label: 'オレンジ', hex: '#e8590c' },
      ];
      const activeColors = COLOR_DEFS.slice(0, Math.round(lerp(3, 6, difficulty)));
      const ROUNDS = 4 + Math.round(difficulty * 2);
      const timeLimitMs = lerp(4500, 2000, difficulty);
      let round = 0;
      let correctCount = 0;
      let timer;

      function renderRound() {
        const wordColor = activeColors[Math.floor(Math.random() * activeColors.length)];
        let inkColor;
        do {
          inkColor = activeColors[Math.floor(Math.random() * activeColors.length)];
        } while (activeColors.length > 1 && inkColor.key === wordColor.key);

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgRound">もんだい ${round + 1}/${ROUNDS}</span>
            <span id="mgScore">せいかい: ${correctCount}</span>
          </div>
          <div class="mg-title">もじの「いろ」を えらんでね(いみじゃないよ)</div>
          <div class="mg-stroop-word" style="color:${inkColor.hex}">${wordColor.label}</div>
          <div class="mg-stroop-choices">
            ${activeColors.map((c) => `<button class="mg-stroop-btn" style="background:${c.hex}" data-key="${c.key}" aria-label="${c.label}"></button>`).join('')}
          </div>
        `;

        const buttons = Array.from(container.querySelectorAll('.mg-stroop-btn'));
        let answered = false;

        function finishRound(correct) {
          if (answered) return;
          answered = true;
          clearTimeout(timer);
          if (correct) correctCount += 1;
          round += 1;
          if (round >= ROUNDS) {
            const score = Math.round((correctCount / ROUNDS) * 100);
            setTimeout(() => onComplete(score), 200);
          } else {
            setTimeout(renderRound, 200);
          }
        }

        buttons.forEach((btn) => {
          btn.addEventListener('pointerdown', () => finishRound(btn.dataset.key === inkColor.key));
        });

        timer = setTimeout(() => finishRound(false), timeLimitMs);
      }

      renderRound();
    },
  };

  // numeric-magnitude Stroop: a digit's own value conflicts with how big it
  // is drawn on screen half the time - tap whether it looks big or small,
  // ignoring what the digit actually means
  const numberSizeGame = {
    start(container, onComplete) {
      const difficulty = ageDifficulty();
      const ROUNDS = 4 + Math.round(difficulty * 2);
      const timeLimitMs = lerp(4500, 2000, difficulty);
      let round = 0;
      let correctCount = 0;
      let timer;

      function renderRound() {
        const digit = 1 + Math.floor(Math.random() * 9);
        const isBig = Math.random() < 0.5;
        const fontSize = isBig ? 64 : 22;

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgRound">もんだい ${round + 1}/${ROUNDS}</span>
            <span id="mgScore">せいかい: ${correctCount}</span>
          </div>
          <div class="mg-title">すうじの おおきさは?(かずの おおきさじゃないよ)</div>
          <div class="mg-stroop-word" style="font-size:${fontSize}px">${digit}</div>
          <div class="mg-math-choices">
            <button class="mg-math-btn" data-val="big">おおきい</button>
            <button class="mg-math-btn" data-val="small">ちいさい</button>
          </div>
        `;

        const buttons = Array.from(container.querySelectorAll('.mg-math-btn'));
        let answered = false;

        function finishRound(correct) {
          if (answered) return;
          answered = true;
          clearTimeout(timer);
          if (correct) correctCount += 1;
          round += 1;
          if (round >= ROUNDS) {
            const score = Math.round((correctCount / ROUNDS) * 100);
            setTimeout(() => onComplete(score), 200);
          } else {
            setTimeout(renderRound, 200);
          }
        }

        buttons.forEach((btn) => {
          btn.addEventListener('pointerdown', () => finishRound((btn.dataset.val === 'big') === isBig));
        });

        timer = setTimeout(() => finishRound(false), timeLimitMs);
      }

      renderRound();
    },
  };

  // directional Stroop: an arrow points one way while a word names a
  // (possibly different) direction - tap where the arrow actually points
  const arrowDirectionGame = {
    start(container, onComplete) {
      const difficulty = ageDifficulty();
      const DIRECTIONS = [
        { key: 'up', label: 'うえ', arrow: '⬆️' },
        { key: 'down', label: 'した', arrow: '⬇️' },
        { key: 'left', label: 'ひだり', arrow: '⬅️' },
        { key: 'right', label: 'みぎ', arrow: '➡️' },
      ];
      const ROUNDS = 4 + Math.round(difficulty * 2);
      const timeLimitMs = lerp(4500, 2000, difficulty);
      let round = 0;
      let correctCount = 0;
      let timer;

      function renderRound() {
        const arrowDir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
        let wordDir;
        do {
          wordDir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
        } while (Math.random() < 0.5 && wordDir.key === arrowDir.key);

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgRound">もんだい ${round + 1}/${ROUNDS}</span>
            <span id="mgScore">せいかい: ${correctCount}</span>
          </div>
          <div class="mg-title">やじるしが むいている ほうこうは?(もじじゃないよ)</div>
          <div class="mg-stroop-word">${arrowDir.arrow}<br><span style="font-size:16px">「${wordDir.label}」</span></div>
          <div class="mg-math-choices">
            ${DIRECTIONS.map((d) => `<button class="mg-math-btn" data-key="${d.key}">${d.label}</button>`).join('')}
          </div>
        `;

        const buttons = Array.from(container.querySelectorAll('.mg-math-btn'));
        let answered = false;

        function finishRound(correct) {
          if (answered) return;
          answered = true;
          clearTimeout(timer);
          if (correct) correctCount += 1;
          round += 1;
          if (round >= ROUNDS) {
            const score = Math.round((correctCount / ROUNDS) * 100);
            setTimeout(() => onComplete(score), 200);
          } else {
            setTimeout(renderRound, 200);
          }
        }

        buttons.forEach((btn) => {
          btn.addEventListener('pointerdown', () => finishRound(btn.dataset.key === arrowDir.key));
        });

        timer = setTimeout(() => finishRound(false), timeLimitMs);
      }

      renderRound();
    },
  };

  const STROOP_GAME_VARIANTS = [stroopGame, numberSizeGame, arrowDirectionGame];

  // --- じゃんけん ---

  const jankenGame = {
    start(container, onComplete) {
      const CHOICES = [
        { key: 'rock', emoji: '✊', label: 'グー' },
        { key: 'scissors', emoji: '✌️', label: 'チョキ' },
        { key: 'paper', emoji: '✋', label: 'パー' },
      ];
      const ROUNDS = 3;
      let round = 0;
      let wins = 0;

      function beats(a, b) {
        return (a === 'rock' && b === 'scissors') || (a === 'scissors' && b === 'paper') || (a === 'paper' && b === 'rock');
      }

      function renderRound() {
        container.innerHTML = `
          <div class="mg-header">
            <span id="mgRound">ラウンド ${round + 1}/${ROUNDS}</span>
            <span id="mgScore">かち: ${wins}</span>
          </div>
          <div class="mg-title">じゃんけん ぽん!</div>
          <div class="mg-math-choices">
            ${CHOICES.map((c) => `<button class="mg-math-btn" data-key="${c.key}">${c.emoji} ${c.label}</button>`).join('')}
          </div>
        `;
        const buttons = Array.from(container.querySelectorAll('.mg-math-btn'));
        let answered = false;

        buttons.forEach((btn) => {
          btn.addEventListener('pointerdown', () => {
            if (answered) return;
            answered = true;
            const playerKey = btn.dataset.key;
            const cpu = CHOICES[Math.floor(Math.random() * CHOICES.length)];
            let outcome;
            if (playerKey === cpu.key) outcome = 'draw';
            else if (beats(playerKey, cpu.key)) outcome = 'win';
            else outcome = 'lose';
            if (outcome === 'win') wins += 1;
            const playerChoice = CHOICES.find((c) => c.key === playerKey);
            container.innerHTML = `
              <div class="mg-title">あなた: ${playerChoice.emoji}　あいて: ${cpu.emoji}</div>
              <div class="mg-title">${outcome === 'win' ? 'かち!' : outcome === 'lose' ? 'まけ…' : 'あいこ'}</div>
            `;
            round += 1;
            setTimeout(() => {
              if (round >= ROUNDS) {
                onComplete(Math.round((wins / ROUNDS) * 100));
              } else {
                renderRound();
              }
            }, 800);
          });
        });
      }

      renderRound();
    },
  };

  const JANKEN_GAME_VARIANTS = [jankenGame];

  // --- 神経衰弱(ペアさがし) ---

  function makeConcentrationGame({ title, emojis }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const pairCount = Math.round(lerp(3, 6, difficulty));
        const chosen = emojis.slice(0, pairCount);
        const deck = [...chosen, ...chosen].map((emoji) => ({ emoji, matched: false }));
        for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        const cols = 4;
        const rows = Math.ceil(deck.length / cols);
        let firstIdx = null;
        let lock = false;
        let matches = 0;
        let mistakes = 0;

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgScore">ペア: 0/${pairCount}</span>
          </div>
          <div class="mg-title">${title}</div>
          <div class="mg-concentration-grid" id="mgGrid" style="grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr);">
            ${deck.map((_, i) => `<div class="mg-concentration-card" data-i="${i}">❓</div>`).join('')}
          </div>
        `;

        const cards = Array.from(container.querySelectorAll('.mg-concentration-card'));
        const scoreEl = container.querySelector('#mgScore');

        cards.forEach((card, i) => {
          card.addEventListener('pointerdown', () => {
            if (lock || deck[i].matched || card.classList.contains('revealed')) return;
            card.classList.add('revealed');
            card.textContent = deck[i].emoji;

            if (firstIdx === null) {
              firstIdx = i;
              return;
            }
            if (firstIdx === i) return;

            lock = true;
            const a = firstIdx;
            const b = i;
            firstIdx = null;

            if (deck[a].emoji === deck[b].emoji) {
              deck[a].matched = true;
              deck[b].matched = true;
              cards[a].classList.add('matched');
              cards[b].classList.add('matched');
              matches += 1;
              scoreEl.textContent = `ペア: ${matches}/${pairCount}`;
              lock = false;
              if (matches >= pairCount) {
                const score = Math.round(clamp(100 - mistakes * 12, 15, 100));
                setTimeout(() => onComplete(score), 300);
              }
            } else {
              mistakes += 1;
              setTimeout(() => {
                cards[a].classList.remove('revealed');
                cards[a].textContent = '❓';
                cards[b].classList.remove('revealed');
                cards[b].textContent = '❓';
                lock = false;
              }, 600);
            }
          });
        });
      },
    };
  }

  const CONCENTRATION_GAME_VARIANTS = [
    makeConcentrationGame({ title: 'くだものの ペアを さがそう!', emojis: ['🍎', '🍌', '🍇', '🍓', '🍊', '🍑'] }),
    makeConcentrationGame({ title: 'どうぶつの ペアを さがそう!', emojis: ['🐶', '🐱', '🐭', '🐸', '🐹', '🐰'] }),
    makeConcentrationGame({ title: 'たべもののペアを さがそう!', emojis: ['🍙', '🍣', '🍕', '🍔', '🍜', '🍰'] }),
  ];

  // --- 連打チャレンジ ---

  function makeMashGame({ title, buttonEmoji }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = 5000;
        const tapsForFull = Math.round(lerp(20, 45, difficulty));
        let taps = 0;
        let running = true;

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgTimer">残り: 5s</span>
            <span id="mgScore">タップ: 0</span>
          </div>
          <div class="mg-title">${title}</div>
          <button class="mg-tap-btn" id="mgMashBtn" style="font-size:40px; padding:20px 40px;">${buttonEmoji}</button>
        `;
        const btn = container.querySelector('#mgMashBtn');
        const timerEl = container.querySelector('#mgTimer');
        const scoreEl = container.querySelector('#mgScore');
        const startTime = performance.now();

        btn.addEventListener('pointerdown', () => {
          if (!running) return;
          taps += 1;
          scoreEl.textContent = `タップ: ${taps}`;
        });

        const interval = setInterval(() => {
          const remaining = Math.max(0, DURATION_MS - (performance.now() - startTime));
          timerEl.textContent = `残り: ${Math.ceil(remaining / 1000)}s`;
          if (remaining <= 0) {
            running = false;
            clearInterval(interval);
            const score = Math.round(clamp((taps / tapsForFull) * 100, 0, 100));
            onComplete(score);
          }
        }, 100);
      },
    };
  }

  const MASH_GAME_VARIANTS = [
    makeMashGame({ title: 'あわを あつめろ!れんだタップ!', buttonEmoji: '🫧' }),
    makeMashGame({ title: 'ほしを あつめろ!れんだタップ!', buttonEmoji: '⭐' }),
  ];

  // --- バランスゲーム ---

  const balanceGame = {
    start(container, onComplete) {
      const difficulty = ageDifficulty();
      const DURATION_MS = 8000;
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
          <span id="mgTimer">残り: 8s</span>
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
        velocity -= nudgeAmount;
      });
      rightBtn.addEventListener('pointerdown', () => {
        velocity += nudgeAmount;
      });

      const startTime = performance.now();

      function frame(now) {
        if (!running) return;
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

  const BALANCE_GAME_VARIANTS = [balanceGame];

  // --- まちがいさがし ---

  function makeOddOneOutGame({ title, pairs }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const GRID_SIZE = Math.round(lerp(9, 20, difficulty));
        const timeLimitMs = lerp(6000, 3200, difficulty);
        const pair = pairs[Math.floor(Math.random() * pairs.length)];
        const oddIndex = Math.floor(Math.random() * GRID_SIZE);
        const cols = 5;
        const rows = Math.ceil(GRID_SIZE / cols);
        let answered = false;
        let timer;

        container.innerHTML = `
          <div class="mg-title">${title}</div>
          <div class="mg-whack-grid" id="mgGrid" style="grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr);">
            ${Array.from({ length: GRID_SIZE }, (_, i) => `<div class="mg-hole" data-i="${i}" style="cursor:pointer;">${i === oddIndex ? pair.odd : pair.common}</div>`).join('')}
          </div>
        `;

        const cells = Array.from(container.querySelectorAll('.mg-hole'));
        cells.forEach((cell) => {
          cell.addEventListener('pointerdown', () => {
            if (answered) return;
            answered = true;
            clearTimeout(timer);
            const correct = Number(cell.dataset.i) === oddIndex;
            onComplete(correct ? 100 : 20);
          });
        });

        timer = setTimeout(() => {
          if (!answered) {
            answered = true;
            onComplete(10);
          }
        }, timeLimitMs);
      },
    };
  }

  const ODD_ONE_OUT_VARIANTS = [
    makeOddOneOutGame({
      title: 'いろが ちがう ものを さがそう!',
      pairs: [
        { common: '🔴', odd: '🟠' },
        { common: '🟢', odd: '🔵' },
        { common: '🟡', odd: '🟤' },
        { common: '🟣', odd: '⚪' },
      ],
    }),
    makeOddOneOutGame({
      title: 'なかまはずれの どうぶつを さがそう!',
      pairs: [
        { common: '🐶', odd: '🐺' },
        { common: '🐱', odd: '🐯' },
        { common: '🐭', odd: '🐹' },
        { common: '🐸', odd: '🐢' },
      ],
    }),
  ];

  // --- すうじならべ ---

  const numberOrderGame = {
    start(container, onComplete) {
      const difficulty = ageDifficulty();
      const COUNT = Math.round(lerp(6, 10, difficulty));
      const targetMs = lerp(6000, 3200, difficulty);
      const numbers = Array.from({ length: COUNT }, (_, i) => i + 1);
      for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
      }
      const cols = 4;
      const rows = Math.ceil(COUNT / cols);
      let next = 1;
      const startTime = performance.now();

      container.innerHTML = `
        <div class="mg-header"><span id="mgScore">つぎ: 1</span></div>
        <div class="mg-title">1から じゅんばんに タップしよう!</div>
        <div class="mg-whack-grid" id="mgGrid" style="grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr);">
          ${numbers.map((n) => `<div class="mg-hole" data-n="${n}" style="cursor:pointer; font-size:20px;">${n}</div>`).join('')}
        </div>
      `;

      const scoreEl = container.querySelector('#mgScore');
      const cells = Array.from(container.querySelectorAll('.mg-hole'));
      cells.forEach((cell) => {
        cell.addEventListener('pointerdown', () => {
          const n = Number(cell.dataset.n);
          if (n !== next) return;
          cell.style.visibility = 'hidden';
          next += 1;
          if (next > COUNT) {
            const elapsed = performance.now() - startTime;
            const score = Math.round(clamp(100 - ((elapsed - targetMs) / targetMs) * 60, 10, 100));
            onComplete(score);
            return;
          }
          scoreEl.textContent = `つぎ: ${next}`;
        });
      });
    },
  };

  const NUMBER_ORDER_VARIANTS = [numberOrderGame];

  // --- くらべっこ(かずくらべ・おおきさくらべ) ---
  // かんがえずに ぱっと 見て こたえられる、いちばん 直感的な なかまの
  // ミニゲーム。せいかい/はずれの 2択だけで、じかんぎれでも すこし
  // てんが はいる(ほかの タイマー系ミニゲームと おなじ さじかげん)

  function makeCountCompareGame({ title, emoji }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const maxCount = Math.round(lerp(6, 14, difficulty));
        const left = 1 + Math.floor(Math.random() * maxCount);
        let right = 1 + Math.floor(Math.random() * maxCount);
        while (right === left) right = 1 + Math.floor(Math.random() * maxCount);
        const timeLimitMs = lerp(5000, 2800, difficulty);
        let answered = false;
        let timer;

        container.innerHTML = `
          <div class="mg-title">${title}</div>
          <div class="mg-compare-row">
            <div class="mg-compare-side" data-side="left">${emoji.repeat(left)}</div>
            <div class="mg-compare-side" data-side="right">${emoji.repeat(right)}</div>
          </div>
        `;

        const sides = Array.from(container.querySelectorAll('.mg-compare-side'));
        sides.forEach((side) => {
          side.addEventListener('pointerdown', () => {
            if (answered) return;
            answered = true;
            clearTimeout(timer);
            const chosenCount = side.dataset.side === 'left' ? left : right;
            onComplete(chosenCount === Math.max(left, right) ? 100 : 20);
          });
        });

        timer = setTimeout(() => {
          if (!answered) {
            answered = true;
            onComplete(10);
          }
        }, timeLimitMs);
      },
    };
  }

  function makeSizeCompareGame({ title, emoji }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        // むずかしいほど 2つの おおきさの さが ちいさくなる
        const sizeDiff = Math.round(lerp(26, 10, difficulty));
        const smallSize = 24 + Math.floor(Math.random() * 10);
        const bigSize = smallSize + sizeDiff;
        const bigIsLeft = Math.random() < 0.5;
        const leftSize = bigIsLeft ? bigSize : smallSize;
        const rightSize = bigIsLeft ? smallSize : bigSize;
        const timeLimitMs = lerp(5000, 2800, difficulty);
        let answered = false;
        let timer;

        container.innerHTML = `
          <div class="mg-title">${title}</div>
          <div class="mg-compare-row">
            <div class="mg-compare-side" data-side="left" style="font-size:${leftSize}px;">${emoji}</div>
            <div class="mg-compare-side" data-side="right" style="font-size:${rightSize}px;">${emoji}</div>
          </div>
        `;

        const sides = Array.from(container.querySelectorAll('.mg-compare-side'));
        sides.forEach((side) => {
          side.addEventListener('pointerdown', () => {
            if (answered) return;
            answered = true;
            clearTimeout(timer);
            const correctSide = bigIsLeft ? 'left' : 'right';
            onComplete(side.dataset.side === correctSide ? 100 : 20);
          });
        });

        timer = setTimeout(() => {
          if (!answered) {
            answered = true;
            onComplete(10);
          }
        }, timeLimitMs);
      },
    };
  }

  const COMPARE_VARIANTS = [
    makeCountCompareGame({ title: 'かずが おおい ほうを タップ!', emoji: '⭐' }),
    makeCountCompareGame({ title: 'かずが おおい ほうを タップ!', emoji: '🍬' }),
    makeSizeCompareGame({ title: 'おおきい ほうを タップ!', emoji: '🍎' }),
    makeSizeCompareGame({ title: 'おおきい ほうを タップ!', emoji: '🐸' }),
  ];

  // --- かたちあわせ ---
  // うえに でた「おてほん」と おなじ かたちの ものを、したの ますめから
  // 1つ さがして タップするだけの、シンプルな パターンマッチ

  function makeShapeMatchGame({ title, shapes }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const GRID_SIZE = Math.round(lerp(6, 12, difficulty));
        const timeLimitMs = lerp(5500, 3200, difficulty);
        const target = shapes[Math.floor(Math.random() * shapes.length)];
        const decoys = shapes.filter((s) => s !== target);
        const correctIndex = Math.floor(Math.random() * GRID_SIZE);
        const grid = Array.from({ length: GRID_SIZE }, (_, i) => (
          i === correctIndex ? target : decoys[Math.floor(Math.random() * decoys.length)]
        ));
        const cols = 4;
        const rows = Math.ceil(GRID_SIZE / cols);
        let answered = false;
        let timer;

        container.innerHTML = `
          <div class="mg-title">${title}</div>
          <div class="mg-shape-target">${target}</div>
          <div class="mg-whack-grid" id="mgGrid" style="grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr);">
            ${grid.map((s, i) => `<div class="mg-hole" data-i="${i}" style="cursor:pointer;">${s}</div>`).join('')}
          </div>
        `;

        const cells = Array.from(container.querySelectorAll('.mg-hole'));
        cells.forEach((cell) => {
          cell.addEventListener('pointerdown', () => {
            if (answered) return;
            answered = true;
            clearTimeout(timer);
            onComplete(Number(cell.dataset.i) === correctIndex ? 100 : 20);
          });
        });

        timer = setTimeout(() => {
          if (!answered) {
            answered = true;
            onComplete(10);
          }
        }, timeLimitMs);
      },
    };
  }

  const SHAPE_MATCH_VARIANTS = [
    makeShapeMatchGame({ title: 'おてほんと おなじ かたちを タップ!', shapes: ['⚫', '⬛', '🔺', '⭐', '❤️', '🔷'] }),
  ];

  // --- シルエットあてクイズ ---

  function makeSilhouetteGame({ title, pool }) {
    return {
      start(container, onComplete) {
        const timeLimitMs = 5000;
        const answer = pool[Math.floor(Math.random() * pool.length)];
        const distractorPool = pool.filter((p) => p.key !== answer.key);
        for (let i = distractorPool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [distractorPool[i], distractorPool[j]] = [distractorPool[j], distractorPool[i]];
        }
        const choices = [answer, ...distractorPool.slice(0, 3)];
        for (let i = choices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [choices[i], choices[j]] = [choices[j], choices[i]];
        }
        let answered = false;
        let timer;

        container.innerHTML = `
          <div class="mg-title">${title}</div>
          <div class="mg-math-problem" style="filter: brightness(0); font-size:56px;">${answer.emoji}</div>
          <div class="mg-math-choices">
            ${choices.map((c) => `<button class="mg-math-btn" data-key="${c.key}">${c.label}</button>`).join('')}
          </div>
        `;

        const buttons = Array.from(container.querySelectorAll('.mg-math-btn'));
        buttons.forEach((btn) => {
          btn.addEventListener('pointerdown', () => {
            if (answered) return;
            answered = true;
            clearTimeout(timer);
            onComplete(btn.dataset.key === answer.key ? 100 : 20);
          });
        });

        timer = setTimeout(() => {
          if (!answered) {
            answered = true;
            onComplete(10);
          }
        }, timeLimitMs);
      },
    };
  }

  const SILHOUETTE_VARIANTS = [
    makeSilhouetteGame({
      title: 'シルエットの どうぶつは だれ?',
      pool: [
        { key: 'dog', emoji: '🐶', label: 'いぬ' },
        { key: 'cat', emoji: '🐱', label: 'ねこ' },
        { key: 'rabbit', emoji: '🐰', label: 'うさぎ' },
        { key: 'bear', emoji: '🐻', label: 'くま' },
        { key: 'panda', emoji: '🐼', label: 'パンダ' },
        { key: 'lion', emoji: '🦁', label: 'ライオン' },
      ],
    }),
    makeSilhouetteGame({
      title: 'シルエットの たべものは なに?',
      pool: [
        { key: 'apple', emoji: '🍎', label: 'りんご' },
        { key: 'banana', emoji: '🍌', label: 'バナナ' },
        { key: 'onigiri', emoji: '🍙', label: 'おにぎり' },
        { key: 'cake', emoji: '🍰', label: 'ケーキ' },
        { key: 'pizza', emoji: '🍕', label: 'ピザ' },
        { key: 'icecream', emoji: '🍦', label: 'アイス' },
      ],
    }),
  ];

  // --- パターンすいりクイズ ---

  function makePatternGame({ title, kind }) {
    return {
      start(container, onComplete) {
        const timeLimitMs = 6000;
        let sequence;
        let answer;
        let distractors;

        if (kind === 'number') {
          const start = 1 + Math.floor(Math.random() * 5);
          const step = 1 + Math.floor(Math.random() * 3);
          sequence = [start, start + step, start + step * 2, start + step * 3];
          answer = start + step * 4;
          distractors = [answer + step, answer - 1, answer + 2].filter((d) => d !== answer);
        } else {
          const COLORS = ['🔴', '🔵', '🟡', '🟢'];
          const patternLen = 2 + Math.floor(Math.random() * 2);
          const cycle = [];
          for (let i = 0; i < patternLen; i++) cycle.push(COLORS[Math.floor(Math.random() * COLORS.length)]);
          sequence = [];
          for (let i = 0; i < 5; i++) sequence.push(cycle[i % patternLen]);
          answer = cycle[5 % patternLen];
          distractors = COLORS.filter((c) => c !== answer);
        }

        const choices = Array.from(new Set([answer, ...distractors])).slice(0, 4);
        for (let i = choices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [choices[i], choices[j]] = [choices[j], choices[i]];
        }
        let answered = false;
        let timer;

        container.innerHTML = `
          <div class="mg-title">${title}</div>
          <div class="mg-math-problem" style="font-size:22px;">${sequence.join('　')}　→　?</div>
          <div class="mg-math-choices">
            ${choices.map((c) => `<button class="mg-math-btn" data-val="${c}">${c}</button>`).join('')}
          </div>
        `;

        const buttons = Array.from(container.querySelectorAll('.mg-math-btn'));
        buttons.forEach((btn) => {
          btn.addEventListener('pointerdown', () => {
            if (answered) return;
            answered = true;
            clearTimeout(timer);
            onComplete(String(btn.dataset.val) === String(answer) ? 100 : 20);
          });
        });

        timer = setTimeout(() => {
          if (!answered) {
            answered = true;
            onComplete(10);
          }
        }, timeLimitMs);
      },
    };
  }

  const PATTERN_GAME_VARIANTS = [
    makePatternGame({ title: 'つぎに くる かずは?', kind: 'number' }),
    makePatternGame({ title: 'つぎに くる いろは?', kind: 'color' }),
  ];

  // --- リズムタップ ---

  // a beat pulses at a steady tempo (visualized by a pulsing circle); tap
  // as close to each pulse's peak as possible, repeated for a few rounds
  function makeBeatGame({ title, beatEmoji }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const ROUNDS = 5;
        const beatMs = lerp(900, 550, difficulty);
        const scores = [];
        let running = true;
        const startTime = performance.now();

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgRound">ビート 1/${ROUNDS}</span>
            <span id="mgScore">とくてん: 0</span>
          </div>
          <div class="mg-title">${title}</div>
          <div class="mg-beat-body">
            <div class="mg-beat-circle" id="mgBeatCircle" style="animation-duration:${beatMs}ms;">${beatEmoji}</div>
            <button class="mg-tap-btn" id="mgBeatBtn">タップ!</button>
          </div>
        `;

        const btn = container.querySelector('#mgBeatBtn');
        const roundEl = container.querySelector('#mgRound');
        const scoreEl = container.querySelector('#mgScore');

        function phaseError(now) {
          const t = (now - startTime) % beatMs;
          return Math.min(t, beatMs - t);
        }

        function onTap() {
          if (!running) return;
          const error = phaseError(performance.now());
          const ratio = error / (beatMs / 2);
          let roundScore;
          if (ratio <= 0.15) roundScore = 100;
          else if (ratio <= 0.35) roundScore = 70;
          else if (ratio <= 0.6) roundScore = 40;
          else roundScore = 10;
          scores.push(roundScore);
          scoreEl.textContent = `とくてん: ${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}`;
          if (scores.length >= ROUNDS) {
            end();
          } else {
            roundEl.textContent = `ビート ${scores.length + 1}/${ROUNDS}`;
          }
        }

        btn.addEventListener('pointerdown', onTap);

        function end() {
          if (!running) return;
          running = false;
          btn.removeEventListener('pointerdown', onTap);
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          onComplete(Math.round(avg));
        }
      },
    };
  }

  const BEAT_GAME_VARIANTS = [
    makeBeatGame({ title: 'ビートに あわせて タップ!', beatEmoji: '⭐' }),
    makeBeatGame({ title: 'ハートの リズムタップ!', beatEmoji: '💗' }),
  ];

  // --- けつだんめいろ ---

  // a linear branching maze - at each junction tap the branch that leads
  // toward the goal; no dragging, just a series of timed either/or picks
  function makeMazeGame({ title, pathEmojiPair }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const STEPS = Math.round(lerp(3, 6, difficulty));
        const timeLimitMs = lerp(3200, 1900, difficulty);
        let step = 0;
        let correctCount = 0;
        let stepTimer;
        let awaitingTap = false;

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgStep">わかれみち 1/${STEPS}</span>
            <span id="mgScore">せいかい: 0</span>
          </div>
          <div class="mg-title">${title}</div>
          <div class="mg-choices" id="mgChoices"></div>
        `;

        const stepEl = container.querySelector('#mgStep');
        const scoreEl = container.querySelector('#mgScore');
        const choicesEl = container.querySelector('#mgChoices');

        function renderStep() {
          const correctIndex = Math.random() < 0.5 ? 0 : 1;
          const labels = [`${pathEmojiPair[0]} こっち`, `${pathEmojiPair[1]} こっち`];
          choicesEl.innerHTML = labels
            .map((label, i) => `<button class="mg-choice-btn" data-i="${i}">${label}</button>`)
            .join('');
          awaitingTap = true;
          Array.from(choicesEl.querySelectorAll('.mg-choice-btn')).forEach((btn) => {
            btn.addEventListener('pointerdown', () => onPick(Number(btn.dataset.i) === correctIndex));
          });
          clearTimeout(stepTimer);
          stepTimer = setTimeout(() => onPick(false), timeLimitMs);
        }

        function onPick(correct) {
          if (!awaitingTap) return;
          awaitingTap = false;
          clearTimeout(stepTimer);
          if (correct) correctCount += 1;
          scoreEl.textContent = `せいかい: ${correctCount}`;
          step += 1;
          if (step >= STEPS) {
            onComplete(Math.round((correctCount / STEPS) * 100));
            return;
          }
          stepEl.textContent = `わかれみち ${step + 1}/${STEPS}`;
          renderStep();
        }

        renderStep();
      },
    };
  }

  const MAZE_GAME_VARIANTS = [
    makeMazeGame({ title: 'もりの めいろを ぬけよう!', pathEmojiPair: ['🌲', '🍄'] }),
    makeMazeGame({ title: 'ほらあなの めいろを すすもう!', pathEmojiPair: ['🪨', '💧'] }),
    // なつかしい 冒険アクションの「ダンジョンの わかれみちを すすんで
    // たからばこを めざす」あそびごこちを モチーフにした オマージュ
    makeMazeGame({ title: 'ダンジョンの わかれみちで たからばこを めざそう!', pathEmojiPair: ['🚪', '🗝️'] }),
  ];

  // --- いろわけ・しわけ ---

  // a static grid of mixed items - tap only the ones matching the target,
  // wrong taps cost points, unlike whack-a-mole nothing moves or hides
  function makeSortGame({ title, targetEmoji, otherEmojis }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const GRID_SIZE = Math.round(lerp(9, 16, difficulty));
        const targetCount = Math.max(3, Math.round(GRID_SIZE * 0.4));
        const timeLimitMs = lerp(6500, 3800, difficulty);
        const cells = Array.from({ length: GRID_SIZE }, (_, i) => (i < targetCount ? targetEmoji : otherEmojis[Math.floor(Math.random() * otherEmojis.length)]));
        for (let i = cells.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [cells[i], cells[j]] = [cells[j], cells[i]];
        }
        const cols = 4;
        const rows = Math.ceil(GRID_SIZE / cols);
        let correctTaps = 0;
        let mistakes = 0;
        let finished = false;
        let timer;

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgScore">みつけた: 0/${targetCount}</span>
          </div>
          <div class="mg-title">${title}</div>
          <div class="mg-whack-grid" id="mgGrid" style="grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr);">
            ${cells.map((emoji, i) => `<div class="mg-hole" data-i="${i}" data-target="${emoji === targetEmoji}" style="cursor:pointer;">${emoji}</div>`).join('')}
          </div>
        `;

        const scoreEl = container.querySelector('#mgScore');
        const cellEls = Array.from(container.querySelectorAll('.mg-hole'));

        cellEls.forEach((cell) => {
          cell.addEventListener('pointerdown', () => {
            if (finished || cell.classList.contains('done')) return;
            if (cell.dataset.target === 'true') {
              cell.classList.add('done');
              cell.style.visibility = 'hidden';
              correctTaps += 1;
              scoreEl.textContent = `みつけた: ${correctTaps}/${targetCount}`;
              if (correctTaps >= targetCount) end();
            } else {
              mistakes += 1;
              cell.classList.add('wrong');
              setTimeout(() => cell.classList.remove('wrong'), 200);
            }
          });
        });

        function end() {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          const score = clamp(Math.round((correctTaps / targetCount) * 100 - mistakes * 15), 10, 100);
          onComplete(score);
        }

        timer = setTimeout(end, timeLimitMs);
      },
    };
  }

  const SORT_GAME_VARIANTS = [
    makeSortGame({ title: 'くだものだけ タップしよう!', targetEmoji: '🍎', otherEmojis: ['🐛', '🪲', '🐌', '🕷️'] }),
    makeSortGame({ title: 'あおい ものだけ タップしよう!', targetEmoji: '🔵', otherEmojis: ['🔴', '🟡', '🟢', '🟣'] }),
    // なつかしい 冒険アクションの「ハートを あつめて たいりょくを
    // かいふくする」あそびごこちを モチーフにした オマージュ
    makeSortGame({ title: 'ハートだけ タップして たいりょくを かいふく!', targetEmoji: '❤️', otherEmojis: ['💀', '👹', '🦇', '🕸️'] }),
  ];

  // --- ハイ&ロー ---

  const highLowGame = {
    start(container, onComplete) {
      const difficulty = ageDifficulty();
      const ROUNDS = Math.round(lerp(4, 7, difficulty));
      const timeLimitMs = lerp(4000, 2500, difficulty);
      let round = 0;
      let correctCount = 0;
      let current = 1 + Math.floor(Math.random() * 100);
      let timer;
      let awaitingTap = false;

      container.innerHTML = `
        <div class="mg-header">
          <span id="mgRound">ラウンド 1/${ROUNDS}</span>
          <span id="mgScore">せいかい: 0</span>
        </div>
        <div class="mg-title">つぎの かずは たかい?ひくい?</div>
        <div class="mg-math-problem" id="mgNumber">${current}</div>
        <div class="mg-choices" id="mgChoices">
          <button class="mg-choice-btn" data-dir="up">⬆️ たかい</button>
          <button class="mg-choice-btn" data-dir="down">⬇️ ひくい</button>
        </div>
      `;

      const numberEl = container.querySelector('#mgNumber');
      const roundEl = container.querySelector('#mgRound');
      const scoreEl = container.querySelector('#mgScore');
      const buttons = Array.from(container.querySelectorAll('.mg-choice-btn'));

      function nextNumber() {
        let n;
        do {
          n = 1 + Math.floor(Math.random() * 100);
        } while (n === current);
        return n;
      }

      function onPick(dir) {
        if (!awaitingTap) return;
        awaitingTap = false;
        clearTimeout(timer);
        const next = nextNumber();
        const correct = (dir === 'up' && next > current) || (dir === 'down' && next < current);
        if (correct) correctCount += 1;
        scoreEl.textContent = `せいかい: ${correctCount}`;
        current = next;
        round += 1;
        if (round >= ROUNDS) {
          onComplete(Math.round((correctCount / ROUNDS) * 100));
          return;
        }
        numberEl.textContent = current;
        roundEl.textContent = `ラウンド ${round + 1}/${ROUNDS}`;
        awaitingTap = true;
        timer = setTimeout(() => onPick('up'), timeLimitMs);
      }

      buttons.forEach((btn) => btn.addEventListener('pointerdown', () => onPick(btn.dataset.dir)));
      awaitingTap = true;
      timer = setTimeout(() => onPick('up'), timeLimitMs);
    },
  };

  const HIGH_LOW_VARIANTS = [highLowGame];

  // --- タイルならべかえ ---

  // tap two tiles to swap them, sorting the shuffled row back into the
  // fixed target order - a slide-puzzle feel without needing drag input
  function makeTileSwapGame({ title, emojiSet }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const timeLimitMs = lerp(13000, 8000, difficulty);
        const target = emojiSet;
        const tiles = [...emojiSet];
        do {
          for (let i = tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
          }
        } while (tiles.every((t, i) => t === target[i]));

        let selected = -1;
        let swaps = 0;
        let finished = false;
        let timer;

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgSwaps">いれかえ: 0</span>
          </div>
          <div class="mg-title">${title}</div>
          <div class="mg-whack-grid" id="mgGrid" style="grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr);"></div>
          <div class="mg-hint">2つ タップして いれかえよう</div>
        `;

        const grid = container.querySelector('#mgGrid');
        const swapsEl = container.querySelector('#mgSwaps');

        function render() {
          grid.innerHTML = tiles
            .map((emoji, i) => `<div class="mg-hole${i === selected ? ' selected' : ''}" data-i="${i}" style="cursor:pointer;">${emoji}</div>`)
            .join('');
          Array.from(grid.querySelectorAll('.mg-hole')).forEach((cell) => {
            cell.addEventListener('pointerdown', () => onTapTile(Number(cell.dataset.i)));
          });
        }

        function onTapTile(i) {
          if (finished) return;
          if (selected === -1) {
            selected = i;
            render();
            return;
          }
          if (selected === i) {
            selected = -1;
            render();
            return;
          }
          [tiles[selected], tiles[i]] = [tiles[i], tiles[selected]];
          swaps += 1;
          swapsEl.textContent = `いれかえ: ${swaps}`;
          selected = -1;
          render();
          if (tiles.every((t, idx) => t === target[idx])) end(true);
        }

        function end(solved) {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          if (solved) {
            onComplete(clamp(Math.round(100 - swaps * 6), 40, 100));
          } else {
            const correctPositions = tiles.filter((t, idx) => t === target[idx]).length;
            onComplete(clamp(Math.round((correctPositions / tiles.length) * 60), 10, 60));
          }
        }

        render();
        timer = setTimeout(() => end(false), timeLimitMs);
      },
    };
  }

  const TILE_SWAP_VARIANTS = [
    makeTileSwapGame({ title: 'いろを じゅんばんに ならべよう!', emojiSet: ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣'] }),
    makeTileSwapGame({ title: 'おおきさじゅんに ならべよう!', emojiSet: ['🐭', '🐹', '🐰', '🐱', '🐶', '🐴'] }),
  ];

  // --- バブルポップ ---

  // bubbles rise via a CSS animation and must be tapped before they reach
  // the top - unlike whack-a-mole's fixed holes, targets actually move
  function makeBubblePopGame({ title, bubbleEmoji }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = 6000;
        const riseMs = lerp(2400, 1300, difficulty);
        const spawnIntervalMs = lerp(650, 380, difficulty);
        let hits = 0;
        let spawned = 0;
        let running = true;
        let spawnInterval, tickInterval;

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgTimer">残り: 6s</span>
            <span id="mgScore">ポップ: 0</span>
          </div>
          <div class="mg-title">${title}</div>
          <div class="mg-bubble-field" id="mgBubbleField"></div>
        `;
        const field = container.querySelector('#mgBubbleField');
        const timerEl = container.querySelector('#mgTimer');
        const scoreEl = container.querySelector('#mgScore');

        function spawnBubble() {
          if (!running) return;
          spawned += 1;
          const bubble = document.createElement('div');
          bubble.className = 'mg-bubble';
          bubble.textContent = bubbleEmoji;
          bubble.style.left = `${5 + Math.random() * 85}%`;
          bubble.style.animationDuration = `${riseMs}ms`;
          let popped = false;
          bubble.addEventListener('pointerdown', () => {
            if (popped) return;
            popped = true;
            hits += 1;
            scoreEl.textContent = `ポップ: ${hits}`;
            bubble.remove();
          });
          bubble.addEventListener('animationend', () => {
            if (!popped) bubble.remove();
          });
          field.appendChild(bubble);
        }

        spawnInterval = setInterval(spawnBubble, spawnIntervalMs);
        const startTime = performance.now();
        tickInterval = setInterval(() => {
          const remaining = Math.max(0, DURATION_MS - (performance.now() - startTime));
          timerEl.textContent = `残り: ${Math.ceil(remaining / 1000)}s`;
          if (remaining <= 0) end();
        }, 200);

        function end() {
          if (!running) return;
          running = false;
          clearInterval(spawnInterval);
          clearInterval(tickInterval);
          const score = spawned > 0 ? Math.round(clamp((hits / spawned) * 100, 0, 100)) : 0;
          onComplete(score);
        }

        spawnBubble();
      },
    };
  }

  const BUBBLE_POP_VARIANTS = [
    makeBubblePopGame({ title: 'あわを ぜんぶ ポップしよう!', bubbleEmoji: '🫧' }),
    makeBubblePopGame({ title: 'うきあがる ほしの あわを ポップしよう!', bubbleEmoji: '⭐' }),
  ];

  // --- もじつなぎ ---

  // spell the shown word by tapping its hiragana in order out of a mixed
  // set of tiles - a sequence-input puzzle, distinct from the other
  // multiple-choice or grid-tap games
  function makeSpellGame({ title, words }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const timeLimitMs = lerp(10000, 6000, difficulty);
        const word = words[Math.floor(Math.random() * words.length)];
        const letters = word.split('');
        const DISTRACTOR_POOL = 'あかさたなはまやらわいきしちにひみりうくすつぬふむゆるえけせてねへめれおこそとのほもよろ'.split('');
        const extraCount = Math.max(2, letters.length);
        const distractors = [];
        while (distractors.length < extraCount) {
          const c = DISTRACTOR_POOL[Math.floor(Math.random() * DISTRACTOR_POOL.length)];
          if (!letters.includes(c) && !distractors.includes(c)) distractors.push(c);
        }
        const tiles = [...letters, ...distractors];
        for (let i = tiles.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
        }

        let nextIndex = 0;
        let mistakes = 0;
        let finished = false;
        let timer;
        const filled = [];

        container.innerHTML = `
          <div class="mg-title">${title}</div>
          <div class="mg-spell-target" id="mgSpellTarget">${'　'.repeat(letters.length)}</div>
          <div class="mg-math-choices" id="mgSpellTiles" style="grid-template-columns: repeat(4, 1fr);">
            ${tiles.map((c, i) => `<button class="mg-math-btn" data-i="${i}">${c}</button>`).join('')}
          </div>
        `;
        const targetEl = container.querySelector('#mgSpellTarget');
        const buttons = Array.from(container.querySelectorAll('.mg-math-btn'));

        buttons.forEach((btn) => {
          btn.addEventListener('pointerdown', () => {
            if (finished || btn.disabled) return;
            const c = btn.textContent;
            if (c === letters[nextIndex]) {
              filled.push(c);
              nextIndex += 1;
              btn.disabled = true;
              btn.style.visibility = 'hidden';
              targetEl.textContent = filled.join('') + '　'.repeat(letters.length - filled.length);
              if (nextIndex >= letters.length) end(true);
            } else {
              mistakes += 1;
              btn.classList.add('wrong');
              setTimeout(() => btn.classList.remove('wrong'), 200);
            }
          });
        });

        function end(solved) {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          if (solved) {
            onComplete(clamp(Math.round(100 - mistakes * 15), 30, 100));
          } else {
            onComplete(clamp(Math.round((nextIndex / letters.length) * 50), 5, 50));
          }
        }

        timer = setTimeout(() => end(false), timeLimitMs);
      },
    };
  }

  const SPELL_GAME_VARIANTS = [
    makeSpellGame({ title: 'どうぶつの なまえを つづろう!', words: ['いぬ', 'ねこ', 'とり', 'うさぎ', 'ぞう', 'くま', 'さる', 'ぱんだ'] }),
    makeSpellGame({ title: 'たべものの なまえを つづろう!', words: ['いちご', 'りんご', 'ばなな', 'たまご', 'すいか', 'ぶどう', 'めろん'] }),
  ];

  // --- さんすうペア ---

  // tap two number cards that sum to the shown target - a pair-selection
  // puzzle rather than a straight multiple-choice calculation
  function makeSumPairGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const target = 8 + Math.floor(Math.random() * 8);
        const pairCount = Math.round(lerp(3, 5, difficulty));
        const distractorCount = Math.round(lerp(2, 4, difficulty));
        const timeLimitMs = lerp(15000, 9000, difficulty);

        const numbers = [];
        for (let i = 0; i < pairCount; i++) {
          const a = 1 + Math.floor(Math.random() * (target - 1));
          numbers.push(a, target - a);
        }
        for (let i = 0; i < distractorCount; i++) {
          numbers.push(1 + Math.floor(Math.random() * (target * 2)));
        }
        for (let i = numbers.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }
        const cols = 4;
        const rows = Math.ceil(numbers.length / cols);

        let selected = -1;
        let matchedCount = 0;
        let finished = false;
        let timer;

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgTarget">あわせて ${target} に なる ペアを さがそう</span>
          </div>
          <div class="mg-title">${title}</div>
          <div class="mg-whack-grid" id="mgGrid" style="grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr);"></div>
        `;
        const grid = container.querySelector('#mgGrid');

        function render() {
          grid.innerHTML = numbers
            .map((n, i) => (n === null
              ? '<div class="mg-hole" style="visibility:hidden;"></div>'
              : `<div class="mg-hole${i === selected ? ' selected' : ''}" data-i="${i}" style="cursor:pointer; font-size:18px;">${n}</div>`))
            .join('');
          Array.from(grid.querySelectorAll('.mg-hole[data-i]')).forEach((cell) => {
            cell.addEventListener('pointerdown', () => onTap(Number(cell.dataset.i)));
          });
        }

        function onTap(i) {
          if (finished || numbers[i] === null) return;
          if (selected === -1) {
            selected = i;
            render();
            return;
          }
          if (selected === i) {
            selected = -1;
            render();
            return;
          }
          if (numbers[selected] + numbers[i] === target) {
            numbers[selected] = null;
            numbers[i] = null;
            matchedCount += 1;
            selected = -1;
            render();
            if (matchedCount >= pairCount) end(true);
          } else {
            selected = -1;
            render();
          }
        }

        function end(solved) {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          const score = solved ? 100 : clamp(Math.round((matchedCount / pairCount) * 90), 10, 90);
          onComplete(score);
        }

        render();
        timer = setTimeout(() => end(false), timeLimitMs);
      },
    };
  }

  const SUM_PAIR_VARIANTS = [
    makeSumPairGame({ title: 'たしざんペア さがし!' }),
    makeSumPairGame({ title: 'かずの カップリング!' }),
  ];

  // --- しょうがいぶつジャンプ ---

  // an obstacle repeatedly approaches along a lane; tap ジャンプ while it's
  // in the danger zone to clear it - a real-time avoid/react loop rather
  // than a fixed-duration round
  function makeJumpGame({ title, obstacleEmoji }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = 7000;
        const cycleMs = lerp(1600, 950, difficulty);
        const jumpWindowMs = lerp(550, 300, difficulty);
        let avoided = 0;
        let total = 0;
        let inWindow = false;
        let running = true;
        let windowOpenTimeout, windowCloseTimeout, nextTimeout, tickInterval;

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgTimer">残り: 7s</span>
            <span id="mgScore">かいひ: 0</span>
          </div>
          <div class="mg-title">${title}</div>
          <div class="mg-jump-lane" id="mgJumpLane">
            <span class="mg-jump-obstacle hidden" id="mgJumpObstacle">${obstacleEmoji}</span>
            <span class="mg-jump-player" id="mgJumpPlayer">${currentSprite()}</span>
          </div>
          <button class="mg-tap-btn" id="mgJumpBtn">ジャンプ!</button>
        `;

        const obstacleEl = container.querySelector('#mgJumpObstacle');
        const playerEl = container.querySelector('#mgJumpPlayer');
        const jumpBtn = container.querySelector('#mgJumpBtn');
        const timerEl = container.querySelector('#mgTimer');
        const scoreEl = container.querySelector('#mgScore');

        function spawnObstacle() {
          if (!running) return;
          total += 1;
          inWindow = false;
          obstacleEl.classList.remove('hidden');
          // restart the CSS animation from scratch each spawn
          obstacleEl.style.animation = 'none';
          void obstacleEl.offsetWidth;
          obstacleEl.style.animation = `mg-jump-approach ${cycleMs}ms linear`;
          const windowStart = Math.max(0, cycleMs - jumpWindowMs);
          windowOpenTimeout = setTimeout(() => {
            inWindow = true;
          }, windowStart);
          windowCloseTimeout = setTimeout(() => {
            inWindow = false;
            obstacleEl.classList.add('hidden');
            scheduleNext();
          }, cycleMs);
        }

        function scheduleNext() {
          if (!running) return;
          nextTimeout = setTimeout(spawnObstacle, 250);
        }

        function onJump() {
          if (!running || !inWindow) return;
          avoided += 1;
          inWindow = false;
          scoreEl.textContent = `かいひ: ${avoided}`;
          playerEl.classList.add('jumping');
          setTimeout(() => playerEl.classList.remove('jumping'), 250);
          clearTimeout(windowCloseTimeout);
          obstacleEl.classList.add('hidden');
          scheduleNext();
        }
        jumpBtn.addEventListener('pointerdown', onJump);

        const startTime = performance.now();
        tickInterval = setInterval(() => {
          const remaining = Math.max(0, DURATION_MS - (performance.now() - startTime));
          timerEl.textContent = `残り: ${Math.ceil(remaining / 1000)}s`;
          if (remaining <= 0) end();
        }, 200);

        function end() {
          if (!running) return;
          running = false;
          clearInterval(tickInterval);
          clearTimeout(windowOpenTimeout);
          clearTimeout(windowCloseTimeout);
          clearTimeout(nextTimeout);
          jumpBtn.removeEventListener('pointerdown', onJump);
          const score = total > 0 ? Math.round(clamp((avoided / total) * 100, 0, 100)) : 0;
          onComplete(score);
        }

        spawnObstacle();
      },
    };
  }

  const JUMP_GAME_VARIANTS = [
    makeJumpGame({ title: 'タイミングよく ジャンプしよう!', obstacleEmoji: '🪨' }),
    makeJumpGame({ title: 'とんでくる ものを よけよう!', obstacleEmoji: '🌵' }),
    // なつかしい 配管工アクションの「ころがってくる こうらを ジャンプで
    // よける」あそびごこちを モチーフにした オマージュ
    makeJumpGame({ title: 'ころがってくる こうらを ジャンプで よけよう!', obstacleEmoji: '🐢' }),
  ];

  // --- いろのぐみあわせ ---

  const COLOR_MIX_PAIRS = [
    { a: '🔴', b: '🔵', answer: '🟣', label: 'むらさき' },
    { a: '🔴', b: '🟡', answer: '🟠', label: 'オレンジ' },
    { a: '🔵', b: '🟡', answer: '🟢', label: 'みどり' },
  ];

  const colorMixGame = {
    start(container, onComplete) {
      const timeLimitMs = 6000;
      const pair = COLOR_MIX_PAIRS[Math.floor(Math.random() * COLOR_MIX_PAIRS.length)];
      const distractors = COLOR_MIX_PAIRS.map((p) => p.answer).filter((a) => a !== pair.answer);
      const choices = [pair.answer, ...distractors];
      for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
      }
      let answered = false;
      let timer;

      container.innerHTML = `
        <div class="mg-title">いろを まぜると なにいろに なる?</div>
        <div class="mg-math-problem" style="font-size:30px;">${pair.a} + ${pair.b} = ?</div>
        <div class="mg-math-choices">
          ${choices.map((c) => `<button class="mg-math-btn" data-val="${c}" style="font-size:22px;">${c}</button>`).join('')}
        </div>
      `;

      const buttons = Array.from(container.querySelectorAll('.mg-math-btn'));
      buttons.forEach((btn) => {
        btn.addEventListener('pointerdown', () => {
          if (answered) return;
          answered = true;
          clearTimeout(timer);
          onComplete(btn.dataset.val === pair.answer ? 100 : 20);
        });
      });

      timer = setTimeout(() => {
        if (!answered) {
          answered = true;
          onComplete(10);
        }
      }, timeLimitMs);
    },
  };

  const COLOR_MIX_VARIANTS = [colorMixGame];

  // --- じぶんさがし: 育てている今の姿を、似た他の種族ラインの同じ成長段階
  // の中から見つけてタップする。emoji はプレイ開始時に currentSprite() /
  // state.speciesLine / state.stageIndex から毎回組み立てるので、種族や
  // 成長段階が変わっても常にそのときの本人が出題される
  function makeFindSelfGame() {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const selfEmoji = currentSprite();
        const stageIdx = state.stageIndex;
        const decoyPool = [...new Set(
          ALL_LINES
            .filter((line) => line !== state.speciesLine)
            .map((line) => SPECIES[line].stages[stageIdx]?.emoji)
            .filter((emoji) => emoji && emoji !== selfEmoji)
        )];
        const GRID_SIZE = Math.round(lerp(9, 16, difficulty));
        const targetCount = Math.max(2, Math.round(GRID_SIZE * 0.25));
        const timeLimitMs = lerp(7000, 4200, difficulty);
        const cells = Array.from({ length: GRID_SIZE }, (_, i) => (
          i < targetCount ? selfEmoji : decoyPool[Math.floor(Math.random() * decoyPool.length)]
        ));
        for (let i = cells.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [cells[i], cells[j]] = [cells[j], cells[i]];
        }
        const cols = 4;
        const rows = Math.ceil(GRID_SIZE / cols);
        let correctTaps = 0;
        let mistakes = 0;
        let finished = false;
        let timer;

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgScore">みつけた: 0/${targetCount}</span>
          </div>
          <div class="mg-title">じぶんの すがたを ぜんぶ みつけよう!</div>
          <div class="mg-whack-grid" id="mgGrid" style="grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr);">
            ${cells.map((emoji, i) => `<div class="mg-hole" data-i="${i}" data-target="${emoji === selfEmoji}" style="cursor:pointer;">${emoji}</div>`).join('')}
          </div>
        `;

        const scoreEl = container.querySelector('#mgScore');
        const cellEls = Array.from(container.querySelectorAll('.mg-hole'));

        cellEls.forEach((cell) => {
          cell.addEventListener('pointerdown', () => {
            if (finished || cell.classList.contains('done')) return;
            if (cell.dataset.target === 'true') {
              cell.classList.add('done');
              cell.style.visibility = 'hidden';
              correctTaps += 1;
              scoreEl.textContent = `みつけた: ${correctTaps}/${targetCount}`;
              if (correctTaps >= targetCount) end();
            } else {
              mistakes += 1;
              cell.classList.add('wrong');
              setTimeout(() => cell.classList.remove('wrong'), 200);
            }
          });
        });

        function end() {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          const score = clamp(Math.round((correctTaps / targetCount) * 100 - mistakes * 15), 10, 100);
          onComplete(score);
        }

        timer = setTimeout(end, timeLimitMs);
      },
    };
  }

  const FIND_SELF_VARIANTS = [makeFindSelfGame()];

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
        const ROUNDS = Math.round(lerp(4, 6, difficulty));
        const timeLimitMs = lerp(3400, 2000, difficulty);
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
              if (btn.dataset.mood === target.mood) correctCount += 1;
              charEl.className = `pet emote-${target.mood}`;
              setTimeout(() => {
                charEl.className = 'pet';
                nextRound();
              }, 650);
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

  const POSE_GAME_VARIANTS = [makePoseGame()];

  // --- ロードげーむ(3れーんを よけよう・キャッチしよう) ---

  // レーンごとの ざひょうを「ちへいせんで せまく・てまえで ひろく」
  // ほかんし、とどくまでの しんちょくに 2じょうの イージングを かけることで、
  // せまい がめんの なかでも「おくから せまってくる」たちたいてきな
  // おくゆき感を だす、みちを はしる/よける タイプの ミニゲーム
  function makeRoadGame({ title, goodItems, badItems }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = 11000;
        const travelMs = lerp(2000, 1150, difficulty);
        const spawnInterval = lerp(950, 520, difficulty);
        const BAD_CHANCE = lerp(0.35, 0.55, difficulty);
        const LANE_HORIZON_X = [44, 50, 56];
        const LANE_NEAR_X = [16, 50, 84];
        let lane = 1;
        let points = 0;
        let running = true;
        let lastSpawn = 0;
        let items = [];

        container.innerHTML = `
          <div class="mg-header">
            <span id="mgTimer">残り: 11s</span>
            <span id="mgScore">とくてん: 0</span>
          </div>
          <div class="mg-title">${title}</div>
          <div class="mg-road" id="mgRoad">
            <div class="mg-road-surface"></div>
            <div class="mg-road-player" id="mgRoadPlayer" style="left:${LANE_NEAR_X[1]}%">${currentSprite()}</div>
          </div>
          <div class="mg-road-controls">
            <button class="mg-tap-btn" id="mgRoadLeft">◀</button>
            <button class="mg-tap-btn" id="mgRoadRight">▶</button>
          </div>
        `;

        const road = container.querySelector('#mgRoad');
        const playerEl = container.querySelector('#mgRoadPlayer');
        const timerEl = container.querySelector('#mgTimer');
        const scoreEl = container.querySelector('#mgScore');
        const leftBtn = container.querySelector('#mgRoadLeft');
        const rightBtn = container.querySelector('#mgRoadRight');

        function setLane(next) {
          lane = clamp(next, 0, 2);
          playerEl.style.left = LANE_NEAR_X[lane] + '%';
        }
        leftBtn.addEventListener('pointerdown', () => setLane(lane - 1));
        rightBtn.addEventListener('pointerdown', () => setLane(lane + 1));

        function flashRoad() {
          road.classList.add('hit');
          setTimeout(() => road.classList.remove('hit'), 200);
        }

        function spawnItem() {
          const isBad = Math.random() < BAD_CHANCE;
          const pool = isBad ? badItems : goodItems;
          const itemLane = Math.floor(Math.random() * 3);
          const itemEl = document.createElement('div');
          itemEl.className = 'mg-road-item';
          itemEl.textContent = pool[Math.floor(Math.random() * pool.length)];
          road.appendChild(itemEl);
          items.push({ el: itemEl, lane: itemLane, born: performance.now(), bad: isBad, resolved: false });
        }

        const startTime = performance.now();
        let rafId;

        function frame(now) {
          if (!running) return;
          const elapsed = now - startTime;
          const remaining = Math.max(0, DURATION_MS - elapsed);
          timerEl.textContent = `残り: ${Math.ceil(remaining / 1000)}s`;

          if (now - lastSpawn > spawnInterval) {
            spawnItem();
            lastSpawn = now;
          }

          items = items.filter((item) => {
            const t = clamp((now - item.born) / travelMs, 0, 1);
            const eased = t * t;
            const x = lerp(LANE_HORIZON_X[item.lane], LANE_NEAR_X[item.lane], eased);
            const y = lerp(10, 84, eased);
            const scale = lerp(0.3, 1.25, eased);
            item.el.style.left = x + '%';
            item.el.style.top = y + '%';
            item.el.style.opacity = Math.min(1, eased * 2.4);
            item.el.style.transform = `translate(-50%, -50%) scale(${scale})`;
            if (t >= 1 && !item.resolved) {
              item.resolved = true;
              if (item.lane === lane) {
                if (item.bad) {
                  points = Math.max(0, points - 20);
                  flashRoad();
                } else {
                  points = Math.min(100, points + 16);
                }
                scoreEl.textContent = `とくてん: ${points}`;
              }
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
          items.forEach((item) => item.el.remove());
          onComplete(points);
        }

        rafId = requestAnimationFrame(frame);
      },
    };
  }

  const ROAD_GAME_VARIANTS = [
    makeRoadGame({
      title: 'どうろを はしろう!たべものは キャッチ、ゴミは よけて',
      goodItems: ['🍎', '🍙', '🍬', '🍇'],
      badItems: ['🪨', '🚧', '🛢️', '⚠️'],
    }),
    makeRoadGame({
      title: 'そらを とぼう!ほしは キャッチ、いんせきは よけて',
      goodItems: ['⭐', '🌟', '✨', '🍀'],
      badItems: ['☄️', '🪨', '⚡', '🛰️'],
    }),
    makeRoadGame({
      title: 'うみを およごう!さかなは キャッチ、ゴミは よけて',
      goodItems: ['🐟', '🐠', '🦐', '🐚'],
      badItems: ['🥫', '🪤', '🕸️', '🦈'],
    }),
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
        const ROUNDS = 6;
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

  const STACK_GAME_VARIANTS = [
    makeStackGame({
      title: 'つみきタワー!せいかくに かさねよう',
      blockEmoji: '🟦',
      palette: ['#f6a5c0', '#a5d8f6', '#c8f6a5', '#f6e2a5', '#d3a5f6', '#a5f6d8', '#f6c8a5'],
    }),
    makeStackGame({
      title: 'パンケーキタワー!たかく かさねよう',
      blockEmoji: '🥞',
      palette: ['#f6d9a5', '#f0c078', '#e8a95c', '#dba05a', '#c98a4a', '#b87a3f', '#a56a35'],
    }),
    makeStackGame({
      title: 'ケーキタワー!おいわいの たかづみ',
      blockEmoji: '🍰',
      palette: ['#ffd1e8', '#ffe4b5', '#d1f0d8', '#d1e8ff', '#e8d1ff', '#fff5b8', '#ffcccb'],
    }),
  ];

  // --- かくとうゲーム(タイミングよく こうげき/ガード) ---

  // あいてが「こうげきの けはい」か「すき」かを ランダムに おりまぜて
  // きて、その たびに みじかい はんのう時間の なかで「こうげき」か
  // 「ガード」を えらぶ、HPゲージつきの リアルタイム対戦ゲーム
  function makeFightGame({ title, opponentEmoji, opponentName }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const ROUNDS = 7;
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
              timers.push(setTimeout(nextRound, 550));
            }
          }

          attackBtn.onpointerdown = () => resolveRound('attack');
          guardBtn.onpointerdown = () => resolveRound('guard');

          timers.push(setTimeout(() => resolveRound(null), telegraphMs + reactionMs));
        }

        timers.push(setTimeout(nextRound, 900));
      },
    };
  }

  const FIGHT_GAME_VARIANTS = [
    makeFightGame({ title: 'ライバルの いぬと たいけつ!', opponentEmoji: '🐕‍🦺', opponentName: 'ライバルいぬ' }),
    makeFightGame({ title: 'なぞの にんじゃと たいけつ!', opponentEmoji: '🥷', opponentName: 'なぞのにんじゃ' }),
    makeFightGame({ title: 'きょうてきの とらと たいけつ!', opponentEmoji: '🐯', opponentName: 'きょうてきの とら' }),
    // にんきキャラが おおぜい あつまる かくとうアクションの「オールスター
    // たいかいで ライバルを ふっとばす」あそびごこちを モチーフにした
    // オマージュ。商標キャラの名まえは つかわず、モチーフだけ お借りする
    makeFightGame({ title: 'オールスターたいかいで ライバルを ふっとばせ!', opponentEmoji: '🥊', opponentName: 'にんきキャラの ライバル' }),
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
        const TURN_LIMIT = 8;
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
          }, 500);
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
          setTimeout(monsterTurn, 600);
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
    makeRpgBattleGame({ title: 'RPGふう バトル!スライムが あらわれた', monsterEmoji: '🟢', monsterName: 'スライム' }),
    makeRpgBattleGame({ title: 'RPGふう バトル!ドラゴンが あらわれた', monsterEmoji: '🐉', monsterName: 'ドラゴン' }),
    makeRpgBattleGame({ title: 'RPGふう バトル!ゴーストが あらわれた', monsterEmoji: '👻', monsterName: 'ゴースト' }),
  ];

  const MINIGAMES = [
    ...CATCH_GAME_VARIANTS,
    ...WHACK_GAME_VARIANTS,
    ...TIMING_GAME_VARIANTS,
    ...QUIZ_GAME_VARIANTS,
    ...MEMORY_GAME_VARIANTS,
    ...MATH_GAME_VARIANTS,
    ...REACTION_GAME_VARIANTS,
    ...STROOP_GAME_VARIANTS,
    ...JANKEN_GAME_VARIANTS,
    ...CONCENTRATION_GAME_VARIANTS,
    ...MASH_GAME_VARIANTS,
    ...BALANCE_GAME_VARIANTS,
    ...ODD_ONE_OUT_VARIANTS,
    ...NUMBER_ORDER_VARIANTS,
    ...COMPARE_VARIANTS,
    ...SHAPE_MATCH_VARIANTS,
    ...SILHOUETTE_VARIANTS,
    ...PATTERN_GAME_VARIANTS,
    ...BEAT_GAME_VARIANTS,
    ...MAZE_GAME_VARIANTS,
    ...SORT_GAME_VARIANTS,
    ...HIGH_LOW_VARIANTS,
    ...TILE_SWAP_VARIANTS,
    ...BUBBLE_POP_VARIANTS,
    ...SPELL_GAME_VARIANTS,
    ...SUM_PAIR_VARIANTS,
    ...JUMP_GAME_VARIANTS,
    ...COLOR_MIX_VARIANTS,
    ...FIND_SELF_VARIANTS,
    ...POSE_GAME_VARIANTS,
    ...ROAD_GAME_VARIANTS,
    ...STACK_GAME_VARIANTS,
    ...FIGHT_GAME_VARIANTS,
    ...RPG_GAME_VARIANTS,
  ];

  // MINIGAMES の どの ゲームが どの「しゅるい」(生成もとの make*Game
  // ジェネレーター)に ぞくすかを、オブジェクトの まま ひきなおせる
  // Map として おぼえておく。地域限定あそびが「その しゅるい」を まるごと
  // 地域仕様に おきかえる さいに つかう(下の buildMinigamePool 参照)
  const MINIGAME_CATEGORY_GROUPS = [
    ['catch', CATCH_GAME_VARIANTS],
    ['whack', WHACK_GAME_VARIANTS],
    ['timing', TIMING_GAME_VARIANTS],
    ['quiz', QUIZ_GAME_VARIANTS],
    ['memory', MEMORY_GAME_VARIANTS],
    ['math', MATH_GAME_VARIANTS],
    ['reaction', REACTION_GAME_VARIANTS],
    ['stroop', STROOP_GAME_VARIANTS],
    ['janken', JANKEN_GAME_VARIANTS],
    ['concentration', CONCENTRATION_GAME_VARIANTS],
    ['mash', MASH_GAME_VARIANTS],
    ['balance', BALANCE_GAME_VARIANTS],
    ['oddOneOut', ODD_ONE_OUT_VARIANTS],
    ['numberOrder', NUMBER_ORDER_VARIANTS],
    ['compare', COMPARE_VARIANTS],
    ['shapeMatch', SHAPE_MATCH_VARIANTS],
    ['silhouette', SILHOUETTE_VARIANTS],
    ['pattern', PATTERN_GAME_VARIANTS],
    ['beat', BEAT_GAME_VARIANTS],
    ['maze', MAZE_GAME_VARIANTS],
    ['sort', SORT_GAME_VARIANTS],
    ['highLow', HIGH_LOW_VARIANTS],
    ['tileSwap', TILE_SWAP_VARIANTS],
    ['bubblePop', BUBBLE_POP_VARIANTS],
    ['spell', SPELL_GAME_VARIANTS],
    ['sumPair', SUM_PAIR_VARIANTS],
    ['jump', JUMP_GAME_VARIANTS],
    ['colorMix', COLOR_MIX_VARIANTS],
    ['findSelf', FIND_SELF_VARIANTS],
    ['pose', POSE_GAME_VARIANTS],
    ['road', ROAD_GAME_VARIANTS],
    ['stack', STACK_GAME_VARIANTS],
    ['fight', FIGHT_GAME_VARIANTS],
    ['rpg', RPG_GAME_VARIANTS],
  ];
  const minigameCategoryOf = new Map();
  for (const [category, variants] of MINIGAME_CATEGORY_GROUPS) {
    for (const game of variants) minigameCategoryOf.set(game, category);
  }

  // 地域ごとの あそび。それぞれ どの しゅるい(category)の あそびを
  // 地域仕様に おきかえるものかを あわせて もたせておく。いま いる地域に
  // その category の 地域限定版が あるあいだは、おなじ category の
  // ふつうの バリエーションは いっさい 出さず、地域仕様だけが 出る
  // (例:さばくに いるあいだは、もぐらたたき系は「サソリたたき」だけに
  // なり、ほし・もぐら・むし・おばけ・ひよこ・はてなブロック・
  // ライバルファイターは 出ない)。category の 地域限定版が ない しゅるいは、
  // これまでどおり ふつうの プールから 出る。「おうち」も れっきとした
  // ひとつの地域なので、おなじ しくみで 専用の4種類を もつ(ただし
  // もぐらたたき系は 他の7地域 ぜんぶが すでに 地域仕様を もっていて、
  // ここで おうちまで もぐらたたき系を おきかえると 一般の7種類が
  // どこでも 二度と 出せなくなってしまうため、おうちの category からは
  // わざと はずしてある)
  const REGION_MINIGAMES = {
    home: [
      { category: 'mash', game: makeMashGame({ title: 'おそうじ れんだタップ!', buttonEmoji: '🧹' }) },
      { category: 'catch', game: makeCatchGame({
        title: 'せんたくもの キャッチ!どろは いやだ',
        basketEmoji: '🧺',
        goodItems: ['👕', '🧦', '🩳', '👖'],
        badItems: ['💩', '🟤', '🐛', '🕸️'],
      }) },
      { category: 'concentration', game: makeConcentrationGame({ title: 'おもちゃばこの ペアを さがそう!', emojis: ['🧸', '🪁', '🎈', '🧩', '🚗', '⚽'] }) },
      { category: 'maze', game: makeMazeGame({ title: 'おうちの なかを おかたづけめいろで すすもう!', pathEmojiPair: ['🛋️', '🛏️'] }) },
    ],
    sea: [
      { category: 'catch', game: makeCatchGame({
        title: 'さかなつり!ゴミは いらないよ',
        basketEmoji: '🎣',
        goodItems: ['🐟', '🦐', '🐙', '🦑'],
        badItems: ['🥫', '🛍️', '🪤', '⚓'],
      }) },
      { category: 'whack', game: makeWhackGame({ title: 'とびだす カニを タップ!', targetEmoji: '🦀' }) },
      { category: 'maze', game: makeMazeGame({ title: 'さんごしょうの めいろを およごう!', pathEmojiPair: ['🐠', '🪸'] }) },
      { category: 'concentration', game: makeConcentrationGame({ title: 'うみの いきものペアを さがそう!', emojis: ['🐠', '🐙', '🦑', '🦀', '🐬', '🐢'] }) },
    ],
    snow: [
      { category: 'jump', game: makeJumpGame({ title: 'ゆきだるまを よけて すべろう!', obstacleEmoji: '⛄' }) },
      { category: 'mash', game: makeMashGame({ title: 'ゆきだるまづくり!れんだタップ!', buttonEmoji: '⛄' }) },
      { category: 'whack', game: makeWhackGame({ title: 'とびだす ペンギンを タップ!', targetEmoji: '🐧' }) },
      { category: 'catch', game: makeCatchGame({
        title: 'ゆきの けっしょうキャッチ!こおりは あぶない',
        basketEmoji: '🧤',
        goodItems: ['❄️', '⛷️', '🧣', '☃️'],
        badItems: ['🧊', '⚡', '🥶', '🌨️'],
      }) },
    ],
    city: [
      { category: 'whack', game: makeWhackGame({ title: 'とびだす タクシーを タップ!', targetEmoji: '🚕' }) },
      { category: 'timing', game: makeTimingGame({ title: 'しんごうが かわる しゅんかんで タップ!', tapLabel: 'GO!', gaugeStyle: '#4a90d9' }) },
      { category: 'road', game: makeRoadGame({
        title: 'とかいを はしろう!ラッキーアイテムは キャッチ、はとの ふんは よけて',
        goodItems: ['🍩', '☕', '🎫', '💰'],
        badItems: ['🐦', '🚧', '🗑️', '⚠️'],
      }) },
      { category: 'mash', game: makeMashGame({ title: 'エレベーターの ボタンれんだ!', buttonEmoji: '🛗' }) },
    ],
    countryside: [
      { category: 'catch', game: makeCatchGame({
        title: 'はたけの しゅうかく!がいちゅうは よけて',
        basketEmoji: '🧺',
        goodItems: ['🌾', '🍆', '🎃', '🧅'],
        badItems: ['🐀', '🦗', '🐜', '🦠'],
      }) },
      { category: 'mash', game: makeMashGame({ title: 'にゅうしぼり!れんだタップ!', buttonEmoji: '🥛' }) },
      { category: 'whack', game: makeWhackGame({ title: 'とびだす ニワトリを タップ!', targetEmoji: '🐔' }) },
      { category: 'concentration', game: makeConcentrationGame({ title: 'のうさぎょうの どうぐペアを さがそう!', emojis: ['🌾', '🚜', '🧺', '🐓', '🐄', '🌻'] }) },
    ],
    forest: [
      { category: 'whack', game: makeWhackGame({ title: 'とびだす リスを タップ!', targetEmoji: '🐿️' }) },
      { category: 'bubblePop', game: makeBubblePopGame({ title: 'きのこの ほうしを ポップしよう!', bubbleEmoji: '🍄' }) },
      { category: 'maze', game: makeMazeGame({ title: 'ふかい もりの けものみちを すすもう!', pathEmojiPair: ['🍂', '🐿️'] }) },
      { category: 'stack', game: makeStackGame({
        title: 'きのみタワー!たかく つみあげよう',
        blockEmoji: '🌰',
        palette: ['#8a9a5b', '#a3b18a', '#dad7cd', '#588157', '#3a5a40', '#344e41', '#bc6c25'],
      }) },
    ],
    desert: [
      { category: 'catch', game: makeCatchGame({
        title: 'オアシスの みずを キャッチ!さそりは あぶない',
        basketEmoji: '🏺',
        goodItems: ['💧', '🍈', '🌴', '⭐'],
        badItems: ['🦂', '🐍', '☠️', '🔥'],
      }) },
      { category: 'jump', game: makeJumpGame({ title: 'サボテンを ジャンプで よけよう!', obstacleEmoji: '🌵' }) },
      { category: 'whack', game: makeWhackGame({ title: 'とびだす サソリを タップ!', targetEmoji: '🦂' }) },
      { category: 'road', game: makeRoadGame({
        title: 'さばくを はしろう!オアシスの めぐみは キャッチ、とげは よけて',
        goodItems: ['💧', '🍈', '⭐', '🧢'],
        badItems: ['🦂', '🐍', '☠️', '🔥'],
      }) },
    ],
    tropical: [
      { category: 'catch', game: makeCatchGame({
        title: 'フルーツキャッチ!とげとげは いらない',
        basketEmoji: '🧺',
        goodItems: ['🍍', '🥥', '🍌', '🥭'],
        badItems: ['🐝', '🕷️', '🦂', '🌶️'],
      }) },
      { category: 'mash', game: makeMashGame({ title: 'ココナッツわり!れんだタップ!', buttonEmoji: '🥥' }) },
      { category: 'whack', game: makeWhackGame({ title: 'とびだす オウムを タップ!', targetEmoji: '🦜' }) },
      { category: 'bubblePop', game: makeBubblePopGame({ title: 'トロピカルジュースの あわを ポップしよう!', bubbleEmoji: '🫧' }) },
    ],
  };

  // 地域専用のあそびは わざわざ 優先あつかいせず、いま いる地域に あわせて
  // ふつうの プールに くわわる 「そのとき だけの あと数種類」として
  // あつかう。だから 地域に いるあいだは その4種類も ほかと まったく
  // おなじ かくりつで まざり、地域を はなれれば また ふつうの プールに
  // もどる(おうちなど 専用あそびが ない地域では ふつうの プールのまま)。
  // ただし、地域限定版が ある category(しゅるい)については、ふつうの
  // バリエーションを プールから のぞき、地域限定版だけに おきかえる
  // (例:さばくでは もぐらたたき系は サソリたたきだけに なる)
  let minigameQueue = [];
  let currentMinigamePool = MINIGAMES;
  let minigameQueueRegionId = null;
  let lastMinigame = null;

  function buildMinigamePool() {
    const regionEntries = REGION_MINIGAMES[state.regionId];
    if (!regionEntries || !regionEntries.length) return MINIGAMES;
    const regionCategories = new Set(regionEntries.map((entry) => entry.category));
    const generalWithoutRegionalCategories = MINIGAMES.filter((game) => !regionCategories.has(minigameCategoryOf.get(game)));
    return [...generalWithoutRegionalCategories, ...regionEntries.map((entry) => entry.game)];
  }

  function refillMinigameQueue() {
    currentMinigamePool = buildMinigamePool();
    minigameQueueRegionId = state.regionId;
    minigameQueue = currentMinigamePool.map((_, i) => i);
    for (let i = minigameQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [minigameQueue[i], minigameQueue[j]] = [minigameQueue[j], minigameQueue[i]];
    }
    // すぐ さっき あそんだのと おなじ ものに ならないよう ちぇっく。
    // プールの なかみは 地域が かわるたびに かわりうるので、いんでっくす
    // ではなく ゲームじたい(れいがい なく おなじ オブジェクト)で くらべる
    if (minigameQueue.length > 1 && currentMinigamePool[minigameQueue[minigameQueue.length - 1]] === lastMinigame) {
      [minigameQueue[0], minigameQueue[minigameQueue.length - 1]] = [minigameQueue[minigameQueue.length - 1], minigameQueue[0]];
    }
  }

  // 「ぜんぶ 出きるまで おなじ ものを くりかえさない」しくみは そのまま、
  // いま いる地域の あそびも まぜた プールぜんたいに たいして はたらく
  function pickRandomMinigame() {
    if (minigameQueue.length === 0 || minigameQueueRegionId !== state.regionId) {
      refillMinigameQueue();
    }
    const idx = minigameQueue.pop();
    const game = currentMinigamePool[idx];
    lastMinigame = game;
    return game;
  }

  function resultMessageForScore(score) {
    if (score >= 80) return 'だいせいこう!たのしかった!';
    if (score >= 50) return 'たのしく あそんだ!';
    return 'まあまあ あそべた!';
  }

  function finishMinigame(score, customMessage) {
    // サングラスを そうびしていると、ミニゲームの とくてんに ボーナスが つく
    const clampedScore = clamp(score + (isEquipped('glasses') ? 8 : 0), 0, 100);
    const happinessGain = Math.round(5 + (clampedScore / 100) * 20);
    state.happiness = clamp(state.happiness + happinessGain, 0, 100);
    state.energy = clamp(state.energy - 12, 0, 100);
    state.minigameScoreSum += clampedScore;
    state.minigameCount += 1;
    state.lifetime.minigamesPlayed += 1;
    // fills regardless of score - unlike evo/devo, playing itself (not
    // skill) is what earns a shot at choosing a different growth line。
    // シルクハットを そうびしていると たまりやすさに ボーナスが つく
    state.transformMeter = clamp(state.transformMeter + 15 + (isEquipped('hat') ? 5 : 0), 0, 100);

    // good play pushes the evolution meter, a real miss pushes both the
    // devolution and death meters - this is the main engine behind the
    // fast-paced transform/regress/die loop, not just the passive clock
    let itemMessage = '';
    const isGreat = clampedScore >= 70;
    const isBad = clampedScore < 40;
    if (isGreat) {
      state.evoMeter = clamp(state.evoMeter + 22, 0, 100);
      const item = pickWeightedItem();
      state.items[item.id] = (state.items[item.id] || 0) + 1;
      // スターバッジを そうびしていると、もらえる おかねが 4わり ふえる
      const coins = Math.round((5 + Math.random() * 6) * (isEquipped('star') ? 1.4 : 1));
      state.lifetime.money += coins;
      itemMessage = ` ごほうびに ${item.label}${item.emoji} と 💰${coins} を もらった!`;
    } else if (clampedScore >= 40) {
      state.evoMeter = clamp(state.evoMeter + 8, 0, 100);
    } else {
      state.devoMeter = clamp(state.devoMeter + 18, 0, 100);
      raiseDeathMeter(10);
    }

    let resultMessage = (customMessage || resultMessageForScore(score)) + itemMessage;
    let recruitedNow = false;

    // なかまイベントの さいちゅうだった プレイなら、つうじょうの けっか
    // メッセージを なかまに なれたか どうかの けっかに おきかえる(ステータス
    // への こうかは ふつうの ミニゲームと まったく おなじ)
    if (pendingCompanionId) {
      const companion = COMPANIONS.find((c) => c.id === pendingCompanionId);
      pendingCompanionId = null;
      if (companion) {
        if (clampedScore >= COMPANION_RECRUIT_THRESHOLD) {
          if (!state.lifetime.companionsRecruited.includes(companion.id)) {
            state.lifetime.companionsRecruited.push(companion.id);
          }
          if (!state.companions.some((c) => c.id === companion.id)) {
            state.companions.push({ id: companion.id, bond: 100 });
          }
          recruitedNow = true;
          resultMessage = `${companion.name}が なかまに なった!${companion.emoji}`;
        } else {
          resultMessage = `${companion.name}とは まだ なかよく なれなかった…また こんど ためそう`;
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

  function withFeedback(fn) {
    return () => {
      fn();
      saveState();
      render();
    };
  }

  el.feedBtn.addEventListener('click', withFeedback(() => {
    if (state.isSleeping) {
      setMessage('ねている… おきてから あげよう');
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
      state.devoMeter = clamp(state.devoMeter + 8, 0, 100);
      if (!state.isSick && Math.random() < 0.3) {
        const sickness = SICKNESS_TYPES[Math.floor(Math.random() * SICKNESS_TYPES.length)];
        state.isSick = true;
        state.sicknessType = sickness.label;
        state.totalSicknessCount += 1;
        raiseDeathMeter(7);
        setMessage(`たべすぎて ${sickness.label}に なってしまった…`);
      } else {
        setMessage('もう おなかいっぱい… たべすぎ!');
      }
      checkStoryEvents('overfeed');
      checkMeters();
      emotePet('angry');
      return;
    }
    state.happiness = clamp(state.happiness + 3, 0, 100);
    state.evoMeter = clamp(state.evoMeter + 6, 0, 100);
    state.devoMeter = clamp(state.devoMeter - 4, 0, 100);
    if (!checkMeters()) {
      setMessage('もぐもぐ おいしい!');
    }
    emotePet('happy');
  }));

  el.playBtn.addEventListener('click', () => {
    if (gameActive) return;
    if (state.isSleeping) {
      setMessage('ねている… おきてから あそぼう');
      saveState();
      render();
      return;
    }
    if (state.energy < 10) {
      setMessage('つかれていて あそべない…');
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
      setMessage('もう きれい!');
      return;
    }
    state.poopCount = 0;
    state.happiness = clamp(state.happiness + 5, 0, 100);
    state.actionCounts.clean += 1;
    state.affectionStreak = 0;
    state.travelStreak = 0;
    state.evoMeter = clamp(state.evoMeter + 6, 0, 100);
    state.devoMeter = clamp(state.devoMeter - 4, 0, 100);
    checkStoryEvents('poop-clean');
    if (!checkMeters()) {
      setMessage('おそうじ できた!');
    }
    emotePet('happy');
  }));

  el.sleepBtn.addEventListener('click', withFeedback(() => {
    state.isSleeping = !state.isSleeping;
    state.affectionStreak = 0;
    state.travelStreak = 0;
    if (state.isSleeping) {
      state.actionCounts.sleep += 1;
      // つぎの tick(最大 TICK_MS ぶん さき)まで まったない よう、
      // ねはじめた しゅんかんに その ばで すこし 元気を かいふくさせる
      // (びょうき中は ひかえめに)。これで「ねても すぐには 元気が
      // もどらない」体感の まちじかんを ほぼ なくしている
      state.energy = clamp(state.energy + (state.isSick ? 4 : 10), 0, 100);
      setMessage('おやすみなさい…');
      return;
    }
    state.evoMeter = clamp(state.evoMeter + 4, 0, 100);
    state.devoMeter = clamp(state.devoMeter - 3, 0, 100);
    if (!checkMeters()) {
      setMessage('おはよう!');
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
      state.evoMeter = clamp(state.evoMeter + 10, 0, 100);
      state.devoMeter = clamp(state.devoMeter - 6, 0, 100);
      state.lifetime.sicknessCured += 1;
      checkStoryEvents('medicine-cure');
      if (!checkMeters()) {
        setMessage('げんきに なった!');
      }
      emotePet('happy');
    } else {
      state.happiness = clamp(state.happiness - 10, 0, 100);
      state.health = clamp(state.health - 5, 0, 100);
      state.devoMeter = clamp(state.devoMeter + 12, 0, 100);
      if (!checkMeters()) {
        setMessage('びょうきじゃないのに… いやがっている');
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
  el.playWithBtn.addEventListener('click', withFeedback(() => {
    if (state.isSleeping) {
      setMessage('ねている… おきてから じゃれよう');
      return;
    }
    state.affectionStreak += 1;
    state.travelStreak = 0;
    state.actionCounts.pet += 1;
    state.actionCounts.talk += 1;
    const spammed = state.affectionStreak > AFFECTION_SPAM_THRESHOLD;
    if (spammed) {
      state.happiness = clamp(state.happiness - 5, 0, 100);
      state.devoMeter = clamp(state.devoMeter + 8, 0, 100);
    } else {
      state.happiness = clamp(state.happiness + 5, 0, 100);
      state.evoMeter = clamp(state.evoMeter + 2, 0, 100);
      state.devoMeter = clamp(state.devoMeter - 2, 0, 100);
      // じゃれるは、そばに いる なかま ぜんいんの bond も まとめて かいふく
      // する(なかまが はなれて いかないよう、ここで つなぎとめる)
      state.companions.forEach((c) => {
        c.bond = clamp((c.bond ?? 100) + COMPANION_PLAYWITH_BOND_BOOST, 0, 100);
      });
    }
    const hasCompanions = state.companions.length > 0;
    const reaction = spammed
      ? pickReaction([...PET_ANNOYED_REACTIONS, ...TALK_ANNOYED_REACTIONS, ...(hasCompanions ? COMPANION_ANNOYED_REACTIONS : [])], lastPlayWithReaction)
      : pickReaction([...PET_REACTIONS, ...TALK_REACTIONS, ...(hasCompanions ? [...COMPANION_PET_REACTIONS, ...COMPANION_TALK_REACTIONS] : [])], lastPlayWithReaction);
    lastPlayWithReaction = reaction;
    if (!checkMeters()) {
      setMessage(reaction);
    }
    emotePet(spammed ? 'angry' : 'happy');
  }));

  // すでに こいびとが いる ときは あたらしい あいてを さがしにいかず、
  // 今の こいびとと いちゃつく だけ(せいこう/しっぱいの 抽選なし) -
  // 一生のあいだ 1にん だけの、じみに おだやかな 恋愛システム
  el.courtBtn.addEventListener('click', withFeedback(() => {
    if (state.isSleeping) {
      setMessage('ねている… おきてから きゅうあいしよう');
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
        setMessage(`おおきな きもちの へんかを かんじた…じぶんは「${orientationLabel(resolvedOrientation, state.gender)}」なんだと、はっきり わかった気が する!`);
      }
      emotePet('fun');
      return;
    }

    if (state.partner) {
      state.happiness = clamp(state.happiness + 3, 0, 100);
      // いちゃつくたびに なかよし度が かいふくし、じゅうぶん つみかさなると
      // こいびとから 夫婦に しんてんする(すでに 夫婦なら なにも おきない)
      const justMarried = reinforceRelationship();
      if (justMarried) {
        state.evoMeter = clamp(state.evoMeter + 10, 0, 100);
        if (state.partner.id !== 'guest' && !state.lifetime.partnersMarried.includes(state.partner.id)) {
          state.lifetime.partnersMarried.push(state.partner.id);
        }
        if (!checkMeters()) {
          setMessage(`${state.partner.label}と けっこんした!💍 これからも ずっと いっしょ`);
        }
        emotePet('love');
        return;
      }
      const reaction = pickReaction(courtFlirtReactions(state.partner.label), lastCourtReaction);
      lastCourtReaction = reaction;
      if (!checkMeters()) {
        setMessage(reaction);
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
    const regionCandidates = findRegion(state.regionId).candidates;
    let candidate;
    if (state.guest && Math.random() < 0.6) {
      candidate = guestCandidate(state.guest);
    } else {
      candidate = regionCandidates[Math.floor(Math.random() * regionCandidates.length)];
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
    const flowerBonus = isEquipped('flower') ? 0.12 : 0;
    const successChance = clamp(0.35 + traitBonus + happinessBonus + flowerBonus, 0.15, 0.85);

    if (Math.random() < successChance) {
      state.partner = {
        id: candidate.id,
        label: candidate.label,
        emoji: candidate.emoji,
        gender: candidate.gender,
        orientationId: candidate.orientationId,
        affinityTrait: candidate.affinityTrait,
        affection: 100,
        married: false,
        bondCount: 0,
      };
      state.happiness = clamp(state.happiness + 8, 0, 100);
      state.evoMeter = clamp(state.evoMeter + 6, 0, 100);
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
      const reaction = pickReaction(COURT_SUCCESS_REACTIONS, lastCourtReaction);
      lastCourtReaction = reaction;
      if (!checkMeters()) {
        setMessage(`${candidate.emoji} ${candidate.label}と こいびとに なった!${reaction}`);
      }
      emotePet('love');
    } else {
      state.happiness = clamp(state.happiness - 3, 0, 100);
      state.devoMeter = clamp(state.devoMeter + 2, 0, 100);
      const reaction = pickReaction(COURT_FAIL_REACTIONS, lastCourtReaction);
      lastCourtReaction = reaction;
      if (!checkMeters()) {
        setMessage(reaction);
      }
      emotePet('sad');
    }
  }));

  // まいかい ちがう 地域が でるよう、今の 地域を のぞいて 抽選する
  el.travelBtn.addEventListener('click', withFeedback(() => {
    if (state.isSleeping) {
      setMessage('ねている… おきてから たびに でよう');
      return;
    }
    state.affectionStreak = 0;
    state.travelStreak += 1;
    // TRAVEL_SPAM_THRESHOLD を こえて 連続で たびに でると「たびづかれ」で
    // 機嫌の ボーナスが なくなり、逆に すこし へってしまう
    const spammedTravel = state.travelStreak > TRAVEL_SPAM_THRESHOLD;
    const candidates = REGIONS.filter((r) => r.id !== state.regionId);
    const region = candidates[Math.floor(Math.random() * candidates.length)];
    state.regionId = region.id;
    // じっせきの「せかい いっしゅう」用に、いちど でも おとずれた ことの
    // ある地域を えいきゅうに きろくしておく(「はじめから」しても きえない)
    if (!state.lifetime.regionsVisited.includes(region.id)) {
      state.lifetime.regionsVisited.push(region.id);
    }
    // たびは からだを つかう ので、元気/満腹が すこし へる(移動で つかれ、
    // ごはんの タイミングも のがす)
    state.energy = clamp(state.energy - 6, 0, 100);
    state.hunger = clamp(state.hunger - 4, 0, 100);
    if (spammedTravel) {
      state.happiness = clamp(state.happiness - 3, 0, 100);
    } else {
      state.happiness = clamp(state.happiness + 5, 0, 100);
    }
    const reaction = pickReaction(region.lines, lastTravelReaction);
    lastTravelReaction = reaction;
    if (!checkMeters()) {
      setMessage(spammedTravel
        ? `${region.emoji} ${region.label}に やってきた!でも たびづかれで ちょっと ぐったり…${reaction}`
        : `${region.emoji} ${region.label}に やってきた!${reaction}`);
    }
    emotePet(spammedTravel ? 'sad' : 'fun');
  }));

  el.resetBtn.addEventListener('click', withFeedback(() => {
    // 図鑑 and じっせき are cross-playthrough records, so they survive a
    // reset even though every other stat starts over from scratch
    const discoveredStages = state.discoveredStages;
    const lifetime = state.lifetime;
    // 古いセーブデータには resets フィールドが無いので || 0 で補う
    lifetime.resets = (lifetime.resets || 0) + 1;
    const achievementsUnlocked = state.achievementsUnlocked;
    state = freshState();
    state.discoveredStages = discoveredStages;
    state.lifetime = lifetime;
    state.achievementsUnlocked = achievementsUnlocked;
    // あたらしい たまごも、いままで であった なかま ぜんいんと bond100で
    // また いっしょに スタートする(まえの いっしょうで はなれて いった
    // なかまも、ここで リセットされて もどってくる)
    state.companions = lifetime.companionsRecruited.map((id) => ({ id, bond: 100 }));
    clearTimeout(storyFlashTimer);
    el.storyFlash.classList.add('hidden');
    endingCelebrationShown = false;
    el.gameClearOverlay.querySelectorAll('.ending-particle').forEach((p) => p.remove());
    el.gameClearOverlay.classList.remove('tier-1', 'tier-2', 'tier-3');
    setMessage('あたらしい たまごが やってきた…');
  }));

  el.gameClearFreePlayBtn.addEventListener('click', withFeedback(() => {
    // パーフェクトクリアの ごほうび: ゲームオーバー(STAGE.CLEAR)状態を
    // ぬけて 通常プレイに もどる。freePlay フラグを たてる ことで
    // checkMeters() の GOAL_DAYS 判定を もう トリガーしない ようにし、
    // おなじ 年齢の まま クリア画面が むげんループしないように している
    state.stage = STAGE.GROWING;
    state.freePlay = true;
    setMessage('これからは じゆうに あそべるよ!すきな すがたに 変身も できるよ');
    emotePet('happy');
  }));

  el.dexBtn.addEventListener('click', () => {
    dexOpen = true;
    render();
  });

  el.dexCloseBtn.addEventListener('click', () => {
    dexOpen = false;
    render();
  });

  // パーフェクトクリアの ごほうび「じゆうに あそぶ」中だけ、ずかんで
  // であった(known)すがたを タップすると すぐ その すがたに 変身できる。
  // triggerEvolutionJump()/triggerDevolutionJump() と おなじく、age も
  // その すがたの threshold に あわせて、進化バーなどの 表示が おかしく
  // ならないようにする。しゅぞく・せいちょうだけでなく、せいべつ・
  // れんあいタイプ・せいかく傾向も まるごと 新しい こせいとして
  // ロールしなおす(まったく べつの キャラに なりきる、という えんしゅつ)
  el.dexGrid.addEventListener('click', (e) => {
    if (!state.freePlay) return;
    const cell = e.target.closest('.dex-cell.known');
    if (!cell) return;
    const line = cell.dataset.line;
    const stageIndex = Number(cell.dataset.stage);
    const stage = SPECIES[line] && SPECIES[line].stages[stageIndex];
    if (!stage) return;
    state.speciesLine = line;
    state.stageIndex = stageIndex;
    state.age = stage.threshold;
    const breakupMessage = rerollIdentityAndBreakupIfNeeded(line);
    setMessage(`${stage.emoji} ${stage.label}に すがたを かえた!${breakupMessage}`);
    emotePet(breakupMessage ? 'sad' : 'happy');
    saveState();
    render();
  });

  el.achBtn.addEventListener('click', () => {
    achOpen = true;
    render();
  });

  el.achCloseBtn.addEventListener('click', () => {
    achOpen = false;
    render();
  });

  el.themeBtn.addEventListener('click', () => {
    themeOpen = true;
    render();
  });

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

  el.itemBtn.addEventListener('click', () => {
    itemOpen = true;
    render();
  });

  el.itemCloseBtn.addEventListener('click', () => {
    itemOpen = false;
    render();
  });

  el.shopItemGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.shop-item');
    if (!btn) return;
    buyOrEquipShopItem(btn.dataset.id);
  });

  el.profileBtn.addEventListener('click', () => {
    profileOpen = true;
    el.codeError.classList.add('hidden');
    render();
  });

  el.profileCloseBtn.addEventListener('click', () => {
    profileOpen = false;
    render();
  });

  el.makeCodeBtn.addEventListener('click', () => {
    if (!state.gender) return;
    el.myCodeBox.value = encodeGuestCode();
    el.myCodeBox.classList.remove('hidden');
    el.myCodeBox.focus();
    el.myCodeBox.select();
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

  function loop() {
    if (gameActive) {
      // still age/decay stats in the background, but don't touch the DOM
      // while a minigame owns the screen
      tick();
      saveState();
      return;
    }
    // messages clear themselves on their own timer (see setMessage) rather
    // than being wiped here, so a message's visible duration never depends
    // on how this tick's 3-second phase happens to line up with it
    tick();
    saveState();
    render();
  }

  // boot: resume exactly where the last save left off. Time never passes
  // while the page is closed - only this interval, while open, advances it.
  saveState();
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
