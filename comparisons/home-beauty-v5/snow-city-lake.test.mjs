import test from 'node:test';
import assert from 'node:assert/strict';
import {drawSnowCityLake} from './snow-city-lake.mjs';

const fake=()=>{
 const calls=[];
 const ctx=new Proxy({},{get(_,name){
  if(name==='createRadialGradient'||name==='createLinearGradient')return (...args)=>{calls.push([name,...args]);return {addColorStop:(...stop)=>calls.push(['stop',...stop])};};
  return (...args)=>calls.push([name,...args]);
 },set(_,k,v){calls.push([k,typeof v==='object'?'gradient':v]);return true;}});
 return {ctx,calls};
};
const base={variant:'E3',width:375,height:562.5,time:'night',season:'winter',weather:'snow',strength:1,opacity:1,seconds:12,effects:{}};
const regions=['snow','city','memory_lake'];
const trace=s=>{const r=fake();drawSnowCityLake(r.ctx,s);return r.calls};
const draws=log=>log.filter(x=>['fill','stroke','drawImage','fillRect'].includes(x[0]));
test('zero strength, all switches off, other variants and zero fade issue no draws',()=>{
 for(const region of regions)for(const change of [{strength:0},{opacity:0},{variant:'D3'},{effects:{wind:false,motion:false,particles:false,light:false,water:false,magic:false}}]){
   assert.equal(draws(trace({...base,region,...change})).length,0);
 }
});
test('reduced motion is temporally stable in all three scenes',()=>{
 for(const region of regions){const s={...base,region,reduced:true};assert.deepEqual(trace({...s,seconds:8}),trace({...s,seconds:65}));}
});
test('hour, weather, season and intensity affect selected regional effects',()=>{
 for(const region of regions)for(const time of ['morning','day','evening','night']){
  const s={...base,region,time};
  const a=trace(s);
  assert.equal(a.filter(([k])=>k==='save').length,a.filter(([k])=>k==='restore').length);
  assert.notDeepEqual(a,trace({...s,strength:.55}));
  assert.notDeepEqual(a,trace({...s,seconds:43.5}));
 }
 const snow={...base,region:'snow',weather:'sunny'};
 assert.notDeepEqual(trace(snow),trace({...snow,season:'summer'}));
 const city={...base,region:'city',time:'evening'};
 assert.notDeepEqual(trace(city),trace({...city,weather:'rain'}));
 const lake={...base,region:'memory_lake'};
 assert.deepEqual(trace({...lake,weather:'rain'}),trace({...lake,weather:'snow'}));
});
