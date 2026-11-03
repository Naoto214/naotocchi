import test from 'node:test';import assert from 'node:assert/strict';
import {search,replay,stateKey} from '../search.mjs';
import {stages} from '../stages.mjs';
import {createState,move,settle} from '../../naopoyo-v2/engine.mjs';
import {solve} from '../solve.mjs';
for(const st of stages.filter(s=>s.number<=13))test('compact BFS equals reference: '+st.id,()=>{const expected=solve(st),r=search(st);assert.equal(r.status,'solved');assert.equal(r.depth,expected.depth);assert.equal(r.shortestProven,true);assert.equal(replay(st,r.path).actors.length,0)});
test('caps are explicitly unproven',()=>{const r=search(stages[2],{limit:2});assert.equal(r.status,'limit');assert.equal(r.shortestProven,false)});
test('identity renaming preserves successors including spike families and overflow',()=>{
 const st={...stages[0],walls:[],gates:[],exits:[],spikes:[{x:3,y:6,power:2}],actors:[{id:'child1',x:2,y:7,level:8,species:'dog'},{id:'z',x:4,y:7,level:4,species:'dog'}]};
 const s=createState(st);settle(s);const renamed=structuredClone(s);renamed.actors.forEach((a,i)=>a.id='q'+i);renamed.nextId=100;
 const next=s=>s.actors.flatMap(a=>[-1,0,1].flatMap(dy=>[-1,0,1].flatMap(dx=>{const n=structuredClone(s);return move(n,a.id,dx,dy).ok?[stateKey(n)]:[]}))).sort();assert.deepEqual(next(s),next(renamed));
});
test('custom heuristic and intermediate goal do not acquire a full-puzzle shortest claim',()=>{
 const s=stages[0],r=search(s,{method:'bfs',goal:()=>true,score:()=>0});assert.equal(r.status,'solved');assert.equal(r.depth,0);assert.equal(r.shortestProven,false);
});
