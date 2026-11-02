import test from 'node:test';
import assert from 'node:assert/strict';
import {BoardInput} from '../input.mjs';
import {createState,move} from '../engine.mjs';
function fixture(species='frog'){
 const s=createState({w:8,h:8,gravity:false,movementRules:'contact-v2',actors:[{id:'a',x:2,y:3,level:2,species:'dog'},{id:'b',x:3,y:3,level:1,species}],walls:[],spikes:[],gates:[],exits:[]});
 const input=new BoardInput(()=>s,(...a)=>move(s,...a));return {s,input};
}
test('adjacent different species taps always select without moving',()=>{
 const {s,input}=fixture(),before=structuredClone(s);
 for(let i=0;i<20;i++)for(const [id,x]of [['a',2],['b',3]]){input.start({x:x+.5,y:3.5});input.end();assert.equal(input.selected,id);assert.deepEqual(s,before);}
});
test('adjacent same species tap selects without merging',()=>{const {s,input}=fixture('dog');input.select('a');input.start({x:3.5,y:3.5});input.end();assert.equal(input.selected,'b');assert.equal(s.actors.length,2);assert.equal(s.moves,0);});
test('drag across different species swaps; same species merges',()=>{for(const species of ['frog','dog']){const {s,input}=fixture(species);input.start({x:2.5,y:3.5});input.drag({x:3.5,y:3.5});input.end();assert.equal(s.moves,1);assert.equal(s.actors.find(a=>a.id==='a').x,3);assert.equal(s.actors.length,species==='dog'?1:2);}});
test('long hold and small within-cell jitter do not move',()=>{const {s,input}=fixture();input.start({x:2.5,y:3.5});for(let i=0;i<100;i++)input.drag({x:2.5+Math.sin(i)*.1,y:3.5});input.end();assert.equal(s.moves,0);});
test('empty adjacent tile tap preserves movement and cancel blocks trailing move',()=>{const {s,input}=fixture();input.select('a');input.start({x:1.5,y:3.5});input.end();input.drag({x:.5,y:3.5});assert.equal(s.moves,1);assert.equal(s.actors.find(a=>a.id==='a').x,1);});
test('a continuous stroke remains relative to finger cells after gravity',()=>{
 const s=createState({w:8,h:8,gravity:true,gravityRules:'supported-v1',movementRules:'contact-v2',actors:[{id:'a',x:2,y:3,level:1,species:'dog'}],walls:[[2,4],...Array.from({length:8},(_,x)=>[x,7])],spikes:[],gates:[],exits:[]});
 const input=new BoardInput(()=>s,(...a)=>move(s,...a));input.start({x:2.5,y:3.5});input.drag({x:3.5,y:3.5});assert.equal(s.actors[0].y,6);input.drag({x:4.5,y:3.5});input.end();assert.equal(s.actors[0].x,4);assert.equal(s.moves,2);
});
test('rescue ends the gesture even if rendering selects a survivor',()=>{
 const state={w:8,h:8,actors:[{id:'parent',x:5,y:4},{id:'child',x:2,y:4}]},calls=[];
 const input=new BoardInput(()=>state,(id,dx,dy)=>{calls.push(id);state.actors=state.actors.filter(a=>a.id!==id);input.selected=state.actors[0]?.id;return {ok:true};});
 input.start({x:5.5,y:4.5});input.drag({x:7.5,y:4.5});assert.deepEqual(calls,['parent']);assert.equal(state.actors[0].id,'child');
});
test('visible animation hit selects logical survivor without moving',()=>{
 const {s,input}=fixture();input.select('b');input.start({x:1.8,y:3.5},{hit:s.actors[0]});input.end();assert.equal(input.selected,'a');assert.equal(s.moves,0);
});
