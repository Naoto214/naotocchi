'use strict';
// お世話の頻度 監査(2026-11-25): 現行・A・B・C の 4案を、
// script.js / care-status.js への「最小限の差し替え」として定義する。
//
// 同じ定義を
//   - tools/care-pace/simulate.cjs(本物の script.js を VM で動かす シミュレーション)
//   - comparisons/care-pace-20261125/play.html(本物の ゲームを 案ごとに 試遊する ページ)
// の両方で使う。数値の表と 実装が ずれないように、案の中身は この1か所だけに書く。
//
// 本番の script.js は書きかえない。どの差し替えも「元の文字列が ちょうど1回 ある」ことを
// たしかめてから当てる(本体が変わって 差し替えが 外れたら、黙って 現行の まま 動かさない)。

const PLAN_IDS = ['current', 'A', 'B', 'C', 'B2', 'V3'];

// 各案の「つまみ」。current は 現行の script.js の値そのもの(差し替えなし)。
const PLANS = {
  current: {
    id: 'current', label: '現行', short: '現行',
    summary: '今の main と同じ。',
    hungerDecay: 0.35, happyDecay: 0.35, energyDecay: 0.32, sleepDecayFactor: 0.4,
    poop: { mode: 'random', perTick: 0.035, sleepFactor: 1 },
    fullPoopHappyPenalty: 2, neglectPoop: 3, sicknessChance: 0.03,
    feedAmount: 25, petAmount: 5, spamThreshold: 3,
    recentActionTicks: 20, contentFactor: 1, autoWakeTicks: 0,
    envMomentMinMs: 150000, envMomentSpanMs: 150000, envMomentMult: 1,
    relationDecayYears: 28, poopNotice: 2,
    feedGrowth: 4, cleanGrowth: 4, stableGrowth: 0.1,
  },
  A: {
    id: 'A', label: 'A案 軽度の緩和', short: 'A',
    summary: '今の手ざわりのまま、いちばん忙しい「ごきげん」「うんち」を2〜3割ゆるめる。',
    hungerDecay: 0.28, happyDecay: 0.26, energyDecay: 0.26, sleepDecayFactor: 0.4,
    poop: { mode: 'random', perTick: 0.024, sleepFactor: 0.5 },
    fullPoopHappyPenalty: 1, neglectPoop: 3, sicknessChance: 0.02,
    feedAmount: 25, petAmount: 6, spamThreshold: 3,
    recentActionTicks: 40, contentFactor: 1, autoWakeTicks: 0,
    envMomentMinMs: 150000, envMomentSpanMs: 150000, envMomentMult: 1,
    relationDecayYears: 28, poopNotice: 2,
    feedGrowth: 4, cleanGrowth: 5, stableGrowth: 0.13,
  },
  B: {
    id: 'B', label: 'B案 ゆったりとした育成', short: 'B',
    summary: '必要なお世話は3〜4分に1回程度。うんちは間隔をそろえ、ねている間はほとんど出ない。おなかと清潔が満たされていればごきげんはゆっくり減る。',
    hungerDecay: 0.2, happyDecay: 0.2, energyDecay: 0.2, sleepDecayFactor: 0.25,
    poop: { mode: 'timer', minTicks: 50, maxTicks: 90, sleepFactor: 0.3 },
    fullPoopHappyPenalty: 0.5, neglectPoop: 4, sicknessChance: 0.015,
    feedAmount: 30, petAmount: 7, spamThreshold: 4,
    recentActionTicks: 100, contentFactor: 0.7, autoWakeTicks: 30,
    envMomentMinMs: 90000, envMomentSpanMs: 90000, envMomentMult: 1.5,
    relationDecayYears: 40, poopNotice: 3,
    feedGrowth: 5, cleanGrowth: 6, stableGrowth: 0.17,
  },
  C: {
    id: 'C', label: 'C案 鑑賞・癒やし重視', short: 'C',
    summary: '10分以上ながめていても困らない。お世話は「したいとき」が中心で、放っておき続けたときだけ悪くなる。',
    hungerDecay: 0.13, happyDecay: 0.13, energyDecay: 0.14, sleepDecayFactor: 0.2,
    poop: { mode: 'timer', minTicks: 80, maxTicks: 140, sleepFactor: 0 },
    fullPoopHappyPenalty: 0.25, neglectPoop: 4, sicknessChance: 0.008,
    feedAmount: 35, petAmount: 8, spamThreshold: 5,
    recentActionTicks: 200, contentFactor: 0.6, autoWakeTicks: 60,
    envMomentMinMs: 60000, envMomentSpanMs: 60000, envMomentMult: 2,
    relationDecayYears: 56, poopNotice: 3,
    feedGrowth: 6, cleanGrowth: 8, stableGrowth: 0.19,
  },
};
// B2 = B案 VERSION 2(2026-11-25 追加検証)。B案の数値は そのままに、
// 睡眠で 遊びが 止まらないこと・案内に 従って 損を しないこと・死亡の 前に かならず 予告と 猶予が あること を 足した もの。
PLANS.B2 = Object.assign({}, PLANS.B, {
  id: 'B2', label: 'B案 VERSION 2', short: 'B2',
  summary: 'B案に、寝ている間のごはん・あそぶ・じゃれる等で そっと起きる、夜は少し長く眠る、じゃれるの「しつこい」を時間で戻す、けんこう0でも かならず「おわかれのまえぶれ」と猶予を出す、を加えたもの。',
  wakeOnAction: true,          // ねている間の ごはん・あそぶ・じゃれる・きゅうあい・たび → そっと起きて そのまま
  autoWakeNightTicks: 60,      // 夜は げんきが戻ってから 3分 ねている(昼は 90秒)
  spamDecline: 0,              // じゃれすぎ: ごきげんも おとろえも へらさない(せいちょうが 入らない だけ。現行 −5 / +6)
  affectionCalmTicks: 5,       // じゃれない 15秒ごとに「つづけて じゃれた 回数」を 1 もどす
  rescuePause: true,           // まえぶれの 間、お世話を 続けて いれば 猶予は へらない(30秒 なにも しないと へりはじめる)。ろうねん(70さい〜)の 老衰には かけない
  petGrowthWaitTicks: 10,      // じゃれるの せいちょうは 30秒に 1回まで(じゃれる 連打が ミニゲームの 代わりの 稼ぎに ならない ように)
  poopSickGraceTicks: 40,      // うんちが 満杯に なってから 2分は 病気の 抽選に 入れない
  healthDeathGrace: true,      // けんこう0が 続いても、即死せず「おわかれの まえぶれ」を 通す
  dyingGraceTicks: 60,         // まえぶれの 猶予 3分(現行 2分)
  offlineDecay: 0.14,          // 閉じている間の おなか・ごきげん(/tick)。ひらいている時(0.20)より おだやかに(現行 0.25 > 0.20 で 逆転していた)
  sleepingFeedNotice: true,    // ねている時の「おなかがすいている」: おすすめを「ごはん」に(押せば 起きて 食べる)
});

