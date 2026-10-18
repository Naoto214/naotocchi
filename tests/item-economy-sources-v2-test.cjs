const assert = require('node:assert/strict');
const {test} = require('node:test');
const {harness} = require('./helpers/runtime-harness.cjs');

const BALANCE = 437;
const LEGENDS = ['gate', 'stairs', 'boss', 'lamp', 'mirror'];
function setup(options) {
  const h = harness(options), s = h.api.state();
  s.lifetime.money = BALANCE;
  h.api.setRandom(() => 0.99);
  return {h, s};
}
function storage() {
  const data = new Map();
  return {getItem:k=>data.get(k)||null, setItem:(k,v)=>data.set(k,v), removeItem:k=>data.delete(k)};
}
function care(s) {
  return JSON.stringify({money:s.lifetime.money, happiness:s.happiness, growth:s.growth,
    decline:s.decline, death:s.deathMeter, energy:s.energy, sodachi:s.sodachi, max:s.maxSodachi});
}

// Each source must still execute its event while leaving an existing balance intact.
test('age stage transition keeps its story and life log without coins', () => {
  const {h,s} = setup();
  s.ageTicks = 40 * 20;
  const logs = s.lifeLog.length;
  h.api.onAgeChanged(39);
  assert.equal(s.lifeLog.length, logs + 1);
  assert.match(s.lifeLog.at(-1).text, /40さい/);
  assert.match(h.get('storyFlashText').textContent, /40さい/);
  assert.equal(s.lifetime.money, BALANCE);
  h.api.onAgeChanged(40);
  assert.equal(s.lifeLog.length, logs + 1);
  assert.equal(s.lifetime.money, BALANCE);
});
for (const age of [41, 50, 90]) test(`birthday ${age} keeps growth, decline relief and celebration without coins`, () => {
  const {h,s} = setup();
  s.growth = 0; s.decline = 20;
  h.api.onBirthday(age);
  assert.equal(s.growth, 2);
  assert.equal(s.decline, 15);
  assert.match(h.get('birthdayToast').textContent, new RegExp(`${age}さい`));
  if (age === 90) assert.equal(s.miracleGuard, true);
  if (age === 50) assert.ok(s.midlifeSeen.includes(50));
  assert.equal(s.lifetime.money, BALANCE);
});
for (const [age, happy, growth, decline] of [[44,60,6,20],[50,58,0,20],[56,56,0,10],[62,56,8,20],[66,50,0,20]]) {
  test(`midlife ${age} preserves its noncoin effect and one-time record`, () => {
    const {h,s} = setup();
    s.happiness=50; s.growth=0; s.decline=20;
    const logs=s.lifeLog.length;
    assert.equal(h.api.maybeMidlifeEvent(age),true);
    assert.equal(s.lifeLog.length,logs+1);
    assert.match(s.lifeLog.at(-1).text,new RegExp(`${age}さい`));
    assert.deepEqual([s.happiness,s.growth,s.decline],[happy,growth,decline]);
    assert.equal(s.lifetime.money,BALANCE);
    assert.equal(h.api.maybeMidlifeEvent(age),false);
    assert.equal(s.lifeLog.length,logs+1);
    assert.equal(s.lifetime.money,BALANCE);
  });
}
for (const value of [30,40,50,60,70,80,90,100]) test(`sodachi ${value} keeps milestone record and eggs, without coins`, () => {
  const {h,s} = setup();
  s.maxSodachi=value;
  const rare=h.api.itemStock('c_egg_rare'), normal=h.api.itemStock('c_egg_normal'), logs=s.lifeLog.length;
  h.api.onSodachiMilestone(value);
  assert.equal(s.lifeLog.length,logs+1);
  assert.ok(s.itemLife.milestonesPaid.includes(value));
  assert.equal(h.api.itemStock('c_egg_rare'),rare+(value===90?1:0));
  assert.equal(h.api.itemStock('c_egg_normal'),normal+(value===100?1:0));
  assert.doesNotMatch(h.api.getMessage()+h.get('storyFlashText').textContent,/コイン|💰/);
  assert.equal(s.lifetime.money,BALANCE);
  h.api.onSodachiMilestone(value);
  assert.equal(s.lifeLog.length,logs+1);
  assert.equal(h.api.itemStock('c_egg_rare'),rare+(value===90?1:0));
  assert.equal(h.api.itemStock('c_egg_normal'),normal+(value===100?1:0));
  assert.equal(s.lifetime.money,BALANCE);
});

