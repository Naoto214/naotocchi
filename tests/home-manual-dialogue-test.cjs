const { test } = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');

function setup() {
  const h = harness({deterministic:true, homeDiorama:true, productionHome:true, worldScene:true});
  Object.assign(h.document.body.dataset, {homeProduction:'true',homeViewportVersion:'12',homeDisplayVersion:'18'});
  const s = h.api.state();
  Object.assign(s,{stage:'growing',speciesLine:'cat',stageIndex:3,ageTicks:500,regionId:'home',hunger:80,happiness:80,health:90,energy:90,isSick:false,isSleeping:false,companions:[],partner:null});
  for (const id of ['storyFlash','lifeCardOverlay','speechBubble']) h.get(id).classList.add('hidden');
  s.achievementsUnlocked.push('age-10','age-25');
  h.api.render();
  h.sandbox.Math=Object.create(Math);h.sandbox.Math.random=()=>0.55;
  return {h,s};
}
function click(h,button) { h.get(button).disabled=false;h.dispatch(h.get(button),'click');h.advance(1); }
function reply(h,kind,id) {
  assert.equal(h.get('speechBubble').dataset.kind,'pet','first beat keeps the player’s own line');
  h.advance(2500);
  assert.equal(h.get('speechBubble').classList.contains('hidden'),false);
  assert.equal(h.get('speechBubble').dataset.kind,kind);
  assert.equal(h.get('speechBubble').dataset.speakerId,id);
  return h.get('speechText').textContent;
}

test('play reply comes from the actual positive representative, even without a visit',()=>{
  const {h,s}=setup();
  s.companions=[{id:'otter',bond:70},{id:'clock',bond:20},{id:'shiba',bond:70}];
  // Deterministic ordinary representative plus the existing low-bond rescue.
  const expressions=h.window.NaotocchiRelationshipExpression,choose=expressions.companionPositiveIds;
  try {
    expressions.companionPositiveIds=(before,after)=>choose(before,after,()=>0.9);
    click(h,'playWithBtn');
  } finally { expressions.companionPositiveIds=choose; }
  assert.ok(s.companions[1].bond>=30);
  const text=reply(h,'companion','shiba');
  assert.equal(text,'投げるまで待てる。たぶん!');
});

test('court reaches the existing partner and uses the partner pool without a visit',()=>{
  const {h,s}=setup();
  const partner=h.api.partnerCandidates.find(c=>c.id==='robot_neighbor');
  s.partner={...partner,affection:50,married:false,bondCount:0};
  click(h,'courtBtn');
  assert.equal(s.partner.bondCount,1);assert.ok(s.partner.affection>50);
  const text=reply(h,'partner',partner.id);
  assert.equal(text,'たのしい、をいま学習中');
});

test('a rejected court candidate can reply without becoming a household partner',()=>{
  const {h,s}=setup();
  const region=h.api.REGIONS.find(r=>r.candidates?.some(p=>p.id==='cat_ceo'));
  Object.assign(s,{regionId:region.id,gender:'female',orientationId:'pan',attractedTo:['male','female','nonbinary'],calledMatch:{id:'cat_ceo',regionId:region.id}});
  s.lifetime.partnerEncounters=['cat_ceo'];h.sandbox.Math.random=()=>0.99;
  click(h,'courtBtn');
  assert.equal(s.partner,null);assert.ok(s.happiness<80);
  assert.ok(h.api.conv2.pools().court_fail.partner.includes(reply(h,'partner','cat_ceo')));
});

test('only the participants speak during play even when a partner is visiting',()=>{
  const {h,s}=setup();
  s.companions=[{id:'otter',bond:40}];
  s.partner={...h.api.partnerCandidates.find(c=>c.id==='robot_neighbor'),affection:80,married:false,bondCount:0};
  h.api.meguruMod.socialSession.advance(300);h.api.render();
  assert.equal(h.api.conv2.visitorKey(),'partner:robot_neighbor');
  h.sandbox.Math.random=()=>0.1;
  click(h,'playWithBtn');
  reply(h,'companion','otter');
  h.advance(2500);assert.equal(h.get('speechBubble').dataset.kind,'pet','the playmate gets the reply and the pet can follow up');
});

test('solo play does not invent a conversation partner',()=>{
  const {h}=setup();
  click(h,'playWithBtn');
  assert.equal(h.get('speechBubble').dataset.kind,'pet');
  h.advance(2500);assert.equal(h.get('speechBubble').classList.contains('hidden'),true);
});

test('the captured partner cannot be replaced between two scheduled beats',()=>{
  const {h,s}=setup();
  s.partner={...h.api.partnerCandidates.find(c=>c.id==='robot_neighbor'),affection:50,bondCount:0};
  click(h,'courtBtn');
  s.partner={...h.api.partnerCandidates.find(c=>c.id==='cat_ceo'),affection:50,bondCount:0};
  h.advance(2500);assert.notEqual(h.get('speechBubble').dataset.kind,'partner');
});

test('each official companion and partner answers their own home action with their registered face and name',()=>{
  const {api}=setup().h;
  const companions=[...api.normalCompanions,...api.rareCompanions];
  assert.equal(companions.length,26);
  assert.equal(api.partnerCandidates.length,18);
  for (const [kind,roster,button] of [
    ['companion',companions,'playWithBtn'],['partner',api.partnerCandidates,'courtBtn']
  ]) {
    for (const resident of roster) {
      const {h,s}=setup();
      if (kind==='partner') s.partner={...resident,affection:50,bondCount:0};
      else s.companions=[{id:resident.id,bond:70}];
      click(h,button);
      const line=reply(h,kind,resident.id);
      assert.ok(line && line.trim(),resident.id+' reply');
      const badge=h.get('speechSpeaker');
      assert.equal(badge.dataset.label,resident.name||resident.label);
      const face=badge.innerHTML;
      assert.ok(face.includes('/'+kind+'s/'+resident.id+'.png') || face.includes('/relationship/'+resident.id+'/'),resident.id+' face: '+face);
    }
  }
});
