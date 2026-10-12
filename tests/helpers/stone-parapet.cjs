const assert = require('node:assert/strict');

// Test the assembled guard walls, not the height of a single component.
module.exports = function assertStoneParapets(bridge) {
  const deck = bridge.parts.find(p => p.shape === 'slab');
  assert.ok(deck, bridge.id + ': stone deck');
  const ang = bridge.crossing.pathAng;
  const walls = bridge.parts.filter(p => p.shape === 'box' && p.y >= 6).map(p => ({
    ...p,
    along: (p.dx || 0) * Math.sin(ang) + (p.dz || 0) * Math.cos(ang),
    side: (p.dx || 0) * Math.cos(ang) - (p.dz || 0) * Math.sin(ang)
  }));
  for (const sign of [-1, 1]) {
    const side = walls.filter(p => Math.sign(p.side) === sign);
    assert.ok(side.length, bridge.id + ': both parapets present');
    for (const p of side) {
      assert.equal(p.ang, ang, 'parapet follows crossing');
      assert.ok(Math.abs(Math.abs(p.side) - (deck.w / 2 + 3)) < 1e-8, 'outside deck');
    }
    const base = side.filter(p => p.y === 6 && p.h >= 13)
      .sort((a, b) => a.along - a.rx - (b.along - b.rx));
    let end = -deck.len / 2;
    for (const p of base) {
      assert.ok(p.along - p.rx <= end + 1e-8, 'no gap in supporting wall');
      end = Math.max(end, p.along + p.rx);
    }
    assert.ok(end >= deck.len / 2 - 1e-8, 'wall reaches both bridge ends');
    const coping = side.filter(p => p.y > 6 && p.y + p.h === 22);
    assert.ok(coping.length >= 2, 'segmented coping retains original top height');
    for (const p of coping) assert.ok(base.some(q =>
      q.y + q.h === p.y && p.along - p.rx >= q.along - q.rx - 1e-8 &&
      p.along + p.rx <= q.along + q.rx + 1e-8), 'coping rests on wall');
  }
};
