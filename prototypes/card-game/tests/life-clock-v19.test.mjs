import test from 'node:test';
import assert from 'node:assert/strict';
import {render as renderClock,renderBack} from '../life-clock/v19/clock-v19.mjs';
import {render as v18,renderBack as back18} from '../life-clock/v18/clock-v18.mjs';
import {sample,overlapCases} from '../life-clock/clock.mjs';
const normalize=s=>s.replace(/v6-\d+/g,'v6-ID').replace(/(?:file|https?):[^"<>]*\/life-clock\/v16\//g,'../v16/');
const groups=s=>[...s.matchAll(/<g data-hand="([012])"[^]*?<\/g>/g)];
for(const c of [...overlapCases,{id:'zero',state:{round:0,firstTime:0,secondTime:0}},{id:'twelve',state:{round:12,firstTime:12,secondTime:12}}]){
 test(`V19 ${c.id}: gold/red/green painter order; original shapes and cap preserved`,()=>{
  const state={...sample,...c.state},s=normalize(renderClock(state)),old=normalize(v18(state));
  assert.deepEqual(groups(s).map(m=>Number(m[1])),[0,1,2]);
  for(const m of groups(s))assert.equal(m[0],groups(old).find(g=>g[1]===m[1])[0]);
  const stripped=x=>x.replace(/<g data-hand="[012]"[^]*?<\/g>/g,'');
  assert.equal(stripped(s),stripped(old),'only central group order may change');
  assert.ok(s.indexOf('<circle cx="512" cy="500" r="17"')>s.indexOf('data-hand="2"'),'cap above all hands');
  assert.deepEqual(groups(s).map(m=>Number(m[0].match(/data-length="([^"]+)/)[1])),[388.8,345.6,302.4]);
  assert.deepEqual(groups(s).map(m=>Number(m[0].match(/data-width="([^"]+)/)[1])),[5,16,32]);
 });
}
test('V19 back remains byte-identical to adopted V18',()=>assert.equal(renderBack(),back18()));
