const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','tests/character-3d-jelly-wave-test.cjs'],{encoding:'utf8'});assert.equal(run().status,0);
const cases=[
 ['physical bell transparency','character-3d/jelly-organism.mjs',"'translucent:'+b.alpha","'opaque'"],
 ['connected tentacle groups','character-3d/jelly-organism.mjs','i<4;i++','i<0;i++'],
 ['owned appendage motion','character-3d/animate.mjs','(meta.tentacleGroups||0)','0']
];
for(const[name,file,old,replacement]of cases){const src=fs.readFileSync(file);try{assert.ok(src.toString().includes(old));fs.writeFileSync(file,src.toString().replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,src);}}
console.log(cases.length+'/'+cases.length+' jelly mutations detected; original bytes restored');
