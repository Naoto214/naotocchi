// Scoped destructive assertions; row boundaries survive unrelated candidate insertions.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const file='character-3d/nonplayer-spec.js',suite='tests/character-3d-aquatic-partner-candidate-test.cjs',original=fs.readFileSync(file),factory='character-3d/soft-toy.mjs',factoryOriginal=fs.readFileSync(factory);
const run=pattern=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap',...(pattern?['--test-name-pattern='+pattern]:[]),suite],{encoding:'utf8',timeout:180000});
const cases=[
 ['spider hanging prop cannot fake support','knittingSpider','desertScorpion','y:.57083660364','y:.57913450718','source yarn ball','spider legs support the body at floor'],
 ['spider detached yarn ball','knittingSpider','desertScorpion','at:[.04,-.335,.15]','at:[.34,-.335,.15]','knitting_spider: resting','actual shell 0 reaches owner'],
 ['spider missing source yarn ball','knittingSpider','desertScorpion',"size:[.056,.056,.052]","size:[.006,.006,.006]",'source yarn ball','source ball is volumetric and round'],
 ['octopus inward terminal caps','rockOctopus','anglerfish','outwardCaps:true,radius:.065','outwardCaps:false,radius:.065','aquatic owned paths','outward terminal normal'],
 ['octopus eight curled arms','rockOctopus','anglerfish','i<8;i++','i<7;i++','rock_octopus original','eight original curled arms'],
 ['octopus detached sucker','rockOctopus','anglerfish','at:[xx,yy+.037,zz]','at:[xx+(j===0?.2:0),yy+.037,zz]','rock_octopus: resting','actual shell 0 reaches owner'],
 ['octopus orange red head','rockOctopus','anglerfish',"body:'#e95530',light:'#ff9870'","body:'#33334a',light:'#44445a'",'rock_octopus original','orange red mottled head'],
 ['angler long lure','anglerfish','swampCroc','[.19,.68,.025],[.36,.64,.07],[.43,.45,.08]','[.19,.38,.025],[.36,.34,.07],[.43,.25,.08]','anglerfish original','long arched lure'],
 ['angler detached bulb','anglerfish','swampCroc','at:[.43,.45,.08],segments:[12,8]','at:[.43,.95,.08],segments:[12,8]','anglerfish: resting','actual shell 0 reaches owner'],
 ['angler lure blocks canonical eye','anglerfish','swampCroc',"name:'lureBulb',bone:'lure',color:'#ffe49a'","name:'lureBulb',bone:'lure',at:[-.34,-.40,.22],color:'#ffe49a'",'anglerfish: one','source volume covers canonical eye'],
 ['angler four teeth','anglerfish','swampCroc','[-.12,-.09,.09,.12]','[-.12,.12]','anglerfish original','small pale teeth'],
 ['croc broad muzzle','swampCroc','knittingSpider','size:[.245,.085,.175]','size:[.08,.085,.065]','swamp_croc original','long broad rounded muzzle'],
 ['croc hindfoot detached','swampCroc','knittingSpider','feet:{at:[.22,-.29,.14]','feet:{at:[.22,-.29,.70]','swamp_croc: resting','actual shell 0 reaches owner'],
 ['croc segmented belly','swampCroc','knittingSpider','i<5;i++){const y=.20','i<4;i++){const y=.20','swamp_croc original','segmented pale throat belly'],
 ['spider eight jointed legs','knittingSpider','desertScorpion','i<4;i++)knittingSpider','i<3;i++)knittingSpider','knitting_spider original','eight purple jointed legs'],
 ['spider detached needle','knittingSpider','desertScorpion','[[-.105,-.08,.08],[.04,-.20,.15],[.18,-.29,.15]]','[[-.305,-.08,.08],[-.16,-.20,.15],[-.02,-.29,.15]]','knitting_spider: resting','actual shell 0 reaches owner'],
 ['spider detached yarn loop','knittingSpider','desertScorpion','const y=-.19-i*.014','const y=-.19-i*.014-(i===8?.15:0)','knitting_spider: resting','actual shell 8 reaches owner'],
 ['scorpion segmented body','desertScorpion','aquaticPartners','i<5;i++)desertScorpion','i<4;i++)desertScorpion','desert_scorpion original','gold body segments'],
 ['scorpion dark stinger','desertScorpion','aquaticPartners',"color:'#734017'","color:'#ffc94d'",'desert_scorpion original','dark terminal stinger'],
 ['scorpion detached stinger','desertScorpion','aquaticPartners',"name:'scorpionStinger',bone:'scorpionTail',color:'#734017'","name:'scorpionStinger',bone:'scorpionTail',at:[.20,0,0],color:'#734017'",'desert_scorpion: resting','actual shell 0 reaches owner'],
 ['scorpion detached pincer','desertScorpion','aquaticPartners','[[side*.32,-.11,.27],[side*.40,-.11,.38],[side*.33,-.105,.45]]','[[side*.62,-.11,.27],[side*.70,-.11,.38],[side*.63,-.105,.45]]','desert_scorpion: resting','actual shell 1 reaches owner']
];
const args=process.argv.slice(2);assert.ok(args.length<=1&&args.every(a=>a.startsWith('--case=')),'optional --case=<exact mutation name>');const selectedName=args[0]?.slice(7),selected=selectedName?cases.filter(c=>c[0]===selectedName):cases;assert.ok(selected.length,'known selected mutation');
const restored=()=>{assert.ok(fs.readFileSync(file).equals(original),'production source restored byte-for-byte');assert.ok(fs.readFileSync(factory).equals(factoryOriginal),'production factory restored byte-for-byte');};
const before=run(selectedName?selected[0][5]:'original|plush');assert.equal(before.status,0,before.stdout+before.stderr);
for(const [name,start,end,anchor,replacement,pattern,error]of selected){try{
 const target=start==='factory'?factory:file,bytes=start==='factory'?factoryOriginal:original,text=bytes.toString(),lo=start==='factory'?0:text.indexOf(' const '+start+'='),hi=start==='factory'?text.length:text.indexOf(' const '+end+'=',lo);assert.ok(lo>=0&&hi>lo,name+': named source row bounds');const scope=text.slice(lo,hi);assert.equal(scope.split(anchor).length,2,name+': unique scoped anchor');fs.writeFileSync(target,text.slice(0,lo)+scope.replace(anchor,replacement)+text.slice(hi));
 const result=run(pattern);assert.equal(result.status,1,`${name}: expected RED\n${result.stdout}${result.stderr}`);assert.ok(result.stdout.includes('AssertionError'),name+': actual assertion');assert.ok(result.stdout.includes(error),name+': expected assembled geometry failure');console.log(name+': RED');
 }finally{fs.writeFileSync(file,original);fs.writeFileSync(factory,factoryOriginal);restored();}}
const after=run(selectedName?selected[0][5]:undefined);assert.equal(after.status,0,after.stdout+after.stderr);restored();for(const [f,b]of [[file,original],[factory,factoryOriginal]])console.log(f+': original/restored SHA256 '+crypto.createHash('sha256').update(b).digest('hex'));console.log(selected.length+'/'+selected.length+' mutations detected; restored focused baseline GREEN; exact production bytes verified');
