const {test} = require('node:test');
const assert = require('node:assert/strict');
const {harness: runtimeHarness} = require('./helpers/runtime-harness.cjs');
function harness(options) {
  const h=runtimeHarness(options);
  // The lightweight DOM does not parse index.html's initial hidden class.
  h.get('lifeCardOverlay').classList.add('hidden');
  return h;
}

function critical(h) {
  Object.assign(h.api.state(), {health:0,hunger:0,happiness:0,energy:0,
    deathMeter:0,lowHealthStreak:0,totalSicknessCount:10,isSick:false,isSleeping:false,ageTicks:101});
  h.api.render();
}

test('health danger is visible before dying and survives unrelated messages and expiry', () => {
  const h=harness(); critical(h);
  assert.equal(h.api.state().dying,false);
  assert.equal(h.get('message').dataset.careSeverity,'critical');
  assert.match(h.get('message').textContent,/ごはん/);
  h.api.setMessage('たのしいできごと');
  assert.equal(h.get('message').dataset.careSeverity,'critical');
  assert.doesNotMatch(h.get('message').textContent,/たのしいできごと/);
  h.advance(12000);
  assert.equal(h.get('message').dataset.careSeverity,'critical');
  assert.match(h.get('message').textContent,/けんこう/);
});

test('critical care advice follows the real sequence without medicine for a healthy pet', () => {
  const h=harness();critical(h);
  h.dispatch(h.get('feedBtn'),'click');
  assert.equal(h.get('message').dataset.careSeverity,'critical');
  assert.equal(h.get('feedBtn').dataset.careRecommended,'true');
  assert.notEqual(h.get('medicineBtn').dataset.careRecommended,'true');
  Object.assign(h.api.state(),{hunger:70,happiness:80,energy:10});h.api.render();
  assert.equal(h.get('sleepBtn').dataset.careRecommended,'true');
  Object.assign(h.api.state(),{health:50,hunger:80,happiness:80,energy:80,lowHealthStreak:0});h.api.render();
  assert.notEqual(h.get('message').dataset.careSeverity,'critical');
});

test('six-tick health death remains unchanged while every living tick has a notice', () => {
  const h=harness();critical(h);
  // Production randomness is untouched. Suppress unrelated illness in this fixture.
  require('node:vm').runInContext('Math.random=()=>0.9999',h.sandbox);
  for(let n=1;n<=6;n++) {
    h.api.tick();h.api.render();
    if(n<6) {
      assert.equal(h.api.state().stage,'growing');
      assert.equal(h.get('message').dataset.careSeverity,'critical');
    }
  }
  assert.equal(h.api.state().stage,'dead');
  assert.equal(h.api.state().lowHealthStreak,6);
  assert.ok(Math.abs(h.api.state().deathMeter-24.9024)<0.00001);
  assert.notEqual(h.get('message').dataset.careSeverity,'critical');
});

test('reloaded illness reconstructs a notice and medicine resolves it', () => {
  const seed=harness();Object.assign(seed.api.state(),{isSick:true,sicknessType:'かぜ',hunger:80});
  const saved=JSON.stringify(seed.api.state());
  const h=harness({resume:true,storage:{getItem:key=>key==='naotocchi-save-v1'?saved:null,setItem(){},removeItem(){}}});
  h.api.render();
  assert.equal(h.get('message').dataset.careKind,'sick');
  assert.equal(h.get('medicineBtn').dataset.careRecommended,'true');
  h.dispatch(h.get('medicineBtn'),'click');
  assert.equal(h.api.state().isSick,false);
  assert.notEqual(h.get('message').dataset.careKind,'sick');
  assert.match(h.get('message').textContent,/[+＋−]/);
});

test('explicit care displays changes once; ordinary natural ticks stay quiet', () => {
  const h=harness();Object.assign(h.api.state(),{hunger:60,happiness:80});h.api.setMessage('');h.api.render();
  h.api.tick();h.api.render();
  assert.notEqual(h.get('message').dataset.careKind,'change');
  h.dispatch(h.get('feedBtn'),'click');
  assert.match(h.get('message').textContent,/おなか.*[+＋]25/);
  h.advance(5000);
  assert.notEqual(h.get('message').dataset.careKind,'change');
});

