const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const {harness} = require('./helpers/runtime-harness.cjs');

const BASE = 'assets/characters/cat/06.png';
const HAPPY = 'assets/characters/expressions/cat/06-happy-v3.png';
const STRAINED = 'assets/characters/expressions/cat/06-strained.png';
const SULKY = 'assets/characters/expressions/cat/06-sulky.png';
const variant = name => `assets/characters/expressions/cat/06-${name}${name === 'sleeping' ? '-v3' : ''}.png`;

function adultCat(h, values = {}) {
  h.get('storyFlash').classList.add('hidden');
  h.get('lifeCardOverlay').classList.add('hidden');
  h.get('speechBubble').classList.add('hidden');
  const stageIndex = h.api.stageForAge(25);
  assert.equal(stageIndex,5);
  Object.assign(h.api.state(), {
    stage:'growing', speciesLine:'cat', ageTicks:25*20, stageIndex,
    hunger:80, happiness:80, energy:80, health:80, isSick:false,
    isSleeping:false, deathMeter:0, dying:false, transformOptions:null,
    affectionStreak:0, companions:[], partner:null,
  }, values);
  h.api.render();
  return h.api.state();
}

function portrait(h) {
  return h.get('petSprite').innerHTML.match(/class="character-asset" src="([^"]+)"/)?.[1] || null;
}

function face(h) {
  return [h.get('petSprite').dataset.expression,portrait(h)];
}

function accent(h) {
  return h.get('petSprite').innerHTML.match(/pet-expression-accent--([A-Za-z]+)/)?.[1] || null;
}

function avoidRoutineStories(h) {
  h.api.state().achievementsUnlocked.push('age-10','age-25','sick-cured-1');
}

function allCompanionIds(h) {
  const companions=h.sandbox.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1.companions;
  return [...companions.normal,...companions.rare].map(companion=>companion.id);
}

test('real home emotion profiles select only the adult cat portrait', () => {
  const cases = [
    [{},['normal',BASE]],
    [{hunger:40},['hungry',variant('hungry')]],
    [{energy:40},['tired',variant('tired')]],
    [{isSick:true},['sick',variant('sick')]],
    [{happiness:40,affectionStreak:3},['sulky',SULKY]],
    [{health:25},['weak',variant('weak')]],
    [{deathMeter:60},['weak',variant('weak')]],
    [{deathMeter:80},['critical',variant('critical')]],
    [{happiness:40},['wantsPlay',variant('wantsPlay')]],
  ];
  for (const [values,want] of cases) {
    const h=harness(); adultCat(h,values);
    assert.deepEqual(face(h),want);
  }

  const other=harness(); adultCat(other,{speciesLine:'beetle',ageTicks:3*20,stageIndex:1,hunger:40});
  assert.match(portrait(other),/assets\/characters\/beetle\/02\.png/);
  assert.equal(accent(other),null);
});

test('adult-cat expressions append unique static accents inside the existing visual', () => {
  const cases = [
    [{hunger:40},'hungry'],[{isSick:true},'sick'],[{energy:40},'tired'],
    [{happiness:40,affectionStreak:3},'sulky'],[{health:25},'weak'],
    [{deathMeter:80},'critical'],[{happiness:40},'wantsPlay'],[{isSleeping:true},'sleeping'],
  ];
  for (const [values,name] of cases) {
    const h=harness(); adultCat(h,values);
    assert.equal(accent(h),name);
    assert.match(h.get('petSprite').innerHTML,/aria-hidden="true"/);
    assert.doesNotMatch(h.get('petSprite').innerHTML,/<animate\b/);
  }
  const happy=harness(); adultCat(happy);
  happy.api.setSpeechBubble('うれしい',{kind:'pet',label:'ねこ'},{event:'play_with'});
  assert.equal(accent(happy),'happy');
});

