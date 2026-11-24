import test from 'node:test';
import assert from 'node:assert/strict';
import {forestWind,fullProfile,forestMasks} from './full-motion.mjs';

test('wind evolves continuously over three minutes with quiet and strong passages',()=>{
 const gusts=Array.from({length:600},(_,i)=>forestWind(i*.5).gust);
 assert.ok(Math.max(...gusts)>.9);
 assert.ok(gusts.filter(g=>g<.01).length>200);
 assert.ok(Math.max(...gusts.slice(1).map((g,i)=>Math.abs(g-gusts[i])))<.3);
 assert.notEqual(forestWind(0).bend,forestWind(180).bend);
});
test('modes differ in nature and magic even at equal gain, zero strength is quiet',()=>{
 const a=fullProfile('D1',1),b=fullProfile('D2',1),c=fullProfile('D3',1);
 assert.ok(a.physical> b.physical && b.magic>c.magic && c.magic>a.magic);
 assert.deepEqual(fullProfile('D1',0),{physical:0,magic:0});
});
test('leaf masks remain on authored canopy and ground vegetation',()=>{
 for(const m of forestMasks){assert.ok(m.u-m.w/2>=0&&m.u+m.w/2<=1&&m.v-m.h/2>=0&&m.v+m.h/2<=1);}
 assert.ok(forestMasks.length>=8);
});
