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
  assert.equal(rows.cat.stages[4].idlePose, 'stretchPlay');
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
    rig.faces = (Array.isArray(rig.faceSpec)?rig.faceSpec:[rig.faceSpec]).map(f=>attachFace(rig,f,'B'));
    const instance = instantiate({rig,key:id});
    animate(instance,{dt:0,animLv:0});
    assert.ok(instance.bones.legFL.rotation.x < -.8, 'raised paw must not become a generic four-legged idle');
    assert.ok(Math.abs(instance.bones.legFR.rotation.x) < .01);
    for(let n=0;n<30;n++) animate(instance,{dt:1/30,moving:true,animLv:0});
    assert.ok(Math.abs(instance.bones.legFL.rotation.x) < .4, 'signature pose releases for locomotion');
  }
  const rig = quadruped(rows.cat.stages[4],'cat:4');rig.faces=[attachFace(rig,rig.faceSpec,'B')];
  const playful=instantiate({rig,key:'cat:4'});animate(playful,{dt:0,animLv:0});
  assert.ok(playful.bones.legFL.rotation.x < -.8 && playful.bones.legBL.rotation.x > .5,'extended play has opposing front/rear legs');
  assert.ok(Math.abs(playful.bones.body.rotation.x)<.1,'cat plays with a stretched level torso, not a canine bow');
});

test('every candidate preserves canonical expression and finite idle/walk under reduced motion', async () => {
  const rows = require('../character-3d/rollout-spec.js')(SPEC.PILOT);
  const builders = await import('../character-3d/archetypes.mjs');
  const {attachFace} = await import('../character-3d/rig.mjs');
  const {instantiate} = await import('../character-3d/runtime.mjs');
  const {animate,setEmotion,react} = await import('../character-3d/animate.mjs');
  for (const [id,row] of Object.entries(rows)) for (const [stage,sp] of Object.entries(row.stages)) {
    const rig = builders.BUILDERS[sp.archetype](sp, id+':'+stage);
    rig.faces = (Array.isArray(rig.faceSpec)?rig.faceSpec:[rig.faceSpec]).map(f=>attachFace(rig,f,'B'));
    const instance = instantiate({rig,key:id+':'+stage});
    for(const emotion of ['normal','positive','dislike','tired','sleeping','strained','wantsPlay','sick']) {
      setEmotion(instance,emotion);assert.equal(instance.anim.emotion,emotion);
      assert.ok(instance.faces.every(f=>f.emotion===emotion));
      for(const reduced of [0,2]) for(const moving of [false,true]) {
        react(instance,'hop');
        for(let frame=0;frame<8;frame++)animate(instance,{dt:.05,moving,animLv:reduced});
        instance.root.updateMatrixWorld(true);
        assert.ok(instance.root.visible);
        for(const bone of Object.values(instance.bones))assert.ok(bone.matrixWorld.elements.every(Number.isFinite),id+'/'+stage+'/'+emotion);
        assert.ok(instance.root.scale.x>0 && instance.root.scale.y>0 && instance.root.scale.z>0);
      }
    }
  }
});

test('asymmetric ears and bilateral raised wings keep the original signature silhouette', async () => {
  const rows = require('../character-3d/rollout-spec.js')(SPEC.PILOT);
  const {quadruped,avian} = await import('../character-3d/archetypes.mjs');
  const dog = quadruped(rows.dog.stages[7],'dog:7');
  const ears = ['earL','earR'].map(n=>{const g=dog.parts.find(p=>p.bone===n).mesh.geometry;g.computeBoundingBox();return g.boundingBox;});
  assert.ok(ears[0].max.y > .2 && ears[0].min.y > -.01, 'one ear points up');
  assert.ok(ears[1].min.y < -.2, 'other ear folds down');
  const bird = avian(rows.penguin.stages[3],'penguin:3');
  assert.ok(bird.bones.wingL.rotation.z < -1.5 && bird.bones.wingR.rotation.z > 1.5,'both raised flippers');
});

