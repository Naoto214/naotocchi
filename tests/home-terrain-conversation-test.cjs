const {test}=require('node:test'), assert=require('node:assert/strict');
const {harness}=require('./helpers/runtime-harness.cjs');
const modelApi=require('../home-production-model.js');
const companion=id=>({key:'companion:'+id,kind:'companion',id});
const pet={key:'pet:dog',kind:'pet',id:'dog'};
const scene={region:'home',time:'day',width:520,height:280,groundTop:80};
test('autonomy reports the chosen social target; unrelated passers-by and manual arrivals do not start conversations',()=>{
  const encounters=[],all=[],m=modelApi.createModel({random:()=>.93,onEvent:e=>{all.push(e);if(e.type==='social')encounters.push(e);}});
  // Last resident is the actual target of the deterministic social choice.
  m.sync([pet,companion('clock'),companion('owl')].map((a,i)=>({...a,x:100+i*45,y:160,w:16,h:20})),scene);
  for(let i=0;i<300;i++)m.step(.1);
  const fromPet=encounters.find(e=>e.actor.kind==='pet');assert.ok(fromPet,'a completed autonomous meeting');
  assert.equal(fromPet.listener.key,'companion:owl');assert.equal(fromPet.source,'ambient');assert.ok(Object.isFrozen(fromPet.listener));
  m.cancel();m.select(pet.key);m.move(pet.key,{x:160,y:180},'drag');const n=encounters.length;
  for(let i=0;i<300;i++)m.step(.1,{autonomy:false});
  assert.equal(encounters.length,n);assert.ok(all.some(e=>e.type==='arrive'&&e.source==='drag'));
});
function home(ids,partner=null){
  const h=harness({deterministic:true,seed:70}),s=h.api.state();
  Object.assign(s,{stage:'growing',speciesLine:'dog',regionId:'home',isSleeping:false,isSick:false,dying:false,hunger:95,happiness:95,energy:95,health:100,partner,companions:ids.map(id=>({id,bond:25}))});
  Object.assign(h.document.body.dataset,{homeProduction:'true',homeViewportVersion:'12'});
  for(const x of ['storyFlash','lifeCardOverlay','speechBubble'])h.get(x).classList.add('hidden');
  h.api.render();for(let i=0;i<240&&!h.api.conv2.canStart();i++)h.advance(250);
  assert.ok(h.api.conv2.canStart(),JSON.stringify(h.api.conv2.status()));
  assert.equal(h.api.conv2.visitorKey(),null);
  const say=(a,b)=>h.dispatch(h.get('castStage'),'naotocchi:home-reaction',{detail:{type:'social',source:'ambient',actor:a,listener:b,region:'home',nearby:[companion(ids[0])]}});
  return {h,s,say,bubble:h.get('speechBubble')};
}
test('two residents can use a dedicated exchange before a relationship visit occurs',()=>{
  const {h,say,bubble}=home(['clock']);say(pet,companion('clock'));h.advance(1);
  const unit=h.api.conv2.unit();assert.ok(unit);
  const def=h.api.conv2.data.BANTERS.find(x=>x.id===unit.id);assert.equal(def.with,'companion:clock');
  for(let i=0;i<def.beats.length;i++){if(i)h.advance(2500);assert.equal(h.get('speechText').textContent,def.beats[i].text);assert.equal(bubble.dataset.kind,def.beats[i].role==='pet'?'pet':'companion');}
});
test('resident exchange never substitutes a bystander or pet for a participant who left',()=>{
  const {h,s,say,bubble}=home(['shiba','clock','owl']);say(companion('owl'),companion('clock'));h.advance(1);
  assert.equal(bubble.dataset.speakerId,'owl');assert.ok(h.api.conv2.unit());
  s.companions=s.companions.filter(c=>c.id!=='clock');h.advance(3000);
  assert.equal(h.api.conv2.unit(),null);assert.ok(bubble.classList.contains('hidden'));
});
test('ordinary motion and busy speech never schedule a terrain conversation',()=>{
  const {h,say}=home(['clock']);h.dispatch(h.get('castStage'),'naotocchi:home-reaction',{detail:{type:'proximity',source:'ambient',actor:pet,nearby:[companion('clock')]}});
  assert.equal(h.api.conv2.unit(),null);h.api.speakEvent('feed',{petText:'おやつ',partnerChance:0,companionChance:0});
  say(companion('clock'),pet);h.advance(1);assert.equal(h.api.conv2.unit(),null);assert.equal(h.get('speechText').textContent,'おやつ');
});

