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
    expectedResidentKeys:registry.byRegion(r.world.regionId).filter(a=>!a.withPlayer).map(a=>a.key),
    socialAvailable:typeof globalThis.NaotocchiRelationshipLife?.createSession==='function'&&typeof r.sim.startAccompany==='function'&&typeof r.sim.endAccompany==='function'};
}
function validateNormal(s, expectedRelated) {
  const assert=require('node:assert/strict');
  assert.equal(s.party,0,'no automatic companions');assert.equal(s.socialAvailable,true,'free-life session and voluntary APIs loaded');
  assert.equal(s.related.length,expectedRelated,'all saved relationships registered');
  assert.ok(s.related.every(a=>a.withPlayer===false),'relationships remain free living');
  assert.equal(new Set(s.residentKeys).size,s.residentKeys.length,'no duplicated residents');
  // buildWorld may select resident populations; each actual resident must be from this region.
  assert.ok(s.residentKeys.every(k=>s.expectedResidentKeys.includes(k)),'resident belongs to normal regional registry');
  assert.ok(!s.expectedResidentKeys.length || s.residentKeys.length>0,'populated region has actual residents');
}
module.exports={placeCast,normalState,validateNormal};
