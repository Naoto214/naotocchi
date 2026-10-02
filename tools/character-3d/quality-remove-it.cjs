// Sequential mutations of the quality mechanisms. Always restore exact bytes.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const file='tests/character-3d-quality-test.cjs';
const cases=[
  ['hair cap','character-3d/geometry.mjs','const r = radius *','const r = 0 *','hair cap covers'],
  ['play bow','character-3d/animate.mjs',"pose === 'playBow'","pose === 'disabledBow'",'dog play bow'],
  ['child face','character-3d/archetypes.mjs','if (childFace) rig.faceSpec =','if (false) rig.faceSpec =','both adult and child'],
  ['bubble positions','character-3d/archetypes.mjs','{pos:[x,y,z]}','{pos:[0,0,0]}','radial bubbles'],
  ['six puffs','character-3d/spec.js',"unit: 'seedPuff', count: 6","unit: 'seedPuff', count: 5",'all six dandelion'],
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
    assert.match(result.stdout,/# tests 5\b/,'complete suite must run');
    console.log(`${name}: RED (intended test detected removal)`);
    fs.writeFileSync(path.join(root,f),bytes.get(f));
  }
} finally {restore();}
console.log('5/5 mutations detected; originals restored');
