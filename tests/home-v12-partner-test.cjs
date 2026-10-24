const {test}=require('node:test'),assert=require('node:assert/strict');
const {createModel}=require('../home-diorama-model.js');
const scene={region:'forest',width:640,height:440,groundTop:100,time:'day',weather:'sunny',tags:[]};
const pet={key:'pet:a',id:'a',kind:'pet',x:150,y:220,w:36,h:44};
const partner={key:'partner:b',id:'b',kind:'partner',x:490,y:220,w:36,h:44};
function rng(seed){return ()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};}
function advance(m,seconds,flags={},sync){for(let i=0;i<Math.round(seconds*10);i++){m.step(.1,flags);if(sync&&i%5===0)sync();}}
function make(list=[pet,partner],s=scene,seed=31){const m=createModel({random:rng(seed)});m.sync(list,s);return m;}
function actor(m,key=partner.key){return m.snapshot().find(a=>a.key===key);}

test('manual selection suppresses autonomous movement for at least twelve seconds',()=>{
 const m=make([partner],scene,1);m.select(partner.key);advance(m,11.9);assert.equal(m.metrics().moves,0);assert.equal(actor(m).x,490);
 advance(m,60);assert.ok(m.metrics().moves>0,'life resumes after grace');
});
test('manual drag grace survives arrival, frequent sync, resize and care cancellation',()=>{
 const list=[partner],m=make(list,scene,4);m.select(partner.key);assert.ok(m.move(partner.key,{x:450,y:220},'drag'));
 advance(m,2,{autonomy:false});const settled=actor(m);assert.ok(Math.abs(settled.x-450)<1);
 let s={...scene,width:620};m.sync(list,s);advance(m,4,{},()=>m.sync(list,s));
 m.step(.1,{blocked:true});advance(m,3,{blocked:true});m.step(0,{blocked:false});advance(m,5.9,{},()=>m.sync(list,s));
 assert.equal(m.metrics().moves,1);assert.equal(actor(m).x,settled.x);advance(m,60);assert.ok(m.metrics().moves>1);
});
test('a fresh ground command renews grace and ambient commands cannot replace it',()=>{
 const m=make([partner]);m.select(partner.key);advance(m,10,{autonomy:false});
 assert.ok(m.move(partner.key,{x:450,y:220},'ground'));assert.equal(m.move(partner.key,{x:70,y:200},'ambient'),false);
 advance(m,11.9);assert.equal(m.metrics().moves,1);assert.ok(Math.abs(actor(m).x-450)<1);
});
test('same-sized roles share exact bounds and manual navigation destinations',async()=>{
 const {createTerrainNavigation}=await import('../home-world.mjs');
 const navigation=createTerrainNavigation({width:640,height:440,cell:10,project:p=>({x:p.x,y:p.z}),unproject:p=>({x:p.x,y:0,z:p.y}),walkable:p=>!(p.x>290&&p.x<340&&p.z<300)});
 let reference;
 for(const kind of ['pet','companion','partner']){
  const row={...partner,key:kind+':a',kind,x:200,y:180,extent:{left:24,right:38,top:62,bottom:8}},m=make([row],{...scene,navigation});
  assert.deepEqual(m.bounds(actor(m,row.key)),{left:36,right:590,top:100,bottom:378});
  assert.ok(m.move(row.key,{x:999,y:-999},'drag'));const route=actor(m,row.key);assert.ok(route.route.length>1,'solid forces routed detour');
  advance(m,30,{autonomy:false});const a=actor(m,row.key);assert.ok(a.x>340,'all roles cross around obstacle');assert.ok(navigation.valid(a));
  const position={x:a.x,y:a.y};if(reference)assert.deepEqual(position,reference);else reference=position;
 }
});
test('partner returns near the pet more often while still roaming with varied distances',()=>{
 const results=[],homePet={...pet,x:90,y:200},others=[{...pet,key:'companion:c',kind:'companion',x:520,y:160},{...pet,key:'companion:d',kind:'companion',x:520,y:300}];
 for(const kind of ['companion','partner']){
  let near=0,samples=0,far=0,returns=0;const closeDistances=new Set();
  for(const seed of [7,31,119,997]){
   const row={...partner,kind,x:420},list=[homePet,...others,row],m=make(list,scene,seed);let wasFar=true;
   for(let i=0;i<6000;i++){
    // Keep the comparison household in place using real player-input grace.
    if(i%50===0)for(const resident of [homePet,...others])m.select(resident.key);
    m.step(.1);if(i%30===0)m.sync(list,scene);
    const p=m.snapshot()[0],a=actor(m),distance=Math.hypot(p.x-a.x,p.y-a.y);
    assert.ok(Math.hypot((p.x-a.x)/46,(p.y-a.y)/43.44)>=.999,'actors never overlap');
    if(i%10===0){samples++;if(distance<130){near++;closeDistances.add(Math.floor(distance/10));if(wasFar){returns++;wasFar=false;}}if(distance>210){far++;wasFar=true;}}
   }
  }
  results.push({kind,near,samples,far,returns,distances:closeDistances.size});
 }
 const [companion,p]=results;assert.ok(p.near/p.samples>companion.near/companion.samples+.12,JSON.stringify(results));
 assert.ok(p.far>p.samples*.05,JSON.stringify(results));assert.ok(p.returns>=8,JSON.stringify(results));assert.ok(p.distances>=5,JSON.stringify(results));
 console.log('partner-life deterministic 4 × 600-second results',JSON.stringify(results));
});
test('reduced motion, held input, care/conversation/sleep blocking stop partner autonomy',()=>{
 for(const flags of [{reducedMotion:true},{heldActor:partner.key},{blocked:true}]){
  const m=make();advance(m,60,flags);const a=actor(m);assert.equal(a.x,490);assert.equal(a.y,220);assert.equal(a.target,null);
 }
 const m=make();assert.ok(m.move(partner.key,{x:400,y:220},'drag'));m.step(.1,{reducedMotion:true});assert.ok(actor(m).x<490);
 m.step(.1,{blocked:true});const stopped=actor(m);assert.equal(m.move(partner.key,{x:350,y:220},'drag'),false);advance(m,20,{blocked:true});assert.equal(actor(m).x,stopped.x);assert.equal(actor(m).target,null);
});
test('5/3/2 crowded movement budgets and collision safety survive long seeded simulations',()=>{
 for(const [count,budget]of [[5,5],[6,3],[28,2]]){
  const s={...scene,width:900,height:700},list=Array.from({length:count},(_,i)=>({...pet,key:i===0?pet.key:i===1?partner.key:'companion:'+i,kind:i===0?'pet':i===1?'partner':'companion',x:65+(i%7)*120,y:150+Math.floor(i/7)*125})),m=make(list,s,31);let moves=0;
  for(let i=0;i<3000;i++){
   m.step(.1);if(i%30===0)m.sync(list,s);const snapshot=m.snapshot();moves=Math.max(moves,snapshot.filter(a=>a.target&&a.source==='ambient').length);assert.ok(moves<=budget);
   for(let j=0;j<snapshot.length;j++)for(let k=j+1;k<snapshot.length;k++){const a=snapshot[j],b=snapshot[k];assert.ok(Math.hypot((a.x-b.x)/46,(a.y-b.y)/43.44)>=.999);}
  }
  assert.ok(m.metrics().moves>count);assert.ok(moves>0);
 }
});

