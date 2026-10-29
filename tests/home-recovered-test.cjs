const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createModel}=require('../home-diorama-model.js');
test('six preserved images and distinct geometry are present',async()=>{
 const {ART_CANDIDATES,ART_SCENES}=await import('../home-recovered-manifest.mjs');
 assert.equal(ART_CANDIDATES.length,6);assert.equal(new Set(Object.values(ART_SCENES).map(s=>JSON.stringify(s.ground))).size,6);
 for(const c of ART_CANDIDATES){const p=fs.readFileSync(c.src);assert.equal(p.readUInt32BE(16),1024);assert.equal(p.readUInt32BE(20),1536);assert.equal(ART_SCENES[c.id].candidate,c.id);}
});
test('home room, waterfall, stream, rocks and river are not walkable',async()=>{
 const {ART_SCENES}=await import('../home-recovered-manifest.mjs');const {createRecoveredNavigation}=await import('../home-recovered-navigation.mjs');
 for(const s of Object.values(ART_SCENES)){const nav=createRecoveredNavigation(s,{width:390,height:844},{left:16,top:170,width:358,height:374});for(const [x,z] of s.forbidden)assert.equal(nav.valid(nav.project({x,z})),false,s.candidate+' excludes '+x+','+z);for(const [x,z] of s.seats)assert.ok(nav.valid(nav.project({x,z})),s.candidate+' static seat');}
});
for(const width of [320,375,390,430])for(const count of [1,6,28])test(`six scenes: ${width}px / ${count} actors remain safe and pet can move`,async()=>{
 const {ART_SCENES}=await import('../home-recovered-manifest.mjs');const {createRecoveredNavigation}=await import('../home-recovered-navigation.mjs');
 const fixture=require('./fixtures/home-v20-river-crowded.json');
 for(const [id,s] of Object.entries(ART_SCENES)){
 const w=width-32,h=374,nav=createRecoveredNavigation(s,{width,height:844},{left:16,top:170,width:w,height:h});
 const list=fixture.slice(0,count).map(a=>({...a,w:a.w*Math.min(1,w/343),h:a.h*Math.min(1,w/343),kind:a.key.split(':')[0],id:a.key.split(':')[1],extent:{top:a.h+12}}));
 const m=createModel({random:()=>.5});m.sync(list,{region:s.region,width:w,height:h,groundTop:24,navigation:nav});const actors=m.snapshot();assert.equal(actors.length,count);assert.ok(actors.every(a=>nav.valid(a)),id+' safe placement');
 const a=actors[0],b=m.bounds(a);let escaped=false;
 for(let y=b.top;y<=b.bottom&&!escaped;y+=24)for(let x=b.left;x<=b.right&&!escaped;x+=24){const p={x,y};if(!nav.valid(p)||Math.hypot(p.x-a.x,p.y-a.y)<35)continue;m.cancel();const before=m.snapshot()[0];if(!m.move(a.key,p,'ground'))continue;for(let i=0;i<30;i++){m.step(.1,{autonomy:false});assert.ok(m.snapshot().every(q=>nav.valid(q)),id+' safe along route');}escaped=Math.hypot(m.snapshot()[0].x-before.x,m.snapshot()[0].y-before.y)>10;}
 assert.ok(escaped,id+' actual escape');for(let i=0;i<80;i++)m.step(.1,{autonomy:true});assert.ok(m.snapshot().every(q=>nav.valid(q)),id+' autonomy');
 if(count===28)assert.ok(Math.max(...actors.map(p=>p.y))-Math.min(...actors.map(p=>p.y))>80,id+' depth spread');
 }
});
