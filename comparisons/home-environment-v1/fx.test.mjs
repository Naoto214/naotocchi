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
  for (const region of ['city','memory_lake','home']) assert.ok(usesAutumnLeaves(region, 'day', {season:'autumn', weather:'sunny'}), region);
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
  assert.deepEqual(Object.keys(NIGHT_STARS), ['home','forest','river_lake','countryside','mountain','snow','sea','desert','memory_lake']);
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

test('final (B2 everywhere): the forest is exactly as approved, other regions gain plants, still regions stay still', async () => {
  const {FOLIAGE, FOLIAGE_B2, b2Air, B2_AIR} = await import('./proposal/living/final.mjs');
  assert.deepEqual(FOLIAGE_B2.forest, FOLIAGE.forest);
  for (const time of ['morning','day','evening','night']) assert.equal(b2Air('forest', time), 1);
  assert.deepEqual(Object.fromEntries(Object.entries(FOLIAGE_B2).map(([region, spots]) => [region, spots.length])),
    {forest:16, river_lake:16, countryside:21, mountain:11, jungle:18, city:14, home:6, memory_lake:11, desert:2, star_stop:8});
  // Snow-laden trees, the sea and the deep sea have nothing that moves this way.
  for (const region of ['snow','sea','deepsea']) assert.equal(FOLIAGE_B2[region], undefined);
  // No spot is listed twice, every spot lies on the painting, and the mossy rock is gone.
  for (const [region, spots] of Object.entries(FOLIAGE_B2)) {
    assert.equal(new Set(spots.map(s => s[0] + ',' + s[1])).size, spots.length, region);
    for (const [cx, cy, rx, ry, near] of spots) assert.ok(cx > 0 && cx < 1000 && cy > 0 && cy < 1500 && rx >= 25 && ry >= 25 && near > 0 && near <= 1, region);
  }
  assert.ok(!FOLIAGE_B2.memory_lake.some(s => s[0] === 90 && s[1] === 1280));
  // Calmer air indoors, by the still lake and among the stars; livelier on the ridge and the dunes; quieter at night.
  assert.ok(B2_AIR.home < B2_AIR.star_stop && B2_AIR.star_stop < B2_AIR.memory_lake && B2_AIR.memory_lake < B2_AIR.city && B2_AIR.city < 1 && B2_AIR.mountain > 1 && B2_AIR.desert > 1);
  for (const region of ['countryside','city','jungle']) assert.ok(b2Air(region, 'night') < b2Air(region, 'evening') && b2Air(region, 'evening') < b2Air(region, 'day'));
});

test('final (B2 everywhere): leaf shapes come from the daylight painting; olive grass is told from sand and gravel', async () => {
  const {leafness} = await import('./proposal/living/foliage.mjs');
  const {daylightOf} = await import('./proposal/living/final.mjs');
  // Measured colours from the paintings: alpine meadow and dune grass move; sand, gravel and paving do not.
  assert.ok(leafness(108, 107, 59, 'dry') > .6 && leafness(163, 152, 97, 'dry') > .6);
  // The olive palette would also catch the countryside's brown path, so it is used only on the
  // mountain and in the desert; the ordinary palette leaves that path alone.
  assert.ok(leafness(155, 138, 83, 'day') < .12);
  for (const [r, g, b] of [[222,199,178],[227,200,162],[139,141,152]]) assert.ok(leafness(r, g, b, 'dry') < .12, `${r},${g},${b}`);
  // River and pond water read as leaf-green, which is why no spot may cover water.
  assert.ok(leafness(135, 192, 152, 'day') > .6);
  const {FOLIAGE_B2} = await import('./proposal/living/final.mjs');
  const overWater = (spot, box) => spot[0] + spot[2] > box[0] && spot[0] - spot[2] < box[1] && spot[1] + spot[3] > box[2] && spot[1] - spot[3] < box[3];
  for (const spot of FOLIAGE_B2.jungle) assert.ok(!overWater(spot, [330, 860, 640, 800]), 'jungle pond ' + spot);
  for (const spot of FOLIAGE_B2.river_lake) assert.ok(!overWater(spot, [330, 800, 420, 760]), 'river ' + spot);
  // The forest reads its own painting; a day painting is its own reference; others wait for daylight to load.
  const day = {src:'x/city-day.webp'}, night = {src:'x/city-night.webp'};
  assert.equal(daylightOf('forest', night, {}, 'x/forest-day.webp'), night);
  assert.equal(daylightOf('city', day, {}, 'x/city-day.webp'), day);
  class Picture { set src(value) { this.address = value; } }
  const doc = {defaultView:{Image:Picture}};
  assert.equal(daylightOf('city', night, doc, 'x/city-day.webp'), null);
  assert.equal(daylightOf('city', night, doc, 'x/city-day.webp'), null); // asked once, still loading
});

