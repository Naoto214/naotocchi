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

test('initial court charm reserves stock and excludes mismatch, first meeting and existing partners',()=>{
 const {h,s}=setup(); s.items.c_courtsmall=1;h.api.useConsumableItem('c_courtsmall');assert.equal(h.api.itemStock('c_courtsmall'),1);
 s.attractedTo=[];click(h,'courtBtn');assert.equal(h.api.itemStock('c_courtsmall'),1);assert.equal(s.partner,null);
 partner(h,s);h.api.reinforceRelationship();assert.equal(s.partner.bondCount,1);assert.equal(h.api.itemStock('c_courtsmall'),1);
});
test('valid initial court adds twenty points, flower ten and final cap stays eighty five',()=>{
 for(const [equip,charm,roll,success] of [[null,false,.7,false],[null,true,.7,true],['flower',false,.7,true],['flower',true,.86,false]]){
  const {h,s}=setup(equip);s.regionId='city';const candidate=h.api.REGIONS.find(r=>r.id==='city').candidates[0];
  s.gender=candidate.attractedTo[0];s.attractedTo=[candidate.gender];s.orientationId='custom';s.lifetime.partnerEncounters=[candidate.id];
  // Actual first encounter flow uses this lifetime discovery list.
  s.partner=null;s.happiness=80;s.traitCounts[candidate.affinityTrait]=0;
  if(charm){s.items.c_courtsmall=1;h.api.useConsumableItem('c_courtsmall');}
  vm.runInContext(`{let n=0;Math.random=()=>++n===1?0:${roll};}`,h.sandbox);click(h,'courtBtn');
  assert.equal(!!s.partner,success,`${equip}/${charm}/${roll}`);if(charm)assert.equal(h.api.itemStock('c_courtsmall'),0);
 }
});
test('repair charm needs two remaining conversations and advances only one extra',()=>{
 const {h,s}=setup('partner1');const p=partner(h,s);p.mismatched=true;p.repair=0;s.items.c_breakhalf=2;
 assert.equal(h.api.useConsumableItem('c_breakhalf'),true);click(h,'courtBtn');assert.equal(p.repair,2);
 assert.equal(h.api.useConsumableItem('c_breakhalf'),false);click(h,'courtBtn');assert.equal(p.mismatched,false);assert.equal(s.lifetime.itemMemories.letters.length,1);
 assert.equal(s.lifetime.itemMemories.letters[0].partner.label,p.label);
});
test('shield is once per partner per life and grants exactly twenty activity ticks',()=>{
 const {h,s}=setup();const p=partner(h,s);s.items.c_breakfull=3;assert.equal(h.api.useConsumableItem('c_breakfull'),true);
 p.affection=0;h.api.decayRelationship();assert.equal(s.partner,p);assert.equal(p.affection,10);
 for(let i=0;i<19;i++){h.api.ITEM_SYSTEM.advance(s);h.api.decayRelationship();}assert.equal(p.affection,10);
 h.api.ITEM_SYSTEM.advance(s);h.api.decayRelationship();assert.ok(p.affection<10);
 p.affection=0;h.api.decayRelationship();assert.equal(s.partner,null);
 partner(h,s);assert.equal(h.api.useConsumableItem('c_breakfull'),false);
 s.partner={...s.partner,id:'another-partner'};assert.equal(h.api.useConsumableItem('c_breakfull'),true);
});
test('backpack halves travel costs but does not prevent fatigue',()=>{
 const {h,s}=setup('travel1');s.travelStreak=100;const e=s.energy,f=s.hunger,m=s.happiness;travel(h,'forest');assert.equal(s.energy,e-3);assert.equal(s.hunger,f-2);assert.equal(s.happiness,m-3);
});
test('travel charm shows two choices; cancel, invalid choice and blocked departure keep stock',()=>{
 const {h,s}=setup();s.items.c_travel=1;h.api.useConsumableItem('c_travel');travel(h,'forest');
 assert.equal(s.regionId,'home');assert.equal(h.api.itemStock('c_travel'),1);assert.equal(h.get('itemSceneChoiceGrid').children.length,2);
 choose(h,'itemSceneChoiceGrid',{scene:'invalid'});assert.equal(h.api.itemStock('c_travel'),1);click(h,'itemSceneCancelBtn');assert.equal(h.api.itemStock('c_travel'),1);
 travel(h,'forest');const b=h.get('itemSceneChoiceGrid').children[0];s.isSleeping=true;childClick(h,'itemSceneChoiceGrid',b);assert.equal(h.api.itemStock('c_travel'),1);
 s.isSleeping=false;travel(h,'forest');const c=h.get('itemSceneChoiceGrid').children[1];childClick(h,'itemSceneChoiceGrid',c);assert.equal(s.regionId,'forest');assert.equal(h.api.itemStock('c_travel'),0);assert.equal(s.lifetime.itemMemories.specials.length,1);
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
test('badge retries a departed known companion without another joining sticker and cools down 200 ticks',()=>{
 const {h,s}=setup('bond1'),c=h.api.normalCompanions[0];s.lifetime.companionsRecruited=[c.id];s.companions=[{id:c.id,bond:0}];h.api.decayCompanionBonds();assert.equal(s.companions.length,0);
 choose(h,'itemRelationActions',{itemRelation:'reunion',companion:c.id});click(h,'companionInvitePlayBtn');h.api.finishMinigame(50);assert.equal(s.companions.length,1);assert.equal(s.lifetime.itemProgress.readyAt.reunion,200);assert.equal(h.api.stickerStore().owned[`companion:${c.id}`]||0,0);
});

test('deferred partner reservations do not follow a changed partner and stock survives new life',()=>{
 let {h,s}=setup();const original=partner(h,s);original.mismatched=true;s.items.c_breakhalf=1;s.items.c_breakfull=1;s.items.c_travel=1;
 h.api.useConsumableItem('c_breakhalf');h.api.useConsumableItem('c_breakfull');h.api.useConsumableItem('c_travel');assert.equal(h.api.useConsumableItem('c_travel'),false);
 h=reload(s);s=h.api.state();s.partner={...s.partner,id:'different',mismatched:true,repair:0};click(h,'courtBtn');assert.equal(s.partner.repair,1);s.partner.affection=0;h.api.decayRelationship();assert.equal(s.partner,null);assert.equal(h.api.itemStock('c_breakhalf'),1);assert.equal(h.api.itemStock('c_breakfull'),1);
 click(h,'resetBtn');s=h.api.state();assert.equal(h.api.itemStock('c_travel'),1);assert.equal(Object.keys(s.itemLife.pendingItems).length,0);assert.equal(Object.keys(s.itemLife.relationshipShields).length,0);
});
test('prepaid legacy relation/travel reservations apply without a second stock debit',()=>{
 const {h,s}=setup();partner(h,s).mismatched=true;s.partner.repair=0;s.oneTimeBoosts.breakupShield='half';click(h,'courtBtn');assert.equal(s.partner.repair,2);assert.equal(s.oneTimeBoosts.breakupShield,null);
 s.oneTimeBoosts.breakupShield='full';s.partner.affection=0;h.api.decayRelationship();assert.equal(s.partner.affection,10);assert.equal(s.oneTimeBoosts.breakupShield,null);
 s.oneTimeBoosts.travelGuarantee=true;travel(h,'forest');childClick(h,'itemSceneChoiceGrid',h.get('itemSceneChoiceGrid').children[0]);assert.equal(s.regionId,'forest');assert.equal(s.oneTimeBoosts.travelGuarantee,false);
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
test('reunion cancel has no cooldown, failure keeps raw threshold, reload cannot bypass cooldown',()=>{
 let {h,s}=setup('bond1');const c=h.api.normalCompanions[0];s.lifetime.companionsRecruited=[c.id];s.itemLife.departedCompanions=[c.id];
 choose(h,'itemRelationActions',{itemRelation:'reunion',companion:c.id});click(h,'companionInviteLaterBtn');assert.equal(s.lifetime.itemProgress.readyAt.reunion,undefined);
 choose(h,'itemRelationActions',{itemRelation:'reunion',companion:c.id});s.oneTimeBoosts.minigameBoost='small';click(h,'companionInvitePlayBtn');h.api.finishMinigame(40);assert.equal(s.companions.length,0);assert.equal(s.lifetime.itemProgress.readyAt.reunion,200);
 h=reload(s);s=h.api.state();choose(h,'itemRelationActions',{itemRelation:'reunion',companion:c.id});assert.equal(h.get('companionInviteOverlay').classList.contains('hidden'),true);
 s.lifetime.itemProgress.ticks=200;choose(h,'itemRelationActions',{itemRelation:'reunion',companion:c.id});assert.equal(h.get('companionInviteOverlay').classList.contains('hidden'),false);
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
test('guest shield follows origin through changed snapshots and legacy same-code reimport',()=>{
 for(const origin of [true,false]){
  const {h,s}=setup();s.items.c_breakfull=3;const guest=h.api.decodeGuestCode(h.api.encodeGuestCode());if(!origin)delete guest.originId;
  const make=()=>({...h.api.guestCandidate(guest),originId:guest.originId,guestSnapshot:JSON.parse(JSON.stringify(guest)),affection:0});
  s.partner=make();h.api.useConsumableItem('c_breakfull');h.api.decayRelationship();assert.equal(s.partner.affection,10);s.partner=null;
  if(origin){guest.stageIndex=7;guest.speciesLine='cat';}
  s.partner=make();assert.equal(h.api.useConsumableItem('c_breakfull'),false);
  if(origin){guest.originId='different_origin_123';s.partner=make();assert.equal(h.api.useConsumableItem('c_breakfull'),true);}
 }
});

test('reunion rechecks equipment and available target before committing cooldown',()=>{
 const {h,s}=setup('bond1'),c=h.api.normalCompanions[0];s.lifetime.companionsRecruited=[c.id];s.itemLife.departedCompanions=[c.id];choose(h,'itemRelationActions',{itemRelation:'reunion',companion:c.id});s.lifetime.equippedItemId=null;click(h,'companionInvitePlayBtn');assert.equal(s.lifetime.itemProgress.readyAt.reunion,undefined);
});

test('first meeting and real mismatched candidate never debit an initial-court reservation',()=>{
 const {h,s}=setup('flower');s.regionId='city';s.items.c_courtsmall=1;h.api.useConsumableItem('c_courtsmall');vm.runInContext('Math.random=()=>0',h.sandbox);s.orientationId='aro';s.attractedTo=[];
 const before=JSON.stringify({gender:s.gender,attractedTo:s.attractedTo});click(h,'courtBtn');assert.equal(s.lifetime.partnerEncounters.length,1);assert.equal(h.api.itemStock('c_courtsmall'),1);click(h,'courtBtn');assert.equal(s.partner,null);assert.equal(h.api.itemStock('c_courtsmall'),1);assert.equal(JSON.stringify({gender:s.gender,attractedTo:s.attractedTo}),before);
});
test('legacy alias and its canonical partner share one shield slot',()=>{
 const {h,s}=setup();const p=partner(h,s);p.id='ceo-cat';s.items.c_breakfull=2;h.api.useConsumableItem('c_breakfull');p.affection=0;h.api.decayRelationship();s.partner={...p,id:'cat_ceo',itemGraceUntil:0};assert.equal(h.api.useConsumableItem('c_breakfull'),false);
});
test('court letters capture the real new partner and survive form changes and a new life',()=>{
 const {h,s}=setup('partner1');s.regionId='city';const c=h.api.REGIONS.find(r=>r.id==='city').candidates[0];s.gender=c.attractedTo[0];s.attractedTo=[c.gender];s.lifetime.partnerEncounters=[c.id];vm.runInContext('Math.random=()=>0',h.sandbox);click(h,'courtBtn');assert.equal(s.lifetime.itemMemories.letters.length,1);const m=s.lifetime.itemMemories.letters[0];assert.equal(m.kind,'letters');assert.equal(m.event,'court');assert.equal(m.partner.id,c.id);assert.equal(JSON.stringify(m.partner.attractedTo),JSON.stringify(c.attractedTo));const captured=JSON.stringify(m);s.partner.affection=2;s.speciesLine='cat';click(h,'resetBtn');assert.equal(JSON.stringify(h.api.state().lifetime.itemMemories.letters[0]),captured);
});
test('a different partner cannot silently replace a pending reservation; cancellation preserves stock',()=>{
 const {h,s}=setup();partner(h,s);s.items.c_breakfull=1;h.api.useConsumableItem('c_breakfull');s.partner.id='other';assert.equal(h.api.useConsumableItem('c_breakfull'),false);h.api.renderItemOverlay();assert.match(h.get('onetimeItemGrid').innerHTML,/とりけす/);choose(h,'onetimeItemGrid',{itemAction:'cancel',id:'c_breakfull'});assert.equal(h.api.itemStock('c_breakfull'),1);assert.equal(h.api.useConsumableItem('c_breakfull'),true);
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
test('applied flowers deliver their bonus after court dialogue and ordinary care feedback', () => {
  for (const reducedMotion of [false, true]) {
    for (const success of [false, true]) {
      const {h,s} = feedbackSetup('flower', {reducedMotion});
      s.regionId = 'city';
      const candidate = h.api.REGIONS.find(r => r.id === 'city').candidates[0];
      s.gender = candidate.attractedTo[0];
      s.attractedTo = [candidate.gender];
      s.orientationId = 'custom';
      s.lifetime.partnerEncounters = [candidate.id];
      vm.runInContext(`{let n=0;Math.random=()=>++n===1?0:${success ? 0.7 : 0.99};}`, h.sandbox);

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

      assert.match(h.get('message').textContent, /花を差し出した.*成功率\+10ポイント/);
      h.api.render();
      assert.match(h.get('message').textContent, /成功率\+10ポイント/, 'ordinary render keeps the applied bonus readable');
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
