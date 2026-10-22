// Phase 2 PR 2-4(小規模ランダム化): 毎回 おなじ 正解・初期配置で 覚えゲーに ならない ことの 回帰テスト。
// bento の 見本の はいち、通常 stack 系の ゆれの はじめ、クイック color / season / weather の 答えの 絵。
// DOM と 時計・canvas は ハーネスの 代用品(ブラウザの 描画や 指の 入力の 証拠では ない)。
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {harness} = require('./helpers/runtime-harness.cjs');

const GRACE = 600; // script.js の MG_ACTION_START_GRACE_MS

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

function start(id, seed, withCtx) {
  const log = [];
  const h = harness({seed, ...(withCtx ? {canvasContext: fakeCtx(log)} : {})});
  const game = h.api.games.find((g) => g.id === id), scores = [];
  assert.ok(game, id);
  let box = null;
  h.api.startMinigame({id: game.id, start(container, done) { box = container; game.start(container, (score) => { scores.push(score); done(score); }); }});
  return {h, view: h.get('minigameOverlay'), scores, log, html: () => box.innerHTML};
}

// ---------------- dragDecorate-bento: 見本の はいちが 毎回 かわる ----------------
const BENTO_SLOTS = ['26,30', '74,30', '26,68', '74,68'];
function bentoLayout(seed) {
  const g = start('dragDecorate-bento', seed);
  // ハーネスの DOM は style を もたないので、わくの いちは かかれた HTML から よむ(ならびは 要素と おなじ)
  const html = g.html(), at = (cls) => [...html.matchAll(new RegExp(`class="${cls}"[^>]*style="left:([\\d.]+)%;top:([\\d.]+)%"`, 'g'))].map((m) => `${+m[1]},${+m[2]}`);
  const targets = g.view.querySelectorAll('.mg-drop-target'), previews = g.view.querySelectorAll('.mg-bento-preview');
  const tPos = at('mg-drop-target'), pPos = at('mg-bento-preview');
  assert.equal(tPos.length, targets.length); assert.equal(pPos.length, previews.length);
  const pos = (el) => (targets.includes(el) ? tPos[targets.indexOf(el)] : pPos[previews.indexOf(el)]);
  return {g, targets, previews, layout: targets.map((t) => `${t.dataset.key}@${pos(t)}`).sort().join(' '), pos};
}

test('bento shuffles which food sits in which slot, keeping the 4 slots and the preview in step', () => {
  const layouts = new Set();
  for (let seed = 1; seed <= 60; seed++) {
    const {targets, previews, layout, pos} = bentoLayout(seed);
    assert.equal(targets.length, 4);
    assert.deepEqual(targets.map(pos).sort(), [...BENTO_SLOTS].sort(), 'same 4 slot positions every time');
    assert.deepEqual(targets.map((t) => t.dataset.key).sort(), ['broccoli', 'egg', 'rice', 'shrimp']);
    // 見本の 絵は その わくの 具と おなじ(見本どおりに おけば かならず 4/4)
    for (const t of targets) assert.ok(previews.some((p) => pos(p) === pos(t)), 'every slot has a preview');
    layouts.add(layout);
  }
  assert.ok(layouts.size >= 10, `layout varies between plays (${layouts.size} distinct of 60)`);
});

test('bento is always solvable: copying the shown preview scores 100 within the same time limit', () => {
  for (const seed of [3, 17, 42]) {
    const {g, targets, previews, pos} = bentoLayout(seed);
    // 見本の 絵(foodIconHTML の 中身)から、どの わくに どの 具かを よみとる
    const shown = new Map(previews.map((p) => [pos(p), p.innerHTML]));
    const items = g.view.querySelectorAll('.mg-drag-item');
    targets.forEach((t, i) => { t.getBoundingClientRect = () => ({left: 20 + i * 60, right: 66 + i * 60, top: 20, bottom: 66, width: 46, height: 46}); });
    items.forEach((i) => { i.getBoundingClientRect = () => ({left: 0, right: 46, top: 180, bottom: 226, width: 46, height: 46}); });
    g.h.advance(2200);
    for (const t of targets) {
      const item = items.find((i) => i.innerHTML === shown.get(pos(t)));
      assert.ok(item, 'the remembered food is in the tray');
      g.h.dispatch(item, 'pointerdown', {pointerId: 5, clientX: 23, clientY: 203});
      g.h.dispatch(item, 'pointerup', {pointerId: 5, clientX: t.getBoundingClientRect().left + 23, clientY: 43});
    }
    assert.deepEqual(g.scores, [100], `seed ${seed}`);
  }
});