const REGIONS = Object.keys(DAYPARTS), TIMES = ['morning','day','evening','night'], WEATHERS = ['sunny','cloudy','rain','snow'], SEASONS = ['spring','summer','autumn','winter'];

test('layers: every one of the 832 scenes combines its effects by the stated rules', async () => {
  const {layersFor, STARRY, SEASONAL} = await import('./proposal/home-climate.mjs');
  assert.deepEqual(SEASONAL, {forest:1, countryside:1, river_lake:1, mountain:1, city:.85, memory_lake:.7, home:1});
  const seasonal = new Set(Object.keys(SEASONAL)), sealed = new Set(['deepsea','star_stop','memory_lake']);
  let both = 0;
  for (const region of REGIONS) for (const time of TIMES) for (const weather of WEATHERS) for (const season of SEASONS) {
    const env = {region, time, weather, season}, l = layersFor(env), where = JSON.stringify(env);
    // Rain and snow never fall together, and the ground's weather never reaches the sealed regions.
    assert.ok([null, 'rain', 'snow'].includes(l.precipitation), where);
    if (sealed.has(region)) assert.equal(l.precipitation, null, where);
    if (weather === 'snow' && (region === 'desert' || region === 'jungle')) assert.equal(l.precipitation, null, where);
    if (weather === 'rain' && !sealed.has(region)) assert.equal(l.precipitation, 'rain', where);
    // Petals in spring and leaves in autumn keep falling in rain or snow, as a small share.
    assert.equal(l.petals > 0, seasonal.has(region) && season === 'spring', where);
    assert.equal(l.leaves > 0, seasonal.has(region) && season === 'autumn', where);
    assert.ok(!(l.petals > 0 && l.leaves > 0), where);
    for (const share of [l.petals, l.leaves]) if (share > 0) assert.equal(share, SEASONAL[region] * (l.precipitation === 'rain' ? .35 : l.precipitation === 'snow' ? .25 : 1), where);
    if (l.precipitation && (l.petals > 0 || l.leaves > 0)) both++;
    assert.equal(l.rings, l.precipitation === 'rain' && ['sea','river_lake','jungle'].includes(region), where);
    // Stars and shooting stars: only at night, only under open sky, dimmer through cloud, gone in rain or snow.
    const open = time === 'night' && STARRY.has(region), sky = sealed.has(region) ? 'sunny' : weather;
    assert.equal(l.meteors, open ? (sky === 'sunny' ? 1 : sky === 'cloudy' ? .3 : 0) : 0, where);
    assert.equal(l.twinkle > 0, open && (sky === 'sunny' || sky === 'cloudy'), where);
    if (l.precipitation) assert.equal(l.fireflies && !sealed.has(region), false, where);
  }
  assert.equal(both, 6 * 4 * 2 * 2); // 6 regions with weather and seasons × 4 hours × rain/snow × spring/autumn
});

test('climate: wind and amounts hold, change smoothly, cover every level, and differ between visits', async () => {
  const {createClimate, WIND_LEVELS, DENSITY_LEVELS, levelName} = await import('./proposal/home-climate.mjs');
  const env = {region:'forest', time:'day', weather:'sunny', season:'autumn'}, climate = createClimate(1234);
  const wind = Array.from({length:36000}, (_, k) => climate.wind(k * .1, env)); // one hour, ten samples a second
  assert.ok(Math.min(...wind) > .15 && Math.max(...wind) < 1.7);
  // Never a jump: under 2% of full strength between samples a tenth of a second apart.
  for (let k = 1; k < wind.length; k++) assert.ok(Math.abs(wind[k] - wind[k - 1]) < .03, String(k));
  const seen = new Set(wind.map(v => levelName(v, WIND_LEVELS)));
  assert.deepEqual([...seen].sort(), ['calm','light','normal','strong']);
  // It keeps a tendency for a while: the level changes a few times a minute at most.
  let changes = 0;
  for (let k = 1; k < wind.length; k++) if (levelName(wind[k], WIND_LEVELS) !== levelName(wind[k - 1], WIND_LEVELS)) changes++;
  assert.ok(changes > 20 && changes < 420, String(changes));
  // A strong wind arrives faster than it leaves.
  let rise = 0, fall = 0;
  for (let k = 1; k < wind.length; k++) { const d = wind[k] - wind[k - 1]; if (d > .0015) rise++; else if (d < -.0015) fall++; }
  assert.ok(fall > 1.3 * rise, `${rise} ${fall}`);
  for (const kind of ['rain','snow','petal','leaf']) {
    const amount = Array.from({length:18000}, (_, k) => climate.density(kind, k * .2, env));
    for (let k = 1; k < amount.length; k++) assert.ok(Math.abs(amount[k] - amount[k - 1]) < .05, kind + k);
    assert.deepEqual([...new Set(amount.map(v => levelName(v, DENSITY_LEVELS)))].sort(), ['large','medium','small'], kind);
    assert.ok(Math.min(...amount) >= .38 && Math.max(...amount) <= 1.75, kind);
  }
  // Petals and leaves come loose in wind: more of them at a strong wind than in still air.
  const at = (w, kind) => { let sum = 0; for (let s = 0; s < 600; s += 3) sum += climate.density(kind, s, env, {wind:w}); return sum; };
  assert.ok(at(1.45, 'leaf') > 1.3 * at(.22, 'leaf') && at(1.45, 'petal') > 1.3 * at(.22, 'petal'));
  assert.equal(at(1.45, 'rain'), at(.22, 'rain'));
  // Another visit, another sequence; the same visit replays exactly.
  const other = createClimate(987), same = createClimate(1234);
  assert.ok(Array.from({length:600}, (_, k) => Math.abs(other.wind(k, env) - climate.wind(k, env))).reduce((a, b) => a + b) / 600 > .15);
  assert.equal(same.wind(321.5, env), climate.wind(321.5, env));
  // Pinned levels are honoured exactly.
  assert.equal(climate.wind(50, env, {wind:WIND_LEVELS.calm}), .22);
  assert.equal(climate.density('rain', 50, env, {density:DENSITY_LEVELS.large}), 1.45);
});

