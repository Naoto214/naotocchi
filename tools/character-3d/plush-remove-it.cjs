const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap','tests/character-3d-plush-test.cjs'],{encoding:'utf8'});assert.equal(run().status,0);
const cases=[
 ['drooped mouth clearance','character-3d/mythic-spec.js','heart:{at:[0,.08,.255]','heart:{at:[0,.15,.255]'],
 ['owned heart prop','character-3d/soft-toy.mjs','if(sp.heart)','if(false)'],
 ['solid heart depth','character-3d/soft-toy.mjs','depth:.085','depth:.001'],
 ['physical round ears','character-3d/soft-toy.mjs','const e of sp.ears','const e of []'],
 ['conforming head patch','character-3d/soft-toy.mjs',"sp.patches.filter(q=>q.bone==='head')","sp.patches.filter(q=>q.bone==='removed')"],
 ['physical patch stitches','character-3d/soft-toy.mjs','if(stitched)','if(false)'],
 ['explicit plush03','character-3d/mythic-spec.js','stages:{1:plush1,2:plush2,3:plush3,4:plush4,5:plush5,6:plush6,7:plush7,8:plush8}','stages:{7:plush7}']
];
for(const[name,file,old,replacement]of cases){const src=fs.readFileSync(file);try{assert.equal(src.toString().split(old).length,2);fs.writeFileSync(file,src.toString().replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,src);}}
console.log(cases.length+'/'+cases.length+' plush mutations detected; original bytes restored');
