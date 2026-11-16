const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createModel}=require('../home-production-model.js');
const key='partner:gentle_gorilla';
const from={x:153.94147338023794,y:181.32168180045804};
const original={x:157.53846153846155,y:183.1153846153846};
const expanded={x:129.00094136802483,y:285.0004106189207};
const proposal={x:128.0105241445568,y:163.24967808765015};
const requested={x:-125.3093927415934,y:378.2480871905709};
const safe={left:-40,right:350,top:80,bottom:400},old={...safe,left:50};
const same=(a,b)=>a.x===b.x&&a.y===b.y;
function fixture({intentAware=true,originalReachable=true,supplemental=null,onNavigation=()=>{}}={}){
 const model=createModel({random:()=>.5});
 const nav={rawDestination:true,intentAware,intentScale:{x:.6342010144285222,y:1.2814324050630237},
  nearest:(p,_b,predicate)=>predicate?proposal:p,
  referenceNearest:(_p,b,predicate)=>{const q=b.left===old.left?original:expanded;return predicate(q)?q:null;},
  referenceRoute:(_a,p,_b,free)=>originalReachable&&same(p,original)&&free(p)?[p]:[],
  route:(_a,p,_b,free)=>free(p)&&(same(p,proposal)||originalReachable&&same(p,original))?[p]:[],
  reachable:(_a,_p,_b,free,accept)=>supplemental&&free(supplemental)&&accept(supplemental)?[supplemental]:[],
  valid:()=>true,segmentSafe:()=>true,project:p=>p,unproject:p=>p,
 };
 model.sync([{key,kind:'partner',...from,w:20,h:20}],{width:400,height:500,region:'city',navigation:nav,actorBounds:()=>safe,referenceBounds:()=>old});
 onNavigation(nav);return model;
}

test('V5 diagonal down intent uses screen metric and reaches the existing safe downward reference',()=>{
 const m=fixture();assert.ok(m.move(key,requested,'drag'));assert.deepEqual(m.snapshot()[0].target,original);
 for(let i=0;i<20;i++)m.step(.05,{autonomy:false});assert.ok(m.snapshot()[0].y>=original.y-.5);
});
test('non-V5 navigation retains the pinned fallback policy',()=>{
 const m=fixture({intentAware:false});assert.ok(m.move(key,requested,'drag'));assert.deepEqual(m.snapshot()[0].target,proposal);
});
test('V5 stays put when every available route ends opposite the requested screen direction',()=>{
 const m=fixture({originalReachable:false});assert.equal(m.move(key,requested,'drag'),false);assert.equal(m.snapshot()[0].target,null);assert.deepEqual({x:m.snapshot()[0].x,y:m.snapshot()[0].y},from);
});
test('a new reachable forward endpoint is preferred to an opposite fallback',()=>{
 const forward={x:120,y:220},m=fixture({supplemental:forward});assert.ok(m.move(key,requested,'drag'));assert.deepEqual(m.snapshot()[0].target,forward);
});
test('ambient routing uses the same forward-intent guard',()=>{
 const m=fixture({originalReachable:false});assert.equal(m.move(key,requested,'ambient'),false);assert.equal(m.snapshot()[0].target,null);
});

test('a temporarily blocked manual request retries after the blocker moves without weakening contacts',async()=>{
 const {createTerrainNavigation}=await import('../home-route-navigation.mjs');
 const n=createTerrainNavigation({width:120,height:100,cell:8,gridOrigin:{x:0,y:0},project:p=>p,unproject:p=>({...p,z:0}),walkable:p=>p.y>=40&&p.y<=60});
 const m=createModel({random:()=>.5}),box={left:5,right:115,top:40,bottom:60};n.intentAware=true;n.intentScale={x:1,y:1};
 m.sync([{key:'pet:x',kind:'pet',x:20,y:50,w:10,h:10},{key:'companion:blocker',kind:'companion',x:50,y:50,w:10,h:10}],{width:120,height:100,region:'city',navigation:n,actorBounds:()=>box});
 // The blocker closes the narrow lane; a request may reach the near side first.
 m.move('pet:x',{x:110,y:50},'drag');for(let i=0;i<20;i++)m.step(.05,{autonomy:false});
 assert.ok(m.move('companion:blocker',{x:110,y:50},'drag'));
 let minimum=Infinity;for(let i=0;i<160;i++){m.step(.05,{autonomy:false});const [a,b]=m.snapshot();minimum=Math.min(minimum,Math.hypot((a.x-b.x)/20,(a.y-b.y)/17.6));}
 assert.ok(minimum>=1-1e-6,'strict contact separation throughout replanning');assert.ok(m.snapshot()[0].x>60,'the original manual intention resumes when the lane opens');
});

