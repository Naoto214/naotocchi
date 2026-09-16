const assert = require('node:assert/strict');
const {test} = require('node:test');
const {harness} = require('./helpers/runtime-harness.cjs');

const SAVE = 'naotocchi-save-v1';
const ALL = ['male', 'female', 'nonbinary'];
const copy = value => JSON.parse(JSON.stringify(value));
function storageWith(save) {
  const data = new Map(save ? [[SAVE, JSON.stringify(save)]] : []);
  return {getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,String(v)), removeItem: k => data.delete(k)};
}
function setup(overrides = {}) {
  const storage = storageWith(), h = harness({storage});
  h.sandbox.Math = Object.create(Math);
  h.sandbox.Math.random = () => 0;
  Object.assign(h.api.state(), {speciesLine:'clownfish', ageTicks:69*20, stageIndex:6,
    gender:'male', orientationId:'gay', attractedTo:['male'], sodachi:60, ...overrides});
  return {h, storage, s:h.api.state()};
}
function ageTo(h, age, previous) {
  h.api.state().ageTicks = age*20;
  h.api.onAgeChanged(previous);
  h.api.saveState();
  h.api.showPendingClownfishTransition();
}
function reload(save) { return harness({storage:storageWith(save),resume:true}); }
function partner(gender, orientationId, attractedTo, extra={}) {
  return {id:'guest', label:'ともだち', emoji:'🐠', gender, orientationId, attractedTo,
    affection:80, married:false, bondCount:2, ...extra};
}

// Catch the missing lifecycle transition, a reroll of attraction, and early completion.
for (const [id, targets, expected, label] of [
  ['gay',['male'],'straight','ストレート'],
  ['straight',['female'],'gay','レズビアン'],
]) test(`clownfish ${id} keeps its targets through stages 7 and 8`, () => {
  const {h,s,storage} = setup({orientationId:id,attractedTo:targets,questioningEncounters:2});
  ageTo(h,40,39);
  assert.equal(s.gender,'male');
  assert.match(h.get('storyFlashText').textContent,/メス.*途中|メス.*変わ/);
  ageTo(h,70,69);
  assert.equal(s.gender,'female');
  assert.deepEqual([...s.attractedTo],targets);
  assert.equal(s.orientationId,expected);
  assert.equal(s.questioningEncounters,2);
  h.api.renderProfile();
  assert.equal(h.get('profileOrientation').textContent,label);
  assert.match(h.get('storyFlashText').textContent,/メス/);
  assert.match(h.get('storyFlashText').textContent,/そのまま/);
  const log = s.lifeLog.filter(e=>/オスからメス/.test(e.text));
  assert.equal(log.length,1);
  assert.match(h.api.buildLifeCard(),/オスからメス/);
  h.api.saveState();
  const h2=reload(JSON.parse(storage.getItem(SAVE))), s2=h2.api.state();
  assert.equal(s2.gender,'female');
  assert.equal(s2.orientationId,expected);
  assert.deepEqual([...s2.attractedTo],targets);
  ageTo(h2,71,70);
  assert.equal(s2.lifeLog.filter(e=>/オスからメス/.test(e.text)).length,1);
});

test('new clownfish follow the pictured body stage while NB and other species keep their rules', () => {
  const {h}=setup();
  h.sandbox.Math.random=()=>0.6; // female in the original 47.5/47.5/5 roll
  for(let index=0;index<8;index++) {
    const identity=h.api.rollIdentity('clownfish',index);
    assert.equal(identity.gender,index===7?'female':'male');
  }
  assert.equal(h.api.rollIdentity('cat').gender,'female');
  assert.equal(h.api.rollIdentity('man').gender,'male');
  assert.equal(h.api.rollIdentity('woman').gender,'female');
  h.sandbox.Math.random=()=>0.99;
  assert.equal(h.api.rollIdentity('clownfish').gender,'nonbinary');
  assert.equal(h.api.rollIdentity('cat').gender,'nonbinary');
});

for(const [id,targets] of [['bi',['male','nonbinary']],['bi',['female','nonbinary']],
  ['bi',['male','female']],['bi',ALL],['pan',ALL],['aro',[]],['questioning',ALL]]) {
  test(`${id} ${targets.join('/')} survives sex change and reload without re-selection`,()=>{
    const {h,s}=setup({orientationId:id,attractedTo:targets,questioningEncounters:2});
    ageTo(h,70,69);
    assert.equal(s.gender,'female');
    assert.equal(s.orientationId,id);
    assert.equal(s.questioningEncounters,2);
    assert.deepEqual([...s.attractedTo].sort(),[...targets].sort());
    const h2=reload(copy(s));
    assert.deepEqual([...h2.api.state().attractedTo].sort(),[...targets].sort());
    assert.equal(h2.api.state().orientationId,id);
  });
}

