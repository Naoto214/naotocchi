const test=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/runtime-harness.cjs');
function setup(){
 const h=harness({deterministic:true,fullDisplay:true}),s=h.api.state(),M=h.api.meguruMod;
 Object.assign(s,{stage:'growing',regionId:'home',isSleeping:false,companions:[{id:'shiba',bond:100},{id:'cat_friend',bond:100}]});
 s.lifetime.companionsRecruited=['shiba','cat_friend'];
 const p=h.api.partnerCandidates[0];s.partner={id:p.id,label:p.label,emoji:p.emoji,affection:100};s.lifetime.partnersRecorded=[p.id];
 return {h,s,M};
}
test('relationships are independent residents, not automatic followers; current IDs survive missing lifetime records',()=>{
 const {s,M}=setup();s.lifetime.companionsRecruited=[];s.lifetime.partnersRecorded=[];
 const r=M.buildRegistry(),known=r.residents.filter(a=>a.related);
 assert.equal(known.length,3); assert.ok(known.every(a=>!a.withPlayer));
 const sim=M.createSimulation({socialSession:M.socialSession,regionId:'home'});assert.equal(sim.party.length,0);
});
test('same actor voluntarily accompanies, expires, returns to life without modifying relationships',()=>{
 const {s,M}=setup(),r=M.buildRegistry();for(const a of r.residents)a.region='home';
 const sim=M.createSimulation({socialSession:M.socialSession,regionId:'home',registry:r}),before=JSON.stringify(s),a=sim.world.residents.find(a=>a.related);
 sim.setPlayer(a.x,a.z); assert.equal(sim.startAccompany(a.key,'walk'),true);
 assert.equal(sim.party[0],a);assert.ok(!sim.world.residents.includes(a));assert.equal(sim.startAccompany(a.key),false);
 sim.endAccompany('activity_end');assert.equal(sim.party.length,0);assert.ok(sim.world.residents.includes(a));assert.equal(a.follow,false);
 assert.equal(JSON.stringify(s),before);
 assert.equal(sim.startAccompany(a.key,'date'),true);
 for(let i=0;i<1810;i++)sim.step(.1,{});
 assert.equal(sim.party.length,0);assert.ok(sim.world.residents.includes(a));assert.equal(a.follow,false);
});
test('party cap, distant rejection, region departure and semantic events',()=>{
 const {M}=setup(),r=M.buildRegistry();for(const a of r.residents)a.region='home';
 const sim=M.createSimulation({socialSession:M.socialSession,regionId:'home',registry:r}),actors=sim.world.residents.filter(a=>a.related),got=[];
 const off=M.socialSession.subscribe(e=>got.push(e));
 for(const a of actors){a.x=sim.player.x+50;a.z=sim.player.z;}
 assert.equal(sim.startAccompany(actors[0].key),true);assert.equal(sim.startAccompany(actors[1].key),true);assert.equal(sim.startAccompany(actors[2].key),false);
 sim.enterRegion('forest');assert.equal(sim.party.length,0);
 assert.ok(got.some(e=>e.type==='accompany_end'&&e.reason==='region_change')); assert.ok(got.some(e=>e.type==='return_to_free_life'));off();
 assert.equal(sim.startAccompany(actors[0].key),false);
});
test('Home has no permanent surrounding cast; a finite visit is visible and the relationship survives departure',()=>{
 const {h,s,M}=setup();for(const id of ['storyFlash','lifeCardOverlay','speechBubble'])h.get(id).classList.add('hidden');
 h.api.render();assert.equal(h.api.homeVisitors().companions.length,0);assert.equal(h.api.homeVisitors().partner,null);
 M.socialSession.advance(300);h.api.render();
 assert.equal(h.api.homeVisitors().companions.length+(h.api.homeVisitors().partner?1:0),1);
 M.socialSession.advance(181);h.api.render();assert.equal(h.api.homeVisitors().companions.length,0);assert.equal(h.api.homeVisitors().partner,null);
 assert.equal(s.companions.length,2);assert.ok(s.partner);
});
test('manual activity controls permit choosing walk/date/adventure and ending without a forced dialog',()=>{
 const {h,M}=setup(),r=M.start(h.get('meguruOverlay'),{renderer:()=>({draw(){},destroy(){},setDistant(){}})});
 assert.ok(h.get('mgrSocialWalk').textContent || h.get('meguruOverlay').innerHTML.includes('mgrSocialWalk'),'walk choice exists');
 assert.ok(h.get('meguruOverlay').innerHTML.includes('mgrSocialAdventure'),'adventure choice exists');r.stop();
});
test('hidden time does not advance Home encounter clock or trigger a visit on resume',()=>{
 const {h,M}=setup();for(const id of ['storyFlash','lifeCardOverlay','speechBubble'])h.get(id).classList.add('hidden');
 h.api.render();M.socialSession.advance(295);
 h.document.visibilityState='hidden';h.dispatch(h.document,'visibilitychange');h.advance(60000);
 h.document.visibilityState='visible';h.dispatch(h.document,'visibilitychange');h.api.render();
 assert.equal(M.socialSession.now,295);assert.equal(h.api.homeVisitors().companions.length,0);
});
test('responding to an invitation selects its actor even when another resident becomes nearest',()=>{
 const {h,M}=setup();const r=M.start(h.get('meguruOverlay'),{renderer:()=>({draw(){},destroy(){},setDistant(){}})});
 const registry=M.buildRegistry();for(const a of registry.residents)a.region='home';
 const fixture=M.createSimulation({registry,regionId:'home'}).world.residents.filter(a=>a.related);
 r.world.residents.splice(0,r.world.residents.length,...fixture);
 const [a,b,c]=fixture;for(const [i,x] of fixture.entries()){x.x=r.player.x+70+i*80;x.z=r.player.z;x.until=100;x.behavior='idle';}
 M.setRandom(()=>0);M.socialSession.advance(1200);r.sim.step(1,{});
 assert.equal(r.sim.invitation.key,a.key);
 b.x=r.player.x+30;b.z=r.player.z;r.sim.step(.01,{});assert.equal(r.sim.nearest.key,b.key);
 h.dispatch(h.get('meguruOverlay').querySelector('#mgrAccompany'),'click');h.dispatch(h.get('meguruOverlay').querySelector('#mgrSocialWalk'),'click');
 assert.equal(r.party[0].key,a.key);r.stop();
});
test('Home relationship idle initiatives consume the common budget',()=>{
 const {h,M}=setup();for(const id of ['storyFlash','lifeCardOverlay','speechBubble'])h.get(id).classList.add('hidden');
 h.api.render();M.socialSession.advance(300);h.api.render();
 const now=M.socialSession.now;let autonomous=0;const off=M.socialSession.subscribe(e=>{if(e.reason==='idle')autonomous++;});
 h.api.scheduleIdleGreeting();h.advance(30000);assert.equal(autonomous,0);assert.equal(M.socialSession.now,now);off();
});
test('relationship removal ends active accompaniment and reload starts free',()=>{
 const {s,M}=setup(),registry=M.buildRegistry();for(const a of registry.residents)a.region='home';
 const sim=M.createSimulation({registry,regionId:'home'}),a=sim.world.residents.find(a=>a.kind==='companion');sim.setPlayer(a.x,a.z);
 assert.equal(sim.startAccompany(a.key,'adventure'),true);s.companions=s.companions.filter(c=>c.id!==a.id);sim.step(.1,{});assert.equal(sim.party.length,0);assert.equal(a.follow,false);
 const restored=M.createSimulation({regionId:'home'});assert.equal(restored.party.length,0);assert.equal(restored.invitation,null);
});
test('explicit destination ends companionship, incidental places do not',()=>{
 const {M}=setup(),registry=M.buildRegistry();for(const a of registry.residents)a.region='home';
 const sim=M.createSimulation({registry,regionId:'home'}),a=sim.world.residents.find(a=>a.related);sim.setPlayer(a.x,a.z);
 assert.equal(sim.startAccompany(a.key,'adventure','destination-test'),true);sim.step(.1,{});assert.equal(sim.party.length,1);
 const destination=sim.world.spots.find(s=>s.kind!=='entry');destination.id='destination-test';sim.setPlayer(destination.x,destination.z);sim.step(.1,{});assert.equal(sim.party.length,0);
});
