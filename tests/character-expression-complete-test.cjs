const test=require('node:test');
const assert=require('node:assert/strict');
const X=require('../resident-expression.js');
const SPEC=require('../character-3d/spec.js');
test('all four missing states have distinct canonical parameters and fallback meaning',()=>{
 for(const e of ['hungry','weak','critical','lonely']) { assert.ok(X.EMOTIONS.includes(e),e); assert.ok(SPEC.CANONICAL_EMOTIONS.includes(e)); assert.notDeepEqual(SPEC.expressionParams(e),SPEC.expressionParams('normal')); }
 assert.equal(X.resolve({kind:'companion',id:'shiba',asset:'x'},'lonely').asset,'assets/characters/relationship/shiba/lonely.png');
});
const fs=require('node:fs');
test('presentation API exists separately from AI',()=>assert.ok(fs.existsSync('expression-presentation.js')));
const P=()=>require('../expression-presentation.js');
const friend=()=>({key:'companion:shiba',kind:'companion',id:'shiba',asset:'assets/characters/companions/shiba.png',emotion:'normal'});
test('Home priority and normal afterglow reused without changing Home',()=>{
 const p=P();
 assert.equal(p.resolvePlayer({profile:{state:'hungry'}}),'hungry');
 assert.equal(p.resolvePlayer({profile:{state:'weak',severity:'critical'},reaction:'happy'}),'critical');
 assert.equal(p.resolvePlayer({profile:{state:'weak',severity:'critical'},sleeping:true}),'sleeping');
 assert.equal(p.resolvePlayer({profile:{state:'hungry'},reaction:'normal'}),'normal');
 assert.equal(p.resolvePlayer({profile:{state:'normal'},reaction:'happy'}),'positive');
});
test('relationship 29/30, free distance, life conflict and rescue priority',()=>{
 const p=P(),a=friend();
 assert.equal(p.resolveActor(a,{value:29}).emotion,'lonely');
 assert.equal(p.resolveActor(a,{value:30}).emotion,'normal');
 a.distance=99999; assert.equal(p.resolveActor(a,{value:80}).emotion,'normal');
 a.emotion='tired';assert.equal(p.resolveActor(a,{value:29}).emotion,'tired');
 assert.equal(p.resolveActor(a,{value:29,positive:true}).emotion,'positive');
 a.emotion='unhappy';assert.equal(p.resolveActor(a,{value:29,positive:true}).emotion,'dislike');
 a.emotion='sleeping';assert.equal(p.resolveActor(a,{value:29,positive:true}).emotion,'sleeping');
});
test('social sequence repeats same emotion; dedup, cooldown, expiry and region cleanup',()=>{
 const s=P().createSession(),a=friend();s.setScene('forest',[a]);
 const e={version:1,type:'reunion',actorKey:a.key,at:1,context:'meguru',regionId:'forest'};
 assert.equal(s.accept(e),true);const first=s.read(a);assert.equal(first.emotion,'positive');
 assert.equal(s.accept({...e}),false);
 s.advance(2);assert.equal(s.accept({...e,at:3}),true);assert.notEqual(s.read(a).token,first.token);
 assert.equal(s.read(a).motion,false,'cooldown still permits refreshed expression');
 s.advance(20);assert.equal(s.read(a),null);
 assert.equal(s.accept({...e,regionId:'city',at:4}),false);
 s.accept({...e,at:5});s.setScene('city',[a]);assert.equal(s.read(a),null);
});
test('return notification has no second cue; stale identity and unknown events rejected',()=>{
 const s=P().createSession(),a=friend();s.setScene('forest',[a]);
 const e={version:1,type:'accompany_end',actorKey:a.key,at:1,context:'meguru',regionId:'forest'};
 s.accept(e); assert.ok(s.read(a));
 const goodbye=s.read(a).token;s.accept({...e,type:'return_to_free_life'});assert.equal(s.read(a).token,goodbye);
 s.setScene('forest',[friend()]);assert.equal(s.read(a),null);
 assert.equal(s.accept({...e,type:'unknown'}),false);
 assert.equal(s.accept({...e,version:2}),false);
});
test('all 293 rigs accept all 12 states with finite transforms and shared faces',async()=>{
 const rt=await import('../character-3d/runtime.mjs'),anim=await import('../character-3d/animate.mjs');
 assert.equal(SPEC.inventory().length,293);
 for(const r of SPEC.inventory()){
  const k=SPEC.specKeyFor(r.kind==='form'?{line:r.id,stage:r.stage-1}:r);
  const t=rt.getTemplate(k.id,k.stage);assert.equal(t.status,'ok',`${r.id}:${r.stage} ${t.error}`);
  const i=rt.instantiate(t);
  for(const em of SPEC.CANONICAL_EMOTIONS){anim.setEmotion(i,em);anim.animate(i,{dt:.016,moving:false,animLv:0});assert.equal(i.anim.emotion,em);i.root.traverse(o=>assert.ok([...o.position,...o.scale].every(Number.isFinite),r.id+em));}
  rt.disposeInstance(i);
 }
});
test('presenter retriggers different cue tokens but not repeated delivery; sleeping cancels cue',async()=>{
 const rt=await import('../character-3d/runtime.mjs'),a=friend();Object.assign(a,{x:0,z:0,heading:0});
 const p=rt.createCharacterPresenter({buildBudget:99});
 const frame=(em,token)=>{p.beginFrame(token*1000);p.present(a,{specKey:{id:'shiba',stage:0},emotion:em,dt:.016,cue:{token,motion:true,kind:'greet'}});p.endFrame();return p.instanceOf(a);};
 let i=frame('positive',1);assert.equal(i.anim.reaction.kind,'greet');const start=i.anim.reaction.t0;
 i=frame('positive',1);assert.equal(i.anim.reaction.t0,start);
 i=frame('positive',2);assert.notEqual(i.anim.reaction.t0,start);
 i=frame('sleeping',3);assert.equal(i.anim.reaction,null);p.dispose();
});
test('production bridge updates player and party fallback continuously without relation writes',()=>{
 const {harness}=require('./helpers/runtime-harness.cjs'),h=harness({deterministic:true});
 const st=h.api.state();Object.assign(st,{stage:'growing',speciesLine:'dog',hunger:0,health:100,energy:100,isSleeping:false,life:100});
 st.companions=[{id:'shiba',bond:29}];
 const M=h.api.meguruMod;assert.equal(typeof M.prepareExpressions,'function');
 const sim=M.createSimulation({regionId:'forest'});const v=sim.view();
 const a=friend();v.party.push(a);
 M.prepareExpressions(v,1000);assert.equal(v.player.expr.emotion,'hungry');assert.equal(a.expr.emotion,'lonely');
 assert.match(M.spriteFor(v.player,'front').asset,/-hungry.png$/);
 st.companions[0].bond=30;M.prepareExpressions(v,1100);assert.equal(a.expr.emotion,'normal');
 st.isSleeping=true;M.prepareExpressions(v,1200);assert.equal(v.player.expr.emotion,'sleeping');
 assert.equal(st.companions[0].bond,30);
});
test('social cues never replay after build delay and paired return keeps a quiet goodbye',()=>{
 const s=P().createSession(),a=friend();s.setScene('forest',[a]);
 const e={version:1,type:'accompany_end',actorKey:a.key,at:1,context:'meguru',regionId:'forest'};
 s.accept(e);const token=s.read(a).token;s.accept({...e,type:'return_to_free_life'});
 assert.equal(s.read(a).token,token);s.advance(2);assert.equal(s.read(a).motion,false);s.advance(10);assert.equal(s.read(a),null);
});
test('view resets on hidden/resumed gap, honors flag off and expires party reactions',()=>{
 const a=friend(),world={regionId:'forest',expr:{on:true}},view={world,party:[a],residents:[]};
 const c=P().createViewController({relationshipInput:()=>({value:29})});
 a.joy=.15;a.expressionEventSeq=1;c.prepare(view,0);assert.equal(a.expr.emotion,'positive');c.prepare(view,100);c.prepare(view,200);assert.equal(a.expr.emotion,'lonely');
 c.session.accept({version:1,type:'greeting',actorKey:a.key,at:1,context:'meguru',regionId:'forest'});c.prepare(view,300);assert.equal(a.expr.emotion,'positive');
 c.suspend();c.prepare(view,100000);assert.equal(a.expr.emotion,'lonely','do not resume an old greeting after background time');
 world.expr.on=false;c.prepare(view,100100);assert.equal(a.expr,null);
});
test('critical party and stale delivery remain protected across hidden/scene changes',()=>{
 const a=friend(),view={world:{regionId:'forest',expr:{on:true}},party:[a],residents:[],player:{}};
 const c=P().createViewController({playerInput:()=>({profile:{state:'hungry'},base:'x.png'}),relationshipInput:()=>({value:29})});
 a.emotionPersistent='critical';a.joy=5;a.expressionEventSeq=1;c.prepare(view,0);assert.equal(a.expr.emotion,'critical');
 a.emotionPersistent='normal';c.suspend();c.prepare(view,100000);assert.equal(a.expr.emotion,'lonely');
 view.world={regionId:'city',expr:{on:true}};c.prepare(view,100100);assert.equal(a.expr.emotion,'lonely');
 view.world.expr.on=false;c.prepare(view,100200);assert.equal(view.player.expr,null);
 const s=P().createSession(),e={version:1,type:'reunion',actorKey:a.key,at:5,context:'meguru',regionId:'forest'};
 s.setScene('forest',[a]);assert.equal(s.accept(e),true);s.setScene('forest',[friend()]);assert.equal(s.accept(e),false);
 assert.equal(s.accept({...e,at:4}),false);
});
test('abandoned social motion is cancelled without cancelling ordinary reactions',async()=>{
 const rt=await import('../character-3d/runtime.mjs'),a=friend(),p=rt.createCharacterPresenter({buildBudget:99});
 p.beginFrame(0);p.present(a,{specKey:{id:'shiba',stage:0},emotion:'positive',dt:.016,cue:{token:1,motion:true,kind:'greet'}});p.endFrame();
 assert.equal(p.instanceOf(a).anim.reaction.kind,'greet');
 p.beginFrame(100000);p.present(a,{specKey:{id:'shiba',stage:0},emotion:'normal',dt:.016});p.endFrame();assert.equal(p.instanceOf(a).anim.reaction,null);p.dispose();
});
test('life reactions retrigger same positive with distinct sequence and bounded movement',()=>{
 const a=friend(),v={world:{regionId:'forest'},party:[a]},c=P().createViewController();
 a.joy=10;a.expressionEventSeq=1;c.prepare(v,0);const token=a.expr.cue.token;assert.equal(a.expr.cue.motion,true);
 a.expressionEventSeq=2;c.prepare(v,100);assert.notEqual(a.expr.cue.token,token);assert.equal(a.expr.cue.motion,false);
 c.suspend();c.prepare(v,100000);assert.equal(a.expr.cue,undefined);assert.equal(a.expr.emotion,'normal');
});
test('Home session duration remains 2.5s and subscription can be detached',()=>{
 const s=P().createSession({context:'home'}),a=friend();s.setScene(null,[a]);let listener=null;
 const off=s.subscribe({subscribe(fn){listener=fn;return()=>{listener=null;};}});
 listener({version:1,type:'visit',actorKey:a.key,at:0,context:'home'});s.advance(2.4);assert.ok(s.read(a));s.advance(.2);assert.equal(s.read(a),null);off();assert.equal(listener,null);
});
test('accompany start preserves current mood; partner boundary and all mock event types',()=>{
 const p=P(),a={...friend(),kind:'partner',id:'cat_ceo',key:'partner:cat_ceo',emotion:'tired'};
 assert.equal(p.resolveActor({...a,emotion:'normal'},{value:29}).emotion,'lonely');assert.equal(p.resolveActor({...a,emotion:'normal'},{value:30}).emotion,'normal');
 const s=p.createSession();s.setScene('forest',[a]);let at=0;
 for(const type of p.EVENTS){const e={version:1,type,actorKey:a.key,at:++at,context:'meguru',regionId:'forest'};assert.equal(s.accept(e),true);if(type==='accompany_start')assert.equal(p.resolveActor(a,{value:80},s.read(a)).emotion,'tired');}
});
test('slow visible frames keep social expression; explicit suspension clears it',()=>{
 const a=friend(),v={world:{regionId:'forest'},party:[a]},c=P().createViewController();c.prepare(v,0);
 c.session.accept({version:1,type:'reunion',actorKey:a.key,at:1,context:'meguru',regionId:'forest'});c.prepare(v,1500);assert.equal(a.expr.emotion,'positive');
 c.suspend();c.prepare(v,100000);assert.equal(a.expr.emotion,'normal');
});
