// 2026-10-02: world-only contact shading. Catch missing grounding, unbounded
// canopy shadows, rotated buildings and accidental actor/water participation.
const test = require('node:test');
const assert = require('node:assert/strict');
const mod = () => import('../meguru-3d.mjs');
test('VQ-6 cottage rooflines include both gable orientations within the residential family', () => {
  const { harness } = require('./helpers/runtime-harness.cjs');
  const M = harness({deterministic:true, fullDisplay:true}).api.meguruMod;
  const objects = M.worldObjects3d(M.buildWorld('home',M.buildRegistry(),{world3d:true})).objects;
  const directions = new Set();
  for (const o of objects.filter(o => o.parts.some(p => p.family === 'cottage'))) {
    const roof = o.parts.find(p => p.shape === 'gable');
    directions.add(Math.round((roof.ang - (o.collision.ang || 0)) / (Math.PI/2)));
  }
  assert.ok(directions.has(0) && directions.has(1), 'both rooflines must actually occur in generated cottages');
});
test('VQ-5 garden stepping stones connect the actual front door to its finite road segment', () => {
  const { harness } = require('./helpers/runtime-harness.cjs');
  const M = harness({ deterministic:true, fullDisplay:true, pinDate:true }).api.meguruMod;
  const world = M.buildWorld('home', M.buildRegistry(), {world3d:true});
  const objects = M.worldObjects3d(world).objects; let routes = 0;
  for (const garden of objects.filter(o => o.garden)) {
    const house = objects.find(o => garden.id === 'home:garden:' + o.id);
    const door = house.parts.find(p => p.door);
    const origin = {x:house.x + door.dx, z:house.z + door.dz};
    const np = M.nearestPath(origin, world), a = house.collision.ang || 0;
    for (const stone of garden.parts.filter(p => p.shape === 'stone')) {
      const dx = garden.x + stone.dx - origin.x, dz = garden.z + stone.dz - origin.z;
      assert.ok(dx * Math.cos(a) - dz * Math.sin(a) > 0, house.id + ': route goes behind front door');
      const vx = np.seg.b.x - np.seg.a.x, vz = np.seg.b.z - np.seg.a.z;
      const t = Math.max(0, Math.min(1, ((origin.x-np.seg.a.x)*vx+(origin.z-np.seg.a.z)*vz)/(vx*vx+vz*vz)));
      const tx = np.seg.a.x + vx*t - origin.x, tz = np.seg.a.z + vz*t - origin.z;
      assert.ok(Math.abs(dx*tz-dz*tx)/Math.hypot(tx,tz) < 0.001, house.id + ': stones drift from actual door');
      assert.ok(!M.collidesAt(world,garden.x+stone.dx,garden.z+stone.dz,10));
      for (const plant of [...garden.parts,...house.parts].filter(p => (p.y || 0) <= 7 && (p.shape === 'flower' || (p.shape === 'crown' && p.small)))) {
        assert.ok(Math.hypot(plant.dx-stone.dx,plant.dz-stone.dz) >= plant.r+12, house.id + ': planting covers entrance stones');
      }
      routes++;
    }
  }
  assert.ok(routes >= 8, 'retains useful entrance routes');
});
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

// 2026-10-04: clipping individual flowers leaves incomplete boxes at road edges.
// A bed must move as one group or be omitted as one group, never lose its contents.
test('VQ-7 garden beds retain their planting group outside canonical road and obstacle footprints', () => {
  const { harness } = require('./helpers/runtime-harness.cjs');
  const M = harness({deterministic:true,fullDisplay:true,pinDate:true}).api.meguruMod;
  const world = M.buildWorld('home',M.buildRegistry(),{world3d:true});
  const objects = M.worldObjects3d(world).objects;
  let beds = 0;
  for (const garden of objects.filter(o => o.garden)) {
    for (const bed of garden.parts.filter(p => p.shape === 'box' && p.h === 8 && p.y === 0)) {
      const flowers = garden.parts.filter(p => p.shape === 'flower' && Math.hypot(p.dx-bed.dx,p.dz-bed.dz) < 30);
      assert.equal(flowers.length,5,garden.id + ': incomplete planting group');
      const a = bed.ang || 0;
      for (const f of [-bed.rz,0,bed.rz]) for (const s of [-bed.rx,0,bed.rx]) {
        const x = garden.x+bed.dx+Math.cos(a)*f+Math.sin(a)*s;
        const z = garden.z+bed.dz-Math.sin(a)*f+Math.cos(a)*s;
        const np = M.nearestPath({x,z},world);
        assert.ok(!np || np.dist >= np.half+10,garden.id + ': bed footprint enters road');
        assert.ok(!M.collidesAt(world,x,z,10),garden.id + ': bed footprint enters obstacle');
      }
      beds++;
    }
  }
  assert.ok(beds > 0,'real generated flower beds remain');
  for (const id of ['home:15','home:45','home:64']) {
    const garden = objects.find(o => o.id === 'home:garden:' + id);
    assert.ok(garden && garden.parts.some(p => p.shape === 'box' && p.h === 8),id + ': affected garden must retain a complete bed');
  }
});
