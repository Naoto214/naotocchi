// Disposable QA entry; never included in the production allowlist.
const fs=require('fs'),path=require('path');const out=path.resolve(process.argv[2]);
let script=fs.readFileSync('script.js','utf8').replaceAll('naotocchi-save-v1','naotocchi-home-release-qa-v1').replace('setInterval(loop, TICK_MS);','/* deterministic QA clock */').replace(/\}\)\(\);\s*$/,'');
const seed=require('../tests/helpers/runtime-harness.cjs').harness({deterministic:true}).api.state();
script+=`\nwindow.HomeReleaseQA={
 scene(region,count=6,time='day'){
 el.storyFlash.classList.add('hidden');el.lifeCardOverlay.classList.add('hidden');clearConversationTimers();message='';speechActive=false;conversationBusyUntil=0;petBusyUntil=0;castMotion.clear();
 Object.assign(state,{stage:STAGE.GROWING,speciesLine:'dog',stageIndex:3,ageTicks:25*AGE_TICKS_PER_YEAR,regionId:region,hunger:95,happiness:95,energy:95,health:100,isSleeping:false,isSick:false});
 const m=window.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;
 state.companions=[...m.companions.normal,...m.companions.rare].slice(0,Math.max(0,count-2)).map(c=>({id:c.id,bond:85}));
 const p=m.partners.find(p=>p.id==='forest_bear');state.partner=count>1?{...p,gender:'male',orientationId:'bi',label:p.name||p.label,affection:80,married:true,bondCount:3}:null;
 Object.assign(state.lifetime,{timeMode:time,weatherMode:'sunny',seasonMode:'summer'});
 homeCastLayoutKey='';render();homeDiorama.sync();return this.detail();
 },
 detail(){const s=homeDiorama.inspectScene();return {blocked:homeDioramaBlocked(),paused:el.castStage.dataset.dioramaPaused,world:homeDiorama.inspectWorld(),actors:homeDiorama.model.snapshot().map(a=>({...a,safe:s.navigation?.valid(a),ground:s.navigation?.unproject(a)})),slots:{castStage:el.castStage.getBoundingClientRect().toJSON(),notice:document.getElementById('homeEventSlot').getBoundingClientRect().height,speech:document.getElementById('speechSlot').getBoundingClientRect().height},metrics:homeDiorama.model.metrics()};},
 inspect(){const scene=homeDiorama.inspectScene();return {scene,bounds:homeDiorama.model.snapshot().map(a=>homeDiorama.model.bounds(a))};},
 move(){return (${require('./home-v8-qa-movement.cjs').toString()})(homeDiorama.model,homeDiorama.inspectScene().navigation);},
 save(){saveState();return JSON.parse(JSON.stringify(state));}, state:()=>JSON.parse(JSON.stringify(state)),
 question(){clearConversationTimers();speechActive=false;conversationBusyUntil=0;petBusyUntil=0;return conv2Ask(CONVERSATION_BANTER.QUESTIONS[0]);},
 egg(){state.stage=STAGE.EGG;state.regionId='home';state.companions=[];state.partner=null;homeCastLayoutKey='';render();}
};window.HomeV22QA=window.HomeReleaseQA;})();`;
fs.writeFileSync(path.join(out,'release-qa-script.js'),script);
fs.writeFileSync(path.join(out,'release-qa-diorama.js'),fs.readFileSync('home-production-diorama.js','utf8').replace('return {model,update,sync,interrupt,','return {inspectScene:()=>scene,inspectWorld:()=>world?.stats(),model,update,sync,interrupt,'));
fs.writeFileSync(path.join(out,'release-qa.html'),fs.readFileSync('index.html','utf8').replaceAll('naotocchi-save-v1','naotocchi-home-release-qa-v1').replace(/src="script.js[^\"]*"/,'src="release-qa-script.js"').replace(/src="home-production-diorama.js[^\"]*"/,'src="release-qa-diorama.js"'));
fs.writeFileSync(path.join(out,'release-qa-seed.json'),JSON.stringify(seed));
