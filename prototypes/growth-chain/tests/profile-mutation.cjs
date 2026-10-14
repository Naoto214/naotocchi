const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'naopoyo-profile-mut-'));
fs.mkdirSync(path.join(temp,'tests'));
for(const f of fs.readdirSync(root).filter(f=>f.endsWith('.mjs'))) fs.copyFileSync(path.join(root,f),path.join(temp,f));
fs.copyFileSync(path.join(__dirname,'player-profile.test.mjs'),path.join(temp,'tests/player-profile.test.mjs'));
const run=()=>spawnSync(process.execPath,['--test','tests/player-profile.test.mjs'],{cwd:temp,encoding:'utf8'});
try {
 assert.equal(run().status,0,'clean control');
 const cases=[['player-store.mjs','this.key = key','this.key = STORE_KEY','trial save isolation'],['player-profile.mjs','values.length === 1','values.length >= 1','ambiguous trial rejection'],['player-profile.mjs','trial ? Number(values[0]) : 8','trial ? Number(values[0]) : 2','standard 8/24']];
 for(const [file,from,to,label] of cases){const target=path.join(temp,file),s=fs.readFileSync(target,'utf8');assert.ok(s.includes(from));fs.writeFileSync(target,s.replace(from,to));assert.notEqual(run().status,0,'SURVIVED '+label);fs.writeFileSync(target,s);console.log('KILLED '+label);}
 console.log('3/3 profile mutants killed; clean baseline PASS');
} finally {fs.rmSync(temp,{recursive:true,force:true});}
