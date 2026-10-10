const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap','tests/character-3d-venus-stages-test.cjs'],{encoding:'utf8'});assert.equal(run().status,0);
const file='character-3d/botanical-spec.js',cases=[
 ['thin giant trap','giantCup.spec.body.depth=.20;',''],
 ['missing seed candidate','1:venusSeed,',''],
 ['extra cup face','giantCup,{at:[0,.35,.065]','{...giantCup,face:true},{at:[0,.35,.065]'],
 ['missing white flower','...venusFlowers,venusHead','...venusFlowers.slice(1),venusHead'],
 ['leaf grounding','q.at[1]+.045','q.at[1]'],
 ['missing insect face','scale:1,spec:insect','scale:1,face:false,spec:insect']
];
for(const[name,old,replacement]of cases){const src=fs.readFileSync(file);try{assert.equal(src.toString().split(old).length,2);fs.writeFileSync(file,src.toString().replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,src);}}
console.log(cases.length+'/'+cases.length+' Venus stage mutations detected; original bytes restored');
