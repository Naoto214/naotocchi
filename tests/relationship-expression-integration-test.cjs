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
for(const id of ['otter','clock'])test(`${id} real Home rerenders relation threshold, rescue and expiry`,()=>{
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
for(const id of ['forest_bear','rock_octopus'])test(`${id} shared court reinforcement overrides lonely, expiry re-resolves current affection`,()=>{
 const h=harness(),p=partner(h,id,50),s=setup(h,{partner:p});assert.ok(h.get('partnerCompanion').innerHTML.includes(`partners/${id}.png`));
 p.affection=20;h.api.render();assert.ok(h.get('partnerCompanion').innerHTML.includes(asset(id,'lonely')));
 h.api.reinforceRelationship();h.api.render();assert.ok(h.get('partnerCompanion').innerHTML.includes(asset(id,'positive')));p.affection=20;h.advance(2501);assert.ok(h.get('partnerCompanion').innerHTML.includes(asset(id,'lonely')));
 h.api.reinforceRelationship();h.api.render();p.affection=50;h.advance(2501);assert.ok(h.get('partnerCompanion').innerHTML.includes(`partners/${id}.png`));
});
test('replacement partner with same ID cannot inherit positive',()=>{
 const h=harness(),s=setup(h,{partner:partner(h)});h.api.reinforceRelationship();h.api.render();assert.ok(h.get('partnerCompanion').innerHTML.includes('/positive.png'));s.partner=partner(h,'forest_bear',20);h.api.render();assert.ok(h.get('partnerCompanion').innerHTML.includes('/lonely.png'));
});
test('real save has no expression or timer fields; reload re-resolves persistent values',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const h=harness({storage}),s=setup(h,{companions:[{id:'otter',bond:20}],partner:partner(h,'rock_octopus',20)});
 h.api.reinforceRelationship();s.partner.affection=20;h.api.render();h.api.saveState();const saved=JSON.parse(data.get('naotocchi-save-v1'));
 assert.equal(saved.partner.affection,20);assert.equal(saved.companions[0].bond,20);assert.doesNotMatch(JSON.stringify(saved),/relationshipExpression|reactionUntil|positive|lonely/);
 const fresh=harness({storage,resume:true});fresh.api.render();assert.ok(companionHTML(fresh).includes(asset('otter','lonely')));assert.ok(fresh.get('partnerCompanion').innerHTML.includes(asset('rock_octopus','lonely')));
});
test('nonpilot companions, partners and author stay on normal assets',()=>{
 const h=harness(),c=h.api.normalCompanions.find(c=>c.id!=='otter');const p=h.api.partnerCandidates.find(p=>!['forest_bear','rock_octopus'].includes(p.id));setup(h,{companions:[{id:c.id,bond:20}],partner:{...p,affection:20}});assert.ok(!companionHTML(h).includes('/relationship/'));assert.ok(!h.get('partnerCompanion').innerHTML.includes('/relationship/'));
});
test('development Home fixtures directly expose both pilot partners and both companions without gameplay',()=>{
 let html;require('./visual-qa.cjs')().configureServer({middlewares:{use(_p,handler){handler({},{setHeader(){},end(v){html=v;}});}}});
 const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];const fixtures=vm.runInNewContext(source.slice(0,source.indexOf('const mount='))+'\nfixtures');
 for(const id of ['forest_bear','rock_octopus'])for(const value of [20,50])for(const density of ['pair','dense']){
  const s=fixtures[`relationship_${id}_${value}_${density}`];assert.ok(s,'pilot fixture exists');assert.equal(s.partner.id,id);assert.equal(s.partner.affection,value);assert.ok(s.companions.some(c=>c.id==='otter'&&c.bond===value));assert.ok(s.companions.some(c=>c.id==='clock'&&c.bond===value));assert.equal(s.companions.length,density==='pair'?2:26);
 }
});