test('real play and medicine outcomes use semantic temporary faces', () => {
  const playful=harness(); adultCat(playful);
  avoidRoutineStories(playful); playful.get('storyFlash').classList.add('hidden');
  vm.runInContext('Math.random=()=>0.55',playful.sandbox);
  playful.dispatch(playful.get('playWithBtn'),'click'); playful.advance(1);
  assert.deepEqual(face(playful),['happy',HAPPY]);

  const spam=harness(); adultCat(spam,{affectionStreak:3});
  avoidRoutineStories(spam); spam.get('storyFlash').classList.add('hidden');
  spam.dispatch(spam.get('playWithBtn'),'click'); spam.advance(1);
  assert.deepEqual(face(spam),['sulky',SULKY]);

  const wrong=harness(); adultCat(wrong);
  avoidRoutineStories(wrong); wrong.get('storyFlash').classList.add('hidden');
  wrong.dispatch(wrong.get('medicineBtn'),'click'); wrong.advance(1);
  assert.deepEqual(face(wrong),['strained',STRAINED]);

  const overfed=harness(); adultCat(overfed);
  avoidRoutineStories(overfed); overfed.get('storyFlash').classList.add('hidden');
  vm.runInContext('Math.random=()=>0.55',overfed.sandbox);
  overfed.dispatch(overfed.get('feedBtn'),'click'); overfed.advance(1);
  assert.deepEqual(face(overfed),['strained',STRAINED]);

  const blocked=harness(); adultCat(blocked,{isSleeping:true}); avoidRoutineStories(blocked);
  blocked.dispatch(blocked.get('feedBtn'),'click'); blocked.advance(1);
  assert.deepEqual(face(blocked),['sleeping',variant('sleeping')]);
});

test('feed afterglow starts happy only after the validated result and expires to latest state', () => {
  const h=harness(); adultCat(h,{hunger:60}); avoidRoutineStories(h);
  vm.runInContext('Math.random=()=>0.55',h.sandbox);
  h.dispatch(h.get('feedBtn'),'click'); h.advance(1);
  assert.deepEqual(face(h),['normal',BASE]);
  h.advance(2699);
  assert.deepEqual(face(h),['happy',HAPPY]);

  h.api.state().hunger=40;
  h.api.render();
  assert.deepEqual(face(h),['happy',HAPPY],'an ordinary render must not extend or replace the transient face');
  h.advance(800);
  assert.deepEqual(face(h),['happy',HAPPY]);
  h.advance(200);
  assert.deepEqual(face(h),['hungry',variant('hungry')]);
});

test('a real cure receives the same validated happy afterglow', () => {
  const h=harness(); adultCat(h,{isSick:true,health:70,energy:80}); avoidRoutineStories(h);
  vm.runInContext('Math.random=()=>0.55',h.sandbox);
  h.dispatch(h.get('medicineBtn'),'click'); h.advance(1);
  assert.deepEqual(face(h),['normal',BASE]);
  h.advance(2699);
  assert.deepEqual(face(h),['happy',HAPPY]);
  h.advance(1200);
  assert.deepEqual(face(h),['normal',BASE]);
});

test('reduced motion keeps the static happy afterglow for one second without animation', () => {
  const h=harness({reducedMotion:true}); adultCat(h,{hunger:60}); avoidRoutineStories(h);
  vm.runInContext('Math.random=()=>0.55',h.sandbox);
  h.dispatch(h.get('feedBtn'),'click');
  h.advance(2600);
  assert.deepEqual(face(h),['happy',HAPPY]);
  assert.equal(h.get('petSprite').animations.length,0);
  h.advance(900);
  assert.deepEqual(face(h),['happy',HAPPY]);
  h.advance(101);
  assert.deepEqual(face(h),['normal',BASE]);
  assert.equal(h.get('petSprite').animations.length,0);
});

test('only pet semantic speech starts a temporary face', () => {
  const h=harness(); const s=adultCat(h,{happiness:40,affectionStreak:3});
  s.partner={id:'cat_ceo',label:'しゃちょうねこ',emoji:'🐈‍⬛',affection:20,married:false};
  s.companions=[{id:'snail',bond:100}]; h.api.render();
  h.api.setSpeechBubble('いっしょにあそぼう',{kind:'partner',id:'cat_ceo',label:'しゃちょうねこ'},{event:'play_with'});
  assert.deepEqual(face(h),['sulky',SULKY]);
  h.api.setSpeechBubble('いっしょにあそぼう',{kind:'companion',id:'snail',label:'かたつむり'},{event:'play_with'});
  assert.deepEqual(face(h),['sulky',SULKY]);
  h.api.setSpeechBubble('いっしょにあそぼう',{kind:'pet',label:'ねこ'},{event:'play_with'});
  assert.deepEqual(face(h),['happy',HAPPY]);
  assert.doesNotMatch(h.get('speechSpeaker').innerHTML,/expressions\/cat/);
});

test('critical state interrupts happy immediately and expiry cannot restore stale state', () => {
  const h=harness(); adultCat(h);
  h.api.setSpeechBubble('うれしい',{kind:'pet',label:'ねこ'},{event:'play_with'});
  assert.deepEqual(face(h),['happy',HAPPY]);
  h.api.state().deathMeter=80; h.api.render();
  assert.deepEqual(face(h),['critical',variant('critical')]);
  h.advance(3000);
  assert.deepEqual(face(h),['critical',variant('critical')]);
});

