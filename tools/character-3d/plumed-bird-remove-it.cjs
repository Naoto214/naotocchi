const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap','tests/character-3d-plumed-bird-test.cjs'],{encoding:'utf8'});assert.equal(run().status,0);
const cases=[
 ['source cream feather edges','character-3d/plumed-bird.mjs','q.edge?mix(base,q.edge,edge[i]):base','base'],
 ['physical crest','character-3d/plumed-bird.mjs','...sp.crest.map(plumeGeometry)','...[]'],
 ['curved plume paths','character-3d/plumed-bird.mjs','c=curve.getPoint(t)','c=new THREE.Vector3(0,t,0)'],
 ['layered wing feathers','character-3d/plumed-bird.mjs','sp.wings[name].map(plumeGeometry)','sp.wings[name].slice(0,1).map(plumeGeometry)'],
 ['splayed claw toes','character-3d/plumed-bird.mjs','const spread of [-1,0,1]','const spread of [0]'],
 ['owner tail movement','character-3d/animate.mjs','if(meta.featherTail)','if(false)'],
 ['aged source palette','character-3d/mythic-spec.js',"base:'#b7793a'","base:'#f68b21'"]
];
for(const[name,file,old,replacement]of cases){const src=fs.readFileSync(file);try{assert.equal(src.toString().split(old).length,2);fs.writeFileSync(file,src.toString().replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,src);}}
console.log(cases.length+'/'+cases.length+' plumed bird mutations detected; original bytes restored');
