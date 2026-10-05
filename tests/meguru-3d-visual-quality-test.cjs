// 2026-10-02: world-only contact shading. Catch missing grounding, unbounded
// canopy shadows, rotated buildings and accidental actor/water participation.
const test = require('node:test');
const assert = require('node:assert/strict');
const mod = () => import('../meguru-3d.mjs');
// Catch disconnected porch supports and below-head roofs outside canonical lots.
test('VQ-9 residential porch supports meet roof slopes within canonical lots', () => {
  const { harness } = require('./helpers/runtime-harness.cjs');
  const M = harness({deterministic:true,fullDisplay:true,pinDate:true}).api.meguruMod;
  const reg=M.buildRegistry(), count={};
  for (const rid of ['home','city','countryside','forest','jungle','sea','river_lake','mountain','snow','desert','memory_lake','deepsea','star_stop']) {
    for (const ob of M.worldObjects3d(M.buildWorld(rid,reg,{world3d:true})).objects) {
      const body=ob.parts.find(p=>['cottage','single','cabin'].includes(p.family));
      if (!body || !ob.collision) continue;
      const roof=ob.parts.find(p=>p.shape==='gable' && p.y===66);
      if (!roof) continue;
      const posts=ob.parts.filter(p=>p.shape==='wpost'), a=roof.ang||0;
      assert.equal(posts.length,2,ob.id+': two supports');
      for (const p of posts) {
        const f=(p.dx-roof.dx)*Math.cos(a)-(p.dz-roof.dz)*Math.sin(a);
        const side=(p.dx-roof.dx)*Math.sin(a)+(p.dz-roof.dz)*Math.cos(a);
        assert.ok(Math.abs(f)+p.r<=roof.rz+1e-8 && Math.abs(side)+p.r<=roof.rx+1e-8,ob.id+': post footprint under roof');
        const y=roof.y+roof.h*(1-Math.abs(f)/roof.rz);
        assert.ok(Math.abs((p.y||0)+p.h-y)<1e-8,ob.id+': support meets slope');
      }
      for (const f of [-roof.rz,roof.rz]) for (const s of [-roof.rx,roof.rx]) {
        const x=roof.dx+Math.cos(a)*f+Math.sin(a)*s, z=roof.dz-Math.sin(a)*f+Math.cos(a)*s;
        assert.ok(Math.abs(x*Math.cos(a)-z*Math.sin(a))<=ob.collision.hd+1e-8 && Math.abs(x*Math.sin(a)+z*Math.cos(a))<=ob.collision.hw+1e-8,ob.id+': low roof within collider');
      }
      count[body.family]=(count[body.family]||0)+1;
    }
  }
  for (const f of ['cottage','single','cabin']) assert.ok(count[f]>0,f+' coverage');
});
// 2026-10-04: freestanding veranda posts read as poles, not a sheltered entrance.
// A supported canopy must stay over the existing deck, without expanding its footprint.
test('VQ-8 farmhouse veranda posts meet a canopy contained over the existing deck', () => {
  const { harness } = require('./helpers/runtime-harness.cjs');
  const M = harness({deterministic:true,fullDisplay:true,pinDate:true}).api.meguruMod;
  const objects = M.worldObjects3d(M.buildWorld('countryside',M.buildRegistry(),{world3d:true})).objects;
  let checked = 0;
  for (const ob of objects.filter(o => o.parts.some(p => p.family === 'farmhouse'))) {
    const deck = ob.parts.find(p => p.shape === 'box' && p.solidBox && p.y === 0 && p.h === 16);
    assert.ok(deck, ob.id + ': veranda deck');
    const posts = ob.parts.filter(p => p.shape === 'wpost');
    const a = deck.ang || 0, local = p => ({f:(p.dx-deck.dx)*Math.cos(a)-(p.dz-deck.dz)*Math.sin(a),s:(p.dx-deck.dx)*Math.sin(a)+(p.dz-deck.dz)*Math.cos(a)});
    const roof = ob.parts.find(p => p.shape === 'gable' && p.y > deck.h && p.y < M.OBJ3D_HEAD && Math.abs(local(p).f) <= deck.rz && Math.abs(local(p).s) <= deck.rx);
    assert.ok(roof, ob.id + ': veranda posts have no canopy');
    const c = local(roof);
    assert.ok(Math.abs(c.f)+roof.rz <= deck.rz+1e-8 && Math.abs(c.s)+roof.rx <= deck.rx+1e-8,ob.id + ': canopy expands deck footprint');
    // This low roof must remain entirely inside the canonical lot, unlike a low step.
    for (const f of [-roof.rz,roof.rz]) for (const s of [-roof.rx,roof.rx]) {
      const x = roof.dx+Math.cos(a)*f+Math.sin(a)*s, z = roof.dz-Math.sin(a)*f+Math.cos(a)*s;
      assert.ok(Math.abs(x*Math.cos(a)-z*Math.sin(a)) <= ob.collision.hd+1e-8 && Math.abs(x*Math.sin(a)+z*Math.cos(a)) <= ob.collision.hw+1e-8,ob.id + ': low roof beyond collider');
    }
    assert.ok(posts.length >= 2,ob.id + ': supported at both ends');
    for (const post of posts) {
      const p = local(post);
      // Gable has no underside: its slope, not its base plane, must meet the post.
      const surfaceY = roof.y+roof.h*(1-Math.abs(p.f-c.f)/roof.rz);
      assert.ok(Math.abs((post.y||0)+post.h-surfaceY) < 1e-8,ob.id + ': disconnected post top');
      assert.ok(Math.abs(p.f-c.f)+post.r <= roof.rz+1e-8 && Math.abs(p.s-c.s)+post.r <= roof.rx+1e-8,ob.id + ': post outside canopy');
    }
    checked++;
  }
  assert.ok(checked > 20,'covers generated farmhouses across the countryside');
});
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

