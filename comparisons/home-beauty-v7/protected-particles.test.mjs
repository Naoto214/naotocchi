import test from 'node:test';
import assert from 'node:assert/strict';
import {composeNature} from './paint.mjs';

const normal = {count:1, size:1, speed:1, wind:1};
const extreme = {count:1.5, size:2, speed:.25, wind:2};
const rect = {left:0, top:0, width:320, height:480};

// Trace particle geometry and pigment through the same compositor the home uses.
function trace([region, time, season, weather], variant, fall, reduced = false, split = null) {
  const effects = {particles:true, depth:true, gusts:true, motion:false, canopy:false, light:false,
    water:false, waves:false, foam:false, reflections:false, ground:false, magic:false, shafts:false};
  globalThis.window = {innerWidth:rect.width, HomeBeauty:{sampleClock:t=>t,
    settings:{region,time,season,weather,variant,fall,effects,
      strength:1,split:split ?? .5,compareSplit:split!==null,leafColor:'red'}}};
  const calls = [];
  const gradient = {addColorStop:(...args)=>calls.push(['addColorStop',...args])};
  const ctx = new Proxy({canvas:undefined}, {
    get(target,key) {
      if (key in target) return target[key];
      return (...args)=>{
        calls.push([key,...args]);
        if (key==='createLinearGradient' || key==='createRadialGradient') return gradient;
      };
    },
    set(target,key,value) {
      calls.push([key,value===gradient?'gradient':value]);
      target[key]=value; return true;
    }
  });
  const image = {src:region+'-'+time+'.webp'};
  composeNature(ctx,rect,rect,{previous:null,image,alpha:1},41.75,reduced);
  return calls;
}

test('extreme leaf sliders preserve spring petals, rain, snow and protected autumn regions',()=>{
  const cases=[
    ['forest','day','spring','sunny'], ['forest','day','autumn','rain'],
    ['forest','night','autumn','snow'], ['countryside','evening','autumn','rain'],
    ['countryside','night','autumn','sunny'], ['home','day','autumn','sunny'],
    ['home','day','autumn','rain'], ['snow','night','winter','snow']
  ];
  for (const scene of cases) {
    const expected=trace(scene,'E3plus',normal);
    for (const variant of ['E3plus','A','B','C'])
      assert.deepEqual(trace(scene,variant,extreme),expected,scene.join('/')+' '+variant);
  }
});

test('only the candidate dry autumn particle pass changes, and reduced motion suppresses it',()=>{
  for (const scene of [['forest','day','autumn','sunny'],['countryside','evening','autumn','cloudy']]) {
    const expected=trace(scene,'E3plus',normal);
    assert.deepEqual(trace(scene,'E3plus',extreme),expected);
    for (const variant of ['A','B','C']) {
      assert.notDeepEqual(trace(scene,variant,normal),expected);
      assert.deepEqual(trace(scene,variant,extreme,true,.491),trace(scene,'E3plus',normal,true));
    }
  }
});
