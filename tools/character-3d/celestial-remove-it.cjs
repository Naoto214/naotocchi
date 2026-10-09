const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap','tests/character-3d-celestial-test.cjs'],{encoding:'utf8'});assert.equal(run().status,0);
const cases=[
 ['short young robe','character-3d/mythic-spec.js','[[.001,.025],[.18,.025],[.235,-.045],[.26,-.07],[.255,-.085],[.001,-.085]],hem:[.26,-.075]','[[.001,.025],[.18,.025],[.24,-.13],[.29,-.17],[.285,-.19],[.001,-.19]],hem:[.29,-.175]'],
 ['feather tier pair','character-3d/celestial-humanoid.mjs','i<s.wings.length','i<s.wings.length-1'],
 ['open halo aperture','character-3d/celestial-humanoid.mjs','new THREE.TorusGeometry(q.radius,.012,6,40)','new THREE.SphereGeometry(q.radius,20,12)'],
 ['gold robe trim','character-3d/celestial-humanoid.mjs','if(s.trim)','if(false)'],
 ['curved feather depth','character-3d/celestial-humanoid.mjs','[side*x,y,z]','[side*x,y,0]'],
 ['long flowing ribbons','character-3d/celestial-humanoid.mjs','if(s.ribbons.length)','if(false)'],
 ['hidden elder legs','character-3d/celestial-humanoid.mjs','if(s.hideLegs)','if(false)'],
 ['owner wing motion','character-3d/animate.mjs','if(meta.celestialWings)','if(false)'],
 ['candidate god03','character-3d/mythic-spec.js','2:god2,3:god3,4:god4','2:god2,4:god4']
];
for(const[name,file,old,replacement]of cases){const src=fs.readFileSync(file);try{assert.equal(src.toString().split(old).length,2);fs.writeFileSync(file,src.toString().replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,src);}}
console.log(cases.length+'/'+cases.length+' celestial mutations detected; original bytes restored');
