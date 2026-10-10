const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');
const run=()=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap','tests/character-3d-botanical-wave-test.cjs'],{encoding:'utf8'});assert.equal(run().status,0);
const cases=[
 ['rosette face clearance','character-3d/botanical-spec.js','leaf([-.25,.10,-.06],.11,.42,[.12,1.25,1.20]),leaf([.25,.10,-.06],.11,.44,[.12,-1.25,-1.20]),','leaf([-.10,.10,.08],.11,.42,[.12,1.25,1.20]),leaf([.10,.10,.08],.11,.44,[.12,-1.25,-1.20]),'],
 ['oriented trap geometry','character-3d/branch-organism.mjs','trapPlace(core);',''],
 ['oriented trap face','character-3d/branch-organism.mjs','if(sp.trap?.tilt){const e=','if(false){const e='],
 ['radial rosette side leaves','character-3d/botanical-spec.js','[.12,1.25,1.20]','[.12,0,1.20]'],
 ['brown root material','character-3d/branch-organism.mjs','p.color||c.branch','c.branch'],
 ['cupped trap depth','character-3d/branch-organism.mjs','1.6*(x*x+y*y)-.6','0'],
 ['physical trap teeth','character-3d/branch-organism.mjs','i<t.teeth','i<0'],
 ['five trap identities','character-3d/botanical-spec.js',' return {world_tree:',' venusTraps.colony.pop(); return {world_tree:'],
 ['broad rosette leaves','character-3d/botanical-spec.js','leaf([0,.12,-.10],.11,.62','leaf([0,.12,-.10],.02,.62'],
 ['winter terminal buds','character-3d/botanical-spec.js','b.bulb=2.15','b.bulb=1'],
 ['blunt winter tips','character-3d/botanical-spec.js','b.taper=.50','b.taper=.95'],
 ['original bud eyes','character-3d/botanical-spec.js',"[-.27,.77,-.015,.13,.23,'round']","[-.27,.77,-.015,.13,.23,'content']"],
 ['smooth pointed contour','character-3d/branch-organism.mjs','const q=1-y*y*b.taper','const q=1-Math.abs(y)*b.taper'],
 ['visible flower faces','character-3d/botanical-spec.js','at:[0,0,-.10],r,rotation:i','at:[0,0,-.035],r,rotation:i'],
 ['pointed seed and buds','character-3d/branch-organism.mjs','b.taper?blob(','false?blob('],
 ['side-facing leaf blades','character-3d/branch-organism.mjs','rot:leaf.tilt||[0,0,0]','rot:[0,0,leaf.tilt?.[2]||0]'],
 ['physical leaf crown','character-3d/branch-organism.mjs','for(const leaf of sp.foliage||[])','for(const leaf of [])'],
 ['suspended fruit attachment','character-3d/branch-organism.mjs','!sp.suspended&&u.at[1]','u.at[1]'],
 ['outward blossom orientation','character-3d/branch-organism.mjs','rot:f.tilt||[0,0,0]','rot:[0,0,0]'],
 ['physical flower canopy','character-3d/branch-organism.mjs','for(const f of sp.blossoms||[])','for(const f of [])'],
 ['trunk face','character-3d/branch-organism.mjs','center:[0,b.y,b.depth*.96]','center:[0,b.y+.6,b.depth*.96]'],
 ['botanical overlay','tools/character-3d/candidate-spec.cjs',"'botanical'","'removed_botanical'"]
];
for(const[name,file,old,replacement]of cases){const src=fs.readFileSync(file);try{assert.equal(src.toString().split(old).length,2);fs.writeFileSync(file,src.toString().replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'));console.log(name+': RED');}finally{fs.writeFileSync(file,src);}}
console.log(cases.length+'/'+cases.length+' botanical mutations detected; original bytes restored');
