const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const file='relationship-expression.js';
function moduleUnderTest(){assert.ok(fs.existsSync(file),'Relationship resolver must exist after image GREEN');return require('../'+file);}
test('full resolver prioritizes positive, then lonely below 30, then normal without mutating input',()=>{
 const R=moduleUnderTest();
 for(const [kind,id] of Object.entries(R.SUPPORTED).flatMap(([kind,ids])=>ids.map(id=>[kind,id]))){
  const normal=`normal/${id}.png`;
  for(const [value,positive,state] of [[50,false,'normal'],[20,false,'lonely'],[29,false,'lonely'],[29.999,false,'lonely'],[31,false,'normal'],[30,false,'normal'],[20,true,'positive'],[50,true,'positive'],[undefined,false,'normal']]){
   const r=R.resolve({kind,id,value,positive,normal});assert.equal(r.expression,state);assert.equal(r.asset,state==='normal'?normal:`assets/characters/relationship/${id}/${state}.png`);
  }
 }
});
test('unregistered characters and wrong-kind IDs always use original PNG',()=>{
 const R=moduleUnderTest();for(const [kind,id] of [['companion','rabbit'],['partner','guest'],['author','naoto'],['partner','otter']]) assert.deepEqual(R.resolve({kind,id,value:0,positive:true,normal:'base.png'}),{expression:'normal',asset:'base.png'});
});
test('one ordinary representative plus all rescued individuals, deduplicated',()=>{
 const R=moduleUnderTest(),before=[{id:'otter',bond:20},{id:'clock',bond:20},{id:'rabbit',bond:50}],after=before.map(c=>({...c,bond:c.bond+20}));
 assert.deepEqual(R.companionPositiveIds(before,after,()=>.99),['rabbit','otter','clock']);
 assert.deepEqual(R.companionPositiveIds(before,after,()=>0),['otter','clock']);
 assert.deepEqual(R.companionPositiveIds(after,after,()=>.4),['clock']);
 assert.deepEqual(R.companionPositiveIds([],[],()=>0),[]);
 assert.deepEqual(R.companionPositiveIds([{id:'otter',bond:5}],[{id:'otter',bond:25}],()=>0),['otter']);
});
test('temporary reaction expiry, refresh, object identity and JSON non-persistence',()=>{
 const R=moduleUnderTest();let now=0,serial=0,changed=0;const timers=new Map();
 const reactions=R.createReactions({now:()=>now,schedule:fn=>{timers.set(++serial,fn);return serial;},cancel:id=>timers.delete(id),onExpire:()=>changed++});
 const a={id:'otter',bond:20},original=JSON.stringify(a);reactions.start(a);assert.equal(reactions.active(a),true);assert.equal(reactions.active({...a}),false);assert.equal(JSON.stringify(a),original);
 now=100;reactions.start(a);assert.equal(timers.size,1);now=100+R.REACTION_MS;assert.equal(reactions.active(a),false);[...timers.values()][0]();assert.equal(changed,1);
 const fresh=R.createReactions();assert.equal(fresh.active(a),false);
});
test('every registered relationship image is a new 128px transparent PNG',()=>{
 const R=moduleUnderTest();for(const [kind,ids] of Object.entries(R.SUPPORTED))for(const id of ids)for(const expression of ['positive','lonely']){
  const b=fs.readFileSync(R.resolve({kind,id,value:expression==='lonely'?20:50,positive:expression==='positive',normal:'base'}).asset);
  assert.equal(b.readUInt32BE(16),128);assert.equal(b.readUInt32BE(20),128);assert.equal(b[25],6);
 }
});
