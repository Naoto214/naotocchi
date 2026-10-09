const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const suite='tests/character-3d-other-mammal-candidate-test.cjs',spec='character-3d/nonplayer-spec.js',factory='character-3d/soft-toy.mjs';
const run=pattern=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap',...(pattern?['--test-name-pattern='+pattern]:[]),suite],{encoding:'utf8',timeout:180000});
const files=[spec,factory],originals=new Map(files.map(file=>[file,fs.readFileSync(file)])),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const restored=()=>{for(const [file,bytes]of originals)assert.ok(fs.readFileSync(file).equals(bytes),`${file}: restored source bytes`);};
const cases=[
 ['closed-expression eye clearance',spec,"name:'heldStone',bone:'body',at:[0,.04,.365]","name:'heldStone',bone:'head',at:[-.09,.06,.30]",'closed-expression eyes remain clear','closed-expression/positive/frame0'],
 ['otter diagonal recline',spec,'size:[.29,.40,.25],y:.3761,rotation:[-.10,0,.50]','size:[.29,.40,.25],y:.3761,rotation:[-.10,0,0]','otter reclines'],
 ['otter exposed stone',spec,"name:'heldStone',bone:'body',at:[0,.04,.365]","name:'heldStone',bone:'body',at:[0,.04,-.365]",'otter reclines'],
 ['otter dark soles',spec,"pad:'#523122'","pad:'#ffeaca'",'otter reclines'],
 ['monkey raised palm',spec,'left:{at:[.285,.46,.035]','left:{at:[.285,.10,.035]','monkey has'],
 ['monkey tail curl',spec,'[-.49,.17,-.02],[-.47,.36,-.02],[-.27,.41,-.02],[-.21,.31,-.01]','[-.20,.05,-.02],[-.18,.10,-.02],[-.15,.12,-.02],[-.10,.08,-.01]','monkey has'],
 ['sheep layered wool',spec,'for(let j=0;j<3;j++)for(let i=0;i<12;i++)','for(let j=0;j<0;j++)for(let i=0;i<12;i++)','sheep has'],
 ['sheep ground hooves',spec,"arms:{at:[.29,-.31,-.13],size:[.063,.09,.072]","arms:{at:[.29,-.21,-.13],size:[.063,.09,.072]",'sheep has'],
 ['seal spotted back',spec,"for(const side of ['front','back'])seal.body.markings","for(const side of ['front','front'])seal.body.markings",'seal lies'],
 ['seal forked tail',spec,'volumes:[{size:[.065,.16,.045],at:[.055,.38,-.04],rotation:[0,0,.40]},{size:[.065,.16,.045],at:[.18,.36,-.04],rotation:[0,0,-.40]}]','volumes:[{size:[.05,.06,.045],at:[.12,.26,-.04]}]','seal lies'],
 ["seal no hind feet",spec,"feet:{enabled:false,at:[0,0,0]},muzzle:{size:[.11,.065,.055]","feet:{enabled:true,at:[.14,-.10,.10],size:[.07,.06,.08]},muzzle:{size:[.11,.065,.055]","seal lies"],
 ['seal physical whiskers',spec,'for(const side of [-1,1])for(let i=0;i<3;i++)seal.details','for(const side of [-1,1])for(let i=0;i<0;i++)seal.details','seal lies'],
 ['hedgehog tipped body spines',spec,"tip:'#f8dfb4'","tip:'#74472b'",'hedgehog carries'],
 ['hedgehog head spines',spec,'for(let j=0;j<3;j++)for(let i=0;i<16;i++)','for(let j=0;j<0;j++)for(let i=0;i<16;i++)','hedgehog carries'],
 ['preserved plush defaults',factory,'segments?.[0]||(markings?40:20)','segments?.[0]||(markings?40:18)','optional soft toy morphology']
];
const args=process.argv.slice(2);assert.ok(args.length<=1&&args.every(a=>a.startsWith('--case=')),'optional argument: --case=<exact mutation name>');
const selectedName=args[0]?.slice(7),selected=selectedName?cases.filter(c=>c[0]===selectedName):cases;assert.ok(selected.length>0,'selected mutation exists');
const baselinePattern=selectedName?selected[0][4]:undefined;
const before=run(baselinePattern);assert.equal(before.status,0,before.stdout+before.stderr);
for(const [name,file,anchor,replacement,pattern,expectedError]of selected){const bytes=originals.get(file);try{assert.equal(bytes.toString().split(anchor).length,2,`${name}: unique anchor`);fs.writeFileSync(file,bytes.toString().replace(anchor,replacement));const result=run(pattern);assert.equal(result.status,1,`${name}: expected assertion failure\n${result.stdout}${result.stderr}`);assert.ok(result.stdout.includes('AssertionError'),`${name}: failed with an assertion`);if(expectedError){assert.ok(result.stdout.includes(expectedError),`${name}: closed-expression eye failure`);assert.ok(result.stdout.includes('source volume covers canonical eye'),`${name}: obstruction detected by actual eye rays`);}console.log(name+': RED');}finally{fs.writeFileSync(file,bytes);restored();}}
restored();const after=run(baselinePattern);assert.equal(after.status,0,after.stdout+after.stderr);restored();
for(const [file,bytes]of originals)console.log(`${file}: original/restored SHA256 ${sha(bytes)}`);
console.log(`${selected.length}/${selected.length} other mammal mutations detected; baseline and restored suite GREEN; source bytes verified`);
