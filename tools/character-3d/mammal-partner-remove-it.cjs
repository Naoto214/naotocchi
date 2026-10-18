// Scoped destructive assertions; row boundaries survive unrelated candidate insertions.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const file='character-3d/nonplayer-spec.js',suite='tests/character-3d-mammal-partner-candidate-test.cjs',original=fs.readFileSync(file),factory='character-3d/archetypes.mjs',factoryOriginal=fs.readFileSync(factory);
const run=pattern=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap',...(pattern?['--test-name-pattern='+pattern]:[]),suite],{encoding:'utf8',timeout:180000});
const cases=[
 ['cow black patches','fieldCow','forestBear',"patch:'#29262c',patch2:'#302b31'","patch:'#f7f1e5',patch2:'#f7f1e5'",'field_cow original','large black coat patches'],
 ['cow tan horns','fieldCow','forestBear',"color:'#d9bc89'","color:'#354f73'",'field_cow original','tan horns'],
 ['cow thin tufted tail','fieldCow','forestBear','[-.09,-.33,-.13],[-.12,-.47,-.14]','[-.09,-.12,-.13],[-.12,-.17,-.14]','field_cow: actual','actual cow tail tuft/shaft connection'],
 ['cow grass obstructs canonical eye','fieldCow','forestBear',"name:'mouthGrass',bone:'head',color:'#659337'","name:'mouthGrass',bone:'head',at:[-.03,.17,0],color:'#659337'",'field_cow: one','source volume covers canonical eye'],
 ['cow detached upper grass leaf','fieldCow','forestBear','size:[.053,.015,.014],at:[.245,-.125,.34],rotation:[0,0,-.55]','size:[.053,.015,.014],at:[.245,-.10,.34],rotation:[0,0,-.55]','field_cow: actual','actual cow grass leaf 0 reaches stem/head'],
 ['bear three toe pads','forestBear','groveDeer','volumes:[-1,0,1].map','volumes:[-1,1].map','forest_bear original','three original toe pads'],
 ['deer white dappled back','groveDeer','cliffGoat','i<9;i++)groveDeer.patchMap.body','i<0;i++)groveDeer.patchMap.body','grove_deer original','white upper-back dapples'],
 ['deer dapple surface sampling','groveDeer','cliffGoat','segments:[36,24]','segments:[20,14]','grove_deer original','white upper-back dapples'],
 ['quadruped unchanged defaults','factory','','B.segments?.[0]||20','B.segments?.[0]||18','optional quadruped body sampling','body/position: count'],
 ['goat back-curving horns','cliffGoat','gentleGorilla','[side*.08,.40,-.26],[side*.06,.38,-.38]','[side*.08,.40,-.08],[side*.06,.38,-.09]','cliff_goat original','long horns curve backward'],
 ['goat grounded rock','cliffGoat','gentleGorilla','at:[0,-.62,-.065]','at:[0,-.55,-.065]','cliff_goat original','owned angular rock rests on ground'],
 ['goat rock body connection','cliffGoat','gentleGorilla','path:[[0,.06,0],[-side*.04,.20,.02],[-side*.06,.30,.045]]','path:[[0,.06,0],[-side*.04,.02,.02],[-side*.06,0,.045]]','cliff_goat: actual','actual body/goatHind'],
 ['gorilla flower grip connection','gentleGorilla','mammalPartners','path:[[-.04,-.20,.20],[-.13,-.12,.23],[-.19,-.04,.23]]','path:[[-.04,-.20,.40],[-.13,-.12,.40],[-.19,-.04,.23]]','gentle_gorilla: actual','actual gorillaHandR/gorillaFlower'],
 ['gorilla yellow flower','gentleGorilla','mammalPartners',"color:'#f5d349'","color:'#334774'",'gentle_gorilla original','yellow flower petals']
];
const args=process.argv.slice(2);assert.ok(args.length<=1&&args.every(a=>a.startsWith('--case=')),'optional --case=<exact mutation name>');const selectedName=args[0]?.slice(7),selected=selectedName?cases.filter(c=>c[0]===selectedName):cases;assert.ok(selected.length,'known selected mutation');
const restored=()=>{assert.ok(fs.readFileSync(file).equals(original),'production source restored byte-for-byte');assert.ok(fs.readFileSync(factory).equals(factoryOriginal),'production factory restored byte-for-byte');};
const before=run(selectedName?selected[0][5]:'original|plush');assert.equal(before.status,0,before.stdout+before.stderr);
for(const [name,start,end,anchor,replacement,pattern,error]of selected){try{
 const target=start==='factory'?factory:file,bytes=start==='factory'?factoryOriginal:original,text=bytes.toString(),lo=start==='factory'?0:text.indexOf(' const '+start+'='),hi=start==='factory'?text.length:text.indexOf(' const '+end+'=',lo);assert.ok(lo>=0&&hi>lo,name+': named source row bounds');const scope=text.slice(lo,hi);assert.equal(scope.split(anchor).length,2,name+': unique scoped anchor');fs.writeFileSync(target,text.slice(0,lo)+scope.replace(anchor,replacement)+text.slice(hi));
 const result=run(pattern);assert.equal(result.status,1,`${name}: expected RED\n${result.stdout}${result.stderr}`);assert.ok(result.stdout.includes('AssertionError'),name+': actual assertion');assert.ok(result.stdout.includes(error),name+': expected assembled geometry failure');console.log(name+': RED');
 }finally{fs.writeFileSync(file,original);fs.writeFileSync(factory,factoryOriginal);restored();}}
const after=run(selectedName?selected[0][5]:undefined);assert.equal(after.status,0,after.stdout+after.stderr);restored();for(const [f,b]of [[file,original],[factory,factoryOriginal]])console.log(f+': original/restored SHA256 '+crypto.createHash('sha256').update(b).digest('hex'));console.log(selected.length+'/'+selected.length+' mutations detected; restored focused baseline GREEN; exact production bytes verified');