test('a new life cancels the old face timer', () => {
  const h=harness(); adultCat(h);
  h.api.setSpeechBubble('うれしい',{kind:'pet',label:'ねこ'},{event:'play_with'});
  assert.deepEqual(face(h),['happy',HAPPY]);
  h.dispatch(h.get('resetBtn'),'click');
  assert.equal(h.api.state().stage,'egg');
  assert.match(portrait(h),/assets\/characters\/egg\/intact\.png/);
  adultCat(h);
  h.advance(3000);
  assert.deepEqual(face(h),['normal',BASE]);
});

test('sleep uses its own face, and waking shows normal before latest-state reevaluation', () => {
  const h=harness(); adultCat(h,{isSleeping:true}); avoidRoutineStories(h); h.get('storyFlash').classList.add('hidden');
  vm.runInContext('Math.random=()=>0.55',h.sandbox);
  assert.deepEqual(face(h),['sleeping',variant('sleeping')]);
  assert.equal(accent(h),'sleeping');
  h.dispatch(h.get('sleepBtn'),'click'); h.advance(1);
  assert.deepEqual(face(h),['normal',BASE]);
  assert.equal(accent(h),null);
  h.api.state().hunger=40; h.api.render();
  assert.deepEqual(face(h),['normal',BASE]);
  h.advance(2500);
  assert.deepEqual(face(h),['hungry',variant('hungry')]);
  assert.equal(accent(h),'hungry');
});

test('form changes and blocked screens clear the temporary face and accent', () => {
  const cases = [
    ['form',h=>{Object.assign(h.api.state(),{speciesLine:'beetle',ageTicks:3*20,stageIndex:1});h.api.render();},'assets/characters/beetle/02.png'],
    ['farewell',h=>{h.api.state().stage='farewell';h.api.render();},BASE],
    ['dead',h=>{h.api.state().stage='dead';h.api.render();},BASE],
    ['menu',h=>h.api.openExclusiveMenu('profile'),BASE],
    ['story',h=>h.api.showStoryEvent({emoji:'🌱',message:'おはなし'}),BASE],
    ['minigame',h=>h.api.startMinigame(h.api.games[0]),BASE],
    ['hidden tab',h=>{h.document.visibilityState='hidden';h.dispatch(h.document,'visibilitychange');},BASE],
  ];
  for (const [name,interrupt,want] of cases) {
    const h=harness({worldScene:true}); adultCat(h,{hunger:40});
    h.api.setSpeechBubble('うれしい',{kind:'pet',label:'ねこ'},{event:'play_with'});
    interrupt(h);
    assert.equal(portrait(h),want,name);
    assert.notEqual(h.get('petSprite').dataset.expression,'happy',name);
    assert.equal(accent(h),null,name);
  }
});

test('expression rendering does not alter saves, cast geometry, or 26 companions', () => {
  const h=harness(); const s=adultCat(h);
  const ids=allCompanionIds(h); assert.equal(ids.length,26);
  s.companions=ids.map(id=>({id,bond:100})); h.api.render();
  const beforeSave=JSON.stringify(s);
  const pet=h.get('petSprite');
  const beforeGeometry={left:pet.style.left,top:pet.style.top,width:pet.style.width,height:pet.style.height};
  const beforeCompanions=[...h.get('companionLeft').children,...h.get('companionRight').children];
  h.api.setSpeechBubble('うれしい',{kind:'pet',label:'ねこ'},{event:'play_with'});
  h.api.render();
  assert.deepEqual(face(h),['happy',HAPPY]);
  assert.deepEqual({left:pet.style.left,top:pet.style.top,width:pet.style.width,height:pet.style.height},beforeGeometry);
  assert.deepEqual([...h.get('companionLeft').children,...h.get('companionRight').children],beforeCompanions);
  assert.equal(JSON.stringify(s),beforeSave);
  h.advance(2600);
  assert.equal(JSON.stringify(s),beforeSave);
});

test('a failed expression portrait retries the original before the emoji fallback', () => {
  const h=harness(); adultCat(h);
  h.api.setSpeechBubble('うれしい',{kind:'pet',label:'ねこ'},{event:'play_with'});
  const wrapper=h.get('expression-wrapper');
  h.sandbox.HTMLImageElement=class {};
  const img=Object.assign(new h.sandbox.HTMLImageElement(),h.get('expression-image'));
  let src=HAPPY;
  img.classList.add('character-asset');
  img.closest=selector=>selector==='.character-visual'?wrapper:null;
  img.getAttribute=name=>name==='src'?src:name==='data-fallback-asset'?BASE:null;
  img.setAttribute=(name,value)=>{if(name==='src')src=value;};
  img.removeAttribute=()=>{};
  h.dispatch(img,'error',{bubbles:false});
  assert.equal(src,BASE);
  assert.equal(wrapper.classList.contains('asset-failed'),false);
  h.dispatch(img,'error',{bubbles:false});
  assert.equal(wrapper.classList.contains('asset-failed'),true);
});