test('climate: measured weather sets rain, snow and wind; missing fields fall back instead of being invented', async () => {
  const {createClimate, fromMeasured} = await import('./proposal/home-climate.mjs');
  const env = {region:'sea', time:'day', weather:'rain', season:'summer'}, climate = createClimate(7);
  const mean = (f) => { let sum = 0; for (let s = 0; s < 900; s += 3) sum += f(s); return sum / 300; };
  const rain = mm => mean(s => climate.density('rain', s, env, {measured:{precipitation:mm}}));
  assert.ok(rain(.3) < .62 && rain(2.5) > .8 && rain(2.5) < 1.15 && rain(9) > 1.35);
  assert.ok(rain(.3) < rain(1) && rain(1) < rain(3) && rain(3) < rain(6));
  const snow = cm => mean(s => climate.density('snow', s, env, {measured:{snowfall:cm}}));
  assert.ok(snow(.2) < .65 && snow(3) > 1.35);
  const wind = (ms, gusts) => mean(s => climate.wind(s, env, {measured:{windSpeed:ms, windGusts:gusts}}));
  assert.ok(wind(.5) < .35 && wind(3) > .4 && wind(3) < .8 && wind(6) > .8 && wind(6) < 1.2 && wind(11) > 1.3);
  // Gusty air swings more widely around the same mean speed.
  const spread = gusts => { const v = Array.from({length:400}, (_, k) => climate.wind(k * 2, env, {measured:{windSpeed:5, windGusts:gusts}})); return Math.max(...v) - Math.min(...v); };
  assert.ok(spread(13) > 1.5 * spread(5));
  // Only what was measured is used: a wind reading leaves the rain to vary on its own, and nonsense is ignored.
  assert.equal(fromMeasured({windSpeed:4}).rain, null);
  assert.equal(fromMeasured({precipitation:-1, snowfall:NaN, windSpeed:'5'}).wind, null);
  assert.equal(fromMeasured(undefined), null);
  assert.equal(climate.density('rain', 40, env, {measured:{windSpeed:4}}), climate.density('rain', 40, env));
});

test('amounts: medium is exactly the approved count, and particles join or leave only between falls', async () => {
  const {layersFor} = await import('./proposal/home-climate.mjs');
  const env = {region:'forest', time:'day', weather:'rain', season:'summer'}, mood = atmosphere(env), layers = layersFor(env);
  const drops = share => { const r = recorder(); paintFalling(r.ctx, rect, env, mood, 40, {tier:0, layers, amount:() => share}); return r.calls.filter(([name]) => name === 'moveTo').length / 2; };
  assert.equal(drops(1), FX_COUNTS.rain[0]);
  assert.equal(drops(.55), Math.ceil(FX_COUNTS.rain[0] * .55));
  assert.equal(drops(1.45), Math.ceil(FX_COUNTS.rain[0] * 1.45));
  // When the amount drops suddenly, flakes already falling finish their fall.
  const snowEnv = {region:'snow', time:'day', weather:'snow', season:'winter'}, snowLayers = layersFor(snowEnv);
  const flakes = seconds => { const r = withGradients(recorder()); paintFalling(r.ctx, rect, snowEnv, atmosphere(snowEnv), seconds, {tier:0, layers:snowLayers, amount:(kind, born) => born < 100 ? 1.45 : .55}); return r.calls.filter(([name]) => name === 'drawImage').length; };
  const counts = [100.1, 103, 108, 115, 125].map(flakes);
  for (let k = 1; k < counts.length; k++) assert.ok(counts[k] <= counts[k - 1], counts.join());
  assert.ok(counts[0] > .9 * FX_COUNTS.snow[0] * 1.45 && counts[4] < FX_COUNTS.snow[0] * .7, counts.join());
  // Spring rain shows both rain and a few petals; neither appears where it should not.
  const spring = {region:'forest', time:'day', weather:'rain', season:'spring'}, r = withGradients(recorder());
  paintFalling(r.ctx, rect, spring, atmosphere(spring), 40, {tier:0, layers:layersFor(spring), amount:() => 1});
  const petals = r.calls.filter(([name]) => name === 'drawImage').length;
  assert.ok(petals >= 1 && petals <= Math.ceil(FX_COUNTS.petal[0] * .35));
  assert.equal(r.calls.filter(([name]) => name === 'moveTo').length / 2, FX_COUNTS.rain[0]);
});

