import test from 'node:test';
import assert from 'node:assert/strict';
import {DAYPARTS, atmosphere} from '../../home-dayparts.mjs';
import {usesAutumnLeaves as currentLeaves} from '../../home-autumn-leaves.mjs';
import {usesAutumnLeaves} from './proposal/home-autumn-leaves.mjs';
import {paintFalling, fallingKind, fallingCount, FX_COUNTS, RAIN_WATER, HOME_WINDOW} from './proposal/home-atmosphere-fx.mjs';
import {livingRegions} from './proposal/living/living.mjs';

const each = visit => { for (const region of Object.keys(DAYPARTS)) for (const time of ['morning','day','evening','night'])
  for (const weather of ['sunny','cloudy','rain','snow']) for (const season of ['spring','summer','autumn','winter']) visit({region, time, weather, season}); };
// Records what a painter draws without a browser.
function recorder() {
  const calls = [];
  const ctx = new Proxy({}, {
    get: (target, name) => name in target ? target[name] : (...args) => { calls.push([name, ...args]); },
    set: (target, name, value) => { target[name] = value; return true; }
  });
  return {ctx, calls};
}
const rect = {left:0, top:0, width:1000, height:1500};
const fakeGradient = {addColorStop() {}};
const withGradients = r => { r.ctx.createRadialGradient = r.ctx.createLinearGradient = () => fakeGradient; return r; };
globalThis.OffscreenCanvas = class { getContext() { return withGradients(recorder()).ctx; } };

test('every autumn leaf condition uses the approved leaf B', () => {
  let stale = 0, covered = 0;
  each(env => {
    if (atmosphere(env).particle !== 'leaf') return;
    if (!currentLeaves(env.region, env.time, env)) stale++;
    assert.ok(usesAutumnLeaves(env.region, env.time, env), JSON.stringify(env));
    covered++;
  });
  assert.equal(covered, 32);
  assert.equal(stale, 18); // river, mountain and the countryside night still show the old leaf in production
});

test('rain, snow and petals are painted in all 320 conditions and nowhere else', () => {
  const seen = {rain:0, snow:0, petal:0};
  each(env => {
    const mood = atmosphere(env), kind = fallingKind(mood), r = withGradients(recorder());
    paintFalling(r.ctx, rect, env, mood, 12.3, {tier:0});
    const marks = r.calls.filter(([name]) => name === 'stroke' || name === 'drawImage').length;
    if (!kind) { assert.equal(marks, 0, JSON.stringify(env)); return; }
    seen[kind]++;
    const count = fallingCount(env, kind, 0);
    assert.ok(count === FX_COUNTS[kind][0] || env.region === 'home' || env.region === 'mountain', JSON.stringify(env));
    assert.ok(marks >= count, JSON.stringify(env));
  });
  assert.deepEqual(seen, {rain:160, snow:128, petal:32});
});

test('rain falls within four degrees of vertical and repeats exactly for a given clock', () => {
  const env = {region:'forest', time:'day', weather:'rain', season:'summer'}, mood = atmosphere(env);
  const run = seconds => { const r = recorder(); paintFalling(r.ctx, rect, env, mood, seconds, {tier:0}); return r.calls; };
  const calls = run(40), moves = calls.filter(([name]) => name === 'moveTo'), lines = calls.filter(([name]) => name === 'lineTo');
  assert.equal(moves.length, FX_COUNTS.rain[0] * 2);
  moves.forEach(([, x0, y0], i) => {
    const [, x1, y1] = lines[i], angle = Math.atan2(x1 - x0, y1 - y0) * 180 / Math.PI;
    assert.ok(angle >= 1 && angle <= 4, String(angle));
  });
  assert.deepEqual(run(40), calls);
  assert.notDeepEqual(run(40.5), calls);
});

