import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readScene, regions, times} from '../home-cast-size-v2/shell-model.mjs';
import {readPopulationScene, sceneQuery, populationFrameURL, needsNewFrame} from './shell-model.mjs';

const read = values => readPopulationScene(new URLSearchParams(values), readScene);
const base = 'https://example.test/private/v4/';

test('cold and malformed links open a moving 28-resident river with B on the linear ramp', () => {
  const expected = {region:'river_lake', time:'day', count:28, variant:'B', layout:'fixed', curve:'linear', paused:false};
  assert.deepEqual(read({}), expected);
  for (const count of ['-1', '0', '2.3', '29', '0x14', '1e1']) {
    assert.deepEqual(read({count, variant:'Z', region:'bad', curve:'bad'}), expected);
  }
});

test('all counts, regions and dayparts reach the actual frame and survive a copy or reload', () => {
  for (let count = 1; count <= 28; count++) for (const [region] of regions) for (const [time] of times) {
    const scene = read({count, region, time, variant:'C', curve:'step', layout:'optimized', paused:'1'});
    assert.deepEqual(scene, {count, region, time, variant:'C', curve:'step', layout:'optimized', paused:true});
    assert.deepEqual(read(sceneQuery(scene)), scene);
    const frame = populationFrameURL(scene, base);
    assert.equal(frame.pathname, '/private/game/population.html');
    assert.equal(frame.searchParams.get('policy'), 'C');
    assert.equal(frame.searchParams.get('variant'), 'B');
    assert.equal(frame.searchParams.get('compareSplit'), '0');
    assert.equal(frame.searchParams.get('count'), String(count));
    assert.equal(frame.searchParams.get('region'), region);
    assert.equal(frame.searchParams.get('time'), time);
    assert.equal(frame.searchParams.get('paused'), '1');
    assert.equal(frame.searchParams.get('layout'), 'optimized');
    assert.equal(frame.searchParams.get('curve'), 'step');
  }
});

test('native policy links and ramp spelling select the same comparison', () => {
  for (const variant of ['current','A','B','C']) {
    assert.deepEqual(read({policy:variant, curve:'ramp'}), read({variant, curve:'linear'}));
    assert.equal(read({policy:variant}).variant, variant);
  }
});

test('fixed comparisons switch in place and size-specific openings reload when the candidate changes', () => {
  const scene = read({count:24});
  for (const patch of [{variant:'current'}, {variant:'C', time:'night'}, {curve:'step'}, {paused:true}]) {
    assert.equal(needsNewFrame(scene, {...scene, ...patch}), false);
  }
  for (const patch of [{count:25}, {region:'forest'}, {layout:'optimized'}]) {
    assert.equal(needsNewFrame(scene, {...scene, ...patch}), true);
  }
  const opening = {...scene, layout:'optimized'};
  for (const patch of [{variant:'A'}, {curve:'step'}]) {
    assert.equal(needsNewFrame(opening, {...opening, ...patch}), true);
  }
  assert.equal(needsNewFrame(opening, {...opening, time:'morning', paused:true}), false);
});

test('an uncatalogued expression sprite is measured from its own opaque pixels', async () => {
  const {alphaBounds} = await import('./shell-model.mjs');
  assert.equal(typeof alphaBounds, 'function');
  // A 4×2 decoded RGBA frame. Its drawing touches only (1,0) and (2,1).
  const pixels = new Uint8ClampedArray(4 * 2 * 4);
  pixels[(0 * 4 + 1) * 4 + 3] = 255;
  pixels[(1 * 4 + 2) * 4 + 3] = 255;
  assert.deepEqual(alphaBounds(pixels, 4, 2), [32, 0, 96, 128]);
  assert.equal(alphaBounds(new Uint8ClampedArray(32), 4, 2), null);
});