for(const action of ['cancel','select'])test(`a ${action} ends a queued manual intention`,()=>{
 let nav;const m=fixture({originalReachable:false,onNavigation:n=>nav=n});
 assert.equal(m.move(key,requested,'drag'),false);
 if(action==='cancel')m.cancel();else m.select(key);
 nav.referenceRoute=(_a,p,_b,free)=>same(p,original)&&free(p)?[p]:[];
 for(let i=0;i<80;i++)m.step(.05,{autonomy:false});
 assert.deepEqual({x:m.snapshot()[0].x,y:m.snapshot()[0].y},from);
});
test('a persistently blocked manual intention expires rather than moving much later',()=>{
 let nav;const m=fixture({originalReachable:false,onNavigation:n=>nav=n});
 assert.equal(m.move(key,requested,'drag'),false);
 for(let i=0;i<260;i++)m.step(.05,{autonomy:false});
 nav.referenceRoute=(_a,p,_b,free)=>same(p,original)&&free(p)?[p]:[];
 for(let i=0;i<80;i++)m.step(.05,{autonomy:false});
 assert.deepEqual({x:m.snapshot()[0].x,y:m.snapshot()[0].y},from);
});

function bareFixture(navigation){
 const m=createModel({random:()=>.5}),box={left:0,right:100,top:0,bottom:100};
 m.sync([{key:'pet:x',kind:'pet',x:70,y:70,w:2,h:2}],{width:100,height:100,region:'city',navigation,actorBounds:()=>box});return m;
}
const plainNav=point=>({rawDestination:true,nearest:(p,_b,accept)=>accept?point:p,valid:()=>true,route:(_a,p,_b,accept)=>accept(p)?[p]:[],segmentSafe:()=>true,project:p=>p,unproject:p=>p});
test('the complete V4 supplemental endpoint survives a newly closer but component-retreating proposal',()=>{
 const legacy={...plainNav({x:30,y:60}),reachable:(_a,_p,_b,free,accept)=>free({x:24,y:56})&&accept({x:24,y:56})?[{x:24,y:56}]:[]};
 const n={...plainNav({x:28,y:40}),layoutNavigation:legacy,intentAware:true,intentScale:{x:1,y:1},reachable:()=>[]},m=bareFixture(n);
 assert.ok(m.move('pet:x',{x:0,y:0},'drag'));assert.deepEqual(m.snapshot()[0].target,{x:24,y:56});
});
test('a new endpoint that improves both requested components still replaces the V4 plan',()=>{
 const legacy=plainNav({x:30,y:60}),n={...plainNav({x:20,y:40}),layoutNavigation:legacy,intentAware:true,intentScale:{x:1,y:1},reachable:()=>[]},m=bareFixture(n);
 assert.ok(m.move('pet:x',{x:0,y:0},'drag'));assert.deepEqual(m.snapshot()[0].target,{x:20,y:40});
});
test('a retained V4 endpoint uses a new safe detour when its old shortcut crosses a terrain gap',()=>{
 const goal={x:24,y:56},waypoint={x:65,y:20},legacy=plainNav(goal);
 const n={...plainNav({x:28,y:40}),layoutNavigation:legacy,intentAware:true,intentScale:{x:1,y:1},reachable:()=>[],
  segmentSafe:(a,b)=>!same(b,goal)||same(a,waypoint),route:(_a,p)=>same(p,goal)?[waypoint,goal]:[p]};
 const m=bareFixture(n);assert.ok(m.move('pet:x',{x:0,y:0},'drag'));
 assert.deepEqual(m.snapshot()[0].target,waypoint);assert.deepEqual(m.snapshot()[0].route,[goal]);
});
test('a forward diagonal endpoint is not rejected by a nearly tied primary-axis classification',()=>{
 const n={...plainNav({x:72,y:30}),intentAware:true,intentScale:{x:1,y:1},reachable:()=>[]},m=bareFixture(n);
 assert.ok(m.move('pet:x',{x:0,y:5},'drag'));assert.deepEqual(m.snapshot()[0].target,{x:72,y:30});
});
test('retries never trade away the first accepted endpoint component',()=>{
 let goal={x:30,y:40};const n={...plainNav(goal),intentAware:true,intentScale:{x:1,y:1},reachable:()=>[]};n.nearest=(p,_b,accept)=>accept?goal:p;
 const m=bareFixture(n);assert.ok(m.move('pet:x',{x:0,y:0},'drag'));for(let i=0;i<35;i++)m.step(.05,{autonomy:false});
 goal={x:35,y:20};for(let i=0;i<100;i++)m.step(.05,{autonomy:false});assert.ok(m.snapshot()[0].x<=30.5,'retry may not sacrifice already achieved leftward progress');
});
