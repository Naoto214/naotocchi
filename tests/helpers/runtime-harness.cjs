const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('meguru.js', 'utf8') + '\n' + fs.readFileSync('quick.js', 'utf8') + '\n' + fs.readFileSync('games.js', 'utf8') + '\n' + fs.readFileSync('audio.js', 'utf8') + '\n' + fs.readFileSync('item-memories.js', 'utf8') + '\n' + fs.readFileSync('item-system.js', 'utf8') + '\n' + fs.readFileSync('movie-dialogue.js', 'utf8') + '\n' + fs.readFileSync('script.js', 'utf8');
const master = fs.readFileSync('character-world-master.v1.js', 'utf8');

// テストの とけい。
//
// きほんは これまでどおり **`Date.now()` だけ**を ハーネスの とけいに する。
// `new Date()` は じっさいの いまを かえす。
//
// `pinDate: true` を わたすと **`new Date()` も おなじ とけいに そろえる**。
// そろえないと script.js の `dailyKey(d = new Date())` と `getCalendarSeason()` が
// 「きょうの ひづけ」で 変わり、meguru.js の buildRegistry / buildWorld が
//   hash(def.id + ':' + day)     → その住民が きょう どの地域に すむか
//   hash(s.id + regionId + day)  → どの spot に わりあてられるか
// に つかう ので、**住民の めんつと ばしょが 日ごとに 変わって**
// seed を 固定して いても らんすうの つかわれかたが ずれる。
//
// **ぜんぶの テストで そろえては いけない。** ひがわりの きろく(まいにちチャレンジ・
// れんぞくログイン)を みる テストは 「ひづけが すすむ」ことを あてに して いて、
// とめると おわらなく なる。だから **ほしい テストだけが えらぶ** かたちに して ある。
//
// どちらの ばあいも `new Date(x)` や `new Date(y, m, d)` は ひきすうを つかう
function fakeDate(nowOf, pin) {
  class TestDate extends Date {
    constructor(...a) { if (pin && a.length === 0) super(nowOf()); else super(...a); }
    static now() { return nowOf(); }
  }
  return TestDate;
}

