// Exercise autonomous producer -> subscribed production expression bridge.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {harness}=require('../tests/helpers/runtime-harness.cjs');const records=[];
for(const kind of ['reunion','greeting','affection_interaction']){
 const h=harness({deterministic:true}),M=h.api.meguruMod,s=h.api.state();Object.assign(s,{stage:'growing',isSleeping:false,companions:kind==='greeting'?[{id:'shiba',bond:29}]:[]});s.lifetime.companionsRecruited=['shiba'];
 if(kind==='affection_interaction'){s.partner={...h.api.partnerCandidates[0],affection:29};s.lifetime.partnersRecorded=[s.partner.id];}
 const registry=M.buildRegistry(),key=kind==='affection_interaction'?'partner:'+s.partner.id:'companion:shiba';registry.residents=registry.residents.filter(a=>a.key===key);registry.residents[0].region='home';
 const sim=M.createSimulation({registry,regionId:'home',socialSession:M.socialSession}),a=sim.world.residents[0];sim.setPlayer(a.x+60,a.z);a.behavior='idle';a.act='idle';a.until=100;a.cool=100;
 const events=[];M.socialSession.subscribe(e=>events.push(e));M.prepareExpressions(sim.view(),0);M.socialSession.advance(180);M.setRandom(()=>0);sim.step(1,{});M.prepareExpressions(sim.view(),100);
 assert.equal(events[0]?.type,kind);assert.equal(events[0]?.targetKey,'player');assert.equal(a.expr.emotion,'positive');assert.ok(a.expr.cue.attention);
 records.push({type:kind,event:events[0],emotion:a.expr.emotion,attention:a.expr.cue.attention});
}
fs.writeFileSync('docs/qa/social-expression-20261016/producer-events.json',JSON.stringify({passed:records.length,records},null,2)+'\n');console.log('3 autonomous event producers PASS');
