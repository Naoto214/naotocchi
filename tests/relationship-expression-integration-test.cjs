const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');
const {harness}=require('./helpers/runtime-harness.cjs');
function setup(h,patch={}){
 for(const id of ['storyFlash','lifeCardOverlay','speechBubble'])h.get(id).classList.add('hidden');
 Object.assign(h.api.state(),{stage:'growing',speciesLine:'cat',ageTicks:500,stageIndex:5,sodachi:30,maxSodachi:30,hunger:80,happiness:80,energy:80,health:80,isSick:false,isSleeping:false,deathMeter:0,dying:false,transformOptions:null,affectionStreak:0,companions:[],partner:null,...patch});
 h.api.state().achievementsUnlocked.push('age-10','age-25','sick-cured-1');h.api.render();return h.api.state();
}
const companionHTML=h=>h.get('companionLeft').innerHTML+h.get('companionRight').innerHTML;
const asset=(id,face)=>`assets/characters/relationship/${id}/${face}.png`;
function partner(h,id='forest_bear',affection=50){const d=h.api.partnerCandidates.find(p=>p.id===id);assert.ok(d);return {...d,affection,married:false,bondCount:0};}
const catalog=harness().api;
const companionIds=[...catalog.normalCompanions,...catalog.rareCompanions].map(c=>c.id);
const partnerIds=catalog.partnerCandidates.map(c=>c.id);
for(const id of companionIds)test(`${id} real Home rerenders relation threshold, rescue and expiry`,()=>{
 const h=harness(),s=setup(h,{companions:[{id,bond:50}]});assert.match(companionHTML(h),new RegExp(`companions/${id}.png`));
 s.companions[0].bond=20;h.api.render();assert.ok(companionHTML(h).includes(asset(id,'lonely')));
 vm.runInContext('Math.random=()=>0.55',h.sandbox);h.dispatch(h.get('playWithBtn'),'click');h.advance(1);assert.ok(s.companions[0].bond>=30);assert.ok(companionHTML(h).includes(asset(id,'positive')));
 h.advance(2500);assert.match(companionHTML(h),new RegExp(`companions/${id}.png`));assert.ok(!companionHTML(h).includes('/positive.png'));
});
test('ordinary success reacts once, rescues all, rejected play does not react',()=>{
 const h=harness(),s=setup(h,{companions:[{id:'otter',bond:50},{id:'clock',bond:50}]});vm.runInContext('Math.random=()=>0.55',h.sandbox);
 h.dispatch(h.get('playWithBtn'),'click');h.advance(1);assert.equal((companionHTML(h).match(/\/positive.png/g)||[]).length,1);
 h.advance(2500);s.affectionStreak=0;s.companions.forEach(c=>c.bond=20);h.dispatch(h.get('playWithBtn'),'click');h.advance(1);assert.equal((companionHTML(h).match(/\/positive.png/g)||[]).length,2);
 h.advance(2500);s.affectionStreak=99;h.dispatch(h.get('playWithBtn'),'click');h.advance(1);assert.ok(!companionHTML(h).includes('/positive.png'));
});
for(const id of partnerIds)test(`${id} shared court reinforcement overrides lonely, expiry re-resolves current affection`,()=>{
 const h=harness(),p=partner(h,id,50),s=setup(h,{partner:p});assert.ok(h.get('partnerCompanion').innerHTML.includes(`partners/${id}.png`));
 p.affection=20;h.api.render();assert.ok(h.get('partnerCompanion').innerHTML.includes(asset(id,'lonely')));
 h.api.reinforceRelationship();h.api.render();assert.ok(h.get('partnerCompanion').innerHTML.includes(asset(id,'positive')));p.affection=20;h.advance(2501);assert.ok(h.get('partnerCompanion').innerHTML.includes(asset(id,'lonely')));
 h.api.reinforceRelationship();h.api.render();p.affection=50;h.advance(2501);assert.ok(h.get('partnerCompanion').innerHTML.includes(`partners/${id}.png`));
});
test('replacement partner with same ID cannot inherit positive',()=>{
 const h=harness(),s=setup(h,{partner:partner(h)});h.api.reinforceRelationship();h.api.render();assert.ok(h.get('partnerCompanion').innerHTML.includes('/positive.png'));s.partner=partner(h,'forest_bear',20);h.api.render();assert.ok(h.get('partnerCompanion').innerHTML.includes('/lonely.png'));
});
for(const value of [20,50])test(`real save excludes reactions; reload re-resolves all companion values and partner at ${value}`,()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const h=harness({storage}),s=setup(h,{companions:companionIds.map(id=>({id,bond:value})),partner:partner(h,'cat_ceo',value)});
 h.api.reinforceRelationship();s.partner.affection=value;h.api.render();h.api.saveState();const saved=JSON.parse(data.get('naotocchi-save-v1'));
 assert.equal(saved.partner.affection,value);assert.ok(saved.companions.every(c=>c.bond===value));assert.doesNotMatch(JSON.stringify(saved),/relationshipExpression|reactionUntil|positive|lonely/);
 const fresh=harness({storage,resume:true});fresh.api.render();for(const id of companionIds)assert.ok(companionHTML(fresh).includes(value<30?asset(id,'lonely'):`companions/${id}.png`));assert.ok(fresh.get('partnerCompanion').innerHTML.includes(value<30?asset('cat_ceo','lonely'):'partners/cat_ceo.png'));assert.ok(!fresh.get('partnerCompanion').innerHTML.includes('/positive.png'));
});
test('full supported catalog matches canonical runtime IDs and all assets exactly',()=>{
 const fs=require('node:fs'),R=require('../relationship-expression.js');
 assert.equal(companionIds.length,26);assert.equal(partnerIds.length,18);
 for(const [kind,ids] of [['companion',companionIds],['partner',partnerIds]]){
  assert.deepEqual([...R.SUPPORTED[kind]].sort(),[...ids].sort());
  for(const id of ids){
   const normal=`assets/characters/${kind==='companion'?'companions':'partners'}/${id}.png`;
   assert.ok(fs.existsSync(normal));
   for(const [value,positive,face] of [[29,false,'lonely'],[30,false,'normal'],[31,false,'normal'],[29,true,'positive']]){
    const actual=R.resolve({kind,id,value,positive,normal});
    assert.equal(actual.asset,face==='normal'?normal:asset(id,face));assert.ok(fs.existsSync(actual.asset));
   }
  }
 }
 const disk=fs.readdirSync('assets/characters/relationship').flatMap(id=>fs.readdirSync(`assets/characters/relationship/${id}`).map(name=>`${id}/${name}`)).sort();
 assert.deepEqual(disk,[...companionIds,...partnerIds].flatMap(id=>['positive','lonely'].map(face=>`${id}/${face}.png`)).sort());
});
test('26 companions use one ordinary representative, all threshold rescues and annoyed does not start positive',()=>{
 const h=harness(),s=setup(h,{companions:companionIds.map(id=>({id,bond:60}))});vm.runInContext('Math.random=()=>0.55',h.sandbox);
 const click=()=>{h.dispatch(h.get('playWithBtn'),'click');h.advance(1);};
 const positives=()=> (companionHTML(h).match(/\/positive.png/g)||[]).length;
 click();assert.equal(positives(),1);h.advance(2500);
 s.affectionStreak=0;s.companions.forEach(c=>c.bond=20);click();assert.equal(positives(),26);assert.ok(s.companions.every(c=>c.bond>=30));
 h.advance(2500);assert.equal(positives(),0);assert.ok(!companionHTML(h).includes('/lonely.png'));
 s.affectionStreak=99;const before=s.companions.map(c=>c.bond);click();assert.equal(positives(),0);assert.deepEqual(s.companions.map(c=>c.bond),before);
});
test('development Home fixtures directly expose both pilot partners and both companions without gameplay',()=>{
 let html;require('./visual-qa.cjs')().configureServer({middlewares:{use(_p,handler){handler({},{setHeader(){},end(v){html=v;}});}}});
 const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];const fixtures=vm.runInNewContext(source.slice(0,source.indexOf('const mount='))+'\nfixtures');
 for(const id of ['forest_bear','rock_octopus'])for(const value of [20,50])for(const density of ['pair','dense']){
  const s=fixtures[`relationship_${id}_${value}_${density}`];assert.ok(s,'pilot fixture exists');assert.equal(s.partner.id,id);assert.equal(s.partner.affection,value);assert.ok(s.companions.some(c=>c.id==='otter'&&c.bond===value));assert.ok(s.companions.some(c=>c.id==='clock'&&c.bond===value));assert.equal(s.companions.length,density==='pair'?2:26);
 }
});

