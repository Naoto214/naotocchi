const {test}=require('node:test'),assert=require('node:assert/strict');
const R=require('../relationship-expression.js');
test('reaction exposes an ephemeral start token and expiry without persisting entity fields',()=>{
 let now=0;const entity={id:'otter'},r=R.createReactions({now:()=>now,schedule:()=>1,cancel(){}});
 r.start(entity);assert.equal(r.info(entity).startedAt,0);assert.equal(r.info(entity).until,2500);
 now=2500;assert.equal(r.info(entity),null);assert.deepEqual(entity,{id:'otter'});
});
test('heart remains immediately above its owner even if a neighbour occupies that space',()=>{
 const f={x:50,y:45,w:40,h:40};
 const p=R.heartAnchor(f,{width:300,height:160});
 const q=R.heartAnchor(f,{width:300,height:160,obstacles:[{x:0,y:0,w:300,h:45}]});
 assert.deepEqual(q,p);assert.equal(p.x+p.w/2,f.x+f.w/2);
 assert.ok(f.y-(p.y+p.h)>=2 && f.y-(p.y+p.h)<=4);
 for(const x of [0,270]){const a=R.heartAnchor({...f,x},{width:310,height:160});assert.ok(a.x>=0&&a.x+a.w<=310);}
});
