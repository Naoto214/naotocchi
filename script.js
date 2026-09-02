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
    screenNormal: document.getElementById('screenNormal'),
    minigameOverlay: document.getElementById('minigameOverlay'),
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
  let gameActive = false;

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

  // --- minigames (triggered by the play button) ---

  const catchGame = {
    start(container, onComplete) {
      const DURATION_MS = 10000;
      const ITEMS = ['🍙', '🍎', '🍬', '🍇'];
      let catches = 0;
      let running = true;
      let lastSpawn = 0;
      const spawnInterval = 850;
      let items = [];
      let basketX = 50;

      container.innerHTML = `
        <div class="mg-header">
          <span id="mgTimer">残り: 10s</span>
          <span id="mgScore">キャッチ: 0</span>
        </div>
        <div class="mg-title">おやつキャッチ!ゆびで うごかそう</div>
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
        const itemEl = document.createElement('div');
        itemEl.className = 'mg-falling-item';
        itemEl.textContent = ITEMS[Math.floor(Math.random() * ITEMS.length)];
        const xPct = 10 + Math.random() * 80;
        itemEl.style.left = xPct + '%';
        itemEl.style.top = '-20px';
        field.appendChild(itemEl);
        items.push({ el: itemEl, x: xPct, y: -20, speed: 60 + Math.random() * 30 });
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
            catches += 1;
            scoreEl.textContent = `キャッチ: ${catches}`;
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
        const score = Math.max(0, Math.min(100, catches * 15));
        onComplete(score);
      }

      rafId = requestAnimationFrame(frame);
    },
  };

  const whackGame = {
    start(container, onComplete) {
      const DURATION_MS = 8000;
      const HOLE_COUNT = 6;
      let hits = 0;
      let activeIndex = -1;
      let running = true;
      let hideTimeout;
      let spawnTimeout;

      container.innerHTML = `
        <div class="mg-header">
          <span id="mgTimer">残り: 8s</span>
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
        const score = Math.max(0, Math.min(100, hits * 16));
        onComplete(score);
      }

      scheduleNext(300);
    },
  };

  const timingGame = {
    start(container, onComplete) {
      const ROUNDS = 5;
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
    {
      text: 'きゅうに あめが ふってきたよ!どうする?',
      choices: [
        { label: 'いそいで やねの したに はしる', response: 'セーフ!ぬれなかったね', score: 90 },
        { label: 'あめの なかで おどっちゃう', response: 'たのしいけど ちょっと びしょぬれ…', score: 60 },
        { label: 'きにせず そのまま すすむ', response: 'かぜ ひかないでね…', score: 40 },
      ],
    },
    {
      text: 'おなかが すいてきた…なにを たべたい?',
      choices: [
        { label: 'おにぎり', response: 'もぐもぐ!げんきが でるね', score: 80 },
        { label: 'あまい おかし', response: 'にっこり!しあわせな あじ', score: 70 },
        { label: 'なんでも いいや', response: 'じゃあ おまかせだね', score: 50 },
      ],
    },
    {
      text: 'ともだちが けんかを してるみたい。どうする?',
      choices: [
        { label: 'なかに はいって なかなおりさせる', response: 'ふたりとも わらってくれた!', score: 90 },
        { label: 'そっと みまもる', response: 'しずかに おさまったみたい', score: 65 },
        { label: 'みなかったことに する', response: 'ちょっと きになるけど…', score: 35 },
      ],
    },
    {
      text: 'よる ねむれないとき、なにを する?',
      choices: [
        { label: 'ひつじを かぞえる', response: '1ぴき、2ひき…すやすや', score: 70 },
        { label: 'すきな おんがくを きく', response: 'こころが おちついたね', score: 85 },
        { label: 'がんばって おきてる', response: 'あさに なって ねむそう…', score: 40 },
      ],
    },
    {
      text: 'あたらしい ぼうしを もらったよ!どうする?',
      choices: [
        { label: 'さっそく かぶってみる', response: 'よく にあってるよ!', score: 85 },
        { label: 'だいじに しまっておく', response: 'たいせつに するんだね', score: 60 },
        { label: 'かがみで にあうか かくにんする', response: 'ばっちり!じしんまんまん', score: 75 },
      ],
    },
    {
      text: 'きょう ちょっと つかれちゃった…',
      choices: [
        { label: 'はやめに ねる', response: 'ぐっすり やすめそう', score: 90 },
        { label: 'すこし やすんでから がんばる', response: 'むりせず ちょうどいいね', score: 70 },
        { label: 'がまんして がんばりつづける', response: 'むりは きんもつだよ…', score: 30 },
      ],
    },
  ];

  const quizGame = {
    start(container, onComplete) {
      const q = QUIZ_QUESTIONS[Math.floor(Math.random() * QUIZ_QUESTIONS.length)];

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

      q.choices.forEach((choice) => {
        const btn = document.createElement('button');
        btn.className = 'mg-choice-btn';
        btn.textContent = choice.label;
        btn.addEventListener('pointerdown', () => {
          Array.from(choicesEl.children).forEach((b) => {
            b.disabled = true;
          });
          bubble.textContent = choice.response;
          setTimeout(() => onComplete(choice.score), 1100);
        });
        choicesEl.appendChild(btn);
      });
    },
  };

  const MINIGAMES = [catchGame, whackGame, timingGame, quizGame];

  function resultMessageForScore(score) {
    if (score >= 80) return 'だいせいこう!たのしかった!';
    if (score >= 50) return 'たのしく あそんだ!';
    return 'まあまあ あそべた!';
  }

  function finishMinigame(score) {
    const happinessGain = Math.round(5 + (clamp(score, 0, 100) / 100) * 20);
    state.happiness = clamp(state.happiness + happinessGain, 0, 100);
    state.energy = clamp(state.energy - 12, 0, 100);
    setMessage(resultMessageForScore(score));

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
    const game = MINIGAMES[Math.floor(Math.random() * MINIGAMES.length)];
    startMinigame(game);
  });

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
    if (gameActive) {
      // still age/decay stats in the background, but don't touch the DOM
      // while a minigame owns the screen
      tick();
      state.lastUpdate = Date.now();
      saveState();
      return;
    }
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
