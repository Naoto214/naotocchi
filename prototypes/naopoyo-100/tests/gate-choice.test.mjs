import test from 'node:test';
import assert from 'node:assert/strict';
import {readChoice,saveChoice,importChoice,DEFAULT_DESIGN,CHOICE_KEY} from '../../naopoyo-shared/gate-choice.mjs';
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}};
test('unselected and corrupt records never select B',()=>{const s=storage();assert.equal(DEFAULT_DESIGN,'A');assert.equal(readChoice(s).record,null);s.setItem(CHOICE_KEY,'{');assert.equal(readChoice(s).record,null);assert.ok(readChoice(s).error)});
test('choice history survives reload and exported record can be imported',()=>{const s=storage();saveChoice(s,'A','2026-11-10T00:00:00.000Z');const result=saveChoice(s,'B','2026-11-10T00:01:00.000Z');assert.equal(result.record.choice,'B');assert.equal(readChoice(s).record.history.length,2);const other=storage();importChoice(other,JSON.stringify(result.record));assert.deepEqual(readChoice(other).record,result.record);assert.equal(DEFAULT_DESIGN,'A')});
test('invalid import does not overwrite a valid choice',()=>{const s=storage();saveChoice(s,'A');for(const bad of ['{}','null','{"choice":"B"}','{'])assert.ok(importChoice(s,bad).error);assert.equal(readChoice(s).record.choice,'A')});
test('unavailable storage cannot report successful persistence',()=>{const s={getItem(){throw Error('blocked')},setItem(){throw Error('quota')}};assert.ok(readChoice(s).error);assert.ok(saveChoice(s,'B').error)});

import {paintGate} from '../../naopoyo-shared/gate-design.mjs';
import {drawGate} from '../../naopoyo-chapter2/gate-art.mjs';
import {paintTile} from '../../../docs/naopoyo-gimmick-atlas-v2/tile-art.mjs';
function recorder(){
 const ops=[],props={globalAlpha:1};const gradient={addColorStop(...a){ops.push(['stop',...a])}};
 return {ops,c:new Proxy(props,{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient')return (...a)=>{ops.push([k,...a]);return gradient};return (...a)=>ops.push([k,...a])},set(t,k,v){t[k]=v;if(typeof v!=='function')ops.push(['set',k,v]);return true}})};
}
globalThis.Path2D=class {constructor(path){this.path=path}};
test('A default replays original painter operations exactly and does not mutate condition',()=>{const a=recorder(),b=recorder(),g=Object.freeze({x:0,y:0,exact:2});paintGate(a.c,g);drawGate(b.c,{...g,pulse:0,occupied:false});assert.equal(JSON.stringify(a.ops),JSON.stringify(b.ops))});
test('B reuses V2 body and substitutes numeric labels without changing condition',()=>{const a=recorder(),g=Object.freeze({x:0,y:0,min:4});paintGate(a.c,g,{design:'B'});assert.ok(a.ops.some(op=>op[0]==='fillText'&&op[1]==='≥4'));assert.ok(!a.ops.some(op=>op[0]==='fillText'&&op[1]==='=2'));assert.deepEqual(g,{x:0,y:0,min:4});const b=recorder();paintTile(b.c,'fixture.gate');assert.equal(JSON.stringify(a.ops.slice(2,-1).map(op=>op[0]==='fillText'?[op[0],'=2',...op.slice(2)]:op)),JSON.stringify(b.ops))});
