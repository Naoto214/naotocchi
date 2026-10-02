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

test('VQ-3 outer-bank variation leaves water lanes and triangle topology unchanged', async () => {
  const { streamStripData } = await mod();
  const pts = [0, 80, 160, 240].map(z => ({x:0,z,w:50}));
  const lanes = [{s:-1,a:1,b:75,y:'g',c:[.4,.6,.3]}, {s:-1,a:.88,b:0,y:-9,c:[.3,.7,.8]}, {s:1,a:.88,b:0,y:-9,c:[.3,.7,.8]}];
  const base = streamStripData(pts, lanes, () => 2);
  const rough = streamStripData(pts, lanes.map((p,i)=>({...p,edgeVariation:i===0?10:0})), () => 2);
  assert.deepEqual(rough.index,base.index);
  assert.ok(rough.positions.some((n,i)=>n!==base.positions[i]), 'bank contour changes');
  for(let i=0;i<pts.length;i++) for(let j=3;j<9;j++) assert.equal(rough.positions[i*9+j],base.positions[i*9+j], 'water unchanged');
  for(let i=0;i<pts.length;i++) assert.ok(Math.abs(rough.positions[i*9]-base.positions[i*9])<=10);
});

// 2026-10-03 review regression: collision hashes alone do not protect a player
// walking beneath an oversized eave. Main roofs must keep the existing clearance.
test('VQ-4 residential main roofs retain above-head clearance with canonical colliders', () => {
  const { harness } = require('./helpers/runtime-harness.cjs');
  const h = harness({ deterministic:true, fullDisplay:true, pinDate:true });
  const M = h.api.meguruMod, reg = M.buildRegistry(); let checked = 0;
  for (const rid of Object.keys(M.REGION3D)) {
    const world = M.buildWorld(rid, reg, { world3d:true });
    for (const ob of M.worldObjects3d(world).objects) {
      if (ob.type !== 'house') continue;
      const body = ob.parts.find(p => p.family);
      if (!body || !['cottage','single','farmhouse','cabin'].includes(body.family)) continue;
      const roof = ob.parts.find(p => p.shape === 'roof' || p.shape === 'gable');
      assert.ok(roof && roof.y >= M.OBJ3D_HEAD, ob.id + ': oversized main roof below player head');
      checked++;
    }
  }
  assert.ok(checked > 50, 'covers generated residential houses across regions');
});
