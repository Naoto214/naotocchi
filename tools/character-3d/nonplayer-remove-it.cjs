const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap','tests/character-3d-nonplayer-candidate-test.cjs'],{encoding:'utf8',timeout:10000});assert.equal(run().status,0);
const cases=[
 ['role namespaced key','character-3d/spec.js',"return {id:ref.kind+':'+ref.id,stage:0,exact:true}","return {id:ref.id,stage:0,exact:true}"],
 ['exact zero stage','character-3d/spec.js','return stage === 0 ? NON_PLAYER[id].spec : null','return NON_PLAYER[id].spec'],
 ['explicit role asset','character-3d/spec.js','return stage === 0 ? NON_PLAYER[id].asset : null',"return 'assets/characters/authors/naoto.png'"],
 ['QA served overlay','tools/character-3d/shot.cjs',"if(opts.nonPlayerFactory && req.url.split('?')[0] === '/character-3d/spec.js')","if(false)"]
];
for(const[name,file,old,replacement]of cases){const src=fs.readFileSync(file);try{assert.equal(src.toString().split(old).length,2);fs.writeFileSync(file,src.toString().replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,src);}}
console.log(cases.length+'/'+cases.length+' nonplayer mutations detected; original bytes restored');
