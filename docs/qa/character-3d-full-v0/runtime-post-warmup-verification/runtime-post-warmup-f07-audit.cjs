const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const file='/workspace/scratch/150320e8a2fd/character-rollout/docs/qa/character-3d-full-v0/export/f07fef280059b41e6ab22c2475b0cc5fd3c7c9ca/scene-save-and-native-metrics-diagnostic/meguru/meguru-qa.json';
const bytes=fs.readFileSync(file),doc=JSON.parse(bytes),r=structuredClone(doc.checks.repeated),qa=require('/workspace/scratch/150320e8a2fd/rollout-runtime-post-warmup-save-contract/tools/character-3d/runtime-integration.cjs');
assert.equal(doc.verdict.pass,false);assert.equal(r.unchanged.save,false);
const w=r.saveObservations.find(p=>p.label==='warmup');
for(const p of r.saveObservations.filter(p=>/^cycle-[123]$|^cleanup$/.test(p.label))){assert.deepEqual(p.delta,[]);assert.deepEqual(p.storageDelta,[]);assert.deepEqual(p.saveCalls,[]);assert.equal(p.beforeWrites,23);assert.equal(p.afterWrites,23);}
// Reconstruct the postwarmup snapshot from the recorded initial snapshot and actual warmup delta.
const post=structuredClone(r.saveEvidence.before);for(const d of w.delta){const keys=d.path.split('.');let target=post.state;for(const key of keys.slice(0,-1))target=target[key];target[keys.at(-1)]=structuredClone(d.after);}for(const d of w.storageDelta){assert.ok(!d.path.includes('.'));post.storage[d.path]=d.after;}post.writes=w.afterWrites;
assert.deepEqual(post,r.saveEvidence.after,'actual three later cycles plus cleanup preserve reconstructed setup snapshot');
r.setup={before:r.saveEvidence.before,after:post,delta:w.delta,storageDelta:w.storageDelta,saveCalls:w.saveCalls,eventLimitReached:w.eventLimitReached};
const setup=qa.validateSceneSetup(r);assert.equal(setup.kind,'one-time-empty-city-map-seed');
r.initialUnchanged=r.unchanged;r.unchanged={save:true,storage:true,getter:true,saveWrites:true};r.strictSave={before:post,after:r.saveEvidence.after};qa.validateRepeated(r);
assert.equal(doc.verdict.pass,false);assert.equal(doc.checks.repeated.unchanged.save,false);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),crypto.createHash('sha256').update(bytes).digest('hex'));
console.log(JSON.stringify({scope:'Read-only new-contract replay of recorded f07 data; not a fresh browser run',sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,sourceVerdict:doc.verdict,setup,cleanSynchronousBoundaries:r.boundaries.length,postwarmupWrites:[post.writes,r.saveEvidence.after.writes],rawSourceUnchanged:true,newBrowserSceneGate:'OPEN'},null,2));
