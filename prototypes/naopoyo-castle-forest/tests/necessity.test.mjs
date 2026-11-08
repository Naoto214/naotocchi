import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {stages} from '../stages.mjs';import {solve} from '../solve.mjs';import {ChapterSession} from '../session.mjs';
for(const stage of stages){
 for(const [i,spike]of stage.board.spikes.entries())test(`${stage.id} split source ${i+1} cannot be omitted`,()=>{const b=structuredClone(stage.board);b.spikes.splice(i,1);const r=solve(b);assert(r.complete);assert.equal(r.path,null);});
 for(const gate of stage.board.gates)test(`${stage.id} exact gate must be traversed`,()=>{const b=structuredClone(stage.board);b.walls.push([gate.x,gate.y]);const r=solve(b);assert(r.complete);assert.equal(r.path,null);});
}
test('reported dead ends restore exactly with Undo and retry',()=>{
 const audit=JSON.parse(fs.readFileSync(new URL('../../../docs/naopoyo-castle-forest-v2/audit.json',import.meta.url)));
 for(const a of audit){const q=new ChapterSession(a.stage-11),initial=q.serialize();for(const step of a.deadExample)assert(q.step(...step).ok);while(q.undo()){}assert.equal(q.serialize(),initial);for(const step of a.deadExample)assert(q.step(...step).ok);q.reset();assert.equal(q.serialize(),initial);}
});