// ---------------- 通常 stack 系: ゆれの はじめの いち・むきが 毎回 かわる ----------------
const STACK_IDS = ['stack-themed', 'stack-snowman', 'stack-harvest', 'stack-acorn', 'stack-sakura', 'stack-leaves'];
// 1フレーム ぶんの 描画から、土台の まんなか と クレーン(ゆれる ブロック)の まんなか を よむ
function stackFrame(g) {
  g.log.length = 0; g.h.advance(16);
  const base = g.log.find((c) => c.op === 'translate');
  const crane = g.log.find((c) => c.op === 'moveTo' && c.a[1] === 0 && c.stroke === '#555');
  return {mid: base.a[0], x: crane.a[0]};
}

test('every stack variant starts its swing at a random position and direction, never on the perfect spot', () => {
  for (const id of STACK_IDS) {
    const starts = new Set(), dirs = new Set();
    for (let seed = 1; seed <= 24; seed++) {
      const g = start(id, seed, true);
      const a = stackFrame(g);
      assert.ok(Math.abs(a.x - a.mid) >= 15.9, `${id} seed ${seed}: start is away from the perfect center (${a.x - a.mid})`);
      starts.add(Math.round(a.x));
      g.h.advance(GRACE);
      const b = stackFrame(g), c = stackFrame(g);
      if (c.x !== b.x) dirs.add(Math.sign(c.x - b.x));
    }
    assert.ok(starts.size >= 8, `${id}: start position varies (${starts.size})`);
    assert.deepEqual([...dirs].sort(), [-1, 1], `${id}: both start directions occur`);
  }
});

test('dropping right after the start grace is never a perfect', () => {
  for (const id of STACK_IDS) {
    for (let seed = 1; seed <= 12; seed++) {
      const g = start(id, seed, true);
      g.h.advance(GRACE + 16);
      g.h.dispatch(g.view.querySelector('#stDrop'), 'pointerdown', {});
      for (let i = 0; i < 80; i++) g.h.advance(16);
      assert.match(g.view.querySelector('#stScore').textContent, /✨ 0$/, `${id} seed ${seed}`);
    }
  }
});

// ---------------- クイック color / season / weather: 答えの 絵が プールから えらばれる ----------------
// プールの 設計(ここが 仕様)。たがいに かぶらず、まぎれる 絵を ふくまない。
// 画面では 絵文字は イラスト(displayCatalog)に おきかわるので、その 絵で 見分けられる ものを えらんだ
const POOLS = {
  color: {'あかは？': ['🍎', '🍓', '🍅'], 'きいろは？': ['🍋', '🍌', '🐥'], 'みどりは？': ['🥦', '🍀', '🌿'], 'あおは？': ['🐳', '💧', '🧢'], 'むらさきは？': ['🍇', '☂️', '🔮']},
  season: {'はるは？': ['🌸', '🐣', '🍡'], 'なつは？': ['🌻', '🍉', '🎆'], 'あきは？': ['🍁', '🎃', '🌰'], 'ふゆは？': ['⛄', '🧤', '🧣']},
  weather: {'はれは？': ['🕶️', '🧢'], 'あめは？': ['☂️', '🐌'], 'ゆきは？': ['🧣', '🧤']},
};
// 見分けにくい・どちらとも とれる 絵(1つなら 入れない、2つ以上なら 同じ ゲームに 1つまで)
const CONFUSABLE = {
  color: [['🫐', '🍇'], ['🫐', '☂️'], ['🫐', '🔮'], ['🍒', '🍓'], ['🍑'], ['🍊']],
  season: [['🍓'], ['🎏'], ['🌷'], ['🌼'], ['🎍'], ['🎄'], ['🍂', '🍁']],
  weather: [['👢'], ['🥾'], ['🧥'], ['⛱️'], ['☔'], ['🌂']],
};
// その ゲームで いっしょに 出る 絵(てんきの おおきい 絵、まんなかの キャラ)
const SCENE = {color: [], season: [], weather: ['☀️', '🌧️', '❄️']};

