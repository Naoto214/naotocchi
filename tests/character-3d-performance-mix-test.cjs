const test=require('node:test'),assert=require('node:assert/strict');
test('QA performance mix uses explicit keys, never truthy strings as puff flags',()=>{
 const {performanceMix,expectedTemplates,matchesComposition}=require('../tools/character-3d/performance-mix.cjs');
 const spec=require('../character-3d/spec.js'),companions=['shiba','cat_friend',...Array.from({length:24},(_,i)=>'unbuilt-'+i)];
 const pilot=performanceMix([]),fish=performanceMix(['--fish-mix']),puff=performanceMix(['--puff-stress']);
 assert.equal(pilot.player.line,'dog');assert.equal(fish.player.line,'salmon');assert.equal(puff.player.line,'dandelion');
 assert.deepEqual(fish.standIns,['salmon:1','salmon:3','salmon:7','clownfish:5']);assert.deepEqual(puff.standIns,['dandelion:8']);
 assert.deepEqual(expectedTemplates(fish,5,spec,companions),{'salmon:6':1,'shiba:0':1,'cat_friend:0':1,'salmon:1':1,'salmon:3':1});
 const many=expectedTemplates(fish,27,spec,companions);assert.equal(many['clownfish:5'],6);assert.equal(many['dandelion:8'],undefined);
 assert.equal(matchesComposition({'salmon:6':1,'shiba:0':1,'cat_friend:0':1,'dandelion:8':24},many),false,'prior mislabeled puff result must be rejected');
 assert.equal(matchesComposition(many,many),true);
 for(const mix of [pilot,fish,puff])for(const n of [1,5,27])assert.equal(Object.values(expectedTemplates(mix,n,spec,companions)).reduce((a,b)=>a+b),n);
});
