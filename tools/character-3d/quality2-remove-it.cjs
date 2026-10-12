// Sequential mutations of the quality mechanisms. Always restore exact bytes.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const file='tests/character-3d-quality2-test.cjs';
const cases=[
 ['flat decal pass','character-3d/rig.mjs','forceSinglePass: true','forceSinglePass: false','projected face decals'],
 ['vertex alpha','character-3d/geometry.mjs','c?.itemSize===4?c.getW(j):1','1','merged soft geometry'],
 ['halo','character-3d/archetypes.mjs',"softHalo(r*1.52,key+':'+i)","null",'seed halo has'],
 ['rest pose','character-3d/animate.mjs',"pose === 'recline'","pose === 'disabledRecline'",'reclining feline'],
 ['suspension','character-3d/animate.mjs',"meta.hangY != null && B.body){hangingOffset","false){hangingOffset",'hanging pod'],
 ['hand attachment','character-3d/archetypes.mjs',"rig.add('cane','armR'","rig.add('cane','root'",'humanoid held'],
 ['tuft density','character-3d/rig.mjs','map:haloTexture()','map:null','shared halo material'],
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
    assert.match(result.stdout,/# tests 7\b/,'complete suite must run');
    console.log(`${name}: RED (intended test detected removal)`);
    fs.writeFileSync(path.join(root,f),bytes.get(f));
  }
} finally {restore();}
console.log('7/7 mutations detected; originals restored');
