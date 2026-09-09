const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync('script.js', 'utf8');
const master = fs.readFileSync('character-world-master.v1.js', 'utf8');

// Run the real session/input code. The DOM and clock are substitutes: these
// tests do not measure browser rendering, physical input delivery or FPS.
function harness() {
  let now = 1000, serial = 0;
  const timers = new Map(), elements = new Map();
  const noop = () => {};
  let document, window;
  const event = (type, init = {}) => ({ type, bubbles: true, preventDefault: noop, ...init });
  function node(id = '') {
    const listeners = [], classes = new Set();
    const queries = new Map();
    let html = '';
    const el = {
      id, listeners, dataset: {}, style: { setProperty: noop, removeProperty: noop },
      children: [], textContent: '', value: '', disabled: false, isConnected: true,
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
      querySelectorAll: selector => selector === 'button' ? el.children.filter(c => c.tagName === 'BUTTON') : [],
      appendChild(child) { child.isConnected = true; el.children.push(child); return child; },
      closest: selector => selector === 'button[data-hold]' && el.dataset.hold ? el : null,
      getBoundingClientRect: () => ({left: 0, top: 0, width: 300, height: 300}),
      getContext: () => null, setAttribute: noop, focus: noop, scrollIntoView: noop,
      setPointerCapture: noop, releasePointerCapture: noop,
      remove() { el.isConnected = false; },
    };
    Object.defineProperty(el, 'innerHTML', {get: () => html, set(value) {
      html = value;
      el.children.forEach(c => { c.isConnected = false; });
      el.children = []; queries.clear();
      // Only input metadata is needed; canvas/layout are deliberately absent.
      for (const [, attrs, label] of String(value).matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
        const id = attrs.match(/\bid="([^"]+)"/)?.[1];
        const btn = node(id); btn.tagName = 'BUTTON'; btn.textContent = label;
        for (const [, key, val] of attrs.matchAll(/\bdata-([\w-]+)="([^"]*)"/g)) btn.dataset[key] = val;
        el.children.push(btn); if (id) queries.set('#' + id, btn);
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
    body: node('body'), documentElement: node('html'), visibilityState: 'visible',
  });
  window = {...node('window')};
  const schedule = (fn, delay = 0, ...args) => {
    const id = ++serial; timers.set(id, {at: now + Math.max(1, delay), fn: () => fn(...args)}); return id;
  };
  // window is the VM global, as in a browser. This activates the production
  // requestAnimationFrame/setTimeout session wrappers (the boot smoke does not).
  const sandbox = Object.assign(window, {
    console, document, window, Date: class extends Date {static now() {return now;}},
    navigator: {userAgent: 'minigame-lifecycle-test', maxTouchPoints: 1},
    performance: {now: () => now}, innerWidth: 390, innerHeight: 844,
    localStorage: {getItem: () => null, setItem: noop, removeItem: noop},
    location: {href: 'https://naoto214.github.io/naotocchi/'},
    crypto: {getRandomValues: a => a},
    setTimeout: schedule, clearTimeout: id => timers.delete(id),
    requestAnimationFrame: fn => schedule(() => fn(now), 16), cancelAnimationFrame: id => timers.delete(id),
    setInterval: () => ++serial, clearInterval: noop,
    Event: function(type, init) {Object.assign(this, event(type, init));},
    PointerEvent: function(type, init) {Object.assign(this, event(type, init));},
  });
  const expose = `
    globalThis.lifecycle = {
      startMinigame, retireMinigame, bindHeldButton,
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
  vm.runInContext(source.replace(/\}\)\(\);\s*$/, expose + '\n})();'), sandbox);
  sandbox.lifecycle.reset();
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
  return {api: sandbox.lifecycle, get, advance, sandbox, dispatch: (target, type, init) => dispatch(target, event(type, init)), document, window};
}

// A minimal game exercises the production common controls and callbacks without
// making this test depend on any particular game's scoring/level layout.
function inputGame(h, {continuous = false} = {}) {
  const observed = {presses: 0, held: false, frames: 0, deferred: 0, releaseDeferred: 0};
  const game = {id: 'lifecycle-probe', start(container, done) {
    container.innerHTML = '<button id="left" data-key="left" data-hold="step">◀</button><button id="finish">Finish</button>';
    const btn = container.querySelector('#left'); observed.button = btn; observed.done = done;
    observed.finishButton = container.querySelector('#finish');
    observed.finishButton.addEventListener('click', () => done(50));
    if (continuous) {delete btn.dataset.hold; h.api.bindHeldButton(btn, v => {observed.held = v;});}
    btn.addEventListener('pointerdown', () => {
      observed.presses++;
      h.sandbox.setTimeout(() => {observed.deferred++;}, 100);
    });
    btn.addEventListener('pointercancel', () => {
      h.sandbox.setTimeout(() => {observed.releaseDeferred++;}, 100);
    });
    const frame = () => {observed.frames++; h.sandbox.requestAnimationFrame(frame);};
    h.sandbox.requestAnimationFrame(frame);
  }};
  h.api.startMinigame(game);
  return observed;
}

for (const ending of ['retire', 'complete']) test(`${ending} clears a held key before the next game`, () => {
  const h = harness(), first = inputGame(h);
  h.dispatch(h.document, 'keydown', {key: 'ArrowLeft'});
  assert.equal(first.presses, 1);
  if (ending === 'retire') h.dispatch(h.get('mgQuitYesBtn'), 'click'); else h.dispatch(first.finishButton, 'click');
  const stateAfterEnd = JSON.stringify(h.api.state());
  first.done(100); // A late/duplicate result must not earn rewards.
  assert.equal(JSON.stringify(h.api.state()), stateAfterEnd);
  let ordinaryTimerRan = false;
  h.sandbox.setTimeout(() => {ordinaryTimerRan = true;}, 30);
  const second = inputGame(h);
  h.dispatch(h.document, 'keydown', {key: 'ArrowLeft'});
  assert.equal(second.presses, 1, 'a key left down in the previous game must work in the next');
  h.advance(120);
  assert.equal(first.frames, 0, 'retired game must not render again');
  assert.equal(first.deferred, 0, 'retired input callback must not run');
  assert.equal(first.releaseDeferred, 0, 'cleanup callbacks must also belong to the ended session');
  assert.equal(ordinaryTimerRan, true, 'ordinary timers after retirement must not inherit the ended session');
  assert.ok(second.frames > 0, 'current game animation must continue');
});

for (const interruption of ['blur', 'hidden']) test(`${interruption} releases keyboard steering and allows a new press`, () => {
  const h = harness(), game = inputGame(h, {continuous: true});
  h.dispatch(h.document, 'keydown', {key: 'ArrowLeft'});
  assert.equal(game.held, true);
  if (interruption === 'blur') h.dispatch(h.window, 'blur', {bubbles: false});
  else {h.document.visibilityState = 'hidden'; h.dispatch(h.document, 'visibilitychange', {bubbles: false});}
  assert.equal(game.held, false, 'steering must release even without keyup');
  h.advance(120);
  assert.equal(game.releaseDeferred, 1, 'release callbacks of the active game must still run');
  h.document.visibilityState = 'visible';
  h.dispatch(h.document, 'keydown', {key: 'ArrowLeft'});
  assert.equal(game.presses, 2);
  h.dispatch(h.document, 'keyup', {key: 'ArrowLeft'});
  assert.equal(game.held, false);
});

test('a background switch stops repeating button input without ending the game', () => {
  const h = harness(), game = inputGame(h);
  h.dispatch(h.document, 'keydown', {key: 'ArrowLeft'});
  h.advance(250);
  assert.equal(game.presses, 2, 'hold repeat must work while active');
  h.dispatch(h.window, 'blur', {bubbles: false});
  h.advance(1000);
  assert.equal(game.presses, 2, 'background must not keep repeating the old press');
  assert.equal(game.releaseDeferred, 1, 'focus loss must preserve active-session release callbacks');
  assert.ok(game.frames > 0, 'input reset must not terminate the minigame session');
});

test('a background switch releases a touch-held control without a pointerup', () => {
  const h = harness(), game = inputGame(h, {continuous: true});
  h.dispatch(game.button, 'pointerdown', {pointerId: 7});
  assert.equal(game.held, true);
  h.dispatch(h.window, 'blur', {bubbles: false});
  assert.equal(game.held, false, 'touch steering must not remain held');
});

test('input scope is restored when an event never bubbles to window', () => {
  const h = harness(), game = inputGame(h);
  h.dispatch(h.document, 'keydown', {key: 'ArrowLeft', bubbles: false});
  assert.equal(game.presses, 1);
  h.advance(1); // The existing fallback must restore the owning event's scope.
  h.api.retireMinigame();
  let ordinaryTimerRan = false;
  h.sandbox.setTimeout(() => {ordinaryTimerRan = true;}, 30);
  h.advance(30);
  assert.equal(ordinaryTimerRan, true, 'non-bubbling input must not leave a dead timer scope');
});

test('all 100 registered games can retire without delayed rewards or repopulating the screen', () => {
  const h = harness();
  assert.equal(h.api.games.length, 100);
  for (const game of h.api.games) {
    h.api.reset();
    h.api.startMinigame(game);
    h.api.retireMinigame();
    h.advance(5000);
    assert.equal(h.api.state().lifetime.minigamesPlayed, 0, game.id + ': retirement must not award a completed play');
    assert.equal(h.get('minigameOverlay').innerHTML, '', game.id + ': retired game must leave the screen empty');
  }
});
