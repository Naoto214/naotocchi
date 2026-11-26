// ミニゲーム採点監査(2026-11-24): 通常100本を ハーネス上で 自動プレイして 点数分布を とる。
// 本番コードは 変更しない(読みこむ だけ)。DOM・canvas・時計は ハーネスの 代用品なので、
// 結果は「同じ入力を与えたときの ゲームロジックの 出力」であり、人間の プレイや 実機の 証拠では ない。
//
// つかいかた: node tools/minigame-audit/sim.cjs [--bots idle,tap,random,mash] [--seeds 5] [--ids a,b] [--out file.json]
// bots:
//   idle   … なにも しない(放置)
//   tap1   … 1秒後に 1回だけ 画面を タップして あとは 放置(T7 の「最初だけ触って放置」)
//   random … ランダムな 操作(ポインタの down/move/up、ボタン、キー)を 0.25〜0.6秒ごと(でたらめプレイ。初心者の 下限の めやす)
//   mash   … おなじ 操作(画面中央タップ+スペース/↑)を 0.15秒ごとに 連打(連打で 点が 出ないか)
const path = require('path');
process.chdir(path.join(__dirname, '..', '..'));
// テスト用ハーネス(tests/helpers/runtime-harness.cjs)を、そのまま 読みこんで 1か所だけ 差しかえる:
// addEventListener された ノードを globalThis.__mgListened に 記録する(querySelector で 取られた canvas は
// container の children に 入らないため、でたらめ入力の 対象に できない)。ファイル自体は 変更しない
const Module = require('module');
const harnessPath = path.join(__dirname, '..', '..', 'tests', 'helpers', 'runtime-harness.cjs');
const harnessSrc = require('fs').readFileSync(harnessPath, 'utf8').replace(
  'addEventListener(type, fn, options) { listeners.push({type, fn, capture: options === true || !!options?.capture}); },',
  'addEventListener(type, fn, options) { listeners.push({type, fn, capture: options === true || !!options?.capture}); (globalThis.__mgListened || (globalThis.__mgListened = new Set())).add(el); },');
if (!harnessSrc.includes('__mgListened')) throw new Error('harness patch failed');
const hm = new Module(harnessPath, module); hm.filename = harnessPath; hm.paths = Module._nodeModulePaths(path.dirname(harnessPath));
hm._compile(harnessSrc, harnessPath);
const {harness} = hm.exports;