// A narrow ordinary-house door on a barn loses its agricultural silhouette.
test('VQ-10 barn entrances read as broad paired doors within the wall', () => {
  const {harness}=require('./helpers/runtime-harness.cjs');
  const M=harness({deterministic:true,fullDisplay:true,pinDate:true}).api.meguruMod;
  let n=0;
  for (const o of M.worldObjects3d(M.buildWorld('countryside',M.buildRegistry(),{world3d:true})).objects) {
    const wall=o.parts.find(p=>p.family==='barn'); if(!wall) continue;
    const door=o.parts.find(p=>p.door);
    assert.ok(door.rx>=wall.rx*0.45,o.id+': broad agricultural doorway');
    assert.ok(door.rx+4<=wall.rx,o.id+': frame within wall');
    const a=wall.ang||0;
    const seam=o.parts.find(p=>p.shape==='box' && p.h===door.h && p.rx<=1.5 && p.y===0 && Math.abs((p.dx-door.dx)*Math.sin(a)+(p.dz-door.dz)*Math.cos(a))<1e-8);
    assert.ok(seam,o.id+': visible centre meeting of two leaves');
    n++;
  }
  assert.ok(n>0,'generated barn coverage');
});

// Exercise the production descriptor-to-instance branch without requiring WebGL.
// Losing part.y in any of stem / petals / centre must fail independently.
test('VQ-11 flower instances retain planter and window-box elevation', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname,'../meguru-3d.mjs'),'utf8');
  const branch = src.match(/case 'flower':([\s\S]*?)break;/)[1];
  const emit = new Function('pt','push','px','pz','t','TAU',branch);
  for (const [part, want] of [
    [{shape:'flower',y:7,h:18,r:11,color:'#ffffff'},[7,25,26.5]],
    [{shape:'flower',y:54,h:2,r:7,color:'#f2a6c0'},[54,56,57.5]],
    [{shape:'flower',h:24,r:14,color:'#ffffff'},[0,24,25.5]]
  ]) {
    const got=[], before=JSON.stringify(part);
    emit(part,(shape,instance)=>got.push({shape,...instance}),20,-30,0.5,Math.PI*2);
    assert.deepEqual(got.map(p=>p.y),want,'all flower components share the declared base');
    assert.deepEqual(got.map(p=>p.shape),['blade','petal','nut8']);
    assert.ok(got.every(p=>p.x===20 && p.z===-30));
    assert.equal(got[0].sy,part.h);
    assert.equal(got[1].sx,part.r);
    const ground=[];
    emit({...part,y:0},(shape,instance)=>ground.push({shape,...instance}),20,-30,0.5,Math.PI*2);
    assert.deepEqual(got.map(({y,...p})=>p),ground.map(({y,...p})=>p),'elevation must not alter scale, rotation, material or count');
    assert.equal(JSON.stringify(part),before,'descriptor remains immutable');
  }
});

