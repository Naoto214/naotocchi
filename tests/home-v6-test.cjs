const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const vm=require('node:vm'),{recoveredModelSource}=require('../tools/home-recovered-model.cjs');
const runtime={module:{exports:{}},console,Uint32Array};vm.runInNewContext(recoveredModelSource(fs.readFileSync('home-diorama-model.js','utf8')),runtime);
const {createModel}=runtime.module.exports;
test('V6 C images and distinct geometry are present',async()=>{
 const {ART_CANDIDATES,ART_SCENES}=await import('../home-v6-manifest.mjs');
 assert.equal(ART_CANDIDATES.length,11);assert.equal(new Set(Object.values(ART_SCENES).map(s=>JSON.stringify(s.ground))).size,11);
 for(const c of ART_CANDIDATES){const p=fs.readFileSync(c.source||c.src);assert.equal(p.readUInt32BE(16),1024);assert.equal(p.readUInt32BE(20),1536);assert.equal(ART_SCENES[c.id].candidate,c.id);}
});
test('home room, waterfall, stream, rocks and river are not walkable',async()=>{
 const {ART_SCENES}=await import('../home-v6-manifest.mjs');const {createRecoveredNavigation}=await import('../home-recovered-navigation.mjs');
 for(const s of Object.values(ART_SCENES)){const nav=createRecoveredNavigation(s,{width:390,height:844},{left:16,top:170,width:358,height:374});for(const [x,z] of s.forbidden)assert.equal(nav.valid(nav.project({x,z})),false,s.candidate+' excludes '+x+','+z);for(const [x,z] of s.seats)assert.ok(nav.valid(nav.project({x,z})),s.candidate+' static seat');}
});
for(const width of [320,375,390,430])for(const count of [1,6,28])test(`V6 C scenes: ${width}px / ${count} actors remain safe and pet can move`,async()=>{
 const {ART_SCENES}=await import('../home-v6-manifest.mjs');const {createRecoveredNavigation}=await import('../home-recovered-navigation.mjs');
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
test('actual browser dimensions preserve a pet exit despite cramped fallback seats',async()=>{
 const vm=require('node:vm'),{recoveredModelSource}=require('../tools/home-recovered-model.cjs');
 const context={module:{exports:{}},console,Uint32Array};vm.runInNewContext(recoveredModelSource(fs.readFileSync('home-diorama-model.js','utf8')),context);
 const {ART_SCENES}=await import('../home-v6-manifest.mjs'),{createRecoveredNavigation}=await import('../home-recovered-navigation.mjs');
 const fixtures=require('./fixtures/home-recovered-runtime.json');const {insidePolygon}=await import('../home-art-navigation.mjs');
 for(const [width,f] of Object.entries(fixtures))for(const s of Object.values(ART_SCENES)){
 const {width:w,height:h,x:left,y:top}=f.stage,nav=createRecoveredNavigation(s,{width:Number(width),height:844},{left,top,width:w,height:h});
 const visible=(p,a)=>[.22,.5,.8].every(y=>[-.3,0,.3].every(x=>{const q=nav.unproject({x:p.x+a.w*x,y:p.y-a.h*y});return !s.foreground.some(poly=>insidePolygon(q.x,q.z,poly));}));
 const list=f.actors.map(a=>({...a,kind:a.key.split(':')[0],id:a.key.split(':')[1],extent:{top:a.h+12}}));const scene={region:s.region,width:w,height:h,groundTop:24,navigation:nav,visible};
 const m=context.module.exports.createModel({random:()=>.5});m.sync(list,scene);m.sync(list,scene);m.sync(list,scene);
 const a=m.snapshot()[0],b=m.bounds(a);let moved=false;for(const {x,y} of [{x:b.right,y:b.bottom-5},{x:b.left,y:b.bottom-5},{x:a.x+40,y:a.y},{x:a.x-40,y:a.y},{x:a.x,y:a.y+35},{x:a.x,y:a.y-35}]){if(moved)break;m.cancel();const before=m.snapshot()[0];if(!m.move(a.key,{x,y},'ground'))continue;for(let i=0;i<40;i++)m.step(.1,{autonomy:false});moved=Math.hypot(m.snapshot()[0].x-before.x,m.snapshot()[0].y-before.y)>10;}
 assert.ok(moved,s.candidate+' actual browser '+width+' exit');assert.ok(m.snapshot().every(a=>nav.valid(a)));
 }
});

test('egg is centered on C floor using official alpha bounds at every width',async()=>{
 const {eggPose}=await import('../home-v6-egg.mjs');const {ART_SCENES}=await import('../home-v6-manifest.mjs');const {createRecoveredNavigation}=await import('../home-recovered-navigation.mjs');
 for(const width of [320,375,390,430]){const host={width,height:844},stage={left:16,top:170,width:width-32,height:374},box=[30,20,98,118];const p=eggPose(host,stage,box),nav=createRecoveredNavigation(ART_SCENES['home-interior-c'],host,stage);assert.ok(nav.valid(p.foot));assert.equal(p.top+p.size*box[3]/128,p.foot.y);assert.equal(p.left+p.size*(box[0]+box[2])/256,p.foot.x);}
});

test('all thirteen canonical regions select eleven paintings or protected legacy special worlds',async()=>{const m=await import('../home-v6-manifest.mjs');for(const r of ['home','forest','river_lake','city','countryside','mountain','snow','sea','jungle','desert','deepsea'])assert.equal(m.selectRecoveredScene(r)?.region,r);for(const r of ['star_stop','memory_lake'])assert.equal(m.selectRecoveredScene(r),undefined);});
