// Phase 2 PR 2-2「クイック: 結果演出」の 回帰テスト。
// docs/audit/minigame-phase2-plan-2026-10-22/quick-games-50.md の F4・F5・F15(R1・R2・R7)。
// quick.js を 小さな にせ DOM で うごかし、canvas は 呼び出しを きろくする だけの スタブ。
const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const QUICK_SRC = fs.readFileSync(path.join(ROOT, 'quick.js'), 'utf8');
const W = 300, H = 300;

function lcg(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }

// fillText / fillRect を その ときの fillStyle・font と いっしょに きろくする ctx
function recordingCtx() {
  const calls = [], st = {fillStyle: '#000', font: '10px sans-serif'};
  const ctx = new Proxy(st, {
    get(o, k) {
      if (k in o) return o[k];
      if (k === 'measureText') return () => ({width: 10});
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({addColorStop() {}});
      if (k === 'fillText') return (ch, x, y) => calls.push({k, ch, x, y, font: o.font, alpha: o.globalAlpha});
      if (k === 'fillRect') return (x, y, w, h) => calls.push({k, x, y, w, h, fillStyle: o.fillStyle});
      return () => {};
    },
    set(o, k, v) { o[k] = v; return true; },
  });
  return {ctx, calls};
}

function element(id) {
  const cls = new Set();
  const props = {};
  return {
    id, innerHTML: '', textContent: '', offsetWidth: 0, listeners: {},
    style: {setProperty(k, v) { props[k] = String(v); }, getPropertyValue: (k) => props[k] || ''},
    classList: {add: (...c) => c.forEach((x) => cls.add(x)), remove: (...c) => c.forEach((x) => cls.delete(x)), contains: (c) => cls.has(c), toggle: (c, on) => (on ? cls.add(c) : cls.delete(c))},
    addEventListener(type, fn) { this.listeners[type] = fn; },
    getBoundingClientRect: () => ({left: 0, top: 0, width: W, height: H}),
  };
}

// 1本だけの クイック(quick-solo)を はじめる。frame は 16ms ずつ すすめる
function startSolo(id, {seed = 7} = {}) {
  let now = 1000; const raf = [];
  const sfx = [];
  const sandbox = {performance: {now: () => now}, requestAnimationFrame: (fn) => { raf.push(fn); return raf.length; }, cancelAnimationFrame() {}, setTimeout() {}, console};
  vm.createContext(sandbox);
  vm.runInContext(`Math.random=(${lcg.toString()})(${seed});`, sandbox);
  vm.runInContext(QUICK_SRC, sandbox);
  const {ctx, calls} = recordingCtx();
  const mod = sandbox.installNaotocchiQuick({
    sfx: (n) => sfx.push(n), voice: () => true, currentSprite: () => '🐣',
    createMgCanvas: () => ({ctx, W, H}),
  });
  const els = {};
  const container = {set innerHTML(v) {}, querySelector: (sel) => (els[sel] || (els[sel] = element(sel.slice(1))))};
  const run = mod.makeQuickRun({only: id});
  run.start(container, () => {});
  const r = run._run;
  const step = () => { now += 16; const fns = raf.splice(0); for (const fn of fns) fn(now); };
  step(); // さいしょの フレームで ゲームが はじまる
  const flash = els['#qkFlash'], count = els['#qkCount'], lives = els['#qkLives'], cue = els['#qkCue'];
  const inResult = () => !flash.classList.contains('hidden');
  return {mod, r, cur: r.current, canvas: els['#qkCanvas'], step, calls, sfx, flash, count, lives, cue, inResult, advanceMs: (ms) => { for (let t = 0; t < ms; t += 16) step(); }};
}
// その フレームの 描画だけを かえす
function frame(s) { s.calls.length = 0; s.step(); return s.calls.slice(); }
const glyphOf = (calls, ch) => calls.filter((c) => c.k === 'fillText' && c.ch === ch);

