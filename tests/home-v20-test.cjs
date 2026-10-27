const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/runtime-harness.cjs');
const M=harness({deterministic:true}).api.meguruMod;
test('regional habitat seats span real world depth and are shared with navigation',async()=>{
 const {composeHomeWorld,createHomeNavigation}=await import('../home-world.mjs');
 for(const region of ['forest','river_lake','city']){
  const c=composeHomeWorld(M,region),nav=createHomeNavigation(M,c,{width:390,height:844,anchorY:420});
  assert.equal(typeof nav.initialPoint,'function');
  assert.deepEqual(nav.initialPoint(0,28),nav.initialPoint(0,1),'main focal seat stays stable at capacity');
  const seats=Array.from({length:6},(_,i)=>nav.initialPoint(i,6));
  assert.ok(Math.max(...seats.map(p=>p.y))-Math.min(...seats.map(p=>p.y))>60,region);
  for(const p of seats){const world=nav.unproject(p);assert.ok(Number.isFinite(world.x+world.z));}
  assert.ok(nav.depthScale(nav.project({x:0,z:1600}))<nav.depthScale(nav.project({x:0,z:200})));
  for(const z of [0,200,800,1600,3000])assert.ok(nav.depthScale(nav.project({x:0,z}))>=.8&&nav.depthScale(nav.project({x:0,z}))<=1);
 }
});
test('river is diagonal through near terrain; city street reaches the foreground',async()=>{
 const {composeHomeWorld,createHomeNavigation}=await import('../home-world.mjs');
 const river=composeHomeWorld(M,'river_lake');assert.notEqual(river.world.terrain.pts[0][1],river.world.terrain.pts.at(-1)[1]);
 const city=composeHomeWorld(M,'city');assert.ok(city.world.segments.some(s=>['road','distant-road'].includes(s.surface)&&Math.min(s.a.z,s.b.z)<100));
 const nav=createHomeNavigation(M,city,{width:390,height:844,anchorY:420});
 for(const s of city.world.segments.filter(s=>['road','distant-road'].includes(s.surface)))assert.equal(nav.valid(nav.project(s.a)),false);
});
test('terrain seating occurs when navigation finishes loading, without reseating an established actor',()=>{
 const {createModel}=require('../home-diorama-model.js'),m=createModel({random:()=>.5});
 const list=[{key:'pet:a',kind:'pet',id:'a',x:160,y:150,w:40,h:50},{key:'companion:b',kind:'companion',id:'b',x:70,y:150,w:25,h:30}];
 const s={region:'forest',width:390,height:300,groundTop:24};m.sync(list,s);
 const nav={valid:()=>true,nearest:p=>p,project:p=>p,unproject:p=>p,initialPoint:i=>i?{x:90,y:90}:{x:200,y:220}};
 m.sync(list,{...s,navigation:nav});assert.equal(m.snapshot()[0].y,220);assert.equal(m.snapshot()[1].y,90);
 m.sync(list,{...s,navigation:nav});assert.equal(m.snapshot()[0].y,220);
});

test('diagonal bridge stretching preserves each formal part transverse offset',async()=>{
 const {composeHomeWorld}=await import('../home-world.mjs');
 const composed=composeHomeWorld(M,'river_lake'),bridge=composed.objects.find(o=>o.type==='bridge');
 const original=M.worldObjects3d(M.buildWorld('river_lake',M.buildRegistry(),{world3d:true})).objects.find(o=>o.id===bridge.sourceId);
 const before=original.parts.find(p=>p.len).ang,after=bridge.parts.find(p=>p.len).ang;
 bridge.parts.forEach((p,i)=>{const q=original.parts[i];assert.ok(Math.abs((p.dx||0)*Math.cos(after)-(p.dz||0)*Math.sin(after)-((q.dx||0)*Math.cos(before)-(q.dz||0)*Math.sin(before)))<1e-6);});
});

test('crowded resize keeps world depth instead of restoring the legacy horizontal layout',()=>{
 const {createModel}=require('../home-diorama-model.js'),m=createModel({random:()=>.5});
 const list=Array.from({length:6},(_,i)=>({key:i?'companion:'+i:'pet:a',kind:i?'companion':'pet',x:40+i*55,y:160,w:20,h:25}));
 const nav={valid:()=>true,nearest:p=>p,project:p=>p,unproject:p=>p,initialPoint:i=>({x:40+i*55,y:i%2?100:230})};
 m.sync(list,{region:'forest',width:390,height:300,groundTop:24,navigation:nav});
 const before=m.snapshot().map(a=>[a.x,a.y]);m.sync(list,{region:'forest',width:430,height:300,groundTop:24,navigation:{...nav}});
 assert.deepEqual(m.snapshot().map(a=>[a.x,a.y]),before);
});
test('routes avoid resident and occlusion predicates along the whole path, not only destination',async()=>{
 const {createTerrainNavigation}=await import('../home-terrain-navigation.mjs');
 const nav=createTerrainNavigation({width:100,height:100,project:p=>p,unproject:p=>({...p,z:0}),walkable:()=>true,cell:10});
 const clear=p=>p.x<40||p.x>60||p.y>75;
 const path=nav.route({x:10,y:40},{x:90,y:40},{left:0,right:100,top:0,bottom:100},clear);assert.ok(path.length);
 let from={x:10,y:40};for(const to of path){for(let i=0;i<=100;i++)assert.ok(clear({x:from.x+(to.x-from.x)*i/100,y:from.y+(to.y-from.y)*i/100}));from=to;}
});
test('crowded fallback overlap can escape without worsening separation',async()=>{
 const {createTerrainNavigation}=await import('../home-terrain-navigation.mjs'),{createModel}=require('../home-diorama-model.js');
 const nav=createTerrainNavigation({width:150,height:120,project:p=>p,unproject:p=>({...p,z:0}),walkable:p=>Math.abs(p.y-50)<.1&&p.x>=40&&p.x<=120,cell:12}),m=createModel({random:()=>.5});
 m.sync([{key:'pet:a',id:'a',kind:'pet',x:50,y:50,w:20,h:20},{key:'companion:b',id:'b',kind:'companion',x:58,y:50,w:20,h:20}],{region:'forest',width:150,height:120,groundTop:24,navigation:nav});
 assert.equal(m.move('companion:b',{x:110,y:50}),true);let previous=8;
 for(let i=0;i<30;i++){m.step(.1,{autonomy:false});const [a,b]=m.snapshot(),distance=Math.hypot(b.x-a.x,b.y-a.y);assert.ok(distance>=previous);previous=distance;}
 assert.equal(m.snapshot()[1].x,110);
});
