const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function resolve(id,stage){
 const html=fs.readFileSync('character-3d/wave-review.html','utf8'),start=html.indexOf('const q=new URLSearchParams'),end=html.indexOf('const rig=builders.BUILDERS',start);assert.ok(start>=0&&end>start);
 const ctx=vm.createContext({URLSearchParams,location:{search:'?'+new URLSearchParams({id,stage:String(stage)})}});ctx.globalThis=ctx;
 for(const [,file]of fs.readFileSync('character-3d/spec-esm.mjs','utf8').matchAll(/import '\.\/([^']+)';/g))vm.runInContext(fs.readFileSync('character-3d/'+file,'utf8'),ctx);
 ctx.SPEC=ctx.NaotocchiCharacter3DSpec;vm.runInContext(html.slice(start,end)+'globalThis.selected=sp;',ctx);return ctx;
}
test('actual wave page resolves reviewed legacy models at exact stage zero without widening identities',()=>{
 for(const id of ['cat_friend','shiba']){const ctx=resolve(id,0);assert.ok(ctx.selected===ctx.SPEC.stageSpec(id,0),'same reviewed legacy spec');for(const wrong of [1,-1])assert.throws(()=>resolve(id,wrong),/No exact candidate/);assert.throws(()=>resolve('companion:'+id,0),/No exact candidate/);}
 assert.throws(()=>resolve('__unknown__',0),/No exact candidate/);
});
test('actual wave page retains player and role-specific candidate resolution',()=>{
 const player=resolve('dog',1);assert.deepEqual(JSON.parse(JSON.stringify(player.selected)),JSON.parse(JSON.stringify(player.SPEC.stageSpec('dog',1))));
 const author=resolve('author:naoto',0);assert.ok(author.selected.archetype==='humanoid');assert.throws(()=>resolve('author:naoto',1),/No exact candidate/);
});
