const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap','tests/character-3d-spectral-test.cjs'],{encoding:'utf8'});assert.equal(run().status,0);
const cases=[
 ['closed body depth','character-3d/spectral.mjs','z*b.depth*q','z*.001'],
 ['curled spirit tail','character-3d/spectral.mjs','b.curl*Math.pow','0*Math.pow'],
 ['paired owned arms','character-3d/spectral.mjs','const side of [-1,1]','const side of []'],
 ['gold halo','character-3d/spectral.mjs','if(sp.halo)','if(false)'],
 ['open halo aperture','character-3d/spectral.mjs','new THREE.TorusGeometry(sp.halo.radius,.017,7,40)','new THREE.SphereGeometry(sp.halo.radius,20,12)'],
 ['four spirit flames','character-3d/spectral.mjs','sp.flames.entries()','[].entries()'],
 ['explicit ghost03','character-3d/mythic-spec.js','stages:{3:ghost3,7:ghost7}','stages:{7:ghost7}']
];
for(const[name,file,old,replacement]of cases){const src=fs.readFileSync(file);try{assert.equal(src.toString().split(old).length,2);fs.writeFileSync(file,src.toString().replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,src);}}
console.log(cases.length+'/'+cases.length+' spectral mutations detected; original bytes restored');
