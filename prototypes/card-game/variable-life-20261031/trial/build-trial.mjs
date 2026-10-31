// 本人限定の試遊版「人生延長（仮）・しかける×1枚」（A1t1）を組み立てる。正式ファイルは読むだけで、書き換えない。
// 方式は ../../home-return-20261031/trial/build-trial.mjs と同じ（esbuild で1つにまとめ、claude.ai の非公開 Artifact へ公開）。
// 違い：正式モジュールを一時的な作業用ディレクトリ（出力先の中の .stage/）へ写し、実験と同じパッチ（../lib/life-patches.mjs）と
//       試遊用の画面の小さな追加だけを当ててからまとめる。そだちの上限は100固定（上限解放カードは入れない）。
// 使い方: node prototypes/card-game/variable-life-20261031/trial/build-trial.mjs <出力dir> [--large-only] [--artifact] [--stage-only]
//   要: esbuild（ESBUILD=<esbuildの実行ファイル> で指定可）。--stage-only はパッチ済みモジュールだけを作る（node での検証用）。
// 保存の鍵はすべて `naotocchi-life-trial:` 付き（正式版の対戦・戦績・マイデッキには触れない）。
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {ENGINE,effectsPatches,OBSERVATION,policyPatches,cards} from '../lib/life-patches.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)),CG=path.resolve(HERE,'../..'),REPO=path.resolve(CG,'../..');
const OUT=path.resolve(process.argv[2]??'');if(!process.argv[2]||OUT.startsWith(REPO+path.sep))throw Error('出力先はリポジトリの外を指定してください');
const largeOnly=process.argv.includes('--large-only'),artifact=process.argv.includes('--artifact'),stageOnly=process.argv.includes('--stage-only');
const ESBUILD=process.env.ESBUILD??'esbuild',PREFIX='naotocchi-life-trial:';
const sha=t=>createHash('sha256').update(t).digest('hex');
const officialSha=()=>Object.fromEntries(fs.readdirSync(CG).filter(f=>/\.(mjs|html|css)$/.test(f)).sort().map(f=>[f,sha(fs.readFileSync(path.join(CG,f)))]));
const before=officialSha();
fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
function patch(text,from,to,label){const n=text.split(from).length-1;if(n!==1)throw Error(`patch ${label}: expected 1 match, found ${n}`);return text.replace(from,()=>to);}

