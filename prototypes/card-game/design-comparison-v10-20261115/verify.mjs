import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const out=process.argv[2];assert(out,'Pass built V10 path');
assert(fs.existsSync(path.join(out,'game/app.mjs')),'Independent formal UI has not been built');
const {renderCard}=await import('./render.mjs');
const d=JSON.parse(fs.readFileSync(path.join(out,'data.json'))),map=Object.fromEntries(d.cards.map(c=>[c.id,c]));
for(const c of d.cards){const normal=renderCard(c,{catalog:map,eggData:d.egg});assert(!normal.includes('v10-copy'),'No normal body');const detail=renderCard(c,{detail:true,catalog:map,eggData:d.egg});assert(detail.includes('v10-copy'));const escaped=c.text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');assert(detail.includes(escaped),c.id+' exact full effect');}
assert(!renderCard({hidden:true,cardId:d.cards[0].id},{catalog:map}).includes(d.cards[0].name),'Hidden identity');
const main=d.cards.find(c=>c.type==='main'),projected={...main,id:'instance:1',cardId:main.id,power:99,wisdom:88};assert(renderCard(projected,{catalog:map}).includes('>99<'),'Live stats override catalog');
const egg=renderCard(null,{egg:true,eggData:d.egg});assert(!egg.includes('v8-cost'));assert(!egg.includes('v8-stats'));assert(!egg.includes('v8-rare'));assert(!egg.includes('v10-copy'));
const manifest=JSON.parse(fs.readFileSync(path.join(out,'preservation.json')));for(const f of manifest.unchanged){const b=fs.readFileSync(path.join(out,'game',f.path));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),f.sha256,f.path);}
const research=JSON.parse(fs.readFileSync(path.join(out,'research/name-image-research.json')));assert.equal(research.stages.length,32);assert.equal(research.stages.filter(c=>c.divergent).length,19);assert.equal(new Set(research.stages.map(c=>c.cardID)).size,32);
assert.equal(d.cards.length,459);assert.equal(d.cards.filter(c=>c.additional).length,7);console.log(JSON.stringify({cards:459,additional:7,fullEffectStrings:459,hiddenProtected:true,projectedStats:true,eggProtected:true,unchangedFormalFiles:manifest.unchanged.length,names:19}));
const lover=d.cards.find(c=>c.married);assert(!renderCard({...lover,legacyRules:true},{detail:true,catalog:map}).includes(lover.married),'Legacy rules must not show new marriage ability');
for(const p of ['bgm-v2.js','bgm-subapps.js','assets/bgm/catalog.js','assets/bgm/card-2.m4a','assets/bgm/var-card-late.m4a','assets/bgm/var-card-win.m4a','assets/bgm/jingle-card-lose.m4a'])assert(fs.existsSync(path.join(out,'runtime',p)),'Missing formal BGM '+p);
for(const f of manifest.runtime){assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(out,'runtime',f.path))).digest('hex'),f.sha256);}
const {execFileSync}=await import('node:child_process');const formal=execFileSync('git',['show',manifest.formalCommit+':prototypes/card-game/ui-presentation.mjs'],{encoding:'utf8'});const built=fs.readFileSync(path.join(out,'game/ui-presentation.mjs'),'utf8');assert.equal(built.slice(built.indexOf("import {relatedChapter}")).replace('function officialCardMarkup(','export function cardMarkup(').replace('function officialEggCardMarkup(','export function eggCardMarkup('),formal,'All other formal UI functions unchanged');
assert.equal(new Set(d.cards.map(c=>c.color)).size,14);