test('reviewed exact stages reach the real presenter without role aliases or nearest-age substitution', async () => {
  const rt = await import('../character-3d/runtime.mjs');
  const {THREE} = await import('../character-3d/geometry.mjs');
  const presenter = rt.createCharacterPresenter({scene:new THREE.Scene(),buildBudget:30});
  presenter.beginFrame(0);
  for (const id of Object.keys(SPEC.ROLLOUT)) for(let stage=1;stage<=8;stage++) {
    const key = SPEC.specKeyFor({line:id,stage:stage-1});
    assert.deepEqual(key,{id,stage,exact:true});
    const template = rt.getTemplate(id,stage);
    assert.equal(template.status,'ok',id+'/'+stage);
    assert.equal(rt.getTemplate(id,stage),template,'template reuse');
    const actor=Object.freeze({x:0,z:0,heading:0});
    assert.equal(presenter.present(actor,{specKey:key,emotion:'normal',dt:1/60,isPlayer:id==='cat'}),true);
  }
  presenter.endFrame();assert.equal(presenter.stats().live,Object.keys(SPEC.ROLLOUT).length*8);assert.equal(presenter.stats().fallbacks,0);
  assert.equal(SPEC.specKeyFor({kind:'partner',id:'cat_friend'}),null,'a companion cannot be presented as a partner');
  assert.equal(SPEC.specKeyFor({kind:'companion',id:'cat'}),null,'player cat is not cat_friend');
  for(const stage of [-1,8,NaN,.5])assert.equal(SPEC.specKeyFor({line:'cat',stage}),null);
  presenter.setScene(new THREE.Scene());assert.equal(presenter.stats().live,0);
  presenter.dispose();
});
test('reviewed human batch has all24 exact runtime templates without nearest-age substitution',async()=>{
 const rt=await import('../character-3d/runtime.mjs');for(const id of ['man','woman','ren'])for(let stage=1;stage<=8;stage++){assert.deepEqual(SPEC.specKeyFor({line:id,stage:stage-1}),{id,stage,exact:true});assert.equal(rt.getTemplate(id,stage).status,'ok');}assert.equal(SPEC.ROLLOUT.woman.stages[8].poseProfile.seated,true);
});
test('reviewed dandelion batch has eight exact runtime stages including rooted seed head',async()=>{
 const rt=await import('../character-3d/runtime.mjs');for(let stage=1;stage<=8;stage++){assert.deepEqual(SPEC.specKeyFor({line:'dandelion',stage:stage-1}),{id:'dandelion',stage,exact:true});assert.equal(rt.getTemplate('dandelion',stage).status,'ok');}assert.equal(SPEC.ROLLOUT.dandelion.stages[7].form,'seedHead');assert.equal(SPEC.ROLLOUT.dandelion.stages[8].archetype,'cluster');
});
test('reviewed butterfly batch has all eight exact metamorphosis templates',async()=>{
 const rt=await import('../character-3d/runtime.mjs');for(let stage=1;stage<=8;stage++){assert.deepEqual(SPEC.specKeyFor({line:'butterfly',stage:stage-1}),{id:'butterfly',stage,exact:true});assert.equal(rt.getTemplate('butterfly',stage).status,'ok');}assert.equal(SPEC.ROLLOUT.butterfly.stages[4].hang,true);assert.ok(SPEC.ROLLOUT.butterfly.stages[6].emergence);
});
test('reviewed fungus and starfish batches preserve all16 exact topology stages in runtime',async()=>{
 const rt=await import('../character-3d/runtime.mjs');for(const id of ['mushroom','starfish'])for(let stage=1;stage<=8;stage++){assert.deepEqual(SPEC.specKeyFor({line:id,stage:stage-1}),{id,stage,exact:true});assert.equal(rt.getTemplate(id,stage).status,'ok');}
 assert.equal(SPEC.ROLLOUT.mushroom.stages[2].form,'mycelium');assert.ok(SPEC.ROLLOUT.mushroom.stages[7].sporeCluster);assert.ok(SPEC.ROLLOUT.starfish.stages[3].larvalAttachment);
});

test('reviewed shell and crouched batches reach all16 exact runtime stages', async()=>{
 const rt=await import('../character-3d/runtime.mjs');
 for(const id of ['turtle','frog'])for(let stage=1;stage<=8;stage++){
 assert.deepEqual(SPEC.specKeyFor({line:id,stage:stage-1}),{id,stage,exact:true});
 assert.equal(rt.getTemplate(id,stage).status,'ok');}
 assert.equal(SPEC.ROLLOUT.frog.stages[1].hind,null);
 assert.equal(SPEC.ROLLOUT.frog.stages[3].fore,null);
 assert.equal(SPEC.ROLLOUT.frog.stages[7].tail,null);
 assert.ok(SPEC.ROLLOUT.turtle.stages[8].shell.moss.length);
});
test('reviewed coral batch preserves all eight exact runtime stages and owned colony faces',async()=>{
 const rt=await import('../character-3d/runtime.mjs');
 for(let stage=1;stage<=8;stage++){
  assert.deepEqual(SPEC.specKeyFor({line:'coral',stage:stage-1}),{id:'coral',stage,exact:true});
  const t=rt.getTemplate('coral',stage);assert.equal(t.status,'ok');
  assert.equal(t.rig.faces.length,stage===6?4:stage===7?3:stage===8?5:1);
 }

});

