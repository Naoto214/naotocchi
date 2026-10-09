const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
function sameGeometryBytes(actual,expected,label){
 assert.deepEqual(Object.keys(actual.attributes),Object.keys(expected.attributes),`${label}: attributes`);
 const sameAttribute=(a,b,name)=>{assert.equal(a.itemSize,b.itemSize,`${name}: itemSize`);assert.equal(a.count,b.count,`${name}: count`);assert.equal(a.normalized,b.normalized,`${name}: normalized`);assert.equal(a.array.constructor.name,b.array.constructor.name,`${name}: type`);
  assert.deepEqual(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength),Buffer.from(b.array.buffer,b.array.byteOffset,b.array.byteLength),`${name}: exact bytes`);
 };
 for(const name of Object.keys(expected.attributes))sameAttribute(actual.attributes[name],expected.attributes[name],`${label}/${name}`);
 assert.equal(Boolean(actual.index),Boolean(expected.index),`${label}: indexed topology`);if(expected.index)sameAttribute(actual.index,expected.index,`${label}/index`);
}
function sameRigDefaults(actual,expected,label){
 assert.equal(actual.archetype,expected.archetype);assert.equal(actual.locomotion,expected.locomotion);assert.deepEqual(actual.meta,expected.meta);
 assert.deepEqual(Object.keys(actual.bones),Object.keys(expected.bones),`${label}: bones`);actual.root.updateMatrixWorld(true);expected.root.updateMatrixWorld(true);
 for(const name of Object.keys(expected.bones)){const a=actual.bones[name],b=expected.bones[name];assert.equal(a.parent?.name,b.parent?.name,`${label}/${name}: owner`);
  assert.deepEqual(a.matrix.elements,b.matrix.elements,`${label}/${name}: local transform`);assert.deepEqual(a.matrixWorld.elements,b.matrixWorld.elements,`${label}/${name}: world transform`);
  for(const k of ['p','r','s'])assert.deepEqual(a.userData.rest[k].toArray(),b.userData.rest[k].toArray(),`${label}/${name}: resting ${k}`);
 }
 assert.equal(actual.parts.length,expected.parts.length,`${label}: part count`);
 for(let i=0;i<expected.parts.length;i++){const a=actual.parts[i],b=expected.parts[i];assert.equal(a.bone,b.bone,`${label}: part owner`);assert.equal(a.mesh.material.name,b.mesh.material.name,`${label}/${a.bone}: material`);assert.deepEqual(a.mesh.matrix.elements,b.mesh.matrix.elements,`${label}/${a.bone}: mesh local transform`);assert.deepEqual(a.mesh.matrixWorld.elements,b.mesh.matrixWorld.elements,`${label}/${a.bone}: mesh world transform`);sameGeometryBytes(a.mesh.geometry,b.mesh.geometry,`${label}/${a.bone}`);}
 const {target:aTarget,...aFace}=actual.faceSpec,{target:bTarget,...bFace}=expected.faceSpec;assert.deepEqual(aFace,bFace,`${label}: canonical face defaults`);sameGeometryBytes(aTarget,bTarget,`${label}/face target`);
}

// Frozen original factory + current helpers, evaluated together on the caller's Node runtime.
// Preserve exact arrays/topology/transforms; do not accept cross-runtime float tolerances.
async function assertSoftToyDefaults(softToy,stages){
 const fixture=path.join(__dirname,'../fixtures/character-3d-soft-toy-before-small-mammals.mjs');
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(fixture)).digest('hex'),'fe6d4084c476292f451e5ec73142fa3a050923fd10bdbb9d07cf997140fc15f9','frozen original factory integrity');
 const {softToy:originalSoftToy}=await import('../fixtures/character-3d-soft-toy-before-small-mammals.mjs');
 for(let n=1;n<=8;n++){assert.ok(stages[n],`plush:${n}: existing stage`);const key=`plush:${n}`,sp=stages[n];sameRigDefaults(softToy(sp,key),originalSoftToy(sp,key),key);}
}
module.exports={assertSoftToyDefaults};
