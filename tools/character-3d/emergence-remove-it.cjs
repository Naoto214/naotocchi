const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const file='character-3d/archetypes.mjs',source=fs.readFileSync(file),run=()=>cp.spawnSync(process.execPath,['--test','tests/character-3d-emergence-wave-test.cjs'],{encoding:'utf8'});
assert.equal(run().status,0);
const cases=[['larval upright forebody','(sp.foreRise ?? 1.45)','1.45'],['larval foot rhythm','(sp.feetPerSection ?? 3)','3'],['larval neutral signature',"sp.normalEye ?? (sp.hang ? null : 'content')","(sp.hang ? null : 'content')"],['empty shell','if (sp.emergence)','if (false)'],['open shell front','28,.78,TAU-1.56','28,0,TAU'],['partly unfolded forewing','(Wg.foreScale ?? 1)','1'],['emergence neutral face',"sp.normalEye ?? 'content'","'content'"]];
for(const[name,old,replacement]of cases){try{assert.ok(source.toString().includes(old));fs.writeFileSync(file,source.toString().replaceAll(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,source);}}
console.log(cases.length+'/'+cases.length+' emergence mutations detected; original bytes restored');
