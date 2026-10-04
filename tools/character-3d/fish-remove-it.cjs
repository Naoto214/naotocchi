// Real behavior mutations; restore exact production bytes on every exit path.
const fs=require('fs'),path=require('path'),cp=require('child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),test='tests/character-3d-fish-wave-test.cjs';
const cases=[
 ['human QA composition','tools/character-3d/performance-mix.cjs',"standIns:['man:2','man:6','woman:2','woman:4','ren:3','ren:5','ren:8']","standIns:['dandelion:8']",'human-family performance'],
 ['school articulation','character-3d/animate.mjs','if(meta.swimSubrigs)','if(false)','school subrig tails'],
 ['QA composition','tools/character-3d/performance-mix.cjs',"standIns:['salmon:1','salmon:3','salmon:7','clownfish:5']","standIns:['dandelion:8']",'QA performance mix'],
 ['composition assertion','tools/character-3d/performance-mix.cjs','return JSON.stringify(Object.entries(actual||{}).sort())===JSON.stringify(Object.entries(expected).sort());','return true;','QA performance mix'],
 ['yolk volume','character-3d/archetypes.mjs','if(sp.yolk)','if(false)','fish wave identity'],
 ['parr markings','character-3d/archetypes.mjs','const marks=sp.sideMarks;','const marks=null;','fish wave identity'],
 ['small surface spots','character-3d/archetypes.mjs','if(sp.sideMarks?.spots)','if(false)','fish wave identity'],
 ['fork silhouette','character-3d/archetypes.mjs','sp.tail.fork ?','false ?','fish wave identity'],
 ['jaw volume','character-3d/archetypes.mjs','if(sp.jaw)','if(false)','fish wave identity'],
 ['pectoral connection','character-3d/archetypes.mjs','sp.fins.spread ? -sp.fins.spread : .5','.5','fish wave all original stages'],
 ['school faces','character-3d/archetypes.mjs','if(sp.school?.length)','if(false)','schooling attachment'],
];
const run=()=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap',test,'tests/character-3d-performance-mix-test.cjs'],{cwd:root,encoding:'utf8'});
const baseline=run();assert.equal(baseline.status,0,baseline.stdout+baseline.stderr);
const originals=new Map(cases.map(([,f])=>[f,fs.readFileSync(path.join(root,f))]));
const restore=()=>{for(const[f,b]of originals)fs.writeFileSync(path.join(root,f),b);};
process.on('SIGINT',()=>{restore();process.exit(130);});process.on('SIGTERM',()=>{restore();process.exit(143);});
try{for(const[name,file,old,replacement,expected]of cases){const source=originals.get(file).toString();assert.equal(source.split(old).length,2);fs.writeFileSync(path.join(root,file),source.replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.split('\n').some(l=>l.startsWith('not ok ')&&l.includes(expected)),r.stdout);restore();console.log(name+': RED');}}finally{restore();}
console.log(cases.length+'/'+cases.length+' fish mutations detected; original bytes restored');
