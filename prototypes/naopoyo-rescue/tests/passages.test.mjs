import test from 'node:test';import assert from 'node:assert/strict';
import {stages} from '../stages.mjs';import {search} from './search.mjs';
for(const stage of stages.filter(s=>s.gates.length))test('sealed gate prevents ANY rescue: '+stage.id,()=>{
 const result=search(stage,{sealed:true});
 assert.equal(result.status,'exhausted',JSON.stringify(result));
 assert.equal(result.maxRescued,0);
});
test('search catches the old stage 07 bypass even with victory gate flags removed',()=>{
 const old={...stages[6],walls:[]};
 assert.equal(search(old,{sealed:true}).status,'solved');
});
test('search cap is unproved, never impossible',()=>{
 assert.equal(search(stages[6],{sealed:true,limit:1}).status,'limit');
});
