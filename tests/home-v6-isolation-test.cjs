const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('V6 baseline saves conversation and away state without touching existing production records',()=>{
 const {baselineFiles}=require('../tools/home-v6-baseline.cjs');
 const source={'qa-v22-game.html':'<script src="qa-v22-script.js"></script><script src="conversation-director.js"></script><script src="conversation-away.js"></script>','qa-v22-script.js':"const key='naotocchi-art25d-baseline-v1';"};
 for(const n of ['conversation-director','conversation-away'])source[n+'.js']=fs.readFileSync(n+'.js','utf8');
 const files=baselineFiles(f=>source[f]);
 assert.ok(files['qa-home-v6-baseline-game.html'].includes('home-v6-baseline-conversation-away.js'));
 assert.ok(files['qa-home-v6-baseline-script.js'].includes('naotocchi-home-v6-baseline-v1'));
 const data=new Map([['naotocchi-conversation-v1','untouched'],['naotocchi-conversation-away-v1','untouched']]);const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const c={module:{exports:{}}};vm.runInNewContext(files['home-v6-baseline-conversation-director.js'],c);const d=c.module.exports.createDirector({storage,now:()=>10000,random:()=>.5});d.load();d.noteShown('test','pet');d.save();
 assert.equal(data.get('naotocchi-conversation-v1'),'untouched');assert.ok(data.has('naotocchi-home-v6-baseline:naotocchi-conversation-v1'));
 for(const name of ['director','away'])for(const key of ['naotocchi-conversation-v1','naotocchi-conversation-away-v1','naopoyo-rescue-v1','naopoyo.chapter1.20261023.v1','naotocchi-card-records-v1'])assert.ok(!files['home-v6-baseline-conversation-'+name+'.js'].includes("'"+key+"'"));
});
test('releasing a comparison frame navigates away and clears load readiness',async()=>{
 const {releaseFrame}=await import('../home-v6-frame.mjs');const frame={src:'world.html',dataset:{ready:'true'},onload:()=>{throw Error('stale load callback');}};releaseFrame(frame);assert.equal(frame.src,'about:blank');assert.equal(frame.dataset.ready,undefined);assert.equal(frame.onload,null);
});
