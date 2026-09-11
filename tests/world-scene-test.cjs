const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const scene = fs.existsSync('world-scene.js') ? require('../world-scene.js') : {};
const {harness}=require('./helpers/runtime-harness.cjs');

test('a submerged sea interprets rain and snow as weaker surface light', () => {
  assert.equal(typeof scene.resolveScene, 'function', 'the world presentation model exists');
  const sunny=scene.resolveScene({region:'sea',season:'summer',time:'day',weather:'sunny'});
  for(const weather of ['rain','snow']) {
    const wet=scene.resolveScene({region:'sea',season:'winter',time:'day',weather});
    assert.equal(wet.precipitation,'none');
    assert.equal(wet.motion,'float');
    assert.ok(wet.light<sunny.light);
    assert.match(wet.description,/水面/);
  }
});
test('the sea has four light states and seasonal water without terrestrial particles', () => {
  const lights=new Set();
  for(const time of ['morning','day','evening','night']) {
    lights.add(scene.resolveScene({region:'sea',season:'summer',time,weather:'sunny'}).light);
    for(const season of ['spring','summer','autumn','winter']) for(const weather of ['sunny','cloudy','rain','snow']) {
      const model=scene.resolveScene({region:'sea',time,season,weather});
      assert.ok(Number.isFinite(model.light));
      assert.equal(model.precipitation,'none');
      assert.ok(!/leaf|petal|snow|rain/.test(model.particle));
    }
  }
  assert.equal(lights.size,4);
  assert.notEqual(scene.resolveScene({region:'sea',season:'summer'}).temperature,scene.resolveScene({region:'sea',season:'winter'}).temperature);
});
test('care progresses through four stages and respects the actual health danger', () => {
  const healthy={stage:'adult',health:100,deathMeter:0};
  assert.equal(scene.careLevel(healthy,null,false),'normal');
  assert.equal(scene.careLevel({...healthy,deathMeter:35},null,false),'caution');
  assert.equal(scene.careLevel({...healthy,deathMeter:65},null,false),'warning');
  assert.equal(scene.careLevel(healthy,{severity:'critical'},false),'critical');
  assert.equal(scene.careLevel({...healthy,health:0,deathMeter:0},{severity:'critical'},false),'critical');
  for(const stage of ['egg','dead','farewell']) assert.equal(scene.careLevel({...healthy,stage,dying:true},null,false),'none');
  assert.equal(scene.careLevel({...healthy,infinite:true,dying:true,deathMeter:100},{severity:'warning'},true),'none');
});
test('environment markup is stable and uses bounded, non-interactive particles', () => {
  const model=scene.resolveScene({region:'sea',time:'day',season:'summer',weather:'sunny'});
  const a=scene.sceneMarkup(model,{tier:0,reducedMotion:false});
  assert.deepEqual(a,scene.sceneMarkup(model,{tier:0,reducedMotion:false}));
  assert.ok(!/button|tabindex|onload|onclick/.test(JSON.stringify(a)));
  const count=m=>(m.atmosphere.match(/world-particle/g)||[]).length;
  assert.ok(count(a)<=24);
  assert.ok(count(scene.sceneMarkup(model,{tier:2,reducedMotion:false}))<count(a));
  assert.equal(count(scene.sceneMarkup(model,{tier:0,reducedMotion:true})),0);
});

test('every actual region has its own landscape and climate-correct weather across 832 combinations', () => {
  const h=harness();
  assert.deepEqual(Object.keys(scene.SCENES).sort(),[...Array.from(h.api.REGIONS,r=>r.id),...Array.from(h.window.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1.regions.special,r=>r.id)].sort());
  const images=new Set();
  for(const region of Object.keys(scene.SCENES)) {
    images.add(scene.resolveScene({region}).image);
    for(const time of ['morning','day','evening','night']) for(const season of ['spring','summer','autumn','winter']) for(const weather of ['sunny','cloudy','rain','snow']) {
      const m=scene.resolveScene({region,time,season,weather});
      assert.ok(fs.existsSync(m.image),`landscape is present: ${m.image}`);
      assert.ok(Number.isFinite(m.light) && m.light>0 && m.light<=1);
      if(['sea','deepsea','star_stop'].includes(region)) {
        assert.equal(m.precipitation,'none');
        assert.doesNotMatch(m.particle,/rain|snow|leaf|petal/);
      }
      if(['deepsea','star_stop'].includes(region)) {
        assert.equal(m.rays,false);assert.equal(m.light,1);assert.equal(m.temperature,0);
      }
      if(['jungle','desert'].includes(region)) {
        assert.notEqual(m.precipitation,'snow');assert.equal(m.frost,false);
      }
      if(['forest','river_lake'].includes(region)&&weather==='rain') assert.equal(m.precipitation,'rain');
    }
  }
  assert.equal(images.size,13);
  assert.notEqual(scene.resolveScene({region:'forest',season:'autumn'}).image,scene.resolveScene({region:'forest',season:'winter'}).image);
  assert.notEqual(scene.resolveScene({region:'city',season:'summer'}).warmth,scene.resolveScene({region:'city',season:'autumn'}).warmth);
  assert.equal(scene.sceneMarkup(scene.resolveScene({region:'home',season:'winter'})).foreground,'');
  for(const file of require('../assets/world/provenance.json').outputs) {
    assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(file.file)).digest('hex'),file.sha256,`${file.file} matches the inspected artwork`);
  }
});

