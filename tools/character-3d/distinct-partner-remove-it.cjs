// Scoped destructive assertions; row boundaries survive unrelated candidate insertions.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const file='character-3d/nonplayer-spec.js',suite='tests/character-3d-distinct-partner-candidate-test.cjs',original=fs.readFileSync(file),factory='character-3d/plumed-bird.mjs',factoryOriginal=fs.readFileSync(factory);
const run=pattern=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap',...(pattern?['--test-name-pattern='+pattern]:[]),suite],{encoding:'utf8',timeout:180000});
const cases=[
 ['eagle cream head','highEagle','snowman',"face:'#fff2d6'","face:'#795439'",'high_eagle original','cream rounded head'],
 ['eagle dark outer tips','highEagle','snowman',"tip:i<3?null:'#574937'","tip:i<3?null:'#eee0ba'",'high_eagle original','dark terminal outer feather tips'],
 ['eagle detached primary feather','highEagle','snowman','[[0,.015-i*.024,0],[side*(.17+i*.035),-.09-i*.027,-.005],[side*(.26+i*.065),-.29-i*.017,.015]]','[[side*(i===6?1:0),.015-i*.024,0],[side*(.17+i*.035+(i===6?1:0)),-.09-i*.027,-.005],[side*(.26+i*.065+(i===6?1:0)),-.29-i*.017,.015]]','high_eagle: resting','actual shell 6 reaches owner'],
 ['eagle detached ruff feather','highEagle','snowman','const x=(i-3)*.025','const x=(i-3)*.025+(i===6?1:0)','high_eagle: resting','actual shell 8 reaches core'],
 ['eagle grounded talons detached from torso','highEagle','snowman','body:{y:.43,size:[.30,.39,.245]}','body:{y:.86,size:[.30,.39,.245]}','high_eagle: resting','actual shell 0 reaches owner'],
 ['eagle central hook covers canonical mouth','highEagle','snowman','[[.09,-.055,.13],[.18,-.04,.23],[.22,-.08,.28],[.20,-.12,.20]]','[[0,-.015,.14],[0,-.015,.255],[0,-.07,.285],[0,-.11,.235]]','high_eagle: one','source volume covers canonical feature'],
 ['eagle inward beak cap','highEagle','snowman','beak:{r:.052,outwardCaps:true','beak:{r:.052,outwardCaps:false','new exposed','outward terminal vertex normal'],
 ['snow detached base','snowman','distinctPartners','size:[.37,.315,.33],at:[0,-.285,-.015]','size:[.37,.315,.33],at:[0,-.70,-.015]','snowman: resting','actual shell 0 reaches owner'],
 ['snow detached hat','snowman','distinctPartners','at:[-.018,.255,-.01]','at:[-.018,.65,-.01]','snowman: resting','actual shell 0 reaches owner'],
 ['snow long red scarf','snowman','distinctPartners','[.075,-.31,.243]','[.075,-.08,.243]','snowman original','long red hanging scarf'],
 ['snow two chest buttons','snowman','distinctPartners',"{size:[.032,.034,.018],at:[-.012,.075,.252],segments:[12,8]},{size:[.032,.034,.018],at:[-.010,-.075,.252],segments:[12,8]}","{size:[.032,.034,.018],at:[-.012,.075,.252],segments:[12,8]}",'snowman original','two charcoal chest buttons'],
 ['snow three twig fingers','snowman','distinctPartners','...[-1,0,1].map','...[-1,1].map','snowman original','three closed terminal finger fans'],
 ['snow carrot covers canonical eye','snowman','distinctPartners',"name:'carrot',bone:'head',color:'#ec9434'","name:'carrot',bone:'head',at:[0,.12,0],color:'#ec9434'",'snowman: one','source volume covers canonical eye'],
 ['snow inward finger caps','snowman','distinctPartners','radius:.012,taper:.35,outwardCaps:true','radius:.012,taper:.35,outwardCaps:false','new exposed','outward terminal vertex normal'],
 ['plume legacy coat default preserved','factory','',':coat;});',":mix(coat,'#514130',.02);});",'optional plume','exact bytes']
];
const args=process.argv.slice(2);assert.ok(args.length<=1&&args.every(a=>a.startsWith('--case=')),'optional --case=<exact mutation name>');const selectedName=args[0]?.slice(7),selected=selectedName?cases.filter(c=>c[0]===selectedName):cases;assert.ok(selected.length,'known selected mutation');
const restored=()=>{assert.ok(fs.readFileSync(file).equals(original),'production source restored byte-for-byte');assert.ok(fs.readFileSync(factory).equals(factoryOriginal),'production factory restored byte-for-byte');};
const before=run(selectedName?selected[0][5]:'original|exposed|defaults');assert.equal(before.status,0,before.stdout+before.stderr);
for(const [name,start,end,anchor,replacement,pattern,error]of selected){try{
 const target=start==='factory'?factory:file,bytes=start==='factory'?factoryOriginal:original,text=bytes.toString(),lo=start==='factory'?0:text.indexOf(' const '+start+'='),hi=start==='factory'?text.length:text.indexOf(' const '+end+'=',lo);assert.ok(lo>=0&&hi>lo,name+': named source row bounds');const scope=text.slice(lo,hi);assert.equal(scope.split(anchor).length,2,name+': unique scoped anchor');fs.writeFileSync(target,text.slice(0,lo)+scope.replace(anchor,replacement)+text.slice(hi));
 const result=run(pattern);assert.equal(result.status,1,`${name}: expected RED\n${result.stdout}${result.stderr}`);assert.ok(result.stdout.includes('AssertionError'),name+': actual assertion');assert.ok(result.stdout.includes(error),name+': expected assembled geometry failure');console.log(name+': RED');
 }finally{fs.writeFileSync(file,original);fs.writeFileSync(factory,factoryOriginal);restored();}}
const after=run(selectedName?selected[0][5]:undefined);assert.equal(after.status,0,after.stdout+after.stderr);if(!selectedName)console.log(after.stdout);restored();for(const [f,b]of [[file,original],[factory,factoryOriginal]])console.log(f+': original/restored SHA256 '+crypto.createHash('sha256').update(b).digest('hex'));console.log(selected.length+'/'+selected.length+' mutations detected; restored focused baseline GREEN; exact production bytes verified');
