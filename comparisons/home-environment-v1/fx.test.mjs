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