// V3 = 最終調整(2026-11-25 VERSION 3)。B2 を そのまま 土台に、
//   睡眠中の すべての 操作で 起きる / ミニゲームの げんき消費 / なかま・こいびとの きずなを「一緒に くらす」ことで たもつ /
//   実績・フェニックス・アイテムの 調整 を 足す。比較の ための つまみは --override で かえられる。
PLANS.V3 = Object.assign({}, PLANS.B2, {
  id: 'V3', label: 'VERSION 3(最終候補)', short: 'V3',
  summary: 'B2案に、寝ている間のすべての操作で起きる、ミニゲームのげんき消費 8、暮らしが落ちついている間は きずなが 50 より下がらない・訪れている なかまとは 一緒に すごすだけで きずなが 育つ、実績・フェニックス・アイテムの調整 を加えた最終候補。',
  wakeOnAllActions: true,      // デート・現在地への移動・なかまの さそい・たびの 開始判定も 起きて 応じる
  minigameEnergy: 8,           // ミニゲーム1回の げんき(現行 12)
  relationFloor: 50,           // 暮らしが 落ちついている(びょうきでなく おなか・ごきげん・けんこう 40いじょう)間は、きずな・なかよし度が これより 下がらない
  visitBondPerTick: 0.2,       // いま 家に 来ている なかま・こいびとの きずなが 1tickごとに ふえる
  fullPoopHappyPenalty: 0.25,  // うんち満杯の ごきげん低下(B2 0.5)
  poopSickGraceTicks: 80,      // うんち満杯から 4分は 病気の 抽選に 入れない(B2 2分)
  achievementsV3: true,        // ごはん12・そうじ15・病気を なおす 通算3/8・かんびょうのきろく→ねがおの見守り(通算10)
  phoenixRebirth: true,        // フェニックス: 生まれかわり(過去の人生 3回いじょう、そだち60なら 2回)・40さい いこうの 抽選
  oldAgeGraceTicks: 40,        // ろうねん(70さい〜)の まえぶれの 猶予は 現行どおり 2分(3分に すると 99さいの 老衰が 100さいに まにあって しまう)
  neglectGraceTicks: 60,       // 「おこたり」が 3分 続いて から 病気の 抽選に 入る
  healthDrainScale: 0.6,       // 体調を くずした ときの けんこうの へり(現行の 0.6倍)
  itemsV3: { autoThreshold: 40, scarfAid: true, scarfNoCount: true, pillowRest: true, relationItemFloor: 60 },
  // アイテムの 値段・説明(item-system.js)。説明は 画面に 出る 文、guard は 開発用の 決まり
  itemCatalog: {
    sleepboost1: { price: 2000, desc: 'ねると、すぐにげんきが満タン。ねている間は、おなか・ごきげんが減らず、うんちも出ない。',
      guard: '睡眠後の時間限定バフは付けない。ねている間の自然減とうんちを止めるだけで、睡眠回数・十分に寝た時の成長判定は維持する。' },
    bowtie: { price: 1500, guard: 'おなか40以下で100。手動の食事回数・実績等を増やさない。' },
    ribbon: { price: 1000, guard: 'ごきげん40以下で100。専用リアクションは維持し、手動のじゃれる回数・実績等を増やさない。' },
    scarf: { price: 2000, desc: '病気になると、自動で治してくれる。様子がおかしいときは、1回だけ手当てもする。',
      guard: '発病後の自動治療と、おわかれのまえぶれ1回につき1回の手当て(けんこう+30)。まえぶれ・猶予は消さない。治療回数・病気の実績・フェニックスには数えない。' },
    partner1: { desc: 'こいびとのなかよし度が60より下がらず、いつでも家に来てくれる。',
      guard: 'なかよし度の下限を60にする。すれちがい中は下限なし。交際成立・仲直り・結婚は自動化しない。手紙の思い出表示は残す。' },
    bond1: { desc: 'なかまのきずなが60より下がらず、いつでも家にあそびに来る。',
      guard: 'きずなの下限を60にする。じゃれる回数・加入・シール・実績は増やさない。' },
  },
});

