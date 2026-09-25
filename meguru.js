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
//    isAuthorUnlocked, authorAsset, perfTier, onExit, openTravel, recordMet, recordTalk, recordSpot, discoveredSpots,
//    recordMapBits, mapRecords, seedMapRecords (ちずの「あるいた きろく」。どれも なくても うごく)
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
    // らんすう。ふだんは Math.random そのもの。テストだけ たねを 入れかえて、
    // おなじ ながれを なんども ためせる ように する(ほんばんは これまでどおり)
    let RANDOM = Math.random;
    const rand = () => RANDOM();
    const setRandom = (fn) => { RANDOM = typeof fn === 'function' ? fn : Math.random; };
    const rnd = (a, b) => a + rand() * (b - a);
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];
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
      // おうち: コンパクトな せいかつけん。ひろげすぎず、となりの こみち と うらの はたけ だけ ふやす
      home: { len: 3000, halfW: 1150, ground: ['#9ed07c', '#7bb265'], path: '#cbb98f', props: ['🌳', '🌷', '🪴', '🏠', '🌼', '🌳'],
        zones: [Z('front', 'いえのまえ', { crowd: 2.0, hero: ['house', 300], anim: 'glow' }), Z('back', 'うらにわ', { crowd: 1.6, tint: '#9fd48a', frame: 'hedge', frameScale: 0.85, hero: ['planter', 260], anim: 'leaves' }), Z('lane', 'となりのこみち', { crowd: 0.8, light: 0.97, tint: '#a8c88f', walls: 1.05, frame: 'woodfence', frameScale: 0.8, hero: ['vending', 250], anim: 'leaves', open: 0.97, lane: ['🪴', '🚲', '🪧', '🌿'] }), Z('far', 'おおきなきのまわり', { crowd: 0.7, light: 0.95, fog: 0.08, walls: 0.5, anim: 'leaves', open: 1.05 })],
        spots: [sp('gate', 'いえのまえ', 0, 250, 200, 'plaza', 1, { zone: 'front' }), sp('yard', 'にわ', 0, 780, 260, 'plaza', 7, { hub: true, prop: '🪴', zone: 'front' }), sp('house', 'おうちのよこ', -620, 1050, 170, 'rest', 3, { prop: '🏠', zone: 'front' }), sp('shed', 'のきした', 620, 1050, 150, 'shelter', 3, { prop: '🛖', zone: 'front' }), sp('lane', 'こみち', 0, 1300, 170, 'path', 1, { zone: 'back' }), sp('garden', 'はなばたけ', -700, 1600, 200, 'grove', 3, { prop: '🌷', zone: 'back' }), sp('bench', 'ベンチ', 700, 1550, 150, 'rest', 3, { prop: '🪑', zone: 'back' }), sp('veg', 'はたけ', 850, 1250, 170, 'grove', 2, { prop: '🌱', zone: 'back' }), sp('park', 'こうえん', 0, 1950, 260, 'plaza', 6, { prop: '🛝', zone: 'back' }), sp('alley', 'いえのうらみち', -950, 1250, 150, 'path', 0, { zone: 'lane' }), sp('hedge', 'いけがきのかど', -1000, 1900, 150, 'path', 1, { prop: '🪧', zone: 'lane' }), sp('pond', 'ひみつのいけ', -420, 2350, 140, 'water', 1, { secret: true, prop: '💧', zone: 'far' }), sp('swing', 'きのしたのブランコ', 560, 2400, 160, 'rest', 3, { prop: '🛝', zone: 'far' }), sp('bigtree', 'おおきなき', 0, 2600, 200, 'edge', 2, { landmark: 'bigtree', lmTier: 1, cam: 'wide', zone: 'far' })],
        paths: [['gate', 'yard', 'wide'], ['yard', 'house'], ['house', 'garden'], ['yard', 'lane'], ['lane', 'park'], ['yard', 'shed'], ['shed', 'bench'], ['bench', 'park'], ['shed', 'veg'], ['veg', 'bench', 'narrow'], ['garden', 'park', 'narrow'], ['house', 'alley', 'narrow'], ['alley', 'hedge', 'narrow'], ['hedge', 'garden', 'narrow'], ['hedge', 'pond', 'secret'], ['garden', 'pond', 'secret'], ['park', 'swing'], ['swing', 'bigtree', 'narrow'], ['park', 'bigtree']] },
      // とかい: まちく ネットワーク型。おおどおり・しょうてんがい・いちば・ろじうら・こうえん・かわぞい・
      // オフィスがい・じゅうたくがい・たかだい・とけいとう の 10地区。おおどおりは とおくまで みとおせ、
      // ろじうら は すぐ さきが みえない。地区ごとに めじるし(ネオン・あかちょうちん・どうぞう・じはんき・
      // さんばし・ふんすい・おおきないえ・ぼうえんきょう・とけいとう)を 1つずつ おく
      city: { len: 6600, halfW: 2300, ground: ['#5d626f', '#474c59'], path: '#6e7482', props: ['🏢', '🏬', '🚦', '💡', '🌳', '🚕', '🏪', '🎡'],
        zones: [Z('station', 'えきまえ', { crowd: 2.6, frameScale: 1.15, hero: ['neonsign', 320], anim: 'neon', open: 1.03 }), Z('shopping', 'しょうてんがい', { crowd: 2.0, tint: '#c9c0b0', frame: 'shopblock', frameScale: 0.72, hero: ['shopfront', 320], anim: 'neon', lane: ['🏪', '🪧', '💡', '🚲', '🏮'] }), Z('market', 'いちばどおり', { crowd: 1.4, light: 0.94, tint: '#b6a892', walls: 1.25, frame: 'shopblock', frameScale: 0.62, hero: ['lantern', 290], field: ['🏮', '🪧', '🏪'], anim: 'neon', open: 0.95, lane: ['🏮', '🪧', '🏮', '🍡'] }), Z('park', 'こうえん', { crowd: 1.6, tint: '#9fc98a', walls: 0.7, frame: 'parktree', hero: ['statue', 300], field: ['🌳', '🌷', '🌼', '🪴'], anim: 'leaves' }), Z('back', 'ろじうら', { crowd: 0.5, light: 0.86, tint: '#8f9299', walls: 1.3, frame: 'alleywall', hero: ['vending', 260], anim: 'glow', open: 0.94, lane: ['🗑️', '🚧', '🚲', '💡'] }), Z('river', 'かわぞいのみち', { crowd: 0.8, light: 1.03, tint: '#8fb4b0', walls: 0.45, frameScale: 0.9, hero: ['pier', 330], field: ['🌿', '🌳', '🪧'], anim: 'water', open: 1.07, lane: ['🌿', '💧', '🚲', '🌳'] }), Z('office', 'オフィスがい', { crowd: 0.7, light: 0.9, fog: 0.06, tint: '#7d838f', walls: 1.55, frame: 'building', frameScale: 1.35, hero: ['springpool', 300], anim: 'neon', open: 0.9, lane: ['💡', '🚦', '🪧', '💡'] }), Z('resid', 'じゅうたくがい', { crowd: 0.7, light: 1.0, tint: '#a9aa9c', walls: 0.85, frame: 'house', frameScale: 0.85, hero: ['house', 330], field: ['🪴', '🌳', '🚲'], anim: 'leaves', open: 1.0, lane: ['🪴', '🚲', '🐾', '🌷'] }), Z('uptown', 'たかだい', { crowd: 0.6, light: 1.02, fog: 0.05, walls: 0.8, hero: ['telescope', 270], anim: 'neon', open: 1.05 }), Z('clock', 'とけいとうのおか', { crowd: 0.6, light: 1.05, fog: 0.12, tint: '#9fa8b4', walls: 0.5, frameScale: 1.1, anim: 'neon', open: 1.08, marks: { color: '#cdd6e4', kind: 'tuft' } })],
        spots: [sp('station', 'えきまえ', 0, 250, 220, 'plaza', 7, { prop: '🚉', zone: 'station' }), sp('square', 'えきまえひろば', 0, 800, 280, 'plaza', 9, { hub: true, prop: '⛲', zone: 'station' }), sp('cross1', 'おおどおりのこうさてん', -700, 800, 170, 'path', 4, { prop: '🚦', zone: 'shopping' }), sp('cross2', 'こうさてん', 700, 800, 170, 'path', 4, { prop: '🚦', zone: 'park' }), sp('cafe', 'カフェどおり', 0, 1400, 180, 'shelter', 7, { prop: '☕', zone: 'station' }), sp('cross5', 'おおどおりのなかほど', 180, 2000, 170, 'path', 2, { prop: '🚦', zone: 'station' }), sp('arcade', 'しょうてんがい', -700, 1400, 220, 'shop', 7, { prop: '🏪', zone: 'shopping' }), sp('bakery', 'パンやのまえ', -1300, 1400, 160, 'shop', 3, { prop: '🏬', zone: 'shopping' }), sp('flower', 'はなやのかど', -1750, 1800, 150, 'shop', 2, { prop: '🌷', zone: 'shopping' }), sp('arcade2', 'しょうてんがいのおく', -700, 2050, 200, 'shop', 4, { prop: '🪧', zone: 'shopping' }), sp('stalls', 'やたいのならび', -1150, 2600, 180, 'shop', 5, { prop: '🏮', zone: 'market' }), sp('market', 'よいちのひろば', -600, 3000, 220, 'plaza', 6, { prop: '🏮', zone: 'market' }), sp('fish', 'さかなやのまえ', -1650, 3050, 160, 'shop', 3, { prop: '🏪', zone: 'market' }), sp('marketback', 'いちばのうら', -1950, 2450, 150, 'path', 0, { zone: 'market' }), sp('alley', 'ろじうら', -1450, 2150, 150, 'path', 1, { zone: 'back' }), sp('cats', 'ねこのばしょ', -1950, 1450, 140, 'rest', 1, { secret: true, prop: '🐾', zone: 'back' }), sp('backdoor', 'ビルのうらぐち', 400, 2650, 150, 'path', 0, { zone: 'back' }), sp('backlot', 'ビルのうら', 800, 2200, 150, 'path', 1, { zone: 'back' }), sp('rooftop', 'やねのうえ', 1300, 2650, 140, 'rest', 1, { secret: true, zone: 'back' }), sp('alley2', 'ほそいろじ', 1000, 3150, 150, 'path', 0, { zone: 'back' }), sp('park', 'こうえん', 700, 1400, 240, 'plaza', 6, { prop: '🌳', zone: 'park' }), sp('pond', 'こうえんのいけ', 1300, 1750, 180, 'water', 3, { zone: 'park' }), sp('playground', 'あそびば', 1750, 1300, 200, 'plaza', 3, { prop: '🎡', zone: 'park' }), sp('parkwalk', 'こうえんのこみち', 1150, 2150, 160, 'path', 1, { zone: 'park' }), sp('riverwalk', 'かわぞいのみち', 1850, 2250, 180, 'path', 1, { prop: '🌳', zone: 'river' }), sp('riverpark', 'かわらのひろば', 2000, 2950, 220, 'plaza', 3, { zone: 'river' }), sp('citybridge', 'まちのはし', 1500, 3450, 170, 'path', 1, { prop: '🌉', zone: 'river' }), sp('boatpier', 'ふなつきば', 2050, 3650, 170, 'rest', 2, { prop: '⛵', zone: 'river' }), sp('rivercross', 'かわぞいのこうさてん', 900, 3800, 170, 'path', 1, { prop: '🚦', zone: 'river' }), sp('office1', 'オフィスがい', 0, 3550, 200, 'path', 2, { prop: '🏢', zone: 'office' }), sp('office2', 'ビルのはざま', -450, 4050, 170, 'path', 0, { zone: 'office' }), sp('plaza2', 'ビルのひろば', 500, 4150, 220, 'plaza', 3, { prop: '⛲', zone: 'office' }), sp('cross4', 'おおどおりのはし', 0, 4550, 170, 'path', 2, { prop: '🚦', zone: 'office' }), sp('resid1', 'じゅうたくがい', -1150, 3800, 200, 'plaza', 3, { prop: '🏠', zone: 'resid' }), sp('resid2', 'いえなみのみち', -1650, 4350, 170, 'path', 1, { zone: 'resid' }), sp('cityshrine', 'まちのおやしろ', -2000, 4900, 170, 'rest', 2, { prop: '⛩️', zone: 'resid' }), sp('catlane', 'ねこのほそみち', -1900, 3300, 140, 'rest', 1, { secret: true, prop: '🐾', zone: 'resid' }), sp('hillfoot', 'さかしたのかど', -1250, 5000, 160, 'path', 1, { prop: '🚦', zone: 'resid' }), sp('slope', 'さかみち', -600, 5100, 160, 'path', 1, { zone: 'uptown' }), sp('cross3', 'さかのこうさてん', 0, 5050, 170, 'path', 2, { prop: '🚦', zone: 'uptown' }), sp('steps', 'ながいかいだん', 1200, 4700, 150, 'path', 0, { zone: 'uptown' }), sp('uphouse', 'たかだいのいえなみ', 750, 5250, 180, 'path', 1, { zone: 'uptown' }), sp('lookout', 'てんぼうひろば', 0, 5600, 240, 'edge', 3, { cam: 'wide', zone: 'uptown' }), sp('towerplaza', 'とけいとうのひろば', 550, 5950, 220, 'plaza', 3, { prop: '💡', zone: 'clock' }), sp('citygarden', 'たかだいのにわ', -650, 6000, 180, 'grove', 2, { prop: '🌳', zone: 'clock' }), sp('tower', 'とけいとう', 0, 6250, 220, 'edge', 2, { landmark: 'tower', lmTier: 1, cam: 'wide', zone: 'clock' }), sp('obs', 'ひみつのてんぼう', 1150, 6200, 140, 'rest', 1, { secret: true, zone: 'clock' })],
        paths: [['station', 'square', 'wide'], ['square', 'cross1', 'wide'], ['square', 'cross2', 'wide'], ['square', 'cafe'], ['cross1', 'arcade'], ['arcade', 'bakery'], ['bakery', 'flower', 'narrow'], ['arcade', 'arcade2'], ['flower', 'cats', 'secret'], ['arcade2', 'alley', 'narrow'], ['bakery', 'alley', 'narrow'], ['alley', 'stalls', 'narrow'], ['stalls', 'market'], ['stalls', 'fish', 'narrow'], ['fish', 'marketback', 'narrow'], ['marketback', 'alley', 'narrow'], ['market', 'arcade2', 'narrow'], ['cross2', 'park'], ['park', 'pond'], ['park', 'playground'], ['playground', 'pond', 'narrow'], ['pond', 'parkwalk'], ['parkwalk', 'backlot', 'narrow'], ['cafe', 'cross5', 'wide'], ['cross5', 'backdoor'], ['backdoor', 'backlot', 'narrow'], ['backlot', 'rooftop', 'secret'], ['backlot', 'alley2', 'narrow'], ['alley2', 'office1', 'narrow'], ['pond', 'riverwalk', 'narrow'], ['riverwalk', 'riverpark'], ['riverpark', 'citybridge'], ['riverpark', 'boatpier', 'narrow'], ['citybridge', 'rivercross', 'narrow'], ['rivercross', 'plaza2', 'narrow'], ['boatpier', 'citybridge', 'narrow'], ['backdoor', 'office1', 'narrow'], ['cross5', 'parkwalk', 'narrow'], ['market', 'office2', 'narrow'], ['office1', 'office2'], ['office1', 'plaza2'], ['office2', 'cross4'], ['plaza2', 'cross4'], ['plaza2', 'steps', 'narrow'], ['market', 'resid1'], ['resid1', 'resid2'], ['resid2', 'cityshrine', 'narrow'], ['resid1', 'catlane', 'secret'], ['resid2', 'hillfoot', 'narrow'], ['cityshrine', 'hillfoot', 'narrow'], ['hillfoot', 'slope', 'narrow'], ['cross4', 'cross3', 'wide'], ['cross3', 'slope'], ['cross3', 'uphouse'], ['steps', 'uphouse', 'narrow'], ['cross3', 'lookout'], ['uphouse', 'lookout', 'narrow'], ['slope', 'lookout', 'narrow'], ['lookout', 'towerplaza'], ['lookout', 'citygarden', 'narrow'], ['towerplaza', 'tower'], ['citygarden', 'tower', 'narrow'], ['towerplaza', 'obs', 'secret']] },
      // いなか: ひろい へいめん型を さらに ひろげる。むら → はたけ → かじゅえん / そうげん → かわぞい →
      // たなだ → となりの しゅうらく → おか → ちんじゅの もり → むらの はずれ。みとおしが いいので
      // とおくの ふうしゃ・みずぐるま・おおきな き が つねに ほうがくの てがかりに なる
      countryside: { len: 7700, halfW: 2600, ground: ['#b8d98a', '#8fbf6a'], path: '#d8c79a', props: ['🌳', '🌻', '🪵', '🚜', '🌳', '🌼', '🏚️', '🏡'],
        zones: [Z('village', 'むら', { crowd: 3.6, frame: 'farmhouse', walls: 0.7, hero: ['farmhouse', 400], anim: 'leaves' }), Z('fields', 'はたけ', { crowd: 1.1, tint: '#c9c77a', walls: 0.8, frame: 'cropline', hero: ['hayroll', 320], field: ['🌾', '🌾', '🌻'], anim: 'leaves', open: 1.04 }), Z('orchard', 'かじゅえん', { crowd: 0.7, light: 0.98, tint: '#a8c473', walls: 1.15, frame: 'parktree', frameScale: 1.05, hero: ['parktree', 430], field: ['🌳', '🌳', '🌼'], anim: 'leaves', open: 0.98, lane: ['🌳', '🌼', '🪵', '🌳'] }), Z('meadow', 'そうげん', { crowd: 1.2, tint: '#a9d98a', walls: 0.35, light: 1.04, hero: ['fencerail', 340], field: ['🌼', '🌱', '🌼'], anim: 'leaves', open: 1.06 }), Z('river', 'かわぞいのみち', { crowd: 0.8, light: 1.0, tint: '#9ecfa8', walls: 0.55, frame: 'riverwood', hero: ['waterwheel', 360], field: ['🌿', '💧', '🌿'], anim: 'water', open: 1.05, lane: ['🌿', '💧', '🪨', '🌿'] }), Z('terrace', 'たなだ', { crowd: 0.6, light: 1.03, tint: '#bcd07e', walls: 0.45, frameScale: 0.9, hero: ['oldpost', 300], field: ['🌾', '🌱', '🌾'], anim: 'water', open: 1.07, marks: { color: '#8fae6a', kind: 'tuft' } }), Z('hamlet', 'となりのしゅうらく', { crowd: 1.3, light: 0.99, tint: '#b0c38c', walls: 0.9, frame: 'farmhouse', frameScale: 0.9, hero: ['stonestack', 290], field: ['🏡', '🪴', '🌳'], anim: 'leaves', lane: ['🪴', '🪵', '🐾', '🌷'] }), Z('hill', 'おか', { crowd: 1.2, light: 1.05, walls: 0.4, hero: ['statue', 300], field: ['🌻', '🌻', '🌼'], anim: 'leaves', open: 1.06 }), Z('woods', 'ちんじゅのもり', { crowd: 0.5, light: 0.82, fog: 0.2, tint: '#6f8f5f', walls: 1.5, frame: 'pinewall', frameScale: 1.2, hero: ['lanternpost', 300], field: ['🌳', '🌿', '🪨'], anim: 'mist', open: 0.93, lane: ['🌿', '🪨', '🍂', '🌳'] }), Z('far', 'むらのはずれ', { crowd: 0.4, fog: 0.12, walls: 0.5, anim: 'mist', open: 1.08 })],
        spots: [sp('gate', 'むらのいりぐち', 0, 250, 200, 'plaza', 1, { zone: 'village' }), sp('village', 'むらのひろば', 0, 850, 280, 'plaza', 9, { hub: true, prop: '🏡', zone: 'village' }), sp('store', 'むらのよろずや', -520, 1250, 170, 'shop', 5, { prop: '🏚️', zone: 'village' }), sp('bus', 'バスていのベンチ', 520, 1150, 150, 'rest', 4, { prop: '🪧', zone: 'village' }), sp('road', 'あぜみち', 0, 1500, 170, 'path', 3, { zone: 'village' }), sp('field1', 'はたけ', -950, 1150, 220, 'grove', 3, { prop: '🌾', zone: 'fields' }), sp('field2', 'ひろいはたけ', -1550, 1750, 240, 'grove', 2, { prop: '🌾', zone: 'fields' }), sp('scarecrow', 'かかしのみち', -950, 2100, 170, 'path', 1, { prop: '🪧', zone: 'fields' }), sp('paddy', 'たんぼのあぜ', -1900, 2350, 200, 'path', 0, { zone: 'fields' }), sp('shed2', 'のうぐごや', -1350, 2550, 160, 'shelter', 2, { prop: '🏚️', zone: 'fields' }), sp('orchard', 'かじゅえん', -1600, 3150, 220, 'grove', 3, { prop: '🌳', zone: 'orchard' }), sp('orchard2', 'りんごのき', -2100, 3650, 180, 'grove', 2, { prop: '🌳', zone: 'orchard' }), sp('ladder', 'はしごのおくば', -1150, 3600, 150, 'path', 0, { zone: 'orchard' }), sp('meadow', 'そうげん', 950, 1250, 260, 'plaza', 5, { zone: 'meadow' }), sp('pasture', 'ぼくじょう', 1500, 1800, 220, 'grove', 3, { prop: '🪧', zone: 'meadow' }), sp('barn', 'なや', 700, 1900, 170, 'shelter', 3, { prop: '🏚️', zone: 'meadow' }), sp('cow', 'うしのみずば', 1900, 1300, 170, 'water', 2, { prop: '🌾', zone: 'meadow' }), sp('fence', 'ながいさく', 1300, 2400, 150, 'path', 0, { zone: 'meadow' }), sp('riverbank', 'かわぞい', 1800, 2750, 200, 'water', 2, { prop: '🌿', zone: 'river' }), sp('stepstone', 'とびいし', 2200, 3250, 150, 'path', 0, { prop: '🪨', zone: 'river' }), sp('watermill', 'みずぐるま', 1350, 3300, 200, 'edge', 2, { landmark: 'windmill', lmTier: 2, zone: 'river' }), sp('fishspot', 'かわのつりば', 2000, 3850, 170, 'water', 1, { prop: '🎣', zone: 'river' }), sp('terrace', 'たなだ', -900, 4250, 220, 'grove', 2, { prop: '🌾', zone: 'terrace' }), sp('terrace2', 'たなだのうえ', -1500, 4800, 190, 'path', 1, { zone: 'terrace' }), sp('terracelook', 'たなだのてんぼう', -2000, 4400, 170, 'edge', 1, { cam: 'wide', zone: 'terrace', view: ['cropline', 'ricestalk', 'ricestalk'] }), sp('hamletwell', 'きょうどうのいど', 1200, 3950, 160, 'rest', 2, { prop: '🏺', zone: 'hamlet' }), sp('hamlet', 'となりのしゅうらく', 900, 4400, 240, 'plaza', 6, { prop: '🏡', zone: 'hamlet' }), sp('hamlethouse', 'かやぶきのいえ', 1450, 4850, 180, 'rest', 5, { prop: '🏚️', zone: 'hamlet' }), sp('hamletlane', 'しゅうらくのこみち', 450, 4850, 150, 'path', 0, { zone: 'hamlet' }), sp('lane1', 'ながいあぜみち', 0, 2350, 170, 'path', 1, { prop: '🪧', zone: 'village' }), sp('lane2', 'みちのぶんき', 100, 3200, 180, 'path', 1, { prop: '🪵', zone: 'village' }), sp('hillpath', 'おかのみち', 0, 4200, 170, 'path', 1, { zone: 'hill' }), sp('hill', 'ひなたのおか', 0, 5300, 260, 'plaza', 7, { prop: '🌻', zone: 'hill' }), sp('well', 'いど', -700, 5750, 160, 'rest', 4, { prop: '🏺', zone: 'hill' }), sp('shrine', 'ちいさなほこら', 700, 5800, 160, 'rest', 4, { prop: '⛩️', zone: 'hill' }), sp('woods', 'ちんじゅのもり', 1150, 6250, 200, 'grove', 2, { prop: '🌳', zone: 'woods' }), sp('torii', 'ふるいとりい', 1500, 6800, 170, 'path', 1, { prop: '⛩️', zone: 'woods', mood: { light: -0.06, fog: 0.16, open: 0.1, tint: '#8fa6b4' } }), sp('woodsrest', 'もりのベンチ', 800, 6850, 150, 'rest', 1, { prop: '🪵', zone: 'woods' }), sp('mountpath', 'もりのやまみち', 2100, 7000, 160, 'path', 0, { zone: 'woods', mood: { light: 0.04, fog: 0.1, open: 0.34, tint: '#9fb2bd' } }), sp('skyland', 'そらのりば', 2350, 7400, 190, 'plaza', 1, { prop: '🪧', zone: 'woods', mood: { light: 0.08, fog: 0.06, open: 0.55, tint: '#a9bcd0' } }), sp('hut', 'はたけのこや', -700, 6300, 150, 'shelter', 1, { prop: '🏚️', zone: 'far' }), sp('windmill', 'ふうしゃ', -1350, 6550, 180, 'edge', 2, { landmark: 'windmill', lmTier: 1, zone: 'far' }), sp('oldtree', 'おおきなき', 0, 7000, 200, 'edge', 2, { landmark: 'bigtree', lmTier: 1, cam: 'wide', zone: 'far' }), sp('farfield', 'はずれのはたけ', -750, 7000, 170, 'grove', 1, { prop: '🌾', zone: 'far' }), sp('pond', 'かくれたためいけ', -1900, 7000, 140, 'water', 1, { secret: true, zone: 'far' }), sp('mossrock', 'こけのいわ', 1750, 7100, 140, 'rest', 1, { secret: true, prop: '🪨', zone: 'woods' }), sp('orchardhut', 'かじゅえんのこや', -2250, 3100, 140, 'rest', 1, { secret: true, prop: '🏚️', zone: 'orchard' }), sp('riverislet', 'かわのなかす', 2350, 3700, 140, 'water', 1, { secret: true, zone: 'river' })],
        paths: [['gate', 'village', 'wide'], ['village', 'store'], ['village', 'bus'], ['village', 'road'], ['store', 'field1'], ['field1', 'field2'], ['field1', 'scarecrow', 'narrow'], ['field2', 'paddy', 'narrow'], ['paddy', 'shed2', 'narrow'], ['scarecrow', 'shed2', 'narrow'], ['shed2', 'orchard'], ['paddy', 'orchard', 'narrow'], ['orchard', 'orchard2', 'narrow'], ['orchard', 'ladder', 'narrow'], ['orchard2', 'terracelook', 'narrow'], ['ladder', 'terrace', 'narrow'], ['bus', 'meadow'], ['village', 'meadow'], ['meadow', 'pasture'], ['meadow', 'barn'], ['meadow', 'cow', 'narrow'], ['cow', 'pasture', 'narrow'], ['pasture', 'fence', 'narrow'], ['barn', 'fence', 'narrow'], ['fence', 'riverbank'], ['riverbank', 'stepstone', 'narrow'], ['riverbank', 'watermill'], ['stepstone', 'fishspot', 'narrow'], ['watermill', 'fishspot', 'narrow'], ['watermill', 'hamletwell', 'narrow'], ['road', 'lane1'], ['lane1', 'lane2'], ['lane2', 'hillpath'], ['scarecrow', 'lane1', 'narrow'], ['lane2', 'watermill', 'narrow'], ['hillpath', 'terrace', 'narrow'], ['hillpath', 'hamletwell', 'narrow'], ['terrace', 'terrace2'], ['terrace', 'terracelook', 'narrow'], ['terrace2', 'well', 'narrow'], ['hamletwell', 'hamlet'], ['hamlet', 'hamlethouse'], ['hamlet', 'hamletlane', 'narrow'], ['hamletlane', 'hill', 'narrow'], ['hillpath', 'hill'], ['hill', 'well'], ['hill', 'shrine'], ['hamlethouse', 'shrine', 'narrow'], ['shrine', 'woods'], ['woods', 'torii', 'narrow'], ['woods', 'woodsrest', 'narrow'], ['torii', 'woodsrest', 'narrow'], ['torii', 'mountpath', 'narrow'], ['mountpath', 'skyland', 'narrow'], ['well', 'hut', 'narrow'], ['hut', 'windmill', 'narrow'], ['hut', 'farfield'], ['farfield', 'oldtree'], ['windmill', 'farfield', 'narrow'], ['windmill', 'pond', 'secret'], ['woodsrest', 'oldtree', 'narrow'], ['torii', 'mossrock', 'secret'], ['orchard2', 'orchardhut', 'secret'], ['stepstone', 'riverislet', 'secret']] },
      // もり: めいろ型を ひろげた もの。11の 地区が つづき、あるいて いるうちに 景色が なんども かわる。
      // あかるいもり → おがわ → こだちの めいろ → しだの くぼち → キノコの もり → ふかい もり →
      // いしの もり → おおきな き → たきの たに → ふるい もり → もりの おく。
      // 地区ごとに「ばしょを おぼえる めじるし」を 1つ おく(まるたのはし・たおれた き・石づみ・
      // ねもとの トンネル・ねじれた たいぼく など)。おくへ いくほど 人が へり、ふるいもり は ほぼ 無人
      forest: { len: 7900, halfW: 2900, ground: ['#7fb26b', '#57894e'], path: '#b7a27a', props: ['🌲', '🌲', '🌳', '🍄', '🌿', '🌰', '🪵', '🍂'],
        zones: [Z('bright', 'あかるいもり', { light: 1.04, walls: 0.75, frameScale: 0.85, hero: ['springpool', 300], anim: 'leaves' }), Z('creek', 'おがわのあたり', { tint: '#7fb8a0', walls: 0.9, frameScale: 0.9, hero: ['woodbridge', 340], anim: 'water' }), Z('thicket', 'にたようなこだち', { light: 0.88, fog: 0.16, walls: 1.4, frameScale: 1.1, hero: ['cairn', 280], anim: 'leaves', open: 0.95 }), Z('fern', 'しだのくぼち', { light: 0.92, fog: 0.12, tint: '#6d8f62', walls: 1.15, frame: 'mistwood', frameScale: 0.92, field: ['🌿', '🌿', '🍂'], hero: ['log', 300], anim: 'leaves', open: 0.97, lane: ['🌿', '🍂', '🪵', '🌿'] }), Z('mushroom', 'キノコのもり', { light: 0.8, fog: 0.24, tint: '#5f6f8f', walls: 0.55, frameScale: 0.8, marks: { color: '#9ad0ff', kind: 'sparkle' }, field: ['🍄', '🍄', '🌿'], hero: ['mushroomgrove', 300], anim: 'glow', lane: ['🍄', '🍄', '✨', '🌿'] }), Z('deep', 'ふかいもり', { light: 0.68, fog: 0.4, tint: '#3f5a40', walls: 1.5, frameScale: 1.25, hero: ['oldpost', 300], anim: 'mist', open: 0.93, lane: ['🌿', '🪨', '🍄', '🌱'] }), Z('stone', 'いしのもり', { light: 0.9, fog: 0.14, tint: '#7a8574', walls: 0.7, frame: 'bigrock', frameScale: 1.3, field: ['🪨', '🪨', '🌿'], hero: ['stonestack', 260], anim: 'motes', open: 1.08, lane: ['🪨', '🌿', '🪨', '🍂'] }), Z('great', 'おおきなきのまわり', { light: 0.85, fog: 0.2, tint: '#5a7a4a', walls: 0.35, anim: 'leaves', open: 1.06 }), Z('fallsvale', 'たきのたに', { light: 0.95, fog: 0.18, tint: '#6aa0a0', walls: 0.6, frame: 'riverwood', frameScale: 1.0, field: ['🌿', '🪨', '🌿'], anim: 'water', open: 1.1, lane: ['💧', '🌿', '🪨', '🌿'] }), Z('ancient', 'ふるいもり', { light: 0.6, fog: 0.45, tint: '#4a4038', walls: 1.6, frameScale: 1.45, field: ['🪵', '🍄', '🪨'], hero: ['stump', 280], anim: 'mist', open: 0.9, marks: { color: '#7a6a4a', kind: 'tuft' }, lane: ['🪵', '🍄', '🌿', '🪨'] }), Z('heart', 'もりのおくのおく', { light: 0.82, fog: 0.26, tint: '#4f7f6a', walls: 0.4, frameScale: 1.1, field: ['✨', '🌿', '🍄'], hero: ['glowglade', 330], anim: 'glow', open: 1.12, marks: { color: '#bfe8ff', kind: 'sparkle' }, lane: ['✨', '🌿', '✨', '🍄'] })],
        spots: [sp('entry', 'もりのいりぐち', 0, 250, 200, 'plaza', 4, { zone: 'bright' }), sp('bright1', 'あかるいこみち', 0, 800, 220, 'path', 7, { hub: true, zone: 'bright' }), sp('bright2', 'ひだまり', -700, 1150, 240, 'plaza', 9, { prop: '🪵', zone: 'bright' }), sp('bright3', 'きのねっこ', 750, 1200, 180, 'grove', 5, { zone: 'bright' }), sp('sunspot', 'こもれびのひろば', -1500, 800, 200, 'plaza', 8, { prop: '🌼', zone: 'bright' }), sp('creek1', 'おがわ', -1800, 1700, 200, 'water', 4, { prop: '💧', zone: 'creek' }), sp('shallow', 'せせらぎ', -2400, 1900, 170, 'water', 1, { zone: 'creek' }), sp('bridge1', 'まるたのはし', -1500, 2200, 150, 'path', 0, { prop: '🌉', zone: 'creek' }), sp('creek2', 'おがわのふち', -2200, 2600, 180, 'water', 2, { zone: 'creek' }), sp('creekdeep', 'おがわのおく', -2300, 3250, 160, 'water', 0, { zone: 'creek' }), sp('bridge2', 'いしのはし', -600, 2500, 150, 'path', 0, { prop: '🌉', zone: 'creek' }), sp('hiddenpond', 'かくれたいけ', -2650, 2350, 130, 'water', 1, { secret: true, zone: 'creek' }), sp('thicket1', 'にたようなこだち', 0, 1550, 150, 'path', 0, { zone: 'thicket' }), sp('thicket2', 'にたようなこだち', 600, 2100, 150, 'path', 0, { zone: 'thicket' }), sp('thicket3', 'まよいのわかれみち', -250, 2150, 150, 'path', 0, { zone: 'thicket' }), sp('thicket4', 'にたようなこだち', 300, 2650, 150, 'path', 0, { zone: 'thicket' }), sp('fork', 'みつまた', 0, 3000, 200, 'plaza', 7, { prop: '🪧', zone: 'thicket' }), sp('hollow', 'きのうろ', 1400, 1800, 160, 'shelter', 4, { prop: '🌳', zone: 'thicket' }), sp('rest', 'きゅうけいばしょ', 1600, 2500, 160, 'rest', 7, { prop: '🪵', zone: 'thicket' }), sp('fern1', 'しだのくぼち', 1900, 3100, 200, 'grove', 2, { zone: 'fern' }), sp('fern2', 'たおれたきのはし', 2350, 3600, 160, 'path', 0, { prop: '🪵', zone: 'fern' }), sp('fern3', 'しだのおくみち', 1500, 3700, 150, 'path', 0, { zone: 'fern' }), sp('fernlook', 'くぼちのみはらし', 2650, 2950, 170, 'edge', 1, { cam: 'wide', zone: 'fern' }), sp('mushpath', 'キノコへのみち', -950, 3050, 150, 'path', 0, { zone: 'mushroom' }), sp('mush1', 'ひかるキノコ', -1300, 3600, 220, 'grove', 4, { landmark: 'glowmushroom', lmTier: 2, zone: 'mushroom' }), sp('mush2', 'キノコのこみち', -2000, 3950, 170, 'grove', 2, { prop: '🍄', zone: 'mushroom' }), sp('mush3', 'キノコのわ', -800, 4200, 180, 'grove', 2, { prop: '🍄', zone: 'mushroom' }), sp('deep1', 'ふかいもり', 400, 3900, 220, 'grove', 1, { zone: 'deep' }), sp('deep2', 'こけのいわ', 1100, 3800, 160, 'rest', 1, { prop: '🪨', zone: 'deep' }), sp('deep3', 'くらいこみち', 800, 4500, 150, 'path', 0, { zone: 'deep' }), sp('oldsign', 'ふるいひょうしき', 200, 4600, 150, 'path', 0, { prop: '🪧', zone: 'deep' }), sp('nook', 'こけむしたくぼみ', 1750, 4300, 130, 'rest', 1, { secret: true, zone: 'deep' }), sp('stone1', 'いしづみのもり', 1600, 5000, 200, 'grove', 2, { zone: 'stone' }), sp('stone2', 'おおきないわ', 2200, 4700, 170, 'rest', 1, { prop: '🪨', zone: 'stone' }), sp('stone3', 'いわのあいだ', 2000, 5500, 150, 'path', 0, { zone: 'stone' }), sp('stonelook', 'いわばのみはらし', 2600, 5250, 160, 'edge', 1, { cam: 'wide', zone: 'stone', view: ['ledgerock', 'bigrock'] }), sp('stoneedge', 'いわばのはずれ', 1200, 5800, 150, 'path', 0, { zone: 'stone' }), sp('greatroot', 'ねもとのトンネル', -400, 5100, 170, 'path', 0, { cam: 'narrow', zone: 'great' }), sp('great', 'おおきなき', 0, 5600, 240, 'edge', 6, { landmark: 'bigtree', lmTier: 1, cam: 'wide', zone: 'great' }), sp('greatglade', 'きのしたのひろば', 500, 6000, 220, 'plaza', 7, { zone: 'great' }), sp('fallspath', 'たきへのみち', -1000, 5300, 150, 'path', 0, { zone: 'fallsvale' }), sp('falls', 'たき', -1500, 5700, 200, 'water', 2, { landmark: 'waterfall', lmTier: 1, zone: 'fallsvale' }), sp('fallspool', 'たきつぼ', -1900, 6100, 180, 'water', 1, { zone: 'fallsvale' }), sp('fallslook', 'たきのみはらし', -2200, 5500, 160, 'edge', 1, { cam: 'wide', zone: 'fallsvale' }), sp('anc1', 'ふるいもり', -300, 6400, 200, 'grove', 0, { zone: 'ancient' }), sp('anc2', 'こけのかいだん', 600, 6700, 160, 'path', 0, { prop: '🪨', zone: 'ancient' }), sp('anc3', 'ねじれたたいぼく', -1100, 6800, 180, 'grove', 1, { prop: '🌳', zone: 'ancient' }), sp('anc4', 'しずかなくぼち', -300, 7000, 170, 'rest', 0, { zone: 'ancient' }), sp('heart', 'もりのしんぞう', 0, 7600, 240, 'edge', 1, { cam: 'wide', zone: 'heart' }), sp('hearthidden', 'ひかりのすきま', -750, 7500, 130, 'grove', 1, { secret: true, zone: 'heart' })],
        paths: [['entry', 'bright1', 'wide'], ['bright1', 'bright2'], ['bright1', 'bright3'], ['bright1', 'thicket1'], ['bright2', 'sunspot'], ['sunspot', 'creek1'], ['bright2', 'creek1', 'narrow'], ['creek1', 'shallow', 'narrow'], ['creek1', 'bridge1'], ['shallow', 'creek2', 'narrow'], ['bridge1', 'creek2', 'narrow'], ['bridge1', 'thicket3', 'narrow'], ['bridge1', 'hiddenpond', 'secret'], ['creek2', 'creekdeep', 'narrow'], ['creekdeep', 'mush2', 'narrow'], ['thicket3', 'bridge2', 'narrow'], ['bridge2', 'fork', 'narrow'], ['bridge2', 'mushpath', 'narrow'], ['thicket1', 'thicket2', 'narrow'], ['thicket1', 'thicket3', 'narrow'], ['thicket2', 'thicket3', 'narrow'], ['thicket2', 'thicket4', 'narrow'], ['thicket3', 'thicket4', 'narrow'], ['thicket4', 'fork', 'narrow'], ['bright3', 'hollow'], ['hollow', 'rest'], ['rest', 'thicket2', 'narrow'], ['rest', 'fern1'], ['fork', 'deep1'], ['fern1', 'fernlook'], ['fern1', 'fern2'], ['fern1', 'fern3'], ['fern2', 'fern3', 'narrow'], ['fern3', 'deep2', 'narrow'], ['fern2', 'stone2'], ['mushpath', 'mush1'], ['mush2', 'mush1', 'narrow'], ['mush1', 'mush3'], ['mush3', 'oldsign', 'narrow'], ['mush3', 'fallspath', 'narrow'], ['deep1', 'deep2', 'narrow'], ['deep1', 'deep3'], ['deep2', 'deep3', 'narrow'], ['deep3', 'oldsign'], ['deep1', 'oldsign'], ['deep2', 'nook', 'secret'], ['deep3', 'stone1'], ['oldsign', 'greatroot'], ['stone1', 'stone2'], ['stone2', 'stonelook'], ['stone1', 'stone3'], ['stone3', 'stonelook', 'narrow'], ['stone3', 'stoneedge'], ['stoneedge', 'greatglade'], ['nook', 'stone2', 'secret'], ['greatroot', 'great'], ['great', 'greatglade'], ['greatglade', 'anc2'], ['great', 'anc1'], ['greatroot', 'fallspath'], ['fallspath', 'falls'], ['falls', 'fallspool'], ['falls', 'fallslook', 'narrow'], ['fallslook', 'fallspool', 'narrow'], ['fallspool', 'anc3'], ['anc1', 'anc2'], ['anc1', 'anc3'], ['anc3', 'anc4'], ['anc2', 'anc4'], ['anc4', 'heart'], ['heart', 'hearthidden', 'secret'], ['anc3', 'hearthidden', 'secret']] },
      // やま: ながい とざんどう型。ふもと → やまの しゅうらく → やまみち → たにあい → キャンプ →
      // たきみち → おね → やまの みずうみ → がんかいの みち → ちょうじょう と、10地区ぶんの ぼりを つづける。
      // たかく なるほど 木が へり きりが ふえ、あるいてきた した の ほうが みえる
      mountain: { len: 9000, halfW: 2000, ground: ['#9a9585', '#736f60'], path: '#c2b79c', props: ['🌲', '🥾', '🏕️', '🪧', '🌲', '🥾', '🌲', '🪧'],
        zones: [Z('foot', 'ふもと', { crowd: 2.4, tint: '#9fbf7a', frame: 'pinewall', walls: 0.9, hero: ['guardpost', 300], anim: 'leaves' }), Z('village', 'やまのしゅうらく', { crowd: 1.8, light: 0.97, tint: '#8fae78', walls: 1.0, frame: 'pinewall', frameScale: 0.9, hero: ['house', 340], field: ['🏚️', '🪵', '🌲'], anim: 'leaves', lane: ['🪵', '🪧', '🌿', '🏚️'] }), Z('lower', 'やまみち', { crowd: 1.0, walls: 1.1, hero: ['oldpost', 300], anim: 'leaves', open: 0.95 }), Z('gorge', 'たにあい', { crowd: 0.6, light: 0.74, fog: 0.18, tint: '#5f6a68', walls: 1.7, frame: 'cliffwall', frameScale: 1.45, hero: ['ropebridge', 380], field: ['🪨', '🌿', '🪨'], anim: 'water', open: 0.88, lane: ['🪨', '💧', '🪨', '🌿'] }), Z('middle', 'キャンプのあたり', { crowd: 1.4, light: 0.98, tint: '#a9a88f', walls: 0.7, frame: 'pinewall', hero: ['tent', 320], anim: 'leaves' }), Z('falls', 'たきみち', { crowd: 0.7, light: 0.95, fog: 0.2, tint: '#7aa39e', walls: 0.8, frame: 'cliffwall', frameScale: 1.1, field: ['💧', '🪨', '🌿'], anim: 'water', open: 1.02, lane: ['💧', '🌿', '🪨', '💧'] }), Z('upper', 'おねのうえ', { crowd: 0.7, light: 1.04, fog: 0.12, tint: '#b8bcae', walls: 0.75, frameScale: 1.15, hero: ['cairn', 320], anim: 'mist', open: 1.06, lane: ['🌼', '🥾', '🌼', '🥾'] }), Z('lake', 'やまのみずうみ', { crowd: 0.6, light: 1.0, fog: 0.14, tint: '#93aab4', walls: 0.55, frameScale: 1.0, hero: ['bigrock', 350], field: ['💧', '🪨', '🌿'], anim: 'water', open: 1.05 }), Z('rocks', 'がんかいのみち', { crowd: 0.4, light: 1.06, fog: 0.2, tint: '#bcbbb0', walls: 1.0, frame: 'bigrock', frameScale: 1.3, hero: ['stonestack', 320], field: ['🪨', '🪨', '⛰️'], anim: 'motes', open: 1.0, marks: { color: '#9a978c', kind: 'tuft' } }), Z('summit', 'ちょうじょう', { crowd: 0.5, light: 1.08, fog: 0.26, tint: '#d0d3cc', walls: 0.3, frameScale: 0.9, anim: 'mist', open: 1.12 })],
        spots: [sp('foot', 'ふもと', 0, 250, 200, 'plaza', 1, { zone: 'foot' }), sp('trailhead', 'とざんぐち', 0, 800, 240, 'plaza', 7, { hub: true, prop: '🪧', zone: 'foot' }), sp('torii', 'とざんどうのとりい', -500, 1150, 160, 'path', 1, { prop: '⛩️', zone: 'foot' }), sp('mtvillage', 'やまのしゅうらく', -1100, 1500, 220, 'plaza', 6, { prop: '🏚️', zone: 'village' }), sp('teahouse', 'ちゃや', -1500, 2000, 170, 'shelter', 3, { prop: '🛖', zone: 'village' }), sp('spring', 'おんせん', -900, 2200, 200, 'water', 6, { prop: '♨️', zone: 'village' }), sp('steps', 'いしだん', 350, 1300, 150, 'path', 0, { zone: 'lower' }), sp('sw1', 'おりかえし', -450, 1750, 150, 'path', 1, { zone: 'lower' }), sp('lookout1', 'いちのてんぼう', 1050, 1550, 170, 'edge', 1, { cam: 'wide', zone: 'lower', view: ['telescope', 'fern'] }), sp('sw2', 'おりかえし', 700, 2100, 150, 'path', 1, { zone: 'lower' }), sp('boulder', 'みちのおおいわ', -250, 2500, 170, 'rest', 1, { prop: '🪨', zone: 'lower' }), sp('gorge', 'たにあい', 1250, 2650, 180, 'path', 1, { prop: '🪨', zone: 'gorge' }), sp('ropebridge', 'つりばし', 1500, 3200, 160, 'path', 0, { prop: '🌉', zone: 'gorge' }), sp('gorgefall', 'たにのこたき', 900, 3450, 180, 'water', 2, { zone: 'gorge' }), sp('camp', 'キャンプ', 0, 3000, 240, 'shelter', 7, { prop: '🏕️', zone: 'middle' }), sp('woodpile', 'まきのおきば', -450, 3550, 150, 'rest', 2, { prop: '🪵', zone: 'middle' }), sp('cliff', 'がけのうえ', 800, 3750, 170, 'edge', 2, { prop: '🪨', zone: 'middle' }), sp('cave', 'かくれたどうくつ', 1350, 4150, 150, 'shelter', 1, { secret: true, prop: '🕳️', zone: 'middle' }), sp('fallspath', 'たきへのみち', -950, 3300, 150, 'path', 0, { zone: 'falls' }), sp('bigfalls', 'おおたき', -1400, 3900, 200, 'water', 2, { landmark: 'waterfall', lmTier: 1, zone: 'falls' }), sp('fallsrest', 'たきのベンチ', -1000, 4400, 160, 'rest', 1, { prop: '🪵', zone: 'falls' }), sp('fallscave', 'たきうらのくぼ', -1800, 4350, 140, 'rest', 1, { secret: true, zone: 'falls' }), sp('sw3', 'おりかえし', -400, 4200, 150, 'path', 1, { zone: 'upper' }), sp('ridgepath', 'おねのほそみち', 450, 4550, 150, 'path', 0, { zone: 'upper' }), sp('ridge', 'おね', 250, 5100, 220, 'plaza', 3, { prop: '🪨', zone: 'upper' }), sp('hut', 'やまごや', 900, 5550, 160, 'rest', 3, { prop: '🛖', zone: 'upper' }), sp('windnotch', 'かぜのきれめ', -300, 5550, 160, 'edge', 1, { cam: 'wide', zone: 'upper' }), sp('lake', 'やまのみずうみ', -950, 5000, 200, 'water', 2, { zone: 'lake' }), sp('lakeshore', 'みずうみのいわば', -1450, 5550, 180, 'path', 1, { prop: '🪨', zone: 'lake' }), sp('shrine', 'いしのほこら', -1250, 6150, 140, 'rest', 1, { secret: true, zone: 'lake' }), sp('scree', 'ざれば', -700, 6150, 170, 'path', 0, { zone: 'rocks' }), sp('rocks', 'がんかいのみち', 250, 6200, 180, 'path', 1, { prop: '🪨', zone: 'rocks' }), sp('cairnfield', 'ケルンのおか', 900, 6700, 200, 'plaza', 2, { prop: '🪨', zone: 'rocks' }), sp('snowpatch', 'のこりゆき', -350, 6900, 170, 'path', 0, { zone: 'rocks' }), sp('rockcave', 'いわのすきま', 1400, 7150, 140, 'rest', 1, { secret: true, prop: '🕳️', zone: 'rocks' }), sp('lastridge', 'さいごのおね', 0, 7500, 180, 'path', 1, { prop: '🪧', zone: 'summit' }), sp('eastpeak', 'ひがしのみね', 800, 7900, 180, 'edge', 1, { cam: 'wide', zone: 'summit' }), sp('summitshrine', 'ちょうじょうのほこら', -650, 8100, 160, 'rest', 1, { prop: '⛩️', zone: 'summit' }), sp('summit', 'ちょうじょう', 0, 8500, 220, 'edge', 3, { landmark: 'peak', lmTier: 1, cam: 'wide', zone: 'summit' })],
        paths: [['foot', 'trailhead', 'wide'], ['trailhead', 'torii'], ['trailhead', 'steps'], ['torii', 'mtvillage'], ['mtvillage', 'teahouse'], ['mtvillage', 'spring'], ['teahouse', 'spring', 'narrow'], ['torii', 'sw1', 'narrow'], ['sw1', 'spring', 'narrow'], ['steps', 'lookout1', 'narrow'], ['steps', 'sw2'], ['lookout1', 'sw2', 'narrow'], ['sw1', 'boulder'], ['boulder', 'camp'], ['boulder', 'spring', 'narrow'], ['sw2', 'camp'], ['sw2', 'gorge', 'narrow'], ['gorge', 'ropebridge', 'narrow'], ['ropebridge', 'gorgefall', 'narrow'], ['gorgefall', 'cliff', 'narrow'], ['gorge', 'cliff', 'narrow'], ['spring', 'fallspath', 'narrow'], ['camp', 'woodpile'], ['camp', 'cliff'], ['cliff', 'cave', 'secret'], ['woodpile', 'fallspath', 'narrow'], ['fallspath', 'bigfalls'], ['bigfalls', 'fallsrest'], ['bigfalls', 'fallscave', 'secret'], ['fallsrest', 'sw3', 'narrow'], ['woodpile', 'sw3'], ['cliff', 'ridgepath', 'narrow'], ['sw3', 'ridgepath', 'narrow'], ['sw3', 'lake'], ['ridgepath', 'ridge'], ['ridge', 'hut'], ['ridge', 'windnotch', 'narrow'], ['lake', 'lakeshore', 'narrow'], ['lakeshore', 'shrine', 'secret'], ['lake', 'windnotch', 'narrow'], ['windnotch', 'rocks'], ['hut', 'cairnfield', 'narrow'], ['ridge', 'rocks', 'narrow'], ['rocks', 'cairnfield'], ['rocks', 'snowpatch', 'narrow'], ['cairnfield', 'rockcave', 'secret'], ['lakeshore', 'scree', 'narrow'], ['scree', 'snowpatch', 'narrow'], ['scree', 'rocks', 'narrow'], ['snowpatch', 'lastridge'], ['cairnfield', 'lastridge', 'narrow'], ['lastridge', 'eastpeak', 'narrow'], ['lastridge', 'summitshrine', 'narrow'], ['lastridge', 'summit'], ['eastpeak', 'summit', 'narrow'], ['summitshrine', 'summit', 'narrow']] },
      // ゆきぐに: こうだいな せつげん型。ゆきはら → ロッジ → まつばやし / こおりの みずうみ →
      // ゆきの おんせん → げれんで → ふぶきの はら → ゆきやま。ふぶきの はら だけ きりが こく、
      // ゆきの ポール しか めじるしが ない(ここで すこし まよう ように する)
      snow: { len: 7600, halfW: 2500, ground: ['#eef4fb', '#d3e0ee'], path: '#c9d1df', props: ['❄️', '🪵', '🌲', '🧣', '🌲', '🛷', '🪵', '🌲'],
        zones: [Z('gate', 'ゆきのいりぐち', { crowd: 1.6, hero: ['oldpost', 280], anim: 'snow', open: 0.98 }), Z('field', 'ゆきはら', { crowd: 4.0, light: 1.05, walls: 0.3, hero: ['snowfence', 330], anim: 'snow', open: 1.07 }), Z('lodge', 'ロッジのあたり', { crowd: 2.4, light: 0.98, tint: '#e2e7ee', walls: 0.75, frame: 'pinewall', frameScale: 0.9, hero: ['firewood', 290], field: ['🪵', '🧣', '🌲'], anim: 'snow', lane: ['🪵', '🧣', '🛷', '🌲'] }), Z('woods', 'まつばやし', { crowd: 0.5, light: 0.9, fog: 0.14, walls: 1.45, frame: 'pinewall', hero: ['log', 330], field: ['🌲', '🌲', '🪵'], anim: 'leaves', open: 0.94 }), Z('lake', 'こおりのみずうみ', { crowd: 0.7, tint: '#dbe9f5', walls: 0.35, fog: 0.08, hero: ['icepillar', 350], anim: 'motes', open: 1.06 }), Z('hotspring', 'ゆきのおんせん', { crowd: 1.1, light: 0.96, fog: 0.3, tint: '#cfd8dc', walls: 0.7, frameScale: 0.95, hero: ['springpool', 370], field: ['💧', '🪨', '🌲'], anim: 'mist', open: 1.0, lane: ['🪨', '💧', '🪵', '🪨'] }), Z('slope', 'げれんで', { crowd: 0.9, light: 1.08, tint: '#eef4fb', walls: 0.5, frameScale: 1.05, hero: ['guardpost', 300], field: ['🎿', '🛷', '❄️'], anim: 'snow', open: 1.08 }), Z('blizzard', 'ふぶきのはら', { crowd: 0.3, light: 1.0, fog: 0.48, tint: '#e6edf6', walls: 0.2, frameScale: 0.8, hero: ['cairn', 310], field: ['❄️', '❄️', '🪧'], anim: 'snow', open: 1.12, marks: { color: '#cfe0f0', kind: 'tuft' } }), Z('peak', 'ゆきやまのふもと', { crowd: 0.4, fog: 0.24, light: 1.02, walls: 0.7, frameScale: 1.35, anim: 'snow', open: 1.05 })],
        spots: [sp('gate', 'ゆきのいりぐち', 0, 250, 200, 'plaza', 1, { zone: 'gate' }), sp('field', 'ゆきはら', 0, 900, 300, 'plaza', 9, { hub: true, prop: '🛷', zone: 'field' }), sp('snowman', 'ゆきだるまのおか', 900, 1300, 220, 'plaza', 5, { prop: '🧣', zone: 'field' }), sp('sled', 'そりのさか', 450, 1750, 150, 'path', 1, { prop: '🛷', zone: 'field' }), sp('tracks', 'あしあとのみち', -550, 1750, 150, 'path', 1, { zone: 'field' }), sp('snowfield2', 'ひろいゆきはら', 1450, 2000, 260, 'plaza', 2, { zone: 'field' }), sp('lodge', 'ロッジ', -1000, 1200, 200, 'rest', 7, { landmark: 'lodge', lmTier: 1, zone: 'lodge' }), sp('lodgeback', 'ロッジのうら', -1550, 1700, 160, 'path', 1, { prop: '🪵', zone: 'lodge' }), sp('snowfence', 'ゆきがきのみち', -1250, 2300, 160, 'path', 0, { zone: 'lodge' }), sp('woodshed', 'まきごやのうら', -1950, 2100, 140, 'rest', 1, { secret: true, prop: '🪵', zone: 'lodge' }), sp('pines', 'まつばやし', 1450, 2650, 200, 'grove', 3, { prop: '🌲', zone: 'woods' }), sp('birch', 'しらかばのみち', 2050, 2750, 160, 'path', 0, { zone: 'woods' }), sp('deertrack', 'しかのあしあと', 1100, 3300, 150, 'path', 0, { zone: 'woods' }), sp('woods2', 'まつばやしのおく', 1900, 3300, 180, 'grove', 2, { prop: '🌲', zone: 'woods' }), sp('cave', 'ゆきのどうくつ', 1700, 3900, 150, 'shelter', 1, { secret: true, prop: '🕳️', zone: 'woods' }), sp('icelake', 'こおりのみずうみ', -1200, 3050, 240, 'water', 3, { prop: '🧊', zone: 'lake' }), sp('icecrack', 'こおりのわれめ', -2000, 3150, 150, 'path', 0, { zone: 'lake' }), sp('igloo', 'かまくら', -550, 3500, 160, 'shelter', 2, { prop: '🛖', zone: 'lake' }), sp('fishing', 'こおりのつりば', -1700, 3750, 160, 'water', 2, { prop: '🎣', zone: 'lake' }), sp('lakehut', 'こおりのつりごや', -1400, 4300, 150, 'shelter', 1, { zone: 'lake' }), sp('hotspring', 'ゆきのおんせん', -300, 4350, 220, 'water', 4, { prop: '♨️', zone: 'hotspring' }), sp('hsrest', 'ゆげのベンチ', -900, 4800, 150, 'rest', 2, { prop: '🪵', zone: 'hotspring' }), sp('steam', 'ゆげのみち', 250, 4850, 160, 'path', 1, { zone: 'hotspring' }), sp('slopefoot', 'げれんでのふもと', 1500, 3950, 170, 'path', 1, { prop: '🎿', zone: 'slope' }), sp('slope', 'げれんで', 1200, 4600, 200, 'path', 2, { prop: '🎿', zone: 'slope' }), sp('lift', 'リフトのりば', 1700, 5250, 160, 'rest', 2, { prop: '🎿', zone: 'slope' }), sp('slopetop', 'げれんでのうえ', 1500, 5900, 180, 'edge', 1, { cam: 'wide', zone: 'slope', deco: ['snowfence', 'oldpost'] }), sp('marker1', 'ゆきのポール', -800, 5700, 150, 'path', 0, { prop: '🪧', zone: 'blizzard' }), sp('blizzard', 'ふぶきのはら', 0, 5500, 240, 'plaza', 1, { zone: 'blizzard' }), sp('marker2', 'ゆきのポール', 700, 6100, 150, 'path', 0, { prop: '🪧', zone: 'blizzard' }), sp('lost', 'ゆきにうまったこや', 1350, 6400, 140, 'rest', 1, { secret: true, zone: 'blizzard' }), sp('peakfoot', 'ゆきやまのふもと', 0, 6450, 200, 'path', 1, { zone: 'peak' }), sp('icecave', 'こおりのどうくつ', -1100, 6700, 140, 'rest', 1, { secret: true, prop: '🕳️', zone: 'peak' }), sp('eastslope', 'ひがしのゆきしゃめん', 800, 6950, 170, 'path', 0, { zone: 'peak' }), sp('peak', 'ゆきやま', 0, 7100, 220, 'edge', 2, { landmark: 'peak', lmTier: 1, cam: 'wide', zone: 'peak', deco: ['firewood', 'log'] })],
        paths: [['gate', 'field', 'wide'], ['field', 'snowman'], ['field', 'sled'], ['field', 'tracks', 'narrow'], ['field', 'lodge'], ['snowman', 'snowfield2'], ['sled', 'snowfield2', 'narrow'], ['sled', 'snowman', 'narrow'], ['lodge', 'lodgeback'], ['lodge', 'snowfence', 'narrow'], ['lodgeback', 'snowfence', 'narrow'], ['lodgeback', 'woodshed', 'secret'], ['tracks', 'snowfence', 'narrow'], ['snowfence', 'icelake'], ['snowfield2', 'pines'], ['pines', 'birch', 'narrow'], ['pines', 'deertrack', 'narrow'], ['pines', 'woods2'], ['birch', 'woods2', 'narrow'], ['woods2', 'cave', 'secret'], ['deertrack', 'woods2', 'narrow'], ['icelake', 'icecrack', 'narrow'], ['icelake', 'igloo'], ['icelake', 'fishing', 'narrow'], ['fishing', 'lakehut', 'narrow'], ['icecrack', 'fishing', 'narrow'], ['igloo', 'hotspring'], ['lakehut', 'hsrest', 'narrow'], ['hotspring', 'hsrest'], ['hotspring', 'steam'], ['deertrack', 'slopefoot', 'narrow'], ['slopefoot', 'slope'], ['steam', 'slope', 'narrow'], ['slope', 'lift'], ['lift', 'slopetop'], ['woods2', 'slopefoot', 'narrow'], ['steam', 'blizzard'], ['hsrest', 'marker1', 'narrow'], ['marker1', 'blizzard', 'narrow'], ['blizzard', 'marker2', 'narrow'], ['slopetop', 'marker2', 'narrow'], ['marker2', 'lost', 'secret'], ['blizzard', 'peakfoot'], ['marker1', 'peakfoot', 'narrow'], ['peakfoot', 'icecave', 'secret'], ['peakfoot', 'peak'], ['marker2', 'eastslope', 'narrow'], ['eastslope', 'peak', 'narrow']] },
      // うみ: ながい かいがんせん型。すなはま → しおだまり → さんばし → いりえ → いわば → みなと →
      // すなおか → みさき → かいしょくどうくつ → はての はま。みずぎわは スポットの そとがわを なぞるので、
      // あるくほど うみが ちかづいたり とおのいたり する
      sea: { len: 8000, halfW: 2500, ground: ['#f2e2b6', '#e2cf9a'], path: '#f7ecc9', props: ['🐚', '⛵', '🌴', '⛱️', '🌴', '🐚', '🌴', '⛱️'],
        zones: [Z('beach', 'すなはま', { crowd: 2.6, light: 1.05, walls: 0.45, hero: ['parasol', 300], anim: 'water', open: 1.07 }), Z('tidepools', 'しおだまりのあたり', { crowd: 2.0, tint: '#e8dcb0', walls: 0.6, hero: ['rockpool', 300], anim: 'water' }), Z('pier', 'さんばしのあたり', { crowd: 1.6, walls: 0.45, hero: ['pier', 360], anim: 'water', open: 1.04 }), Z('bay', 'いりえ', { crowd: 1.0, light: 0.98, tint: '#cfd9b0', walls: 0.85, frame: 'palmgrove', frameScale: 1.05, hero: ['driftwood', 320], field: ['🐚', '🌴', '🪵'], anim: 'water', open: 0.98, lane: ['🐚', '🌿', '🪵', '🐚'] }), Z('rocks', 'いわば', { crowd: 0.8, tint: '#c8bfa8', walls: 1.1, frame: 'searock', hero: ['bigrock', 360], field: ['🐚', '🐚', '🪸'], anim: 'water', lane: ['🐚', '🪸', '🐚', '⛱️'] }), Z('port', 'みなと', { crowd: 1.5, light: 1.0, tint: '#bfb49a', walls: 0.95, frame: 'farmhouse', frameScale: 0.85, hero: ['wreck', 380], field: ['⛵', '⚓', '🐚'], anim: 'water', open: 1.0, lane: ['⛵', '⚓', '🪵', '🐚'] }), Z('dunes', 'すなおか', { crowd: 0.5, light: 1.08, tint: '#e6d3a0', walls: 0.75, frame: 'duneridge', frameScale: 1.25, hero: ['sandcrest', 360], field: ['🌴', '🐚', '⛱️'], anim: 'sand', open: 1.1 }), Z('cape', 'みさき', { crowd: 0.6, light: 1.02, fog: 0.15, walls: 0.8, frame: 'seacliff', frameScale: 1.2, anim: 'water', open: 1.06 }), Z('seacave', 'かいしょくどうくつ', { crowd: 0.4, light: 0.72, fog: 0.28, tint: '#8f8f88', walls: 1.55, frame: 'seacliff', frameScale: 1.4, hero: ['searock', 380], field: ['🪨', '🐚', '🪨'], anim: 'water', open: 0.88, lane: ['🪨', '🐚', '💧', '🪨'] }), Z('far', 'はてのはま', { crowd: 0.35, light: 1.06, fog: 0.18, tint: '#efdcae', walls: 0.35, frameScale: 0.95, hero: ['driftwood', 340], field: ['🐚', '🪵', '🐚'], anim: 'water', open: 1.12 })],
        spots: [sp('beach', 'すなはま', 340, 250, 240, 'plaza', 2, { zone: 'beach' }), sp('shore', 'なみうちぎわ', 340, 800, 300, 'plaza', 9, { hub: true, prop: '🌊', zone: 'beach' }), sp('parasols', 'パラソルのならび', 820, 1150, 200, 'plaza', 5, { prop: '⛱️', zone: 'beach' }), sp('tidepool', 'しおだまり', -20, 1050, 220, 'water', 6, { prop: '🪸', zone: 'tidepools' }), sp('shells', 'かいがらのはま', 30, 1650, 200, 'plaza', 2, { prop: '🐚', zone: 'tidepools' }), sp('cove', 'かくれたいりえ', -290, 1500, 140, 'water', 1, { secret: true, zone: 'tidepools' }), sp('pier', 'さんばし', 620, 1400, 200, 'path', 2, { prop: '⛵', zone: 'pier' }), sp('boats', 'ふねのふとう', 950, 1750, 170, 'rest', 2, { prop: '⛵', zone: 'pier' }), sp('hut', 'うみのいえ', 520, 1950, 200, 'shelter', 5, { prop: '🏚️', zone: 'pier' }), sp('bayhead', 'いりえのおく', 150, 2400, 220, 'water', 3, { zone: 'bay' }), sp('baywalk', 'いりえのみち', 720, 2700, 170, 'path', 1, { prop: '🌴', zone: 'bay' }), sp('sandbar', 'すなす', 450, 3100, 150, 'path', 0, { zone: 'bay' }), sp('oysters', 'かきのいわ', -150, 3000, 180, 'water', 2, { prop: '🐚', zone: 'bay' }), sp('palmcove', 'ヤシのかくれはま', 1050, 3150, 140, 'rest', 1, { secret: true, prop: '🌴', zone: 'bay' }), sp('rocks', 'いわば', 450, 3550, 220, 'grove', 2, { prop: '🪨', zone: 'rocks' }), sp('rockpool', 'いわばのしおだまり', 120, 3900, 180, 'water', 2, { zone: 'rocks' }), sp('rockarch', 'いわのアーチ', 900, 3850, 190, 'edge', 1, { cam: 'wide', zone: 'rocks', deco: ['arch:rock'] }), sp('nets', 'あみのおきば', 1400, 3700, 160, 'rest', 2, { prop: '🐚', zone: 'port' }), sp('port', 'みなと', 1100, 4200, 240, 'plaza', 7, { prop: '⛵', zone: 'port' }), sp('fishmarket', 'さかないちば', 1100, 4800, 180, 'shop', 6, { prop: '🏚️', zone: 'port' }), sp('warehouse', 'そうこのまえ', 1650, 4550, 180, 'shelter', 3, { prop: '🏚️', zone: 'port' }), sp('breakwater', 'ぼうはてい', 620, 4700, 170, 'path', 1, { zone: 'port' }), sp('dunes', 'すなおか', 1950, 5000, 170, 'path', 1, { prop: '🌴', zone: 'dunes' }), sp('dunehollow', 'すなのくぼち', 1500, 5400, 170, 'path', 0, { zone: 'dunes' }), sp('dunetop', 'すなおかのうえ', 2200, 5600, 190, 'edge', 1, { cam: 'wide', zone: 'dunes' }), sp('cape', 'みさき', 900, 5550, 200, 'edge', 2, { zone: 'cape' }), sp('capepath', 'みさきのみち', 1250, 6150, 160, 'path', 1, { zone: 'cape' }), sp('lighthouse', 'とうだい', 1550, 6700, 220, 'edge', 2, { landmark: 'lighthouse', lmTier: 1, cam: 'wide', zone: 'cape' }), sp('seacave', 'かいしょくどうくつ', 400, 6200, 200, 'shelter', 2, { prop: '🪨', zone: 'seacave', mood: { light: -0.12, fog: 0.08, open: -0.15, tint: '#5f7f96' } }), sp('cliffcave', 'がけのどうくつ', 120, 6750, 140, 'rest', 1, { secret: true, zone: 'seacave' }), sp('echo', 'こだまのいわま', 650, 6900, 160, 'path', 0, { zone: 'seacave' }), sp('farbeach', 'はてのはま', 850, 7350, 240, 'plaza', 1, { zone: 'far' }), sp('endrock', 'さいはてのいわ', 350, 7600, 170, 'edge', 1, { cam: 'wide', zone: 'far' }), sp('driftbeach', 'ながれぎのはま', 1500, 7450, 180, 'rest', 1, { prop: '🪵', zone: 'far' }), sp('wreckboat', 'うちあげられたふね', 1950, 7150, 140, 'rest', 1, { secret: true, zone: 'far' })],
        paths: [['beach', 'shore', 'wide'], ['shore', 'tidepool'], ['shore', 'pier'], ['shore', 'parasols'], ['tidepool', 'cove', 'secret'], ['tidepool', 'shells'], ['parasols', 'pier', 'narrow'], ['pier', 'boats'], ['pier', 'hut'], ['boats', 'hut', 'narrow'], ['shells', 'hut', 'narrow'], ['hut', 'bayhead'], ['shells', 'bayhead', 'narrow'], ['bayhead', 'baywalk'], ['boats', 'baywalk', 'narrow'], ['bayhead', 'oysters', 'narrow'], ['baywalk', 'sandbar', 'narrow'], ['oysters', 'sandbar', 'narrow'], ['sandbar', 'palmcove', 'secret'], ['sandbar', 'rocks'], ['oysters', 'rockpool', 'narrow'], ['rocks', 'rockpool', 'narrow'], ['rocks', 'rockarch', 'narrow'], ['rockarch', 'nets', 'narrow'], ['rocks', 'nets', 'narrow'], ['nets', 'port'], ['port', 'fishmarket'], ['port', 'warehouse'], ['warehouse', 'dunes', 'narrow'], ['port', 'breakwater', 'narrow'], ['rockpool', 'breakwater', 'narrow'], ['fishmarket', 'breakwater', 'narrow'], ['dunes', 'dunehollow', 'narrow'], ['dunes', 'dunetop', 'narrow'], ['dunehollow', 'dunetop', 'narrow'], ['fishmarket', 'cape'], ['dunehollow', 'cape', 'narrow'], ['cape', 'capepath'], ['capepath', 'lighthouse'], ['dunetop', 'lighthouse', 'narrow'], ['cape', 'seacave', 'narrow'], ['seacave', 'cliffcave', 'secret'], ['seacave', 'echo', 'narrow'], ['echo', 'capepath', 'narrow'], ['echo', 'farbeach'], ['farbeach', 'endrock', 'narrow'], ['lighthouse', 'driftbeach', 'narrow'], ['farbeach', 'driftbeach', 'narrow'], ['driftbeach', 'wreckboat', 'secret']] },
      // しんかい: ふかく なるほど くらく なる めいきゅう型。あさせの たな → サンゴの まち →
      // こんぶの もり / ちんぼつせん → ひかる ふかば → かいていの いせき / ねっすいこう →
      // かいこう → ふかい やみ。あかりと おおきな シルエットだけが めじるしに なる
      deepsea: { len: 7800, halfW: 2200, ground: ['#1c4166', '#102743'], path: '#1c3c5e', props: ['🪸', '🌿', '🪸', '⚓', '🐚', '🌿', '🪸', '⚓'],
        zones: [Z('shelf', 'あさせのたな', { crowd: 1.8, light: 1.1, tint: '#2e6a8f', walls: 0.5, field: ['🪸', '🐚', '🫧'], hero: ['coralfan', 310], anim: 'motes', open: 1.06 }), Z('reef', 'サンゴのまち', { crowd: 2.6, light: 1.05, field: ['🪸', '🪸', '🐚'], anim: 'motes' }), Z('kelp', 'こんぶのもり', { crowd: 1.1, light: 0.8, fog: 0.25, walls: 1.5, tint: '#1e4a4a', frame: 'kelpwall', hero: ['kelp', 340], field: ['🌿', '🌿', '🫧'], anim: 'water', open: 0.95 }), Z('wreck', 'ちんぼつせんのあたり', { crowd: 1.2, light: 0.85, walls: 1.0, tint: '#2c3f58', hero: ['wreck', 420], anim: 'glow' }), Z('glow', 'ひかるふかば', { crowd: 1.0, light: 0.9, tint: '#274f7a', walls: 0.7, hero: ['glowgarden', 320], anim: 'glow', marks: { color: '#9fe8ff', kind: 'sparkle' } }), Z('ruins', 'かいていのいせき', { crowd: 0.6, light: 0.74, fog: 0.3, tint: '#39506a', walls: 1.0, frame: 'ruinwall', frameScale: 0.9, hero: ['ruingate', 400], field: ['🏛️', '🪸', '🌿'], anim: 'motes', open: 0.94, lane: ['🏛️', '🪸', '🫧', '🌿'] }), Z('vents', 'ねっすいこう', { crowd: 0.5, light: 0.78, fog: 0.22, tint: '#4a3a48', walls: 1.0, frameScale: 1.1, hero: ['vent', 330], field: ['🫧', '🪨', '🫧'], anim: 'water', open: 1.0, marks: { color: '#c88a7a', kind: 'tuft' } }), Z('trench', 'かいこう', { crowd: 0.4, light: 0.6, fog: 0.4, tint: '#0d1c33', walls: 1.3, frameScale: 1.25, hero: ['ruinpillar', 350], anim: 'motes', open: 1.04 }), Z('abyss', 'ふかいやみ', { crowd: 0.3, light: 0.42, fog: 0.55, tint: '#060e1c', walls: 1.45, frameScale: 1.3, hero: ['glowcoral', 320], field: ['💡', '🫧', '💡'], anim: 'glow', open: 0.96, marks: { color: '#5ad8e8', kind: 'sparkle' } })],
        spots: [sp('reef', 'サンゴのいりぐち', 0, 250, 240, 'water', 5, { zone: 'shelf', mood: { light: 0.06, open: 0.2, tint: '#4f8fb8' } }), sp('shelfedge', 'たなのふち', -650, 700, 180, 'path', 3, { zone: 'shelf' }), sp('coralcity', 'サンゴのまち', 0, 900, 300, 'plaza', 9, { hub: true, landmark: 'coral', lmTier: 1, zone: 'reef' }), sp('coralgarden', 'サンゴのにわ', 750, 1400, 220, 'water', 6, { prop: '🪸', zone: 'reef' }), sp('coralcave', 'サンゴのすきま', -500, 1500, 150, 'path', 2, { zone: 'reef' }), sp('kelp1', 'こんぶのもり', -1050, 1500, 240, 'grove', 3, { prop: '🌿', zone: 'kelp' }), sp('kelp2', 'こんぶのおく', -1450, 2200, 200, 'grove', 2, { prop: '🌿', zone: 'kelp' }), sp('kelpclear', 'こんぶのきれま', -1600, 2800, 170, 'rest', 1, { zone: 'kelp' }), sp('kelpdeep', 'こんぶのめいろ', -900, 2800, 180, 'path', 0, { zone: 'kelp' }), sp('vent', 'あたたかいあな', -700, 3400, 200, 'rest', 3, { prop: '🫧', zone: 'kelp' }), sp('anchor', 'おおきないかり', 1300, 1400, 150, 'rest', 1, { prop: '⚓', zone: 'wreck' }), sp('wreck', 'ちんぼつせん', 1000, 1900, 220, 'shelter', 6, { prop: '⚓', zone: 'wreck' }), sp('deck', 'かたむいたデッキ', 700, 2500, 170, 'path', 1, { zone: 'wreck' }), sp('cabin', 'せんちょうしつ', 1450, 2550, 170, 'rest', 2, { zone: 'wreck' }), sp('cavern', 'ふねのうらのどうくつ', 1650, 3200, 140, 'rest', 1, { secret: true, zone: 'wreck' }), sp('glow1', 'ひかるふかば', 0, 2200, 220, 'water', 3, { prop: '💡', zone: 'glow' }), sp('glow2', 'ひかりのにわ', 300, 3050, 220, 'water', 3, { prop: '💡', zone: 'glow' }), sp('glowpath', 'ひかりのこみち', -200, 3750, 160, 'path', 0, { zone: 'glow' }), sp('glowbig', 'おおきなひかりごけ', 850, 3850, 200, 'water', 2, { prop: '💡', zone: 'glow' }), sp('glowsecret', 'ひかりのかくれば', 500, 4350, 140, 'rest', 1, { secret: true, zone: 'glow' }), sp('pillars', 'しずんだはしら', -1150, 4200, 180, 'path', 1, { prop: '🏛️', zone: 'ruins' }), sp('ruins', 'かいていのいせき', -400, 4500, 240, 'plaza', 3, { prop: '🏛️', zone: 'ruins' }), sp('ruinhall', 'いせきのひろま', -950, 5000, 200, 'rest', 2, { zone: 'ruins' }), sp('ruinhidden', 'いせきのおくのま', -1650, 4800, 140, 'rest', 1, { secret: true, zone: 'ruins' }), sp('vents', 'ねっすいこう', 750, 4750, 200, 'water', 2, { prop: '🫧', zone: 'vents' }), sp('chimney', 'くろいえんとつ', 1250, 5350, 180, 'edge', 1, { zone: 'vents' }), sp('hotspring', 'かいていのおんせん', 1000, 5950, 150, 'rest', 2, { secret: true, zone: 'vents' }), sp('anglers', 'ちょうちんのみち', 0, 5500, 170, 'path', 1, { zone: 'trench' }), sp('trenchwall', 'かいこうのかべ', -650, 5950, 180, 'path', 0, { zone: 'trench' }), sp('trench', 'かいこうのふち', 250, 6200, 220, 'water', 2, { zone: 'trench' }), sp('ledge', 'いわだな', -350, 6750, 170, 'rest', 1, { zone: 'trench' }), sp('abyssgate', 'やみのいりぐち', 100, 6950, 180, 'path', 0, { zone: 'abyss' }), sp('lastlight', 'さいごのひかり', 750, 7200, 160, 'water', 1, { prop: '💡', zone: 'abyss' }), sp('abyss', 'いちばんふかいところ', 0, 7500, 200, 'deep', 1, { zone: 'abyss' })],
        paths: [['reef', 'shelfedge', 'narrow'], ['reef', 'coralcity', 'wide'], ['shelfedge', 'coralcity', 'narrow'], ['coralcity', 'coralgarden'], ['coralcity', 'coralcave', 'narrow'], ['coralcity', 'kelp1'], ['coralcave', 'kelp1', 'narrow'], ['kelp1', 'kelp2', 'narrow'], ['kelp2', 'kelpclear', 'narrow'], ['kelp2', 'kelpdeep', 'narrow'], ['kelpclear', 'vent', 'narrow'], ['kelpdeep', 'vent', 'narrow'], ['coralgarden', 'anchor', 'narrow'], ['anchor', 'wreck'], ['coralcity', 'wreck'], ['wreck', 'cabin'], ['wreck', 'deck'], ['deck', 'cabin', 'narrow'], ['cabin', 'cavern', 'secret'], ['coralcity', 'glow1'], ['glow1', 'glow2'], ['deck', 'glow2', 'narrow'], ['kelpdeep', 'glow1', 'narrow'], ['glow2', 'glowpath', 'narrow'], ['glow2', 'glowbig', 'narrow'], ['cavern', 'glowbig', 'narrow'], ['glowbig', 'glowsecret', 'secret'], ['glowpath', 'vent', 'narrow'], ['glowpath', 'ruins'], ['vent', 'pillars', 'narrow'], ['pillars', 'ruins'], ['ruins', 'ruinhall'], ['pillars', 'ruinhidden', 'secret'], ['ruinhall', 'ruinhidden', 'secret'], ['glowbig', 'vents', 'narrow'], ['vents', 'chimney', 'narrow'], ['chimney', 'hotspring', 'secret'], ['ruins', 'anglers', 'narrow'], ['vents', 'anglers', 'narrow'], ['ruinhall', 'trenchwall', 'narrow'], ['anglers', 'trench'], ['trenchwall', 'trench', 'narrow'], ['chimney', 'trench', 'narrow'], ['trench', 'ledge', 'narrow'], ['trench', 'abyssgate'], ['ledge', 'abyssgate', 'narrow'], ['abyssgate', 'lastlight', 'narrow'], ['abyssgate', 'abyss', 'narrow'], ['lastlight', 'abyss', 'narrow']] },
      // かわ・みずうみ: かわを さかのぼる型。かわぎし → はし → あしはら / しっち → かわの せまい ところ →
      // かわの たき → かみながれ → みずうみ → なかのしま。かわが つねに よこに あるので、
      // どちらへ すすめば かみ(おく)なのか まよわない
      river_lake: { len: 8000, halfW: 2200, ground: ['#a9d38d', '#82b46f'], path: '#d3c39a', props: ['🌿', '🪷', '🎣', '🌳', '🪷', '🌳', '🌿', '🎣'],
        zones: [Z('bank', 'かわぎし', { crowd: 3.6, walls: 0.8, hero: ['riverrock', 330], anim: 'water' }), Z('bridge', 'はしのあたり', { crowd: 1.6, tint: '#9fc98a', walls: 0.9, hero: ['woodbridge', 360], anim: 'water' }), Z('reeds', 'あしはら', { crowd: 1.1, light: 1.02, tint: '#b6cc8a', walls: 0.7, hero: ['reedclump', 340], field: ['🌾', '🌿', '🪷'], anim: 'water', open: 1.05, lane: ['🌾', '🌿', '🪷', '🌾'] }), Z('marsh', 'しっち', { crowd: 0.6, light: 0.88, fog: 0.3, tint: '#7f9a7a', walls: 1.15, frameScale: 1.05, hero: ['rockpool', 340], field: ['🌿', '💧', '🌿'], anim: 'mist', open: 0.96, lane: ['🌿', '💧', '🪵', '🌿'] }), Z('gorge', 'かわのせまいところ', { crowd: 0.6, light: 0.8, fog: 0.15, tint: '#6a7a68', walls: 1.6, frame: 'cliffwall', frameScale: 1.35, hero: ['bigrock', 370], field: ['🪨', '💧', '🪨'], anim: 'water', open: 0.9, lane: ['🪨', '💧', '🪨', '🌿'] }), Z('falls', 'かわのたき', { crowd: 0.9, light: 0.98, fog: 0.2, tint: '#84b4b0', walls: 0.75, frameScale: 1.05, field: ['💧', '🪨', '🌿'], anim: 'water', open: 1.04 }), Z('upper', 'かみながれ', { crowd: 0.7, light: 1.0, tint: '#a3ca92', walls: 1.0, frame: 'riverwood', frameScale: 1.1, hero: ['log', 340], field: ['🌿', '🪵', '🌿'], anim: 'water', open: 0.99 }), Z('lake', 'みずうみのほとり', { crowd: 1.4, light: 1.05, tint: '#b9dcb0', walls: 0.35, fog: 0.08, hero: ['pier', 350], field: ['🪷', '🌿', '🪷'], anim: 'water', open: 1.06 }), Z('island', 'なかのしま', { crowd: 0.4, light: 0.96, fog: 0.22, tint: '#9ec8a8', walls: 0.55, frameScale: 1.0, hero: ['parktree', 390], field: ['🌳', '🪷', '🌿'], anim: 'mist', open: 1.02, marks: { color: '#8fae8a', kind: 'tuft' } })],
        spots: [sp('bank', 'かわぎし', 0, 250, 200, 'plaza', 1, { zone: 'bank' }), sp('riverside', 'かわぎしのひろば', 0, 800, 280, 'plaza', 8, { hub: true, zone: 'bank' }), sp('river1', 'かわ', -600, 1000, 220, 'water', 6, { prop: '💧', zone: 'bank' }), sp('riverbend', 'かわのまがり', -950, 1350, 170, 'path', 0, { zone: 'bank' }), sp('rightpath', 'みぎぎしのみち', 600, 1500, 150, 'path', 1, { zone: 'bank' }), sp('bridge1', 'きのはし', -500, 1550, 160, 'path', 2, { prop: '🌉', zone: 'bridge' }), sp('leftbank', 'ひだりぎし', -1000, 1950, 150, 'path', 1, { zone: 'bridge' }), sp('bridge2', 'おおきなはし', 0, 2250, 200, 'path', 2, { landmark: 'bridge', lmTier: 2, zone: 'bridge' }), sp('spring', 'わきみず', -1350, 2550, 130, 'water', 1, { secret: true, zone: 'bridge' }), sp('reeds', 'あしはら', 900, 2050, 220, 'grove', 2, { prop: '🌾', zone: 'reeds' }), sp('reedhut', 'あしのこや', 1500, 2250, 150, 'shelter', 1, { prop: '🛖', zone: 'reeds' }), sp('reedpath', 'あしのこみち', 1300, 2800, 160, 'path', 0, { zone: 'reeds' }), sp('heron', 'とりのなかす', 600, 3000, 180, 'water', 2, { prop: '🪷', zone: 'reeds' }), sp('marsh', 'しっち', 1150, 3500, 220, 'water', 2, { prop: '🌿', zone: 'marsh' }), sp('marshwalk', 'いたのみち', 1550, 4100, 160, 'path', 0, { zone: 'marsh' }), sp('marshhide', 'しっちのかくれば', 1850, 3450, 140, 'rest', 1, { secret: true, zone: 'marsh' }), sp('gorge', 'かわのせまいところ', -700, 3400, 180, 'path', 1, { prop: '🪨', zone: 'gorge' }), sp('rapids', 'はやせ', -300, 3950, 200, 'water', 2, { zone: 'gorge' }), sp('gorgerock', 'かわのおおいわ', -1150, 4100, 170, 'rest', 1, { prop: '🪨', zone: 'gorge' }), sp('riverfalls', 'かわのたき', -450, 4700, 220, 'water', 3, { landmark: 'waterfall', lmTier: 1, zone: 'falls' }), sp('fallsside', 'たきのよこみち', 350, 4850, 160, 'path', 0, { zone: 'falls' }), sp('fallspool', 'たきつぼ', -950, 5150, 180, 'water', 2, { zone: 'falls' }), sp('fallscave', 'たきのうらのくぼ', -1450, 4800, 140, 'rest', 1, { secret: true, zone: 'falls' }), sp('upper', 'かみながれ', -250, 5600, 200, 'water', 2, { prop: '💧', zone: 'upper' }), sp('logbridge', 'まるたのはし', 450, 5800, 150, 'path', 0, { prop: '🌉', zone: 'upper' }), sp('otter', 'かわうそのいわ', -850, 6100, 160, 'rest', 1, { prop: '🪨', zone: 'upper' }), sp('upperlook', 'かみながれのてんぼう', -1400, 5700, 170, 'edge', 1, { cam: 'wide', zone: 'upper' }), sp('upperhut', 'かわのこや', 800, 6350, 170, 'shelter', 2, { prop: '🛖', zone: 'upper' }), sp('lakelook', 'みずうみのてんぼう', -1500, 6600, 170, 'edge', 1, { cam: 'wide', zone: 'lake', view: ['springpool', 'driftwood', 'driftwood'] }), sp('lake', 'みずうみ', -300, 6950, 300, 'water', 6, { prop: '🪷', zone: 'lake' }), sp('lakeshore', 'みずうみのはま', -1150, 7150, 220, 'plaza', 5, { zone: 'lake' }), sp('boathouse', 'ふねごや', 650, 7000, 170, 'shelter', 3, { prop: '🛖', zone: 'lake' }), sp('fishing', 'つりのいわ', 350, 7550, 170, 'water', 2, { prop: '🎣', zone: 'lake' }), sp('island', 'なかのしま', -750, 7750, 200, 'grove', 1, { prop: '🌳', zone: 'island' }), sp('islet', 'ちいさなしま', 0, 7780, 150, 'edge', 1, { secret: true, zone: 'island' })],
        paths: [['bank', 'riverside', 'wide'], ['riverside', 'river1'], ['riverside', 'rightpath'], ['river1', 'riverbend', 'narrow'], ['river1', 'bridge1'], ['riverbend', 'leftbank', 'narrow'], ['bridge1', 'leftbank', 'narrow'], ['rightpath', 'bridge1', 'narrow'], ['leftbank', 'bridge2', 'narrow'], ['leftbank', 'spring', 'secret'], ['rightpath', 'reeds'], ['reeds', 'bridge2'], ['reeds', 'reedhut', 'narrow'], ['reeds', 'reedpath', 'narrow'], ['reedpath', 'heron', 'narrow'], ['reedhut', 'reedpath', 'narrow'], ['bridge2', 'heron', 'narrow'], ['reedpath', 'marsh'], ['heron', 'marsh', 'narrow'], ['marsh', 'marshwalk', 'narrow'], ['marsh', 'marshhide', 'secret'], ['bridge2', 'gorge'], ['gorge', 'rapids'], ['gorge', 'gorgerock', 'narrow'], ['rapids', 'gorgerock', 'narrow'], ['heron', 'rapids', 'narrow'], ['rapids', 'riverfalls'], ['riverfalls', 'fallsside', 'narrow'], ['marshwalk', 'fallsside', 'narrow'], ['riverfalls', 'fallspool', 'narrow'], ['fallspool', 'fallscave', 'secret'], ['gorgerock', 'fallspool', 'narrow'], ['riverfalls', 'upper'], ['fallsside', 'logbridge', 'narrow'], ['upper', 'logbridge', 'narrow'], ['fallspool', 'upperlook', 'narrow'], ['upper', 'otter', 'narrow'], ['upperlook', 'otter', 'narrow'], ['logbridge', 'upperhut', 'narrow'], ['upper', 'lake'], ['otter', 'lakelook', 'narrow'], ['lakelook', 'lakeshore', 'narrow'], ['lake', 'lakeshore'], ['upperhut', 'boathouse', 'narrow'], ['lake', 'boathouse'], ['boathouse', 'fishing', 'narrow'], ['lake', 'fishing', 'narrow'], ['lakeshore', 'island', 'narrow'], ['island', 'islet', 'secret'], ['lake', 'islet', 'secret']] },
      // ジャングル: ふくすう ルート型。いりぐち から つるのみち / きのうえ / いせき の 3ほうこうへ わかれ、
      // かわ・たき・ぬま・どうくつ・はなのたに を へて おくの おくへ つながる。みとおしが いちばん せまいので、
      // たき・いせき・きょだいなはな など「おおきくて わすれない もの」で いまの ばしょを おぼえる
      jungle: { len: 8100, halfW: 2600, ground: ['#5f9a58', '#3f7a45'], path: '#a08a5f', props: ['🌴', '🌺', '🪵', '🌿', '🍌', '🌱', '🌳', '🌴'],
        zones: [Z('entry', 'ジャングルのいりぐち', { crowd: 2.6, light: 1.02, walls: 0.8, hero: ['log', 340], anim: 'leaves' }), Z('vines', 'つるのみち', { crowd: 0.8, light: 0.82, fog: 0.2, walls: 1.5, frameScale: 1.1, hero: ['vine', 350], anim: 'leaves', open: 0.93 }), Z('river', 'ジャングルのかわ', { crowd: 0.9, light: 0.95, fog: 0.12, tint: '#4f8a7a', walls: 0.75, frame: 'riverwood', hero: ['riverrock', 350], field: ['💧', '🌿', '🪨'], anim: 'water', open: 1.05, lane: ['💧', '🌿', '🪨', '🌿'] }), Z('falls', 'たきのあたり', { crowd: 1.1, tint: '#5a9a8a', fog: 0.15, walls: 0.7, anim: 'water', open: 1.04 }), Z('canopy', 'きのうえ', { crowd: 1.2, light: 0.9, walls: 1.3, frameScale: 1.3, hero: ['buttress', 390], anim: 'leaves', open: 0.95 }), Z('swamp', 'どろのぬま', { crowd: 0.5, light: 0.7, fog: 0.4, tint: '#3f4a2f', walls: 1.35, frameScale: 1.15, hero: ['rockpool', 350], field: ['🌿', '🪵', '🌱'], anim: 'mist', open: 0.92, lane: ['🪵', '🌿', '🌱', '🌿'] }), Z('ruins', 'いせき', { crowd: 1.6, tint: '#8a8a6a', walls: 0.9, frame: 'ruinwall', hero: ['ruinpillar', 370], anim: 'leaves' }), Z('caves', 'どうくつぐん', { crowd: 0.5, light: 0.6, fog: 0.32, tint: '#4a4438', walls: 1.65, frame: 'cliffwall', frameScale: 1.4, hero: ['bigrock', 400], field: ['🪨', '🌿', '🪨'], anim: 'mist', open: 0.88, marks: { color: '#6a6250', kind: 'tuft' } }), Z('flowers', 'はなのたに', { crowd: 0.8, light: 1.06, fog: 0.1, tint: '#7fae5f', walls: 0.6, frame: 'palmgrove', frameScale: 1.1, hero: ['hugeleaf', 400], field: ['🌺', '🌺', '🌴'], anim: 'leaves', open: 1.08, marks: { color: '#e88aa8', kind: 'sparkle' }, lane: ['🌺', '🌿', '🌺', '🌴'] }), Z('deep', 'ふかいジャングル', { crowd: 0.35, light: 0.66, fog: 0.42, tint: '#2f5a3a', walls: 1.6, frameScale: 1.2, hero: ['stump', 340], anim: 'mist', open: 0.92, lane: ['🌺', '🌿', '🌿', '🪨'] })],
        spots: [sp('entry', 'ジャングルのいりぐち', 0, 250, 200, 'plaza', 1, { zone: 'entry' }), sp('clearing', 'ひらけたばしょ', 0, 850, 280, 'plaza', 8, { hub: true, prop: '🪵', zone: 'entry' }), sp('vines1', 'つるのみち', -800, 1250, 180, 'path', 1, { zone: 'vines' }), sp('vines2', 'つるのおく', -1250, 1900, 160, 'path', 1, { zone: 'vines' }), sp('vineclear', 'つるのきれま', -1750, 2400, 170, 'rest', 1, { zone: 'vines' }), sp('vinesdeep', 'つるのめいろ', -900, 2500, 160, 'path', 0, { zone: 'vines' }), sp('jriver', 'ジャングルのかわ', -1350, 3050, 220, 'water', 3, { prop: '🌿', zone: 'river' }), sp('ford', 'かわのあさせ', -700, 3300, 170, 'path', 1, { zone: 'river' }), sp('logcross', 'まるたわたり', -1850, 3550, 150, 'path', 0, { prop: '🪵', zone: 'river' }), sp('falls', 'たき', -1200, 4050, 220, 'water', 6, { landmark: 'waterfall', lmTier: 1, zone: 'falls' }), sp('behindfalls', 'たきのうら', -1750, 4350, 140, 'rest', 1, { secret: true, zone: 'falls' }), sp('fallsrock', 'たきよこのいわ', -650, 4400, 170, 'rest', 1, { prop: '🪵', zone: 'falls' }), sp('canopy', 'おおきなきのした', 900, 1250, 200, 'shelter', 5, { prop: '🌳', zone: 'canopy' }), sp('nest', 'すのあたり', 1400, 1900, 170, 'rest', 2, { prop: '🪺', zone: 'canopy' }), sp('treeplatform', 'きのうえのあしば', 700, 1950, 160, 'rest', 1, { prop: '🪵', zone: 'canopy' }), sp('hanging', 'つりばし', 900, 2600, 150, 'path', 1, { prop: '🌉', zone: 'canopy' }), sp('canopywalk', 'こずえのみち', 1650, 2600, 160, 'path', 0, { zone: 'canopy' }), sp('swamp', 'どろのぬま', 1300, 3350, 220, 'water', 2, { prop: '🌱', zone: 'swamp' }), sp('swamplog', 'ぬまのまるた', 1800, 3900, 160, 'path', 0, { prop: '🪵', zone: 'swamp' }), sp('swamphide', 'ぬまのかくれば', 2150, 3250, 140, 'rest', 1, { secret: true, zone: 'swamp' }), sp('ruins', 'いせき', 0, 1750, 240, 'plaza', 6, { prop: '🗿', zone: 'ruins' }), sp('steps', 'いせきのかいだん', 250, 2450, 160, 'path', 1, { zone: 'ruins' }), sp('ruinwall', 'くずれたかべ', -350, 2950, 170, 'path', 0, { zone: 'ruins' }), sp('hidden', 'いせきのちかしつ', 550, 3100, 140, 'rest', 1, { secret: true, zone: 'ruins' }), sp('temple', 'おおきないせき', 0, 3750, 240, 'edge', 3, { landmark: 'temple', lmTier: 1, cam: 'wide', zone: 'ruins' }), sp('caves', 'どうくつのいりぐち', 700, 4600, 200, 'shelter', 2, { prop: '🪨', zone: 'caves' }), sp('cavefall', 'どうくつのしみず', 1500, 4900, 160, 'water', 1, { zone: 'caves' }), sp('cavehall', 'どうくつのひろま', 1150, 5300, 200, 'rest', 2, { zone: 'caves' }), sp('cavepath', 'どうくつのうらみち', 900, 6200, 160, 'path', 0, { zone: 'caves' }), sp('cavedeep', 'どうくつのおく', 500, 5650, 150, 'rest', 1, { secret: true, zone: 'caves' }), sp('valleygate', 'たにへのおりくち', 0, 5100, 170, 'path', 1, { zone: 'flowers' }), sp('flowers', 'はなのたに', -800, 5300, 240, 'grove', 3, { prop: '🌺', zone: 'flowers' }), sp('flowerpath', 'はなのこみち', -1450, 5800, 160, 'path', 0, { zone: 'flowers' }), sp('giantflower', 'きょだいなはな', -350, 5900, 200, 'grove', 2, { prop: '🌺', zone: 'flowers' }), sp('pollen', 'はなふぶきのくぼ', -1100, 6400, 170, 'rest', 1, { zone: 'flowers' }), sp('deep1', 'ふかいジャングル', 100, 6600, 220, 'grove', 2, { zone: 'deep' }), sp('deep2', 'ジャングルのしん', 700, 7100, 200, 'grove', 1, { zone: 'deep' }), sp('deeproot', 'おおきなねのトンネル', -500, 7200, 150, 'path', 0, { cam: 'narrow', zone: 'deep' }), sp('deephide', 'つたのかくれば', -1050, 7600, 140, 'rest', 1, { secret: true, zone: 'deep' }), sp('deepheart', 'ジャングルのおくのおく', 0, 7700, 220, 'edge', 1, { cam: 'wide', zone: 'deep' })],
        paths: [['entry', 'clearing', 'wide'], ['clearing', 'vines1'], ['clearing', 'canopy'], ['clearing', 'ruins'], ['vines1', 'vines2', 'narrow'], ['vines2', 'vineclear', 'narrow'], ['vines2', 'vinesdeep', 'narrow'], ['vines1', 'ruins', 'narrow'], ['vinesdeep', 'ford', 'narrow'], ['vineclear', 'jriver', 'narrow'], ['jriver', 'ford', 'narrow'], ['jriver', 'logcross', 'narrow'], ['ford', 'falls'], ['logcross', 'falls', 'narrow'], ['falls', 'behindfalls', 'secret'], ['falls', 'fallsrock', 'narrow'], ['fallsrock', 'temple', 'narrow'], ['canopy', 'nest'], ['nest', 'canopywalk', 'narrow'], ['canopy', 'treeplatform', 'narrow'], ['treeplatform', 'hanging', 'narrow'], ['treeplatform', 'nest', 'narrow'], ['hanging', 'canopywalk', 'narrow'], ['hanging', 'steps', 'narrow'], ['canopywalk', 'swamp', 'narrow'], ['swamp', 'swamplog', 'narrow'], ['swamp', 'swamphide', 'secret'], ['swamp', 'hidden', 'narrow'], ['ruins', 'steps'], ['ruins', 'ruinwall', 'narrow'], ['steps', 'hidden', 'secret'], ['ruinwall', 'temple', 'narrow'], ['steps', 'temple'], ['ruinwall', 'ford', 'narrow'], ['temple', 'caves', 'narrow'], ['swamplog', 'cavefall', 'narrow'], ['caves', 'cavefall', 'narrow'], ['caves', 'cavehall'], ['cavefall', 'cavehall', 'narrow'], ['cavehall', 'cavedeep', 'secret'], ['fallsrock', 'flowers'], ['flowers', 'flowerpath', 'narrow'], ['flowers', 'giantflower'], ['caves', 'valleygate', 'narrow'], ['valleygate', 'flowers', 'narrow'], ['valleygate', 'giantflower', 'narrow'], ['flowerpath', 'pollen', 'narrow'], ['giantflower', 'deep1', 'narrow'], ['pollen', 'deep1', 'narrow'], ['cavehall', 'cavepath', 'narrow'], ['cavepath', 'deep2', 'narrow'], ['cavepath', 'deep1', 'narrow'], ['deep1', 'deep2', 'narrow'], ['deep1', 'deeproot', 'narrow'], ['deeproot', 'deephide', 'secret'], ['deeproot', 'deepheart', 'narrow'], ['deep2', 'deepheart', 'narrow']] },
      // さばく: 13地域で いちばん こうだい。いりぐち から すなやま / キャラバン / いせき の 3ほうこうへ ひろがり、
      // いわのたに・メサ・しおの ひらち・すなの うみ・ほねの たにま を へて さばくの はてへ。
      // めじるしは とおくの メサ と オアシス と ピラミッド だけ。あるいても あるいても つかない ひろさ に する
      desert: { len: 8800, halfW: 3400, ground: ['#e9cf95', '#d2b271'], path: '#f1dfb0', props: ['🌵', '🏺', '🌵', '⛺', '🌴', '🌵', '🏺', '🌵'],
        zones: [Z('gate', 'さばくのいりぐち', { crowd: 4.0, walls: 0.5, hero: ['pot', 290], anim: 'sand', open: 1.02 }), Z('dunes', 'すなやま', { crowd: 0.8, walls: 0.7, light: 1.06, frameScale: 1.05, hero: ['dune', 430], anim: 'sand', open: 1.08 }), Z('canyon', 'いわのたに', { crowd: 0.6, light: 0.82, fog: 0.14, tint: '#9a6a4f', walls: 1.7, frame: 'mesa', frameScale: 1.5, hero: ['bigrock', 400], field: ['🪨', '⛰️', '🪨'], anim: 'sand', open: 0.88, lane: ['🪨', '🏺', '🪨', '🌵'] }), Z('oasis', 'オアシス', { crowd: 1.8, tint: '#b8c98a', walls: 0.6, frame: 'palmgrove', hero: ['oasispool', 420], field: ['🌴', '🌴', '🏺'], anim: 'water' }), Z('tents', 'キャラバンのあたり', { crowd: 1.2, walls: 0.45, hero: ['tent', 340], anim: 'glow', open: 1.04 }), Z('mesas', 'メサのあたり', { crowd: 0.6, light: 1.04, fog: 0.1, tint: '#c78a5a', walls: 1.15, frame: 'mesa', frameScale: 1.35, hero: ['mesa', 480], field: ['⛰️', '🪨', '🌵'], anim: 'sand', open: 1.02 }), Z('ruins', 'いせき', { crowd: 1.0, tint: '#d9c28a', walls: 0.8, frame: 'ruinwall', hero: ['obelisk', 370], anim: 'sand', open: 0.96 }), Z('saltflat', 'しおのひらち', { crowd: 0.4, light: 1.12, fog: 0.14, tint: '#eceadd', walls: 0.25, frameScale: 0.85, hero: ['cairn', 330], field: ['🏺', '🪨', '🏺'], anim: 'sand', open: 1.14, marks: { color: '#d8d4c0', kind: 'tuft' } }), Z('sandsea', 'すなのうみ', { crowd: 0.4, light: 1.1, fog: 0.22, tint: '#e4c184', walls: 0.55, frame: 'duneridge', frameScale: 1.4, hero: ['duneridge', 470], field: ['🌵', '🏺', '🌵'], anim: 'sand', open: 1.15 }), Z('bones', 'ほねのたにま', { crowd: 0.35, light: 0.98, fog: 0.2, tint: '#d8cbb0', walls: 0.9, frameScale: 1.2, hero: ['stonestack', 350], field: ['🪨', '🏺', '🪨'], anim: 'sand', open: 1.04, marks: { color: '#b8ad94', kind: 'tuft' } }), Z('far', 'さばくのはて', { crowd: 0.4, light: 1.08, fog: 0.28, walls: 0.3, anim: 'sand', open: 1.12 })],
        spots: [sp('gate', 'さばくのいりぐち', 0, 250, 200, 'plaza', 1, { zone: 'gate' }), sp('well', 'いどのひろば', 0, 900, 280, 'plaza', 8, { hub: true, prop: '🏺', zone: 'gate' }), sp('dune1', 'すなやま', -1000, 1400, 200, 'path', 1, { zone: 'dunes' }), sp('dunecrest', 'すなやまのおね', -600, 1950, 170, 'edge', 1, { cam: 'wide', zone: 'dunes' }), sp('dune2', 'おおきなすなやま', -1700, 2100, 220, 'path', 1, { zone: 'dunes' }), sp('dunehollow', 'すなのくぼ', -1200, 2550, 180, 'rest', 1, { prop: '🌵', zone: 'dunes' }), sp('canyon', 'いわのたに', -2250, 2900, 200, 'path', 1, { prop: '🪨', zone: 'canyon' }), sp('canyonnarrow', 'いわのせまみち', -2650, 3500, 160, 'path', 0, { zone: 'canyon' }), sp('canyonshade', 'いわかげのみずたまり', -1900, 3700, 180, 'water', 2, { zone: 'canyon' }), sp('oasis', 'オアシス', -1500, 4400, 260, 'water', 7, { landmark: 'palms', lmTier: 1, zone: 'oasis' }), sp('oasiscamp', 'オアシスのテント', -900, 4850, 180, 'shelter', 3, { prop: '⛺', zone: 'oasis' }), sp('oasisback', 'オアシスのうら', -2150, 4900, 160, 'rest', 1, { zone: 'oasis' }), sp('caravan', 'キャラバンのテント', 1100, 1400, 200, 'shelter', 6, { prop: '⛺', zone: 'tents' }), sp('tentwell', 'キャラバンのいど', 800, 2150, 160, 'rest', 2, { prop: '🏺', zone: 'tents' }), sp('camel', 'ラクダのみずば', 1800, 2100, 180, 'water', 2, { prop: '🪧', zone: 'tents' }), sp('cliff', 'がけのかげ', 1400, 2800, 170, 'rest', 2, { prop: '🪨', zone: 'tents' }), sp('mesa1', 'メサのふもと', 2250, 3000, 200, 'path', 1, { zone: 'mesas' }), sp('mesacave', 'メサのほらあな', 3000, 3250, 140, 'rest', 1, { secret: true, zone: 'mesas' }), sp('mesa2', 'おおきなメサ', 2700, 3750, 220, 'edge', 2, { cam: 'wide', zone: 'mesas' }), sp('mesashade', 'メサのかげ', 1850, 3800, 170, 'rest', 1, { zone: 'mesas' }), sp('ruins', 'いしのいせき', 0, 1900, 240, 'plaza', 3, { prop: '🏛️', zone: 'ruins' }), sp('ruinsteps', 'いせきのかいだん', 500, 2350, 150, 'path', 0, { zone: 'ruins' }), sp('pillars', 'はしらのみち', 150, 2750, 170, 'path', 1, { zone: 'ruins' }), sp('ruinyard', 'いせきのなかにわ', -400, 3300, 180, 'rest', 2, { prop: '🏺', zone: 'ruins' }), sp('saltflat', 'しおのひらち', 350, 4000, 260, 'plaza', 1, { zone: 'saltflat' }), sp('saltpool', 'しおのみずたまり', -200, 4600, 180, 'water', 1, { zone: 'saltflat' }), sp('saltmark', 'しおのみちしるべ', 900, 4600, 160, 'path', 0, { prop: '🪧', zone: 'saltflat' }), sp('sandsea', 'すなのうみ', 1250, 5300, 240, 'path', 1, { zone: 'sandsea' }), sp('sandhollow', 'すなのそこ', 600, 5900, 180, 'path', 0, { zone: 'sandsea' }), sp('sandridge', 'すなのおね', 1950, 5800, 200, 'edge', 1, { cam: 'wide', zone: 'sandsea' }), sp('buried', 'すなにうまったもん', 2400, 5400, 140, 'rest', 1, { secret: true, zone: 'sandsea' }), sp('bonevale', 'ほねのたにま', -1000, 5700, 220, 'plaza', 1, { zone: 'bones' }), sp('bones', 'ほねのおか', -1750, 6200, 150, 'rest', 1, { secret: true, zone: 'bones' }), sp('bonearch', 'ほねのアーチ', -400, 6400, 190, 'edge', 1, { cam: 'wide', zone: 'bones', deco: ['arch:bone'] }), sp('lastwell', 'さいごのいど', -250, 6950, 170, 'rest', 1, { prop: '🏺', zone: 'far' }), sp('mirage', 'しんきろうのおか', 1150, 7050, 170, 'edge', 1, { zone: 'far' }), sp('pyramid', 'おおきないせき', 0, 7500, 240, 'edge', 2, { landmark: 'temple', lmTier: 1, cam: 'wide', zone: 'far' }), sp('spring', 'かくれたいずみ', 1700, 7700, 130, 'water', 1, { secret: true, zone: 'far' }), sp('endsand', 'さいはてのすなやま', -900, 7850, 200, 'path', 0, { zone: 'far' }), sp('sunstone', 'ひのいし', 450, 8150, 180, 'rest', 1, { prop: '🏺', zone: 'far' })],
        paths: [['gate', 'well', 'wide'], ['well', 'dune1'], ['well', 'caravan'], ['well', 'ruins'], ['dune1', 'dunecrest', 'narrow'], ['dune1', 'dune2', 'narrow'], ['dunecrest', 'dunehollow', 'narrow'], ['dune2', 'dunehollow', 'narrow'], ['dune2', 'canyon', 'narrow'], ['dunehollow', 'canyonshade', 'narrow'], ['canyon', 'canyonnarrow', 'narrow'], ['canyonnarrow', 'canyonshade', 'narrow'], ['canyonshade', 'oasis'], ['canyonnarrow', 'oasisback', 'narrow'], ['oasis', 'oasiscamp'], ['oasis', 'oasisback', 'narrow'], ['dunecrest', 'ruinyard', 'narrow'], ['caravan', 'tentwell', 'narrow'], ['caravan', 'camel'], ['camel', 'cliff', 'narrow'], ['tentwell', 'cliff', 'narrow'], ['tentwell', 'ruinsteps', 'narrow'], ['camel', 'mesa1', 'narrow'], ['mesa1', 'mesacave', 'secret'], ['mesa1', 'mesa2'], ['mesa2', 'mesashade', 'narrow'], ['cliff', 'mesashade', 'narrow'], ['ruins', 'ruinsteps', 'narrow'], ['ruins', 'pillars'], ['ruinsteps', 'pillars', 'narrow'], ['pillars', 'ruinyard'], ['ruinyard', 'saltflat'], ['mesashade', 'saltmark', 'narrow'], ['saltflat', 'saltpool', 'narrow'], ['saltflat', 'saltmark', 'narrow'], ['oasiscamp', 'saltpool', 'narrow'], ['saltmark', 'sandsea'], ['sandsea', 'sandhollow', 'narrow'], ['sandsea', 'sandridge', 'narrow'], ['sandridge', 'buried', 'secret'], ['saltpool', 'bonevale'], ['sandhollow', 'bonearch', 'narrow'], ['bonevale', 'bones', 'secret'], ['bonevale', 'bonearch', 'narrow'], ['bonearch', 'lastwell', 'narrow'], ['sandhollow', 'mirage', 'narrow'], ['lastwell', 'pyramid'], ['mirage', 'pyramid', 'narrow'], ['mirage', 'spring', 'secret'], ['lastwell', 'endsand', 'narrow'], ['endsand', 'pyramid', 'narrow'], ['pyramid', 'sunstone', 'narrow']] },
      // ほしぞらの ていりゅうじょ: うきしま ネットワーク型。ていりゅうじょ から にし・ひがし・くもの かいろう の
      // 3ほうこうへ しまが つながり、ほしの はたけ / ふるい うきしま を へて つぎの ていりゅうじょ →
      // つきの しま → そらの はて へ。しまと しまの あいだの くうはくが「わたっている」かんじを つくる
      star_stop: { len: 7300, halfW: 2600, ground: ['#4a3f86', '#2b2460'], path: '#9d8ff0', props: ['🏮', '🔭', '🚏', '✨', '🏮', '✨', '🪑'],
        zones: [Z('stop', 'ていりゅうじょ', { crowd: 2.6, walls: 0.6, anim: 'motes', open: 1.02 }), Z('west', 'にしのうきしま', { crowd: 1.3, tint: '#4f4a96', hero: ['crystalgarden', 300], anim: 'glow', marks: { color: '#ffe9a8', kind: 'sparkle' } }), Z('east', 'ひがしのうきしま', { crowd: 1.2, tint: '#3f3f80', frame: 'islandedge', frameScale: 1.2, hero: ['crystal', 340], anim: 'motes' }), Z('cloud', 'くものかいろう', { crowd: 1.0, light: 1.06, fog: 0.12, tint: '#6a66b0', walls: 0.35, frameScale: 0.85, hero: ['lightbridge', 380], field: ['☁️', '✨', '☁️'], anim: 'motes', open: 1.12 }), Z('garden', 'ほしのはたけ', { crowd: 0.9, light: 1.02, tint: '#5a5aa0', walls: 0.7, hero: ['orrery', 360], field: ['🌟', '⭐', '✨'], anim: 'glow', open: 1.04, marks: { color: '#ffe9a8', kind: 'sparkle' }, lane: ['⭐', '✨', '🌟', '✨'] }), Z('ruinisle', 'ふるいうきしま', { crowd: 0.7, light: 0.84, fog: 0.2, tint: '#3a3468', walls: 1.2, frame: 'ruinwall', frameScale: 1.15, hero: ['ruingate', 380], field: ['🏛️', '🪨', '✨'], anim: 'motes', open: 0.95, lane: ['🏛️', '🪨', '🏮', '✨'] }), Z('far', 'とおいていりゅうじょ', { crowd: 1.1, light: 0.9, fog: 0.15, tint: '#2f2a66', walls: 0.5, hero: ['stoplamp', 330], anim: 'motes', open: 1.06 }), Z('moon', 'つきのしま', { crowd: 0.6, light: 0.96, fog: 0.1, tint: '#4a4478', walls: 0.55, frameScale: 1.0, hero: ['moonlamp', 370], field: ['🌙', '✨', '🌙'], anim: 'glow', open: 1.06, marks: { color: '#cfe0ff', kind: 'sparkle' } }), Z('edge', 'そらのはて', { crowd: 0.4, light: 0.86, fog: 0.3, tint: '#241f52', walls: 0.25, frameScale: 0.9, hero: ['telescope', 320], field: ['✨', '🪐', '💫'], anim: 'motes', open: 1.15 })],
        spots: [sp('stop', 'ていりゅうじょ', 0, 250, 240, 'plaza', 5, { landmark: 'bigstop', lmTier: 1, zone: 'stop' }), sp('platform', 'まちあいのひろば', 0, 900, 280, 'plaza', 8, { hub: true, prop: '🏮', zone: 'stop' }), sp('stopbench', 'ていりゅうじょのベンチ', 600, 700, 160, 'rest', 2, { prop: '🪑', zone: 'stop' }), sp('bench', 'ほしをみるベンチ', -800, 1300, 180, 'rest', 3, { prop: '🪑', zone: 'west' }), sp('westlamp', 'にしのあかり', -1150, 1750, 150, 'path', 0, { prop: '🏮', zone: 'west' }), sp('isle2', 'ほしのはたけ', -1450, 2250, 220, 'grove', 3, { prop: '🌟', zone: 'west' }), sp('westbridge', 'にしのひかりばし', -650, 2100, 150, 'path', 0, { zone: 'west' }), sp('isle1', 'ちいさなうきしま', 900, 1300, 200, 'grove', 2, { prop: '⭐', zone: 'east' }), sp('secretview', 'ひみつのてんぼうだい', 1550, 1750, 160, 'edge', 1, { secret: true, prop: '🔭', cam: 'wide', zone: 'east' }), sp('eastbridge', 'ひがしのひかりばし', 500, 1850, 150, 'path', 0, { zone: 'east' }), sp('isle3', 'ねむるうきしま', 1050, 2200, 180, 'rest', 2, { prop: '🌙', zone: 'east' }), sp('cloud1', 'くものみち', 0, 1600, 200, 'path', 2, { prop: '🏮', zone: 'cloud' }), sp('cloudwalk', 'くものかいろう', 0, 2400, 180, 'path', 1, { zone: 'cloud' }), sp('cloudgap', 'くものきれま', 450, 2750, 160, 'path', 0, { zone: 'cloud' }), sp('cloudrest', 'くもだまり', -350, 3000, 170, 'rest', 1, { zone: 'cloud' }), sp('garden', 'ほしのたねのはたけ', -1350, 3050, 240, 'grove', 3, { prop: '🌟', zone: 'garden' }), sp('farisle', 'とおいうきしま', -800, 3600, 200, 'edge', 2, { prop: '🪐', zone: 'garden' }), sp('gardenpath', 'はたけのあぜ', -1850, 3650, 160, 'path', 0, { zone: 'garden' }), sp('comet', 'ながれぼしのおか', -2050, 4250, 140, 'edge', 1, { secret: true, zone: 'garden' }), sp('ruinisle', 'ふるいうきしま', 1150, 3250, 220, 'plaza', 2, { prop: '🏮', zone: 'ruinisle' }), sp('ruinhide', 'うきしまのしたがわ', 1900, 3200, 140, 'rest', 1, { secret: true, zone: 'ruinisle' }), sp('ruinstair', 'くずれたかいだん', 1600, 3850, 160, 'path', 0, { zone: 'ruinisle' }), sp('ruinlamp', 'きえかけのあかり', 800, 4050, 170, 'rest', 1, { prop: '🏮', zone: 'ruinisle' }), sp('stop2', 'つぎのていりゅうじょ', 0, 4400, 220, 'shelter', 6, { prop: '🚏', zone: 'far' }), sp('farlamp', 'とおいあかり', -900, 4750, 160, 'rest', 1, { prop: '🏮', zone: 'far' }), sp('cloud2', 'ほしのかいだん', 400, 5100, 170, 'path', 1, { zone: 'far' }), sp('stop3', 'さいごのていりゅうじょ', -500, 5400, 220, 'plaza', 3, { prop: '🚏', zone: 'far' }), sp('moonisle', 'つきのしま', 1250, 5250, 240, 'plaza', 2, { prop: '🌙', zone: 'moon' }), sp('moonpath', 'つきのみち', 850, 5900, 160, 'path', 0, { zone: 'moon' }), sp('moonrest', 'つきのベンチ', 1550, 6100, 170, 'rest', 1, { prop: '🪑', zone: 'moon' }), sp('laststop', 'さいはてのていりゅうじょ', -350, 6200, 220, 'plaza', 1, { prop: '🚏', zone: 'edge' }), sp('edge', 'そらのはて', 400, 6500, 180, 'edge', 1, { cam: 'wide', zone: 'edge' }), sp('starfall', 'ほしのおちるところ', -1000, 6750, 170, 'edge', 1, { cam: 'wide', zone: 'edge', deco: ['crystalgarden', 'crystal', 'crystal'] }), sp('voidedge', 'なにもないところ', 1100, 6900, 140, 'rest', 1, { secret: true, zone: 'edge' })],
        paths: [['stop', 'platform', 'wide'], ['stop', 'stopbench', 'narrow'], ['platform', 'stopbench', 'narrow'], ['platform', 'bench'], ['platform', 'isle1'], ['platform', 'cloud1'], ['bench', 'westlamp', 'narrow'], ['westlamp', 'isle2', 'narrow'], ['westlamp', 'westbridge', 'narrow'], ['isle2', 'westbridge', 'narrow'], ['westbridge', 'cloudwalk', 'narrow'], ['isle1', 'secretview', 'secret'], ['isle1', 'eastbridge', 'narrow'], ['eastbridge', 'isle3', 'narrow'], ['eastbridge', 'cloud1', 'narrow'], ['isle3', 'cloudgap', 'narrow'], ['cloud1', 'cloudwalk'], ['cloudwalk', 'cloudgap', 'narrow'], ['cloudwalk', 'cloudrest', 'narrow'], ['cloudgap', 'ruinisle', 'narrow'], ['cloudrest', 'garden', 'narrow'], ['isle2', 'garden', 'narrow'], ['garden', 'farisle'], ['garden', 'gardenpath', 'narrow'], ['gardenpath', 'comet', 'secret'], ['gardenpath', 'farisle', 'narrow'], ['farisle', 'stop2'], ['cloudrest', 'stop2', 'narrow'], ['ruinisle', 'ruinhide', 'secret'], ['ruinisle', 'ruinstair', 'narrow'], ['ruinstair', 'ruinlamp', 'narrow'], ['ruinlamp', 'stop2', 'narrow'], ['isle3', 'ruinisle', 'narrow'], ['stop2', 'farlamp', 'narrow'], ['stop2', 'cloud2'], ['farlamp', 'stop3', 'narrow'], ['cloud2', 'stop3', 'narrow'], ['ruinstair', 'moonisle', 'narrow'], ['cloud2', 'moonisle', 'narrow'], ['moonisle', 'moonpath', 'narrow'], ['moonisle', 'moonrest', 'narrow'], ['moonpath', 'moonrest', 'narrow'], ['stop3', 'laststop'], ['moonpath', 'edge', 'narrow'], ['laststop', 'edge', 'narrow'], ['laststop', 'starfall', 'narrow'], ['moonrest', 'voidedge', 'secret']] },
      // きおくのみずうみ: ひろさ では なく ふかさ で ひろげる。ほとり → あしはら → きりのなか →
      // ともしびの みち → みずうみの おく → みずうみの そこ。おくへ いくほど きりが こく なり、
      // さいごの 3つは ぜんぶ かくし みち。ナオトの ばしょは かんたんには みつからない
      memory_lake: { len: 5000, halfW: 1400, ground: ['#6f7a9a', '#53577a'], path: '#8b90b0', props: ['🌳', '🌿', '🕯️', '🌳', '🌿', '🕯️'],
        zones: [Z('shore', 'みずうみのほとり', { crowd: 2.2, walls: 0.6, hero: ['bluetree', 380], anim: 'water', open: 1.04 }), Z('reeds', 'しずかなあしはら', { crowd: 1.0, light: 0.94, fog: 0.18, tint: '#68769a', walls: 0.9, hero: ['reedclump', 330], field: ['🌿', '🌿', '🍃'], anim: 'water', open: 1.0, lane: ['🌿', '🍃', '🌿', '🕯️'] }), Z('mist', 'きりのなか', { crowd: 0.9, light: 0.85, fog: 0.35, walls: 1.3, hero: ['stonestack', 330], anim: 'mist', open: 0.96 }), Z('lanterns', 'ともしびのみち', { crowd: 0.7, light: 0.8, fog: 0.4, tint: '#4a4f78', walls: 1.0, frame: 'mistwood', frameScale: 1.05, hero: ['lanternpost', 350], field: ['🕯️', '🌿', '🕯️'], anim: 'glow', open: 0.97, marks: { color: '#ffe9a8', kind: 'sparkle' }, lane: ['🕯️', '🌿', '🕯️', '🍃'] }), Z('deep', 'みずうみのおく', { crowd: 0.4, light: 0.7, fog: 0.55, tint: '#3f4468', walls: 1.5, frameScale: 1.1, hero: ['mistwood', 400], anim: 'glow', open: 0.94 }), Z('bottom', 'みずうみのそこ', { crowd: 0.3, light: 0.54, fog: 0.68, tint: '#2a2e4e', walls: 1.55, frameScale: 1.2, hero: ['lantern', 310], field: ['🕯️', '🌫️', '🕯️'], anim: 'glow', open: 0.9, marks: { color: '#9aa3c8', kind: 'sparkle' } })],
        spots: [sp('shore', 'みずうみのほとり', -160, 250, 240, 'plaza', 2, { hub: true, zone: 'shore' }), sp('willow', 'やなぎのした', -460, 800, 200, 'shelter', 3, { prop: '🌳', zone: 'shore' }), sp('water', 'しずかなみずも', 110, 1000, 260, 'water', 3, { prop: '💧', zone: 'shore' }), sp('reeds', 'しずかなあしはら', -720, 1350, 200, 'grove', 2, { prop: '🌿', zone: 'reeds' }), sp('reedstone', 'あしのなかのいし', -1000, 1850, 160, 'rest', 1, { prop: '🪨', zone: 'reeds' }), sp('path1', 'きりのこみち', -160, 1500, 180, 'path', 1, { prop: '🌫️', zone: 'mist' }), sp('lantern', 'ともしびのおか', 190, 1950, 160, 'rest', 1, { prop: '🕯️', zone: 'mist' }), sp('stones', 'つみいし', -560, 2200, 170, 'rest', 2, { prop: '🪨', zone: 'mist' }), sp('path2', 'きりのおく', -200, 2550, 170, 'path', 0, { zone: 'mist' }), sp('mistfork', 'きりのわかれみち', -850, 2650, 160, 'path', 0, { zone: 'mist' }), sp('boat', 'ふるいこぶね', 330, 2900, 140, 'rest', 1, { secret: true, zone: 'lanterns' }), sp('lanternpath', 'ともしびのみち', 60, 3100, 180, 'path', 1, { prop: '🕯️', zone: 'lanterns' }), sp('lantern2', 'ふたつめのともしび', -520, 3250, 160, 'rest', 1, { prop: '🕯️', zone: 'lanterns' }), sp('oldpier', 'くちたさんばし', 420, 3550, 170, 'path', 0, { zone: 'lanterns' }), sp('path3', 'きりのもっとおく', -300, 3850, 170, 'path', 0, { zone: 'deep' }), sp('deepstones', 'みずぎわのつみいし', -820, 4000, 160, 'rest', 1, { prop: '🪨', zone: 'deep' }), sp('deep', 'みずうみのおく', -160, 4300, 140, 'deep', 0, { secret: true, prop: '🕯️', cam: 'near', zone: 'deep' }), sp('bottomgate', 'そこへのみち', -560, 4550, 140, 'path', 0, { secret: true, zone: 'bottom' }), sp('lastlantern', 'さいごのともしび', -900, 4700, 140, 'rest', 0, { secret: true, prop: '🕯️', zone: 'bottom' }), sp('bottom', 'みずうみのそこ', -220, 4750, 150, 'deep', 0, { secret: true, cam: 'near', zone: 'bottom' })],
        paths: [['shore', 'willow'], ['shore', 'water'], ['shore', 'path1'], ['willow', 'reeds', 'narrow'], ['reeds', 'reedstone', 'narrow'], ['reeds', 'stones', 'narrow'], ['reedstone', 'mistfork', 'narrow'], ['water', 'lantern'], ['lantern', 'path1', 'narrow'], ['path1', 'path2'], ['willow', 'stones', 'narrow'], ['stones', 'path2', 'narrow'], ['stones', 'mistfork', 'narrow'], ['mistfork', 'lantern2', 'narrow'], ['lantern', 'boat', 'secret'], ['path2', 'lanternpath'], ['lanternpath', 'lantern2', 'narrow'], ['lanternpath', 'oldpier', 'narrow'], ['boat', 'oldpier', 'secret'], ['lanternpath', 'path3'], ['lantern2', 'deepstones', 'narrow'], ['path3', 'deepstones', 'narrow'], ['oldpier', 'path3', 'narrow'], ['path3', 'deep', 'secret'], ['deepstones', 'bottomgate', 'secret'], ['deep', 'bottomgate', 'secret'], ['bottomgate', 'lastlantern', 'secret'], ['bottomgate', 'bottom', 'secret']] },
    };
    // 地域ごとの みための データ(レンダラーが よむ。ぜんぶ せかい たんい・いろ・しゅるい の 指定だけ)
    //   backdrop: 地平線の おくに みえる シルエット(えんけい)  lane: こみちの わきの ちいさな もの(てまえ)
    //   wall: みちの りょうわきに ならぶ おおきな もの(さきが みえない ようにする しゃへいぶつ)
    //   marks: じめんの もよう  sky: そらの えんしゅつ  floor: platform = うかんだ あしば  ambience: かんきょうおん(しょうらい ようの めじるし)
    const WORLD_STYLE = {
      home: { backdrop: 'hills', lane: ['🌷', '🪴', '🪵', '🌼', '🐾', '🪧'], wall: ['🌳', '🏠', '🌳'], marks: { color: '#7fbf5f', kind: 'tuft' }, ambience: 'garden', hint: ['🌷', '🌼', '✨'], edge: '#c9b98a' },
      city: { backdrop: 'skyline', lane: ['🚦', '💡', '🪧', '🚧', '🗑️', '🚲'], wall: ['🏢', '🏬', '🏢', '🌳'], marks: { color: '#8d919a', kind: 'stone' }, ambience: 'city', hint: ['🐾', '💡', '🌼'], edge: '#7d7f88' },
      countryside: { backdrop: 'hills', lane: ['🌾', '🌻', '🪵', '🌱', '🪵', '🪧'], wall: ['🌳', '🌳', '🌳'], marks: { color: '#86b85a', kind: 'tuft' }, ambience: 'meadow', hint: ['🌼', '🌼', '🌻'], edge: '#b9a06a' },
      forest: { backdrop: 'treeline', lane: ['🍄', '🌿', '🪵', '🌰', '🍂', '🌱'], wall: ['🌲', '🌳', '🌲'], marks: { color: '#4f8a45', kind: 'tuft' }, ambience: 'forest', hint: ['🌼', '✨', '🍄'], edge: '#5f4a2a' },
      mountain: { backdrop: 'peaks', lane: ['🌼', '🥾', '🪧', '🥾', '🏕️', '🌼'], wall: ['🌲', '🌲', '🌲'], marks: { color: '#8a8d78', kind: 'stone' }, ambience: 'wind', hint: ['🌼', '🪨', '✨'], edge: '#6f6a58' },
      snow: { backdrop: 'snowpeaks', lane: ['❄️', '🌨️', '🌲', '🪵', '🌲', '🛷'], wall: ['🌲', '🌲', '🌲'], marks: { color: '#ffffff', kind: 'sparkle' }, ambience: 'snowwind', hint: ['🐾', '🐾', '✨'], edge: '#b8c8d8' },
      sea: { backdrop: 'seahorizon', lane: ['🐚', '🏖️', '⛱️', '🪸', '🌴', '🏄'], wall: ['🌴', '🌴', '🌴'], marks: { color: '#f8efd0', kind: 'stone' }, ambience: 'waves', hint: ['🐚', '🐚', '✨'], edge: '#d8c898' },
      deepsea: { backdrop: 'abyss', sky: 'bubbles', lane: ['🪸', '🫧', '🐚', '🌿', '✨', '⚓'], wall: ['🪸', '🌿', '🪸'], marks: { color: '#5aa5d8', kind: 'sparkle' }, ambience: 'underwater', hint: ['🫧', '🫧', '✨'], edge: '#3f6f9f' },
      river_lake: { backdrop: 'lakehills', lane: ['🪷', '🌿', '💧', '🌳', '💧', '🎣'], wall: ['🌳', '🌳', '🌳'], marks: { color: '#7fbf6a', kind: 'tuft' }, ambience: 'stream', hint: ['🪷', '🌿', '✨'], edge: '#a08a5a' },
      jungle: { backdrop: 'treeline', lane: ['🌺', '🌿', '🍌', '🌳', '🌴', '🌱'], wall: ['🌴', '🌳', '🌴'], marks: { color: '#3f8a3f', kind: 'tuft' }, ambience: 'jungle', hint: ['🌺', '🌿', '✨'], edge: '#5f5a3a' },
      desert: { backdrop: 'dunes', lane: ['🌵', '🏺', '🌴', '⛺', '🏺', '🌵'], wall: ['🌵', '🌵', '🌵'], marks: { color: '#e8d29a', kind: 'stone' }, ambience: 'desertwind', hint: ['🏺', '🌵', '✨'], edge: '#c9a86a' },
      star_stop: { backdrop: 'skystops', sky: 'stars', floor: { kind: 'platform', half: 960 }, lane: ['🏮', '✨', '🪑', '🔭', '✨', '🏮'], wall: ['☁️', '☁️', '☁️'], marks: { color: '#ffe9a8', kind: 'sparkle' }, glowPath: true, ambience: 'space', hint: ['✨', '⭐', '✨'], edge: '#c9b8ff' },
      memory_lake: { backdrop: 'mist', sky: 'mist', lane: ['🕯️', '🌿', '🍃', '🍃', '💧', '🕯️'], wall: ['🌳', '🌳', '🌳'], marks: { color: '#9aa3c8', kind: 'sparkle' }, ambience: 'still', hint: ['🕯️', '🍃', '✨'], edge: '#7a80a8' },
    };
    for (const id in WORLD_STYLE) Object.assign(WORLDS[id], WORLD_STYLE[id]);

    // ================= 地域の こせい(いろ・ひかり・みつど・じめん・ちゅうけい) =================
    // 「地域を きりかえた しゅんかん、せつめい なしで どこへ きたか わかる」ように、
    // 地域ごとに じめんの もよう(detail)・みちから はなれた ばしょの 群生(field)・
    // ぞうけいぶつ(structs)・がめんを おおう くうき(canopy)・みとおし(view)・
    // みつど(density)・じめんの おおきな ちけい(terrain)を かえる。
    // ここは ぜんぶ「せかい」の データ で、え(canvas)は これを よんで えがくだけ。
    // あとで Three.js の レンダラーに さしかえても、おなじ 地域の こせいを そのまま つかえる。
    //   detail : [しゅるい, いろ, かず, ちいさい, おおきい] じめんに ちらす もよう(ひとつの 地域に 2〜4そう)
    //   field  : { pool, clusters, per, spread, size } みちの そとの 群生(おなじ ものの コピーに 見えない よう
    //            ひとかたまり ごとに おおきさを かえる)
    //   structs: [しゅるい, かず, おきかた(path/field/spot/edge), おおきさ] canvas で えがく ぞうけいぶつ
    //   canopy : がめんに かぶせる くうき(このは・ひかりの すじ・オーロラ・ネオン…)
    //   terrain: coast(かたがわが みず)/ river(かわが とおる)/ chasm(かいこう)
    //   density: ちゅうけいの おおさ、view: みとおし(とおくまで みえるか)
    const WORLD_THEME = {
      home: { density: 0.95, view: 1.05, canopy: 'warm',
        detail: [['tuft', '#7fbf5f', 3, 16, 38], ['petal', '#ffc2d8', 1.3, 9, 18], ['step', '#d8c9a8', 0.7, 26, 48]],
        field: { pool: ['🌷', '🌼', '🪴', '🌸'], clusters: 10, per: [2, 4], spread: 120, size: [40, 72] },
        structs: [['fence', 9, 'path', 92], ['planter', 8, 'spot', 78], ['lantern', 7, 'path', 74]] },
      // とかい: ネオンの はんかがい。よるは ネオンが つよく ひかり、あめの ひは じめんに うつる
      city: { density: 1.4, view: 1.0, canopy: 'neon', backdrop: 'neonskyline',
        detail: [['gravel', '#6e727c', 2.6, 10, 22], ['tile', '#8d919a', 1.8, 50, 110], ['manhole', '#5a5e68', 0.25, 26, 34], ['puddle', '#9fb6d8', 0.45, 30, 70]],
        field: { pool: ['🪴', '🚲', '🗑️', '🚧'], clusters: 9, per: [2, 3], spread: 110, size: [44, 74] },
        structs: [['neonsign', 16, 'path', 190], ['shopfront', 9, 'edge', 220], ['streetlight', 11, 'path', 150], ['vending', 9, 'path', 92], ['guardrail', 11, 'path', 80], ['crosswalk', 5, 'spot', 200]] },
      // いなか: とおくまで みえる のどかな 田園。オブジェは すくなく、そらと 畑で ひろさを だす
      countryside: { density: 0.55, view: 1.45, canopy: null, backdrop: 'farhills',
        detail: [['tuft', '#86b85a', 3, 16, 40], ['furrow', '#b9a06a', 1.3, 60, 130], ['straw', '#e0c878', 1.2, 12, 24]],
        field: { pool: ['🌾', '🌻', '🌼', '🌱'], clusters: 12, per: [3, 6], spread: 210, size: [32, 56] },
        structs: [['fence', 16, 'path', 96], ['hayroll', 9, 'field', 110], ['barn', 4, 'edge', 240], ['crop', 12, 'field', 150]] },
      // もり: おくへ いくほど くらく なる 迷路。こけ・おちば・ねっこ・きりかぶ・キノコの 群生
      forest: { density: 1.5, view: 0.8, canopy: 'shafts',
        detail: [['moss', '#3f7a3a', 1.4, 70, 170], ['leafpile', '#8a6a3a', 1.1, 40, 90], ['root', '#6b4a2a', 0.8, 50, 110], ['tuft', '#4f8a45', 1.2, 20, 40], ['damp', '#2f5a34', 0.6, 90, 200]],
        field: { pool: ['🍄', '🌿', '🌰', '🪵', '🌱'], clusters: 16, per: [2, 5], spread: 150, size: [30, 70] },
        structs: [['stump', 9, 'field', 110], ['log', 8, 'field', 140], ['fern', 14, 'path', 86], ['bigrock', 12, 'field', 140], ['mushroomcluster', 12, 'field', 120]] },
      // やま: のぼるほど たかく なる。がれ場・ケルン・がけ・つりばし
      mountain: { density: 0.85, view: 1.3, canopy: 'clouds',
        detail: [['gravel', '#8a8d78', 3.4, 14, 34], ['rockface', '#6f6a58', 1.1, 40, 110], ['tuft', '#7a9a5a', 1.4, 16, 32]],
        field: { pool: ['🌲', '🌼', '🥾'], clusters: 9, per: [2, 4], spread: 150, size: [46, 92] },
        structs: [['cairn', 12, 'path', 84], ['cliff', 12, 'edge', 320], ['bigrock', 30, 'field', 200], ['ropebridge', 3, 'path', 260], ['tent', 4, 'spot', 100]] },
      // ゆきぐに: しろく ひろく しずか。よるは オーロラ
      snow: { density: 0.6, view: 1.25, canopy: 'aurora',
        detail: [['drift', '#aeb6d2', 2.6, 70, 180], ['sparkle', '#e8f4ff', 2.2, 9, 18], ['footprint', '#b3bdd3', 1, 20, 34], ['ice', '#bcd8ec', 0.9, 34, 70]],
        field: { pool: ['🌲', '🪵', '🌲', '🌲'], clusters: 10, per: [2, 4], spread: 190, size: [44, 90] },
        structs: [['igloo', 5, 'spot', 130], ['firewood', 9, 'path', 80], ['snowfence', 12, 'path', 90], ['icepillar', 20, 'field', 160]] },
      // うみ: かたがわが うみ。すなもん・ながれぎ・さんばし。ゆうがたは うみに ひかりの みち
      sea: { density: 0.75, view: 1.4, canopy: 'sunpath', terrain: { kind: 'coast', side: -1, at: 0.4 },
        detail: [['ripple', '#e6d4a8', 2.2, 90, 210], ['shell', '#fff6e0', 0.5, 9, 16], ['wet', '#d8c9a0', 0.8, 90, 190]],
        field: { pool: ['🐚', '🌴', '🐚', '⛱️'], clusters: 7, per: [2, 4], spread: 160, size: [26, 52] },
        structs: [['parasol', 7, 'spot', 110], ['pier', 2, 'spot', 300], ['driftwood', 14, 'field', 130], ['rockpool', 10, 'field', 130], ['bigrock', 14, 'field', 150]] },
      // しんかい: くらくて みとおしが きかない。ひかるものが とおくに みえる
      deepsea: { density: 1.3, view: 0.55, canopy: 'marine', terrain: { kind: 'chasm', half: 230, pts: [[820, -200], [700, 900], [900, 1800], [1150, 2600], [1000, 3500], [1150, 4400], [1400, 5300], [1150, 6100], [1450, 6900], [1250, 7900]] },
        detail: [['sand', '#3f6f9f', 2.4, 50, 120], ['glow', '#5ad8e8', 2.4, 8, 18], ['crack', '#0d1f38', 0.9, 50, 120]],
        field: { pool: ['🪸', '🫧', '🌿', '🐚'], clusters: 14, per: [2, 5], spread: 140, size: [30, 62] },
        structs: [['kelp', 16, 'field', 190], ['vent', 6, 'field', 130], ['wreck', 2, 'spot', 320], ['ruinpillar', 7, 'field', 200], ['glowcoral', 7, 'field', 110]] },
      // かわ・みずうみ: かわ そのものが ランドマーク。かわらの いし・あし・きの はし
      river_lake: { density: 1.0, view: 1.15, canopy: 'rivermist', terrain: { kind: 'river', half: 200, pts: [[-780, -200], [-640, 900], [-500, 1500], [-250, 1900], [0, 2250], [140, 2750], [260, 3150], [-20, 3550], [-330, 3950], [-520, 4400], [-430, 4750], [-250, 5250], [-330, 5700], [-520, 6150], [-330, 6700], [-300, 7400], [-380, 8200]] },
        detail: [['pebble', '#a08a5a', 3, 13, 30], ['tuft', '#7fbf6a', 2.4, 16, 38], ['wet', '#8aa2a8', 0.9, 30, 70]],
        field: { pool: ['🪷', '🌿', '💧', '🌱'], clusters: 13, per: [2, 5], spread: 140, size: [38, 78] },
        structs: [['reed', 26, 'path', 110], ['woodbridge', 2, 'spot', 280], ['riverrock', 24, 'field', 130], ['waterwheel', 1, 'spot', 200]] },
      // ジャングル: しょくぶつが せまってくる。みとおしが いちばん せまく、遺跡が ある
      jungle: { density: 1.85, view: 0.6, canopy: 'leaves', backdrop: 'canopy',
        detail: [['under', '#2f6a2f', 1.8, 24, 56], ['leafpile', '#5a7a3a', 1.0, 40, 90], ['mud', '#6a5a3a', 1.1, 70, 160], ['root', '#4a3a24', 1.2, 60, 130], ['damp', '#254a28', 0.6, 100, 220]],
        field: { pool: ['🌿', '🌺', '🍌', '🌱', '🌴'], clusters: 20, per: [3, 6], spread: 130, size: [34, 78] },
        structs: [['bigleaf', 24, 'path', 200], ['vine', 18, 'path', 240], ['ruinpillar', 9, 'field', 220], ['buttress', 9, 'field', 180]] },
      // さばく: ひろさと こどく。ちいさな ものは すくなく、おおきな 岩山・遺跡・砂丘で うめる
      desert: { density: 0.35, view: 1.7, canopy: 'heat', backdrop: 'mesas',
        detail: [['ripple', '#e8d29a', 2.6, 120, 280], ['gravel', '#c9a86a', 1.3, 10, 24]],
        field: { pool: ['🌵', '🏺', '🌵'], clusters: 7, per: [2, 4], spread: 240, size: [40, 80] },
        structs: [['mesa', 8, 'edge', 460], ['dune', 18, 'field', 340], ['pot', 7, 'spot', 80], ['obelisk', 6, 'field', 230], ['bigrock', 12, 'field', 170], ['tent', 4, 'spot', 110]] },
      // ほしぞら: うかぶ しまを わたる。しまと しまの あいだの くうはくが えんしゅつ
      star_stop: { density: 0.7, view: 1.5, canopy: 'motes',
        detail: [['glowedge', '#c9b8ff', 1.2, 30, 70], ['sparkle', '#ffe9a8', 2.6, 8, 18]],
        field: { pool: ['✨', '✨', '🏮', '✨'], clusters: 7, per: [2, 3], spread: 150, size: [24, 46] },
        structs: [['crystal', 20, 'field', 180], ['lightbridge', 4, 'path', 240], ['stoplamp', 9, 'path', 140], ['telescope', 2, 'spot', 150]] },
      // きおくのみずうみ: しずかで よはくが おおい。あおい き と ちいさな あかり
      memory_lake: { density: 0.5, view: 0.9, canopy: 'mistveil', terrain: { kind: 'coast', side: 1, at: 0.72 },
        detail: [['wet', '#7a80a8', 2, 70, 150], ['sparkle', '#9aa3c8', 2, 8, 17], ['oldtile', '#5f6486', 1, 50, 100]],
        field: { pool: ['🕯️', '🌿', '🌿', '🍃'], clusters: 7, per: [2, 3], spread: 170, size: [30, 54] },
        structs: [['lantern', 12, 'path', 86], ['oldpost', 9, 'path', 110], ['bluetree', 9, 'field', 240], ['stonestack', 15, 'field', 120]] },
    };
    for (const id in WORLD_THEME) Object.assign(WORLDS[id], WORLD_THEME[id]);

    // ================= かぜ と うごき(地域ごと) =================
    // 「え」が よむ データ。かぜの つよさ と はやさ、その 地域で 何が うごくか。
    // Three.js でも おなじ かぜで 草木を ゆらせる ように、せかいの がわに もつ
    //   wind : [つよさ(0〜1), はやさ(rad/s くらい)]
    //   motion: その 地域で うごく もの(leaves=草木 / glow=あかり / mist=きり /
    //           water=みず / neon=ネオン / sand=すな / snow=ゆき / motes=ひかりの つぶ)
    const WORLD_MOTION = {
      home: { wind: [0.5, 1.5], motion: ['leaves', 'glow'] },
      city: { wind: [0.25, 1.2], motion: ['neon', 'glow'] },
      countryside: { wind: [1.0, 1.1], motion: ['leaves'] },
      forest: { wind: [0.55, 1.3], motion: ['leaves', 'glow'] },
      mountain: { wind: [0.8, 1.6], motion: ['leaves', 'mist'] },
      snow: { wind: [0.7, 0.9], motion: ['snow', 'glow'] },
      sea: { wind: [0.75, 1.2], motion: ['water', 'leaves'] },
      deepsea: { wind: [0.3, 0.55], motion: ['water', 'glow', 'motes'] },
      river_lake: { wind: [0.6, 1.25], motion: ['water', 'leaves'] },
      jungle: { wind: [0.4, 0.85], motion: ['leaves', 'water'] },
      desert: { wind: [0.55, 0.8], motion: ['sand'] },
      star_stop: { wind: [0.2, 0.6], motion: ['motes', 'glow'] },
      memory_lake: { wind: [0.25, 0.5], motion: ['mist', 'glow', 'water'] },
    };
    for (const id in WORLD_MOTION) Object.assign(WORLDS[id], WORLD_MOTION[id]);

    // ================= 地域の くうかん こうせい =================
    // 「その ばしょが せいりつ している」ように するには、こものを ふやす のでは なく
    // 「じぶんは なにの うえ/あいだを あるいているのか」を 地域ごとに かえる。
    //   ground : じめん そのもの(おおきな くぎり。田んぼ・車道・雪原・砂浜…)
    //   frame  : みちの りょうがわを かこむ おおきな もの(ビル・岩壁・大木…)。じぶんより ずっと おおきい
    //   fore   : てまえを よこぎる もの(えだ・葉・柵・岩)。おくゆきを だす
    //   clutter: ちいさな こものを どれだけ へらすか(1 = これまで、0.4 = はんぶん いか)
    // ぜんぶ「せかい」の データ。canvas は これを よんで えがくだけ なので、
    // Three.js では おなじ くぎりを 3D の 地面・かべ・みずめん に おきかえられる
    const WORLD_SPACE = {
      // おうち: 人が くらしている 庭。木は わき やくに して、しばふ・敷石・テラスを 主役に
      home: { clutter: 0.44, framePer: 300, frame: ['hedge', 330, 260, 0.7], fore: ['fencerail', 2.4, 200], edge: ['hedge', 'planter'],
        areas: [['lawn', 8, [560, 460]], ['terrace', 4, [340, 260]], ['flowerbed', 6, [260, 170]]] },
      // とかい: 車道と 歩道の あいだを あるく。左右は ビルの かべ
      city: { clutter: 0.68, framePer: 300, frame: ['building', 470, 580, 0.58], fore: ['guardpost', 3.0, 230], edge: ['building', 'building', 'shopfront'],
        areas: [['road', 9, [640, 520]], ['sidewalk', 8, [300, 420]], ['crossing', 4, [300, 210]], ['block', 6, [520, 420]]] },
      // いなか: 田んぼと 畑の あいだの あぜみち
      countryside: { clutter: 0.3, frame: ['woodfence', 420, 270, 0.52], fore: ['ricestalk', 2.2, 200], edge: ['farmhouse', 'hayroll', 'barn'],
        areas: [['paddy', 7, [760, 600]], ['cropfield', 7, [600, 460]]] },
      // もり: 木の あいだの ほそい みち。幹が 視界を せまくする
      forest: { clutter: 0.62, framePer: 285, frame: ['bigtrunk', 520, 420, 0.46], fore: ['branch', 2.7, 200], edge: ['bigtrunk', 'bigtrunk', 'bigrock'],
        areas: [['undergrowth', 12, [520, 420]], ['mossbed', 8, [380, 300]]] },
      // やま: しゃめんの とざんどう。がけが 画面の はしを ふさぐ
      mountain: { clutter: 0.42, frame: ['cliffwall', 560, 340, 0.54], fore: ['ledgerock', 2.2, 220], edge: ['cliff', 'bigrock', 'pinewall'],
        areas: [['scree', 12, [560, 460]], ['ridge', 6, [700, 380]]] },
      // ゆきぐに: ひろい 雪原。木は ふやさず、雪の おうとつ と 凍った湖で
      snow: { clutter: 0.26, frame: ['snowbank', 460, 360, 0.54], fore: ['snowdrift', 1.6, 280], edge: ['snowbank', 'pinewall', 'icepillar'],
        areas: [['snowfield', 14, [880, 700]], ['frozen', 3, [660, 500]], ['snowwood', 5, [520, 400]]] },
      // うみ: 波打ちぎわに そって あるく。ひだりは うみ、みぎは 砂丘と ヤシ
      sea: { clutter: 0.3, frame: ['duneridge', 480, 420, 0.58], fore: ['palmfrond', 0.7, 110], edge: ['duneridge', 'searock', 'palmgrove'],
        areas: [['dunefield', 10, [560, 460]]], shore: [['wetsand', 150]] },
      // しんかい: かいこうの ふちを すすむ。りょうがわは 岩壁と サンゴの かべ
      deepsea: { clutter: 0.45, frame: ['reefwall', 520, 470, 0.64], fore: ['coralarm', 2.0, 170], edge: ['reefwall', 'kelpwall', 'reefwall'],
        areas: [['seabed', 10, [560, 460]], ['fissure', 7, [480, 320]], ['reefflat', 6, [420, 340]]] },
      // かわ: かわぞいの みち。かわが 画面を よこぎる
      river_lake: { clutter: 0.36, frame: ['riverwood', 480, 250, 0.56], fore: ['reedclump', 2.4, 220], edge: ['riverwood', 'riverwood', 'riverrock'],
        areas: [['gravelbar', 9, [520, 420]], ['wetgrass', 8, [460, 380]], ['shallow', 5, [420, 300]]] },
      // ジャングル: しょくぶつの なかに はいりこむ。道は 埋もれている
      jungle: { clutter: 0.7, framePer: 250, frame: ['bigtrunk', 480, 440, 0.6], fore: ['hugeleaf', 1.9, 140], edge: ['bigtrunk', 'buttress', 'bigtrunk'],
        areas: [['undergrowth', 14, [460, 380]], ['mudflat', 7, [380, 300]], ['rootmat', 8, [420, 340]]] },
      // さばく: きょだいな すなおかを こえる。こものは ふやさない
      desert: { clutter: 0.18, frame: ['dunewall', 620, 520, 0.5], fore: ['sandcrest', 1.6, 380], edge: ['mesa', 'dunewall', 'bigrock'],
        areas: [['sandflat', 10, [900, 720]], ['rockflat', 5, [620, 460]]] },
      // ほしぞら: うきしまと うきしまの あいだ。あしもとが うかんで いる
      star_stop: { clutter: 0.3, frame: ['islandedge', 440, 400, 0.44], fore: ['cloudwisp', 1.6, 320], edge: ['crystal', 'islandedge', 'stoplamp'],
        areas: [['stonedeck', 9, [520, 420]], ['voidgap', 6, [620, 520]]] },
      // きおくのみずうみ: しずかな こはん。よはくを のこす
      memory_lake: { clutter: 0.22, frame: ['mistwood', 460, 300, 0.62], fore: ['lanternpost', 1.4, 240], edge: ['mistwood', 'bluetree', 'stonestack'],
        areas: [['wetstone', 10, [460, 380]], ['oldroad', 7, [300, 460]]] },
    };
    for (const id in WORLD_SPACE) Object.assign(WORLDS[id], WORLD_SPACE[id]);
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
        if (w.field && w.field.pool) push(id, 'field', w.field.pool);
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
    // みちの id: りょうはしの スポット id を じゅんばんを きめて つなぐ(せかいを なおしても ずれない)
    const pathKey = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
    const segKey = (seg) => pathKey(seg.a.id, seg.b.id);
    // めじるしを「見つけた」と する きょり。おおきい ものほど とおくから 見える
    const MARK_SIGHT = { 1: 2600, 2: 1200, 3: 700 };
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
        // ひろい せかいでは「にぎやかな ばしょ」に しっかり あつめる: crowd の さを きょうちょう する。
        // こう すると 地域が 3ばい ひろく なっても、ひろば の にぎやかさ は そのままで、おくは しずかに なる
        let w = Math.pow(Math.max(0.25, s.crowd), 2.6);
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
    // スポットの めじるしの うち「素材」の イラスト(なみ・こおり・ほし・むぎ・いわ…)は、
    // おおきく おくと「海辺の 素材を ならべた 画面」に なる ので canvas の 造形に おきかえる。
    // null = おかない(その 地域の 主役 — うみ そのもの・きり — に まかせる)
    const SPOT_PROP_STRUCT = {
      '🌊': null, '🌫️': null,
      '🐚': 'shellpile', '🧊': 'icepillar', '⭐': 'crystal', '🌟': 'crystal', '🪐': 'orrery', '🌙': 'moonlamp',
      '🌾': 'crop', '🪨': 'bigrock', '💧': 'springpool', '🏛️': 'ruingate', '🕯️': 'lanternpost', '🫧': 'vent', '💡': 'glowcoral',
      '🗿': 'statue', '🍄': 'mushroomcluster', '🪸': 'coralfan', '🪴': 'planter', '🪵': 'log',
      '🌿': (regionId) => (regionId === 'deepsea' ? 'kelp' : 'fern'),
    };
    // たてもの・のりもの など「もの」の イラストは スポットの めじるしの おおきさ(230)の まま
    const SPOT_PROP_BIG = new Set(['🏠', '🏚️', '🛖', '⛲', '🚉', '🏪', '🏬', '☕', '🛝', '⛺', '🚏', '⛩️', '🌉', '⛵', '🌳', '🏕️', '🎡']);
    // ねている もの: むきを ばらす(倒木が よこ一列に ならばない)
    const ANGLED_STRUCTS = new Set(['log', 'driftwood', 'bigrock', 'riverrock', 'ledgerock', 'stump', 'hayroll']);

    // ================= はっけんの おおきさ(しらせる レベル) =================
    // 「○○を みつけた」と 出して いいのは、**画面を 見て「ああ、これか」と わかる もの** だけ。
    // 471 の spot を 1件ずつ しらべた ところ(docs/qa/meguru-spot-audit-2026-09-21.md)、
    // 188 は その spot の ための ものが 画面に 1つも なく、ただの みちの 通過点だった。
    // それでも「にたようなこだちを みつけた」と 出て いた(しかも おなじ 名前の spot が 3つ ある)。
    //
    //   3  landmark / secret ……………… つよい えんしゅつ
    //   2  その spot の ものが 画面に ある … 「○○を みつけた」
    //   0  目じるしの ない 通過点 ………… しらせない(左上の チップが 名前を 出しつづける)
    //
    // buildWorld() が spot の ために **ほんとうに おく もの** から きめて いる:
    //   landmark → size 560 の めじるし / prop → struct か 絵文字 / kind:'water' → あおい みずたまり
    //   それ いがい は みちいろの 地面だけ(ぶんきの 🪧 は どの ぶんきにも ある ので 目じるしに ならない)
    //
    // **きろくは レベルに かかわらず これまで どおり** 全部の spot で とる。
    // かえるのは「しらせるか どうか」だけ。探索率・地図・セーブは 1つも かわらない
    const FOUND_PLAIN_PROP = new Set(['🪧', '🚦']);   // どの みちにも ある 道しるべ・信号
    function spotDiscoveryLevel(s) {
      if (!s) return 0;
      if (s.secret || s.landmark) return 3;
      if (s.kind === 'water') return 2;                 // 半径いっぱいの みずたまりが えがかれる
      // view: その ばしょ だけの けしきを もつ(みはらし など)。画面を 見て わかる
      if (s.view && s.view.length) return 2;
      if (!s.prop || FOUND_PLAIN_PROP.has(s.prop)) return 0;
      // SPOT_PROP_STRUCT が null の もの(🌊 / 🌫️)は **なにも おかれない**(地域の 主役に まかせる)
      if (Object.prototype.hasOwnProperty.call(SPOT_PROP_STRUCT, s.prop) && !SPOT_PROP_STRUCT[s.prop]) return 0;
      return 2;
    }
    // ---- Three.js の レンダラーから よむ ための「いみ」 ----
    // canvas は いろと かたちで えがくが、3D では「これは 地形か・たてものか・木か・水か・光か」で
    // メッシュを えらぶ。だから せかいの データ側で いみを もつ
    const STRUCT_ROLE = {
      building: 'building', shopfront: 'building', shopblock: 'building', alleywall: 'building', barn: 'building', farmhouse: 'building', house: 'building', igloo: 'building', tent: 'building', vending: 'building', ruingate: 'building', ruinwall: 'building', ruinpillar: 'building', obelisk: 'building', statue: 'building', telescope: 'building', woodbridge: 'building', ropebridge: 'building', lightbridge: 'building', pier: 'building', waterwheel: 'building', wreck: 'building',
      bigtrunk: 'vegetation', hedge: 'vegetation', riverwood: 'vegetation', mistwood: 'vegetation', bluetree: 'vegetation', parktree: 'vegetation', pinewall: 'vegetation', palmgrove: 'vegetation', cropline: 'vegetation', bigleaf: 'vegetation', vine: 'vegetation', fern: 'vegetation', reed: 'vegetation', reedclump: 'vegetation', kelp: 'vegetation', kelpwall: 'vegetation', crop: 'vegetation', mushroomcluster: 'vegetation', mushroomgrove: 'vegetation', hugeleaf: 'vegetation', palmfrond: 'vegetation', branch: 'vegetation', ricestalk: 'vegetation', stump: 'vegetation', log: 'vegetation', driftwood: 'vegetation', hayroll: 'vegetation', planter: 'vegetation', buttress: 'vegetation', coralfan: 'vegetation', coralarm: 'vegetation', glowgarden: 'vegetation', glowglade: 'vegetation',
      arch: 'terrain', cliffwall: 'terrain', cliff: 'terrain', bigrock: 'terrain', ledgerock: 'terrain', mesa: 'terrain', dune: 'terrain', duneridge: 'terrain', dunewall: 'terrain', sandcrest: 'terrain', snowbank: 'terrain', snowdrift: 'terrain', reefwall: 'terrain', searock: 'terrain', seacliff: 'terrain', islandedge: 'terrain', riverrock: 'terrain', rockpool: 'terrain', icepillar: 'terrain', cairn: 'terrain', stonestack: 'terrain', shellpile: 'terrain', cloudwisp: 'terrain',
      springpool: 'water', oasispool: 'water',
      neonsign: 'light', streetlight: 'light', lantern: 'light', lanternpost: 'light', stoplamp: 'light', vent: 'light', crystal: 'light', crystalgarden: 'light', glowcoral: 'light', moonlamp: 'light', orrery: 'light',
      fence: 'obstacle', parasol: 'obstacle', woodfence: 'obstacle', snowfence: 'obstacle', guardrail: 'obstacle', guardpost: 'obstacle', fencerail: 'obstacle', crosswalk: 'road', firewood: 'obstacle', pot: 'obstacle', oldpost: 'obstacle',
    };
    // ãããããã® çµµæå­(ãªã¿ã»ãããã»ã»ãã»ããã»ããã»ã²ããã»ãã)ã
    // ããã ãããã¯ãã® ããããª ãã®ã« ã¤ããã¨ããããã ç´ æç½®ãå ´ã« è¦ãã ã®ã§ã
    // canvas ã® é å½¢(SPOT_PROP_STRUCT)ã« ã¾ããããããããã ãããªã
    const MATERIAL_EMOJI = new Set(['🌊', '🧊', '⭐', '🌟', '🪐', '🌙', '🌾', '🪨', '💧', '🏛️', '🌫️', '🕯️', '🫧', '💡', '☁️', '☀️', '🏜️', '🌈', '💫', '🌨️', '⛰️', '🏔️']);
    const AREA_ROLE = { road: 'road', sidewalk: 'road', crossing: 'road', oldroad: 'road', stonedeck: 'road', terrace: 'road', paddy: 'water', frozen: 'water', shallow: 'water', voidgap: 'void' };

    // ================= え の ちょうせつ(レンダラーが つかう すうじ) =================
    // canvas レンダラー が よむ が、いみは「せかい」の がわに ある ので ここに おく。
    // Three.js の レンダラーも おなじ すうじ を つかえば、おなじ 見えかたに なる。
    // parallax: [むきで ながれる 量, よこに あるいた ぶん で ながれる 量]。そら < えんけい < てまえ
    // occlusion: じぶんを かくす ものだけ を すけさせる ときの さいていの こさ と、きりかえの はやさ
    // anim: つぶの かず(おもい→かるい)と、かぜで くさきが たおれる 量
    const RENDER_TUNING = {
      parallax: { sky: [1.4, 0.02], far: [2.6, 0.075], near: [4.6, 0.40] },
      occlusion: { min: 0.52, cover: 0.22, span: 0.55, inSpeed: 7, outSpeed: 3.4 },
      anim: { counts: [7, 13, 21], sway: 0.05 },
    };
    // じぶんを かくして いるか どうかを はかる ための、しゅるいごとの「あたり」の おおきさ。
    // [よこ半分, たかさ] を えがき はば(px)の 何ばい で もつ。ほそい みき は ほそく、
    // よこに ながい かこみ は ひろく。これが ある ので となりの ものまで いっしょに すけない
    const OCCLUDER_BOX = { glyph: [0.32, 0.95], landmark: [0.34, 1.0], bigtrunk: [0.16, 1.55], building: [0.40, 2.6], alleywall: [0.40, 2.6], shopblock: [0.40, 1.0], cliffwall: [0.60, 1.6], seacliff: [0.60, 1.7], cliff: [0.50, 1.05], searock: [0.62, 0.85], dunewall: [0.95, 0.9], duneridge: [0.95, 0.6], dune: [0.6, 0.35], sandcrest: [1.0, 0.3], snowbank: [0.9, 0.5], snowdrift: [0.7, 0.3], reefwall: [0.6, 1.9], kelpwall: [0.5, 1.9], hedge: [0.55, 0.55], pinewall: [0.5, 1.5], palmgrove: [0.5, 1.3], riverwood: [0.4, 1.0], mistwood: [0.35, 1.05], bluetree: [0.35, 1.0], parktree: [0.42, 1.0], farmhouse: [0.58, 1.05], house: [0.58, 1.05], barn: [0.48, 1.0], mesa: [0.5, 0.65], islandedge: [0.72, 0.2], ruinwall: [0.6, 0.78], ruinpillar: [0.16, 0.95], cropline: [0.9, 0.35], woodfence: [0.52, 0.45], bigleaf: [0.36, 0.6], hugeleaf: [0.62, 0.75], palmfrond: [0.4, 0.9], branch: [0.75, 0.95], vine: [0.1, 1.05], buttress: [0.5, 0.9], wreck: [0.55, 0.95], bigrock: [0.44, 0.5], arch: [0.52, 1.0], ledgerock: [0.6, 0.42], fern: [0.26, 0.52], reedclump: [0.3, 0.7], reed: [0.2, 0.75], cloudwisp: [0.5, 0.2], ricestalk: [0.35, 0.58], crystal: [0.16, 0.85], icepillar: [0.18, 0.85] };
    // ================= あたりはんてい(せかい ざひょうの 正本) =================
    // 「絵の 四角」では なく「地面に ついて いる ところ」を もつ。
    // 木は みき だけ、家は たてもの 本体、柵は ほそい すじ。は や 草では 止まらない。
    //   shape: 'circle'(まるい 接地) / 'box'(かべ・たてもの。みちに そって ang を もつ)
    //   w: よこ半径 ÷ size、d: おくゆき半径 ÷ size(box のみ)
    //   null = 通れる(草・花・葉・こもの・はし・エフェクト)
    // px では なく world たんい なので、Three.js でも おなじ 値を つかえる
    const COLLIDER = {
      // --- たてもの・かべ(むきつきの 箱) ---
      building: { shape: 'box', w: 0.38, d: 0.28 }, alleywall: { shape: 'box', w: 0.38, d: 0.24 },
      shopblock: { shape: 'box', w: 0.36, d: 0.24 }, shopfront: { shape: 'box', w: 0.30, d: 0.20 },
      house: { shape: 'box', w: 0.40, d: 0.30 }, farmhouse: { shape: 'box', w: 0.42, d: 0.30 },
      barn: { shape: 'box', w: 0.40, d: 0.30 }, ruinwall: { shape: 'box', w: 0.55, d: 0.20 },
      ruingate: { shape: 'box', w: 0.40, d: 0.16 }, wreck: { shape: 'circle', w: 0.50 },
      igloo: { shape: 'circle', w: 0.40 }, tent: { shape: 'circle', w: 0.34 },
      // --- 地形(崖・メサ・すなやま・ゆきの どて) ---
      cliffwall: { shape: 'box', w: 0.55, d: 0.26 }, seacliff: { shape: 'box', w: 0.55, d: 0.26 },
      cliff: { shape: 'box', w: 0.46, d: 0.24 }, mesa: { shape: 'box', w: 0.46, d: 0.30 },
      reefwall: { shape: 'box', w: 0.55, d: 0.24 }, kelpwall: { shape: 'box', w: 0.42, d: 0.20 },
      dunewall: { shape: 'box', w: 0.80, d: 0.30 }, duneridge: { shape: 'box', w: 0.80, d: 0.24 },
      snowbank: { shape: 'box', w: 0.72, d: 0.26 }, islandedge: { shape: 'box', w: 0.66, d: 0.22 },
      bigrock: { shape: 'circle', w: 0.40 }, searock: { shape: 'circle', w: 0.52 },
      ledgerock: { shape: 'circle', w: 0.46 }, riverrock: { shape: 'circle', w: 0.28 },
      icepillar: { shape: 'circle', w: 0.16 }, crystal: { shape: 'circle', w: 0.14 },
      cairn: { shape: 'circle', w: 0.26 }, stonestack: { shape: 'circle', w: 0.24 },
      shellpile: { shape: 'circle', w: 0.30 },
      // --- き(みき だけ。は では 止まらない) ---
      bigtrunk: { shape: 'circle', w: 0.17 }, parktree: { shape: 'circle', w: 0.11 },
      riverwood: { shape: 'circle', w: 0.10 }, mistwood: { shape: 'circle', w: 0.10 },
      bluetree: { shape: 'circle', w: 0.10 }, pinewall: { shape: 'circle', w: 0.13 },
      palmgrove: { shape: 'circle', w: 0.11 }, stump: { shape: 'circle', w: 0.26 },
      buttress: { shape: 'circle', w: 0.34 }, hayroll: { shape: 'circle', w: 0.30 },
      log: { shape: 'box', w: 0.30, d: 0.11 }, driftwood: { shape: 'box', w: 0.30, d: 0.11 },
      // --- さく(ほそい すじ) ---
      hedge: { shape: 'box', w: 0.50, d: 0.26 }, woodfence: { shape: 'box', w: 0.50, d: 0.10 },
      snowfence: { shape: 'box', w: 0.48, d: 0.09 }, fencerail: { shape: 'box', w: 0.48, d: 0.09 },
      guardrail: { shape: 'box', w: 0.48, d: 0.09 }, fence: { shape: 'box', w: 0.46, d: 0.10 },
      cropline: { shape: 'box', w: 0.80, d: 0.16 },
      // --- みずたまり(景色の みず。みちの わきに ある ので よけて あるく) ---
      springpool: { shape: 'circle', w: 0.42 }, oasispool: { shape: 'circle', w: 0.88 },
      rockpool: { shape: 'circle', w: 0.34 },
      // --- ちいさな 立ちもの ---
      statue: { shape: 'circle', w: 0.18 }, obelisk: { shape: 'circle', w: 0.16 },
      ruinpillar: { shape: 'circle', w: 0.15 }, telescope: { shape: 'circle', w: 0.16 },
      orrery: { shape: 'circle', w: 0.24 }, guardpost: { shape: 'circle', w: 0.20 },
      vending: { shape: 'circle', w: 0.20 }, firewood: { shape: 'circle', w: 0.24 },
      pot: { shape: 'circle', w: 0.14 }, vent: { shape: 'circle', w: 0.20 },
      oldpost: { shape: 'circle', w: 0.08 }, lanternpost: { shape: 'circle', w: 0.08 },
      lantern: { shape: 'circle', w: 0.10 }, streetlight: { shape: 'circle', w: 0.08 },
      stoplamp: { shape: 'circle', w: 0.09 }, neonsign: { shape: 'circle', w: 0.14 },
      moonlamp: { shape: 'circle', w: 0.12 }, waterwheel: { shape: 'box', w: 0.32, d: 0.16 },
      // --- おおきな しょくぶつの かたまり ---
      mushroomgrove: { shape: 'circle', w: 0.28 }, glowgarden: { shape: 'circle', w: 0.30 },
      glowglade: { shape: 'circle', w: 0.34 }, crystalgarden: { shape: 'circle', w: 0.30 },
      coralfan: { shape: 'circle', w: 0.26 }, glowcoral: { shape: 'circle', w: 0.22 },
      coralarm: { shape: 'circle', w: 0.20 },
      // --- 通れる(null): 草・は・花・ちいさな きのこ・すなの うねり・くも・
      //     そして はし と さんばし(わたれないと こまる) ---
      fern: null, reed: null, reedclump: null, ricestalk: null, crop: null, vine: null,
      bigleaf: null, hugeleaf: null, palmfrond: null, branch: null, kelp: null,
      mushroomcluster: null, planter: null, parasol: null,
      dune: null, sandcrest: null, snowdrift: null, cloudwisp: null, scree: null,
      crosswalk: null, woodbridge: null, ropebridge: null, lightbridge: null, pier: null,
    };
    // 絵文字の けしき: たてもの・おおきな き・岩 だけ かたい。花や こものは 通れる
    const SOLID_EMOJI_BUILD = new Set(['🏢', '🏬', '🏠', '🏡', '🏚️', '🛖', '🏪', '🚉', '🏕️', '⛺', '⛩️', '🎡', '⛲', '🚏', '🏛️', '🗿', '⚓', '⛵', '🚧']);
    const SOLID_EMOJI_TREE = new Set(['🌳', '🌲', '🌴', '🌵', '🪸', '🪨']);
    // ランドマークの おおきな え: ねもと だけ。ちかづいて ながめられる ように のこす
    const LANDMARK_COLLIDER = { shape: 'circle', w: 0.13 };

    // prop 1つの あたりはんてい。通れる ものは null
    function colliderOf(p) {
      if (!p.solid) return null;
      const size = p.size || 160;
      if (p.landmark) return { shape: 'circle', hw: size * LANDMARK_COLLIDER.w, hd: size * LANDMARK_COLLIDER.w, ang: 0, kind: 'LM:' + p.landmark };
      if (p.struct) {
        const c = Object.prototype.hasOwnProperty.call(COLLIDER, p.struct)
          ? COLLIDER[p.struct]
          // ひょうに ない かたちは、絵の はんぷく(OCCLUDER_BOX)から ひかえめに みつもる
          : { shape: 'circle', w: Math.min(0.34, (OCCLUDER_BOX[p.struct] ? OCCLUDER_BOX[p.struct][0] : 0.3) * 0.55) };
        if (!c) return null;
        return { shape: c.shape, hw: size * c.w, hd: size * (c.d != null ? c.d : c.w), ang: p.ang || 0, kind: p.struct };
      }
      if (p.emoji) {
        if (SOLID_EMOJI_BUILD.has(p.emoji)) return { shape: 'circle', hw: size * 0.24, hd: size * 0.24, ang: 0, kind: p.emoji };
        if (SOLID_EMOJI_TREE.has(p.emoji)) return { shape: 'circle', hw: size * 0.17, hd: size * 0.17, ang: 0, kind: p.emoji };
        return null;
      }
      return null;
    }


    // あたりはんてい の やくわり(§正本): solid=かたい / water=みず(入れない) / boundary=せかいの ふち
    const COLLIDER_ROLE = { springpool: 'water', oasispool: 'water', rockpool: 'water',
      cliffwall: 'boundary', seacliff: 'boundary', cliff: 'boundary', mesa: 'boundary',
      dunewall: 'boundary', duneridge: 'boundary', snowbank: 'boundary', reefwall: 'boundary', islandedge: 'boundary' };
    const COLL_CLEAR = 26;   // みちの 通行帯の そとに かならず のこす すきま
    const COLL_MIN = 13;     // これより ちいさく なる なら いっそ 外す(こものに ぶつからない)
    const SPOT_CLEAR = 46;   // スポットの まんなかは かならず あける
    const COLL_CELL = 360;   // あたりはんてい の ます目(この なかだけ しらべる)
    const ACTOR_PAD = 34;    // ます目に 入れる ときの のりしろ(からだの 大きさ ぶん)
    const EMPTY_CELL = [];

    // 箱が「u の むきへ どこまで はみ出るか」(support)。まる は はんけい そのもの。
    // 箱の じく: よこ(w) = (sin ang, cos ang)、おくゆき(d) = (cos ang, -sin ang)
    function colliderReach(o, ux, uz) {
      if (o.shape !== 'box') return o.hw;
      const ex = Math.sin(o.ang), ez = Math.cos(o.ang);
      return o.hw * Math.abs(ux * ex + uz * ez) + o.hd * Math.abs(ux * ez - uz * ex);
    }
    // みち と スポットの 通行帯に 食いこむ ぶんを 縮める。むりなら false(おかない)。
    // 「道を ふさがない」を データの がわで まもる ので、あとから 迷路に ならない
    function clearCorridor(o, world) {
      const reach = Math.max(o.hw, o.hd);
      let k = 1;
      for (const s of world.segments || []) {
        const need = s.half + COLL_CLEAR;
        const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z, L2 = dx * dx + dz * dz || 1;
        const t = clamp(((o.x - s.a.x) * dx + (o.z - s.a.z) * dz) / L2, 0, 1);
        const px = s.a.x + dx * t, pz = s.a.z + dz * t;
        const d = Math.hypot(o.x - px, o.z - pz);
        if (d - reach >= need) continue;   // もともと じゅうぶん 遠い
        if (d <= need) return false;       // 通行帯の なかに いる: おけない
        const sup = colliderReach(o, (px - o.x) / d, (pz - o.z) / d);
        if (sup > 0.001) k = Math.min(k, (d - need) / sup);
      }
      for (const sp of world.spots || []) {
        const d = Math.hypot(o.x - sp.x, o.z - sp.z);
        if (d - reach >= SPOT_CLEAR) continue;
        if (d <= SPOT_CLEAR) return false;
        const sup = colliderReach(o, (sp.x - o.x) / d, (sp.z - o.z) / d);
        if (sup > 0.001) k = Math.min(k, (d - SPOT_CLEAR) / sup);
      }
      if (k >= 1) return true;
      o.hw *= k; o.hd *= k;
      return Math.max(o.hw, o.hd) >= COLL_MIN;
    }
    // せかいを つくる とき 1かいだけ: 絵の 大きさ から 接地の かたちを 出す
    function buildObstacles(world) {
      const out = [];
      for (const p of world.props) { const o = obstacleOf(p, world); if (o) out.push(o); }
      return out;
    }
    // 1 つ ぶん(buildWorldSteps が くぎりながら つかう)
    function obstacleOf(p, world) {
      const c = colliderOf(p); if (!c) return null;
      const o = { kind: c.kind, shape: c.shape, x: p.x, z: p.z, hw: c.hw, hd: c.hd, ang: c.ang, role: COLLIDER_ROLE[c.kind] || 'solid' };
      if (!clearCorridor(o, world)) return null;
      o.r = Math.max(o.hw, o.hd); // かこみ円(ます目わけ と ざっくり しらべ に つかう)
      return o;
    }
    // ます目(spatial grid)。まわりの ます目 1つ だけ 見れば よい ように、
    // 入れる ときに からだの 大きさ ぶん ひろげて おく。
    // せかいが ひろく なっても 1フレームの しごとは ふえない
    function buildCollisionGrid(list) {
      const g = { cell: COLL_CELL, minX: 0, minZ: 0, cols: 1, rows: 1, cells: [] };
      if (!list || !list.length) return g;
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const o of list) { const r = o.r + ACTOR_PAD; if (o.x - r < x0) x0 = o.x - r; if (o.x + r > x1) x1 = o.x + r; if (o.z - r < z0) z0 = o.z - r; if (o.z + r > z1) z1 = o.z + r; }
      g.minX = x0; g.minZ = z0;
      g.cols = Math.max(1, Math.ceil((x1 - x0) / COLL_CELL) + 1);
      g.rows = Math.max(1, Math.ceil((z1 - z0) / COLL_CELL) + 1);
      g.cells = new Array(g.cols * g.rows);
      for (const o of list) {
        const r = o.r + ACTOR_PAD;
        const cx0 = Math.max(0, Math.floor((o.x - r - x0) / COLL_CELL)), cx1 = Math.min(g.cols - 1, Math.floor((o.x + r - x0) / COLL_CELL));
        const cz0 = Math.max(0, Math.floor((o.z - r - z0) / COLL_CELL)), cz1 = Math.min(g.rows - 1, Math.floor((o.z + r - z0) / COLL_CELL));
        for (let cz = cz0; cz <= cz1; cz++) for (let cx = cx0; cx <= cx1; cx++) { const i = cz * g.cols + cx; (g.cells[i] || (g.cells[i] = [])).push(o); }
      }
      return g;
    }
    function collidersAt(world, x, z) {
      const g = world.collision; if (!g) return world.obstacles || EMPTY_CELL;
      const cx = Math.floor((x - g.minX) / g.cell), cz = Math.floor((z - g.minZ) / g.cell);
      if (cx < 0 || cz < 0 || cx >= g.cols || cz >= g.rows) return EMPTY_CELL;
      return g.cells[cz * g.cols + cx] || EMPTY_CELL;
    }
    // ぶつかったら「いちばん あさい むき」へ おし出す = かべに そって すべる。
    // ななめに あるいて 角に あたっても とまらない(スマホの パッドで ひっかからない)
    function pushOutCollider(pt, o, rad) {
      if (o.shape !== 'box') {
        const R = o.hw + rad, dx = pt.x - o.x, dz = pt.z - o.z, d = Math.hypot(dx, dz);
        if (d >= R) return false;
        if (d < 0.0001) { pt.x = o.x + R; return true; }
        pt.x = o.x + dx / d * R; pt.z = o.z + dz / d * R; return true;
      }
      const ex = Math.sin(o.ang), ez = Math.cos(o.ang);
      const rx = pt.x - o.x, rz = pt.z - o.z;
      const lx = rx * ex + rz * ez, lz = rx * ez - rz * ex;
      const hw = o.hw + rad, hd = o.hd + rad;
      const ox = hw - Math.abs(lx), oz = hd - Math.abs(lz);
      if (ox <= 0 || oz <= 0) return false;
      let nlx = lx, nlz = lz;
      if (ox < oz) nlx = lx < 0 ? -hw : hw; else nlz = lz < 0 ? -hd : hd;
      pt.x = o.x + nlx * ex + nlz * ez;
      pt.z = o.z + nlx * ez - nlz * ex;
      return true;
    }

    const OCCLUDER_LAYERS = new Set(['wall', 'landmark', 'side', 'frame', 'fore', 'struct']);
    // かぜで ゆれる くさき。かず は「たかさの なんわり よこへ たおれるか」の もと。
    // みき は ほとんど ゆれず、あし や はっぱ は よく ゆれる
    const SWAY_AMOUNT = { bigtrunk: 0.35, hedge: 0.5, riverwood: 0.8, mistwood: 0.7, bluetree: 0.7, parktree: 0.8, pinewall: 0.45, palmgrove: 1.1, cropline: 1.0, bigleaf: 1.2, vine: 1.4, fern: 1.0, reed: 1.5, reedclump: 1.4, kelp: 1.6, kelpwall: 1.5, crop: 1.2, hugeleaf: 1.1, palmfrond: 1.3, branch: 0.5, ricestalk: 1.4, coralfan: 0.8, coralarm: 0.7, glowgarden: 0.5, glowglade: 0.4, mushroomcluster: 0.25, mushroomgrove: 0.2, planter: 0.6, hayroll: 0.2 };
    // せかいを「いみ」で わけて かえす。Three.js の レンダラーは これを よんで、
    // terrain → 地面と 起伏、water → 水面、road → 道、building → たてもの、vegetation → 木と 草、
    // landmark → 遠くから みえる もの、obstacle → あたる もの、light → 光源 を つくれば よい。
    // canvas の レンダラーは いまの props/areas を そのまま よむ ので、この かんすうは よばない
    function worldLayers(world) {
      const L = { terrain: [], water: [], road: [], building: [], vegetation: [], landmark: [], obstacle: [], light: [], scenery: [] };
      const w = world;
      L.terrain.push({ kind: 'ground', colors: w.ground, minX: w.minX, maxX: w.maxX, len: w.len });
      if (w.terrain) { if (w.terrain.kind === 'coast') L.water.push({ kind: 'sea', side: w.terrain.side, shoreline: w.terrain.pts }); else if (w.terrain.kind === 'river') L.water.push({ kind: 'river', centerline: w.terrain.pts, half: w.terrain.half }); else L.terrain.push({ kind: 'chasm', centerline: w.terrain.pts, half: w.terrain.half }); }
      for (const b of w.shore || []) L.terrain.push({ kind: b[0], along: 'shoreline', width: b[1] });
      for (const sg of w.segments) L.road.push({ kind: sg.kind, from: sg.a.id, to: sg.b.id, a: { x: sg.a.x, z: sg.a.z }, b: { x: sg.b.x, z: sg.b.z }, half: sg.half });
      for (const sp0 of w.spots) { if (sp0.kind === 'water') L.water.push({ kind: 'pond', x: sp0.x, z: sp0.z, r: sp0.r, spot: sp0.id }); else L.road.push({ kind: 'spot', x: sp0.x, z: sp0.z, r: sp0.r, spot: sp0.id }); }
      for (const a of w.areas) (AREA_ROLE[a.kind] === 'water' ? L.water : AREA_ROLE[a.kind] === 'road' ? L.road : L.terrain).push({ kind: a.kind, x: a.x, z: a.z, w: a.w, h: a.h, ang: a.ang });
      for (const p of w.props) {
        if (p.landmark) { L.landmark.push({ kind: p.landmark, x: p.x, z: p.z, size: p.size, label: p.label, tier: p.tier || 1 }); continue; }
        if (p.struct) { const role = STRUCT_ROLE[p.struct] || 'obstacle'; const item = { kind: p.struct, x: p.x, z: p.z, size: p.size, ang: p.ang || 0, side: p.side || 1, layer: p.layer, role }; if (p.tier) item.tier = p.tier; (p.hero ? L.landmark : L[role]).push(item); continue; }
        if (p.emoji) L.scenery.push({ emoji: p.emoji, x: p.x, z: p.z, size: p.size, layer: p.layer });
      }
      // あたりはんてい は「せかい たんい の かたち」で わたす(円/箱 + むき + やくわり)。
      // Three.js でも 住民の うごきでも、この おなじ データを そのまま つかえる
      for (const o of w.obstacles || []) L.obstacle.push({ kind: o.kind, shape: o.shape, x: o.x, z: o.z, hw: o.hw, hd: o.hd, ang: o.ang, role: o.role, r: o.r });
      for (const z of w.zones) L.light.push({ kind: 'zone', id: z.id, x: z.x, z: z.z, light: z.mood.light != null ? z.mood.light : 1, fog: z.mood.fog || 0, tint: z.mood.tint || null });
      // 地区(zone): あかるさ だけでなく「どんな うごきの ある ところか」まで もつ。
      // anim = はっぱ/ゆき/すな/もや/みず/ひかり/ネオン/つぶ、open = ひろさ(1 より おおきい ほど ひろい)。
      // 地区の さかいめ は「いちばん ちかい 地区の 中心」で きまる(reach: 'nearest')
      L.zoneReach = 'nearest';
      // 地区の ひろがり(bounds)と となりの 地区(neighbors)。ひろい せかいでは
      // 「いま いる 地区と となりだけ」を うごかせば よい(ストリーミング)。
      // canvas は farCull で きって いる ので いまは つかわないが、Three.js が そのまま つかえる
      const zoneSpots = (id) => w.spots.filter((sp) => sp.zone === id);
      const zoneNear = new Map(w.zones.map((z) => [z.id, new Set()]));
      for (const sg of w.segments) { const a = sg.a.zone, b = sg.b.zone; if (a && b && a !== b) { zoneNear.get(a) && zoneNear.get(a).add(b); zoneNear.get(b) && zoneNear.get(b).add(a); } }
      L.zone = w.zones.map((z) => { const ss = zoneSpots(z.id);
        const bx = ss.length ? [Math.min(...ss.map((q) => q.x - q.r)), Math.max(...ss.map((q) => q.x + q.r))] : [z.x, z.x];
        const bz = ss.length ? [Math.min(...ss.map((q) => q.z - q.r)), Math.max(...ss.map((q) => q.z + q.r))] : [z.z, z.z];
        return { id: z.id, name: z.name, x: z.x, z: z.z,
          light: z.mood.light != null ? z.mood.light : 1, fog: z.mood.fog || 0, tint: z.mood.tint || null,
          walls: z.mood.walls != null ? z.mood.walls : 1, anim: z.mood.anim || null, open: z.mood.open || 1,
          frameKind: z.mood.frame || null, frameScale: z.mood.frameScale != null ? z.mood.frameScale : 1,
          hero: z.mood.hero ? z.mood.hero[0] : null, spots: ss.map((q) => q.id),
          bounds: { minX: bx[0], maxX: bx[1], minZ: bz[0], maxZ: bz[1] },
          neighbors: [...(zoneNear.get(z.id) || [])] }; });
      // ちかくの 地区だけを うごかす ための めやす(ワールド たんい)
      L.streaming = { cell: 1200, activeRadius: 3600, zoneReach: 'nearest' };
      // 空気と うごき: レンダラーが これだけで かぜ・そら・えんけい・てまえの そうを 組める
      L.env = { region: w.regionId, ground: w.ground, sky: w.sky, backdrop: w.backdrop, canopy: w.canopy,
        wind: w.wind, motion: w.motion, view: w.view, density: w.density, detail: w.detail, glowPath: !!w.glowPath };
      // カメラ: ばしょごとの りぐ(きょり・たかさ)と、ごく かるい えんしゅつ の つよさ。
      // Three.js でも おなじ すうじ を つかえば、おなじ 見えかたに なる
      L.camera = { profiles: CAM_PROFILES, motion: RULES.motion, spots: w.spots.map((sp) => { const k = sp.cam || (sp.secret ? 'secret' : sp.kind); return { id: sp.id, cam: CAM_PROFILES[k] ? k : 'default' }; }) };
      return L;
    }
    // ちずの もと。「あるいた けっか」だけを かえす 純すいな かんすう。
    // いまの 地域は sim.mapData() が、ほかの 地域は セーブの きろくから これを よぶ。
    // え には いっさい さわらない ので、Three.js に かわっても この データの まま つかえる
    function computeMapData(world, rec) {
      const L = worldLayers(world);
      const zoneById = new Map(L.zone.map((z) => [z.id, z]));
      const visited = (id) => rec.visitedZones.has(id);
      // まだ 行って いない 地区でも、ひみつ では ない みちで つながって いれば
      // 「あのへんに なにか ある」だけ うっすら 出す(ひみつ しか 通じて いない 地区は 出さない)
      const hinted = new Set();
      for (const sg of world.segments) {
        if (sg.kind === 'secret') continue;
        const az = sg.a.zone, bz = sg.b.zone; if (!az || !bz || az === bz) continue;
        if (visited(az) && !visited(bz)) hinted.add(bz);
        if (visited(bz) && !visited(az)) hinted.add(az);
      }
      const zones = L.zone.map((z) => {
        const seen = visited(z.id);
        // ちずに かく かたちは「見つけた スポット」から。worldLayers の bounds は
        // ひみつも 入れて いる ので、そのまま つかうと ぬりの ひろがりで ひみつの
        // いちが わかって しまう
        const own = z.spots.filter((id) => rec.discovered.has(id)).map((id) => world.spots.find((q) => q.id === id));
        const bounds = own.length
          ? { minX: Math.min(...own.map((q) => q.x - q.r)), maxX: Math.max(...own.map((q) => q.x + q.r)),
              minZ: Math.min(...own.map((q) => q.z - q.r)), maxZ: Math.max(...own.map((q) => q.z + q.r)) }
          : { minX: z.x - 420, maxX: z.x + 420, minZ: z.z - 420, maxZ: z.z + 420 };
        return { id: z.id, label: (world.zones.find((q) => q.id === z.id) || {}).label || z.id,
          x: z.x, z: z.z, bounds, neighbors: z.neighbors, tint: z.tint, fog: z.fog, open: z.open,
          visited: seen, hinted: !seen && hinted.has(z.id),
          spots: seen ? own.map((q) => q.id) : [] };
      });
      const spots = world.spots.filter((q) => rec.discovered.has(q.id)).map((q) => ({
        id: q.id, label: q.label, x: q.x, z: q.z, kind: q.kind, zone: q.zone || null,
        secret: !!q.secret, hub: !!q.hub, current: q.id === rec.hereSpot }));
      // みちは りょうはしを 見つけて いる ときだけ かく。そうしないと、
      // ふつうの みちで つながった ひみつの ばしょの いちが ちずから わかって しまう
      const paths = world.segments.filter((sg) => rec.walkedPaths.has(segKey(sg))
          && rec.discovered.has(sg.a.id) && rec.discovered.has(sg.b.id))
        .map((sg) => ({ key: segKey(sg), a: sg.a.id, b: sg.b.id, kind: sg.kind,
          ax: sg.a.x, az: sg.a.z, bx: sg.b.x, bz: sg.b.z }));
      // めじるしを ちずに のせる じょうけん: 大(tier 1)は とおくから 見えた だけで のる。
      // 中(tier 2)は その 地区へ 入ってから、小(tier 3)は その スポットを 見つけてから
      const markShown = (q) => {
        if (!rec.foundMarks.has(q.mid)) return false;
        if (q.mid.startsWith('hero:')) return rec.visitedZones.has(q.mid.slice(5));
        const sid = q.mid.slice(q.mid.indexOf(':') + 1);
        return q.tier === 1 ? true : rec.discovered.has(sid);
      };
      const landmarks = world.props.filter((q) => q.mid && markShown(q)).map((q) => ({
        mid: q.mid, kind: q.landmark || q.struct, x: q.x, z: q.z, tier: q.tier,
        label: q.label || null, zone: q.zone || null }));
      // すすみぐあい: ひみつを かぞえに 入れないので、のこりの ひみつの かずは わからない
      const openSpots = world.spots.filter((q) => !q.secret);
      const foundSecrets = world.spots.filter((q) => q.secret && rec.discovered.has(q.id)).length;
      const foundOpen = openSpots.filter((q) => rec.discovered.has(q.id)).length;
      const openZoneIds = new Set(openSpots.map((q) => q.zone).filter(Boolean));
      for (const id of rec.visitedZones) openZoneIds.add(id);
      const denom = openSpots.length + foundSecrets;
      return {
        regionId: world.regionId, len: world.len, halfW: world.halfW,
        ground: world.ground, terrain: world.terrain || null, streaming: L.streaming,
        zones, spots, paths, landmarks,
        here: rec.here || null,
        progress: {
          percent: denom ? Math.round(((foundOpen + foundSecrets) / denom) * 100) : 0,
          zones: [...rec.visitedZones].filter((id) => zoneById.has(id)).length, zoneTotal: openZoneIds.size,
        },
      };
    };

    function buildWorld(regionId, registry, opts = {}) {
      { const pre = takeCorridorWorld(regionId, registry, opts); if (pre) return pre; } // Phase 4E-2
      const it = buildWorldSteps(regionId, registry, opts);
      let r = it.next(); while (!r.done) r = it.next();
      return r.value;
    }
    // buildWorld の なかみ。いくつかの くぎり(yield)で ひと やすみ できる(corridor で 着く がわを 何 frame かに わけて 組む ため)。
    // くぎりで とめても とめなくても できる world は おなじ(らんすうを つかわず、ばしょで たねが きまる)
    function* buildWorldSteps(regionId, registry, opts = {}) {
      const base = WORLDS[regionId] || WORLDS.home;
      const e = env();
      const day = typeof S.dailyKey === 'function' ? S.dailyKey() : '';
      const local = regionId === 'home' && opts.locality && LOCAL_FLAVOR[opts.locality.profileId] ? LOCAL_FLAVOR[opts.locality.profileId] : null;
      const world = { regionId, len: base.len, halfW: base.halfW || 1000, ground: base.ground, path: base.path, spots: base.spots, paths: base.paths, props: [], marks: [], residents: [], local,
        // 地域の こせい(え が よむ): じめんの もよう・くうき・みつど・みとおし・おおきな ちけい
        detail: base.detail || [], canopy: base.canopy || null, density: base.density != null ? base.density : 1, view: base.view != null ? base.view : 1, terrain: null,
        // かぜ と うごき(え が よむ。Three.js でも おなじ かぜで 草木を ゆらせる)
        wind: base.wind || [0.5, 1], motion: base.motion || [],
        // くうかん こうせい: じめんの おおきな くぎり / みちを かこむ もの / てまえを よこぎる もの
        areas: [], clutter: base.clutter != null ? base.clutter : 1, frame: base.frame || null, fore: base.fore || null, edgeKinds: base.edge || [], shore: base.shore || [],
        backdrop: (local && local.backdrop) || base.backdrop || 'hills', lane: base.lane || [], wall: (local && local.wall) || base.wall || ['🌳'], hint: base.hint || ['✨'], edge: base.edge || '#8a7a5a', sky: base.sky || null, floor: base.floor || null, glowPath: !!base.glowPath,
        markStyle: base.marks || { color: '#88aa66', kind: 'tuft' }, ambience: base.ambience || null, entry: base.spots[0], hub: base.spots.find((s) => s.hub) || base.spots[1] || base.spots[0] };
      world.segments = pathSegments(base);
      // おおきな ちけい: かたがわが うみ(coast)・かわが とおる(river)・かいこう(chasm)。
      // みずの ある ところは あるけない ので、あるける よこはばも ここで きめる
      world.minX = -world.halfW; world.maxX = world.halfW;
      if (base.terrain) {
        const t = base.terrain;
        if (t.kind === 'coast') {
          // みずぎわは まっすぐでは なく、あるける ばしょ(スポット)の すぐ そとを なぞる。
          // こうすると 歩いている すぐ よこが みずべに なり、「海岸を あるいている」感じが でる
          const side = t.side || -1, pts = [];
          for (let i = 0; i <= 10; i++) {
            const z = -300 + (base.len + 700) * (i / 10);
            // きほんは みちの すぐ よこ。ただし ちかくの スポットより そとがわへ おしやる
            let edge = side * world.halfW * 0.26;
            for (const sp0 of base.spots) { if (Math.abs(sp0.z - z) > 780) continue; const e2 = sp0.x + side * (sp0.r + 90); edge = side < 0 ? Math.min(edge, e2) : Math.max(edge, e2); }
            edge = side < 0 ? Math.max(edge, -world.halfW + 40) : Math.min(edge, world.halfW - 40);
            pts.push([edge + side * Math.sin(i * 1.7) * 55, z]);
          }
          world.terrain = { kind: 'coast', side, pts };
          const xs = pts.map((q) => q[0]);
          if (side < 0) world.minX = Math.min(...xs); else world.maxX = Math.max(...xs);
        } else if (t.kind === 'river' || t.kind === 'chasm') {
          // せかいを たてに よこぎる みずの すじ(はしの ある ところで みちが わたる)
          world.terrain = { kind: t.kind, pts: t.pts.map((q) => q.slice()), half: t.half || (t.kind === 'river' ? 165 : 210) };
        }
      }
      yield;
      // 地区(zone): スポットの まとまり。ちゅうしんは その 地区の スポットの へいきん。mood は みための きぶん
      world.zones = (base.zones || []).map((z) => { const ss = base.spots.filter((s) => s.zone === z.id); const n = ss.length || 1; return { id: z.id, label: z.label, mood: z.mood || {}, x: ss.reduce((a, s) => a + s.x, 0) / n, z: ss.reduce((a, s) => a + s.z, 0) / n, spots: ss.map((s) => s.id) }; });
      const zoneOfSpot = (sp0) => world.zones.find((z) => z.id === sp0.zone) || null;
      // ---- せいかつ の した地図: spot が「ここで なにが できるか」を もつ ----
      // かたち(kind)と め(prop)から きめるので 469 こ 手がきしない。
      // しょうらい おみせ・いえ・つりば などを ふやす ときも ここへ たすだけで、
      // 住民AI も プレイヤーの あそびも おなじ ものを よめる
      for (const s0 of world.spots) {
        const L = spotLife(s0, regionId);
        s0.actWeights = L.acts; s0.activities = Object.keys(L.acts);
        s0.shelter = L.shelter; s0.seats = L.seats;
        const zn = zoneOfSpot(s0);
        s0.zoneCrowd = zn && zn.mood.crowd != null ? zn.mood.crowd : 1;
      }
      // look / watch の とき どこを 見るか(ランドマーク・地区の 主役・けしき)
      world.lifeView = new Map();
      world.meets = []; world.lifeBudget = LIFE.interactPerFrame; world.clock = 0;
      // spot の となり(住民は みちを つかって いどうする)
      world.spotAdj = new Map(world.spots.map((s0) => [s0.id, []]));
      for (const sg of world.segments) { const A = world.spotAdj.get(sg.a.id), B = world.spotAdj.get(sg.b.id); if (A) A.push(sg.b); if (B) B.push(sg.a); }
      const zoneAt = (x, z) => { let best = null, bd = Infinity; for (const zn of world.zones) { const d = Math.hypot(zn.x - x, zn.z - z); if (d < bd) { bd = d; best = zn; } } return best; };
      const degree = (sp0) => (base.paths || []).filter(([a, b]) => a === sp0.id || b === sp0.id).length;
      const halfW = world.halfW;
      const nearSpot = (x, z, pad) => base.spots.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + (pad || 0));
      const propPool = local ? local.props.concat(base.props.slice(0, 3)) : base.props;
      // りょうはし(side)に おく 絵文字は 「そざい」を のぞく。のこらない ときは 絵文字を おかない
      const sidePool = propPool.filter((q) => !MATERIAL_EMOJI.has(q));
      yield;
      // えんけい〜ちゅうけい: りょうはしの おおきな もの(き・たてもの など)
      const cl = world.clutter;
      // りょうはしの こものは へらして 1つ1つを おおきく(「素材置き場」に 見えない ように)
      const nProps = Math.round((10 + Math.floor(base.len / 420)) * (0.5 + cl));
      const edgeKinds = world.edgeKinds;
      for (let i = 0; i < nProps; i++) {
        const seed = regionId + ':prop:' + i;
        const z = 120 + hrand(seed + 'z') * (base.len - 200);
        const side = i % 2 === 0 ? -1 : 1;
        const x = side * (halfW * 0.82 + hrand(seed + 'x') * halfW * 0.18);
        if (nearSpot(x, z, 20)) continue;
        // 3つに 2つは canvas の 造形(岩・木・たてもの)。絵文字の 素材は 3つに 1つ まで
        if (edgeKinds.length && i % 3 !== 1) { const kind = edgeKinds[hash(seed + 'e') % edgeKinds.length]; world.props.push({ struct: kind, x, z, size: 220 + hrand(seed + 'k') * 160, ang: 0, side, region: regionId, layer: 'side', solid: true }); continue; }
        if (!sidePool.length) continue;
        world.props.push({ emoji: sidePool[hash(seed) % sidePool.length], x, z, size: 140 + hrand(seed + 'k') * 90, layer: 'side' });
      }
      yield;
      // しゃへいぶつ: みちの りょうわきに ならぶ おおきな もの。あいだが あいていて、さきは みえたり みえなかったり
      const wallPool = world.wall;
      for (const s of world.segments) {
        yield;
        const n = Math.max(1, Math.round(s.len / 200)); const dx = (s.b.x - s.a.x) / s.len, dz = (s.b.z - s.a.z) / s.len; const nx = -dz, nz = dx;
        const zn = zoneAt((s.a.x + s.b.x) / 2, (s.a.z + s.b.z) / 2); const dens = zn && zn.mood.walls != null ? zn.mood.walls : 1;
        const secret = s.kind === 'secret';
        for (let i = 0; i <= n; i++) {
          for (const side of [-1, 1]) {
            const seed = regionId + ':wall:' + s.a.id + s.b.id + i + side;
            const t = (i + 0.5 * hrand(seed + 't')) / (n + 0.5);
            if (secret && t < 0.3) continue; // かくし みちの いりぐちは あけておく(きの すきまから さきが みえる)
            if (hrand(seed + 'p') > Math.min(0.96, (secret ? 0.9 : 0.72) * dens * (0.45 + cl * 0.6))) continue;
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
      yield;
      // てまえ: こみちの わきの ちいさな もの(あるいている ばしょが わかる)
      // みちばたの こものは「いみの ある ところ」に まとめる: スポットの てまえ・ぶんき・地区の さかいめ。
      // まんべんなく まく のを やめる ことで「アイコンを しきつめた」感じが きえる
      for (const s of world.segments) {
        const n = Math.max(1, Math.round(s.len / 150 * cl)); const dx = (s.b.x - s.a.x) / s.len, dz = (s.b.z - s.a.z) / s.len; const nx = -dz, nz = dx;
        const zn = zoneAt((s.a.x + s.b.x) / 2, (s.a.z + s.b.z) / 2); const lanePool = (zn && zn.mood.lane) || (world.lane.length ? world.lane : propPool);
        const branchy = degree(s.a) >= 3 || degree(s.b) >= 3;
        for (let i = 0; i < n; i++) {
          const seed = regionId + ':lane:' + s.a.id + s.b.id + i; const side = (i + Math.floor(hrand(seed + 's') * 2)) % 2 === 0 ? -1 : 1;
          // みちの りょうはし(スポットの てまえ)に よせる。ぶんきの ある みちは いりぐち がわを こくする
          const bias = hrand(seed + 'b'), t = bias < (branchy ? 0.62 : 0.5) ? 0.06 + hrand(seed + 't') * 0.2 : 0.74 + hrand(seed + 't') * 0.2;
          const off = s.half + 18 + hrand(seed + 'o') * 24;
          const x = s.a.x + (s.b.x - s.a.x) * t + nx * off * side, z = s.a.z + (s.b.z - s.a.z) * t + nz * off * side;
          if (Math.abs(x) > halfW || z < 60) continue;
          world.props.push({ emoji: lanePool[(i + hash(seed)) % lanePool.length], x, z, size: 58 + hrand(seed + 'k') * 44, layer: 'lane' });
        }
      }
      // ランドマーク・スポットの めじるし(おおきめ。あたりはんてい あり)
      for (const s of base.spots) {
        if (s.landmark) { world.props.push({ landmark: s.landmark, emoji: s.prop || '🌳', x: s.x, z: s.z + s.r * 0.9, size: 560, spot: true, solid: true, layer: 'landmark', label: s.label, tier: s.lmTier || 1, mid: 'lm:' + s.id }); continue; }
        if (!s.prop) continue;
        const px0 = s.x + (s.x < 0 ? -s.r - 30 : s.r + 30) * (s.kind === 'deep' ? 0 : 1), pz0 = s.z + 30;
        if (Object.prototype.hasOwnProperty.call(SPOT_PROP_STRUCT, s.prop)) {
          const st = SPOT_PROP_STRUCT[s.prop]; if (!st) continue; // その 地域の 主役(うみ そのもの など)に まかせて おかない
          const kind = typeof st === 'function' ? st(regionId) : st;
          world.props.push({ struct: kind, x: px0, z: pz0, size: 210, ang: 0, side: s.x < 0 ? -1 : 1, region: regionId, spot: true, solid: true, layer: 'landmark', tier: 3, mid: 'mk:' + s.id, label: s.label });
          continue;
        }
        // たてもの・おおきな もの は そのまま、しょくぶつ・こもの は ひとまわり ちいさく
        world.props.push({ emoji: s.prop, x: px0, z: pz0, size: SPOT_PROP_BIG.has(s.prop) ? 230 : 175, spot: true, solid: true, layer: 'landmark' });
      }
      yield;
      // じめんの もよう(くさ・こいし・きらめき)
      const nMarks = 60 + Math.floor(base.len / 30);
      for (let i = 0; i < nMarks; i++) {
        const seed = regionId + ':mark:' + i;
        world.marks.push({ x: (hrand(seed + 'x') - 0.5) * halfW * 1.9, z: 60 + hrand(seed + 'z') * (base.len - 100), size: 10 + hrand(seed + 'k') * 14, phase: hrand(seed + 'f') * 6.28 });
      }
      // ---- 地域の こせい: みちの そとの 群生・ぞうけいぶつ・じめんの もよう ----
      const dens = world.density;
      const onLand = (x, z) => {
        if (z <= 70 || z >= base.len - 60) return false;
        const sx = shoreX(world, z);
        if (sx != null) { if (world.terrain.side < 0 ? x < sx + 40 : x > sx - 40) return false; }
        return x > world.minX + 20 && x < world.maxX - 20;
      };
      const offPath = (x, z, pad) => { const n = nearestPath({ x, z }, world); return !n || n.dist > n.half + (pad || 50); };
      // スポットの まんなか(みんなが あつまる ところ)だけ あけて、ふちには かざれる
      const inSpotCore = (x, z) => base.spots.some((sp0) => Math.hypot(sp0.x - x, sp0.z - z) < sp0.r * 0.62);
      const spotRim = (sp0, seed) => { const a = hrand(seed + 'a') * TAU, d = sp0.r * (1.05 + hrand(seed + 'd') * 0.5); return [sp0.x + Math.sin(a) * d, sp0.z + Math.cos(a) * d]; };
      const alongPath = (seed) => {
        const segs = world.segments.filter((g) => g.kind !== 'secret'); if (!segs.length) return null;
        const s0 = segs[hash(seed + 's') % segs.length], t = 0.12 + hrand(seed + 't') * 0.76;
        const dx = (s0.b.x - s0.a.x) / s0.len, dz = (s0.b.z - s0.a.z) / s0.len, nx = -dz, nz = dx;
        const side = hrand(seed + 'p') < 0.5 ? -1 : 1, off = s0.half + 34 + hrand(seed + 'o') * 46;
        return [s0.a.x + (s0.b.x - s0.a.x) * t + nx * off * side, s0.a.z + (s0.b.z - s0.a.z) * t + nz * off * side, Math.atan2(dx, dz), side];
      };
      yield;
      // 群生: おなじ ものを ばらまかず、ひとかたまり ごとに かず と おおきさを かえる
      // (おなじ キノコが ならんで みえる コピーかんを なくす)
      const fieldSpec = base.field;
      if (fieldSpec && fieldSpec.pool && fieldSpec.pool.length) {
        const nCl = Math.max(2, Math.round(fieldSpec.clusters * dens * (0.45 + cl * 0.75)));
        // おく ばしょが なければ つぎの たねを ためす(せまい 地域でも かずが そろう)
        for (let c = 0, tries = 0; c < nCl && tries < nCl * 6; tries++) {
          const seed = regionId + ':cl:' + tries;
          const cx = (hrand(seed + 'x') - 0.5) * world.halfW * 1.9, cz = 110 + hrand(seed + 'z') * (base.len - 200);
          if (!onLand(cx, cz) || inSpotCore(cx, cz) || !offPath(cx, cz, 24)) continue;
          c++;
          const zn = zoneAt(cx, cz); const zd = zn && zn.mood.walls != null ? zn.mood.walls : 1;
          const pool = (zn && zn.mood.field) || fieldSpec.pool; // 地区ごとに 生えている ものが かわる
          const [pmin, pmax] = fieldSpec.per, [smin, smax] = fieldSpec.size;
          const n = Math.max(1, Math.round((pmin + hrand(seed + 'n') * (pmax - pmin)) * zd));
          const lead = pool[hash(seed + 'e') % pool.length]; // かたまりの ぬし(おおきめ)
          const scale = 0.8 + hrand(seed + 'w') * 0.9;
          for (let k = 0; k < n; k++) {
            const ks = seed + ':' + k, a = hrand(ks + 'a') * TAU, d = hrand(ks + 'd') * fieldSpec.spread;
            const x = cx + Math.sin(a) * d, z = cz + Math.cos(a) * d * 0.8;
            if (!onLand(x, z) || inSpotCore(x, z) || !offPath(x, z, 12)) continue;
            const big = k === 0;
            world.props.push({ emoji: big ? lead : pool[hash(ks) % pool.length], x, z,
              size: (smin + hrand(ks + 'k') * (smax - smin)) * scale * (big ? 1.25 : 1), layer: 'field' });
          }
        }
      }
      yield;
      // ぞうけいぶつ: canvas で えがく 地域 こゆうの おおきな もの(絵文字では ない)
      for (const [kind, count, where, size] of base.structs || []) {
        const n = Math.max(1, Math.round(count * (where === 'edge' || where === 'spot' ? 1 : dens)));
        for (let i = 0, tries = 0; i < n && tries < n * 6; tries++) {
          const seed = regionId + ':st:' + kind + tries;
          let x, z, ang = 0, side = 1;
          if (where === 'path') { const a = alongPath(seed); if (!a) continue; x = a[0]; z = a[1]; ang = a[2]; side = a[3]; }
          else if (where === 'spot') { const cand = base.spots.filter((sp0) => !sp0.secret); const sp0 = cand[hash(seed + 'sp') % cand.length]; const r = spotRim(sp0, seed); x = r[0]; z = r[1]; }
          else if (where === 'edge') { side = i % 2 === 0 ? -1 : 1; x = side * (world.halfW * (0.74 + hrand(seed + 'x') * 0.24)); z = 120 + hrand(seed + 'z') * (base.len - 240); }
          else { x = (hrand(seed + 'x') - 0.5) * world.halfW * 1.9; z = 110 + hrand(seed + 'z') * (base.len - 220); if (!offPath(x, z, 26)) continue; }
          if (!onLand(x, z) || (where !== 'spot' && inSpotCore(x, z))) continue;
          i++;
          const sc = 0.82 + hrand(seed + 'k') * 0.42;
          // ねている もの(倒木・ながれぎ・岩)は むきを ばらす。しぜんの ものは よこ一列に ならばない
          if (ANGLED_STRUCTS.has(kind)) ang = (hrand(seed + 'r') - 0.5) * 1.6;
          world.props.push({ struct: kind, x, z, size: size * sc, ang, side, region: regionId, layer: 'struct', solid: size * sc > 120 });
          if (kind === 'log' && hrand(seed + 'c') < 0.5) { // 2ほん かさなる
            const a2 = hrand(seed + 'a2') * TAU, d2 = 40 + hrand(seed + 'd2') * 50, x2 = x + Math.sin(a2) * d2, z2 = z + Math.cos(a2) * d2;
            if (onLand(x2, z2) && !inSpotCore(x2, z2)) world.props.push({ struct: 'log', x: x2, z: z2, size: size * sc * 0.75, ang: ang + 0.9 + hrand(seed + 'r2') * 0.8, side, region: regionId, layer: 'struct', solid: false });
          }
        }
      }
      world.seed = hash(regionId);
      yield;
      // ---- じめんの おおきな くぎり(その 地域で「なにの うえを あるいているか」) ----
      // みちに そう もの(車道・歩道・かわら・古い道)と、みちの そとを うめる もの(田んぼ・畑・雪原・砂地)、
      // みずぎわに そう もの(濡れ砂・あさせ)で おきかたを かえる
      const ALONG_PATH = new Set(['road', 'sidewalk', 'crossing', 'oldroad', 'gravelbar', 'stonedeck', 'ridge', 'terrace']);
      const ALONG_SHORE = new Set(['wetsand', 'shallow', 'seagrass']);
      for (const [kind, count, [aw, ah]] of base.areas || []) {
        yield;
        const n = Math.max(1, Math.round(count));
        if (ALONG_PATH.has(kind)) {
          const segs = world.segments.filter((g) => g.kind !== 'secret');
          for (let i = 0; i < n && segs.length; i++) {
            const seed = regionId + ':ga:' + kind + i, sg = segs[hash(seed + 's') % segs.length];
            const t = 0.1 + hrand(seed + 't') * 0.8, dx = (sg.b.x - sg.a.x) / sg.len, dz = (sg.b.z - sg.a.z) / sg.len;
            const ang = Math.atan2(dx, dz);
            const off = kind === 'road' || kind === 'oldroad' ? 0 : (hrand(seed + 'p') < 0.5 ? -1 : 1) * (sg.half + aw * 0.45);
            const x = sg.a.x + (sg.b.x - sg.a.x) * t - dz * off, z = sg.a.z + (sg.b.z - sg.a.z) * t + dx * off;
            if (!onLand(x, z)) continue;
            world.areas.push({ kind, x, z, w: aw * (0.8 + hrand(seed + 'w') * 0.5), h: ah * (0.8 + hrand(seed + 'h') * 0.6), ang });
          }
        } else if (ALONG_SHORE.has(kind) && world.terrain && world.terrain.kind === 'coast') {
          const sd = world.terrain.side;
          for (let i = 0; i < n; i++) {
            const seed = regionId + ':gs:' + kind + i, z = 100 + hrand(seed + 'z') * (base.len - 200);
            const sx = shoreX(world, z); if (sx == null) continue;
            world.areas.push({ kind, x: sx - sd * aw * 0.35, z, w: aw * (0.8 + hrand(seed + 'w') * 0.5), h: ah * (0.8 + hrand(seed + 'h') * 0.6), ang: 0 });
          }
        } else {
          for (let i = 0, tries = 0; i < n && tries < n * 8; tries++) {
            const seed = regionId + ':gg:' + kind + tries;
            const x = (hrand(seed + 'x') - 0.5) * (world.maxX - world.minX) * 0.98 + (world.maxX + world.minX) / 2;
            const z = 60 + hrand(seed + 'z') * (base.len - 120);
            if (!onLand(x, z) || !offPath(x, z, aw * 0.3) || inSpotCore(x, z)) continue;
            i++;
            world.areas.push({ kind, x, z, w: aw * (0.8 + hrand(seed + 'w') * 0.6), h: ah * (0.8 + hrand(seed + 'h') * 0.6), ang: (hrand(seed + 'a') - 0.5) * 0.5 });
          }
        }
      }
      yield;
      // ---- みちを かこむ おおきな もの(ビル・岩壁・大木…)。じぶんより ずっと おおきい ----
      if (base.frame) {
        const [fkind0, foff0, fsize, fprob] = base.frame, fkind = fkind0;
        // せまい 地域では そとに おしやりすぎない(せかいの はばの はんぶんまで)
        const foff = Math.min(foff0, world.halfW * 0.5);
        for (const sg of world.segments) {
          if (sg.kind === 'secret') continue;
          const n = Math.max(1, Math.round(sg.len / (base.framePer || 380)));
          const dx = (sg.b.x - sg.a.x) / sg.len, dz = (sg.b.z - sg.a.z) / sg.len, nx = -dz, nz = dx;
          for (let i = 0; i <= n; i++) for (const side of [-1, 1]) {
            const seed = regionId + ':fr:' + sg.a.id + sg.b.id + i + side;
            const t = (i + 0.4 * hrand(seed + 't')) / (n + 0.4);
            const off = sg.half + foff + hrand(seed + 'o') * foff * 0.4;
            const x = sg.a.x + (sg.b.x - sg.a.x) * t + nx * off * side, z = sg.a.z + (sg.b.z - sg.a.z) * t + nz * off * side;
            // 地区は「その 地点」の 地区で きめる(おなじ みちでも いりぐちと おくで かわる)
            const zn = zoneAt(x, z), dens = zn && zn.mood.walls != null ? zn.mood.walls : 1;
            if (hrand(seed + 'p') > Math.min(0.95, (fprob != null ? fprob : 0.66) * dens)) continue;
            if (!onLand(x, z) || inSpotCore(x, z)) continue;
            const kind = (zn && zn.mood.frame) || fkind, fsc = (zn && zn.mood.frameScale) || 1;
            // おなじ かたちが ならばない よう、おおきさと むきを ばらす
            world.props.push({ struct: kind, x, z, size: fsize * fsc * (0.7 + hrand(seed + 'k') * 0.75), ang: Math.atan2(dx, dz), side, region: regionId, layer: 'frame', solid: true });
          }
        }
      }
      yield;
      // ---- 地区の 主役: その 地区で「なにを 見るか」を 1つ おく(キノコの 群れ・オアシスの 水・光の 庭…) ----
      for (const zn of world.zones) {
        if (!zn.mood.hero) continue;
        const [hk, hs] = zn.mood.hero;
        let placed = false;
        for (let k = 0; k < 24 && !placed; k++) {
          const seed = regionId + ':hero:' + zn.id + k, a = hrand(seed + 'a') * TAU, d = 140 + hrand(seed + 'd') * (260 + k * 12);
          const x = zn.x + Math.sin(a) * d, z = zn.z + Math.cos(a) * d * 0.7;
          if (!onLand(x, z) || inSpotCore(x, z) || !offPath(x, z, hs * 0.22)) continue;
          world.props.push({ struct: hk, x, z, size: hs, ang: 0, side: 1, region: regionId, layer: 'landmark', hero: true, solid: true, tier: 2, mid: 'hero:' + zn.id, label: zn.label, zone: zn.id });
          placed = true;
        }
      }
      yield;
      // ---- てまえを よこぎる もの(えだ・葉・柵・岩)。おくゆきが でる ----
      if (base.fore) {
        const [okind, per, osize] = base.fore;
        for (const sg of world.segments) {
          yield;
          if (sg.kind === 'secret') continue;
          const n = Math.max(1, Math.round(sg.len / 1000 * per));
          const dx = (sg.b.x - sg.a.x) / sg.len, dz = (sg.b.z - sg.a.z) / sg.len, nx = -dz, nz = dx;
          for (let i = 0; i < n; i++) {
            const seed = regionId + ':fo:' + sg.a.id + sg.b.id + i, side = hrand(seed + 's') < 0.5 ? -1 : 1;
            const t = (i + 0.2 + hrand(seed + 't') * 0.6) / n, off = sg.half + 20 + hrand(seed + 'o') * 46;
            const x = sg.a.x + (sg.b.x - sg.a.x) * t + nx * off * side, z = sg.a.z + (sg.b.z - sg.a.z) * t + nz * off * side;
            if (!onLand(x, z)) continue;
            world.props.push({ struct: okind, x, z, size: osize * (0.75 + hrand(seed + 'k') * 0.6), ang: Math.atan2(dx, dz), side, region: regionId, layer: 'fore' });
          }
        }
      }
      yield;
      // みちの すこし そと(620〜1500)にも おおきな ものを おく。
      // せかいの はし だけに おくと、ひろい せかいでは みちの りょうわきが すかすかに なる。
      // みちの ながさに あわせて ふえる ので、せかいが ひろく なっても
      // 「あるいて いる ところの まわり」の こさは かわらない。ばしょで たねが きまる ので、
      // もどって きても おなじ ならびに なる
      for (const sg of world.segments) {
        yield;
        if (sg.kind === 'secret') continue;
        const n = Math.max(1, Math.round(sg.len / 620 * (0.5 + world.clutter)));
        const dx = (sg.b.x - sg.a.x) / sg.len, dz = (sg.b.z - sg.a.z) / sg.len, nx = -dz, nz = dx;
        for (let i = 0; i < n; i++) for (const side of [-1, 1]) {
          const seed = regionId + ':mid:' + sg.a.id + sg.b.id + i + side;
          if (hrand(seed + 'p') > 0.86) continue;
          const t = (i + 0.15 + hrand(seed + 't') * 0.7) / n;
          const off = 560 + hrand(seed + 'o') * 820;
          const x = sg.a.x + (sg.b.x - sg.a.x) * t + nx * off * side, z = sg.a.z + (sg.b.z - sg.a.z) * t + nz * off * side;
          if (Math.abs(x) > world.halfW - 40 || z < 100 || z > base.len - 100) continue;
          if (!onLand(x, z) || nearSpot(x, z, 40)) continue;
          const np = nearestPath({ x, z }, world); if (np && np.dist < 300) continue; // みちの すぐ よこは frame の しごと
          if (world.edgeKinds.length && hash(seed + 'm') % 3 !== 1) { const kind = world.edgeKinds[hash(seed + 'e') % world.edgeKinds.length]; world.props.push({ struct: kind, x, z, size: 210 + hrand(seed + 'k') * 170, ang: 0, side, region: regionId, layer: 'side', solid: true }); continue; }
          if (!sidePool.length) continue;
          world.props.push({ emoji: sidePool[hash(seed) % sidePool.length], x, z, size: 130 + hrand(seed + 'k') * 90, layer: 'side' });
        }
      }
      yield;
      // ---- みはらしの spot: その ばしょ だけの けしき(view) ----
      // #318 の 監査で「なまえは とくちょうを やくそくして いる のに 画面に 何も ない」
      // spot が 40 件 見つかった。その うち「みはらし」系を ここで 直す。
      // たいせつなのは けしきを ごうかに する ことでは なく、
      // 「○○のみはらしを みつけた」と 出た とき **画面を 見て わかる** こと。
      //
      // おきかた:
      //   ・**ながめの がわ**(みちの はんたいがわ)の ふちに おく。spot の まんなかは あけて おく
      //   ・主役は 1つ(size 300)、補助は ちいさく(size 180)。もので うめつくさない
      //   ・**solid に しない**。colliderOf() は solid でない ものに あたりはんていを つけない ので、
      //     あるく ひと・みち・出口(gate)・住民を ふさぐ ことが ぜったいに ない
      //   ・ちずの めじるし(mid)は つけない。ちず・探索率は 1つも かえない(#318 §16)
      //   ・主役は その 地域が ふだん つかう もの(ambient の fore / edge / frame、
      //     地区の hero)とは **べつの struct** に する。おなじ ものを おくと
      //     「その 地域の かべがみ」に とけて、見つけた ものとして 読めない
      //     (はじめの 案 cairn は mountain の ambient と 地区 hero の どちらにも あり、
      //      reedclump は river_lake の ambient そのもの で、実機で 見分けが つかなかった)
      //   ・**まわりの おおきな ものを ぜんぶ おいた あとで おく**。さきに おくと
      //     あとから くる 岩壁(frame)や てまえの もの(fore)に かくれて しまう
      //     (mountain の いちのてんぼう が それで 見えなく なって いた)
      //
      // こうほを いくつも つくり、まわりに ものが いちばん ない ところを えらぶ。
      const VIEW_BIG = new Set(['frame', 'fore', 'side', 'wall', 'struct', 'landmark']);
      const bigNear = (x, z) => {
        let m = 1e9;
        for (const q of world.props) {
          if (!VIEW_BIG.has(q.layer) || (q.size || 0) < 160) continue;
          m = Math.min(m, Math.hypot(q.x - x, q.z - z) - (q.size || 0) * 0.34);
        }
        return m;
      };
      // 着く ひと(カメラ)から その こうほ まで の 視線を、おおきな もの が さえぎって いないか。
      // 見る がわ は spot の てまえ(来た みち の がわ)。障害物 は 1 つも うごかさず、
      // さえぎられない 場所 を えらぶ だけ(いわのアーチ は frame の searock の うらに かくれて いた)
      const sightBlock = (vx, vz, x, z) => {
        const dx = x - vx, dz = z - vz, L2 = dx * dx + dz * dz || 1;
        let b = 0;
        for (const q of world.props) {
          if (!VIEW_BIG.has(q.layer) || (q.size || 0) < 200 || q.deco) continue;
          const t = ((q.x - vx) * dx + (q.z - vz) * dz) / L2;
          if (t < 0.05 || t > 0.97) continue;
          const r0 = (q.size || 0) * 0.32, e = Math.hypot(vx + dx * t - q.x, vz + dz * t - q.z);
          if (e < r0) b += (1 - e / r0) * (q.size || 0) / 300;   // まんなかで ふさぐ おおきな もの ほど おもい
        }
        return b;
      };
      // 主役の おおきさ(地形 の ような もの は 1 まわり おおきく)。ないものは 300
      const DECO_LEAD_SIZE = { arch: 400 };
      for (const s of base.spots) {
        // view = はっけん の レベルに かかわる けしき(#319)。
        // deco = **見た目だけ** の けしき。spotDiscoveryLevel() は deco を 見ないので、
        //        しらせ(L0 / L2 / L3)も 探索率 も 1つも かわらない。
        //        「ここは 空っぽ すぎる」「なまえが やくそく した ものが 画面に ない」を
        //        飾りだけで なおす ための もの
        const look = (s.view && s.view.length) ? s.view : s.deco;
        if (!look || !look.length) continue;
        const isDeco = !(s.view && s.view.length);
        // みちが きて いる ほうの はんたいが ながめ(「どこから 来たか」の 逆)
        const link = world.segments.find((g) => g.a === s || g.b === s);
        const other = link ? (link.a === s ? link.b : link.a) : null;
        const away = other ? Math.atan2(s.x - other.x, s.z - other.z) : 0;
        look.forEach((entry, i) => {
          // 'arch:rock' の ように「かたち:material」で かける(1 つの かたちを ぬりわける)
          const [kind, variant] = String(entry).split(':');
          const lead = i === 0;
          let best = null;
          for (let k = 0; k < 28; k++) {
            const seed = `${regionId}:view:${s.id}:${i}:${k}`;
            // 主役は ながめの まっすぐ。ただし せかいの はしや みずぎわで
            // おけない ことが ある(forest の いわばのみはらし は x=2600 / はば 2900 で
            // ながめの さきが せかいの そと だった)。**おけない ままに しない** ため、
            // うまく いかない ほど まわりへ ひろげ、すこし 近づける
            const grow = k / 8;
            const ang = away + (hrand(seed + 'a') - 0.5) * ((lead ? 0.5 : 1.6) + grow);
            const d = isDeco && lead
              ? s.r * (1.02 + 0.55 * hrand(seed + 'e'))                  // deco の 主役: 窓 を さがして すこし 先まで
              : s.r * (lead ? 1.02 : 1.15) + hrand(seed + 'd') * (lead ? 40 : 90) - grow * 18;
            const x = s.x + Math.sin(ang) * d, z = s.z + Math.cos(ang) * d * 0.8;
            // 主役は spot の ふちに ちかい ので みちからの よゆうを 小さく する。
            // solid では ない ので ふさぐ ことは なく、「ふちに ある」見えかたに なる。
            // (いわばのみはらし は みちが 2本 集まる 端点。よゆう 70 だと まわりの
            //  ほとんどが みちの えいきょう けん に 入って しまい、1つも おけなかった)
            if (d < s.r * 0.8 || !onLand(x, z) || !offPath(x, z, lead ? 30 : 70)) continue;
            const room = bigNear(x, z);
            // deco の 主役 だけ は「着いた ひと から 見える か」を さきに みる。
            // view(#319)と deco の 補助 は もとの えらびかた の まま(いち は かわらない)
            const block = isDeco && lead ? sightBlock(s.x - Math.sin(away) * (s.r + 420), s.z - Math.cos(away) * (s.r + 420), x, z) : 0;
            if (!best || block < best.block - 1e-9 || (Math.abs(block - best.block) <= 1e-9 && room > best.room)) best = { x, z, room, block };
            if (block === 0 && room > (lead ? 190 : 120)) break;   // さえぎられず じゅうぶん あいて いれば そこで きめる
          }
          if (!best) return;
          world.props.push({ struct: kind, x: best.x, z: best.z, size: lead ? (isDeco && DECO_LEAD_SIZE[kind]) || 300 : 180, ang: 0,
            side: best.x < s.x ? -1 : 1, region: regionId, layer: 'landmark', view: s.id, deco: isDeco || undefined, variant: variant || undefined,
            // keep: 同時に えがく かずの せいげん で けずらない(その ばしょ の 主役 だから)。
            // hero は つけない(つけると カメラが ふりむく ので「見た目だけ」で なくなる)
            keep: (isDeco && lead) || undefined });
        });
      }
      yield;
      // じゅうみんの ふりわけ(むらの ある はいち: にぎやかな ばしょ と しずかな ばしょ)
      const all = registry.byRegion(regionId).filter((r) => !r.withPlayer);
      const assign = new Map();
      { let nA = 0; for (const r of all) {
        if (++nA % 12 === 0) yield;
        const seed = r.key + '@' + regionId + '#' + e.time + e.weather + (r.kind === 'companion' ? day : '');
        const w = spotWeights(r, base.spots, e).map((wt, i) => { const zn = zoneOfSpot(base.spots[i]); const fog = zn ? (zn.mood.fog || 0) : 0; const zc = zn && zn.mood.crowd != null ? zn.mood.crowd : 1; return wt * zc * (r.night || r.rare ? 1 + fog : 1 - fog * 0.6); })
        // ふかい 地区は しずか。よる/レアの こは おくにも。zone の mood.crowd は「この 地区は にぎやか/しずか」の ばいりつ
        ;
        const i = weightedIndex(w, seed); assign.set(r.key, i >= 0 ? base.spots[i] : world.hub);
      } }
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
      { let nB = 0; for (const r of all) {
        if (++nB % 12 === 0) yield;
        const s = assign.get(r.key); const seed = r.key + '@' + regionId + '#' + day;
        const k = perSpot.get(s.id) || 0; perSpot.set(s.id, k + 1);
        const cl = hash(seed + 'c') % 2; const ca = hrand(s.id + cl + regionId) * TAU, cd = s.r * (0.2 + 0.3 * hrand(s.id + cl + 'd'));
        const cx = s.x + Math.sin(ca) * cd, cz = s.z + Math.cos(ca) * cd;
        const ja = hrand(seed + 'a') * TAU, jd = hrand(seed + 'd') * s.r * 0.42;
        const born = makeActor(r, { x: clamp(cx + Math.sin(ja) * jd, world.minX + 20, world.maxX - 20), z: clamp(cz + Math.cos(ja) * jd * 0.7, 80, base.len - 80), spot: s, heading: hrand(seed + 'h') * TAU - Math.PI });
        // 行動を はじめる 時こくを 1人ずつ ずらす(ぜんいんが 同時に うごきださない)
        born.until = 0.5 + born.traits.phase * 9; born.nextAt = born.traits.phase * 20;
        world.residents.push(born);
      } }
      if (registry.naoto && registry.naoto.region === regionId) {
        const spot = base.spots.find((s) => s.kind === 'deep') || base.spots[base.spots.length - 1];
        world.residents.push(makeActor(registry.naoto, { x: spot.x, z: spot.z, spot, fixed: true, heading: Math.PI }));
      }
      yield;
      // あたりはんてい: 「絵の 四角」では なく 地面に ついて いる ところ(COLLIDER)。
      // みちの 通行帯に 食いこむ ものは 自動で 縮める/外す ので、道は ぜったいに ふさがらない
      { const obs = []; for (let i = 0; i < world.props.length; i++) { const o = obstacleOf(world.props[i], world); if (o) obs.push(o); if (i % 120 === 119) yield; } world.obstacles = obs; }
      yield;
      world.collision = buildCollisionGrid(world.obstacles);
      world.moodSpots = world.spots.filter((q) => q.mood);   // ばしょ ごとの きぶん(ふつうは 0〜3 こ)
      // あたりはんていは じゅうみんの あとに つくるので、うまれた ばしょが 木や
      // かべの なかに なって いる ことが あった。ここで いちどだけ そろえる
      for (let i = 0; i < world.residents.length; i++) {
        if (i % 16 === 15) yield;
        const a = world.residents[i];
        if (a.plant || a.fixed || a.follow) continue;
        standClear(a, world, a.water, a.spot);
        a.tx = a.x; a.tz = a.z;
      }
      yield;
      // 「ながめる」ときに どこを 見るか。いちばん ちかい ランドマーク / 地区の 主役、
      // なければ 水ぎわ か 地域の おく。せかい たんい なので Three.js でも おなじ
      {
        const views = world.props.filter((q) => q.landmark || q.hero);
        for (const s0 of world.spots) {
          let best = null, bd = 3200;
          for (const q of views) { const d = Math.hypot(q.x - s0.x, q.z - s0.z); if (d > 120 && d < bd) { bd = d; best = q; } }
          if (!best && world.terrain && world.terrain.kind === 'coast') { const sx = shoreX(world, s0.z); if (sx != null) best = { x: sx + world.terrain.side * -300, z: s0.z }; }
          if (best) world.lifeView.set(s0.id, { x: best.x, z: best.z });
        }
      }
      return world;
    }
    // じめんの もようは「せかいの ます目」から、いま みえている ぶんだけ つくる。
    // ぜんぶを はいれつで もたない ので、どこへ いっても おなじ こさ で、
    // おおきな くうはく(なにも ない じめん)が できない。ます目の たねは ばしょで
    // きまる ので、もどってきても おなじ もように なる。え には いぞんしない ので、
    // Three.js の レンダラーからも おなじ ように よべる
    const DETAIL_CELL = 190;
    function sampleGroundDetails(world, cx, cz, radius, out) {
      const list = out || []; list.length = 0;
      const spec = world.detail || []; if (!spec.length) return list;
      const minX = world.minX != null ? world.minX : -world.halfW, maxX = world.maxX != null ? world.maxX : world.halfW;
      const t = world.terrain, riverish = t && (t.kind === 'river' || t.kind === 'chasm');
      const gx0 = Math.floor((cx - radius) / DETAIL_CELL), gx1 = Math.floor((cx + radius) / DETAIL_CELL);
      const gz0 = Math.floor((cz - radius) / DETAIL_CELL), gz1 = Math.floor((cz + radius) / DETAIL_CELL);
      for (let gz = gz0; gz <= gz1; gz++) {
        const z0 = gz * DETAIL_CELL; if (z0 < -DETAIL_CELL || z0 > world.len + DETAIL_CELL) continue;
        for (let gx = gx0; gx <= gx1; gx++) {
          const x0 = gx * DETAIL_CELL; if (x0 < minX - DETAIL_CELL || x0 > maxX) continue;
          let sd = (gx * 374761393 + gz * 668265263 + world.seed) >>> 0;
          sd = (Math.imul(sd ^ (sd >>> 13), 1274126177)) >>> 0;
          const rnd = () => { sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0; return sd / 4294967296; };
          for (let li = 0; li < spec.length; li++) {
            const layer = spec[li], per = layer[2];
            let n = Math.floor(per); if (rnd() < per - n) n++;
            for (let k = 0; k < n; k++) {
              const x = x0 + rnd() * DETAIL_CELL, z = z0 + rnd() * DETAIL_CELL;
              if (x < minX || x > maxX || z < 20 || z > world.len - 10) { rnd(); rnd(); rnd(); continue; }
              if (riverish) { // みずの なかには もようを おかない
                let inside = false;
                for (let i = 0; i < t.pts.length - 1 && !inside; i++) { const [ax, az] = t.pts[i], [bx, bz] = t.pts[i + 1]; if (z < Math.min(az, bz) - t.half || z > Math.max(az, bz) + t.half) continue; const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1; const tt = clamp(((x - ax) * dx + (z - az) * dz) / L2, 0, 1); inside = Math.hypot(x - (ax + dx * tt), z - (az + dz * tt)) < t.half; }
                if (inside) { rnd(); rnd(); rnd(); continue; }
              }
              list.push({ kind: layer[0], color: layer[1], x, z, size: layer[3] + rnd() * (layer[4] - layer[3]), phase: rnd() * TAU, rot: rnd() * TAU });
            }
          }
        }
      }
      return list;
    }
    // いっしょに あるく なかま・こいびと(この せかいの じゅうみんとしては おかず、プレイヤーの そばに いる)
    function companionsOf(registry) { return registry.residents.filter((r) => r.withPlayer).map((r, i) => makeActor(r, { x: 0, z: 0, follow: true, slot: i, heading: 0 })); }

    // ================= なかまの ならび(party formation)=================
    // いっしょに あるく なかま・こいびとの いばしょ。じぶんの うしろ(カメラから みて おく)に ゆるく あつまる。
    //   1〜2: ななめ うしろ / 3〜4: ちいさな V / 5〜: 半円〜おうぎ(おくへ いくほど ひろく、まんなかほど おく)。
    // 横いっぱいの 1 列には しない。はばには 上限(maxHalf)を もち、人数が おおいと 段を ふやす(ひろい ところ 4 段まで、
    // せまい ところ 8 段まで)。それでも はいりきらない ときは 段の なかを すこし こく する。
    // side: よこ(+ = カメラから みて みぎ)、back: おく(+ = カメラから とおい)。world 単位。らんすうは つかわない。O(n)
    const FORMATION = Object.freeze({ first: 100, firstBack: 60, gain: 6, spread: 50, rowGap: 65, curve: 40, depth: 300, depthNarrow: 440,
      spacing: 72, spacingNarrow: 90, open: 260, narrow: 180, maxRows: 4, maxRowsNarrow: 8, jitter: 12 });
    function partyFormationSlots(count, ctx = {}) {
      const n = Math.max(0, Math.floor(Number(count)) || 0);
      if (!n) return [];
      const maxHalf = clamp(ctx.maxHalf != null ? Number(ctx.maxHalf) : FORMATION.open, 50, FORMATION.open);
      const narrow = maxHalf < FORMATION.narrow;
      const first = Math.min(FORMATION.first, maxHalf * 0.75), spacing = narrow ? FORMATION.spacingNarrow : FORMATION.spacing;
      const halfOf = (r) => Math.min(maxHalf, first + r * FORMATION.spread);
      const capOf = (r) => Math.max(2, Math.floor((2 * halfOf(r)) / spacing) + 1);
      const maxRows = narrow ? FORMATION.maxRowsNarrow : FORMATION.maxRows;
      let rows = 1, cap = 2;
      while (cap < n && rows < maxRows) { cap += capOf(rows); rows++; }
      // 段ごとの 人数。1 段目は 2(じぶんの まうしろは あける)。のこりは 段の はばに あわせて くばる(はいりきらなければ こく)
      const counts = [Math.min(2, n)];
      let left = n - counts[0];
      if (rows > 1) {
        let capSum = 0; for (let r = 1; r < rows; r++) capSum += capOf(r);
        let given = 0;
        for (let r = 1; r < rows; r++) { const v = r === rows - 1 ? left - given : Math.min(left - given, Math.round(left * capOf(r) / capSum)); counts.push(v); given += v; }
      }
      const gap = rows > 1 ? Math.min(FORMATION.rowGap, (narrow ? FORMATION.depthNarrow : FORMATION.depth) / (rows - 1)) : 0;
      const out = [];
      counts.forEach((k, r) => {
        if (k <= 0) return;
        const half = r === 0 ? first : halfOf(r), base = FORMATION.firstBack + r * gap, row = [];
        for (let j = 0; j < k; j++) {
          // ひとりだけの 段は まんなかを さけて すこし よこへ(じぶんの あたまの うしろに かくれない)
          const x = k === 1 ? (r === 0 ? -0.8 : r % 2 ? 0.5 : -0.5) * half : -half + (j * 2 * half) / (k - 1);
          // まんなかほど おく(じぶんを かこむ 半円)
          row.push({ side: x, back: base + (1 - Math.min(1, (x / half) ** 2)) * (r === 0 ? 0 : FORMATION.curve), row: r });
        }
        // 段の なかは まんなか → そと、みぎ → ひだり の じゅん(並び順が いつも おなじ)
        row.sort((a, b) => Math.abs(a.side) - Math.abs(b.side) || b.side - a.side);
        out.push(...row);
      });
      return out;
    }
    // 人数と はば ごとに 1 回だけ 作って つかいまわす(毎 frame 作らない)
    const formationCache = new Map();
    function formationFor(count, maxHalf) {
      const key = count + ':' + (maxHalf == null ? 'open' : Math.round(maxHalf / 10) * 10);
      let v = formationCache.get(key);
      if (!v) { v = partyFormationSlots(count, { maxHalf: maxHalf == null ? undefined : Math.round(maxHalf / 10) * 10 }); if (formationCache.size > 64) formationCache.clear(); formationCache.set(key, v); }
      return v;
    }
    // ついていく つよさ(gain): はなれた きょり × gain で おいかける。あるいて いる ときの おくれ(= はやさ / gain)が ちいさく なる ように
    // もとの 3.5 から 6 に した(260/s で おくれ 74 → 43)。ひとり ひとりの ちいさな ちがい(よこ・おく・ついていく はやさ)は なまえ(key)から。毎 frame かわらない
    function formationJitter(a, i) {
      if (a.formJ) return a.formJ;
      const h = hash('form:' + (a.key || a.id || i)), J = FORMATION.jitter;
      a.formJ = { x: ((h & 255) / 255 - 0.5) * 2 * J, z: (((h >>> 8) & 255) / 255 - 0.5) * 2 * J, k: 0.9 + (((h >>> 16) & 255) / 255) * 0.2 };
      return a.formJ;
    }
    // その なかまの めざす ところ(カメラの むきで まわす。カメラは なめらかに まわる ので ならびも なめらかに まわる)
    function formationPoint(a, i, slots, px, pz, yaw) {
      const sl = slots[i] || slots[slots.length - 1] || { side: 0, back: FORMATION.firstBack }, j = formationJitter(a, i);
      const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw), side = sl.side + j.x, back = sl.back + j.z;
      return { x: px + rx * side + fx * back, z: pz + rz * side + fz * back, k: j.k };
    }

    // heading: むいている むき(ラジアン、0 = +z おく、+ = ひだりまわりに x+)。レンダラーは カメラの むきとの さで まえ/よこ/うしろ の え を えらぶ
    // sprites: { front, side?, back? } しょうらい ほうこう べつの えを たせる(いまは front だけ。よこは はんてん、うしろは すこし つぶして えがく)
    function makeActor(res, pos) {
      return Object.assign({}, res, { x: pos.x, z: pos.z, spot: pos.spot || null, fixed: !!pos.fixed, follow: !!pos.follow, slot: pos.slot || 0,
        behavior: 'idle', act: 'idle', until: rnd(0.5, 2.5), tx: pos.x, tz: pos.z, heading: pos.heading || 0, face: 1, bob: rnd(0, 6), say: null, sayFor: 0, chaseOf: null, met: false, tilt: 0,
        // ---- せいかつ(v1)。behavior = なにを しているか、emotion = どう かんじているか ----
        home: pos.spot || null,          // ふだんの いばしょ(ここから あまり はなれない)
        traits: lifeTraits(res.key || res.label || 'x'),
        energy: 0.5 + hrand((res.key || '') + ':e') * 0.45,
        emotion: 'normal',
        joy: 0, sulk: 0, cool: hrand((res.key || '') + ':c') * 14, wish: 0,
        route: null, partner: null, reservedBy: null, meet: null,
        tier: 0, nextAt: 0, noticeCool: 0 });
    }

    // ================= せいかつ(かんたんな じょうたい せんい と グループ こうどう) =================
    // ================= せいかつ: どこで なにが できるか(activity) =================
    // 住民の「いま なにを しているか」は behavior、「ここで なにが できるか」は activity。
    // activity は spot が もつ ので、しょうらい おみせ・いえ・つりば などを ふやす ときも
    // spot.activities に たすだけで、住民AI も プレイヤーの あそびも おなじ ものを よめる。
    // px も canvas も でてこない ので Three.js でも そのまま つかえる。
    const SPOT_LIFE = {
      //            ここで しやすい こと(おもい じゅん)                       seats 座れる / shelter 屋根
      plaza:   { acts: { gather: 1.5, talk: 1.4, play: 1.1, walk: 1.0, idle: 0.9, look: 0.6 }, seats: false, shelter: false },
      rest:    { acts: { sit: 1.5, rest: 1.4, talk: 0.9, idle: 1.0, look: 0.8, sleep: 0.5 }, seats: true, shelter: false },
      shelter: { acts: { rest: 1.5, sit: 1.2, sleep: 1.0, talk: 0.9, idle: 1.0 }, seats: true, shelter: true },
      water:   { acts: { look: 1.5, rest: 1.0, fish: 0.8, play: 0.7, idle: 0.8 }, seats: true, shelter: false },
      edge:    { acts: { watch: 1.8, look: 1.3, idle: 0.9, rest: 0.7 }, seats: false, shelter: false },
      grove:   { acts: { look: 1.1, walk: 1.0, rest: 1.0, idle: 0.9, gather: 0.5, sit: 0.6, sleep: 0.35 }, seats: true, shelter: false },
      shop:    { acts: { shop: 1.6, gather: 1.0, talk: 1.0, walk: 0.9, idle: 0.7 }, seats: false, shelter: true },
      path:    { acts: { walk: 1.3, idle: 0.9, look: 0.8 }, seats: false, shelter: false },
      deep:    { acts: { watch: 1.0, idle: 0.6 }, seats: false, shelter: false },
    };
    // スポットの め(prop)が「屋根」や「こしかけ」を あらわして いる もの
    const SHELTER_PROPS = new Set(['🏠', '🏡', '🏚️', '🛖', '🏪', '🏬', '🏢', '⛺', '🏕️', '🚉', '⛩️', '🕳️', '⛱️', '🏛️']);
    const SEAT_PROPS = new Set(['🪑', '🛝', '🪨', '🧺', '☕', '♨️', '⛱️']);
    // spot 1つの「ここで なにが できるか」。かたちと め から きめる ので 469 こ 手がきしない
    function spotLife(s, regionId) {
      const base = SPOT_LIFE[s.kind] || SPOT_LIFE.path;
      const acts = Object.assign({}, base.acts);
      const shelter = base.shelter || SHELTER_PROPS.has(s.prop || '');
      const seats = base.seats || SEAT_PROPS.has(s.prop || '');
      if (s.hub) { acts.gather = (acts.gather || 0) + 0.8; acts.talk = (acts.talk || 0) + 0.7; }
      if (s.landmark) { acts.watch = (acts.watch || 0) + 1.2; acts.look = (acts.look || 0) + 0.8; }
      if (shelter) { acts.rest = (acts.rest || 0) + 0.6; acts.sleep = (acts.sleep || 0) + 0.8; }
      if (seats) acts.sit = (acts.sit || 0) + 0.6;
      // かくし ばしょは ひとりで すごす ところ。あつまりは おきない
      if (s.secret) { delete acts.gather; delete acts.talk; delete acts.play; acts.idle = 1.2; acts.look = 1.2; acts.rest = 1.0; }
      // みずの ある 地域の みずべは「ながめる」が 主役
      if (s.kind === 'water' && (regionId === 'sea' || regionId === 'river_lake' || regionId === 'memory_lake')) acts.look += 0.6;
      // ねむれる ところは かぎる(みち・ひろば・みずの なかでは ねない)
      if (!shelter && s.kind !== 'rest' && s.kind !== 'grove') delete acts.sleep;
      return { acts, shelter, seats };
    }
    // 地域ごとの くらしの いろ。social=人と いる / quiet=ひとりで すごす / move=あるく / view=ながめる。
    // 13 地域を おなじ 数字に しない ことが たいせつ(おくちは しずかな まま)
    const REGION_LIFE = {
      home:        { social: 1.0, quiet: 0.95, move: 0.9, view: 0.8, group: 3 },
      city:        { social: 1.7, quiet: 0.5, move: 1.4, view: 0.7, group: 5 },
      countryside: { social: 0.9, quiet: 1.3, move: 0.85, view: 1.2, group: 3 },
      forest:      { social: 0.6, quiet: 1.4, move: 1.1, view: 1.1, group: 3 },
      mountain:    { social: 0.6, quiet: 1.3, move: 1.2, view: 1.5, group: 3 },
      snow:        { social: 0.85, quiet: 1.2, move: 0.9, view: 1.1, group: 3 },
      sea:         { social: 1.15, quiet: 0.9, move: 1.0, view: 1.5, group: 4 },
      deepsea:     { social: 0.35, quiet: 1.8, move: 0.9, view: 1.2, group: 2 },
      river_lake:  { social: 0.7, quiet: 1.4, move: 0.9, view: 1.5, group: 3 },
      jungle:      { social: 0.6, quiet: 1.0, move: 1.5, view: 1.0, group: 3 },
      desert:      { social: 0.6, quiet: 1.5, move: 1.1, view: 1.2, group: 3 },
      star_stop:   { social: 0.7, quiet: 1.4, move: 0.7, view: 1.8, group: 3 },
      memory_lake: { social: 0.2, quiet: 2.2, move: 0.7, view: 1.6, group: 2 },
    };
    const LIFE_DEFAULT = { social: 1, quiet: 1, move: 1, view: 1, group: 3 };
    // behavior を「どの いろの くらしか」で わける(地域・地区の 数字を かける さきを きめる)
    const LIFE_AXIS = { talk: 'social', gather: 'social', play: 'social', chase: 'social', shop: 'social',
      idle: 'quiet', rest: 'quiet', sit: 'quiet', sleep: 'quiet', walk: 'move', look: 'view', watch: 'view', fish: 'view' };
    // じかんたい。ぜんいんが 同時に かわらない よう、個体ごとの ずれ(phase)と あわせて つかう
    const TIME_LIFE = {
      morning: { walk: 1.35, idle: 1.0, talk: 0.8, gather: 0.6, play: 0.8, look: 1.0, watch: 0.9, rest: 0.5, sit: 0.6, sleep: 0.05, fish: 1.3, shop: 0.8 },
      day:     { walk: 1.2, idle: 1.0, talk: 1.3, gather: 1.3, play: 1.3, look: 1.0, watch: 1.0, rest: 0.8, sit: 0.9, sleep: 0.05, fish: 1.0, shop: 1.4 },
      evening: { walk: 0.9, idle: 1.1, talk: 1.2, gather: 0.9, play: 0.7, look: 1.6, watch: 1.8, rest: 1.4, sit: 1.3, sleep: 0.25, fish: 0.9, shop: 0.9 },
      night:   { walk: 0.5, idle: 0.9, talk: 0.5, gather: 0.3, play: 0.2, look: 1.2, watch: 1.3, rest: 1.8, sit: 1.2, sleep: 2.6, fish: 0.4, shop: 0.3 },
    };
    // てんき。雨だから みんな きえる、には しない(雨を ながめる 住民も のこす)
    const WEATHER_LIFE = {
      sunny:  {},
      cloudy: { look: 1.1 },
      rain:   { walk: 0.6, play: 0.3, gather: 0.5, talk: 0.95, rest: 1.6, sit: 1.3, look: 1.15, idle: 1.1, fish: 0.5 },
      snow:   { play: 1.4, walk: 0.9, look: 1.3, watch: 1.2, rest: 1.2, gather: 0.85, fish: 0.6 },
    };
    const SEASON_LIFE = {
      spring: { play: 1.15, look: 1.1, walk: 1.05 },
      summer: { play: 1.2, rest: 1.15, fish: 1.2 },
      autumn: { look: 1.2, watch: 1.15, walk: 1.1 },
      winter: { rest: 1.2, sleep: 1.15, play: 0.9, sit: 1.1 },
    };
    // 雨・雪の とき「屋根の ある ところ」へ よりやすく する ばいりつ
    const SHELTER_PULL = { rain: 2.6, snow: 1.5 };
    // 住民 1人の かるい かたむき。せいかくシステムでは なく、key から きまる ゆらぎ。
    // セーブには なにも ふやさない(おなじ key なら いつでも おなじ)
    function lifeTraits(key) {
      const h = hash(String(key) + ':life');
      const bit = (n) => ((h >>> n) % 1000) / 1000;
      return {
        wander: 0.65 + bit(0) * 0.9,   // よく あるく
        social: 0.45 + bit(5) * 1.2,   // 人と あつまりやすい
        calm: 0.6 + bit(10) * 1.0,     // よく やすむ
        gaze: 0.6 + bit(15) * 1.0,     // けしきを 見るのが すき
        pace: 0.75 + bit(20) * 0.65,   // 行動の ながさ
        phase: bit(25),                // 行動を はじめる ずれ(ぜんいん 同時に かわらない)
      };
    }
    const TRAIT_AXIS = { social: 'social', quiet: 'calm', move: 'wander', view: 'gaze' };
    const VERBS = { idle: 'たたずんでいる', walk: 'あるいている', sit: 'すわっている', look: 'あたりを見ている', talk: 'はなしている', sleep: 'ねむっている', swim: 'およいでいる', sway: 'ゆれている', play: 'あそんでいる', watch: 'けしきを見ている', fish: 'つりをしている', rest: 'やすんでいる', gather: 'あつまっている', chase: 'おいかけっこしている', shop: 'おみせを見ている' };
    // ================= せいかつ: なにを しているか(behavior)と どう かんじているか(emotion) =================
    // behavior = いま なにを しているか。emotion = どう かんじているか。この 2つは べつもの で、
    // 「talk だから happy」とは きめない。えの がわは この 2つを よむだけ なので、
    // canvas でも Three.js でも、表情の えが そろった あとでも、ここは かえずに すむ
    const MOVING = new Set(['walk', 'swim', 'play', 'chase']);
    // 住民の きもち。名まえは 表情の 正本(pet expression)と そろえて ある ので、
    // 表情の えが できたら emotion → 表情 の ひきあてを たすだけで つながる。
    // お世話の じょうたい(hungry / sick / weak / critical)は この せかいでは つかわない
    const RESIDENT_EMOTIONS = ['normal', 'happy', 'tired', 'sleeping', 'unhappy', 'wantsPlay', 'strained'];
    const LIFE = {
      detail: 1600,        // ここまでは まいフレーム くわしく うごかす
      near: 4200,          // ここまでは 6フレームに 1かい
      maxDetail: 48,       // くわしく うごかす さいだい 人数(これ いじょうは ふえない)
      nearStride: 6,
      distantPerFrame: 12, // とおい 住民は 1フレームに この 人数だけ すすめる
      interactPerFrame: 2, // さそいを さがすのは 1フレームに この かいすう だけ
      roam: 1400,          // じぶんの ばしょから はなれる きょり(せかいじゅうを うろつかない)
      talkGap: 88,         // はなす ときの あいだ
      meetR: 96,           // あつまりの わ の はんけい
      space: 46,           // 住民どうしの パーソナルスペース(かるく よける だけ)
      notice: 210,         // プレイヤーに きづく きょり
      noticeMax: 2,        // 同時に きづくのは この 人数まで(ぜんいんが あつまらない)
    };
    const faceTo = (a, x, z) => { a.heading = Math.atan2(x - a.x, z - a.z); a.face = x < a.x ? -1 : 1; };
    const lifeFree = (a) => !a.fixed && !a.plant && !a.follow;
    // みちの グラフを たどって spot から spot への みちのりを 出す(せかいを まっすぐ つっきらない)
    function routeTo(world, from, to, cap) {
      if (!from || !to || from === to || !world.spotAdj) return [];
      const prev = new Map([[from.id, null]]); const q = [from]; let n = 0, lim = cap || 60;
      while (q.length && n < lim) {
        const c = q.shift(); n++;
        for (const nb of world.spotAdj.get(c.id) || []) {
          if (prev.has(nb.id)) continue;
          prev.set(nb.id, c);
          if (nb === to) { const out = []; let k = nb; while (k && k !== from) { out.unshift(k); k = prev.get(k.id); } return out; }
          q.push(nb);
        }
      }
      return [];
    }
    // 「いま ここで なにが したいか」。ばしょ・地域・地区の にぎやかさ・じかん・てんき・きせつ・
    // その こ の かたむき、を ぜんぶ かけて えらぶ。おなじ 地域でも 地区で かわる
    function wantActivity(a, e, world, spot) {
      const R = REGION_LIFE[world.regionId] || LIFE_DEFAULT;
      const tl = TIME_LIFE[e.time] || TIME_LIFE.day;
      const wl = WEATHER_LIFE[e.weather] || null;
      const sl = SEASON_LIFE[e.season] || null;
      const t = a.traits, zc = spot.zoneCrowd != null ? spot.zoneCrowd : 1;
      const acts = spot.actWeights || SPOT_LIFE.path.acts;
      let total = 0; const keys = [], ws = [];
      for (const k in acts) {
        let w = acts[k];
        const axis = LIFE_AXIS[k];
        if (axis) { w *= R[axis] || 1; w *= t[TRAIT_AXIS[axis]] || 1; }
        // しずかな 地区では さそいあいが おきにくい(おくちは しずかな まま)
        if (axis === 'social') w *= clamp(zc / 1.1, 0.18, 2.2);
        if (tl[k] != null) w *= tl[k];
        if (wl && wl[k] != null) w *= wl[k];
        if (sl && sl[k] != null) w *= sl[k];
        if (a.water) { if (k === 'sleep' || k === 'sit' || k === 'shop') w *= 0.15; if (k === 'look') w *= 1.2; }
        if (a.night && e.time === 'night') { if (k === 'sleep') w *= 0.15; if (k === 'walk' || k === 'look') w *= 1.8; }
        if (a.energy < 0.3 && (k === 'rest' || k === 'sit' || k === 'sleep')) w *= 1.8;
        if (a.energy > 0.8 && (k === 'walk' || k === 'play')) w *= 1.3;
        if (a.cool > 0 && axis === 'social') w *= 0.15; // はなした あとは すこし ひとりで
        if (w > 0.0001) { keys.push(k); ws.push(w); total += w; }
      }
      if (!total) return 'idle';
      let r = rand() * total;
      for (let i = 0; i < keys.length; i++) { r -= ws[i]; if (r <= 0) return keys[i]; }
      return keys[keys.length - 1];
    }
    // その activity が できる、じぶんの ばしょの ちかくの spot を えらぶ
    function goalFor(a, world, act, from, e) {
      const home = a.home || from;
      const pull = e && SHELTER_PULL[e.weather] ? SHELTER_PULL[e.weather] : 0;
      let total = 0; const cands = [], ws = [];
      for (const s of world.spots) {
        if (!s.actWeights || !s.actWeights[act]) continue;
        if (s.kind === 'deep') continue;
        if (s.secret && s !== home) continue; // かくし ばしょに 出入りするのは そこの 住民だけ
        const d = Math.hypot(s.x - home.x, s.z - home.z);
        if (d > LIFE.roam) continue;
        // いまの ばしょ・ふだんの ばしょに とどまりやすい(ずっと あるきまわらない)
        let w = s.actWeights[act] * (s === from ? 3.2 : s === home ? 2.4 : 1) / (1 + d / 600);
        // 雨・雪の ときは 屋根の ある ところへ よりやすい(ただし ぜんいんでは ない)
        if (pull && s.shelter) w *= pull;
        cands.push(s); ws.push(w); total += w;
      }
      if (!total) return from;
      let r = rand() * total;
      for (let i = 0; i < cands.length; i++) { r -= ws[i]; if (r <= 0) return cands[i]; }
      return cands[cands.length - 1];
    }
    // 行動の ながさ。ぜんいんが 数びょう ごとに 一斉に かわらない ように、
    // behavior ごとの はばと、その こ の pace で ばらす
    const ACT_SPAN = { idle: [2.5, 7], walk: [4, 11], look: [5, 13], watch: [7, 16], rest: [10, 26], sit: [9, 22],
      sleep: [22, 60], talk: [7, 16], gather: [10, 24], play: [6, 14], chase: [5, 10], fish: [12, 28], shop: [6, 14], swim: [6, 14], sway: [8, 18] };
    function actSpan(a, act) { const s = ACT_SPAN[act] || ACT_SPAN.idle; return rnd(s[0], s[1]) * a.traits.pace; }
    // spot の なかの しぜんな 立ちいち(まんなかに かさならない)
    function spotPoint(world, s, seed, water) {
      const ang = hrand(seed + 'a') * TAU, d = s.r * (0.25 + hrand(seed + 'd') * 0.5);
      const pt = { x: s.x + Math.sin(ang) * d, z: s.z + Math.cos(ang) * d * 0.75 };
      return standClear(pt, world, water, s); // 木や かべの なかに 立たない
    }
    // ---- さそいあい(interaction): 予約 → ちかづく → 向きあう → しばらく → 自然に 解散 ----
    // 1人に 3〜4人が いっぺんに 申しこんで へんな ことに ならない よう、あいてを 予約する
    function interactable(b, a) {
      return b !== a && lifeFree(b) && !b.partner && !b.reservedBy && !b.meet && b.cool <= 0
        && b.behavior !== 'sleep' && b.behavior !== 'talk' && b.behavior !== 'gather' && !b.water === !a.water;
    }
    function seekPartner(a, list, range) {
      let best = null, bd = range * range;
      for (let i = 0; i < list.length; i++) {
        const b = list[i]; if (!interactable(b, a)) continue;
        const dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz;
        if (d2 < bd) { bd = d2; best = b; }
      }
      return best;
    }
    function releaseInteraction(a) {
      if (a.partner) { const b = a.partner; a.partner = null; if (b.partner === a) { b.partner = null; b.reservedBy = null; b.cool = rnd(8, 22); if (b.behavior === 'talk' || b.act === 'talk') { b.behavior = 'idle'; b.until = rnd(1.5, 4); } } }
      if (a.reservedBy) { const b = a.reservedBy; a.reservedBy = null; if (b && b.partner === a) { b.partner = null; b.cool = rnd(8, 22); } }
      if (a.meet) { const m = a.meet; a.meet = null; const i = m.members.indexOf(a); if (i >= 0) m.members.splice(i, 1); }
      a.cool = Math.max(a.cool, rnd(6, 18));
    }
    // すでに できて いる あつまりが ちかくに あれば そこへ 入る。なければ じぶんが はじめる。
    // こう する ことで「べつべつの 場所で ひとりずつ あつまる」ことが なくなる
    function findMeet(world, a, spot, kind) {
      let best = null, bd = Infinity;
      for (const m of world.meets) {
        if (m.kind !== kind || m.members.length >= m.cap || m.until <= 10) continue;
        const d = Math.hypot(m.x - a.x, m.z - a.z);
        if (m.spot === spot) return m;
        if (d < 760 && d < bd) { bd = d; best = m; }
      }
      if (best) return best;
      const R = REGION_LIFE[world.regionId] || LIFE_DEFAULT;
      const cap = kind === 'play' ? 2 + (rand() < 0.35 ? 1 : 0) : Math.max(2, Math.min(R.group, 2 + Math.floor(rand() * ((spot.zoneCrowd || 1) > 1.6 ? R.group - 1 : 2))));
      const m = { kind, spot, x: spot.x, z: spot.z, members: [], cap, until: rnd(26, 58) };
      world.meets.push(m); return m;
    }
    // ---- きもち(emotion)。behavior とは べつに きまる ----
    function updateEmotion(a, e, world, dt) {
      const moving = MOVING.has(a.behavior);
      // げんき は ゆっくり へって ゆっくり もどる。ずっと あるいて いると 5分ほどで つかれる
      if (!a.plant && !a.fixed) a.energy = clamp(a.energy + (a.behavior === 'sleep' ? 0.030 : a.behavior === 'rest' || a.behavior === 'sit' ? 0.012 : moving ? -0.0035 : 0.002) * dt, 0, 1);
      if (a.joy > 0) a.joy -= dt;
      if (a.sulk > 0) a.sulk -= dt;
      if (a.cool > 0) a.cool -= dt;
      let em = 'normal';
      if (a.plant || a.fixed) { a.emotion = 'normal'; return; }
      if (a.behavior === 'sleep') em = 'sleeping';
      else if (a.sulk > 0) em = 'unhappy';
      else if (a.joy > 0) em = 'happy';
      else if (a.energy < 0.22) em = 'tired';
      else if (a.wish > 2 && a.cool <= 0) em = 'wantsPlay';
      else if ((e.weather === 'rain' || e.weather === 'snow') && a.spot && !a.spot.shelter && a.energy < 0.55 && a.traits.calm < 1.1) em = 'strained';
      a.emotion = em;
    }
    // ---- 1人ぶんの せいかつ。くわしい そう(detail)でも 近い そう(near)でも おなじ かんすう ----
    function updateActor(a, dt, e, world, others) {
      a.bob += dt * (a.behavior === 'swim' ? 3 : 2);
      a.until -= dt;
      if (a.sayFor > 0) { a.sayFor -= dt; if (a.sayFor <= 0) { a.sayFor = 0; a.say = null; } }
      if (!a.traits) a.traits = lifeTraits(a.key || a.label || 'x');
      if (a.energy == null) a.energy = 0.7;
      updateEmotion(a, e || ENV_FALLBACK, world, dt);
      // ナオトの とくべつな いばしょ・しょくぶつ・ついてくる こ は これまでどおり
      if (a.fixed) { a.behavior = 'watch'; return; }
      if (a.plant) { if (a.until <= 0) { a.behavior = 'sway'; a.until = actSpan(a, 'sway'); } return; }
      const env = e || ENV_FALLBACK;

      // --- はなしている ---
      if (a.behavior === 'talk') {
        const b = a.partner;
        if (!b || b.partner !== a || Math.hypot(b.x - a.x, b.z - a.z) > LIFE.talkGap * 1.7) { releaseInteraction(a); a.behavior = 'idle'; a.until = rnd(1.5, 4); return; }
        faceTo(a, b.x, b.z);
        if (a.until <= 0) { a.joy = rnd(10, 26); b.joy = rnd(10, 26); b.until = Math.min(b.until, 0.1); releaseInteraction(a); a.behavior = 'idle'; a.until = rnd(2, 5); }
        return;
      }
      // --- あつまって いる / いっしょに あそんで いる ---
      if (a.meet && (a.behavior === 'gather' || a.behavior === 'play')) {
        const m = a.meet;
        if (m.members[0] === a) m.until -= dt;
        if (m.until <= 0) { a.joy = rnd(8, 20); releaseInteraction(a); a.behavior = 'idle'; a.until = rnd(2, 5); return; }
        if (a.behavior === 'gather') { faceTo(a, m.x, m.z); return; }
        // あそびは じぶんの いちの まわりを ちょこちょこ うごく(なかまと かさならない)
        if (a.until <= 0) {
          const cx = a.ringX != null ? a.ringX : a.x, cz = a.ringZ != null ? a.ringZ : a.z;
          const ang2 = hrand(a.key + 'pl' + m.until.toFixed(1)) * TAU, rr = 12 + hrand(a.key + 'pr' + m.until.toFixed(1)) * 30;
          a.tx = cx + Math.sin(ang2) * rr; a.tz = cz + Math.cos(ang2) * rr * 0.75; a.until = rnd(1.2, 2.6);
        }
        stepToward(a, world, dt, 120); return;
      }
      // --- 目的地へ みちを つたって あるく ---
      if (a.route && a.route.length) {
        const nx = a.route[0];
        const reach = a.route.length === 1 ? Math.max(40, nx.r * 0.55) : Math.max(60, nx.r * 0.8);
        if (Math.hypot(nx.x - a.x, nx.z - a.z) <= reach) {
          a.route.shift(); if (nx.kind) a.spot = nx;
          if (!a.route.length) { arriveAt(a, env, world, others); return; }
        }
        const t = a.route[0];
        if (t) { a.tx = t.x; a.tz = t.z; }
        a.behavior = 'walk';
        stepToward(a, world, dt, a.water ? 70 : 62 * a.traits.pace);
        if (a.until <= -90) { a.route = null; arriveAt(a, env, world, others); } // 行けない ところを めざし つづけない
        return;
      }
      // --- その ばで うごく もの(あるきまわる・およぐ・おいかけっこ) ---
      if (a.behavior === 'chase' && a.chaseOf) {
        const o = a.chaseOf; a.tx = o.x + (a.x < o.x ? -50 : 50); a.tz = o.z + 20;
        if (!lifeFree(o) || o.behavior === 'sleep' || o.behavior === 'talk') a.until = 0;
      }
      if (MOVING.has(a.behavior)) {
        const d = Math.hypot(a.tx - a.x, a.tz - a.z);
        if (d > 6) stepToward(a, world, dt, a.behavior === 'play' || a.behavior === 'chase' ? 120 : a.behavior === 'swim' ? 70 : 62 * a.traits.pace);
        else if (a.behavior === 'walk' && a.until > 0.5) { const p = spotPoint(world, a.spot || { x: a.x, z: a.z, r: 140 }, a.key + a.until.toFixed(1)); a.tx = p.x; a.tz = p.z; }
      }
      // --- つぎの こと を きめる ---
      if (a.until <= 0) nextActivity(a, env, world, others);
    }
    const ENV_FALLBACK = { time: 'day', weather: 'sunny', season: 'spring' };
    // じっさいに うごかす(あたりはんてい を とおす)
    function stepToward(a, world, dt, spd) {
      const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz);
      if (d <= 0.001) return;
      const nx = a.x + dx / d * spd * dt, nz = a.z + dz / d * spd * dt;
      moveWithCollision(a, nx, nz, world, RULES.bodyRadius * STAND_CLEAR, !!a.water, !!a.water);
      a.heading = Math.atan2(dx, dz); a.face = dx < 0 ? -1 : 1;
    }
    // ついた ところで、めざして いた activity を はじめる
    function arriveAt(a, e, world, others) {
      a.route = null;
      const act = a.act || 'idle';
      if (act === 'talk' && a.partner && a.partner.partner === a) {
        const b = a.partner;
        if (Math.hypot(b.x - a.x, b.z - a.z) < LIFE.talkGap * 1.55) {
          // むきあう きょりに そろえる(ついた いちの ずれを のこさない)
          const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
          const ux = b.x - a.x, uz = b.z - a.z, ul = Math.hypot(ux, uz) || 1, h = LIFE.talkGap / 2;
          a.x = mx - ux / ul * h; a.z = mz - uz / ul * h; b.x = mx + ux / ul * h; b.z = mz + uz / ul * h;
          resolveObstacles(a, world, RULES.bodyRadius * STAND_CLEAR, !!a.water);
          resolveObstacles(b, world, RULES.bodyRadius * STAND_CLEAR, !!b.water);
          a.behavior = b.behavior = 'talk'; a.act = b.act = 'talk';
          a.until = b.until = actSpan(a, 'talk');
          a.waitTalk = b.waitTalk = 0;
          faceTo(a, b.x, b.z); faceTo(b, a.x, a.z);
          return;
        }
        // さきに ついた ほうは すこし まつ(すれちがいで さそいが こわれない)
        a.waitTalk = (a.waitTalk || 0) + 1;
        if (a.waitTalk <= 3) { a.behavior = 'idle'; a.until = 3; faceTo(a, b.x, b.z); return; }
        a.waitTalk = 0; releaseInteraction(a);
      }
      if ((act === 'gather' || act === 'play') && a.meet) {
        const m = a.meet;
        // ひとりでは あつまりに ならない。だれか 来るまで すこし まって、来なければ やめる
        if (m.members.length < 2) { a.behavior = 'idle'; a.until = rnd(5, 11); a.waitMeet = (a.waitMeet || 0) + 1; if (a.waitMeet > 2) { releaseInteraction(a); a.waitMeet = 0; } faceTo(a, m.x, m.z); return; }
        a.waitMeet = 0;
        const atMeet = (q) => Math.hypot(q.x - m.x, q.z - m.z) < LIFE.meetR * 2.2;
        // まだ ついて いない なかまは あつまって いる ことに しない(はなれた ところで
        // いきなり あつまって いる のを ふせぐ)。ついて いる なかま だけ はじめる
        for (const q of m.members) if (q.behavior === 'idle' && q.meet === m && atMeet(q)) { q.behavior = m.kind; q.until = m.kind === 'play' ? rnd(1.2, 2.6) : actSpan(q, 'gather'); faceTo(q, m.x, m.z); }
        if (!atMeet(a)) {
          const i2 = Math.max(0, m.members.indexOf(a)), an = (i2 / Math.max(1, m.cap)) * TAU + hrand(a.key + 'g') * 0.7;
          const rx = m.x + Math.sin(an) * LIFE.meetR, rz = m.z + Math.cos(an) * LIFE.meetR * 0.7;
          a.ringX = rx; a.ringZ = rz;
          a.route = [{ id: '@ring', x: rx, z: rz, r: 26 }]; a.tx = rx; a.tz = rz; a.behavior = 'walk'; a.until = actSpan(a, 'walk') + 10; return;
        }
        a.behavior = act; a.until = act === 'play' ? rnd(1.2, 2.6) : actSpan(a, 'gather');
        faceTo(a, m.x, m.z);
        return;
      }
      beginActivity(a, act, e, world);
    }
    // その ばで activity を はじめる(むきも ここで きめる)
    function beginActivity(a, act, e, world) {
      const s = a.spot || { x: a.x, z: a.z, r: 140 };
      a.act = act; a.behavior = act === 'gather' || act === 'talk' ? 'idle' : act;
      a.until = actSpan(a, a.behavior);
      if (a.behavior === 'walk') { const p = spotPoint(world, s, a.key + ':w' + Math.floor(a.until * 10)); a.tx = p.x; a.tz = p.z; }
      else if (a.behavior === 'swim') { const p = spotPoint(world, s, a.key + ':s' + Math.floor(a.until * 10)); a.tx = p.x; a.tz = p.z; }
      else if (a.behavior === 'play') { const p = spotPoint(world, s, a.key + ':p' + Math.floor(a.until * 10)); a.tx = p.x; a.tz = p.z; }
      else if (a.behavior === 'look' || a.behavior === 'watch') {
        // けしき・ランドマークの ほうを 見る
        const lm = world.lifeView && world.lifeView.get(s.id);
        if (lm) faceTo(a, lm.x, lm.z); else faceTo(a, s.x + (a.x < s.x ? 240 : -240), s.z + 260);
      } else if (a.behavior === 'fish' || a.behavior === 'shop') faceTo(a, s.x, s.z);
      else if (a.behavior === 'sit' || a.behavior === 'rest') { a.heading = Math.atan2(s.x - a.x, s.z - a.z) + (hrand(a.key + 'r') - 0.5) * 1.2; a.face = Math.sin(a.heading) < 0 ? -1 : 1; }
      else if (a.behavior === 'sleep') { a.heading = hrand(a.key + 'z') * TAU - Math.PI; a.face = Math.sin(a.heading) < 0 ? -1 : 1; }
      else if (a.behavior === 'idle') { a.heading = hrand(a.key + 'i' + Math.floor(a.until)) * TAU - Math.PI; a.face = Math.sin(a.heading) < 0 ? -1 : 1; }
    }
    // つぎに なにを するか: やりたい こと → できる spot → みちで いどう → 一定時間 やる
    function nextActivity(a, e, world, others) {
      if (a.partner || a.meet) releaseInteraction(a);
      const here = a.spot || a.home;
      if (!here) { a.behavior = 'idle'; a.until = actSpan(a, 'idle'); return; }
      // つかれたら やすめる ところを さがす(いまの spot に なくても いい)
      if (a.energy < 0.22 && rand() < 0.7) return travelTo(a, e, world, e.time === 'night' ? 'sleep' : 'rest');
      const act = wantActivity(a, e, world, here);
      // さそいあい は あいてが いて はじめて なりたつ
      if (act === 'talk') {
        a.wish++;
        const b = others && world.lifeBudget > 0 ? seekPartner(a, others, 260) : null;
        if (b) {
          world.lifeBudget--;
          a.partner = b; b.partner = a; b.reservedBy = a; a.wish = 0; b.wish = 0;
          const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
          const half = LIFE.talkGap / 2;
          const ux = (b.x - a.x) || 1, uz = (b.z - a.z), ul = Math.hypot(ux, uz) || 1;
          a.act = b.act = 'talk'; a.route = null; b.route = null;
          a.tx = mx - ux / ul * half; a.tz = mz - uz / ul * half;
          b.tx = mx + ux / ul * half; b.tz = mz + uz / ul * half;
          a.behavior = b.behavior = 'walk'; a.until = b.until = 6;
          a.route = [{ id: '@meet', x: a.tx, z: a.tz, r: 30 }];
          b.route = [{ id: '@meet', x: b.tx, z: b.tz, r: 30 }];
          return;
        }
        return travelTo(a, e, world, a.wish > 3 ? 'walk' : 'idle');
      }
      if (act === 'gather' || act === 'play') {
        const goal = goalFor(a, world, act, here, e);
        const m = findMeet(world, a, goal, act);
        if (m.members.length >= m.cap) return travelTo(a, e, world, 'idle');
        m.members.push(a); a.meet = m; a.act = act; a.wish = 0;
        return travelTo(a, e, world, act, m.spot);
      }
      travelTo(a, e, world, act);
    }
    // やりたい ことが できる spot へ、みちを つたって むかう(そのばで できるなら そのまま)
    function travelTo(a, e, world, act, forced) {
      const here = a.spot || a.home;
      a.act = act;
      const goal = forced || goalFor(a, world, act, here, e);
      const route = goal && goal !== here ? routeTo(world, here, goal, 60) : [];
      // あつまり は「わの いち」が さいごの 目的地。だから ついた ときに
      // とんだり、はなれた ところで いきなり あつまって いたり しない
      if ((act === 'gather' || act === 'play') && a.meet) {
        const m = a.meet, i = Math.max(0, m.members.indexOf(a));
        const ang = (i / Math.max(1, m.cap)) * TAU + hrand(a.key + 'g') * 0.7;
        a.ringX = m.x + Math.sin(ang) * LIFE.meetR; a.ringZ = m.z + Math.cos(ang) * LIFE.meetR * 0.7;
        route.push({ id: '@ring', x: a.ringX, z: a.ringZ, r: 26 });
      }
      if (!route.length) { a.route = null; arriveAt(a, e, world); return; }
      a.route = route; a.behavior = 'walk'; a.until = actSpan(a, 'walk') + route.length * 8;
      a.tx = route[0].x; a.tz = route[0].z;
    }
    // ---- とおくの 住民: まいフレーム うごかさず、「つぎに うごく 時こく」だけ もつ ----
    // はなれて いる あいだも せかいは すこし すすむ ので、もどって きたら
    // さっきと ちがう ばしょに いたり、やすんで いたり する。びょう たんいの
    // かんぜんな けいさんは しない ので、せかいが ひろく なっても おもく ならない
    function stepDistant(a, e, world, clock) {
      if (!a.traits) a.traits = lifeTraits(a.key || a.label || 'x');
      if (a.nextAt > clock) return false;
      // はなれる ときは さそいあいを きちんと おわらせる(あいてを おきざりに しない)
      if (a.partner || a.meet) releaseInteraction(a);
      const here = a.spot || a.home;
      if (!here) { a.nextAt = clock + 20; return false; }
      const act = wantActivity(a, e, world, here);
      const goal = act === 'gather' || act === 'play' || act === 'talk' ? here : goalFor(a, world, act, here, e);
      a.spot = goal; a.act = act;
      a.behavior = act === 'talk' || act === 'gather' ? 'idle' : act;
      const p = spotPoint(world, goal, a.key + ':d' + Math.floor(clock), a.water);
      a.x = p.x; a.z = p.z; a.tx = p.x; a.tz = p.z;
      a.heading = hrand(a.key + 'dh' + Math.floor(clock)) * TAU - Math.PI;
      a.face = Math.sin(a.heading) < 0 ? -1 : 1;
      a.energy = clamp(a.energy + (a.behavior === 'sleep' || a.behavior === 'rest' ? 0.25 : -0.05), 0, 1);
      a.until = actSpan(a, a.behavior);
      // みちのりの ぶんも 時間に いれる(いきなり 3つ さきの spot には いない)
      const hop = Math.hypot(goal.x - here.x, goal.z - here.z) / LIFE.speed;
      a.nextAt = clock + a.until + hop;
      a.route = null;
      return true;
    }
    // とおい そうから もどって きた ときに、へんな ところに 立って いない ように する
    function reenterDetail(a, world) {
      const s = a.spot || a.home; if (!s) return;
      if (Math.hypot(a.x - s.x, a.z - s.z) > s.r * 1.6) { const p = spotPoint(world, s, a.key + ':re', a.water); a.x = p.x; a.z = p.z; }
      a.route = null;
      standClear(a, world, a.water, s);
      a.tx = a.x; a.tz = a.z;
    }
    // 住民どうしは かたい かべに しない。かるく よける だけ(ぎゅうぎゅうに つまらない)
    function personalSpace(list, n, world) {
      const r = LIFE.space, r2 = r * r;
      for (let i = 0; i < n; i++) {
        const a = list[i]; if (!lifeFree(a)) continue;
        for (let j = i + 1; j < n; j++) {
          const b = list[j]; if (!lifeFree(b)) continue;
          const dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz;
          if (d2 >= r2 || d2 < 0.0001) continue;
          const d = Math.sqrt(d2), push = (r - d) * 0.25 / d;
          a.x -= dx * push; a.z -= dz * push; b.x += dx * push; b.z += dz * push;
          resolveObstacles(a, world, RULES.bodyRadius * STAND_CLEAR, !!a.water); resolveObstacles(b, world, RULES.bodyRadius * STAND_CLEAR, !!b.water);
        }
      }
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
      const r = rand();
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
      bodyRadius: 22,        // からだの おおきさ(あたりはんてい)。じゅうみんも おなじ
      metRadius: 150,        // この きょりに はいると「であった」
      talkRadius: 130,       // この きょりなら「はなす」が おせる
      nearRadius: 1500,      // この はんいの じゅうみんは まいフレーム うごく
      farStride: 12,         // とおい じゅうみんは 12 フレームに 1かい(そんざいは けさない)
      bubbleSec: 3.6,        // ふきだしの ながさ
      follow: { gap: 100, back: 50, spacing: 30, snap: 30, maxSpeed: 340 },
      cam: { turnRate: 1.9, deadZone: 0.5, pathAssist: 0.55, ease: 1.6, carryRate: 2.4 }, // カメラの むきは あるく むきに ゆっくり。みちの むきにも すこし あわせる。carryRate は 地域を こえた ときの もどし(ラジアン/びょう)
      // ごく かるい カメラの えんしゅつ。ぜんぶ 数%。iPhone で よわない ことを さいゆうせん に する
      //   bob    : あるいて いる あいだの たてゆれ(たかさの わりあい)
      //   speed  : はやく うごいて いる ときに すこし ひく(きょりの わりあい)
      //   open   : ひろい ばしょは ひき、せまい ばしょは よる(地区の open)
      //   look   : ランドマークに ちかづいた とき、そちらへ ほんの すこし むく(ラジアン)
      //   ease   : えんしゅつが きりかわる はやさ
      motion: { bob: 0.012, bobHz: 2.3, speed: 0.06, open: 0.9, look: 0.09, lookRange: 900, ease: 2.4 },
    };
    const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    const hitTest = (a, b, r) => dist(a, b) < r;
    // みずぎわの よこいち(z の ところの みずと りくの さかいめ)
    function shoreX(world, z) {
      const t = world.terrain; if (!t || t.kind !== 'coast') return null;
      const pts = t.pts; if (z <= pts[0][1]) return pts[0][0]; if (z >= pts[pts.length - 1][1]) return pts[pts.length - 1][0];
      for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; if (z >= az && z <= bz) return ax + (bx - ax) * ((z - az) / (bz - az || 1)); }
      return pts[pts.length - 1][0];
    }
    // みずの ある 地域は あるける よこはばが せまい(うみの なかへは はいらない)
    function clampToWorld(pt, world) {
      const hw = world.halfW || RULES.xBound;
      let lo = world.minX != null ? world.minX : -hw, hi = world.maxX != null ? world.maxX : hw;
      const sx = shoreX(world, pt.z);
      if (sx != null) { if (world.terrain.side < 0) lo = sx + 30; else hi = sx - 30; }
      pt.x = clamp(pt.x, lo, hi); pt.z = clamp(pt.z, RULES.zMargin, world.len - RULES.zMargin); return pt;
    }
    // 地区の きぶん(mood)を いちで まぜる: ちかい 地区ほど つよく(きょりの 2じょうの ぎゃくすう)。three.js でも おなじ 値で きり・あかるさを きめられる
    const MOOD_DEFAULT = { light: 1, fog: 0, tint: null, walls: 1, anim: null, open: 1 };
    function moodAt(world, x, z) {
      if (!world.zones || !world.zones.length) return Object.assign({}, MOOD_DEFAULT);
      let tw = 0, light = 0, fog = 0, tr = 0, tg = 0, tb = 0, tintW = 0, nearest = null, nd = Infinity;
      for (const zn of world.zones) { const d = Math.hypot(zn.x - x, zn.z - z); const w = 1 / (1 + Math.pow(d / 520, 3)); tw += w; light += (zn.mood.light != null ? zn.mood.light : 1) * w; fog += (zn.mood.fog || 0) * w; if (zn.mood.tint) { const c = hexToRgb(zn.mood.tint); tr += c[0] * w; tg += c[1] * w; tb += c[2] * w; tintW += w; } if (d < nd) { nd = d; nearest = zn; } }
      // anim(この ばしょで うごく 主役)と open(みはらし: カメラを ひくか よせるか)は
      // いちばん ちかい 地区の もの。まざると どっちつかずに なる ので まぜない
      const out = { light: light / tw, fog: fog / tw, tint: tintW > 0 ? [Math.round(tr / tintW), Math.round(tg / tintW), Math.round(tb / tintW)] : null, tintAmt: tintW / tw, zone: nearest,
        anim: (nearest && nearest.mood.anim) || null, open: (nearest && nearest.mood.open) || 1 };
      // その ばしょ だけの きぶん(鳥居の むこう・山道・のりば・どうくつ)。
      // 地区より せまい はんいで、ちかづくほど つよく まざる。ふつうの spot には ない ので
      // まいフレームの しごとは ふえない(mood を もつ spot だけ しらべる)
      const ms = world.moodSpots;
      if (ms && ms.length) for (let i = 0; i < ms.length; i++) {
        const q = ms[i], d = Math.hypot(q.x - x, q.z - z), r = q.r * 1.35;
        if (d >= r) continue;
        const t = 1 - d / r, m = q.mood;
        if (m.light != null) out.light += m.light * t;
        if (m.fog != null) out.fog = Math.max(0, out.fog + m.fog * t);
        if (m.open != null) out.open += m.open * t;
        if (m.tint) { const c = hexToRgb(m.tint); const base = out.tint || c;
          out.tint = [Math.round(base[0] + (c[0] - base[0]) * t), Math.round(base[1] + (c[1] - base[1]) * t), Math.round(base[2] + (c[2] - base[2]) * t)];
          out.tintAmt = Math.min(1, (out.tintAmt || 0) + 0.35 * t); }
      }
      return out;
    }
    function hexToRgb(h) { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return [128, 128, 128]; const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
    // ます目から まわりの あたりはんてい だけを とって、あさい むきへ すべらせる。
    // おし出された さきで べつの ものに めりこむ ことが ある ので 2かい まわす
    function resolveObstacles(pt, world, rad, skipWater) {
      const r = rad != null ? rad : RULES.bodyRadius;
      for (let pass = 0; pass < 3; pass++) {
        const list = collidersAt(world, pt.x, pt.z);
        let hit = false;
        for (let i = 0; i < list.length; i++) { const o = list[i]; if (skipWater && o.role === 'water') continue; if (pushOutCollider(pt, o, r)) hit = true; }
        if (!hit) break;
      }
      return pt;
    }
    // その ばしょが どれだけ めりこんで いるか(0 なら ぶつかって いない)
    function colliderPenetration(o, x, z, rad) {
      if (o.shape !== 'box') { const d = Math.hypot(x - o.x, z - o.z); return Math.max(0, o.hw + rad - d); }
      const ex = Math.sin(o.ang), ez = Math.cos(o.ang), rx = x - o.x, rz = z - o.z;
      const lx = rx * ex + rz * ez, lz = rx * ez - rz * ex;
      const ox = o.hw + rad - Math.abs(lx), oz = o.hd + rad - Math.abs(lz);
      return ox > 0 && oz > 0 ? Math.min(ox, oz) : 0;
    }
    function penetrationAt(world, x, z, rad, skipWater) {
      const r = rad != null ? rad : RULES.bodyRadius;
      const list = collidersAt(world, x, z);
      let sum = 0;
      for (let i = 0; i < list.length; i++) { const o = list[i]; if (skipWater && o.role === 'water') continue; sum += colliderPenetration(o, x, z, r); }
      return sum;
    }
    const collidesAt = (world, x, z, rad, skipWater) => penetrationAt(world, x, z, rad, skipWater) > 0;
    // 立ちいちの はんけい。うごく ときも おく ときも おなじ すう字を つかう
    const STAND_CLEAR = 0.8;
    // 住民を「ほんとうに 立てる ところ」へ そろえる。あたりはんていは #294 からの
    // world-space COLLIDER と spatial grid を そのまま つかい、あたらしい はんていは
    // つくらない。ふつうは おし出し 1 回で すむ。ふかく めりこんで いて 出られない
    // ときだけ、よりどころ(spot の まんなか。みちと spot は COLLIDER 側で
    // あけて あるので かならず 立てる)へ むかって、いちばん ちかい 立てる ところを さがす。
    // よぶのは「おく とき」だけ(うまれた とき / spot の 立ちいちを きめる とき /
    // とおい そうから もどる とき)で、まいフレームでは ない
    function standClear(pt, world, water, anchor) {
      const r = RULES.bodyRadius * STAND_CLEAR;
      if (!water) clampToWorld(pt, world);
      resolveObstacles(pt, world, r, !!water);
      if (!collidesAt(world, pt.x, pt.z, r, !!water)) return pt;
      if (!anchor) return pt;
      for (let i = 1; i <= 6; i++) {
        const t = i / 6;
        const x = pt.x + (anchor.x - pt.x) * t, z = pt.z + (anchor.z - pt.z) * t;
        if (!collidesAt(world, x, z, r, !!water)) { pt.x = x; pt.z = z; return pt; }
      }
      pt.x = anchor.x; pt.z = anchor.z;
      if (!water) clampToWorld(pt, world);
      return pt;
    }
    // うごかす ときは かならず ここを とおす(プレイヤーも じゅうみんも おなじ)。
    //   1) おし出しで かべに そって すべる(ななめでも ひっかからない)
    //   2) それでも めりこみが ふえる なら うごかさない = ぜったいに すりぬけない
    //   3) もともと めりこんで いた ときは「へる うごき」だけ ゆるす(そとへ にげられる)
    function moveWithCollision(pt, nx, nz, world, rad, skipWater, noClamp) {
      const ox = pt.x, oz = pt.z;
      const before = penetrationAt(world, ox, oz, rad, skipWater);
      pt.x = nx; pt.z = nz;
      if (!noClamp) clampToWorld(pt, world);
      resolveObstacles(pt, world, rad, skipWater);
      if (penetrationAt(world, pt.x, pt.z, rad, skipWater) > before + 0.01) { pt.x = ox; pt.z = oz; }
      return pt;
    }

    // 旧セーブ(スポットしか きろくが ない)から ちずの きろくを あんぜんに 組みなおす。
    // 見つけた スポットの 地区は 通った、りょうはしを 見つけた みちは 通った、
    // その スポットの めじるしと 通った 地区の 主役は 見た、と みなす
    function seedMapRecords(world, discoveredIds) {
      const seen = discoveredIds instanceof Set ? discoveredIds : new Set(discoveredIds || []);
      const zones = new Set();
      for (const sp of world.spots) if (seen.has(sp.id) && sp.zone) zones.add(sp.zone);
      const paths = new Set();
      for (const sg of world.segments) if (seen.has(sg.a.id) && seen.has(sg.b.id)) paths.add(segKey(sg));
      const marks = new Set();
      for (const p of world.props) {
        if (!p.mid) continue;
        if (p.tier === 2) { if (p.zone && zones.has(p.zone)) marks.add(p.mid); continue; }
        if (seen.has(p.mid.slice(p.mid.indexOf(':') + 1))) marks.add(p.mid);
      }
      return { zones: [...zones], paths: [...paths], marks: [...marks] };
    }

    // ====== region transition(Phase 2)======
    // 世界の はしは これまでどおり clampToWorld が とめる。**きめられた 出口の うえで、
    // そのむきへ すすんだ ときだけ** となりへ 出る。出口は WORLD_GEOGRAPHY の
    // connection.gate に「いみ」として あり、Canvas の ざひょうには うめこまない。
    // Three.js に なっても この まま つかえる(departure / arrival / kind / layer)
    // ================= 地域を こえる あいだ(region transition)の 正本 =================
    // 「あるいて こえる / のぼる / もぐる」の 3つを ひとつの ほねぐみで あつかう。
    // ここに あるのは **いみ** だけ(どの あいだに 何が おきるか)。veil の こさ・つぶの かず・
    // かごの え・カメラの さ は renderer の しごと で、この 正本には 入れない。
    // Three.js に なっても この plan は そのまま つかえる(え だけ 差しかえる)
    const TRANSITION = {
      phases: ['approach', 'cross', 'arrive', 'settle'],
      //   approach きわに ちかづく…… 出発がわの せかいが まだ 見えて いる
      //   cross     こえる………………… ここで 世界を 入れかえる(その あいだ だけ 見えない)
      //   arrive    ついた………………… 到着がわの せかいが 見えて くる
      //   settle    おちつく…………… カメラと からだの いきおいが もとへ もどる。**操作は ここで もどす**
      ways: {
        walk: { label: 'あるいて こえる', swap: 'cross', release: 'settle',
          span: { approach: 0.35, cross: 0.30, arrive: 0.35, settle: 0.25 },
          cue: { approach: 'step', cross: null, arrive: 'pop', settle: null } },
        up: { label: 'のぼる', swap: 'cross', release: 'settle',
          span: { approach: 0.55, cross: 1.45, arrive: 0.60, settle: 0.35 },
          cue: { approach: 'open', cross: null, arrive: 'pop', settle: null } },
        down: { label: 'もぐる', swap: 'cross', release: 'settle',
          span: { approach: 0.45, cross: 1.25, arrive: 0.50, settle: 0.30 },
          cue: { approach: 'open', cross: null, arrive: 'pop', settle: null } },
        // ふねで 外洋を わたる。のぼり・くだりより すこし ながい(みなとを はなれ、
        // 水平線が つづき、しまかげが 見えて くる まで)が、ながすぎない ように する。
        // 2 かいめ からは 0.62 ばい、よいやすい せっていでは 0.45 ばい(正本の しくみの まま)
        sail: { label: 'ふねで わたる', swap: 'cross', release: 'settle',
          span: { approach: 0.55, cross: 1.75, arrive: 0.70, settle: 0.35 },
          cue: { approach: 'open', cross: null, arrive: 'pop', settle: null } },
      },
      repeat: 0.62,            // 2 かいめ からは みじかく(おなじ みちを なんども いく ので)
      reduced: 0.45,           // よいやすい ひとの せってい: ぜんたいを みじかく。なくしはしない
      density: [1, 0.6, 0.35], // 端末の おもさで つぶを へらす(0 = おおい / 2 = すくない)
      minSpan: 0.08,
    };
    // その 1 かいの 「こえかた」を きめる。gate(いみ)と ばめん(はじめて / 2かいめ /
    // よいやすい せってい / 端末の おもさ)から、phase の ながさ まで ぜんぶ 出す
    function transitionPlan(gate, opts = {}) {
      const way = gate && gate.way ? gate.way : 'walk';
      const spec = TRANSITION.ways[way] || TRANSITION.ways.walk;
      const first = !!opts.first;
      const repeat = !!opts.repeat;
      const reduced = !!opts.reduced;
      const tier = Math.max(0, Math.min(2, opts.tier || 0));
      let scale = 1;
      if (repeat) scale *= TRANSITION.repeat;
      if (reduced) scale *= TRANSITION.reduced;
      let at = 0; const phases = [];
      for (const id of TRANSITION.phases) {
        const dur = Math.max(TRANSITION.minSpan, (spec.span[id] || 0) * scale);
        phases.push({ id, dur, from: at, to: at + dur, cue: spec.cue[id] || null });
        at += dur;
      }
      const find = (id) => phases.find((q) => q.id === id) || phases[phases.length - 1];
      return {
        way, dir: gate && gate.dir ? gate.dir : null, label: spec.label,
        from: gate ? gate.from : null, to: gate ? gate.to : null, at: gate ? gate.at : null,
        enterFacing: gate && gate.enterFacing != null ? gate.enterFacing : 0,
        layerFrom: gate ? gate.layerFrom : 'ground', layerTo: gate ? gate.layerTo : 'ground',
        isleFrom: !!(gate && gate.isleFrom), isleTo: !!(gate && gate.isleTo),
        land: (gate && gate.land) || [],
        first, repeat, reduced, tier, density: TRANSITION.density[tier],
        phases, total: at, swapAt: find(spec.swap).from, releaseAt: find(spec.release).from,
      };
    }
    // どれだけ かくれて いるか(0 = ぜんぶ 見える / 1 = まったく 見えない)。
    // cross の あいだは かならず 1 ＝ **入れかえの しゅんかんは ぜったいに すけない**。
    // え の がわは じぶんの いろ に この 0〜1 を かけるだけ で よい
    function transitionCover(plan, t) {
      const ph = transitionPhaseAt(plan, t);
      if (!ph) return 0;
      const k = Math.max(0, Math.min(1, (t - ph.from) / (ph.dur || 1)));
      if (ph.id === 'approach') return k < 0.75 ? 0.6 * (k / 0.75) : 0.6 + 0.4 * ((k - 0.75) / 0.25);
      if (ph.id === 'cross') return 1;
      if (ph.id === 'arrive') return Math.pow(1 - k, 1.5);
      return 0;
    }
    // いま どの phase か(え の がわ も テストも おなじ こたえを 見る)
    function transitionPhaseAt(plan, t) {
      if (!plan || !plan.phases.length) return null;
      for (const q of plan.phases) if (t < q.to) return q;
      return plan.phases[plan.phases.length - 1];
    }
    // のぼりか くだりかは **この 1 かいの layer の さ** で きめる。
    // connection に 固定 しない(かえりは かならず 逆に なる)
    function wayBetween(layerFrom, layerTo) {
      if (layerFrom === layerTo) return 'walk';
      if (layerTo === 'sky' || layerFrom === 'below') return 'up';
      if (layerTo === 'below' || layerFrom === 'sky') return 'down';
      return 'walk';
    }
    function regionGates(regionId, world) {
      const out = [];
      for (const c of WORLD_GEOGRAPHY.connections) {
        if (!c.b || !c.gate || !c.gate.ends) continue;
        const here = c.gate.ends[regionId]; if (!here) continue;
        const to = c.a === regionId ? c.b : c.a;
        const there = c.gate.ends[to]; if (!there) continue;
        const spot = (world.spots || []).find((q) => q.id === here.spot); if (!spot) continue;
        const layerFrom = (WORLD_GEOGRAPHY.regions[regionId] || {}).layer || 'ground';
        const layerTo = (WORLD_GEOGRAPHY.regions[to] || {}).layer || 'ground';
        // **この 1 かいの むき**。connection の dir は「その みちは たてじく」という
        // いみ だけ で、のぼりか くだりかは いつも layer の さ から きめる
        // 海路は layer が どちらも ground なので、layer の さでは きまらない。
        // gate の kind が そのまま「わたりかた」に なる
        const way = c.gate.kind === 'walk' ? 'walk'
          : c.gate.kind === 'sea' ? 'sail'
            : wayBetween(layerFrom, layerTo);
        const G0 = WORLD_GEOGRAPHY.regions;
        out.push({ id: c.id, kind: c.gate.kind, way, dir: way === 'walk' ? null : way,
          // しまへ わたるのか、しまから ほんどへ もどるのか。え の がわが
          // region の id を じか書きしないで すむ ように いみで わたす
          isleFrom: !!((G0[regionId] || {}).isle), isleTo: !!((G0[to] || {}).isle),
          action: here.action || c.gate.action || null, verb: here.verb || c.gate.verb || null, label: c.label,
          from: regionId, to, at: there.spot, spot, out: here.dir, land: here.land || [],
          // 入った がわで むく ほうこう。口(near)から 入れば おくへ(0)、
          // おく(far)から 入れば 口へ(π)。**そのまま まっすぐ あるきつづけられる**
          enterFacing: there.dir === 'far' ? Math.PI : 0,
          // 1 つの spot に 出口が 2 つ いじょう ある ときの きめてに なる 2 つ(Phase 3B-0)。
          // bearing は **その region の world くうかんでの 出口の むき**({ x: よこ, z: おく })。
          // renderer が Canvas から Three.js に かわっても、この 2 つの かずは そのまま つかえる
          bearing: gateBearing(here.bearing), priority: Number(here.priority) || 0,
          layerFrom, layerTo });
      }
      // **配列の じゅんばんに いみを もたせない**。データに 書いた じゅんに
      // たよる コードが 生まれない よう、ここで いつも おなじ じゅんに ならべる
      out.sort((a, b) => a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      return out;
    }

    // ---- 1 つの spot に 出口が 2 つ いじょう ある とき、どちらへ 出るかを きめる(Phase 3B-0) ----
    // **配列の さきあたまは つかわない。** つかうのは
    //   ① 出口の むき(out: 口 / 奥)と すすんで いる むき
    //   ② その spot の なかでの からだの いち
    //   ③ 出口の むき(bearing)
    //   ④ それでも ならんだ ときの priority
    // の 4 つ だけ。どれも いみの ある データなので、3D に なっても おなじ ルールで きまる。
    // 「まっすぐ 木に むかって あるいた」ような **どちらとも いえない** ときは わざと えらばない。
    // すこし よこへ ずれれば きまる ので、まちがった ほうへ 出て しまう ことが ない
    const GATE_PICK = { lateral: 0.6, margin: 0.12 };
    function gateBearing(b) {
      if (!b) return null;
      const x = Number(b.x) || 0, z = Number(b.z) || 0, len = Math.hypot(x, z);
      return len > 0 ? { x: x / len, z: z / len } : null;
    }
    // 「はしに さわった」だけでは 出ない。**その 出口の うえで、外へ むかって すすんだ**とき
    const gateOutward = (g, mz) => (g.out === 'far' ? mz > 0.3 : mz < -0.3);
    const gatePast = (g, z) => (g.out === 'far' ? z >= g.spot.z - 30 : z <= g.spot.z + 30);
    function gateScore(g, at) {
      if (!g.bearing) return 0;
      const b = g.bearing;
      const mx = at.mx || 0, mz = at.mz || 0, ml = Math.hypot(mx, mz);
      const head = ml > 0 ? (mx / ml) * b.x + (mz / ml) * b.z : 0;
      const r = g.spot.r || 1;
      let ox = ((at.x || 0) - g.spot.x) / r, oz = ((at.z || 0) - g.spot.z) / r;
      const ol = Math.hypot(ox, oz);
      if (ol > 1) { ox /= ol; oz /= ol; }
      return head + GATE_PICK.lateral * (ox * b.x + oz * b.z);
    }
    function resolveGate(list, at = {}) {
      const want = at.kind == null ? ['walk'] : (Array.isArray(at.kind) ? at.kind : [at.kind]);
      // あるく 出口だけは「外へ むかって すすんだ」かを みる。のりばは ボタンで えらぶので みない
      const cand = (list || []).filter((g) => want.indexOf(g.kind) >= 0
        && (g.kind !== 'walk' || (gateOutward(g, at.mz || 0) && gatePast(g, at.z || 0))));
      if (cand.length <= 1) return cand[0] || null;
      const scored = cand.map((g) => ({ g, s: gateScore(g, at) }));
      const top = scored.reduce((m, q) => (q.s > m ? q.s : m), -Infinity);
      // いちばん よく あって いる ものたち(さが margin みまん)だけ のこす
      const near = scored.filter((q) => top - q.s < GATE_PICK.margin).map((q) => q.g);
      if (near.length === 1) return near[0];
      // むきで きまらなければ priority。それも おなじなら **えらばない**
      const best = near.reduce((m, g) => Math.min(m, g.priority), Infinity);
      const heads = near.filter((g) => g.priority === best);
      return heads.length === 1 ? heads[0] : null;
    }

    function createSimulation(init = {}) {
      let registry = init.registry || buildRegistry();
      let world = null, party = [], player = null, nearest = null, frame = 0, curSpot = null, mood = Object.assign({}, MOOD_DEFAULT);
      // にゅうりょくの きじゅん: ゆびを おいた しゅんかんの カメラの むきで こてい(カメラが まわっても おなじ むきへ すすむ。ぐるぐる まわらない)
      let inputActive = false, inputYaw = 0;
      // カメラの りぐ: x/z = おいかける てん(じぶん)、yaw = むき(ラジアン、0 = +z)、dist = うしろの きょり、height = たかさの わりあい。
      // three.js でも おなじ 値で カメラを おける
      const camera = { x: 0, z: 0, yaw: 0, dist: CAM_PROFILES.default.dist, height: CAM_PROFILES.default.height };
      // えんしゅつの ぶん(ゆっくり おいかける)。camera そのものは りぐの まま に して、
      // ここで つくった さ を 足した ものを え に わたす。3D でも おなじ さ を つかえる
      const camFx = { bob: 0, dist: 0, height: 0, yaw: 0, phase: 0, carry: 0 };
      let envNow = init.env || env();
      let discovered = new Set(init.discovered || []);
      // ちず の「あるいた きろく」。spot の はっけん と おなじ ように、
      // 地区(zone)・とおった みち(path)・見つけた めじるし(landmark) を おぼえる。
      // いれものは id の Set だけ。あるいた ざひょうは のこさない
      let visitedZones = new Set(init.visitedZones || []);
      let walkedPaths = new Set(init.walkedPaths || []);
      let foundMarks = new Set(init.foundMarks || []);
      let curZoneId = null;
      let gates = [], gateLock = null;
      // せいかつAI の かくにん用。ふだんの あそびでは 出さない(§50)
      let lifeDebug = false;
      function enterRegion(regionId, opts = {}) {
        if (opts.registry) registry = opts.registry;
        world = buildWorld(regionId, registry, { locality: opts.locality != null ? opts.locality : init.locality });
        party = companionsOf(registry);
        // となりから 入って きた ときは、その connection の 入口 spot から はじめる。
        // 「たび」や はじめて ひらいた ときは これまでどおり world.entry
        const at = opts.at ? (world.spots || []).find((q) => q.id === opts.at) : null;
        const head = opts.heading != null ? opts.heading : 0;
        player = { x: at ? at.x : world.entry.x, z: at ? at.z : world.entry.z - 60,
          heading: head, face: 1, bob: 0, moving: false, onPath: true };
        clampToWorld(player, world); resolveObstacles(player, world); // いりぐちで なにかに めりこまない
        camera.x = player.x; camera.z = player.z; camera.yaw = head; nearest = null; curSpot = null; inputActive = false;
        placeParty();
        // となりから あるいて 入って きた ときは、**出るときの むきと からだの いきおい**を
        // ひきつぐ。camFx.yaw に さ を いれて おくと、いつもの ease で 0 へ もどる ので
        // 「こえた しゅんかんに カメラが 180 度 とぶ」ことが なくなる(3D でも おなじ 値)
        camFx.yaw = 0; camFx.phase = 0; camFx.carry = 0;
        if (opts.carry) {
          const c = opts.carry;
          if (c.yaw != null) camFx.carry = clamp(wrapAngle(c.yaw - head), -Math.PI, Math.PI);
          if (c.bob != null) { player.bob = c.bob; camFx.phase = c.phase || 0; }
          if (c.speed != null) player.speed = c.speed;
          if (c.moving) player.moving = true;
        }
        curZoneId = null;
        gates = regionGates(regionId, world);
        // 入って きた ばしょが そのまま 出口の ときは、その spot を いちど はなれる まで
        // 出口を ふうじる(入った しゅんかんに もどされて しまわない)。
        // **どの spot で ふうじたかを おぼえる**ので、そこから べつの 出口へ あるいて
        // いけば ちゃんと ひらく(出口の ある spot が となりあって いても とまらない)
        gateLock = (at && gates.some((g) => g.spot.id === at.id)) ? at.id : null;
        const same = opts.regionId === regionId;
        discovered = new Set(opts.discovered || (same ? [...discovered] : []));
        visitedZones = new Set(opts.visitedZones || (same ? [...visitedZones] : []));
        walkedPaths = new Set(opts.walkedPaths || (same ? [...walkedPaths] : []));
        foundMarks = new Set(opts.foundMarks || (same ? [...foundMarks] : []));
        return world;
      }
      enterRegion(init.regionId || 'home', { discovered: init.discovered, visitedZones: init.visitedZones, walkedPaths: init.walkedPaths, foundMarks: init.foundMarks });
      const spotAt = (pt) => { let best = null, bd = Infinity; for (const s of world.spots) { const d = dist(pt, s); if (d < s.r && d < bd) { bd = d; best = s; } } return best; };
      // その spot に ある 出口を **ぜんぶ** かえす。regionGates が すでに
      // priority → id の じゅんに ならべて いる ので、ここでも じゅんばんは いつも おなじ
      const gatesAt = (spotId) => gates.filter((g) => g.spot.id === spotId);
      // いっしょに あるく なかま・こいびと: じぶんの すこし うしろ(カメラから みて おく)と よこ
      function followParty(dt) {
        const F = RULES.follow, slots = formationFor(party.length);
        party.forEach((a, i) => {
          const t = formationPoint(a, i, slots, player.x, player.z, camera.yaw), tx = t.x, tz = t.z;
          const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
          if (d > F.snap) { const spd = Math.min(F.maxSpeed, d * FORMATION.gain) * t.k; a.x += dx / d * Math.min(d, spd * dt); a.z += dz / d * Math.min(d, spd * dt); a.behavior = 'walk'; a.heading = Math.atan2(dx, dz); a.face = dx < 0 ? -1 : 1; a.bob += dt; }
          else if (a.behavior !== 'idle') { a.behavior = 'idle'; a.heading = player.heading; }
          if (a.sayFor > 0) { a.sayFor -= dt; if (a.sayFor <= 0) { a.sayFor = 0; a.say = null; } }
        });
      }
      // なかまを いまの ならびの ばしょへ そのまま おく(地域に はいった とき。とおくから かけよって こない)
      function placeParty() {
        const slots = formationFor(party.length);
        party.forEach((a, i) => { const t = formationPoint(a, i, slots, player.x, player.z, camera.yaw); a.x = t.x; a.z = t.z; clampToWorld(a, world); a.heading = player.heading; a.behavior = 'idle'; });
      }
      // 1 フレームぶん すすめる。input: { x: -1..1(よこ), y: -1..1(てまえ +) } は カメラから みた むき。もどりち: おきた できごと
      function step(dt, input) {
        frame++;
        const events = [];
        const v = input || { x: 0, y: 0 };
        player.moving = !!(v.x || v.y);
        if (!player.moving) { inputActive = false; player.speed = 0; }
        else if (!inputActive) { inputActive = true; inputYaw = camera.yaw; }
        if (player.moving) {
          // ゆびを おいた ときの カメラの むきを きじゅんに ワールドの むきへ
          const fx = Math.sin(inputYaw), fz = Math.cos(inputYaw), rx = Math.cos(inputYaw), rz = -Math.sin(inputYaw);
          const mx = rx * v.x + fx * -v.y, mz = rz * v.x + fz * -v.y; const m = Math.hypot(mx, mz) || 1;
          const spd = RULES.playerSpeed * (player.onPath ? 1 : RULES.offPathSpeed) * Math.min(1, m);
          player.speed = spd / RULES.playerSpeed; // 0〜1(カメラの えんしゅつが よむ)
          moveWithCollision(player, player.x + mx / m * spd * dt, player.z + mz / m * spd * dt, world);
          player.heading = Math.atan2(mx, mz); player.face = rx * mx + rz * mz < -0.2 ? -1 : rx * mx + rz * mz > 0.2 ? 1 : player.face; player.bob += dt;
          player.mz = mz / m;                       // +z へ すすんだか(出口の はんてい に つかう)
          player.mx = mx / m;                       // よこの むき。1 つの spot に 出口が 2 つ ある ときに つかう
        }
        const np = nearestPath(player, world); player.onPath = (!!np && np.dist <= np.half + 20) || !!spotAt(player); // スポットの なかも あるきやすい
        if (frame % 20 === 0) refreshLandmark();
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
        // ---- region の 出口 ----
        // 1 つの spot に 出口が いくつ あっても いい(Phase 3B-0)。
        // ふうじこみ(gateLock)は「出口の ある spot から はなれた」ときに とける。
        // どの 出口に 入るかは resolveGate が きめる(配列の じゅんばんは つかわない)
        const here = curSpot ? gatesAt(curSpot.id) : [];
        if (!here.length || (gateLock && gateLock !== curSpot.id)) gateLock = null;
        if (here.length && !gateLock && player.moving) {
          const gateOn = resolveGate(here, { x: player.x, z: player.z, mx: player.mx || 0, mz: player.mz || 0, kind: 'walk' });
          if (gateOn) { gateLock = curSpot.id; events.push({ type: 'gate', gate: gateOn }); }
        }
        mood = moodAt(world, player.x, player.z);
        // ちずの きろく: この 地区へ きた / この みちを とおった / この めじるしを 見た
        const zn = mood.zone;
        if (zn && zn.id !== curZoneId) {
          curZoneId = zn.id;
          if (!visitedZones.has(zn.id)) { visitedZones.add(zn.id); events.push({ type: 'zone', zone: zn, first: true }); }
        }
        // みちは「はしに 立った」だけでは のこさない。すこしでも すすんだら のこす。
        // ひみつの みちは りょうはしを 見つける まで ぜったいに のこさない(ちずが ばらして しまう)
        if (np && np.dist <= np.half + 40 && np.t > 0.12 && np.t < 0.88) {
          const sg = np.seg;
          const ok = sg.kind !== 'secret' || (discovered.has(sg.a.id) && discovered.has(sg.b.id));
          const pk = segKey(sg);
          if (ok && !walkedPaths.has(pk)) { walkedPaths.add(pk); events.push({ type: 'path', key: pk, seg: sg }); }
        }
        if (frame % 12 === 0) {
          for (const p of world.mapMarks || (world.mapMarks = world.props.filter((q) => q.mid))) {
            if (foundMarks.has(p.mid)) continue;
            const sight = MARK_SIGHT[p.tier] || 700;
            if (Math.abs(p.x - player.x) > sight || Math.abs(p.z - player.z) > sight) continue;
            if (Math.hypot(p.x - player.x, p.z - player.z) > sight) continue;
            foundMarks.add(p.mid); events.push({ type: 'mark', mark: p, first: true });
          }
        }
        const prof = CAM_PROFILES[(curSpot && (curSpot.cam || (curSpot.secret ? 'secret' : curSpot.kind))) || (player.onPath && np && np.seg.kind === 'narrow' ? 'narrow' : 'default')] || CAM_PROFILES.default;
        camera.dist += (prof.dist - camera.dist) * Math.min(1, dt * RULES.cam.ease); camera.height += (prof.height - camera.height) * Math.min(1, dt * RULES.cam.ease);
        updateCamFx(dt, np);
        followParty(dt);
        stepLife(dt);
        for (const a of world.residents) if (!a.met && hitTest(a, player, RULES.metRadius)) { a.met = true; events.push({ type: 'met', actor: a }); }
        let best = null, bd = Infinity;
        const consider = (a) => { const d = dist(a, player); if (d < bd) { bd = d; best = a; } };
        for (const a of world.residents) consider(a); for (const a of party) consider(a);
        const next = bd < RULES.talkRadius ? best : null;
        if (next !== nearest) { nearest = next; events.push({ type: 'nearest', actor: nearest }); }
        return events;
      }
      // ---- 住民の せいかつ: 3つの そう に わけて まわす ----
      //   detail  ちかく(LIFE.detail)…まいフレーム。behavior・みちの いどう・あたりはんてい・さそいあい
      //   near    そのそと(LIFE.near)…LIFE.nearStride フレームに 1かい。さそいあいは しない
      //   distant それ いがい……… まいフレーム LIFE.distantPerFrame 人だけ「つぎの 行動」へ すすめる
      // ぜんぶ 上限つき なので、せかいが どれだけ ひろく なっても 1フレームの しごとは ふえない
      const detailList = [];
      let distantCursor = 0, noticeCursor = 0;
      function stepLife(dt) {
        world.clock += dt;
        world.lifeBudget = LIFE.interactPerFrame;
        // おわった あつまりを かたづける
        for (let i = world.meets.length - 1; i >= 0; i--) { const m = world.meets[i]; if (m.until <= 0 || !m.members.length) { for (const q of m.members) q.meet = null; world.meets.splice(i, 1); } }
        detailList.length = 0;
        const list = world.residents, n = list.length;
        const near2 = LIFE.near * LIFE.near;
        for (let i = 0; i < n; i++) {
          const a = list[i];
          const dx = a.x - player.x, dz = a.z - player.z, d2 = dx * dx + dz * dz;
          let tier = d2 < LIFE.detail * LIFE.detail ? 0 : d2 < near2 ? 1 : 2;
          if (tier === 0 && detailList.length >= LIFE.maxDetail) tier = 1;   // くわしく みるのは 上限まで
          if (a.tier === 2 && tier < 2) reenterDetail(a, world);             // もどって きた ときは しぜんな いちへ
          a.tier = tier;
          if (tier === 0) { detailList.push(a); updateActor(a, dt, envNow, world, list); }
          else if (tier === 1) { if ((i + frame) % LIFE.nearStride === 0) updateActor(a, dt * LIFE.nearStride, envNow, world, list); }
        }
        // とおい 住民は「つぎに うごく 時こく」だけ。まいフレーム すこしずつ すすめる
        for (let k = 0; k < LIFE.distantPerFrame && n; k++) {
          const a = list[distantCursor % n]; distantCursor++;
          if (a.tier === 2 && lifeFree(a)) stepDistant(a, envNow, world, world.clock);
        }
        personalSpace(detailList, detailList.length, world);
        for (const m of world.meets) if (m.members.length > 1) personalSpace(m.members, m.members.length, world);
        // プレイヤーに きづく: ごく ちかくの 2人まで。ぜんいんが あつまったり しない
        if (frame % 12 === 0) {
          let noticed = 0;
          for (let k = 0; k < detailList.length && noticed < LIFE.noticeMax; k++) {
            const a = detailList[(k + noticeCursor) % detailList.length];
            if (!lifeFree(a) || a.noticeCool > 0 || a.behavior === 'sleep' || a.behavior === 'talk' || a.behavior === 'gather') continue;
            if (dist(a, player) > LIFE.notice) continue;
            noticed++;
            if (rand() > 0.35 * a.traits.social) continue;
            faceTo(a, player.x, player.z);
            a.behavior = 'idle'; a.act = 'idle'; a.route = null; a.until = rnd(2, 4.5); a.noticeCool = rnd(14, 34);
          }
          noticeCursor++;
        }
        for (const a of world.residents) if (a.noticeCool > 0) a.noticeCool -= dt * 12;
      }
      // ごく かるい カメラの えんしゅつ。もとの りぐ(camera)は さわらず、さ だけを ゆっくり つくる
      function updateCamFx(dt, np) {
        const M = RULES.motion;
        // ① あるいて いる あいだの たてゆれ(ごく わずか)。とまると すぐ 0 に もどる
        camFx.phase += dt * M.bobHz * TAU * (player.moving ? 1 : 0);
        const bobWant = player.moving ? Math.sin(camFx.phase) * M.bob : 0;
        // ② はやく うごいて いる ときは すこし ひく
        const distWant = Math.min(1, player.speed || 0) * M.speed;
        // ③ ひろい ばしょ(地区の open)は ひき、せまい ばしょは よる
        const openWant = ((mood.open || 1) - 1) * M.open;
        // ④ ランドマークに ちかづいたら、そちらへ ほんの すこし むく
        let lookWant = 0;
        if (nearLandmark) {
          const d = Math.hypot(nearLandmark.x - player.x, nearLandmark.z - player.z);
          const t = Math.max(0, 1 - d / M.lookRange);
          lookWant = clamp(wrapAngle(Math.atan2(nearLandmark.x - player.x, nearLandmark.z - player.z) - camera.yaw), -1, 1) * t * M.look;
        }
        const k = Math.min(1, dt * M.ease);
        camFx.bob += (bobWant - camFx.bob) * Math.min(1, dt * 12);
        camFx.dist += (distWant + openWant - camFx.dist) * k;
        camFx.height += (bobWant - camFx.height) * Math.min(1, dt * 12);
        camFx.yaw += (lookWant - camFx.yaw) * k;
        // こえた ときの むきの さ は、**まいフレーム おなじ はやさ**で 0 へ もどす。
        // ease だけ だと さいしょの 1 フレームで 大きく まわって しまう
        if (camFx.carry) {
          const step = RULES.cam.carryRate * dt;
          camFx.carry = Math.abs(camFx.carry) <= step ? 0 : camFx.carry - Math.sign(camFx.carry) * step;
        }
      }
      // いちばん ちかい ランドマーク(カメラが ほんの すこし むく さき)。20 フレームに 1かい で じゅうぶん
      let nearLandmark = null;
      function refreshLandmark() {
        let best = null, bd = Infinity;
        for (const p of world.props) { if (!p.landmark && !p.hero) continue; const d = Math.hypot(p.x - player.x, p.z - player.z); if (d < bd) { bd = d; best = p; } }
        nearLandmark = bd < RULES.motion.lookRange ? best : null;
      }
      function talk() {
        if (!nearest) return null;
        const a = nearest; a.say = talkLine(a); a.sayFor = RULES.bubbleSec; faceTo(a, player.x, player.z);
        releaseInteraction(a);            // はなしかけられたら いまの さそいあいは いったん おわり
        a.behavior = 'idle'; a.act = 'idle'; a.route = null; a.until = 3.5; a.chaseOf = null;
        return { actor: a, line: a.say };
      }
      const metCount = () => world.residents.filter((r) => r.met).length;
      // ちずの データ(UI は あとで): はっけんずみ の スポットと みち。かくし ばしょは みつけるまで のらない
      // ちずの もと。「あるいた けっか」だけを かえす: まだ 行って いない 地区の
      // みち・スポット・ひみつは 1つも 入らない。え には いっさい さわらないので、
      // Three.js に かわっても この データの まま ちずを 組める
      const mapData = () => computeMapData(world, {
        discovered, visitedZones, walkedPaths, foundMarks,
        hereSpot: curSpot ? curSpot.id : null,
        here: { x: player.x, z: player.z, heading: camera.yaw, zone: curZoneId, spot: curSpot ? curSpot.id : null },
      });
      // レンダラーに わたす「いまの せかい」。ぜんぶ ワールド座標。かきかえない やくそく
      // え に わたす カメラ: りぐ + えんしゅつの さ。え は これを そのまま つかう
      const viewCam = { x: 0, z: 0, yaw: 0, dist: 0, height: 0 };
      const camFor = (fx) => {
        const on = fx !== false;
        viewCam.x = camera.x; viewCam.z = camera.z;
        viewCam.yaw = wrapAngle(camera.yaw + (on ? camFx.yaw : 0) + camFx.carry);
        viewCam.dist = camera.dist * (1 + (on ? camFx.dist : 0));
        viewCam.height = camera.height * (1 + (on ? camFx.height : 0));
        return viewCam;
      };
      let camFxOn = true;
      // 住民の せいかつを えの がわへ わたす 口。ここが かわらない かぎり、
      // 表情の えが できた あとも 生活AI を なおす ひつようは ない
      const lifeOf = (a) => (a ? { key: a.key, label: a.label, behavior: a.behavior, emotion: a.emotion,
        activity: a.act || null, spot: a.spot ? a.spot.id : null, goal: a.route && a.route.length ? a.route[a.route.length - 1].id : null,
        partner: a.partner ? a.partner.key : null, meet: a.meet ? a.meet.kind : null, tier: a.tier, energy: Math.round(a.energy * 100) / 100 } : null);
      const view = () => ({ regionId: world.regionId, world, residents: world.residents, party, player, camera: camFor(camFxOn), rig: camera, camFx, nearest, spot: curSpot, zone: mood.zone || null, mood, env: envNow, frame, lifeDebug, lifeOf });
      return {
        RULES, enterRegion, step, talk, view, hitTest, dist, mapData,
        // いま 立って いる ところが 特殊な たてじくの のりば なら、それを かえす(UI が「のる」を 出す)
        gateHere: () => (curSpot
          ? resolveGate(gatesAt(curSpot.id), { x: player.x, z: player.z, kind: ['vertical', 'sea'] })
          : null),
        get gates() { return gates; },
        // その spot の 出口を ぜんぶ / いま えらばれる ものを 1 つ。えの がわと テストが つかう
        gatesAt: (spotId) => gatesAt(spotId != null ? spotId : (curSpot ? curSpot.id : null)),
        // こえる ちょくぜんの 「からだと カメラの いきおい」。つぎの 地域へ そのまま わたす
        carry: () => ({ yaw: camera.yaw, heading: player.heading, bob: player.bob, phase: camFx.phase,
          speed: player.speed || 0, moving: !!player.moving }),
        // だれかと はなして いる さいちゅうか(はなしを おえて から こえる)
        get busy() { return !!(nearest && nearest.sayFor > 0) || party.some((a) => a.sayFor > 0); },
        endTalk() { if (nearest) { nearest.say = null; nearest.sayFor = 0; } party.forEach((a) => { a.say = null; a.sayFor = 0; }); },
        setEnv(e) { envNow = e; }, get env() { return envNow; },
        get lifeDebug() { return lifeDebug; }, set lifeDebug(v) { lifeDebug = !!v; },
        life: lifeOf, get meets() { return world.meets; },
        // よいやすい ひとの ための スイッチ(prefers-reduced-motion)。せかいは かわらない
        setCameraMotion(on) { camFxOn = !!on; }, get cameraMotion() { return camFxOn; },
        setPlayer(x, z) { player.x = x; player.z = z; clampToWorld(player, world); resolveObstacles(player, world); camera.x = player.x; camera.z = player.z; },
        placeParty,
        get world() { return world; }, get party() { return party; }, get player() { return player; }, get camera() { return camera; }, get nearest() { return nearest; }, get registry() { return registry; }, get spot() { return curSpot; }, get zone() { return mood.zone || null; }, get mood() { return mood; }, get discovered() { return discovered; }, get visitedZones() { return visitedZones; }, get walkedPaths() { return walkedPaths; }, get foundMarks() { return foundMarks; },
        loadMapRecords(rec) { if (!rec) return; if (rec.zones) visitedZones = new Set(rec.zones); if (rec.paths) walkedPaths = new Set(rec.paths); if (rec.marks) foundMarks = new Set(rec.marks); },
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
    // 地域ごとの 絵文字の 霧: near より てまえは そのまま、far で min まで うすく
    const EMOJI_MIST = Object.freeze({ memory_lake: Object.freeze({ kinds: Object.freeze({ '🌳': 1, '🌿': 1 }), near: 260, far: 1100, min: 0.42 }) });
    function emojiMistFactor(regionId, emoji, dz) {
      const m = EMOJI_MIST[regionId];
      if (!m || !m.kinds[emoji]) return 1;
      return 1 - (1 - m.min) * clamp((dz - m.near) / (m.far - m.near), 0, 1);
    }
    // 地域ごとの 絵文字の ばらつき(見た目だけ): [いちばん ちいさい, いちばん おおきい, たかさ の のびしろ]
    // prop.size・当たり判定 は かえない。いち(x, z)から きめる ので まいかい おなじ
    const EMOJI_VARY = Object.freeze({ city: Object.freeze({ '🏢': Object.freeze([0.8, 1.2, 1.25]), '🏬': Object.freeze([0.86, 1.12, 1.12]) }) });
    function emojiVary(regionId, emoji, x, z) {
      const v = (EMOJI_VARY[regionId] || {})[emoji];
      if (!v) return null;
      const key = Math.round(x) + ':' + Math.round(z), w = v[0] + (v[1] - v[0]) * hrand('vary:' + key);
      return [w, w * (1 + (v[2] - 1) * hrand('varh:' + key))];
    }
    const varyMemo = new WeakMap();
    function emojiVaryOf(regionId, p) {
      if (!EMOJI_VARY[regionId]) return null;
      let m = varyMemo.get(p);
      if (m === undefined || m.r !== regionId) { m = { r: regionId, v: emojiVary(regionId, p.emoji, p.x, p.z) }; varyMemo.set(p, m); }
      return m.v;
    }
    // かわの もや(朝・夜): 3 つの やま(もとの 3 本の おびの まんなか)を なだらかに つなぐ
    const RIVERMIST_STOPS = Object.freeze([[0, 0], [0.17, 0.12], [0.33, 0.06], [0.5, 0.12], [0.67, 0.06], [0.83, 0.12], [1, 0]].map(Object.freeze));
    const SKY_OVERRIDE = { deepsea: ['#0b1d3a', '#163a66'], star_stop: ['#0a0c2a', '#2c2560'], memory_lake: ['#2a2d4d', '#5b6190'] };
    const ACTOR_SIZE = 110; // キャラの おおきさ(せかい たんい)
    const BACKDROP_COLORS = {
      hills: ['#7fb36a', '#5f9552'], skyline: ['#8e96a8', '#67708a'], treeline: ['#4f8a45', '#356a33'], peaks: ['#8e93a4', '#6b7085'], snowpeaks: ['#dfe9f6', '#b9c9de'],
      seahorizon: ['#5aa9e0', '#3f8fcc'], abyss: ['#132c52', '#0d2140'], lakehills: ['#86b86f', '#6aa0da'], dunes: ['#e6c98a', '#d1ad66'], skystops: ['#5a4fa0', '#3d3478'], mist: ['#8c93b0', '#6f7594'],
      neonskyline: ['#2f3450', '#1b1f34'], canopy: ['#2f6a2f', '#1f4a22'], mesas: ['#b56a44', '#8a4f34'], farhills: ['#8fbe76', '#6aa05a'],
    };
    const KIND_COLOR = { form: 'rgba(90,70,60,.75)', companion: 'rgba(210,130,60,.8)', partner: 'rgba(220,100,150,.8)', naoto: 'rgba(80,80,120,.8)' };
    // なかまの えがきかたの こまかさ(LOD)。人数では なく、がめんの うえの 見かけ(じぶんに くらべた 大きさ)と じぶんからの きょりで きめる
    //   full   = いまの まま(かげ・かたむき・しるし)
    //   medium = かげを 1 まいの え に(かたむき・しるしは のこす)
    //   light  = かげと からだを 1 まいの え に(かたむき・しるしは えがかない)。からだの いろ・かたちは おなじ
    // さかいで ぱたぱた かわらない ように、いまの LOD から うつる ときは すこし あそび(hys)を もつ
    const PARTY_LOD = Object.freeze({ nearD: 150, full: 0.9, medium: 0.72, hys: 0.03 });
    function partyLod(ratio, d, prev) {
      const L = PARTY_LOD;
      if (d < L.nearD) return 'full';
      // こまかく する ときは しきいを すこし こえてから、あらく する ときは すこし したまで まつ
      const tFull = prev === 'full' ? L.full - L.hys : L.full + (prev ? L.hys : 0);
      if (ratio >= tFull) return 'full';
      const tMed = prev === 'full' || prev === 'medium' ? L.medium - L.hys : L.medium + (prev ? L.hys : 0);
      return ratio >= tMed ? 'medium' : 'light';
    }
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
      function drawGlyph(emoji, sx, sy, px, scenery, kw = 1, kh = 1) {
        let wrap = wrapCtx, ns = 'c', fallback = ctx;
        if (scenery) {
          const mode = sceneryMode(emoji);
          if (mode === 'skip') return;
          if (mode === 'art') { wrap = wrapScenery; ns = 's'; fallback = sceneryMain || rawMain || ctx; }
          else { wrap = null; ns = 'n'; fallback = rawMain || ctx; }
        }
        if (kw !== 1) px *= kw; // kw / kh: 絵の はば と たかさ の かけざん(見た目だけ)
        const c = px >= 12 ? glyphSprite(emoji, px, wrap, ns) : null;
        if (c) { const bucket = Math.min(256, Math.max(12, Math.ceil(px / 12) * 12)); const k = px / bucket, kv = k * kh / kw; ctx.drawImage(c, sx - c.width * k / 2, sy - (c.height - 2) * kv, c.width * k, c.height * kv); }
        else { const g = fallback; if (g !== ctx) g.globalAlpha = ctx.globalAlpha; g.font = `${Math.round(px * kh / kw)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText(emoji, sx, sy); if (g !== ctx) g.globalAlpha = 1; }
      }
      const drawScenery = (emoji, sx, sy, px, kw, kh) => drawGlyph(emoji, sx, sy, px, true, kw, kh);
      const playerGlyph = typeof o.playerGlyph === 'function' ? o.playerGlyph : () => '🐣';
      // とうえい: カメラは じぶんの camera.dist うしろ(むき yaw)、たかさは じぶんの あしもとが FEET_FRAC に くる ように ぎゃくさん。地平線 HOR
      const HOR_BASE = 0.30, FEET_FRAC = 0.80, NEAR = 30;
      let F, HOR, cap, capBase, skyCache = null, nebula = null, canopyCache = null;
      // 同時に えがける かず。地域の みつどに あわせて ふやす(ジャングルは おおく、さばくは すくなく)
      // うごきの こまかさ。おもい たんまつ ほど へらす(とめは しない)
      // 0: かるい / 1: ふつう / 2: こまかい
      let animLv = 2, windAmp = 0.5, windHz = 1, windPh = 0;
      function setup() { F = W * 0.95; HOR = Math.round(H * HOR_BASE); capBase = tier >= 2 ? 58 : tier === 1 ? 86 : 124; cap = capBase; animLv = tier >= 2 ? 0 : tier === 1 ? 1 : 2; skyCache = null; nebula = null; canopyCache = null; }
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
      // ---- パララックス(え の そう の ながれかた) ----
      // そら / えんけい / てまえ が はっきり ちがう はやさで ながれると、おくゆきが 出る。
      // これは canvas の え の そう(そら・えんけいの シルエット・てまえの かぶさり)だけ の はなし。
      // ワールドの もの は これまで どおり project() だけ で えがく ので、
      // ばしょの つじつま は 1mm も くずれない(Three.js では ほんとうの おくゆき に おきかえる)。
      // [むきで ながれる 量, よこに あるいた ぶん で ながれる 量]
      const PLX = RENDER_TUNING.parallax;
      function plx(band) {
        const b = PLX[band] || PLX.far;
        const lat = eye.x * cosY - eye.z * sinY; // カメラの よこ位置(みぎが +)
        return -cam.yaw / TAU * W * b[0] - lat * b[1];
      }
      // ---- そら ----
      function drawSky(world, e, tl, wl, now) {
        const sky = SKY_OVERRIDE[world.regionId] || tl.sky;
        const skyKey = `${sky[0]}|${sky[1]}|${wl}|${W}x${H}|${HOR}`;
        if (!skyCache || skyCache.key !== skyKey) { const g = ctx.createLinearGradient(0, 0, 0, HOR + 10); g.addColorStop(0, shade(sky[0], wl, '#ffffff', 0)); g.addColorStop(1, shade(sky[1], wl, '#ffffff', 0)); skyCache = { key: skyKey, g }; }
        ctx.fillStyle = skyCache.g; ctx.fillRect(0, 0, W, HOR + 10);
        const px = plx('sky'), pxAir = plx('far'); // そらは いちばん ゆっくり、くもは その てまえ
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
          ctx.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 6; i++) { const x = ((i * 71 + pxAir * 0.3) % W + W) % W; ctx.beginPath(); ctx.moveTo(x - 10, 0); ctx.lineTo(x + 34, 0); ctx.lineTo(x + 90, HOR + 10); ctx.lineTo(x + 20, HOR + 10); ctx.closePath(); ctx.fill(); }
        } else if (world.sky === 'mist') {
          ctx.fillStyle = 'rgba(255,255,255,.10)'; for (let i = 0; i < 3; i++) { const y = HOR * (0.35 + i * 0.2), dx = (now * 0.01 * (i + 1) + pxAir * 0.2) % W; ctx.fillRect(dx - W, y, W * 0.7, 8); ctx.fillRect(dx, y, W * 0.7, 8); }
        } else {
          if (e.weather !== 'rain') { const sunX = ((W * (e.time === 'evening' ? 0.2 : e.time === 'morning' ? 0.8 : 0.72) + px * 0.5) % W + W) % W, sunY = HOR * (e.time === 'evening' ? 0.72 : e.time === 'morning' ? 0.5 : 0.28); ctx.fillStyle = e.time === 'evening' ? 'rgba(255,190,120,.95)' : 'rgba(255,245,200,.95)'; ctx.beginPath(); ctx.arc(sunX, sunY, W * 0.045, 0, TAU); ctx.fill(); }
          const cloudy = e.weather === 'cloudy' || e.weather === 'rain' || e.weather === 'snow';
          ctx.fillStyle = cloudy ? 'rgba(235,238,245,.85)' : 'rgba(255,255,255,.75)';
          const nc = cloudy ? 5 : 3;
          for (let i = 0; i < nc; i++) { const x = (((i * 173 + now * 0.006 * (1 + i * 0.3) + pxAir * 0.7) % (W + 140)) + W + 140) % (W + 140) - 70, y = HOR * (0.18 + (i % 3) * 0.2), r = W * (0.05 + (i % 2) * 0.02); ctx.beginPath(); ctx.ellipse(x, y, r * 1.9, r * 0.75, 0, 0, TAU); ctx.ellipse(x - r, y + r * 0.2, r * 1.1, r * 0.55, 0, 0, TAU); ctx.ellipse(x + r * 1.1, y + r * 0.15, r * 1.0, r * 0.5, 0, 0, TAU); ctx.fill(); }
        }
      }
      // ---- えんけい(地平線の おくの シルエット)。カメラの むきで よこに ながれる ----
      // Phase 4D-2c: 流れる 向きと 量は カメラの 向き(0〜360°)から きめる(地図の 座標は つかわない)。
      //   ・向きは 世界(= 方角固定の 遠景レイヤー)と おなじ: 右へ まわると 左へ ながれる。どの そうも 逆には ならない
      //   ・r = 角度どおり(1° で F·π/180 px。遠景レイヤーの 速さ)に たいする わりあい。そうの 意味の 距離で きめる
      //       水平線(うみ): 1.0 ／ てまえの おか・すなおか: 1.0 ／ おくの おか・台地: 0.8 ／ とおい やまなみ: 0.7
      //       (とかい・森・山・雪・ジャングル・空・かいちゅうの そうは これまでの 速さの まま: r = m × BD_R0)
      //   ・1 周で ちょうど 整数回 くりかえす ように そろえる ので、180° の おりかえしで 模様が ぱっと かわらない
      //   ・形(振幅・周期・高さ・色)は かえない。かえるのは 横の ずれ だけ
      const BD_R0 = 2.6 / (TAU * 0.95);           // これまでの えんけいの 流れ(1 周で 2.6W)を、角度どおり(1 周 2πF)に たいする わりあいに した もの
      let bdCalm = false;                           // よいやすい せってい(遠景の 受け口が おしえる)。よこに 歩いた ぶんの ずれを 3 わりに
      let bdLayers = [];                            // いま えがいた 帯の そうごとの 流れ(r・くりかえし・ずれ)。たしかめ よう の 読み出し
      function drawBackdrop(world, e, light, tl) {
        const kind = world.backdrop; const cols = BACKDROP_COLORS[kind] || BACKDROP_COLORS.hills;
        const bh = Math.round(H * 0.17), base = HOR + 2;
        const turn = (((cam.yaw % TAU) + TAU) % TAU) / TAU, lat = eye.x * cosY - eye.z * sinY, latK = bdCalm ? 0.3 : 1;
        bdLayers = [];
        // その そうの ずれ(px)。period = くりかえしの はば。1 周で k 回 くりかえす
        const ring = (r, period) => { const k = Math.max(1, Math.round(r * TAU * F / period)); const g = { s: -turn * k * period - lat * PLX.far[1] * (r / BD_R0) * latK, k }; bdLayers.push({ r, period, k, s: g.s }); return g; };
        // ならべる もの(やまなみ・ビル・台地・樹冠): 画面の ずれ と、何番目の 形か(1 周で もどる)
        const row = (r, step) => { const g = ring(r, step); const b0 = Math.floor(g.s / step); return { shift: g.s - b0 * step, idx: (i) => (((i - b0) % g.k) + g.k) % g.k }; };
        const wrapX = (v, P) => ((v % P) + P) % P;
        const far = shadeRgb(mixRgb(cols[0], (SKY_OVERRIDE[world.regionId] || tl.sky)[1], 0.35), light, tl.tint, tl.amt), nearC = shade(cols[1], light, tl.tint, tl.amt);
        const wave = (color, amp, freq, yoff, phase, r) => { const o = ring(r, TAU / freq).s; ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-10, base + 4); for (let x = -10; x <= W + 10; x += 12) { const y = base - yoff - amp * (0.5 + 0.5 * Math.sin((x - o) * freq + phase)); ctx.lineTo(x, y); } ctx.lineTo(W + 10, base + 4); ctx.closePath(); ctx.fill(); };
        const spikes = (color, n, hmin, hmax, wmul, yoff, seed, r) => { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-10, base + 4); const step = (W + 40) / n; const R = row(r != null ? r : (0.5 + seed * 0.3) * BD_R0, step); for (let i = -1; i <= n + 1; i++) { const x = -20 + i * step + R.shift; const idx = R.idx(i); const hh = hmin + (hash(kind + seed + idx) % 1000) / 1000 * (hmax - hmin); ctx.lineTo(x - step * wmul, base - yoff); ctx.lineTo(x, base - yoff - hh); } ctx.lineTo(W + 40, base - yoff); ctx.lineTo(W + 40, base + 4); ctx.closePath(); ctx.fill(); };
        const blocks = (color, n, hmin, hmax, yoff, seed) => { ctx.fillStyle = color; const step = (W + 40) / n; const R = row((0.5 + seed * 0.3) * BD_R0, step); for (let i = -1; i <= n + 1; i++) { const idx = R.idx(i); const hh = hmin + (hash(kind + seed + idx) % 1000) / 1000 * (hmax - hmin), bw = step * (0.55 + (hash(kind + 'w' + seed + idx) % 100) / 250); const x = -20 + i * step + R.shift; ctx.fillRect(x, base - yoff - hh, bw, hh + yoff + 4); } };
        if (kind === 'hills') { wave(far, bh * 0.7, 0.012, bh * 0.15, 1, 0.8); wave(nearC, bh * 0.5, 0.02, 0, 2.5, 1); }
        else if (kind === 'lakehills') { wave(far, bh * 0.7, 0.012, bh * 0.25, 1, 0.8); ctx.fillStyle = shade('#6aa0da', light, tl.tint, tl.amt); ctx.fillRect(0, base - bh * 0.22, W, bh * 0.22 + 4); wave(nearC, bh * 0.3, 0.025, bh * 0.05, 2.5, 1); }
        else if (kind === 'treeline') { spikes(far, 22, bh * 0.35, bh * 0.85, 0.5, bh * 0.12, 1);
          // まるい こずえ を まぜて、おなじ さんかくの くりかえしに 見えない ように する
          ctx.fillStyle = shadeRgb(mixRgb(cols[0], cols[1], 0.5), light, tl.tint, tl.amt);
          { const step = (W + 40) / 11, R = row(0.65 * BD_R0, step);
            for (let i = -1; i <= 12; i++) { const idx = R.idx(i), x = -20 + i * step + R.shift, hh = bh * 0.3 + (hash('tl' + idx) % 1000) / 1000 * bh * 0.45;
              ctx.beginPath(); ctx.ellipse(x, base - bh * 0.06 - hh * 0.5, step * 0.5, hh * 0.55, 0, 0, TAU); ctx.fill(); } }
          spikes(nearC, 16, bh * 0.4, bh * 0.95, 0.5, 0, 2); }
        else if (kind === 'peaks' || kind === 'snowpeaks') { spikes(far, 7, bh * 0.6, bh * 1.3, 0.5, bh * 0.1, 1); spikes(nearC, 5, bh * 0.5, bh * 1.0, 0.5, 0, 2);
          // 雪の頂: ゆきぐには いつも。ふつうの 山なみは ふゆ か ゆきの ときだけ(きせつ・てんきと あわせる)
          if (kind === 'snowpeaks' || e.season === 'winter' || e.weather === 'snow') { ctx.fillStyle = 'rgba(255,255,255,.55)'; const step = (W + 40) / 7; const R = row(0.8 * BD_R0, step); for (let i = -1; i <= 8; i++) { const idx = R.idx(i); const x = -20 + i * step + R.shift, hh = bh * 0.6 + (hash(kind + 1 + idx) % 1000) / 1000 * bh * 0.7; ctx.beginPath(); ctx.moveTo(x, base - bh * 0.1 - hh); ctx.lineTo(x + step * 0.12, base - bh * 0.1 - hh * 0.75); ctx.lineTo(x - step * 0.12, base - bh * 0.1 - hh * 0.75); ctx.closePath(); ctx.fill(); } } }
        else if (kind === 'skyline') { blocks(far, 12, bh * 0.4, bh * 1.1, bh * 0.1, 1); blocks(nearC, 9, bh * 0.3, bh * 0.8, 0, 2); ctx.fillStyle = 'rgba(255,240,180,.55)'; { const o = ring(0.6 * BD_R0, W + 20).s; for (let i = 0; i < 40; i++) { const x = wrapX(i * 53 + o, W + 20) - 10, y = base - 6 - (i * 37) % Math.round(bh * 0.7); ctx.fillRect(x, y, 2, 2); } } }
        else if (kind === 'seahorizon') { ctx.fillStyle = shade(cols[0], light, tl.tint, tl.amt); ctx.fillRect(0, base - bh * 0.35, W, bh * 0.35 + 4); const o = ring(1, W).s; ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 12; i++) ctx.fillRect(wrapX(i * 91 + o, W), base - bh * 0.35 + 4 + (i * 13) % Math.round(bh * 0.3), 18 + (i % 3) * 8, 1.5); wave(nearC, bh * 0.35, 0.03, bh * 0.05, 5, 1); ctx.fillStyle = 'rgba(255,255,255,.8)'; const bx = wrapX(o + W * 0.7, W); ctx.beginPath(); ctx.moveTo(bx, base - bh * 0.5); ctx.lineTo(bx + 9, base - bh * 0.3); ctx.lineTo(bx - 6, base - bh * 0.3); ctx.closePath(); ctx.fill(); }
        else if (kind === 'abyss') { ctx.fillStyle = shade(cols[0], light, tl.tint, tl.amt); ctx.fillRect(0, base - bh * 0.5, W, bh * 0.5 + 4); spikes(nearC, 14, bh * 0.2, bh * 0.6, 0.5, 0, 3);
          // くらいからこそ: とおくに ひかる もの(サンゴの ひかり・ねっすいの あかり)が みえる
          const o = ring(0.5 * BD_R0, W + 20).s;
          for (let i = 0; i < 9; i++) { const x = wrapX(i * 89 + o, W + 20) - 10, y = base - bh * 0.06 - (i * 41) % Math.round(bh * 0.4), tw = 0.5 + 0.5 * Math.sin(curNow * 0.0015 + i); ctx.fillStyle = i % 3 === 0 ? 'rgba(255,150,80,.9)' : 'rgba(120,225,240,.9)'; ctx.globalAlpha = 0.35 + tw * 0.5; ctx.fillRect(x, y, 2, 2); ctx.globalAlpha = 0.08 + tw * 0.06; ctx.beginPath(); ctx.arc(x + 1, y + 1, 7 + (i % 3) * 3, 0, TAU); ctx.fill(); }
          ctx.globalAlpha = 1; }
        else if (kind === 'dunes') { wave(far, bh * 0.6, 0.009, bh * 0.2, 1, 0.8); wave(nearC, bh * 0.5, 0.015, 0, 3, 1); }
        else if (kind === 'skystops') { for (let i = 0; i < 5; i++) { const x = wrapX(i * 167 + ring((0.4 + i * 0.1) * BD_R0, W + 120).s, W + 120) - 60, y = base - bh * (0.25 + (i % 3) * 0.28), r = W * (0.06 + (i % 2) * 0.03); ctx.fillStyle = i % 2 ? far : nearC; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.32, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,230,150,.9)'; ctx.fillRect(x - 1, y - r * 0.32 - 10, 2, 10); ctx.beginPath(); ctx.arc(x, y - r * 0.32 - 11, 3, 0, TAU); ctx.fill(); } wave('rgba(255,255,255,.10)', bh * 0.3, 0.02, 0, 4, 1); }
        else if (kind === 'mist') { for (let i = 0; i < 3; i++) { ctx.fillStyle = `rgba(200,205,225,${0.18 + i * 0.1})`; ctx.fillRect(0, base - bh * (0.6 - i * 0.18), W, bh); } spikes(nearC, 10, bh * 0.15, bh * 0.4, 0.5, 0, 2); }
        // とかい: ネオンの スカイライン。よるは まどが いろとりどりに ひかり、屋上に あかい とうだい
        else if (kind === 'neonskyline') {
          const night = e.time === 'night', ev = e.time === 'evening';
          blocks(far, 14, bh * 0.5, bh * 1.35, bh * 0.12, 1); blocks(shade('#262b42', light, tl.tint, tl.amt), 10, bh * 0.4, bh * 1.05, bh * 0.05, 2); blocks(nearC, 7, bh * 0.3, bh * 0.85, 0, 3);
          const lit = night ? 1 : ev ? 0.7 : 0.3; const cols = ['#ffe9a8', '#39e6ff', '#ff4fa3', '#b46bff', '#4affa0'];
          ctx.globalAlpha = lit;
          const oW = ring(0.6 * BD_R0, W + 20).s, oS = ring(0.6 * BD_R0, W + 40).s;
          for (let i = 0; i < 90; i++) { const x = wrapX(i * 47 + oW, W + 20) - 10, y = base - 4 - (i * 29) % Math.round(bh * 1.1); ctx.fillStyle = night && i % 4 === 0 ? cols[i % cols.length] : '#ffeec0'; ctx.fillRect(x, y, 2, 3); }
          // たてに ながい ネオンの かんばん
          for (let i = 0; i < 7; i++) { const x = wrapX(i * 151 + oS, W + 40) - 20, h2 = bh * (0.3 + (i % 3) * 0.16); ctx.fillStyle = cols[(i + 1) % cols.length]; ctx.globalAlpha = lit * 0.85; ctx.fillRect(x, base - bh * 0.5 - h2, 4, h2); ctx.globalAlpha = lit * 0.2; ctx.fillRect(x - 4, base - bh * 0.5 - h2, 12, h2); ctx.globalAlpha = lit; }
          ctx.globalAlpha = 1;
          ctx.fillStyle = 'rgba(255,90,90,.9)'; for (let i = 0; i < 4; i++) { const x = wrapX(i * 233 + oW, W + 20) - 10; const blink = (Math.sin(curNow * 0.002 + i) + 1) / 2; ctx.globalAlpha = 0.4 + blink * 0.6; ctx.fillRect(x, base - bh * (1.1 + (i % 2) * 0.2), 3, 3); }
          ctx.globalAlpha = 1;
        }
        // ジャングル: とがった 木立では なく、かさなりあう まるい 樹冠
        else if (kind === 'canopy') {
          const crowns = (color, n, hmin, hmax, yoff, seed) => { ctx.fillStyle = color; const step = (W + 40) / n; const R = row((0.5 + seed * 0.3) * BD_R0, step);
            for (let i = -1; i <= n + 1; i++) { const idx = R.idx(i); const hh = hmin + (hash('cn' + seed + idx) % 1000) / 1000 * (hmax - hmin), x = -20 + i * step + R.shift;
              ctx.beginPath(); ctx.ellipse(x, base - yoff - hh * 0.5, step * 0.78, hh * 0.62, 0, 0, TAU); ctx.fill(); ctx.fillRect(x - step * 0.1, base - yoff - hh * 0.5, step * 0.2, hh * 0.5 + yoff + 4); } };
          crowns(far, 9, bh * 0.6, bh * 1.25, bh * 0.1, 1); crowns(nearC, 6, bh * 0.6, bh * 1.1, 0, 2);
          ctx.fillStyle = 'rgba(30,70,30,.5)'; ctx.fillRect(0, base - bh * 0.12, W, bh * 0.12 + 4);
        }
        // さばく: すなおかの むこうに おおきな 岩山(メサ)と、ひるは しんきろう
        else if (kind === 'mesas') {
          const mesa = (color, n, hmin, hmax, yoff, r) => { ctx.fillStyle = color; const step = (W + 60) / n; const R = row(r, step); const seed = r < 0.85 ? 1 : 2;
            for (let i = -1; i <= n + 1; i++) { const idx = R.idx(i); const hh = hmin + (hash('ms' + seed + idx) % 1000) / 1000 * (hmax - hmin), x = -30 + i * step + R.shift, w = step * (0.4 + (hash('mw' + seed + idx) % 100) / 220);
              ctx.beginPath(); ctx.moveTo(x - w, base - yoff); ctx.lineTo(x - w * 0.8, base - yoff - hh); ctx.lineTo(x + w * 0.8, base - yoff - hh); ctx.lineTo(x + w, base - yoff); ctx.closePath(); ctx.fill(); } };
          wave(shade('#e6c98a', light, tl.tint, tl.amt), bh * 0.5, 0.008, bh * 0.28, 1, 0.8);
          mesa(far, 5, bh * 0.5, bh * 1.0, bh * 0.22, 0.8); mesa(nearC, 3, bh * 0.35, bh * 0.7, bh * 0.05, 0.9);
          wave(shade('#d1ad66', light, tl.tint, tl.amt), bh * 0.42, 0.014, 0, 3, 1);
          if (e.time === 'day' && e.weather === 'sunny') { ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(0, base - bh * 0.2, W, bh * 0.06); }
        }
        // いなか: おかの むこうに とおい やまなみ(そらが ひろく みえる)
        else if (kind === 'farhills') { spikes(shadeRgb(mixRgb('#8e93a4', (SKY_OVERRIDE[world.regionId] || tl.sky)[1], 0.55), light, tl.tint, tl.amt), 6, bh * 0.4, bh * 0.8, 0.5, bh * 0.4, 0, 0.7); wave(far, bh * 0.45, 0.01, bh * 0.16, 1, 0.8); wave(nearC, bh * 0.3, 0.02, 0, 2.5, 1); }
      }
      // ====== Phase 4D-2: 方角固定の 遠景レイヤー(4D-2 で home / sea の PoC、4D-2b で 12 地域へ)======
      // 何が どの 方角に、どんな こさで 見えるかは 世界の がわ(DistantFeature + visibleDistant)が きめて、
      // start() が setDistant() で わたす。ここは うつす だけ(renderer contract: sim / world は データ、renderer は とうえい)。
      // **地域の 名前で わけない。** えがき わけは DistantFeature の kind と、その 地域の いみ(backdrop・view・層)だけ。
      //   ・よこ(方位 あり): 画面の x = W/2 + F·tan(方角 − カメラの 向き)。F は とうえいと おなじ(視野 55.5°)。地図の 座標は 使わない
      //   ・たて(方位 なし: 上の 光・下の 暗さ・下の 地上): 画面の 上 / 中央上 / 中央下 / 水ぎわ の いみの 位置。カメラが まわっても うごかない
      //   ・1 画面の かずは 性能 tier ごとに 3 / 2 / 1(たても 数える)。よこの えらびかたは distantInView。lod.maxTier より おもい tier では 出さない
      //   ・同じ 方角に かさなる ときは 2 まで。山影は 1 まい だけ(順位の たかい ほう)
      //   ・はばは 角度で もち、ここで 画面に なおす(px は データに 書かない)
      //   ・あらわれる / きえる ときは ふっと(fade)。よいやすい せっていでは よこの ずれを よわく、ちらつきは なし
      const DISTANT_MAX = [3, 2, 1];
      let distant = null, dItems = [], distantShown = [], distantVert = null;
      function setDistant(s) {
        bdCalm = !!(s && s.reduced);                                        // えんけいの 帯も よいやすい せっていに あわせる(Phase 4D-2c)
        if (!s || !Array.isArray(s.list)) { distant = null; dItems = []; distantShown = []; distantVert = null; return; }
        const snap = !distant || distant.regionId !== s.regionId;          // 地域が かわった ときは その ままの こさで
        const prev = new Map(dItems.map((d) => [d.id, d])), next = [];
        for (const v of s.list) {
          if (!v || !v.feature || !v.feature.lod || v.feature.lod.maxTier < tier) continue;
          const p = prev.get(v.id); prev.delete(v.id);
          next.push({ id: v.id, feature: v.feature, alpha: v.alpha, a: snap ? v.alpha : p ? p.a : 0 });
        }
        if (!snap) for (const p of prev.values()) if (p.a > 0.02) next.push({ id: p.id, feature: p.feature, alpha: 0, a: p.a }); // きえる ものは うすれて から
        distant = { regionId: s.regionId, reduced: !!s.reduced }; dItems = next;
      }
      // 角度の まど(はば°・高さ)は 種類の いみ から
      const DISTANT_SHAPE = { mountain: [14, 1.0], snow_mountain: [14, 1.05], desert_haze: [10, 0.55], city_glow: [10, 0.75], forest: [11, 0.55], highland: [12, 0.42], island: [5, 0.3], sea_horizon: [18, 0.2] };
      const DISTANT_PEAK = new Set(['mountain', 'snow_mountain']);
      // 水面の ある 遠景帯では、遠くの ものは 水平線(水の 上の はし)に のる
      const DISTANT_WATERLINE = { seahorizon: 0.35, lakehills: 0.22 };
      // 同じ 方角(±12°)には 2 まで。山影は 1 まい
      function distantDeclutter(list) {
        const out = [];
        for (const v of list) {
          const near = out.filter((o) => Math.abs(((o.feature.bearingLocal - v.feature.bearingLocal + 540) % 360) - 180) < 12);
          if (near.length >= 2) continue;
          if (DISTANT_PEAK.has(v.feature.kind) && near.some((o) => DISTANT_PEAK.has(o.feature.kind))) continue;
          out.push(v);
        }
        return out;
      }
      // たての 意味の 位置: 上の 光は、下の 層(かいちゅう)からは 画面の 上、地上からは 中央上。
      // 下は、空の 層からは 中央下(地平線の した)、地上からは 水ぎわ(遠景帯の 下の はし)
      function distantSlot(f) {
        const lay = (WORLD_GEOGRAPHY.regions[f.sourceRegion] || {}).layer || 'ground';
        if (f.elevationClass === 'above') return lay === 'below' ? 'top' : 'upper';
        return lay === 'sky' ? 'lower' : 'waterline';
      }
      function drawDistant(world, e, light, tl, now) {
        distantShown = []; distantVert = null;
        if (!distant || distant.regionId !== world.regionId || !dItems.length) return;
        const k = Math.min(1, dtSec * 2.2);
        for (let i = dItems.length - 1; i >= 0; i--) { const d = dItems[i]; d.a += (d.alpha - d.a) * k; if (d.alpha === 0 && d.a < 0.02) dItems.splice(i, 1); }
        const yawDeg = ((cam.yaw * 180 / Math.PI) % 360 + 360) % 360, half = Math.atan(W / 2 / F) * 180 / Math.PI;
        // たて(方位なし)は 1 つ まで。1 画面の 上限に 数える
        let vert = null;
        for (const d of dItems) if (d.feature.bearingLocal == null && d.a > 0.02 && (!vert || d.feature.priority > vert.feature.priority)) vert = d;
        const maxH = Math.max(0, (DISTANT_MAX[tier] || 1) - (vert ? 1 : 0));
        const shown = distantDeclutter(distantInView(dItems, yawDeg, half * 2, dItems.length)).slice(0, maxH);
        const bh = Math.round(H * 0.17), base = HOR + 2, skyB = (SKY_OVERRIDE[world.regionId] || tl.sky)[1];
        const water = DISTANT_WATERLINE[world.backdrop] || 0, lat = eye.x * cosY - eye.z * sinY;
        const calm = distant.reduced || animLv === 0;
        // みとおし(地域の view)が せまい ところ(森・ジャングル)では 遠景を うすく
        const clarity = (world.view || 1) >= 1 ? 1 : clamp(((world.view || 1) - 0.4) / 0.6, 0.3, 1);
        // たかい ところ(やまなみの 地域)から 見ると、ほかの 山は ひくく 見える
        const lift = world.backdrop === 'peaks' || world.backdrop === 'snowpeaks' ? 0.8 : 1;
        const toX = (deg) => W / 2 + F * Math.tan(clamp(deg, -80, 80) * Math.PI / 180);
        const col = (hex, m) => shadeRgb(mixRgb(hex, skyB, m), light, tl.tint, tl.amt);
        if (vert && distantSlot(vert.feature) !== 'lower') distantVert = drawDistantVertical(vert, world, light, tl, base, bh, water);
        else if (vert) distantVert = { d: vert, slot: 'lower' };             // 地平線の した は 地面の あとで(drawDistantBelow)
        // 順位の ひくい もの(far)から えがく = おくから てまえへ
        for (let n = shown.length - 1; n >= 0; n--) {
          const d = shown[n], f = d.feature, sh = DISTANT_SHAPE[f.kind];
          if (!sh) continue;
          const rel = ((f.bearingLocal - yawDeg + 540) % 360) - 180;
          const edge = clamp((half - Math.abs(rel)) / 6, 0, 1);            // 視野の はしでは うすく(はみ出して ぱっと きえない)
          const far = f.lod.layer === 'far';
          const alpha = clamp(d.a * edge * clarity * (far ? 0.9 : 1), 0, 1);
          if (alpha < 0.02) continue;
          const seed = hash(f.id);
          // 同じ 種類でも 地域ごとに すこし ちがう かたち(id から きまる ゆらぎ ±12%。far は ほそめ)
          const wv = (0.88 + ((seed >>> 11) % 25) / 100) * (far ? 0.85 : 1), hv = (0.88 + ((seed >>> 17) % 25) / 100) * (DISTANT_PEAK.has(f.kind) ? lift : 1);
          const dx = -lat * PLX.far[1] * (far ? 0.25 : 0.5) * (distant.reduced ? 0.3 : 1);
          const cx = toX(rel) + dx, xl = toX(rel - sh[0] * wv) + dx, xr = toX(rel + sh[0] * wv) + dx, hh = bh * sh[1] * hv;
          const y0 = base - bh * Math.max(water, far ? 0.2 : 0) + (water || far ? 0 : 2);
          const cols = BACKDROP_COLORS[f.silhouette] || BACKDROP_COLORS.hills;
          const at = (u) => xl + (xr - xl) * (u + 1) / 2;                    // u = -1(ひだり)〜 1(みぎ)
          let lights = null;
          ctx.globalAlpha = alpha;
          if (DISTANT_PEAK.has(f.kind)) {
            // 山なみ: すそは 空に とけて、手前の おかの うしろに ある ように 見せる
            const peaks = [[-0.62, 0.52], [-0.12, 1], [0.42, 0.76]].map(([u, h]) => [u + ((seed >>> 3) % 9 - 4) * 0.015, h * (0.9 + ((seed >>> 7) % 5) * 0.04)]);
            const g = ctx.createLinearGradient(0, y0 - hh, 0, y0); g.addColorStop(0, col(cols[0], 0.45)); g.addColorStop(0.7, col(cols[0], 0.62)); g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(at(-1), y0);
            for (let i = 0; i < peaks.length; i++) { const [u, h] = peaks[i]; ctx.lineTo(at(u), y0 - hh * h); if (i < peaks.length - 1) ctx.lineTo(at((u + peaks[i + 1][0]) / 2), y0 - hh * Math.min(h, peaks[i + 1][1]) * 0.66); }
            ctx.lineTo(at(1), y0); ctx.closePath(); ctx.fill();
            if (f.kind === 'snow_mountain' || e.season === 'winter' || e.weather === 'snow') {
              ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath();
              for (const [u, h] of peaks) { const px = at(u), py = y0 - hh * h, w = (xr - xl) * 0.05; ctx.moveTo(px, py); ctx.lineTo(px + w, py + hh * 0.16); ctx.lineTo(px - w, py + hh * 0.16); ctx.closePath(); }
              ctx.fill();
            }
          } else if (f.kind === 'desert_haze') {
            // さばくの かすみ: 平らな 台地が うっすら
            ctx.fillStyle = col(cols[0], 0.62); ctx.beginPath();
            for (const [u, w, h] of [[-0.5, 0.3, 0.8], [0.15, 0.4, 1], [0.7, 0.22, 0.65]]) { ctx.moveTo(at(u - w), y0); ctx.lineTo(at(u - w * 0.7), y0 - hh * h); ctx.lineTo(at(u + w * 0.7), y0 - hh * h); ctx.lineTo(at(u + w), y0); ctx.closePath(); }
            ctx.fill();
          } else if (f.kind === 'forest') {
            // 森の けはい: とがった 木立と まるい こずえ。はしは ひくく して おかに なじませる
            ctx.fillStyle = col(cols[0], 0.28); ctx.beginPath(); ctx.moveTo(at(-1), y0);
            const nT = 11;
            for (let i = 0; i <= nT; i++) { const u = -1 + 2 * i / nT, taper = 1 - Math.pow(Math.abs(u), 3), h = (0.55 + ((seed >>> (i % 16)) & 7) / 16) * taper; ctx.lineTo(at(u - 1 / nT), y0 - hh * h * 0.45); ctx.lineTo(at(u), y0 - hh * h); }
            ctx.lineTo(at(1), y0); ctx.closePath(); ctx.fill();
            ctx.fillStyle = col(cols[1], 0.2); ctx.beginPath(); ctx.moveTo(at(-0.8), y0);
            for (let i = 0; i < 4; i++) { const u0 = -0.8 + i * 0.4, u1 = u0 + 0.4, h = hh * (0.5 + ((seed >>> (i * 3)) & 3) * 0.08) * (1 - Math.abs(u0 + 0.2) * 0.4); ctx.quadraticCurveTo(at(u0 + 0.2), y0 - h * 1.5, at(u1), y0 - h * 0.25); }
            ctx.lineTo(at(0.8), y0); ctx.closePath(); ctx.fill();
          } else if (f.kind === 'highland') {
            // たかはら / おか: なだらかな おか。ふもとに 水の ある 見え方(lakehills)なら 水の ひかりを 1 本
            ctx.fillStyle = col(cols[0], 0.32); ctx.beginPath(); ctx.moveTo(at(-1), y0);
            ctx.quadraticCurveTo(at(-0.55), y0 - hh * 1.1, at(-0.1), y0 - hh * 0.7); ctx.quadraticCurveTo(at(0.35), y0 - hh * 1.35, at(1), y0);
            ctx.closePath(); ctx.fill();
            if (f.silhouette === 'lakehills') { ctx.fillStyle = col(cols[1], 0.15); ctx.fillRect(at(-0.55), y0 - hh * 0.16, at(0.45) - at(-0.55), Math.max(2, hh * 0.1)); }
          } else if (f.kind === 'sea_horizon') {
            // 海の けはい: 水平線の あおい すじと かすみ。両はしは ほそく とける
            const g = ctx.createLinearGradient(0, y0 - hh, 0, y0); g.addColorStop(0, col(cols[0], 0.7).replace('rgb', 'rgba').replace(')', ',0)')); g.addColorStop(1, col(cols[0], 0.35));
            ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(at(-1), y0); ctx.lineTo(at(-0.55), y0 - hh); ctx.lineTo(at(0.55), y0 - hh); ctx.lineTo(at(1), y0); ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(at(-0.5), y0 - hh * 0.35, at(0.5) - at(-0.5), 1.5);
          } else if (f.kind === 'island') {
            // 島影: 水平線に ちいさな しまと、やしの き
            ctx.fillStyle = col('#2f6a2f', 0.4); ctx.beginPath(); ctx.moveTo(at(-1), y0);
            ctx.quadraticCurveTo(at(-0.45), y0 - hh * 1.3, at(0.1), y0 - hh * 0.95); ctx.quadraticCurveTo(at(0.6), y0 - hh * 0.8, at(1), y0); ctx.closePath();
            const tx = at(-0.15), ty = y0 - hh * 1.05, s2 = Math.max(4, hh * 0.9);
            ctx.moveTo(tx - 1, ty); ctx.lineTo(tx + s2 * 0.12, ty - s2); ctx.lineTo(tx + s2 * 0.18, ty - s2); ctx.lineTo(tx + 1, ty); ctx.closePath();
            for (const a of [-2.6, -1.9, -1.2, -0.5]) { const fx = tx + s2 * 0.15, fy = ty - s2; ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(a) * s2 * 0.5, fy + Math.sin(a + 1.6) * s2 * 0.25 + s2 * 0.12); ctx.lineTo(fx + Math.cos(a) * s2 * 0.42, fy + Math.sin(a + 1.6) * s2 * 0.25 + s2 * 0.2); ctx.closePath(); }
            ctx.fill();
          } else if (f.kind === 'city_glow') {
            // 街の 灯: 水平線の ほんのりした ひかりと、ビルの かげ、まどの 灯(夕方・夜 だけ。こさは データの alpha)
            const gr = (xr - xl) * 0.6, g = ctx.createRadialGradient(cx, y0, 0, cx, y0, gr); g.addColorStop(0, 'rgba(255,190,120,.5)'); g.addColorStop(1, 'rgba(255,190,120,0)');
            ctx.fillStyle = g; ctx.fillRect(cx - gr, y0 - gr, gr * 2, gr);
            ctx.fillStyle = col(cols[0], 0.25); ctx.beginPath();
            const nB = 9, bw = (xr - xl) / nB;
            for (let i = 0; i < nB; i++) { const u = Math.abs((i + 0.5) / nB * 2 - 1), h = hh * (0.35 + (((seed >>> i) & 7) / 7) * 0.65) * (1 - u * 0.55); ctx.rect(xl + i * bw + bw * 0.08, y0 - h, bw * 0.84, h); }
            ctx.fill();
            // まどの 灯は 2 くみ。よいやすい せってい / かるい ときは またたかない
            lights = [];
            for (let gI = 0; gI < 2; gI++) {
              const tw = calm ? 0.85 : 0.85 + 0.15 * Math.sin(now * 0.0017 + gI * 2.1); lights.push(tw);
              ctx.globalAlpha = alpha * tw; ctx.fillStyle = gI ? 'rgba(120,225,255,.95)' : 'rgba(255,233,168,.95)'; ctx.beginPath();
              for (let i = gI; i < nB; i += 2) { const u = Math.abs((i + 0.5) / nB * 2 - 1), h = hh * (0.35 + (((seed >>> i) & 7) / 7) * 0.65) * (1 - u * 0.55); for (let r = 0; r < 3; r++) { const yy = y0 - h + hh * 0.1 + r * hh * 0.16; if (yy > y0 - hh * 0.08) break; ctx.rect(xl + i * bw + bw * 0.3, yy, Math.max(1.5, bw * 0.16), Math.max(1.5, hh * 0.05)); } }
              ctx.fill();
            }
          }
          ctx.globalAlpha = 1;
          distantShown.push({ id: d.id, kind: f.kind, layer: f.lod.layer, x: cx, dx, rel, alpha, y0, lights });
        }
        if (distantVert && distantVert.slot !== 'lower') distantShown.push(distantVert.entry);
      }
      // たての 遠景(方位 なし)。水平の 式は 使わない。画面の 意味の 位置に 1 つ だけ
      function drawDistantVertical(d, world, light, tl, base, bh, water) {
        const f = d.feature, slot = distantSlot(f), alpha = clamp(d.a * 0.9, 0, 1);
        const entry = { id: d.id, kind: f.kind, layer: 'vertical', slot, alpha, y: 0 };
        if (alpha < 0.02) return { d, slot, entry };
        ctx.globalAlpha = alpha;
        if (slot === 'top') {
          // 下の 層から 見上げる 水面の ひかり: 画面の 上から さしこむ うすい ひかりの すじ
          const y1 = HOR * 0.75, g = ctx.createLinearGradient(0, 0, 0, y1); g.addColorStop(0, 'rgba(190,235,255,.42)'); g.addColorStop(1, 'rgba(190,235,255,0)');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, y1);
          ctx.fillStyle = 'rgba(210,245,255,.10)'; ctx.beginPath();
          for (const [u, w] of [[0.22, 0.05], [0.5, 0.07], [0.76, 0.04]]) { ctx.moveTo(W * (u - w), 0); ctx.lineTo(W * (u + w), 0); ctx.lineTo(W * (u + w * 2.4), y1); ctx.lineTo(W * (u - w * 0.6), y1); ctx.closePath(); }
          ctx.fill(); entry.y = 0;
        } else if (slot === 'upper') {
          // 地上から 見上げる 空の のりばの 灯: 空の たかい ところに ちいさな ひかりと、したへ のびる ほそい すじ
          const x = W * 0.5, y = HOR * 0.2, r = Math.max(10, W * 0.05);
          const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,240,190,.95)'); g.addColorStop(0.35, 'rgba(255,225,150,.45)'); g.addColorStop(1, 'rgba(255,225,150,0)');
          ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
          ctx.fillStyle = 'rgba(255,240,200,.25)'; ctx.fillRect(x - 0.5, y + r * 0.3, 1, base - bh * 0.6 - y);
          entry.y = y;
        } else if (slot === 'waterline') {
          // 地上から 見る 下の くらさ(ふかい 海): 遠景帯の 水の したの はしが くらく しずむ
          const y1 = base - bh * Math.max(water, 0.2), g = ctx.createLinearGradient(0, y1, 0, base + 2);
          g.addColorStop(0, 'rgba(10,30,70,0)'); g.addColorStop(1, 'rgba(10,30,70,.6)');
          ctx.fillStyle = g; ctx.fillRect(0, y1, W, base + 2 - y1); entry.y = base;
        }
        ctx.globalAlpha = 1;
        return { d, slot, entry };
      }
      // 空の 層から 見る 下の 地上: 地面を えがいた あとで、地平線の すぐ したに うすい 地上の けはい
      function drawDistantBelow(world, light, tl) {
        if (!distantVert || distantVert.slot !== 'lower') return;
        const d = distantVert.d, f = d.feature, alpha = clamp(d.a * 0.9, 0, 1);
        const entry = { id: d.id, kind: f.kind, layer: 'vertical', slot: 'lower', alpha, y: HOR };
        distantShown.push(entry);
        if (alpha < 0.02) return;
        const cols = BACKDROP_COLORS[(WORLDS[f.targetRegion] || {}).backdrop] || BACKDROP_COLORS.hills;
        const y1 = HOR + (H - HOR) * 0.16, land = shade(cols[0], light, tl.tint, tl.amt);
        // 雲の 霞: 空の いちばん したの いろ。地上は 霞の むこうに うっすら 見える(さかいめを 線に しない)
        const haze = shade((SKY_OVERRIDE[world.regionId] || tl.sky)[1], light, tl.tint, tl.amt), hazeA = (a) => haze.replace('rgb(', 'rgba(').replace(')', ',' + a + ')');
        ctx.globalAlpha = alpha * 0.55;
        const g = ctx.createLinearGradient(0, HOR, 0, y1); g.addColorStop(0, haze); g.addColorStop(0.4, land); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, HOR, W, y1 - HOR);
        // はたけの つぎはぎ(ほそい すじ)。雲の あいだから 見える 地上
        ctx.globalAlpha = alpha * 0.3; ctx.fillStyle = shade(cols[1], light, tl.tint, tl.amt); ctx.beginPath();
        for (let i = 0; i < 7; i++) { const x = W * (i / 7) + (hash(f.id + i) % 30) - 15, w = W * 0.09, y = HOR + (H - HOR) * (0.02 + (i % 3) * 0.03); ctx.rect(x, y, w, Math.max(1.5, (H - HOR) * 0.012)); }
        ctx.fill();
        // 霞の おび: 地平線を またいで 空と 地上を つなぐ
        const hy0 = HOR - (y1 - HOR) * 0.35, hy1 = HOR + (y1 - HOR) * 0.7;
        const hg = ctx.createLinearGradient(0, hy0, 0, hy1); hg.addColorStop(0, hazeA(0)); hg.addColorStop(0.33, hazeA(1)); hg.addColorStop(0.6, hazeA(0.5)); hg.addColorStop(1, hazeA(0));
        ctx.globalAlpha = alpha; ctx.fillStyle = hg; ctx.fillRect(0, hy0, W, hy1 - hy0);
        ctx.globalAlpha = 1;
      }
      // ====== /Phase 4D-2 ======
      // ---- じめん・みち・みずべ・もよう ----
      // ワールドの てんの ならび → とうえいして ぬる。いちぶが カメラの うしろでも、
      // てまえの めん(NEAR)で きって、みえる ぶんだけ ぬる(まえは まるごと やめていた ので
      // あしもとの みち や うみが きえていた)。まいフレーム よぶ ので はいれつは つかいまわす
      const polyA = [], polyB = [];
      function fillWorldPoly(pts) {
        const n = pts.length; polyA.length = 0; polyB.length = 0;
        for (let i = 0; i < n; i++) { const c = toCam(pts[i][0], pts[i][1]); polyA.push(c.cx, c.cz); }
        for (let i = 0; i < n; i++) {
          const ax = polyA[i * 2], az = polyA[i * 2 + 1], j = (i + 1) % n, bx = polyA[j * 2], bz = polyA[j * 2 + 1];
          const aIn = az >= NEAR, bIn = bz >= NEAR;
          if (aIn) polyB.push(ax, az);
          if (aIn !== bIn) { const t = (NEAR - az) / (bz - az); polyB.push(ax + (bx - ax) * t, NEAR); }
        }
        if (polyB.length < 6) return false;
        ctx.beginPath();
        for (let i = 0; i < polyB.length; i += 2) { const p = projectCam({ cx: polyB[i], cz: polyB[i + 1] }); if (i === 0) ctx.moveTo(p.sx, p.sy); else ctx.lineTo(p.sx, p.sy); }
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
        // おおきな ちけい(うみ・かわ・かいこう)と じめんの おおきな くぎり は じめんの うえ、みちの した
        drawTerrain(world, tl);
        drawAreas(world, tl);
        // みち(スポットを つなぐ ポリゴン。みじかく くぎって とうえい)
        const pathColor = shade(world.path, light, tl.tint, tl.amt);
        for (const s of world.segments) {
          const dx = (s.b.x - s.a.x) / s.len, dz = (s.b.z - s.a.z) / s.len; const nx = -dz, nz = dx; const half = s.half; const n = Math.max(2, Math.ceil(s.len / 110));
          const secret = s.kind === 'secret';
          for (let i = 0; i < n; i++) {
            const t0 = i / n, t1 = (i + 1) / n;
            const ax = s.a.x + (s.b.x - s.a.x) * t0, az = s.a.z + (s.b.z - s.a.z) * t0, bx = s.a.x + (s.b.x - s.a.x) * t1, bz = s.a.z + (s.b.z - s.a.z) * t1;
            const ca = toCam(ax, az), cb = toCam(bx, bz); if (ca.cz < -400 && cb.cz < -400) continue; if (ca.cz > 6000 && cb.cz > 6000) continue;
            if (world.glowPath) { ctx.fillStyle = 'rgba(200,180,255,.22)'; fillWorldPoly([[ax + nx * (half + 26), az + nz * (half + 26)], [bx + nx * (half + 26), bz + nz * (half + 26)], [bx - nx * (half + 26), bz - nz * (half + 26)], [ax - nx * (half + 26), az - nz * (half + 26)]]); }
            ctx.fillStyle = pathColor; ctx.globalAlpha = secret ? 0.42 : world.glowPath ? 0.85 : 0.72;
            fillWorldPoly([[ax + nx * half, az + nz * half], [bx + nx * half, bz + nz * half], [bx - nx * half, bz - nz * half], [ax - nx * half, az - nz * half]]);
            ctx.globalAlpha = 1;
          }
        }
        // スポットの じめん(ひろばは まるく あかるい)
        for (const s of world.spots) {
          if (s.kind === 'water') continue; if (s.secret && s.kind === 'deep') continue;
          const c = toCam(s.x, s.z); if (c.cz < -s.r - 400 || c.cz > 5000) continue;
          ctx.fillStyle = pathColor; ctx.globalAlpha = s.kind === 'plaza' ? 0.5 : 0.28;
          const pts = []; for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; pts.push([s.x + Math.sin(a) * s.r * 0.9, s.z + Math.cos(a) * s.r * 0.9]); }
          fillWorldPoly(pts); ctx.globalAlpha = 1;
        }
        // みずべ
        for (const s of world.spots) if (s.kind === 'water') {
          const c = toCam(s.x, s.z); if (c.cz < -s.r - 400 || c.cz > 5000) continue;
          const pts = []; for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; pts.push([s.x + Math.sin(a) * s.r, s.z + Math.cos(a) * s.r]); }
          const rim = []; for (let k = 0; k < 14; k++) { const a = k / 14 * TAU, rr = s.r * (1.1 + 0.06 * Math.sin(k * 2.3)); rim.push([s.x + Math.sin(a) * rr, s.z + Math.cos(a) * rr]); }
          ctx.fillStyle = shade('#cfe4ea', light, tl.tint, tl.amt); ctx.globalAlpha = 0.5; fillWorldPoly(rim); // みずぎわ(ぬれた いし・すな)
          ctx.fillStyle = shade('#6fb7e8', light, tl.tint, tl.amt); ctx.globalAlpha = 0.8; if (fillWorldPoly(pts)) { ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.5; ctx.stroke(); } ctx.globalAlpha = 1;
        }
        // じめんの もよう(くさ・こいし・きらめき)と みちの ふち(ふみあと・いし・くい)
        const ms = world.markStyle; ctx.fillStyle = ms.color;
        for (const m of world.marks) { const p = project(m.x, m.z); if (!p || p.sy > H + 4 || p.sx < -10 || p.sx > W + 10 || p.dz > Math.min(3200, farCull)) continue; const px = m.size * p.s; if (px < 1.2) continue; if (m.edge) { ctx.fillStyle = world.edge; ctx.globalAlpha = clamp(1.2 - p.dz / farCull, 0.1, 0.7); ctx.fillRect(p.sx - px * 0.14, p.sy - px * 0.55, px * 0.28, px * 0.55); ctx.fillStyle = ms.color; continue; } ctx.globalAlpha = clamp(1.3 - p.dz / 2800, 0.15, ms.kind === 'sparkle' ? 0.9 : 0.5); if (ms.kind === 'tuft') { ctx.fillRect(p.sx - px * 0.5, p.sy - px * 0.7, px * 0.25, px * 0.7); ctx.fillRect(p.sx, p.sy - px * 0.9, px * 0.25, px * 0.9); ctx.fillRect(p.sx + px * 0.45, p.sy - px * 0.6, px * 0.25, px * 0.6); } else if (ms.kind === 'stone') { ctx.beginPath(); ctx.ellipse(p.sx, p.sy, px * 0.5, px * 0.22, 0, 0, TAU); ctx.fill(); } else { const tw = 0.5 + 0.5 * Math.sin(m.phase + now * 0.003); ctx.globalAlpha *= tw; ctx.fillRect(p.sx - px * 0.15, p.sy - px * 0.15, px * 0.3, px * 0.3); } }
        ctx.globalAlpha = 1;
      }
      // ---- ランドマーク(とおくからでも みえる おおきな もの)。おおきい ので シルエットを ゆうせん ----
      function drawLandmark(kind, p, size, light, world) {
        const px = size * p.s; const x = p.sx, y = p.sy; if (px < 4) return;
        ctx.save();
        const seed = kind.length * 31;
        const rect = (c, dx, dy, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + px * dx, y + px * dy, px * w, px * h); };
        const tri = (c, pts) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x + px * pts[0], y + px * pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(x + px * pts[i], y + px * pts[i + 1]); ctx.closePath(); ctx.fill(); };
        const oval = (c, dx, dy, rx, ry) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x + px * dx, y + px * dy, px * rx, px * ry, 0, 0, TAU); ctx.fill(); };
        const glow = (c, dx, dy, r, a) => { ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + px * dx, y + px * dy, Math.min(px * r, H * 0.12), 0, TAU); ctx.fill(); ctx.globalAlpha = 1; };
        const autumn = curEnv.season === 'autumn', night = isNight();
        if (kind === 'bigtree') { // 大木: ねっこ + ふとい みき + 2ほんの えだ + かさなる こずえ
          oval('rgba(0,0,0,.2)', 0, 0.01, 0.42, 0.09);
          const bark = sh('#6a4526'), dark = 'rgba(0,0,0,.2)';
          tri(bark, [-0.3, 0, -0.16, -0.12, -0.1, -0.5, 0.1, -0.5, 0.16, -0.12, 0.3, 0]); tri(bark, [-0.16, -0.06, -0.08, -0.16, -0.06, 0, -0.2, 0.01]); tri(bark, [0.16, -0.06, 0.08, -0.16, 0.06, 0, 0.2, 0.01]);
          tri(dark, [0.02, -0.12, 0.03, -0.5, 0.1, -0.5, 0.16, -0.12, 0.3, 0, 0.1, 0]);
          ctx.strokeStyle = bark; ctx.lineWidth = Math.max(2, px * 0.05); for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * px * 0.04, y - px * 0.42); ctx.quadraticCurveTo(x + s * px * 0.2, y - px * 0.6, x + s * px * 0.36, y - px * 0.72); ctx.stroke(); }
          ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1, px * 0.01); for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x + px * k * 0.05, y - px * 0.1); ctx.quadraticCurveTo(x + px * (k * 0.06 + 0.02), y - px * 0.3, x + px * k * 0.04, y - px * 0.48); ctx.stroke(); }
          const c0 = sh(autumn ? '#c8843a' : '#3f7a3a'), c1 = sh(autumn ? '#9a5f28' : '#2d5c2a'), c2 = sh(autumn ? '#e8a85a' : '#5fa04f'), c3 = sh(autumn ? '#f0c07a' : '#8fc56a');
          ctx.strokeStyle = 'rgba(0,0,0,.24)'; ctx.lineWidth = Math.max(1, px * 0.008); oval(c1, 0, -0.62, 0.5, 0.28); ctx.stroke(); oval(c0, -0.3, -0.7, 0.28, 0.24); ctx.stroke(); oval(c0, 0.3, -0.72, 0.28, 0.24); ctx.stroke(); oval(c0, 0, -0.9, 0.34, 0.28); ctx.stroke(); oval(c2, -0.12, -0.98, 0.22, 0.16); oval(c2, 0.2, -0.84, 0.16, 0.12); oval(c3, -0.08, -1.06, 0.1, 0.06);
          if (world.regionId === 'home' && night) { oval('rgba(255,225,150,.9)', 0.2, -0.3, 0.03, 0.03); glow('#ffd88a', 0.2, -0.3, 0.2, 0.2); } }
        else if (kind === 'lighthouse') { ctx.fillStyle = sh('#f4f0e6'); ctx.beginPath(); ctx.moveTo(x - px * 0.12, y); ctx.lineTo(x + px * 0.12, y); ctx.lineTo(x + px * 0.08, y - px * 0.95); ctx.lineTo(x - px * 0.08, y - px * 0.95); ctx.closePath(); ctx.fill(); ctx.fillStyle = sh('#d94b4b'); for (let k = 0; k < 3; k++) ctx.fillRect(x - px * 0.115, y - px * (0.2 + k * 0.28), px * 0.23, px * 0.1); rect('rgba(0,0,0,.14)', 0.02, -0.95, 0.08, 0.95); rect(sh('#334'), -0.1, -1.03, 0.2, 0.08); rect(sh('#334'), -0.14, -0.96, 0.28, 0.02); rect('rgba(255,240,150,.95)', -0.07, -1.02, 0.14, 0.07); ctx.fillStyle = 'rgba(255,240,150,.12)'; ctx.beginPath(); ctx.moveTo(x, y - px * 0.99); ctx.lineTo(x + px * 1.4, y - px * 1.25); ctx.lineTo(x + px * 1.4, y - px * 0.72); ctx.closePath(); ctx.fill(); rect(sh('#8a8474'), -0.3, -0.03, 0.6, 0.05); }
        else if (kind === 'tower') { rect(sh('#a9905f'), -0.12, -0.9, 0.24, 0.9); rect('rgba(0,0,0,.16)', 0.04, -0.9, 0.08, 0.9); ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1; for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.moveTo(x - px * 0.12, y - px * k * 0.15); ctx.lineTo(x + px * 0.12, y - px * k * 0.15); ctx.stroke(); } tri(sh('#7c6a44'), [-0.16, -0.9, 0, -1.12, 0.16, -0.9]); rect(sh('#7c6a44'), -0.15, -0.92, 0.3, 0.04); ctx.fillStyle = '#fff8e0'; ctx.beginPath(); ctx.arc(x, y - px * 0.72, px * 0.08, 0, TAU); ctx.fill(); ctx.strokeStyle = '#333'; ctx.lineWidth = Math.max(1, px * 0.012); ctx.beginPath(); ctx.moveTo(x, y - px * 0.72); ctx.lineTo(x, y - px * 0.78); ctx.moveTo(x, y - px * 0.72); ctx.lineTo(x + px * 0.045, y - px * 0.71); ctx.stroke(); rect(sh('#5a4a34'), -0.05, -0.16, 0.1, 0.16); }
        else if (kind === 'waterfall') { // がけ + 2すじの みず + みずしぶき + ふち
          const rock = sh('#6a7a6a'); tri(rock, [-0.55, 0, -0.5, -0.5, -0.42, -0.92, -0.2, -1, 0.25, -0.98, 0.48, -0.86, 0.55, -0.4, 0.5, 0]); ctx.strokeStyle = 'rgba(0,0,0,.16)'; ctx.lineWidth = Math.max(1, px * 0.012); for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x - px * 0.5, y - px * k * 0.22); ctx.lineTo(x + px * 0.5, y - px * (k * 0.22 + 0.04)); ctx.stroke(); }
          oval(sh('#3f7a3a'), -0.4, -0.9, 0.12, 0.05); oval(sh('#3f7a3a'), 0.36, -0.82, 0.14, 0.05);
          ctx.fillStyle = 'rgba(210,235,255,.85)'; ctx.fillRect(x - px * 0.14, y - px * 0.95, px * 0.28, px * 0.95); ctx.fillStyle = 'rgba(255,255,255,.55)'; const ph = (curNow * 0.004) % 1; for (let k = 0; k < 4; k++) ctx.fillRect(x - px * 0.1 + px * k * 0.06, y - px * ((0.9 - ((ph + k * 0.25) % 1) * 0.85)), px * 0.02, px * 0.12);
          ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(x, y - px * 0.02, px * 0.34, px * 0.09, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.ellipse(x, y - px * 0.1, px * 0.24, px * 0.14, 0, 0, TAU); ctx.fill(); }
        else if (kind === 'coral') { const cols = ['#ff7a9a', '#ffb066', '#c78bff']; for (let k = 0; k < 3; k++) { ctx.fillStyle = sh(cols[k]); const bx = x + (k - 1) * px * 0.28; ctx.beginPath(); ctx.moveTo(bx - px * 0.1, y); ctx.lineTo(bx - px * 0.14, y - px * (0.5 + k * 0.12)); ctx.lineTo(bx + px * 0.14, y - px * (0.5 + k * 0.12)); ctx.lineTo(bx + px * 0.1, y); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(bx, y - px * (0.5 + k * 0.12), px * 0.16, 0, TAU); ctx.fill(); glow(cols[k], (k - 1) * 0.28, -(0.5 + k * 0.12), 0.3, 0.14); } ctx.fillStyle = 'rgba(200,240,255,.5)'; for (let k = 0; k < 5; k++) ctx.fillRect(x + (k - 2) * px * 0.16, y - px * (0.75 + (k % 2) * 0.1), 2, 2); }
        else if (kind === 'bigstop') { // ていりゅうじょ: たかい はしら + かんばん + まるい ランプ(おおきな えんばんは やめた)
          rect(sh('#4a4a70'), -0.03, -0.95, 0.06, 0.95); rect(sh('#5f5f8a'), -0.24, -0.06, 0.48, 0.06);
          rect(sh('#3a3a66'), -0.3, -0.86, 0.6, 0.22); rect('rgba(255,230,150,.9)', -0.27, -0.83, 0.54, 0.16); ctx.fillStyle = '#4a3a10'; ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = px * (k % 2 ? 0.03 : 0.065); ctx.lineTo(x - px * 0.16 + Math.cos(a) * rr, y - px * 0.75 + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); rect('#4a3a10', -0.05, -0.79, 0.26, 0.03); rect('#4a3a10', -0.05, -0.73, 0.18, 0.03);
          oval('#ffd86a', 0, -1.02, 0.09, 0.09); glow('#ffd86a', 0, -1.02, 0.3, 0.16); }
        else if (kind === 'windmill') { ctx.fillStyle = sh('#e8dcc0'); ctx.beginPath(); ctx.moveTo(x - px * 0.16, y); ctx.lineTo(x + px * 0.16, y); ctx.lineTo(x + px * 0.1, y - px * 0.7); ctx.lineTo(x - px * 0.1, y - px * 0.7); ctx.closePath(); ctx.fill(); rect('rgba(0,0,0,.12)', 0.03, -0.7, 0.08, 0.7); ctx.fillStyle = sh('#b5473a'); ctx.beginPath(); ctx.moveTo(x - px * 0.14, y - px * 0.7); ctx.lineTo(x, y - px * 0.85); ctx.lineTo(x + px * 0.14, y - px * 0.7); ctx.closePath(); ctx.fill(); rect(sh('#5a3f2a'), -0.05, -0.16, 0.1, 0.16); rect(sh('#9fc8e8'), -0.04, -0.42, 0.08, 0.08); ctx.strokeStyle = sh('#6b4a2a'); ctx.lineWidth = Math.max(1, px * 0.025); const rot = performance.now() * 0.0006; for (let k = 0; k < 4; k++) { const a = rot + k * Math.PI / 2; ctx.beginPath(); ctx.moveTo(x, y - px * 0.72); ctx.lineTo(x + Math.cos(a) * px * 0.36, y - px * 0.72 + Math.sin(a) * px * 0.36); ctx.stroke(); ctx.fillStyle = 'rgba(232,220,192,.6)'; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * px * 0.1, y - px * 0.72 + Math.sin(a) * px * 0.1); ctx.lineTo(x + Math.cos(a) * px * 0.36, y - px * 0.72 + Math.sin(a) * px * 0.36); ctx.lineTo(x + Math.cos(a + 0.25) * px * 0.3, y - px * 0.72 + Math.sin(a + 0.25) * px * 0.3); ctx.closePath(); ctx.fill(); } }
        else if (kind === 'lodge') { rect(sh('#8a5a3a'), -0.35, -0.4, 0.7, 0.4); rect('rgba(0,0,0,.14)', 0.22, -0.4, 0.13, 0.4); ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = 1; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x - px * 0.35, y - px * k * 0.1); ctx.lineTo(x + px * 0.35, y - px * k * 0.1); ctx.stroke(); } tri(sh('#f4f7fb'), [-0.42, -0.4, 0, -0.75, 0.42, -0.4]); tri('rgba(180,200,220,.35)', [0, -0.75, 0.42, -0.4, 0.1, -0.4]); rect(sh('#6a4a3a'), 0.16, -0.72, 0.08, 0.16); rect('rgba(255,220,130,.95)', -0.22, -0.3, 0.12, 0.12); rect('rgba(255,220,130,.95)', 0.1, -0.3, 0.12, 0.12); rect(sh('#5a3f2a'), -0.06, -0.2, 0.12, 0.2); if (night) glow('#ffd88a', 0, -0.25, 0.7, 0.16); }
        else if (kind === 'palms') { for (let k = -1; k <= 1; k++) { const bx = k * 0.3, h = 0.6 + Math.abs(k) * 0.1, lean = k * 0.08; ctx.strokeStyle = sh('#8a6a3a'); ctx.lineWidth = Math.max(2, px * 0.05); ctx.beginPath(); ctx.moveTo(x + px * bx, y); ctx.quadraticCurveTo(x + px * (bx + lean * 0.5), y - px * h * 0.6, x + px * (bx + lean), y - px * h); ctx.stroke(); ctx.fillStyle = sh('#3f9a4a'); for (let f = 0; f < 5; f++) { const a = -Math.PI * 0.95 + f * (Math.PI * 0.9 / 4); ctx.beginPath(); ctx.ellipse(x + px * (bx + lean) + Math.cos(a) * px * 0.16, y - px * h + Math.sin(a) * px * 0.06, px * 0.18, px * 0.05, a * 0.6, 0, TAU); ctx.fill(); } } oval(sh('#4fb0d8'), 0, 0.02, 0.5, 0.1); }
        else if (kind === 'peak') { // やま: 2つの みねが かさなり、ゆきの ぼうし、おね の せん(絵文字では ない)
          const snowy = world.regionId === 'snow' || curEnv.season === 'winter' || curEnv.weather === 'snow';
          tri(sh('#7d7768'), [-0.7, 0, -0.42, -0.5, -0.2, -0.62, 0.05, -0.4, 0.3, -0.5, 0.7, 0]);
          tri(sh('#8e93a4'), [-0.5, 0, -0.2, -0.62, 0.05, -1, 0.35, -0.7, 0.62, 0]); tri('rgba(0,0,0,.2)', [0.05, -1, 0.35, -0.7, 0.62, 0, 0.1, 0]);
          ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = Math.max(1, px * 0.012); ctx.beginPath(); ctx.moveTo(x + px * 0.05, y - px * 1); ctx.lineTo(x - px * 0.06, y - px * 0.6); ctx.lineTo(x - px * 0.18, y - px * 0.2); ctx.moveTo(x + px * 0.05, y - px * 1); ctx.lineTo(x + px * 0.2, y - px * 0.55); ctx.stroke();
          if (snowy) { tri('rgba(255,255,255,.92)', [-0.05, -0.8, 0.05, -1, 0.17, -0.82, 0.12, -0.7, 0.05, -0.76, -0.02, -0.68]); tri('rgba(255,255,255,.6)', [-0.28, -0.5, -0.2, -0.62, -0.12, -0.5, -0.18, -0.42]); }
          oval(sh('#2f6a3a'), -0.42, -0.06, 0.1, 0.08); oval(sh('#2f6a3a'), 0.4, -0.05, 0.08, 0.07); }
        else if (kind === 'temple') { // だんだんの ピラミッド + かいだん + いりぐち
          const c = sh(world.regionId === 'jungle' ? '#a8a080' : '#cdb98a'), c2 = sh(world.regionId === 'jungle' ? '#7a7a5a' : '#8a7a5a');
          for (let k = 0; k < 4; k++) { const w = 0.72 - k * 0.16, h = 0.18; rect(c, -w / 2, -h * (k + 1), w, h); rect('rgba(0,0,0,.18)', w / 2 - 0.05, -h * (k + 1), 0.05, h); ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1; for (let b = 0; b < 4; b++) { ctx.beginPath(); ctx.moveTo(x + px * (-w / 2 + b * w / 4 + (k % 2) * w / 8), y - px * h * (k + 1)); ctx.lineTo(x + px * (-w / 2 + b * w / 4 + (k % 2) * w / 8), y - px * h * k); ctx.stroke(); } }
          rect(c2, -0.08, -0.72, 0.16, 0.72); ctx.strokeStyle = 'rgba(255,255,255,.35)'; for (let k = 1; k < 12; k++) { ctx.beginPath(); ctx.moveTo(x - px * 0.08, y - px * k * 0.06); ctx.lineTo(x + px * 0.08, y - px * k * 0.06); ctx.stroke(); }
          rect(sh('#2a2418'), -0.06, -0.88, 0.12, 0.16); rect(c, -0.14, -0.9, 0.28, 0.03);
          if (world.regionId === 'jungle') { oval(sh('#3f8a3a'), -0.3, -0.56, 0.12, 0.05); oval(sh('#3f8a3a'), 0.28, -0.38, 0.14, 0.05); } }
        else if (kind === 'bridge') { ctx.strokeStyle = sh('#8a6a3a'); ctx.lineWidth = Math.max(2, px * 0.05); ctx.beginPath(); ctx.moveTo(x - px * 0.5, y); ctx.quadraticCurveTo(x, y - px * 0.5, x + px * 0.5, y); ctx.stroke(); for (let k = -2; k <= 2; k++) { const bx = x + k * px * 0.2; ctx.beginPath(); ctx.moveTo(bx, y - px * 0.02); ctx.lineTo(bx, y - px * (0.45 - Math.abs(k) * 0.08)); ctx.stroke(); } ctx.lineWidth = Math.max(1, px * 0.02); ctx.beginPath(); ctx.moveTo(x - px * 0.5, y - px * 0.16); ctx.quadraticCurveTo(x, y - px * 0.66, x + px * 0.5, y - px * 0.16); ctx.stroke(); }
        else if (kind === 'glowmushroom') { // ひかる キノコ(まえは 🌳 に なっていた)
          oval('rgba(0,0,0,.14)', 0, 0.02, 0.5, 0.1);
          for (let k = 0; k < 3; k++) { const f = [0.9, 0.7, 0.55][k], bx = [-0.05, 0.28, -0.32][k]; rect(sh('#efe3cf'), bx - 0.06 * f, -0.8 * f, 0.12 * f, 0.8 * f); rect('rgba(0,0,0,.12)', bx + 0.01 * f, -0.8 * f, 0.05 * f, 0.8 * f);
            ctx.fillStyle = night ? '#9ff0d8' : sh('#8fd8c0'); ctx.beginPath(); ctx.ellipse(x + px * bx, y - px * 0.8 * f, px * 0.3 * f, px * 0.2 * f, 0, Math.PI, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(x + px * (bx - 0.1 * f), y - px * 0.86 * f, px * 0.05 * f, px * 0.035 * f, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + px * (bx + 0.12 * f), y - px * 0.83 * f, px * 0.035 * f, px * 0.025 * f, 0, 0, TAU); ctx.fill();
            glow('#9ff0d8', bx, -0.8 * f, 0.6 * f, night ? 0.28 : 0.12); } }
        else drawScenery('🌳', x, y, px);
        ctx.restore();
      }
      // ---- キャラ(むき・しせいで ちがいを だす) ----
      // ---- キャラの え の したく(つかいまわす) ----
      // うしろむきで「うしろの え」が ない ときの「すこし くらく」は、まえは まいかい ctx.filter で えがいて いた。
      // filter は 1 まい ごとに べつの 板で ラスタを はしらせる ので、人数ぶん おもく なる(27 にんで 1 frame 約 700 ms)。
      // くらく した え・かげつきの え を 画像ごとに 1 回だけ 作って つかいまわす(くらさは brightness(0.9) と おなじ)。
      // 作れない とき(canvas が ない など)は もとの えがきかた(filter)に もどる
      const newCanvas = typeof o.makeCanvas === 'function' ? o.makeCanvas : (w, h) => {
        if (typeof document === 'undefined' || !document.createElement) return null;
        const c = document.createElement('canvas'); if (!c) return null;
        c.width = w; c.height = h; return c;
      };
      const SPRITE_CACHE_MAX = 160, SHADOW_PAD = 0.1;   // SHADOW_PAD: かげの ぶん、え の したに たす たかさ(え の 大きさ に たいして)
      const spriteCache = new Map(); let spriteCacheOff = false, shadowBlob;
      const spriteStats = { built: 0, hits: 0, fails: 0, bytes: 0, full: 0, medium: 0, light: 0 };
      const lodMemo = new WeakMap();   // なかま ごとの いまの LOD(さかいで ぱたぱた しない ため)。セーブ しない
      function bakedSprite(im, dark, shadow) {
        if (spriteCacheOff || !im) return null;
        const key = im.src + (dark ? '|d' : '|n') + (shadow ? 's' : '');
        let c = spriteCache.get(key);
        if (c) { spriteStats.hits++; return c; }
        try {
          const S = im.naturalWidth || im.width || 128, pad = shadow ? Math.ceil(S * SHADOW_PAD) : 0;
          c = newCanvas(S, S + pad);
          const g = c && c.getContext && c.getContext('2d');
          if (!g) throw new Error('no canvas');
          g.drawImage(im, 0, 0, S, S);
          // すける ところは そのまま、え の ある ところだけ 0.9 ばい(= brightness(0.9))
          if (dark) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(0,0,0,0.1)'; g.fillRect(0, 0, S, S); }
          // かげは え の うしろ(あしもと)。いまの かげと おなじ いろ・おおきさ
          if (shadow) { g.globalCompositeOperation = 'destination-over'; g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(S / 2, S, S * 0.32, S * 0.09, 0, 0, TAU); g.fill(); }
          g.globalCompositeOperation = 'source-over';
          if (spriteCache.size >= SPRITE_CACHE_MAX) { spriteCache.clear(); spriteStats.bytes = 0; }
          spriteCache.set(key, c); spriteStats.built++; spriteStats.bytes += S * (S + pad) * 4;
          return c;
        } catch (_) { spriteCacheOff = true; spriteStats.fails++; spriteCache.clear(); spriteStats.bytes = 0; return null; }
      }
      // medium の かげ: 1 まいの ちいさな え(ellipse + fill の かわりに drawImage 1 回)
      function shadowImg() {
        if (shadowBlob === undefined) {
          shadowBlob = null;
          try { const c = newCanvas(64, 18), g = c && c.getContext && c.getContext('2d'); if (g) { g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(32, 9, 32, 9, 0, 0, TAU); g.fill(); shadowBlob = c; spriteStats.bytes += 64 * 18 * 4; } } catch (_) { shadowBlob = null; }
        }
        return shadowBlob;
      }
      function drawSprite(a, p, size, alpha, yaw, lod) {
        const px = size * p.s; if (px < 3) return;
        const facing = facingOf(a.heading, yaw); const sprite = spriteFor(a, facing);
        // とおい ひとは かんたんに(シルエット)。そんざいは わかる
        if (px < 22) { ctx.globalAlpha = alpha != null ? alpha * 0.9 : 0.9; ctx.fillStyle = KIND_COLOR[a.kind] || KIND_COLOR.form; const bob = MOVING.has(a.behavior) ? Math.abs(Math.sin(a.bob * 4)) * px * 0.1 : 0; ctx.beginPath(); ctx.ellipse(p.sx, p.sy - px * 0.45 - bob, px * 0.28, px * 0.45, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; return; }
        const im = imageFor(sprite.asset);
        const dark = facing === 'back' && !(a.sprites && a.sprites.back);
        // しせい: あるく(おくへ は ゆれ ひかえめ、てまえへ は つよめ)、すわる、ねる、はなす(あいてへ かたむく)
        const toward = facing === 'back' ? 0.7 : facing === 'front' ? 1.3 : 1;
        let lift = a.behavior === 'swim' || a.behavior === 'sway' ? Math.sin(a.bob) * px * 0.06 : MOVING.has(a.behavior) ? Math.abs(Math.sin(a.bob * 4)) * px * 0.08 * toward : 0;
        let sxScale = 1, syScale = 1, rot = 0;
        if (facing === 'back' && !(a.sprites && a.sprites.back)) { syScale = 0.94; }
        if (MOVING.has(a.behavior) && (facing === 'left' || facing === 'right')) rot = (facing === 'left' ? -1 : 1) * 0.07;
        if (a.behavior === 'sit') { syScale = 0.9; sxScale = 1.04; }
        if (a.behavior === 'rest') { syScale = 0.92; rot = a.face * 0.08; }
        if (a.behavior === 'sleep') { rot = a.face * 0.28; syScale = 0.9; }
        if (a.behavior === 'talk' || a.behavior === 'gather') rot = a.face * 0.07;
        if (a.behavior === 'look' || a.behavior === 'watch') rot = (facing === 'left' ? -1 : facing === 'right' ? 1 : 0) * 0.05;
        const y = p.sy - lift;
        // light: かげと からだを 1 まいの え で 1 回(かたむき・しるしは えがかない。いろ・かたち・はんてん・ゆれは おなじ)
        if (lod === 'light' && im) {
          const b = bakedSprite(im, dark, true);
          if (b) {
            const S = b.width, w = px * sxScale, hh = px * syScale, ga = ctx.globalAlpha;
            ctx.globalAlpha = (alpha != null ? alpha : 1) * (a.behavior === 'sleep' ? 0.85 : 1);
            if (sprite.flip) { ctx.save(); ctx.translate(p.sx, 0); ctx.scale(-1, 1); ctx.drawImage(b, -w / 2, y - hh, w, hh * b.height / S); ctx.restore(); }
            else ctx.drawImage(b, p.sx - w / 2, y - hh, w, hh * b.height / S);
            ctx.globalAlpha = ga;
            return;
          }
        }
        ctx.save();
        if (alpha != null) ctx.globalAlpha = alpha;
        const blob = lod === 'medium' ? shadowImg() : null;
        if (blob) ctx.drawImage(blob, p.sx - px * 0.32, p.sy - px * 0.09, px * 0.64, px * 0.18);
        else { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(p.sx, p.sy, px * 0.32, px * 0.09, 0, 0, TAU); ctx.fill(); }
        if (a.behavior === 'sleep') ctx.globalAlpha *= 0.85;
        ctx.translate(p.sx, y); ctx.rotate(rot); ctx.scale((sprite.flip ? -1 : 1) * sxScale, syScale);
        const b = dark && im ? bakedSprite(im, true, false) : null;
        if (dark && im && !b) ctx.filter = 'brightness(0.9)';   // したくが できない ときだけ もとの えがきかた
        if (b) ctx.drawImage(b, -px / 2, -px, px, px);
        else if (im) ctx.drawImage(im, -px / 2, -px, px, px);
        else drawGlyph(a.emoji || '❓', 0, 0, px * 0.9);
        ctx.restore();
        const mark = a.behavior === 'sleep' ? '💤' : a.behavior === 'talk' ? '💬' : a.behavior === 'fish' ? '🎣' : a.behavior === 'play' || a.behavior === 'chase' ? '✨' : a.behavior === 'watch' ? '👀' : a.behavior === 'shop' ? '🛍️' : null;
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

      // ================= 地域の こせい を えがく =================
      // ここから したの 3つは「せかい」の データ(world.terrain / world.details / prop.struct)を
      // よんで えがくだけ。絵文字では なく canvas の ずけい な ので、おなじ ものが ならんでも
      // おおきさ・いろ・むきが かわり、キャラの え とも ぜったいに まざらない
      let curLight = 1, curTint = '#ffffff', curAmt = 0, curNow = 0, curEnv = { time: 'day', weather: 'sunny', season: 'spring' };
      // 空気遠近: とおくの 造形物は はんとうめいに するのでは なく(かさなると ガラスの 板に 見える)、
      // いろを きりの いろ(curFogRgb)へ curFog の ぶんだけ よせる。おなじ いろは キャッシュ
      let curFog = 0, curFogRgb = [140, 150, 160];
      const shCache = new Map();
      const sh = (hex) => {
        const qf = Math.round(curFog * 20);
        const key = hex + '|' + Math.round(curLight * 40) + '|' + curTint + '|' + Math.round(curAmt * 20) + '|' + qf + (qf ? '|' + curFogRgb[0] + ',' + curFogRgb[1] + ',' + curFogRgb[2] : '');
        let v = shCache.get(key); if (v) return v;
        const c = hexToRgb(hex), t = hexToRgb(curTint || '#ffffff'), f = qf / 20;
        const g = (i) => Math.round(clamp(lerp(clamp(lerp(c[i], t[i], curAmt) * curLight, 0, 255), curFogRgb[i], f), 0, 255));
        v = `rgb(${g(0)},${g(1)},${g(2)})`;
        if (shCache.size > 6000) shCache.clear();
        shCache.set(key, v); return v;
      };
      const isNight = () => curEnv.time === 'night';
      // ---- おおきな ちけい(うみ・かわ・かいこう) ----
      function drawTerrain(world, tl) {
        const t = world.terrain; if (!t) return;
        const quad = (ax, az, bx, bz, cx2, cz2, dx2, dz2) => fillWorldPoly([[ax, az], [bx, bz], [cx2, cz2], [dx2, dz2]]);
        if (t.kind === 'coast') {
          const sd = t.side, pts = t.pts;
          const deep = sh(isNight() ? '#16325a' : curEnv.time === 'evening' ? '#3f6f9a' : '#2f86c8');
          const shallow = sh(isNight() ? '#2a4d7a' : curEnv.time === 'evening' ? '#7fa8c8' : '#6fc8e0');
          for (let i = 0; i < pts.length - 1; i++) {
            const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
            ctx.fillStyle = shallow; quad(ax, az, bx, bz, bx + sd * 380, bz, ax + sd * 380, az);
            ctx.fillStyle = deep; quad(ax + sd * 360, az, bx + sd * 360, bz, bx + sd * 9000, bz, ax + sd * 9000, az);
          }
          // みずぎわに そった 帯(濡れ砂 など): りくがわに、はばを ゆらして 1ぽんで つづく
          for (const [bk, bw] of world.shore || []) {
            const st = AREA_STYLE[bk]; if (!st) continue; ctx.fillStyle = sh(st[0]); ctx.globalAlpha = st[1];
            for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; const w0 = bw * (0.75 + 0.35 * Math.sin(az * 0.006 + 1)), w1 = bw * (0.75 + 0.35 * Math.sin(bz * 0.006 + 1)); quad(ax, az, bx, bz, bx - sd * w1, bz, ax - sd * w0, az); }
            ctx.globalAlpha = 1;
          }
          // なみうちぎわ: しろい なみが よせては かえす
          ctx.fillStyle = 'rgba(255,255,255,.65)';
          for (let i = 0; i < pts.length - 1; i++) {
            const [ax, az] = pts[i], [bx, bz] = pts[i + 1], steps = 2;
            for (let k = 0; k < steps; k++) {
              const t0 = k / steps, t1 = (k + 1) / steps, z0 = az + (bz - az) * t0, z1 = az + (bz - az) * t1;
              const x0 = ax + (bx - ax) * t0, x1 = ax + (bx - ax) * t1;
              const off = sd * (20 + Math.sin(curNow * 0.0013 + z0 * 0.004) * 16);
              quad(x0 + off, z0, x1 + off, z1, x1 + off + sd * 14, z1, x0 + off + sd * 14, z0);
            }
          }
          // ゆうがた/よる は みずめんに ひかりの みち
          if (curEnv.time === 'evening' || isNight()) {
            ctx.fillStyle = isNight() ? 'rgba(200,220,255,.20)' : 'rgba(255,190,120,.32)';
            for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; const w = 50 + Math.abs(Math.sin(az * 0.01 + curNow * 0.0008)) * 50; quad(ax + sd * 620, az, bx + sd * 620, bz, bx + sd * (620 + w), bz, ax + sd * (620 + w), az); }
          }
          ctx.globalAlpha = 1;
        } else if (t.kind === 'river' || t.kind === 'chasm') {
          const river = t.kind === 'river';
          if (river) { // みずぎわの あかるい ふち(かわらの ぬれた いし)
            ctx.fillStyle = sh(isNight() ? '#4a6a8a' : '#a8c8d8'); ctx.globalAlpha = 0.55;
            for (let i = 0; i < t.pts.length - 1; i++) { const [ax, az] = t.pts[i], [bx, bz] = t.pts[i + 1]; const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L, hw = t.half + 44; quad(ax + nx * hw, az + nz * hw, bx + nx * hw, bz + nz * hw, bx - nx * hw, bz - nz * hw, ax - nx * hw, az - nz * hw); }
            ctx.globalAlpha = 1;
          }
          ctx.fillStyle = river ? sh(isNight() ? '#2a4a72' : '#5aa8d8') : sh('#0b1a30');
          for (let i = 0; i < t.pts.length - 1; i++) {
            const [ax, az] = t.pts[i], [bx, bz] = t.pts[i + 1];
            const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L;
            quad(ax + nx * t.half, az + nz * t.half, bx + nx * t.half, bz + nz * t.half, bx - nx * t.half, bz - nz * t.half, ax - nx * t.half, az - nz * t.half);
          }
          if (river) { // ながれの すじ
            ctx.fillStyle = 'rgba(255,255,255,.35)';
            for (let i = 0; i < t.pts.length - 1; i++) { const [ax, az] = t.pts[i], [bx, bz] = t.pts[i + 1]; for (let k = 0; k < 3; k++) { const o = (k - 1) * t.half * 0.5, ph = ((curNow * 0.06 + k * 90) % 260); const z0 = az + (bz - az) * (ph / 260); quad(ax + o, z0, ax + o, z0 + 70, ax + o + 10, z0 + 70, ax + o + 10, z0); } }
          } else { // かいこう: ふちが ぼんやり ひかる
            ctx.fillStyle = 'rgba(90,216,232,.18)';
            for (let i = 0; i < t.pts.length - 1; i++) { const [ax, az] = t.pts[i], [bx, bz] = t.pts[i + 1]; for (const sgn of [-1, 1]) quad(ax + sgn * t.half, az, bx + sgn * t.half, bz, bx + sgn * (t.half + 46), bz, ax + sgn * (t.half + 46), az); }
          }
          ctx.globalAlpha = 1;
        }
      }
      // ---- じめんの おおきな くぎり(その 地域で あるいている ばしょ そのもの) ----
      // style: flat=ぬるだけ / rows=うねの すじ / water=みずめん / stripes=しろい しま /
      //        speckle=つぶつぶ / hole=そこが ぬけている
      const AREA_STYLE = {
        lawn: ['#7fc25f', 0.42, 'flat'], terrace: ['#d9c9a8', 0.6, 'tile'], flowerbed: ['#8a6a4a', 0.55, 'speckle'],
        road: ['#3e4350', 0.85, 'road'], sidewalk: ['#9aa0ab', 0.6, 'tile'], crossing: ['#f2f4f8', 0.75, 'stripes'], block: ['#2f3442', 0.5, 'flat'],
        paddy: ['#86bda6', 0.5, 'water'], cropfield: ['#8aa83f', 0.6, 'rows'], meadow: ['#9ecf6a', 0.4, 'flat'],
        undergrowth: ['#2f6a34', 0.45, 'speckle'], mossbed: ['#4f9a4a', 0.4, 'flat'],
        scree: ['#8a8878', 0.5, 'speckle'], ridge: ['#a8a291', 0.4, 'flat'],
        snowfield: ['#ffffff', 0.5, 'flat'], frozen: ['#cfe4f4', 0.5, 'water'], snowwood: ['#eef5fc', 0.32, 'speckle'],
        wetsand: ['#c8b184', 0.45, 'flat'], dunefield: ['#f0d9a4', 0.45, 'rows'], seagrass: ['#b8b884', 0.2, 'speckle'],
        seabed: ['#35628f', 0.4, 'flat'], fissure: ['#081426', 0.75, 'flat'], reefflat: ['#4a5f96', 0.4, 'speckle'],
        gravelbar: ['#a8998a', 0.5, 'speckle'], wetgrass: ['#7fb85f', 0.4, 'flat'], shallow: ['#7fc0dc', 0.55, 'water'],
        mudflat: ['#6a5638', 0.5, 'flat'], rootmat: ['#4a3a24', 0.45, 'speckle'],
        sandflat: ['#f0d9a0', 0.4, 'rows'], rockflat: ['#b06a48', 0.4, 'flat'],
        stonedeck: ['#6f6a98', 0.6, 'tile'], voidgap: [null, 1, 'hole'],
        wetstone: ['#5f6486', 0.55, 'tile'], oldroad: ['#8b90b0', 0.5, 'tile'],
      };
      const areaJit = new WeakMap(); // くぎり ごとの りんかくの ゆらぎ(きめうち)
      function drawAreas(world, tl) {
        const list = world.areas; if (!list || !list.length) return;
        const skyBottom = (SKY_OVERRIDE[world.regionId] || tl.sky)[1];
        for (let ai = 0; ai < list.length; ai++) { const a = list[ai];
          const st = AREA_STYLE[a.kind]; if (!st) continue;
          const c = toCam(a.x, a.z); if (c.cz > farCull + a.h || c.cz < -a.h - 900) continue;
          const ca = Math.cos(a.ang), sa = Math.sin(a.ang), hw2 = a.w / 2, hh = a.h / 2;
          const corner = (u, v) => [a.x + u * hw2 * ca + v * hh * sa, a.z - u * hw2 * sa + v * hh * ca];
          const [col, alpha, style] = st;
          const manmade = style === 'road' || style === 'tile' || style === 'stripes';
          // ひとの つくった もの(車道・敷石・横断歩道)は 4かく。しぜんの くぎり(苔・砂・雪・水)は
          // ふぞろいな まるみ に して、かたい ふちの「板」に 見えない ように する
          let quad;
          if (manmade) quad = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
          else { let jit = areaJit.get(a); if (!jit) { jit = []; for (let k = 0; k < 10; k++) jit.push(0.82 + 0.3 * hrand(a.kind + ':' + ai + ':' + k)); areaJit.set(a, jit); } quad = []; for (let k = 0; k < 10; k++) { const ang = k / 10 * TAU; quad.push(corner(Math.cos(ang) * jit[k] * 1.1, Math.sin(ang) * jit[k] * 1.1)); } }
          // とおくは すけさせず、いろを きりへ よせる
          curFog = clamp((c.cz - 300) / (farCull * 1.1), 0, 0.7);
          const fade = 1;
          if (style === 'hole') { ctx.fillStyle = shade(skyBottom, 0.5, '#000000', 0.35); fillWorldPoly(quad); ctx.globalAlpha = 0.5; ctx.fillStyle = 'rgba(200,180,255,.5)'; fillWorldPoly([corner(-1, -1), corner(1, -1), corner(1, -0.86), corner(-1, -0.86)]); ctx.globalAlpha = 1; curFog = 0; continue; }
          if (style === 'water') { ctx.fillStyle = sh('#e8f4f8'); ctx.globalAlpha = alpha * 0.55; fillWorldPoly(quad.map(([qx, qz]) => [a.x + (qx - a.x) * 1.12, a.z + (qz - a.z) * 1.12])); } // みずぎわの あかるい ふち
          ctx.fillStyle = sh(col); ctx.globalAlpha = alpha; fillWorldPoly(quad);
          if (style === 'rows' || style === 'road' || style === 'tile') {
            ctx.globalAlpha = fade * alpha * (style === 'road' ? 0.5 : 0.45);
            ctx.fillStyle = style === 'road' ? '#e8e4d0' : style === 'tile' ? 'rgba(255,255,255,.55)' : sh('#6a8a2f');
            const rows = style === 'road' ? 5 : 6;
            for (let i = 1; i < rows; i++) { const v = -1 + (i / rows) * 2, thin = style === 'road' ? 0.012 : 0.03; fillWorldPoly([corner(-0.96, v - thin), corner(0.96, v - thin), corner(0.96, v + thin), corner(-0.96, v + thin)]); }
          } else if (style === 'stripes') {
            ctx.globalAlpha = fade * alpha; ctx.fillStyle = '#f4f7fb';
            for (let i = 0; i < 5; i++) { const u = -0.86 + i * 0.43; fillWorldPoly([corner(u - 0.12, -0.92), corner(u + 0.12, -0.92), corner(u + 0.12, 0.92), corner(u - 0.12, 0.92)]); }
          } else if (style === 'water') {
            ctx.globalAlpha = fade * 0.35; ctx.fillStyle = 'rgba(255,255,255,.9)';
            for (let i = 0; i < 3; i++) { const v = -0.6 + i * 0.6 + Math.sin(curNow * 0.0009 + a.x * 0.01 + i) * 0.06; fillWorldPoly([corner(-0.8, v - 0.035), corner(0.8, v - 0.035), corner(0.8, v + 0.035), corner(-0.8, v + 0.035)]); }
          } else if (style === 'speckle') {
            ctx.globalAlpha = fade * alpha * 0.6; ctx.fillStyle = sh(col);
            for (let i = 0; i < 5; i++) { const u = ((i * 37) % 17) / 17 * 1.3 - 0.65, v = ((i * 53) % 13) / 13 * 1.3 - 0.65; fillWorldPoly([corner(u - 0.2, v - 0.1), corner(u, v - 0.18), corner(u + 0.2, v - 0.1), corner(u + 0.16, v + 0.14), corner(u - 0.16, v + 0.14)]); }
          }
          ctx.globalAlpha = 1; curFog = 0;
        }
        ctx.globalAlpha = 1;
      }
      // ---- じめんの もよう(そう ごとに かたちが ちがう。おおきな くうはくを つくらない) ----
      const detailBuf = [];
      function drawDetails(world, player) {
        const cull = Math.min(2600, farCull);
        // カメラの すこし さきを ちゅうしんに、みえる ぶんだけ もようを つくる
        const ahead = Math.min(700, cam.dist + 260);
        const list = sampleGroundDetails(world, cam.x + Math.sin(cam.yaw) * ahead * 0.5, cam.z + Math.cos(cam.yaw) * ahead * 0.5, Math.min(1500, cull * 0.62), detailBuf);
        if (!list.length) return;
        const lim = tier >= 2 ? 110 : tier === 1 ? 180 : 280; let n = 0;
        for (const d of list) {
          if (n >= lim) break;
          const p = project(d.x, d.z); if (!p || p.dz > cull || p.sy > H + 6 || p.sx < -30 || p.sx > W + 30) continue;
          const px = d.size * p.s; if (px < 1.4) continue;
          n++;
          const fade = clamp(1.25 - p.dz / cull, 0.12, 1);
          ctx.globalAlpha = fade; ctx.fillStyle = d.color;
          const k = d.kind;
          if (k === 'tuft' || k === 'under') { ctx.fillRect(p.sx - px * 0.5, p.sy - px * 0.7, px * 0.22, px * 0.7); ctx.fillRect(p.sx, p.sy - px * 0.95, px * 0.22, px * 0.95); ctx.fillRect(p.sx + px * 0.42, p.sy - px * 0.6, px * 0.22, px * 0.6); }
          else if (k === 'petal' || k === 'shell' || k === 'straw' || k === 'gravel' || k === 'pebble') { ctx.beginPath(); ctx.ellipse(p.sx, p.sy, px * 0.5, px * 0.3, d.rot, 0, TAU); ctx.fill(); }
          else if (k === 'leaf') { ctx.beginPath(); ctx.ellipse(p.sx, p.sy, px * 0.55, px * 0.22, d.rot, 0, TAU); ctx.fill(); }
          else if (k === 'sparkle' || k === 'glow') { const tw = 0.45 + 0.55 * Math.sin(d.phase + curNow * 0.003); ctx.globalAlpha = fade * (0.4 + tw * 0.6); if (k === 'glow') { ctx.beginPath(); ctx.arc(p.sx, p.sy, px * 0.9, 0, TAU); ctx.globalAlpha = fade * 0.14 * tw; ctx.fill(); ctx.globalAlpha = fade * (0.5 + tw * 0.5); } ctx.fillRect(p.sx - px * 0.2, p.sy - px * 0.2, px * 0.4, px * 0.4); }
          else if (k === 'step' || k === 'moss' || k === 'mud' || k === 'sand' || k === 'wet' || k === 'drift' || k === 'oldtile' || k === 'glowedge' || k === 'puddle') {
            if (k === 'puddle' && curEnv.weather !== 'rain') { ctx.globalAlpha = 1; continue; }
            ctx.globalAlpha = fade * (k === 'drift' ? 0.17 : k === 'puddle' ? 0.4 : k === 'wet' ? 0.2 : 0.3);
            ctx.beginPath(); ctx.ellipse(p.sx, p.sy, px * 0.6, px * (k === 'drift' ? 0.13 : 0.2), 0, 0, TAU); ctx.fill();
            if (k === 'puddle' && isNight()) { ctx.fillStyle = 'rgba(120,220,255,.5)'; ctx.fillRect(p.sx - px * 0.2, p.sy - px * 0.08, px * 0.4, px * 0.06); }
            if (k === 'glowedge') { ctx.globalAlpha = fade * 0.3; ctx.beginPath(); ctx.ellipse(p.sx, p.sy, px * 0.9, px * 0.3, 0, 0, TAU); ctx.fill(); }
          }
          else if (k === 'ice' || k === 'rockface') { ctx.globalAlpha = fade * (k === 'ice' ? 0.22 : 0.45); ctx.beginPath(); ctx.moveTo(p.sx - px * 0.5, p.sy); ctx.lineTo(p.sx - px * 0.18, p.sy - px * 0.28); ctx.lineTo(p.sx + px * 0.34, p.sy - px * 0.16); ctx.lineTo(p.sx + px * 0.52, p.sy); ctx.closePath(); ctx.fill(); }
          else if (k === 'ripple' || k === 'furrow' || k === 'root' || k === 'crack' || k === 'tile') { ctx.globalAlpha = fade * (k === 'crack' ? 0.6 : 0.34); ctx.strokeStyle = d.color; ctx.lineWidth = Math.max(1, px * (k === 'root' ? 0.09 : 0.045)); ctx.beginPath(); const a = k === 'tile' ? 0 : d.rot * 0.3; ctx.moveTo(p.sx - px * 0.5, p.sy); ctx.quadraticCurveTo(p.sx, p.sy - px * (k === 'ripple' ? 0.12 : 0.06) + a * 6, p.sx + px * 0.5, p.sy); ctx.stroke(); }
          else if (k === 'footprint') { ctx.globalAlpha = fade * 0.5; for (const o of [-0.3, 0.3]) { ctx.beginPath(); ctx.ellipse(p.sx + px * o, p.sy + px * o * 0.3, px * 0.2, px * 0.12, 0, 0, TAU); ctx.fill(); } }
          else if (k === 'leafpile') { ctx.globalAlpha = fade * 0.7; for (let j = 0; j < 5; j++) { const a = d.rot + j * 1.3, r = px * (0.14 + (j % 3) * 0.09); ctx.beginPath(); ctx.ellipse(p.sx + Math.cos(a) * r, p.sy + Math.sin(a) * r * 0.35, px * 0.15, px * 0.065, a, 0, TAU); ctx.fill(); } }
          else if (k === 'damp') { ctx.globalAlpha = fade * 0.16; ctx.beginPath(); ctx.ellipse(p.sx, p.sy, px * 0.6, px * 0.2, 0, 0, TAU); ctx.fill(); }
          else if (k === 'manhole') { ctx.globalAlpha = fade * 0.7; ctx.beginPath(); ctx.ellipse(p.sx, p.sy, px * 0.5, px * 0.2, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.stroke(); }
          else { ctx.beginPath(); ctx.ellipse(p.sx, p.sy, px * 0.4, px * 0.2, 0, 0, TAU); ctx.fill(); }
          ctx.globalAlpha = 1;
        }
        ctx.globalAlpha = 1;
      }
      // ---- 地域 こゆうの ぞうけいぶつ(canvas の ずけい。絵文字では ない) ----
      const NEON = ['#ff4fa3', '#39e6ff', '#b46bff', '#ffd23f', '#4affa0'];
      // おおきな ものほど「かたち」を ゆうせんする(細部より シルエット)。
      // 木 = ねっこ + みき + えだ、ビル = ほんたい + いりぐち + まどの おび + ひさし、
      // がけ = ふぞろいな りんかく + そう、すなおか = ゆるい きょくせん + かさなり…。
      // たんじゅんな 長方形・三角形を そのまま かんせいけいに しない
      // とおくの ちいさな 造形物の いろ(シルエット 1つで えがく)。ない ものは やくわりの いろ
      const TINY_COLOR = { dune: '#e0c48a', duneridge: '#e0c48a', dunewall: '#e0c48a', sandcrest: '#e8d2a0', snowbank: '#eef3fa', snowdrift: '#f4f8fd', reefwall: '#24466a', kelpwall: '#2f6a50', kelp: '#2f7a5a', mesa: '#a8623f', hedge: '#3f7a3a', mistwood: '#7fa8dc', bluetree: '#7fa8dc', cliffwall: '#7d7768', seacliff: '#b89a70', searock: '#5f5a50', cliff: '#6f6a58', bigrock: '#7a7a70', arch: '#a8845c', islandedge: '#4a4470', pinewall: '#2f6a3a', palmgrove: '#3f9a4a', cropline: '#6aa83f', crystal: '#9fe8ff', crystalgarden: '#9fe8ff' };
      const ROLE_COLOR = { vegetation: '#3f7a3a', building: '#6a7183', terrain: '#8a8474', water: '#6fb7e8', light: '#ffe9a8', obstacle: '#8a8a80', road: '#9aa0ab' };
      function drawStructure(kind, p, size, o) {
        const px = size * p.s; if (px < 5) return;
        const x = p.sx, y = p.sy, night = isNight(), seed = Math.abs((o.x * 7 + o.z * 13) | 0);
        if (px < 26) { // とおく: シルエットだけ(せんの かずを へらして かるく)
          const role = STRUCT_ROLE[kind] || 'obstacle'; if (role === 'obstacle' && px < 12) return;
          ctx.fillStyle = sh(TINY_COLOR[kind] || ROLE_COLOR[role]);
          if (role === 'building') ctx.fillRect(x - px * 0.3, y - px * (kind === 'building' || kind === 'alleywall' ? 1.6 : 0.7), px * 0.6, px * (kind === 'building' || kind === 'alleywall' ? 1.6 : 0.7));
          else if (role === 'light') { ctx.beginPath(); ctx.arc(x, y - px * 0.6, Math.max(1, px * 0.1), 0, TAU); ctx.fill(); }
          else if (role === 'vegetation' && (kind === 'bigtrunk' || kind === 'pinewall' || kind === 'kelpwall')) ctx.fillRect(x - px * 0.12, y - px * 1.2, px * 0.24, px * 1.2);
          else { ctx.beginPath(); ctx.ellipse(x, y - px * 0.25, px * 0.5, px * 0.3, 0, 0, TAU); ctx.fill(); }
          return;
        }
        const R = (k) => { const v = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); }; // きめうちの らんすう(0..1)
        const rect = (c, dx, dy, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + px * dx, y + px * dy, px * w, px * h); };
        const tri = (c, pts) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x + px * pts[0], y + px * pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(x + px * pts[i], y + px * pts[i + 1]); ctx.closePath(); ctx.fill(); };
        const oval = (c, dx, dy, rx, ry, rot) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x + px * dx, y + px * dy, px * rx, px * ry, rot || 0, 0, TAU); ctx.fill(); };
        const glow = (c, dx, dy, r, a) => { ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + px * dx, y + px * dy, Math.min(px * r, H * 0.09), 0, TAU); ctx.fill(); ctx.globalAlpha = 1; };
        const lines = (c, w, pts) => { ctx.strokeStyle = c; ctx.lineWidth = Math.max(1, px * w); ctx.beginPath(); for (let i = 0; i < pts.length; i += 4) { ctx.moveTo(x + px * pts[i], y + px * pts[i + 1]); ctx.lineTo(x + px * pts[i + 2], y + px * pts[i + 3]); } ctx.stroke(); };
        // とじた なめらかな かたち(てんの あいだを 曲線で つなぐ)。a = とうめいど
        const smooth = (c, pts, a) => { ctx.fillStyle = c; if (a != null) ctx.globalAlpha = a; ctx.beginPath(); const n = pts.length / 2; const P = (i) => { const j = ((i % n) + n) % n; return [x + px * pts[j * 2], y + px * pts[j * 2 + 1]]; };
          const p0 = P(0), p1 = P(1); ctx.moveTo((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);
          for (let i = 1; i <= n; i++) { const q = P(i), r2 = P(i + 1); ctx.quadraticCurveTo(q[0], q[1], (q[0] + r2[0]) / 2, (q[1] + r2[1]) / 2); }
          ctx.closePath(); ctx.fill(); if (a != null) ctx.globalAlpha = 1; };
        const sd = o.side < 0 ? -1 : 1;
        const autumn = curEnv.season === 'autumn';
        // 木の こずえ(3〜5つの まるみ + くらい したがわ + あかるい てっぺん)
        const crown = (cx, cy, r, base, dark, lite) => { ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = Math.max(1, px * 0.012); const lobe = (c, dx, dy, rx, ry) => { oval(c, dx, dy, rx, ry); ctx.stroke(); }; lobe(dark, cx, cy + r * 0.25, r * 1.05, r * 0.7); lobe(base, cx - r * 0.55, cy + r * 0.05, r * 0.62, r * 0.55); lobe(base, cx + r * 0.55, cy + r * 0.02, r * 0.6, r * 0.52); lobe(base, cx, cy - r * 0.25, r * 0.7, r * 0.62); if (r * px > 40) for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + 0.4, rr = r * 0.95; lobe(k % 2 ? dark : base, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.7, r * 0.2, r * 0.15); } oval(lite, cx - r * 0.15, cy - r * 0.45, r * 0.34, r * 0.24); };
        // ひろばの き / かわの き / こうえんの き(きせつで いろが かわる)
        const leafyTree = (h, r, trunk) => { const c0 = autumn ? '#c8843a' : '#4f9a45', c1 = autumn ? '#7a4a1e' : '#2d5c2a', c2 = autumn ? '#f0b060' : '#8fc56a';
          oval('rgba(0,0,0,.16)', 0, 0, r * 0.9, r * 0.2); tri(sh(trunk || '#5a4530'), [-0.07, 0, -0.045, -h, 0.045, -h, 0.07, 0]); crown(0, -h - r * 0.55, r, sh(c0), sh(c1), sh(c2)); };
        // 針葉樹(だんだんに かさねた 三角。ゆきぐには しろい ふち)
        const conifer = (dx, h, w, snowy) => { const c0 = sh(snowy ? '#2f5a40' : '#2f6a3a'), c1 = sh(snowy ? '#223f30' : '#234f2c'); rect(sh('#4a3a26'), dx - w * 0.08, -h * 0.18, w * 0.16, h * 0.18);
          for (let k = 0; k < 3; k++) { const ty = -h * (0.2 + k * 0.27), tw = w * (1 - k * 0.24), th = h * 0.42; tri(k % 2 ? c1 : c0, [dx - tw, ty, dx, ty - th, dx + tw, ty]); tri('rgba(0,0,0,.18)', [dx, ty, dx, ty - th, dx + tw, ty]); if (snowy) tri('rgba(255,255,255,.75)', [dx - tw * 0.5, ty - th * 0.5, dx, ty - th, dx + tw * 0.5, ty - th * 0.5]); } };
        // ヤシ(まがった みき + 5まいの は)
        const palm = (dx, h, lean) => { ctx.strokeStyle = sh('#8a6a3a'); ctx.lineWidth = Math.max(2, px * 0.05); ctx.beginPath(); ctx.moveTo(x + px * dx, y); ctx.quadraticCurveTo(x + px * (dx + lean * 0.5), y - px * h * 0.6, x + px * (dx + lean), y - px * h); ctx.stroke();
          ctx.fillStyle = sh('#3f9a4a'); for (let f = 0; f < 5; f++) { const a = -Math.PI * 0.95 + f * (Math.PI * 0.9 / 4); ctx.beginPath(); ctx.ellipse(x + px * (dx + lean) + Math.cos(a) * px * 0.2, y - px * h + Math.sin(a) * px * 0.07 + px * 0.02, px * 0.23, px * 0.055, a * 0.6, 0, TAU); ctx.fill(); } oval(sh('#2f6a34'), dx + lean, -h + 0.02, 0.05, 0.035); };
        // すなおか(ゆるい きょくせん が 2つ かさなり、かぜしもは くらく、いただきに ひかり、すそは じめんへ とける)
        const duneShape = (wl, wr, h, tone) => { const c0 = sh(tone[0]), c1 = tone[1];
          if (px > 60) smooth(c0, [-wl * 1.15, 0.02, -wl * 0.75, -h * 0.35, -wl * 0.2, -h * 0.95, wr * 0.15, -h, wr * 0.55, -h * 0.55, wr * 1.05, 0.02], 0.55); // すそ(とける)
          smooth(c0, [-wl, 0, -wl * 0.7, -h * 0.4, -wl * 0.15, -h * 0.98, wr * 0.12, -h, wr * 0.5, -h * 0.6, wr, 0]);
          smooth(c1, [wr * 0.1, -h * 0.98, wr * 0.5, -h * 0.6, wr, 0, wr * 0.25, 0, wr * 0.05, -h * 0.5], 0.28); // かぜしもの かげ
          ctx.strokeStyle = 'rgba(255,250,225,.5)'; ctx.lineWidth = Math.max(1, px * 0.012); ctx.beginPath(); ctx.moveTo(x - px * wl * 0.7, y - px * h * 0.4); ctx.quadraticCurveTo(x - px * wl * 0.15, y - px * h * 0.98, x + px * wr * 0.12, y - px * h); ctx.stroke();
          if (px > 90) { ctx.strokeStyle = 'rgba(150,110,60,.18)'; for (let k = 0; k < 3; k++) { const t = 0.3 + k * 0.22; ctx.beginPath(); ctx.moveTo(x - px * wl * (0.9 - t * 0.5), y - px * h * t * 0.55); ctx.quadraticCurveTo(x - px * wl * 0.2, y - px * h * (t * 0.75 + 0.1), x + px * wr * (0.15 + t * 0.4), y - px * h * (t * 0.6)); ctx.stroke(); } } };
        // がけ・岩壁(ふぞろいな りんかく + よこの そう + すその がれ)
        const cliffFace = (w, h, cols) => { const pts = [sd * w * 1.35, 0, sd * w * 1.25, -h * 0.35, sd * w * 1.05, -h * 0.72, sd * w * 0.7, -h * 0.92, sd * w * 0.3, -h, -sd * w * 0.05, -h * 0.86, -sd * w * 0.25, -h * 0.5, -sd * w * 0.35, 0];
          for (let i = 2; i < pts.length - 2; i += 2) { pts[i] += sd * w * (R(i) - 0.5) * 0.16; pts[i + 1] += h * (R(i + 1) - 0.5) * 0.06; }
          tri(sh(cols[seed % cols.length]), pts);
          ctx.strokeStyle = 'rgba(0,0,0,.16)'; ctx.lineWidth = Math.max(1, px * 0.012); for (let k = 1; k < 4; k++) { const t = k / 4; ctx.beginPath(); ctx.moveTo(x + sd * px * w * (1.3 - t * 0.2), y - px * h * (t * 0.7)); ctx.quadraticCurveTo(x + sd * px * w * 0.5, y - px * h * (t * 0.75 + 0.05), x - sd * px * w * (0.3 - t * 0.1), y - px * h * (t * 0.6 - 0.05)); ctx.stroke(); }
          tri('rgba(255,255,255,.13)', [sd * w * 0.3, -h, -sd * w * 0.05, -h * 0.86, sd * w * 0.35, -h * 0.55, sd * w * 0.7, -h * 0.92]);
          tri('rgba(0,0,0,.22)', [sd * w * 1.35, 0, sd * w * 1.25, -h * 0.35, sd * w * 0.85, -h * 0.3, sd * w * 0.9, 0]);
          tri('rgba(0,0,0,.12)', [sd * w * 1.05, -h * 0.72, sd * w * 0.7, -h * 0.92, sd * w * 0.62, -h * 0.4, sd * w * 0.9, -h * 0.1, sd * w * 1.2, -h * 0.35]); // かげの めん
          ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = Math.max(1, px * 0.01); ctx.beginPath(); ctx.moveTo(x + sd * px * w * 0.55, y - px * h * 0.95); ctx.lineTo(x + sd * px * w * 0.5, y - px * h * 0.7); ctx.lineTo(x + sd * px * w * 0.62, y - px * h * 0.5); ctx.moveTo(x - sd * px * w * 0.1, y - px * h * 0.8); ctx.lineTo(x - sd * px * w * 0.02, y - px * h * 0.55); ctx.stroke(); // われめ
          for (let k = 0; k < 3; k++) oval(sh('#6f6a58'), sd * w * (0.2 + k * 0.4) + (R(k + 9) - 0.5) * 0.2, -0.03, 0.12 + R(k + 3) * 0.08, 0.05); };
        switch (kind) {
          // --- おうち ---
          case 'fence': lines(sh('#a98a5a'), 0.05, [-0.34, 0, -0.34, -0.5, 0, 0, 0, -0.56, 0.34, 0, 0.34, -0.5, -0.44, -0.22, 0.44, -0.22, -0.44, -0.42, 0.44, -0.42]); break;
          case 'planter': rect(sh('#b5764a'), -0.22, -0.3, 0.44, 0.3); oval(sh('#4f9a4a'), 0, -0.34, 0.26, 0.14); oval(sh('#ff9ec4'), -0.12, -0.4, 0.07, 0.06); oval(sh('#ffd76a'), 0.12, -0.42, 0.06, 0.05); break;
          case 'lantern': rect(sh('#6a5a4a'), -0.03, -0.6, 0.06, 0.6); rect(sh('#d8c088'), -0.14, -0.86, 0.28, 0.26); if (night || curEnv.time === 'evening') glow('#ffd88a', 0, -0.73, 0.5, 0.3); rect('rgba(255,225,150,.95)', -0.1, -0.82, 0.2, 0.18); break;
          case 'house': case 'farmhouse': { const farm = kind === 'farmhouse'; const wall = sh(farm ? '#e8dcc0' : '#f4e6d2'), roof = sh(farm ? '#8a5a3a' : '#d05a4a');
            oval('rgba(0,0,0,.16)', 0, 0, 0.6, 0.12);
            rect(wall, -0.5, -0.62, 1, 0.62); rect('rgba(0,0,0,.14)', sd * 0.32, -0.62, sd * 0.18, 0.62); // よこの めん
            tri(roof, [-0.58, -0.6, 0, -1.02, 0.58, -0.6]); tri('rgba(0,0,0,.18)', [0, -1.02, 0.58, -0.6, 0.2, -0.6]);
            rect(sh('#6a4a3a'), 0.22, -0.98, 0.1, 0.22); // えんとつ
            rect(sh('#5a3f2a'), -0.12, -0.36, 0.24, 0.36); rect(sh('#8a6a4a'), -0.09, -0.33, 0.18, 0.33); // とびら
            rect(night ? 'rgba(255,225,150,.95)' : sh('#9fc8e8'), -0.42, -0.5, 0.18, 0.16); rect(night ? 'rgba(255,225,150,.95)' : sh('#9fc8e8'), 0.24, -0.5, 0.18, 0.16); lines(sh('#ffffff'), 0.012, [-0.33, -0.5, -0.33, -0.34, 0.33, -0.5, 0.33, -0.34]);
            if (night) glow('#ffd8a0', 0, -0.4, 0.8, 0.14);
            if (!farm) { lines(sh('#a98a5a'), 0.03, [-0.7, 0, -0.7, -0.2, -0.85, 0, -0.85, -0.22, -0.9, -0.12, -0.55, -0.12]); oval(sh('#4f9a4a'), 0.7, -0.08, 0.16, 0.08); oval(sh('#ff9ec4'), 0.66, -0.14, 0.05, 0.04); }
            else { for (let k = 0; k < 3; k++) oval(sh('#e0c070'), -0.75 + k * 0.05, -0.1 - k * 0.02, 0.14, 0.12); }
            break; }
          // --- とかい(ネオンの はんかがい) ---
          case 'neonsign': { const c1 = NEON[seed % NEON.length], c2 = NEON[(seed + 2) % NEON.length];
            rect(sh('#2b2f3c'), -0.05, -0.95, 0.1, 0.95);
            const bw = 0.34, bx = o.side < 0 ? -0.05 - bw : 0.05;
            rect(sh('#1b1f2c'), bx, -0.92, bw, 0.62);
            const lit = night ? 1 : curEnv.time === 'evening' ? 0.8 : 0.42;
            ctx.globalAlpha = lit; rect(c1, bx + 0.04, -0.86, bw - 0.08, 0.1); rect(c2, bx + 0.04, -0.68, bw - 0.08, 0.08); rect(c1, bx + 0.04, -0.52, bw - 0.14, 0.07); ctx.globalAlpha = 1;
            if (night) { glow(c1, bx + bw / 2, -0.72, 0.62, 0.20); }
            break; }
          case 'shopfront': { rect(sh('#333a4a'), -0.5, -1.1, 1, 1.1);
            const lit = night ? 0.95 : 0.5; ctx.globalAlpha = lit;
            for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const on = ((seed + r * 5 + c * 3) % 4) !== 0; if (!on) continue; ctx.fillStyle = night ? (r + c) % 3 === 0 ? NEON[(seed + r) % NEON.length] : '#ffe9b0' : '#cfe0f0'; ctx.fillRect(x + px * (-0.4 + c * 0.22), y + px * (-1.02 + r * 0.2), px * 0.14, px * 0.12); }
            ctx.globalAlpha = 1;
            rect(sh(night ? '#ff8ac0' : '#d86a9a'), -0.46, -0.3, 0.92, 0.07); // ひさし
            rect('rgba(255,235,180,.9)', -0.2, -0.24, 0.4, 0.24); // みせの あかり
            if (night) glow('#ffd8a0', 0, -0.14, 0.7, 0.18);
            break; }
          case 'streetlight': rect(sh('#4a4f5c'), -0.025, -1, 0.05, 1); rect(sh('#4a4f5c'), -0.025, -1.02, 0.2, 0.04); oval(night ? '#fff3c0' : sh('#b8c0cc'), 0.16, -0.99, 0.07, 0.05); if (night) { glow('#ffe3a0', 0.16, -0.97, 0.34, 0.5); glow('#ffdd90', 0.16, -0.97, 0.7, 0.10); tri('rgba(255,235,160,.09)', [0.16, -0.95, 0.56, 0.02, -0.24, 0.02]); } break;
          case 'vending': { rect(sh('#d24a4a'), -0.22, -0.6, 0.44, 0.6); ctx.globalAlpha = night ? 1 : 0.7; rect('#9fe8ff', -0.17, -0.55, 0.24, 0.36); ctx.globalAlpha = 1; for (let r = 0; r < 3; r++) rect('rgba(255,255,255,.7)', -0.15, -0.5 + r * 0.11, 0.2, 0.05); rect(sh('#333'), 0.09, -0.5, 0.1, 0.3); if (night) glow('#9fe8ff', -0.05, -0.38, 0.55, 0.18); break; }
          case 'guardrail': lines(sh('#b8bec8'), 0.05, [-0.5, -0.14, 0.5, -0.14, -0.5, -0.3, 0.5, -0.3, -0.4, 0, -0.4, -0.32, 0.4, 0, 0.4, -0.32]); break;
          case 'crosswalk': { ctx.fillStyle = 'rgba(245,247,250,.8)'; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(x + px * k * 0.17, y, px * 0.06, px * 0.03, 0, 0, TAU); ctx.fill(); } break; }
          // --- いなか ---
          case 'hayroll': { ctx.save(); ctx.translate(x, y); ctx.rotate((o.ang || 0) * 0.3); ctx.translate(-x, -y); oval(sh('#e0c070'), 0, -0.3, 0.32, 0.3); ctx.strokeStyle = sh('#b89a4a'); ctx.lineWidth = Math.max(1, px * 0.02); ctx.beginPath(); ctx.ellipse(x, y - px * 0.3, px * 0.18, px * 0.28, 0, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(x, y - px * 0.3, px * 0.08, px * 0.14, 0, 0, TAU); ctx.stroke(); ctx.restore(); break; }
          case 'barn': rect(sh('#a8503f'), -0.4, -0.66, 0.8, 0.66); rect('rgba(0,0,0,.14)', sd * 0.26, -0.66, sd * 0.14, 0.66); tri(sh('#8a3f34'), [-0.48, -0.66, 0, -1, 0.48, -0.66]); rect(sh('#e8dcc0'), -0.12, -0.44, 0.24, 0.44); lines('rgba(255,255,255,.5)', 0.02, [-0.36, -0.6, 0.36, -0.6, -0.36, -0.3, 0.36, -0.3]); break;
          case 'crop': { ctx.fillStyle = sh('#6aa83f'); for (let k = -2; k <= 2; k++) { const bx = x + px * k * 0.2; ctx.fillRect(bx - px * 0.03, y - px * 0.26, px * 0.06, px * 0.26); ctx.beginPath(); ctx.ellipse(bx, y - px * 0.28, px * 0.08, px * 0.06, 0, 0, TAU); ctx.fill(); } break; }
          case 'cropline': { // はたけの うね(おくへ ならぶ 3れつ)
            rect(sh('#a08a5a'), -0.9, -0.05, 1.8, 0.06); const g = sh('#6aa83f'), g2 = sh('#4f8a2f');
            for (let r = 0; r < 3; r++) { const rz = -0.06 - r * 0.16, sc = 1 - r * 0.22; rect(sh('#8a7040'), -0.9 * sc, rz - 0.02, 1.8 * sc, 0.03); for (let k = -4; k <= 4; k++) oval(k % 2 ? g : g2, k * 0.2 * sc, rz - 0.06 * sc, 0.09 * sc, 0.07 * sc); }
            break; }
          // --- もり ---
          case 'stump': oval(sh('#6b4a2a'), 0, -0.24, 0.26, 0.1); rect(sh('#5a3f24'), -0.26, -0.24, 0.52, 0.24); oval(sh('#c8a070'), 0, -0.25, 0.22, 0.08); ctx.strokeStyle = sh('#8a6a3a'); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y - px * 0.25, px * 0.12, px * 0.045, 0, 0, TAU); ctx.stroke(); tri(sh('#5a3f24'), [-0.3, 0, -0.26, -0.1, -0.2, 0, -0.42, 0.02]); break;
          case 'log': { const a = (o.ang || 0) * 0.55; ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.translate(-x, -y);
            oval('rgba(0,0,0,.14)', 0, 0.02, 0.52, 0.09); oval(sh('#54381f'), 0, -0.1, 0.5, 0.11); rect('rgba(255,255,255,.08)', -0.45, -0.19, 0.9, 0.04);
            oval(sh('#6d4b2c'), -0.46, -0.1, 0.075, 0.1); oval(sh('#c8a070'), -0.46, -0.1, 0.045, 0.065); oval(sh('#3f7a3a'), 0.1, -0.19, 0.18, 0.05); oval(sh('#3f7a3a'), 0.3, -0.16, 0.08, 0.035);
            ctx.restore(); break; }
          case 'fern': { ctx.strokeStyle = sh('#3f8a4a'); ctx.lineWidth = Math.max(1, px * 0.035); for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + px * k * 0.12, y - px * 0.4, x + px * k * 0.26, y - px * 0.52); ctx.stroke(); } break; }
          // アーチ。1 つの かたちを material(o.variant)で ぬりわける: 'rock'(いわ・既定)/ 'bone'(ほね)。
          // 人の たてた 門に 見えないよう、はしらは ふぞろいで、うえは まるく つながる。
          // どちらも「ひだり の はしら・みぎ の はしら・うえ の つながり・あいだ の あな」が
          // 小さな 画面でも 見える かたち。けしき は いつも カメラを むく 板 なので、
          // yaw が かわっても アーチの まま 見える
          case 'arch': {
            const j = (k, a) => (R(k) - 0.5) * a;                     // ふぞろい(いつも おなじ)
            oval('rgba(0,0,0,.16)', 0, 0.01, 0.6, 0.1);               // あしもと の かげ
            ctx.save();
            if (o.variant === 'bone') {
              // ほね: ろっこつ の ような 2 本 が うえで あわさる。かわいた しろ 〜 おうど。
              // こわく ならないよう、ふとく まるく、ちいさな ふくらみ で おわる
              const ivory = sh('#efe6cf'), shade = sh('#b8a27a'), knob = sh('#e4d8b8');   // shade は すな より こく(かたち が たつ)
              ctx.lineCap = 'round';
              const pair = (dx, sc, a) => {
                ctx.globalAlpha = a;
                const rib = (x0, xt, yt, bend) => { ctx.beginPath(); ctx.moveTo(x + px * (dx + x0 * sc), y);
                  ctx.quadraticCurveTo(x + px * (dx + (x0 + bend) * sc), y - px * yt * sc * 0.72, x + px * (dx + xt * sc), y - px * yt * sc); ctx.stroke(); };
                const both = () => { rib(-0.46, 0.05, 0.96, -0.12); rib(0.47 + j(5, 0.05), -0.05, 0.9 + j(6, 0.08), 0.13); };
                ctx.strokeStyle = shade; ctx.lineWidth = Math.max(2, px * 0.12 * sc); both();
                ctx.strokeStyle = ivory; ctx.lineWidth = Math.max(1.5, px * 0.085 * sc); both();
                ctx.strokeStyle = 'rgba(255,255,255,.38)'; ctx.lineWidth = Math.max(1, px * 0.024 * sc); both();
                oval(knob, dx - 0.46 * sc, -0.02 * sc, 0.075 * sc, 0.05 * sc);
                oval(knob, dx + 0.47 * sc, -0.02 * sc, 0.075 * sc, 0.05 * sc);
                oval(ivory, dx, -0.93 * sc, 0.07 * sc, 0.055 * sc);     // うえで あわさる ところ
              };
              pair(sd * 0.15, 0.72, 0.5);                               // おくの ひと組(ふかさ)
              pair(0, 1, 1);
              ctx.globalAlpha = 1;
              oval(sh('#e0c48a'), -0.46, 0.005, 0.15, 0.04);            // すなに うまった ねもと
              oval(sh('#e0c48a'), 0.47, 0.005, 0.15, 0.04);
            } else {
              // いわ: なみ と かぜ に けずられた 岩。左の 岩かたまり は ふとく たかく、右の あし は ほそく ひくい。
              // うえの はし は うすく すこし たれ、あな は まんなか から ずれた ふぞろいな かたち。
              // 人の たてた 門 に 見えない ことが いちばん だいじ(なめらかな 半円 に しない)
              const f = sd;                                              // ひだり みぎ を ひっくりかえす
              const J = (arr, a) => arr.map((v, i) => v + (i % 2 ? (R(i + 20) - 0.5) * a * 0.6 : (R(i + 40) - 0.5) * a) * (i % 2 ? 1 : f));
              const outerP = J([-0.64, 0.02, -0.7, -0.28, -0.63, -0.6, -0.52, -0.86, -0.3, -1.02, -0.06, -1.0, 0.16, -0.9, 0.36, -0.84, 0.5, -0.66, 0.53, -0.4, 0.49, -0.16, 0.55, 0.02], 0.06);
              const holeP = J([-0.26, 0.03, -0.3, -0.26, -0.24, -0.54, -0.08, -0.69, 0.1, -0.66, 0.26, -0.5, 0.32, -0.24, 0.3, 0.03], 0.05);
              for (let i = 0; i < outerP.length; i += 2) outerP[i] *= f;
              for (let i = 0; i < holeP.length; i += 2) holeP[i] *= f;
              const sub = (pts) => { const n = pts.length / 2, P = (k) => { const q = ((k % n) + n) % n; return [x + px * pts[q * 2], y + px * pts[q * 2 + 1]]; };
                const a0 = P(0), a1 = P(1); ctx.moveTo((a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2);
                for (let k = 1; k <= n; k++) { const q = P(k), r2 = P(k + 1); ctx.quadraticCurveTo(q[0], q[1], (q[0] + r2[0]) / 2, (q[1] + r2[1]) / 2); }
                ctx.closePath(); };
              const shape = () => { ctx.beginPath(); sub(outerP); sub(holeP); };
              // いろ は うみべ の 砂岩(てまえ の はいいろ の searock とも、あかるい すな とも ちがう)
              shape(); ctx.fillStyle = sh('#a8845c'); ctx.fill('evenodd');
              ctx.save(); shape(); ctx.clip('evenodd');
              rect('rgba(0,0,0,.16)', -0.8, -0.24, 1.6, 0.26);             // ねもと は なみに ぬれて くらい
              oval('rgba(255,255,255,.16)', -0.34 * f, -0.86, 0.26, 0.12); // かぜの あたる うえ の ひかり
              oval('rgba(0,0,0,.12)', 0.42 * f, -0.55, 0.14, 0.4);         // ほそい あし の かげ
              lines('rgba(0,0,0,.14)', 0.012, [-0.66 * f, -0.36, -0.3 * f, -0.4, -0.64 * f, -0.66, -0.26 * f, -0.7, 0.34 * f, -0.3, 0.52 * f, -0.26, -0.2 * f, -0.84, 0.3 * f, -0.78]);
              ctx.restore();
              // ふちに こい りんかく(小さな 画面でも かたち が たつ)
              shape(); ctx.strokeStyle = 'rgba(60,40,24,.45)'; ctx.lineWidth = Math.max(1, px * 0.02); ctx.lineJoin = 'round'; ctx.stroke();
              // うえ の くさ(しぜん の 岩 の しるし。seacliff と おなじ いろ)
              oval(sh('#7fb35a'), -0.2 * f, -1.0, 0.2, 0.045); oval(sh('#7fb35a'), 0.1 * f, -0.93, 0.1, 0.03);
              // うみ では ねもと に しろい なみ(しおかぜ の けはい)
              if (o.region === 'sea') for (let k = 0; k < 4; k++) oval('rgba(255,255,255,.5)', (k - 1.5) * 0.36 + Math.sin(curNow * 0.002 + k) * 0.04, 0.02, 0.15, 0.03);
            }
            ctx.restore(); break; }
          case 'bigrock': { const a = (o.ang || 0) * 0.25; ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.translate(-x, -y);
            oval('rgba(0,0,0,.16)', 0.02, 0.01, 0.46, 0.1); tri(sh('#7a7a70'), [-0.42, 0, -0.36, -0.28, -0.22, -0.4, 0.05, -0.5, 0.28, -0.38, 0.4, -0.2, 0.44, 0]); tri('rgba(255,255,255,.14)', [-0.22, -0.4, 0.05, -0.5, 0.1, -0.3, -0.12, -0.24]); tri('rgba(0,0,0,.2)', [0.28, -0.38, 0.4, -0.2, 0.44, 0, 0.14, 0, 0.12, -0.24]); if (o.mossy !== false && o.region !== 'desert') oval(sh('#4f8a45'), -0.1, -0.44, 0.14, 0.05);
            ctx.restore(); break; }
          case 'mushroomcluster': { const caps = 3 + (seed % 3);
            for (let k = 0; k < caps; k++) { const f = 0.45 + ((seed + k * 7) % 100) / 100 * 0.85, bx = (k - (caps - 1) / 2) * 0.24, by = ((seed + k) % 3) * 0.02;
              rect(sh('#efe3cf'), bx - 0.035 * f, -0.3 * f + by, 0.07 * f, 0.3 * f);
              const glowy = night && (seed + k) % 3 === 0;
              ctx.fillStyle = glowy ? '#9ff0d8' : sh(['#d94b4b', '#c88a4a', '#e8b0c0'][(seed + k) % 3]);
              ctx.beginPath(); ctx.ellipse(x + px * bx, y + px * (-0.3 * f + by), px * 0.14 * f, px * 0.1 * f, 0, Math.PI, TAU); ctx.fill();
              if (glowy) glow('#9ff0d8', bx, -0.3 * f + by, 0.3 * f, 0.22);
              if (!glowy && (seed + k) % 3 === 0) { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(x + px * (bx - 0.04 * f), y + px * (-0.34 * f + by), px * 0.022 * f, 0, TAU); ctx.fill(); } }
            break; }
          case 'mushroomgrove': { // キノコの もりの 主役: おおきな ひかる キノコの むれ
            oval('rgba(0,0,0,.14)', 0, 0.02, 0.7, 0.12);
            for (let k = 0; k < 5; k++) { const f = 0.5 + R(k) * 0.6, bx = (k - 2) * 0.3 + (R(k + 5) - 0.5) * 0.1, lit = night || (seed + k) % 2 === 0;
              rect(sh('#efe3cf'), bx - 0.05 * f, -0.7 * f, 0.1 * f, 0.7 * f); rect('rgba(0,0,0,.1)', bx + 0.01 * f, -0.7 * f, 0.04 * f, 0.7 * f);
              ctx.fillStyle = lit ? (night ? '#9ff0d8' : sh('#8fd8c0')) : sh(['#d94b4b', '#e8b0c0'][k % 2]); ctx.beginPath(); ctx.ellipse(x + px * bx, y - px * 0.7 * f, px * 0.24 * f, px * 0.16 * f, 0, Math.PI, TAU); ctx.fill();
              ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(x + px * (bx - 0.08 * f), y - px * 0.76 * f, px * 0.04 * f, px * 0.03 * f, 0, 0, TAU); ctx.fill();
              if (lit) glow('#9ff0d8', bx, -0.7 * f, 0.5 * f, night ? 0.26 : 0.1); }
            break; }
          // --- やま ---
          case 'cairn': { let yy = 0; for (let k = 0; k < 4; k++) { const w = 0.3 - k * 0.055; oval(sh(k % 2 ? '#8a8d78' : '#6f6a58'), 0, yy - w * 0.4, w, w * 0.4); yy -= w * 0.72; } break; }
          case 'cliff': cliffFace(0.5, 1.05, ['#6f6a58', '#7d7768']); break;
          case 'ropebridge': { ctx.strokeStyle = sh('#8a7a5a'); ctx.lineWidth = Math.max(1, px * 0.015);
            ctx.beginPath(); ctx.moveTo(x - px * 0.5, y - px * 0.3); ctx.quadraticCurveTo(x, y - px * 0.08, x + px * 0.5, y - px * 0.3); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x - px * 0.5, y - px * 0.05); ctx.quadraticCurveTo(x, y + px * 0.14, x + px * 0.5, y - px * 0.05); ctx.stroke();
            ctx.fillStyle = sh('#a98a5a'); for (let k = -4; k <= 4; k++) { const t = k / 8, yy = y + px * (0.14 - 0.22 * t * t * 4) * 0.5; ctx.fillRect(x + px * t * 0.96, yy, px * 0.08, px * 0.02); } break; }
          case 'tent': { const tc = o.region === 'desert' ? ['#e0cfa8', '#c4ab7e'] : ['#4a8a6a', '#3a6a52']; tri(sh(tc[0]), [-0.32, 0, 0, -0.5, 0.32, 0]); tri(sh(tc[1]), [0, -0.5, 0.32, 0, 0.12, 0]); tri('rgba(30,30,30,.55)', [-0.1, 0, 0, -0.3, 0.1, 0]); break; }
          case 'pinewall': { const snowy = o.region === 'snow' || curEnv.season === 'winter'; const n = 2 + (seed % 2); for (let k = 0; k < n; k++) conifer((k - (n - 1) / 2) * 0.42 + (R(k) - 0.5) * 0.1, 0.9 + R(k + 3) * 0.6, 0.26 + R(k + 6) * 0.1, snowy); break; }
          // --- ゆきぐに ---
          case 'igloo': oval(sh('#f2f7fc'), 0, -0.24, 0.42, 0.34); rect(sh('#dbe6f2'), -0.1, -0.2, 0.2, 0.2); oval(sh('#c8d8e8'), 0, -0.2, 0.1, 0.08); ctx.strokeStyle = 'rgba(180,200,220,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y - px * 0.24, px * 0.28, px * 0.24, 0, Math.PI, TAU); ctx.stroke(); break;
          case 'firewood': { for (let k = 0; k < 3; k++) oval(sh('#6b4a2a'), (k - 1) * 0.16, -0.08, 0.1, 0.07); for (let k = 0; k < 2; k++) oval(sh('#8a6a44'), (k - 0.5) * 0.18, -0.2, 0.1, 0.07); oval('rgba(255,255,255,.6)', 0, -0.26, 0.2, 0.05); break; }
          case 'snowfence': lines(sh('#9a8a6a'), 0.04, [-0.4, 0, -0.4, -0.4, -0.13, 0, -0.13, -0.42, 0.14, 0, 0.14, -0.4, 0.4, 0, 0.4, -0.38, -0.46, -0.3, 0.46, -0.3]); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(x - px * 0.46, y - px * 0.34, px * 0.92, px * 0.05); break;
          case 'icepillar': ctx.globalAlpha = 0.8; tri(sh('#bcd8ec'), [-0.18, 0, -0.14, -0.4, -0.06, -0.72, 0.06, -0.85, 0.12, -0.5, 0.18, 0]); tri('rgba(255,255,255,.55)', [-0.06, -0.72, 0.06, -0.85, 0.03, -0.4, -0.05, -0.3]); tri('rgba(60,100,140,.25)', [0.06, -0.85, 0.12, -0.5, 0.18, 0, 0.06, 0]); ctx.globalAlpha = 1; break;
          // --- うみ ---
          case 'parasol': rect(sh('#c8b088'), -0.02, -0.5, 0.04, 0.5); ctx.fillStyle = sh('#e85a5a'); ctx.beginPath(); ctx.ellipse(x, y - px * 0.5, px * 0.34, px * 0.16, 0, Math.PI, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.8)'; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x, y - px * 0.5); ctx.lineTo(x + px * k * 0.18, y - px * 0.56); ctx.lineTo(x + px * (k * 0.18 + 0.07), y - px * 0.54); ctx.closePath(); ctx.fill(); } break;
          case 'pier': { ctx.fillStyle = sh('#a98a5a'); for (let k = 0; k < 7; k++) ctx.fillRect(x + px * (-0.5 + k * 0.145), y - px * 0.06, px * 0.12, px * 0.05); ctx.fillStyle = sh('#7a6440'); for (let k = 0; k < 4; k++) ctx.fillRect(x + px * (-0.42 + k * 0.28), y - px * 0.04, px * 0.035, px * 0.16); break; }
          case 'driftwood': { ctx.save(); ctx.translate(x, y); ctx.rotate((o.ang || 0) * 0.5); ctx.translate(-x, -y); oval(sh('#c8bca0'), 0, -0.07, 0.42, 0.08); oval(sh('#b0a487'), 0.3, -0.12, 0.14, 0.05); oval(sh('#a89a7a'), -0.38, -0.05, 0.06, 0.06); ctx.restore(); break; }
          case 'rockpool': oval(sh('#8a8474'), 0, 0, 0.44, 0.18); oval(sh(isNight() ? '#2a4d7a' : '#6fc8e0'), 0, -0.01, 0.3, 0.11); oval('rgba(255,255,255,.45)', -0.06, -0.03, 0.1, 0.03); for (let k = 0; k < 4; k++) oval(sh('#6f6a58'), Math.cos(k * 1.6 + 0.4) * 0.38, Math.sin(k * 1.6 + 0.4) * 0.14, 0.07 + R(k) * 0.04, 0.045); break;
          case 'shellpile': { const cs = ['#fff0e0', '#f8d8c8', '#ffe8d0']; for (let k = 0; k < 4; k++) { const bx = (k - 1.5) * 0.18 + (R(k) - 0.5) * 0.06, by = -0.02 - R(k + 4) * 0.04, r = 0.09 + R(k + 8) * 0.05; ctx.fillStyle = sh(cs[k % 3]); ctx.beginPath(); ctx.ellipse(x + px * bx, y + px * by, px * r, px * r * 0.65, 0, Math.PI, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(180,120,100,.35)'; ctx.lineWidth = 1; for (let f = -1; f <= 1; f++) { ctx.beginPath(); ctx.moveTo(x + px * bx, y + px * by); ctx.lineTo(x + px * (bx + f * r * 0.6), y + px * (by - r * 0.55)); ctx.stroke(); } } break; }
          case 'searock': { // いわば: くらい 岩が いくつか かたまり、ねもとに しろい なみ
            for (let k = 0; k < 3; k++) { const bx = (k - 1) * 0.42 + (R(k) - 0.5) * 0.2, h = 0.35 + R(k + 3) * 0.45, w = 0.28 + R(k + 6) * 0.14; tri(sh(k % 2 ? '#5f5a50' : '#6f6a60'), [bx - w, 0, bx - w * 0.8, -h * 0.55, bx - w * 0.3, -h, bx + w * 0.35, -h * 0.8, bx + w * 0.9, -h * 0.3, bx + w, 0]); tri('rgba(255,255,255,.14)', [bx - w * 0.3, -h, bx + w * 0.35, -h * 0.8, bx, -h * 0.5]); }
            ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let k = 0; k < 5; k++) oval('rgba(255,255,255,.5)', (k - 2) * 0.3 + Math.sin(curNow * 0.002 + k) * 0.05, 0.02, 0.16, 0.035);
            break; }
          case 'seacliff': cliffFace(0.55, 1.2, ['#b89a70', '#c8aa7c', '#a8906a']); oval(sh('#7fb35a'), sd * 0.35, -1.18, 0.4, 0.06); oval(sh('#7fb35a'), -sd * 0.05, -1.04, 0.16, 0.04); break;
          case 'palmgrove': { const n = 2 + (seed % 2); for (let k = 0; k < n; k++) palm((k - (n - 1) / 2) * 0.5 + (R(k) - 0.5) * 0.15, 0.8 + R(k + 3) * 0.5, (R(k + 6) - 0.5) * 0.5); break; }
          // --- しんかい ---
          case 'kelp': { ctx.strokeStyle = sh('#2f7a5a'); ctx.lineWidth = Math.max(1.5, px * 0.04); const sway = Math.sin(curNow * 0.0009 + seed) * px * 0.12;
            for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x + px * k * 0.12, y); ctx.quadraticCurveTo(x + px * k * 0.12 + sway, y - px * 0.5, x + px * k * 0.1 + sway * 1.8, y - px * 0.95); ctx.stroke();
              ctx.fillStyle = sh('#3f9a6a'); for (let b = 1; b < 4; b++) { const t = b / 4; ctx.beginPath(); ctx.ellipse(x + px * k * 0.12 + sway * t * 1.4 + px * (b % 2 ? 0.05 : -0.05), y - px * t * 0.95, px * 0.07, px * 0.025, b % 2 ? 0.5 : -0.5, 0, TAU); ctx.fill(); } } break; }
          case 'kelpwall': { const sway = Math.sin(curNow * 0.0008 + seed) * px * 0.1; for (let k = -3; k <= 3; k++) { const h = 1.1 + R(k + 3) * 0.7, bx = k * 0.16 + (R(k + 9) - 0.5) * 0.08; ctx.strokeStyle = sh(k % 2 ? '#1f5a44' : '#2a6a50'); ctx.lineWidth = Math.max(1.5, px * 0.035); ctx.beginPath(); ctx.moveTo(x + px * bx, y); ctx.quadraticCurveTo(x + px * bx + sway, y - px * h * 0.5, x + px * bx + sway * 1.7, y - px * h); ctx.stroke();
              ctx.fillStyle = sh('#2f7a5a'); for (let b = 1; b < 5; b++) { const t = b / 5; ctx.beginPath(); ctx.ellipse(x + px * bx + sway * t * 1.4 + px * (b % 2 ? 0.06 : -0.06), y - px * h * t, px * 0.08, px * 0.03, b % 2 ? 0.5 : -0.5, 0, TAU); ctx.fill(); } }
            break; }
          case 'vent': tri(sh('#2a2f38'), [-0.28, 0, -0.16, -0.5, -0.1, -0.58, 0.1, -0.58, 0.16, -0.5, 0.28, 0]); rect('rgba(0,0,0,.25)', 0.02, -0.5, 0.1, 0.5); glow('#ff8a3a', 0, -0.62, 0.4, 0.34); oval('#ffb070', 0, -0.6, 0.06, 0.03); ctx.fillStyle = 'rgba(220,235,255,.35)'; for (let k = 0; k < 4; k++) { const ph = ((curNow * 0.08 + k * 120) % 480) / 480; ctx.beginPath(); ctx.arc(x + px * Math.sin(k + ph * 3) * 0.1, y - px * (0.6 + ph * 0.9), px * 0.05 * (1 - ph * 0.4), 0, TAU); ctx.fill(); } break;
          case 'wreck': { ctx.save(); ctx.translate(x, y); ctx.rotate(-0.12 * sd); ctx.translate(-x, -y); // かたむいた せんたい
            oval('rgba(0,0,0,.2)', 0, 0.02, 0.55, 0.1);
            tri(sh('#3f4a58'), [-0.55, 0, -0.5, -0.3, -0.2, -0.36, 0.4, -0.4, 0.55, -0.16, 0.5, 0]); tri('rgba(0,0,0,.25)', [-0.55, 0, -0.5, -0.3, -0.36, -0.33, -0.3, 0]);
            lines('rgba(255,255,255,.1)', 0.012, [-0.48, -0.22, 0.5, -0.3, -0.45, -0.12, 0.48, -0.2]); lines('rgba(0,0,0,.25)', 0.014, [-0.2, -0.36, -0.2, -0.05, 0.05, -0.38, 0.05, -0.04, 0.3, -0.4, 0.3, -0.06]); // はら
            rect(sh('#2f3a48'), -0.08, -0.95, 0.05, 0.6); lines(sh('#2f3a48'), 0.014, [-0.3, -0.78, 0.2, -0.86, -0.06, -0.95, 0.2, -0.6]); tri('rgba(200,210,220,.35)', [-0.06, -0.9, 0.16, -0.84, -0.04, -0.66]);
            oval(sh('#2f7a5a'), 0.2, -0.32, 0.12, 0.05); oval('rgba(90,216,232,.9)', -0.32, -0.2, 0.03, 0.03); glow('#5ad8e8', -0.32, -0.2, 0.3, 0.16); glow('#ffd88a', 0.15, -0.26, 0.2, 0.12);
            ctx.restore(); break; }
          case 'ruinpillar': { const pale = o.region === 'jungle' || o.region === 'desert'; o = { ...o, pale }; } rect(sh(o.pale ? '#cdb98a' : '#8a8a80'), -0.12, -0.9, 0.24, 0.9); rect(sh(o.pale ? '#b8a478' : '#75756c'), -0.16, -0.95, 0.32, 0.08); rect(sh(o.pale ? '#b8a478' : '#75756c'), -0.16, -0.06, 0.32, 0.08); tri('rgba(0,0,0,.2)', [0.04, -0.9, 0.12, -0.9, 0.12, -0.5]); lines('rgba(0,0,0,.14)', 0.01, [-0.08, -0.7, -0.05, -0.4, 0.02, -0.3, 0.06, -0.12]); break;
          case 'ruingate': { const c = sh(o.region === 'deepsea' ? '#7a8090' : '#cdb98a'), c2 = sh(o.region === 'deepsea' ? '#5a6070' : '#b8a478');
            rect(c, -0.5, -0.9, 0.2, 0.9); rect(c, 0.3, -0.82, 0.2, 0.82); rect(c2, -0.58, -1.02, 1.0, 0.14); tri(c2, [0.42, -1.02, 0.42, -0.88, 0.2, -0.88]); // くずれた まぐさ
            rect('rgba(0,0,0,.18)', -0.36, -0.9, 0.06, 0.9); rect('rgba(0,0,0,.18)', 0.44, -0.82, 0.06, 0.82); lines('rgba(0,0,0,.14)', 0.01, [-0.45, -0.6, -0.4, -0.3, 0.36, -0.5, 0.42, -0.2]);
            if (o.region === 'jungle') { oval(sh('#3f8a3a'), -0.4, -0.95, 0.14, 0.05); oval(sh('#3f8a3a'), 0.38, -0.5, 0.1, 0.04); } else { oval(sh('#e0c48a'), 0.1, -0.02, 0.5, 0.05); }
            break; }
          case 'ruinwall': { const c = sh(o.region === 'jungle' ? '#a8a080' : '#cdb98a'); // くずれた かべ(ブロックの つみ + かけた かど)
            tri(c, [-0.6, 0, -0.6, -0.7, -0.3, -0.75, -0.1, -0.55, 0.2, -0.62, 0.4, -0.4, 0.6, -0.45, 0.6, 0]);
            lines('rgba(0,0,0,.16)', 0.012, [-0.6, -0.24, 0.6, -0.24, -0.6, -0.48, 0.3, -0.48, -0.3, -0.24, -0.3, -0.48, 0.1, 0, 0.1, -0.24, -0.15, -0.48, -0.15, -0.72]);
            tri('rgba(0,0,0,.2)', [0.4, -0.4, 0.6, -0.45, 0.6, 0, 0.44, 0]);
            if (o.region === 'jungle') { ctx.strokeStyle = sh('#3f8a3a'); ctx.lineWidth = Math.max(1, px * 0.02); ctx.beginPath(); ctx.moveTo(x - px * 0.3, y - px * 0.75); ctx.quadraticCurveTo(x - px * 0.2, y - px * 0.3, x - px * 0.35, y); ctx.stroke(); oval(sh('#4f9a3a'), -0.3, -0.72, 0.12, 0.05); oval(sh('#4f9a3a'), 0.25, -0.6, 0.1, 0.045); }
            else oval(sh('#e0c48a'), -0.2, -0.02, 0.5, 0.05);
            break; }
          case 'statue': rect(sh('#7a7a70'), -0.16, -0.5, 0.32, 0.5); rect(sh('#8a8a80'), -0.14, -0.9, 0.28, 0.42); rect('rgba(0,0,0,.2)', 0.06, -0.9, 0.08, 0.9); lines('rgba(0,0,0,.35)', 0.02, [-0.08, -0.72, -0.02, -0.72, 0.02, -0.72, 0.08, -0.72, -0.04, -0.62, 0.04, -0.62]); oval(sh('#4f8a45'), -0.1, -0.5, 0.08, 0.03); break;
          case 'glowcoral': case 'coralfan': { const c = ['#ff7a9a', '#c78bff', '#6ad8c0', '#ffb066'][seed % 4]; const g = kind === 'glowcoral'; ctx.fillStyle = sh(c); ctx.globalAlpha = 0.55;
            for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.ellipse(x + px * k * 0.13, y - px * 0.2, px * 0.09, px * 0.2, k * 0.4, Math.PI * 1.05, TAU * 0.98); ctx.fill(); } ctx.globalAlpha = 1;
            ctx.strokeStyle = sh(c); ctx.lineWidth = Math.max(1, px * 0.02); for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + px * k * 0.06, y - px * 0.24, x + px * k * 0.1, y - px * 0.42); ctx.stroke(); }
            ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = Math.max(1, px * 0.012); for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + px * k * 0.05, y - px * 0.22, x + px * k * 0.09, y - px * 0.4); ctx.stroke(); }
            if (g) { glow(c, 0, -0.25, 0.4, 0.22 + 0.08 * Math.sin(curNow * 0.002 + seed)); for (let k = 0; k < 3; k++) oval('rgba(255,255,255,.7)', (k - 1) * 0.1, -0.3 - (k % 2) * 0.08, 0.018, 0.018); }
            break; }
          case 'glowgarden': { // ひかる ふかばの 主役: いろちがいの ひかる サンゴが いくつも
            oval('rgba(0,0,0,.14)', 0, 0.02, 0.8, 0.14);
            for (let k = 0; k < 7; k++) { const c = ['#ff7a9a', '#c78bff', '#6ad8c0', '#ffb066', '#9fe8ff'][k % 5], bx = (k - 3) * 0.24 + (R(k) - 0.5) * 0.1, h = 0.3 + R(k + 7) * 0.4; ctx.strokeStyle = sh(c); ctx.lineWidth = Math.max(1.5, px * 0.04); ctx.lineCap = 'round';
              for (let f = -1; f <= 1; f++) { ctx.beginPath(); ctx.moveTo(x + px * bx, y); ctx.quadraticCurveTo(x + px * (bx + f * 0.12), y - px * h * 0.6, x + px * (bx + f * 0.18), y - px * h); ctx.stroke(); } ctx.lineCap = 'butt';
              glow(c, bx, -h * 0.7, 0.36, 0.2 + 0.08 * Math.sin(curNow * 0.0025 + k)); oval('rgba(255,255,255,.8)', bx, -h, 0.025, 0.025); }
            break; }
          case 'glowglade': { // もりの おくの 主役: こけの まるい くぼちと ひかる くさ
            oval('rgba(0,0,0,.12)', 0, 0.02, 0.86, 0.17); oval(sh('#4a6a44'), 0, 0, 0.8, 0.15); oval(sh('#5f8a4f'), 0, -0.02, 0.62, 0.11);
            for (let k = 0; k < 7; k++) { const a = k * TAU / 7 + 0.3; oval(sh(k % 2 ? '#7a8474' : '#6a7464'), Math.cos(a) * 0.74, Math.sin(a) * 0.14, 0.1 + R(k) * 0.04, 0.055); oval(sh('#5f8a4f'), Math.cos(a) * 0.74, Math.sin(a) * 0.14 - 0.03, 0.07, 0.022); }
            tri(sh('#4a3f2e'), [-0.05, -0.04, -0.03, -0.62, 0.03, -0.62, 0.05, -0.04]);
            ctx.strokeStyle = sh('#4a3f2e'); ctx.lineWidth = Math.max(1, px * 0.02);
            for (let k = -1; k <= 1; k += 2) { ctx.beginPath(); ctx.moveTo(x, y - px * 0.5); ctx.quadraticCurveTo(x + px * k * 0.16, y - px * 0.72, x + px * k * 0.3, y - px * 0.66); ctx.stroke(); }
            ctx.strokeStyle = sh('#cfeeb0'); ctx.lineWidth = Math.max(1, px * 0.022); ctx.lineCap = 'round';
            for (let k = 0; k < 9; k++) { const bx = (k - 4) * 0.16 + (R(k) - 0.5) * 0.07, h = 0.14 + R(k + 5) * 0.16, sway = Math.sin(curNow * 0.0012 + k) * 0.03;
              ctx.beginPath(); ctx.moveTo(x + px * bx, y - px * 0.02); ctx.quadraticCurveTo(x + px * (bx + sway), y - px * h * 0.7, x + px * (bx + sway * 2), y - px * h); ctx.stroke(); }
            ctx.lineCap = 'butt'; glow('#bfe8ff', 0, -0.2, 0.7, 0.14 + 0.06 * Math.sin(curNow * 0.0018 + seed));
            for (let k = 0; k < 4; k++) { const a = curNow * 0.0006 + k * 1.6 + seed; oval('rgba(220,255,200,.85)', Math.cos(a) * 0.46, -0.3 + Math.sin(a * 1.3) * 0.16, 0.022, 0.022); }
            break; }
          // --- かわ・みずうみ ---
          case 'reed': { ctx.strokeStyle = sh('#6a9a4a'); ctx.lineWidth = Math.max(1, px * 0.03); const sway = Math.sin(curNow * 0.0016 + seed) * px * 0.05;
            for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x + px * k * 0.08, y); ctx.quadraticCurveTo(x + px * k * 0.1 + sway, y - px * 0.4, x + px * k * 0.11 + sway, y - px * 0.72); ctx.stroke(); }
            ctx.fillStyle = sh('#8a6a3a'); for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.ellipse(x + px * (k * 0.1 + 0.02) + sway, y - px * 0.74, px * 0.028, px * 0.09, 0, 0, TAU); ctx.fill(); } break; }
          case 'woodbridge': { ctx.fillStyle = sh('#a98a5a'); for (let k = -4; k <= 4; k++) { const t = k / 4, yy = y - px * (0.2 - 0.2 * t * t) - px * 0.05; ctx.fillRect(x + px * t * 0.5 - px * 0.05, yy, px * 0.1, px * 0.045); } ctx.strokeStyle = sh('#7a6440'); ctx.lineWidth = Math.max(1, px * 0.015); ctx.beginPath(); ctx.moveTo(x - px * 0.5, y - px * 0.1); ctx.quadraticCurveTo(x, y - px * 0.42, x + px * 0.5, y - px * 0.1); ctx.stroke(); break; }
          case 'riverrock': { ctx.save(); ctx.translate(x, y); ctx.rotate((o.ang || 0) * 0.3); ctx.translate(-x, -y); oval(sh('#8a8474'), 0, -0.08, 0.32, 0.16); oval('rgba(255,255,255,.22)', -0.06, -0.14, 0.12, 0.05); oval('rgba(0,0,0,.14)', 0.1, -0.02, 0.18, 0.05); ctx.restore(); break; }
          case 'waterwheel': { const rot = curNow * 0.0004; rect(sh('#7a6440'), -0.06, -0.5, 0.12, 0.5); ctx.strokeStyle = sh('#a98a5a'); ctx.lineWidth = Math.max(1.5, px * 0.03); ctx.beginPath(); ctx.arc(x, y - px * 0.5, px * 0.38, 0, TAU); ctx.stroke(); for (let k = 0; k < 8; k++) { const a = rot + k * TAU / 8; ctx.beginPath(); ctx.moveTo(x, y - px * 0.5); ctx.lineTo(x + Math.cos(a) * px * 0.38, y - px * 0.5 + Math.sin(a) * px * 0.38); ctx.stroke(); } break; }
          case 'springpool': oval(sh('#8a8474'), 0, 0, 0.42, 0.17); oval(sh(isNight() ? '#2a4d7a' : '#7fc8e8'), 0, -0.01, 0.3, 0.11); oval('rgba(255,255,255,.5)', -0.05, -0.04, 0.12, 0.03); for (let k = 0; k < 5; k++) oval(sh('#6f6a58'), Math.cos(k * 1.3) * 0.36, Math.sin(k * 1.3) * 0.13, 0.06 + R(k) * 0.04, 0.04); ctx.strokeStyle = sh('#6a9a4a'); ctx.lineWidth = Math.max(1, px * 0.02); for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x + px * (0.3 + k * 0.06), y - px * 0.04); ctx.lineTo(x + px * (0.34 + k * 0.06), y - px * 0.3); ctx.stroke(); } break;
          case 'oasispool': { // オアシスの 主役: みず + ヤシ + あし
            oval('rgba(0,0,0,.1)', 0, 0.02, 0.95, 0.2); oval(sh('#c8c890'), 0, 0, 0.92, 0.24); oval(sh(isNight() ? '#2a4d7a' : '#4fb0d8'), 0, -0.01, 0.78, 0.18); oval(sh(isNight() ? '#3a5d8a' : '#7fd0ec'), -0.1, -0.03, 0.5, 0.1); oval('rgba(255,255,255,.4)', -0.2, -0.06, 0.18, 0.03);
            palm(-0.8, 0.8, 0.25); palm(0.75, 0.95, -0.3); palm(0.55, 0.6, 0.15);
            ctx.strokeStyle = sh('#6a9a4a'); ctx.lineWidth = Math.max(1, px * 0.018); for (let k = 0; k < 6; k++) { const bx = -0.6 + k * 0.08; ctx.beginPath(); ctx.moveTo(x + px * bx, y - px * 0.02); ctx.lineTo(x + px * (bx + 0.03), y - px * (0.22 + (k % 3) * 0.05)); ctx.stroke(); }
            break; }
          // --- ジャングル ---
          case 'bigleaf': { const tilt = ((seed % 7) - 3) * 0.12;
            for (let k = 0; k < 3; k++) { const a = -0.9 + k * 0.9 + tilt; ctx.fillStyle = sh(['#2f6a2f', '#3f8a3a', '#276024'][k % 3]); ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * px * 0.3, y - px * 0.45 + Math.sin(a) * px * 0.2, px * 0.34, px * 0.12, a, 0, TAU); ctx.fill(); }
            rect(sh('#3a5a28'), -0.02, -0.5, 0.04, 0.5); break; }
          case 'vine': { ctx.strokeStyle = sh('#3a6a2a'); ctx.lineWidth = Math.max(1, px * 0.022); const sway = Math.sin(curNow * 0.0007 + seed) * px * 0.06;
            ctx.beginPath(); ctx.moveTo(x, y - px * 1.05); ctx.quadraticCurveTo(x + sway, y - px * 0.55, x + sway * 1.4, y - px * 0.1); ctx.stroke();
            ctx.fillStyle = sh('#4f9a3a'); for (let k = 1; k < 5; k++) { const t = k / 5; ctx.beginPath(); ctx.ellipse(x + sway * t * 1.4 + px * (k % 2 ? 0.05 : -0.05), y - px * (1.05 - t * 0.95), px * 0.07, px * 0.03, k % 2 ? 0.4 : -0.4, 0, TAU); ctx.fill(); } break; }
          case 'buttress': { tri(sh('#5a4530'), [-0.5, 0, -0.16, -0.5, 0, -0.9, 0.16, -0.5, 0.5, 0]); tri('rgba(0,0,0,.2)', [0.06, -0.7, 0.16, -0.5, 0.5, 0, 0.2, 0]); oval(sh('#3f7a3a'), -0.3, -0.06, 0.14, 0.05); break; }
          // --- さばく ---
          case 'mesa': { const cs = ['#a8623f', '#b56a44', '#8a4f34', '#c07a50']; // そうに なった 岩山
            tri(sh(cs[0]), [-0.5, 0, -0.46, -0.3, -0.42, -0.52, -0.3, -0.62, 0.3, -0.62, 0.44, -0.5, 0.48, -0.3, 0.5, 0]);
            for (let k = 0; k < 3; k++) { const t = 0.15 + k * 0.15; rect('rgba(0,0,0,' + (0.08 + k * 0.04) + ')', -0.47 + k * 0.01, -t, 0.94 - k * 0.02, 0.05); }
            rect(sh(cs[2]), -0.5, -0.24, 1, 0.24); tri('rgba(255,220,170,.2)', [-0.42, -0.52, -0.3, -0.62, -0.05, -0.62, -0.18, -0.24, -0.46, -0.3]); tri('rgba(0,0,0,.18)', [0.3, -0.62, 0.44, -0.5, 0.5, 0, 0.32, 0, 0.26, -0.3]);
            oval(sh('#d1ad66'), 0, 0, 0.62, 0.06); break; }
          case 'dune': duneShape(0.6 + R(1) * 0.2, 0.55 + R(2) * 0.2, 0.32 + R(3) * 0.1, ['#e0c48a', '#9a6a3a']); break;
          case 'pot': oval(sh('#b8763f'), 0, -0.16, 0.2, 0.2); rect(sh('#9a5f32'), -0.08, -0.36, 0.16, 0.1); oval(sh('#d89a5a'), 0, -0.36, 0.1, 0.04); break;
          case 'obelisk': tri(sh('#c9a86a'), [-0.12, 0, -0.08, -0.82, 0, -1, 0.08, -0.82, 0.12, 0]); ctx.fillStyle = 'rgba(90,60,30,.35)'; for (let k = 1; k < 4; k++) ctx.fillRect(x - px * 0.04, y - px * (0.2 * k), px * 0.08, px * 0.02); break;
          // --- ほしぞら ---
          case 'crystal': { const c = ['#9fe8ff', '#c9b8ff', '#ffd8f0'][seed % 3]; ctx.globalAlpha = 0.85; tri(sh(c), [-0.16, 0, -0.1, -0.6, 0, -0.85, 0.1, -0.6, 0.16, 0]); ctx.globalAlpha = 1; tri('rgba(255,255,255,.45)', [-0.02, -0.82, 0.1, -0.6, 0.04, -0.2]); glow(c, 0, -0.5, 0.55, 0.16 + 0.08 * Math.sin(curNow * 0.002 + seed)); break; }
          case 'crystalgarden': { oval('rgba(0,0,0,.12)', 0, 0.02, 0.8, 0.14); for (let k = 0; k < 5; k++) { const c = ['#9fe8ff', '#c9b8ff', '#ffd8f0'][k % 3], bx = (k - 2) * 0.28 + (R(k) - 0.5) * 0.1, h = 0.5 + R(k + 5) * 0.6, w = 0.12 + R(k + 9) * 0.08, tl = (R(k + 2) - 0.5) * 0.2; ctx.globalAlpha = 0.85; tri(sh(c), [bx - w, 0, bx - w * 0.6 + tl * 0.5, -h * 0.7, bx + tl, -h, bx + w * 0.6 + tl * 0.5, -h * 0.7, bx + w, 0]); ctx.globalAlpha = 1; tri('rgba(255,255,255,.45)', [bx + tl, -h, bx + w * 0.6 + tl * 0.5, -h * 0.7, bx + w * 0.2, -h * 0.25]); glow(c, bx, -h * 0.55, 0.5, 0.14 + 0.08 * Math.sin(curNow * 0.002 + k)); } break; }
          case 'lightbridge': { ctx.globalAlpha = 0.5; ctx.strokeStyle = '#c9e8ff'; ctx.lineWidth = Math.max(2, px * 0.05); ctx.beginPath(); ctx.moveTo(x - px * 0.5, y); ctx.quadraticCurveTo(x, y - px * 0.3, x + px * 0.5, y); ctx.stroke(); ctx.globalAlpha = 0.22; ctx.lineWidth = Math.max(4, px * 0.14); ctx.stroke(); ctx.globalAlpha = 1; break; }
          case 'stoplamp': rect(sh('#4a4a70'), -0.03, -0.8, 0.06, 0.8); oval('#ffd86a', 0, -0.86, 0.11, 0.09); glow('#ffd86a', 0, -0.85, 0.7, 0.2); rect(sh('#5f5f8a'), -0.18, -0.6, 0.36, 0.1); break;
          case 'moonlamp': rect(sh('#4a4a70'), -0.03, -0.9, 0.06, 0.9); ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(x, y - px * 0.98, px * 0.14, 0, TAU); ctx.fill(); ctx.fillStyle = sh('#2b2460'); ctx.beginPath(); ctx.arc(x + px * 0.07, y - px * 1.0, px * 0.11, 0, TAU); ctx.fill(); glow('#ffe9a8', 0, -0.98, 0.7, 0.2); break;
          case 'orrery': rect(sh('#4a4a70'), -0.03, -0.7, 0.06, 0.7); rect(sh('#5f5f8a'), -0.16, -0.06, 0.32, 0.06); { const rot = curNow * 0.0005; ctx.strokeStyle = 'rgba(201,184,255,.8)'; ctx.lineWidth = Math.max(1, px * 0.015); ctx.beginPath(); ctx.ellipse(x, y - px * 0.85, px * 0.3, px * 0.1, rot * 0.3, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(x, y - px * 0.85, px * 0.2, px * 0.28, -rot * 0.5, 0, TAU); ctx.stroke(); oval('#ffd86a', 0, -0.85, 0.08, 0.08); oval('#9fe8ff', Math.cos(rot * 2) * 0.3, -0.85 + Math.sin(rot * 2) * 0.1, 0.03, 0.03); glow('#ffd86a', 0, -0.85, 0.6, 0.18); } break;
          case 'telescope': { oval(sh('#8a8ab0'), 0, -0.2, 0.38, 0.24); rect(sh('#6f6f98'), -0.38, -0.2, 0.76, 0.2); ctx.save(); ctx.translate(x, y - px * 0.3); ctx.rotate(-0.6); ctx.fillStyle = sh('#d8d8f0'); ctx.fillRect(-px * 0.05, -px * 0.36, px * 0.1, px * 0.4); ctx.restore(); glow('#c9e8ff', 0.16, -0.6, 0.3, 0.14); break; }
          // --- きおくのみずうみ ---
          case 'oldpost': rect(sh('#6a6a80'), -0.04, -0.6, 0.08, 0.6); rect(sh('#7a7a94'), -0.2, -0.58, 0.4, 0.12); ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(x - px * 0.16, y - px * 0.54, px * 0.32, px * 0.02); break;
          case 'bluetree': case 'mistwood': { // あおい しだれ木: みき + たれさがる えだ + はの すじ(まるい ふうせんに しない)
            const h = kind === 'mistwood' ? 0.75 : 0.65; oval('rgba(0,0,0,.14)', 0, 0, 0.3, 0.07); tri(sh('#4a5578'), [-0.07, 0, -0.04, -h, 0.04, -h, 0.07, 0]); lines(sh('#4a5578'), 0.025, [0, -h * 0.85, 0.2, -h - 0.12, 0, -h * 0.9, -0.18, -h - 0.1, 0, -h, 0.05, -h - 0.2]);
            oval(sh('#6f96c8'), 0, -h - 0.1, 0.3, 0.12); ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1; ctx.stroke();
            for (let k = -3; k <= 3; k++) { const bx = k * 0.09, top = -h - 0.06 + Math.abs(k) * 0.02, len = 0.35 + R(k + 3) * 0.3; ctx.strokeStyle = sh(k % 2 ? '#7fa8dc' : '#5f86b8'); ctx.lineWidth = Math.max(1.5, px * 0.03); ctx.beginPath(); ctx.moveTo(x + px * bx, y + px * top); ctx.quadraticCurveTo(x + px * (bx * 1.6), y + px * (top + len * 0.5), x + px * (bx * 1.5), y + px * (top + len)); ctx.stroke();
              ctx.fillStyle = sh('#a8c8f0'); for (let b = 1; b < 4; b++) { const t = b / 4; ctx.beginPath(); ctx.ellipse(x + px * (bx * (1 + t * 0.55)) + px * (b % 2 ? 0.03 : -0.03), y + px * (top + len * t), px * 0.035, px * 0.018, 0.5, 0, TAU); ctx.fill(); } }
            glow('#bcd8ff', 0, -h - 0.05, 0.36, 0.08); break; }
          case 'stonestack': { let yy = 0; for (let k = 0; k < 3; k++) { const w = 0.26 - k * 0.06; oval(sh(k % 2 ? '#6f7490' : '#585d78'), 0, yy - w * 0.4, w, w * 0.42); yy -= w * 0.8; } break; }
          // ===== みちを かこむ おおきな もの(frame): じぶんより ずっと おおきい =====
          case 'hedge': { // かどの まるい はこ + うえの ふちの まるみ + した の かげ
            const w = 0.55, h = 0.5; smooth(sh('#356f32'), [-w, 0, -w * 1.02, -h * 0.7, -w * 0.8, -h, w * 0.8, -h, w * 1.02, -h * 0.7, w, 0]);
            smooth(sh('#4f9a45'), [-w * 0.95, -h * 0.25, -w * 0.9, -h * 0.85, -w * 0.5, -h * 1.02, 0, -h * 0.94, w * 0.5, -h * 1.03, w * 0.9, -h * 0.85, w * 0.95, -h * 0.25, 0, -h * 0.2]);
            for (let k = -2; k <= 2; k++) oval(sh('#6fbf5a'), k * 0.2, -h * 0.98 - (k % 2) * 0.03, 0.12, 0.06); rect('rgba(0,0,0,.2)', -w, -h * 0.16, w * 2, h * 0.16);
            if (seed % 3 === 0) { oval(sh('#ff9ec4'), 0.15, -h * 0.7, 0.05, 0.045); oval(sh('#ffd76a'), -0.25, -h * 0.55, 0.045, 0.04); } break; }
          case 'building': case 'alleywall': { const alley = kind === 'alleywall'; const w = 0.34 + R(1) * 0.3, hgt = alley ? 1.5 + R(2) * 1.2 : 1.1 + R(2) * 1.5, bx = o.side < 0 ? -w : 0;
            const tone = night ? ['#2b3040', '#353b4c', '#23283a'][seed % 3] : alley ? ['#5a5f6c', '#666b78', '#4f5462'][seed % 3] : ['#6a7183', '#7b8296', '#5d6476'][seed % 3];
            rect(sh(tone), bx, -hgt, w, hgt);
            const sw = w * 0.16, sx2 = o.side < 0 ? bx + w - sw : bx; rect('rgba(0,0,0,.22)', sx2, -hgt, sw, hgt); // みちがわの めん(はこに 見える)
            rect(sh('#262b38'), bx - 0.02, -hgt - 0.05, w + 0.04, 0.07); // パラペット
            if (R(3) > 0.5) { rect(sh('#3a3f4c'), bx + w * 0.55, -hgt - 0.22, w * 0.18, 0.18); rect(sh('#3a3f4c'), bx + w * 0.62, -hgt - 0.3, w * 0.04, 0.1); } // きゅうすいタンク
            else rect(sh('#3a3f4c'), bx + w * 0.3, -hgt - 0.28, 0.02, 0.24); // アンテナ
            const lit = night ? 0.95 : curEnv.time === 'evening' ? 0.6 : 0.3;
            const rows = Math.min(9, Math.max(3, Math.round(hgt / 0.16))); // まどは「おび」で(1まいずつ ならべない)
            for (let r = 0; r < rows; r++) { const yy = -hgt + 0.1 + r * (hgt - 0.34) / rows; ctx.globalAlpha = lit * 0.9; ctx.fillStyle = night ? ((seed + r) % 5 === 0 ? NEON[(seed + r) % NEON.length] : '#ffe9b0') : '#c4d0e0'; ctx.fillRect(x + px * (bx + 0.04), y + px * yy, px * (w - sw - 0.06), px * 0.055);
              ctx.globalAlpha = 1; if (px > 110) { ctx.fillStyle = 'rgba(0,0,0,.22)'; for (let c = 1; c < 5; c++) ctx.fillRect(x + px * (bx + 0.04 + c * (w - sw - 0.06) / 5), y + px * yy, Math.max(1, px * 0.012), px * 0.055); }
              if (!night && (seed + r) % 4 === 0) { ctx.globalAlpha = 0.5; ctx.fillStyle = '#7b8296'; ctx.fillRect(x + px * (bx + 0.04), y + px * yy, px * (w - sw - 0.06) * 0.4, px * 0.055); ctx.globalAlpha = 1; } }
            if (night && seed % 2 === 0) { ctx.globalAlpha = 0.85; rect(NEON[seed % NEON.length], bx + w * 0.1, -hgt * 0.55, w * 0.08, hgt * 0.3); ctx.globalAlpha = 0.16; rect(NEON[seed % NEON.length], bx, -hgt * 0.6, w, hgt * 0.4); ctx.globalAlpha = 1; }
            // 1かい: いりぐち・ひさし・あかり(ろじうらは ひくい まど と はいかん・かいだん)
            if (!alley) { rect(sh(['#d86a9a', '#39a0c0', '#d8a040'][seed % 3]), bx + 0.02, -0.34, w - sw - 0.04, 0.06); rect(sh('#20242f'), bx + w * 0.2, -0.28, w * 0.34, 0.28); rect(night ? 'rgba(255,230,170,.9)' : sh('#8ea0b8'), bx + w * 0.24, -0.24, w * 0.26, 0.24); rect(sh('#20242f'), bx + w * 0.62, -0.24, w * 0.14, 0.24); if (night) glow('#ffd8a0', bx + w * 0.37, -0.1, 0.5, 0.14); }
            else { rect(sh('#3a3f4c'), bx + w * 0.75, -hgt, 0.03, hgt); lines(sh('#3a3f4c'), 0.014, [bx + w * 0.1, -hgt * 0.4, bx + w * 0.5, -hgt * 0.5, bx + w * 0.1, -hgt * 0.62, bx + w * 0.5, -hgt * 0.72, bx + w * 0.5, -hgt * 0.5, bx + w * 0.5, -hgt * 0.72]); rect(night ? 'rgba(255,230,170,.85)' : sh('#8ea0b8'), bx + w * 0.3, -0.42, w * 0.2, 0.14); rect(sh('#2f3440'), bx + w * 0.05, -0.16, w * 0.14, 0.16); rect(sh('#2f3440'), bx + w * 0.2, -0.12, w * 0.1, 0.12); }
            break; }
          case 'shopblock': { const w = 0.42 + R(1) * 0.24, hgt = 0.62 + R(2) * 0.24, bx = o.side < 0 ? -w : 0, c = ['#d86a9a', '#39a0c0', '#d8a040', '#4fb56a'][seed % 4];
            rect(sh(night ? '#353b4c' : ['#cfc4b0', '#d8cdb8', '#c4b8a4'][seed % 3]), bx, -hgt, w, hgt); rect('rgba(0,0,0,.18)', o.side < 0 ? bx + w - w * 0.14 : bx, -hgt, w * 0.14, hgt);
            rect(sh(c), bx, -hgt - 0.14, w, 0.14); rect('rgba(255,255,255,.7)', bx + w * 0.15, -hgt - 0.11, w * 0.5, 0.08); // かんばん
            const lit = night ? 0.95 : 0.55; ctx.globalAlpha = lit; rect(night ? '#ffe9b0' : '#cfe0f0', bx + 0.05, -hgt + 0.1, w * 0.72, hgt * 0.5); ctx.globalAlpha = 1; // おおきな みせの まど
            for (let k = 0; k < 6; k++) rect(k % 2 ? sh(c) : 'rgba(255,255,255,.9)', bx + 0.02 + k * (w - 0.04) / 6, -hgt * 0.42, (w - 0.04) / 6, 0.07); // しまの ひさし
            rect(sh('#2f3440'), bx + w * 0.4, -hgt * 0.34, w * 0.2, hgt * 0.34); if (night) glow('#ffd8a0', bx + w / 2, -hgt * 0.3, 0.7, 0.16);
            break; }
          case 'parktree': leafyTree(0.5 + R(1) * 0.2, 0.42 + R(2) * 0.14); break;
          case 'woodfence': { ctx.strokeStyle = sh('#a98a5a'); ctx.lineWidth = Math.max(1.5, px * 0.035);
            ctx.beginPath(); for (let k = -3; k <= 3; k++) { ctx.moveTo(x + px * k * 0.16, y); ctx.lineTo(x + px * k * 0.16, y - px * (0.42 + ((seed + k) % 3) * 0.04)); }
            ctx.moveTo(x - px * 0.52, y - px * 0.16); ctx.lineTo(x + px * 0.52, y - px * 0.2); ctx.moveTo(x - px * 0.52, y - px * 0.34); ctx.lineTo(x + px * 0.52, y - px * 0.38); ctx.stroke(); break; }
          case 'bigtrunk': { // ねもと の ひろがり(板根) + ふとい みき + すこし まがる + えだ + じゅひの めいあん
            const jungle = o.region === 'jungle'; const w = 0.12 + R(1) * 0.1, lean = (R(2) - 0.5) * 0.12, hgt = 1.55;
            const bark = sh(jungle ? '#4a3f2a' : '#5a4530'), dark = 'rgba(0,0,0,.2)', lite = 'rgba(255,255,255,.08)';
            oval('rgba(0,0,0,.18)', 0, 0.02, w * 3, 0.07);
            smooth(bark, [-w * 2.8, 0.02, -w * 1.7, -0.1, -w * 1.05, -0.32, w * 1.05, -0.32, w * 1.7, -0.1, w * 2.8, 0.02, w * 1.2, 0.05, -w * 1.2, 0.05]); // ねっこ
            tri(dark, [-w * 2.8, 0.02, -w * 1.7, -0.1, -w * 0.9, 0.03]); tri(dark, [w * 1.1, -0.28, w * 1.7, -0.1, w * 1.4, 0.03, w * 0.8, 0.03]);
            tri(bark, [-w, -0.3, -w * 0.96 + lean * 0.35, -0.85, -w * 0.72 + lean, -hgt, w * 0.72 + lean, -hgt, w * 0.96 + lean * 0.35, -0.85, w, -0.3]);
            tri(dark, [w * 0.25, -0.3, w * 0.3 + lean * 0.35, -0.85, w * 0.25 + lean, -hgt, w * 0.72 + lean, -hgt, w * 0.96 + lean * 0.35, -0.85, w, -0.3]); // かげがわ
            tri(lite, [-w, -0.3, -w * 0.96 + lean * 0.35, -0.85, -w * 0.72 + lean, -hgt, -w * 0.45 + lean, -hgt, -w * 0.6 + lean * 0.35, -0.85, -w * 0.6, -0.3]); // ひかりがわ
            ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = Math.max(1, px * 0.012); for (let k = 0; k < 3; k++) { const bx = -w * 0.5 + k * w * 0.5; ctx.beginPath(); ctx.moveTo(x + px * bx, y - px * 0.35); ctx.quadraticCurveTo(x + px * (bx + lean * 0.4 + (R(k + 4) - 0.5) * w * 0.3), y - px * 0.9, x + px * (bx + lean), y - px * (hgt - 0.05)); ctx.stroke(); } // じゅひ
            if (R(3) > 0.45 && px > 70) { const bh = -(0.9 + R(5) * 0.4), bs = R(6) > 0.5 ? 1 : -1; ctx.strokeStyle = bark; ctx.lineWidth = Math.max(2, px * w * 0.5); ctx.beginPath(); ctx.moveTo(x + px * bs * w * 0.7, y + px * bh); ctx.quadraticCurveTo(x + px * bs * w * 2.2, y + px * (bh - 0.12), x + px * bs * w * 3.6, y + px * (bh - 0.32)); ctx.stroke();
              const lc = sh(autumn && !jungle ? '#c8843a' : jungle ? '#2f7a2f' : '#3f8a3a'); ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = Math.max(1, px * 0.01); oval(sh(autumn && !jungle ? '#7a4a1e' : '#234f2c'), bs * w * 3.3, bh - 0.3, w * 1.3, w * 0.7); oval(lc, bs * w * 3.5, bh - 0.42, w * 1.1, w * 0.6); ctx.stroke(); oval(lc, bs * w * 2.7, bh - 0.32, w * 0.8, w * 0.5); ctx.stroke(); oval(sh(autumn && !jungle ? '#f0b060' : '#5fa04f'), bs * w * 3.3, bh - 0.5, w * 0.6, w * 0.32); }
            oval(sh('#4f9a45'), -w * 1.6, -0.08, w * 0.9, 0.05); if (jungle) oval(sh('#3f8a3a'), w * 0.9, -0.5, w * 0.5, 0.03);
            break; }
          case 'cliffwall': cliffFace(0.5 + R(1) * 0.35, 1.1 + R(2) * 0.9, ['#7d7768', '#6f6a58', '#8a8474']); oval(sh('#6a8a4a'), sd * 0.4, -(1.1 + R(2) * 0.9) * 0.72, 0.12, 0.05); break;
          case 'snowbank': { // ゆきの もりあがり(2つ かさなり、かげがわは あお)
            smooth(sh('#e8eff8'), [-0.9, 0, -0.75, -0.2, -0.35, -0.42, 0.1, -0.5, 0.55, -0.32, 0.95, 0]);
            smooth(sh('#f6f9fd'), [-0.6, 0, -0.5, -0.24, -0.15, -0.44, 0.25, -0.4, 0.6, -0.16, 0.75, 0]);
            smooth('#b8cde6', [0.1, -0.5, 0.55, -0.32, 0.95, 0, 0.4, 0, 0.2, -0.2], 0.4);
            ctx.fillStyle = 'rgba(255,255,255,.9)'; for (let k = 0; k < 4; k++) ctx.fillRect(x + px * (-0.5 + R(k) * 1.1), y - px * (0.1 + R(k + 4) * 0.3), 1.5, 1.5);
            break; }
          case 'duneridge': duneShape(0.95 + R(1) * 0.2, 0.9 + R(2) * 0.2, 0.55 + R(3) * 0.15, ['#e8cf98', '#8a6a3a']); ctx.strokeStyle = sh('#9aa86a'); ctx.lineWidth = Math.max(1, px * 0.012); ctx.beginPath(); for (let k = -2; k <= 2; k++) { const bx = x + px * k * 0.2 - px * 0.2; ctx.moveTo(bx, y - px * 0.46); ctx.lineTo(bx + px * 0.04, y - px * 0.62); } ctx.stroke(); break;
          case 'reefwall': { const hgt = 1 + R(1) * 0.9; // 岩の かべ + サンゴの おうぎ + ひかり
            tri(sh('#24466a'), [sd * 0.7, 0, sd * 0.66, -hgt * 0.4, sd * 0.55, -hgt * 0.78, sd * 0.25, -hgt, -sd * 0.05, -hgt * 0.92, -sd * 0.3, -hgt * 0.55, -sd * 0.4, 0]);
            tri('rgba(255,255,255,.08)', [sd * 0.25, -hgt, -sd * 0.05, -hgt * 0.92, sd * 0.15, -hgt * 0.5]); tri('rgba(0,0,0,.22)', [sd * 0.7, 0, sd * 0.66, -hgt * 0.4, sd * 0.45, -hgt * 0.3, sd * 0.4, 0]);
            ctx.strokeStyle = 'rgba(120,200,230,.35)'; ctx.lineWidth = Math.max(1, px * 0.012); ctx.beginPath(); ctx.moveTo(x + sd * px * 0.25, y - px * hgt); ctx.lineTo(x - sd * px * 0.05, y - px * hgt * 0.92); ctx.lineTo(x - sd * px * 0.3, y - px * hgt * 0.55); ctx.stroke();
            const cs = ['#ff7a9a', '#c78bff', '#6ad8c0', '#ffb066'];
            for (let k = 0; k < 3; k++) { const c = cs[(seed + k) % 4], bx = sd * (0.05 + (k % 2) * 0.3) + (R(k) - 0.5) * 0.1, by = -hgt * (0.12 + k * 0.16), r = 0.035 + R(k + 4) * 0.03; ctx.fillStyle = sh(c); ctx.beginPath(); ctx.ellipse(x + px * bx, y + px * by, px * r, px * r * 1.3, 0, Math.PI, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; for (let f = -1; f <= 1; f++) { ctx.beginPath(); ctx.moveTo(x + px * bx, y + px * by); ctx.lineTo(x + px * (bx + f * r * 0.7), y + px * (by - r * 1.2)); ctx.stroke(); } glow(c, bx, by - r * 0.5, r * 1.6, 0.12); }
            ctx.fillStyle = 'rgba(200,240,255,.5)'; for (let k = 0; k < 3; k++) { const ph = ((curNow * 0.05 + k * 150) % 500) / 500; ctx.beginPath(); ctx.arc(x + px * sd * 0.2 + Math.sin(ph * 6 + k) * px * 0.04, y - px * hgt * ph, px * 0.02, 0, TAU); ctx.fill(); }
            break; }
          case 'riverwood': leafyTree(0.55 + R(1) * 0.15, 0.36 + R(2) * 0.12); break;
          case 'dunewall': duneShape(1.2 + R(1) * 0.3, 1.25 + R(2) * 0.3, 0.85 + R(3) * 0.2, ['#e6c98a', '#96703a']); break;
          case 'islandedge': { // うきしまの ふち: いわの したがわが ぶらさがり、クリスタルが たれる
            ctx.fillStyle = sh('#4a4470'); ctx.beginPath(); ctx.moveTo(x - px * 0.72, y - px * 0.06); ctx.lineTo(x + px * 0.72, y - px * 0.06); for (let k = 5; k >= 0; k--) { const t = k / 5; ctx.lineTo(x + px * (0.72 - t * 1.44), y + px * (0.25 + Math.abs(Math.sin(t * 9 + seed)) * 0.45 * (1 - Math.abs(t - 0.5) * 0.8))); } ctx.closePath(); ctx.fill();
            tri('rgba(0,0,0,.25)', [0.1, -0.06, 0.72, -0.06, 0.4, 0.5]); rect(sh('#6f6a98'), -0.74, -0.14, 1.48, 0.1); rect(sh('#8a84b8'), -0.74, -0.16, 1.48, 0.03);
            for (let k = 0; k < 3; k++) { const bx = -0.4 + k * 0.4 + (R(k) - 0.5) * 0.2; ctx.globalAlpha = 0.8; tri(sh(['#9fe8ff', '#c9b8ff', '#ffd8f0'][k % 3]), [bx - 0.05, 0.1, bx, 0.45 + R(k + 3) * 0.2, bx + 0.05, 0.1]); ctx.globalAlpha = 1; }
            glow('#c9b8ff', 0, 0.12, 0.5, 0.14); break; }
          // ===== てまえを よこぎる もの(fore): おくゆきを だす =====
          case 'fencerail': lines(sh('#a98a5a'), 0.035, [-0.6, -0.2, 0.6, -0.26, -0.6, -0.44, 0.6, -0.5, -0.4, 0, -0.4, -0.5, 0.4, 0, 0.4, -0.56]); break;
          case 'guardpost': rect(sh('#5a5f6c'), -0.05, -0.55, 0.1, 0.55); rect(sh('#d8c14a'), -0.05, -0.4, 0.1, 0.08); rect(sh('#d8c14a'), -0.05, -0.22, 0.1, 0.08); break;
          case 'ricestalk': { ctx.strokeStyle = sh('#c8b04a'); ctx.lineWidth = Math.max(1.5, px * 0.02); const sway = Math.sin(curNow * 0.0015 + seed) * px * 0.03;
            for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(x + px * k * 0.1, y); ctx.quadraticCurveTo(x + px * k * 0.11 + sway, y - px * 0.3, x + px * k * 0.13 + sway * 1.6, y - px * 0.56); ctx.stroke(); }
            ctx.fillStyle = sh('#e0c878'); for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(x + px * (k * 0.12) + sway * 1.6, y - px * 0.58, px * 0.03, px * 0.08, 0.2, 0, TAU); ctx.fill(); } break; }
          case 'branch': { ctx.strokeStyle = sh('#5a4530'); ctx.lineWidth = Math.max(2, px * 0.045);
            ctx.beginPath(); ctx.moveTo(x + sd * px * 0.75, y - px * 0.9); ctx.quadraticCurveTo(x + sd * px * 0.15, y - px * 0.78, x - sd * px * 0.4, y - px * 0.6); ctx.stroke();
            ctx.fillStyle = sh(autumn ? '#c8843a' : '#3f8a3a');
            for (let k = 0; k < 6; k++) { const t = k / 6, bx = x + sd * px * (0.75 - t * 1.15), by = y - px * (0.9 - t * 0.3); ctx.beginPath(); ctx.ellipse(bx, by + px * 0.05, px * 0.11, px * 0.05, k % 2 ? 0.5 : -0.5, 0, TAU); ctx.fill(); } break; }
          case 'ledgerock': tri(sh('#7a7568'), [-0.55, 0, -0.4, -0.3, 0.1, -0.42, 0.45, -0.24, 0.6, 0]); tri('rgba(255,255,255,.12)', [-0.4, -0.3, 0.1, -0.42, -0.1, -0.2]); tri('rgba(0,0,0,.18)', [0.1, -0.42, 0.45, -0.24, 0.6, 0, 0.2, 0]); break;
          case 'snowdrift': { ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.moveTo(x - px * 0.7, y); ctx.quadraticCurveTo(x - px * 0.1, y - px * 0.3, x + px * 0.7, y); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(190,212,236,.5)'; ctx.beginPath(); ctx.moveTo(x - px * 0.7, y); ctx.quadraticCurveTo(x - px * 0.2, y - px * 0.1, x + px * 0.7, y); ctx.closePath(); ctx.fill(); break; }
          case 'palmfrond': { ctx.fillStyle = sh('#3f8a4a');
            for (let k = 0; k < 4; k++) { const a = -0.5 + k * 0.32; ctx.beginPath(); ctx.ellipse(x + sd * px * (0.5 - k * 0.16), y - px * (0.75 - k * 0.1), px * 0.38, px * 0.08, a * sd, 0, TAU); ctx.fill(); }
            ctx.strokeStyle = sh('#2f6a34'); ctx.lineWidth = Math.max(1, px * 0.02); ctx.beginPath(); ctx.moveTo(x + sd * px * 0.8, y - px * 0.85); ctx.lineTo(x - sd * px * 0.2, y - px * 0.5); ctx.stroke(); break; }
          case 'coralarm': { const cols2 = ['#ff7a9a', '#c78bff', '#6ad8c0']; ctx.strokeStyle = sh(cols2[seed % 3]); ctx.lineWidth = Math.max(2, px * 0.035); ctx.lineCap = 'round';
            for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x + px * k * 0.14, y); ctx.quadraticCurveTo(x + px * k * 0.3, y - px * 0.35, x + px * k * 0.45, y - px * 0.62); ctx.stroke(); } ctx.lineCap = 'butt';
            glow(cols2[seed % 3], 0, -0.4, 0.4, 0.12); break; }
          case 'reedclump': { ctx.strokeStyle = sh('#6a9a4a'); ctx.lineWidth = Math.max(1.5, px * 0.026); const sway = Math.sin(curNow * 0.0016 + seed) * px * 0.05;
            for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(x + px * k * 0.09, y); ctx.quadraticCurveTo(x + px * k * 0.11 + sway, y - px * 0.36, x + px * k * 0.12 + sway, y - px * 0.68); ctx.stroke(); } break; }
          case 'hugeleaf': { const g2 = ['#1f4a22', '#2f6a2f', '#3f8a3a'][seed % 3];
            ctx.fillStyle = sh(g2); ctx.beginPath(); ctx.ellipse(x + sd * px * 0.18, y - px * 0.45, px * 0.62, px * 0.26, sd * (0.5 + (seed % 5) * 0.1), 0, TAU); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = Math.max(1, px * 0.014); ctx.beginPath(); ctx.moveTo(x + sd * px * 0.75, y - px * 0.72); ctx.lineTo(x - sd * px * 0.35, y - px * 0.2); ctx.stroke();
            ctx.fillStyle = sh(g2); ctx.beginPath(); ctx.ellipse(x - sd * px * 0.3, y - px * 0.2, px * 0.34, px * 0.14, -sd * 0.4, 0, TAU); ctx.fill(); break; }
          case 'sandcrest': duneShape(1.05, 1.1, 0.24 + R(1) * 0.08, ['#eed9a8', '#a08050']); break;
          case 'cloudwisp': { ctx.globalAlpha = 0.5; ctx.fillStyle = '#e8eaff'; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.ellipse(x + px * k * 0.34, y - px * 0.1 - Math.abs(k) * px * 0.04, px * 0.32, px * 0.1, 0, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; break; }
          case 'lanternpost': { rect(sh('#5a5a74'), -0.035, -0.75, 0.07, 0.75); rect(sh('#d8c088'), -0.13, -0.98, 0.26, 0.24); rect('rgba(255,228,160,.95)', -0.1, -0.95, 0.2, 0.18); glow('#ffd88a', 0, -0.86, 0.6, 0.26); break; }
          default: oval(sh('#8a8a80'), 0, -0.1, 0.3, 0.14);
        }
        ctx.globalAlpha = 1;
      }
      // ---- がめんに かぶせる くうき(地域の「におい」を いちばん つよく きめる そう) ----
      // ---- 地区ごとの かんきょう アニメ(ひかり・みず・ゆき・もや・はっぱ・くさ・くも・すな・ネオン・つぶ) ----
      // なにを 出すかは 地区の mood.anim(なければ 地域の motion)で きまる ので、
      // おなじ 地域でも 地区に 入る たびに うごきが かわる。
      // つぶは はいれつを もたない: i から きめうちで いちを 出す(ゴミが 出ず、いつ 来ても おなじ ながれ)。
      // がめんの なかだけ を えがき、かず は たんまつの おもさ(animLv)で きめる。
      // いきもの(とり・さかな・むし)は ここには ぜったいに 出さない(けしきと いきものは わける)
      const AMB_N = RENDER_TUNING.anim.counts;
      const wrapA = (v, span) => ((v % span) + span) % span;
      function drawAmbient(world, now) {
        const first = (mood && mood.anim) || (world.motion && world.motion[0]) || null;
        if (!first) return;
        ambLayer(first, AMB_N[animLv], now, 1);
        // こまかく えがける ときだけ、地域の 2つめの うごきを うすく かさねる
        if (animLv === 2) { const m = world.motion || []; for (const k of m) if (k !== first) { ambLayer(k, Math.round(AMB_N[2] * 0.45), now, 0.55); break; } }
      }
      function ambLayer(kind, n, now, mul) {
        const t = now * 0.001, wnd = windAmp, amt = clamp(mood.open || 1, 0.85, 1.15);
        const drift = plx('near') * 0.25; // てまえの そう。カメラの むき と よこ移動で ながれる
        const A = (v) => { ctx.globalAlpha = v * mul; };
        if (kind === 'leaves') { // はっぱ・はなびら: きせつで いろが かわる
          const col = curEnv.season === 'autumn' ? 'rgba(226,150,70,1)' : curEnv.season === 'spring' ? 'rgba(255,200,215,1)' : curEnv.season === 'winter' ? 'rgba(198,202,180,1)' : 'rgba(150,196,110,1)';
          ctx.fillStyle = col;
          for (let i = 0; i < n; i++) {
            const y = wrapA(i * 137 + now * (0.10 + (i % 4) * 0.035) * (0.6 + wnd * 0.6), H + 60) - 30;
            const x = wrapA(i * 211 + Math.sin(t * (0.7 + (i % 3) * 0.2) + i) * 34 * wnd * amt + drift, W + 40) - 20;
            const r = 3 + (i % 3);
            A(0.26 + 0.3 * ((i % 4) / 3));
            ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.5, Math.sin(t * 2 + i) * 1.2, 0, TAU); ctx.fill();
          }
          ctx.globalAlpha = 1;
        } else if (kind === 'snow') { // こな雪: かぜに ながされて よこへ すべる
          ctx.fillStyle = '#ffffff';
          const m = n * 2;
          for (let i = 0; i < m; i++) {
            const y = wrapA(i * 89 + now * (0.03 + (i % 5) * 0.012), H + 30) - 15;
            const x = wrapA(i * 173 + Math.sin(t * 0.6 + i) * 26 * wnd + now * 0.012 * wnd * amt + drift, W + 30) - 15;
            A(0.22 + 0.4 * ((i % 3) / 2));
            ctx.beginPath(); ctx.arc(x, y, 1.2 + (i % 3) * 0.7, 0, TAU); ctx.fill();
          }
          ctx.globalAlpha = 1;
        } else if (kind === 'sand') { // すな: じめんの ちかくを よこに ながれる すじ
          ctx.fillStyle = '#e8ce96';
          for (let i = 0; i < n; i++) {
            const d = 0.08 + ((i * 0.137) % 1) * 0.9, y = HOR + (H - HOR) * d;
            const x = wrapA(i * 151 + now * 0.001 * (60 + (i % 4) * 40) * (0.5 + wnd) * amt + drift, W + 120) - 60;
            A((0.12 + 0.22 * ((i % 3) / 2)) * (0.35 + d * 0.65));
            ctx.fillRect(x, y, 18 + (i % 5) * 14, 1 + (i % 2));
          }
          ctx.globalAlpha = 1;
        } else if (kind === 'mist') { // もや: ゆっくり ながれる うすい そう
          ctx.fillStyle = '#e2e8f6';
          const m = Math.max(3, Math.round(n * 0.4));
          for (let i = 0; i < m; i++) {
            const y = HOR + (H - HOR) * (0.02 + (i / m) * 0.7);
            const x = wrapA(i * 263 + now * 0.004 * (0.5 + (i % 3) * 0.4) * (0.5 + wnd) + drift, W + 300) - 150;
            A(0.09 + 0.05 * ((i % 3) / 2));
            ctx.beginPath(); ctx.ellipse(x, y, W * 0.34, (H - HOR) * 0.055, 0, 0, TAU); ctx.fill();
          }
          ctx.globalAlpha = 1;
        } else if (kind === 'water') { // みず: みなもの きらめき(おくほど こまかく うすく)
          ctx.fillStyle = '#ffffff';
          for (let i = 0; i < n; i++) {
            const row = (i % 5) / 5, y = HOR + 4 + (H - HOR) * (0.02 + row * 0.42);
            const x = wrapA(i * 197 + Math.sin(t * (0.8 + row) + i) * 18 * (0.5 + wnd) + drift * 0.5, W + 40) - 20;
            const tw = 0.5 + 0.5 * Math.sin(t * (2.2 + (i % 4) * 0.5) + i * 1.7);
            A((0.10 + 0.4 * tw) * (1 - row * 0.5));
            ctx.fillRect(x, y, 10 + (i % 4) * 8, 1.4);
          }
          ctx.globalAlpha = 1;
        } else if (kind === 'glow' || kind === 'motes') { // ひかりの つぶ: ゆっくり のぼって うえで きえる
          ctx.fillStyle = kind === 'glow' ? '#ffe296' : '#d7ebff';
          for (let i = 0; i < n; i++) {
            const y = H - wrapA(i * 127 + now * (0.012 + (i % 4) * 0.006), H * 0.85);
            const x = wrapA(i * 181 + Math.sin(t * (0.5 + (i % 3) * 0.25) + i) * 22 * amt + drift, W + 40) - 20;
            A((0.22 + 0.45 * Math.abs(Math.sin(t * 1.3 + i))) * clamp(y / (H * 0.45), 0, 1));
            ctx.beginPath(); ctx.arc(x, y, 1.4 + (i % 3) * 0.8, 0, TAU); ctx.fill();
          }
          ctx.globalAlpha = 1;
        } else if (kind === 'neon') { // ネオン: ちいさな かんばんが またたく(よるほど つよい)
          const lit = isNight() ? 1 : curEnv.time === 'evening' ? 0.6 : 0.25;
          for (let i = 0; i < n; i++) {
            const x = wrapA(i * 167 + drift * 0.6, W + 60) - 30, y = HOR - 6 - ((i * 53) % Math.round(H * 0.16));
            const blink = Math.sin(t * (3 + (i % 5)) + i * 2.1), on = blink > (i % 7 === 0 ? 0.6 : -0.2);
            A(lit * (on ? 0.3 + 0.35 * Math.abs(blink) : 0.05));
            ctx.fillStyle = NEON[i % NEON.length];
            ctx.fillRect(x, y, 3, 8 + (i % 3) * 6);
          }
          ctx.globalAlpha = 1;
        }
      }
      function drawCanopy(world) {
        const k = world.canopy; if (!k) return;
        const night = isNight(), t = curEnv.time;
        // てまえの そう は いちばん よく ながれる(そら 1.4 < えんけい 2.6 < てまえ 4.6)
        const pxN = plx('near'), pxS = plx('sky');
        const wrapN = (v, span) => ((v % span) + span) % span;
        if (k === 'shafts' || (k === 'leaves' && !night)) { // 木もれび / ジャングルの ひかりの すじ
          const warm = k === 'shafts' ? (t === 'morning' ? 0.16 : t === 'day' ? 0.12 : 0.06) : 0.09;
          if (!night) { ctx.save(); ctx.fillStyle = k === 'shafts' ? `rgba(255,248,200,${warm})` : `rgba(200,255,180,${warm})`;
            for (let i = 0; i < 4; i++) { const bx = wrapN(W * (0.12 + i * 0.26) + Math.sin(curNow * 0.0002 + i) * 14 + pxN * 0.5, W * 1.5) - W * 0.35; ctx.beginPath(); ctx.moveTo(bx, -10); ctx.lineTo(bx + W * 0.1, -10); ctx.lineTo(bx + W * 0.34, H); ctx.lineTo(bx + W * 0.16, H); ctx.closePath(); ctx.fill(); } ctx.restore(); }
        }
        if (k === 'leaves') { // うえと よこから おおきな はが せまる(みとおしが せまい)
          // うえから せまる は は よこに ながれる(てまえ なので いちばん はやい)。
          // よこの は は レンズの ふちに ついた ままに して、ふちが あく のを ふせぐ
          if (!canopyCache || canopyCache.w !== W || canopyCache.h !== H) {
            const c = typeof document !== 'undefined' && document.createElement ? document.createElement('canvas') : null; const g = c && c.getContext && c.getContext('2d');
            // うえの は だけを「せの ひくい 板」に して おく。がめん ぜんぶを ためるより ずっと かるく、
            // よこに 2まい ならべる だけで はてしなく ながせる
            if (g) { const topH = Math.min(H, Math.round(W * 0.3) + 60); c.width = W; c.height = topH; g.fillStyle = 'rgba(18,44,18,.72)';
              for (let i = 0; i < 9; i++) { const bx = (i * 137) % W, by = -20 + (i % 3) * 26, r = W * (0.14 + (i % 4) * 0.045);
                // つなぎめが 見えない ように、はしを またぐ は は りょうはしに おく
                for (const dx2 of [0, -W, W]) { if (bx + dx2 < -r || bx + dx2 > W + r) continue; g.beginPath(); g.ellipse(bx + dx2, by, r, r * 0.5, (i % 5) * 0.5, 0, TAU); g.fill(); } }
              canopyCache = { c, w: W, h: H }; }
          }
          if (canopyCache) { const ox = wrapN(pxN * 0.45, W); ctx.drawImage(canopyCache.c, ox - W, 0); if (ox > 0) ctx.drawImage(canopyCache.c, ox, 0); }
          // よこの は は レンズの ふちに ついた まま(ふちが あかない)。まいフレーム 6つ ぬるだけ
          ctx.fillStyle = 'rgba(18,44,18,.72)';
          for (const sx2 of [0, W]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(sx2, H * (0.18 + i * 0.24), W * 0.16, W * 0.09, 0.6, 0, TAU); ctx.fill(); }
        }
        else if (k === 'marine') { // かいちゅう: ふわふわ ただよう つぶ と うえからの ひかり
          ctx.fillStyle = 'rgba(180,235,255,.06)';
          for (let i = 0; i < 3; i++) { const bx = wrapN(W * (0.2 + i * 0.3) + pxN * 0.4, W * 1.5) - W * 0.3; ctx.beginPath(); ctx.moveTo(bx - W * 0.12, 0); ctx.lineTo(bx + W * 0.12, 0); ctx.lineTo(bx + W * 0.3, H); ctx.lineTo(bx - W * 0.02, H); ctx.closePath(); ctx.fill(); }
          ctx.fillStyle = 'rgba(220,245,255,.5)';
          const n = tier >= 2 ? 14 : 30;
          for (let i = 0; i < n; i++) { const x2 = wrapN(i * 83 + Math.sin(curNow * 0.0004 + i) * 20 + pxN * 0.6, W), y2 = (i * 57 - curNow * 0.012) % H; ctx.globalAlpha = 0.25 + 0.3 * ((i % 3) / 3); ctx.fillRect(x2, (y2 + H) % H, 2, 2); }
          ctx.globalAlpha = 1;
        }
        else if (k === 'aurora' && (night || t === 'evening')) { // ゆきぐにの よる
          ctx.save(); ctx.globalAlpha = night ? 0.5 : 0.22;
          for (let i = 0; i < 3; i++) { const hue = ['#5fffc0', '#7fd8ff', '#c98aff'][i]; ctx.fillStyle = hue; ctx.beginPath(); ctx.moveTo(-20, HOR * (0.2 + i * 0.13));
            for (let x2 = -20; x2 <= W + 20; x2 += 18) ctx.lineTo(x2, HOR * (0.2 + i * 0.13) + Math.sin((x2 + pxS) * 0.012 + curNow * 0.0006 + i) * HOR * 0.12);
            for (let x2 = W + 20; x2 >= -20; x2 -= 18) ctx.lineTo(x2, HOR * (0.34 + i * 0.13) + Math.sin((x2 + pxS) * 0.012 + curNow * 0.0006 + i) * HOR * 0.12);
            ctx.closePath(); ctx.globalAlpha = (night ? 0.26 : 0.12) - i * 0.05; ctx.fill(); }
          ctx.restore(); ctx.globalAlpha = 1;
        }
        else if (k === 'neon') { // とかい: よるは いろの もや、あめの ひは じめんに ネオンが にじむ
          if (night || t === 'evening') { ctx.save(); ctx.globalAlpha = night ? 0.16 : 0.08;
            const g = ctx.createLinearGradient(0, HOR - H * 0.1, 0, H); g.addColorStop(0, '#ff4fa3'); g.addColorStop(0.5, '#7a4fd8'); g.addColorStop(1, '#39e6ff'); ctx.fillStyle = g; ctx.fillRect(0, HOR - H * 0.1, W, H - HOR + H * 0.1); ctx.restore(); ctx.globalAlpha = 1; }
          if (curEnv.weather === 'rain') { ctx.save(); ctx.globalAlpha = 0.14; for (let i = 0; i < 5; i++) { ctx.fillStyle = NEON[i % NEON.length]; ctx.fillRect(W * (0.08 + i * 0.19), HOR + (H - HOR) * 0.25, W * 0.05, (H - HOR) * 0.75); } ctx.restore(); ctx.globalAlpha = 1; }
        }
        else if (k === 'heat' && (t === 'day' || t === 'evening') && curEnv.weather === 'sunny') { // さばくの かげろう
          ctx.fillStyle = 'rgba(255,240,200,.10)';
          for (let i = 0; i < 5; i++) { const y2 = HOR + i * 5 + Math.sin(curNow * 0.002 + i) * 2; ctx.fillRect(0, y2, W, 2.5); }
        }
        else if (k === 'clouds') { // やま: くもが よこぎる(たかい ところに いる かんじ)
          ctx.fillStyle = 'rgba(255,255,255,.16)';
          for (let i = 0; i < 3; i++) { const x2 = wrapN(curNow * 0.008 * (1 + i * 0.4) + i * 220 + plx('far') * 0.6, W + 300) - 150, y2 = HOR - H * (0.02 + i * 0.03); ctx.beginPath(); ctx.ellipse(x2, y2, W * 0.24, H * 0.015, 0, 0, TAU); ctx.fill(); }
        }
        else if (k === 'rivermist' && (t === 'morning' || night)) { // かわの あさもや
          // 3 本の もやを 1 まいの たての グラデーションで。ふちを ぼかして 線(しましま)に 見せない
          const y0 = HOR + (H - HOR) * 0.02, y1 = HOR + (H - HOR) * 0.29, g = ctx.createLinearGradient(0, y0, 0, y1);
          for (const [t, a] of RIVERMIST_STOPS) g.addColorStop(t, 'rgba(230,240,250,' + a + ')');
          ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0);
        }
        else if (k === 'mistveil') { // きおくのみずうみ: しずかな きりの そう
          ctx.fillStyle = 'rgba(200,208,232,.13)';
          for (let i = 0; i < 4; i++) { const y2 = HOR + (H - HOR) * (0.02 + i * 0.13), dx = Math.sin(curNow * 0.0003 + i) * 20; ctx.fillRect(dx - 20, y2, W + 40, (H - HOR) * 0.07); }
          { ctx.globalAlpha = 0.5; for (let i = 0; i < 3; i++) { const y2 = HOR + (H - HOR) * (0.06 + i * 0.16), x2 = wrapN(i * 211 + pxN * 0.55, W + 260) - 130; ctx.beginPath(); ctx.ellipse(x2, y2, W * 0.3, (H - HOR) * 0.05, 0, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
          const g = ctx.createRadialGradient(W / 2, H * 0.55, W * 0.25, W / 2, H * 0.55, W * 0.75); g.addColorStop(0, 'rgba(20,24,48,0)'); g.addColorStop(1, 'rgba(20,24,48,.38)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        }
        else if (k === 'motes') { // ほしぞら: ひかりの つぶ
          ctx.fillStyle = 'rgba(255,240,190,.75)';
          const n = tier >= 2 ? 10 : 22;
          for (let i = 0; i < n; i++) { const x2 = wrapN(i * 97 + Math.sin(curNow * 0.0006 + i) * 30 + pxN * 0.5, W), y2 = (i * 71 + curNow * 0.006) % H; ctx.globalAlpha = 0.3 + 0.4 * Math.abs(Math.sin(curNow * 0.001 + i)); ctx.fillRect(x2, (y2 + H) % H, 2, 2); }
          ctx.globalAlpha = 1;
        }
        else if (k === 'warm' && (t === 'evening' || night)) { // おうち: あたたかい あかりの まわり
          const g = ctx.createRadialGradient(W / 2, H * 0.62, W * 0.12, W / 2, H * 0.62, W * 0.8); g.addColorStop(0, 'rgba(255,214,150,.16)'); g.addColorStop(1, 'rgba(60,40,20,.22)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        }
        else if (k === 'sunpath' && (t === 'evening' || night)) { // うみ: ゆうひ/つきあかりの もや
          ctx.fillStyle = night ? 'rgba(150,180,240,.07)' : 'rgba(255,170,110,.12)'; ctx.fillRect(0, HOR - 10, W, H - HOR + 10);
        }
      }
      // ゆれは「あしもとを とめて うえを よこへ ずらす」= せんだん。ものごとの いち で ずらす ので
      // となりの 木と そろって ゆれない(かぜが わたって いく ように 見える)
      function swayOf(o) {
        const m = SWAY[o.struct]; if (!m) return 0;
        if (animLv === 0 && m < 0.9) return 0; // かるい ときは よく ゆれる ものだけ
        return Math.sin(windPh + o.x * 0.0021 + o.z * 0.0013) * m * windAmp * RENDER_TUNING.anim.sway * (animLv === 0 ? 0.7 : 1);
      }
      // あかりは ゆっくり いきを する。ものごとに ずれた はやさで
      const lightPulse = (o) => 0.86 + 0.14 * Math.sin(windPh * 1.7 + o.x * 0.011 + o.z * 0.019);
      const FOOTPRINT = OCCLUDER_BOX, SWAY = SWAY_AMOUNT, OCCLUDES = OCCLUDER_LAYERS;
      const OCC_MIN = RENDER_TUNING.occlusion.min;   // すけても これより うすく しない
      // すける 造形物は、いったん べつの 板に ぜんぶ えがいてから 1まいで かさねる。
      // そのまま alpha を さげると、中の まる や 板が かさなって「ガラスの かたまり」に 見える
      // (遠景の フォグ で いちど 直した のと おなじ 問題)。かるい たんまつ では やらない
      let fadeC = null, fadeX = null, fadeDpr = 1, fadeDirty = null;
      function fadeLayer() {
        if (animLv === 0 || typeof document === 'undefined' || !document.createElement) return null;
        const dpr = o.canvas && o.canvas.width && W ? o.canvas.width / W : 1;
        const cw = Math.round(W * dpr), ch = Math.round(H * dpr);
        if (!fadeC || fadeC.width !== cw || fadeC.height !== ch) {
          fadeC = document.createElement('canvas'); fadeC.width = cw; fadeC.height = ch;
          fadeX = fadeC.getContext && fadeC.getContext('2d');
          if (!fadeX) { fadeC = null; return null; }
          fadeDpr = dpr;
        }
        fadeX.setTransform(fadeDpr, 0, 0, fadeDpr, 0, 0);
        return fadeX;
      }
      const fadeState = new WeakMap();         // ものごとに いまの すけぐあい を おぼえて、ゆっくり もどす
      const fadeOf = (o) => { let f = fadeState.get(o); if (!f) { f = { a: 1 }; fadeState.set(o, f); } return f; };
      let dtSec = 1 / 60;
      // 地形の かこみ(がけ・すなおか・サンゴのかべ…)は レンズに ちかづきすぎると 1まいの 板に 見える ので、はやめに きる
      // しゅるいごとの「がめんの たかさの なんわり まで えがくか」(px は size の えがき はば。ビルは px の 2.6ばい、がけは 2ばい の たかさに なる ので はやめに きる)
      const NEAR_CUT = { building: 0.5, alleywall: 0.5, shopblock: 0.7, cliffwall: 0.55, seacliff: 0.6, cliff: 0.7, dunewall: 0.7, duneridge: 0.8, reefwall: 0.6, snowbank: 0.9, searock: 0.9, mesa: 0.9, riverwood: 0.8, parktree: 0.8, mistwood: 0.85, bluetree: 0.85, hedge: 0.9, bigtrunk: 1.1, kelpwall: 0.8, pinewall: 0.8, palmgrove: 0.9, ruinwall: 0.8, cropline: 1.0, woodfence: 1.0, islandedge: 0.9 };
      let mood = { light: 1, fog: 0, tint: null, tintAmt: 0 }, farCull = 3600, lastNow = 0;
      function draw(view, now) {
        if (!ctx) return;
        const { world, player, residents, party, nearest } = view; const e = view.env;
        setCamera(view.camera);
        mood = view.mood || mood;
        cap = Math.round(capBase * clamp(0.78 + (world.density || 1) * 0.3, 0.8, 1.4));
        // 地域の かぜ(つよさ・はやさ)。てんきで すこし つよく なる
        { const wd = world.wind || [0.5, 1]; const gust = e.weather === 'rain' ? 1.35 : e.weather === 'snow' ? 1.15 : 1;
          windAmp = wd[0] * gust; windHz = wd[1]; windPh = now * 0.0011 * windHz; }
        // 地区の きぶん: あかるさ・きり(とおくが みえない)・じめんの いろ。おくへ いくほど けしきが かわる
        // みとおしは 地域ごと(ジャングルは せまく、さばくは とおくまで)+ 地区の きり
        farCull = Math.round(3600 * (world.view || 1) * (1 - Math.min(0.6, mood.fog || 0) * 0.75));
        const tl = TIME_LIGHT[e.time] || TIME_LIGHT.day; const wl = WEATHER_LIGHT[e.weather] || 0.9; const light = tl.light * wl * (mood.light || 1);
        // 地域の こせい を えがく そうが つかう「いまの ひかり・くうき」
        dtSec = lastNow ? Math.min(0.1, Math.max(0.001, (now - lastNow) / 1000)) : 1 / 60; lastNow = now;
        curLight = light; curTint = tl.tint; curAmt = tl.amt; curNow = now; curEnv = e; curFog = 0;
        { const skyB = (SKY_OVERRIDE[world.regionId] || tl.sky)[1]; const f = mixRgb(world.ground[1], skyB, 0.6 + Math.min(0.3, (mood.fog || 0) * 0.6)); const t = hexToRgb(tl.tint || '#ffffff'); curFogRgb = [0, 1, 2].map((i) => Math.round(clamp(lerp(f[i], t[i], tl.amt * 0.5) * light * 1.05, 0, 255))); }
        drawSky(world, e, tl, wl, now);
        drawBackdrop(world, e, light, tl);
        drawDistant(world, e, light, tl, now); // Phase 4D-2
        if (mood.fog > 0.02) { const fc = (SKY_OVERRIDE[world.regionId] || tl.sky)[1]; ctx.fillStyle = shade(fc, wl, '#ffffff', 0); ctx.globalAlpha = Math.min(0.85, mood.fog * 1.3); ctx.fillRect(0, HOR - H * 0.17, W, H * 0.17 + 4); ctx.globalAlpha = 1; }
        drawGround(world, e, tl, wl, light, now);
        drawDistantBelow(world, light, tl); // Phase 4D-2
        drawDetails(world, player);
        // 立て看板(こもの・じゅうみん・いっしょの なかま・じぶん)を おくから じゅんに
        const items = [];
        const pp = project(player.x, player.z);
        // ランドマークは きりの むこうでも うっすら みえる(めじるし)。ほかは farCull まで
        // とおくの しゃへいぶつは 2つに 1つ(きりで うすい ので めだたない)。ちいさすぎる ものは えがかない
        let pi = 0;
        for (const pr of world.props) { pi++; const p = project(pr.x, pr.z); if (!p || p.s * pr.size < 6) continue;
          // おおきな ものは がめんから はみ出してよい(じぶんより ずっと おおきい せかいを かんじる)
          const big = pr.layer === 'frame' || pr.layer === 'fore' || pr.landmark, margin = big ? pr.size * p.s * 0.8 + 60 : 100;
          if (p.sx < -margin || p.sx > W + margin) continue;
          if (p.dz > (pr.landmark ? 5200 : big ? farCull * 1.15 : farCull)) continue;
          if (pr.layer === 'wall' && p.dz > farCull * 0.62 && (pi & 1)) continue;
          items.push({ kind: 'prop', o: pr, p, must: !!pr.landmark || !!pr.hero || !!pr.keep || (big && p.dz < farCull * 0.7) }); }
        const talkR = 130;
        for (const a of residents) { const p = project(a.x, a.z); if (p && p.dz < farCull && p.s * ACTOR_SIZE >= 4 && p.sx > -60 && p.sx < W + 60) { const d = Math.hypot(a.x - player.x, a.z - player.z); items.push({ kind: 'actor', o: a, p, d, must: a === nearest || d < talkR * 1.5 }); } }
        for (const a of party) { const p = project(a.x, a.z); if (p) items.push({ kind: 'actor', o: a, p, d: Math.hypot(a.x - player.x, a.z - player.z), must: true }); }
        if (pp) items.push({ kind: 'player', p: pp, must: true });
        items.sort((u, v) => v.p.dz - u.p.dz);
        // カメラと じぶんの あいだに はいる おおきな もの(き・たてもの)は はんとうめいに: かくれても じぶんが わかる
        // 「ちかづいた から」では すけない。がめんの うえで じぶんに かさなって、
        // じぶんを かくして いる ものだけ を、すこし すける。もどる ときも ゆっくり
        let occluded = false;
        if (pp) {
          const ppx = ACTOR_SIZE * pp.s;
          const pl = pp.sx - ppx * 0.30, pr2 = pp.sx + ppx * 0.30, pw = pr2 - pl;
          const pt = pp.sy - ppx * 0.95, pb = pp.sy, ph = pb - pt;
          for (const it of items) {
            if (it.kind !== 'prop' || !OCCLUDES.has(it.o.layer) || (it.o.layer === 'struct' && it.o.size <= 140)) continue;
            const fade = fadeOf(it.o);
            let want = 1;
            if (it.p.dz < pp.dz) {
              const px2 = it.o.size * it.p.s;
              const fp = FOOTPRINT[it.o.struct || (it.o.landmark ? 'landmark' : 'glyph')] || FOOTPRINT.glyph;
              const l = it.p.sx - px2 * fp[0], r = it.p.sx + px2 * fp[0];
              const t = it.p.sy - px2 * fp[1], b = it.p.sy + px2 * 0.04;
              const ox = Math.min(r, pr2) - Math.max(l, pl), oy = Math.min(b, pb) - Math.max(t, pt);
              if (ox > 0 && oy > 0) {
                // じぶんの すがたの どれだけを ふさいで いるか(よこ × たて)。
                // よこを かすめる だけ・あしもとに かかる だけ では すけない。
                // ひくい すなやま の むこうに いる ときは あたまが 見えて いる ので そのまま
                const cover = Math.min(1, ox / Math.max(1, pw)) * Math.min(1, oy / Math.max(1, ph));
                const c0 = RENDER_TUNING.occlusion.cover;
                if (cover > c0) want = lerp(1, OCC_MIN, Math.min(1, (cover - c0) / RENDER_TUNING.occlusion.span));
              }
            }
            // すけるのは すこし はやく、もどるのは ゆっくり。ぱっと きりかわらない
            const k = Math.min(1, dtSec * (want < fade.a ? RENDER_TUNING.occlusion.inSpeed : RENDER_TUNING.occlusion.outSpeed));
            fade.a += (want - fade.a) * k;
            if (fade.a < 0.985) { it.alpha = fade.a; if (fade.a < 0.9) occluded = true; }
          }
        }
        // 同時に えがく かず の せいげん: じぶん・なかま・はなせる きょりの じゅうみん・ランドマークは かならず。けずるのは とおい こもの から
        let drawList = items;
        if (items.length > cap) {
          let over = items.length - cap; const skip = new Set();
          for (const it of items) { if (over <= 0) break; if (it.kind === 'prop' && !it.must && it.o.layer !== 'wall') { skip.add(it); over--; } }
          for (const it of items) { if (over <= 0) break; if (!it.must && !skip.has(it)) { skip.add(it); over--; } }
          drawList = items.filter((it) => !skip.has(it));
        }
        // ---- すける ものを ためる 板 ----
        // 1つずつ alpha を さげると、中の まる や となりの 木と かさなって
        // 「ガラスの かたまり」に 見える。ぜんぶ おなじ 板に くっきり えがいて、
        // さいごに 1かいだけ かさねると、かたまりが すけて いる ように 見える
        const fadeInk = fadeLayer();
        let fadeUse = false, fadeA = 1, fx0 = 1e9, fy0 = 1e9, fx1 = -1e9, fy1 = -1e9;
        if (fadeInk && fadeDirty) { fadeInk.clearRect(fadeDirty[0], fadeDirty[1], fadeDirty[2], fadeDirty[3]); fadeDirty = null; }
        const fadeMark = (it, a, wMul, hMul) => {
          const px3 = (it.o.size || ACTOR_SIZE) * it.p.s;
          fadeUse = true; if (a < fadeA) fadeA = a;
          fx0 = Math.min(fx0, it.p.sx - px3 * wMul); fx1 = Math.max(fx1, it.p.sx + px3 * wMul);
          fy0 = Math.min(fy0, it.p.sy - px3 * hMul); fy1 = Math.max(fy1, it.p.sy + px3 * 0.2);
        };
        const named = new Set(items.filter((it) => it.kind === 'actor' && !it.o.follow && it.o !== nearest && it.d < 300 && ACTOR_SIZE * it.p.s > 30).sort((u, v) => u.d - v.d).slice(0, 3).map((it) => it.o));
        for (const it of drawList) {
          if (it.kind === 'prop') {
            // レンズの すぐ まえに きた おおきな ものは、がめんを ふさがない。
            // うっすら のこると もやの かたまりに 見える ので、ある おおきさを こえたら えがかない
            const huge = it.o.layer === 'frame' || it.o.layer === 'fore' || it.o.layer === 'struct' || (it.o.layer === 'side' && it.o.struct);
            if (huge && it.o.size * it.p.s > H * (it.o.layer === 'fore' ? 0.8 : NEAR_CUT[it.o.struct] || 1.15)) continue;
            const nearFade = huge ? clamp((it.p.dz - 190) / 150, 0, 1) : 1;
            const occ = it.alpha != null ? it.alpha : 1;
            // 造形物・ランドマークは とおくても すけない(かさなった 板に 見えない)。いろだけ きりへ よせる
            curFog = clamp((it.p.dz - 420) / (farCull * 1.05), 0, 0.78);
            if (it.o.layer === 'glow') { const px = it.o.size * it.p.s; ctx.fillStyle = 'rgba(255,250,210,.28)'; ctx.globalAlpha = clamp(1.4 - it.p.dz / farCull, 0.2, 1) * occ * lightPulse(it.o); ctx.beginPath(); ctx.ellipse(it.p.sx, it.p.sy, px * 0.6, px * 0.18, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; curFog = 0; continue; }
            if (it.o.landmark) {
              // ランドマークも おなじ: すける ものは べつの 板へ
              if (fadeInk && occ < 0.9) { const main = ctx; ctx = fadeInk; drawLandmark(it.o.landmark, it.p, it.o.size, light, world); ctx = main; fadeMark(it, occ, 0.9, 1.6); curFog = 0; continue; }
              ctx.globalAlpha = occ; drawLandmark(it.o.landmark, it.p, it.o.size, light, world); ctx.globalAlpha = 1; curFog = 0; continue;
            }
            if (it.o.struct) {
              let a = occ * nearFade;
              if (STRUCT_ROLE[it.o.struct] === 'light') a *= 0.93 + 0.07 * lightPulse(it.o); // あかりは いきを する
              if (a > 0.04) {
                const sw = swayOf(it.o); // かぜで ゆれる(あしもとは うごかない)
                const paint = (g) => { if (sw) { g.save(); g.transform(1, 0, sw, 1, -sw * it.p.sy, 0); drawStructure(it.o.struct, it.p, it.o.size, it.o); g.restore(); } else drawStructure(it.o.struct, it.p, it.o.size, it.o); };
                // はっきり すける ものは べつの 板へ。さいごに まとめて 1かい かさねる
                if (fadeInk && a < 0.9) {
                  const fp = OCCLUDER_BOX[it.o.struct] || OCCLUDER_BOX.glyph;
                  const main = ctx; ctx = fadeInk; paint(fadeInk); ctx = main;
                  fadeMark(it, a, fp[0] + 0.45, fp[1] + 0.5);
                  curFog = 0; continue;
                }
                ctx.globalAlpha = a; paint(ctx); ctx.globalAlpha = 1;
              }
              curFog = 0; continue;
            }
            curFog = 0;
            // 絵文字(立て看板)は とおくで うすく なる が、うすすぎて ゆうれいに ならない
            let fade = clamp(1.4 - it.p.dz / farCull, 0.35, 1) * occ * nearFade;
            // きりの 地域は 木の 絵文字を とおくほど 霧に しずめる(見た目だけ。数・位置・当たりは そのまま)
            fade *= emojiMistFactor(world.regionId, it.o.emoji, it.p.dz);
            if (fade <= 0.04) continue;
            const px = it.o.size * it.p.s; if (px < 5) continue; ctx.globalAlpha = fade;
            // おなじ 絵の ビルが ならぶ ところは、1 つ ずつ 大きさ と たかさ を かえる(当たり・位置は そのまま)
            const vary = emojiVaryOf(world.regionId, it.o);
            if (vary) drawScenery(it.o.emoji, it.p.sx, it.p.sy, px, vary[0], vary[1]); else drawScenery(it.o.emoji, it.p.sx, it.p.sy, px);
            ctx.globalAlpha = 1;
          }
          else if (it.kind === 'player') {
            const px = ACTOR_SIZE * it.p.s; const facing = facingOf(player.heading, cam.yaw);
            ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(it.p.sx, it.p.sy, px * 0.32, px * 0.09, 0, 0, TAU); ctx.fill();
            const lift = player.moving ? Math.abs(Math.sin(player.bob * 5)) * px * (facing === 'back' ? 0.06 : 0.09) : 0;
            ctx.save(); ctx.translate(it.p.sx, it.p.sy - lift); ctx.scale(facing === 'left' ? -1 : 1, facing === 'back' ? 0.95 : 1); if (player.moving && (facing === 'left' || facing === 'right')) ctx.rotate((facing === 'left' ? -1 : 1) * 0.06);
            ctx.font = `${Math.round(px * 0.9)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(playerGlyph(), 0, 0); ctx.restore();
          }
          else {
            const a = it.o;
            // なかまは 見かけの 大きさ(じぶんに くらべて)と きょりで こまかさを きめる。じゅうみんは いつも full
            let lod;
            if (a.follow && pp) { lod = partyLod(it.p.s / pp.s, it.d, lodMemo.get(a)); lodMemo.set(a, lod); spriteStats[lod]++; }
            drawSprite(a, it.p, ACTOR_SIZE, clamp(1.5 - it.p.dz / farCull, 0.3, 1), cam.yaw, lod);
            const top = it.p.sy - ACTOR_SIZE * it.p.s;
            if (a.say && a.sayFor > 0) drawBubble(a.say, it.p.sx, top);
            else if (a === nearest && it.p.s > 0.3) drawLabel(a.label + (a.behavior && VERBS[a.behavior] ? '・' + VERBS[a.behavior] : ''), it.p.sx, top - 4, false);
            else if (named.has(a)) drawLabel(a.label, it.p.sx, top - 3, true);
            if (view.lifeDebug && view.lifeOf && it.p.s > 0.18) {
              const L = view.lifeOf(a);
              drawLabel(`${L.behavior}/${L.emotion}${L.goal ? '→' + L.goal : ''}${L.partner ? '+' + L.partner : ''}`, it.p.sx, top - 16, true);
            }
          }
        }
        // ためた「すける もの」を 1まいで かさねる
        if (fadeUse && fadeC) {
          const bx = clamp(Math.floor(fx0), 0, W), by = clamp(Math.floor(fy0), 0, H);
          const bw = clamp(Math.ceil(fx1) - bx, 0, W - bx), bh2 = clamp(Math.ceil(fy1) - by, 0, H - by);
          fadeDirty = [bx, by, bw, bh2]; // つぎの フレームで ここを けす
          if (bw > 1 && bh2 > 1) {
            ctx.globalAlpha = fadeA;
            ctx.drawImage(fadeC, bx * fadeDpr, by * fadeDpr, bw * fadeDpr, bh2 * fadeDpr, bx, by, bw, bh2);
            ctx.globalAlpha = 1;
          }
        }
        // かくれている ときは あしもとに わ を だす(じぶんの いちが わかる)
        if (occluded && pp) { const px = ACTOR_SIZE * pp.s; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.ellipse(pp.sx, pp.sy, px * 0.36, px * 0.11, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
        drawAmbient(world, now);
        drawCanopy(world);
        // てんきは 地域で 見えかたが かわる(かいちゅうと そらの ていりゅうじょには あめも ゆきも ふらない)
        const skyWeather = world.regionId !== 'deepsea' && world.regionId !== 'star_stop';
        if (skyWeather && (e.weather === 'rain' || e.weather === 'snow')) { ctx.fillStyle = e.weather === 'rain' ? 'rgba(180,210,255,.55)' : 'rgba(255,255,255,.85)'; const n = (tier >= 2 ? 16 : 34) * (world.regionId === 'snow' && e.weather === 'snow' ? 1.6 : 1); for (let i = 0; i < n; i++) { const x = (i * 97 + (now * (e.weather === 'rain' ? 0.02 : 0.005) * (i % 3 + 1))) % (W + 20) - 10; const y = (i * 61 + now * (e.weather === 'rain' ? 0.5 : 0.08) * (1 + (i % 4) * 0.3)) % (H + 20) - 10; if (e.weather === 'rain') ctx.fillRect(x, y, 1.5, 9); else { ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3), 0, TAU); ctx.fill(); } } }
        if (e.time === 'night' && world.sky !== 'stars') { ctx.fillStyle = 'rgba(10,15,45,.20)'; ctx.fillRect(0, 0, W, H); }
      }
      return { draw, project, facingOf, drawScenery, sceneryMode,
        // よいやすい ひとの ための スイッチ。0 に しても とめは しない(へらすだけ)
        setAnimLevel(v) { animLv = clamp(Math.round(v), 0, 2); }, get animLevel() { return animLv; },
        setDistant, get distantShown() { return distantShown; }, // Phase 4D-2
        get backdropLayers() { return bdLayers; },
        get spriteStats() { return spriteStats; }, get spriteCacheSize() { return spriteCache.size; },   // なかまの LOD・え の したく(しらべる ため)
        resize(n) { ctx = n.ctx; W = n.W; H = n.H; if (n.rawCtx) { rawMain = n.rawCtx; sceneryMain = wrapScenery ? wrapScenery(n.rawCtx) || n.rawCtx : n.rawCtx; } setup(); }, destroy() { skyCache = null; nebula = null; spriteCache.clear(); spriteStats.bytes = 0; } };
    }

    // ================= なおとっち世界 正式地理 v1（D案「弓なりの大陸と、そのふところの湾」） =================
    // ここは「せかいの かたち」の 正本。13地域の region-local な world 座標には いっさい さわらない。
    // mapX / mapY は 世界地図を かく ための 論理座標で、ゲームの world 座標では ない。
    // 将来 regionOrigin(= global は regionOrigin + local)を いれる ときに まぎれない よう、
    // 名前を はっきり わけて いる。mapX / mapY を そのまま world 座標に しては いけない。
    //
    // かたち: 北〜北西に 弓なりの 山脈(ゆきぐに — やま — もり)。弓の 内がわ(南)が 風上で ぬれ、
    // 外がわ(北西)が 雨陰で かわく。やまの ふもとの 湖から 大河が 生まれ、かわ・みずうみ →
    // いなか → とかい を とおって 湾へ そそぐ。湾の 口が せかいの たてじく(上=ほしぞら / 下=しんかい)。
    // きおくのみずうみ だけ 地上の ざひょうを もたない。
    //
    // だいじな 区別(#39): 「地形として つながって いる もの」(feature)と
    // 「プレイヤーが 地域を 行き来できる みち」(connection)は べつもの。
    // 大河は いなか と とかい を 地形として つらぬくが、プレイヤーの 主要な みちは 街道でよい。
    const GEO_UNIT = 0.27;       // 図上の 一辺(√面積+2)を mapX/mapY の めもりへ なおす ばいりつ。
    // となりの 地域と すこし かさなる おおきさに して、13この まるでは なく ひとつづきの 陸に 見せる
    const GEO_MIN_SIDE = 5.5;    // せいかつけんが 点に ならない ための 下限(#13)
    // 実面積 Mu² = (maxX − minX) × len ÷ 1e6。halfW×2×len では ない(sea と memory_lake は
    // みずぎわが かたがわを 食うので、halfW から 出すと ひろすぎる)。
    // この 数は テストで buildWorld から 測りなおして いる ので、ずれたら テストが おちる。
    const GEO_AREA = { home: 6.90, city: 30.36, countryside: 40.04, forest: 45.82, mountain: 36.00,
      snow: 38.00, sea: 25.64, deepsea: 34.32, river_lake: 35.20, jungle: 42.12, desert: 59.84,
      star_stop: 37.96, memory_lake: 10.64 };
    // 地域の「ほそながさ」= 実 box よこはば ÷ おくゆき。やま 0.44 / うみ 0.40 は ほんとうに
    // ほそながい ので、世界地図でも ほそながい しまに なる(丸を 13こ ならべない ための しかけ)
    const GEO_ASPECT = { home: 0.77, city: 0.70, countryside: 0.68, forest: 0.73, mountain: 0.44,
      snow: 0.66, sea: 0.40, deepsea: 0.56, river_lake: 0.55, jungle: 0.64, desert: 0.77,
      star_stop: 0.71, memory_lake: 0.43 };
    // 図上の 一辺(#13)。13地域 ぜんぶに おなじ 式。地域ごとに 手で なおすと、大きさから
    // 「ここは とくべつだ」と さかさに よめて しまう
    const worldMapSide = (id) => Math.max(Math.sqrt(GEO_AREA[id] || 1) + 2, id === 'home' ? GEO_MIN_SIDE : 0);
    // 図上の だえん。よこ:たて を その地域の ほんとうの ほそながさに そろえ、
    // めんせきは 一辺² に あわせる
    function worldMapShape(id) {
      const side = worldMapSide(id), k = GEO_ASPECT[id] || 0.7;
      const ry = side / Math.sqrt(Math.PI * k);
      return { rx: k * ry * GEO_UNIT, ry: ry * GEO_UNIT };
    }

    // ====== なおとっち世界 地理正本 v1 ======
    // 世界の中心は「二つの大きな山地に はさまれた ほそながい たに」。
    // にしの山地(中央アルプス型・あるける)／ひがしの山地(南アルプス型・**region では ない**)、
    // その あいだの 伊那谷型の たにに おうち。北へ 行くほど 高く 寒く なり、峠を こえると
    // べつの 水系と とかい。北西は 砂丘の 世界、南西は 南国の 森。
    // ゲームの中の 名まえは すべて げんじょう維持で、実在の 地名は 出しません。
    const WORLD_GEOGRAPHY = {
      version: 2,
      canon: 'v1',                 // 「なおとっち世界 地理正本 v1」
      name: 'なおとっち',
      plan: 'D2',
      // たてじくは 1 点では ない。**山の上**と**海の下**で べつの ばしょ(D2)
      axis: {
        sky:  { region: 'star_stop', from: 'countryside', mapX: -1.6, mapY: -1.8, label: 'やまのうえ', short: 'ほしぞら' },
        deep: { region: 'deepsea',   from: 'sea',         mapX:  1.3, mapY: -6.7, label: 'がいようのした', short: 'しんかい' },
      },
      // 世界の そとがわ。とうめいな かべでは なく、ちけいが せかいの はし
      rim: [
        { dir: 'north', kind: 'ice', label: 'こおりのはら', near: ['snow'] },
        { dir: 'northwest', kind: 'sand', label: 'すなのはて', near: ['desert'] },
        // ジャングルは この 外洋の **なか** に うかんで いる。本土がわの きしは とかい・うみ
        { dir: 'southwest', kind: 'ocean', label: 'がいよう', near: ['jungle', 'city', 'sea'] },
        { dir: 'south', kind: 'ocean', label: 'たいへいよう', near: ['sea'] },
        { dir: 'east', kind: 'cliff', label: 'ひがしのやまなみ', near: ['home', 'river_lake'] },
      ],
      regions: {
        // layer: ground(地上) / below(水面下) / sky(上空) / memory(記憶)
        // mapX, mapY: 世界地図 ようの 論理座標。**ゲームの world 座標では ない**
        // axis: 図上の だえんの むき(度。0 = 北、時計まわり)
        // 谷: 二つの 山地に はさまれた ほそながい たに。おうち・かわ・みずうみ が ここに ならぶ
        home:        { layer: 'ground', mapX:  2.1, mapY:  0.4, axis: 175, climate: 'temperate',  terrain: ['home', 'grove'],            belt: 'valley',   river: 'beside' },
        river_lake:  { layer: 'ground', mapX:  2.55, mapY: 2.1, axis:   0, climate: 'temperate',  terrain: ['lake', 'river', 'marsh'],   belt: 'valley',   river: 'main' },
        countryside: { layer: 'ground', mapX: -1.3, mapY: -2.1, axis: 200, climate: 'temperate',  terrain: ['field', 'grove', 'river'],  belt: 'satoyama', river: 'branch' },
        forest:      { layer: 'ground', mapX:  0.4, mapY: -1.0, axis: 215, climate: 'cool-wet',   terrain: ['forest', 'creek', 'falls'], belt: 'forestbelt',river: null },
        mountain:    { layer: 'ground', mapX:  0.6, mapY:  3.5, axis:   0, climate: 'alpine',     terrain: ['mountain', 'lake', 'falls'],belt: 'head',     river: 'source' },
        snow:        { layer: 'ground', mapX: -0.2, mapY:  5.0, axis: 165, climate: 'subarctic',  terrain: ['snow', 'mountain', 'lake'], belt: 'beyond',   river: null },
        desert:      { layer: 'ground', mapX: -3.2, mapY:  1.4, axis: 250, climate: 'arid',       terrain: ['sand', 'mesa', 'oasis'],    belt: 'lee',      river: null },
        // 南西の 外洋を わたった さきの しま。本土とは 陸つづきに しない(まわりは ぜんぶ 海)
        jungle:      { layer: 'ground', mapX: -6.3, mapY: -7.8, axis:   0, climate: 'tropical',   terrain: ['jungle', 'swamp', 'ruin'],  belt: 'isle',     river: null, isle: true },
        // 分水界の むこう。峠を こえた べつの りゅういき
        city:        { layer: 'ground', mapX: -3.6, mapY: -3.0, axis: 200, climate: 'temperate',  terrain: ['city', 'river', 'hill'],    belt: 'lowland',  river: 'city' },
        sea:         { layer: 'ground', mapX: -1.2, mapY: -6.1, axis: 100, climate: 'mild-coast', terrain: ['shore', 'port', 'cape'],    belt: 'coast',    river: 'mouth' },
        // しんかい: うみの **がいようがわ** の した。ほしぞら: **いなかの やまのうえ**
        deepsea:     { layer: 'below',  mapX:  1.3, mapY: -6.7, axis: 100, climate: 'abyss',      terrain: ['deep'],                     belt: 'below',    river: null, depth: -1 },
        star_stop:   { layer: 'sky',    mapX: -1.6, mapY: -1.8, axis: 200, climate: 'starry',     terrain: ['sky'],                      belt: 'above',    river: null, height: 1 },
        // きおくのみずうみ: 地上の ざひょうを もたない。世界地図に 地域として のせない
        memory_lake: { layer: 'memory', mapX: null, mapY: null, axis: 0,   climate: 'still',      terrain: ['lake', 'mist'],             belt: 'memory',   river: null },
      },
      // ---- 地形の いみ(D)。地域では ない 地形が「あるいて いる とき / こえる とき」に
      //      どんな けしきに なるか。**え の ための データでは なく 世界の いみ** なので、
      //      canvas が Three.js に かわっても この まま つかえる。
      //      walk: その 地形の うえを あるけるか
      //      role: wall(こえられない かべ) / gate(こえる ところ) / edge(陸の はし) / flow(水の みち) / beyond(うみの むこう)
      //      near: その 地形が 見えて いる 地域
      //      far:  とおくから 見える ときの けしき
      //      cross: こえる 地域へ 入る ときの けしき(こえない 地形は null) ----
      scenery: {
        'tenryu':       { walk: true,  role: 'flow',   near: ['mountain', 'river_lake', 'home', 'sea'],
          far: 'たにの そこを みなみへ ながれる、はばの ある かわ。おうちの すぐ ひがしを とおる',
          cross: 'はしを わたる。水おとが 下から ずっと きこえて いる' },
        'source-lake':  { walk: false, role: 'flow',   near: ['river_lake', 'mountain'],
          far: 'たにの いちばん 上に ある 大きな みずうみ。かわは ここから はじまる', cross: null },
        'divide':       { walk: true,  role: 'gate',   near: ['countryside', 'city'],
          far: 'とおくに 見える ひくい おね。ここを さかいに 水の ながれる むきが かわる',
          cross: 'とうげを のぼりきると、うしろの たにが 見えなく なり、前に べつの りゅういきが ひらける' },
        'shonai':       { walk: true,  role: 'flow',   near: ['countryside', 'city', 'sea'],
          far: 'ぶんすいかいの むこうがわを、まちへ むかって ながれる かわ',
          cross: 'まちの かわぎしを あるく。かわは ゆっくりで、みずおとは しずか' },
        'west-range':   { walk: true,  role: 'gate',   near: ['snow', 'mountain', 'forest', 'countryside'],
          far: 'にしがわの やまち。みねが つづいて いて、ゆきの ある ところも ある',
          cross: 'のぼる ほど 木が ひくく なり、みねを こえると ゆきの においが する' },
        'east-range':   { walk: false, role: 'wall',   near: ['home', 'river_lake'],
          far: 'たにの ひがしを ふさぐ 大きな やまなみ。ずっと むこうに 見えて いるが、あるいては 行けない',
          cross: null },
        'bay':          { walk: false, role: 'edge',   near: ['city', 'sea'],
          far: 'まちの みなみに ひろがる いりえ。おだやかで、ふねの かげが ある', cross: null },
        'coast':        { walk: true,  role: 'edge',   near: ['city', 'sea'],
          far: '陸と 海の さかい。ここから さきは あるいて 行けない',
          cross: 'すなの うえを あるく。うしろは 陸、前は 水だけ' },
        'jungle-isle':  { walk: false, role: 'beyond', near: ['jungle'],
          far: '南西の 外洋に うかぶ しま。本土の かいがんせんからは、水のせんの むこうに 見えるだけ',
          cross: null },
        'jungle-islets':{ walk: false, role: 'beyond', near: ['jungle'],
          far: '主島の みなみひがしに つらなる ちいさな しまじま', cross: null },
      },
      // ---- 地形(feature): プレイヤーの みちとは べつ ----
      features: [
        // 【天竜川型】やまの 源流域 → かわ・みずうみ → たに(おうちの よこ) → 峡谷 → みなみ → 太平洋
        // とかい・湾へは **ながれない**
        { id: 'tenryu', kind: 'river', label: 'たにのおおかわ', width: 1,
          points: [
            { x:  1.20, y:  4.35, region: 'mountain',   note: 'げんりゅういき' },
            { x:  2.00, y:  3.75, region: 'river_lake', note: 'みなもとのみずうみ(諏訪湖型)' },
            { x:  2.45, y:  3.00, region: 'river_lake', note: 'かわのたき' },
            { x:  2.62, y:  2.10, region: 'river_lake', note: 'かみながれ' },
            { x:  2.66, y:  1.25, region: 'river_lake', note: 'かわぎし(しもながれ)' },
            { x:  2.62, y:  0.40, region: 'home',       note: '**おうちの すぐ ひがし**。まちは だんきゅうの うえ' },
            { x:  2.45, y: -0.55, region: 'home',       note: 'たにぞこ' },
            { x:  2.10, y: -1.60, region: 'home',       note: 'きょうこく' },
            { x:  1.45, y: -3.30, region: 'sea',        note: 'みなみへ' },
            { x:  0.35, y: -5.85, region: 'sea',        note: 'たいへいようへ そそぐ' },
          ] },
        // 【源の湖】諏訪湖型。天竜川型水系の **いちばん上流** にある 大きな湖。
        // ふつうの 世界地形です。**これ じたいは きおくのみずうみ では ありません。**
        // 霧の夜など、じょうけんが そろうと ここから 地図に ない 湖岸(記憶の層)へ 入れる、
        // という 世界観の 入口に なります(実装は Phase 2 いこう)
        { id: 'source-lake', kind: 'lake', label: 'みなもとのみずうみ',
          points: [
            { x:  1.38, y:  3.78, region: 'river_lake' },
            { x:  1.52, y:  4.05, region: 'river_lake' },
            { x:  1.85, y:  4.20, region: 'river_lake' },
            { x:  2.22, y:  4.18, region: 'river_lake' },
            { x:  2.52, y:  3.98, region: 'river_lake' },
            { x:  2.60, y:  3.70, region: 'river_lake' },
            { x:  2.42, y:  3.45, region: 'river_lake' },
            { x:  2.05, y:  3.34, region: 'river_lake' },
            { x:  1.66, y:  3.42, region: 'river_lake' },
            { x:  1.44, y:  3.60, region: 'river_lake' },
          ] },
        // 【分水界】いなかの おくの 峠。ここを さかいに 水の ながれる むきが かわる。
        // にしの山地の みなみの おねに かさねて、てんせんで しめす
        { id: 'divide', kind: 'divide', label: 'ぶんすいかい',
          points: [
            { x: -1.60, y: -1.80, region: 'countryside' },
            { x: -2.00, y: -2.45, region: 'countryside' },
            { x: -2.45, y: -3.15, region: 'countryside' },
            { x: -2.85, y: -3.85, region: 'countryside' },
          ] },
        // 【庄内川型】分水界の むこう → 山間部 → とかいの かわぞい → みなと → 湾
        // 天竜川型とは **べつの みずけい**。うわりゅうで つながって いない
        { id: 'shonai', kind: 'river', label: 'みやこがわ', width: 1,
          points: [
            // **分水界を こえた むこう側**から はじまる。いなかから ながれ出して 見えては いけない
            // ので、図の うえの 始点は 分水界の **とかい側** に おく(region は いなかの まま ＝
            // 「いなかの 峠から 見える、反対がわへ ながれて いく 水」という 見つけかた)
            { x: -2.95, y: -3.00, region: 'countryside', note: 'ぶんすいかいの むこうがわ(とかい側の げんりゅう)' },
            { x: -3.30, y: -3.55, region: 'city',        note: 'さんかんぶの ぼんち' },
            { x: -3.55, y: -4.15, region: 'city',        note: 'かわぞいのみち・まちのはし' },
            { x: -3.40, y: -4.70, region: 'city',        note: 'ふなつきば' },
            { x: -2.95, y: -5.35, region: 'sea',         note: 'みなと → わん' },
          ] },
        // 【西の山地】ゆきぐに — やま — もり。あるける がわ
        { id: 'west-range', kind: 'range', label: 'にしのやまち', width: 1,
          points: [
            { x:  0.15, y:  5.45, region: 'snow',     note: 'ゆきやま' },
            { x:  0.45, y:  4.70, region: 'snow',     note: 'きたのとうげ' },
            { x:  0.75, y:  3.95, region: 'mountain', note: 'ちょうじょう' },
            { x:  0.65, y:  3.20, region: 'mountain', note: 'やまみち' },
            { x:  0.45, y:  2.45, region: 'mountain', note: 'みなみへ のびる おね' },
            { x:  0.15, y:  1.70, region: 'mountain', note: 'やまの すそ' },
            { x: -0.15, y:  0.95, region: 'forest',   note: 'もりの うえの いわば' },
            { x: -0.45, y:  0.20, region: 'forest',   note: 'いしのもり' },
            { x: -0.80, y: -0.55, region: 'forest',   note: 'ふかい もりの おね' },
            { x: -1.15, y: -1.30, region: 'forest',   note: 'さとやまへの おね' },
            { x: -1.60, y: -1.80, region: 'countryside', note: 'ほしぞらへの やまのうえ' },
            { x: -2.00, y: -2.45, region: 'countryside', note: 'さとの うしろの やま' },
            { x: -2.45, y: -3.15, region: 'countryside', note: 'とうげへの のぼり' },
            { x: -2.85, y: -3.85, region: 'countryside', note: 'ぶんすいかいの とうげ' },
          ] },
        // 【東の山地】南アルプス型。たにの ひがしがわ。**あるけない。region でも ない。**
        // たにに 立てば 見える ので、おうち か かわ・みずうみ を 見つけると あらわれる。
        // しょうらい たにの 地域から「ひがしの 遠景」として つかえる ように、
        // 点の region は たにの 2地域だけに かぎって あります
        { id: 'east-range', kind: 'range', label: 'ひがしのやまなみ', width: 1,
          points: [
            { x:  4.10, y:  4.40, region: 'river_lake' },
            { x:  4.18, y:  3.70, region: 'river_lake' },
            { x:  4.24, y:  3.00, region: 'river_lake' },
            { x:  4.26, y:  2.30, region: 'river_lake' },
            { x:  4.24, y:  1.60, region: 'river_lake' },
            { x:  4.18, y:  0.90, region: 'home' },
            { x:  4.08, y:  0.20, region: 'home' },
            { x:  3.94, y: -0.50, region: 'home' },
            { x:  3.76, y: -1.20, region: 'home' },
            { x:  3.54, y: -1.90, region: 'home' },
            { x:  3.28, y: -2.60, region: 'home' },
            { x:  2.98, y: -3.25, region: 'home' },
            { x:  2.64, y: -3.85, region: 'home' },
            { x:  2.26, y: -4.40, region: 'home' },
          ] },
        // 【湾】とかいの みなみ。みやこがわが そそぐ
        { id: 'bay', kind: 'bay', label: 'わん',
          points: [
            { x: -2.90, y: -5.35, region: 'city' },
            { x: -3.70, y: -5.55, region: 'city' },
            { x: -3.80, y: -6.30, region: 'sea' },
            { x: -2.90, y: -6.55, region: 'sea' },
            { x: -2.30, y: -5.95, region: 'sea' },
          ] },
        // 南西の 外洋に うかぶ しま。**ジャングルを 見つける まで 1 てんも 出さない**
        { id: 'jungle-isle', kind: 'island', label: 'みなみにしの しま', needs: 'jungle',
          points: [
            { x: -5.55, y: -7.30, region: 'jungle' },
            { x: -5.90, y: -6.95, region: 'jungle' },
            { x: -6.55, y: -7.00, region: 'jungle' },
            { x: -7.05, y: -7.45, region: 'jungle' },
            { x: -7.15, y: -8.10, region: 'jungle' },
            { x: -6.70, y: -8.60, region: 'jungle' },
            { x: -6.05, y: -8.60, region: 'jungle' },
            { x: -5.60, y: -8.10, region: 'jungle' },
          ] },
        // 主島の みなみひがしへ つらなる こじま。本土の かいがんせんからは
        // じゅうぶん はなす(ちかいと「陸つづき」に 見えて しまう)
        { id: 'jungle-islets', kind: 'island', label: 'こじま', needs: 'jungle',
          points: [
            { x: -4.70, y: -9.05, region: 'jungle' },
            { x: -4.95, y: -8.87, region: 'jungle' },
            { x: -5.20, y: -9.05, region: 'jungle' },
            { x: -4.95, y: -9.23, region: 'jungle' },
          ] },
        // 【かいがんせん】湾の くちから ひがしへ。おくへ いくほど がいよう
        { id: 'coast', kind: 'coast', label: 'かいがんせん',
          points: [
            { x: -4.95, y: -5.70, region: 'city' },   // 本土の にしのはし。しまへは つながらない
            { x: -4.20, y: -6.05, region: 'city' },
            { x: -3.20, y: -6.35, region: 'sea' },
            { x: -2.00, y: -6.65, region: 'sea' },
            { x: -0.80, y: -6.80, region: 'sea' },
            { x:  0.40, y: -6.85, region: 'sea' },
            { x:  1.50, y: -6.80, region: 'sea' },
          ] },
      ],
      // ---- プレイヤーが 行き来できる みち ----
      // Phase 3A 監査(docs/qa/meguru-phase3a-connection-audit-2026-09-21.md)で
      // `forest|snow` を けした。もりから ゆきぐにへは **もり → やま → ゆきぐに**。
      // 山塊を 37% つらぬく ちょくつうろは 正式な みちに しない
      connections: [
        { id: 'snow|mountain', mouths: { snow: 'peak', mountain: 'summit' },      a: 'snow',       b: 'mountain',   kind: 'pass',    layer: 'ground', made: 'nature', label: 'おねのとうげ',       ends: ['奥', '奥'],
          // Phase 3B-2: どちらも おくが みね。「ちょうじょう」から 高山帯 → 森林限界 →
          // かぜの つよい 岩稜 → 雪線 → まんねんゆき と たどって ゆきぐにの みねへ。
          // あいだの 岩稜・雪線・まんねんゆきは region では ない ちけいなので land に もつ
          gate: { kind: 'walk', ends: {
            mountain: { spot: 'summit', dir: 'far', bearing: { x: 0, z: 1 },
              land: ['さいごの おね', 'しんりん げんかい', 'かぜの つよい いわお', 'のこりゆき', 'せっせん', 'まんねんゆき'] },
            snow:     { spot: 'peak',   dir: 'far', bearing: { x: 0, z: 1 },
              land: ['まんねんゆき', 'せっせん', 'のこりゆき', 'かぜの つよい いわお', 'しんりん げんかい', 'がんかいの みち'] } } },
          why: 'おなじ 山塊の うらおもて。どちらも おくが みね', from: '「ちょうじょう」から きたの おねを たどる',
          transition: ['がんかいのみち', 'かぜの くさはら', 'のこりゆき', 'まんねんゆき', 'ゆきはら'] },
        { id: 'forest|mountain', mouths: { forest: 'stonelook', mountain: 'lookout1' }, a: 'forest', b: 'mountain', kind: 'trail',  layer: 'ground', made: 'nature', label: 'やまみち',           ends: ['脇', '脇'], long: true,
          // Phase 3B-2: もりの ひがしの いわばから、木が まばらに なって しゃめんの
          // ほそいきへ。かんぼくの おびを ぬけると やまの「いちのてんぼう」。
          // **いきなり やまへ とばない**。あいだの しゃめん・いわ・かんぼくは land に もつ。
          //
          // やまがわに「とざんぐち」(z800)を つかわない りゆう:
          // 「ふもと」(z250・かわ・みずうみ用)の **まうえの おなじ 中心線**に あるので、
          // やまの なかから 口へ おりる と かならず さきに ひらいて しまい、
          // **mountain|river_lake へ あるいて 行けなく なる**。
          // 「いちのてんぼう」は x=+1050 と よこに ずれて いる ので、中心線の
          // のぼりおりを じゃましない(#5 の やくわり ぶんさん: foot=かわ / 東の てんぼう=もり / summit=ゆきぐに)
          gate: { kind: 'walk', ends: {
            forest:   { spot: 'stonelook', dir: 'far',  bearing: { x: 1, z: 1 },
              land: ['いしづみの あたり', 'きが まばらに なる', 'しゃめんの ほそいき', 'いわまじりの みち', 'かんぼくの おび', 'やまの みはらし'] },
            mountain: { spot: 'lookout1',  dir: 'near', bearing: { x: 1, z: -1 },
              land: ['やまの みはらし', 'かんぼくの おび', 'いわまじりの みち', 'しゃめんの ほそいき', 'きが ふえる', 'いしづみの あたり'] } } },
          why: 'もりは 山地の みなみの すそ。おねを きたへ たどると ちょうじょうへ 出る', from: '「いわばのみはらし」から ひがしの てんぼうへ つづく やまみちを みつける',
          transition: ['いしのもり', 'しゃめんの ほそいき', 'いわまじりのみち', 'かんぼく', 'いわば'] },
        { id: 'mountain|river_lake', mouths: { mountain: 'foot', river_lake: 'lakelook' }, a: 'mountain', b: 'river_lake', kind: 'lake', layer: 'ground', made: 'nature', label: 'たにのあたまのみずうみ', ends: ['口', '奥'],
          // Phase 3B-1: やまの「ふもと」から、げんりゅう → けいこく → たにぞこ → みずうみの きしへ。
          // **やまから いきなり こはんへ とばない**。あいだの いわ・たきつぼ・こはん は
          // region では ない ちけい(non-region geography)として land に もつ
          gate: { kind: 'walk', ends: {
            mountain:   { spot: 'foot',     dir: 'near', land: ['とざんぐちの てまえ', 'いわだらけの かわら', 'こけの いわ', 'たきつぼ', 'ながれが ゆるむ', 'みずうみの きし'] },
            river_lake: { spot: 'lakelook', dir: 'far',  land: ['みずうみの きし', 'ながれこむ さわ', 'たきつぼ', 'こけの いわ', 'いわだらけの かわら', 'やまの ふもと'] } } },
          why: '**たにのおおかわの みなもとは さんちょうでは なく、たにの あたまの 湖**', from: '「みずうみのてんぼう」の たいがんに「ふもと」が 見える',
          transition: ['いわ', 'こけのいわ', 'たきつぼ', 'こはん', 'かわぎし'] },
        { id: 'desert|mountain', mouths: { desert: 'gate', mountain: 'windnotch' }, a: 'desert',   b: 'mountain',   kind: 'pass',    layer: 'ground', made: 'nature', label: 'うかげのとうげ',     ends: ['口', '脇'], long: true,
          // Phase 3B-4: **うかげ(雨陰)の とうげ。**やまの おねを にしへ こえると、
          // あめが こえて こなく なって くさが きえる。かぜのきれめ → かわいた こうげん →
          // いわやま → されきち → すなやま、と かわく じゅんに ならべる。
          // mountain がわの やくわり ぶんさんは Phase 3B-1/3B-2 のまま:
          //   foot=かわ / いちのてんぼう=もり / ちょうじょう=ゆきぐに / かぜのきれめ=さばく
          gate: { kind: 'walk', ends: {
            desert:   { spot: 'gate',      dir: 'near', bearing: { x: 0, z: -1 },
              land: ['すなやまの ふち', 'すなの まじる ざれば', 'あかい されきち', 'いわやまの かげ', 'かわいた こうげん', 'かぜの きれめ'] },
            mountain: { spot: 'windnotch', dir: 'far',  bearing: { x: -1, z: 1 },
              land: ['かぜの きれめ', 'かわいた こうげん', 'いわやまの かげ', 'あかい されきち', 'すなの まじる ざれば', 'すなやまの ふち'] } } },
          why: '山地の うらがわは あめが こえて こない', from: '「かぜのきれめ」を にしへ ぬけると くさが きえる',
          transition: ['たにあい', 'かぜのきれめ', 'あかいれき', 'メサ', 'すなやま'] },
        // もりの **おく**(こけのかいだん)を のぼりきると、いなかの ちんじゅのもりへ 出る。
        // おうちがわの 口(もりのいりぐち)とは はんたいがわ ＝ もりを **ぬける** ことに なる
        { id: 'countryside|forest', mouths: { countryside: 'woods', forest: 'anc2' }, a: 'countryside', b: 'forest', kind: 'wood', layer: 'ground', made: 'nature', label: 'こけのかいだん',     ends: ['奥', '奥'],
          // Phase 2: どちらも **おく**から。もりを ぬけると 山里が ひらける
          gate: { kind: 'walk', ends: {
            forest:      { spot: 'anc2',  dir: 'far', land: ['こけのかいだん', 'きが ひらける', 'やまみち', 'はたけの けはい', 'しゅうらく'] },
            countryside: { spot: 'woods', dir: 'far', land: ['しゅうらく', 'はたけの けはい', 'やまみち', 'すぎの こだち', 'ふかい もり'] } } },
          why: 'もりの おくの こけむした 石の かいだんを のぼると、木が ひらけて 人の さとの もりへ 出る。butterfly / cicada が またぐ', from: '「こけのかいだん」を のぼりきる／「ちんじゅのもり」の おくへ',
          transition: ['はたけ', 'やしきりん', 'ぞうきばやし', 'ちんじゅのもり', 'あかるいもり'] },
        // Phase 3B-Final: **`countryside|river_lake` を けした。**
        // 山里の 水が たにの おおかわへ 合流する のは ほんとう だが、その 合流点は
        // **たにの なか = 地図では もりの いち**に ある。直通の 線は もりを 42.9%
        // (と おうちを 7.1%)つきぬけて いて、**ぜんぶの connection の なかで
        // よその region を 貫通して いたのは この 1 本だけ**だった(きょりも 最長 5.70)。
        // 「支流を くだって おおかわへ 出る」たいけんは、すでに
        //   `countryside|forest` + `home|forest` + `home|river_lake`
        // の みじかい 3 本が になって いる。`forest|snow` と おなじ りゆうで けす。
        // いなか ⇄ みずべ は もり けいゆ、もしくは まち → さばく → やま の にしまわりで 行ける。
        // → けった いきさつ: docs/qa/meguru-phase3b-final-countryside-river-2026-09-22.md
        // なお **`countryside.riverbank` と `river_lake.bank` の spot は のこして ある**。
        // どちらも ほかの みちと つながった ふつうの ばしょで、connection の
        // 出口 だった ことと spot が ある ことは べつ。
        // **おうち ↔ いなか の 直通は もたない。**あるいて 山里へ 行く ときは かならず もりを こえる。
        // (ただし 既存の「たび」では いままでどおり 直接 行き来できる。地理と たびは べつの しくみ)
        { id: 'home|forest', mouths: { home: 'bigtree', forest: 'entry' }, a: 'home', b: 'forest', kind: 'wood', layer: 'ground', made: 'people', label: 'もりへのみち', ends: ['奥', '口'],
          // Phase 2: おうちの おくの 大きな木から にしへ。木が ふえて もりの 口へ
          // bearing: **大きな木は 分かれみち**。もりへは おくへ すすみながら にしへ よる(Phase 3B-0)
          gate: { kind: 'walk', ends: {
            home:   { spot: 'bigtree', dir: 'far',  bearing: { x: -1, z: 1 }, priority: 0, land: ['いえなみの はずれ', 'はたけ', 'かじゅえん', 'ざつぼくりん', 'きが ふえる', 'もりの いりぐち'] },
            forest: { spot: 'entry',   dir: 'near', land: ['もりの いりぐち', 'きが へる', 'ざつぼくりん', 'かじゅえん', 'はたけ', 'いえなみ'] } } },
          why: '**おうちの おくの 大きな木は 分かれみち**。さかを おりれば たにの みずべ、にしへ 行けば はたけと かじゅえんの さきで 木が ふえて、やがて もりに なる', from: '「おおきなき」から にしへ。はたけの さきで 木が ふえる',
          transition: ['にわ', 'はたけ', 'かじゅえん', 'ざつぼくりん', 'こだち', 'あかるいもり'] },
        { id: 'home|river_lake', mouths: { home: 'bigtree', river_lake: 'riverside' }, a: 'home',   b: 'river_lake', kind: 'terrace', layer: 'ground', made: 'people', label: 'だんきゅうをおりるみち', ends: ['奥', '口'],
          // Phase 3B-1: **おおきなきは 分かれみち**。にしへ よれば もり、ひがしへ よれば
          // 段丘の ふちから さかを おりて たにの みずべ。おなじ spot に 出口が 2 つ ある ので
          // bearing で わける(priority 1 = まっすぐ なら これまでどおり もり)。
          // **木の よこから いきなり かわに 出ない**ように、あいだに 段丘・坂・河原を もつ
          gate: { kind: 'walk', ends: {
            home:       { spot: 'bigtree',   dir: 'far',  bearing: { x: 1, z: 1 }, priority: 1,
              land: ['いえなみの はずれ', 'だんきゅうの ふち', 'した から 水おと', 'さかみち', 'かわらの いしはら', 'かわぎしの ひろば'] },
            river_lake: { spot: 'riverside', dir: 'near',
              land: ['かわぎしの ひろば', 'かわらの いしはら', 'さかみち', 'だんきゅうの ふち', 'きが 見えて くる', 'おおきなき'] } } },
          why: '**おうちは たにぞこでは なく 段丘の うえ**。大きな木の さきの さかを おりると たにの みずべ', from: '「おおきなき」の さきの さかを おりる',
          transition: ['おおきなき', 'だんきゅうのふち', 'さかみち', 'かわらの いしはら', 'かわぎしのひろば'] },
        { id: 'city|countryside', mouths: { countryside: 'terracelook', city: 'cross4' }, a: 'city', b: 'countryside', kind: 'road', layer: 'ground', made: 'people', label: 'とうげのかいどう', ends: ['脇', '脇'], long: true,
          // Phase 3B-3: **となりまちの みちでは ない。**山里 → 山道 → 峠(ぶんすいかい) →
          // ながい くだり → 都市の そとがわ、と とおる 長距離の かいどう。
          // ここを こえると 水の ながれる むきが かわる(天竜川型 → 庄内川型)。
          // あいだの 山道・とうげ・くだり・こうがいは region では ない ちけいとして land に もつ
          gate: { kind: 'walk', ends: {
            countryside: { spot: 'terracelook', dir: 'far', bearing: { x: -1, z: 1 },
              land: ['たなだの うえ', 'やまあいの みち', 'とうげ(ぶんすいかい)', 'ながい くだり', 'はんたいがわの たに', 'まちの そとがわ'] },
            city:        { spot: 'cross4',      dir: 'far', bearing: { x: 0, z: 1 },
              land: ['まちの そとがわ', 'こうがいの ひらち', 'ながい のぼり', 'とうげ(ぶんすいかい)', 'やまあいの みち', 'たなだの うえ'] } } },
          why: '**分水界を こえる 人の 道**。ここを こえると 水の ながれる むきが かわる', from: '「たなだのてんぼう」から 峠の むこうの あかりが 見える',
          transition: ['たなだ', 'やまあいのみち', 'とうげ(ぶんすいかい)', 'はんたいがわのたに', 'さんかんぶのやど', 'しょうてんがい'] },
        { id: 'city|sea', mouths: { city: 'boatpier', sea: 'port' },              a: 'city',       b: 'sea',        kind: 'port',    layer: 'ground', made: 'people', label: 'かこうのみなと',     ends: ['脇', '口'],
          // Phase 3B-3: **みやこがわ(庄内川型)の かわぞい**を くだって 河口の みなとへ。
          // たにの おおかわ(天竜川型)とは べつの 水系で、上流では つながって いない。
          // **あるいて こえる みち**。ふねは ジャングルへの 1 本だけの まま ふやさない
          gate: { kind: 'walk', ends: {
            city: { spot: 'boatpier', dir: 'near', bearing: { x: 1, z: -1 },
              land: ['みやこがわの かわぞい', 'ていぼうの うえ', 'そうこがい', 'かこうの ひろがり', 'がんぺき', 'みなとの いりぐち'] },
            sea:  { spot: 'port',     dir: 'near', bearing: { x: 1, z: -1 },
              land: ['みなとの いりぐち', 'がんぺき', 'かこうの ひろがり', 'そうこがい', 'ていぼうの うえ', 'みやこがわの かわぞい'] } } },
          why: '**みやこがわが 湾に そそぐ ところに まちが ある**', from: '「ふなつきば」から かわを くだって「みなと」へ',
          transition: ['かわぞいのみち', 'そうこがい', 'うんが', 'がんぺき', 'みなと', 'すなはま'] },
        // ---- ジャングル島への みち = **special sea connection**(ふつうの 徒歩の みちでは ない) ----
        // ジャングルは 南西の 外洋に うかぶ しま。本土とは 陸つづきでは ない ので、
        // うみの みなとから ふねで わたる。じっさいの こうろ・ふね・かいしゃの さいげんでは なく、
        // なおとっち独自の 海上移動。`sea` は **え の ための データでは なく
        // world / simulation の いみの データ**で、Three.js で ほんとうに ふねが
        // 海面を すすむ ように なっても この まま つかえる(#36)
        { id: 'jungle|sea', mouths: { jungle: 'entry', sea: 'breakwater' },       a: 'jungle',     b: 'sea',        kind: 'sea',     layer: 'ground', made: 'people', label: 'しまわたりのこうろ', ends: ['口', '脇'], long: true,
          special: 'sea',
          sea: {
            // のりもの。**実在の ふね・こうろ・かいしゃの なまえは つかわない**。ごうかきゃくせんでも ない
            ride: { id: 'shimawatari-boat', name: 'しまわたりのふね', kind: 'boat', size: 'small' },
            from: { region: 'sea',    layer: 'ground', anchor: 'breakwater', role: 'harbour' },
            to:   { region: 'jungle', layer: 'ground', anchor: 'entry',      role: 'landing' },
            layerFrom: 'ground', layerTo: 'ground',
            // わたる 海は **region では ない**。non-region geography として もつ(#37)。
            // global world / Three.js では ここが ほんとうの 海面として つながる
            waters: { id: 'southwest-open-sea', label: 'みなみにしの がいよう', region: null, role: 'beyond',
              far: '湾の そとの ひろい うみ。うしろの 陸が ひくく なり、まえに なにも ない 水平線が つづく',
              note: 'region では ない。本土と しまの あいだの 外洋' },
            // たびの だんかい。anchor が null の ところは 海の うえ(region が ない)
            stages: [
              { id: 'approach', move: 'walk', region: 'sea',    anchor: 'port',       note: 'みなとを とおって がんぺきの さきへ' },
              { id: 'board',    move: 'walk', region: 'sea',    anchor: 'breakwater', note: 'ぼうはていの のりば。ここから さきは 水' },
              { id: 'depart',   move: 'boat', region: null,     anchor: null,         note: 'みなとが うしろへ しりぞく' },
              { id: 'sail',     move: 'boat', region: null,     anchor: null,         note: '外洋。まわりが 水だけに なる' },
              { id: 'arrive',   move: 'boat', region: null,     anchor: null,         note: 'みなみにしに しまかげ。ちかづくと かいがんと こい もりが 見えて くる' },
              { id: 'land',     move: 'walk', region: 'jungle', anchor: 'entry',      note: 'すなの きしへ 上がる。そこが ジャングル' },
            ],
          },
          // Phase 2.1 と おなじ しくみで じっさいに のる。way は `sail`
          gate: { kind: 'sea', action: 'ふねに のる', verb: 'しまへの ふねに のる',
            ends: { sea:    { spot: 'breakwater', dir: 'ride', action: 'ふねに のる', verb: 'みなみにしの しまへ わたる',
                              land: ['みなとを はなれる', 'がいよう', 'しまかげが 見えて くる', 'かいがんが ちかづく'] },
                    jungle: { spot: 'entry',      dir: 'ride', action: 'ふねに のる', verb: 'ほんどへ もどる',
                              land: ['しまを はなれる', 'がいよう', 'ほんどが 見えて くる', 'みなとが ちかづく'] } } },
          why: '**ジャングルは 南西の 外洋に うかぶ しま**。うみの ぼうはていから ふねで わたる。あるいては 行けない', from: '「みなと」の さきの「ぼうはてい」から',
          transition: ['みなと', 'がんぺき', 'ぼうはてい', 'みなとが とおざかる', 'がいよう', 'しまかげ', 'かいがん', 'こい もり'] },
        // ---- `desert|jungle`「ほねのたにま」は **さくじょ**(2026-09-20) ----
        // ジャングルを 南西の 外洋の しまに した ので、さばく(北西)から ジャングルまでは
        // 海を 9.7 めもり わたる ことに なり、徒歩の みちとしては せいりつ しない。
        // 北西の すなの せかい と 南西の 外洋の しま は、べつの むきの そとへりの 地域。
        // (「たび」では いままでどおり 行き来できる。**地理と たびは べつの しくみ**)
        { id: 'city|desert', mouths: { city: 'stalls', desert: 'caravan' },       a: 'city',       b: 'desert',     kind: 'caravan', layer: 'ground', made: 'people', label: 'キャラバンのかいどう', ends: ['脇', '脇'], long: true,
          // Phase 3B-4: **まちの となりが いきなり すなの せかいでは ない。**
          // いちばの はずれ → かわいた こうがい → あれち → かぜの みち → すなち、と
          // だんだん みどりが きえて いく 長距離の こうえきろ。人が つくった みち なので
          // ちけいの みちでは なく、やどと いちばを つなぐ かいどうとして かく。
          // あいだの こうがい・あれち・かぜの みち・すなちは region では ない ちけい
          gate: { kind: 'walk', ends: {
            city:   { spot: 'stalls',  dir: 'far',  bearing: { x: -1, z: 1 },
              land: ['いちばの はずれ', 'かわいた こうがい', 'くさの まばらな あれち', 'かぜの つよい みち', 'すなちの はじまり', 'すなやまの せかい'] },
            desert: { spot: 'caravan', dir: 'near', bearing: { x: 1, z: -1 },
              land: ['すなやまの せかい', 'すなちの はじまり', 'かぜの つよい みち', 'くさの まばらな あれち', 'かわいた こうがい', 'いちばの はずれ'] } } },
          why: 'ちけいでは なく 人が つくった ちょうきょり こうえきろ。desert に「キャラバンのあたり」が じっさいに ある', from: '「キャラバンのあたり」で らくだの あとを たどる／まちの いちばで すなの におう にもつを 見る',
          transition: ['しょうてんがい', 'かいどうのやど', 'いしだらけのひらち', 'キャラバンのあたり'] },
        { id: 'deepsea|sea', mouths: { deepsea: 'reef', sea: 'seacave' },         a: 'deepsea',    b: 'sea',        kind: 'dive',    layer: 'down',   made: 'nature', label: 'がいようのたなのふち', ends: ['口', '奥'],
          // Phase 2: 外洋がわの どうくつから もぐる。ゴンドラと おなじ しくみの たてじく(むきは 下)
          gate: { kind: 'vertical', dir: 'down', action: 'もぐる', verb: 'ふかい うみへ もぐる',
            ends: { sea: { spot: 'seacave', dir: 'ride', action: 'もぐる', verb: 'そこへ もぐる' }, deepsea: { spot: 'reef', dir: 'ride', action: 'うかぶ', verb: 'みなもへ うかぶ' } } },
          why: '**湾では なく、岬の そとの 外洋**。棚の ふちで きゅうに おちる', from: '「かいしょくどうくつ」の おく',
          transition: ['はてのはま', 'あさせ', 'もば', 'あさせのたな', 'たなのふち', 'おちこみ'] },
        // ---- ほしぞらへの みち = **special vertical connection**(ふつうの 徒歩の みちでは ない) ----
        // 山里の 日常 → 古い鳥居(さかいめ) → もりの 山道 → ひらけた 山ろくの のりば →
        // **ゴンドラ**で 上空層へ。じっさいの しせつの さいげんでは なく、なおとっち独自の
        // 「日常から とくべつな せかいへ 上がる」たいけん。
        // `vertical` は **え の ための データでは なく world / simulation の いみの データ**。
        // Three.js で ほんとうに ゴンドラを うごかす ときも この まま つかえる(#23)
        { id: 'countryside|star_stop', mouths: { countryside: 'torii', star_stop: 'stop' }, a: 'countryside', b: 'star_stop', kind: 'sky', layer: 'up', made: 'nature', label: 'やまのうえのいりぐち', ends: ['奥', '口'],
          special: 'vertical',
          vertical: {
            dir: 'up',                                   // たてじくの むき
            from: { region: 'countryside', layer: 'ground', anchor: 'torii', role: 'gate' },
            to:   { region: 'star_stop',   layer: 'sky',    anchor: 'stop',  role: 'arrival' },
            // のりもの。**実在の しせつでは ない**。名まえは かり(Phase 2 の まえに きめなおす)
            ride: { id: 'hoshizora-gondola', name: 'そらのゴンドラ', kind: 'gondola' },
            // たびの だんかい。anchor が null の ところは **Phase 2 で spot を おく よてい**で、
            // いまは spot を 1 つも ふやして いない
            stages: [
              { id: 'approach', move: 'walk',    region: 'countryside', anchor: 'woods', note: 'むら → おか → ちんじゅのもり' },
              { id: 'gate',     move: 'walk',    region: 'countryside', anchor: 'torii', note: 'ふるいとりい。ここから さきは 山の りょういき' },
              { id: 'trail',    move: 'walk',    region: 'countryside', anchor: 'mountpath', note: 'もりの 山道。すこし のぼる' },
              { id: 'board',    move: 'walk',    region: 'countryside', anchor: 'skyland',   note: 'もりが ひらけた 山ろくの のりば' },
              { id: 'ride',     move: 'gondola', region: null,          anchor: null,    note: '地上が とおざかる。たに・おうち・かわ・二つの 山地が 下に' },
              { id: 'arrive',   move: 'walk',    region: 'star_stop',   anchor: 'stop',  note: 'ほしぞらの ていりゅうじょ' },
            ],
          },
          // Phase 2: じっさいに のる。のりばは 鳥居では なく、山道の さきの「そらのりば」
          gate: { kind: 'vertical', dir: 'up', action: 'のる', verb: 'そらのゴンドラに のる',
            ends: { countryside: { spot: 'skyland', dir: 'ride', action: 'のる', verb: 'そらのゴンドラに のる' }, star_stop: { spot: 'stop', dir: 'ride', action: 'のる', verb: 'そらのゴンドラで おりる' } } },
          why: '**山里の おくの 古い鳥居から 山へ 入り、山道の さきの のりばから 上空層へ**。phoenix / god / star が やま・ゆきぐに・ほしぞら を またぐ', from: '「ふるいとりい」の さきの 山道を のぼり、ひらけた 山ろくの のりばから／そだち70',
          transition: ['ちんじゅのもり', 'ふるいとりい', 'やまみち', 'すぎが たかくなる', 'もりが ひらける', 'やまろくの のりば', 'そらが ひらける', 'くものした', 'ていりゅうじょ'] },
        { id: 'memory_lake', a: 'memory_lake', b: null,                            kind: 'memory',  layer: 'memory', made: 'nature', label: 'きりのよる',         ends: ['—', '—'], hidden: true,
          why: 'たにの おおかわには、ゆきの りょうでは せつめいの つかない みずが ながれて いる。地上の ざひょうを もたない', from: 'きりの よる、しずかな みずべで',
          transition: ['きりが こくなる', 'おとが きえる', 'きし'] },
      ],
    };
    // ====== Phase 4B: REGION_FRAME(物理 global への おきかた)と local ↔ global 変換 ======
    // ねらい(Phase 4A 案 B「アトラス方式」):
    //   なおとっち世界は **1 枚の 紙では なく 地図帳**。地域ごとの world(chart)は
    //   「その土地を 歩ける 縮尺で かいた 1 ページ」で、REGION_FRAME は
    //   **その ページが せかいの どこに どちらを むいて おかれて いるか** を もつ。
    //
    // **この そうは Phase 4B では だれも つかって いない。**
    //   えがき(Canvas)・あたりはんてい・住民・カメラ・セーブ・世界地図は 1 つも よばない。
    //   ここを まるごと けしても ゲームの うごきは 1 ミリも 変わらない(テストで しばって いる)。
    //   はじめて つかうのは Phase 4C の corridor(「〇〇は あちら / およそ □□」)。
    //
    // だいじな きまり:
    //   ・**local 座標は 1 つも 書きかえない。** この そうは そとがわに たすだけ
    //   ・**yaw は 必須で、まるめない。** 平行移動だけでは connection が とじない
    //       (Phase 4A 実測: 平行移動のみ RMS 3438 / 回転あり RMS 71 / 45°きざみ 2222)
    //   ・**global 座標は セーブしない。** いつでも region + local から みちびける
    //   ・**global から region を ぎゃくびき する かんすうは 作らない。**
    //       chart は たがいに かさなる(Phase 4A: 45 くみ中 43 くみ)ので 一意に きまらない
    //   ・**mapX / mapY は つかわない。** 世界地図は たんさく UI の ひょうげんで、
    //       REGION_FRAME は 物理 simulation の transform。べつの そう(Phase 4A §19)
    //
    // せかいの むき: **global +Z = 北 / +X = 東**。ほういかくは 北から 時計まわり。
    //
    // 高さ(y)は **いみの そう**。ground = 0 を きじゅんに、そらは +、うみの そこは −。
    // 4800 / −1600 という かずは **かりの もの**で、3D の ほんとうの 縮尺は Phase 4C で きめる。
    // ここで しばるのは 「star_stop は 上 / deepsea は 下 / ground は きじゅん」という **かんけい だけ**。
    const REGION_LAYER_Y = { ground: 0, sky: 4800, below: -1600 };

    // --- かずの 出どころ ---
    // 1. **geography canon(§12)が さいゆうせん**: せかい ぜんたいの むきは、
    //    「西に やま / 北に ゆきぐに / 北西に さばく / 南〜南西に もり → いなか / 峠の むこうに とかい /
    //     その さきに うみ / 南西の 外洋に しま」に いちばん あう 角へ そろえた。
    // 2. **connection closure が つぎ**: walk 10 本の 両はしの mouth を global に うつした ときの
    //    ずれを 最小二乗で といた。**さいだい 84 / RMS 53**(目標 < 400、Phase 4A の 144 より よい)。
    // 3. **世界地図の 見ため は さいご**: mapX / mapY への あてはめは して いない(§15)。
    //
    // **わかった こと(Phase 4B の いちばん だいじな 発見)**:
    //   canon の ほういと closure は **どちらも 立てられない**。chart が 1.51 ばい かさなって いる
    //   ので、chart の 中心を canon の ほうがくに ならべると connection が とじなくなる。
    //   おもみを ふって 測ると、closure を こわしても ほういの ずれは 111° より 下がらなかった。
    //   → **closure(物理)が かたちを きめ、canon は せかい ぜんたいの むきを きめる**、と した。
    //   → canon の 「どの地域が どっち」は **世界地図(mapX/mapY)の そうが もちつづける**(§15)。
    //
    // **この かずは `tools/meguru-region-frame-solve.cjs` で みちびきなおせる。**
    //   node tools/meguru-region-frame-solve.cjs  → この ひょうが そのまま 出る(らんすうは つかって いない)
    const REGION_FRAME = {
      // 世界の 中心。飯田型の たに。origin は chart の local (0,0)(ろうかの 口がわ 中心)
      home:        { x:      0, y:     0, z:     0, yaw: 4.3555, layer: 'ground' },
      // 峠・分水界の むこう。べつの 水系
      city:        { x:  -4010, y:     0, z:   110, yaw: 4.0187, layer: 'ground' },
      // もりの さき。田んぼと 畑
      countryside: { x:  -2770, y:     0, z: -1730, yaw: 4.9220, layer: 'ground' },
      // おうちの 南〜南西。弓なりの 山脈の 南はし
      forest:      { x:  -2130, y:     0, z: -1000, yaw: 4.8819, layer: 'ground' },
      // にしの山地。弓の まんなか
      mountain:    { x:  -6160, y:     0, z:  4170, yaw: 2.8909, layer: 'ground' },
      // 北。行くほど 高く 寒く なる。弓の 北はし
      snow:        { x:    -10, y:     0, z:  1810, yaw: 3.7507, layer: 'ground' },
      // とかいがわ 水系の 河口・湾
      sea:         { x:  -3810, y:     0, z:  -150, yaw: 4.3410, layer: 'ground' },
      // 大河の 水系。おうちの となり
      river_lake:  { x:  -2180, y:     0, z: -1630, yaw: 5.8915, layer: 'ground' },
      // 南西の 外洋の しま。**うみの ぼうはていから 外洋を ひとわたり(= うみの おくゆき 8000)した さき**。
      // closure では しばらない(ふねの transport edge)
      jungle:      { x: -13890, y:     0, z: -6760, yaw: 3.9270, layer: 'ground' },
      // 北西の 砂丘の せかい
      desert:      { x:  -4480, y:     0, z:  -870, yaw: 2.9692, layer: 'ground' },
      // **いなかの「やまろくの のりば」の ほぼ 真上**(ゴンドラは たてに のぼる)。
      // X/Z の ずれ 1046 は ゴンドラが よこにも すすむ ぶん。closure では しばらない
      star_stop:   { x:  -9340, y:  4800, z:  1940, yaw: 5.4806, layer: 'sky' },
      // **うみの「かいしょくどうくつ」の 真下**(もぐるのは たて。X/Z の ずれ 3)。closure では しばらない
      deepsea:     { x:  -9500, y: -1600, z: -1940, yaw: 4.3410, layer: 'below' },
      // きおくのみずうみ は **わざと ない**。地上の ざひょうを もたない(Phase 4A §8)。
      // frame を あたえると「きおくのみずうみまで 12 万たんい」と 言えて しまう
    };

    // frame を もつ 地域(= きおくのみずうみ いがいの 12)
    const FRAMED_REGIONS = Object.keys(REGION_FRAME);
    // その 地域が 通常の global 地理に いるか。きおくのみずうみ だけ false
    const hasFrame = (regionId) => Object.prototype.hasOwnProperty.call(REGION_FRAME, regionId);
    const regionFrame = (regionId) => (hasFrame(regionId) ? REGION_FRAME[regionId] : null);

    // ---- local ↔ global の 純関数 ----
    // ぜんぶ REGION_FRAME と ひきすう だけを 見る。state も world も よまない。
    // frame を もたない 地域(きおくのみずうみ)・しらない id は **null** を かえす。
    // null は 「エラー」では なく 「通常の global 地理の そとに ある」という こたえ。

    // region-local の 点 → global の 点。{ x, y, z } を かえす
    function toGlobal(regionId, p) {
      const f = regionFrame(regionId);
      if (!f || !p) return null;
      const c = Math.cos(f.yaw), s = Math.sin(f.yaw);
      const x = Number(p.x) || 0, z = Number(p.z) || 0;
      return { x: f.x + x * c + z * s, y: f.y, z: f.z - x * s + z * c };
    }
    // global の 点 → **その region の** local。どの region かは よびだしがわが しる
    // (chart が かさなる ので、global から region は ぎゃくびき できない)
    function toLocal(regionId, g) {
      const f = regionFrame(regionId);
      if (!f || !g) return null;
      const c = Math.cos(f.yaw), s = Math.sin(f.yaw);
      const dx = (Number(g.x) || 0) - f.x, dz = (Number(g.z) || 0) - f.z;
      return { x: dx * c - dz * s, z: dx * s + dz * c };
    }
    // むき(ベクトル)の 変換。いちを もたない ので origin は たさない。
    // gate の bearing(region-local)や カメラの むきを global へ うつす ときに つかう
    function dirToGlobal(regionId, d) {
      const f = regionFrame(regionId);
      if (!f || !d) return null;
      const c = Math.cos(f.yaw), s = Math.sin(f.yaw);
      const x = Number(d.x) || 0, z = Number(d.z) || 0;
      return { x: x * c + z * s, z: -x * s + z * c };
    }
    function dirToLocal(regionId, d) {
      const f = regionFrame(regionId);
      if (!f || !d) return null;
      const c = Math.cos(f.yaw), s = Math.sin(f.yaw);
      const x = Number(d.x) || 0, z = Number(d.z) || 0;
      return { x: x * c - z * s, z: x * s + z * c };
    }
    // かくど(ラジアン、0 = その region の +z)を global の ほういかく(0 = 北)へ。
    // camera.yaw と おなじ ならべかたなので、3D でも そのまま つかえる
    function yawToGlobal(regionId, yaw) {
      const f = regionFrame(regionId);
      if (!f || !Number.isFinite(yaw)) return null;
      return wrapAngle(yaw + f.yaw);
    }
    function yawToLocal(regionId, yaw) {
      const f = regionFrame(regionId);
      if (!f || !Number.isFinite(yaw)) return null;
      return wrapAngle(yaw - f.yaw);
    }

    // ====== Phase 4C: corridor(地域と 地域の あいだの みち)と global graph ======
    // REGION_FRAME を はじめて 「いみの ある データ」に つかう そう。
    //
    //   region A ── corridor ── region B
    //
    // corridor は **うつしかえでは なく 生成物**。正本は つぎの じゅんで、corridor は ここから みちびく:
    //   1. WORLD_GEOGRAPHY.connections(どこと どこが つながるか・のりもの・ことば)
    //   2. gate の いみデータ(gate.ends[region] の 出口 spot・むき・land 6 段)。regionGates() が よむ のと おなじ もの
    //   3. REGION_FRAME(global への おきかた)
    // 手で うつした かずは 1 つも もたない(STAGE_LEN だけは 実測の めやす。下の コメント)。
    //
    // **まだ だれも つかって いない。** えがき・あたりはんてい・住民・なかま・カメラ・セーブ・世界地図・
    // travelToRegion() は よばない。はじめて よんだ ときに 1 どだけ 組み立てて とっておく(毎フレーム つくらない)。
    //
    // だいじな きまり(Phase 4B の 申し送り):
    //   ・**方角に chart の 中心は つかわない**(chart が 1.51 ばい かさなる ので 中心は だんごに なる)
    //   ・**walk の globalFrom → globalTo も 方角に つかわない**。両はしは closure で 84 いない に よって いて、
    //     その ちいさな ずれ(closure の のこり)の むきは ほぼ ノイズ
    //   ・方角は **gate を 出て いく むき(leave)** を global に うつした もの
    //
    // わかった こと(Phase 4C): **corridor は まがって いる**。
    //   A を 出る むき(leave)と B へ 入る むき(enter)が 一致しない(walk 10 本で 43〜178°)。
    //   REGION_FRAME を「むきも つながる」ように 解きなおしても、closure を こわしながら RMS 70° より 下がらない
    //   (実測。docs/handoff/meguru-phase4c-corridor-2026-09-23.md)。
    //   chart は 1 まいずつ べつに かかれた 地図帳の ページで、gate の むきも ページごとに かかれて いる ため。
    //   → leave と enter を べつべつに もち、その さを bend として のこす。
    //   → 「○○は あちら」は **その gate を 出る むき(leave)**。その ばしょで じっさいに あるく むき なので、いつも 正しい。

    // land 1 段の ながさ(world たんい)。**となりあう 地区の 中心どうしの きょりの 中央値 1576**(四分位 1256〜1874、
    // 13 地域 165 くみ を 実測)を まるめた もの。land の 1 段(はたけ・ざつぼくりん・かわいた こうげん…)は
    // 地区 1 つ ぶんの けしきの おび、と みる
    const CORRIDOR_STAGE_LEN = 1600;
    // こえかたごとの 「ほねおり」。**TRANSITION の span の 合計を walk と くらべた ひ**(じぶんで かずを 足さない)。
    // (むきで ちがう: のぼり up は くだり down より ほねがおれる)
    // walk 1.25s / up 2.95s / down 2.50s / sail 3.35s → 1 / 2.36 / 2.00 / 2.68
    const spanOf = (way) => { const sp = (TRANSITION.ways[way] || TRANSITION.ways.walk).span; return sp.approach + sp.cross + sp.arrive + sp.settle; };
    const CORRIDOR_WAY_FACTOR = Object.freeze({ walk: 1, up: spanOf('up') / spanOf('walk'), down: spanOf('down') / spanOf('walk'), sail: spanOf('sail') / spanOf('walk') });
    // 8 方位。ゲームの ことばに あわせて ひらがな(正本にも「みなみにしの がいよう」が ある)
    const COMPASS8 = [
      { kana: 'きた', kanji: '北' }, { kana: 'きたひがし', kanji: '北東' }, { kana: 'ひがし', kanji: '東' }, { kana: 'みなみひがし', kanji: '南東' },
      { kana: 'みなみ', kanji: '南' }, { kana: 'みなみにし', kanji: '南西' }, { kana: 'にし', kanji: '西' }, { kana: 'きたにし', kanji: '北西' },
    ];
    // ほういかく(度。0 = 北、とけいまわり)。むきを もたない ときは null
    const headingOf = (d) => (d && (d.x || d.z) ? ((Math.atan2(d.x, d.z) * 180 / Math.PI) + 360) % 360 : null);
    const unit = (d) => { const L = Math.hypot(d.x, d.z); return L > 0 ? { x: d.x / L, z: d.z / L } : null; };
    // ほういかく → 8 方位の ことば
    function compassLabel(deg) {
      if (!Number.isFinite(deg)) return null;
      const i = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
      return Object.assign({ index: i, deg: i * 45 }, COMPASS8[i]);
    }
    // gate の 出口の むき(region-local)。bearing が あれば それ、なければ 口(near)= −z / 奥(far)= +z
    const corridorOutward = (end) => {
      if (end && end.bearing) return unit({ x: Number(end.bearing.x) || 0, z: Number(end.bearing.z) || 0 });
      if (end && end.dir === 'near') return { x: 0, z: -1 };
      if (end && end.dir === 'far') return { x: 0, z: 1 };
      return null;   // のりば(ride)は あるく むきを もたない
    };
    const spotOf = (regionId, spotId) => ((WORLDS[regionId] && WORLDS[regionId].spots) || []).find((q) => q.id === spotId) || null;

    // 1 本の connection から corridor を 1 本 つくる。ends は gate.ends と おなじ かたち(region ごと)
    function buildCorridor(c) {
      const g = c.gate, E = g.ends || {};
      const kind = g.kind === 'walk' ? 'walk' : g.kind === 'sea' ? 'sea' : 'vertical';
      const special = c.sea || c.vertical || null;
      const ride = special && special.ride ? { id: special.ride.id, name: special.ride.name, kind: special.ride.kind } : null;
      const layerOf = (r) => (WORLD_GEOGRAPHY.regions[r] || {}).layer || 'ground';
      const ends = {}, ways = {};
      for (const r of [c.a, c.b]) {
        const other = r === c.a ? c.b : c.a;
        const e = E[r] || {}, spot = spotOf(r, e.spot), at = spot ? toGlobal(r, spot) : null;
        const out = corridorOutward(e), leave = out ? dirToGlobal(r, out) : null;
        ends[r] = { region: r, spot: e.spot || null, mouth: c.mouths ? c.mouths[r] : null,
          layer: regionFrame(r) ? regionFrame(r).layer : null, at, leave: leave ? unit(leave) : null,
          land: Array.isArray(e.land) ? e.land.slice() : [] };
        // **こえかたは むきで かわる**(しんかいへは down、しんかいからは up)。
        // regionGates() と おなじ きめかた(gate の kind、たては layer の さ)
        ways[r] = kind === 'walk' ? 'walk' : kind === 'sea' ? 'sail' : wayBetween(layerOf(r), layerOf(other));
      }
      const A = ends[c.a], B = ends[c.b];
      const gap = A.at && B.at ? Math.hypot(B.at.x - A.at.x, B.at.z - A.at.z) : null;
      // 「どんな 段を とおるか」。walk は land 6 段、ふね / ゴンドラ は 正本の stages、もぐる は transition の ことば。
      // ふね / ゴンドラ / もぐる の 段は **正本に かかれた むき**(origin → そのさき)で ならんで いる。
      // origin は 段に かかれた region(ふね: うみ、ゴンドラ: いなか)、なければ gate.dir の むきで こえる がわ
      let stages, origin = c.a;
      if (kind === 'walk') stages = A.land.map((label) => ({ label, move: 'walk' }));
      else if (special && Array.isArray(special.stages)) {
        stages = special.stages.map((st) => ({ label: st.note || st.id, id: st.id, move: st.move }));
        const first = special.stages.find((st) => st.region === c.a || st.region === c.b);
        origin = first ? first.region : c.a;
      } else {
        origin = ways[c.a] === g.dir ? c.a : c.b;
        stages = (c.transition || []).map((label) => ({ label, move: g.dir === 'down' ? 'dive' : 'rise' }));
      }
      const travelLength = stages.length * CORRIDOR_STAGE_LEN;
      const costs = {};
      for (const r of [c.a, c.b]) costs[r] = travelLength * CORRIDOR_WAY_FACTOR[ways[r]];
      return Object.freeze({
        id: c.id, kind, ride, label: c.label || null, a: c.a, b: c.b, ends, ways, origin,
        // 両はしの X/Z の はなれ。**walk は closure の のこり(みちの ながさでは ない)**、
        // sea は ほんとうに わたる 外洋、vertical は のりものの よこずれ
        physicalGap: gap, gapKind: kind === 'walk' ? 'closure' : kind === 'sea' ? 'crossing' : 'drift',
        heightDelta: A.at && B.at ? B.at.y - A.at.y : 0,
        stages, travelStages: stages.length, travelLength, costs,
        // walk: A を 出る むき と B へ 入る むき の さ(0° = まっすぐ)
        bend: kind === 'walk' && A.leave && B.leave ? Math.acos(Math.max(-1, Math.min(1, -(A.leave.x * B.leave.x + A.leave.z * B.leave.z)))) * 180 / Math.PI : null,
      });
    }

    // ぜんぶの corridor。**きおくのみずうみ は 入れない**(b が ない・frame が ない)。
    // さいしょに よばれた ときに 1 どだけ 組み立てる
    let corridorCache = null;
    function worldCorridors() {
      if (corridorCache) return corridorCache;
      const list = WORLD_GEOGRAPHY.connections
        .filter((c) => c.b && c.gate && hasFrame(c.a) && hasFrame(c.b))
        .map(buildCorridor);
      corridorCache = Object.freeze(list);
      return corridorCache;
    }

    // corridor を 「from から 見た むき」に する。from / to を いれかえ、land は from がわの ものを つかう
    const RISE_OF = { dive: 'rise', rise: 'dive' };
    function orientCorridor(cor, fromRegion) {
      if (!cor || (fromRegion !== cor.a && fromRegion !== cor.b)) return null;
      const toRegion = fromRegion === cor.a ? cor.b : cor.a;
      const F = cor.ends[fromRegion], T = cor.ends[toRegion];
      const flip = fromRegion !== cor.a;
      // 入る むき = 着いた がわの 出口の はんたい
      const enter = T.leave ? { x: -T.leave.x, z: -T.leave.z } : null;
      // 方角: walk は 出る むき、sea は ほんとうに わたる むき、vertical は うえ / した
      let heading = null, vertical = null;
      const dy = (flip ? -cor.heightDelta : cor.heightDelta) || 0;   // -0 に しない
      if (cor.kind === 'walk') heading = headingOf(F.leave);
      else if (cor.kind === 'sea') heading = F.at && T.at ? headingOf({ x: T.at.x - F.at.x, z: T.at.z - F.at.z }) : null;
      else vertical = dy > 0 ? 'up' : 'down';
      // 段: walk は from がわの land。ほかは origin から かかれて いるので、from が origin で なければ さかさに
      const stages = cor.kind === 'walk' ? F.land.map((label) => ({ label, move: 'walk' }))
        : fromRegion === cor.origin ? cor.stages.map((st) => Object.assign({}, st))
          : cor.stages.slice().reverse().map((st) => Object.assign({}, st, { move: RISE_OF[st.move] || st.move }));
      return { id: cor.id, kind: cor.kind, way: cor.ways[fromRegion], ride: cor.ride, from: fromRegion, to: toRegion,
        fromSpot: F.spot, toSpot: T.spot, globalFrom: F.at, globalTo: T.at,
        leave: F.leave, enter, heading, vertical, compass: compassLabel(heading),
        physicalGap: cor.physicalGap, gapKind: cor.gapKind, heightDelta: dy,
        // terrain = けしきの ならび。gate の land が あれば それ(ふねの 4 段も)、なければ 段の ことば
        stages, terrain: F.land.length ? F.land.slice() : stages.map((st) => st.label),
        travelStages: cor.travelStages, travelLength: cor.travelLength, cost: cor.costs[fromRegion], bend: cor.bend };
    }
    // その 地域から 出る corridor(from から 見た むき)
    const corridorsFrom = (regionId) => worldCorridors().filter((c) => c.a === regionId || c.b === regionId).map((c) => orientCorridor(c, regionId));
    // 「この 出口の さきは どっちか」。UI で「やま は にし」と いう ための ひとつ だけの 入口
    function corridorDirection(connectionId, fromRegion) {
      const cor = worldCorridors().find((c) => c.id === connectionId);
      const o = cor ? orientCorridor(cor, fromRegion) : null;
      if (!o) return null;
      return { to: o.to, kind: o.kind, heading: o.heading, compass: o.compass, vertical: o.vertical,
        label: o.vertical ? (o.vertical === 'up' ? 'うえ' : 'した') : (o.compass ? o.compass.kana : null) };
    }

    // ---- global graph ----
    // node = frame を もつ 地域(layer つき)、edge = corridor(むきごとの ほねおり つき)。
    // **region id を しって いる グラフ**で、global ざひょう から region を ぎゃくびき しない
    function corridorGraph() {
      const nodes = FRAMED_REGIONS.map((id) => ({ id, layer: regionFrame(id).layer }));
      return { nodes, edges: worldCorridors().map((c) => ({ id: c.id, a: c.a, b: c.b, kind: c.kind,
        ways: Object.assign({}, c.ways), costs: Object.assign({}, c.costs) })) };
    }
    // 2 つの 地域の あいだの いちばん ほねおりの すくない みち(ダイクストラ。のぼりと くだりで ほねおりが ちがう)。
    // opts.special = false で あるく みち だけ。とどかない / しらない / きおくのみずうみ は null。
    // 「たび」(travelToRegion)は この グラフの そと
    function findRegionRoute(from, to, opts = {}) {
      if (!hasFrame(from) || !hasFrame(to)) return null;
      if (from === to) return { from, to, regions: [from], legs: [], cost: 0, travelLength: 0, walkOnly: true };
      const allow = (c) => opts.special !== false || c.kind === 'walk';
      const dist = new Map([[from, 0]]), prev = new Map(), done = new Set();
      while (true) {
        let cur = null, best = Infinity;
        for (const [id, d] of dist) if (!done.has(id) && d < best) { best = d; cur = id; }
        if (cur == null || cur === to) break;
        done.add(cur);
        for (const c of worldCorridors()) {
          if (!allow(c) || (c.a !== cur && c.b !== cur)) continue;
          const nx = c.a === cur ? c.b : c.a, nd = best + c.costs[cur];
          if (nd < (dist.has(nx) ? dist.get(nx) : Infinity)) { dist.set(nx, nd); prev.set(nx, { from: cur, cor: c }); }
        }
      }
      if (!dist.has(to)) return null;
      const legs = [];
      for (let at = to; at !== from; at = prev.get(at).from) legs.unshift(orientCorridor(prev.get(at).cor, prev.get(at).from));
      return { from, to, regions: [from, ...legs.map((l) => l.to)], legs, cost: dist.get(to),
        travelLength: legs.reduce((n, l) => n + l.travelLength, 0), walkOnly: legs.every((l) => l.kind === 'walk') };
    }

    // ====== Phase 4D-1: 遠景の いみデータ(DistantFeature)======
    // 「この 地域から、どの 方角に、どんな 遠景が、どんな 条件で 見えるか」を 世界の がわの データと して もつ。
    // (docs/design/meguru-phase4d-distant-world-streaming-renderer-2026-09-23.md §5〜§8)
    //
    // えがく がわで つかうのは Phase 4D-2 の 遠景 PoC(home / sea。Canvas の 遠景レイヤー)だけ。
    // ここからは えがき・UI・セーブ・世界地図・travelToRegion() を よばない。
    //
    // 正本の じゅん(上ほど つよい。ここは いちばん 下の 派生):
    //   1. WORLD_GEOGRAPHY(connection・regions の isle / layer)
    //   2. corridor / global graph(Phase 4C: 出口の 向き・のりこえかた・いちばん やすい ルート)
    //   3. 地域の いみデータ(WORLDS[id].backdrop = その 地域の 遠くからの 見え方の 種類)
    //   4. 環境の ルール(DISTANT_RULES: 時間・天気・季節で 見える / うすくなる)
    //   5. ここで みちびく DistantFeature
    // 1 つずつ 手で 書いた 遠景は ない。例外表も ない(条件は 種類ごとの ルールと、行き先の いみ から きまる)。
    //
    // きまり:
    //   ・**方角は corridor の 出口の 向き**(corridorsFrom の leave / 海の 横断方向)。REGION_FRAME の 原点どうしの 向きは
    //     使わない(地上 52 組で 中央値 69° くいちがう。Phase 4D 設計監査 §2.3)
    //   ・**px を もたない**(画面の 座標・はば は えがく がわが きめる)。方角は 度、anchor は 出口 spot の id と local の 向き だけ
    //   ・**となりの 地域の 本体(buildWorld)は よまない**。行き先の 見え方は WORLDS[id].backdrop(静的データ)だけ
    //   ・**きおくのみずうみ は 入らない**(corridor に ない ので みちびけない)
    //   ・環境(time / weather / season)と はっけん記録は **ひきすうで もらう**。実時刻は 読まない
    //   ・はじめて よばれた ときに 1 どだけ 12 地域 ぶんを 組み立てて freeze(毎フレーム つくらない)

    // 行き先の 見え方(backdrop の 種類)→ 遠景の 種類
    const DISTANT_KIND_OF = Object.freeze({
      peaks: 'mountain', snowpeaks: 'snow_mountain', treeline: 'forest', canopy: 'forest',
      neonskyline: 'city_glow', seahorizon: 'sea_horizon', hills: 'highland', farhills: 'highland', lakehills: 'highland',
      mesas: 'desert_haze',
    });
    // 種類ごとの ルール。elevation = たかさの 意味、tall = 2 手先(far)からでも 見える、weight = 同じ 距離の なかの 順位。
    //   time: その 時間帯 だけ 見える(値 = こさ)。hide: その 天気で 見えない。fade: うすくなる(値 = こさの かけ算)
    const DISTANT_RULES = Object.freeze({
      mountain:      Object.freeze({ elevation: 'tall',  tall: true,  weight: 20, hide: Object.freeze({ weather: Object.freeze(['rain']) }), fade: Object.freeze({ weather: Object.freeze({ cloudy: 0.7, snow: 0.6 }) }) }),
      snow_mountain: Object.freeze({ elevation: 'tall',  tall: true,  weight: 22, hide: Object.freeze({ weather: Object.freeze(['rain']) }), fade: Object.freeze({ weather: Object.freeze({ cloudy: 0.7 }), season: Object.freeze({ summer: 0.8 }) }) }),
      desert_haze:   Object.freeze({ elevation: 'tall',  tall: true,  weight: 12, hide: Object.freeze({ weather: Object.freeze(['rain', 'snow']) }), fade: Object.freeze({ weather: Object.freeze({ cloudy: 0.6 }) }) }),
      // 街の 光は 夜だけ(夕方は うすく)。昼は 出さない
      city_glow:     Object.freeze({ elevation: 'tall',  tall: true,  weight: 18, time: Object.freeze({ evening: 0.5, night: 1 }), fade: Object.freeze({ weather: Object.freeze({ rain: 0.6 }) }) }),
      forest:        Object.freeze({ elevation: 'low',   tall: false, weight: 14, fade: Object.freeze({ weather: Object.freeze({ rain: 0.6, snow: 0.6 }) }) }),
      highland:      Object.freeze({ elevation: 'low',   tall: false, weight: 10, fade: Object.freeze({ weather: Object.freeze({ rain: 0.5, snow: 0.6 }) }) }),
      sea_horizon:   Object.freeze({ elevation: 'low',   tall: false, weight: 16, fade: Object.freeze({ weather: Object.freeze({ rain: 0.5 }) }) }),
      // 島影: 夜と 雨は 見えない
      island:        Object.freeze({ elevation: 'low',   tall: false, weight: 24, time: Object.freeze({ morning: 1, day: 1, evening: 0.7 }), hide: Object.freeze({ weather: Object.freeze(['rain']) }) }),
      // たて: 上の 光(ほしぞらの のりば / 水面)・下の 暗さ(しんかい)・下の 地上(ほしぞら から)
      // (上の 光は 昼も 夜も おなじ。ほしぞらの のりばの 灯 と、しんかい から 見上げる 水面の 光 の 両方に つかう)
      sky_light:     Object.freeze({ elevation: 'above', tall: false, weight: 26 }),
      deep_dark:     Object.freeze({ elevation: 'below', tall: false, weight: 26, from: 'nearGate' }),
      land_below:    Object.freeze({ elevation: 'below', tall: false, weight: 26 }),
    });
    // 距離の クラスごとの 順位の 土台と、えがく ときの 性能 tier の 上限(tier 2 = いちばん かるい で 残るのは mid だけ)
    const DISTANT_CLASS = Object.freeze({
      mid: Object.freeze({ base: 200, maxTier: 2 }), vertical: Object.freeze({ base: 150, maxTier: 1 }), far: Object.freeze({ base: 100, maxTier: 1 }),
    });
    const DISTANT_ENV_DEFAULT = Object.freeze({ time: 'day', weather: 'sunny', season: 'spring' });
    const bearingOfVec = (v) => (v && (v.x || v.z) ? ((Math.atan2(v.x, v.z) * 180 / Math.PI) + 360) % 360 : null);
    const vecOfBearing = (deg) => { const t = deg * Math.PI / 180; return { x: Math.sin(t), z: Math.cos(t) }; };

    // 1 本の 出口(from から 見た corridor)の 向き。walk = 出る 向き、sea = 横断方向。たて は null
    function exitBearings(from, o) {
      let g = null;
      if (o.leave) g = o.leave; else if (o.heading != null) g = vecOfBearing(o.heading);
      if (!g) return { local: null, global: null };
      return { local: bearingOfVec(dirToLocal(from, g)), global: bearingOfVec(g) };
    }
    // 行き先が 「とくべつな いきさき」(しま・そら・しんかい)なら、その 道を 見つけて から でないと 見せない
    function specialDestination(target) {
      const r = WORLD_GEOGRAPHY.regions[target] || {};
      return !!r.isle || (r.layer && r.layer !== 'ground');
    }
    function makeFeature(f) {
      const rule = DISTANT_RULES[f.kind], cls = DISTANT_CLASS[f.distanceClass];
      return Object.freeze(Object.assign(f, {
        elevationClass: rule.elevation,
        priority: cls.base + rule.weight,
        lod: Object.freeze({ layer: f.distanceClass, maxTier: cls.maxTier }),
        visibilityRule: Object.freeze({ from: rule.from || 'anywhere', requiresLink: f.requiresLink, time: rule.time || null, hide: rule.hide || null, fade: rule.fade || null }),
      }));
    }

    function buildDistantFor(source) {
      const out = [];
      const exits = corridorsFrom(source);
      // mid / island / vertical: 出口 1 本に つき 1 つ
      for (const o of exits) {
        const b = exitBearings(source, o);
        const req = specialDestination(o.to) ? o.id : null;
        if (o.kind === 'vertical') {
          const up = o.vertical === 'up';
          const kind = up ? 'sky_light' : (WORLD_GEOGRAPHY.regions[source] || {}).layer === 'sky' ? 'land_below' : 'deep_dark';
          out.push(makeFeature({ id: source + '>' + o.to, sourceRegion: source, targetRegion: o.to, viaConnection: o.id, via: Object.freeze([o.id]),
            kind, bearingLocal: null, bearingGlobal: null, anchor: null, distanceClass: 'vertical', silhouette: kind, requiresLink: req }));
          continue;
        }
        const island = o.kind === 'sea' && (WORLD_GEOGRAPHY.regions[o.to] || {}).isle;
        const silhouette = island ? 'island' : (WORLDS[o.to] && WORLDS[o.to].backdrop) || 'hills';
        const kind = island ? 'island' : DISTANT_KIND_OF[silhouette];
        if (!kind) continue;
        const anchor = o.kind === 'walk' ? Object.freeze({ spot: o.fromSpot, out: Object.freeze(dirToLocal(source, o.leave)) }) : null;
        out.push(makeFeature({ id: source + '>' + o.to, sourceRegion: source, targetRegion: o.to, viaConnection: o.id, via: Object.freeze([o.id]),
          kind, bearingLocal: b.local, bearingGlobal: b.global, anchor, distanceClass: o.kind === 'walk' ? 'mid' : 'far', silhouette, requiresLink: req }));
      }
      // far: あるいて 2 手先の 高い もの。行き先ごとに いちばん やすい ルートの 最初の 出口の 向き。
      // 同じ 出口の 向きに 何枚も かさねない: 出口 1 本に つき far は 1 つ(weight が いちばん 大きい もの)
      const perExit = new Map();
      for (const t of FRAMED_REGIONS) {
        if (t === source || exits.some((o) => o.to === t)) continue;
        const sil = WORLDS[t] && WORLDS[t].backdrop, kind = DISTANT_KIND_OF[sil];
        if (!kind || !DISTANT_RULES[kind].tall) continue;
        const r = findRegionRoute(source, t, { special: false });
        if (!r || r.legs.length !== 2) continue;
        const L0 = r.legs[0], b = exitBearings(source, L0);
        const cand = { id: source + '>>' + t, sourceRegion: source, targetRegion: t, viaConnection: L0.id, via: Object.freeze(r.legs.map((l) => l.id)),
          kind, bearingLocal: b.local, bearingGlobal: b.global, anchor: null, distanceClass: 'far', silhouette: sil, requiresLink: null };
        const prev = perExit.get(L0.id);
        if (!prev || DISTANT_RULES[kind].weight > DISTANT_RULES[prev.kind].weight) perExit.set(L0.id, cand);
      }
      for (const cand of perExit.values()) out.push(makeFeature(cand));
      out.sort((a, b) => b.priority - a.priority || (a.id < b.id ? -1 : 1));
      return Object.freeze(out);
    }
    // 12 地域 ぶん。はじめて よばれた ときに 1 どだけ
    let distantCache = null;
    function distantRegistry() {
      if (distantCache) return distantCache;
      const reg = {};
      for (const id of FRAMED_REGIONS) reg[id] = buildDistantFor(id);
      distantCache = Object.freeze(reg);
      return distantCache;
    }
    // その 地域から 見える かもしれない 遠景(条件を 見る まえ)。frame を もたない 地域・しらない id は []
    const distantFeatures = (regionId) => (hasFrame(regionId) ? distantRegistry()[regionId] : Object.freeze([]));

    // 今 見えるか と こさ(0〜1)。純関数: env と はっけん記録を ひきすうで もらう。
    //   env  = { time, weather, season }(currentEnvironment() と おなじ かたち。なければ ひる・はれ・はる)
    //   rec  = { links: [見つけた connection id] }(worldLinksFrom() と おなじ もの)
    //   opts = { nearGates: [いま 出口の ちかくに いる connection id] }(出口の ちかく だけで 見える もの 用)
    function visibleDistant(regionId, env, rec, opts) {
      const e = Object.assign({}, DISTANT_ENV_DEFAULT, env || {});
      const links = new Set((rec && rec.links) || []);
      const near = new Set((opts && opts.nearGates) || []);
      const out = [];
      for (const f of distantFeatures(regionId)) {
        const r = f.visibilityRule;
        if (r.requiresLink && !links.has(r.requiresLink)) continue;
        if (r.from === 'nearGate' && !near.has(f.viaConnection)) continue;
        let alpha = 1;
        if (r.time) { if (!(e.time in r.time)) continue; alpha *= r.time[e.time]; }
        if (r.hide && r.hide.weather && r.hide.weather.indexOf(e.weather) >= 0) continue;
        if (r.fade) {
          if (r.fade.weather && e.weather in r.fade.weather) alpha *= r.fade.weather[e.weather];
          if (r.fade.season && e.season in r.fade.season) alpha *= r.fade.season[e.season];
          if (r.fade.time && e.time in r.fade.time) alpha *= r.fade.time[e.time];
        }
        out.push({ id: f.id, feature: f, alpha });
      }
      return out;
    }
    // 視野に 入る もの を 順位の 高い じゅんに max まで(たては 方位を もたない ので 数えない)。
    // yaw は その 地域の local 方位(度)。fov は 水平 視野(度)。えがく がわが 1 画面に 出す かずを しぼる ため
    function distantInView(list, yawDeg, fovDeg, max = 3) {
      const half = fovDeg / 2;
      return list.filter((v) => v.feature.bearingLocal != null && Math.abs(((v.feature.bearingLocal - yawDeg + 540) % 360) - 180) <= half)
        .sort((a, b) => b.feature.priority - a.feature.priority || (a.id < b.id ? -1 : 1))
        .slice(0, max);
    }

    // ====== Phase 4E-1: あるける corridor の かたち と 状態(pure data)======
    // docs/design/meguru-phase4e-continuous-corridor-world-2026-09-23.md の §4〜§6・§16 を データに した もの。
    // **まだ だれも つかって いない。** simulation・renderer・UI・セーブ・travelToRegion() からは よばない。
    // player を corridor へ 入れる のも、corridor を えがく のも 4E-2 から。
    //
    // 正本の じゅん(二重に もたない):
    //   1. WORLD_GEOGRAPHY.connections  2. gate の いみデータ(出口 spot・むき・land)  3. Phase 4C の corridor  4. これ(導出)
    // ・walk の corridor 10 本 だけ。ふね・ゴンドラ・もぐる と きおくのみずうみ は 入れない
    // ・かたちは 「すすむ むきの 変わりかた」(曲率)で もつ。空間の 点(Bezier / Catmull-Rom)は つくらない
    // ・**global の 位置には あわせない。** 出口どうしは global で 4.6〜83.9 しか はなれて いない のに、あるく 長さは 2250〜2700
    //   (設計 §2.2)。global と つなぐ のは **むき だけ**(4C の leave)。はしは 出口の pose(spot の local 位置 + むき)で つなぐ。
    //   だから closure の のこり(Phase 4B の さいだい 83.9)は ここに 1 つも 入らない
    // ・land の ことばは コードに 書かない(段の ことばは gate の land から よむ)。地面の 種類だけを 下の 表で もつ
    // ・はじめて よんだ ときに 1 どだけ 組み立てて freeze(毎フレーム つくらない)

    // land 1 段を あるく ながさ(world)。260/s で 1.7 秒、6 段で 10.4 秒 = home を はしから はしまで あるく くらい。
    // いみの ながさ(CORRIDOR_STAGE_LEN = 1600。graph と ルートさがし 用)とは べつもの
    const CORRIDOR_STAGE_WALK = 450;
    const CORRIDOR_REVISIT_SPEED = 1.4;     // 2 かいめ からは はやあし。かたちは 変えない(TRANSITION.repeat 0.62 の ぎゃく数 ほど)
    const CORRIDOR_TURN_BUDGET = 30;        // 曲がる はやさの めやす(度 / 秒)。こえる ものは しるしを つける だけ(なおすのは 4E-4)
    const CORRIDOR_RAMP = 0.2;              // 曲がる 区間の はしの 2 わりで 曲率を 0 から 上げ下げ する(台形)
    // Phase 4E-4B: 曲がる ところの ひろげかた(turn spread)。曲がる 量(度)と 両はしの むきは かえず、曲がる はばだけ ひろげる。
    // 上から じゅんに ためし、2 かいめ(はやあし 1.4 倍)の いちばん はやい 曲がりが CORRIDOR_TURN_TARGET いかに なる さいしょの もの。
    // margin = 出口の まえで まっすぐ に する ながさ(段の いくつぶん)、ramp = 曲率を 上げ下げ する わりあい。
    // 本ごとの 指定は しない(曲がる 量 と 道の ながさ から きまる)。めやすに おさまる 本は 4E-1 の かたち(level 0)の まま
    const CORRIDOR_TURN_TARGET = 28;
    const CORRIDOR_TURN_SPREAD = Object.freeze([
      Object.freeze({ level: 0, margin: 0.5, ramp: CORRIDOR_RAMP }),   // 4E-1: 出口の まえ 半段は まっすぐ
      Object.freeze({ level: 1, margin: 0, ramp: CORRIDOR_RAMP }),     // 道 ぜんぶで 曲がる
      Object.freeze({ level: 2, margin: 0, ramp: 0.1 }),               // + 曲率の 上げ下げを みじかく
      // Phase 4E-4C: 道 ぜんぶで ほぼ 一定の 曲率(上げ下げ なし)。ほぼ U ターンの みじかい 道(countryside|forest 178°・5 段)で
      // 2 かいめ 28.7°/s。どの だんでも TARGET に とどかない ときは この いちばん 下を つかう(めやす 30°/s いか)
      Object.freeze({ level: 3, margin: 0, ramp: 0 }),
    ]);
    // 曲がる 量 turn(度)・道の ながさ L で、2 かいめの さいだい(度 / 秒)が target いかに なる ひろげかた
    function corridorTurnSpread(turn, L, target = CORRIDOR_TURN_TARGET) {
      const revisitPeak = (p) => Math.abs(turn) / ((1 - p.ramp) * (L - 2 * p.margin * CORRIDOR_STAGE_WALK)) * RULES.playerSpeed * CORRIDOR_REVISIT_SPEED;
      return CORRIDOR_TURN_SPREAD.find((p) => revisitPeak(p) <= target) || CORRIDOR_TURN_SPREAD[CORRIDOR_TURN_SPREAD.length - 1];
    }
    // 幅は 数 1 つで きめない。いみの クラス → world たんいの 幅(歩ける 帯 ぜんぶ。道 + 路肩)。
    // edgeSoftness = 帯の はしで よこの うごきを やわらげる はば
    const CORRIDOR_WIDTH = Object.freeze({
      wide: Object.freeze({ width: 520, edgeSoftness: 60 }),     // 街道・はたけの あいだ・まちの はずれ
      normal: Object.freeze({ width: 380, edgeSoftness: 40 }),   // 森の 小道・川ぞい・かわいた 道
      narrow: Object.freeze({ width: 260, edgeSoftness: 24 }),   // 坂・尾根・岩場・雪の 道
    });
    // 地面の 種類(11)→ 幅の クラス・帯の はしの いみ・かんたんな 障害物の めやす(4E-1 では 置かない)
    const CORRIDOR_TERRAIN_WIDTH = Object.freeze({ road: 'wide', 'urban-edge': 'wide', field: 'wide',
      forest: 'normal', river: 'normal', shore: 'normal', dry: 'normal', slope: 'narrow', ridge: 'narrow', rock: 'narrow', snow: 'narrow' });
    const CORRIDOR_EDGE = Object.freeze({ road: 'open', 'urban-edge': 'fence', field: 'open', forest: 'trees', river: 'water',
      shore: 'water', dry: 'open', slope: 'drop', ridge: 'drop', rock: 'wall', snow: 'drop' });
    const CORRIDOR_OBSTACLE_ALLOWANCE = Object.freeze({ road: 1, 'urban-edge': 3, field: 2, forest: 4, river: 3,
      shore: 2, dry: 2, slope: 3, ridge: 2, rock: 4, snow: 2 });
    const CORRIDOR_OBSTACLE_MAX = 24;
    // 段ごとの 地面の 種類。**connection の a → b の じゅん**。land の ことばを 見て 人が きめた 分類だけを もつ
    // (ことばは 写さない。段の かずが gate の land と ちがったら その corridor は 組み立てない)
    const CORRIDOR_TERRAIN = Object.freeze({
      'snow|mountain': ['snow', 'snow', 'snow', 'rock', 'slope', 'ridge'],
      'forest|mountain': ['forest', 'forest', 'slope', 'rock', 'slope', 'ridge'],
      'mountain|river_lake': ['slope', 'river', 'rock', 'river', 'river', 'shore'],
      'desert|mountain': ['dry', 'dry', 'dry', 'rock', 'dry', 'ridge'],
      'countryside|forest': ['urban-edge', 'field', 'slope', 'forest', 'forest'],
      'home|forest': ['urban-edge', 'field', 'field', 'forest', 'forest', 'forest'],
      'home|river_lake': ['urban-edge', 'field', 'slope', 'slope', 'river', 'shore'],
      'city|countryside': ['urban-edge', 'field', 'slope', 'ridge', 'slope', 'field'],
      'city|sea': ['river', 'road', 'urban-edge', 'river', 'shore', 'shore'],
      'city|desert': ['urban-edge', 'dry', 'dry', 'road', 'dry', 'dry'],
    });
    const CORRIDOR_WIDTH_ORDER = ['narrow', 'normal', 'wide'];
    const wrapDeg = (d) => { const v = ((d % 360) + 540) % 360 - 180; return v === -180 ? 180 : v; };
    const deg360 = (d) => ((d % 360) + 360) % 360;
    // 曲率(度 / world)の 区間を つなげた ものから、s までに 曲がった 量(度)
    function turnedAt(curve, s) {
      let a = 0;
      for (const g of curve) {
        if (s <= g.s0) break;
        const x = Math.min(s, g.s1) - g.s0, len = g.s1 - g.s0;
        a += g.k0 * x + (len > 0 ? (g.k1 - g.k0) * x * x / (2 * len) : 0);
      }
      return a;
    }
    const round3 = (v) => Math.round(v * 1000) / 1000;
    function deepFreeze(o) { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const k of Object.keys(o)) deepFreeze(o[k]); } return o; }

    // 1 本の walk corridor(Phase 4C)から、あるく ための かたちを つくる。a → b の むきで 1 つだけ もつ
    function buildWalkCorridorSpec(cor) {
      const conn = WORLD_GEOGRAPHY.connections.find((c) => c.id === cor.id);
      const terrain = CORRIDOR_TERRAIN[cor.id];
      const A = cor.ends[cor.a], B = cor.ends[cor.b];
      const n = cor.travelStages;
      if (!conn || !terrain || terrain.length !== n || A.land.length !== n || B.land.length !== n || !A.leave || !B.leave) return null;
      const L = n * CORRIDOR_STAGE_WALK;
      // 出口の pose(region-local)。global は とおらない
      const endOf = (r, end) => {
        const g = conn.gate.ends[r], sp = spotOf(r, end.spot), out = corridorOutward(g);
        if (!sp || !out) return null;
        return { region: r, spot: sp.id, x: sp.x, z: sp.z, r: sp.r, leaveLocal: { x: out.x, z: out.z },
          leaveHeadingLocal: round3(headingOf(out)), leaveHeadingGlobal: round3(headingOf(end.leave)) };
      };
      const ea = endOf(cor.a, A), eb = endOf(cor.b, B);
      if (!ea || !eb) return null;
      // むき: a を 出る むき → b へ 入る むき(= b の 出口の はんたい)。global は この 2 つの むきだけ
      const hA = headingOf(A.leave), hB = deg360(headingOf(B.leave) + 180);
      const turn = wrapDeg(hB - hA);
      // 曲がるのは 段 1 の うしろ はんぶん 〜 さいごの 段の まえ はんぶん。出口の ちかくは まっすぐ(出口の むきの まま)。
      // 曲がる 量が 大きくて 2 かいめに はやすぎる ときは 道 ぜんぶへ ひろげる(Phase 4E-4B。曲がる 量と 両はしの むきは おなじ)
      const sp = corridorTurnSpread(turn, L);
      const a0 = sp.margin * CORRIDOR_STAGE_WALK, a1 = L - sp.margin * CORRIDOR_STAGE_WALK, Lt = a1 - a0, ramp = sp.ramp * Lt;
      const k = turn / ((1 - sp.ramp) * Lt);
      const curve = [
        { kind: 'straight', s0: 0, s1: a0, k0: 0, k1: 0 },
        { kind: 'rampIn', s0: a0, s1: a0 + ramp, k0: 0, k1: k },
        { kind: 'arc', s0: a0 + ramp, s1: a1 - ramp, k0: k, k1: k },
        { kind: 'rampOut', s0: a1 - ramp, s1: a1, k0: k, k1: 0 },
        { kind: 'straight', s0: a1, s1: L, k0: 0, k1: 0 },
      ];
      const speed = RULES.playerSpeed;
      const peak = Math.abs(k) * speed;
      const at = (i) => turnedAt(curve, i * CORRIDOR_STAGE_WALK);
      const stages = terrain.map((kind, i) => {
        const wc = CORRIDOR_TERRAIN_WIDTH[kind], W = CORRIDOR_WIDTH[wc];
        return { index: i, terrain: kind, widthClass: wc, width: W.width, halfWidth: W.width / 2,
          uMax: W.width / 2 - RULES.bodyRadius, edge: CORRIDOR_EDGE[kind], edgeSoftness: W.edgeSoftness,
          obstacleAllowance: CORRIDOR_OBSTACLE_ALLOWANCE[kind],
          s0: i * CORRIDOR_STAGE_WALK, s1: (i + 1) * CORRIDOR_STAGE_WALK, t0: i / n, t1: (i + 1) / n, tCenter: (i + 0.5) / n,
          // 段の ことばは gate の land から(むきごと)。a から は a の land の i 段め、b から は b の land を うしろから
          labels: { [cor.a]: A.land[i], [cor.b]: B.land[n - 1 - i] },
          headingDelta: round3(at(i + 1) - at(i)) };
      });
      // 帯 ぜんたいの 幅クラス: いちばん 多い もの(同じ かずなら せまい ほう)
      const tally = {};
      for (const st of stages) tally[st.widthClass] = (tally[st.widthClass] || 0) + 1;
      const widthClass = CORRIDOR_WIDTH_ORDER.reduce((best, c) => ((tally[c] || 0) > (tally[best] || 0) ? c : best), 'narrow');
      let landMatch = 0;
      for (let i = 0; i < n; i++) if (A.land[i] === B.land[n - 1 - i]) landMatch++;
      const abs = Math.abs(turn);
      const turnClass = abs < 60 ? 'gentle' : abs < 120 ? 'wide' : abs < 160 ? 'sharp' : 'uTurnLike';
      const allowance = stages.reduce((sum, st) => sum + st.obstacleAllowance, 0);
      return {
        connectionId: cor.id, a: cor.a, b: cor.b, fromRegion: cor.a, toRegion: cor.b, fromSpot: ea.spot, toSpot: eb.spot,
        kind: 'walk', way: 'walk', layer: 'ground',
        stageCount: n, stageLength: CORRIDOR_STAGE_WALK, walkLength: L, travelLength: cor.travelLength,
        stageCheckpoints: stages.map((st) => st.t0).concat([1]),
        stages, widthClass, nominalWidth: CORRIDOR_WIDTH[widthClass].width,
        endpoints: { [cor.a]: ea, [cor.b]: eb },
        headingProfile: { startGlobal: round3(hA), endGlobal: round3(hB), turn: round3(turn), bend: round3(cor.bend),
          cumulative: stages.map((st, i) => round3(at(i))).concat([round3(at(n))]),
          perStage: stages.map((st) => st.headingDelta) },
        curveProfile: { unit: 'deg/world', ramp: sp.ramp, spread: sp.level, startHeading: hA, turnFrom: a0, turnTo: a1, peakCurvature: k, segments: curve },
        turnClass, turnFlags: { gentle: turnClass === 'gentle', wideTurn: turnClass === 'wide', sharpTurn: turnClass === 'sharp',
          uTurnLike: turnClass === 'uTurnLike', overTurnBudget: peak > CORRIDOR_TURN_BUDGET,
          overTurnBudgetRevisit: peak * CORRIDOR_REVISIT_SPEED > CORRIDOR_TURN_BUDGET },
        turnRate: { first: round3(peak), revisit: round3(peak * CORRIDOR_REVISIT_SPEED), average: round3(abs / (Lt / speed)), budget: CORRIDOR_TURN_BUDGET },
        timing: { speed, firstSec: round3(L / speed), revisitSec: round3(L / (speed * CORRIDOR_REVISIT_SPEED)), revisitSpeedMultiplier: CORRIDOR_REVISIT_SPEED },
        collisionProfile: { kind: 'band', boundary: 'left-right', bodyRadius: RULES.bodyRadius, regionColliders: false,
          halfWidth: stages.map((st) => st.halfWidth), uMax: stages.map((st) => st.uMax),
          edge: stages.map((st) => st.edge), edgeSoftness: stages.map((st) => st.edgeSoftness),
          obstacles: 'edges-only', maxObstacleCount: Math.min(CORRIDOR_OBSTACLE_MAX, allowance) },
        terrainStages: stages.map((st) => st.terrain),
        fallbackPolicy: { continuousAllowed: true, maxPerfTier: 1, reducedMotionFallback: 'transition',
          buildFailureFallback: 'returnToFrom', perfDropFallback: 'transitionFromNextGate', revisitSpeedMultiplier: CORRIDOR_REVISIT_SPEED },
        reverseSymmetry: { geometryShared: true, labelsPerEnd: true, headingMirrored: true, landMatch, stageCount: n },
        // 目安だけ(接続関係の 参考)。**あるく かたちは この 位置に あわせない**
        globalRef: { [cor.a]: { x: A.at.x, z: A.at.z }, [cor.b]: { x: B.at.x, z: B.at.z }, physicalGap: cor.physicalGap },
      };
    }
    let walkSpecCache = null;
    // walk の corridor 10 本の かたち(Phase 4C の walk corridor と 1 対 1)。1 どだけ 組み立てて freeze
    function walkCorridorSpecs() {
      if (walkSpecCache) return walkSpecCache;
      walkSpecCache = deepFreeze(worldCorridors().filter((c) => c.kind === 'walk').map(buildWalkCorridorSpec).filter(Boolean));
      return walkSpecCache;
    }
    const walkCorridorSpec = (connectionId) => walkCorridorSpecs().find((c) => c.connectionId === connectionId) || null;

    // from から 見た むき。**かたちは おなじ 1 つを さかさに つかう**(2 つ もたない)。段の ことばは from がわの land
    function orientWalkCorridor(spec, from) {
      if (!spec || (from !== spec.a && from !== spec.b)) return null;
      const fwd = from === spec.a, to = fwd ? spec.b : spec.a;
      const hp = spec.headingProfile, st = fwd ? spec.stages : spec.stages.slice().reverse();
      return { connectionId: spec.connectionId, direction: fwd ? 'forward' : 'reverse', fromRegion: from, toRegion: to,
        fromSpot: spec.endpoints[from].spot, toSpot: spec.endpoints[to].spot, walkLength: spec.walkLength, stageCount: spec.stageCount,
        widthClass: spec.widthClass,
        stages: st.map((q, i) => ({ index: i, label: q.labels[from], terrain: q.terrain, widthClass: q.widthClass,
          s0: i * spec.stageLength, s1: (i + 1) * spec.stageLength, headingDelta: fwd ? q.headingDelta : -q.headingDelta })),
        startGlobal: fwd ? hp.startGlobal : round3(deg360(hp.endGlobal + 180)),
        endGlobal: fwd ? hp.endGlobal : round3(deg360(hp.startGlobal + 180)),
        turn: fwd ? hp.turn : -hp.turn };
    }
    // s(from から あるいた きょり)での すすむ むき(global の 方位、度)
    function corridorHeadingAt(spec, from, s) {
      if (!spec || (from !== spec.a && from !== spec.b)) return null;
      const L = spec.walkLength, x = Math.max(0, Math.min(L, Number(s) || 0));
      const segs = spec.curveProfile.segments, h0 = spec.curveProfile.startHeading;   // 丸めない 値で けいさん
      return from === spec.a ? deg360(h0 + turnedAt(segs, x)) : deg360(h0 + turnedAt(segs, L - x) + 180);
    }
    // s に ある 段(from から 見た ことば)と、そこで ゆるされる よこずれ
    function corridorStageAt(spec, from, s) {
      const o = orientWalkCorridor(spec, from);
      if (!o) return null;
      const i = Math.max(0, Math.min(o.stageCount - 1, Math.floor((Number(s) || 0) / spec.stageLength)));
      const q = (from === spec.a ? spec.stages : spec.stages.slice().reverse())[i];
      return { index: i, label: q.labels[from], terrain: q.terrain, widthClass: q.widthClass, halfWidth: q.halfWidth, uMax: q.uMax, t: Math.max(0, Math.min(1, (Number(s) || 0) / spec.walkLength)) };
    }

    // ---- 状態(CorridorState)。**セーブしない。** 4E-2 から メモリの なかだけで つかう ----
    const CORRIDOR_STATE_KEYS = Object.freeze(['connectionId', 'fromRegion', 'toRegion', 's', 'u', 'direction', 'speedMultiplier', 'firstVisit', 'fallback']);
    // corridor を あるくか、いまの transition に するか(1 か所で きめる)。opts: { perfTier, reducedMotion, failed, heavy, allow }
    function corridorMode(spec, opts = {}) {
      const no = (reason) => ({ mode: 'transition', reason });
      if (!spec || spec.kind !== 'walk') return no('not-walk');
      if (opts.allow && opts.allow.indexOf(spec.connectionId) < 0) return no('not-allowed');
      const p = spec.fallbackPolicy;
      if (!p.continuousAllowed) return no('not-allowed');
      if (opts.reducedMotion) return no('reduced-motion');
      if ((Number(opts.perfTier) || 0) > p.maxPerfTier) return no('perf-tier');
      if (opts.heavy) return no('perf-drop');
      if (opts.failed) return no('build-failure');
      return { mode: 'corridor', reason: null };
    }
    function makeCorridorState(spec, from, init = {}) {
      const o = orientWalkCorridor(spec, from);
      if (!o) return null;
      const s = Math.max(0, Math.min(spec.walkLength, Number(init.s) || 0));
      const st = corridorStageAt(spec, from, s);
      const u = Math.max(-st.uMax, Math.min(st.uMax, Number(init.u) || 0));
      const firstVisit = init.firstVisit !== false;
      const m = corridorMode(spec, init);
      return { connectionId: spec.connectionId, fromRegion: from, toRegion: o.toRegion, s, u, direction: o.direction,
        speedMultiplier: firstVisit ? 1 : spec.fallbackPolicy.revisitSpeedMultiplier, firstVisit, fallback: m.reason };
    }

    // ---- 座標の 受けわたし(handoff)。global の 位置は とおらない ----
    // 出口: from の local 点 → corridor の s / u(出口 spot の 中心から、出る むきと その 右へ わける)
    function corridorEnterState(spec, from, local, init = {}) {
      if (!spec || !local || (from !== spec.a && from !== spec.b)) return null;
      const e = spec.endpoints[from], l = e.leaveLocal, rx = l.z, rz = -l.x;
      const dx = (Number(local.x) || 0) - e.x, dz = (Number(local.z) || 0) - e.z;
      return makeCorridorState(spec, from, Object.assign({}, init, { s: Math.max(0, dx * l.x + dz * l.z), u: dx * rx + dz * rz }));
    }
    // 着いた / もどった: corridor の はしを こえたら、その がわの region の local の pose(位置 + むき)。まだ とちゅうなら null
    function corridorExitPose(spec, state) {
      if (!spec || !state || state.connectionId !== spec.connectionId) return null;
      const L = spec.walkLength, s = Number(state.s) || 0, u = Number(state.u) || 0;
      let e, dir, over, arrived;
      if (s >= L) { e = spec.endpoints[state.toRegion]; dir = { x: -e.leaveLocal.x, z: -e.leaveLocal.z }; over = s - L; arrived = true; }
      else if (s <= 0) { e = spec.endpoints[state.fromRegion]; dir = { x: -e.leaveLocal.x, z: -e.leaveLocal.z }; over = -s; arrived = false; }
      else return null;
      // corridor の 右 = すすむ むきの 右。もどる ときは corridor の まえむきが 出口の むき なので 右も 出口の むきの 右
      const fx = arrived ? dir.x : -dir.x, fz = arrived ? dir.z : -dir.z, rx = fz, rz = -fx;
      let ox = dir.x * over + rx * u, oz = dir.z * over + rz * u;
      const lim = Math.max(0, (e.r || 0) - RULES.bodyRadius), d = Math.hypot(ox, oz);
      if (d > lim && d > 0) { ox *= lim / d; oz *= lim / d; }
      return { region: e.region, spot: e.spot, x: e.x + ox, z: e.z + oz, heading: Math.atan2(dir.x, dir.z),
        headingLocal: round3(headingOf(dir)), arrived, commit: arrived };
    }

    // ====== Phase 4E-2: home|forest を ほんとうに あるく(Canvas の PoC)======
    // docs/handoff/meguru-phase4e2-home-forest-poc-2026-09-23.md
    // 4E-1 の かたち(CorridorSpec)を つかって、**許可リストの 1 本だけ** 出口 → corridor → 入口 を あるけるように する。
    // ほかの 出口(walk 9 本・ふね・ゴンドラ・もぐる)は これまでの transition の まま。
    //
    // ・corridor の 平面(chart)は **出発 地域の local の むき**に そろえる。原点は 出口 spot。
    //   だから 入る しゅんかんは からだも カメラも 1 つも うごかない。着く ときだけ 地域の むきの ちがいを 暗転の なかで うめる
    // ・player の 正本は s(あるいた きょり)と u(よこずれ)。chart の x / z は そこから 出す(セーブしない)
    // ・え は いまの Canvas renderer に 「かるい にせの world」を わたす だけ(道 1 本・もよう・両わきの 飾り・はしの いし)。
    //   region の 700 こ の props も 住民も 持ちこまない
    // ・当たり判定は 帯の 左右と はしの いし だけ。region の 当たり判定と 同時には 持たない
    // ・ここには セーブ・DOM・実時刻は ない(start() の がわが つなぐ)
    // あるいて こえる corridor(connection id)。4E-2 の home|forest + Phase 4E-4A の LOW 4 本。
    // のこり 5 本(MEDIUM 3・HIGH 2)は 4E-4B / C まで いまの transition
    const CONTINUOUS_WALK_ALLOWLIST = Object.freeze(['home|forest', 'home|river_lake', 'city|desert', 'desert|mountain', 'snow|mountain', 'forest|mountain', 'mountain|river_lake', 'city|sea', 'city|countryside', 'countryside|forest']);
    // 出口・入口の 暗転(秒)。着く ときは くらく なりきった frame で commit と さいしょの え を すませ、あとは 0.14 秒で あける
    const CORRIDOR_COVER = Object.freeze({ fadeIn: 0.06, fadeOut: 0.12 });
    // 暗転が これより こい ときは 道の え を えがかない(ぬりつぶし 1 まいだけ)。のこる え は 3% いか で 見えない ので、ちらつかない
    const CORRIDOR_COVER_SKIP = 0.95;
    function corridorCoverSkip(cover) { return cover >= CORRIDOR_COVER_SKIP; }
    const CORRIDOR_ORIGIN = 20000;       // chart の 原点を ここに おく(地面の もようは 負の 座標を よまない)
    const CORRIDOR_SAMPLE = 10;          // 曲線を 10 world ごとに つみあげる
    const CORRIDOR_PATH_HALF = Object.freeze({ wide: PATH_HALF.wide, normal: PATH_HALF.path, narrow: PATH_HALF.narrow });
    // 地面の 種類(4E-1 の terrain)→ みため。**いまの 地域の いろ と 飾りの ことば だけ** を つかう(あたらしい 絵は ない)。
    //   palette: 地面・みち・くさ・とおくの 山なみ の いろを かりる 地域
    //   near: みちの すぐ そば(低い もの・さく・はたけの うね)/ far: おくの 大きな もの(いえ・木)。[飾り, 大きさ]
    //   飾りは 絵文字 か いまの 地域の 構造物(canvas で えがく fence / hedge / cropline …)。あたり判定は もたない
    const CORRIDOR_TERRAIN_LOOK = Object.freeze({
      'urban-edge': { palette: 'home', nearN: 4, farN: 3, farU: [40, 150], near: [['fence', 92], ['🌷', 70], ['🌼', 55], ['fence', 92], ['🪴', 80]], far: [['🏠', 185], ['🏡', 195], ['🏠', 170], ['🌳', 200]] },
      field: { palette: 'countryside', nearN: 4, farN: 3, near: [['cropline', 290], ['🌾', 80], ['🌻', 85], ['🌾', 70]], far: [['🌳', 230], ['🏡', 175], ['hayroll', 250], ['🌳', 210]] },
      forest: { palette: 'forest', nearN: 4, farN: 4, farU: [80, 220], near: [['🌿', 85], ['🍄', 58], ['🪵', 80], ['🍂', 70], ['fern', 90], ['🌿', 75]], far: [['🌲', 190], ['🌳', 230], ['🌲', 165], ['🌲', 210]] },
      road: { palette: 'home', nearN: 4, farN: 3, near: [['🌼', 55], ['🪧', 90]], far: [['🌳', 210]] },
      slope: { palette: 'mountain', nearN: 4, farN: 3, near: [['🪨', 80], ['🌿', 80]], far: [['🌲', 180]] },
      ridge: { palette: 'mountain', nearN: 4, farN: 3, near: [['🪨', 85]], far: [['🌲', 170], ['🪨', 120]] },
      rock: { palette: 'mountain', nearN: 4, farN: 2, near: [['🪨', 85]], far: [['🪨', 140]] },
      river: { palette: 'river_lake', nearN: 4, farN: 3, near: [['🌿', 80], ['🪨', 75]], far: [['🌳', 210]] },
      shore: { palette: 'sea', nearN: 4, farN: 2, near: [['🌿', 75], ['🪨', 75]], far: [['🌴', 220]] },
      dry: { palette: 'desert', nearN: 4, farN: 2, near: [['🪨', 80]], far: [['🌵', 200]] },
      snow: { palette: 'snow', nearN: 4, farN: 3, near: [['🪨', 80]], far: [['🌲', 180]] },
    });
    // 段の さかいの まざる はば(段の 長さに たいして)。Phase 4E-4A: 0.3 → 0.5(段の まんなか から まんなか まで なめらかに。
    // 雪 → 岩 のような かわりめが 1 段で きえない)
    const CORRIDOR_BLEND = 0.5;
    // ---- Phase 4E-4A: 端の 地域の みため ----
    // 前半は 出発 地域、まんなかは 地面の 種類、後半は 到着 地域。connection ごとの 例外は もたない
    //   CORRIDOR_REGION_LOOK: その 地域らしい ことば(いまの 地域に ある 絵だけ)。端に ちかい ほど まぜる
    //   CORRIDOR_REGION_TERRAIN: 地面の 種類 × ちかい 端の 地域 で みためを かえる(海の ない 地域の 岸を 海に しない・
    //   まちの はずれを まちの いろに する)。ない ものは CORRIDOR_TERRAIN_LOOK の まま
    //   CORRIDOR_END_MIX: tint = 地面の 種類の いろの つよさ(のこりは 出発 → 到着 の いろ)、words = 端の ことばを まぜる 上限
    const CORRIDOR_REGION_LOOK = Object.freeze({
      home: { near: [['🌷', 70], ['🪴', 80], ['🌼', 55]], far: [['🏠', 180], ['🌳', 200]] },
      city: { near: [['🚲', 90], ['🪧', 90], ['🗑️', 70]], far: [['🏢', 230], ['🏬', 210]] },
      countryside: { near: [['🌾', 80], ['🌻', 85]], far: [['🌳', 220], ['🏡', 175]] },
      forest: { near: [['🌿', 85], ['🍄', 58], ['🪵', 80]], far: [['🌲', 200], ['🌳', 230]] },
      mountain: { near: [['🪨', 85], ['🥾', 60]], far: [['🌲', 180]] },
      snow: { near: [['🪨', 80]], far: [['🌲', 180]] },
      desert: { near: [['🪨', 80], ['🏺', 70]], far: [['🌵', 200]] },
      river_lake: { near: [['🌿', 80], ['🪷', 60], ['🪨', 75]], far: [['🌳', 210]] },
      sea: { near: [['🐚', 55], ['🪨', 75]], far: [['🌴', 220]] },
    });
    const CORRIDOR_REGION_TERRAIN = Object.freeze({
      river_lake: { shore: { palette: 'river_lake', near: [['🌿', 75], ['🪷', 60], ['🪨', 75]], far: [['🌳', 210]] } },
      // まちの ちかくの 川は まちの 運河(石の いろ・とおくに ビル)。Phase 4E-4B
      city: { 'urban-edge': { palette: 'city', near: [['🚲', 90], ['🪧', 90], ['🗑️', 70]], far: [['🏢', 230], ['🏬', 210]] }, road: { palette: 'city' },
        river: { palette: 'city', far: [['🏢', 230], ['🏬', 210]] } },
      // いなかの ちかくの まちはずれ は 村はずれ(はたけ・ひまわり・わらの ロール・農家)。家の ちかくの いろ(home)に しない。Phase 4E-4C
      countryside: { 'urban-edge': { palette: 'countryside', near: [['🌾', 80], ['🌻', 85], ['fence', 92]], far: [['🏡', 175], ['🌳', 220], ['hayroll', 250]] } },
      desert: { road: { palette: 'desert', near: [['🪧', 90], ['🪨', 75]], far: [['🌵', 200]] } },
    });
    const CORRIDOR_END_MIX = Object.freeze({ tint: 0.55, words: 0.5 });
    // 段(from から 見た じゅん)の みため。ちかい 端の 地域で CORRIDOR_REGION_TERRAIN を かさねる
    function corridorStageLook(terrain, nearRegion) {
      const base = CORRIDOR_TERRAIN_LOOK[terrain] || CORRIDOR_TERRAIN_LOOK.road;
      const over = (CORRIDOR_REGION_TERRAIN[nearRegion] || {})[terrain];
      return over ? Object.assign({}, base, over) : base;
    }
    // 端の ことばを まぜる わりあい(t = すすみぐあい 0〜1)。出発 がわは 前半、到着 がわは 後半だけ
    const corridorEndWeights = (t) => ({ from: CORRIDOR_END_MIX.words * (1 - smooth01(t / 0.5)), to: CORRIDOR_END_MIX.words * smooth01((t - 0.5) / 0.5) });
    // corridor に 入る まえに さきに デコードする 絵(段の ことば と 両端の 地域の ことば だけ。構造物は 絵を つかわない)。
    // Phase 4E-4B: 道 ぜんぶの 段(4〜14 こ)。入口で とおくに 見える 段や とちゅうの 段の 絵を、あるいて いる とちゅうで
    // はじめて デコード しない(atlas ごとに 1 回。のこる のは さいだい 3 まい)
    function corridorSceneryEmojis(spec, from, stageCount = Infinity) {
      if (!spec || (from !== spec.a && from !== spec.b)) return [];
      const to = from === spec.a ? spec.b : spec.a, st = from === spec.a ? spec.stages : spec.stages.slice().reverse();
      const out = new Set(), add = (pool) => { for (const it of pool || []) if (!/^[a-z]/.test(it[0])) out.add(it[0]); };
      st.slice(0, stageCount).forEach((q, i) => { const lk = corridorStageLook(q.terrain, (i + 0.5) / st.length < 0.5 ? from : to); add(lk.near); add(lk.far); });
      for (const r of [from, to]) { const lk = CORRIDOR_REGION_LOOK[r]; if (lk) { add(lk.near); add(lk.far); } }
      out.add(CORRIDOR_BLOCKER);
      return [...out];
    }
    const CORRIDOR_BLOCKER = '🪨';       // 帯の はしの いし(当たり判定 つき)
    const CORRIDOR_SCENE_MAX = 150;      // 飾りの 上限(設計 §14)
    const CORRIDOR_CAM_FOLLOW = 3;       // カメラが 道の むきを おいかける つよさ(1/秒)。あそび なし
    const CORRIDOR_BLOCKERS_PER_STAGE = 1;   // PoC は 1 段に 1 こ まで(上限 24 の なかで、しくみの たしかめ だけ)
    // 着く ときの じゅんばん: prepare(着く がわの world を 組む)→ commit(地域を 書きかえる)→ show(さいしょの え)。
    // prepare は どこで するか: 'ahead' = 終端の すこし てまえ(walkLength × prepareAhead)。'cover' = 暗転の はじめ。'end' = 暗転しきってから。
    // どれでも セーブ・地域の 書きかえは 着いた ときの 1 かい だけ。引き返したら(dropBehind より もどったら)組んだ ものは すてる
    // 'preload' = Phase 4E-3(とちゅうから 何 frame かに わけて 組む。CORRIDOR_PRELOAD)。組めて いなければ 着いた ときに 'end' と おなじ ように 組む
    const CORRIDOR_ARRIVAL = Object.freeze({ prepare: 'preload', prepareAhead: 0.08, dropBehind: 0.12, warmChunks: 8 });
    // prepare で 組んだ world を commit の buildWorld に 1 かい だけ わたす(同じ 到着で 2 かい 組まない)。メモリの なか だけ
    var corridorHandoff = null;
    const CORRIDOR_HANDOFF_STATS = { offers: 0, hits: 0, misses: 0, drops: 0 };
    // 組んだ ときと 同じ 条件か(住民の 台帳・まち・じかん・てんき・きせつ・ひづけ)。ちがえば つかわず、いつもどおり 組む
    function corridorWorldKey(regionId, registry, opts) {
      const e = env(), day = typeof S.dailyKey === 'function' ? S.dailyKey() : '';
      const loc = opts && opts.locality ? opts.locality.profileId || opts.locality.name || '' : '';
      return JSON.stringify([regionId, loc, e.time, e.weather, e.season, day, registry ? registry.residents : null, registry ? registry.naoto : null]);
    }
    function offerCorridorWorld(regionId, registry, opts, world, key) { corridorHandoff = { regionId, key: key || corridorWorldKey(regionId, registry, opts), world }; CORRIDOR_HANDOFF_STATS.offers++; }
    function dropCorridorWorld() { if (corridorHandoff) CORRIDOR_HANDOFF_STATS.drops++; corridorHandoff = null; }
    // buildWorld の いりぐちで よぶ。1 かい きり(あっても なくても ここで からに する)
    function takeCorridorWorld(regionId, registry, opts) {
      const h = corridorHandoff;
      if (!h) return null;
      corridorHandoff = null;
      if (h.regionId === regionId && h.key === corridorWorldKey(regionId, registry, opts)) { CORRIDOR_HANDOFF_STATS.hits++; return h.world; }
      CORRIDOR_HANDOFF_STATS.misses++;
      return null;
    }

    // その 出口を corridor で あるくか、いまの transition に するか。**ここ 1 か所だけで きめる**
    // opts: { perfTier, reducedMotion, heavy, failed(Set), allow }
    function continuousWalkMode(gate, opts = {}) {
      const no = (reason, spec) => ({ mode: 'transition', reason, spec: spec || null });
      if (!gate || gate.kind !== 'walk' || gate.way !== 'walk') return no('not-walk');
      const allow = opts.allow || CONTINUOUS_WALK_ALLOWLIST;
      if (allow.indexOf(gate.id) < 0) return no('not-allowed');
      const spec = walkCorridorSpec(gate.id);
      if (!spec) return no('no-spec');
      const here = spec.endpoints[gate.from], there = spec.endpoints[gate.to];
      if (!here || !there || !gate.spot || gate.spot.id !== here.spot || gate.at !== there.spot) return no('geometry-invalid', spec);
      const m = corridorMode(spec, { allow, perfTier: opts.perfTier, reducedMotion: opts.reducedMotion, heavy: opts.heavy,
        failed: !!(opts.failed && typeof opts.failed.has === 'function' && opts.failed.has(spec.connectionId)) });
      return { mode: m.mode, reason: m.reason, spec };
    }

    // ---- corridor の 平面(chart)----
    // 出発 地域の local の むきで、4E-1 の むき(global)を つみあげる。原点 = 出口 spot(+ CORRIDOR_ORIGIN)
    function corridorChart(spec, from) {
      const L = spec.walkLength, n = Math.ceil(L / CORRIDOR_SAMPLE), e = spec.endpoints[from];
      const to = from === spec.a ? spec.b : spec.a;
      // local → global の 角度の さ(度)。4E-1 の 出口の むき(local と global)から 出す
      const offOf = (r) => spec.endpoints[r].leaveHeadingGlobal - spec.endpoints[r].leaveHeadingLocal;
      const off = offOf(from), offTo = offOf(to);
      const xs = new Float64Array(n + 1), zs = new Float64Array(n + 1), hs = new Float64Array(n + 1);
      const headAt = (s) => (corridorHeadingAt(spec, from, s) - off) * Math.PI / 180;
      let x = CORRIDOR_ORIGIN, z = CORRIDOR_ORIGIN, prevS = 0;
      xs[0] = x; zs[0] = z; hs[0] = headAt(0);
      for (let i = 1; i <= n; i++) {
        const s = Math.min(L, i * CORRIDOR_SAMPLE), h = headAt(s), hm = hs[i - 1] + wrapAngle(h - hs[i - 1]) / 2, ds = s - prevS;
        x += Math.sin(hm) * ds; z += Math.cos(hm) * ds;
        xs[i] = x; zs[i] = z; hs[i] = h; prevS = s;
      }
      return { spec, from, to, L, n, xs, zs, hs, off, offTo, end: e };
    }
    // s / u → chart の x / z と すすむ むき(ラジアン。0 = chart の +z)。はしの そとは まっすぐ のばす
    function chartPose(ch, s, u) {
      const q = Math.max(0, Math.min(ch.L, s)) / CORRIDOR_SAMPLE, i = Math.min(ch.n - 1, Math.floor(q)), f = Math.min(1, q - i);
      const j = Math.min(ch.n, i + 1);
      const h = ch.hs[i] + wrapAngle(ch.hs[j] - ch.hs[i]) * f;
      let x = ch.xs[i] + (ch.xs[j] - ch.xs[i]) * f, z = ch.zs[i] + (ch.zs[j] - ch.zs[i]) * f;
      const over = s < 0 ? s : s > ch.L ? s - ch.L : 0;
      if (over) { x += Math.sin(h) * over; z += Math.cos(h) * over; }
      return { x: x + Math.cos(h) * u, z: z - Math.sin(h) * u, h };
    }
    // chart の 点 → いちばん ちかい s / u(near の まわり だけ さがす)
    function chartSU(ch, x, z, near) {
      const c = Math.round(Math.max(0, Math.min(ch.L, near)) / CORRIDOR_SAMPLE);
      let best = c, bd = Infinity;
      for (let i = Math.max(0, c - 60); i <= Math.min(ch.n, c + 60); i++) { const d = (ch.xs[i] - x) ** 2 + (ch.zs[i] - z) ** 2; if (d < bd) { bd = d; best = i; } }
      const h = ch.hs[best];
      return { s: Math.min(ch.L, best * CORRIDOR_SAMPLE), u: (x - ch.xs[best]) * Math.cos(h) - (z - ch.zs[best]) * Math.sin(h) };
    }
    const hexOf = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
    const smooth01 = (t) => { const k = Math.max(0, Math.min(1, t)); return k * k * (3 - 2 * k); };

    // ---- え に わたす かるい world(region の world と おなじ かたちの 一部だけ)----
    // 段ごとの みため(地面の いろ・飾り)は corridor を 作る ときに 1 かい だけ きめて おく(毎 frame つくらない)。
    // 段の さかいでは まえの 段と つぎの 段を みじかく まぜる(飾りの ことば も 地面の いろ も)
    function corridorWorld(ch) {
      const spec = ch.spec, A = WORLDS[ch.from] || WORLDS.home, B = WORLDS[ch.to] || WORLDS.home;
      const stages = ch.from === spec.a ? spec.stages : spec.stages.slice().reverse();
      const seed = hash('corridor:' + spec.connectionId + ':' + ch.from);
      const rnd = (k) => hash(seed + ':' + k) / 4294967296;
      const len = spec.stageLength, band = len * CORRIDOR_BLEND, last = stages.length - 1;
      // 段ごとの みため(palette の 地域から)。いろは rgb の まま もって おく。ちかい 端の 地域で かさねる(Phase 4E-4A)
      const n = stages.length;
      const looks = stages.map((st, i) => {
        const lk = corridorStageLook(st.terrain, (i + 0.5) / n < 0.5 ? ch.from : ch.to), P = WORLDS[lk.palette] || A;
        return { terrain: st.terrain, lk, P, g0: hexToRgb(P.ground[0]), g1: hexToRgb(P.ground[1]), path: hexToRgb(P.path), marks: P.marks || A.marks };
      });
      // 出発 → 到着 の いろ(地面の 種類の いろ を CORRIDOR_END_MIX.tint だけ かさねる)
      const endRgb = (W) => ({ g0: hexToRgb(W.ground[0]), g1: hexToRgb(W.ground[1]), path: hexToRgb(W.path) });
      const EA = endRgb(A), EB = endRgb(B);
      const RL = { from: CORRIDOR_REGION_LOOK[ch.from], to: CORRIDOR_REGION_LOOK[ch.to] };
      // その 場所の 段と、となりの 段へ どれだけ よって いるか(さかいで 0.5。はばの そとは 0)
      const lean = (s) => {
        const i = Math.max(0, Math.min(last, Math.floor(s / len))), s0 = i * len, s1 = s0 + len;
        if (i > 0 && s - s0 < band) return { i, j: i - 1, w: 0.5 * (1 - (s - s0) / band) };
        if (i < last && s1 - s < band) return { i, j: i + 1, w: 0.5 * (1 - (s1 - s) / band) };
        return { i, j: i, w: 0 };
      };
      const segments = [], marks = [], props = [], blockers = [];
      stages.forEach((st, i) => {
        const s0 = i * len, s1 = s0 + len, half = CORRIDOR_PATH_HALF[st.widthClass] || PATH_HALF.path;
        // みち(90 world ごとの 四角。え は region の みちと おなじ ように えがく)
        for (let s = s0; s < s1; s += 90) {
          const p = chartPose(ch, s, 0), q = chartPose(ch, Math.min(s1, s + 90), 0);
          segments.push({ a: { x: p.x, z: p.z }, b: { x: q.x, z: q.z }, len: Math.hypot(q.x - p.x, q.z - p.z) || 1, half, kind: 'path' });
          for (const side of [-1, 1]) { const m = chartPose(ch, s + 45, side * (half + 6)); marks.push({ x: m.x, z: m.z, size: 16, phase: 0, edge: true }); }
        }
        // 帯の なかの くさ(はしの ほう)
        for (let k = 0; k < 6; k++) { const s = s0 + rnd('t' + i + k) * len, side = rnd('ts' + i + k) < 0.5 ? -1 : 1;
          const m = chartPose(ch, Math.min(s1, s), side * (half + 20 + rnd('tu' + i + k) * (st.halfWidth - half))); marks.push({ x: m.x, z: m.z, size: 10 + rnd('tk' + i + k) * 14, phase: rnd('tf' + i + k) * 6.28 }); }
        // 両わきの 飾り(帯の そと)。near は みちの そば、far は おく。さかいの ちかくは となりの 段の ことばも まぜる
        const place = (kind, n, uMin, uSpan) => {
          for (let k = 0; k < n; k++) for (const side of [-1, 1]) {
            const key = kind + i + k + side, s = s0 + (k + 0.15 + rnd('ps' + key) * 0.7) * len / n;
            const le = lean(s), from = looks[le.w > 0 && rnd('pl' + key) < le.w ? le.j : le.i];
            // 端に ちかい ほど、その 端の 地域の ことばを まぜる(Phase 4E-4A)
            const ew = corridorEndWeights(s / ch.L), r = rnd('pr' + key);
            const endLook = r < ew.from ? RL.from : r < ew.from + ew.to ? RL.to : null;
            const look = endLook && endLook[kind] && endLook[kind].length ? endLook : from.lk;
            const pool = look[kind], it = pool[hash(seed + 'pe' + key) % pool.length];
            const u = side * (st.halfWidth + uMin + rnd('pu' + key) * uSpan), p = chartPose(ch, s, u);
            const size = it[1] * (0.85 + rnd('pz' + key) * 0.3), deco = { x: p.x, z: p.z, size, layer: 'side', s, terrain: from.terrain };
            if (/^[a-z]/.test(it[0])) Object.assign(deco, { struct: it[0], ang: p.h, side, solid: false }); else deco.emoji = it[0];
            props.push(deco);
          }
        };
        place('near', looks[i].lk.nearN, 20, 70);
        place('far', looks[i].lk.farN, ...(looks[i].lk.farU || [120, 260]));
        // 帯の はしの いし(当たり判定 つき)。道の 通行帯には おかない
        for (let k = 0; k < Math.min(CORRIDOR_BLOCKERS_PER_STAGE, st.obstacleAllowance); k++) {
          const side = hash(seed + 'bs' + i + k) % 2 ? 1 : -1, s = s0 + (0.35 + rnd('bs' + i + k) * 0.3) * len;
          const u = side * (st.uMax - 16), p = chartPose(ch, s, u);   // 帯の なかの はし(道の 通行帯の そと)
          blockers.push({ s, u, r: 24 });
          props.push({ x: p.x, z: p.z, emoji: CORRIDOR_BLOCKER, size: 70, layer: 'side', blocker: true });
        }
      });
      const world = {
        corridor: spec.connectionId, chartFrom: ch.from, regionId: ch.from, len: CORRIDOR_ORIGIN * 2, halfW: CORRIDOR_ORIGIN, minX: 0, maxX: CORRIDOR_ORIGIN * 2, seed,
        ground: A.ground, path: A.path, spots: [], segments, marks: marks.slice(0, 400), props: props.slice(0, CORRIDOR_SCENE_MAX), residents: [],
        detail: A.detail || [], canopy: null, density: 0.8, view: 1, terrain: null, wind: A.wind || [0.5, 1], motion: A.motion || [],
        areas: [], shore: [], edge: A.edge || '#8a7a5a', backdrop: A.backdrop || 'hills', sky: A.sky || null, floor: null,
        markStyle: A.marks || { color: '#88aa66', kind: 'tuft' }, blockers,
      };
      // 森の 屋根(canopy)は 森の 段の おく(森で ない 段から 2 段 いじょう はなれた ところ)だけ
      const deep = looks.map((lk, i) => lk.terrain === 'forest' && looks.every((o, j) => o.terrain === 'forest' || Math.abs(i - j) >= 2));
      let lastKey = null;
      // すすみぐあい → その 場所の みため。地面・みちの いろは さかいで なめらかに、山なみ・くさ は その 段の もの。
      // 地域の なまえ(遠景の きりかえ)は まんなかで 出発 → 到着
      world.setProgress = (t) => {
        const s = Math.max(0, Math.min(1, t)) * ch.L, le = lean(s), a = looks[le.i], b = looks[le.j], k = smooth01(le.w * 2) / 2;
        const tq = Math.max(0, Math.min(1, t)), key = le.i + ':' + le.j + ':' + Math.round(k * 64) + ':' + Math.round(tq * 120);
        if (key === lastKey) return;
        lastKey = key;
        world.regionId = t < 0.5 ? ch.from : ch.to;
        // Phase 4E-4A: いろ = 出発 → 到着 の いろ(すすみぐあい に そって まっすぐ)に 地面の 種類の いろ を かさねる。
        // 地面の 種類の いろが 端の 地域の いろ(出発 / 到着)の ときは、その 端から はなれる ほど よわく する
        // (さばく → 岩 → さばく → 山 のように 行ったり 来たり しない)。はたけ・坂 のような ほかの 地域の いろは そのまま かさねる
        // Phase 4E-4B: 端の 地域で ない いろ(川・はたけ など)は 端から 1 段 かけて かさね はじめる(道の はしは かならず 端の 地域の いろ)
        const edge = smooth01(Math.min(tq, 1 - tq) * n);
        const T = CORRIDOR_END_MIX.tint, wOf = (lk) => (lk.P === A ? (1 - tq) * (1 - tq) : lk.P === B ? tq * tq : edge);
        const tw = T * (wOf(a) * (1 - k) + wOf(b) * k);
        const terr = (f) => mixRgbArr(a[f], b[f], k), base = (f) => mixRgbArr(EA[f], EB[f], tq);
        world.ground = [hexOf(mixRgbArr(base('g0'), terr('g0'), tw)), hexOf(mixRgbArr(base('g1'), terr('g1'), tw))];
        world.path = hexOf(mixRgbArr(base('path'), terr('path'), tw));
        const P = a.P;
        // 背景(backdrop)は 両端の 地域の もの だけ。まんなか(空・遠景の きりかえと おなじ)で 1 回だけ かわる。
        // とちゅうの 段の 地面で 山 → 湖 → 山 と 行ったり来たり しない(Phase 4E-4A)
        world.backdrop = (t < 0.5 ? A : B).backdrop || 'hills'; world.sky = (t < 0.5 ? A : B).sky || null; world.detail = P.detail || [];
        world.wind = P.wind || [0.5, 1]; world.motion = P.motion || []; world.markStyle = a.marks || world.markStyle; world.edge = P.edge || world.edge;
        world.canopy = deep[le.i] ? a.P.canopy || null : null;
      };
      world.setProgress(0);
      return world;
    }
    const mixRgbArr = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

    // 遠景: 出発 がわ と 到着 がわ を すすみぐあいで まぜる(t < 0.4 出発、0.4〜0.6 両方、t > 0.6 到着)。
    // 方位は chart(出発 地域の local)へ なおす。renderer は いまの まま(方角 + カメラの むき)で えがく
    function corridorDistantBlend(ch, t, fromList, toList) {
      const wFrom = t < 0.4 ? 1 : t > 0.6 ? 0 : (0.6 - t) / 0.2, wTo = 1 - wFrom;
      const out = [];
      const put = (list, w, dOff) => { if (w <= 0.001) return; for (const v of list || []) {
        const f = v.feature, b = f.bearingLocal == null ? null : (((f.bearingLocal + dOff) % 360) + 360) % 360;
        out.push({ id: v.id, alpha: v.alpha * w, feature: Object.assign({}, f, { bearingLocal: b }) }); } };
      put(fromList, wFrom, 0);
      put(toList, wTo, ch.offTo - ch.off);
      return out;
    }

    // ---- あるく しくみ(1 本の corridor を 1 かい あるく あいだ だけ)----
    // opts: { local: {x, z}(出発 地域の local), heading, yaw(出発 地域の local のカメラ), cam: {dist, height}, firstVisit, party, env }
    function createCorridorWalk(spec, from, opts = {}) {
      const ch = corridorChart(spec, from), e = ch.end, L = ch.L;
      const init = corridorEnterState(spec, from, opts.local || { x: e.x, z: e.z }, { firstVisit: opts.firstVisit !== false });
      if (!init || !Number.isFinite(init.s) || !Number.isFinite(init.u)) throw new Error('corridor state');
      const state = Object.assign(init, { width: spec.nominalWidth, active: true });
      // Phase 4E-4A: 出口の てまえで 組んで おいた おなじ corridor・おなじ むきの world が あれば それを つかう(二重に 組まない)。
      // world は seed で きまり、あるく ときに かわるのは setProgress の いろ だけ なので、いまの すすみぐあいに あわせなおす
      const reuse = opts.world && opts.world.corridor === spec.connectionId && opts.world.chartFrom === ch.from ? opts.world : null;
      const world = reuse || corridorWorld(ch);
      if (reuse) world.setProgress(Math.max(0, Math.min(1, state.s / L)));
      const blockers = world.blockers;
      const toChart = (p) => ({ x: CORRIDOR_ORIGIN + (p.x - e.x), z: CORRIDOR_ORIGIN + (p.z - e.z) });
      const toFromLocal = (p) => ({ x: p.x - CORRIDOR_ORIGIN + e.x, z: p.z - CORRIDOR_ORIGIN + e.z });
      const p0 = chartPose(ch, state.s, state.u);
      const player = { x: p0.x, z: p0.z, heading: opts.heading != null ? opts.heading : p0.h, face: 1, bob: 0, moving: false, onPath: true, speed: 0 };
      const prof = CAM_PROFILES.path || CAM_PROFILES.default;
      const camera = { x: p0.x, z: p0.z, yaw: opts.yaw != null ? opts.yaw : p0.h,
        dist: opts.cam && opts.cam.dist ? opts.cam.dist : prof.dist, height: opts.cam && opts.cam.height ? opts.cam.height : prof.height };
      const party = opts.party || [];
      for (const a of party) { const c = toChart(a); a.x = c.x; a.z = c.z; }
      const envNow = opts.env || ENV_FALLBACK;
      const mood = Object.assign({}, MOOD_DEFAULT);
      let inputActive = false, inputDir = 1, frame = 0;
      function followParty(dt) {
        // ならびは region と おなじ partyFormationSlots。はばは いまの 段の 帯(4E-1 の widthClass → uMax)から。せまい 段では ほそく なる
        const Fo = RULES.follow, slots = formationFor(party.length, corridorStageAt(spec, from, Math.max(0, Math.min(L, state.s))).uMax * 0.9);
        party.forEach((a, i) => {
          const t = formationPoint(a, i, slots, player.x, player.z, camera.yaw);
          let tx = t.x, tz = t.z;
          // 帯の そとへ 出ない
          const su = chartSU(ch, tx, tz, state.s), lim = corridorStageAt(spec, from, su.s).uMax;
          if (Math.abs(su.u) > lim) { const q = chartPose(ch, su.s, Math.sign(su.u) * lim); tx = q.x; tz = q.z; }
          const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
          // 2 かいめ の はやあし(speedMultiplier)でも おいつける
          if (d > Fo.snap) { const spd = Math.min(Fo.maxSpeed * 1.4 * state.speedMultiplier, d * FORMATION.gain) * t.k; a.x += dx / d * Math.min(d, spd * dt); a.z += dz / d * Math.min(d, spd * dt); a.behavior = 'walk'; a.heading = Math.atan2(dx, dz); a.face = dx < 0 ? -1 : 1; a.bob += dt; }
          else if (a.behavior !== 'idle') { a.behavior = 'idle'; a.heading = player.heading; }
        });
      }
      function step(dt, v) {
        frame++;
        const inp = v || { x: 0, y: 0 };
        player.moving = !!(inp.x || inp.y);
        const h = chartPose(ch, state.s, 0).h;
        if (!player.moving) { inputActive = false; player.speed = 0; }
        // ゆびを おいた ときに カメラが 道の どちらを むいて いるかで「まえ」を きめ、はなす まで かえない
        // (いまの たんさくの「ゆびを おいた ときの むきで こてい」と おなじ かんがえ。ふりむいても いったり きたり しない)
        else if (!inputActive) { inputActive = true; inputDir = Math.cos(camera.yaw - h) >= 0 ? 1 : -1; }
        if (player.moving) {
          // 道に そって: がめんの うえ/した = 道の まえ/うしろ、ひだり/みぎ = 道の よこ。レールでは なく 帯の なかを あるく
          const m = Math.hypot(inp.x, inp.y) || 1;
          const spd = RULES.playerSpeed * state.speedMultiplier * Math.min(1, m);
          const fwd = -inp.y / m * inputDir, side = inp.x / m * inputDir;
          let s = state.s + fwd * spd * dt;
          let u = state.u + side * spd * dt;
          const mx = Math.sin(h) * fwd + Math.cos(h) * side, mz = Math.cos(h) * fwd - Math.sin(h) * side;
          // 帯の はし(左右の さかい)
          const lim = corridorStageAt(spec, from, Math.max(0, Math.min(L, s))).uMax;
          if (u > lim) u = lim; else if (u < -lim) u = -lim;
          // はしの いし: 横へ すべらせる(前へは すすめる)
          for (const o of blockers) {
            const os = o.s, ou = o.u, rr = o.r + RULES.bodyRadius;   // いしは この むきの chart で おいて ある
            const ds = s - os, du = u - ou, d = Math.hypot(ds, du);
            if (d < rr) { if (d < 1e-6) { u = ou - Math.sign(ou || 1) * rr; } else { s = os + ds / d * rr; u = ou + du / d * rr; } }
          }
          if (u > lim) u = lim; else if (u < -lim) u = -lim;   // いしに おされても 帯の そとへは 出ない
          state.s = s; state.u = u;
          player.heading = Math.atan2(mx, mz);
          const scr = Math.cos(camera.yaw) * mx - Math.sin(camera.yaw) * mz; player.face = scr < -0.2 ? -1 : scr > 0.2 ? 1 : player.face;
          player.bob += dt; player.speed = spd / RULES.playerSpeed;
        }
        const P = chartPose(ch, state.s, state.u);
        player.x = P.x; player.z = P.z;
        camera.x = player.x; camera.z = player.z;
        // カメラの むきは 道の むきへ(もどる ときは うしろむき)。道は ずっと すこしずつ 曲がる ので、
        // たんさくの「あそび(deadZone)を こえたら まわす」だと とまる → きゅうに まわる を くりかえす。
        // ここは あそび なしで なめらかに おいかける(はやさの 上限は おなじ turnRate)
        if (player.moving) {
          let want = player.heading, pd = P.h;
          if (Math.cos(pd - want) < 0) pd += Math.PI;
          want = want + wrapAngle(pd - want) * RULES.cam.pathAssist;
          const delta = wrapAngle(want - camera.yaw);
          const turn = Math.sign(delta) * Math.min(Math.abs(delta) * Math.min(1, dt * CORRIDOR_CAM_FOLLOW), RULES.cam.turnRate * dt);
          camera.yaw = wrapAngle(camera.yaw + turn);
        }
        camera.dist += (prof.dist - camera.dist) * Math.min(1, dt * RULES.cam.ease);
        camera.height += (prof.height - camera.height) * Math.min(1, dt * RULES.cam.ease);
        followParty(dt);
        world.setProgress(Math.max(0, Math.min(1, state.s / L)));
        if (state.s >= L) return { type: 'arrive' };
        if (state.s < 0) return { type: 'back' };
        return null;
      }
      const view = () => ({ regionId: world.regionId, world, residents: [], party, player, camera, rig: camera, camFx: null, nearest: null,
        spot: null, zone: null, mood, env: envNow, frame, lifeDebug: false, lifeOf: () => null, corridor: state });
      return {
        spec, chart: ch, state, world, player, camera, party, step, view,
        get t() { return Math.max(0, Math.min(1, state.s / L)); },
        stage: () => corridorStageAt(spec, from, Math.max(0, Math.min(L, state.s))),
        exitPose: () => corridorExitPose(spec, state),
        backPose: () => corridorExitPose(spec, Object.assign({}, state, { s: Math.min(-1, state.s) })),
        // カメラの むきを その 地域の local へ(着いた がわ = 地域の むきの さを たす)
        yawIn: (region) => (region === from ? camera.yaw : wrapAngle(camera.yaw + (ch.off - ch.offTo) * Math.PI / 180)),
        // もどった とき: なかまを 出発 地域の local へ もどす
        restoreParty() { for (const a of party) { const p = toFromLocal(a); a.x = p.x; a.z = p.z; } },
        distant: (t, fromList, toList) => corridorDistantBlend(ch, t, fromList, toList),
      };
    }
    // ---- Phase 4E-3: 着く がわの world を とちゅうで 組んで おく(preload)----
    // 正本(state.regionId・セーブ・はっけん)は 着く まで 出発 地域の まま。組んだ world は メモリの なか だけ。
    // じょうたい: idle → preparing(buildWorldSteps を 1 frame budgetMs ずつ)→ ready → committed(着いた)
    //   preparing / ready で dispose より もどったら aborted(すてる。また start を こえたら 組みなおす)。
    //   こけたら failed(その 旅では もう 組まない。着いた ときに いまの 4E-2 の 着き方で 組む)
    // Phase 4E-4A: 組みはじめ / すてる は「道の のこり きょり」で きめる(割合では ない)。
    //   LEAD = 着く まえに のこす 時間(2 かいめの はやさ 260 × 1.4 で あるく とき)
    //        = readySec(組みおえる まで。4E-3/Preflight の 実測 さいだい 約 0.95 秒 → 1.0)
    //        + marginSec(ready から 着く まで。絵の したく 24 回 ≈ 0.9 秒 を ふくむ。1.2)
    //   startRemaining = LEAD × 364 を 10 に きりあげ = 810(6 段 2700 では 0.70 と おなじ。5 段 2250 では 0.64)
    //   disposeRemaining = startRemaining + 1.5 段(675)= 1485(あそび。6 段で 0.45、5 段で 0.34)。組む ⇄ すてる を くりかえさない
    // warmChunks: 絵の したくを 何回に わけるか(4E-2 の 8 より こまかく。とちゅうから 組むので じかんは ある)
    const CORRIDOR_PRELOAD_LEAD = Object.freeze({ readySec: 1.0, marginSec: 1.2, hysteresisStages: 1.5 });
    const CORRIDOR_PRELOAD = (() => {
      const L = CORRIDOR_PRELOAD_LEAD, sec = L.readySec + L.marginSec, speed = RULES.playerSpeed * CORRIDOR_REVISIT_SPEED;
      const startRemaining = Math.ceil(sec * speed / 10) * 10;
      return Object.freeze({ leadSec: sec, startRemaining, disposeRemaining: startRemaining + L.hysteresisStages * CORRIDOR_STAGE_WALK, budgetMs: 4, warmChunks: 24 });
    })();
    const CORRIDOR_PRELOAD_STATES = Object.freeze(['idle', 'preparing', 'ready', 'failed', 'aborted', 'committed']);
    // いまの じょうたい と 道の のこり(world)から、する こと('start' / 'abort' / null)。こけた あと・着いた あとは なにも しない
    function corridorPreloadAction(state, remaining, P = CORRIDOR_PRELOAD) {
      if ((state === 'idle' || state === 'aborted') && remaining <= P.startRemaining) return 'start';
      if ((state === 'preparing' || state === 'ready') && remaining > P.disposeRemaining) return 'abort';
      return null;
    }
    // ====== /Phase 4E-2 ======

    // 世界地図に 出す 地域(= 地上の 10 と、たてじくの 上下 2)。きおくのみずうみは 入らない
    const GEO_GROUND = Object.keys(WORLD_GEOGRAPHY.regions).filter((id) => WORLD_GEOGRAPHY.regions[id].layer === 'ground');
    const GEO_AXIS_LAYERS = ['deepsea', 'star_stop'];

    // ---- 正式地理から ひける ひょう(ぜんぶ WORLD_GEOGRAPHY から。UI・え・はっけん処理で べつべつに
    //      書きうつさない #38) ----
    // 大 landmark(tier 1)は spot の landmark / lmTier から。world を 組まなくても わかる
    function worldTier1(regionId) {
      const base = WORLDS[regionId];
      if (!base) return [];
      return base.spots.filter((q) => q.landmark && (q.lmTier || 1) === 1 && !q.secret)
        .map((q) => ({ mid: 'lm:' + q.id, spot: q.id, label: q.label, kind: q.landmark, x: q.x, z: q.z }));
    }
    // せかい たんさくりつ の ぶんぼ。ひみつ spot も ひみつ path も 1つも 入って いない ので、
    // パーセントから のこりの ひみつの かずは ぎゃくさんできない(#29, #30)
    const worldCountable = () => {
      const regions = NORMAL_REGIONS.slice();                       // 通常 11 地域(しんかい こみ)
      const inNormal = (id) => regions.includes(id);
      const links = WORLD_GEOGRAPHY.connections.filter((c) => c.b && inNormal(c.a) && inNormal(c.b));
      const tier1 = regions.reduce((n, id) => n + worldTier1(id).length, 0);
      const zones = regions.reduce((n, id) => n + ((WORLDS[id] && WORLDS[id].zones) || []).length, 0);
      return { regions, links: links.map((c) => c.id), tier1, zones };
    };
    const WORLD_PROGRESS_WEIGHT = { regions: 0.4, links: 0.25, marks: 0.2, zones: 0.15 };

    // 旧セーブから「世界地図で 見つけて いる 地域」を 組みなおす(#19, #46)。
    // たびで 行った ことの ある 地域は そのまま 見つけて いる あつかいに する。
    // ただし「地域に 行った」=「その 地域から のびる みちも ぜんぶ 見つけた」には しない(#22)。
    // みちの はっけんは spot たんいの べつの じょうけん(worldLinksFrom)で きまる
    function seedWorldRegions(lifetime) {
      const out = new Set();
      const add = (list) => { for (const id of (list || [])) if (WORLD_GEOGRAPHY.regions[id]) out.add(id); };
      add(lifetime && lifetime.regionsVisited);
      add(lifetime && lifetime.specialRegionsVisited);
      out.add('home');                       // はじめての ひとも おうちだけは わかって いる(#47)
      return [...out];
    }
    // みちの はっけん: りょうがわの「入口の spot」を どちらも 見つけて いる ときだけ。
    // 「その 地域へ 行った ことが ある」だけでは ぜったいに ひらかない
    function worldLinksFrom(spotsByRegion) {
      const found = (regionId, spotId) => {
        const list = (spotsByRegion && spotsByRegion[regionId]) || [];
        return list.indexOf(spotId) >= 0;
      };
      return WORLD_GEOGRAPHY.connections.filter((c) => {
        if (!c.mouths) return false;
        return Object.keys(c.mouths).every((rid) => found(rid, c.mouths[rid]));
      }).map((c) => c.id);
    }

    // 世界地図の もと。「見つけた ぶん」だけを かえす 純すいな データ。
    // え には いっさい さわらない ので、Three.js に かわっても この データの まま つかえる。
    // 未発見の 地域は かたちも なまえも 出さない(#18, #45, #53)
    function worldMapData(rec = {}) {
      const G = WORLD_GEOGRAPHY;
      const known = new Set((rec.regions || []).filter((id) => G.regions[id]));
      const linkSet = new Set(rec.links || []);
      const marks = rec.marks || {}, zones = rec.zones || {};
      const label = rec.label || ((id) => id);
      const seen = (id) => known.has(id);
      // ---- 地域(地上のみ。たてじくの 2つは べつあつかい、きおくは 出さない) ----
      const regions = GEO_GROUND.filter(seen).map((id) => {
        const g = G.regions[id], sh = worldMapShape(id), base = WORLDS[id] || {};
        const mine = new Set(marks[id] || []);
        return { id, label: label(id), x: g.mapX, y: g.mapY, axis: g.axis, layer: g.layer,
          climate: g.climate, terrain: g.terrain.slice(), belt: g.belt, river: g.river,
          rx: sh.rx, ry: sh.ry, ground: (base.ground || ['#9ab07a', '#6d8a55']).slice(),
          here: rec.here === id,
          // 見つけた 大 landmark だけ。まだ 見て いない ものは 出さない(#51, #53)
          marks: worldTier1(id).filter((m) => mine.has(m.mid)).map((m) => ({ mid: m.mid, label: m.label, kind: m.kind })) };
      });
      // ---- たてじく。D2 では 1 点では なく **山の上** と **海の下** の 2 か所。
      // どちらも「上る／下る もとの 地域」と「その さきの 地域」を どちらも 見つけて
      // いる ときだけ 出す(未発見の そんざいを ばらさない)
      const anchor = (a) => {
        const on = seen(a.region) && seen(a.from);
        // 見つけて いない あいだは **なまえも ばしょも のりものも わたさない**。
        // `on: false` だけを かえす。ここで 座標や なまえを わたして いると、
        // え に かいて いなくても データの がわで そんざいが ばれる(#12)。
        // 「上る もとの 地域には 行った」ことだけは、つぎの めあてに なるので のこす
        if (!on) return { on: false, base: seen(a.from) };
        // たてじくの みちが **特殊接続**なら、その のりものを え の がわへ つたえる。
        // ふつうの 徒歩の みちと おなじ 見た目に しない ため(#11)
        const via = G.connections.find((c) => c.b === a.region && c.vertical);
        return { x: a.mapX, y: a.mapY, label: a.label, short: a.short, from: a.from, region: a.region,
          ride: via && via.vertical.ride ? via.vertical.ride.kind : null,
          on: true, base: true };
      };
      const axis = { sky: anchor(G.axis.sky), deep: anchor(G.axis.deep) };
      // ---- 地形(feature)。**見つけた 地域の まわり だけ**が 紙に かきたされる。
      // 「その 点の 地域を 見つけた」だけ では 出さない。そう しないと、かわ・みずうみを
      // 見つけた だけで 8 めもり ある ひがしの 山地が まるごと 出て しまい、
      // まだ 行って いない ところの かたちが 先に わかって しまう(#20〜#23) ----
      // 見つけた 地域が ふえる ほど、1つ1つの 地域から 紙に かきたされる はんいも
      // すこしずつ ひろがる。だから 100% では すきまなく つながり、とちゅうでは
      // 「行った ところの まわり だけ」が わかる
      const grown = WMAP_REVEAL * (1 + 0.8 * (known.size / GEO_GROUND.length));
      const knownAt = [...known].map((id) => { const g = G.regions[id], sh = worldMapShape(id);
        return { x: g.mapX, y: g.mapY, r: Math.max(sh.rx, sh.ry) + grown }; });
      // 11 の 地上の 地域を ぜんぶ 見つけたら、せかいの かたちは そこで 完成する
      const allGround = known.size >= GEO_GROUND.length;
      const nearKnown = (x, y) => allGround || knownAt.some((q) => Math.hypot(q.x - x, q.y - y) <= q.r);
      const features = G.features
        // needs が ある 地形(しま など)は、その 地域を 見つける まで **1 てんも** 出さない
        .filter((f) => !f.needs || seen(f.needs))
        .map((f) => ({ id: f.id, kind: f.kind, label: f.label,
          // まだ わからない 点は、**ばしょも どの 地域の ものかも わたさない**。
          // かず だけ そのままに して、え の がわが 点の ならびを かぞえられる ように する
          // 見えて いる 点でも **どの 地域の ものかは わたさない**。え の がわは
          // 線を ひく ために x/y しか つかわない のに、region を わたすと
          // 「まだ 見つけて いない 地域が そこに ある」ことが データで ばれて しまう
          points: f.points.map((p) => (nearKnown(p.x, p.y)
            ? { x: p.x, y: p.y, on: true } : { on: false })) }))
        .filter((f) => f.points.some((p) => p.on));
      // ---- みち。見つけた ものだけ。りょうはしの 地域も 見つけて いる ことが 条件 ----
      const links = G.connections.filter((c) => c.b && linkSet.has(c.id) && seen(c.a) && seen(c.b))
        .map((c) => {
          const A = G.regions[c.a], B = G.regions[c.b];
          return { id: c.id, a: c.a, b: c.b, kind: c.kind, layer: c.layer, made: c.made,
            // 徒歩の みちか、とくべつな みちか。え の がわが ここで わけられる ように する
            special: c.special || null,
            label: c.label, long: !!c.long, ax: A.mapX, ay: A.mapY, bx: B.mapX, by: B.mapY };
        });
      // ---- 紙の はんい。**いま わかって いる ぶん**に あわせる ので、
      // はじめは おうちの まわり だけ、すすむほど せかいが ひろがって いく。
      // 100% で ちょうど ぜんたい(WMAP_BOUNDS)に なる(#28) ----
      const bounds = (() => {
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        const take = (x, y, r) => { x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); y0 = Math.min(y0, y - r); y1 = Math.max(y1, y + r); };
        for (const r of regions) take(r.x, r.y, Math.max(r.rx, r.ry) + 0.35);
        for (const f of features) for (const p of f.points) if (p.on) take(p.x, p.y, 0.3);
        for (const a of [axis.sky, axis.deep]) if (a.on) take(a.x, a.y, 0.5);
        // なにも 見つけて いない ときは、いちばん ちいさな 紙(おうちの まわり だけ)。
        // ここを ひろく とると、1 か所 見つけた ときに 紙が **せまく** なって しまう
        if (!Number.isFinite(x0)) { const h = G.regions.home; take(h.mapX, h.mapY, 1.2); }
        const B = WMAP_BOUNDS;
        return { x0: Math.max(B.x0, x0), x1: Math.min(B.x1, x1), y0: Math.max(B.y0, y0), y1: Math.min(B.y1, y1) };
      })();
      // ---- すすみぐあい: 4つとも ひみつを ふくまない ていすう ----
      const C = worldCountable();
      const gotR = C.regions.filter(seen).length;
      const gotL = C.links.filter((id) => linkSet.has(id)).length;
      const gotM = C.regions.reduce((n, id) => {
        const mine = new Set(marks[id] || []);
        return n + worldTier1(id).filter((m) => mine.has(m.mid)).length;
      }, 0);
      const gotZ = C.regions.reduce((n, id) => n + ((zones[id] || []).length), 0);
      const W = WORLD_PROGRESS_WEIGHT;
      const ratio = (a, b) => (b > 0 ? Math.min(1, a / b) : 0);
      const percent = Math.round((W.regions * ratio(gotR, C.regions.length)
        + W.links * ratio(gotL, C.links.length) + W.marks * ratio(gotM, C.tier1)
        + W.zones * ratio(gotZ, C.zones)) * 100);
      return {
        version: G.version, plan: G.plan, regions, axis, features, links, bounds,
        // せかいの へり。**まだ 見つけて いない 地域の id は わたさない**。
        // 「がいようの むこうに jungle が ある」と データの がわで ばれて しまう
        rim: G.rim.map((r) => ({ dir: r.dir, kind: r.kind, label: r.label, near: r.near.filter(seen) })),
        here: rec.here && seen(rec.here) ? rec.here : null,
        // 特殊層は 通常の % とは べつに かぞえる(#49)。きおくのみずうみは 地図に 出さない(#28)
        layers: { sky: seen('star_stop'), deep: seen('deepsea'), memory: known.has('memory_lake') },
        progress: { percent,
          regions: gotR, regionTotal: C.regions.length,
          links: gotL, linkTotal: C.links.length,
          marks: gotM, markTotal: C.tier1,
          zones: gotZ, zoneTotal: C.zones },
      };
    }

    // ================= ちず(あるいた きろくを 見る がめん) =================
    // ここは mapData() の データだけを よんで え に する。せかいの けいさんは しない。
    // Three.js に かわっても mapData() は そのままな ので、この ロジックは つかい まわせる
    const MAP_TUNING = { pad: 26, minZoom: 1, maxZoom: 3.2, zoomStep: 0.6 };
    const hexLum = (hex) => { const c = hexToRgb(hex || '#888888'); return (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) / 255; };
    const mapMix = (a, b, t) => { const x = hexToRgb(a), y = hexToRgb(b); return `${Math.round(x[0] + (y[0] - x[0]) * t)},${Math.round(x[1] + (y[1] - x[1]) * t)},${Math.round(x[2] + (y[2] - x[2]) * t)}`; };

    // 地域ごとの「かみの いろ」と「インクの いろ」。くらい 地域(しんかい・ほしぞら・きおくのみずうみ)は
    // くらい かみに 白い インク。地形の いろから きめるので、地域を ふやしても そのまま つかえる
    function mapPalette(md) {
      const g0 = (md.ground && md.ground[0]) || '#9ab07a', g1 = (md.ground && md.ground[1]) || '#6d8a55';
      // くらい かみを つかうのは、ほんとうに くらい 地域 だけ(しんかい・ほしぞら)。
      // とかい や きおくのみずうみ は あかるい かみの ほうが みちが よめる
      const dark = hexLum(g1) < 0.22;
      return {
        // かみは どの 地域の 地面より あかるく する。そうしないと
        // 「かかれた ところ」と「まだ かかれて いない ところ」の さかいが 見えない
        paper: dark ? '#171c31' : '#f8f2e3', grid: dark ? 'rgba(255,255,255,.055)' : 'rgba(120,96,58,.085)',
        ink: dark ? '#d5def4' : '#544530', faint: dark ? 'rgba(213,222,244,.30)' : 'rgba(84,69,48,.30)',
        land: g0, landEdge: g1, water: dark ? '#0e1a36' : '#6fb6d8', dark,
      };
    }

    // ちずの もと(mapData)から え の じゅんびを する。え は まだ かかない
    function mapLayout(md, W, H, zoom, panX, panY) {
      const P = MAP_TUNING.pad;
      const wW = md.halfW * 2, wH = md.len;
      const base = Math.min((W - P * 2) / wW, (H - P * 2) / wH);
      const s = base * zoom;
      const cx = W / 2 + panX, cy = H / 2 + panY;
      // よこ: せかいの x そのまま。たて: おくへ いくほど うえ(あるいて きた ほうが した)
      const toX = (x) => cx + x * s;
      const toY = (z) => cy + (wH / 2 - z) * s;
      return { s, toX, toY, base, W, H,
        fromX: (px) => (px - cx) / s, fromZ: (py) => wH / 2 - (py - cy) / s };
    }

    // ちずを かく。もどり値は「タップで あたった スポット」を しらべる ための ひょう
    function drawMap(ctx, md, L, pal, opts = {}) {
      const { W, H, s, toX, toY } = L;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = pal.paper; ctx.fillRect(0, 0, W, H);
      // かみの め(うすい ます目)。まだ かかれて いない ところ は この まま
      ctx.strokeStyle = pal.grid; ctx.lineWidth = 1;
      const gs = Math.max(26, 900 * s);
      ctx.beginPath();
      for (let x = (toX(-md.halfW) % gs + gs) % gs; x < W; x += gs) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, H); }
      for (let y = (toY(md.len) % gs + gs) % gs; y < H; y += gs) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(W, Math.round(y) + 0.5); }
      ctx.stroke();
      // 地域の わく(かたちだけ。なかみは 出さない)
      ctx.strokeStyle = pal.faint; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
      ctx.strokeRect(toX(-md.halfW), toY(md.len), md.halfW * 2 * s, md.len * s);
      ctx.setLineDash([]);

      // ---- あるいた ところ(地区)を「かきこんだ」ように ぬる ----
      // 地区 1つ = やわらかい しみ 1つ。ふちを ぼかすので「手で ぬった ちず」に 見える
      const blob = (c, z, rgb, alpha, grow, ox) => {
        const b = z.bounds;
        const rx = Math.max(((b.maxX - b.minX) / 2 + 280) * s * grow, 18);
        const ry = Math.max(((b.maxZ - b.minZ) / 2 + 280) * s * grow, 18);
        const px = toX((b.minX + b.maxX) / 2 + (ox || 0)), py = toY((b.minZ + b.maxZ) / 2);
        c.save(); c.translate(px, py); c.scale(rx, ry);
        const g = c.createRadialGradient(0, 0, 0.2, 0, 0, 1);
        g.addColorStop(0, `rgba(${rgb},${alpha})`); g.addColorStop(0.68, `rgba(${rgb},${alpha})`); g.addColorStop(1, `rgba(${rgb},0)`);
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, 1, 0, TAU); c.fill(); c.restore();
      };
      const rgbOf = (hex) => hexToRgb(hex).join(',');
      const landBase = mapMix(pal.land, pal.landEdge, 0.42);
      const landRgb = (z) => (z.tint ? mapMix(z.tint, pal.landEdge, 0.3) : landBase);
      const mask = opts.mask; // おなじ おおきさの さぎょう canvas(あれば みずを かたちで きる ために つかう)
      const landC = mask ? mask.ctx : ctx;
      if (mask) mask.ctx.clearRect(0, 0, W, H);
      // うみの ある 地域は、あるいた ところ から みずぎわの ぶんだけ よこへ のばす。
      // そうすると「あるいた ぶんの かいがんせん」が ちずに のこる
      const coastSide = md.terrain && md.terrain.kind === 'coast' ? (md.terrain.side || -1) : 0;
      for (const z of md.zones) if (z.visited) {
        blob(landC, z, rgbOf(pal.landEdge), 0.3, 1.1);       // ふちを やわらかく
        blob(landC, z, landRgb(z), 0.97, 1);
        if (coastSide) blob(landC, z, landRgb(z), 0.97, 0.9, coastSide * 700);
      }
      // ---- みず(あるいた ところ だけ。まだ 行って いない ところの かたちは 出ない) ----
      if (mask && md.terrain && md.terrain.pts && md.terrain.pts.length) {
        const mc = mask.ctx, t = md.terrain;
        mc.save(); mc.globalCompositeOperation = 'source-atop'; mc.fillStyle = pal.water; mc.strokeStyle = pal.water;
        if (t.kind === 'coast') {
          const edge = toX(t.side < 0 ? -md.halfW - 400 : md.halfW + 400);
          mc.beginPath(); mc.moveTo(edge, toY(t.pts[0][1]));
          for (const [x, z] of t.pts) mc.lineTo(toX(x), toY(z));
          mc.lineTo(edge, toY(t.pts[t.pts.length - 1][1])); mc.closePath(); mc.fill();
        } else {
          mc.lineWidth = Math.max(2.5, (t.half || 200) * 2 * s); mc.lineJoin = 'round'; mc.lineCap = 'round';
          mc.beginPath(); t.pts.forEach(([x, z], i) => (i ? mc.lineTo(toX(x), toY(z)) : mc.moveTo(toX(x), toY(z)))); mc.stroke();
        }
        mc.restore();
      }
      if (mask) ctx.drawImage(mask.canvas, 0, 0, W, H);
      // まだ 行って いない となりの 地区は「なにか ある」だけ。みち も スポット も 出さない
      for (const z of md.zones) if (z.hinted) blob(ctx, z, rgbOf(pal.landEdge), pal.dark ? 0.12 : 0.16, 0.72, 0);

      // ---- とおった みち ----
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const p of md.paths) {
        const wide = p.kind === 'wide' ? 4.2 : p.kind === 'narrow' ? 2.2 : p.kind === 'secret' ? 1.8 : 3;
        ctx.strokeStyle = p.kind === 'secret' ? pal.faint : pal.ink;
        ctx.globalAlpha = p.kind === 'secret' ? 0.75 : 0.62;
        ctx.lineWidth = Math.max(1.2, wide * Math.min(1.6, L.s / L.base));
        if (p.kind === 'secret') ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(toX(p.ax), toY(p.az)); ctx.lineTo(toX(p.bx), toY(p.bz)); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.globalAlpha = 1;

      // ---- 見つけた スポット ----
      const hits = [];
      for (const sp of md.spots) {
        const x = toX(sp.x), y = toY(sp.z);
        const big = sp.hub || sp.kind === 'plaza';
        const r = sp.secret ? 3.4 : big ? 5.2 : 3.8;
        ctx.fillStyle = pal.paper; ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.6;
        ctx.beginPath();
        if (sp.secret) { ctx.moveTo(x, y - r - 1); ctx.lineTo(x + r + 1, y); ctx.lineTo(x, y + r + 1); ctx.lineTo(x - r - 1, y); ctx.closePath(); }
        else ctx.arc(x, y, r, 0, TAU);
        ctx.fill(); ctx.stroke();
        if (big) { ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(x, y, r * 0.42, 0, TAU); ctx.fill(); }
        hits.push({ id: sp.id, label: sp.label, x, y, r: Math.max(12, r + 8), secret: sp.secret });
      }

      // ---- 見つけた めじるし(大・中・小) ----
      for (const lm of md.landmarks) {
        const x = toX(lm.x), y = toY(lm.z);
        const r = lm.tier === 1 ? 9 : lm.tier === 2 ? 6 : 3.6;
        ctx.strokeStyle = pal.ink; ctx.fillStyle = pal.dark ? 'rgba(255,240,190,.92)' : 'rgba(255,246,214,.95)';
        ctx.lineWidth = lm.tier === 3 ? 1.2 : 1.7;
        ctx.beginPath();
        if (lm.tier === 1) { for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * TAU / 5; const b = a + TAU / 10; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.lineTo(x + Math.cos(b) * r * 0.46, y + Math.sin(b) * r * 0.46); } ctx.closePath(); }
        else if (lm.tier === 2) { ctx.moveTo(x, y - r); ctx.lineTo(x + r, y + r * 0.8); ctx.lineTo(x - r, y + r * 0.8); ctx.closePath(); }
        else ctx.arc(x, y, r, 0, TAU);
        ctx.fill(); ctx.stroke();
      }

      // ---- なまえ ----
      // なまえは かさならない ぶんだけ 出す(ひろい せかいだと かさなって よめなく なる)
      const taken = [];
      const label = (text, x, y, size, strong) => {
        ctx.font = `${strong ? 'bold ' : ''}${size}px system-ui, -apple-system, sans-serif`;
        const w = ctx.measureText(text).width, h = size + 3;
        const box = [x - w / 2 - 2, y - h, x + w / 2 + 2, y + 2];
        if (box[0] < 2 || box[2] > W - 2 || box[1] < 2 || box[3] > H - 2) return false; // はしで きれる なまえは 出さない
        for (const t of taken) if (box[0] < t[2] && box[2] > t[0] && box[1] < t[3] && box[3] > t[1]) return false;
        taken.push(box);
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.lineWidth = 3; ctx.strokeStyle = pal.paper; ctx.strokeText(text, x, y);
        ctx.fillStyle = pal.ink; ctx.fillText(text, x, y);
        return true;
      };
      for (const z of md.zones) if (z.visited) label(z.label, toX(z.x), toY(z.z) - 12, 11, true);
      const zoomed = L.s / L.base >= 1.7;
      for (const lm of md.landmarks) if (lm.tier === 1 && lm.label) label(lm.label, toX(lm.x), toY(lm.z) - 13, 10, false);
      for (const sp of md.spots) {
        const show = opts.picked === sp.id || (zoomed && !sp.secret) || (!zoomed && sp.hub);
        if (show) label(sp.label, toX(sp.x), toY(sp.z) - 9, 10, opts.picked === sp.id);
      }

      // ---- いまここ ----(ほかの 地域の ちずを 見て いる ときは 出さない)
      if (!md.here) return hits;
      const hx = toX(md.here.x), hy = toY(md.here.z);
      ctx.save(); ctx.translate(hx, hy);
      ctx.rotate(-(md.here.heading || 0));
      ctx.fillStyle = 'rgba(255,90,90,.92)'; ctx.strokeStyle = pal.paper; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(5.4, 4); ctx.lineTo(0, 1.4); ctx.lineTo(-5.4, 4); ctx.closePath();
      ctx.fill(); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = 'rgba(255,90,90,.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(hx, hy, 9, 0, TAU); ctx.stroke();
      return hits;
    }

    // ================= せかいのちず(なおとっち世界 正式地理 v1 を かく) =================
    // ここも worldMapData() の データだけを よんで え に する。地形の けいさんは しない。
    // 地域を 13この まるで ならべた ステージ選択には しない(#43): 大陸・山脈・大河・湾・
    // かいがんせんが 主役で、その 地形の なかに 地域が ある
    const WMAP = { pad: 18, minZoom: 1, maxZoom: 2.6, zoomStep: 0.5 };
    // せかい ぜんたいの わく。見つけて いても いなくても おなじ(ちずが はっけんの たびに
    // ずれると「そだって いく」かんじが こわれる)。かみの ひろさは 地域の いちを ばらさない
    // 見つけた 地域から これだけ はなれた ところまで、山なみ・かわ・かいがんせんが
    // 紙に かきたされる。これ より さきは 「まだ わからない」ままに する
    const WMAP_REVEAL = 1.15;
    const WMAP_BOUNDS = (() => {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      const take = (x, y, r) => { x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); y0 = Math.min(y0, y - r); y1 = Math.max(y1, y + r); };
      for (const id of GEO_GROUND) { const g = WORLD_GEOGRAPHY.regions[id], sh = worldMapShape(id); take(g.mapX, g.mapY, Math.max(sh.rx, sh.ry) + 0.1); }
      for (const f of WORLD_GEOGRAPHY.features) for (const p of f.points) take(p.x, p.y, 0.3);
      for (const a of [WORLD_GEOGRAPHY.axis.sky, WORLD_GEOGRAPHY.axis.deep]) take(a.mapX, a.mapY, 0.7);
      return { x0, x1, y0, y1 };
    })();
    function worldMapPalette() {
      return { paper: '#f6efdd', grid: 'rgba(120,96,58,.10)', ink: '#4c3f2c', faint: 'rgba(76,63,44,.34)',
        sea: '#9cc9df', seaDeep: '#6ea9c8', bay: '#a9d3e6', dark: false };
    }
    // 図の うえだけの ひきのばし(display transform)。正式地理の mapX / mapY は 1ミリも
    // うごかさない。たて長の がめんで よこ長の せかいが ちいさく なりすぎない ように、
    // え を かく ときだけ たてを のばす(#63, #64)
    const WMAP_STRETCH_MAX = 1.35;
    function worldMapLayout(wd, W, H, zoom, panX, panY) {
      // 見つけた ぶんだけの はこ。まだ せまい うちは その まわり だけが 紙に のる
      const B = (wd && wd.bounds && wd.bounds.x1 > wd.bounds.x0 && wd.bounds.y1 > wd.bounds.y0) ? wd.bounds : WMAP_BOUNDS;
      const P = WMAP.pad;
      const wW = B.x1 - B.x0, wH = B.y1 - B.y0;
      const fitW = (W - P * 2) / wW, fitH = (H - P * 2) / wH;
      const base = Math.min(fitW, fitH);
      // よこで きまって いて たてが あまって いる ときだけ、たてを すこし のばす
      const stretch = Math.min(WMAP_STRETCH_MAX, Math.max(1, fitH / Math.max(0.0001, fitW)));
      const s = base * zoom, sy = s * stretch;
      const cx = W / 2 + panX, cy = H / 2 + panY;
      const mx = (B.x0 + B.x1) / 2, my = (B.y0 + B.y1) / 2;
      // よこ: x そのまま。たて: きたが うえ
      return { s, sy, stretch, base, W, H, toX: (x) => cx + (x - mx) * s, toY: (y) => cy - (y - my) * sy };
    }
    // 地域の なかに ちいさな もようを おく。おなじ 地域は いつも おなじ もよう(hash から)
    function wmapMotifs(r, n) {
      const out = [];
      for (let i = 0; i < n; i++) {
        // hrand は 0〜1。hash は 32ビットの せいすう なので ここでは つかえない
        const a = hrand(r.id + ':wm:' + i) * TAU, u = 0.1 + hrand(r.id + ':wr:' + i) * 0.78;
        const rad = Math.sqrt(u);
        out.push({ x: r.x + Math.cos(a) * rad * r.rx * 0.8, y: r.y + Math.sin(a) * rad * r.ry * 0.8,
          k: hrand(r.id + ':wk:' + i) });
      }
      return out;
    }
    function drawWorldMap(ctx, wd, L, pal, opts = {}) {
      const { W, H, s, toX, toY } = L;
      const U = s, UY = L.sy || s;              // 1めもり ぶんの px(たては 図の うえで すこし のびる)
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = pal.paper; ctx.fillRect(0, 0, W, H);
      // かみの め。まだ かかれて いない ところは この まま(#20: くろぬりに しない)
      ctx.strokeStyle = pal.grid; ctx.lineWidth = 1;
      const gs = Math.max(22, U * 0.5);
      ctx.beginPath();
      for (let x = (toX(WMAP_BOUNDS.x0) % gs + gs) % gs; x < W; x += gs) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, H); }
      for (let y = (toY(WMAP_BOUNDS.y1) % gs + gs) % gs; y < H; y += gs) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(W, Math.round(y) + 0.5); }
      ctx.stroke();

      const byId = new Map(wd.regions.map((r) => [r.id, r]));
      const feat = (id) => wd.features.find((f) => f.id === id) || null;
      const onPts = (f) => (f ? f.points.filter((p) => p.on) : []);
      const poly = (c, pts, close) => { pts.forEach((p, i) => (i ? c.lineTo(toX(p.x), toY(p.y)) : c.moveTo(toX(p.x), toY(p.y)))); if (close) c.closePath(); };

      // ---- みず: 湾と がいよう。りょうどなりの 地域を 見つけた ところだけ ----
      const bay = onPts(feat('bay')), coast = onPts(feat('coast'));
      if (bay.length >= 3) {
        ctx.save(); ctx.fillStyle = pal.bay; ctx.globalAlpha = 1;
        ctx.beginPath(); poly(ctx, bay, true); ctx.fill();
        ctx.strokeStyle = pal.seaDeep; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
      }
      if (coast.length >= 2) {
        // 岸の そとは がいよう。かいがんせんから そとへ ひろがる おびで しめす
        ctx.save(); ctx.strokeStyle = pal.sea; ctx.globalAlpha = 0.55;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let k = 3; k >= 1; k--) { ctx.lineWidth = U * 0.4 * k; ctx.globalAlpha = 0.22 * (4 - k); ctx.beginPath(); poly(ctx, coast, false); ctx.stroke(); }
        ctx.restore();
      }

      // ---- 南西の 外洋に うかぶ しま。まわりを 海で かこんで、本土と 陸つづきに
      //      見えない ように する。見つける まで 1 てんも 出ない(データ の がわで きめて いる) ----
      for (const isle of wd.features.filter((f) => f.kind === 'island')) {
        const pts = onPts(isle);
        if (pts.length < 3) continue;
        ctx.save();
        // ① まわりの 海(そとへ にじむ)
        ctx.strokeStyle = pal.sea; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let k = 3; k >= 1; k--) { ctx.lineWidth = U * 0.30 * k; ctx.globalAlpha = 0.20 * (4 - k); ctx.beginPath(); poly(ctx, pts, true); ctx.stroke(); }
        // ② しまの じめん
        ctx.globalAlpha = 1; ctx.fillStyle = '#7fae66';
        ctx.beginPath(); poly(ctx, pts, true); ctx.fill();
        // ③ かいがんせん
        ctx.strokeStyle = pal.seaDeep; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.4;
        ctx.beginPath(); poly(ctx, pts, true); ctx.stroke();
        // ④ もり(しまの なかに いくつか)
        let cx = 0, cy = 0; for (const q of pts) { cx += toX(q.x); cy += toY(q.y); }
        cx /= pts.length; cy /= pts.length;
        const rad = Math.min(...pts.map((q) => Math.hypot(toX(q.x) - cx, toY(q.y) - cy)));
        ctx.globalAlpha = 0.85; ctx.fillStyle = '#3f7a45';
        const n = Math.max(3, Math.round(rad / (U * 0.22)));
        for (let i = 0; i < n; i++) {
          const a2 = hrand(isle.id + ':t' + i) * TAU, d2 = rad * (0.15 + hrand(isle.id + ':d' + i) * 0.62);
          const tx = cx + Math.sin(a2) * d2, ty = cy + Math.cos(a2) * d2 * 0.82, size = U * (0.085 + hrand(isle.id + ':s' + i) * 0.05);
          ctx.beginPath(); ctx.moveTo(tx, ty - size); ctx.lineTo(tx + size * 0.72, ty + size * 0.6); ctx.lineTo(tx - size * 0.72, ty + size * 0.6); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }

      // ---- 山地の じばん: みねの 点を つなぐ ふとい やわらかい おび。これを 陸より さきに
      //      しくので、たにの ひがしがわの「あるけない やまなみ」も、ただの しるしでは なく
      //      **土地**に 見える(たにを 左右から はさむ かたちが よめる) ----
      for (const range of wd.features.filter((f) => f.kind === 'range')) {
        const on = range.points.filter((p) => p.on);
        if (on.length < 2) continue;
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let k = 3; k >= 1; k--) {
          const big = range.id === 'east-range';       // 南アルプス型は 巨大山地
          ctx.strokeStyle = '#b6ab97'; ctx.globalAlpha = (big ? 0.16 : 0.13) * (4 - k);
          ctx.lineWidth = Math.max(big ? 11 : 8, U * (big ? 0.46 : 0.34) * k);
          ctx.beginPath(); poly(ctx, on, false); ctx.stroke();
        }
        ctx.restore();
      }

      // ---- 陸: 見つけた 地域を やわらかい しみに して かさねる。となりどうしが とけあって
      //      「ひとつづきの 大陸」に 見える(丸を 13こ ならべない) ----
      const blob = (c, r, grow, alpha, rgb, hard) => {
        c.save(); c.translate(toX(r.x), toY(r.y));
        c.scale(1, UY / U);                                   // 図の うえの ひきのばし
        c.rotate((r.axis || 0) * Math.PI / 180);
        c.scale(Math.max(4, r.rx * U * grow), Math.max(4, r.ry * U * grow));
        const g = c.createRadialGradient(0, 0, 0.25, 0, 0, 1);
        g.addColorStop(0, `rgba(${rgb},${alpha})`); g.addColorStop(hard ? 0.92 : 0.66, `rgba(${rgb},${alpha})`); g.addColorStop(1, `rgba(${rgb},0)`);
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, 1, 0, TAU); c.fill(); c.restore();
      };
      const rgbOf = (hex) => hexToRgb(hex).join(',');
      // ① 大陸の ひとかたまり: となりどうしが とけあって「ひとつづきの 陸」に 見える ように、
      //    まず おなじ 土の いろで ひろく ぬる(地域を 13この まるに しない #43)
      for (const r of wd.regions) blob(ctx, r, 1.3, 0.34, '206,186,146', true);
      for (const r of wd.regions) blob(ctx, r, 1.18, 0.9, '228,214,180', true);
      // ② 地域ごとの いろを うえから。ふちを ぼかすので さかいめが とけあう
      for (const r of wd.regions) blob(ctx, r, 1.06, 0.5, rgbOf(r.ground[1] || r.ground[0]));
      for (const r of wd.regions) blob(ctx, r, 0.92, 0.96, rgbOf(r.ground[0]), true);

      // ---- 山地の おび(2どめ): 陸の うえから もう いちど うすく。もり や いなかの
      //      いろに うずもれて、たにを はさむ かべが きえて しまわない ように ----
      for (const range of wd.features.filter((f) => f.kind === 'range')) {
        const on = range.points.filter((p) => p.on);
        if (on.length < 2) continue;
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let k = 2; k >= 1; k--) {
          ctx.strokeStyle = '#8d8471'; ctx.globalAlpha = 0.1 * (3 - k);
          ctx.lineWidth = Math.max(6, U * 0.2 * k);
          ctx.beginPath(); poly(ctx, on, false); ctx.stroke();
        }
        ctx.restore();
      }

      // ---- かいがんせん(見つけた ぶんだけ) ----
      if (coast.length >= 2) {
        ctx.save(); ctx.strokeStyle = pal.ink; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.6;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); poly(ctx, coast, false); ctx.stroke(); ctx.restore();
      }

      // ---- 源の湖(諏訪湖型): 天竜川型水系の あたま。地形 feature なので 見つけた 地域の
      //      ぶんだけ 出る。**これは きおくのみずうみ では ありません** ----
      for (const lake of wd.features.filter((f) => f.kind === 'lake')) {
        const on = lake.points.filter((p) => p.on);
        if (on.length < 3) continue;
        ctx.save();
        ctx.fillStyle = pal.sea; ctx.beginPath(); poly(ctx, on, true); ctx.fill();
        ctx.strokeStyle = pal.seaDeep; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.75; ctx.stroke();
        ctx.restore();
      }

      // ---- 川: D2 は **2 つの べつの 水系**。id では なく kind で 回すので、
      //      どちらも おなじ かきかたで、しかも 1 本に つながって 見えない(#37, #39) ----
      for (const river of wd.features.filter((f) => f.kind === 'river')) {
        const pts = river.points;
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let i = 1; i < pts.length; i++) {
          if (!pts[i - 1].on || !pts[i].on) continue;
          const w = Math.max(2.4, U * (0.055 + 0.035 * (i / pts.length)));  // かこうへ 近いほど ふとい
          ctx.strokeStyle = pal.seaDeep; ctx.lineWidth = w + 1.6; ctx.globalAlpha = 0.35;
          ctx.beginPath(); ctx.moveTo(toX(pts[i - 1].x), toY(pts[i - 1].y)); ctx.lineTo(toX(pts[i].x), toY(pts[i].y)); ctx.stroke();
          ctx.strokeStyle = pal.sea; ctx.lineWidth = w; ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.moveTo(toX(pts[i - 1].x), toY(pts[i - 1].y)); ctx.lineTo(toX(pts[i].x), toY(pts[i].y)); ctx.stroke();
        }
        ctx.restore();
      }

      // ---- 山地: D2 は **たにを はさむ 2 つ**。にしは あるける、ひがしは たにから 見えるだけ ----
      for (const range of wd.features.filter((f) => f.kind === 'range')) {
        const pts = range.points, walkable = range.id === 'west-range';
        for (let i = 0; i < pts.length; i++) {
          if (!pts[i].on) continue;
          const x = toX(pts[i].x), y = toY(pts[i].y);
          const big = walkable && (i === 0 || i === 2);          // ゆきやま と ちょうじょう
          const hgt = UY * (big ? 0.3 : walkable ? 0.2 : 0.3), wid = U * (big ? 0.26 : walkable ? 0.18 : 0.27);
          ctx.fillStyle = pts[i].region === 'snow' ? '#e9f0f8' : walkable ? '#a49a88' : '#b9b2a4';
          ctx.strokeStyle = pal.ink; ctx.lineWidth = walkable ? 1.3 : 1.1; ctx.globalAlpha = walkable ? 0.96 : 0.7;
          ctx.beginPath(); ctx.moveTo(x - wid, y + hgt * 0.45); ctx.lineTo(x, y - hgt); ctx.lineTo(x + wid, y + hgt * 0.45); ctx.closePath();
          ctx.fill(); ctx.stroke();
          if (big) { ctx.fillStyle = '#fbfdff'; ctx.beginPath(); ctx.moveTo(x - wid * 0.36, y - hgt * 0.34); ctx.lineTo(x, y - hgt); ctx.lineTo(x + wid * 0.36, y - hgt * 0.34); ctx.closePath(); ctx.fill(); }
          ctx.globalAlpha = 1;
        }
      }

      // ---- 分水界: 峠の おねに そった てんせん。ここを さかいに 水の むきが かわる ----
      for (const dv of wd.features.filter((f) => f.kind === 'divide')) {
        const on = dv.points.filter((p) => p.on);
        if (on.length < 2) continue;
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        // みちの てんせん(ink・ながい ダッシュ)と まぎれない ように、まるい 点の れつに する
        ctx.strokeStyle = '#8a4b2c'; ctx.globalAlpha = 0.95; ctx.lineWidth = 3.6;
        ctx.setLineDash([0.1, Math.max(7, U * 0.14)]);
        ctx.beginPath(); poly(ctx, on, false); ctx.stroke();
        ctx.setLineDash([]);
        // 水が 左右へ わかれる しるし。おねに 直角な みじかい ひげ
        ctx.lineWidth = 2.1; ctx.globalAlpha = 0.8;
        for (let i = 1; i < on.length; i++) {
          const x1 = toX(on[i - 1].x), y1 = toY(on[i - 1].y), x2 = toX(on[i].x), y2 = toY(on[i].y);
          const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1;
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, t = Math.max(7, U * 0.13);
          ctx.beginPath();
          ctx.moveTo(mx - (dy / d) * t, my + (dx / d) * t);
          ctx.lineTo(mx + (dy / d) * t, my - (dx / d) * t);
          ctx.stroke();
        }
        ctx.restore();
      }

      // ---- 地域ごとの もよう(もり・はたけ・まち・すな…) ----
      for (const r of wd.regions) {
        const t = r.terrain;
        const n = Math.round(6 + Math.min(9, (r.rx + r.ry) * 4));
        // もようは かならず インクの ふちを つける。地面と おなじ いろ系だと
        // ぬりだけでは 見えない(いちど それで 見えなく なった)
        ctx.save(); ctx.lineWidth = 1.1; ctx.strokeStyle = pal.ink; ctx.globalAlpha = 0.92;
        for (const p of wmapMotifs(r, n)) {
          const x = toX(p.x), y = toY(p.y), u = Math.max(5, Math.min(r.rx * U, r.ry * UY) * 0.22);
          if (t.includes('forest') || t.includes('jungle')) {
            ctx.fillStyle = t.includes('jungle') ? '#24572c' : '#2f6038';
            ctx.beginPath(); ctx.moveTo(x - u * 0.8, y + u * 0.7); ctx.lineTo(x, y - u * 1.4); ctx.lineTo(x + u * 0.8, y + u * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
          } else if (t.includes('snow')) {
            ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#8fa6c4';
            ctx.beginPath(); ctx.moveTo(x - u * 0.8, y + u * 0.55); ctx.lineTo(x, y - u * 1.1); ctx.lineTo(x + u * 0.8, y + u * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = pal.ink;
          } else if (t.includes('sand')) {
            ctx.strokeStyle = '#9c6f33'; ctx.lineWidth = 1.7;
            ctx.beginPath(); ctx.arc(x, y + u * 0.7, u * 1.2, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
            ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.1;
          } else if (t.includes('city')) {
            ctx.fillStyle = '#2e3340';
            const hh = u * (0.8 + p.k); ctx.beginPath(); ctx.rect(x - u * 0.45, y - hh, u * 0.9, hh); ctx.fill(); ctx.stroke();
          } else if (t.includes('field')) {
            ctx.strokeStyle = '#5c7a2c'; ctx.lineWidth = 1.8;
            ctx.beginPath(); ctx.moveTo(x - u * 1.1, y); ctx.lineTo(x + u * 1.1, y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x - u * 1.1, y + u * 0.55); ctx.lineTo(x + u * 1.1, y + u * 0.55); ctx.stroke();
            ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.1;
          } else if (t.includes('home')) {
            ctx.fillStyle = '#f3e2b8';
            ctx.beginPath(); ctx.moveTo(x - u, y); ctx.lineTo(x, y - u); ctx.lineTo(x + u, y); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.rect(x - u * 0.62, y, u * 1.24, u * 0.8); ctx.fill(); ctx.stroke();
          } else if (t.includes('shore')) {
            ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#7fa8bd';
            ctx.beginPath(); ctx.arc(x, y, u * 0.45, 0, TAU); ctx.fill(); ctx.stroke(); ctx.strokeStyle = pal.ink;
          } else if (t.includes('mountain')) {
            ctx.fillStyle = '#7d7566';
            ctx.beginPath(); ctx.moveTo(x - u * 0.9, y + u * 0.5); ctx.lineTo(x, y - u * 1.0); ctx.lineTo(x + u * 0.9, y + u * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
          } else if (t.includes('lake') || t.includes('marsh')) {
            ctx.fillStyle = pal.seaDeep;
            ctx.beginPath(); ctx.ellipse(x, y, u * 1.1, u * 0.62, 0, 0, TAU); ctx.fill(); ctx.stroke();
          }
        }
        ctx.restore();
      }

      // ---- 見つけた 海路。**徒歩の みちと おなじ 線に しない**。
      //      うすい 波の せんと、まんなかに ちいさな ふねの しるし だけ。
      //      見つける まえは wd.links に 入って いない ので、1 本も 出ない ----
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const ln of wd.links) {
        if (ln.special !== 'sea') continue;
        const x1 = toX(ln.ax), y1 = toY(ln.ay), x2 = toX(ln.bx), y2 = toY(ln.by);
        const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1;
        const nx = -dy / d, ny = dx / d;
        // なみせん: みちの うえを 小さく うねらせる
        ctx.strokeStyle = pal.seaDeep; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.6;
        ctx.beginPath();
        const segs = 22, amp = Math.max(2.2, U * 0.045);
        for (let i = 0; i <= segs; i++) {
          const t = i / segs, wob = Math.sin(t * Math.PI * 5) * amp * Math.sin(t * Math.PI);
          const px = x1 + dx * t + nx * wob, py = y1 + dy * t + ny * wob;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        // まんなかに ちいさな ふね(いっそう だけ)
        const mx0 = x1 + dx * 0.5, my0 = y1 + dy * 0.5, bw = Math.max(5, U * 0.085), bh = bw * 0.46;
        ctx.globalAlpha = 0.9; ctx.fillStyle = pal.paper; ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(mx0 - bw, my0); ctx.quadraticCurveTo(mx0, my0 + bh * 1.7, mx0 + bw, my0);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx0, my0); ctx.lineTo(mx0, my0 - bh * 1.7); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // ---- 見つけた みち。ひとが つくった みちは やぶれせん(#7, #21) ----
      ctx.save(); ctx.lineCap = 'round';
      for (const ln of wd.links) {
        if (ln.layer !== 'ground' || ln.special) continue;      // 海路は うえで かいた
        ctx.strokeStyle = pal.ink; ctx.globalAlpha = ln.made === 'people' ? 0.62 : 0.48;
        ctx.lineWidth = ln.made === 'people' ? 2.1 : 1.7;
        ctx.setLineDash(ln.made === 'people' ? [Math.max(5, U * 0.1), Math.max(4, U * 0.07)] : []);
        const x1 = toX(ln.ax), y1 = toY(ln.ay), x2 = toX(ln.bx), y2 = toY(ln.by);
        ctx.beginPath(); ctx.moveTo(x1, y1);
        if (ln.long) {
          // ながい みちは すこし そらせる。まっすぐ ひくと ほかの 地域を つらぬいて 見える
          const mxp = (x1 + x2) / 2, myp = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1;
          const d = Math.hypot(dx, dy) || 1, bow = d * 0.13;
          ctx.quadraticCurveTo(mxp - (dy / d) * bow, myp + (dx / d) * bow, x2, y2);
        } else ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();

      // ---- 見つけた 大 landmark。地域名より めだたせない(#51) ----
      const marksAt = [];
      for (const r of wd.regions) {
        r.marks.forEach((m, i) => {
          const a = -Math.PI / 2 + (i / Math.max(1, r.marks.length)) * TAU * 0.5;
          const x = toX(r.x + Math.cos(a) * r.rx * 0.5), y = toY(r.y + Math.sin(a) * r.ry * 0.5);
          const rr = Math.max(3.4, U * 0.055);
          ctx.strokeStyle = pal.ink; ctx.fillStyle = 'rgba(255,246,214,.95)'; ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let k = 0; k < 5; k++) { const b = -Math.PI / 2 + k * TAU / 5, c = b + TAU / 10;
            ctx.lineTo(x + Math.cos(b) * rr, y + Math.sin(b) * rr); ctx.lineTo(x + Math.cos(c) * rr * 0.46, y + Math.sin(c) * rr * 0.46); }
          ctx.closePath(); ctx.fill(); ctx.stroke();
          marksAt.push({ x, y, label: m.label });
        });
      }

      // ---- たてじく: **山の上に ほしぞら / 海の下に しんかい**。D2 では べつの ばしょ ----
      // 見つけて いない ものは そもそも かかない(そんざいを ばらさない)
      const drawAxis = (a, up, fill) => {
        if (!a.on) return null;
        const x = toX(a.x), y = toY(a.y), g = Math.max(11, U * 0.2);
        const ty = up ? y - g * 1.5 : y + g * 1.5;
        ctx.save();
        if (a.ride === 'gondola') {
          // **ゴンドラ**。ふつうの みちの 点線とは べつの 見た目に する。ただし ひかえめに:
          // ほそい 1 本の 線に、ちいさな かごを 2 つ ぶらさげる だけ(#11)
          ctx.strokeStyle = pal.ink; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, ty); ctx.stroke();
          ctx.globalAlpha = 0.85; ctx.fillStyle = pal.paper; ctx.lineWidth = 1.1;
          for (const k of [0.34, 0.68]) {
            const cy = y + (ty - y) * k, w = Math.max(2.6, g * 0.22), hgt = Math.max(2.2, g * 0.19);
            ctx.beginPath(); ctx.moveTo(x, cy - hgt * 0.9); ctx.lineTo(x, cy - hgt * 0.35); ctx.stroke();
            ctx.beginPath(); ctx.rect(x - w, cy - hgt * 0.35, w * 2, hgt); ctx.fill(); ctx.stroke();
          }
          ctx.globalAlpha = 1;
        } else {
          ctx.strokeStyle = pal.ink; ctx.globalAlpha = 0.55; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, ty); ctx.stroke();
          ctx.setLineDash([]); ctx.globalAlpha = 1;
        }
        ctx.fillStyle = fill; ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.3;
        ctx.beginPath();
        if (up) { ctx.moveTo(x, ty - g * 0.62); ctx.lineTo(x + g * 0.56, ty + g * 0.34); ctx.lineTo(x - g * 0.56, ty + g * 0.34); }
        else { ctx.moveTo(x, ty + g * 0.62); ctx.lineTo(x + g * 0.56, ty - g * 0.34); ctx.lineTo(x - g * 0.56, ty - g * 0.34); }
        ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
        return { x, y: ty, g, up };
      };
      const skyAt = drawAxis(wd.axis.sky, true, '#3b3b7a');
      const deepAt = drawAxis(wd.axis.deep, false, '#14375c');

      // ---- なまえ(かさならない ぶんだけ) ----
      const taken = [];
      const label = (text, x, y, size, strong) => {
        ctx.font = `${strong ? 'bold ' : ''}${size}px system-ui, -apple-system, sans-serif`;
        const w = ctx.measureText(text).width, h = size + 3;
        const box = [x - w / 2 - 2, y - h, x + w / 2 + 2, y + 2];
        if (box[0] < 2 || box[2] > W - 2 || box[1] < 2 || box[3] > H - 2) return false;
        for (const t of taken) if (box[0] < t[2] && box[2] > t[0] && box[1] < t[3] && box[3] > t[1]) return false;
        taken.push(box);
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.lineWidth = 3.4; ctx.strokeStyle = pal.paper; ctx.strokeText(text, x, y);
        ctx.fillStyle = pal.ink; ctx.fillText(text, x, y);
        return true;
      };
      const hits = [];
      // たてじくの 名まえを さきに とる。ほしぞら・しんかいも 地域なので、
      // 地上の 名まえに おしのけられて 見えなく なっては こまる
      // 図上の 名まえは みじかい ほうを つかう(地域の せいしきな 名まえは ながくて 入らない)
      if (skyAt) label(wd.axis.sky.short || opts.skyLabel || 'そら', skyAt.x, skyAt.y - skyAt.g * 0.9, 10, false);
      if (deepAt) label(wd.axis.deep.short || opts.deepLabel || 'ふかみ', deepAt.x, deepAt.y + deepAt.g * 1.5, 10, false);
      for (const r of wd.regions) {
        const x = toX(r.x), y = toY(r.y);
        label(r.label, x, y + Math.max(9, r.ry * UY * 0.46), Math.max(11, Math.min(15, U * 0.12)), true);
        hits.push({ id: r.id, label: r.label, x, y, r: Math.max(22, Math.min(r.rx * U, r.ry * UY) * 0.9) });
      }
      const zoomed = s / L.base >= 1.5;
      if (zoomed) for (const m of marksAt) label(m.label, m.x, m.y - Math.max(7, U * 0.07), 9, false);

      // ---- いまいる 地域 ----
      if (wd.here && byId.has(wd.here)) {
        const r = byId.get(wd.here), x = toX(r.x), y = toY(r.y);
        ctx.save(); ctx.strokeStyle = 'rgba(255,90,90,.85)'; ctx.lineWidth = 2.2; ctx.setLineDash([]);
        ctx.beginPath(); ctx.ellipse(x, y, Math.max(12, r.rx * U * 1.06), Math.max(12, r.ry * UY * 1.06), (r.axis || 0) * Math.PI / 180, 0, TAU); ctx.stroke();
        ctx.restore();
      }
      // えらんで いる 地域
      if (opts.picked && byId.has(opts.picked)) {
        const r = byId.get(opts.picked), x = toX(r.x), y = toY(r.y);
        ctx.save(); ctx.strokeStyle = pal.ink; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.ellipse(x, y, Math.max(14, r.rx * U * 1.14), Math.max(14, r.ry * UY * 1.14), (r.axis || 0) * Math.PI / 180, 0, TAU); ctx.stroke();
        ctx.restore();
      }
      return hits;
    }

    // ちずの がめん。たんさくの うえに かぶせて ひらき、とじると おなじ ばしょから つづき。
    // ひらいて いる あいだ だけ え を かく(たんさくの fps には なにも 足さない)
    function openMapScreen(host, sim, hooks = {}) {
      const md0 = sim.mapData();
      const pal = mapPalette(md0);
      const wpal = worldMapPalette();
      const box = document.createElement('div');
      box.classList.add('mgr-map');
      if (pal.dark) box.classList.add('mgr-map-dark');
      box.innerHTML = `
        <div class="mgr-map-top"><span class="mgr-map-name"></span><span class="mgr-map-prog"></span></div>
        <div class="mgr-map-body"><canvas class="mgr-map-canvas"></canvas><div class="mgr-map-tip hidden"></div></div>
        <div class="mgr-map-bar">
          <button type="button" class="mg-tap-btn mgr-map-zoom" data-d="-1" aria-label="ちいさく">−</button>
          <button type="button" class="mg-tap-btn mgr-map-zoom" data-d="1" aria-label="おおきく">＋</button>
          <button type="button" class="mg-tap-btn mgr-map-world">🌍 せかい</button>
          <button type="button" class="mg-tap-btn primary mgr-map-close">もどる</button>
        </div>`;
      host.appendChild(box);
      // ================= せかい / 地域 の 2かいそう(#16, #17) =================
      // めぐる → 🗺 ちず(いまの 地域) → 🌍 せかい → 地域を えらぶ → その 地域の ちず。
      // 「もどる」は 1つずつ もどり、いちばん うえまで もどったら とじる
      let mode = 'region', viewRegion = sim.world.regionId;
      const stack = [];
      const worldBtn = box.querySelector('.mgr-map-world');
      const closeBtn = box.querySelector('.mgr-map-close');
      // ほかの 地域の ちずは、セーブの きろみから 組む(そこへ ワープは しない #32)
      const foreignCache = new Map();
      let registry = null;
      function foreignMap(regionId) {
        if (foreignCache.has(regionId)) return foreignCache.get(regionId);
        let md = null;
        try {
          registry = registry || buildRegistry();
          const w = buildWorld(regionId, registry);
          const spots = (typeof S.discoveredSpots === 'function' ? S.discoveredSpots(regionId) : []);
          const stored = typeof S.mapRecords === 'function' ? S.mapRecords(regionId) : null;
          const missing = !stored || stored.zones === null || stored.paths === null || stored.marks === null;
          const seeded = missing ? seedMapRecords(w, new Set(spots)) : null;
          md = computeMapData(w, {
            discovered: new Set(spots),
            visitedZones: new Set((stored && stored.zones) || (seeded ? seeded.zones : [])),
            walkedPaths: new Set((stored && stored.paths) || (seeded ? seeded.paths : [])),
            foundMarks: new Set((stored && stored.marks) || (seeded ? seeded.marks : [])),
            hereSpot: null, here: null,
          });
        } catch (err) { md = null; }                 // 組めない ときは せかいに とどまる
        foreignCache.set(regionId, md);
        return md;
      }
      // せかいの ちずの もと。ひらく たびに「入口を りょうがわ とも 見つけた みち」を きろくする
      function worldData() {
        const rec = (hooks.world && hooks.world()) || { regions: [], links: [], marks: {}, zones: {} };
        return worldMapData({ regions: rec.regions, links: rec.links, marks: rec.marks, zones: rec.zones,
          here: sim.world.regionId, label: (id) => (typeof S.regionPlainLabel === 'function' ? S.regionPlainLabel(id) : id) });
      }
      const curMd = () => (viewRegion === sim.world.regionId ? sim.mapData() : foreignMap(viewRegion));
      function syncBar() {
        const world = mode === 'world';
        worldBtn.classList.toggle('hidden', world);
        closeBtn.textContent = stack.length ? 'もどる' : 'もどる';
        box.classList.toggle('mgr-map-dark', !world && !!mapPalette(curMd() || md0).dark);
      }
      const canvas = box.querySelector('.mgr-map-canvas');
      const body = box.querySelector('.mgr-map-body');
      const tip = box.querySelector('.mgr-map-tip');
      const ctx = canvas.getContext('2d');
      let W = 0, H = 0, dpr = 1, mask = null;
      let zoom = 1, panX = 0, panY = 0, picked = null, hits = [];

      function measure() {
        const r = body.getBoundingClientRect ? body.getBoundingClientRect() : { width: 320, height: 420 };
        W = Math.max(120, Math.round(r.width || body.clientWidth || 320));
        H = Math.max(120, Math.round(r.height || body.clientHeight || 420));
        dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
        canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (typeof document !== 'undefined' && document.createElement) {
          mask = mask || { canvas: document.createElement('canvas') };
          mask.canvas.width = Math.round(W * dpr); mask.canvas.height = Math.round(H * dpr);
          mask.ctx = mask.canvas.getContext('2d'); mask.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
      }
      // パンの はんい: ちずが がめんから 出て しまわない ように おさえる
      function clampPan(md, L) {
        const halfW = md.halfW * L.s, halfH = (md.len / 2) * L.s;
        const mx = Math.max(0, halfW - W / 2 + MAP_TUNING.pad), my = Math.max(0, halfH - H / 2 + MAP_TUNING.pad);
        panX = clamp(panX, -mx, mx); panY = clamp(panY, -my, my);
      }
      function clampPanWorld(L) {
        const B = WMAP_BOUNDS;
        const halfW = (B.x1 - B.x0) / 2 * L.s, halfH = (B.y1 - B.y0) / 2 * (L.sy || L.s);
        const mx = Math.max(0, halfW - W / 2 + WMAP.pad), my = Math.max(0, halfH - H / 2 + WMAP.pad);
        panX = clamp(panX, -mx, mx); panY = clamp(panY, -my, my);
      }
      function draw() {
        if (!W || !H) measure();
        const nameEl = box.querySelector('.mgr-map-name'), progEl = box.querySelector('.mgr-map-prog');
        if (mode === 'world') {
          const wd = worldData();
          let L = worldMapLayout(wd, W, H, zoom, panX, panY);
          clampPanWorld(L); L = worldMapLayout(wd, W, H, zoom, panX, panY);
          hits = drawWorldMap(ctx, wd, L, wpal, { picked,
            skyLabel: typeof S.regionPlainLabel === 'function' && wd.layers.sky ? S.regionPlainLabel('star_stop') : 'そら',
            deepLabel: typeof S.regionPlainLabel === 'function' && wd.layers.deep ? S.regionPlainLabel('deepsea') : 'ふかみ' });
          nameEl.textContent = 'なおとっちのせかい';
          const p = wd.progress;
          progEl.textContent = `せかい ${p.percent}% ・ ${p.regions}／${p.regionTotal} ちほう`;
          if (picked) { const h = hits.find((q) => q.id === picked); if (!h) { picked = null; tip.classList.add('hidden'); } }
          return;
        }
        const md = curMd();
        if (!md) { mode = 'world'; draw(); return; }
        let L = mapLayout(md, W, H, zoom, panX, panY);
        clampPan(md, L); L = mapLayout(md, W, H, zoom, panX, panY);
        hits = drawMap(ctx, md, L, viewRegion === sim.world.regionId ? pal : mapPalette(md), { mask, picked });
        nameEl.textContent = viewRegion === sim.world.regionId
          ? ((hooks.title && hooks.title()) || '')
          : `${typeof S.regionPlainLabel === 'function' ? S.regionPlainLabel(viewRegion) : viewRegion}の ちず`;
        const p = md.progress;
        progEl.textContent = `たんさく ${p.percent}% ・ ${p.zones}／${p.zoneTotal} ちく`;
        if (picked) { const h = hits.find((q) => q.id === picked); if (!h) { picked = null; tip.classList.add('hidden'); } }
      }
      // ゆびで うごかす。1本ゆび = うごかす、はなした ところで タップなら スポットを えらぶ
      let dragId = null, dragged = 0, lx = 0, ly = 0;
      const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
      const onDown = (e) => { if (dragId !== null) return; dragId = e.pointerId; dragged = 0; const q = pos(e); lx = q.x; ly = q.y; if (canvas.setPointerCapture) { try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ゆびが はなれて いた */ } } };
      const onMove = (e) => { if (dragId !== e.pointerId) return; const q = pos(e); const dx = q.x - lx, dy = q.y - ly; lx = q.x; ly = q.y; dragged += Math.abs(dx) + Math.abs(dy); if (dragged > 4) { panX += dx; panY += dy; draw(); } e.preventDefault && e.preventDefault(); };
      const onUp = (e) => {
        if (dragId !== e.pointerId) return; dragId = null;
        if (dragged > 6) return;
        const q = pos(e);
        let best = null, bd = Infinity;
        for (const h of hits) { const d = Math.hypot(h.x - q.x, h.y - q.y); if (d < h.r && d < bd) { bd = d; best = h; } }
        // せかいの ちずで 見つけた 地域を 2かい たたくと、その 地域の ちずへ 入る。
        // そこへ ワープは しない(じっさいの いどうは いままでの「たび」のまま #32)
        if (mode === 'world' && best && picked === best.id) { goRegion(best.id); return; }
        picked = best ? best.id : null;
        if (best) { tip.textContent = mode === 'world' ? `${best.label}（もう いちど おすと ちず）` : `${best.secret ? '🔍 ' : ''}${best.label}`; tip.classList.remove('hidden'); }
        else tip.classList.add('hidden');
        draw();
      };
      // かいそうの いどう
      function push() { stack.push({ mode, viewRegion, zoom, panX, panY }); }
      function goWorld() { push(); mode = 'world'; viewRegion = null; zoom = 1; panX = 0; panY = 0; picked = null; tip.classList.add('hidden'); syncBar(); draw(); }
      function goRegion(id) { if (!foreignMap(id) && id !== sim.world.regionId) return; push(); mode = 'region'; viewRegion = id; zoom = 1; panX = 0; panY = 0; picked = null; tip.classList.add('hidden'); syncBar(); draw(); }
      function back() {
        const prev = stack.pop(); if (!prev) return false;
        mode = prev.mode; viewRegion = prev.viewRegion; zoom = prev.zoom; panX = prev.panX; panY = prev.panY;
        picked = null; tip.classList.add('hidden'); syncBar(); draw(); return true;
      }
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onUp);
      for (const b of box.querySelectorAll('.mgr-map-zoom')) b.addEventListener('click', () => {
        const d = Number(b.getAttribute('data-d')) || 0;
        const z0 = zoom, z1 = clamp(zoom + d * MAP_TUNING.zoomStep, MAP_TUNING.minZoom, MAP_TUNING.maxZoom);
        if (z1 === z0) return;
        const md = mode === 'region' ? curMd() : null;
        if (z0 === MAP_TUNING.minZoom && z1 > z0 && md && md.here) {
          // はじめて よせる ときは「いま いる ところ」を まんなかに もってくる
          const L = mapLayout(md, W, H, z1, 0, 0);
          panX = W / 2 - L.toX(md.here.x); panY = H / 2 - L.toY(md.here.z);
        } else { panX *= z1 / z0; panY *= z1 / z0; } // がめんの まんなかは そのまま
        zoom = z1; draw();
      });
      const close = () => { if (!box.parentNode) return; box.parentNode.removeChild(box); if (typeof window !== 'undefined') window.removeEventListener('resize', onResize); if (hooks.onClose) hooks.onClose(); };
      closeBtn.addEventListener('click', () => { if (!back()) close(); });
      worldBtn.addEventListener('click', goWorld);
      const onResize = () => { measure(); draw(); };
      if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('resize', onResize);
      measure(); draw();
      syncBar();
      return { close, draw, el: box,
        get zoom() { return zoom; }, get mode() { return mode; }, get viewRegion() { return viewRegion; },
        get hits() { return hits.slice(); }, get depth() { return stack.length; },
        openWorld: goWorld, openRegion: goRegion, back, tapAt(x, y) {
          let best = null, bd = Infinity;
          for (const h of hits) { const d = Math.hypot(h.x - x, h.y - y); if (d < h.r && d < bd) { bd = d; best = h; } }
          if (mode === 'world' && best && picked === best.id) { goRegion(best.id); return best.id; }
          picked = best ? best.id : null; draw(); return best ? best.id : null;
        } };
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
      // ちずの きろくを よみこむ。旧セーブ(きろくが ない)の ときは すでに 見つけた
      // スポットから 組みなおして 1かいだけ 書きこむ。ここで もどる ことは ない
      function loadMapRecords(regionId) {
        const stored = typeof S.mapRecords === 'function' ? S.mapRecords(regionId) : null;
        const missing = !stored || stored.zones === null || stored.paths === null || stored.marks === null;
        const seeded = missing ? seedMapRecords(sim.world, sim.discovered) : null;
        if (seeded && typeof S.seedMapRecords === 'function') S.seedMapRecords(regionId, seeded);
        sim.loadMapRecords({
          zones: (stored && stored.zones) || (seeded ? seeded.zones : []),
          paths: (stored && stored.paths) || (seeded ? seeded.paths : []),
          marks: (stored && stored.marks) || (seeded ? seeded.marks : []),
        });
      }
      const saveMapBits = (kind, ids) => { if (typeof S.recordMapBits === 'function') S.recordMapBits(sim.world.regionId, kind, ids); };
      // せかいの ちずの きろく。ひらいた ときだけ 組む(たんさく中は 1かいも よばれない)
      function worldRecord() {
        const regions = typeof S.worldRegions === 'function' ? S.worldRegions() : ['home'];
        const spots = typeof S.allDiscoveredSpots === 'function' ? S.allDiscoveredSpots() : {};
        // みちの はっけん: りょうがわの 入口 spot を どちらも 見つけて いる ときだけ。
        // 「その 地域へ 行った ことが ある」だけでは ひらかない(#22, #46)
        const links = worldLinksFrom(spots);
        if (links.length && typeof S.recordWorldLinks === 'function') S.recordWorldLinks(links);
        const stored = typeof S.worldLinks === 'function' ? S.worldLinks() : [];
        const all = new Set([...stored, ...links]);
        const marks = {}, zones = {};
        for (const id of regions) {
          const rec = typeof S.mapRecords === 'function' ? S.mapRecords(id) : null;
          marks[id] = (rec && rec.marks) || [];
          zones[id] = (rec && rec.zones) || [];
        }
        return { regions, links: [...all], marks, zones };
      }
      const newMarks = []; let mapAdded = false, mapGlowTimer = null;
      loadMapRecords(regionId0);
      const regionLabel = () => (typeof S.regionLabel === 'function' ? S.regionLabel(sim.world.regionId, sim.world.local) : sim.world.regionId);
      const HINT_DEFAULT = 'パッドを なぞって あるく。だれかに ちかづくと「はなす」';
      if (container.classList) container.classList.add('meguru-overlay');
      container.innerHTML = `
        <div class="mg-header mg-meguru-header"><span id="mgrPlace"></span><span id="mgrCount"></span><span id="mgrFound"></span></div>
        <div class="mg-canvas-wrap mgr-wrap"><canvas class="mg-canvas" id="mgrCanvas"></canvas><div class="mgr-banner hidden" id="mgrBanner"></div><div class="mgr-spot hidden" id="mgrSpot"></div><div class="mgr-found hidden" id="mgrFoundToast"><div class="mgr-found-card"><span class="mgr-found-icon" id="mgrFoundIcon"></span><span class="mgr-found-text"><span class="mgr-found-title" id="mgrFoundTitle"></span><span class="mgr-found-sub" id="mgrFoundSub"></span></span></div></div><button type="button" class="mgr-map-btn" id="mgrMap">🗺 ちず</button></div>
        <div class="mg-hint mgr-hint" id="mgrHint">${HINT_DEFAULT}</div>
      `;
      // 右がわは「いま おせば いみの ある こと」だけ。その ばの できごと(はなす /
      // のる / もぐる / うかぶ)は **1 枠**で 入れかえ、なにも ない ときは 出さない。
      // #mgrTalk の id は そのまま(ほかの しらべ ものが これを さがす)
      const row = S.createPadRow(container, `<button type="button" class="mg-tap-btn primary hidden" id="mgrTalk" data-key="action">💬 はなす</button><button type="button" class="mg-tap-btn" id="mgrTravel">🧭 たび</button><button type="button" class="mg-tap-btn" id="mgrHome">🏠 もどる</button>`);
      const pad = S.createTouchPad(row, { mode: 'vector', sticky: true, before: row.firstChild || null, label: 'ここを なぞって あるく' });
      const canvas = container.querySelector('#mgrCanvas');
      const wrap = container.querySelector('.mgr-wrap');
      const mapBtn = container.querySelector('#mgrMap');
      // たんさく がめんの たかさ。
      // ヒントと パッドは overlay の したに はりつく(margin-top: auto)ので、
      // canvas を ちぢめても パッドは 上がらない。だから「この overlay が つかえる
      // いちばん した」を きめて、そこから うえに ある もの を ひいて canvas の
      // たかさに する。
      //
      // 「いちばん した」は つぎの うち いちばん うえに ある もの:
      //   ① みえている たかさ(visualViewport)から、body の したの よはく(ホームバーよけ)を ひいた ところ
      //   ② ほんたい(.device)の 内がわの 下端。いちの ずれ(iPhone で ほんたいが がめんより
      //      おおきく なって いる とき)に ひきずられない よう、max-height から けいさんする
      //   ③ overlay の おやたちの うち、はみ出しを きりとる はこ(overflow が visible では
      //      ない もの)の 内がわの 下端(あいだの はこの よはくも ひく)
      // ③ が だいじ: せかい表示(world-mode)では .screen-frame が グリッドの 行に なって
      // overflow:auto に なる ため、ほんたいより さきに ここで きられる。まえは ② だけを
      // 見て いた ので、パッドと「もどる」の わくの 下が 13px ほど きりとられて いた
      function overlayBottomLimitPx() {
        try {
          if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return 0;
          if (typeof container.getBoundingClientRect !== 'function') return 0;
          let limit = Infinity;
          const vv = window.visualViewport;
          const vh = vv && vv.height > 0 ? vv.height : (window.innerHeight || 0);
          if (vh > 0) {
            const bs = document.body ? window.getComputedStyle(document.body) : null;
            limit = vh - (bs ? parseFloat(bs.paddingBottom) || 0 : 0);
          }
          // overlay と その はこの あいだに ある よはく(padding・border)を ためながら うえへ たどる。
          // .screen が 10px の よはくを もつ ので、それも ひかないと 2px ほど はみ出す
          let extra = 0;
          for (let node = container.parentElement; node && node.nodeType === 1 && node !== document.documentElement; node = node.parentElement) {
            const cs = window.getComputedStyle(node), r = node.getBoundingClientRect();
            const bT = parseFloat(cs.borderTopWidth) || 0, bB = parseFloat(cs.borderBottomWidth) || 0, pB = parseFloat(cs.paddingBottom) || 0;
            if (!/^visible/.test(cs.overflowY || 'visible') && node.clientHeight > 0) limit = Math.min(limit, r.top + bT + node.clientHeight - pB - extra);
            if (node.classList && node.classList.contains('device')) {
              // ほんたい: いちの ずれ(iPhone で ほんたいが がめんより おおきく なって いる とき)に
              // ひきずられない よう max-height から けいさんする。max-height が ない くみかた
              // (world-mode)では ほんたいの たかさが なかみで きまる ので つかわない
              const maxH = parseFloat(cs.maxHeight);
              if (Number.isFinite(maxH) && maxH > 0) limit = Math.min(limit, r.top + maxH - pB - extra);
            }
            extra += pB + bB;
          }
          return Number.isFinite(limit) ? limit : 0;
        } catch (_) { return 0; }
      }
      function overlayAvailPx() {
        const limit = overlayBottomLimitPx();
        if (!limit) return 0;
        return Math.max(0, limit - container.getBoundingClientRect().top);
      }
      // ならび おわった あと、じっさいに はみ出して いないか はかる。
      // よはく(margin)の ぶんまで きっちり 読める ので、くみかたが かわっても きれない
      function overflowBelowPx() {
        try {
          const limit = overlayBottomLimitPx(); if (!limit) return 0;
          let bottom = 0;
          for (const ch of container.children) { if (!ch || typeof ch.getBoundingClientRect !== 'function') continue; const b = ch.getBoundingClientRect().bottom; if (b > bottom) bottom = b; }
          // 1px は まるめの さ。それを こえた ぶんだけ ちぢめる
          return bottom - limit > 1 ? Math.ceil(bottom - limit) : 0;
        } catch (_) { return 0; }
      }
      let shrinkPx = 0; // はかった はみ出しの ぶん(canvas から ひく)
      // canvas いがいが つかって いる たかさ(HUD・ヒント・パッド・ボタン・お しらせ の おび)
      const usedPx = () => { let u = 0; for (const ch of container.children) { if (ch === wrap) continue; u += ch.offsetHeight || 0; } return u; };
      function availHeight() {
        const oh = overlayAvailPx() || container.clientHeight || 0;
        if (!oh) return 300;
        // 10 は こどもの あいだの よはく。あまく 見つもって おいて、はみ出したら
        // overflowBelowPx() で はかった ぶんだけ ちぢめる(すきまを のこさない)
        return clamp(Math.floor(oh - usedPx() - 10 - shrinkPx), 220, 760);
      }
      let lastUsed = -1, lastWant = -1; // さいごに 組んだ ときの「canvas いがい」の たかさ と、その ときの 見つもり
      let { ctx, W, H } = S.createMgCanvas(canvas, () => availHeight(), {});
      const rawCtxOf = () => (canvas && typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null); // なまの ctx(けしき よう の つつみに つかう)
      const placeEl = container.querySelector('#mgrPlace'), countEl = container.querySelector('#mgrCount'), foundEl = container.querySelector('#mgrFound'), hintEl = container.querySelector('#mgrHint'), bannerEl = container.querySelector('#mgrBanner'), spotEl = container.querySelector('#mgrSpot');
      const foundEls = { box: container.querySelector('#mgrFoundToast'), icon: container.querySelector('#mgrFoundIcon'),
        title: container.querySelector('#mgrFoundTitle'), sub: container.querySelector('#mgrFoundSub') };
      const actBtn = container.querySelector('#mgrTalk'), travelBtn = container.querySelector('#mgrTravel'), homeBtn = container.querySelector('#mgrHome');
      // いまの context action。null なら ボタンは 出さない(からの ボタンを のこさない)
      //   talk  ちかくに 住民が いる
      //   ride  ゴンドラの のりば / もぐる ところ(gate の action を そのまま つかう)
      // actKey は はじめ null。そう すると さいしょの setAct(null) が かならず
      // 1 回 はしり、ボタンの じょうたいを マークアップに たよらず きめられる
      let act = null, actKey = null;
      const setAct = (next) => {
        const key = next ? `${next.kind}:${next.label}` : '';
        if (key === actKey) return;
        actKey = key; act = next;
        if (!next) { actBtn.classList.add('hidden'); return; }
        actBtn.textContent = next.label;
        actBtn.classList.remove('hidden');
      };
      const ctx2d = canvas.getContext ? canvas.getContext('2d') : null;
      const rendererFactory = typeof opts.renderer === 'function' ? opts.renderer : createCanvasRenderer;
      const renderer = rendererFactory({ canvas, ctx, rawCtx: rawCtxOf(), W, H, tier, playerGlyph: typeof S.playerGlyph === 'function' ? S.playerGlyph : () => '🐣', wrapCtx: typeof S.wrapCanvasCtx === 'function' ? S.wrapCanvasCtx : null, wrapScenery: typeof S.sceneryCtx === 'function' ? S.sceneryCtx : null, resolveScenery: typeof S.resolveScenery === 'function' ? S.resolveScenery : null });
      // よいやすい ひとの せってい: カメラの えんしゅつを とめ、けしきの うごきを へらす(とめない)
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        sim.setCameraMotion(false);
        if (typeof renderer.setAnimLevel === 'function') renderer.setAnimLevel(0);
      }
      // さいしょの 1かいは ヒントや パッドの たかさが まだ きまって いないので、
      // ならび おわった あと もう いちど はかって 組みなおす(2かいで おちつく)
      const resizeCanvas = () => { const n = S.createMgCanvas(canvas, () => availHeight(), {}); ctx = n.ctx; W = n.W; H = n.H; if (renderer && typeof renderer.resize === 'function') renderer.resize({ ctx, W, H, rawCtx: rawCtxOf() }); };
      // 2かい 組んで ならびを おちつかせ、それでも はみ出して いたら その ぶん ちぢめる
      function layoutCanvas() {
        shrinkPx = 0;
        resizeCanvas(); resizeCanvas();
        for (let i = 0; i < 3; i++) { const over = overflowBelowPx(); if (over <= 0) break; shrinkPx += over; resizeCanvas(); }
        lastUsed = usedPx(); lastWant = availHeight();
      }
      layoutCanvas();
      // ならびが おちつくのは つぎの フレーム。ボタンや ヒントの たかさが きまってから
      // もう いちど 組みなおす(はじめの 1かいだけでは 小さいままに なる ことが ある)
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => { if (running) layoutCanvas(); });
      let resizeTimer = null;
      const onResize = () => { if (resizeTimer) clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { resizeTimer = null; if (!running) return; layoutCanvas(); }, 150); };
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') window.addEventListener('resize', onResize);
      // iPhone で ブラウザの バーが 出たり ひっこんだり した ときも 組みなおす
      if (typeof window !== 'undefined' && window.visualViewport && typeof window.visualViewport.addEventListener === 'function') window.visualViewport.addEventListener('resize', onResize);
      const ENV_ICON = { sunny: '☀️', cloudy: '☁️', rain: '🌧️', snow: '🌨️' }; const TIME_ICON = { morning: '🌅', day: '🌞', evening: '🌇', night: '🌙' };
      // HUD: ばしょ / この 地域に すんでいる かず / こんかい ちかくで あった かず
      const hud = () => {
        const e = sim.env;
        placeEl.innerHTML = `${regionLabel()} <span class="mgr-env">${TIME_ICON[e.time] || ''}${ENV_ICON[e.weather] || ''}</span>`;
        countEl.textContent = `${sim.world.residents.length}たい`;
        foundEl.textContent = `であった ${sim.metCount()}`;
      };
      const showBanner = (text, ms) => { banner = text; bannerUntil = performance.now() + ms; bannerEl.textContent = text; bannerEl.classList.remove('hidden'); };

      // ====== みつけた しらせ(はっけん つうち) ======
      // まえは「なにかを みつけた」しるしが ばらばらに 出て いた:
      //   ・スポットの おび は 1つしか なく、地域の おしらせ に うわがきされる
      //   ・地域を こえて いる あいだの はっけん は 1つも 出ない(ちずの ボタンだけ ひかる)
      //   ・地区(zone)と めじるし は ずっと だまったまま
      // その ため「なにか みつけた らしい けど、なにを?」に なって いた。
      //
      // ここでは はっけんを **いみ ごとに わけて**、かならず
      //   ① なにを みつけたか(なまえ)  ② それが どう なったか(ちずに きろくした)
      // の 2つを 出す。1フレームに いくつ みつけても 出すのは 1つずつ。
      //
      // つよさ の じゅんばん(§12):
      //   region(おびで 出す) → secret → landmark → みち(connection) → zone → ふつうの spot
      // 住民に ちかづいた ことは はっけん では ない(下の「はなす」だけ)。
      // めじるし(mark)は かずが 多く、ちずに のる だけ なので しらせない。
      const FOUND_RANK = { secret: 1, landmark: 2, link: 3, zone: 4, spot: 5 };
      const FOUND_MS = { secret: 2400, landmark: 2000, link: 1800, zone: 1600, spot: 1500 };
      const FOUND_STRONG = { secret: true, landmark: true };   // すこし つよい えんしゅつ に する もの
      const FOUND_GAP = 180;          // つぎの しらせ までの あいだ(かさならない ように)
      const FOUND_MAX = 4;            // ためこむ かず。これ いじょうは よわい ものから すてる
      let foundQueue = [], foundNow = null, foundUntil = 0, foundNextAt = 0;
      const foundQuietHint = (on) => { if (hintEl && hintEl.classList) hintEl.classList.toggle('mgr-hint-quiet', !!on); };
      // おなじ ものを 2ど ならべない。つよい ものから ならべ、あふれたら よわい ものを すてる
      function queueFound(entry) {
        entry.rank = FOUND_RANK[entry.kind] || 9;
        if ((foundNow && foundNow.key === entry.key) || foundQueue.some((q) => q.key === entry.key)) return;
        foundQueue.push(entry);
        foundQueue.sort((a, b) => a.rank - b.rank);
        if (foundQueue.length > FOUND_MAX) foundQueue.length = FOUND_MAX;
      }
      function hideFound() {
        foundNow = null;
        if (foundEls.box) foundEls.box.classList.add('hidden');
        foundQuietHint(false);
      }
      function showFound(entry, now) {
        foundNow = entry; foundUntil = now + (FOUND_MS[entry.kind] || 1500);
        const box = foundEls.box; if (!box) return;
        box.className = `mgr-found mgr-found-${entry.kind}` + (FOUND_STRONG[entry.kind] ? ' mgr-found-strong' : '');
        foundEls.icon.textContent = entry.icon || '';
        foundEls.icon.classList.toggle('hidden', !entry.icon);
        foundEls.title.textContent = entry.title;
        foundEls.sub.textContent = entry.sub || '';
        foundEls.sub.classList.toggle('hidden', !entry.sub);
        // え を かきなおして アニメーションを はじめから やりなおす
        box.style.animation = 'none'; void box.offsetWidth; box.style.animation = '';
        sfx(FOUND_STRONG[entry.kind] ? 'good' : 'pop');
        foundQuietHint(true);                       // した の そうさ せつめいを よわめる(§16)
      }
      // 1フレームに 1つ だけ すすめる。地域の おび が 出て いる あいだ と、
      // 地域を こえて いる あいだ は 出さない(おしらせを かさねない §9)
      function stepFound(now) {
        if (foundNow && now >= foundUntil) { hideFound(); foundNextAt = now + FOUND_GAP; }
        if (foundNow || trans || banner) return;
        if (!foundQueue.length || now < foundNextAt) return;
        showFound(foundQueue.shift(), now);
      }
      // みち(connection)の はっけん: りょうがわの 入口 spot を どちらも 見つけた しゅんかんに
      // ひらく。じょうけん(worldLinksFrom)も かぞえかたも かえない。ここでは
      // 「せかいの ちずを ひらく まで しらせが 出ない」のを やめる だけ
      function newLinksFor(spotId) {
        if (typeof S.allDiscoveredSpots !== 'function') return [];
        const rid = sim.world.regionId;
        const touches = WORLD_GEOGRAPHY.connections.some((c) => c.mouths && c.mouths[rid] === spotId);
        if (!touches) return [];
        const known = new Set(typeof S.worldLinks === 'function' ? S.worldLinks() : []);
        const fresh = worldLinksFrom(S.allDiscoveredSpots()).filter((id) => !known.has(id));
        if (fresh.length && typeof S.recordWorldLinks === 'function') S.recordWorldLinks(fresh);
        if (fresh.length) { distantLinks = null; syncDistant(); } // Phase 4D-2
        return fresh;
      }
      // はじめて 見つけた スポット。きろく → ちず → しらせ の じゅんばんは かえない
      // (「ちずに きろくした」と 出た ときには もう ちずに ある §14)
      function noteSpotFound(s) {
        const rid = sim.world.regionId;
        if (typeof S.recordSpot === 'function') S.recordSpot(rid, s.id);
        mapAdded = true;                                   // きろくは どの spot でも これまで どおり
        // 目じるしの ない 通過点では しらせない。どこに いるかは 左上の チップが 出しつづける
        if (spotDiscoveryLevel(s) > 0) {
          const kind = s.secret ? 'secret' : s.landmark ? 'landmark' : 'spot';
          const note = mapNote();
          queueFound({ key: `spot:${rid}:${s.id}`, kind, region: rid,
            icon: s.secret ? '🔍' : s.landmark ? '✨' : '',
            // ひみつは 「ひみつを みつけた」かんじ を さきに。なまえは その した に そえる
            title: s.secret ? 'ひみつのばしょを みつけた！' : `${s.label}を みつけた${s.landmark ? '！' : ''}`,
            sub: s.secret ? [s.label, note].filter(Boolean).join('・') : note });
        }
        for (const id of newLinksFor(s.id)) {
          const c = WORLD_GEOGRAPHY.connections.find((q) => q.id === id); if (!c) continue;
          const other = c.a === rid ? c.b : c.a;
          queueFound({ key: `link:${id}`, kind: 'link', region: rid, icon: '🧭',
            title: `${plainLabel(other)}へのみちを みつけた`, sub: 'せかいの ちずに きろくした' });
        }
      }
      // 「ちずに きろくした」は **しくみが わかる まで** の あいだ だけ。
      // 20 か所 見つけた ころには もう わかって いる ので、くりかえさない。
      // かぞえかたは セーブに すでに ある「見つけた spot」だけ。新しい きろくは ふやさない
      const FOUND_TUTORIAL = 3;
      function mapNote() {
        if (typeof S.allDiscoveredSpots !== 'function') return '';
        const all = S.allDiscoveredSpots(); let n = 0;
        for (const k of Object.keys(all)) n += (all[k] || []).length;
        return n <= FOUND_TUTORIAL ? 'ちずに きろくした' : '';
      }
      // はじめて 入った 地区。ちずの ぬりが ひろがる ので、いみが わかる なまえで 出す(§8)
      function noteZoneFound(zn) {
        const rid = sim.world.regionId;
        saveMapBits('zones', zn.id); mapAdded = true;
        queueFound({ key: `zone:${rid}:${zn.id}`, kind: 'zone', region: rid, icon: '🗺',
          title: `${zn.label}に きた`, sub: mapNote() ? 'ちずが すこし ひろがった' : '' });
      }
      // めじるしは しらせない が、ちずには のせる。**こえて いる あいだ も のこす**
      // (まえは ここで すてて いた ので、ちずに 出ない のに ボタンだけ ひかって いた)
      const flushMarks = () => { if (newMarks.length) { saveMapBits('marks', newMarks); newMarks.length = 0; mapAdded = true; } };
      let lastZone = null;
      const showSpot = (s) => { if (!s) { const zn = sim.zone; if (zn) { spotEl.textContent = zn.label; spotEl.classList.remove('hidden'); } else spotEl.classList.add('hidden'); return; } spotEl.textContent = `${s.secret ? '🔍 ' : ''}${s.label}`; spotEl.classList.remove('hidden'); };
      const plainLabel = (id) => (typeof S.regionPlainLabel === 'function' ? S.regionPlainLabel(id, sim.world.local) : id);
      showBanner(`${plainLabel(sim.world.regionId)}を めぐる`, 1600);
      hud();
      const preload = () => { if (typeof S.prepareIllustrations !== 'function') return; const w = sim.world; const scenery = [...new Set(w.props.map((p) => p.emoji).filter(Boolean))]; const actors = [...new Set(w.residents.concat(sim.party).map((a) => a.emoji).filter(Boolean))]; S.prepareIllustrations(scenery, actors); };
      preload();
      // ====== Phase 4D-2: 遠景の データを renderer へ(4D-2b で 12 地域)======
      // 見えるか・こさ(時間・天気・季節・見つけた みち・出口の ちかく)は visibleDistant が きめる。ここは 地域・環境・みちの きろく・
      // 出口の ちかさ が かわった ときに 1 ど よんで renderer.setDistant() に わたす だけ(毎フレーム 組まない。セーブにも view にも 書かない)。
      // 地域の 名前で わけない: 遠景を もたない 地域(きおくのみずうみ)は distantFeatures が から なので 出ない
      const distantReduced = !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      let distantKey = null, distantLinks = null;
      // 出口の ちかく = 出口 spot の はんけいの 4 ばい いない(「出口の ちかく だけで 見える」遠景 よう)
      const nearGatesNow = () => {
        const p = sim.player, out = [];
        for (const g of sim.gates || []) if (g && g.spot && Math.hypot(p.x - g.spot.x, p.z - g.spot.z) < (g.spot.r || 200) * 4) out.push(g.id);
        return out.sort();
      };
      function syncDistant() {
        if (typeof renderer.setDistant !== 'function') return;
        const rid = sim.world.regionId;
        if (!distantFeatures(rid).length) { if (distantKey !== '') { distantKey = ''; renderer.setDistant(null); } return; }
        if (!distantLinks) {
          const stored = typeof S.worldLinks === 'function' ? S.worldLinks() || [] : [];
          const spots = typeof S.allDiscoveredSpots === 'function' ? S.allDiscoveredSpots() : {};
          distantLinks = [...new Set([...stored, ...worldLinksFrom(spots)])];
        }
        const e = sim.env || {}, near = nearGatesNow();
        const key = `${rid}|${e.time}|${e.weather}|${e.season}|${distantLinks.length}|${near.join(',')}`;
        if (key === distantKey) return;
        distantKey = key;
        renderer.setDistant({ regionId: rid, list: visibleDistant(rid, e, { links: distantLinks }, { nearGates: near }), reduced: distantReduced });
      }
      syncDistant();
      // ====== /Phase 4D-2 ======
      function enterWorld(regionId, opts = {}) {
        sim.enterRegion(regionId, { registry: buildRegistry(), locality: typeof S.selectedLocality === 'function' ? S.selectedLocality() : null,
          discovered: typeof S.discoveredSpots === 'function' ? S.discoveredSpots(regionId) : [], at: opts.at || null, heading: opts.heading,
          carry: opts.carry || null });
        loadMapRecords(regionId);
        preload();
        sim.setEnv(env());
        distantLinks = null; syncDistant(); // Phase 4D-2
        setAct(null); showSpot(null);
        // よその 地域の しらせを もちこさない。こえる とちゅうで ためた ぶんは
        // 行きさきの もの だけ のこす
        hideFound(); foundQueue = foundQueue.filter((q) => q.region === regionId);
        // あるいて こえた ときは ここで しらせない。こえおわって から まとめて 出す(§7)
        if (!opts.quiet) showBanner(`${plainLabel(regionId)}に ついた`, 1600);
        hud();
      }

      // ====== region transition(Phase 2)======
      // あるいて こえる / ゴンドラで 上がる / もぐる の 3つを ひとつの しくみで あつかう。
      // かかる あいだ は たんさくの にゅうりょく・はなす・ちず・たび を とめる(#28)
      // なんども おなじ みちを いく ときは みじかく(§19/§44)。よいやすい せっていも みる
      const crossedBefore = new Set();
      const reducedMotion = !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      let trans = null;
      // 音は 「いみ」の がわ(plan の cue)から 鳴らす。え の かんすうからは 鳴らさない(§29)
      const transCue = (phase) => { if (phase && phase.cue) sfx(phase.cue); };
      const HINT_BY_WAY = {
        walk: (g) => `${plainLabel(g.to)}の ほうへ あるいて いく…`,
        up: (g) => (g.layerTo === 'sky' ? 'ゴンドラが のぼって いく…' : 'みなもへ うかんで いく…'),
        down: (g) => (g.layerTo === 'below' ? 'しずかに もぐって いく…' : 'ゴンドラが おりて いく…'),
        sail: (g) => (g.to === 'jungle' ? 'ふねが みなみにしの うみへ 出て いく…' : 'ふねが ほんどへ もどって いく…'),
      };
      function beginTransition(g) {
        if (trans) return;                                   // 二重に はじめない(§33)
        if (tryCorridor(g)) return;                          // home|forest は あるいて こえる(ほかは この まま) // Phase 4E-2
        if (sim.busy) sim.endTalk();                         // はなしを おえて から こえる(§31)
        const key = `${g.id}:${g.to}`;
        // 海路だけは セーブも 見る。しまを もう 見つけて いる ひとに、
        // 「はじめて しまを 見つける」ながい えんしゅつを まいかい 出さない(§17)
        const knownTo = g.way === 'sail' && typeof S.worldRegions === 'function'
          && (S.worldRegions() || []).indexOf(g.to) >= 0;
        const plan = transitionPlan(g, { repeat: crossedBefore.has(key) || knownTo, reduced: reducedMotion, tier });
        crossedBefore.add(key);
        trans = { g, plan, t: 0, phase: plan.phases[0], swapped: false, released: false, first: false, keep: pad.vector() };
        setAct(null);
        hideFound();                                         // こえて いる あいだ は しらせを かさねない(§9)
        travelBtn.disabled = true; mapBtn.disabled = true; homeBtn.disabled = true;  // §30/§32
        transCue(plan.phases[0]);
        hintEl.textContent = (HINT_BY_WAY[plan.way] || HINT_BY_WAY.walk)(g);
      }
      function stepTransition(dt) {
        const plan = trans.plan;
        trans.t += dt;
        const ph = transitionPhaseAt(plan, trans.t);
        if (ph !== trans.phase) { trans.phase = ph; transCue(ph); }
        // cross の あたまで 世界を 入れかえる。その あいだ だけ まっくらに して、
        // 到着さきが すけて 見える ことを なくす(§6)
        if (!trans.swapped && trans.t >= plan.swapAt) {
          trans.swapped = true;
          const g = trans.g;
          const by = plan.way === 'walk' ? 'walk' : plan.way === 'up' ? 'gondola' : 'dive';
          const carry = sim.carry();
          const r = typeof S.enterRegionByMove === 'function' ? S.enterRegionByMove(g.to, { by }) : { ok: false };
          trans.first = !!(r && r.first);
          // むきと からだの いきおいを ひきつぐ(こえた しゅんかんに ふりむかない・とまらない)
          enterWorld(g.to, { at: g.at, heading: g.enterFacing != null ? g.enterFacing : 0, carry, quiet: true });
        }
        // settle の あたまで 操作を もどす。え の うえでは まだ おちついて いく(§8)
        if (!trans.released && trans.t >= plan.releaseAt) {
          trans.released = true;
          travelBtn.disabled = false; mapBtn.disabled = false; homeBtn.disabled = false;
        }
        if (trans.t >= plan.total) {
          const g = trans.g, first = trans.first;
          trans = null;
          travelBtn.disabled = false; mapBtn.disabled = false; homeBtn.disabled = false;
          last = null;
          // 大きな しらせは はじめての ときだけ。2 かいめ からは ちいさな 地域名 だけ(§7)
          // はじめての 地域は おびが「はじめての X」と 出す。ついた ばしょ と
          // その 地区の しらせは その おびに 入って いる ので かさねない(§9)。
          // みち(せかいの ちず)だけは いみが べつ なので のこす。
          // きろく じたいは もう すんで いる ので、ちずには ちゃんと のって いる
          if (first) {
            showBanner(`はじめての ${plainLabel(g.to)}`, 2000); sfx('pop');
            foundQueue = foundQueue.filter((q) => q.kind === 'link');
          } else showBanner(plainLabel(g.to), 900);
          lastHint = null;
        }
      }
      // ====== Phase 4E-2: home|forest を あるいて こえる(PoC。ほかの 出口は いまの transition の まま)======
      // gate が 出た とき、continuousWalkMode が 'corridor' なら transition の かわりに corridor を あるく。
      // それ いがい(許可リスト外・よいやすい せってい・端末が おもい・まえに しっぱいした・形が あわない)は いまの transition。
      // **セーブは さわらない**: 地域の 書きかえ(enterRegionByMove)は 着いた ときの 1 かい だけ。とちゅうで reload したら 出発 地域から
      let corr = null, corrFade = null;
      const corrFailed = new Set();                 // この セッションで しっぱいした corridor(つぎからは transition)
      // しらべもの よう(え には つかわない)。prepare / commit / さいしょの え / 暗転の ながさ(ms)
      const corrStats = { enters: 0, arrives: 0, backs: 0, fails: 0, prepares: 0, discards: 0, warms: 0, lastPrepareMs: null, lastCommitMs: null, lastFirstDrawMs: null, lastCoverMs: null, lastBuildMs: null, coverSkips: 0, handoff: CORRIDOR_HANDOFF_STATS,
        // Phase 4E-3: preload の かず と さいごの 1 回(しらべもの よう。セーブ しない・ひとには 見せない)
        preload: { starts: 0, readies: 0, aborts: 0, fails: 0, commits: 0, fallbacks: 0, invalid: 0, last: null, log: [] } };
      const corrFault = opts.corridorFaults || null;   // テスト だけ: preload を わざと こけさせる / おそく する({ registry, build, warm, commit, slow })
      const perfNow = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
      let corrLinks = null, corrFromList = null, corrToList = null, corrDistantKey = null;
      // ---- Phase 4E-4A: corridor の 絵を さきに デコード(pre-decode)----
      // あるける 出口に ちかづいたら、その corridor の 最初の 段と 両端の 地域の 絵を 画面の そとで デコードして おく
      // (prepareIllustrations の { decode: true }。絵の キャッシュを あたためる だけ。地域・セーブ・はっけん・corridor の すすみは さわらない)。
      // 1 セッション 1 出口 1 回。しっぱいしても いつもどおり えがく(はじめて えがく ときに デコード)
      const corrPredecoded = new Set();
      corrStats.predecode = { requests: 0, done: 0, failed: 0, last: null };
      const PREDECODE_REACH = 360;   // 出口 spot の はし から この きょり(world)に 入ったら
      function corridorPredecode(g, why) {
        if (!g || typeof S.prepareIllustrations !== 'function') return null;
        const key = g.id + ':' + g.from;
        if (corrPredecoded.has(key)) return null;
        let m = null;
        try { m = continuousWalkMode(g, { perfTier: tier, reducedMotion, failed: corrFailed }); } catch (_) { m = null; }
        if (!m || m.mode !== 'corridor') return null;
        corrPredecoded.add(key);
        const list = corridorSceneryEmojis(m.spec, g.from), t0 = perfNow(), P = corrStats.predecode;
        P.requests++; P.last = { key, why, n: list.length, at: Math.round(t0), ms: null, ok: null };
        const last = P.last;
        let p = null;
        try { p = S.prepareIllustrations(list, [], { decode: true }); } catch (_) { p = null; }
        const spec = m.spec;
        if (p && typeof p.then === 'function') p.then((ok) => { last.ok = ok !== false; last.ms = Math.round(perfNow() - t0); if (ok === false) P.failed++; else { P.done++; corrDecoded.add(key); if (why === 'near') entryPrepStart(g, spec); } }, () => { last.ok = false; P.failed++; });
        return p;
      }
      // Phase 4E-4A: 入口の したく。絵の デコードが おわった 出口の そばで、その corridor の world を さきに 1 回だけ 組み
      // (入口で それを そのまま つかう。二重には 組まない)、入口の カメラから 見える 立て看板(glyph)を 何 frame かに わけて つくる。
      // 入口の さいしょの frame で 立て看板を 10〜20 こ はじめて つくる(4 倍で 1 こ 4〜7ms)のを、あるいて くる あいだに 小わけに する。
      // 地域・セーブ・はっけん・corridor の じょうたいは さわらない。しっぱい したら なにも しない(入口で いつもどおり 組む)
      const ENTRY_WARM = Object.freeze({ chunks: 8, aheadSec: 0.6, maxHeld: 2 });
      const corrDecoded = new Set();
      const corrEntry = new Map();   // key(connection:from)→ { gid, from, spec, region, world, walk, i, pass, done }
      corrStats.entryPrep = { builds: 0, reuses: 0, warms: 0, fails: 0, drops: 0 };
      function entryPrepStart(g, spec) {
        const key = g.id + ':' + g.from;
        if (corr || corrEntry.has(key) || !spec || !sim.world || sim.world.regionId !== g.from) return;
        if (corrEntry.size >= ENTRY_WARM.maxHeld) return;
        corrEntry.set(key, { gid: g.id, from: g.from, spec, region: g.from, world: null, walk: null, i: 0, pass: 0, done: false });
      }
      function entryPrepStep(now) {
        if (!corrEntry.size) return;
        const rid = sim.world && sim.world.regionId;
        for (const [k, E] of corrEntry) if (E.region !== rid) { corrEntry.delete(k); corrStats.entryPrep.drops++; }
        let E = null;
        for (const q of corrEntry.values()) if (!q.done) { E = q; break; }
        if (!E) return;
        try {
          if (corrFault && corrFault.entry) throw new Error('test entry prep failure');   // テスト だけ
          if (!E.world) { E.world = corridorWorld(corridorChart(E.spec, E.from)); corrStats.entryPrep.builds++; return; }   // 組む だけの frame
          if (rendererFactory !== createCanvasRenderer || typeof document === 'undefined' || !document.createElement) { E.done = true; return; }
          if (!E.walk) { E.walk = createCorridorWalk(E.spec, E.from, { world: E.world, firstVisit: true, party: [], env: sim.env }); return; }
          const R = ensureWarmR();
          if (!R) { E.done = true; E.walk = null; return; }
          const v = E.walk.view(), n = ENTRY_WARM.chunks;
          const part = Object.assign({}, v.world, { props: v.world.props.filter((_, j) => j % n === E.i), segments: [], marks: [], areas: [], shore: [], detail: [], spots: [] });
          R.draw(Object.assign({}, v, { world: part, residents: [], party: [] }), now);
          E.i++; corrStats.entryPrep.warms++;
          if (E.i < n) return;
          E.i = 0; E.pass++;
          // 2 かいめは すこし すすんだ ところから(ちかづいて 大きく なる 立て看板)
          if (E.pass === 1) for (let q = 0; q < 6; q++) E.walk.step(ENTRY_WARM.aheadSec / 6, { x: 0, y: -1 });
          else { E.done = true; E.walk = null; }
        } catch (_) { corrEntry.delete(E.gid + ':' + E.from); corrStats.entryPrep.fails++; }
      }
      function predecodeNearGates() {
        const pl = sim.player, list = sim.gates || [];
        for (const g of list) {
          if (!g || g.kind !== 'walk' || !g.spot) continue;
          const key = g.id + ':' + g.from;
          if (corrPredecoded.has(key) && (!corrDecoded.has(key) || corrEntry.has(key))) continue;
          if (Math.hypot(pl.x - g.spot.x, pl.z - g.spot.z) > (g.spot.r || 0) + PREDECODE_REACH) continue;
          if (!corrPredecoded.has(key)) corridorPredecode(g, 'near');
          else { let m = null; try { m = continuousWalkMode(g, { perfTier: tier, reducedMotion, failed: corrFailed }); } catch (_) { m = null; } if (m && m.mode === 'corridor') entryPrepStart(g, m.spec); }
        }
      }
      function tryCorridor(g) {
        let m = null;
        try { m = continuousWalkMode(g, { perfTier: tier, reducedMotion, failed: corrFailed }); } catch (err) { m = null; }
        if (!m || m.mode !== 'corridor') return false;
        corridorPredecode(g, 'entry');   // Phase 4E-4A: ちかづく まえに こえた とき(たび の あと すぐ など)も さきに はじめる
        if (sim.busy) sim.endTalk();
        const key = `${g.id}:${g.to}`;
        // はじめてかは いまの はっけんの きろく(みちの はっけん)と、この セッションで こえたか。あたらしい セーブの key は つくらない
        const stored = typeof S.worldLinks === 'function' ? S.worldLinks() || [] : [];
        const spots = typeof S.allDiscoveredSpots === 'function' ? S.allDiscoveredSpots() : {};
        corrLinks = [...new Set([...stored, ...worldLinksFrom(spots)])];
        const firstVisit = !crossedBefore.has(key) && corrLinks.indexOf(g.id) < 0;
        let walk = null;
        const E = corrEntry.get(g.id + ':' + g.from), preWorld = E && E.world ? E.world : null;   // Phase 4E-4A: てまえで 組んだ world
        corrEntry.clear();
        if (preWorld) corrStats.entryPrep.reuses++;
        try {
          walk = createCorridorWalk(m.spec, g.from, { local: { x: sim.player.x, z: sim.player.z }, heading: sim.player.heading, yaw: sim.camera.yaw,
            cam: sim.camera, firstVisit, party: sim.party, env: sim.env, world: preWorld });
        } catch (err) { corrFailed.add(g.id); corrStats.fails++; return false; }
        crossedBefore.add(key);
        dropCorridorWorld();
        corr = { g, walk, phase: 'in', t: 0, cover: 0, stage: -1, coverStart: null, prep: false, prepFailed: false, pre: { state: 'idle', conn: g.id, to: g.to } };
        corrStats.enters++;
        const e = sim.env || {};
        corrFromList = visibleDistant(g.from, e, { links: corrLinks }, {});
        corrToList = visibleDistant(g.to, e, { links: corrLinks }, {});
        corrDistantKey = null;
        setAct(null); hideFound(); spotEl.classList.add('hidden');   // 出口の spot / 地区の なまえは corridor では 出さない
        travelBtn.disabled = true; mapBtn.disabled = true;   // もどる(めぐるを 出る)は つかえる。セーブは 出発 地域の まま
        sfx('step');
        hintEl.textContent = HINT_BY_WAY.walk(g);
        return true;
      }
      function corridorDistant() {
        if (!corr || typeof renderer.setDistant !== 'function') return;
        // renderer は「いま えがく world の 地域」と おなじ ときだけ 遠景を えがく。corridor の world は まんなかで 到着 がわに なるので あわせる
        const rid = corr.walk.world.regionId, k = rid + ':' + Math.round(corr.walk.t * 40);
        if (k === corrDistantKey) return;
        corrDistantKey = k;
        renderer.setDistant({ regionId: rid, list: corr.walk.distant(corr.walk.t, corrFromList, corrToList), reduced: false });
      }
      // くらく する おおい(いまの transition と おなじ いろの かんがえ: 行きさきの 地面の いろ + すこし くらく)
      function drawCorridorCover(a, to) {
        if (!ctx2d || a <= 0) return;
        const w = canvas.width, h = canvas.height;
        ctx2d.save(); ctx2d.setTransform(1, 0, 0, 1, 0, 0);
        ctx2d.fillStyle = `rgba(${hexToRgb(groundOf(to)).join(',')},${Math.min(1, a)})`; ctx2d.fillRect(0, 0, w, h);
        ctx2d.fillStyle = `rgba(16,14,11,${0.45 * a})`; ctx2d.fillRect(0, 0, w, h);
        ctx2d.restore();
      }
      function endCorridor(c) {
        dropCorridorWorld();
        corr = null; corrFromList = corrToList = null;
        travelBtn.disabled = false; mapBtn.disabled = false; homeBtn.disabled = false;
        // 暗転の あけは じっさいの じかんで すすめる(おもい frame が あっても 0.14 秒で あける)。はじまりは つぎの frame
        corrFade = { start: null, to: sim.world.regionId, coverStart: c && c.coverStart != null ? c.coverStart : null };
        last = null; lastHint = null;
      }
      // prepare: 着く がわの world を 組んで おく(まだ 地域は かえない・セーブも しない)。しっぱいしたら 着く ときに 出発 地域へ
      function prepareCorridor(c) {
        if (c.prep || c.prepFailed) return;
        const t0 = perfNow();
        try {
          const registry = buildRegistry(), opts = { locality: typeof S.selectedLocality === 'function' ? S.selectedLocality() : null };
          const world = buildWorld(c.g.to, registry, opts);
          offerCorridorWorld(c.g.to, registry, opts, world);
          c.prep = true; corrStats.prepares++;
          c.warm = { world, i: 0 };
        } catch (err) { c.prepFailed = true; dropCorridorWorld(); }
        corrStats.lastPrepareMs = perfNow() - t0;
      }
      // 引き返した: 組んだ ものは すてる(メモリだけ。セーブは はじめから さわって いない)
      function discardCorridor(c) {
        const had = c.prep;
        preloadAbort(c, 'back');   // Phase 4E-3
        if (!had) return;
        dropCorridorWorld(); c.prep = false; c.warm = null; corrStats.discards++;
      }
      // ---- Phase 4E-3: preload(着く がわの world を とちゅうで 何 frame かに わけて 組む)----
      function preloadLog(c, ev, extra) {
        const P = corrStats.preload, w = c.walk;
        P.log.push(Object.assign({ ev, conn: c.g.id, to: c.g.to, frac: Math.round(w.state.s / w.spec.walkLength * 1000) / 1000, at: Math.round(perfNow()) }, extra || {}));
        if (P.log.length > 60) P.log.splice(0, P.log.length - 60);
      }
      function preloadStart(c) {
        const pre = c.pre;
        pre.state = 'preparing'; pre.startFrac = c.walk.state.s / c.walk.spec.walkLength; pre.startAt = perfNow();
        pre.buildMs = 0; pre.steps = 0; pre.frames = 0; pre.maxSliceMs = 0;
        corrStats.preload.starts++; preloadLog(c, 'prepare-start');
        try {
          if (corrFault && corrFault.registry) throw new Error('test registry failure');
          const registry = buildRegistry(), popts = { locality: typeof S.selectedLocality === 'function' ? S.selectedLocality() : null };
          pre.registry = registry; pre.opts = popts;
          pre.key = corridorWorldKey(c.g.to, registry, popts);    // 組みはじめ の じかん・てんき で きめる(かわったら 着いた ときに つかわない)
          pre.it = buildWorldSteps(c.g.to, registry, popts);
        } catch (err) { preloadFail(c, err); }
      }
      // 1 frame ぶん 組む(budgetMs を こえたら つぎの frame へ)。できたら 着く ときに わたせる ように おいて おく
      function preloadStep(c) {
        const pre = c.pre;
        if (pre.state !== 'preparing' || !pre.it) return;
        const t0 = perfNow();
        try {
          let r;
          do {
            if (corrFault && corrFault.build && pre.steps >= (corrFault.build === true ? 3 : corrFault.build)) throw new Error('test build failure');
            r = pre.it.next(); pre.steps++;
          } while (!r.done && perfNow() - t0 < CORRIDOR_PRELOAD.budgetMs && !(corrFault && corrFault.slow));   // slow: テスト だけ(1 frame 1 くぎり = 着く まで に まにあわない)
          const ms = perfNow() - t0;
          pre.buildMs += ms; pre.frames++; pre.maxSliceMs = Math.max(pre.maxSliceMs, ms);
          if (r.done) preloadReady(c, r.value);
        } catch (err) { preloadFail(c, err); }
      }
      function preloadReady(c, world) {
        const pre = c.pre;
        pre.it = null; pre.state = 'ready'; pre.readyAt = perfNow(); pre.readyFrac = c.walk.state.s / c.walk.spec.walkLength;
        offerCorridorWorld(c.g.to, pre.registry, pre.opts, world, pre.key);
        c.prep = true;
        // 着く がわの 絵を いま よみこみ はじめる。絵が よみこまれる たびに 立て看板の したく(glyph)は 作りなおしに なるので、
        // したく(warm)は よみこみ おわり(か 1.5 秒)を まって から。着いた あとで 作りなおさない
        const warm = { world, i: 0, fault: !!(corrFault && corrFault.warm), waitUntil: perfNow() + 1500, loaded: false };
        c.warm = warm;
        const ti = perfNow();
        try {
          const scenery = [...new Set(world.props.map((q) => q.emoji).filter(Boolean))], actors = [...new Set(world.residents.concat(sim.party).map((q) => q.emoji).filter(Boolean))];
          const p = typeof S.prepareIllustrations === 'function' ? S.prepareIllustrations(scenery, actors, { decode: true }) : null;   // Phase 4E-4A: デコードまで まつ
          if (p && typeof p.then === 'function') p.then(() => { warm.loaded = true; }, () => { warm.loaded = true; }); else warm.loaded = true;
        } catch (_) { warm.loaded = true; }
        pre.illusMs = perfNow() - ti;
        corrStats.prepares++; corrStats.preload.readies++; corrStats.lastPrepareMs = pre.buildMs;
        preloadLog(c, 'prepare-ready', { illusMs: Math.round(pre.illusMs * 10) / 10, buildMs: Math.round(pre.buildMs * 10) / 10, frames: pre.frames, steps: pre.steps, maxSliceMs: Math.round(pre.maxSliceMs * 10) / 10 });
      }
      function preloadFail(c, err) {
        const pre = c.pre;
        pre.it = null; pre.registry = null; pre.opts = null; pre.state = 'failed';
        dropCorridorWorld(); c.prep = false; c.warm = null;
        corrStats.preload.fails++; preloadLog(c, 'prepare-fail', { why: String(err && err.message || err).slice(0, 60) });
      }
      // すてる(引き返し・もどる・やめる・reload)。組みかけ も 組んだ もの も メモリから はなす
      function preloadAbort(c, why) {
        const pre = c && c.pre;
        if (!pre || (pre.state !== 'preparing' && pre.state !== 'ready')) return;
        pre.it = null; pre.registry = null; pre.opts = null; pre.state = 'aborted';
        dropCorridorWorld(); c.prep = false; c.warm = null;
        corrStats.preload.aborts++; preloadLog(c, 'prepare-abort', { why });
      }
      // 着く ときに つかって よいか: 組みおえて いて、同じ 出口・同じ むき・道の おわり・じかんや てんきが かわって いない
      function preloadValid(c) {
        const pre = c.pre, h = corridorHandoff;
        if (corrFault && corrFault.commit) return false;
        return pre.state === 'ready' && corr === c && !!h && h.regionId === c.g.to && pre.conn === c.g.id && pre.to === c.g.to
          && c.walk.state.s >= c.walk.spec.walkLength && h.key === corridorWorldKey(c.g.to, buildRegistry(), { locality: typeof S.selectedLocality === 'function' ? S.selectedLocality() : null });
      }
      // 着いた ときの きまり: 組みかけ なら のこりを いま 組む。つかえなければ すてて、4E-2 の 着き方(ここで 組む)に まかせる
      function preloadFinish(c) {
        const pre = c.pre;
        if (pre.state === 'preparing' && pre.it) {
          const t0 = perfNow();
          try { let r = pre.it.next(); while (!r.done) r = pre.it.next(); pre.buildMs += perfNow() - t0; preloadReady(c, r.value); pre.late = true; } catch (err) { preloadFail(c, err); }
        }
        if (pre.state === 'ready' && !preloadValid(c)) { corrStats.preload.invalid++; preloadLog(c, 'commit-invalid'); preloadAbort(c, 'invalid'); }
        if (pre.state !== 'ready') { corrStats.preload.fallbacks++; preloadLog(c, 'fallback', { from: pre.state }); }
      }
      // ---- /Phase 4E-3 ----
      // show の したく: 組んだ world の さいしょの え に つかう 絵(立て看板の 絵)を、見えない ちいさな canvas に
      // 何回かに わけて えがき、さきに つくって おく(絵は 地域を こえて つかいまわされる)。着いた frame の いちばん おもい
      // ところ(絵を はじめて つくる)を、歩いて いる あいだに 小わけに する。地域も セーブも かえない
      let warmR = null;
      function ensureWarmR() {
        if (warmR) return warmR;
        const oc = document.createElement('canvas'); oc.width = 4; oc.height = 4;
        const g = oc.getContext && oc.getContext('2d');
        if (!g) return null;
        warmR = createCanvasRenderer({ canvas: oc, ctx: g, rawCtx: g, W, H, tier, playerGlyph: typeof S.playerGlyph === 'function' ? S.playerGlyph : () => '🐣',
          wrapCtx: typeof S.wrapCanvasCtx === 'function' ? S.wrapCanvasCtx : null, wrapScenery: typeof S.sceneryCtx === 'function' ? S.sceneryCtx : null,
          resolveScenery: typeof S.resolveScenery === 'function' ? S.resolveScenery : null });
        return warmR;
      }
      function warmCorridor(c, now) {
        try { warmStep(c, now); } catch (_) { c.warm = null; }   // したく は しっぱいしても あるく ことを とめない
      }
      function warmStep(c, now) {
        const wm = c.warm;
        if (!wm) return;
        if (wm.fault) throw new Error('test warm failure');   // Phase 4E-3 テスト だけ
        if (wm.loaded === false && perfNow() < wm.waitUntil) return;   // Phase 4E-3: 絵の よみこみを まつ
        if (rendererFactory !== createCanvasRenderer || typeof document === 'undefined' || !document.createElement) { c.warm = null; return; }
        if (!warmR) {
          if (!ensureWarmR()) { c.warm = null; return; }
          if (CORRIDOR_ARRIVAL.prepare === 'preload') return;   // Phase 4E-3: 作る だけの frame
        }
        const w = c.walk, world = wm.world, n = CORRIDOR_ARRIVAL.prepare === 'preload' ? CORRIDOR_PRELOAD.warmChunks : CORRIDOR_ARRIVAL.warmChunks;   // Phase 4E-3
        if (!wm.pose) {
          const p = corridorExitPose(w.spec, Object.assign({}, w.state, { s: w.spec.walkLength })), at = world.spots.find((q) => q.id === p.spot) || world.entry;
          const prof = CAM_PROFILES.path || CAM_PROFILES.default;
          const x = at.x, z = at.z, yaw = p.heading;
          wm.pose = { player: { x, z, heading: yaw, face: 1, bob: 0, moving: true, onPath: true }, cam: { x, z, yaw, dist: prof.dist, height: prof.height } };
        }
        const last = wm.i >= n - 1;
        // 絵を つくる ための ものだけ(地面・みち・くぎりは えがかない)。ちかい じゅんに ならべ、n こ おきに くばる
        // (ちかくの 大きな 絵が 1 回に かたよらない)
        if (!wm.order && CORRIDOR_ARRIVAL.prepare === 'preload') { wm.order = world.props.slice().sort((a, b) => Math.hypot(a.x - wm.pose.player.x, a.z - wm.pose.player.z) - Math.hypot(b.x - wm.pose.player.x, b.z - wm.pose.player.z)); return; }   // Phase 4E-3: ならべる だけの frame
        if (!wm.order) wm.order = world.props.slice().sort((a, b) => Math.hypot(a.x - wm.pose.player.x, a.z - wm.pose.player.z) - Math.hypot(b.x - wm.pose.player.x, b.z - wm.pose.player.z));
        const part = Object.assign({}, world, { props: wm.order.filter((_, j) => j % n === wm.i), segments: [], marks: [], areas: [], shore: [], detail: [], spots: last ? world.spots : [] });
        warmR.draw({ regionId: world.regionId, world: part, residents: last ? world.residents : [], party: [], player: wm.pose.player, camera: wm.pose.cam, rig: wm.pose.cam,
          camFx: null, nearest: null, spot: null, zone: null, mood: MOOD_DEFAULT, env: sim.env, frame: 0, lifeDebug: false, lifeOf: () => null }, now);
        wm.i++; corrStats.warms++;
        if (wm.i >= n) c.warm = null;
      }
      // 出発 地域へ もどる(引き返した / 着く がわが 作れなかった)。地域は かわって いないので セーブも かわらない
      function backCorridor(c) {
        const w = c.walk, pose = w.backPose();
        w.restoreParty();
        sim.setPlayer(pose.x, pose.z);
        sim.player.heading = pose.heading;
        sim.camera.yaw = w.yawIn(c.g.from);
        corrStats.backs++;
        distantKey = null; syncDistant();
        endCorridor(c);
      }
      // 着いた: commit(地域を 書きかえる。ここ 1 か所)→ show(さいしょの え を 暗転の したで えがく)
      function arriveCorridor(c, now) {
        const w = c.walk, g = c.g, pose = w.exitPose();
        if (CORRIDOR_ARRIVAL.prepare === 'preload') preloadFinish(c);   // Phase 4E-3: 組みかけ なら のこりを 組む・つかえなければ すてる
        if (!c.prep && !c.prepFailed) prepareCorridor(c);           // まだ 組んで いなければ ここで('end' の しかた)
        const fail = () => {
          dropCorridorWorld(); corrFailed.add(g.id); corrStats.fails++;
          // とちゅうまで かわって いたら 出発 地域を 組みなおす(こわれた 地域の まま のこさない)
          if (sim.world.regionId !== g.from) { try { enterWorld(g.from, { at: g.spot.id, heading: w.backPose().heading, quiet: true }); } catch (_) { /* ここで とまらない */ } }
          return backCorridor(c);
        };
        if (c.prepFailed) return fail();
        const carry = { yaw: w.yawIn(g.to), bob: w.player.bob, phase: 0, speed: w.player.speed, moving: w.player.moving };
        const t0 = perfNow();
        try {
          enterWorld(g.to, { at: pose.spot, heading: pose.heading, carry, quiet: true });   // buildWorld は prepare の ものを 1 かい だけ つかう
        } catch (err) { return fail(); }
        if (c.pre.state === 'ready') { c.pre.state = 'committed'; corrStats.preload.commits++; corrStats.preload.last = { conn: g.id, to: g.to, startFrac: c.pre.startFrac, readyFrac: c.pre.readyFrac, buildMs: c.pre.buildMs, frames: c.pre.frames, steps: c.pre.steps, maxSliceMs: c.pre.maxSliceMs, marginMs: perfNow() - c.pre.readyAt, late: !!c.pre.late }; preloadLog(c, 'commit', { marginMs: Math.round(perfNow() - c.pre.readyAt) }); }   // Phase 4E-3
        c.pre.registry = c.pre.opts = null;   // Phase 4E-3
        const r = typeof S.enterRegionByMove === 'function' ? S.enterRegionByMove(g.to, { by: 'walk' }) : { ok: false };
        sim.setPlayer(pose.x, pose.z);
        // なかまは 1 くみ だけ(あたらしい 地域の なかま)。いつもの ならび(partyFormationSlots)で じぶんの うしろに おく
        sim.placeParty();   // なかまは いまの ならびの ばしょへ(1 列に もどさない)
        corrStats.lastCommitMs = corrStats.lastBuildMs = perfNow() - t0;
        // show: 着いた 地域の さいしょの え(いちばん おもい)は 暗転しきった この frame で えがく
        const t1 = perfNow();
        // Phase 4E-3: とちゅうで 組んで 絵の したくも すんで いれば、暗転の したで 1 まい えがいて おく ひつようは ない
        // (さいしょに 見える え が もう おもく ない)。暗転の まま 1 frame はやく あけはじめる
        const warmed = c.pre.state === 'committed' && !c.warm;
        if (!warmed) renderer.draw(sim.view(), now);
        drawCorridorCover(1, g.to);
        corrStats.lastFirstDrawMs = warmed ? 0 : perfNow() - t1; corrStats.hiddenDraw = !warmed;
        corrStats.arrives++;
        endCorridor(c);
        corrFade.start = perfNow();   // あけるのは この おもい frame の おわりから(つぎの frame で もう すこし あかるく)
        if (r && r.first) { showBanner(`はじめての ${plainLabel(g.to)}`, 2000); sfx('pop'); foundQueue = foundQueue.filter((q) => q.kind === 'link'); }
        else showBanner(plainLabel(g.to), 900);
      }
      function stepCorridor(dt, now) {
        const c = corr, w = c.walk;
        c.t += dt;
        if (c.phase === 'in') {
          // まだ 出発 地域が 見えて いる。ほんの すこし くらく して から corridor へ
          c.cover = Math.min(1, c.t / CORRIDOR_COVER.fadeIn);
          if (corridorCoverSkip(c.cover)) { c.skipDraw = true; corrStats.coverSkips++; } else renderer.draw(sim.view(), now);
          if (c.t >= CORRIDOR_COVER.fadeIn) { c.phase = 'walk'; c.t = 0; corridorDistant(); }
        } else if (c.phase === 'walk') {
          c.cover = Math.max(0, 1 - c.t / CORRIDOR_COVER.fadeOut);
          const ev = w.step(dt, pad.vector());
          const st = w.stage(), newStage = st.index !== c.stage;
          corridorDistant();
          // 終端の てまえ(あるいて fadeIn 秒の ぶん)から、s に あわせて くらく する。とまれば そのまま、もどれば また あかるく
          const L0 = w.spec.walkLength, D = Math.max(1, RULES.playerSpeed * w.state.speedMultiplier * CORRIDOR_COVER.fadeIn);
          const pre = Math.max(0, Math.min(1, (w.state.s - (L0 - D)) / D));
          if (pre > 0 && c.preStart == null) c.preStart = now; else if (pre <= 0) c.preStart = null;
          if (ev && ev.type === 'arrive' && pre >= 0.5) {           // もう くらい: この frame で 着く(暗転の まま とまる frame を つくらない)
            c.coverStart = c.preStart != null ? c.preStart : now; c.phase = 'out';
            return arriveCorridor(c, now);
          }
          if (corridorCoverSkip(Math.max(c.cover, pre))) { c.skipDraw = true; corrStats.coverSkips++; } else renderer.draw(w.view(), now);
          // 段の なまえは え を えがいた あとで かえる(DOM を かえてから canvas に 字を えがくと、その frame で スタイルの 計算が はしる)
          if (newStage) { c.stage = st.index; hintEl.textContent = `【${st.label}】${plainLabel(c.g.to)}の ほうへ`; lastHint = null; }
          if (pre > 0) c.cover = Math.max(c.cover, pre);
          if (ev) { c.phase = ev.type === 'arrive' ? 'out' : 'back'; c.t = 0; c.coverStart = now; if (ev.type === 'back') discardCorridor(c); }
          else {
            const L = w.spec.walkLength, s = w.state.s;
            // 引き返したら 組んだ ものを すてる。終端の てまえに 来たら 組む(え を 出した あとで。セーブは さわらない)
            if (CORRIDOR_ARRIVAL.prepare === 'preload') {   // Phase 4E-3: とちゅうから わけて 組む。もどったら すてる
              const act = corridorPreloadAction(c.pre.state, L - s);   // Phase 4E-4A: のこり きょり
              if (act === 'abort') discardCorridor(c); else if (act === 'start') preloadStart(c);
              if (c.pre.state === 'preparing') preloadStep(c); else if (c.warm) warmCorridor(c, now);
            } else if (c.prep && s < L * (1 - CORRIDOR_ARRIVAL.dropBehind)) discardCorridor(c);
            else if (CORRIDOR_ARRIVAL.prepare === 'ahead' && !c.prep && !c.prepFailed && s >= L * (1 - CORRIDOR_ARRIVAL.prepareAhead)) {
              drawCorridorCover(c.skipDraw ? 1 : c.cover, c.g.from); c.skipDraw = false; prepareCorridor(c); return;
            } else if (c.warm) warmCorridor(c, now);
          }
        } else {
          // 暗転は じっさいの じかんで(おもい frame が あっても のびない)
          c.cover = Math.min(1, (now - c.coverStart) / (CORRIDOR_COVER.fadeIn * 1000));
          if (c.cover >= 1) { if (c.phase === 'out') arriveCorridor(c, now); else backCorridor(c); return; }
          if (corridorCoverSkip(c.cover)) { corrStats.coverSkips++; drawCorridorCover(1, c.phase === 'out' ? c.g.to : c.g.from); }
          else { renderer.draw(w.view(), now); drawCorridorCover(c.cover, c.phase === 'out' ? c.g.to : c.g.from); }
          if (c.phase === 'out' && CORRIDOR_ARRIVAL.prepare === 'cover') prepareCorridor(c);   // え を 出して から 組む
          return;
        }
        drawCorridorCover(c.skipDraw ? 1 : c.cover, c.phase === 'out' ? c.g.to : c.g.from); c.skipDraw = false;
        if (banner && now >= bannerUntil) { banner = null; bannerEl.classList.add('hidden'); }   // 入る まえの おびも いつもどおり きえる
      }
      // 着いた / もどった あとの 暗転の あけ(いつもの たんさくの え の うえに かさねる)。じっさいの じかんで 0.14 秒
      function fadeCorridor(now, drawn) {
        const f = corrFade;
        if (f.start == null) f.start = now;
        const a = Math.max(0, 1 - (now - f.start) / (CORRIDOR_COVER.fadeOut * 1000));
        if (drawn) drawCorridorCover(a, f.to);   // えがかない フレームに かさねると こく なる
        if (a <= 0) { corrFade = null; if (f.coverStart != null) corrStats.lastCoverMs = now - f.coverStart; }
      }
      const corridorInfo = () => (corr ? { connectionId: corr.g.id, from: corr.g.from, to: corr.g.to, phase: corr.phase, cover: corr.cover,
        s: corr.walk.state.s, u: corr.walk.state.u, t: corr.walk.t, stage: corr.walk.stage().index, speedMultiplier: corr.walk.state.speedMultiplier,
        firstVisit: corr.walk.state.firstVisit, direction: corr.walk.state.direction, props: corr.walk.world.props.length, party: corr.walk.party.length,
        prepared: !!corr.prep, prepFailed: !!corr.prepFailed, preload: corr.pre.state, held: !!(corr.prep || corr.pre.it || corr.pre.registry || corridorHandoff), ui: { found: !!foundNow, act: act ? act.kind : null, hint: hintEl.textContent },
        cam: { x: corr.walk.camera.x, z: corr.walk.camera.z, yaw: corr.walk.camera.yaw, dist: corr.walk.camera.dist }, player: { x: corr.walk.player.x, z: corr.walk.player.z } } : null);
      // ====== /Phase 4E-2 ======
      function frameFn(now) {
        if (!running) return;
        if (last === null) last = now; const last0 = last; const dt = Math.min(0.05, (now - last) / 1000); last = now; frame++;
        const st = getState();
        // 「たび」などの オーバーレイが かぶさって いる あいだは、せかいを すすめない。
        // とじたら そのまま つづきから(ロックを のこさない)
        if (typeof S.menuOpen === 'function' && S.menuOpen()) { last = null; rafId = requestAnimationFrame(frameFn); return; }
        if (corr) { stepCorridor(dt, now); rafId = requestAnimationFrame(frameFn); return; } // Phase 4E-2
        if (trans) {
          // こえて いる あいだも せかいは すすむ。ゆびを はなして いても、こえる ちょくぜんの
          // むきへ すこし だけ あるきつづける ので「とまる → ワープ → また うごきだす」に ならない(§5)
          const live = pad.vector();
          const keep = trans.keep || { x: 0, y: 0 };
          const tail = trans.plan.total * 0.18;
          const glide = trans.t < trans.plan.total - tail ? 1 : Math.max(0, (trans.plan.total - trans.t) / tail);
          const input = trans.plan.way === 'walk'
            ? (live.x || live.y ? live : { x: keep.x * glide, y: keep.y * glide })
            : { x: 0, y: 0 };
          // こえて いる あいだの はっけんも きろくする。しらせは ためて おいて、
          // こえおわって から 1つずつ 出す(まえは ここで きえて いた §9)
          for (const ev of sim.step(dt, input)) {
            if (ev.type === 'gate') continue;                        // こえて いる あいだは つぎの 出口を 見ない
            if (ev.type === 'spot' && ev.first) noteSpotFound(ev.spot);
            else if (ev.type === 'zone' && ev.first) noteZoneFound(ev.zone);
            else if (ev.type === 'path') saveMapBits('paths', ev.key);
            else if (ev.type === 'mark' && ev.first) newMarks.push(ev.mark.mid);
          }
          flushMarks();
          stepTransition(dt);
          renderer.draw(sim.view(), now);
          if (trans) drawTransition(ctx2d, trans);
          rafId = requestAnimationFrame(frameFn);
          return;
        }
        if (st.regionId !== sim.world.regionId) enterWorld(st.regionId || 'home');
        if (frame % 30 === 0) { const nx = env(); const changed = nx.time !== sim.env.time || nx.weather !== sim.env.weather; sim.setEnv(nx); if (changed) hud(); }
        if (frame % 30 === 0) syncDistant(); // Phase 4D-2
        // Phase 4E-4A: あるける 出口に ちかづいたら corridor の 絵を さきに デコードし、おわったら 入口の したく(1 frame 1 くぎり)。
        // 着いた 暗転の あいだは しない(着いた がわの さいしょの frame と かさねない。着く ところは かえりの 出口の そば)
        if (corrFade) { /* あとで */ } // Phase 4E-2
        else if (frame % 10 === 5) predecodeNearGates(); // Phase 4E-2
        else entryPrepStep(now); // Phase 4E-2
        // ならびは あとから かわる(ヒントが 2行に なる・ブラウザの バーが 出入りする・
        // スポット名が つく)。ときどき はかり なおして、ずれて いたら 組みなおす
        // お しらせの おびが 出たり きえたり すると、canvas に つかえる たかさが かわる。
        // くらべるのは「さいごに 組んだ ときの 見つもり」との さ。H と くらべると、
        // createMgCanvas の うわぎりで H が 見つもりより 小さい ときに 組みなおし つづけて しまう。
        // ちぢめた ぶん(shrinkPx)を いれた 見つもり だけでは「ちぢんだ まま」に なる ので、
        // canvas いがいの たかさ そのもの(usedPx)も 見る
        if (frame % 30 === 15 && (Math.abs(availHeight() - lastWant) > 6 || Math.abs(usedPx() - lastUsed) > 6)) layoutCanvas();
        const events = sim.step(dt, pad.vector());
        for (const ev of events) {
          if (ev.type === 'met') { if (typeof S.recordMet === 'function') S.recordMet(ev.actor.key); hud(); }
          else if (ev.type === 'nearest') { /* context は まとめて 下で きめる */ }
          else if (ev.type === 'spot') { showSpot(ev.spot); if (ev.first) noteSpotFound(ev.spot); }
          else if (ev.type === 'zone' && ev.first) noteZoneFound(ev.zone);
          else if (ev.type === 'path') saveMapBits('paths', ev.key);
          else if (ev.type === 'mark' && ev.first) newMarks.push(ev.mark.mid);
          else if (ev.type === 'gate') beginTransition(ev.gate);
        }
        flushMarks();
        if (corr) { rafId = requestAnimationFrame(frameFn); return; }   // こえはじめた frame: ここから さきの しらせ・ボタン・ヒントは 出さない // Phase 4E-2
        // ちずに ふえた ことを、おおげさに しないで しらせる(「ちず」ボタンが すこし ひかる)
        if (mapAdded) { mapAdded = false; mapBtn.classList.add('mgr-map-new'); if (mapGlowTimer) clearTimeout(mapGlowTimer); mapGlowTimer = setTimeout(() => mapBtn.classList.remove('mgr-map-new'), 2400); }
        if (!sim.spot && sim.zone !== lastZone) { lastZone = sim.zone; showSpot(null); }
        // その ばの できごとを 1 枠に まとめる。のりばに 立って いる あいだ だけ
        // 「のる」/「もぐる」/「うかぶ」、住民が ちかい ときだけ「はなす」
        const ride = sim.gateHere ? sim.gateHere() : null;
        setAct(ride ? { kind: 'ride', label: ride.action || 'のる' }
          : sim.nearest ? { kind: 'talk', label: '💬 はなす' } : null);
        const nearest = sim.nearest;
        // ボタンの なまえだけ かわって「なにが おきるのか」わからない ままに しない。
        // のりばに 立って いる あいだは、gate の verb を そのまま した に 出す
        const hint = ride ? `【${(sim.spot && sim.spot.label) || ride.action}】${ride.verb || ride.action}`
          : nearest ? `${nearest.label}が ${VERBS[nearest.behavior] || 'いる'}` : sim.spot ? `【${sim.spot.label}】${sim.spot.secret ? 'ひみつの ばしょ。' : ''}${HINT_DEFAULT}` : sim.zone ? `【${sim.zone.label}】${HINT_DEFAULT}` : HINT_DEFAULT;
        if (hint !== lastHint) { lastHint = hint; hintEl.textContent = hint; }
        if (banner && now >= bannerUntil) { banner = null; bannerEl.classList.add('hidden'); }
        stepFound(now);
        frameEma += ((now - last0) / 1000 - frameEma) * 0.05;
        if (!halfRate && frameEma > 0.036) halfRate = true; else if (halfRate && tier < 2 && frameEma < 0.024) halfRate = false;
        if (!(halfRate && frame % 2 === 1)) renderer.draw(sim.view(), now);
        if (corrFade) fadeCorridor(now, !(halfRate && frame % 2 === 1)); // Phase 4E-2
        rafId = requestAnimationFrame(frameFn);
      }
      // region を こえる あいだ の え。ふだんの たんさくには 1つも 足さない
      // (trans が ある あいだ だけ よばれる)。かるい 図形だけで 組む。
      // **ここは え の がわ**。どの あいだに 何が おきるかは plan(正本)が きめて いて、
      // この かんすうは その 0〜1 を うけとって かたちに する だけ。Three.js では
      // ここ だけ 差しかえれば よい(音も ここでは 鳴らさない)
      // その 地域の「はっぱの おおさ」。え の つごう だけ の めやす(正本では ない)
      const FOLIAGE = { forest: 1, jungle: 1, mountain: 0.55, snow: 0.45, countryside: 0.35, river_lake: 0.3,
        home: 0.22, city: 0.08, desert: 0.06, sea: 0.1, deepsea: 0.2, star_stop: 0.05, memory_lake: 0.25 };
      const groundOf = (id) => ((WORLD_STYLE[id] || {}).edge || '#7a6a4a');
      const folOf = (id) => (FOLIAGE[id] != null ? FOLIAGE[id] : 0.3);
      const mixHex = (a, b, t) => { const c = hexToRgb(a), d = hexToRgb(b);
        return `${Math.round(c[0] + (d[0] - c[0]) * t)},${Math.round(c[1] + (d[1] - c[1]) * t)},${Math.round(c[2] + (d[2] - c[2]) * t)}`; };
      // のりもの(ゴンドラ・ふね)に のって いる めんめん。じぶん + いっしょに あるいて いる
      // なかま だけ。**住民は のせない**(住民の 地域あいだの 移動は べつの Phase)。
      // ここは なまの canvas なので、イラスト よう の しるし(私用領域)は 出さない
      const crewGlyphs = () => {
        let me = (typeof S.playerEmoji === 'function' && S.playerEmoji())
          || (typeof S.playerGlyph === 'function' && S.playerGlyph()) || '';
        if (!me || /[\uE000-\uF8FF]/.test(me)) me = '🐣';
        return [me].concat(sim.party.map((a) => a.emoji).filter(Boolean)).slice(0, 3);
      };
      function drawTransition(ctx, tr) {
        if (!ctx) return;
        const w = canvas.width, h = canvas.height, plan = tr.plan;
        const k = Math.max(0, Math.min(1, tr.t / plan.total));                    // ぜんたいの 0→1
        const hide = transitionCover(plan, tr.t);                                 // どれだけ かくして いるか(正本)
        const soft = plan.reduced;                                                // よいやすい せってい
        const dens = plan.density;                                                // 端末の おもさ
        ctx.save();
        // え の ちず(ctx)は ふだん dpr ばい。ここは canvas の じっさいの おおきさ
        // (device pixel)で 組むので、save の あとで いちど もどす。もどさない と
        // かご や ロープが がめんの そとへ 出て しまう(restore で もとへ もどる)
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (plan.way === 'walk') {
          // ① じめんと 光: 出発がわの いろ → 到着がわの いろ へ ゆっくり かわる
          ctx.fillStyle = `rgba(${mixHex(groundOf(plan.from), groundOf(plan.to), k)},${Math.min(1, 1.12 * hide)})`;
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = `rgba(16,14,11,${0.5 * hide})`; ctx.fillRect(0, 0, w, h);
          // ② きりの おび(まんなかの たかさ)。こえて いる あいだ だけ
          if (!soft && hide > 0.1) {
            const g = ctx.createLinearGradient(0, h * 0.34, 0, h * 0.72);
            g.addColorStop(0, 'rgba(226,230,226,0)');
            g.addColorStop(0.5, `rgba(226,230,226,${0.16 * hide})`);
            g.addColorStop(1, 'rgba(226,230,226,0)');
            ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
          }
          // ③ はっぱ: 「きが ふえる / へる」を つぶの かずで。もりへ 行くほど ふえる
          const fol = folOf(plan.from) + (folOf(plan.to) - folOf(plan.from)) * k;
          const leaves = soft ? 0 : Math.round(30 * fol * dens);
          if (leaves && hide > 0.08) {
            ctx.fillStyle = `rgba(${mixHex('#6f9a4a', '#3f6a33', k)},${0.5 * hide})`;
            for (let i = 0; i < leaves; i++) {
              const lx = ((hrand('mgleaf:' + i) + k * (0.2 + hrand('mgleaf2:' + i) * 0.5)) % 1) * w;
              const ly = ((hrand('mgleaf3:' + i) + k * (0.55 + hrand('mgleaf4:' + i) * 0.7)) % 1) * h;
              const r = 2 + hrand('mgleaf5:' + i) * 3.4;
              ctx.beginPath(); ctx.ellipse(lx, ly, r * 1.7, r, hrand('mgleaf6:' + i) * TAU, 0, TAU); ctx.fill();
            }
          }
          // ④ さかいの けしき(ことば)。plan.land は 正本がわの データ
          const land = plan.land || [];
          if (land.length && hide > 0.16) {
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const size = Math.max(13, Math.round(w * 0.046));
            ctx.font = `${size}px system-ui, -apple-system, sans-serif`;
            // ことばは **見えて いる あいだ**(settle の まえ)で ながれきる
            const kv = Math.min(1, tr.t / (plan.releaseAt || plan.total));
            land.forEach((t, i) => {
              const at = kv * (land.length + 0.6) - i;
              if (at < -0.5 || at > 1.5) return;
              ctx.globalAlpha = Math.min(1, hide * 1.2) * Math.max(0, 1 - Math.abs(at - 0.5) * 1.7);
              ctx.fillStyle = '#f3ead6';
              ctx.fillText(t, w / 2, h * 0.5 + (0.5 - at) * size * (soft ? 0.8 : 2.2));
            });
            ctx.globalAlpha = 1;
          }
        } else if (plan.way === 'sail') {
          // ---- ふねで 外洋を わたる。湾の なかでは なく **みなみにしの 外洋** を
          //      わたって いると わかる ように、①みなとが うしろへ しりぞく
          //      ②水平線だけに なる ③まえに しまかげが 出る ④かいがんが ちかづく
          //      の 4 つを、おなじ 1 まいの えの なかで じゅんばんに 見せる ----
          // ふねの あいだは ずっと 見えて いる。ただし「ついた」に なったら、
          // ふねの えは しまへ ゆずって きえる(0.55 の まま のこすと、ジャングルの
          // うえに ふねが うかんだ ままに 見える)
          const phSail = transitionPhaseAt(plan, tr.t);
          const cover = phSail && (phSail.id === 'arrive' || phSail.id === 'settle') ? hide : Math.max(hide, 0.55);
          if (cover <= 0.01) { ctx.restore(); return; }
          const hz = h * 0.46;                                                   // 水平線
          // ⓪ 下じき。cover の こさで 1 まい しく。こえて いる あいだ(cover = 1)は
          //    出発がわの せかいが 1 てんも すけない。これが ないと 住民の なまえが
          //    うみの うえに ゆうれいの ように のこる
          ctx.fillStyle = `rgba(150,196,220,${cover})`; ctx.fillRect(0, 0, w, h);
          // ① そら
          const gsky = ctx.createLinearGradient(0, 0, 0, hz);
          gsky.addColorStop(0, `rgba(126,176,214,${0.92 * cover})`);
          gsky.addColorStop(1, `rgba(208,232,240,${0.92 * cover})`);
          ctx.fillStyle = gsky; ctx.fillRect(0, 0, w, hz);
          // ② うみ。とおくは あさい あお、てまえは ふかい あお
          const gsea = ctx.createLinearGradient(0, hz, 0, h);
          gsea.addColorStop(0, `rgba(96,156,186,${0.94 * cover})`);
          gsea.addColorStop(1, `rgba(28,74,116,${0.96 * cover})`);
          ctx.fillStyle = gsea; ctx.fillRect(0, hz, w, h - hz);
          // ③ うしろの 陸(出発がわ)が しりぞく。しまを 出た ときは しまの かたち、
          //    ほんどを 出た ときは ながい かいがんせん
          const back = Math.max(0, 1 - k * 1.7);
          if (back > 0.02) {
            const bw = plan.isleFrom ? w * 0.30 : w * 1.25;
            const bh = hz * (plan.isleFrom ? 0.10 : 0.055) * back;
            ctx.fillStyle = `rgba(${mixHex(groundOf(plan.from), '#7ea6c0', 1 - back)},${(0.85 * back) * cover})`;
            ctx.beginPath(); ctx.moveTo(w * 0.5 - bw / 2, hz);
            ctx.quadraticCurveTo(w * 0.5, hz - bh * 2.2, w * 0.5 + bw / 2, hz);
            ctx.closePath(); ctx.fill();
          }
          // ④ まえの しま / ほんどが 見えて くる。ちかづくほど 大きく、水平線から せり上がる
          const front = Math.max(0, (k - 0.34) / 0.66);
          if (front > 0.01) {
            const fw = (plan.isleTo ? w * 0.34 : w * 1.3) * (0.5 + front * 1.5);
            const fh = hz * (plan.isleTo ? 0.16 : 0.09) * (0.35 + front * 2.4);
            const cx0 = w * 0.5;
            ctx.fillStyle = `rgba(${mixHex('#7ea6c0', groundOf(plan.to), Math.min(1, front * 1.5))},${Math.min(0.95, 0.35 + front) * cover})`;
            ctx.beginPath(); ctx.moveTo(cx0 - fw / 2, hz + fh * 0.12);
            ctx.quadraticCurveTo(cx0, hz - fh * 2.1, cx0 + fw / 2, hz + fh * 0.12);
            ctx.closePath(); ctx.fill();
            // こい もり。ちかづいてから だけ、つぶの かずも tier で へらす
            if (!soft && front > 0.3) {
              // 木は **しまの かたちの うえ**に おく。しまの りんかくは 2 じの きょくせん
              // なので、おなじ しきで たかさを もとめて、そこから すこし 下に 立たせる
              const trees = Math.round(11 * dens * Math.min(1, (front - 0.3) / 0.35));
              const edge = hz + fh * 0.12, ctrl = hz - fh * 2.1;
              ctx.fillStyle = `rgba(42,92,54,${0.9 * cover})`;
              for (let i = 0; i < trees; i++) {
                const u = 0.16 + hrand('mgisle:' + i) * 0.68;
                const tx = cx0 - fw / 2 + fw * u;
                const ridge = (1 - u) * (1 - u) * edge + 2 * u * (1 - u) * ctrl + u * u * edge;
                const ty = ridge + (edge - ridge) * (0.12 + hrand('mgisle2:' + i) * 0.5);
                const r = Math.max(3, fh * 0.13);
                ctx.beginPath(); ctx.moveTo(tx, ty - r * 1.4); ctx.lineTo(tx + r * 0.7, ty); ctx.lineTo(tx - r * 0.7, ty); ctx.closePath(); ctx.fill();
              }
            }
          }
          // ⑤ 水面の うねり。よこに ながれる ほそい すじ だけ(あわ・とり・さかなは 出さない)
          const lines = soft ? 3 : Math.round(9 * dens);
          ctx.strokeStyle = `rgba(226,244,255,${0.3 * cover})`; ctx.lineWidth = 1.6;
          for (let i = 0; i < lines; i++) {
            const t0 = (hrand('mgwave:' + i) + k * (0.5 + hrand('mgwave2:' + i) * 0.8)) % 1;
            const wy = hz + (h - hz) * (t0 * t0);                                // てまえほど はやく ながれる
            const ww = w * (0.12 + t0 * 0.5), wx = hrand('mgwave3:' + i) * w;
            ctx.globalAlpha = Math.min(1, t0 * 2.2) * 0.9;
            ctx.beginPath(); ctx.moveTo(wx - ww / 2, wy); ctx.lineTo(wx + ww / 2, wy); ctx.stroke();
          }
          ctx.globalAlpha = 1;
          // ⑥ ふね。ちいさな ふねの ふなべりと、のって いる じぶん・なかま。
          //    ゆれは よいやすい せっていでは とめて、よこの うごき と fade だけに する
          const bob = soft ? 0 : Math.sin(k * 11) * h * 0.007;
          const by = h * 0.86 + bob, bwid = Math.max(40, w * 0.36), bhgt = Math.max(14, w * 0.062);
          ctx.fillStyle = `rgba(112,84,56,${0.95 * cover})`;
          ctx.beginPath();
          ctx.moveTo(w * 0.5 - bwid / 2, by);
          ctx.quadraticCurveTo(w * 0.5, by + bhgt * 1.5, w * 0.5 + bwid / 2, by);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = `rgba(238,228,206,${0.95 * cover})`;
          ctx.fillRect(w * 0.5 - bwid / 2, by - bhgt * 0.26, bwid, bhgt * 0.3);
          // のって いる 1 たい ずつ。**おなじ なかまが 二どは 出ない**(party そのまま)
          const crew = crewGlyphs();
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.font = `${Math.max(12, Math.round(bwid * 0.17))}px system-ui, -apple-system, sans-serif`;
          ctx.fillStyle = '#fff';
          crew.forEach((e, i) => ctx.fillText(e, w * 0.5 + (i - (crew.length - 1) / 2) * bwid * 0.26, by - bhgt * 0.34));
          // ⑦ いまの けしきの ことば。正本(gate の land)を そのまま ながす
          const land = plan.land || [];
          if (land.length) {
            const kv = Math.min(1, tr.t / (plan.releaseAt || plan.total));
            const size = Math.max(12, Math.round(w * 0.042));
            ctx.font = `${size}px system-ui, -apple-system, sans-serif`;
            ctx.textBaseline = 'middle';
            land.forEach((t, i) => {
              const at = kv * (land.length + 0.5) - i;
              if (at < -0.5 || at > 1.5) return;
              ctx.globalAlpha = Math.min(1, cover * 1.2) * Math.max(0, 1 - Math.abs(at - 0.5) * 1.8);
              ctx.lineWidth = 3.2; ctx.strokeStyle = 'rgba(20,40,60,.55)';
              ctx.strokeText(t, w / 2, h * 0.31);
              ctx.fillStyle = '#f6f2e6'; ctx.fillText(t, w / 2, h * 0.31);
            });
            ctx.globalAlpha = 1;
          }
        } else {
          const up = plan.way === 'up';
          const sky = plan.layerFrom === 'sky' || plan.layerTo === 'sky';        // ゴンドラ か もぐる か
          const cover = Math.max(hide, 0.55);                                    // のりものの あいだは ずっと 見えて いる
          // ① そら / みず の いろ。のぼるほど くらい あお、もぐるほど ふかい あお
          const g1 = ctx.createLinearGradient(0, 0, 0, h);
          if (sky) {
            const t = up ? k : 1 - k;                                            // かえりは 逆に あかるく
            g1.addColorStop(0, `rgba(14,16,48,${(0.2 + 0.78 * t) * cover})`);
            g1.addColorStop(1, `rgba(120,160,205,${(0.15 + 0.6 * t) * cover})`);
          } else {
            const t = up ? 1 - k : k;                                            // うかぶ ときは あさく
            g1.addColorStop(0, `rgba(40,96,132,${(0.24 + 0.6 * (1 - t)) * cover})`);
            g1.addColorStop(1, `rgba(6,16,40,${(0.25 + 0.72 * t) * cover})`);
          }
          ctx.fillStyle = g1; ctx.fillRect(0, 0, w, h);
          // 入れかえの しゅんかん だけ、みじかく ぜんぶを おおう(すけない)
          if (hide > 0.985) { ctx.fillStyle = sky ? 'rgba(10,12,34,1)' : 'rgba(5,14,34,1)'; ctx.fillRect(0, 0, w, h); }
          if (sky) {
            // ② ほしが ふえる / へる
            const t = up ? k : 1 - k;
            const stars = Math.round(46 * t * dens);
            ctx.fillStyle = '#fff';
            for (let i = 0; i < stars; i++) {
              ctx.globalAlpha = (0.25 + hrand('mgstar3:' + i) * 0.7) * t;
              ctx.fillRect(hrand('mgstar:' + i) * w, hrand('mgstar2:' + i) * h * 0.72, 2, 2);
            }
            ctx.globalAlpha = 1;
            // ③ したの やま・たにが とおざかる / ちかづく
            if (!soft) {
              const hill = h * (up ? 0.86 + 0.34 * k : 1.2 - 0.34 * k);
              ctx.fillStyle = `rgba(28,44,38,${0.55 * (up ? 1 - k * 0.6 : 0.4 + k * 0.6)})`;
              ctx.beginPath(); ctx.moveTo(0, h);
              for (let i = 0; i <= 6; i++) ctx.lineTo((w / 6) * i, hill - Math.sin(i * 1.7) * h * 0.06);
              ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
            }
            // ④ かご。のぼる ときは 上へ、おりる ときは 下へ うごく
            const cy = h * (up ? 0.82 - 0.5 * k : 0.32 + 0.5 * k);
            const cx = w * 0.5, cw = Math.max(16, w * 0.075), ch = cw * 0.8;
            ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, cy - ch * 1.9 + w * 0.16); ctx.lineTo(w, cy - ch * 1.9 - w * 0.16); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx, cy - ch * 1.75); ctx.lineTo(cx, cy - ch); ctx.stroke();
            ctx.fillStyle = '#f0e6cc'; ctx.strokeStyle = 'rgba(40,34,24,.75)';
            ctx.beginPath(); ctx.rect(cx - cw / 2, cy - ch, cw, ch); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'rgba(150,200,235,.8)';
            ctx.fillRect(cx - cw * 0.32, cy - ch * 0.78, cw * 0.64, ch * 0.42);
            // ⑤ いっしょに のって いる なかま。**おなじ 1 たい**を かごの ところへ 出す だけ
            const crew = crewGlyphs();
            ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
            ctx.font = `${Math.max(10, Math.round(cw * 0.36))}px system-ui, -apple-system, sans-serif`;
            crew.forEach((e, i) => ctx.fillText(e, cx + (i - (crew.length - 1) / 2) * cw * 0.3, cy - ch * 0.12));
          } else {
            // ② みなもの ひかりが とおざかる / ちかづく
            const surf = up ? h * (1.05 - 0.75 * k) : h * (0.3 - 0.55 * k);
            const gs = ctx.createLinearGradient(0, surf - h * 0.3, 0, surf + h * 0.12);
            gs.addColorStop(0, 'rgba(196,232,255,0)');
            gs.addColorStop(0.7, `rgba(196,232,255,${0.42 * (up ? 0.25 + 0.75 * k : 1 - k * 0.85)})`);
            gs.addColorStop(1, 'rgba(196,232,255,0)');
            ctx.fillStyle = gs; ctx.fillRect(0, 0, w, h);
            // ③ あわ。もぐる ときは 上へ はやく ながれ、うかぶ ときは いっしょに 上がる
            const bubbles = Math.round((soft ? 8 : 26) * dens);
            ctx.strokeStyle = 'rgba(220,240,255,.7)'; ctx.lineWidth = 1.6;
            for (let i = 0; i < bubbles; i++) {
              const sp = (0.45 + hrand('mgbub2:' + i) * 0.9) * (up ? 0.5 : 1);
              const by = h - ((k * sp + hrand('mgbub3:' + i)) % 1) * h;
              ctx.globalAlpha = 0.25 + 0.5 * (1 - by / h);
              ctx.beginPath(); ctx.arc(hrand('mgbub:' + i) * w, by, 2 + hrand('mgbub4:' + i) * 5, 0, TAU); ctx.stroke();
            }
            ctx.globalAlpha = 1;
          }
          // ⑥ たかさ / ふかさ の めやす
          ctx.fillStyle = `rgba(255,255,255,${0.85 * Math.max(0.3, hide)})`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = `${Math.max(12, Math.round(w * 0.04))}px system-ui, -apple-system, sans-serif`;
          ctx.fillText(sky ? (up ? 'そらへ' : 'ちじょうへ') : (up ? 'みなもへ' : 'ふかく'), w / 2, h * (up ? 0.16 : 0.86));
        }
        ctx.restore();
      }

      function talk() {
        const r = sim.talk();
        if (!r) return;
        sfx('pop');
        if (typeof S.recordTalk === 'function') S.recordTalk(r.actor.key);
      }
      actBtn.addEventListener('click', () => {
        if (!act || trans) return;
        if (act.kind === 'talk') return talk();
        const g = sim.gateHere ? sim.gateHere() : null;
        if (g) beginTransition(g);
      });
      // ちず: たんさくの ループを とめて かぶせる。とじると おなじ ばしょから つづき。
      // ひらいて いる あいだ は draw() を よばない ので、たんさくの え には なにも 足さない
      let mapScreen = null;
      function openMap() {
        if (mapScreen || !running) return;
        mapBtn.classList.remove('mgr-map-new');
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        last = null;
        sfx('open');
        mapScreen = openMapScreen(container, sim, {
          title: () => `${plainLabel(sim.world.regionId)}の ちず`,
          world: worldRecord,
          onClose: () => { mapScreen = null; if (running) { last = null; layoutCanvas(); rafId = requestAnimationFrame(frameFn); } },
        });
      }
      mapBtn.addEventListener('click', openMap);
      travelBtn.addEventListener('click', () => { if (trans) return; if (typeof S.openTravel === 'function') S.openTravel(); });
      homeBtn.addEventListener('click', () => stop());
      function stop() {
        if (!running) return; running = false; if (rafId) cancelAnimationFrame(rafId);
        if (corr) preloadAbort(corr, 'stop'); // Phase 4E-2
        dropCorridorWorld(); // Phase 4E-2
        if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') window.removeEventListener('resize', onResize);
        if (typeof window !== 'undefined' && window.visualViewport && typeof window.visualViewport.removeEventListener === 'function') window.visualViewport.removeEventListener('resize', onResize);
        if (resizeTimer) clearTimeout(resizeTimer);
        if (mapScreen) { mapScreen.close(); mapScreen = null; }
        if (mapGlowTimer) clearTimeout(mapGlowTimer);
        hideFound(); foundQueue.length = 0;
        pad.destroy(); renderer.destroy && renderer.destroy();
        if (container.classList) container.classList.remove('meguru-overlay');
        if (typeof S.onExit === 'function') S.onExit();
      }
      rafId = requestAnimationFrame(frameFn);
      // ならびの けんさ よう(テストと 実機の しらべ もの に つかう)
      const layoutInfo = () => ({ limit: overlayBottomLimitPx(), avail: overlayAvailPx(), over: overflowBelowPx(), shrink: shrinkPx, H, want: availHeight() });
      // はっけんの しらせ の じょうたい(しらべ もの よう)。え には つかわない
      const foundInfo = () => ({ now: foundNow ? { ...foundNow } : null, queue: foundQueue.map((q) => ({ ...q })), banner });
      // その ばしょを 見つけた とき しらせるか(しらべ もの よう)。え には つかわない
      const spotLevel = (id) => { const q = sim.world.spots.find((x) => x.id === id); return q ? spotDiscoveryLevel(q) : 0; };
      return { stop, layoutInfo, foundInfo, spotLevel, openMap, closeMap: () => { if (mapScreen) mapScreen.close(); }, get mapOpen() { return !!mapScreen; }, get mapScreen() { return mapScreen; }, get running() { return running; }, sim, renderer, get world() { return sim.world; }, get party() { return sim.party; }, get player() { return sim.player; }, talk, enterWorld, get nearest() { return sim.nearest; }, setPlayer(x, z) { sim.setPlayer(x, z); }, get canvasSize() { return { W, H }; }, get corridor() { return corridorInfo(); }, get corridorStats() { return corrStats; } };
    }

    return { computeMapData, WORLD_GEOGRAPHY, REGION_FRAME, REGION_LAYER_Y, FRAMED_REGIONS, hasFrame, regionFrame, toGlobal, toLocal, dirToGlobal, dirToLocal, yawToGlobal, yawToLocal, CORRIDOR_STAGE_LEN, CORRIDOR_WAY_FACTOR, worldCorridors, orientCorridor, corridorsFrom, corridorDirection, corridorGraph, findRegionRoute, compassLabel, DISTANT_KIND_OF, DISTANT_RULES, distantFeatures, distantRegistry, distantInView, visibleDistant, CORRIDOR_STAGE_WALK, CORRIDOR_TURN_SPREAD, corridorTurnSpread, CORRIDOR_WIDTH, CORRIDOR_TERRAIN_WIDTH, CORRIDOR_STATE_KEYS, walkCorridorSpecs, walkCorridorSpec, orientWalkCorridor, corridorHeadingAt, corridorStageAt, corridorMode, makeCorridorState, corridorEnterState, corridorExitPose, CONTINUOUS_WALK_ALLOWLIST, continuousWalkMode, corridorDistantBlend, CORRIDOR_COVER_SKIP, corridorCoverSkip, CORRIDOR_PRELOAD, CORRIDOR_PRELOAD_LEAD, CORRIDOR_PRELOAD_STATES, corridorPreloadAction, CORRIDOR_REGION_LOOK, CORRIDOR_REGION_TERRAIN, CORRIDOR_END_MIX, corridorStageLook, corridorSceneryEmojis, createCorridorWalk, worldMapPalette, worldMapLayout, drawWorldMap, WMAP_BOUNDS, worldMapSide, worldMapShape, worldTier1, worldCountable, worldMapData, seedWorldRegions, worldLinksFrom, WORLD_PROGRESS_WEIGHT, spotDiscoveryLevel, WORLDS, WORLD_STYLE, HABITAT, NORMAL_REGIONS, RULES, PATH_HALF, CAM_PROFILES, sampleGroundDetails, shoreX, SCENERY_FAUNA, isFaunaEmoji, sceneryPools, auditSceneryFauna, auditSceneryCharacters, characterEmojiMap, SCENERY_CHARACTER_ALLOW, SPOT_STATUE_ALLOW, SCENERY_LINES, moodAt, buildRegistry, auditRegistry, auditScenery, sceneryEmojis, EMOJI_MIST, emojiMistFactor, EMOJI_VARY, emojiVary, RIVERMIST_STOPS, buildWorld, buildWorldSteps, worldLayers, STRUCT_ROLE, AREA_ROLE, SPOT_PROP_STRUCT, RENDER_TUNING, OCCLUDER_BOX, OCCLUDER_LAYERS, SWAY_AMOUNT, companionsOf, partyFormationSlots, PARTY_LOD, partyLod, talkLine, updateActor, wantActivity, spotLife, routeTo, goalFor, stepDistant, lifeTraits, RESIDENT_EMOTIONS, LIFE, REGION_LIFE, SPOT_LIFE, TIME_LIFE, WEATHER_LIFE, createSimulation, createCanvasRenderer, start, pathKey, segKey, MARK_SIGHT, seedMapRecords, mapPalette, mapLayout, drawMap, openMapScreen, reachableSpots, pathSegments, nearestPath, onPath, facingOf, spriteFor, wrapAngle, COLLIDER, COLLIDER_ROLE, colliderOf, buildObstacles, buildCollisionGrid, collidersAt, resolveObstacles, collidesAt, penetrationAt, colliderPenetration, moveWithCollision, clampToWorld, standClear, STAND_CLEAR, setRandom, reenterDetail, TRANSITION, transitionPlan, transitionPhaseAt, transitionCover, wayBetween, regionGates, resolveGate, GATE_PICK };
  };
})();
