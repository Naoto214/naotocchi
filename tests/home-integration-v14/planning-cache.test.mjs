import assert from 'node:assert/strict';
import test from 'node:test';
import {createTerrainNavigation} from '../../home-route-navigation.mjs';
import model from '../../home-production-model.js';

const bounds = {left: 0, right: 128, top: 0, bottom: 128};
const start = {x: 8, y: 8};
const wanted = {x: 120, y: 8};

// A polygon wall forces a search with hundreds of grid edges. A second,
// independent moving obstacle closes and reopens the passage on the next call.
test('static edge geometry is reused while each search sees the current obstacle', () => {
  let edges = 0, gateOpen = true;
  const navigation = createTerrainNavigation({width: 128, height: 128, cell: 8,
    project: p => p, unproject: p => ({...p, z: 0}), staticGeometry: true,
    walkable: p => !(p.x > 55 && p.x < 73 && p.y < 64),
    segmentWalkable(a,b) {
      if (Math.hypot(a.x-b.x, a.y-b.y) <= 12 && a.x % 8 === 0 && a.y % 8 === 0 && b.x % 8 === 0 && b.y % 8 === 0) edges++;
      return true;
    },
  });
  const obstacle = p => gateOpen || Math.abs(p.x-64)>4;
  const first = navigation.route(start, wanted, bounds, obstacle);
  assert.ok(first.length > 1);
  const initial = edges;
  assert.deepEqual(navigation.route(start, wanted, bounds, obstacle), first);
  assert.ok(edges-initial < 20, `revalidated ${edges-initial} neighbor segments`);
  gateOpen = false;
  // A solid stripe wider than the 3px predicate sampling interval.
  assert.deepEqual(navigation.route(start, wanted, bounds, obstacle), []);
  gateOpen = true;
  assert.deepEqual(navigation.route(start, wanted, bounds, obstacle), first);
});

test('each accepted planning call takes a fresh synchronous visibility snapshot', () => {
  let snapshots = 0, permits = true;
  const scene = {width: 128, height: 128, region: 'home', actorBounds: () => bounds,
    visible: () => permits,
    planVisibility() { snapshots++; const allow = permits; return () => allow; },
  };
  const m = model.createModel({random: () => .5});
  m.sync([{kind:'pet', key:'pet:lead', ...start, w:8, h:8}], scene);
  assert.ok(m.move('pet:lead', wanted, 'ambient'));
  m.cancel(); permits = false;
  assert.equal(m.move('pet:lead', wanted, 'ambient'), false);
  assert.equal(snapshots, 2);
});
