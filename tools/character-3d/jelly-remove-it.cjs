const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','tests/character-3d-jelly-wave-test.cjs'],{encoding:'utf8'});assert.equal(run().status,0);
const cases=[
 ['continuous ephyra lobes','character-3d/aquatic-spec.js','petals:{count:8,width:.12,length:.28,depth:.14}','petals:{count:6,width:.12,length:.28,depth:.14}'],
 ['stacked stalk geometry','character-3d/branch-organism.mjs','sp.stemSegments||[]','[]'],
 ['detached ephyra motion','character-3d/branch-organism.mjs',"sp.locomotion||'plantSway'","'plantSway'"],
 ['face target','character-3d/jelly-organism.mjs','target:core,center:','target:bell,center:'],
 ['height bounded face','character-3d/jelly-organism.mjs','Math.min(b.radius*.53,b.height*.65)','b.radius*.9'],
 ['physical bell transparency','character-3d/jelly-organism.mjs',"'translucent:'+b.alpha","'opaque'"],
 ['connected tentacle groups','character-3d/jelly-organism.mjs','i<4;i++','i<0;i++'],
 ['owned appendage motion','character-3d/animate.mjs','(meta.tentacleGroups||0)','0']
];
for(const[name,file,old,replacement]of cases){const src=fs.readFileSync(file);try{assert.ok(src.toString().includes(old));fs.writeFileSync(file,src.toString().replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,src);}}
console.log(cases.length+'/'+cases.length+' jelly mutations detected; original bytes restored');
