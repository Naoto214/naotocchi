// Research outputs only. Does not write runtime/catalog/assets or refresh reviewed inputs.
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {CATALOG} from '../../prototypes/card-game/full-catalog.mjs';
import {CARD_ART} from '../../prototypes/card-game/ui-art.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));process.chdir(ROOT);
const DIR='docs/content-provenance-20261021/', BASE='a037b3abe4f97b6e9bfb4838e854161c53ece6ba';
const check=process.argv.includes('--check'),read=p=>fs.readFileSync(p,'utf8'),json=p=>JSON.parse(read(p));
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const assert=(x,m)=>{if(!x)throw Error(m);};
const baselinePaths=new Set(execFileSync('git',['ls-tree','-r','--name-only',BASE],{encoding:'utf8',maxBuffer:100e6}).trim().split('\n'));
const evidence=(path,needle,reason)=>{const line=read(path).split('\n').findIndex(x=>x.includes(needle))+1;assert(line>0,`Evidence missing ${path}: ${needle}`);return {path,line,ref:BASE,reason};};
const out=(name,data)=>{const value=typeof data==='string'?data:JSON.stringify(data,null,2)+'\n';if(check)assert(read(DIR+name)===value,`Stale output ${name}`);else fs.writeFileSync(DIR+name,value);};
const context={};vm.runInNewContext(read('character-world-master.v1.js')+';globalThis.master=NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;',context);
const m=context.master, species=Object.values(m.playerSpecies).flat().filter(x=>x?.stages),companions=[...m.companions.normal,...m.companions.rare];
const support=json(DIR+'support-origins.json'), main=json(DIR+'main-content.json');
assert(main.source_commit===BASE,'Main inventory anchor drift');
const plays=new Map(main.entities.filter(x=>x.kind==='play').map(x=>[x.id,x]));
const artManifest=json('prototypes/card-game/art-delivery/manifest.json');
const arts=new Map(artManifest.cards.map(x=>[x.id,x]));
const inventory=json('prototypes/card-game/art-pilot/inventory-452.json');
const artOrigins=new Map(inventory.cards.map(x=>[x.card_id,x]));
const mapFile='docs/card-game/32-play-source-map.md', maps=new Map();
for(const line of read(mapFile).split('\n')){const a=line.match(/^\| (G-\S+) \| `([^`]+)` \|/);if(a)maps.set(a[1],a[2]);}
const cards=[], findings=[];
assert(new Set(main.entities.map(e=>e.entity_key)).size===main.entities.length,'Duplicate main entity key');
for(const e of main.entities)assert(e.id&&e.name&&e.condition&&e.rewards&&e.evidence.length,'Incomplete main entity '+e.id);
function addFinding(type,status,cardIds,description,evidenceList,extra={}){findings.push({id:`F${String(findings.length+1).padStart(3,'0')}`,type,status,card_ids:cardIds,description,evidence:evidenceList,...extra});}
for(const c of Object.values(CATALOG).sort((a,b)=>a.id.localeCompare(b.id,'en'))){
 const source='docs/card-game/'+c.source.split('#')[0];assert(hash(read(source))===c.source_sha256,`Canonical text hash drift ${c.id}`);
 const sourceEv=evidence(source,read(source).includes(c.id)?c.id:c.source.split('#')[1],'Current catalog explicitly identifies this canonical source; file SHA-256 verified.');
 let origins=[],status='source_present';
 if(c.type==='main'){
  const sid=c.species.slice(2),s=species.find(x=>x.id===sid);assert(s&&s.stages[c.stage-1],c.id+' species/stage missing');
  origins=[{kind:'character',subkind:'player_stage',id:`${sid}:${String(c.stage).padStart(2,'0')}`,species_id:sid,stage:c.stage,name:s.stages[c.stage-1],species_name:s.label,confidence:'confirmed',current_status:'present',evidence:[sourceEv,evidence('docs/card-game/26-full-card-pool-inventory-1.md','通常：22','Explicit main master species ×8 provenance contract.'),evidence('character-world-master.v1.js',`id: '${sid}', label:`, 'Current authoritative species and eight stage labels.')]}];
  if(c.form!==s.stages[c.stage-1]){status='confirmed_form_label_difference';addFinding('stage_label_difference','confirmed_difference',[c.id],`カード形態名「${c.form}」／現本編「${s.stages[c.stage-1]}」。表示差は確定。画像・効果の意味まで不適切とは断定しない。`,origins[0].evidence,{before:c.form,current:s.stages[c.stage-1]});}
  const baseName=c.name.replace(/[①②③④⑤⑥⑦⑧]/g,'');
  if(baseName!==s.label){status='confirmed_species_display_name_difference';addFinding('species_display_name_difference','confirmed_difference_not_proven_rename',[c.id],`カード種族名「${baseName}」／本編「${s.label}」。生活史の別時期を示す呼称の可能性を含めて確認。`,origins[0].evidence,{before:baseName,current:s.label});}
 }else if(c.type==='companion'||c.type==='partner'){
  const id=c.id.slice(2),a=(c.type==='companion'?companions:m.partners).find(x=>x.id===id);assert(a,c.id+' missing');
  origins=[{kind:'character',subkind:c.type,id, name:a.label,confidence:'confirmed',current_status:'present',evidence:[evidence(source,`id=${id}`, 'Canonical source explicitly names main character stable ID.'),evidence('character-world-master.v1.js',`id: '${id}', label:`, 'Current authoritative character.')]}];
  if(c.name!==a.label){status='confirmed_name_difference';addFinding('character_name_difference','confirmed_difference',[c.id],`${c.name} / ${a.label}`,origins[0].evidence);}
 }else if(c.type==='play'){
  const id=maps.get(c.id),p=plays.get(id);assert(id&&p,'No explicit play mapping '+c.id);
  origins=[{kind:'play',id,name:p.name,category:p.category,confidence:'confirmed',current_status:'present',evidence:[evidence(mapFile,`| ${c.id} |`, 'Explicit card stable ID → game stable ID source map.'),...p.evidence.map(e=>({path:e.file,line:e.line,ref:BASE,reason:'Current game registry / title / entry / reward code.'}))]}];
  if(c.name!==p.name){status='confirmed_display_name_difference';addFinding('play_display_name_difference','confirmed_difference_not_proven_rename',[c.id],`カード「${c.name}」／本編一覧「${p.name}」。カード固有名・テーマ名・一覧名の差を含み、全件を改名漏れと断定しない。`,origins[0].evidence,{before:c.name,current:p.name});}
 }else{assert(support[c.id], 'Missing support origins '+c.id);origins=structuredClone(support[c.id]);for(const o of origins){if(o.kind==='achievement'&&o.id.startsWith('GOAL_TIER.')){o.subkind='goal';}o.evidence=o.evidence.map(e=>({...e,ref:BASE}));}
  if(origins.some(x=>x.current_status==='name_changed')){status='confirmed_source_name_change';addFinding('source_name_change','confirmed_difference',[c.id],origins[0].notes,origins[0].evidence);}
 }
 for(const o of origins){if(o.kind==='world'){o.subkind='region';o.kind='place';}if(o.kind==='author'){o.subkind='author';o.kind='character';}}
 for(const o of origins){for(const e of o.evidence){assert(baselinePaths.has(e.path),'Evidence file absent '+e.path);assert(Number.isInteger(e.line)&&e.line>0&&e.line<=read(e.path).split('\n').length,'Evidence line invalid '+e.path);}}
 for(const o of origins)o.entity_key=(o.subkind==='goal'?'goal':o.kind)+':'+o.id;
 const a=arts.get(c.id),i=artOrigins.get(c.id);assert(a&&i&&CARD_ART[c.id], 'Art mapping missing '+c.id);
 for(const size of ['small','large']){assert(a[size].path===CARD_ART[c.id][size],'Art URL mismatch');assert(baselinePaths.has('prototypes/card-game/'+a[size].path),'Art path missing');}
 const primary=origins[0],naopoyo=c.type==='main'?{status:'shared_main_catalog',species_id:primary.species_id,stage:primary.stage,reference:'naopoyo-relations.json#/species',rescue_status:primary.species_id==='dog'?'draft_same_id_not_final_art_selection':'not_selected_in_rescue_draft',note:'main legacy modes share31 species×8; rescue fish must not be assumed to mean clownfish/salmon.'}:{status:'no_direct_card_link_found',note:'共通モチーフや達成条件と、カード直接実装の依存を区別する。'};
 cards.push({card_id:c.id,name:c.name,category:c.type,rarity:c.rare?'rare':'normal',deck_copy_limit:c.rare?1:3,effect_summary:c.text,effect_summary_policy:'Exact current text retained to avoid lossy summary; card rules are game-specific adaptations.',canonical_source:{...sourceEv,anchor:c.source.split('#')[1],sha256:c.source_sha256},origins,provenance_confidence:origins.some(o=>o.confidence==='confirmed')?'confirmed':origins.some(o=>o.confidence==='inferred')?'inferred':'unknown',main_status:origins.map(o=>({entity_key:o.entity_key,status:o.current_status})),naopoyo,illustration:{inventory_source_path:i.source_path,inventory_source_ref:i.source_ref,supporting_source:i.supporting_source,inventory_classification:i.classification,original_path:'prototypes/card-game/art-pilot/'+a.source,original_sha256:a.source_sha256,small:a.small,large:a.large,evidence:[evidence('prototypes/card-game/ui-art.mjs',`"${c.id}"`,'Published illustration keyed by stable card ID.'),evidence('prototypes/card-game/art-pilot/inventory-452.json',`"card_id": "${c.id}"`,'Recorded production source/identity; historical source_ref is not current main.')],semantic_review:'Not all452 illustrations visually re-reviewed in this provenance survey; metadata linkage and git tree presence checked.'},consistency_status:status,change_impact:{source_keys:origins.map(o=>o.entity_key),review:['card name/form and canonical source document','dedicated illustration source + small/large exports','effect theme only; do not automatically change mechanics','naopoyo species/labels if adopted','rulebook, search and collection presentation'],protected:['stable card ID','452-card set','rare flag and deck limits','effect text and CPU semantics','saved decks and records catalog'],policy:'impact-policy.md'}});
}
assert(cards.length===452&&new Set(cards.map(c=>c.card_id)).size===452,'452 coverage');
// Reverse edges are historical motif relationships, not an assertion of live runtime imports.
const reverse={};for(const c of cards)for(const o of c.origins){const r=reverse[o.entity_key]??={entity_key:o.entity_key,kind:o.kind,id:o.id,name:o.name,card_ids:[],confidence:o.confidence,evidence:o.evidence};r.card_ids.push(c.card_id);}
const mainLinked=structuredClone(main);for(const e of mainLinked.entities){e.related_card_ids=reverse[e.entity_key]?.card_ids??[];e.card_relation=e.related_card_ids.length?'explicit_origin_or_reward_chain':'no_direct_origin_proved';e.naopoyo_relation=e.kind==='play'?'別作品。共通するパズル要素のみでは同一コンテンツと判定しない。':'naopoyo-relations.json参照。直接の実績書き込みを推定しない。';}
const unknown=cards.filter(c=>c.provenance_confidence==='unknown');
for(const c of unknown)addFinding('unknown_origin','unconfirmed',[c.card_id],'No explicit source proof found',[]);
const sourceCounts={};for(const c of cards)for(const kind of new Set(c.origins.map(o=>o.kind)))sourceCounts[kind]=(sourceCounts[kind]??0)+1;
const summary={baseline:BASE,total:cards.length,categories:Object.fromEntries([...new Set(cards.map(c=>c.category))].map(k=>[k,cards.filter(c=>c.category===k).length])),confirmed:cards.filter(c=>c.provenance_confidence==='confirmed').length,inferred:cards.filter(c=>c.provenance_confidence==='inferred').length,unknown:unknown.length,source_kind_card_counts:sourceCounts,direct_badge_origin_cards:cards.filter(c=>c.origins.some(o=>o.kind==='achievement'&&o.subkind!=='goal')).length,goal_reward_origin_cards:cards.filter(c=>c.origins.some(o=>o.subkind==='goal')).length,findings:findings.length,findings_by_type:Object.fromEntries([...new Set(findings.map(x=>x.type))].map(k=>[k,findings.filter(x=>x.type===k).length])),art_links:arts.size,source_document_hash_mismatches:0};
out('cards.json',{schema_version:1,source_commit:BASE,cards});out('source-to-cards.json',{schema_version:1,source_commit:BASE,relations:Object.values(reverse).sort((a,b)=>a.entity_key.localeCompare(b.entity_key,'en'))});out('main-content-linked.json',mainLinked);out('findings.json',{schema_version:1,scope:'Card-level static differences; see cross-series-findings.json for cross-cutting issues.',findings});out('summary.json',summary);
const esc=x=>String(x??'').replaceAll('|','\\|').replaceAll('\n',' ');
const cols=['card_id','name','category','rarity','effect_summary','provenance_confidence','consistency_status'];
const csv=s=>'"'+String(s??'').replaceAll('"','""')+'"';
out('cards.csv',[ [...cols,'origin_keys','origin_names','small_art','large_art','canonical_source','origins_json','main_status','naopoyo','change_impact'].map(csv).join(','),...cards.map(c=>[...cols.map(k=>c[k]),c.origins.map(o=>o.entity_key).join(';'),c.origins.map(o=>o.name).join(';'),c.illustration.small.path,c.illustration.large.path,c.canonical_source.path,JSON.stringify(c.origins),JSON.stringify(c.main_status),JSON.stringify(c.naopoyo),JSON.stringify(c.change_impact)].map(csv).join(','))].join('\n')+'\n');
out('CARD-INDEX.md','# 正式452枚カード由来索引\n\n完全な効果・複数由来・根拠・アート・変更影響は `cards.json` / `cards.csv`。確定は由来の確定であり、現在の内容一致の認定ではない。\n\n|ID|正式名|分類|由来（現在名）|整合性|\n|---|---|---|---|---|\n'+cards.map(c=>`|${c.card_id}|${esc(c.name)}|${c.category}|${c.origins.map(o=>esc(o.entity_key+' '+o.name)).join('<br>')}|${c.consistency_status}|`).join('\n')+'\n');
out('FINDINGS.md','# カード単位の差異候補\n\n差異の存在と修正の必要性は別判定。表示名の相違には意図的なカード名やランダムテーマも含む。画像を全件目視し直していないため、画像不整合の確定数にはしない。横断的な論点は `CROSS-SERIES.md`。\n\n|ID|種類|カード|判定・根拠|\n|---|---|---|---|\n'+findings.map(f=>`|${f.id}|${f.type}|${f.card_ids.join(', ')}|${esc(f.description)}（${f.evidence[0]?.path}:${f.evidence[0]?.line}）|`).join('\n')+'\n');
const verification={baseline:BASE,checks:{unique_current_cards:452,canonical_text_source_hashes:452,explicit_origin_evidence_cards:cards.filter(c=>c.origins.every(o=>o.evidence.length)).length,art_mapping_and_tree_paths:452,ordinary_play_source_map:100,reverse_edges:cards.reduce((n,c)=>n+c.origins.length,0)},limitations:['No all-game/iPhone reachability run','No all452 visual art semantic review','Origins are historical design links, not necessarily runtime dependency','Draft PR snapshot may advance after this fixed observation']};
out('verification.json',verification);console.log(JSON.stringify(summary,null,2));
const badges=main.entities.filter(e=>e.kind==='achievement');
const badgeImpact=badges.map(e=>({achievement_id:e.id,name:e.name,direct_origin_cards:[],main_dependencies:['endingProgress / all ACHIEVEMENTS → GOAL_TIER.perfect'],conditional_card_theme_review:e.condition.crown_support?['I-naoto_crown']:[],crown_support:e.condition.crown_support,relation_kind:'runtime_main_dependency_not_card_origin',action:'実績名だけの変更からカード改名を自動導出しない。削除・条件変更はPERFECTの分母、履歴互換、crown支援対象を確認。',evidence:[...e.evidence,{file:'script.js',line:2682,end_line:2701},{file:'script.js',line:2805,end_line:2806}]}));
const speciesGroups=species.map(s=>({source_key:'species:'+s.id,name:s.label,card_ids:cards.filter(c=>c.origins.some(o=>o.species_id===s.id)).map(c=>c.card_id),relation:'同一種族の8段階。重複ミスではない。種族設定変更時は8枚まとめて確認。',naopoyo:'naopoyo-relations.json#/species'}));
out('change-impact.json',{schema_version:1,source_commit:BASE,policy:'impact-policy.md',source_changes:Object.values(reverse).map(r=>({...r,review_policy:'preserve_ids_and_mechanics_review_names_art_theme'})),species_groups:speciesGroups,badge_changes:badgeImpact,save_compatibility:{card_id_set:'exact sorted452 IDs required by records parseJournal',evidence:[{path:'prototypes/card-game/records.mjs',line:25},{path:'prototypes/card-game/my-decks.mjs',line:8}],warning:'Removing/renaming IDs can reject existing journals/decks. Display-name-only changes are lower risk but historical display and text-name references need checking.'}});
out('MAIN-LINKS.md','# 本編実績・あそびからの逆引き\n\n正式名称・条件・報酬・実装状態は `main-content-linked.json`。バッジ→カードの直接由来は未確認。クリア目標報酬4件は明示的な由来。実績削除時のPERFECT・かんむりへの間接影響は `change-impact.json` の `badge_changes`。\n\n|種類|ID|正式名|由来が確認されたカード|\n|---|---|---|---|\n'+mainLinked.entities.map(e=>`|${e.kind}|${esc(e.id)}|${esc(e.name)}|${e.related_card_ids.join(', ')||'直接由来未確認'}|`).join('\n')+'\n');
