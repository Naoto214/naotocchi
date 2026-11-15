import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as policy from './policy.mjs';
test('deck limits stay the same when rarity changes',()=>{
 assert.equal(typeof policy.currentPolicy,'function','independent ID-based policy is required');
 const cards=[{id:'M-man-01',rare:false},{id:'M-man-08',rare:true}];
 const a=policy.currentPolicy(cards), b=policy.currentPolicy(cards.map(c=>({...c,rare:!c.rare})));
 assert.deepEqual(a,b); assert.equal(a.defaultLimit,3);
});
test('name candidates never mutate formal source records',()=>{
 assert.equal(typeof policy.displayRecord,'function','display-only name mapping is required');
 const c=Object.freeze({id:'M-world_tree-01',title:'光る芽',name:'世界樹①',text:'正式な効果'});
 assert.equal(policy.displayRecord(c,'formal').title,'光る芽');
 assert.equal(policy.displayRecord(c,'shared').title,'光るたね');
 assert.equal(c.title,'光る芽');
 assert.equal(policy.displayRecord(c,'shared').id,c.id);
 assert.equal(policy.displayRecord({...c,id:'M-starfish-01',title:'浮遊幼生'},'shared').title,'浮遊幼生');
});
