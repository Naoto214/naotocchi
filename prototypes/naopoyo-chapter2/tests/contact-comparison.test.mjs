import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {stages} from '../stages.mjs';import {ExampleReplay} from '../example-replay.mjs';import {ForestSession,visualActors} from '../session.mjs';import {complete,mass,validState} from '../../naopoyo-v2/engine.mjs';
import {comparisonStage,scenes,saveKey} from '../contact-comparison/model.mjs';
for(const stage of stages)test(`new ${stage.number}: full witness, every frame, save/Undo/retry`,()=>{
 const b=comparisonStage(stage,'B'),path=JSON.parse(fs.readFileSync(new URL(`../examples/${stage.number}.json`,import.meta.url))).path,r=new ExampleReplay(b,path),q=new ForestSession(b),total=mass(q.state);
 for(const step of path){const old=structuredClone(q.state),a=q.state.actors.find(a=>a.x===step.at[0]&&a.y===step.at[1]),p={x:a.x+.5,y:a.y+.5};q.begin(a.id,p);q.travel({x:p.x+step.d[0],y:p.y+step.d[1]});q.end();assert.ok(q.lastResults[0].ok);assert.equal(mass(q.state),total);assert.ok(validState(b,q.state));
  for(const f of q.motion){q.motion=[f];for(let i=0;i<=20;i++){f.elapsed=f.duration*i/20;assert.ok(visualActors(q).every(a=>Number.isFinite(a.x)&&Number.isFinite(a.y)&&Number.isInteger(a.level)&&a.level>=1&&a.level<=8));}}
  q.animate(10000);const z=new ForestSession(b,q.serialize());assert.ok(z.restored);assert.deepEqual(z.state,q.state);z.undo();assert.deepEqual(z.state,old);
  r.next();assert.deepEqual(r.session.state,q.state);
 }
 assert.ok(complete(q.state));r.previous();r.next();assert.ok(complete(r.session.state));q.reset();assert.deepEqual(q.state,new ForestSession(b).state);
});
test('comparison scenes and keys isolate A/B and original play',()=>{assert.ok(scenes.some(s=>s.id.includes('8-8')));const a=comparisonStage(stages[0],'A'),b=comparisonStage(stages[0],'B');assert.equal(a.movementRules,'contact-v1');assert.equal(b.movementRules,'contact-v2');assert.equal(stages[0].movementRules,'contact-v1');assert.notEqual(saveKey(a,'A'),saveKey(b,'B'));assert.match(saveKey(b,'B'),/^naopoyo\.contact-experiment\./);});