test('home care colors follow existing mood and fatigue boundaries and reset after sleep/recovery', () => {
  const h=harness();adultCat(h);
  const check=(values,mood,energy)=>{
    Object.assign(h.api.state(),values);h.api.render();
    assert.equal(h.get('happinessBar').style['--home-meter-color'],mood);
    assert.equal(h.get('playWithBtn').style['--home-action-color'],mood);
    assert.equal(h.get('energyBar').style['--home-meter-color'],energy);
    assert.equal(h.get('sleepBtn').style['--home-action-color'],energy);
  };
  check({happiness:26,energy:51},'#f58a19','#347de3');
  check({happiness:25,energy:50},'#76d9ef','#8c56ce');
  check({isSleeping:true},'#76d9ef','#347de3');
  check({isSleeping:false,happiness:80,energy:80},'#f58a19','#347de3');
  check({happiness:40,affectionStreak:3},'#76d9ef','#347de3');
});

test('progress meter colors vary with fill without altering game state or life direction', () => {
  const h=harness();adultCat(h,{transformMeter:0,decline:0});
  const before=h.get('transformBar').style['--home-meter-color'];
  Object.assign(h.api.state(),{transformMeter:100,decline:100,deathMeter:80});
  h.api.render();
  assert.notEqual(h.get('transformBar').style['--home-meter-color'],before);
  assert.equal(h.get('transformBar').style['--home-meter-color'],'rgb(240, 190, 45)');
  assert.equal(h.get('devoBar').style['--home-meter-color'],'rgb(229, 57, 80)');
  assert.equal(h.get('deathBar').style.width,'20%');
  assert.equal(h.api.state().transformMeter,100);
});

test('overfeeding shows discomfort before a random story can replace it', () => {
  const h=harness();adultCat(h,{hunger:85,isSick:true});avoidRoutineStories(h);
  vm.runInContext('Math.random=()=>0',h.sandbox);
  h.dispatch(h.get('feedBtn'),'click');h.advance(1);
  assert.equal(h.get('petSprite').dataset.expression,'strained');
  assert.equal(h.get('storyFlash').classList.contains('hidden'),true);
  h.advance(2700);
  assert.equal(h.get('storyFlash').classList.contains('hidden'),false);
  h.advance(4300);
  assert.equal(h.get('petSprite').dataset.expression,'sick');
});

test('a newer care action cancels an older delayed overfeeding story', () => {
  const h=harness();adultCat(h,{hunger:85,isSick:true});avoidRoutineStories(h);
  vm.runInContext('Math.random=()=>0',h.sandbox);
  h.dispatch(h.get('feedBtn'),'click');h.advance(1);
  vm.runInContext('Math.random=()=>0.99',h.sandbox);
  h.dispatch(h.get('sleepBtn'),'click');h.advance(2500);
  assert.equal(h.get('storyFlash').classList.contains('hidden'),true);
  assert.equal(h.get('petSprite').dataset.expression,'sleeping');
});

test('kitten home uses its own portraits, care reactions and sleeping face without save changes', () => {
  const h=harness();adultCat(h,{ageTicks:7*20,stageIndex:2,hunger:40});
  assert.equal(portrait(h),'assets/characters/expressions/cat/03-hungry.png');
  const before=JSON.stringify(h.api.state());h.api.render();assert.equal(JSON.stringify(h.api.state()),before);
  h.api.setSpeechBubble('うれしい',{kind:'pet',label:'ねこ'},{event:'play_with'});
  assert.equal(portrait(h),'assets/characters/expressions/cat/03-happy.png');
  Object.assign(h.api.state(),{isSleeping:true});h.api.render();
  assert.equal(portrait(h),'assets/characters/expressions/cat/03-sleeping.png');
  Object.assign(h.api.state(),{isSleeping:false,ageTicks:25*20,stageIndex:5});h.api.render();
  assert.equal(portrait(h),'assets/characters/expressions/cat/06-hungry.png');
});