function num(v) { return String(Math.round(v * 100000) / 100000); }

// script.js への 差し替え一覧(find は 本体に ちょうど1回 ある 文字列)。
function scriptPatches(plan) {
  const P = PLANS[plan] || plan;
  if (P.id === 'current') return [];
  const out = [];
  const add = (why, find, replace) => out.push({ why, find, replace });

  add('ねている間の おなか・ごきげんの へりかた',
    'const sleepFactor = state.isSleeping ? 0.4 : 1;',
    `const sleepFactor = state.isSleeping ? ${num(P.sleepDecayFactor)} : 1;`);
  add('おなかの 自然減',
    'state.hunger = clamp(state.hunger - 0.35 * sleepFactor * legendFactor * envMod.hunger, 0, 100);',
    `state.hunger = clamp(state.hunger - ${num(P.hungerDecay)} * sleepFactor * legendFactor * envMod.hunger, 0, 100);`);
  const content = P.contentFactor !== 1
    ? ` * ((!state.isSick && state.hunger >= 50 && state.poopCount < 2) ? ${num(P.contentFactor)} : 1)`
    : '';
  add('ごきげんの 自然減' + (content ? '(おなかと清潔が満たされている間は ゆっくり)' : ''),
    'state.happiness = clamp(state.happiness - 0.35 * sleepFactor * legendFactor * envMod.happy, 0, 100);',
    `state.happiness = clamp(state.happiness - ${num(P.happyDecay)} * sleepFactor * legendFactor * envMod.happy${content}, 0, 100);`);
  add('げんきの 自然減(おきている間)',
    'state.energy = clamp(state.energy - 0.32 * energyDecayMultiplier() * legendFactor, 0, 100);',
    `state.energy = clamp(state.energy - ${num(P.energyDecay)} * energyDecayMultiplier() * legendFactor, 0, 100);`);

  if (P.poop.mode === 'random') {
    add('うんちの 出かた(1tickごとの抽選)',
      'if (Math.random() < 0.035 && state.poopCount < MAX_POOP) {',
      `if (Math.random() < ${num(P.poop.perTick)} * (state.isSleeping ? ${num(P.poop.sleepFactor)} : 1) && state.poopCount < MAX_POOP) {`);
  } else {
    // 間隔を そろえる: 次の うんちまでの のこり tick を もち、ねている間は ゆっくり(または 止める)。
    add('うんちの 出かた(間隔をそろえる)',
      'if (Math.random() < 0.035 && state.poopCount < MAX_POOP) {\n        state.poopCount += 1;\n      }',
      `if (!(state.poopTimer > 0)) state.poopTimer = ${P.poop.minTicks} + Math.random() * ${P.poop.maxTicks - P.poop.minTicks};\n` +
      `      state.poopTimer -= state.isSleeping ? ${num(P.poop.sleepFactor)} : 1;\n` +
      `      if (state.poopTimer <= 0) {\n        if (state.poopCount < MAX_POOP) state.poopCount += 1;\n` +
      `        state.poopTimer = ${P.poop.minTicks} + Math.random() * ${P.poop.maxTicks - P.poop.minTicks};\n      }`);
  }
  add('うんちが いっぱいの ときの ごきげん低下(1tickごと)',
    'state.happiness = clamp(state.happiness - 2, 0, 100);',
    `state.happiness = clamp(state.happiness - ${num(P.fullPoopHappyPenalty)}, 0, 100);`);
  add('「おこたり」と みなす うんちの数',
    'const neglected = state.poopCount >= 3 || state.health < 40 || state.hunger < 20 || state.happiness < 20;',
    `const neglected = state.poopCount >= ${P.neglectPoop} || state.health < 40 || state.hunger < 20 || state.happiness < 20;`);
  add('おこたり中に びょうきになる確率(1tickごと)',
    'const sicknessChance = 0.03;',
    `const sicknessChance = ${num(P.sicknessChance)};`);
  add('ごはん1回で もどる おなか',
    'state.hunger = clamp(state.hunger + 25, 0, 100);',
    `state.hunger = clamp(state.hunger + ${P.feedAmount}, 0, 100);`);
  add('じゃれる1回で もどる ごきげん',
    '      state.happiness = clamp(state.happiness + 5, 0, 100);\n      applyGrowth(1.5); applyDecline(-2);',
    `      state.happiness = clamp(state.happiness + ${P.petAmount}, 0, 100);\n      applyGrowth(1.5); applyDecline(-2);`);
  add('じゃれるを 続けて よろこぶ回数',
    'const AFFECTION_SPAM_THRESHOLD = 3;',
    `const AFFECTION_SPAM_THRESHOLD = ${P.spamThreshold};`);
  add('「さいきん お世話した」と みなす時間(安定ボーナス)',
    'const RECENT_ACTION_TICKS = 20; // 60秒',
    `const RECENT_ACTION_TICKS = ${P.recentActionTicks}; // ${P.recentActionTicks * 3}秒(お世話頻度 監査 ${P.short}案)`);
  add('こいびと・なかまの きずなが 0になるまでの 年数',
    'const RELATION_DECAY_YEARS = 28;',
    `const RELATION_DECAY_YEARS = ${P.relationDecayYears};`);
  add('自然の できごと(虹・夕やけ など)の 間隔',
    'const delay = 150000 + Math.random() * 150000;',
    `const delay = ${P.envMomentMinMs} + Math.random() * ${P.envMomentSpanMs};`);
  if (P.envMomentMult !== 1) {
    add('自然の できごとで もらえる ごきげん',
      'if (m.happiness) state.happiness = clamp(state.happiness + m.happiness, 0, 100);',
      `if (m.happiness) state.happiness = clamp(state.happiness + (m.happiness > 0 ? Math.round(m.happiness * ${num(P.envMomentMult)}) : m.happiness), 0, 100);`);
  }
  if (P.feedGrowth !== 4) add('ごはん1回の せいちょう',
    'applyGrowth(4); applyDecline(-4);', `applyGrowth(${num(P.feedGrowth)}); applyDecline(-4);`);
  if (P.cleanGrowth !== 4) add('そうじ1回の せいちょう',
    'applyGrowth(4); applyDecline(-5);', `applyGrowth(${num(P.cleanGrowth)}); applyDecline(-5);`);
  if (P.stableGrowth !== 0.1) add('よい状態で すごしている間の せいちょう(安定ボーナス、1tickごと)',
    'applyGrowth(0.1, { silent: true });', `applyGrowth(${num(P.stableGrowth)}, { silent: true });`);
  if (P.wakeOnAction) {
    add('ねている間に 押したら そっと起きる(共通の 手つづき)',
      '  function withFeedback(fn, afterRender) {',
      '  // お世話頻度 監査 B2: ねている間に ごはん・あそぶ・じゃれる などを 押したら、そっと 起きて そのまま する\n' +
      '  function wakeForAction() {\n    if (!state.isSleeping) return;\n    state.isSleeping = false;\n    stopSleepRecovery();\n' +
      '    if (state.sleptTicks >= 20) { applyGrowth(3); applyDecline(-3); }\n    state.sleptTicks = 0;\n' +
      "    if (audio && audio.play) audio.play('wake');\n  }\n\n  function withFeedback(fn, afterRender) {");
    add('ねている間の ごはん → 起きて 食べる',
      "if (state.isSleeping) {\n      setActionComment(randomBlockedMessage('sleepingFeed'));\n      return;\n    }",
      'if (state.isSleeping) wakeForAction();');
    add('ねている間の じゃれる → 起きて じゃれる',
      "if (state.isSleeping) {\n      setActionComment(randomBlockedMessage('sleepingPet'));\n      return;\n    }",
      'if (state.isSleeping) wakeForAction();');
    add('ねている間の きゅうあい → 起きて する',
      "if (state.isSleeping) {\n      setActionComment(randomBlockedMessage('sleepingCourt'));\n      return;\n    }",
      'if (state.isSleeping) wakeForAction();');
    add('ねている間の あそぶ → げんきが 30 あれば 起きて あそぶ(ねた直後の 1〜2秒だけ まつ)',
      "    if (state.isSleeping) {\n      setActionComment(randomBlockedMessage('sleepingPlay'));",
      "    if (state.isSleeping && state.energy >= 30) wakeForAction();\n    if (state.isSleeping) {\n      setActionComment(randomBlockedMessage('sleepingPlay'));");
    add('ねている間の めぐる → 起きて 出かける',
      "if (state.isSleeping) { setActionComment(randomBlockedMessage('sleepingTravel')); saveState(); render(); return false; }",
      'if (state.isSleeping) wakeForAction();');
    add('ねている間の たび → 起きて 出かける',
      "if (state.isSleeping) { setActionComment(randomBlockedMessage('sleepingTravel'));saveState();render();return false; }",
      'if (state.isSleeping) wakeForAction();');
  }
  if (P.spamDecline != null) add('じゃれすぎ: ごきげんを へらさない',
    '    if (spammed) {\n      state.happiness = clamp(state.happiness - 5, 0, 100);\n      applyDecline(6);',
    P.spamDecline ? `    if (spammed) {\n      applyDecline(${num(P.spamDecline)});` : '    if (spammed) {\n      // お世話頻度 監査 B2: いやがる 反応だけ。ごきげん・おとろえは かえない');
  if (P.rescuePause) {
    add('お世話を したら「看病中」の しるしを つける(30秒)',
      'function markCared() { state.recentActionTicks = RECENT_ACTION_TICKS; }',
      'function markCared() { state.recentActionTicks = RECENT_ACTION_TICKS; state.rescueTicks = 10; }');
    add('看病の しるしは 30秒で きえる',
      '  function updateDyingWarning() {',
      '  function updateDyingWarning() {\n    const caring = state.rescueTicks > 0 && currentAge() < 70; // お世話頻度 監査 B2: 老衰には かけない\n    if (state.rescueTicks > 0) state.rescueTicks -= 1;');
    add('まえぶれの 間、看病が 続いて いれば 猶予を へらさない',
      '      } else if (state.dyingTicks > 0) {\n        state.dyingTicks -= 1;\n      }',
      '      } else if (!caring && state.dyingTicks > 0) {\n        state.dyingTicks -= 1; // 看病中は 猶予が へらない\n      }');
  }
  if (P.affectionCalmTicks) add('じゃれない時間で「つづけて じゃれた 回数」を もどす',
    'if (state.recentActionTicks > 0) state.recentActionTicks -= 1;',
    'if (state.recentActionTicks > 0) state.recentActionTicks -= 1;\n' +
    `    state.affectionCalmTicks = (state.affectionCalmTicks || 0) + 1;\n    if (state.affectionCalmTicks >= ${P.affectionCalmTicks}) { state.affectionCalmTicks = 0; if (state.affectionStreak > 0) state.affectionStreak -= 1; }`);
  if (P.healthDeathGrace) add('けんこう0が 続いても かならず「おわかれの まえぶれ」を 通す',
    '        } else {\n          triggerDeath();\n        }\n      }\n\n      // 「死亡」メーターは',
    '        } else if (!state.dying) {\n          // お世話頻度 監査 B2: 予告なしに 死なせない。まえぶれ(猶予つき)を 先に 出す\n' +
    '          state.deathMeter = Math.max(state.deathMeter, 80);\n          updateDyingWarning();\n' +
    '        } else if (state.dyingTicks <= 0) {\n          triggerDeath();\n        }\n      }\n\n      // 「死亡」メーターは');
  if (P.oldAgeGraceTicks) add('ろうねん(70さい〜)の まえぶれの 猶予は 現行の まま(老衰の 時期を かえない)',
    '        state.dyingTicks = DYING_GRACE_TICKS;',
    `        state.dyingTicks = currentAge() >= 70 ? ${P.oldAgeGraceTicks} : DYING_GRACE_TICKS; // ろうねんは 現行と 同じ ${P.oldAgeGraceTicks * 3 / 60}分(老衰に 影響させない)`);
  if (P.dyingGraceTicks) add('おわかれの まえぶれの 猶予',
    'const DYING_GRACE_TICKS = 40; // 2分',
    `const DYING_GRACE_TICKS = ${P.dyingGraceTicks}; // ${P.dyingGraceTicks * 3 / 60}分(お世話頻度 監査 ${P.short})`);
  if (P.offlineDecay) {
    add('閉じている間の おなかの へり(ひらいている時より おだやかに)',
      'state.hunger = clamp(cap(state.hunger, 0.25 * factor), 0, 100);',
      `state.hunger = clamp(cap(state.hunger, ${num(P.offlineDecay)} * factor), 0, 100);`);
    add('閉じている間の ごきげんの へり',
      'state.happiness = clamp(cap(state.happiness, 0.25 * factor), 0, 100);',
      `state.happiness = clamp(cap(state.happiness, ${num(P.offlineDecay)} * factor), 0, 100);`);
  }
  if (P.petGrowthWaitTicks) {
    add('じゃれるの せいちょうは 30秒に 1回まで',
      `      state.happiness = clamp(state.happiness + ${P.petAmount}, 0, 100);\n      applyGrowth(1.5); applyDecline(-2);`,
      `      state.happiness = clamp(state.happiness + ${P.petAmount}, 0, 100);\n      if (!(state.petGrowthWait > 0)) { applyGrowth(1.5); applyDecline(-2); state.petGrowthWait = ${P.petGrowthWaitTicks}; }`);
    add('じゃれるの せいちょうの まち時間を へらす',
      'if (state.boostTicks > 0) state.boostTicks -= 1;',
      'if (state.boostTicks > 0) state.boostTicks -= 1;\n    if (state.petGrowthWait > 0) state.petGrowthWait -= 1;');
  }
  if (P.poopSickGraceTicks) {
    add('うんちが 満杯に なってからの 時間を かぞえる',
      `      const neglected = state.poopCount >= ${P.neglectPoop} ||`,
      `      state.poopFullTicks = state.poopCount >= MAX_POOP ? (state.poopFullTicks || 0) + 1 : 0;\n` +
      `      const neglected = (state.poopCount >= ${P.neglectPoop} && state.poopFullTicks >= ${P.poopSickGraceTicks}) ||`);
  }
  if (P.wakeOnAllActions) {
    add('デートの さそい: ねていても 起きて 出かける(さそえない理由から 「ねている」を はずす)',
      "    if (state.isSleeping) return 'ねている…おきてからさそおう';\n", '');
    add('デートの 開始で 起きる',
      'plan = datePlanForRegion(plan);\n    const blocked = dateBlockReason();',
      'plan = datePlanForRegion(plan);\n    if (state.isSleeping) wakeForAction();\n    const blocked = dateBlockReason();');
    add('現在地への 移動: 起きて 出かける',
      "if (state.isSleeping) { setActionComment(randomBlockedMessage('sleepingTravel')); render(); return; }",
      'if (state.isSleeping) wakeForAction();');
    add('なかまの さそい: 起きて あそぶ',
      'const stillOk = !gameActive && state.stage === STAGE.GROWING && !state.isSleeping && !state.transformOptions;',
      'if (state.isSleeping && state.stage === STAGE.GROWING) wakeForAction();\n    const stillOk = !gameActive && state.stage === STAGE.GROWING && !state.isSleeping && !state.transformOptions;');
    add('たびの 開始判定から 「ねている」を はずす(出発時に 起きる)',
      '      && !state.isSleeping && !gameActive && !state.transformOptions\n      && (!region.special || hasPerk(70));',
      '      && !gameActive && !state.transformOptions\n      && (!region.special || hasPerk(70));');
  }
  if (P.minigameEnergy && P.minigameEnergy !== 12) {
    add('ミニゲーム1回の げんき',
      'const energyCost = Math.max(1, Math.round(12 * envModifiers().play));',
      `const energyCost = Math.max(1, Math.round(${num(P.minigameEnergy)} * envModifiers().play));`);
    add('ゲームパスの げんき(ミニゲームと 同じ)',
      'state.energy = clamp(state.energy - Math.max(1, Math.round(12 * envModifiers().play)), 0, 100);',
      `state.energy = clamp(state.energy - Math.max(1, Math.round(${num(P.minigameEnergy)} * envModifiers().play)), 0, 100);`);
  }
  if (P.relationFloor) {
    const itemFloor = P.itemsV3 && P.itemsV3.relationItemFloor;
    add('なかま・こいびと: 暮らしが 落ちついている 間は きずなが 下がりきらない(共通の 手つづき)',
      '  function relationshipStage() {',
      '  // お世話頻度 監査 V3: なかま・こいびとの きずなは、暮らしが 落ちついている(びょうきでも まえぶれでもなく、\n' +
      '  // けんこう40いじょう)間は floor より 下がらない。ほんとうに 放っておかれた ときだけ 冷えていき、0で はなれる。\n' +
      `  // おともだちバッジ・らぶれたーを そうびしていると floor は ${itemFloor || P.relationFloor}(いつでも 家に 来る)。すれちがい中の こいびとは floor なし\n` +
      '  function relationFloor(itemId, mismatched) {\n' +
      '    if (mismatched) return 0;\n' +
      (itemFloor ? `    if (isEquipped(itemId)) return ${itemFloor};\n` : '') +
      `    return (!state.isSick && !state.dying && state.health >= 40) ? ${P.relationFloor} : 0;\n  }\n` +
      '  function decayTowardFloor(value, amount, floor) {\n' +
      '    if (value > floor) return Math.max(floor, value - amount);\n' +
      '    return floor ? value : value - amount;\n  }\n\n' +
      '  function relationshipStage() {');
    add('こいびと: なかよし度の 減りに floor を つかう',
      'p.affection = clamp((p.affection ?? 100) - PARTNER_AFFECTION_DECAY_PER_TICK * mismatchFactor, 0, 100);',
      "p.affection = clamp(decayTowardFloor(p.affection ?? 100, PARTNER_AFFECTION_DECAY_PER_TICK * mismatchFactor, relationFloor('partner1', p.mismatched)), 0, 100);");
    add('なかま: きずなの 減りに floor を つかう',
      'c.bond = clamp((c.bond ?? 100) - COMPANION_BOND_DECAY_PER_TICK * bondDecayFactor, 0, 100);',
      "c.bond = clamp(decayTowardFloor(c.bond ?? 100, COMPANION_BOND_DECAY_PER_TICK * bondDecayFactor, relationFloor('bond1', false)), 0, 100);");
  }
  if (P.visitBondPerTick) add('家に 来ている なかま・こいびとは、一緒に すごすだけで きずなが 育つ',
    '      decayCompanionBonds();\n',
    '      decayCompanionBonds();\n' +
    `      { const k = homeVisits && homeVisits.current && homeVisits.current.key; if (k) { // お世話頻度 監査 V3\n` +
    `        if (state.partner && k === 'partner:' + state.partner.id) state.partner.affection = clamp((state.partner.affection ?? 100) + ${num(P.visitBondPerTick)}, 0, 100);\n` +
    `        else for (const c of state.companions) if ('companion:' + canonicalCompanionId(c.id) === k) c.bond = clamp((c.bond ?? 100) + ${num(P.visitBondPerTick)}, 0, 100);\n      } }\n`);
  if (P.achievementsV3) {
    const ach = (find, replace, why) => add('実績: ' + why, find, replace);
    ach("desc: 'ひとつの人生で、ごはんを30回あげた', tier: 'easy2', condition: (l, s) => s.actionCounts.feed >= 30 }",
      "desc: 'ひとつの人生で、ごはんを12回あげた', tier: 'easy2', condition: (l, s) => s.actionCounts.feed >= 12 }", 'ごはん 12回');
    ach("desc: 'ひとつの人生で、そうじを20回した', tier: 'normal', condition: (l, s) => s.actionCounts.clean >= 20 }",
      "desc: 'ひとつの人生で、そうじを15回した', tier: 'normal', condition: (l, s) => s.actionCounts.clean >= 15 }", 'そうじ 15回');
    ach("label: 'ピカピカ20かい', desc:", "label: 'ピカピカ15かい', desc:", 'そうじの 名まえ');
    ach("desc: 'びょうきを5かいなおした', tier: 'easy2', condition: (l) => l.sicknessCured >= 5 }",
      "desc: 'びょうきを3かいなおした', tier: 'easy2', condition: (l) => l.sicknessCured >= 3 }", '病気を なおす 通算3');
    ach("desc: 'びょうきを15かいなおした', tier: 'hard1', condition: (l) => l.sicknessCured >= 15 }",
      "desc: 'びょうきを8かいなおした', tier: 'hard1', condition: (l) => l.sicknessCured >= 8 }", '病気を なおす 通算8');
    ach("{ id: 'medicine-30', emoji: '🩹', label: 'かんびょうのきろく', desc: 'ひとつの人生で、くすりを10回あげた', tier: 'hard1', condition: (l, s) => s.actionCounts.medicine >= 10 }",
      "{ id: 'medicine-30', emoji: '🌙', label: 'ねがおの見守り', desc: 'ねてから、ひとりで起きるまで見守った(通算10回)', tier: 'hard1', condition: (l) => (l.sleepWatched || 0) >= 10 }", 'かんびょうのきろく→ねがおの見守り');
    // 交流(やさしいこころ)は じゃれるの 後だけの まま。ごはん・そうじの 後にも 出すと、交流の ダイアログが
    // お世話の 途中で 何十回も 開いて しまう(VERSION 3 の 実ブラウザ検証で 確認)ため、加えない
  }
  if (P.phoenixRebirth) add('フェニックス: 生まれかわりを 条件に(病気の 回数を 条件に しない)',
    "if (line === 'phoenix') return (state.sicknessCuredThisLife || 0) >= (eased ? 3 : 5);",
    "if (line === 'phoenix') return (state.lifetime.pastLives || []).length >= (eased ? 2 : 3) && currentAge() >= 40;");
  if (P.itemsV3) {
    const it = P.itemsV3;
    add('おべんとうばこ: 発動する おなか',
      "if (isEquipped('bowtie') && state.hunger <= ITEM_AUTO_CARE_DANGER) {",
      `if (isEquipped('bowtie') && state.hunger <= ${it.autoThreshold}) {`);
    add('おもちゃばこ: 発動する ごきげん',
      "if (isEquipped('ribbon') && state.happiness <= ITEM_AUTO_CARE_DANGER) {",
      `if (isEquipped('ribbon') && state.happiness <= ${it.autoThreshold}) {`);
    if (it.scarfNoCount) add('救急箱: 自動の 治療は 実績・フェニックスに 数えない(アイテムの 方針どおり)',
      "        applyDecline(-12);\n        recordSicknessCure();\n        checkStoryEvents('medicine-cure');\n        itemContextReaction('scarf',",
      "        applyDecline(-12);\n        checkStoryEvents('medicine-cure');\n        itemContextReaction('scarf',");
    if (it.scarfAid) add('救急箱: おわかれの まえぶれが 出たら 1回だけ 手当て(けんこう+30。まえぶれ・猶予は そのまま)',
      '      // as long a losing streak to be fatal\n',
      "      if (isEquipped('scarf') && state.dying && !state.scarfAidUsed) {\n        state.scarfAidUsed = true;\n        state.health = clamp(state.health + 30, 0, 100);\n" +
      "        itemContextReaction('scarf', '様子がおかしいのに気づいて、救急箱で手当てした。');\n      }\n      if (!state.dying) state.scarfAidUsed = false;\n\n      // as long a losing streak to be fatal\n");
    if (it.pillowRest) {
      add('ふかふかまくら: ねている 間は おなか・ごきげんが へらない',
        `const sleepFactor = state.isSleeping ? ${num(P.sleepDecayFactor)} : 1;`,
        `const sleepFactor = state.isSleeping ? (isEquipped('sleepboost1') ? 0 : ${num(P.sleepDecayFactor)}) : 1;`);
      add('ふかふかまくら: ねている 間は うんちも 出ない',
        `      state.poopTimer -= state.isSleeping ? ${num(P.poop.sleepFactor)} : 1;\n`,
        `      state.poopTimer -= state.isSleeping ? (isEquipped('sleepboost1') ? 0 : ${num(P.poop.sleepFactor)}) : 1;\n`);
    }
  }
  if (P.neglectGraceTicks) {
    add('「おこたり」が 続いて から 病気の 抽選に 入る(少し 目を はなした くらいでは 病気に ならない)',
      '      const infantGrace = currentAge() < 3 && state.poopCount < MAX_POOP;',
      `      state.neglectTicks = neglected ? (state.neglectTicks || 0) + 1 : 0;\n      const infantGrace = (currentAge() < 3 && state.poopCount < MAX_POOP) || state.neglectTicks < ${P.neglectGraceTicks};`);
  }
  if (P.healthDrainScale && P.healthDrainScale !== 1) {
    add('体調を くずした ときの けんこうの へりを ゆるやかに',
      '      state.health = clamp(state.health + healthDelta, 0, 100);',
      `      state.health = clamp(state.health + (healthDelta < 0 ? healthDelta * ${num(P.healthDrainScale)} : healthDelta), 0, 100);`);
  }
  if (P.id === 'V3') {
    // 本体に 組みこむ 版では、古く なった 説明の コメントも いまの 値に そろえる
    add('説明: 満腹・機嫌の へりかた',
      '      // 満腹・機嫌の 基本の げんしょうスピード(0.6/tick)は、なにも せずに\n      // 基本がめんで しばらく ながめていても あわてなくて いい よう、\n      // 余裕を もたせた 大きさに おさえてある(以前は 1/tick で、放置3分\n      // ほどで お世話ぎれの 状態に なってしまっていた)\n',
      '      // お世話頻度 監査 VERSION 3(2026-11-25): 満腹・機嫌・元気は 0.20/tick(100→30 が やく 17分)。\n' +
      '      // ホームを 5〜10分 ながめていても サインが 出ない はやさ(以前 1 → 0.6 → 0.35/tick)。\n' +
      '      // 満腹で うんちも 少ない あいだは、機嫌の へりが さらに 0.7倍に なる\n');
    add('説明: 古い 0.35/tick の 行を けす',
      '      // 0.35/tick: 100→30 が やく 10分。「つねに お世話しないと」に ならず、\n      // ほのぼの ながめて いられる はやさ(以前 0.6 = やく 6分)\n', '');
    add('説明: 元気の へりかた',
      '        // おきている あいだの 基本の げんしょうスピード(0.32/tick)\n',
      '        // おきている あいだの 基本の げんしょうスピード(0.20/tick)\n');
    add('説明: うんちの 出かた',
      '      // 3.5%/tick = やく 1.5分に 1こ(以前 8% = 40秒に 1こ で そうじが おいつかなかった)\n',
      '      // 2.5〜4.5分ごとに 1こ(間隔を そろえて、かたまって 出ない ように する)。ねている あいだは 0.3倍。\n' +
      '      // 以前は 毎tick 3.5% の 抽選(やく 1.5分に 1こ・かたまりやすい)、その前は 8%\n');
  }
  if (P.autoWakeTicks > 0) {
    // げんきが まんたんに なって しばらく たつと、じぶんで おきる(起こすのも 今まで通りできる)。
    add('げんきが まんたんに なったら じぶんで おきる',
      'state.sleptTicks += 1;',
      `state.sleptTicks += 1;\n        if (state.energy >= 100 && state.sleptTicks >= ${P.autoWakeNightTicks ? `(currentEnvironment().time === 'night' ? ${P.autoWakeNightTicks} : ${P.autoWakeTicks})` : P.autoWakeTicks}) {\n` +
      `          state.isSleeping = false;\n          stopSleepRecovery();\n` +
      `          applyGrowth(3); applyDecline(-3);\n          state.sleptTicks = 0;\n` +
      `          if (typeof audio !== 'undefined' && audio && audio.play) audio.play('wake');\n` +
      `          setActionComment(randomActionMessage('wake'));\n          speakEvent('wake');\n` + (P.achievementsV3 ? `          state.lifetime.sleepWatched = (state.lifetime.sleepWatched || 0) + 1;\n` : '') + `        }`);
  }
  return out;
}

