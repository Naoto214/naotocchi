// Combined World 3D × Character 3D contract checks.
// This is NOT pixel/occlusion QA or physical iPhone performance proof.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const ROOT = path.join(__dirname, '..');

async function modules() {
  const [world, character, geometry] = await Promise.all([
    import(pathToFileURL(path.join(ROOT, 'meguru-3d.mjs')).href),
    import(pathToFileURL(path.join(ROOT, 'character-3d/runtime.mjs')).href),
    import(pathToFileURL(path.join(ROOT, 'character-3d/geometry.mjs')).href),
  ]);
  return { world, character, THREE: geometry.THREE };
}

const actor = () => Object.freeze({
  key: 'form:dog:4', kind: 'form', line: 'dog', stage: 4,
  x: 12, z: 15, heading: 0, emotion: 'normal',
});
const model = (height) => ({
  specKey: { id: 'dog', stage: 4 }, emotion: 'normal',
  dt: 0.016, groundY: height,
});
const billboard = (visible = true) => ({
  visible, scale: { x: 100, y: 100, z: 1 },
  material: { map: { id: 'valid-texture' }, fog: false },
});
async function presented() {
  const { world, character, THREE } = await modules();
  const scene = new THREE.Scene();
  const p = character.createCharacterPresenter({
    scene, actorSize: 110, buildBudget: 10, animLevel: 0,
  });
  const a = actor();
  p.beginFrame(0);
  const ok = p.present(a, model(43.5));
  p.endFrame();
  assert.equal(ok, true, 'a dog model must be ready for this integration check');
  return { world, character, THREE, scene, p, a };
}

test('integration: intentional hidden billboard is healthy when 3D body is attached', async () => {
  const { world, p, a } = await presented();
  try {
    const inst = p.instanceOf(a);
    assert.ok(inst);
    assert.equal(inst.holder.position.y, 43.5,
      'Character presenter must use unscaled terrain/bridge groundY');
    const result = world.activeActorVisible(p, a, billboard(false), 1000, 100, null);
    assert.equal(result.mode, '3d');
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.pixelVisibility, 'NOT_MEASURED');
    assert.ok(result.meshes > 0);
  } finally {
    p.dispose();
  }
});

test('integration: hidden, degenerate and detached 3D body remain reported as failures', async () => {
  const { world, p, a, scene } = await presented();
  try {
    const inst = p.instanceOf(a);
    inst.holder.visible = false;
    assert.deepEqual(
      [world.activeActorVisible(p, a, billboard(false), 1000, 100, null).ok,
        world.activeActorVisible(p, a, billboard(false), 1000, 100, null).why],
      [false, '3d-hidden']
    );
    inst.holder.visible = true;
    const originalScale = inst.holder.scale.x;
    inst.holder.scale.x = 0;
    assert.equal(world.activeActorVisible(p, a, billboard(false), 1000, 100, null).why, '3d-scale');
    inst.holder.scale.x = originalScale;
    scene.remove(inst.holder);
    assert.equal(world.activeActorVisible(p, a, billboard(false), 1000, 100, null).why, '3d-detached');
  } finally {
    p.dispose();
  }
});

test('integration: one broken 3D actor falls back to visible 2D billboard', async () => {
  const { world, p, a } = await presented();
  try {
    p.setHooks({ failUpdate: x => x === a });
    p.beginFrame(16);
    assert.equal(p.present(a, model(-12)), false);
    p.endFrame();
    assert.equal(p.has(a), false);
    assert.equal(p.isBroken(a), true);
    const fallback = world.activeActorVisible(p, a, billboard(true), 1000, 100, null);
    assert.equal(fallback.mode, '2d');
    assert.equal(fallback.ok, true);
    assert.equal(world.activeActorVisible(p, a, billboard(false), 1000, 100, null).ok, false);
  } finally {
    p.dispose();
  }
});

test('integration: on-screen body verification is distinct from pixel/occlusion proof', async () => {
  const { world, p, a, THREE } = await presented();
  try {
    const cam = new THREE.PerspectiveCamera(75, 1, 0.1, 4000);
    cam.position.set(12, 125, 700);
    cam.lookAt(12, 60, -15);
    cam.updateProjectionMatrix();
    const visible = world.activeActorVisible(p, a, billboard(false), 1000, 100, cam);
    assert.equal(visible.ok, true, JSON.stringify(visible));
    assert.equal(visible.mode, '3d');
    assert.ok(visible.inFrustum > 0);
    assert.equal(visible.pixelVisibility, 'NOT_MEASURED');
  } finally {
    p.dispose();
  }
});

test('integration: main Character API and World regional/corridor features survive the same source', async () => {
  const { world } = await modules();
  const source = fs.readFileSync(path.join(ROOT, 'meguru-3d.mjs'), 'utf8');
  const core = fs.readFileSync(path.join(ROOT, 'meguru.js'), 'utf8');
  assert.equal(typeof world.activeActorVisible, 'function');
  assert.equal(typeof world.billboardVisible, 'function');
  assert.equal(typeof world.pickOccluders, 'function');
  assert.match(source, /\bsetChar3D\(on\)/);
  assert.match(source, /\bsetAdaptiveDpr\(on\)/);
  assert.match(source, /\bget playerVisible\(\)/);
  assert.match(source, /groundY: wy/);
  assert.match(source, /if \(w\.corridor\) return/);
  assert.match(source, /ghostPool\.length = 0/);
  assert.match(core, /quietMark: quietMarkInfo/);
  assert.match(core, /\bmapSpotShown,/);
  assert.match(core, /\bapplyReaction, syncExpression, residentExpression,/);
});
