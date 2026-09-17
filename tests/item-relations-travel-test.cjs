const assert=require('node:assert/strict');
const {test}=require('node:test');
const vm=require('node:vm');
const {harness}=require('./helpers/runtime-harness.cjs');
function setup(equipped, options){const h=harness(options),s=h.api.state(); Object.assign(s.lifetime,{equippedItemId:equipped,weatherMode:'sunny',timeMode:'day',seasonMode:'spring'}); h.api.ITEM_SYSTEM.normalize(s); Object.assign(s,{regionId:'home',orientationId:'pan',attractedTo:['male','female','nonbinary'],gender:'male'}); vm.runInContext('Math.random=()=>0.99',h.sandbox); return {h,s};}
function partner(h,s){const p=h.api.REGIONS.flatMap(r=>r.candidates||[])[0]; s.partner=JSON.parse(JSON.stringify({...p,affection:50,bondCount:0,married:false}));return s.partner;}
function click(h,id){h.dispatch(h.get(id),'click');}
function childClick(h,id,b){h.get(id).closest=()=>b;h.dispatch(h.get(id),'click');}
function choose(h,id,data){const b=h.get('choice'); b.dataset=data;childClick(h,id,b);}
function travel(h,id){h.api.travelToRegion(h.api.REGIONS.find(r=>r.id===id));}
function reload(s){return harness({resume:true,storage:{getItem:k=>k==='naotocchi-save-v1'?JSON.stringify(s):null,setItem(){},removeItem(){}}});}

test('backpack removes travel hunger and energy costs but does not prevent fatigue',()=>{
 const {h,s}=setup('travel1');s.travelStreak=100;const e=s.energy,f=s.hunger,m=s.happiness;travel(h,'forest');assert.equal(s.energy,e);assert.equal(s.hunger,f);assert.equal(s.happiness,m-3);
});
test('lantern requires ownership and visited region, cooldown 200, gives no cash or natural observations',()=>{
 const {h,s}=setup();s.lifetime.regionsVisited=['home','forest'];h.api.renderItemOverlay();choose(h,'itemRelationActions',{itemRelation:'lantern',region:'forest'});assert.equal(s.lifetime.itemMemories.lights.length,0);
 s.lifetime.ownedNaotoItems=['naoto_lantern'];s.lifetime.timeMode='auto';s.lifetime.weatherMode='auto';s.lifetime.envMoments=9;h.api.saveState();
 const observations=()=>JSON.stringify({weather:s.lifetime.weatherSeen,time:s.lifetime.timeSeen,envPlays:s.lifetime.envPlays,envMoments:s.lifetime.envMoments,achievements:s.achievementsUnlocked,discovered:s.discoveredStages,rareCompanions:s.lifetime.rareCompanionsRecruited,legends:s.lifetime.legendsMet,legendMet:s.legendMet,dreamEggs:s.lifetime.dreamEggs,regions:s.lifetime.regionsVisited,specialRegions:s.lifetime.specialRegionsVisited});
 const before=observations();const money=s.lifetime.money;choose(h,'itemRelationActions',{itemRelation:'lantern',region:'mountain'});assert.equal(s.lifetime.itemMemories.lights.length,0);
 choose(h,'itemRelationActions',{itemRelation:'lantern',region:'forest'});assert.equal(s.lifetime.itemMemories.lights.length,1);assert.equal(s.lifetime.money,money);assert.equal(observations(),before);
 choose(h,'itemRelationActions',{itemRelation:'lantern',region:'home'});assert.equal(s.lifetime.itemMemories.lights.length,1);s.lifetime.itemProgress.ticks+=200;choose(h,'itemRelationActions',{itemRelation:'lantern',region:'home'});assert.equal(s.lifetime.itemMemories.lights.length,2);assert.equal(observations(),before);
 h.api.renderNaotoItemGrid();assert.match(h.get('naotoItemGrid').innerHTML,/なおとのランタン/);
});
test('equipment reactions only occur for actual eligible care and active protection',()=>{
 const {h,s}=setup('bowtie');s.hunger=50;click(h,'feedBtn');assert.equal(h.get('petSprite').dataset.itemReaction,'bowtie');
 delete h.get('petSprite').dataset.itemReaction;s.hunger=90;click(h,'feedBtn');assert.equal(h.get('petSprite').dataset.itemReaction,undefined);
 s.isSick=false;s.lifetime.equippedItemId='ribbon';s.happiness=80;h.api.tick();assert.equal(h.get('petSprite').dataset.itemReaction,undefined);
 s.happiness=25;h.api.tick();assert.equal(s.happiness,100);assert.equal(h.get('petSprite').dataset.itemReaction,'ribbon');
 delete h.get('petSprite').dataset.itemReaction;s.lifetime.equippedItemId='scarf';s.lifetime.weatherMode='snow';h.api.tick();assert.equal(h.get('petSprite').dataset.itemReaction,undefined);
 s.isSick=true;s.sicknessType='テストのびょうき';h.api.tick();assert.equal(s.isSick,false);assert.equal(h.get('petSprite').dataset.itemReaction,'scarf');
 s.lifetime.equippedItemId=null;s.lifetime.ownedNaotoItems=['naoto_charm'];s.ageTicks=69*20;s.lifetime.itemProgress.ticks=199;delete h.get('petSprite').dataset.itemReaction;h.api.tick();assert.equal(h.get('petSprite').dataset.itemReaction,undefined);
 s.ageTicks=70*20;s.lifetime.itemProgress.ticks=299;h.api.tick();assert.equal(h.get('petSprite').dataset.itemReaction,'naoto_charm');
});
test('guest origin persists across appearance, reload and codes but differs for a new life',()=>{
 let {h,s}=setup();const first=h.api.decodeGuestCode(h.api.encodeGuestCode());assert.equal(typeof first.originId,'string');
 s.speciesLine='cat';s.stageIndex=6;s.traitCounts.gentle=10;const changed=h.api.decodeGuestCode(h.api.encodeGuestCode());assert.equal(changed.originId,first.originId);
 h=reload(s);assert.equal(h.api.decodeGuestCode(h.api.encodeGuestCode()).originId,first.originId);click(h,'resetBtn');Object.assign(h.api.state(),{speciesLine:'dog',stageIndex:0,gender:'male',orientationId:'pan',attractedTo:['male','female','nonbinary']});assert.notEqual(h.api.decodeGuestCode(h.api.encodeGuestCode()).originId,first.originId);
 const payload={s:'dog',i:5,g:'male',o:'pan',a:['male','female','nonbinary'],t:{}};
 const code=p=>'NAOTOCCHI1:'+btoa(encodeURIComponent(JSON.stringify(p)));
 assert.equal(h.api.decodeGuestCode(code(payload)).originId,undefined);
 for(const u of [{},'',5,'<script>','x'.repeat(100)])assert.equal(h.api.decodeGuestCode(code({...payload,u})),null);
});
test('court letters capture the real new partner and survive form changes and a new life',()=>{
 const {h,s}=setup('partner1');s.regionId='city';const c=h.api.REGIONS.find(r=>r.id==='city').candidates[0];s.gender=c.attractedTo[0];s.attractedTo=[c.gender];s.lifetime.partnerEncounters=[c.id];vm.runInContext('Math.random=()=>0',h.sandbox);click(h,'courtBtn');assert.equal(s.lifetime.itemMemories.letters.length,1);const m=s.lifetime.itemMemories.letters[0];assert.equal(m.kind,'letters');assert.equal(m.event,'court');assert.equal(m.partner.id,c.id);assert.equal(JSON.stringify(m.partner.attractedTo),JSON.stringify(c.attractedTo));const captured=JSON.stringify(m);s.partner.affection=2;s.speciesLine='cat';click(h,'resetBtn');assert.equal(JSON.stringify(h.api.state().lifetime.itemMemories.letters[0]),captured);
});

