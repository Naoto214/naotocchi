import test from 'node:test';
import assert from 'node:assert/strict';
import {renderClock} from '../life-clock-render.mjs';
import {render as v23} from '../life-clock/v23/clock-v23.mjs';
import {sample,overlapCases} from '../life-clock/clock.mjs';
const groups=s=>[...s.matchAll(/<g data-hand="([012])"[^]*?<\/g>/g)];
const norm=s=>s.replace(/v6-\d+/g,'v6-ID').replace(/(?:file|https?):[^"<>]*\/life-clock\/v16\//g,'../v16/');
const strip=s=>norm(s).replace(/<g data-hand="[012]"[^]*?<\/g>/g,'').replace(/<g data-v23-bearing="true">[^]*?<\/g>/g,'').replace(/<defs data-v24-defs="true">[^]*?<\/defs>/g,'');
for(const c of [...overlapCases,{id:'zero',state:{round:0,firstTime:0,secondTime:0}},{id:'twelve',state:{round:12,firstTime:12,secondTime:12}}])test('V24 '+c.id+' preserves dimensions, order, angles and all non-central art',()=>{
 const state=Object.freeze({...sample,...c.state}),s=renderClock(state),old=v23(state);
 assert.deepEqual(groups(s).map(m=>+m[1]),[2,1,0]);
 for(const g of groups(s)){
  const o=groups(old).find(m=>m[1]===g[1])[0];
  for(const a of ['data-angle','data-length','data-width','transform'])assert.equal(g[0].match(new RegExp(a+'="([^"]+)"'))[1],o.match(new RegExp(a+'="([^"]+)"'))[1]);
  assert.match(g[0],/data-v24-blade/);
  assert.match(g[0],/data-v24-ridge/);
 }
 assert.equal(strip(s),strip(old));
});
test('short broad hand tapers, gold does not widen, roots remain beneath bearing',()=>{
 const s=renderClock(sample);
 for(const g of groups(s)){
  const id=+g[1],w=[5,16,32][id],len=[388.8,345.6,302.4][id];
  const d=g[0].match(/data-v24-blade="true" d="([^"]+)"/)[1];
  const nums=d.match(/-?\d+(?:\.\d+)?/g).map(Number),xs=nums.filter((_,i)=>i%2===0),ys=nums.filter((_,i)=>i%2===1);
  assert.equal(Math.max(...xs)-Math.min(...xs),w);
  assert.equal(Math.min(...ys),500-len);
  assert.ok(Math.max(...ys)>500);
  if(id>0)assert.ok(d.includes(` ${500-len*.62} `),'blade tapers before its tip');
 }
});
