// Real behavior mutations; restore exact production bytes on every exit path.
const fs=require('fs'),path=require('path'),cp=require('child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),test='tests/character-3d-fish-wave-test.cjs';
const cases=[
 ['yolk volume','character-3d/archetypes.mjs','if(sp.yolk)','if(false)','fish wave identity'],
 ['parr markings','character-3d/archetypes.mjs','const marks=sp.sideMarks;','const marks=null;','fish wave identity'],
 ['fork silhouette','character-3d/archetypes.mjs','sp.tail.fork ?','false ?','fish wave identity'],
 ['jaw volume','character-3d/archetypes.mjs','if(sp.jaw)','if(false)','fish wave identity'],
 ['school faces','character-3d/archetypes.mjs','if(sp.school?.length)','if(false)','schooling attachment'],
];
const run=()=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap',test],{cwd:root,encoding:'utf8'});
const baseline=run();assert.equal(baseline.status,0,baseline.stdout+baseline.stderr);
const originals=new Map(cases.map(([,f])=>[f,fs.readFileSync(path.join(root,f))]));
const restore=()=>{for(const[f,b]of originals)fs.writeFileSync(path.join(root,f),b);};
process.on('SIGINT',()=>{restore();process.exit(130);});process.on('SIGTERM',()=>{restore();process.exit(143);});
try{for(const[name,file,old,replacement,expected]of cases){const source=originals.get(file).toString();assert.equal(source.split(old).length,2);fs.writeFileSync(path.join(root,file),source.replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.split('\n').some(l=>l.startsWith('not ok ')&&l.includes(expected)),r.stdout);restore();console.log(name+': RED');}}finally{restore();}
console.log(cases.length+'/'+cases.length+' fish mutations detected; original bytes restored');
