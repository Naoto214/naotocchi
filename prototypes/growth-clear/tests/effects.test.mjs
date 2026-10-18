import test from 'node:test';import assert from 'node:assert/strict';
import {effects} from '../effects.mjs';
import {createSession,applyAction} from '../session.mjs';
test('mixed clear and evolution retain event distinction and empty intermediate board',()=>{const s=createSession(9);s.board[13][0]={id:100,k:0,s:1};s.board[13][1]={id:101,k:1,s:1};const z=applyAction(s,{type:'drop',path:['right','hard']});const f=effects(z.last.waves);assert.ok(f.some(f=>f.events.some(e=>e.mixed)));assert.ok(f.some(f=>f.phase==='pop'&&!f.board[13][0]));assert.ok(f.reduce((n,f)=>n+f.duration,0)<z.last.waves.length*500);});
test('reduced motion preserves results without moving phases',()=>{const s=createSession(1);const z=applyAction(s,{type:'drop',path:['hard']});assert.ok(effects(z.last.waves,true).every(f=>f.phase==='result'));});