test('rain rings cover the whole painted water and stay off the land', () => {
  assert.deepEqual(Object.keys(RAIN_WATER), ['sea','river_lake','jungle']);
  assert.ok(RAIN_WATER.sea.length >= 60 && RAIN_WATER.river_lake.length >= 60);
  // Sea rings span the surface from the horizon to the shallows and both sides.
  const xs = RAIN_WATER.sea.map(p => p[0]), ys = RAIN_WATER.sea.map(p => p[1]);
  assert.ok(Math.min(...xs) < .15 && Math.max(...xs) > .85 && Math.min(...ys) < .28 && Math.max(...ys) > .46);
  assert.ok(Math.min(...ys) > .244 && Math.max(...ys) < .59); // below the horizon, above the sand
  for (const [region, time] of [['sea','day'],['river_lake','night'],['jungle','evening']]) {
    const env = {region, time, weather:'rain', season:'summer'}, seen = new Set();
    for (let s = 0; s < 12; s += .25) {
      const r = recorder(); paintFalling(r.ctx, rect, env, atmosphere(env), s, {tier:0});
      for (const [name, x, y] of r.calls) if (name === 'ellipse') seen.add(Math.round(x / 40) + ':' + Math.round(y / 40));
    }
    assert.ok(seen.size >= (region === 'jungle' ? 8 : 40), region + ' ' + seen.size);
  }
  const dry = recorder(); const env = {region:'forest', time:'day', weather:'rain', season:'summer'};
  paintFalling(dry.ctx, rect, env, atmosphere(env), 3, {tier:0});
  assert.equal(dry.calls.filter(([name]) => name === 'ellipse').length, 0);
});

test('the indoor home shows weather only inside its window', () => {
  const env = {region:'home', time:'day', weather:'snow', season:'winter'}, r = withGradients(recorder());
  paintFalling(r.ctx, rect, env, atmosphere(env), 5, {tier:0});
  assert.ok(r.calls.some(([name]) => name === 'clip'));
  for (const [name, , x, y] of r.calls) if (name === 'drawImage')
    assert.ok(x > 1000 * (HOME_WINDOW.x0 - .06) && x < 1000 * (HOME_WINDOW.x1 + .06) && y > 1500 * .08 && y < 1500 * .34);
});

test('the living layer has a painter for all thirteen regions', () => {
  assert.deepEqual([...livingRegions].sort(), Object.keys(DAYPARTS).sort());
});

test('the proposal changes only how the backdrop is drawn', async () => {
  const {readFileSync} = await import('node:fs');
  const current = readFileSync(new URL('../../home-production-world.mjs', import.meta.url), 'utf8');
  const proposal = readFileSync(new URL('./proposal/home-production-world.mjs', import.meta.url), 'utf8');
  const slice = (text, from, to) => text.slice(text.indexOf(from), to ? text.indexOf(to) : undefined);
  // Walking area, projection, observation points, occlusion and teardown are byte-identical.
  for (const [from, to] of [[' function navigation(rect){', ' function draw('], [' return {pointIndependentOcclusion'],
    ['export function forestGroundCrop', 'export function createHomeWorld'], [' function setEnvironment(e)', ' function navigation(rect){']]) {
    assert.ok(slice(current, from, to).length > 100);
    assert.equal(slice(proposal, from, to), slice(current, from, to), from);
  }
});

