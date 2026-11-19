import test from 'node:test';
import assert from 'node:assert/strict';
import {drawNature,waterMask,inContactWater} from './nature.mjs';

test('water anchors separate shallow surf, dry sand and lake bank',()=>{
  assert.ok(waterMask('sea').length>=6);
  assert.ok(waterMask('memory_lake').length>=6);
  assert.equal(inContactWater('sea',.52,.51),true);
  for(const [r,x,y] of [['sea',.52,.73],['sea',.52,.25],['forest',.52,.51],['memory_lake',.52,.72]])
    assert.equal(inContactWater(r,x,y),false);
});
test('controls and strength isolate the paintings and bound command count',()=>{
 const trace=[];
 const ctx=new Proxy({createRadialGradient(){return {addColorStop(){}}},createLinearGradient(){return {addColorStop(){}}}},{get(obj,k){return k in obj?obj[k]:(...args)=>{assert.ok(args.every(v=>typeof v!=='number'||Number.isFinite(v)));trace.push(k)}}});
 const base={region:'sea',time:'day',season:'summer',weather:'sunny',variant:'B',seconds:4,width:390,height:585,effects:{water:true,light:true,particles:true}};
 for(const region of ['sea','forest','snow','city','memory_lake'])for(const time of ['morning','day','evening','night'])for(const weather of ['rain','snow','sunny','cloudy']){
  trace.length=0;drawNature(ctx,{...base,region,time,weather});assert.ok(trace.length<2000);
  assert.equal(trace.filter(v=>v==='save').length,trace.filter(v=>v==='restore').length);
 }
 trace.length=0;drawNature(ctx,{...base,opacity:0});assert.deepEqual(trace,[]);
 trace.length=0;drawNature(ctx,{...base,variant:'current'});assert.deepEqual(trace,[]);
 trace.length=0;drawNature(ctx,{...base,effects:{water:false,light:false,particles:false}});assert.deepEqual(trace,[]);
});
