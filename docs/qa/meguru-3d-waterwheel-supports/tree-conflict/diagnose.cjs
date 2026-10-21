// Read-only descriptor/footprint diagnostic. No mesh or gameplay PASS is implied.
// node docs/qa/meguru-3d-waterwheel-supports/tree-conflict/diagnose.cjs
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
process.chdir(root);
const {harness} = require(path.join(root, 'tests/helpers/runtime-harness.cjs'));
const M = harness({deterministic: true, fullDisplay: true, pinDate: true}).api.meguruMod;
const world = M.buildWorld('river_lake', M.buildRegistry(), {world3d: true});
const objects = M.worldObjects3d(world).objects;
const tree = objects.find(o => o.id === 'river_lake:68');
const wheel = objects.find(o => o.id === 'river_lake:406');
if (!tree || !wheel || tree.type !== 'broadleaf' || wheel.type !== 'wheel') throw Error('Target changed');
if (wheel.collision.ang !== 0 || tree.collision.shape !== 'circle' || wheel.collision.shape !== 'box') throw Error('Reassess footprint convention');
const rootPart = tree.parts[0];
if (rootPart.shape !== 'trunk' || rootPart.y !== 0 || rootPart.tilt) throw Error('Root geometry changed');
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
const offset = {x: tree.x - wheel.x, z: tree.z - wheel.z};
// Both coordinates are below BOTH box half-extents, independent of axis convention.
const centreInsideBox = Math.max(Math.abs(offset.x), Math.abs(offset.z)) < Math.min(wheel.collision.hw, wheel.collision.hd);
const inscribedRootRadius = rootPart.r * Math.cos(Math.PI / 7);
const posts = wheel.parts.filter(p => p.shape === 'wpost').map(p => {
  const distance = Math.hypot(wheel.x + (p.dx || 0) - tree.x, wheel.z + (p.dz || 0) - tree.z);
  return {dx: p.dx, dz: p.dz, radius: p.r, centreDistanceToTree: distance,
    centreInsideProjectedRootForAnyRotation: distance < inscribedRootRadius};
});
console.log(JSON.stringify({
  checkout: execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(),
  sourceSha256: Object.fromEntries(['meguru.js', 'meguru-3d.mjs', 'index.html'].map(f => [f, hash(fs.readFileSync(f))])),
  targetSha256: Object.fromEntries([tree, wheel].map(o => [o.id, hash(JSON.stringify(o))])),
  targets: {tree: {id: tree.id, x: tree.x, z: tree.z, collision: tree.collision, root: rootPart},
    wheel: {id: wheel.id, x: wheel.x, z: wheel.z, collision: wheel.collision}},
  offset, centreDistance: Math.hypot(offset.x, offset.z), centreInsideBox,
  projectedRootInscribedRadius: inscribedRootRadius, posts,
  limitations: ['XZ footprint diagnostic, not triangle intersection or vertical terrain-contact proof.',
    'Seven-sided base radius follows current renderer trunk2; does not prove any proposed redesign safe.',
    'Existing source-correct four-direction images establish the contextual visible conflict.',
    'No product mutation, browser rerun, full regression, Human QA or iPhone approval.']
}, null, 2));