// care-status.js(おしらせ・おすすめボタン)への 差し替え。うんちの おしらせを 出す 数だけ。
function careStatusPatches(plan) {
  const P = PLANS[plan] || plan;
  if (P.id === 'current') return [];
  const out = [];
  if (P.poopNotice !== 2) out.push({
    why: 'うんちの おしらせを 出す 数',
    find: "numeric(state, 'poopCount', 0) >= 2",
    replace: `numeric(state, 'poopCount', 0) >= ${P.poopNotice}`,
    expect: 2,
  });
  // 現行の 落とし穴: ごきげんが ひくい間 おすすめは ずっと「じゃれる」だが、続けて
  // ${P.spamThreshold}回を こえると いやがって ごきげんが 下がる。おすすめどおりに 押す人ほど 悪くなる。
  // 続けて じゃれた 回数が 上限に とどいたら、おすすめを「あそぶ」に きりかえる(A/B/C 共通の 修正)。
  out.push({
    why: 'じゃれるを 続けすぎたら おすすめを「あそぶ」に きりかえる(おしらせ)',
    find: 'if (!petAvailable) {',
    replace: `if (!petAvailable || numeric(state, 'affectionStreak', 0) >= ${P.spamThreshold}) {`,
  });
  out.push({
    why: 'じゃれるを 続けすぎたら おすすめを「あそぶ」に きりかえる(いのちの回復案内)',
    find: "if (petAvailable) return { action: 'playWithBtn'",
    replace: `if (petAvailable && numeric(state, 'affectionStreak', 0) < ${P.spamThreshold}) return { action: 'playWithBtn'`,
  });
  if (P.sleepingFeedNotice) {
    out.push({
      why: 'ねている時の おなかの おしらせ: 「ごはん」を すすめる(押せば 起きて 食べる)',
      find: "return notice('hunger', 'warning', 'おなかがすいている', '起きてから、ごはんをあげよう', 'hunger', 'sleepBtn', 'droop');",
      replace: "return notice('hunger', 'warning', 'おなかがすいている', 'ごはんをあげよう（ねていたら起きて食べるよ）', 'hunger', 'feedBtn', 'droop');",
    });
    out.push({
      why: 'いのちの回復案内も 同じく「ごはん」を すすめる',
      find: "return { action: 'sleepBtn', detail: lifeRecovery ? '起きて、おなかを60以上にしよう' : '起きて、ごはんをあげよう' };",
      replace: "return { action: 'feedBtn', detail: lifeRecovery ? 'おなかを60以上にしよう' : 'ごはんをあげよう' };",
    });
  }
  return out;
}