// Match the initial home markup: these overlays are hidden until explicitly opened.
function feedbackSetup(equipped, options) {
  const result = setup(equipped, options);
  for (const id of ['lifeCardOverlay','storyFlash']) result.h.get(id).classList.add('hidden');
  result.h.api.render();
  return result;
}
test('danger-triggered ribbon recovery delivers readable feedback in both motion modes', () => {
  for (const reducedMotion of [false, true]) {
    const {h,s} = feedbackSetup('ribbon', {reducedMotion});
    s.happiness = 25;
    h.api.tick();
    h.advance(1);
    assert.equal(s.happiness, 100);
    assert.match(h.get('message').textContent, /リボン.*ごきげん.*まんたん/);
    h.api.render();
    assert.match(h.get('message').textContent, /リボン/, 'ordinary render keeps the automatic recovery readable');
  }
});
test('retired flowers leave court dialogue and care feedback without bonus reactions', () => {
  for (const reducedMotion of [false, true]) {
    for (const success of [false, true]) {
      const {h,s} = feedbackSetup('flower', {reducedMotion});
      s.regionId = 'city';
      const candidate = h.api.REGIONS.find(r => r.id === 'city').candidates[0];
      s.gender = candidate.attractedTo[0];
      s.attractedTo = [candidate.gender];
      s.orientationId = 'custom';
      s.lifetime.partnerEncounters = [candidate.id];
      vm.runInContext(`{let n=0;Math.random=()=>++n===1?0:${success ? 0.5 : 0.99};}`, h.sandbox);

      click(h, 'courtBtn');
      h.advance(1);
      assert.equal(!!s.partner, success);
      assert.equal(h.get('speechBubble').classList.contains('hidden'), false);
      const conversation = h.get('speechText').textContent;
      assert.ok(conversation.length > 0);
      h.advance(1000);
      assert.equal(h.get('speechText').textContent, conversation, 'equipment does not interrupt the first court beat');
      assert.doesNotMatch(h.get('message').textContent, /成功率\+10/);
      // A successful court also shows the queued growth milestone after care changes.
      h.advance(success ? 8000 : 4500);

      assert.doesNotMatch(h.get('message').textContent, /花を差し出した|成功率\+10ポイント/);
      assert.notEqual(h.get('petSprite').dataset.itemReaction,'flower');
      h.api.render();
      assert.doesNotMatch(h.get('message').textContent, /成功率\+10ポイント/, 'ordinary render cannot revive the retired bonus');
    }
  }
});

