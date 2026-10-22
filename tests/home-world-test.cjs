const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/runtime-harness.cjs');
const M=harness({deterministic:true}).api.meguruMod;
test('Home compositions reuse official geometry, preserve sources and keep cast foreground clear',async()=>{
 const {composeHomeWorld}=await import('../home-world.mjs');
 for(const region of ['forest','river_lake','city']){
  const original=JSON.stringify(M.REGION3D[region]);const c=composeHomeWorld(M,region);
  assert.ok(c.objects.length>10);assert.ok(c.objects.every(o=>o.sourceId));
  assert.ok(c.objects.filter(o=>o.solid).every(o=>o.z>=1000||Math.abs(o.x)>700));
  assert.equal(JSON.stringify(M.REGION3D[region]),original);
  assert.ok(c.world.world3d);assert.ok(c.world.segments.length);
  if(region==='river_lake')assert.equal(c.world.terrain.kind,'river');
  if(region==='city')assert.ok(c.routes.some(r=>r.kind==='car'&&r.domain==='road'));
 }
});
test('Living environment remains bounded with correct routes and pauses',async()=>{
 const {createWorldLife}=await import('../world-life.mjs');
 for(const region of ['forest','river_lake','city']){
  const life=createWorldLife(region,()=>.37);let distance=0,last=life.snapshot();
  for(let i=0;i<36000;i++){life.step(.1,{time:'day',weather:'sunny'});let now=life.snapshot();assert.ok(now.length<=12);for(let a of now){assert.ok(Number.isFinite(a.x+a.y+a.z));if(a.kind==='fish')assert.ok(a.z>=1380&&a.z<=1620);if(a.kind==='car')assert.equal(a.z,1400);}if(i<600)distance+=now.reduce((n,a,j)=>n+Math.abs(a.x-(last[j]?.x||a.x)),0);last=now;}
  assert.ok(distance>100);const before=JSON.stringify(life.snapshot());life.step(40,{paused:true});assert.equal(JSON.stringify(life.snapshot()),before);assert.ok(life.metrics().spawned>2);
 }
});
