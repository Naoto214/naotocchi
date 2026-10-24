import test from 'node:test';import assert from 'node:assert/strict';
import {stages} from '../stages.mjs';import {solve} from '../solve.mjs';
import {createState,settle,move,complete,mass} from '../../naopoyo-v2/engine.mjs';
for(const stage of stages)test(`${stage.id}: stable initial board and real-engine all-rescued witness`,()=>{
 const s=createState(stage),before=structuredClone(s);settle(s);assert.deepEqual(s,before);const total=mass(s);
 const r=solve(stage);assert.equal(r.status,'solved');for(const step of r.path){const a=s.actors.find(a=>a.x===step.at[0]&&a.y===step.at[1]);assert.ok(move(s,a.id,...step.d).ok);assert.equal(mass(s),total)}assert.ok(complete(s));
});
test('11 cannot finish without a gravity event',()=>assert.equal(solve(stages[0],{filter:(_s,_n,r)=>!r.events.some(e=>e.type==='fall')}).status,'exhausted'));
const stacked=s=>s.actors.some(a=>s.actors.some(b=>a.x===b.x&&a.y+1===b.y));
for(const i of [1,2])test(`${i+11} cannot finish without using a companion as a vertical support`,()=>assert.equal(solve(stages[i],{filter:(_s,n)=>!stacked(n)}).status,'exhausted'));
test('13 cannot rescue the 8 before the 4: exhaustive state graph',()=>assert.equal(solve(stages[2],{filter:(s,_n,r)=>!r.events.some(e=>e.type==='rescue'&&e.level===4&&s.rescued<8)}).status,'exhausted'));
test('solver reports capped exploration as unproven',()=>assert.equal(solve(stages[2],{limit:2}).status,'limit'));