test('NB identity remains NB while its clownfish body completes the transition',()=>{
  const {h,s}=setup({gender:'nonbinary',orientationId:'gay',attractedTo:['nonbinary']});
  ageTo(h,70,69);
  assert.equal(s.gender,'nonbinary');
  assert.equal(s.orientationId,'gay');
  assert.deepEqual([...s.attractedTo],['nonbinary']);
  h.api.renderProfile();
  assert.match(h.get('profileGender').textContent,/ノンバイナリー.*メス/);
  assert.equal(h.get('profileOrientation').textContent,'恋愛対象：同じジェンダー');
  assert.match(h.get('storyFlashText').textContent,/メス/);
});

test('NB body-only change does not reopen an already reconciled relationship',()=>{
  const {h,s}=setup({gender:'nonbinary',orientationId:'gay',attractedTo:['nonbinary'],
    partner:partner('male','gay',['male'],{mismatched:false})});
  ageTo(h,70,69);
  assert.equal(s.partner.mismatched,false);
});

test('a legacy sex-change notice cannot overwrite a primary save recovered from backup',()=>{
  const {s}=setup({ageTicks:1400});
  const storage=storageWith();
  storage.setItem(SAVE,'{broken');
  storage.setItem('naotocchi-save-v1-backup',JSON.stringify(s));
  const h=harness({storage,resume:true});
  assert.equal(h.api.state().gender,'female');
  assert.equal(storage.getItem(SAVE),'{broken');
});

test('a partner whose targets no longer include us is retained as mismatched, including marriage',()=>{
  const {h,s}=setup({partner:partner('male','gay',['male'],{married:true}),marriageAge:30});
  const before={deathMeter:s.deathMeter,decline:s.decline,affection:s.partner.affection};
  ageTo(h,70,69);
  assert.equal(s.partner.married,true);
  assert.equal(s.partner.mismatched,true);
  assert.equal(s.partner.repair,0);
  assert.equal(s.marriageAge,30);
  assert.equal(s.partner.affection,before.affection);
  assert.equal(s.deathMeter,before.deathMeter);
  assert.equal(s.decline,before.decline);
  assert.deepEqual([...s.partner.attractedTo],['male']);
  const h2=reload(copy(s)),s2=h2.api.state();
  h2.dispatch(h2.get('courtBtn'),'click');
  assert.equal(s2.partner.repair,1);
  const h3=reload(copy(s2));
  assert.equal(h3.api.state().partner.repair,1);
  assert.equal(h3.api.state().partner.married,true);
});

test('compatible partners keep affection and a newly matching partner leaves mismatch',()=>{
  for(const [id,targets,mismatch] of [['pan',ALL,false],['straight',['female'],true]]) {
    const {h,s}=setup({partner:partner('male',id,targets,{mismatched:mismatch,repair:2})});
    ageTo(h,70,69);
    assert.equal(!!s.partner.mismatched,false);
    assert.equal(s.partner.affection,80);
    assert.deepEqual([...s.partner.attractedTo].sort(),[...targets].sort());
    if(mismatch) assert.equal(s.partner.repair,0);
  }
});

test('valid saved attraction overrides stale labels for self, partner, and guest',()=>{
  const {s}=setup({speciesLine:'cat',gender:'female',orientationId:'gay',attractedTo:['male'],
    partner:partner('male','gay',['female']),
    guest:{speciesLine:'cat',stageIndex:5,gender:'female',orientationId:'straight',attractedTo:['female'],traitCounts:{}}});
  const h=reload(copy(s)),out=h.api.state();
  assert.equal(out.orientationId,'straight');
  assert.deepEqual([...out.attractedTo],['male']);
  assert.equal(out.partner.orientationId,'straight');
  assert.deepEqual([...out.partner.attractedTo],['female']);
  assert.equal(out.guest.orientationId,'gay');
  h.api.renderProfile();
  assert.equal(h.get('profileOrientation').textContent,'ストレート');
});

