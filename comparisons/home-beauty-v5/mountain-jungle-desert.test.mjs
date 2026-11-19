import test from 'node:test';
import assert from 'node:assert/strict';
import {drawMountainJungleDesert, terrainBreeze} from './mountain-jungle-desert.mjs';

const scene={region:'jungle',width:390,height:585,seconds:5,time:'day',season:'summer',weather:'rain',strength:1,opacity:1};
const off={motion:false,light:false,water:false,particles:false,magic:false};
function trace(state){
  const actions=[];
  const ctx=new Proxy({}, {get:(_,k)=>(...args)=>actions.push([k,...args]),set:(_,k,v)=>{actions.push([k,v]);return true;}});
  drawMountainJungleDesert(ctx,state);return actions;
}
test('inactive regions, strength zero and transparent fade layers do no work',()=>{
 for(const patch of [{region:'home'},{strength:0},{opacity:0},{width:0}]) assert.deepEqual(trace({...scene,...patch}),[]);
});
test('rain drops move with time and have a distinct fall from the canopy',()=>{
 const wet={...scene, effects:{...off,particles:true}};
 const commands=trace(wet);
 assert.ok(commands.some(c=>c[0]==='stroke'));
 assert.notDeepEqual(commands,trace({...wet,seconds:9}));
 assert.deepEqual(trace({...wet,reduced:true,seconds:5}),trace({...wet,reduced:true,seconds:20}));
 assert.ok(!trace({...wet,weather:'snow'}).some(c=>c[0]==='stroke'));
});
test('wind fronts reach neighboring locations at different times and evolve over minutes',()=>{
 const a=terrainBreeze(23,.21),b=terrainBreeze(23,.84);
 assert.notEqual(a,b);assert.notEqual(a,terrainBreeze(203,.21));assert.ok(Math.abs(a)<=1.8);
});
test('mineral sand saltation stays inside the dune band',()=>{
 const paths=trace({...scene,region:'desert',weather:'sunny',effects:{...off,particles:true}});
 const points=paths.filter(c=>c[0]==='moveTo'||c[0]==='lineTo');
 assert.ok(points.length>20);assert.ok(points.every(([,x,y])=>x>=0&&x<=1000&&y>360&&y<770));
 const rain=trace({...scene,region:'desert',weather:'rain',effects:{...off,particles:true}});
 assert.ok(rain.some(c=>c[0]==='stroke'));assert.ok(rain.filter(c=>c[0]==='moveTo').every(([,x,y])=>y<420));
});