test('presentation uses current environment without changing saved choices or game effects', () => {
  const h=harness({worldScene:true}),s=h.api.state();
  h.get('lifeCardOverlay').classList.add('hidden');
  Object.assign(s.lifetime,{timeMode:'morning',seasonMode:'winter',weatherMode:'snow',screenThemeId:'sky',deviceThemeId:'mint'});
  for(const region of ['sea','forest','jungle','deepsea','star_stop','river_lake']) {
    s.regionId=region;
    const modifiers=JSON.stringify(h.api.envModifiers());
    h.api.render();
    assert.equal(h.get('worldScene').dataset.region,region);
    assert.equal(h.document.body.classList.contains('world-mode'),true);
    assert.equal(s.lifetime.weatherMode,'snow');
    assert.equal(s.lifetime.timeMode,'morning');
    assert.equal(s.lifetime.seasonMode,'winter');
    assert.equal(s.lifetime.screenThemeId,'sky');
    assert.equal(s.lifetime.deviceThemeId,'mint');
    assert.equal(JSON.stringify(h.api.envModifiers()),modifiers);
    assert.equal(h.get('regionDecor').innerHTML,'');
    assert.equal(h.get('weatherFx').innerHTML,'');
  }
});

test('normal ticks keep scenery nodes; overlays, visibility, reduced motion and performance tiers are respected', () => {
  const h=harness({worldScene:true}),s=h.api.state();s.regionId='sea';
  h.get('lifeCardOverlay').classList.add('hidden');h.api.render();
  const atmosphere=h.get('worldAtmosphere');
  // A DOM marker survives ordinary renders only if innerHTML is not reassigned.
  atmosphere.innerHTML+='<!-- preserved -->';
  s.hunger=75;h.api.render();assert.match(atmosphere.innerHTML,/preserved/);
  h.api.openExclusiveMenu('profile');h.api.render();assert.equal(h.document.body.dataset.worldPaused,'true');
  h.api.closeAllMenuOverlays();h.api.render();assert.equal(h.document.body.dataset.worldPaused,'false');
  h.document.visibilityState='hidden';h.dispatch(h.document,'visibilitychange');
  assert.equal(h.document.body.dataset.worldPaused,'true');
  h.document.visibilityState='visible';h.dispatch(h.document,'visibilitychange');
  // Returning can show the existing welcome story; let that real notice finish.
  h.advance(10000);
  assert.equal(h.document.body.dataset.worldPaused,'false');
  h.setReducedMotion(true);assert.equal(h.document.body.dataset.worldReduced,'true');
  assert.doesNotMatch(atmosphere.innerHTML,/world-particle/);
  h.setReducedMotion(false);h.api.setPerfTier(2);h.api.render();
  assert.equal(h.document.body.dataset.worldTier,'2');
  assert.equal((atmosphere.innerHTML.match(/world-particle/g)||[]).length,5);
});

test('environment controls update the visible world while the menu remains open', () => {
  const h=harness({worldScene:true}),s=h.api.state();s.regionId='forest';
  h.api.openExclusiveMenu('world');h.api.render();
  Object.assign(s.lifetime,{timeMode:'night',weatherMode:'rain',seasonMode:'autumn'});
  h.api.renderEnvironment();
  assert.equal(h.get('worldScene').dataset.time,'night');
  assert.equal(h.get('worldScene').dataset.precipitation,'rain');
  assert.equal(h.get('worldScene').dataset.season,'autumn');
  assert.equal(h.document.body.dataset.worldPaused,'true');
});

test('health danger, explicit care changes, partner affinity and recovery remain legible in the world', () => {
  const h=harness({worldScene:true}),s=h.api.state();s.regionId='sea';
  h.get('lifeCardOverlay').classList.add('hidden');
  Object.assign(s,{health:0,hunger:0,energy:0,happiness:0,deathMeter:0,lowHealthStreak:0});h.api.render();
  assert.equal(h.get('device').dataset.worldCare,'critical');
  assert.match(h.get('worldCareState').textContent,/いそいで/);
  assert.equal(h.get('feedBtn').dataset.careRecommended,'true');
  h.dispatch(h.get('feedBtn'),'click');assert.equal(s.hunger,25);
  Object.assign(s,{health:90,hunger:70,energy:90,happiness:90});h.api.render();
  assert.equal(h.get('device').dataset.worldCare,'normal');
  h.dispatch(h.get('feedBtn'),'click');assert.match(h.get('message').textContent,/おなか.*[+＋]25/);
  s.partner={id:'robot_neighbor',label:'ロボット',gender:'nonbinary',orientationId:'pan',affection:83};h.api.render();
  assert.match(h.get('partnerLabel').innerHTML,/なかよし度 83/);
  assert.doesNotMatch(h.get('partnerLabel').innerHTML,/NaN/);
});

test('games pause the world immediately and story expiry cannot resume it behind a game', () => {
  const h=harness({worldScene:true});h.api.state().regionId='sea';h.api.render();
  assert.equal(h.document.body.dataset.worldPaused,'false');
  h.api.showStoryEvent({emoji:'🌱',message:'おはなし'});
  assert.equal(h.document.body.dataset.worldPaused,'true');
  h.advance(10000);assert.equal(h.document.body.dataset.worldPaused,'false');
  h.api.startMinigame(h.api.games[0]);
  assert.equal(h.document.body.dataset.worldPaused,'true');
  h.api.loop();assert.equal(h.document.body.dataset.worldPaused,'true');
  h.api.showStoryEvent({emoji:'🌱',message:'おはなし'});h.advance(10000);
  assert.equal(h.document.body.dataset.worldPaused,'true');
});
