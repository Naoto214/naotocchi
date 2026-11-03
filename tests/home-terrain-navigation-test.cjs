const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/runtime-harness.cjs');
const M=harness({deterministic:true}).api.meguruMod;
test('Home removes dedicated plaza pads and rebuilds canonical collision grid',async()=>{
 const {composeHomeWorld}=await import('../home-world.mjs');
 for(const r of ['forest','river_lake','city']){const c=composeHomeWorld(M,r);assert.equal(c.world.spots.length,0);for(const o of c.world.obstacles)assert.ok(M.collidesAt(c.world,o.x,o.z,8));}
});
test('terrain navigation routes around a solid, rejects water and cannot cut corners',async()=>{
 const api=await import('../home-world.mjs');assert.equal(typeof api.createTerrainNavigation,'function');
 const blocked=(x,z)=>x>43&&x<57&&z<76;
 const nav=api.createTerrainNavigation({width:110,height:110,project:p=>({x:p.x,y:p.z}),unproject:p=>({x:p.x,z:p.y,y:0}),walkable:p=>!blocked(p.x,p.z)&&p.z<100,cell:5});
 const limits={left:5,right:100,top:5,bottom:95};const path=nav.route({x:20,y:20},{x:80,y:20},limits);
 assert.ok(path.length>2);let prev={x:20,y:20};for(const p of path){assert.ok(nav.segmentSafe(prev,p));prev=p;}assert.ok(path.some(p=>p.y>=76));assert.equal(nav.valid({x:20,y:105}),false);
});
test('real terrain projection roundtrips and water/road remain unavailable',async()=>{
 const api=await import('../home-world.mjs');assert.equal(typeof api.createHomeNavigation,'function');
 for(const region of ['forest','river_lake','city']){
  const c=api.composeHomeWorld(M,region),n=api.createHomeNavigation(M,c,{width:390,height:844,anchorY:420});
  for(const p of [{x:0,z:100},{x:80,z:600},{x:-140,z:800}]){const s=n.project(p),q=n.unproject(s);assert.ok(Math.hypot(p.x-q.x,p.z-q.z)<1);assert.ok(Number.isFinite(q.y));}
  if(region==='river_lake')assert.equal(n.valid(n.project({x:0,z:1650})),false);
  if(region==='city')assert.equal(n.valid(n.project({x:0,z:1400})),false);
 }
});
test('model follows routed waypoints and cancels the entire path on care',()=>{
 const model=require('../home-diorama-model.js').createModel({random:()=>.4});
 const nav={nearest:p=>p,valid:()=>true,segmentSafe:(a,b)=>!(a.x<150&&b.x>150&&b.y<170),route:()=>[{x:100,y:200},{x:210,y:200},{x:210,y:130}]};
 model.sync([{key:'pet:a',kind:'pet',id:'a',x:100,y:130,w:30,h:40}],{region:'forest',width:350,height:340,groundTop:100,navigation:nav});
 model.move('pet:a',{x:210,y:130});assert.equal(model.snapshot()[0].target.y,200);
 for(let i=0;i<300;i++)model.step(.1,{autonomy:false});assert.ok(model.snapshot()[0].x>150);model.cancel();assert.equal(model.snapshot()[0].route.length,0);
});
test('occlusion uses actual projected triangles only in front of the illustration',async()=>{
 const THREE=await import('../vendor/three-0.170.0/three.module.min.js'),api=await import('../home-terrain-navigation.mjs');assert.equal(typeof api.projectHomeOcclusion,'function');
 const camera=new THREE.PerspectiveCamera(46,1,1,1000);camera.position.set(0,0,10);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const geometry=new THREE.BoxGeometry(2,2,2),matrix=new THREE.Matrix4().makeTranslation(0,0,5),back=new THREE.Matrix4().makeTranslation(0,0,-5);
 assert.ok(api.projectHomeOcclusion(camera,100,100,[{geometry,matrix}],{x:0,y:0,z:0}).length>0);
 assert.equal(api.projectHomeOcclusion(camera,100,100,[{geometry,matrix:back}],{x:0,y:0,z:0}).length,0);
});
test('UI reflow preserves a settled actor world position instead of recentering',()=>{
 const m=require('../home-diorama-model.js').createModel();const make=offset=>({valid:()=>true,nearest:p=>p,project:p=>({x:p.x,y:p.z-offset}),unproject:p=>({x:p.x,z:p.y+offset,y:0}),route:(a,p)=>[p],segmentSafe:()=>true});
 const a={key:'pet:a',kind:'pet',id:'a',x:120,y:180,w:30,h:40};const scene={region:'forest',width:350,height:350,groundTop:60,navigation:make(0)};m.sync([a],scene);m.move(a.key,{x:230,y:210});for(let i=0;i<100;i++)m.step(.1,{autonomy:false});const before=m.snapshot()[0];m.sync([a],{...scene,navigation:make(20)});const after=m.snapshot()[0];assert.ok(Math.abs(before.x-after.x)<.01);assert.ok(Math.abs(before.y-after.y-20)<.01);
});
test('all phone widths expose safe terrain beyond former foreground pad and reachable solids',async()=>{
 const {composeHomeWorld,createHomeNavigation}=await import('../home-world.mjs');
 for(const width of [320,375,390,430])for(const region of ['forest','river_lake','city']){
  const stageWidth=width-32,stageHeight=340,floor=stageHeight-54,anchorY=183+floor*.8,c=composeHomeWorld(M,region),n=createHomeNavigation(M,c,{width,height:844,anchorY,offsetX:16,offsetY:183,stageWidth,stageHeight});
  const b={left:85,right:stageWidth-85,top:164,bottom:floor};let outer=0;
  for(let y=b.top;y<=b.bottom;y+=8)for(let x=b.left;x<=b.right;x+=8){const p={x,y},q=n.unproject(p);if(n.valid(p)&&Math.hypot(q.x,q.z)>650)outer++;}
  assert.ok(outer>10,`${region} ${width}: outside former front pad`);
  if(region!=='city'){const o=c.objects.find(o=>o.type===(region==='forest'?'log':'rock')&&o.z<800);assert.ok(o,'reachable official solid');const p=n.project(o);assert.ok(p.y>b.top&&p.y<b.bottom);assert.equal(n.valid(p),false);}
 }
});
