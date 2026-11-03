import test from 'node:test';
import assert from 'node:assert/strict';
import {render as renderClock} from '../life-clock/v23/clock-v23.mjs';
import {render as v22} from '../life-clock/v19/clock-v19.mjs';
import {sample,overlapCases} from '../life-clock/clock.mjs';
const groups=s=>[...s.matchAll(/<g data-hand="([012])"[^]*?<\/g>/g)];
const norm=s=>s.replace(/v6-\d+/g,'v6-ID').replace(/(?:file|https?):[^"<>]*\/life-clock\/v16\//g,'../v16/');
for(const c of [...overlapCases,{id:'zero',state:{round:0,firstTime:0,secondTime:0}},{id:'twelve',state:{round:12,firstTime:12,secondTime:12}}])test('V23 '+c.id,()=>{
 const state=Object.freeze({...sample,...c.state}),old=norm(v22(state)),s=norm(renderClock(state));
 assert.deepEqual(groups(s).map(m=>+m[1]),[2,1,0]);
 for(const g of groups(s)){
  const o=groups(old).find(m=>m[1]===g[1])[0];
  for(const attr of ['data-angle','data-length','data-width','transform'])assert.equal(g[0].match(new RegExp(attr+'="([^"]+)"'))[1],o.match(new RegExp(attr+'="([^"]+)"'))[1]);
 }
 assert.match(s,/data-v23-bearing="true"/);
 const strip=x=>x.replace(/<g data-hand="[012]"[^]*?<\/g>/g,'').replace(/<defs data-v23-defs="true">[^]*?<\/defs>/g,'').replace(/<g data-v23-bearing="true">[^]*?<\/g>/g,'').replace('<circle cx="512" cy="500" r="17" fill="#DBE3E8" stroke="#FCFDFD" stroke-width="3"/>','');
 assert.equal(strip(s),strip(old),'all non-central SVG must remain identical');
});
test('all supported individual values preserve angles and inputs',()=>{
 for(const key of ['round','firstTime','secondTime'])for(let value=0;value<=12;value++){
  const state=Object.freeze({...sample,[key]:value});
  const a=groups(renderClock(state)).map(m=>[m[1],m[0].match(/data-angle="([^"]+)/)[1]]).sort();
  const b=groups(v22(state)).map(m=>[m[1],m[0].match(/data-angle="([^"]+)/)[1]]).sort();assert.deepEqual(a,b);
 }
});