// item-system.js(アイテムの 値段・説明)への 差し替え
function itemSystemPatches(plan) {
  const P = PLANS[plan] || plan;
  if (!P.itemCatalog) return [];
  const src = baseSource('item-system.js');
  const out = [];
  for (const [id, change] of Object.entries(P.itemCatalog)) {
    const start = src.indexOf(`  "${id}": {\n`);
    if (start < 0) throw new Error(`item-system.js に ${id} が ありません`);
    const block = src.slice(start, src.indexOf('\n  }', start) + 4);
    let next = block;
    if (change.price != null) next = next.replace(/"price": \d+/, `"price": ${change.price}`);
    if (change.desc != null) next = next.replace(/"desc": "[^"]*"/, `"desc": ${JSON.stringify(change.desc)}`);
    if (change.guard != null) next = next.replace(/"guard": "[^"]*"/, `"guard": ${JSON.stringify(change.guard)}`);
    out.push({ why: `${id} の 値段・説明`, find: block, replace: next });
  }
  return out;
}

function applyPatches(source, patches, label) {
  let out = source;
  for (const p of patches) {
    const count = out.split(p.find).length - 1;
    const expect = p.expect || 1;
    if (count !== expect) throw new Error(`[care-pace ${label}] 差し替え「${p.why}」の 元の文字列が ${count} 回(期待 ${expect} 回)。本体が変わった可能性`);
    out = out.split(p.find).join(p.replace);
  }
  return out;
}

// 差し替えの 基準(main 24c64450 = お世話頻度 監査を はじめた 時点)。V3 を 本体に 組みこんだ あとも、
// 比較ツールは この 写しに 差し替えを 当てて うごく(comparisons/care-pace-20261125/baseline/)。
const BASELINE_DIR = 'comparisons/care-pace-20261125/baseline';
function baseSource(file) {
  const fs = require('node:fs');
  const path = require('node:path');
  return fs.readFileSync(path.join(__dirname, '..', '..', BASELINE_DIR, file), 'utf8');
}

module.exports = { PLAN_IDS, PLANS, scriptPatches, careStatusPatches, itemSystemPatches, applyPatches, baseSource, BASELINE_DIR };