test('an in-flight player route remains authoritative even after twelve seconds',()=>{
 const m=make([partner],{...scene,width:1800});assert.ok(m.move(partner.key,{x:1600,y:220},'drag'));advance(m,13,{autonomy:false});
 const before=actor(m);assert.ok(before.target);assert.equal(m.move(partner.key,{x:70,y:220},'ambient'),false);assert.deepEqual(actor(m).target,before.target);
});
test('crowded roster and body-size reflow retain the player grace deadline',()=>{
 const s={...scene,width:900,height:700},list=Array.from({length:6},(_,i)=>({...partner,key:i===0?partner.key:'companion:'+i,kind:i===0?'partner':'companion',x:100+i*130,y:200}));
 const m=make(list,s);m.select(partner.key);advance(m,3,{autonomy:false});
 const resized=list.map(a=>({...a,w:38,h:46}));m.sync(resized,s);const before=actor(m);advance(m,8.9,{},()=>m.sync(resized,s));
 assert.equal(actor(m).x,before.x);assert.equal(actor(m).y,before.y);assert.equal(actor(m).target,null);
});
test('social arrival does not turn or animate a player-controlled pet',()=>{
 for(const held of [false,true]){
  const m=make([pet,{...partner,x:250}],scene,8);if(!held)m.select(pet.key);
  advance(m,11,held?{heldActor:pet.key}:{});assert.equal(actor(m).faceKey,pet.key);assert.equal(actor(m).activity,'together');
  const main=actor(m,pet.key);assert.equal(main.activity,'rest');assert.equal(main.direction,1);assert.equal(main.x,150);
 }
});
test('partner autonomous return takes the shared terrain detour without crossing a solid',async()=>{
 const {createTerrainNavigation}=await import('../home-world.mjs');
 const navigation=createTerrainNavigation({width:640,height:440,cell:10,project:p=>({x:p.x,y:p.z}),unproject:p=>({x:p.x,y:0,z:p.y}),walkable:p=>!(p.x>290&&p.x<340&&p.z<300)});
 const m=make([{...pet,x:180,y:160},{...partner,y:160}],{...scene,navigation},31);let previous=actor(m),returned=false,detoured=false;
 for(let i=0;i<1800;i++){
  m.step(.1,{heldActor:pet.key});const a=actor(m),p=actor(m,pet.key);assert.ok(navigation.valid(a));assert.ok(navigation.segmentSafe(previous,a));
  assert.ok(Math.hypot((p.x-a.x)/46,(p.y-a.y)/43.44)>=.999);if(a.y>=300)detoured=true;if(Math.hypot(a.x-p.x,a.y-p.y)<130)returned=true;previous=a;
 }
 assert.ok(detoured,'walked around the obstacle');assert.ok(returned,'rejoined the pet through existing pathfinding');
});
