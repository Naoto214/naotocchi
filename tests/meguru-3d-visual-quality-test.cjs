// 2026-10-02: world-only contact shading. Catch missing grounding, unbounded
// canopy shadows, rotated buildings and accidental actor/water participation.
const test = require('node:test');
const assert = require('node:assert/strict');
const mod = () => import('../meguru-3d.mjs');
test('VQ-1 contact footprints follow trunks and foundations without mutating objects', async () => {
  const { contactFootprints } = await mod();
  assert.equal(typeof contactFootprints, 'function');
  const objects = [{ type: 'broadleaf', x: 20, z: 30, parts: [
    { shape: 'trunk', r: 12, h: 180, y: 0 },
    { shape: 'crown', r: 100, y: 180, dx: 30, dz: -10 }
  ] }, { type: 'house', x: -30, z: 40, parts: [
    { shape: 'box', rx: 40, rz: 20, h: 80, y: 0, ang: Math.PI / 2 }
  ] }];
  const before = JSON.stringify(objects), f = contactFootprints(objects);
  assert.equal(JSON.stringify(objects), before);
  assert.ok(f.some(p => p.x === 20 && p.z === 30 && p.rx >= 12 && p.rx < 40));
  assert.ok(f.some(p => p.x === 50 && p.z === 20 && p.rx > 60 && p.rx <= 130));
  assert.ok(f.some(p => p.x === -30 && p.z === 40 && p.angle === Math.PI / 2));
  assert.ok(f.every(p => p.strength > 0 && p.strength <= 0.28));
});
test('VQ-2 contact field excludes actors, water, bridges and tiny dressing; finite bounded support', async () => {
  const { contactFootprints } = await mod();
  assert.equal(typeof contactFootprints, 'function');
  const excluded = ['actor','water','bridge','ford','dressing','decal'];
  assert.deepEqual(contactFootprints(excluded.map(type => ({type,x:0,z:0,parts:[{shape:'box',rx:30,rz:30,h:50,y:0}]}))), []);
  const f = contactFootprints([{type:'bigtree',x:1,z:2,parts:[{shape:'trunk',r:300,h:1500,y:0},{shape:'crown',r:1500,y:1700}]}]);
  assert.ok(f.length > 0 && f.every(p => Number.isFinite(p.rx) && p.rx <= 240 && p.rz <= 240));
});
