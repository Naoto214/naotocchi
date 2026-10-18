import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {CATALOG} from '../full-catalog.mjs';
import {CARD_ART} from '../ui-art.mjs';
import {CATEGORIES} from '../ui-presentation.mjs';
const out=path.dirname(new URL(import.meta.url).pathname);
const MAIN='5d950d1b88751b202ac2fe2fcb2f3ea7ef0598af';
const BASE='e30b2fed1f5e9143089cec389b2ef183df6c02aa';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:20e6});
const tree=new Map(git('ls-tree','-r',MAIN).trim().split('\n').map(s=>{const [meta,p]=s.split('\t');return [p,meta.split(' ')[2]];}));
const approved=['M-beetle-04','C-cat_friend','P-forest_bear','W-forest','G-fishing-river','I-travel1','E-new-encounter'];
const pilots=[...approved,...JSON.parse(fs.readFileSync(path.join(out,'stage2-scenes.json'))).map(c=>c.id)];
const worlds={city:'city-day-v2',countryside:'countryside-v2',deepsea:'deepsea-v1',desert:'desert-v1',forest:'forest-v1',home:'home-interior-v2',jungle:'jungle-v2',memory_lake:'memory_lake-v1',mountain:'mountain-v1',river_lake:'river-lake-v2',sea:'sea-v1',snow:'snow-v1',star_stop:'star_stop-v1'};
const rows=Object.values(CATALOG).map(c=>{
 let source=CARD_ART[c.id]?.replace('../../','')??'',classification='background_add',note='2D正本の外見を保ち、情景・光・背景を追加。';
 if(c.type==='world'){source=`assets/world/${worlds[c.id.slice(2)]}.webp`;classification='direct_reuse';note='風景画像を再利用可能。横長構図への調整・絵本調の統一は個別判断。';}
 if(c.type==='item'){source=`assets/items/unified/${c.id.slice(2)}.png`;note='最新mainの統一アイテム画像を正本に背景追加。UIブランチの古い仮画像一覧に未登録。';}
 if(c.type==='play'||c.type==='event'){classification='new_scene';note='専用ラスタ画像の対応を確認できず。カード本文を情景根拠とし、登場人物・道具は確認済み正本から選ぶ。';}
 if(source&&!tree.has(source))throw Error(`Missing source ${c.id}: ${source}`);
 const key=c.type==='main'?c.id.slice(2).replace(/-(\d\d)$/,':$1'):['companion','partner'].includes(c.type)?`${c.type}:${c.id.slice(2)}`:'';
 return {card_id:c.id,name:c.name,display_category:CATEGORIES[c.type][0],internal_category:c.type,attribute:c.attribute??'',stage:c.stage??'',existing_ui_art:CARD_ART[c.id]??'',source_path:source,source_ref:source?MAIN:'',source_blob:tree.get(source)??'',classification,existing_card_candidate:c.id==='M-beetle-04'?'prototypes/card-game/ui-assets/pupa-reference-approved.png':'',character_3d_reference:key?`character-3d/spec.js;character-3d/${c.type==='main'?'rollout-spec.js':'nonplayer-spec.js'}; key=${key}`:'',supporting_source:c.type==='play'?'script.js;games.js;game-symbol-art.js':c.type==='world'?'world-scene.js;world-environment.js':'',card_text_source:c.source,pilot:pilots.includes(c.id),production_status:approved.includes(c.id)?'approved_art':pilots.includes(c.id)?'stage2_pending_user_approval':'not_started',notes:note};
});
const counts=rows.reduce((a,r)=>(a[r.internal_category]=(a[r.internal_category]??0)+1,a),{});
if(rows.length!==452||new Set(rows.map(r=>r.card_id)).size!==452)throw Error('Catalog must contain exactly 452 unique IDs');
for(const [k,n] of Object.entries({main:248,companion:26,partner:18,world:13,play:100,item:26,event:21}))if(counts[k]!==n)throw Error(`Count mismatch ${k}`);
fs.writeFileSync(path.join(out,'inventory-452.json'),JSON.stringify({main:MAIN,ui_base:BASE,counts,scope:'Paths and immutable git blobs verified for all mapped images; visual inspection limited to the 23 selected card references. 3D sources are supplemental, not a new 293-actor audit.',cards:rows},null,2)+'\n');
const keys=Object.keys(rows[0]),quote=x=>'"'+String(x??'').replaceAll('"','""')+'"';
fs.writeFileSync(path.join(out,'inventory-452.csv'),'\uFEFF'+[keys.map(quote).join(','),...rows.map(r=>keys.map(k=>quote(r[k])).join(','))].join('\n')+'\n');
fs.writeFileSync(path.join(out,'pilot-cards.json'),JSON.stringify(pilots.map(id=>CATALOG[id]),null,2)+'\n');
console.log(JSON.stringify({cards:rows.length,counts,classifications:rows.reduce((a,r)=>(a[r.classification]=(a[r.classification]??0)+1,a),{}),pilot:pilots.length}));
