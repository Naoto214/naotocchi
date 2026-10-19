import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {CATALOG} from '../full-catalog.mjs';
import {CARD_ART} from '../ui-art.mjs';
const require=createRequire(import.meta.url),sharp=require('sharp'),base=new URL('../',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('./manifest.json',import.meta.url),'utf8'));
const original=JSON.parse(await readFile(new URL('art-pilot/rollout/final-452-20261019/deck-manifest.json',base),'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex'),seen=new Set(),pixels=new Set(),paths=new Set(),derivatives={small:new Set(),large:new Set()};let previewCount=0;
assert.deepEqual(Object.keys(CATALOG).sort(),manifest.cards.map(r=>r.id).sort());
assert.deepEqual(Object.keys(CARD_ART).sort(),manifest.cards.map(r=>r.id).sort());
for(const entry of manifest.cards){
 const approved=original.cards.find(r=>r.id===entry.id);assert.equal(entry.source,approved.illustration);
 const png=await readFile(new URL('art-pilot/'+entry.source,base));assert.equal(sha(png),approved.sha256);assert.ok(!seen.has(approved.sha256));seen.add(approved.sha256);
 const {data:pixelData,info}=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,1536);assert.equal(info.height,1024);const pixelHash=sha(pixelData);assert.ok(!pixels.has(pixelHash),'Duplicate decoded artwork '+entry.id);pixels.add(pixelHash);
 for(const size of ['small','large']){
  const asset=entry[size],buffer=await readFile(new URL(asset.path,base));assert.equal(sha(buffer),asset.sha256);assert.equal(buffer.length,asset.bytes);assert.ok(!derivatives[size].has(asset.sha256),'Duplicate derivative '+entry.id);derivatives[size].add(asset.sha256);assert.equal(CARD_ART[entry.id][size],asset.path);assert.ok(!paths.has(asset.path));paths.add(asset.path);
  const {info}=await sharp(buffer).raw().toBuffer({resolveWithObject:true});assert.equal(info.width,asset.width);assert.equal(info.height,asset.height);
 }
 for(const [kind,width,height] of [['preview',600,900],['small80',80,120],['small110',110,165]]){
  const {info}=await sharp(await readFile(new URL('art-pilot/'+approved[kind],base))).raw().toBuffer({resolveWithObject:true});assert.equal(info.width,width);assert.equal(info.height,height);previewCount++;
 }
}
for(const size of ['small','large'])assert.equal((await readdir(new URL(size+'/',import.meta.url))).length,452);
const result={cards:seen.size,originals_decoded:seen.size,approved_previews_decoded:previewCount,optimized_decoded:paths.size,missing:0,duplicate_originals:0,duplicate_decoded_art:0,duplicate_derivatives:0,totals:manifest.totals,small_decoded_rgba_bytes:384*256*4,large_decoded_rgba_bytes:1152*768*4,original_decoded_rgba_bytes:1536*1024*4,browser_measured:false,iphone_safari_measured:false};
await writeFile(new URL('./verification.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