test('shooting stars: under every open night sky, irregular, inside the sky, and never in the jungle or indoors', async () => {
  const {meteorLanes, meteorsAt, NIGHT_STARS} = await import('./proposal/living/maximum.mjs');
  const {STARRY} = await import('./proposal/home-climate.mjs');
  for (const region of STARRY) {
    const lanes = meteorLanes(region);
    assert.ok(lanes.length >= 4, region);
    const sky = NIGHT_STARS[region];
    for (const [from, to, length] of lanes) {
      assert.ok(to[1] > from[1] && length >= (region === 'home' ? 45 : 90) && length <= 330, region);
      // Through the window at home, both ends stay inside the window opening.
      if (region === 'home') for (const [x, y] of [from, to]) assert.ok(x > 280 && x < 565 && y > 180 && y < 260, 'home ' + x + ',' + y); // they fall, and stay short
      // Both ends are points of open sky; a long one also passes close to a third.
      if (sky && length > 150) { const mx = (from[0] + to[0]) / 2, my = (from[1] + to[1]) / 2;
        assert.ok(sky.some(([u, v]) => { const d = Math.hypot(u * 1000 - mx, v * 1500 - my); return d < 60 && d > 0; }), region); }
    }
    const starts = [], seen = new Set();
    let visible = 0, was = false;
    for (let s = 0; s < 7200; s += .1) { const now = meteorsAt(region, s, 1); if (now.length) { visible++; if (!was) { starts.push(s); seen.add(now[0].from.join() + '>' + now[0].to.join()); } } was = now.length > 0; }
    // Now and then: 20 to 60 an hour, on screen for a small part of the time, from many places.
    assert.ok(starts.length >= 40 && starts.length <= 160, region + starts.length);
    assert.ok(visible / 72000 < .04, region);
    assert.ok(seen.size >= Math.min(4, lanes.length), region);
    const gaps = starts.slice(1).map((s, k) => s - starts[k]);
    assert.ok(Math.max(...gaps) > 3 * Math.min(...gaps), region); // no steady beat
    assert.ok(meteorsAt(region, 500, 0).length === 0);
  }
  for (const region of ['jungle','deepsea','star_stop']) assert.equal(meteorLanes(region).length, 0, region);
  // Thin cloud lets far fewer through.
  const count = rate => { let n = 0, was = false; for (let s = 0; s < 7200; s += .2) { const on = meteorsAt('sea', s, rate).length > 0; if (on && !was) n++; was = on; } return n; };
  assert.ok(count(.3) < .5 * count(1));
});

