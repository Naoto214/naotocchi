import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {drawDungeonWallDetails} from '../dungeon-art.mjs';
import {stages} from '../stages.mjs';import {createState,move,settle,clone,cornerBlocked} from '../engine.mjs';
import * as formal from '../../naopoyo-v2/engine.mjs';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('no dark wall overlays remain',()=>{let calls=0;const c=new Proxy({},{get:()=>()=>calls++,set:()=>true});for(const s of stages)drawDungeonWallDetails(c,s.board,s.scene);assert.equal(calls,0);});
test('rule badge and short teaching copy are always outside dialogs',()=>{const html=read('index.html').split('<dialog')[0];assert.match(html,/id="gravity"/);assert.match(html,/id="lesson-text"/);assert.match(html,/id="lesson-goal"/);assert.match(read('app.mjs'),/↓ 重力あり/);});
test('08 legal and closed angles are the exact official rules',()=>{const s=createState(stages[7].board),a=s.actors[0];for(const e of [formal,{move,cornerBlocked}]){assert.equal(e.cornerBlocked(s,a.x,a.y,1,-1,a),false);assert.equal(e.cornerBlocked(s,a.x,a.y,1,1,a),true);assert.equal(e.move(clone(s),a.id,1,1).reason,'corner');assert.equal(e.move(clone(s),a.id,0,-1).reason,'foothold');assert.equal(e.move(clone(s),a.id,1,-1).ok,true);}});
test('gravity rooms start fully supported, never float until first input',()=>{for(const s of stages){const t=createState(s.board),before=clone(t);settle(t);assert.deepEqual(t,before,s.id);}});