test('reviewed jellyfish batch preserves eight exact rooted, ephyra and bell runtime stages',async()=>{
 const rt=await import('../character-3d/runtime.mjs');
 for(let stage=1;stage<=8;stage++){
  assert.deepEqual(SPEC.specKeyFor({line:'jellyfish',stage:stage-1}),{id:'jellyfish',stage,exact:true});
  const t=rt.getTemplate('jellyfish',stage);assert.equal(t.status,'ok');
  assert.equal(t.rig.locomotion,stage<=2?'plantSway':'blobFloat');
 }
 assert.equal(SPEC.specKeyFor({line:'dragon',stage:6}),null,'unreviewed dragon family stays outside rollout');
});
test('reviewed beetle families preserve all exact metamorphosis stages in runtime',async()=>{
 const rt=await import('../character-3d/runtime.mjs');
 for(const id of ['beetle','stagbeetle'])for(let stage=1;stage<=8;stage++){
  assert.deepEqual(SPEC.specKeyFor({line:id,stage:stage-1}),{id,stage,exact:true});const t=rt.getTemplate(id,stage);assert.equal(t.status,'ok');assert.equal(t.rig.archetype,stage<4?'larva':stage===4?'pod':'armored_insect');
  for(const emotion of SPEC.CANONICAL_EMOTIONS){const a=rt.instantiate(t);const an=await import('../character-3d/animate.mjs');an.setEmotion(a,emotion);an.animate(a,{dt:.05,moving:true,animLv:2});assert.equal(a.faces[0].emotion,emotion);}
 }
});
test('reviewed sakura batch preserves all eight original topologies and face ownership in runtime',async()=>{
 const rt=await import('../character-3d/runtime.mjs'),an=await import('../character-3d/animate.mjs'),counts=[1,1,1,1,5,2,3,1];
 for(let stage=1;stage<=8;stage++){
  assert.deepEqual(SPEC.specKeyFor({line:'sakura',stage:stage-1}),{id:'sakura',stage,exact:true});const t=rt.getTemplate('sakura',stage);assert.equal(t.status,'ok');assert.equal(t.rig.archetype,'branch_organism');
  for(const emotion of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=rt.instantiate(t);an.setEmotion(a,emotion);an.animate(a,{dt:.05,moving,animLv});assert.equal(a.faces.length,counts[stage-1]);assert.ok(a.faces.every(f=>f.emotion===emotion));}
 }
});
test('reviewed cicada batch preserves all eight exact nymph emergence and adult stages in runtime',async()=>{
 const rt=await import('../character-3d/runtime.mjs'),an=await import('../character-3d/animate.mjs');
 for(let stage=1;stage<=8;stage++){
  assert.deepEqual(SPEC.specKeyFor({line:'cicada',stage:stage-1}),{id:'cicada',stage,exact:true});const t=rt.getTemplate('cicada',stage);assert.equal(t.status,'ok');assert.equal(t.rig.archetype,'armored_insect');assert.equal(!!t.rig.bones.emptyShell,stage===5);assert.equal(!!t.rig.bones.wing0,stage>=5);
  for(const emotion of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=rt.instantiate(t);an.setEmotion(a,emotion);an.animate(a,{dt:.05,moving,animLv});assert.equal(a.faces.length,1);assert.equal(a.faces[0].emotion,emotion);}
 }
});
test('reviewed antlion batch preserves eight exact larva cocoon and winged runtime stages',async()=>{
 const rt=await import('../character-3d/runtime.mjs'),an=await import('../character-3d/animate.mjs');
 for(let stage=1;stage<=8;stage++){
  assert.deepEqual(SPEC.specKeyFor({line:'antlion',stage:stage-1}),{id:'antlion',stage,exact:true});const t=rt.getTemplate('antlion',stage);assert.equal(t.status,'ok');assert.equal(t.rig.archetype,[4,5].includes(stage)?'pod':'armored_insect');assert.equal(!!t.rig.bones.pit,[2,3].includes(stage));assert.equal(!!t.rig.bones.wing0,stage>=6);
  for(const emotion of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=rt.instantiate(t);an.setEmotion(a,emotion);an.animate(a,{dt:.05,moving,animLv});assert.equal(a.faces.length,1);assert.equal(a.faces[0].emotion,emotion);}
 }
});

test('reviewed hermit batch preserves all eight exact shelled actors and eyestalk faces',async()=>{
 const rt=await import('../character-3d/runtime.mjs'),an=await import('../character-3d/animate.mjs');
 for(let stage=1;stage<=8;stage++){
  assert.deepEqual(SPEC.specKeyFor({line:'hermit_crab',stage:stage-1}),{id:'hermit_crab',stage,exact:true});const t=rt.getTemplate('hermit_crab',stage);assert.equal(t.status,'ok');assert.equal(t.rig.archetype,'armored_insect');
  for(const emotion of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=rt.instantiate(t);an.setEmotion(a,emotion);an.animate(a,{dt:.05,moving,animLv});assert.equal(a.faces.length,1);assert.equal(a.faces[0].emotion,emotion);assert.equal(a.faces[0].eyes.length,2);}
 }
});