test('otemba home uses its own portraits, care reactions and sleeping face without save changes', () => {
  const h=harness();adultCat(h,{ageTicks:12*20,stageIndex:3,hunger:40});
  assert.equal(portrait(h),'assets/characters/expressions/cat/04-hungry.png');
  const before=JSON.stringify(h.api.state());h.api.render();assert.equal(JSON.stringify(h.api.state()),before);
  h.api.setSpeechBubble('うれしい',{kind:'pet',label:'ねこ'},{event:'play_with'});
  assert.equal(portrait(h),'assets/characters/expressions/cat/04-happy.png');
  Object.assign(h.api.state(),{isSleeping:true});h.api.render();
  assert.equal(portrait(h),'assets/characters/expressions/cat/04-sleeping.png');
  Object.assign(h.api.state(),{isSleeping:false,ageTicks:25*20,stageIndex:5});h.api.render();
  assert.equal(portrait(h),'assets/characters/expressions/cat/06-hungry.png');
});

test('young home uses its own portraits, care reactions and sleeping face without save changes', () => {
  const h=harness();adultCat(h,{ageTicks:16*20,stageIndex:4,hunger:40});
  assert.equal(portrait(h),'assets/characters/expressions/cat/05-hungry.png');
  const before=JSON.stringify(h.api.state());h.api.render();assert.equal(JSON.stringify(h.api.state()),before);
  h.api.setSpeechBubble('うれしい',{kind:'pet',label:'ねこ'},{event:'play_with'});
  assert.equal(portrait(h),'assets/characters/expressions/cat/05-happy.png');
  Object.assign(h.api.state(),{isSleeping:true});h.api.render();
  assert.equal(portrait(h),'assets/characters/expressions/cat/05-sleeping.png');
  Object.assign(h.api.state(),{isSleeping:false,ageTicks:25*20,stageIndex:5});h.api.render();
  assert.equal(portrait(h),'assets/characters/expressions/cat/06-hungry.png');
});

test('calm home uses its own portraits, care reactions and sleeping face without save changes', () => {
  const h=harness();adultCat(h,{ageTicks:40*20,stageIndex:6,hunger:40});
  assert.equal(portrait(h),'assets/characters/expressions/cat/07-hungry.png');
  const before=JSON.stringify(h.api.state());h.api.render();assert.equal(JSON.stringify(h.api.state()),before);
  h.api.setSpeechBubble('うれしい',{kind:'pet',label:'ねこ'},{event:'play_with'});
  assert.equal(portrait(h),'assets/characters/expressions/cat/07-happy.png');
  Object.assign(h.api.state(),{isSleeping:true});h.api.render();
  assert.equal(portrait(h),'assets/characters/expressions/cat/07-sleeping.png');
  Object.assign(h.api.state(),{isSleeping:false,ageTicks:25*20,stageIndex:5});h.api.render();
  assert.equal(portrait(h),'assets/characters/expressions/cat/06-hungry.png');
});

test('elder home uses its own portraits, care reactions and sleeping face without save changes', () => {
  const h=harness();adultCat(h,{ageTicks:70*20,stageIndex:7,hunger:40});
  assert.equal(portrait(h),'assets/characters/expressions/cat/08-hungry.png');
  const before=JSON.stringify(h.api.state());h.api.render();assert.equal(JSON.stringify(h.api.state()),before);
  h.api.setSpeechBubble('うれしい',{kind:'pet',label:'ねこ'},{event:'play_with'});
  assert.equal(portrait(h),'assets/characters/expressions/cat/08-happy.png');
  Object.assign(h.api.state(),{isSleeping:true});h.api.render();
  assert.equal(portrait(h),'assets/characters/expressions/cat/08-sleeping.png');
  Object.assign(h.api.state(),{isSleeping:false,ageTicks:25*20,stageIndex:5});h.api.render();
  assert.equal(portrait(h),'assets/characters/expressions/cat/06-hungry.png');
});

test('toddler home uses its own portraits, care reactions and sleeping face without save changes', () => {
  const h=harness();adultCat(h,{ageTicks:3*20,stageIndex:1,hunger:40});
  assert.equal(portrait(h),'assets/characters/expressions/cat/02-hungry.png');
  const before=JSON.stringify(h.api.state());h.api.render();assert.equal(JSON.stringify(h.api.state()),before);
  h.api.setSpeechBubble('うれしい',{kind:'pet',label:'ねこ'},{event:'play_with'});
  assert.equal(portrait(h),'assets/characters/expressions/cat/02-happy.png');
  Object.assign(h.api.state(),{isSleeping:true});h.api.render();
  assert.equal(portrait(h),'assets/characters/expressions/cat/02-sleeping.png');
  Object.assign(h.api.state(),{isSleeping:false,ageTicks:25*20,stageIndex:5});h.api.render();
  assert.equal(portrait(h),'assets/characters/expressions/cat/06-hungry.png');
});

