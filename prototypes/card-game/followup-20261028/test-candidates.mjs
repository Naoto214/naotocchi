// 直接テストの無いカードから、リスクの高いものだけを優先順位付きで抽出する（読み取り専用・対戦は行わない）。
// 入力: PR #459 の cards-452.json（testRefs）と、実装の宣言的プログラム RULES。
// 除外: 「同じ仕組みの署名（トリガー種別・op・条件・コスト種別）」が、直接テストのある別カードに存在するもの。
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url)),CG=path.resolve(HERE,'..');
await import(path.join(CG,'engine.mjs'));const {RULES}=await import(path.join(CG,'rules.mjs'));const {CATALOG}=await import(path.join(CG,'full-catalog.mjs'));
const audit=JSON.parse(fs.readFileSync(path.join(CG,'full-audit-20261028/cards-452.json'),'utf8'));
const tested=new Set(audit.filter(r=>r.testRefs>0).map(r=>r.id));
const walk=(x,f)=>{if(Array.isArray(x))x.forEach(v=>walk(v,f));else if(x&&typeof x==='object'){f(x);Object.values(x).forEach(v=>walk(v,f));}};
function sig(id){const r=RULES[id];if(!r)return {ops:new Set(),whens:new Set(),conds:new Set(),flags:new Set(),json:''};const ops=new Set(),whens=new Set(),conds=new Set(),flags=new Set();
 walk(r,o=>{if(typeof o.op==='string')ops.add(o.op);if(typeof o.when==='string')whens.add(o.when);if(typeof o.kind==='string')flags.add('kind:'+o.kind);if(typeof o.condition==='string')conds.add(o.condition);if(o.cost)flags.add('cost:'+o.cost);});
 for(const k of ['preventions','replacements','costModifiers','passive','triggers','reserve','extraTime','variants'])if(r[k])flags.add(k);
 return {ops,whens,conds,flags,json:JSON.stringify(r)};}
const key=s=>[...s.ops].sort().join('+')+'|'+[...s.whens].sort().join('+')+'|'+[...s.conds].sort().join('+')+'|'+[...s.flags].sort().join('+');
const testedKeys=new Set([...tested].filter(i=>RULES[i]).map(i=>key(sig(i))));
const TAGS={
 simultaneous:(s,t,r)=>(r?.triggers?.length>1)||(s.whens.size>=2),
 chain:(s,t)=>s.ops.has('reserve')||s.flags.has('preventions')||s.flags.has('replacements')||/無効/.test(t),
 retarget:(s,t)=>['redirect','retarget','swap','moveEquipment','forSelected','selectedMove'].some(o=>s.ops.has(o))&&/対象|つけ替|移/.test(t),
 facedown:(s,t)=>/preparedHidden|faceDown|hidden|trap/i.test(s.json)||/伏せ|しかけ/.test(t),
 costReduction:(s,t)=>s.flags.has('costModifiers')||s.flags.has('extraTime')||/時[^、。]*(少なく|軽減|増や)/.test(t),
 noMain:(s,t)=>/メインが(場を離れ|ない)|メイン不在|メインがいな/.test(t)||s.json.includes('"noMain"'),
 saveReplay:(s,t)=>['search','reorderTop','declaredTop','deepseaFishing','growthVariant','inspect','shuffle','random'].some(o=>[...s.ops].some(x=>x.includes(o)))||/onceName|"limit"/.test(s.json)||/山札の(上から|一番上)[^。]*(見|公開)/.test(t)};
const WEIGHT={simultaneous:2,chain:3,retarget:2,facedown:2,costReduction:2,noMain:1,saveReplay:3};
const rows=[];
for(const a of audit){if(a.testRefs>0)continue;const id=a.id,t=CATALOG[id].text,s=sig(id),r=RULES[id];const tags=Object.entries(TAGS).filter(([,f])=>f(s,t,r)).map(([k])=>k);
 if(!tags.length)continue;const covered=testedKeys.has(key(s));const score=tags.reduce((n,k)=>n+WEIGHT[k],0)+(covered?-100:0);
 rows.push({id,name:a.name,type:a.type,tags,score,coveredBySameSignature:covered,rulingDocs:a.rulingDocRefs,text:t});}
rows.sort((x,y)=>y.score-x.score||y.rulingDocs-x.rulingDocs||x.id.localeCompare(y.id));
const priority=rows.filter(r=>!r.coveredBySameSignature);
const summary={noDirectTest:audit.filter(r=>r.testRefs===0).length,withRiskTag:rows.length,excludedAsCommonSignatureTested:rows.length-priority.length,priority:priority.length,
 byTag:Object.fromEntries(Object.keys(TAGS).map(k=>[k,priority.filter(r=>r.tags.includes(k)).length])),top:priority.slice(0,30).map(r=>r.id)};
fs.writeFileSync(path.join(HERE,'test-candidates.json'),JSON.stringify({summary,rows:priority},null,1));
fs.writeFileSync(path.join(HERE,'test-candidates.csv'),'﻿id,name,type,score,tags,rulingDocs,text\n'+priority.map(r=>[r.id,r.name,r.type,r.score,r.tags.join('|'),r.rulingDocs,'"'+r.text.replace(/"/g,'""')+'"'].join(',')).join('\n')+'\n');
console.log(JSON.stringify(summary,null,1));
