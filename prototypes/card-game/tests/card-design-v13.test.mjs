import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {CATALOG} from '../full-catalog.mjs';
import {cardMarkup,eggCardMarkup,eggDetailMarkup,EGG_PRINTED_TEXT,escapeHTML} from '../ui-presentation.mjs';
import {marriedText} from '../lover-married.mjs';
import {CARD_ART} from '../ui-art.mjs';
const base=new URL('../',import.meta.url),sha=b=>createHash('sha256').update(b).digest('hex');
test('all 452 formal cards: one-line names, normal face has no effect, detail contains official effects',()=>{
 assert.equal(Object.keys(CATALOG).length,452);
 for(const c of Object.values(CATALOG)){
  const normal=cardMarkup(c),detail=cardMarkup(c,{detail:true});
  assert.match(normal,/v11-card/);assert.match(normal,/data-normal="true"/);assert.doesNotMatch(normal,/v10-copy|v10-effect|v10-ability/);
  assert.ok(normal.includes(escapeHTML(c.type==='main'?(c.form??c.name.replace(/[①-⑧]/g,'')):c.name)));
  assert.equal((normal.match(/class="v8-title"/g)||[]).length,1);
  assert.match(detail,/data-normal="false"/);assert.ok(detail.includes(escapeHTML(c.text)),c.id);
  if(marriedText(c.id))assert.ok(detail.includes(escapeHTML(marriedText(c.id))),c.id);
  assert.equal(normal.includes('v8-rare'),Boolean(c.rare),c.id);
  assert.ok(normal.includes(CARD_ART[c.id].small));assert.ok(detail.includes(CARD_ART[c.id].large));
  if(c.type==='main'){assert.match(normal,/ちから/);assert.match(normal,/ちえ/);assert.equal((normal.match(/v8-stat-label/g)||[]).length,2);assert.doesNotMatch(normal,/<span class="v8-stat-label"><svg/);}
 }
});
test('hidden projected identity never renders art or effects',()=>{
 const hidden=cardMarkup({...Object.values(CATALOG)[0],hidden:true},{detail:true});
 assert.match(hidden,/card-back-approved.png/);assert.doesNotMatch(hidden,/v8-title|v10-copy|art-delivery/);
});
test('egg uses common frame, normal has no rules, detail has printed text once and no duplicate external explanation',()=>{
 assert.match(eggCardMarkup(),/v11-card/);assert.doesNotMatch(eggCardMarkup(),/v10-copy/);
 assert.ok(eggCardMarkup({detail:true}).includes(EGG_PRINTED_TEXT));
 const detail=eggDetailMarkup();assert.equal(detail.split(EGG_PRINTED_TEXT).length-1,1);assert.doesNotMatch(detail,/effect-scroll|detail-copy|たんじょうできます/);
});
test('approved starfish originals exact hashes and runtime delivered artifacts match provenance',()=>{
 const manifest=JSON.parse(readFileSync(new URL('art-pilot/approved-starfish-20261119/manifest.json',base)));
 const delivery=JSON.parse(readFileSync(new URL('art-delivery/manifest.json',base)));
 const expected=['0edbe53840584f4f5771351a83d870f95175eba06fa23acce038cd23d001df7e','8ebb8cedc8e44044d06580e1628894db5123f872feffe73c784b29a4f69574b2','fe5241d984ba09ea4b49a319f70cfc820413288e156bf079de38aa737ffefd5e'];
 manifest.cards.forEach((c,i)=>{assert.equal(c.sha256,expected[i]);assert.equal(sha(readFileSync(new URL('art-pilot/approved-starfish-20261119/'+c.file,base))),expected[i]);const r=delivery.cards.find(r=>r.id===c.id);assert.equal(r.source_sha256,expected[i]);for(const size of ['small','large']){assert.equal(CARD_ART[c.id][size],r[size].path);assert.equal(sha(readFileSync(new URL(r[size].path,base))),r[size].sha256);}});
});
test('formal catalog and effects are byte-preserved from integration baseline; other 449 art mappings unchanged',()=>{
 const baseline='38b4e9d0';
 for(const file of ['full-catalog.mjs','lover-married.mjs','cards.mjs','art-pilot/approved-colors.mjs','art-pilot/symbols/attributes.mjs'])assert.equal(sha(readFileSync(new URL(file,base))),sha(execFileSync('git',['show',`${baseline}:prototypes/card-game/${file}`])));
 const old=execFileSync('git',['show',`${baseline}:prototypes/card-game/ui-art.mjs`],{encoding:'utf8'});const oldMap=JSON.parse(old.slice(old.indexOf('Object.freeze(')+14,old.lastIndexOf(');')));
 for(const [id,art] of Object.entries(CARD_ART))if(!/^M-starfish-0[1-3]$/.test(id))assert.deepEqual(art,oldMap[id]);
});

test('only the inner face draws the frame, and failed art retains the existing fallback contract',()=>{
 const css=readFileSync(new URL('card-design/cards.css',base),'utf8');
 assert.match(css,/\.card-face\.v11-card::before,\.card-face\.v11-card::after\{content:none\}/);
 for(const c of Object.values(CATALOG)){const html=cardMarkup(c);assert.match(html,/class="art-fallback"/);assert.match(html,/<img class="dedicated-art"/);}
});