function fakeCtx() {
  const grad = {addColorStop() {}};
  return new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => grad;
      if (k === 'measureText') return () => ({width: 0});
      if (k === 'getImageData') return () => ({data: new Uint8ClampedArray(4)});
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}
function rng32(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

// 入力を うけとる ノード(listeners を もつ もの)を あつめる
function collectTargets(box, h) {
  const out = [], seen = new Set();
  for (const n of globalThis.__mgListened || []) {
    if (seen.has(n) || !n.isConnected || n.disabled || !n.listeners.length || n === h.document || n === h.window) continue;
    if (/^(mgQuit|mgQuitBtn|mgQuitYesBtn|mgQuitNoBtn|mgHelpBtn|mgHelpCloseBtn|mgHelpOverlay)$/.test(n.id)) continue;
    if (!h.__fresh.has(n)) continue;
    seen.add(n); out.push(n);
  }
  const walk = (n, depth) => {
    if (!n || seen.has(n) || depth > 6) return; seen.add(n);
    if (n.listeners && n.listeners.length) out.push(n);
    for (const c of n.children || []) walk(c, depth + 1);
  };
  walk(box, 0);
  for (const g of [h.document, h.window]) if (g && g.listeners && g.listeners.length) out.push(g);
  return out;
}
const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'];

function makeBot(kind, r) {
  let next = 1000, held = null;
  return (h, t, box) => {
    if (kind === 'idle') return;
    if (kind === 'tap1') {
      if (t === 1000) { const n = box.children.find((c) => c.listeners && c.listeners.length) || box; h.dispatch(n, 'pointerdown', {pointerId: 1, clientX: 150, clientY: 150, button: 0}); h.dispatch(n, 'pointerup', {pointerId: 1, clientX: 150, clientY: 150, button: 0}); h.dispatch(n, 'click', {clientX: 150, clientY: 150}); }
      return;
    }
    if (t < next) return;
    const targets = collectTargets(box, h);
    if (kind === 'mash') {
      next = t + 150;
      for (const n of targets) {
        const types = new Set(n.listeners.map((l) => l.type));
        if (types.has('pointerdown')) { h.dispatch(n, 'pointerdown', {pointerId: 1, clientX: 150, clientY: 150, button: 0}); h.dispatch(n, 'pointerup', {pointerId: 1, clientX: 150, clientY: 150, button: 0}); }
        if (types.has('click') && n.tagName === 'BUTTON' && !n.disabled) h.dispatch(n, 'click', {});
        if (types.has('keydown')) { h.dispatch(n, 'keydown', {key: ' ', code: 'Space'}); h.dispatch(n, 'keyup', {key: ' ', code: 'Space'}); }
      }
      return;
    }
    // random
    next = t + 250 + Math.floor(r() * 350);
    if (held) { const {n, x, y} = held; h.dispatch(n, 'pointerup', {pointerId: 1, clientX: x, clientY: y, button: 0}); h.dispatch(n, 'touchend', {touches: [], changedTouches: [{clientX: x, clientY: y, identifier: 1}]}); h.dispatch(n, 'mouseup', {clientX: x, clientY: y}); held = null; return; }
    if (!targets.length) return;
    const n = targets[Math.floor(r() * targets.length)];
    const types = [...new Set(n.listeners.map((l) => l.type))];
    const type = types[Math.floor(r() * types.length)];
    const x = Math.floor(r() * 300), y = Math.floor(r() * 300);
    if (/^key/.test(type)) { const key = KEYS[Math.floor(r() * KEYS.length)]; h.dispatch(n, 'keydown', {key, code: key}); h.dispatch(n, 'keyup', {key, code: key}); return; }
    if (type === 'click') { if (!n.disabled) h.dispatch(n, 'click', {clientX: x, clientY: y}); return; }
    if (/pointer|mouse|touch/.test(type)) {
      h.dispatch(n, 'pointerdown', {pointerId: 1, clientX: x, clientY: y, button: 0});
      h.dispatch(n, 'mousedown', {clientX: x, clientY: y, button: 0});
      h.dispatch(n, 'touchstart', {touches: [{clientX: x, clientY: y, identifier: 1}], changedTouches: [{clientX: x, clientY: y, identifier: 1}]});
      const x2 = clamp(x + Math.floor((r() - 0.5) * 160), 0, 300), y2 = clamp(y + Math.floor((r() - 0.5) * 160), 0, 300);
      h.dispatch(n, 'pointermove', {pointerId: 1, clientX: x2, clientY: y2});
      h.dispatch(n, 'mousemove', {clientX: x2, clientY: y2});
      h.dispatch(n, 'touchmove', {touches: [{clientX: x2, clientY: y2, identifier: 1}], changedTouches: [{clientX: x2, clientY: y2, identifier: 1}]});
      held = {n, x: x2, y: y2};
      return;
    }
    h.dispatch(n, type, {clientX: x, clientY: y});
  };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function playOnce(id, bot, seed, {difficulty = 'normal', length = 'normal', limitMs = 400000} = {}) {
  const h = harness({seed, canvasContext: fakeCtx()});
  const s = h.api.state();
  Object.assign(s, {isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, happiness: 50});
  s.lifetime.minigameDifficulty = difficulty; s.lifetime.minigameLength = length;
  const game = h.api.games.find((g) => g.id === id);
  let box = null, raw = null, detail = null, endedAt = null, err = null;
  const preexisting = new Set(globalThis.__mgListened || []);
  h.__fresh = {has: (n) => !preexisting.has(n)};
  const before = {money: s.lifetime.money, count: s.minigameCount, happiness: s.happiness, transform: s.transformMeter || 0, growth: (s.growth || 0) + (s.sodachi || 0) * 100};
  s.happiness = 50; s.transformMeter = 0; s.transformOptions = null; before.happiness = 50; before.transform = 0;
  try {
    h.api.startMinigame({id, start(c, done) {
      box = c;
      return game.start(c, (sc, msg, det) => { if (raw !== null) return; raw = sc; detail = det || null; endedAt = tNow; done(sc, msg, det); });
    }});
  } catch (e) { err = String(e && e.message || e); }
  const r = rng32(seed * 7919 + 17), step = makeBot(bot, r);
  let tNow = 0;
  try {
    for (; raw === null && tNow < limitMs; tNow += 50) { step(h, tNow, box); h.advance(50); }
  } catch (e) { err = String(e && e.message || e).slice(0, 200); }
  const recorded = s.minigameCount - before.count;
  const meter = !detail ? 'none' : Number.isFinite(detail.maxGap) ? 'turnGap' : Number.isFinite(detail.cover) ? 'cover' : Number.isFinite(detail.acts) ? 'acts' : Number.isFinite(detail.inputs) ? 'inputs' : 'other';
  return {id, bot, seed, meter, happy: s.happiness - before.happiness, transform: s.transformOptions ? 100 : (s.transformMeter || 0) - before.transform, growth: Math.round(((s.growth || 0) + (s.sodachi || 0) * 100) - before.growth), raw: raw === null ? null : Math.round(raw * 100) / 100, endedMs: raw === null ? null : endedAt, recorded: recorded > 0, coins: s.lifetime.money - before.money, detail, err, timedOut: raw === null && !err};
}

function main() {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
  const bots = opt('bots', 'idle,tap1,random,mash').split(',');
  const seeds = Number(opt('seeds', '3'));
  const difficulty = opt('difficulty', 'normal'), length = opt('length', 'normal');
  const h0 = harness({seed: 1, canvasContext: fakeCtx()});
  let ids = h0.api.games.map((g) => g.id);
  if (opt('ids')) ids = opt('ids').split(',');
  const out = [];
  const origLog = console.log; const origWarn = console.warn; const origErr = console.error;
  for (const id of ids) for (const bot of bots) {
    const n = bot === 'idle' || bot === 'tap1' ? Math.min(Number(opt('fixedSeeds', '2')), seeds) : bot === 'mash' ? Math.min(Number(opt('mashSeeds', String(seeds))), seeds) : seeds;
    for (let sd = 1; sd <= n; sd++) {
      console.log = console.warn = console.error = () => {};
      const t0 = Date.now(); let res;
      try { res = playOnce(id, bot, sd, {difficulty, length, limitMs: Number(opt('limit', '400000'))}); } finally { console.log = origLog; console.warn = origWarn; console.error = origErr; }
      res.wallMs = Date.now() - t0; out.push(res);
      if (opt('jsonl')) require('fs').appendFileSync(opt('jsonl'), JSON.stringify(res) + '\n');
      process.stderr.write(`${id} ${bot} s${sd}: raw=${res.raw} rec=${res.recorded} t=${res.endedMs} ${res.err ? 'ERR ' + res.err : ''} (${res.wallMs}ms)\n`);
    }
  }
  const file = opt('out');
  if (file) require('fs').writeFileSync(file, JSON.stringify(out, null, 1));
  else console.log(JSON.stringify(out));
}
if (require.main === module) main();
module.exports = {playOnce, fakeCtx};
