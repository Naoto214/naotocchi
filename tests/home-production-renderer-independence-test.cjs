const {test}=require('node:test');
const assert=require('node:assert/strict');
test('all recovered regions and unknown regions use the recovered painting, never optional 3D',async()=>{
 const {createHomeWorld}=await import('../home-production-world.mjs');
 const {ART_SCENES,selectRecoveredScene}=await import('../home-production-manifest.mjs');
 assert.equal(selectRecoveredScene('unknown-region'),ART_SCENES.home);
 const rect={left:0,top:0,width:390,height:844},stage={left:16,top:170,width:358,height:374};
 const element=()=>({style:{},dataset:{},getContext:()=>({}),remove(){}});
 const world=createHomeWorld({container:{appendChild(){},getBoundingClientRect:()=>rect},document:{createElement:element,getElementById:()=>({getBoundingClientRect:()=>stage})},window:{Image:class{}}});
 // No Meguru model or renderer is supplied: every region must keep this path independent.
 for(const region of [...Object.keys(ART_SCENES),'unknown-region','home']){
  world.setEnvironment({region,time:'day'});
  assert.equal(world.stats().mode,'art-25d',region);
  assert.equal(world.stats().candidate,selectRecoveredScene(region).candidate,region);
  const nav=world.navigation(stage);assert.ok(nav,region);
  assert.ok(Array.isArray(world.observationPoints(nav)),region);
 }
 world.destroy();assert.equal(world.stats().destroyed,true);
});
