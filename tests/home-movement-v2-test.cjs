const {test}=require('node:test'),assert=require('node:assert/strict');
const setup=async()=>{const {createTerrainNavigation}=await import('../home-route-navigation.mjs');return createTerrainNavigation({width:300,height:400,cell:8,gridOrigin:{x:0,y:0},project:p=>p,unproject:p=>({...p,z:p.y}),walkable:p=>p.x>=20&&p.z>=20});};
test('explicit terrain grid origin does not move when walking bounds change',async()=>{
 const nav=await setup(),a={left:3,right:100,top:5,bottom:100},b={left:1,right:110,top:2,bottom:110};
 const accept=p=>p.x>=30&&p.y>=30;
 assert.deepEqual(nav.nearest({x:25,y:25},a,accept),nav.nearest({x:25,y:25},b,accept));
});
test('stable nearest selection uses original input, not a moving clamp as its distance origin',async()=>{
 const nav=await setup(),allowed=p=>(p.x===32&&p.y===80)||(p.x===56&&p.y===32);
 const a=nav.nearest({x:-100,y:40},{left:3,right:100,top:5,bottom:100},allowed);
 assert.deepEqual(a,{x:32,y:80});
});
test('default navigation retains legacy grid compatibility',async()=>{
 const {createTerrainNavigation}=await import('../home-route-navigation.mjs');const nav=createTerrainNavigation({width:100,height:100,cell:8,project:p=>p,unproject:p=>({...p,z:p.y}),walkable:()=>true});
 assert.deepEqual(nav.nearest({x:0,y:0},{left:3,right:100,top:5,bottom:100},p=>p.x>20&&p.y>20),{x:27,y:21});
});
test('a safe reference destination is retained when a new candidate retreats along the requested direction',()=>{
 const {createModel}=require('../home-production-model.js');const model=createModel();const box={left:0,right:100,top:0,bottom:100};
 const navigation={rawDestination:true,nearest:(p,_bounds,predicate)=>predicate?{x:40,y:60}:p,referenceNearest:()=>({x:30,y:60}),valid:()=>true,route:(_a,p)=>[p],referenceRoute:(_a,p)=>[p],project:p=>p,unproject:p=>p,segmentSafe:()=>true};
 model.sync([{key:'pet:x',kind:'pet',x:70,y:70,w:10,h:10}],{width:100,height:100,region:'city',navigation,actorBounds:()=>box,referenceBounds:()=>box});
 assert.ok(model.move('pet:x',{x:-20,y:60},'drag'));assert.equal(model.snapshot()[0].target.x,30);
});
test('an unreachable newly nearest point keeps the safe original route without relaxing collision checks',()=>{
 const {createModel}=require('../home-production-model.js');const model=createModel(),box={left:0,right:100,top:0,bottom:100};
 const navigation={rawDestination:true,nearest:(p,_bounds,predicate)=>predicate?{x:20,y:60}:p,referenceNearest:()=>({x:30,y:60}),valid:()=>true,route:()=>[],referenceRoute:(_a,p,_b,predicate)=>predicate(p)?[p]:[],project:p=>p,unproject:p=>p,segmentSafe:()=>true};
 model.sync([{key:'pet:x',kind:'pet',x:70,y:70,w:10,h:10}],{width:100,height:100,region:'city',navigation,actorBounds:()=>box,referenceBounds:()=>box});
 assert.ok(model.move('pet:x',{x:-20,y:60},'drag'));assert.equal(model.snapshot()[0].target.x,30);
});
test('legacy compatibility never restores an endpoint outside the new painted-safe bounds',()=>{
 const {createModel}=require('../home-production-model.js');const model=createModel(),safe={left:35,right:100,top:0,bottom:100};
 const navigation={rawDestination:true,nearest:(p,_bounds,predicate)=>predicate?{x:40,y:60}:p,referenceNearest:()=>({x:30,y:60}),valid:()=>true,route:(_a,p)=>[p],referenceRoute:()=>{throw Error('unsafe reference used');},project:p=>p,unproject:p=>p,segmentSafe:()=>true};
 model.sync([{key:'pet:x',kind:'pet',x:70,y:70,w:10,h:10}],{width:100,height:100,region:'city',navigation,actorBounds:()=>safe,referenceBounds:()=>({...safe,left:0})});
 assert.ok(model.move('pet:x',{x:-20,y:60},'ambient'));assert.equal(model.snapshot()[0].target.x,40);
});
test('a safe narrow passage on the stable grid remains usable when the legacy grid misses it',async()=>{
 const {createTerrainNavigation}=await import('../home-route-navigation.mjs'),{createModel}=require('../home-production-model.js');
 const nav=createTerrainNavigation({width:80,height:80,cell:8,gridOrigin:{x:0,y:0},project:p=>p,unproject:p=>({...p,z:p.y}),walkable:p=>Math.abs(p.x-40)<=1&&p.z>=8&&p.z<=40||Math.abs(p.z-40)<=1&&p.x>=8&&p.x<=40});
 const box={left:1,right:80,top:1,bottom:80},reference={...box,left:3,top:3},from={x:40,y:8},to={x:8,y:40};
 assert.ok(nav.route(from,to,box).length);assert.deepEqual(nav.referenceRoute(from,to,reference),[]);
 const model=createModel();model.sync([{key:'pet:x',kind:'pet',...from,w:2,h:2}],{region:'city',width:80,height:80,navigation:nav,actorBounds:()=>box,referenceBounds:()=>reference});
 assert.ok(model.move('pet:x',to,'drag'));for(let i=0;i<100;i++)model.step(.05,{autonomy:false});const a=model.snapshot()[0];assert.ok(Math.hypot(a.x-to.x,a.y-to.y)<.5);
});
test('an unreachable preferred reference does not hide a reachable new candidate',()=>{
 const {createModel}=require('../home-production-model.js');const box={left:0,right:100,top:0,bottom:100},model=createModel();
 const navigation={rawDestination:true,nearest:(p,_b,predicate)=>predicate?{x:20,y:80}:p,referenceNearest:()=>({x:30,y:60}),valid:()=>true,route:(_a,p)=>p.x===20?[p]:[],referenceRoute:()=>[],project:p=>p,unproject:p=>p,segmentSafe:()=>true};
 model.sync([{key:'pet:x',kind:'pet',x:70,y:70,w:10,h:10}],{region:'city',width:100,height:100,navigation,actorBounds:()=>box,referenceBounds:()=>box});assert.ok(model.move('pet:x',{x:-20,y:60},'drag'));assert.equal(model.snapshot()[0].target.x,20);
});
test('default planner matches the pinned pre-V2 navigator across bounded obstacle routes',async()=>{
 const oldSource=require('node:child_process').execFileSync('git',['show','6ab53fc23747fc1982089939206c1b6087643953:home-route-navigation.mjs'],{encoding:'utf8'});
 const old=await import('data:text/javascript;base64,'+Buffer.from(oldSource).toString('base64')),current=await import('../home-route-navigation.mjs');
 for(const cell of [8,12])for(const top of [0,3]){
  const opts={width:96,height:96,cell,project:p=>p,unproject:p=>({...p,z:p.y}),walkable:p=>p.x>=0&&p.x<=96&&p.z>=0&&p.z<=96&&!(p.x>35&&p.x<55&&p.z<70)};
  const a=old.createTerrainNavigation(opts),b=current.createTerrainNavigation(opts),bounds={left:top,right:96,top,bottom:96};
  for(const p of [{x:-20,y:30},{x:40,y:20},{x:90,y:10},{x:50,y:80},{x:103,y:103}]){
   assert.deepEqual(b.nearest(p,bounds),a.nearest(p,bounds));assert.deepEqual(b.route({x:20,y:80},p,bounds),a.route({x:20,y:80},p,bounds));
  }
 }
});
test('retain a VERSION 1 endpoint too when it advances both requested components beyond the original',()=>{
 const {createModel}=require('../home-production-model.js'),model=createModel(),safe={left:0,right:100,top:0,bottom:100},old={...safe,left:10};
 const nav={rawDestination:true,nearest:(p,_b,predicate)=>predicate?{x:28,y:58}:p,referenceNearest:(_p,b)=>b.left===10?{x:30,y:60}:{x:25,y:55},referenceRoute:(_a,p)=>[p],route:(_a,p)=>[p],valid:()=>true,segmentSafe:()=>true,project:p=>p,unproject:p=>p};
 model.sync([{key:'pet:x',kind:'pet',x:70,y:70,w:10,h:10}],{region:'city',width:100,height:100,navigation:nav,actorBounds:()=>safe,referenceBounds:()=>old});assert.ok(model.move('pet:x',{x:-20,y:20},'drag'));assert.deepEqual(model.snapshot()[0].target,{x:25,y:55});
});