function quickRound(h, id, seed) {
  const def = h.api.QUICK_GAMES.find((d) => d.id === id);
  let a = seed >>> 0;
  const rand = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const make = (level) => { h.api.setRandom(rand); a = seed >>> 0; let result = null; const game = def.create({W: 300, H: 300, level, speed: 1, extra: Math.floor((level - 1) / 2), feint: level >= 3, win: () => { result = 'win'; }, lose: () => { result = 'lose'; }}); return {game, result: () => result}; };
  return make;
}
function drawnItems(game, cue) {
  const log = [];
  game.draw(fakeCtx(log));
  // 絵(fillText)のうち、答えの わく(ring = arc)の 中心に かかれた ものだけ
  const rings = log.filter((c) => c.op === 'arc').map((c) => [c.a[0], c.a[1]]);
  return log.filter((c) => c.op === 'fillText' && rings.some(([x, y]) => Math.abs(x - c.a[1]) < 1 && Math.abs(y - c.a[2]) < 30))
    .map((c) => ({ch: c.a[0], x: c.a[1], y: c.a[2]}));
}

for (const id of ['color', 'season', 'weather']) {
  test(`quick ${id}: the answer picture comes from a per-cue pool, and every pool combination has exactly one answer`, () => {
    const h = harness();
    const pools = POOLS[id], cues = Object.keys(pools);
    // 1) プールどうしが かぶらず、まぎれる 組を ふくまない
    const all = cues.flatMap((c) => pools[c]);
    assert.equal(new Set(all).size, all.length, 'pools are disjoint');
    // じっさいの 絵(イラスト)が あり、プールどうし・場面の 絵と おなじ 絵に ならない
    const art = harness({fullDisplay: true}).api.displayCatalog, look = (e) => JSON.stringify(art.resolve(e));
    for (const e of [...all, ...SCENE[id]]) assert.ok(art.resolve(e), `${e} has an illustration`);
    const looks = [...all, ...SCENE[id]].map(look);
    assert.equal(new Set(looks).size, looks.length, 'every picture (and the scene icon) looks different');
    for (const group of CONFUSABLE[id]) {
      const inPools = group.filter((e) => all.includes(e));
      assert.ok(group.length === 1 ? inPools.length === 0 : inPools.length <= 1, `confusable ${group.join('/')}`);
    }
    // 2) じっさいに 出る 絵を あつめる(cue ごと)。正解を タップすると かち、ほかは まけ
    const seen = Object.fromEntries(cues.map((c) => [c, new Set()]));
    for (let seed = 1; seed <= 400; seed++) {
      const level = 1 + (seed % 6), make = quickRound(h, id, seed);
      const {game} = make(level);
      assert.ok(cues.includes(game.cue), `cue text stays one of the original (${game.cue})`);
      const items = drawnItems(game, game.cue);
      const right = items.filter((it) => pools[game.cue].includes(it.ch));
      assert.equal(right.length, 1, `exactly one right picture (${game.cue}: ${items.map((i) => i.ch).join('')})`);
      for (const it of items) assert.ok(all.includes(it.ch), `${it.ch} is from a pool`);
      // 1つの ラウンドで 同じ cue の プールから 2つ 出ない(どの 絵も べつの cue の 正解)
      const owners = items.map((it) => cues.find((c) => pools[c].includes(it.ch)));
      assert.equal(new Set(owners).size, owners.length, 'one picture per cue on screen');
      const t = game.target();
      assert.ok(Math.abs(t.x - right[0].x) < 1, 'target() points at the right picture');
      seen[game.cue].add(right[0].ch);
      // かくにん: 正解の いちで かち、ちがう 絵の いちで まけ(同じ 乱数で つくりなおす)
      for (const it of items) {
        const r = make(level); r.game.onTap(it.x, it.y);
        assert.equal(r.result(), it === right[0] ? 'win' : 'lose', `${game.cue} tap ${it.ch}`);
      }
    }
    for (const c of cues) assert.deepEqual([...seen[c]].sort(), [...pools[c]].sort(), `${c}: every pool picture can be the answer`);
    // 3) ぜんぶの くみあわせ(cue ごとに プールから 1つ)で、どの cue でも 正解が ちょうど 1つ
    const combos = cues.reduce((acc, c) => acc.flatMap((row) => pools[c].map((e) => [...row, e])), [[]]);
    for (const row of combos) for (const want of cues) assert.equal(row.filter((e) => pools[want].includes(e)).length, 1, `${want} in ${row.join('')}`);
  });
}