test('a real meeting in a full 28-resident home presents both participants in order',()=>{
  const master=require('node:vm').runInNewContext(require('node:fs').readFileSync('character-world-master.v1.js','utf8')+';NAOTOCCHI_CHARACTER_WORLD_MASTER_V1');
  const ids=[...master.companions.normal,...master.companions.rare].map(c=>c.id);
  const partner=master.partners.find(p=>p.id==='snow_spirit'), {h,bubble}=home(ids,{...partner,affection:80});
  const residents=[pet,{key:'partner:'+partner.id,kind:'partner',id:partner.id},...ids.map(companion)];
  let seen=null,seed=7;
  const m=modelApi.createModel({random:()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32),onEvent:e=>{
    if(seen||e.type!=='social'||e.actor.kind==='pet'||e.listener.kind==='pet')return;
    h.dispatch(h.get('castStage'),'naotocchi:home-reaction',{detail:e});if(h.api.conv2.unit())seen=e;
  }});
  m.sync(residents.map((a,i)=>({...a,x:50+(i%7)*48,y:100+Math.floor(i/7)*36,w:12,h:16})),scene);
  for(let i=0;i<3600&&!seen;i++)m.step(.1);
  assert.ok(seen,'a social pair actually met');assert.equal(residents.length,28);
  h.advance(1);assert.equal(bubble.dataset.kind,seen.actor.kind);assert.equal(bubble.dataset.speakerId,seen.actor.id);
  h.advance(2500);assert.equal(bubble.dataset.kind,seen.listener.kind);assert.equal(bubble.dataset.speakerId,seen.listener.id);
  assert.equal(h.api.conv2.visitorKey(),null,'no special visit was granted');
});
test('a real visit from a partner with a legacy ID starts their canonical banter',()=>{
  const {h}=home([],{id:'snow-spirit',label:'ゆきのせいれい',affection:90});
  h.api.meguruMod.socialSession.advance(300);h.api.render();
  assert.equal(h.api.conv2.visitorKey(),'partner:snow_spirit');h.advance(2700);
  const unit=h.api.conv2.unit();assert.ok(unit);
  const def=h.api.conv2.data.BANTERS.find(x=>x.id===unit.id);
  assert.ok(['partner:snow_spirit','partner'].includes(def.with));
});
function look(h,actor){
  h.dispatch(h.get('castStage'),'naotocchi:home-reaction',{detail:{type:'look',source:'ambient',region:'home',actor}});
}
test('a resident looking around speaks their own idle line, with a shared cooldown',()=>{
  const {h,bubble}=home(['clock','owl']);look(h,companion('owl'));h.advance(1);
  assert.equal(bubble.dataset.speakerId,'owl');assert.ok(['静かにしてても話は聞いてる','見晴らしのいい所で考えてた','月にも昼があるよ。夜だけの係じゃない'].includes(h.get('speechText').textContent));
  h.advance(2700);look(h,companion('clock'));h.advance(1);assert.ok(bubble.classList.contains('hidden'));
});
test('a resident idle event yields to a real pair from the same frame; absent residents stay silent',()=>{
  const {h,s,say,bubble}=home(['clock','owl']);look(h,companion('clock'));
  say(pet,companion('owl'));h.advance(1);assert.equal(h.api.conv2.data.BANTERS.find(x=>x.id===h.api.conv2.unit()?.id).with,'companion:owl');
  h.advance(12000);s.companions=[];look(h,companion('clock'));h.advance(1);assert.ok(bubble.classList.contains('hidden'));
  const gone=home(['clock']);look(gone.h,companion('clock'));gone.s.companions=[];gone.h.advance(1);assert.ok(gone.bubble.classList.contains('hidden'));
  const alone=home([]);look(alone.h,pet);look(alone.h,companion('clock'));alone.h.advance(1);assert.ok(alone.bubble.classList.contains('hidden'));
});
test('an idle line cannot cover care or return after the care speech has finished',()=>{
  const {h,bubble}=home(['clock']);look(h,companion('clock'));h.api.speakEvent('feed',{petText:'おやつ',partnerChance:0,companionChance:0});
  h.advance(1);assert.equal(bubble.dataset.kind,'pet');assert.equal(h.get('speechText').textContent,'おやつ');
  h.advance(3000);assert.ok(bubble.classList.contains('hidden'));
});
test('under reduced motion the idle greeting timer includes a visible co-resident without requiring a visit or movement',()=>{
  const {h,bubble}=home(['clock']);const media=h.window.matchMedia('(prefers-reduced-motion: reduce)');media.matches=true;
  h.api.scheduleIdleGreeting();let sawClock=false;
  for(let i=0;i<720&&!sawClock;i++){h.advance(250);sawClock=bubble.dataset.speakerId==='clock'&&!bubble.classList.contains('hidden');}
  assert.ok(sawClock);assert.equal(h.api.conv2.visitorKey(),null);
});
