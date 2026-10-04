// Sequential mutations of the quality mechanisms. Always restore exact bytes.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const file='tests/character-3d-quality3-test.cjs';
const cases=[
 ['pale connector','character-3d/spec.js','opacity: .22','opacity: 1','puff connector'],
 ['inner seam','character-3d/geometry.mjs','alpha=[0,0,.75,.55,0]','alpha=[.8,.85,.75,.55,0]','puff connector'],
 ['body limbs','character-3d/archetypes.mjs','if (sp.legs) for','if (false) for','winged insect limbs'],
 ['leg overlap','character-3d/archetypes.mjs','[[side*B.r*.35,originY,B.r*.45]','[[side*B.r*.65,originY,B.r*.8]','winged insect limbs'],
 ['eye profile','character-3d/rig.mjs','if(profile){','if(false){','feline normal eyes'],
 ['eye size','character-3d/spec.js','eyeX:29,eyeSize:.33','eyeX:29,eyeSize:.25','feline normal eyes'],
];
function run(){return cp.spawnSync(process.execPath,['--test','--test-reporter=tap',file],{cwd:root,encoding:'utf8'});}
const base=run();assert.equal(base.status,0,base.stdout+base.stderr);
const bytes=new Map(cases.map(([,f])=>[f,fs.readFileSync(path.join(root,f))]));
const restore=()=>{for(const [f,b]of bytes)fs.writeFileSync(path.join(root,f),b);};
process.on('SIGINT',()=>{restore();process.exit(130);});process.on('SIGTERM',()=>{restore();process.exit(143);});
try {
  for(const [name,f,old,replacement,expected]of cases){
    const original=bytes.get(f).toString();assert.equal(original.split(old).length,2,`${name}: unique mutation required`);
    fs.writeFileSync(path.join(root,f),original.replace(old,replacement));
    const result=run();
    assert.equal(result.status,1,`${name}: mutation escaped or runner failed\n${result.stdout}${result.stderr}`);
    assert.ok(result.stdout.split('\n').some(l=>l.startsWith('not ok ')&&l.includes(expected)),`${name}: intended test did not fail\n${result.stdout}`);
    assert.match(result.stdout,/# tests 3\b/,'complete suite must run');
    console.log(`${name}: RED (intended test detected removal)`);
    fs.writeFileSync(path.join(root,f),bytes.get(f));
  }
} finally {restore();}
console.log('6/6 mutations detected; originals restored');
