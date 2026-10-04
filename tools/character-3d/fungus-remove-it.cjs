const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const file='character-3d/archetypes.mjs',source=fs.readFileSync(file),run=()=>cp.spawnSync(process.execPath,['--test','tests/character-3d-fungus-wave-test.cjs'],{encoding:'utf8'});
assert.equal(run().status,0);
const cases=[['mycelium form',"sp.form === 'mycelium'",'false'],['branch forks','[[.5,-1],[.72,1]]','[]'],['upturned profile',"cap.shape === 'upturned'",'false'],['scalloped collar','if (sp.collar)','if (false)'],['cap patches','cap.spots&&ny>.05','false&&ny>.05'],['cap face colour','return c.capFace?','return false?']];
for(const[name,old,replacement]of cases){try{assert.ok(source.toString().includes(old));fs.writeFileSync(file,source.toString().replaceAll(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,source);}}
console.log(cases.length+'/'+cases.length+' fungus mutations detected; original bytes restored');
