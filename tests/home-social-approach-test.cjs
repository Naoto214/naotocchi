const test=require('node:test'),assert=require('node:assert/strict');
const {createModel}=require('../home-production-model.js');
async function runPair(sizes,{kind='companion',blocked=false,routed=false}={}){
 const events=[],scene={region:'home',time:'day',width:800,height:600,groundTop:20};
 if(blocked)scene.visible=(p,a)=>Math.abs(p.x-(a.kind==='pet'?200:500))<1&&Math.abs(p.y-300)<1;
 if(routed){const {createTerrainNavigation}=await import('../home-route-navigation.mjs');scene.navigation=createTerrainNavigation({width:800,height:600,project:p=>p,unproject:p=>({...p,z:0}),walkable:()=>true,cell:12});}
 let model;model=createModel({random:()=>.93,onEvent:e=>{if(['social','arrive','move'].includes(e.type))events.push({event:e,actors:model.snapshot()});}});
 const [w,h,bw,bh]=sizes;
 model.sync([{key:'pet:dog',kind:'pet',id:'dog',x:200,y:300,w,h},{key:kind+':friend',kind,id:'friend',x:500,y:300,w:bw,h:bh}],scene);
 let minimum=Infinity;
 for(let i=0;i<1800;i++){
  const before=model.snapshot();model.step(.1);const [a,b]=model.snapshot();
  minimum=Math.min(minimum,Math.hypot((a.x-b.x)/((w+bw)*.5+10),(a.y-b.y)/((h+bh)*.38+10)));
  for(const c of [a,b]){const old=before.find(p=>p.key===c.key);assert.ok(Math.hypot(c.x-old.x,c.y-old.y)<=4.201,'normal walking, no teleport');}
 }
 return {events,minimum,model};
}
for(const [name,sizes,options] of [
 ['observed dog and shiba',[84.85125,50.139375,81.675,74.86875],{}],
 ['wide residents needing a non-lateral meeting',[180,100,90,80],{routed:true}],
 ['partner approach',[84.85125,50.139375,81.675,74.86875],{kind:'partner'}]
])test(name+' can meet inside the unchanged conversation radius without contact',async()=>{
 const {events,minimum}=await runPair(sizes,options),social=events.filter(x=>x.event.type==='social');
 assert.ok(social.length,'a completed real approach starts social');assert.ok(minimum>=1-1e-8,'unchanged foot ellipses remain separated');
 assert.ok(events.some(x=>x.event.type==='move'&&x.event.source==='ambient'));
 for(const x of social){const a=x.actors.find(a=>a.key===x.event.actor.key),b=x.actors.find(a=>a.key===x.event.listener.key);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<100);assert.equal(b.target,null,'listener has stopped');assert.ok(['approach','together'].includes(a.after));}
});
test('no safe meeting position never relaxes collisions or fabricates social',async()=>{
 for(const options of [{},{blocked:true}]){const {events,minimum}=await runPair([220,180,220,180],options);assert.equal(events.filter(x=>x.event.type==='social').length,0);assert.ok(minimum>=1-1e-8);}
});
test('a held or manually controlled listener is never forced into an autonomous exchange',()=>{
 for(const held of [true,false]){
  const events=[],m=createModel({random:()=>.93,onEvent:e=>events.push(e)}),key='companion:friend';
  m.sync([{key:'pet:dog',kind:'pet',id:'dog',x:150,y:200,w:85,h:50},{key,kind:'companion',id:'friend',x:360,y:200,w:82,h:75}],{region:'home',time:'day',width:600,height:400,groundTop:20});
  for(let i=0;i<600;i++){if(!held&&i%40===0)m.select(key);m.step(.1,held?{heldActor:key}:{});}
  assert.equal(events.filter(e=>e.type==='social').length,0);assert.ok(events.some(e=>e.type==='move'&&e.source==='ambient'));
 }
});