test('baby home uses its own portraits, care reactions and sleeping face without save changes', () => {
  const h=harness();adultCat(h,{ageTicks:1*20,stageIndex:0,hunger:40});
  assert.equal(portrait(h),'assets/characters/expressions/cat/01-hungry.png');
  const before=JSON.stringify(h.api.state());h.api.render();assert.equal(JSON.stringify(h.api.state()),before);
  h.api.setSpeechBubble('うれしい',{kind:'pet',label:'ねこ'},{event:'play_with'});
  assert.equal(portrait(h),'assets/characters/expressions/cat/01-happy.png');
  Object.assign(h.api.state(),{isSleeping:true});h.api.render();
  assert.equal(portrait(h),'assets/characters/expressions/cat/01-sleeping.png');
  Object.assign(h.api.state(),{isSleeping:false,ageTicks:25*20,stageIndex:5});h.api.render();
  assert.equal(portrait(h),'assets/characters/expressions/cat/06-hungry.png');
});


test('adult dog shows all ten state and reaction faces without changing saved state', () => {
  const cases=[['hungry',{hunger:40}],['sick',{isSick:true}],['tired',{energy:40}],
    ['sulky',{happiness:40,affectionStreak:3}],['weak',{deathMeter:60}],
    ['critical',{deathMeter:80}],['wantsPlay',{happiness:40}],['sleeping',{isSleeping:true}],
    ['happy',{},'play_with'],['strained',{},'medicine_wrong']];
  for (const [name,values,event] of cases) {
    const h=harness();adultCat(h,{speciesLine:'dog',...values});
    if (event) h.api.setSpeechBubble('反応',{kind:'pet',label:'いぬ'},{event});
    assert.equal(portrait(h),`assets/characters/expressions/dog/06-${name}.png`,name);
    assert.equal(accent(h),name);
    const before=JSON.stringify(h.api.state());h.api.render();
    assert.equal(JSON.stringify(h.api.state()),before);
    if (name==='happy') {
      h.api.state().deathMeter=80;h.api.render();
      assert.equal(portrait(h),'assets/characters/expressions/dog/06-critical.png');
    }
  }
});

test('puppy shows all ten state and reaction faces without changing saved state', () => {
  const cases=[['hungry',{hunger:40}],['sick',{isSick:true}],['tired',{energy:40}],
    ['sulky',{happiness:40,affectionStreak:3}],['weak',{deathMeter:60}],
    ['critical',{deathMeter:80}],['wantsPlay',{happiness:40}],['sleeping',{isSleeping:true}],
    ['happy',{},'play_with'],['strained',{},'medicine_wrong']];
  for (const [name,values,event] of cases) {
    const h=harness();adultCat(h,{speciesLine:'dog',ageTicks:7*20,stageIndex:2,...values});
    if (event) h.api.setSpeechBubble('反応',{kind:'pet',label:'いぬ'},{event});
    assert.equal(portrait(h),`assets/characters/expressions/dog/03-${name}.png`,name);
    assert.equal(accent(h),name);
    const before=JSON.stringify(h.api.state());h.api.render();
    assert.equal(JSON.stringify(h.api.state()),before);
    if (name==='happy') {
      h.api.state().deathMeter=80;h.api.render();
      assert.equal(portrait(h),'assets/characters/expressions/dog/03-critical.png');
    }
  }
});

test('wanpaku shows all ten state and reaction faces without changing saved state', () => {
  const cases=[['hungry',{hunger:40}],['sick',{isSick:true}],['tired',{energy:40}],
    ['sulky',{happiness:40,affectionStreak:3}],['weak',{deathMeter:60}],
    ['critical',{deathMeter:80}],['wantsPlay',{happiness:40}],['sleeping',{isSleeping:true}],
    ['happy',{},'play_with'],['strained',{},'medicine_wrong']];
  for (const [name,values,event] of cases) {
    const h=harness();adultCat(h,{speciesLine:'dog',ageTicks:12*20,stageIndex:3,...values});
    if (event) h.api.setSpeechBubble('反応',{kind:'pet',label:'いぬ'},{event});
    assert.equal(portrait(h),`assets/characters/expressions/dog/04-${name}.png`,name);
    assert.equal(accent(h),name);
    const before=JSON.stringify(h.api.state());h.api.render();
    assert.equal(JSON.stringify(h.api.state()),before);
    if (name==='happy') {
      h.api.state().deathMeter=80;h.api.render();
      assert.equal(portrait(h),'assets/characters/expressions/dog/04-critical.png');
    }
  }
});

