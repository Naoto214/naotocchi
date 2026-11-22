import assert from 'node:assert/strict';
import test from 'node:test';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';

const folder = process.env.MOBILITY_V10_DIST;
const root = 'https://private.test/v11/';
const moduleText = readFileSync(new URL('./shell-model.mjs', import.meta.url), 'utf8')
  .replace('../v10/shell-model.mjs', pathToFileURL(resolve(folder, 'v10/shell-model.mjs')).href);
const {readScene, sceneQuery, gameURL, offersSeats} = await import('data:text/javascript,' + encodeURIComponent(moduleText));

test('opening always uses a real native game and starts with the requested 28 residents', () => {
  const scene = readScene(new URLSearchParams());
  assert.equal(scene.arm, 'v11');
  assert.equal(scene.count, 28);
  assert.equal(scene.region, 'forest');
  assert.equal(scene.variant, 'full');
  const url = gameURL(scene, root);
  assert.equal(url.pathname, '/game/mobility-v11-compare-v11.html');
  assert.equal(url.searchParams.get('trialSeed'), '214');
  assert.equal(url.searchParams.get('paused'), '1');
});

test('the two opening arrangements and all three V11 policies remain independently selectable', () => {
  for (const [arm, variant, reference] of [
    ['v9', 'full','v9-seats'], ['v10','foot','v10-reference'],
    ['v11','foot','v11-foot-reference'], ['v11','full','v11-reference'],
    ['v11','after','v11-after-reference'],
  ]) {
    const query = new URLSearchParams({arm,variant,seats:'reference',region:'forest',count:'28',time:'night',seed:'937'});
    const scene = readScene(query);
    assert.equal(scene.variant,variant);
    assert.deepEqual(readScene(sceneQuery(scene)), scene);
    const url = gameURL(scene,root);
    assert.equal(url.pathname,'/game/mobility-v11-compare-'+reference+'.html');
    assert.equal(url.searchParams.get('time'),'night');
    assert.equal(url.searchParams.get('trialSeed'),'937');
    assert.equal(url.searchParams.get('footLog'),'1');
  }
});

test('two-resident seating never leaks to a different population or terrain', () => {
  for (const [region,count] of [['home',28],['forest',27]]) {
    const scene = readScene(new URLSearchParams({arm:'v11',seats:'reference',region,count}));
    assert.equal(offersSeats(scene),false);
    assert.equal(gameURL(scene,root).pathname,'/game/mobility-v11-compare-v11.html');
  }
});

test('post-refusal walks stay independently selectable on original seats and every terrain', () => {
  for (const region of ['forest','river_lake','home']) {
    const scene = readScene(new URLSearchParams({arm:'v11',variant:'after',region,count:4,seats:'reference'}));
    const url = gameURL(scene,root);
    assert.equal(url.pathname,'/game/mobility-v11-compare-v11-after.html');
    assert.equal(url.searchParams.get('region'),region);
    assert.equal(readScene(sceneQuery(scene)).variant,'after');
  }
});
