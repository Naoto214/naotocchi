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
    BABY: 'baby',
    CHILD: 'child',
    TEEN: 'teen',
    ADULT: 'adult',
    ELDER: 'elder',
    DEAD: 'dead',
  };

  const AGE_THRESHOLDS = {
    hatch: 2,      // egg -> baby
    child: 40,     // baby -> child
    teen: 120,     // child -> teen
    adult: 280,    // teen -> adult (species is decided here)
    elder: 600,    // adult -> elder (same species, aged form)
  };

  const SPRITES = {
    [STAGE.EGG]: '🥚',
    [STAGE.BABY]: '🐣',
    [STAGE.CHILD]: '🐥',
    [STAGE.TEEN]: '🐤',
    [STAGE.DEAD]: '👻',
  };

  // what a pet becomes as an adult depends on how it was raised, and it keeps
  // that identity into old age rather than re-rolling
  const SPECIES = {
    dog: { adultEmoji: '🐶', adultLabel: 'いぬ', elderEmoji: '🐕', elderLabel: 'としをとった いぬ' },
    cat: { adultEmoji: '🐱', adultLabel: 'ねこ', elderEmoji: '🐈', elderLabel: 'としをとった ねこ' },
    bird: { adultEmoji: '🐦', adultLabel: 'とり', elderEmoji: '🦜', elderLabel: 'としをとった とり' },
    man: { adultEmoji: '🧑', adultLabel: 'おとこのひと', elderEmoji: '👴', elderLabel: 'おじいさん' },
    woman: { adultEmoji: '👩', adultLabel: 'おんなのひと', elderEmoji: '👵', elderLabel: 'おばあさん' },
    beetle: { adultEmoji: '🪲', adultLabel: 'カブトムシ', elderEmoji: '🪲', elderLabel: 'でんせつの カブトムシ' },
    stagbeetle: { adultEmoji: '🪲', adultLabel: 'クワガタムシ', elderEmoji: '🪲', elderLabel: 'でんせつの クワガタムシ' },
    god: { adultEmoji: '😇', adultLabel: 'かみさま', elderEmoji: '🌞', elderLabel: 'だいじんの かみさま' },
    ren: { adultEmoji: '🧒', adultLabel: 'れんくん', elderEmoji: '🧑', elderLabel: 'れんさん' },
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
    screenNormal: document.getElementById('screenNormal'),
    minigameOverlay: document.getElementById('minigameOverlay'),
  };

  function freshState() {
    return {
      stage: STAGE.EGG,
      species: null,
      hunger: 90,
      happiness: 90,
      energy: 90,
      health: 100,
      age: 0,
      poopCount: 0,
      isSick: false,
      sicknessType: null,
      isSleeping: false,
      lowHealthStreak: 0,
      careSum: 0,
      careTicks: 0,
      actionCounts: { feed: 0, play: 0, clean: 0, sleep: 0, medicine: 0 },
      minigameScoreSum: 0,
      minigameCount: 0,
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return freshState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return freshState();
      const merged = { ...freshState(), ...parsed };
      // migrate saves from before adults branched by species
      if (parsed.stage === 'adult_good' || parsed.stage === 'adult_bad') {
        merged.stage = STAGE.ADULT;
        merged.species = parsed.stage === 'adult_good' ? 'dog' : 'stagbeetle';
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

  const EVOLUTION_MESSAGES = {
    dog: 'げんきいっぱいの いぬに へんしんした!',
    cat: 'きままな ねこに へんしんした!',
    bird: 'じゆうな とりに へんしんした!',
    man: 'たくましい おとこのひとに せいちょうした!',
    woman: 'りりしい おんなのひとに せいちょうした!',
    beetle: 'たくましい カブトムシに へんしんした!',
    stagbeetle: 'りっぱな クワガタムシに へんしんした!',
    god: 'まさかの…かみさまに しんかした!!',
    ren: 'あれ!?れんくんが なかまに くわわった!',
  };

  // how a pet is raised decides what it becomes: the action used most often
  // picks a species, exceptional all-around care transcends that into a god,
  // and being consistently great at minigames has a rare chance of a very
  // different kind of surprise
  function decideSpecies() {
    const avgCare = state.careTicks > 0 ? state.careSum / state.careTicks : 50;
    const avgSkill = state.minigameCount > 0 ? state.minigameScoreSum / state.minigameCount : 0;

    if (state.minigameCount >= 5 && avgSkill >= 85 && Math.random() < 0.25) {
      return 'ren';
    }
    if (avgCare >= 90) {
      return 'god';
    }

    const counts = state.actionCounts;
    const ranked = [
      ['play', counts.play],
      ['sleep', counts.sleep],
      ['feed', counts.feed],
      ['clean', counts.clean],
      ['medicine', counts.medicine],
    ].sort((a, b) => b[1] - a[1]);
    const dominant = ranked[0][1] > 0 ? ranked[0][0] : 'feed';

    switch (dominant) {
      case 'play':
        return 'dog';
      case 'sleep':
        return 'cat';
      case 'feed':
        return 'bird';
      case 'clean':
        return counts.play >= counts.sleep ? 'woman' : 'man';
      case 'medicine':
        return counts.feed >= counts.clean ? 'beetle' : 'stagbeetle';
      default:
        return 'bird';
    }
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
      state.species = decideSpecies();
      state.stage = STAGE.ADULT;
      setMessage(EVOLUTION_MESSAGES[state.species]);
      bouncePet();
    } else if (state.stage === STAGE.ADULT && state.age >= AGE_THRESHOLDS.elder) {
      state.stage = STAGE.ELDER;
      setMessage(`${SPECIES[state.species].elderLabel} に なった…`);
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
      }

      // sickness risk - neglect (dirt, hunger, unhappiness, low health) raises
      // the odds of falling ill; well cared-for pets almost never trigger this
      const neglected = state.poopCount >= 2 || state.health < 50 || state.hunger < 30 || state.happiness < 30;
      if (!state.isSick && neglected) {
        if (Math.random() < 0.2) {
          const sickness = SICKNESS_TYPES[Math.floor(Math.random() * SICKNESS_TYPES.length)];
          state.isSick = true;
          state.sicknessType = sickness.label;
          setMessage(`${sickness.label}に なってしまった…くすりをあげよう`);
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
    [STAGE.DEAD]: 'おわり',
  };

  function currentSprite() {
    const species = state.species && SPECIES[state.species];
    if (state.stage === STAGE.ADULT && species) return species.adultEmoji;
    if (state.stage === STAGE.ELDER && species) return species.elderEmoji;
    return SPRITES[state.stage] || '❓';
  }

  function currentStageLabel() {
    const species = state.species && SPECIES[state.species];
    if (state.stage === STAGE.ADULT && species) return species.adultLabel;
    if (state.stage === STAGE.ELDER && species) return species.elderLabel;
    return STAGE_LABELS[state.stage] || '';
  }

  function render() {
    const isDead = state.stage === STAGE.DEAD;
    const isEgg = state.stage === STAGE.EGG;

    el.pet.textContent = currentSprite();
    el.ageLabel.textContent = `日齢: ${Math.floor(state.age / 20)}`;
    el.stageLabel.textContent = currentStageLabel();

    updateBar(el.hungerBar, isEgg || isDead ? 0 : state.hunger, 'hunger');
    updateBar(el.happinessBar, isEgg || isDead ? 0 : state.happiness, 'happiness');
    updateBar(el.energyBar, isEgg || isDead ? 0 : state.energy, 'energy');
    updateBar(el.healthBar, isEgg || isDead ? 0 : state.health, 'health');

    el.poopRow.textContent = '💩'.repeat(state.poopCount);

    const badges = [];
    if (state.isSick) {
      const sickness = SICKNESS_TYPES.find((s) => s.label === state.sicknessType);
      badges.push(sickness ? sickness.badge : '🤒');
    }
    if (state.isSleeping && !isDead) badges.push('💤');
    el.badges.textContent = badges.join(' ');

    el.screen.classList.toggle('dead', isDead);
    el.screen.classList.toggle('sick', state.isSick && !isDead);
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

  // --- minigames (triggered by the play button) ---

  const catchGame = {
    start(container, onComplete) {
      const DURATION_MS = 10000;
      const GOOD_ITEMS = ['🍙', '🍎', '🍬', '🍇'];
      const BAD_ITEMS = ['💩', '🪳', '🔪', '🔫'];
      const BAD_ITEM_CHANCE = 0.3;
      let points = 0;
      let running = true;
      let lastSpawn = 0;
      const spawnInterval = 850;
      let items = [];
      let basketX = 50;

      container.innerHTML = `
        <div class="mg-header">
          <span id="mgTimer">残り: 10s</span>
          <span id="mgScore">とくてん: 0</span>
        </div>
        <div class="mg-title">おやつキャッチ!わるい ものは よけよう</div>
        <div class="mg-catch-field" id="mgField">
          <div class="mg-basket" id="mgBasket" style="left:50%">🧺</div>
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
        items.push({ el: itemEl, x: xPct, y: -20, speed: 60 + Math.random() * 30, bad: isBad });
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

  const whackGame = {
    start(container, onComplete) {
      const DURATION_MS = 5000;
      const HOLE_COUNT = 6;
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
        <div class="mg-title">とびだす ほしを タップ!</div>
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
        holes[i].textContent = '⭐';
        hideTimeout = setTimeout(() => {
          holes[i].classList.remove('active');
          holes[i].textContent = '';
          activeIndex = -1;
          scheduleNext(200);
        }, 700);
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

  const timingGame = {
    start(container, onComplete) {
      const ROUNDS = 3;
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
          <div class="mg-title">ちょうどいい タイミングで タップ!</div>
          <div class="mg-gauge" id="mgGauge">
            <div class="mg-gauge-zone" id="mgZone"></div>
            <div class="mg-gauge-marker" id="mgMarker"></div>
          </div>
          <button class="mg-tap-btn" id="mgTapBtn">タップ!</button>
        </div>
      `;

      const zoneEl = container.querySelector('#mgZone');
      const markerEl = container.querySelector('#mgMarker');
      const tapBtn = container.querySelector('#mgTapBtn');
      const roundEl = container.querySelector('#mgRound');
      const scoreEl = container.querySelector('#mgScore');

      function newRound() {
        zoneWidth = 16 + Math.random() * 6;
        zoneStart = Math.random() * (100 - zoneWidth);
        zoneEl.style.left = zoneStart + '%';
        zoneEl.style.width = zoneWidth + '%';
        markerPct = 0;
        direction = 1;
        speed = 50 + round * 8;
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

  const QUIZ_QUESTIONS = [
    // --- ふつう ---
    {
      text: 'きゅうに あめが ふってきたよ!どうする?',
      choices: [
        { label: 'いそいで やねの したに はしる', response: 'セーフ!ぬれなかったね', score: 90 },
        { label: 'あめの なかで おどっちゃう', response: 'たのしいけど ちょっと びしょぬれ…', score: 60 },
        { label: 'きにせず そのまま すすむ', response: 'かぜ ひかないでね…', score: 40 },
        { label: 'ちかくの おみせに にげこむ', response: 'きてんの きく こうどう!', score: 80 },
      ],
    },
    {
      text: 'おなかが すいてきた…なにを たべたい?',
      choices: [
        { label: 'おにぎり', response: 'もぐもぐ!げんきが でるね', score: 80 },
        { label: 'あまい おかし', response: 'にっこり!しあわせな あじ', score: 70 },
        { label: 'なんでも いいや', response: 'じゃあ おまかせだね', score: 50 },
        { label: 'やさいを たべる', response: 'けんこうてき!からだ よろこぶね', score: 90 },
      ],
    },
    {
      text: 'ともだちが けんかを してるみたい。どうする?',
      choices: [
        { label: 'なかに はいって なかなおりさせる', response: 'ふたりとも わらってくれた!', score: 90 },
        { label: 'そっと みまもる', response: 'しずかに おさまったみたい', score: 65 },
        { label: 'みなかったことに する', response: 'ちょっと きになるけど…', score: 35 },
        { label: 'りょうほうの はなしを べつべつに きく', response: 'こうへいな しせい、りっぱだね', score: 85 },
      ],
    },
    {
      text: 'よる ねむれないとき、なにを する?',
      choices: [
        { label: 'ひつじを かぞえる', response: '1ぴき、2ひき…すやすや', score: 70 },
        { label: 'すきな おんがくを きく', response: 'こころが おちついたね', score: 85 },
        { label: 'がんばって おきてる', response: 'あさに なって ねむそう…', score: 40 },
        { label: 'あたたかい ミルクを のむ', response: 'からだも こころも ほっとするね', score: 80 },
      ],
    },
    {
      text: 'あたらしい ぼうしを もらったよ!どうする?',
      choices: [
        { label: 'さっそく かぶってみる', response: 'よく にあってるよ!', score: 85 },
        { label: 'だいじに しまっておく', response: 'たいせつに するんだね', score: 60 },
        { label: 'かがみで にあうか かくにんする', response: 'ばっちり!じしんまんまん', score: 75 },
        { label: 'ともだちに みせびらかす', response: 'うれしさが つたわってくるよ', score: 70 },
      ],
    },
    {
      text: 'きょう ちょっと つかれちゃった…',
      choices: [
        { label: 'はやめに ねる', response: 'ぐっすり やすめそう', score: 90 },
        { label: 'すこし やすんでから がんばる', response: 'むりせず ちょうどいいね', score: 70 },
        { label: 'がまんして がんばりつづける', response: 'むりは きんもつだよ…', score: 30 },
        { label: 'あたたかい おふろに はいる', response: 'つかれが とけていくね', score: 85 },
      ],
    },
    // --- シリアス ---
    {
      text: 'ずっと がんばってきたことが、うまくいかなかった。',
      choices: [
        { label: 'なみだを ふいて、またはじめから やりなおす', response: 'その つよさが、きっと みらいを かえる', score: 95 },
        { label: 'どうしてなのか、しずかに かんがえる', response: 'こたえは まだ みつからないけど…', score: 75 },
        { label: 'もう なにも かんがえたくない', response: 'たまには やすんでも いいんだよ', score: 35 },
        { label: 'しっぱいから まなぼうと する', response: 'その しせいが、つぎに つながるよ', score: 88 },
      ],
    },
    {
      text: 'たいせつな なにかを、うしなってしまった。',
      choices: [
        { label: 'かなしみを うけとめて、まえを むく', response: 'その きもち、わすれなくて いいんだよ', score: 90 },
        { label: 'だれかに きもちを はなす', response: 'ひとりじゃ ないって おもえたね', score: 80 },
        { label: 'なかったことに しようとする', response: 'むりに わすれなくても だいじょうぶ', score: 30 },
        { label: 'しずかに なみだを ながす', response: 'なくのも、こころの だいじな しょほう', score: 85 },
      ],
    },
    {
      text: 'じぶんの いきる いみって、なんだろう。ふと そんなことを かんがえた。',
      choices: [
        { label: 'こたえは ひとつじゃないと きづく', response: 'そのとおり。きみの ものがたりは、きみだけの もの', score: 90 },
        { label: 'みらいの じぶんに きいてみる', response: 'いつか こたえが みえてくるかも', score: 75 },
        { label: 'かんがえるのを やめる', response: 'たまには そういう ひも あるよね', score: 40 },
        { label: 'いま この しゅんかんを たいせつに する', response: 'それこそが、いちばんの こたえ かもしれない', score: 88 },
      ],
    },
    {
      text: 'みんなが すすむ みちと、じぶんの きもちが ちがう きがする。',
      choices: [
        { label: 'じぶんの こえを しんじて すすむ', response: 'その ゆうきが、みちを ひらくよ', score: 90 },
        { label: 'もうすこし かんがえる じかんを もつ', response: 'あわてなくても だいじょうぶ', score: 75 },
        { label: 'みんなに あわせておく', response: 'それも ひとつの えらびかた', score: 45 },
        { label: 'しんらいできる ひとに そうだんする', response: 'ひとりで かかえなくて いいんだよ', score: 85 },
      ],
    },
    {
      text: 'もう にどと あえない ひとが いる。ふと おもいだす よるが ある。',
      choices: [
        { label: 'おもいでを たいせつに しまっておく', response: 'その おもいでは、きえたりしないよ', score: 90 },
        { label: 'つたえられなかった かんしゃを くやむ', response: 'いまからでも、こころの なかで つたえられるよ', score: 65 },
        { label: 'かんがえないように する', response: 'むりせず、じぶんの ペースで いいんだよ', score: 35 },
        { label: 'そのひとの ぶんまで げんきに いきようと おもう', response: 'それは、すてきな くようの かたち', score: 88 },
      ],
    },
    {
      text: 'あしたが こなければいいのに、と おもう よるが ある。',
      choices: [
        { label: 'その きもちを、だれかに はなしてみる', response: 'ひとりで かかえなくて いいんだよ', score: 90 },
        { label: 'あさまで ただ じっと まつ', response: 'よるは、いつか あけるから', score: 60 },
        { label: 'なにも かんがえずに ねむる', response: 'ゆっくり やすんでね', score: 55 },
        { label: 'すきな ものがたりを よんで きを まぎらわす', response: 'こころが すこし かるく なったかな', score: 75 },
      ],
    },
    // --- 大人っぽい ---
    {
      text: 'あしたは だいじな しごとの ひ。きんちょうで ねむれない…',
      choices: [
        { label: 'じゅんびは できてる。じぶんを しんじる', response: 'その じしんが、きっと ちからに なる', score: 90 },
        { label: 'なんども だんどりを かくにんしてしまう', response: 'まじめだね。でも たまには きゅうけいも', score: 70 },
        { label: 'かんがえるのを やめて スマホを みる', response: 'げんじつ とうひも、たまには ひつよう', score: 45 },
        { label: 'はやめに ふとんに はいって めを とじる', response: 'リラックスも たいせつな じゅんび', score: 80 },
      ],
    },
    {
      text: 'きゅうりょうびまえで、さいふの なかが さみしい。',
      choices: [
        { label: 'つぎの げつまつまで けいかくを たてる', response: 'その りせいてきさ、みならいたい', score: 85 },
        { label: 'すこしだけ ぜいたくして じぶんに ごほうび', response: 'たまには いいよね', score: 65 },
        { label: 'みなかったことに して つかっちゃう', response: 'あとで こうかいしても しらないよ…', score: 30 },
        { label: 'いえに ある もので すごす', response: 'くふうする ちから、すごいね', score: 80 },
      ],
    },
    {
      text: 'かいぎで、じぶんの いけんと まわりの いけんが ぶつかった。',
      choices: [
        { label: 'れいせいに、じぶんの かんがえを つたえる', response: 'おとなの たいおう、かっこいいね', score: 90 },
        { label: 'あいての いいぶんも きいてみる', response: 'そのバランスかんかく、だいじだね', score: 85 },
        { label: 'めんどうだから だまっておく', response: 'それも ひとつの せんたく', score: 40 },
        { label: 'いちど もちかえって かんがえる', response: 'あわてない、その よゆう だいじだね', score: 80 },
      ],
    },
    {
      text: 'ふと、じぶんの しょうらいの ことを かんがえてしまう よるが ある。',
      choices: [
        { label: 'すこしずつ ちょきんを はじめる', response: 'みらいの じぶんが よろこぶよ', score: 85 },
        { label: 'かんがえても しかたないから いまを たのしむ', response: 'それも ひとつの いきかた', score: 65 },
        { label: 'かんがえたくなくて めを そらす', response: 'いつか むきあう ひが くるかも', score: 35 },
        { label: 'あたらしい スキルを べんきょうしはじめる', response: 'みらいへの とうし、すてきだね', score: 88 },
      ],
    },
    {
      text: 'こうはいから、しんけんな そうだんを もちかけられた。',
      choices: [
        { label: 'じっくり はなしを きいて アドバイスする', response: 'たよりに されてるね', score: 90 },
        { label: 'じぶんの けいけんを シェアする', response: 'それも りっぱな サポート', score: 75 },
        { label: 'めんどうだと おもいつつ うなずいておく', response: 'せめて きくしせいは だいじだよ', score: 40 },
        { label: 'いっしょに かいけつさくを かんがえる', response: 'こころ強い せんぱいだね', score: 88 },
      ],
    },
    {
      text: 'ふと、じぶんの おやの としを かんがえてしまった。',
      choices: [
        { label: 'こんど れんらくしてみようと きめる', response: 'その きもち、つたわると いいね', score: 90 },
        { label: 'かんしゃの きもちが わいてくる', response: 'そのきもち、たいせつに', score: 85 },
        { label: 'いそがしくて わすれてしまう', response: 'ふと おもいだした いまが チャンスかも', score: 40 },
        { label: 'しゃしんを みかえして きもちに ひたる', response: 'そのじかんも、たいせつな くよう', score: 75 },
      ],
    },
    // --- 馬鹿らしい ---
    {
      text: 'めのまえに、たいやきが あらわれた!なぜか しゃべる。',
      choices: [
        { label: 'たいやきと ともだちに なる', response: 'あんこの なかまが ふえたね', score: 80 },
        { label: 'とりあえず たべる', response: 'ちょっと ざんこくだけど…おいしかった?', score: 60 },
        { label: 'さけぶ', response: 'たいやきも びっくりしてる', score: 40 },
        { label: 'いっしょに さんぽに でかける', response: 'へんな コンビの たんじょうだ', score: 70 },
      ],
    },
    {
      text: 'そらから いきなり バナナが ふってきた。',
      choices: [
        { label: 'かさがわりに する', response: 'あたらしい はつめいかも しれない', score: 70 },
        { label: 'みんなに くばる', response: 'バナナパーティーの はじまりだ', score: 85 },
        { label: 'ふまないように そっと よける', response: 'けんめいな はんだん', score: 55 },
        { label: 'たべて エネルギーほきゅう', response: 'バナナパワー じゅうてん!', score: 75 },
      ],
    },
    {
      text: 'あさおきたら、じぶんの あたまが キャベツに なっていた。',
      choices: [
        { label: 'きにせず いつもどおり すごす', response: 'その どきょう、すごい', score: 75 },
        { label: 'ぼうしを かぶって かくす', response: 'さくせん せいこう?', score: 65 },
        { label: 'サラダに されないか しんぱいする', response: 'きもちは わかる', score: 50 },
        { label: 'びょういんに いくか なやむ', response: 'しんちょうな はんだんだね', score: 60 },
      ],
    },
    {
      text: 'ペットが きゅうに にんげんの ことばで はなしかけてきた。',
      choices: [
        { label: 'ふつうに かいわを たのしむ', response: 'あたらしい なかまとの かいわ、たのしそう', score: 85 },
        { label: 'びっくりして こしを ぬかす', response: 'むりも ないね', score: 55 },
        { label: 'ゆめだと おもって もういちど ねる', response: 'げんじつだったら どうしよう', score: 60 },
        { label: 'なにか おねがいごとを きいてみる', response: 'ちゃっかりしてるね', score: 70 },
      ],
    },
    {
      text: 'せかいが きゅうに ぜんぶ プリンに なってしまった。',
      choices: [
        { label: 'よろこんで たべまくる', response: 'あまい せかい、さいこう', score: 80 },
        { label: 'もったいなくて どうしようか なやむ', response: 'なやんでいるうちに とけちゃうかも', score: 60 },
        { label: 'もとに もどす ほうほうを さがす', response: 'けんきゅうしゃの すじが あるかも', score: 65 },
        { label: 'プリンの うえで ジャンプする', response: 'むじゃきで たのしそう', score: 70 },
      ],
    },
    {
      text: 'みぎあしと ひだりあしが、けんかを はじめてしまった。',
      choices: [
        { label: 'なかなおりさせる', response: 'へいわが もどったね', score: 75 },
        { label: 'そのまま けんかを みまもる', response: 'あしあと、じぐざぐに なってるよ', score: 45 },
        { label: 'みてみぬふりを する', response: 'あしあと そのまま すすもう', score: 55 },
        { label: 'りょうほうに ごほうびを あげる', response: 'こうへいな かいけつほうだね', score: 65 },
      ],
    },
    // --- ラブロマンス的 ---
    {
      text: 'きになる ひとと めが あった。しゅんかん、じかんが とまった きが した。',
      choices: [
        { label: 'おもいきって わらいかけてみる', response: 'せかいが きゅうに いろづいて みえたね', score: 90 },
        { label: 'どきどきして めを そらしてしまう', response: 'その きもちも、りっぱな こいの はじまり', score: 70 },
        { label: 'きのせいだと じぶんに いいきかせる', response: 'ほんとうに、そうかな?', score: 45 },
        { label: 'しぜんに あいさつを する', response: 'その いっぽが、なにかを かえるかも', score: 80 },
      ],
    },
    {
      text: 'たいせつな ひとに、きもちを つたえる ひが きた。',
      choices: [
        { label: 'まっすぐ きもちを ことばに する', response: 'その ゆうき、いつまでも おぼえておいて', score: 95 },
        { label: 'てがみに かいて わたす', response: 'ことばには できない おもいも、とどくよ', score: 85 },
        { label: 'けっきょく いえずに おわる', response: 'つぎの チャンスは、きっと くる', score: 40 },
        { label: 'ともだちに せなかを おしてもらう', response: 'だれかの ちからを かりるのも ゆうき', score: 80 },
      ],
    },
    {
      text: 'あめの ひ、かさを わすれた ひとに かさを さしだされた。',
      choices: [
        { label: 'どきどきしながら いっしょに あるく', response: 'あめさえも、うつくしく みえる しゅんかん', score: 90 },
        { label: 'おれいを いって わかれる', response: 'その やさしさは、きっと わすれない', score: 65 },
        { label: 'えんりょして ことわる', response: 'ちょっと もったいなかったかも?', score: 40 },
        { label: 'かさを いっしょに もつ ていあんを する', response: 'きょりが ちかづく しゅんかんだね', score: 85 },
      ],
    },
    {
      text: 'むかしの こいびとから、ふいに れんらくが きた。',
      choices: [
        { label: 'なつかしさに ほほえんで へんじを する', response: 'おもいでは、やさしく こころに のこってる', score: 80 },
        { label: 'すこし まよってから へんじする', response: 'そのまよいも、しぜんな きもち', score: 70 },
        { label: 'みなかったことに する', response: 'いまの じぶんを だいじに するのも だいじ', score: 50 },
        { label: 'いまの きもちを しょうじきに つたえる', response: 'せいじつさが、いちばん つたわるよ', score: 88 },
      ],
    },
    {
      text: 'ふたりで みた ゆうやけが、わすれられないほど きれいだった。',
      choices: [
        { label: 'この しゅんかんを、いつまでも おぼえておこうと おもう', response: 'その きもちが、いちばんの たからもの', score: 90 },
        { label: 'しゃしんに とって のこす', response: 'きろくも、また すてきな しゅだん', score: 80 },
        { label: 'とくに なにも かんじない', response: 'ひとそれぞれ、かんじかたは ちがうよね', score: 50 },
        { label: 'となりの ひとの よこがおを ちらっと みる', response: 'その どきどきも、たからものだね', score: 85 },
      ],
    },
    {
      text: 'ずっと そばに いてくれた ひとの ありがたみに、ふと きづいた。',
      choices: [
        { label: 'すなおに 「ありがとう」と つたえる', response: 'その ひとことが、なによりの プレゼント', score: 95 },
        { label: 'こんど なにか おかえしを しようと きめる', response: 'きもちが かたちに なると うれしいね', score: 80 },
        { label: 'きづいたけど、なんとなく いいそびれる', response: 'つたえるのに、おそすぎることは ないよ', score: 45 },
        { label: 'てがみを かいて わたす', response: 'ことばに した きもちは、ずっと のこるよ', score: 90 },
      ],
    },
  ];

  let quizQueue = [];
  let lastQuizIndex = -1;

  function refillQuizQueue() {
    quizQueue = QUIZ_QUESTIONS.map((_, i) => i);
    for (let i = quizQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [quizQueue[i], quizQueue[j]] = [quizQueue[j], quizQueue[i]];
    }
    if (quizQueue.length > 1 && quizQueue[quizQueue.length - 1] === lastQuizIndex) {
      [quizQueue[0], quizQueue[quizQueue.length - 1]] = [quizQueue[quizQueue.length - 1], quizQueue[0]];
    }
  }

  function nextQuizQuestion() {
    if (quizQueue.length === 0) refillQuizQueue();
    const idx = quizQueue.pop();
    lastQuizIndex = idx;
    return QUIZ_QUESTIONS[idx];
  }

  const quizGame = {
    start(container, onComplete) {
      const q = nextQuizQuestion();

      container.innerHTML = `
        <div class="mg-title">なおとっちが はなしかけてきた</div>
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
          // close right away instead of lingering on a second screen - the
          // choice's response text becomes the normal status message once
          // back on the main screen, where it gets its own guaranteed
          // display time (see setMessage).
          onComplete(choice.score, choice.response);
        });
        choicesEl.appendChild(btn);
      });
    },
  };

  const MINIGAMES = [catchGame, whackGame, timingGame, quizGame];
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
    const happinessGain = Math.round(5 + (clamp(score, 0, 100) / 100) * 20);
    state.happiness = clamp(state.happiness + happinessGain, 0, 100);
    state.energy = clamp(state.energy - 12, 0, 100);
    state.minigameScoreSum += clamp(score, 0, 100);
    state.minigameCount += 1;
    setMessage(customMessage || resultMessageForScore(score));

    gameActive = false;
    el.minigameOverlay.classList.add('hidden');
    el.minigameOverlay.innerHTML = '';
    el.screenNormal.classList.remove('hidden');

    bouncePet();
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
    state.hunger = clamp(state.hunger + 25, 0, 100);
    state.happiness = clamp(state.happiness + 3, 0, 100);
    state.actionCounts.feed += 1;
    setMessage('もぐもぐ おいしい!');
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
    setMessage('おそうじ できた!');
  }));

  el.sleepBtn.addEventListener('click', withFeedback(() => {
    state.isSleeping = !state.isSleeping;
    if (state.isSleeping) state.actionCounts.sleep += 1;
    setMessage(state.isSleeping ? 'おやすみなさい…' : 'おはよう!');
  }));

  el.medicineBtn.addEventListener('click', withFeedback(() => {
    state.actionCounts.medicine += 1;
    if (state.isSick) {
      state.isSick = false;
      state.sicknessType = null;
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
