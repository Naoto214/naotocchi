import test from 'node:test';
import assert from 'node:assert/strict';
import {createTerrainNavigation} from '../../home-route-navigation.mjs';
import productionModel from '../../home-production-model.js';

function mountainNavigation(rightEdge) {
  const nav = createTerrainNavigation({
    width: 320, height: 250, cell: 8,
    project: p => ({x: p.x, y: p.z}),
    unproject: p => ({x: p.x, y: 0, z: p.y}),
    walkable: p => p.x <= rightEdge
  });
  nav.intentAware = true;
  nav.intentScale = {x: 1, y: 1};
  return nav;
}

test('mountain navigation rebuild with the same projection rejects an obsolete walking route', () => {
  const model = productionModel.createModel({random: () => 0.5});
  const dog = {key: 'pet:dog', id: 'dog', kind: 'pet', x: 64, y: 160, w: 26, h: 30};
  const scene = {region: 'mountain', width: 320, height: 250, navigation: mountainNavigation(300)};
  model.sync([dog], scene);
  const goal = {x: 224, y: 160};
  assert.ok(model.move(dog.key, goal, 'keyboard'));
  assert.ok(model.snapshot()[0].target);

  const newNav = mountainNavigation(128);
  assert.deepEqual(newNav.unproject(goal), scene.navigation.unproject(goal));
  assert.ok(scene.navigation.valid(goal));
  assert.equal(newNav.valid(goal), false);
  model.sync([dog], {...scene, navigation: newNav});
  const after = model.snapshot()[0];
  assert.equal(after.target, null);
  assert.deepEqual(after.route, []);
  assert.ok(newNav.valid(after));
});
