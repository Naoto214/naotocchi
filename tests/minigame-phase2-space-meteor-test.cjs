// Phase 2 第3弾: p3-space「流れ星」の 回帰テスト。
// いんせきの 一部が、行き先への 予告(点線と 尾)を 出してから 隣の レーンへ 移る。
// 予告から 移るまでに 時間が ある／移る先は 予告どおり／移り終えてから 判定まで 間が ある／
// p3-drive・road-themed・地域3本は かわらない／描画で 乱数を ひかない。
// 道の 位置は 描かれた 道の 多角形から、いんせきの 位置は 予告の 線から 読む(内部の 状態は 見ない)。
// DOM と 時計・canvas は ハーネスの 代用品(ブラウザの 描画や 指の 入力の 証拠では ない)。
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {harness} = require('./helpers/runtime-harness.cjs');

const STEP = 16, LANE = 0.62, GUIDE = 'rgba(255,214,90,.9)', TAIL = 'rgba(255,170,90,.85)';
const SPACE_ROAD = new Set(['#1c2350', '#212858']);

function fakeCtx(log) {
  const grad = {addColorStop() {}};
  return new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => grad;
      if (k === 'measureText') return () => ({width: 0});
      return (...a) => { log.push({op: k, a, stroke: t.strokeStyle, fill: t.fillStyle}); };
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

// lanes(t) が かえす レーンを 画面の タップで えらぶ
function play(id, seed, {ctx = true, lanes = () => null, onFrame, limit = 30000} = {}) {
  const log = [];
  const h = harness({seed, ...(ctx ? {canvasContext: fakeCtx(log)} : {})});
  const game = h.api.games.find((g) => g.id === id);
  assert.ok(game, id);
  let score = null;
  h.api.startMinigame({id: game.id, start(c, done) { game.start(c, (s) => { score = s; done(s); }); }});
  const view = h.get('minigameOverlay'), canvas = view.querySelector('#lrCanvas'), hint = view.querySelector('#lrHint');
  const hints = [];
  let t = 0, cur = 1;
  while (score === null && t < limit) {
    log.length = 0; h.advance(STEP); t += STEP;
    if (hints[hints.length - 1] !== hint.textContent) hints.push(hint.textContent);
    if (onFrame) onFrame({t, log: log.slice()});
    const want = lanes(t);
    if (want !== null && want !== cur) { h.dispatch(canvas, 'pointerdown', {pointerId: 1, clientX: [50, 150, 250][want], clientY: 150}); cur = want; }
  }
  return {score, hints, t};
}

// 1こまの 描画から、いんせきの 予告を 読む: [{off, hw, dest}] (off/dest は 道はば きじゅん、hw は 道の はんぶんの はば)
function readMeteors(log) {
  const roads = new Map();
  for (let i = 0; i < log.length - 1; i++) {
    const a = log[i], b = log[i + 1];
    if (a.op === 'moveTo' && b.op === 'lineTo' && SPACE_ROAD.has(a.fill) && a.a[1] === b.a[1] && !roads.has(a.a[1])) roads.set(a.a[1], {cx: (a.a[0] + b.a[0]) / 2, hw: (b.a[0] - a.a[0]) / 2});
  }
  const out = [];
  for (let i = 2; i < log.length - 2; i++) {
    const a = log[i], b = log[i + 1], dash = log[i - 2];
    // setLineDash → beginPath → moveTo → lineTo → stroke の 線だけ(点線が 予告、点線なしが 尾)
    if (dash.op !== 'setLineDash' || log[i - 1].op !== 'beginPath' || a.op !== 'moveTo' || b.op !== 'lineTo' || log[i + 2].op !== 'stroke') continue;
    if (a.stroke !== (dash.a[0].length ? GUIDE : TAIL)) continue;
    // 予告の 線は いんせきの 足もと(道の 上の 高さ)から ひく
    const [sx, y] = a.a, road = roads.get(y);
    if (!road || road.hw < 4) continue;
    const m = {at: sx + ',' + y, off: (sx - road.cx) / road.hw, hw: road.hw, kind: dash.a[0].length ? 'guide' : 'tail'};
    if (m.kind === 'guide') m.dest = m.off + (b.a[0] - sx) / road.hw;
    else {
      // 尾の よこの ながさは 道はばの はんぶんの 0.32 ばい。合わない ときは 同じ 高さの べつの 道を ひろったので すてる
      m.back = Math.sign(b.a[0] - sx);
      if (Math.abs(Math.abs(b.a[0] - sx) / 0.32 - road.hw) > road.hw * 0.05) continue;
    }
    out.push(m);
  }
  const ok = new Set(out.filter((m) => m.kind === 'tail').map((m) => m.at));
  return out.filter((m) => ok.has(m.at));
}

// いんせき 1こずつの 流れ(出てから 通りすぎるまで)を あつめる。2こ 同時の こまは つかわない
function episodes(seed) {
  const eps = []; let cur = null;
  play('p3-space', seed, {onFrame: ({t, log}) => {
    const ms = readMeteors(log), tails = ms.filter((m) => m.kind === 'tail');
    if (tails.length !== 1) { if (tails.length > 1 && cur) cur.mixed = true; return; }
    const tail = tails[0], guide = ms.find((m) => m.kind === 'guide');
    if (!cur || tail.hw < cur.last.hw * 0.8) { cur = {frames: []}; eps.push(cur); }
    cur.last = tail; cur.frames.push({t, off: tail.off, hw: tail.hw, dest: guide ? guide.dest : null, back: tail.back});
  }});
  // 出た ところ(遠く)から 見えて いた ものだけ
  return eps.filter((e) => !e.mixed && e.frames.length > 20 && segsToPlayer(e.frames[0].hw) > 45);
}
// 道の 幅(hw)から、プレイヤーまでの きょり(SEG_LEN 単位)。createPseudoRoad の 式の ぎゃく
const CAM_DEPTH = 1 / Math.tan(50 * Math.PI / 180), PLAYER_Z = 1000 * CAM_DEPTH;
const segsToPlayer = (hw) => (CAM_DEPTH * 1100 * 300 / 2 / hw - PLAYER_Z) / 200;

test('some meteors announce a neighbouring lane, wait, then move there and arrive with time to dodge', () => {
  let n = 0;
  for (let seed = 1; seed <= 16; seed++) for (const e of episodes(seed)) {
    const f = e.frames, first = f[0];
    assert.ok(first.dest !== null, 'the guide is shown from the moment the meteor appears');
    const from = Math.round(first.off / LANE), to = Math.round(first.dest / LANE);
    assert.ok(Math.abs(first.off - from * LANE) < 0.03 && Math.abs(first.dest - to * LANE) < 0.03, 'guide points at a lane centre');
    assert.equal(Math.abs(to - from), 1, 'only to the neighbouring lane');
    assert.equal(first.back, -Math.sign(to - from), 'the tail streams away from where it is heading');
    const moveAt = f.find((x) => Math.abs(x.off - from * LANE) > 0.02);
    assert.ok(moveAt, 'it does move');
    assert.ok(moveAt.t - first.t >= 450, `warning lasts before it moves (${moveAt.t - first.t}ms)`);
    for (const x of f.filter((x) => x.dest !== null)) assert.ok(Math.abs(x.dest - to * LANE) < 0.03, 'the announced lane never changes');
    const settled = f.find((x) => x.t > moveAt.t && Math.abs(x.off - to * LANE) < 0.01);
    assert.ok(settled, 'it ends exactly in the announced lane');
    assert.ok(segsToPlayer(settled.hw) >= 12, `settles well before reaching the player (${segsToPlayer(settled.hw).toFixed(1)} segments)`);
    assert.ok(f.filter((x) => x.t >= settled.t).every((x) => Math.abs(x.off - to * LANE) < 0.01), 'and stays there');
    n++;
  }
  assert.ok(n >= 6, `enough moving meteors seen (${n})`);
});

test('reading the warning avoids the meteor: standing in the announced lane is hit, the lane it left is safe', () => {
  // 1こめの 流れ星の 行き先と もとの レーンを 読み、同じ たねで その レーンに 立ちつづける
  let checked = 0, sumDest = 0, sumFrom = 0;
  for (let seed = 1; seed <= 30 && checked < 4; seed++) {
    let info = null;
    play('p3-space', seed, {limit: 6000, onFrame: ({t, log}) => {
      if (info) return; const g = readMeteors(log).find((m) => m.kind === 'guide');
      if (g) info = {t, from: Math.round(g.off / LANE) + 1, to: Math.round(g.dest / LANE) + 1};
    }});
    if (!info) continue;
    // 流れ星が とおりすぎる ころまでで うちきって、ぶつかった かいすうを くらべる(ほかの いんせきも ふくむ)
    const hitsWhen = (lane) => { const r = play('p3-space', seed, {limit: info.t + 2200, lanes: () => lane}); return r.hints.filter((x) => /ぶつかった/.test(x)).length; };
    const atDest = hitsWhen(info.to), atFrom = hitsWhen(info.from);
    assert.ok(atDest >= 1, `seed ${seed}: staying in the announced lane is hit (${atDest})`);
    sumDest += atDest; sumFrom += atFrom; checked++;
  }
  assert.ok(checked >= 3, 'found meteors early in several plays');
  assert.ok(sumDest > sumFrom, `announced lane ${sumDest} hits vs the lane it left ${sumFrom}`);
});

test('drawing never draws random numbers: the same seed plays the same with and without a canvas', () => {
  const lanes = (t) => [1, 0, 1, 2][Math.floor(t / 650) % 4];
  for (const seed of [3, 9]) {
    const a = play('p3-space', seed, {ctx: true, lanes}), b = play('p3-space', seed, {ctx: false, lanes});
    assert.deepEqual(a, b, 'seed ' + seed);
  }
});

test('road-themed sky no longer shares items with p3-space and uses catalogued art', () => {
  const h = harness({fullDisplay: true});
  const src = require('node:fs').readFileSync('games.js', 'utf8');
  const sky = /title: '空を飛ぼう[^']*', goodItems: \[([^\]]*)\], badItems: \[([^\]]*)\], scene: 'sky'/.exec(src);
  const space = /mg\('p3-space', makeRoadGame\(\{ title: '[^']*', goodItems: \[([^\]]*)\], badItems: \[([^\]]*)\]/.exec(src);
  assert.ok(sky && space);
  const list = (s) => [...s.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const skyItems = [...list(sky[1]), ...list(sky[2])], spaceItems = [...list(space[1]), ...list(space[2])];
  assert.deepEqual(skyItems.filter((e) => spaceItems.includes(e)), [], 'no shared items');
  for (const e of skyItems) assert.ok(h.api.displayCatalog.resolve(e), e + ' has catalogued art');
  assert.ok(h.api.propArt, 'road props renderer');
});

// 修正前の main(0b3bb1fe)で 記録した 値。p3-drive / road-themed / 地域3本は 1つも かわらない
const BEFORE = {
  'p3-drive': '9a4e49efe90f061e',
  'road-themed': '9aad8a7fbbe01583',
  'road-city': '9a4e49efe90f061e',
  'road-jungle': '9a4e49efe90f061e',
  'road-desert': '9a4e49efe90f061e',
};
test('p3-drive, road-themed and the regional roads play exactly as before', () => {
  const got = {};
  for (const id of Object.keys(BEFORE)) {
    const runs = [1, 2, 3, 4, 5, 6].map((seed) => { const r = play(id, seed, {lanes: (t) => [1, 0, 1, 2][Math.floor(t / (500 + seed * 60)) % 4]}); return [r.score, r.t, r.hints]; });
    got[id] = createHash('sha256').update(JSON.stringify(runs)).digest('hex').slice(0, 16);
    if (process.env.PRINT_SIG) console.log(id, got[id], JSON.stringify(runs.map((r) => r[0])));
  }
  assert.deepEqual(got, BEFORE);
});
