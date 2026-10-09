const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const suite='tests/character-3d-small-mammal-candidate-test.cjs',spec='character-3d/nonplayer-spec.js',factory='character-3d/soft-toy.mjs';
const run=pattern=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap',...(pattern?['--test-name-pattern='+pattern]:[]),suite],{encoding:'utf8',timeout:60000});
const files=[spec,factory],originals=new Map(files.map(file=>[file,fs.readFileSync(file)])),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const restored=()=>{for(const [file,bytes]of originals)assert.ok(fs.readFileSync(file).equals(bytes),`${file}: restored source bytes`);};
const cases=[
 ['closed-expression eye clearance',spec,"name:'heldLeaf',bone:'body',at:[0,.08,.325],color:'#65852f'","name:'heldLeaf',bone:'head',at:[-.112,.05,.35],color:'#65852f'",'closed-expression eyes remain clear','closed-expression/positive/frame0'],
 ['rabbit long ear',spec,'size:[.074,.36,.052]','size:[.074,.08,.052]','rabbit has'],
 ['rabbit raised forefeet',spec,'arms:{at:[.245,.185,.235]','arms:{at:[.245,.04,.235]','rabbit has'],
 ['tanuki painted mask',spec,"angle:side*.50,color:'#4e3127'","angle:side*.50,color:'#f7e7ca'",'tanuki actual'],
 ['tanuki round tail',spec,'size:[.245,.225,.20]','size:[.08,.08,.08]','tanuki actual'],
 ['tanuki exposed held leaf',spec,"name:'heldLeaf',bone:'body',at:[0,.08,.325]","name:'heldLeaf',bone:'body',at:[0,.08,-.325]",'tanuki actual'],
 ['squirrel tall curl',spec,'path:[[0,0,0],[.26,.04,-.04],[.43,.30,-.09],[.40,.60,-.11],[.20,.74,-.10],[.045,.61,-.075],[.13,.48,-.055]]','path:[[0,0,0],[.12,.05,-.05],[.10,.10,-.05]]','squirrel has'],
 ['squirrel acorn cap',spec,"at:[0,.071,0],color:'#77502e'","at:[0,.071,0],color:'#d59c57'",'squirrel has'],
 ['hamster physical cheek pouches',factory,'(sp.cheeks||[]).map','[].map','hamster cheek'],
 ['panda resting ground contact',spec,'body:{size:[.37,.31,.32],y:.31,rotation:','body:{size:[.37,.31,.32],y:.40,rotation:','five candidates'],
 ['panda black feet',spec,"feet:{at:[.27,-.245,.22],size:[.15,.11,.20],color:'#343039'}","feet:{at:[.27,-.245,.22],size:[.15,.11,.20],color:'#fff7e9'}",'panda retains'],
 ['panda eye patches',spec,"angle:side*.32,color:'#35313a'","angle:side*.32,color:'#f8eedc'",'panda retains'],
 ['panda bamboo owner',spec,"name:'bamboo',bone:'armL'","name:'bamboo',bone:'body'",'panda retains'],
 ['squirrel mouth clearance',spec,"name:'heldAcorn',bone:'body',at:[-.23,.06,.35]","name:'heldAcorn',bone:'body',at:[-.17,.16,.37]",'squirrel: one canonical'],
 ['hamster mouth clearance',spec,'arms:{at:[.13,.155,.30]','arms:{at:[.115,.215,.35]','hamster: one canonical'],
 ['panda mouth clearance',spec,'at:[0,.44,.065],roll:-.08','at:[0,.41,-.075],roll:-.08','panda: one canonical']
];
const args=process.argv.slice(2);assert.ok(args.length<=1&&args.every(a=>a.startsWith('--case=')),'optional argument: --case=<exact mutation name>');
const selectedName=args[0]?.slice(7),selected=selectedName?cases.filter(c=>c[0]===selectedName):cases;assert.ok(selected.length>0,'selected mutation exists');
const baselinePattern=selectedName?selected[0][4]:undefined;
const before=run(baselinePattern);assert.equal(before.status,0,before.stdout+before.stderr);
for(const [name,file,anchor,replacement,pattern,expectedError]of selected){const bytes=originals.get(file);try{assert.equal(bytes.toString().split(anchor).length,2,`${name}: unique anchor`);fs.writeFileSync(file,bytes.toString().replace(anchor,replacement));const result=run(pattern);assert.equal(result.status,1,`${name}: expected assertion failure\n${result.stdout}${result.stderr}`);assert.ok(result.stdout.includes('AssertionError'),`${name}: failed with an assertion`);if(expectedError){assert.ok(result.stdout.includes(expectedError),`${name}: closed-expression eye failure`);assert.ok(result.stdout.includes('source volume covers canonical eye'),`${name}: obstruction detected by actual eye rays`);}console.log(name+': RED');}finally{fs.writeFileSync(file,bytes);restored();}}
restored();const after=run(baselinePattern);assert.equal(after.status,0,after.stdout+after.stderr);restored();
for(const [file,bytes]of originals)console.log(`${file}: original/restored SHA256 ${sha(bytes)}`);
console.log(`${selected.length}/${selected.length} small mammal mutations detected; baseline and restored suite GREEN; source bytes verified`);