// RH-3: 決定的に うごかす ための 任意の せってい。
//   environment: { time, weather } … world-environment の 時間帯と 予想天気を この値に する。
//     RH-6: 既定は DEFAULT_ENVIRONMENT(ひる・はれ)。host の 時計しだいで 時間帯と 天気が かわる 本物の
//     ふるまいを ためす テストだけ environment: 'auto' を わたす(Roadmap §7.3「既定値を 固定側に、'auto' は opt-in」)。
//     script.js の timeMode / weatherMode は 'auto' の まま(save の 状態は 書きかえない)。
//     季節は script.js の こよみ から きまるので、ここでは 固定しない(pinDate + clockNow を つかう)。
//   hostEnvironmentClock: true … world-environment は host の require なので、日付を 省いた ときは
//     host の じっさいの 時計を 見る。これを harness の 時計(now)に する(時刻の 解釈は host の TZ)。
//   seed: 数 … 1 つの mulberry32 を、起動前から ページの Math.random と めぐるの setRandom の
//     両方に つなぐ。new Date() ぜんたいは 固定しない(9edc0e7 の hang を さける)。
//   strictRegions(RH-4、既定 true)… 知らない 地域 ID・typo・文字列でない 値で script.js の resolveRegionId が throw する
//     (本番では home へ 解決して 1 回だけ 記録)。正式な alias(tropical → jungle)は 正常。
//     知らない ID を わざと ためす テストだけ false にする。
//   deterministic: true(RH-6)… host の 時計・TZ・らんすう に よらない 場面に する プリセット
//     (environment + hostEnvironmentClock + seed + pinDate + clockNow)。個別に わたした 値が 優先。
//     seed / pinDate は 既定には しない(別の harness が 同じ らんすうに なる・日の 進む テストが とまる)。
const ENVIRONMENT_TIMES = ['morning', 'day', 'evening', 'night'];
const DEFAULT_ENVIRONMENT = Object.freeze({ time: 'day', weather: 'sunny' });
const DETERMINISTIC = Object.freeze({ environment: DEFAULT_ENVIRONMENT, hostEnvironmentClock: true, seed: 20260923, pinDate: true, clockNow: Date.parse('2026-09-16T12:00:00Z') });
const ENVIRONMENT_WEATHERS = ['sunny', 'cloudy', 'rain', 'snow'];
// world-environment.js の WEATHER_LABELS と おなじ(export されていないので うつす。テストで一致を たしかめる)
const ENVIRONMENT_WEATHER_LABELS = { sunny: 'はれ', cloudy: 'くもり', rain: 'あめ', snow: 'ゆき' };
function seededRandom(seed) {
  let a = seed >>> 0, calls = 0;
  const next = () => {
    calls++;
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, calls: () => calls };
}
function environmentModule(nowOf, environment, hostEnvironmentClock) {
  const real = require('../../world-environment.js');
  if (environment === 'auto') environment = undefined;
  if (!environment && !hostEnvironmentClock) return real;
  const { time, weather } = environment || {};
  assert.ok(time === undefined || ENVIRONMENT_TIMES.includes(time), 'environment.time: ' + time);
  assert.ok(weather === undefined || ENVIRONMENT_WEATHERS.includes(weather), 'environment.weather: ' + weather);
  const clock = (date) => date || (hostEnvironmentClock ? new Date(nowOf()) : undefined);
  // require の キャッシュを こわさない ように、うつしを つくって かぶせる
  return Object.assign({}, real, {
    timeOfDay(mode, date) {
      if (time && !ENVIRONMENT_TIMES.includes(mode)) return time; // 手で えらんだ mode は そのまま
      return real.timeOfDay(mode, clock(date));
    },
    simulatedWeather(regionId, season, date) {
      const base = real.simulatedWeather(regionId, season, clock(date));
      if (base === null || !weather) return base; // 海の底・星の停留所は いままでどおり null
      return { ...base, mode: weather, label: ENVIRONMENT_WEATHER_LABELS[weather] };
    },
    weatherFromResponse(data, at) {
      return real.weatherFromResponse(data, at === undefined && hostEnvironmentClock ? nowOf() : at);
    },
  });
}

