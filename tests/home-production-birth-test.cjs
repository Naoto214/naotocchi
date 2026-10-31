const {test}=require('node:test'),assert=require('node:assert/strict');
const {createModel}=require('../home-production-model.js');
const pet={key:'pet:dog',kind:'pet',x:150,y:220,w:40,h:50};
const scene={region:'home',width:360,height:380,groundTop:24};
const nav={valid:p=>p.x>=20&&p.x<=340&&p.y>=100&&p.y<=360,project:p=>({...p}),unproject:p=>({...p}),
 initialPoint:i=>({x:i?80:200,y:260}),nearest:(p,b)=>({x:Math.max(b.left,Math.min(b.right,p.x)),y:Math.max(100,b.top,Math.min(b.bottom,p.y))})};
test('explicit newborn placement takes priority over the right-side default seat',()=>{
 const m=createModel({random:()=>.5});m.sync([pet],{...scene,navigation:nav,newbornPoint:{x:180,y:210}});
 assert.equal(m.snapshot()[0].x,180);assert.equal(m.snapshot()[0].y,210);
});
test('newborn placement cannot bypass legal bounds or move existing actors',()=>{
 const m=createModel({random:()=>.5});m.sync([pet],{...scene,navigation:nav,newbornPoint:{x:-100,y:-100}});
 const a=m.snapshot()[0];assert.equal(a.x,32);assert.equal(a.y,100);assert.ok(nav.valid(a));
 m.sync([pet],{...scene,navigation:nav,newbornPoint:{x:180,y:210}});assert.equal(m.snapshot()[0].x,a.x);assert.equal(m.snapshot()[0].y,a.y);
});
test('ordinary saved/established entries keep original seating and companion placement',()=>{
 const list=[pet,{...pet,key:'companion:shiba',kind:'companion',w:20,h:20}];
 const m=createModel({random:()=>.5});m.sync(list,{...scene,navigation:nav});
 assert.equal(m.snapshot()[0].x,200);assert.equal(m.snapshot()[1].x,80);
 const before=m.snapshot().map(a=>({x:a.x,y:a.y}));m.sync(list,{...scene,navigation:nav,newbornPoint:{x:180,y:210}});
 assert.deepEqual(m.snapshot().map(a=>({x:a.x,y:a.y})),before);
});
test('a stale newborn request does not recenter a retained pet during crowd reflow',()=>{
 const m=createModel({random:()=>.5});m.sync([pet],{...scene,navigation:nav});
 const list=[pet,...Array.from({length:5},(_,i)=>({...pet,key:'companion:'+i,kind:'companion',w:10,h:10}))];
 m.sync(list,{...scene,navigation:nav,newbornPoint:{x:180,y:210}});
 assert.equal(m.snapshot()[0].x,200);assert.equal(m.snapshot()[0].y,260);
});
test('egg visible body is centred independently of transparent PNG padding',async()=>{
 const {eggPose}=await import('../home-production-egg.mjs');
 for(const width of [320,375,390,430])for(const box of [[26,10,102,114],[30,20,98,118]]){
 const stage={left:16,top:194,width:width-32,height:380},p=eggPose({width,height:844},stage,box);
 assert.ok(Math.abs(p.left+p.size*(box[0]+box[2])/256-stage.width/2)<.001);
 assert.ok(Math.abs(p.top+p.size*(box[1]+box[3])/256-stage.height/2)<.001);
 }
});