for(const event of ['court','repair','marriage','date'])test(`expanded partner ${event} actual event path triggers positive without changing progress rules`,()=>{
 const h=harness(),p=partner(h,'cat_ceo',20),s=setup(h,{partner:p,sodachi:60,maxSodachi:60,orientationId:'pan',attractedTo:['male','female','nonbinary']});
 if(event==='repair'){p.mismatched=true;p.repair=2;}
 if(event==='marriage')p.bondCount=5; // existing perk reduces marriage threshold to 6
 if(event==='date'){
  s.dateCooldownTicks=0;h.api.goOnDate(h.api.DATE_PLANS[0]);
  assert.equal(s.datesThisLife,1);assert.ok(!h.get('dateOverlay').classList.contains('hidden'));
 }else{h.dispatch(h.get('courtBtn'),'click');h.advance(1);}
 assert.ok(p.affection>20);h.api.render();assert.ok(h.get('partnerCompanion').innerHTML.includes(asset(p.id,'positive')));
 if(event==='repair'){assert.equal(p.mismatched,false);assert.equal(p.repair,0);}
 if(event==='marriage'){assert.equal(p.married,true);assert.equal(p.bondCount,0);}
 h.advance(2501);if(event==='date')h.api.closeDateOverlay();
 assert.ok(h.get('partnerCompanion').innerHTML.includes(`partners/${p.id}.png`));
 assert.ok(!h.get('partnerCompanion').innerHTML.includes('/positive.png'));
});
for(const success of [true,false])test(`new court ${success?'success':'failure'} uses actual event result`,()=>{
 const h=harness(),region=h.api.REGIONS.find(r=>r.candidates?.some(p=>p.id==='cat_ceo'));
 const s=setup(h,{regionId:region.id,partner:null,gender:'female',orientationId:'pan',attractedTo:['male','female','nonbinary']});
 s.lifetime.partnerEncounters=['cat_ceo','robot_neighbor'];
 s.calledMatch={id:'cat_ceo',regionId:region.id}; // Hold the mutually compatible candidate fixed; only success roll differs.
 vm.runInContext(`Math.random=()=>${success?0:.99}`,h.sandbox);
 // Mark first encounter seen using the canonical lifetime field (first-encounter movie is a separate step).
 h.dispatch(h.get('courtBtn'),'click');h.advance(1);
 if(success){assert.ok(s.partner);assert.ok(h.get('partnerCompanion').innerHTML.includes(asset(s.partner.id,'positive')));}
 else{assert.equal(s.partner,null);assert.ok(s.happiness<80,'failed chance roll reduces happiness');assert.ok(!h.get('partnerCompanion').innerHTML.includes('/positive.png'));}
});
