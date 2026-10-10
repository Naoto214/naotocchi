const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','tests/character-3d-god-stages-test.cjs'],{encoding:'utf8'});assert.equal(run().status,0);
const cases=[
 ['visible staff finial','character-3d/celestial-humanoid.mjs',"[shaft,orb,rim],'opaque',[-s.armForward,0,-s.armAngle-.55]","[shaft,orb,rim]"],
 ['floating wing motion','character-3d/animate.mjs','  blobFloat(B, s, m, k, meta, R) {\n    celestialAppendages(B,s,m,k,meta);','  blobFloat(B, s, m, k, meta, R) {'],
 ['seed identity','character-3d/mythic-spec.js','1:god1,2:god2','1:god3,2:god2'],
 ['infant wing pair','character-3d/mythic-spec.js','wings:copy(infantWings)','wings:[]'],
 ['owned staff','character-3d/celestial-humanoid.mjs','if(s.staff)','if(false)'],
 ['radiant rebirth','character-3d/celestial-humanoid.mjs','if(o.rays)','if(false)'],
 ['staff bearer identity','character-3d/mythic-spec.js','4:god4,5:god5','4:god3,5:god5'],
 ['calm mature expression','character-3d/mythic-spec.js',"normalEye:'content',hair:{style:'swept',length:1.35","normalEye:'round',hair:{style:'swept',length:1.35"]
];
for(const[name,file,old,next]of cases){const original=fs.readFileSync(file);try{assert.equal(original.toString().split(old).length,2);fs.writeFileSync(file,original.toString().replace(old,next));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,original);}}
assert.equal(run().status,0);console.log(cases.length+'/'+cases.length+' God stage mutations detected; original bytes restored');
