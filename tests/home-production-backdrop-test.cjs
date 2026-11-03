const {test}=require('node:test');const assert=require('node:assert/strict');
test('decorative cover fills all viewport shapes without changing the terrain transform',async()=>{
 const {artTransform,backdropComposition}=await import('../home-production-transform.mjs');
 const {artTransform:original}=await import('../home-art-navigation.mjs');
 for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[568,320],[667,375],[844,390],[932,430]]){
  const host={width,height},stage={left:16,top:240,width:width-32,height:456};
  const t=artTransform(host,stage),old=original(host,stage),b=backdropComposition(host,stage);
  for(const key of ['width','height','left','top'])assert.equal(t[key],old[key]);
  assert.ok(b.cover.left<=0&&b.cover.top<=0);
  assert.ok(b.cover.left+b.cover.width>=width&&b.cover.top+b.cover.height>=height);
  assert.equal(b.cover.height/b.cover.width,1.5);
  assert.ok(b.fadeTop<=Math.max(0,stage.top-t.top));
  assert.ok(b.fadeBottom<=Math.max(0,t.top+t.height-stage.top-stage.height));
  const p={x:.55,z:.74};assert.deepEqual(t.project(p),old.project(p));
 }
});
