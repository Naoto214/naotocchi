const test=require('node:test'),assert=require('node:assert/strict');
const {createModel}=require('../home-production-model.js');

async function fixture(count=2){
 const {createTerrainNavigation}=await import('../home-route-navigation.mjs');
 const valid=p=>(p.x>=24&&p.x<=216&&(p.y>=95&&p.y<=105||p.x>=105&&p.x<=140&&p.y>=52&&p.y<=105))||(p.x>=300&&p.x<=1000&&p.y>=80&&p.y<=600);
 const nav=createTerrainNavigation({width:1024,height:650,project:p=>p,unproject:p=>({...p,z:p.y}),walkable:valid,cell:8,gridOrigin:{x:0,y:0}});nav.intentAware=true;nav.intentScale={x:1,y:1};
 const actors=[{key:'requester',kind:'pet',id:'requester',x:60,y:100,w:20,h:20,extent:{left:10,right:10,top:20,bottom:0}},{key:'blocker',kind:'companion',id:'blocker',x:120,y:100,w:20,h:20,extent:{left:10,right:10,top:20,bottom:0}},...Array.from({length:count-2},(_,i)=>({key:'other'+i,kind:'companion',id:'other'+i,x:400+Math.floor(i/8)*100,y:120+(i%8)*55,w:20,h:20}))];
 const scene={width:1024,height:650,region:'city',time:'day',navigation:nav,actorBounds:a=>['requester','blocker'].includes(a.key)?{left:24,right:216,top:52,bottom:105}:{left:300,right:1000,top:80,bottom:600},visible:valid,tags:[]};
 const model=createModel({random:()=>.5});model.setYieldMode('manual');model.sync(actors,scene);return {model,scene,actors};
}
function advance(model,seconds){let maximum=0;for(let i=0;i<seconds*20;i++){model.step(.05,{autonomy:false});const s=model.yieldStatus();maximum=Math.max(maximum,s.autonomousMoving);assert.ok(s.autonomousMoving<=s.budget,'yield shares the existing ambient movement budget');}return maximum;}

for(const [count,budget]of [[5,5],[10,3],[28,2]])test(`yield shares the ${budget}-mover budget at ${count} residents`,async()=>{
 const {model}=await fixture(count),others=model.snapshot().slice(2),moving=Math.min(budget,others.length),chosen=others.slice(-moving);
 for(const a of chosen)assert.equal(model.move(a.key,{x:a.x+50,y:a.y},'ambient'),true);
 assert.equal(model.yieldStatus().budget,budget);
 model.move('requester',{x:200,y:100},'drag');advance(model,1);
 if(moving===budget)assert.equal(model.yieldStatus().counters.started,0,'full budget leaves the blocked request waiting');
 advance(model,2);assert.ok(chosen.every(a=>!model.snapshot().find(b=>a.key===b.key).target),'independent walkers have settled');
 // Cooperative planning conservatively abandons a snapshot if another resident
 // moves. A fresh gesture after the cast settles can request a safe retreat.
 if(!model.yieldStatus().counters.started){model.select('requester');model.move('requester',{x:200,y:100},'drag');advance(model,3);}
 assert.equal(model.yieldStatus().counters.started,1,'a settled cast permits a retreat within the available budget');
});

for(const phase of ['pending','planning'])for(const change of ['item','size','region','time','navigation','roster'])test(`a ${phase} retreat is invalidated or freshly replanned after ${change} changes`,async()=>{
 const {model,scene,actors}=await fixture();model.move('requester',{x:200,y:100},'drag');
 if(phase==='planning'){for(let i=0;i<60&&!model.yieldStatus().planning;i++)advance(model,.05);assert.ok(model.yieldStatus().planning,'cooperative planning began');}
 const list=actors.map(a=>({...a,extent:a.extent&&{...a.extent}})),next={...scene};
 if(change==='item')list[0].extent.top=24;
 if(change==='size')list[0].w=21;
 if(change==='region')next.region='forest';
 if(change==='time')next.time='night';
 if(change==='navigation')next.navigation={...scene.navigation};
 if(change==='roster')list.pop();
 const requests=model.yieldStatus().counters.requests;model.sync(list,next);
 assert.equal(model.yieldStatus().active,null);assert.equal(model.yieldStatus().planning,null);
 advance(model,3);
 // V5 may preserve and retry its original manual intention. A fresh request
 // must be generated before it can ask for a newly checked retreat.
 const state=model.yieldStatus();assert.ok(state.counters.started===0||state.counters.requests>requests,'an invalidated request cannot activate without fresh planning');
});

