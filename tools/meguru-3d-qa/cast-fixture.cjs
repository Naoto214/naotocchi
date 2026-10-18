// Browser-only explicit stress placement. Never loaded by the application.
// Called after, and independently of, unmodified normal-startup observations.
function placeCast() {
  const r=globalThis.__meguruRun, M=globalThis.installNaotocchiMeguru(globalThis.__meguruBridge);
  if(r.party.length)throw Error('fixture requires normal zero-party state');
  const before=JSON.stringify(__meguruBridge.getState()),registry=M.buildRegistry();
  for(const a of registry.residents)a.withPlayer=!!a.related;
  const actors=M.companionsOf(registry),keys=actors.map(a=>a.key);
  if(!actors.length || new Set(keys).size!==keys.length)throw Error('empty or duplicate cast fixture');
  for(let i=r.world.residents.length-1;i>=0;i--)if(keys.includes(r.world.residents[i].key))r.world.residents.splice(i,1);
  r.party.push(...actors);r.sim.placeParty();
  if(JSON.stringify(__meguruBridge.getState())!==before)throw Error('fixture changed save');
  return {explicit:true,keys,count:actors.length,saveUnchanged:true};
}
function normalState() {
  const r=globalThis.__meguruRun,registry=r.sim.registry;
  const related=registry.residents.filter(a=>a.related);
  return {party:r.party.length,related:related.map(a=>({key:a.key,withPlayer:a.withPlayer,region:a.region})),
    residentKeys:r.world.residents.map(a=>a.key),
    expectedResidentKeys:registry.byRegion(r.world.regionId).filter(a=>!a.withPlayer).map(a=>a.key).concat(registry.naoto?.region===r.world.regionId?[registry.naoto.key]:[]),
    socialAvailable:typeof globalThis.NaotocchiRelationshipLife?.createSession==='function'&&typeof r.sim.startAccompany==='function'&&typeof r.sim.endAccompany==='function'};
}
function validateNormal(s, expectedRelated) {
  const assert=require('node:assert/strict');
  assert.equal(s.party,0,'no automatic companions');assert.equal(s.socialAvailable,true,'free-life session and voluntary APIs loaded');
  assert.equal(s.related.length,expectedRelated,'all saved relationships registered');
  assert.ok(s.related.every(a=>a.withPlayer===false),'relationships remain free living');
  assert.equal(new Set(s.residentKeys).size,s.residentKeys.length,'no duplicated residents');
  assert.deepEqual([...s.residentKeys].sort(),[...s.expectedResidentKeys].sort(),'every regional resident is present');
  assert.ok(!s.expectedResidentKeys.length || s.residentKeys.length>0,'populated region has actual residents');
}
module.exports={placeCast,normalState,validateNormal};

// Capture the module actually installed by script.js, not a second test session.
function installModuleProbe() {
  Object.defineProperty(globalThis,'installNaotocchiMeguru',{configurable:true,set(fn){
    Object.defineProperty(globalThis,'installNaotocchiMeguru',{configurable:true,writable:true,value:function(...args){
      const m=fn(...args);if(!globalThis.__qaLiveMeguru)globalThis.__qaLiveMeguru=m;return m;
    }});
  }});
}
async function observeNormal(page) {
  const before=await page.evaluate(()=>__qaLiveMeguru.socialSession.now);
  await page.waitForFunction(t=>__qaLiveMeguru.socialSession.now>t,before,{timeout:30000});
  const session=await page.evaluate(t=>({before:t,after:__qaLiveMeguru.socialSession.now}),before);
  const original=await page.evaluate(()=>{const r=__meguruRun;return {x:r.player.x,z:r.player.z,yaw:r.sim.camera.yaw,motion:r.sim.cameraMotion};});
  const targets=await page.evaluate(()=>{const seen=new Set();return __meguruRun.world.residents.filter(a=>{if(seen.has(a.kind))return false;seen.add(a.kind);return true;}).map(a=>({key:a.key,kind:a.kind}));});
  const rendered=[];
  try {
    for(const target of targets){
      await page.evaluate(key=>{const r=__meguruRun,a=r.world.residents.find(a=>a.key===key);r.sim.setCameraMotion(false);r.setPlayer(a.x,a.z-80);r.sim.camera.yaw=0;},target.key);
      await page.waitForFunction(key=>{const r=__meguruRun,a=r.world.residents.find(a=>a.key===key),p=r.renderer.char3dPresenter,i=p?.instanceOf(a);return r.party.length===0&&a&&!a.follow&&p.has(a)&&i.holder.parent&&i.holder.visible;},target.key,{timeout:60000});
      rendered.push(await page.evaluate(key=>{const r=__meguruRun,a=r.world.residents.find(a=>a.key===key),i=r.renderer.char3dPresenter.instanceOf(a);return {key:a.key,kind:a.kind,live:true,holderAttached:!!i.holder.parent,visible:i.holder.visible,party:r.party.length};},target.key));
    }
  } finally {await page.evaluate(p=>{const r=__meguruRun;r.setPlayer(p.x,p.z);r.sim.camera.yaw=p.yaw;r.sim.setCameraMotion(p.motion);},original);}
  return {session,expectedKinds:targets.map(a=>a.kind),rendered};
}
module.exports.installModuleProbe=installModuleProbe;
module.exports.observeNormal=observeNormal;
