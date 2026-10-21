import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import crypto from 'node:crypto';
import {spriteSpec,fitSprite} from '../sprites.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('../../../docs/naopoyo-rescue-design-20261021/source-manifest.json',import.meta.url)));
for(const species of ['dog','fish','penguin','frog'])for(let level=1;level<=8;level++)test(`${species} ${level}: official PNG is intact and fitted inside tile`,()=>{
 const spec=spriteSpec(species,level),entry=manifest.assets.find(a=>a.path===spec.path);
 assert.ok(entry);const bytes=fs.readFileSync(new URL('../../../'+spec.path,import.meta.url));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),entry.sha256);
 const fitted=fitSprite(spec.crop,{x:.08,y:.04,w:.84,h:.64});
 assert.ok(fitted.x>=.08-1e-9&&fitted.y>=.04-1e-9);
 assert.ok(fitted.x+fitted.w<=.92+1e-9&&fitted.y+fitted.h<=.68+1e-9);
 assert.ok(spec.crop[0]<=entry.alpha_bbox[0]&&spec.crop[1]<=entry.alpha_bbox[1]);
 assert.ok(spec.crop[0]+spec.crop[2]>=entry.alpha_bbox[2]&&spec.crop[1]+spec.crop[3]>=entry.alpha_bbox[3]);
});
test('owl is the official companion, missing species is rejected',()=>{
 assert.equal(spriteSpec('owl').path,'assets/characters/companions/owl.png');
 assert.throws(()=>spriteSpec('cat',1));assert.throws(()=>spriteSpec('dog',9));
});
