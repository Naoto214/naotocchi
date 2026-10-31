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
 conversationStatus(){return {context:conv2ContextOk(),canStart:conv2CanStart(),unit:conv2Unit?.kind,message,speechActive,busy:conversationIsBusy(),emotion:deriveHomeEmotion(),careAfterglow:!!careAfterglowTimer,petBusy:Date.now()<petBusyUntil,petMotion:!!castMotion?.isActive({kind:'pet'})};},
 question(){clearConversationTimers();message='';speechActive=false;conversationBusyUntil=0;petBusyUntil=0;if(careAfterglowTimer)clearTimeout(careAfterglowTimer);careAfterglowTimer=null;castMotion.clear();state.poopCount=0;state.isSleeping=false;state.isSick=false;state.hunger=state.happiness=state.energy=state.health=95;render();return conv2Ask(CONVERSATION_BANTER.QUESTIONS[0]);},
 egg(){state.stage=STAGE.EGG;state.regionId='home';state.companions=[];state.partner=null;homeCastLayoutKey='';render();}
};window.HomeV22QA=window.HomeReleaseQA;
// Observe the shipped controller without changing input, movement, or timers.
window.HomeReleaseInputTrace=[];
const recordInput=(type,extra={})=>{
 const d=HomeReleaseQA.detail(),a=d.actors[0],f=document.querySelector('.screen-frame');
 HomeReleaseInputTrace.push({type,at:performance.now(),...extra,blocked:d.blocked,paused:d.paused,selected:homeDiorama.model.selected(),pet:a,stage:d.slots.castStage,scroll:f.scrollTop,conversation:HomeReleaseQA.conversationStatus()});
 if(HomeReleaseInputTrace.length>120)HomeReleaseInputTrace.shift();
};
for(const name of ['select','move']){const original=homeDiorama.model[name];homeDiorama.model[name]=function(...args){const result=original.apply(this,args);recordInput(name,{args,result});return result;};}
for(const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,event=>recordInput(type,{x:event.clientX,y:event.clientY,target:event.target.id||event.target.className,actor:event.target.closest?.('[data-diorama-actor]')?.dataset.dioramaActor}),true);
})();`;
fs.writeFileSync(path.join(out,'release-qa-script.js'),script);
fs.writeFileSync(path.join(out,'release-qa-diorama.js'),fs.readFileSync('home-production-diorama.js','utf8').replace('return {model,update,sync,interrupt,','return {inspectScene:()=>scene,inspectWorld:()=>world?.stats(),model,update,sync,interrupt,'));
fs.writeFileSync(path.join(out,'release-qa.html'),fs.readFileSync('index.html','utf8').replaceAll('naotocchi-save-v1','naotocchi-home-release-qa-v1').replace(/src="script.js[^\"]*"/,'src="release-qa-script.js"').replace(/src="home-production-diorama.js[^\"]*"/,'src="release-qa-diorama.js"'));
fs.writeFileSync(path.join(out,'release-qa-seed.json'),JSON.stringify(seed));
