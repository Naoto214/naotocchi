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

const PLAN_IDS = ['current', 'A', 'B', 'C'];

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
  if (P.autoWakeTicks > 0) {
    // げんきが まんたんに なって しばらく たつと、じぶんで おきる(起こすのも 今まで通りできる)。
    add('げんきが まんたんに なったら じぶんで おきる',
      'state.sleptTicks += 1;',
      `state.sleptTicks += 1;\n        if (state.energy >= 100 && state.sleptTicks >= ${P.autoWakeTicks}) {\n` +
      `          state.isSleeping = false;\n          stopSleepRecovery();\n` +
      `          applyGrowth(3); applyDecline(-3);\n          state.sleptTicks = 0;\n` +
      `          if (typeof audio !== 'undefined' && audio && audio.play) audio.play('wake');\n` +
      `          setActionComment(randomActionMessage('wake'));\n          speakEvent('wake');\n        }`);
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

module.exports = { PLAN_IDS, PLANS, scriptPatches, careStatusPatches, applyPatches };
