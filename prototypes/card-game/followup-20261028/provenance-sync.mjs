// 出典対応表(docs/content-provenance-20261021, 2026-10-21固定の過去版)と、最新mainのカタログを照合する（読み取り専用）。
// 過去版は上書きしない。差分だけを provenance-current-sync.{json,csv} に「現行本文参照表」として出す。
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url)),CG=path.resolve(HERE,'..'),ROOT=path.resolve(CG,'../..');
const {CATALOG}=await import(path.join(CG,'full-catalog.mjs'));
const prov=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/content-provenance-20261021/cards.json'),'utf8'));const list=Array.isArray(prov)?prov:prov.cards;
const REV={'G-doodle-jump':'doc 477 / PR #452（そだち+5の条件を改訂。正式公開済み 2026-10-27, merge 983c7db0）','P-rock_octopus':'doc 476 / PR #449（「別の自分のキャラクター」を「今の装備先とは別の…」へ明確化。処理は不変）'};
const rows=[];let textDiff=0,hashDiff=0;
for(const p of list){const c=CATALOG[p.card_id];const t=p.effect_summary!==c.text,h=p.canonical_source.sha256!==c.source_sha256;if(t)textDiff++;if(h)hashDiff++;
 if(t||h)rows.push({card_id:p.card_id,name:c.name,text_changed:t,source_hash_changed:h,snapshot_text:p.effect_summary,current_text:c.text,snapshot_source_sha256:p.canonical_source.sha256,current_source_sha256:c.source_sha256,current_source:c.source.split('#')[0],revision:REV[p.card_id]??''});}
const summary={snapshot:'docs/content-provenance-20261021 (固定main a037b3ab)',cards:list.length,textDiffCards:textDiff,sourceHashDiffCards:hashDiff,onlyHashDiff:rows.filter(r=>!r.text_changed).map(r=>r.card_id)};
fs.writeFileSync(path.join(HERE,'provenance-current-sync.json'),JSON.stringify({summary,rows},null,1));
const esc=v=>/[",\n]/.test(String(v))?'"'+String(v).replace(/"/g,'""')+'"':String(v);const cols=Object.keys(rows[0]);
fs.writeFileSync(path.join(HERE,'provenance-current-sync.csv'),'﻿'+cols.join(',')+'\n'+rows.map(r=>cols.map(k=>esc(r[k])).join(',')).join('\n')+'\n');
console.log(JSON.stringify(summary,null,1));
