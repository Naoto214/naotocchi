const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap','tests/character-3d-mythic-wave-test.cjs'],{encoding:'utf8'});assert.equal(run().status,0);
const cases=[
 ['visible muzzle mouth target','character-3d/winged-reptile.mjs','target:faceSurface','target:head'],
 ['non-overlapping scalloped membrane','character-3d/winged-reptile.mjs','curve(membraneGeometry(w))','curve(outlineLoft(w.outline,.011,36,4))'],
 ['membrane wing pair','character-3d/winged-reptile.mjs','if(sp.wing)for','if(false)for'],
 ['physical wing ribs','character-3d/winged-reptile.mjs','const path of w.fingers','const path of []'],
 ['curved membrane depth','character-3d/winged-reptile.mjs','w.bow*Math.sin','0*Math.sin'],
 ['belly plate geometry','character-3d/winged-reptile.mjs','i<belly.plates','i<0'],
 ['physical paired horns','character-3d/winged-reptile.mjs','const horn of sp.horns','const horn of []'],
 ['curled tail','character-3d/winged-reptile.mjs','sweep(sp.tail.path,','sweep([[0,0,0],[0,0,-.2]],'],
 ['owner wing motion','character-3d/animate.mjs','if(meta.membraneWings)','if(false)'],
 ['candidate overlay','tools/character-3d/candidate-spec.cjs',"'mythic'","'removed_mythic'"]
];
for(const[name,file,old,replacement]of cases){const src=fs.readFileSync(file);try{assert.equal(src.toString().split(old).length,2);fs.writeFileSync(file,src.toString().replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,src);}}
console.log(cases.length+'/'+cases.length+' mythic mutations detected; original bytes restored');