test('young dog shows all ten state and reaction faces without changing saved state', () => {
  const cases=[['hungry',{hunger:40}],['sick',{isSick:true}],['tired',{energy:40}],
    ['sulky',{happiness:40,affectionStreak:3}],['weak',{deathMeter:60}],
    ['critical',{deathMeter:80}],['wantsPlay',{happiness:40}],['sleeping',{isSleeping:true}],
    ['happy',{},'play_with'],['strained',{},'medicine_wrong']];
  for (const [name,values,event] of cases) {
    const h=harness();adultCat(h,{speciesLine:'dog',ageTicks:16*20,stageIndex:4,...values});
    if (event) h.api.setSpeechBubble('反応',{kind:'pet',label:'いぬ'},{event});
    assert.equal(portrait(h),`assets/characters/expressions/dog/05-${name}.png`,name);
    assert.equal(accent(h),name);
    const before=JSON.stringify(h.api.state());h.api.render();
    assert.equal(JSON.stringify(h.api.state()),before);
    if (name==='happy') {
      h.api.state().deathMeter=80;h.api.render();
      assert.equal(portrait(h),'assets/characters/expressions/dog/05-critical.png');
    }
  }
});

test('young dog routing is limited to ages sixteen through twenty-one', () => {
  for (const [age,stage] of [[15,'04'],[16,'05'],[21,'05'],[22,'06']]) {
    const h=harness();
    adultCat(h,{speciesLine:'dog',ageTicks:age*20,stageIndex:h.api.stageForAge(age),hunger:40});
    assert.equal(portrait(h),`assets/characters/expressions/dog/${stage}-hungry.png`,String(age));
  }
});

test('calm dog shows all ten state and reaction faces without changing saved state', () => {
  const cases=[['hungry',{hunger:40}],['sick',{isSick:true}],['tired',{energy:40}],
    ['sulky',{happiness:40,affectionStreak:3}],['weak',{deathMeter:60}],
    ['critical',{deathMeter:80}],['wantsPlay',{happiness:40}],['sleeping',{isSleeping:true}],
    ['happy',{},'play_with'],['strained',{},'medicine_wrong']];
  for (const [name,values,event] of cases) {
    const h=harness();adultCat(h,{speciesLine:'dog',ageTicks:40*20,stageIndex:6,...values});
    if (event) h.api.setSpeechBubble('反応',{kind:'pet',label:'いぬ'},{event});
    assert.equal(portrait(h),`assets/characters/expressions/dog/07-${name}.png`,name);
    assert.equal(accent(h),name);
    const before=JSON.stringify(h.api.state());h.api.render();
    assert.equal(JSON.stringify(h.api.state()),before);
    if (name==='happy') {
      h.api.state().deathMeter=80;h.api.render();
      assert.equal(portrait(h),'assets/characters/expressions/dog/07-critical.png');
    }
  }
});


test('calm dog routing is limited to ages forty through sixty-nine', () => {
  for (const [age,expected] of [[39,'assets/characters/expressions/dog/06-hungry.png'],[40,'assets/characters/expressions/dog/07-hungry.png'],[69,'assets/characters/expressions/dog/07-hungry.png'],[70,'assets/characters/expressions/dog/08-hungry.png']]) {
    const h=harness();
    adultCat(h,{speciesLine:'dog',ageTicks:age*20,stageIndex:h.api.stageForAge(age),hunger:40});
    assert.equal(portrait(h),expected,String(age));
    assert.equal(accent(h),'hungry');
  }
});


test('baby dog shows all ten state and reaction faces without changing saved state', () => {
  const cases=[['hungry',{hunger:40}],['sick',{isSick:true}],['tired',{energy:40}],
    ['sulky',{happiness:40,affectionStreak:3}],['weak',{deathMeter:60}],
    ['critical',{deathMeter:80}],['wantsPlay',{happiness:40}],['sleeping',{isSleeping:true}],
    ['happy',{},'play_with'],['strained',{},'medicine_wrong']];
  for (const [name,values,event] of cases) {
    const h=harness();adultCat(h,{speciesLine:'dog',ageTicks:1*20,stageIndex:0,...values});
    if (event) h.api.setSpeechBubble('反応',{kind:'pet',label:'いぬ'},{event});
    assert.equal(portrait(h),`assets/characters/expressions/dog/01-${name}.png`,name);
    assert.equal(accent(h),name);
    const before=JSON.stringify(h.api.state());h.api.render();
    assert.equal(JSON.stringify(h.api.state()),before);
    if (name==='happy') {
      h.api.state().deathMeter=80;h.api.render();
      assert.equal(portrait(h),'assets/characters/expressions/dog/01-critical.png');
    }
  }
});

