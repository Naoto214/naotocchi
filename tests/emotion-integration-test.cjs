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

function motionDurations(h) {
  return h.get('petSprite').animations.map(animation => animation.options.duration);
}

function avoidRoutineAchievementStory(h) {
  h.api.state().achievementsUnlocked.push('age-10','age-25','sick-cured-1');
}

function companionAnimationCount(h) {
  return [...h.get('companionLeft').children,...h.get('companionRight').children]
    .reduce((sum,node)=>sum+node.animations.length,0);
}

function allCompanionIds(h) {
  const companions=h.sandbox.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1.companions;
  return [...companions.normal,...companions.rare].map(companion=>companion.id);
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

test('rendering and running an emotion cue leave the serialized save unchanged', () => {
  const h=harness();
  renderNormal(h);
  h.api.state().hunger=40;
  const before=JSON.stringify(h.api.state());
  h.api.render();
  h.advance(350);
  assert.equal(JSON.stringify(h.api.state()),before);
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

for (const [name,values,reaction] of [
  ['hungry',{hunger:20},'hungry'],
  ['sulk',{happiness:40,affectionStreak:3},'sulk'],
]) test(`26 companions stay still during the main pet ${name} cue`, () => {
  const h=harness(),s=h.api.state();
  const ids=allCompanionIds(h);
  assert.equal(ids.length,26);
  s.companions=ids.map(id=>({id,bond:100}));
  renderEmotion(h,values);
  assert.equal(h.get('companionLeft').children.length+h.get('companionRight').children.length,26);
  const groupCount=h.get('castResponse').animations.length;
  h.advance(350);
  assert.equal(h.get('petSprite').dataset.reaction,reaction);
  assert.equal(h.get('castResponse').animations.length,groupCount);
  assert.equal(companionAnimationCount(h),0);
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

test('critical life suppresses both ordinary idle sources while keeping critical UI', () => {
  const h=harness({worldScene:true});
  vm.runInContext('Math.random=()=>0',h.sandbox);
  renderEmotion(h,{health:0,hunger:0,happiness:0,energy:0,deathMeter:80});
  assert.equal(h.get('message').dataset.careSeverity,'critical');
  assert.match(h.get('worldCareState').innerHTML,/data-care-icon="danger"/);
  h.api.scheduleIdlePerk();
  h.api.scheduleIdleGreeting();
  h.advance(5200);
  assert.equal(h.get('petSprite').animations.length,0);
  assert.ok(h.get('speechBubble').classList.contains('hidden'));
  assert.equal(h.get('message').dataset.careSeverity,'critical');
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

test('real feed starts with munch', () => {
  const h=harness();
  renderEmotion(h,{hunger:60});
  h.dispatch(h.get('feedBtn'),'click');
  h.advance(1);
  assert.equal(h.get('petSprite').dataset.reaction,'munch');
});

test('real wake keeps stretch for a sleepy randomized line', () => {
  const h=harness();
  renderEmotion(h,{isSleeping:true,sleptTicks:20,energy:80});
  vm.runInContext('Math.random=()=>0',h.sandbox);
  h.dispatch(h.get('sleepBtn'),'click');
  h.advance(1);
  assert.equal(h.get('petSprite').dataset.reaction,'stretch');
});

test('real wrong medicine starts with shake', () => {
  const h=harness();
  renderNormal(h);
  h.dispatch(h.get('medicineBtn'),'click');
  h.advance(1);
  assert.equal(h.get('petSprite').dataset.reaction,'shake');
});

test('real annoyed play starts with settle', () => {
  const h=harness();
  renderEmotion(h,{affectionStreak:3});
  h.dispatch(h.get('playWithBtn'),'click');
  h.advance(1);
  assert.equal(h.get('petSprite').dataset.reaction,'settle');
});

test('feed adds one pet-only gentle bounce after munch when hunger is cleared', () => {
  const h=harness();
  h.api.state().lifetime.equippedItemId='ribbon';
  vm.runInContext('Math.random=()=>0.55',h.sandbox);
  renderEmotion(h,{hunger:60});
  avoidRoutineAchievementStory(h);
  h.dispatch(h.get('feedBtn'),'click');
  h.advance(1);
  assert.equal(h.get('petSprite').dataset.reaction,'munch');
  const groupCount=h.get('castResponse').animations.length;
  h.advance(2700);
  assert.equal(h.get('petSprite').dataset.reaction,'bounce');
  assert.deepEqual(motionDurations(h),[1000,960]);
  assert.deepEqual(h.get('petAccessory').animations.at(-1)?.frames,h.get('petSprite').animations.at(-1)?.frames);
  assert.equal(h.get('castResponse').animations.length,groupCount);
});

test('feed returns to the latest hungry profile without a happy afterglow', () => {
  const h=harness();
  vm.runInContext('Math.random=()=>0.55',h.sandbox);
  renderEmotion(h,{hunger:10});
  avoidRoutineAchievementStory(h);
  h.dispatch(h.get('feedBtn'),'click');
  h.advance(3500);
  assert.equal(h.get('petSprite').dataset.reaction,'hungry');
  assert.deepEqual(motionDurations(h),[1000,1250]);
});

test('feed afterglow rechecks raw hunger at callback time', () => {
  const h=harness();
  vm.runInContext('Math.random=()=>0.55',h.sandbox);
  renderEmotion(h,{hunger:60});
  avoidRoutineAchievementStory(h);
  h.dispatch(h.get('feedBtn'),'click');
  h.api.state().hunger=40;
  h.advance(3000);
  assert.deepEqual(motionDurations(h),[1000]);
});

test('feed afterglow rechecks raw pet availability at callback time', () => {
  for (const [name,change] of [
    ['sleeping',s=>{s.isSleeping=true;}],
    ['not playable',s=>{s.stage='farewell';}],
  ]) {
    const h=harness();
    vm.runInContext('Math.random=()=>0.55',h.sandbox);
    renderEmotion(h,{hunger:60});
    avoidRoutineAchievementStory(h);
    h.dispatch(h.get('feedBtn'),'click');
    change(h.api.state());
    h.advance(3000);
    assert.equal(motionDurations(h).filter(duration=>duration===960).length,0,name);
  }
});

test('cured medicine settles first and then adds one pet-only bounce', () => {
  const h=harness();
  renderEmotion(h,{isSick:true,health:70,energy:80});
  avoidRoutineAchievementStory(h);
  vm.runInContext('Math.random=(()=>{const values=[0.55,0.1,0.2];let i=0;return()=>values[i++]??0.55})()',h.sandbox);
  h.dispatch(h.get('medicineBtn'),'click');
  h.advance(1);
  assert.equal(h.get('petSprite').dataset.reaction,'settle');
  const groupCount=h.get('castResponse').animations.length;
  h.advance(2700);
  assert.equal(h.get('petSprite').dataset.reaction,'bounce');
  assert.deepEqual(motionDurations(h),[1200,960]);
  assert.equal(h.get('castResponse').animations.length,groupCount);
});

test('a newer care action invalidates the old feed afterglow', () => {
  const h=harness();
  vm.runInContext('Math.random=()=>0.55',h.sandbox);
  renderEmotion(h,{hunger:60});
  avoidRoutineAchievementStory(h);
  h.dispatch(h.get('feedBtn'),'click');
  h.advance(200);
  h.dispatch(h.get('medicineBtn'),'click');
  h.advance(3000);
  assert.deepEqual(motionDurations(h),[1000,740]);
});

test('a newer semantic event invalidates the old feed afterglow', () => {
  const h=harness();
  vm.runInContext('Math.random=()=>0.55',h.sandbox);
  renderEmotion(h,{hunger:60});
  avoidRoutineAchievementStory(h);
  h.dispatch(h.get('feedBtn'),'click');
  h.advance(200);
  h.api.speakEvent('wake',{petText:'おきたよ',partnerChance:0,companionChance:0});
  h.advance(3000);
  assert.equal(motionDurations(h).filter(duration=>duration===960).length,0);
});

test('leaving home invalidates a feed afterglow even after returning', () => {
  const cases=[
    ['menu',h=>{h.api.openExclusiveMenu('profile');h.api.closeAllMenuOverlays();h.api.render();}],
    ['story',h=>{h.api.showStoryEvent({emoji:'🌱',message:'おはなし'});h.get('storyFlash').classList.add('hidden');h.api.render();}],
    ['minigame',h=>{h.api.startMinigame(h.api.games[0]);h.api.retireMinigame();h.api.render();}],
    ['hidden tab',h=>{h.document.visibilityState='hidden';h.dispatch(h.document,'visibilitychange');h.document.visibilityState='visible';h.dispatch(h.document,'visibilitychange');}],
  ];
  for (const [name,leave] of cases) {
    const h=harness({worldScene:true});
    vm.runInContext('Math.random=()=>0.55',h.sandbox);
    renderEmotion(h,{hunger:60});
    avoidRoutineAchievementStory(h);
    h.dispatch(h.get('feedBtn'),'click');
    h.advance(100);
    leave(h);
    const bounceCountAfterReturn=motionDurations(h).filter(duration=>duration===960).length;
    h.advance(3000);
    assert.equal(motionDurations(h).filter(duration=>duration===960).length,bounceCountAfterReturn,name);
  }
});

test('feed afterglow waits for existing companion conversation beats', () => {
  const h=harness();
  const s=h.api.state();
  s.companions=[{id:'snail',bond:100}];
  renderEmotion(h,{hunger:60});
  avoidRoutineAchievementStory(h);
  vm.runInContext('Math.random=(()=>{let i=0;return()=>i++===8?0.55:0.2})()',h.sandbox);
  h.dispatch(h.get('feedBtn'),'click');
  h.advance(2600);
  assert.equal(h.get('speechBubble').dataset.kind,'companion');
  assert.equal(motionDurations(h).filter(duration=>duration===960).length,0);
  h.advance(5200);
  assert.equal(motionDurations(h).filter(duration=>duration===960).length,1);
});

test('critical life and reduced motion suppress care afterglow movement', () => {
  for (const [name,options,values] of [
    ['critical',{}, {hunger:60,deathMeter:80}],
    ['reduced motion',{reducedMotion:true},{hunger:60}],
  ]) {
    const h=harness(options);
    vm.runInContext('Math.random=()=>0.55',h.sandbox);
    renderEmotion(h,values);
    avoidRoutineAchievementStory(h);
    h.dispatch(h.get('feedBtn'),'click');
    h.advance(3000);
    assert.equal(motionDurations(h).filter(duration=>duration===960).length,0,name);
  }
});

test('critical life suppresses cured medicine afterglow', () => {
  const h=harness();
  vm.runInContext('Math.random=()=>0.55',h.sandbox);
  renderEmotion(h,{isSick:true,health:70,energy:80,deathMeter:80});
  avoidRoutineAchievementStory(h);
  h.dispatch(h.get('medicineBtn'),'click');
  h.advance(3000);
  assert.equal(motionDurations(h).filter(duration=>duration===960).length,0);
});

test('other semantic care reactions finish without an added happy afterglow', () => {
  const cases=[
    ['play',{},'playWithBtn'],
    ['annoyed play',{affectionStreak:3},'playWithBtn'],
    ['wrong medicine',{},'medicineBtn'],
    ['sleep',{},'sleepBtn'],
    ['wake',{isSleeping:true,sleptTicks:20},'sleepBtn'],
  ];
  for (const [name,values,button] of cases) {
    const h=harness();
    vm.runInContext('Math.random=()=>0.55',h.sandbox);
    renderEmotion(h,values);
    avoidRoutineAchievementStory(h);
    h.dispatch(h.get(button),'click');
    h.advance(1);
    const bounceCount=motionDurations(h).filter(duration=>duration===960).length;
    h.advance(3000);
    assert.equal(motionDurations(h).filter(duration=>duration===960).length,bounceCount,name);
  }
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

for (const [name,enter,leave,restartDelay] of [
  ['menu',h=>h.api.openExclusiveMenu('profile'),h=>{h.api.closeAllMenuOverlays();h.api.render();},350],
  ['story',h=>h.api.showStoryEvent({emoji:'🌱',message:'おはなし'}),h=>{h.get('storyFlash').classList.add('hidden');h.api.render();},350],
  ['minigame',h=>h.api.startMinigame(h.api.games[0]),h=>{h.api.retireMinigame();h.api.render();},2400],
  ['hidden tab',h=>{h.document.visibilityState='hidden';h.dispatch(h.document,'visibilitychange');},h=>{h.document.visibilityState='visible';h.dispatch(h.document,'visibilitychange');},350],
]) test(`${name} cancels an active persistent cue and the current state restarts after return`, () => {
  const h=harness({worldScene:true});
  renderEmotion(h,{hunger:40});
  h.advance(350);
  const cue=h.get('petSprite').animations.at(-1);
  assert.equal(cue.playState,'running');
  enter(h);
  assert.equal(cue.playState,'idle');
  const count=h.get('petSprite').animations.length;
  h.advance(4000);
  assert.equal(h.get('petSprite').animations.length,count);
  leave(h);
  h.get('storyFlash').classList.add('hidden');
  h.api.render();
  h.advance(restartDelay);
  assert.equal(h.get('petSprite').dataset.reaction,'hungry');
  assert.equal(motionDurations(h).filter(duration=>duration===1250).length,2);
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

test('switching to reduced motion stops a running persistent cue', () => {
  const h=harness();
  renderEmotion(h,{hunger:40});
  h.advance(350);
  const cue=h.get('petSprite').animations.at(-1);
  assert.equal(cue.playState,'running');
  h.setReducedMotion(true);
  assert.equal(cue.playState,'idle');
  const count=h.get('petSprite').animations.length;
  h.advance(20000);
  assert.equal(h.get('petSprite').animations.length,count);
});

test('reduced motion suppresses persistent and afterglow movement but retains the warning icon', () => {
  const warning=harness({worldScene:true,reducedMotion:true});
  renderEmotion(warning,{hunger:20});
  warning.advance(20000);
  assert.equal(warning.get('petSprite').animations.length,0);
  assert.equal(warning.get('message').dataset.careSeverity,'warning');
  assert.match(warning.get('worldCareState').innerHTML,/data-care-icon="danger"/);

  const afterglow=harness({reducedMotion:true});
  vm.runInContext('Math.random=()=>0.55',afterglow.sandbox);
  renderEmotion(afterglow,{hunger:60});
  avoidRoutineAchievementStory(afterglow);
  afterglow.dispatch(afterglow.get('feedBtn'),'click');
  const count=afterglow.get('petSprite').animations.length;
  afterglow.advance(5000);
  assert.equal(afterglow.get('petSprite').animations.length,count);
});

for (const source of ['perk','greeting']) {
  test(`normal idle ${source} callback does not preempt a pending care afterglow`, () => {
    const h=harness();
    vm.runInContext('Math.random=()=>0',h.sandbox);
    h.api.state().companions=[{id:'snail',bond:100}];
    renderEmotion(h,{hunger:60});
    avoidRoutineAchievementStory(h);
    if(source==='perk') {
      h.api.scheduleIdlePerk();
      h.advance(1498);
      vm.runInContext('Math.random=()=>0.55',h.sandbox);
      h.dispatch(h.get('feedBtn'),'click');
      vm.runInContext('Math.random=()=>0',h.sandbox);
      h.advance(2502);
    } else {
      h.api.scheduleIdleGreeting();
      h.advance(2698);
      vm.runInContext('Math.random=()=>0.55',h.sandbox);
      h.dispatch(h.get('feedBtn'),'click');
      vm.runInContext('Math.random=()=>0',h.sandbox);
      h.advance(2501);
      h.api.setMessage('');
      h.advance(1);
    }
    assert.deepEqual(motionDurations(h),[1000]);
    assert.equal(companionAnimationCount(h),1);
    if(source==='greeting') assert.equal(h.get('speechBubble').dataset.kind,'companion');
  });

  test(`normal idle ${source} callback does not preempt an active care afterglow`, () => {
    const h=harness();
    vm.runInContext('Math.random=()=>0',h.sandbox);
    renderEmotion(h,{hunger:60});
    avoidRoutineAchievementStory(h);
    if(source==='perk') {
      h.api.scheduleIdlePerk();
      h.advance(1200);
      vm.runInContext('Math.random=()=>0.55',h.sandbox);
      h.dispatch(h.get('feedBtn'),'click');
      vm.runInContext('Math.random=()=>0',h.sandbox);
      h.advance(2800);
    } else {
      h.api.scheduleIdleGreeting();
      h.advance(2400);
      vm.runInContext('Math.random=()=>0.55',h.sandbox);
      h.dispatch(h.get('feedBtn'),'click');
      vm.runInContext('Math.random=()=>0',h.sandbox);
      h.advance(2799);
      h.api.setMessage('');
      h.advance(1);
    }
    const bounce=h.get('petSprite').animations.find(animation=>animation.options.duration===960);
    assert.equal(h.get('petSprite').dataset.reaction,'bounce');
    assert.equal(bounce?.playState,'running');
    assert.deepEqual(motionDurations(h),[1000,960]);
  });
}
