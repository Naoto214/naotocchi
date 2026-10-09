const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const SPEC = require('../character-3d/spec.js');
const candidates = require('../character-3d/nonplayer-spec.js');

async function setup(spec = candidates()['companion:punyu'].spec, key = 'companion:punyu:0') {
  const { BUILDERS } = await import('../character-3d/archetypes.mjs');
  const { attachFace } = await import('../character-3d/rig.mjs');
  const { instantiate } = await import('../character-3d/runtime.mjs');
  const animation = await import('../character-3d/animate.mjs');
  const { THREE } = await import('../character-3d/geometry.mjs');
  const rig = BUILDERS.blob(spec, key);
  rig.faces = [attachFace(rig, rig.faceSpec, 'C')];
  return { rig, instance: (seed = 0) => instantiate({ rig, key }, seed), THREE, ...animation };
}

function assertFinite(instance, context) {
  for (const bone of Object.values(instance.bones)) {
    assert.ok([...bone.position.toArray(), ...bone.rotation.toArray().slice(0, 3), ...bone.scale.toArray()].every(Number.isFinite), context);
  }
}

for (const animLv of [0, 2]) {
  test(`Punyu normal idle stays on the ground through animated frames (animLv ${animLv})`, async () => {
    const { instance, animate, THREE } = await setup();
    for (const seed of [0, 17, 96]) {
      const actor = instance(seed);
      for (let frame = 0; frame < 120; frame++) {
        animate(actor, { dt: .05, moving: false, animLv });
        actor.root.updateMatrixWorld(true);
        const floor = new THREE.Box3().setFromObject(actor.root, true).min.y;
        assert.ok(floor >= -.005 && floor <= .02, `Punyu idle floor ${floor}; seed ${seed}, frame ${frame}`);
        assertFinite(actor, `idle seed ${seed}, frame ${frame}`);
      }
    }
  });
}

test('Punyu preserves one canonical face and finite transforms across all 32 states and reactions', async () => {
  const { instance, animate, setEmotion, react, REACTION_MS } = await setup();
  let states = 0;
  for (const emotion of SPEC.CANONICAL_EMOTIONS) for (const moving of [false, true]) for (const animLv of [0, 2]) {
    const actor = instance(17);
    setEmotion(actor, emotion);
    for (let frame = 0; frame < 40; frame++) {
      animate(actor, { dt: .05, moving, animLv });
      assertFinite(actor, `${emotion}, moving ${moving}, animLv ${animLv}, frame ${frame}`);
      assert.equal(actor.faces.length, 1);
      assert.equal(actor.faces[0].emotion, emotion);
    }
    for (const reaction of Object.keys(REACTION_MS)) {
      assert.equal(react(actor, reaction), true);
      for (let frame = 0; frame < 40; frame++) {
        animate(actor, { dt: .05, moving, animLv });
        assertFinite(actor, `${emotion}, ${reaction}, animLv ${animLv}, frame ${frame}`);
      }
      assert.equal(actor.anim.reaction, null, `${reaction} expires`);
    }
    states++;
  }
  assert.equal(states, 32);
  assert.equal(SPEC.specKeyFor({ kind: 'companion', id: 'punyu' }), null, 'candidate remains unregistered');
});

test('blob specs without an opt-in retain their exact existing animation transforms', async () => {
  const spec = { ...candidates()['companion:punyu'].spec };
  delete spec.locomotion;
  const { rig, instance, animate, setEmotion } = await setup(spec, 'legacy-blob');
  assert.equal(rig.locomotion, 'blobFloat');
  const samples = [];
  for (const emotion of SPEC.CANONICAL_EMOTIONS) for (const moving of [false, true]) for (const animLv of [0, 2]) {
    const actor = instance(17);
    setEmotion(actor, emotion);
    for (let frame = 0; frame < 40; frame++) {
      animate(actor, { dt: .05, moving, animLv });
      samples.push(Object.values(actor.bones).map(bone => [...bone.position.toArray(), ...bone.rotation.toArray().slice(0, 3), ...bone.scale.toArray()]));
    }
  }
  // Captured from the unmodified base across all 32 states, including scales.
  assert.equal(createHash('sha256').update(JSON.stringify(samples)).digest('hex'), '3544c62aeaec6c6796d378a76fa5aa06138533b37f54b001bab26ed38c00e3d3');
});