// target() の 手がかりで とく(○ が 出るまで)
function solve(s) {
  const g = s.cur.game;
  for (let i = 0; i < 400 && !s.inResult(); i++) {
    const t = g.target ? g.target() : null;
    if (!t) { s.step(); continue; }
    if (t.kind === 'tap') { if (t.ready === false) { s.step(); continue; } if (t.times) { for (let k = 0; k < t.times; k++) g.onTap(t.x, t.y); for (let k = 0; k < 400 && !s.inResult(); k++) s.step(); return; } g.onTap(t.x, t.y); s.step(); continue; }
    if (t.kind === 'swipe') { if (t.ready === false) { s.step(); continue; } g.onSwipe(t.dir); s.step(); continue; }
    if (t.kind === 'hold') { g.onPress(t.x, t.y); for (let k = 0; k < 400 && !s.inResult(); k++) { s.step(); if (g.target().release) break; } g.onRelease(t.x, t.y); s.step(); continue; }
    if (t.kind === 'follow') { g.onPress(t.x, t.y); s.step(); continue; }
    if (t.kind === 'none') { s.step(); continue; }
    if (t.kind === 'spin') { g.onPress(t.x + t.r, t.y); for (let k = 1; k <= 80; k++) { const a = k / 16 * Math.PI * 2; g.onDrag(t.x + Math.cos(a) * t.r, t.y + Math.sin(a) * t.r, 0, 0); } g.onRelease(); s.step(); continue; }
    if (t.kind === 'drag') { if (g.onPress) g.onPress(t.x, t.y); let x = t.x, y = t.y; const n = t.slow ? 24 : 6; for (let k = 1; k <= n; k++) { const nx = t.x + (t.to.x - t.x) * k / n, ny = t.y + (t.to.y - t.y) * k / n; if (t.slow) { if (s.inResult()) break; s.step(); } g.onDrag(nx, ny, nx - x, ny - y); x = nx; y = ny; } if (g.onRelease) g.onRelease(x, y); s.step(); }
  }
}

