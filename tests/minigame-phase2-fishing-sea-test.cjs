// Phase 2 第3弾: fishing-sea「とりやま」の 回帰テスト。
// 🐦の むれの 下で 魚が よりやすい／むれは ときどき うごく／なげる きょりごとに 意味が ある
// (近い=小物で はやい、遠い=大物も くる)／ほかの 釣り3本は かわらない／描画で 乱数を ひかない。
// DOM と 時計・canvas は ハーネスの 代用品(ブラウザの 描画や 指の 入力の 証拠では ない)。
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {harness} = require('./helpers/runtime-harness.cjs');

const W = 300, SHORE_X = 28, STEP = 16;

function fakeCtx(log) {
  const grad = {addColorStop() {}};
  return new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => grad;
      if (k === 'measureText') return () => ({width: 0});
      return (...a) => { if (k === 'fillText') log.push(a); };
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

// 投げて、あたりで あわせ、巻く だけの 決まった 操作。cast(frame) が ためる 時間(ms)を かえす
function play(id, seed, {ctx = true, strike = true, cast = () => 500, limit = 40000, onFrame} = {}) {
  const log = [];
  const h = harness({seed, ...(ctx ? {canvasContext: fakeCtx(log)} : {})});
  const game = h.api.games.find((g) => g.id === id);
  assert.ok(game, id);
  let score = null;
  h.api.startMinigame({id: game.id, start(c, done) { game.start(c, (s) => { score = s; done(s); }); }});
  const view = h.get('minigameOverlay'), btn = view.querySelector('#rfMain'), hint = view.querySelector('#rfHint');
  const press = () => h.dispatch(btn, 'pointerdown', {pointerId: 3}), release = () => h.dispatch(btn, 'pointerup', {pointerId: 3});
  const hints = [], hits = [];
  let t = 0, holdUntil = 0, holding = false, nextAt = 800, reelOn = 0;
  while (score === null && t < limit) {
    log.length = 0; h.advance(STEP); t += STEP;
    const txt = hint.textContent; if (hints[hints.length - 1] !== txt) { hints.push(txt); const m = /ヒット!(.+)だ!/.exec(txt); if (m) hits.push({t, name: m[1]}); }
    const frame = {t, texts: log.slice(), label: btn.textContent};
    if (onFrame) onFrame(frame);
    if (t < nextAt) continue;
    if (/キャスト/.test(frame.label)) {
      if (!holding) { press(); holding = true; holdUntil = t + cast(frame); }
      else if (t >= holdUntil) { release(); holding = false; nextAt = t + 300; }
    } else if (/あわせる/.test(frame.label)) {
      if (holding) { release(); holding = false; }
      const biting = ctx && strike ? frame.texts.some((a) => a[0] === 'あたり!いま!') : false;
      if (biting) { press(); release(); nextAt = t + 200; }
    } else if (/まく/.test(frame.label)) {
      // 400ms まいて 300ms やすむ
      const on = (t - reelOn) % 700 < 400;
      if (on && !holding) { press(); holding = true; } else if (!on && holding) { release(); holding = false; }
    }
  }
  if (holding) release();
  return {score, hints, hits, t};
}

const birds = (texts) => texts.filter((a) => a[0] === '🐦');
const flockX = (texts) => { const b = birds(texts); return b.length ? b.reduce((s, a) => s + a[1], 0) / b.length : null; };
// ためる 時間 → うきの おちる x(cast() と おなじ 式。とぶ あいだに 約0.98 すすむ)
const holdFor = (x) => Math.max(120, Math.min(1100, (((x - SHORE_X) / 0.98 - 40) / (W - 80)) * 1100));

test('the sea shows a bird flock in the sky that moves from time to time; other fishing games have none', () => {
  let moved = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const xs = [];
    play('fishing-sea', seed, {limit: 16000, cast: () => 300, onFrame: (f) => { if (f.t % 1000 < STEP) xs.push(flockX(f.texts)); }});
    assert.ok(xs.every((x) => x !== null && x > 0 && x < W), 'the flock is drawn every frame');
    if (Math.max(...xs) - Math.min(...xs) > 30) moved++;
  }
  assert.ok(moved >= 9, `flock moves during most plays (${moved}/12)`);
  for (const id of ['real-fishing', 'fishing-river', 'fishing-deepsea']) {
    let seen = 0;
    play(id, 3, {limit: 6000, onFrame: (f) => { seen += birds(f.texts).length; }});
    assert.equal(seen, 0, id + ' has no flock');
  }
});

// うきが おちてから 最初の あたりまでの 時間(5秒 まっても なければ null)
function firstBite(seed, aim) {
  let landAt = null, biteAt = null, aimed = null;
  play('fishing-sea', seed, {limit: 9000, cast: (f) => { const fx = flockX(f.texts); assert.ok(fx !== null, 'flock is visible when casting'); aimed = aim(fx); return holdFor(aimed); }, onFrame: (f) => {
    if (landAt === null && /あわせる/.test(f.label)) landAt = f.t;
    if (landAt !== null && biteAt === null && f.texts.some((a) => a[0] === 'あたり!いま!')) biteAt = f.t;
  }});
  return landAt !== null && biteAt !== null && biteAt - landAt < 5000 ? biteAt - landAt : null;
}

test('casting under the flock brings bites more often than casting away from it', () => {
  let under = 0, away = 0;
  for (let seed = 1; seed <= 30; seed++) {
    if (firstBite(seed, (fx) => fx) !== null) under++;
    if (firstBite(seed, (fx) => (fx > W / 2 ? fx - 150 : fx + 150)) !== null) away++;
  }
  assert.ok(under >= away + 8, `bite within 5s: under flock ${under}/30, away ${away}/30`);
});

