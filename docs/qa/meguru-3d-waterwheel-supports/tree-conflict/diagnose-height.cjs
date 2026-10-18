// Read-only, conservative centreline containment; not triangle intersection QA.
// Run from any cwd. Production harness MUST load after chdir.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '../../../..');
process.chdir(root);
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
(async () => {
  const renderer = fs.readFileSync('meguru-3d.mjs', 'utf8');
  assert(renderer.includes('trunk2: up(new THREE.CylinderGeometry(0.5, 1, 1, 7, 1, true))'));
  assert(renderer.includes("pt.taper != null && pt.taper < 0.65 ? 'trunk2' : 'trunk'"));
  const {harness} = require(path.join(root, 'tests/helpers/runtime-harness.cjs'));
  const M = harness({deterministic:true, fullDisplay:true, pinDate:true}).api.meguruMod;
  const world = M.buildWorld('river_lake', M.buildRegistry(), {world3d:true});
  const objects = M.worldObjects3d(world).objects;
  const tree = objects.find(o => o.id === 'river_lake:68');
  const wheel = objects.find(o => o.id === 'river_lake:406');
  assert(tree?.type === 'broadleaf' && wheel?.type === 'wheel');
  const {terrainGrid, objectGround} = await import(pathToFileURL(path.join(root, 'meguru-3d.mjs')));
  const terrain = terrainGrid(world, M, objects);
  const grounds = [tree, wheel].map(o => objectGround(terrain, o));
  const ground = (i,p) => grounds[i].part ? grounds[i].part(p) : grounds[i].base;
  const rootPart = tree.parts[0], trunk = tree.parts[1];
  for (const p of [rootPart,trunk]) {
    assert(p.shape === 'trunk' && p.taper < .65 && !p.neutralColor);
    assert(!p.tilt && !p.dx && !p.dz && p.h > 0 && p.r > 0);
  }
  // Radius is determined by the selected renderer primitive, not descriptor taper.
  // Its inscribed circle is contained by the seven-sided cross-section at any ry.
  function containment(p, x, z, y) {
    const baseY = ground(0,p) + (p.y || 0);
    const u = (y-baseY)/p.h;
    assert(u > 0 && u < 1, 'Sample outside trunk height');
    const inscribedRadius = p.r * (1-.5*u) * Math.cos(Math.PI/7);
    const centreDistance = Math.hypot(x-tree.x,z-tree.z);
    return {sample:{x,z,y},baseY,height:p.h,u,inscribedRadius,centreDistance,
      margin:inscribedRadius-centreDistance,contained:centreDistance < inscribedRadius};
  }
  const posts = wheel.parts.filter(p => p.shape === 'wpost');
  assert.equal(posts.length,2);
  const postSamples = posts.map(p => {
    assert(!p.tilt);
    const postBaseY = ground(1,p)+(p.y||0);
    const y = Math.max(postBaseY,ground(0,rootPart)+(rootPart.y||0))+1;
    assert(y < postBaseY+p.h);
    return {dx:p.dx,dz:p.dz||0,postBaseY,postTopY:postBaseY+p.h,
      rootContainment:containment(rootPart,wheel.x+(p.dx||0),wheel.z+(p.dz||0),y)};
  });
  const ring = wheel.parts.find(p => p.shape === 'arch');
  assert(ring && !ring.dx && !ring.dz);
  const hub = containment(trunk,wheel.x,wheel.z,ground(1,ring)+ring.y);
  assert(postSamples.every(p => p.rootContainment.contained) && hub.contained);
  console.log(JSON.stringify({
    checkout:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
    sourceSha256:Object.fromEntries(['meguru.js','meguru-3d.mjs','index.html'].map(f=>[f,hash(fs.readFileSync(f))])),
    targetSha256:Object.fromEntries([tree,wheel].map(o=>[o.id,hash(JSON.stringify(o))])),
    postSamples,hub,
    conclusion:'Both post foot centrelines are inside the grounded root volume; wheel hub is inside the lower-trunk volume. Root-only or crown-only changes cannot clear the hub.',
    limitations:[
      'Conservative centreline containment in the implied closed frustum volume, not exact triangle-surface intersection; current trunk mesh has open ends.',
      'No new browser/image QA, regression, Human QA or physical iPhone result.',
      'No product mutation or proof that every fixed-anchor redesign is impossible. WQ-WHEEL-TREE remains OPEN.'
    ]
  },null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
