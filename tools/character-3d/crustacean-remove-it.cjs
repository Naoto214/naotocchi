const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap','tests/character-3d-crustacean-test.cjs'],{encoding:'utf8'});assert.equal(run().status,0);
const cases=[
 ['connected shell whorls','character-3d/coiled-shell.mjs','Math.pow(t,.65)','Math.pow(t,1.8)'],
 ['shell winding','character-3d/coiled-shell.mjs','a=(t-1)*Math.PI*2*e.turns','a=0'],
 ['open shell aperture','character-3d/coiled-shell.mjs','e.mouth[2]-.09','e.mouth[2]+.2'],
 ['stalk target projection','character-3d/armored-insect.mjs','if(stalkParts.length)head=merge','if(false)head=merge'],
 ['stalk facial layout','character-3d/armored-insect.mjs','if(sp.faceProfile)r.faceSpec','if(false)r.faceSpec'],
 ['paired claws','character-3d/armored-insect.mjs','(sp.claws||[]).entries()','[].entries()'],
 ['physical pincer fingers','character-3d/armored-insect.mjs','const finger of q.fingers','const finger of []'],
 ['empty shell clearance','character-3d/armored-spec.js','at:[-.55,.17,.49]','at:[-.55,.11,.49]'],
 ['rear foot clearance','character-3d/armored-spec.js','[-.27,-.22,-.12]','[-.27,-.24,-.12]']
];
for(const[name,file,old,replacement]of cases){const src=fs.readFileSync(file);try{assert.equal(src.toString().split(old).length,2);fs.writeFileSync(file,src.toString().replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,src);}}
console.log(cases.length+'/'+cases.length+' crustacean mutations detected; original bytes restored');
