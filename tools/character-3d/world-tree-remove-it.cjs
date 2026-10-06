const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap','tests/character-3d-world-tree-test.cjs'],{encoding:'utf8'});assert.equal(run().status,0);
const cases=[
 ['physical foliage crown','character-3d/branch-organism.mjs','const q of sp.canopy||[]','const q of []'],
 ['full crown depth','character-3d/branch-organism.mjs','z*q.size[2]*k','z*.001'],
 ['golden fruit volumes','character-3d/branch-organism.mjs','for(const f of sp.fruit||[])','for(const f of [])'],
 ['hanging fruit stalks','character-3d/branch-organism.mjs','parts.push(solid(sweep(f.stem,t=>.014*(1-t*.35),6,{steps:12}),f.stemColor));',''],
 ['explicit godly tree03','character-3d/botanical-spec.js','stages:{3:world3,7:world7}','stages:{7:world7}'],
 ['candidate botanical overlay','tools/character-3d/candidate-spec.cjs',"'botanical'","'removed_botanical'"]
];
for(const[name,file,old,replacement]of cases){const src=fs.readFileSync(file);try{assert.equal(src.toString().split(old).length,2);fs.writeFileSync(file,src.toString().replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,src);}}
console.log(cases.length+'/'+cases.length+' world-tree mutations detected; original bytes restored');
