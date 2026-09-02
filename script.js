(() => {
  'use strict';

  const SAVE_KEY = 'tamagotchi-modoki-save-v1';
  const TICK_MS = 3000; // 1 tick = 3 seconds of real time
  const MAX_OFFLINE_TICKS = 2000; // cap catch-up so leaving it for days doesn't insta-kill it
  const MAX_POOP = 4;

  const STAGE = {
    EGG: 'egg',
    BABY: 'baby',
    CHILD: 'child',
    TEEN: 'teen',
    ADULT_GOOD: 'adult_good',
    ADULT_BAD: 'adult_bad',
    DEAD: 'dead',
  };

  const AGE_THRESHOLDS = {
    hatch: 2,      // egg -> baby
    child: 40,     // baby -> child
    teen: 120,     // child -> teen
    adult: 280,    // teen -> adult
  };

  const SPRITES = {
    [STAGE.EGG]: '🥚',
    [STAGE.BABY]: '🐣',
    [STAGE.CHILD]: '🐥',
    [STAGE.TEEN]: '🐤',
    [STAGE.ADULT_GOOD]: '😸',
    [STAGE.ADULT_BAD]: '😈',
    [STAGE.DEAD]: '👻',
  };

  const el = {
    pet: document.getElementById('pet'),
    ageLabel: document.getElementById('ageLabel'),
    stageLabel: document.getElementById('stageLabel'),
    hungerBar: document.getElementById('hungerBar'),
    happinessBar: document.getElementById('happinessBar'),
    energyBar: document.getElementById('energyBar'),
    healthBar: document.getElementById('healthBar'),
    message: document.getElementById('message'),
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
  };

  function freshState() {
    return {
      stage: STAGE.EGG,
      hunger: 90,
      happiness: 90,
      energy: 90,
      health: 100,
      age: 0,
      poopCount: 0,
      isSick: false,
      isSleeping: false,
      lowHealthStreak: 0,
      careSum: 0,
      careTicks: 0,
      lastUpdate: Date.now(),
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return freshState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return freshState();
      return { ...freshState(), ...parsed };
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

  let state = loadState();
  let message = '';

  function setMessage(msg) {
    message = msg;
    el.message.textContent = msg;
  }

  function advanceStage() {
    if (state.stage === STAGE.EGG && state.age >= AGE_THRESHOLDS.hatch) {
      state.stage = STAGE.BABY;
      setMessage('たまごがかえった!');
      bouncePet();
    } else if (state.stage === STAGE.BABY && state.age >= AGE_THRESHOLDS.child) {
      state.stage = STAGE.CHILD;
      setMessage('こどもに せいちょうした!');
      bouncePet();
    } else if (state.stage === STAGE.CHILD && state.age >= AGE_THRESHOLDS.teen) {
      state.stage = STAGE.TEEN;
      setMessage('はんせいじんに せいちょうした!');
      bouncePet();
    } else if (state.stage === STAGE.TEEN && state.age >= AGE_THRESHOLDS.adult) {
      const avgCare = state.careTicks > 0 ? state.careSum / state.careTicks : 50;
      state.stage = avgCare >= 65 ? STAGE.ADULT_GOOD : STAGE.ADULT_BAD;
      setMessage(avgCare >= 65 ? 'りっぱな おとなに せいちょうした!' : 'ちょっと やんちゃな おとなに せいちょうした…');
      bouncePet();
    }
  }

  function tick() {
    if (state.stage === STAGE.DEAD) return;

    state.age += 1;

    if (state.stage === STAGE.EGG) {
      advanceStage();
      return;
    }

    {
      const sleepFactor = state.isSleeping ? 0.4 : 1;
      state.hunger = clamp(state.hunger - 1 * sleepFactor, 0, 100);
      state.happiness = clamp(state.happiness - 1 * sleepFactor, 0, 100);

      if (state.isSleeping) {
        state.energy = clamp(state.energy + (state.isSick ? 2 : 5), 0, 100);
      } else {
        state.energy = clamp(state.energy - 1, 0, 100);
      }

      // poop accumulates over time
      if (Math.random() < 0.18 && state.poopCount < MAX_POOP) {
        state.poopCount += 1;
      }
      if (state.poopCount >= MAX_POOP) {
        state.happiness = clamp(state.happiness - 2, 0, 100);
      }

      // sickness risk
      if (!state.isSick && (state.poopCount >= MAX_POOP || state.health < 30)) {
        if (Math.random() < 0.08) {
          state.isSick = true;
          setMessage('びょうきに なってしまった…くすりをあげよう');
        }
      }

      // health responds to neglect
      let healthDelta = 0;
      if (state.hunger <= 0) healthDelta -= 3;
      if (state.happiness <= 0) healthDelta -= 2;
      if (!state.isSleeping && state.energy <= 0) healthDelta -= 2;
      if (state.isSick) healthDelta -= 2;
      if (healthDelta === 0 && state.hunger > 50 && state.happiness > 50) healthDelta += 1;
      state.health = clamp(state.health + healthDelta, 0, 100);

      // track care quality for evolution
      state.careSum += (state.hunger + state.happiness + state.energy) / 3;
      state.careTicks += 1;

      // death condition: sustained critical health
      if (state.health <= 0) {
        state.lowHealthStreak += 1;
      } else {
        state.lowHealthStreak = 0;
      }
      if (state.lowHealthStreak >= 15) {
        state.stage = STAGE.DEAD;
        setMessage('てんごくへ いってしまった…');
      }

      advanceStage();
    }
  }

  function runTicks(count) {
    for (let i = 0; i < count && state.stage !== STAGE.DEAD; i++) {
      tick();
    }
  }

  function catchUpOffline() {
    const now = Date.now();
    const elapsed = now - (state.lastUpdate || now);
    let ticks = Math.floor(elapsed / TICK_MS);
    if (ticks > 0) {
      ticks = Math.min(ticks, MAX_OFFLINE_TICKS);
      runTicks(ticks);
    }
    state.lastUpdate = now;
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

  const STAGE_LABELS = {
    [STAGE.EGG]: 'たまご',
    [STAGE.BABY]: 'あかちゃん',
    [STAGE.CHILD]: 'こども',
    [STAGE.TEEN]: 'はんせいじん',
    [STAGE.ADULT_GOOD]: 'おとな(なかよし)',
    [STAGE.ADULT_BAD]: 'おとな(やんちゃ)',
    [STAGE.DEAD]: 'おわり',
  };

  function render() {
    const isDead = state.stage === STAGE.DEAD;
    const isEgg = state.stage === STAGE.EGG;

    el.pet.textContent = SPRITES[state.stage] || '❓';
    el.ageLabel.textContent = `日齢: ${Math.floor(state.age / 20)}`;
    el.stageLabel.textContent = STAGE_LABELS[state.stage] || '';

    updateBar(el.hungerBar, isEgg || isDead ? 0 : state.hunger, 'hunger');
    updateBar(el.happinessBar, isEgg || isDead ? 0 : state.happiness, 'happiness');
    updateBar(el.energyBar, isEgg || isDead ? 0 : state.energy, 'energy');
    updateBar(el.healthBar, isEgg || isDead ? 0 : state.health, 'health');

    el.poopRow.textContent = '💩'.repeat(state.poopCount);

    const badges = [];
    if (state.isSick) badges.push('🤒');
    if (state.isSleeping && !isDead) badges.push('💤');
    el.badges.textContent = badges.join(' ');

    el.screen.classList.toggle('dead', isDead);
    el.lamp.classList.toggle('sick', state.isSick && !isDead);

    if (message) {
      el.message.textContent = message;
    } else if (isDead) {
      el.message.textContent = '「はじめから」で あたらしい たまごを そだてよう';
    } else if (isEgg) {
      el.message.textContent = 'もうすぐ かえりそう…';
    } else {
      el.message.textContent = '';
    }

    const disableCare = isDead || isEgg;
    el.feedBtn.disabled = disableCare;
    el.playBtn.disabled = disableCare || state.isSleeping;
    el.cleanBtn.disabled = disableCare || state.poopCount === 0;
    el.sleepBtn.disabled = disableCare;
    el.medicineBtn.disabled = disableCare;
    el.resetBtn.classList.toggle('hidden', !isDead);

    el.sleepBtn.querySelector('span').textContent = state.isSleeping ? 'おきる' : 'ねる';
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
    state.hunger = clamp(state.hunger + 25, 0, 100);
    state.happiness = clamp(state.happiness + 3, 0, 100);
    setMessage('もぐもぐ おいしい!');
    bouncePet();
  }));

  el.playBtn.addEventListener('click', withFeedback(() => {
    if (state.isSleeping) {
      setMessage('ねている… おきてから あそぼう');
      return;
    }
    if (state.energy < 10) {
      setMessage('つかれていて あそべない…');
      return;
    }
    state.happiness = clamp(state.happiness + 20, 0, 100);
    state.energy = clamp(state.energy - 12, 0, 100);
    setMessage('たのしく あそんだ!');
    bouncePet();
  }));

  el.cleanBtn.addEventListener('click', withFeedback(() => {
    if (state.poopCount === 0) {
      setMessage('もう きれい!');
      return;
    }
    state.poopCount = 0;
    state.happiness = clamp(state.happiness + 5, 0, 100);
    setMessage('おそうじ できた!');
  }));

  el.sleepBtn.addEventListener('click', withFeedback(() => {
    state.isSleeping = !state.isSleeping;
    setMessage(state.isSleeping ? 'おやすみなさい…' : 'おはよう!');
  }));

  el.medicineBtn.addEventListener('click', withFeedback(() => {
    if (state.isSick) {
      state.isSick = false;
      state.health = clamp(state.health + 20, 0, 100);
      state.energy = clamp(state.energy - 10, 0, 100);
      setMessage('げんきに なった!');
    } else {
      state.happiness = clamp(state.happiness - 10, 0, 100);
      state.health = clamp(state.health - 5, 0, 100);
      setMessage('びょうきじゃないのに… いやがっている');
    }
  }));

  el.resetBtn.addEventListener('click', withFeedback(() => {
    state = freshState();
    setMessage('あたらしい たまごが やってきた…');
  }));

  function loop() {
    setMessage('');
    tick();
    state.lastUpdate = Date.now();
    saveState();
    render();
  }

  // initial boot: simulate elapsed time since last visit, then start the live loop
  catchUpOffline();
  saveState();
  render();
  setInterval(loop, TICK_MS);

  // also save whenever the tab is hidden/closed so offline catch-up is accurate
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      state.lastUpdate = Date.now();
      saveState();
    }
  });
  window.addEventListener('beforeunload', () => {
    state.lastUpdate = Date.now();
    saveState();
  });
})();
