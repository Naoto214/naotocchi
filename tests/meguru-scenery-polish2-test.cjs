// めぐる scenery polish 第2段階(地域ごと の 差別化)の 正本。
//
// HIGH と きめた 3 地域 だけ を、見た目 だけ で なおす:
//   ・snow        : みち を 圧雪 の 青灰 に、雪面 の 起伏(drift)と 足あと を 青灰〜薄紫 に。
//                   じめん(ground)は 世界地図・地域地図・corridor が つかう ので かえない
//   ・memory_lake : 木 の 絵文字 を とおく ほど 霧 に しずめる(透明度 だけ。数・位置・当たり は そのまま)
//   ・star_stop   : 地平線 の した の 地上(land_below)の さかいめ に 雲 の 霞 を かける。
//                   遠景 の 数・方角・種類・distantShown の 形 は かえない
// のこり 10 地域 の world 出力・当たり判定・出口・探索率・セーブ は 1 つも かわらない。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { harness } = require('./helpers/runtime-harness.cjs');

// えがいた ものを 記録する にせ の ctx(グラデーション の 範囲 と いろ の とまり も のこす)
function recordingCtx(log, grads) {
  const state = { imageSmoothingEnabled: true }, stack = [];
  return new Proxy(state, { get(o, k) {
    if (k in o) return o[k];
    if (k === 'save') return () => stack.push({ ...state });
    if (k === 'restore') return () => { const p = stack.pop(); if (p) Object.assign(state, p); };
    if (k === 'createLinearGradient') return (x0, y0, x1, y1) => { const g = { y0, y1, stops: [], addColorStop(t, c) { this.stops.push([t, c]); } }; grads.push(g); return g; };
    if (k === 'createRadialGradient') return () => ({ addColorStop() {} });
    if (k === 'measureText') return (t) => ({ width: String(t).length * 6 });
    if (k === 'getImageData') return () => ({ data: [] });
    return (...a) => { log.push([k, a[0], a[1], o.fillStyle]); };
  }, set(o, k, v) { o[k] = v; return true; } });
}
function setup(regionId = 'snow', time = 'day') {
  const log = [], grads = [];
  const h = harness({ fullDisplay: true, canvasContext: recordingCtx(log, grads) });
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80,
    speciesLine: 'dog', stageIndex: 4, ageTicks: 500, regionId });
  s.petKey = `dog:${h.api.currentFormStageIndex()}`;
  Object.assign(s.lifetime, { timeMode: time, weatherMode: 'sunny', seasonMode: 'spring' });
  s.lifetime.meguru = { visits: 0, talkCount: 0, met: {}, talks: {}, spots: {}, zones: {}, paths: {}, marks: {}, world: { regions: [], links: [] } };
  h.api.render();
  return { h, s, M: h.api.meguruMod, log, grads };
}
const fixedWorld = (M, rid) => M.buildWorld(rid, M.buildRegistry(), {});
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const lum = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
const sat = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; };
const hue = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return 0; let h; if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; return (h * 60 + 360) % 360; };
const detailOf = (w, kind) => (w.detail || []).find((d) => d[0] === kind);

// ────────────────────────────── snow

test('snow: じめん の いろ は そのまま(世界地図・地域地図・corridor が つかう)', () => {
  const { M } = setup();
  assert.deepEqual([...M.WORLDS.snow.ground], ['#eef4fb', '#d3e0ee']);
});

test('snow: みち は 圧雪 の 青灰。雪面 から 読める が、青く しすぎない', () => {
  const { M } = setup();
  const path = rgb(M.WORLDS.snow.path), g0 = rgb(M.WORLDS.snow.ground[0]), g1 = rgb(M.WORLDS.snow.ground[1]);
  assert.ok(lum(g0) - lum(path) >= 30, `ひかり の さ ${Math.round(lum(g0) - lum(path))}(雪面 より ひとめで くらい)`);
  assert.ok(lum(g1) - lum(path) >= 8, 'かげ の がわ の 雪面 より も くらい');
  assert.ok(sat(path) <= 0.15, `彩度 ${sat(path).toFixed(2)} ≦ 0.15(青 に しない)`);
  const h = hue(path); assert.ok(h >= 200 && h <= 250, `色相 ${Math.round(h)}(青灰〜薄紫)`);
});

test('snow: 雪面 の 起伏 と 足あと は 白 で なく 青灰〜薄紫。きらきら と 氷 は そのまま', () => {
  const { M } = setup();
  const w = fixedWorld(M, 'snow');
  for (const kind of ['drift', 'footprint']) {
    const c = rgb(detailOf(w, kind)[1]);
    assert.ok(lum(c) < 200, `${kind}: 白 で ない(${Math.round(lum(c))})`);
    assert.ok(sat(c) >= 0.1 && sat(c) <= 0.25, `${kind}: 彩度 ${sat(c).toFixed(2)}(うっすら 色 が ある が 青 に しない)`);
    const h = hue(c); assert.ok(h >= 215 && h <= 240, `${kind}: 色相 ${Math.round(h)}`);
  }
  assert.equal(detailOf(w, 'sparkle')[1], '#e8f4ff');
  assert.equal(detailOf(w, 'ice')[1], '#bcd8ec');
  // かず・大きさ・おもみ は かえない(いろ だけ)
  assert.deepEqual([...detailOf(w, 'drift').slice(2)], [2.6, 70, 180]);
  assert.deepEqual([...detailOf(w, 'footprint').slice(2)], [1, 20, 34]);
});

