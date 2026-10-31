const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const moveForQA=require('../tools/home-v8-qa-movement.cjs');
const {recoveredModelSource}=require('../tools/home-recovered-model.cjs');
// Captured failure: fixed six probes miss the legal diagonal exit at capacity.
for(const row of require('./fixtures/home-v8-star-crowd.json').rows) test(`v8 QA finds a real walkable exit for the recorded 430px/28 star cast (${row.time})`,async()=>{
  const {ART_SCENES}=await import('../home-v8-manifest.mjs');
  const {createRecoveredNavigation}=await import('../home-recovered-navigation.mjs');
  const {insidePolygon}=await import('../home-art-navigation.mjs');
  const d=row.detail,r=d.slots.castStage,spec=ART_SCENES['star_stop-original'];
  const navigation=createRecoveredNavigation(spec,{width:430,height:844},{left:r.x,top:r.y,width:r.width,height:r.height});
  const visible=(p,a)=>[.22,.5,.8].every(f=>[-.3,0,.3].every(x=>{
    const q=navigation.unproject({x:p.x+a.w*x,y:p.y-a.h*f});
    return !spec.foreground.some(poly=>insidePolygon(q.x,q.z,poly));
  }));
  const ctx={module:{exports:{}},Uint32Array};
  vm.runInNewContext(recoveredModelSource(fs.readFileSync('home-diorama-model.js','utf8')),ctx);
  const model=ctx.module.exports.createModel({random:()=>.5});
  model.sync(d.actors.map(a=>({...a,kind:a.key.split(':')[0],id:a.key.split(':')[1],extent:{top:a.h+12}})),
    {region:'star_stop',time:row.time,width:r.width,height:r.height,groundTop:24,navigation,visible});
  const before=model.snapshot()[0];
  assert.equal(before.x,203.3);assert.ok(Math.abs(before.y-192.95)<1e-6);
  assert.equal(moveForQA(model,navigation),true,'a valid exit must be found without relaxing collision or route checks');
  for(let i=0;i<20;i++)model.step(.05,{autonomy:false});
  const after=model.snapshot()[0];
  assert.ok(Math.hypot(after.x-before.x,after.y-before.y)>5,'actual movement, not merely an accepted request');
  assert.ok(navigation.valid(after));assert.ok(visible(after,after));
});
