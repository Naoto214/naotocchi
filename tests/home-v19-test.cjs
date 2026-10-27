const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/runtime-harness.cjs');
const M=harness({deterministic:true}).api.meguruMod;
test('v19 defines all thirteen destinations but only three approved pilot compositions',async()=>{
 const {HOME_SCENERY}=await import('../home-scenery.mjs');
 assert.deepEqual(Object.keys(HOME_SCENERY).sort(),['home','city','countryside','forest','mountain','snow','sea','deepsea','river_lake','jungle','desert','star_stop','memory_lake'].sort());
 assert.deepEqual(Object.keys(HOME_SCENERY).filter(r=>HOME_SCENERY[r].status==='pilot').sort(),['city','forest','river_lake']);
 assert.equal(new Set(['forest','river_lake','city'].map(r=>JSON.stringify(HOME_SCENERY[r].camera))).size,3);
});
test('v19 compositions reuse landmarks with independent source objects and bounded cost',async()=>{
 const {composeHomeWorld}=await import('../home-world.mjs');
 for(const [r,types]of Object.entries({forest:['bigtree','leaf','mushrooms','log'],river_lake:['bridge','wheel','reeds','rock'],city:['house','tower','car','lamp']})){
  const before=JSON.stringify(M.REGION3D[r]);const c=composeHomeWorld(M,r);
  for(const t of types)assert.ok(c.objects.some(o=>o.type===t),r+':'+t);
  assert.ok(c.objects.length<100);assert.ok(c.objects.every(o=>o.sourceId));assert.ok(c.scenery.camera);
  assert.equal(JSON.stringify(M.REGION3D[r]),before);
  assert.ok(c.scenery.observationPoints.length>=2);
 }
});
test('v19 camera projection roundtrips and retains safe foreground on all phone widths',async()=>{
 const {composeHomeWorld,createHomeNavigation}=await import('../home-world.mjs');
 for(const r of ['forest','river_lake','city'])for(const width of [320,375,390,430]){
  const c=composeHomeWorld(M,r),n=createHomeNavigation(M,c,{width,height:844,anchorY:420});
  for(const p of [{x:0,z:100},{x:80,z:600},{x:-140,z:800}]){const q=n.unproject(n.project(p));assert.ok(Math.hypot(q.x-p.x,q.z-p.z)<1,r);}
  let safe=0;for(let y=430;y<620;y+=10)for(let x=30;x<width-30;x+=10)if(n.valid({x,y}))safe++;
  assert.ok(safe>150,`${r} ${width}: safe foreground ${safe}`);
  if(r==='river_lake')assert.equal(n.valid(n.project({x:0,z:1650})),false);
  if(r==='city')assert.equal(n.valid(n.project({x:0,z:1400})),false);
 }
});
test('v19 visual environmental gaze reuses idle motion and respects manual/reduced motion',()=>{
 const {createModel}=require('../home-diorama-model.js');let seed=19;const random=()=>((seed=seed*16807%2147483647)/2147483647);
 const model=createModel({random}),actor={key:'pet:a',kind:'pet',id:'a',x:150,y:180,w:30,h:40};
 const scene={region:'forest',width:350,height:300,groundTop:50,visualPoints:[{id:'canopy',activity:'observe',x:170,y:180,target:{x:250,y:130}}]};
 model.sync([actor],scene);let found=false;
 for(let i=0;i<6000;i++){model.step(.1);if(model.snapshot()[0].visualReaction==='canopy'){found=true;break;}}
 assert.ok(found,'existing observe idle occasionally uses a real scenery point');
 model.select(actor.key);const before=model.snapshot()[0];for(let i=0;i<30;i++)model.step(.1);assert.equal(model.snapshot()[0].x,before.x);
 const frozen=createModel({random});frozen.sync([actor],scene);for(let i=0;i<1000;i++)frozen.step(.1,{reducedMotion:true});assert.equal(frozen.snapshot()[0].visualReaction,undefined);
});
test('v19 waterwheel pivot preserves radius and city lighting only selects official glass',async()=>{
 const {rotateWheelPoint}=await import('../home-scenery.mjs');
 const p={y:90,z:22},pivot={y:50,z:10};const q=rotateWheelPoint(p,pivot,Math.PI/2);
 assert.ok(Math.abs(Math.hypot(q.y-50,q.z-10)-Math.hypot(40,12))<1e-8);
 assert.deepEqual(rotateWheelPoint(p,pivot,0),p);
 const {composeHomeWorld}=await import('../home-world.mjs'),c=composeHomeWorld(M,'city');
 const windows=c.objects.flatMap(o=>o.parts.filter(p=>p.homeWindow));assert.ok(windows.length>10);assert.ok(windows.every(p=>['#b8d8e5','#cfe6f2'].includes(p.color)));
});
test('v19 every environmental approach survives real projection and collision filtering',async()=>{
 const {composeHomeWorld,createHomeNavigation}=await import('../home-world.mjs');
 for(const r of ['forest','river_lake','city']){
  const c=composeHomeWorld(M,r),nav=createHomeNavigation(M,c,{width:390,height:844,anchorY:420});
  for(const p of c.scenery.observationPoints)assert.ok(nav.valid(nav.project(p)),r+':'+p.id+' must be reachable ground');
 }
});
test('v19 environmental gaze ends with the next unrelated idle activity',()=>{
 const {createModel}=require('../home-diorama-model.js');let seed=19;const random=()=>((seed=seed*16807%2147483647)/2147483647),m=createModel({random});
 m.sync([{key:'pet:a',kind:'pet',id:'a',x:150,y:180,w:30,h:40}],{region:'forest',width:350,height:300,groundTop:50,visualPoints:[{id:'tree',activity:'observe',x:170,y:180,target:{x:250,y:130}}]});
 let observed=false,ended=false;
 for(let i=0;i<10000;i++){m.step(.1);const a=m.snapshot()[0];if(a.visualReaction)observed=true;if(observed&&!a.visualReaction){assert.equal(a.visualTarget,null);ended=true;break;}}
 assert.ok(observed&&ended);
});
test('v19 turned waterwheel collision follows its visible face',async()=>{
 const {composeHomeWorld}=await import('../home-world.mjs');const c=composeHomeWorld(M,'river_lake'),wheel=c.objects.find(o=>o.type==='wheel');
 assert.equal(wheel.collision.ang,wheel.parts.find(p=>p.shape==='arch').ang);
});
