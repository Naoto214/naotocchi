const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('conversation state and away records are scoped to each AB save family',()=>{
 const {scopeConversation}=require('../tools/home-ab-storage.cjs');
 const keys=['naotocchi-conversation-v1','naotocchi-conversation-away-v1','naopoyo-rescue-v1','naopoyo.chapter1.20261023.v1','naotocchi-card-records-v1'];
 for(const scope of ['a-qa','b-qa','play']){
  for(const name of ['conversation-director.js','conversation-away.js']){
   const original=fs.readFileSync(name,'utf8'),scoped=scopeConversation(original,scope);
   for(const key of keys)if(original.includes("'"+key+"'"))assert.ok(!scoped.includes("'"+key+"'"));
   let expected=original;for(const key of keys)expected=expected.replaceAll("'"+key+"'","'naotocchi-home-ab-"+scope+":"+key+"'");
   assert.equal(scoped,expected,'only storage keys change; dialogue and scheduling are byte-identical');
  }
 }
});
test('director save cannot replace the existing conversation history',()=>{
 const {scopeConversation}=require('../tools/home-ab-storage.cjs');
 const data=new Map([['naotocchi-conversation-v1','untouched']]);
 const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 for(const scope of ['a-qa','b-qa','play']){
  const c={module:{exports:{}}};vm.runInNewContext(scopeConversation(fs.readFileSync('conversation-director.js','utf8'),scope),c);
  const d=c.module.exports.createDirector({storage,now:()=>10000,random:()=>.5});
  d.load();d.noteShown('fixture','pet');d.save();
  assert.ok(data.has('naotocchi-home-ab-'+scope+':naotocchi-conversation-v1'));
  assert.equal(data.get('naotocchi-conversation-v1'),'untouched');
 }
 assert.equal(data.size,4);
});
