const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','tests/character-3d-botanical-wave-test.cjs'],{encoding:'utf8'});assert.equal(run().status,0);
const cases=[
 ['outward blossom orientation','character-3d/branch-organism.mjs','rot:f.tilt||[0,0,0]','rot:[0,0,0]'],
 ['physical flower canopy','character-3d/branch-organism.mjs','for(const f of sp.blossoms||[])','for(const f of [])'],
 ['trunk face','character-3d/branch-organism.mjs','center:[0,b.y,b.depth*.96]','center:[0,b.y+.6,b.depth*.96]'],
 ['botanical overlay','tools/character-3d/candidate-spec.cjs',"'botanical'","'removed_botanical'"]
];
for(const[name,file,old,replacement]of cases){const src=fs.readFileSync(file);try{assert.equal(src.toString().split(old).length,2);fs.writeFileSync(file,src.toString().replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,src);}}
console.log(cases.length+'/'+cases.length+' botanical mutations detected; original bytes restored');
