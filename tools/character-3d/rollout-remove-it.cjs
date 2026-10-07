// Real behavior mutations; restore exact production bytes on every exit path.
const fs=require('fs'),path=require('path'),cp=require('child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),test='tests/character-3d-rollout-test.cjs';
const cases=[
 ['worldtree runtime coverage','character-3d/rollout-spec.js',',world_tree:botanicalFactory(PILOT).world_tree','','reviewed world tree batch'],
 ['hermit runtime coverage','character-3d/rollout-spec.js',',hermit_crab:armoredFactory(PILOT).hermit_crab','','reviewed hermit batch'],
 ['antlion runtime coverage','character-3d/rollout-spec.js',',antlion:armoredFactory(PILOT).antlion','','reviewed antlion batch'],
 ['cicada runtime coverage','character-3d/rollout-spec.js',',cicada:armoredFactory(PILOT).cicada','','reviewed cicada batch'],
 ['sakura runtime coverage','character-3d/rollout-spec.js',',sakura:botanicalFactory(PILOT).sakura','','reviewed sakura batch'],
 ['beetle runtime coverage','character-3d/rollout-spec.js',',beetle:armoredFactory(PILOT).beetle','','reviewed beetle families'],
 ['stag runtime coverage','character-3d/rollout-spec.js',',stagbeetle:armoredFactory(PILOT).stagbeetle','','reviewed beetle families'],
 ['jellyfish runtime coverage','character-3d/rollout-spec.js',',jellyfish:aquaticFactory(PILOT).jellyfish','','reviewed jellyfish batch'],
 ['coral runtime coverage','character-3d/rollout-spec.js',',coral:aquaticFactory(PILOT).coral','','reviewed coral batch'],
 ['shell coverage','character-3d/rollout-spec.js',',turtle:topologyFactory(PILOT).turtle','','reviewed shell and crouched'],
 ['crouched coverage','character-3d/rollout-spec.js',',frog:topologyFactory(PILOT).frog','','reviewed shell and crouched'],
 ['fungus exact coverage','character-3d/rollout-spec.js',',mushroom:topologyFactory(PILOT).mushroom','','reviewed fungus and starfish'],
 ['starfish exact coverage','character-3d/rollout-spec.js',',starfish:topologyFactory(PILOT).starfish','','reviewed fungus and starfish'],
 ['butterfly runtime coverage','character-3d/rollout-spec.js',',butterfly:topologyFactory(PILOT).butterfly','','reviewed butterfly batch'],
 ['plant runtime coverage','character-3d/rollout-spec.js',',dandelion:topologyFactory(PILOT).dandelion','','reviewed dandelion batch'],
 ['human runtime coverage','character-3d/rollout-spec.js','...humanFactory(PILOT)','...{}','reviewed human batch'],
 ['stage completeness','tools/character-3d/stage-evidence.cjs','if(JSON.stringify([...expected].sort())!==JSON.stringify(Object.keys(records||{}).sort()))return false;','if(false)return false;','Meguru family shards'],
 ['same-source evidence','tools/character-3d/stage-evidence.cjs',"assert.equal(shard.sourceCommit,source,'source mismatch');",'', 'Meguru family shards'],
 ['exact age','character-3d/rollout-spec.js','return {dog,cat,penguin,','delete dog.stages[2]; return {dog,cat,penguin,','FR-1 exact'],
 ['signature paw','character-3d/animate.mjs','if (lifted && B[lifted])','if (false && B[lifted])','signature lifted'],
 ['stretch play','character-3d/animate.mjs',"pose === 'stretchPlay'","pose === 'removedStretch'",'signature lifted'],
 ['runtime exact dispatch','character-3d/spec.js','if (Object.hasOwn(ROLLOUT,id)) return ROLLOUT[id].stages[n] ? {id,stage:n,exact:true} : null;','if (Object.hasOwn(ROLLOUT,id)) return null;','reviewed exact stages'],
 ['ear asymmetry','character-3d/archetypes.mjs','...sp.ears.sides?.[s < 0 ? "left" : "right"]','...{}','asymmetric ears'],
 ['both wings','character-3d/archetypes.mjs',"sp.wingPose?.[s < 0 ? 'left' : 'right'] ??",'', 'asymmetric ears'],
 ['wrapped tail','character-3d/archetypes.mjs','wrap: [[0,0,0],[-tl*.32,-tr,-tl*.12],[-B.r*1.08,-B.r*.55,tl*.30],[-B.r*.92,-B.r*.62,tl*.68],[-B.r*.30,-B.r*.64,tl*.82],[B.r*.30,-B.r*.61,tl*.78]]','wrap: [[0,0,0],[0,0,-tl]]','FR-1 exact'],
];
const run=()=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap',test,'tests/character-3d-stage-evidence-test.cjs'],{cwd:root,encoding:'utf8'});
const baseline=run();assert.equal(baseline.status,0,baseline.stdout+baseline.stderr);
const originals=new Map(cases.map(([,f])=>[f,fs.readFileSync(path.join(root,f))]));
const restore=()=>{for(const[f,b]of originals)fs.writeFileSync(path.join(root,f),b);};
process.on('SIGINT',()=>{restore();process.exit(130);});process.on('SIGTERM',()=>{restore();process.exit(143);});
try{for(const[name,file,old,replacement,expected]of cases){const source=originals.get(file).toString();assert.equal(source.split(old).length,2);fs.writeFileSync(path.join(root,file),source.replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.split('\n').some(l=>l.startsWith('not ok ')&&l.includes(expected)),r.stdout);restore();console.log(name+': RED');}}finally{restore();}
console.log(cases.length+'/'+cases.length+' rollout mutations detected; original bytes restored');
