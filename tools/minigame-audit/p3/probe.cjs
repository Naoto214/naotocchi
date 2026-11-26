// Phase 3(2026-11-26): 1本の ゲームを 決まった 操作(ボット)で 遊ばせて、点・記録・報酬を はかる 道具。
// 本物の games.js + script.js を tests/helpers/runtime-harness.cjs で うごかす(canvas は 呼び出しを 記録する スタブ)。
// 結果は「同じ入力を与えたときの ゲームロジックの 出力」で、人の プレイや 実機の 証拠では ない。
//   const {play} = require('./probe.cjs');
//   play('stack-themed', {seed: 1, bot: (r, t) => { if (t % 150 === 0) r.tap(r.q('#stDrop')); }})
// bot(r, t) は 50ms ごとに よばれる。r.frame は 直前の 1フレームで 描かれた 呼び出し(translate・fillText など)
const path = require('path');
const vm = require('vm');
// ハーネスを そのまま 読みこんで 1か所だけ 差しかえる: addEventListener された ノードを globalThis.__mgListened に 記録する
// (パッドなど innerHTML でなく createElement で つくられた ノードを ボットが 見つけられる ように。ファイル自体は 変更しない)
const Module = require('module');
const harnessPath = path.join(__dirname, '..', '..', '..', 'tests', 'helpers', 'runtime-harness.cjs');
const harnessSrc = require('fs').readFileSync(harnessPath, 'utf8').replace(
  'addEventListener(type, fn, options) { listeners.push({type, fn, capture: options === true || !!options?.capture}); },',
  'addEventListener(type, fn, options) { listeners.push({type, fn, capture: options === true || !!options?.capture}); (globalThis.__mgListened || (globalThis.__mgListened = new Set())).add(el); },');
if (!harnessSrc.includes('__mgListened')) throw new Error('harness patch failed');
const hm = new Module(harnessPath, module); hm.filename = harnessPath; hm.paths = Module._nodeModulePaths(path.dirname(harnessPath));
hm._compile(harnessSrc, harnessPath);
const {harness} = hm.exports;

function recordingCtx() {
  const log = [], state = {font: '', fillStyle: '', strokeStyle: '', globalAlpha: 1, lineWidth: 1, textAlign: '', textBaseline: ''};
  const ctx = new Proxy(state, {
    get(o, k) {
      if (k in o) return o[k];
      if (k === 'measureText') return () => ({width: 10});
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => ({addColorStop() {}});
      if (k === 'getImageData') return () => ({data: new Uint8ClampedArray(4)});
      return (...a) => { if (log.length < 20000) log.push([k, a, o.fillStyle]); };
    },
    set(o, k, v) { o[k] = v; return true; },
  });
  return {ctx, log};
}
const lcg = (seed) => `Math.random=(()=>{let s=${seed >>> 0 || 1};return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);})()`;

function play(id, {seed = 1, bot = null, limitMs = 400000, step = 50, difficulty = 'normal', length = 'normal', age} = {}) {
  const {ctx, log} = recordingCtx();
  const h = harness({seed, canvasContext: ctx});
  vm.runInContext(lcg(seed * 7919 + 13), h.sandbox);
  const s = h.api.state();
  Object.assign(s, {isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, happiness: 50, transformMeter: 0, transformOptions: null});
  if (age != null) s.ageTicks = age * 20;
  s.lifetime.minigameDifficulty = difficulty; s.lifetime.minigameLength = length;
  const game = h.api.games.find((g) => g.id === id);
  if (!game) throw new Error('no game ' + id);
  const before = {count: s.minigameCount, money: s.lifetime.money, growth: (s.growth || 0) + (s.sodachi || 0) * 100, happiness: s.happiness};
  let score = null, meter = null, endedAt = null, t = 0;
  const r = {h, s, game, log, frame: [], t: 0};
  globalThis.__mgListened = new Set();
  h.api.startMinigame({id, start(c, done) { r.box = c; return game.start(c, (sc, msg, p) => { if (score === null) { score = sc; meter = p || null; endedAt = t; } done(sc, msg, p); }); }});
  r.view = h.get('minigameOverlay');
  // パッド(createTouchPad): pointerdown と pointermove を もつ、id の ない ノード
  r.pad = () => [...globalThis.__mgListened].find((n) => !n.id && n.listeners.some((l) => l.type === 'pointermove') && n.listeners.some((l) => l.type === 'pointerdown'));
  r.q = (sel) => r.view.querySelector(sel) || (r.box && r.box.querySelector(sel));
  r.ev = (el, type, x = 150, y = 150, id = 1) => h.dispatch(el, type, {pointerId: id, clientX: x, clientY: y, button: 0, touches: [{clientX: x, clientY: y, identifier: id}], changedTouches: [{clientX: x, clientY: y, identifier: id}]});
  r.down = (el, x, y, id) => r.ev(el, 'pointerdown', x, y, id);
  r.move = (el, x, y, id) => r.ev(el, 'pointermove', x, y, id);
  r.up = (el, x, y, id) => r.ev(el, 'pointerup', x, y, id);
  r.tap = (el, x, y, id) => { r.down(el, x, y, id); r.up(el, x, y, id); h.dispatch(el, 'click', {clientX: x || 150, clientY: y || 150}); };
  r.key = (key, type = 'keydown') => h.dispatch(h.document, type, {key, code: key});
  r.swipe = (el, x, y, dx, dy, id) => { r.down(el, x, y, id); r.move(el, x + dx / 2, y + dy / 2, id); r.move(el, x + dx, y + dy, id); r.up(el, x + dx, y + dy, id); };
  for (; t < limitMs && score === null; t += step) {
    r.t = t;
    if (bot) bot(r, t);
    const mark = log.length;
    h.advance(step);
    r.frame = log.slice(mark);
    if (log.length > 15000) log.length = 0;
  }
  h.advance(1500);
  return {
    id, seed, score: score === null ? null : Math.round(score * 100) / 100, endedMs: endedAt, recorded: s.minigameCount > before.count, meter,
    coins: s.lifetime.money - before.money,
    growth: Math.round((s.growth || 0) + (s.sodachi || 0) * 100 - before.growth),
    happiness: s.happiness - before.happiness,
    transform: s.transformOptions ? 100 : (s.transformMeter || 0),
  };
}
// 何回か(seed を かえて)遊んで まとめる
function many(id, bot, {seeds = [1, 2, 3, 4, 5], ...opt} = {}) {
  const runs = seeds.map((seed) => play(id, {seed, bot: bot && bot.isFactory ? bot(seed) : bot, ...opt}));
  const sc = runs.map((x) => x.score), rec = runs.filter((x) => x.recorded).length;
  return {runs, scores: sc, recorded: rec, n: runs.length, avg: Math.round(sc.reduce((a, b) => a + (b || 0), 0) / sc.length), sec: Math.round(runs.reduce((a, b) => a + (b.endedMs || 0), 0) / runs.length / 100) / 10};
}
const fmt = (m) => `${m.scores.map((s, i) => (s === null ? 'TO' : Math.round(s)) + (m.runs[i].recorded ? '' : '×')).join(' ')}  (平均${m.avg}・記録${m.recorded}/${m.n}・${m.sec}秒)`;
// 状態を もつ ボットは seed ごとに つくりなおす: fresh((seed) => makeBot(...))
const fresh = (make) => Object.assign(make, {isFactory: true});
module.exports = {play, many, fmt, recordingCtx, fresh};
