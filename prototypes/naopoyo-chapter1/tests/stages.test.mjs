import test from 'node:test';import assert from 'node:assert/strict';
import {stages} from '../stages.mjs';
import {WorldSession} from '../../naopoyo-world/session.mjs';
import {mass,validState} from '../../naopoyo-v2/engine.mjs';
test('ten permanent IDs, dog-only, standard 8x8 and valid initial state',()=>{assert.equal(stages.length,10);assert.equal(new Set(stages.map(s=>s.id)).size,10);for(const s of stages){const q=new WorldSession(s);assert.equal(s.w,8);assert.equal(s.h,8);assert.ok(s.actors.every(a=>a.species==='dog'));assert.ok(validState(s,q.state));assert.ok(mass(q.state)>0);assert.equal(s.events.length,0);assert.equal(s.gravity,false)}});
