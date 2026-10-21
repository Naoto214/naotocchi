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
for(const gate of [0,1])test(`stage10 cannot complete when only gate ${gate} is sealed`,()=>{
 const result=search(stages[9],{sealedGateIndices:[gate]});
 assert.equal(result.status,'exhausted',JSON.stringify(result));
 assert.equal(result.maxRescued,gate===0?1:2,'the other species can still escape');
});
test('search detects every former 702721a shifted-wall bypass under destination-only movement',()=>{
 const layouts={6:[[3,0],[2,1],[2,3],[3,4],[3,5]],
 9:[[3,0],[2,1],[3,3],[3,5],[4,3],[5,3]],11:[[3,0],[4,1],[4,3],[3,4],[3,5]]};
 for(const [index,walls] of Object.entries(layouts))assert.equal(search({...stages[index],walls},{sealed:true}).status,'solved');
});
