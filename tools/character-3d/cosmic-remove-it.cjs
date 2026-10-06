const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap','tests/character-3d-cosmic-test.cjs'],{encoding:'utf8'});assert.equal(run().status,0);
const cases=[
 ['spiral orbital tubes','character-3d/cosmic.mjs','const o of sp.orbits','const o of []'],
 ['tilted orbital depth','character-3d/cosmic.mjs','rot:sp.orbitTilt','rot:[0,0,0]'],
 ['irregular flare volumes','character-3d/cosmic.mjs','const f of sp.flares','const f of []'],
 ['unobstructed canonical core face','character-3d/cosmic.mjs','parts=[core.clone()]','parts=[core.clone(),solid(xform(ellipsoid(.20,.18,.06,16,12),{pos:[0,0,sp.core.at[2]+.24]}),c.rim)]'],
 ['explicit star03','character-3d/mythic-spec.js','stages:{3:star3,7:star7}','stages:{7:star7}']
];
for(const[name,file,old,replacement]of cases){const src=fs.readFileSync(file);try{assert.equal(src.toString().split(old).length,2);fs.writeFileSync(file,src.toString().replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,src);}}
console.log(cases.length+'/'+cases.length+' cosmic mutations detected; original bytes restored');
