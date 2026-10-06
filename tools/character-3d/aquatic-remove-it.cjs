const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','tests/character-3d-aquatic-wave-test.cjs'],{encoding:'utf8'});
assert.equal(run().status,0);
const cases=[
 ['colony face ownership','character-3d/branch-organism.mjs','if(u.face!==false)','if(false)'],
 ['anemone radial lobes','character-3d/branch-organism.mjs','if(sp.petals)','if(false)'],
 ['rooted branches','character-3d/branch-organism.mjs','for(const p of sp.branches)','for(const p of [])'],
 ['existing single-root locomotion','character-3d/branch-organism.mjs',"'branch_organism','plantSway'","'branch_organism','clusterBob'"],
 ['candidate route','tools/character-3d/candidate-spec.cjs',"['human','topology','aquatic']","['human','topology']"]
];
for(const [name,file,old,replacement]of cases){const source=fs.readFileSync(file);try{assert.ok(source.toString().includes(old));fs.writeFileSync(file,source.toString().replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,source);}}
console.log(cases.length+'/'+cases.length+' aquatic mutations detected; original bytes restored');
