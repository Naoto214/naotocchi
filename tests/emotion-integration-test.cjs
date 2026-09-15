const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const {harness} = require('./helpers/runtime-harness.cjs');

function renderNormal(h) {
  // The lightweight DOM does not parse index.html's initial hidden classes.
  h.get('storyFlash').classList.add('hidden');
  h.get('lifeCardOverlay').classList.add('hidden');
  h.get('speechBubble').classList.add('hidden');
  Object.assign(h.api.state(), {
    stage:'growing', hunger:80, happiness:80, energy:80, health:80,
    isSick:false, isSleeping:false, deathMeter:0, dying:false,
    transformOptions:null, affectionStreak:0,
  });
  h.api.render();
}

function renderEmotion(h, values) {
  renderNormal(h);
  Object.assign(h.api.state(), values);
  h.api.render();
  return h.api.homeEmotion();
}

test('home derives emotion without adding saved emotion fields', () => {
  const h=harness();
  const emotion=renderEmotion(h,{hunger:40});
  assert.equal(emotion.state,'hungry');
  assert.equal(emotion.severity,'mild');
  assert.equal(h.get('petSprite').dataset.emotionState,'hungry');
  assert.equal(h.get('petSprite').dataset.emotionSeverity,'mild');
  assert.equal(Object.hasOwn(h.api.state(),'emotion'),false);
  const serialized=JSON.parse(JSON.stringify(h.api.state()));
  assert.equal(Object.hasOwn(serialized,'emotion'),false);
  assert.equal(Object.hasOwn(serialized,'homeEmotion'),false);
});

test('home emotion follows canonical priority and pet availability', () => {
  const h=harness();
  const cases=[
    [{isSick:true,hunger:10},['sick','strong']],
    [{energy:40,hunger:10},['tired','mild']],
    [{happiness:40,affectionStreak:0},['wantsPlay','mild']],
    [{happiness:40,affectionStreak:3},['unhappy','mild']],
    [{deathMeter:80},['weak','critical']],
  ];
  for(const [values,want] of cases) {
    const emotion=renderEmotion(h,values);
    assert.deepEqual([emotion.state,emotion.severity],want);
  }
});

test('persistent cue moves only the main pet and its accessory', () => {
  const h=harness(),s=h.api.state();
  s.companions=[{id:'snail',bond:100}];
  s.lifetime.equippedItemId='ribbon';
  renderEmotion(h,{hunger:40});
  h.advance(350);
  const pet=h.get('petSprite'), accessory=h.get('petAccessory');
  assert.equal(pet.dataset.reaction,'hungry');
  assert.equal(pet.animations.length,1);
  assert.deepEqual(accessory.animations.at(-1)?.frames,pet.animations.at(-1)?.frames);
  assert.equal(h.get('castResponse').animations.length,0);
  assert.equal([...h.get('companionLeft').children,...h.get('companionRight').children]
    .reduce((sum,node)=>sum+node.animations.length,0),0);
});

test('critical life cancels a running persistent cue and stays still', () => {
  const h=harness();
  renderEmotion(h,{hunger:40});
  h.advance(350);
  const cue=h.get('petSprite').animations.at(-1);
  assert.equal(cue.playState,'running');
  h.api.state().deathMeter=80;
  h.api.render();
  assert.equal(h.api.homeEmotion().severity,'critical');
  assert.equal(cue.playState,'idle');
  const count=h.get('petSprite').animations.length;
  h.advance(20000);
  assert.equal(h.get('petSprite').animations.length,count);
});

test('ordinary render does not interrupt a real care reaction', () => {
  const h=harness();
  renderNormal(h);
  h.api.setSpeechBubble('おいしかった！',{kind:'pet',label:'なおとっち'},{event:'feed'});
  const reaction=h.get('petSprite').animations.at(-1);
  assert.equal(reaction.playState,'running');
  h.api.render();
  assert.equal(reaction.playState,'running');
});

test('normal state cancels the old profile timer before it can fire', () => {
  const h=harness();
  renderEmotion(h,{hunger:40});
  renderNormal(h);
  h.advance(1000);
  assert.equal(h.get('petSprite').animations.length,0);
  assert.equal(h.api.homeEmotion().state,'normal');
});