// ────────────────────────────── memory_lake

test('memory_lake: 霧 は memory_lake の 木 と 草 だけ。ほか の 地域 と あかり は うすく しない', () => {
  const { M } = setup();
  assert.deepEqual(Object.keys(M.EMOJI_MIST), ['memory_lake']);
  assert.deepEqual(Object.keys(M.EMOJI_MIST.memory_lake.kinds).sort(), ['🌳', '🌿'].sort());
  for (const dz of [0, 500, 1200, 3000]) {
    for (const rid of ['river_lake', 'forest', 'home', 'jungle']) assert.equal(M.emojiMistFactor(rid, '🌳', dz), 1, `${rid} dz=${dz}`);
    assert.equal(M.emojiMistFactor('memory_lake', '🕯️', dz), 1, 'ろうそく は 霧 に しずめない');
  }
});

test('memory_lake: ちかく は くっきり、とおく ほど 霧 に しずむ(ゆうれい に しない)', () => {
  const { M } = setup();
  const f = (dz) => M.emojiMistFactor('memory_lake', '🌳', dz);
  assert.equal(f(0), 1); assert.equal(f(260), 1, 'てまえ 260 まで は そのまま');
  let prev = 1;
  for (let dz = 260; dz <= 1400; dz += 20) { const v = f(dz); assert.ok(v <= prev + 1e-9, `dz=${dz} で へる ばかり`); prev = v; }
  assert.ok(Math.abs(f(1100) - 0.42) < 1e-9); assert.ok(Math.abs(f(4000) - 0.42) < 1e-9, 'いちばん うすく て も 0.42');
  assert.ok(f(680) > 0.6 && f(680) < 0.8, 'なかほど は はんぶん くらい');
});

test('memory_lake: 絵文字 の fade に 霧 を かける(描く 命令 は ふやさない)', () => {
  const src = fs.readFileSync(require.resolve('../meguru.js'), 'utf8');
  const at = src.indexOf('let fade = clamp(1.4 - it.p.dz / farCull, 0.35, 1) * occ * nearFade;');
  assert.ok(at > 0);
  const block = src.slice(at, at + 600);
  assert.match(block, /fade \*= emojiMistFactor\(world\.regionId, it\.o\.emoji, it\.p\.dz\);/);
  assert.ok(block.indexOf('emojiMistFactor') < block.indexOf('if (fade <= 0.04) continue;'), 'うすく して から きる');
});

test('memory_lake: props・木 の 壁・当たり判定 は そのまま(霧 は 見た目 だけ)', () => {
  const { M } = setup();
  const w = fixedWorld(M, 'memory_lake');
  assert.equal(w.props.length, 317);
  const wall = w.props.filter((p) => p.layer === 'wall');
  assert.equal(wall.length, 100); assert.ok(wall.every((p) => p.emoji === '🌳' && p.solid));
  assert.equal(w.props.filter((p) => p.emoji === '🌳').length, 104);
});

// ────────────────────────────── star_stop

function starStopFrame(time) {
  const { h, M, grads, log } = setup('star_stop', time);
  assert.equal(h.api.startMeguru(), true);
  h.advance(1800);
  const r = h.api.meguruRun();
  const sp = r.world.spots.find((q) => q.id === 'gardenpath');
  r.setPlayer(sp.x, sp.z - 300); h.advance(400);
  grads.length = 0; log.length = 0; h.advance(17);
  const painted = new Set(log.filter(([k]) => k === 'fillRect').map((e) => e[3]));
  const shown = Array.from(r.renderer.distantShown || []).map((x) => Object.assign({}, x));
  const low = shown.find((x) => x.slot === 'lower');
  h.api.stopMeguru();
  return { M, grads: grads.slice(), low, painted };
}

