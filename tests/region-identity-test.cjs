const assert = require('node:assert/strict');
const {test} = require('node:test');
const {harness} = require('./helpers/runtime-harness.cjs');
const environment = require('../world-environment.js');
const vm = require('node:vm');

// Catch the old visual-base lookup and its shared cache when changing regions.
test('same-season travel renders the destination scenery, including return trips', () => {
  const h = harness(); h.api.state().lifetime.seasonMode = 'summer';
  for (const [id, wanted, unwanted] of [
    ['snow','🏔️','🥾'], ['mountain','🥾','🎿'], ['snow','🏔️','🥾'],
    ['sea','🏖️','🪼'], ['deepsea','🪼','🏖️'], ['sea','🏖️','🪼'],
    ['forest','🌰','🪷'], ['river_lake','🪷','🌰'], ['forest','🌰','🪷'],
    ['jungle','🌴','🏠'], ['home','🏠','🌴'], ['jungle','🌴','🏠'],
  ]) {
    h.api.state().regionId = id; h.api.render();
    const html = h.get('regionDecor').innerHTML;
    assert.ok(html.includes(wanted), `${id} must show ${wanted}`);
    assert.ok(!html.includes(unwanted), `${id} must not inherit ${unwanted}`);
  }
});

for (const region of ['jungle','desert']) test(`${region} does not acquire snowy forecasts from the global winter rule`, () => {
  for (let day=1;day<=31;day++) for(let hour=0;hour<24;hour+=3) {
    assert.notEqual(environment.simulatedWeather(region,'winter',new Date(2026,0,day,hour)).mode,'snow');
  }
});

test('deepsea and the star stop do not invent surface weather forecasts', () => {
  for(const region of ['deepsea','star_stop']) for(const season of ['spring','summer','autumn','winter']) {
    assert.equal(environment.simulatedWeather(region,season,new Date(2026,0,1)),null);
  }
});

test('observed hometown weather is not used as the weather of a distant destination',async()=>{
  const h=harness({
    geolocation:{getCurrentPosition(ok){ok({coords:{latitude:35,longitude:139}});}},
    fetcher:async url=>({ok:true,json:async()=>String(url).includes('open-meteo')
      ? {current:{weather_code:71,time:Math.floor(h.sandbox.Date.now()/1000)}}
      : {response:{location:[{city:'横浜市',city_kana:'ヨコハマシ',distance:1}]}}}),
  });
  const s=h.api.state();s.regionId='home';s.lifetime.weatherMode='auto';s.lifetime.seasonMode='winter';
  await h.api.requestEnvironment();assert.equal(h.api.effectiveWeather().source,'observed');
  assert.equal(h.api.effectiveWeather().weather,'snow');
  s.regionId='jungle';assert.equal(h.api.effectiveWeather().source,'sim');
  assert.notEqual(h.api.effectiveWeather().weather,'snow');
  s.lifetime.weatherMode='snow';assert.equal(h.api.effectiveWeather().weather,'snow','an explicit manual choice remains available on the surface');
});

test('surface seasons do not introduce heat or cold penalties to underwater and starry places',()=>{
  const h=harness(),s=h.api.state();s.lifetime.timeMode='day';
  for(const region of ['deepsea','star_stop']) {
    s.regionId=region;s.lifetime.seasonMode='summer';const summer=h.api.envModifiers();
    s.lifetime.seasonMode='winter';assert.deepEqual(h.api.envModifiers(),summer);
  }
});

test('underwater rendering and effects ignore surface weather without overwriting the chosen setting', () => {
  const h=harness(), s=h.api.state(); s.regionId='deepsea';
  Object.assign(s.lifetime,{timeMode:'day',seasonMode:'winter'});
  let effects;
  for(const weather of ['sunny','cloudy','rain','snow']) {
    s.lifetime.weatherMode=weather; h.api.render(); h.api.openExclusiveMenu('world'); h.api.renderEnvironment();
    assert.doesNotMatch(h.get('weatherFx').innerHTML,/wx-(sun|cloud|drop|flake|moon|star)\b/);
    assert.doesNotMatch(h.get('seasonBgFx').innerHTML,/data-ui-icon="(?:snow|cherry_blossom|maple_leaf)"/);
    assert.match(h.get('worldNowCard').innerHTML,/水の中/);
    assert.equal(s.lifetime.weatherMode,weather);
    if(effects) assert.deepEqual(h.api.envModifiers(),effects);
    effects=h.api.envModifiers();
  }
});

test('moving between surface, underwater and the star stop refreshes effects with unchanged settings', () => {
  const h=harness(),s=h.api.state();Object.assign(s.lifetime,{weatherMode:'rain',timeMode:'day'});
  s.regionId='sea';h.api.render();assert.match(h.get('weatherFx').innerHTML,/wx-drop/);
  s.regionId='deepsea';h.api.render();assert.doesNotMatch(h.get('weatherFx').innerHTML,/wx-drop/);
  s.regionId='star_stop';h.api.render();assert.match(h.get('weatherFx').innerHTML,/wx-star/);
  assert.doesNotMatch(h.get('weatherFx').innerHTML,/wx-(sun|drop|flake)\b/);
  s.regionId='sea';h.api.render();assert.equal((h.get('weatherFx').innerHTML.match(/class="wx-drop"/g)||[]).length,42);
  assert.equal(s.lifetime.weatherMode,'rain');
});

