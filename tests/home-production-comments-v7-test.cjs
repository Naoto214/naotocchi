const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/runtime-harness.cjs');
function boot(){const h=harness({homeDiorama:true,productionHome:true,worldScene:true});h.document.body.dataset.homeProduction='true';Object.assign(h.api.state(),{stage:'growing',speciesLine:'salmon',stageIndex:0,hunger:100,health:100,energy:100,happiness:100,regionId:'forest'});return h;}
test('V7 native wrapping preserves authored text without Japanese phrase spans',()=>{
 const h=boot(),text='遊びの途中で、ふと何かを思い出したような顔をした';
 h.api.setMessage(text);assert.equal(h.get('message').textContent,text);assert.doesNotMatch(h.get('message').innerHTML,/notice-phrase/);
});
test('V7 character narration uses the lower lane without changing system milestone routing',()=>{
 const h=boot();h.api.showStoryEvent({message:'なでられて、目を細めた',petReaction:true,characterComment:true});
 assert.equal(h.get('storyFlash').dataset.comment,'true');assert.equal(h.get('storyFlash').parentNode.id,'homeCommentDock');
 assert.match(h.get('storyFlashEmoji').innerHTML,/lane-speaker-name/);assert.match(h.get('storyFlashEmoji').innerHTML,/assets\/characters\//);
 const s=boot();s.api.showStoryEvent({message:'20さいになった！',petReaction:true});
 assert.equal(s.get('storyFlash').dataset.comment,'false');assert.notEqual(s.get('storyFlash').parentNode?.id,'speechSlot');
});
test('V7 pet header has a separate small name, not a constrained pseudo label',()=>{
 const h=boot();h.api.setSpeechBubble('いましあわせ',{kind:'pet',label:'うまれたてのさけ'});
 assert.match(h.get('speechSpeaker').innerHTML,/lane-speaker-name/);assert.match(h.get('speechSpeaker').innerHTML,/うまれたてのさけ/);
 assert.equal(h.get('speechText').textContent,'いましあわせ');
});
test('V7 first encounter uses the candidate formal portrait before becoming a partner',()=>{
 const h=boot();h.api.state().partner=null;
 h.api.showStoryEvent({character:{id:'snow_spirit',label:'ゆきのせいれい',emoji:'❄️'},characterComment:true,message:'また会えたね'});
 assert.equal(h.get('storyFlash').dataset.comment,'true');
 assert.match(h.get('storyFlashEmoji').innerHTML,/assets\/characters\//);
 assert.doesNotMatch(h.get('storyFlashEmoji').innerHTML,/❄️/);
});
test('V7 actual court friend reply is lower with the candidate portrait, without becoming partners',()=>{
 const h=boot(),s=h.api.state();s.regionId='snow';s.partner=null;s.attractedTo=[];s.orientationId='aro';s.ageTicks=500;s.stageIndex=3;
 s.lifetime.partnerEncounters=h.api.REGIONS.find(r=>r.id==='snow').candidates.map(c=>c.id);s.achievementsUnlocked.push('age-10','age-25');
 h.sandbox.Math=Object.create(Math);h.sandbox.Math.random=()=>0;
 h.get('storyFlash').classList.add('hidden');h.api.render();h.get('courtBtn').disabled=false;h.dispatch(h.get('courtBtn'),'click');
 assert.equal(s.partner,null);assert.equal(h.get('homeActionComment').classList.contains('hidden'),false);
 assert.equal(h.get('storyFlash').classList.contains('hidden'),true,'reply does not create a semantic story');assert.match(h.get('homeActionSpeaker').innerHTML,/assets\/characters\//);
 assert.ok(h.get('homeActionText').textContent);assert.doesNotMatch(h.get('message').textContent,/友達|じゃあまたね/);
});
test('V7 existing notice queue preserves lower, system, lower event order and full durations',()=>{
 const h=boot();h.api.showStoryEvent({message:'一番目のひとこと',petReaction:true,characterComment:true});
 h.api.showStoryEvent({message:'進化のおしらせ',petReaction:true});h.api.showStoryEvent({message:'二番目のひとこと',petReaction:true,characterComment:true});
 assert.equal(h.get('storyFlash').dataset.comment,'true');h.advance(4199);assert.equal(h.get('storyFlashText').textContent,'一番目のひとこと');
 h.advance(1);assert.equal(h.get('storyFlashText').textContent,'進化のおしらせ');assert.equal(h.get('storyFlash').parentNode.id,'homeEventSlot');
 h.advance(4200);assert.equal(h.get('storyFlashText').textContent,'二番目のひとこと');assert.equal(h.get('storyFlash').parentNode.id,'homeCommentDock');
});

for(const reducedMotion of [false,true])for(const action of ['feed','medicine'])test(`V7 ${action} preserves care afterglow, reduced motion ${reducedMotion}`,()=>{
 const h=boot(),s=h.api.state();h.sandbox.matchMedia=()=>({matches:reducedMotion,addEventListener(){}});
 Object.assign(s,{speciesLine:'cat',stageIndex:5,ageTicks:500,hunger:action==='feed'?60:80,isSick:action==='medicine',health:70,energy:80,happiness:80,companions:[],partner:null});
 s.achievementsUnlocked.push('age-10','age-25','sick-cured-1');h.sandbox.Math=Object.create(Math);h.sandbox.Math.random=()=>0.55;
 h.get('storyFlash').classList.add('hidden');h.get('lifeCardOverlay').classList.add('hidden');h.api.render();
 h.dispatch(h.get(action+'Btn'),'click');h.advance(2700);
 assert.equal(h.get('petSprite').dataset.expression,'happy');
 assert.equal(h.get('storyFlash').classList.contains('hidden'),true,'plain action narration is not a semantic story');
 assert.equal(h.get('homeActionComment').classList.contains('hidden'),false);
 assert.match(h.get('homeActionSpeaker').innerHTML,/assets\/characters\/cat\//);
 h.api.showStoryEvent({message:'新しい出来事',petReaction:true});h.advance(100);
 assert.notEqual(h.get('petSprite').dataset.expression,'happy','a genuine story still interrupts the reaction');
});
test('V7 companion farewell keeps the companion name and official portrait below',()=>{
 const h=boot(),c=h.api.normalCompanions[0];h.api.setPendingCompanion(c.id);h.dispatch(h.get('companionInviteLaterBtn'),'click');
 assert.equal(h.get('homeActionComment').classList.contains('hidden'),false);
 assert.match(h.get('homeActionSpeaker').innerHTML,/assets\/characters\//);assert.ok(h.get('homeActionSpeaker').innerHTML.includes(c.name));
 assert.match(h.get('homeActionText').textContent,/またこんどね/);assert.doesNotMatch(h.get('message').textContent,/またこんどね/);
 h.api.setMessage('アイテムを手に入れた');assert.equal(h.get('homeActionComment').classList.contains('hidden'),true);assert.equal(h.get('message').textContent,'アイテムを手に入れた');
});
test('V7 guest candidate reply retains official personal portrait and name',()=>{
 const h=boot();h.api.state().guest={speciesLine:'cat',stageIndex:5,gender:'female',traitCounts:{}};
 h.api.showStoryEvent({character:{id:'guest',label:'おきゃくさん',emoji:'🐱'},characterComment:true,message:'また話そう'});
 assert.match(h.get('storyFlashEmoji').innerHTML,/assets\/characters\/cat\/06.png/);assert.match(h.get('storyFlashEmoji').innerHTML,/おきゃくさん/);
});
test('V7 critical notice defers the companion identity and restores the original message lifetime',()=>{
 const h=boot(),c=h.api.normalCompanions[0];h.api.setCriticalMessage('保存の確認が必要です');h.api.setPendingCompanion(c.id);h.dispatch(h.get('companionInviteLaterBtn'),'click');
 assert.equal(h.get('message').textContent,'保存の確認が必要です');assert.equal(h.get('homeActionComment').classList.contains('hidden'),true);
 h.advance(8000);assert.equal(h.get('homeActionComment').classList.contains('hidden'),false);assert.ok(h.get('homeActionSpeaker').innerHTML.includes(c.name));
 h.advance(5000);assert.equal(h.get('homeActionComment').classList.contains('hidden'),true);
});
