// Disposable synthetic fixture. Never ships in production Pages or reads a player's save.
const fs=require('fs'),path=require('path'),out=path.resolve(process.argv[2]);
if(!fs.existsSync(path.join(out,'pilot-seed.json'))){const s=require('../tests/helpers/runtime-harness.cjs').harness({deterministic:true}).api.state();Object.assign(s,{stage:'growing',speciesLine:'dog',stageIndex:3,ageTicks:25*20,regionId:'forest',hunger:85,happiness:85,energy:95,health:100,isSleeping:false,isSick:false});Object.assign(s.lifetime,{timeMode:'day',weatherMode:'sunny',seasonMode:'summer',money:3000,regionsVisited:['home','forest','river_lake','city']});fs.writeFileSync(path.join(out,'pilot-seed.json'),JSON.stringify(s));}
const fixture=fs.readFileSync('tools/home-v17-fixture.js','utf8').replace('function(text){choiceResult15(text);','function(text,speaker){choiceResult15(text,speaker);');
const extra=fs.readFileSync('tools/home-v20-fixture.js','utf8');
let src=fs.readFileSync('script.js','utf8').replaceAll('naotocchi-save-v1','naotocchi-home-v20-qa-v1').replace('setInterval(loop, TICK_MS);','/* synthetic QA clock paused */').replace(/\}\)\(\);\s*$/,'');
for(const name of ['scheduleCompanionEncounter','scheduleIdleGreeting','scheduleIdlePerk'])src=src.replace('function '+name+'() {','function '+name+'() { return;');
fs.writeFileSync(path.join(out,'qa-v20-script.js'),src+fixture.replace(/\}\)\(\);\s*$/,'')+extra+'\n})();');
fs.writeFileSync(path.join(out,'qa-v20-diorama.js'),fs.readFileSync('home-diorama.js','utf8').replace('return {model,update,sync,interrupt,','return {inspectScene:()=>scene,model,update,sync,interrupt,'));
fs.writeFileSync(path.join(out,'qa-v20-model.js'),fs.readFileSync('home-diorama-model.js','utf8').replace('move,step,cancel','move,step:(dt,opts)=>step(dt,{...opts,autonomy:window.HomeV13Autonomy===true}),cancel').replace('return {metrics:()=>','return {setFacing:(kind,direction)=>{for(const a of actors)if(a.kind===kind)a.direction=direction;},metrics:()=>'));
fs.writeFileSync(path.join(out,'qa-v20-game.html'),fs.readFileSync('index.html','utf8').replaceAll('naotocchi-save-v1','naotocchi-home-v20-qa-v1').replace(/src="script.js[^\"]*"/,'src="qa-v20-script.js"').replace(/src="home-diorama.js[^\"]*"/,'src="qa-v20-diorama.js"').replace(/src="home-diorama-model.js[^\"]*"/,'src="qa-v20-model.js"'));
for(const f of ['home-v20-qa.html','home-v20-browser-check.js'])fs.copyFileSync('tools/'+f,path.join(out,f));
console.log('v20 isolated fixture generated');
