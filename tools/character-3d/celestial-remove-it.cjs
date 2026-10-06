const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap','tests/character-3d-celestial-test.cjs'],{encoding:'utf8'});assert.equal(run().status,0);
const cases=[
 ['feather tier pair','character-3d/celestial-humanoid.mjs','i<s.wings.length','i<s.wings.length-1'],
 ['open halo aperture','character-3d/celestial-humanoid.mjs','new THREE.TorusGeometry(q.radius,.012,6,40)','new THREE.SphereGeometry(q.radius,20,12)'],
 ['gold robe trim','character-3d/celestial-humanoid.mjs','if(s.trim)','if(false)'],
 ['curved feather depth','character-3d/celestial-humanoid.mjs','[side*x,y,z]','[side*x,y,0]'],
 ['long flowing ribbons','character-3d/celestial-humanoid.mjs','if(s.ribbons.length)','if(false)'],
 ['hidden elder legs','character-3d/celestial-humanoid.mjs','if(s.hideLegs)','if(false)'],
 ['owner wing motion','character-3d/animate.mjs','if(meta.celestialWings)','if(false)'],
 ['candidate god03','character-3d/mythic-spec.js','stages:{3:god3,7:god7}','stages:{7:god7}']
];
for(const[name,file,old,replacement]of cases){const src=fs.readFileSync(file);try{assert.equal(src.toString().split(old).length,2);fs.writeFileSync(file,src.toString().replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,src);}}
console.log(cases.length+'/'+cases.length+' celestial mutations detected; original bytes restored');
