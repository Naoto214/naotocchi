// なおとっち — めぐる(いまいる 地域の なかを あるきまわる)。
// script.js(本体)から installNaotocchiMeguru(S) で よびだされる。
// ・「たび」の 地域えらびは そのまま。その うえに「○○をめぐる」を のせる(地域の
//   いどうは かならず 本体の travelToRegion() を とおる。ここでは やらない)
// ・ぎじ 3D(canvas): おくへ いくほど ちいさく、じめんは すこし まるく おちていく。
//   え(キャラ・こもの)は いまの 2D 素材(PNG / 絵文字イラスト)の 立て看板
// ・ずかんに のった キャラ(すがた・なかま・レアなかま・こいびと)は ぜんいん、
//   どこかの 地域の せかいに「すんでいる」。ランダムに 数体 だけ 出す ことは しない。
//   いまの じぶん(そだてている 1体)は プレイヤー、いまの なかま・こいびとは
//   おなじ 1体を「いっしょに あるく」あつかい(二重に 出さない)
// ・ナオトは かいきん(isAuthorUnlocked)ずみの セーブだけ、きおくのみずうみの おくに いる
// ・つくり(2そう): 「せかい/シミュレーション」と「え(レンダラー)」を わけている。
//     せかい: WORLDS / buildRegistry / buildWorld / chooseState / updateActor / talkLine /
//             createSimulation(いどう・あたりはんてい・じゅうみんの こうどう・であう・はなす)。
//             ぜんぶ ワールド座標(x: よこ, z: おく, ともに せかい たんい)。がめんの px は しらない
//     え:     createCanvasRenderer(canvas ぎじ 3D)。sim.view() を うけとって えがくだけ。
//             view の なかみは かきかえない。おなじ view を うけとる three.js などの
//             レンダラーに さしかえられる(start(container, { renderer }) で さしこめる)
// S: clamp, lerp, escapeHtml, sfx, createMgCanvas, createTouchPad, createPadRow,
//    getState, currentEnvironment, findRegion, regionLabelHTML, selectedLocality, dailyKey,
//    SPECIES, ALL_LINES, speciesStageDesc, COMPANIONS, RARE_COMPANIONS, allCompanionsById,
//    canonicalCompanionId, partners, partnerAsset, currentPetKey, playerGlyph, playerEmoji,
//    isAuthorUnlocked, authorAsset, worldScene, perfTier, onExit, openTravel, recordMet, recordTalk,
//    lifetimeStats
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
    // きめうちの らんすう(おなじ かぎ → おなじ すう)。日がわりの いばしょ などに つかう
    function hash(str) { let h = 2166136261; const s = String(str); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
    const hrand = (str) => (hash(str) % 100000) / 100000;

    // ================= 世界(地域ごと) =================
    // len: おくゆき(せかい たんい)。spots: なまえの ある ばしょ(z: おく、x: よこ、r: ひろさ)。
    // kind: plaza(ひろば) path(こみち) water(みずべ) rest(やすむ ばしょ・いえ) shelter(あまやどり)
    //       shop(おみせ) grove(きの あいだ) edge(はし) deep(いちばん おく・しずか)
    // props: かざり(絵文字)を ばらまく もと。ground/path: いろ(ひるの きほん)
    const NORMAL_REGIONS = ['home', 'city', 'countryside', 'forest', 'mountain', 'snow', 'sea', 'deepsea', 'river_lake', 'jungle', 'desert'];
    const WORLDS = {
      home: { len: 2200, ground: ['#a9d98a', '#8fc574'], path: '#e5d5b0', props: ['🌸', '🪴', '🕊️', '🌳', '🌷', '🪵'],
        spots: [{ id: 'yard', label: 'にわ', z: 320, x: 0, r: 220, kind: 'plaza' }, { id: 'house', label: 'おうちのまえ', z: 620, x: -360, r: 160, kind: 'rest', prop: '🏠' }, { id: 'lane', label: 'こみち', z: 1000, x: 120, r: 240, kind: 'path' }, { id: 'park', label: 'こうえん', z: 1500, x: -80, r: 260, kind: 'plaza', prop: '🛝' }, { id: 'bench', label: 'ベンチ', z: 1900, x: 340, r: 150, kind: 'rest', prop: '🪑' }, { id: 'shed', label: 'のきした', z: 1300, x: 420, r: 120, kind: 'shelter', prop: '🛖' }] },
      city: { len: 2600, ground: ['#b9bcc4', '#9ea3ad'], path: '#d9d5cc', props: ['🏢', '🏬', '🚦', '💡', '🌳', '🚕', '🏪', '🎡'],
        spots: [{ id: 'station', label: 'えきまえ', z: 300, x: 0, r: 240, kind: 'plaza', prop: '🚉' }, { id: 'street', label: 'とおり', z: 800, x: 0, r: 300, kind: 'path' }, { id: 'shop', label: 'おみせ', z: 1100, x: -380, r: 160, kind: 'shop', prop: '🏪' }, { id: 'cafe', label: 'カフェのひさし', z: 1450, x: 380, r: 150, kind: 'shelter', prop: '☕' }, { id: 'park', label: 'ビルのあいだのこうえん', z: 1900, x: -120, r: 260, kind: 'plaza', prop: '⛲' }, { id: 'rooftop', label: 'やねのうえ', z: 2300, x: 300, r: 180, kind: 'rest', prop: '🏢' }] },
      countryside: { len: 2600, ground: ['#b8d98a', '#8fbf6a'], path: '#d8c79a', props: ['🌾', '🌻', '🐄', '🚜', '🌳', '🦋', '🐓', '🏡'],
        spots: [{ id: 'gate', label: 'むらのいりぐち', z: 300, x: 0, r: 220, kind: 'plaza' }, { id: 'field', label: 'はたけ', z: 800, x: -380, r: 240, kind: 'grove', prop: '🌾' }, { id: 'road', label: 'あぜみち', z: 1200, x: 100, r: 300, kind: 'path' }, { id: 'barn', label: 'なや', z: 1500, x: 420, r: 150, kind: 'shelter', prop: '🏚️' }, { id: 'hill', label: 'ひなたのおか', z: 2000, x: -200, r: 260, kind: 'plaza', prop: '🌻' }, { id: 'farmhouse', label: 'のうか', z: 2350, x: 300, r: 160, kind: 'rest', prop: '🏡' }] },
      forest: { len: 2800, ground: ['#7fb26b', '#57894e'], path: '#b7a27a', props: ['🌲', '🌲', '🌳', '🍄', '🌿', '🌰', '🪵', '🦉'],
        spots: [{ id: 'entry', label: 'もりのいりぐち', z: 300, x: 0, r: 220, kind: 'plaza' }, { id: 'trail', label: 'こみち', z: 800, x: 60, r: 260, kind: 'path' }, { id: 'brook', label: 'おがわ', z: 1200, x: -400, r: 200, kind: 'water', prop: '💧' }, { id: 'clearing', label: 'ひろば', z: 1600, x: 0, r: 280, kind: 'plaza', prop: '🪵' }, { id: 'hollow', label: 'きのうろ', z: 2000, x: 420, r: 150, kind: 'shelter', prop: '🌳' }, { id: 'deep', label: 'もりのおく', z: 2500, x: -150, r: 240, kind: 'grove', prop: '🍄' }] },
      mountain: { len: 2800, ground: ['#a3a58d', '#7b7f6b'], path: '#c9bda0', props: ['⛰️', '🪨', '🌲', '🥾', '🏕️', '☁️', '🦅', '🪨'],
        spots: [{ id: 'foot', label: 'ふもと', z: 300, x: 0, r: 220, kind: 'plaza' }, { id: 'trail', label: 'やまみち', z: 800, x: -80, r: 300, kind: 'path' }, { id: 'camp', label: 'キャンプ', z: 1200, x: 380, r: 180, kind: 'shelter', prop: '🏕️' }, { id: 'spring', label: 'おんせん', z: 1600, x: -380, r: 180, kind: 'water', prop: '♨️' }, { id: 'ridge', label: 'おね', z: 2100, x: 60, r: 260, kind: 'plaza', prop: '🪨' }, { id: 'summit', label: 'ちょうじょう', z: 2600, x: 0, r: 200, kind: 'edge', prop: '⛰️' }] },
      snow: { len: 2600, ground: ['#eef4fb', '#d3e0ee'], path: '#dfe7f0', props: ['❄️', '⛄', '🌲', '🏔️', '🧣', '🦌', '🛷', '🌨️'],
        spots: [{ id: 'gate', label: 'ゆきのいりぐち', z: 300, x: 0, r: 220, kind: 'plaza' }, { id: 'field', label: 'ゆきはら', z: 800, x: -60, r: 320, kind: 'plaza', prop: '⛄' }, { id: 'lodge', label: 'ロッジ', z: 1200, x: 400, r: 160, kind: 'rest', prop: '🛖' }, { id: 'lake', label: 'こおりのみずうみ', z: 1650, x: -380, r: 220, kind: 'water', prop: '🧊' }, { id: 'slope', label: 'げれんで', z: 2100, x: 120, r: 280, kind: 'path', prop: '🎿' }, { id: 'cave', label: 'ゆきのどうくつ', z: 2450, x: -200, r: 150, kind: 'shelter', prop: '🕳️' }] },
      sea: { len: 2600, ground: ['#f2e2b6', '#e2cf9a'], path: '#f7ecc9', props: ['🐚', '⛵', '🌴', '🏖️', '🦀', '☀️', '🐬', '🪸'],
        spots: [{ id: 'beach', label: 'すなはま', z: 300, x: 0, r: 260, kind: 'plaza' }, { id: 'shallows', label: 'あさせ', z: 800, x: -400, r: 260, kind: 'water', prop: '🌊' }, { id: 'pier', label: 'さんばし', z: 1200, x: 380, r: 200, kind: 'path', prop: '⛵' }, { id: 'hut', label: 'うみのいえ', z: 1550, x: 300, r: 160, kind: 'shelter', prop: '🏚️' }, { id: 'tidepool', label: 'しおだまり', z: 2000, x: -300, r: 220, kind: 'water', prop: '🪸' }, { id: 'cape', label: 'みさき', z: 2450, x: 60, r: 200, kind: 'edge', prop: '🗼' }] },
      deepsea: { len: 2600, ground: ['#1f3f66', '#14294a'], path: '#2b4f78', props: ['🪸', '🫧', '🐙', '🦑', '⚓', '💡', '🐚', '🪼'],
        spots: [{ id: 'reef', label: 'サンゴのまち', z: 350, x: 0, r: 280, kind: 'water' }, { id: 'kelp', label: 'こんぶのもり', z: 850, x: -380, r: 260, kind: 'grove', prop: '🌿' }, { id: 'wreck', label: 'ちんぼつせん', z: 1300, x: 380, r: 220, kind: 'shelter', prop: '⚓' }, { id: 'vent', label: 'あたたかいあな', z: 1750, x: -200, r: 220, kind: 'rest', prop: '🫧' }, { id: 'trench', label: 'かいこうのふち', z: 2200, x: 100, r: 260, kind: 'water', prop: '💡' }, { id: 'abyss', label: 'いちばんふかいところ', z: 2500, x: 0, r: 180, kind: 'deep' }] },
      river_lake: { len: 2600, ground: ['#a9d38d', '#82b46f'], path: '#d3c39a', props: ['🌿', '🪷', '🦆', '🪨', '💧', '🐟', '🌳', '🌈'],
        spots: [{ id: 'bank', label: 'かわぎし', z: 300, x: 0, r: 240, kind: 'plaza' }, { id: 'river', label: 'かわ', z: 800, x: -380, r: 280, kind: 'water', prop: '💧' }, { id: 'bridge', label: 'はし', z: 1200, x: 100, r: 220, kind: 'path', prop: '🌉' }, { id: 'reeds', label: 'あしはら', z: 1600, x: 380, r: 220, kind: 'grove', prop: '🌾' }, { id: 'lake', label: 'みずうみ', z: 2050, x: -300, r: 300, kind: 'water', prop: '🪷' }, { id: 'boathouse', label: 'ふねごや', z: 2400, x: 320, r: 150, kind: 'shelter', prop: '🛖' }] },
      jungle: { len: 2800, ground: ['#5f9a58', '#3f7a45'], path: '#a08a5f', props: ['🌴', '🌺', '🦜', '🌿', '🍌', '🐍', '🌳', '🪨'],
        spots: [{ id: 'entry', label: 'ジャングルのいりぐち', z: 300, x: 0, r: 220, kind: 'plaza' }, { id: 'vines', label: 'つるのみち', z: 800, x: -60, r: 280, kind: 'path' }, { id: 'falls', label: 'たき', z: 1250, x: -400, r: 220, kind: 'water', prop: '💦' }, { id: 'canopy', label: 'おおきなきのした', z: 1650, x: 380, r: 200, kind: 'shelter', prop: '🌳' }, { id: 'ruins', label: 'いせき', z: 2100, x: 0, r: 260, kind: 'plaza', prop: '🗿' }, { id: 'nest', label: 'すのあたり', z: 2500, x: -220, r: 180, kind: 'rest', prop: '🪺' }] },
      desert: { len: 2800, ground: ['#e9cf95', '#d2b271'], path: '#f1dfb0', props: ['🌵', '🐫', '🪨', '☀️', '⛺', '🦎', '🌵', '🏜️'],
        spots: [{ id: 'gate', label: 'さばくのいりぐち', z: 300, x: 0, r: 220, kind: 'plaza' }, { id: 'dunes', label: 'すなやま', z: 850, x: -100, r: 320, kind: 'path' }, { id: 'oasis', label: 'オアシス', z: 1300, x: -380, r: 220, kind: 'water', prop: '🌴' }, { id: 'tent', label: 'テント', z: 1700, x: 380, r: 160, kind: 'shelter', prop: '⛺' }, { id: 'ruins', label: 'いしのいせき', z: 2150, x: 60, r: 260, kind: 'plaza', prop: '🏛️' }, { id: 'cliff', label: 'がけのかげ', z: 2550, x: -250, r: 160, kind: 'rest', prop: '🪨' }] },
      star_stop: { len: 2400, ground: ['#3a3160', '#251e4e'], path: '#5a4f86', props: ['⭐', '🌙', '✨', '🪐', '☁️', '🌟', '💫'],
        spots: [{ id: 'stop', label: 'ていりゅうじょ', z: 320, x: 0, r: 220, kind: 'plaza', prop: '🚏' }, { id: 'cloudpath', label: 'くものみち', z: 900, x: 0, r: 300, kind: 'path' }, { id: 'bench', label: 'ほしをみるベンチ', z: 1500, x: -320, r: 180, kind: 'rest', prop: '🪑' }, { id: 'far', label: 'そらのはて', z: 2100, x: 100, r: 220, kind: 'edge', prop: '🪐' }] },
      memory_lake: { len: 2600, ground: ['#6f7a9a', '#53577a'], path: '#8b90b0', props: ['🌫️', '🪨', '🌿', '💧', '🕯️', '🍃'],
        spots: [{ id: 'shore', label: 'みずうみのほとり', z: 320, x: 0, r: 240, kind: 'plaza' }, { id: 'willow', label: 'やなぎのした', z: 900, x: -360, r: 200, kind: 'shelter', prop: '🌳' }, { id: 'water', label: 'しずかなみずも', z: 1300, x: 300, r: 260, kind: 'water', prop: '💧' }, { id: 'path', label: 'きりのこみち', z: 1800, x: -80, r: 220, kind: 'path', prop: '🌫️' }, { id: 'deep', label: 'みずうみのおく', z: 2450, x: 0, r: 120, kind: 'deep', prop: '🕯️' }] },
    };
    // げんざいち(おうちに 市区町村を かさねる)は 地域 id を ふやさず、おうちの せかいの
    // 「まちの かんじ」だけを かえる
    const LOCAL_FLAVOR = {
      metropolis: { props: ['🏢', '🚦', '💡', '🌳', '🚕'], label: '都会のまち' },
      harbor: { props: ['⚓', '⛵', '🐚', '🌊', '🏠'], label: '港のまち' },
      basin: { props: ['⛰️', '🌲', '🏡', '🌾', '☁️'], label: '山あいのまち' },
      town: { props: ['🏠', '🌳', '🏪', '🚲', '🌷'], label: 'まちなか' },
    };

    // ================= すがた(しゅぞく×だんかい)の すみか =================
    // それぞれの しゅぞくが「らしい」地域。8だんかいは このリストを じゅんに めぐって
    // ちらばる(おなじ しゅぞくの すがたが 2〜3の 地域に わかれて すむ)
    const HABITAT = {
      man: ['home', 'city', 'countryside'], woman: ['home', 'city', 'countryside'], dog: ['home', 'countryside', 'city'], cat: ['home', 'city', 'countryside'],
      penguin: ['snow', 'sea'], turtle: ['sea', 'river_lake'], frog: ['river_lake', 'countryside'], salmon: ['river_lake', 'sea'], clownfish: ['sea', 'deepsea'],
      butterfly: ['countryside', 'forest'], beetle: ['forest', 'jungle'], stagbeetle: ['forest', 'jungle'], cicada: ['forest', 'countryside'], antlion: ['desert'],
      hermit_crab: ['sea'], jellyfish: ['deepsea', 'sea'], starfish: ['sea'], coral: ['deepsea', 'sea'], dandelion: ['countryside', 'home'], sakura: ['home', 'countryside'],
      venus_flytrap: ['jungle'], mushroom: ['forest'],
      dragon: ['mountain'], phoenix: ['desert', 'mountain'], god: ['mountain'], world_tree: ['forest'], ghost: ['forest', 'home'], star: ['mountain', 'snow'], plush: ['home'], unknown: ['deepsea'],
      ren: ['home', 'city'],
    };
    const WATER_LINES = new Set(['salmon', 'clownfish', 'jellyfish', 'starfish', 'coral', 'hermit_crab', 'turtle', 'frog', 'unknown']);
    const PLANT_LINES = new Set(['dandelion', 'sakura', 'venus_flytrap', 'mushroom', 'world_tree', 'coral']);
    const NIGHT_LINES = new Set(['ghost', 'star']);
    const NIGHT_COMPANIONS = new Set(['bat', 'owl', 'watcher']);

    // ================= じゅうみん だいちょう =================
    // ずかんに のった キャラを ぜんいん、1体ずつ「どこの 地域に すむか」を きめる。
    // すがた: ずかんの 1コマ(しゅぞく:だんかい)= 1体。いまの じぶんの 1コマは のぞく
    // なかま: 日がわりで すむ 地域が かわる(どの 地域でも であえる という きほんを
    //         「1つの 地域だけ」の ロックに しない)。いま つれている なかまは いっしょに あるく
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
        const sp = S.SPECIES && S.SPECIES[line]; const st = sp && sp.stages && sp.stages[stage];
        if (!st) continue;
        const hab = HABITAT[line] || ['home'];
        list.push({ key: 'form:' + key, kind: 'form', line, stage, label: st.label, emoji: st.emoji, asset: st.asset, region: hab[stage % hab.length],
          water: WATER_LINES.has(line), plant: PLANT_LINES.has(line), night: NIGHT_LINES.has(line) });
      }
      const canon = typeof S.canonicalCompanionId === 'function' ? S.canonicalCompanionId : (id) => id;
      const withIds = new Set((state.companions || []).map((c) => canon(c.id)));
      const seen = new Set();
      for (const id of [...(lifetime.companionsRecruited || []), ...(lifetime.rareCompanionsRecruited || [])]) {
        const def = typeof S.allCompanionsById === 'function' ? S.allCompanionsById(id) : null;
        if (!def || seen.has(def.id)) continue; seen.add(def.id);
        const withPlayer = withIds.has(def.id);
        const region = withPlayer ? (state.regionId || 'home') : NORMAL_REGIONS[hash(def.id + ':' + day) % NORMAL_REGIONS.length];
        list.push({ key: 'companion:' + def.id, kind: 'companion', id: def.id, label: def.name, emoji: def.emoji, asset: def.asset, region, withPlayer, rare: !!def.vibe, night: NIGHT_COMPANIONS.has(def.id) });
      }
      const partners = S.partners || [];
      const cur = state.partner ? String(state.partner.id) : null;
      for (const id of lifetime.partnersRecorded || []) {
        const p = partners.find((c) => c.id === id); if (!p) continue;
        const withPlayer = cur === id;
        list.push({ key: 'partner:' + id, kind: 'partner', id, label: p.label, emoji: p.emoji, asset: typeof S.partnerAsset === 'function' ? S.partnerAsset(id) : null,
          region: withPlayer ? (state.regionId || 'home') : (p.firstRegion || 'home'), withPlayer, hook: p.hook || '' });
      }
      const naoto = typeof S.isAuthorUnlocked === 'function' && S.isAuthorUnlocked() ? { key: 'naoto', kind: 'naoto', id: 'naoto', label: 'ナオト', emoji: '🧑', asset: S.authorAsset || null, region: 'memory_lake', spot: 'deep', secret: true } : null;
      return { residents: list, naoto, byRegion: (regionId) => list.filter((r) => r.region === regionId) };
    }

    // ================= せかいを たてる =================
    function spotFor(res, world, e, seed) {
      const spots = world.spots;
      const want = (kinds) => spots.filter((s) => kinds.includes(s.kind));
      let pool = spots;
      if (res.water) pool = want(['water']).length ? want(['water']) : pool;
      else if (res.plant) pool = want(['grove', 'plaza', 'path']).length ? want(['grove', 'plaza', 'path']) : pool;
      else if (e.weather === 'rain' && hrand(seed + 'rain') < 0.75) pool = want(['shelter', 'rest']).length ? want(['shelter', 'rest']) : pool;
      else if (e.time === 'night' && !res.night && hrand(seed + 'night') < 0.6) pool = want(['rest', 'shelter']).length ? want(['rest', 'shelter']) : pool;
      else if (e.time === 'day' && hrand(seed + 'day') < 0.5) pool = want(['plaza', 'shop', 'water', 'path']).length ? want(['plaza', 'shop', 'water', 'path']) : pool;
      else if (e.time === 'morning') pool = want(['path', 'plaza', 'grove', 'water']).length ? want(['path', 'plaza', 'grove', 'water']) : pool;
      pool = pool.filter((s) => s.kind !== 'deep') ; if (!pool.length) pool = spots.filter((s) => s.kind !== 'deep');
      return pool[hash(seed) % pool.length];
    }
    function buildWorld(regionId, registry, opts = {}) {
      const base = WORLDS[regionId] || WORLDS.home;
      const e = env();
      const day = typeof S.dailyKey === 'function' ? S.dailyKey() : '';
      const local = regionId === 'home' && opts.locality && LOCAL_FLAVOR[opts.locality.profileId] ? LOCAL_FLAVOR[opts.locality.profileId] : null;
      const world = { regionId, len: base.len, ground: base.ground, path: base.path, spots: base.spots, props: [], residents: [], local };
      const propPool = local ? local.props.concat(base.props.slice(0, 3)) : base.props;
      const nProps = 30 + Math.floor(base.len / 90);
      for (let i = 0; i < nProps; i++) {
        const seed = regionId + ':prop:' + i;
        const z = 120 + hrand(seed + 'z') * (base.len - 200);
        const side = hrand(seed + 's') < 0.5 ? -1 : 1;
        const x = side * (520 + hrand(seed + 'x') * 420);
        world.props.push({ emoji: propPool[hash(seed) % propPool.length], x, z, size: 80 + hrand(seed + 'k') * 60 });
      }
      for (const s of base.spots) if (s.prop) world.props.push({ emoji: s.prop, x: s.x + (s.x < 0 ? -s.r - 40 : s.r + 40) * (s.kind === 'deep' ? 0 : 1), z: s.z + 40, size: 120, spot: true });
      const all = registry.byRegion(regionId).filter((r) => !r.withPlayer);
      all.forEach((r) => {
        const seed = r.key + '@' + regionId + '#' + day;
        const spot = spotFor(r, base, e, seed);
        const a = hrand(seed + 'a') * Math.PI * 2, d = hrand(seed + 'd') * spot.r * 0.85;
        world.residents.push(makeActor(r, { x: clamp(spot.x + Math.cos(a) * d, -900, 900), z: clamp(spot.z + Math.sin(a) * d * 0.6, 80, base.len - 80), spot }));
      });
      if (registry.naoto && registry.naoto.region === regionId) {
        const spot = base.spots.find((s) => s.kind === 'deep') || base.spots[base.spots.length - 1];
        world.residents.push(makeActor(registry.naoto, { x: spot.x, z: spot.z, spot, fixed: true }));
      }
      return world;
    }
    // いっしょに あるく なかま・こいびと(この せかいの じゅうみんとしては おかず、プレイヤーの そばに いる)
    function companionsOf(registry) { return registry.residents.filter((r) => r.withPlayer).map((r, i) => makeActor(r, { x: 0, z: 0, follow: true, slot: i })); }

    function makeActor(res, pos) {
      return Object.assign({}, res, { x: pos.x, z: pos.z, spot: pos.spot || null, fixed: !!pos.fixed, follow: !!pos.follow, slot: pos.slot || 0,
        state: 'idle', until: rnd(0.5, 2.5), tx: pos.x, tz: pos.z, face: 1, bob: rnd(0, 6), say: null, sayFor: 0, chatWith: null, met: false });
    }

    // ================= せいかつ(かんたんな じょうたい せんい) =================
    const VERBS = { idle: 'たたずんでいる', walk: 'あるいている', sit: 'すわっている', look: 'あたりを見ている', chat: 'はなしている', sleep: 'ねむっている', swim: 'およいでいる', sway: 'ゆれている', play: 'あそんでいる', watch: 'けしきを見ている', fish: 'つりをしている', rest: 'やすんでいる' };
    function chooseState(a, e) {
      if (a.fixed) return 'watch';
      if (a.plant) return 'sway';
      if (a.water) return Math.random() < 0.7 ? 'swim' : 'idle';
      const night = e.time === 'night';
      const rain = e.weather === 'rain';
      const r = Math.random();
      if (night && !a.night) return r < 0.55 ? 'sleep' : r < 0.8 ? 'rest' : 'look';
      if (rain) return r < 0.5 ? 'rest' : r < 0.75 ? 'look' : 'walk';
      if (e.weather === 'snow' && r < 0.25) return 'play';
      if (a.spot && a.spot.kind === 'water' && r < 0.3) return 'fish';
      if (a.spot && a.spot.kind === 'shop' && r < 0.4) return 'look';
      if (a.spot && a.spot.kind === 'edge' && r < 0.4) return 'watch';
      if (e.time === 'evening' && r < 0.3) return 'watch';
      if (e.time === 'morning' && r < 0.5) return 'walk';
      return r < 0.4 ? 'walk' : r < 0.6 ? 'idle' : r < 0.75 ? 'sit' : r < 0.9 ? 'look' : 'play';
    }
    function updateActor(a, dt, e, world, others) {
      a.bob += dt * (a.state === 'swim' ? 3 : 2);
      a.until -= dt;
      if (a.sayFor > 0) { a.sayFor -= dt; if (a.sayFor <= 0) { a.sayFor = 0; a.say = null; } }
      if (a.chatWith) { if (a.until <= 0) { a.chatWith.chatWith = null; a.chatWith = null; a.state = 'idle'; a.until = rnd(1, 3); } return; }
      if (a.state === 'walk' || a.state === 'swim' || a.state === 'play') {
        const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz);
        const sp = a.state === 'play' ? 120 : a.state === 'swim' ? 70 : 60;
        if (d > 6) { a.x += dx / d * sp * dt; a.z += dz / d * sp * dt; a.face = dx < 0 ? -1 : 1; } else a.until = Math.min(a.until, 0);
      }
      if (a.until <= 0) {
        const next = chooseState(a, e);
        a.state = next; a.until = next === 'sleep' ? rnd(6, 14) : next === 'walk' || next === 'swim' || next === 'play' ? rnd(2, 5) : rnd(1.5, 4);
        if (next === 'walk' || next === 'swim' || next === 'play') { const s = a.spot || { x: a.x, z: a.z, r: 120 }; const ang = rnd(0, Math.PI * 2), d = rnd(20, s.r * 0.9); a.tx = clamp(s.x + Math.cos(ang) * d, -900, 900); a.tz = clamp(s.z + Math.sin(ang) * d * 0.6, 80, world.len - 80); }
        // ちかくに だれかが いれば、ときどき はなしはじめる
        if ((next === 'idle' || next === 'look') && !a.fixed && Math.random() < 0.35) {
          const o = others.find((b) => b !== a && !b.chatWith && !b.fixed && !b.plant && b.state !== 'sleep' && Math.hypot(b.x - a.x, b.z - a.z) < 90);
          if (o) { a.chatWith = o; o.chatWith = a; a.state = o.state = 'chat'; a.until = o.until = rnd(2, 4); a.face = o.x < a.x ? -1 : 1; o.face = -a.face; }
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
    const NAOTO_LINES = {
      base: ['…ここまで きたんだね。', 'この みずうみは、だれかの きおくで できている。', 'きみが であってきた みんな、げんきそうだった？'],
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
      if (a.kind === 'partner') return r < 0.5 ? (a.hook || g) : g;
      if (a.kind === 'companion') { const def = typeof S.allCompanionsById === 'function' ? S.allCompanionsById(a.id) : null; return r < 0.4 && def && def.flavor ? def.flavor : g; }
      if (r < 0.35) { const d = typeof S.speciesStageDesc === 'function' ? S.speciesStageDesc(a.line, a.stage) : ''; if (d) return d; }
      if (r < 0.55 && WEATHER_LINE[e.weather]) return WEATHER_LINE[e.weather];
      if (r < 0.7 && SEASON_LINE[e.season]) return SEASON_LINE[e.season];
      if (r < 0.85 && REGION_LINE[a.region]) return REGION_LINE[a.region];
      return g;
    }

    // ================= シミュレーション(せかい たんい。え には いぞんしない) =================
    // ここが あそびの ほんたい。プレイヤー・じゅうみん・いっしょに あるく なかまの いち、
    // いどう、あたりはんてい、であう、はなす、を ワールド座標(x: よこ, z: おく)だけで すすめる。
    // がめんの px 座標や canvas は いっさい でてこない(レンダラーは view() を よむだけ)。
    const RULES = {
      playerSpeed: 260,      // せかい たんい / びょう
      xBound: 900,           // よこの はし(±)
      zMargin: 60,           // おく・てまえの はし
      metRadius: 150,        // この きょりに はいると「であった」
      talkRadius: 130,       // この きょりなら「はなす」が おせる
      nearX: 1300, nearZ: 1500, // この はんいの じゅうみんは まいフレーム うごく
      farStride: 12,         // とおい じゅうみんは 12 フレームに 1かい(そんざいは けさない)
      bubbleSec: 3.6,        // ふきだしの ながさ
      follow: { gap: 70, back: 40, spacing: 30, snap: 30, maxSpeed: 300 },
      obstacleRadius: 46,    // こものの あたりはんてい(えん)
      cameraFollow: 0.75,    // カメラの よこ おいかけ(プレイヤー x の わりあい)
    };
    const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    // えん どうしの あたりはんてい
    const hitTest = (a, b, r) => dist(a, b) < r;
    // じめんの はんい に おさめる
    function clampToWorld(pt, world) { pt.x = clamp(pt.x, -RULES.xBound, RULES.xBound); pt.z = clamp(pt.z, RULES.zMargin, world.len - RULES.zMargin); return pt; }
    // こもの(かたい もの)から おしだす
    function resolveObstacles(pt, world) {
      for (const o of world.obstacles) { const dx = pt.x - o.x, dz = pt.z - o.z, d = Math.hypot(dx, dz); if (d > 0 && d < o.r) { pt.x = o.x + dx / d * o.r; pt.z = o.z + dz / d * o.r; } }
      return pt;
    }

    function createSimulation(init = {}) {
      let registry = init.registry || buildRegistry();
      let world = null, party = [], player = null, nearest = null, frame = 0;
      const camera = { x: 0, z: 0 };
      let envNow = init.env || env();
      function enterRegion(regionId, opts = {}) {
        if (opts.registry) registry = opts.registry;
        world = buildWorld(regionId, registry, { locality: opts.locality != null ? opts.locality : init.locality });
        // かたい こもの = スポットの めじるし(いえ・き など)
        world.obstacles = world.props.filter((pr) => pr.spot).map((pr) => ({ x: pr.x, z: pr.z, r: RULES.obstacleRadius }));
        party = companionsOf(registry);
        player = { x: 0, z: 140, face: 1, bob: 0, moving: false };
        camera.x = 0; camera.z = player.z; nearest = null;
        return world;
      }
      enterRegion(init.regionId || 'home');
      // いっしょに あるく なかま・こいびと: すこし うしろを ついてくる
      function followParty(dt) {
        const F = RULES.follow;
        party.forEach((a, i) => {
          const side = a.kind === 'partner' ? 1 : -1 - i;
          const tx = player.x + side * F.gap * (a.kind === 'partner' ? -player.face : 1), tz = player.z - F.back - i * F.spacing;
          const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
          if (d > F.snap) { const sp = Math.min(F.maxSpeed, d * 3); a.x += dx / d * sp * dt; a.z += dz / d * sp * dt; a.state = 'walk'; a.face = dx < 0 ? -1 : 1; a.bob += dt; }
          else if (a.state !== 'idle') a.state = 'idle';
          if (a.sayFor > 0) { a.sayFor -= dt; if (a.sayFor <= 0) { a.sayFor = 0; a.say = null; } }
        });
      }
      // 1 フレームぶん すすめる。input: { x: -1..1(よこ), y: -1..1(てまえ +) }。もどりち: おきた できごと
      function step(dt, input) {
        frame++;
        const events = [];
        const v = input || { x: 0, y: 0 };
        player.moving = !!(v.x || v.y);
        if (player.moving) {
          player.x += v.x * RULES.playerSpeed * dt; player.z -= v.y * RULES.playerSpeed * dt;
          clampToWorld(player, world); resolveObstacles(player, world);
          if (v.x) player.face = v.x < 0 ? -1 : 1; player.bob += dt;
        }
        camera.x += (player.x * RULES.cameraFollow - camera.x) * Math.min(1, dt * 4); camera.z = player.z;
        followParty(dt);
        for (let i = 0; i < world.residents.length; i++) {
          const a = world.residents[i];
          const near = Math.abs(a.z - player.z) < RULES.nearZ && Math.abs(a.x - player.x) < RULES.nearX;
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
      // いちばん ちかい ひとに はなしかける。もどりち: { actor, line } か null
      function talk() {
        if (!nearest) return null;
        const a = nearest; a.say = talkLine(a); a.sayFor = RULES.bubbleSec; a.face = player.x < a.x ? -1 : 1;
        if (a.chatWith) { a.chatWith.chatWith = null; a.chatWith = null; }
        a.state = 'idle'; a.until = 3.5;
        return { actor: a, line: a.say };
      }
      const metCount = () => world.residents.filter((r) => r.met).length;
      // レンダラーに わたす「いまの せかい」。ぜんぶ ワールド座標。かきかえない やくそく
      const view = () => ({ regionId: world.regionId, world, residents: world.residents, party, player, camera, nearest, env: envNow, frame });
      return {
        RULES, enterRegion, step, talk, view, hitTest, dist,
        setEnv(e) { envNow = e; }, get env() { return envNow; },
        setPlayer(x, z) { player.x = x; player.z = z; clampToWorld(player, world); camera.x = player.x * RULES.cameraFollow; camera.z = player.z; },
        get world() { return world; }, get party() { return party; }, get player() { return player; }, get camera() { return camera; }, get nearest() { return nearest; }, get registry() { return registry; },
        metCount,
      };
    }

    // ================= え(canvas ぎじ 3D レンダラー) =================
    // レンダラーの やくそく(canvas / 将来の three.js など、どれでも おなじ):
    //   createXxxRenderer({ canvas, W, H, tier, ... }) → { draw(view, now), destroy() }
    //   ・draw は sim.view() を うけとる。せかい たんい(x, z)だけ。がめんの px は ここの なかだけ
    //   ・view の なかみ(actor など)は かきかえない。じぶんの じょうたい(キャッシュ)は じぶんで もつ
    const imgCache = {};
    function imageFor(asset) {
      if (!asset || typeof Image === 'undefined') return null;
      let im = imgCache[asset];
      if (!im) { im = new Image(); im.decoding = 'async'; im.src = asset; imgCache[asset] = im; }
      return im.complete && im.naturalWidth > 0 ? im : null;
    }
    function hexToRgb(h) { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return [128, 128, 128]; const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
    function mix(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`; }
    function shade(hex, light, tintHex, tintAmt) { const c = hexToRgb(hex), t = hexToRgb(tintHex || '#ffffff'); const f = (i) => Math.round(clamp(lerp(c[i], t[i], tintAmt) * light, 0, 255)); return `rgb(${f(0)},${f(1)},${f(2)})`; }
    const TIME_LIGHT = { morning: { light: 0.92, tint: '#f8d4a6', amt: 0.18, sky: ['#ffd9a8', '#cfe6ff'] }, day: { light: 1, tint: '#ffffff', amt: 0, sky: ['#7fbfff', '#dff0ff'] }, evening: { light: 0.84, tint: '#eeac98', amt: 0.28, sky: ['#ff9a6a', '#ffd9c0'] }, night: { light: 0.55, tint: '#253f73', amt: 0.45, sky: ['#0d1638', '#2b3d78'] } };
    const WEATHER_LIGHT = { sunny: 1, cloudy: 0.86, rain: 0.72, snow: 0.8 };
    const SKY_OVERRIDE = { deepsea: ['#0b1d3a', '#163a66'], star_stop: ['#090a1f', '#2a2452'], memory_lake: ['#2a2d4d', '#5b6190'] };
    const ACTOR_SIZE = 96; // キャラの おおきさ(せかい たんい)

    function createCanvasRenderer(o) {
      const { ctx, W, H } = o; const tier = o.tier || 0;
      const playerGlyph = typeof o.playerGlyph === 'function' ? o.playerGlyph : () => '🐣';
      // とうえい: カメラは プレイヤーの CAM_BACK うしろ。おくほど ちいさく、じめんは すこし したへ まがる
      const F = W * 1.1, HOR = H * 0.4, CAM_Y = 250, CAM_BACK = 420, CURVE = 1 / 9000;
      const cap = tier >= 2 ? 30 : tier === 1 ? 44 : 60; // 同時に えがく かず(とおい ものから けずる。せかいから きえる わけではない)
      let skyCache = null;
      let cam = { x: 0, z: 0 };
      function project(x, z) { const dz = z - (cam.z - CAM_BACK); if (dz < 40) return null; const s = F / dz; const drop = dz * dz * CURVE; return { sx: W / 2 + (x - cam.x) * s, sy: HOR + (CAM_Y + drop) * s, s, dz }; }
      function drawSprite(a, p, size, alpha) {
        const px = size * p.s; if (px < 3) return;
        const im = imageFor(a.asset);
        ctx.save();
        if (alpha != null) ctx.globalAlpha = alpha;
        // かげ
        ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(p.sx, p.sy, px * 0.32, px * 0.09, 0, 0, Math.PI * 2); ctx.fill();
        const lift = a.state === 'swim' || a.state === 'sway' ? Math.sin(a.bob) * px * 0.06 : a.state === 'walk' || a.state === 'play' ? Math.abs(Math.sin(a.bob * 4)) * px * 0.08 : 0;
        const y = p.sy - lift;
        if (a.state === 'sleep') { ctx.globalAlpha *= 0.85; }
        if (im) {
          if (a.face < 0) { ctx.translate(p.sx, 0); ctx.scale(-1, 1); ctx.drawImage(im, -px / 2, y - px, px, px); }
          else ctx.drawImage(im, p.sx - px / 2, y - px, px, px);
        } else { ctx.font = `${Math.round(px * 0.9)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(a.emoji || '❓', p.sx, y); }
        ctx.restore();
        // じょうたいの しるし
        const mark = a.state === 'sleep' ? '💤' : a.state === 'chat' ? '💬' : a.state === 'fish' ? '🎣' : a.state === 'play' ? '✨' : a.state === 'watch' ? '👀' : null;
        if (mark && px > 18) { ctx.font = `${Math.round(px * 0.35)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(mark, p.sx + px * 0.4, y - px * 0.85 + Math.sin(a.bob) * 2); }
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
      function drawLabel(text, sx, sy) {
        ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 3;
        ctx.strokeText(text, sx, sy); ctx.fillText(text, sx, sy);
      }
      function draw(view, now) {
        if (!ctx) return;
        const { world, player, residents, party, nearest } = view; const e = view.env;
        cam = view.camera;
        const tl = TIME_LIGHT[e.time] || TIME_LIGHT.day; const wl = WEATHER_LIGHT[e.weather] || 0.9; const light = tl.light * wl;
        const sky = SKY_OVERRIDE[world.regionId] || tl.sky;
        // そら
        const skyKey = `${sky[0]}|${sky[1]}|${wl}`;
        if (!skyCache || skyCache.key !== skyKey) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, shade(sky[0], wl, '#ffffff', 0)); g.addColorStop(1, shade(sky[1], wl, '#ffffff', 0)); skyCache = { key: skyKey, g }; }
        ctx.fillStyle = skyCache.g; ctx.fillRect(0, 0, W, H);
        // じめん(おくから てまえへ おびで ぬる。おくほど かすんで、すこし したへ まがる)
        const near = cam.z - CAM_BACK + 40, far = Math.min(world.len + 300, near + 2600);
        const N = 34; let prev = project(0, far);
        for (let i = N - 1; i >= 0; i--) {
          const t = i / N; const z = near + (far - near) * t * t; const p = project(0, z); if (!p || !prev) { prev = p; continue; }
          const tt = Math.min(1, (z - near) / 2600);
          ctx.fillStyle = shade(mix(world.ground[0], world.ground[1], tt * 0.7), light, tl.tint, tl.amt + tt * 0.25);
          ctx.fillRect(0, p.sy, W, Math.max(1, prev.sy - p.sy + 1));
          prev = p;
        }
        // こみち(まんなかの おび)
        ctx.fillStyle = shade(world.path, light, tl.tint, tl.amt); ctx.beginPath();
        let first = true; const zs = []; for (let i = 0; i <= 20; i++) zs.push(near + (far - near) * (i / 20) * (i / 20));
        for (const z of zs) { const p = project(-150, z); if (!p) continue; if (first) { ctx.moveTo(p.sx, p.sy); first = false; } else ctx.lineTo(p.sx, p.sy); }
        for (let i = zs.length - 1; i >= 0; i--) { const p = project(150, zs[i]); if (p) ctx.lineTo(p.sx, p.sy); }
        ctx.closePath(); ctx.globalAlpha = 0.6; ctx.fill(); ctx.globalAlpha = 1;
        // みずべ
        for (const s of world.spots) if (s.kind === 'water') { const p = project(s.x, s.z); if (!p || p.s * s.r < 4) continue; ctx.fillStyle = shade('#6fb7e8', light, tl.tint, tl.amt); ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.ellipse(p.sx, p.sy, s.r * p.s, s.r * p.s * 0.32, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
        // 立て看板(こもの・じゅうみん・いっしょの なかま・じぶん)を おくから じゅんに
        const items = [];
        for (const pr of world.props) { const p = project(pr.x, pr.z); if (p && p.s * pr.size >= 3 && p.sx > -80 && p.sx < W + 80) items.push({ kind: 'prop', o: pr, p }); }
        for (const a of residents) { const p = project(a.x, a.z); if (p && p.s * ACTOR_SIZE >= 4 && p.sx > -60 && p.sx < W + 60) items.push({ kind: 'actor', o: a, p }); }
        for (const a of party) { const p = project(a.x, a.z); if (p) items.push({ kind: 'actor', o: a, p }); }
        const pp = project(player.x, player.z); if (pp) items.push({ kind: 'player', p: pp });
        items.sort((u, v) => v.p.dz - u.p.dz);
        const drawList = items.length > cap ? items.slice(items.length - cap) : items;
        for (const it of drawList) {
          if (it.kind === 'prop') { const px = it.o.size * it.p.s; ctx.font = `${Math.round(px)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.globalAlpha = clamp(1.4 - it.p.dz / 2600, 0.35, 1); ctx.fillText(it.o.emoji, it.p.sx, it.p.sy); ctx.globalAlpha = 1; }
          else if (it.kind === 'player') { const px = ACTOR_SIZE * it.p.s; ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(it.p.sx, it.p.sy, px * 0.32, px * 0.09, 0, 0, Math.PI * 2); ctx.fill(); const lift = player.moving ? Math.abs(Math.sin(player.bob * 5)) * px * 0.08 : 0; ctx.save(); if (player.face < 0) { ctx.translate(it.p.sx, 0); ctx.scale(-1, 1); } ctx.font = `${Math.round(px * 0.9)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(playerGlyph(), player.face < 0 ? 0 : it.p.sx, it.p.sy - lift); ctx.restore(); }
          else {
            const a = it.o; drawSprite(a, it.p, ACTOR_SIZE, clamp(1.5 - it.p.dz / 2600, 0.3, 1));
            const top = it.p.sy - ACTOR_SIZE * it.p.s;
            if (a.say && a.sayFor > 0) drawBubble(a.say, it.p.sx, top);
            else if (a === nearest && it.p.s > 0.45) drawLabel(a.label + (a.state && VERBS[a.state] ? '・' + VERBS[a.state] : ''), it.p.sx, top - 4);
          }
        }
        // てんき
        if (e.weather === 'rain' || e.weather === 'snow') { ctx.fillStyle = e.weather === 'rain' ? 'rgba(180,210,255,.55)' : 'rgba(255,255,255,.85)'; const n = tier >= 2 ? 14 : 30; for (let i = 0; i < n; i++) { const x = (i * 97 + (now * (e.weather === 'rain' ? 0.02 : 0.005) * (i % 3 + 1))) % (W + 20) - 10; const y = (i * 61 + now * (e.weather === 'rain' ? 0.5 : 0.08) * (1 + (i % 4) * 0.3)) % (H + 20) - 10; if (e.weather === 'rain') ctx.fillRect(x, y, 1.5, 9); else { ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2); ctx.fill(); } } }
        if (e.time === 'night') { ctx.fillStyle = 'rgba(10,15,45,.22)'; ctx.fillRect(0, 0, W, H); }
      }
      return { draw, project, destroy() { skyCache = null; } };
    }

    // ================= がめん(DOM + にゅうりょく + フレームループ) =================
    // ここは「せかい」と「え」を つなぐだけ。opts.renderer で レンダラーを さしかえられる:
    //   opts.renderer = ({ canvas, ctx, W, H, tier, playerGlyph }) => ({ draw(view, now), destroy() })
    function start(container, opts = {}) {
      const state = getState();
      const locality = typeof S.selectedLocality === 'function' ? S.selectedLocality() : null;
      const tier = typeof S.perfTier === 'function' ? S.perfTier() : 0;
      const sim = createSimulation({ regionId: state.regionId || 'home', locality });
      let running = true, rafId = null, last = null, frame = 0, banner = null, bannerUntil = 0, lastHint = null;
      const regionLabel = () => (typeof S.regionLabel === 'function' ? S.regionLabel(sim.world.regionId, sim.world.local) : sim.world.regionId);
      const HINT_DEFAULT = 'したのパッドをなぞって あるく。だれかに ちかづくと「はなす」';
      container.innerHTML = `
        <div class="mg-header mg-meguru-header"><span id="mgrPlace"></span><span id="mgrEnv"></span><span id="mgrFound"></span></div>
        <div class="mg-canvas-wrap mgr-wrap"><canvas class="mg-canvas" id="mgrCanvas"></canvas><div class="mgr-banner hidden" id="mgrBanner"></div></div>
        <div class="mg-hint mgr-hint" id="mgrHint">${HINT_DEFAULT}</div>
      `;
      const row = S.createPadRow(container, `<button type="button" class="mg-tap-btn primary" id="mgrTalk" data-key="action" disabled>💬 はなす</button><button type="button" class="mg-tap-btn" id="mgrTravel">🧭 たび</button><button type="button" class="mg-tap-btn" id="mgrHome">🏠 もどる</button>`);
      const pad = S.createTouchPad(row, { mode: 'vector', sticky: true, before: row.firstChild || null, label: 'ここを なぞって あるく' });
      const canvas = container.querySelector('#mgrCanvas');
      const { ctx, W, H } = S.createMgCanvas(canvas, 300, { grow: true, maxGrow: 1.9 });
      const placeEl = container.querySelector('#mgrPlace'), envEl = container.querySelector('#mgrEnv'), foundEl = container.querySelector('#mgrFound'), hintEl = container.querySelector('#mgrHint'), bannerEl = container.querySelector('#mgrBanner');
      const talkBtn = container.querySelector('#mgrTalk'), travelBtn = container.querySelector('#mgrTravel'), homeBtn = container.querySelector('#mgrHome');
      const rendererFactory = typeof opts.renderer === 'function' ? opts.renderer : createCanvasRenderer;
      const renderer = rendererFactory({ canvas, ctx, W, H, tier, playerGlyph: typeof S.playerGlyph === 'function' ? S.playerGlyph : () => '🐣' });
      const ENV_ICON = { sunny: '☀️', cloudy: '☁️', rain: '🌧️', snow: '🌨️' }; const TIME_ICON = { morning: '🌅', day: '🌞', evening: '🌇', night: '🌙' };
      const hud = () => {
        const e = sim.env;
        placeEl.innerHTML = regionLabel();
        envEl.textContent = `${TIME_ICON[e.time] || ''}${ENV_ICON[e.weather] || ''}`;
        foundEl.textContent = `であった ${sim.metCount()}／${sim.world.residents.length}`;
      };
      const showBanner = (text, ms) => { banner = text; bannerUntil = performance.now() + ms; bannerEl.textContent = text; bannerEl.classList.remove('hidden'); };
      const plainLabel = (id) => (typeof S.regionPlainLabel === 'function' ? S.regionPlainLabel(id, sim.world.local) : id);
      showBanner(`${plainLabel(sim.world.regionId)}を めぐる`, 1600);
      hud();
      function enterWorld(regionId) {
        sim.enterRegion(regionId, { registry: buildRegistry(), locality: typeof S.selectedLocality === 'function' ? S.selectedLocality() : null });
        sim.setEnv(env());
        talkBtn.disabled = true;
        showBanner(`${plainLabel(regionId)}に ついた`, 1600);
        hud();
      }
      function frameFn(now) {
        if (!running) return;
        if (last === null) last = now; const dt = Math.min(0.05, (now - last) / 1000); last = now; frame++;
        const st = getState();
        if (st.regionId !== sim.world.regionId) enterWorld(st.regionId || 'home');
        // かんきょうは 30フレームに 1かい よみなおす(てんき・じかんの けいさんは まいフレーム いらない)
        if (frame % 30 === 0) { const nx = env(); const changed = nx.time !== sim.env.time || nx.weather !== sim.env.weather; sim.setEnv(nx); if (changed) hud(); }
        // せかいを すすめる(にゅうりょくは パッドの ベクトルだけ)
        const events = sim.step(dt, pad.vector());
        for (const ev of events) {
          if (ev.type === 'met') { if (typeof S.recordMet === 'function') S.recordMet(ev.actor.key); hud(); }
          else if (ev.type === 'nearest') talkBtn.disabled = !ev.actor;
        }
        const nearest = sim.nearest;
        const hint = nearest ? `${nearest.label}が ${VERBS[nearest.state] || 'いる'}` : HINT_DEFAULT;
        if (hint !== lastHint) { lastHint = hint; hintEl.textContent = hint; }
        if (banner && now >= bannerUntil) { banner = null; bannerEl.classList.add('hidden'); }
        // え: よわい たんまつでは 2フレームに 1かい(せかいの けいさんは まいフレーム)
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
        pad.destroy(); renderer.destroy && renderer.destroy();
        if (typeof S.onExit === 'function') S.onExit();
      }
      rafId = requestAnimationFrame(frameFn);
      return { stop, get running() { return running; }, sim, renderer, get world() { return sim.world; }, get party() { return sim.party; }, get player() { return sim.player; }, talk, enterWorld, get nearest() { return sim.nearest; }, setPlayer(x, z) { sim.setPlayer(x, z); } };
    }

    return { WORLDS, HABITAT, NORMAL_REGIONS, RULES, buildRegistry, buildWorld, companionsOf, talkLine, chooseState, updateActor, createSimulation, createCanvasRenderer, start };
  };
})();