test('legacy late-stage saves migrate once after age conversion; existing females never revert',()=>{
  const {s}=setup({schemaVersion:3,ageTicks:70*18,attractedTo:undefined});
  delete s.attractedTo;
  const h=reload(copy(s)),out=h.api.state();
  assert.equal(out.ageTicks,1400);
  assert.equal(out.gender,'female');
  assert.equal(out.orientationId,'straight');
  assert.deepEqual([...out.attractedTo],['male']);
  const again=reload(copy(out)).api.state();
  assert.equal(again.lifeLog.filter(e=>/オスからメス/.test(e.text)).length,1);
  const early=reload({...copy(s),schemaVersion:5,ageTicks:22*20,gender:'female',orientationId:'gay',attractedTo:['female']});
  assert.equal(early.api.state().gender,'female');
  assert.doesNotMatch(early.api.currentStageLabel(),/オス/);
  ageTo(early,40,39);
  assert.doesNotMatch(early.api.currentStageLabel(),/変わる途中/);
  assert.equal(early.api.state().gender,'female');
});

test('normal and infinite transformations use the selected form; returning restores the original life',()=>{
  const {h,s}=setup({speciesLine:'cat',ageTicks:70*20,stageIndex:7});
  s.transformOptions=['clownfish'];
  h.api.chooseTransform('clownfish');
  assert.equal(s.gender,'female');
  h.api.enterInfinite();
  s.discoveredStages.push('clownfish:5','clownfish:7');
  h.api.openDexDetail('clownfish',5);
  h.dispatch(h.get('dexDetailTransformBtn'),'click');
  assert.equal(s.gender,'male');
  assert.equal(s.infiniteForm.stageIndex,5);
  h.api.openDexDetail('clownfish',7);
  h.dispatch(h.get('dexDetailTransformBtn'),'click');
  assert.equal(s.gender,'female');
  h.api.exitInfinite();
  assert.equal(h.api.state().gender,'female');
  assert.equal(h.api.state().ageTicks,1400);
});

test('guest codes preserve individual bi targets and canonical labels; old codes still load',()=>{
  const {h}=setup({gender:'female',orientationId:'gay',attractedTo:['male']});
  let guest=h.api.decodeGuestCode(h.api.encodeGuestCode());
  assert.equal(guest.orientationId,'straight');
  assert.deepEqual([...guest.attractedTo],['male']);
  Object.assign(h.api.state(),{orientationId:'bi',attractedTo:['female','nonbinary']});
  const code=h.api.encodeGuestCode();
  for(let i=0;i<4;i++) assert.deepEqual([...h.api.decodeGuestCode(code).attractedTo],['female','nonbinary']);
  const old='NAOTOCCHI1:'+btoa(encodeURIComponent(JSON.stringify({s:'cat',i:5,g:'male',o:'straight',t:{}})));
  assert.deepEqual([...h.api.decodeGuestCode(old).attractedTo],['female']);
});

test('shared early-female clownfish keep a female stage name in profile and court',()=>{
  const {h,s}=setup({gender:'female',orientationId:'gay',attractedTo:['female']});
  for(const [age,index] of [[22,5],[40,6]]) {
    Object.assign(s,{ageTicks:age*20,stageIndex:index});
    s.guest=h.api.decodeGuestCode(h.api.encodeGuestCode());
    assert.doesNotMatch(h.api.guestCandidate(s.guest).label,/オス|変わる途中/);
    h.api.renderCommOverlay();
    assert.doesNotMatch(h.get('guestStatus').innerHTML,/卵を守るオス|メスへ変わる途中/);
  }
});

test('a migrated infinite return snapshot gets the same identity repair before resuming',()=>{
  const {s}=setup();
  const snapshot={...copy(s),ageTicks:1400,stageIndex:7};
  const h=reload({...copy(s),speciesLine:'dog',infinite:true,infiniteForm:{line:'dog',stageIndex:2},infiniteReturn:snapshot});
  h.api.exitInfinite();
  assert.equal(h.api.state().gender,'female');
  assert.deepEqual([...h.api.state().attractedTo],['male']);
  assert.equal(h.api.state().orientationId,'straight');
});

