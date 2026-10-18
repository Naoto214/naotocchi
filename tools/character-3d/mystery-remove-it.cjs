const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap','tests/character-3d-mystery-test.cjs'],{encoding:'utf8'});assert.equal(run().status,0);
const cases=[
 ['white eyes','character-3d/rig.mjs','const ink=profile?.ink||DARK;','const ink=DARK;'],
 ['eye cache separation','character-3d/rig.mjs',"const key = shape + ':' + side + (profile ? ':' + JSON.stringify(profile) : '');","const key = shape + ':' + side;"],
 ['closed body depth','character-3d/mystery-blob.mjs','y*b.height,z*b.depth','y*b.height,z*.01'],
 ['soft limbs','character-3d/mystery-blob.mjs','sp.limbs.entries()','[].entries()'],
 ['gold rays','character-3d/mystery-blob.mjs','sp.markers.entries()','[].entries()'],
 ['cyan edge','character-3d/mystery-blob.mjs','Math.pow(1-Math.abs(nz),3)*.95','0'],
 ['unknown03 candidate','character-3d/mythic-spec.js','2:unknown2,3:unknown3,4:unknown4','2:unknown2,4:unknown4']
];
for(const[name,file,old,replacement]of cases){const src=fs.readFileSync(file);try{assert.equal(src.toString().split(old).length,2);fs.writeFileSync(file,src.toString().replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,src);}}
assert.equal(run().status,0);console.log(cases.length+'/'+cases.length+' mystery mutations detected; original bytes restored');
