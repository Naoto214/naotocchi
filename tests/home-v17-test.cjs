const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/runtime-harness.cjs');
const home=require('../home-diorama.js');
const measure=(s,size)=>[...s].length*size;
test('v17 uses restrained fonts and tries readable single-line sizes before wrapping',()=>{
 assert.equal(home.textLayout('もうむり。ねる',220,'speech',measure).size,18);
 assert.equal(home.textLayout('おやすみモード',260,'notice',measure).size,17);
 assert.equal(home.textLayout('あくびに返事とられた',175,'speech',measure).lines,1);
});
function exchange(){const h=harness({deterministic:true,resume:true});h.api.hatchEgg();const s=h.api.state();Object.assign(s,{ageTicks:80,companions:[{id:'shiba',bond:80}],isSleeping:false,isSick:false});h.api.clearConversationTimers();h.api.closeAllMenuOverlays();h.get('storyFlash').classList.add('hidden');h.get('screenNormal').classList.remove('hidden');h.get('device').classList.add('ui-home-active');s.individuality.natural.kindness[0].push('shiba-walk');s.individuality.natural.kindness[2].push('shiba-pace');return h;}
test('exchange carries canonical companion identity through question and reaction without changing narrative or effects',()=>{
 const h=exchange();assert.ok(h.api.maybeIndividualExchange());const dialog=h.get('individualityDialog');assert.equal(dialog.dataset.speakerId,'shiba');
 assert.match(h.get('individualitySpeaker').innerHTML,/assets\/characters\/companions\/shiba/);
 const b=h.get('individualityChoices').children[0];assert.equal(b.onclick(),true);
 const result=h.get('homeChoiceResult');assert.equal(result.dataset.speakerId,'shiba');assert.equal(result.dataset.kind,'companion');
 assert.match(h.get('homeChoiceSpeaker').innerHTML,/assets\/characters\/companions\/shiba/);
 assert.equal(h.get('homeChoiceText').textContent,'言葉がなくても、気持ちよさが伝わった。');
 const after=JSON.stringify(h.api.state().individuality);assert.equal(b.onclick(),false);assert.equal(JSON.stringify(h.api.state().individuality),after);
});
test('system age outcome clears prior actor identity',()=>{
 const h=exchange();h.api.maybeIndividualExchange();h.get('individualityChoices').children[0].onclick();const s=h.api.state();h.api.INDIVIDUALITY.queue(s.individuality,0,3);assert.ok(h.api.showIndividualityEvent(true));assert.equal(h.get('individualityDialog').dataset.speakerId,'');h.get('individualityChoices').children[0].onclick();assert.equal(h.get('homeChoiceResult').dataset.speakerId,'');assert.equal(h.get('homeChoiceSpeaker').classList.contains('hidden'),true);
});
test('ordinary speech uses an official asset and updates identity per actual beat',()=>{
 const h=exchange();for(const [kind,id,label]of [['companion','shiba','ひとなつっこいしばいぬ'],['pet',null,'いぬ']]){h.api.setSpeechBubble('いっしょに歩こう',{kind,id,label});assert.equal(h.get('speechBubble').dataset.kind,kind);assert.equal(h.get('speechSpeaker').dataset.label,label);assert.match(h.get('speechSpeaker').innerHTML,/assets\/characters\//);}
});
test('new authored speech takes the lane after an exchange reaction',()=>{
 const h=exchange();h.api.maybeIndividualExchange();h.get('individualityChoices').children[0].onclick();assert.equal(h.get('homeChoiceResult').classList.contains('hidden'),false);
 h.api.setSpeechBubble('かむの忘れかけた',{kind:'pet',label:'いぬ'});
 assert.equal(h.get('homeChoiceResult').classList.contains('hidden'),true);
 assert.equal(h.get('speechBubble').classList.contains('hidden'),false);
 assert.equal(h.get('speechText').textContent,'かむの忘れかけた');
});
test('speech portrait resolves the expression started by this beat',()=>{
 const h=exchange();h.get('lifeCardOverlay').classList.add('hidden');Object.assign(h.api.state(),{stage:'growing',speciesLine:'dog',ageTicks:500,hunger:40,happiness:80,energy:80,health:80,deathMeter:0,dying:false,transformOptions:null,affectionStreak:0});h.api.render();
 h.api.setSpeechBubble('うれしい',{kind:'pet',label:'いぬ'},{event:'play_with'});
 assert.equal(h.get('petSprite').dataset.expression,'happy');
 assert.match(h.get('speechSpeaker').innerHTML,/06-happy/);
});
test('special author greeting has the canonical formal identity',()=>{
 const h=exchange();h.api.showStoryEvent({author:true,message:'ナオト「来てくれて、ありがとう。」'});
 assert.equal(h.get('storyFlash').dataset.speakerId,'naoto');assert.equal(h.get('storyFlashEmoji').dataset.label,'ナオト');assert.match(h.get('storyFlashEmoji').innerHTML,/assets\/characters\/author\/naoto.png/);
});