// Reduced shop/cafe props must have a readable open counter, not a solid shed.
test('VQ-12 walkable market stalls have open counters and connected canopy supports', () => {
  const M=require('./helpers/runtime-harness.cjs').harness({deterministic:true,fullDisplay:true,pinDate:true}).api.meguruMod;
  const reg=M.buildRegistry(); let checked=0;
  for (const rid of Object.keys(M.WORLDS)) for (const o of M.worldObjects3d(M.buildWorld(rid,reg,{world3d:true})).objects) {
    if (o.type!=='boxprop' || o.collision || !['🏪','☕'].includes(o.kind)) continue;
    const roof=o.parts.find(p=>p.shape==='wslab');
    assert.ok(roof,o.id+': canopy');
    const counter=o.parts.find(p=>p.shape==='box' && p.y===0);
    assert.ok(counter && counter.h < roof.y*0.6,o.id+': counter leaves an open serving space');
    const posts=o.parts.filter(p=>p.shape==='wpost');
    assert.equal(posts.length,4,o.id+': four canopy corners supported');
    const a=roof.ang||0;
    for(const p of posts) {
      assert.ok(Math.abs(p.y+p.h-roof.y)<1e-8,o.id+': support reaches canopy');
      const f=p.dx*Math.cos(a)-p.dz*Math.sin(a), s=p.dx*Math.sin(a)+p.dz*Math.cos(a);
      assert.ok(Math.abs(f)+p.r<=counter.rz+1e-8 && Math.abs(s)+p.r<=counter.rx+1e-8,o.id+': support remains in original footprint');
    }
    assert.ok(o.walkable && !o.solid,o.id+': existing soft-prop role');
    checked++;
  }
  assert.equal(checked,6,'all six canonical city stalls covered');
});

// Ground planting must frame the veranda rather than grow through its floor.
test('VQ-13 representative farmhouse flowers clear the veranda as one planting group', () => {
  const M = require('./helpers/runtime-harness.cjs').harness({deterministic:true,fullDisplay:true,pinDate:true}).api.meguruMod;
  const w = M.buildWorld('countryside',M.buildRegistry(),{world3d:true});
  const ob = M.worldObjects3d(w).objects.find(o=>o.id==='countryside:0');
  const deck = ob.parts.find(p=>p.shape==='box' && p.solidBox && p.y===0 && p.h===16);
  const flowers = ob.parts.filter(p=>p.shape==='flower' && !p.y);
  assert.equal(flowers.length,3);
  for (const p of flowers) {
    const x=p.dx-deck.dx,z=p.dz-deck.dz,a=deck.ang||0;
    const f=x*Math.cos(a)-z*Math.sin(a),s=x*Math.sin(a)+z*Math.cos(a);
    assert.ok(Math.hypot(Math.max(0,Math.abs(f)-deck.rz),Math.max(0,Math.abs(s)-deck.rx)) >= p.r+2-1e-8,'flower footprint clears deck');
    assert.ok(!M.collidesAt(w,ob.x+p.dx,ob.z+p.dz,p.r),'planting stays outside canonical collision');
    const np=M.nearestPath({x:ob.x+p.dx,z:ob.z+p.dz},w);
    assert.ok(!np || np.dist>=np.half+p.r+4,'road remains clear');
  }
});

test('VQ-14 planting clearance preserves groups, rotations and blocked plots', () => {
  const src=require('node:fs').readFileSync('meguru.js','utf8');
  const body=src.slice(src.indexOf('    function clearHousePlanting3d('),src.indexOf('    // Geometry pass(home / countryside'));
  const build=(blocked=false)=>new Function('nearestPath','collidesAt',body+'; return clearHousePlanting3d;')(()=>null,()=>blocked);
  for(const a of [0,Math.PI/2,0.73]) {
    const at=(f,s)=>({dx:f*Math.cos(a)+s*Math.sin(a),dz:-f*Math.sin(a)+s*Math.cos(a)});
    const house={id:'test:house',type:'house',x:0,z:0,collision:{ang:a},parts:[
      {shape:'box',rx:30,rz:20,h:16,y:0,ang:a,dx:0,dz:0},
      ...[-12,0,12].map(s=>({shape:'flower',r:5,h:20,y:0,...at(18,s)})),
      {shape:'flower',r:5,h:2,y:40,...at(18,0)}
    ]};
    const before=JSON.parse(JSON.stringify(house)),world={regionId:'test',spots:[]};
    build(true)(world,[house]);assert.deepEqual(house,before,'blocked plot retains whole group');
    build()(world,[house]);assert.deepEqual(house.parts[0],before.parts[0]);assert.deepEqual(house.parts[4],before.parts[4],'raised flowers retained');
    const mx=house.parts[1].dx-before.parts[1].dx,mz=house.parts[1].dz-before.parts[1].dz;
    assert.ok(Math.hypot(mx,mz)>0&&Math.hypot(mx,mz)<=60);
    for(let i=1;i<=3;i++) {
      const p=house.parts[i],q=before.parts[i];
      assert.ok(Math.abs(p.dx-q.dx-mx)<1e-8&&Math.abs(p.dz-q.dz-mz)<1e-8,'one rigid translation');
      const f=p.dx*Math.cos(a)-p.dz*Math.sin(a),s=p.dx*Math.sin(a)+p.dz*Math.cos(a);
      assert.ok(Math.hypot(Math.max(0,Math.abs(f)-20),Math.max(0,Math.abs(s)-30))>=7-1e-8);
    }
    const once=JSON.stringify(house);build()(world,[house]);assert.equal(JSON.stringify(house),once,'second pass stable');
  }
});