test('maximum: fireflies each keep their own path, pace and rhythm', async () => {
  const {fireflyAt} = await import('./proposal/living/maximum.mjs');
  // `vx` is the fly's own movement between samples; a shared drift would show up as correlation.
  const track = i => Array.from({length:240}, (_, k) => {
    const now = fireflyAt('forest', i, k * .25), next = fireflyAt('forest', i, k * .25 + .25);
    return {...now, vx:next.x - now.x};
  });
  const flies = Array.from({length:16}, (_, i) => track(i));
  const corr = (a, b, key) => {
    const ma = a.reduce((n, p) => n + p[key], 0) / a.length, mb = b.reduce((n, p) => n + p[key], 0) / b.length;
    let top = 0, da = 0, db = 0;
    a.forEach((p, k) => { top += (p[key] - ma) * (b[k][key] - mb); da += (p[key] - ma) ** 2; db += (b[k][key] - mb) ** 2; });
    return top / Math.sqrt(da * db);
  };
  let worst = 0;
  for (let i = 0; i < 16; i++) for (let j = i + 1; j < 16; j++) worst = Math.max(worst, Math.abs(corr(flies[i], flies[j], 'vx')), Math.abs(corr(flies[i], flies[j], 'glow')));
  assert.ok(worst < .75, 'no two fireflies move or blink together: ' + worst);
  // They are never lit all at once and never all dark for long.
  const lit = Array.from({length:240}, (_, k) => flies.filter(f => f[k].glow > .3).length);
  assert.ok(Math.max(...lit) < 14 && lit.filter(n => n === 0).length < 12);
  for (const fly of flies) for (const p of fly) assert.ok(p.x > -150 && p.x < 1150 && p.y > 480 && p.y < 1320);
});

test('maximum: gusts rise and rest, come from both sides, and stars sit in the sky', async () => {
  const {gustAt, NIGHT_STARS} = await import('./proposal/living/maximum.mjs');
  const samples = Array.from({length:2400}, (_, k) => gustAt('countryside', k * .25));
  const calm = samples.filter(g => g.power === 0).length / samples.length;
  assert.ok(calm > .25 && calm < .7, String(calm));
  assert.ok(Math.max(...samples.map(g => g.power)) > .7);
  const sides = new Set(samples.filter(g => g.power > .2).map(g => g.direction));
  assert.deepEqual([...sides].sort(), [-1, 1]);
  assert.equal(gustAt('deepsea', 5).power, 0);
  assert.deepEqual(Object.keys(NIGHT_STARS), ['forest','river_lake','countryside','mountain','snow','sea','desert','memory_lake']);
  for (const stars of Object.values(NIGHT_STARS)) for (const [x, y] of stars) assert.ok(x > 0 && x < 1 && y > 0 && y < .34);
});

test('maximum keeps the particle counts of the standard version', () => {
  const env = {region:'sea', time:'day', weather:'rain', season:'summer'}, mood = atmosphere(env);
  const drops = lively => { const r = recorder(); paintFalling(r.ctx, rect, env, mood, 7, {tier:0, lively}); return r.calls.filter(([name]) => name === 'moveTo').length; };
  assert.equal(drops(true), drops(false));
});

test('final: plant sway is seamless, small, and strongest in the foreground', async () => {
  const {SWAY_SPOTS, swayOffset, FINAL_EFFECTS, paintSway} = await import('./proposal/living/final.mjs');
  assert.deepEqual(Object.keys(FINAL_EFFECTS).sort(), Object.keys(DAYPARTS).sort());
  // Every reused painter that cuts out and re-places plants or sky is switched off.
  for (const region of ['forest','river_lake','countryside','home','city','snow','memory_lake','mountain','jungle','desert'])
    assert.ok(FINAL_EFFECTS[region].canopy === false && FINAL_EFFECTS[region].deform === false, region);
  for (const [region, spots] of Object.entries(SWAY_SPOTS)) {
    spots.forEach((spot, i) => {
      const [x, y, rx, ry, near] = spot;
      assert.ok(x - rx > -60 && x + rx < 1060 && y - ry > -40 && y + ry < 1540 && near > 0 && near <= 1);
      let peak = 0;
      for (let s = 0; s < 120; s += .2) { const o = swayOffset(region, i, spot, s); peak = Math.max(peak, Math.hypot(o.dx, o.dy)); }
      // The centre never travels more than a third of the spot's radius: a stretch, not a tear.
      assert.ok(peak > .8 && peak < Math.min(rx, ry) / 3, `${region} ${i} ${peak}`);
    });
  }
  const far = SWAY_SPOTS.forest.find(spot => spot[4] < .35), near = SWAY_SPOTS.forest.find(spot => spot[4] > .95);
  const reach = spot => Math.max(...Array.from({length:300}, (_, k) => Math.abs(swayOffset('forest', 0, spot, k * .2).dx)));
  assert.ok(reach(near) > 1.6 * reach(far));
  // Cells at the rim of a spot do not move at all, so the spot joins the still painting.
  const r = recorder(), image = {naturalWidth:1024, naturalHeight:1536};
  paintSway(r.ctx, image, 'forest', 33);
  const draws = r.calls.filter(([name]) => name === 'drawImage');
  assert.ok(draws.length > 300);
  for (const [, , sx, sy, sw, sh, dx, dy] of draws) {
    const shift = Math.hypot(dx + .5 - sx / 1.024, dy + .5 - sy / 1.024);
    assert.ok(shift < 12, String(shift));
  }
});