// Hand-specified identity definitions from the existing game rules. The expected
// pair set comes from these fixtures, never from the production identity helpers.
const identities = [
  ['male','straight',['female']], ['male','gay',['male']], ['male','bi',['female','nonbinary']],
  ['male','pan',ALL], ['male','aro',[]], ['male','questioning',ALL],
  ['female','straight',['male']], ['female','gay',['female']], ['female','bi',['male','nonbinary']],
  ['female','pan',ALL], ['female','aro',[]], ['female','questioning',ALL],
  ['nonbinary','straight',['male','female']], ['nonbinary','gay',['nonbinary']], ['nonbinary','bi',['male','female']],
  ['nonbinary','pan',ALL], ['nonbinary','aro',[]], ['nonbinary','questioning',ALL],
];
for(const [gender,id,targets] of identities) test(`real court regression: ${gender}/${id} against 18 identities`,()=>{
  const {h}=setup();
  for(const [otherGender,otherId,otherTargets] of identities) {
    h.api.reset();
    const s=h.api.state();
    Object.assign(s,{gender,orientationId:id,attractedTo:[...targets],speciesLine:'cat',sodachi:60,
      guest:{speciesLine:'dog',stageIndex:5,gender:otherGender,orientationId:otherId,
        attractedTo:[...otherTargets],traitCounts:{}}});
    h.dispatch(h.get('courtBtn'),'click');
    const expected=targets.includes(otherGender) && otherTargets.includes(gender);
    assert.equal(!!s.partner,expected,`${gender}/${id} -> ${otherGender}/${otherId}`);
    assert.deepEqual([...s.attractedTo].sort(),[...targets].sort());
    if(s.partner) assert.deepEqual([...s.partner.attractedTo].sort(),[...otherTargets].sort());
    // Pending conversations are irrelevant to the next encounter.
    h.api.clearConversationTimers();
  }
});

test('new court after a gay male becomes female uses both participants current genders',()=>{
  for(const [otherId,otherTargets,expected] of [['gay',['male'],false],['straight',['female'],true]]) {
    const {h,s}=setup();
    ageTo(h,70,69);
    s.transformOptions=null;
    s.guest={speciesLine:'dog',stageIndex:5,gender:'male',orientationId:otherId,attractedTo:otherTargets,traitCounts:{}};
    h.dispatch(h.get('courtBtn'),'click');
    assert.equal(!!s.partner,expected);
  }
});

test('completed relationships can reconcile and stay reconciled after save/load without changing targets',()=>{
  const {h,s}=setup({partner:partner('male','gay',['male'])});
  ageTo(h,70,69);
  for(let i=0;i<8 && s.partner.mismatched;i++) {s.energy=100;h.dispatch(h.get('courtBtn'),'click');}
  assert.equal(s.partner.mismatched,false);
  assert.deepEqual([...s.attractedTo],['male']);
  assert.deepEqual([...s.partner.attractedTo],['male']);
  assert.equal(reload(copy(s)).api.state().partner.mismatched,false);
});

test('a normal tick crossing stage 8 completes once and a non-clownfish never changes gender',()=>{
  for(const line of ['clownfish','cat']) {
    const {h,s}=setup({speciesLine:line,ageTicks:1399});
    h.api.tick();
    assert.equal(s.gender,line==='clownfish'?'female':'male');
    assert.deepEqual([...s.attractedTo],['male']);
  }
});

test('finished lives retain the recorded identity when an old save is loaded',()=>{
  for(const stage of ['dead','farewell']) {
    const {s}=setup({stage,ageTicks:1400});
    const out=reload(copy(s)).api.state();
    assert.equal(out.gender,'male');
    assert.equal(out.lifeLog.length,0);
  }
});

test('old compatibility cleanup cannot delete a partner before the clownfish migration makes them compatible',()=>{
  const {s}=setup({ageTicks:1400,romanceCompatibilityVersion:1,
    partner:partner('male','straight',['female'],{married:true})});
  const out=reload(copy(s)).api.state();
  assert.ok(out.partner);
  assert.equal(out.partner.married,true);
  assert.equal(!!out.partner.mismatched,false);
  assert.equal(out.gender,'female');
});

test('sex change during a minigame is announced after returning to the home screen',()=>{
  const {h,s}=setup({ageTicks:1399});
  // Use the real minigame session lifecycle; this game's result itself is irrelevant.
  h.api.startMinigame({id:'transition-probe',name:'probe',start(){}});
  h.api.tick();
  assert.equal(s.gender,'female');
  assert.match(s.pendingClownfishTransition,/メス/);
  h.advance(6000);
  h.api.retireMinigame();
  s.transformOptions=null;
  h.api.loop();
  assert.equal(h.get('storyFlash').classList.contains('hidden'),false);
  assert.match(h.get('storyFlashText').textContent,/メス/);
  assert.equal(s.pendingClownfishTransition,null);
});

