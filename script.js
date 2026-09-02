(() => {
  'use strict';

  const SAVE_KEY = 'tamagotchi-modoki-save-v1';
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

  // each line is its own baby -> elder growth path (own emoji and label at
  // every stage, not a generic bird sprite shared by everyone pre-adult).
  // which line an egg hatches into is random (see pickRandomLine) - なる
  // messages are deliberately distinct per line/stage rather than templated
  const SPECIES = {
    dog: {
      stages: [
        { threshold: HATCH_AGE, emoji: '🐶', label: 'あかちゃんいぬ' },
        { threshold: 8, emoji: '🐶', label: 'こいぬ', message: 'こいぬに せいちょうした!' },
        { threshold: 16, emoji: '🐕', label: 'わんぱくいぬ', message: 'わんぱくいぬに せいちょうした!' },
        { threshold: 26, emoji: '🐕', label: 'わかいいぬ', message: 'わかいいぬに せいちょうした!' },
        { threshold: 40, emoji: '🐕', label: 'いぬ', message: 'げんきいっぱいの いぬに へんしんした!' },
        { threshold: 60, emoji: '🐕', label: 'としをとった いぬ', message: 'としをとった いぬに なった…' },
      ],
    },
    cat: {
      stages: [
        { threshold: HATCH_AGE, emoji: '🐱', label: 'あかちゃんねこ' },
        { threshold: 8, emoji: '🐱', label: 'こねこ', message: 'こねこに せいちょうした!' },
        { threshold: 16, emoji: '🐈', label: 'おてんばねこ', message: 'おてんばねこに せいちょうした!' },
        { threshold: 26, emoji: '🐈', label: 'わかいねこ', message: 'わかいねこに せいちょうした!' },
        { threshold: 40, emoji: '🐈', label: 'ねこ', message: 'きままな ねこに へんしんした!' },
        { threshold: 60, emoji: '🐈', label: 'としをとった ねこ', message: 'としをとった ねこに なった…' },
      ],
    },
    bird: {
      stages: [
        { threshold: HATCH_AGE, emoji: '🐣', label: 'ひな' },
        { threshold: 8, emoji: '🐥', label: 'こどり', message: 'こどりに せいちょうした!' },
        { threshold: 16, emoji: '🐤', label: 'わかどり', message: 'わかどりに せいちょうした!' },
        { threshold: 26, emoji: '🐤', label: 'はばたくとり', message: 'はばたくとりに せいちょうした!' },
        { threshold: 40, emoji: '🐦', label: 'とり', message: 'じゆうな とりに へんしんした!' },
        { threshold: 60, emoji: '🦜', label: 'としをとった とり', message: 'としをとった とりに なった…' },
      ],
    },
    man: {
      stages: [
        { threshold: HATCH_AGE, emoji: '👶', label: 'あかちゃん' },
        { threshold: 8, emoji: '🧒', label: 'おとこのこ', message: 'おとこのこに せいちょうした!' },
        { threshold: 16, emoji: '👦', label: 'しょうねん', message: 'しょうねんに せいちょうした!' },
        { threshold: 26, emoji: '🧑', label: 'せいねん', message: 'せいねんに せいちょうした!' },
        { threshold: 40, emoji: '🧑', label: 'おとこのひと', message: 'たくましい おとこのひとに せいちょうした!' },
        { threshold: 60, emoji: '👴', label: 'おじいさん', message: 'おじいさんに なった…' },
      ],
    },
    woman: {
      stages: [
        { threshold: HATCH_AGE, emoji: '👶', label: 'あかちゃん' },
        { threshold: 8, emoji: '🧒', label: 'おんなのこ', message: 'おんなのこに せいちょうした!' },
        { threshold: 16, emoji: '👧', label: 'しょうじょ', message: 'しょうじょに せいちょうした!' },
        { threshold: 26, emoji: '👧', label: 'わかいおんなのひと', message: 'わかいおんなのひとに せいちょうした!' },
        { threshold: 40, emoji: '👩', label: 'おんなのひと', message: 'りりしい おんなのひとに せいちょうした!' },
        { threshold: 60, emoji: '👵', label: 'おばあさん', message: 'おばあさんに なった…' },
      ],
    },
    beetle: {
      stages: [
        { threshold: HATCH_AGE, emoji: '🐛', label: 'ようちゅう' },
        { threshold: 8, emoji: '🐛', label: 'おおきくなった ようちゅう', message: 'ようちゅうが おおきく せいちょうした!' },
        { threshold: 16, emoji: '🪲', label: 'さなぎあがりの こがぶとむし', message: 'さなぎから でてきた!' },
        { threshold: 26, emoji: '🪲', label: 'わかいカブトムシ', message: 'わかいカブトムシに せいちょうした!' },
        { threshold: 40, emoji: '🪲', label: 'カブトムシ', message: 'たくましい カブトムシに へんしんした!' },
        { threshold: 60, emoji: '🪲', label: 'でんせつの カブトムシ', message: 'でんせつの カブトムシに なった…' },
      ],
    },
    stagbeetle: {
      stages: [
        { threshold: HATCH_AGE, emoji: '🐛', label: 'ようちゅう' },
        { threshold: 8, emoji: '🐛', label: 'おおきくなった ようちゅう', message: 'ようちゅうが おおきく せいちょうした!' },
        { threshold: 16, emoji: '🪲', label: 'さなぎあがりの こくわがた', message: 'さなぎから でてきた!' },
        { threshold: 26, emoji: '🪲', label: 'わかいクワガタムシ', message: 'わかいクワガタムシに せいちょうした!' },
        { threshold: 40, emoji: '🪲', label: 'クワガタムシ', message: 'りっぱな クワガタムシに へんしんした!' },
        { threshold: 60, emoji: '🪲', label: 'でんせつの クワガタムシ', message: 'でんせつの クワガタムシに なった…' },
      ],
    },
    // rare lines - never a starting hatch, only reachable as a 変身 choice
    // (see pickTransformCandidates) when care/skill has been exceptional
    god: {
      stages: [
        { threshold: HATCH_AGE, emoji: '👼', label: 'あかちゃんてんし' },
        { threshold: 8, emoji: '👼', label: 'こてんし', message: 'こてんしに せいちょうした!' },
        { threshold: 16, emoji: '👼', label: 'みならいのてんし', message: 'みならいのてんしに せいちょうした!' },
        { threshold: 26, emoji: '😇', label: 'わかきかみ', message: 'わかきかみに せいちょうした!' },
        { threshold: 40, emoji: '😇', label: 'かみさま', message: 'まさかの…かみさまに しんかした!!' },
        { threshold: 60, emoji: '🌞', label: 'だいじんの かみさま', message: 'だいじんの かみさまに なった…' },
      ],
    },
    ren: {
      stages: [
        { threshold: HATCH_AGE, emoji: '👶', label: 'あかちゃんの れんくん' },
        { threshold: 8, emoji: '🧒', label: 'れんくん', message: 'れんくんが おおきく なった!' },
        { threshold: 16, emoji: '🧒', label: 'しょうねんの れんくん', message: 'しょうねんの れんくんに なった!' },
        { threshold: 26, emoji: '👦', label: 'せいねんの れんくん', message: 'せいねんの れんくんに なった!' },
        { threshold: 40, emoji: '🧑', label: 'れんくん', message: 'あれ!?れんくんが なかまに くわわった!' },
        { threshold: 60, emoji: '🧑', label: 'れんさん', message: 'れんさんに なった…' },
      ],
    },
  };

  // god/ren are intentionally left out of the random hatch pool - they stay
  // rare, earned surprises unlocked only through a 変身 choice
  const NORMAL_LINES = ['dog', 'cat', 'bird', 'man', 'woman', 'beetle', 'stagbeetle'];
  const RARE_LINES = ['god', 'ren'];

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
    ageLabel: document.getElementById('ageLabel'),
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
    badges: document.getElementById('badges'),
    poopRow: document.getElementById('poopRow'),
    screen: document.getElementById('screen'),
    lamp: document.getElementById('lamp'),
    feedBtn: document.getElementById('feedBtn'),
    playBtn: document.getElementById('playBtn'),
    cleanBtn: document.getElementById('cleanBtn'),
    sleepBtn: document.getElementById('sleepBtn'),
    medicineBtn: document.getElementById('medicineBtn'),
    resetBtn: document.getElementById('resetBtn'),
    screenNormal: document.getElementById('screenNormal'),
    minigameOverlay: document.getElementById('minigameOverlay'),
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
      lowHealthStreak: 0,
      careSum: 0,
      careTicks: 0,
      actionCounts: { feed: 0, play: 0, clean: 0, sleep: 0, medicine: 0 },
      traitCounts: { gentle: 0, wild: 0, calm: 0, brave: 0, romantic: 0 },
      minigameScoreSum: 0,
      minigameCount: 0,
      evoMeter: 0,
      devoMeter: 0,
      deathMeter: 0,
      transformMeter: 0,
      transformOptions: null,
      growthEvents: 0,
      storyFlagsSeen: [],
      items: {},
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return freshState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return freshState();
      const merged = { ...freshState(), ...parsed };
      // migrate saves from before growth lines existed - old stage values
      // were egg/baby/child/teen/adult/elder/dead/clear (plus a legacy
      // adult_good/adult_bad from even earlier), with one shared species
      // decided at teen->adult instead of a per-line stage list from hatch
      const OLD_STAGE_MAP = {
        adult_good: { stageIndex: 4, species: 'dog' },
        adult_bad: { stageIndex: 4, species: 'stagbeetle' },
        baby: { stageIndex: 0, species: null },
        child: { stageIndex: 1, species: null },
        teen: { stageIndex: 3, species: null },
        adult: { stageIndex: 4, species: parsed.species || null },
        elder: { stageIndex: 5, species: parsed.species || null },
      };
      if (Object.prototype.hasOwnProperty.call(OLD_STAGE_MAP, parsed.stage)) {
        const mapped = OLD_STAGE_MAP[parsed.stage];
        merged.stage = STAGE.GROWING;
        merged.stageIndex = mapped.stageIndex;
        merged.speciesLine = mapped.species || pickRandomLine();
      }
      return merged;
    } catch (e) {
      return freshState();
    }
  }

  function saveState() {
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

  const MESSAGE_DURATION_MS = 2500;

  let state = loadState();
  let message = '';
  let gameActive = false;
  let messageTimer = null;

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

  // one-time flavor beats sprinkled across a play session - each fires at
  // most once (tracked in state.storyFlagsSeen) so they read as a loose
  // life story rather than a repeating status message
  const STORY_EVENTS = [
    { id: 'presence', emoji: '👀', message: 'どこからか しせんを かんじる…', condition: (s) => s.growthEvents >= 3 },
    { id: 'rival', emoji: '😤', message: 'ライバルが あらわれた!まけていられない!', condition: (s) => s.growthEvents >= 6 },
    { id: 'old-dream', emoji: '💭', message: 'ふと、なつかしい ゆめを みた きがした…', condition: (s) => s.growthEvents >= 10 },
    { id: 'sick-overcome', emoji: '💪', message: 'なんども びょうきを のりこえて、たくましく なった', condition: (s) => s.totalSicknessCount >= 5 },
    { id: 'minigame-master', emoji: '🏆', message: 'いつのまにか、あそびの たつじんに なっていた', condition: (s) => s.minigameCount >= 20 },
    { id: 'awakening', emoji: '✨', message: 'なにか とくべつな ちからが めざめていく きがする…', condition: (s) => s.growthEvents >= 15 },
  ];

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
      state.growthEvents += 1;
      setMessage('たまごがかえった!');
      bouncePet();
      return true;
    }
    if (state.stage === STAGE.GROWING) {
      const stages = SPECIES[state.speciesLine].stages;
      const next = stages[state.stageIndex + 1];
      if (!next || state.age < next.threshold) return false;
      state.stageIndex += 1;
      state.growthEvents += 1;
      setMessage(next.message || `${next.label}に なった!`);
      bouncePet();
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
  function triggerEvolutionJump() {
    if (state.stage !== STAGE.GROWING) return;
    const stages = SPECIES[state.speciesLine].stages;
    if (state.stageIndex >= stages.length - 1) return;
    state.age = Math.max(state.age, stages[state.stageIndex + 1].threshold);
    advanceStage();
  }

  function triggerDevolutionJump() {
    if (state.stage !== STAGE.GROWING || state.stageIndex <= 0) {
      // already the youngest growing stage (or still an egg) - nowhere
      // lower to fall back to visually
      setMessage('たいかメーターが MAXに…でも これ以上は もどれない…');
      return;
    }
    const stages = SPECIES[state.speciesLine].stages;
    state.stageIndex -= 1;
    state.age = stages[state.stageIndex].threshold;
    setMessage(`${stages[state.stageIndex].label}に もどってしまった…`);
    bouncePet();
  }

  function triggerDeath() {
    state.stage = STAGE.DEAD;
    setMessage('しぼうメーターが MAXに…てんごくへ いってしまった…');
  }

  function triggerGameClear() {
    state.stage = STAGE.CLEAR;
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
      triggerEvolutionJump();
      changedMessage = true;
    }
    if (state.devoMeter >= 100) {
      state.devoMeter = 0;
      triggerDevolutionJump();
      changedMessage = true;
    }
    if (state.transformMeter >= 100 && !state.transformOptions && state.stage === STAGE.GROWING) {
      state.transformMeter = 0;
      state.transformOptions = pickTransformCandidates();
      setMessage('へんしんの ちからが たまった!すがたを えらべるよ');
      changedMessage = true;
    }
    if (Math.floor(state.age / 20) >= GOAL_DAYS) {
      triggerGameClear();
      return true;
    }
    checkStoryEvents();
    return changedMessage;
  }

  const STORY_FLASH_DURATION_MS = 3000;

  function checkStoryEvents() {
    if (state.stage === STAGE.DEAD || state.stage === STAGE.CLEAR || gameActive) return;
    for (const event of STORY_EVENTS) {
      if (state.storyFlagsSeen.includes(event.id)) continue;
      if (event.condition(state)) {
        state.storyFlagsSeen.push(event.id);
        showStoryEvent(event);
        break; // one at a time so they don't overlap
      }
    }
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
      state.hunger = clamp(state.hunger - 1 * sleepFactor, 0, 100);
      state.happiness = clamp(state.happiness - 1 * sleepFactor, 0, 100);

      if (state.isSleeping) {
        state.energy = clamp(state.energy + (state.isSick ? 4 : 10), 0, 100);
      } else {
        state.energy = clamp(state.energy - 1, 0, 100);
      }

      // poop accumulates over time
      if (Math.random() < 0.18 && state.poopCount < MAX_POOP) {
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
        if (Math.random() < 0.2) {
          const sickness = SICKNESS_TYPES[Math.floor(Math.random() * SICKNESS_TYPES.length)];
          state.isSick = true;
          state.sicknessType = sickness.label;
          state.totalSicknessCount += 1;
          state.devoMeter = clamp(state.devoMeter + 12, 0, 100);
          state.deathMeter = clamp(state.deathMeter + 18, 0, 100);
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
        state.deathMeter = clamp(state.deathMeter + 12, 0, 100);
      } else {
        state.lowHealthStreak = 0;
      }
      const deathThreshold = Math.max(6, 15 - state.totalSicknessCount);
      if (state.lowHealthStreak >= deathThreshold) {
        state.stage = STAGE.DEAD;
        setMessage('てんごくへ いってしまった…');
      }

      // no natural age-based advancement past the egg here on purpose -
      // growing up beyond hatching only happens through triggerEvolutionJump()
      // (see checkMeters()), so a full evo meter is the only thing that
      // actually transforms the pet
      checkMeters();
    }
  }

  function bouncePet() {
    el.pet.classList.remove('bounce');
    // force reflow to restart animation
    void el.pet.offsetWidth;
    el.pet.classList.add('bounce');
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

  function render() {
    const isDead = state.stage === STAGE.DEAD;
    const isClear = state.stage === STAGE.CLEAR;
    const isEgg = state.stage === STAGE.EGG;
    const isOver = isDead || isClear;

    el.pet.textContent = currentSprite();
    el.ageLabel.textContent = `年齢: ${Math.floor(state.age / 20)}`;
    el.stageLabel.textContent = currentStageLabel();

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
    el.lamp.classList.toggle('sick', state.isSick && !isOver);
    el.gameClearOverlay.classList.toggle('hidden', !isClear);

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
    el.resetBtn.classList.toggle('hidden', !isOver);

    el.sleepBtn.querySelector('span').textContent = state.isSleeping ? 'おきる' : 'ねる';

    renderItemsRow(disableCare);
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

  function chooseTransform(line) {
    if (!state.transformOptions || !state.transformOptions.includes(line)) return;
    state.speciesLine = line;
    state.transformOptions = null;
    const stage = SPECIES[line].stages[state.stageIndex];
    setMessage(`${stage.label}に へんしんした!`);
    bouncePet();
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
    bouncePet();
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
      goodItems: ['🍣', '🍱', '🍤', '🥢'],
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
      badItems: ['🌶️', '🧂', '🥃', '🧊'],
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
      const COUNT = Math.round(lerp(9, 16, difficulty));
      const targetMs = lerp(9000, 5000, difficulty);
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
    ...SILHOUETTE_VARIANTS,
    ...PATTERN_GAME_VARIANTS,
    ...BEAT_GAME_VARIANTS,
    ...MAZE_GAME_VARIANTS,
    ...SORT_GAME_VARIANTS,
    ...HIGH_LOW_VARIANTS,
    ...TILE_SWAP_VARIANTS,
  ];

  let minigameQueue = [];
  let lastMinigameIndex = -1;

  function refillMinigameQueue() {
    minigameQueue = MINIGAMES.map((_, i) => i);
    for (let i = minigameQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [minigameQueue[i], minigameQueue[j]] = [minigameQueue[j], minigameQueue[i]];
    }
    if (minigameQueue.length > 1 && minigameQueue[minigameQueue.length - 1] === lastMinigameIndex) {
      [minigameQueue[0], minigameQueue[minigameQueue.length - 1]] = [minigameQueue[minigameQueue.length - 1], minigameQueue[0]];
    }
  }

  // every one of the 4 minigames plays exactly once per shuffled cycle,
  // instead of plain random picks that can (fairly) still streak one
  // minigame over another in any short run of plays
  function pickRandomMinigame() {
    if (minigameQueue.length === 0) refillMinigameQueue();
    const idx = minigameQueue.pop();
    lastMinigameIndex = idx;
    return MINIGAMES[idx];
  }

  function resultMessageForScore(score) {
    if (score >= 80) return 'だいせいこう!たのしかった!';
    if (score >= 50) return 'たのしく あそんだ!';
    return 'まあまあ あそべた!';
  }

  function finishMinigame(score, customMessage) {
    const clampedScore = clamp(score, 0, 100);
    const happinessGain = Math.round(5 + (clampedScore / 100) * 20);
    state.happiness = clamp(state.happiness + happinessGain, 0, 100);
    state.energy = clamp(state.energy - 12, 0, 100);
    state.minigameScoreSum += clampedScore;
    state.minigameCount += 1;
    // fills regardless of score - unlike evo/devo, playing itself (not
    // skill) is what earns a shot at choosing a different growth line
    state.transformMeter = clamp(state.transformMeter + 15, 0, 100);

    // good play pushes the evolution meter, a real miss pushes both the
    // devolution and death meters - this is the main engine behind the
    // fast-paced transform/regress/die loop, not just the passive clock
    let itemMessage = '';
    if (clampedScore >= 70) {
      state.evoMeter = clamp(state.evoMeter + 22, 0, 100);
      const item = pickWeightedItem();
      state.items[item.id] = (state.items[item.id] || 0) + 1;
      itemMessage = ` ごほうびに ${item.label}${item.emoji} を もらった!`;
    } else if (clampedScore >= 40) {
      state.evoMeter = clamp(state.evoMeter + 8, 0, 100);
    } else {
      state.devoMeter = clamp(state.devoMeter + 18, 0, 100);
      state.deathMeter = clamp(state.deathMeter + 15, 0, 100);
    }

    setMessage((customMessage || resultMessageForScore(score)) + itemMessage);

    gameActive = false;
    el.minigameOverlay.classList.add('hidden');
    el.minigameOverlay.innerHTML = '';
    el.screenNormal.classList.remove('hidden');

    bouncePet();
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
        state.deathMeter = clamp(state.deathMeter + 10, 0, 100);
        setMessage(`たべすぎて ${sickness.label}に なってしまった…`);
      } else {
        setMessage('もう おなかいっぱい… たべすぎ!');
      }
      checkMeters();
      bouncePet();
      return;
    }
    state.happiness = clamp(state.happiness + 3, 0, 100);
    state.evoMeter = clamp(state.evoMeter + 6, 0, 100);
    state.devoMeter = clamp(state.devoMeter - 4, 0, 100);
    if (!checkMeters()) {
      setMessage('もぐもぐ おいしい!');
    }
    bouncePet();
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
    state.evoMeter = clamp(state.evoMeter + 6, 0, 100);
    state.devoMeter = clamp(state.devoMeter - 4, 0, 100);
    if (!checkMeters()) {
      setMessage('おそうじ できた!');
    }
  }));

  el.sleepBtn.addEventListener('click', withFeedback(() => {
    state.isSleeping = !state.isSleeping;
    if (state.isSleeping) {
      state.actionCounts.sleep += 1;
      setMessage('おやすみなさい…');
      return;
    }
    state.evoMeter = clamp(state.evoMeter + 4, 0, 100);
    state.devoMeter = clamp(state.devoMeter - 3, 0, 100);
    if (!checkMeters()) {
      setMessage('おはよう!');
    }
  }));

  el.medicineBtn.addEventListener('click', withFeedback(() => {
    state.actionCounts.medicine += 1;
    if (state.isSick) {
      state.isSick = false;
      state.sicknessType = null;
      state.health = clamp(state.health + 20, 0, 100);
      state.energy = clamp(state.energy - 10, 0, 100);
      state.evoMeter = clamp(state.evoMeter + 10, 0, 100);
      state.devoMeter = clamp(state.devoMeter - 6, 0, 100);
      if (!checkMeters()) {
        setMessage('げんきに なった!');
      }
    } else {
      state.happiness = clamp(state.happiness - 10, 0, 100);
      state.health = clamp(state.health - 5, 0, 100);
      state.devoMeter = clamp(state.devoMeter + 12, 0, 100);
      if (!checkMeters()) {
        setMessage('びょうきじゃないのに… いやがっている');
      }
    }
  }));

  el.resetBtn.addEventListener('click', withFeedback(() => {
    state = freshState();
    clearTimeout(storyFlashTimer);
    el.storyFlash.classList.add('hidden');
    setMessage('あたらしい たまごが やってきた…');
  }));

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
