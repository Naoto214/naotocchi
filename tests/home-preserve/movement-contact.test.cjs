const assert = require('node:assert/strict');
const test = require('node:test');
const { createModel } = require('../../home-production-model.js');

// With equal 10px sprites the normalized contact ellipse has radii 20 and 17.6.
// Constrain only the peer to its existing seat, as on a crowded painted path.
function walk(x, y, toward = 150) {
  const model = createModel({ random: () => .5 });
  const pet = { key: 'pet', kind: 'pet', x, y, w: 10, h: 10 };
  const peer = { ...pet, key: 'friend', kind: 'companion', x: 100, y: 140 };
  model.sync([pet, peer], { width: 240, height: 200, region: 'forest',
    visible: (p, a) => a.key !== peer.key || (p.x === peer.x && p.y === peer.y) });
  const [start, seatedPeer] = model.snapshot();
  assert.deepEqual([start.x, start.y, seatedPeer.x, seatedPeer.y], [x, y, 100, 140]);
  assert.ok(model.move('pet', { x: toward, y }));
  model.step(.1, { autonomy: false });
  return model.snapshot()[0].x;
}

test('a 4.2px movement step cannot skim through a peer with two clear endpoints', () => {
  assert.equal(walk(98, 157.55), 98);
});

test('a cramped start cannot cut deeper on the way to a clearer endpoint', () => {
  assert.equal(walk(99, 157.5), 99);
});

test('continuous escape and a path clear of the ellipse still advance', () => {
  assert.ok(walk(101, 157.5) > 101);
  assert.ok(walk(98, 157.61) > 98);
});