test('a same-tick elder achievement cannot replace the completed sex-change notice',()=>{
  const {h,s}=setup({ageTicks:1399});
  s.discoveredStages=h.api.ALL_LINES.filter(line=>line!=='clownfish').slice(0,9).map(line=>`${line}:7`);
  h.api.saveState();
  h.api.loop();
  assert.equal(s.gender,'female');
  assert.match(h.get('storyFlashText').textContent,/メス.*そのまま/);
  assert.equal(s.pendingClownfishTransition,null);
});

test('stage-7 notice waits until finished minigame results have been readable',()=>{
  const {h,s}=setup({ageTicks:799});
  h.api.startMinigame({id:'stage7-probe',start(){}});
  // the clock is paused while a minigame owns the screen, so loop() alone
  // never reaches age 40 here; drive the one tick directly (the notice
  // still has to wait until the game is over and its result was readable)
  h.api.loop();
  assert.equal(s.ageTicks,799,'time does not pass during a minigame');
  h.api.tick();
  assert.equal(s.gender,'male');
  assert.match(s.pendingClownfishTransition,/変わる途中/);
  h.api.finishMinigame(50);
  h.api.loop();
  assert.match(s.pendingClownfishTransition,/変わる途中/);
  h.advance(6500);
  h.api.loop();
  assert.equal(s.pendingClownfishTransition,null);
  assert.match(h.get('storyFlashText').textContent,/変わる途中/);
});

test('newborn clownfish hatch male for a binary roll and save that identity',()=>{
  const {h,s,storage}=setup({stage:'egg',speciesLine:null,gender:null,orientationId:null,attractedTo:[],growth:16});
  s.lifetime.nextEggLine='clownfish';
  s.lifetime.nextEggKind='normal';
  s.lifetime.dreamEggs.normal=1;
  s.items.c_egg_normal=1;
  h.sandbox.Math.random=()=>0.6;
  h.dispatch(h.get('playWithBtn'),'click');
  assert.equal(s.stage,'growing');
  assert.equal(s.gender,'male');
  assert.equal(s.ageTicks,0);
  assert.equal(JSON.parse(storage.getItem(SAVE)).gender,'male');
});

test('a transition notice waits behind transformation choices and survives choosing to stay',()=>{
  const {h,s}=setup({ageTicks:1399,transformMeter:100});
  h.api.loop();
  assert.ok(s.transformOptions);
  assert.match(s.pendingClownfishTransition,/メス/);
  h.dispatch(h.get('transformSkipBtn'),'click');
  h.api.loop();
  assert.equal(s.pendingClownfishTransition,null);
  assert.match(h.get('storyFlashText').textContent,/メス/);
});

test('pre-v2 compatibility migration leaves finished clownfish relationships and logs unchanged',()=>{
  for(const stage of ['dead','farewell']) {
    const {s}=setup({stage,romanceCompatibilityVersion:1,
      partner:partner('male','straight',['female']),lifeLog:[{age:30,icon:'🐠',text:'おもいで'}]});
    const out=reload(copy(s)).api.state();
    assert.equal(out.partner.mismatched,undefined);
    assert.deepEqual(copy(out.lifeLog),copy(s.lifeLog));
  }
});

test('pre-v2 infinite return relationship migration is complete before the first return',()=>{
  for (const version of [undefined,1]) {
    const {s}=setup({ageTicks:600,romanceCompatibilityVersion:1,partner:partner('male','straight',['female'])});
    if (version === undefined) delete s.romanceCompatibilityVersion;
    const h=reload({...copy(s),speciesLine:'cat',infinite:true,infiniteReturn:copy(s)});
    h.api.exitInfinite();
    const returned=copy(h.api.state());
    assert.equal(returned.romanceCompatibilityVersion,2);
    assert.equal(returned.partner.mismatched,true);
    const again=reload(returned).api.state();
    assert.deepEqual(copy(again.lifeLog),returned.lifeLog);
    assert.deepEqual(copy(again.partner),returned.partner);
  }
});

test('a same-tick marriage anniversary leaves the transition notice for after the movie',()=>{
  const {h,s}=setup({ageTicks:1399,partner:partner('male','pan',ALL,{married:true}),
    marriageAge:20,marriageMilestonesSeen:[1,10,25]});
  h.api.loop();
  assert.equal(h.api.isAnyMenuOverlayOpen(),true);
  assert.match(s.pendingClownfishTransition,/メス/);
  h.advance(5000);
  h.dispatch(h.get('dateMovieSkipBtn'),'click');
  h.dispatch(h.get('dateMovieCloseBtn'),'click');
  h.api.loop();
  assert.equal(s.pendingClownfishTransition,null);
  assert.match(h.get('storyFlashText').textContent,/メス/);
});
