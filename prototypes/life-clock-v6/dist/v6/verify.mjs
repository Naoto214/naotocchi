import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const file=new URL('./clock-v6.mjs',import.meta.url);
assert.ok(fs.existsSync(file),'V6 renderer must exist');
const {render,sample,variants,overlapCases}=await import(file);
const {render:old}=await import('../v5/clock-v5.mjs');
const tail=s=>s.slice(s.indexOf('<g data-hand='));
const nums=s=>[...s.matchAll(/<text [^>]*>[^<]*<\/text>|data-(?:main-number|growth-number|end-number|angle|growth-ticks|main-ticks)="[^"]*"/g)].map(m=>m[0]);
let cases=0;
for(const variant of Object.keys(variants))for(const [k,max,step,min] of [['round',12,1,0],['firstTime',12,1,0],['secondTime',12,1,0],['firstGrowth',100,5,0],['secondGrowth',100,5,0],['end',12,1,10]])for(let n=min;n<=max;n+=step){const state={...sample,[k]:n},a=render(state,{variant}),b=old(state,{variant:'A'});assert.equal(tail(a),tail(b));assert.deepEqual(nums(a),nums(b));assert.equal((a.match(/data-complete=/g)||[]).length,(state.firstGrowth===100?1:0)+(state.secondGrowth===100?1:0));cases++;}
for(const v of Object.keys(variants))for(const c of overlapCases)assert.equal(tail(render({...sample,...c.state},{variant:v})),tail(old({...sample,...c.state})));
const normalize=s=>s.replace(/finish-\d+/g,'finish');assert.equal(normalize(render(sample,{variant:'v5'})),normalize(old(sample,{variant:'A'})));
for(const v of Object.keys(variants))for(const s of [{...sample,round:13},{...sample,firstGrowth:99},{...sample,end:9}])assert.throws(()=>render(s,{variant:v}));
for(const [v,w] of [['bezel1',20],['bezel15',30],['bezel2',40]])assert.ok(render(sample,{variant:v}).includes(`data-bezel-width="${w}"`));
for(const v of Object.keys(variants))assert.equal(render(sample,{variant:v,sameScale:true}).match(/viewBox="[^"]*"/)[0], 'viewBox="-24 -24 1072 1072"');

const originals={'../clock.mjs':'99b152bc841930d1b08475ef3698063d6574776b','../v5/clock-v5.mjs':'075b7c28dc960d415f1e2d3a580f12ea67bd4a13','../assets/dial-art-v4.png':'ad12e1cba480ecb50e3a5c7cf91653779cbc2b78','../assets/official-card-back.png':'021b8063699745cb8d9bd4cbb7301fe1464308d7'};
for(const [p,h] of Object.entries(originals)){const b=fs.readFileSync(new URL(p,import.meta.url));assert.equal(createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex'),h);}
const result={cases,overlapCases:Object.keys(variants).length*overlapCases.length,pass:true,scope:'hands/numbers/valid and invalid values/0-100/V5 exact baseline/bezel widths'};fs.writeFileSync(new URL('evidence/verification.json',import.meta.url),JSON.stringify(result,null,2));console.log(result);