// 1) 正式モジュールの写しに、A1t1 と同じ規則を当てる（実験 L-A1t1 と同じ ENGINE・effects・CPU 補助。記録用フックは入れない）。
const CFG={ext:{method:'trap',cost:2,timing:'final',perMatch:null}};
const STAGE=path.join(OUT,'.stage');fs.mkdirSync(STAGE);
const src={};for(const f of fs.readdirSync(CG).filter(f=>f.endsWith('.mjs')))src[f]=fs.readFileSync(path.join(CG,f),'utf8');
const apply=(f,list)=>{for(const [l,a,b] of list)src[f]=patch(src[f],a,b,`${f}:${l}`);};
apply('engine.mjs',[...ENGINE,
 // 画面用：最終ラウンドと、延長した試合の R10 終了時点のそだち（逆転したかを見るため）。保存はコマンドの再生なので形は変わらない。
 ['trial-r10',"fx.cleanup(s,'end',s.turn);if(s.turn==='B')s.round++;","if(s.turn==='B'&&s.round===10&&s.life.final>10){s.life.r10={A:s.players.A.growth,B:s.players.B.growth};log(s,'R10終了時点のそだち：A '+s.life.r10.A+' / B '+s.life.r10.B+'（人生延長でR'+s.life.final+'まで続く）');}fx.cleanup(s,'end',s.turn);if(s.turn==='B')s.round++;"],
 ['trial-view',"return {round:s.round,turn:s.turn,actor:actor(s),phase:s.phase,","return {round:s.round,life:{final:s.life.final,r10:s.life.r10??null},turn:s.turn,actor:actor(s),phase:s.phase,"],
]);
apply('effects.mjs',effectsPatches(CFG));
apply('cpu-observation.mjs',OBSERVATION);
apply('cpu-policy.mjs',policyPatches(CFG));
const card=cards(CFG)['X-life-extend'];card.source='variable-life-20261031 試遊版（仮カード）';
src['full-catalog.mjs']+=`\n// ---- variable-life-20261031 trial: provisional card ----\nObject.assign(CATALOG,${JSON.stringify({'X-life-extend':card},null,1)});\n`;
src['rules.mjs']+=`\n// ---- variable-life-20261031 trial: 人生延長（仮）・しかける ----\nadd('X-life-extend',{mode:'trap',triggers:[{when:'end',condition:'lifeExtendOK',steps:[{op:'lifeExtend'}]}]});\n`;
apply('records.mjs',[['records-round',"!num(r.round,10)","!num(r.round,12)"]]);
apply('ui-art.mjs',[['trial-art',"export const CARD_ART = Object.freeze({","export const CARD_ART = Object.freeze({\n  \"X-life-extend\": {\"small\": \"trial-assets/life-extend.svg\", \"large\": \"trial-assets/life-extend.svg\"},"]]);
apply('ui-presentation.mjs',[
 ['trial-round',"<small>ROUND ${v.round}/10","<small>ROUND ${v.round}/${v.life?.final??10}${(v.life?.final??10)>10?`<span class=\"life-badge life-r${v.life.final}\">延長</span>`:''}"],
 ['trial-result',"<p>${h(v.result.reason)} · A ${v.result.growth.A} / B ${v.result.growth.B}</p>","<p>${h(v.result.reason)} · A ${v.result.growth.A} / B ${v.result.growth.B}</p>${v.life?.r10?`<p class=\"life-r10\">R10終了時点 · A ${v.life.r10.A} / B ${v.life.r10.B}（人生延長でR${v.life.final}まで）</p>`:''}"],
]);
// 対戦開始時、両者のデッキの1枚を「人生延長（仮）」に入れ替える（実験と同じ枠：メイン以外で枚数が最も多いカード〔同数ならデッキ記載順〕の最後の1枚）。
// すでにデッキに入っている場合（マイデッキに自分で入れた場合）は、そのまま使う。
src['app.mjs']=`import {CARDS as __LC} from './engine.mjs';
const __lifeTrial=(()=>{let last=[];const ID='X-life-extend';
 const inject=list=>{if(list.includes(ID))return {cards:[...list],from:null};const count=new Map();for(const id of list)if(!id.startsWith('M-'))count.set(id,(count.get(id)??0)+1);
  let pick=null;for(const [id,n] of count)if(!pick||n>count.get(pick))pick=id;const i=pick?list.lastIndexOf(pick):list.length-1,cards=[...list];const from=cards[i];cards[i]=ID;return {cards,from};};
 return {inject(match){last=[];const out={};for(const seat of ['A','B']){const r=inject(match[seat]);out[seat]=r.cards;last.push(seat+'：'+(r.from?(__LC[r.from]?.name??r.from)+' → 人生延長（仮）':'人生延長（仮）はデッキに入っています'));}return out;},
  note(){return '試遊版：'+last.join('／');}};})();
`+src['app.mjs'];
apply('app.mjs',[
 ['inject',"match={...decks,...(label?{[cpuSeat]:label.cards}:{})};","match=__lifeTrial.inject({...decks,...(label?{[cpuSeat]:label.cards}:{})});"],
 ['metadata',"myDecks.list().find(d=>d.id===$('select-deck-'+seat).value)","{...myDecks.list().find(d=>d.id===$('select-deck-'+seat).value),cards:[...match[seat]]}"],
 ['notice',"if(label)writePref({last:label.id});persist();}catch","if(label)writePref({last:label.id});persist();message(__lifeTrial.note());}catch"],
]);
for(const [f,t] of Object.entries(src))fs.writeFileSync(path.join(STAGE,f),t);
// 下位ディレクトリから読み込まれる正式モジュール（無変更）も写す。
for(const f of ['art-pilot/approved-colors.mjs','art-pilot/symbols/attributes.mjs']){const to=path.join(STAGE,f);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(CG,f),to);}
const patched=Object.keys(src).filter(f=>sha(src[f])!==sha(fs.readFileSync(path.join(CG,f),'utf8'))).sort();
if(stageOnly){console.log(JSON.stringify({stage:STAGE,patched}));process.exit(0);}

// 2) JS をまとめる。
execFileSync(ESBUILD,[path.join(STAGE,'app.mjs'),'--bundle','--format=esm','--target=safari16','--charset=utf8','--legal-comments=none',`--outfile=${path.join(OUT,'trial-bundle.js')}`],{stdio:'inherit'});
let bundle=fs.readFileSync(path.join(OUT,'trial-bundle.js'),'utf8');

// 3) 画像：正式の公開許可リストに載っている CARD GAME の画像と、試遊用カードの絵。
const allow=JSON.parse(fs.readFileSync(path.join(REPO,'tools/pages/allowlist.json'),'utf8')).files.filter(f=>f.startsWith('prototypes/card-game/'));
const {CARD_ART}=await import(path.join(CG,'ui-art.mjs'));
const images=allow.filter(f=>/\.(webp|png)$/.test(f)).map(f=>path.relative(CG,path.join(REPO,f)));
let copied=images;
if(largeOnly){
 for(const a of Object.values(CARD_ART)){if(!bundle.includes(a.small))throw Error('画像パスが見つかりません: '+a.small);bundle=bundle.split(JSON.stringify(a.small)).join(JSON.stringify(a.large));}
 copied=images.filter(f=>!f.startsWith('art-delivery/small/'));
}
fs.writeFileSync(path.join(OUT,'trial-bundle.js'),bundle);
for(const f of copied){const to=path.join(OUT,f);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(CG,f),to);}
fs.mkdirSync(path.join(OUT,'trial-assets'));fs.copyFileSync(path.join(HERE,'life-extend.svg'),path.join(OUT,'trial-assets/life-extend.svg'));

