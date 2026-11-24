import {test} from 'node:test';
import assert from 'node:assert/strict';
import {regions, times, counts, readScene} from '../home-cast-size-v2/shell-model.mjs';
import {readLimitScene, limitFrameURL, needsNewFrame, rolePercentages, projectedBody, extras, layouts} from './shell-model.mjs';

test('an empty link opens moving residents at the V2 reference size in the forest', () => {
  assert.deepEqual(readLimitScene(new URLSearchParams(), readScene),
    {region:'forest', time:'day', count:28, paused:false, extra:0, layout:'fixed', seatExtra:null});
  const invalid = readLimitScene(new URLSearchParams('extra=-5&count=900&layout=all'), readScene);
  assert.deepEqual([invalid.extra, invalid.count, invalid.layout], [0, 28, 'fixed']);
});

test('all scene, scale and seating links round-trip to the native trial', () => {
  for (const [region] of regions) for (const [time] of times) for (const count of counts) {
    for (const extra of extras) for (const layout of layouts) {
      const query = new URLSearchParams({region, time, count, extra, layout, paused:1});
      const scene = readLimitScene(query, readScene);
      assert.deepEqual(scene, {region, time, count, extra, layout, paused:true, seatExtra:null});
      const frame = limitFrameURL(scene, 'https://example.test/preview/v3/');
      assert.equal(frame.pathname, '/preview/game/limit.html');
      for (const [key, value] of query) assert.equal(frame.searchParams.get(key), value);
      assert.equal(frame.searchParams.get('variant'), 'B');
      assert.equal(frame.searchParams.get('compareSplit'), '0');
    }
  }
});

test('fixed comparisons and daypart or pause changes keep the active cast', () => {
  const scene = readLimitScene(new URLSearchParams(), readScene);
  assert.equal(needsNewFrame(scene, {...scene, extra:20, time:'night', paused:true}), false);
  for (const patch of [{region:'city'}, {count:4}, {layout:'optimized'}]) {
    assert.equal(needsNewFrame(scene, {...scene, ...patch}), true);
  }
  const optimized = {...scene, layout:'optimized'};
  assert.equal(needsNewFrame(optimized, {...optimized, extra:15}), true);
  assert.equal(needsNewFrame(optimized, {...optimized, time:'morning', paused:true}), false);
});

test('role labels use the V2 percentages as the baseline and keep fractional precision', () => {
  assert.deepEqual(extras.map(rolePercentages),
    [[120,120,105], [126,126,110.25], [132,132,115.5], [138,138,120.75], [144,144,126]]);
  assert.deepEqual(projectedBody({width:64, height:96}, [16,8,112,120]), [48,84]);
});

test('a pinned opening round-trips at every gain, including a reoptimized layout with V2 body sizes', () => {
  for (const seatExtra of extras) {
    for (const extra of extras) {
      const args = new URLSearchParams({region:'forest',count:28,extra,layout:'optimized',seatExtra,paused:1});
      const scene = readLimitScene(args,readScene);
      assert.equal(scene.seatExtra,seatExtra);
      assert.equal(scene.extra,extra);
      assert.equal(limitFrameURL(scene,'https://example.test/v3/').searchParams.get('extra'),String(seatExtra));
      assert.equal(needsNewFrame(scene,{...scene,extra:0}),false);
      assert.equal(needsNewFrame(scene,{...scene,seatExtra:null}),extra !== seatExtra);
    }
  }
  for (const query of ['layout=fixed&seatExtra=20','layout=optimized&seatExtra=17','layout=optimized&seatExtra=']) {
    assert.equal(readLimitScene(new URLSearchParams(query),readScene).seatExtra,null);
  }
});