test('shutter: the white flash fades during the result so the photo is visible (F4)', () => {
  const s = startSolo('shutter');
  solve(s);
  assert.ok(s.inResult(), 'the shot was judged');
  const whites = (calls) => calls.filter((c) => c.k === 'fillRect' && c.w === W && c.h === H && /^rgba\(255,255,255,/.test(c.fillStyle)).map((c) => Number(c.fillStyle.split(',')[3].slice(0, -1)));
  const first = whites(frame(s));
  assert.ok(first.length && first[0] < 1, `the flash starts fading on the first result frame: ${first}`);
  s.advanceMs(380);
  assert.ok(s.inResult(), 'still inside RESULT_MS');
  assert.deepEqual(whites(frame(s)), [], 'the screen is no longer white before the next game');
});

test('cliff: overshooting the edge makes the character fall while ✕ is shown (F4)', () => {
  const s = startSolo('cliff');
  for (let i = 0; i < 400 && !s.inResult(); i++) s.step(); // さわらずに いきすぎる
  assert.ok(s.inResult());
  assert.match(s.lives.textContent, /🖤/, 'it was a miss');
  const y0 = glyphOf(frame(s), '🐣')[0].y;
  s.advanceMs(300);
  const y1 = glyphOf(frame(s), '🐣')[0].y;
  assert.ok(y1 - y0 >= 60, `the character falls off the cliff: ${y0} → ${y1}`);
});

test('charge: a successful release jumps during the result (F4)', () => {
  const s = startSolo('charge');
  solve(s);
  assert.match(s.count.textContent, /✔ 1/, 'released in the green');
  const y0 = glyphOf(frame(s), '🐣')[0].y;
  s.advanceMs(300);
  const y1 = glyphOf(frame(s), '🐣')[0].y;
  assert.ok(y0 - y1 >= 40, `the character jumps: ${y0} → ${y1}`);
});

test('stack: the dropped block falls onto the tower during the result (F4)', () => {
  const s = startSolo('stack');
  solve(s);
  assert.ok(s.inResult());
  const y0 = glyphOf(frame(s), '🟧')[0].y;
  s.advanceMs(300);
  const y1 = glyphOf(frame(s), '🟧')[0].y;
  assert.ok(y1 - y0 >= 60, `the block falls: ${y0} → ${y1}`);
});

test('sort: the last item keeps flying away during the result (F4)', () => {
  const s = startSolo('sort');
  solve(s);
  assert.match(s.count.textContent, /✔ 1/);
  const big = (calls) => calls.filter((c) => c.k === 'fillText' && c.font === '44px sans-serif' && c.ch !== '🐣');
  const a = big(frame(s));
  assert.equal(a.length, 1, 'the flying item is drawn');
  s.advanceMs(300);
  assert.deepEqual(big(frame(s)), [], 'it has flown off the screen');
});

test('all 50 games: the result frames never judge again, play sfx, or throw (solved and idle)', () => {
  const ids = startSolo('eat').mod.QUICK_GAMES.map((g) => g.id);
  assert.equal(ids.length, 50);
  for (const id of ids) for (const mode of ['solve', 'idle']) {
    const s = startSolo(id, {seed: 11});
    if (mode === 'solve') solve(s);
    for (let i = 0; i < 500 && !s.inResult(); i++) s.step(); // さわらなければ 時間切れで きまる
    assert.ok(s.inResult(), `${id} ${mode}: judged`);
    const before = {count: s.count.textContent, lives: s.lives.textContent, sfx: s.sfx.length};
    // さわりつづけても 結果の あいだは なにも おきない
    const cv = s.canvas.listeners;
    assert.doesNotThrow(() => { for (let i = 0; i < 30; i++) { if (i === 3) { cv.pointerdown({pointerId: 1, clientX: W / 2, clientY: H / 2}); cv.pointermove({pointerId: 1, clientX: W / 2, clientY: H / 2 - 60}); cv.pointerup({pointerId: 1}); } s.step(); } }, `${id} ${mode}: result frames`);
    assert.equal(s.count.textContent, before.count, `${id} ${mode}: no second clear`);
    assert.equal(s.lives.textContent, before.lives, `${id} ${mode}: no second miss`);
    assert.equal(s.sfx.length, before.sfx, `${id} ${mode}: no sfx during the result (${s.sfx.slice(before.sfx)})`);
    assert.ok(s.inResult(), `${id} ${mode}: still showing the result`);
    s.advanceMs(200);
    assert.notEqual(s.r.current, s.cur, `${id} ${mode}: the next game starts after RESULT_MS`);
  }
});

test('result is a small top badge over a light tint; the last picture stays visible (F5)', () => {
  const s = startSolo('eat');
  solve(s);
  assert.match(s.flash.innerHTML, /^<span class="qk-badge"><span class="qk-ok">○<\/span>/, 'the ○ sits inside a badge');
  assert.equal(s.mod.QUICK_RULES.RESULT_MS, 520, 'tempo unchanged');
  const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
  const rule = (sel) => { const m = css.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}')); assert.ok(m, sel); return m[1]; };
  for (const sel of ['.qk-flash.ok', '.qk-flash.ng']) {
    const a = Number((rule(sel).match(/rgba\([^)]*,\s*([0-9.]+)\)/) || [])[1]);
    assert.ok(a > 0 && a <= 0.22, `${sel} tint is light: ${a}`);
  }
  assert.match(rule('.qk-flash'), /justify-content:\s*flex-start/, 'the badge sits at the top');
  const size = Number(rule('.qk-flash .qk-ok, .qk-flash .qk-ng').match(/font-size:\s*(\d+)px/)[1]);
  assert.ok(size <= 60, `○/✕ is badge sized: ${size}px`);
});

test('long cues shrink so they fit one line at 375pt (F15)', () => {
  const sizeOf = (id) => { const s = startSolo(id); return {cue: s.r.current.cue, px: parseInt(s.cue.style.getPropertyValue('--qk-cue-size'), 10)}; };
  const short = sizeOf('shutter'), med = sizeOf('medicine'), um = sizeOf('umbrella');
  assert.equal(short.px, 40, 'short cues keep 40px');
  for (const c of [med, um]) {
    assert.equal(Array.from(c.cue).length, 9, `cue wording is unchanged: ${c.cue}`);
    assert.ok(c.px <= 28, `${c.cue} shrinks: ${c.px}px`);
    // letter-spacing 0.04em こみで 343px(375pt − よはく)に おさまる
    assert.ok(Array.from(c.cue).length * c.px * 1.04 <= 343, `${c.cue} fits one line`);
  }
  const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
  assert.match(css, /\.qk-cue\s*\{[^}]*font-size:\s*var\(--qk-cue-size,\s*40px\)/, 'the cue size reads the variable');
});
