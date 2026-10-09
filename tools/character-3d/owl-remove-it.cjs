const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const file='tests/character-3d-owl-candidate-test.cjs';
const run=pattern=>cp.spawnSync(process.execPath,['--test',...(pattern?['--test-name-pattern='+pattern]:[]),file],{encoding:'utf8'});
assert.equal(run().status,0);
const cases=[
 ['closed feather replacement','character-3d/archetypes.mjs','W.plumes ?','false ?','exposed overlapping'],
 ['cream feather rims','character-3d/nonplayer-spec.js','"edge":"#d7a56e"','"edge":"#754328"','exposed overlapping',true],
 ['canonical mouth clearance','character-3d/nonplayer-spec.js','left:[-.275,.39,.15]','left:[-.23,.39,.15]','exposed overlapping'],
 ['physical shoulder attachment','character-3d/nonplayer-spec.js','left:[-.275,.39,.15]','left:[-.45,.39,.15]','closed volumes'],
 ['ear tufts','character-3d/archetypes.mjs','sp.earTufts||[]','[]','source candidate owns'],
 ['breast feathers','character-3d/archetypes.mjs','if(sp.featherMarks){','if(false){','source candidate owns'],
 ['held wing pose','character-3d/nonplayer-spec.js','wingPose:{left:2.12,right:.20}','wingPose:{left:.20,right:.20}','exposed overlapping'],
 ['default avian preservation','character-3d/archetypes.mjs','x * W.w * Math.sin','x * W.w * 1.05 * Math.sin','preserve every Pilot'],
 ['scoped capture','tools/character-3d/nonplayer-review.cjs','!keys.length||keys.includes(key)','true','scoped capture']
];
for(const[name,path,old,next,pattern,all]of cases){const orig=fs.readFileSync(path);try{assert.ok(orig.includes(old),name+' mutation target exists');if(!all)assert.equal(orig.toString().split(old).length,2);fs.writeFileSync(path,all?orig.toString().replaceAll(old,next):orig.toString().replace(old,next));const r=run(pattern);assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'),r.stdout+r.stderr);console.log(name+': RED');}finally{fs.writeFileSync(path,orig);}}
assert.equal(run().status,0);console.log(cases.length+'/'+cases.length+' owl mutations detected; original bytes restored');