function runMoment(h, draw) {
  h.api.saveState(); h.api.render(); h.advance(5000);
  let calls=0;
  h.api.setRandom(() => ++calls === 3 ? draw : 0);
  h.api.setMessage(''); h.api.scheduleEnvironmentMoment(); h.advance(150001);
}
for (const [region,time,draw,caption] of [
  ['home','night',0.45,/流れ星/],
  ['desert','day',0.3,/かざり/],
  ['star_stop','day',0.5,/星のかけら/],
]) test(`${region} former coin moment still appears and records without paying`, () => {
  const {h,s}=setup(); s.regionId=region;
  Object.assign(s.lifetime,{weatherMode:'sunny',timeMode:time,seasonMode:'summer'});
  runMoment(h,draw);
  assert.equal(s.lifetime.envMoments,1);
  assert.match(h.get('storyFlashText').textContent,caption);
  assert.doesNotMatch(h.get('storyFlashText').textContent,/💰|コイン/);
  assert.equal(s.lifetime.money,BALANCE);
});
test('environment callbacks ignore a latent money field while preserving noncoin effects', () => {
  const {h,s}=setup(); s.regionId='star_stop'; s.happiness=50;
  h.api.REGION_MOMENTS.star_stop[0].money=999;
  runMoment(h,0);
  assert.equal(s.lifetime.envMoments,1);
  assert.equal(s.happiness,56);
  assert.equal(s.lifetime.money,BALANCE);
});
test('memory lake still recalls life memories and recovers happiness without coins', () => {
  const {h,s}=setup(); s.regionId='memory_lake'; s.happiness=50;
  s.lifeLog=[{emoji:'🏠',text:'おうちでおやつを食べた',age:2}];
  runMoment(h,0);
  assert.equal(s.happiness,56);
  assert.match(h.get('storyFlashText').textContent,/おうちでおやつを食べた/);
  assert.equal(s.lifetime.money,BALANCE);
});

test('sticker tasks record completion once without points or coins', () => {
  const {h,s}=setup(), store=h.api.stickerStore();
  for(const id of ['form:dog:0','form:dog:1','form:cat:0']) {
    h.api.grantSticker(id); h.api.placeSticker('page-1',id);
  }
  assert.deepEqual(Array.from(h.api.checkStickerTasks(),t=>t.id),['page-any-3']);
  assert.equal(Object.hasOwn(store,'kakera'),false);
  assert.doesNotMatch(h.get('storyFlashText').textContent,/ポイント|💰|コイン/);
  h.api.renderStickerOverlay();
  assert.doesNotMatch(h.get('stickerTasks').textContent,/ポイント|💰|コイン|undefined/);
  assert.equal(s.lifetime.money,BALANCE);
  assert.equal(h.api.checkStickerTasks().length,0);
  assert.equal(s.lifetime.money,BALANCE);
});
for(const minutes of [10,60,600]) test(`offline ${minutes} minutes preserves recovery and memory without money`, () => {
  const {h,s}=setup(); s.hunger=80; s.happiness=80; s.energy=30;
  const logs=s.lifeLog.length;
  const result=h.api.applyOfflineProgress(1000,1000-minutes*60000);
  assert.equal(result.ticks,minutes===10?200:600);
  assert.equal(s.hunger,50); assert.equal(s.happiness,50);
  assert.equal(s.energy,minutes===10?40:60);
  assert.equal(s.lifeLog.length,logs+1);
  assert.match(s.lifeLog.at(-1).text,/るすばん/);
  assert.equal(s.lifetime.money,BALANCE);
  assert.doesNotMatch(h.api.getMessage()+h.get('storyFlashText').textContent,/💰|コイン/);
  h.api.applyOfflineProgress(1000,1000-minutes*60000);
  assert.equal(s.lifetime.money,BALANCE);
});