test('the renamed waterside keeps its saved region identity, visits and historical text', () => {
  const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  const first=harness({storage}),s=first.api.state();
  s.regionId='river_lake';s.lifetime.regionsVisited=['home','river_lake'];
  s.lifeLog=[{emoji:'🏞️',text:'かわ・みずうみへ初めて行った',age:3}];first.api.saveState();
  const next=harness({storage,resume:true});next.api.renderTravelRegionGrid();
  assert.match(next.get('travelRegionGrid').innerHTML,/みずべ/);
  assert.equal(next.api.state().regionId,'river_lake');
  assert.deepEqual(Array.from(next.api.state().lifetime.regionsVisited),['home','river_lake']);
  assert.ok(next.api.state().lifeLog.some(e=>e.text==='かわ・みずうみへ初めて行った'));
});

test('regional game preference does not leak into a former visual base', () => {
  const h=harness(), game=id=>h.api.games.find(g=>g.id===id);
  for(const [region,local,foreign] of [
    ['mountain','downhill-mountain','downhill-snow'], ['deepsea','fishing-deepsea','fishing-sea'],
    ['river_lake','fishing-river','stack-acorn'], ['jungle','road-jungle','road-city'],
  ]) {
    h.api.state().regionId=region;
    assert.equal(h.api.isRegionExclusiveGame(game(local)),true);
    assert.equal(h.api.isRegionExclusiveGame(game(foreign)),false);
  }
});

test('snow country, desert and jungle offer a distinct benefit after combined modifiers', () => {
  const h=harness(),s=h.api.state(); Object.assign(s.lifetime,{timeMode:'day',seasonMode:'summer',weatherMode:'sunny'});
  const effects=id=>{s.regionId=id;return h.api.envModifiers();};
  const home=effects('home'),city=effects('city'),forest=effects('forest');
  assert.ok(effects('snow').sleep>home.sleep);
  assert.ok(effects('snow').play<home.play);
  assert.ok(effects('desert').coin>city.coin);
  assert.ok(effects('jungle').meet>forest.meet);
  assert.ok(effects('memory_lake').sleep>effects('star_stop').sleep);
  assert.ok(effects('star_stop').play<effects('memory_lake').play);
});

for(const [region,caption] of [['deepsea',/深海|くらげ/],['star_stop',/星/],['memory_lake',/思い出/]]) {
  test(`${region} schedules its own event in daytime snow`,()=>{
    const h=harness(),s=h.api.state();s.regionId=region;
    Object.assign(s.lifetime,{weatherMode:'snow',timeMode:'day',seasonMode:'winter'});
    s.lifeLog=[{emoji:'🏠',text:'おうちでおやつを食べた',age:2}];
    h.api.saveState();h.api.render();h.advance(5000);
    vm.runInContext('Math.random=()=>0',h.sandbox);
    h.api.setMessage(''); h.api.scheduleEnvironmentMoment();h.advance(150001);
    assert.equal(s.lifetime.envMoments,1);
    assert.match(h.get('storyFlashText').textContent,caption);
    assert.doesNotMatch(h.get('storyFlashText').textContent,/雪だるま|ひなたぼっこ|ちょうちょ/);
    if(region==='memory_lake') assert.match(h.get('storyFlashText').textContent,/おうちでおやつを食べた/);
  });
}

test('a regional moment waits while asleep or a menu is open',()=>{
  for(const blocked of ['sleep','menu']) {
    const h=harness(),s=h.api.state();s.regionId='star_stop';
    vm.runInContext('Math.random=()=>0',h.sandbox);
    h.api.setMessage(''); if(blocked==='sleep')s.isSleeping=true;else h.api.openExclusiveMenu('world');
    h.api.scheduleEnvironmentMoment();h.advance(150001);
    assert.equal(s.lifetime.envMoments||0,0);
  }
});

test('legend affinity is a soft preference and never overrides unseen priority',()=>{
  const h=harness(),s=h.api.state();
  const counts=region=>{
    const out={};s.regionId=region;
    for(let i=0;i<60;i++) {
      h.sandbox.legendRoll=(i+.5)/60;
      vm.runInContext('Math.random=()=>legendRoll',h.sandbox);
      s.lifetime.legendsMet=[];h.api.triggerLegendEncounter();
      const id=s.lifetime.legendsMet[0];out[id]=(out[id]||0)+1;
    }
    return out;
  };
  const home=counts('home'),forest=counts('forest');
  assert.equal(Object.keys(home).length,5);assert.equal(Object.keys(forest).length,5);
  assert.ok(forest.lamp>home.lamp,'forest must actually prefer the lamp');
  s.lifetime.legendsMet=['stairs','boss','lamp','mirror'];
  h.api.triggerLegendEncounter();assert.ok(s.lifetime.legendsMet.includes('gate'));
});

