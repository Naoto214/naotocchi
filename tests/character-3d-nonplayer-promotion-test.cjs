const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
function check(spec){
 for(const [kind,id] of [['companion','box'],['companion','clock'],['companion','owl'],['companion','punyu'],['companion','parrot'],['companion','chicken'],['companion','penguin_friend'],['companion','panda'],['companion','sheep'],['companion','seal'],['partner','sunflower_partner'],['partner','oasis_cactus']]){
  const key=spec.specKeyFor({kind,id});assert.ok(key,kind+':'+id+' is promoted');assert.equal(key.id,kind+':'+id);assert.equal(key.stage,0);assert.equal(key.exact,true);
  assert.ok(spec.stageSpec(key.id,0));assert.equal(spec.stageSpec(key.id,1),null);assert.equal(spec.referenceAsset(key.id,0),'assets/characters/'+(kind==='companion'?'companions':'partners')+'/'+id+'.png');
  for(const other of ['companion','partner','author'].filter(x=>x!==kind))assert.equal(spec.specKeyFor({kind:other,id}),null);
  assert.equal(spec.specKeyFor({line:id,stage:0}),null);
 }
 assert.equal(spec.specKeyFor({kind:'author',id:'naoto'}),null);
}
test('reviewed nonplayers are exact role-specific runtime entries',()=>check(require('../character-3d/spec.js')));
test('browser ESM entry loads reviewed nonplayers but ignores unreviewed factory entries',()=>{
 const ctx=vm.createContext({});ctx.globalThis=ctx;
 const entry=fs.readFileSync(path.resolve('character-3d/spec-esm.mjs'),'utf8');
 for(const [,name]of entry.matchAll(/import '\.\/([^']+)';/g)){
  vm.runInContext(fs.readFileSync(path.resolve('character-3d',name),'utf8'),ctx);
  if(name==='nonplayer-spec.js'){
   const factory=ctx.NaotocchiNonPlayerWave;ctx.NaotocchiNonPlayerWave=()=>({...factory(),'author:naoto':{kind:'author',id:'naoto',asset:'not-reviewed',spec:{archetype:'humanoid'}}});
  }
 }
 check(ctx.NaotocchiCharacter3DSpec);
});
