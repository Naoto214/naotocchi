const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap','tests/character-3d-dragon-stages-test.cjs'],{encoding:'utf8'});assert.equal(run().status,0);
const cases=[
 ['explicit young stage','character-3d/mythic-spec.js','1:dragon1,2:dragon2,3:dragon3','2:dragon2,3:dragon3'],
 ['first small wings','character-3d/mythic-spec.js','wing:wingSize(.30)','wing:wingSize(1)'],
 ['happy fifth-stage face','character-3d/mythic-spec.js',"normalEye:'happy',wing:wingSize(1.10)","normalEye:'round',wing:wingSize(1.10)"],
 ['head-owned flame geometry','character-3d/winged-reptile.mjs','sp.breathFlames||[]','[]'],
 ['seated elder height','character-3d/mythic-spec.js','depth:.30,y:.56','depth:.30,y:.80'],
 ['elder sleepy eye identity','character-3d/mythic-spec.js',"const dragon8={...copy(dragon7),normalEye:'droop'","const dragon8={...copy(dragon7),normalEye:'round'"]
];
for(const[name,file,old,replacement]of cases){const src=fs.readFileSync(file);try{assert.equal(src.toString().split(old).length,2);fs.writeFileSync(file,src.toString().replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,src);}}
console.log(cases.length+'/'+cases.length+' dragon stage mutations detected; original bytes restored');