// Existing facade intervals must reserve the entrance rather than overlap its frame.
test('VQ-15 residential facade openings fit beside the entrance without frame overlap', () => {
  const M=require('./helpers/runtime-harness.cjs').harness({deterministic:true,fullDisplay:true,pinDate:true}).api.meguruMod;
  const reg=M.buildRegistry();let count=0;
  for(const rid of Object.keys(M.WORLDS)) for(const ob of M.worldObjects3d(M.buildWorld(rid,reg,{world3d:true})).objects) {
    if(ob.type!=='house')continue;
    const body=ob.parts[0];if(['shed','barn'].includes(body.family))continue;
    const a=body.ang||0,side=p=>(p.dx-body.dx)*Math.sin(a)+(p.dz-body.dz)*Math.cos(a),front=p=>(p.dx-body.dx)*Math.cos(a)-(p.dz-body.dz)*Math.sin(a);
    const door=ob.parts.find(p=>p.door);
    const windows=ob.parts.filter(p=>p.win&&Math.abs(front(p)-body.rz-2.2)<1e-7);
    assert.ok(windows.length>0 || (body.family==='single' && body.rx>36 && ob.parts.some(p=>p.win&&Math.abs(front(p)-body.rz-18.5)<1e-7)),ob.id+': facade has a main or bay opening');
    for(const p of windows) {
      assert.ok(p.rx>0 && p.h>=14,ob.id+': readable positive window dimensions');
      assert.ok(side(p)-p.rx-3.5>=side(door)+door.rx+4+4-1e-7,ob.id+': sill clears door frame');
      assert.ok(side(p)+p.rx+3.5<=body.rx-2+1e-7,ob.id+': sill within wall');
      assert.ok(p.y+p.h+2<=body.h-2+1e-7,ob.id+': window frame below eaves');
      count++;
    }
    for(let i=0;i<windows.length;i++)for(let j=i+1;j<windows.length;j++)if(windows[i].y===windows[j].y)assert.ok(Math.abs(side(windows[i])-side(windows[j]))>=windows[i].rx+windows[j].rx+7+2-1e-7,ob.id+': separated sills');
  }
  assert.ok(count>100);
});

// A projecting bay is already an opening; do not put another window behind its cap.
test('VQ-16 single-family main windows reserve the existing bay projection', () => {
  const M=require('./helpers/runtime-harness.cjs').harness({deterministic:true,fullDisplay:true,pinDate:true}).api.meguruMod;
  const reg=M.buildRegistry();let count=0;
  for(const rid of Object.keys(M.WORLDS)) for(const ob of M.worldObjects3d(M.buildWorld(rid,reg,{world3d:true})).objects) {
    if(ob.type!=='house')continue;
    const b=ob.parts[0];if(b.family!=='single'||b.rx<=36)continue;
    const a=b.ang||0,side=p=>(p.dx-b.dx)*Math.sin(a)+(p.dz-b.dz)*Math.cos(a),front=p=>(p.dx-b.dx)*Math.cos(a)-(p.dz-b.dz)*Math.sin(a);
    const bay=ob.parts.find(p=>p.win&&Math.abs(front(p)-b.rz-18.5)<1e-7);
    assert.ok(bay,ob.id+': existing bay remains a readable opening');
    for(const p of ob.parts.filter(p=>p.win&&Math.abs(front(p)-b.rz-2.2)<1e-7)) {
      assert.ok(side(p)+p.rx+3.5<=b.rx*.27-4+1e-7,ob.id+': main sill clears bay cap');
    }
    count++;
  }
  assert.ok(count>30);
});

test('VQ-17 two-storey entrance remains below its existing low canopy', () => {
  const M=require('./helpers/runtime-harness.cjs').harness({deterministic:true,fullDisplay:true,pinDate:true}).api.meguruMod;
  const objects=M.worldObjects3d(M.buildWorld('home',M.buildRegistry(),{world3d:true})).objects;
  const house=objects.find(o=>o.id==='home:196');
  assert.equal(house.parts[0].family,'twostorey');
  const door=house.parts.find(p=>p.door), canopy=house.parts.find(p=>p.shape==='wslab'&&p.y===52);
  assert.ok(canopy,'existing entrance canopy');
  assert.ok(door.y+door.h<=canopy.y,'door must not penetrate the unchanged canopy');
});
