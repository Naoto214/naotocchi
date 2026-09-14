// なおとっち — めぐる(いまいる 地域の なかを あるきまわる)。
// script.js(本体)から installNaotocchiMeguru(S) で よびだされる。
// ・「たび」の 地域えらびは そのまま。その うえに「○○をめぐる」を のせる(地域の
//   いどうは かならず 本体の travelToRegion() を とおる。ここでは やらない)
// ・ぎじ 3D(canvas): カメラは じぶんの うしろ。むきは あるく むきに ゆっくり ついてくる。
//   え(キャラ・こもの)は いまの 2D 素材(PNG / 絵文字イラスト)の 立て看板
// ・ずかんに のった キャラ(すがた・なかま・レアなかま・こいびと)は ぜんいん、
//   どこかの 地域の せかいに「すんでいる」。ランダムに 数体 だけ 出す ことは しない。
//   すがた: せいたいに あう 地域に ていじゅう(HABITAT)。なかま: 日がわりで あそびに いく(たびびと)。
//   こいびと候補: はじめて であった 地域。いまの じぶんは プレイヤー、いまの なかま・こいびとは
//   おなじ 1体を「いっしょに あるく」あつかい(二重に 出さない)
// ・ナオトは かいきん(isAuthorUnlocked)ずみの セーブだけ、きおくのみずうみの おく(かくし ばしょ)に いる
// ・せかいは「スポットが みちで つながった ちず」(いりぐち → ひろば → えだわかれ → ループ・いきどまり・かくし みち)。
//   スポットごとに ひとの あつまりぐあいが ちがう(ひろばは にぎやか、こみちは しずか)
// ・つくり(2そう): 「せかい/シミュレーション」と「え(レンダラー)」を わけている。
//     せかい: WORLDS(スポット・みちの グラフ) / buildRegistry / buildWorld / chooseState / updateActor / talkLine /
//             createSimulation(いどう・むき(heading)・カメラの りぐ(yaw/dist)・あたりはんてい・スポットの はっけん・
//             じゅうみんの こうどう・であう・はなす)。ぜんぶ ワールド座標(x: よこ, z: おく)。がめんの px は しらない
//     え:     createCanvasRenderer(canvas ぎじ 3D)。sim.view() を うけとって えがくだけ。view の なかみは かきかえない。
//             おなじ view を うけとる three.js などの レンダラーに さしかえられる(start(container, { renderer }))
// S: clamp, lerp, escapeHtml, sfx, createMgCanvas, createTouchPad, createPadRow,
//    getState, currentEnvironment, findRegion, regionLabel, regionPlainLabel, selectedLocality, dailyKey,
//    SPECIES, speciesStageDesc, allCompanionsById, canonicalCompanionId, partners, partnerAsset, currentPetKey, playerGlyph,
//    isAuthorUnlocked, authorAsset, perfTier, onExit, openTravel, recordMet, recordTalk, recordSpot, discoveredSpots
(() => {
  'use strict';
  const root = typeof globalThis !== 'undefined' ? globalThis : window;
  root.installNaotocchiMeguru = function installNaotocchiMeguru(S) {
    const clamp = S.clamp || ((v, a, b) => Math.min(b, Math.max(a, v)));
    const lerp = S.lerp || ((a, b, t) => a + (b - a) * t);
    const escapeHtml = S.escapeHtml || ((s) => String(s));
    const sfx = typeof S.sfx === 'function' ? S.sfx : () => {};
    const getState = S.getState;
    const env = () => (typeof S.currentEnvironment === 'function' ? S.currentEnvironment() : { time: 'day', weather: 'sunny', season: 'spring', region: 'home' });
    const rnd = (a, b) => a + Math.random() * (b - a);
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const TAU = Math.PI * 2;
    const wrapAngle = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
    // きめうちの らんすう(おなじ かぎ → おなじ すう)。日がわりの いばしょ などに つかう
    function hash(str) { let h = 2166136261; const s = String(str); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
    const hrand = (str) => (hash(str) % 100000) / 100000;

    // ================= 世界(地域ごと): スポットと みちの グラフ =================
    // len: おくゆき。x は ±1000。spots: なまえの ある ばしょ { id, label, x, z, r, kind, crowd, prop?, landmark?, secret?, hub?, cam? }
    //   kind: plaza(ひろば) path(こみち) water(みずべ) rest(やすむ ばしょ) shelter(やねの した) shop(おみせ) grove(きの あいだ) edge(みはらし) deep(いちばん おく)
    //   crowd: ひとの あつまりやすさ(0〜8)。ひろば 6〜8、みずべ 3〜5、こみち 0〜1、かくし ばしょ 1
    //   secret: かくし ばしょ(みつけるまで ちずに のらない。じゅうみんは 1体だけ)
    //   landmark: とおくから みえる おおきな もの(bigtree / lighthouse / tower / waterfall / coral / bigstop / windmill / lodge / palms / peak / temple / bridge)
    // paths: [from, to, kind]。kind: wide(ひろい) path(ふつう) narrow(ほそい) secret(かくし みち)。ループも いきどまりも ある
    const NORMAL_REGIONS = ['home', 'city', 'countryside', 'forest', 'mountain', 'snow', 'sea', 'deepsea', 'river_lake', 'jungle', 'desert'];
    const PATH_HALF = { wide: 170, path: 120, narrow: 75, secret: 60 };
    const sp = (id, label, x, z, r, kind, crowd, extra) => Object.assign({ id, label, x, z, r, kind, crowd }, extra || {});
    const WORLDS = {
      home: { len: 2600, ground: ['#a9d98a', '#8fc574'], path: '#e5d5b0', props: ['🌸', '🪴', '🕊️', '🌳', '🌷', '🪵'],
        spots: [sp('gate', 'いえのまえ', 0, 250, 200, 'plaza', 1), sp('yard', 'にわ', 0, 780, 260, 'plaza', 7, { hub: true, prop: '🪴' }), sp('house', 'おうちのよこ', -620, 1050, 170, 'rest', 3, { prop: '🏠' }), sp('garden', 'はなばたけ', -700, 1600, 200, 'grove', 3, { prop: '🌷' }), sp('lane', 'こみち', 0, 1300, 170, 'path', 1), sp('park', 'こうえん', 0, 1850, 260, 'plaza', 6, { prop: '🛝' }), sp('shed', 'のきした', 620, 1050, 150, 'shelter', 3, { prop: '🛖' }), sp('bench', 'ベンチ', 700, 1550, 150, 'rest', 3, { prop: '🪑' }), sp('pond', 'ひみつのいけ', -420, 2150, 140, 'water', 1, { secret: true, prop: '💧' }), sp('bigtree', 'おおきなき', 0, 2380, 200, 'edge', 2, { landmark: 'bigtree', cam: 'wide' })],
        paths: [['gate', 'yard', 'wide'], ['yard', 'house'], ['house', 'garden'], ['yard', 'lane'], ['lane', 'park'], ['yard', 'shed'], ['shed', 'bench'], ['bench', 'park'], ['garden', 'park', 'narrow'], ['garden', 'pond', 'secret'], ['park', 'bigtree']] },
      city: { len: 2900, ground: ['#b9bcc4', '#9ea3ad'], path: '#d9d5cc', props: ['🏢', '🏬', '🚦', '💡', '🌳', '🚕', '🏪', '🎡'],
        spots: [sp('station', 'えきまえ', 0, 250, 220, 'plaza', 3, { prop: '🚉' }), sp('square', 'えきまえひろば', 0, 780, 280, 'plaza', 8, { hub: true, prop: '⛲' }), sp('arcade', 'しょうてんがい', -680, 1150, 200, 'shop', 5, { prop: '🏪' }), sp('alley', 'ろじうら', -740, 1700, 150, 'path', 1), sp('cats', 'ろじうらのねこのばしょ', -500, 2150, 140, 'rest', 1, { secret: true, prop: '🐈' }), sp('park', 'こうえん', 680, 1150, 240, 'plaza', 4, { prop: '🌳' }), sp('cafe', 'カフェどおり', 0, 1350, 180, 'shelter', 4, { prop: '☕' }), sp('lookout', 'てんぼうひろば', 0, 2000, 240, 'edge', 3, { cam: 'wide' }), sp('tower', 'とけいとう', 0, 2600, 220, 'edge', 2, { landmark: 'tower' }), sp('rooftop', 'やねのうえ', -950, 2450, 140, 'rest', 1, { secret: true })],
        paths: [['station', 'square', 'wide'], ['square', 'arcade'], ['arcade', 'alley', 'narrow'], ['alley', 'cats', 'secret'], ['square', 'park'], ['park', 'lookout'], ['square', 'cafe'], ['cafe', 'lookout'], ['lookout', 'tower'], ['alley', 'rooftop', 'secret']] },
      countryside: { len: 2900, ground: ['#b8d98a', '#8fbf6a'], path: '#d8c79a', props: ['🌾', '🌻', '🐄', '🚜', '🌳', '🦋', '🐓', '🏡'],
        spots: [sp('gate', 'むらのいりぐち', 0, 250, 200, 'plaza', 1), sp('village', 'むらのひろば', 0, 780, 280, 'plaza', 7, { hub: true, prop: '🏡' }), sp('field', 'はたけ', -680, 1150, 220, 'grove', 3, { prop: '🌾' }), sp('windmill', 'ふうしゃ', -640, 1750, 180, 'edge', 2, { landmark: 'windmill' }), sp('road', 'あぜみち', 0, 1300, 170, 'path', 1), sp('hill', 'ひなたのおか', 0, 1900, 260, 'plaza', 5, { prop: '🌻' }), sp('barn', 'なや', 680, 1150, 170, 'shelter', 3, { prop: '🏚️' }), sp('pasture', 'ぼくじょう', 700, 1700, 220, 'grove', 3, { prop: '🐄' }), sp('oldtree', 'おおきなき', 0, 2550, 200, 'edge', 2, { landmark: 'bigtree', cam: 'wide' }), sp('pond', 'かくれたためいけ', -950, 2250, 140, 'water', 1, { secret: true, prop: '💧' })],
        paths: [['gate', 'village', 'wide'], ['village', 'field'], ['field', 'windmill'], ['windmill', 'hill', 'narrow'], ['village', 'road'], ['road', 'hill'], ['village', 'barn'], ['barn', 'pasture'], ['pasture', 'hill'], ['hill', 'oldtree'], ['windmill', 'pond', 'secret']] },
      forest: { len: 2900, ground: ['#7fb26b', '#57894e'], path: '#b7a27a', props: ['🌲', '🌲', '🌳', '🍄', '🌿', '🌰', '🪵', '🦉'],
        spots: [sp('entry', 'もりのいりぐち', 0, 250, 200, 'plaza', 1), sp('clearing', 'もりのひろば', 0, 780, 280, 'plaza', 7, { hub: true, prop: '🪵' }), sp('brook', 'おがわ', -680, 1150, 200, 'water', 4, { prop: '💧' }), sp('bridge', 'はし', -640, 1650, 160, 'path', 1, { prop: '🌉' }), sp('mushroom', 'キノコのこみち', -380, 2100, 200, 'grove', 3, { prop: '🍄' }), sp('trail', 'こだち', 0, 1300, 160, 'path', 1), sp('deep', 'もりのおく', 0, 1950, 220, 'grove', 3), sp('hollow', 'きのうろ', 680, 1150, 160, 'shelter', 3, { prop: '🌳' }), sp('rest', 'きゅうけいばしょ', 700, 1650, 160, 'rest', 3, { prop: '🪵' }), sp('hiddenpond', 'かくれたいけ', -950, 1950, 130, 'water', 1, { secret: true, prop: '💧' }), sp('greattree', 'おおきなき', 0, 2600, 220, 'edge', 2, { landmark: 'bigtree', cam: 'wide' })],
        paths: [['entry', 'clearing', 'wide'], ['clearing', 'brook'], ['brook', 'bridge'], ['bridge', 'mushroom'], ['mushroom', 'deep', 'narrow'], ['clearing', 'trail'], ['trail', 'deep'], ['clearing', 'hollow'], ['hollow', 'rest'], ['rest', 'deep', 'narrow'], ['bridge', 'hiddenpond', 'secret'], ['deep', 'greattree']] },
      mountain: { len: 2900, ground: ['#a3a58d', '#7b7f6b'], path: '#c9bda0', props: ['⛰️', '🪨', '🌲', '🥾', '🏕️', '☁️', '🦅', '🪨'],
        spots: [sp('foot', 'ふもと', 0, 250, 200, 'plaza', 1), sp('camp', 'キャンプ', 0, 780, 260, 'shelter', 6, { hub: true, prop: '🏕️' }), sp('trail', 'やまみち', -680, 1200, 170, 'path', 1), sp('spring', 'おんせん', -680, 1800, 200, 'water', 4, { prop: '♨️' }), sp('ridge', 'おね', 0, 1450, 240, 'plaza', 4, { prop: '🪨' }), sp('summit', 'ちょうじょう', 0, 2550, 220, 'edge', 3, { landmark: 'peak', cam: 'wide' }), sp('cliff', 'がけのうえ', 680, 1200, 170, 'edge', 2, { prop: '🪨' }), sp('cave', 'かくれたどうくつ', 760, 1800, 150, 'shelter', 1, { secret: true, prop: '🕳️' }), sp('lake', 'やまのみずうみ', -300, 2250, 180, 'water', 2)],
        paths: [['foot', 'camp', 'wide'], ['camp', 'trail'], ['trail', 'spring'], ['spring', 'lake', 'narrow'], ['lake', 'summit', 'narrow'], ['camp', 'ridge'], ['ridge', 'summit'], ['camp', 'cliff'], ['cliff', 'cave', 'secret'], ['cliff', 'ridge', 'narrow']] },
      snow: { len: 2900, ground: ['#eef4fb', '#d3e0ee'], path: '#dfe7f0', props: ['❄️', '⛄', '🌲', '🏔️', '🧣', '🦌', '🛷', '🌨️'],
        spots: [sp('gate', 'ゆきのいりぐち', 0, 250, 200, 'plaza', 1), sp('field', 'ゆきはら', 0, 780, 300, 'plaza', 7, { hub: true, prop: '⛄' }), sp('lodge', 'ロッジ', -680, 1150, 200, 'rest', 5, { landmark: 'lodge' }), sp('icelake', 'こおりのみずうみ', -640, 1800, 240, 'water', 3, { prop: '🧊' }), sp('slope', 'げれんで', 0, 1400, 200, 'path', 2, { prop: '🎿' }), sp('peak', 'ゆきやま', 0, 2550, 220, 'edge', 2, { landmark: 'peak', cam: 'wide' }), sp('pines', 'まつばやし', 680, 1150, 200, 'grove', 3, { prop: '🌲' }), sp('cave', 'ゆきのどうくつ', 760, 1800, 150, 'shelter', 1, { secret: true, prop: '🕳️' }), sp('igloo', 'かまくら', -300, 2300, 150, 'shelter', 2, { prop: '🛖' })],
        paths: [['gate', 'field', 'wide'], ['field', 'lodge'], ['lodge', 'icelake'], ['icelake', 'igloo'], ['igloo', 'peak', 'narrow'], ['field', 'slope'], ['slope', 'peak'], ['field', 'pines'], ['pines', 'cave', 'secret'], ['pines', 'slope', 'narrow']] },
      sea: { len: 2900, ground: ['#f2e2b6', '#e2cf9a'], path: '#f7ecc9', props: ['🐚', '⛵', '🌴', '🏖️', '🦀', '☀️', '🐬', '🪸'],
        spots: [sp('beach', 'すなはま', 0, 250, 240, 'plaza', 2), sp('shore', 'なみうちぎわ', 0, 780, 300, 'plaza', 7, { hub: true, prop: '🌊' }), sp('tidepool', 'しおだまり', -680, 1200, 220, 'water', 4, { prop: '🪸' }), sp('pier', 'さんばし', 0, 1400, 200, 'path', 2, { prop: '⛵' }), sp('hut', 'うみのいえ', 0, 1950, 200, 'shelter', 4, { prop: '🏚️' }), sp('rocks', 'いわば', 680, 1200, 200, 'grove', 2, { prop: '🪨' }), sp('cape', 'みさき', 760, 1800, 200, 'edge', 2), sp('lighthouse', 'とうだい', 600, 2550, 220, 'edge', 2, { landmark: 'lighthouse', cam: 'wide' }), sp('cove', 'かくれたいりえ', -950, 1850, 140, 'water', 1, { secret: true }), sp('shells', 'かいがらのはま', -400, 2350, 160, 'plaza', 2, { prop: '🐚' })],
        paths: [['beach', 'shore', 'wide'], ['shore', 'tidepool'], ['tidepool', 'cove', 'secret'], ['tidepool', 'shells', 'narrow'], ['shore', 'pier'], ['pier', 'hut'], ['hut', 'shells', 'narrow'], ['shore', 'rocks'], ['rocks', 'cape'], ['cape', 'lighthouse'], ['hut', 'lighthouse', 'narrow']] },
      deepsea: { len: 2900, ground: ['#1f3f66', '#14294a'], path: '#2b4f78', props: ['🪸', '🫧', '🐙', '🦑', '⚓', '💡', '🐚', '🪼'],
        spots: [sp('reef', 'サンゴのいりぐち', 0, 250, 240, 'water', 2), sp('coralcity', 'サンゴのまち', 0, 780, 300, 'plaza', 7, { hub: true, landmark: 'coral' }), sp('kelp', 'こんぶのもり', -680, 1200, 240, 'grove', 3, { prop: '🌿' }), sp('wreck', 'ちんぼつせん', 680, 1200, 220, 'shelter', 4, { prop: '⚓' }), sp('glow', 'ひかるふかば', 0, 1450, 220, 'water', 3, { prop: '💡' }), sp('trench', 'かいこうのふち', 0, 2100, 220, 'water', 2), sp('abyss', 'いちばんふかいところ', 0, 2600, 200, 'deep', 1), sp('vent', 'あたたかいあな', -640, 1850, 200, 'rest', 3, { prop: '🫧' }), sp('cavern', 'ふねのうらのどうくつ', 950, 1850, 140, 'rest', 1, { secret: true })],
        paths: [['reef', 'coralcity', 'wide'], ['coralcity', 'kelp'], ['kelp', 'vent'], ['vent', 'trench', 'narrow'], ['coralcity', 'wreck'], ['wreck', 'cavern', 'secret'], ['wreck', 'glow', 'narrow'], ['coralcity', 'glow'], ['glow', 'trench'], ['trench', 'abyss', 'narrow']] },
      river_lake: { len: 2900, ground: ['#a9d38d', '#82b46f'], path: '#d3c39a', props: ['🌿', '🪷', '🦆', '🪨', '💧', '🐟', '🌳', '🌈'],
        spots: [sp('bank', 'かわぎし', 0, 250, 200, 'plaza', 1), sp('riverside', 'かわぎしのひろば', 0, 780, 280, 'plaza', 6, { hub: true }), sp('river', 'かわ', -680, 1150, 220, 'water', 4, { prop: '💧' }), sp('bridge', 'おおきなはし', -640, 1700, 180, 'path', 2, { landmark: 'bridge' }), sp('lake', 'みずうみ', -300, 2250, 300, 'water', 4, { prop: '🪷' }), sp('reeds', 'あしはら', 680, 1150, 220, 'grove', 2, { prop: '🌾' }), sp('boathouse', 'ふねごや', 700, 1700, 170, 'shelter', 3, { prop: '🛖' }), sp('path', 'かわぞいのみち', 0, 1350, 170, 'path', 1), sp('islet', 'ちいさなしま', 0, 2650, 150, 'edge', 1, { secret: true })],
        paths: [['bank', 'riverside', 'wide'], ['riverside', 'river'], ['river', 'bridge'], ['bridge', 'lake'], ['riverside', 'reeds'], ['reeds', 'boathouse'], ['boathouse', 'lake', 'narrow'], ['riverside', 'path'], ['path', 'lake'], ['lake', 'islet', 'secret']] },
      jungle: { len: 2900, ground: ['#5f9a58', '#3f7a45'], path: '#a08a5f', props: ['🌴', '🌺', '🦜', '🌿', '🍌', '🐍', '🌳', '🪨'],
        spots: [sp('entry', 'ジャングルのいりぐち', 0, 250, 200, 'plaza', 1), sp('clearing', 'ひらけたばしょ', 0, 780, 280, 'plaza', 6, { hub: true, prop: '🪵' }), sp('vines', 'つるのみち', -680, 1200, 180, 'path', 1), sp('falls', 'たき', -680, 1850, 220, 'water', 4, { landmark: 'waterfall' }), sp('canopy', 'おおきなきのした', 680, 1200, 200, 'shelter', 3, { prop: '🌳' }), sp('nest', 'すのあたり', 760, 1800, 170, 'rest', 2, { prop: '🪺' }), sp('ruins', 'いせき', 0, 1500, 240, 'plaza', 4, { prop: '🗿' }), sp('temple', 'おおきないせき', 0, 2550, 220, 'edge', 2, { landmark: 'temple', cam: 'wide' }), sp('behindfalls', 'たきのうら', -980, 2250, 140, 'rest', 1, { secret: true })],
        paths: [['entry', 'clearing', 'wide'], ['clearing', 'vines'], ['vines', 'falls'], ['falls', 'temple', 'narrow'], ['falls', 'behindfalls', 'secret'], ['clearing', 'canopy'], ['canopy', 'nest'], ['nest', 'temple', 'narrow'], ['clearing', 'ruins'], ['ruins', 'temple']] },
      desert: { len: 2900, ground: ['#e9cf95', '#d2b271'], path: '#f1dfb0', props: ['🌵', '🐫', '🪨', '☀️', '⛺', '🦎', '🌵', '🏜️'],
        spots: [sp('gate', 'さばくのいりぐち', 0, 250, 200, 'plaza', 1), sp('well', 'いどのひろば', 0, 780, 280, 'plaza', 6, { hub: true, prop: '🏺' }), sp('dunes', 'すなやま', -680, 1250, 200, 'path', 1), sp('oasis', 'オアシス', -680, 1850, 240, 'water', 5, { landmark: 'palms' }), sp('tent', 'テント', 680, 1200, 180, 'shelter', 4, { prop: '⛺' }), sp('cliff', 'がけのかげ', 760, 1800, 170, 'rest', 2, { prop: '🪨' }), sp('ruins', 'いしのいせき', 0, 1500, 240, 'plaza', 3, { prop: '🏛️' }), sp('pyramid', 'おおきないせき', 0, 2550, 220, 'edge', 2, { landmark: 'temple', cam: 'wide' }), sp('spring', 'かくれたいずみ', 980, 2300, 130, 'water', 1, { secret: true })],
        paths: [['gate', 'well', 'wide'], ['well', 'dunes'], ['dunes', 'oasis'], ['oasis', 'pyramid', 'narrow'], ['well', 'tent'], ['tent', 'cliff'], ['cliff', 'spring', 'secret'], ['cliff', 'pyramid', 'narrow'], ['well', 'ruins'], ['ruins', 'pyramid']] },
      star_stop: { len: 2700, ground: ['#4a3f86', '#2b2460'], path: '#9d8ff0', props: ['⭐', '🌙', '✨', '🪐', '☁️', '🌟', '💫'],
        spots: [sp('stop', 'ていりゅうじょ', 0, 250, 240, 'plaza', 3, { landmark: 'bigstop' }), sp('platform', 'まちあいのひろば', 0, 780, 280, 'plaza', 6, { hub: true, prop: '🏮' }), sp('bench', 'ほしをみるベンチ', -680, 1200, 180, 'rest', 3, { prop: '🪑' }), sp('farisle', 'とおいうきしま', -640, 1850, 200, 'edge', 2, { prop: '🪐' }), sp('cloudpath', 'くものみち', 0, 1400, 200, 'path', 2, { prop: '🏮' }), sp('nextstop', 'つぎのていりゅうじょ', 0, 2200, 220, 'shelter', 4, { prop: '🚏' }), sp('islet', 'ちいさなうきしま', 680, 1200, 200, 'grove', 2, { prop: '⭐' }), sp('secretview', 'ひみつのてんぼうだい', 800, 1900, 160, 'edge', 1, { secret: true, prop: '🔭', cam: 'wide' }), sp('edge', 'そらのはて', 0, 2600, 160, 'edge', 1)],
        paths: [['stop', 'platform', 'wide'], ['platform', 'bench'], ['bench', 'farisle'], ['farisle', 'nextstop', 'narrow'], ['platform', 'cloudpath'], ['cloudpath', 'nextstop'], ['platform', 'islet'], ['islet', 'secretview', 'secret'], ['nextstop', 'edge', 'narrow']] },
      memory_lake: { len: 2800, ground: ['#6f7a9a', '#53577a'], path: '#8b90b0', props: ['🌫️', '🪨', '🌿', '💧', '🕯️', '🍃'],
        spots: [sp('shore', 'みずうみのほとり', 0, 250, 240, 'plaza', 2, { hub: true }), sp('willow', 'やなぎのした', -620, 900, 200, 'shelter', 3, { prop: '🌳' }), sp('water', 'しずかなみずも', 450, 1100, 260, 'water', 3, { prop: '💧' }), sp('path', 'きりのこみち', 0, 1450, 180, 'path', 1, { prop: '🌫️' }), sp('stones', 'つみいし', -560, 1750, 170, 'rest', 2, { prop: '🪨' }), sp('lantern', 'ともしびのおか', 500, 1850, 160, 'rest', 1, { prop: '🕯️' }), sp('deep', 'みずうみのおく', 0, 2500, 140, 'deep', 0, { secret: true, prop: '🕯️', cam: 'near' })],
        paths: [['shore', 'willow'], ['shore', 'water'], ['shore', 'path'], ['path', 'deep', 'secret'], ['willow', 'stones'], ['stones', 'deep', 'secret'], ['water', 'lantern'], ['lantern', 'path', 'narrow']] },
    };
    // 地域ごとの みための データ(レンダラーが よむ。ぜんぶ せかい たんい・いろ・しゅるい の 指定だけ)
    //   backdrop: 地平線の おくに みえる シルエット(えんけい)  lane: こみちの わきの ちいさな もの(てまえ)
    //   wall: みちの りょうわきに ならぶ おおきな もの(さきが みえない ようにする しゃへいぶつ)
    //   marks: じめんの もよう  sky: そらの えんしゅつ  floor: platform = うかんだ あしば  ambience: かんきょうおん(しょうらい ようの めじるし)
    const WORLD_STYLE = {
      home: { backdrop: 'hills', lane: ['🌷', '🪴', '🪵', '🌼', '🐾', '🪧'], wall: ['🌳', '🏠', '🌳'], marks: { color: '#7fbf5f', kind: 'tuft' }, ambience: 'garden' },
      city: { backdrop: 'skyline', lane: ['🚦', '💡', '🪧', '🚧', '🗑️', '🚲'], wall: ['🏢', '🏬', '🏢', '🌳'], marks: { color: '#8d919a', kind: 'stone' }, ambience: 'city' },
      countryside: { backdrop: 'hills', lane: ['🌾', '🌻', '🪨', '🐓', '🪵', '🪧'], wall: ['🌳', '🌾', '🌳'], marks: { color: '#86b85a', kind: 'tuft' }, ambience: 'meadow' },
      forest: { backdrop: 'treeline', lane: ['🍄', '🌿', '🪵', '🌰', '🪨', '🌱'], wall: ['🌲', '🌳', '🌲'], marks: { color: '#4f8a45', kind: 'tuft' }, ambience: 'forest' },
      mountain: { backdrop: 'peaks', lane: ['🪨', '🌲', '🪧', '🥾', '🏕️', '🌼'], wall: ['🪨', '🌲', '🪨'], marks: { color: '#8a8d78', kind: 'stone' }, ambience: 'wind' },
      snow: { backdrop: 'snowpeaks', lane: ['❄️', '⛄', '🧊', '🪵', '🌲', '🛷'], wall: ['🌲', '🌲', '🪨'], marks: { color: '#ffffff', kind: 'sparkle' }, ambience: 'snowwind' },
      sea: { backdrop: 'seahorizon', lane: ['🐚', '🦀', '⛱️', '🪸', '🌴', '🏄'], wall: ['🌴', '🪨', '🌴'], marks: { color: '#f8efd0', kind: 'stone' }, ambience: 'waves' },
      deepsea: { backdrop: 'abyss', sky: 'bubbles', lane: ['🪸', '🫧', '🐚', '🪼', '💡', '⚓'], wall: ['🪸', '🪨', '🪸'], marks: { color: '#5aa5d8', kind: 'sparkle' }, ambience: 'underwater' },
      river_lake: { backdrop: 'lakehills', lane: ['🪷', '🌿', '🪨', '🦆', '🐟', '🎣'], wall: ['🌳', '🌾', '🌳'], marks: { color: '#7fbf6a', kind: 'tuft' }, ambience: 'stream' },
      jungle: { backdrop: 'treeline', lane: ['🌺', '🌿', '🍌', '🪨', '🦜', '🌱'], wall: ['🌴', '🌳', '🌴'], marks: { color: '#3f8a3f', kind: 'tuft' }, ambience: 'jungle' },
      desert: { backdrop: 'dunes', lane: ['🌵', '🪨', '🦎', '⛺', '🏺', '🐫'], wall: ['🪨', '🌵', '🪨'], marks: { color: '#e8d29a', kind: 'stone' }, ambience: 'desertwind' },
      star_stop: { backdrop: 'skystops', sky: 'stars', floor: { kind: 'platform', half: 960 }, lane: ['🏮', '⭐', '🪑', '🔭', '🌟', '🏮'], wall: ['☁️', '🌙', '☁️'], marks: { color: '#ffe9a8', kind: 'sparkle' }, glowPath: true, ambience: 'space' },
      memory_lake: { backdrop: 'mist', sky: 'mist', lane: ['🕯️', '🌿', '🪨', '🍃', '💧', '🕯️'], wall: ['🌫️', '🌳', '🌫️'], marks: { color: '#9aa3c8', kind: 'sparkle' }, ambience: 'still' },
    };
    for (const id in WORLD_STYLE) Object.assign(WORLDS[id], WORLD_STYLE[id]);
    // げんざいち(おうちに 市区町村を かさねる)は 地域 id を ふやさず、おうちの せかいの「まちの かんじ」だけを かえる
    const LOCAL_FLAVOR = {
      metropolis: { props: ['🏢', '🚦', '💡', '🌳', '🚕'], label: '都会のまち', backdrop: 'skyline', wall: ['🏢', '🌳', '🏬'] },
      harbor: { props: ['⚓', '⛵', '🐚', '🌊', '🏠'], label: '港のまち', backdrop: 'seahorizon', wall: ['🏠', '🌴', '🪨'] },
      basin: { props: ['⛰️', '🌲', '🏡', '🌾', '☁️'], label: '山あいのまち', backdrop: 'peaks', wall: ['🌲', '🏡', '🪨'] },
      town: { props: ['🏠', '🌳', '🏪', '🚲', '🌷'], label: 'まちなか', wall: ['🏠', '🌳', '🏪'] },
    };
    // スポットの しゅるい ごとの カメラ(せかい たんい の きょり と たかさの わりあい)。急に かわらず なめらかに ほかんする
    const CAM_PROFILES = { default: { dist: 430, height: 1 }, plaza: { dist: 500, height: 1.06 }, path: { dist: 400, height: 1 }, narrow: { dist: 350, height: 0.94 }, edge: { dist: 560, height: 1.18 }, wide: { dist: 600, height: 1.24 }, near: { dist: 340, height: 0.92 }, secret: { dist: 350, height: 0.95 } };

    // ================= すがた(しゅぞく×だんかい)の すみか =================
    // それぞれの しゅぞくが「らしい」地域に ていじゅう。8だんかいは この リストを じゅんに めぐる
    // (サケ など、そだつと すみかが かわる ことに いみが ある しゅぞくは だんかいで 地域が かわる)
    const HABITAT = {
      man: ['home', 'city', 'countryside'], woman: ['home', 'city', 'countryside'], dog: ['home', 'countryside', 'city'], cat: ['home', 'city', 'countryside'],
      penguin: ['snow', 'sea'], turtle: ['sea', 'river_lake'], frog: ['river_lake', 'countryside'], salmon: ['river_lake', 'sea'], clownfish: ['sea', 'deepsea'],
      butterfly: ['countryside', 'forest'], beetle: ['forest', 'jungle'], stagbeetle: ['forest', 'jungle'], cicada: ['forest', 'countryside'], antlion: ['desert'],
      hermit_crab: ['sea'], jellyfish: ['deepsea', 'sea'], starfish: ['sea'], coral: ['deepsea', 'sea'], dandelion: ['countryside', 'home'], sakura: ['home', 'countryside'],
      venus_flytrap: ['jungle'], mushroom: ['forest'],
      dragon: ['mountain'], phoenix: ['desert', 'mountain', 'star_stop'], god: ['mountain', 'star_stop'], world_tree: ['forest'], ghost: ['forest', 'home', 'memory_lake'], star: ['mountain', 'snow', 'star_stop'], plush: ['home'], unknown: ['deepsea', 'star_stop'],
      ren: ['home', 'city'],
    };
    const WATER_LINES = new Set(['salmon', 'clownfish', 'jellyfish', 'starfish', 'coral', 'hermit_crab', 'turtle', 'frog', 'unknown']);
    const PLANT_LINES = new Set(['dandelion', 'sakura', 'venus_flytrap', 'mushroom', 'world_tree', 'coral']);
    const NIGHT_LINES = new Set(['ghost', 'star']);
    const NIGHT_COMPANIONS = new Set(['bat', 'owl', 'watcher']);

    // ================= じゅうみん だいちょう =================
    // ずかんに のった キャラを ぜんいん、1体ずつ「どこの 地域に すむか」を きめる。
    // すがた: ずかんの 1コマ(しゅぞく:だんかい)= 1体。せいたいに あう 地域に ていじゅう。いまの じぶんの 1コマは のぞく
    // なかま: たびびと。日がわりで どこかの 通常地域へ あそびに いく(すきな 地域が あれば そこへ でやすい)。
    //         おなじ 日の あいだは なんど はいっても おなじ 地域。いま つれている なかまは いっしょに あるく
    // こいびと: はじめて であった 地域に すむ。いまの こいびとは いっしょに あるく
    // ナオト: かいきんずみ の ときだけ、きおくのみずうみの おく(べつ管理)
    function buildRegistry() {
      const state = getState();
      const lifetime = state.lifetime || {};
      const list = [];
      const petKey = typeof S.currentPetKey === 'function' ? S.currentPetKey() : null;
      const day = typeof S.dailyKey === 'function' ? S.dailyKey() : '';
      for (const key of state.discoveredStages || []) {
        if (key === petKey) continue;
        const [line, stStr] = String(key).split(':'); const stage = Number(stStr);
        const spc = S.SPECIES && S.SPECIES[line]; const st = spc && spc.stages && spc.stages[stage];
        if (!st) continue;
        const hab = HABITAT[line] || ['home'];
        list.push({ key: 'form:' + key, kind: 'form', line, stage, label: st.label, emoji: st.emoji, asset: st.asset, sprites: { front: st.asset }, region: hab[stage % hab.length],
          water: WATER_LINES.has(line), plant: PLANT_LINES.has(line), night: NIGHT_LINES.has(line) });
      }
      const canon = typeof S.canonicalCompanionId === 'function' ? S.canonicalCompanionId : (id) => id;
      const withIds = new Set((state.companions || []).map((c) => canon(c.id)));
      const seen = new Set();
      for (const id of [...(lifetime.companionsRecruited || []), ...(lifetime.rareCompanionsRecruited || [])]) {
        const def = typeof S.allCompanionsById === 'function' ? S.allCompanionsById(id) : null;
        if (!def || seen.has(def.id)) continue; seen.add(def.id);
        const withPlayer = withIds.has(def.id);
        // たびびと: 日がわり。すきな 地域(preferredRegions)は 4ばい でやすい
        let region = state.regionId || 'home';
        if (!withPlayer) {
          const pref = Array.isArray(def.preferredRegions) ? def.preferredRegions.filter((r) => NORMAL_REGIONS.includes(r)) : [];
          const pool = []; for (const r of NORMAL_REGIONS) { const w = pref.includes(r) ? 4 : 1; for (let i = 0; i < w; i++) pool.push(r); }
          region = pool[hash(def.id + ':' + day) % pool.length];
        }
        list.push({ key: 'companion:' + def.id, kind: 'companion', id: def.id, label: def.name, emoji: def.emoji, asset: def.asset, sprites: { front: def.asset }, region, withPlayer, rare: !!def.vibe, night: NIGHT_COMPANIONS.has(def.id) });
      }
      const partners = S.partners || [];
      const cur = state.partner ? String(state.partner.id) : null;
      for (const id of lifetime.partnersRecorded || []) {
        const p = partners.find((c) => c.id === id); if (!p) continue;
        const withPlayer = cur === id;
        const asset = typeof S.partnerAsset === 'function' ? S.partnerAsset(id) : null;
        list.push({ key: 'partner:' + id, kind: 'partner', id, label: p.label, emoji: p.emoji, asset, sprites: { front: asset },
          region: withPlayer ? (state.regionId || 'home') : (p.firstRegion || 'home'), withPlayer, hook: p.hook || '' });
      }
      const naoto = typeof S.isAuthorUnlocked === 'function' && S.isAuthorUnlocked() ? { key: 'naoto', kind: 'naoto', id: 'naoto', label: 'ナオト', emoji: '🧑', asset: S.authorAsset || null, sprites: { front: S.authorAsset || null }, region: 'memory_lake', spot: 'deep', secret: true } : null;
      return { residents: list, naoto, byRegion: (regionId) => list.filter((r) => r.region === regionId) };
    }

    // ================= グラフ(スポットと みち) =================
    const spotById = (world, id) => world.spots.find((s) => s.id === id) || null;
    // みちを せんぶん の リストに(ワールド座標)。secret も ふくむ
    function pathSegments(base) {
      const segs = [];
      for (const [a, b, kind] of base.paths || []) { const A = base.spots.find((s) => s.id === a), B = base.spots.find((s) => s.id === b); if (!A || !B) continue; segs.push({ a: A, b: B, kind: kind || 'path', half: PATH_HALF[kind || 'path'] || PATH_HALF.path, len: Math.hypot(B.x - A.x, B.z - A.z) }); }
      return segs;
    }
    // てんから いちばん ちかい みち: { dist, half, dir(こみちの むき、ラジアン), seg }
    function nearestPath(pt, world) {
      let best = null;
      for (const s of world.segments) {
        const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z, L2 = dx * dx + dz * dz || 1;
        const t = clamp(((pt.x - s.a.x) * dx + (pt.z - s.a.z) * dz) / L2, 0, 1);
        const px = s.a.x + dx * t, pz = s.a.z + dz * t; const d = Math.hypot(pt.x - px, pt.z - pz);
        if (!best || d - s.half < best.dist - best.half) best = { dist: d, half: s.half, dir: Math.atan2(dx, dz), seg: s, t };
      }
      return best;
    }
    const onPath = (pt, world) => { const n = nearestPath(pt, world); return !!n && n.dist <= n.half; };
    // スポットの グラフを たどる(ちずの データ・テスト用)
    function reachableSpots(base, fromId) {
      const seen = new Set([fromId]); const q = [fromId];
      while (q.length) { const cur = q.shift(); for (const [a, b] of base.paths || []) { const o = a === cur ? b : b === cur ? a : null; if (o && !seen.has(o)) { seen.add(o); q.push(o); } } }
      return seen;
    }

    // ================= せかいを たてる =================
    // スポットへの ふりわけ: crowd(あつまりやすさ)× かんきょう × しゅぞくの せいやく の おもみで きめる。
    // ひろばは にぎやか、こみちは しずか、かくし ばしょは 1体だけ。ひろば(hub)には かならず なんにんか いる
    function spotWeights(res, spots, e) {
      return spots.map((s) => {
        if (s.kind === 'deep' || s.secret) return 0;
        if (res.water) return s.kind === 'water' ? Math.max(1, s.crowd) : 0;
        if (res.plant) return s.kind === 'grove' ? Math.max(1, s.crowd) * 1.5 : s.kind === 'plaza' || s.kind === 'path' ? Math.max(0.5, s.crowd) : 0;
        let w = Math.max(0.3, s.crowd);
        if (e.weather === 'rain') w *= s.kind === 'shelter' || s.kind === 'rest' ? 3 : s.kind === 'plaza' || s.kind === 'edge' ? 0.4 : 1;
        if (e.time === 'night' && !res.night) w *= s.kind === 'rest' || s.kind === 'shelter' ? 3 : s.kind === 'plaza' ? 0.5 : s.kind === 'edge' ? 0.3 : 1;
        if (e.time === 'night' && res.night) w *= s.kind === 'edge' || s.kind === 'grove' ? 2 : 1;
        if (e.time === 'evening') w *= s.kind === 'edge' ? 2.2 : 1;
        if (e.time === 'morning') w *= s.kind === 'path' || s.kind === 'water' ? 1.6 : 1;
        if (s.kind === 'shop') w *= e.time === 'day' ? 1.4 : 0.7;
        return w;
      });
    }
    function weightedIndex(weights, seed) {
      const total = weights.reduce((a, b) => a + b, 0); if (total <= 0) return -1;
      let r = hrand(seed) * total; for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return i; } return weights.length - 1;
    }
    function buildWorld(regionId, registry, opts = {}) {
      const base = WORLDS[regionId] || WORLDS.home;
      const e = env();
      const day = typeof S.dailyKey === 'function' ? S.dailyKey() : '';
      const local = regionId === 'home' && opts.locality && LOCAL_FLAVOR[opts.locality.profileId] ? LOCAL_FLAVOR[opts.locality.profileId] : null;
      const world = { regionId, len: base.len, ground: base.ground, path: base.path, spots: base.spots, paths: base.paths, props: [], marks: [], residents: [], local,
        backdrop: (local && local.backdrop) || base.backdrop || 'hills', lane: base.lane || [], wall: (local && local.wall) || base.wall || ['🌳'], sky: base.sky || null, floor: base.floor || null, glowPath: !!base.glowPath,
        markStyle: base.marks || { color: '#88aa66', kind: 'tuft' }, ambience: base.ambience || null, entry: base.spots[0], hub: base.spots.find((s) => s.hub) || base.spots[1] || base.spots[0] };
      world.segments = pathSegments(base);
      const nearSpot = (x, z, pad) => base.spots.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + (pad || 0));
      const propPool = local ? local.props.concat(base.props.slice(0, 3)) : base.props;
      // えんけい〜ちゅうけい: りょうはしの おおきな もの(き・たてもの など)
      const nProps = 18 + Math.floor(base.len / 130);
      for (let i = 0; i < nProps; i++) {
        const seed = regionId + ':prop:' + i;
        const z = 120 + hrand(seed + 'z') * (base.len - 200);
        const side = i % 2 === 0 ? -1 : 1;
        const x = side * (820 + hrand(seed + 'x') * 240);
        if (nearSpot(x, z, 20)) continue;
        world.props.push({ emoji: propPool[hash(seed) % propPool.length], x, z, size: 100 + hrand(seed + 'k') * 56, layer: 'side' });
      }
      // しゃへいぶつ: みちの りょうわきに ならぶ おおきな もの。あいだが あいていて、さきは みえたり みえなかったり
      const wallPool = world.wall;
      for (const s of world.segments) {
        const n = Math.max(1, Math.round(s.len / 200)); const dx = (s.b.x - s.a.x) / s.len, dz = (s.b.z - s.a.z) / s.len; const nx = -dz, nz = dx;
        for (let i = 0; i <= n; i++) {
          for (const side of [-1, 1]) {
            const seed = regionId + ':wall:' + s.a.id + s.b.id + i + side;
            if (hrand(seed + 'p') > (s.kind === 'secret' ? 0.9 : 0.72)) continue;
            const t = (i + 0.5 * hrand(seed + 't')) / (n + 0.5); const off = s.half + 70 + hrand(seed + 'o') * 50;
            const x = s.a.x + (s.b.x - s.a.x) * t + nx * off * side, z = s.a.z + (s.b.z - s.a.z) * t + nz * off * side;
            if (Math.abs(x) > 1000 || z < 80 || z > base.len - 60 || nearSpot(x, z, 30)) continue;
            world.props.push({ emoji: wallPool[hash(seed) % wallPool.length], x, z, size: 130 + hrand(seed + 'k') * 50, layer: 'wall', solid: true });
          }
        }
      }
      // かくし ばしょの まわりは しゃへいぶつで かこう(みちの むき いがい)
      for (const s of base.spots) if (s.secret) {
        const link = world.segments.find((g) => g.a === s || g.b === s); const other = link ? (link.a === s ? link.b : link.a) : null;
        const ang0 = other ? Math.atan2(other.x - s.x, other.z - s.z) : 0;
        for (let k = 0; k < 4; k++) { const ang = ang0 + Math.PI * 0.5 + k * (Math.PI / 3); const x = s.x + Math.sin(ang) * (s.r + 60), z = s.z + Math.cos(ang) * (s.r + 60); if (Math.abs(x) > 1000 || z < 80 || z > base.len - 60) continue; world.props.push({ emoji: wallPool[hash(s.id + k) % wallPool.length], x, z, size: 150, layer: 'wall', solid: true }); }
      }
      // てまえ: こみちの わきの ちいさな もの(あるいている ばしょが わかる)
      const lanePool = world.lane.length ? world.lane : propPool;
      for (const s of world.segments) {
        const n = Math.max(1, Math.round(s.len / 150)); const dx = (s.b.x - s.a.x) / s.len, dz = (s.b.z - s.a.z) / s.len; const nx = -dz, nz = dx;
        for (let i = 0; i < n; i++) {
          const seed = regionId + ':lane:' + s.a.id + s.b.id + i; const side = (i + Math.floor(hrand(seed + 's') * 2)) % 2 === 0 ? -1 : 1;
          const t = (i + 0.3 + hrand(seed + 't') * 0.4) / n; const off = s.half + 18 + hrand(seed + 'o') * 24;
          const x = s.a.x + (s.b.x - s.a.x) * t + nx * off * side, z = s.a.z + (s.b.z - s.a.z) * t + nz * off * side;
          if (Math.abs(x) > 1000 || z < 60) continue;
          world.props.push({ emoji: lanePool[(i + hash(seed)) % lanePool.length], x, z, size: 52 + hrand(seed + 'k') * 30, layer: 'lane' });
        }
      }
      // ランドマーク・スポットの めじるし(おおきめ。あたりはんてい あり)
      for (const s of base.spots) {
        if (s.landmark) world.props.push({ landmark: s.landmark, emoji: s.prop || '🌳', x: s.x, z: s.z + s.r * 0.8, size: 300, spot: true, solid: true, layer: 'landmark', label: s.label });
        else if (s.prop) world.props.push({ emoji: s.prop, x: s.x + (s.x < 0 ? -s.r - 30 : s.r + 30) * (s.kind === 'deep' ? 0 : 1), z: s.z + 30, size: 150, spot: true, solid: true, layer: 'landmark' });
      }
      // じめんの もよう(くさ・こいし・きらめき)
      const nMarks = 60 + Math.floor(base.len / 40);
      for (let i = 0; i < nMarks; i++) {
        const seed = regionId + ':mark:' + i;
        world.marks.push({ x: (hrand(seed + 'x') - 0.5) * 1900, z: 60 + hrand(seed + 'z') * (base.len - 100), size: 10 + hrand(seed + 'k') * 14, phase: hrand(seed + 'f') * 6.28 });
      }
      // じゅうみんの ふりわけ(むらの ある はいち: にぎやかな ばしょ と しずかな ばしょ)
      const all = registry.byRegion(regionId).filter((r) => !r.withPlayer);
      const assign = new Map();
      all.forEach((r) => { const seed = r.key + '@' + regionId + '#' + e.time + e.weather + (r.kind === 'companion' ? day : ''); const w = spotWeights(r, base.spots, e); const i = weightedIndex(w, seed); assign.set(r.key, i >= 0 ? base.spots[i] : world.hub); });
      // ひろば(hub)には かならず なんにんか(6人 か 3ぶんの1 まで)
      const hub = world.hub; const wantHub = Math.min(6, Math.ceil(all.length / 3));
      let atHub = [...assign.values()].filter((s) => s === hub).length;
      for (const r of all) { if (atHub >= wantHub) break; if (r.water || r.plant || assign.get(r.key) === hub) continue; assign.set(r.key, hub); atHub++; }
      // かくし ばしょには 1体だけ(4人 いじょう いる ときだけ。みずべなら みずの こ)
      if (all.length >= 4) for (const s of base.spots) if (s.secret && s.kind !== 'deep') {
        const cands = all.filter((r) => (s.kind === 'water' ? r.water : !r.water && !r.plant) && assign.get(r.key) !== hub);
        if (cands.length) { const c = cands[hash(s.id + regionId + day) % cands.length]; assign.set(c.key, s); }
      }
      // スポットの なかでは 1〜2つの かたまり(グループ)に なって たつ
      const perSpot = new Map();
      all.forEach((r) => {
        const s = assign.get(r.key); const seed = r.key + '@' + regionId + '#' + day;
        const k = perSpot.get(s.id) || 0; perSpot.set(s.id, k + 1);
        const cl = hash(seed + 'c') % 2; const ca = hrand(s.id + cl + regionId) * TAU, cd = s.r * (0.2 + 0.3 * hrand(s.id + cl + 'd'));
        const cx = s.x + Math.sin(ca) * cd, cz = s.z + Math.cos(ca) * cd;
        const ja = hrand(seed + 'a') * TAU, jd = hrand(seed + 'd') * s.r * 0.42;
        world.residents.push(makeActor(r, { x: clamp(cx + Math.sin(ja) * jd, -980, 980), z: clamp(cz + Math.cos(ja) * jd * 0.7, 80, base.len - 80), spot: s, heading: hrand(seed + 'h') * TAU - Math.PI }));
      });
      if (registry.naoto && registry.naoto.region === regionId) {
        const spot = base.spots.find((s) => s.kind === 'deep') || base.spots[base.spots.length - 1];
        world.residents.push(makeActor(registry.naoto, { x: spot.x, z: spot.z, spot, fixed: true, heading: Math.PI }));
      }
      // あたりはんてい: かたい もの(しゃへいぶつ・めじるし・ランドマーク)
      world.obstacles = world.props.filter((p) => p.solid).map((p) => ({ x: p.x, z: p.z, r: p.layer === 'landmark' ? 70 : 44 }));
      return world;
    }
    // いっしょに あるく なかま・こいびと(この せかいの じゅうみんとしては おかず、プレイヤーの そばに いる)
    function companionsOf(registry) { return registry.residents.filter((r) => r.withPlayer).map((r, i) => makeActor(r, { x: 0, z: 0, follow: true, slot: i, heading: 0 })); }

    // heading: むいている むき(ラジアン、0 = +z おく、+ = ひだりまわりに x+)。レンダラーは カメラの むきとの さで まえ/よこ/うしろ の え を えらぶ
    // sprites: { front, side?, back? } しょうらい ほうこう べつの えを たせる(いまは front だけ。よこは はんてん、うしろは すこし つぶして えがく)
    function makeActor(res, pos) {
      return Object.assign({}, res, { x: pos.x, z: pos.z, spot: pos.spot || null, fixed: !!pos.fixed, follow: !!pos.follow, slot: pos.slot || 0,
        state: 'idle', until: rnd(0.5, 2.5), tx: pos.x, tz: pos.z, heading: pos.heading || 0, face: 1, bob: rnd(0, 6), say: null, sayFor: 0, chatWith: null, chaseOf: null, met: false, tilt: 0 });
    }

    // ================= せいかつ(かんたんな じょうたい せんい と グループ こうどう) =================
    const VERBS = { idle: 'たたずんでいる', walk: 'あるいている', sit: 'すわっている', look: 'あたりを見ている', chat: 'はなしている', sleep: 'ねむっている', swim: 'およいでいる', sway: 'ゆれている', play: 'あそんでいる', watch: 'けしきを見ている', fish: 'つりをしている', rest: 'やすんでいる', gather: 'あつまっている', chase: 'おいかけっこしている', shop: 'おみせを見ている' };
    const MOVING = new Set(['walk', 'swim', 'play', 'chase']);
    function chooseState(a, e, world, others) {
      if (a.fixed) return 'watch';
      if (a.plant) return 'sway';
      if (a.water) return Math.random() < 0.7 ? 'swim' : 'idle';
      const night = e.time === 'night';
      const rain = e.weather === 'rain';
      const r = Math.random();
      const kind = a.spot ? a.spot.kind : 'path';
      if (night && !a.night) return r < 0.55 ? 'sleep' : r < 0.8 ? 'rest' : 'look';
      if (rain) return r < 0.5 ? 'rest' : r < 0.75 ? 'look' : 'walk';
      // ばしょ ごとの「なにか おきている」
      const mates = others ? others.filter((b) => b !== a && b.spot === a.spot && !b.fixed && !b.plant && !b.water).length : 0;
      if (kind === 'water' && r < 0.35) return 'fish';
      if (kind === 'shop' && r < 0.45) return 'shop';
      if (kind === 'edge' && r < 0.45) return 'watch';
      if (kind === 'rest' && r < 0.45) return r < 0.25 ? 'sit' : 'rest';
      if ((kind === 'plaza' || kind === 'grove') && mates >= 2 && r < 0.6) return r < 0.42 ? 'gather' : 'chase';
      if (e.weather === 'snow' && r < 0.25) return 'play';
      if (e.time === 'evening' && r < 0.3) return 'watch';
      if (e.time === 'morning' && r < 0.5) return 'walk';
      return r < 0.4 ? 'walk' : r < 0.6 ? 'idle' : r < 0.75 ? 'sit' : r < 0.9 ? 'look' : 'play';
    }
    const faceTo = (a, x, z) => { a.heading = Math.atan2(x - a.x, z - a.z); a.face = x < a.x ? -1 : 1; };
    function updateActor(a, dt, e, world, others) {
      a.bob += dt * (a.state === 'swim' ? 3 : 2);
      a.until -= dt;
      if (a.sayFor > 0) { a.sayFor -= dt; if (a.sayFor <= 0) { a.sayFor = 0; a.say = null; } }
      if (a.chatWith) { if (a.until <= 0) { a.chatWith.chatWith = null; a.chatWith = null; a.state = 'idle'; a.until = rnd(1, 3); } return; }
      if (a.state === 'chase' && a.chaseOf) { const o = a.chaseOf; a.tx = o.x + (a.x < o.x ? -50 : 50); a.tz = o.z + 20; if (o.state === 'sleep' || o.state === 'chat') a.until = 0; }
      if (MOVING.has(a.state)) {
        const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz);
        const spd = a.state === 'play' || a.state === 'chase' ? 120 : a.state === 'swim' ? 70 : 60;
        if (d > 6) { a.x += dx / d * spd * dt; a.z += dz / d * spd * dt; a.heading = Math.atan2(dx, dz); a.face = dx < 0 ? -1 : 1; } else if (a.state !== 'chase') a.until = Math.min(a.until, 0);
      }
      if (a.until <= 0) {
        const next = chooseState(a, e, world, others);
        a.state = next; a.chaseOf = null;
        a.until = next === 'sleep' ? rnd(6, 14) : MOVING.has(next) ? rnd(2, 5) : next === 'gather' ? rnd(4, 8) : rnd(1.5, 4);
        const s = a.spot || { x: a.x, z: a.z, r: 120, kind: 'path' };
        if (next === 'walk' || next === 'swim' || next === 'play') { const ang = rnd(0, TAU), d = rnd(20, s.r * 0.9); a.tx = clamp(s.x + Math.sin(ang) * d, -980, 980); a.tz = clamp(s.z + Math.cos(ang) * d * 0.7, 80, world.len - 80); }
        else if (next === 'chase') { const o = others.find((b) => b !== a && b.spot === a.spot && !b.fixed && !b.plant && !b.water && b.state !== 'sleep' && b.state !== 'chat'); if (o) { a.chaseOf = o; if (o.state !== 'chase') { o.state = 'play'; o.until = a.until; const ang = rnd(0, TAU); o.tx = clamp(s.x + Math.sin(ang) * s.r * 0.8, -980, 980); o.tz = clamp(s.z + Math.cos(ang) * s.r * 0.5, 80, world.len - 80); } } else a.state = 'walk'; }
        else if (next === 'gather') { const gx = s.x + Math.sin(hrand(s.id + 'g') * TAU) * s.r * 0.3, gz = s.z + Math.cos(hrand(s.id + 'g') * TAU) * s.r * 0.2; const ang = Math.atan2(a.x - gx, a.z - gz); const rr = 60 + rnd(0, 30); a.tx = gx + Math.sin(ang) * rr; a.tz = gz + Math.cos(ang) * rr; a.state = 'walk'; a.after = 'gather'; a.until = rnd(1.5, 3); a.gx = gx; a.gz = gz; }
        else if (next === 'watch') { const ang = Math.atan2(a.x - s.x, a.z - s.z); a.heading = Number.isFinite(ang) && (a.x !== s.x || a.z !== s.z) ? ang : Math.PI; a.face = Math.sin(a.heading) < 0 ? -1 : 1; }
        else if (next === 'fish' || next === 'shop') faceTo(a, s.x, s.z);
        else if (next === 'look') { a.heading = rnd(-Math.PI, Math.PI); a.face = Math.sin(a.heading) < 0 ? -1 : 1; }
        // ちかくに だれかが いれば、ときどき はなしはじめる
        if ((next === 'idle' || next === 'look' || next === 'sit') && !a.fixed && Math.random() < 0.35) {
          const o = others.find((b) => b !== a && !b.chatWith && !b.fixed && !b.plant && b.state !== 'sleep' && Math.hypot(b.x - a.x, b.z - a.z) < 90);
          if (o) { a.chatWith = o; o.chatWith = a; a.state = o.state = 'chat'; a.until = o.until = rnd(2, 4); faceTo(a, o.x, o.z); faceTo(o, a.x, a.z); }
        }
      }
      // あつまる: めあての ばしょに ついたら むきを まんなかへ
      if (a.after === 'gather' && a.state === 'walk' && Math.hypot(a.tx - a.x, a.tz - a.z) <= 8) { a.state = 'gather'; a.after = null; a.until = rnd(4, 8); faceTo(a, a.gx, a.gz); }
      if (a.after && a.state !== 'walk') a.after = null;
    }

    // ================= ことば =================
    const GREET = {
      morning: ['おはよう！', 'きょうも いいひに なりそう', 'あさの くうきは きもちいいね'],
      day: ['やあ！', 'いい てんきだね', 'ここは おちつくんだ'],
      evening: ['そらが きれいだね', 'そろそろ かえろうかな', 'きょうも たのしかった？'],
      night: ['…おきてたの？', 'ほしが よく みえるね', 'しずかな よるだね'],
    };
    const WEATHER_LINE = { rain: 'あめ、やまないかな…', snow: 'ゆきだ！ さむいけど たのしい', cloudy: 'くもり… でも すずしいね', sunny: 'ひざしが あったかいね' };
    const SEASON_LINE = { spring: 'はるの においが するね', summer: 'なつは ひが ながいね', autumn: 'あきは なんだか さびしい', winter: 'ふゆは あったかいものが たべたい' };
    const REGION_LINE = { home: 'このへんは おちつくよ', city: 'まちは にぎやかで いいね', countryside: 'はたけの みどりが きれいでしょ', forest: 'きの したは すずしいんだ', mountain: 'ここからの けしきは さいこう', snow: 'ゆきの おとって しずかだね', sea: 'なみの おとが すきなんだ', deepsea: 'ここは くらいけど あんしんする', river_lake: 'みずが すんでいるでしょ', jungle: 'ここは いきものが おおいよ', desert: 'よるは ほしが すごいんだ', star_stop: 'つぎの ほしは いつ くるかな', memory_lake: 'ここに くると むかしを おもいだす' };
    const SPOT_LINE = { plaza: ['ここは いつも だれか いるね', 'みんな あつまってくるんだ'], water: ['みずが きれいでしょ', 'なにか つれるかな'], edge: ['ここからの けしきが いちばん', 'とおくまで みえるよ'], shop: ['なにか かおうかな', 'ここの みせは いいものが あるんだ'], rest: ['ここで ひとやすみ', 'すこし つかれちゃって'], shelter: ['ここなら あめでも だいじょうぶ', 'やねの したは おちつく'], grove: ['きの あいだは しずかだね', 'ここは かくれるのに いいんだ'], path: ['この さきに なにが あるか しってる？', 'まっすぐ いくと ひろばだよ'], deep: ['…ここまで くる ひとは すくないんだ', 'しずかでしょ'] };
    const SECRET_LINE = ['…よく ここを みつけたね', 'ここは ひみつの ばしょなんだ', 'だれにも いわないでね'];
    const NAOTO_LINES = {
      base: ['…ここまで きたんだね。', 'この みずうみは、だれかの きおくで できている。', 'きみが であってきた みんな、げんきそうだった？', 'きりの おくまで あるいてくる ひとは すくない。'],
      dex: ['ずかんを うめてくれて ありがとう。', 'あの こたち、ぜんいん この せかいの どこかに いるよ。'],
      perfect: ['もう おしえることは ないな。', 'きみは この せかいの ぜんぶを 見た。'],
      clears: ['なんども じんせいを おえて、それでも また そだてているんだね。', 'いのちの おわりは、この みずうみに たまっていく。'],
      travel: ['ずいぶん いろんな ところを あるいたね。', 'せかいは ひろい。まだ みつけていない ばしょも ある。'],
    };
    function talkLine(a) {
      const e = env(); const state = getState(); const L = state.lifetime || {};
      const g = pick(GREET[e.time] || GREET.day);
      if (a.kind === 'naoto') {
        const pool = NAOTO_LINES.base.slice();
        if (L.dexCleared) pool.push(...NAOTO_LINES.dex);
        if (L.perfectCleared) pool.push(...NAOTO_LINES.perfect);
        if ((L.clears || 0) >= 3) pool.push(...NAOTO_LINES.clears);
        if ((L.regionsVisited || []).length >= 8) pool.push(...NAOTO_LINES.travel);
        return pick(pool);
      }
      const r = Math.random();
      if (a.withPlayer) return a.kind === 'partner' ? pick(['いっしょに あるけて うれしい', 'つぎは どこへ いく？', a.hook || 'ずっと そばに いるよ']) : pick(['いっしょに いこう！', 'ここ、きに いった？', 'つぎは あっちへ いってみよう']);
      if (a.spot && a.spot.secret && r < 0.6) return pick(SECRET_LINE);
      if (a.kind === 'partner') return r < 0.5 ? (a.hook || g) : g;
      if (a.kind === 'companion') { const def = typeof S.allCompanionsById === 'function' ? S.allCompanionsById(a.id) : null; return r < 0.4 && def && def.flavor ? def.flavor : r < 0.6 && a.spot && SPOT_LINE[a.spot.kind] ? pick(SPOT_LINE[a.spot.kind]) : g; }
      if (r < 0.3) { const d = typeof S.speciesStageDesc === 'function' ? S.speciesStageDesc(a.line, a.stage) : ''; if (d) return d; }
      if (r < 0.5 && a.spot && SPOT_LINE[a.spot.kind]) return pick(SPOT_LINE[a.spot.kind]);
      if (r < 0.62 && WEATHER_LINE[e.weather]) return WEATHER_LINE[e.weather];
      if (r < 0.74 && SEASON_LINE[e.season]) return SEASON_LINE[e.season];
      if (r < 0.88 && REGION_LINE[a.region]) return REGION_LINE[a.region];
      return g;
    }

    // ================= シミュレーション(せかい たんい。え には いぞんしない) =================
    // ここが あそびの ほんたい。プレイヤー・じゅうみん・いっしょに あるく なかまの いち、むき、カメラの りぐ、
    // いどう、あたりはんてい、スポットの はっけん、であう、はなす、を ワールド座標(x: よこ, z: おく)だけで すすめる。
    // がめんの px 座標や canvas は いっさい でてこない(レンダラーは view() を よむだけ)。
    const RULES = {
      playerSpeed: 260,      // せかい たんい / びょう(みちの うえ)
      offPathSpeed: 0.62,    // みちを はずれた ときの はやさ(くさむら・すな)
      xBound: 1000,          // よこの はし(±)
      zMargin: 60,           // おく・てまえの はし
      metRadius: 150,        // この きょりに はいると「であった」
      talkRadius: 130,       // この きょりなら「はなす」が おせる
      nearRadius: 1500,      // この はんいの じゅうみんは まいフレーム うごく
      farStride: 12,         // とおい じゅうみんは 12 フレームに 1かい(そんざいは けさない)
      bubbleSec: 3.6,        // ふきだしの ながさ
      follow: { gap: 100, back: 50, spacing: 30, snap: 30, maxSpeed: 340 },
      cam: { turnRate: 1.9, deadZone: 0.5, pathAssist: 0.55, ease: 1.6 }, // カメラの むきは あるく むきに ゆっくり。みちの むきにも すこし あわせる
    };
    const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    const hitTest = (a, b, r) => dist(a, b) < r;
    function clampToWorld(pt, world) { pt.x = clamp(pt.x, -RULES.xBound, RULES.xBound); pt.z = clamp(pt.z, RULES.zMargin, world.len - RULES.zMargin); return pt; }
    function resolveObstacles(pt, world) {
      for (const o of world.obstacles) { const dx = pt.x - o.x, dz = pt.z - o.z, d = Math.hypot(dx, dz); if (d > 0 && d < o.r) { pt.x = o.x + dx / d * o.r; pt.z = o.z + dz / d * o.r; } }
      return pt;
    }

    function createSimulation(init = {}) {
      let registry = init.registry || buildRegistry();
      let world = null, party = [], player = null, nearest = null, frame = 0, curSpot = null;
      // にゅうりょくの きじゅん: ゆびを おいた しゅんかんの カメラの むきで こてい(カメラが まわっても おなじ むきへ すすむ。ぐるぐる まわらない)
      let inputActive = false, inputYaw = 0;
      // カメラの りぐ: x/z = おいかける てん(じぶん)、yaw = むき(ラジアン、0 = +z)、dist = うしろの きょり、height = たかさの わりあい。
      // three.js でも おなじ 値で カメラを おける
      const camera = { x: 0, z: 0, yaw: 0, dist: CAM_PROFILES.default.dist, height: CAM_PROFILES.default.height };
      let envNow = init.env || env();
      let discovered = new Set(init.discovered || []);
      function enterRegion(regionId, opts = {}) {
        if (opts.registry) registry = opts.registry;
        world = buildWorld(regionId, registry, { locality: opts.locality != null ? opts.locality : init.locality });
        party = companionsOf(registry);
        player = { x: world.entry.x, z: world.entry.z - 60, heading: 0, face: 1, bob: 0, moving: false, onPath: true };
        camera.x = player.x; camera.z = player.z; camera.yaw = 0; nearest = null; curSpot = null; inputActive = false;
        discovered = new Set(opts.discovered || (opts.regionId === regionId ? [...discovered] : []) );
        return world;
      }
      enterRegion(init.regionId || 'home', { discovered: init.discovered });
      const spotAt = (pt) => { let best = null, bd = Infinity; for (const s of world.spots) { const d = dist(pt, s); if (d < s.r && d < bd) { bd = d; best = s; } } return best; };
      // いっしょに あるく なかま・こいびと: じぶんの すこし うしろ(カメラから みて おく)と よこ
      function followParty(dt) {
        const F = RULES.follow; const fx = Math.sin(camera.yaw), fz = Math.cos(camera.yaw), rx = Math.cos(camera.yaw), rz = -Math.sin(camera.yaw);
        party.forEach((a, i) => {
          const side = a.kind === 'partner' ? -player.face : (i % 2 === 0 ? 1 : -1) * (1 + Math.floor(i / 2) * 0.9);
          const back = F.back + i * F.spacing;
          const tx = player.x + rx * side * F.gap + fx * back, tz = player.z + rz * side * F.gap + fz * back;
          const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
          if (d > F.snap) { const spd = Math.min(F.maxSpeed, d * 3.5); a.x += dx / d * spd * dt; a.z += dz / d * spd * dt; a.state = 'walk'; a.heading = Math.atan2(dx, dz); a.face = dx < 0 ? -1 : 1; a.bob += dt; }
          else if (a.state !== 'idle') { a.state = 'idle'; a.heading = player.heading; }
          if (a.sayFor > 0) { a.sayFor -= dt; if (a.sayFor <= 0) { a.sayFor = 0; a.say = null; } }
        });
      }
      // 1 フレームぶん すすめる。input: { x: -1..1(よこ), y: -1..1(てまえ +) } は カメラから みた むき。もどりち: おきた できごと
      function step(dt, input) {
        frame++;
        const events = [];
        const v = input || { x: 0, y: 0 };
        player.moving = !!(v.x || v.y);
        if (!player.moving) inputActive = false;
        else if (!inputActive) { inputActive = true; inputYaw = camera.yaw; }
        if (player.moving) {
          // ゆびを おいた ときの カメラの むきを きじゅんに ワールドの むきへ
          const fx = Math.sin(inputYaw), fz = Math.cos(inputYaw), rx = Math.cos(inputYaw), rz = -Math.sin(inputYaw);
          const mx = rx * v.x + fx * -v.y, mz = rz * v.x + fz * -v.y; const m = Math.hypot(mx, mz) || 1;
          const spd = RULES.playerSpeed * (player.onPath ? 1 : RULES.offPathSpeed) * Math.min(1, m);
          player.x += mx / m * spd * dt; player.z += mz / m * spd * dt;
          clampToWorld(player, world); resolveObstacles(player, world);
          player.heading = Math.atan2(mx, mz); player.face = rx * mx + rz * mz < -0.2 ? -1 : rx * mx + rz * mz > 0.2 ? 1 : player.face; player.bob += dt;
        }
        const np = nearestPath(player, world); player.onPath = (!!np && np.dist <= np.half + 20) || !!spotAt(player); // スポットの なかも あるきやすい
        // カメラ: いち は じぶん。むきは あるく むき(+ みちの むき)へ ゆっくり。とまっている あいだは かえない
        camera.x = player.x; camera.z = player.z;
        if (player.moving) {
          let want = player.heading;
          if (np && np.dist <= np.half + 40) { let pd = np.dir; if (Math.cos(pd - want) < 0) pd += Math.PI; want = want + wrapAngle(pd - want) * RULES.cam.pathAssist; }
          const delta = wrapAngle(want - camera.yaw);
          if (Math.abs(delta) > RULES.cam.deadZone * 0.35) camera.yaw = wrapAngle(camera.yaw + Math.sign(delta) * Math.min(Math.abs(delta), RULES.cam.turnRate * dt * Math.min(1, Math.abs(delta) / RULES.cam.deadZone + 0.3)));
        }
        // スポットに はいる / はっけん
        const s = spotAt(player);
        if (s !== curSpot) { curSpot = s; if (s) { const first = !discovered.has(s.id); if (first) discovered.add(s.id); events.push({ type: 'spot', spot: s, first }); } }
        const prof = CAM_PROFILES[(curSpot && (curSpot.cam || (curSpot.secret ? 'secret' : curSpot.kind))) || (player.onPath && np && np.seg.kind === 'narrow' ? 'narrow' : 'default')] || CAM_PROFILES.default;
        camera.dist += (prof.dist - camera.dist) * Math.min(1, dt * RULES.cam.ease); camera.height += (prof.height - camera.height) * Math.min(1, dt * RULES.cam.ease);
        followParty(dt);
        for (let i = 0; i < world.residents.length; i++) {
          const a = world.residents[i];
          const near = Math.abs(a.z - player.z) < RULES.nearRadius && Math.abs(a.x - player.x) < RULES.nearRadius;
          if (near) updateActor(a, dt, envNow, world, world.residents);
          else if ((i + frame) % RULES.farStride === 0) updateActor(a, dt * RULES.farStride, envNow, world, world.residents);
          if (!a.met && hitTest(a, player, RULES.metRadius)) { a.met = true; events.push({ type: 'met', actor: a }); }
        }
        let best = null, bd = Infinity;
        const consider = (a) => { const d = dist(a, player); if (d < bd) { bd = d; best = a; } };
        for (const a of world.residents) consider(a); for (const a of party) consider(a);
        const next = bd < RULES.talkRadius ? best : null;
        if (next !== nearest) { nearest = next; events.push({ type: 'nearest', actor: nearest }); }
        return events;
      }
      function talk() {
        if (!nearest) return null;
        const a = nearest; a.say = talkLine(a); a.sayFor = RULES.bubbleSec; faceTo(a, player.x, player.z);
        if (a.chatWith) { a.chatWith.chatWith = null; a.chatWith = null; }
        a.state = 'idle'; a.until = 3.5; a.chaseOf = null;
        return { actor: a, line: a.say };
      }
      const metCount = () => world.residents.filter((r) => r.met).length;
      // ちずの データ(UI は あとで): はっけんずみ の スポットと みち。かくし ばしょは みつけるまで のらない
      const mapData = () => ({ spots: world.spots.filter((s) => !s.secret || discovered.has(s.id)).map((s) => ({ id: s.id, label: s.label, x: s.x, z: s.z, kind: s.kind, secret: !!s.secret, discovered: discovered.has(s.id), current: s === curSpot })), paths: world.paths.filter(([a, b, k]) => k !== 'secret' || (discovered.has(a) && discovered.has(b))), len: world.len });
      // レンダラーに わたす「いまの せかい」。ぜんぶ ワールド座標。かきかえない やくそく
      const view = () => ({ regionId: world.regionId, world, residents: world.residents, party, player, camera, nearest, spot: curSpot, env: envNow, frame });
      return {
        RULES, enterRegion, step, talk, view, hitTest, dist, mapData,
        setEnv(e) { envNow = e; }, get env() { return envNow; },
        setPlayer(x, z) { player.x = x; player.z = z; clampToWorld(player, world); camera.x = player.x; camera.z = player.z; },
        get world() { return world; }, get party() { return party; }, get player() { return player; }, get camera() { return camera; }, get nearest() { return nearest; }, get registry() { return registry; }, get spot() { return curSpot; }, get discovered() { return discovered; },
        metCount,
      };
    }

    // ================= え(canvas ぎじ 3D レンダラー) =================
    // レンダラーの やくそく(canvas / 将来の three.js など、どれでも おなじ):
    //   createXxxRenderer({ canvas, ctx, W, H, tier, playerGlyph }) → { draw(view, now), resize({ ctx, W, H }), destroy() }
    //   ・draw は sim.view() を うけとる。せかい たんい(x, z)と カメラの りぐ(x, z, yaw, dist, height)だけ。がめんの px は ここの なかだけ
    //   ・view の なかみ(actor など)は かきかえない。じぶんの じょうたい(キャッシュ)は じぶんで もつ
    const imgCache = {};
    function imageFor(asset) {
      if (!asset || typeof Image === 'undefined') return null;
      let im = imgCache[asset];
      if (!im) { im = new Image(); im.decoding = 'async'; im.src = asset; imgCache[asset] = im; }
      return im.complete && im.naturalWidth > 0 ? im : null;
    }
    function hexToRgb(h) { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return [128, 128, 128]; const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
    function mixRgb(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); return [Math.round(lerp(A[0], B[0], t)), Math.round(lerp(A[1], B[1], t)), Math.round(lerp(A[2], B[2], t))]; }
    function shade(hex, light, tintHex, tintAmt) { const c = hexToRgb(hex), t = hexToRgb(tintHex || '#ffffff'); const f = (i) => Math.round(clamp(lerp(c[i], t[i], tintAmt) * light, 0, 255)); return `rgb(${f(0)},${f(1)},${f(2)})`; }
    function shadeRgb(c, light, tintHex, tintAmt) { const t = hexToRgb(tintHex || '#ffffff'); const f = (i) => Math.round(clamp(lerp(c[i], t[i], tintAmt) * light, 0, 255)); return `rgb(${f(0)},${f(1)},${f(2)})`; }
    const TIME_LIGHT = { morning: { light: 0.94, tint: '#f8d4a6', amt: 0.16, sky: ['#ffd9a8', '#cfe6ff'] }, day: { light: 1, tint: '#ffffff', amt: 0, sky: ['#6fb6ff', '#dff0ff'] }, evening: { light: 0.86, tint: '#eeac98', amt: 0.26, sky: ['#ff9a6a', '#ffd9c0'] }, night: { light: 0.6, tint: '#253f73', amt: 0.42, sky: ['#0d1638', '#2b3d78'] } };
    const WEATHER_LIGHT = { sunny: 1, cloudy: 0.88, rain: 0.74, snow: 0.82 };
    const SKY_OVERRIDE = { deepsea: ['#0b1d3a', '#163a66'], star_stop: ['#0a0c2a', '#2c2560'], memory_lake: ['#2a2d4d', '#5b6190'] };
    const ACTOR_SIZE = 110; // キャラの おおきさ(せかい たんい)
    const BACKDROP_COLORS = {
      hills: ['#7fb36a', '#5f9552'], skyline: ['#8e96a8', '#67708a'], treeline: ['#4f8a45', '#356a33'], peaks: ['#8e93a4', '#6b7085'], snowpeaks: ['#dfe9f6', '#b9c9de'],
      seahorizon: ['#5aa9e0', '#3f8fcc'], abyss: ['#132c52', '#0d2140'], lakehills: ['#86b86f', '#6aa0da'], dunes: ['#e6c98a', '#d1ad66'], skystops: ['#5a4fa0', '#3d3478'], mist: ['#8c93b0', '#6f7594'],
    };
    const KIND_COLOR = { form: 'rgba(90,70,60,.75)', companion: 'rgba(210,130,60,.8)', partner: 'rgba(220,100,150,.8)', naoto: 'rgba(80,80,120,.8)' };
    // カメラの むきに たいする キャラの むき: front(こちら) back(むこう) left/right(よこ)。しょうらい ほうこう べつの えに さしかえる ときは ここを つかう
    function facingOf(heading, yaw) { const rel = wrapAngle(heading - yaw); const c = Math.cos(rel); if (c > 0.45) return 'back'; if (c < -0.45) return 'front'; return Math.sin(rel) < 0 ? 'left' : 'right'; }
    function spriteFor(a, facing) { const s = a.sprites || {}; if ((facing === 'left' || facing === 'right') && s.side) return { asset: s.side, flip: facing === 'left' }; if (facing === 'back' && s.back) return { asset: s.back, flip: false }; return { asset: s.front || a.asset, flip: facing === 'left' || (facing === 'front' && a.face < 0) }; }

    function createCanvasRenderer(o) {
      let ctx = o.ctx, W = o.W, H = o.H; const tier = o.tier || 0;
      const playerGlyph = typeof o.playerGlyph === 'function' ? o.playerGlyph : () => '🐣';
      // とうえい: カメラは じぶんの camera.dist うしろ(むき yaw)、たかさは じぶんの あしもとが FEET_FRAC に くる ように ぎゃくさん。地平線 HOR
      const HOR_BASE = 0.30, FEET_FRAC = 0.80, NEAR = 30;
      let F, HOR, cap, skyCache = null, nebula = null;
      function setup() { F = W * 0.95; HOR = Math.round(H * HOR_BASE); cap = tier >= 2 ? 44 : tier === 1 ? 60 : 80; skyCache = null; nebula = null; }
      setup();
      let cam = { x: 0, z: 0, yaw: 0, dist: 430, height: 1 }, eye = { x: 0, z: 0 }, cosY = 1, sinY = 0, camH = 300;
      // ワールド → カメラ座標(cx: よこ, cz: おくゆき)
      function toCam(x, z) { const dx = x - eye.x, dz = z - eye.z; return { cx: dx * cosY - dz * sinY, cz: dx * sinY + dz * cosY }; }
      function project(x, z) { const c = toCam(x, z); if (c.cz < NEAR) return null; const s = F / c.cz; return { sx: W / 2 + c.cx * s, sy: HOR + camH * s, s, dz: c.cz }; }
      function projectCam(c) { if (c.cz < NEAR) return null; const s = F / c.cz; return { sx: W / 2 + c.cx * s, sy: HOR + camH * s, s, dz: c.cz }; }
      function setCamera(c) {
        cam = c; cosY = Math.cos(c.yaw); sinY = Math.sin(c.yaw);
        eye.x = c.x - sinY * c.dist; eye.z = c.z - cosY * c.dist;
        HOR = Math.round(H * (HOR_BASE + 0.07 * (c.height - 1)));
        camH = (FEET_FRAC - HOR / H) * H * c.dist / F;
      }
      // ---- そら ----
      function drawSky(world, e, tl, wl, now) {
        const sky = SKY_OVERRIDE[world.regionId] || tl.sky;
        const skyKey = `${sky[0]}|${sky[1]}|${wl}|${W}x${H}|${HOR}`;
        if (!skyCache || skyCache.key !== skyKey) { const g = ctx.createLinearGradient(0, 0, 0, HOR + 10); g.addColorStop(0, shade(sky[0], wl, '#ffffff', 0)); g.addColorStop(1, shade(sky[1], wl, '#ffffff', 0)); skyCache = { key: skyKey, g }; }
        ctx.fillStyle = skyCache.g; ctx.fillRect(0, 0, W, HOR + 10);
        const px = -cam.yaw / TAU * W * 3; // むきに あわせて そらも ながれる
        const starry = world.sky === 'stars' || (e.time === 'night' && world.sky !== 'bubbles');
        if (world.sky === 'stars') {
          if (!nebula && typeof document !== 'undefined' && document.createElement) {
            const c = document.createElement('canvas'); c.width = W; c.height = HOR + 10; const g2 = c.getContext && c.getContext('2d');
            if (g2 && g2.createRadialGradient) { const blobs = [[0.25, 0.35, 0.5, '#7a4fd8'], [0.7, 0.2, 0.42, '#3f8fe0'], [0.55, 0.65, 0.36, '#d05aa8']]; for (const [bx, by, br, col] of blobs) { const r = g2.createRadialGradient(bx * W, by * HOR, 0, bx * W, by * HOR, br * W); r.addColorStop(0, col + '66'); r.addColorStop(1, col + '00'); g2.fillStyle = r; g2.fillRect(0, 0, W, HOR + 10); } nebula = c; }
          }
          if (nebula) ctx.drawImage(nebula, 0, 0);
        }
        if (starry) {
          const n = world.sky === 'stars' ? 70 : 36; ctx.fillStyle = '#fff';
          for (let i = 0; i < n; i++) { const x = ((i * 137.5 + px * 0.6) % W + W) % W, y = (i * 61.7) % (HOR - 6); const tw = 0.45 + 0.55 * Math.abs(Math.sin(now * 0.0012 + i)); ctx.globalAlpha = tw; const sz = i % 5 === 0 ? 2.4 : 1.4; ctx.fillRect(x, y, sz, sz); }
          ctx.globalAlpha = 1;
          if (world.sky === 'stars') { const cyc = Math.floor(now / 6000), ph = (now % 6000) / 700; if (ph < 1) { const sx0 = ((cyc * 97) % 100) / 100 * W, sy0 = ((cyc * 53) % 40) / 100 * HOR; const x = sx0 + ph * W * 0.35, y = sy0 + ph * HOR * 0.45; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 26, y - 14); ctx.lineTo(x, y); ctx.stroke(); } }
        } else if (world.sky === 'bubbles') {
          ctx.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 6; i++) { const x = ((i * 71 + px * 0.3) % W + W) % W; ctx.beginPath(); ctx.moveTo(x - 10, 0); ctx.lineTo(x + 34, 0); ctx.lineTo(x + 90, HOR + 10); ctx.lineTo(x + 20, HOR + 10); ctx.closePath(); ctx.fill(); }
        } else if (world.sky === 'mist') {
          ctx.fillStyle = 'rgba(255,255,255,.10)'; for (let i = 0; i < 3; i++) { const y = HOR * (0.35 + i * 0.2), dx = (now * 0.01 * (i + 1) + px * 0.2) % W; ctx.fillRect(dx - W, y, W * 0.7, 8); ctx.fillRect(dx, y, W * 0.7, 8); }
        } else {
          if (e.weather !== 'rain') { const sunX = ((W * (e.time === 'evening' ? 0.2 : e.time === 'morning' ? 0.8 : 0.72) + px * 0.5) % W + W) % W, sunY = HOR * (e.time === 'evening' ? 0.72 : e.time === 'morning' ? 0.5 : 0.28); ctx.fillStyle = e.time === 'evening' ? 'rgba(255,190,120,.95)' : 'rgba(255,245,200,.95)'; ctx.beginPath(); ctx.arc(sunX, sunY, W * 0.045, 0, TAU); ctx.fill(); }
          const cloudy = e.weather === 'cloudy' || e.weather === 'rain' || e.weather === 'snow';
          ctx.fillStyle = cloudy ? 'rgba(235,238,245,.85)' : 'rgba(255,255,255,.75)';
          const nc = cloudy ? 5 : 3;
          for (let i = 0; i < nc; i++) { const x = (((i * 173 + now * 0.006 * (1 + i * 0.3) + px * 0.7) % (W + 140)) + W + 140) % (W + 140) - 70, y = HOR * (0.18 + (i % 3) * 0.2), r = W * (0.05 + (i % 2) * 0.02); ctx.beginPath(); ctx.ellipse(x, y, r * 1.9, r * 0.75, 0, 0, TAU); ctx.ellipse(x - r, y + r * 0.2, r * 1.1, r * 0.55, 0, 0, TAU); ctx.ellipse(x + r * 1.1, y + r * 0.15, r * 1.0, r * 0.5, 0, 0, TAU); ctx.fill(); }
        }
      }
      // ---- えんけい(地平線の おくの シルエット)。カメラの むきで よこに ながれる ----
      function drawBackdrop(world, e, light, tl) {
        const kind = world.backdrop; const cols = BACKDROP_COLORS[kind] || BACKDROP_COLORS.hills;
        const bh = Math.round(H * 0.17), base = HOR + 2, px = -cam.yaw / TAU * W * 2.2;
        const far = shadeRgb(mixRgb(cols[0], (SKY_OVERRIDE[world.regionId] || tl.sky)[1], 0.35), light, tl.tint, tl.amt), nearC = shade(cols[1], light, tl.tint, tl.amt);
        const wave = (color, amp, freq, yoff, phase) => { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-10, base + 4); for (let x = -10; x <= W + 10; x += 12) { const y = base - yoff - amp * (0.5 + 0.5 * Math.sin((x + px * phase) * freq + phase)); ctx.lineTo(x, y); } ctx.lineTo(W + 10, base + 4); ctx.closePath(); ctx.fill(); };
        const spikes = (color, n, hmin, hmax, wmul, yoff, seed) => { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-10, base + 4); const step = (W + 40) / n; const shift = ((px * (0.5 + seed * 0.3)) % step + step) % step; for (let i = -1; i <= n + 1; i++) { const x = -20 + i * step + shift; const idx = ((i - Math.floor(px * (0.5 + seed * 0.3) / step)) % 97 + 97) % 97; const hh = hmin + (hash(kind + seed + idx) % 1000) / 1000 * (hmax - hmin); ctx.lineTo(x - step * wmul, base - yoff); ctx.lineTo(x, base - yoff - hh); } ctx.lineTo(W + 40, base - yoff); ctx.lineTo(W + 40, base + 4); ctx.closePath(); ctx.fill(); };
        const blocks = (color, n, hmin, hmax, yoff, seed) => { ctx.fillStyle = color; const step = (W + 40) / n; const shift = ((px * (0.5 + seed * 0.3)) % step + step) % step; for (let i = -1; i <= n + 1; i++) { const idx = ((i - Math.floor(px * (0.5 + seed * 0.3) / step)) % 97 + 97) % 97; const hh = hmin + (hash(kind + seed + idx) % 1000) / 1000 * (hmax - hmin), bw = step * (0.55 + (hash(kind + 'w' + seed + idx) % 100) / 250); const x = -20 + i * step + shift; ctx.fillRect(x, base - yoff - hh, bw, hh + yoff + 4); } };
        if (kind === 'hills') { wave(far, bh * 0.7, 0.012, bh * 0.15, 1); wave(nearC, bh * 0.5, 0.02, 0, 2.5); }
        else if (kind === 'lakehills') { wave(far, bh * 0.7, 0.012, bh * 0.25, 1); ctx.fillStyle = shade('#6aa0da', light, tl.tint, tl.amt); ctx.fillRect(0, base - bh * 0.22, W, bh * 0.22 + 4); wave(nearC, bh * 0.3, 0.025, bh * 0.05, 2.5); }
        else if (kind === 'treeline') { spikes(far, 22, bh * 0.35, bh * 0.85, 0.5, bh * 0.12, 1); spikes(nearC, 16, bh * 0.4, bh * 0.95, 0.5, 0, 2); }
        else if (kind === 'peaks' || kind === 'snowpeaks') { spikes(far, 7, bh * 0.6, bh * 1.3, 0.5, bh * 0.1, 1); spikes(nearC, 5, bh * 0.5, bh * 1.0, 0.5, 0, 2);
          // 雪の頂: ゆきぐには いつも。ふつうの 山なみは ふゆ か ゆきの ときだけ(きせつ・てんきと あわせる)
          if (kind === 'snowpeaks' || e.season === 'winter' || e.weather === 'snow') { ctx.fillStyle = 'rgba(255,255,255,.55)'; const step = (W + 40) / 7; const shift = ((px * 0.8) % step + step) % step; for (let i = -1; i <= 8; i++) { const idx = ((i - Math.floor(px * 0.8 / step)) % 97 + 97) % 97; const x = -20 + i * step + shift, hh = bh * 0.6 + (hash(kind + 1 + idx) % 1000) / 1000 * bh * 0.7; ctx.beginPath(); ctx.moveTo(x, base - bh * 0.1 - hh); ctx.lineTo(x + step * 0.12, base - bh * 0.1 - hh * 0.75); ctx.lineTo(x - step * 0.12, base - bh * 0.1 - hh * 0.75); ctx.closePath(); ctx.fill(); } } }
        else if (kind === 'skyline') { blocks(far, 12, bh * 0.4, bh * 1.1, bh * 0.1, 1); blocks(nearC, 9, bh * 0.3, bh * 0.8, 0, 2); ctx.fillStyle = 'rgba(255,240,180,.55)'; for (let i = 0; i < 40; i++) { const x = ((i * 53 + px * 0.6) % (W + 20) + W + 20) % (W + 20) - 10, y = base - 6 - (i * 37) % Math.round(bh * 0.7); ctx.fillRect(x, y, 2, 2); } }
        else if (kind === 'seahorizon') { ctx.fillStyle = shade(cols[0], light, tl.tint, tl.amt); ctx.fillRect(0, base - bh * 0.35, W, bh * 0.35 + 4); ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 12; i++) ctx.fillRect(((i * 91 + px * 0.5) % W + W) % W, base - bh * 0.35 + 4 + (i * 13) % Math.round(bh * 0.3), 18 + (i % 3) * 8, 1.5); wave(nearC, bh * 0.35, 0.03, bh * 0.05, 5); ctx.fillStyle = 'rgba(255,255,255,.8)'; const bx = ((px * 0.4 + W * 0.7) % W + W) % W; ctx.beginPath(); ctx.moveTo(bx, base - bh * 0.5); ctx.lineTo(bx + 9, base - bh * 0.3); ctx.lineTo(bx - 6, base - bh * 0.3); ctx.closePath(); ctx.fill(); }
        else if (kind === 'abyss') { ctx.fillStyle = shade(cols[0], light, tl.tint, tl.amt); ctx.fillRect(0, base - bh * 0.5, W, bh * 0.5 + 4); spikes(nearC, 14, bh * 0.2, bh * 0.6, 0.5, 0, 3); }
        else if (kind === 'dunes') { wave(far, bh * 0.6, 0.009, bh * 0.2, 1); wave(nearC, bh * 0.5, 0.015, 0, 3); }
        else if (kind === 'skystops') { for (let i = 0; i < 5; i++) { const x = ((i * 167 + px * (0.4 + i * 0.1)) % (W + 120) + W + 120) % (W + 120) - 60, y = base - bh * (0.25 + (i % 3) * 0.28), r = W * (0.06 + (i % 2) * 0.03); ctx.fillStyle = i % 2 ? far : nearC; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.32, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,230,150,.9)'; ctx.fillRect(x - 1, y - r * 0.32 - 10, 2, 10); ctx.beginPath(); ctx.arc(x, y - r * 0.32 - 11, 3, 0, TAU); ctx.fill(); } wave('rgba(255,255,255,.10)', bh * 0.3, 0.02, 0, 4); }
        else if (kind === 'mist') { for (let i = 0; i < 3; i++) { ctx.fillStyle = `rgba(200,205,225,${0.18 + i * 0.1})`; ctx.fillRect(0, base - bh * (0.6 - i * 0.18), W, bh); } spikes(nearC, 10, bh * 0.15, bh * 0.4, 0.5, 0, 2); }
      }
      // ---- じめん・みち・みずべ・もよう ----
      function fillWorldPoly(pts) { // ワールドの てんの ならび → とうえいして ぬる(ひとつでも カメラより てまえなら やめる)
        let first = true; ctx.beginPath();
        for (const [x, z] of pts) { const p = project(x, z); if (!p) return false; if (first) { ctx.moveTo(p.sx, p.sy); first = false; } else ctx.lineTo(p.sx, p.sy); }
        ctx.closePath(); ctx.fill(); return true;
      }
      function drawGround(world, e, tl, wl, light, now) {
        const skyBottom = (SKY_OVERRIDE[world.regionId] || tl.sky)[1];
        const g0 = hexToRgb(world.ground[0]), g1 = hexToRgb(world.ground[1]);
        const fogC = mixRgb(world.ground[1], skyBottom, 0.55);
        const N = 26;
        const platform = world.floor && world.floor.kind === 'platform';
        if (platform) { ctx.fillStyle = shadeRgb(hexToRgb(skyBottom), 0.55, '#000000', 0.3); ctx.fillRect(0, HOR, W, H - HOR); ctx.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 40; i++) ctx.fillRect(((i * 149.3 - cam.yaw * 60) % W + W) % W, HOR + 6 + (i * 83.7) % (H - HOR - 8), 1.5, 1.5); }
        for (let i = 0; i < N; i++) {
          const y0 = HOR + (H - HOR) * (i / N) * (i / N), y1 = HOR + (H - HOR) * ((i + 1) / N) * ((i + 1) / N);
          const t = i / N; const c = [0, 1, 2].map((k) => lerp(lerp(fogC[k], g1[k], Math.min(1, t * 1.6)), g0[k], Math.max(0, (t - 0.45) / 0.55)));
          ctx.fillStyle = shadeRgb(c, light, tl.tint, tl.amt * (1 - t * 0.5));
          if (platform) {
            // あしばの はば の なかだけ(カメラ座標で)
            const czTop = camH * F / Math.max(1, y0 - HOR), czBot = camH * F / Math.max(1, y1 - HOR);
            const half = world.floor.half; const l0 = projectCam({ cx: -half, cz: czTop }), r0 = projectCam({ cx: half, cz: czTop }), l1 = projectCam({ cx: -half, cz: czBot }), r1 = projectCam({ cx: half, cz: czBot });
            if (!l0 || !r0 || !l1 || !r1) continue;
            ctx.beginPath(); ctx.moveTo(l0.sx, y0); ctx.lineTo(r0.sx, y0); ctx.lineTo(r1.sx, y1 + 1); ctx.lineTo(l1.sx, y1 + 1); ctx.closePath(); ctx.fill();
          } else ctx.fillRect(0, y0, W, y1 - y0 + 1);
        }
        // みち(スポットを つなぐ ポリゴン。みじかく くぎって とうえい)
        const pathColor = shade(world.path, light, tl.tint, tl.amt);
        for (const s of world.segments) {
          const dx = (s.b.x - s.a.x) / s.len, dz = (s.b.z - s.a.z) / s.len; const nx = -dz, nz = dx; const half = s.half; const n = Math.max(2, Math.ceil(s.len / 110));
          const secret = s.kind === 'secret';
          for (let i = 0; i < n; i++) {
            const t0 = i / n, t1 = (i + 1) / n;
            const ax = s.a.x + (s.b.x - s.a.x) * t0, az = s.a.z + (s.b.z - s.a.z) * t0, bx = s.a.x + (s.b.x - s.a.x) * t1, bz = s.a.z + (s.b.z - s.a.z) * t1;
            const ca = toCam(ax, az), cb = toCam(bx, bz); if (ca.cz < NEAR && cb.cz < NEAR) continue; if (ca.cz > 6000 && cb.cz > 6000) continue;
            if (world.glowPath) { ctx.fillStyle = 'rgba(200,180,255,.22)'; fillWorldPoly([[ax + nx * (half + 26), az + nz * (half + 26)], [bx + nx * (half + 26), bz + nz * (half + 26)], [bx - nx * (half + 26), bz - nz * (half + 26)], [ax - nx * (half + 26), az - nz * (half + 26)]]); }
            ctx.fillStyle = pathColor; ctx.globalAlpha = secret ? 0.42 : world.glowPath ? 0.85 : 0.72;
            fillWorldPoly([[ax + nx * half, az + nz * half], [bx + nx * half, bz + nz * half], [bx - nx * half, bz - nz * half], [ax - nx * half, az - nz * half]]);
            ctx.globalAlpha = 1;
          }
        }
        // スポットの じめん(ひろばは まるく あかるい)
        for (const s of world.spots) {
          if (s.kind === 'water') continue; if (s.secret && s.kind === 'deep') continue;
          const c = toCam(s.x, s.z); if (c.cz < NEAR - s.r || c.cz > 5000) continue;
          ctx.fillStyle = pathColor; ctx.globalAlpha = s.kind === 'plaza' ? 0.5 : 0.28;
          const pts = []; for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; pts.push([s.x + Math.sin(a) * s.r * 0.9, s.z + Math.cos(a) * s.r * 0.9]); }
          fillWorldPoly(pts); ctx.globalAlpha = 1;
        }
        // みずべ
        for (const s of world.spots) if (s.kind === 'water') {
          const c = toCam(s.x, s.z); if (c.cz < NEAR - s.r || c.cz > 5000) continue;
          const pts = []; for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; pts.push([s.x + Math.sin(a) * s.r, s.z + Math.cos(a) * s.r]); }
          ctx.fillStyle = shade('#6fb7e8', light, tl.tint, tl.amt); ctx.globalAlpha = 0.8; if (fillWorldPoly(pts)) { ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.5; ctx.stroke(); } ctx.globalAlpha = 1;
        }
        // じめんの もよう(くさ・こいし・きらめき)
        const ms = world.markStyle; ctx.fillStyle = ms.color;
        for (const m of world.marks) { const p = project(m.x, m.z); if (!p || p.sy > H + 4 || p.sx < -10 || p.sx > W + 10 || p.dz > 3200) continue; const px = m.size * p.s; if (px < 1.2) continue; ctx.globalAlpha = clamp(1.3 - p.dz / 2800, 0.15, ms.kind === 'sparkle' ? 0.9 : 0.5); if (ms.kind === 'tuft') { ctx.fillRect(p.sx - px * 0.5, p.sy - px * 0.7, px * 0.25, px * 0.7); ctx.fillRect(p.sx, p.sy - px * 0.9, px * 0.25, px * 0.9); ctx.fillRect(p.sx + px * 0.45, p.sy - px * 0.6, px * 0.25, px * 0.6); } else if (ms.kind === 'stone') { ctx.beginPath(); ctx.ellipse(p.sx, p.sy, px * 0.5, px * 0.22, 0, 0, TAU); ctx.fill(); } else { const tw = 0.5 + 0.5 * Math.sin(m.phase + now * 0.003); ctx.globalAlpha *= tw; ctx.fillRect(p.sx - px * 0.15, p.sy - px * 0.15, px * 0.3, px * 0.3); } }
        ctx.globalAlpha = 1;
      }
      // ---- ランドマーク(とおくからでも みえる おおきな もの。かんたんな ずけい) ----
      function drawLandmark(kind, p, size, light, world) {
        const px = size * p.s; const x = p.sx, y = p.sy; if (px < 4) return;
        ctx.save(); ctx.globalAlpha = clamp(1.5 - p.dz / 3600, 0.35, 1);
        if (kind === 'bigtree') { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x, y, px * 0.3, px * 0.07, 0, 0, TAU); ctx.fill(); ctx.fillStyle = shade('#7a4f2a', light, '#000', 0); ctx.fillRect(x - px * 0.07, y - px * 0.55, px * 0.14, px * 0.55); ctx.fillStyle = shade('#3f7a3a', light, '#000', 0); ctx.beginPath(); ctx.arc(x, y - px * 0.7, px * 0.34, 0, TAU); ctx.arc(x - px * 0.24, y - px * 0.5, px * 0.22, 0, TAU); ctx.arc(x + px * 0.24, y - px * 0.52, px * 0.24, 0, TAU); ctx.fill(); ctx.fillStyle = shade('#5fa04f', light, '#000', 0); ctx.beginPath(); ctx.arc(x - px * 0.08, y - px * 0.8, px * 0.18, 0, TAU); ctx.fill(); }
        else if (kind === 'lighthouse') { ctx.fillStyle = shade('#f4f0e6', light, '#000', 0); ctx.beginPath(); ctx.moveTo(x - px * 0.12, y); ctx.lineTo(x + px * 0.12, y); ctx.lineTo(x + px * 0.08, y - px * 0.95); ctx.lineTo(x - px * 0.08, y - px * 0.95); ctx.closePath(); ctx.fill(); ctx.fillStyle = shade('#d94b4b', light, '#000', 0); for (let k = 0; k < 3; k++) ctx.fillRect(x - px * 0.115 + k * 0, y - px * (0.2 + k * 0.28), px * 0.23, px * 0.1); ctx.fillStyle = shade('#334', light, '#000', 0); ctx.fillRect(x - px * 0.1, y - px * 1.03, px * 0.2, px * 0.08); ctx.fillStyle = 'rgba(255,240,150,.95)'; ctx.fillRect(x - px * 0.07, y - px * 1.02, px * 0.14, px * 0.07); ctx.fillStyle = 'rgba(255,240,150,.12)'; ctx.beginPath(); ctx.moveTo(x, y - px * 0.99); ctx.lineTo(x + px * 1.4, y - px * 1.25); ctx.lineTo(x + px * 1.4, y - px * 0.72); ctx.closePath(); ctx.fill(); }
        else if (kind === 'tower') { ctx.fillStyle = shade('#a9905f', light, '#000', 0); ctx.fillRect(x - px * 0.12, y - px * 0.9, px * 0.24, px * 0.9); ctx.fillStyle = shade('#7c6a44', light, '#000', 0); ctx.beginPath(); ctx.moveTo(x - px * 0.16, y - px * 0.9); ctx.lineTo(x, y - px * 1.12); ctx.lineTo(x + px * 0.16, y - px * 0.9); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff8e0'; ctx.beginPath(); ctx.arc(x, y - px * 0.72, px * 0.08, 0, TAU); ctx.fill(); ctx.strokeStyle = '#333'; ctx.lineWidth = Math.max(1, px * 0.012); ctx.beginPath(); ctx.moveTo(x, y - px * 0.72); ctx.lineTo(x, y - px * 0.78); ctx.moveTo(x, y - px * 0.72); ctx.lineTo(x + px * 0.045, y - px * 0.71); ctx.stroke(); }
        else if (kind === 'waterfall') { ctx.fillStyle = shade('#6a7a6a', light, '#000', 0); ctx.fillRect(x - px * 0.4, y - px * 0.9, px * 0.8, px * 0.9); ctx.fillStyle = 'rgba(210,235,255,.85)'; ctx.fillRect(x - px * 0.13, y - px * 0.88, px * 0.26, px * 0.88); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(x, y, px * 0.3, px * 0.08, 0, 0, TAU); ctx.fill(); }
        else if (kind === 'coral') { const cols = ['#ff7a9a', '#ffb066', '#c78bff']; for (let k = 0; k < 3; k++) { ctx.fillStyle = shade(cols[k], light, '#000', 0); const bx = x + (k - 1) * px * 0.28; ctx.beginPath(); ctx.moveTo(bx - px * 0.1, y); ctx.lineTo(bx - px * 0.14, y - px * (0.5 + k * 0.12)); ctx.lineTo(bx + px * 0.14, y - px * (0.5 + k * 0.12)); ctx.lineTo(bx + px * 0.1, y); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(bx, y - px * (0.5 + k * 0.12), px * 0.16, 0, TAU); ctx.fill(); } ctx.fillStyle = 'rgba(200,240,255,.5)'; for (let k = 0; k < 5; k++) ctx.fillRect(x + (k - 2) * px * 0.16, y - px * (0.75 + (k % 2) * 0.1), 2, 2); }
        else if (kind === 'bigstop') { ctx.fillStyle = shade('#4a4a70', light, '#000', 0); ctx.fillRect(x - px * 0.03, y - px * 0.9, px * 0.06, px * 0.9); ctx.fillStyle = shade('#ffd86a', light, '#000', 0); ctx.beginPath(); ctx.arc(x, y - px * 0.95, px * 0.2, 0, TAU); ctx.fill(); ctx.fillStyle = '#4a3a10'; ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = px * (k % 2 ? 0.05 : 0.12); ctx.lineTo(x + Math.cos(a) * rr, y - px * 0.95 + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,230,150,.9)'; ctx.fillRect(x - px * 0.35, y - px * 0.4, px * 0.7, px * 0.04); }
        else if (kind === 'windmill') { ctx.fillStyle = shade('#e8dcc0', light, '#000', 0); ctx.beginPath(); ctx.moveTo(x - px * 0.16, y); ctx.lineTo(x + px * 0.16, y); ctx.lineTo(x + px * 0.1, y - px * 0.7); ctx.lineTo(x - px * 0.1, y - px * 0.7); ctx.closePath(); ctx.fill(); ctx.fillStyle = shade('#b5473a', light, '#000', 0); ctx.beginPath(); ctx.moveTo(x - px * 0.14, y - px * 0.7); ctx.lineTo(x, y - px * 0.85); ctx.lineTo(x + px * 0.14, y - px * 0.7); ctx.closePath(); ctx.fill(); ctx.strokeStyle = shade('#6b4a2a', light, '#000', 0); ctx.lineWidth = Math.max(1, px * 0.025); const rot = performance.now() * 0.0006; for (let k = 0; k < 4; k++) { const a = rot + k * Math.PI / 2; ctx.beginPath(); ctx.moveTo(x, y - px * 0.72); ctx.lineTo(x + Math.cos(a) * px * 0.36, y - px * 0.72 + Math.sin(a) * px * 0.36); ctx.stroke(); } }
        else if (kind === 'lodge') { ctx.fillStyle = shade('#8a5a3a', light, '#000', 0); ctx.fillRect(x - px * 0.35, y - px * 0.4, px * 0.7, px * 0.4); ctx.fillStyle = shade('#f4f7fb', light, '#000', 0); ctx.beginPath(); ctx.moveTo(x - px * 0.42, y - px * 0.4); ctx.lineTo(x, y - px * 0.75); ctx.lineTo(x + px * 0.42, y - px * 0.4); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,220,130,.95)'; ctx.fillRect(x - px * 0.22, y - px * 0.3, px * 0.12, px * 0.12); ctx.fillRect(x + px * 0.1, y - px * 0.3, px * 0.12, px * 0.12); }
        else if (kind === 'palms') { for (let k = -1; k <= 1; k++) { const bx = x + k * px * 0.3; ctx.fillStyle = shade('#8a6a3a', light, '#000', 0); ctx.fillRect(bx - px * 0.03, y - px * (0.6 + Math.abs(k) * 0.1), px * 0.06, px * (0.6 + Math.abs(k) * 0.1)); ctx.fillStyle = shade('#3f9a4a', light, '#000', 0); for (let f = 0; f < 5; f++) { const a = -Math.PI * 0.1 + f * (Math.PI * 1.2 / 4); ctx.beginPath(); ctx.ellipse(bx + Math.cos(a) * px * 0.16, y - px * (0.62 + Math.abs(k) * 0.1) + Math.sin(a) * px * 0.06, px * 0.18, px * 0.05, a, 0, TAU); ctx.fill(); } } }
        else if (kind === 'peak') { ctx.font = `${Math.round(px)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(world.regionId === 'snow' ? '🏔️' : '⛰️', x, y); }
        else if (kind === 'temple') { ctx.fillStyle = shade('#cdb98a', light, '#000', 0); for (let k = 0; k < 4; k++) { const w = px * (0.7 - k * 0.15), h = px * 0.16; ctx.fillRect(x - w / 2, y - h * (k + 1), w, h); } ctx.fillStyle = shade('#8a7a5a', light, '#000', 0); ctx.fillRect(x - px * 0.06, y - px * 0.16, px * 0.12, px * 0.16); }
        else if (kind === 'bridge') { ctx.strokeStyle = shade('#8a6a3a', light, '#000', 0); ctx.lineWidth = Math.max(2, px * 0.05); ctx.beginPath(); ctx.moveTo(x - px * 0.5, y); ctx.quadraticCurveTo(x, y - px * 0.5, x + px * 0.5, y); ctx.stroke(); for (let k = -2; k <= 2; k++) { const bx = x + k * px * 0.2; ctx.beginPath(); ctx.moveTo(bx, y - px * 0.02); ctx.lineTo(bx, y - px * (0.45 - Math.abs(k) * 0.08)); ctx.stroke(); } }
        else { ctx.font = `${Math.round(px)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('🌳', x, y); }
        ctx.restore();
      }
      // ---- キャラ(むき・しせいで ちがいを だす) ----
      function drawSprite(a, p, size, alpha, yaw) {
        const px = size * p.s; if (px < 3) return;
        const facing = facingOf(a.heading, yaw); const sprite = spriteFor(a, facing);
        // とおい ひとは かんたんに(シルエット)。そんざいは わかる
        if (px < 22) { ctx.globalAlpha = alpha != null ? alpha * 0.9 : 0.9; ctx.fillStyle = KIND_COLOR[a.kind] || KIND_COLOR.form; const bob = MOVING.has(a.state) ? Math.abs(Math.sin(a.bob * 4)) * px * 0.1 : 0; ctx.beginPath(); ctx.ellipse(p.sx, p.sy - px * 0.45 - bob, px * 0.28, px * 0.45, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; return; }
        const im = imageFor(sprite.asset);
        ctx.save();
        if (alpha != null) ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(p.sx, p.sy, px * 0.32, px * 0.09, 0, 0, TAU); ctx.fill();
        // しせい: あるく(おくへ は ゆれ ひかえめ、てまえへ は つよめ)、すわる、ねる、はなす(あいてへ かたむく)
        const toward = facing === 'back' ? 0.7 : facing === 'front' ? 1.3 : 1;
        let lift = a.state === 'swim' || a.state === 'sway' ? Math.sin(a.bob) * px * 0.06 : MOVING.has(a.state) ? Math.abs(Math.sin(a.bob * 4)) * px * 0.08 * toward : 0;
        let sxScale = 1, syScale = 1, rot = 0;
        if (facing === 'back' && !(a.sprites && a.sprites.back)) { syScale = 0.94; }
        if (MOVING.has(a.state) && (facing === 'left' || facing === 'right')) rot = (facing === 'left' ? -1 : 1) * 0.07;
        if (a.state === 'sit') { syScale = 0.9; sxScale = 1.04; }
        if (a.state === 'rest') { syScale = 0.92; rot = a.face * 0.08; }
        if (a.state === 'sleep') { rot = a.face * 0.28; syScale = 0.9; ctx.globalAlpha *= 0.85; }
        if (a.state === 'chat' || a.state === 'gather') rot = a.face * 0.07;
        if (a.state === 'look' || a.state === 'watch') rot = (facing === 'left' ? -1 : facing === 'right' ? 1 : 0) * 0.05;
        const y = p.sy - lift;
        ctx.translate(p.sx, y); ctx.rotate(rot); ctx.scale((sprite.flip ? -1 : 1) * sxScale, syScale);
        if (facing === 'back' && !(a.sprites && a.sprites.back)) ctx.filter = 'brightness(0.9)';
        if (im) ctx.drawImage(im, -px / 2, -px, px, px);
        else { ctx.font = `${Math.round(px * 0.9)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(a.emoji || '❓', 0, 0); }
        ctx.restore();
        const mark = a.state === 'sleep' ? '💤' : a.state === 'chat' ? '💬' : a.state === 'fish' ? '🎣' : a.state === 'play' || a.state === 'chase' ? '✨' : a.state === 'watch' ? '👀' : a.state === 'shop' ? '🛍️' : null;
        if (mark && px > 26) { ctx.font = `${Math.round(px * 0.32)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(mark, p.sx + px * 0.4, y - px * 0.85 + Math.sin(a.bob) * 2); }
      }
      function drawBubble(text, sx, sy) {
        const fontPx = 12; ctx.font = `bold ${fontPx}px sans-serif`;
        const lines = []; let cur = '';
        for (const ch of String(text)) { cur += ch; if (cur.length >= 13) { lines.push(cur); cur = ''; } } if (cur) lines.push(cur);
        const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16, h = lines.length * (fontPx + 3) + 10;
        const x = clamp(sx - w / 2, 4, W - w - 4), y = Math.max(4, sy - h - 8);
        ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, 8) : ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#223'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        lines.forEach((l, i) => ctx.fillText(l, x + 8, y + 5 + i * (fontPx + 3)));
      }
      function drawLabel(text, sx, sy, small) {
        ctx.font = `bold ${small ? 10 : 12}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = small ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.95)'; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 3;
        ctx.strokeText(text, sx, sy); ctx.fillText(text, sx, sy);
      }
      function draw(view, now) {
        if (!ctx) return;
        const { world, player, residents, party, nearest } = view; const e = view.env;
        setCamera(view.camera);
        const tl = TIME_LIGHT[e.time] || TIME_LIGHT.day; const wl = WEATHER_LIGHT[e.weather] || 0.9; const light = tl.light * wl;
        drawSky(world, e, tl, wl, now);
        drawBackdrop(world, e, light, tl);
        drawGround(world, e, tl, wl, light, now);
        // 立て看板(こもの・じゅうみん・いっしょの なかま・じぶん)を おくから じゅんに
        const items = [];
        for (const pr of world.props) { const p = project(pr.x, pr.z); if (p && p.s * pr.size >= 3 && p.sx > -100 && p.sx < W + 100 && p.dz < 5200) items.push({ kind: 'prop', o: pr, p, must: !!pr.landmark }); }
        const talkR = 130;
        for (const a of residents) { const p = project(a.x, a.z); if (p && p.s * ACTOR_SIZE >= 4 && p.sx > -60 && p.sx < W + 60) { const d = Math.hypot(a.x - player.x, a.z - player.z); items.push({ kind: 'actor', o: a, p, d, must: a === nearest || d < talkR * 1.5 }); } }
        for (const a of party) { const p = project(a.x, a.z); if (p) items.push({ kind: 'actor', o: a, p, d: Math.hypot(a.x - player.x, a.z - player.z), must: true }); }
        const pp = project(player.x, player.z); if (pp) items.push({ kind: 'player', p: pp, must: true });
        items.sort((u, v) => v.p.dz - u.p.dz);
        // 同時に えがく かず の せいげん: じぶん・なかま・はなせる きょりの じゅうみん・ランドマークは かならず。けずるのは とおい こもの から
        let drawList = items;
        if (items.length > cap) {
          let over = items.length - cap; const skip = new Set();
          for (const it of items) { if (over <= 0) break; if (it.kind === 'prop' && !it.must && it.o.layer !== 'wall') { skip.add(it); over--; } }
          for (const it of items) { if (over <= 0) break; if (!it.must && !skip.has(it)) { skip.add(it); over--; } }
          drawList = items.filter((it) => !skip.has(it));
        }
        const named = new Set(items.filter((it) => it.kind === 'actor' && !it.o.follow && it.o !== nearest && it.d < 300 && ACTOR_SIZE * it.p.s > 30).sort((u, v) => u.d - v.d).slice(0, 3).map((it) => it.o));
        for (const it of drawList) {
          if (it.kind === 'prop') {
            if (it.o.landmark) { drawLandmark(it.o.landmark, it.p, it.o.size, light, world); continue; }
            const px = it.o.size * it.p.s; ctx.font = `${Math.round(px)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.globalAlpha = clamp(1.4 - it.p.dz / 2800, 0.35, 1); ctx.fillText(it.o.emoji, it.p.sx, it.p.sy); ctx.globalAlpha = 1;
          }
          else if (it.kind === 'player') {
            const px = ACTOR_SIZE * it.p.s; const facing = facingOf(player.heading, cam.yaw);
            ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(it.p.sx, it.p.sy, px * 0.32, px * 0.09, 0, 0, TAU); ctx.fill();
            const lift = player.moving ? Math.abs(Math.sin(player.bob * 5)) * px * (facing === 'back' ? 0.06 : 0.09) : 0;
            ctx.save(); ctx.translate(it.p.sx, it.p.sy - lift); ctx.scale(facing === 'left' ? -1 : 1, facing === 'back' ? 0.95 : 1); if (player.moving && (facing === 'left' || facing === 'right')) ctx.rotate((facing === 'left' ? -1 : 1) * 0.06);
            ctx.font = `${Math.round(px * 0.9)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(playerGlyph(), 0, 0); ctx.restore();
          }
          else {
            const a = it.o; drawSprite(a, it.p, ACTOR_SIZE, clamp(1.5 - it.p.dz / 2800, 0.3, 1), cam.yaw);
            const top = it.p.sy - ACTOR_SIZE * it.p.s;
            if (a.say && a.sayFor > 0) drawBubble(a.say, it.p.sx, top);
            else if (a === nearest && it.p.s > 0.3) drawLabel(a.label + (a.state && VERBS[a.state] ? '・' + VERBS[a.state] : ''), it.p.sx, top - 4, false);
            else if (named.has(a)) drawLabel(a.label, it.p.sx, top - 3, true);
          }
        }
        if (e.weather === 'rain' || e.weather === 'snow') { ctx.fillStyle = e.weather === 'rain' ? 'rgba(180,210,255,.55)' : 'rgba(255,255,255,.85)'; const n = tier >= 2 ? 16 : 34; for (let i = 0; i < n; i++) { const x = (i * 97 + (now * (e.weather === 'rain' ? 0.02 : 0.005) * (i % 3 + 1))) % (W + 20) - 10; const y = (i * 61 + now * (e.weather === 'rain' ? 0.5 : 0.08) * (1 + (i % 4) * 0.3)) % (H + 20) - 10; if (e.weather === 'rain') ctx.fillRect(x, y, 1.5, 9); else { ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3), 0, TAU); ctx.fill(); } } }
        if (e.time === 'night' && world.sky !== 'stars') { ctx.fillStyle = 'rgba(10,15,45,.20)'; ctx.fillRect(0, 0, W, H); }
      }
      return { draw, project, facingOf, resize(n) { ctx = n.ctx; W = n.W; H = n.H; setup(); }, destroy() { skyCache = null; nebula = null; } };
    }

    // ================= がめん(DOM + にゅうりょく + フレームループ) =================
    // ここは「せかい」と「え」を つなぐだけ。opts.renderer で レンダラーを さしかえられる
    function start(container, opts = {}) {
      const state = getState();
      const locality = typeof S.selectedLocality === 'function' ? S.selectedLocality() : null;
      const tier = typeof S.perfTier === 'function' ? S.perfTier() : 0;
      const regionId0 = state.regionId || 'home';
      const sim = createSimulation({ regionId: regionId0, locality, discovered: typeof S.discoveredSpots === 'function' ? S.discoveredSpots(regionId0) : [] });
      let running = true, rafId = null, last = null, frame = 0, banner = null, bannerUntil = 0, lastHint = null;
      const regionLabel = () => (typeof S.regionLabel === 'function' ? S.regionLabel(sim.world.regionId, sim.world.local) : sim.world.regionId);
      const HINT_DEFAULT = 'パッドを なぞって あるく。だれかに ちかづくと「はなす」';
      if (container.classList) container.classList.add('meguru-overlay');
      container.innerHTML = `
        <div class="mg-header mg-meguru-header"><span id="mgrPlace"></span><span id="mgrCount"></span><span id="mgrFound"></span></div>
        <div class="mg-canvas-wrap mgr-wrap"><canvas class="mg-canvas" id="mgrCanvas"></canvas><div class="mgr-banner hidden" id="mgrBanner"></div><div class="mgr-spot hidden" id="mgrSpot"></div></div>
        <div class="mg-hint mgr-hint" id="mgrHint">${HINT_DEFAULT}</div>
      `;
      const row = S.createPadRow(container, `<button type="button" class="mg-tap-btn primary" id="mgrTalk" data-key="action" disabled>💬 はなす</button><button type="button" class="mg-tap-btn" id="mgrTravel">🧭 たび</button><button type="button" class="mg-tap-btn" id="mgrHome">🏠 もどる</button>`);
      const pad = S.createTouchPad(row, { mode: 'vector', sticky: true, before: row.firstChild || null, label: 'ここを なぞって あるく' });
      const canvas = container.querySelector('#mgrCanvas');
      const wrap = container.querySelector('.mgr-wrap');
      function availHeight() {
        const vh = typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight : 0;
        const rect = typeof container.getBoundingClientRect === 'function' ? container.getBoundingClientRect() : null;
        let oh = container.clientHeight || 0;
        if (vh && rect && rect.top >= 0) oh = Math.max(oh, vh - rect.top - 28);
        if (!oh) return 300;
        let used = 0;
        for (const ch of container.children) { if (ch === wrap) continue; used += ch.offsetHeight || 0; }
        return clamp(Math.floor(oh - used - 18), 240, 760);
      }
      let { ctx, W, H } = S.createMgCanvas(canvas, () => availHeight(), {});
      const placeEl = container.querySelector('#mgrPlace'), countEl = container.querySelector('#mgrCount'), foundEl = container.querySelector('#mgrFound'), hintEl = container.querySelector('#mgrHint'), bannerEl = container.querySelector('#mgrBanner'), spotEl = container.querySelector('#mgrSpot');
      const talkBtn = container.querySelector('#mgrTalk'), travelBtn = container.querySelector('#mgrTravel'), homeBtn = container.querySelector('#mgrHome');
      const rendererFactory = typeof opts.renderer === 'function' ? opts.renderer : createCanvasRenderer;
      const renderer = rendererFactory({ canvas, ctx, W, H, tier, playerGlyph: typeof S.playerGlyph === 'function' ? S.playerGlyph : () => '🐣' });
      let resizeTimer = null;
      const onResize = () => { if (resizeTimer) clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { resizeTimer = null; if (!running) return; const n = S.createMgCanvas(canvas, () => availHeight(), {}); ctx = n.ctx; W = n.W; H = n.H; if (typeof renderer.resize === 'function') renderer.resize({ ctx, W, H }); }, 150); };
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') window.addEventListener('resize', onResize);
      const ENV_ICON = { sunny: '☀️', cloudy: '☁️', rain: '🌧️', snow: '🌨️' }; const TIME_ICON = { morning: '🌅', day: '🌞', evening: '🌇', night: '🌙' };
      // HUD: ばしょ / この 地域に すんでいる かず / こんかい ちかくで あった かず
      const hud = () => {
        const e = sim.env;
        placeEl.innerHTML = `${regionLabel()} <span class="mgr-env">${TIME_ICON[e.time] || ''}${ENV_ICON[e.weather] || ''}</span>`;
        countEl.textContent = `${sim.world.residents.length}たい`;
        foundEl.textContent = `であった ${sim.metCount()}`;
      };
      const showBanner = (text, ms) => { banner = text; bannerUntil = performance.now() + ms; bannerEl.textContent = text; bannerEl.classList.remove('hidden'); };
      const showSpot = (s) => { if (!s) { spotEl.classList.add('hidden'); return; } spotEl.textContent = `${s.secret ? '🔍 ' : ''}${s.label}`; spotEl.classList.remove('hidden'); };
      const plainLabel = (id) => (typeof S.regionPlainLabel === 'function' ? S.regionPlainLabel(id, sim.world.local) : id);
      showBanner(`${plainLabel(sim.world.regionId)}を めぐる`, 1600);
      hud();
      function enterWorld(regionId) {
        sim.enterRegion(regionId, { registry: buildRegistry(), locality: typeof S.selectedLocality === 'function' ? S.selectedLocality() : null, discovered: typeof S.discoveredSpots === 'function' ? S.discoveredSpots(regionId) : [] });
        sim.setEnv(env());
        talkBtn.disabled = true; showSpot(null);
        showBanner(`${plainLabel(regionId)}に ついた`, 1600);
        hud();
      }
      function frameFn(now) {
        if (!running) return;
        if (last === null) last = now; const dt = Math.min(0.05, (now - last) / 1000); last = now; frame++;
        const st = getState();
        if (st.regionId !== sim.world.regionId) enterWorld(st.regionId || 'home');
        if (frame % 30 === 0) { const nx = env(); const changed = nx.time !== sim.env.time || nx.weather !== sim.env.weather; sim.setEnv(nx); if (changed) hud(); }
        const events = sim.step(dt, pad.vector());
        for (const ev of events) {
          if (ev.type === 'met') { if (typeof S.recordMet === 'function') S.recordMet(ev.actor.key); hud(); }
          else if (ev.type === 'nearest') talkBtn.disabled = !ev.actor;
          else if (ev.type === 'spot') { showSpot(ev.spot); if (ev.first) { showBanner(`${ev.spot.label}を みつけた`, 1500); sfx('pop'); if (typeof S.recordSpot === 'function') S.recordSpot(sim.world.regionId, ev.spot.id); } }
        }
        const nearest = sim.nearest;
        const hint = nearest ? `${nearest.label}が ${VERBS[nearest.state] || 'いる'}` : sim.spot ? `【${sim.spot.label}】${sim.spot.secret ? 'ひみつの ばしょ。' : ''}${HINT_DEFAULT}` : HINT_DEFAULT;
        if (hint !== lastHint) { lastHint = hint; hintEl.textContent = hint; }
        if (banner && now >= bannerUntil) { banner = null; bannerEl.classList.add('hidden'); }
        if (!(tier >= 2 && frame % 2 === 1)) renderer.draw(sim.view(), now);
        rafId = requestAnimationFrame(frameFn);
      }
      function talk() {
        const r = sim.talk();
        if (!r) return;
        sfx('pop');
        if (typeof S.recordTalk === 'function') S.recordTalk(r.actor.key);
      }
      talkBtn.addEventListener('click', talk);
      travelBtn.addEventListener('click', () => { if (typeof S.openTravel === 'function') S.openTravel(); });
      homeBtn.addEventListener('click', () => stop());
      function stop() {
        if (!running) return; running = false; if (rafId) cancelAnimationFrame(rafId);
        if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') window.removeEventListener('resize', onResize);
        if (resizeTimer) clearTimeout(resizeTimer);
        pad.destroy(); renderer.destroy && renderer.destroy();
        if (container.classList) container.classList.remove('meguru-overlay');
        if (typeof S.onExit === 'function') S.onExit();
      }
      rafId = requestAnimationFrame(frameFn);
      return { stop, get running() { return running; }, sim, renderer, get world() { return sim.world; }, get party() { return sim.party; }, get player() { return sim.player; }, talk, enterWorld, get nearest() { return sim.nearest; }, setPlayer(x, z) { sim.setPlayer(x, z); }, get canvasSize() { return { W, H }; } };
    }

    return { WORLDS, WORLD_STYLE, HABITAT, NORMAL_REGIONS, RULES, PATH_HALF, CAM_PROFILES, buildRegistry, buildWorld, companionsOf, talkLine, chooseState, updateActor, createSimulation, createCanvasRenderer, start, reachableSpots, pathSegments, nearestPath, onPath, facingOf, spriteFor, wrapAngle };
  };
})();