test('final: the forest no longer draws the row of lights, and fireflies are the independent ones', async () => {
  const {drawForestE} = await import('./proposal/living/forest-e.mjs');
  const {FINAL_EFFECTS} = await import('./proposal/living/final.mjs');
  // The reused painter builds its glow brushes on a document canvas.
  globalThis.document = {createElement:() => ({getContext:() => withGradients(recorder()).ctx})};
  const marks = effects => {
    const r = withGradients(recorder());
    drawForestE(r.ctx, {region:'forest', time:'night', variant:'E3', width:1000, height:1500, seconds:70, opacity:1, strength:1,
      season:'summer', weather:'sunny', fallPlus:true, fall:{count:0, size:1, speed:1, wind:1}, effects});
    return r.calls.filter(([name]) => name === 'arc' || name === 'ellipse').length;
  };
  assert.ok(marks(undefined) > 10);          // C: fireflies and the procession
  assert.equal(marks(FINAL_EFFECTS.forest), 0);
});

test('rain rings draw at every particle setting, including the small jungle pond', () => {
  for (const region of ['sea','river_lake','jungle']) for (const tier of [0, 1, 2]) for (const lively of [false, true]) {
    const env = {region, time:'day', weather:'rain', season:'summer'}, r = recorder();
    for (let s = 0; s < 6; s += .5) paintFalling(r.ctx, rect, env, atmosphere(env), s, {tier, lively});
    assert.ok(r.calls.some(([name]) => name === 'ellipse'), `${region} ${tier}`);
  }
});

test('trees: leaves are told apart from sky, bark and the blue distance in every daypart', async () => {
  const {leafness} = await import('./proposal/living/foliage.mjs');
  // [r, g, b, daypart, is a leaf]
  const samples = [
    [120,200,60,'day',true], [150,215,80,'morning',true], [60,140,50,'day',true],
    [70,150,235,'day',false],   // sky
    [245,248,250,'day',false],  // cloud
    [95,70,50,'day',false],     // bark
    [70,120,140,'day',false],   // blue distance
    [150,150,150,'day',false],  // rock
    [150,170,70,'evening',true], [250,170,150,'evening',false], [70,50,40,'evening',false],
    [40,110,120,'night',true], [20,30,90,'night',false], [15,25,30,'night',false]
  ];
  for (const [r, g, b, time, leaf] of samples) {
    const value = leafness(r, g, b, time);
    assert.ok(leaf ? value > .6 : value < .12, `${r},${g},${b} ${time} → ${value}`);
  }
});

