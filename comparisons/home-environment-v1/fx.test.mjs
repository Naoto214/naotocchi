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
