import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';import {daypartAt} from './daypart.mjs';
const require=createRequire(import.meta.url),sharp=require('sharp'),root=path.dirname(fileURLToPath(import.meta.url));
const cases=[[4,59,'night'],[5,0,'morning'],[9,59,'morning'],[10,0,'day'],[15,59,'day'],[16,0,'evening'],[18,59,'evening'],[19,0,'night'],[23,59,'night'],[0,0,'night']];
for(const [h,m,v]of cases)assert.equal(daypartAt(h,m),v);
const counts={};for(let m=0;m<1440;m++){const k=daypartAt(Math.floor(m/60),m%60);counts[k]=(counts[k]||0)+1;}assert.deepEqual(counts,{night:600,morning:300,day:360,evening:180});
for(const v of [-1,24,1.5,NaN])assert.throws(()=>daypartAt(v),RangeError);
const rows=JSON.parse(fs.readFileSync(path.join(root,'assets.json')));assert.equal(rows.length,12);assert.equal(new Set(rows.map(r=>r.id)).size,12);
for(const a of rows){const p=path.join(root,'images',a.id+'.webp'),b=fs.readFileSync(p),m=await sharp(b).metadata();assert.equal(m.width,1024);assert.equal(m.height,1536);assert.equal(b.length,a.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),a.sha256);assert(b.length<800000);}
const registry=JSON.parse(fs.readFileSync(path.join(root,'original-registry.json')));assert.equal(registry.length,13);assert.equal(new Set(registry.map(r=>r.region)).size,13);assert(registry.every(r=>r.original));
for(const [region,expected] of [['home','e138c6e62ebae0cf3ac47c7daf8de634ca93ef0f212d3cd62b2ffb051d275593'],['forest','e0dd899f2e2338c9ca58f791664737108605cadc439e0f5d797e98c1cea08ea5'],['city','6017830525bd802477a59aaa16afe11ea745c1684fd1a6b929851d11af75b373']])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'originals',region+'.png'))).digest('hex'),expected);
const js=fs.readFileSync(path.join(root,'gallery.mjs'),'utf8');assert(!/localStorage|sessionStorage|script\.js|home-production/.test(js));
console.log(JSON.stringify({boundaryCases:cases.length,minutes:1440,invalidHours:4,imagesVerified:12,regions:13,originalHashes:3,totalImageBytes:rows.reduce((n,a)=>n+a.bytes,0),maximumImageBytes:Math.max(...rows.map(a=>a.bytes)),gameImports:false},null,2));