test('danger presentation clears behind overlays and returns with the same state', () => {
  const h=harness();critical(h);
  h.api.openExclusiveMenu('profile');h.api.render();
  assert.equal(h.get('screen').dataset.careSeverity,'');
  assert.notEqual(h.get('feedBtn').dataset.careRecommended,'true');
  h.api.closeAllMenuOverlays();h.api.render();
  assert.equal(h.get('screen').dataset.careSeverity,'critical');
});

test('egg, farewell and immortal states do not inherit death warnings', () => {
  const h=harness();critical(h);
  for(const stage of ['egg','farewell','dead']) {
    h.api.state().stage=stage;h.api.render();
    assert.notEqual(h.get('message').dataset.careSeverity,'critical');
  }
  Object.assign(h.api.state(),{stage:'growing',infinite:true});h.api.render();
  assert.notEqual(h.get('message').dataset.careSeverity,'critical');
  assert.doesNotMatch(h.get('message').textContent,/いのちが|おわかれが|しんで/);
});

test('reduced motion and lightweight mode retain static warning text', () => {
  for(const mode of ['reduced','light']) {
    const h=harness({reducedMotion:mode==='reduced'});
    if(mode==='light') for(let i=0;i<92;i++){h.advance(35);h.api.mgPerfSample();}
    critical(h);
    assert.equal(h.get('message').dataset.careSeverity,'critical');
    assert.match(h.get('message').textContent,/ごはん/);
    const before=h.get('castResponse').animations.length;
    h.api.render();h.api.render();
    assert.equal(h.get('castResponse').animations.length,before);
  }
});

test('numeric feedback keeps the explanation of a mistaken medicine visible', () => {
  const h=harness();Object.assign(h.api.state(),{hunger:80,happiness:80,energy:80,health:80});h.api.render();
  h.dispatch(h.get('medicineBtn'),'click');
  assert.match(h.get('message').textContent,/びょうきではないのにくすりをのませた/);
  assert.match(h.get('message').textContent,/けんこう −5/);
  h.advance(4199);
  assert.match(h.get('message').textContent,/びょうきではないのにくすりをのませた/);
});

test('a growth milestone waits for action feedback instead of being forgotten', () => {
  const h=harness();Object.assign(h.api.state(),{hunger:60,growth:0});h.api.setMessage('');h.api.render();
  h.dispatch(h.get('feedBtn'),'click');h.api.state().sodachi+=1;h.api.render();
  h.advance(5000);
  assert.match(h.get('message').textContent,/そだち.*\+1/);
});

test('a recovery milestone waits while a higher priority warning remains', () => {
  const h=harness();Object.assign(h.api.state(),{health:20,hunger:15,growth:0});h.api.render();
  h.api.state().health=30;h.api.render();h.advance(6000);
  assert.equal(h.get('message').dataset.careKind,'hunger');
  h.api.state().hunger=70;h.api.render();
  assert.match(h.get('message').textContent,/けんこうがもどってきた/);
});

test('a delayed sleep recovery never tells an already awake pet to wake', () => {
  const h=harness();Object.assign(h.api.state(),{hunger:60,energy:70,growth:0});h.api.setMessage('');h.api.render();
  h.dispatch(h.get('feedBtn'),'click');
  h.dispatch(h.get('sleepBtn'),'click');
  h.api.state().energy=100;h.api.render();
  h.dispatch(h.get('sleepBtn'),'click');h.advance(4300);
  assert.equal(h.api.state().isSleeping,false);
  assert.match(h.get('message').textContent,/げんき/);
  assert.doesNotMatch(h.get('message').textContent,/おきる|おきよう/);
});

test('illness care is readable before an arbitrarily long saved disease name', () => {
  const h=harness();
  const disease='しんぞうがバクバクする、とてもながいなまえのびょうき';
  for (const health of [0, 20, 90]) {
    Object.assign(h.api.state(),{isSick:true,sicknessType:disease,health,hunger:80,energy:80});
    h.api.render();
    const text=h.get('message').textContent;
    assert.ok(text.indexOf('くすり')>=0 && text.indexOf('くすり')<text.indexOf(disease), text);
    assert.ok(text.includes(disease), 'the saved illness remains available in full');
    assert.equal(h.get('medicineBtn').dataset.careRecommended,'true');
    assert.equal(h.api.state().sicknessType,disease);
  }
});
