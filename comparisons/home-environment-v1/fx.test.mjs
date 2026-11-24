import test from 'node:test';
import assert from 'node:assert/strict';
import {DAYPARTS, atmosphere} from '../../home-dayparts.mjs';
import {usesAutumnLeaves as currentLeaves} from '../../home-autumn-leaves.mjs';
import {usesAutumnLeaves} from './proposal/home-autumn-leaves.mjs';
import {fxMarkup, FX_COUNTS} from './proposal/home-atmosphere-fx.mjs';

const each = visit => { for (const region of Object.keys(DAYPARTS)) for (const time of ['morning','day','evening','night'])
  for (const weather of ['sunny','cloudy','rain','snow']) for (const season of ['spring','summer','autumn','winter']) visit({region, time, weather, season}); };

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

test('rain, snow and petals come from the new layer in all 320 conditions', () => {
  const seen = {rain:0, snow:0, petal:0};
  each(env => {
    const mood = atmosphere(env), html = fxMarkup(env, mood, {tier:0});
    if (!(mood.particle in seen)) return;
    seen[mood.particle]++;
    const count = html.match(/class="hfx /g).length, full = FX_COUNTS[mood.particle][0];
    assert.ok(count === full || count < full && (env.region === 'home' || env.region === 'mountain'), JSON.stringify(env));
    assert.equal(fxMarkup(env, mood, {reducedMotion:true}), '');
  });
  assert.deepEqual(seen, {rain:160, snow:128, petal:32});
});

test('rain stays within four degrees of vertical and is stable between renders', () => {
  const env = {region:'sea', time:'day', weather:'rain', season:'summer'}, html = fxMarkup(env, atmosphere(env));
  const tilts = [...html.matchAll(/--tilt:(-?[\d.]+)deg/g)].map(m => Math.abs(Number(m[1])));
  assert.equal(tilts.length, FX_COUNTS.rain[0]);
  assert.ok(Math.max(...tilts) <= 4 && Math.min(...tilts) >= 1);
  assert.equal(html, fxMarkup(env, atmosphere(env)));
  assert.equal(html.match(/hfx-ripple/g).length, 8);
});

test('the deep sea and star scenes keep their own drifting lights', () => {
  for (const region of ['deepsea','star_stop','memory_lake'])
    assert.equal(fxMarkup({region}, atmosphere({region, weather:'rain', season:'autumn', time:'day'})), null);
});
