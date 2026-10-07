const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap','tests/character-3d-plush-stages-test.cjs'],{encoding:'utf8'});assert.equal(run().status,0);
const file='character-3d/soft-toy.mjs',cases=[
 ['physical bow','if(sp.bow)','if(false)'],
 ['asymmetric paw',"sp.armSides?.[side<0?'left':'right']||sp.arms",'sp.arms'],
 ['raised seams',"function seamParts(q,size){","function seamParts(q,size){return [];"],
 ['cotton volumes','if(sp.stuffing)','if(false)'],
 ['foot repairs',"sp.patches.filter(q=>q.bone===(side<0?'footL':'footR'))",'[].filter(q=>true)'],
 ['scarf volume','if(sp.scarf)','if(false)']
];
for(const[name,old,replacement]of cases){const src=fs.readFileSync(file);try{assert.equal(src.toString().split(old).length,2);fs.writeFileSync(file,src.toString().replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,src);}}
console.log(cases.length+'/'+cases.length+' Plush stage mutations detected; original bytes restored');
