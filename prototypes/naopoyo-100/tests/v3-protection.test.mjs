import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {stageByNumber} from '../stage-order.mjs';
import {stages} from '../stages.mjs';
import {cleanProgress,boardSignature,replayActions} from '../session.mjs';
import {createGameState,gameMove,isComplete} from '../engine.mjs';
test('V3 retains every approved physics, layout, input, illustration and save source',()=>{
 const root=new URL('../../../',import.meta.url),pins=JSON.parse(fs.readFileSync(new URL('docs/naopoyo-100-v3/protected-sha256.json',root)));
 for(const [p,h]of Object.entries(pins))assert.equal(createHash('sha256').update(fs.readFileSync(new URL(p,root))).digest('hex'),h,p);
});
test('display number resolves to stable stage ID after reordering, without moving reviews',()=>{
 const sample=[{id:'31',number:1},{id:'01',number:2}];
 assert.equal(stageByNumber(sample,'1').id,'31');assert.equal(stageByNumber(sample,'02').id,'01');assert.equal(stageByNumber(sample,'garbage').id,'31');
 const p=cleanProgress({cleared:['31'],reviews:{'31':{note:'二つの名札'}},last:{id:'31'}});assert.equal(p.reviews[sample[0].id].note,'二つの名札');assert.deepEqual(p.cleared,['31']);
});
test('every V3 sample can resume and undo through unchanged snapshot/save helpers',()=>{
 for(const s of stages){const restored=replayActions(s.board,s.solution,createGameState,gameMove);assert.ok(restored,s.id);assert.ok(isComplete(restored.state),s.id);assert.equal(restored.history.length,s.solution.length);const retry=createGameState(s.board);assert.equal(isComplete(retry),false);assert.equal(boardSignature(s.board),boardSignature(structuredClone(s.board)));}
});

test('the curved wind example actually uses every turn rather than walking around it',()=>{
 const stage=stages.find(s=>s.id==='16'),s=createGameState(stage.board),winds=[];
 for(const a of stage.solution){const actor=s.actors.find(v=>v.x===a.x&&v.y===a.y);const r=gameMove(s,actor.id,a.dx,a.dy);winds.push(...r.events.filter(e=>e.catalogId==='field.wind').map(e=>[e.x,e.y,e.dx,e.dy]));}
 assert.deepEqual(winds,[[3,2,1,0],[4,2,0,1],[4,3,0,1],[4,4,1,0]]);assert.ok(isComplete(s));
});
test('critical role proofs belong to the shipped boards and fully exhaust their bounded graph',()=>{
 const rows=JSON.parse(fs.readFileSync(new URL('../../../docs/naopoyo-100-v3/critical.json',import.meta.url)));
 assert.equal(rows.filter(r=>r.id==='100').length,3);
 for(const r of rows){const s=stages.find(s=>s.id===r.id);assert.equal(r.number,s.number);assert.equal(r.boardHash,createHash('sha256').update(JSON.stringify(s.board)).digest('hex'));assert.equal(r.status,'exhausted');assert.ok(r.expanded<r.limit);}
});