test('measured weather: units, intervals, gaps and bad values from the weather service are handled', async () => {
  const {createRequire} = await import('node:module');
  const require = createRequire(import.meta.url), fs = require('node:fs'), link = require('./weather-link.cjs');
  const production = fs.readFileSync(new URL('../../world-environment.js', import.meta.url), 'utf8');
  const holder = {exports:{}};
  new Function('module', 'globalThis', link.environment(production))(holder, {});
  const {weatherFromResponse, measuredFromResponse} = holder.exports, now = 1700000000;
  // One request, more fields, wind asked for in m/s.
  assert.ok(link.environment(production).includes("current: 'weather_code,precipitation,snowfall,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover', wind_speed_unit: 'ms'"));
  assert.equal(link.environment(production).split('api.open-meteo.com').length, production.split('api.open-meteo.com').length);
  const read = (current, units = {}) => weatherFromResponse({current:{time:now, weather_code:61, ...current}, current_units:units}, new Date(now * 1000));
  // 0.5 mm in a 15-minute interval is 2 mm/h; snow likewise; wind passes through.
  assert.deepEqual(read({interval:900, precipitation:.5, snowfall:.1, wind_speed_10m:4.2, wind_gusts_10m:9, wind_direction_10m:200}, {precipitation:'mm', snowfall:'cm', wind_speed_10m:'m/s', wind_gusts_10m:'m/s'}).measured,
    {precipitation:2, snowfall:.4, windSpeed:4.2, windGusts:9, windDirection:200, cloudCover:null});
  // No interval reported: the value is taken as an hourly total.
  assert.equal(read({precipitation:3}).measured.precipitation, 3);
  // Other units are converted; an unknown unit is not trusted.
  assert.ok(Math.abs(read({wind_speed_10m:36}, {wind_speed_10m:'km/h'}).measured.windSpeed - 10) < 1e-9);
  assert.ok(Math.abs(read({precipitation:.1, interval:3600}, {precipitation:'inch'}).measured.precipitation - 2.54) < 1e-9);
  assert.equal(read({wind_speed_10m:5, precipitation:1}, {wind_speed_10m:'furlongs'}).measured.windSpeed, null);
  // Missing, negative, non-numeric and absurd readings become null, field by field.
  const odd = read({precipitation:-1, snowfall:'2', wind_speed_10m:900, wind_gusts_10m:3, wind_direction_10m:720, interval:900});
  assert.equal(odd.measured, null);
  const part = read({wind_speed_10m:6, wind_gusts_10m:2, precipitation:null});
  assert.deepEqual(part.measured, {precipitation:null, snowfall:null, windSpeed:6, windGusts:null, windDirection:null, cloudCover:null});
  assert.equal(read({}).measured, null);
  assert.equal(read({}).mode, 'rain'); // the sky itself is still reported as before
  assert.equal(measuredFromResponse(null), null);
  // The home receives the values only with observed weather.
  const script = link.script(fs.readFileSync(new URL('../../script.js', import.meta.url), 'utf8'));
  assert.ok(script.includes("source: 'observed', conditions: observed.measured || null") && script.includes('if (w.conditions) environment.conditions = w.conditions;'));
});

test('seasons: only leaves change colour, conifers stay green, and untouched regions get the painting back', async () => {
  const {seasonTone, seasonalPainting, SEASON_PLANTS, TINT_LEVELS} = await import('./proposal/living/seasons.mjs');
  assert.deepEqual(Object.keys(SEASON_PLANTS).sort(), ['city','countryside','forest','home','memory_lake','mountain','river_lake']);
  assert.deepEqual(TINT_LEVELS, {none:0, gentle:.45, clear:1});
  const plants = SEASON_PLANTS.forest, leaf = [120, 200, 60], fir = [40, 92, 66];
  const lum = ([r, g, b]) => .3 * r + .59 * g + .11 * b;
  // Autumn: broadleaf trees turn warm (red leads green or nearly), across several different hues.
  const hues = new Set();
  for (let x = .05; x < 1; x += .05) for (let y = .05; y < .4; y += .07) {
    const t = seasonTone('autumn', ...leaf, leaf, x, y, plants, 1, 'day', 7);
    assert.ok(t[3] > .3 && t[3] <= 1);
    hues.add(t[0] > t[1] * 1.5 ? 'red' : t[0] > t[1] * 1.15 ? 'orange' : t[0] > t[1] ? 'yellow' : 'green');
    // Shade is kept: a darker pixel of the same leaf stays darker by the same ratio.
    const dark = seasonTone('autumn', 60, 100, 30, leaf, x, y, plants, 1, 'day', 7);
    assert.ok(Math.abs(lum(dark) / lum(t) - .5) < .06);
  }
  assert.ok(hues.size >= 3, [...hues].join());
  // Conifers keep their green in autumn and winter.
  for (const season of ['autumn','winter']) assert.ok(seasonTone(season, ...fir, fir, .5, .2, plants, 1, 'day', 7)[3] < .12, season);
  // Winter grass goes to straw; spring is lighter, summer deeper; gentle is under half of clear; night is quieter than day.
  const straw = seasonTone('winter', ...leaf, leaf, .5, .9, plants, 1, 'day', 7);
  assert.ok(straw[0] > straw[2] * 1.2 && Math.abs(straw[0] - straw[1]) < 40 && straw[3] > .5);
  assert.ok(lum(seasonTone('spring', ...leaf, leaf, .5, .2, plants, 1, 'day', 7)) > lum(leaf) && lum(seasonTone('summer', ...leaf, leaf, .5, .2, plants, 1, 'day', 7)) < lum(leaf));
  assert.ok(seasonTone('autumn', ...leaf, leaf, .5, .9, plants, .45, 'day', 7)[3] < .5 * seasonTone('autumn', ...leaf, leaf, .5, .9, plants, 1, 'day', 7)[3] + .01);
  assert.ok(seasonTone('autumn', ...leaf, leaf, .5, .2, plants, 1, 'night', 7)[3] < seasonTone('autumn', ...leaf, leaf, .5, .2, plants, 1, 'day', 7)[3]);
  // A painting of sky, water, bark, rock and one leaf: only the leaf pixel is recoloured.
  const colours = [[70,150,235],[20,120,190],[95,70,50],[150,150,150],[245,248,250],[120,200,60]];
  const image = {naturalWidth:12, naturalHeight:2, src:'x/forest-day.webp'};
  let veil = null;
  globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; }
    getContext() { const r = withGradients(recorder()), canvas = this;
      r.ctx.getImageData = (x, y, w, h) => { const data = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) { const c = colours[i % colours.length]; data.set([...c, 255], 4 * i); } return {data, width:w, height:h}; };
      r.ctx.putImageData = picture => { veil = picture; canvas.veil = picture; };
      return r.ctx; } };
  const out = seasonalPainting(image, {region:'forest', time:'day', season:'autumn', strength:1, doc:{}});
  assert.notEqual(out, image);
  assert.equal(out.src, image.src);
  for (let i = 0; i < 6; i++) assert.equal(veil.data[4 * i + 3] > 0, i === 5, 'pixel ' + i);
  // Strength 0 and regions without turning plants return the very same painting.
  assert.equal(seasonalPainting(image, {region:'forest', time:'day', season:'autumn', strength:0, doc:{}}), image);
  for (const region of ['jungle','desert','snow','sea','deepsea','star_stop']) assert.equal(seasonalPainting({...image}, {region, time:'day', season:'autumn', strength:1, doc:{}}).src, image.src);
  assert.equal(seasonalPainting(image, {region:'jungle', time:'day', season:'autumn', strength:1, doc:{}}), image);
  // At home only the window opening is considered.
  assert.deepEqual(SEASON_PLANTS.home.box, [.27, .57, .115, .31]);
});

