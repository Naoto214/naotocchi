const fs=require('fs'),path=require('path'),cp=require('child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),test='tests/character-3d-humanoid-wave-test.cjs';
const cases=[
 ['candidate QA overlay','tools/character-3d/candidate-spec.cjs','...(${factory})(pilot)','...{}'],
 ['school hat volume','character-3d/archetypes.mjs',"if((sp.attachments||[]).includes('schoolHat'))extra.push","if(false)extra.push"],
 ['pacifier','character-3d/archetypes.mjs',"if((sp.attachments||[]).includes('pacifier'))","if(false)"],
 ['ground toy','character-3d/archetypes.mjs',"if((sp.attachments||[]).includes('groundToy'))","if(false)"],
 ['seated cloth','character-3d/archetypes.mjs','if(sp.poseProfile?.seated && sp.wardrobe?.skirt)','if(false)'],
 ['seated posture','character-3d/animate.mjs','if(meta.poseProfile?.seated)','if(false)'],
 ['held pet face','character-3d/archetypes.mjs',"rig.faceSpec=[rig.faceSpec,{...f,bone:","rig.faceSpec=[{...f,bone:"],
 ['chair walk transition','character-3d/animate.mjs','if(B.chair)B.chair.scale.multiplyScalar(Math.max(.001,rest));','if(B.chair)B.chair.scale.multiplyScalar(1);'],
 ['neutral eye asymmetry','character-3d/rig.mjs',"face.normalEye[m.userData.side<0?'left':'right']","face.normalEye.right"],
 ['jersey marking','character-3d/archetypes.mjs','if(sp.wardrobe?.number)','if(false)'],
 ['sports stride','character-3d/animate.mjs','if(meta.poseProfile?.stride)','if(false)'],
 ['skirt silhouette','character-3d/archetypes.mjs','if(sp.wardrobe?.skirt)','if(false)'],
 ['long hair volume','character-3d/archetypes.mjs','if(sp.hair.length)','if(false)'],
 ['shoulder bag grip','character-3d/archetypes.mjs',"rig.add('heldBag','armL',end","rig.add('heldBag','body',end"],
 ['hood volume','character-3d/archetypes.mjs',"if((sp.attachments||[]).includes('hood'))","if(false)"],
 ['sports prop','character-3d/archetypes.mjs',"if((sp.attachments||[]).includes('playBall'))","if(false)"],
 ['standing silhouette','character-3d/archetypes.mjs','(Lg.spread??0.42)','0.42'],
 ['short sleeve','character-3d/archetypes.mjs','sp.wardrobe?.sleeve &&','false &&'],
 ['short trousers','character-3d/archetypes.mjs','sp.wardrobe?.shorts &&','false &&'],
 ['held case grip','character-3d/archetypes.mjs',"rig.add('heldCase','armL',end","rig.add('heldCase','body',end"],
 ['signature pose','character-3d/animate.mjs','if(meta.poseProfile?.armSpread)','if(false)'],
];
const run=()=>cp.spawnSync(process.execPath,['--test',test,'tests/character-3d-candidate-spec-test.cjs'],{cwd:root,encoding:'utf8'});
const baseline=run();assert.equal(baseline.status,0,baseline.stdout+baseline.stderr);
for(const[name,file,old,replacement]of cases){const p=path.join(root,file),source=fs.readFileSync(p);try{assert.equal(source.toString().split(old).length,2);fs.writeFileSync(p,source.toString().replace(old,replacement));const r=run();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'),r.stdout);console.log(name+': RED');}finally{fs.writeFileSync(p,source);}}
console.log(cases.length+'/'+cases.length+' human mutations detected; original bytes restored');
