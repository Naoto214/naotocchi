import test from 'node:test';import assert from 'node:assert/strict';
import {stages} from '../stages.mjs';
import {search,requirements} from './reachability.mjs';
for(const [i,stage]of stages.entries())for(const feature of requirements[i])test(`V6 ${stage.id}: cannot finish without ${feature}`,()=>{
 const result=search(stage.board,{forbid:feature,maxStates:30000});assert.equal(result.solved,false,JSON.stringify(result));assert.equal(result.exhausted,true);
});