test('trees: boughs bend from their root, each on its own rhythm, and stay within a few degrees', async () => {
  const {FOLIAGE, boughWind, TREE_SWAYS} = await import('./proposal/living/final.mjs');
  assert.deepEqual([...TREE_SWAYS], ['bump','tips','branch','still','wide','vivid','tips2','tips3','rigid']);
  for (const [region, spots] of Object.entries(FOLIAGE)) for (const [cx, cy, rx, ry, near, px, py] of spots) {
    // The pivot is at or beside the spot's edge, never floating in the leaves' middle.
    assert.ok(Math.abs(px - cx) / rx > .55 || Math.abs(py - cy) / ry > .55, `${region} ${cx},${cy}`);
    assert.ok(near > 0 && near <= 1);
  }
  const forest = FOLIAGE.forest, series = forest.map((spot, i) => Array.from({length:400}, (_, k) => boughWind('forest', i, spot, k * .15).bend));
  const degrees = (bend, near) => bend * (.012 + .034 * near) * 180 / Math.PI;
  forest.forEach((spot, i) => {
    const peak = Math.max(...series[i].map(b => Math.abs(degrees(b, spot[4]))));
    assert.ok(peak > .25 && peak < 4.5, `${i} ${peak}`);
  });
  // Neighbouring boughs do not swing as one.
  const corr = (a, b) => { const ma = a.reduce((n, v) => n + v, 0) / a.length, mb = b.reduce((n, v) => n + v, 0) / b.length;
    let top = 0, da = 0, db = 0; a.forEach((v, k) => { top += (v - ma) * (b[k] - mb); da += (v - ma) ** 2; db += (b[k] - mb) ** 2; }); return top / Math.sqrt(da * db); };
  let together = 0;
  for (let i = 0; i < series.length; i++) for (let j = i + 1; j < series.length; j++) if (corr(series[i], series[j]) > .97) together++;
  assert.equal(together, 0);
});

test('trees: only the lifted leaf layer moves; the root of each bough stays put', async () => {
  const {paintFoliage, FOLIAGE} = await import('./proposal/living/final.mjs');
  // A painting that is all leaf, so every spot is lifted.
  const image = {naturalWidth:100, naturalHeight:150};
  globalThis.OffscreenCanvas = class {
    getContext() { const r = withGradients(recorder());
      r.ctx.getImageData = (x, y, w, h) => { const data = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < data.length; i += 4) { data[i] = 120; data[i + 1] = 200; data[i + 2] = 60; data[i + 3] = 255; } return {data, width:w, height:h}; };
      r.ctx.createImageData = (w, h) => ({data:new Uint8ClampedArray(w * h * 4), width:w, height:h});
      return r.ctx; }
  };
  const run = mode => { const r = recorder(); paintFoliage(r.ctx, image, 'forest', 'day', 21.4, mode, {}); return r.calls; };
  const still = run('still'), tips = run('tips'), branch = run('branch');
  assert.equal(still.filter(([name]) => name === 'rotate').length, 0);
  assert.ok(tips.filter(([name]) => name === 'rotate').every(([, angle]) => angle === 0));
  const angles = branch.filter(([name]) => name === 'rotate').map(([, angle]) => Math.abs(angle));
  assert.ok(Math.max(...angles) > .002 && Math.max(...angles) < .08);
  // In 'tips', the tile nearest each root barely moves while the farthest moves most.
  const draws = tips.filter(([name, , ...rest]) => name === 'drawImage' && rest.length === 8);
  assert.equal(draws.length, FOLIAGE.forest.length * 16);
});

