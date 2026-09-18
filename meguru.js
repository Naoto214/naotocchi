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
      home: { len: 2600, halfW: 1000, ground: ['#a9d98a', '#8fc574'], path: '#e5d5b0', props: ['🌸', '🪴', '🌼', '🏠', '🌷', '🪵'],
        zones: [Z('front', 'いえのまえ', { hero: ['house', 300], anim: 'glow' }), Z('back', 'うらにわ', { tint: '#9fd48a', frame: 'hedge', frameScale: 0.85, anim: 'leaves' }), Z('far', 'おおきなきのまわり', { light: 0.95, fog: 0.08, walls: 0.5, anim: 'leaves', open: 1.05 })],
        spots: [sp('gate', 'いえのまえ', 0, 250, 200, 'plaza', 1, { zone: 'front' }), sp('yard', 'にわ', 0, 780, 260, 'plaza', 7, { hub: true, prop: '🪴', zone: 'front' }), sp('house', 'おうちのよこ', -620, 1050, 170, 'rest', 3, { prop: '🏠', zone: 'front' }), sp('garden', 'はなばたけ', -700, 1600, 200, 'grove', 3, { prop: '🌷', zone: 'back' }), sp('lane', 'こみち', 0, 1300, 170, 'path', 1, { zone: 'back' }), sp('park', 'こうえん', 0, 1850, 260, 'plaza', 6, { prop: '🛝', zone: 'back' }), sp('shed', 'のきした', 620, 1050, 150, 'shelter', 3, { prop: '🛖', zone: 'front' }), sp('bench', 'ベンチ', 700, 1550, 150, 'rest', 3, { prop: '🪑', zone: 'back' }), sp('pond', 'ひみつのいけ', -420, 2150, 140, 'water', 1, { secret: true, prop: '💧', zone: 'far' }), sp('bigtree', 'おおきなき', 0, 2380, 200, 'edge', 2, { landmark: 'bigtree', cam: 'wide', zone: 'far' })],
        paths: [['gate', 'yard', 'wide'], ['yard', 'house'], ['house', 'garden'], ['yard', 'lane'], ['lane', 'park'], ['yard', 'shed'], ['shed', 'bench'], ['bench', 'park'], ['garden', 'park', 'narrow'], ['garden', 'pond', 'secret'], ['park', 'bigtree']] },
      // とかい: 街区型。じゅうじろ・ろじ・うらみち・こうえん・しょうてんがい
      city: { len: 3600, halfW: 1300, ground: ['#5d626f', '#474c59'], path: '#6e7482', props: ['🏢', '🏬', '🚦', '💡', '🌳', '🚕', '🏪', '🎡'],
        zones: [Z('station', 'えきまえ', { frameScale: 1.15, anim: 'neon', open: 1.03 }), Z('shopping', 'しょうてんがい', { tint: '#c9c0b0', frame: 'shopblock', frameScale: 0.72, anim: 'neon', lane: ['🏪', '🪧', '💡', '🚲', '🏮'] }), Z('park', 'こうえん', { tint: '#9fc98a', walls: 0.7, frame: 'parktree', field: ['🌳', '🌷', '🌼', '🪴'], anim: 'leaves' }), Z('back', 'ろじうら', { light: 0.86, tint: '#8f9299', walls: 1.3, frame: 'alleywall', anim: 'glow', open: 0.94, lane: ['🗑️', '🚧', '🚲', '💡'] }), Z('uptown', 'たかだい', { light: 1.02, fog: 0.05, walls: 0.8, anim: 'neon', open: 1.05 })],
        spots: [sp('station', 'えきまえ', 0, 250, 220, 'plaza', 3, { prop: '🚉', zone: 'station' }), sp('square', 'えきまえひろば', 0, 800, 280, 'plaza', 8, { hub: true, prop: '⛲', zone: 'station' }), sp('cross1', 'おおどおりのこうさてん', -700, 800, 170, 'path', 2, { prop: '🚦', zone: 'shopping' }), sp('cross2', 'こうさてん', 700, 800, 170, 'path', 2, { prop: '🚦', zone: 'park' }), sp('arcade', 'しょうてんがい', -700, 1400, 220, 'shop', 5, { prop: '🏪', zone: 'shopping' }), sp('bakery', 'パンやのまえ', -1200, 1400, 160, 'shop', 3, { prop: '🏬', zone: 'shopping' }), sp('alley', 'ろじうら', -1200, 2000, 150, 'path', 1, { zone: 'back' }), sp('cats', 'ねこのばしょ', -900, 2500, 140, 'rest', 1, { secret: true, prop: '🐾', zone: 'back' }), sp('park', 'こうえん', 700, 1400, 240, 'plaza', 4, { prop: '🌳', zone: 'park' }), sp('pond', 'こうえんのいけ', 1200, 1700, 180, 'water', 3, { zone: 'park' }), sp('cafe', 'カフェどおり', 0, 1400, 180, 'shelter', 4, { prop: '☕', zone: 'station' }), sp('cross3', 'さかのこうさてん', 0, 2000, 170, 'path', 2, { prop: '🚦', zone: 'uptown' }), sp('lookout', 'てんぼうひろば', 0, 2600, 240, 'edge', 3, { cam: 'wide', zone: 'uptown' }), sp('tower', 'とけいとう', 0, 3250, 220, 'edge', 2, { landmark: 'tower', zone: 'uptown' }), sp('backlot', 'ビルのうら', 700, 2200, 150, 'path', 1, { zone: 'back' }), sp('rooftop', 'やねのうえ', 1250, 2700, 140, 'rest', 1, { secret: true, zone: 'back' }), sp('market', 'よいちのひろば', -500, 2900, 220, 'plaza', 4, { prop: '🏮', zone: 'uptown' })],
        paths: [['station', 'square', 'wide'], ['square', 'cross1', 'wide'], ['square', 'cross2', 'wide'], ['square', 'cafe'], ['cross1', 'arcade'], ['arcade', 'bakery'], ['bakery', 'alley', 'narrow'], ['alley', 'cats', 'secret'], ['cross2', 'park'], ['park', 'pond'], ['cafe', 'cross3'], ['cross3', 'lookout'], ['lookout', 'tower'], ['arcade', 'cross3', 'narrow'], ['park', 'backlot', 'narrow'], ['backlot', 'cross3', 'narrow'], ['backlot', 'rooftop', 'secret'], ['alley', 'market', 'narrow'], ['market', 'lookout'], ['pond', 'backlot', 'narrow']] },
      // いなか: ひろい へいめん型。みちは すくなく、とおくの ふうしゃ や いえが めじるし
      countryside: { len: 3800, halfW: 1600, ground: ['#b8d98a', '#8fbf6a'], path: '#d8c79a', props: ['🌳', '🌻', '🪵', '🚜', '🌳', '🌼', '🏚️', '🏡'],
        zones: [Z('village', 'むら', { frame: 'farmhouse', walls: 0.7, anim: 'leaves' }), Z('fields', 'はたけ', { tint: '#c9c77a', walls: 0.8, frame: 'cropline', field: ['🌾', '🌾', '🌻'], anim: 'leaves', open: 1.04 }), Z('meadow', 'そうげん', { tint: '#a9d98a', walls: 0.35, light: 1.04, field: ['🌼', '🌱', '🌼'], anim: 'leaves', open: 1.06 }), Z('hill', 'おか', { light: 1.05, walls: 0.4, field: ['🌻', '🌻', '🌼'], anim: 'leaves', open: 1.06 }), Z('far', 'むらのはずれ', { fog: 0.1, walls: 0.5, anim: 'mist', open: 1.08 })],
        spots: [sp('gate', 'むらのいりぐち', 0, 250, 200, 'plaza', 1, { zone: 'village' }), sp('village', 'むらのひろば', 0, 850, 280, 'plaza', 7, { hub: true, prop: '🏡', zone: 'village' }), sp('field1', 'はたけ', -900, 1100, 220, 'grove', 3, { prop: '🌾', zone: 'fields' }), sp('field2', 'ひろいはたけ', -1400, 1700, 240, 'grove', 2, { prop: '🌾', zone: 'fields' }), sp('scarecrow', 'かかしのみち', -800, 2000, 170, 'path', 1, { prop: '🪧', zone: 'fields' }), sp('windmill', 'ふうしゃ', -1300, 2700, 180, 'edge', 2, { landmark: 'windmill', zone: 'far' }), sp('meadow', 'そうげん', 900, 1200, 260, 'plaza', 3, { zone: 'meadow' }), sp('pasture', 'ぼくじょう', 1400, 1800, 220, 'grove', 3, { prop: '🪧', zone: 'meadow' }), sp('barn', 'なや', 700, 1900, 170, 'shelter', 3, { prop: '🏚️', zone: 'meadow' }), sp('road', 'あぜみち', 0, 1500, 170, 'path', 1, { zone: 'village' }), sp('hill', 'ひなたのおか', 0, 2300, 260, 'plaza', 5, { prop: '🌻', zone: 'hill' }), sp('shrine', 'ちいさなほこら', 600, 2800, 160, 'rest', 2, { prop: '⛩️', zone: 'hill' }), sp('oldtree', 'おおきなき', 0, 3400, 200, 'edge', 2, { landmark: 'bigtree', cam: 'wide', zone: 'far' }), sp('pond', 'かくれたためいけ', -1500, 3300, 140, 'water', 1, { secret: true, zone: 'far' }), sp('well', 'いど', -400, 2900, 160, 'rest', 2, { prop: '🏺', zone: 'far' })],
        paths: [['gate', 'village', 'wide'], ['village', 'field1'], ['field1', 'field2'], ['field2', 'windmill', 'narrow'], ['field1', 'scarecrow', 'narrow'], ['scarecrow', 'hill'], ['village', 'road'], ['road', 'hill'], ['village', 'meadow'], ['meadow', 'pasture'], ['meadow', 'barn'], ['barn', 'hill'], ['hill', 'shrine'], ['shrine', 'oldtree', 'narrow'], ['hill', 'well'], ['well', 'oldtree'], ['windmill', 'pond', 'secret'], ['windmill', 'well', 'narrow'], ['pasture', 'shrine', 'narrow']] },
      // もり: めいろ型。にた こだちが つづき、ふたまた・みつまた・ループ・ほそみち。おおきな き・たき・かわ・ひかる キノコが めじるし
      forest: { len: 4400, halfW: 1500, ground: ['#7fb26b', '#57894e'], path: '#b7a27a', props: ['🌲', '🌲', '🌳', '🍄', '🌿', '🌰', '🪵', '🍂'],
        zones: [Z('bright', 'あかるいもり', { light: 1.04, walls: 0.75, frameScale: 0.85, anim: 'leaves' }), Z('creek', 'おがわのあたり', { tint: '#7fb8a0', walls: 0.9, frameScale: 0.9, anim: 'water' }), Z('thicket', 'にたようなこだち', { light: 0.88, fog: 0.16, walls: 1.4, frameScale: 1.1, anim: 'leaves', open: 0.95 }), Z('mushroom', 'キノコのもり', { light: 0.8, fog: 0.24, tint: '#5f6f8f', walls: 0.55, frameScale: 0.8, marks: { color: '#9ad0ff', kind: 'sparkle' }, field: ['🍄', '🍄', '🌿'], hero: ['mushroomgrove', 300], anim: 'glow', lane: ['🍄', '🍄', '✨', '🌿'] }), Z('deep', 'ふかいもり', { light: 0.68, fog: 0.4, tint: '#3f5a40', walls: 1.5, frameScale: 1.25, anim: 'mist', open: 0.93, lane: ['🌿', '🪨', '🍄', '🌱'] }), Z('great', 'おおきなきのまわり', { light: 0.85, fog: 0.2, tint: '#5a7a4a', walls: 0.35, anim: 'leaves', open: 1.06 })],
        spots: [sp('entry', 'もりのいりぐち', 0, 250, 200, 'plaza', 1, { zone: 'bright' }), sp('bright1', 'あかるいこみち', 0, 750, 220, 'path', 2, { hub: true, zone: 'bright' }), sp('bright2', 'ひだまり', -500, 1100, 240, 'plaza', 5, { prop: '🪵', zone: 'bright' }), sp('bright3', 'きのねっこ', 520, 1150, 180, 'grove', 2, { zone: 'bright' }), sp('creek1', 'おがわ', -1050, 1500, 200, 'water', 4, { prop: '💧', zone: 'creek' }), sp('bridge1', 'まるたのはし', -950, 2000, 150, 'path', 1, { prop: '🌉', zone: 'creek' }), sp('bridge2', 'いしのはし', -300, 2400, 150, 'path', 1, { prop: '🌉', zone: 'creek' }), sp('creek2', 'おがわのふち', -1250, 2600, 180, 'water', 3, { zone: 'creek' }), sp('thicket1', 'にたようなこだち', 0, 1650, 150, 'path', 1, { zone: 'thicket' }), sp('thicket2', 'にたようなこだち', 400, 2100, 150, 'path', 1, { zone: 'thicket' }), sp('thicket3', 'まよいのわかれみち', -150, 2150, 150, 'path', 1, { zone: 'thicket' }), sp('fork', 'みつまた', 150, 2650, 200, 'plaza', 3, { prop: '🪧', zone: 'thicket' }), sp('hollow', 'きのうろ', 1000, 1750, 160, 'shelter', 3, { prop: '🌳', zone: 'thicket' }), sp('rest', 'きゅうけいばしょ', 1150, 2400, 160, 'rest', 3, { prop: '🪵', zone: 'thicket' }), sp('mush1', 'ひかるキノコ', -700, 3000, 220, 'grove', 4, { landmark: 'glowmushroom', zone: 'mushroom' }), sp('mush2', 'キノコのこみち', -1200, 3300, 170, 'grove', 2, { prop: '🍄', zone: 'mushroom' }), sp('deep1', 'ふかいもり', 300, 3200, 220, 'grove', 3, { zone: 'deep' }), sp('deep2', 'こけのいわ', 900, 3100, 160, 'rest', 2, { prop: '🪨', zone: 'deep' }), sp('oldsign', 'ふるいひょうしき', 600, 3650, 150, 'path', 1, { prop: '🪧', zone: 'deep' }), sp('great', 'おおきなき', 0, 4000, 240, 'edge', 3, { landmark: 'bigtree', cam: 'wide', zone: 'great' }), sp('falls', 'たき', -800, 3900, 200, 'water', 3, { landmark: 'waterfall', zone: 'great' }), sp('hiddenpond', 'かくれたいけ', -1400, 2100, 130, 'water', 1, { secret: true, zone: 'creek' }), sp('nook', 'こけむしたくぼみ', 1350, 3450, 130, 'rest', 1, { secret: true, zone: 'deep' })],
        paths: [['entry', 'bright1', 'wide'], ['bright1', 'bright2'], ['bright1', 'bright3'], ['bright1', 'thicket1'], ['bright2', 'creek1'], ['creek1', 'bridge1'], ['bridge1', 'thicket3', 'narrow'], ['bridge1', 'creek2', 'narrow'], ['creek2', 'mush2', 'narrow'], ['thicket1', 'thicket3', 'narrow'], ['thicket1', 'thicket2', 'narrow'], ['thicket3', 'fork', 'narrow'], ['thicket2', 'fork', 'narrow'], ['thicket2', 'thicket3', 'narrow'], ['bright3', 'hollow'], ['hollow', 'rest'], ['rest', 'thicket2', 'narrow'], ['fork', 'bridge2', 'narrow'], ['bridge2', 'mush1'], ['mush1', 'mush2', 'narrow'], ['fork', 'deep1'], ['deep1', 'deep2', 'narrow'], ['rest', 'deep2', 'narrow'], ['deep1', 'oldsign'], ['oldsign', 'great'], ['mush1', 'falls', 'narrow'], ['falls', 'great', 'narrow'], ['deep2', 'oldsign', 'narrow'], ['bridge1', 'hiddenpond', 'secret'], ['deep2', 'nook', 'secret']] },
      // やま: とざんどう型。ひだりみぎへ おおきく おりかえし、たかく なっていく
      mountain: { len: 4800, halfW: 1100, ground: ['#9a9585', '#736f60'], path: '#c2b79c', props: ['🌲', '🥾', '🏕️', '🪧', '🌲', '🥾', '🌲', '🪧'],
        zones: [Z('foot', 'ふもと', { tint: '#9fbf7a', frame: 'pinewall', walls: 0.9, anim: 'leaves' }), Z('lower', 'やまみち', { walls: 1.1, anim: 'leaves', open: 0.95 }), Z('middle', 'キャンプのあたり', { light: 0.98, tint: '#a9a88f', walls: 0.7, frame: 'pinewall', anim: 'leaves' }), Z('upper', 'おねのうえ', { light: 1.04, fog: 0.12, tint: '#b8bcae', walls: 0.75, frameScale: 1.15, anim: 'mist', open: 1.06, lane: ['🌼', '🥾', '🌼', '🥾'] }), Z('summit', 'ちょうじょう', { light: 1.08, fog: 0.22, tint: '#d0d3cc', walls: 0.3, frameScale: 0.9, anim: 'mist', open: 1.1 })],
        spots: [sp('foot', 'ふもと', 0, 250, 200, 'plaza', 1, { zone: 'foot' }), sp('trailhead', 'とざんぐち', 0, 800, 240, 'plaza', 4, { hub: true, prop: '🪧', zone: 'foot' }), sp('sw1', 'おりかえし', -800, 1300, 150, 'path', 1, { zone: 'lower' }), sp('sw2', 'おりかえし', 800, 1800, 150, 'path', 1, { zone: 'lower' }), sp('spring', 'おんせん', -900, 2100, 200, 'water', 4, { prop: '♨️', zone: 'lower' }), sp('camp', 'キャンプ', 0, 2400, 240, 'shelter', 5, { prop: '🏕️', zone: 'middle' }), sp('cliff', 'がけのうえ', 900, 2700, 170, 'edge', 2, { prop: '🪨', zone: 'middle' }), sp('cave', 'かくれたどうくつ', 1000, 3200, 150, 'shelter', 1, { secret: true, prop: '🕳️', zone: 'middle' }), sp('sw3', 'おりかえし', -800, 3000, 150, 'path', 1, { zone: 'upper' }), sp('lake', 'やまのみずうみ', -500, 3500, 180, 'water', 2, { zone: 'upper' }), sp('ridge', 'おね', 300, 3600, 220, 'plaza', 3, { prop: '🪨', zone: 'upper' }), sp('hut', 'やまごや', 700, 4000, 160, 'rest', 3, { prop: '🛖', zone: 'upper' }), sp('summit', 'ちょうじょう', 0, 4500, 220, 'edge', 3, { landmark: 'peak', cam: 'wide', zone: 'summit' }), sp('shrine', 'いしのほこら', -900, 4200, 140, 'rest', 1, { secret: true, zone: 'summit' })],
        paths: [['foot', 'trailhead', 'wide'], ['trailhead', 'sw1'], ['sw1', 'sw2'], ['sw2', 'camp'], ['sw1', 'spring', 'narrow'], ['spring', 'camp', 'narrow'], ['camp', 'cliff'], ['cliff', 'cave', 'secret'], ['camp', 'sw3'], ['sw3', 'lake'], ['lake', 'ridge', 'narrow'], ['sw3', 'ridge'], ['ridge', 'hut'], ['hut', 'summit'], ['ridge', 'summit', 'narrow'], ['lake', 'shrine', 'secret'], ['cliff', 'ridge', 'narrow']] },
      // ゆきぐに: せつげん型。ひろい ゆきはら + はやし + ロッジ + こおった みずうみ。あしあとの みち
      snow: { len: 3800, halfW: 1500, ground: ['#eef4fb', '#d3e0ee'], path: '#dfe7f0', props: ['❄️', '🪵', '🌲', '🧣', '🌲', '🛷', '🪵', '🌲'],
        zones: [Z('gate', 'ゆきのいりぐち', { anim: 'snow', open: 0.98 }), Z('field', 'ゆきはら', { light: 1.05, walls: 0.3, anim: 'snow', open: 1.07 }), Z('woods', 'まつばやし', { light: 0.9, fog: 0.12, walls: 1.4, frame: 'pinewall', field: ['🌲', '🌲', '🪵'], anim: 'leaves', open: 0.96 }), Z('lake', 'こおりのみずうみ', { tint: '#dbe9f5', walls: 0.35, fog: 0.08, anim: 'motes', open: 1.06 }), Z('peak', 'ゆきやまのふもと', { fog: 0.2, light: 1.02, walls: 0.7, frameScale: 1.35, anim: 'snow' })],
        spots: [sp('gate', 'ゆきのいりぐち', 0, 250, 200, 'plaza', 1, { zone: 'gate' }), sp('field', 'ゆきはら', 0, 850, 300, 'plaza', 7, { hub: true, prop: '🛷', zone: 'field' }), sp('lodge', 'ロッジ', -900, 1100, 200, 'rest', 5, { landmark: 'lodge', zone: 'field' }), sp('snowman', 'ゆきだるまのおか', 900, 1200, 220, 'plaza', 3, { prop: '🧣', zone: 'field' }), sp('pines', 'まつばやし', 1300, 1900, 200, 'grove', 3, { prop: '🌲', zone: 'woods' }), sp('cave', 'ゆきのどうくつ', 1400, 2600, 150, 'shelter', 1, { secret: true, prop: '🕳️', zone: 'woods' }), sp('tracks', 'あしあとのみち', -500, 1700, 150, 'path', 1, { zone: 'field' }), sp('icelake', 'こおりのみずうみ', -1100, 2200, 240, 'water', 3, { prop: '🧊', zone: 'lake' }), sp('fishing', 'こおりのつりば', -1400, 2900, 160, 'water', 2, { prop: '🎣', zone: 'lake' }), sp('igloo', 'かまくら', -400, 2700, 160, 'shelter', 2, { prop: '🛖', zone: 'lake' }), sp('slope', 'げれんで', 500, 2400, 200, 'path', 2, { prop: '🎿', zone: 'peak' }), sp('lift', 'リフトのりば', 900, 3100, 160, 'rest', 2, { prop: '🎿', zone: 'peak' }), sp('peak', 'ゆきやま', 0, 3450, 220, 'edge', 2, { landmark: 'peak', cam: 'wide', zone: 'peak' }), sp('sled', 'そりのさか', 300, 1500, 150, 'path', 1, { prop: '🛷', zone: 'field' })],
        paths: [['gate', 'field', 'wide'], ['field', 'lodge'], ['lodge', 'icelake'], ['icelake', 'fishing', 'narrow'], ['icelake', 'igloo'], ['igloo', 'peak', 'narrow'], ['field', 'tracks', 'narrow'], ['tracks', 'igloo', 'narrow'], ['field', 'snowman'], ['snowman', 'pines'], ['pines', 'cave', 'secret'], ['pines', 'slope', 'narrow'], ['field', 'sled'], ['sled', 'slope'], ['slope', 'lift'], ['lift', 'peak'], ['slope', 'peak', 'narrow'], ['snowman', 'sled', 'narrow']] },
      // うみ: かいがんせん型。みぎへ ひだりへ わんきょくして すすみ、みさき・いりえ・さんばし・いわばへ
      sea: { len: 4000, halfW: 1500, ground: ['#f2e2b6', '#e2cf9a'], path: '#f7ecc9', props: ['🐚', '⛵', '🌴', '⛱️', '🌴', '🐚', '🌴', '⛱️'],
        zones: [Z('beach', 'すなはま', { light: 1.05, walls: 0.45, anim: 'water', open: 1.07 }), Z('tidepools', 'しおだまりのあたり', { tint: '#e8dcb0', walls: 0.6, hero: ['rockpool', 240], anim: 'water' }), Z('pier', 'さんばしのあたり', { walls: 0.45, anim: 'water', open: 1.04 }), Z('rocks', 'いわば', { tint: '#c8bfa8', walls: 1.1, frame: 'searock', field: ['🐚', '🐚', '🪸'], anim: 'water', lane: ['🐚', '🪸', '🐚', '⛱️'] }), Z('cape', 'みさき', { light: 1.02, fog: 0.15, walls: 0.8, frame: 'seacliff', frameScale: 1.2, anim: 'water', open: 1.06 })],
        spots: [sp('beach', 'すなはま', 340, 250, 240, 'plaza', 2, { zone: 'beach' }), sp('shore', 'なみうちぎわ', 340, 800, 300, 'plaza', 7, { hub: true, prop: '🌊', zone: 'beach' }), sp('tidepool', 'しおだまり', -20, 1000, 220, 'water', 4, { prop: '🪸', zone: 'tidepools' }), sp('cove', 'かくれたいりえ', -290, 1500, 140, 'water', 1, { secret: true, zone: 'tidepools' }), sp('shells', 'かいがらのはま', 25, 1600, 200, 'plaza', 2, { prop: '🐚', zone: 'tidepools' }), sp('pier', 'さんばし', 565, 1300, 200, 'path', 2, { prop: '⛵', zone: 'pier' }), sp('hut', 'うみのいえ', 475, 1900, 200, 'shelter', 4, { prop: '🏚️', zone: 'pier' }), sp('boats', 'ふねのふとう', 835, 1700, 170, 'rest', 2, { prop: '⛵', zone: 'pier' }), sp('rocks', 'いわば', 205, 2400, 220, 'grove', 2, { prop: '🪨', zone: 'rocks' }), sp('rockpool', 'いわばのしおだまり', -65, 2700, 180, 'water', 2, { zone: 'rocks' }), sp('cape', 'みさき', 520, 2900, 200, 'edge', 2, { zone: 'cape' }), sp('lighthouse', 'とうだい', 745, 3500, 220, 'edge', 2, { landmark: 'lighthouse', cam: 'wide', zone: 'cape' }), sp('cliffcave', 'がけのどうくつ', 160, 3400, 140, 'rest', 1, { secret: true, zone: 'cape' }), sp('dunes', 'すなおか', 880, 2400, 170, 'path', 1, { zone: 'cape' })],
        paths: [['beach', 'shore', 'wide'], ['shore', 'tidepool'], ['tidepool', 'cove', 'secret'], ['tidepool', 'shells'], ['shells', 'rocks', 'narrow'], ['shore', 'pier'], ['pier', 'hut'], ['pier', 'boats'], ['hut', 'rocks'], ['rocks', 'rockpool', 'narrow'], ['rocks', 'cape'], ['cape', 'lighthouse'], ['boats', 'dunes', 'narrow'], ['dunes', 'lighthouse', 'narrow'], ['rockpool', 'cliffcave', 'secret'], ['hut', 'cape', 'narrow']] },
      // しんかい: めいきゅう型。サンゴ・いわ・かいそうで しかいが せまく、どうくつ や かいこうへ えだわかれ
      deepsea: { len: 4000, halfW: 1300, ground: ['#1c4166', '#102743'], path: '#1c3c5e', props: ['🪸', '🌿', '🪸', '⚓', '🐚', '🌿', '🪸', '⚓'],
        zones: [Z('reef', 'サンゴのまち', { light: 1.05, field: ['🪸', '🪸', '🐚'], anim: 'motes' }), Z('kelp', 'こんぶのもり', { light: 0.8, fog: 0.25, walls: 1.5, tint: '#1e4a4a', frame: 'kelpwall', field: ['🌿', '🌿', '🫧'], anim: 'water', open: 0.95 }), Z('wreck', 'ちんぼつせんのあたり', { light: 0.85, walls: 1.0, tint: '#2c3f58', anim: 'glow' }), Z('glow', 'ひかるふかば', { light: 0.9, tint: '#274f7a', walls: 0.7, hero: ['glowgarden', 320], anim: 'glow', marks: { color: '#9fe8ff', kind: 'sparkle' } }), Z('trench', 'かいこう', { light: 0.6, fog: 0.4, tint: '#0d1c33', walls: 1.3, frameScale: 1.25, anim: 'motes', open: 1.04 })],
        spots: [sp('reef', 'サンゴのいりぐち', 0, 250, 240, 'water', 2, { zone: 'reef' }), sp('coralcity', 'サンゴのまち', 0, 800, 300, 'plaza', 7, { hub: true, landmark: 'coral', zone: 'reef' }), sp('kelp1', 'こんぶのもり', -900, 1100, 240, 'grove', 3, { prop: '🌿', zone: 'kelp' }), sp('kelp2', 'こんぶのおく', -1200, 1800, 200, 'grove', 2, { prop: '🌿', zone: 'kelp' }), sp('vent', 'あたたかいあな', -700, 2400, 200, 'rest', 3, { prop: '🫧', zone: 'kelp' }), sp('wreck', 'ちんぼつせん', 900, 1200, 220, 'shelter', 4, { prop: '⚓', zone: 'wreck' }), sp('cabin', 'せんちょうしつ', 1200, 1900, 170, 'rest', 2, { zone: 'wreck' }), sp('cavern', 'ふねのうらのどうくつ', 1300, 2600, 140, 'rest', 1, { secret: true, zone: 'wreck' }), sp('glow1', 'ひかるふかば', 0, 1500, 220, 'water', 3, { prop: '💡', zone: 'glow' }), sp('glow2', 'ひかりのにわ', 300, 2200, 220, 'water', 3, { prop: '💡', zone: 'glow' }), sp('anglers', 'ちょうちんのみち', -200, 2900, 170, 'path', 1, { zone: 'trench' }), sp('trench', 'かいこうのふち', 0, 3400, 220, 'water', 2, { zone: 'trench' }), sp('abyss', 'いちばんふかいところ', 0, 3900, 200, 'deep', 1, { zone: 'trench' }), sp('hotspring', 'かいていのおんせん', 800, 3200, 150, 'rest', 2, { secret: true, zone: 'trench' })],
        paths: [['reef', 'coralcity', 'wide'], ['coralcity', 'kelp1'], ['kelp1', 'kelp2', 'narrow'], ['kelp2', 'vent', 'narrow'], ['vent', 'anglers', 'narrow'], ['coralcity', 'wreck'], ['wreck', 'cabin'], ['cabin', 'cavern', 'secret'], ['cabin', 'glow2', 'narrow'], ['coralcity', 'glow1'], ['glow1', 'glow2'], ['glow2', 'anglers'], ['anglers', 'trench'], ['trench', 'abyss', 'narrow'], ['glow2', 'hotspring', 'secret'], ['kelp1', 'glow1', 'narrow']] },
      // かわ・みずうみ: みずべ ついじゅう型。かわに そって あるき、はしで りょうぎしを いききし、みずうみで ひらける
      river_lake: { len: 4000, halfW: 1300, ground: ['#a9d38d', '#82b46f'], path: '#d3c39a', props: ['🌿', '🪷', '🎣', '🌳', '🪷', '🌳', '🌿', '🎣'],
        zones: [Z('bank', 'かわぎし', { walls: 0.8, anim: 'water' }), Z('bridge', 'はしのあたり', { tint: '#9fc98a', walls: 0.9, anim: 'water' }), Z('lake', 'みずうみのほとり', { light: 1.05, tint: '#b9dcb0', walls: 0.35, fog: 0.08, field: ['🪷', '🌿', '🪷'], anim: 'water', open: 1.06 })],
        spots: [sp('bank', 'かわぎし', 0, 250, 200, 'plaza', 1, { zone: 'bank' }), sp('riverside', 'かわぎしのひろば', 0, 800, 280, 'plaza', 6, { hub: true, zone: 'bank' }), sp('river1', 'かわ', -600, 1000, 220, 'water', 4, { prop: '💧', zone: 'bank' }), sp('bridge1', 'きのはし', -500, 1500, 160, 'path', 2, { prop: '🌉', zone: 'bridge' }), sp('leftbank', 'ひだりぎし', -1000, 1900, 150, 'path', 1, { zone: 'bridge' }), sp('bridge2', 'おおきなはし', 0, 2200, 200, 'path', 2, { landmark: 'bridge', zone: 'bridge' }), sp('rightpath', 'みぎぎしのみち', 600, 1500, 150, 'path', 1, { zone: 'bank' }), sp('reeds', 'あしはら', 900, 2000, 220, 'grove', 2, { prop: '🌾', zone: 'bridge' }), sp('boathouse', 'ふねごや', 800, 2700, 170, 'shelter', 3, { prop: '🛖', zone: 'lake' }), sp('lake', 'みずうみ', -200, 3000, 300, 'water', 4, { prop: '🪷', zone: 'lake' }), sp('lakeshore', 'みずうみのはま', -900, 3200, 220, 'plaza', 3, { zone: 'lake' }), sp('islet', 'ちいさなしま', 0, 3700, 150, 'edge', 1, { secret: true, zone: 'lake' }), sp('spring', 'わきみず', -1200, 2600, 130, 'water', 1, { secret: true, zone: 'bridge' }), sp('fishing', 'つりのいわ', 500, 3400, 170, 'water', 2, { prop: '🎣', zone: 'lake' })],
        paths: [['bank', 'riverside', 'wide'], ['riverside', 'river1'], ['river1', 'bridge1'], ['bridge1', 'leftbank', 'narrow'], ['leftbank', 'bridge2', 'narrow'], ['leftbank', 'spring', 'secret'], ['riverside', 'rightpath'], ['rightpath', 'bridge1', 'narrow'], ['rightpath', 'reeds'], ['reeds', 'bridge2'], ['bridge2', 'lake'], ['reeds', 'boathouse'], ['boathouse', 'fishing', 'narrow'], ['fishing', 'lake', 'narrow'], ['lake', 'lakeshore'], ['lake', 'islet', 'secret']] },
      // ジャングル: もりより さらに みっしゅう。つる・たき・いせき・きょだいな しょくぶつ
      jungle: { len: 4400, halfW: 1500, ground: ['#5f9a58', '#3f7a45'], path: '#a08a5f', props: ['🌴', '🌺', '🪵', '🌿', '🍌', '🌱', '🌳', '🌴'],
        zones: [Z('entry', 'ジャングルのいりぐち', { light: 1.02, walls: 0.8, anim: 'leaves' }), Z('vines', 'つるのみち', { light: 0.82, fog: 0.2, walls: 1.5, frameScale: 1.1, anim: 'leaves', open: 0.93 }), Z('falls', 'たきのあたり', { tint: '#5a9a8a', fog: 0.15, walls: 0.7, anim: 'water', open: 1.04 }), Z('ruins', 'いせき', { tint: '#8a8a6a', walls: 0.9, frame: 'ruinwall', anim: 'leaves' }), Z('canopy', 'きのうえ', { light: 0.9, walls: 1.3, frameScale: 1.3, anim: 'leaves', open: 0.95 }), Z('deep', 'ふかいジャングル', { light: 0.66, fog: 0.42, tint: '#2f5a3a', walls: 1.6, frameScale: 1.2, anim: 'mist', open: 0.92, lane: ['🌺', '🌿', '🌿', '🪨'] })],
        spots: [sp('entry', 'ジャングルのいりぐち', 0, 250, 200, 'plaza', 1, { zone: 'entry' }), sp('clearing', 'ひらけたばしょ', 0, 800, 280, 'plaza', 6, { hub: true, prop: '🪵', zone: 'entry' }), sp('vines1', 'つるのみち', -800, 1200, 180, 'path', 1, { zone: 'vines' }), sp('vines2', 'つるのおく', -1200, 1900, 160, 'path', 1, { zone: 'vines' }), sp('falls', 'たき', -900, 2600, 220, 'water', 4, { landmark: 'waterfall', zone: 'falls' }), sp('behindfalls', 'たきのうら', -1400, 3000, 140, 'rest', 1, { secret: true, zone: 'falls' }), sp('canopy', 'おおきなきのした', 900, 1200, 200, 'shelter', 3, { prop: '🌳', zone: 'canopy' }), sp('nest', 'すのあたり', 1300, 1900, 170, 'rest', 2, { prop: '🪺', zone: 'canopy' }), sp('hanging', 'つりばし', 800, 2500, 150, 'path', 1, { prop: '🌉', zone: 'canopy' }), sp('ruins', 'いせき', 0, 1600, 240, 'plaza', 4, { prop: '🗿', zone: 'ruins' }), sp('steps', 'いせきのかいだん', 200, 2300, 160, 'path', 1, { zone: 'ruins' }), sp('temple', 'おおきないせき', 0, 3200, 240, 'edge', 3, { landmark: 'temple', cam: 'wide', zone: 'ruins' }), sp('deep1', 'ふかいジャングル', -300, 3800, 220, 'grove', 2, { zone: 'deep' }), sp('giantflower', 'きょだいなはな', 700, 3700, 200, 'grove', 2, { prop: '🌺', zone: 'deep' }), sp('hidden', 'いせきのちかしつ', 500, 3000, 140, 'rest', 1, { secret: true, zone: 'ruins' })],
        paths: [['entry', 'clearing', 'wide'], ['clearing', 'vines1'], ['vines1', 'vines2', 'narrow'], ['vines2', 'falls', 'narrow'], ['falls', 'behindfalls', 'secret'], ['falls', 'temple', 'narrow'], ['clearing', 'canopy'], ['canopy', 'nest'], ['nest', 'hanging', 'narrow'], ['hanging', 'temple', 'narrow'], ['clearing', 'ruins'], ['ruins', 'steps'], ['steps', 'temple'], ['steps', 'hidden', 'secret'], ['temple', 'deep1', 'narrow'], ['temple', 'giantflower', 'narrow'], ['deep1', 'giantflower', 'narrow'], ['vines1', 'ruins', 'narrow']] },
      // さばく: こうだい型。めじるしは すくなく、とおくに オアシスや いせきが みえる
      desert: { len: 4600, halfW: 1800, ground: ['#e9cf95', '#d2b271'], path: '#f1dfb0', props: ['🌵', '🏺', '🌵', '⛺', '🌴', '🌵', '🏺', '🌵'],
        zones: [Z('gate', 'さばくのいりぐち', { walls: 0.5, anim: 'sand', open: 1.02 }), Z('dunes', 'すなやま', { walls: 0.7, light: 1.06, frameScale: 1.05, anim: 'sand', open: 1.08 }), Z('oasis', 'オアシス', { tint: '#b8c98a', walls: 0.6, frame: 'palmgrove', hero: ['oasispool', 420], field: ['🌴', '🌴', '🏺'], anim: 'water' }), Z('tents', 'キャラバンのあたり', { walls: 0.45, anim: 'glow', open: 1.04 }), Z('ruins', 'いせき', { tint: '#d9c28a', walls: 0.8, frame: 'ruinwall', anim: 'sand', open: 0.96 }), Z('far', 'さばくのはて', { light: 1.08, fog: 0.25, walls: 0.3, anim: 'sand', open: 1.1 })],
        spots: [sp('gate', 'さばくのいりぐち', 0, 250, 200, 'plaza', 1, { zone: 'gate' }), sp('well', 'いどのひろば', 0, 850, 280, 'plaza', 6, { hub: true, prop: '🏺', zone: 'gate' }), sp('dune1', 'すなやま', -900, 1300, 200, 'path', 1, { zone: 'dunes' }), sp('dune2', 'おおきなすなやま', -1500, 2100, 220, 'path', 1, { zone: 'dunes' }), sp('oasis', 'オアシス', -1200, 3000, 260, 'water', 5, { landmark: 'palms', zone: 'oasis' }), sp('caravan', 'キャラバンのテント', 1000, 1300, 200, 'shelter', 4, { prop: '⛺', zone: 'tents' }), sp('camel', 'ラクダのみずば', 1600, 2000, 180, 'water', 2, { prop: '🪧', zone: 'tents' }), sp('cliff', 'がけのかげ', 1300, 2800, 170, 'rest', 2, { prop: '🪨', zone: 'tents' }), sp('spring', 'かくれたいずみ', 1700, 3500, 130, 'water', 1, { secret: true, zone: 'far' }), sp('ruins', 'いしのいせき', 0, 1900, 240, 'plaza', 3, { prop: '🏛️', zone: 'ruins' }), sp('pillars', 'はしらのみち', 200, 2700, 170, 'path', 1, { zone: 'ruins' }), sp('pyramid', 'おおきないせき', 0, 3600, 240, 'edge', 2, { landmark: 'temple', cam: 'wide', zone: 'far' }), sp('bones', 'ほねのおか', -500, 4100, 140, 'rest', 1, { secret: true, zone: 'far' }), sp('mirage', 'しんきろうのおか', 700, 4100, 170, 'edge', 1, { zone: 'far' })],
        paths: [['gate', 'well', 'wide'], ['well', 'dune1'], ['dune1', 'dune2', 'narrow'], ['dune2', 'oasis'], ['oasis', 'pyramid', 'narrow'], ['well', 'caravan'], ['caravan', 'camel'], ['camel', 'cliff'], ['cliff', 'spring', 'secret'], ['cliff', 'pyramid', 'narrow'], ['well', 'ruins'], ['ruins', 'pillars'], ['pillars', 'pyramid'], ['pyramid', 'bones', 'secret'], ['pyramid', 'mirage', 'narrow'], ['dune1', 'ruins', 'narrow'], ['caravan', 'ruins', 'narrow']] },
      // ほしぞらのていりゅうじょ: うきしま ネットワーク型。くもの みちで つながる ていりゅうじょぐん
      star_stop: { len: 4000, halfW: 1500, ground: ['#4a3f86', '#2b2460'], path: '#9d8ff0', props: ['🏮', '🔭', '🚏', '✨', '🏮', '✨', '🪑'],
        zones: [Z('stop', 'ていりゅうじょ', { walls: 0.6, anim: 'motes', open: 1.02 }), Z('west', 'にしのうきしま', { tint: '#4f4a96', hero: ['crystalgarden', 300], anim: 'glow', marks: { color: '#ffe9a8', kind: 'sparkle' } }), Z('east', 'ひがしのうきしま', { tint: '#3f3f80', frame: 'islandedge', frameScale: 1.2, anim: 'motes' }), Z('far', 'とおいていりゅうじょ', { light: 0.9, fog: 0.15, tint: '#2f2a66', walls: 0.5, anim: 'motes', open: 1.06 })],
        spots: [sp('stop', 'ていりゅうじょ', 0, 250, 240, 'plaza', 3, { landmark: 'bigstop', zone: 'stop' }), sp('platform', 'まちあいのひろば', 0, 850, 280, 'plaza', 6, { hub: true, prop: '🏮', zone: 'stop' }), sp('bench', 'ほしをみるベンチ', -800, 1200, 180, 'rest', 3, { prop: '🪑', zone: 'west' }), sp('isle1', 'ちいさなうきしま', 900, 1200, 200, 'grove', 2, { prop: '⭐', zone: 'east' }), sp('cloud1', 'くものみち', 0, 1500, 200, 'path', 2, { prop: '🏮', zone: 'stop' }), sp('isle2', 'ほしのはたけ', -1300, 1900, 220, 'grove', 3, { prop: '🌟', zone: 'west' }), sp('farisle', 'とおいうきしま', -700, 2500, 200, 'edge', 2, { prop: '🪐', zone: 'west' }), sp('secretview', 'ひみつのてんぼうだい', 1400, 1900, 160, 'edge', 1, { secret: true, prop: '🔭', cam: 'wide', zone: 'east' }), sp('isle3', 'ねむるうきしま', 900, 2400, 180, 'rest', 2, { prop: '🌙', zone: 'east' }), sp('stop2', 'つぎのていりゅうじょ', 0, 2400, 220, 'shelter', 4, { prop: '🚏', zone: 'far' }), sp('cloud2', 'ほしのかいだん', 300, 3100, 170, 'path', 1, { zone: 'far' }), sp('stop3', 'さいごのていりゅうじょ', -400, 3600, 220, 'plaza', 3, { prop: '🚏', zone: 'far' }), sp('edge', 'そらのはて', 600, 3800, 160, 'edge', 1, { zone: 'far' }), sp('comet', 'ながれぼしのおか', -1200, 3200, 140, 'edge', 1, { secret: true, zone: 'west' })],
        paths: [['stop', 'platform', 'wide'], ['platform', 'bench'], ['bench', 'isle2', 'narrow'], ['isle2', 'farisle', 'narrow'], ['farisle', 'stop2', 'narrow'], ['platform', 'cloud1'], ['cloud1', 'stop2'], ['platform', 'isle1'], ['isle1', 'secretview', 'secret'], ['isle1', 'isle3', 'narrow'], ['isle3', 'stop2', 'narrow'], ['stop2', 'cloud2'], ['cloud2', 'stop3'], ['cloud2', 'edge', 'narrow'], ['stop3', 'comet', 'secret'], ['farisle', 'stop3', 'narrow']] },
      // きおくのみずうみ: しずかな いっぽんみち + かくし ぶんき型。きりの なかを おくへ。ナオトの ばしょは かんたんには みつからない
      memory_lake: { len: 3600, halfW: 900, ground: ['#6f7a9a', '#53577a'], path: '#8b90b0', props: ['🌳', '🌿', '🕯️', '🌳', '🌿', '🕯️'],
        zones: [Z('shore', 'みずうみのほとり', { walls: 0.6, hero: ['bluetree', 380], anim: 'water', open: 1.04 }), Z('mist', 'きりのなか', { light: 0.85, fog: 0.35, walls: 1.3, anim: 'mist', open: 0.96 }), Z('deep', 'みずうみのおく', { light: 0.7, fog: 0.55, tint: '#3f4468', walls: 1.5, frameScale: 1.1, anim: 'glow', open: 0.94 })],
        spots: [sp('shore', 'みずうみのほとり', -160, 250, 240, 'plaza', 2, { hub: true, zone: 'shore' }), sp('willow', 'やなぎのした', -460, 800, 200, 'shelter', 3, { prop: '🌳', zone: 'shore' }), sp('water', 'しずかなみずも', 110, 1000, 260, 'water', 3, { prop: '💧', zone: 'shore' }), sp('path1', 'きりのこみち', -160, 1400, 180, 'path', 1, { prop: '🌫️', zone: 'mist' }), sp('stones', 'つみいし', -460, 1700, 170, 'rest', 2, { prop: '🪨', zone: 'mist' }), sp('lantern', 'ともしびのおか', 140, 1900, 160, 'rest', 1, { prop: '🕯️', zone: 'mist' }), sp('path2', 'きりのおく', -160, 2200, 170, 'path', 0, { zone: 'mist' }), sp('boat', 'ふるいこぶね', 200, 2700, 140, 'rest', 1, { secret: true, zone: 'deep' }), sp('deep', 'みずうみのおく', -160, 3200, 140, 'deep', 0, { secret: true, prop: '🕯️', cam: 'near', zone: 'deep' })],
        paths: [['shore', 'willow'], ['shore', 'water'], ['shore', 'path1'], ['willow', 'stones'], ['stones', 'path2', 'narrow'], ['water', 'lantern'], ['lantern', 'path1', 'narrow'], ['path1', 'path2'], ['path2', 'deep', 'secret'], ['lantern', 'boat', 'secret'], ['stones', 'deep', 'secret']] },
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
        detail: [['drift', '#ffffff', 2.6, 70, 180], ['sparkle', '#e8f4ff', 2.2, 9, 18], ['footprint', '#cfe0f0', 1, 20, 34], ['ice', '#bcd8ec', 0.9, 34, 70]],
        field: { pool: ['🌲', '🪵', '🌲', '🌲'], clusters: 10, per: [2, 4], spread: 190, size: [44, 90] },
        structs: [['igloo', 5, 'spot', 130], ['firewood', 9, 'path', 80], ['snowfence', 12, 'path', 90], ['icepillar', 20, 'field', 160]] },
      // うみ: かたがわが うみ。すなもん・ながれぎ・さんばし。ゆうがたは うみに ひかりの みち
      sea: { density: 0.75, view: 1.4, canopy: 'sunpath', terrain: { kind: 'coast', side: -1, at: 0.4 },
        detail: [['ripple', '#e6d4a8', 2.2, 90, 210], ['shell', '#fff6e0', 0.5, 9, 16], ['wet', '#d8c9a0', 0.8, 90, 190]],
        field: { pool: ['🐚', '🌴', '🐚', '⛱️'], clusters: 7, per: [2, 4], spread: 160, size: [26, 52] },
        structs: [['parasol', 7, 'spot', 110], ['pier', 2, 'spot', 300], ['driftwood', 14, 'field', 130], ['rockpool', 10, 'field', 130], ['bigrock', 14, 'field', 150]] },
      // しんかい: くらくて みとおしが きかない。ひかるものが とおくに みえる
      deepsea: { density: 1.3, view: 0.55, canopy: 'marine', terrain: { kind: 'chasm', half: 230, pts: [[820, -200], [700, 900], [900, 1800], [1150, 2600], [1000, 3500], [1100, 4400]] },
        detail: [['sand', '#3f6f9f', 2.4, 50, 120], ['glow', '#5ad8e8', 2.4, 8, 18], ['crack', '#0d1f38', 0.9, 50, 120]],
        field: { pool: ['🪸', '🫧', '🌿', '🐚'], clusters: 14, per: [2, 5], spread: 140, size: [30, 62] },
        structs: [['kelp', 16, 'field', 190], ['vent', 6, 'field', 130], ['wreck', 2, 'spot', 320], ['ruinpillar', 7, 'field', 200], ['glowcoral', 7, 'field', 110]] },
      // かわ・みずうみ: かわ そのものが ランドマーク。かわらの いし・あし・きの はし
      river_lake: { density: 1.0, view: 1.15, canopy: 'rivermist', terrain: { kind: 'river', half: 200, pts: [[-780, -200], [-640, 900], [-500, 1500], [-250, 1900], [0, 2250], [-120, 2700], [-220, 3050], [-60, 3600], [0, 4300]] },
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
      home: { clutter: 0.34, frame: ['hedge', 330, 260, 0.7], fore: ['fencerail', 2.0, 200], edge: ['hedge', 'planter'],
        ground: [['lawn', 8, [560, 460]], ['terrace', 4, [340, 260]], ['flowerbed', 6, [260, 170]]] },
      // とかい: 車道と 歩道の あいだを あるく。左右は ビルの かべ
      city: { clutter: 0.45, frame: ['building', 470, 580, 0.58], fore: ['guardpost', 2.6, 230], edge: ['building', 'building', 'shopfront'],
        ground: [['road', 9, [640, 520]], ['sidewalk', 8, [300, 420]], ['crossing', 4, [300, 210]], ['block', 6, [520, 420]]] },
      // いなか: 田んぼと 畑の あいだの あぜみち
      countryside: { clutter: 0.3, frame: ['woodfence', 420, 270, 0.52], fore: ['ricestalk', 2.2, 200], edge: ['farmhouse', 'hayroll', 'barn'],
        ground: [['paddy', 7, [760, 600]], ['cropfield', 7, [600, 460]]] },
      // もり: 木の あいだの ほそい みち。幹が 視界を せまくする
      forest: { clutter: 0.5, frame: ['bigtrunk', 520, 420, 0.46], fore: ['branch', 2.0, 200], edge: ['bigtrunk', 'bigtrunk', 'bigrock'],
        ground: [['undergrowth', 12, [520, 420]], ['mossbed', 8, [380, 300]]] },
      // やま: しゃめんの とざんどう。がけが 画面の はしを ふさぐ
      mountain: { clutter: 0.42, frame: ['cliffwall', 560, 340, 0.54], fore: ['ledgerock', 2.2, 220], edge: ['cliff', 'bigrock', 'pinewall'],
        ground: [['scree', 12, [560, 460]], ['ridge', 6, [700, 380]]] },
      // ゆきぐに: ひろい 雪原。木は ふやさず、雪の おうとつ と 凍った湖で
      snow: { clutter: 0.26, frame: ['snowbank', 460, 360, 0.54], fore: ['snowdrift', 1.6, 280], edge: ['snowbank', 'pinewall', 'icepillar'],
        ground: [['snowfield', 14, [880, 700]], ['frozen', 3, [660, 500]], ['snowwood', 5, [520, 400]]] },
      // うみ: 波打ちぎわに そって あるく。ひだりは うみ、みぎは 砂丘と ヤシ
      sea: { clutter: 0.3, frame: ['duneridge', 480, 420, 0.58], fore: ['palmfrond', 0.7, 110], edge: ['duneridge', 'searock', 'palmgrove'],
        ground: [['dunefield', 10, [560, 460]]], shore: [['wetsand', 150]] },
      // しんかい: かいこうの ふちを すすむ。りょうがわは 岩壁と サンゴの かべ
      deepsea: { clutter: 0.45, frame: ['reefwall', 520, 470, 0.64], fore: ['coralarm', 2.0, 170], edge: ['reefwall', 'kelpwall', 'reefwall'],
        ground: [['seabed', 10, [560, 460]], ['fissure', 7, [480, 320]], ['reefflat', 6, [420, 340]]] },
      // かわ: かわぞいの みち。かわが 画面を よこぎる
      river_lake: { clutter: 0.36, frame: ['riverwood', 480, 250, 0.56], fore: ['reedclump', 2.4, 220], edge: ['riverwood', 'riverwood', 'riverrock'],
        ground: [['gravelbar', 9, [520, 420]], ['wetgrass', 8, [460, 380]], ['shallow', 5, [420, 300]]] },
      // ジャングル: しょくぶつの なかに はいりこむ。道は 埋もれている
      jungle: { clutter: 0.5, frame: ['bigtrunk', 480, 440, 0.6], fore: ['hugeleaf', 1.4, 140], edge: ['bigtrunk', 'buttress', 'bigtrunk'],
        ground: [['undergrowth', 14, [460, 380]], ['mudflat', 7, [380, 300]], ['rootmat', 8, [420, 340]]] },
      // さばく: きょだいな すなおかを こえる。こものは ふやさない
      desert: { clutter: 0.18, frame: ['dunewall', 620, 520, 0.5], fore: ['sandcrest', 1.6, 380], edge: ['mesa', 'dunewall', 'bigrock'],
        ground: [['sandflat', 10, [900, 720]], ['rockflat', 5, [620, 460]]] },
      // ほしぞら: うきしまと うきしまの あいだ。あしもとが うかんで いる
      star_stop: { clutter: 0.3, frame: ['islandedge', 440, 400, 0.44], fore: ['cloudwisp', 1.6, 320], edge: ['crystal', 'islandedge', 'stoplamp'],
        ground: [['stonedeck', 9, [520, 420]], ['voidgap', 6, [620, 520]]] },
      // きおくのみずうみ: しずかな こはん。よはくを のこす
      memory_lake: { clutter: 0.22, frame: ['mistwood', 460, 300, 0.62], fore: ['lanternpost', 1.4, 240], edge: ['mistwood', 'bluetree', 'stonestack'],
        ground: [['wetstone', 10, [460, 380]], ['oldroad', 7, [300, 460]]] },
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
    // ---- Three.js の レンダラーから よむ ための「いみ」 ----
    // canvas は いろと かたちで えがくが、3D では「これは 地形か・たてものか・木か・水か・光か」で
    // メッシュを えらぶ。だから せかいの データ側で いみを もつ
    const STRUCT_ROLE = {
      building: 'building', shopfront: 'building', shopblock: 'building', alleywall: 'building', barn: 'building', farmhouse: 'building', house: 'building', igloo: 'building', tent: 'building', vending: 'building', ruingate: 'building', ruinwall: 'building', ruinpillar: 'building', obelisk: 'building', statue: 'building', telescope: 'building', woodbridge: 'building', ropebridge: 'building', lightbridge: 'building', pier: 'building', waterwheel: 'building', wreck: 'building',
      bigtrunk: 'vegetation', hedge: 'vegetation', riverwood: 'vegetation', mistwood: 'vegetation', bluetree: 'vegetation', parktree: 'vegetation', pinewall: 'vegetation', palmgrove: 'vegetation', cropline: 'vegetation', bigleaf: 'vegetation', vine: 'vegetation', fern: 'vegetation', reed: 'vegetation', reedclump: 'vegetation', kelp: 'vegetation', kelpwall: 'vegetation', crop: 'vegetation', mushroomcluster: 'vegetation', mushroomgrove: 'vegetation', hugeleaf: 'vegetation', palmfrond: 'vegetation', branch: 'vegetation', ricestalk: 'vegetation', stump: 'vegetation', log: 'vegetation', driftwood: 'vegetation', hayroll: 'vegetation', planter: 'vegetation', buttress: 'vegetation', coralfan: 'vegetation', coralarm: 'vegetation', glowgarden: 'vegetation',
      cliffwall: 'terrain', cliff: 'terrain', bigrock: 'terrain', ledgerock: 'terrain', mesa: 'terrain', dune: 'terrain', duneridge: 'terrain', dunewall: 'terrain', sandcrest: 'terrain', snowbank: 'terrain', snowdrift: 'terrain', reefwall: 'terrain', searock: 'terrain', seacliff: 'terrain', islandedge: 'terrain', riverrock: 'terrain', rockpool: 'terrain', icepillar: 'terrain', cairn: 'terrain', stonestack: 'terrain', shellpile: 'terrain', cloudwisp: 'terrain',
      springpool: 'water', oasispool: 'water',
      neonsign: 'light', streetlight: 'light', lantern: 'light', lanternpost: 'light', stoplamp: 'light', vent: 'light', crystal: 'light', crystalgarden: 'light', glowcoral: 'light', moonlamp: 'light', orrery: 'light',
      fence: 'obstacle', parasol: 'obstacle', woodfence: 'obstacle', snowfence: 'obstacle', guardrail: 'obstacle', guardpost: 'obstacle', fencerail: 'obstacle', crosswalk: 'road', firewood: 'obstacle', pot: 'obstacle', oldpost: 'obstacle',
    };
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
    const OCCLUDER_BOX = { glyph: [0.32, 0.95], landmark: [0.34, 1.0], bigtrunk: [0.16, 1.55], building: [0.40, 2.6], alleywall: [0.40, 2.6], shopblock: [0.40, 1.0], cliffwall: [0.60, 1.6], seacliff: [0.60, 1.7], cliff: [0.50, 1.05], searock: [0.62, 0.85], dunewall: [0.95, 0.9], duneridge: [0.95, 0.6], dune: [0.6, 0.35], sandcrest: [1.0, 0.3], snowbank: [0.9, 0.5], snowdrift: [0.7, 0.3], reefwall: [0.6, 1.9], kelpwall: [0.5, 1.9], hedge: [0.55, 0.55], pinewall: [0.5, 1.5], palmgrove: [0.5, 1.3], riverwood: [0.4, 1.0], mistwood: [0.35, 1.05], bluetree: [0.35, 1.0], parktree: [0.42, 1.0], farmhouse: [0.58, 1.05], house: [0.58, 1.05], barn: [0.48, 1.0], mesa: [0.5, 0.65], islandedge: [0.72, 0.2], ruinwall: [0.6, 0.78], ruinpillar: [0.16, 0.95], cropline: [0.9, 0.35], woodfence: [0.52, 0.45], bigleaf: [0.36, 0.6], hugeleaf: [0.62, 0.75], palmfrond: [0.4, 0.9], branch: [0.75, 0.95], vine: [0.1, 1.05], buttress: [0.5, 0.9], wreck: [0.55, 0.95], bigrock: [0.44, 0.5], ledgerock: [0.6, 0.42], fern: [0.26, 0.52], reedclump: [0.3, 0.7], reed: [0.2, 0.75], cloudwisp: [0.5, 0.2], ricestalk: [0.35, 0.58], crystal: [0.16, 0.85], icepillar: [0.18, 0.85] };
    const OCCLUDER_LAYERS = new Set(['wall', 'landmark', 'side', 'frame', 'fore', 'struct']);
    // かぜで ゆれる くさき。かず は「たかさの なんわり よこへ たおれるか」の もと。
    // みき は ほとんど ゆれず、あし や はっぱ は よく ゆれる
    const SWAY_AMOUNT = { bigtrunk: 0.35, hedge: 0.5, riverwood: 0.8, mistwood: 0.7, bluetree: 0.7, parktree: 0.8, pinewall: 0.45, palmgrove: 1.1, cropline: 1.0, bigleaf: 1.2, vine: 1.4, fern: 1.0, reed: 1.5, reedclump: 1.4, kelp: 1.6, kelpwall: 1.5, crop: 1.2, hugeleaf: 1.1, palmfrond: 1.3, branch: 0.5, ricestalk: 1.4, coralfan: 0.8, coralarm: 0.7, glowgarden: 0.5, mushroomcluster: 0.25, mushroomgrove: 0.2, planter: 0.6, hayroll: 0.2 };
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
        if (p.landmark) { L.landmark.push({ kind: p.landmark, x: p.x, z: p.z, size: p.size, label: p.label }); continue; }
        if (p.struct) { const role = STRUCT_ROLE[p.struct] || 'obstacle'; const item = { kind: p.struct, x: p.x, z: p.z, size: p.size, ang: p.ang || 0, side: p.side || 1, layer: p.layer, role }; (p.hero ? L.landmark : L[role]).push(item); if (p.solid && role !== 'obstacle') L.obstacle.push({ kind: p.struct, x: p.x, z: p.z, r: 44 }); continue; }
        if (p.emoji) L.scenery.push({ emoji: p.emoji, x: p.x, z: p.z, size: p.size, layer: p.layer });
      }
      for (const z of w.zones) L.light.push({ kind: 'zone', id: z.id, x: z.x, z: z.z, light: z.mood.light != null ? z.mood.light : 1, fog: z.mood.fog || 0, tint: z.mood.tint || null });
      // 地区(zone): あかるさ だけでなく「どんな うごきの ある ところか」まで もつ。
      // anim = はっぱ/ゆき/すな/もや/みず/ひかり/ネオン/つぶ、open = ひろさ(1 より おおきい ほど ひろい)。
      // 地区の さかいめ は「いちばん ちかい 地区の 中心」で きまる(reach: 'nearest')
      L.zoneReach = 'nearest';
      L.zone = w.zones.map((z) => ({ id: z.id, name: z.name, x: z.x, z: z.z,
        light: z.mood.light != null ? z.mood.light : 1, fog: z.mood.fog || 0, tint: z.mood.tint || null,
        walls: z.mood.walls != null ? z.mood.walls : 1, anim: z.mood.anim || null, open: z.mood.open || 1,
        frameKind: z.mood.frame || null, frameScale: z.mood.frameScale != null ? z.mood.frameScale : 1 }));
      // 空気と うごき: レンダラーが これだけで かぜ・そら・えんけい・てまえの そうを 組める
      L.env = { region: w.regionId, ground: w.ground, sky: w.sky, backdrop: w.backdrop, canopy: w.canopy,
        wind: w.wind, motion: w.motion, view: w.view, density: w.density, detail: w.detail, glowPath: !!w.glowPath };
      // カメラ: ばしょごとの りぐ(きょり・たかさ)と、ごく かるい えんしゅつ の つよさ。
      // Three.js でも おなじ すうじ を つかえば、おなじ 見えかたに なる
      L.camera = { profiles: CAM_PROFILES, motion: RULES.motion, spots: w.spots.map((sp) => { const k = sp.cam || (sp.secret ? 'secret' : sp.kind); return { id: sp.id, cam: CAM_PROFILES[k] ? k : 'default' }; }) };
      return L;
    }
    function buildWorld(regionId, registry, opts = {}) {
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
      // 地区(zone): スポットの まとまり。ちゅうしんは その 地区の スポットの へいきん。mood は みための きぶん
      world.zones = (base.zones || []).map((z) => { const ss = base.spots.filter((s) => s.zone === z.id); const n = ss.length || 1; return { id: z.id, label: z.label, mood: z.mood || {}, x: ss.reduce((a, s) => a + s.x, 0) / n, z: ss.reduce((a, s) => a + s.z, 0) / n, spots: ss.map((s) => s.id) }; });
      const zoneOfSpot = (sp0) => world.zones.find((z) => z.id === sp0.zone) || null;
      const zoneAt = (x, z) => { let best = null, bd = Infinity; for (const zn of world.zones) { const d = Math.hypot(zn.x - x, zn.z - z); if (d < bd) { bd = d; best = zn; } } return best; };
      const degree = (sp0) => (base.paths || []).filter(([a, b]) => a === sp0.id || b === sp0.id).length;
      const halfW = world.halfW;
      const nearSpot = (x, z, pad) => base.spots.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + (pad || 0));
      const propPool = local ? local.props.concat(base.props.slice(0, 3)) : base.props;
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
        world.props.push({ emoji: propPool[hash(seed) % propPool.length], x, z, size: 140 + hrand(seed + 'k') * 90, layer: 'side' });
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
        if (s.landmark) { world.props.push({ landmark: s.landmark, emoji: s.prop || '🌳', x: s.x, z: s.z + s.r * 0.9, size: 560, spot: true, solid: true, layer: 'landmark', label: s.label }); continue; }
        if (!s.prop) continue;
        const px0 = s.x + (s.x < 0 ? -s.r - 30 : s.r + 30) * (s.kind === 'deep' ? 0 : 1), pz0 = s.z + 30;
        if (Object.prototype.hasOwnProperty.call(SPOT_PROP_STRUCT, s.prop)) {
          const st = SPOT_PROP_STRUCT[s.prop]; if (!st) continue; // その 地域の 主役(うみ そのもの など)に まかせて おかない
          const kind = typeof st === 'function' ? st(regionId) : st;
          world.props.push({ struct: kind, x: px0, z: pz0, size: 210, ang: 0, side: s.x < 0 ? -1 : 1, region: regionId, spot: true, solid: true, layer: 'landmark' });
          continue;
        }
        // たてもの・おおきな もの は そのまま、しょくぶつ・こもの は ひとまわり ちいさく
        world.props.push({ emoji: s.prop, x: px0, z: pz0, size: SPOT_PROP_BIG.has(s.prop) ? 230 : 175, spot: true, solid: true, layer: 'landmark' });
      }
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
      // ---- じめんの おおきな くぎり(その 地域で「なにの うえを あるいているか」) ----
      // みちに そう もの(車道・歩道・かわら・古い道)と、みちの そとを うめる もの(田んぼ・畑・雪原・砂地)、
      // みずぎわに そう もの(濡れ砂・あさせ)で おきかたを かえる
      const ALONG_PATH = new Set(['road', 'sidewalk', 'crossing', 'oldroad', 'gravelbar', 'stonedeck', 'ridge', 'terrace']);
      const ALONG_SHORE = new Set(['wetsand', 'shallow', 'seagrass']);
      for (const [kind, count, [aw, ah]] of base.ground || []) {
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
      // ---- みちを かこむ おおきな もの(ビル・岩壁・大木…)。じぶんより ずっと おおきい ----
      if (base.frame) {
        const [fkind0, foff0, fsize, fprob] = base.frame, fkind = fkind0;
        // せまい 地域では そとに おしやりすぎない(せかいの はばの はんぶんまで)
        const foff = Math.min(foff0, world.halfW * 0.5);
        for (const sg of world.segments) {
          if (sg.kind === 'secret') continue;
          const n = Math.max(1, Math.round(sg.len / 380));
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
      // ---- 地区の 主役: その 地区で「なにを 見るか」を 1つ おく(キノコの 群れ・オアシスの 水・光の 庭…) ----
      for (const zn of world.zones) {
        if (!zn.mood.hero) continue;
        const [hk, hs] = zn.mood.hero;
        let placed = false;
        for (let k = 0; k < 24 && !placed; k++) {
          const seed = regionId + ':hero:' + zn.id + k, a = hrand(seed + 'a') * TAU, d = 140 + hrand(seed + 'd') * (260 + k * 12);
          const x = zn.x + Math.sin(a) * d, z = zn.z + Math.cos(a) * d * 0.7;
          if (!onLand(x, z) || inSpotCore(x, z) || !offPath(x, z, hs * 0.22)) continue;
          world.props.push({ struct: hk, x, z, size: hs, ang: 0, side: 1, region: regionId, layer: 'landmark', hero: true, solid: true });
          placed = true;
        }
      }
      // ---- てまえを よこぎる もの(えだ・葉・柵・岩)。おくゆきが でる ----
      if (base.fore) {
        const [okind, per, osize] = base.fore;
        for (const sg of world.segments) {
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
        world.residents.push(makeActor(r, { x: clamp(cx + Math.sin(ja) * jd, world.minX + 20, world.maxX - 20), z: clamp(cz + Math.cos(ja) * jd * 0.7, 80, base.len - 80), spot: s, heading: hrand(seed + 'h') * TAU - Math.PI }));
      });
      if (registry.naoto && registry.naoto.region === regionId) {
        const spot = base.spots.find((s) => s.kind === 'deep') || base.spots[base.spots.length - 1];
        world.residents.push(makeActor(registry.naoto, { x: spot.x, z: spot.z, spot, fixed: true, heading: Math.PI }));
      }
      // あたりはんてい: かたい もの(しゃへいぶつ・めじるし・ランドマーク)
      world.obstacles = world.props.filter((p) => p.solid).map((p) => ({ x: p.x, z: p.z, r: p.layer === 'landmark' ? 70 : 44 }));
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
      return { light: light / tw, fog: fog / tw, tint: tintW > 0 ? [Math.round(tr / tintW), Math.round(tg / tintW), Math.round(tb / tintW)] : null, tintAmt: tintW / tw, zone: nearest,
        anim: (nearest && nearest.mood.anim) || null, open: (nearest && nearest.mood.open) || 1 };
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
      // えんしゅつの ぶん(ゆっくり おいかける)。camera そのものは りぐの まま に して、
      // ここで つくった さ を 足した ものを え に わたす。3D でも おなじ さ を つかえる
      const camFx = { bob: 0, dist: 0, height: 0, yaw: 0, phase: 0 };
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
        if (!player.moving) { inputActive = false; player.speed = 0; }
        else if (!inputActive) { inputActive = true; inputYaw = camera.yaw; }
        if (player.moving) {
          // ゆびを おいた ときの カメラの むきを きじゅんに ワールドの むきへ
          const fx = Math.sin(inputYaw), fz = Math.cos(inputYaw), rx = Math.cos(inputYaw), rz = -Math.sin(inputYaw);
          const mx = rx * v.x + fx * -v.y, mz = rz * v.x + fz * -v.y; const m = Math.hypot(mx, mz) || 1;
          const spd = RULES.playerSpeed * (player.onPath ? 1 : RULES.offPathSpeed) * Math.min(1, m);
          player.speed = spd / RULES.playerSpeed; // 0〜1(カメラの えんしゅつが よむ)
          player.x += mx / m * spd * dt; player.z += mz / m * spd * dt;
          clampToWorld(player, world); resolveObstacles(player, world);
          player.heading = Math.atan2(mx, mz); player.face = rx * mx + rz * mz < -0.2 ? -1 : rx * mx + rz * mz > 0.2 ? 1 : player.face; player.bob += dt;
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
        mood = moodAt(world, player.x, player.z);
        const prof = CAM_PROFILES[(curSpot && (curSpot.cam || (curSpot.secret ? 'secret' : curSpot.kind))) || (player.onPath && np && np.seg.kind === 'narrow' ? 'narrow' : 'default')] || CAM_PROFILES.default;
        camera.dist += (prof.dist - camera.dist) * Math.min(1, dt * RULES.cam.ease); camera.height += (prof.height - camera.height) * Math.min(1, dt * RULES.cam.ease);
        updateCamFx(dt, np);
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
        if (a.chatWith) { a.chatWith.chatWith = null; a.chatWith = null; }
        a.state = 'idle'; a.until = 3.5; a.chaseOf = null;
        return { actor: a, line: a.say };
      }
      const metCount = () => world.residents.filter((r) => r.met).length;
      // ちずの データ(UI は あとで): はっけんずみ の スポットと みち。かくし ばしょは みつけるまで のらない
      const mapData = () => ({ zones: world.zones.map((z) => ({ id: z.id, label: z.label, x: z.x, z: z.z, spots: z.spots })), spots: world.spots.filter((s) => !s.secret || discovered.has(s.id)).map((s) => ({ id: s.id, label: s.label, x: s.x, z: s.z, kind: s.kind, secret: !!s.secret, discovered: discovered.has(s.id), current: s === curSpot })), paths: world.paths.filter(([a, b, k]) => k !== 'secret' || (discovered.has(a) && discovered.has(b))), len: world.len });
      // レンダラーに わたす「いまの せかい」。ぜんぶ ワールド座標。かきかえない やくそく
      // え に わたす カメラ: りぐ + えんしゅつの さ。え は これを そのまま つかう
      const viewCam = { x: 0, z: 0, yaw: 0, dist: 0, height: 0 };
      const camFor = (fx) => {
        const on = fx !== false;
        viewCam.x = camera.x; viewCam.z = camera.z;
        viewCam.yaw = on ? wrapAngle(camera.yaw + camFx.yaw) : camera.yaw;
        viewCam.dist = camera.dist * (1 + (on ? camFx.dist : 0));
        viewCam.height = camera.height * (1 + (on ? camFx.height : 0));
        return viewCam;
      };
      let camFxOn = true;
      const view = () => ({ regionId: world.regionId, world, residents: world.residents, party, player, camera: camFor(camFxOn), rig: camera, camFx, nearest, spot: curSpot, zone: mood.zone || null, mood, env: envNow, frame });
      return {
        RULES, enterRegion, step, talk, view, hitTest, dist, mapData,
        setEnv(e) { envNow = e; }, get env() { return envNow; },
        // よいやすい ひとの ための スイッチ(prefers-reduced-motion)。せかいは かわらない
        setCameraMotion(on) { camFxOn = !!on; }, get cameraMotion() { return camFxOn; },
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
      neonskyline: ['#2f3450', '#1b1f34'], canopy: ['#2f6a2f', '#1f4a22'], mesas: ['#b56a44', '#8a4f34'], farhills: ['#8fbe76', '#6aa05a'],
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
      function drawBackdrop(world, e, light, tl) {
        const kind = world.backdrop; const cols = BACKDROP_COLORS[kind] || BACKDROP_COLORS.hills;
        const bh = Math.round(H * 0.17), base = HOR + 2, px = plx('far'); // えんけい: そらより はやく、あるく ぶん でも ながれる
        const far = shadeRgb(mixRgb(cols[0], (SKY_OVERRIDE[world.regionId] || tl.sky)[1], 0.35), light, tl.tint, tl.amt), nearC = shade(cols[1], light, tl.tint, tl.amt);
        const wave = (color, amp, freq, yoff, phase) => { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-10, base + 4); for (let x = -10; x <= W + 10; x += 12) { const y = base - yoff - amp * (0.5 + 0.5 * Math.sin((x + px * phase) * freq + phase)); ctx.lineTo(x, y); } ctx.lineTo(W + 10, base + 4); ctx.closePath(); ctx.fill(); };
        const spikes = (color, n, hmin, hmax, wmul, yoff, seed) => { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-10, base + 4); const step = (W + 40) / n; const shift = ((px * (0.5 + seed * 0.3)) % step + step) % step; for (let i = -1; i <= n + 1; i++) { const x = -20 + i * step + shift; const idx = ((i - Math.floor(px * (0.5 + seed * 0.3) / step)) % 97 + 97) % 97; const hh = hmin + (hash(kind + seed + idx) % 1000) / 1000 * (hmax - hmin); ctx.lineTo(x - step * wmul, base - yoff); ctx.lineTo(x, base - yoff - hh); } ctx.lineTo(W + 40, base - yoff); ctx.lineTo(W + 40, base + 4); ctx.closePath(); ctx.fill(); };
        const blocks = (color, n, hmin, hmax, yoff, seed) => { ctx.fillStyle = color; const step = (W + 40) / n; const shift = ((px * (0.5 + seed * 0.3)) % step + step) % step; for (let i = -1; i <= n + 1; i++) { const idx = ((i - Math.floor(px * (0.5 + seed * 0.3) / step)) % 97 + 97) % 97; const hh = hmin + (hash(kind + seed + idx) % 1000) / 1000 * (hmax - hmin), bw = step * (0.55 + (hash(kind + 'w' + seed + idx) % 100) / 250); const x = -20 + i * step + shift; ctx.fillRect(x, base - yoff - hh, bw, hh + yoff + 4); } };
        if (kind === 'hills') { wave(far, bh * 0.7, 0.012, bh * 0.15, 1); wave(nearC, bh * 0.5, 0.02, 0, 2.5); }
        else if (kind === 'lakehills') { wave(far, bh * 0.7, 0.012, bh * 0.25, 1); ctx.fillStyle = shade('#6aa0da', light, tl.tint, tl.amt); ctx.fillRect(0, base - bh * 0.22, W, bh * 0.22 + 4); wave(nearC, bh * 0.3, 0.025, bh * 0.05, 2.5); }
        else if (kind === 'treeline') { spikes(far, 22, bh * 0.35, bh * 0.85, 0.5, bh * 0.12, 1);
          // まるい こずえ を まぜて、おなじ さんかくの くりかえしに 見えない ように する
          ctx.fillStyle = shadeRgb(mixRgb(cols[0], cols[1], 0.5), light, tl.tint, tl.amt);
          { const step = (W + 40) / 11, shift = ((px * 0.65) % step + step) % step;
            for (let i = -1; i <= 12; i++) { const idx = ((i - Math.floor(px * 0.65 / step)) % 97 + 97) % 97, x = -20 + i * step + shift, hh = bh * 0.3 + (hash('tl' + idx) % 1000) / 1000 * bh * 0.45;
              ctx.beginPath(); ctx.ellipse(x, base - bh * 0.06 - hh * 0.5, step * 0.5, hh * 0.55, 0, 0, TAU); ctx.fill(); } }
          spikes(nearC, 16, bh * 0.4, bh * 0.95, 0.5, 0, 2); }
        else if (kind === 'peaks' || kind === 'snowpeaks') { spikes(far, 7, bh * 0.6, bh * 1.3, 0.5, bh * 0.1, 1); spikes(nearC, 5, bh * 0.5, bh * 1.0, 0.5, 0, 2);
          // 雪の頂: ゆきぐには いつも。ふつうの 山なみは ふゆ か ゆきの ときだけ(きせつ・てんきと あわせる)
          if (kind === 'snowpeaks' || e.season === 'winter' || e.weather === 'snow') { ctx.fillStyle = 'rgba(255,255,255,.55)'; const step = (W + 40) / 7; const shift = ((px * 0.8) % step + step) % step; for (let i = -1; i <= 8; i++) { const idx = ((i - Math.floor(px * 0.8 / step)) % 97 + 97) % 97; const x = -20 + i * step + shift, hh = bh * 0.6 + (hash(kind + 1 + idx) % 1000) / 1000 * bh * 0.7; ctx.beginPath(); ctx.moveTo(x, base - bh * 0.1 - hh); ctx.lineTo(x + step * 0.12, base - bh * 0.1 - hh * 0.75); ctx.lineTo(x - step * 0.12, base - bh * 0.1 - hh * 0.75); ctx.closePath(); ctx.fill(); } } }
        else if (kind === 'skyline') { blocks(far, 12, bh * 0.4, bh * 1.1, bh * 0.1, 1); blocks(nearC, 9, bh * 0.3, bh * 0.8, 0, 2); ctx.fillStyle = 'rgba(255,240,180,.55)'; for (let i = 0; i < 40; i++) { const x = ((i * 53 + px * 0.6) % (W + 20) + W + 20) % (W + 20) - 10, y = base - 6 - (i * 37) % Math.round(bh * 0.7); ctx.fillRect(x, y, 2, 2); } }
        else if (kind === 'seahorizon') { ctx.fillStyle = shade(cols[0], light, tl.tint, tl.amt); ctx.fillRect(0, base - bh * 0.35, W, bh * 0.35 + 4); ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 12; i++) ctx.fillRect(((i * 91 + px * 0.5) % W + W) % W, base - bh * 0.35 + 4 + (i * 13) % Math.round(bh * 0.3), 18 + (i % 3) * 8, 1.5); wave(nearC, bh * 0.35, 0.03, bh * 0.05, 5); ctx.fillStyle = 'rgba(255,255,255,.8)'; const bx = ((px * 0.4 + W * 0.7) % W + W) % W; ctx.beginPath(); ctx.moveTo(bx, base - bh * 0.5); ctx.lineTo(bx + 9, base - bh * 0.3); ctx.lineTo(bx - 6, base - bh * 0.3); ctx.closePath(); ctx.fill(); }
        else if (kind === 'abyss') { ctx.fillStyle = shade(cols[0], light, tl.tint, tl.amt); ctx.fillRect(0, base - bh * 0.5, W, bh * 0.5 + 4); spikes(nearC, 14, bh * 0.2, bh * 0.6, 0.5, 0, 3);
          // くらいからこそ: とおくに ひかる もの(サンゴの ひかり・ねっすいの あかり)が みえる
          for (let i = 0; i < 9; i++) { const x = ((i * 89 + px * 0.5) % (W + 20) + W + 20) % (W + 20) - 10, y = base - bh * 0.06 - (i * 41) % Math.round(bh * 0.4), tw = 0.5 + 0.5 * Math.sin(performance.now() * 0.0015 + i); ctx.fillStyle = i % 3 === 0 ? 'rgba(255,150,80,.9)' : 'rgba(120,225,240,.9)'; ctx.globalAlpha = 0.35 + tw * 0.5; ctx.fillRect(x, y, 2, 2); ctx.globalAlpha = 0.08 + tw * 0.06; ctx.beginPath(); ctx.arc(x + 1, y + 1, 7 + (i % 3) * 3, 0, TAU); ctx.fill(); }
          ctx.globalAlpha = 1; }
        else if (kind === 'dunes') { wave(far, bh * 0.6, 0.009, bh * 0.2, 1); wave(nearC, bh * 0.5, 0.015, 0, 3); }
        else if (kind === 'skystops') { for (let i = 0; i < 5; i++) { const x = ((i * 167 + px * (0.4 + i * 0.1)) % (W + 120) + W + 120) % (W + 120) - 60, y = base - bh * (0.25 + (i % 3) * 0.28), r = W * (0.06 + (i % 2) * 0.03); ctx.fillStyle = i % 2 ? far : nearC; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.32, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,230,150,.9)'; ctx.fillRect(x - 1, y - r * 0.32 - 10, 2, 10); ctx.beginPath(); ctx.arc(x, y - r * 0.32 - 11, 3, 0, TAU); ctx.fill(); } wave('rgba(255,255,255,.10)', bh * 0.3, 0.02, 0, 4); }
        else if (kind === 'mist') { for (let i = 0; i < 3; i++) { ctx.fillStyle = `rgba(200,205,225,${0.18 + i * 0.1})`; ctx.fillRect(0, base - bh * (0.6 - i * 0.18), W, bh); } spikes(nearC, 10, bh * 0.15, bh * 0.4, 0.5, 0, 2); }
        // とかい: ネオンの スカイライン。よるは まどが いろとりどりに ひかり、屋上に あかい とうだい
        else if (kind === 'neonskyline') {
          const night = e.time === 'night', ev = e.time === 'evening';
          blocks(far, 14, bh * 0.5, bh * 1.35, bh * 0.12, 1); blocks(shade('#262b42', light, tl.tint, tl.amt), 10, bh * 0.4, bh * 1.05, bh * 0.05, 2); blocks(nearC, 7, bh * 0.3, bh * 0.85, 0, 3);
          const lit = night ? 1 : ev ? 0.7 : 0.3; const cols = ['#ffe9a8', '#39e6ff', '#ff4fa3', '#b46bff', '#4affa0'];
          ctx.globalAlpha = lit;
          for (let i = 0; i < 90; i++) { const x = ((i * 47 + px * 0.6) % (W + 20) + W + 20) % (W + 20) - 10, y = base - 4 - (i * 29) % Math.round(bh * 1.1); ctx.fillStyle = night && i % 4 === 0 ? cols[i % cols.length] : '#ffeec0'; ctx.fillRect(x, y, 2, 3); }
          // たてに ながい ネオンの かんばん
          for (let i = 0; i < 7; i++) { const x = ((i * 151 + px * 0.6) % (W + 40) + W + 40) % (W + 40) - 20, h2 = bh * (0.3 + (i % 3) * 0.16); ctx.fillStyle = cols[(i + 1) % cols.length]; ctx.globalAlpha = lit * 0.85; ctx.fillRect(x, base - bh * 0.5 - h2, 4, h2); ctx.globalAlpha = lit * 0.2; ctx.fillRect(x - 4, base - bh * 0.5 - h2, 12, h2); ctx.globalAlpha = lit; }
          ctx.globalAlpha = 1;
          ctx.fillStyle = 'rgba(255,90,90,.9)'; for (let i = 0; i < 4; i++) { const x = ((i * 233 + px * 0.6) % (W + 20) + W + 20) % (W + 20) - 10; const blink = (Math.sin(performance.now() * 0.002 + i) + 1) / 2; ctx.globalAlpha = 0.4 + blink * 0.6; ctx.fillRect(x, base - bh * (1.1 + (i % 2) * 0.2), 3, 3); }
          ctx.globalAlpha = 1;
        }
        // ジャングル: とがった 木立では なく、かさなりあう まるい 樹冠
        else if (kind === 'canopy') {
          const crowns = (color, n, hmin, hmax, yoff, seed) => { ctx.fillStyle = color; const step = (W + 40) / n; const shift = ((px * (0.5 + seed * 0.3)) % step + step) % step;
            for (let i = -1; i <= n + 1; i++) { const idx = ((i - Math.floor(px * (0.5 + seed * 0.3) / step)) % 97 + 97) % 97; const hh = hmin + (hash('cn' + seed + idx) % 1000) / 1000 * (hmax - hmin), x = -20 + i * step + shift;
              ctx.beginPath(); ctx.ellipse(x, base - yoff - hh * 0.5, step * 0.78, hh * 0.62, 0, 0, TAU); ctx.fill(); ctx.fillRect(x - step * 0.1, base - yoff - hh * 0.5, step * 0.2, hh * 0.5 + yoff + 4); } };
          crowns(far, 9, bh * 0.6, bh * 1.25, bh * 0.1, 1); crowns(nearC, 6, bh * 0.6, bh * 1.1, 0, 2);
          ctx.fillStyle = 'rgba(30,70,30,.5)'; ctx.fillRect(0, base - bh * 0.12, W, bh * 0.12 + 4);
        }
        // さばく: すなおかの むこうに おおきな 岩山(メサ)と、ひるは しんきろう
        else if (kind === 'mesas') {
          const mesa = (color, n, hmin, hmax, yoff, seed) => { ctx.fillStyle = color; const step = (W + 60) / n; const shift = ((px * (0.4 + seed * 0.25)) % step + step) % step;
            for (let i = -1; i <= n + 1; i++) { const idx = ((i - Math.floor(px * (0.4 + seed * 0.25) / step)) % 97 + 97) % 97; const hh = hmin + (hash('ms' + seed + idx) % 1000) / 1000 * (hmax - hmin), x = -30 + i * step + shift, w = step * (0.4 + (hash('mw' + seed + idx) % 100) / 220);
              ctx.beginPath(); ctx.moveTo(x - w, base - yoff); ctx.lineTo(x - w * 0.8, base - yoff - hh); ctx.lineTo(x + w * 0.8, base - yoff - hh); ctx.lineTo(x + w, base - yoff); ctx.closePath(); ctx.fill(); } };
          wave(shade('#e6c98a', light, tl.tint, tl.amt), bh * 0.5, 0.008, bh * 0.28, 1);
          mesa(far, 5, bh * 0.5, bh * 1.0, bh * 0.22, 1); mesa(nearC, 3, bh * 0.35, bh * 0.7, bh * 0.05, 2);
          wave(shade('#d1ad66', light, tl.tint, tl.amt), bh * 0.42, 0.014, 0, 3);
          if (e.time === 'day' && e.weather === 'sunny') { ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(0, base - bh * 0.2, W, bh * 0.06); }
        }
        // いなか: おかの むこうに とおい やまなみ(そらが ひろく みえる)
        else if (kind === 'farhills') { spikes(shadeRgb(mixRgb('#8e93a4', (SKY_OVERRIDE[world.regionId] || tl.sky)[1], 0.55), light, tl.tint, tl.amt), 6, bh * 0.4, bh * 0.8, 0.5, bh * 0.4, 0); wave(far, bh * 0.45, 0.01, bh * 0.16, 1); wave(nearC, bh * 0.3, 0.02, 0, 2.5); }
      }
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
      const TINY_COLOR = { dune: '#e0c48a', duneridge: '#e0c48a', dunewall: '#e0c48a', sandcrest: '#e8d2a0', snowbank: '#eef3fa', snowdrift: '#f4f8fd', reefwall: '#24466a', kelpwall: '#2f6a50', kelp: '#2f7a5a', mesa: '#a8623f', hedge: '#3f7a3a', mistwood: '#7fa8dc', bluetree: '#7fa8dc', cliffwall: '#7d7768', seacliff: '#b89a70', searock: '#5f5a50', cliff: '#6f6a58', bigrock: '#7a7a70', islandedge: '#4a4470', pinewall: '#2f6a3a', palmgrove: '#3f9a4a', cropline: '#6aa83f', crystal: '#9fe8ff', crystalgarden: '#9fe8ff' };
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
          ctx.fillStyle = 'rgba(230,240,250,.14)';
          for (let i = 0; i < 3; i++) { const y2 = HOR + (H - HOR) * (0.04 + i * 0.09); ctx.fillRect(0, y2, W, (H - HOR) * 0.05); }
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
        if (mood.fog > 0.02) { const fc = (SKY_OVERRIDE[world.regionId] || tl.sky)[1]; ctx.fillStyle = shade(fc, wl, '#ffffff', 0); ctx.globalAlpha = Math.min(0.85, mood.fog * 1.3); ctx.fillRect(0, HOR - H * 0.17, W, H * 0.17 + 4); ctx.globalAlpha = 1; }
        drawGround(world, e, tl, wl, light, now);
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
          items.push({ kind: 'prop', o: pr, p, must: !!pr.landmark || !!pr.hero || (big && p.dz < farCull * 0.7) }); }
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
            const fade = clamp(1.4 - it.p.dz / farCull, 0.35, 1) * occ * nearFade;
            if (fade <= 0.04) continue;
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
        resize(n) { ctx = n.ctx; W = n.W; H = n.H; if (n.rawCtx) { rawMain = n.rawCtx; sceneryMain = wrapScenery ? wrapScenery(n.rawCtx) || n.rawCtx : n.rawCtx; } setup(); }, destroy() { skyCache = null; nebula = null; } };
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
      const talkBtn = container.querySelector('#mgrTalk'), travelBtn = container.querySelector('#mgrTravel'), homeBtn = container.querySelector('#mgrHome');
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
        if (typeof window !== 'undefined' && window.visualViewport && typeof window.visualViewport.removeEventListener === 'function') window.visualViewport.removeEventListener('resize', onResize);
        if (resizeTimer) clearTimeout(resizeTimer);
        pad.destroy(); renderer.destroy && renderer.destroy();
        if (container.classList) container.classList.remove('meguru-overlay');
        if (typeof S.onExit === 'function') S.onExit();
      }
      rafId = requestAnimationFrame(frameFn);
      // ならびの けんさ よう(テストと 実機の しらべ もの に つかう)
      const layoutInfo = () => ({ limit: overlayBottomLimitPx(), avail: overlayAvailPx(), over: overflowBelowPx(), shrink: shrinkPx, H, want: availHeight() });
      return { stop, layoutInfo, get running() { return running; }, sim, renderer, get world() { return sim.world; }, get party() { return sim.party; }, get player() { return sim.player; }, talk, enterWorld, get nearest() { return sim.nearest; }, setPlayer(x, z) { sim.setPlayer(x, z); }, get canvasSize() { return { W, H }; } };
    }

    return { WORLDS, WORLD_STYLE, HABITAT, NORMAL_REGIONS, RULES, PATH_HALF, CAM_PROFILES, sampleGroundDetails, shoreX, SCENERY_FAUNA, isFaunaEmoji, sceneryPools, auditSceneryFauna, auditSceneryCharacters, characterEmojiMap, SCENERY_CHARACTER_ALLOW, SPOT_STATUE_ALLOW, SCENERY_LINES, moodAt, buildRegistry, auditRegistry, auditScenery, sceneryEmojis, buildWorld, worldLayers, STRUCT_ROLE, AREA_ROLE, SPOT_PROP_STRUCT, RENDER_TUNING, OCCLUDER_BOX, OCCLUDER_LAYERS, SWAY_AMOUNT, companionsOf, talkLine, chooseState, updateActor, createSimulation, createCanvasRenderer, start, reachableSpots, pathSegments, nearestPath, onPath, facingOf, spriteFor, wrapAngle };
  };
})();