test('seasons (far): distant hills turn, water and sky never do, and evergreen regions change only slightly', async () => {
  const {seasonTone, farFoliage, SEASON_PLANTS, SUBTLE_PLANTS, TINT_CHOICES} = await import('./proposal/living/seasons.mjs');
  assert.deepEqual(TINT_CHOICES.wide, {strength:1, far:true});
  // Hazy far woods count as foliage; sky, cloud, snow and grey rock do not.
  assert.ok(farFoliage(70, 120, 140) > .4 && farFoliage(60, 130, 120) > .8);
  for (const [r, g, b] of [[70,150,235],[245,248,250],[150,150,150],[20,120,190],[95,70,50]]) assert.ok(farFoliage(r, g, b) < .1, `${r},${g},${b}`);
  // The far zone always ends above the painted water.
  for (const [region, top] of [['river_lake', Math.min(...RAIN_WATER.river_lake.map(p => p[1]))], ['memory_lake', .31], ['countryside', .33]])
    assert.ok(SEASON_PLANTS[region].far + .03 <= top + .02, region);
  assert.equal(SEASON_PLANTS.city.far, undefined);
  // A bluish far hillside stays green up close (conifer) but turns in the distance.
  const hill = [60, 120, 110], plants = SEASON_PLANTS.river_lake;
  let near = 0, far = 0;
  for (let x = .05; x < 1; x += .1) { near += seasonTone('autumn', ...hill, hill, x, .15, plants, 1, 'day', 5, 0)[3]; far += seasonTone('autumn', ...hill, hill, x, .15, plants, 1, 'day', 5, 1)[3]; }
  assert.ok(far > 3 * near && far / 10 > .3, `${near} ${far}`);
  // Jungle, snow country and desert: never red, and only a slight shift.
  assert.deepEqual(Object.keys(SUBTLE_PLANTS), ['jungle','star_stop','snow','desert']);
  for (const [region, plantsOf] of Object.entries(SUBTLE_PLANTS)) for (const season of ['spring','summer','autumn','winter']) {
    const t = seasonTone(season, 60, 150, 70, [60, 150, 70], .5, .5, plantsOf, 1, 'day', 3);
    assert.ok(t[3] <= .51, region + season);
    assert.ok(t[0] < t[1] * 1.25, region + season); // still green or straw, never orange or red
  }
});

