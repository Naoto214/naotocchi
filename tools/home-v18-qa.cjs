// Builds disposable fixtures from exact production source. Does not ship in Pages.
const fs=require('fs'),path=require('path'),out=path.resolve(process.argv[2]);
// Synthetic seed only; never read a player's browser save.
if(!fs.existsSync(path.join(out,'pilot-seed.json'))){
 const h=require('../tests/helpers/runtime-harness.cjs').harness({deterministic:true}),seed=h.api.state();
 Object.assign(seed,{stage:'growing',speciesLine:'dog',stageIndex:3,regionId:'forest',hunger:85,happiness:85,energy:95,health:100,isSleeping:false,isSick:false,dying:false});
 Object.assign(seed.lifetime,{timeMode:'day',weatherMode:'sunny',seasonMode:'summer',money:3000,regionsVisited:['home','forest','river_lake','city']});
 fs.writeFileSync(path.join(out,'pilot-seed.json'),JSON.stringify(seed));
}
const baseline='264e0a7d0a893f5d993da7d3c8b3087a3baaa91f',git=require('child_process').execFileSync;
const original=f=>git('git',['show',baseline+':'+f],{encoding:'utf8',maxBuffer:8e6});
for(const f of ['home-diorama.js','home-diorama.css'])fs.writeFileSync(path.join(out,'v18-before-'+f),original(f));
fs.writeFileSync(path.join(out,'v18-before-qa-v16-diorama.js'),original('home-diorama.js').replace('return {model,update,sync,interrupt,','return {inspectScene:()=>scene,model,update,sync,interrupt,'));
let fixture=fs.readFileSync('tools/home-v17-fixture.js','utf8');
// v15 wrapper originally discarded the identity argument; this is QA only.
fixture=fixture.replace('function(text){choiceResult15(text);','function(text,speaker){choiceResult15(text,speaker);');
fixture=fixture.replace(/\}\)\(\);\s*$/,`
window.HomeV18QA=HomeV16QA;
Object.assign(HomeV18QA,{
 named(text,kind='pet'){this.prepare();const speaker=kind==='pet'?petSpeaker():kind==='partner'?partnerSpeaker():{kind:'companion',id:'shiba',label:allCompanionsById('shiba').name};setSpeechBubble(text,speaker,{holdMs:600000});},
 noticeText(text){this.prepare();setMessage(text);},
 questionTwo(){this.question();el.speechText.textContent='いっしょに歩く？';el.speechChoices.lastElementChild.remove();el.speechChoices.dataset.count='2';},
 reaction(){this.prepare();this.exchange();document.getElementById('individualityChoices').querySelector('button').click();clearTimeout(homeChoiceResultTimer);},
 longName(){this.prepare();if(state.partner){state.partner.label='とても長い名前のもりのクマさん';setSpeechBubble('いっしょに歩こう',partnerSpeaker(),{holdMs:600000});}},
 storyPet(){this.prepare();showStoryEvent({petReaction:true,message:'あくびの途中でねた'});},
 holdFrame(){clearTimeout(speechTimer);if(conv2Unit)conv2Unit.timers.forEach(t=>clearTimeout(t));},
 fontReload(){document.fonts.dispatchEvent(new Event('loadingdone'));},
});
})();`);
for(const before of [true,false]){
 let src=(before?original('script.js'):fs.readFileSync('script.js','utf8')).replaceAll('naotocchi-save-v1','naotocchi-home-v15-qa-v1').replace('function scheduleCompanionEncounter() {','function scheduleCompanionEncounter() { return;').replace('setInterval(loop, TICK_MS);','/* QA clock paused */').replace(/\}\)\(\);\s*$/,'');
 src=src.replace('function scheduleIdleGreeting() {','function scheduleIdleGreeting() { return;').replace('function scheduleIdlePerk() {','function scheduleIdlePerk() { return;');
 fs.writeFileSync(path.join(out,before?'v18-before-script.js':'qa-v18-script.js'),src+fixture);
 let html=(before?original('index.html'):require('./home-preview-entry.cjs')()).replace(/src="script.js[^\"]*"/,'src="'+(before?'v18-before-script.js':'qa-v18-script.js')+'"').replace(/src="home-diorama.js[^\"]*"/,'src="'+(before?'v18-before-qa-v16-diorama.js':'qa-v18-diorama.js')+'"').replace(/src="home-diorama-model.js[^\"]*"/,'src="qa-v15-model.js"');
 if(before)html=html.replaceAll('home-diorama.css','v18-before-home-diorama.css');
 fs.writeFileSync(path.join(out,before?'v18-before.html':'qa-v18-game.html'),html);
}
fs.writeFileSync(path.join(out,'qa-v18-diorama.js'),fs.readFileSync('home-diorama.js','utf8').replace('return {model,update,sync,interrupt,','return {inspectScene:()=>scene,model,update,sync,interrupt,'));
fs.writeFileSync(path.join(out,'qa-v15-model.js'),fs.readFileSync('home-diorama-model.js','utf8').replace('move,step,cancel','move,step:(dt,opts)=>step(dt,{...opts,autonomy:window.HomeV13Autonomy!==true?false:opts.autonomy}),cancel').replace('return {metrics:()=>','return {setFacing:(kind,direction)=>{for(const a of actors)if(a.kind===kind)a.direction=direction;},metrics:()=>'));
for(const f of ['home-diorama.js','home-diorama.css'])fs.copyFileSync(f,path.join(out,f));
fs.writeFileSync(path.join(out,'script.js'),fs.readFileSync('script.js','utf8').replaceAll('naotocchi-save-v1','naotocchi-home-diorama-preview-v1'));
fs.copyFileSync('index.html',path.join(out,'game.html'));
fs.copyFileSync('tools/home-v18-browser-check.js',path.join(out,'home-v18-browser-check.js'));
fs.copyFileSync('tools/home-v18-qa.html',path.join(out,'v18-qa.html'));
console.log('v18 exact source QA ready; v17 frozen.');
