const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/runtime-harness.cjs');
const home=require('../home-diorama.js');
test('guide only completes after successful actor drag; separate namespace, replay and denied storage',()=>{
 const data=new Map([['save','unchanged']]),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 const g=home.createGestureGuide({storage,key:'save:home-guide-v1'});assert.equal(g.visible(),true);
 g.drag({actor:true,success:false});assert.equal(g.visible(),true);
 g.drag({actor:false,success:true});assert.equal(g.visible(),true);
 g.drag({actor:true,success:true});assert.equal(g.visible(),false);assert.equal(data.get('save'),'unchanged');
 const reloaded=home.createGestureGuide({storage,key:'save:home-guide-v1'});assert.equal(reloaded.visible(),false);reloaded.replay();assert.equal(reloaded.visible(),true);reloaded.dismiss();assert.equal(reloaded.visible(),false);
 const denied=home.createGestureGuide({storage:{getItem(){throw Error('denied');},setItem(){throw Error('denied');}}});denied.drag({actor:true,success:true});assert.equal(denied.visible(),false);
 assert.equal(home.createGestureGuide({storage,key:'preview:home-guide-v1'}).visible(),true);
});
test('city has connected pedestrian paving, separate curbs and traffic, no foreground asphalt spur',async()=>{
 const M=harness({deterministic:true}).api.meguruMod,{composeHomeWorld}=await import('../home-world.mjs');
 const c=composeHomeWorld(M,'city'),s=c.world.segments;
 assert.ok(s.some(q=>q.surface==='sidewalk'&&Math.abs(q.a.z-1150)<1));
 assert.ok(s.some(q=>q.surface==='sidewalk'&&q.a.z>1510));
 assert.ok(s.some(q=>q.surface==='curb'));
 assert.equal(s.filter(q=>q.surface==='road').length,1);assert.equal(s.find(q=>q.surface==='road').a.z,1400);
 assert.ok(!s.some(q=>q.half>=200&&q.a.z<0&&q.b.z>1000));
 for(const route of c.routes.filter(r=>r.kind==='pedestrian'))for(let x=-1400;x<=1400;x+=20){
  assert.ok(s.some(q=>q.surface==='sidewalk'&&q.a.x<=x&&q.b.x>=x&&Math.abs(route.z-q.a.z)<q.half));
  assert.equal(M.collidesAt(c.world,x,route.z,18),false,'pedestrian route clear at '+x);
 }
});
test('all 26 registered companions and a partner still visit one at a time; formal maximum is 2',()=>{
 const fs=require('fs'),vm=require('vm');const master=vm.runInNewContext(fs.readFileSync('character-world-master.v1.js','utf8')+';NAOTOCCHI_CHARACTER_WORLD_MASTER_V1');
 const companions=[...master.companions.normal,...master.companions.rare];assert.equal(companions.length,26);
 const {createSession,createVisits}=require('../relationship-life.js'),relations=companions.map(c=>({key:'companion:'+c.id})).concat({key:'partner:cat_ceo'});
 for(const random of [()=>0,()=>.999]){const session=createSession({random}),visits=createVisits(session);let seen=0;
 for(let i=0;i<36000;i++){const v=visits.update(1,relations);if(v){seen++;assert.ok(relations.some(r=>r.key===v.key));assert.equal(Array.isArray(v),false);}}assert.ok(seen>0);visits.clear('hidden');assert.equal(visits.current,null);}
 for(const width of [288,343,358,398])for(const k of [.7,.8,.9]){
 const args={width,height:300,mainAsset:'assets/characters/dog/04.png',companions:[]};const solo=home.layoutTerrainCast(args,k);
 for(const extra of [{hasPartner:true,partnerAsset:'assets/characters/partners/cat_ceo.png'},{companions:['assets/characters/companions/shiba.png']}])assert.ok(Math.abs(home.layoutTerrainCast({...args,...extra},k).main.w-solo.main.w)<1e-8);
 if(width===358&&k===.8)assert.equal(solo.main.w,149.6);
 }
});
test('runtime attendance with every registered companion never truncates relationships or renders more than one visitor',()=>{
 const h=harness({deterministic:true,fullDisplay:true}),s=h.api.state(),M=h.api.meguruMod,fs=require('fs'),vm=require('vm');
 const master=vm.runInNewContext(fs.readFileSync('character-world-master.v1.js','utf8')+';NAOTOCCHI_CHARACTER_WORLD_MASTER_V1');
 const ids=[...master.companions.normal,...master.companions.rare].map(c=>c.id);
 Object.assign(s,{stage:'growing',regionId:'city',isSleeping:false,companions:ids.map(id=>({id,bond:100}))});
 const p=h.api.partnerCandidates[0];s.partner={id:p.id,label:p.label,emoji:p.emoji,affection:100};
 for(const id of ['storyFlash','lifeCardOverlay','speechBubble'])h.get(id).classList.add('hidden');
 const before=JSON.stringify([s.companions,s.partner]);let seen=0;
 for(let i=0;i<100;i++){M.socialSession.advance(60);h.api.render();const v=h.api.homeVisitors(),n=v.companions.length+(v.partner?1:0);assert.ok(n<=1);seen+=n;}
 assert.ok(seen);assert.equal(JSON.stringify([s.companions,s.partner]),before);
 s.isSleeping=true;h.api.render();assert.equal(h.api.homeVisitors().companions.length,0);assert.equal(h.api.homeVisitors().partner,null);
});