// Run the real session/input code. The DOM and clock are substitutes: these
// tests do not measure browser rendering, physical input delivery or FPS.
function harness(options = {}) {
  return createHarness(options.deterministic ? { ...DETERMINISTIC, ...options } : options);
}
function createHarness({storage, resume = false, geolocation, fetcher, reducedMotion = false, viewportHeight, canvasContext, imageClass, foodIllustrations = true, propIllustrations = true, fullDisplay = false, worldScene = false, clockNow = 1000, pinDate = false, environment = DEFAULT_ENVIRONMENT, hostEnvironmentClock = false, seed, strictRegions = true} = {}) {
  let now = clockNow, serial = 0;
  const rng = seed === undefined ? null : seededRandom(seed);
  const timers = new Map(), elements = new Map();
  const motionListeners = [];
  const motionPreference = {matches:reducedMotion,addEventListener:(type,fn)=>{if(type==='change')motionListeners.push(fn);}};
  const noop = () => {};
  let document, window;
  const event = (type, init = {}) => ({ type, bubbles: true, preventDefault: noop, ...init });
  function node(id = '') {
    const listeners = [], classes = new Set();
    const queries = new Map();
    let html = '';
    const el = {
      id, listeners, dataset: {}, style: { setProperty(k,v) {this[k]=String(v);}, removeProperty(k) {delete this[k];} },
      children: [], animations: [], textContent: '', value: '', disabled: false, isConnected: true,
      clientWidth: 300, clientHeight: 300,
      classList: {
        add: (...ns) => ns.forEach(n => classes.add(n)),
        remove: (...ns) => ns.forEach(n => classes.delete(n)),
        contains: n => classes.has(n),
        toggle(n, force) { const yes = force ?? !classes.has(n); yes ? classes.add(n) : classes.delete(n); return yes; },
      },
      addEventListener(type, fn, options) { listeners.push({type, fn, capture: options === true || !!options?.capture}); },
      removeEventListener(type, fn) { const i = listeners.findIndex(l => l.type === type && l.fn === fn); if (i >= 0) listeners.splice(i, 1); },
      dispatchEvent(e) { dispatch(el, e); return true; },
      querySelector(selector) {
        if (selector.startsWith('button[data-key=')) {
          const key = selector.match(/="([^"]+)"/)[1];
          return el.children.find(c => c.dataset.key === key) || null;
        }
        if (!queries.has(selector)) queries.set(selector, node(selector));
        return queries.get(selector);
      },
      querySelectorAll: selector => selector === 'button' ? el.children.filter(c => c.tagName === 'BUTTON')
        : /^\.mg-(drop-target|drag-item|bento-preview)$/.test(selector)
          ? el.children.filter(c => c.isConnected && c.classList.contains(selector.slice(1))) : [],
      appendChild(child) { child.isConnected = true; child.parentNode = el; el.children.push(child); return child; },
      removeChild(child) { const i = el.children.indexOf(child); if (i >= 0) el.children.splice(i, 1); child.isConnected = false; child.parentNode = null; return child; },
      remove() { if (el.parentNode && el.parentNode.removeChild) el.parentNode.removeChild(el); },
      animate(frames, options) {
        const animation = {frames, options, playState: 'running', cancel() {
          animation.playState = 'idle'; timers.delete(animation.timer);
        }};
        animation.timer = schedule(() => {
          animation.playState = 'finished'; animation.onfinish?.();
        }, options.duration + (options.delay || 0));
        el.animations.push(animation);
        return animation;
      },
      closest: selector => selector === 'button[data-hold]' && el.dataset.hold ? el
        : selector === '.transform-choice-btn' && el.dataset.line ? el : null,
      getBoundingClientRect: () => ({left: 0, top: 0, width: 300, height: id === 'speechSlot' ? 44 : 300}),
      getContext: () => canvasContext || null,
      setAttribute(name, value) { el[name === 'aria-pressed' ? 'ariaPressed' : name] = String(value); },
      focus: () => { document.activeElement = el; }, scrollIntoView: noop,
      setPointerCapture: noop, releasePointerCapture: noop,
      remove() { el.isConnected = false; },
    };
    Object.defineProperty(el, 'innerHTML', {get: () => html, set(value) {
      html = value;
      el.textContent = String(value).replace(/<[^>]*>/g,'').replace(/&(amp|lt|gt|quot|#39);/g,(_,key)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"})[key]);
      el.children.forEach(c => { c.isConnected = false; });
      el.children = []; queries.clear();
      // Cast identity is needed to exercise reactions against the actual speaker.
      for (const [, id] of String(value).matchAll(/<span\b[^>]*\bdata-companion-id="([^"]+)"[^>]*>/g)) {
        const child = node(); child.dataset.companionId = id; el.children.push(child);
      }
      // Only input metadata is needed; canvas/layout are deliberately absent.
      for (const [, attrs, label] of String(value).matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
        const id = attrs.match(/\bid="([^"]+)"/)?.[1];
        const btn = node(id); btn.tagName = 'BUTTON'; btn.textContent = label;
        for (const [, key, val] of attrs.matchAll(/\bdata-([\w-]+)="([^"]*)"/g)) btn.dataset[key] = val;
        el.children.push(btn); if (id) queries.set('#' + id, btn);
      }
      // These two DOM games need draggable/target metadata, not simulated layout.
      for (const [, attrs, body] of String(value).matchAll(/<div\b([^>]*class="mg-(?:drop-target|drag-item|bento-preview)[^"]*"[^>]*)>([\s\S]*?)<\/div>/g)) {
        const child = node(); child.innerHTML = body;
        child.classList.add(...attrs.match(/class="([^"]*)"/)[1].split(/\s+/));
        const key = attrs.match(/data-key="([^"]*)"/)?.[1];
        if (key) child.dataset.key = key;
        el.children.push(child);
      }
      const tray = String(value).match(/<div class="mg-drag-tray([^"]*)" id="mgTray">/);
      if (tray) {
        const child = node('mgTray');
        child.classList.add('mg-drag-tray', ...tray[1].trim().split(/\s+/).filter(Boolean));
        queries.set('#mgTray', child);
      }
    }});
    return new Proxy(el, {get: (obj, key) => key in obj ? obj[key] : noop});
  }
  const get = id => { if (!elements.has(id)) elements.set(id, node(id)); return elements.get(id); };
  function dispatch(target, e) {
    e.target = target;
    const path = target === window ? [window] : target === document ? [window, document] : [window, document, target];
    for (const t of path) for (const l of t.listeners) if (l.type === e.type && l.capture) l.fn(e);
    for (const t of path.toReversed()) {
      if (t !== target && !e.bubbles) continue;
      for (const l of t.listeners) if (l.type === e.type && !l.capture) l.fn(e);
    }
  }
  document = Object.assign(node('document'), {
    getElementById: get, querySelector: get, querySelectorAll: () => [], createElement: () => node(),
    body: node('body'), documentElement: node('html'), visibilityState: 'visible', activeElement: null,
  });
  window = {...node('window')};
  if(worldScene) for(const id of ['storyFlash','lifeCardOverlay']) get(id).classList.add('hidden');
  if (viewportHeight) window.visualViewport=Object.assign(node('viewport'),{height:viewportHeight,scale:1});
  const schedule = (fn, delay = 0, ...args) => {
    const id = ++serial; timers.set(id, {at: now + Math.max(1, delay), fn: () => fn(...args)}); return id;
  };
  // window is the VM global, as in a browser. This activates the production
  // requestAnimationFrame/setTimeout session wrappers (the boot smoke does not).
  const sandbox = Object.assign(window, {
    console, document, window, TextEncoder, TextDecoder, btoa, atob, Date: fakeDate(() => now, pinDate),
    navigator: {userAgent: 'minigame-lifecycle-test', maxTouchPoints: 1, geolocation},
    fetch: fetcher,
    NaotocchiCast: require('../../cast-layout.js'),
    NaotocchiCastBounds: require('../../cast-bounds.js'),
    NaotocchiCastMotion: fs.existsSync('cast-motion.js') ? require('../../cast-motion.js') : undefined,
    NaotocchiEnvironment: environmentModule(() => now, environment, hostEnvironmentClock),
    NaotocchiStrictRegions: strictRegions,
    NaotocchiLocalScenery: require('../../local-scenery.js'),
    NaotocchiWorldScene: worldScene ? require('../../world-scene.js') : undefined,
    NaotocchiCareStatus: require('../../care-status.js'),
    matchMedia: () => motionPreference,
    getComputedStyle: el => ({transform: el.style.transform || 'none'}),
    performance: {now: () => now}, innerWidth: 390, innerHeight: 844,
    localStorage: storage || {getItem: () => null, setItem: noop, removeItem: noop},
    location: {href: 'https://naoto214.github.io/naotocchi/'},
    crypto: {getRandomValues: a => a},
    setTimeout: schedule, clearTimeout: id => timers.delete(id),
    requestAnimationFrame: fn => schedule(() => fn(now), 16), cancelAnimationFrame: id => timers.delete(id),
    setInterval: () => ++serial, clearInterval: noop,
    Event: function(type, init) {Object.assign(this, event(type, init));},
    PointerEvent: function(type, init) {Object.assign(this, event(type, init));},
    ...(imageClass ? { Image: imageClass } : {}),
    HTMLImageElement: class {static [Symbol.hasInstance](node) {return node?.tagName === 'IMG';}},
  });
  const expose = `
    globalThis.lifecycle = {
      getMessage: () => message,
      crownAchievementWeight: typeof crownAchievementWeight === 'function' ? crownAchievementWeight : () => 1,
      drawRandomSticker, pickRandomMinigame, refillMinigameQueue,
      queue: () => minigameQueue.map(i => currentMinigamePool[i].id),
      rankGameFixtures: games => {
        currentMinigamePool = games; minigameQueue = games.map((_, i) => i);
        minigameCrownFactors = ''; refreshCrownMinigameQueue();
        return minigameQueue.map(i => currentMinigamePool[i].id);
      },
      ringDexWeight: typeof ringDexWeight === 'function' ? ringDexWeight : () => 1,
      pickRingCandidate: typeof pickRingCandidate === 'function' ? pickRingCandidate : (pool) => pool[Math.floor(Math.random()*pool.length)] || null,
      pickTransformCandidates, pickTicketTransformCandidates, pickCompanionByRegion,
      currentFormStageIndex, mutualRomanticMatch, recordDiscoveryKey, applyDecline,
      ENV_MOMENTS, syncNaotoRewardItems,
      drawEnvironmentMoment: typeof drawEnvironmentMoment === 'function' ? drawEnvironmentMoment : pool => Math.random() < .45 ? pool[Math.floor(Math.random() * pool.length)] : null,
      hatchEgg, pickDreamLine, startDuelChallenge, chooseDuelTruth, chooseDuelHonesty, finalizeDuelChallenge, abandonDuelChallenge,
      startDuelGuess, setDuelGuess, confirmDuelGuesses, chooseDuelSuspicion, encodeDuelChallenge, encodeDuelGuess, encodeDuelReveal,
      resolveDuelWithGuessCode, resolveDuelWithRevealCode, settleDuelForSelf,
      cancelNextEgg, openDreamPicker, openThemedStickerPack,
      audio, checkMeters, closePicker, resolvePickerSelection, normalLines: NORMAL_LINES, normalCompanions: COMPANIONS, rareCompanions: RARE_COMPANIONS, partnerCandidates: ALL_PARTNER_CANDIDATES, pendingCompanion: () => pendingCompanionId, setPendingCompanion: id => { pendingCompanionId = id; }, startMinigame, retireMinigame, bindHeldButton, loadState, saveState, doWipe, restoreSaveSnapshot, mgPerfSample,
      finishMinigame, sodachiCost, applyGrowth, recoverSleepStep, grantGrowthBoost, SODACHI_COST_BANDS, SODACHI_MAX,
      useConsumableItem, buyConsumableItem, itemStock: id => ITEM_SYSTEM.stock(state, id), ITEM_SYSTEM, addItemMemory, onSodachiMilestone, CONSUMABLE_ITEMS, dailyChallengeGame, dailyChallengeToday, renderGameList, activeBoostSummary, SHOP_ITEMS,
      currentVisualForm, experiencedSpecies, normalLines:NORMAL_LINES, rareLines:RARE_LINES,
      pickerValues: () => pickerItem?.picker === 'dex-form' ? temporaryDexKeys()
        : pickerItem?.picker === 'transform-ticket' ? [...(ticketTransformOptions || [])]
        : typeof ticketEncounterOptions !== 'undefined' && Array.isArray(ticketEncounterOptions) ? [...ticketEncounterOptions] : [],
      now: () => Date.now(),
      STORY_EVENT_POOLS, MIDLIFE_EVENTS, maybeMidlifeEvent, checkStoryEvents, onAgeChanged, onBirthday,
      applyOfflineProgress, OFFLINE_CAP_TICKS,
      renderDex, renderTravelRegionGrid, REGIONS, ALL_LINES, decayRelationship, decayCompanionBonds, reinforceRelationship, goOnDate, closeDateOverlay, renderItemOverlay, renderItemMemories, renderNaotoItemGrid,
      computeSeasonVisual, effectiveWeather, envModifiers, environmentGameWeight, isRegionExclusiveGame,
      scheduleEnvironmentMoment, REGION_MOMENTS, REGION_MOMENT_HINTS, REGION_RUNTIME_META, SPECIAL_REGIONS, REGION_BASE_FX, ITEM_REGION_SCENES, STICKER_BACKGROUND_THEMES, ENV_GAME_WEIGHTS, ENV_EFFECTS, REGION_MINIGAMES, resolveRegionId, currentRegionId, SECRET_LINES, SECRET_LINE, isSecretLine, canonicalSpeciesId, canonicalDexKey, knownDexKeys, dexFoundCount, dexElderCount, dexTotalCount, GOAL_TIER_IDS, GOAL_TIER, ENDING_TIERS, ENDING_TIER_ICONS, ENDING_TIER_UNLOCK_LABELS, ENDING_CELEBRATIONS, achievedGoalTiers, getEndingTier, NAOTO_ITEMS, COLOR_THEMES, renderDexSummary, triggerLegendEncounter, maybeLegendEncounter,
      playLegendEncounterMovie, playOrdinaryDateMovie, playMarriageMovie, closeDateOverlay, finishDateMovie, DATE_PLANS,
      mgDuration, GAME_LENGTH_CHOICES, MG_SWIPE_MIN, MG_HOLD_PROFILES, createTouchPad, minigameDemoKind, QUICK_RUN, startQuickRun, quickSoloRun, quickStats, QUICK_VOICE_CHOICES, meguruMod, meguruBridge, startMeguru, stopMeguru, meguruActive: () => meguruActive, meguruRun: () => meguruRun, SPECIES, LEGACY_NORMAL_LINES, canonicalCompanionId, sceneryResolve: typeof SCENERY_RESOLVE === 'function' ? SCENERY_RESOLVE : undefined, sceneryCanvas: typeof SCENERY_CANVAS !== 'undefined' ? SCENERY_CANVAS : undefined, sceneryCtx: (c) => (typeof SCENERY_CANVAS !== 'undefined' && SCENERY_CANVAS ? SCENERY_CANVAS.canvas(c) : c), wrapCanvasCtx: (c) => (CANVAS_ILLUSTRATIONS ? CANVAS_ILLUSTRATIONS.canvas(c) || c : c), isAuthorUnlocked, currentFormStageIndex, renderTravelRegionGrid, QUICK_GAMES: quickMod ? quickMod.QUICK_GAMES : [], QUICK_RULES: quickMod ? quickMod.QUICK_RULES : null, isFirstMinigamePlay, arrangeMinigameControls, openMinigameHelp, closeMinigameHelp, MINIGAME_INTRO_PLAYS,
      stickerCatalog, stickerStore, stickerById, grantSticker, grantRandomSticker, openStickerPack, openThemedStickerPack, placeSticker, updateSticker, removeSticker, checkStickerTasks, STICKER_TASKS, STICKER_RARITY, STICKER_PACK_PRICE, STICKER_THEME_PRICE, STICKER_PACK_SIZE, STICKER_COPY_MAX, STICKER_TASK_ADEPT_ID, STICKER_TASK_MASTER_ID, STICKER_PAGE_MAX, STICKER_BOOK_MAX_PAGES, stickerPageIds, addStickerPage, stickerBackgroundOptions, stickerBackgroundSvg: typeof stickerBackgroundSvg === 'function' ? stickerBackgroundSvg : () => '', stickerBackgroundDataUrl: typeof stickerBackgroundDataUrl === 'function' ? stickerBackgroundDataUrl : () => '', stickerPageBackground, setStickerPageBackground, stickerPageInfo, exportStickerPageImage, renderStickerOverlay, setStickerPage, recordDiscoveryKey, ownedStickerKinds, stickerPackPool, stickerDrawablePool, placedStickerCount, normalizeStateShape, normalizeStateValues, freshState, perfTier: () => mgPerfTier, mgPerfDpr, mgPerfScale, setPerfTier, overlayState: () => activeOverlay, MG_DEMO_KINDS, showMinigameResultToast, tryStartPlay,
      recordMinigameResult, minigameRankOf, buyOrEquipShopItem,
      buildLifeTimelineHTML, encodeLifeCode, decodeLifeCode, lifeCodeCardHTML, renderProfile, reportRuntimeError, pushLifeLog, archiveLifeAndReset, buildLifeCard,
      render, tick, loop, openExclusiveMenu, closeAllMenuOverlays, isAnyMenuOverlayOpen, isTimePaused,
      rollIdentity, orientationLabel, normalizeAttractedTo, checkQuestioningResolution,
      encodeGuestCode, decodeGuestCode, guestCandidate, chooseTransform,
      enterInfinite, exitInfinite, openDexDetail, currentStageLabel,
      showPendingClownfishTransition, renderCommOverlay,
      requestEnvironment, maybeRefreshEnvironment, renderEnvironment, travelToRegion, currentEnvironment,
      speakEvent, setMessage, setSpeechBubble, clearConversationTimers, scheduleIdlePerk, scheduleItemContextMessage, renderHomeCast,
      commentTextHTML, setCommentText, showStoryEvent, setBirthdayToast,
      achievementIconHTML: (...args) => achievementIconHTML(...args),
      minigameFoodHTML: (...args) => minigameFoodHTML(...args),
      propArt: typeof PROP_ILLUSTRATIONS === 'undefined' ? undefined : PROP_ILLUSTRATIONS,
      displayCatalog: DISPLAY_CATALOG, canvasIllustrations: CANVAS_ILLUSTRATIONS,
      achievements: ACHIEVEMENTS, renderAchievements, checkAchievements,
      games: [...new Set([...MINIGAMES, ...Object.values(REGION_MINIGAMES).flat().map(x=>x.game),
        ...Object.values(SEASONAL_MINIGAMES).flat().map(x=>x.game)])],
      state: () => state,
      setRandom: fn => { Math.random = fn; },
      reset: () => {state = Object.assign(freshState(), {stage:STAGE.GROWING,
        speciesLine:'dog', stageIndex:5, ageTicks:500, sodachi:55, maxSodachi:55,
        hunger:50, happiness:80, energy:90, health:100});},
    };
  `;
  vm.createContext(sandbox);
  // seed: 起動時の 乱数も ふくめて、ページの Math.random を 最初から この 1 本に する
  if (rng) { sandbox.__harnessRandom = rng.next; vm.runInContext('Math.random = __harnessRandom; delete globalThis.__harnessRandom;', sandbox); }
  vm.runInContext(master, sandbox);
  if (propIllustrations && fs.existsSync('prop-illustrations.js')) vm.runInContext(fs.readFileSync('prop-illustrations.js','utf8'), sandbox);
  if(fullDisplay) for(const file of ['game-symbol-art.js','ui-symbol-art.js','illustration-catalog.js','display-illustrations.js','canvas-illustrations.js']) vm.runInContext(fs.readFileSync(file,'utf8'),sandbox);
  const runtimeSource = foodIllustrations ? source : source.replace('foodIconHTML: minigameFoodHTML, ', '');
  vm.runInContext(runtimeSource.replace(/\}\)\(\);\s*$/, expose + '\n})();'), sandbox);
  // めぐるは 読みこみ時に Math.random を つかまえるが、明示的にも おなじ 1 本を わたす
  if (rng) sandbox.lifecycle.meguruMod?.setRandom(rng.next);
  if (!resume) sandbox.lifecycle.reset();
  timers.clear();
  function advance(ms) {
    const until = now + ms; let steps = 0;
    while (true) {
      const next = [...timers].filter(([,t]) => t.at <= until).sort((a,b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!next) break;
      assert.ok(++steps < 20000, 'timer runaway');
      timers.delete(next[0]); now = next[1].at; next[1].fn();
    }
    now = until;
  }
  return {api: sandbox.lifecycle, get, advance, sandbox, rng, dispatch: (target, type, init) => dispatch(target, event(type, init)), document, window,
    setReducedMotion(matches) {motionPreference.matches=matches;motionListeners.forEach(fn=>fn({matches}));},
  };
}

module.exports = {harness, ENVIRONMENT_WEATHER_LABELS, DEFAULT_ENVIRONMENT, DETERMINISTIC};