test('clouds: only over open sky, shaped not flat, more under grey weather, measured cover used for dry skies only', async () => {
  const {SKY, cloudDensity, cloudVeil} = await import('./proposal/living/clouds.mjs');
  const {findSky, SKY_W, SKY_H} = await import('./proposal/living/skyline.mjs');
  const {createClimate} = await import('./proposal/home-climate.mjs');
  assert.deepEqual(Object.keys(SKY).sort(), ['city','countryside','desert','forest','home','memory_lake','mountain','river_lake','sea','snow']);
  assert.deepEqual(SKY.home.box, [.275, .565]);
  // A test painting: smooth blue sky, a pale painted cloud, then a far ridge painted in almost
  // the sky's own blue but with brushwork, then green land. The ridge must not count as sky.
  const data = new Uint8ClampedArray(SKY_W * SKY_H * 4);
  for (let y = 0; y < SKY_H; y++) for (let x = 0; x < SKY_W; x++) {
    const k = 4 * (y * SKY_W + x), ridge = 30 + Math.round(8 * Math.sin(x / 9));
    const c = y < 12 && x > 40 && x < 90 ? [240, 244, 250] : y < ridge ? [85, 155, 239] : y < 52 ? ((x + y) % 2 ? [70, 120, 190] : [120, 175, 235]) : [90, 160, 70];
    data.set([...c, 255], k);
  }
  const {line, mask} = findSky(data, 'countryside');
  let gap = 0;
  for (let x = 6; x < SKY_W - 6; x++) { const ridge = 30 + 8 * Math.sin(x / 9); assert.ok(line[x] <= ridge + 3, `${x} ${line[x]} ${ridge}`); gap += ridge - line[x]; }
  assert.ok(gap / (SKY_W - 12) < 12, String(gap)); // and it stays close to the ridge
  let land = 0; for (let y = 54; y < SKY_H; y++) for (let x = 0; x < SKY_W; x++) land += mask[y * SKY_W + x];
  assert.equal(land, 0);
  // Nor does any cloud reach more than a few rows into the ridge.
  let ridgeCover = 0; for (let y = 42; y < 54; y++) for (let x = 0; x < SKY_W; x++) ridgeCover += mask[y * SKY_W + x] > 0 ? 1 : 0;
  assert.ok(ridgeCover < SKY_W * 12 * .05, String(ridgeCover));
  assert.ok(mask[5 * SKY_W + 60] > 200 && mask[8 * SKY_W + 150] > 200); // painted cloud and blue sky both take new cloud
  // Shape: at half cover part of the sky is clear and part is thick, and neighbours differ.
  const at = (cover, t = 50) => Array.from({length:400}, (_, k) => cloudDensity((k % 20) / 20, Math.floor(k / 20) / 20, t, cover, 1));
  const half = at(.5), clear = half.filter(v => v < .05).length, thick = half.filter(v => v > .8).length;
  assert.ok(clear > 60 && thick > 40, `${clear} ${thick}`);
  // Overcast still has light and dark: the cloud is thicker in places than in others... and never a hole.
  const over = at(1); assert.ok(Math.min(...over) > .5);
  const veils = Array.from({length:200}, (_, k) => cloudVeil('sea', 50 + (k % 20) * 45, 20 + Math.floor(k / 20) * 30, 80, .5));
  assert.ok(Math.max(...veils) > .8 && Math.min(...veils) < .1); // stars show in the gaps and vanish behind cloud
  assert.equal(cloudVeil('jungle', 500, 100, 80, .9), 0);
  // The shape drifts and slowly changes.
  const later = at(.5, 110); let moved = 0; half.forEach((v, k) => { moved += Math.abs(v - later[k]); });
  assert.ok(moved / 400 > .1);
  const climate = createClimate(5), mean = (weather, o) => { let s = 0; for (let t = 0; t < 3000; t += 10) s += climate.cloud(t, {weather}, o); return s / 300; };
  assert.ok(mean('sunny') < .3 && mean('cloudy') > .65 && mean('rain') > .7 && mean('snow') > .68, [mean('sunny'), mean('cloudy'), mean('rain'), mean('snow')].join());
  assert.ok(mean('sunny', {measured:{cloudCover:80}}) > .7 && mean('sunny', {measured:{cloudCover:5}}) < .08);
  assert.ok(mean('rain', {measured:{cloudCover:5}}) > .55); // rain always has cloud to fall from
  assert.equal(climate.cloud(9, {weather:'sunny'}, {measured:{cloudCover:400}}), climate.cloud(9, {weather:'sunny'}));
  assert.equal(climate.cloud(9, {weather:'sunny'}, {cloud:.5}), .5);
  let jump = 0; for (let t = 1; t < 3000; t++) jump = Math.max(jump, Math.abs(climate.cloud(t, {weather:'cloudy'}) - climate.cloud(t - 1, {weather:'cloudy'})));
  assert.ok(jump < .05);
});

