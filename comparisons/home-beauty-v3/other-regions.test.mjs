import test from 'node:test';
import assert from 'node:assert/strict';
import {drawFullRegion} from './other-regions.mjs';
function record() {
  const calls=[];
  const ctx=new Proxy({}, {get(_,k){
    if(k==='createRadialGradient'||k==='createLinearGradient')return ()=>({addColorStop(){}});
    return (...args)=>{calls.push([k,...args]);};
  },set(_,k,v){calls.push([k,v]);return true;}});
  return {ctx,calls};
}
const state={seconds:8,time:'evening',season:'winter',weather:'rain',physical:1,magic:.7,gust:.2,variant:'D2',opacity:1};
test('isolated switches leave an empty overlay in each landscape',()=>{
  for(const region of ['sea','city','snow','memory_lake']){
    const {ctx,calls}=record();
    drawFullRegion(ctx,{...state,region,effects:{water:false,light:false,particles:false,motion:false}});
    assert.ok(!calls.some(c=>['drawImage','fill','stroke','fillRect'].includes(c[0])));
  }
});
test('weather and time affect the layered rendering',()=>{
  for(const region of ['sea','city','snow','memory_lake']){
    const render=extra=>{const {ctx,calls}=record();drawFullRegion(ctx,{...state,region,effects:{water:true,particles:true,light:true,motion:true},...extra});return calls};
    const after=render({seconds:12});
    assert.notDeepEqual(render({}),after);
    assert.equal(after.filter(c=>c[0]==='save').length,after.filter(c=>c[0]==='restore').length);
    assert.ok(after.flat().filter(x=>typeof x==='number').every(Number.isFinite));
  }
});
