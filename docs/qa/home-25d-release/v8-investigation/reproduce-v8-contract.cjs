// Expected RED on V7 323debc3. This is an unresolved V8 acceptance reproducer, not a passing regression claim. Run from repository root.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('../../../../tests/helpers/runtime-harness.cjs');
function boot(){const h=harness({homeDiorama:true,productionHome:true,worldScene:true});h.document.body.dataset.homeProduction='true';Object.assign(h.api.state(),{stage:'growing',speciesLine:'woman',stageIndex:0,ageTicks:0,hunger:100,health:100,energy:100,happiness:100,regionId:'forest'});return h;}
test('V8 first-stage speaker uses the stage name without modifying the species identity',()=>{
 const h=boot();h.api.state().speciesLine='woman';h.api.render();
 h.api.showStoryEvent({message:'もう1さいだって！',petReaction:true,characterComment:true});
 assert.match(h.get('storyFlashEmoji').innerHTML,/あかちゃん/);
 assert.equal(h.api.state().speciesLine,'woman');
});
test('V8 ordinary speech queues three authored comments in arrival order',()=>{
 const h=boot(),speaker={kind:'pet',label:'あかちゃん'};
 for(const text of ['一番目','二番目','三番目'])h.api.setSpeechBubble(text,speaker);
 assert.equal(h.get('speechText').textContent,'一番目');
 h.advance(2500);assert.equal(h.get('speechText').textContent,'二番目');
 h.advance(2500);assert.equal(h.get('speechText').textContent,'三番目');
 h.advance(2500);assert.equal(h.get('speechBubble').classList.contains('hidden'),true);
});