test('one two-layer sky, many faces: cover, brightness, thickness, size and ground light vary on their own', async () => {
  const {createClimate} = await import('./proposal/home-climate.mjs');
  const {cloudTone, cloudDensity, cloudVeil} = await import('./proposal/living/clouds.mjs');
  const range = (weather, key, o = {}) => { let lo = 9, hi = -9; for (let seed = 1; seed < 9; seed++) { const c = createClimate(seed * 977); for (let t = 0; t < 6000; t += 20) { const v = c.sky(t, {weather}, o)[key]; lo = Math.min(lo, v); hi = Math.max(hi, v); } } return [lo, hi]; };
  // A fine day runs from nearly clear to large clouds, always white.
  assert.ok(range('sunny', 'cover')[0] < .06 && range('sunny', 'cover')[1] > .4);
  assert.deepEqual(range('sunny', 'bright'), [1, 1]);
  // Rain is not always dark, nor always overcast; nor is snow or a grey day.
  const [rainLo, rainHi] = range('rain', 'bright'); assert.ok(rainLo < .2 && rainHi > .8, `${rainLo} ${rainHi}`);
  assert.ok(range('rain', 'cover')[0] < .65 && range('rain', 'cover')[1] > .97);
  assert.ok(range('snow', 'bright')[0] >= .3 && range('snow', 'bright')[1] > .9);
  assert.ok(range('cloudy', 'bright')[0] < .45 && range('cloudy', 'bright')[1] > .9);
  // Heavy measured rain leans darker without fixing the tone; measured cover is the base.
  assert.ok(range('rain', 'bright', {measured:{precipitation:12}})[1] > .5);
  assert.ok(range('rain', 'bright', {measured:{precipitation:12}})[1] < rainHi);
  // The ground is as painted under a clear sky, dimmer under dark overcast, and brightens in gaps.
  assert.ok(range('sunny', 'light')[0] > .85);
  const [dim, lit] = range('cloudy', 'light'); assert.ok(dim < .6 && lit > .9, `${dim} ${lit}`);
  // Every value is a number in range and none of them steps.
  const c = createClimate(31); let jump = 0, prev = null;
  for (let t = 0; t < 4000; t++) { const k = c.sky(t, {weather:'rain'}); for (const key of ['cover','bright','thick','light']) { assert.ok(k[key] >= 0 && k[key] <= 1, key); if (prev) jump = Math.max(jump, Math.abs(k[key] - prev[key])); } assert.ok(k.size > .7 && k.size < 1.4); prev = k; }
  assert.ok(jump < .06, String(jump));
  // A pinned face is used as given.
  const pinned = c.sky(5, {weather:'rain'}, {sky:{cover:.6, bright:.8, thick:.9, size:1}});
  assert.deepEqual([pinned.cover, pinned.bright, pinned.thick, pinned.size], [.6, .8, .9, 1]);
  // Tone: bright cloud is white by day, gold at dusk, moonlit blue at night; dark cloud is slate.
  const [dayLit] = cloudTone('day', 1), [duskLit] = cloudTone('evening', 1), [nightLit] = cloudTone('night', 1), [slate] = cloudTone('day', 0);
  assert.ok(dayLit[0] > 250 && dayLit[2] > 250 && duskLit[0] > duskLit[2] + 60 && nightLit[2] > nightLit[0] + 40 && slate[0] < 190);
  // Size and wind travel change the same field; thin cloud hides fewer stars.
  const sum = look => { let v = 0; for (let k = 0; k < 50; k++) v += cloudDensity(k / 50, .4, 50, .5, 1, look) * (k + 1); return v; };
  assert.ok(sum(null) !== sum({size:1.3}) && sum(null) !== sum({travel:400}));
  let thickSum = 0, thinSum = 0; for (let k = 0; k < 100; k++) { thickSum += cloudVeil('sea', 40 + k * 9, 100, 80, .7, {thick:1}); thinSum += cloudVeil('sea', 40 + k * 9, 100, 80, .7, {thick:.2}); }
  assert.ok(thinSum < thickSum * .8);
});

test('season art: a dedicated painting is used when listed, and recolouring otherwise', async () => {
  const {seasonArt, loadSeasonArt, SEASON_ART} = await import('./proposal/home-season-art.mjs');
  assert.equal(seasonArt('forest', 'day', 'autumn'), null); // none yet: every scene is recoloured
  assert.deepEqual(SEASON_ART, {});
  const table = {forest:{day:{autumn:'comparisons/seasons-v1/autumn/forest-day.webp'}}};
  assert.equal(seasonArt('forest', 'day', 'autumn', table), 'comparisons/seasons-v1/autumn/forest-day.webp');
  assert.equal(seasonArt('forest', 'night', 'autumn', table), null);
  // The name still ends in <region>-<hour>.webp, which is how the painters know the scene.
  assert.ok(/\/([a-z_]+)-(morning|day|evening|night)\.webp$/.test(table.forest.day.autumn));
  class Picture { set src(value) { this.address = value; } }
  const doc = {defaultView:{Image:Picture}};
  assert.equal(loadSeasonArt('x/forest-day.webp', doc), null); // loading: the recoloured painting shows meanwhile
  assert.equal(loadSeasonArt('x/forest-day.webp', doc), null);
});
