const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/runtime-harness.cjs');

test('home comments resolve the named actor, including aliased residents, without choosing another speaker',()=>{
  const h=harness({deterministic:true}),s=h.api.state();
  Object.assign(s,{speciesLine:'dog',companions:[{id:'shiba'},{id:'koala'}],partner:{id:'ceo-cat'}});
  const before=JSON.stringify(s);
  for(const [actor,kind,id,portrait] of [
    ['pet:dog','pet','dog','/dog/'],['companion:shiba','companion','shiba','/companions/shiba'],
    [{kind:'companion',id:'snail'},'companion','snail','/companions/snail'],
    ['partner:cat_ceo','partner','cat_ceo','/partners/cat_ceo']
  ]){
    const speaker=h.api.homeParticipantSpeaker(actor),line=id+'からのひとこと';
    assert.ok(speaker);assert.ok(speaker.label);
    if(kind==='partner')assert.equal(speaker.label,'ビルのねこ社長');
    h.api.setSpeechBubble(line,speaker);
    assert.equal(h.get('speechBubble').dataset.speakerId,id);assert.equal(h.get('speechBubble').dataset.kind,kind);
    assert.equal(h.get('speechSpeaker').dataset.label,speaker.label);
    assert.ok(h.get('speechSpeaker').innerHTML.includes(portrait));assert.equal(h.get('speechText').textContent,line);
  }
  for(const stale of ['pet:cat','companion:otter','partner:forest_bear','accessory:hat'])assert.equal(h.api.homeParticipantSpeaker(stale),null);
  assert.equal(JSON.stringify(s),before);
});

test('an explicit story character owns the portrait even when also marked as a pet reaction',()=>{
  const h=harness({deterministic:true});
  h.api.showStoryEvent({character:{id:'anglerfish',label:'チョウチンアンコウ',emoji:'🐟'},petReaction:true,emoji:'🐟',message:'こっちだよ'});
  assert.equal(h.get('storyFlash').dataset.speakerId,'anglerfish');assert.equal(h.get('storyFlashEmoji').dataset.label,'チョウチンアンコウ');
  assert.match(h.get('storyFlashEmoji').innerHTML,/assets\/characters\/partners\/anglerfish/);
});
