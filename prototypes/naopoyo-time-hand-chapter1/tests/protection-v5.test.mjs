import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {drawDungeonFloor,drawDungeonWallDetails} from '../dungeon-art.mjs';import {stages} from '../stages.mjs';
const root=new URL('../',import.meta.url);
test('V4 input, physics, app flow and shared motion/painter/timing sources stay byte identical',()=>{
 const hashes=JSON.parse(fs.readFileSync(new URL('../../docs/naopoyo-time-hand-chapter1-20261102/v5/protected-hashes.json',root)));
 for(const [file,hash]of Object.entries(hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(file,root))).digest('hex'),hash,file);
});
test('dungeon scenery is pure and its grilles are confined to existing wall cells',()=>{
 for(const stage of stages){const board=structuredClone(stage.board),before=JSON.stringify(board),fills=[];const c=new Proxy({},{get:(o,k)=>k in o?o[k]:(...a)=>{if(k==='fillRect')fills.push(a)},set:(o,k,v)=>(o[k]=v,true)});
 drawDungeonWallDetails(c,board,stage.scene);
 for(const [x,y,w,h]of fills)assert.ok(board.walls.some(([wx,wy])=>x>=wx&&y>=wy&&x+w<=wx+1&&y+h<=wy+1));
 drawDungeonFloor(c,board,stage.scene);assert.equal(JSON.stringify(board),before);
 }
});
test('actor/effect painter block in D renderer is unchanged from V4',()=>{
 const current=fs.readFileSync(new URL('draw.mjs',root),'utf8'),old=fs.readFileSync(new URL('archive/v4/draw.mjs',root),'utf8');
 assert.equal(current.slice(current.indexOf(' const cell=width/8')),old.slice(old.indexOf(' const cell=width/8')));
});
