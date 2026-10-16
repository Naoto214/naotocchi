const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../expression-presentation.js'),L=require('../relationship-life.js');
const actor=()=>({key:'companion:shiba',kind:'companion',id:'shiba',asset:'assets/characters/companions/shiba.png',emotion:'normal',x:0,z:0,heading:0});
test('real session events target the player, expire to current relationship and preserve AI pose',()=>{
 const a=actor(),player={x:100,z:0},view={world:{regionId:'home'},residents:[a],party:[],player};let bond=29;
 const c=P.createViewController({relationshipInput:()=>({value:bond})}),s=L.createSession();c.session.subscribe(s);c.prepare(view,0);
 s.emit('greeting',a.key,{context:'meguru',regionId:'home',targetKey:'player'});c.prepare(view,100);
 assert.equal(a.expr.emotion,'positive');assert.ok(a.expr.cue.attention,'target attention missing');assert.equal(a.expr.cue.attention.heading,Math.PI/2);assert.equal(a.heading,0);
 player.x=-100;c.prepare(view,200);assert.equal(a.expr.cue.attention.heading,-Math.PI/2);
 bond=30;for(let t=300;t<=11000;t+=100)c.prepare(view,t);
 assert.equal(a.expr.emotion,'normal');assert.equal(a.expr.cue,undefined);
});
test('actual date start and goodbye reach presentation without losing actor identity',()=>{
 const h=require('./helpers/runtime-harness.cjs').harness({deterministic:true}),st=h.api.state(),M=h.api.meguruMod;
 Object.assign(st,{stage:'growing',companions:[{id:'shiba',bond:29}]});const registry=M.buildRegistry();for(const a of registry.residents)a.region='home';
 const sim=M.createSimulation({registry,regionId:'home',socialSession:M.socialSession}),a=sim.world.residents.find(a=>a.key==='companion:shiba');sim.setPlayer(a.x+40,a.z);M.prepareExpressions(sim.view(),0);
 assert.ok(sim.startAccompany(a.key,'date'));M.prepareExpressions(sim.view(),100);assert.equal(a.expr.emotion,'positive');assert.ok(a.expr.cue.attention);
 sim.endAccompany('player_choice');M.prepareExpressions(sim.view(),200);assert.ok(sim.world.residents.includes(a));assert.equal(a.expr.emotion,'positive');const token=a.expr.cue.token;
 M.prepareExpressions(sim.view(),300);assert.equal(a.expr.cue.token,token);
 a.emotion='sleeping';M.prepareExpressions(sim.view(),400);assert.equal(a.expr.emotion,'sleeping');assert.equal(a.expr.cue,undefined);assert.equal(st.companions[0].bond,29);
});
test('presenter turns body and head only as presentation and reduced motion suppresses it',async()=>{
 const rt=await import('../character-3d/runtime.mjs');const a=actor();
 for(const level of [2,0]){
  const p=rt.createCharacterPresenter({animLevel:level,buildBudget:99});
  for(let n=0;n<20;n++){p.beginFrame(n*50);p.present(a,{specKey:{id:'shiba',stage:0},emotion:'positive',dt:.05,moving:false,cue:{token:1,motion:true,kind:'greet',attention:{heading:Math.PI/2,weight:1}}});p.endFrame();}
  const i=p.instanceOf(a);if(level) {assert.ok(i.yaw<Math.PI-.2);assert.ok(Math.abs(i.anim.lookYaw)>0);}else{assert.equal(i.yaw,Math.PI);assert.equal(i.anim.lookYaw,0);}
  assert.equal(a.heading,0);p.dispose();
 }
});
test('Home visit starts positive and interruption clears only its social overlay',()=>{
 const h=require('./helpers/runtime-harness.cjs').harness({deterministic:true,fullDisplay:true}),s=h.api.state(),M=h.api.meguruMod;
 Object.assign(s,{stage:'growing',isSleeping:false,companions:[{id:'shiba',bond:60}]});for(const id of ['storyFlash','lifeCardOverlay','speechBubble'])h.get(id).classList.add('hidden');
 h.api.render();M.socialSession.advance(300);h.api.render();
 assert.equal(h.api.relationshipVisual('companion',s.companions[0],'base').expression,'positive');
 h.document.visibilityState='hidden';h.dispatch(h.document,'visibilitychange');
 assert.equal(h.api.relationshipVisual('companion',s.companions[0],'base').expression,'normal');
});
test('explicit conversation publishes one semantic target and repeated annoyance does not become positive',()=>{
 const h=require('./helpers/runtime-harness.cjs').harness({deterministic:true}),M=h.api.meguruMod;Object.assign(h.api.state(),{stage:'growing',companions:[{id:'shiba',bond:60}]});const registry=M.buildRegistry();for(const a of registry.residents)a.region='home';const sim=M.createSimulation({registry,regionId:'home',socialSession:M.socialSession}),a=sim.world.residents.find(a=>a.key==='companion:shiba'),events=[];
 sim.setPlayer(a.x+20,a.z);a.behavior='idle';a.until=100;sim.step(.01,{});M.prepareExpressions(sim.view(),0);M.socialSession.subscribe(e=>events.push(e));
 sim.talk();assert.ok(events.some(e=>e.reason==='conversation'&&e.targetKey==='player'));
 sim.talk();M.prepareExpressions(sim.view(),100);assert.equal(a.expr.emotion,'dislike');
});
test('attention ends and missing targets cannot retain gaze; suspension clears cues',()=>{
 const a=actor(),b={...actor(),key:'companion:cat_friend',x:100},v={world:{regionId:'home'},residents:[a,b],party:[]},c=P.createViewController();c.prepare(v,0);
 c.session.accept({version:1,type:'greeting',actorKey:a.key,targetKey:b.key,context:'meguru',at:0});c.prepare(v,100);assert.ok(a.expr.cue.attention);
 v.residents.pop();c.prepare(v,200);assert.equal(a.expr.cue.attention,undefined);
 c.suspend();c.prepare(v,10000);assert.equal(a.expr.cue,undefined);
});
test('conversation while accompanying retriggers after initial cue and preserves repeat-talk dislike',()=>{
 const h=require('./helpers/runtime-harness.cjs').harness({deterministic:true}),M=h.api.meguruMod;Object.assign(h.api.state(),{stage:'growing',companions:[{id:'shiba',bond:29}]});
 const registry=M.buildRegistry();for(const a of registry.residents)a.region='home';const sim=M.createSimulation({registry,regionId:'home',socialSession:M.socialSession}),a=sim.world.residents.find(a=>a.key==='companion:shiba');sim.setPlayer(a.x+20,a.z);M.prepareExpressions(sim.view(),0);sim.startAccompany(a.key);
 for(let t=100;t<=11000;t+=100){sim.step(.1,{});M.prepareExpressions(sim.view(),t);}
 sim.setPlayer(a.x+20,a.z);sim.step(.01,{});const events=[];M.socialSession.subscribe(e=>events.push(e));sim.talk();M.prepareExpressions(sim.view(),11100);
 assert.ok(events.some(e=>e.reason==='conversation'));assert.equal(a.expr.emotion,'positive');sim.talk();M.prepareExpressions(sim.view(),11200);assert.equal(a.expr.emotion,'dislike');
});