// 4) CSS と HTML。
for(const f of ['style.css','collection.css','learning.css','records.css'])fs.copyFileSync(path.join(CG,f),path.join(OUT,f));
let html=fs.readFileSync(path.join(CG,'index.html'),'utf8');
const swap=(from,to)=>{if(html.split(from).length!==2)throw Error('index.html の想定箇所がありません: '+from);html=html.replace(from,to);};
const storage=`(()=>{const P=${JSON.stringify(PREFIX)},S=Storage.prototype,{getItem:g,setItem:s,removeItem:r}=S;S.getItem=function(k){return g.call(this,P+k);};S.setItem=function(k,v){return s.call(this,P+k,v);};S.removeItem=function(k){return r.call(this,P+k);};})();`;
const css=`.life-badge{display:inline-block;margin-left:4px;padding:0 5px;border-radius:6px;font-weight:700;color:#fff}.life-r11{background:#2e9b5f}.life-r12{background:#2f6fd6}`
 +`.life-r10{margin-top:4px;font-size:.9em;color:#5a4a33}.life-trial-note{margin:8px 0 12px;padding:10px 12px;border-radius:10px;background:#fff4e0;border:2px solid #d64545;color:#3d3326;line-height:1.6;font-size:14px}`
 +`.life-trial-note strong{color:#b03030}.life-trial-note .c10{color:#d64545;font-weight:700}.life-trial-note .c11{color:#2e9b5f;font-weight:700}.life-trial-note .c12{color:#2f6fd6;font-weight:700}`;
const note=`<div id="life-trial-note" class="life-trial-note"><strong>試遊版：人生延長（仮）</strong><br>通常どおり<span class="c10">R10</span>で終わります。対戦を始めると、両者のデッキの1枚が「人生延長（仮）」（できごと・時2・しかける）に入れ替わります。<br>しかけておくと、<b>最終ラウンドの自分のターン終了時</b>に発動でき、最終ラウンドが1つのびます（<span class="c11">R11</span>、さらにのびて最大<span class="c12">R12</span>。1ラウンドに1回まで・両者共通）。そだちの上限は100のままです。<br>この試遊版の保存・戦績・マイデッキは、正式版とは別に保存されます。</div>`;
swap('<title>なおとっち CARD GAME</title>','<title>CARD GAME 人生延長 試遊</title>');
swap('<link rel="stylesheet" href="records.css">','<link rel="stylesheet" href="records.css"><style>'+css+'</style><script>'+storage+'</script>');
swap('<h2 id="match-setup-title">対戦の準備</h2>','<h2 id="match-setup-title">対戦の準備</h2>'+note);
swap('<a id="home-return" class="home-return" href="../../">','<a id="home-return" class="home-return" href="home.html">');
swap('<script type="module" src="app.mjs"></script>','<script type="module" src="trial-bundle.js"></script>');
if(artifact){
 html=html.replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,f)=>{const c=fs.readFileSync(path.join(OUT,f),'utf8');fs.rmSync(path.join(OUT,f));return `<style>${c}</style>`;});
 const js=fs.readFileSync(path.join(OUT,'trial-bundle.js'),'utf8');if(/<\/script/i.test(js))throw Error('bundle に </script が含まれます');
 fs.rmSync(path.join(OUT,'trial-bundle.js'));
 swap('<script type="module" src="trial-bundle.js"></script>',`<script type="module">${js}</script>`);
 html=html.replace(/^<!doctype html>\s*<html lang="ja"><head><meta charset="utf-8"><meta name="viewport"[^>]*>/,'').replace('</head>\n<body>','').replace('</body></html>','');
 if(/<\/?(html|head|body)[ >]/.test(html))throw Error('外枠タグが残っています');
}
fs.writeFileSync(path.join(OUT,'index.html'),html);
fs.writeFileSync(path.join(OUT,'home.html'),`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>なおとっち（試遊用の仮画面）</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff8e7;color:#3d3326;font-family:system-ui,sans-serif;padding:16px;box-sizing:border-box}main{max-width:420px;text-align:center}h1{font-size:1.4rem}p{line-height:1.7}a{display:inline-flex;align-items:center;min-height:44px;padding:10px 18px;border-radius:12px;background:#315e62;color:#fff;text-decoration:none;font-weight:700}</style></head><body><main><h1>なおとっち</h1><p>（試遊用の仮画面）<br>本番では、ここが通常のなおとっち育成画面です。</p><p><a id="open-card-game" href="./">CARD GAME 人生延長 試遊をひらく</a></p></main></body></html>\n`);
fs.rmSync(STAGE,{recursive:true,force:true});
if(JSON.stringify(officialSha())!==JSON.stringify(before))throw Error('正式ファイルが変わりました');
const files=[];(function walk(d){for(const n of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,n.name);if(n.isDirectory())walk(p);else files.push(path.relative(OUT,p));}})(OUT);
console.log(JSON.stringify({out:OUT,files:files.length,bytes:files.reduce((s,f)=>s+fs.statSync(path.join(OUT,f)).size,0),largeOnly,artifact,patched}));