for (const time of ['day', 'night']) test(`star_stop(${time}): 地平線 を またぐ 霞 の おび が ある。地上 は 霞 の むこう`, () => {
  const { grads, low, painted } = starStopFrame(time);
  assert.ok(low, 'land_below が 地平線 の した に ある');
  assert.deepEqual(Object.keys(low).sort(), ['alpha', 'id', 'kind', 'layer', 'slot', 'y'], 'distantShown の 形 は そのまま');
  assert.equal(low.kind, 'land_below');
  // 霞: 4 つ の とまり。うえ(地平線 の 0.35 ぶん うえ)と した は すきとおり、地平線(1/3)で いちばん こい
  const haze = grads.find((g) => g.stops.length === 4 && g.stops.every(([, c]) => /^rgba\(/.test(c)));
  assert.ok(haze, '地平線 を またぐ 霞 の グラデーション');
  assert.ok(painted.has(haze), '霞 を ぬって いる');
  const a = haze.stops.map(([, c]) => +/,\s*([\d.]+)\)$/.exec(c)[1]);
  assert.deepEqual(a, [0, 1, 0.7, 0], 'うえ と した は すきとおり、地平線 で いちばん こい(地上 の こい ところ でも 0.7)');
  assert.deepEqual(haze.stops.map(([t]) => t), [0, 0.27, 0.58, 1]);
  const hazeRgb = haze.stops[1][1].replace(/^rgba\((\d+),(\d+),(\d+),.*$/, 'rgb($1,$2,$3)');
  assert.ok(new Set(haze.stops.map(([, c]) => c.replace(/,[\d.]+\)$/, ''))).size === 1, '霞 は 1 つ の いろ');
  const land = grads.find((g) => g.stops.length === 3 && g.stops[2][1] === 'rgba(0,0,0,0)' && g.stops[1][0] === 0.4);
  assert.ok(land, '地上 の グラデーション');
  assert.ok(painted.has(land), '地上 を ぬって いる');
  const [r, gg, b] = /rgb\((\d+),(\d+),(\d+)\)/.exec(hazeRgb).slice(1).map(Number);
  assert.ok(b > r && b > gg, `霞 は 空 の いろ(むらさき〜あお)${hazeRgb}`);
  assert.equal(land.stops[0][1], hazeRgb, '地上 は 地平線 で 霞 の いろ から はじまる(緑 の 線 に しない)');
  assert.notEqual(land.stops[1][1], hazeRgb, '地上 の いろ は 霞 の した に のこる');
});

test('star_stop: 遠景 は 1 つ(land_below)の まま。ほか の 地域 に 地平線 の した の 遠景 は ない', () => {
  const { M } = setup();
  const reg = M.distantRegistry();
  const n = (v) => (Array.isArray(v) ? v.length : Object.keys(v).length);
  assert.equal(n(reg.star_stop), 1);
  const src = fs.readFileSync(require.resolve('../meguru.js'), 'utf8');
  assert.match(src, /return lay === 'sky' \? 'lower' : 'waterline';/, 'lower は 空 の 地域 だけ');
});

// ────────────────────────────── 不変

test('counts: spot / path / zone / secret / 分母 / 遠景 / 発見レベル は 1 つも かわらない', () => {
  const { M } = setup();
  let spots = 0, paths = 0, zones = 0, secretSpots = 0, secretPaths = 0;
  const lv = { 0: 0, 2: 0, 3: 0 };
  for (const rid of Object.keys(M.WORLDS)) {
    const b = M.WORLDS[rid];
    spots += b.spots.length; zones += b.zones.length; paths += (b.paths || []).length;
    secretSpots += b.spots.filter((q) => q.secret).length;
    for (const p of b.paths || []) { const o = p[2]; if (o === 'secret' || (o && o.kind === 'secret')) secretPaths++; }
    for (const q of b.spots) lv[M.spotDiscoveryLevel(q)]++;
  }
  assert.equal(spots, 471); assert.equal(paths, 654); assert.equal(zones, 118);
  assert.equal(secretSpots + secretPaths, 107);
  const C = M.worldCountable();
  assert.equal(C.tier1, 17); assert.equal(C.links.length, 12);
  assert.deepEqual(lv, { 0: 184, 2: 216, 3: 71 });
  const df = Object.values(M.distantRegistry()).reduce((a, v) => a + (Array.isArray(v) ? v.length : Object.keys(v).length), 0);
  assert.equal(df, 37);
});

test('snow / star_stop / memory_lake: props・当たり判定 は そのまま(いろ と 霞 と 霧 だけ)', () => {
  const { M } = setup();
  // main(第1段階 マージ 後)と おなじ かず
  const want = { snow: [474, 230, 280], star_stop: [471, 133, 155], memory_lake: [317, 141, 202] };
  for (const [rid, [np, nObs, nCol]] of Object.entries(want)) {
    const w = fixedWorld(M, rid);
    assert.equal(w.props.length, np, `${rid} props`);
    assert.equal(M.buildObstacles(w).length, nObs, `${rid} 障害物`);
    assert.equal(w.props.map((p) => M.colliderOf(p)).filter(Boolean).length, nCol, `${rid} 当たり`);
  }
});

test('save: 形 は かわらない(霧 や 霞 は セーブ しない)', () => {
  const { h, s } = setup('memory_lake');
  const before = Object.keys(s.lifetime.meguru).sort();
  assert.equal(h.api.startMeguru(), true);
  h.advance(1800);
  h.api.stopMeguru();
  const m = s.lifetime.meguru;
  assert.deepEqual(Object.keys(m).sort(), before);
  const txt = JSON.stringify(m);
  assert.ok(!/mist|haze|EMOJI_MIST/i.test(txt));
});
