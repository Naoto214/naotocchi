// Scoped destructive assertions; row boundaries survive unrelated candidate insertions.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const file='character-3d/nonplayer-spec.js',suite='tests/character-3d-humanoid-partner-candidate-test.cjs',original=fs.readFileSync(file),factory='character-3d/soft-toy.mjs',factoryOriginal=fs.readFileSync(factory);
const run=pattern=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap',...(pattern?['--test-name-pattern='+pattern]:[]),suite],{encoding:'utf8',timeout:180000});
const cases=[
 ['mermaid rejected pink top','seaMermaid','humanoidPartners',"color:'#329788',volumes:[{size:[.115,.195,.095],at:[0,-.015,0]}]","color:'#d44966',volumes:[{size:[.069,.065,.045],at:[-.055,.09,.075]},{size:[.069,.065,.045],at:[.055,.09,.075]}]",'sea_mermaid original','source teal bodice'],
 ['cat white formal shirt','catCeo','robotNeighbor',"color:'#f5f0df'","color:'#26303e'",'cat_ceo original','white shirt inside navy jacket'],
 ['cat pointed ears','catCeo','robotNeighbor','[side*.14,.30,-.025]','[side*.14,.17,-.025]','cat_ceo original','black pointed cat ears'],
 ['cat cup grip connection','catCeo','robotNeighbor',"name:'catCup',bone:'armL',at:[.09,-.062,.085]","name:'catCup',bone:'armL',at:[.32,-.062,.20]",'cat_ceo: resting','cat_ceo/catCup/catGripL'],
 ['cat curled tail','catCeo','robotNeighbor','[-.38,.26,-.07],[-.39,.16,-.06]','[-.15,.26,-.07],[-.16,.16,-.06]','cat_ceo original','long curled tail'],
 ['robot cream display','robotNeighbor','snowSpirit',"name:'robotDisplay',at:[0,-.005,.145],color:'#eeeccf'","name:'robotDisplay',at:[0,-.005,.145],color:'#448577'",'robot_neighbor original','cream front display'],
 ['robot detached antenna orb','robotNeighbor','snowSpirit','at:[-.06,.36,-.025]','at:[.40,.36,-.025]','robot_neighbor: resting','robot_neighbor/robotAntenna/body'],
 ['robot antenna obstructs canonical eye','robotNeighbor','snowSpirit','at:[-.06,.36,-.025]','at:[.065,.04,.215]','robot_neighbor: one','source volume covers canonical eye'],
 ['robot head neck chest connection','robotNeighbor','snowSpirit','size:[.08,.20,.08]','size:[.08,.08,.08]','robot_neighbor: resting','robot_neighbor/robotNeck/body'],
 ['robot leg chest connection','robotNeighbor','snowSpirit','[[side*.075,-.55,0],[side*.10,-.70,0]','[[side*.075,-.75,0],[side*.10,-.70,0]','robot_neighbor: resting','robot_neighbor/robotLegL/robotChest'],
 ['snow eight crown spikes','snowSpirit','seaMermaid','for(let i=0;i<8;i++)','for(let i=0;i<6;i++)','snow_spirit original','spiky ice flower crown'],
 ['snow detached dress petal','snowSpirit','seaMermaid',"color:i%2?'#e1f4ff':'#8fb7ed'});}","color:i%2?'#e1f4ff':'#8fb7ed'});}snowSpirit.details[2].paths[0].path=snowSpirit.details[2].paths[0].path.map(([x,y,z])=>[x+1,y,z]);",'snow_spirit: resting','snow_spirit/snowIcicleDress/body'],
 ['mermaid long teal hair','seaMermaid','humanoidPartners','[side*.23,-.48,-.02]','[side*.23,-.20,-.02]','sea_mermaid original','long teal hair'],
 ['mermaid pink fins','seaMermaid','humanoidPartners',"color:'#e486af'","color:'#398969'",'sea_mermaid original','pink fins'],
 ['mermaid original detached scale arches','seaMermaid','humanoidPartners','path:[[x-.019,y+.013,z-.04],[x,y,z+.003],[x+.019,y+.013,z-.04]]','path:[[x-.019,y+.013,z],[x,y,z+.003],[x+.019,y+.013,z]]','sea_mermaid: resting','sea_mermaid/mermaidScales/tail'],
 ['mermaid owned tail fins','seaMermaid','humanoidPartners',"name:side<0?'finL':'finR',bone:'tail',at:[.40,-.16,-.02]","name:side<0?'finL':'finR',bone:'tail',at:[.70,-.16,-.02]",'sea_mermaid: resting','sea_mermaid/finL/tail'],
 ['soft toy default gait preservation','factory','',"sp.locomotion||'waddle'","sp.locomotion||'swimHover'",'optional soft-toy swim','swimHover'],
 ['soft toy default hover preservation','factory','','hover:sp.hover||0','hover:sp.hover||.02','optional soft-toy swim','hover']
];
const args=process.argv.slice(2);assert.ok(args.length<=1&&args.every(a=>a.startsWith('--case=')),'optional --case=<exact mutation name>');const selectedName=args[0]?.slice(7),selected=selectedName?cases.filter(c=>c[0]===selectedName):cases;assert.ok(selected.length,'known selected mutation');
const restored=()=>{assert.ok(fs.readFileSync(file).equals(original),'production source restored byte-for-byte');assert.ok(fs.readFileSync(factory).equals(factoryOriginal),'production factory restored byte-for-byte');};
const before=run(selectedName?selected[0][5]:'original|optional soft-toy');assert.equal(before.status,0,before.stdout+before.stderr);
for(const [name,start,end,anchor,replacement,pattern,error]of selected){try{
 const target=start==='factory'?factory:file,bytes=start==='factory'?factoryOriginal:original,text=bytes.toString(),lo=start==='factory'?0:text.indexOf(' const '+start+'='),hi=start==='factory'?text.length:text.indexOf(' const '+end+'=',lo);assert.ok(lo>=0&&hi>lo,name+': named source row bounds');const scope=text.slice(lo,hi);assert.equal(scope.split(anchor).length,2,name+': unique scoped anchor');fs.writeFileSync(target,text.slice(0,lo)+scope.replace(anchor,replacement)+text.slice(hi));
 const result=run(pattern);assert.equal(result.status,1,`${name}: expected RED\n${result.stdout}${result.stderr}`);assert.ok(result.stdout.includes('AssertionError'),name+': actual assertion');assert.ok(result.stdout.includes(error),name+': expected assembled geometry failure');console.log(name+': RED');
 }finally{fs.writeFileSync(file,original);fs.writeFileSync(factory,factoryOriginal);restored();}}
const after=run(selectedName?selected[0][5]:undefined);assert.equal(after.status,0,after.stdout+after.stderr);restored();for(const [f,b]of [[file,original],[factory,factoryOriginal]])console.log(f+': original/restored SHA256 '+crypto.createHash('sha256').update(b).digest('hex'));console.log(selected.length+'/'+selected.length+' mutations detected; restored focused baseline GREEN; exact production bytes verified');
