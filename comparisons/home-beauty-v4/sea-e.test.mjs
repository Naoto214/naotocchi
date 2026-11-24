import test from 'node:test';
import assert from 'node:assert/strict';
import {seaESwashAt,inSeaEContact,drawSeaE} from './sea-e.mjs';

test('contact follows the scalloped shore at each hour without extending to dry sand',()=>{
  for (const time of ['morning','day','evening','night']) {
    for (const seconds of [0,8.1,21.3,193]) for(const x of [.02,.24,.53,.75,.98]){
      const edge=seaESwashAt(x,seconds,time);
      assert.ok(edge>.57&&edge<.66);
      assert.equal(inSeaEContact(x,edge-.001,time,seconds),true);
      assert.equal(inSeaEContact(x,edge+.001,time,seconds),false);
    }
    assert.equal(inSeaEContact(.5,.2,time,3),false);
    assert.equal(inSeaEContact(NaN,.51,time,3),false);
  }
});
test('stage guards allow comparisons without any active decoration',()=>{
  for(const state of [{variant:'D3'},{opacity:0},{strength:0},{region:'forest'},{effects:{motion:false,light:false,water:false,particles:false}}])
    assert.doesNotThrow(()=>drawSeaE(null,{region:'sea',variant:'E1',width:390,height:585,opacity:1,strength:1,...state}));
});