test('non-normal emotion excludes the pet from ordinary idle while companions continue', () => {
  const h=harness(),s=h.api.state();
  s.companions=[{id:'snail',bond:100}];
  vm.runInContext('Math.random=()=>0',h.sandbox);
  renderEmotion(h,{hunger:40});
  h.api.scheduleIdlePerk();
  h.advance(4000);
  assert.equal(h.get('petSprite').animations.length,1,'only the persistent hungry cue moves the pet');
  assert.equal([...h.get('companionLeft').children,...h.get('companionRight').children]
    .reduce((sum,node)=>sum+node.animations.length,0),1,'ordinary idle remains available to a companion');
});

test('non-normal emotion excludes autonomous pet greetings but keeps social greetings', () => {
  const h=harness(),s=h.api.state();
  s.companions=[{id:'snail',bond:100}];
  vm.runInContext('Math.random=()=>0',h.sandbox);
  renderEmotion(h,{hunger:40});
  h.api.scheduleIdleGreeting();
  h.advance(5200);
  assert.equal(h.get('speechBubble').dataset.kind,'companion');
  assert.equal(h.get('petSprite').animations.length,1,'autonomous speech does not replace the persistent cue');

  const critical=harness();
  vm.runInContext('Math.random=()=>0',critical.sandbox);
  renderEmotion(critical,{deathMeter:80});
  critical.api.scheduleIdleGreeting();
  critical.advance(5200);
  assert.ok(critical.get('speechBubble').classList.contains('hidden'),'no autonomous pet greeting runs without social candidates');
  critical.api.setSpeechBubble('ごはんをありがとう',{kind:'pet',label:'なおとっち'},{event:'feed'});
  assert.equal(critical.get('petSprite').dataset.reaction,'munch','explicit care speech remains allowed');
});

for(const [name,block] of [
  ['egg',h=>{h.api.state().stage='egg';h.api.render();}],
  ['farewell',h=>{h.api.state().stage='farewell';h.api.render();}],
  ['dead',h=>{h.api.state().stage='dead';h.api.render();}],
  ['sleeping',h=>{h.api.state().isSleeping=true;h.api.render();}],
  ['transform',h=>{h.api.state().transformOptions=['cat'];h.api.render();}],
  ['menu',h=>h.api.openExclusiveMenu('profile')],
  ['minigame',h=>h.api.startMinigame(h.api.games[0])],
  ['story',h=>h.api.showStoryEvent({emoji:'🌱',message:'おはなし'})],
  ['hidden tab',h=>{h.document.visibilityState='hidden';h.dispatch(h.document,'visibilitychange');}],
]) test(`${name} blocks a pending persistent cue`,()=>{
  const h=harness({worldScene:true});
  renderEmotion(h,{hunger:40});
  block(h);
  h.advance(350);
  assert.equal(h.get('petSprite').animations.length,0);
});

test('story opening immediately cancels an active persistent cue', () => {
  const h=harness({worldScene:true});
  renderEmotion(h,{hunger:40});
  h.advance(350);
  const cue=h.get('petSprite').animations.at(-1);
  h.api.showStoryEvent({emoji:'🌱',message:'おはなし'});
  assert.equal(cue.playState,'idle');
});

test('returning from a hidden tab schedules the current profile again', () => {
  const h=harness();
  renderEmotion(h,{hunger:40});
  h.document.visibilityState='hidden';
  h.dispatch(h.document,'visibilitychange');
  h.advance(350);
  assert.equal(h.get('petSprite').animations.length,0);
  // Saving this fresh fixture can unlock an unrelated achievement story.
  h.get('storyFlash').classList.add('hidden');
  h.document.visibilityState='visible';
  h.dispatch(h.document,'visibilitychange');
  h.advance(350);
  assert.equal(h.get('petSprite').dataset.reaction,'hungry');
});

test('reduced motion retains the derived state without starting a cue', () => {
  const h=harness({reducedMotion:true});
  renderEmotion(h,{hunger:40});
  h.advance(20000);
  assert.equal(h.api.homeEmotion().state,'hungry');
  assert.equal(h.get('petSprite').dataset.emotionState,'hungry');
  assert.equal(h.get('petSprite').animations.length,0);
});
