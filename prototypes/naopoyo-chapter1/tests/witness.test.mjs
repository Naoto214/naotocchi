import test from 'node:test';import {stages} from '../stages.mjs';import {solve} from '../witness.mjs';
for(const s of stages)test(s.id+' all rescued, conserved, restore, Undo, retry',()=>solve(s));
