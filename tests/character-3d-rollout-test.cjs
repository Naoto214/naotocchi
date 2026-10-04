const test = require('node:test'), assert = require('node:assert/strict');
const SPEC = require('../character-3d/spec.js');

test('FR-1 exact quadruped/avian stages build without substituting a neighbouring age', async () => {
  const create = require('../character-3d/rollout-spec.js');
  const rows = create(SPEC.PILOT, SPEC.ARCHETYPE_REUSE);
  const builders = await import('../character-3d/archetypes.mjs');
  for (const id of ['dog', 'cat', 'penguin']) for (let stage = 1; stage <= 8; stage++) {
    const sp = rows[id].stages[stage];
    assert.ok(sp, `${id}/${stage} exact stage`);
    const rig = builders[sp.archetype](sp, `${id}:${stage}`);
    assert.ok(rig.parts.length > 0);
    for (const part of rig.parts) for (const v of part.mesh.geometry.attributes.position.array) assert.ok(Number.isFinite(v));
    if (id === 'cat' && [1,8].includes(stage)) {
      const tail = rig.parts.find(p => p.bone === 'tail').mesh.geometry;
      tail.computeBoundingBox();
      assert.ok(tail.boundingBox.max.z > sp.body.len * .6, 'resting tail wraps towards the front of the body');
      assert.ok(tail.boundingBox.min.x < -sp.body.r, 'tail bends around the flank');
    }
    if (stage > 1) assert.notDeepEqual(sp, rows[id].stages[stage - 1], 'no identical age substitution');
  }
  assert.equal(rows.dog.stages[3].poseProfile.pawLift, 'legFL');
  assert.equal(rows.cat.stages[3].poseProfile.pawLift, 'legFL');
  assert.equal(rows.cat.stages[4].idlePose, 'playBow');
  assert.equal(rows.cat.stages[8].idlePose, 'lie');
  assert.equal(rows.penguin.stages[3].raisedWing, true);
  assert.equal(rows.penguin.stages[5].fluff, 0);
  for (const id of ['dog','penguin']) for (const stage of [1,4,8]) assert.deepEqual(rows[id].stages[stage], SPEC.PILOT[id].stages[stage]);
});

test('signature lifted paw stays readable with reduced motion and releases into walking', async () => {
  const rows = require('../character-3d/rollout-spec.js')(SPEC.PILOT);
  const {quadruped} = await import('../character-3d/archetypes.mjs');
  const {attachFace} = await import('../character-3d/rig.mjs');
  const {instantiate} = await import('../character-3d/runtime.mjs');
  const {animate} = await import('../character-3d/animate.mjs');
  for (const id of ['dog','cat']) {
    const rig = quadruped(rows[id].stages[3], id);
    rig.faces = [attachFace(rig,rig.faceSpec,'B')];
    const instance = instantiate({rig,key:id});
    animate(instance,{dt:0,animLv:0});
    assert.ok(instance.bones.legFL.rotation.x < -.8, 'raised paw must not become a generic four-legged idle');
    assert.ok(Math.abs(instance.bones.legFR.rotation.x) < .01);
    for(let n=0;n<30;n++) animate(instance,{dt:1/30,moving:true,animLv:0});
    assert.ok(Math.abs(instance.bones.legFL.rotation.x) < .4, 'signature pose releases for locomotion');
  }
});
