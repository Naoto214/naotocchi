const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('games.js', 'utf8') + '\n' + fs.readFileSync('audio.js', 'utf8') + '\n' + fs.readFileSync('script.js', 'utf8');
const master = fs.readFileSync('character-world-master.v1.js', 'utf8');

// Run the real session/input code. The DOM and clock are substitutes: these
// tests do not measure browser rendering, physical input delivery or FPS.
function harness({storage, resume = false, geolocation, fetcher, reducedMotion = false, viewportHeight, canvasContext, foodIllustrations = true, propIllustrations = true} = {}) {
  let now = 1000, serial = 0;
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
      appendChild(child) { child.isConnected = true; el.children.push(child); return child; },
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
      closest: selector => selector === 'button[data-hold]' && el.dataset.hold ? el : null,
      getBoundingClientRect: () => ({left: 0, top: 0, width: 300, height: 300}),
      getContext: () => canvasContext || null, setAttribute: noop, focus: () => { document.activeElement = el; }, scrollIntoView: noop,
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
  if (viewportHeight) window.visualViewport=Object.assign(node('viewport'),{height:viewportHeight,scale:1});
  const schedule = (fn, delay = 0, ...args) => {
    const id = ++serial; timers.set(id, {at: now + Math.max(1, delay), fn: () => fn(...args)}); return id;
  };
  // window is the VM global, as in a browser. This activates the production
  // requestAnimationFrame/setTimeout session wrappers (the boot smoke does not).
  const sandbox = Object.assign(window, {
    console, document, window, Date: class extends Date {static now() {return now;}},
    navigator: {userAgent: 'minigame-lifecycle-test', maxTouchPoints: 1, geolocation},
    fetch: fetcher,
    NaotocchiCast: require('../../cast-layout.js'),
    NaotocchiCastMotion: fs.existsSync('cast-motion.js') ? require('../../cast-motion.js') : undefined,
    NaotocchiEnvironment: require('../../world-environment.js'),
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
    HTMLImageElement: class {static [Symbol.hasInstance](node) {return node?.tagName === 'IMG';}},
  });
  const expose = `
    globalThis.lifecycle = {
      startMinigame, retireMinigame, bindHeldButton, loadState, saveState, doWipe, restoreSaveSnapshot, mgPerfSample,
      finishMinigame, sodachiCost, applyGrowth, recoverSleepStep, grantGrowthBoost, SODACHI_COST_BANDS, SODACHI_MAX,
      useConsumableItem, CONSUMABLE_ITEMS, dailyStreakReward, activeBoostSummary, SHOP_ITEMS,
      STORY_EVENT_POOLS, MIDLIFE_EVENTS, maybeMidlifeEvent, checkStoryEvents, onAgeChanged,
      applyOfflineProgress, OFFLINE_CAP_TICKS,
      renderDex, renderTravelRegionGrid, REGIONS, ALL_LINES,
      mgDuration, GAME_LENGTH_CHOICES,
      recordMinigameResult, minigameRankOf, buyOrEquipShopItem,
      render, tick, loop, openExclusiveMenu, closeAllMenuOverlays, isAnyMenuOverlayOpen,
      requestEnvironment, maybeRefreshEnvironment, renderEnvironment, travelToRegion,
      speakEvent, setMessage, setSpeechBubble, clearConversationTimers, scheduleIdlePerk, selectTheme, renderHomeCast,
      commentTextHTML, setCommentText, showStoryEvent, setBirthdayToast,
      achievementIconHTML: (...args) => achievementIconHTML(...args),
      minigameFoodHTML: (...args) => minigameFoodHTML(...args),
      propArt: typeof PROP_ILLUSTRATIONS === 'undefined' ? undefined : PROP_ILLUSTRATIONS,
      achievements: ACHIEVEMENTS, renderAchievements, checkAchievements,
      games: [...new Set([...MINIGAMES, ...Object.values(REGION_MINIGAMES).flat().map(x=>x.game),
        ...Object.values(SEASONAL_MINIGAMES).flat().map(x=>x.game)])],
      state: () => state,
      reset: () => {state = Object.assign(freshState(), {stage:STAGE.GROWING,
        speciesLine:'dog', stageIndex:5, ageTicks:500, sodachi:55, maxSodachi:55,
        hunger:50, happiness:80, energy:90, health:100});},
    };
  `;
  vm.createContext(sandbox);
  vm.runInContext(master, sandbox);
  if (propIllustrations && fs.existsSync('prop-illustrations.js')) vm.runInContext(fs.readFileSync('prop-illustrations.js','utf8'), sandbox);
  const runtimeSource = foodIllustrations ? source : source.replace('foodIconHTML: minigameFoodHTML, ', '');
  vm.runInContext(runtimeSource.replace(/\}\)\(\);\s*$/, expose + '\n})();'), sandbox);
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
  return {api: sandbox.lifecycle, get, advance, sandbox, dispatch: (target, type, init) => dispatch(target, event(type, init)), document, window,
    setReducedMotion(matches) {motionPreference.matches=matches;motionListeners.forEach(fn=>fn({matches}));},
  };
}

module.exports = {harness};
