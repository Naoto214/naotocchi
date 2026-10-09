// Focused destructive checks: every mutation is byte-restored before the next case.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const suite='tests/character-3d-birds-reptiles-candidate-test.cjs',spec='character-3d/nonplayer-spec.js',soft='character-3d/soft-toy.mjs',bird='character-3d/plumed-bird.mjs';
const run=pattern=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap',...(pattern?['--test-name-pattern='+pattern]:[]),suite],{encoding:'utf8',timeout:180000});
const files=[spec,soft,bird],originals=new Map(files.map(file=>[file,fs.readFileSync(file)])),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const restored=()=>{for(const [file,bytes]of originals)assert.ok(fs.readFileSync(file).equals(bytes),`${file}: restored source bytes`);};
const cases=[
 ['bat hanging pose',spec,'at:[0,-.48,.065],roll:0','at:[0,.48,.065],roll:0','bat hangs'],
 ['bat folded membrane length',spec,'size:[.12,.43,.06],roll:.28','size:[.12,.16,.06],roll:.28','bat hangs'],
 ['rooster red comb',spec,'for(let i=0;i<5;i++)chicken.crest','for(let i=0;i<0;i++)chicken.crest','chicken retains'],
 ['rooster curled tail',spec,'for(let i=0;i<7;i++){const s=(i-3)/3;chicken.tail','for(let i=0;i<0;i++){const s=(i-3)/3;chicken.tail','chicken retains'],
 ['rooster ground contact',spec,'spread:.13,y:.3445','spread:.13,y:.4445','five candidates'],
 ['penguin horizontal slide',spec,'size:[.29,.19,.49],y:.19','size:[.29,.49,.19],y:.49','penguin slides'],
 ['penguin rear feet',spec,'feet:{at:[.15,.015,-.48]','feet:{at:[.15,.015,.48]','penguin slides'],
 ['snail stalk eye target',spec,"targetDetails:['eyeStalks']","targetDetails:[]",'snail carries'],
 ['snail raised spiral',spec,'r=.025+.27*t;path.push','r=.025+.07*t;path.push','snail carries'],
 ['snail owned spiral',spec,"name:'shellSpiral',bone:'body'","name:'shellSpiral',bone:'head'",'snail carries'],
 ['snail triangle budget',spec,'segments:[16,12]','segments:[160,120]','five candidates'],
 ['chameleon high curl',spec,'[-.41,.52,-.32],[-.23,.66,-.32],[-.08,.53,-.30]','[-.41,.22,-.32],[-.23,.26,-.32],[-.08,.23,-.30]','chameleon has'],
 ['chameleon closed eye clearance',spec,"name:'glasses',bone:'head',color:'#353c2d',paths:[]","name:'glasses',bone:'head',color:'#353c2d',paths:[],volumes:[{size:[.13,.10,.04],at:[-.116,.044,.30]},{size:[.13,.10,.04],at:[.116,.044,.30]}]",'closed-expression chameleon','chameleon closed-expression/positive/frame0'],
 ['preserved plush defaults',soft,'segments?.[0]||(markings?40:20)','segments?.[0]||(markings?40:18)','optional soft toy morphology'],
 ['preserved bird defaults',bird,'sp.legs.y??.36*scale','sp.legs.y??.34*scale','optional bird foot placement']
];
const args=process.argv.slice(2);assert.ok(args.length<=1&&args.every(a=>a.startsWith('--case=')),'optional argument: --case=<exact mutation name>');
const selectedName=args[0]?.slice(7),selected=selectedName?cases.filter(c=>c[0]===selectedName):cases;assert.ok(selected.length>0,'selected mutation exists');
const baselinePattern=selectedName?selected[0][4]:undefined;
const before=run(baselinePattern);assert.equal(before.status,0,before.stdout+before.stderr);
for(const [name,file,anchor,replacement,pattern,error]of selected){const bytes=originals.get(file);try{assert.equal(bytes.toString().split(anchor).length,2,`${name}: unique anchor`);fs.writeFileSync(file,bytes.toString().replace(anchor,replacement));const result=run(pattern);assert.equal(result.status,1,`${name}: expected assertion failure\n${result.stdout}${result.stderr}`);assert.ok(result.stdout.includes('AssertionError'),`${name}: failed with assertion`);if(error)assert.ok(result.stdout.includes(error),`${name}: expected geometry-ray assertion`);console.log(name+': RED');}finally{fs.writeFileSync(file,bytes);restored();}}
restored();const after=run(baselinePattern);assert.equal(after.status,0,after.stdout+after.stderr);restored();
for(const [file,bytes]of originals)console.log(`${file}: original/restored SHA256 ${sha(bytes)}`);
console.log(`${selected.length}/${selected.length} birds/reptiles mutations detected; baseline and restored suite GREEN; source bytes verified`);
