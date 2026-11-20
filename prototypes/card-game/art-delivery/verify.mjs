import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {CATALOG} from '../full-catalog.mjs';
import {CARD_ART} from '../ui-art.mjs';
const require=createRequire(import.meta.url),sharp=require('sharp'),base=new URL('../',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('./manifest.json',import.meta.url),'utf8'));
const original=JSON.parse(await readFile(new URL('art-pilot/rollout/final-452-20261019/deck-manifest.json',base),'utf8'));
const starfish=JSON.parse(await readFile(new URL('art-pilot/approved-starfish-20261119/manifest.json',base),'utf8'));
const additions=JSON.parse(await readFile(new URL('art-pilot/approved-card459-20261120/manifest.json',base),'utf8'));
const sources=new Map(original.cards.map(card=>[card.id,{...card}]));
assert.equal(sources.size,452);assert.equal(starfish.cards.length,3);assert.equal(additions.cards.length,7);
for(const card of starfish.cards){assert.ok(sources.has(card.id));sources.set(card.id,{id:card.id,illustration:'approved-starfish-20261119/'+card.file,sha256:card.sha256});}
for(const card of additions.cards){assert.ok(!sources.has(card.id),'Duplicate added source '+card.id);sources.set(card.id,card);}
assert.equal(sources.size,459);assert.equal(manifest.count,459);
assert.deepEqual([...sources.keys()].sort(),manifest.cards.map(r=>r.id).sort());
const sha=b=>createHash('sha256').update(b).digest('hex'),seen=new Set(),pixels=new Set(),paths=new Set(),derivatives={small:new Set(),large:new Set()};let previewCount=0;
assert.deepEqual(Object.keys(CATALOG).sort(),manifest.cards.map(r=>r.id).sort());
assert.deepEqual(Object.keys(CARD_ART).sort(),manifest.cards.map(r=>r.id).sort());
for(const entry of manifest.cards){
 const approved=sources.get(entry.id);assert.ok(approved,'Unapproved source '+entry.id);assert.equal(entry.source,approved.illustration);assert.equal(entry.source_sha256,approved.sha256);
 const png=await readFile(new URL('art-pilot/'+entry.source,base));assert.equal(sha(png),approved.sha256);assert.equal(png.length,entry.original_bytes);assert.ok(!seen.has(approved.sha256));seen.add(approved.sha256);
 const {data:pixelData,info}=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,1536);assert.equal(info.height,1024);const pixelHash=sha(pixelData);assert.ok(!pixels.has(pixelHash),'Duplicate decoded artwork '+entry.id);pixels.add(pixelHash);
 for(const size of ['small','large']){
  const asset=entry[size];
  if(approved[size])assert.deepEqual(asset,approved[size],'Approved delivery '+entry.id+' '+size);
  assert.equal(asset.path,`art-delivery/${size}/${entry.id}-${asset.sha256.slice(0,12)}.webp`);
  const buffer=await readFile(new URL(asset.path,base));assert.equal(sha(buffer),asset.sha256);assert.equal(buffer.length,asset.bytes);assert.ok(!derivatives[size].has(asset.sha256),'Duplicate derivative '+entry.id);derivatives[size].add(asset.sha256);assert.equal(CARD_ART[entry.id][size],asset.path);assert.ok(!paths.has(asset.path));paths.add(asset.path);
  const {info}=await sharp(buffer).raw().toBuffer({resolveWithObject:true});assert.equal(info.width,asset.width);assert.equal(info.height,asset.height);
 }
 // Only unchanged approved sources have historical card previews. Replacement/new art
 // is checked above; do not claim historical previews approve these current images.
 for(const [kind,width,height] of (approved.preview?[['preview',600,900],['small80',80,120],['small110',110,165]]:[])){
  const {info}=await sharp(await readFile(new URL('art-pilot/'+approved[kind],base))).raw().toBuffer({resolveWithObject:true});assert.equal(info.width,width);assert.equal(info.height,height);previewCount++;
 }
}
// Retain old approved deliveries for provenance; only the 459 active paths are mapped.
const retainedUnreferenced={};
for(const size of ['small','large']){
 assert.equal(derivatives[size].size,459);
 const files=await readdir(new URL(size+'/',import.meta.url));
 for(const entry of manifest.cards)assert.ok(files.includes(entry[size].path.split('/').at(-1)));
 retainedUnreferenced[size]=files.filter(file=>!paths.has('art-delivery/'+size+'/'+file)).length;
}
for(const key of ['original','small','large'])assert.equal(manifest.totals[key],manifest.cards.reduce((sum,r)=>sum+(key==='original'?r.original_bytes:r[key].bytes),0));
const result={cards:seen.size,originals_decoded:seen.size,approved_previews_decoded:previewCount,current_originals_without_historical_previews:starfish.cards.length+additions.cards.length,retained_unreferenced_deliveries:retainedUnreferenced,optimized_decoded:paths.size,missing:0,duplicate_originals:0,duplicate_decoded_art:0,duplicate_derivatives:0,totals:manifest.totals,small_decoded_rgba_bytes:384*256*4,large_decoded_rgba_bytes:1152*768*4,original_decoded_rgba_bytes:1536*1024*4,browser_measured:false,iphone_safari_measured:false};
// Preserve the historical verification.json; optionally write fresh evidence outside it.
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