test('trees (seamless): the shift is zero at every spot rim and grows smoothly from the bough root', async () => {
  const {FOLIAGE, FOLIAGE_WIDE, leafShift, boughWind} = await import('./proposal/living/final.mjs');
  const {rimWindow, SOFT_NODES} = await import('./proposal/living/foliage.mjs');
  assert.equal(rimWindow(0, 0), 1); assert.equal(rimWindow(1, 0), 0); assert.equal(rimWindow(.75, .75), 0);
  assert.ok(FOLIAGE_WIDE.forest.length >= FOLIAGE.forest.length + 12);
  const area = spots => spots.reduce((n, s) => n + Math.PI * s[2] * s[3], 0) / 1.5e6;
  assert.ok(area(FOLIAGE_WIDE.forest) > 1.7 * area(FOLIAGE.forest));
  const strong = {bend:1.5, flutter:1.6};
  for (const [region, spots] of Object.entries(FOLIAGE_WIDE)) spots.forEach((spot, i) => {
    const [cx, cy, rx, ry, , px, py] = spot;
    let worstStep = 0, peak = 0;
    for (let s = 0; s < 60; s += .7) {
      const wind = boughWind(region, i, spot, s, .95), grid = [];
      for (let b = 0; b < SOFT_NODES; b++) for (let a = 0; a < SOFT_NODES; a++) {
        const x = cx - rx + 2 * rx * a / (SOFT_NODES - 1), y = cy - ry + 2 * ry * b / (SOFT_NODES - 1);
        const shift = leafShift(spot, wind, s, i, x, y, strong);
        // Nodes on the edge of the spot never move: no square edge can appear.
        if (a === 0 || b === 0 || a === SOFT_NODES - 1 || b === SOFT_NODES - 1) assert.deepEqual(shift, {dx:0, dy:0});
        grid.push(shift); peak = Math.max(peak, Math.hypot(shift.dx, shift.dy));
      }
      for (let b = 0; b < SOFT_NODES; b++) for (let a = 0; a < SOFT_NODES - 1; a++) {
        const p = grid[b * SOFT_NODES + a], q = grid[b * SOFT_NODES + a + 1];
        worstStep = Math.max(worstStep, Math.hypot(p.dx - q.dx, p.dy - q.dy) / (2 * rx / (SOFT_NODES - 1)));
      }
    }
    // Even in strong wind at the strongest setting, neighbouring tiles differ by about a third of their spacing at most: a stretch, not a tear.
    assert.ok(worstStep < .36, `${region} ${i} step ${worstStep}`);
    assert.ok(peak < Math.min(rx, ry) * .4, `${region} ${i} peak ${peak}`);
    // The bough's own root does not move.
    const root = leafShift(spot, boughWind(region, i, spot, 12, .95), 12, i, px, py, strong);
    assert.ok(Math.hypot(root.dx, root.dy) < .01);
  });
});

test('trees (seamless): the soft tiles rebuild the leaf layer exactly, and work is spread over frames', async () => {
  const {separateFoliageSoft, SOFT_NODES} = await import('./proposal/living/foliage.mjs');
  const written = [];
  globalThis.OffscreenCanvas = class {
    constructor(w, h) { this.width = w; this.height = h; }
    getContext() { const r = withGradients(recorder()), canvas = this;
      r.ctx.getImageData = (x, y, w, h) => { const data = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < data.length; i += 4) { data[i] = 120; data[i + 1] = 200; data[i + 2] = 60; data[i + 3] = 255; } return {data, width:w, height:h}; };
      r.ctx.createImageData = (w, h) => ({data:new Uint8ClampedArray(w * h * 4), width:w, height:h});
      r.ctx.putImageData = image => { canvas.image = image; written.push(canvas); };
      return r.ctx; }
  };
  const image = {naturalWidth:1000, naturalHeight:1500}, spots = [[200,200,40,30,1,200,230],[600,300,40,30,1,600,330],[800,900,40,30,1,800,930]];
  const first = separateFoliageSoft(image, spots, 'day', {}, -1);
  assert.equal(first.filter(Boolean).length, 1); // one spot per call when the budget is spent
  separateFoliageSoft(image, spots, 'day', {}, -1);
  const parts = separateFoliageSoft(image, spots, 'day', {}, -1);
  assert.equal(parts.filter(Boolean).length, 3);
  const part = parts[0], sum = new Float32Array(part.width * part.height);
  assert.equal(part.tiles.length, SOFT_NODES * SOFT_NODES);
  for (const tile of part.tiles) if (tile) { const {data, width, height} = tile.canvas.image;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) sum[(tile.y + y) * part.width + tile.x + x] += data[4 * (y * width + x) + 3]; }
  // An all-leaf spot: the tile weights add back to full opacity everywhere (within rounding).
  for (const value of sum) assert.ok(Math.abs(value - 255) <= 3, String(value));
});

