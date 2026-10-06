const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','tests/character-3d-armored-wave-test.cjs','tests/character-3d-armored-juvenile-test.cjs'],{encoding:'utf8'});assert.equal(run().status,0);
const cases=[
 ['curved grub','character-3d/archetypes.mjs','sp.bodyPath || (sp.hang','(sp.hang'],
 ['thoracic feet','character-3d/archetypes.mjs','for(const t of sp.thoracicFeet||[])','for(const t of [])'],
 ['folded pupal legs','character-3d/archetypes.mjs','for(const points of sp.foldedLegs)','for(const points of [])'],
 ['developing pupal horn','character-3d/archetypes.mjs','if(sp.horn){organs.push','if(false){organs.push'],
 ['raised young covers','character-3d/armored-insect.mjs','side*(s.open||0)','0'],
 ['jaw face clearance','character-3d/armored-spec.js','[-.13,-.11,.11]','[-.13,.045,.11]'],
 ['six legs','character-3d/armored-insect.mjs','sp.legs.entries()','sp.legs.slice(0,4).entries()'],
 ['forked horn','character-3d/armored-insect.mjs','if(sp.horn){','if(false){'],
 ['paired mandibles','character-3d/armored-insect.mjs','for(const q of sp.mandibles)','for(const q of [])'],
 ['tripod motion','character-3d/animate.mjs','Math.sin(phase)*.24*m*k.amp','0'],
 ['candidate overlay','tools/character-3d/candidate-spec.cjs',"'armored'","'removed_armored'"]
];
for(const[name,file,old,replacement]of cases){const src=fs.readFileSync(file);try{assert.ok(src.toString().includes(old));fs.writeFileSync(file,src.toString().replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,src);}}
console.log(cases.length+'/'+cases.length+' armored mutations detected; original bytes restored');