test('distance matters away from the flock: near casts hook only small fish, far casts can hook the big ones', () => {
  const BIG = new Set(['たこ', 'さめ']), SMALL = new Set(['あじ', 'ねったいぎょ']);
  const near = [], far = [], nearX = SHORE_X + 0.98 * (40 + (150 / 1100) * (W - 80)), farX = SHORE_X + 0.98 * (40 + (W - 80));
  // ヒットした ときに むれが うきから はなれて いた 魚だけを かぞえる(むれの 下なら 大物も くる)
  // ヒットまでの 6秒間 ずっと むれが うきから はなれて いた 魚だけを かぞえる(むれの 下なら 大物も くる)
  const away = (seed, hold, x, out) => { const fx = [];
    const r = play('fishing-sea', seed, {cast: () => hold, onFrame: (f) => { fx.push([f.t, flockX(f.texts)]); }});
    for (const hit of r.hits) if (fx.every(([t, v]) => t < hit.t - 6000 || t > hit.t || Math.abs(v - x) > 50)) out.push(hit.name); };
  for (let seed = 1; seed <= 30; seed++) { away(seed, 150, nearX, near); away(seed, 1100, farX, far); }
  assert.ok(near.length > 0 && far.length > 0);
  assert.ok(near.every((n) => SMALL.has(n)), 'right by the shore only small fish bite: ' + near.join(','));
  assert.ok(far.some((n) => BIG.has(n)), 'out at sea the big fish come too: ' + far.join(','));
});

test('the right distance depends on where the flock is: near when it is close, far when it is out at sea', () => {
  const nearHold = 150, farHold = 1100, nearX = SHORE_X + 0.98 * (40 + (nearHold / 1100) * (W - 80)), farX = SHORE_X + 0.98 * (40 + (W - 80));
  let closeNear = 0, closeFar = 0, outNear = 0, outFar = 0, nClose = 0, nOut = 0;
  for (let seed = 1; seed <= 60; seed++) {
    let fx = null;
    play('fishing-sea', seed, {limit: 1000, onFrame: (f) => { if (fx === null) fx = flockX(f.texts); }});
    const bite = (hold) => firstBite(seed, () => SHORE_X + 0.98 * (40 + (hold / 1100) * (W - 80))) !== null;
    if (Math.abs(fx - nearX) < 40) { nClose++; closeNear += bite(nearHold); closeFar += bite(farHold); }
    else if (Math.abs(fx - farX) < 40) { nOut++; outNear += bite(nearHold); outFar += bite(farHold); }
  }
  assert.ok(nClose >= 4 && nOut >= 4, `both situations occur (${nClose}, ${nOut})`);
  assert.ok(closeNear > closeFar, `flock close: near ${closeNear}/${nClose} beats far ${closeFar}/${nClose}`);
  assert.ok(outFar > outNear, `flock out: far ${outFar}/${nOut} beats near ${outNear}/${nOut}`);
});

test('a cast that missed the flock can be reeled in and thrown again (sea only)', () => {
  const recall = (id, seed) => {
    const h = harness({seed});
    const game = h.api.games.find((x) => x.id === id);
    h.api.startMinigame({id: game.id, start(c, done) { game.start(c, done); }});
    const btn = h.get('minigameOverlay').querySelector('#rfMain');
    h.advance(800); h.dispatch(btn, 'pointerdown', {pointerId: 3}); h.advance(400); h.dispatch(btn, 'pointerup', {pointerId: 3});
    h.advance(950); assert.match(btn.textContent, /あわせる/);
    h.dispatch(btn, 'pointerdown', {pointerId: 3}); h.dispatch(btn, 'pointerup', {pointerId: 3}); h.advance(32);
    return /キャスト/.test(btn.textContent);
  };
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
  const back = seeds.filter((seed) => recall('fishing-sea', seed)).length;
  assert.ok(back >= 6, `tapping with nothing around reels the line back in (${back}/8)`);
  for (const id of ['real-fishing', 'fishing-river', 'fishing-deepsea']) assert.ok(seeds.every((seed) => !recall(id, seed)), id + ' keeps waiting as before');
});

test('drawing never draws random numbers: the same seed plays the same with and without a canvas', () => {
  // canvas なしでは あたりの 印が 読めないので、あわせない 操作どうしで、ヒントの 流れと 点数を くらべる
  for (const id of ['fishing-sea', 'real-fishing']) for (const seed of [2, 7]) {
    const run = (ctx) => { const r = play(id, seed, {ctx, strike: false, cast: () => 700}); return {score: r.score, t: r.t, hints: r.hints}; };
    assert.deepEqual(run(true), run(false), id + ' seed ' + seed);
  }
});

// 修正前の main(0b3bb1fe)で 記録した 値。real-fishing / river / deepsea は 1つも かわらない
const BEFORE = {
  'real-fishing': '571f9dcff5793873',
  'fishing-river': '47784c52140395c3',
  'fishing-deepsea': '948dc266a7245590',
};
test('real-fishing, fishing-river and fishing-deepsea play exactly as before', () => {
  const got = {};
  for (const id of Object.keys(BEFORE)) {
    const runs = [1, 2, 3, 4].map((seed) => { const r = play(id, seed, {cast: (f) => 300 + (f.t % 700)}); return [r.score, r.t, r.hints]; });
    const sig = createHash('sha256').update(JSON.stringify(runs)).digest('hex').slice(0, 16);
    if (process.env.PRINT_SIG) console.log(id, sig, JSON.stringify(runs.map((r) => r[0])));
    got[id] = sig;
  }
  assert.deepEqual(got, BEFORE);
});