test('trees (B2–B4): leaf tips keep the pace and reach of B; B4 turns each bough without bending it', async () => {
  const {FOLIAGE, FOLIAGE_WIDE, leafShift, boughWind} = await import('./proposal/living/final.mjs');
  const tips = {bend:0, flutter:1.8, quick:true}, rigid = {bend:1, flutter:0, quick:true, rigid:true}, bendy = {bend:1, flutter:0};
  const spot = FOLIAGE.forest[0], [cx, cy, rx, ry, near, px, py] = spot;
  // B2/B3: with no wind bend at all, leaves still move (flutter only) and the root does not.
  let peak = 0;
  for (let s = 0; s < 40; s += .1) { const o = leafShift(spot, {bend:0, stir:1}, s, 0, cx, cy, tips); peak = Math.max(peak, Math.hypot(o.dx, o.dy)); }
  const reachB = 1.5 + 3.2 * near; // the amplitude of the original 'tips' at the far tip
  assert.ok(peak > .25 * reachB && peak <= 1.6 * reachB, `${peak} vs ${reachB}`);
  // The same flutter passes a point 2.3–3.8 times per 2π seconds, as in B.
  const crossings = (i, strength) => { let n = 0, last = 0; for (let s = 0; s < 62.8; s += .02) { const v = Math.sin(0) + leafShift(spot, {bend:0, stir:1}, s, i, cx, cy, strength).dy; if (last < 0 && v >= 0) n++; last = v; } return n / 10; };
  for (const i of [0, 1, 2, 3]) assert.ok(crossings(i, tips) > 2.6 && crossings(i, tips) < 5.4, String(crossings(i, tips)));
  // B4: inside the spot the shift is exactly a rotation about the bough's root — every point
  // turns by the same angle, so lengths and curves are preserved. C2's bend is not.
  const wind = {bend:.8, stir:1}, angleAt = (strength, x, y) => { const o = leafShift(spot, wind, 5, 0, x, y, strength);
    const r2 = (x - px) ** 2 + (y - py) ** 2; return (-(y - py) * o.dx + (x - px) * o.dy) / r2; };
  const points = [[cx, cy], [cx - rx * .3, cy], [cx + rx * .3, cy - ry * .2], [cx, cy + ry * .3]];
  const turns = points.map(([x, y]) => angleAt(rigid, x, y)), bends = points.map(([x, y]) => angleAt(bendy, x, y));
  assert.ok(Math.max(...turns) - Math.min(...turns) < 1e-9);
  assert.ok(Math.max(...bends) - Math.min(...bends) > 1e-4);
  // The turn stays small: under 1.7 degrees in the foreground even in strong wind.
  const degrees = Math.abs(angleAt(rigid, cx, cy) / .8) * 180 / Math.PI * 1.05;
  assert.ok(degrees > .4 && degrees < 1.7, String(degrees));
  assert.ok(FOLIAGE_WIDE.forest.length === 30 && FOLIAGE.forest.length === 16);
  void boughWind;
});

test('trees (B4): twigs travel with their leaves, trunks and thick boughs never do', async () => {
  const {thinBark, barklike} = await import('./proposal/living/foliage.mjs');
  assert.ok(barklike(60, 45, 35, 'day') && barklike(40, 38, 36, 'evening'));
  assert.ok(!barklike(120, 200, 60, 'day') && !barklike(70, 150, 235, 'day') && !barklike(15, 25, 80, 'night') && !barklike(200, 190, 180, 'day'));
  // A 40 × 30 patch with a 3-pixel twig and a 14-pixel trunk that runs off the bottom edge.
  const w = 40, h = 30, bark = new Uint8Array(w * h);
  for (let x = 4; x < 30; x++) for (let y = 6; y < 9; y++) bark[y * w + x] = 1;
  for (let x = 24; x < 38; x++) for (let y = 12; y < 30; y++) bark[y * w + x] = 1;
  const thin = thinBark(bark, w, h);
  let twig = 0, trunk = 0;
  for (let x = 4; x < 22; x++) for (let y = 6; y < 9; y++) twig += thin[y * w + x];
  for (let x = 28; x < 34; x++) for (let y = 18; y < 30; y++) trunk += thin[y * w + x];
  assert.equal(twig, 18 * 3);
  assert.equal(trunk, 0);
});
