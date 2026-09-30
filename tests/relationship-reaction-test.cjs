const {test}=require('node:test'),assert=require('node:assert/strict');
const R=require('../relationship-expression.js');
test('reaction exposes an ephemeral start token and expiry without persisting entity fields',()=>{
 let now=0;const entity={id:'otter'},r=R.createReactions({now:()=>now,schedule:()=>1,cancel(){}});
 r.start(entity);assert.equal(r.info(entity).startedAt,0);assert.equal(r.info(entity).until,2500);
 now=2500;assert.equal(r.info(entity),null);assert.deepEqual(entity,{id:'otter'});
});
test('heart anchor stays above the entire actor and inside stage, avoiding other actors',()=>{
 const f={x:50,y:45,w:40,h:40};const p=R.heartAnchor(f,{width:300,height:160,obstacles:[]});
 assert.ok(p.y+p.h<=f.y-3);assert.ok(p.x>=7&&p.x+p.w<=293);assert.ok(p.y>=6);assert.ok(p.w>=16);
 const other={x:p.x,y:p.y,w:p.w,h:p.h};const q=R.heartAnchor(f,{width:300,height:160,obstacles:[other]});
 assert.ok(!q||q.x+q.w<=other.x||q.x>=other.x+other.w||q.y+q.h<=other.y||q.y>=other.y+other.h);
 for(const x of [0,270]){const a=R.heartAnchor({...f,x},{width:310,height:160,obstacles:[]});assert.ok(!a||a.x>=7&&a.x+a.w<=303);}
 assert.equal(R.heartAnchor({...f,y:4},{width:300,height:160,obstacles:[]}),null);
});