test('ineligible ribbon ticks and mismatched court do not claim equipment effects', () => {
  const {h,s} = feedbackSetup('ribbon', {reducedMotion:true});
  s.lifetime.itemProgress.ticks = 99;
  s.happiness = 50;
  h.api.tick();
  h.advance(6000);
  assert.doesNotMatch(h.get('message').textContent, /リボン/);

  s.lifetime.equippedItemId = 'flower';
  s.regionId = 'city';
  s.lifetime.partnerEncounters = h.api.REGIONS.find(r => r.id === 'city').candidates.map(c => c.id);
  s.attractedTo = [];
  click(h, 'courtBtn');
  h.advance(6000);
  assert.equal(s.partner, null);
  assert.doesNotMatch(h.get('message').textContent, /成功率\+10|花を差し出した/);
});

test('V2 equipment feedback waits for an existing conversation and never replaces critical care', () => {
  const {h,s} = feedbackSetup('ribbon');
  h.api.speakEvent('feed', {petText:'まだお話の途中だよ', partnerChance:0, companionChance:0, delayMs:5000});
  s.happiness = 25;
  h.api.tick();
  assert.equal(s.happiness, 100);
  h.advance(6000);
  assert.equal(h.get('speechText').textContent, 'まだお話の途中だよ');
  assert.doesNotMatch(h.get('message').textContent, /リボン/);
  h.advance(1750);
  assert.match(h.get('message').textContent, /リボン/);

  // A second danger-triggered recovery loses priority when health becomes
  // critical before its queued feedback can be delivered.
  h.api.setMessage('');
  h.api.speakEvent('feed', {petText:'もうひとこと', partnerChance:0, companionChance:0, delayMs:5000});
  s.happiness = 25;
  h.api.tick();
  s.health = 0;
  h.api.render();
  h.advance(7000);
  assert.equal(h.get('message').dataset.careSeverity, 'critical');
  assert.match(h.get('message').textContent, /けんこうがげんかい/);
  assert.doesNotMatch(h.get('message').textContent, /リボン/);
});
test('a pending equipment line does not follow a reset into another life', () => {
  const {h,s} = feedbackSetup('ribbon');
  s.lifetime.itemProgress.ticks = 99;
  h.api.tick();
  click(h, 'resetBtn');
  h.advance(6000);
  assert.equal(h.api.state().stage, 'egg');
  assert.doesNotMatch(h.get('message').textContent, /リボン/);
});

test('game pass clears daily and companion context without completing either, including the next real game',()=>{
  const h=harness(),s=h.api.state();
  s.lifetime.equippedItemId='gamepass1';
  Object.assign(s,{sodachi:80,maxSodachi:80,growth:0,transformMeter:0});
  const companion=h.api.normalCompanions[0].id;
  h.api.setPendingCompanion(companion);
  h.api.render();
  const daily={dataset:{gameId:h.api.games[0].id}};
  const before=JSON.stringify([s.lifetime.dailyChallenge,s.lifetime.dailyStreak,s.lifetime.companionsRecruited,s.companions]);
  h.get('gameListGrid').closest=selector=>selector==='.daily-start'?daily:null;
  h.dispatch(h.get('gameListGrid'),'click');
  assert.equal(JSON.stringify([s.lifetime.dailyChallenge,s.lifetime.dailyStreak,s.lifetime.companionsRecruited,s.companions]),before);
  s.lifetime.equippedItemId=null;
  h.api.render();
  assert.equal(h.api.tryStartPlay({id:'next',noIntro:true,start(){}}),false,'swapping equipment cannot bypass cooldown');
  h.advance(5000);
  assert.equal(h.api.tryStartPlay({id:'next',noIntro:true,start(){}}),true);
  h.api.finishMinigame(100);
  assert.equal(JSON.stringify([s.lifetime.dailyChallenge,s.lifetime.dailyStreak,s.lifetime.companionsRecruited,s.companions]),before);
});
