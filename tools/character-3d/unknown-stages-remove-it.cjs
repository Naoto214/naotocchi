const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','tests/character-3d-unknown-stages-test.cjs'],{encoding:'utf8'});assert.equal(run().status,0);
const cases=[
 ['floating wings','character-3d/mystery-blob.mjs',"r.meta.celestialWings=['mysteryWingL','mysteryWingR']","r.meta.celestialWings=[]"],
 ['seed identity','character-3d/mythic-spec.js','1:unknown1,2:unknown2','1:unknown3,2:unknown2'],
 ['blue dome','character-3d/mythic-spec.js','2:unknown2,3:unknown3','2:unknown3,3:unknown3'],
 ['paired antennae','character-3d/mystery-blob.mjs','(sp.antennae||[])','[]'],
 ['attached wings','character-3d/mystery-blob.mjs','if(sp.wings)for','if(false)for'],
 ['tall spirit','character-3d/mythic-spec.js','6:unknown6,7:unknown7','6:unknown3,7:unknown7'],
 ['rebirth curl','character-3d/mystery-blob.mjs','if(sp.curl)','if(false)']
];
for(const[name,file,old,next]of cases){const original=fs.readFileSync(file);try{assert.equal(original.toString().split(old).length,2);fs.writeFileSync(file,original.toString().replace(old,next));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,original);}}
assert.equal(run().status,0);console.log(cases.length+'/'+cases.length+' Unknown stage mutations detected; original bytes restored');
