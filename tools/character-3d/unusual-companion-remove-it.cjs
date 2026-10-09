// Focused destructive checks: unique anatomy anchors, exact byte restoration.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const suite='tests/character-3d-unusual-companion-candidate-test.cjs',spec='character-3d/nonplayer-spec.js',rigid='character-3d/rigid-object.mjs',quad='character-3d/archetypes.mjs',cosmic='character-3d/cosmic.mjs';
const run=pattern=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap',...(pattern?['--test-name-pattern='+pattern]:[]),suite],{encoding:'utf8',timeout:180000});
const originals=new Map([spec,rigid,quad,cosmic].map(file=>[file,fs.readFileSync(file)])),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const restored=()=>{for(const [file,bytes]of originals)assert.ok(fs.readFileSync(file).equals(bytes),file+': restored production bytes');};
const cases=[
 ['statue tall head',spec,'width:.48,height:.72,depth:.36','width:.48,height:.32,depth:.36','sekizou has'],
 ['statue block nose',spec,'size:[.075,.29,.12]','size:[.075,.09,.12]','sekizou has'],
 ['statue ground pedestal',spec,"name:'pedestal',at:[0,-.77,0]","name:'pedestal',at:[0,-.70,0]",'sekizou has'],
 ['statue projected lower lip',spec,"targetDetails:['stoneLip']","targetDetails:[]",'sekizou:','source volume covers canonical feature'],
 ['statue pedestal connection',spec,'size:[.235,.27,.17]','size:[.235,.225,.17]','sekizou actual volumes','pedestal/stoneTorso'],
 ['statue lip connection',spec,"name:'stoneLip',at:[0,-.26,.21],color:'#868d99',boxes:[{size:[.17,.075,.125]","name:'stoneLip',at:[0,-.26,.225],color:'#868d99',boxes:[{size:[.17,.075,.095]",'sekizou actual volumes','body/stoneLip'],
 ['statue left hand connection',spec,"name:'handL',at:[-.15,-.47,.18],color:'#8b929e',volumes:[{size:[.075,.095,.115]","name:'handL',at:[-.17,-.47,.21],color:'#8b929e',volumes:[{size:[.075,.095,.09]",'sekizou actual volumes','stoneTorso/handL'],
 ['statue right hand connection',spec,"name:'handR',at:[.15,-.47,.18],color:'#8b929e',volumes:[{size:[.075,.095,.115]","name:'handR',at:[.17,-.47,.21],color:'#8b929e',volumes:[{size:[.075,.095,.09]",'sekizou actual volumes','stoneTorso/handR'],
 ['unicorn owned horn',spec,"name:'horn',bone:'head'","name:'horn',bone:'body'",'unicorn has'],
 ['unicorn gold horn',spec,"color:'#e9be4b'","color:'#658dde'",'unicorn has'],
 ['unicorn swept hair',spec,'for(let i=0;i<5;i++){const x=(i-2)*.025;unicorn.details','for(let i=0;i<0;i++){const x=(i-2)*.025;unicorn.details','unicorn has'],
 ['unicorn tail curl',spec,'[x-.25,.36,-.35],[x-.07,.43,-.46],[x+.07,.26,-.39]','[x-.25,.06,-.35],[x-.07,.07,-.46],[x+.07,.06,-.39]','unicorn has'],
 ['fox pointed ears',spec,'for(const side of [-1,1]){manyTailFox.details','for(const side of []){manyTailFox.details','many_tail_fox sits'],
 ['fox six source tails',spec,'of foxFan.entries())manyTailFox.details','of foxFan.slice(0,5).entries())manyTailFox.details','many_tail_fox sits'],
 ['fox cream tail tips',spec,"tip:'#fff0ce'","tip:'#dc7429'",'many_tail_fox sits'],
 ['watcher single projection',spec,'eyeX:48,eyeY:64,mouthY:102','eyeX:20,eyeY:64,mouthY:102','watcher is'],
 ['watcher missing projections',spec,'center:[.105,.18,.135]','center:[.6,.18,.135]','watcher:','source canonical eye count'],
 ['watcher closed eye clearance',spec,'watcher.flares.push({path,r});',"watcher.flares.push({path,r});watcher.flares.push({path:[[-.13,.18,.23],[.13,.18,.23]],r:.08});",'closed-expression watcher','watcher closed-expression/positive/frame0'],
 ['preserved rigid defaults',rigid,'Math.max(0,ny)*.5+Math.max(0,nz)*.12','Math.max(0,ny)*.6+Math.max(0,nz)*.12','optional unusual'],
 ['preserved quadruped defaults',quad,'const bodyY = Lg.len + B.r * 0.72','const bodyY = Lg.len + B.r * 0.74','optional unusual'],
 ['preserved cosmic defaults',cosmic,'ellipsoid(...sp.core.size,24,18)','ellipsoid(...sp.core.size,22,18)','optional unusual']
];
const args=process.argv.slice(2);assert.ok(args.length<=1&&args.every(a=>a.startsWith('--case=')),'optional argument: --case=<exact mutation name>');const selectedName=args[0]?.slice(7),selected=selectedName?cases.filter(c=>c[0]===selectedName):cases;assert.ok(selected.length,'selected mutation exists');const baselinePattern=selectedName?selected[0][4]:undefined;
const before=run(baselinePattern||'optional unusual');assert.equal(before.status,0,before.stdout+before.stderr);
for(const [name,file,anchor,replacement,pattern,error]of selected){const bytes=originals.get(file);if(!selectedName){const baseline=run(pattern);assert.equal(baseline.status,0,baseline.stdout+baseline.stderr);}try{assert.equal(bytes.toString().split(anchor).length,2,name+': unique anatomy anchor');fs.writeFileSync(file,bytes.toString().replace(anchor,replacement));const r=run(pattern);assert.equal(r.status,1,name+': expected assertion failure\n'+r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError'),name+': assertion detects actual assembled geometry');if(error)assert.ok(r.stdout.includes(error),name+': expected physical failure');console.log(name+': RED');}finally{fs.writeFileSync(file,bytes);restored();}}
restored();const after=run(baselinePattern);assert.equal(after.status,0,after.stdout+after.stderr);restored();for(const [file,bytes]of originals)console.log(file+': original/restored SHA256 '+sha(bytes));console.log(selected.length+'/'+selected.length+' unusual companion mutations detected; baseline and restored suite GREEN; production bytes verified');
