import test from 'node:test';
import assert from 'node:assert/strict';
import {TutorialSession} from '../session.mjs';
const witnesses=[[[0,1]],[[0,1]],[[0,1]],[['friend',1,0],[0,1]],[[1,1]],[[0,1]],[[1,0]],[[0,1],...[...Array(7)].map(()=>[0,-1]),[1,0]]];
const paths=[[[3,3]],[[3,5],[3,4],[3,3],[3,2]],[[3,5],[3,4],[4,4],[5,4]],[[3,5],[3,4],[4,4],[5,4]],[[4,5],[3,4],[4,3],[5,2]],[[3,5],[3,4],[4,4],[5,4],[5,5],[5,6],[4,6]],[[3,3],[3,2],[3,1]],[[1,6],[1,5],[1,4],[1,3],[1,2],[1,1],[1,0]]];
export function solve(s,i){for(const a of witnesses[i])assert.ok(s.step(a.length===3?a[0]:'parent',...a.slice(-2)).ok,`T${i+1} ${a}`);}
for(let i=0;i<8;i++)test(`T${i+1}: legal witness, exact births, no premature clear, mass, Undo and replay`,()=>{
 const s=new TutorialSession(i);assert.equal(s.cleared,false);const initial=structuredClone(s.state),total=s.state.actors.reduce((n,a)=>n+a.level,0);
 solve(s,i);assert.equal(s.cleared,true);assert.deepEqual(s.records.find(r=>r.births.length).births.map(a=>[a.x,a.y]),paths[i]);
 assert.equal(s.state.rescued+s.state.actors.reduce((n,a)=>n+a.level,0),total);assert.equal(s.state.moves,witnesses[i].length);
 const final=structuredClone(s.state),saved=s.serialize();assert.equal(new TutorialSession(i).restore(saved).state.moves,witnesses[i].length);
 s.undo();assert.equal(s.cleared,false);s.reset();assert.deepEqual(s.state,initial);solve(s,i);assert.deepEqual(s.state,final);
});
test('T4: straight split without moving frog is not success',()=>{const s=new TutorialSession(3);s.step('parent',0,1);assert.equal(s.cleared,false);});
test('T8: an unsplit level8 reaching the exit is not success',()=>{const s=new TutorialSession(7);for(let j=0;j<6;j++)s.step('parent',0,-1);s.step('parent',1,0);assert.equal(s.cleared,false);});
test('blocked/invalid input leaves moves, history, state untouched',()=>{const s=new TutorialSession(0),before=s.serialize();assert.equal(s.step('parent',8,0).ok,false);assert.equal(s.serialize(),before);assert.equal(s.undo(),false);});
test('preview uses the same real move and never mutates session',()=>{const s=new TutorialSession(4),before=s.serialize(),p=s.preview('parent',1,1);assert.equal(s.serialize(),before);s.step('parent',1,1);assert.deepEqual(p.state,s.state);assert.deepEqual(p.record,s.records.at(-1));});
test('corrupt saves are rejected atomically',()=>{const s=new TutorialSession(0),before=s.serialize();for(const raw of ['{',JSON.stringify({version:1,lesson:0,actions:[['parent',8,0]]}),JSON.stringify({version:1,lesson:7,actions:[]})]){assert.equal(s.restore(raw),false);assert.equal(s.serialize(),before);}});
test('T7 actually falls and merges; generation and final boards differ',()=>{const s=new TutorialSession(6);s.step('parent',1,0);assert(s.records[0].events.some(e=>e.type==='fall'));assert(s.records[0].events.some(e=>e.type==='merge'));assert.notDeepEqual(s.records[0].spawn.actors,s.state.actors);});
test('T4 cannot pass with irrelevant frog move and diagonal approach to the target',()=>{const s=new TutorialSession(3);for(const a of [['friend',-1,0],['parent',1,0],['parent',-1,1]])assert(s.step(...a).ok);assert.equal(s.cleared,false);});
