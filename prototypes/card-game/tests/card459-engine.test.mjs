import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createGame,DEFAULT_DECK,VERSION,save,restore,validate,view} from '../engine.mjs';
import {RULES} from '../rules.mjs';
import {marriedAbilitiesActive} from '../lover-married.mjs';
const approved=JSON.parse(fs.readFileSync(new URL('./fixtures/approved-seven-v18.json',import.meta.url)));
test('seven programs are the approved programs without experimental additions',()=>{
 const expected={};vm.runInNewContext(approved.rules,{add:(id,rule)=>expected[id]=rule});
 for(const [id,rule] of Object.entries(expected))assert.deepEqual(RULES[id],JSON.parse(JSON.stringify(rule)),id);
});
test('new games use version nine, fixed growth ceiling, and public final round',()=>{
 const s=createGame(1);assert.equal(VERSION,'hotseat-9');assert.deepEqual(s.life,{final:10,events:[]});
 assert.equal(view(s,'A').life.final,10);assert.equal(marriedAbilitiesActive(s),true);
 s.round=12;s.life.final=12;s.players.A.time=12;assert.equal(validate(s),true);
 s.life.final=13;assert.throws(()=>validate(s));
});
test('versions two through eight retain old state/save shape and reject new cards',()=>{
 const deck=[...DEFAULT_DECK];deck[0]='W-time-x';
 for(let n=2;n<=8;n++){
 const version=`hotseat-${n}`,s=createGame(17,undefined,version);
 assert.equal(s.life,undefined);assert.deepEqual(restore(save(s)),s);
 assert.throws(()=>createGame(17,{A:deck,B:DEFAULT_DECK},version));
 }
});
