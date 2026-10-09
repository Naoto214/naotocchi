// なおとっち — Character 3D System Pilot の 正本データ(three.js を つかわない。Node の テストでも よめる)。
//
// ながれ: species → body archetype → species parameters → stage parameters → attachments → material
//          → rig → locomotion → canonical emotion → 3D の 顔 / からだ の 表情 → presentation renderer
//
// ・デザインの 正本は 既存の 2D キャラ画像(assets/characters/**)だけ。ここの 色は その PNG から 取った もの。
//   外部作品の デザインは つかわない。2D 画像・Expression PNG・セーブは いっさい かえない
// ・「1 species = 1 専用 model」に しない。少ない archetype の builder に species / stage の 数字を わたす
// ・トポロジーが ほんとうに かわる 段(いもむし → さなぎ → ちょう など)だけ archetype を かえる(mesh variant)
// ・表情は 新しい 3D 専用の 体系を つくらない。canonical emotion(#368 Resident Expression と おなじ 8 語)を
//   そのまま うけて、3D の 顔 / からだ の 数字へ かえる adapter だけ ここに おく
// ・Pilot Human QA 承認後の Full Rollout v0。確認済み family から展開。Draft / main merge gate は維持。
(function (root, factory) {
  const rollout = typeof module === 'object' && module.exports ? require('./rollout-spec.js') : root.NaotocchiCharacter3DRollout;
  const api = factory(rollout);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NaotocchiCharacter3DSpec = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function (createRollout, nonPlayerCandidates) {
  'use strict';
  const freeze = (o) => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) freeze(v); } return o; };

  // ================= canonical emotion(#368 の 語彙と おなじ。ここでは ふやさない) =================
  // #368 resident-expression.js の EMOTIONS と 1 語も ちがわない こと(tests/character-3d-test.cjs が 写しで しばる)
  const CANONICAL_EMOTIONS = freeze(['normal', 'positive', 'dislike', 'tired', 'sleeping', 'strained', 'wantsPlay', 'sick']);
  // pilot で 人が 見て たしかめる 5 つ
  const PILOT_EMOTIONS = freeze(['normal', 'positive', 'dislike', 'tired', 'sick']);
  // QA で ならべる 2D の Expression PNG(Home の 正本 asset 名)。#368 の EXPRESSION_FOR.stage と おなじ 対応
  const REFERENCE_EXPRESSION = freeze({ normal: 'normal', positive: 'happy', dislike: 'sulky', tired: 'tired', sleeping: 'sleeping', strained: 'strained', wantsPlay: 'wantsPlay', sick: 'sick' });

  // #368 が まだ main に ない あいだ だけの つなぎ(住民の 生活の きもち → canonical)。
  // #368 が merge されたら window.NaotocchiResidentExpression.canonicalEmotion を つかい、これは けす。
  // 中身は #368 の LIFE_EMOTION の 写し(ふやさない・かえない)
  const PRE368_LIFE_EMOTION = freeze({ normal: 'normal', happy: 'positive', unhappy: 'dislike', tired: 'tired', sleeping: 'sleeping', strained: 'strained', wantsPlay: 'wantsPlay', positive: 'positive', dislike: 'dislike', sick: 'sick' });
  function canonicalEmotion(input, resident368) {
    if (resident368 && typeof resident368.canonicalEmotion === 'function') return resident368.canonicalEmotion(input);
    return Object.hasOwn(PRE368_LIFE_EMOTION, input) ? PRE368_LIFE_EMOTION[input] : 'normal';
  }

  // ================= 3D の 表情 adapter(canonical emotion → 顔 / からだ の 数字) =================
  //   eye   : open(0 とじ〜1 まる)・shape('round' | 'happy' ^ | 'squeeze' >< | 'flat' ー | 'droop' 半目)・lid(上まぶた 0〜1)
  //   brow  : angle(+ は 内がわが さがる = むっ、− は ハの字 = こまり)・show
  //   mouth : 'smile' | 'open' | 'frown' | 'pout' | 'wavy' | 'small' | 'yawn'
  //   blush : 0〜1 / marks : 顔の うえの しるし('gloom' = 青い たて線)
  //   body  : bounce(はねる)・droop(あたま / からだ が さがる 0〜1)・lean(− は のけぞる)・turn(そっぽ rad)・
  //           shiver(ふるえ)・tempo(うごきの はやさ ×)・squash(つぶれ)
  //   accent: あたまの うえの しるし(2D Home の accent と おなじ 意味)
  //   reaction: いっときの うごき(イベントで 1 かい)
  const EXPRESSION_3D = freeze({
    normal: { eye: { shape: 'round', open: 1, lid: 0 }, brow: { show: false, angle: 0 }, mouth: 'smile', blush: 0.35, marks: [], body: { bounce: 0, droop: 0, lean: 0, turn: 0, shiver: 0, tempo: 1, squash: 0 }, accent: null, reaction: null },
    positive: { eye: { shape: 'happy', open: 1, lid: 0 }, brow: { show: false, angle: 0 }, mouth: 'open', blush: 0.85, marks: [], body: { bounce: 1, droop: -0.15, lean: 0.05, turn: 0, shiver: 0, tempo: 1.35, squash: 0 }, accent: 'sparkle', reaction: 'hop' },
    dislike: { eye: { shape: 'round', open: 0.72, lid: 0.32 }, brow: { show: true, angle: 0.5 }, mouth: 'pout', blush: 0, marks: [], body: { bounce: 0, droop: 0.25, lean: -0.12, turn: 0.38, shiver: 0, tempo: 0.8, squash: 0 }, accent: 'cloud', reaction: 'huff' },
    tired: { eye: { shape: 'droop', open: 0.42, lid: 0.58 }, brow: { show: true, angle: -0.35 }, mouth: 'small', blush: 0.1, marks: [], body: { bounce: 0, droop: 0.65, lean: 0.1, turn: 0, shiver: 0, tempo: 0.55, squash: 0.06 }, accent: 'sleepy', reaction: 'yawn' },
    sick: { eye: { shape: 'squeeze', open: 0.5, lid: 0.2 }, brow: { show: true, angle: -0.55 }, mouth: 'wavy', blush: 0, marks: ['gloom'], body: { bounce: 0, droop: 0.45, lean: 0, turn: 0, shiver: 1, tempo: 0.6, squash: 0.03 }, accent: 'cool', reaction: 'wobble' },
    // pilot の 5 つ いがい(#368 から くる ことが ある ので かならず こたえる。QA の 主役では ない)
    sleeping: { eye: { shape: 'flat', open: 0, lid: 1 }, brow: { show: false, angle: 0 }, mouth: 'small', blush: 0.3, marks: [], body: { bounce: 0, droop: 0.8, lean: 0.12, turn: 0, shiver: 0, tempo: 0.35, squash: 0.08 }, accent: 'zz', reaction: null },
    strained: { eye: { shape: 'squeeze', open: 0.6, lid: 0 }, brow: { show: true, angle: -0.4 }, mouth: 'frown', blush: 0.2, marks: [], body: { bounce: 0, droop: 0.2, lean: -0.05, turn: 0, shiver: 0.4, tempo: 0.9, squash: 0.04 }, accent: 'strain', reaction: 'wobble' },
    wantsPlay: { eye: { shape: 'round', open: 1.1, lid: 0 }, brow: { show: false, angle: 0 }, mouth: 'open', blush: 0.5, marks: [], body: { bounce: 0.5, droop: -0.1, lean: 0.12, turn: 0, shiver: 0, tempo: 1.2, squash: 0 }, accent: 'call', reaction: 'hop' },
  });
  function expressionParams(emotion) {
    return EXPRESSION_3D[Object.hasOwn(EXPRESSION_3D, emotion) ? emotion : 'normal'];
  }

  // ================= body archetype(全 species の 監査から きめた もの) =================
  // pilot: この pilot で builder を つくった もの。planned: 監査で 必要と わかったが まだ builder が ない もの
  const ARCHETYPES = freeze({
    quadruped: { pilot: true, locomotion: 'quadWalk', note: '4 本足。座り / ふせ / 立ち は stage の idlePose。犬・猫・亀(甲羅)・竜(つばさ)・かえる成体 など' },
    humanoid: { pilot: true, locomotion: 'humanWalk', note: '2 頭身前後の 人型。はいはい(01)は idlePose。人・ぬいぐるみ・天使 など' },
    avian: { pilot: true, locomotion: 'waddle', note: '鳥。たまご形の からだ + つばさ / ひれ + くちばし + 足。ペンギン・ひよこ・ふくろう・火の鳥' },
    fish: { pilot: true, locomotion: 'swimHover', note: '流線形の からだ + ひれ。地面の うえに うかぶ。魚・おたまじゃくし・アザラシ(陸)' },
    larva: { pilot: true, locomotion: 'inchCrawl', note: '節の ある いもむし / 幼虫。からだは つながった 1 本(玉の ならびに しない)' },
    pod: { pilot: true, locomotion: 'hopSway', note: 'たね・さなぎ・まゆ。動かない 形に 顔。たね毛・芽・枝の つりさげ は attachment' },
    winged_insect: { pilot: true, locomotion: 'flutter', note: '大きな はねで うかぶ 昆虫(ちょう・ウスバカゲロウ)' },
    plant: { pilot: true, locomotion: 'plantSway', note: '葉の ロゼット / くき + 花。根もとを 地面に つけて ゆれる' },
    fungus: { pilot: true, locomotion: 'squashHop', note: 'かさ + え(柄)。顔は かさ or え(stage で かわる)' },
    cluster: { pilot: true, locomotion: 'clusterBob', note: '小さな 顔つきの 子が いくつも(胞子・わたげ・サンゴの 森・サクラの 花)' },
    radial: { pilot: true, locomotion: 'radialShuffle', note: '中心 + 放射の うで(ヒトデ・クラゲの エフィラ)' },
    blob: { pilot: true, locomotion: 'blobFloat', note: '手足の ない やわらかい からだ(おばけ・？？？・ぷにゅ・ヒトデ幼生)' },
    arthropod: { pilot: false, locomotion: 'skitter', note: 'かたい 節 + 6〜8 本足(カブト・クワガタ・セミ・ヤドカリ・クモ・サソリ)。planned' },
    tree: { pilot: false, locomotion: 'plantSway', note: '顔の ある みき + こずえ(サクラ・世界樹)。planned' },
    tentacled: { pilot: false, locomotion: 'pulseDrift', note: 'かさ / あたま + 多数の 触手(クラゲ・タコ・ポリプ・菌糸)。planned' },
    object: { pilot: false, locomotion: 'hopSway', note: '物に 顔(はこ・とけい・せきぞう・ゆきだるま)。planned' },
    celestial: { pilot: false, locomotion: 'none', note: '星雲・太陽・光。形より 光。3D 化せず 2D billboard + 光の 演出を すすめる。planned(special)' },
  });

  // ================= 全 species inventory(実データ: character-world-master.v1.js と 画像 64 枚を 見て きめた) =================
  // 8 段の 各段に archetype を つける(トポロジーが かわる species が ある ため)。attachments は 監査メモ
  const Q = 'quadruped', H = 'humanoid', A = 'avian', F = 'fish', L = 'larva', P = 'pod', W = 'winged_insect', PL = 'plant', FU = 'fungus', C = 'cluster', R = 'radial', B = 'blob', AR = 'arthropod', T = 'tree', TE = 'tentacled', O = 'object', CE = 'celestial';
  const PLAYER_LINES = freeze({
    man: { stages: [H, H, H, H, H, H, H, H], attachments: ['backpack(04-05)', 'briefcase(06)', 'cane(08)'] },
    woman: { stages: [H, H, H, H, H, H, H, H], attachments: ['plush(02)', 'hat(03)', 'bag(05-07)', 'cat(08)'] },
    ren: { stages: [H, H, H, H, H, H, H, H], attachments: ['ball(03)', 'backpack(04-05)'] },
    dog: { stages: [Q, Q, Q, Q, Q, Q, Q, Q], attachments: [] },
    cat: { stages: [Q, Q, Q, Q, Q, Q, Q, Q], attachments: [] },
    penguin: { stages: [A, A, A, A, A, A, A, A], attachments: ['cane(08)'] },
    turtle: { stages: [Q, Q, Q, Q, Q, Q, Q, Q], attachments: ['shell(01-08)', 'moss(08)'] },
    frog: { stages: [Q, Q, Q, Q, Q, Q, Q, Q], attachments: ['membrane-tail(01-05)', 'folded-limbs(03-08)'] },
    salmon: { stages: [F, F, F, F, F, F, F, F], attachments: ['yolk(01)'] },
    clownfish: { stages: [F, F, F, F, F, F, F, F], attachments: ['school(05)'] },
    butterfly: { stages: [L, L, L, L, P, W, W, W], attachments: ['branch(04-06)', 'empty-pupa(06)'] },
    beetle: { stages: [L, L, L, P, AR, AR, AR, AR], attachments: ['horn(05-08)'] },
    stagbeetle: { stages: [L, L, L, P, AR, AR, AR, AR], attachments: ['mandible(05-08)'] },
    cicada: { stages: [AR, AR, AR, AR, AR, AR, AR, AR], attachments: ['wings(05-08)', 'shell(05)'] },
    antlion: { stages: [AR, AR, AR, P, P, W, W, W], attachments: ['sand-pit(02-03)'] },
    hermit_crab: { stages: [AR, AR, AR, AR, AR, AR, AR, AR], attachments: ['shell(01-08)'] },
    jellyfish: { stages: [TE, TE, R, TE, TE, TE, TE, TE], attachments: ['rock(01-02)', 'bubbles'] },
    starfish: { stages: [B, B, R, R, R, R, R, R], attachments: ['bubbles(08)'] },
    coral: { stages: [B, TE, TE, TE, TE, C, C, C], attachments: ['rock-base(02-08)'] },
    dandelion: { stages: [P, PL, PL, PL, PL, PL, PL, C], attachments: ['pappus(01,07-08)'] },
    sakura: { stages: [P, P, T, T, C, C, C, T], attachments: ['dirt(02)'] },
    venus_flytrap: { stages: [P, PL, PL, PL, PL, PL, PL, PL], attachments: ['traps(02-08)', 'flowers(08)'] },
    mushroom: { stages: [C, FU, FU, FU, FU, FU, FU, FU], attachments: ['dirt(03-08)', 'spores(07)', 'child(08)'] },
    dragon: { stages: [Q, Q, Q, Q, Q, Q, Q, Q], attachments: ['horns(03-08)', 'wings(04-08)', 'fire(06)'] },
    phoenix: { stages: [A, A, A, A, A, A, A, CE], attachments: ['flame'] },
    god: { stages: [B, H, H, H, H, H, H, CE], attachments: ['halo', 'wings', 'staff'] },
    world_tree: { stages: [P, P, T, T, T, T, T, T], attachments: ['lights', 'fruit'] },
    ghost: { stages: [B, B, B, B, B, B, B, B], attachments: ['will-o-wisp(05-07)', 'halo(07-08)'] },
    star: { stages: [CE, CE, CE, CE, CE, CE, CE, CE], attachments: [] },
    plush: { stages: [H, H, H, H, H, H, H, H], attachments: ['bow', 'patches(05-07)', 'cape(08)'] },
    unknown: { stages: [B, B, B, B, B, B, B, B], attachments: ['antenna(04)', 'wings(05)', 'feet(03)'] },
  });
  const COMPANIONS = freeze({
    cat_friend: Q, rabbit_friend: Q, tanuki: Q, squirrel: Q, owl: A, otter: Q, hamster: Q, panda: Q, monkey: H, parrot: A, sheep: Q, seal: F, bat: Q,
    chicken: A, penguin_friend: A, hedgehog: Q, shiba: Q, snail: L, punyu: B, sekizou: O, chameleon: Q, clock: O, unicorn: Q, many_tail_fox: Q, watcher: B, box: O,
  });
  const PARTNERS = freeze({
    cat_ceo: H, robot_neighbor: H, field_cow: Q, sunflower_partner: PL, forest_bear: Q, grove_deer: Q, cliff_goat: Q, high_eagle: A, snow_spirit: H,
    snowman: O, rock_octopus: TE, sea_mermaid: H, anglerfish: F, swamp_croc: Q, gentle_gorilla: H, knitting_spider: AR, desert_scorpion: AR, oasis_cactus: PL,
  });
  const AUTHOR = freeze({ naoto: H });

  // master と 画像の ある もの だけで inventory を くむ(テストで master と つきあわせる)
  function inventory() {
    const rows = [];
    for (const [line, v] of Object.entries(PLAYER_LINES)) v.stages.forEach((a, i) => rows.push({ kind: 'form', id: line, stage: i + 1, archetype: a, asset: `assets/characters/${line}/0${i + 1}.png` }));
    for (const [id, a] of Object.entries(COMPANIONS)) rows.push({ kind: 'companion', id, stage: null, archetype: a, asset: `assets/characters/companions/${id}.png` });
    for (const [id, a] of Object.entries(PARTNERS)) rows.push({ kind: 'partner', id, stage: null, archetype: a, asset: `assets/characters/partners/${id}.png` });
    for (const [id, a] of Object.entries(AUTHOR)) rows.push({ kind: 'author', id, stage: null, archetype: a, asset: 'assets/characters/author/naoto.png' });
    return rows;
  }
  function archetypeCoverage() {
    const out = {};
    for (const r of inventory()) { const o = out[r.archetype] || (out[r.archetype] = { count: 0, pilot: ARCHETYPES[r.archetype].pilot, ids: new Set() }); o.count++; o.ids.add(r.id); }
    for (const k of Object.keys(out)) out[k].ids = [...out[k].ids];
    return out;
  }

  // ================= pilot species(形の ちがいが 大きい 8 系統) =================
  // 色は 2D 画像の 支配色(tools/character-3d/palette 監査)から。side / back は 2D に ない ので 補完(designFill に 記録)
  const PILOT = freeze({
    dog: {
      why: 'mammal / quadruped の 代表。耳(たれ → 立ち → たれ)・あし の ながさ・姿勢が 段で かわる',
      stages: {
        1: { archetype: Q, idlePose: 'lie', body: { len: 0.95, r: 0.42, chest: 1.0, hip: 0.95 }, head: { r: 0.46, squash: 0.92, snout: 0.16, snoutR: 0.17 }, legs: { len: 0.22, r: 0.11 }, neck: 0.08,
          ears: { type: 'floppy', len: 0.34, w: 0.2, tilt: 0.25 }, tail: { type: 'short', len: 0.2, r: 0.07 },
          colors: { base: '#f0a458', belly: '#f6c27e', muzzle: '#f6c27e', ear: '#8a4c26', nose: '#3a1a10', paw: '#e8964a' } },
        4: { archetype: Q, idlePose: 'playBow', body: { len: 1.12, r: 0.30, chest: 1.12, hip: 0.92 }, head: { r: 0.37, width: .96, squash: 1.0, snout: 0.20, snoutR: 0.14, eyeX:27, eyeSize:.24 }, legs: { len: 0.52, r: 0.095 }, neck: 0.2,
          ears: { type: 'pointy', len: 0.38, w: 0.23, tilt: -0.05 }, tail: { type: 'raised', len: 0.54, r: 0.095 },
          colors: { base: '#f0a458', belly: '#f8b868', muzzle: '#f8c88a', ear: '#c87838', nose: '#2a1010', paw: '#d88848' } },
        8: { archetype: Q, idlePose: 'sit', body: { len: 1.1, r: 0.37, chest: 1.22, hip: 1.0 }, head: { r: 0.38, squash: 0.9, snout: 0.22, snoutR: 0.17 }, legs: { len: 0.42, r: 0.11 }, neck: 0.12,
          ears: { type: 'floppy', len: 0.46, w: 0.24, tilt: 0.15 }, tail: { type: 'plume', len: 0.4, r: 0.09 },
          colors: { base: '#e2a058', belly: '#f6e6d4', muzzle: '#f4e2cc', ear: '#a85a2a', nose: '#2a1010', paw: '#d88848' }, fluff: 'chest' },
      },
      designFill: '背中・おしりは 2D の 正面寄り 3/4 から 色を のばした(背の まんなかを すこし こく)。しっぽの 先の 色は 2D の まま',
    },
    penguin: {
      why: 'bird / 2 足の 代表。ひなの ふわふわ → 換羽の まだら → 大人。08 は つえ(attachment)',
      stages: {
        1: { archetype: A, idlePose: 'sit', body: { h: 0.78, r: 0.48, belly: 0.6 }, head: { r: 0.42, merge: 0.7 }, beak: { len: 0.09, r: 0.07 }, wing: { len: 0.32, w: 0.12 }, feet: { len: 0.16 }, fluff: 0.9,
          colors: { base: '#c4bcae', back: '#b0a596', belly: '#f2ece0', face: '#f6eee4', beak: '#f0a030', feet: '#f0a030' } },
        4: { archetype: A, idlePose: 'stand', body: { h: 1.05, r: 0.44, belly: 0.62 }, head: { r: 0.40, merge: 0.60 }, beak: { len: 0.11, r: 0.06 }, wing: { len: 0.5, w: 0.13 }, feet: { len: 0.17 }, fluff: 0.45, patchy: true, raisedWing: true,
          colors: { base: '#5a5a50', back: '#4a4a44', belly: '#f6f4e4', face: '#f6f4e4', beak: '#f09828', feet: '#f09828', fluff: '#c8b8a8' } },
        8: { archetype: A, idlePose: 'stand', body: { h: 1.25, r: 0.52, belly: 0.66 }, head: { r: 0.44, merge: 0.55 }, beak: { len: 0.13, r: 0.06 }, wing: { len: 0.66, w: 0.15 }, feet: { len: 0.19 }, fluff: 0, normalEye: 'happy',
          colors: { base: '#363c48', back: '#2a303a', belly: '#f6f4e4', face: '#f6f4e4', beak: '#f09828', feet: '#f09828' }, attachments: ['cane'] },
      },
      designFill: '背中は 2D の 黒(04 は 灰の まだら)を そのまま 後ろへ。つえは 右の つばさで もつ',
    },
    clownfish: {
      why: 'fish / aquatic の 代表。地面から うかんで およぐ。01 は すけた 仔魚 → しま → 大きな ひれ',
      stages: {
        1: { archetype: F, body: { len: 1.02, h: 0.43, w: 0.24 }, tail: { len: 0.32, h: 0.34 }, fins: { dorsal: 0.12, pectoral: 0.13 }, bands: [], normalEye: 'content', translucent: 0.72, hover: 0.42,
          colors: { base: '#f8c898', belly: '#f8dcb8', fin: '#f8b888', band: '#ffffff', edge: '#f89868' } },
        4: { archetype: F, body: { len: 1.15, h: 0.68, w: 0.34 }, tail: { len: 0.32, h: 0.46 }, fins: { dorsal: 0.35, pectoral: 0.27 }, bands: [0.29, 0.55, 0.87], bandEdge: true, hover: 0.48,
          colors: { base: '#f87818', belly: '#f89828', fin: '#f88818', band: '#fbf8ee', edge: '#1e1414' } },
        8: { archetype: F, body: { len: 1.22, h: 0.80, w: 0.40 }, tail: { len: 0.38, h: 0.62 }, fins: { dorsal: 0.42, pectoral: 0.34 }, bands: [0.29, 0.55, 0.87], bandEdge: true, hover: 0.5,
          colors: { base: '#f87010', belly: '#f89828', fin: '#f88818', band: '#fbf8f4', edge: '#1e1414' } },
      },
      designFill: '反対がわの 面は 2D と 対称。ひれの うらは おもてと おなじ 色',
    },
    man: {
      why: 'biped / 人型の 代表(man・woman・ren・なかま / こいびとの 人型が つかう)。01 はいはい → 04 学生 → 08 つえ',
      stages: {
        1: { archetype: H, idlePose: 'crawl', head: { r: 0.5 }, body: { h: 0.42, r: 0.3 }, legs: { len: 0.22, r: 0.11 }, arms: { len: 0.26, r: 0.09 }, hair: { style: 'baby', vol: 0.9 }, clothing: 'romper',
          colors: { skin: '#f8d8b0', hair: '#7a4a32', top: '#b8d8f8', bottom: '#b8d8f8', shoe: '#b8d8f8', accent: '#98c8e8' } },
        4: { archetype: H, idlePose: 'stand', head: { r: 0.42 }, body: { h: 0.52, r: 0.25 }, legs: { len: 0.46, r: 0.1 }, arms: { len: 0.42, r: 0.08 }, hair: { style: 'spiky', vol: 1.0 }, clothing: 'jacket',
          colors: { skin: '#f8d8b4', hair: '#885848', top: '#384868', bottom: '#2c3a58', shoe: '#e8e8e8', accent: '#f4f4f4' }, attachments: ['backpack'] },
        8: { archetype: H, idlePose: 'stand', head: { r: 0.42 }, body: { h: 0.5, r: 0.28 }, legs: { len: 0.4, r: 0.11 }, arms: { len: 0.4, r: 0.085 }, hair: { style: 'soft', vol: 0.9 }, clothing: 'cardigan', stoop: 0.12,
          colors: { skin: '#f8d8a8', hair: '#c8bcbc', top: '#c89858', bottom: '#4c4444', shoe: '#5a3a28', accent: '#f6efe4' }, attachments: ['cane'] },
      },
      designFill: '後頭部の かみ・背中の 服・リュックの 背面は 2D の 色を のばして 補完',
    },
    butterfly: {
      why: '変態(トポロジーが かわる)の 代表。01 / 04 いもむし(larva)→ 05 さなぎ(pod)→ 08 ちょう(winged_insect)',
      stages: {
        1: { archetype: L, segments: 6, len: 1.2, r: 0.2, head: { r: 0.27 }, colors: { base: '#bce83a', belly: '#f4f6c4', spot: '#88c838', head: '#c8ec46', foot: '#78b838' } },
        4: { archetype: L, segments: 7, len: 1.2, r: 0.24, head: { r: 0.34 }, hang: true, colors: { base: '#a8d828', belly: '#f8e8b8', spot: '#68a828', head: '#b8dc38', foot: '#68b828' }, attachments: ['branch'] },
        5: { archetype: P, shape: 'chrysalis', h: 1.0, r: 0.3, colors: { base: '#a8e028', light: '#e8f828', dark: '#58a828' }, attachments: ['branch'] },
        8: { archetype: W, body: { len: 0.6, r: 0.09 }, head: { r: 0.2 }, wings: { span: 1.45, h: 0.8 }, antenna: 0.36, legs: { radius: .018, pairs: [[.02,.19,-.10,.14,-.18],[-.10,.21,-.23,.22,-.31],[-.21,.19,-.35,.16,-.44]] },
          colors: { wing: '#6898d8', wingDark: '#183878', wingLight: '#a8d8f8', dots: '#f8f8e0', body: '#1a2a58', face: '#f6f4e0' } },
      },
      designFill: 'はねの うらは おもてより うすい 青(2D に うらは ない)。いもむしの 背中の 斑点は 2D の 横から のばした',
    },
    dandelion: {
      why: 'plant の 代表。たね(pod)→ ロゼット(plant)→ 花(plant)→ わたげ(cluster)',
      stages: {
        1: { archetype: P, shape: 'seed', h: 0.62, r: 0.36, colors: { base: '#a87a50', light: '#e89858', dark: '#783848', pappus: '#ffffff' }, attachments: ['pappus'] },
        4: { archetype: PL, form: 'rosette', leaves: 10, leafLen: 0.85, bulb: 0.27, colors: { leaf: '#38c010', leafDark: '#0c5a10', vein: '#a8f808', bulb: '#f6f2d4' } },
        6: { archetype: PL, form: 'flower', leaves: 6, leafLen: 0.55, stem: 0.6, head: 0.36, petals: 18, colors: { leaf: '#2a9a28', leafDark: '#0c4818', vein: '#68b828', stem: '#2a8a30', petal: '#f8e818', petalDark: '#f8a808', face: '#f8c808' } },
        8: { archetype: C, unit: 'seedPuff', count: 6, spread: 0.62, connector: { radiusRatio: .025, opacity: .22, color: '#f8f5e8' }, colors: { base: '#c08a50', pappus: '#ffffff', face: '#f8eadc' } },
      },
      designFill: '葉の うらは おもてより こい 緑。花の うしろは がく(緑)を 補完',
    },
    mushroom: {
      why: 'fungus の 代表。胞子の むれ(cluster)→ わかい キノコ(顔が かさ)→ 大きな かさ(顔が え)+ 子キノコ',
      stages: {
        1: { archetype: C, unit: 'spore', count: 6, spread: 0.6, colors: { base: '#f8f4dc', blush: '#f8b898', face: '#f8f4dc' } },
        4: { archetype: FU, cap: { r: 0.43, h: 0.78, shape: 'cone' }, stem: { h: 0.42, r: 0.18 }, faceOn: 'cap', colors: { cap: '#f8f4cc', capDark: '#e8c898', stem: '#fbf8e8', gill: '#e8d8b0', dirt: '#6a4420', pebble: '#a07850' }, attachments: ['dirt'] },
        8: { archetype: FU, cap: { r: 0.8, h: 0.36, shape: 'flat', tilt: -.32, roll: -.10 }, stem: { h: 0.74, r: 0.32 }, faceOn: 'stem', colors: { cap: '#f88828', capDark: '#f8b848', stem: '#f8f2dc', gill: '#e8b888', dirt: '#482808', pebble: '#a07850' }, attachments: ['dirt', 'child'] },
      },
      designFill: 'かさの うら(ひだ)は 2D の 08 から。04 の うらは 補完',
    },
    starfish: {
      why: 'radial の 代表。01 は すけた 幼生(blob)、04 / 08 は 5 本うでの 星(あつみ・中心の からだ)',
      stages: {
        1: { archetype: B, shape: 'larva', h: 0.9, r: 0.38, translucent: 0.6, glow: '#2898f8', colors: { base: '#58b8f8', light: '#c8e8f8', edge: '#0838f8' } },
        4: { archetype: R, arms: 5, r: 0.62, armR: 0.36, thick: 0.32, curl: 0.18, colors: { base: '#f88898', light: '#f8b898', dark: '#d84878' } },
        8: { archetype: R, arms: 5, r: 0.72, armR: 0.23, thick: 0.19, curl: 0.07, dots: true, colors: { base: '#f06818', light: '#f8a028', dark: '#d81828', dot: '#fff4d8' }, attachments: ['bubbles'] },
      },
      designFill: 'うらがわ(管足の 面)は 色を こく した 無地。2D に ない',
    },
  });
  // archetype を つかいまわす ためしの なかま(形は builder + 数字だけ。pilot の 数には 入れない)
  const ARCHETYPE_REUSE = freeze({
    shiba: { archetype: Q, basedOn: 'dog', kind: 'companion', idlePose: 'playBow', markings: 'urajiro', body: { len: 0.81, r: 0.39, chest: 1.25, hip: 1.12 }, head: { r: 0.43, width:1.14, squash: 0.90, snout: 0.10, snoutR: 0.19, cheek: 0.32, eyeX:28, eyeSize:.23 }, coat: {width:.9,height:.92,depth:.55}, poseProfile:{bow:.38}, legs: { len: 0.30, r: 0.115 }, neck: 0.12,
      ears: { type: 'pointy', len: 0.26, w: 0.17, tilt: -0.05 }, tail: { type: 'curl', len: 0.70, r: 0.20 }, colors: { base: '#e89848', belly: '#f8e8d8', muzzle: '#f8e8d8', ear: '#d87838', nose: '#2a1010', paw: '#f8e8d8' } },
    cat_friend: { archetype: Q, basedOn: 'dog', kind: 'companion', idlePose: 'recline', normalEye:'droop', poseProfile:{yaw:-.85,roll:-.12,headYaw:.65}, patchMap:{head:[{at:[-.62,.28,.25],size:[.67,.92,1.1],color:'patch2'},{at:[.68,.5,0],size:[.7,.9,1.2],color:'patch'}],body:[{at:[-.5,.65,-.35],size:[1.0,.9,.6],color:'patch2'},{at:[.6,.4,-.6],size:[.8,1.0,.55],color:'patch'},{at:[-.7,.25,.50],size:[.65,.9,.36],color:'patch2'}]}, body: { len: 1.36, r: 0.27, chest: .91, hip: 1.1 }, head: { r: 0.32, width:1.08, squash: .87, snout: 0.035, snoutR: .095, eyeX:29,eyeSize:.33, eyeProfile:{width:1.25,tilt:.08} }, legs: { len: .34, r: .072 }, neck: .08,
      ears: { type: 'pointy', len: 0.24, w: 0.2, tilt: 0.1 }, tail: { type: 'hook', len: 0.87, r: 0.085 }, colors: { base: '#f6e6d6', belly: '#fbf2e8', muzzle: '#fbf2e8', ear: '#e89848', nose: '#e88888', paw: '#f6e6d6', patch: '#332a29', patch2: '#d89449' }, patches: true },
  });

  // Only these role-specific entries have passed four-view/state/distance image gates.
  const nonPlayerFactory = typeof module === 'object' && module.exports ? require('./nonplayer-spec.js') : globalThis.NaotocchiNonPlayerWave;
  const approvedNonPlayers = typeof nonPlayerFactory === 'function' ? nonPlayerFactory() : {};
  const NON_PLAYER = freeze(nonPlayerCandidates || Object.fromEntries(['companion:box','companion:clock','companion:owl','companion:punyu','companion:parrot','companion:chicken','companion:penguin_friend','companion:panda','companion:sheep','companion:seal','companion:bat','companion:snail','companion:chameleon','companion:sekizou','companion:rabbit_friend','companion:tanuki','companion:squirrel','companion:hamster','companion:otter','companion:monkey','companion:hedgehog','partner:sunflower_partner','partner:oasis_cactus'].filter(key=>approvedNonPlayers[key]).map(key=>[key,approvedNonPlayers[key]])));
  for (const [key,row] of Object.entries(NON_PLAYER)) {
    if (!['companion','partner','author'].includes(row.kind) || !/^[a-z_]+$/.test(row.id) || key !== row.kind+':'+row.id || !row.spec || !row.asset) throw new Error('Invalid non-player identity '+key);
  }
  const STAGE_KEYS = freeze(Object.fromEntries(Object.entries(PILOT).map(([id, p]) => [id, Object.keys(p.stages).map(Number)])));
  // Only visually reviewed family waves are included here. Pilot remains an immutable reference.
  const ROLLOUT = freeze(typeof createRollout === 'function' ? createRollout(PILOT, ARCHETYPE_REUSE) : {});
  const ROLLOUT_STAGE_KEYS = freeze(Object.fromEntries(Object.entries(ROLLOUT).map(([id,p])=>[id,Object.keys(p.stages).map(Number)])));
  // 1〜8 の どの 段も、pilot で つくった いちばん ちかい 段(おなじ archetype の なかで)へ。ない ときは null(→ 2D)
  function pilotStageFor(id, stage) {
    const p = PILOT[id];
    if (!p) return null;
    if (p.stages[stage]) return stage;
    const line = PLAYER_LINES[id];
    const want = line ? line.stages[stage - 1] : null;
    let best = null;
    for (const s of STAGE_KEYS[id]) { if (want && p.stages[s].archetype !== want) continue; if (best == null || Math.abs(s - stage) < Math.abs(best - stage) || (Math.abs(s - stage) === Math.abs(best - stage) && s < best)) best = s; }
    return best;
  }
  // actor(めぐるの player / 住人)→ 3D の spec キー。3D が ない ものは null(→ 2D billboard のまま)
  //   stage: めぐるの form は 0 はじまり(0〜7)。ここでは 1〜8
  function specKeyFor(ref) {
    if (!ref) return null;
    if (ref.kind && ref.kind !== 'form' && Object.hasOwn(NON_PLAYER,ref.kind+':'+ref.id)) return {id:ref.kind+':'+ref.id,stage:0,exact:true};
    if (ref.kind && ref.kind !== 'form') return Object.hasOwn(ARCHETYPE_REUSE, ref.id) && ARCHETYPE_REUSE[ref.id].kind === ref.kind ? { id: ref.id, stage: 0, exact: true } : null;
    const id = ref.line || ref.id, n = ref.stage != null ? Number(ref.stage) + (ref.zeroBased === false ? 0 : 1) : null;
    if (!Number.isInteger(n) || n < 1 || n > 8) return null;
    if (Object.hasOwn(ROLLOUT,id)) return ROLLOUT[id].stages[n] ? {id,stage:n,exact:true} : null;
    if (!Object.hasOwn(PILOT, id) || !Number.isInteger(n) || n < 1 || n > 8) return null;
    const s = pilotStageFor(id, n);
    return s == null ? null : { id, stage: s, exact: s === n };
  }
  function stageSpec(id, stage) {
    if (Object.hasOwn(NON_PLAYER,id)) return stage === 0 ? NON_PLAYER[id].spec : null;
    if (Object.hasOwn(ARCHETYPE_REUSE, id)) return ARCHETYPE_REUSE[id];
    if (Object.hasOwn(ROLLOUT,id)) return ROLLOUT[id].stages[stage] || null;
    const p = PILOT[id];
    return p && p.stages[stage] ? p.stages[stage] : null;
  }
  // 2D の 正本画像(QA の となりに ならべる・大きさを あわせる)
  function referenceAsset(id, stage, emotion) {
    if (Object.hasOwn(NON_PLAYER,id)) return stage === 0 ? NON_PLAYER[id].asset : null;
    if (Object.hasOwn(ARCHETYPE_REUSE, id)) return `assets/characters/${ARCHETYPE_REUSE[id].kind}s/${id}.png`;
    const st = '0' + stage, e = REFERENCE_EXPRESSION[emotion || 'normal'];
    return !emotion || e === 'normal' ? `assets/characters/${id}/${st}.png` : `assets/characters/expressions/${id}/${st}-${e}.png`;
  }

  return freeze({
    CANONICAL_EMOTIONS, PILOT_EMOTIONS, REFERENCE_EXPRESSION, PRE368_LIFE_EMOTION, canonicalEmotion,
    EXPRESSION_3D, expressionParams,
    ARCHETYPES, PLAYER_LINES, COMPANIONS, PARTNERS, AUTHOR, inventory, archetypeCoverage,
    PILOT, ARCHETYPE_REUSE, NON_PLAYER, STAGE_KEYS, ROLLOUT, ROLLOUT_STAGE_KEYS, pilotStageFor, specKeyFor, stageSpec, referenceAsset,
  });
});
