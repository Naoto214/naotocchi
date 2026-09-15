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
    // zones: 地区(その 地域の どのあたりか)。mood は みための きぶん(light: あかるさ, fog: きり, tint: じめんの いろ, walls: しゃへいぶつの おおさ,
    //   marks: じめんの もようの いろ/しゅるい, lane: こみちの わきの もの)。あるく いちで となりの 地区の mood と なめらかに まざる
    // halfW: よこの ひろさ(±)。len: おくゆき。地域ごとに ひろさも かたちも ちがう
    const Z = (id, label, mood) => ({ id, label, mood: mood || {} });
    const WORLDS = {
      // おうち: コンパクトで おちついた ばしょ
      home: { len: 2600, halfW: 1000, ground: ['#a9d98a', '#8fc574'], path: '#e5d5b0', props: ['🌸', '🪴', '🌼', '🌳', '🌷', '🪵'],
        zones: [Z('front', 'いえのまえ'), Z('back', 'うらにわ', { tint: '#9fd48a' }), Z('far', 'おおきなきのまわり', { light: 0.95, fog: 0.08 })],
        spots: [sp('gate', 'いえのまえ', 0, 250, 200, 'plaza', 1, { zone: 'front' }), sp('yard', 'にわ', 0, 780, 260, 'plaza', 7, { hub: true, prop: '🪴', zone: 'front' }), sp('house', 'おうちのよこ', -620, 1050, 170, 'rest', 3, { prop: '🏠', zone: 'front' }), sp('garden', 'はなばたけ', -700, 1600, 200, 'grove', 3, { prop: '🌷', zone: 'back' }), sp('lane', 'こみち', 0, 1300, 170, 'path', 1, { zone: 'back' }), sp('park', 'こうえん', 0, 1850, 260, 'plaza', 6, { prop: '🛝', zone: 'back' }), sp('shed', 'のきした', 620, 1050, 150, 'shelter', 3, { prop: '🛖', zone: 'front' }), sp('bench', 'ベンチ', 700, 1550, 150, 'rest', 3, { prop: '🪑', zone: 'back' }), sp('pond', 'ひみつのいけ', -420, 2150, 140, 'water', 1, { secret: true, prop: '💧', zone: 'far' }), sp('bigtree', 'おおきなき', 0, 2380, 200, 'edge', 2, { landmark: 'bigtree', cam: 'wide', zone: 'far' })],
        paths: [['gate', 'yard', 'wide'], ['yard', 'house'], ['house', 'garden'], ['yard', 'lane'], ['lane', 'park'], ['yard', 'shed'], ['shed', 'bench'], ['bench', 'park'], ['garden', 'park', 'narrow'], ['garden', 'pond', 'secret'], ['park', 'bigtree']] },
      // とかい: 街区型。じゅうじろ・ろじ・うらみち・こうえん・しょうてんがい
      city: { len: 3600, halfW: 1300, ground: ['#b9bcc4', '#9ea3ad'], path: '#d9d5cc', props: ['🏢', '🏬', '🚦', '💡', '🌳', '🚕', '🏪', '🎡'],
        zones: [Z('station', 'えきまえ'), Z('shopping', 'しょうてんがい', { tint: '#c9c0b0', lane: ['🏪', '🪧', '💡', '🚲', '🏮'] }), Z('park', 'こうえん', { tint: '#9fc98a', walls: 0.6 }), Z('back', 'ろじうら', { light: 0.86, tint: '#8f9299', walls: 1.3, lane: ['🗑️', '🚧', '🚲', '💡'] }), Z('uptown', 'たかだい', { light: 1.02, fog: 0.05 })],
        spots: [sp('station', 'えきまえ', 0, 250, 220, 'plaza', 3, { prop: '🚉', zone: 'station' }), sp('square', 'えきまえひろば', 0, 800, 280, 'plaza', 8, { hub: true, prop: '⛲', zone: 'station' }), sp('cross1', 'おおどおりのこうさてん', -700, 800, 170, 'path', 2, { prop: '🚦', zone: 'shopping' }), sp('cross2', 'こうさてん', 700, 800, 170, 'path', 2, { prop: '🚦', zone: 'park' }), sp('arcade', 'しょうてんがい', -700, 1400, 220, 'shop', 5, { prop: '🏪', zone: 'shopping' }), sp('bakery', 'パンやのまえ', -1200, 1400, 160, 'shop', 3, { prop: '🏬', zone: 'shopping' }), sp('alley', 'ろじうら', -1200, 2000, 150, 'path', 1, { zone: 'back' }), sp('cats', 'ねこのばしょ', -900, 2500, 140, 'rest', 1, { secret: true, prop: '🐾', zone: 'back' }), sp('park', 'こうえん', 700, 1400, 240, 'plaza', 4, { prop: '🌳', zone: 'park' }), sp('pond', 'こうえんのいけ', 1200, 1700, 180, 'water', 3, { zone: 'park' }), sp('cafe', 'カフェどおり', 0, 1400, 180, 'shelter', 4, { prop: '☕', zone: 'station' }), sp('cross3', 'さかのこうさてん', 0, 2000, 170, 'path', 2, { prop: '🚦', zone: 'uptown' }), sp('lookout', 'てんぼうひろば', 0, 2600, 240, 'edge', 3, { cam: 'wide', zone: 'uptown' }), sp('tower', 'とけいとう', 0, 3250, 220, 'edge', 2, { landmark: 'tower', zone: 'uptown' }), sp('backlot', 'ビルのうら', 700, 2200, 150, 'path', 1, { zone: 'back' }), sp('rooftop', 'やねのうえ', 1250, 2700, 140, 'rest', 1, { secret: true, zone: 'back' }), sp('market', 'よいちのひろば', -500, 2900, 220, 'plaza', 4, { prop: '🏮', zone: 'uptown' })],
        paths: [['station', 'square', 'wide'], ['square', 'cross1', 'wide'], ['square', 'cross2', 'wide'], ['square', 'cafe'], ['cross1', 'arcade'], ['arcade', 'bakery'], ['bakery', 'alley', 'narrow'], ['alley', 'cats', 'secret'], ['cross2', 'park'], ['park', 'pond'], ['cafe', 'cross3'], ['cross3', 'lookout'], ['lookout', 'tower'], ['arcade', 'cross3', 'narrow'], ['park', 'backlot', 'narrow'], ['backlot', 'cross3', 'narrow'], ['backlot', 'rooftop', 'secret'], ['alley', 'market', 'narrow'], ['market', 'lookout'], ['pond', 'backlot', 'narrow']] },
      // いなか: ひろい へいめん型。みちは すくなく、とおくの ふうしゃ や いえが めじるし
      countryside: { len: 3800, halfW: 1600, ground: ['#b8d98a', '#8fbf6a'], path: '#d8c79a', props: ['🌾', '🌻', '🪵', '🚜', '🌳', '🌼', '🏚️', '🏡'],
        zones: [Z('village', 'むら'), Z('fields', 'はたけ', { tint: '#c9c77a', walls: 0.5 }), Z('meadow', 'そうげん', { tint: '#a9d98a', walls: 0.4, light: 1.04 }), Z('hill', 'おか', { light: 1.05, walls: 0.5 }), Z('far', 'むらのはずれ', { fog: 0.1, walls: 0.6 })],
        spots: [sp('gate', 'むらのいりぐち', 0, 250, 200, 'plaza', 1, { zone: 'village' }), sp('village', 'むらのひろば', 0, 850, 280, 'plaza', 7, { hub: true, prop: '🏡', zone: 'village' }), sp('field1', 'はたけ', -900, 1100, 220, 'grove', 3, { prop: '🌾', zone: 'fields' }), sp('field2', 'ひろいはたけ', -1400, 1700, 240, 'grove', 2, { prop: '🌾', zone: 'fields' }), sp('scarecrow', 'かかしのみち', -800, 2000, 170, 'path', 1, { prop: '🪧', zone: 'fields' }), sp('windmill', 'ふうしゃ', -1300, 2700, 180, 'edge', 2, { landmark: 'windmill', zone: 'far' }), sp('meadow', 'そうげん', 900, 1200, 260, 'plaza', 3, { zone: 'meadow' }), sp('pasture', 'ぼくじょう', 1400, 1800, 220, 'grove', 3, { prop: '🪧', zone: 'meadow' }), sp('barn', 'なや', 700, 1900, 170, 'shelter', 3, { prop: '🏚️', zone: 'meadow' }), sp('road', 'あぜみち', 0, 1500, 170, 'path', 1, { zone: 'village' }), sp('hill', 'ひなたのおか', 0, 2300, 260, 'plaza', 5, { prop: '🌻', zone: 'hill' }), sp('shrine', 'ちいさなほこら', 600, 2800, 160, 'rest', 2, { prop: '⛩️', zone: 'hill' }), sp('oldtree', 'おおきなき', 0, 3400, 200, 'edge', 2, { landmark: 'bigtree', cam: 'wide', zone: 'far' }), sp('pond', 'かくれたためいけ', -1500, 3300, 140, 'water', 1, { secret: true, zone: 'far' }), sp('well', 'いど', -400, 2900, 160, 'rest', 2, { prop: '🏺', zone: 'far' })],
        paths: [['gate', 'village', 'wide'], ['village', 'field1'], ['field1', 'field2'], ['field2', 'windmill', 'narrow'], ['field1', 'scarecrow', 'narrow'], ['scarecrow', 'hill'], ['village', 'road'], ['road', 'hill'], ['village', 'meadow'], ['meadow', 'pasture'], ['meadow', 'barn'], ['barn', 'hill'], ['hill', 'shrine'], ['shrine', 'oldtree', 'narrow'], ['hill', 'well'], ['well', 'oldtree'], ['windmill', 'pond', 'secret'], ['windmill', 'well', 'narrow'], ['pasture', 'shrine', 'narrow']] },
      // もり: めいろ型。にた こだちが つづき、ふたまた・みつまた・ループ・ほそみち。おおきな き・たき・かわ・ひかる キノコが めじるし
      forest: { len: 4400, halfW: 1500, ground: ['#7fb26b', '#57894e'], path: '#b7a27a', props: ['🌲', '🌲', '🌳', '🍄', '🌿', '🌰', '🪵', '🍂'],
        zones: [Z('bright', 'あかるいもり', { light: 1.04 }), Z('creek', 'おがわのあたり', { tint: '#7fb8a0', walls: 0.9 }), Z('thicket', 'にたようなこだち', { light: 0.88, fog: 0.16, walls: 1.35 }), Z('mushroom', 'キノコのもり', { light: 0.8, fog: 0.24, tint: '#5f6f8f', marks: { color: '#9ad0ff', kind: 'sparkle' }, lane: ['🍄', '🍄', '✨', '🌿'] }), Z('deep', 'ふかいもり', { light: 0.68, fog: 0.4, tint: '#3f5a40', walls: 1.5, lane: ['🌿', '🪨', '🍄', '🌱'] }), Z('great', 'おおきなきのまわり', { light: 0.85, fog: 0.2, tint: '#5a7a4a' })],
        spots: [sp('entry', 'もりのいりぐち', 0, 250, 200, 'plaza', 1, { zone: 'bright' }), sp('bright1', 'あかるいこみち', 0, 750, 220, 'path', 2, { hub: true, zone: 'bright' }), sp('bright2', 'ひだまり', -500, 1100, 240, 'plaza', 5, { prop: '🪵', zone: 'bright' }), sp('bright3', 'きのねっこ', 520, 1150, 180, 'grove', 2, { zone: 'bright' }), sp('creek1', 'おがわ', -1050, 1500, 200, 'water', 4, { prop: '💧', zone: 'creek' }), sp('bridge1', 'まるたのはし', -950, 2000, 150, 'path', 1, { prop: '🌉', zone: 'creek' }), sp('bridge2', 'いしのはし', -300, 2400, 150, 'path', 1, { prop: '🌉', zone: 'creek' }), sp('creek2', 'おがわのふち', -1250, 2600, 180, 'water', 3, { zone: 'creek' }), sp('thicket1', 'にたようなこだち', 0, 1650, 150, 'path', 1, { zone: 'thicket' }), sp('thicket2', 'にたようなこだち', 400, 2100, 150, 'path', 1, { zone: 'thicket' }), sp('thicket3', 'まよいのわかれみち', -150, 2150, 150, 'path', 1, { zone: 'thicket' }), sp('fork', 'みつまた', 150, 2650, 200, 'plaza', 3, { prop: '🪧', zone: 'thicket' }), sp('hollow', 'きのうろ', 1000, 1750, 160, 'shelter', 3, { prop: '🌳', zone: 'thicket' }), sp('rest', 'きゅうけいばしょ', 1150, 2400, 160, 'rest', 3, { prop: '🪵', zone: 'thicket' }), sp('mush1', 'ひかるキノコ', -700, 3000, 220, 'grove', 4, { landmark: 'glowmushroom', zone: 'mushroom' }), sp('mush2', 'キノコのこみち', -1200, 3300, 170, 'grove', 2, { prop: '🍄', zone: 'mushroom' }), sp('deep1', 'ふかいもり', 300, 3200, 220, 'grove', 3, { zone: 'deep' }), sp('deep2', 'こけのいわ', 900, 3100, 160, 'rest', 2, { prop: '🪨', zone: 'deep' }), sp('oldsign', 'ふるいひょうしき', 600, 3650, 150, 'path', 1, { prop: '🪧', zone: 'deep' }), sp('great', 'おおきなき', 0, 4000, 240, 'edge', 3, { landmark: 'bigtree', cam: 'wide', zone: 'great' }), sp('falls', 'たき', -800, 3900, 200, 'water', 3, { landmark: 'waterfall', zone: 'great' }), sp('hiddenpond', 'かくれたいけ', -1400, 2100, 130, 'water', 1, { secret: true, zone: 'creek' }), sp('nook', 'こけむしたくぼみ', 1350, 3450, 130, 'rest', 1, { secret: true, zone: 'deep' })],
        paths: [['entry', 'bright1', 'wide'], ['bright1', 'bright2'], ['bright1', 'bright3'], ['bright1', 'thicket1'], ['bright2', 'creek1'], ['creek1', 'bridge1'], ['bridge1', 'thicket3', 'narrow'], ['bridge1', 'creek2', 'narrow'], ['creek2', 'mush2', 'narrow'], ['thicket1', 'thicket3', 'narrow'], ['thicket1', 'thicket2', 'narrow'], ['thicket3', 'fork', 'narrow'], ['thicket2', 'fork', 'narrow'], ['thicket2', 'thicket3', 'narrow'], ['bright3', 'hollow'], ['hollow', 'rest'], ['rest', 'thicket2', 'narrow'], ['fork', 'bridge2', 'narrow'], ['bridge2', 'mush1'], ['mush1', 'mush2', 'narrow'], ['fork', 'deep1'], ['deep1', 'deep2', 'narrow'], ['rest', 'deep2', 'narrow'], ['deep1', 'oldsign'], ['oldsign', 'great'], ['mush1', 'falls', 'narrow'], ['falls', 'great', 'narrow'], ['deep2', 'oldsign', 'narrow'], ['bridge1', 'hiddenpond', 'secret'], ['deep2', 'nook', 'secret']] },
      // やま: とざんどう型。ひだりみぎへ おおきく おりかえし、たかく なっていく
      mountain: { len: 4800, halfW: 1100, ground: ['#a3a58d', '#7b7f6b'], path: '#c9bda0', props: ['⛰️', '🪨', '🌲', '🥾', '🏕️', '☁️', '🪧', '🪨'],
        zones: [Z('foot', 'ふもと', { tint: '#9fbf7a' }), Z('lower', 'やまみち', { walls: 1.1 }), Z('middle', 'キャンプのあたり', { light: 0.98, tint: '#a9a88f' }), Z('upper', 'おねのうえ', { light: 1.04, fog: 0.12, tint: '#b8bcae', walls: 0.7, lane: ['🪨', '🪨', '🌼', '☁️'] }), Z('summit', 'ちょうじょう', { light: 1.08, fog: 0.22, tint: '#d0d3cc', walls: 0.4 })],
        spots: [sp('foot', 'ふもと', 0, 250, 200, 'plaza', 1, { zone: 'foot' }), sp('trailhead', 'とざんぐち', 0, 800, 240, 'plaza', 4, { hub: true, prop: '🪧', zone: 'foot' }), sp('sw1', 'おりかえし', -800, 1300, 150, 'path', 1, { zone: 'lower' }), sp('sw2', 'おりかえし', 800, 1800, 150, 'path', 1, { zone: 'lower' }), sp('spring', 'おんせん', -900, 2100, 200, 'water', 4, { prop: '♨️', zone: 'lower' }), sp('camp', 'キャンプ', 0, 2400, 240, 'shelter', 5, { prop: '🏕️', zone: 'middle' }), sp('cliff', 'がけのうえ', 900, 2700, 170, 'edge', 2, { prop: '🪨', zone: 'middle' }), sp('cave', 'かくれたどうくつ', 1000, 3200, 150, 'shelter', 1, { secret: true, prop: '🕳️', zone: 'middle' }), sp('sw3', 'おりかえし', -800, 3000, 150, 'path', 1, { zone: 'upper' }), sp('lake', 'やまのみずうみ', -500, 3500, 180, 'water', 2, { zone: 'upper' }), sp('ridge', 'おね', 300, 3600, 220, 'plaza', 3, { prop: '🪨', zone: 'upper' }), sp('hut', 'やまごや', 700, 4000, 160, 'rest', 3, { prop: '🛖', zone: 'upper' }), sp('summit', 'ちょうじょう', 0, 4500, 220, 'edge', 3, { landmark: 'peak', cam: 'wide', zone: 'summit' }), sp('shrine', 'いしのほこら', -900, 4200, 140, 'rest', 1, { secret: true, zone: 'summit' })],
        paths: [['foot', 'trailhead', 'wide'], ['trailhead', 'sw1'], ['sw1', 'sw2'], ['sw2', 'camp'], ['sw1', 'spring', 'narrow'], ['spring', 'camp', 'narrow'], ['camp', 'cliff'], ['cliff', 'cave', 'secret'], ['camp', 'sw3'], ['sw3', 'lake'], ['lake', 'ridge', 'narrow'], ['sw3', 'ridge'], ['ridge', 'hut'], ['hut', 'summit'], ['ridge', 'summit', 'narrow'], ['lake', 'shrine', 'secret'], ['cliff', 'ridge', 'narrow']] },
      // ゆきぐに: せつげん型。ひろい ゆきはら + はやし + ロッジ + こおった みずうみ。あしあとの みち
      snow: { len: 3800, halfW: 1500, ground: ['#eef4fb', '#d3e0ee'], path: '#dfe7f0', props: ['❄️', '🪵', '🌲', '🏔️', '🧣', '🧊', '🛷', '🌨️'],
        zones: [Z('gate', 'ゆきのいりぐち'), Z('field', 'ゆきはら', { light: 1.05, walls: 0.35 }), Z('woods', 'まつばやし', { light: 0.9, fog: 0.12, walls: 1.4 }), Z('lake', 'こおりのみずうみ', { tint: '#dbe9f5', walls: 0.4, fog: 0.08 }), Z('peak', 'ゆきやまのふもと', { fog: 0.2, light: 1.02, walls: 0.6 })],
        spots: [sp('gate', 'ゆきのいりぐち', 0, 250, 200, 'plaza', 1, { zone: 'gate' }), sp('field', 'ゆきはら', 0, 850, 300, 'plaza', 7, { hub: true, prop: '🛷', zone: 'field' }), sp('lodge', 'ロッジ', -900, 1100, 200, 'rest', 5, { landmark: 'lodge', zone: 'field' }), sp('snowman', 'ゆきだるまのおか', 900, 1200, 220, 'plaza', 3, { prop: '🧣', zone: 'field' }), sp('pines', 'まつばやし', 1300, 1900, 200, 'grove', 3, { prop: '🌲', zone: 'woods' }), sp('cave', 'ゆきのどうくつ', 1400, 2600, 150, 'shelter', 1, { secret: true, prop: '🕳️', zone: 'woods' }), sp('tracks', 'あしあとのみち', -500, 1700, 150, 'path', 1, { zone: 'field' }), sp('icelake', 'こおりのみずうみ', -1100, 2200, 240, 'water', 3, { prop: '🧊', zone: 'lake' }), sp('fishing', 'こおりのつりば', -1400, 2900, 160, 'water', 2, { prop: '🎣', zone: 'lake' }), sp('igloo', 'かまくら', -400, 2700, 160, 'shelter', 2, { prop: '🛖', zone: 'lake' }), sp('slope', 'げれんで', 500, 2400, 200, 'path', 2, { prop: '🎿', zone: 'peak' }), sp('lift', 'リフトのりば', 900, 3100, 160, 'rest', 2, { prop: '🎿', zone: 'peak' }), sp('peak', 'ゆきやま', 0, 3450, 220, 'edge', 2, { landmark: 'peak', cam: 'wide', zone: 'peak' }), sp('sled', 'そりのさか', 300, 1500, 150, 'path', 1, { prop: '🛷', zone: 'field' })],
        paths: [['gate', 'field', 'wide'], ['field', 'lodge'], ['lodge', 'icelake'], ['icelake', 'fishing', 'narrow'], ['icelake', 'igloo'], ['igloo', 'peak', 'narrow'], ['field', 'tracks', 'narrow'], ['tracks', 'igloo', 'narrow'], ['field', 'snowman'], ['snowman', 'pines'], ['pines', 'cave', 'secret'], ['pines', 'slope', 'narrow'], ['field', 'sled'], ['sled', 'slope'], ['slope', 'lift'], ['lift', 'peak'], ['slope', 'peak', 'narrow'], ['snowman', 'sled', 'narrow']] },
      // うみ: かいがんせん型。みぎへ ひだりへ わんきょくして すすみ、みさき・いりえ・さんばし・いわばへ
      sea: { len: 4000, halfW: 1500, ground: ['#f2e2b6', '#e2cf9a'], path: '#f7ecc9', props: ['🐚', '⛵', '🌴', '🏖️', '⛱️', '☀️', '🌊', '🪸'],
        zones: [Z('beach', 'すなはま', { light: 1.05, walls: 0.5 }), Z('tidepools', 'しおだまりのあたり', { tint: '#e8dcb0', walls: 0.7 }), Z('pier', 'さんばしのあたり', { walls: 0.5 }), Z('rocks', 'いわば', { tint: '#c8bfa8', walls: 1.2, lane: ['🪨', '🪨', '🐚', '🌊'] }), Z('cape', 'みさき', { light: 1.02, fog: 0.15, walls: 0.6 })],
        spots: [sp('beach', 'すなはま', 0, 250, 240, 'plaza', 2, { zone: 'beach' }), sp('shore', 'なみうちぎわ', 0, 800, 300, 'plaza', 7, { hub: true, prop: '🌊', zone: 'beach' }), sp('tidepool', 'しおだまり', -800, 1000, 220, 'water', 4, { prop: '🪸', zone: 'tidepools' }), sp('cove', 'かくれたいりえ', -1400, 1500, 140, 'water', 1, { secret: true, zone: 'tidepools' }), sp('shells', 'かいがらのはま', -700, 1600, 200, 'plaza', 2, { prop: '🐚', zone: 'tidepools' }), sp('pier', 'さんばし', 500, 1300, 200, 'path', 2, { prop: '⛵', zone: 'pier' }), sp('hut', 'うみのいえ', 300, 1900, 200, 'shelter', 4, { prop: '🏚️', zone: 'pier' }), sp('boats', 'ふねのふとう', 1100, 1700, 170, 'rest', 2, { prop: '⛵', zone: 'pier' }), sp('rocks', 'いわば', -300, 2400, 220, 'grove', 2, { prop: '🪨', zone: 'rocks' }), sp('rockpool', 'いわばのしおだまり', -900, 2700, 180, 'water', 2, { zone: 'rocks' }), sp('cape', 'みさき', 400, 2900, 200, 'edge', 2, { zone: 'cape' }), sp('lighthouse', 'とうだい', 900, 3500, 220, 'edge', 2, { landmark: 'lighthouse', cam: 'wide', zone: 'cape' }), sp('cliffcave', 'がけのどうくつ', -400, 3400, 140, 'rest', 1, { secret: true, zone: 'cape' }), sp('dunes', 'すなおか', 1200, 2400, 170, 'path', 1, { zone: 'cape' })],
        paths: [['beach', 'shore', 'wide'], ['shore', 'tidepool'], ['tidepool', 'cove', 'secret'], ['tidepool', 'shells'], ['shells', 'rocks', 'narrow'], ['shore', 'pier'], ['pier', 'hut'], ['pier', 'boats'], ['hut', 'rocks'], ['rocks', 'rockpool', 'narrow'], ['rocks', 'cape'], ['cape', 'lighthouse'], ['boats', 'dunes', 'narrow'], ['dunes', 'lighthouse', 'narrow'], ['rockpool', 'cliffcave', 'secret'], ['hut', 'cape', 'narrow']] },
      // しんかい: めいきゅう型。サンゴ・いわ・かいそうで しかいが せまく、どうくつ や かいこうへ えだわかれ
      deepsea: { len: 4000, halfW: 1300, ground: ['#1f3f66', '#14294a'], path: '#2b4f78', props: ['🪸', '🫧', '🌿', '🪨', '⚓', '💡', '🐚', '🫧'],
        zones: [Z('reef', 'サンゴのまち', { light: 1.05 }), Z('kelp', 'こんぶのもり', { light: 0.8, fog: 0.25, walls: 1.5, tint: '#1e4a4a' }), Z('wreck', 'ちんぼつせんのあたり', { light: 0.85, walls: 1.2, tint: '#2c3f58' }), Z('glow', 'ひかるふかば', { light: 0.9, tint: '#274f7a', marks: { color: '#9fe8ff', kind: 'sparkle' } }), Z('trench', 'かいこう', { light: 0.6, fog: 0.4, tint: '#0d1c33', walls: 1.3 })],
        spots: [sp('reef', 'サンゴのいりぐち', 0, 250, 240, 'water', 2, { zone: 'reef' }), sp('coralcity', 'サンゴのまち', 0, 800, 300, 'plaza', 7, { hub: true, landmark: 'coral', zone: 'reef' }), sp('kelp1', 'こんぶのもり', -900, 1100, 240, 'grove', 3, { prop: '🌿', zone: 'kelp' }), sp('kelp2', 'こんぶのおく', -1200, 1800, 200, 'grove', 2, { prop: '🌿', zone: 'kelp' }), sp('vent', 'あたたかいあな', -700, 2400, 200, 'rest', 3, { prop: '🫧', zone: 'kelp' }), sp('wreck', 'ちんぼつせん', 900, 1200, 220, 'shelter', 4, { prop: '⚓', zone: 'wreck' }), sp('cabin', 'せんちょうしつ', 1200, 1900, 170, 'rest', 2, { zone: 'wreck' }), sp('cavern', 'ふねのうらのどうくつ', 1300, 2600, 140, 'rest', 1, { secret: true, zone: 'wreck' }), sp('glow1', 'ひかるふかば', 0, 1500, 220, 'water', 3, { prop: '💡', zone: 'glow' }), sp('glow2', 'ひかりのにわ', 300, 2200, 220, 'water', 3, { prop: '💡', zone: 'glow' }), sp('anglers', 'ちょうちんのみち', -200, 2900, 170, 'path', 1, { zone: 'trench' }), sp('trench', 'かいこうのふち', 0, 3400, 220, 'water', 2, { zone: 'trench' }), sp('abyss', 'いちばんふかいところ', 0, 3900, 200, 'deep', 1, { zone: 'trench' }), sp('hotspring', 'かいていのおんせん', 800, 3200, 150, 'rest', 2, { secret: true, zone: 'trench' })],
        paths: [['reef', 'coralcity', 'wide'], ['coralcity', 'kelp1'], ['kelp1', 'kelp2', 'narrow'], ['kelp2', 'vent', 'narrow'], ['vent', 'anglers', 'narrow'], ['coralcity', 'wreck'], ['wreck', 'cabin'], ['cabin', 'cavern', 'secret'], ['cabin', 'glow2', 'narrow'], ['coralcity', 'glow1'], ['glow1', 'glow2'], ['glow2', 'anglers'], ['anglers', 'trench'], ['trench', 'abyss', 'narrow'], ['glow2', 'hotspring', 'secret'], ['kelp1', 'glow1', 'narrow']] },
      // かわ・みずうみ: みずべ ついじゅう型。かわに そって あるき、はしで りょうぎしを いききし、みずうみで ひらける
      river_lake: { len: 4000, halfW: 1300, ground: ['#a9d38d', '#82b46f'], path: '#d3c39a', props: ['🌿', '🪷', '🎣', '🪨', '💧', '🌾', '🌳', '🌈'],
        zones: [Z('bank', 'かわぎし'), Z('bridge', 'はしのあたり', { tint: '#9fc98a', walls: 0.9 }), Z('lake', 'みずうみのほとり', { light: 1.05, tint: '#b9dcb0', walls: 0.4, fog: 0.08 })],
        spots: [sp('bank', 'かわぎし', 0, 250, 200, 'plaza', 1, { zone: 'bank' }), sp('riverside', 'かわぎしのひろば', 0, 800, 280, 'plaza', 6, { hub: true, zone: 'bank' }), sp('river1', 'かわ', -600, 1000, 220, 'water', 4, { prop: '💧', zone: 'bank' }), sp('bridge1', 'きのはし', -500, 1500, 160, 'path', 2, { prop: '🌉', zone: 'bridge' }), sp('leftbank', 'ひだりぎし', -1000, 1900, 150, 'path', 1, { zone: 'bridge' }), sp('bridge2', 'おおきなはし', 0, 2200, 200, 'path', 2, { landmark: 'bridge', zone: 'bridge' }), sp('rightpath', 'みぎぎしのみち', 600, 1500, 150, 'path', 1, { zone: 'bank' }), sp('reeds', 'あしはら', 900, 2000, 220, 'grove', 2, { prop: '🌾', zone: 'bridge' }), sp('boathouse', 'ふねごや', 800, 2700, 170, 'shelter', 3, { prop: '🛖', zone: 'lake' }), sp('lake', 'みずうみ', -200, 3000, 300, 'water', 4, { prop: '🪷', zone: 'lake' }), sp('lakeshore', 'みずうみのはま', -900, 3200, 220, 'plaza', 3, { zone: 'lake' }), sp('islet', 'ちいさなしま', 0, 3700, 150, 'edge', 1, { secret: true, zone: 'lake' }), sp('spring', 'わきみず', -1200, 2600, 130, 'water', 1, { secret: true, zone: 'bridge' }), sp('fishing', 'つりのいわ', 500, 3400, 170, 'water', 2, { prop: '🎣', zone: 'lake' })],
        paths: [['bank', 'riverside', 'wide'], ['riverside', 'river1'], ['river1', 'bridge1'], ['bridge1', 'leftbank', 'narrow'], ['leftbank', 'bridge2', 'narrow'], ['leftbank', 'spring', 'secret'], ['riverside', 'rightpath'], ['rightpath', 'bridge1', 'narrow'], ['rightpath', 'reeds'], ['reeds', 'bridge2'], ['bridge2', 'lake'], ['reeds', 'boathouse'], ['boathouse', 'fishing', 'narrow'], ['fishing', 'lake', 'narrow'], ['lake', 'lakeshore'], ['lake', 'islet', 'secret']] },
      // ジャングル: もりより さらに みっしゅう。つる・たき・いせき・きょだいな しょくぶつ
      jungle: { len: 4400, halfW: 1500, ground: ['#5f9a58', '#3f7a45'], path: '#a08a5f', props: ['🌴', '🌺', '🪵', '🌿', '🍌', '🌱', '🌳', '🪨'],
        zones: [Z('entry', 'ジャングルのいりぐち', { light: 1.02 }), Z('vines', 'つるのみち', { light: 0.82, fog: 0.2, walls: 1.5 }), Z('falls', 'たきのあたり', { tint: '#5a9a8a', fog: 0.15 }), Z('ruins', 'いせき', { tint: '#8a8a6a', walls: 1.0 }), Z('canopy', 'きのうえ', { light: 0.9, walls: 1.3 }), Z('deep', 'ふかいジャングル', { light: 0.66, fog: 0.42, tint: '#2f5a3a', walls: 1.6, lane: ['🌺', '🌿', '🌿', '🪨'] })],
        spots: [sp('entry', 'ジャングルのいりぐち', 0, 250, 200, 'plaza', 1, { zone: 'entry' }), sp('clearing', 'ひらけたばしょ', 0, 800, 280, 'plaza', 6, { hub: true, prop: '🪵', zone: 'entry' }), sp('vines1', 'つるのみち', -800, 1200, 180, 'path', 1, { zone: 'vines' }), sp('vines2', 'つるのおく', -1200, 1900, 160, 'path', 1, { zone: 'vines' }), sp('falls', 'たき', -900, 2600, 220, 'water', 4, { landmark: 'waterfall', zone: 'falls' }), sp('behindfalls', 'たきのうら', -1400, 3000, 140, 'rest', 1, { secret: true, zone: 'falls' }), sp('canopy', 'おおきなきのした', 900, 1200, 200, 'shelter', 3, { prop: '🌳', zone: 'canopy' }), sp('nest', 'すのあたり', 1300, 1900, 170, 'rest', 2, { prop: '🪺', zone: 'canopy' }), sp('hanging', 'つりばし', 800, 2500, 150, 'path', 1, { prop: '🌉', zone: 'canopy' }), sp('ruins', 'いせき', 0, 1600, 240, 'plaza', 4, { prop: '🗿', zone: 'ruins' }), sp('steps', 'いせきのかいだん', 200, 2300, 160, 'path', 1, { zone: 'ruins' }), sp('temple', 'おおきないせき', 0, 3200, 240, 'edge', 3, { landmark: 'temple', cam: 'wide', zone: 'ruins' }), sp('deep1', 'ふかいジャングル', -300, 3800, 220, 'grove', 2, { zone: 'deep' }), sp('giantflower', 'きょだいなはな', 700, 3700, 200, 'grove', 2, { prop: '🌺', zone: 'deep' }), sp('hidden', 'いせきのちかしつ', 500, 3000, 140, 'rest', 1, { secret: true, zone: 'ruins' })],
        paths: [['entry', 'clearing', 'wide'], ['clearing', 'vines1'], ['vines1', 'vines2', 'narrow'], ['vines2', 'falls', 'narrow'], ['falls', 'behindfalls', 'secret'], ['falls', 'temple', 'narrow'], ['clearing', 'canopy'], ['canopy', 'nest'], ['nest', 'hanging', 'narrow'], ['hanging', 'temple', 'narrow'], ['clearing', 'ruins'], ['ruins', 'steps'], ['steps', 'temple'], ['steps', 'hidden', 'secret'], ['temple', 'deep1', 'narrow'], ['temple', 'giantflower', 'narrow'], ['deep1', 'giantflower', 'narrow'], ['vines1', 'ruins', 'narrow']] },
      // さばく: こうだい型。めじるしは すくなく、とおくに オアシスや いせきが みえる
      desert: { len: 4600, halfW: 1800, ground: ['#e9cf95', '#d2b271'], path: '#f1dfb0', props: ['🌵', '🏺', '🪨', '☀️', '⛺', '🏜️', '🌵', '🌴'],
        zones: [Z('gate', 'さばくのいりぐち'), Z('dunes', 'すなやま', { walls: 0.35, light: 1.06 }), Z('oasis', 'オアシス', { tint: '#b8c98a', walls: 0.6 }), Z('tents', 'キャラバンのあたり', { walls: 0.5 }), Z('ruins', 'いせき', { tint: '#d9c28a', walls: 0.7 }), Z('far', 'さばくのはて', { light: 1.08, fog: 0.25, walls: 0.3 })],
        spots: [sp('gate', 'さばくのいりぐち', 0, 250, 200, 'plaza', 1, { zone: 'gate' }), sp('well', 'いどのひろば', 0, 850, 280, 'plaza', 6, { hub: true, prop: '🏺', zone: 'gate' }), sp('dune1', 'すなやま', -900, 1300, 200, 'path', 1, { zone: 'dunes' }), sp('dune2', 'おおきなすなやま', -1500, 2100, 220, 'path', 1, { zone: 'dunes' }), sp('oasis', 'オアシス', -1200, 3000, 260, 'water', 5, { landmark: 'palms', zone: 'oasis' }), sp('caravan', 'キャラバンのテント', 1000, 1300, 200, 'shelter', 4, { prop: '⛺', zone: 'tents' }), sp('camel', 'ラクダのみずば', 1600, 2000, 180, 'water', 2, { prop: '🪧', zone: 'tents' }), sp('cliff', 'がけのかげ', 1300, 2800, 170, 'rest', 2, { prop: '🪨', zone: 'tents' }), sp('spring', 'かくれたいずみ', 1700, 3500, 130, 'water', 1, { secret: true, zone: 'far' }), sp('ruins', 'いしのいせき', 0, 1900, 240, 'plaza', 3, { prop: '🏛️', zone: 'ruins' }), sp('pillars', 'はしらのみち', 200, 2700, 170, 'path', 1, { zone: 'ruins' }), sp('pyramid', 'おおきないせき', 0, 3600, 240, 'edge', 2, { landmark: 'temple', cam: 'wide', zone: 'far' }), sp('bones', 'ほねのおか', -500, 4100, 140, 'rest', 1, { secret: true, zone: 'far' }), sp('mirage', 'しんきろうのおか', 700, 4100, 170, 'edge', 1, { zone: 'far' })],
        paths: [['gate', 'well', 'wide'], ['well', 'dune1'], ['dune1', 'dune2', 'narrow'], ['dune2', 'oasis'], ['oasis', 'pyramid', 'narrow'], ['well', 'caravan'], ['caravan', 'camel'], ['camel', 'cliff'], ['cliff', 'spring', 'secret'], ['cliff', 'pyramid', 'narrow'], ['well', 'ruins'], ['ruins', 'pillars'], ['pillars', 'pyramid'], ['pyramid', 'bones', 'secret'], ['pyramid', 'mirage', 'narrow'], ['dune1', 'ruins', 'narrow'], ['caravan', 'ruins', 'narrow']] },
      // ほしぞらのていりゅうじょ: うきしま ネットワーク型。くもの みちで つながる ていりゅうじょぐん
      star_stop: { len: 4000, halfW: 1500, ground: ['#4a3f86', '#2b2460'], path: '#9d8ff0', props: ['⭐', '🌙', '✨', '🪐', '☁️', '🌟', '💫'],
        zones: [Z('stop', 'ていりゅうじょ'), Z('west', 'にしのうきしま', { tint: '#4f4a96', marks: { color: '#ffe9a8', kind: 'sparkle' } }), Z('east', 'ひがしのうきしま', { tint: '#3f3f80' }), Z('far', 'とおいていりゅうじょ', { light: 0.9, fog: 0.15, tint: '#2f2a66' })],
        spots: [sp('stop', 'ていりゅうじょ', 0, 250, 240, 'plaza', 3, { landmark: 'bigstop', zone: 'stop' }), sp('platform', 'まちあいのひろば', 0, 850, 280, 'plaza', 6, { hub: true, prop: '🏮', zone: 'stop' }), sp('bench', 'ほしをみるベンチ', -800, 1200, 180, 'rest', 3, { prop: '🪑', zone: 'west' }), sp('isle1', 'ちいさなうきしま', 900, 1200, 200, 'grove', 2, { prop: '⭐', zone: 'east' }), sp('cloud1', 'くものみち', 0, 1500, 200, 'path', 2, { prop: '🏮', zone: 'stop' }), sp('isle2', 'ほしのはたけ', -1300, 1900, 220, 'grove', 3, { prop: '🌟', zone: 'west' }), sp('farisle', 'とおいうきしま', -700, 2500, 200, 'edge', 2, { prop: '🪐', zone: 'west' }), sp('secretview', 'ひみつのてんぼうだい', 1400, 1900, 160, 'edge', 1, { secret: true, prop: '🔭', cam: 'wide', zone: 'east' }), sp('isle3', 'ねむるうきしま', 900, 2400, 180, 'rest', 2, { prop: '🌙', zone: 'east' }), sp('stop2', 'つぎのていりゅうじょ', 0, 2400, 220, 'shelter', 4, { prop: '🚏', zone: 'far' }), sp('cloud2', 'ほしのかいだん', 300, 3100, 170, 'path', 1, { zone: 'far' }), sp('stop3', 'さいごのていりゅうじょ', -400, 3600, 220, 'plaza', 3, { prop: '🚏', zone: 'far' }), sp('edge', 'そらのはて', 600, 3800, 160, 'edge', 1, { zone: 'far' }), sp('comet', 'ながれぼしのおか', -1200, 3200, 140, 'edge', 1, { secret: true, zone: 'west' })],
        paths: [['stop', 'platform', 'wide'], ['platform', 'bench'], ['bench', 'isle2', 'narrow'], ['isle2', 'farisle', 'narrow'], ['farisle', 'stop2', 'narrow'], ['platform', 'cloud1'], ['cloud1', 'stop2'], ['platform', 'isle1'], ['isle1', 'secretview', 'secret'], ['isle1', 'isle3', 'narrow'], ['isle3', 'stop2', 'narrow'], ['stop2', 'cloud2'], ['cloud2', 'stop3'], ['cloud2', 'edge', 'narrow'], ['stop3', 'comet', 'secret'], ['farisle', 'stop3', 'narrow']] },
      // きおくのみずうみ: しずかな いっぽんみち + かくし ぶんき型。きりの なかを おくへ。ナオトの ばしょは かんたんには みつからない
      memory_lake: { len: 3600, halfW: 900, ground: ['#6f7a9a', '#53577a'], path: '#8b90b0', props: ['🌫️', '🪨', '🌿', '💧', '🕯️', '🍃'],
        zones: [Z('shore', 'みずうみのほとり'), Z('mist', 'きりのなか', { light: 0.85, fog: 0.35, walls: 1.3 }), Z('deep', 'みずうみのおく', { light: 0.7, fog: 0.55, tint: '#3f4468', walls: 1.5 })],
        spots: [sp('shore', 'みずうみのほとり', 0, 250, 240, 'plaza', 2, { hub: true, zone: 'shore' }), sp('willow', 'やなぎのした', -500, 800, 200, 'shelter', 3, { prop: '🌳', zone: 'shore' }), sp('water', 'しずかなみずも', 450, 1000, 260, 'water', 3, { prop: '💧', zone: 'shore' }), sp('path1', 'きりのこみち', 0, 1400, 180, 'path', 1, { prop: '🌫️', zone: 'mist' }), sp('stones', 'つみいし', -500, 1700, 170, 'rest', 2, { prop: '🪨', zone: 'mist' }), sp('lantern', 'ともしびのおか', 500, 1900, 160, 'rest', 1, { prop: '🕯️', zone: 'mist' }), sp('path2', 'きりのおく', 0, 2200, 170, 'path', 0, { zone: 'mist' }), sp('boat', 'ふるいこぶね', 600, 2700, 140, 'rest', 1, { secret: true, zone: 'deep' }), sp('deep', 'みずうみのおく', 0, 3200, 140, 'deep', 0, { secret: true, prop: '🕯️', cam: 'near', zone: 'deep' })],
        paths: [['shore', 'willow'], ['shore', 'water'], ['shore', 'path1'], ['willow', 'stones'], ['stones', 'path2', 'narrow'], ['water', 'lantern'], ['lantern', 'path1', 'narrow'], ['path1', 'path2'], ['path2', 'deep', 'secret'], ['lantern', 'boat', 'secret'], ['stones', 'deep', 'secret']] },
    };
    // 地域ごとの みための データ(レンダラーが よむ。ぜんぶ せかい たんい・いろ・しゅるい の 指定だけ)
    //   backdrop: 地平線の おくに みえる シルエット(えんけい)  lane: こみちの わきの ちいさな もの(てまえ)
    //   wall: みちの りょうわきに ならぶ おおきな もの(さきが みえない ようにする しゃへいぶつ)
    //   marks: じめんの もよう  sky: そらの えんしゅつ  floor: platform = うかんだ あしば  ambience: かんきょうおん(しょうらい ようの めじるし)
    const WORLD_STYLE = {
      home: { backdrop: 'hills', lane: ['🌷', '🪴', '🪵', '🌼', '🐾', '🪧'], wall: ['🌳', '🏠', '🌳'], marks: { color: '#7fbf5f', kind: 'tuft' }, ambience: 'garden', hint: ['🌷', '🌼', '✨'], edge: '#c9b98a' },
      city: { backdrop: 'skyline', lane: ['🚦', '💡', '🪧', '🚧', '🗑️', '🚲'], wall: ['🏢', '🏬', '🏢', '🌳'], marks: { color: '#8d919a', kind: 'stone' }, ambience: 'city', hint: ['🐾', '💡', '🌼'], edge: '#7d7f88' },
      countryside: { backdrop: 'hills', lane: ['🌾', '🌻', '🪨', '🌱', '🪵', '🪧'], wall: ['🌳', '🌾', '🌳'], marks: { color: '#86b85a', kind: 'tuft' }, ambience: 'meadow', hint: ['🌼', '🌼', '🌻'], edge: '#b9a06a' },
      forest: { backdrop: 'treeline', lane: ['🍄', '🌿', '🪵', '🌰', '🪨', '🌱'], wall: ['🌲', '🌳', '🌲'], marks: { color: '#4f8a45', kind: 'tuft' }, ambience: 'forest', hint: ['🌼', '✨', '🍄'], edge: '#5f4a2a' },
      mountain: { backdrop: 'peaks', lane: ['🪨', '🌲', '🪧', '🥾', '🏕️', '🌼'], wall: ['🪨', '🌲', '🪨'], marks: { color: '#8a8d78', kind: 'stone' }, ambience: 'wind', hint: ['🌼', '🪨', '✨'], edge: '#6f6a58' },
      snow: { backdrop: 'snowpeaks', lane: ['❄️', '🌨️', '🧊', '🪵', '🌲', '🛷'], wall: ['🌲', '🌲', '🪨'], marks: { color: '#ffffff', kind: 'sparkle' }, ambience: 'snowwind', hint: ['🐾', '🐾', '✨'], edge: '#b8c8d8' },
      sea: { backdrop: 'seahorizon', lane: ['🐚', '🏖️', '⛱️', '🪸', '🌴', '🏄'], wall: ['🌴', '🪨', '🌴'], marks: { color: '#f8efd0', kind: 'stone' }, ambience: 'waves', hint: ['🐚', '🐚', '✨'], edge: '#d8c898' },
      deepsea: { backdrop: 'abyss', sky: 'bubbles', lane: ['🪸', '🫧', '🐚', '🪨', '💡', '⚓'], wall: ['🪸', '🪨', '🪸'], marks: { color: '#5aa5d8', kind: 'sparkle' }, ambience: 'underwater', hint: ['🫧', '🫧', '✨'], edge: '#3f6f9f' },
      river_lake: { backdrop: 'lakehills', lane: ['🪷', '🌿', '🪨', '🌳', '💧', '🎣'], wall: ['🌳', '🌾', '🌳'], marks: { color: '#7fbf6a', kind: 'tuft' }, ambience: 'stream', hint: ['🪷', '🌿', '✨'], edge: '#a08a5a' },
      jungle: { backdrop: 'treeline', lane: ['🌺', '🌿', '🍌', '🪨', '🌴', '🌱'], wall: ['🌴', '🌳', '🌴'], marks: { color: '#3f8a3f', kind: 'tuft' }, ambience: 'jungle', hint: ['🌺', '🌿', '✨'], edge: '#5f5a3a' },
      desert: { backdrop: 'dunes', lane: ['🌵', '🪨', '🌴', '⛺', '🏺', '☀️'], wall: ['🪨', '🌵', '🪨'], marks: { color: '#e8d29a', kind: 'stone' }, ambience: 'desertwind', hint: ['🏺', '🌵', '✨'], edge: '#c9a86a' },
      star_stop: { backdrop: 'skystops', sky: 'stars', floor: { kind: 'platform', half: 960 }, lane: ['🏮', '⭐', '🪑', '🔭', '🌟', '🏮'], wall: ['☁️', '🌙', '☁️'], marks: { color: '#ffe9a8', kind: 'sparkle' }, glowPath: true, ambience: 'space', hint: ['✨', '⭐', '✨'], edge: '#c9b8ff' },
      memory_lake: { backdrop: 'mist', sky: 'mist', lane: ['🕯️', '🌿', '🪨', '🍃', '💧', '🕯️'], wall: ['🌫️', '🌳', '🌫️'], marks: { color: '#9aa3c8', kind: 'sparkle' }, ambience: 'still', hint: ['🕯️', '🍃', '✨'], edge: '#7a80a8' },
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
      // いまの せいしきな ずかん(ALL_LINES)に ある しゅぞく だけ。ふるい セーブに のこった legacy の すがた(bird など)は
      // ほぞんは そのまま のこし、じゅうみん には しない(いまの じぶんが legacy でも、じぶんは プレイヤーとして そのまま)
      const currentLines = Array.isArray(S.ALL_LINES) && S.ALL_LINES.length ? new Set(S.ALL_LINES) : null;
      for (const key of state.discoveredStages || []) {
        if (key === petKey) continue;
        const [line, stStr] = String(key).split(':'); const stage = Number(stStr);
        if (currentLines && !currentLines.has(line)) continue;
        if (!Number.isInteger(stage) || stage < 0) continue;
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
      // さいごに key で いちい に(ふるい セーブ・いこう・じゅうふくした はいれつが あっても、おなじ じゅうみんは せかいに 1体だけ)
      const byKey = new Map();
      for (const r of list) { const prev = byKey.get(r.key); if (!prev) byKey.set(r.key, r); else if (r.withPlayer && !prev.withPlayer) byKey.set(r.key, r); }
      const unique = [...byKey.values()];
      return { residents: unique, naoto, byRegion: (regionId) => unique.filter((r) => r.region === regionId) };
    }

    // ================= かんさ(かいはつ・テスト よう) =================
    // だいちょうを しらべて、おかしな ところを issues に ならべる。rows は ぜんいんの いちらん
    function auditRegistry(registry, opts = {}) {
      const state = getState();
      const petKey = typeof S.currentPetKey === 'function' ? S.currentPetKey() : null;
      const currentLines = Array.isArray(S.ALL_LINES) && S.ALL_LINES.length ? new Set(S.ALL_LINES) : null;
      const discovered = new Set(state.discoveredStages || []);
      const canon = typeof S.canonicalCompanionId === 'function' ? S.canonicalCompanionId : (id) => id;
      const withCompanions = new Set((state.companions || []).map((c) => canon(c.id)));
      const curPartner = state.partner ? String(state.partner.id) : null;
      const all = registry.residents.concat(registry.naoto ? [registry.naoto] : []);
      const rows = all.map((r) => ({ key: r.key, kind: r.kind, label: r.label, line: r.line || null, stage: r.stage != null ? r.stage : null, id: r.id || null, asset: r.asset || null, region: r.region, withPlayer: !!r.withPlayer }));
      const issues = [];
      const seenKey = new Map(), seenId = new Map(), byAsset = new Map();
      for (const r of all) {
        if (seenKey.has(r.key)) issues.push({ code: 'duplicate-key', key: r.key, detail: 'the same resident key appears twice' }); seenKey.set(r.key, true);
        const uid = r.kind === 'form' ? `form:${r.line}:${r.stage}` : r.kind === 'companion' ? 'companion:' + canon(r.id) : r.kind === 'partner' ? 'partner:' + r.id : r.kind;
        if (seenId.has(uid)) issues.push({ code: 'duplicate-id', key: r.key, detail: 'the same unique id appears twice: ' + uid }); seenId.set(uid, true);
        if (r.kind === 'form') {
          if (currentLines && !currentLines.has(r.line)) issues.push({ code: 'legacy-form', key: r.key, detail: `${r.line} is not in the current dex` });
          if (!discovered.has(`${r.line}:${r.stage}`)) issues.push({ code: 'undiscovered-form', key: r.key, detail: 'this form is not in discoveredStages' });
          if (petKey && `${r.line}:${r.stage}` === petKey) issues.push({ code: 'current-pet-duplicate', key: r.key, detail: 'the current pet appears as a resident' });
        }
        if (r.kind === 'companion' && withCompanions.has(canon(r.id)) && !r.withPlayer) issues.push({ code: 'follower-duplicate', key: r.key, detail: 'a companion walking with the player is also a region resident' });
        if (r.kind === 'partner' && curPartner === r.id && !r.withPlayer) issues.push({ code: 'follower-duplicate', key: r.key, detail: 'the current partner is also a region resident' });
        if (r.asset) { const prev = byAsset.get(r.asset); if (prev && prev !== r.key) issues.push({ code: 'shared-asset', key: r.key, detail: `same asset as ${prev}: ${r.asset}` }); else byAsset.set(r.asset, r.key); }
      }
      // いっしょに あるく こが せかいの どこかにも おかれていないか(byRegion は withPlayer を ふくむので buildWorld が のぞく)
      if (opts.worlds !== false) {
        for (const id of Object.keys(WORLDS)) { for (const a of buildWorld(id, registry).residents) { if (a.withPlayer) issues.push({ code: 'follower-duplicate', key: a.key, detail: 'placed in ' + id + ' although walking with the player' }); if (petKey && a.kind === 'form' && `${a.line}:${a.stage}` === petKey) issues.push({ code: 'current-pet-duplicate', key: a.key, detail: 'placed in ' + id }); } }
      }
      return { rows, issues };
    }
    // ================= けしきと いきものの ほうしん =================
    // めぐるの せかいで「いきている キャラクター」は、ずかんの すがた・なかま・
    // レアなかま・こいびと・ナオト = 住民台帳(buildRegistry)に のっている ものだけ。
    // ランダムに なんども おかれる けしきの プール(props / lane / wall / hint /
    // zone の lane / LOCAL_FLAVOR)には、とり・さかな・ほにゅうるい・はちゅうるい・
    // むし などの どうぶつの 絵文字を いれない。おなじ とりが 5わも ならぶと
    // 「おなじ キャラが たくさん いる」ように みえて、台帳の いみが なくなる ため。
    // くさ・き・はな・キノコは ずかんに にた すがたが あっても けしきとして しぜん
    // なので べつ あつかい(🪸 も けしき)。ばしょを あらわす ために 1つだけ おく
    // ばあい(ねこのばしょ・ぼくじょう・ラクダのみずば)は、いきもの ほんにんに
    // みえない 🐾 や 🪧 の かんばんに する。
    // どうぶつの 絵文字の はんい(Unicode の ブロックで きめる: U+1F400..1F43D の
    // ほにゅうるい・とり・さかな・はちゅうるい、U+1F980..1F9AE の カニ〜どうぶつ、
    // U+1FAB0..1FAB3 の むし、クラゲ・ガチョウ・ヘラジカ・ロバ、ハト、クモ)。
    // かいがらと あしあとは ものと あとなので のぞく。サンゴも けしき あつかい
    const FAUNA_RANGES = [[0x1F400, 0x1F43D], [0x1F980, 0x1F9AE], [0x1FAB0, 0x1FAB3], [0x1FABC, 0x1FABC], [0x1FABF, 0x1FABF], [0x1FACE, 0x1FACF], [0x1F54A, 0x1F54A], [0x1F577, 0x1F577]];
    const FAUNA_EXCEPT = new Set([0x1F41A /* shell */, 0x1F43E /* paw prints */, 0x1F9A0 /* microbe */]);
    function isFaunaEmoji(e) {
      if (typeof e !== 'string' || !e) return false;
      const cp = e.codePointAt(0);
      if (FAUNA_EXCEPT.has(cp)) return false;
      return FAUNA_RANGES.some(([a, b]) => cp >= a && cp <= b);
    }
    const SCENERY_FAUNA = FAUNA_RANGES.flatMap(([a, b]) => { const out = []; for (let cp = a; cp <= b; cp++) if (!FAUNA_EXCEPT.has(cp)) out.push(String.fromCodePoint(cp)); return out; });
    // ランダム けしきの プールを ぜんぶ ひらたく ならべる: [{ region, pool, emojis }]
    function sceneryPools() {
      const out = [];
      const push = (region, pool, list) => { if (Array.isArray(list) && list.length) out.push({ region, pool, emojis: list.filter((v) => typeof v === 'string' && v) }); };
      for (const [id, w] of Object.entries(WORLDS)) {
        push(id, 'props', w.props); push(id, 'lane', w.lane); push(id, 'wall', w.wall); push(id, 'hint', w.hint);
        for (const z of w.zones || []) if (z.mood && z.mood.lane) push(id, 'zone:' + z.id, z.mood.lane);
        push(id, 'spot', w.spots.map((sp0) => sp0.prop).filter(Boolean));
      }
      for (const [id, f] of Object.entries(LOCAL_FLAVOR)) { push('home/' + id, 'props', f.props); push('home/' + id, 'wall', f.wall); }
      push('*', 'landmark', ['🌳', '⛰️', '🏔️', '🪧']); // ランドマークの fallback と ひょうしき
      return out;
    }
    // なかま・レアなかま・こいびと・ずかんの すがた と おなじ 絵文字も、ランダムの
    // プールには いれない(⛄ は こいびと「とけないゆきだるま」、🗿 は レアなかま
    // 「せきぞう」…)。れいがい: しょくぶつ・てんき の 絵文字(🌻 ひまわり・🌵 サボテン・
    // ❄️ ゆき)は けしきとして しぜん なので ゆるす。1つの スポットに 1つだけ おく
    // せきぞう(🗿 いせきの 石像)も、あきらかに 石像と わかる ので ゆるす
    const SCENERY_CHARACTER_ALLOW = { '🌻': 'plant', '🌵': 'plant', '❄️': 'weather' };
    const SPOT_STATUE_ALLOW = ['🗿'];
    const SCENERY_LINES = ['plant', 'dandelion', 'sakura', 'venus_flytrap', 'world_tree', 'mushroom', 'coral'];
    // 絵文字の ゆれを そろえる(異体字セレクタを のぞき、カタログと おなじ 別名を まとめる)
    const EMOJI_ALIAS = { '☃': '⛄', '🐪': '🐫', '🐳': '🐋', '🐔': '🐓' };
    const plainEmoji = (e) => { const k = String(e || '').replace(/\uFE0F/gu, ''); return EMOJI_ALIAS[k] || k; };
    // キャラクターの 絵文字 → [key]: なかま・レアなかま・こいびと(S から)+ ひょうじ よう の
    // resolver が キャラの え に する もの(しょくぶつ の ライン は のぞく)
    function characterEmojiMap(displayResolve) {
      const map = new Map(); const add = (e, key) => { if (!e) return; const k = plainEmoji(e); if (!map.has(k)) map.set(k, []); map.get(k).push(key); };
      const comps = typeof S.allCompanions === 'function' ? S.allCompanions() : [];
      for (const c of comps) add(c.emoji, 'companion:' + c.id);
      for (const p of S.partners || []) add(p.emoji, 'partner:' + p.id);
      const dr = typeof displayResolve === 'function' ? displayResolve : (typeof S.resolveDisplay === 'function' ? S.resolveDisplay : null);
      if (dr) for (const p of sceneryPools()) for (const e of p.emojis) { const d = dr(e); if (!isCharacterAsset(d)) continue; const m = /assets\/characters\/([^/]+)\/([^/.]+)/.exec(String(d.asset)); const group = m ? m[1] : '', name = m ? m[2] : ''; if (SCENERY_LINES.includes(group)) continue; add(e, (group === 'companions' ? 'companion:' : group === 'partners' ? 'partner:' : 'form:' + group + ':') + name); }
      return map;
    }
    // キャラと おなじに みえる 絵文字が けしきに まぎれて いないか:
    // { characters: [{ emoji, keys }], issues: [{ region, pool, emoji, keys }], allowed: [{ region, pool, emoji, reason }] }
    function auditSceneryCharacters(displayResolve) {
      const map = characterEmojiMap(displayResolve);
      const issues = [], allowed = [];
      const statueCount = {};
      for (const p of sceneryPools()) for (const e of p.emojis) {
        const keys = map.get(plainEmoji(e)); if (!keys) continue;
        if (SCENERY_CHARACTER_ALLOW[e]) { allowed.push({ region: p.region, pool: p.pool, emoji: e, reason: SCENERY_CHARACTER_ALLOW[e] }); continue; }
        if (p.pool === 'spot' && SPOT_STATUE_ALLOW.includes(e)) {
          const n = (statueCount[p.region + e] = (statueCount[p.region + e] || 0) + 1);
          if (n === 1) { allowed.push({ region: p.region, pool: p.pool, emoji: e, reason: 'statue' }); continue; }
          issues.push({ region: p.region, pool: p.pool, emoji: e, keys, detail: 'a statue may stand at only one spot per world' }); continue;
        }
        issues.push({ region: p.region, pool: p.pool, emoji: e, keys });
      }
      return { characters: [...map].map(([emoji, keys]) => ({ emoji, keys })), issues, allowed };
    }
    // どうぶつの 絵文字が けしきの プールに まぎれて いないか: [{ region, pool, emoji }]
    function auditSceneryFauna() {
      const issues = [];
      for (const p of sceneryPools()) for (const e of p.emojis) if (isFaunaEmoji(e)) issues.push({ region: p.region, pool: p.pool, emoji: e });
      return issues;
    }
    // けしきの 絵文字を ぜんぶ あつめて、けしき よう の resolver が キャラの え を かえさないか しらべる
    function sceneryEmojis() {
      const out = new Set();
      for (const p of sceneryPools()) p.emojis.forEach((e) => out.add(e));
      return [...out];
    }
    const isCharacterAsset = (d) => !!(d && d.asset && /assets\/characters\//.test(String(d.asset)));
    function auditScenery(sceneryResolve, displayResolve) {
      const emojis = sceneryEmojis();
      const sr = typeof sceneryResolve === 'function' ? sceneryResolve : (typeof S.resolveScenery === 'function' ? S.resolveScenery : () => null);
      const dr = typeof displayResolve === 'function' ? displayResolve : (typeof S.resolveDisplay === 'function' ? S.resolveDisplay : () => null);
      const characterUnderScenery = [], characterUnderDisplay = [];
      for (const emoji of emojis) {
        const d = dr(emoji); if (isCharacterAsset(d)) characterUnderDisplay.push({ emoji, asset: d.asset });
        const sd = sr(emoji); if (isCharacterAsset(sd)) characterUnderScenery.push({ emoji, asset: sd.asset });
      }
      return { emojis, characterUnderDisplay, characterUnderScenery, fauna: auditSceneryFauna(), characters: auditSceneryCharacters(dr).issues };
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
      const world = { regionId, len: base.len, halfW: base.halfW || 1000, ground: base.ground, path: base.path, spots: base.spots, paths: base.paths, props: [], marks: [], residents: [], local,
        backdrop: (local && local.backdrop) || base.backdrop || 'hills', lane: base.lane || [], wall: (local && local.wall) || base.wall || ['🌳'], hint: base.hint || ['✨'], edge: base.edge || '#8a7a5a', sky: base.sky || null, floor: base.floor || null, glowPath: !!base.glowPath,
        markStyle: base.marks || { color: '#88aa66', kind: 'tuft' }, ambience: base.ambience || null, entry: base.spots[0], hub: base.spots.find((s) => s.hub) || base.spots[1] || base.spots[0] };
      world.segments = pathSegments(base);
      // 地区(zone): スポットの まとまり。ちゅうしんは その 地区の スポットの へいきん。mood は みための きぶん
      world.zones = (base.zones || []).map((z) => { const ss = base.spots.filter((s) => s.zone === z.id); const n = ss.length || 1; return { id: z.id, label: z.label, mood: z.mood || {}, x: ss.reduce((a, s) => a + s.x, 0) / n, z: ss.reduce((a, s) => a + s.z, 0) / n, spots: ss.map((s) => s.id) }; });
      const zoneOfSpot = (sp0) => world.zones.find((z) => z.id === sp0.zone) || null;
      const zoneAt = (x, z) => { let best = null, bd = Infinity; for (const zn of world.zones) { const d = Math.hypot(zn.x - x, zn.z - z); if (d < bd) { bd = d; best = zn; } } return best; };
      const degree = (sp0) => (base.paths || []).filter(([a, b]) => a === sp0.id || b === sp0.id).length;
      const halfW = world.halfW;
      const nearSpot = (x, z, pad) => base.spots.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + (pad || 0));
      const propPool = local ? local.props.concat(base.props.slice(0, 3)) : base.props;
      // えんけい〜ちゅうけい: りょうはしの おおきな もの(き・たてもの など)
      const nProps = 18 + Math.floor(base.len / 130);
      for (let i = 0; i < nProps; i++) {
        const seed = regionId + ':prop:' + i;
        const z = 120 + hrand(seed + 'z') * (base.len - 200);
        const side = i % 2 === 0 ? -1 : 1;
        const x = side * (halfW * 0.82 + hrand(seed + 'x') * halfW * 0.18);
        if (nearSpot(x, z, 20)) continue;
        world.props.push({ emoji: propPool[hash(seed) % propPool.length], x, z, size: 100 + hrand(seed + 'k') * 56, layer: 'side' });
      }
      // しゃへいぶつ: みちの りょうわきに ならぶ おおきな もの。あいだが あいていて、さきは みえたり みえなかったり
      const wallPool = world.wall;
      for (const s of world.segments) {
        const n = Math.max(1, Math.round(s.len / 200)); const dx = (s.b.x - s.a.x) / s.len, dz = (s.b.z - s.a.z) / s.len; const nx = -dz, nz = dx;
        const zn = zoneAt((s.a.x + s.b.x) / 2, (s.a.z + s.b.z) / 2); const dens = zn && zn.mood.walls != null ? zn.mood.walls : 1;
        const secret = s.kind === 'secret';
        for (let i = 0; i <= n; i++) {
          for (const side of [-1, 1]) {
            const seed = regionId + ':wall:' + s.a.id + s.b.id + i + side;
            const t = (i + 0.5 * hrand(seed + 't')) / (n + 0.5);
            if (secret && t < 0.3) continue; // かくし みちの いりぐちは あけておく(きの すきまから さきが みえる)
            if (hrand(seed + 'p') > Math.min(0.96, (secret ? 0.9 : 0.72) * dens)) continue;
            const off = s.half + 70 + hrand(seed + 'o') * 50;
            const x = s.a.x + (s.b.x - s.a.x) * t + nx * off * side, z = s.a.z + (s.b.z - s.a.z) * t + nz * off * side;
            if (Math.abs(x) > halfW || z < 80 || z > base.len - 60 || nearSpot(x, z, 30)) continue;
            world.props.push({ emoji: wallPool[hash(seed) % wallPool.length], x, z, size: 130 + hrand(seed + 'k') * 50, layer: 'wall', solid: true });
          }
        }
        // かくし みちの「さそい」: いりぐちに はな・あしあと・ひかり(ちゅういして みれば「とおれる？」と おもえる)
        if (secret) {
          const hintPool = world.hint;
          for (let k = 0; k < 3; k++) { const t = 0.06 + k * 0.09; const side = k % 2 === 0 ? -1 : 1; world.props.push({ emoji: hintPool[k % hintPool.length], x: s.a.x + (s.b.x - s.a.x) * t + nx * (s.half + 12) * side, z: s.a.z + (s.b.z - s.a.z) * t + nz * (s.half + 12) * side, size: 40, layer: 'hint' }); }
          world.props.push({ x: s.a.x + (s.b.x - s.a.x) * 0.18, z: s.a.z + (s.b.z - s.a.z) * 0.18, size: 160, layer: 'glow' });
        }
        // みちの ふち(ふみあと・いし・くい): ぶんきが けしきで わかる
        if (!secret) for (let d = 110; d < s.len - 60; d += 220) { for (const side of [-1, 1]) { const t = d / s.len; world.marks.push({ x: s.a.x + (s.b.x - s.a.x) * t + nx * (s.half + 6) * side, z: s.a.z + (s.b.z - s.a.z) * t + nz * (s.half + 6) * side, size: 16, phase: 0, edge: true }); } }
      }
      // ぶんきの ひょうしき: みちが 3ぽん いじょう あつまる スポット
      for (const sp0 of base.spots) if (degree(sp0) >= 3 && !sp0.landmark && !sp0.secret && (sp0.kind === 'path' || sp0.kind === 'plaza' || sp0.kind === 'grove')) world.props.push({ emoji: '🪧', x: sp0.x + sp0.r * 0.55, z: sp0.z - sp0.r * 0.35, size: 84, layer: 'sign' });
      // かくし ばしょの まわりは しゃへいぶつで かこう(みちの むき いがい)
      for (const s of base.spots) if (s.secret) {
        const link = world.segments.find((g) => g.a === s || g.b === s); const other = link ? (link.a === s ? link.b : link.a) : null;
        const ang0 = other ? Math.atan2(other.x - s.x, other.z - s.z) : 0;
        for (let k = 0; k < 4; k++) { const ang = ang0 + Math.PI * 0.5 + k * (Math.PI / 3); const x = s.x + Math.sin(ang) * (s.r + 60), z = s.z + Math.cos(ang) * (s.r + 60); if (Math.abs(x) > halfW || z < 80 || z > base.len - 60) continue; world.props.push({ emoji: wallPool[hash(s.id + k) % wallPool.length], x, z, size: 150, layer: 'wall', solid: true }); }
      }
      // てまえ: こみちの わきの ちいさな もの(あるいている ばしょが わかる)
      for (const s of world.segments) {
        const n = Math.max(1, Math.round(s.len / 150)); const dx = (s.b.x - s.a.x) / s.len, dz = (s.b.z - s.a.z) / s.len; const nx = -dz, nz = dx;
        const zn = zoneAt((s.a.x + s.b.x) / 2, (s.a.z + s.b.z) / 2); const lanePool = (zn && zn.mood.lane) || (world.lane.length ? world.lane : propPool);
        for (let i = 0; i < n; i++) {
          const seed = regionId + ':lane:' + s.a.id + s.b.id + i; const side = (i + Math.floor(hrand(seed + 's') * 2)) % 2 === 0 ? -1 : 1;
          const t = (i + 0.3 + hrand(seed + 't') * 0.4) / n; const off = s.half + 18 + hrand(seed + 'o') * 24;
          const x = s.a.x + (s.b.x - s.a.x) * t + nx * off * side, z = s.a.z + (s.b.z - s.a.z) * t + nz * off * side;
          if (Math.abs(x) > halfW || z < 60) continue;
          world.props.push({ emoji: lanePool[(i + hash(seed)) % lanePool.length], x, z, size: 52 + hrand(seed + 'k') * 30, layer: 'lane' });
        }
      }
      // ランドマーク・スポットの めじるし(おおきめ。あたりはんてい あり)
      for (const s of base.spots) {
        if (s.landmark) world.props.push({ landmark: s.landmark, emoji: s.prop || '🌳', x: s.x, z: s.z + s.r * 0.8, size: 300, spot: true, solid: true, layer: 'landmark', label: s.label });
        else if (s.prop) world.props.push({ emoji: s.prop, x: s.x + (s.x < 0 ? -s.r - 30 : s.r + 30) * (s.kind === 'deep' ? 0 : 1), z: s.z + 30, size: 150, spot: true, solid: true, layer: 'landmark' });
      }
      // じめんの もよう(くさ・こいし・きらめき)
      const nMarks = 60 + Math.floor(base.len / 30);
      for (let i = 0; i < nMarks; i++) {
        const seed = regionId + ':mark:' + i;
        world.marks.push({ x: (hrand(seed + 'x') - 0.5) * halfW * 1.9, z: 60 + hrand(seed + 'z') * (base.len - 100), size: 10 + hrand(seed + 'k') * 14, phase: hrand(seed + 'f') * 6.28 });
      }
      // じゅうみんの ふりわけ(むらの ある はいち: にぎやかな ばしょ と しずかな ばしょ)
      const all = registry.byRegion(regionId).filter((r) => !r.withPlayer);
      const assign = new Map();
      all.forEach((r) => {
        const seed = r.key + '@' + regionId + '#' + e.time + e.weather + (r.kind === 'companion' ? day : '');
        const w = spotWeights(r, base.spots, e).map((wt, i) => { const zn = zoneOfSpot(base.spots[i]); const fog = zn ? (zn.mood.fog || 0) : 0; return wt * (r.night || r.rare ? 1 + fog : 1 - fog * 0.6); }); // ふかい 地区は しずか。よる/レアの こは おくにも
        const i = weightedIndex(w, seed); assign.set(r.key, i >= 0 ? base.spots[i] : world.hub);
      });
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
        world.residents.push(makeActor(r, { x: clamp(cx + Math.sin(ja) * jd, -halfW + 20, halfW - 20), z: clamp(cz + Math.cos(ja) * jd * 0.7, 80, base.len - 80), spot: s, heading: hrand(seed + 'h') * TAU - Math.PI }));
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
        const hw = (world.halfW || 1000) - 20;
        if (next === 'walk' || next === 'swim' || next === 'play') { const ang = rnd(0, TAU), d = rnd(20, s.r * 0.9); a.tx = clamp(s.x + Math.sin(ang) * d, -hw, hw); a.tz = clamp(s.z + Math.cos(ang) * d * 0.7, 80, world.len - 80); }
        else if (next === 'chase') { const o = others.find((b) => b !== a && b.spot === a.spot && !b.fixed && !b.plant && !b.water && b.state !== 'sleep' && b.state !== 'chat'); if (o) { a.chaseOf = o; if (o.state !== 'chase') { o.state = 'play'; o.until = a.until; const ang = rnd(0, TAU); o.tx = clamp(s.x + Math.sin(ang) * s.r * 0.8, -hw, hw); o.tz = clamp(s.z + Math.cos(ang) * s.r * 0.5, 80, world.len - 80); } } else a.state = 'walk'; }
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
      xBound: 1000,          // よこの はし(±)の きほん(せかいの halfW が あれば そちら)
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
    function clampToWorld(pt, world) { const hw = world.halfW || RULES.xBound; pt.x = clamp(pt.x, -hw, hw); pt.z = clamp(pt.z, RULES.zMargin, world.len - RULES.zMargin); return pt; }
    // 地区の きぶん(mood)を いちで まぜる: ちかい 地区ほど つよく(きょりの 2じょうの ぎゃくすう)。three.js でも おなじ 値で きり・あかるさを きめられる
    const MOOD_DEFAULT = { light: 1, fog: 0, tint: null, walls: 1 };
    function moodAt(world, x, z) {
      if (!world.zones || !world.zones.length) return Object.assign({}, MOOD_DEFAULT);
      let tw = 0, light = 0, fog = 0, tr = 0, tg = 0, tb = 0, tintW = 0, nearest = null, nd = Infinity;
      for (const zn of world.zones) { const d = Math.hypot(zn.x - x, zn.z - z); const w = 1 / (1 + Math.pow(d / 520, 3)); tw += w; light += (zn.mood.light != null ? zn.mood.light : 1) * w; fog += (zn.mood.fog || 0) * w; if (zn.mood.tint) { const c = hexToRgb(zn.mood.tint); tr += c[0] * w; tg += c[1] * w; tb += c[2] * w; tintW += w; } if (d < nd) { nd = d; nearest = zn; } }
      return { light: light / tw, fog: fog / tw, tint: tintW > 0 ? [Math.round(tr / tintW), Math.round(tg / tintW), Math.round(tb / tintW)] : null, tintAmt: tintW / tw, zone: nearest };
    }
    function hexToRgb(h) { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return [128, 128, 128]; const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
    function resolveObstacles(pt, world) {
      for (const o of world.obstacles) { const dx = pt.x - o.x, dz = pt.z - o.z, d = Math.hypot(dx, dz); if (d > 0 && d < o.r) { pt.x = o.x + dx / d * o.r; pt.z = o.z + dz / d * o.r; } }
      return pt;
    }

    function createSimulation(init = {}) {
      let registry = init.registry || buildRegistry();
      let world = null, party = [], player = null, nearest = null, frame = 0, curSpot = null, mood = Object.assign({}, MOOD_DEFAULT);
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
        mood = moodAt(world, player.x, player.z);
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
      const mapData = () => ({ zones: world.zones.map((z) => ({ id: z.id, label: z.label, x: z.x, z: z.z, spots: z.spots })), spots: world.spots.filter((s) => !s.secret || discovered.has(s.id)).map((s) => ({ id: s.id, label: s.label, x: s.x, z: s.z, kind: s.kind, secret: !!s.secret, discovered: discovered.has(s.id), current: s === curSpot })), paths: world.paths.filter(([a, b, k]) => k !== 'secret' || (discovered.has(a) && discovered.has(b))), len: world.len });
      // レンダラーに わたす「いまの せかい」。ぜんぶ ワールド座標。かきかえない やくそく
      const view = () => ({ regionId: world.regionId, world, residents: world.residents, party, player, camera, nearest, spot: curSpot, zone: mood.zone || null, mood, env: envNow, frame });
      return {
        RULES, enterRegion, step, talk, view, hitTest, dist, mapData,
        setEnv(e) { envNow = e; }, get env() { return envNow; },
        setPlayer(x, z) { player.x = x; player.z = z; clampToWorld(player, world); camera.x = player.x; camera.z = player.z; },
        get world() { return world; }, get party() { return party; }, get player() { return player; }, get camera() { return camera; }, get nearest() { return nearest; }, get registry() { return registry; }, get spot() { return curSpot; }, get zone() { return mood.zone || null; }, get mood() { return mood; }, get discovered() { return discovered; },
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

    // 絵文字/イラストの 立て看板を オフスクリーンに いちど えがいて つかいまわす(fillText は とても おもい)
    const glyphCache = new Map();
    let glyphVersion = -1;
    function glyphSprite(emoji, px, wrap, ns) {
      if (typeof document === 'undefined' || !document.createElement) return null;
      // え(イラスト/アトラス)が あとから よみこまれたら、placeholder の まま キャッシュ しない ように つくりなおす
      const ver = typeof S.illustrationVersion === 'function' ? S.illustrationVersion() : 0;
      if (ver !== glyphVersion) { glyphVersion = ver; glyphCache.clear(); }
      const bucket = Math.min(256, Math.max(12, Math.ceil(px / 12) * 12));
      const key = (ns || 'c') + ':' + emoji + '@' + bucket;
      let c = glyphCache.get(key);
      if (c === undefined) {
        c = null;
        const cv = document.createElement('canvas'); cv.width = Math.ceil(bucket * 1.3); cv.height = Math.ceil(bucket * 1.25);
        const g = cv.getContext && cv.getContext('2d');
        if (g && typeof g.fillText === 'function') { const gg = typeof wrap === 'function' ? wrap(g) || g : g; gg.font = `${bucket}px sans-serif`; gg.textAlign = 'center'; gg.textBaseline = 'bottom'; gg.fillText(emoji, cv.width / 2, cv.height - 2); c = cv; }
        if (glyphCache.size > 400) glyphCache.clear();
        glyphCache.set(key, c);
      }
      return c;
    }
    function createCanvasRenderer(o) {
      let ctx = o.ctx, W = o.W, H = o.H; const tier = o.tier || 0;
      const wrapCtx = typeof o.wrapCtx === 'function' ? o.wrapCtx : null;          // キャラ(じゅうみん)よう
      const wrapScenery = typeof o.wrapScenery === 'function' ? o.wrapScenery : null; // けしき よう(キャラの え には ならない)
      const resolveScenery = typeof o.resolveScenery === 'function' ? o.resolveScenery : null;
      // けしき よう の ctx: なまの ctx(= ふつうの 絵文字を そのまま えがく)と、けしき よう に つつんだ ctx(けしきの え が ある もの)
      let rawMain = o.rawCtx || null;
      let sceneryMain = rawMain ? (wrapScenery ? wrapScenery(rawMain) || rawMain : rawMain) : null;
      // けしきの 絵文字を どう えがくか: 'art' = けしき よう の え(SVG / アトラス)が ある → けしき よう の つつみで えがく
      //   'native' = けしきの え が ない、または キャラの え に あたった → つつみを とおさず なまの ctx で ふつうの 絵文字を えがく
      //   (つつみに null を かえさせると 四角い placeholder に なる ので、つつみ じたいを とおさない)。'skip' = いまの子の しるし(U+E000)は けしきには えがかない
      const modeCache = new Map();
      function sceneryMode(emoji) {
        if (emoji === '\uE000') return 'skip';
        let m = modeCache.get(emoji);
        if (m) return m;
        let d = null; try { d = resolveScenery ? resolveScenery(emoji) : null; } catch (_) { d = null; }
        m = d && (d.svg || d.image || (d.asset && !/assets\/characters\//.test(String(d.asset)))) ? 'art' : 'native';
        modeCache.set(emoji, m);
        return m;
      }
      // 立て看板を えがく: キャッシュした えが あれば drawImage、なければ fillText。
      // scenery=true の ものは けしき せんよう の みちすじ(なかま・こいびと・しゅぞくの え に ぜったい ならず、placeholder にも ならない)
      function drawGlyph(emoji, sx, sy, px, scenery) {
        let wrap = wrapCtx, ns = 'c', fallback = ctx;
        if (scenery) {
          const mode = sceneryMode(emoji);
          if (mode === 'skip') return;
          if (mode === 'art') { wrap = wrapScenery; ns = 's'; fallback = sceneryMain || rawMain || ctx; }
          else { wrap = null; ns = 'n'; fallback = rawMain || ctx; }
        }
        const c = px >= 12 ? glyphSprite(emoji, px, wrap, ns) : null;
        if (c) { const bucket = Math.min(256, Math.max(12, Math.ceil(px / 12) * 12)); const k = px / bucket; ctx.drawImage(c, sx - c.width * k / 2, sy - (c.height - 2) * k, c.width * k, c.height * k); }
        else { const g = fallback; if (g !== ctx) g.globalAlpha = ctx.globalAlpha; g.font = `${Math.round(px)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText(emoji, sx, sy); if (g !== ctx) g.globalAlpha = 1; }
      }
      const drawScenery = (emoji, sx, sy, px) => drawGlyph(emoji, sx, sy, px, true);
      const playerGlyph = typeof o.playerGlyph === 'function' ? o.playerGlyph : () => '🐣';
      // とうえい: カメラは じぶんの camera.dist うしろ(むき yaw)、たかさは じぶんの あしもとが FEET_FRAC に くる ように ぎゃくさん。地平線 HOR
      const HOR_BASE = 0.30, FEET_FRAC = 0.80, NEAR = 30;
      let F, HOR, cap, skyCache = null, nebula = null;
      function setup() { F = W * 0.95; HOR = Math.round(H * HOR_BASE); cap = tier >= 2 ? 36 : tier === 1 ? 48 : 64; skyCache = null; nebula = null; }
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
        const tintTo = (c) => (mood.tint ? c.map((v, i) => Math.round(lerp(v, mood.tint[i], 0.45 * (mood.tintAmt || 0)))) : c);
        const g0 = tintTo(hexToRgb(world.ground[0])), g1 = tintTo(hexToRgb(world.ground[1]));
        const fogC = mixRgb(world.ground[1], skyBottom, 0.55 + Math.min(0.35, (mood.fog || 0) * 0.6));
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
        // じめんの もよう(くさ・こいし・きらめき)と みちの ふち(ふみあと・いし・くい)
        const ms = world.markStyle; ctx.fillStyle = ms.color;
        for (const m of world.marks) { const p = project(m.x, m.z); if (!p || p.sy > H + 4 || p.sx < -10 || p.sx > W + 10 || p.dz > Math.min(3200, farCull)) continue; const px = m.size * p.s; if (px < 1.2) continue; if (m.edge) { ctx.fillStyle = world.edge; ctx.globalAlpha = clamp(1.2 - p.dz / farCull, 0.1, 0.7); ctx.fillRect(p.sx - px * 0.14, p.sy - px * 0.55, px * 0.28, px * 0.55); ctx.fillStyle = ms.color; continue; } ctx.globalAlpha = clamp(1.3 - p.dz / 2800, 0.15, ms.kind === 'sparkle' ? 0.9 : 0.5); if (ms.kind === 'tuft') { ctx.fillRect(p.sx - px * 0.5, p.sy - px * 0.7, px * 0.25, px * 0.7); ctx.fillRect(p.sx, p.sy - px * 0.9, px * 0.25, px * 0.9); ctx.fillRect(p.sx + px * 0.45, p.sy - px * 0.6, px * 0.25, px * 0.6); } else if (ms.kind === 'stone') { ctx.beginPath(); ctx.ellipse(p.sx, p.sy, px * 0.5, px * 0.22, 0, 0, TAU); ctx.fill(); } else { const tw = 0.5 + 0.5 * Math.sin(m.phase + now * 0.003); ctx.globalAlpha *= tw; ctx.fillRect(p.sx - px * 0.15, p.sy - px * 0.15, px * 0.3, px * 0.3); } }
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
        else if (kind === 'peak') drawScenery(world.regionId === 'snow' ? '🏔️' : '⛰️', x, y, px);
        else if (kind === 'temple') { ctx.fillStyle = shade('#cdb98a', light, '#000', 0); for (let k = 0; k < 4; k++) { const w = px * (0.7 - k * 0.15), h = px * 0.16; ctx.fillRect(x - w / 2, y - h * (k + 1), w, h); } ctx.fillStyle = shade('#8a7a5a', light, '#000', 0); ctx.fillRect(x - px * 0.06, y - px * 0.16, px * 0.12, px * 0.16); }
        else if (kind === 'bridge') { ctx.strokeStyle = shade('#8a6a3a', light, '#000', 0); ctx.lineWidth = Math.max(2, px * 0.05); ctx.beginPath(); ctx.moveTo(x - px * 0.5, y); ctx.quadraticCurveTo(x, y - px * 0.5, x + px * 0.5, y); ctx.stroke(); for (let k = -2; k <= 2; k++) { const bx = x + k * px * 0.2; ctx.beginPath(); ctx.moveTo(bx, y - px * 0.02); ctx.lineTo(bx, y - px * (0.45 - Math.abs(k) * 0.08)); ctx.stroke(); } }
        else drawScenery('🌳', x, y, px);
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
        else drawGlyph(a.emoji || '❓', 0, 0, px * 0.9);
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
      let mood = { light: 1, fog: 0, tint: null, tintAmt: 0 }, farCull = 3600;
      function draw(view, now) {
        if (!ctx) return;
        const { world, player, residents, party, nearest } = view; const e = view.env;
        setCamera(view.camera);
        mood = view.mood || mood;
        // 地区の きぶん: あかるさ・きり(とおくが みえない)・じめんの いろ。おくへ いくほど けしきが かわる
        farCull = Math.round(3600 * (1 - Math.min(0.6, mood.fog || 0) * 0.75));
        const tl = TIME_LIGHT[e.time] || TIME_LIGHT.day; const wl = WEATHER_LIGHT[e.weather] || 0.9; const light = tl.light * wl * (mood.light || 1);
        drawSky(world, e, tl, wl, now);
        drawBackdrop(world, e, light, tl);
        if (mood.fog > 0.02) { const fc = (SKY_OVERRIDE[world.regionId] || tl.sky)[1]; ctx.fillStyle = shade(fc, wl, '#ffffff', 0); ctx.globalAlpha = Math.min(0.85, mood.fog * 1.3); ctx.fillRect(0, HOR - H * 0.17, W, H * 0.17 + 4); ctx.globalAlpha = 1; }
        drawGround(world, e, tl, wl, light, now);
        // 立て看板(こもの・じゅうみん・いっしょの なかま・じぶん)を おくから じゅんに
        const items = [];
        const pp = project(player.x, player.z);
        // ランドマークは きりの むこうでも うっすら みえる(めじるし)。ほかは farCull まで
        // とおくの しゃへいぶつは 2つに 1つ(きりで うすい ので めだたない)。ちいさすぎる ものは えがかない
        let pi = 0;
        for (const pr of world.props) { pi++; const p = project(pr.x, pr.z); if (!p || p.s * pr.size < 6 || p.sx < -100 || p.sx > W + 100) continue; if (p.dz > (pr.landmark ? 5200 : farCull)) continue; if (pr.layer === 'wall' && p.dz > farCull * 0.62 && (pi & 1)) continue; items.push({ kind: 'prop', o: pr, p, must: !!pr.landmark }); }
        const talkR = 130;
        for (const a of residents) { const p = project(a.x, a.z); if (p && p.dz < farCull && p.s * ACTOR_SIZE >= 4 && p.sx > -60 && p.sx < W + 60) { const d = Math.hypot(a.x - player.x, a.z - player.z); items.push({ kind: 'actor', o: a, p, d, must: a === nearest || d < talkR * 1.5 }); } }
        for (const a of party) { const p = project(a.x, a.z); if (p) items.push({ kind: 'actor', o: a, p, d: Math.hypot(a.x - player.x, a.z - player.z), must: true }); }
        if (pp) items.push({ kind: 'player', p: pp, must: true });
        items.sort((u, v) => v.p.dz - u.p.dz);
        // カメラと じぶんの あいだに はいる おおきな もの(き・たてもの)は はんとうめいに: かくれても じぶんが わかる
        let occluded = false;
        if (pp) { const ppx = ACTOR_SIZE * pp.s; const pl = pp.sx - ppx * 0.35, pr2 = pp.sx + ppx * 0.35, pt = pp.sy - ppx, pb = pp.sy; for (const it of items) { if (it.kind !== 'prop' || it.p.dz >= pp.dz || !(it.o.layer === 'wall' || it.o.layer === 'landmark' || it.o.layer === 'side')) continue; const w = it.o.size * it.p.s; const l = it.p.sx - w * 0.45, r = it.p.sx + w * 0.45, t = it.p.sy - w, b = it.p.sy; if (r > pl && l < pr2 && b > pt && t < pb) { it.alpha = 0.32; occluded = true; } } }
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
            const fade = clamp(1.4 - it.p.dz / farCull, 0.2, 1) * (it.alpha != null ? it.alpha : 1);
            if (it.o.layer === 'glow') { const px = it.o.size * it.p.s; ctx.fillStyle = 'rgba(255,250,210,.28)'; ctx.globalAlpha = fade; ctx.beginPath(); ctx.ellipse(it.p.sx, it.p.sy, px * 0.6, px * 0.18, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; continue; }
            if (it.o.landmark) { ctx.globalAlpha = it.alpha != null ? it.alpha : 1; drawLandmark(it.o.landmark, it.p, it.o.size, light, world); ctx.globalAlpha = 1; continue; }
            const px = it.o.size * it.p.s; if (px < 5) continue; ctx.globalAlpha = fade; drawScenery(it.o.emoji, it.p.sx, it.p.sy, px); ctx.globalAlpha = 1;
          }
          else if (it.kind === 'player') {
            const px = ACTOR_SIZE * it.p.s; const facing = facingOf(player.heading, cam.yaw);
            ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(it.p.sx, it.p.sy, px * 0.32, px * 0.09, 0, 0, TAU); ctx.fill();
            const lift = player.moving ? Math.abs(Math.sin(player.bob * 5)) * px * (facing === 'back' ? 0.06 : 0.09) : 0;
            ctx.save(); ctx.translate(it.p.sx, it.p.sy - lift); ctx.scale(facing === 'left' ? -1 : 1, facing === 'back' ? 0.95 : 1); if (player.moving && (facing === 'left' || facing === 'right')) ctx.rotate((facing === 'left' ? -1 : 1) * 0.06);
            ctx.font = `${Math.round(px * 0.9)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(playerGlyph(), 0, 0); ctx.restore();
          }
          else {
            const a = it.o; drawSprite(a, it.p, ACTOR_SIZE, clamp(1.5 - it.p.dz / farCull, 0.3, 1), cam.yaw);
            const top = it.p.sy - ACTOR_SIZE * it.p.s;
            if (a.say && a.sayFor > 0) drawBubble(a.say, it.p.sx, top);
            else if (a === nearest && it.p.s > 0.3) drawLabel(a.label + (a.state && VERBS[a.state] ? '・' + VERBS[a.state] : ''), it.p.sx, top - 4, false);
            else if (named.has(a)) drawLabel(a.label, it.p.sx, top - 3, true);
          }
        }
        // かくれている ときは あしもとに わ を だす(じぶんの いちが わかる)
        if (occluded && pp) { const px = ACTOR_SIZE * pp.s; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.ellipse(pp.sx, pp.sy, px * 0.36, px * 0.11, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
        if (e.weather === 'rain' || e.weather === 'snow') { ctx.fillStyle = e.weather === 'rain' ? 'rgba(180,210,255,.55)' : 'rgba(255,255,255,.85)'; const n = tier >= 2 ? 16 : 34; for (let i = 0; i < n; i++) { const x = (i * 97 + (now * (e.weather === 'rain' ? 0.02 : 0.005) * (i % 3 + 1))) % (W + 20) - 10; const y = (i * 61 + now * (e.weather === 'rain' ? 0.5 : 0.08) * (1 + (i % 4) * 0.3)) % (H + 20) - 10; if (e.weather === 'rain') ctx.fillRect(x, y, 1.5, 9); else { ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3), 0, TAU); ctx.fill(); } } }
        if (e.time === 'night' && world.sky !== 'stars') { ctx.fillStyle = 'rgba(10,15,45,.20)'; ctx.fillRect(0, 0, W, H); }
      }
      return { draw, project, facingOf, drawScenery, sceneryMode, resize(n) { ctx = n.ctx; W = n.W; H = n.H; if (n.rawCtx) { rawMain = n.rawCtx; sceneryMain = wrapScenery ? wrapScenery(n.rawCtx) || n.rawCtx : n.rawCtx; } setup(); }, destroy() { skyCache = null; nebula = null; } };
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
      // おもい ときは えを 2フレームに 1かい(せかいの けいさんは まいフレーム)。フレームの ながさの へいきんで じどう
      let frameEma = 0.016, halfRate = tier >= 2;
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
      const rawCtxOf = () => (canvas && typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null); // なまの ctx(けしき よう の つつみに つかう)
      const placeEl = container.querySelector('#mgrPlace'), countEl = container.querySelector('#mgrCount'), foundEl = container.querySelector('#mgrFound'), hintEl = container.querySelector('#mgrHint'), bannerEl = container.querySelector('#mgrBanner'), spotEl = container.querySelector('#mgrSpot');
      const talkBtn = container.querySelector('#mgrTalk'), travelBtn = container.querySelector('#mgrTravel'), homeBtn = container.querySelector('#mgrHome');
      const rendererFactory = typeof opts.renderer === 'function' ? opts.renderer : createCanvasRenderer;
      const renderer = rendererFactory({ canvas, ctx, rawCtx: rawCtxOf(), W, H, tier, playerGlyph: typeof S.playerGlyph === 'function' ? S.playerGlyph : () => '🐣', wrapCtx: typeof S.wrapCanvasCtx === 'function' ? S.wrapCanvasCtx : null, wrapScenery: typeof S.sceneryCtx === 'function' ? S.sceneryCtx : null, resolveScenery: typeof S.resolveScenery === 'function' ? S.resolveScenery : null });
      let resizeTimer = null;
      const onResize = () => { if (resizeTimer) clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { resizeTimer = null; if (!running) return; const n = S.createMgCanvas(canvas, () => availHeight(), {}); ctx = n.ctx; W = n.W; H = n.H; if (typeof renderer.resize === 'function') renderer.resize({ ctx, W, H, rawCtx: rawCtxOf() }); }, 150); };
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
      let lastZone = null;
      const showSpot = (s) => { if (!s) { const zn = sim.zone; if (zn) { spotEl.textContent = zn.label; spotEl.classList.remove('hidden'); } else spotEl.classList.add('hidden'); return; } spotEl.textContent = `${s.secret ? '🔍 ' : ''}${s.label}`; spotEl.classList.remove('hidden'); };
      const plainLabel = (id) => (typeof S.regionPlainLabel === 'function' ? S.regionPlainLabel(id, sim.world.local) : id);
      showBanner(`${plainLabel(sim.world.regionId)}を めぐる`, 1600);
      hud();
      const preload = () => { if (typeof S.prepareIllustrations !== 'function') return; const w = sim.world; const scenery = [...new Set(w.props.map((p) => p.emoji).filter(Boolean))]; const actors = [...new Set(w.residents.concat(sim.party).map((a) => a.emoji).filter(Boolean))]; S.prepareIllustrations(scenery, actors); };
      preload();
      function enterWorld(regionId) {
        sim.enterRegion(regionId, { registry: buildRegistry(), locality: typeof S.selectedLocality === 'function' ? S.selectedLocality() : null, discovered: typeof S.discoveredSpots === 'function' ? S.discoveredSpots(regionId) : [] });
        preload();
        sim.setEnv(env());
        talkBtn.disabled = true; showSpot(null);
        showBanner(`${plainLabel(regionId)}に ついた`, 1600);
        hud();
      }
      function frameFn(now) {
        if (!running) return;
        if (last === null) last = now; const last0 = last; const dt = Math.min(0.05, (now - last) / 1000); last = now; frame++;
        const st = getState();
        if (st.regionId !== sim.world.regionId) enterWorld(st.regionId || 'home');
        if (frame % 30 === 0) { const nx = env(); const changed = nx.time !== sim.env.time || nx.weather !== sim.env.weather; sim.setEnv(nx); if (changed) hud(); }
        const events = sim.step(dt, pad.vector());
        for (const ev of events) {
          if (ev.type === 'met') { if (typeof S.recordMet === 'function') S.recordMet(ev.actor.key); hud(); }
          else if (ev.type === 'nearest') talkBtn.disabled = !ev.actor;
          else if (ev.type === 'spot') { showSpot(ev.spot); if (ev.first) { showBanner(`${ev.spot.label}を みつけた`, 1500); sfx('pop'); if (typeof S.recordSpot === 'function') S.recordSpot(sim.world.regionId, ev.spot.id); } }
        }
        if (!sim.spot && sim.zone !== lastZone) { lastZone = sim.zone; showSpot(null); }
        const nearest = sim.nearest;
        const hint = nearest ? `${nearest.label}が ${VERBS[nearest.state] || 'いる'}` : sim.spot ? `【${sim.spot.label}】${sim.spot.secret ? 'ひみつの ばしょ。' : ''}${HINT_DEFAULT}` : sim.zone ? `【${sim.zone.label}】${HINT_DEFAULT}` : HINT_DEFAULT;
        if (hint !== lastHint) { lastHint = hint; hintEl.textContent = hint; }
        if (banner && now >= bannerUntil) { banner = null; bannerEl.classList.add('hidden'); }
        frameEma += ((now - last0) / 1000 - frameEma) * 0.05;
        if (!halfRate && frameEma > 0.036) halfRate = true; else if (halfRate && tier < 2 && frameEma < 0.024) halfRate = false;
        if (!(halfRate && frame % 2 === 1)) renderer.draw(sim.view(), now);
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

    return { WORLDS, WORLD_STYLE, HABITAT, NORMAL_REGIONS, RULES, PATH_HALF, CAM_PROFILES, SCENERY_FAUNA, isFaunaEmoji, sceneryPools, auditSceneryFauna, auditSceneryCharacters, characterEmojiMap, SCENERY_CHARACTER_ALLOW, SPOT_STATUE_ALLOW, SCENERY_LINES, moodAt, buildRegistry, auditRegistry, auditScenery, sceneryEmojis, buildWorld, companionsOf, talkLine, chooseState, updateActor, createSimulation, createCanvasRenderer, start, reachableSpots, pathSegments, nearestPath, onPath, facingOf, spriteFor, wrapAngle };
  };
})();
