import test from 'node:test';
import assert from 'node:assert/strict';
import {stages} from '../stages.mjs';
import {stageThemes} from '../themes.mjs';
import {createState} from '../engine.mjs';
import {pack,restore} from '../store.mjs';
test('24 stable stage IDs and three existing background families',()=>{
 assert.equal(stages.length,24);
 assert.deepEqual(stages.map(s=>s.id),Array.from({length:24},(_,i)=>String(i+1).padStart(2,'0')));
 for(const s of stages){assert.equal(s.w,8);assert.equal(s.h,6);assert.ok(['prison','cavern','castle'].includes(stageThemes[s.id]));}
});
test('every new stage round-trips with old clears and an Undo snapshot',()=>{
 assert.equal(stages.slice(12).length,12);
 for(let i=12;i<24;i++){
 const s=createState(stages[i]),raw=pack(i,s,[s],['01','07','12']);
 assert.equal(JSON.stringify(restore(raw)),raw);
 }
});

import {gateCut,replay} from './expansion-evidence.mjs';
for(const stage of stages.slice(12)){
 test(`new stage ${stage.id}: replay, transformations, Undo and save`,()=>{
 const m=replay(stage);assert.ok(m.merges+m.splits>0);
 if(stage.gravity)assert.ok(m.actorSupportedAscents>0);
 for(const g of stage.gates)assert.ok(m.gatePassages[`${g.x},${g.y}`]>0);
 });
 for(let i=0;i<stage.gates.length;i++)test(`stage ${stage.id} gate ${i}: disconnected mass proves impossibility without victory flags`,()=>{
 assert.equal(gateCut(stage,[i]).status,'proved-impossible');
 });
}
test('cut certificate detects diagonal bypass after a separator wall is removed',()=>{
 const s=structuredClone(stages[12]);s.walls=s.walls.filter(([x,y])=>x!==3||y!==1);
 assert.equal(gateCut(s,[0]).status,'unproved');
});
import fs from 'node:fs';
test('original twelve stage definitions remain byte-for-byte equivalent as data',()=>{
 assert.deepEqual(stages.slice(0,12),JSON.parse(fs.readFileSync(new URL('./original-twelve.json',import.meta.url))));
});
