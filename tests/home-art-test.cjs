const {test}=require('node:test'),assert=require('node:assert/strict');
const {createModel}=require('../home-diorama-model.js');
test('art transform preserves aspect and round trips at every phone width',async()=>{
 const {artTransform}=await import('../home-art-navigation.mjs');
 for(const width of [320,375,390,430]){const t=artTransform({width,height:844},{left:16,top:170,width:width-32,height:374});assert.equal(t.height/t.width,1.5);for(const p of [{x:.2,z:.4},{x:.8,z:.9}]){const q=t.unproject(t.project(p));assert.ok(Math.abs(q.x-p.x)<1e-9&&Math.abs(q.z-p.z)<1e-9);}}
});
test('three maps prohibit scenery and route around internal exclusions',async()=>{
 const {ART_SCENES}=await import('../home-art-manifest.mjs');const {createArtNavigation}=await import('../home-art-navigation.mjs');
 for(const r of ['forest','river_lake','city']){const nav=createArtNavigation(ART_SCENES[r],{width:390,height:844},{left:16,top:170,width:358,height:374});assert.equal(nav.valid(nav.project({x:.5,z:.1})),false);for(const p of ART_SCENES[r].blockedSamples)assert.equal(nav.valid(nav.project({x:p[0],z:p[1]})),false,r+JSON.stringify(p));const b={left:12,right:346,top:40,bottom:362};const a=nav.nearest(nav.project({x:.4,z:.65}),b),end=nav.nearest(nav.project({x:.65,z:.88}),b);assert.ok(a&&end);const route=nav.route(a,end,b);assert.ok(route.length,r);let from=a;for(const to of route){assert.ok(nav.segmentSafe(from,to));from=to;}}
});
test('real v22 crowd model retains 28 actors, safe feet, depth bands and protagonist escape',async()=>{
 const {ART_SCENES}=await import('../home-art-manifest.mjs');const {createArtNavigation}=await import('../home-art-navigation.mjs');
 const fixture=require('./fixtures/home-v20-river-crowded.json');
 for(const width of [320,375,390,430])for(const region of ['forest','river_lake','city']){
  const w=width-32,h=374,nav=createArtNavigation(ART_SCENES[region],{width,height:844},{left:16,top:170,width:w,height:h});
  const list=fixture.map(a=>({...a,w:a.w*Math.min(1,w/343),h:a.h*Math.min(1,w/343),kind:a.key.split(':')[0],id:a.key.split(':')[1],extent:{top:a.h+12}}));
  const m=createModel({random:()=>.5});m.sync(list,{region,width:w,height:h,groundTop:24,navigation:nav});const actors=m.snapshot();assert.equal(actors.length,28);assert.ok(actors.every(a=>nav.valid(a)),region+' '+width+' safe');const a=actors[0],b=m.bounds(a);const targets=[{x:b.right,y:b.bottom-5},{x:b.left,y:b.bottom-5},{x:a.x+45,y:a.y},{x:a.x-45,y:a.y},{x:a.x,y:a.y+45},{x:a.x,y:a.y-45}];let escaped=false;for(const p of targets){m.cancel();const before=m.snapshot()[0];if(!m.move(a.key,p,'ground'))continue;for(let i=0;i<25;i++)m.step(.1,{autonomy:false});if(Math.hypot(m.snapshot()[0].x-before.x,m.snapshot()[0].y-before.y)>10){escaped=true;break;}}assert.ok(escaped,region+' '+width+' actual escape');assert.ok(m.snapshot().every(p=>nav.valid(p)));assert.ok(Math.max(...actors.map(p=>p.y))-Math.min(...actors.map(p=>p.y))>100);}
});
test('renderer discards stale image callbacks and freezes decorative time',async()=>{
 const {createHomeWorld}=await import('../home-art-world.mjs');const images=[];const ctx=new Proxy({},{get:(o,k)=>o[k]||(o[k]=()=>({addColorStop(){}})),set:(o,k,v)=>(o[k]=v,true)});const rect={left:0,top:0,width:390,height:844};const stage={getBoundingClientRect:()=>({left:16,top:170,width:358,height:374})};const doc={getElementById:()=>stage,createElement:()=>({style:{},getContext:()=>ctx,remove(){}})};class FakeImage{constructor(){images.push(this);}set src(x){this.url=x;}}
 const w=createHomeWorld({container:{appendChild(){},getBoundingClientRect:()=>rect},document:doc,window:{Image:FakeImage}});w.setEnvironment({region:'forest'});w.setEnvironment({region:'city'});images[0].onload();assert.equal(w.stats().loaded,false);images[1].onload();assert.equal(w.stats().loaded,true);w.draw(.2,{});const before=w.stats().animationTime;w.draw(.2,{reducedMotion:true});assert.equal(w.stats().animationTime,before);w.draw(.2,{paused:true});assert.equal(w.stats().animationTime,before);w.destroy();images[1].onload();assert.equal(w.stats().destroyed,true);
});
