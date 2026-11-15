const test=require('node:test'),assert=require('node:assert/strict');
async function setup(region='city'){
 const {createTerrainNavigation}=await import('../home-route-navigation.mjs'),{extendVisibleGroundNavigation}=await import('../home-visible-ground-navigation.mjs');
 const legacy={...createTerrainNavigation({width:300,height:400,cell:8,gridOrigin:{x:0,y:0},project:p=>({x:p.x*300,y:p.z*400}),unproject:p=>({x:p.x/300,z:p.y/400,y:0}),walkable:p=>p.x>=.4&&p.x<=.6&&p.z>=.3&&p.z<=.8}),depthScale:p=>.8+p.y/2000};
 const spec={region,ground:[[.05,.45],[.95,.45],[.95,.9],[.05,.9]],exclude:[[[.7,.5],[.8,.5],[.8,.6],[.7,.6]]]};
 return {legacy,next:extendVisibleGroundNavigation(legacy,{spec,stage:{left:0,top:0},presentation:{x:0,y:0,scaleX:1,scaleY:1},cover:{left:0,top:0,width:300,height:400}})};
}
test('visible ground adds reachable left paving without moving legacy camera/depth',async()=>{const {legacy,next}=await setup();assert.equal(legacy.valid({x:40,y:250}),false);assert.equal(next.valid({x:40,y:250}),true);assert.equal(next.layoutNavigation,legacy);assert.equal(next.depthScale({x:40,y:250}),legacy.depthScale({x:40,y:250}));const route=next.route({x:150,y:250},{x:40,y:250},{left:10,right:290,top:100,bottom:350});assert.ok(route.length);assert.deepEqual(route.at(-1),{x:40,y:250});});
test('additional ground excludes painted obstacles and upper forest/jungle spurs',async()=>{for(const region of ['city','forest','jungle']){const {next}=await setup(region);assert.equal(next.valid({x:225,y:220}),false);assert.equal(next.valid({x:40,y:130}),false);assert.equal(next.valid({x:40,y:250}),true);if(region!=='city')assert.equal(next.valid({x:40,y:200}),false);}});
test('all safe legacy points and segments remain available',async()=>{const {legacy,next}=await setup();for(let y=100;y<=350;y+=5)for(let x=0;x<300;x+=5){const p={x,y};if(legacy.valid(p))assert.ok(next.valid(p));}assert.ok(next.segmentSafe({x:130,y:130},{x:170,y:300}));});
test('union routes still respect collision predicates and cannot jump exclusions',async()=>{const {next}=await setup();const safe=p=>p.x<195||p.x>205;assert.equal(next.route({x:150,y:250},{x:260,y:250},{left:10,right:290,top:100,bottom:350},safe).length,0);});
test('invalid camera geometry falls back to legacy navigation',async()=>{const {legacy}=await setup(),{extendVisibleGroundNavigation}=await import('../home-visible-ground-navigation.mjs');assert.equal(extendVisibleGroundNavigation(legacy,{spec:{region:'city'},presentation:{scaleX:0,scaleY:1}}),legacy);});

async function thinGap(){
 const {createTerrainNavigation}=await import('../home-route-navigation.mjs'),{insidePolygon}=await import('../home-art-navigation.mjs'),{extendVisibleGroundNavigation}=await import('../home-visible-ground-navigation.mjs');
 const spec={region:'city',ground:[[0,0],[1,0],[1,1],[0,1]],exclude:[[[.501,.2],[.502,.2],[.502,.8],[.501,.8]]]};
 const legacy=createTerrainNavigation({width:100,height:100,cell:8,gridOrigin:{x:0,y:0},project:p=>({x:p.x*100,y:p.z*100}),unproject:p=>({x:p.x/100,z:p.y/100,y:0}),walkable:p=>insidePolygon(p.x,p.z,spec.ground)&&!spec.exclude.some(poly=>insidePolygon(p.x,p.z,poly))});
 return {legacy,next:extendVisibleGroundNavigation(legacy,{spec,stage:{left:0,top:0},presentation:{x:0,y:0,scaleX:1,scaleY:1},cover:{left:0,top:0,width:100,height:100}})};
}
test('exact union guard detects subpixel terrain gaps missed by the old 3px samples',async()=>{
 const {legacy,next}=await thinGap(),a={x:40,y:60},b={x:70,y:60};
 assert.equal(legacy.segmentSafe(a,b),true,'reproduce the old sampling miss');
 assert.equal(next.valid({x:50.15,y:60}),false);
 assert.equal(next.segmentSafe(a,b),false);
});
test('unsafe legacy shortcuts are replaced with a complete safe detour to the same endpoint',async()=>{
 const {next}=await thinGap(),start={x:40,y:60},end={x:70,y:60},bounds={left:8,right:92,top:8,bottom:92};
 for(const method of ['route','referenceRoute']){
  const path=next[method](start,end,bounds);assert.ok(path.length>1,method+' must detour');assert.deepEqual(path.at(-1),end);
  let from=start;for(const to of path){for(let i=0;i<=1000;i++){const q={x:from.x+(to.x-from.x)*i/1000,y:from.y+(to.y-from.y)*i/1000};assert.ok(next.valid(q),method+' enters an excluded sliver');}from=to;}
 }
});
test('terrain navigation accepts an optional exact segment guard without changing old callers',async()=>{
 const {createTerrainNavigation}=await import('../home-route-navigation.mjs');
 const options={width:100,height:100,project:p=>p,unproject:p=>({...p,z:p.y}),walkable:()=>true};
 const start={x:1,y:1},end={x:10,y:10};
 assert.equal(createTerrainNavigation(options).segmentSafe(start,end),true);
 assert.equal(createTerrainNavigation({...options,segmentWalkable:()=>false}).segmentSafe(start,end),false);
});
