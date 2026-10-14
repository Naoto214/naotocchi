import test from 'node:test';
import assert from 'node:assert/strict';
import {standardRules} from '../rules.mjs';
import {createSession,applyAction,replay,stateHash} from '../session.mjs';
import * as opt from '../optimization.mjs';
test('laboratory four-kind experiment retains evolution score and exact bag',()=>{const s=opt.start({kinds:4},10);assert.equal(s.rules.kinds,4);assert.equal(s.rules.scoreMode,'evolution');assert.equal(s.bag.items.length,16);assert.deepEqual([...new Set(s.bag.items)].sort(),[0,1,2,3]);assert.equal(standardRules().kinds,5);});
test('six-kind laboratory really draws six, not selected five',()=>{const s=opt.start({kinds:6},10);assert.equal(s.bag.items.length,24);assert.equal(new Set(s.bag.items).size,6);assert.equal(s.bag.selected,undefined);});
test('objective policy takes immediate 08 death even at low board utility',()=>{const s=opt.start({},1);s.board[13][0]={id:1,k:0,s:8};s.board[13][1]={id:2,k:1,s:8};s.nextId=3;s.gauge=8;const a=opt.choose(s,'death');assert.equal(a.type,'transform');assert.equal(applyAction(s,a,false).last.deaths,2);});
test('policy is independent of hidden seed and bag',()=>{const s=opt.start({},1),t=structuredClone(s);t.seed=999;t.bag.state=999;t.bag.items.reverse();assert.deepEqual(opt.choose(s,'lookahead'),opt.choose(t,'lookahead'));});
test('win/over/censoring distinguish and account 08 born then dying in same action',()=>{const s=opt.start({},1);s.board[13][0]={id:1,k:0,s:8};s.board[13][1]={id:2,k:1,s:8};s.nextId=3;s.gauge=8;const a={type:'transform',x:1,y:13,to:0};const m=opt.metrics(s,[a]);assert.equal(m.status,'win');assert.equal(m.two08,true);assert.equal(m.initial08,2);assert.equal(opt.metrics(opt.start({},1),[]).status,'censored');});
test('trial replay uses unchanged common engine',()=>{const t=opt.trial({id:'test',policy:'death'},200,{drops:3,actions:20});const s=replay({version:t.initial.version,initial:t.initial,actions:t.actions,hash:t.hash});assert.equal(stateHash(s),t.hash);assert.equal(t.metrics.status,'censored');});

test("08 creation counter uses actual resulting stage",()=>{const s=opt.start({},1);s.board[13][0]={id:1,k:0,s:7};s.board[13][1]={id:2,k:1,s:7};s.nextId=3;s.gauge=8;const m=opt.metrics(s,[{type:"transform",x:1,y:13,to:0}]);assert.equal(m.created,1);assert.equal(m.first08Action,1);assert.equal(m.two08,false);});
test('screen seed205 cannot choose an egg overlapping active spawn pair',async()=>{const fs=await import('node:fs'),{toolTransaction}=await import('../live-tools.mjs'),{spawnPose}=await import('../session.mjs');const s=JSON.parse(fs.readFileSync(new URL('./fixtures/optimization-live-egg.json',import.meta.url)));const a=opt.choose(s,'death');assert.doesNotThrow(()=>a.type==='drop'?applyAction(s,a):toolTransaction(s,spawnPose(s.rules),a));});
