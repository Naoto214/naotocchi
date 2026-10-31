const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('./helpers/runtime-harness.cjs').harness({deterministic:true}).api.meguruMod;
test('v22 forest trail and ground have a single shared-edge partition',async()=>{
 const {composeHomeWorld}=await import('../home-world.mjs');const {homeTrailPartition}=await import('../home-scenery.mjs');
 const c=composeHomeWorld(M,'forest');assert.ok(c.world.homeTrail,'partition enabled');
 assert.equal(typeof homeTrailPartition,'function');const mesh=homeTrailPartition(c.world,()=>0);
 assert.ok(mesh.path.length>40);for(let i=0;i<mesh.path.length;i++){assert.deepEqual(mesh.path[i].slice(0,3),mesh.left[i].slice(-3));assert.deepEqual(mesh.path[i].slice(-3),mesh.right[i].slice(0,3));}
});
test('v22 river wheel plane follows flow and axle connects the mill',async()=>{
 const {composeHomeWorld}=await import('../home-world.mjs');const c=composeHomeWorld(M,'river_lake'),w=c.objects.find(o=>o.type==='wheel'),h=c.objects.find(o=>o.type==='house');
 const a=w.parts.find(p=>p.shape==='arch').ang;
 assert.ok(Math.abs(Math.cos(a)/Math.sin(a)-c.scenery.river.slope)<1e-6,'wheel tangent parallel to flow');
 assert.ok(w.homeWheel,'full 3D pivot');assert.ok(Math.abs(w.homeWheel.axle.x*(h.x-w.x)+w.homeWheel.axle.z*(h.z-w.z))>100,'hut lies along axle');
 assert.ok(w.parts.find(p=>p.homeAxle&&p.len>100),'connected axle');
});
test('v22 city closes middle and far skyline gaps without occupying the plaza',async()=>{
 const {composeHomeWorld}=await import('../home-world.mjs');const c=composeHomeWorld(M,'city'),t=c.objects.filter(o=>o.type==='tower');
 assert.ok(t.length>=22);assert.ok(t.length<=34);assert.ok(t.filter(o=>o.z>=2800).length>=10);
 assert.ok(t.every(o=>o.z>1600||Math.abs(o.x)>850));
});
const regions=['countryside','sea','snow','mountain','jungle','desert','deepsea','star_stop','memory_lake','home'];
for(const region of regions)test('v22 formal habitat '+region,async()=>{
 const {composeHomeWorld,createHomeNavigation}=await import('../home-world.mjs');
 assert.equal(require('../home-diorama-model.js').supported(region),true);
 const c=composeHomeWorld(M,region);assert.equal(c.world.regionId,region);assert.ok(c.objects.length>=12);assert.ok(c.objects.length<95);
 assert.ok(c.objects.every(o=>o.sourceId.startsWith(region+':')),'regional official meshes only');
 assert.equal(c.scenery.layers.length,3);assert.ok(c.scenery.camera);assert.ok(c.scenery.activityBounds);assert.ok(c.scenery.observationPoints.length>=2);
 const nav=createHomeNavigation(M,c,{width:390,height:844,anchorY:460});
 for(const p of [{x:0,z:550},{x:0,z:200},{x:180,z:600},{x:-180,z:600}])assert.ok(nav.valid(nav.project(p)),region+' central escape '+JSON.stringify(p));
 assert.equal(nav.valid(nav.project({x:1700,z:550})),false,'outside designated safe domain');
 assert.ok(c.scenery.observationPoints.some(p=>nav.valid(nav.project(p))),'reachable visual reaction');
});
test('v22 every habitat has bounded active-time environmental animation and reduced-motion freeze',async()=>{
 const {HOME_ROUTES,createWorldLife}=await import('../world-life.mjs');
 for(const r of ['forest','river_lake','city',...regions]){assert.ok(HOME_ROUTES[r]?.length,r);const l=createWorldLife(r,()=>.4);for(let i=0;i<400;i++)l.step(.1,{time:'day',weather:'sunny'});assert.ok(l.metrics().spawned>0,r);assert.ok(l.metrics().active<=8);const before=l.snapshot();l.step(.1,{reducedMotion:true});assert.deepEqual(l.snapshot(),before);}
});
test('v22 rendered triangle heights ground actors and objects including negative dry relief',async()=>{
 const {composeHomeWorld}=await import('../home-world.mjs');const {terrainGrid}=await import('../meguru-3d.mjs');
 for(const r of ['forest','snow','mountain','home']){const c=composeHomeWorld(M,r),t=terrainGrid(c.world,M,c.objects);assert.ok(t.homePartition);
 for(const rows of Object.values(t.homePartition))for(let j=10;j<rows.length-10;j+=11)for(let i=0;i<rows[0].length/3-1;i+=3){const a=rows[j].slice(i*3,i*3+3),b=rows[j].slice((i+1)*3,(i+2)*3),d=rows[j+1].slice(i*3,i*3+3),p=a.map((v,k)=>(v+b[k]+d[k])/3);assert.ok(Math.abs(t.walkY(p[0],-p[2])-p[1])<1e-4,r);assert.equal(t.surfaceY(p[0],-p[2]),t.walkY(p[0],-p[2]));}
 assert.equal(-t.homePartition.path.at(-1)[2],t.z0+t.nz*t.cell,'no distant-edge gap');}
});
test('v22 wheel paddles intersect actual rendered water edge',async()=>{const {composeHomeWorld}=await import('../home-world.mjs');const {terrainGrid}=await import('../meguru-3d.mjs');const c=composeHomeWorld(M,'river_lake'),w=c.objects.find(o=>o.type==='wheel'),t=terrainGrid(c.world,M,c.objects),d=t.sDist(w.x,w.z);assert.ok(d.d<d.w*.88,'wheel inside water mesh');assert.ok(d.d>d.w*.75,'wheel at bank');});
