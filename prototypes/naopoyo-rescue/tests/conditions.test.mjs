import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesCondition,conditionLabel} from '../conditions.mjs';
import {createState,move,clone,mass,complete} from '../engine.mjs';
import {pack,restore} from '../store.mjs';
import {stages} from '../stages.mjs';
const stage=(kind,condition,level,species='dog')=>({id:'condition',w:4,h:3,walls:[],spikes:[],gates:kind==='gate'?[{x:1,y:1,...condition}]:[],exits:kind==='exit'?[{x:1,y:1,...condition}]:[],actors:[{id:'a',x:0,y:1,level,species}]});
for(const kind of ['gate','exit'])for(const op of ['exact','min','max'])for(let level=1;level<=8;level++)test(`${kind} ${op} ${level}: all levels and species`,()=>{
 for(let actor=1;actor<=8;actor++)for(const species of ['dog','fish']){
 const condition={[op]:level,species:'dog'},s=createState(stage(kind,condition,actor,species)),total=mass(s);
 const expected=species==='dog'&&(op==='exact'?actor===level:op==='min'?actor>=level:actor<=level);
 assert.equal(move(s,'a',1,0),expected);
 assert.equal(mass(s),total);
 if(expected){assert.equal(s.actors.length,kind==='gate'?1:0);assert.equal(s.rescued,kind==='gate'?0:2**(actor-1));if(kind==='gate')assert.equal(s.gates[0].open,true)}
 }
});
test('condition label distinguishes equality and both limits',()=>{assert.equal(conditionLabel({exact:8}),'=08');assert.equal(conditionLabel({min:1}),'≥01');assert.equal(conditionLabel({max:8}),'≤08');assert.equal(conditionLabel({species:'fish'}),'ALL')});
test('open gate remains passable even for mismatching species',()=>{const s=createState(stage('gate',{exact:1,species:'dog'},1));move(s,'a',1,0);move(s,'a',1,0);s.actors.push({id:'f',x:0,y:1,level:8,species:'fish'});assert.ok(move(s,'f',1,0));assert.equal(s.actors.length,2);assert.equal(s.rescued,0)});
test('same exit rescues multiple actors',()=>{const s=createState(stage('exit',{exact:1},1));s.actors.push({id:'b',x:2,y:1,level:1,species:'dog'});move(s,'a',1,0);assert.equal(complete(s),false);move(s,'b',-1,0);assert.equal(complete(s),true);assert.equal(s.rescued,2)});
test('opened gate and closed undo snapshot survive save restore',()=>{const s=createState(stages[6]);move(s,'a',1,0);const before=clone(s);move(s,'a',1,0);const p=restore(pack(6,s,[before],[]));assert.equal(p.state.gates[0].open,true);assert.equal(p.state.actors.length,1);assert.equal(p.state.rescued,0);assert.equal(p.history[0].gates[0].open,undefined)});
test('species only condition uses the same matcher',()=>{assert.equal(matchesCondition({level:8,species:'fish'},{species:'fish'}),true);assert.equal(matchesCondition({level:1,species:'dog'},{species:'fish'}),false)});
