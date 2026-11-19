import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {render,sample,angles,handProfiles,overlapCases,finishes} from './clock-v5.mjs';
import {render as original} from '../clock.mjs';
const checks=[];let cases=0;
const check=(name,fn)=>{fn();checks.push({name,pass:true});};
const refs={palette:'C1',profile:'classic',art:'../assets/dial-art-v4.png'};
const hands=s=>s.slice(s.indexOf('<g data-hand='));
const numbers=s=>[...s.matchAll(/<text [^>]*>[^<]*<\/text>|data-(?:main-number|growth-number|end-number|angle|growth-ticks|main-ticks)="[^"]*"/g)].map(x=>x[0]);
check('All 84 independently varied valid values in all 3 variants: exact V4 hand markup and numbers',()=>{
for(const variant of ['A','B','C'])for(const [key,max,step,start] of [['round',12,1,0],['firstTime',12,1,0],['secondTime',12,1,0],['firstGrowth',100,5,0],['secondGrowth',100,5,0],['end',12,1,10]])for(let n=start;n<=max;n+=step){
 const state={...sample,[key]:n},a=render(state,{variant}),b=original(state,refs);assert.equal(hands(a),hands(b));assert.deepEqual(numbers(a),numbers(b));if(variant==='C')assert.equal(a,b);cases++;
}});
check('Classic exact ratios and widths, overlap6 and 0/100 identical',()=>{assert.deepEqual(handProfiles.classic.ratios,[.9,.8,.7]);assert.deepEqual(handProfiles.classic.widths,[5,16,32]);for(const c of overlapCases)for(const variant of ['A','B','C']){const state={...sample,...c.state};assert.equal(hands(render(state,{variant})),hands(original(state,refs)));}for(const n of [0,100]){const s=render({...sample,firstGrowth:n,secondGrowth:n});assert.equal((s.match(/data-complete=/g)||[]).length,n===100?2:0);}});
check('Every A/B differs only in the 3 material colors after unique IDs are normalized',()=>{const normalize=s=>s.replace(/finish-\d+/g,'finish').replace(/#(?:E7D9DF|D5E3DD|E8E1D1|D5E2E8)/g,'SUB');assert.equal(normalize(render(sample,{variant:'A'})),normalize(render(sample,{variant:'B'})));});
check('All detail crops and immutable C baseline',()=>{for(const crop of ['full','growth','end','hands'])for(const variant of ['A','B','C']){const a=render(sample,{variant,crop}),b=original(sample,{...refs,crop});assert.equal(hands(a),hands(b));assert.equal(a.match(/viewBox="[^"]*"/)[0],b.match(/viewBox="[^"]*"/)[0]);if(variant==='C')assert.equal(a,b);}});
check('Individual detail crops preserve complete hand and number markup',()=>{for(const variant of ['A','B','C'])for(const crop of ['first','second']){const a=render(sample,{variant,crop}),b=original(sample,refs);assert.equal(hands(a),hands(b));assert.deepEqual(numbers(a),numbers(b));assert.ok(a.includes(crop==='first'?'216 390 220 220':'588 390 220 220'));}});
check('Invalid values remain rejected',()=>{for(const state of [{...sample,round:13},{...sample,firstGrowth:99},{...sample,secondGrowth:-5},{...sample,end:9}])for(const variant of ['A','B','C'])assert.throws(()=>render(state,{variant}));});
check('No original tracked file changed',()=>{const root=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();const isSite=fs.existsSync(path.join(root,'.openai/hosting.json'));const ref=isSite?'db58c99a83189baecf605912089f87b67922a63f':'87ea8e7c793615a35c2471798a68388dcba20b1c';const prefix=isSite?'dist/v5/':'prototypes/life-clock-v4/dist/v5/';const changed=execFileSync('git',['diff',ref,'--name-only'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);assert.ok(changed.every(p=>p.startsWith(prefix)));});
check('No game or save access in V5',()=>{for(const file of ['app.mjs','clock-v5.mjs'])assert.ok(!/localStorage|sessionStorage|indexedDB|fetch\(/.test(fs.readFileSync(new URL(file,import.meta.url),'utf8')));});
const linear=x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4},lum=c=>{const p=c.slice(1).match(/../g).map(x=>linear(parseInt(x,16)));return .2126*p[0]+.7152*p[1]+.0722*p[2];},contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
const contrastResults=Object.entries(finishes).map(([variant,bgs])=>({variant,numberMinimum:Math.min(...bgs.map(bg=>contrast('#234154',bg))),red:contrast('#91394B',bgs[0]),green:contrast('#25765B',bgs[1]),gold:contrast('#BE9650',bgs[2])}));
check('Subdial numbers >=4.5, red/green hands >=3',()=>{for(const c of contrastResults){assert.ok(c.numberMinimum>=4.5);assert.ok(c.red>=3);assert.ok(c.green>=3);}});
const hashes={};for(const f of ['clock.mjs','app.mjs','index.html','assets/dial-art-v4.png','assets/official-card-back.png'])hashes[f]=createHash('sha256').update(fs.readFileSync(new URL('../'+f,import.meta.url))).digest('hex');
const result={checks,cases,failed:0,contrastResults,note:'Gold hand contrast is reported, not claimed to pass 3:1. V4 hand color/geometry preserved.',originalHashes:hashes};fs.writeFileSync(new URL('evidence/verification.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