test('toddler dog shows all ten state and reaction faces without changing saved state', () => {
  const cases=[['hungry',{hunger:40}],['sick',{isSick:true}],['tired',{energy:40}],
    ['sulky',{happiness:40,affectionStreak:3}],['weak',{deathMeter:60}],
    ['critical',{deathMeter:80}],['wantsPlay',{happiness:40}],['sleeping',{isSleeping:true}],
    ['happy',{},'play_with'],['strained',{},'medicine_wrong']];
  for (const [name,values,event] of cases) {
    const h=harness();adultCat(h,{speciesLine:'dog',ageTicks:3*20,stageIndex:1,...values});
    if (event) h.api.setSpeechBubble('反応',{kind:'pet',label:'いぬ'},{event});
    assert.equal(portrait(h),`assets/characters/expressions/dog/02-${name}.png`,name);
    assert.equal(accent(h),name);
    const before=JSON.stringify(h.api.state());h.api.render();
    assert.equal(JSON.stringify(h.api.state()),before);
    if (name==='happy') {
      h.api.state().deathMeter=80;h.api.render();
      assert.equal(portrait(h),'assets/characters/expressions/dog/02-critical.png');
    }
  }
});

test('elder dog shows all ten state and reaction faces without changing saved state', () => {
  const cases=[['hungry',{hunger:40}],['sick',{isSick:true}],['tired',{energy:40}],
    ['sulky',{happiness:40,affectionStreak:3}],['weak',{deathMeter:60}],
    ['critical',{deathMeter:80}],['wantsPlay',{happiness:40}],['sleeping',{isSleeping:true}],
    ['happy',{},'play_with'],['strained',{},'medicine_wrong']];
  for (const [name,values,event] of cases) {
    const h=harness();adultCat(h,{speciesLine:'dog',ageTicks:70*20,stageIndex:7,...values});
    if (event) h.api.setSpeechBubble('反応',{kind:'pet',label:'いぬ'},{event});
    assert.equal(portrait(h),`assets/characters/expressions/dog/08-${name}.png`,name);
    assert.equal(accent(h),name);
    const before=JSON.stringify(h.api.state());h.api.render();
    assert.equal(JSON.stringify(h.api.state()),before);
    if (name==='happy') {
      h.api.state().deathMeter=80;h.api.render();
      assert.equal(portrait(h),'assets/characters/expressions/dog/08-critical.png');
    }
  }
});

test('remaining dog stage boundaries select their own portraits', () => {
  for (const [age,stage] of [[0,'01'],[2,'01'],[3,'02'],[6,'02'],[7,'03'],[69,'07'],[70,'08'],[99,'08']]) {
    const h=harness();
    adultCat(h,{speciesLine:'dog',ageTicks:age*20,stageIndex:h.api.stageForAge(age),hunger:40});
    assert.equal(portrait(h),`assets/characters/expressions/dog/${stage}-hungry.png`,String(age));
    assert.equal(accent(h),'hungry');
  }
});

for (const species of ['man','woman','penguin','turtle','frog','clownfish','salmon','hermit_crab','jellyfish','starfish','coral']) {
  for (const [index,age] of [1,3,7,12,16,25,40,70].entries()) {
    const stage=String(index+1).padStart(2,'0');
    test(`${species}/${stage} renders all ten states and reactions without mutating saved state`, () => {
      const cases=[['hungry',{hunger:40}],['sick',{isSick:true}],['tired',{energy:40}],
        ['sulky',{happiness:40,affectionStreak:3}],['weak',{deathMeter:60}],
        ['critical',{deathMeter:80}],['wantsPlay',{happiness:40}],['sleeping',{isSleeping:true}],
        ['happy',{},'play_with'],['strained',{},'medicine_wrong']];
      for (const [name,values,event] of cases) {
        const h=harness();adultCat(h,{speciesLine:species,ageTicks:age*20,stageIndex:index,...values});
        if (event) h.api.setSpeechBubble('反応',{kind:'pet',label:'じぶん'},{event});
        assert.equal(portrait(h),`assets/characters/expressions/${species}/${stage}-${name}.png`,name);
        assert.equal(accent(h),name);
        const before=JSON.stringify(h.api.state());h.api.render();
        assert.equal(JSON.stringify(h.api.state()),before);
        if (name==='happy') {
          h.api.state().deathMeter=80;h.api.render();
          assert.equal(portrait(h),`assets/characters/expressions/${species}/${stage}-critical.png`);
        }
      }
    });
  }
}
