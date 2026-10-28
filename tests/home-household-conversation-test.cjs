const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {harness}=require('./helpers/runtime-harness.cjs');
const master=vm.runInNewContext(fs.readFileSync('character-world-master.v1.js','utf8')+';NAOTOCCHI_CHARACTER_WORLD_MASTER_V1');
const ids=[...master.companions.normal,...master.companions.rare].map(c=>c.id);
for(const [kind,id] of [...ids.map(id=>['companion',id]),...master.partners.map(p=>['partner',p.id])])test(`real visit reaches ${kind}:${id} dedicated banter among the household`,()=>{
 const h=harness({deterministic:true,seed:70}),s=h.api.state(),key=kind+':'+id,shown=[];
 Object.assign(s,{stage:'growing',speciesLine:'dog',regionId:'forest',isSleeping:false,isSick:false,dying:false,hunger:95,happiness:95,energy:95,health:100,
 companions:ids.map(x=>({id:x,bond:x===id?90:25})),partner:kind==='partner'?{...master.partners.find(p=>p.id===id),affection:90}:null});
 for(const x of ['storyFlash','lifeCardOverlay','speechBubble'])h.get(x).classList.add('hidden');
 let text='';Object.defineProperty(h.get('speechText'),'textContent',{configurable:true,get:()=>text,set:v=>{text=String(v);if(text)shown.push(text);}});
 h.api.render();h.advance(30000);
 const own=h.api.conv2.data.BANTERS.find(u=>u.with===key);assert.ok(own);
 for(const u of h.api.conv2.data.BANTERS)if(u.id!==own.id)h.api.conv2.director().noteUnit(u.id,'banter');
 assert.ok(h.api.conv2.canStart());shown.length=0;
 h.api.meguruMod.socialSession.advance(300);h.api.render();assert.equal(h.api.conv2.visitorKey(),key);
 h.advance(2700);assert.equal(h.api.conv2.unit()?.id,own.id,'real visit scheduled the dedicated unit');
 h.advance(16000);assert.deepEqual(shown.slice(0,own.beats.length),own.beats.map(b=>b.text));
 assert.equal(s.companions.length,26);assert.equal(h.api.conv2.unit(),null);
});
test('leaving during a real visit ends speech eligibility without deleting acquired residents',()=>{
 const h=harness({deterministic:true}),s=h.api.state();Object.assign(s,{stage:'growing',regionId:'forest',isSleeping:false,isSick:false,hunger:95,happiness:95,energy:95,health:100,companions:[{id:'shiba',bond:90}]});s.partner=null;
 for(const x of ['storyFlash','lifeCardOverlay','speechBubble'])h.get(x).classList.add('hidden');h.api.render();h.advance(30000);
 h.api.meguruMod.socialSession.advance(300);h.api.render();h.advance(2700);assert.ok(h.api.conv2.unit());
 h.api.meguruMod.socialSession.advance(181);h.api.render();h.advance(10000);assert.equal(h.api.conv2.unit(),null);assert.equal(h.api.conv2.visitorKey(),null);assert.equal(s.companions.length,1);
});
