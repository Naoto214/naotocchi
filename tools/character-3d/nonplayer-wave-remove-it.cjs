const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap','tests/character-3d-nonplayer-wave-test.cjs'],{encoding:'utf8',timeout:15000});assert.equal(run().status,0);
const cases=[
 ['roof sealing tape','character-3d/rigid-object.mjs','for(const d of sp.details)','for(const d of sp.details.filter(d=>d.name!=="tape"))'],
 ['closed box depth','character-3d/rigid-object.mjs','new THREE.BoxGeometry(b.width,b.height,b.depth)','new THREE.BoxGeometry(b.width,b.height,.01)'],
 ['sunflower petal ring','character-3d/nonplayer-spec.js','petals:{count:20','petals:{count:0'],
 ['paired leaf arms','character-3d/nonplayer-spec.js',"return {\'companion:box\'","sunflower.foliage=[]; return {\'companion:box\'"]
];
for(const[name,file,old,replacement]of cases){const src=fs.readFileSync(file);try{assert.equal(src.toString().split(old).length,2);fs.writeFileSync(file,src.toString().replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,src);}}
console.log(cases.length+'/'+cases.length+' nonplayer wave mutations detected; original bytes restored');
