const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap','tests/character-3d-phoenix-stages-test.cjs'],{encoding:'utf8'});
assert.equal(run().status,0);
const cases=[
 ['chick identity','character-3d/mythic-spec.js','1:phoenix1,2:phoenix2','1:phoenix3,2:phoenix2'],
 ['second chick identity','character-3d/mythic-spec.js','2:phoenix2,3:phoenix3','2:phoenix3,3:phoenix3'],
 ['adult raised feathers','character-3d/mythic-spec.js','rise-i*.085','-rise-i*.085'],
 ['rebirth coal mound','character-3d/plumed-bird.mjs','if(sp.embers){','if(false){'],
 ['rebirth identity','character-3d/mythic-spec.js','8:phoenix8','8:phoenix3']
];
for(const [name,file,old,next]of cases){const original=fs.readFileSync(file);try{assert.equal(original.toString().split(old).length,2);fs.writeFileSync(file,original.toString().replace(old,next));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,original);}}
assert.equal(run().status,0);console.log(cases.length+'/'+cases.length+' Phoenix stage mutations detected; original bytes restored');
