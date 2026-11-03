const {test}=require('node:test'),assert=require('node:assert/strict');
const {createModel}=require('../home-diorama-model.js');
test('real v22 crowd model retains 28 actors, safe feet, depth bands and protagonist escape',async()=>{
 const {ART_SCENES}=await import('../home-japan-manifest.mjs');const {createArtNavigation}=await import('../home-art-navigation.mjs');
 const fixture=require('./fixtures/home-v20-river-crowded.json');
 for(const width of [320,375,390,430])for(const region of ['home','forest','river_lake','city']){
  const w=width-32,h=374,nav=createArtNavigation(ART_SCENES[region],{width,height:844},{left:16,top:170,width:w,height:h});
  const list=fixture.map(a=>({...a,w:a.w*Math.min(1,w/343),h:a.h*Math.min(1,w/343),kind:a.key.split(':')[0],id:a.key.split(':')[1],extent:{top:a.h+12}}));
  const m=createModel({random:()=>.5});m.sync(list,{region,width:w,height:h,groundTop:24,navigation:nav});const actors=m.snapshot();assert.equal(actors.length,28);assert.ok(actors.every(a=>nav.valid(a)),region+' '+width+' safe');const a=actors[0],b=m.bounds(a);const targets=[{x:b.right,y:b.bottom-5},{x:b.left,y:b.bottom-5},{x:a.x+45,y:a.y},{x:a.x-45,y:a.y},{x:a.x,y:a.y+45},{x:a.x,y:a.y-45}];let escaped=false;for(const p of targets){m.cancel();const before=m.snapshot()[0];if(!m.move(a.key,p,'ground'))continue;for(let i=0;i<25;i++)m.step(.1,{autonomy:false});if(Math.hypot(m.snapshot()[0].x-before.x,m.snapshot()[0].y-before.y)>10){escaped=true;break;}}assert.ok(escaped,region+' '+width+' actual escape');assert.ok(m.snapshot().every(p=>nav.valid(p)));assert.ok(Math.max(...actors.map(p=>p.y))-Math.min(...actors.map(p=>p.y))>100);}
});
