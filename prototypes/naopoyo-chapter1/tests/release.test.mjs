import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {stages} from '../stages.mjs';
import {KEY} from '../progress.mjs';
const require=createRequire(import.meta.url);
const away=require('../../../conversation-away.js');

test('chapter dialogue follows closing-quote punctuation rule without removing prose periods',()=>{
 for(const s of stages) for(const key of ['story','ending','lesson', 'hint'])assert.doesNotMatch(s[key],/。」/);
 assert.match(stages[0].story,/舞い降りました。/);
 assert.match(stages[9].story,/きみたちだけで。ぼく/);
});
test('Home reads chapter clears without confusing legacy IDs or replaying old history',()=>{
 assert.equal(away.KEYS.chapter,KEY);
 const raw=cleared=>JSON.stringify({version:1,cleared});
 let r=away.detect(null,{naopoyo:raw([1]),chapter:raw(['light-arrival'])},1000);
 assert.equal(r.event,null);
 r=away.detect(r.next,{naopoyo:raw([1]),chapter:raw(['light-arrival','light-together'])},1000);
 assert.deepEqual(r.event,{source:'naopoyo',kind:'clear',count:1});
 assert.equal(away.detect(r.next,{chapter:raw(['light-arrival','light-together'])},1000).event,null);
 assert.equal(away.detect({v:1,naopoyo:['1'],card:null},{chapter:raw(['light-arrival'])},1000).event,null);
 const invalid=away.detect(r.next,{chapter:'{"version":2,"cleared":["future"]}'},1000);
 assert.equal(invalid.event,null);
});
test('Home observes a missing chapter save as empty, so first play completion is news',()=>{
 const first=away.detect(null,{chapter:null},1000);
 const next=away.detect(first.next,{chapter:JSON.stringify({version:1,cleared:['light-arrival']})},2000);
 assert.deepEqual(next.event,{source:'naopoyo',kind:'clear',count:1});
});