test('mountain climbing responds to grip timing, reaches the summit and awards once',()=>{
  const h=harness();vm.runInContext('Math.random=()=>0.5',h.sandbox);
  const s=h.api.state(),before=s.lifetime.minigamesPlayed;
  h.api.startMinigame(h.api.games.find(g=>g.id==='downhill-mountain'));
  const area=h.get('minigameOverlay');
  assert.match(area.innerHTML,/岩場のぼり/);
  const score=area.querySelector('#climbScore'),action=area.querySelector('#climbGo');
  h.dispatch(action,'pointerdown');assert.match(score.textContent,/0\/12/,'opening input must not climb');
  // Play from the visible timing meter, independent of the private phase formula.
  for(let frame=0;frame<2400 && s.lifetime.minigamesPlayed===before;frame++) {
    h.advance(16);
    const marker=parseFloat(area.querySelector('#climbMarker').style.left);
    const left=parseFloat(area.querySelector('#climbTarget').style.left),width=parseFloat(area.querySelector('#climbTarget').style.width);
    if(marker>left+width*.35 && marker<left+width*.65) h.dispatch(action,'pointerdown');
  }
  assert.equal(s.lifetime.minigamesPlayed,before+1);
  assert.match(score.textContent,/12\/12/);
  const record=s.lifetime.minigameRecords['downhill-mountain'];
  assert.ok(record.best>=75,JSON.stringify(record));
  const money=s.lifetime.money;h.dispatch(action,'pointerdown');h.advance(5000);
  assert.equal(s.lifetime.money,money);
  assert.equal(s.lifetime.minigamesPlayed,before+1);
  assert.equal((h.sandbox.__naotocchiErrors||[]).length,0);
});

test('climbing misses and retirement do not award a completed game',()=>{
  const h=harness();vm.runInContext('Math.random=()=>0.5',h.sandbox);
  const s=h.api.state(),before=s.lifetime.minigamesPlayed;
  h.api.startMinigame(h.api.games.find(g=>g.id==='downhill-mountain'));
  const area=h.get('minigameOverlay');assert.match(area.innerHTML,/岩場のぼり/);
  for(let frame=0;frame<400;frame++) {
    h.advance(16);
    if(parseFloat(area.querySelector('#climbMarker').style.left)<5)h.dispatch(area.querySelector('#climbGo'),'pointerdown');
  }
  assert.match(area.querySelector('#climbScore').textContent,/0\/12/);
  assert.match(area.querySelector('#climbHint').textContent,/休憩|つかみ/);
  h.api.retireMinigame();h.advance(60000);
  assert.equal(s.lifetime.minigamesPlayed,before);
});

test('climbing draws finite coordinates, accepts keyboard rock selection and times out once',()=>{
  let draws=0;
  const ctx={};
  for(const name of ['setTransform','fillRect','beginPath','moveTo','lineTo','closePath','fill','ellipse','strokeRect','stroke','fillText']) {
    ctx[name]=(...args)=>{draws++;for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value),name);};
  }
  const h=harness({canvasContext:ctx}),s=h.api.state();vm.runInContext('Math.random=()=>0.5',h.sandbox);
  h.api.startMinigame(h.api.games.find(g=>g.id==='downhill-mountain'));h.advance(32);
  const view=h.get('minigameOverlay');assert.ok(draws>0);
  h.dispatch(h.document,'keydown',{key:'ArrowLeft'});h.dispatch(h.document,'keyup',{key:'ArrowLeft'});
  assert.match(view.querySelector('#climbChoice').textContent,/左の岩/);
  h.dispatch(h.document,'keydown',{key:'ArrowRight'});h.dispatch(h.document,'keyup',{key:'ArrowRight'});
  assert.match(view.querySelector('#climbChoice').textContent,/真ん中の岩/);
  h.advance(65000);assert.equal(s.lifetime.minigamesPlayed,1);
  assert.ok(s.lifetime.minigameRecords['downhill-mountain'].best<40);
  const calls=draws;h.advance(5000);assert.equal(draws,calls);
  assert.equal((h.sandbox.__naotocchiErrors||[]).length,0);
});

test('saved climbing records, ordinary region count and total games remain intact',()=>{
  const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  const h=harness({storage}),s=h.api.state();s.lifetime.minigameRecords['downhill-mountain']={best:88,last:62};
  s.lifetime.minigamePlayCounts['downhill-mountain']=7;h.api.saveState();
  const loaded=harness({storage,resume:true});
  assert.equal(loaded.api.state().lifetime.minigameRecords['downhill-mountain'].best,88);
  assert.equal(loaded.api.state().lifetime.minigamePlayCounts['downhill-mountain'],7);
  assert.equal(loaded.api.REGIONS.length,11);assert.equal(loaded.api.games.length,100);
});