for(const id of LEGENDS) test(`eligible ${id} legend keeps discovery, life log and movie without any care or coin reward`, () => {
  const {h,s}=setup();
  Object.assign(s,{maxSodachi:70,growth:7,decline:43,happiness:38,deathMeter:27,energy:62,legendMet:false});
  s.lifetime.legendsMet=LEGENDS.filter(other=>other!==id);
  const before=care(s), logs=s.lifeLog.length;
  h.api.setRandom(()=>0);
  h.api.maybeLegendEncounter();
  assert.equal(s.legendMet,true);
  assert.equal(s.lifetime.legendsMet.length,5);
  assert.equal(s.lifetime.legendsMet.at(-1),id);
  assert.equal(s.lifeLog.length,logs+1);
  assert.match(s.lifeLog.at(-1).text,/にであった/);
  assert.equal(h.get('dateOverlay').classList.contains('hidden'),false);
  assert.equal(h.get('dateMovieScene').dataset.legend,id);
  assert.equal(care(s),before);
  h.api.closeDateOverlay(); h.api.maybeLegendEncounter();
  assert.equal(s.lifeLog.length,logs+1);
  assert.equal(care(s),before);
});
test('repeated legend trigger cannot create a second encounter in one life', () => {
  const {h,s}=setup(); s.maxSodachi=70; h.api.setRandom(()=>0);
  h.api.triggerLegendEncounter();
  h.api.closeDateOverlay();
  const before=JSON.stringify({log:s.lifeLog,seen:s.lifetime.legendsMet,care:care(s)});
  h.api.triggerLegendEncounter();
  assert.equal(JSON.stringify({log:s.lifeLog,seen:s.lifetime.legendsMet,care:care(s)}),before);
  assert.equal(h.get('dateOverlay').classList.contains('hidden'),true);
});
for(const id of LEGENDS) test(`${id} legend movie has no payout beat or footer`, () => {
  const {h}=setup(); h.api.setRandom(()=>0);
  h.api.playLegendEncounterMovie({id,name:id,emoji:'✨'});
  for(let beat=0;beat<12;beat++) {
    assert.doesNotMatch(h.get('dateMovieCaption').textContent,/コイン|💰|undefined/);
    assert.notEqual(h.get('dateMovieScene').dataset.action,'reward');
    h.advance(3500);
  }
  assert.ok(h.get('dateMovieCaption').textContent.length>0);
  assert.equal(h.get('dateMovieCloseBtn').classList.contains('hidden'),false);
});
test('old claimed save retains balances, inventory and event claims across reload without repeat grants', () => {
  const store=storage(),{h,s}=setup({storage:store});
  s.itemLife.milestonesPaid=[30,40,50,60,70,80,90,100];
  s.midlifeSeen=[44,50,56,62,66]; s.legendMet=true;
  s.lifetime.legendsMet=['gate']; s.items.c_egg_rare=2; s.items.c_egg_normal=3;
  const stickers=h.api.stickerStore(); stickers.tasksDone=['page-any-3'];
  for(const id of ['form:dog:0','form:dog:1','form:cat:0']) {h.api.grantSticker(id);h.api.placeSticker('page-1',id);}
  h.api.saveState();
  const next=harness({storage:store,resume:true}), loaded=next.api.state(), logs=loaded.lifeLog.length;
  next.api.onSodachiMilestone(90); next.api.onSodachiMilestone(100);
  assert.equal(next.api.maybeMidlifeEvent(50),false);
  assert.equal(next.api.maybeMidlifeEvent(66),false);
  assert.equal(next.api.checkStickerTasks().length,0);
  next.api.setRandom(()=>0); next.api.maybeLegendEncounter();
  assert.equal(loaded.lifetime.money,BALANCE);
  assert.equal(next.api.itemStock('c_egg_rare'),2); assert.equal(next.api.itemStock('c_egg_normal'),3);
  assert.equal(Object.hasOwn(next.api.stickerStore(),'kakera'),false); assert.equal(loaded.lifeLog.length,logs);
  assert.deepEqual(Array.from(loaded.lifetime.legendsMet),['gate']);
});

test('environment guidance keeps care coefficients but removes obsolete game coin modifiers', () => {
  const {h,s}=setup();
  Object.assign(s.lifetime,{weatherMode:'rain',timeMode:'day',seasonMode:'autumn'}); s.regionId='desert';
  h.api.openExclusiveMenu('world'); h.api.renderEnvironment();
  assert.doesNotMatch(h.get('worldNowCard').textContent,/ゲームのおかね|コイン.*%/);
  const mods=h.api.envModifiers();
  assert.equal(mods.happy,1.15*0.95); assert.equal(mods.hunger,1.1); assert.equal(mods.meet,0.7);
  assert.equal(mods.coin,undefined);
});
