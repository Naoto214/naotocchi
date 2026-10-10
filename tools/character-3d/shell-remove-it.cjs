const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const file='character-3d/archetypes.mjs',source=fs.readFileSync(file),run=()=>cp.spawnSync(process.execPath,['--test','tests/character-3d-shell-wave-test.cjs'],{encoding:'utf8'});
assert.equal(run().status,0);
const cases=[['shell dome','if(sp.shell)','if(false)'],['earless profile',"E.type==='none'",'false'],['flat source face','Hd.flatFace','false'],['splayed feet','Lg.splay||0','0'],['scute boundaries','shellSeams(sh,c.seam)','solid(ellipsoid(.001,.001,.001),c.shell)'],['seam width','/length*.009','/length*.07'],['seam projection',')+.003',')-.1'],['old shell moss','sh.moss||[]','[]'],['withdrawn head','Hd.forward||0','0']];
for(const[name,old,replacement]of cases){try{assert.ok(source.toString().includes(old));fs.writeFileSync(file,source.toString().replaceAll(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,source);}}
console.log(cases.length+'/'+cases.length+' shell mutations detected; original bytes restored');
