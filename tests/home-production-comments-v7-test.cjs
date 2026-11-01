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