test('item change aborts a retreat already in motion without moving anyone instantly',async()=>{
 const {model,scene,actors}=await fixture();model.move('requester',{x:200,y:100},'drag');
 for(let i=0;i<80&&!model.yieldStatus().active;i++)model.step(.05,{autonomy:false});
 assert.equal(model.yieldStatus().active?.phase,'retreat');const before=model.snapshot().find(a=>a.key==='blocker');
 model.sync(actors.map(a=>a.key==='requester'?{...a,extent:{...a.extent,top:24}}:a),scene);
 assert.equal(model.yieldStatus().active,null);const after=model.snapshot().find(a=>a.key==='blocker');
 assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<.000001,'unchanged blocker remains at its current position');assert.notEqual(after.source,'yield');
});

for(const interrupt of ['blocked','held','reduced','off','cancel'])test(`${interrupt} interrupts cooperative planning before anyone retreats`,async()=>{
 const {model}=await fixture();model.move('requester',{x:200,y:100},'drag');
 for(let i=0;i<60&&!model.yieldStatus().planning;i++)advance(model,.05);
 assert.ok(model.yieldStatus().planning,'planning is in progress');
 const before=model.snapshot().find(a=>a.key==='blocker');
 if(interrupt==='off')model.setYieldMode('off');
 else if(interrupt==='cancel')model.cancel();
 else model.step(.05,{autonomy:false,...(interrupt==='blocked'?{blocked:true}:interrupt==='held'?{heldActor:'blocker'}:{reducedMotion:true})});
 assert.equal(model.yieldStatus().planning,null);assert.equal(model.yieldStatus().active,null);
 advance(model,3);
 assert.equal(model.yieldStatus().counters.started,0,'interrupted planning cannot activate later');
 const after=model.snapshot().find(a=>a.key==='blocker');assert.deepEqual({x:after.x,y:after.y},{x:before.x,y:before.y});
});

test('yielding cannot discard the accepted V5 endpoint after two movers close its route',async()=>{
 const {createTerrainNavigation}=await import('../home-route-navigation.mjs');
 const valid=p=>p.x>=24&&p.x<=216&&(p.y>=95&&p.y<=105||((p.x>=105&&p.x<=140)||(p.x>=165&&p.x<=200))&&p.y>=52&&p.y<=105);
 const nav=createTerrainNavigation({width:240,height:160,project:p=>p,unproject:p=>({...p,z:p.y}),walkable:valid,cell:8,gridOrigin:{x:0,y:0}});nav.intentAware=true;nav.intentScale={x:1,y:1};
 const model=createModel({random:()=>.5});model.setYieldMode('manual');model.sync([
  {key:'a',kind:'pet',id:'a',x:60,y:100,w:20,h:20},
  {key:'b',kind:'companion',id:'b',x:120,y:60,w:20,h:20},
  {key:'c',kind:'partner',id:'c',x:180,y:60,w:20,h:20},
 ],{width:240,height:160,region:'city',time:'day',navigation:nav,actorBounds:()=>({left:24,right:216,top:52,bottom:105}),visible:valid,tags:[]});
 assert.equal(model.move('a',{x:200,y:100},'drag'),true);
 const a=model.snapshot()[0];assert.deepEqual((a.route.length?a.route.at(-1):a.target),{x:200,y:100},'original endpoint accepted before the lane closes');
 assert.equal(model.move('b',{x:120,y:100},'ambient'),true);assert.equal(model.move('c',{x:180,y:100},'ambient'),true);
 advance(model,8);
 assert.equal(model.yieldStatus().counters.started,0,'moving only the first blocker would sacrifice the accepted farther endpoint');
});
